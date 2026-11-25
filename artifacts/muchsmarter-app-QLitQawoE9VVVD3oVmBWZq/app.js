// App shell: sidebar, top bar, routing, the shared player, and parental locks.
import { h, clear, icon, api, toast, errToast, prompt, debounce, setTimeFormat, menuFrom, modal } from './lib/dom.js';
import { Player } from './player/player.js';
import { applyColors, watchSystemColors, setBackgroundImage } from './lib/theme.js';
import { offerRestore, watchForChanges, watchExit } from './lib/backup.js';

const ROUTES = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'live', label: 'Live TV', icon: 'tv' },
  { id: 'movies', label: 'Movies', icon: 'film' },
  { id: 'series', label: 'Series', icon: 'series' },
  { id: 'guide', label: 'TV Guide', icon: 'guide' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'favorites', label: 'Favorites', icon: 'star' },
  { id: 'history', label: 'Recently Viewed', icon: 'history' },
  { id: 'recordings', label: 'Recordings', icon: 'rec' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
  { id: 'multiview', label: 'Multi-View', icon: 'grid' },
  { id: 'playlists', label: 'Playlists', icon: 'playlist' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const loaders = {
  home: () => import('./views/home.js'),
  live: () => import('./views/live.js'),
  movies: () => import('./views/vod.js'),
  series: () => import('./views/vod.js'),
  guide: () => import('./views/guide.js'),
  search: () => import('./views/search.js'),
  favorites: () => import('./views/library.js'),
  history: () => import('./views/library.js'),
  recordings: () => import('./views/recordings.js'),
  downloads: () => import('./views/downloads.js'),
  multiview: () => import('./views/multiview.js'),
  playlists: () => import('./views/playlists.js'),
  settings: () => import('./views/settings.js'),
};

export const app = {
  route: null,
  params: {},
  pl: localStorage.getItem('playlist') || null,
  playlists: [],
  summary: null,
  settings: null,
  unlocked: new Set(),
  cleanup: null,
  player: null,
  playerMode: 'none', // inline | theater | mini | none
  nowPlaying: null,
  queue: null, // { list, index } for next/prev

  async init() {
    this.settings = await api('getSettings');
    if (window.__msBooted) window.__msBooted(); // phones: the app answered - remove the "Starting…" screen
    applyTheme(this.settings);
    watchSystemColors();
    if (this.settings.bgImage) api('backgroundImage').then((u) => setBackgroundImage(u)).catch(() => {});
    window.api.on('settings', (s) => { this.settings = s; applyTheme(s); });
    window.api.on('toast', (m) => toast(m));
    window.api.on('navigate', (r) => this.navigate(r));
    // Library download progress (big libraries are fetched category by category).
    window.api.on('catalog:progress', (p) => {
      let el = document.getElementById('cat-progress');
      if (p.kind === 'done') { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'cat-progress'; el.className = 'cat-progress'; document.body.appendChild(el); }
      const what = { live: 'channels', vod: 'movies', series: 'series' }[p.kind] || p.kind;
      el.textContent = p.total ? `Updating library - ${what}: category ${p.done} of ${p.total}` : `Updating library - ${what}…`;
      clearTimeout(this.catProgTimer);
      this.catProgTimer = setTimeout(() => el.remove(), 120000);
    });
    window.api.on('epg:status', (s) => { if (s.state === 'ready' && s.pl === this.pl) document.dispatchEvent(new CustomEvent('epg-ready')); });
    this.player = new Player({
      onPrev: () => this.step(-1),
      onNext: () => this.step(1),
      onEnded: () => { const q = this.queue; if (this.settings.autoplayNext && q && q.autoNext && q.index + 1 < q.list.length) this.step(1); },
      // Series "Up next": the following episode in the list (never wraps to episode 1).
      getNext: () => {
        const q = this.queue;
        if (!q || !q.autoNext || !this.nowPlaying || q.index + 1 >= q.list.length) return null;
        return { pl: this.nowPlaying.pl, item: q.list[q.index + 1] };
      },
      playNext: () => this.step(1),
      // Pre-buffering opens a 2nd connection: skip it on 1-connection subscriptions.
      canPreload: () => { const a = this.summary && this.summary.account; return !(a && Number(a.maxConnections) > 0 && Number(a.maxConnections) <= 1); },
      onClose: () => this.closePlayer(),
      onPopout: () => this.closePlayer(),
    });
    this.buildChrome();
    watchExit();
    // Tell the desktop app which video formats this PC decodes in hardware (for download prep).
    try {
      const ms = window.MediaSource;
      const ok = (t) => !!(ms && ms.isTypeSupported && ms.isTypeSupported(t));
      api('setMediaCaps', { hevc: ok('video/mp4; codecs="hvc1.1.6.L93.B0"'), av1: ok('video/mp4; codecs="av01.0.05M.08"'), vp9: ok('video/webm; codecs="vp9"') }).catch(() => {});
    } catch (_) { /* ignore */ }
    await this.refreshPlaylists();
    // Fresh install (or replaced portable copy): offer the backup from Documents\MuchSmarter Backups.
    if (!this.playlists.length && !(window.api.capabilities || {}).demo && (await offerRestore())) return;
    watchForChanges();
    if (this.pl && !this.playlists.some((p) => p.id === this.pl)) this.pl = null;
    if (!this.pl && this.playlists.length) this.pl = this.playlists[0].id;
    document.addEventListener('keydown', (e) => this.globalKeys(e));
    if (this.pl) await this.startupLoad();
    this.navigate(this.playlists.length ? (this.settings.startPage || 'home') : 'playlists');
  },

  // On start: ask whether to download a fresh library or keep using the saved one.
  async startupLoad() {
    const mode = this.settings.startupRefresh || 'ask';
    const age = await api('catalogAge', this.pl).catch(() => null);
    if (!age) { this.loadPlaylist(this.pl).catch(errToast); return; } // first run: must download
    if (mode === 'always') { this.loadPlaylist(this.pl, true).catch(errToast); return; }
    if (mode === 'never') { this.loadPlaylist(this.pl, false, { preferCache: true }).catch(errToast); return; }
    const name = (this.playlists.find((p) => p.id === this.pl) || {}).name || 'your playlist';
    const choice = await new Promise((resolve) => {
      let picked = null;
      const remember = h('input', { type: 'checkbox' });
      const m = modal('Update library?', h('div.startup-ask',
        h('p', `The channels, movies and series for “${name}” were last updated ${ago(age)}.`),
        h('p.muted', 'Updating gets new channels and titles from your provider; it can take a minute on big playlists. Continuing opens straight away with what you have.'),
        h('label.check-inline', remember, ' Remember my choice (change it in Settings → General)')), {
        actions: [
          { label: 'Continue with current library', onClick: () => { picked = 'continue'; } },
          { label: 'Update now', primary: true, onClick: () => { picked = 'update'; } },
        ],
        onClose: () => resolve({ picked: picked || 'continue', remember: remember.checked }),
      });
      setTimeout(() => m.el.querySelector('.modal-actions .btn.primary')?.focus(), 50);
    });
    if (choice.remember) this.settings = await api('setSettings', { startupRefresh: choice.picked === 'update' ? 'always' : 'never' });
    if (choice.picked === 'update') this.refreshCatalog();
    else this.loadPlaylist(this.pl, false, { preferCache: true }).catch(errToast);
  },

  async refreshPlaylists() {
    this.playlists = await api('playlists');
    this.renderPlaylistPicker();
  },

  // Re-download channels, movies, series and the TV guide for the current playlist.
  async refreshCatalog() {
    if (!this.pl) { toast('Add a playlist first', 'warn'); return; }
    toast('Refreshing catalog…', 'info', 1500);
    try {
      const s = await this.loadPlaylist(this.pl, true);
      api('refreshEpg', this.pl).then(() => document.dispatchEvent(new CustomEvent('epg-ready'))).catch(() => {});
      const miss = (s.failed || []).map((f) => ({ live: 'channels', movie: 'movies', series: 'series' }[f.type] || f.type));
      if (miss.length) toast(`Catalog refreshed, but the ${miss.join(' and ')} list couldn't be downloaded from your provider (${String((s.failed[0] || {}).error || '').slice(0, 80)}). Try Refresh again.`, 'error', 9000);
      else toast(`Catalog refreshed · ${s.counts.live} channels, ${s.counts.movie} movies, ${s.counts.series} series`, 'success', 4000);
      if (this.route !== 'home') this.navigate(this.route, this.params);
    } catch (e) { errToast(e); }
  },

  async loadPlaylist(id, force, opts) {
    this.pl = id;
    localStorage.setItem('playlist', id);
    this.renderPlaylistPicker();
    document.body.classList.add('busy');
    try {
      this.summary = await api('loadPlaylist', id, force, opts);
      document.dispatchEvent(new CustomEvent('playlist-loaded'));
    } finally {
      document.body.classList.remove('busy');
    }
    return this.summary;
  },

  buildChrome() {
    const side = document.getElementById('sidebar');
    clear(side,
      h('div.brand', h('div.logo', icon('logo', 24)), h('span', 'MuchSmarter')),
      h('div.nav', ROUTES.map((r) => h('button.nav-item', { 'data-route': r.id, title: r.label, onclick: () => this.navigate(r.id) }, icon(r.icon, 20), h('span', r.label)))),
      h('button.nav-item.collapse', { title: 'Collapse sidebar', onclick: () => document.body.classList.toggle('side-collapsed') }, icon('list', 20), h('span', 'Collapse')));
    // Phone-size screens: bottom tab bar (+ "More" for the rest of the sections).
    const TABS = ['home', 'live', 'movies', 'series', 'guide'];
    const tabbar = h('nav', { 'aria-label': 'Sections' },
      ROUTES.filter((r) => TABS.includes(r.id)).map((r) => h('button.tab-item', { 'data-route': r.id, onclick: () => this.navigate(r.id) }, icon(r.icon, 22), h('span', r.label === 'Live TV' ? 'Live' : r.label === 'TV Guide' ? 'Guide' : r.label))),
      h('button.tab-item', { 'data-route': 'more', onclick: (e) => menuFrom(e.currentTarget, ROUTES.filter((r) => !TABS.includes(r.id)).map((r) => ({ label: r.label, icon: r.icon, checked: this.route === r.id, onClick: () => this.navigate(r.id) }))) }, icon('more', 22), h('span', 'More')));
    tabbar.id = 'tabbar';
    document.getElementById('app').append(tabbar);
    // Turning a phone sideways while something plays goes full screen.
    if (document.body.classList.contains('mobile')) {
      matchMedia('(orientation: landscape)').addEventListener('change', (e) => {
        if (!this.player.source) return;
        if (e.matches && !document.fullscreenElement) this.player.el.requestFullscreen().catch(() => {});
        else if (!e.matches && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      });
    }
    const top = document.getElementById('topbar');
    this.plPicker = h('button.pl-picker', { onclick: (e) => this.playlistMenu(e.currentTarget) });
    this.searchBox = h('input.search', { type: 'search', placeholder: 'Search channels, movies, series…  (Ctrl+K)', oninput: debounce((e) => { if (e.target.value.trim().length > 1) this.navigate('search', { q: e.target.value.trim() }); }, 350) });
    const refreshBtn = h('button.icon-btn', { title: 'Refresh catalog (channels, movies, series & guide)', onclick: () => this.refreshCatalog() }, icon('refresh', 18));
    clear(top, this.plPicker, refreshBtn, this.searchBox, h('div.top-spacer'), h('div.clock'), h('div.top-status'));
    const tickClock = () => { top.querySelector('.clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: this.settings.timeFormat !== '24h' }); };
    tickClock();
    setInterval(tickClock, 15000);
    window.api.on('recordings', (list) => {
      const n = list.filter((r) => r.status === 'recording').length;
      const el = top.querySelector('.top-status');
      clear(el, n ? h('button.rec-pill', { onclick: () => this.navigate('recordings') }, icon('rec', 12), ` REC ${n}`) : null);
    });
    api('recordings').then((list) => { const n = list.filter((r) => r.status === 'recording').length; if (n) clear(top.querySelector('.top-status'), h('button.rec-pill', { onclick: () => this.navigate('recordings') }, icon('rec', 12), ` REC ${n}`)); });
  },

  renderPlaylistPicker() {
    if (!this.plPicker) return;
    const cur = this.playlists.find((p) => p.id === this.pl);
    clear(this.plPicker, icon('playlist', 16), h('span', cur ? cur.name : 'Add a playlist'), icon('down', 14));
  },

  playlistMenu(el) {
    menuFrom(el, [
      ...this.playlists.map((p) => ({ label: p.name, hint: p.kind.toUpperCase(), checked: p.id === this.pl, onClick: () => this.loadPlaylist(p.id).then(() => this.navigate(this.route === 'playlists' ? 'home' : this.route, this.params)).catch(errToast) })),
      '-',
      { label: 'Refresh catalog', icon: 'refresh', disabled: !this.pl, onClick: () => this.refreshCatalog() },
      { label: 'Manage playlists…', icon: 'settings', onClick: () => this.navigate('playlists') },
    ]);
  },

  async navigate(route, params = {}) {
    if (!loaders[route]) route = 'home';
    if (this.cleanup) { try { this.cleanup(); } catch (_) { /* view gone */ } this.cleanup = null; }
    if (this.playerMode === 'inline') this.setPlayerMode(this.player.source ? 'mini' : 'none');
    this.route = route;
    this.params = params;
    const nav = (this.navId = (this.navId || 0) + 1);
    if (route !== 'home') document.body.classList.remove('launcher-3d');
    document.body.dataset.route = route;
    document.querySelectorAll('.nav-item, .tab-item').forEach((b) => b.classList.toggle('active', b.dataset.route === route));
    const view = document.getElementById('view');
    view.replaceChildren(h('div.view-loading', h('div.spinner')));
    view.scrollTop = 0;
    try {
      const mod = await loaders[route]();
      if (this.route !== route) return;
      view.replaceChildren();
      const done = (await mod.render(view, { app: this, route, params })) || null;
      // Left this screen while it was still loading (e.g. the 3D home): tidy it up now.
      if (nav !== this.navId) { try { done && done(); } catch (_) { /* view gone */ } if (this.route !== 'home') document.body.classList.remove('launcher-3d'); return; }
      this.cleanup = done;
    } catch (e) {
      console.error(e);
      clear(view, h('div.empty', h('h2', 'Something went wrong'), h('p', e.message)));
    }
  },

  // ---- Parental control -------------------------------------------------------
  async unlock(categoryId) {
    const key = `${this.pl}:${categoryId}`;
    if (!this.settings.parentalPin || !this.settings.lockedCategories.includes(key) || this.unlocked.has(key)) return true;
    const pin = await prompt('Parental lock', 'Enter PIN to open this category', '', { type: 'password' });
    if (pin == null) return false;
    if (await api('checkPin', pin)) { this.unlocked.add(key); return true; }
    toast('Wrong PIN', 'error');
    return false;
  },

  isLocked(categoryId) {
    const key = `${this.pl}:${categoryId}`;
    return !!this.settings.parentalPin && this.settings.lockedCategories.includes(key) && !this.unlocked.has(key);
  },

  // ---- Playback ------------------------------------------------------------------
  // where: 'inline' (into `host`), 'theater' (fills window), or current mode.
  async play(pl, item, { host, queue, catchup, autoNext, title, subtitle } = {}) {
    if (item.categoryId && !(await this.unlock(item.categoryId))) return;
    try {
      const info = await api('playInfo', pl, item.id, catchup ? { catchupStart: catchup.start, catchupMinutes: (catchup.stop - catchup.start) / 60000 } : {});
      // Provider subtitle links (e.g. from movie details) are converted to WebVTT locally.
      for (const s of item.subtitles || []) {
        if (s.url && !/^http:\/\/127\.0\.0\.1/.test(s.url)) info.subtitles.push({ label: s.label, url: await api('variant', { mode: 'extsubs', url: s.url }) });
      }
      this.nowPlaying = { pl, item };
      if (queue) this.queue = { ...queue, autoNext };
      if (host) {
        host.querySelectorAll('.player-placeholder').forEach((x) => x.remove());
        host.append(this.player.el);
        this.setPlayerMode('inline');
      } else if (this.playerMode !== 'mini') {
        document.getElementById('theater').append(this.player.el);
        this.setPlayerMode('theater');
      }
      const sub = subtitle || (catchup ? `Catch-up · ${catchup.title || ''}` : item.type === 'episode' ? `${item.seriesName || ''} · S${item.season}E${item.episode}` : '');
      await this.player.load({ ...info, pl, itemId: item.id, item: { ...info.item, ...item }, title: title || item.name, subtitle: sub, catchupStart: catchup && catchup.start });
      this.player.el.focus();
      document.dispatchEvent(new CustomEvent('now-playing', { detail: { pl, item } }));
    } catch (e) { errToast(e); }
  },

  async playFile(file, title, extra = {}) {
    document.getElementById('theater').append(this.player.el);
    this.setPlayerMode('theater');
    this.queue = null;
    this.nowPlaying = null;
    await this.player.load({ file, title, item: { type: 'file', name: title }, subtitles: extra.subtitles || [], resume: extra.resume });
    this.player.el.focus();
  },

  step(dir) {
    const q = this.queue;
    if (!q || !q.list.length) return;
    q.index = (q.index + dir + q.list.length) % q.list.length;
    const item = q.list[q.index];
    const host = this.playerMode === 'inline' ? this.player.el.parentElement : null;
    this.play(this.nowPlaying.pl, item, { host });
    document.dispatchEvent(new CustomEvent('queue-step', { detail: { item, index: q.index } }));
  },

  setPlayerMode(mode) {
    const th = document.getElementById('theater');
    const el = this.player.el;
    this.playerMode = mode;
    th.hidden = mode !== 'theater' && mode !== 'mini';
    th.classList.toggle('mini', mode === 'mini');
    if (mode === 'mini' && el.parentElement !== th) {
      th.append(el);
      this.player.play();
    }
    if (mode === 'theater' || mode === 'mini') {
      clear(th.querySelector('.th-bar') ? th.querySelector('.th-bar') : th.appendChild(h('div.th-bar')));
      const bar = th.querySelector('.th-bar');
      bar.append(
        h('button.th-btn', { title: mode === 'mini' ? 'Expand' : 'Shrink to mini player (keep browsing)', onclick: () => this.setPlayerMode(mode === 'mini' ? 'theater' : 'mini') }, icon(mode === 'mini' ? 'full' : 'mini', 16)),
        h('button.th-btn', { title: 'Close', onclick: () => this.closePlayer() }, icon('x', 16)));
      if (mode === 'mini') this.makeDraggable(th, bar);
      else { th.style.left = th.style.top = th.style.width = th.style.height = ''; }
    }
    if (mode === 'none') { th.hidden = true; }
    document.body.dataset.player = mode;
  },

  makeDraggable(box, handle) {
    if (box.dataset.drag) return;
    box.dataset.drag = '1';
    handle.addEventListener('pointerdown', (e) => {
      if (this.playerMode !== 'mini' || e.target.closest('button')) return;
      const r = box.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      const move = (ev) => {
        box.style.left = Math.max(0, Math.min(innerWidth - r.width, ev.clientX - dx)) + 'px';
        box.style.top = Math.max(0, Math.min(innerHeight - r.height, ev.clientY - dy)) + 'px';
        box.style.right = box.style.bottom = 'auto';
      };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
    });
  },

  closePlayer() {
    this.player.stop();
    this.player.resetUpNextSession();
    this.player.el.remove();
    this.nowPlaying = null;
    this.setPlayerMode('none');
  },

  globalKeys(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.searchBox.focus(); this.searchBox.select(); return; }
    if (e.key === 'Escape' && this.player.isFullscreen() && !document.querySelector('.modal-back, .ctx-menu')) { this.player.toggleFullscreen(); return; }
    if (e.key === 'Escape' && this.playerMode === 'theater' && !document.fullscreenElement && !document.querySelector('.modal-back')) { this.setPlayerMode('mini'); return; }
    // Forward player shortcuts when the player is visible and nothing else has focus.
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (this.player.source && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && !this.player.el.contains(document.activeElement) && this.playerMode !== 'none') {
      if ([' ', 'f', 'm', 'c', 'PageUp', 'PageDown'].includes(e.key)) this.player.onKey(e);
    }
  },
};

function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} minutes ago`;
  const hrs = Math.round(m / 60);
  if (hrs < 48) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return `${Math.round(hrs / 24)} days ago (${new Date(ms).toLocaleDateString()})`;
}

export function applyTheme(s) {
  setTimeFormat(s.timeFormat);
  applyColors(s);
}

// Android back button: close the top-most thing; return false to let the OS background the app.
window.__msBack = () => {
  const modalClose = document.querySelector('.modal-back .modal-head .icon-btn');
  if (modalClose) { modalClose.click(); return true; }
  const ctx = document.querySelector('.ctx-menu');
  if (ctx) { ctx.remove(); return true; }
  if (app.player && app.player.windowFull) { app.player.setWindowFull(false); return true; }
  if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return true; }
  if (app.playerMode === 'theater') { app.setPlayerMode('mini'); return true; }
  if (app.params && app.params.details) { app.navigate(app.route); return true; }
  if (app.route !== 'home') { app.navigate('home'); return true; }
  return false;
};

app.init().catch((e) => { console.error(e); errToast(e); });
window.app = app;
