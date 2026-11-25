/* Recall: the Music page.
   Plays the person's own songs from their MiVida music library (the mivida/ folder app shares this address, so it
   shares the folder link, playlists, shuffle, repeat and volume), plus Recall's built-in music on a second tab.
   Everything is per profile, like the rest of Recall. */
(function () {
  const { $, el, toast } = R;
  const esc = t => String(t ?? '').replace(/[<&>"]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' }[c]));
  /* MiVida's per-person storage keys (see mivida/index.html lsKey) */
  const mvKey = k => 'recall:' + (ACTIVE_PROFILE ? 'p:' + ACTIVE_PROFILE + ':' : '') + 'mivida:' + k;
  const mvGet = k => { try { return JSON.parse(localStorage.getItem(mvKey(k))); } catch (e) { return null; } };
  const mvSet = (k, v) => { try { localStorage.setItem(mvKey(k), JSON.stringify(v)); } catch (e) {} };
  const playlists = () => { const d = mvGet('blockwise:v1'); const p = d && d.settings && d.settings.playlists; return Array.isArray(p) ? p.filter(x => x && Array.isArray(x.tracks)) : []; };

  /* the folder link MiVida keeps in IndexedDB */
  const idb = (() => {
    let dbp;
    const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('mivida-folders' + (ACTIVE_PROFILE ? '-' + ACTIVE_PROFILE : ''), 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
    const run = (mode, fn) => open().then(db => new Promise((res, rej) => { const tx = db.transaction('kv', mode); const q = fn(tx.objectStore('kv')); tx.oncomplete = () => res(q.result); tx.onerror = () => rej(tx.error); }));
    return { get: k => run('readonly', s => s.get(k)).catch(() => null), set: (k, v) => run('readwrite', s => s.put(v, k)).catch(() => null) };
  })();
  const EMBEDDED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const fsaOK = () => typeof window.showDirectoryPicker === 'function' && !EMBEDDED;
  const EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i;

  /* ---------- library ---------- */
  const L = { status: 'none', name: '', handle: null, items: [], tok: 0, found: 0 };
  async function restore() {
    if (L.status !== 'none') return;
    const h = await idb.get('music');
    if (!h || typeof h.queryPermission !== 'function') return;
    L.handle = h; L.name = h.name;
    let p = 'prompt'; try { p = await h.queryPermission({ mode: 'read' }); } catch (e) {}
    if (p === 'granted') return scan(); L.status = 'ask'; render();
  }
  async function allow() {
    try { const p = await L.handle.requestPermission({ mode: 'read' }); if (p === 'granted') return scan(); toast('Access was not allowed'); }
    catch (e) { toast('Choose the music folder again'); L.status = 'none'; render(); }
  }
  async function choose() {
    if (fsaOK()) {
      try { const h = await window.showDirectoryPicker({ id: 'mivida-music', startIn: 'music', mode: 'read' }); L.handle = h; L.name = h.name; idb.set('music', h); return scan(); }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.webkitdirectory = true; i.hidden = true; document.body.append(i);
    i.onchange = () => { const files = [...i.files]; i.remove(); if (!files.length) return;
      const rel = f => (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name;
      L.handle = null; L.name = (files[0].webkitRelativePath || '').split('/')[0] || 'Music';
      index(files.filter(f => EXT.test(f.name)).slice(0, 5000).map(f => { const parts = rel(f).split('/'); const name = parts.pop(); return { path: rel(f), name, folder: parts.join('/'), file: f }; }), ++L.tok); };
    i.click();
  }
  async function scan() {
    const tok = ++L.tok; L.status = 'scan'; L.found = 0; render();
    const out = [];
    const walk = async (dir, path, depth) => {
      for await (const [name, h] of dir.entries()) {
        if (tok !== L.tok || out.length >= 5000) return;
        if (name.startsWith('.')) continue;
        if (h.kind === 'directory') { if (depth < 6) await walk(h, path + name + '/', depth + 1); }
        else if (EXT.test(name)) { out.push({ path: path + name, name, folder: path.slice(0, -1), h }); if (out.length % 40 === 0) { L.found = out.length; const n = $('#mmFound'); if (n) n.textContent = L.found; } }
      }
    };
    try { await walk(L.handle, '', 0); } catch (e) { if (tok === L.tok) { L.status = 'ask'; render(); } return; }
    if (tok === L.tok) index(out, tok);
  }
  async function index(out, tok) {
    L.status = 'scan'; L.found = out.length; render();
    const cache = mvGet('mivida:libcache:music') || {}, next = {};
    let i = 0;
    const work = async () => {
      while (i < out.length) {
        const it = out[i++]; if (tok !== L.tok) return;
        try {
          const f = it.file || await it.h.getFile(); const ck = f.size + ':' + f.lastModified, c = cache[it.path];
          if (c && c[0] === ck) Object.assign(it, c[1]); else Object.assign(it, await audioMeta(f, it));
          next[it.path] = [ck, { title: it.title, artist: it.artist, album: it.album }];
        } catch (e) { it.bad = true; }
      }
    };
    await Promise.all(Array.from({ length: 6 }, work));
    if (tok !== L.tok) return;
    mvSet('mivida:libcache:music', next);
    L.items = out.filter(x => !x.bad).sort((a, b) => a.folder.localeCompare(b.folder) || a.path.localeCompare(b.path, undefined, { numeric: true }));
    L.byPath = new Map(L.items.map(x => [x.path, x])); L.status = 'ready'; render();
  }
  async function audioMeta(f, it) {
    const base = it.name.replace(/\.[^.]+$/, '').replace(/^\d{1,3}[\s._-]+/, '').trim();
    let title = base || it.name, artist = '', album = it.folder.split('/').pop() || '';
    const m = base.match(/^(.+?)\s+-\s+(.+)$/); if (m) { artist = m[1]; title = m[2]; }
    try { const t = await id3(f); if (t.TIT2) title = t.TIT2; if (t.TPE1) artist = t.TPE1; if (t.TALB) album = t.TALB; } catch (e) {}
    return { title: title.slice(0, 200), artist: artist.slice(0, 200), album: album.slice(0, 200) };
  }
  async function id3(f) {
    const out = {}; if (!/\.mp3$/i.test(f.name)) return out;
    const b = new Uint8Array(await f.slice(0, 262144).arrayBuffer());
    if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return out;
    const ver = b[3], syn = o => (b[o] & 127) << 21 | (b[o + 1] & 127) << 14 | (b[o + 2] & 127) << 7 | (b[o + 3] & 127);
    const end = Math.min(10 + syn(6), b.length); let o = 10;
    if (ver < 3) return out;
    if (b[5] & 0x40) o += ver === 4 ? syn(10) : ((b[10] << 24 | b[11] << 16 | b[12] << 8 | b[13]) >>> 0) + 4;
    while (o + 10 < end) {
      const id = String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]); if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const sz = ver === 4 ? syn(o + 4) : ((b[o + 4] << 24 | b[o + 5] << 16 | b[o + 6] << 8 | b[o + 7]) >>> 0);
      if (sz <= 0 || o + 10 + sz > end) break;
      if (id === 'TIT2' || id === 'TPE1' || id === 'TALB') out[id] = id3text(b.subarray(o + 11, o + 10 + sz), b[o + 10]);
      o += 10 + sz;
    }
    return out;
  }
  function id3text(d, enc) {
    try {
      let lbl = enc === 3 ? 'utf-8' : enc === 2 ? 'utf-16be' : enc === 1 ? 'utf-16le' : 'windows-1252';
      if (enc === 1 && d[0] === 0xFE && d[1] === 0xFF) { lbl = 'utf-16be'; d = d.subarray(2); } else if (enc === 1 && d[0] === 0xFF && d[1] === 0xFE) d = d.subarray(2);
      return new TextDecoder(lbl).decode(d).replace(/\0/g, ' ').trim();
    } catch (e) { return ''; }
  }

  /* ---------- player ---------- */
  const PL = { queue: [], i: -1, hist: [], url: null, audio: new Audio(), shuffle: mvGet('mivida:shuffle') ?? false, repeat: mvGet('mivida:repeat') || 'all', heldForGame: false };
  PL.audio.preload = 'auto'; PL.audio.volume = mvGet('mivida:vol') ?? .8;
  const cur = () => PL.queue[PL.i];
  const isPlaying = () => !PL.audio.paused && !!PL.audio.src;
  function quietRecall() { if (Sound.playing) Sound.stop(); if (settings.track !== 'off') { store.set('mmPrevTrack', settings.track); settings.track = 'off'; saveSettings(); } }
  async function playCur() {
    const it = cur(); if (!it) return;
    try {
      const f = it.file || await it.h.getFile();
      if (PL.url) URL.revokeObjectURL(PL.url); PL.url = URL.createObjectURL(f);
      PL.audio.src = PL.url; PL.audio.muted = !!settings.mute; quietRecall(); await PL.audio.play();
    } catch (e) { if (e && e.name === 'NotAllowedError') toast('Press play to start'); else { toast('That song could not be played'); return next(true); } }
    sync();
  }
  function playQueue(list, start) {
    if (!list.length) return toast('No songs to play');
    PL.queue = list.slice(); PL.hist = [];
    PL.i = start != null ? start : PL.shuffle ? Math.floor(Math.random() * list.length) : 0;
    playCur();
  }
  function next(auto) {
    if (!PL.queue.length) return;
    if (auto === true && PL.repeat === 'one') { PL.audio.currentTime = 0; PL.audio.play().catch(() => {}); return; }
    PL.hist.push(PL.i);
    if (PL.shuffle && PL.queue.length > 1) { let n; do n = Math.floor(Math.random() * PL.queue.length); while (n === PL.i); PL.i = n; }
    else if (PL.i + 1 < PL.queue.length) PL.i++;
    else if (PL.repeat === 'all' || auto !== true) PL.i = 0;
    else { PL.audio.pause(); sync(); return; }
    playCur();
  }
  function prev() { if (PL.audio.currentTime > 4) { PL.audio.currentTime = 0; return; } if (!PL.queue.length) return; PL.i = PL.hist.length ? PL.hist.pop() : (PL.i - 1 + PL.queue.length) % PL.queue.length; playCur(); }
  function toggle() {
    if (!PL.queue.length) return playQueue(currentList());
    if (PL.audio.paused) { quietRecall(); PL.audio.play().catch(() => toast('Press play again')); } else PL.audio.pause();
  }
  function stopAll() { PL.audio.pause(); PL.audio.removeAttribute('src'); if (PL.url) URL.revokeObjectURL(PL.url); PL.url = null; PL.queue = []; PL.i = -1; sync(); }
  PL.audio.addEventListener('ended', () => next(true));
  ['play', 'pause'].forEach(ev => PL.audio.addEventListener(ev, sync));
  PL.audio.addEventListener('timeupdate', () => {
    const s = $('#mmSeek'); if (s && !s.matches(':active')) s.value = PL.audio.duration ? Math.round(PL.audio.currentTime / PL.audio.duration * 1000) : 0;
    const c = $('#mmCur'); if (c) c.textContent = fmt(PL.audio.currentTime); const d = $('#mmDur'); if (d) d.textContent = fmt(PL.audio.duration);
  });
  const fmt = s => !isFinite(s) ? '0:00' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* Recall's own music and Recall's sound settings stay in charge of the room */
  const origPlay = Sound.play;
  Sound.play = id => { if (isPlaying()) { PL.audio.pause(); } origPlay(id); };
  setInterval(() => { PL.audio.muted = !!settings.mute; }, 400);
  /* music games need quiet: hold the song and carry on afterwards */
  const origOpen = window.openGame, origHome = window.showHome;
  if (typeof origOpen === 'function') window.openGame = function (id) { if (MUSIC_GAMES.has(id) && isPlaying()) { PL.audio.pause(); PL.heldForGame = true; } return origOpen.apply(this, arguments); };
  if (typeof origHome === 'function') window.showHome = function () { const r = origHome.apply(this, arguments); if (PL.heldForGame) { PL.heldForGame = false; PL.audio.play().catch(() => {}); } return r; };
  /* opening MiVida pauses Recall, so the songs pause too */
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#mvBtn, a.mivida')) PL.audio.pause(); }, true);

  /* ---------- page ---------- */
  const V = { tab: store.get('mmTab', 'mine'), list: store.get('mmList', 'all'), q: '', picked: new Set(store.get('mmPicked', [])), pickMode: false };
  const savePicked = () => store.set('mmPicked', [...V.picked]);
  function currentList() {
    let list = L.items;
    if (V.list === 'picked') list = list.filter(x => V.picked.has(x.path));
    else if (V.list.startsWith('pl:')) { const p = playlists().find(x => x.id === V.list.slice(3)); list = p ? p.tracks.map(t => L.byPath.get(t)).filter(Boolean) : []; }
    else if (V.list.startsWith('f:')) { const f = V.list.slice(2); list = list.filter(x => x.folder === f || x.folder.startsWith(f + '/')); }
    const q = V.q.trim().toLowerCase();
    if (q) list = list.filter(x => (x.title + ' ' + x.artist + ' ' + x.album + ' ' + x.name).toLowerCase().includes(q));
    return list;
  }
  let page = null;
  function open() {
    sfx.tap(); if (page) return;
    page = el('div', 'xsheet mmsheet', `<div class="xcard mmcard" role="dialog" aria-labelledby="mmTitle"></div>`);
    page.addEventListener('click', e => { if (e.target === page) close(); });
    document.body.append(page); render(); restore();
  }
  function close() { if (page) { page.remove(); page = null; } }
  function render() {
    syncDock(); if (!page) return;
    const card = page.querySelector('.mmcard');
    const head = `<div class="mmhead"><h2 id="mmTitle">🎵 My Music</h2><button class="btn c-leaf" data-mm="close" type="button">Done</button></div>
      <div class="mmtabs" role="tablist"><button role="tab" type="button" data-tab="mine" aria-selected="${V.tab === 'mine'}">🎶 My music</button><button role="tab" type="button" data-tab="recall" aria-selected="${V.tab === 'recall'}">📻 Recall music</button></div>`;
    card.innerHTML = head + (V.tab === 'recall' ? recallHTML() : mineHTML()) + playerHTML();
    if (V.tab === 'recall') fillRecall();
    const s = $('#mmSearch'); if (s) { s.value = V.q; s.oninput = () => { V.q = s.value; renderSongs(); }; }
    renderSongs(); sync();
  }
  function mineHTML() {
    if (L.status === 'scan') return `<div class="mmempty"><b>Finding your songs…</b><p><span id="mmFound">${L.found}</span> found so far</p></div>`;
    if (L.status === 'ask') return `<div class="mmempty"><b>Your music folder: ${esc(L.name)}</b><p>Allow Recall to play the songs in it.</p><button class="btn c-sky" data-mm="allow" type="button">🔓 Allow</button></div>`;
    if (L.status !== 'ready') return `<div class="mmempty"><b>Play your own songs</b><p>Choose the music folder you use in MiVida. Your MiVida playlists show up here too.</p>
      <button class="btn c-sky" data-mm="choose" type="button">📁 Choose music folder</button>${fsaOK() ? '' : '<p class="mmnote">On this page the folder is used for this visit only. Run Recall from your PC in Chrome or Edge to keep it.</p>'}</div>`;
    const pls = playlists(), folders = [...new Set(L.items.map(x => x.folder.split('/')[0]).filter(Boolean))].sort();
    const chip = (id, label, n) => `<button type="button" class="mmchip" data-list="${esc(id)}" aria-pressed="${V.list === id}">${label}${n != null ? ` <small>${n}</small>` : ''}</button>`;
    return `<div class="mmlists">${chip('all', 'All songs', L.items.length)}${chip('picked', '✔ My picks', V.picked.size)}${pls.map(p => chip('pl:' + p.id, '♫ ' + esc(p.name), p.tracks.length)).join('')}${folders.map(f => chip('f:' + f, '📁 ' + esc(f))).join('')}</div>
      <div class="mmtools"><input id="mmSearch" class="xinput" type="search" placeholder="Find a song or singer" aria-label="Find a song or singer">
        <button class="btn c-leaf" data-mm="playall" type="button">▶ Play</button><button class="btn c-sun" data-mm="shuffleall" type="button">🔀 Random</button>
        <button class="btn c-card" data-mm="pick" type="button" aria-pressed="${V.pickMode}">${V.pickMode ? '✔ Done picking' : '✔ Pick songs'}</button></div>
      ${V.pickMode ? '<p class="mmnote">Tap songs to add or remove them from <b>My picks</b>.</p>' : ''}
      <div class="mmsongs" id="mmSongs"></div>
      <p class="mmnote">From <b>${esc(L.name)}</b>. <button class="linkish" data-mm="choose" type="button">Choose another folder</button></p>`;
  }
  function renderSongs() {
    const box = $('#mmSongs'); if (!box) return;
    const list = currentList(), playing = cur();
    box.innerHTML = list.length ? '' : `<p class="mmnote">${V.list === 'picked' ? 'No picks yet. Press “Pick songs” and tap the ones you like.' : 'No songs here.'}</p>`;
    list.slice(0, 600).forEach((it, i) => {
      const on = playing && playing.path === it.path, pk = V.picked.has(it.path);
      const b = el('button', 'mmsong' + (on ? ' on' : '') + (V.pickMode && pk ? ' pk' : ''), `<span class="mmic" aria-hidden="true">${V.pickMode ? (pk ? '✔' : '＋') : on && isPlaying() ? '🔊' : '▶'}</span><span class="mmt"><b>${esc(it.title)}</b><small>${esc(it.artist || it.album || it.folder)}</small></span>`);
      b.type = 'button';
      b.onclick = () => { if (V.pickMode) { pk ? V.picked.delete(it.path) : V.picked.add(it.path); savePicked(); renderSongs(); const c = page && page.querySelector('[data-list="picked"] small'); if (c) c.textContent = V.picked.size; } else playQueue(list, i); };
      box.append(b);
    });
  }
  function recallHTML() { return `<p class="mmnote">Recall's own music, played on the old radio. Choosing one stops your songs.</p><div class="opts" id="mmTracks"></div>`; }
  function fillRecall() {
    const box = $('#mmTracks'); if (!box) return;
    [{ id: 'off', name: 'No music', desc: 'Peace and quiet', ic: '🤫' }].concat(Object.entries(Sound.TRACKS).map(([id, t]) => Object.assign({ id }, t))).forEach(t => {
      const b = el('button', 'opt', `<span class="ic" aria-hidden="true">${t.ic}</span><b>${t.name}</b><small>${settings.track === t.id && t.id !== 'off' ? '▶ Playing now' : t.desc}</small>`);
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(settings.track === t.id));
      b.onclick = () => { settings.track = t.id; saveSettings(); if (t.id === 'off') Sound.stop(); else { stopAll(); Sound.play(t.id); } render(); };
      box.append(b);
    });
  }
  function playerHTML() {
    const it = cur();
    return `<div class="mmplayer">
      <div class="mmnow"><span class="mmart" aria-hidden="true">🎵</span><span class="mmt"><b id="mmNowT">${it ? esc(it.title) : 'Nothing playing'}</b><small id="mmNowA">${it ? esc(it.artist || it.album || '') : V.tab === 'mine' ? 'Tap a song to play it' : ''}</small></span></div>
      <div class="mmseek"><span id="mmCur">${fmt(PL.audio.currentTime)}</span><input type="range" id="mmSeek" min="0" max="1000" value="0" aria-label="Position in the song"><span id="mmDur">${fmt(PL.audio.duration)}</span></div>
      <div class="mmctl">
        <button class="btn c-card" data-mm="shuffle" type="button" aria-pressed="${PL.shuffle}" aria-label="Random order">🔀<small>${PL.shuffle ? 'Random on' : 'Random off'}</small></button>
        <button class="btn c-card" data-mm="prev" type="button" aria-label="Previous song">⏮<small>Back</small></button>
        <button class="btn c-leaf mmbig" data-mm="toggle" type="button" id="mmToggle" aria-label="Play or pause">${isPlaying() ? '⏸' : '▶'}<small>${isPlaying() ? 'Pause' : 'Play'}</small></button>
        <button class="btn c-card" data-mm="next" type="button" aria-label="Next song">⏭<small>Next</small></button>
        <button class="btn c-card" data-mm="repeat" type="button" aria-pressed="${PL.repeat !== 'off'}" aria-label="Repeat">${PL.repeat === 'one' ? '🔂' : '🔁'}<small>${{ all: 'Repeat all', one: 'Repeat one', off: 'Repeat off' }[PL.repeat]}</small></button>
        <button class="btn c-card" data-mm="stop" type="button" aria-label="Stop">⏹<small>Stop</small></button>
      </div>
      <div class="mmvol"><span aria-hidden="true">🔈</span><input type="range" id="mmVol" min="0" max="100" step="5" value="${Math.round(PL.audio.volume * 100)}" aria-label="Song volume"><span aria-hidden="true">🔊</span></div>
    </div>`;
  }
  function sync() {
    syncDock(); if (!page) return;
    const it = cur(), t = $('#mmToggle');
    if (t) t.innerHTML = `${isPlaying() ? '⏸' : '▶'}<small>${isPlaying() ? 'Pause' : 'Play'}</small>`;
    const n = $('#mmNowT'); if (n) n.textContent = it ? it.title : 'Nothing playing';
    const a = $('#mmNowA'); if (a) a.textContent = it ? (it.artist || it.album || '') : '';
    page.querySelectorAll('.mmsong').length && renderSongs();
  }
  function syncDock() { const b = $('#musicBtn'); if (b) b.classList.toggle('mmon', isPlaying()); }

  R.css(`
  .mmsheet .mmcard{width:min(860px, 100%); display:flex; flex-direction:column; gap:12px; max-height:calc(100% / var(--z, 1))}
  .mmhead{display:flex; align-items:center; justify-content:space-between; gap:12px}
  .mmhead h2{margin:0}
  .mmhead .btn{min-height:52px}
  .mmtabs{display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#F3EADA; padding:6px; border-radius:18px}
  .mmtabs button{border:0; border-radius:14px; min-height:54px; font:600 1.15rem var(--display); background:transparent; color:var(--ink); cursor:pointer}
  .mmtabs button[aria-selected="true"]{background:var(--sun); box-shadow:0 4px 0 var(--sun-d)}
  .mmempty{text-align:center; padding:18px 8px; display:grid; gap:8px; justify-items:center}
  .mmempty b{font:600 1.4rem var(--display)}
  .mmempty .btn{min-height:64px; font-size:1.25rem}
  .mmnote{font-size:1rem !important; color:var(--ink-soft); margin:2px 0 !important}
  .mmlists{display:flex; gap:8px; overflow-x:auto; padding-bottom:4px}
  .mmchip{flex:none; border:0; border-radius:999px; min-height:48px; padding:.4em 1em; font:600 1.05rem var(--display); background:#F3EADA; color:var(--ink); cursor:pointer; box-shadow:0 4px 0 var(--card-edge)}
  .mmchip small{font-size:.85rem; color:var(--ink-soft)}
  .mmchip[aria-pressed="true"]{background:var(--sky); box-shadow:0 4px 0 var(--sky-d)}
  .mmchip[aria-pressed="true"] small{color:var(--ink)}
  .mmtools{display:flex; flex-wrap:wrap; gap:8px}
  .mmtools .xinput{flex:1 1 220px; min-height:54px}
  .mmtools .btn{min-height:54px; flex:0 1 auto}
  .mmtools .btn[aria-pressed="true"]{--c:var(--sun); --d:var(--sun-d)}
  .mmsongs{display:grid; gap:8px; overflow-y:auto; min-height:120px; max-height:42vh; padding:2px}
  .mmsong{display:flex; align-items:center; gap:12px; text-align:left; border:0; border-radius:16px; padding:10px 12px; min-height:62px; background:#F3EADA; color:var(--ink); cursor:pointer; box-shadow:0 3px 0 var(--card-edge)}
  .mmsong.on{background:var(--good-bg); box-shadow:0 3px 0 var(--leaf-d), 0 0 0 3px var(--leaf)}
  .mmsong.pk{background:var(--sun); box-shadow:0 3px 0 var(--sun-d)}
  .mmic{font-size:1.4rem; width:1.6em; text-align:center; flex:none}
  .mmt{display:grid; min-width:0}
  .mmt b{font:600 1.15rem var(--display); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .mmt small{font-size:.95rem; color:var(--ink-soft); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
  .mmplayer{display:grid; gap:10px; background:#F3EADA; border-radius:20px; padding:12px; box-shadow:inset 0 2px 6px rgba(0,0,0,.08)}
  .mmnow{display:flex; align-items:center; gap:12px; min-width:0}
  .mmart{font-size:1.8rem; width:54px; height:54px; border-radius:14px; display:grid; place-items:center; background:var(--sky); box-shadow:0 4px 0 var(--sky-d); flex:none}
  .mmseek, .mmvol{display:flex; align-items:center; gap:10px; font:600 .95rem var(--display); color:var(--ink-soft); font-variant-numeric:tabular-nums}
  .mmseek input, .mmvol input{flex:1; min-width:0; height:36px; accent-color:var(--coral)}
  .mmctl{display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:8px}
  .mmctl .btn{flex-direction:column; gap:2px; min-height:70px; padding:6px 4px; font-size:1.6rem}
  .mmctl .btn small{font:600 .8rem var(--display); white-space:nowrap}
  .mmctl .btn[aria-pressed="true"]{--c:var(--sun); --d:var(--sun-d)}
  .mmctl .mmbig{font-size:2rem}
  @media (max-width:520px){ .mmctl{grid-template-columns:repeat(3, minmax(0, 1fr))} }
  #musicBtn.mmon .i{animation:breathe 1.6s ease-in-out infinite}
  `);

  document.addEventListener('click', e => {
    if (!page || !page.contains(e.target)) return;
    const t = e.target.closest('[data-mm],[data-tab],[data-list]'); if (!t) return;
    if (t.dataset.tab) { V.tab = t.dataset.tab; store.set('mmTab', V.tab); sfx.tap(); return render(); }
    if (t.dataset.list) { V.list = t.dataset.list; store.set('mmList', V.list); sfx.tap(); return render(); }
    const k = t.dataset.mm;
    if (k === 'close') close();
    else if (k === 'choose') choose();
    else if (k === 'allow') allow();
    else if (k === 'playall') { PL.shuffle = false; mvSet('mivida:shuffle', false); playQueue(currentList(), 0); render(); }
    else if (k === 'shuffleall') { PL.shuffle = true; mvSet('mivida:shuffle', true); playQueue(currentList()); render(); }
    else if (k === 'pick') { V.pickMode = !V.pickMode; render(); }
    else if (k === 'toggle') toggle();
    else if (k === 'next') next();
    else if (k === 'prev') prev();
    else if (k === 'stop') stopAll();
    else if (k === 'shuffle') { PL.shuffle = !PL.shuffle; mvSet('mivida:shuffle', PL.shuffle); render(); }
    else if (k === 'repeat') { PL.repeat = { all: 'one', one: 'off', off: 'all' }[PL.repeat]; mvSet('mivida:repeat', PL.repeat); render(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'mmSeek' && PL.audio.duration) PL.audio.currentTime = e.target.value / 1000 * PL.audio.duration;
    if (e.target.id === 'mmVol') { PL.audio.volume = e.target.value / 100; mvSet('mivida:vol', PL.audio.volume); }
  });
  document.addEventListener('keydown', e => { if (page && e.key === 'Escape') close(); });

  /* the Music button in the button bar opens this page */
  $('#musicBtn').onclick = open;
  $('#musicBtn').innerHTML = '<span class="i" aria-hidden="true">🎵</span><span class="l">My Music</span>';
  $('#musicBtn').setAttribute('aria-label', 'My Music');
  restore();
})();
