/* Recall: photo frame options.
   Photos come from Recall's own pictures and from the person's MiVida photo folder (shared through the mivida/ app).
   Show all photos or a custom pick (the folder picks are shared with MiVida's slideshow), in order or random,
   with 3 to 30 seconds between photos. Everything is per profile. */
(function () {
  const { $, el, toast } = R;
  const esc = t => String(t ?? '').replace(/[<&>"]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' }[c]));
  const mvKey = k => 'recall:' + (ACTIVE_PROFILE ? 'p:' + ACTIVE_PROFILE + ':' : '') + 'mivida:' + k;
  const mvGet = k => { try { return JSON.parse(localStorage.getItem(mvKey(k))); } catch (e) { return null; } };
  const mvSet = (k, v) => { try { localStorage.setItem(mvKey(k), JSON.stringify(v)); } catch (e) {} };

  const O = Object.assign({ mode: 'all', secs: 9, random: false, useRecall: true, useMivida: true }, store.get('frameOpts', {}));
  O.secs = Math.min(30, Math.max(3, +O.secs || 9));
  const saveO = () => store.set('frameOpts', O);
  const picksMV = new Set(mvGet('mivida:photoPicks') || []);          // shared with MiVida's "Custom" slideshow
  const picksR = new Set(store.get('framePicksRecall', []));
  const saveMV = () => mvSet('mivida:photoPicks', [...picksMV]);
  const saveR = () => store.set('framePicksRecall', [...picksR]);

  /* ---------- MiVida photo folder ---------- */
  const idb = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('mivida-folders' + (ACTIVE_PROFILE ? '-' + ACTIVE_PROFILE : ''), 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
    const run = (mode, fn) => open().then(db => new Promise((res, rej) => { const tx = db.transaction('kv', mode); const q = fn(tx.objectStore('kv')); tx.oncomplete = () => res(q.result); tx.onerror = () => rej(tx.error); }));
    return { get: k => run('readonly', s => s.get(k)).catch(() => null), set: (k, v) => run('readwrite', s => s.put(v, k)).catch(() => null) };
  })();
  const EMBEDDED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const fsaOK = () => typeof window.showDirectoryPicker === 'function' && !EMBEDDED;
  const EXT = /\.(jpe?g|png|gif|webp|bmp|avif)$/i;
  const L = { status: 'none', name: '', handle: null, items: [], tok: 0 };
  async function restore() {
    const h = await idb.get('photos');
    if (!h || typeof h.queryPermission !== 'function' || L.status === 'ready') return;
    L.handle = h; L.name = h.name;
    let p = 'prompt'; try { p = await h.queryPermission({ mode: 'read' }); } catch (e) {}
    if (p === 'granted') return scan(); L.status = 'ask'; render();
  }
  async function allow() {
    try { const p = await L.handle.requestPermission({ mode: 'read' }); if (p === 'granted') return scan(); toast('Access was not allowed'); }
    catch (e) { L.status = 'none'; render(); }
  }
  async function choose() {
    if (fsaOK()) {
      try { const h = await window.showDirectoryPicker({ id: 'mivida-photos', startIn: 'pictures', mode: 'read' }); L.handle = h; L.name = h.name; idb.set('photos', h); return scan(); }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.webkitdirectory = true; i.accept = 'image/*'; i.hidden = true; document.body.append(i);
    i.onchange = () => { const files = [...i.files]; i.remove(); if (!files.length) return;
      const rel = f => (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name;
      L.handle = null; L.name = (files[0].webkitRelativePath || '').split('/')[0] || 'Photos'; L.tok++;
      setItems(files.filter(f => EXT.test(f.name)).slice(0, 5000).map(f => { const parts = rel(f).split('/'); const name = parts.pop(); return { path: rel(f), name, folder: parts.join('/'), file: f }; })); };
    i.click();
  }
  async function scan() {
    const tok = ++L.tok; L.status = 'scan'; render();
    const out = [];
    const walk = async (dir, path, depth) => {
      for await (const [name, h] of dir.entries()) {
        if (tok !== L.tok || out.length >= 5000) return;
        if (name.startsWith('.')) continue;
        if (h.kind === 'directory') { if (depth < 6) await walk(h, path + name + '/', depth + 1); }
        else if (EXT.test(name)) out.push({ path: path + name, name, folder: path.slice(0, -1), h });
      }
    };
    try { await walk(L.handle, '', 0); } catch (e) { if (tok === L.tok) { L.status = 'ask'; render(); } return; }
    if (tok === L.tok) setItems(out);
  }
  function setItems(out) { L.items = out.sort((a, b) => a.folder.localeCompare(b.folder) || a.path.localeCompare(b.path, undefined, { numeric: true })); L.status = 'ready'; render(); }
  const fileOf = it => it.file ? Promise.resolve(it.file) : it.h.getFile();

  /* ---------- which photos ---------- */
  const recallPics = () => (window.RecallFramePictures ? window.RecallFramePictures() : []).filter(p => p.src).map((p, i) => Object.assign({ key: 'r' + i + ':' + p.src.length }, p));
  function framePhotos() {
    let out = [];
    if (O.useRecall) out = out.concat(recallPics().filter(p => O.mode === 'all' || picksR.has(p.key)));
    if (O.useMivida && L.status === 'ready') out = out.concat(L.items.filter(it => O.mode === 'all' || picksMV.has(it.path)).map(it => ({ mv: it, cap: '' })));
    if (!out.length) out = window.RecallFramePictures ? window.RecallFramePictures().filter(p => !p.src) : [];
    if (!out.length) out = [['🌅', 'A calm morning'], ['🌻', 'Sunflowers'], ['🏖️', 'By the seaside'], ['🌳', 'In the park'], ['🫖', 'Time for tea']].map(([e, c]) => ({ emoji: e, cap: c }));
    return out;
  }

  /* ---------- the frame ---------- */
  let frame = null;
  function show() {
    if (frame) return;
    const pics = framePhotos(); let i = -1, urls = [];
    frame = el('div', 'frame', '<div class="pic"></div><div class="clockrow"><span class="t"></span><span class="d"></span></div><span class="tap">Tap to return</span>');
    frame.setAttribute('role', 'dialog'); frame.setAttribute('aria-label', 'Photo frame. Tap to return');
    document.body.append(frame);
    const pic = frame.querySelector('.pic');
    const tick = () => { const d = new Date(); frame.querySelector('.t').textContent = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); frame.querySelector('.d').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }); };
    const nextIndex = () => { if (O.random && pics.length > 1) { let n; do n = Math.floor(Math.random() * pics.length); while (n === i); return n; } return (i + 1) % pics.length; };
    let timer = 0;
    const showPic = async () => {
      if (!frame) return;
      i = nextIndex(); const p = pics[i]; let src = p.src;
      if (p.mv) { try { src = URL.createObjectURL(await fileOf(p.mv)); urls.push(src); } catch (e) { src = null; } }
      if (!frame) return;
      const node = src ? el('img') : el('div', 'scene', p.emoji || '🖼️'); if (src) { node.src = src; node.alt = p.cap || 'Photo'; }
      node.style.opacity = 0; pic.append(node);
      const cap = el('div', 'cap', esc(p.cap || '')); if (!p.cap) cap.hidden = true;
      requestAnimationFrame(() => { node.style.opacity = 1; });
      [...pic.children].forEach(ch => { if (ch !== node && ch !== cap) { ch.style.opacity = 0; setTimeout(() => ch.remove(), 1300); } });
      pic.append(cap);
      while (urls.length > 3) URL.revokeObjectURL(urls.shift());
      timer = setTimeout(showPic, O.secs * 1000);
    };
    tick(); showPic();
    const t1 = setInterval(tick, 15000);
    frame.onclick = () => { clearInterval(t1); clearTimeout(timer); urls.forEach(u => URL.revokeObjectURL(u)); frame.remove(); frame = null; };
  }
  window.RecallFrame = { show };

  /* ---------- options sheet ---------- */
  let sheetEl = null, thumbs = [], io = null, shownN = 200, folder = '';
  function openOpts() { sfx.tap(); if (sheetEl) return; sheetEl = el('div', 'xsheet pfsheet', '<div class="xcard pfcard" role="dialog" aria-labelledby="pfTitle"></div>'); sheetEl.addEventListener('click', e => { if (e.target === sheetEl) closeOpts(); }); document.body.append(sheetEl); render(); restore(); }
  function closeOpts() { if (!sheetEl) return; sheetEl.remove(); sheetEl = null; dropThumbs(); }
  function dropThumbs() { if (io) io.disconnect(); io = null; thumbs.forEach(u => URL.revokeObjectURL(u)); thumbs = []; }
  function render() {
    if (!sheetEl) return; dropThumbs();
    const card = sheetEl.querySelector('.pfcard'), rp = recallPics();
    const nMV = L.items.filter(it => picksMV.has(it.path)).length, nR = rp.filter(p => picksR.has(p.key)).length;
    const mvLine = L.status === 'ready' ? `<b>${esc(L.name)}</b> · ${L.items.length} photos <button class="linkish" data-pf="choose" type="button">Choose another folder</button>`
      : L.status === 'scan' ? 'Finding your photos…'
      : L.status === 'ask' ? `<b>${esc(L.name)}</b> <button class="btn c-sky" data-pf="allow" type="button">🔓 Allow</button>`
      : `<button class="btn c-sky" data-pf="choose" type="button">📁 Choose photo folder</button>${fsaOK() ? '' : '<br><small>On this page the folder is used for this visit only.</small>'}`;
    const folders = [...new Set(L.items.map(x => x.folder.split('/')[0]).filter(Boolean))].sort();
    card.innerHTML = `<div class="mmhead"><h2 id="pfTitle">🖼️ Photo frame</h2><button class="btn c-leaf" data-pf="close" type="button">Done</button></div>
      <h3>Which photos</h3>
      <div class="pfseg" role="radiogroup"><button type="button" role="radio" data-mode="all" aria-checked="${O.mode === 'all'}">All photos</button><button type="button" role="radio" data-mode="custom" aria-checked="${O.mode === 'custom'}">Custom (${nMV + nR} picked)</button></div>
      <div class="pfsrc">
        <div class="pfrow"><span>📷 Recall's pictures <small>${rp.length} from Who's Who, the life book and photo games</small></span><button class="switch" type="button" role="switch" data-src="useRecall" aria-checked="${O.useRecall}">${O.useRecall ? 'On' : 'Off'}</button></div>
        <div class="pfrow"><span>📘 MiVida photos <small>${mvLine}</small></span><button class="switch" type="button" role="switch" data-src="useMivida" aria-checked="${O.useMivida}">${O.useMivida ? 'On' : 'Off'}</button></div>
      </div>
      ${O.mode === 'custom' ? `<p class="mmnote">Tap photos to pick them. Your MiVida picks are shared with MiVida's Custom slideshow.</p>
        <div class="mmlists">${['', ...folders].map(f => `<button type="button" class="mmchip" data-folder="${esc(f)}" aria-pressed="${folder === f}">${f ? '📁 ' + esc(f) : 'All'}</button>`).join('')}</div>
        <div class="xbtns" style="margin-top:0"><button class="btn c-card" data-pf="selall" type="button">✔ Select all shown</button><button class="btn c-card" data-pf="clear" type="button">✖ Clear picks</button></div>
        <div class="pfgrid" id="pfGrid"></div>` : ''}
      <h3>Time between photos</h3>
      <div class="pfsecs"><button class="btn c-card" data-pf="minus" type="button" aria-label="Shorter">−</button><input type="range" id="pfSecs" min="3" max="30" step="1" value="${O.secs}" aria-label="Seconds between photos"><button class="btn c-card" data-pf="plus" type="button" aria-label="Longer">+</button><b id="pfSecsV">${O.secs} seconds</b></div>
      <div class="pfrow"><span>🔀 Random order</span><button class="switch" type="button" role="switch" data-src="random" aria-checked="${O.random}">${O.random ? 'On' : 'Off'}</button></div>
      <div class="xbtns"><button class="btn c-sky" data-pf="now" type="button">▶ Show it now</button></div>`;
    if (O.mode === 'custom') fillGrid(rp);
  }
  function fillGrid(rp) {
    const grid = $('#pfGrid'); if (!grid) return;
    const mv = O.useMivida && L.status === 'ready' ? L.items.filter(it => !folder || it.folder === folder || it.folder.startsWith(folder + '/')) : [];
    const list = (O.useRecall && !folder ? rp.map(p => ({ r: p })) : []).concat(mv.map(it => ({ m: it })));
    if (!list.length) { grid.innerHTML = '<p class="mmnote">No photos yet. Switch on a source above.</p>'; return; }
    io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target); load(e.target); }), { root: grid, rootMargin: '200px' }) : null;
    const load = b => { const it = b._it; if (it.r) b.querySelector('img').src = it.r.src; else fileOf(it.m).then(f => { const u = URL.createObjectURL(f); thumbs.push(u); b.querySelector('img').src = u; }).catch(() => {}); };
    list.slice(0, shownN).forEach(it => {
      const on = it.r ? picksR.has(it.r.key) : picksMV.has(it.m.path);
      const b = el('button', 'pftile' + (on ? ' on' : ''), `<img alt="${esc(it.r ? it.r.cap || 'Photo' : it.m.name)}">`); b.type = 'button'; b._it = it;
      b.setAttribute('aria-pressed', String(on));
      b.onclick = () => { const s = it.r ? picksR : picksMV, k = it.r ? it.r.key : it.m.path; s.has(k) ? s.delete(k) : s.add(k); it.r ? saveR() : saveMV(); const now = s.has(k); b.classList.toggle('on', now); b.setAttribute('aria-pressed', String(now)); updCount(); };
      grid.append(b); io ? io.observe(b) : load(b);
    });
    if (list.length > shownN) { const m = el('button', 'btn c-card pfmore', `Show more (${list.length - shownN} left)`); m.type = 'button'; m.onclick = () => { shownN += 200; render(); }; grid.append(m); }
  }
  function updCount() { const b = sheetEl && sheetEl.querySelector('[data-mode="custom"]'); if (b) b.textContent = `Custom (${L.items.filter(it => picksMV.has(it.path)).length + recallPics().filter(p => picksR.has(p.key)).length} picked)`; }
  function setSecs(v) { O.secs = Math.min(30, Math.max(3, v)); saveO(); const r = $('#pfSecs'); if (r) r.value = O.secs; const t = $('#pfSecsV'); if (t) t.textContent = O.secs + ' seconds'; }

  document.addEventListener('click', e => {
    if (!sheetEl || !sheetEl.contains(e.target)) return;
    const t = e.target.closest('[data-pf],[data-mode],[data-src],[data-folder]'); if (!t) return;
    e.preventDefault();
    if (t.dataset.mode) { O.mode = t.dataset.mode; saveO(); sfx.tap(); return render(); }
    if (t.dataset.src) { O[t.dataset.src] = !O[t.dataset.src]; saveO(); sfx.tap(); return render(); }
    if (t.dataset.folder != null) { folder = t.dataset.folder; shownN = 200; return render(); }
    const k = t.dataset.pf;
    if (k === 'close') closeOpts();
    else if (k === 'choose') choose();
    else if (k === 'allow') allow();
    else if (k === 'minus') setSecs(O.secs - 1);
    else if (k === 'plus') setSecs(O.secs + 1);
    else if (k === 'selall') { [...sheetEl.querySelectorAll('.pftile')].forEach(b => { const it = b._it; it.r ? picksR.add(it.r.key) : picksMV.add(it.m.path); }); saveR(); saveMV(); render(); }
    else if (k === 'clear') { picksR.clear(); picksMV.clear(); saveR(); saveMV(); render(); }
    else if (k === 'now') { closeOpts(); $('#settings').hidden = true; show(); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'pfSecs') setSecs(+e.target.value); });
  document.addEventListener('keydown', e => { if (sheetEl && e.key === 'Escape') closeOpts(); });

  R.css(`
  .pfsheet .pfcard{width:min(820px, 100%)}
  .pfcard h3{font-size:1.2rem; margin:14px 0 8px}
  .pfseg{display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#F3EADA; padding:6px; border-radius:18px}
  .pfseg button{border:0; border-radius:14px; min-height:54px; font:600 1.1rem var(--display); background:transparent; color:var(--ink); cursor:pointer}
  .pfseg button[aria-checked="true"]{background:var(--sun); box-shadow:0 4px 0 var(--sun-d)}
  .pfsrc{display:grid; gap:4px; margin-top:8px}
  .pfrow{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:2px solid #EFE4D0; font:600 1.1rem var(--display)}
  .pfrow small{display:block; font:500 .95rem var(--body); color:var(--ink-soft)}
  .pfrow small .btn{min-height:48px; margin-top:6px}
  .pfgrid{display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:8px; max-height:40vh; overflow-y:auto; padding:4px; margin-top:8px}
  .pftile{position:relative; aspect-ratio:1; border:0; padding:0; border-radius:14px; overflow:hidden; background:#E7DCC8; cursor:pointer; box-shadow:0 3px 0 var(--card-edge)}
  .pftile img{width:100%; height:100%; object-fit:cover; display:block}
  .pftile.on{outline:5px solid var(--leaf); outline-offset:-5px}
  .pftile.on::after{content:"✔"; position:absolute; right:6px; top:6px; width:30px; height:30px; border-radius:50%; background:var(--leaf); color:#fff; display:grid; place-items:center; font:700 1.1rem var(--display)}
  .pfmore{grid-column:1 / -1}
  .pfsecs{display:flex; align-items:center; gap:10px; flex-wrap:wrap}
  .pfsecs input{flex:1 1 160px; min-width:0; height:40px; accent-color:var(--coral)}
  .pfsecs .btn{min-height:52px; width:52px; padding:0; font-size:1.6rem}
  .pfsecs b{font:600 1.15rem var(--display); min-width:7.5em}
  `);

  const ob = $('#frameOptsBtn'); if (ob) ob.onclick = openOpts;
  const nb = $('#frameNowBtn'); if (nb) nb.onclick = () => { sfx.tap(); $('#settings').hidden = true; show(); };
  restore();
})();
