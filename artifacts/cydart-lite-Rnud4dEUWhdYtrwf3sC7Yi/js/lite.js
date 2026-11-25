/* CydArt Lite: a fast, viewer-only CydArt. Shares the format engine with the full app. */
(function (CP) {
  'use strict';
  const U = CP.util, el = U.el, $ = (s) => document.querySelector(s);
  const store = { get(k, d) { try { const v = localStorage.getItem('cpl-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('cpl-' + k, JSON.stringify(v)); } catch (e) {} } };
  const prefs = Object.assign({ interval: 4, wheel: 'zoom', sort: 'name' }, store.get('prefs', {}));
  const savePrefs = () => store.set('prefs', prefs);
  const inClaude = !CP.desktop && (!!(window.claude && window.claude.use) || /claude|usercontent/.test(location.hostname));
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const IMG_RE = /\.(jpe?g|tiff?|apng|avif|heic|heif|jfif|webp|3fr|arw|bmp|cr2|cr3|crw|cur|dcr|dds|dng|erf|exr|gif|hdr|hif|ico|iiq|j2k|jp2|jpf|jpx|jxl|kdc|mef|mos|mrw|nef|nrw|orf|pbm|pcx|pef|pgm|png|pnm|ppm|psb|psd|qoi|raf|raw|rw2|rwl|sr2|srf|srw|svg|tga|x3f|xcf)$/i;

  let items = []; // {id, file, name, size, type, date, thumb, full, decoded}
  let cur = -1;

  /* ---------------- adding files ---------------- */
  function addFiles(files, { view = true } = {}) {
    const fresh = Array.from(files).filter((f) => f && f.size > 0 && (/^image\//.test(f.type) || IMG_RE.test(f.name || '') || CP.media.isMedia(f.name, f.type)));
    if (!fresh.length) { CP.ui.toast('No photos or videos found there'); return; }
    const start = items.length;
    for (const f of fresh) items.push({ id: U.uid(), file: f, name: f.name || 'Image', size: f.size, type: f.type, date: f.lastModified || Date.now(), ext: U.ext(f.name || ''), kind: CP.media.isMedia(f.name, f.type) ? 'video' : 'image' });
    sortItems();
    renderGrid();
    if (view && fresh.length === 1) open(items.findIndex((x) => x.file === fresh[0]));
    else if (view && start === 0 && fresh.length > 1 && fresh.length <= 3) open(0);
  }
  function sortItems() {
    const k = prefs.sort, curId = items[cur] && items[cur].id;
    items.sort((a, b) => k === 'date' ? b.date - a.date : k === 'size' ? b.size - a.size : k === 'type' ? (a.ext.localeCompare(b.ext) || a.name.localeCompare(b.name, undefined, { numeric: true })) : a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (curId) cur = items.findIndex((x) => x.id === curId);
  }

  /* ---------------- thumbnails (lazy, 2 at a time) ---------------- */
  const queue = []; let running = 0;
  function wantThumb(it, cb) { if (it.thumb) return cb(it.thumb); (it.waiters = it.waiters || []).push(cb); if (!it.queued) { it.queued = true; queue.push(it); pump(); } }
  function pump() {
    while (running < 2 && queue.length) {
      const it = queue.shift(); running++;
      makeThumb(it).then((u) => { it.thumb = u; }).catch(() => { it.thumb = ''; it.failed = true; })
        .finally(() => { running--; (it.waiters || []).forEach((f) => f(it.thumb)); it.waiters = []; pump(); });
    }
  }
  async function makeThumb(it) {
    if (it.kind === 'video') return videoThumb(it);
    let src;
    if (CP.isNativeViewable(it.name, it.type) && window.createImageBitmap && it.ext !== 'svg') {
      try { src = await createImageBitmap(it.file, { resizeWidth: 360, resizeQuality: 'medium' }); } catch (e) { src = null; }
    }
    if (!src) { const c = await decoded(it); src = c; }
    const s = Math.min(1, 360 / Math.max(src.width, src.height)), c = U.canvas(src.width * s, src.height * s), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height);
    if (!it.w && src.width && s === 1) { it.w = src.width; it.h = src.height; }
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
    return URL.createObjectURL(b);
  }
  async function videoThumb(it) {
    let c;
    if (CP.media.isAudio(it.name, it.type)) c = null;
    else { const u = URL.createObjectURL(it.file); try { c = await CP.media.grabFrame(u, 1, 360); } catch (e) { c = null; } finally { URL.revokeObjectURL(u); } }
    if (!c) { // a format this browser can't preview without converting: draw a film card
      c = U.canvas(360, 240); const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 360, 240); gr.addColorStop(0, '#1d2733'); gr.addColorStop(1, '#0b1118'); g.fillStyle = gr; g.fillRect(0, 0, 360, 240);
      g.fillStyle = '#38bdf8'; g.font = '700 30px Chakra Petch, sans-serif'; g.textAlign = 'center'; g.fillText(CP.media.isAudio(it.name, it.type) ? '♪ AUDIO' : (it.ext || 'video').toUpperCase(), 180, 132);
    }
    const g = c.getContext('2d'), r = Math.min(c.width, c.height) * 0.14;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(c.width / 2, c.height / 2, r * 1.3, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(c.width / 2 - r * 0.45, c.height / 2 - r * 0.7); g.lineTo(c.width / 2 + r * 0.75, c.height / 2); g.lineTo(c.width / 2 - r * 0.45, c.height / 2 + r * 0.7); g.fill();
    const b = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
    return URL.createObjectURL(b);
  }
  async function decoded(it) {
    if (it.canvas) return it.canvas;
    const c = await CP.decodeToCanvas(it.file, it.name);
    it.w = c.width; it.h = c.height; it.canvas = c; keepDecoded(it);
    return c;
  }
  const decodedLRU = [];
  function keepDecoded(it) { const i = decodedLRU.indexOf(it); if (i >= 0) decodedLRU.splice(i, 1); decodedLRU.push(it); while (decodedLRU.length > 5) { const o = decodedLRU.shift(); if (o !== items[cur]) { o.canvas = null; if (o.fullFromCanvas) { URL.revokeObjectURL(o.full); o.full = null; } } } }

  /* ---------------- grid ---------------- */
  let io;
  function renderGrid() {
    const has = items.length > 0;
    $('#l-empty').hidden = has; $('#l-gridwrap').hidden = !has;
    $('#l-count').textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
    const grid = $('#l-grid'); grid.innerHTML = '';
    if (!io) io = new IntersectionObserver((ents) => ents.forEach((en) => { if (!en.isIntersecting) return; io.unobserve(en.target); const it = items.find((x) => x.id === en.target.dataset.id); if (it) wantThumb(it, (u) => fillThumb(en.target, it, u)); }), { root: grid, rootMargin: '300px' });
    const frag = document.createDocumentFragment();
    items.forEach((it, i) => {
      const t = el('button', { class: 'lt', type: 'button', 'data-id': it.id, 'aria-label': it.name, title: it.name },
        el('span', { class: 'ti' }, el('span', { class: 'ph' }, (it.ext || '?').toUpperCase())),
        el('span', { class: 'tm' }, el('span', { class: 'n' }, it.name), el('span', { class: 'f' }, (it.ext || '').toUpperCase())));
      t.onclick = () => open(items.indexOf(it));
      t.oncontextmenu = (e) => { e.preventDefault(); CP.ui.contextMenu(e.clientX, e.clientY, [['View', () => open(items.indexOf(it))], ['Save a copy as…', () => saveAs(it)], ['Remove from view', () => removeItem(it)]]); };
      frag.append(t); io.observe(t);
    });
    grid.append(frag);
  }
  function fillThumb(t, it, u) { const ti = t.querySelector('.ti'); if (u) { ti.innerHTML = ''; ti.append(el('img', { src: u, alt: '' })); } else ti.innerHTML = '<span class="ph">Can’t preview</span>'; }
  function removeItem(it) {
    const i = items.indexOf(it); if (i < 0) return;
    if (it.thumb) URL.revokeObjectURL(it.thumb); if (it.full) URL.revokeObjectURL(it.full);
    items.splice(i, 1);
    if (!$('#lv').hidden) { if (!items.length) close(); else { cur = Math.min(i, items.length - 1); show(); } }
    renderGrid();
  }

  /* ---------------- viewer ---------------- */
  const V = { z: 1, cx: 0, cy: 0, rot: 0, flip: 1, fit: true, nw: 0, nh: 0, timer: null };
  let vplayer = null;
  const lv = $('#lv'), stage = $('#lv-stage'), img = $('#lv-img');
  function open(i) { if (i < 0 || !items[i]) return; cur = i; lv.hidden = false; lv.focus(); show(); }
  function close() { stopShow(); if (vplayer) vplayer.stop(); lv.hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); const t = $(`.lt[data-id="${items[cur] && items[cur].id}"]`); t && t.focus(); }
  let showToken = 0;
  async function show() {
    const it = items[cur]; if (!it) return; const tok = ++showToken;
    V.rot = 0; V.flip = 1; V.fit = true;
    $('#lv-name').textContent = it.name; meta();
    lv.classList.toggle('is-video', it.kind === 'video');
    if (it.kind === 'video') {
      img.hidden = true; $('#lv-msg').hidden = true;
      if (!vplayer) { vplayer = new CP.Player(stage, { onEnded: () => { if (V.timer) go(1, true); } }); }
      vplayer.root.hidden = false; vplayer.load(it.file, it.name); setTimeout(() => vplayer.root.focus(), 50);
      strip(); if (!$('#lv-infopanel').hidden) info();
      return;
    }
    img.hidden = false; if (vplayer) { vplayer.stop(); vplayer.root.hidden = true; }
    const msg = $('#lv-msg'); msg.hidden = true;
    if (it.thumb) { img.src = it.thumb; } else img.removeAttribute('src');
    if (it.thumb) await imgReady(); if (tok !== showToken) return;
    if (it.thumb) { V.nw = it.w || img.naturalWidth; V.nh = it.h || img.naturalHeight; layout(true); }
    try {
      if (!it.full) {
        if (CP.isNativeViewable(it.name, it.type)) it.full = URL.createObjectURL(it.file);
        else {
          if (!it.thumb) { msg.textContent = 'Opening ' + it.ext.toUpperCase() + '…'; msg.hidden = false; }
          const c = await decoded(it); if (tok !== showToken) return;
          const alpha = hasAlpha(c);
          const b = await new Promise((r) => c.toBlob(r, alpha ? 'image/png' : 'image/jpeg', 0.95));
          it.full = URL.createObjectURL(b); it.fullFromCanvas = true;
        }
      }
      img.src = it.full; await imgReady(); if (tok !== showToken) return;
      if (!it.w) { it.w = img.naturalWidth; it.h = img.naturalHeight; }
      V.nw = img.naturalWidth; V.nh = img.naturalHeight; msg.hidden = true;
      layout(true); meta();
    } catch (e) { msg.textContent = `Couldn't open ${it.name}: ${e.message || e}`; msg.hidden = false; }
    if (lv.classList.contains('playing')) { lv.classList.remove('fading'); void lv.offsetWidth; lv.classList.add('fading'); }
    strip(); if (!$('#lv-infopanel').hidden) info();
    [cur + 1, cur - 1].forEach((k) => items[k] && !items[k].thumb && wantThumb(items[k], () => {}));
  }
  const imgReady = () => (img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => new Promise((r) => { img.onload = r; img.onerror = r; })));
  function hasAlpha(c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4 * 9) if (d[i] < 255) return true; return false; }
  function meta() {
    const it = items[cur];
    $('#lv-sub').textContent = `${cur + 1} of ${items.length} · ${it.w ? it.w + ' × ' + it.h + ' · ' : ''}${U.fmtBytes(it.size)} · ${(it.ext || it.type).toUpperCase()}`;
  }
  function boxSize() { return V.rot % 180 ? [V.nh, V.nw] : [V.nw, V.nh]; }
  function fitZoom() { const r = stage.getBoundingClientRect(), [w, h] = boxSize(); return Math.min((r.width - 24) / w, (r.height - 24) / h, 1) || 1; }
  function layout(reset) {
    const r = stage.getBoundingClientRect();
    if (reset || V.fit) { V.z = fitZoom(); V.cx = r.width / 2; V.cy = r.height / 2; }
    apply();
  }
  function apply() {
    img.style.transform = `translate(${V.cx}px, ${V.cy}px) rotate(${V.rot}deg) scale(${V.flip * V.z}, ${V.z}) translate(-50%, -50%)`;
    const [w, h] = boxSize(), r = stage.getBoundingClientRect();
    stage.classList.toggle('pan', w * V.z > r.width || h * V.z > r.height);
    stage.classList.toggle('pixel', V.z >= 3);
    $('#lv-zval').textContent = Math.round(V.z * 100) + '%';
  }
  function zoomAt(z, mx, my, smooth) {
    const r = stage.getBoundingClientRect(); if (mx == null) { mx = r.width / 2; my = r.height / 2; }
    z = U.clamp(z, Math.min(0.05, fitZoom()), 32);
    V.cx = mx - (mx - V.cx) * (z / V.z); V.cy = my - (my - V.cy) * (z / V.z); V.z = z; V.fit = false;
    const fz = fitZoom(); if (z <= fz + 1e-6) { V.fit = true; layout(true); }
    stage.classList.toggle('smooth', !!smooth); apply(); if (smooth) setTimeout(() => stage.classList.remove('smooth'), 200);
  }
  const STEPS = [0.05, 0.1, 0.17, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32];
  const step = (d) => { const z = V.z; const n = d > 0 ? STEPS.find((s) => s > z * 1.01) : [...STEPS].reverse().find((s) => s < z * 0.99); zoomAt(n || z, null, null, true); };
  function toggleFit() { if (V.fit || Math.abs(V.z - fitZoom()) < 0.001) zoomAt(1, null, null, true); else { V.fit = true; stage.classList.add('smooth'); layout(true); setTimeout(() => stage.classList.remove('smooth'), 200); } }
  const go = (d, wrap) => { if (!items.length) return; const n = wrap ? (cur + d + items.length) % items.length : U.clamp(cur + d, 0, items.length - 1); if (n !== cur) { cur = n; show(); } };
  function rotate(d) { V.rot = (V.rot + d + 360) % 360; V.fit = true; stage.classList.add('smooth'); layout(true); setTimeout(() => stage.classList.remove('smooth'), 200); }

  // pointer: pan, pinch, swipe
  const pts = new Map(); let pan = null, pinch = null, swipe = null, lastTap = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.vp')) return;
    stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: V.z }; pan = null; swipe = null; return; }
    const [w, h] = boxSize(), r = stage.getBoundingClientRect();
    if (w * V.z > r.width || h * V.z > r.height) { pan = { x: e.clientX, y: e.clientY, cx: V.cx, cy: V.cy }; stage.classList.add('panning'); }
    else swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
    const now = Date.now(); if (e.pointerType !== 'mouse' && now - lastTap < 300) { const rr = stage.getBoundingClientRect(); V.fit ? zoomAt(Math.max(2 * V.z, 1), e.clientX - rr.left, e.clientY - rr.top, true) : toggleFit(); } lastTap = now;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], r = stage.getBoundingClientRect(); zoomAt(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); return; }
    if (pan) { V.cx = pan.cx + e.clientX - pan.x; V.cy = pan.cy + e.clientY - pan.y; apply(); }
  });
  const up = (e) => {
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null; stage.classList.remove('panning');
    if (swipe && e.type === 'pointerup') { const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; if (Date.now() - swipe.t < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1); else if (Date.now() - swipe.t < 600 && dy > 90 && Math.abs(dy) > Math.abs(dx)) close(); }
    pan = null; swipe = null;
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('dblclick', (e) => { if (e.target.closest('.vp')) return; const r = stage.getBoundingClientRect(); if (V.fit) zoomAt(Math.max(2 * V.z, 1), e.clientX - r.left, e.clientY - r.top, true); else toggleFit(); });
  stage.addEventListener('wheel', (e) => {
    if (e.target.closest('.vp')) return;
    e.preventDefault(); const r = stage.getBoundingClientRect();
    if (prefs.wheel === 'navigate' && !e.ctrlKey && !e.metaKey) { if (Math.abs(e.deltaY) > 20) { if (!wheelLock) { go(e.deltaY > 0 ? 1 : -1); wheelLock = true; setTimeout(() => (wheelLock = false), 250); } } return; }
    zoomAt(V.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  let wheelLock = false;
  new ResizeObserver(() => { if (!lv.hidden) layout(false); }).observe(stage);

  // chrome auto-hide during slideshow / full screen
  let idle;
  const wake = () => { lv.classList.remove('chrome-hidden'); clearTimeout(idle); if (lv.classList.contains('playing') || document.fullscreenElement) idle = setTimeout(() => lv.classList.add('chrome-hidden'), 2500); };
  lv.addEventListener('pointermove', wake);
  document.addEventListener('fullscreenchange', () => { $('#lv-full').classList.toggle('on', !!document.fullscreenElement); wake(); requestAnimationFrame(() => layout(false)); });

  function play() { if (!items.length) return; if (lv.hidden) open(Math.max(0, cur)); lv.classList.add('playing'); $('#lv-play').classList.add('on'); clearInterval(V.timer); V.timer = setInterval(() => go(1, true), prefs.interval * 1000); wake(); }
  function stopShow() { clearInterval(V.timer); V.timer = null; lv.classList.remove('playing', 'fading', 'chrome-hidden'); $('#lv-play').classList.remove('on'); }
  function full() { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (lv.requestFullscreen) lv.requestFullscreen().catch(() => CP.ui.toast('Full screen is not available here')); }

  function strip() {
    const s = $('#lv-strip'); s.innerHTML = '';
    const from = Math.max(0, cur - 15), to = Math.min(items.length, cur + 16);
    for (let k = from; k < to; k++) {
      const it = items[k], im = el('img', { alt: '' }), b = el('button', { class: 'lv-th' + (k === cur ? ' on' : ''), type: 'button', 'aria-label': it.name, title: it.name }, im);
      b.onclick = () => { cur = k; show(); }; s.append(b);
      wantThumb(it, (u) => { if (u) im.src = u; });
    }
    const on = s.querySelector('.on'); on && on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  async function info() {
    const it = items[cur], p = $('#lv-infopanel');
    const row = (k, v) => (v ? `<dt>${k}</dt><dd>${String(v).replace(/</g, '&lt;')}</dd>` : '');
    p.innerHTML = `<h3>File</h3><dl>${row('Name', it.name)}${row('Format', (it.ext || it.type).toUpperCase())}${row('Dimensions', it.w ? `${it.w} × ${it.h} px (${(it.w * it.h / 1e6).toFixed(1)} MP)` : '')}${row('File size', U.fmtBytes(it.size))}${row('Modified', new Date(it.date).toLocaleString())}${it.file.webkitRelativePath ? row('Folder', it.file.webkitRelativePath.replace(/\/[^/]*$/, '')) : ''}</dl><h3>Camera</h3><div id="lv-exif" class="muted sm">Reading camera data…</div>`;
    const ex = await CP.readExif(it.file); const box = $('#lv-exif'); if (!box || items[cur] !== it) return;
    if (!ex || ex.errors) { box.textContent = 'No camera data in this file.'; return; }
    const fN = ex.FNumber ? 'ƒ/' + ex.FNumber : '', exp = ex.ExposureTime ? (ex.ExposureTime < 1 ? '1/' + Math.round(1 / ex.ExposureTime) : ex.ExposureTime) + ' s' : '';
    const taken = ex.DateTimeOriginal instanceof Date ? ex.DateTimeOriginal.toLocaleString() : '';
    const gps = ex.latitude != null && ex.longitude != null ? `<dt>Location</dt><dd><a href="https://www.openstreetmap.org/?mlat=${ex.latitude}&mlon=${ex.longitude}#map=15/${ex.latitude}/${ex.longitude}" target="_blank" rel="noopener">${ex.latitude.toFixed(5)}, ${ex.longitude.toFixed(5)}</a></dd>` : '';
    const html = `${row('Taken', taken)}${row('Camera', [ex.Make, ex.Model].filter(Boolean).join(' '))}${row('Lens', ex.LensModel)}${row('Exposure', [fN, exp, ex.ISO ? 'ISO ' + ex.ISO : ''].filter(Boolean).join('  ·  '))}${row('Focal length', ex.FocalLength ? ex.FocalLength + ' mm' + (ex.FocalLengthIn35mmFormat ? ` (${ex.FocalLengthIn35mmFormat} mm equiv.)` : '') : '')}${row('Flash', typeof ex.Flash === 'string' ? ex.Flash : '')}${row('Software', ex.Software)}${gps}`;
    box.className = ''; box.innerHTML = html ? `<dl>${html}</dl>` : '<span class="muted sm">No camera data in this file.</span>';
  }

  /* ---------------- save a copy / copy ---------------- */
  async function currentCanvas(it) {
    let src = it.canvas;
    if (!src) { if (CP.isNativeViewable(it.name, it.type) && it === items[cur] && img.naturalWidth && img.src === it.full) { src = U.canvas(img.naturalWidth, img.naturalHeight); src.getContext('2d').drawImage(img, 0, 0); } else src = await decoded(it); }
    if (it !== items[cur] || (!V.rot && V.flip === 1)) return src;
    const sw = V.rot % 180 ? src.height : src.width, sh = V.rot % 180 ? src.width : src.height, c = U.canvas(sw, sh), g = c.getContext('2d');
    g.translate(sw / 2, sh / 2); g.rotate(V.rot * Math.PI / 180); g.scale(V.flip, 1); g.drawImage(src, -src.width / 2, -src.height / 2); return c;
  }
  function saveAs(it = items[cur]) {
    if (!it) return;
    if (it.kind === 'video') return CP.converter.open([it.file]);
    const fmts = CP.SAVE_FORMATS; let fmt = 'jpeg';
    const grid = el('div', { class: 'fmt-grid', role: 'radiogroup', 'aria-label': 'Format' }), desc = el('div', { class: 'note' });
    const q = CP.ui.slider({ label: 'Quality', min: 1, max: 100, value: 90, onInput: () => {} });
    const draw = () => { grid.innerHTML = ''; fmts.forEach((f) => { const b = el('button', { type: 'button', class: (f.id === fmt ? 'on ' : '') + (f.disabled ? 'dis' : ''), role: 'radio', 'aria-checked': f.id === fmt }, f.label, el('small', {}, '.' + f.ext + (f.disabled ? ' · open only' : ''))); b.onclick = () => { fmt = f.id; draw(); }; grid.append(b); }); const f = fmts.find((x) => x.id === fmt); desc.textContent = f.desc; q.hidden = f.quality == null; };
    draw();
    const rotNote = it === items[cur] && (V.rot || V.flip !== 1) ? el('p', { class: 'muted sm' }, 'The copy includes the rotation/flip you applied in the viewer.') : null;
    CP.ui.dialog({ title: 'Save a copy as', wide: true, body: el('div', { class: 'stack' }, el('p', { class: 'muted sm' }, it.name), grid, desc, q, rotNote), buttons: [['Cancel'], ['Save copy', async () => {
      const f = fmts.find((x) => x.id === fmt); if (f.disabled) { CP.ui.toast(f.desc, 7000); return false; }
      const t = CP.ui.progress('Saving ' + f.label + '…');
      try { const c = await currentCanvas(it); const b = await CP.encodeCanvas(c, fmt, { quality: f.quality != null ? +q.querySelector('input').value : undefined }); await U.download(b, U.baseName(it.name) + '.' + f.ext); }
      catch (e) { CP.ui.error('Could not save', e); } finally { t.done(); }
    }, 'primary']] });
  }
  async function copyImage() {
    const it = items[cur]; if (!it) return;
    try { const c = await currentCanvas(it); const b = await new Promise((r) => c.toBlob(r, 'image/png')); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); CP.ui.toast('Copied to clipboard'); }
    catch (e) { CP.ui.toast('Copying images is not available here'); }
  }
  /* hand the photo to the full CydArt editor (same site) */
  async function editInFull() {
    const it = items[cur]; if (!it) return;
    if (CP.desktop) { try { await CP.desktopCall('edit?name=' + encodeURIComponent(it.name), it.file); CP.ui.toast('Opening in CydArt…'); } catch (e) { CP.ui.error('Could not open CydArt', e); } return; }
    try {
      const db = await new Promise((res, rej) => { const r = indexedDB.open('cydphoto-handoff', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      await new Promise((res, rej) => { const t = db.transaction('files', 'readwrite'); t.objectStore('files').put(it.file, 'pending'); t.oncomplete = res; t.onerror = () => rej(t.error); });
      location.href = CP.ROOT + 'index.html?handoff=1';
    } catch (e) { CP.ui.error('Could not open the editor', e); }
  }
  function moreMenu(x, y) {
    CP.ui.contextMenu(x, y, [
      ['Save a copy as…', () => saveAs(), isMac ? '⌘S' : 'Ctrl+S'], ['Copy image', copyImage, isMac ? '⌘C' : 'Ctrl+C'],
      inClaude || !hasFull ? null : ['Edit in CydArt', editInFull, 'E'], '-',
      ['Rotate left', () => rotate(-90), 'Shift+R'], ['Rotate right', () => rotate(90), 'R'], ['Flip horizontal', () => { V.flip *= -1; apply(); }, 'H'], '-',
      ['Remove from view', () => removeItem(items[cur]), 'Del'],
    ].filter(Boolean));
  }

  /* ---------------- toolbar wiring ---------------- */
  $('#lv-back').onclick = close; $('#lv-prev').onclick = () => go(-1); $('#lv-next').onclick = () => go(1);
  $('#lv-zin').onclick = () => step(1); $('#lv-zout').onclick = () => step(-1); $('#lv-zval').onclick = toggleFit;
  $('#lv-rotl').onclick = () => rotate(-90); $('#lv-rotr').onclick = () => rotate(90); $('#lv-flip').onclick = () => { V.flip *= -1; apply(); };
  $('#lv-play').onclick = () => (V.timer ? stopShow() : play()); $('#lv-full').onclick = full;
  $('#lv-info').onclick = () => { const p = $('#lv-infopanel'); p.hidden = !p.hidden; $('#lv-info').classList.toggle('on', !p.hidden); if (!p.hidden) info(); };
  $('#lv-more').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); moreMenu(r.right - 240, r.bottom + 4); };
  stage.addEventListener('contextmenu', (e) => { e.preventDefault(); moreMenu(e.clientX, e.clientY); });

  document.addEventListener('keydown', (e) => {
    if (lv.hidden || document.querySelector('.dlg-back, .menu') || (e.target.closest && e.target.closest('input, select, textarea'))) return;
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && k.toLowerCase() === 's') { e.preventDefault(); saveAs(); return; }
    if (mod && k.toLowerCase() === 'c') { e.preventDefault(); copyImage(); return; }
    if (mod) return;
    const map = {
      Escape: () => (V.timer ? stopShow() : close()), ArrowRight: () => go(1), ArrowLeft: () => go(-1), PageDown: () => go(1), PageUp: () => go(-1), Home: () => { cur = 0; show(); }, End: () => { cur = items.length - 1; show(); },
      '+': () => step(1), '=': () => step(1), '-': () => step(-1), '0': () => { V.fit = true; layout(true); }, '1': () => zoomAt(1, null, null, true),
      r: () => rotate(90), R: () => rotate(-90), h: () => { V.flip *= -1; apply(); }, f: full, i: () => $('#lv-info').click(), ' ': () => (V.timer ? stopShow() : play()),
      Delete: () => removeItem(items[cur]), e: () => !inClaude && hasFull && editInFull(), '?': shortcuts,
    };
    const fn = map[k] || (k.length === 1 ? map[k.toLowerCase()] : null);
    if (fn) { e.preventDefault(); fn(); wake(); }
  });

  /* ---------------- top bar, about, theme, install ---------------- */
  const pick = (dir) => CP.ui.pickFiles({ multiple: true, directory: dir }).then((f) => f.length && addFiles(f));
  $('#l-open').onclick = $('#l-open2').onclick = () => pick(false);
  $('#l-folder').onclick = $('#l-folder2').onclick = () => pick(true);
  $('#l-sort').value = prefs.sort; $('#l-sort').onchange = (e) => { prefs.sort = e.target.value; savePrefs(); sortItems(); renderGrid(); };
  $('#l-play').onclick = play;
  $('#l-convert').onclick = () => CP.converter.open(items.map((i) => i.file));
  $('#l-size').oninput = (e) => $('#l-grid').style.setProperty('--thumb', e.target.value + 'px');
  $('#l-clear').onclick = () => { items.forEach((it) => { it.thumb && URL.revokeObjectURL(it.thumb); it.full && URL.revokeObjectURL(it.full); }); items = []; cur = -1; renderGrid(); };
  $('#l-grid').addEventListener('keydown', (e) => {
    const tiles = [...document.querySelectorAll('.lt')], i = tiles.indexOf(document.activeElement); if (i < 0) return;
    const cols = Math.max(1, Math.round($('#l-grid').clientWidth / (tiles[0].offsetWidth + 10)));
    const n = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols }[e.key];
    if (n != null && tiles[n]) { e.preventDefault(); tiles[n].focus(); }
  });

  function shortcuts() {
    const rows = [['← →', 'Previous / next'], ['Home / End', 'First / last'], ['+ / −', 'Zoom'], ['0', 'Fit to screen'], ['1', 'Actual size (100%)'], ['Double-click', 'Zoom in / fit'], ['R / Shift+R', 'Rotate right / left'], ['H', 'Flip'], ['Space', 'Slideshow'], ['F', 'Full screen'], ['I', 'Info'], [isMac ? '⌘S' : 'Ctrl+S', 'Save a copy as'], [isMac ? '⌘C' : 'Ctrl+C', 'Copy image'], ['Delete', 'Remove from view'], ['Esc', 'Back to all photos'], ['Swipe', 'Next / previous (touch)']];
    const g = el('div', { class: 'kbd-grid' }); rows.forEach(([k, v]) => g.append(el('span', {}, el('kbd', {}, k)), el('span', {}, v)));
    CP.ui.dialog({ title: 'Keyboard shortcuts', body: g });
  }
  const changelog = () => el('div', {}, ...CP.LITE_CHANGELOG.map((c) => el('div', {}, el('h4', {}, `Version ${c.version} · ${c.date}`), el('ul', {}, c.notes.map((n) => el('li', {}, n))))));
  function about() {
    const iv = CP.ui.slider({ label: 'Slideshow seconds', min: 1, max: 30, value: prefs.interval, onInput: (v) => { prefs.interval = v; savePrefs(); if (V.timer) play(); } });
    const wh = el('select', { 'aria-label': 'Mouse wheel' }, el('option', { value: 'zoom', selected: prefs.wheel === 'zoom' }, 'Zooms'), el('option', { value: 'navigate', selected: prefs.wheel === 'navigate' }, 'Goes to next / previous photo'));
    wh.onchange = () => { prefs.wheel = wh.value; savePrefs(); };
    CP.ui.dialog({ title: 'About CydArt Lite', wide: true, body: el('div', {},
      el('div', { class: 'about-head' }, el('span', { class: 'brand-mark lite-mark' }), el('div', {}, el('h3', {}, 'CydArt Lite'), el('div', { class: 'muted' }, `Version ${CP.LITE_VERSION} · built ${CP.LITE_BUILD_DATE}`), el('div', { class: 'muted sm' }, `Format engine shared with CydArt ${CP.VERSION}`))),
      el('p', {}, 'A fast photo viewer. Opens HEIC/HEIF, camera RAW, TIFF, PSD, AVIF, JPEG XL and 270+ other formats. Nothing is uploaded: photos stay on your device.'),
      el('p', { class: 'muted sm' }, 'Format engine: ImageMagick (WebAssembly, Apache-2.0). HEIC: libheif (LGPL-3.0). PSD: ag-psd (MIT). Camera data: exifr (MIT).'),
      el('h3', { style: { fontSize: '14px', margin: '14px 0 8px' } }, 'Settings'), el('div', { class: 'stack' }, iv, el('label', { class: 'param' }, el('span', {}, 'Mouse wheel'), wh, el('span'))),
      el('div', { class: 'changelog' }, el('h3', { style: { margin: '0', fontSize: '14px' } }, "What's new"), changelog())),
      buttons: [['Keyboard shortcuts', () => { setTimeout(shortcuts, 0); }], ['Close', null, 'primary']] });
  }
  const cmpVer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
  async function checkUpdates(quiet) {
    try {
      const txt = await (await fetch(CP.ROOT + 'js/version.js?t=' + Date.now(), { cache: 'no-store' })).text();
      const m = txt.match(/CP\.LITE_VERSION\s*=\s*'([\d.]+)'/); if (!m) throw new Error('no version');
      if (cmpVer(m[1], CP.LITE_VERSION) > 0) { try { const r = await navigator.serviceWorker.getRegistration(); r && r.update(); } catch (e) {} CP.ui.toast(el('span', {}, `CydArt Lite ${m[1]} is available. `, el('button', { class: 'linkish', type: 'button', onclick: () => location.reload() }, 'Reload to update')), 12000); }
      else if (!quiet) CP.ui.toast(`You have the latest version (${CP.LITE_VERSION})`);
    } catch (e) { if (!quiet) CP.ui.toast('Could not check for updates right now'); }
  }
  function installHelp() {
    if (CP.desktop) return CP.ui.dialog({ title: 'Make CydArt Lite your default viewer', body: el('div', { class: 'stack' }, el('ol', {}, el('li', {}, 'Click "Open Default apps".'), el('li', {}, 'Search for CydArt Lite.'), el('li', {}, 'Click "Set default", or set it for each photo type.')), el('p', { class: 'muted sm' }, 'Or right-click a photo → Open with → Choose another app → CydArt Lite → Always.')), buttons: [['Close'], ['Open Default apps', () => { CP.desktopCall('defaults').catch(() => {}); }, 'primary']] });
    const isWin = /Win/.test(navigator.platform);
    CP.ui.dialog({ title: 'Make CydArt Lite your default photo viewer', body: el('div', { class: 'stack' },
      el('p', {}, 'After installing, CydArt Lite shows up in "Open with" for photos (JPEG, PNG, HEIC, TIFF, RAW, PSD and more).'),
      isWin ? el('ol', {}, el('li', {}, 'Right-click any photo in File Explorer.'), el('li', {}, 'Choose Open with → Choose another app.'), el('li', {}, 'Pick CydArt Lite and tick "Always use this app".'))
        : isMac ? el('ol', {}, el('li', {}, 'In Finder, select a photo and press ⌘I.'), el('li', {}, 'Under "Open with", choose CydArt Lite.'), el('li', {}, 'Click "Change All…".'))
          : el('ol', {}, el('li', {}, 'Right-click a photo in your file manager.'), el('li', {}, 'Choose Open with → CydArt Lite and make it the default.')),
      el('p', { class: 'muted sm' }, 'Install needs Chrome or Edge on a computer, with CydArt Lite hosted on a website. On iPhone/iPad use Share → Add to Home Screen.')), buttons: [['Got it', null, 'primary']] });
  }
  $('#btn-about').onclick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    CP.ui.contextMenu(r.right - 260, r.bottom + 4, [{ head: `CydArt Lite v${CP.LITE_VERSION}` }, ['About CydArt Lite', about], ["What's new (version history)", () => CP.ui.dialog({ title: "What's new", wide: true, body: el('div', { class: 'changelog', style: { borderTop: '0', marginTop: '0', maxHeight: 'none' } }, changelog()) })], CP.desktop ? null : ['Check for updates', () => checkUpdates(false)], ['Convert photos & videos…', () => CP.converter.open(items.map((i) => i.file))], '-', ['Keyboard shortcuts', shortcuts], ['Install / set as default viewer', installHelp], inClaude || CP.desktop ? null : ['Install guide', () => { location.href = CP.ROOT + 'install/'; }], inClaude || CP.desktop ? null : ['Open full CydArt editor', () => { location.href = CP.ROOT + 'index.html'; }]].filter(Boolean), { owner: e.currentTarget });
  };
  const th = store.get('theme', null) || (() => { try { return JSON.parse(localStorage.getItem('cp-theme')); } catch (e) { return null; } })();
  if (th) document.documentElement.dataset.theme = th;
  $('#btn-theme').onclick = () => { const c = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); const n = c === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = n; store.set('theme', n); };

  let deferred = null;
  if (!CP.desktop && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !inClaude) navigator.serviceWorker.register(CP.ROOT + 'sw.js', { scope: CP.ROOT }).catch(() => {});
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#btn-install').hidden = false; });
  $('#btn-install').onclick = async () => { if (!deferred) return installHelp(); deferred.prompt(); const r = await deferred.userChoice; deferred = null; $('#btn-install').hidden = true; if (r.outcome === 'accepted') setTimeout(installHelp, 600); };
  if ('launchQueue' in window) window.launchQueue.setConsumer(async (p) => { if (p.files && p.files.length) addFiles(await Promise.all(p.files.map((h) => h.getFile()))); });

  /* drag & drop, paste */
  let depth = 0; const hint = $('#drop-hint'), drop = $('#l-drop');
  addEventListener('dragenter', (e) => { if (![...(e.dataTransfer.types || [])].includes('Files')) return; depth++; hint.hidden = false; drop.classList.add('over'); });
  addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) { hint.hidden = true; drop.classList.remove('over'); } });
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => { e.preventDefault(); depth = 0; hint.hidden = true; drop.classList.remove('over'); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  addEventListener('paste', (e) => { const f = [...(e.clipboardData && e.clipboardData.items || [])].filter((i) => i.type.startsWith('image/')).map((i) => i.getAsFile()); if (f.length) { e.preventDefault(); addFiles(f.map((b, k) => new File([b], `Pasted ${k + 1}.png`, { type: b.type }))); } });

  let hasFull = true; // the desktop app tells us if only Lite is installed
  if (CP.desktop) CP.desktopCall('info').then((i) => { hasFull = i.has_full !== false; }).catch(() => {});
  CP.desktopOpenNow = async () => { try { const f = await CP.desktopFiles(); if (f.length) addFiles(f); } catch (e) { CP.ui.error('Could not open the file', e); } };
  renderGrid();
  if (CP.desktop) setTimeout(CP.desktopOpenNow, 50); else setTimeout(() => !inClaude && checkUpdates(true), 4000);
  CP.lite = { addFiles, open, get items() { return items; }, get view() { return V; } };
})(window.CP);
