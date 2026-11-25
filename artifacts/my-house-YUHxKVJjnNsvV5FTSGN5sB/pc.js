// The PC on the desk: a Windows-98 desktop running a MAME32-style front end.
// Two kinds of games share one list: the built-in remakes (games/*.js) and the real MAME 0.78
// driver list, which plays through the MAME 2003 core (EmulatorJS) once the matching ROM .zip is added.
const Reg = window.ArcadeRegistry;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- icons (tiny inline SVG, 16px)
const ICON = {
  cab: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 1h8v4l-1 2v8H5V7L4 5z" fill="#1d4fbf" stroke="#000"/><rect x="5.5" y="2.5" width="5" height="3" fill="#ffd200"/><rect x="6" y="7.5" width="4" height="3" fill="#000"/><circle cx="8" cy="12" r="1" fill="#d8202a"/></svg>',
  folder: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M1 3h5l1 2h8v9H1z" fill="#f5d36b" stroke="#8a6d1c"/></svg>',
  folderOpen: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M1 3h5l1 2h7v2H4L1 14z" fill="#e8c24f" stroke="#8a6d1c"/><path d="M4 7h11l-3 7H1z" fill="#f8de85" stroke="#8a6d1c"/></svg>',
  ok: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="2" y="3" width="12" height="10" rx="1" fill="#1a1a1a" stroke="#000"/><rect x="3.5" y="4.5" width="9" height="7" fill="#22c55e"/></svg>',
  missing: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="2" y="3" width="12" height="10" rx="1" fill="#7a7a7a" stroke="#4a4a4a"/><path d="M5 5l6 6M11 5l-6 6" stroke="#d40000" stroke-width="2"/></svg>',
  stick: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="2" y="10" width="12" height="4" fill="#222" stroke="#000"/><rect x="7.4" y="5" width="1.2" height="5" fill="#888"/><circle cx="8" cy="4.5" r="2.4" fill="#d8202a" stroke="#600"/></svg>',
  bios: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="2" y="4" width="12" height="8" fill="#2b6b3a" stroke="#000"/><path d="M4 4V2M7 4V2M10 4V2M12 4V2M4 12v2M7 12v2M10 12v2M12 12v2" stroke="#999"/></svg>',
  disk: '<svg viewBox="0 0 32 32" width="32" height="32"><path d="M3 3h22l4 4v22H3z" fill="#2b4a9a" stroke="#000"/><rect x="8" y="3" width="14" height="9" fill="#ddd"/><rect x="17" y="4" width="3" height="7" fill="#2b4a9a"/><rect x="7" y="17" width="18" height="11" fill="#fff"/></svg>',
  bin: '<svg viewBox="0 0 32 32" width="32" height="32"><path d="M7 8h18l-2 21H9z" fill="#d7dde3" stroke="#555"/><path d="M5 6h22v3H5z" fill="#b9c0c8" stroke="#555"/><path d="M12 12v14M16 12v14M20 12v14" stroke="#8a929b"/></svg>',
  door: '<svg viewBox="0 0 32 32" width="32" height="32"><rect x="7" y="3" width="18" height="27" fill="#8b5a2b" stroke="#3a240f"/><circle cx="21" cy="17" r="1.6" fill="#ffd24a"/></svg>',
  bigcab: '<svg viewBox="0 0 32 32" width="32" height="32"><path d="M8 1h16v8l-2 3v19H10V12L8 9z" fill="#1d4fbf" stroke="#000"/><rect x="10" y="3" width="12" height="5" fill="#ffd200"/><rect x="11.5" y="12.5" width="9" height="7" fill="#000"/><rect x="12.5" y="13.5" width="7" height="5" fill="#2bd4ff"/><circle cx="13" cy="23" r="1.5" fill="#d8202a"/><circle cx="18" cy="23" r="1.2" fill="#ffd200"/><circle cx="21" cy="23" r="1.2" fill="#22c55e"/></svg>',
  info: '<svg viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="13" fill="#fff" stroke="#1d4fbf" stroke-width="2"/><rect x="14.5" y="13" width="3" height="11" fill="#1d4fbf"/><circle cx="16" cy="9" r="2" fill="#1d4fbf"/></svg>',
  warn: '<svg viewBox="0 0 32 32" width="32" height="32"><path d="M16 3l14 25H2z" fill="#ffd200" stroke="#000"/><rect x="14.5" y="11" width="3" height="10" fill="#000"/><rect x="14.5" y="23" width="3" height="3" fill="#000"/></svg>',
  bat: '<svg viewBox="0 0 32 32" width="32" height="32"><path d="M5 2h15l7 7v21H5z" fill="#fff" stroke="#000"/><path d="M20 2v7h7" fill="#ddd" stroke="#000"/><circle cx="16" cy="19" r="6" fill="#9aa0a6" stroke="#333"/><circle cx="16" cy="19" r="2.2" fill="#fff" stroke="#333"/><path d="M16 11v3M16 24v3M8 19h3M21 19h3M10.5 13.5l2 2M19.5 22.5l2 2M10.5 24.5l2-2M19.5 15.5l2-2" stroke="#333" stroke-width="1.6"/></svg>',
  dos: '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="1" y="2" width="14" height="12" fill="#000" stroke="#808080"/><path d="M3 6l2 1.5L3 9" stroke="#c0c0c0" fill="none"/><rect x="6" y="9" width="4" height="1" fill="#c0c0c0"/></svg>',
  win: '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M1 3l6-1v6H1z" fill="#f25022"/><path d="M8 2l7-1v7H8z" fill="#7fba00"/><path d="M1 9h6v6l-6-1z" fill="#00a4ef"/><path d="M8 9h7v7l-7-1z" fill="#ffb900"/></svg>'
};

// ---------------------------------------------------------------- game catalogue
const STATUS = ['Good', 'Imperfect', 'Not working', 'BIOS'];
const games = [];          // every row in the list
const byRom = new Map();   // romset -> MAME row
function cleanMaker(m) { return (m || 'Unknown').replace(/\s*\(.*?\)\s*/g, ' ').replace(/[\[\]]/g, '').split(/\s*\/\s*|\s*\+\s*/)[0].trim() || 'Unknown'; }
// Built-in games load on demand: games/manifest.js lists them (generated by tools/sync-games.js); the code of a
// game is fetched the first time it's previewed or played.
const BUILTIN = window.GAME_MANIFEST || Reg.games.map(d => ({ id: d.id, file: d.id + '.js', title: d.title, year: d.year, maker: d.maker, width: d.width, height: d.height, vector: d.vector, pointer: d.pointer, controls: d.controls, marquee: d.marquee }));
const gameLoads = new Map();
function ensureGame(meta) {
  if (Reg.get(meta.id)) return Promise.resolve(Reg.get(meta.id));
  if (!gameLoads.has(meta.id)) gameLoads.set(meta.id, new Promise((ok, fail) => {
    loadScript('games/' + meta.file).then(() => Reg.get(meta.id) ? ok(Reg.get(meta.id)) : fail(new Error(meta.file + ' did not register')), e => { gameLoads.delete(meta.id); fail(e); });
  }));
  return gameLoads.get(meta.id);
}
for (const def of BUILTIN) {
  games.push({ kind: 'builtin', id: def.id, title: def.title, year: String(def.year || ''), maker: def.maker || '', status: 0, vertical: def.height > def.width ? 1 : 0, rom: '', parent: '', def });
}
for (const [rom, title, year, maker, parent, status, vertical] of (window.MAME_LIST || [])) {
  const g = { kind: 'mame', id: 'mame:' + rom, rom, title, year, maker, parent, status, vertical };
  games.push(g); byRom.set(rom, g);
}
for (const g of games) { g.makerKey = cleanMaker(g.maker); g.lc = (g.title + ' ' + g.rom + ' ' + g.maker).toLowerCase(); }

// ---------------------------------------------------------------- ROM library (IndexedDB; memory if storage is blocked)
const lib = { names: new Map(), mem: new Map(), db: null, persistent: false, saved: new Map(), folder: new Map(), folderPath: '', folderOK: false };
// The download's launcher serves a ROMs folder from the player's own disk at roms/ and lists it at roms/index.json.
async function scanFolder() {
  if (location.protocol === 'file:') { lib.folderOK = false; lib.folder.clear(); lib.names = new Map(lib.saved); return; } // no server, no ROMs folder
  try {
    const r = await fetch('roms/index.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    lib.folder.clear();
    for (const f of j.files || []) { const n = f.name.toLowerCase().replace(/\.zip$/, ''); lib.folder.set(n, { file: f.name, size: f.size || 0 }); }
    lib.folderPath = j.dir || 'roms'; lib.folderOK = true;
  } catch (e) { lib.folderOK = false; lib.folder.clear(); }
  lib.names = new Map([...lib.saved, ...[...lib.folder].map(([n, f]) => [n, f.size])]);
}
function idb(store, mode, fn) {
  return new Promise((ok, fail) => { const tx = lib.db.transaction('roms', mode); const r = fn(tx.objectStore('roms')); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => fail(tx.error); });
}
async function libOpen() {
  try {
    lib.db = await new Promise((ok, fail) => { const r = indexedDB.open('gameroom-mame32', 1); r.onupgradeneeded = () => r.result.createObjectStore('roms'); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
    const rows = await new Promise((ok, fail) => { const out = []; const tx = lib.db.transaction('roms'); const cur = tx.objectStore('roms').openCursor(); cur.onsuccess = () => { const c = cur.result; if (c) { out.push([c.key, c.value.size || 0]); c.continue(); } else ok(out); }; cur.onerror = () => fail(cur.error); });
    for (const [k, size] of rows) { lib.names.set(k, size); lib.saved.set(k, size); }
    lib.persistent = true;
  } catch (e) { lib.db = null; lib.persistent = false; }
}
async function libPut(name, file) {
  lib.names.set(name, file.size); lib.saved.set(name, file.size);
  if (lib.db) { try { await idb('roms', 'readwrite', s => s.put({ blob: file, size: file.size, added: Date.now() }, name)); return; } catch (e) { lib.persistent = false; } }
  lib.mem.set(name, file);
}
async function libGet(name) {
  if (lib.mem.has(name)) return lib.mem.get(name);
  if (lib.folder.has(name)) { const r = await fetch('roms/' + encodeURIComponent(lib.folder.get(name).file)); if (r.ok) return await r.blob(); }
  if (!lib.db) return null;
  const v = await idb('roms', 'readonly', s => s.get(name));
  return v ? v.blob : null;
}
async function libDel(name) {
  lib.names.delete(name); lib.mem.delete(name); lib.saved.delete(name);
  if (lib.folder.has(name)) lib.names.set(name, lib.folder.get(name).size);
  if (lib.db) try { await idb('roms', 'readwrite', s => s.delete(name)); } catch (e) { }
}
// ROMs the MAME team hosts with the rights holders' permission for free non-commercial use (and that MAME 0.78 runs)
const FREE = new Set(['gridlee', 'robby', 'supertnk', 'polyplay']);
const FREE_URL = 'https://www.mamedev.org/roms/';
const hasRom = g => g.kind === 'builtin' || lib.names.has(g.rom);

// ---------------------------------------------------------------- MAME 2003 via EmulatorJS
const EMU = { loaded: null, core: null, inst: null, contexts: [], OrigAC: window.AudioContext };
// The single-file download packs files into <script type="text/plain" id="asset:PATH"> tags; everything else fetches.
const inlineAsset = p => { const el = document.getElementById('asset:' + p); return el ? el.textContent : null; };
function assetFetch(p, opts) {
  const t = inlineAsset(p);
  if (t == null) return fetch(p, opts);
  if (p.endsWith('.wasm')) { const bin = atob(t), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return Promise.resolve(new Response(u)); }
  return Promise.resolve(new Response(t));
}
function loadScript(src) {
  const t = inlineAsset(src);
  if (t != null) { const s = document.createElement('script'); s.textContent = t; document.head.appendChild(s); return Promise.resolve(); }
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
function loadEmulator() {
  if (EMU.loaded) return EMU.loaded;
  EMU.loaded = (async () => {
    const css = await assetFetch('emu/emulator.css').then(r => r.text()).catch(() => '');
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    for (const f of ['emulator.js', 'nipplejs.js', 'shaders.js', 'storage.js', 'gamepad.js', 'GameManager.js', 'compression.js']) await loadScript('emu/src/' + f);
    // Load the core from files published next to the page (the stock loader builds blob: URLs, which the page may not use).
    window.EmulatorJS.prototype.downloadGameCore = async function () {
      try {
        const core = await getCore(p => { this.textElem.innerText = 'Loading MAME 2003 ' + p; });
        const j = core.json;
        this.defaultCoreOpts = j.options || {}; this.extensions = j.extensions; this.coreName = j.name; this.repository = j.repo;
        this.enableMouseLock = !!(j.options && j.options.supportsMouse); this.retroarchOpts = j.retroarchOpts; this.saveFileExt = j.save;
        if (this.webgl2Enabled === null) this.webgl2Enabled = false;
        if (this.saveFileExt === false && this.elements.bottomBar.saveSavFiles) { this.elements.bottomBar.saveSavFiles[0].style.display = 'none'; this.elements.bottomBar.loadSavFiles[0].style.display = 'none'; }
        this.initModule(core.wasm, null);
      } catch (e) { console.error(e); this.startGameError('MAME could not start here: ' + (e.message || e)); }
    };
  })();
  return EMU.loaded;
}
function getCore(progress) {
  if (EMU.core) return EMU.core;
  EMU.core = (async () => {
    const json = await assetFetch('emu/cores/core.json').then(r => r.json());
    const res = await assetFetch('emu/cores/mame2003_libretro.gz.wasm');
    if (!res.ok) throw new Error('core download failed (' + res.status + ')');
    const total = +res.headers.get('content-length') || 6822942;
    let got = 0;
    const counted = res.body.pipeThrough(new TransformStream({ transform(chunk, ctl) { got += chunk.length; progress(Math.min(99, Math.round(got / total * 100)) + '%'); ctl.enqueue(chunk); } }));
    // the core is stored gzipped; if the host already un-gzipped it on the way, use the bytes as they are
    const raw = new Uint8Array(await new Response(counted).arrayBuffer());
    const wasm = raw[0] === 0x1f && raw[1] === 0x8b ? await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : raw.buffer;
    await loadScript('emu/cores/mame2003_libretro.js');
    return { json, wasm };
  })();
  EMU.core.catch(() => { EMU.core = null; });
  return EMU.core;
}

// ---------------------------------------------------------------- the PC
export function createPC({ monitorCanvas, onMonitorChange, onStandUp }) {
  const root = $('#pc'), screen = $('#screen');
  screen.innerHTML = `
  <div class="desktop" id="desktop">
    <button class="dicon" data-open="mame32" type="button">${ICON.bigcab}<span>MAME32</span></button>
    <button class="dicon" data-open="bat" type="button">${ICON.bat}<span>Play My House.bat</span></button>
    <button class="dicon" data-open="roms" type="button">${ICON.disk}<span>Load ROMs</span></button>
    <button class="dicon" data-open="readme" type="button">${ICON.info}<span>Read Me</span></button>
    <button class="dicon" data-open="bin" type="button">${ICON.bin}<span>Recycle Bin</span></button>
    <button class="dicon" data-open="standup" type="button">${ICON.door}<span>Get Up</span></button>
  </div>
  <section class="win" id="m32" aria-label="MAME32">
    <header class="title"><span class="ti">${ICON.cab}</span><span id="m32-title">MAME32 - [All Games]</span>
      <span class="tbtns"><button type="button" class="tb" data-act="min" aria-label="Minimize">_</button><button type="button" class="tb" data-act="max" aria-label="Maximize">\u25a1</button><button type="button" class="tb" data-act="close" aria-label="Close">\u00d7</button></span></header>
    <nav class="menubar">
      <div class="mi"><button type="button">File</button><div class="dd">
        <button type="button" data-cmd="play">Play<kbd>Enter</kbd></button>
        <button type="button" data-cmd="load">Load ROMs\u2026<kbd>Ctrl+O</kbd></button>
        <button type="button" data-cmd="rescan">Refresh ROMs folder<kbd>F5</kbd></button>
        <button type="button" data-cmd="remove">Remove ROM from library</button>
        <hr><button type="button" data-cmd="exit">Exit</button></div></div>
      <div class="mi"><button type="button">View</button><div class="dd">
        <button type="button" data-cmd="icons">Large Icons</button>
        <button type="button" data-cmd="details">Details</button>
        <hr><button type="button" data-cmd="tree">Folders</button>
        <button type="button" data-cmd="snap">Picture area</button>
        <button type="button" data-cmd="clones">Show clones</button>
        <button type="button" data-cmd="missing">Show games without ROMs</button></div></div>
      <div class="mi"><button type="button">Options</button><div class="dd">
        <button type="button" data-cmd="sound">Sound</button>
        <button type="button" data-cmd="scan">CRT scanlines</button>
        <button type="button" data-cmd="dirs">Directories\u2026</button></div></div>
      <div class="mi"><button type="button">Help</button><div class="dd">
        <button type="button" data-cmd="readme">How to add games\u2026</button>
        <button type="button" data-cmd="about">About MAME32\u2026</button></div></div>
    </nav>
    <div class="toolbar">
      <button type="button" class="tool" data-cmd="play" title="Play">${ICON.stick}<span>Play</span></button>
      <button type="button" class="tool" data-cmd="load" title="Load ROMs">${ICON.folderOpen}<span>Load ROMs</span></button>
      <span class="sep"></span>
      <button type="button" class="tool" data-cmd="icons" title="Large Icons"><svg viewBox="0 0 16 16" width="16" height="16"><rect x="1" y="1" width="6" height="6" fill="#1d4fbf"/><rect x="9" y="1" width="6" height="6" fill="#1d4fbf"/><rect x="1" y="9" width="6" height="6" fill="#1d4fbf"/><rect x="9" y="9" width="6" height="6" fill="#1d4fbf"/></svg></button>
      <button type="button" class="tool" data-cmd="details" title="Details"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M1 3h14M1 7h14M1 11h14M1 15h14" stroke="#000"/></svg></button>
      <span class="sep"></span>
      <label class="search" for="m32-search">Search <input id="m32-search" type="search" autocomplete="off" spellcheck="false" placeholder="name, romset or maker"></label>
    </div>
    <div class="body">
      <div class="tree sunk" id="m32-tree" role="tree"></div>
      <div class="list sunk" id="m32-list" tabindex="0" role="grid" aria-label="Games">
        <div class="lhead" id="m32-head"></div>
        <div class="lscroll" id="m32-scroll"><div class="lspace" id="m32-space"><div class="lrows" id="m32-rows"></div></div></div>
      </div>
      <aside class="snap" id="m32-snap">
        <div class="tabs"><span class="tab on">Snapshot</span></div>
        <div class="pic sunk"><canvas id="m32-pic" width="224" height="256"></canvas></div>
        <div class="facts" id="m32-facts"></div>
      </aside>
    </div>
    <footer class="status"><span id="st-1" class="sunk">Ready</span><span id="st-2" class="sunk"></span><span id="st-3" class="sunk"></span></footer>
  </section>
  <div class="taskbar">
    <button type="button" class="start" id="start-btn">${ICON.win}<b>Start</b></button>
    <button type="button" class="task on" id="task-m32">${ICON.cab}<span>MAME32</span></button>
    <button type="button" class="task" id="task-dos" hidden>${ICON.dos}<span>MS-DOS Prompt</span></button>
    <span class="tray sunk"><button type="button" class="getup" id="getup" title="Stand up (Esc)">Stand up</button><span id="clock"></span></span>
  </div>
  <div class="startmenu" id="startmenu" hidden>
    <div class="band">Windows<b>98</b></div>
    <div class="items">
      <button type="button" data-open="mame32">${ICON.cab}MAME32</button>
      <button type="button" data-open="bat">${ICON.dos}Play My House.bat</button>
      <button type="button" data-open="dos">${ICON.dos}MS-DOS Prompt</button>
      <button type="button" data-open="roms">${ICON.folderOpen}Load ROMs\u2026</button>
      <button type="button" data-open="readme">${ICON.folder}Read Me</button>
      <hr><button type="button" data-open="standup">${ICON.win}Shut Down\u2026 (stand up)</button>
    </div>
  </div>
  <div class="dialog win" id="dlg" hidden role="dialog" aria-modal="true" aria-labelledby="dlg-title">
    <header class="title"><span id="dlg-title">MAME32</span><span class="tbtns"><button type="button" class="tb" data-dlg="close" aria-label="Close">\u00d7</button></span></header>
    <div class="dlg-body"><span id="dlg-icon"></span><div id="dlg-text"></div></div>
    <div class="dlg-btns" id="dlg-btns"></div>
  </div>
  <section class="win dos" id="dos" hidden aria-label="MS-DOS Prompt">
    <header class="title"><span class="ti">${ICON.dos}</span><span id="dos-title">MS-DOS Prompt</span>
      <span class="tbtns"><button type="button" class="tb" data-dos="min" aria-label="Minimize">_</button><button type="button" class="tb" data-dos="close" aria-label="Close">\u00d7</button></span></header>
    <div class="dosbody" id="dos-body"><pre id="dos-out"></pre><div class="dosline"><span id="dos-prompt"></span><input id="dos-in" type="text" autocomplete="off" spellcheck="false" aria-label="Command"></div></div>
  </section>
  <div class="gamelayer" id="gamelayer" hidden>
    <button type="button" class="gfull" id="gfull">Full screen</button>
    <canvas id="pcgame"></canvas>
    <div id="emu-host"></div>
    <div class="ghint" id="ghint"></div>
  </div>
  <input type="file" id="rom-input" accept=".zip" multiple hidden>
  <div class="droptip" id="droptip" hidden>Drop ROM .zip files to add them to MAME32</div>`;

  // ---------------- state
  const view = { folder: 'all', sub: '', sort: 'title', dir: 1, query: '', clones: true, tree: true, snap: true, mode: 'details', missing: false, sel: null, rows: [] };
  try { Object.assign(view, JSON.parse(localStorage.getItem('gameroom.mame32') || '{}'), { query: '' }); } catch (e) { }
  const saveView = () => { try { localStorage.setItem('gameroom.mame32', JSON.stringify({ folder: view.folder, sub: view.sub, sort: view.sort, dir: view.dir, clones: view.clones, tree: view.tree, snap: view.snap, mode: view.mode, missing: view.missing, selId: view.sel && view.sel.id })); } catch (e) { } };
  let scanlines = true, running = null, preview = null, dirty = true;
  const ROW = 20, IW = 104, IH = 86;
  // Details is MAME32's list; Large Icons lays the same games out like a folder in Windows Explorer
  function geom() {
    const sc = $('#m32-scroll', screen);
    if (view.mode !== 'icons') return { cols: 1, rh: ROW, icons: false };
    return { cols: Math.max(1, Math.floor((sc.clientWidth - 8) / IW)), rh: IH, icons: true };
  }
  function cabIcon(g) {
    const have = hasRom(g), m = g.kind === 'builtin' && g.def.marquee ? g.def.marquee : null;
    const body = m ? m.bg : have ? '#1d4fbf' : '#8a8a8a', top = m ? m.fg : have ? '#ffd200' : '#c9c9c9', scr = have ? (m ? m.accent || '#2bd4ff' : '#22c55e') : '#3a3a3a';
    const x = have ? '' : '<path d="M9 12l14 10M23 12L9 22" stroke="#d40000" stroke-width="3"/>';
    const tag = g.kind === 'builtin' ? '<circle cx="26" cy="27" r="4.5" fill="#d8202a" stroke="#600"/>' : g.status === 3 ? '<rect x="20" y="23" width="9" height="7" fill="#2b6b3a" stroke="#000"/>' : '';
    return `<svg viewBox="0 0 32 32" width="40" height="40"><path d="M8 1h16v8l-2 3v19H10V12L8 9z" fill="${body}" stroke="#000"/><rect x="10" y="3" width="12" height="5" fill="${top}"/><rect x="11.5" y="12.5" width="9" height="7" fill="#000"/><rect x="12.5" y="13.5" width="7" height="5" fill="${scr}"/><circle cx="13" cy="23" r="1.5" fill="#d8202a"/><circle cx="18" cy="23" r="1.2" fill="#ffd200"/>${tag}${x}</svg>`;
  }

  // ---------------- folders
  const FOLDERS = [
    ['all', 'All Games', () => true],
    ['avail', 'Available', g => hasRom(g)],
    ['free', 'Free ROMs', g => g.kind === 'mame' && FREE.has(g.rom)],
    ['unavail', 'Unavailable', g => !hasRom(g)],
    ['builtin', 'Built-in Remakes', g => g.kind === 'builtin'],
    ['myroms', 'My ROMs', g => g.kind === 'mame' && lib.names.has(g.rom)],
    ['originals', 'Originals', g => g.kind === 'builtin' || !g.parent],
    ['clones', 'Clones', g => g.kind === 'mame' && !!g.parent && byRom.has(g.parent) && byRom.get(g.parent).status !== 3],
    ['working', 'Working', g => g.status < 2],
    ['nonworking', 'Not Working', g => g.status === 2],
    ['horizontal', 'Horizontal', g => !g.vertical],
    ['vertical', 'Vertical', g => !!g.vertical],
    ['bios', 'BIOS', g => g.status === 3],
    ['maker', 'Manufacturer', null],
    ['year', 'Year', null]
  ];
  // Only games you can play are listed, unless View > Show games without ROMs is on
  const shown = g => view.missing || hasRom(g);
  let makers = [], years = [];
  function folderSets() {
    const pool = games.filter(shown), m = new Map();
    for (const g of pool) m.set(g.makerKey, (m.get(g.makerKey) || 0) + 1);
    makers = [...m].sort((a, b) => b[1] - a[1]).slice(0, 60).map(x => x[0]).sort((a, b) => a.localeCompare(b));
    years = [...new Set(pool.map(g => g.year).filter(Boolean))].sort();
    return pool;
  }
  const open = { maker: view.folder === 'maker', year: view.folder === 'year' };
  function folderName() { const f = FOLDERS.find(x => x[0] === view.folder); return view.sub ? view.sub : f ? f[1] : 'All Games'; }
  function renderTree() {
    const t = $('#m32-tree', screen); let h = '';
    const pool = folderSets();
    for (const [k, name, fn] of FOLDERS) {
      if (fn && k !== 'all' && !pool.some(fn)) continue; // empty folders stay out of the tree
      const on = view.folder === k && !view.sub;
      if (fn) { h += `<button type="button" class="node${on ? ' on' : ''}" data-f="${k}" role="treeitem">${on ? ICON.folderOpen : ICON.folder}<span>${name}</span></button>`; continue; }
      h += `<button type="button" class="node${on ? ' on' : ''}" data-f="${k}" data-tog="${k}" role="treeitem" aria-expanded="${!!open[k]}"><i>${open[k] ? '\u2212' : '+'}</i>${open[k] ? ICON.folderOpen : ICON.folder}<span>${name}</span></button>`;
      if (open[k]) for (const v of (k === 'maker' ? makers : years)) {
        const s = view.folder === k && view.sub === v;
        h += `<button type="button" class="node sub${s ? ' on' : ''}" data-f="${k}" data-sub="${esc(v)}" role="treeitem">${ICON.folder}<span>${esc(v)}</span></button>`;
      }
    }
    t.innerHTML = h;
  }
  $('#m32-tree', screen).addEventListener('click', e => {
    const b = e.target.closest('.node'); if (!b) return;
    const k = b.dataset.f;
    if (b.dataset.tog && !b.dataset.sub) { open[k] = !open[k]; if (!open[k] && view.folder === k) view.sub = ''; }
    view.folder = k; view.sub = b.dataset.sub || '';
    if (view.sub === '' && (k === 'maker' || k === 'year')) { /* the parent node lists everything with a known value */ }
    renderTree(); refresh(true); saveView();
  });

  // ---------------- list
  const COLS = [['title', 'Game', 'c-title'], ['roms', 'ROMs', 'c-roms'], ['status', 'Status', 'c-status'], ['rom', 'Directory', 'c-dir'], ['year', 'Year', 'c-year'], ['maker', 'Manufacturer', 'c-maker']];
  function renderHead() {
    $('#m32-head', screen).innerHTML = COLS.map(([k, n, c]) => `<button type="button" class="${c}${view.sort === k ? ' sorted' : ''}" data-sort="${k}">${n}${view.sort === k ? (view.dir > 0 ? ' \u25b2' : ' \u25bc') : ''}</button>`).join('');
  }
  $('#m32-head', screen).addEventListener('click', e => {
    const b = e.target.closest('[data-sort]'); if (!b) return;
    const k = b.dataset.sort; if (view.sort === k) view.dir *= -1; else { view.sort = k; view.dir = 1; }
    renderHead(); refresh(false); saveView();
  });
  const sortKey = {
    title: g => g.title.toLowerCase(), roms: g => (g.kind === 'builtin' ? 0 : hasRom(g) ? 1 : 2), status: g => g.status,
    rom: g => g.kind === 'builtin' ? '' : g.rom, year: g => g.year || '9999', maker: g => g.maker.toLowerCase()
  };
  function refresh(resetScroll) {
    // a folder that no longer has any playable games falls back to All Games
    const pool = games.filter(shown), fcur = FOLDERS.find(x => x[0] === view.folder);
    if (!fcur || (fcur[2] && view.folder !== 'all' && !pool.some(fcur[2])) || (view.sub && !pool.some(g => view.folder === 'maker' ? g.makerKey === view.sub : g.year === view.sub))) { view.folder = 'all'; view.sub = ''; }
    renderTree();
    const f = FOLDERS.find(x => x[0] === view.folder) || FOLDERS[0];
    const q = view.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let fn = f[2];
    if (view.folder === 'maker') fn = view.sub ? g => g.makerKey === view.sub : () => true;
    if (view.folder === 'year') fn = view.sub ? g => g.year === view.sub : () => true;
    const sk = sortKey[view.sort];
    view.rows = games.filter(g => shown(g) && fn(g) && (view.clones || g.kind === 'builtin' || !g.parent || (byRom.get(g.parent) || {}).status === 3) && q.every(w => g.lc.includes(w)));
    view.rows.sort((a, b) => { const x = sk(a), y = sk(b); return (x < y ? -1 : x > y ? 1 : a.title.localeCompare(b.title)) * view.dir; });
    layout();
    if (resetScroll) $('#m32-scroll', screen).scrollTop = 0;
    $('#m32-title', screen).textContent = `MAME32 - [${folderName()}]`;
    const avail = games.filter(hasRom).length;
    $('#st-2', screen).textContent = `${view.rows.length.toLocaleString()} games`;
    $('#st-3', screen).textContent = view.missing ? `${avail.toLocaleString()} of ${games.length.toLocaleString()} available` : `${avail.toLocaleString()} playable`;
    if (!view.sel || !view.rows.includes(view.sel)) select(view.rows[0] || null, false);
    drawRows(); dirty = true;
  }
  function layout() {
    const G = geom();
    $('#m32-list', screen).classList.toggle('icons', G.icons);
    $('#m32-space', screen).style.height = Math.ceil(view.rows.length / G.cols) * G.rh + 8 + 'px';
  }
  function drawRows() {
    const sc = $('#m32-scroll', screen), top = sc.scrollTop, hgt = sc.clientHeight || 400, G = geom();
    if (G.icons) {
      const r0 = Math.max(0, Math.floor(top / IH) - 2), r1 = Math.ceil((top + hgt) / IH) + 2;
      let h = '';
      for (let i = r0 * G.cols; i < Math.min(view.rows.length, r1 * G.cols); i++) {
        const g = view.rows[i], have = hasRom(g);
        h += `<div class="icon${g === view.sel ? ' sel' : ''}${have ? '' : ' dim'}" style="left:${4 + (i % G.cols) * IW}px;top:${4 + Math.floor(i / G.cols) * IH}px" data-i="${i}" title="${esc(g.title)}${g.kind === 'mame' ? ' (' + g.rom + '.zip)' : ''}">${cabIcon(g)}<span>${esc(g.title)}</span></div>`;
      }
      $('#m32-rows', screen).innerHTML = h; return;
    }
    const a = Math.max(0, Math.floor(top / ROW) - 8), b = Math.min(view.rows.length, Math.ceil((top + hgt) / ROW) + 8);
    let h = '';
    for (let i = a; i < b; i++) {
      const g = view.rows[i], have = hasRom(g);
      const ic = g.kind === 'builtin' ? ICON.stick : g.status === 3 ? ICON.bios : have ? ICON.ok : ICON.missing;
      h += `<div class="row${g === view.sel ? ' sel' : ''}${have ? '' : ' dim'}${g.parent && g.kind === 'mame' ? ' clone' : ''}" style="top:${i * ROW}px" data-i="${i}" role="row">
        <span class="c-title">${ic}<span>${esc(g.title)}</span></span><span class="c-roms">${g.kind === 'builtin' ? 'Built-in' : have ? 'Yes' : 'No'}</span>
        <span class="c-status s${g.status}">${STATUS[g.status]}</span><span class="c-dir">${g.kind === 'builtin' ? '(remake)' : g.rom}</span>
        <span class="c-year">${esc(g.year)}</span><span class="c-maker">${esc(g.maker)}</span></div>`;
    }
    $('#m32-rows', screen).innerHTML = h;
  }
  $('#m32-scroll', screen).addEventListener('scroll', drawRows, { passive: true });
  try { new ResizeObserver(() => { layout(); drawRows(); }).observe($('#m32-scroll', screen)); } catch (e) { }
  $('#m32-rows', screen).addEventListener('click', e => { const r = e.target.closest('[data-i]'); if (r) { select(view.rows[+r.dataset.i]); $('#m32-list', screen).focus({ preventScroll: true }); } });
  $('#m32-rows', screen).addEventListener('dblclick', e => { const r = e.target.closest('[data-i]'); if (r) play(view.rows[+r.dataset.i]); });
  // touch: a second tap on the selected row plays it
  let lastTap = { i: -1, t: 0 };
  $('#m32-rows', screen).addEventListener('pointerup', e => { if (e.pointerType !== 'touch') return; const r = e.target.closest('[data-i]'); if (!r) return; const i = +r.dataset.i, now = performance.now(); if (lastTap.i === i && now - lastTap.t < 600) play(view.rows[i]); lastTap = { i, t: now }; });
  function select(g, scroll = true) {
    view.sel = g; drawRows(); drawSnap(); dirty = true; saveView();
    $('#st-1', screen).textContent = g ? g.title : 'Ready';
    if (g && scroll) {
      const G = geom(), r = Math.floor(view.rows.indexOf(g) / G.cols), sc = $('#m32-scroll', screen);
      if (r * G.rh < sc.scrollTop) sc.scrollTop = r * G.rh;
      else if ((r + 1) * G.rh + 8 > sc.scrollTop + sc.clientHeight) sc.scrollTop = (r + 1) * G.rh + 8 - sc.clientHeight;
    }
  }
  $('#m32-list', screen).addEventListener('keydown', e => {
    if (running) return;
    const G = geom(), i = Math.max(0, view.rows.indexOf(view.sel)), page = Math.max(1, Math.floor($('#m32-scroll', screen).clientHeight / G.rh) - 1) * G.cols;
    const go = n => { e.preventDefault(); select(view.rows[Math.max(0, Math.min(view.rows.length - 1, n))]); };
    if (e.key === 'ArrowDown') go(i + G.cols); else if (e.key === 'ArrowUp') go(i - G.cols);
    else if (G.icons && e.key === 'ArrowRight') go(i + 1); else if (G.icons && e.key === 'ArrowLeft') go(i - 1);
    else if (e.key === 'PageDown') go(i + page); else if (e.key === 'PageUp') go(i - page);
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(view.rows.length - 1);
    else if (e.key === 'Enter') { e.preventDefault(); play(view.sel); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // type-ahead jumps to the next title starting with that letter
      const k = e.key.toLowerCase(); const n = view.rows.length;
      for (let s = 1; s <= n; s++) { const g = view.rows[(i + s) % n]; if (g.title.toLowerCase().startsWith(k)) { select(g); break; } }
    }
  });
  const search = $('#m32-search', screen);
  search.addEventListener('input', () => { view.query = search.value; refresh(true); });
  search.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); $('#m32-list', screen).focus(); if (e.key === 'Enter' && view.sel) play(view.sel); } });

  // ---------------- snapshot pane
  const pic = $('#m32-pic', screen), pg = pic.getContext('2d');
  function drawSnap() {
    const g = view.sel;
    if (preview) preview = null;
    const facts = $('#m32-facts', screen);
    if (!g) { pg.fillStyle = '#000'; pg.fillRect(0, 0, pic.width, pic.height); facts.innerHTML = ''; return; }
    if (g.kind === 'builtin') {
      pic.width = g.def.width; pic.height = g.def.height;
      pg.fillStyle = '#000'; pg.fillRect(0, 0, pic.width, pic.height);
      const want = g;
      ensureGame(g.def).then(def => {
        if (view.sel !== want) return;
        preview = makePreview(def);
        for (let k = 0; k < 90; k++) preview.step();
        preview.draw(pg); dirty = true;
      }).catch(() => { });
    } else {
      pic.width = g.vertical ? 224 : 288; pic.height = g.vertical ? 288 : 224;
      const W = pic.width, Hh = pic.height, have = hasRom(g);
      pg.fillStyle = '#000'; pg.fillRect(0, 0, W, Hh);
      pg.strokeStyle = have ? '#22c55e' : '#444'; pg.lineWidth = 2; pg.strokeRect(8, 8, W - 16, Hh - 16);
      pg.textAlign = 'center'; pg.fillStyle = have ? '#ffd24a' : '#9a9a9a'; pg.font = '10px "Press Start 2P", monospace';
      wrap(pg, g.title.toUpperCase(), W / 2, Hh * .3, W - 36, 16);
      pg.fillStyle = '#38f4ff'; pg.font = '8px "Press Start 2P", monospace';
      pg.fillText(`${g.year}  ${g.makerKey.toUpperCase()}`.slice(0, 30), W / 2, Hh * .62);
      pg.fillStyle = have ? '#22c55e' : '#ff5a5a';
      pg.fillText(have ? 'ROM READY - PRESS ENTER' : `NEEDS ${g.rom.toUpperCase()}.ZIP`, W / 2, Hh * .78);
    }
    const parent = g.parent && byRom.get(g.parent);
    const rows = g.kind === 'builtin'
      ? [['Type', 'Built-in remake'], ['Year', g.year], ['Maker', g.maker], ['Controls', g.def.controls || '']]
      : [['Romset', g.rom + '.zip'], ['ROMs', hasRom(g) ? 'In your library' : 'Not added yet'], ['Status', STATUS[g.status]], ['Screen', g.vertical ? 'Vertical' : 'Horizontal'],
        ...(FREE.has(g.rom) ? [['License', 'Free from mamedev.org/roms']] : []),
        ...(parent ? [[parent.status === 3 ? 'BIOS' : 'Clone of', `${parent.title} (${parent.rom}.zip)${lib.names.has(parent.rom) ? '' : ' \u00b7 needed'}`]] : [])];
    facts.innerHTML = `<b>${esc(g.title)}</b>` + rows.map(([k, v]) => `<div><span>${k}</span><span>${esc(v)}</span></div>`).join('');
  }
  function wrap(g, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '', yy = y;
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
    if (line) g.fillText(line, x, yy);
  }
  let snapAcc = 0, lastNow = performance.now();
  function animateSnap() {
    const now = performance.now(), dt = Math.min(.1, (now - lastNow) / 1000); lastNow = now;
    if (root.classList.contains('on') && preview && !running) {
      snapAcc += dt; let n = 0;
      while (snapAcc >= 1 / 60 && n < 4) { preview.step(); snapAcc -= 1 / 60; n++; }
      preview.draw(pg);
    }
    requestAnimationFrame(animateSnap);
  }
  requestAnimationFrame(animateSnap);

  // ---------------- windows, menus, taskbar
  const m32 = $('#m32', screen);
  function showM32(on) { m32.hidden = !on; $('#task-m32', screen).classList.toggle('on', on); if (on) setTimeout(() => $('#m32-list', screen).focus({ preventScroll: true }), 0); dirty = true; }
  m32.querySelector('.tbtns').addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.dataset.act === 'close' || a.dataset.act === 'min') showM32(false); });
  $('#task-m32', screen).addEventListener('click', () => showM32(m32.hidden));
  const menubar = m32.querySelector('.menubar');
  menubar.addEventListener('click', e => {
    const top = e.target.closest('.mi > button');
    if (top) { const mi = top.parentElement, was = mi.classList.contains('open'); closeMenus(); if (!was) mi.classList.add('open'); return; }
    const cmd = e.target.closest('[data-cmd]'); if (cmd) { closeMenus(); command(cmd.dataset.cmd); }
  });
  menubar.addEventListener('pointerover', e => { const mi = e.target.closest('.mi'); if (mi && menubar.querySelector('.mi.open') && !mi.classList.contains('open')) { closeMenus(); mi.classList.add('open'); } });
  function closeMenus() { screen.querySelectorAll('.mi.open').forEach(m => m.classList.remove('open')); $('#startmenu', screen).hidden = true; }
  screen.addEventListener('pointerdown', e => { if (!e.target.closest('.mi') && !e.target.closest('#startmenu') && !e.target.closest('#start-btn')) closeMenus(); });
  m32.querySelector('.toolbar').addEventListener('click', e => { const c = e.target.closest('[data-cmd]'); if (c) command(c.dataset.cmd); });
  function syncMenuChecks() {
    const chk = { icons: view.mode === 'icons', details: view.mode !== 'icons', tree: view.tree, snap: view.snap, clones: view.clones, missing: view.missing, sound: !Reg.audio.muted, scan: scanlines };
    menubar.querySelectorAll('[data-cmd]').forEach(b => { if (b.dataset.cmd in chk) b.classList.toggle('chk', !!chk[b.dataset.cmd]); });
    m32.classList.toggle('no-tree', !view.tree); m32.classList.toggle('no-snap', !view.snap);
  }
  function command(c) {
    if (c === 'play') play(view.sel);
    else if (c === 'load') $('#rom-input', screen).click();
    else if (c === 'remove') removeRom();
    else if (c === 'exit') showM32(false);
    else if (c === 'icons' || c === 'details') { view.mode = c; syncMenuChecks(); layout(); select(view.sel); saveView(); }
    else if (c === 'tree') { view.tree = !view.tree; syncMenuChecks(); drawRows(); saveView(); }
    else if (c === 'snap') { view.snap = !view.snap; syncMenuChecks(); drawRows(); saveView(); }
    else if (c === 'missing') { view.missing = !view.missing; syncMenuChecks(); refresh(true); saveView(); }
    else if (c === 'clones') { view.clones = !view.clones; syncMenuChecks(); refresh(false); saveView(); }
    else if (c === 'sound') { Reg.audio.setMuted(!Reg.audio.muted); syncMenuChecks(); }
    else if (c === 'scan') { scanlines = !scanlines; root.classList.toggle('noscan', !scanlines); syncMenuChecks(); }
    else if (c === 'rescan') rescan(true);
    else if (c === 'dirs') dialog('Directories', (lib.folderOK
      ? `<p>ROMs folder: <code>${esc(lib.folderPath)}</code></p><p>${lib.folder.size} zip file${lib.folder.size === 1 ? '' : 's'} found there. Copy more ROM zips into it, then press F5.</p>`
      : `<p>No ROMs folder is connected. Open My House with <b>Play My House.bat</b> from the download to use the <code>roms</code> folder on your PC.</p>`)
      + `<p>Added in this browser: ${lib.saved.size} (File \u203a Load ROMs\u2026 or drop .zip files on the screen).</p>`, 'info');
    else if (c === 'readme') readme();
    else if (c === 'about') dialog('About MAME32', `<p><b>MAME32 \u00b7 My House edition</b></p><p>The list holds every driver in MAME 0.78 (${(window.MAME_LIST || []).length.toLocaleString()} sets) plus ${BUILTIN.length} built-in remakes.</p><p>Real arcade games run on the MAME 2003 core through EmulatorJS (GPL-3.0). MAME is \u00a9 the MAME team and is free for non-commercial use.</p><p>No ROM files come with this PC. Add only ROMs you have the right to use.</p>`, 'info');
  }
  syncMenuChecks();
  screen.querySelectorAll('[data-open]').forEach(b => {
    const go = () => {
      closeMenus();
      const k = b.dataset.open;
      if (k === 'mame32') showM32(true);
      else if (k === 'roms') $('#rom-input', screen).click();
      else if (k === 'readme') readme();
      else if (k === 'bat') dos.run();
      else if (k === 'dos') dos.open();
      else if (k === 'bin') dialog('Recycle Bin', '<p>The Recycle Bin is empty.</p>', 'info');
      else if (k === 'standup') onStandUp();
    };
    if (b.classList.contains('dicon')) { b.addEventListener('dblclick', go); b.addEventListener('click', e => { screen.querySelectorAll('.dicon.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); if (e.pointerType === 'touch' || e.detail === 0) go(); }); }
    else b.addEventListener('click', go);
  });
  $('#start-btn', screen).addEventListener('click', () => { const m = $('#startmenu', screen); m.hidden = !m.hidden; });
  $('#getup', screen).addEventListener('click', () => onStandUp());
  function tickClock() { const d = new Date(); $('#clock', screen).textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  tickClock(); setInterval(tickClock, 15000);

  // ---------------- dialogs
  let dlgDone = null;
  function dialog(title, html, icon, buttons = [['OK', null]]) {
    const d = $('#dlg', screen);
    $('#dlg-title', screen).textContent = title; $('#dlg-text', screen).innerHTML = html; $('#dlg-icon', screen).innerHTML = icon === 'warn' ? ICON.warn : ICON.info;
    const bb = $('#dlg-btns', screen); bb.innerHTML = '';
    buttons.forEach(([label, fn], i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn98'; b.textContent = label; b.addEventListener('click', () => { closeDialog(); fn && fn(); }); bb.appendChild(b); if (i === 0) setTimeout(() => b.focus(), 0); });
    d.hidden = false; dlgDone = () => { d.hidden = true; };
  }
  function closeDialog() { if (dlgDone) dlgDone(); dlgDone = null; if (!running) $('#m32-list', screen).focus({ preventScroll: true }); }
  $('#dlg', screen).querySelector('[data-dlg]').addEventListener('click', closeDialog);
  function readme() {
    dialog('Read Me', `<p><b>Playing games</b>: pick a game and press Enter, or double-click it. Esc goes back to the list.</p>
      <p><b>Built-in Remakes</b> (${BUILTIN.length} games, joystick icon) play right away.</p>
      <p><b>Arcade ROMs</b>: no ROMs come with this PC. MAME needs each game's ROM set as a .zip named after the romset, like <code>gridlee.zip</code>, from MAME 0.78 (MAME 2003). Copy zips into the <code>roms</code> folder of the download and press F5, or use File \u203a Load ROMs. Ready games get a green screen icon.</p>
      <p><b>Free ROMs</b>: Gridlee, Robby Roto, Super Tank and Poly-Play are shared free by the MAME team at <a href="https://www.mamedev.org/roms/" target="_blank" rel="noopener">mamedev.org/roms</a>. Once their zips are in your <code>roms</code> folder they appear in the list.</p>
      <p>Clones also need their parent set (shown in the picture area), and Neo-Geo games need <code>neogeo.zip</code>.</p>
      <p><b>MAME controls</b>: V coin \u00b7 Enter start \u00b7 arrows move \u00b7 X Z S A buttons.</p>`, 'info');
  }

  // ---------------- adding ROMs
  const input = $('#rom-input', screen);
  input.addEventListener('change', () => { addFiles([...input.files]); input.value = ''; });
  root.addEventListener('dragover', e => { if (running) return; e.preventDefault(); $('#droptip', screen).hidden = false; });
  root.addEventListener('dragleave', e => { if (e.target === root || !root.contains(e.relatedTarget)) $('#droptip', screen).hidden = true; });
  root.addEventListener('drop', e => { e.preventDefault(); $('#droptip', screen).hidden = true; if (!running) addFiles([...e.dataTransfer.files]); });
  async function addFiles(files) {
    const zips = files.filter(f => /\.zip$/i.test(f.name));
    if (!zips.length) { if (files.length) dialog('Load ROMs', '<p>MAME32 takes ROM sets as <b>.zip</b> files, named after the romset (for example <code>pacman.zip</code>).</p>', 'warn'); return; }
    const known = [], unknown = [];
    for (const f of zips) {
      const name = f.name.toLowerCase().replace(/\.zip$/, '').replace(/\s*\(\d+\)$/, '');
      await libPut(name, f);
      (byRom.has(name) ? known : unknown).push(name);
    }
    refresh(false);
    const first = known.map(n => byRom.get(n)).find(g => g.status !== 3);
    if (first) select(first);
    let h = '';
    if (known.length) h += `<p>Added ${known.length} ROM set${known.length === 1 ? '' : 's'}:</p><ul>${known.slice(0, 8).map(n => `<li><code>${n}</code> \u00b7 ${esc(byRom.get(n).title)}</li>`).join('')}${known.length > 8 ? `<li>and ${known.length - 8} more</li>` : ''}</ul>`;
    if (unknown.length) h += `<p>${unknown.length} file${unknown.length === 1 ? ' doesn\'t' : 's don\'t'} match a MAME 0.78 romset name and won't appear in the list: ${unknown.slice(0, 6).map(n => `<code>${esc(n)}.zip</code>`).join(', ')}. Rename it to the romset name (like <code>pacman.zip</code>).</p>`;
    if (!lib.persistent) h += '<p>This browser blocks saved storage here, so these ROMs last until you leave the page.</p>';
    dialog('Load ROMs', h, unknown.length && !known.length ? 'warn' : 'info');
  }
  async function removeRom() {
    const g = view.sel;
    if (!g || g.kind !== 'mame' || !lib.names.has(g.rom)) { dialog('Remove ROM', '<p>Select a game from <b>My ROMs</b> first.</p>', 'info'); return; }
    dialog('Remove ROM', `<p>Remove <code>${g.rom}.zip</code> from the library?</p>`, 'warn', [['Remove', async () => { await libDel(g.rom); refresh(false); drawSnap(); }], ['Cancel', null]]);
  }

  // ---------------- playing
  const layer = $('#gamelayer', screen), gcan = $('#pcgame', screen), host = $('#emu-host', screen);
  function fitGame() {
    if (!running || running.kind !== 'builtin') return;
    const def = running.def, hint = $('#ghint', screen).offsetHeight || 0;
    const aw = layer.clientWidth, ah = layer.clientHeight - hint;
    const k = Math.min(aw / def.width, ah / def.height);
    gcan.style.width = Math.floor(def.width * k) + 'px'; gcan.style.height = Math.floor(def.height * k) + 'px';
  }
  addEventListener('resize', fitGame);
  $('#gfull', screen).addEventListener('click', () => window.toggleFullscreen && window.toggleFullscreen(layer));
  async function play(g) {
    if (!g || running) return;
    if (g.kind === 'builtin') {
      let def;
      try { def = await ensureGame(g.def); } catch (e) { dialog('MAME32', `<p>${esc(g.title)} couldn't load: ${esc(e.message)}</p>`, 'warn'); return; }
      if (running) return;
      layer.hidden = false; gcan.hidden = false; host.hidden = true;
      $('#ghint', screen).textContent = `${g.title} \u00b7 ${g.def.controls || ''} \u00b7 Esc: back to MAME32`;
      layer.classList.toggle('vector', !!g.def.vector);
      running = { kind: 'builtin', def, g };
      running.h = Reg.run(g.def.id, gcan, { onExit: stopGame });
      fitGame(); gcan.focus && gcan.focus();
      return;
    }
    if (g.status === 3) { dialog('MAME32', `<p><b>${esc(g.title)}</b> is a BIOS set. Other games use it; it doesn't play on its own.</p>`, 'info'); return; }
    if (!lib.names.has(g.rom)) {
      const free = FREE.has(g.rom) ? `<p>This one is free: its owners let the MAME team share it. Download <code>${g.rom}.zip</code> from <a href="${FREE_URL}${g.rom}/" target="_blank" rel="noopener">mamedev.org/roms</a>, put it in your <code>roms</code> folder and press F5, or add it with File \u203a Load ROMs.</p>` : '';
      dialog('MAME32', `<p>MAME32 can't find the ROMs for <b>${esc(g.title)}</b>.</p><p>MAME needs <code>${g.rom}.zip</code>${g.parent ? ` (and its parent <code>${g.parent}.zip</code>)` : ''}. Add the file with File \u203a Load ROMs, or copy it into the <code>roms</code> folder and press F5.</p>` + free, 'warn', [['Load ROMs\u2026', () => input.click()], ['OK', null]]);
      return;
    }
    if (typeof DecompressionStream === 'undefined') { dialog('MAME32', '<p>This browser is too old to run MAME. Update it, then try again.</p>', 'warn'); return; }
    const chain = []; let p = g.parent;
    while (p && byRom.has(p) && chain.length < 3) { chain.push(p); p = byRom.get(p).parent; }
    const missing = chain.filter(r => !lib.names.has(r));
    const go = () => startMame(g, chain);
    if (missing.length) dialog('MAME32', `<p><b>${esc(g.title)}</b> may also need ${missing.map(r => `<code>${r}.zip</code>`).join(' and ')}. Some ROM sets include everything; others need the parent too.</p><p>Try anyway?</p>`, 'warn', [['Play', go], ['Cancel', null]]);
    else go();
  }
  async function startMame(g, chain) {
    layer.hidden = false; gcan.hidden = true; host.hidden = false;
    $('#ghint', screen).textContent = `${g.title} \u00b7 V coin \u00b7 Enter start \u00b7 arrows move \u00b7 X Z S A buttons \u00b7 Esc: back to MAME32`;
    running = { kind: 'mame', g };
    host.innerHTML = '<div id="ejs-target"></div>';
    try {
      await loadEmulator();
      if (!running || running.g !== g) return;
      const file = n => libGet(n).then(b => b ? new File([b], n + '.zip') : null);
      const rom = await file(g.rom);
      const parents = (await Promise.all(chain.map(file))).filter(Boolean);
      // track the emulator's audio so it can be shut off on exit
      EMU.contexts = [];
      const Orig = EMU.OrigAC;
      window.AudioContext = class extends Orig { constructor(...a) { super(...a); EMU.contexts.push(this); } };
      const config = {
        gameUrl: rom, dataPath: 'emu/', system: 'mame2003', gameName: g.rom, startOnLoad: true,
        color: '#1d4fbf', backgroundColor: '#000000', threads: false, dontExtractBIOS: true, volume: Reg.audio.muted ? 0 : .6,
        gameParentUrl: parents[0] || '', biosUrl: parents[1] || '', disableDatabases: true, noAutoFocus: false,
        buttonOpts: { playPause: true, restart: true, mute: true, settings: false, fullscreen: true, saveState: false, loadState: false, screenRecord: false, gamepad: true, cheat: false, volume: true, saveSavFiles: false, loadSavFiles: false, quickSave: false, quickLoad: false, screenshot: false, cacheManager: false, exitEmulation: false, netplay: false, diskButton: false, contextMenu: false }
      };
      running.emu = new window.EmulatorJS('#ejs-target', config);
      running.emu.on('start', () => { window.AudioContext = Orig; });
      // a ROM set MAME 0.78 can't use (wrong version, missing files) ends in "Failed to start game"
      const watch = setInterval(() => {
        if (!running || running.g !== g) { clearInterval(watch); return; }
        if (running.emu && running.emu.failedToStart) {
          clearInterval(watch);
          setTimeout(() => {
            if (!running || running.g !== g) return;
            stopGame();
            dialog('MAME32', `<p>MAME couldn't start <b>${esc(g.title)}</b> from <code>${g.rom}.zip</code>.</p><p>This PC runs MAME 0.78 (the MAME 2003 set). ROM zips made for newer MAME versions often have different files inside. Use a MAME 2003 / 0.78 romset${g.parent ? `, and add the parent <code>${g.parent}.zip</code> too` : ''}.</p>`, 'warn');
          }, 2500);
        }
      }, 500);
    } catch (e) {
      console.error(e);
      window.AudioContext = EMU.OrigAC;
      stopGame();
      dialog('MAME32', `<p>MAME couldn't start: ${esc(e.message || e)}</p>`, 'warn');
    }
  }
  function stopGame() {
    if (!running) return;
    const r = running; running = null;
    if (r.kind === 'builtin') r.h && r.h.stop();
    else {
      window.AudioContext = EMU.OrigAC;
      try { r.emu && r.emu.callEvent('exit'); } catch (e) { }
      const ctxs = EMU.contexts.slice(); EMU.contexts = [];
      setTimeout(() => { ctxs.forEach(c => { try { c.close(); } catch (e) { } }); }, 1200);
      setTimeout(() => { if (!running) host.innerHTML = ''; }, 1300);
      host.hidden = true;
    }
    layer.hidden = true;
    showM32(true); drawSnap();
  }
  // Esc leaves a game (or stands up when no game is running); captured before the games see it
  addEventListener('keydown', e => {
    if (!root.classList.contains('on')) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (document.activeElement === $('#dos-in', screen) && !running) { dos.escape(); return; }
      if (!$('#dlg', screen).hidden) closeDialog();
      else if (running) stopGame();
      else if (screen.querySelector('.mi.open') || !$('#startmenu', screen).hidden) closeMenus();
      else onStandUp();
      return;
    }
    if (running) return;
    if (document.activeElement === $('#dos-in', screen)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); input.click(); }
  }, true);

  // ---------------- MS-DOS Prompt: runs "Play My House.bat" the way it runs on a real PC, then starts MAME32
  const dos = (() => {
    const win = $('#dos', screen), out = $('#dos-out', screen), inp = $('#dos-in', screen), body = $('#dos-body', screen), task = $('#task-dos', screen);
    const CWD = 'C:\\GAMEROOM';
    let busy = false, serving = false, timers = [];
    const FILES = {
      'Play My House.bat': ['@echo off', 'rem Starts My House on this PC (a small local web server) and opens it in your browser.', 'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Play My House.ps1"'],
      'Play My House.ps1': ['# My House launcher: serves this folder on http://localhost:8642 and opens it in your browser.', '$root = Split-Path -Parent $MyInvocation.MyCommand.Path', '$port = 8642', '$listener = New-Object System.Net.HttpListener', '$listener.Prefixes.Add("http://localhost:$port/")', '$listener.Start()', 'Write-Host "My House is running at http://localhost:$port/"', 'Write-Host "Leave this window open while you play. Close it to stop."', 'Start-Process "http://localhost:$port/"', 'while ($listener.IsListening) { ... serve the requested file ... }'],
      'README.txt': ['MY HOUSE', '', 'Start it: double-click "Play My House.bat".', 'Leave the black window open while you play.', '', 'Pick a game and press Enter. Esc goes back to the list.', 'Add MAME 0.78 ROM zips with File > Load ROMs.']
    };
    const LISTING = [['GAMES', '<DIR>', '', 'games'], ['EMU', '<DIR>', '', 'emu'], ['MODELS', '<DIR>', '', 'models'], ['VENDOR', '<DIR>', '', 'vendor'],
      ['INDEX', 'HTM', '14,866', 'index.html'], ['MAIN', 'JS', '61,204', 'main.js'], ['PC', 'JS', '48,930', 'pc.js'], ['MAME-L~1', 'JS', '329,848', 'mame-list.js'],
      ['PLAYMY~1', 'BAT', '165', 'Play My House.bat'], ['PLAYMY~2', 'PS1', '1,712', 'Play My House.ps1'], ['README', 'TXT', '1,384', 'README.txt']];
    const print = (t = '') => { out.textContent += t + '\n'; body.scrollTop = body.scrollHeight; dirty = true; };
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const prompt = () => { $('#dos-prompt', screen).textContent = busy ? '' : CWD + '>'; inp.disabled = busy && !serving; };
    function front() { win.style.zIndex = 9; m32.style.zIndex = 8; }
    function open() {
      if (win.hidden) {
        win.hidden = false; task.hidden = false; out.textContent = '';
        print('Microsoft(R) Windows 98'); print('   (C)Copyright Microsoft Corp 1981-1999.'); print('');
      }
      front(); task.classList.add('on'); prompt(); setTimeout(() => inp.focus({ preventScroll: true }), 0);
    }
    function close() { timers.forEach(clearTimeout); timers = []; busy = serving = false; win.hidden = true; task.hidden = true; dirty = true; showM32(true); }
    function run() {
      open();
      if (busy) return;
      busy = true; prompt();
      print(CWD + '>"Play My House.bat"');
      Reg.audio.unlock();
      later(500, () => print('My House is running at http://localhost:8642/'));
      later(800, () => print('Leave this window open while you play. Close it to stop.'));
      later(1100, async () => { await scanFolder(); print(lib.folderOK ? `ROMs folder: ${lib.folderPath} (${lib.folder.size} zip file${lib.folder.size === 1 ? '' : 's'})` : 'ROMs folder: not connected here. Run the downloaded Play My House.bat on your PC.'); });
      later(1700, () => { print('Opening http://localhost:8642/ ...'); });
      later(3200, () => {
        serving = true; prompt();
        showM32(true); m32.style.zIndex = 9; win.style.zIndex = 8;
        rescan(false).then(openAvailable);
        $('#st-1', screen).textContent = 'Started by Play My House.bat \u00b7 double-click a game to play';
      });
    }
    function stopServer() {
      timers.forEach(clearTimeout); timers = [];
      print('^C'); print('Terminate batch job (Y/N)? Y'); print('');
      busy = serving = false; prompt();
    }
    function exec(line) {
      const raw = line.trim(), cmd = raw.toLowerCase().replace(/"/g, '');
      if (serving) { if (cmd === 'y' || cmd === 'n') { print(raw); } else if (raw) print(raw); return; }
      print(CWD + '>' + raw);
      if (!cmd) return;
      const [c0, ...rest] = cmd.split(/\s+/); const arg = rest.join(' ');
      if (['play game room.bat', 'play game room', 'playga~1.bat', 'playga~1', 'play'].includes(cmd)) { busy = false; run(); return; }
      if (c0 === 'cls') { out.textContent = ''; return; }
      if (c0 === 'exit') { close(); return; }
      if (c0 === 'ver') { print(''); print('Windows 98 [Version 4.10.2222]'); print(''); return; }
      if (c0 === 'cd' || c0 === 'chdir') { print(CWD); print(''); return; }
      if (c0 === 'mame32' || c0 === 'mame32.exe') { showM32(true); m32.style.zIndex = 9; win.style.zIndex = 8; return; }
      if (c0 === 'dir') {
        print(''); print(' Volume in drive C is GAMEROOM'); print(' Directory of ' + CWD); print('');
        print('.              <DIR>        10-28-26 12:36a .'); print('..             <DIR>        10-28-26 12:36a ..');
        for (const [n, e, size, long] of LISTING) print(`${n.padEnd(8)} ${e.padEnd(5)} ${(size || '').padStart(9)}  10-28-26 12:36a ${long}`);
        print(`        7 file(s)        398,109 bytes`); print(`        6 dir(s)   2,147,155,968 bytes free`); print(''); return;
      }
      if (c0 === 'type') {
        const name = Object.keys(FILES).find(f => f.toLowerCase() === arg || f.toLowerCase().replace(/\s/g, '') === arg.replace(/\s/g, '') || (arg === 'playga~1.bat' && f.endsWith('.bat')) || (arg === 'playga~2.ps1' && f.endsWith('.ps1')));
        if (!name) { print('File not found - ' + (arg || '')); print(''); return; }
        FILES[name].forEach(l => print(l)); print(''); return;
      }
      if (c0 === 'help' || c0 === '/?') {
        print('Commands: PLAY (runs Play My House.bat), MAME32, DIR, TYPE <file>, CLS, VER, EXIT'); print(''); return;
      }
      print('Bad command or file name'); print('');
    }
    inp.addEventListener('keydown', e => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); if (busy) stopServer(); else { print(CWD + '>' + inp.value + '^C'); inp.value = ''; } return; }
      if (e.key === 'Enter') { e.preventDefault(); const v = inp.value; inp.value = ''; exec(v); }
    });
    win.addEventListener('pointerdown', () => { front(); if (!win.hidden) setTimeout(() => inp.focus({ preventScroll: true }), 0); });
    m32.addEventListener('pointerdown', () => { m32.style.zIndex = 9; win.style.zIndex = 8; });
    win.querySelector('.tbtns').addEventListener('click', e => { const b = e.target.closest('[data-dos]'); if (!b) return; if (b.dataset.dos === 'close') close(); else { win.hidden = true; task.classList.remove('on'); } });
    task.addEventListener('click', () => { if (win.hidden || win.style.zIndex !== '9') { win.hidden = false; open(); } else { win.hidden = true; task.classList.remove('on'); } });
    return { run, open, close, escape() { inp.value = ''; } };
  })();

  // ---------------- the 3D monitor picture (a small copy of the desktop)
  function paintMonitor() {
    if (!dirty) return; dirty = false;
    const c = monitorCanvas(); if (!c) return;
    const g = c.getContext('2d'), W = c.width, Hh = c.height;
    g.fillStyle = '#008080'; g.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#c0c0c0'; g.fillRect(24, 24 + i * 86, 44, 40); g.fillStyle = '#fff'; g.fillRect(16, 70 + i * 86, 60, 12); }
    if (!m32.hidden) {
      const x = 96, y = 18, w = W - 112, h = Hh - 70;
      g.fillStyle = '#c0c0c0'; g.fillRect(x, y, w, h);
      const tg = g.createLinearGradient(x, 0, x + w, 0); tg.addColorStop(0, '#000080'); tg.addColorStop(1, '#1084d0'); g.fillStyle = tg; g.fillRect(x + 3, y + 3, w - 6, 22);
      g.fillStyle = '#fff'; g.font = 'bold 15px Tahoma, Arial, sans-serif'; g.fillText($('#m32-title', screen).textContent, x + 10, y + 19);
      g.fillStyle = '#fff'; g.fillRect(x + 8, y + 62, 120, h - 92); g.fillRect(x + 134, y + 62, w - 300, h - 92); g.fillStyle = '#000'; g.fillRect(x + w - 158, y + 62, 150, 170);
      g.font = '13px Tahoma, Arial, sans-serif';
      const top = Math.floor($('#m32-scroll', screen).scrollTop / ROW);
      for (let i = 0; i < Math.floor((h - 100) / 17); i++) {
        const r = view.rows[top + i]; if (!r) break;
        if (r === view.sel) { g.fillStyle = '#000080'; g.fillRect(x + 134, y + 66 + i * 17, w - 300, 17); }
        g.fillStyle = r === view.sel ? '#fff' : hasRom(r) ? '#000' : '#808080'; g.fillText(r.title.slice(0, 44), x + 158, y + 79 + i * 17);
      }
      if (pic.width) try { g.drawImage(pic, x + w - 150, y + 70, 134, 154); } catch (e) { }
    }
    if (!$('#dos', screen).hidden) {
      g.fillStyle = '#c0c0c0'; g.fillRect(140, 120, 520, 330); g.fillStyle = '#000080'; g.fillRect(143, 123, 514, 22);
      g.fillStyle = '#fff'; g.font = 'bold 14px Tahoma, Arial, sans-serif'; g.fillText('MS-DOS Prompt', 150, 139);
      g.fillStyle = '#000'; g.fillRect(146, 148, 508, 296); g.fillStyle = '#c0c0c0'; g.font = '13px "Courier New", monospace';
      $('#dos-out', screen).textContent.split('\n').slice(-17).forEach((l, i) => g.fillText(l.slice(0, 62), 152, 164 + i * 16));
    }
    g.fillStyle = '#c0c0c0'; g.fillRect(0, Hh - 34, W, 34); g.fillStyle = '#fff'; g.fillRect(0, Hh - 34, W, 2);
    g.fillStyle = '#c0c0c0'; g.fillRect(4, Hh - 30, 80, 26); g.fillStyle = '#000'; g.font = 'bold 15px Tahoma, Arial, sans-serif'; g.fillText('Start', 30, Hh - 11);
    onMonitorChange();
  }

  async function rescan(report) {
    const before = lib.folder.size;
    await scanFolder(); refresh(false); drawSnap();
    if (!report) return;
    if (!lib.folderOK) dialog('Refresh ROMs folder', '<p>No ROMs folder is connected. Start My House with <b>Play My House.bat</b> to scan the <code>roms</code> folder.</p>', 'warn');
    else {
      const known = [...lib.folder.keys()].filter(n => byRom.has(n)).length, unknown = lib.folder.size - known;
      dialog('Refresh ROMs folder', `<p>Scanned <code>${esc(lib.folderPath)}</code>.</p><p>${known} game${known === 1 ? '' : 's'} ready${lib.folder.size !== before ? ` (was ${before} files)` : ''}.${unknown ? ` ${unknown} zip${unknown === 1 ? ' doesn\'t' : 's don\'t'} match a MAME 0.78 romset name.` : ''}</p>`, 'info');
    }
  }
  function openAvailable() {
    showM32(true);
    view.folder = 'avail'; view.sub = ''; view.query = ''; $('#m32-search', screen).value = ''; view.mode = 'icons';
    renderTree(); syncMenuChecks(); refresh(true); saveView();
  }
  addEventListener('keydown', e => { if (e.key === 'F5' && root.classList.contains('on') && !running) { e.preventDefault(); rescan(true); } });

  // ---------------- boot
  const ready = libOpen().then(scanFolder).then(() => {
    renderTree(); renderHead();
    refresh(false);
    let saved = null; try { saved = JSON.parse(localStorage.getItem('gameroom.mame32') || '{}').selId; } catch (e) { }
    const s = saved && games.find(g => g.id === saved);
    if (s && view.rows.includes(s)) select(s);
    dirty = true;
  });
  return {
    open() {
      root.hidden = false; requestAnimationFrame(() => root.classList.add('on'));
      ready.then(() => { drawRows(); select(view.sel, true); if (!m32.hidden) $('#m32-list', screen).focus({ preventScroll: true }); });
    },
    close() {
      if (running) stopGame();
      closeMenus(); closeDialog();
      root.classList.remove('on'); setTimeout(() => { if (!root.classList.contains('on')) root.hidden = true; }, 400);
      dirty = true;
    },
    paintMonitor,
    get running() { return running; },
    select: id => { const g = games.find(x => x.id === id); if (g) select(g); },
    play: id => play(games.find(x => x.id === id)),
    addFiles, openAvailable, ready
  };
}

// A silent attract-mode copy of a built-in game for the picture area (from Valley Arcade's cabinet previews).
function makePreview(def) {
  const noop = () => { };
  let seed = def.id.length * 977 + def.width; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const held = new Set(); let pressed = new Set();
  const mouse = { x: def.width / 2, y: def.height / 2, down: false, clicked: false };
  const api = {
    width: def.width, height: def.height, time: 0, frame: 0,
    key: k => held.has(k), pressed: k => pressed.has(k), anyPressed: (...k) => k.some(x => pressed.has(x)), mouse,
    audio: { tone: noop, noise: noop, melody: () => 0, unlock: noop, setMuted: noop, muted: true },
    credits: 9, useCredit: () => true, continuing: false, offerContinue: (c, end) => { try { end && end(); } catch (e) { } },
    getHiScore: d => { try { return +localStorage.getItem('arcade.hi.' + def.id) || d || 0; } catch (e) { return d || 0; } }, setHiScore: noop, exit: noop
  };
  let game = null, broken = false;
  try { game = def.create(api); } catch (e) { broken = true; }
  const dirs = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  let next = 0, tx = mouse.x, ty = mouse.y;
  function bot() {
    pressed = new Set();
    const f = api.frame;
    if (f % 600 === 120) pressed.add('Enter');
    if (f >= next) { held.clear(); next = f + 15 + r() * 45 | 0; if (r() < .85) held.add(dirs[r() * 4 | 0]); if (r() < .5) held.add('Space'); tx = r() * def.width; ty = r() * def.height * .8; }
    if (r() < .06) pressed.add('Space');
    mouse.x += (tx - mouse.x) * .06; mouse.y += (ty - mouse.y) * .06;
    mouse.clicked = r() < .03; mouse.down = mouse.clicked;
  }
  return {
    step() { if (broken) return; bot(); try { game.update(1 / 60); } catch (e) { broken = true; } api.time += 1 / 60; api.frame++; },
    draw(ctx) {
      if (broken) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, def.width, def.height); return; }
      try { ctx.save(); ctx.imageSmoothingEnabled = false; game.render(ctx); ctx.restore(); } catch (e) { broken = true; }
    }
  };
}
