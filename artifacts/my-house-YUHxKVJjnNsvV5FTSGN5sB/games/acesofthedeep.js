// Aces of the Deep (Dynamix, 1994) -- arcade-friendly original take on the WWII North Atlantic submarine sim.
// Bridge / periscope / chart stations, convoy attacks with a torpedo data computer, deck gun, escorts with
// sonar and depth charges, diving and silent running, patrols scored in gross register tons.
// Everything (art, sound, ship names, text) is original; no national or political markings are shown.
(function () {
  'use strict';
  // ---------- 5x7 bitmap font ----------
  const FONT = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
    4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
    8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0],
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '%': [24, 25, 2, 4, 8, 19, 3], '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], '#': [10, 31, 10, 10, 10, 31, 10]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  // ---------- helpers ----------
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const deg = a => { let d = Math.round(a / D2R) % 360; if (d < 0) d += 360; return d; };
  const p3 = n => String(Math.max(0, Math.round(n))).padStart(3, '0');
  const brg = (ax, ay, bx, by) => Math.atan2(bx - ax, ay - by);
  const dst = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) {
    t = clamp(t, 0, 1); const A = hex(a), B = hex(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  const KN = 0.5144;          // metres per second per knot
  const TS = 6;               // time compression: game seconds per real second
  const VH = 196;             // height of the view area (HUD below)
  const TORP_KT = 30, TORP_RANGE = 6000;
  const TEL_NAMES = ['ASTERN', 'STOP', '1/3', '2/3', 'FULL', 'FLANK'];
  const KT_SURF = [-4, 0, 6, 10, 15, 17.5], KT_SUB = [-2, 0, 2.5, 4.5, 6.5, 7.6];

  const TYPES = {
    freighter: { nm: 'FREIGHTER', len: 115, beam: 16, fb: 6, hp: 1, grt: [2800, 5200], parts: [[0.05, 0.14, 5, 'b'], [0.5, 0.62, 7, 'b'], [0.55, 0.59, 13, 'f'], [0.25, 0.26, 18, 'm'], [0.78, 0.79, 18, 'm']] },
    cargo: { nm: 'CARGO SHIP', len: 140, beam: 19, fb: 7, hp: 2, grt: [5500, 8200], parts: [[0.04, 0.12, 5, 'b'], [0.42, 0.6, 9, 'b'], [0.49, 0.55, 16, 'f'], [0.2, 0.21, 22, 'm'], [0.32, 0.33, 22, 'm'], [0.72, 0.73, 22, 'm'], [0.86, 0.87, 20, 'm']] },
    tanker: { nm: 'TANKER', len: 155, beam: 20, fb: 5, hp: 2, tank: 1, grt: [7500, 10500], parts: [[0.03, 0.2, 8, 'b'], [0.07, 0.12, 15, 'f'], [0.55, 0.62, 8, 'b'], [0.4, 0.41, 14, 'm'], [0.8, 0.81, 14, 'm']] },
    liner: { nm: 'TRANSPORT', len: 170, beam: 22, fb: 9, hp: 3, grt: [11000, 15500], parts: [[0.2, 0.78, 8, 'b'], [0.3, 0.7, 13, 'b'], [0.4, 0.46, 21, 'f'], [0.55, 0.61, 21, 'f'], [0.12, 0.13, 26, 'm'], [0.88, 0.89, 26, 'm']] },
    corvette: { nm: 'CORVETTE', len: 62, beam: 10, fb: 5, hp: 1, grt: 925, esc: 1, max: 16, parts: [[0.55, 0.75, 6, 'b'], [0.45, 0.52, 10, 'f'], [0.6, 0.61, 16, 'm'], [0.84, 0.88, 2.5, 'b'], [0.1, 0.18, 2, 'b']] },
    destroyer: { nm: 'DESTROYER', len: 100, beam: 10, fb: 4, hp: 2, grt: 1350, esc: 1, max: 28, parts: [[0.6, 0.74, 7, 'b'], [0.4, 0.46, 9, 'f'], [0.52, 0.57, 9, 'f'], [0.66, 0.67, 15, 'm'], [0.8, 0.86, 2.5, 'b'], [0.08, 0.14, 2.5, 'b']] }
  };
  const NAMES = ['ARDEN VALE', 'MOORCROFT', 'LADY KESTREL', 'BRAMBLE BAY', 'CAPE HOLLIS', 'NORTHWARD', 'SILVERDUNE', 'PORT ELLERY',
    'WESTMARK', 'GLENROSS', 'STAR OF CALDER', 'HALDEN TRADER', 'MARY BELLAMY', 'OAKRIDGE', 'CORAL QUEEN', 'TYNEWOOD', 'EASTGATE',
    'KINLOCH', 'REDSTONE', 'FAIRHAVEN', 'ELMSWORTH', 'BLUE HERON', 'ASHCOMBE', 'ROSE OF TRALEE', 'HARTLAND', 'MERIDIAN STAR'];
  const WEATHERS = [
    { n: 'CLEAR', sea: 0, vis: 1 }, { n: 'OVERCAST', sea: 1, vis: 0.8 }, { n: 'RAIN', sea: 2, vis: 0.55, rain: 1 },
    { n: 'FOG', sea: 1, vis: 0.35, fog: 1 }, { n: 'GALE', sea: 3, vis: 0.5, rain: 1 }];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  ArcadeRegistry.register({
    id: 'acesofthedeep', title: 'Aces of the Deep', year: 1994, maker: 'Dynamix',
    width: 320, height: 240, vector: false, pointer: true,
    controls: 'Arrows: helm & telegraph \u00b7 Space: fire \u00b7 X: change station (hold X + Up/Down: depth, X + Left/Right: target, X + Space: silent run) \u00b7 Enter: torpedo/deck gun \u00b7 C: crash dive \u00b7 S: surface \u00b7 P: periscope depth \u00b7 R: silent run \u00b7 Z: next target \u00b7 1-3: stations \u00b7 M: chart zoom \u00b7 Mouse: tabs & targets',
    marquee: { bg: '#0a1a28', fg: '#d8e4ea', accent: '#c8a040' },
    create(api) {
      const W = 320, H = 240;
      let mode = 'title', modeT = 0, coinFlash = 0, frame = 0;
      let hi = api.getHiScore(40000);
      let score = 0, lives = 3, patrol = 0, nextExtra = 60000;
      let U = null, ships = [], torps = [], dcs = [], fx = [], shells = [], msgs = [];
      let convoy = null, plane = null, planeT = 0, view = 'bridge', target = null, q = 0, weapon = 'torp';
      let patrolGRT = 0, quota = 0, sunkList = [], weather = WEATHERS[0], light = 1, calmT = 0, respawnT = -1, endT = -1, endReason = '';
      let shake = 0, xHold = false, xCombo = false, zoomManual = 0, zoom = 20, look = 0, clouds = [], convoyN = 0, tmo = 0;
      let lostT = 0, quotaMsg = false, creakT = 0, engT = 0, gunT = 0, radioT = 0, nameIdx = 0, year = 1940, month = 3, wash = 0;
      const holdF = {};
      function rep(code) { if (!api.key(code)) { holdF[code] = 0; return false; } const f = (holdF[code] || 0) + 1; holdF[code] = f; return f === 1 || (f > 22 && f % 8 === 0); }
      function msg(s, col) { msgs.push({ s, t: 4, col: col || '#e8e0b0' }); if (msgs.length > 3) msgs.shift(); }

      // ---------- sound ----------
      const snd = {
        klaxon() { for (let i = 0; i < 4; i++) { api.audio.tone(520, 0.16, { type: 'sawtooth', vol: 0.12, delay: i * 0.36 }); api.audio.tone(390, 0.16, { type: 'sawtooth', vol: 0.12, delay: i * 0.36 + 0.18 }); } },
        launch() { api.audio.noise(0.6, { vol: 0.2, freq: 900, slideTo: 200 }); api.audio.tone(140, 0.4, { type: 'triangle', vol: 0.15, slideTo: 60 }); },
        boom(v) { api.audio.noise(1.4, { vol: 0.3 * v, freq: 600, slideTo: 40 }); api.audio.tone(70, 0.9, { type: 'sine', vol: 0.25 * v, slideTo: 30 }); },
        dc(v) { api.audio.noise(1.1, { vol: 0.32 * v, freq: 260, slideTo: 30 }); api.audio.tone(48, 1.0, { type: 'sine', vol: 0.3 * v, slideTo: 25 }); },
        ping(v, echo) { api.audio.tone(1480, 0.28, { type: 'sine', vol: 0.12 * v }); if (echo) api.audio.tone(1480, 0.12, { type: 'sine', vol: 0.07 * v, delay: 0.32 }); },
        gun() { api.audio.noise(0.25, { vol: 0.22, freq: 1800, slideTo: 300 }); api.audio.tone(110, 0.15, { type: 'square', vol: 0.12, slideTo: 50 }); },
        clank() { api.audio.tone(900, 0.06, { type: 'square', vol: 0.12 }); api.audio.tone(640, 0.1, { type: 'square', vol: 0.1, delay: 0.07 }); },
        creak() { api.audio.tone(rnd(80, 140), 0.9, { type: 'sawtooth', vol: 0.06, slideTo: rnd(50, 70) }); },
        sunk() { api.audio.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.3]], { type: 'square', vol: 0.12, delay: 0.8 }); },
        tick() { api.audio.tone(880, 0.03, { type: 'square', vol: 0.08 }); },
        bell() { api.audio.tone(1320, 0.15, { type: 'triangle', vol: 0.1 }); api.audio.tone(990, 0.2, { type: 'triangle', vol: 0.08, delay: 0.1 }); },
        theme() {
          api.audio.melody([[220, 0.3], [262, 0.3], [330, 0.45], [294, 0.15], [262, 0.3], [247, 0.3], [220, 0.6], [0, 0.1], [196, 0.3], [220, 0.3], [262, 0.45], [247, 0.15], [220, 0.9]], { type: 'triangle', vol: 0.12 });
          api.audio.melody([[110, 1.2], [98, 1.2], [87, 1.2], [110, 1.2]], { type: 'sine', vol: 0.08 });
        }
      };

      // ---------- setup ----------
      function newBoat() {
        U = { x: 0, y: 0, hdg: rnd(0, TAU), tel: 4, spd: 0, depth: 0, dOrd: 0, hull: 100, bat: 100, rud: 0,
          tubes: [1, 1, 1, 1, 1], reloadT: 0, reserve: 9, gun: 120, silent: false, crash: false, leak: 0 };
      }
      function surfaced() { return U.depth < 2; }
      function atScope() { return U.depth <= 16; }
      function lightF() { return light > 0.7 ? 1 : light > 0.4 ? 0.7 : 0.35; }
      function visR() { return 9000 * weather.vis * lightF(); }
      function shipVisible(s) {
        if (U.depth > 16) return false;
        const d = dst(U.x, U.y, s.x, s.y), r = visR() * (surfaced() ? 1 : 0.7) * (s.fire > 0 ? 1.6 : 1);
        return d < r;
      }
      function shipKnown(s) { return shipVisible(s) || dst(U.x, U.y, s.x, s.y) < (s.T.esc ? 6000 : 4500); }
      function toWorld(c, ox, oy) {
        const fx_ = Math.sin(c.hdg), fy = -Math.cos(c.hdg), rx = Math.cos(c.hdg), ry = Math.sin(c.hdg);
        return [c.x + rx * ox + fx_ * oy, c.y + ry * ox + fy * oy];
      }
      function newName() { nameIdx = (nameIdx + 7) % NAMES.length; return NAMES[nameIdx]; }
      function makeShip(t, x, y, hdg) {
        const T = TYPES[t];
        return { t, T, x, y, hdg, spd: 8, hp: T.hp, name: T.esc ? T.nm + ' ' + (T.nm[0]) + '-' + Math.floor(rnd(10, 99)) : newName(),
          grt: T.esc ? T.grt : Math.round(rnd(T.grt[0], T.grt[1]) / 10) * 10, sink: -1, fire: 0, straggle: false,
          st: 'screen', lk: null, lkD: 50, lkT: 0, detT: rnd(0, 2), dropN: 0, dropT: 0, runT: 0, gunT: rnd(2, 6), pingT: rnd(0, 3), stT: 0, side: 1, slot: [0, 0], seenMsg: false };
      }
      function spawnConvoy() {
        convoyN++;
        ships = ships.filter(s => s.sink >= 0);
        const a = rnd(0, TAU), d = 6500 + rnd(0, 1500);
        const cx = U.x + Math.sin(a) * d, cy = U.y - Math.cos(a) * d;
        const hdg = wrap(brg(cx, cy, U.x, U.y) + rnd(-0.45, 0.45));
        convoy = { x: cx, y: cy, hdg, base: hdg, spd: 7 + rnd(0, 2) + Math.min(3, patrol * 0.3), zigT: rnd(40, 80), zig: 0, alert: 0, rep: { x: cx, y: cy }, code: 'K-' + (20 + patrol * 7 + convoyN) };
        const nm = Math.min(13, 4 + patrol + Math.floor(rnd(0, 2)));
        const cols = nm > 8 ? 4 : 3;
        const pool = ['freighter', 'freighter', 'cargo', 'cargo', 'tanker'];
        if (patrol >= 2) pool.push('liner', 'tanker');
        for (let i = 0; i < nm; i++) {
          const c = i % cols, r = Math.floor(i / cols);
          const ox = (c - (cols - 1) / 2) * 450, oy = 300 - r * 550;
          const p = toWorld(convoy, ox, oy);
          const s = makeShip(pick(pool), p[0], p[1], hdg); s.slot = [ox, oy]; s.spd = convoy.spd;
          ships.push(s);
        }
        const ne = Math.min(6, (patrol === 1 ? 1 : 1 + Math.floor(patrol / 2)) + (convoyN > 1 ? 1 : 0));
        const ST = [[0, 1400], [-1150, 200], [1150, 200], [0, -1600], [-900, 1100], [900, 1100]];
        for (let i = 0; i < ne; i++) {
          const t = patrol >= 3 && i % 2 === 1 ? 'destroyer' : 'corvette';
          const p = toWorld(convoy, ST[i][0], ST[i][1]);
          const e = makeShip(t, p[0], p[1], hdg); e.slot = ST[i]; e.spd = convoy.spd; ships.push(e);
        }
        msg('RADIO: CONVOY ' + convoy.code + ' BRG ' + p3(deg(a)) + ' ' + (d / 1000).toFixed(1) + 'KM', '#9fd0ff');
        msg('CONVOY COURSE ' + p3(deg(hdg)) + ' SPEED ' + Math.round(convoy.spd) + 'KT', '#9fd0ff');
        target = null; q = 0; respawnT = -1;
      }
      function startPatrol() {
        patrol++;
        month += 2; if (month > 11) { month -= 12; year = Math.min(1945, year + 1); }
        quota = 12000 + (patrol - 1) * 6500;
        patrolGRT = 0; sunkList = []; convoyN = 0; quotaMsg = false; calmT = 0; endT = -1;
        weather = patrol === 1 ? WEATHERS[0] : patrol === 2 ? WEATHERS[1] : pick(WEATHERS);
        const tod = patrol % 3; light = tod === 1 ? 1 : tod === 2 ? 0.55 : 0.18;
        if (patrol === 1) light = 1;
        clouds = []; for (let i = 0; i < 14; i++) clouds.push({ b: rnd(0, TAU), e: rnd(8, 60), w: rnd(20, 70), h: rnd(4, 12) });
        newBoat(); ships = []; torps = []; dcs = []; fx = []; shells = []; plane = null; planeT = rnd(200, 400);
        spawnConvoy();
        view = 'bridge'; look = U.hdg; mode = 'brief'; modeT = 0;
      }
      function newGame() {
        score = 0; lives = 3; patrol = 0; nextExtra = 60000; year = 1940; month = 1; msgs = [];
        startPatrol();
        snd.theme();
      }
      function tryStart() {
        if (api.useCredit()) { newGame(); return true; }
        coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.2 }); return false;
      }

      // ---------- player actions ----------
      function setTarget(s) { if (s !== target) { target = s; q = 0; if (s) snd.tick(); } }
      function cycleTarget(dir) {
        const c = ships.filter(s => s.sink < 0 && shipKnown(s));
        if (!c.length) { setTarget(null); return; }
        c.sort((a, b) => wrap(brg(U.x, U.y, a.x, a.y) - U.hdg) - wrap(brg(U.x, U.y, b.x, b.y) - U.hdg));
        let i = c.indexOf(target); i = (i + (dir || 1) + c.length) % c.length; if (i < 0) i = 0;
        setTarget(c[i]);
      }
      function cycleView() { view = view === 'bridge' ? 'scope' : view === 'scope' ? 'chart' : 'bridge'; snd.tick(); }
      function effView() {
        let v = view;
        if (v === 'bridge' && !surfaced()) v = 'scope';
        if (v === 'scope' && U.depth > 16) v = 'chart';
        return v;
      }
      function crashDive() {
        if (U.dOrd < 60) { U.dOrd = 100; U.crash = true; snd.klaxon(); msg('ALARM! CRASH DIVE!', '#ff8060'); }
      }
      function setDepth(d) { const o = U.dOrd; U.dOrd = clamp(d, 0, 240); if (o === 0 && U.dOrd > 0) { snd.klaxon(); msg('FLOOD TANKS - DIVING'); } if (o > 0 && U.dOrd === 0) msg('BLOW TANKS - SURFACING'); }
      function toggleSilent() { U.silent = !U.silent; msg(U.silent ? 'SILENT RUNNING' : 'SILENT RUNNING SECURED'); if (U.silent && U.tel > 2) U.tel = 2; }
      function torpsLeft() { return U.tubes.reduce((a, b) => a + b, 0) + U.reserve; }
      function solveIntercept(rx, ry, vx, vy, vt) {
        const a = vx * vx + vy * vy - vt * vt, b = 2 * (rx * vx + ry * vy), c = rx * rx + ry * ry;
        let t;
        if (Math.abs(a) < 1e-6) t = -c / b; else { const dd = b * b - 4 * a * c; if (dd < 0) return null; const s = Math.sqrt(dd); const t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a); t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2); }
        if (!(t > 0)) return null;
        return Math.atan2(rx + vx * t, -(ry + vy * t));
      }
      function fire() {
        if (weapon === 'gun') { fireGun(); return; }
        if (!target || target.sink >= 0) { msg('NO TARGET SELECTED'); return; }
        if (U.depth > 22) { msg('TOO DEEP TO FIRE'); return; }
        const err = 1 - q;
        const eh = target.hdg + rnd(-1, 1) * err * 0.6, es = target.spd * (1 + rnd(-1, 1) * err * 0.45);
        const vx = Math.sin(eh) * es * KN, vy = -Math.cos(eh) * es * KN;
        const h = solveIntercept(target.x - U.x, target.y - U.y, vx, vy, TORP_KT * KN);
        if (h === null) { msg('NO FIRING SOLUTION'); return; }
        const rel = wrap(h - U.hdg);
        let tube = -1;
        if (Math.abs(rel) <= 100 * D2R) { for (let i = 0; i < 4; i++) if (U.tubes[i]) { tube = i; break; } }
        else if (U.tubes[4]) tube = 4;
        if (tube < 0) { msg(Math.abs(rel) <= 100 * D2R ? 'BOW TUBES EMPTY' : 'STERN TUBE EMPTY - TURN BOW ON'); return; }
        U.tubes[tube] = 0;
        const back = tube === 4 ? -1 : 1;
        torps.push({ x: U.x + Math.sin(U.hdg) * 30 * back, y: U.y - Math.cos(U.hdg) * 30 * back, hdg: h, run: 0, dud: Math.random() < 0.07, trail: [] });
        snd.launch(); msg('TUBE ' + (tube + 1) + ' LOS! GYRO ' + p3(deg(h)) + '  SOLUTION ' + Math.round(q * 100) + '%');
      }
      function fireGun() {
        if (!surfaced()) { msg('DECK GUN: MUST BE SURFACED'); return; }
        if (weather.sea >= 3) { msg('SEAS TOO HEAVY FOR THE GUN'); return; }
        if (U.gun <= 0) { msg('NO GUN AMMUNITION'); return; }
        if (gunT > 0) return;
        if (!target || target.sink >= 0 || !shipVisible(target)) { msg('GUN: NO VISIBLE TARGET'); return; }
        const d = dst(U.x, U.y, target.x, target.y);
        if (d > 4500) { msg('GUN: OUT OF RANGE'); return; }
        U.gun--; gunT = 1.2; snd.gun();
        const p = clamp(1.15 - d / 3200, 0.12, 0.9) * (1 - weather.sea * 0.12);
        shells.push({ s: target, t: d / 650, hit: Math.random() < p });
      }

      // ---------- simulation ----------
      function steerTo(s, desired, kt, rate, gdt) {
        const dh = wrap(desired - s.hdg); s.hdg = wrap(s.hdg + clamp(dh, -rate * gdt, rate * gdt));
        s.spd += clamp(kt - s.spd, -1.5 * gdt, 1.5 * gdt);
        s.x += Math.sin(s.hdg) * s.spd * KN * gdt; s.y -= Math.cos(s.hdg) * s.spd * KN * gdt;
      }
      function formation(s, gdt, extra) {
        const p = toWorld(convoy, s.slot[0], s.slot[1]);
        const dx = p[0] - s.x, dy = p[1] - s.y;
        const along = dx * Math.sin(convoy.hdg) - dy * Math.cos(convoy.hdg);
        const lat = dx * Math.cos(convoy.hdg) + dy * Math.sin(convoy.hdg);
        steerTo(s, convoy.hdg + clamp(lat / 400, -0.6, 0.6), clamp(convoy.spd + along / 100, 2, convoy.spd + extra), 2.5 * D2R, gdt);
      }
      function alertEscorts(x, y, err, depthGuess) {
        convoy && (convoy.alert = 1);
        for (const e of ships) {
          if (!e.T.esc || e.sink >= 0) continue;
          if (dst(e.x, e.y, x, y) > 9000) continue;
          if (e.st === 'screen' || e.st === 'search') {
            e.st = 'hunt'; e.lk = { x: x + rnd(-err, err), y: y + rnd(-err, err) }; e.lkD = depthGuess; e.lkT = 0; e.stT = 0;
          }
        }
      }
      function contact(e, exact) {
        const d = dst(e.x, e.y, U.x, U.y);
        const err = exact ? 10 : 15 + d * 0.05;
        e.lk = { x: U.x + rnd(-err, err), y: U.y + rnd(-err, err) }; e.lkT = 0;
        e.lkD = clamp(U.depth + rnd(-1, 1) * (20 + U.depth * 0.15) * (U.silent ? 1.5 : 1), 15, 230);
        if (e.st === 'screen' || e.st === 'search') {
          e.st = 'hunt'; e.stT = 0;
          if (!e.seenMsg) { msg(e.name + ' HAS CONTACT!', '#ff9070'); e.seenMsg = true; }
          for (const o of ships) if (o !== e && o.T.esc && o.sink < 0 && o.st === 'screen' && dst(o.x, o.y, e.x, e.y) < 4000 && Math.random() < 0.6) { o.st = 'hunt'; o.lk = { x: e.lk.x, y: e.lk.y }; o.lkD = e.lkD; o.lkT = 0; o.stT = 0; }
          if (convoy) convoy.alert = 1;
        }
      }
      function detect(e) {
        const d = dst(e.x, e.y, U.x, U.y);
        if (surfaced()) {
          const r = 2300 * weather.vis * (light > 0.7 ? 1 : light > 0.4 ? 0.6 : 0.3) * (U.spd > 12 ? 1.2 : 1);
          if (d < r && Math.random() < 0.8) { contact(e, true); return; }
        } else if (U.depth <= 16 && effView() === 'scope' && d < 1000 * weather.vis && Math.random() < 0.25) { contact(e, true); return; }
        if (!surfaced()) {
          const noise = (0.45 + Math.abs(U.spd) / 9) * (U.silent ? 0.65 : 1);
          const R = (e.st === 'screen' ? 900 : 1700) * noise * (U.depth > 110 ? 0.65 : 1) * (U.silent ? 0.75 : 1) * (e.spd > 16 ? 0.5 : 1) * (1 - weather.sea * 0.12);
          if (d < R && d > 330 && Math.random() < 0.6) contact(e, false);
        }
      }
      function hurt(dmg, why) {
        U.hull -= dmg; shake = Math.min(14, shake + dmg * 0.4);
        if (dmg > 6) { U.leak = Math.min(3, U.leak + (dmg > 20 ? 1 : 0)); msg(why + ' HULL ' + Math.max(0, Math.round(U.hull)) + '%', '#ff7050'); }
      }
      function sinkShip(s, how) {
        if (s.sink >= 0) return;
        s.sink = 0; s.fire = s.T.tank ? 2 : 1;
        patrolGRT += s.grt; score += s.grt; sunkList.push(s.name + ' ' + s.grt);
        msg((how || 'SUNK') + ': ' + s.name + ' ' + s.grt + (s.T.esc ? ' T' : ' GRT'), '#ffe070');
        snd.sunk();
        if (score >= nextExtra) { lives++; nextExtra += 60000; msg('NEW BOAT ASSIGNED - EXTRA LIFE', '#80ff80'); }
        if (score > hi) { hi = score; api.setHiScore(hi); }
        if (s === target) { target = null; q = 0; }
      }
      function hitShip(s, x, y, dmg) {
        fx.push({ x, y, t: 0, k: 'boom', big: dmg >= 1 });
        const d = dst(U.x, U.y, x, y); snd.boom(clamp(1.4 - d / 6000, 0.3, 1));
        s.hp -= dmg;
        if (s.hp <= 0.001) sinkShip(s);
        else { s.straggle = !s.T.esc && dmg >= 1; if (dmg >= 1) { s.fire = Math.max(s.fire, 0.5); msg('HIT! ' + s.name + ' DAMAGED', '#ffd080'); } }
      }
      function boatLost() {
        mode = 'lost'; lostT = 0; snd.dc(1); api.audio.noise(2.5, { vol: 0.25, freq: 400, slideTo: 60, delay: 0.6 });
      }
      function afterLost() {
        lives--;
        if (lives > 0) { respawn(); return; }
        mode = 'wait';
        const done = () => { mode = 'over'; modeT = 0; if (score > hi) { hi = score; api.setHiScore(hi); } };
        if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, done); else done();
      }
      function respawn() {
        const keepGRT = patrolGRT;
        newBoat(); patrolGRT = keepGRT;
        torps = []; dcs = []; shells = [];
        for (const s of ships) if (s.T.esc && s.st !== 'screen') { s.st = 'screen'; s.seenMsg = false; }
        if (convoy) { const a = rnd(0, TAU); U.x = convoy.x + Math.sin(a) * 6500; U.y = convoy.y - Math.cos(a) * 6500; U.hdg = brg(U.x, U.y, convoy.x, convoy.y); }
        mode = 'play'; msg('A NEW BOAT TAKES STATION', '#80ff80'); target = null; q = 0; look = U.hdg;
      }
      function endPatrol(reason) { mode = 'tally'; modeT = 0; endReason = reason; if (patrolGRT >= quota) { const b = 2000 + patrol * 500; score += b; endReason += '  BONUS ' + b; } if (score > hi) { hi = score; api.setHiScore(hi); } api.audio.melody([[262, 0.2], [330, 0.2], [392, 0.2], [523, 0.5]], { type: 'triangle', vol: 0.14 }); }

      function simulate(dt) {
        const gdt = dt * TS;
        tmo += gdt;
        // ---- helm & engines ----
        const sub = !surfaced();
        let maxTel = U.silent ? 2 : 5;
        U.tel = clamp(U.tel, 0, maxTel);
        let kt = (sub ? KT_SUB : KT_SURF)[U.tel];
        if (sub && U.bat <= 0) kt = Math.min(kt, 1);
        if (U.leak > 0) kt *= 1 - U.leak * 0.1;
        U.spd += clamp(kt - U.spd, -0.6 * gdt, 0.4 * gdt);
        const turn = U.rud * (1 + Math.min(1, Math.abs(U.spd) / 5) * 2.5) * D2R;
        U.hdg = wrap(U.hdg + turn * gdt * (U.spd < 0 ? -1 : 1));
        U.x += Math.sin(U.hdg) * U.spd * KN * gdt; U.y -= Math.cos(U.hdg) * U.spd * KN * gdt;
        // depth
        const rate = (U.crash ? 1.6 : 0.9) * gdt;
        U.depth += clamp(U.dOrd - U.depth, -rate, rate);
        if (Math.abs(U.depth - U.dOrd) < 0.5) U.crash = false;
        if (U.depth > 200) { creakT -= dt; if (creakT <= 0) { creakT = rnd(1.5, 3); snd.creak(); } }
        if (U.depth > 230) { hurt((U.depth - 230) * 0.03 * gdt + 0.1 * gdt, 'CRUSH DEPTH!'); }
        if (U.depth > 205 && Math.random() < 0.004) msg('HULL GROANING - TOO DEEP', '#ffb060');
        // battery
        if (sub) U.bat = Math.max(0, U.bat - (0.004 + Math.abs(U.spd) * Math.abs(U.spd) * 0.0018) * gdt);
        else U.bat = Math.min(100, U.bat + (U.spd <= 10.5 ? 0.06 : 0.02) * gdt);
        if (sub && U.bat <= 0 && Math.random() < 0.003) msg('BATTERY EXHAUSTED - SURFACE!', '#ff9070');
        if (U.leak > 0 && sub) U.hull -= 0.002 * U.leak * gdt;
        if (!sub) { U.leak = Math.max(0, U.leak - 0.002 * gdt); engT -= dt; if (engT <= 0) { engT = 0.22; api.audio.tone(45 + U.spd * 2, 0.12, { type: 'triangle', vol: 0.035 }); } }
        // reload: one tube at a time
        if (U.reserve > 0 && U.tubes.some(t => !t)) {
          U.reloadT += gdt;
          if (U.reloadT >= 45) { U.reloadT = 0; const i = U.tubes.indexOf(0); U.tubes[i] = 1; U.reserve--; msg('TUBE ' + (i + 1) + ' RELOADED'); }
        } else U.reloadT = 0;
        gunT = Math.max(0, gunT - dt);
        // ---- convoy ----
        if (convoy) {
          convoy.zigT -= gdt;
          if (convoy.zigT <= 0) { convoy.zigT = rnd(60, 110) * (convoy.alert ? 0.6 : 1); convoy.zig = convoy.alert ? rnd(-0.8, 0.8) : rnd(-0.45, 0.45); q *= 0.6; }
          const want = wrap(convoy.base + convoy.zig);
          convoy.hdg = wrap(convoy.hdg + clamp(wrap(want - convoy.hdg), -1.5 * D2R * gdt, 1.5 * D2R * gdt));
          convoy.x += Math.sin(convoy.hdg) * convoy.spd * KN * gdt; convoy.y -= Math.cos(convoy.hdg) * convoy.spd * KN * gdt;
          radioT -= gdt; if (radioT <= 0) { radioT = 240; convoy.rep = { x: convoy.x + rnd(-600, 600), y: convoy.y + rnd(-600, 600) }; }
        }
        // ---- ships ----
        for (const s of ships) {
          if (s.sink >= 0) { s.sink += gdt / 45; s.spd = Math.max(0, s.spd - 0.5 * gdt); s.x += Math.sin(s.hdg) * s.spd * KN * gdt; s.y -= Math.cos(s.hdg) * s.spd * KN * gdt; continue; }
          if (s.fire > 0) s.fire = Math.max(s.fire > 0.6 ? 0.6 : 0, s.fire - 0.002 * gdt);
          if (!s.T.esc) {
            if (s.straggle || !convoy) steerTo(s, s.hdg, 3, 1 * D2R, gdt); else formation(s, gdt, 2.5);
            // some merchants carry a stern gun
            if (surfaced() && convoy && convoy.alert && s.grt > 6000 && !s.straggle) {
              s.gunT -= gdt; const d = dst(s.x, s.y, U.x, U.y);
              if (s.gunT <= 0 && d < 2200) { s.gunT = rnd(10, 18); const hit = Math.random() < 0.25 * (1 - d / 2200) + 0.04; fx.push({ x: U.x + rnd(-60, 60), y: U.y + rnd(-60, 60), t: 0, k: 'splash' }); if (hit) hurt(rnd(2, 5), 'GUNFIRE!'); }
            }
            continue;
          }
          // escort AI
          s.detT -= gdt; s.lkT += gdt; s.stT += gdt;
          if (s.detT <= 0) { s.detT = 2; detect(s); }
          const pinging = s.st !== 'screen';
          if (pinging) { s.pingT -= gdt; if (s.pingT <= 0) { s.pingT = 14; const d = dst(s.x, s.y, U.x, U.y); if (d < 5000 && !surfaced()) snd.ping(clamp(1.2 - d / 5000, 0.15, 1), s.lkT < 4); } }
          if (s.st === 'screen') { if (convoy) formation(s, gdt, 6); else steerTo(s, s.hdg, 12, 3 * D2R, gdt); }
          else if (s.st === 'hunt') {
            const d = dst(s.x, s.y, s.lk.x, s.lk.y);
            steerTo(s, brg(s.x, s.y, s.lk.x, s.lk.y), d > 1500 ? s.T.max : 14, 5 * D2R, gdt);
            if (d < 45 && s.lkT < 60) { s.st = 'drop'; s.dropN = 4 + Math.min(6, patrol); s.dropT = 0; s.side = 1; }
            else if (s.lkT > 110 || (d < 45 && s.lkT >= 60)) { s.st = 'search'; s.stT = 0; }
          } else if (s.st === 'drop') {
            steerTo(s, s.hdg, 13, 0, gdt);
            s.dropT -= gdt;
            if (s.dropT <= 0) {
              s.dropT = 4; s.dropN--; s.side = -s.side;
              const lat = s.dropN % 3 === 0 ? 0 : s.side * 45;
              dcs.push({ x: s.x + Math.cos(s.hdg) * lat, y: s.y + Math.sin(s.hdg) * lat, z: 0, set: s.lkD + rnd(-12, 12) });
              if (s.dropN <= 0) { s.st = 'open'; s.runT = 45; }
            }
          } else if (s.st === 'open') {
            steerTo(s, s.hdg, 15, 0.5 * D2R, gdt); s.runT -= gdt;
            if (s.runT <= 0) { s.st = s.lkT < 100 ? 'hunt' : 'search'; s.stT = 0; }
          } else if (s.st === 'search') {
            const c = s.lk || { x: s.x, y: s.y };
            const a = brg(c.x, c.y, s.x, s.y) + 0.9;
            steerTo(s, brg(s.x, s.y, c.x + Math.sin(a) * 600, c.y - Math.cos(a) * 600), 12, 4 * D2R, gdt);
            if (s.stT > 150) { s.st = 'screen'; s.seenMsg = false; }
          }
          // gunfire at a surfaced boat
          if (surfaced() && s.st !== 'screen' && s.lkT < 10) {
            s.gunT -= gdt; const d = dst(s.x, s.y, U.x, U.y);
            if (s.gunT <= 0 && d < 3200) {
              s.gunT = rnd(6, 9);
              fx.push({ x: U.x + rnd(-80, 80), y: U.y + rnd(-80, 80), t: 0, k: 'splash' });
              api.audio.noise(0.2, { vol: 0.08, freq: 900, delay: d / 4000 });
              if (Math.random() < 0.12 + 0.4 * (1 - d / 3200)) hurt(rnd(5, 10), 'SHELL HIT!');
            }
          }
          // collision: ramming a surfaced/shallow boat
          if (U.depth < 12 && dst(s.x, s.y, U.x, U.y) < 40 && s.spd > 5) { hurt(60, 'RAMMED!'); s.hp -= 0.5; }
        }
        // ---- player torpedoes ----
        for (const t of torps) {
          const step = TORP_KT * KN * gdt;
          t.x += Math.sin(t.hdg) * step; t.y -= Math.cos(t.hdg) * step; t.run += step;
          if ((frame & 7) === 0) { t.trail.push([t.x, t.y]); if (t.trail.length > 30) t.trail.shift(); }
          for (const s of ships) {
            if (s.sink >= 0) continue;
            const dx = t.x - s.x, dy = t.y - s.y;
            const al = dx * Math.sin(s.hdg) - dy * Math.cos(s.hdg), la = dx * Math.cos(s.hdg) + dy * Math.sin(s.hdg);
            if (Math.abs(al) < s.T.len / 2 && Math.abs(la) < s.T.beam / 2 + 3) {
              t.dead = true;
              if (t.dud) { msg('DUD! TORPEDO FAILED TO DETONATE', '#c0c0c0'); snd.clank(); if (s.T.esc) alertEscorts(U.x, U.y, 900, 60); }
              else { hitShip(s, t.x, t.y, 1); alertEscorts(U.x, U.y, 700 + dst(U.x, U.y, t.x, t.y) * 0.2, U.depth + 40); }
              break;
            }
          }
          if (!t.dead && t.run > TORP_RANGE) { t.dead = true; msg('TORPEDO RAN OUT - MISS', '#a0a0a0'); }
        }
        torps = torps.filter(t => !t.dead);
        // ---- shells ----
        for (const s of shells) {
          s.t -= dt;
          if (s.t <= 0) {
            s.dead = true;
            if (s.s.sink >= 0) continue;
            if (s.hit) { hitShip(s.s, s.s.x + rnd(-20, 20), s.s.y + rnd(-10, 10), 0.25); if (s.s.T.esc) alertEscorts(U.x, U.y, 50, 0); else if (convoy) convoy.alert = 1; }
            else fx.push({ x: s.s.x + rnd(-90, 90), y: s.s.y + rnd(-90, 90), t: 0, k: 'splash' });
          }
        }
        shells = shells.filter(s => !s.dead);
        // ---- depth charges ----
        for (const c of dcs) {
          c.z += 3.2 * gdt;
          if (c.z >= c.set) {
            c.dead = true;
            const d3 = Math.hypot(c.x - U.x, c.y - U.y, c.z - U.depth);
            const dh = dst(c.x, c.y, U.x, U.y);
            fx.push({ x: c.x, y: c.y, t: 0, k: 'column', z: c.z });
            snd.dc(clamp(1.3 - d3 / 900, 0.2, 1));
            shake = Math.min(14, shake + clamp(8 - d3 / 60, 1, 8));
            if (d3 < 62) hurt((62 - d3) * 0.85, 'DEPTH CHARGES!');
            else if (dh < 300 && Math.random() < 0.3) msg('CLOSE ONE - LIGHTS FLICKER', '#ffd080');
          }
        }
        dcs = dcs.filter(c => !c.dead);
        // ---- aircraft ----
        if (patrol >= 2 && light > 0.6 && weather.sea < 3) {
          if (!plane && surfaced()) { planeT -= gdt; if (planeT <= 0) { plane = { b: rnd(0, TAU), d: 9000 }; msg('ALARM! AIRCRAFT BEARING ' + p3(deg(plane.b)), '#ff8060'); snd.klaxon(); } }
          if (plane) {
            plane.d -= 150 * gdt;
            if (plane.d <= 0 && !plane.done) {
              plane.done = true;
              if (U.depth < 25) { for (let i = 0; i < 3; i++) fx.push({ x: U.x + rnd(-50, 50), y: U.y + rnd(-50, 50), t: -i * 0.2, k: 'column', z: 5 }); snd.dc(1); hurt(rnd(18, 32), 'AIR ATTACK!'); }
              else msg('BOMBS FALL WIDE - WE ARE DEEP', '#a0ffa0');
              alertEscorts(U.x, U.y, 300, 60);
            }
            if (plane.d < -6000) { plane = null; planeT = rnd(300, 600); }
          }
        }
        // ---- target & solution ----
        if (target && (target.sink >= 0 || !shipKnown(target))) { target = null; q = 0; }
        if (!target) {
          let best = null, bd = 1e9;
          for (const s of ships) if (s.sink < 0 && !s.T.esc && shipKnown(s)) { const d = dst(U.x, U.y, s.x, s.y); if (d < bd) { bd = d; best = s; } }
          if (best) setTarget(best);
        }
        if (target) {
          const d = dst(U.x, U.y, target.x, target.y);
          if (shipVisible(target)) q = Math.min(1, q + gdt * (d < 2500 ? 0.03 : 0.015) * (effView() === 'chart' ? 0.6 : 1));
          else q = Math.min(Math.max(q, 0), q < 0.45 ? q + gdt * 0.004 : q);
        }
        // ---- fx ----
        for (const f of fx) f.t += dt;
        fx = fx.filter(f => f.t < (f.k === 'boom' ? 6 : 2.5));
        ships = ships.filter(s => !(s.sink >= 1) && dst(s.x, s.y, U.x, U.y) < 16000);
        if (shake > 0) shake = Math.max(0, shake - dt * 10);
        // ---- patrol state ----
        if (U.hull <= 0) { U.hull = 0; boatLost(); return; }
        if (!quotaMsg && patrolGRT >= quota) { quotaMsg = true; msg('QUOTA MET! BREAK OFF AND SHAKE THE ESCORTS', '#80ff80'); snd.bell(); }
        if (patrolGRT >= quota) {
          const hunted = ships.some(e => e.T.esc && e.sink < 0 && e.st !== 'screen' && dst(e.x, e.y, U.x, U.y) < 5000) || dcs.length > 0;
          calmT = hunted ? 0 : calmT + dt;
          if (calmT > 5) { endPatrol('QUOTA MET - RETURNING TO BASE'); return; }
        }
        const merchants = ships.filter(s => !s.T.esc && s.sink < 0 && dst(s.x, s.y, U.x, U.y) < 12000);
        if (!merchants.length && respawnT < 0) { respawnT = 12; msg('CONVOY GONE - HQ VECTORING US TO A NEW ONE', '#9fd0ff'); }
        if (respawnT >= 0) { respawnT -= dt; if (respawnT <= 0) { respawnT = -1; ships = ships.filter(s => s.sink >= 0); spawnConvoy(); } }
        if (torpsLeft() === 0 && torps.length === 0 && (U.gun <= 0 || weather.sea >= 3) && patrolGRT < quota) {
          if (endT < 0) { endT = 4; msg('NO WEAPONS LEFT - RETURNING TO BASE', '#ffd080'); }
          endT -= dt; if (endT <= 0) { endPatrol('OUT OF WEAPONS'); }
        }
      }

      function handleInput() {
        if (api.pressed('KeyX')) { xHold = true; xCombo = false; }
        const up = rep('ArrowUp'), dn = rep('ArrowDown'), lf = rep('ArrowLeft'), rt = rep('ArrowRight');
        if (xHold) {
          if (up) { setDepth(U.dOrd <= 20 ? (U.dOrd > 12 ? 12 : 0) : U.dOrd - 20); xCombo = true; }
          if (dn) { setDepth(U.dOrd < 12 ? 12 : U.dOrd < 20 ? 20 : U.dOrd + 20); xCombo = true; }
          if (lf) { cycleTarget(-1); xCombo = true; }
          if (rt) { cycleTarget(1); xCombo = true; }
          if (api.pressed('Space')) { toggleSilent(); xCombo = true; }
          U.rud = 0;
          if (!api.key('KeyX')) { xHold = false; if (!xCombo) cycleView(); }
        } else {
          U.rud = (api.key('ArrowLeft') ? -1 : 0) + (api.key('ArrowRight') ? 1 : 0);
          if (api.pressed('ArrowUp')) { if (U.tel < (U.silent ? 2 : 5)) { U.tel++; snd.bell(); } else if (U.silent) msg('SILENT RUNNING: 1/3 MAX'); }
          if (api.pressed('ArrowDown')) { if (U.tel > 0) { U.tel--; snd.bell(); } }
          if (api.pressed('Space')) fire();
        }
        if (api.pressed('Enter') || api.pressed('KeyG')) { weapon = weapon === 'torp' ? 'gun' : 'torp'; msg(weapon === 'torp' ? 'WEAPON: TORPEDOES' : 'WEAPON: DECK GUN (' + U.gun + ' RDS)'); snd.tick(); }
        if (api.pressed('KeyC')) crashDive();
        if (api.pressed('KeyS')) setDepth(0);
        if (api.pressed('KeyP')) setDepth(12);
        if (api.pressed('KeyR')) toggleSilent();
        if (api.pressed('KeyZ') || api.pressed('Tab')) cycleTarget(1);
        if (api.pressed('Digit1')) view = 'bridge';
        if (api.pressed('Digit2')) view = 'scope';
        if (api.pressed('Digit3')) view = 'chart';
        if (api.pressed('KeyM')) { zoomManual = zoomManual === 0 ? 8 : zoomManual === 8 ? 25 : zoomManual === 25 ? 60 : 0; msg('CHART ZOOM ' + (zoomManual ? Math.round(zoomManual * 100) + 'M/DIV' : 'AUTO')); }
        if (api.mouse.clicked) clickAt(api.mouse.x, api.mouse.y);
      }
      function clickAt(mx, my) {
        if (my >= 228 && mx >= 230) { const i = Math.floor((mx - 230) / 30); view = ['bridge', 'scope', 'chart'][clamp(i, 0, 2)]; snd.tick(); return; }
        if (my > VH) return;
        const v = effView();
        let best = null, bd = 30;
        for (const s of ships) {
          if (s.sink >= 0 || !shipKnown(s)) continue;
          let sx, sy;
          if (v === 'chart') { sx = 160 + (s.x - U.x) / zoom; sy = 98 + (s.y - U.y) / zoom; }
          else { if (!shipVisible(s)) continue; const P = v === 'scope' ? 458 : 305; sx = 160 + wrap(brg(U.x, U.y, s.x, s.y) - look) * P; sy = 90; }
          const d = v === 'chart' ? Math.hypot(sx - mx, sy - my) : Math.abs(sx - mx);
          if (d < bd) { bd = d; best = s; }
        }
        if (best) setTarget(best);
      }

      // ---------- update ----------
      function update(dt) {
        frame++; modeT += dt;
        if (coinFlash > 0) coinFlash--;
        for (const m of msgs) m.t -= dt;
        msgs = msgs.filter(m => m.t > 0);
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) tryStart();
          return;
        }
        if (mode === 'brief') {
          if ((modeT > 1 && (api.anyPressed('Enter', 'Space') || api.mouse.clicked)) || modeT > 10) { mode = 'play'; modeT = 0; snd.bell(); }
          return;
        }
        if (mode === 'tally') {
          if ((modeT > 2 && (api.anyPressed('Enter', 'Space') || api.mouse.clicked)) || modeT > 12) startPatrol();
          return;
        }
        if (mode === 'over') { if (modeT > 6 || (modeT > 2 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; modeT = 0; } return; }
        if (mode === 'wait') return;
        if (mode === 'lost') { lostT += dt; U.depth += dt * 20; if (lostT > 3.5) afterLost(); return; }
        handleInput();
        simulate(dt);
        // smooth look direction
        const v = effView();
        let want = U.hdg;
        if (target && shipVisible(target) && v !== 'chart') want = brg(U.x, U.y, target.x, target.y);
        look = wrap(look + clamp(wrap(want - look), -2.5 * dt, 2.5 * dt));
        const z = zoomManual || clamp((target ? dst(U.x, U.y, target.x, target.y) : 2000) * 1.3 / 85, 6, 60);
        zoom += (z - zoom) * 0.05;
        if (v === 'scope' && weather.sea >= 1 && Math.random() < 0.004 * weather.sea) wash = 1;
        wash = Math.max(0, wash - dt * 0.9);
      }

      // ---------- rendering ----------
      function skyCols() {
        let top, hor, sea;
        if (light > 0.7) { top = weather.sea >= 1 || weather.fog ? '#6c7a88' : '#4f84bc'; hor = weather.fog ? '#b8bec4' : weather.sea >= 1 ? '#a4aeb6' : '#b6cfe2'; sea = weather.sea >= 2 ? '#34495a' : '#2b5577'; }
        else if (light > 0.4) { top = '#2c3058'; hor = '#c07650'; sea = '#283a50'; }
        else { top = '#03060c'; hor = '#14202e'; sea = '#08121c'; }
        return { top, hor, sea };
      }
      function drawShip(ctx, s, sx, by, sc, bowDir, aspect, col, t) {
        const T = s.T, Lm = T.len * aspect + T.beam * (1 - aspect);
        const L = Lm * sc;
        if (L < 2) { ctx.fillStyle = col; ctx.fillRect(Math.round(sx), Math.round(by - 1), Math.max(1, Math.round(L)), 1); if (T.parts.length) ctx.fillRect(Math.round(sx), Math.round(by - 2), 1, 1); return; }
        const P = u => sx + (u - 0.5) * L * bowDir;
        const fb = Math.max(1, T.fb * sc);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(P(0), by - fb * 0.95); ctx.lineTo(P(0.04), by); ctx.lineTo(P(0.92), by); ctx.lineTo(P(1), by - fb * 1.3); ctx.lineTo(P(0.85), by - fb * 1.15); ctx.lineTo(P(0.85), by - fb);
        ctx.lineTo(P(0.1), by - fb); ctx.closePath(); ctx.fill();
        for (const p of T.parts) {
          const x0 = P(p[0]), x1 = P(p[1]), xa = Math.min(x0, x1), w = Math.max(1, Math.abs(x1 - x0) * (p[3] === 'm' ? 0 : 1));
          const hh = p[2] * sc;
          if (p[3] === 'm') { ctx.fillRect(Math.round(xa), by - fb - hh, 1, hh); if (hh > 6) ctx.fillRect(Math.round(xa - hh * 0.15), by - fb - hh * 0.7, Math.max(1, Math.round(hh * 0.3)), 1); }
          else { ctx.fillStyle = p[3] === 'f' ? mix(col, '#000000', 0.3) : col; ctx.fillRect(xa, by - fb - hh, w, hh); ctx.fillStyle = col; }
        }
        // bow wave
        if (s.sink < 0 && s.spd > 3 && sc > 0.08) { ctx.fillStyle = 'rgba(230,240,245,0.7)'; ctx.fillRect(Math.min(P(0.95), P(1.03)), by - 1, Math.max(1, L * 0.08), 1); }
        // fire & smoke
        if (s.fire > 0) {
          const n = 3 + Math.floor(s.fire * 4);
          for (let i = 0; i < n; i++) {
            const u = 0.3 + ((i * 37) % 50) / 100, fl = Math.sin(t * 20 + i * 2) * 0.5 + 0.5;
            ctx.fillStyle = fl > 0.5 ? '#ffb030' : '#ff5a20';
            const fh = (4 + fl * 6) * sc * 2;
            ctx.fillRect(P(u), by - fb - fh, Math.max(1, 6 * sc), fh);
          }
        }
      }
      function smokePuffs(ctx, s, sx, by, sc, bowDir, aspect, col, t) {
        if (s.T.parts.every(p => p[3] !== 'f') || sc < 0.02) return;
        const f = s.T.parts.find(p => p[3] === 'f');
        const L = (s.T.len * aspect + s.T.beam * (1 - aspect)) * sc;
        const fx0 = sx + ((f[0] + f[1]) / 2 - 0.5) * L * bowDir, fy = by - (s.T.fb + f[2]) * sc;
        ctx.fillStyle = col;
        for (let i = 0; i < 5; i++) {
          const k = ((t * 0.4 + i / 5) % 1);
          const r = Math.max(1, (2 + k * 10) * sc * 2);
          ctx.fillRect(fx0 - bowDir * k * 60 * sc * 3 - r / 2, fy - k * 14 * sc * 2 - r, r, r * 0.7);
        }
      }
      function drawOutside(ctx, look, PX, eye, scope) {
        const t = api.time, C = skyCols();
        const roll = Math.sin(t * 0.7) * weather.sea * (scope ? 0.01 : 0.025);
        const hy = 90 + Math.sin(t * 0.9) * (weather.sea + 0.5) * (scope ? 2 : 3) + (scope ? 8 : 0);
        ctx.save();
        ctx.translate(160, hy); ctx.rotate(roll); ctx.translate(-160, -hy);
        // sky bands
        for (let y = -40; y < hy; y += 6) ctx.fillStyle = mix(C.top, C.hor, (y + 40) / (hy + 40)), ctx.fillRect(-40, y, W + 80, 6);
        // moon / sun glow
        if (light < 0.4) { const mx = 160 + wrap(2.2 - look) * PX; ctx.fillStyle = '#c8ccd0'; ctx.fillRect(mx - 3, 22, 6, 6); ctx.fillRect(mx - 4, 23, 8, 4); }
        // clouds
        for (const c of clouds) {
          const cx = 160 + wrap(c.b - look) * PX;
          if (cx < -100 || cx > 420) continue;
          const cy = hy - c.e * (PX / 305);
          ctx.fillStyle = mix(C.hor, light > 0.7 ? '#ffffff' : C.top, 0.35);
          ctx.fillRect(cx - c.w * PX / 305 / 2, cy, c.w * PX / 305, c.h * 0.5);
          ctx.fillRect(cx - c.w * PX / 305 / 3, cy - c.h * 0.4, c.w * PX / 305 * 0.66, c.h * 0.6);
        }
        // sea
        ctx.fillStyle = C.sea; ctx.fillRect(-40, hy, W + 80, 260);
        ctx.fillStyle = mix(C.sea, C.hor, 0.35); ctx.fillRect(-40, hy, W + 80, 2);
        const crest = mix(C.sea, light > 0.4 ? '#e8eef2' : '#5a6878', 0.55 + weather.sea * 0.1);
        for (let i = 0; i < 22; i++) {
          const y = hy + 3 + i * i * 0.42;
          if (y > 240) break;
          const sp = 10 + i * 5, off = ((look * PX * (0.4 + i * 0.05)) + t * (6 + i * 2)) % sp;
          const wl = 1 + Math.floor(i / 4) + weather.sea;
          ctx.fillStyle = i % 2 ? crest : mix(C.sea, '#000000', 0.2);
          for (let x = -sp - off; x < W + sp; x += sp) {
            const jit = ((Math.floor(x / sp) * 13 + i * 7) & 7) * 1.5;
            ctx.fillRect(x + jit, y + Math.sin(t * 2 + x * 0.05 + i) * (1 + weather.sea * 0.6), wl * 2 + i * 0.4, 1);
          }
        }
        // collect & draw ships far to near
        const vis = [];
        for (const s of ships) {
          if (!shipVisible(s)) continue;
          const d = dst(U.x, U.y, s.x, s.y); if (d < 20) continue;
          const rel = wrap(brg(U.x, U.y, s.x, s.y) - look);
          if (Math.abs(rel) > 1.1) continue;
          vis.push({ s, d, rel });
        }
        vis.sort((a, b) => b.d - a.d);
        const vr = visR() * (surfaced() ? 1 : 0.7);
        const shipCol = light > 0.4 ? '#2e3438' : '#0e1218';
        for (const v of vis) {
          const s = v.s, sx = 160 + v.rel * PX;
          const sc = PX / v.d;
          const hullDown = Math.pow(v.d / 11000, 2) * 25 * sc;
          const by = hy + eye * PX / v.d + hullDown;
          const b = brg(U.x, U.y, s.x, s.y);
          const aspect = Math.abs(Math.sin(s.hdg - b)), bowDir = Math.sin(s.hdg - b) >= 0 ? 1 : -1;
          const haze = Math.pow(v.d / vr, 0.8);
          const col = mix(shipCol, C.hor, haze * 0.9);
          const sinkDrop = s.sink >= 0 ? s.sink * (s.T.fb + 25) * sc * 1.2 : 0;
          ctx.save();
          ctx.beginPath(); ctx.rect(-40, -60, W + 80, by - (-60)); ctx.clip();
          if (s.sink >= 0) { ctx.translate(sx, by); ctx.rotate(bowDir * s.sink * 0.5); ctx.translate(-sx, -by + -sinkDrop * -1); }
          smokePuffs(ctx, s, sx, by, sc, bowDir, aspect, mix(s.fire > 0.5 ? '#1a1a1a' : '#6a6e72', C.hor, haze), t);
          drawShip(ctx, s, sx, by, sc, bowDir, aspect, col, t);
          ctx.restore();
          if (s === target) {
            ctx.fillStyle = '#ffd060';
            const top = by - 40 * sc - 6;
            ctx.fillRect(sx - 1, top - 6, 3, 1); ctx.fillRect(sx, top - 5, 1, 2);
          }
        }
        // fx on the water
        for (const f of fx) {
          if (f.t < 0) continue;
          const d = Math.max(30, dst(U.x, U.y, f.x, f.y));
          const rel = wrap(brg(U.x, U.y, f.x, f.y) - look); if (Math.abs(rel) > 1.1 || d > vr) continue;
          const sx = 160 + rel * PX, sc = PX / d, by = hy + eye * PX / d;
          if (f.k === 'boom') {
            const k = f.t;
            if (k < 0.6) { ctx.fillStyle = '#fff4c0'; const r = (20 + k * 60) * sc; ctx.fillRect(sx - r, by - r * 1.4, r * 2, r * 1.4); }
            ctx.fillStyle = 'rgba(40,40,40,0.75)';
            for (let i = 0; i < 4; i++) { const r = (15 + k * 12) * sc; ctx.fillRect(sx - r + Math.sin(i * 2) * r * 0.6, by - (20 + k * 18 + i * 14) * sc, r * 1.4, r * 0.9); }
          } else {
            const k = f.t / 2.5, hh = (f.k === 'column' ? 45 : 18) * sc * Math.sin(Math.min(1, k * 1.4) * Math.PI);
            ctx.fillStyle = 'rgba(225,235,240,0.85)';
            ctx.fillRect(sx - 6 * sc, by - hh, 12 * sc + 1, hh);
            ctx.fillRect(sx - 12 * sc, by - hh * 0.6, 24 * sc + 1, hh * 0.6);
          }
        }
        // torpedo wakes
        ctx.fillStyle = 'rgba(235,245,250,0.85)';
        for (const tp of torps) {
          for (let i = 0; i < tp.trail.length; i += 2) {
            const p = tp.trail[i]; const d = dst(U.x, U.y, p[0], p[1]); if (d < 40 || d > 3500) continue;
            const rel = wrap(brg(U.x, U.y, p[0], p[1]) - look); if (Math.abs(rel) > 1) continue;
            ctx.fillRect(160 + rel * PX, hy + eye * PX / d, Math.max(1, 3 * PX / d), 1);
          }
        }
        // aircraft
        if (plane && plane.d > -3000) {
          const rel = wrap(plane.b - look), ad = Math.max(200, Math.abs(plane.d));
          if (Math.abs(rel) < 1.1) {
            const sx = 160 + rel * PX, sc = PX / ad, py = hy - 300 * sc - 4;
            ctx.fillStyle = '#1c2026';
            ctx.fillRect(sx - 15 * sc, py, 30 * sc + 1, 2 * sc + 1); ctx.fillRect(sx - 2 * sc, py - 2 * sc, 4 * sc + 1, 6 * sc + 1);
          }
        }
        ctx.restore();
        // weather overlays
        if (weather.fog) { ctx.fillStyle = 'rgba(190,196,200,0.32)'; ctx.fillRect(0, 0, W, VH); }
        if (weather.rain) {
          ctx.fillStyle = light > 0.4 ? 'rgba(200,210,220,0.45)' : 'rgba(120,130,140,0.4)';
          for (let i = 0; i < 70; i++) { const x = ((i * 53 + frame * (5 + (i & 3))) % (W + 40)) - 20, y = ((i * 97 + frame * 9) % VH); ctx.fillRect(x, y, 1, 5); ctx.fillRect(x - 1, y + 5, 1, 3); }
        }
        return hy;
      }
      function drawBridge(ctx) {
        drawOutside(ctx, look, 305, 8, false);
        // conning tower coaming + crew in generic foul-weather gear
        const sway = Math.sin(api.time * 0.9) * weather.sea * 1.5;
        ctx.fillStyle = '#41484e'; ctx.fillRect(0, 170 + sway, W, 30);
        ctx.fillStyle = '#5a6268'; ctx.fillRect(0, 168 + sway, W, 3);
        ctx.fillStyle = '#2c3136'; for (let x = 8; x < W; x += 24) ctx.fillRect(x, 174 + sway, 2, 26);
        ctx.fillStyle = '#6b7378'; ctx.fillRect(140, 160 + sway, 40, 10); ctx.fillStyle = '#20262a'; ctx.fillRect(150, 156 + sway, 20, 6);
        // two lookouts (backs), plain navy oilskins and caps
        for (const lx of [36, 270]) {
          ctx.fillStyle = '#1e2a3a'; ctx.fillRect(lx - 14, 160 + sway, 28, 40);
          ctx.fillStyle = '#26354a'; ctx.fillRect(lx - 16, 168 + sway, 32, 32);
          ctx.fillStyle = '#c89c7c'; ctx.fillRect(lx - 4, 152 + sway, 8, 5);
          ctx.fillStyle = '#1a2230'; ctx.fillRect(lx - 6, 146 + sway, 12, 7); ctx.fillRect(lx - 7, 151 + sway, 14, 2);
          ctx.fillStyle = '#111'; ctx.fillRect(lx - 6, 158 + sway, 3, 4); ctx.fillRect(lx + 3, 158 + sway, 3, 4);
        }
        // bearing tape
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(60, 12, 200, 11);
        for (let a = -30; a <= 30; a += 5) {
          const b = deg(look) + a, x = 160 + a * 305 * D2R;
          ctx.fillStyle = '#c8d0b0'; ctx.fillRect(Math.round(x), 20, 1, b % 10 === 0 ? 3 : 2);
          if (((b % 360) + 360) % 30 === 0 && Math.abs(a) < 26) text(ctx, p3(((b % 360) + 360) % 360), x, 13, '#c8d0b0', 1, 'center');
        }
        ctx.fillStyle = '#ffd060'; ctx.fillRect(159, 22, 3, 2);
      }
      function drawScope(ctx) {
        const hy = drawOutside(ctx, look, 458, 3, true);
        // lens wash
        if (wash > 0) { ctx.fillStyle = 'rgba(40,70,90,' + (0.7 * wash).toFixed(2) + ')'; ctx.fillRect(0, VH - wash * 160, W, wash * 160); }
        // reticle
        ctx.fillStyle = 'rgba(10,10,10,0.9)';
        ctx.fillRect(40, hy, 240, 1); ctx.fillRect(159, 10, 1, 180);
        for (let i = -6; i <= 6; i++) { ctx.fillRect(160 + i * 16, hy - (i % 2 ? 2 : 4), 1, i % 2 ? 4 : 8); }
        for (let i = 1; i <= 4; i++) { ctx.fillRect(156, hy - i * 16, 8, 1); }
        // mask
        ctx.fillStyle = '#050607';
        ctx.beginPath(); ctx.rect(0, 0, W, VH); ctx.arc(160, 98, 94, 0, TAU, true); ctx.fill();
        ctx.fillStyle = '#1a1e22'; ctx.fillRect(0, 0, 40, VH); ctx.fillRect(280, 0, 40, VH);
        text(ctx, 'BRG', 6, 8, '#8a9a8a'); text(ctx, p3(deg(look)), 6, 18, '#d0e0c0');
        text(ctx, 'REL', 6, 32, '#8a9a8a'); text(ctx, p3(deg(look - U.hdg)), 6, 42, '#d0e0c0');
        text(ctx, 'DPT', 6, 56, '#8a9a8a'); text(ctx, p3(U.depth) + 'M', 3, 66, U.depth > 14 ? '#ff8060' : '#d0e0c0');
        if (target && shipVisible(target)) {
          const d = dst(U.x, U.y, target.x, target.y);
          text(ctx, 'RNG', 284, 8, '#8a9a8a'); text(ctx, (d / 1000).toFixed(1), 286, 18, '#d0e0c0');
          text(ctx, 'SOL', 284, 32, '#8a9a8a'); text(ctx, Math.round(q * 100) + '%', 284, 42, q > 0.75 ? '#80ff80' : '#ffd060');
        }
      }
      function drawChart(ctx) {
        const z = zoom, cx = 160, cy = 98;
        ctx.fillStyle = '#d8ccaa'; ctx.fillRect(0, 0, W, VH);
        ctx.fillStyle = '#c8bb98';
        const g = z < 15 ? 500 : z < 35 ? 1000 : 2000;
        const ox = ((-U.x / z) % (g / z) + g / z) % (g / z), oy = ((-U.y / z) % (g / z) + g / z) % (g / z);
        for (let x = ox + cx % (g / z); x < W; x += g / z) ctx.fillRect(Math.round(x), 0, 1, VH);
        for (let y = oy + cy % (g / z); y < VH; y += g / z) ctx.fillRect(0, Math.round(y), W, 1);
        const sx = wx => cx + (wx - U.x) / z, sy = wy => cy + (wy - U.y) / z;
        // range rings & hydrophone bearing ring
        ctx.strokeStyle = 'rgba(90,70,40,0.35)'; ctx.lineWidth = 1;
        for (const r of [1000, 3000, 6000]) { ctx.beginPath(); ctx.arc(cx, cy, r / z, 0, TAU); ctx.stroke(); }
        if (!surfaced()) {
          for (const s of ships) {
            if (s.sink >= 0) continue; const d = dst(U.x, U.y, s.x, s.y); if (d > 9000) continue;
            const b = brg(U.x, U.y, s.x, s.y); ctx.fillStyle = s.T.esc ? '#a0302a' : '#5a4a30';
            ctx.fillRect(cx + Math.sin(b) * 88 - 1, cy - Math.cos(b) * 88 - 1, 3, 3);
          }
        }
        // convoy report marker
        if (convoy && !ships.some(s => !s.T.esc && s.sink < 0 && shipKnown(s))) {
          const rx = sx(convoy.rep.x), ry = sy(convoy.rep.y);
          const px = clamp(rx, 8, W - 8), py = clamp(ry, 8, VH - 8);
          ctx.strokeStyle = '#2050a0'; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.stroke(); text(ctx, '?', px - 2, py - 3, '#2050a0');
          text(ctx, 'CONVOY ' + convoy.code + ' (REPORTED)', clamp(px, 70, W - 70), clamp(py + 10, 10, VH - 20), '#2050a0', 1, 'center');
        }
        // torpedoes
        for (const t of torps) { ctx.fillStyle = '#1050c0'; for (const p of t.trail) ctx.fillRect(sx(p[0]), sy(p[1]), 1, 1); ctx.fillRect(sx(t.x) - 1, sy(t.y) - 1, 3, 3); }
        // depth charges & fx
        for (const c of dcs) { ctx.fillStyle = '#802020'; ctx.fillRect(sx(c.x) - 1, sy(c.y) - 1, 2, 2); }
        for (const f of fx) { if (f.k === 'splash' || f.t < 0) continue; ctx.strokeStyle = f.k === 'boom' ? '#e05010' : '#a03030'; ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), 2 + f.t * 6, 0, TAU); ctx.stroke(); }
        // ships
        for (const s of ships) {
          if (!shipKnown(s)) continue;
          const px = sx(s.x), py = sy(s.y); if (px < -10 || px > W + 10 || py < -10 || py > VH + 10) continue;
          const len = Math.max(4, s.T.len / z), hx = Math.sin(s.hdg), hyy = -Math.cos(s.hdg);
          const vis = shipVisible(s);
          ctx.strokeStyle = s.sink >= 0 ? '#8a7a60' : s.T.esc ? (s.st !== 'screen' ? '#d02020' : '#a03028') : vis ? '#202020' : '#6a5a40';
          ctx.lineWidth = s.T.esc ? 1 : 2;
          ctx.beginPath(); ctx.moveTo(px - hx * len / 2, py - hyy * len / 2); ctx.lineTo(px + hx * len / 2, py + hyy * len / 2); ctx.stroke();
          ctx.lineWidth = 1;
          if (s.sink < 0) { ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(px + hx * len / 2 - 1, py + hyy * len / 2 - 1, 2, 2); }
          if (s.T.esc && s.st !== 'screen' && s.lk) { ctx.strokeStyle = 'rgba(200,30,30,0.35)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx(s.lk.x), sy(s.lk.y)); ctx.stroke(); }
          if (s === target) { ctx.strokeStyle = '#c08000'; ctx.strokeRect(px - 7, py - 7, 14, 14); }
        }
        // own boat
        const hx = Math.sin(U.hdg), hyy = -Math.cos(U.hdg);
        ctx.fillStyle = '#106010';
        ctx.beginPath(); ctx.moveTo(cx + hx * 6, cy + hyy * 6); ctx.lineTo(cx - hx * 4 + hyy * 3, cy - hyy * 4 - hx * 3); ctx.lineTo(cx - hx * 4 - hyy * 3, cy - hyy * 4 + hx * 3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(16,96,16,0.5)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + hx * 40, cy + hyy * 40); ctx.stroke();
        // info panel
        ctx.fillStyle = 'rgba(40,30,20,0.85)'; ctx.fillRect(0, 0, W, 10);
        text(ctx, 'CHART  ' + (zoomManual ? 'M' : 'AUTO') + ' ' + Math.round(z * 10) + 'M/PX' + (U.depth > 16 ? '  HYDROPHONE PLOT' : ''), 3, 2, '#e8dcb8');
        if (target) {
          const d = dst(U.x, U.y, target.x, target.y), aob = wrap(brg(target.x, target.y, U.x, U.y) - target.hdg);
          ctx.fillStyle = 'rgba(40,30,20,0.85)'; ctx.fillRect(0, VH - 20, W, 20);
          text(ctx, target.name + '  ' + target.T.nm + '  ' + target.grt + (target.T.esc ? 'T' : ' GRT'), 3, VH - 18, '#ffe0a0');
          text(ctx, 'RNG ' + Math.round(d) + 'M  BRG ' + p3(deg(brg(U.x, U.y, target.x, target.y))) + '  AOB ' + p3(Math.abs(Math.round(aob / D2R))) + (aob >= 0 ? 'S' : 'P') + '  SPD ' + Math.round(target.spd) + 'KT  SOL ' + Math.round(q * 100) + '%', 3, VH - 9, '#e8dcb8');
        }
      }
      function bar(ctx, x, y, w, v, col) { ctx.fillStyle = '#0c0e10'; ctx.fillRect(x, y, w, 5); ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(v, 0, 1)), 3); }
      function drawHUD(ctx) {
        const y0 = VH;
        ctx.fillStyle = '#1c2125'; ctx.fillRect(0, y0, W, H - y0);
        ctx.fillStyle = '#4a5258'; ctx.fillRect(0, y0, W, 1);
        text(ctx, 'HDG ' + p3(deg(U.hdg)), 3, y0 + 4, '#d8e0c8');
        text(ctx, TEL_NAMES[U.tel + 0] + ' ' + String(Math.round(Math.abs(U.spd))).padStart(2, '0') + 'KT', 60, y0 + 4, U.silent ? '#80c0ff' : '#d8e0c8');
        text(ctx, 'DEPTH ' + p3(U.depth) + '>' + p3(U.dOrd), 138, y0 + 4, U.depth > 200 ? '#ff6040' : '#d8e0c8');
        text(ctx, weapon === 'torp' ? 'TORPEDO' : 'GUN ' + U.gun, 230, y0 + 4, '#ffd060');
        text(ctx, 'HULL', 3, y0 + 14, '#8a9690'); bar(ctx, 30, y0 + 15, 50, U.hull / 100, U.hull > 50 ? '#60c060' : U.hull > 25 ? '#e0c040' : '#e04030');
        text(ctx, 'BATT', 86, y0 + 14, '#8a9690'); bar(ctx, 113, y0 + 15, 50, U.bat / 100, U.bat > 25 ? '#60a0e0' : '#e04030');
        text(ctx, 'BOW', 170, y0 + 14, '#8a9690');
        for (let i = 0; i < 4; i++) { ctx.fillStyle = U.tubes[i] ? '#e0c060' : '#3a3f44'; ctx.fillRect(190 + i * 6, y0 + 14, 4, 7); }
        text(ctx, 'STN', 218, y0 + 14, '#8a9690'); ctx.fillStyle = U.tubes[4] ? '#e0c060' : '#3a3f44'; ctx.fillRect(238, y0 + 14, 4, 7);
        text(ctx, '+' + U.reserve, 246, y0 + 14, '#8a9690');
        if (U.reloadT > 0) bar(ctx, 264, y0 + 15, 26, U.reloadT / 45, '#a08040');
        if (U.silent) text(ctx, 'SIL', 296, y0 + 14, '#80c0ff');
        text(ctx, 'GRT ' + patrolGRT + '/' + quota, 3, y0 + 24, patrolGRT >= quota ? '#80ff80' : '#ffe080');
        text(ctx, 'BOATS ' + lives, 120, y0 + 24, '#d8e0c8');
        text(ctx, 'PATROL ' + patrol, 172, y0 + 24, '#d8e0c8');
        text(ctx, 'TOTAL ' + score, 3, y0 + 34, '#a8b0a0');
        text(ctx, MONTHS[month] + ' ' + year + ' ' + weather.n + (light < 0.4 ? ' NIGHT' : light < 0.7 ? ' DUSK' : ''), 96, y0 + 34, '#8a9690');
        const v = effView();
        ['BRG', 'SCP', 'MAP'].forEach((n, i) => {
          const sel = ['bridge', 'scope', 'chart'][i] === v;
          ctx.fillStyle = sel ? '#c8a040' : '#30383e'; ctx.fillRect(231 + i * 30, 228, 28, 11);
          text(ctx, n, 245 + i * 30, 230, sel ? '#101010' : '#a0a8a0', 1, 'center');
        });
      }
      function drawMsgs(ctx) {
        let y = 26;
        for (const m of msgs) {
          const w = m.s.length * 6 + 6;
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(160 - w / 2, y - 2, w, 11);
          text(ctx, m.s, 160, y, m.col, 1, 'center'); y += 12;
        }
      }
      function drawSubSilhouette(ctx, x, y, s) {
        ctx.fillStyle = '#20262c';
        ctx.beginPath(); ctx.moveTo(x - 70 * s, y); ctx.lineTo(x + 64 * s, y); ctx.lineTo(x + 80 * s, y - 5 * s); ctx.lineTo(x - 60 * s, y - 6 * s); ctx.closePath(); ctx.fill();
        ctx.fillRect(x - 12 * s, y - 20 * s, 26 * s, 15 * s);
        ctx.fillRect(x - 16 * s, y - 10 * s, 34 * s, 6 * s);
        ctx.fillRect(x + 2 * s, y - 34 * s, 2 * s, 14 * s);
        ctx.fillRect(x - 6 * s, y - 28 * s, 2 * s, 8 * s);
        ctx.fillRect(x + 30 * s, y - 9 * s, 10 * s, 3 * s); ctx.fillRect(x + 32 * s, y - 12 * s, 2 * s, 3 * s);
        ctx.fillRect(x - 70 * s, y - 14 * s, 1, 9 * s); ctx.fillRect(x - 66 * s, y - 14 * s, 1, 9 * s); ctx.fillRect(x - 70 * s, y - 14 * s, 5 * s, 1);
      }
      function drawTitle(ctx) {
        const t = api.time;
        for (let y = 0; y < 150; y += 6) { ctx.fillStyle = mix('#04070e', '#1c2a3e', y / 150); ctx.fillRect(0, y, W, 6); }
        ctx.fillStyle = '#c8ccd0'; ctx.fillRect(250, 30, 8, 8); ctx.fillRect(249, 31, 10, 6);
        ctx.fillStyle = '#0a1622'; ctx.fillRect(0, 150, W, 90);
        drawSubSilhouette(ctx, 120 + Math.sin(t * 0.3) * 4, 152 + Math.sin(t) * 1.5, 1);
        for (let i = 0; i < 14; i++) {
          const y = 152 + i * i * 0.5; ctx.fillStyle = i % 2 ? '#2a4258' : '#0e1c2a';
          for (let x = -30 + ((t * (8 + i * 3)) % 30); x < W; x += 30) ctx.fillRect(x + (i * 7) % 11, y, 6 + i, 1);
        }
        text(ctx, 'ACES OF THE DEEP', W / 2, 26, '#000000', 3, 'center');
        text(ctx, 'ACES OF THE DEEP', W / 2 - 1, 25, '#d8e4ea', 3, 'center');
        text(ctx, 'NORTH ATLANTIC SUBMARINE COMMAND', W / 2, 52, '#c8a040', 1, 'center');
        const page = Math.floor(modeT / 7) % 3;
        if (page === 0) {
          text(ctx, 'HUNT THE CONVOYS. EVADE THE ESCORTS.', W / 2, 74, '#a8b8c0', 1, 'center');
          text(ctx, 'MEET YOUR TONNAGE QUOTA ON EVERY PATROL.', W / 2, 86, '#a8b8c0', 1, 'center');
          text(ctx, 'BEST TONNAGE ' + hi + ' GRT', W / 2, 104, '#ffe080', 1, 'center');
        } else if (page === 1) {
          const L = ['ARROWS  HELM AND ENGINE TELEGRAPH', 'SPACE   FIRE TORPEDO OR DECK GUN', 'X       CHANGE STATION', 'X+UP/DN DEPTH   X+L/R  TARGET', 'ENTER   TORPEDO / DECK GUN', 'C DIVE  S SURFACE  P SCOPE  R SILENT'];
          L.forEach((s, i) => text(ctx, s, 40, 68 + i * 10, '#a8b8c0'));
        } else {
          const L = [['TANKER', '7500-10500'], ['TRANSPORT', '11000-15500'], ['CARGO SHIP', '5500-8200'], ['FREIGHTER', '2800-5200'], ['DESTROYER', '1350 T'], ['CORVETTE', '925 T']];
          text(ctx, 'TARGET TONNAGE', W / 2, 66, '#c8a040', 1, 'center');
          L.forEach((r, i) => { text(ctx, r[0], 70, 78 + i * 10, '#a8b8c0'); text(ctx, r[1], 250, 78 + i * 10, '#ffe080', 1, 'right'); });
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 190, '#ffffff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 190, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 190, '#ffffff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, 228, '#8a96a0');
        text(ctx, '\u00a9 1994 DYNAMIX', W - 4, 228, '#8a96a0', 1, 'right');
      }
      function drawBrief(ctx) {
        ctx.fillStyle = '#d8ccaa'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#c0b290'; for (let x = 0; x < W; x += 20) ctx.fillRect(x, 0, 1, H); for (let y = 0; y < H; y += 20) ctx.fillRect(0, y, W, 1);
        ctx.fillStyle = 'rgba(30,24,16,0.85)'; ctx.fillRect(20, 20, 280, 200);
        text(ctx, 'PATROL ORDERS', W / 2, 30, '#ffe0a0', 2, 'center');
        const L = ['PATROL ' + patrol + '  -  ' + MONTHS[month] + ' ' + year,
          'AREA: GRID ' + String.fromCharCode(65 + patrol % 8) + String.fromCharCode(66 + (patrol * 3) % 7) + ' ' + (10 + patrol * 7) % 90,
          'TONNAGE QUOTA: ' + quota + ' GRT', 'WEATHER: ' + weather.n + (light < 0.4 ? ', NIGHT' : light < 0.7 ? ', DUSK' : ', DAY'),
          'CONVOY ' + (convoy ? convoy.code : '') + ' REPORTED NEARBY.', 'ESCORTS EXPECTED. WATCH YOUR BATTERY.',
          '', 'SURFACE RUN TO CLOSE, DIVE TO ATTACK,', 'GO DEEP AND QUIET WHEN THEY HUNT YOU.'];
        L.forEach((s, i) => text(ctx, s, 34, 56 + i * 13, i < 4 ? '#e8dcb8' : '#b8ac90'));
        drawSubSilhouette(ctx, 230, 200, 0.45);
        if ((frame >> 5) & 1) text(ctx, 'PRESS SPACE TO SAIL', W / 2, 206, '#ffffff', 1, 'center');
      }
      function drawTally(ctx) {
        ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'PATROL ' + patrol + ' REPORT', W / 2, 18, '#ffe080', 2, 'center');
        text(ctx, endReason, W / 2, 40, '#a0d0ff', 1, 'center');
        const n = Math.min(sunkList.length, Math.floor(modeT * 4));
        for (let i = 0; i < Math.min(n, 11); i++) text(ctx, sunkList[i], 40, 58 + i * 10, '#d8e0c8');
        if (sunkList.length > 11) text(ctx, '+ ' + (sunkList.length - 11) + ' MORE', 40, 168, '#d8e0c8');
        if (!sunkList.length) text(ctx, 'NO SHIPS SUNK', W / 2, 70, '#a0a0a0', 1, 'center');
        text(ctx, 'PATROL ' + patrolGRT + ' / ' + quota + ' GRT', W / 2, 186, patrolGRT >= quota ? '#80ff80' : '#ff9070', 1, 'center');
        text(ctx, 'CAREER TOTAL ' + score + ' GRT', W / 2, 200, '#ffe080', 1, 'center');
        if (modeT > 2 && (frame >> 5) & 1) text(ctx, 'PRESS SPACE FOR NEXT PATROL', W / 2, 220, '#ffffff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        if (mode === 'brief') { drawBrief(ctx); return; }
        if (mode === 'tally') { drawTally(ctx); return; }
        ctx.save();
        if (shake > 0) ctx.translate(Math.round(rnd(-shake, shake) * 0.4), Math.round(rnd(-shake, shake) * 0.4));
        ctx.beginPath(); ctx.rect(0, 0, W, VH); ctx.clip();
        const v = effView();
        if (v === 'bridge') drawBridge(ctx); else if (v === 'scope') drawScope(ctx); else drawChart(ctx);
        if (view !== v) text(ctx, view === 'bridge' ? 'SUBMERGED - BRIDGE CLOSED' : 'BELOW PERISCOPE DEPTH', W / 2, v === 'chart' ? 14 : VH - 12, '#ffb060', 1, 'center');
        if (U.depth > 16 && dcs.length) { ctx.fillStyle = 'rgba(255,40,20,' + (0.08 + 0.06 * Math.sin(api.time * 8)).toFixed(2) + ')'; ctx.fillRect(0, 0, W, VH); }
        if (mode === 'lost' || mode === 'wait' || mode === 'over') {
          ctx.fillStyle = 'rgba(0,10,20,' + Math.min(0.85, lostT * 0.3 + (mode !== 'lost' ? 0.85 : 0)).toFixed(2) + ')'; ctx.fillRect(0, 0, W, VH);
          for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(200,220,240,0.6)'; ctx.fillRect((i * 71 + frame * 0) % W, (VH - ((frame * (1 + i % 3) + i * 37) % VH)), 2, 2); }
          text(ctx, mode === 'over' ? 'GAME OVER' : 'BOAT LOST', W / 2, 80, mode === 'over' ? '#ffffff' : '#ff6040', 3, 'center');
          if (mode === 'over') text(ctx, 'CAREER TONNAGE ' + score + ' GRT', W / 2, 110, '#ffe080', 1, 'center');
        }
        ctx.restore();
        drawMsgs(ctx);
        drawHUD(ctx);
      }
      function debug() { return { mode, U, ships, target, q, view: U ? effView() : view, patrol, patrolGRT, quota, score, lives, torps, dcs, convoy }; }
      return { update, render, destroy() { }, debug };
    }
  });
})();
