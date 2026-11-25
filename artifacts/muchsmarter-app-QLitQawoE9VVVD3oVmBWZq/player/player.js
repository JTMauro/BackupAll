// The video player: picks the right engine per stream (native, hls.js, mpegts.js,
// or an ffmpeg compatibility path), renders fully styleable captions, and offers
// every viewing mode (inline, theater, fullscreen, in-app mini, PiP, pop-out window).
import { h, icon, iconBtn, api, menuFrom, toast, errToast, fmtDur, fmtTime, modal } from '../lib/dom.js';
import { learnTrait } from '../lib/chanfilter.js';

// What this platform can do (desktop exposes everything; phones set some to false).
const CAPS = (window.api && window.api.capabilities) || {};
// "Quality" choices (player gear menu / Settings > Playback): re-encode smaller on this computer.
export const QUALITIES = [['source', 'Original (as sent)'], ['1080', '1080p (up to 6 Mbps)'], ['720', '720p (up to 3 Mbps)'], ['480', '480p (up to 1.5 Mbps)']];
const QUALITY_RATE = { 1080: '6M', 720: '3M', 480: '1.5M' };
const VOD_NATIVE = /\.(mp4|m4v|webm|mov|mkv|ogv|mp3|aac|m4a)(\?|$)/i;
const NEEDS_FULL_TRANSCODE = /\.(avi|wmv|divx|mpg|mpeg|3gp|vob|rm|rmvb)(\?|$)/i;
const ASPECTS = [
  { id: 'fit', label: 'Fit (original)' },
  { id: 'fill', label: 'Fill / crop' },
  { id: 'stretch', label: 'Stretch' },
  { id: '16:9', label: 'Force 16:9' },
  { id: '4:3', label: 'Force 4:3' },
  { id: 'zoom', label: 'Zoom 125%' },
];

// Buffering choices (seconds held in reserve). 0 = automatic.
export const BUFFER_CHOICES = [0, 2, 5, 10, 15, 20, 30];
export const bufferLabel = (n) => (n ? `${n} seconds` : 'Auto (start fast)');

// Channels that needed the audio compatibility mode once start in it next time.
const COMPAT_KEY = 'ms-audio-compat';
const compatSet = () => { try { return new Set(JSON.parse(localStorage.getItem(COMPAT_KEY) || '[]')); } catch (_) { return new Set(); } };
function rememberCompat(src) {
  if (!src || !src.pl || !src.itemId) return;
  const s = compatSet();
  s.add(`${src.pl}|${src.itemId}`);
  try { localStorage.setItem(COMPAT_KEY, JSON.stringify([...s].slice(-500))); } catch (_) { /* storage full */ }
}

export class Player {
  // opts: { compact, onPrev, onNext, onEnded, onClose, onModeChange, isPopout, multiview, muted }
  constructor(opts = {}) {
    this.opts = opts;
    this.settings = null;
    this.source = null;
    this.engine = null;
    this.hls = null;
    this.mpegts = null;
    this.offset = 0; // seconds already skipped when using ffmpeg seek
    this.knownDuration = 0;
    this.textTracks = [];
    this.activeText = -1;
    this.subDelay = 0;
    this.audioIndex = null;
    this.aspect = 'fit';
    this.attempts = [];
    this.build();
    this.loadSettings();
    this.unsub = window.api.on('settings', (s) => this.applySettings(s));
  }

  async loadSettings() {
    this.applySettings(await api('getSettings'));
  }

  applySettings(s) {
    this.settings = s;
    const c = s.captions;
    const st = this.capEl.style;
    st.setProperty('--cap-size', `${c.size / 100 * 2.2}cqmin`);
    st.setProperty('--cap-color', c.color);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.bg.slice(i, i + 2), 16));
    st.setProperty('--cap-bg', `rgba(${r},${g},${b},${c.bgOpacity})`);
    st.setProperty('--cap-font', c.font);
    st.setProperty('--cap-weight', c.bold ? '700' : '400');
    this.capEl.dataset.edge = c.edge;
    this.capEl.dataset.pos = c.position;
    this.syncBufBtn();
  }

  // ---- DOM ---------------------------------------------------------------
  build() {
    this.video = h('video.pv-video', { playsInline: true, preload: 'auto', crossOrigin: 'anonymous', 'x-webkit-airplay': 'allow', 'webkit-playsinline': true });
    this.video.muted = !!this.opts.muted;
    this.capEl = h('div.pv-captions', { 'aria-live': 'polite' });
    this.spinner = h('div.pv-spinner');
    this.errorEl = h('div.pv-error');
    this.osd = h('div.pv-osd');
    this.titleEl = h('div.pv-title');
    this.subEl = h('div.pv-sub');
    this.stats = h('pre.pv-stats');
    this.seek = h('input.pv-seek', { type: 'range', min: 0, max: 1000, value: 0, step: 1, 'aria-label': 'Seek' });
    // Time bar: played part in the accent colour, buffered-ahead part in light gray behind it.
    // Light = downloaded (to disk), brighter = ready in the player, accent = played.
    this.bufBar = h('i.pv-buffered');
    this.readyBar = h('i.pv-ready');
    this.bothBar = h('i.pv-both');
    this.playBar = h('i.pv-played');
    this.seekWrap = h('div.pv-seekwrap', h('div.pv-track', this.bufBar, this.readyBar, this.bothBar, this.playBar), this.seek);
    this.readyEl = h('span.pv-readytxt', { title: 'Seconds of video the player has ready to play right now' });
    this.timeEl = h('span.pv-time', '');
    this.liveBadge = h('button.pv-live', { title: 'Jump to live', onclick: () => this.goLive() }, 'LIVE');
    this.vol = h('input.pv-vol', { type: 'range', min: 0, max: 1, step: 0.02, value: 1, 'aria-label': 'Volume' });
    this.playBtn = iconBtn('play', () => this.togglePlay(), 'Play/Pause (Space)');
    this.muteBtn = iconBtn('volume', () => this.toggleMute(), 'Mute (M)');
    this.ccBtn = iconBtn('cc', (e) => this.ccMenu(e.currentTarget), 'Subtitles & closed captions (C)');
    this.favBtn = iconBtn('star', () => this.toggleFav(), 'Favorite');
    this.recBtn = iconBtn('rec', (e) => this.recMenu(e.currentTarget), 'Record', 'rec');
    // Buffer button: shows the current buffer time; click to change it (Auto / 2–30 s).
    this.bufLabel = h('span.pv-buflabel', 'Auto');
    this.bufBtn = h('button.pv-bufbtn', { title: 'Buffer time: how many seconds of video are held in reserve (helps stop freezing)', 'aria-label': 'Buffer time', onclick: (e) => this.bufferMenu(e.currentTarget) }, icon('clock', 15), this.bufLabel);
    this.signalEl = h('span.pv-signal', { title: 'Signal', 'data-bars': '0' }, [1, 2, 3, 4].map((i) => h(`i.b${i}`)));
    this.restartBtn = iconBtn('refresh', () => this.restartHere(), 'Restart from here (if the picture freezes) (R)');
    this.stuckEl = h('button.pv-stuck', { onclick: (e) => { e.stopPropagation(); this.restartHere(); } }, icon('refresh', 18), h('span', 'Frozen? Restart from here'));
    this.fullBtn = iconBtn('full', () => this.toggleFullscreen(), 'Fullscreen (F)');
    const left = h('div.pv-left',
      this.opts.onPrev ? iconBtn('prev', () => this.opts.onPrev(), 'Previous channel / episode (PgUp)') : null,
      this.playBtn,
      this.restartBtn,
      this.opts.onNext ? iconBtn('next', () => this.opts.onNext(), 'Next channel / episode (PgDn)') : null,
      iconBtn('back10', () => this.skip(-10), 'Back 10s (←)'),
      iconBtn('fwd10', () => this.skip(30), 'Forward 30s (→)'),
      this.muteBtn, this.vol, this.liveBadge, this.signalEl, this.bufBtn, this.readyEl, this.timeEl);
    const right = h('div.pv-right',
      this.recBtn, this.favBtn, this.ccBtn,
      iconBtn('audio', (e) => this.audioMenu(e.currentTarget), 'Audio track'),
      iconBtn('settings', (e) => this.moreMenu(e.currentTarget), 'Quality, speed, aspect ratio, sleep timer…'),
      iconBtn('cast', (e) => this.castMenu(e.currentTarget), 'Cast to TV'),
      iconBtn('pip', () => this.togglePip(), 'Picture-in-picture (P)'),
      this.opts.isPopout ? iconBtn('ontop', (e) => this.toggleOnTop(e.currentTarget), 'Keep on top') : CAPS.popout === false ? null : iconBtn('popout', () => this.popout(false), 'Pop out into its own window'),
      this.opts.isPopout || CAPS.popout === false ? null : iconBtn('mini', () => this.popout(true), 'Mini player (floating, always on top)'),
      this.fullBtn,
      this.opts.onClose ? iconBtn('x', () => this.opts.onClose(), 'Close player') : null);
    this.controls = h('div.pv-controls', h('div.pv-top', h('div.pv-meta', this.titleEl, this.subEl)), h('div.pv-bottom', this.seekWrap, h('div.pv-bar', left, right)));
    this.el = h(`div.player${this.opts.compact ? '.compact' : ''}${this.opts.multiview ? '.multiview' : ''}`, { tabIndex: 0 },
      this.video, this.capEl, this.spinner, this.errorEl, this.osd, this.stats, this.controls, this.stuckEl);
    this.upNextEl = h('div.pv-upnext', { hidden: true });
    this.offerEl = h('div.pv-offer', { hidden: true });
    this.el.append(this.upNextEl, this.offerEl);
    this.upSession = { noAsk: false, left: 0, series: null };

    // Events (video ones are remembered so they can move to a preloaded next episode)
    const v = this.video;
    this.vHandlers = [];
    const on = (type, fn) => { this.video.addEventListener(type, fn); this.vHandlers.push([type, fn]); };
    on('play', () => { this.syncPlay(); this.diskHold(false); this.pauseBuffering(false); });
    on('pause', () => { this.syncPlay(); if (!this.holding) { this.diskHold(true); this.pauseBuffering(true); } });
    on('waiting', () => { this.el.classList.add('loading'); this.cushionOk = false; this.armStuck(); if (this.hadPlayback && !this.holding && !this.seekingNow) this.noteHalt(); });
    on('seeking', () => { this.seekingNow = true; });
    on('seeked', () => { setTimeout(() => { this.seekingNow = false; }, 1500); });
    on('playing', () => {
      this.el.classList.remove('loading'); this.errorEl.textContent = ''; this.el.classList.remove('has-error');
      this.disarmStuck();
      if (!this.cushionOk) this.holdForCushion();
      // A stream that has played well for a while earns its reconnect attempts back.
      clearTimeout(this.retryReset);
      this.retryReset = setTimeout(() => { this.retries = 0; }, 30000);
    });
    on('canplay', () => this.el.classList.remove('loading'));
    on('timeupdate', () => this.onTime());
    on('volumechange', () => this.syncVol());
    on('ended', () => this.onEnded());
    on('error', () => this.onMediaError());
    on('loadedmetadata', () => this.onMeta());
    on('dblclick', () => this.toggleFullscreen());
    on('click', () => { if (!this.opts.multiview) this.togglePlay(); });
    this.seek.addEventListener('input', () => { this.seeking = true; this.playBar.style.width = `${Number(this.seek.value) / 10}%`; if (!this.isLive) this.timeEl.textContent = `${fmtDur(this.seekValue())} / ${fmtDur(this.duration())}`; });
    this.seek.addEventListener('change', () => {
      this.seeking = false;
      if (this.isLive) { const w = this.liveWindow(); if (w) { this.video.currentTime = Math.min(w.end - 0.5, w.start + (Number(this.seek.value) / 1000) * (w.end - w.start)); this.el.classList.toggle('behind-live', w.end - this.video.currentTime > 5); } return; }
      this.seekTo(this.seekValue());
    });
    on('progress', () => this.drawBars());
    this.vol.addEventListener('input', () => { const vv = this.video; vv.volume = Number(this.vol.value); vv.muted = vv.volume === 0; if (vv.volume > 0) localStorage.setItem('volume', vv.volume); });
    const saved = Number(localStorage.getItem('volume'));
    // A remembered volume of 0 would make every channel silent: fall back to 100%.
    if (saved > 0.02 && localStorage.getItem('volume') !== null) v.volume = saved;
    this.el.addEventListener('mousemove', () => this.poke());
    this.el.addEventListener('keydown', (e) => this.onKey(e));
    this.el.addEventListener('wheel', (e) => { if (e.ctrlKey || this.opts.multiview) return; if (e.target === this.vol || this.isFullscreen()) { e.preventDefault(); this.setVolume(this.video.volume - Math.sign(e.deltaY) * 0.05); } }, { passive: false });
    document.addEventListener('fullscreenchange', () => this.syncFull());
    this.capLoop();
    this.poke();
  }

  poke() {
    this.el.classList.add('show-controls');
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (document.querySelector('.ctx-menu, .modal-back')) { this.poke(); return; }
      if (!this.video.paused && !this.el.matches(':hover .pv-controls:hover')) this.el.classList.remove('show-controls');
    }, 3000);
  }

  // ---- Loading -------------------------------------------------------------
  // src: { pl, itemId, item, url, headers, local, resume, subtitles, catchupStart, catchupEnd, file, title, subtitle }
  async load(src) {
    {
      // Leaving a disk-buffered video frees its download - unless we're switching to play that
      // same download as a finished file (src.cacheLocal), which keeps it until that ends too.
      const prev = this.source;
      const keep = src && src.cacheLocal;
      if (prev && prev.diskBuffer && (!src || prev.local !== src.local) && prev.local !== keep) api('cacheRelease', prev.local).catch(() => {});
      if (prev && prev.cacheLocal && prev.cacheLocal !== keep) api('cacheRelease', prev.cacheLocal).catch(() => {});
    }
    this.destroyEngine();
    this.source = src;
    this.offset = 0;
    this.knownDuration = src.item && src.item.durationSecs ? src.item.durationSecs : 0;
    this.textTracks = [];
    this.activeText = -1;
    this.audioIndex = null;
    this.probeInfo = null;
    this.attempts = [];
    this.retries = 0;
    this.cushionOk = false;
    this.lastAudioFix = 0;
    this.behindLive = 0;
    this.pausedAt = 0;
    this.hlsSaved = null;
    this.cushionCap = null;
    this.localStalls = [];
    this.localStallTold = false;
    this.endOffer();
    this.resetUpNext();
    const sKey = src.item && src.item.type === 'episode' ? String(src.item.seriesId || src.item.seriesName || '') : null;
    if (sKey !== this.upSession.series) this.upSession = { noAsk: false, left: 0, series: sKey };
    this.stopCushion();
    this.titleEl.textContent = src.title || (src.item && src.item.name) || '';
    this.subEl.textContent = src.subtitle || '';
    this.isLive = !src.file && src.item && src.item.type === 'live' && !src.catchupStart;
    this.el.classList.toggle('is-live', this.isLive);
    this.el.classList.toggle('is-recordable', !!(src.item && src.item.type === 'live'));
    this.favBtn.replaceChildren(icon(src.favorite ? 'star-on' : 'star'));
    this.favBtn.classList.toggle('on', !!src.favorite);
    this.favBtn.hidden = !src.pl;
    this.el.classList.add('loading');
    this.errorEl.textContent = '';
    this.el.classList.remove('has-error');
    if (!this.settings) await this.loadSettings();
    if (src.item && src.item.drm) toast('This channel uses DRM, which the built-in player cannot decrypt. Try an external player.', 'warn', 7000);
    const plan = this.planEngines(src);
    this.attempts = plan;
    await this.tryNext();
    // External / provider subtitles.
    for (const s of src.subtitles || []) this.addTextTrack(s.label, s.url, s.lang);
    if (src.resume && (src.resume.position > 30 || (src.resumeExact && src.resume.position > 1)) && !this.isLive && !src.catchupStart) {
      this.resumeAt = src.resume.position;
    }
    if (!this.isLive && !src.file && src.url) this.probeLater();
    else if (src.file) this.probeLater();
    // Settings > Playback > "Download first, then play": movies & episodes download completely,
    // then play from this computer (press "Play now anyway" to start sooner).
    if (this.settings.vodMode === 'download' && !src.file && !this.isLive && src.item && ['movie', 'episode'].includes(src.item.type) && !this.opts.multiview) this.acceptOffer({ first: true, pos: src.resume && src.resume.position > 30 ? src.resume.position : 0 });
    this.startWatchdog();
    this.startSignal();
    this.halts = [];
    this.dlSamples = [];
    this.slowEarly = false;
    this.allHalts = [];
    this.startPositionSaver();
  }

  planEngines(src) {
    const s = this.settings;
    const url = src.file || src.url || '';
    // In-Claude demo: the demo provider's streams are generated in the page.
    if (window.api.demoStream && /^https?:\/\/demo\.muchsmarter\//.test(url)) return [{ engine: 'demo' }];
    const isHls = /\.m3u8?(\?|$)/i.test(url) || /\/hls\//i.test(url);
    const ccLive = this.isLive && s.captions.enabled && s.captions.ccMode !== 'off';
    const forced = s.engine !== 'auto' ? s.engine : null;
    const plan = [];
    if (forced === 'compat') plan.push({ engine: 'transcode', mode: 'audio' });
    if (forced === 'native') plan.push({ engine: 'native' });
    if (forced === 'hls') plan.push({ engine: 'hls' });
    if (forced === 'mpegts') plan.push({ engine: 'mpegts' });
    if (ccLive && !isHls) plan.push({ engine: 'hlsRepack' });
    if (!forced && s.quality && s.quality !== 'source' && CAPS.transcode !== false) plan.push({ engine: 'transcode', mode: 'full' });
    if (!forced && s.audioCompat !== 'off' && CAPS.transcode !== false && compatSet().has(`${src.pl}|${src.itemId}`)) plan.push({ engine: 'transcode', mode: 'audio' });
    if (isHls) plan.push({ engine: 'hls' });
    else if (NEEDS_FULL_TRANSCODE.test(url)) plan.push({ engine: 'transcode', mode: 'full' });
    else if (VOD_NATIVE.test(url)) plan.push({ engine: 'native' });
    else if (/\.flv(\?|$)/i.test(url)) plan.push({ engine: 'mpegts', type: 'flv' });
    else plan.push({ engine: 'mpegts' });
    // Fallbacks
    plan.push({ engine: 'transcode', mode: 'audio' }, { engine: 'transcode', mode: 'full' });
    if (!isHls && this.isLive && !ccLive) plan.push({ engine: 'hlsRepack' });
    // Phones have no ffmpeg: drop the transcoding / repackaging fallbacks there.
    const caps = window.api.capabilities || {};
    const seen = new Set();
    return plan.filter((p) => {
      if (caps.transcode === false && (p.engine === 'transcode' || p.engine === 'hlsRepack')) return false;
      const k = JSON.stringify(p);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  async tryNext(reason) {
    const next = this.attempts.shift();
    if (!next) return this.showError(reason || 'This stream could not be played. Try another format in Settings → Playback, or open it in an external player.');
    this.current = next;
    try {
      await this.start(next);
    } catch (e) {
      console.warn('engine failed', next, e);
      return this.tryNext(e.message);
    }
  }

  async start(p, seekSec = 0) {
    this.destroyEngine(true);
    this.audioFlow = null;
    this.noAudioTicks = 0;
    this.audioStall = 0;
    const src = this.source;
    const s = this.settings;
    const v = this.video;
    this.engine = p.engine;
    this.offset = 0;
    if (p.engine === 'demo') {
      this.el.dataset.engine = 'demo';
      v.srcObject = window.api.demoStream({ title: this.titleEl.textContent, subtitle: this.subEl.textContent, live: this.isLive });
      this.hadPlayback = false;
      this.startedAt = Date.now();
      this.play();
      return;
    }
    // Next episode already buffered in the background: switch to that <video>.
    if (p.engine === 'native' && this.preloaded && this.preloaded.itemId === src.itemId && !src.file) {
      const pre = this.preloaded;
      this.preloaded = null;
      this.el.dataset.engine = 'native (pre-buffered)';
      this.swapVideo(pre.el);
      this.currentUrl = pre.el.currentSrc || pre.el.src;
      this.hadPlayback = false;
      this.startedAt = Date.now();
      if (this.video.readyState >= 1) this.onMeta();
      this.play();
      return;
    }
    let url;
    if (p.engine === 'native') url = src.file ? await api('variant', { file: src.file }) : src.local;
    else if (p.engine === 'hls') url = src.file ? await api('variant', { file: src.file }) : src.local;
    else if (p.engine === 'mpegts') url = src.file ? await api('variant', { file: src.file }) : src.local;
    else if (p.engine === 'transcode') {
      // Read through the disk buffer when there is one, so pausing never stalls the provider.
      // A download still in progress is read through the local file link, which waits for more.
      const srcUrl = src.file ? ((await api('partialUrl', src.file).catch(() => null)) || src.file) : (src.diskBuffer ? src.local : src.url);
      if (!this.isLive) {
        // Movies & episodes: ffmpeg writes a playable MP4 to disk at full speed and the built-in
        // engine plays it as it grows - like a normal MP4, so high-bitrate HD stays smooth. (Feeding
        // converted video through JavaScript filled the player's memory and stalled after minutes.)
        url = await api('variant', { mode: 'remux', url: srcUrl, headers: src.diskBuffer ? {} : src.headers, audio: this.audioIndex, transcodeVideo: p.mode === 'full', seek: seekSec || undefined, deinterlace: this.deinterlace, ...this.qualityOpts(p) });
        p.viaNative = true;
        p.viaHls = false;
      } else {
        p.viaNative = false;
        p.viaHls = false;
        url = await api('variant', { mode: 'transcode', url: srcUrl, headers: src.diskBuffer ? {} : src.headers, transcodeMode: p.mode, audio: this.audioIndex, seek: seekSec || undefined, deinterlace: this.deinterlace, ...this.qualityOpts(p) });
      }
      this.offset = seekSec || 0;
      // MP4 path: the exact start (the keyframe at/just before the requested spot) is read from
      // the converted file once it begins, so the clock and subtitles match to the frame.
    } else if (p.engine === 'hlsRepack') {
      url = await api('variant', { mode: 'hls', url: src.file || (src.diskBuffer ? src.local : src.url), headers: src.diskBuffer ? {} : src.headers, audio: this.audioIndex, vod: !this.isLive });
    }
    this.currentUrl = url;
    if (p.viaNative) this.syncRemuxStart(url);
    this.el.dataset.engine = p.engine + (p.mode ? `:${p.mode}` : '');

    if (p.engine === 'hls' || p.engine === 'hlsRepack' || p.viaHls) {
      if (!window.Hls || !window.Hls.isSupported()) throw new Error('HLS not supported');
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: Math.max(30, s.bufferSeconds * 3, this.cushion() * 2),
        maxMaxBufferLength: 600,
        backBufferLength: 90,
        ...(this.cushion() ? { liveSyncDuration: Math.max(6, this.cushion() + 3) } : { liveSyncDurationCount: 3 }),
        enableCEA708Captions: true,
        renderTextTracksNatively: true,
        manifestLoadingMaxRetry: p.engine === 'hlsRepack' || p.viaHls ? 10 : 3,
        // Converted movies: the playlist grows while ffmpeg works - start at the beginning.
        ...(p.viaHls ? { startPosition: 0, maxBufferLength: 60, maxMaxBufferLength: 120 } : {}),
        manifestLoadingRetryDelay: 1000,
        fragLoadingMaxRetry: 6,
        capLevelToPlayerSize: false,
      });
      this.hls = hls;
      hls.on(window.Hls.Events.ERROR, (_, d) => {
        if (!d.fatal) return;
        if (d.type === window.Hls.ErrorTypes.MEDIA_ERROR && !this.recoveredMedia) { this.recoveredMedia = true; hls.recoverMediaError(); return; }
        this.tryNext(`HLS error: ${d.details}`);
      });
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => this.play());
      hls.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, () => this.refreshTextTracks());
      hls.on(window.Hls.Events.NON_NATIVE_TEXT_TRACKS_FOUND, () => this.refreshTextTracks());
      hls.loadSource(url);
      hls.attachMedia(v);
      v.textTracks.onaddtrack = () => this.refreshTextTracks();
    } else if ((p.engine === 'mpegts' || p.engine === 'transcode') && !p.viaNative) {
      if (!window.mpegts || !window.mpegts.isSupported()) throw new Error('MPEG-TS playback not supported');
      const live = this.isLive || p.engine === 'transcode';
      const player = window.mpegts.createPlayer({ type: p.type || 'mpegts', isLive: live, url }, {
        enableWorker: true,
        liveBufferLatencyChasing: false,
        lazyLoad: !live,
        lazyLoadMaxDuration: 3 * 60,
        enableStashBuffer: true,
        stashInitialSize: (this.cushion() >= 10 ? 1024 : 384) * 1024,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 60,
        autoCleanupMinBackwardDuration: 30,
      });
      this.mpegts = player;
      player.on(window.mpegts.Events.ERROR, (type, detail) => {
        if (this.mpegts !== player) return;
        // Network hiccups on live streams: reconnect a few times before falling back.
        if (type === window.mpegts.ErrorTypes.NETWORK_ERROR && this.retries < 3 && this.hadPlayback) { this.retries++; this.reload(); return; }
        this.tryNext(`${type}: ${detail}`);
      });
      player.on(window.mpegts.Events.MEDIA_INFO, (info) => { this.mediaInfo = info; this.checkCodecs(info); });
      player.attachMediaElement(v);
      player.load();
      this.play();
    } else {
      v.src = url;
      v.load();
      this.play();
    }
    this.hadPlayback = false;
    this.startedAt = Date.now();
    this.audioCheck = setTimeout(() => this.checkSilent(), 6000);
  }

  // mpegts.js tells us codecs up front — AC-3/E-AC-3/MP2 audio need the compatibility path.
  checkCodecs(info) {
    const a = String(info.audioCodec || '').toLowerCase();
    if (this.settings.audioCompat === 'off') return;
    if (this.engine === 'mpegts' && a && !/mp4a|mp3|opus/.test(a)) {
      toast(`Converting ${a.toUpperCase()} audio for playback…`, 'info', 2500);
      rememberCompat(this.source);
      this.attempts.unshift({ engine: 'transcode', mode: 'audio' });
      this.tryNext();
    }
  }

  // Video playing but silence decoded → unsupported audio codec. Switch to compat.
  checkSilent() {
    const v = this.video;
    if (this.engine === 'demo' || CAPS.transcode === false) return;
    if (this.engine === 'transcode' || this.settings.audioCompat === 'off' || v.paused || v.muted) return;
    if (typeof v.webkitAudioDecodedByteCount === 'number' && v.webkitAudioDecodedByteCount === 0 && v.webkitVideoDecodedByteCount > 0) {
      toast('No audio detected — switching to audio compatibility mode.', 'info');
      rememberCompat(this.source);
      const pos = this.currentTime();
      this.current = { engine: 'transcode', mode: 'audio' };
      this.start(this.current, this.isLive ? 0 : pos).catch((e) => this.tryNext(e.message));
    }
  }

  async play() {
    if (this.offer && this.offer.stage === 'downloading' && this.offer.first) { this.video.pause(); return; }
    try {
      await this.video.play();
    } catch (e) {
      if (e.name !== 'NotAllowedError') return;
      // The browser blocked sound (no recent click/tap). Play muted for now, and turn the
      // sound back on by itself at the very next click, tap or key press.
      const wasMuted = this.video.muted;
      this.video.muted = true;
      this.video.play().catch(() => {});
      if (!wasMuted && !this.opts.muted && !this.opts.multiview) this.autoUnmuteLater();
    }
  }

  autoUnmuteLater() {
    if (this.pendingUnmute) return;
    this.pendingUnmute = true;
    this.flash('Sound paused by the browser — click or press any key');
    const restore = () => {
      ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.removeEventListener(ev, restore, true));
      this.pendingUnmute = false;
      if (this.video.muted) { this.video.muted = false; this.flash('Sound on'); }
    };
    ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, restore, true));
  }

  // Sound that drops out while the picture keeps going (a stalled audio decoder after
  // a network hiccup) is fixed by reloading the stream at the same spot.
  checkAudioFlow() {
    const v = this.video;
    if (typeof v.webkitAudioDecodedByteCount !== 'number' || this.engine === 'demo') return;
    const a = v.webkitAudioDecodedByteCount;
    const vb = v.webkitVideoDecodedByteCount;
    const prev = this.audioFlow;
    this.audioFlow = { a, vb };
    if (!prev || v.paused || v.muted || v.volume === 0 || this.holding) { this.audioStall = 0; return; }
    // No audio at all while the picture plays (e.g. the converter started before the
    // channel's audio track showed up): retry, then fall back to the compatibility mode.
    if (a === 0) {
      if (vb > prev.vb && Date.now() - (this.startedAt || 0) > 8000) this.noAudioTicks = (this.noAudioTicks || 0) + 1;
      if (this.noAudioTicks >= 2 && Date.now() - (this.lastAudioFix || 0) > 30000) {
        this.noAudioTicks = 0;
        this.lastAudioFix = Date.now();
        if (this.engine !== 'transcode' && CAPS.transcode !== false && this.settings.audioCompat !== 'off') {
          toast('No sound on this channel — switching to audio compatibility mode.', 'info', 4000);
          rememberCompat(this.source);
          this.current = { engine: 'transcode', mode: 'audio' };
          this.start(this.current, this.isLive ? 0 : this.currentTime()).catch((e) => this.tryNext(e.message));
        } else {
          toast('Still no sound — reconnecting to find the audio track…', 'info', 4000);
          this.restartHere();
        }
      }
      return;
    }
    this.noAudioTicks = 0;
    // Audio had been flowing, video still advances, but no new audio is decoded.
    if (a === prev.a && vb > prev.vb) this.audioStall = (this.audioStall || 0) + 1;
    else this.audioStall = 0;
    if (this.audioStall >= 3 && Date.now() - (this.lastAudioFix || 0) > 45000) {
      this.audioStall = 0;
      this.lastAudioFix = Date.now();
      toast('The sound dropped out — reloading the stream to bring it back.', 'info', 4000);
      this.restartHere();
    }
  }

  onMeta() {
    this.hadPlayback = true;
    if (this.resumeAt) {
      const t = this.resumeAt;
      this.resumeAt = null;
      if (this.isSeekable()) {
        this.seekTo(t);
        toast(`Resumed at ${fmtDur(t)}`, 'info', 2000);
      }
    }
    if (this.opts.onModeChange) this.opts.onModeChange();
  }

  onMediaError() {
    const err = this.video.error;
    if (!err || this.engine === 'hls' || this.engine === 'hlsRepack' || this.engine === 'mpegts' || this.engine === 'transcode') return;
    this.tryNext(`Media error ${err.code}: ${err.message || ''}`);
  }

  showError(msg) {
    this.el.classList.remove('loading');
    this.el.classList.add('has-error');
    clear(this.errorEl);
    this.errorEl.append(
      h('div.pv-error-msg', msg),
      h('div.pv-error-actions',
        h('button.btn', { onclick: () => this.retry() }, 'Retry'),
        this.source && this.source.url ? h('button.btn', { onclick: () => api('external', this.source.url, this.source.headers, this.titleEl.textContent).catch(errToast) }, 'Open in external player') : null));
  }

  retry() {
    if (this.source) this.load(this.source);
  }

  reload() {
    const p = this.current;
    if (p) this.start(p, this.isLive ? 0 : this.currentTime()).catch((e) => this.tryNext(e.message));
  }

  // ---- Up next (series) -------------------------------------------------------------
  // About 30 s before an episode ends: offer the next one, with a countdown, and start
  // buffering it in the background so it starts instantly.
  resetUpNext() {
    clearInterval(this.upTimer);
    this.up = { shown: false, cancelled: false, next: null };
    if (this.upNextEl) { this.upNextEl.hidden = true; this.upNextEl.replaceChildren(); }
  }

  resetUpNextSession() { this.upSession = { noAsk: false, left: 0, series: null }; this.dropPreload(); }

  dropPreload() {
    if (!this.preloaded) return;
    if (this.preloaded.local && this.preloaded.local.includes('/cache/')) api('cacheRelease', this.preloaded.local).catch(() => {});
    try { this.preloaded.el.removeAttribute('src'); this.preloaded.el.load(); this.preloaded.el.remove(); } catch (_) { /* gone */ }
    this.preloaded = null;
  }

  checkUpNext() {
    const s = this.source;
    if (!s || this.isLive || !s.item || s.item.type !== 'episode' || !this.opts.getNext) return;
    const d = this.duration();
    if (!d || d < 120) return;
    const rem = d - this.currentTime();
    if (this.up.shown && rem > 45 && !this.up.cancelled) { this.resetUpNext(); return; } // seeked back
    if (!this.up.shown && rem <= Math.min(30, d * 0.08 + 5)) this.startUpNext();
    if (this.up.shown) this.drawUpNext();
  }

  startUpNext() {
    const next = this.opts.getNext();
    this.up.shown = true;
    if (!next) return;
    this.up.next = next;
    this.prepareNext(next);
    this.drawUpNext();
  }

  async prepareNext(next) {
    if (this.preloaded && this.preloaded.itemId === next.item.id) return;
    this.dropPreload();
    let info;
    try { info = await api('playInfo', next.pl, next.item.id, { noHistory: true }); } catch (_) { return; }
    if (!this.up.next || this.up.next.item.id !== next.item.id) return;
    this.up.info = info;
    const url = info.local || '';
    // Only plain video files can be pre-buffered in a second <video>; and never when the
    // provider allows a single connection (a second stream would cut this one off).
    const engineOk = this.settings.engine === 'auto' || this.settings.engine === 'native';
    if (!url || !engineOk || !VOD_NATIVE.test(info.url || url) || (this.opts.canPreload && !this.opts.canPreload())) return;
    const el = h('video.pv-video.pv-preload', { preload: 'auto', muted: true, playsInline: true, crossOrigin: 'anonymous' });
    el.src = url;
    this.el.prepend(el);
    el.load();
    this.preloaded = { itemId: next.item.id, el, local: url };
  }

  // Move every video event and setting onto the pre-buffered element and show it.
  swapVideo(nv) {
    const old = this.video;
    for (const [t, f] of this.vHandlers) { old.removeEventListener(t, f); nv.addEventListener(t, f); }
    nv.className = 'pv-video';
    nv.muted = old.muted && !this.pendingUnmute ? old.muted : false;
    if (this.opts.muted) nv.muted = true;
    nv.volume = old.volume;
    nv.playbackRate = 1;
    old.replaceWith(nv);
    try { old.removeAttribute('src'); old.load(); } catch (_) { /* ignore */ }
    this.video = nv;
    this.syncVol();
  }

  playNextNow() {
    const next = this.up.next;
    clearInterval(this.upTimer);
    this.upNextEl.hidden = true;
    if (!next || !this.opts.playNext) return;
    this.opts.playNext();
  }

  // Episode finished: play the next one unless autoplay was paused (or is off).
  upNextEnded() {
    const s = this.source;
    if (!s || !s.item || s.item.type !== 'episode' || !this.opts.getNext) return false;
    if (!this.up.shown) this.startUpNext();
    if (!this.up.next) return false;
    if (this.up.cancelled || (this.settings && this.settings.autoplayNext === false)) { this.drawUpNext(true); return true; }
    if (this.upSession.left > 0 && !this.upSession.noAsk) this.upSession.left--;
    this.playNextNow();
    return true;
  }

  drawUpNext(ended) {
    const n = this.up.next;
    if (!n) return;
    const e = n.item;
    const auto = this.settings.autoplayNext !== false && !this.up.cancelled;
    const quiet = this.upSession.noAsk || this.upSession.left > 0;
    const rem = Math.max(0, Math.ceil(this.duration() - this.currentTime()));
    const label = `S${e.season}E${e.episode}${e.name ? ` · ${e.name}` : ''}`;
    const buffered = this.preloaded && this.preloaded.itemId === e.id;
    this.upNextEl.hidden = false;
    this.upNextEl.classList.toggle('quiet', quiet && !ended);
    const key = `${e.id}|${auto}|${quiet}|${ended}|${rem}|${buffered}`;
    if (key === this.upKey) return;
    this.upKey = key;
    if (quiet && !ended) {
      // "Don't ask" / "after 3 episodes": just a small note, no questions.
      this.upNextEl.replaceChildren(h('div.up-mini', icon('next', 14), ` Up next: ${label} — playing in ${rem}s `,
        h('button.up-link', { onclick: () => { this.up.cancelled = true; this.upSession.noAsk = false; this.upSession.left = 0; this.upKey = ''; this.drawUpNext(); } }, 'Stop')));
      return;
    }
    const when = ended ? (auto ? 'Starting…' : 'Autoplay paused') : auto ? `Plays in ${rem}s` : 'Autoplay paused';
    this.upNextEl.replaceChildren(h('div.up-card',
      h('div.up-top', h('div.up-thumb', e.logo ? h('img', { src: e.logo, alt: '' }) : icon('series', 28)),
        h('div.up-text', h('small', 'Up next'), h('b', label), h('span.up-when', when, buffered ? h('span.up-buf', ' · buffered and ready') : (this.up.info ? h('span.up-buf', ' · ready') : null)))),
      h('div.up-actions',
        h('button.up-btn.primary', { onclick: () => this.playNextNow() }, icon('play', 14), ' Play next episode'),
        h('button.up-btn', { onclick: () => { this.up.cancelled = true; this.video.pause(); this.upKey = ''; this.drawUpNext(ended); } }, icon('pause', 14), ' Pause'),
        h('button.up-btn', { title: 'Keep playing episodes without this question until you stop watching', onclick: () => { this.upSession.noAsk = true; this.up.cancelled = false; this.upKey = ''; this.drawUpNext(ended); } }, "Don't ask again this viewing"),
        h('button.up-btn', { title: 'Play the next 3 episodes without asking, then ask again', onclick: () => { this.upSession.left = 3; this.up.cancelled = false; this.upKey = ''; this.drawUpNext(ended); } }, 'Ask again after 3 episodes'))));
  }

  noteLocalStall() {
    const now = Date.now();
    this.localStalls = [...(this.localStalls || []).filter((t) => now - t < 120000), now];
    if (this.localStalls.length < 2 || this.localStallTold) return;
    this.localStallTold = true;
    if (this.engine === 'transcode') {
      toast('This video is on your computer, but it has to be converted while it plays and your computer can’t keep up. Try ⚙ → “Open in external player” (VLC plays it directly).', 'warn', 10000);
    } else {
      toast('This video is on your computer, so these pauses aren’t your internet. Your computer may be struggling to decode it (very high quality / HEVC). VLC (⚙ → Open in external player) may play it more smoothly.', 'info', 10000);
    }
  }

  // ---- Feed trouble: "download and play when ready" -------------------------------
  // The provider's feed keeps dying (not the app): offer to fetch the whole movie/episode
  // first and play it from this computer, where hiccups can't interrupt it.
  offerDownload() {
    const s = this.source;
    if (!s || this.isLive || !s.pl || !s.item || !['movie', 'episode'].includes(s.item.type)) return;
    if (this.settings && this.settings.offerDownloadOnFreeze === false) return;
    if (this.offer || (this.offerDismissed && this.offerDismissed === s.itemId)) return;
    this.offer = { stage: 'ask' };
    this.drawOffer();
  }

  endOffer() {
    clearInterval(this.offerTimer);
    this.offer = null;
    if (this.offerEl) { this.offerEl.hidden = true; this.offerEl.replaceChildren(); }
  }

  async acceptOffer({ first = false, pos: startPos } = {}) {
    const s = this.source;
    if (!s) return;
    const pos = startPos != null ? startPos : this.currentTime();
    this.offer = { stage: 'downloading', pos, pct: 0, mode: s.diskBuffer ? 'disk' : 'download', first };
    this.video.pause();
    if (!s.diskBuffer) {
      // No disk buffer here (phones, HLS, or turned off): use Downloads, then play the file.
      const title = s.item.type === 'episode' ? `${s.item.seriesName || ''} - S${String(s.item.season).padStart(2, '0')}E${String(s.item.episode).padStart(2, '0')} - ${s.item.name || ''}` : (s.item.name || s.title || 'Video');
      // Close the paused stream first: many providers allow only one connection.
      this.destroyEngine(true);
      this.offer.released = true;
      try { await api('download', [{ pl: s.pl, itemId: s.itemId, title, subfolder: s.item.type === 'episode' ? (s.item.seriesName || 'Series') : 'Movies', kind: s.item.type, logo: s.item.logo }]); } catch (e) { errToast(e); this.endOffer(); return; }
    }
    this.drawOffer();
    clearInterval(this.offerTimer);
    this.offerTimer = setInterval(() => this.checkOffer(), 1000);
  }

  async checkOffer() {
    const o = this.offer;
    const s = this.source;
    if (!o || o.stage !== 'downloading' || !s) return;
    if (o.mode === 'disk') {
      const d = await api('cacheStatus', s.local).catch(() => null);
      if (!d) { o.mode = 'download'; return this.acceptOfferFallback(); }
      o.pct = d.total ? Math.round((d.have / d.total) * 100) : 0;
      o.mb = d.have / 1048576;
      if (d.error && !d.done) o.err = d.error;
      if (d.done && !d.error) return this.offerReady();
    } else {
      const list = await api('downloads').catch(() => []);
      const d = list.find((x) => x.pl === s.pl && x.itemId === s.itemId);
      if (!d) return;
      o.pct = d.total ? Math.round((d.received / d.total) * 100) : 0;
      o.mb = (d.received || 0) / 1048576;
      o.err = d.status === 'failed' ? d.error || 'Download failed' : null;
      if (d.status === 'done' && d.file) { o.file = d.file; return this.offerReady(); }
    }
    this.drawOffer();
  }

  async acceptOfferFallback() { this.offer.mode = 'download'; this.offer.stage = 'ask'; return this.acceptOffer(); }

  // Switch to the finished download of this video (saved by the disk buffer) at the current spot.
  async playSavedFile(msg) {
    const s = this.source;
    if (!s || !s.local) return false;
    const pos = this.currentTime();
    const f = await api('cacheFile', s.local).catch(() => null);
    if (!f || this.source !== s) return false;
    if (msg) toast(msg, 'info', 3500);
    this.load({ ...s, url: undefined, local: undefined, direct: undefined, diskBuffer: false, file: f, cacheLocal: s.local, resume: { position: pos }, resumeExact: true });
    return true;
  }

  async offerReady() {
    const o = this.offer;
    clearInterval(this.offerTimer);
    toast('Downloaded — playing from this computer now.', 'success', 3000);
    if (o.mode === 'disk' && !o.file && this.source && this.source.local) {
      // The whole video is saved: play that file directly (like a download), not the stream link.
      const f = await api('cacheFile', this.source.local).catch(() => null);
      if (f) {
        const s = this.source;
        this.endOffer();
        this.load({ ...s, url: undefined, local: undefined, direct: undefined, diskBuffer: false, file: f, cacheLocal: s.local, resume: { position: o.pos }, resumeExact: true });
        return;
      }
    }
    if (o.file) {
      // Play the downloaded file from where you were.
      const s = this.source;
      this.endOffer();
      this.load({ ...s, url: undefined, local: undefined, diskBuffer: false, file: o.file, resume: { position: o.pos }, resumeExact: true });
      return;
    }
    this.endOffer();
    this.seekTo(o.pos);
    this.play();
  }

  drawOffer() {
    const o = this.offer;
    if (!o) return;
    this.offerEl.hidden = false;
    if (o.stage === 'ask') {
      this.offerEl.replaceChildren(h('div.up-card',
        h('div.up-top', h('div.up-thumb', icon('download', 26)),
          h('div.up-text', h('small', 'Feed issue'), h('b', 'I noticed there may be a feed issue.'), h('span.up-when', 'Would you like me to download this and play it when it’s ready?'))),
        h('div.up-actions',
          h('button.up-btn.primary', { onclick: () => this.acceptOffer() }, icon('download', 14), ' Download & play when ready'),
          h('button.up-btn', { onclick: () => { this.endOffer(); this.allHalts = []; } }, 'Keep watching'),
          h('button.up-btn', { onclick: () => { this.offerDismissed = this.source && this.source.itemId; this.endOffer(); } }, "Don't ask again for this video"))));
      return;
    }
    const pct = o.pct || 0;
    this.offerEl.replaceChildren(h('div.up-card',
      h('div.up-top', h('div.up-thumb', icon('download', 26)),
        h('div.up-text', h('small', o.first ? 'Downloading first' : 'Downloading'), h('b', o.err ? `Trouble downloading: ${o.err}` : pct ? `${pct}% downloaded` : `${(o.mb || 0).toFixed(0)} MB downloaded`), h('span.up-when', o.first ? 'It plays from this computer as soon as it’s downloaded (Settings › Playback). Or press Play now to watch while it downloads.' : 'It will start playing automatically, from where you were, when it’s ready.'))),
      h('div.progress', h('i', { style: { width: `${pct}%` } })),
      h('div.up-actions',
        h('button.up-btn', { onclick: () => this.leaveOffer(true) }, icon('play', 14), ' Play now anyway'),
        h('button.up-btn', { onclick: () => this.leaveOffer(false) }, 'Cancel'))));
  }

  // Stop waiting for the download (it carries on in Downloads) and go back to streaming.
  leaveOffer(play) {
    const o = this.offer;
    if (o) o.first = false;
    clearInterval(this.offerTimer);
    this.endOffer();
    if (o && o.released) { this.resumeAt = o.pos > 1 ? o.pos : null; this.start(this.current, 0).catch((e) => this.tryNext(e.message)); if (!play) setTimeout(() => this.video.pause(), 1500); return; }
    if (play) this.play();
  }

  // ---- Freeze tracking & signal meter -------------------------------------------
  // Every halt is remembered; 3 within a minute raises the buffer automatically.
  noteHalt() {
    // Video already on this computer: freezes aren't the feed's fault, so don't raise the
    // buffer or offer a download - but if conversion can't keep up, say so once.
    if (this.isLocalReady()) { this.noteLocalStall(); return; }
    const now = Date.now();
    this.halts = (this.halts || []).filter((t) => now - t < 60000);
    this.halts.push(now);
    this.allHalts = [...(this.allHalts || []).filter((t) => now - t < 300000), now];
    // Movies & episodes: two freezes within 5 minutes → offer to download and play when ready.
    if (this.allHalts.length >= 2) this.offerDownload();
    if (this.halts.length < 3) return;
    this.halts = [];
    const cur = this.cushion();
    const next = BUFFER_CHOICES.find((n) => n > Math.max(cur, 2) && n >= 5);
    if (!next) {
      toast('This channel keeps freezing even with the biggest buffer (30 s). The provider or your connection may be overloaded: try Restart from here, another channel, or a lower quality.', 'warn', 8000);
      return;
    }
    api('setSettings', { prebuffer: next }).then((s) => { this.settings = s; }).catch(() => {});
    this.settings = { ...this.settings, prebuffer: next };
    this.syncBufBtn();
    toast(`The picture froze 3 times in a minute, so buffering was raised to ${next} seconds to smooth it out. Change it any time from the ⚙ menu → Buffering.`, 'info', 7000);
    this.cushionOk = false;
  }

  startSignal() {
    clearInterval(this.signalTimer);
    this.signalTimer = setInterval(() => this.updateSignal(), 1000);
    this.updateSignal();
  }

  // 0–4 bars from buffer health, recent freezes, download speed vs stream bitrate, dropped frames.
  // How far behind the broadcast we are because of pausing (= what's saved to disk ahead).
  savedBehind() {
    return (this.behindLive || 0) + (this.pausedAt ? (Date.now() - this.pausedAt) / 1000 : 0);
  }

  // While paused: live TV counts time saved to disk; HLS streams (not disk-buffered) raise
  // their own buffer limit to ~10 minutes so they keep loading too.
  pauseBuffering(paused) {
    if (this.isLive && this.source && this.source.diskBuffer) {
      if (paused && !this.pausedAt) this.pausedAt = Date.now();
      if (!paused && this.pausedAt) { this.behindLive = (this.behindLive || 0) + (Date.now() - this.pausedAt) / 1000; this.pausedAt = 0; }
    }
    if (this.hls && this.hls.config) {
      const c = this.hls.config;
      if (paused) { this.hlsSaved = this.hlsSaved || { a: c.maxBufferLength, b: c.maxMaxBufferLength }; c.maxBufferLength = 600; c.maxMaxBufferLength = 1200; }
      else if (this.hlsSaved) { c.maxBufferLength = this.hlsSaved.a; c.maxMaxBufferLength = this.hlsSaved.b; this.hlsSaved = null; }
    }
  }

  // Paused live TV keeps recording to disk until the programme ends (TV guide).
  async diskHold(paused) {
    const s = this.source;
    if (!s || !s.diskBuffer) return;
    let until = 0;
    if (paused && this.isLive && s.pl) {
      try { const nn = (await api('nowNext', s.pl, [s.itemId]))[s.itemId]; until = nn && nn.now ? nn.now.stop : 0; } catch (_) { /* no guide */ }
      if (!until || until < Date.now() + 60000) until = Date.now() + 2 * 3600000;
    }
    api('cacheHold', s.local, paused, until).catch(() => {});
  }

  async pollDisk() {
    const s = this.source;
    if (s && s.cacheLocal && (this.touchTick = (this.touchTick || 0) + 1) % 60 === 0) api('cacheTouch', s.cacheLocal).catch(() => {});
    if (!s || !s.diskBuffer) { this.disk = null; return; }
    this.diskTick = (this.diskTick || 0) + 1;
    if (this.diskTick % 2) return;
    const d = this.duration();
    const frac = !this.isLive && d ? Math.max(0, this.currentTime()) / d : undefined;
    try { this.disk = await api('cacheStatus', s.local, frac); } catch (_) { this.disk = null; }
    // Download-speed samples (last 40 s) to compare the feed with the video's own speed.
    if (this.disk && !this.disk.live && !this.disk.done) {
      const now = Date.now();
      this.dlSamples = [...(this.dlSamples || []).filter((x) => now - x[0] < 40000 && x[1] <= this.disk.have), [now, this.disk.have]];
    }
    if (this.diskTick % 60 === 0) api('cacheTouch', s.local).catch(() => {});
  }

  updateSignal() {
    this.pollDisk();
    if (this.statsOn && this.video.paused) this.renderStats(); // keep Stream info current while waiting too
    // Slow feed (movies & episodes): rather than freezing when the little bit in the player
    // runs out, pause cleanly and save enough ahead for the rest to play straight through.
    if (!this.isLive && this.hadPlayback && !this.holding && !this.video.paused && !this.seekingNow && Date.now() >= (this.slowSkipUntil || 0)) {
      const plan = this.slowFeedPlan();
      const have = this.diskAheadSec() || 0;
      // As soon as a slow feed is clear (the first ~15 s), wait once up front instead of letting
      // the player's 30 s run down first; later, step in just before it runs out.
      if (plan && !this.slowEarly && have < plan.need) { this.slowEarly = true; this.holdForSlowFeed(plan); }
      else if (plan && this.bufferedAhead() < 4 && have < Math.min(plan.need, 60)) this.holdForSlowFeed(plan);
    }
    this.drawBars();
    const v = this.video;
    const el = this.signalEl;
    if (!this.source || !this.hadPlayback && !this.el.classList.contains('loading')) { el.dataset.bars = '0'; el.title = 'Signal: —'; return; }
    const now = Date.now();
    const freezes = (this.allHalts || []).filter((t) => now - t < 60000).length;
    let bars;
    let detail = [];
    let speed = null;
    let need = null;
    if (this.engine === 'demo') {
      bars = 4 - Math.min(3, freezes);
      detail.push('built-in demo stream');
    } else if (this.isLocalReady()) {
      bars = 4;
      detail.push(this.source.file ? 'playing a file on this computer' : 'fully downloaded to this computer');
    } else {
      const ahead = this.bufferedAhead();
      const target = Math.max(4, this.cushion());
      // Live TV sits close to the broadcast, so only a second or two ahead is normal there:
      // judge it by whether video keeps arriving, not by a movie-sized buffer.
      if (this.isLive) bars = ahead > 0.15 ? 4 : this.el.classList.contains('loading') ? 0 : 2;
      else bars = ahead >= target ? 4 : ahead >= target * 0.6 ? 3 : ahead >= 1.5 ? 2 : ahead > 0.4 ? 1 : 0;
      if (this.el.classList.contains('loading') && !this.holding) bars = Math.min(bars, 1);
      bars -= Math.min(2, freezes);
      detail.push(`buffer ${ahead.toFixed(1)} s`);
      if (this.hls) {
        speed = this.hls.bandwidthEstimate;
        const l = this.hls.levels && this.hls.levels[this.hls.currentLevel];
        need = l && l.bitrate;
      } else if (this.mpegts && this.mpegts.statisticsInfo) {
        const si = this.mpegts.statisticsInfo;
        if (si.speed) speed = si.speed * 8 * 1024;
        if (this.mediaInfo && this.mediaInfo.videoDataRate) need = (this.mediaInfo.videoDataRate + (this.mediaInfo.audioDataRate || 0)) * 1000;
      }
      if (speed && need) { const r = speed / need; if (r < 1.05) bars = Math.min(bars, 1); else if (r < 1.4) bars = Math.min(bars, 2); else if (r < 2) bars = Math.min(bars, 3); }
      const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
      if (q && q.totalVideoFrames > 200) {
        const prev = this.lastQ || q;
        const drop = (q.droppedVideoFrames - prev.droppedVideoFrames) / Math.max(1, q.totalVideoFrames - prev.totalVideoFrames);
        this.lastQ = { droppedVideoFrames: q.droppedVideoFrames, totalVideoFrames: q.totalVideoFrames };
        if (drop > 0.1) bars = Math.min(bars, 2);
      }
    }
    bars = Math.max(0, Math.min(4, bars));
    el.dataset.bars = String(bars);
    const word = ['No signal', 'Weak', 'Fair', 'Good', 'Excellent'][bars];
    if (speed) detail.push(`${(speed / 1e6).toFixed(1)} Mbps download${need ? ` (needs ${(need / 1e6).toFixed(1)})` : ''}`);
    detail.push(`${freezes} freeze${freezes === 1 ? '' : 's'} in the last minute`);
    el.title = `Signal: ${word} · ${detail.join(' · ')}`;
    el.setAttribute('aria-label', el.title);
  }

  // Show "Restart from here" when the picture has been stuck for a few seconds.
  armStuck() {
    clearTimeout(this.stuckTimer);
    this.stuckTimer = setTimeout(() => { if (this.source && !this.holding && this.el.classList.contains('loading')) this.el.classList.add('stuck'); }, 4000);
  }

  disarmStuck() {
    clearTimeout(this.stuckTimer);
    this.el.classList.remove('stuck');
  }

  // Reload the stream and pick up exactly where it froze (live: rejoin the broadcast).
  async syncRemuxStart(url) {
    for (let i = 0; i < 40 && this.currentUrl === url; i++) {
      const start = await api('remuxStart', url).catch(() => null);
      if (start != null) { if (this.currentUrl === url) this.offset = start; return; }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // Size / bitrate limit for re-encoding, from the "Quality" choice.
  qualityOpts(p) {
    const q = this.settings && this.settings.quality;
    if (!p || p.mode !== 'full' || !q || q === 'source' || !QUALITY_RATE[q]) return {};
    return { maxHeight: Number(q), maxRate: QUALITY_RATE[q] };
  }

  // Change quality now (remembered for next time) and carry on from the same spot.
  setQuality(q) {
    api('setSettings', { quality: q }).then((s) => { this.settings = s; }).catch(() => {});
    this.settings = { ...this.settings, quality: q };
    if (!this.source) return;
    const pos = this.isLive ? 0 : this.currentTime();
    this.attempts = this.planEngines(this.source);
    this.current = this.attempts[0];
    if (!this.isLive && this.current.engine !== 'transcode') this.resumeAt = pos > 1 ? pos : null;
    this.flash(q === 'source' ? 'Quality: original' : `Quality: ${q}p`);
    this.start(this.current, this.isLive ? 0 : pos).catch((e) => this.tryNext(e.message));
  }

  restartHere() {
    if (!this.source) return;
    const pos = this.isLive ? 0 : this.currentTime();
    this.disarmStuck();
    this.stopCushion();
    this.retries = 0;
    this.flash(this.isLive ? 'Reconnecting…' : `Restarting at ${fmtDur(pos)}`);
    const p = this.current || this.attempts[0];
    if (!p) { this.retry(); return; }
    if (this.isLive && this.source.diskBuffer) api('cacheRelease', this.source.local).catch(() => {});
    if (!this.isLive && p.engine !== 'transcode') this.resumeAt = pos > 1 ? pos : null;
    this.el.classList.add('loading');
    this.start(p, this.isLive ? 0 : pos).catch((e) => this.tryNext(e.message));
  }

  // Live streams that stall for too long are reconnected.
  startWatchdog() {
    clearInterval(this.watchdog);
    let last = -1;
    let stuck = 0;
    this.watchdog = setInterval(() => {
      const v = this.video;
      // First load that never starts (nothing arrives for ~12 s) while using the disk buffer:
      // fall back to direct streaming for this video.
      // (Only when nothing at all is arriving: a slow provider that is still sending keeps the disk buffer.)
      const diskMoving = this.disk && this.disk.have > (this.lastDiskHave || 0);
      if (this.disk) this.lastDiskHave = this.disk.have;
      // Last resort only: nothing at all has arrived from the provider (or the disk buffer
      // reports an error) while starting.
      const diskDead = this.disk ? (!this.disk.have || !!this.disk.error) : false;
      if (!this.hadPlayback && this.source && this.source.diskBuffer && this.source.direct && !v.paused && diskDead && !diskMoving && Date.now() - (this.startedAt || Date.now()) > 20000 && v.readyState < 2) {
        const s = this.source;
        api('cacheRelease', s.local).catch(() => {});
        s.local = s.direct; s.diskBuffer = false; s.diskReason = 'switched to direct streaming (slow start)'; this.disk = null;
        toast('This video was slow to start — switched to direct streaming.', 'info', 4000);
        this.startedAt = Date.now();
        this.restartHere();
        return;
      }
      if (v.paused || !this.hadPlayback || this.engine === 'demo') { stuck = 0; return; }
      if (v.currentTime === last) stuck++;
      else stuck = 0;
      last = v.currentTime;
      // Picture frozen while "playing" (no waiting event): offer the restart button, then auto-reconnect.
      if (stuck === 2) { this.el.classList.add('stuck'); if (!this.el.classList.contains('loading')) this.noteHalt(); }
      // Video data is ready but the picture isn't moving (a decoder hiccup, not the network):
      // nudge the playhead a hair forward, which unsticks most players without reloading.
      if (stuck === 2 && this.bufferedAhead() > 1.5 && !this.holding) {
        try { v.currentTime = v.currentTime + 0.05; } catch (_) { /* ignore */ }
        this.play();
      }
      if (stuck >= 2) this.el.classList.add('stuck');
      else if (!stuck && !this.el.classList.contains('loading')) this.el.classList.remove('stuck');
      // (A stall mid-video keeps the disk buffer: it reconnects and keeps buffering; switching
      // to direct streaming would lose the buffer for the rest of the video.)
      if (stuck >= 6) {
        stuck = 0;
        // The whole video is already saved: carry on from that file (from here) instead of
        // reconnecting to the provider.
        if (!this.isLive && this.source && this.source.diskBuffer && this.disk && this.disk.done && !this.disk.error) { this.playSavedFile('The picture stalled — continuing from the copy saved on this computer.'); return; }
        toast('Stream stalled — reconnecting…', 'info', 2000);
        this.restartHere();
      }
      this.checkAudioFlow();
      if (this.statsOn) this.renderStats();
    }, 2000);
  }

  startPositionSaver() {
    clearInterval(this.posTimer);
    const s = this.source;
    if (!s || !s.pl || this.isLive || s.file) return;
    this.posTimer = setInterval(() => {
      const d = this.duration();
      if (!this.video.paused && d) api('savePosition', s.pl, s.itemId, this.currentTime(), d);
    }, 10000);
  }

  async probeLater() {
    const src = this.source;
    // Through the disk buffer when there is one: never a second connection to the provider.
    const via = src.file || (src.diskBuffer ? src.local : src.url);
    const viaH = src.diskBuffer ? {} : src.headers;
    const info = await api('probe', via, viaH).catch(() => null);
    if (this.source !== src || !info) return;
    this.probeInfo = info;
    if (info.duration && !this.knownDuration) this.knownDuration = info.duration;
    // Embedded text subtitles become selectable tracks (extracted to WebVTT on demand).
    const textCodecs = /subrip|srt|ass|ssa|mov_text|webvtt|text/i;
    for (const sTrack of info.subtitle || []) {
      if (!textCodecs.test(sTrack.codec)) continue;
      const label = `${(sTrack.lang || 'Track ' + (sTrack.index + 1)).toUpperCase()} (embedded)`;
      const url = await api('variant', { mode: 'subs', url: via, headers: viaH, index: sTrack.index });
      this.addTextTrack(label, url, sTrack.lang, true);
    }
    if (info.audio.length > 1 && src.item && src.item.type === 'live') learnTrait(src.pl, src.itemId, 'audio');
    if (info.hasCC && src.item && src.item.type === 'live') learnTrait(src.pl, src.itemId, 'cc');
    const pref = this.settings.preferredAudioLang;
    if (pref && info.audio.length > 1) {
      const idx = info.audio.findIndex((a) => a.lang && a.lang.startsWith(pref));
      if (idx > 0) this.selectAudio(idx, true);
    }
    this.autoSelectSubs();
  }

  destroyEngine(keepSource) {
    clearTimeout(this.audioCheck);
    if (this.hls) { try { this.hls.destroy(); } catch (_) { /* gone */ } this.hls = null; }
    if (this.mpegts) {
      const p = this.mpegts;
      this.mpegts = null;
      try { p.pause(); p.unload(); p.detachMediaElement(); p.destroy(); } catch (_) { /* gone */ }
    }
    this.recoveredMedia = false;
    const v = this.video;
    // Keep externally-added <track> elements when only switching engine.
    if (!keepSource) [...v.querySelectorAll('track')].forEach((t) => t.remove());
    if (v.srcObject) v.srcObject = null;
    v.removeAttribute('src');
    try { v.load(); } catch (_) { /* ignore */ }
  }

  stop() {
    this.endOffer();
    if (this.source && this.source.diskBuffer) api('cacheRelease', this.source.local).catch(() => {});
    if (this.source && this.source.cacheLocal) api('cacheRelease', this.source.cacheLocal).catch(() => {});
    if (this.windowFull) this.setWindowFull(false);
    this.resetUpNext();
    this.dropPreload();
    clearInterval(this.signalTimer);
    this.signalEl.dataset.bars = '0';
    this.stopCushion();
    this.disarmStuck();
    clearInterval(this.watchdog);
    clearInterval(this.posTimer);
    clearTimeout(this.sleepTimer);
    const s = this.source;
    if (s && s.pl && !this.isLive && !s.file && this.duration()) api('savePosition', s.pl, s.itemId, this.currentTime(), this.duration());
    this.destroyEngine();
    this.source = null;
    this.capEl.replaceChildren();
    this.el.classList.remove('loading', 'has-error');
  }

  destroy() {
    this.stop();
    this.unsub && this.unsub();
    this.el.remove();
  }

  // ---- Time / seeking -----------------------------------------------------
  currentTime() {
    return this.offset + (this.video.currentTime || 0);
  }

  duration() {
    const d = this.video.duration;
    if (this.engine === 'transcode' || !Number.isFinite(d) || d <= 0) return this.knownDuration || 0;
    return d;
  }

  isSeekable() {
    return !this.isLive && this.duration() > 0;
  }

  seekValue() {
    return (Number(this.seek.value) / 1000) * this.duration();
  }

  seekTo(sec) {
    sec = Math.max(0, Math.min(sec, (this.duration() || Infinity) - 1));
    if (this.engine === 'transcode' && !this.isLive) {
      // The compat stream can't seek by itself: restart ffmpeg at the new position.
      this.start(this.current, sec).catch((e) => this.tryNext(e.message));
      return;
    }
    this.video.currentTime = sec - this.offset;
  }

  skip(sec) {
    if (this.isLive) {
      // Live: move within whatever is buffered (pause/rewind live TV).
      const v = this.video;
      const b = v.buffered;
      if (!b.length) return;
      v.currentTime = Math.max(b.start(0), Math.min(b.end(b.length - 1) - 0.5, v.currentTime + sec));
      this.el.classList.toggle('behind-live', b.end(b.length - 1) - v.currentTime > 5);
      return;
    }
    this.seekTo(this.currentTime() + sec);
  }

  goLive() {
    // Paused live TV saved to disk: "LIVE" rejoins the broadcast now (fresh connection).
    if (this.source && this.source.diskBuffer && this.isLive && this.savedBehind() > 10) {
      this.behindLive = 0; this.pausedAt = 0;
      this.restartHere();
      this.el.classList.remove('behind-live');
      return;
    }
    const v = this.video;
    const b = v.buffered;
    if (b.length) v.currentTime = b.end(b.length - 1) - 1;
    if (v.paused) this.play();
    this.el.classList.remove('behind-live');
  }

  // Live: the part of the broadcast held in memory (you can rewind within it).
  liveWindow() {
    const b = this.video.buffered;
    if (!b.length) return null;
    const start = b.start(0);
    const end = b.end(b.length - 1);
    return end - start > 1 ? { start, end } : null;
  }

  drawBars() {
    const v = this.video;
    const ahead = this.engine === 'demo' ? 0 : this.bufferedAhead();
    // Honest "ready" readout: what the player itself can play right now.
    const saved = this.isLive && this.source && this.source.diskBuffer ? this.savedBehind() : 0;
    const diskAhead = !this.isLive && this.disk && !this.disk.done ? this.diskAheadSec() : null;
    // Movies & episodes: the player only keeps ~30 s in memory; the real buffer is what's saved
    // to disk ahead of you, so show both - plus the feed's speed when it's slower than the video.
    const r = diskAhead != null ? this.feedRate() : null;
    const b = diskAhead != null ? this.playRate() : null;
    const feed = r != null && b && r < b * 0.98 ? ` · feed ${Math.max(0, Math.round((r / b) * 100))}%` : '';
    const extra = saved > ahead + 2 ? ` · ${fmtDur(saved)} saved`
      : diskAhead != null && !this.video.paused ? ` · ${fmtDur(Math.max(diskAhead, ahead))} saved ahead${feed}`
      : !this.isLive && this.disk && this.disk.done && !this.video.paused ? ' · all saved'
      : !this.isLive && this.disk && !this.disk.done && this.video.paused ? (this.disk.total ? ` · downloading ${Math.round((this.disk.have / this.disk.total) * 100)}%` : ` · ${(this.disk.have / 1048576).toFixed(0)} MB downloaded`)
      : !this.isLive && this.disk && this.disk.done && this.video.paused ? ' · fully downloaded'
      : this.video.paused && this.source && !this.source.diskBuffer ? ` · not disk-buffered (${this.source.diskReason || (CAPS.desktop === false ? 'phone app' : 'switched to direct streaming')})` : '';
    const inPlayer = this.source && this.source.diskBuffer && !this.isLive ? 'in player' : 'ready';
    this.readyEl.textContent = this.engine === 'demo' || !this.source ? '' : `▶ ${ahead < 10 ? ahead.toFixed(1) : Math.round(ahead)}s ${inPlayer}${extra}`;
    this.readyEl.title = !this.source ? '' : this.source.diskBuffer
      ? 'In player: what the video player holds in memory (about 30 s at most). Saved ahead: what is downloaded to disk past where you are - the real buffer, it keeps growing at your provider\'s speed. Feed %: provider speed compared with the video\'s speed (under 100% means it arrives slower than it plays).'
      : 'Ready in the player now. This stream type isn\'t buffered to disk; while paused it buffers up to about 10 minutes.';
    this.readyEl.classList.toggle('low', !!this.source && this.hadPlayback && ahead < 2);
    if (this.engine === 'demo') { this.bufBar.style.width = this.readyBar.style.width = this.bothBar.style.width = '0%'; if (this.isLive) this.playBar.style.width = '100%'; return; }
    if (this.isLive) {
      // Live: the bar is what's held for rewinding; the bright part after the playhead is
      // only what's really ready ahead (usually a few seconds at the live edge).
      const w = this.liveWindow();
      if (!saved) this.bufBar.style.width = '0%';
      if (!w) { this.readyBar.style.width = this.playBar.style.width = '0%'; return; }
      // Saved on disk beyond what the player holds (paused live TV) widens the bar in yellow.
      const extraDisk = Math.max(0, saved - ahead);
      const span = (w.end - w.start) + extraDisk;
      const pct = (x) => `${Math.max(0, Math.min(100, ((x - w.start) / span) * 100))}%`;
      const played = Math.max(0, Math.min(1, (v.currentTime - w.start) / span));
      this.readyBar.style.width = pct(v.currentTime + ahead);
      this.bufBar.style.width = saved ? pct(v.currentTime + Math.max(saved, ahead)) : '0%';
      this.bothBar.style.width = saved ? pct(v.currentTime + Math.min(saved, ahead)) : '0%';
      if (!this.seeking) { this.playBar.style.width = `${played * 100}%`; this.seek.value = Math.round(played * 1000); }
      this.seekWrap.title = `Live TV · light blue: ${ahead.toFixed(1)} s ready in the player${saved ? ` · yellow: ${fmtDur(saved)} saved to disk while paused` : ''} · white: played. Press LIVE to jump back to the broadcast.`;
      return;
    }
    const d = this.duration();
    if (!d) { this.bufBar.style.width = this.readyBar.style.width = this.bothBar.style.width = this.playBar.style.width = '0%'; return; }
    const diskPct = this.disk && this.disk.total ? (this.disk.have / this.disk.total) * 100 : 0;
    const readyPct = Math.min(100, ((this.currentTime() + ahead) / d) * 100);
    // Yellow = on disk, light blue = ready in the player, green = where both overlap.
    this.bufBar.style.width = `${Math.min(100, diskPct)}%`;
    this.readyBar.style.width = `${readyPct}%`;
    this.bothBar.style.width = `${Math.min(diskPct, readyPct)}%`;
    if (!this.seeking) this.playBar.style.width = `${Math.min(100, (this.currentTime() / d) * 100)}%`;
    this.seekWrap.title = `${this.disk && this.disk.total ? `Yellow: ${this.disk.done ? 'fully downloaded to disk' : `${Math.round(diskPct)}% downloaded to disk`} · ` : ''}Light blue: ${ahead.toFixed(0)} s ready in the player · Green: both · White: played`;
  }

  onTime() {
    this.drawBars();
    this.checkUpNext();
    const d = this.duration();
    const t = this.currentTime();
    if (this.isLive) {
      const b = this.video.buffered;
      const behind = b.length ? b.end(b.length - 1) - this.video.currentTime : 0;
      this.timeEl.textContent = behind > 5 ? `-${fmtDur(behind)}` : '';
      this.el.classList.toggle('behind-live', behind > 5);
    } else if (!this.seeking) {
      this.seek.value = d ? Math.round((t / d) * 1000) : 0;
      this.timeEl.textContent = d ? `${fmtDur(t)} / ${fmtDur(d)}` : fmtDur(t);
    }
  }

  onEnded() {
    const s = this.source;
    if (s && s.pl && !this.isLive) api('savePosition', s.pl, s.itemId, this.duration(), this.duration());
    if (this.isLive) { this.reload(); return; }
    if (this.upNextEnded()) return;
    if (this.opts.onEnded) this.opts.onEnded();
  }

  // ---- Basic controls -------------------------------------------------------
  togglePlay() {
    if (this.holding) {
      if (this.slowHolding) this.slowSkipUntil = Date.now() + 10 * 60000; // "start now" - don't hold again for a while
      this.stopCushion(); this.cushionOk = true; this.play(); return;
    }
    if (this.video.paused) this.play(); else this.video.pause();
  }

  // ---- Slow feeds (movies & episodes) ----------------------------------------------
  // Bytes per second arriving from the provider (null until measured for ~10 s).
  feedRate() {
    const x = this.dlSamples || [];
    if (x.length < 3) return null;
    const a = x[0]; const b = x[x.length - 1];
    return b[0] - a[0] >= 10000 ? (b[1] - a[1]) / ((b[0] - a[0]) / 1000) : null;
  }

  // Bytes per second the video uses while playing.
  playRate() {
    const d = this.duration();
    return this.disk && this.disk.total && d ? this.disk.total / d : null;
  }

  // Seconds of video saved on disk straight on from the playhead.
  diskAheadSec() {
    const b = this.playRate();
    return this.disk && this.disk.ahead != null && b ? this.disk.ahead / b : null;
  }

  // When the provider sends slower than the video plays, a fixed reserve just drains and the
  // picture stops every few minutes. Instead, work out how much must be saved ahead so the
  // rest of the video plays straight through: remaining × (1 − feed speed ÷ video speed).
  slowFeedPlan() {
    if (this.isLive || !this.source || !this.source.diskBuffer || !this.disk || this.disk.done || this.isLocalReady()) return null;
    const r = this.feedRate(); const b = this.playRate(); const d = this.duration();
    if (!r || !b || !d || r >= b * 0.98) return null;
    const remaining = Math.max(0, d - this.currentTime());
    const need = Math.min(remaining, remaining * (1 - Math.max(0, r) / b) + 20);
    return need > 30 ? { need, r, b, remaining } : null;
  }

  // Stream info lines about disk buffering and slow-feed protection (and why it's not active).
  slowFeedDiag() {
    if (this.isLive || !this.source) return [];
    const s = this.source;
    if (s.file) return ['Saving:     playing a file on this computer'];
    if (!s.diskBuffer) return [`Saving:     not saved to disk (${s.diskReason || 'direct streaming'}) - only the player's ~30 s`];
    const d = this.disk;
    const ahead = this.diskAheadSec();
    const r = this.feedRate(); const b = this.playRate();
    const lines = [`Saved ahead: ${ahead != null ? fmtDur(ahead) : '?'} on disk`];
    lines.push(`Feed speed: ${r != null && b ? `${Math.round((r / b) * 100)}% of the video's speed (${(r / 1024).toFixed(0)} KB/s vs ${(b / 1024).toFixed(0)} KB/s)` : r != null ? `${(r / 1024).toFixed(0)} KB/s (video size or length unknown)` : d && d.done ? 'all downloaded' : 'measuring…'}`);
    const why = !d ? 'no disk status yet' : d.done ? 'not needed - all downloaded' : !d.total ? 'not available - provider didn\'t send the file size' : !this.duration() ? 'not available - video length unknown' : r == null ? 'measuring the feed (about 10 s)' : r >= b * 0.98 ? 'not needed - feed is fast enough' : this.slowSkipUntil > Date.now() ? 'paused - you pressed Play to start sooner' : this.slowFeedPlan() ? `active - needs ${fmtDur(this.slowFeedPlan().need)} saved ahead to play to the end` : 'not needed';
    lines.push(`Slow feed:  ${why}`);
    return lines;
  }

  // ---- Buffering cushion ------------------------------------------------------
  cushion() {
    // Nothing to protect against when the whole video is already on this computer.
    if (this.isLocalReady()) return 0;
    const want = Math.min(30, Math.max(0, Number(this.settings && this.settings.prebuffer) || 0));
    // Never ask for more than the player has shown it can hold for this video.
    return this.cushionCap != null ? Math.min(want, this.cushionCap) : want;
  }

  // Downloaded file, recording, or a stream the disk buffer has fully downloaded.
  isLocalReady() {
    const s = this.source;
    return !!(s && (s.file || (s.diskBuffer && this.disk && this.disk.done && !this.disk.live)));
  }

  bufferedAhead() {
    const v = this.video;
    const b = v.buffered;
    for (let i = 0; i < b.length; i++) if (b.start(i) <= v.currentTime + 0.3 && b.end(i) >= v.currentTime) return b.end(i) - v.currentTime;
    return 0;
  }

  // Hold playback until the chosen number of seconds is buffered, so short
  // network dips are absorbed instead of freezing the picture.
  holdForCushion() {
    const plan = this.engine === 'demo' || this.holding || Date.now() < (this.slowSkipUntil || 0) ? null : this.slowFeedPlan();
    if (plan && (this.diskAheadSec() || 0) < plan.need) { this.holdForSlowFeed(plan); return; }
    const target = this.cushion();
    if (!target || this.engine === 'demo' || this.holding) { this.cushionOk = true; return; }
    if (this.bufferedAhead() >= target - 0.25) { this.cushionOk = true; return; }
    const v = this.video;
    this.holding = true;
    v.pause();
    this.el.classList.add('loading', 'buffering');
    const startedAt = Date.now();
    let last = -1;
    let still = 0;
    this.cushionTimer = setInterval(() => {
      const ahead = this.bufferedAhead();
      this.osd.textContent = `Buffering ${Math.min(target, Math.floor(ahead))} / ${target} s`;
      this.osd.classList.add('on');
      still = Math.abs(ahead - last) < 0.05 ? still + 1 : 0;
      last = ahead;
      // Done: enough buffered, it stopped growing (the player's memory is full, or the video is
      // local), or waited too long. If it stopped short, remember that as this video's limit.
      if (still > 8 && ahead > 1 && ahead < target - 0.25) this.cushionCap = Math.max(2, Math.floor(ahead * 0.8));
      if (ahead >= target - 0.25 || still > 8 || this.isLocalReady() || Date.now() - startedAt > (target * 2 + 15) * 1000) {
        this.stopCushion();
        this.cushionOk = true;
        this.play();
      }
    }, 250);
  }

  // Wait until enough is saved on disk for the rest to play without stopping (press Play to
  // start sooner). The download keeps running at full speed the whole time.
  holdForSlowFeed(plan) {
    const v = this.video;
    this.holding = true;
    this.slowHolding = true;
    v.pause();
    this.el.classList.add('loading', 'buffering');
    let need = plan.need;
    if (!this.slowToldAt || Date.now() - this.slowToldAt > 10 * 60000) {
      this.slowToldAt = Date.now();
      toast(`Your provider is sending this ${Math.round((plan.r / plan.b) * 100)}% as fast as it plays, so a 30-second buffer keeps running out. MuchSmarter is saving enough ahead for the rest to play without stopping. Press Play any time to start sooner.`, 'info', 9000);
    }
    const tick = () => {
      if (this.isLocalReady()) { this.stopCushion(); this.cushionOk = true; this.play(); return; }
      const p = this.slowFeedPlan();
      if (p) need = Math.min(need, p.need); // a faster feed needs less waiting
      const have = this.diskAheadSec() || 0;
      const r = this.feedRate(); const b = this.playRate();
      const eta = r && b && r > 0 ? ((need - have) * b) / r : null;
      this.osd.textContent = `Slow feed — saving ahead so the rest plays without stopping: ${fmtDur(Math.min(have, need))} / ${fmtDur(need)}${eta && eta > 0 ? ` · about ${fmtDur(eta)} to go` : ''} · press Play to start now`;
      this.osd.classList.add('on');
      if (have >= need - 1 || !p) { this.stopCushion(); this.cushionOk = true; this.play(); }
    };
    this.cushionTimer = setInterval(tick, 1000);
    tick();
  }

  stopCushion() {
    clearInterval(this.cushionTimer);
    this.slowHolding = false;
    if (!this.holding) return;
    this.holding = false;
    this.el.classList.remove('loading', 'buffering');
    this.osd.classList.remove('on');
  }

  syncBufBtn() {
    if (!this.bufLabel) return;
    const n = this.cushion();
    this.bufLabel.textContent = n ? `${n}s` : 'Auto';
    this.bufBtn.classList.toggle('on', n > 0);
    this.bufBtn.title = `Buffer time: ${n ? n + ' seconds' : 'Auto'} held in reserve. Click to change (more = fewer freezes, slower channel changes).`;
  }

  bufferMenu(btnEl) {
    const cn = this.cushion();
    menuFrom(btnEl, [
      { label: 'Buffer time — video held in reserve', disabled: true },
      ...BUFFER_CHOICES.map((n) => ({ label: bufferLabel(n), checked: n === cn, onClick: () => this.setCushion(n) })),
      '-',
      { label: 'Tip: freezing a lot? Try 10–20 seconds', disabled: true },
    ]);
  }

  setCushion(n) {
    api('setSettings', { prebuffer: n }).then((s) => { this.settings = s; });
    this.settings = { ...this.settings, prebuffer: n };
    this.syncBufBtn();
    this.flash(n ? `Buffering: ${n} seconds` : 'Buffering: Auto');
    // Live: rebuild the buffer now so the new cushion takes effect straight away.
    if (n && this.source) { this.cushionOk = false; if (this.hls || this.mpegts) this.reload(); else this.holdForCushion(); }
  }

  syncPlay() {
    this.playBtn.replaceChildren(icon(this.video.paused ? 'play' : 'pause'));
    this.el.classList.toggle('paused', this.video.paused);
    this.poke();
  }

  setVolume(v) {
    this.video.volume = Math.max(0, Math.min(1, v));
    this.video.muted = false;
    if (this.video.volume > 0) localStorage.setItem('volume', this.video.volume);
    this.flash(`Volume ${Math.round(this.video.volume * 100)}%`);
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
  }

  syncVol() {
    this.vol.value = this.video.muted ? 0 : this.video.volume;
    this.muteBtn.replaceChildren(icon(this.video.muted || this.video.volume === 0 ? 'mute' : 'volume'));
  }

  flash(text) {
    this.osd.textContent = text;
    this.osd.classList.add('on');
    clearTimeout(this.osdTimer);
    this.osdTimer = setTimeout(() => this.osd.classList.remove('on'), 1200);
  }

  isFullscreen() {
    return !!this.windowFull || document.fullscreenElement === this.el;
  }

  // Desktop: full screen = the whole app window goes full screen and the player covers it.
  // That's a window setting, so a stream reload or buffering hiccup can't knock it back to
  // the normal size (browser "element" full screen can drop out when the video reloads).
  toggleFullscreen() {
    if (CAPS.desktop !== false && !this.opts.multiview) { this.setWindowFull(!this.windowFull); return; }
    if (this.isFullscreen()) document.exitFullscreen();
    else this.el.requestFullscreen().catch(() => {});
  }

  setWindowFull(on) {
    this.windowFull = !!on;
    this.el.classList.toggle('window-full', this.windowFull);
    document.body.classList.toggle('player-window-full', this.windowFull);
    api('setFullScreen', this.windowFull).catch(() => {});
    this.syncFull();
    this.el.focus();
  }

  syncFull() {
    this.fullBtn.replaceChildren(icon(this.isFullscreen() ? 'exitfull' : 'full'));
    this.el.classList.toggle('fullscreen', this.isFullscreen());
  }

  async togglePip() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await this.video.requestPictureInPicture();
    } catch (e) { errToast(e); }
  }

  async toggleOnTop(btnEl) {
    this.onTop = !this.onTop;
    await api('setAlwaysOnTop', this.onTop);
    btnEl.classList.toggle('on', this.onTop);
    this.flash(this.onTop ? 'Always on top' : 'Normal window');
  }

  popout(mini) {
    const s = this.source;
    if (!s) return;
    api('popout', { ...s, mini, position: this.isLive ? 0 : this.currentTime(), title: this.titleEl.textContent, subtitle: this.subEl.textContent });
    this.video.pause();
    if (this.opts.onPopout) this.opts.onPopout();
  }

  async toggleFav() {
    const s = this.source;
    if (!s || !s.pl) return;
    const on = await api('toggleFavorite', s.pl, s.itemId);
    s.favorite = on;
    this.favBtn.replaceChildren(icon(on ? 'star-on' : 'star'));
    this.favBtn.classList.toggle('on', on);
    toast(on ? 'Added to favorites' : 'Removed from favorites', 'info', 1500);
  }

  setAspect(a) {
    this.aspect = a;
    this.el.dataset.aspect = a;
    this.flash(ASPECTS.find((x) => x.id === a).label);
  }

  // ---- Captions & subtitles --------------------------------------------------
  addTextTrack(label, url, lang, embedded) {
    if (this.textTracks.some((t) => t.url === url)) return;
    const el = h('track', { kind: 'subtitles', label, srclang: lang || '', src: url });
    this.video.append(el);
    el.track.mode = 'disabled';
    this.textTracks.push({ label, url, lang, el, embedded });
    this.autoSelectSubs();
  }

  // All text tracks currently known to the <video>: provider/embedded/local + hls.js CEA-608.
  allTracks() {
    return [...this.video.textTracks].map((t, i) => ({ track: t, index: i, label: t.label || (t.kind === 'captions' ? `CC${i + 1}` : `Track ${i + 1}`), lang: t.language, kind: t.kind }));
  }

  refreshTextTracks() {
    // Remember channels that carry captions (for the Live TV "Features" filter).
    if (this.source && this.isLive && this.allTracks().some((t) => t.kind === 'captions' || t.kind === 'subtitles')) learnTrait(this.source.pl, this.source.itemId, 'cc');
    for (const t of this.video.textTracks) if (t.mode === 'showing') t.mode = 'hidden';
    this.autoSelectSubs();
  }

  autoSelectSubs() {
    const c = this.settings && this.settings.captions;
    if (!c || !c.enabled || this.activeText >= 0) return;
    const tracks = this.allTracks();
    if (!tracks.length) return;
    const pref = this.settings.preferredSubLang;
    const pick = (pref && tracks.find((t) => (t.lang || '').startsWith(pref))) || tracks.find((t) => t.kind === 'captions') || tracks[0];
    this.selectText(pick.index, true);
  }

  selectText(index, quiet) {
    const list = [...this.video.textTracks];
    list.forEach((t, i) => { t.mode = i === index ? 'hidden' : 'disabled'; });
    this.activeText = index;
    this.capEl.replaceChildren();
    this.ccBtn.classList.toggle('on', index >= 0);
    if (!quiet) this.flash(index >= 0 ? `Subtitles: ${list[index].label || 'On'}` : 'Subtitles off');
  }

  // We draw cues ourselves so size/colour/background/edge/position/delay all apply.
  capLoop() {
    const tick = () => {
      this.capRaf = requestAnimationFrame(tick);
      if (this.activeText < 0) return;
      const t = this.video.textTracks[this.activeText];
      if (!t || !t.cues) return;
      // Subtitle files (provider / embedded in the file / your own) are timed from the start of the
      // video, so use the real position - which includes the part skipped when the converter
      // started mid-way (resume, seeking). Captions inside the stream follow the player's clock.
      const fromFile = this.textTracks.some((x) => x.el && x.el.track === t);
      const now = (fromFile ? this.currentTime() : this.video.currentTime) - this.subDelay;
      const active = [];
      for (const cue of t.cues) if (cue.startTime <= now && cue.endTime > now) active.push(cue);
      const key = active.map((c) => c.startTime + c.text).join('|');
      if (key === this.lastCueKey) return;
      this.lastCueKey = key;
      this.capEl.replaceChildren(...active.map((c) => {
        const line = h('div.cue');
        // Keep simple formatting (<i>, <b>, <u>); strip everything else.
        line.innerHTML = String(c.text).replace(/<(?!\/?(i|b|u)>)[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').replace(/\n/g, '<br>');
        return line;
      }));
    };
    tick();
  }

  async ccMenu(btnEl) {
    const tracks = this.allTracks();
    const c = this.settings.captions;
    const items = [
      { label: 'Off', checked: this.activeText < 0, onClick: () => this.selectText(-1) },
      ...tracks.map((t) => ({ label: `${t.kind === 'captions' ? '[CC] ' : ''}${t.label}${t.lang ? ` (${t.lang})` : ''}`, checked: t.index === this.activeText, onClick: () => this.selectText(t.index) })),
      '-',
    ];
    if (this.isLive && this.engine !== 'hlsRepack' && this.engine !== 'hls' && CAPS.transcode !== false) {
      items.push({ label: 'Find closed captions (CC1–CC4 / 708)', icon: 'cc', onClick: () => this.enableLiveCC() });
    }
    items.push(
      { label: 'Load subtitle file (.srt / .vtt)…', icon: 'folder', onClick: () => this.loadSubFile() },
      { label: `Subtitle delay: ${this.subDelay >= 0 ? '+' : ''}${this.subDelay.toFixed(1)}s`, icon: 'clock', onClick: () => this.subDelayDialog() },
      { label: 'Caption style…', icon: 'edit', onClick: () => captionStyleDialog(this.settings) },
      { label: c.enabled ? 'Turn captions off by default' : 'Turn captions on by default', icon: 'check', onClick: () => api('setSettings', { captions: { ...c, enabled: !c.enabled } }) });
    menuFrom(btnEl, items);
  }

  // Live MPEG-TS carries 608/708 captions inside the video stream. Repackaging to
  // HLS locally lets hls.js expose them as text tracks.
  async enableLiveCC() {
    toast('Looking for closed captions in this channel…', 'info', 2500);
    this.attempts.unshift({ engine: 'hlsRepack' });
    await this.tryNext();
    setTimeout(() => {
      const cc = this.allTracks().find((t) => t.kind === 'captions');
      if (cc) this.selectText(cc.index);
      else if (this.engine === 'hlsRepack') toast('No captions found yet — they appear as soon as the broadcaster sends them.', 'info', 4000);
    }, 9000);
  }

  async loadSubFile() {
    const f = await api('chooseFile', [{ name: 'Subtitles', extensions: ['srt', 'vtt', 'webvtt'] }]);
    if (!f) return;
    const url = await api('variant', { mode: 'extsubs', url: f });
    this.addTextTrack(f.split(/[\\/]/).pop(), url, '');
    setTimeout(() => this.selectText(this.video.textTracks.length - 1), 300);
  }

  subDelayDialog() {
    const val = h('input.input', { type: 'number', step: 0.1, value: this.subDelay });
    modal('Subtitle delay', h('label.field', h('span', 'Seconds (positive = show later)'), val), {
      actions: [{ label: 'Reset', onClick: () => { this.subDelay = 0; } }, { label: 'Apply', primary: true, onClick: () => { this.subDelay = Number(val.value) || 0; } }],
    });
  }

  // ---- Audio / quality / misc menus ---------------------------------------------
  audioMenu(btnEl) {
    const items = [];
    if (this.hls && this.hls.audioTracks && this.hls.audioTracks.length > 1) {
      this.hls.audioTracks.forEach((t, i) => items.push({ label: `${t.name || t.lang || 'Track ' + (i + 1)}${t.lang ? ` (${t.lang})` : ''}`, checked: this.hls.audioTrack === i, onClick: () => { this.hls.audioTrack = i; } }));
    } else if (this.video.audioTracks && this.video.audioTracks.length > 1) {
      [...this.video.audioTracks].forEach((t, i) => items.push({ label: langName(t.language) || (t.label && !/handler/i.test(t.label) ? t.label : '') || `Track ${i + 1}`, checked: t.enabled, onClick: () => { [...this.video.audioTracks].forEach((x, j) => { x.enabled = j === i; }); } }));
    } else if (this.probeInfo && this.probeInfo.audio.length > 1) {
      this.probeInfo.audio.forEach((a, i) => items.push({ label: `${(a.lang || 'Track ' + (i + 1)).toUpperCase()} · ${a.codec}`, checked: (this.audioIndex ?? 0) === i, onClick: () => this.selectAudio(i) }));
    }
    if (!items.length) {
      items.push({ label: 'Only one audio track', disabled: true });
      if (!this.probeInfo) items.push({ label: 'Scan stream for more tracks', icon: 'search', onClick: async () => { this.probeInfo = await api('probe', this.source.file || (this.source.diskBuffer ? this.source.local : this.source.url), this.source.diskBuffer ? {} : this.source.headers); toast(`${(this.probeInfo && this.probeInfo.audio.length) || 0} audio track(s) found`); } });
    }
    if (CAPS.transcode !== false) items.push('-', { label: 'Audio compatibility mode (AC3/EAC3/DTS → AAC)', checked: this.engine === 'transcode', onClick: () => { const pos = this.isLive ? 0 : this.currentTime(); this.current = { engine: 'transcode', mode: 'audio' }; this.start(this.current, pos); } });
    menuFrom(btnEl, items);
  }

  selectAudio(i, quiet) {
    this.audioIndex = i;
    const pos = this.isLive ? 0 : this.currentTime();
    const eng = this.engine === 'hlsRepack' ? { engine: 'hlsRepack' } : { engine: 'transcode', mode: this.current && this.current.mode === 'full' ? 'full' : 'audio' };
    this.current = eng;
    this.start(eng, pos).catch((e) => this.tryNext(e.message));
    if (!quiet) this.flash(`Audio track ${i + 1}`);
  }

  moreMenu(btnEl) {
    const v = this.video;
    const items = [];
    if (this.hls && this.hls.levels && this.hls.levels.length > 1) {
      items.push({ label: 'Quality: Auto', checked: this.hls.currentLevel === -1 && this.hls.autoLevelEnabled, onClick: () => { this.hls.currentLevel = -1; } });
      this.hls.levels.forEach((l, i) => items.push({ label: `Quality: ${l.height ? l.height + 'p' : Math.round(l.bitrate / 1000) + ' kbps'}`, checked: this.hls.currentLevel === i && !this.hls.autoLevelEnabled, onClick: () => { this.hls.currentLevel = i; } }));
      items.push('-');
    }
    const cn = this.cushion();
    items.push({ label: `Buffering: ${cn ? cn + ' s' : 'Auto'}`, icon: 'clock', onClick: () => menuFrom(btnEl, [
      { label: 'Hold more video in reserve to stop freezing', disabled: true },
      ...BUFFER_CHOICES.map((n) => ({ label: bufferLabel(n), checked: n === cn, onClick: () => this.setCushion(n) })),
    ]) });
    if (!this.isLive) {
      items.push({ label: `Speed: ${v.playbackRate}x`, icon: 'speed', onClick: () => menuFrom(btnEl, [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => ({ label: `${r}x`, checked: v.playbackRate === r, onClick: () => { v.playbackRate = r; v.preservesPitch = true; } }))) });
    }
    items.push(
      { label: `Aspect ratio: ${ASPECTS.find((a) => a.id === this.aspect).label}`, icon: 'ratio', onClick: () => menuFrom(btnEl, ASPECTS.map((a) => ({ label: a.label, checked: this.aspect === a.id, onClick: () => this.setAspect(a.id) }))) },
      CAPS.transcode === false ? null : { label: 'Deinterlace (for 1080i channels)', checked: !!this.deinterlace, onClick: () => { this.deinterlace = !this.deinterlace; this.current = { engine: 'transcode', mode: 'full' }; this.start(this.current, this.isLive ? 0 : this.currentTime()); } },
      { label: `Sleep timer${this.sleepAt ? ` (${Math.ceil((this.sleepAt - Date.now()) / 60000)} min left)` : ''}`, icon: 'sleep', onClick: () => menuFrom(btnEl, [0, 15, 30, 45, 60, 90, 120].map((m) => ({ label: m ? `${m} minutes` : 'Off', onClick: () => this.setSleep(m) }))) },
      CAPS.windowControls === false ? null : { label: 'Window size', icon: 'layout', onClick: () => menuFrom(btnEl, [[640, 360], [854, 480], [1280, 720], [1920, 1080]].map(([w, hh]) => ({ label: `${hh}p (${w}×${hh})`, onClick: () => api('setWindowSize', w, hh + (this.opts.isPopout ? 0 : 0)) }))) },
      !this.isLive && this.source && !this.source.file && this.source.item && ['movie', 'episode'].includes(this.source.item.type) && !this.offer ? { label: 'Download fully, then play from disk', icon: 'download', onClick: () => this.acceptOffer() } : null,
      CAPS.transcode === false ? null : { label: `Quality: ${(QUALITIES.find(([v]) => v === ((this.settings && this.settings.quality) || 'source')) || QUALITIES[0])[1].split(' (')[0]}`, icon: 'settings', onClick: () => menuFrom(btnEl, [{ label: 'Quality (remembered) — lower = less data for the player', disabled: true }, ...QUALITIES.map(([v, l]) => ({ label: l, checked: ((this.settings && this.settings.quality) || 'source') === v, onClick: () => this.setQuality(v) }))]) },
      { label: 'Stream info / statistics', icon: 'info', checked: this.statsOn, onClick: () => { this.statsOn = !this.statsOn; this.stats.classList.toggle('on', this.statsOn); this.renderStats(); } },
      CAPS.demo ? null : { label: 'Screenshot', icon: 'pip', onClick: () => this.screenshot() },
      this.source && this.source.url && !CAPS.demo ? { label: 'Open in external player (VLC, mpv…)', icon: 'external', onClick: () => api('external', this.source.url, this.source.headers, this.titleEl.textContent).catch(errToast) } : null,
      { label: 'Copy stream URL', icon: 'list', onClick: () => { navigator.clipboard.writeText((this.source && (this.source.url || this.source.file)) || ''); toast('Copied'); } },
      { label: 'Reload stream', icon: 'refresh', onClick: () => this.retry() });
    menuFrom(btnEl, items);
  }

  setSleep(min) {
    clearTimeout(this.sleepTimer);
    this.sleepAt = min ? Date.now() + min * 60000 : null;
    if (min) this.sleepTimer = setTimeout(() => { this.video.pause(); toast('Sleep timer: playback stopped'); this.sleepAt = null; }, min * 60000);
    this.flash(min ? `Sleep in ${min} min` : 'Sleep timer off');
  }

  renderStats() {
    if (!this.statsOn) return;
    const v = this.video;
    const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : {};
    const lines = [
      `Engine:     ${this.el.dataset.engine}`,
      `Resolution: ${v.videoWidth}×${v.videoHeight}`,
      `Quality:    ${this.settings && this.settings.quality && this.settings.quality !== 'source' ? `${this.settings.quality}p (re-encoded on this computer)` : 'original'}`,
      `Buffer:     ${this.bufferedAhead().toFixed(1)}s (reserve ${this.cushion() || 'auto'})`,
      ...(this.disk ? [`Disk:       ${(this.disk.have / 1048576).toFixed(0)} MB${this.disk.total ? ` of ${(this.disk.total / 1048576).toFixed(0)} MB` : ' (live)'}${this.disk.done ? ' · complete' : ''}`] : []),
      ...this.slowFeedDiag(),
      `Dropped:    ${q.droppedVideoFrames || 0} / ${q.totalVideoFrames || 0}`,
    ];
    if (this.mediaInfo) lines.push(`Codecs:     ${this.mediaInfo.videoCodec || '?'} / ${this.mediaInfo.audioCodec || '?'}`, `FPS:        ${this.mediaInfo.fps || '?'}`);
    if (this.hls && this.hls.levels[this.hls.currentLevel]) { const l = this.hls.levels[this.hls.currentLevel]; lines.push(`Bitrate:    ${Math.round(l.bitrate / 1000)} kbps`, `Codecs:     ${l.videoCodec || ''} ${l.audioCodec || ''}`); }
    if (this.probeInfo) lines.push(`Tracks:     ${this.probeInfo.audio.length} audio, ${this.probeInfo.subtitle.length} subs${this.probeInfo.hasCC ? ', CC' : ''}`);
    this.stats.textContent = lines.join('\n');
  }

  screenshot() {
    const v = this.video;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const a = h('a', { href: c.toDataURL('image/png'), download: `screenshot-${Date.now()}.png` });
    a.click();
  }

  recMenu(btnEl) {
    const s = this.source;
    if (!s || !s.pl) return;
    const dur = (m) => (m < 60 ? `${m} minutes` : `${Math.floor(m / 60)} hour${m >= 120 ? 's' : ''}${m % 60 ? ' 30 min' : ''}`);
    const steps = [];
    for (let m = 30; m <= 240; m += 30) steps.push(m);
    api('recordings').then(async (list) => {
      const active = list.find((r) => r.status === 'recording' && r.pl === s.pl && r.itemId === s.itemId);
      const { extendItems } = await import('../views/recordings.js');
      menuFrom(btnEl, [
        ...(active ? [{ label: `● Recording "${active.title}"`, disabled: true }, ...extendItems(active).slice(1).map((x) => ({ ...x, label: `Extend ${x.label}` })), '-'] : []),
        { label: 'Record current programme', icon: 'rec', onClick: () => api('recordNow', s.pl, s.itemId).then(() => toast('Recording started', 'success')).catch(errToast) },
        ...steps.map((m) => ({ label: `Record next ${dur(m)}`, icon: 'clock', onClick: () => api('recordNow', s.pl, s.itemId, m).then(() => toast(`Recording ${dur(m)}`, 'success')).catch(errToast) })),
      ]);
    }).catch(errToast);
  }

  async castMenu(btnEl) {
    if (CAPS.cast === 'none') { toast('Casting to a TV needs the installed MuchSmarter app (Windows, Mac, Linux, Android or iPhone).', 'info', 5000); return; }
    if (CAPS.cast === 'airplay') {
      if (this.video.webkitShowPlaybackTargetPicker) this.video.webkitShowPlaybackTargetPicker();
      else toast('Open Control Center → Screen Mirroring to use AirPlay.', 'info', 4000);
      return;
    }
    const m = menuFrom(btnEl, [{ label: 'Searching for TVs and Chromecasts…', disabled: true }]);
    const devices = await api('castDiscover');
    m.remove();
    const s = this.source;
    menuFrom(btnEl, [
      ...devices.map((d) => ({ label: `${d.name}`, hint: d.kind === 'chromecast' ? 'Chromecast' : 'DLNA', icon: 'cast', onClick: () => this.castTo(d) })),
      devices.length ? null : { label: 'No devices found on your network', disabled: true },
      '-',
      { label: 'Stop casting', icon: 'stop', onClick: () => api('castStop') },
      { label: 'Tip: AirPlay — use macOS Screen Mirroring with the pop-out player', disabled: true },
    ]);
    this.castSource = s;
  }

  async castTo(dev) {
    const s = this.source;
    try {
      const subs = this.textTracks.map((t) => ({ url: t.url, label: t.label, lang: t.lang }));
      await api('castPlay', dev.id, { url: s.url, headers: s.headers, file: s.file, title: this.titleEl.textContent, image: s.item && s.item.logo, live: this.isLive, startTime: this.isLive ? 0 : this.currentTime(), subtitles: subs });
      this.video.pause();
      toast(`Casting to ${dev.name}`, 'success');
    } catch (e) { errToast(e); }
  }

  onKey(e) {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    const k = e.key;
    const handled = () => { e.preventDefault(); e.stopPropagation(); this.poke(); };
    if (k === ' ' || k === 'k') { this.togglePlay(); handled(); }
    else if (k === 'f') { this.toggleFullscreen(); handled(); }
    else if (k === 'm') { this.toggleMute(); handled(); }
    else if (k === 'c') { const tr = this.allTracks(); if (this.activeText >= 0) this.selectText(-1); else if (tr.length) this.selectText(tr[0].index); else if (this.isLive) this.enableLiveCC(); handled(); }
    else if (k === 'p') { this.togglePip(); handled(); }
    else if (k === 'r') { this.restartHere(); handled(); }
    else if (k === 'i') { this.statsOn = !this.statsOn; this.stats.classList.toggle('on', this.statsOn); this.renderStats(); handled(); }
    else if (k === 'ArrowLeft') { this.skip(-10); handled(); }
    else if (k === 'ArrowRight') { this.skip(e.shiftKey ? 60 : 30); handled(); }
    else if (k === 'ArrowUp') { this.setVolume(this.video.volume + 0.05); handled(); }
    else if (k === 'ArrowDown') { this.setVolume(this.video.volume - 0.05); handled(); }
    else if ((k === 'PageUp' || k === 'ChannelUp') && this.opts.onPrev) { this.opts.onPrev(); handled(); }
    else if ((k === 'PageDown' || k === 'ChannelDown') && this.opts.onNext) { this.opts.onNext(); handled(); }
    else if (k === 'a') { const i = ASPECTS.findIndex((x) => x.id === this.aspect); this.setAspect(ASPECTS[(i + 1) % ASPECTS.length].id); handled(); }
    else if (k === 'Escape' && this.isFullscreen()) { if (this.windowFull) this.setWindowFull(false); else document.exitFullscreen(); handled(); }
  }
}

function clear(el) { el.replaceChildren(); }

// "eng" / "es" → "English" / "Spanish" (in the computer's own language).
function langName(code) {
  if (!code || code === 'und') return '';
  const map = { eng: 'en', spa: 'es', fre: 'fr', fra: 'fr', ger: 'de', deu: 'de', ita: 'it', por: 'pt', rus: 'ru', jpn: 'ja', kor: 'ko', chi: 'zh', zho: 'zh', ara: 'ar', hin: 'hi', tur: 'tr', pol: 'pl', dut: 'nl', nld: 'nl', gre: 'el', ell: 'el', heb: 'he', swe: 'sv', nor: 'no', dan: 'da', fin: 'fi' };
  try { return new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of(map[code] || code) || code; } catch (_) { return code; }
}

// Caption appearance editor (FCC-style options: size, font, colours, opacity, edge, position).
export function captionStyleDialog(settings) {
  const c = { ...settings.captions };
  const preview = h('div.cap-preview', h('div.pv-captions', h('div.cue', 'This is how captions will look.')));
  const pv = preview.firstChild;
  const update = () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.bg.slice(i, i + 2), 16));
    pv.style.setProperty('--cap-size', `${c.size / 100 * 22}px`);
    pv.style.setProperty('--cap-color', c.color);
    pv.style.setProperty('--cap-bg', `rgba(${r},${g},${b},${c.bgOpacity})`);
    pv.style.setProperty('--cap-font', c.font);
    pv.style.setProperty('--cap-weight', c.bold ? '700' : '400');
    pv.dataset.edge = c.edge;
    pv.dataset.pos = 'bottom';
  };
  const field = (label, input) => h('label.field', h('span', label), input);
  const sel = (key, opts) => h('select.input', { onchange: (e) => { c[key] = e.target.value; update(); } }, opts.map(([v, l]) => h('option', { value: v, selected: String(c[key]) === String(v) }, l)));
  const body = h('div.cap-form',
    preview,
    h('div.form-grid',
      field('Text size', h('input', { type: 'range', min: 50, max: 250, step: 5, value: c.size, oninput: (e) => { c.size = Number(e.target.value); update(); } })),
      field('Font', sel('font', [['sans-serif', 'Sans serif'], ['serif', 'Serif'], ['monospace', 'Monospace'], ['"Comic Sans MS", cursive', 'Casual'], ['cursive', 'Script'], ['"Arial Narrow", sans-serif', 'Condensed'], ['Verdana, sans-serif', 'Large x-height (easy reading)']])),
      field('Text colour', h('input', { type: 'color', value: c.color, oninput: (e) => { c.color = e.target.value; update(); } })),
      field('Background colour', h('input', { type: 'color', value: c.bg, oninput: (e) => { c.bg = e.target.value; update(); } })),
      field('Background opacity', h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: c.bgOpacity, oninput: (e) => { c.bgOpacity = Number(e.target.value); update(); } })),
      field('Character edge', sel('edge', [['none', 'None'], ['outline', 'Outline'], ['shadow', 'Drop shadow'], ['raised', 'Raised'], ['depressed', 'Depressed']])),
      field('Position', sel('position', [['bottom', 'Bottom'], ['top', 'Top']])),
      field('Bold text', h('input', { type: 'checkbox', checked: c.bold, onchange: (e) => { c.bold = e.target.checked; update(); } })),
      field('Live TV closed captions', sel('ccMode', [['auto', 'When captions are on, use CC-capable mode'], ['off', 'Never (lowest latency)']])),
    ));
  update();
  modal('Caption style', body, {
    wide: true,
    actions: [
      { label: 'Reset', onClick: () => api('setSettings', { captions: { enabled: c.enabled } }) },
      { label: 'Save', primary: true, onClick: () => api('setSettings', { captions: c }) },
    ],
  });
}

export { fmtTime };
