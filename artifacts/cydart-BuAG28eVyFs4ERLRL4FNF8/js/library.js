/* CydArt Library: photos stored on this device (IndexedDB) with albums, favorites, ratings, tags,
   a full-screen viewer, slideshow and batch convert. */
window.CP = window.CP || {};
(function (CP) {
  'use strict';
  const U = CP.util, el = U.el;

  /* ---------------- storage ---------------- */
  const DB_NAME = 'cydphoto-library', DB_VER = 1;
  let dbP = null;
  function db() {
    if (!dbP) dbP = new Promise((res, rej) => {
      let r;
      try { r = indexedDB.open(DB_NAME, DB_VER); } catch (e) { rej(e); return; }
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('photos')) { const s = d.createObjectStore('photos', { keyPath: 'id' }); s.createIndex('added', 'added'); }
        if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs');
        if (!d.objectStoreNames.contains('albums')) d.createObjectStore('albums', { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbP;
  }
  const tx = async (stores, mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(stores, mode); let out;
      Promise.resolve(fn(t)).then((v) => { out = v; });
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  };
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  const L = CP.lib = { cache: [], albums: [], available: true };
  L.load = async () => {
    try {
      const [photos, albums] = await tx(['photos', 'albums'], 'readonly', async (t) => [await req(t.objectStore('photos').getAll()), await req(t.objectStore('albums').getAll())]);
      L.cache = photos || []; L.albums = (albums || []).sort((a, b) => a.name.localeCompare(b.name));
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    } catch (e) { console.warn('Library unavailable', e); L.available = false; }
    CP.emit('library');
  };
  L.getBlob = (key) => tx(['blobs'], 'readonly', (t) => req(t.objectStore('blobs').get(key)));
  const putRec = (rec) => tx(['photos'], 'readwrite', (t) => { t.objectStore('photos').put(rec); });
  async function makeThumb(canvas) {
    const s = Math.min(1, 480 / Math.max(canvas.width, canvas.height));
    const c = U.canvas(canvas.width * s, canvas.height * s), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(canvas, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.84));
  }

  L.addFiles = async (files, { album = null, silent = false } = {}) => {
    if (!L.available) { CP.ui.toast('Library storage is not available in this browser window'); return []; }
    files = Array.from(files).filter((f) => f.size > 0);
    if (!files.length) return [];
    const prog = files.length > 1 || !silent ? CP.ui.progress(`Adding ${files.length} item${files.length > 1 ? 's' : ''} to your library…`) : null;
    const added = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const isVid = CP.media && CP.media.isMedia(f.name, f.type);
        let canvas, duration = 0;
        if (isVid) { // videos: thumbnail from a frame (a film card if this browser can't preview the format)
          const u = URL.createObjectURL(f);
          try { const pr = await CP.media.probe(u, CP.media.isAudio(f.name, f.type) ? 'audio' : 'video'); duration = pr.duration; canvas = pr.width ? await CP.media.grabFrame(u, Math.min(1, duration / 3), 640) : null; } catch (e) { canvas = null; }
          URL.revokeObjectURL(u);
          if (!canvas) { canvas = U.canvas(640, 400); const g = canvas.getContext('2d'); g.fillStyle = '#121a24'; g.fillRect(0, 0, 640, 400); g.fillStyle = '#38bdf8'; g.font = '700 54px sans-serif'; g.textAlign = 'center'; g.fillText((U.ext(f.name) || 'VIDEO').toUpperCase(), 320, 220); }
        } else canvas = await CP.decodeToCanvas(f, f.name);
        const thumb = await makeThumb(canvas);
        let taken = f.lastModified || Date.now(), camera = '';
        const ex = await CP.readExif(f);
        if (ex) { const dt = ex.DateTimeOriginal || ex.CreateDate; if (dt instanceof Date && !isNaN(dt)) taken = dt.getTime(); camera = [ex.Make, ex.Model].filter(Boolean).join(' '); }
        const rec = {
          id: U.uid(), name: f.name || 'Image', type: f.type || '', size: f.size, width: canvas.width, height: canvas.height,
          added: Date.now(), modified: Date.now(), taken, camera, favorite: false, rating: 0, tags: [], albums: album ? [album] : [], edited: false,
        };
        if (isVid) { rec.kind = 'video'; rec.duration = duration; }
        await tx(['photos', 'blobs'], 'readwrite', (t) => {
          t.objectStore('photos').put(rec); t.objectStore('blobs').put(f, rec.id + ':file'); t.objectStore('blobs').put(thumb, rec.id + ':thumb');
        });
        L.cache.push(rec); added.push(rec);
      } catch (e) { console.warn(e); CP.ui.toast(`Couldn't add ${f.name}: ${e.message || e}`); }
      prog && prog.set((i + 1) / files.length);
    }
    prog && prog.done();
    if (added.length && !silent) CP.ui.toast(`Added ${added.length} item${added.length > 1 ? 's' : ''} to your library`);
    CP.emit('library');
    return added;
  };
  L.update = async (id, patch) => {
    const r = L.cache.find((x) => x.id === id); if (!r) return;
    Object.assign(r, patch); await putRec(r); CP.emit('library-item', r);
  };
  L.remove = async (ids) => {
    await tx(['photos', 'blobs'], 'readwrite', (t) => {
      for (const id of ids) { t.objectStore('photos').delete(id); for (const k of ['file', 'thumb', 'original', 'project']) t.objectStore('blobs').delete(id + ':' + k); }
    });
    L.cache = L.cache.filter((r) => !ids.includes(r.id));
    thumbURLs.forEach((u, k) => { if (ids.includes(k)) { URL.revokeObjectURL(u); thumbURLs.delete(k); } });
    CP.emit('library');
  };
  /* Save an edited document back into the library (keeps the original for Revert). */
  L.saveDoc = async (doc, { asNew = false } = {}) => {
    if (!L.available) { CP.ui.toast('Library storage is not available'); return; }
    const flat = doc.flattened();
    const hasAlpha = (() => { const d = flat.getContext('2d').getImageData(0, 0, flat.width, flat.height).data; for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 255) return true; return false; })();
    const fmt = hasAlpha ? 'png' : 'jpeg';
    const blob = await CP.encodeCanvas(flat, fmt, { quality: 95 });
    const project = doc.layers.length > 1 ? await CP.encodeDoc(doc, 'psd') : null;
    const thumb = await makeThumb(flat);
    const name = U.baseName(doc.name) + (fmt === 'png' ? '.png' : '.jpg');
    let rec = !asNew && doc.libraryId && L.cache.find((r) => r.id === doc.libraryId);
    if (rec) {
      await tx(['photos', 'blobs'], 'readwrite', async (t) => {
        const bs = t.objectStore('blobs');
        if (!rec.edited) { const orig = await req(bs.get(rec.id + ':file')); if (orig) bs.put(orig, rec.id + ':original'); }
        bs.put(new File([blob], name, { type: blob.type }), rec.id + ':file'); bs.put(thumb, rec.id + ':thumb');
        if (project) bs.put(project, rec.id + ':project'); else bs.delete(rec.id + ':project');
        Object.assign(rec, { edited: true, modified: Date.now(), width: flat.width, height: flat.height, size: blob.size, type: blob.type, editedName: name });
        t.objectStore('photos').put(rec);
      });
      dropThumb(rec.id);
    } else {
      rec = { id: U.uid(), name, type: blob.type, size: blob.size, width: flat.width, height: flat.height, added: Date.now(), modified: Date.now(), taken: Date.now(), camera: '', favorite: false, rating: 0, tags: [], albums: L.view.album && L.view.album !== '*fav' ? [L.view.album] : [], edited: false };
      await tx(['photos', 'blobs'], 'readwrite', (t) => {
        t.objectStore('photos').put(rec); const bs = t.objectStore('blobs');
        bs.put(new File([blob], name, { type: blob.type }), rec.id + ':file'); bs.put(thumb, rec.id + ':thumb'); if (project) bs.put(project, rec.id + ':project');
      });
      L.cache.push(rec); doc.libraryId = rec.id;
    }
    doc.saved = true; CP.emit('doc', doc);
    CP.ui.toast('Saved to your Library');
    CP.emit('library');
  };
  L.revert = async (rec) => {
    const orig = await L.getBlob(rec.id + ':original'); if (!orig) return;
    const c = await CP.decodeToCanvas(orig, rec.name); const thumb = await makeThumb(c);
    await tx(['photos', 'blobs'], 'readwrite', (t) => {
      const bs = t.objectStore('blobs'); bs.put(orig, rec.id + ':file'); bs.put(thumb, rec.id + ':thumb'); bs.delete(rec.id + ':original'); bs.delete(rec.id + ':project');
      Object.assign(rec, { edited: false, width: c.width, height: c.height, size: orig.size, type: orig.type, editedName: null, modified: Date.now() }); t.objectStore('photos').put(rec);
    });
    dropThumb(rec.id); CP.emit('library'); CP.ui.toast('Restored the original photo');
  };
  /* Open a library photo in the editor (restoring layers if it was saved with them) */
  L.openInEditor = async (rec, mode = 'photo') => {
    if (rec.kind === 'video') { const f = await L.getBlob(rec.id + ':file'); CP.app.setMode('video', { sub: 'editor' }); CP.video.addMedia([new File([f], rec.name, { type: f.type })], { toTimeline: true }); return; }
    const t = CP.ui.progress('Opening ' + rec.name + '…');
    try {
      const proj = await L.getBlob(rec.id + ':project');
      let doc;
      if (proj) doc = await CP.decodeFile(new File([proj], U.baseName(rec.name) + '.psd'));
      else { const f = await L.getBlob(rec.id + ':file'); doc = await CP.decodeFile(f, rec.editedName || rec.name); }
      doc.name = U.baseName(rec.name); doc.libraryId = rec.id;
      CP.app.openEditor(mode); CP.addDoc(doc);
    } catch (e) { CP.ui.error('Could not open this photo', e); }
    finally { t.done(); }
  };

  L.createAlbum = async (name) => {
    const a = { id: U.uid(), name: name.trim() || 'Album', created: Date.now() };
    await tx(['albums'], 'readwrite', (t) => { t.objectStore('albums').put(a); });
    L.albums.push(a); L.albums.sort((x, y) => x.name.localeCompare(y.name)); CP.emit('library'); return a;
  };
  L.renameAlbum = async (a, name) => { a.name = name; await tx(['albums'], 'readwrite', (t) => { t.objectStore('albums').put(a); }); CP.emit('library'); };
  L.deleteAlbum = async (a) => {
    await tx(['albums', 'photos'], 'readwrite', (t) => { t.objectStore('albums').delete(a.id); for (const r of L.cache) if (r.albums.includes(a.id)) { r.albums = r.albums.filter((x) => x !== a.id); t.objectStore('photos').put(r); } });
    L.albums = L.albums.filter((x) => x !== a); if (L.view.album === a.id) L.view.album = null; CP.emit('library');
  };
  L.addToAlbum = async (ids, albumId) => {
    await tx(['photos'], 'readwrite', (t) => { for (const r of L.cache) if (ids.includes(r.id) && !r.albums.includes(albumId)) { r.albums.push(albumId); t.objectStore('photos').put(r); } });
    CP.emit('library');
  };
  L.removeFromAlbum = async (ids, albumId) => {
    await tx(['photos'], 'readwrite', (t) => { for (const r of L.cache) if (ids.includes(r.id)) { r.albums = r.albums.filter((x) => x !== albumId); t.objectStore('photos').put(r); } });
    CP.emit('library');
  };

  /* thumbnails */
  const thumbURLs = new Map();
  const dropThumb = (id) => { const u = thumbURLs.get(id); if (u) { URL.revokeObjectURL(u); thumbURLs.delete(id); } };
  L.thumbURL = async (id) => {
    if (thumbURLs.has(id)) return thumbURLs.get(id);
    const b = await L.getBlob(id + ':thumb'); if (!b) return '';
    const u = URL.createObjectURL(b); thumbURLs.set(id, u); return u;
  };

  /* backup */
  L.exportBackup = async (ids) => {
    const fflate = await CP.loadZip();
    const recs = ids ? L.cache.filter((r) => ids.includes(r.id)) : L.cache;
    const prog = CP.ui.progress('Packing your library…'); const files = {};
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      for (const k of ['file', 'original', 'project']) { const b = await L.getBlob(r.id + ':' + k); if (b) files[`photos/${r.id}/${k}`] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }]; }
      prog.set((i + 1) / recs.length);
    }
    files['library.json'] = fflate.strToU8(JSON.stringify({ app: 'CydArt', version: CP.VERSION, exported: new Date().toISOString(), photos: recs, albums: L.albums }, null, 1));
    const zip = await new Promise((res, rej) => fflate.zip(files, (err, out) => (err ? rej(err) : res(out))));
    prog.done();
    U.download(new Blob([zip], { type: 'application/zip' }), `CydArt-Library-${new Date().toISOString().slice(0, 10)}.zip`);
  };
  L.importBackup = async (file) => {
    const fflate = await CP.loadZip();
    const prog = CP.ui.progress('Restoring library backup…');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const data = await new Promise((res, rej) => fflate.unzip(bytes, (e, o) => (e ? rej(e) : res(o))));
      const meta = JSON.parse(fflate.strFromU8(data['library.json']));
      if (meta.app !== 'CydArt' && meta.app !== 'CydPhoto') throw new Error('This is not a CydArt library backup');
      const have = new Set(L.cache.map((r) => r.id)); let n = 0;
      for (const a of meta.albums || []) if (!L.albums.some((x) => x.id === a.id)) { await tx(['albums'], 'readwrite', (t) => { t.objectStore('albums').put(a); }); L.albums.push(a); }
      for (let i = 0; i < meta.photos.length; i++) {
        const r = meta.photos[i]; if (have.has(r.id)) continue;
        const fileBytes = data[`photos/${r.id}/file`]; if (!fileBytes) continue;
        const f = new File([fileBytes], r.editedName || r.name, { type: r.type });
        const c = await CP.decodeToCanvas(f, f.name); const thumb = await makeThumb(c);
        await tx(['photos', 'blobs'], 'readwrite', (t) => {
          t.objectStore('photos').put(r); const bs = t.objectStore('blobs'); bs.put(f, r.id + ':file'); bs.put(thumb, r.id + ':thumb');
          for (const k of ['original', 'project']) { const b = data[`photos/${r.id}/${k}`]; if (b) bs.put(new Blob([b]), r.id + ':' + k); }
        });
        L.cache.push(r); n++; prog.set((i + 1) / meta.photos.length);
      }
      CP.ui.toast(`Restored ${n} photo${n === 1 ? '' : 's'}`);
    } catch (e) { CP.ui.error('Could not restore that backup', e); }
    finally { prog.done(); CP.emit('library'); }
  };

  /* batch convert selected photos into a zip */
  L.convert = async (ids, fmtId, quality) => {
    const fmt = CP.SAVE_FORMATS.find((f) => f.id === fmtId);
    const fflate = await CP.loadZip(); const files = {}; const used = new Set();
    const prog = CP.ui.progress(`Converting ${ids.length} photo${ids.length > 1 ? 's' : ''} to ${fmt.label}…`);
    try {
      for (let i = 0; i < ids.length; i++) {
        const r = L.cache.find((x) => x.id === ids[i]); const f = await L.getBlob(r.id + ':file');
        const c = await CP.decodeToCanvas(f, r.editedName || r.name);
        const b = await CP.encodeCanvas(c, fmtId, { quality });
        let nm = U.baseName(r.name) + '.' + fmt.ext, k = 2; while (used.has(nm)) nm = `${U.baseName(r.name)} (${k++}).${fmt.ext}`; used.add(nm);
        files[nm] = [new Uint8Array(await b.arrayBuffer()), { level: 0 }];
        prog.set((i + 1) / ids.length);
      }
      if (ids.length === 1) { const nm = Object.keys(files)[0]; U.download(new Blob([files[nm][0]], { type: fmt.mime }), nm); }
      else { const zip = await new Promise((res, rej) => fflate.zip(files, (e, o) => (e ? rej(e) : res(o)))); U.download(new Blob([zip], { type: 'application/zip' }), `CydArt-${fmt.ext.toUpperCase()}-${ids.length}.zip`); }
    } catch (e) { CP.ui.error('Conversion failed', e); }
    finally { prog.done(); }
  };

  /* ---------------- Library UI ---------------- */
  L.view = { album: null, search: '', sort: 'taken-desc', size: 180, selected: new Set(), last: null };
  function filtered() {
    const v = L.view; let list = L.cache.slice();
    if (v.album === '*fav') list = list.filter((r) => r.favorite);
    else if (v.album === '*recent') { const cut = Date.now() - 1000 * 60 * 60 * 24 * 30; list = list.filter((r) => r.added > cut); }
    else if (v.album === '*edited') list = list.filter((r) => r.edited);
    else if (v.album) list = list.filter((r) => r.albums.includes(v.album));
    if (v.search) { const q = v.search.toLowerCase(); list = list.filter((r) => r.name.toLowerCase().includes(q) || (r.tags || []).some((t) => t.toLowerCase().includes(q)) || (r.camera || '').toLowerCase().includes(q)); }
    const [k, dir] = v.sort.split('-'); const m = dir === 'desc' ? -1 : 1;
    list.sort((a, b) => (k === 'name' ? a.name.localeCompare(b.name) : k === 'rating' ? (a.rating - b.rating) || (a.taken - b.taken) : (a[k] || 0) - (b[k] || 0)) * m);
    return list;
  }
  L.filtered = filtered;

  let root, grid, io;
  L.mount = (container) => {
    root = container;
    root.innerHTML = `
      <aside class="lib-side" aria-label="Library sections">
        <div class="lib-side-head">Library</div>
        <nav class="lib-nav" id="lib-nav"></nav>
        <div class="lib-side-head row">Albums <button class="icon-btn sm" id="lib-new-album" aria-label="New album" title="New album">+</button></div>
        <nav class="lib-nav" id="lib-albums"></nav>
        <div class="lib-storage" id="lib-storage"></div>
        <div class="lib-side-actions">
          <button class="btn ghost sm" id="lib-backup">Back up library</button>
          <button class="btn ghost sm" id="lib-restore">Restore backup</button>
        </div>
      </aside>
      <section class="lib-main">
        <div class="lib-toolbar">
          <button class="btn primary raised" id="lib-import">Import photos</button>
          <button class="btn raised" id="lib-import-folder">Import folder</button>
          <div class="lib-search"><input type="search" id="lib-search" placeholder="Search name, tag, camera" aria-label="Search library"></div>
          <label class="lib-sort">Sort
            <select id="lib-sort" aria-label="Sort photos">
              <option value="taken-desc">Date taken (newest)</option><option value="taken-asc">Date taken (oldest)</option>
              <option value="added-desc">Date added</option><option value="name-asc">Name</option>
              <option value="size-desc">File size</option><option value="rating-desc">Rating</option>
            </select></label>
          <label class="lib-zoom" title="Thumbnail size"><span class="sr">Thumbnail size</span><input type="range" id="lib-size" min="110" max="360" value="180"></label>
          <button class="btn raised" id="lib-slideshow" title="Slideshow">Slideshow</button>
        </div>
        <div class="lib-selbar" id="lib-selbar" hidden>
          <span id="lib-selcount"></span>
          <button class="btn sm" data-act="edit">Edit</button>
          <button class="btn sm" data-act="fav">Favorite</button>
          <button class="btn sm" data-act="album">Add to album</button>
          <button class="btn sm" data-act="unalbum" id="lib-unalbum">Remove from album</button>
          <button class="btn sm" data-act="convert">Convert / Export</button>
          <button class="btn sm danger" data-act="delete">Delete</button>
          <button class="btn sm ghost" data-act="all">Select all</button>
          <button class="btn sm ghost" data-act="none">Clear</button>
        </div>
        <div class="lib-grid" id="lib-grid" tabindex="0" aria-label="Photos"></div>
        <div class="lib-empty" id="lib-empty" hidden>
          <div class="lib-empty-art" aria-hidden="true"></div>
          <h2>Your library is empty</h2>
          <p>Import photos from your computer or phone. Photos in HEIC, RAW, TIFF, PSD and hundreds of other formats, and videos. Photos stay on this device.</p>
          <button class="btn primary raised lg" id="lib-import2">Import photos</button>
        </div>
      </section>`;
    grid = root.querySelector('#lib-grid');
    const pickFiles = (dir) => CP.ui.pickFiles({ multiple: true, directory: dir }).then((f) => f.length && L.addFiles(f, { album: L.view.album && !L.view.album.startsWith('*') ? L.view.album : null }));
    root.querySelector('#lib-import').onclick = () => pickFiles(false);
    root.querySelector('#lib-import2').onclick = () => pickFiles(false);
    root.querySelector('#lib-import-folder').onclick = () => pickFiles(true);
    root.querySelector('#lib-search').oninput = U.debounce((e) => { L.view.search = e.target.value; renderGrid(); }, 150);
    root.querySelector('#lib-sort').onchange = (e) => { L.view.sort = e.target.value; renderGrid(); };
    root.querySelector('#lib-size').oninput = (e) => { L.view.size = +e.target.value; grid.style.setProperty('--thumb', L.view.size + 'px'); };
    root.querySelector('#lib-slideshow').onclick = () => { const l = filtered(); if (l.length) L.viewer.open(l, 0, true); };
    root.querySelector('#lib-new-album').onclick = async () => { const n = await CP.ui.prompt('New album', 'Album name', 'My album'); if (n) { const a = await L.createAlbum(n); L.view.album = a.id; renderAll(); } };
    root.querySelector('#lib-backup').onclick = () => L.cache.length ? L.exportBackup() : CP.ui.toast('Nothing to back up yet');
    root.querySelector('#lib-restore').onclick = async () => { const f = await CP.ui.pickFiles({ accept: '.zip' }); if (f[0]) L.importBackup(f[0]); };
    root.querySelector('#lib-selbar').onclick = (e) => { const b = e.target.closest('[data-act]'); if (b) selAction(b.dataset.act); };
    // drag & drop import
    root.addEventListener('dragover', (e) => { e.preventDefault(); root.classList.add('drop'); });
    root.addEventListener('dragleave', (e) => { if (!root.contains(e.relatedTarget)) root.classList.remove('drop'); });
    root.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); root.classList.remove('drop'); if (e.dataTransfer.files.length) L.addFiles(e.dataTransfer.files, { album: L.view.album && !L.view.album.startsWith('*') ? L.view.album : null }); });
    grid.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && L.view.selected.size) { e.preventDefault(); selAction('delete'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selAction('all'); }
    });
    io = new IntersectionObserver((ents) => {
      for (const en of ents) if (en.isIntersecting) { const img = en.target; io.unobserve(img); L.thumbURL(img.dataset.id).then((u) => { if (u) img.src = u; }); }
    }, { root: grid, rootMargin: '400px' });
    CP.on('library', renderAll);
    CP.on('library-item', (r) => updateTile(r));
    renderAll();
  };

  function navItem(id, label, count, icon) {
    const b = el('button', { class: 'lib-nav-item' + (L.view.album === id ? ' on' : ''), type: 'button' },
      el('span', { class: 'ico', html: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg>` }), el('span', { class: 'lbl' }, label), el('span', { class: 'cnt' }, String(count)));
    b.onclick = () => { L.view.album = id; L.view.selected.clear(); renderAll(); };
    return b;
  }
  function renderAll() {
    if (!root) return;
    const nav = root.querySelector('#lib-nav'); nav.innerHTML = '';
    nav.append(
      navItem(null, 'All photos', L.cache.length, 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6'),
      navItem('*fav', 'Favorites', L.cache.filter((r) => r.favorite).length, 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'),
      navItem('*recent', 'Recently added', L.cache.filter((r) => r.added > Date.now() - 2592e6).length, 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7v5l3 2'),
      navItem('*edited', 'Edited', L.cache.filter((r) => r.edited).length, 'M4 20h4L19 9l-4-4L4 16z'),
    );
    const al = root.querySelector('#lib-albums'); al.innerHTML = '';
    if (!L.albums.length) al.append(el('p', { class: 'muted sm pad' }, 'No albums yet. Use + to make one.'));
    for (const a of L.albums) {
      const it = navItem(a.id, a.name, L.cache.filter((r) => r.albums.includes(a.id)).length, 'M3 7h6l2 2h10v10H3z');
      it.addEventListener('contextmenu', (e) => { e.preventDefault(); albumMenu(a, e); });
      const more = el('span', { class: 'more', role: 'button', tabindex: '0', 'aria-label': 'Album options', title: 'Album options' }, '⋯');
      more.onclick = (e) => { e.stopPropagation(); albumMenu(a, e); };
      it.append(more); al.append(it);
    }
    root.querySelector('#lib-unalbum').hidden = !(L.view.album && !L.view.album.startsWith('*'));
    renderStorage(); renderGrid();
  }
  function albumMenu(a, e) {
    CP.ui.contextMenu(e.clientX, e.clientY, [
      ['Rename album', async () => { const n = await CP.ui.prompt('Rename album', 'Album name', a.name); if (n) L.renameAlbum(a, n); }],
      ['Slideshow', () => { const l = L.cache.filter((r) => r.albums.includes(a.id)); if (l.length) L.viewer.open(l, 0, true); }],
      ['Export album as zip', () => L.exportBackup(L.cache.filter((r) => r.albums.includes(a.id)).map((r) => r.id))],
      ['Delete album (keeps photos)', async () => { if (await CP.ui.confirm(`Delete the album "${a.name}"? Photos stay in your library.`)) L.deleteAlbum(a); }],
    ]);
  }
  async function renderStorage() {
    const s = root.querySelector('#lib-storage');
    try {
      const e = await navigator.storage.estimate();
      const pct = Math.min(100, (e.usage / e.quota) * 100);
      s.innerHTML = `<div class="meter"><i style="width:${pct.toFixed(1)}%"></i></div><span>${U.fmtBytes(e.usage)} used of ${U.fmtBytes(e.quota)}</span>`;
    } catch (err) { s.textContent = L.available ? '' : 'Storage unavailable in this window'; }
  }
  function renderGrid() {
    if (!grid) return;
    const list = filtered();
    grid.innerHTML = ''; grid.style.setProperty('--thumb', L.view.size + 'px');
    root.querySelector('#lib-empty').hidden = !!L.cache.length;
    grid.hidden = !L.cache.length;
    if (L.cache.length && !list.length) grid.append(el('p', { class: 'muted pad' }, 'No photos match.'));
    const frag = document.createDocumentFragment();
    list.forEach((r, i) => frag.append(tile(r, i, list)));
    grid.append(frag);
    updateSelBar();
  }
  function tile(r, i, list) {
    const img = el('img', { alt: r.name, 'data-id': r.id, draggable: 'false', decoding: 'async' });
    io.observe(img);
    const t = el('div', { class: 'tile' + (L.view.selected.has(r.id) ? ' sel' : ''), 'data-id': r.id, tabindex: '0', role: 'button', 'aria-label': r.name },
      el('div', { class: 'tile-img' }, img),
      el('div', { class: 'tile-meta' }, el('span', { class: 'nm' }, r.name), el('span', { class: 'fmt' }, (U.ext(r.editedName || r.name) || '').toUpperCase())),
      el('button', { class: 'tile-check', type: 'button', 'aria-label': 'Select', title: 'Select' }),
      el('button', { class: 'tile-fav' + (r.favorite ? ' on' : ''), type: 'button', 'aria-label': r.favorite ? 'Unfavorite' : 'Favorite', title: 'Favorite', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>' }),
      r.edited ? el('span', { class: 'tile-badge' }, 'Edited') : r.kind === 'video' ? el('span', { class: 'tile-badge' }, '▶ ' + CP.media.fmtTime(r.duration || 0)) : null,
      r.rating ? el('span', { class: 'tile-stars' }, '★'.repeat(r.rating)) : null,
    );
    t.querySelector('.tile-check').onclick = (e) => { e.stopPropagation(); toggleSel(r.id, e, list); };
    t.querySelector('.tile-fav').onclick = (e) => { e.stopPropagation(); L.update(r.id, { favorite: !r.favorite }).then(() => renderAll()); };
    t.onclick = (e) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey || L.view.selected.size) { toggleSel(r.id, e, list); return; }
      L.viewer.open(list, i);
    };
    t.ondblclick = (e) => { e.preventDefault(); L.openInEditor(r); };
    t.onkeydown = (e) => { if (e.key === 'Enter') L.viewer.open(list, i); if (e.key === ' ') { e.preventDefault(); toggleSel(r.id, e, list); } };
    t.oncontextmenu = (e) => {
      e.preventDefault();
      CP.ui.contextMenu(e.clientX, e.clientY, [
        ['View', () => L.viewer.open(list, i)], ['Edit in Photo', () => L.openInEditor(r, 'photo')], ['Edit in Draw', () => L.openInEditor(r, 'draw')],
        ['Download original', async () => { const f = await L.getBlob(r.id + ':file'); U.download(f, r.editedName || r.name); }],
        ['Convert…', async () => { const f = await L.getBlob(r.id + ':file'); CP.converter.open([new File([f], r.editedName || r.name, { type: f.type })]); }], r.edited ? ['Revert to original', () => L.revert(r)] : null,
        ['Delete', async () => { if (await CP.ui.confirm(`Delete "${r.name}" from your library?`)) L.remove([r.id]); }],
      ].filter(Boolean));
    };
    return t;
  }
  function updateTile(r) { const t = grid && grid.querySelector(`.tile[data-id="${r.id}"]`); if (t) { const f = t.querySelector('.tile-fav'); f.classList.toggle('on', r.favorite); } }
  function toggleSel(id, e, list) {
    const s = L.view.selected;
    if (e && e.shiftKey && L.view.last) {
      const a = list.findIndex((r) => r.id === L.view.last), b = list.findIndex((r) => r.id === id);
      for (let k = Math.min(a, b); k <= Math.max(a, b); k++) s.add(list[k].id);
    } else if (s.has(id)) s.delete(id); else s.add(id);
    L.view.last = id;
    grid.querySelectorAll('.tile').forEach((t) => t.classList.toggle('sel', s.has(t.dataset.id)));
    updateSelBar();
  }
  function updateSelBar() {
    const n = L.view.selected.size; const bar = root.querySelector('#lib-selbar');
    bar.hidden = !n; root.querySelector('#lib-selcount').textContent = `${n} selected`;
    root.classList.toggle('selecting', n > 0);
  }
  async function selAction(act) {
    const ids = [...L.view.selected];
    if (act === 'all') { filtered().forEach((r) => L.view.selected.add(r.id)); renderGrid(); return; }
    if (act === 'none') { L.view.selected.clear(); renderGrid(); return; }
    if (!ids.length) return;
    if (act === 'edit') { const r = L.cache.find((x) => x.id === ids[0]); L.openInEditor(r); }
    if (act === 'fav') { const all = ids.every((id) => L.cache.find((r) => r.id === id).favorite); for (const id of ids) await L.update(id, { favorite: !all }); renderAll(); }
    if (act === 'album') {
      const items = L.albums.map((a) => [a.name, () => L.addToAlbum(ids, a.id).then(() => CP.ui.toast(`Added to ${a.name}`))]);
      items.push(['New album…', async () => { const n = await CP.ui.prompt('New album', 'Album name', 'My album'); if (n) { const a = await L.createAlbum(n); await L.addToAlbum(ids, a.id); CP.ui.toast(`Added to ${a.name}`); } }]);
      const b = root.querySelector('[data-act="album"]').getBoundingClientRect(); CP.ui.contextMenu(b.left, b.bottom + 4, items);
    }
    if (act === 'unalbum') { await L.removeFromAlbum(ids, L.view.album); L.view.selected.clear(); }
    if (act === 'convert') { const files = []; for (const id of ids) { const r = L.cache.find((x) => x.id === id), f = await L.getBlob(r.id + ':file'); files.push(new File([f], r.editedName || r.name, { type: f.type })); } CP.converter.open(files); }
    if (act === 'delete') { if (await CP.ui.confirm(`Delete ${ids.length} photo${ids.length > 1 ? 's' : ''} from your library? This can't be undone.`)) { L.view.selected.clear(); L.remove(ids); } }
  }
  function convertDialog(ids) {
    const opts = CP.SAVE_FORMATS.filter((f) => !f.disabled && f.id !== 'psd');
    const sel = el('select', { 'aria-label': 'Format' }, opts.map((f) => el('option', { value: f.id }, f.label)));
    const q = el('input', { type: 'range', min: 10, max: 100, value: 90, 'aria-label': 'Quality' }); const qv = el('span', {}, '90');
    q.oninput = () => (qv.textContent = q.value);
    const qrow = el('label', { class: 'field' }, el('span', {}, 'Quality'), q, qv);
    const desc = el('p', { class: 'muted sm' });
    const upd = () => { const f = opts.find((x) => x.id === sel.value); qrow.hidden = f.quality == null; desc.textContent = f.desc; };
    sel.onchange = upd; upd();
    CP.ui.dialog({
      title: `Convert ${ids.length} photo${ids.length > 1 ? 's' : ''}`,
      body: el('div', { class: 'stack' }, el('label', { class: 'field' }, el('span', {}, 'Format'), sel), qrow, desc, el('p', { class: 'muted sm' }, ids.length > 1 ? 'You will get a zip file of the converted copies. Originals are not changed.' : 'Originals are not changed.')),
      buttons: [['Cancel'], ['Convert', () => L.convert(ids, sel.value, +q.value), 'primary']],
    });
  }

  /* ---------------- full-screen viewer ---------------- */
  const V = L.viewer = { list: [], i: 0, zoom: 1, px: 0, py: 0, timer: null };
  let vroot;
  V.open = (list, i, slideshow = false) => {
    V.list = list; V.i = i;
    if (!vroot) build();
    vroot.hidden = false; document.body.classList.add('viewer-open');
    show(); vroot.focus();
    if (slideshow) V.play(); else V.stop();
  };
  V.close = () => { V.stop(); if (V.player) V.player.stop(); if (vroot) vroot.hidden = true; document.body.classList.remove('viewer-open'); if (V.url) { URL.revokeObjectURL(V.url); V.url = null; } renderAll(); };
  V.play = () => { V.stop(); vroot.classList.add('playing'); V.timer = setInterval(() => go(1, true), 3500); vroot.querySelector('#v-play').textContent = 'Pause'; };
  V.stop = () => { clearInterval(V.timer); V.timer = null; if (vroot) { vroot.classList.remove('playing'); vroot.querySelector('#v-play').textContent = 'Slideshow'; } };
  function build() {
    vroot = el('div', { class: 'viewer', tabindex: '-1', role: 'dialog', 'aria-label': 'Photo viewer', hidden: true });
    vroot.innerHTML = `
      <div class="v-top">
        <button class="icon-btn" id="v-close" aria-label="Close viewer" title="Close (Esc)"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        <div class="v-title"><b id="v-name"></b><span id="v-sub"></span></div>
        <div class="v-actions">
          <button class="icon-btn" id="v-fav" aria-label="Favorite" title="Favorite (F)"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg></button>
          <div class="v-stars" id="v-stars" role="radiogroup" aria-label="Rating"></div>
          <button class="btn sm raised" id="v-play">Slideshow</button>
          <button class="btn sm raised" id="v-info">Info</button>
          <button class="btn sm raised" id="v-dl">Download</button>
          <button class="btn sm primary raised" id="v-edit">Edit</button>
          <button class="icon-btn" id="v-del" aria-label="Delete" title="Delete"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
        </div>
      </div>
      <div class="v-stage" id="v-stage"><img id="v-img" alt=""><div class="v-loading" id="v-loading">Loading…</div></div>
      <button class="v-nav prev" id="v-prev" aria-label="Previous photo"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <button class="v-nav next" id="v-next" aria-label="Next photo"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
      <aside class="v-info" id="v-infopanel" hidden></aside>
      <div class="v-strip" id="v-strip"></div>`;
    document.body.append(vroot);
    const $ = (s) => vroot.querySelector(s);
    $('#v-close').onclick = V.close;
    $('#v-prev').onclick = () => go(-1); $('#v-next').onclick = () => go(1);
    $('#v-play').onclick = () => (V.timer ? V.stop() : V.play());
    $('#v-info').onclick = () => { const p = $('#v-infopanel'); p.hidden = !p.hidden; if (!p.hidden) info(); };
    $('#v-fav').onclick = () => { const r = cur(); L.update(r.id, { favorite: !r.favorite }).then(meta); };
    $('#v-edit').onclick = () => { const r = cur(); V.close(); L.openInEditor(r); };
    $('#v-dl').onclick = async () => { const r = cur(); const f = await L.getBlob(r.id + ':file'); U.download(f, r.editedName || r.name); };
    $('#v-del').onclick = async () => { const r = cur(); if (await CP.ui.confirm(`Delete "${r.name}" from your library?`)) { await L.remove([r.id]); V.list = V.list.filter((x) => x.id !== r.id); if (!V.list.length) V.close(); else { V.i = Math.min(V.i, V.list.length - 1); show(); } } };
    const stage = $('#v-stage'), img = $('#v-img');
    stage.addEventListener('wheel', (e) => { if (e.target.closest('.vp')) return; e.preventDefault(); const k = Math.exp(-e.deltaY * 0.0015); V.zoom = U.clamp(V.zoom * k, 1, 12); if (V.zoom === 1) { V.px = V.py = 0; } apply(); }, { passive: false });
    stage.addEventListener('dblclick', (e) => { if (e.target.closest('.vp')) return; V.zoom = V.zoom > 1 ? 1 : 2.5; V.px = V.py = 0; apply(); });
    let drag = null, swipe = null;
    stage.addEventListener('pointerdown', (e) => { if (e.target.closest('.vp')) return; if (V.zoom > 1) { drag = { x: e.clientX, y: e.clientY, px: V.px, py: V.py }; stage.setPointerCapture(e.pointerId); } else swipe = { x: e.clientX, t: Date.now() }; });
    stage.addEventListener('pointermove', (e) => { if (drag) { V.px = drag.px + e.clientX - drag.x; V.py = drag.py + e.clientY - drag.y; apply(); } });
    stage.addEventListener('pointerup', (e) => { if (swipe && Date.now() - swipe.t < 500 && Math.abs(e.clientX - swipe.x) > 60) go(e.clientX < swipe.x ? 1 : -1); drag = null; swipe = null; });
    const apply = () => { img.style.transform = `translate(${V.px}px, ${V.py}px) scale(${V.zoom})`; stage.classList.toggle('zoomed', V.zoom > 1); };
    V.apply = apply;
    vroot.addEventListener('keydown', (e) => {
      if (e.target.closest('input,textarea')) return;
      const k = e.key;
      if (k === 'Escape') V.close(); else if (k === 'ArrowRight') go(1); else if (k === 'ArrowLeft') go(-1);
      else if (k === ' ') { e.preventDefault(); V.timer ? V.stop() : V.play(); }
      else if (k === 'f' || k === 'F') $('#v-fav').click(); else if (k === 'e' || k === 'E') $('#v-edit').click(); else if (k === 'i' || k === 'I') $('#v-info').click();
      else if (/^[0-5]$/.test(k)) { const r = cur(); L.update(r.id, { rating: +k }).then(meta); }
      else if (k === 'Delete') $('#v-del').click();
      else return;
      e.preventDefault();
    });
  }
  const cur = () => V.list[V.i];
  function go(d, wrap) { if (!V.list.length) return; V.i = wrap ? (V.i + d + V.list.length) % V.list.length : U.clamp(V.i + d, 0, V.list.length - 1); show(); }
  async function show() {
    const r = cur(); if (!r) return; const $ = (s) => vroot.querySelector(s);
    V.zoom = 1; V.px = V.py = 0; V.apply && V.apply();
    meta();
    const img = $('#v-img'), ld = $('#v-loading'); ld.hidden = false;
    if (r.kind === 'video') {
      img.hidden = true; ld.hidden = true;
      if (!V.player) V.player = new CP.Player($('#v-stage'), { onEdit: (c) => { V.close(); CP.app.setMode('video', { sub: 'editor' }); CP.video.addMedia([c.file], { toTimeline: true }); }, onSnapshot: (c, name) => { V.close(); CP.app.openEditor('photo'); CP.addDoc(CP.newDocFromCanvas(c, name)); } });
      V.player.root.hidden = false; const f = await L.getBlob(r.id + ':file'); if (cur() !== r) return;
      V.player.load(new File([f], r.name, { type: f.type }), r.name); strip(); if (!$('#v-infopanel').hidden) info(); return;
    }
    img.hidden = false; if (V.player) { V.player.stop(); V.player.root.hidden = true; }
    const thumb = await L.thumbURL(r.id); if (cur() !== r) return;
    img.src = thumb; img.alt = r.name;
    try {
      const f = await L.getBlob(r.id + ':file'); if (cur() !== r) return;
      let url;
      if (CP.isNativeViewable(r.editedName || r.name, f.type)) url = URL.createObjectURL(f);
      else { const c = await CP.decodeToCanvas(f, r.editedName || r.name); const b = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92)); url = URL.createObjectURL(b); }
      if (cur() !== r) { URL.revokeObjectURL(url); return; }
      if (V.url) URL.revokeObjectURL(V.url); V.url = url; img.src = url;
    } catch (e) { CP.ui.toast('Showing preview only: ' + (e.message || e)); }
    ld.hidden = true;
    strip(); if (!$('#v-infopanel').hidden) info();
    // preload neighbour thumbs
    [V.i - 1, V.i + 1].forEach((k) => V.list[k] && L.thumbURL(V.list[k].id));
  }
  function meta() {
    const r = cur(), $ = (s) => vroot.querySelector(s);
    $('#v-name').textContent = r.name;
    $('#v-sub').textContent = `${V.i + 1} of ${V.list.length} · ${r.kind === 'video' ? 'Video · ' + CP.media.fmtTime(r.duration || 0) + ' · ' : ''}${r.width} × ${r.height} · ${U.fmtBytes(r.size)}${r.edited ? ' · Edited' : ''}`;
    $('#v-fav').classList.toggle('on', r.favorite); $('#v-fav').setAttribute('aria-pressed', r.favorite);
    const st = $('#v-stars'); st.innerHTML = '';
    for (let k = 1; k <= 5; k++) { const b = el('button', { class: 'star' + (k <= r.rating ? ' on' : ''), role: 'radio', 'aria-checked': k === r.rating, 'aria-label': k + ' star' + (k > 1 ? 's' : ''), type: 'button' }, '★'); b.onclick = () => L.update(r.id, { rating: r.rating === k ? 0 : k }).then(meta); st.append(b); }
  }
  async function strip() {
    const s = vroot.querySelector('#v-strip'); s.innerHTML = '';
    const from = Math.max(0, V.i - 12), to = Math.min(V.list.length, V.i + 13);
    for (let k = from; k < to; k++) {
      const r = V.list[k]; const im = el('img', { alt: '', class: k === V.i ? 'on' : '' });
      const b = el('button', { class: 'v-thumb' + (k === V.i ? ' on' : ''), 'aria-label': r.name, type: 'button' }, im);
      b.onclick = () => { V.i = k; show(); }; s.append(b);
      L.thumbURL(r.id).then((u) => (im.src = u));
    }
    const on = s.querySelector('.on'); on && on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  async function info() {
    const r = cur(), p = vroot.querySelector('#v-infopanel');
    const row = (k, v) => (v ? `<dt>${k}</dt><dd>${String(v).replace(/</g, '&lt;')}</dd>` : '');
    p.innerHTML = `<h3>Info</h3><dl>${row('Name', r.name)}${row('Format', (U.ext(r.editedName || r.name) || r.type).toUpperCase())}${row('Size', `${r.width} × ${r.height} px · ${U.fmtBytes(r.size)}`)}${row('Taken', new Date(r.taken).toLocaleString())}${row('Added', new Date(r.added).toLocaleString())}</dl><div id="v-exif" class="muted sm">Reading camera data…</div>
      <h3>Tags</h3><div class="tags" id="v-tags"></div><input id="v-tag-in" placeholder="Add a tag and press Enter" aria-label="Add tag">
      <h3>Albums</h3><div class="tags" id="v-albums"></div>${r.edited ? '<button class="btn sm" id="v-revert">Revert to original</button>' : ''}`;
    const tags = p.querySelector('#v-tags');
    const drawTags = () => { tags.innerHTML = ''; (r.tags || []).forEach((t) => { const c = el('button', { class: 'chip', type: 'button', title: 'Remove tag' }, t, ' ×'); c.onclick = () => { r.tags = r.tags.filter((x) => x !== t); L.update(r.id, { tags: r.tags }); drawTags(); }; tags.append(c); }); };
    drawTags();
    p.querySelector('#v-tag-in').onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { r.tags = [...new Set([...(r.tags || []), e.target.value.trim()])]; L.update(r.id, { tags: r.tags }); e.target.value = ''; drawTags(); } };
    const al = p.querySelector('#v-albums');
    if (!L.albums.length) al.append(el('span', { class: 'muted sm' }, 'No albums yet'));
    L.albums.forEach((a) => { const on = r.albums.includes(a.id); const c = el('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on }, a.name); c.onclick = async () => { on ? await L.removeFromAlbum([r.id], a.id) : await L.addToAlbum([r.id], a.id); info(); }; al.append(c); });
    const rv = p.querySelector('#v-revert'); if (rv) rv.onclick = async () => { await L.revert(r); show(); };
    const f = await L.getBlob(r.id + ':original') || await L.getBlob(r.id + ':file');
    const ex = await CP.readExif(f); const box = p.querySelector('#v-exif'); if (!box || cur() !== r) return;
    if (!ex) { box.textContent = 'No camera data in this file.'; return; }
    const fN = ex.FNumber ? 'ƒ/' + ex.FNumber : '', exp = ex.ExposureTime ? (ex.ExposureTime < 1 ? '1/' + Math.round(1 / ex.ExposureTime) : ex.ExposureTime) + ' s' : '';
    box.className = ''; box.innerHTML = `<dl>${row('Camera', [ex.Make, ex.Model].filter(Boolean).join(' '))}${row('Lens', ex.LensModel)}${row('Exposure', [fN, exp, ex.ISO ? 'ISO ' + ex.ISO : ''].filter(Boolean).join('  ·  '))}${row('Focal length', ex.FocalLength ? ex.FocalLength + ' mm' : '')}${row('Software', ex.Software)}${ex.latitude ? row('Location', `${ex.latitude.toFixed(5)}, ${ex.longitude.toFixed(5)}`) : ''}</dl>`;
  }
})(window.CP);
