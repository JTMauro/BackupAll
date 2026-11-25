/* CydArt app shell: Home / Photo / Draw, About + version, theme, install, file handling. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util, el = U.el, $ = (s) => document.querySelector(s);

  const store = { get(k, d) { try { const v = localStorage.getItem('cp-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('cp-' + k, JSON.stringify(v)); } catch (e) {} } };
  CP.prefs = Object.assign({ autoLibrary: true, wheelZoom: false, useSavePicker: false, skipIntro: false }, store.get('prefs', {}));
  CP.savePrefs = () => store.set('prefs', CP.prefs);

  const app = CP.app = { mode: 'home', workspace: 'photo', photoSub: 'library' };
  app.PRESETS = [['HD 1920×1080', 1920, 1080], ['4K 3840×2160', 3840, 2160], ['Square 1080', 1080, 1080], ['Portrait 1080×1350', 1080, 1350], ['Story 1080×1920', 1080, 1920], ['Letter 2550×3300', 2550, 3300], ['A4 2480×3508', 2480, 3508], ['Icon 512', 512, 512], ['Pixel art 64', 64, 64]];
  app.inEditor = () => !$('#editor').hidden;

  /* ---------- modes ---------- */
  function showView(id) { ['home', 'library', 'editor', 'video'].forEach((v) => { $('#' + v).hidden = v !== id; }); if (id !== 'video' && CP.video && CP.video.leave) CP.video.leave(); }
  app.setMode = (mode, { sub } = {}) => {
    app.mode = mode;
    document.body.classList.toggle('mode-home', mode === 'home');
    $('#tab-photo').setAttribute('aria-selected', mode === 'photo'); $('#tab-draw').setAttribute('aria-selected', mode === 'draw'); $('#tab-video').setAttribute('aria-selected', mode === 'video');
    $('#photo-sub').hidden = mode !== 'photo'; $('#video-sub').hidden = mode !== 'video';
    CP.ui.closeMenu();
    if (mode === 'home') { showView('home'); renderRecent(); CP.emit('scene', 'home'); return; }
    CP.emit('scene', 'hidden');
    if (mode === 'video') { showView('video'); CP.video.show(sub); store.set('lastMode', mode); return; }
    if (mode === 'photo') {
      app.photoSub = sub || app.photoSub || 'library';
      $('#sub-library').classList.toggle('on', app.photoSub === 'library'); $('#sub-editor').classList.toggle('on', app.photoSub === 'editor');
      if (app.photoSub === 'library') showView('library'); else { app.setWorkspace('photo'); showView('editor'); CP.requestRender(true); }
    } else { app.setWorkspace('draw'); showView('editor'); CP.requestRender(true); if (!CP.docs.length && !app._creating) setTimeout(() => { if (!CP.docs.length && app.mode === 'draw' && !document.querySelector('.dlg-back')) CP.newDocDialog(); }, 60); }
    store.set('lastMode', mode);
  };
  app.openEditor = (mode = 'photo') => { if (mode === 'draw') app.setMode('draw'); else app.setMode('photo', { sub: 'editor' }); };
  app.setWorkspace = (ws) => {
    if (app.workspace === ws && $('#panels').childElementCount) return;
    app.workspace = ws; CP.editorWorkspaceChanged();
    const t = CP.tools.current;
    if (ws === 'photo' && t && ['brush', 'pencil', 'airbrush'].includes(t.id) && !CP.doc) CP.selectTool('move');
  };
  app.createDoc = (w, h, bg = 'white', name = 'Untitled') => {
    w = U.clamp(Math.round(w) || 1920, 1, 20000); h = U.clamp(Math.round(h) || 1080, 1, 20000);
    const d = new CP.Doc(w, h, name || 'Untitled'); const l = d.addLayer('Background');
    if (bg !== 'transparent') { l.ctx.fillStyle = bg === 'bg' ? CP.colors.bg : bg; l.ctx.fillRect(0, 0, w, h); }
    if (bg === 'transparent' || w * h <= 4096) {} // keep
    d.commit('New'); d.saved = true;
    app._creating = true;
    if (app.mode !== 'draw' && !(app.mode === 'photo' && app.photoSub === 'editor')) app.setMode('draw');
    app._creating = false;
    CP.addDoc(d); CP.selectTool('brush');
  };

  /* videos and audio open in the Video tab (player for one or more, editor when already editing) */
  CP.routeMedia = (files) => {
    const media = files.filter((f) => CP.media.isMedia(f.name, f.type)); if (!media.length) return false;
    skipIntroNow();
    const edit = app.mode === 'video' && CP.video.sub === 'editor';
    app.setMode('video', { sub: edit ? 'editor' : 'player' }); CP.video.openFiles(media, { edit });
    const rest = files.filter((f) => !media.includes(f)); if (rest.length) CP.openFiles(rest, { toLibrary: false });
    return true;
  };

  /* ---------- home ---------- */
  function buildHome() {
    const tabs = [$('#ht-photo'), $('#ht-draw'), $('#ht-video')];
    const pick = (which) => {
      tabs.forEach((t) => { const on = t.dataset.start === which; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
      $('#hp-photo').hidden = which !== 'photo'; $('#hp-draw').hidden = which !== 'draw'; $('#hp-video').hidden = which !== 'video'; store.set('homeTab', which); CP.emit('scene-tab', which);
    };
    tabs.forEach((t) => { t.onclick = () => pick(t.dataset.start); t.onkeydown = (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const i = tabs.indexOf(t), o = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; o.focus(); pick(o.dataset.start); } }; });
    pick(store.get('homeTab', 'photo'));
    $('#h-open-photo').onclick = async () => { const f = await CP.ui.pickFiles({ multiple: true }); if (f.length) { app.setMode('photo', { sub: 'editor' }); CP.openFiles(f); } };
    $('#h-library').onclick = () => app.setMode('photo', { sub: 'library' });
    $('#h-import').onclick = async () => { const f = await CP.ui.pickFiles({ multiple: true }); if (f.length) { app.setMode('photo', { sub: 'library' }); CP.lib.addFiles(f); } };
    $('#h-custom').onclick = () => { app.setMode('draw'); };
    $('#h-paste').onclick = async () => { try { const items = await navigator.clipboard.read(); for (const it of items) { const t = it.types.find((x) => x.startsWith('image/')); if (t) { app.setMode('draw'); return CP.pasteBlob(await it.getType(t), true); } } CP.ui.toast('No image on the clipboard'); } catch (e) { CP.ui.toast('Press Ctrl+V (⌘V) to paste an image'); } };
    $('#h-open-draw').onclick = async () => { const f = await CP.ui.pickFiles({ multiple: true }); if (f.length) { app.setMode('draw'); CP.openFiles(f, { toLibrary: false }); } };
    $('#h-play-video').onclick = async () => { const f = await CP.ui.pickFiles({ multiple: true, accept: CP.media.ACCEPT }); if (f.length) { app.setMode('video', { sub: 'player' }); CP.video.openFiles(f); } };
    $('#h-new-video').onclick = () => app.setMode('video', { sub: 'editor' });
    $('#h-convert').onclick = $('#h-convert-video').onclick = () => CP.converter.open();
    $('#h-edit-video').onclick = async () => { const f = await CP.ui.pickFiles({ multiple: true, accept: CP.media.ACCEPT + ',image/*' }); if (f.length) { app.setMode('video', { sub: 'editor' }); CP.video.openFiles(f, { edit: true }); } };
    const pr = $('#draw-presets');
    [['Blank 1920×1080', 1920, 1080, 'white'], ['Square 1080', 1080, 1080, 'white'], ['Transparent 1024', 1024, 1024, 'transparent'], ['Story 1080×1920', 1080, 1920, 'white'], ['Pixel art 64×64', 64, 64, 'transparent'], ['Letter page', 2550, 3300, 'white']].forEach(([n, w, h, bg]) => {
      const s = 36 / Math.max(w, h);
      const b = el('button', { class: 'big-btn raised preset', type: 'button' }, el('span', { class: 'preset-shape', style: { width: Math.round(w * s) + 'px', height: Math.round(h * s) + 'px' } }), el('b', {}, n), el('span', {}, bg === 'transparent' ? 'Transparent background' : `${w} × ${h}`));
      b.onclick = () => app.createDoc(w, h, bg, n.split(' ')[0]); pr.append(b);
    });
    $('#home-version').textContent = `CydArt v${CP.VERSION}`;
    $('#home-about').onclick = () => app.about();
  }
  async function renderRecent() {
    const box = $('#home-recent'); if (!box) return; box.innerHTML = '';
    const lc = $('#h-lib-count'); if (lc) lc.textContent = CP.lib.cache.length ? `${CP.lib.cache.length} photo${CP.lib.cache.length > 1 ? 's' : ''} · albums, favorites` : 'Albums, favorites, slideshow';
    const recent = CP.lib.cache.slice().sort((a, b) => b.modified - a.modified).slice(0, 12); if (!recent.length) return;
    box.append(el('p', { class: 'home-recent-label' }, 'Recent'));
    for (const r of recent) {
      const img = el('img', { alt: '' }); const b = el('button', { class: 'rt', type: 'button', 'aria-label': 'Open ' + r.name, title: r.name }, img);
      b.onclick = () => CP.lib.openInEditor(r, 'photo'); box.append(b);
      CP.lib.thumbURL(r.id).then((u) => (img.src = u));
    }
    box.style.flexWrap = 'wrap';
  }

  /* ---------- about (version + changelog) ---------- */
  app.about = () => {
    const log = el('div', { class: 'changelog' }, el('h3', { style: { margin: '0', fontSize: '14px' } }, "What's new"),
      ...CP.CHANGELOG.map((c) => el('div', {}, el('h4', {}, `Version ${c.version} · ${c.date}`), el('ul', {}, c.notes.map((n) => el('li', {}, n))))));
    const installed = CP.desktop || matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const prefs = el('div', { class: 'stack', style: { marginTop: '14px' } },
      prefCheck('autoLibrary', 'Add photos opened in Photo to my Library'),
      prefCheck('wheelZoom', 'Mouse wheel zooms (instead of scrolling)'),
      window.showSaveFilePicker ? prefCheck('useSavePicker', 'Ask where to save files') : null,
      prefCheck('skipIntro', 'Skip the Cydni intro on start'));
    CP.ui.dialog({
      title: 'About CydArt', wide: true,
      body: el('div', {},
        el('div', { class: 'about-head' }, el('span', { class: 'brand-mark' }), el('div', {}, el('h3', {}, 'CydArt'), el('div', { class: 'muted' }, `Version ${CP.VERSION} · built ${CP.BUILD_DATE}`), el('div', { class: 'muted sm' }, CP.desktop ? 'Windows desktop app' : installed ? 'Running as an installed app' : 'Running in the browser'))),
        el('p', {}, 'Photo editor, paint studio, video editor, viewer and library in one. Opens 270+ image formats including HEIC/HEIF, camera RAW, TIFF and layered PSD, plays and edits video in MP4, MOV, MKV, AVI, WMV and more, and saves to 20+ formats. Your photos and videos stay on this device.'),
        el('p', { class: 'muted sm' }, 'Format engine: ImageMagick (WebAssembly, Apache-2.0). HEIC: libheif (LGPL-3.0). PSD: ag-psd (MIT). Camera data: exifr (MIT). 3D: three.js (MIT). Zip: fflate (MIT). Video: FFmpeg (LGPL/GPL), ffmpeg.wasm (MIT), mp4-muxer and webm-muxer (MIT).'),
        el('h3', { style: { fontSize: '14px', margin: '14px 0 0' } }, 'Settings'), prefs, log),
      buttons: [['Keyboard shortcuts', () => { setTimeout(() => CP.act.shortcuts(), 0); }], ['Replay intro', () => { setTimeout(() => CP.emit('replay-intro'), 50); }], ['Close', null, 'primary']],
    });
  };
  /* About menu (app bar + editor menubar) */
  app.aboutItems = () => [
    { head: `CydArt v${CP.VERSION}` },
    ['About CydArt', app.about], ["What's new (version history)", app.whatsNew], ['Convert photos & videos…', () => CP.converter.open()], CP.desktop ? null : ['Check for updates', app.checkUpdates], '-',
    ['Keyboard shortcuts', () => CP.act.shortcuts(), '?'], [CP.desktop ? 'Set as default photo app' : 'Install / set as default photo app', app.installHelp], ['Replay Cydni intro', () => CP.emit('replay-intro')],
    /claude|usercontent/.test(location.hostname) || CP.desktop ? null : ['Open CydArt Lite (viewer)', () => { location.href = 'lite/'; }],
    /claude|usercontent/.test(location.hostname) || CP.desktop ? null : ['Install guide', () => { location.href = 'install/'; }],
  ].filter(Boolean);
  app.whatsNew = () => CP.ui.dialog({ title: "What's new", wide: true, body: el('div', { class: 'changelog', style: { borderTop: '0', marginTop: '0', paddingTop: '0', maxHeight: 'none' } },
    ...CP.CHANGELOG.map((c) => el('div', {}, el('h4', {}, `Version ${c.version} · ${c.date}`), el('ul', {}, c.notes.map((n) => el('li', {}, n)))))) });
  const cmpVer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
  app.checkUpdates = async (quiet) => {
    try {
      const txt = await (await fetch('js/version.js?t=' + Date.now(), { cache: 'no-store' })).text();
      const m = txt.match(/CP\.VERSION\s*=\s*'([\d.]+)'/); if (!m) throw new Error('version not found');
      if (cmpVer(m[1], CP.VERSION) > 0) {
        try { const r = await navigator.serviceWorker.getRegistration(); r && r.update(); } catch (e) {}
        const t = CP.ui.toast(el('span', {}, `CydArt ${m[1]} is available. `, el('button', { class: 'linkish', type: 'button', onclick: () => location.reload() }, 'Reload to update')), 12000);
        return t;
      }
      if (!quiet) CP.ui.toast(`You have the latest version (${CP.VERSION})`);
    } catch (e) { if (!quiet) CP.ui.toast('Could not check for updates right now'); }
  };

  function prefCheck(key, label) { const c = el('input', { type: 'checkbox', checked: !!CP.prefs[key] }); c.onchange = () => { CP.prefs[key] = c.checked; CP.savePrefs(); }; return el('label', { class: 'opt' }, c, el('span', {}, label)); }

  /* ---------- theme ---------- */
  function initTheme() {
    const t = store.get('theme', null); if (t) document.documentElement.dataset.theme = t;
    $('#btn-theme').onclick = () => {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      const next = cur === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; store.set('theme', next); CP.requestRender();
    };
  }

  /* ---------- install + open-with (file handlers) ---------- */
  let deferredInstall = null;
  function initInstall() {
    if (!CP.desktop && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/claude|usercontent/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('#btn-install').hidden = false; });
    $('#btn-install').onclick = async () => {
      if (!deferredInstall) return installHelp();
      deferredInstall.prompt(); const r = await deferredInstall.userChoice; deferredInstall = null; $('#btn-install').hidden = true;
      if (r.outcome === 'accepted') setTimeout(installHelp, 600);
    };
    addEventListener('appinstalled', () => CP.ui.toast('CydArt installed. You can now set it as your default photo viewer.', 6000));
    // files opened from the OS ("Open with CydArt" / default app)
    if ('launchQueue' in window) {
      window.launchQueue.setConsumer(async (params) => {
        if (!params.files || !params.files.length) return;
        const files = await Promise.all(params.files.map((h) => h.getFile()));
        skipIntroNow();
        if (CP.routeMedia(files)) return;
        if (files.length === 1) { app.setMode('photo', { sub: 'editor' }); CP.openFiles(files, { toLibrary: false }); }
        else { app.setMode('photo', { sub: 'library' }); const recs = await CP.lib.addFiles(files); if (recs.length) CP.lib.viewer.open(recs, 0); }
      });
    }
  }
  function installHelp() {
    if (CP.desktop) return desktopDefaultsHelp();
    const isWin = /Win/.test(navigator.platform), isMac = /Mac/.test(navigator.platform);
    CP.ui.dialog({ title: 'Make CydArt your default photo app', body: el('div', { class: 'stack' },
      el('p', {}, 'After installing, CydArt shows up in "Open with" for photos (JPEG, PNG, HEIC, TIFF, RAW, PSD and more).'),
      isWin ? el('ol', {}, el('li', {}, 'Right-click any photo in File Explorer.'), el('li', {}, 'Choose Open with → Choose another app.'), el('li', {}, 'Pick CydArt and tick "Always use this app".'), el('li', {}, 'Or: Settings → Apps → Default apps → CydArt.'))
        : isMac ? el('ol', {}, el('li', {}, 'In Finder, select a photo and press ⌘I (Get Info).'), el('li', {}, 'Under "Open with", choose CydArt.'), el('li', {}, 'Click "Change All…" to use it for every file of that type.'))
          : el('ol', {}, el('li', {}, 'Open your file manager and right-click a photo.'), el('li', {}, 'Choose Open with → CydArt, and set it as the default.')),
      el('p', { class: 'muted sm' }, 'Install needs Chrome or Edge on a computer. On iPhone/iPad use Share → Add to Home Screen.')), buttons: [['Got it', null, 'primary']] });
  }
  app.installHelp = installHelp;
  function desktopDefaultsHelp() {
    CP.ui.dialog({ title: 'Make CydArt your default photo app', body: el('div', { class: 'stack' },
      el('p', {}, 'The installer registered CydArt and CydArt Lite for JPEG, PNG, HEIC, TIFF, RAW, PSD and more. Pick which one opens photos when you double-click:'),
      el('ol', {}, el('li', {}, 'Click "Open Default apps" below.'), el('li', {}, 'Search for CydArt Lite (for viewing) or CydArt (for editing).'), el('li', {}, 'Set it as the default for each photo type you use, or click "Set default" at the top.')),
      el('p', { class: 'muted sm' }, 'Or right-click any photo → Open with → Choose another app → pick the app and tick "Always".')),
      buttons: [['Close'], ['Open Default apps', () => { CP.desktopCall('defaults').catch(() => CP.ui.toast('Open Settings → Apps → Default apps')); }, 'primary']] });
  }
  /* desktop app: files from double-click / Open with / a second launch */
  CP.desktopOpenNow = async () => {
    try {
      const files = await CP.desktopFiles(); if (!files.length) return;
      skipIntroNow();
      if (CP.routeMedia(files)) return;
      if (files.length === 1) { app.setMode('photo', { sub: 'editor' }); CP.openFiles(files, { toLibrary: false }); }
      else { app.setMode('photo', { sub: 'library' }); const recs = await CP.lib.addFiles(files); if (recs.length) CP.lib.viewer.open(recs, 0); }
    } catch (e) { CP.ui.error('Could not open the file', e); }
  };

  /* ---------- global drag & drop + paste ---------- */
  function initDrop() {
    let depth = 0; const hint = $('#drop-hint');
    addEventListener('dragenter', (e) => { if (![...(e.dataTransfer.types || [])].includes('Files')) return; depth++; if (app.mode !== 'photo' || app.photoSub !== 'library') hint.hidden = false; });
    addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) hint.hidden = true; });
    addEventListener('dragover', (e) => e.preventDefault());
    addEventListener('drop', (e) => {
      e.preventDefault(); depth = 0; hint.hidden = true;
      const files = [...(e.dataTransfer.files || [])]; if (!files.length) return;
      if (app.mode === 'photo' && app.photoSub === 'library') return; // library handles its own drop
      if (app.mode === 'video' || files.some((f) => CP.media.isMedia(f.name, f.type))) { if (app.mode !== 'video') { CP.routeMedia(files); return; } return; }
      if (app.mode === 'home') app.setMode(store.get('homeTab', 'photo') === 'draw' ? 'draw' : 'photo', { sub: 'editor' });
      CP.openFiles(files);
    });
    addEventListener('paste', (e) => {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      const item = [...(e.clipboardData && e.clipboardData.items || [])].find((i) => i.type.startsWith('image/'));
      if (!item) return; e.preventDefault();
      const blob = item.getAsFile();
      if (app.mode === 'photo' && app.photoSub === 'library') { CP.lib.addFiles([new File([blob], 'Pasted ' + new Date().toLocaleString().replace(/[/:]/g, '-') + '.png', { type: blob.type })]); return; }
      if (app.mode === 'home') app.setMode('draw');
      CP.pasteBlob(blob, !CP.doc);
    });
  }

  /* ---------- intro handoff ---------- */
  let introDone = false;
  function finishIntro() {
    if (introDone) return; introDone = true;
    document.body.classList.remove('intro-running');
    const s = document.querySelector('.skip-intro'); s && s.remove();
    const t = $('#hero-title'); t.style.opacity = '0';
  }
  function skipIntroNow() { CP.emit('skip-intro'); finishIntro(); }
  CP.on('intro-done', finishIntro);
  /* Big "CydArt" title that grows in, then shrinks into the brand spot in the app bar */
  CP.on('intro-title', () => {
    const t = $('#hero-title'); t.style.transition = 'none'; t.style.opacity = '0'; t.style.transform = 'translate(-50%, -50%) scale(0.6)'; t.style.left = '50%'; t.style.top = '62%'; t.style.transformOrigin = '50% 50%';
    void t.offsetWidth;
    t.style.transition = 'opacity .5s ease, transform .7s cubic-bezier(.2,1.4,.4,1)'; t.style.opacity = '1'; t.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  CP.on('intro-title-shrink', () => {
    const t = $('#hero-title'), dest = $('.brand-word').getBoundingClientRect(), r = t.getBoundingClientRect();
    const k = dest.height / r.height * 1.02;
    t.style.transition = 'transform 1s cubic-bezier(.6,0,.2,1), left 1s cubic-bezier(.6,0,.2,1), top 1s cubic-bezier(.6,0,.2,1)';
    t.style.transformOrigin = '0 0'; t.style.left = r.left + 'px'; t.style.top = r.top + 'px'; t.style.transform = 'translate(0,0) scale(1)';
    void t.offsetWidth;
    t.style.left = dest.left + 'px'; t.style.top = dest.top + 'px'; t.style.transform = `scale(${k})`;
    setTimeout(() => { document.querySelector('.brand-word').style.opacity = '1'; t.style.transition = 'opacity .25s'; t.style.opacity = '0'; }, 1050);
  });

  /* ---------- boot ---------- */
  function boot() {
    initTheme(); CP.initEditor(); CP.lib.mount($('#library')); buildHome(); initInstall(); initDrop();
    $('#brand').onclick = () => app.setMode('home');
    $('#tab-photo').onclick = () => app.setMode('photo');
    $('#tab-draw').onclick = () => app.setMode('draw');
    $('#tab-video').onclick = () => app.setMode('video');
    $('#btn-convert').onclick = () => CP.converter.open();
    document.querySelectorAll('#video-sub .subtab').forEach((b) => { b.onclick = () => app.setMode('video', { sub: b.dataset.sub }); });
    document.addEventListener('keydown', (e) => { if (app.mode === 'video' && CP.video.key(e)) e.preventDefault(); });
    $('#sub-library').onclick = () => app.setMode('photo', { sub: 'library' });
    $('#sub-editor').onclick = () => app.setMode('photo', { sub: 'editor' });
    $('#btn-open').onclick = async () => { const f = await CP.ui.pickFiles({ multiple: true }); if (f.length) { if (app.mode === 'home') app.setMode('photo', { sub: 'editor' }); CP.openFiles(f); } };
    $('#btn-about').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); CP.ui.contextMenu(r.right - 260, r.bottom + 4, app.aboutItems(), { owner: e.currentTarget }); };
    if (CP.desktop) { setTimeout(CP.desktopOpenNow, 50); } else setTimeout(() => app.checkUpdates(true), 4000);
    CP.lib.load().then(renderRecent);
    if (/[?&]handoff=1/.test(location.search)) { // photo handed over from CydArt Lite
      try {
        const r = indexedDB.open('cydphoto-handoff', 1); r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => { const db = r.result, t = db.transaction('files', 'readwrite'), st = t.objectStore('files'), g = st.get('pending');
          g.onsuccess = () => { const f = g.result; st.delete('pending'); if (f) { skipIntroNow(); app.setMode('photo', { sub: 'editor' }); CP.openFiles([f], { toLibrary: false }); } }; };
        history.replaceState(null, '', location.pathname);
      } catch (e) {}
    }
    CP.on('library', () => { if (app.mode === 'home') renderRecent(); });
    app.setMode('home');
    addEventListener('beforeunload', (e) => { if (CP.docs.some((d) => !d.saved)) { e.preventDefault(); e.returnValue = ''; } });
    // intro
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (CP.prefs.skipIntro || reduce) { setTimeout(() => { CP.emit('skip-intro'); finishIntro(); }, 0); document.querySelector('.brand-word').style.opacity = '1'; }
    else {
      const skip = el('button', { class: 'btn raised skip-intro', type: 'button' }, 'Skip intro');
      skip.onclick = skipIntroNow; document.body.append(skip);
      setTimeout(() => { if (!introDone && !window.__cpSceneReady) skipIntroNow(); }, 9000); // 3D failed to load: don't block
    }
    CP.on('replay-intro', () => { introDone = false; document.body.classList.add('intro-running'); document.querySelector('.brand-word').style.opacity = '0'; app.setMode('home'); CP.emit('scene-replay'); });
    CP.on('skip-intro', () => { document.querySelector('.brand-word').style.opacity = '1'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.CP);
