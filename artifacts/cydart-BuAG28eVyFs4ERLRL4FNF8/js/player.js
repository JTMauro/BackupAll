/* CydArt video player: plays any video (CP.media.playable) with full controls.
   Used by the Video tab, CydArt Lite and the Library viewer. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util, el = U.el, M = CP.media;
  const ICON = {
    play: 'M7 5v14l12-7z', pause: 'M7 5h4v14H7zM13 5h4v14h-4z', back: 'M11 7l-6 5 6 5zM19 7l-6 5 6 5z', fwd: 'M13 7l6 5-6 5zM5 7l6 5-6 5z',
    vol: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11', mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
    full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', pip: 'M3 5h18v14H3zM12 12h7v5h-7z', loop: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
    snap: 'M4 7h3l2-2h6l2 2h3v12H4zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z', step: 'M6 5v14M10 5l9 7-9 7z', stepb: 'M18 5v14M14 5l-9 7 9 7z', edit: 'M4 20h4L19 9l-4-4L4 16z',
  };
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

  class Player {
    constructor(host, opts = {}) {
      this.opts = opts; this.host = host; this.ab = null; this.fps = 30;
      this.root = el('div', { class: 'vp', tabindex: '0', role: 'region', 'aria-label': 'Video player' });
      this.video = el('video', { class: 'vp-video', playsinline: true, preload: 'auto' });
      this.msg = el('div', { class: 'vp-msg', hidden: true });
      this.big = el('button', { class: 'vp-big', type: 'button', 'aria-label': 'Play', html: svg(ICON.play) });
      const b = (k, label, fn, extra = '') => { const x = el('button', { class: 'vp-btn ' + extra, type: 'button', 'aria-label': label, title: label, html: svg(ICON[k]) }); x.onclick = fn; return x; };
      this.bPlay = b('play', 'Play (Space)', () => this.toggle());
      this.seek = el('input', { class: 'vp-seek', type: 'range', min: 0, max: 1000, value: 0, step: 1, 'aria-label': 'Seek' });
      this.time = el('span', { class: 'vp-time' }, '0:00 / 0:00');
      this.bMute = b('vol', 'Mute (M)', () => { this.video.muted = !this.video.muted; this.sync(); });
      this.vol = el('input', { class: 'vp-vol', type: 'range', min: 0, max: 1, step: 0.05, value: 1, 'aria-label': 'Volume' });
      this.speed = el('select', { class: 'vp-speed', 'aria-label': 'Speed', title: 'Playback speed' }, [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((s) => el('option', { value: s, selected: s === 1 }, s + '×')));
      this.bLoop = b('loop', 'Loop', () => { this.video.loop = !this.video.loop; this.bLoop.classList.toggle('on', this.video.loop); });
      this.bAB = el('button', { class: 'vp-btn vp-ab', type: 'button', title: 'A–B repeat: set start, then end, then clear' }, 'A–B');
      this.bAB.onclick = () => this.cycleAB();
      const tools = [b('stepb', 'Previous frame (,)', () => this.step(-1)), b('step', 'Next frame (.)', () => this.step(1)), this.bLoop, this.bAB, b('snap', 'Snapshot', () => this.snapshot())];
      if (document.pictureInPictureEnabled) tools.push(b('pip', 'Picture in picture', () => this.pip()));
      if (opts.onEdit) tools.push(b('edit', 'Edit in the Video editor', () => opts.onEdit(this.current)));
      tools.push(b('full', 'Full screen (F)', () => this.fullscreen()));
      this.bar = el('div', { class: 'vp-bar' }, this.seek, el('div', { class: 'vp-row' }, this.bPlay, b('back', 'Back 5 s (←)', () => this.jump(-5)), b('fwd', 'Forward 5 s (→)', () => this.jump(5)), this.time, el('span', { class: 'vp-sp' }), this.bMute, this.vol, this.speed, ...tools));
      this.root.append(this.video, this.msg, this.big, this.bar);
      host.append(this.root);
      this.wire();
    }
    wire() {
      const v = this.video;
      ['play', 'pause', 'timeupdate', 'durationchange', 'volumechange', 'ratechange', 'loadedmetadata'].forEach((ev) => v.addEventListener(ev, () => this.sync()));
      v.addEventListener('timeupdate', () => { if (this.ab && this.ab.b != null && v.currentTime >= this.ab.b) v.currentTime = this.ab.a; });
      v.addEventListener('ended', () => { this.sync(); this.opts.onEnded && this.opts.onEnded(); });
      v.addEventListener('click', () => this.toggle());
      v.addEventListener('dblclick', () => this.fullscreen());
      this.big.onclick = () => this.toggle();
      this.seek.oninput = () => { if (isFinite(v.duration)) v.currentTime = this.seek.value / 1000 * v.duration; };
      this.vol.oninput = () => { v.volume = +this.vol.value; v.muted = v.volume === 0; };
      this.speed.onchange = () => { v.playbackRate = +this.speed.value; };
      this.root.addEventListener('keydown', (e) => this.key(e));
      let idle; this.root.addEventListener('pointermove', () => { this.root.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => { if (!v.paused) this.root.classList.add('idle'); }, 2500); });
    }
    key(e) {
      if (e.target.closest && e.target.closest('input, select')) { if (e.key !== ' ') return; }
      const v = this.video, k = e.key;
      const map = { ' ': () => this.toggle(), k: () => this.toggle(), ArrowLeft: () => this.jump(-5), ArrowRight: () => this.jump(5), j: () => this.jump(-10), l: () => this.jump(10),
        ArrowUp: () => { v.volume = Math.min(1, v.volume + 0.1); }, ArrowDown: () => { v.volume = Math.max(0, v.volume - 0.1); }, m: () => { v.muted = !v.muted; }, f: () => this.fullscreen(),
        ',': () => this.step(-1), '.': () => this.step(1), Home: () => { v.currentTime = 0; }, End: () => { v.currentTime = v.duration - 0.05; } };
      if (/^[0-9]$/.test(k) && isFinite(v.duration)) { v.currentTime = v.duration * (+k / 10); e.preventDefault(); return; }
      const fn = map[k] || map[k.toLowerCase && k.toLowerCase()];
      if (fn) { e.preventDefault(); e.stopPropagation(); fn(); this.sync(); }
    }
    async load(file, name) {
      name = name || file.name || 'video';
      this.current = { file, name }; this.ab = null; this.bAB.textContent = 'A–B'; this.bAB.classList.remove('on');
      this.msg.hidden = false; this.msg.textContent = 'Opening ' + name + '…';
      const tok = (this.tok = {});
      try {
        const src = await M.playable(file, name);
        if (this.tok !== tok) { URL.revokeObjectURL(src.url); return; }
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = src.url; this.current.src = src;
        this.video.src = src.url; this.msg.hidden = true;
        if (src.converted) CP.ui.toast('Converted ' + name + ' for playback', 3000);
        if (this.opts.autoplay !== false) this.video.play().catch(() => {});
      } catch (e) { this.msg.textContent = `Couldn't play ${name}: ${e.message || e}`; }
      this.sync();
    }
    toggle() { const v = this.video; if (!v.src) return; v.paused || v.ended ? v.play().catch(() => {}) : v.pause(); }
    jump(s) { const v = this.video; v.currentTime = U.clamp(v.currentTime + s, 0, v.duration || 0); }
    step(n) { const v = this.video; v.pause(); v.currentTime = U.clamp(v.currentTime + n / this.fps, 0, v.duration || 0); }
    cycleAB() {
      const v = this.video;
      if (!this.ab) { this.ab = { a: v.currentTime, b: null }; this.bAB.textContent = 'A–?'; this.bAB.classList.add('on'); CP.ui.toast('Repeat start set. Press A–B again at the end point.'); }
      else if (this.ab.b == null) { if (v.currentTime > this.ab.a + 0.2) { this.ab.b = v.currentTime; this.bAB.textContent = 'A–B ✓'; v.currentTime = this.ab.a; v.play().catch(() => {}); } }
      else { this.ab = null; this.bAB.textContent = 'A–B'; this.bAB.classList.remove('on'); }
    }
    snapshot() {
      const v = this.video; if (!v.videoWidth) return;
      const c = M.frameOf(v), name = U.baseName(this.current ? this.current.name : 'video') + ' ' + M.fmtTime(v.currentTime).replace(/:/g, '-');
      const items = [['Save as PNG', () => c.toBlob((b) => U.download(b, name + '.png'), 'image/png')], ['Copy image', () => c.toBlob((b) => navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(() => CP.ui.toast('Copied'), () => CP.ui.toast('Copying is not available here')), 'image/png')]];
      items.unshift(['Save as picture (any format)…', () => M.saveFrameDialog(c, name)]);
      if (this.opts.onSnapshot) items.unshift(['Edit frame in Photo', () => this.opts.onSnapshot(c, name)]);
      const r = this.root.querySelector('.vp-btn[aria-label="Snapshot"]').getBoundingClientRect();
      CP.ui.contextMenu(r.left, r.top - 150, items);
    }
    pip() { const v = this.video; (document.pictureInPictureElement ? document.exitPictureInPicture() : v.requestPictureInPicture()).catch(() => CP.ui.toast('Picture in picture is not available here')); }
    fullscreen() { document.fullscreenElement ? document.exitFullscreen().catch(() => {}) : this.root.requestFullscreen && this.root.requestFullscreen().catch(() => CP.ui.toast('Full screen is not available here')); }
    sync() {
      const v = this.video, d = v.duration || 0;
      this.bPlay.innerHTML = svg(v.paused ? ICON.play : ICON.pause); this.bPlay.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
      this.big.hidden = !v.paused || !v.src; this.root.classList.toggle('paused', v.paused);
      if (document.activeElement !== this.seek) this.seek.value = d ? Math.round(v.currentTime / d * 1000) : 0;
      this.seek.style.setProperty('--p', (d ? v.currentTime / d * 100 : 0) + '%');
      this.time.textContent = M.fmtTime(v.currentTime) + ' / ' + M.fmtTime(d);
      this.bMute.innerHTML = svg(v.muted || v.volume === 0 ? ICON.mute : ICON.vol); this.vol.value = v.muted ? 0 : v.volume;
      if (+this.speed.value !== v.playbackRate) this.speed.value = v.playbackRate;
    }
    stop() { this.video.pause(); }
    destroy() { this.tok = null; this.video.pause(); this.video.removeAttribute('src'); this.video.load(); if (this.url) URL.revokeObjectURL(this.url); this.root.remove(); }
  }
  CP.Player = Player;
})(window.CP);
