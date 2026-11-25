// Raiden (Seibu Kaihatsu, 1990) - from-scratch recreation for the MAME32 Game Room.
// Vertical shooter: red Vulcan spread / blue Laser main shot, Nuclear (M) and Homing (H) missiles,
// screen-clearing thermonuclear bombs, tanks / ships / planes, big boss at the end of each of 8 stages, medals.
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
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 31, 10, 0], '^': [4, 14, 31, 4, 4, 4, 4]
  };
  // text(ctx, str, x, y, colour, scale, align('left'|'center'|'right'))
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
  // outlined text (shadow on all sides) for readability over busy backgrounds
  function otext(ctx, s, x, y, col, sc, align, sh) {
    sc = sc || 1; sh = sh || '#000';
    text(ctx, s, x + sc, y + sc, sh, sc, align); text(ctx, s, x - 1, y, sh, sc, align);
    text(ctx, s, x + 1, y, sh, sc, align); text(ctx, s, x, y - 1, sh, sc, align);
    text(ctx, s, x, y, col, sc, align);
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // sprite from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = mkCanvas(w, rows.length), x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  // mirror a half-sprite (left half incl. centre column) into a full symmetric one
  function mir(rows) { return rows.map(r => r + r.slice(0, r.length - 1).split('').reverse().join('')); }
  function flipV(rows) { return rows.slice().reverse(); }
  function hash(n) { n = n | 0; n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill(); }
  function ring(ctx, x, y, r, col, lw) { ctx.strokeStyle = col; ctx.lineWidth = lw || 1; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.stroke(); }
  function pad(n, l) { return String(n).padStart(l, ' '); }
  function cred(api) { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }

  const W = 224, H = 256, SCR = 0.5, TAU = Math.PI * 2;
  function both(rows, pal) { const w = {}, s = {}; for (const k in pal) { w[k] = '#ffffff'; s[k] = 'rgba(0,0,0,0.35)'; } return [spr(rows, pal), spr(rows, w), spr(rows, s)]; }

  // ---------------- sprites ----------------
  const PLAYER = both([
    '.......R.......',
    '......RWR......',
    '......WCW......',
    '......WCW......',
    '.....GWCWG.....',
    '.....GWWWG.....',
    '....GGWWWGG....',
    '...GGGWRWGGG...',
    '..GGGGWRWGGGG..',
    '.GGGGGWWWGGGGG.',
    'GGDGGGWWWGGGDGG',
    'GD..GGWWWGG..DG',
    '.....GWWWG.....',
    '....GGWWWGG....',
    '...GGGD.DGGG...',
    '...............'], { G: '#3a6ad8', W: '#d8dce8', C: '#40d0ff', D: '#1a2a80', R: '#ff3030' });
  const PLANE = both(flipV(mir([
    '......D',
    '.....DG',
    '.....DL',
    'D....GG',
    'DGGGGGG',
    'DGGGGGG',
    '.DDGGGG',
    '....DGG',
    '...DDGG',
    '......D'])), { G: '#8a9a6a', D: '#3a4a2a', L: '#ffd040' });
  const JET = both(flipV(mir([
    '.......R',
    '......GG',
    '......GL',
    '.....GGL',
    '....GGGG',
    '..GGGGGG',
    'GGGGGGGG',
    'DGGGGGGG',
    '...DDGGG',
    '....DGGG',
    '...DD.GG',
    '.......R'])), { G: '#b8b8c8', D: '#606070', L: '#40c0ff', R: '#ff4020' });
  const HELI = both(flipV(mir([
    '......D',
    '......G',
    '.....GG',
    '....GGG',
    '..DGGLG',
    '..DGGGG',
    '....GGG',
    '.....GG',
    '......G',
    '......G',
    '....DDG'])), { G: '#4a6a4a', D: '#2a3a2a', L: '#ff6040' });
  const CARRIER = both(flipV(mir([
    '.....O',
    '....OO',
    '.OOOWO',
    'OOOWWW',
    'OOOWBW',
    '.OOOWO',
    '..O.OO',
    '.....O'])), { O: '#ff8020', W: '#f0f0f0', B: '#2040ff' });
  const DRONE = both(mir([
    '..PPP',
    '.PWWP',
    'PPWRR',
    'PPRRR',
    'PPWRR',
    '.PWWP',
    '..PPP']), { P: '#a040e0', W: '#ffffff', R: '#ff2050' });
  const EB = [spr(['.OO.', 'OWWO', 'OWWO', '.OO.'], { O: '#ff6a20', W: '#ffe0a0' }), spr(['.OO.', 'OWWO', 'OWWO', '.OO.'], { O: '#ff2a8a', W: '#ffd0e0' })];

  // ---------------- stage data ----------------
  const THEMES = {
    fields: { air: ['planes', 'planes', 'jets', 'helis'], ground: ['tanks', 'tanks', 'turrets', 'bigtank'] },
    sea: { air: ['planes', 'jets', 'helis', 'planes'], ground: ['boats', 'boats', 'ship'] },
    ruins: { air: ['planes', 'jets', 'helis'], ground: ['tanks', 'turrets', 'turrets', 'bigtank'] },
    city: { air: ['planes', 'jets', 'jets', 'helis'], ground: ['tanks', 'turrets', 'bigtank'] },
    space: { air: ['planes', 'jets', 'drones', 'drones', 'helis'], ground: [] }
  };
  const STAGES = [
    { theme: 'fields', boss: 'spider' }, { theme: 'sea', boss: 'battleship' }, { theme: 'ruins', boss: 'fortress' },
    { theme: 'city', boss: 'bigplane' }, { theme: 'fields', boss: 'spider' }, { theme: 'sea', boss: 'battleship' },
    { theme: 'city', boss: 'fortress' }, { theme: 'space', boss: 'mothership' }];
  const STAGE_LEN = 3000;
  const VULCAN = [
    [[-3, 0], [3, 0]], [[-5, -5], [0, 0], [5, 5]], [[-6, -8], [-2, -3], [2, 3], [6, 8]], [[-8, -12], [-4, -6], [0, 0], [4, 6], [8, 12]],
    [[-9, -16], [-6, -9], [-2, -3], [2, 3], [6, 9], [9, 16]], [[-10, -22], [-7, -13], [-3, -5], [0, 0], [3, 5], [7, 13], [10, 22]],
    [[-11, -30], [-8, -20], [-5, -10], [-2, -3], [2, 3], [5, 10], [8, 20], [11, 30]],
    [[-12, -42], [-10, -30], [-8, -19], [-5, -10], [-2, -3], [2, 3], [5, 10], [8, 19], [10, 30], [12, 42]]];

  ArcadeRegistry.register({
    id: 'raiden', title: 'Raiden', year: 1990, maker: 'Seibu Kaihatsu',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire (hold) \u00b7 X: bomb \u00b7 Enter: start',
    marquee: { bg: '#081838', fg: '#ff3a20', accent: '#40a0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, scroll = 0, demoKeys = {}, demoT = 0, demoTx = W / 2;
      let g = null;

      // ---------------- input (demo mode drives a simple autopilot) ----------------
      function K(c) { return mode === 'demo' ? !!demoKeys[c] : api.key(c); }
      function P(c) { return mode === 'demo' ? !!demoKeys['p' + c] : api.pressed(c); }
      function aiThink() {
        const p = g.p; demoKeys = { Space: true };
        if (!p.alive) return;
        if (frame % 80 === 0) { const t = g.en.filter(e => e.y > 0 && e.y < H * 0.6); demoTx = t.length ? pick(t).x : rnd(40, W - 40); }
        let dx = 0, dy = 0, danger = 0;
        for (const b of g.eb) { const ex = p.x - b.x, ey = p.y - b.y, d = Math.hypot(ex, ey); if (d < 34 && d > 0) { dx += ex / d * (34 - d); dy += ey / d * (34 - d); danger++; } }
        if (danger) { if (dx < -4) demoKeys.ArrowLeft = true; if (dx > 4) demoKeys.ArrowRight = true; if (dy < -4) demoKeys.ArrowUp = true; if (dy > 4) demoKeys.ArrowDown = true; }
        else {
          if (demoTx < p.x - 4) demoKeys.ArrowLeft = true; if (demoTx > p.x + 4) demoKeys.ArrowRight = true;
          if (p.y < 190) demoKeys.ArrowDown = true; if (p.y > 215) demoKeys.ArrowUp = true;
        }
        if (danger > 4 && g.bombs > 0 && !g.bomb && Math.random() < 0.08) demoKeys.pKeyX = true;
      }

      // ---------------- helpers ----------------
      function diff() { return (g.stage - 1) * 0.14 + Math.floor((g.stage - 1) / 8) * 0.5; }
      function stg() { return STAGES[(g.stage - 1) % 8]; }
      function theme() { return g ? stg().theme : 'fields'; }
      function bsp() { return Math.min(3.4, 1.8 + diff() * 0.55); }
      function aim(x, y) { return Math.atan2(g.p.y - y, g.p.x - x); }
      function shoot(x, y, a, sp) { if (y < -4 || y > H - 20 || x < -4 || x > W + 4) return; g.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
      function fan(x, y, n, spread, sp, base) { if (base == null) base = aim(x, y); for (let i = 0; i < n; i++) shoot(x, y, base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0), sp); }
      function circle(x, y, n, sp, off) { for (let i = 0; i < n; i++) shoot(x, y, off + i * TAU / n, sp); }
      function addScore(n) {
        const before = g.score; g.score += n;
        if (g.score > hi) hi = g.score;
        for (const th of [200000, 500000, 1000000]) if (before < th && g.score >= th) extraLife();
      }
      function extraLife() { g.lives++; au.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: 0.14 }); pop(g.p.x, g.p.y - 14, '1UP', '#40ff40'); }
      function pop(x, y, s, c) { g.pops.push({ x, y, s: String(s), c: c || '#fff', t: 50 }); }
      function boom(x, y, sz, ground) {
        g.fx.push({ x, y, t: 0, T: 18 + sz * 4, r: sz, ground: !!ground });
        for (let i = 0; i < sz * 2; i++) g.deb.push({ x, y, vx: rnd(-2, 2) * (0.5 + sz * 0.15), vy: rnd(-2, 2) * (0.5 + sz * 0.15), t: 20 + (Math.random() * 20 | 0), ground: !!ground });
      }
      function sndBoom(big) { au.noise(big ? 0.7 : 0.25, { vol: big ? 0.25 : 0.14, freq: big ? 1800 : 2600, slideTo: 80 }); if (big) au.tone(120, 0.5, { type: 'sawtooth', vol: 0.08, slideTo: 30 }); }

      // ---------------- game setup ----------------
      function newGame() {
        g = {
          score: 0, lives: 2, stage: 1, en: [], eb: [], ps: [], items: [], fx: [], deb: [], decals: [], pops: [],
          bombs: 3, bomb: null, weapon: 'V', wlv: 1, missile: null, mlv: 0, fireT: 0, misT: 0,
          phase: 'play', phaseT: 0, boss: null, warn: 0, scv: SCR
        };
        g.p = { x: W / 2, y: H + 20, alive: true, inv: 150, enter: 60, bank: 0 };
        startStage();
      }
      function startStage() {
        g.st = 0; g.airT = 120; g.gndT = 200; g.carT = 400; g.boss = null; g.warn = 0; g.scv = SCR; g.banner = 180; g.bossDone = false;
        g.phase = 'play';
        if (mode !== 'demo') au.melody([[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .35]], { type: 'square', vol: 0.12 });
      }

      // ---------------- spawning ----------------
      function addE(o) { o.t = 0; o.flash = 0; o.ang = Math.PI / 2; o.fireT = o.fireT || (60 + Math.random() * 90 | 0); g.en.push(o); return o; }
      const WAVES = {
        planes() {
          const v = Math.random() < 0.5, side = Math.random() < 0.5 ? -1 : 1;
          if (v) { const cx = rnd(60, W - 60); for (let i = 0; i < 5; i++) addE({ k: 'plane', x: cx + (i - 2) * 16, y: -10 - Math.abs(i - 2) * 12, vx: 0, vy: 2, air: true, hp: 1, r: 6, sc: 300, turn: i < 2 ? -1 : i > 2 ? 1 : (Math.random() < .5 ? -1 : 1), ty: rnd(70, 120), fire: Math.random() < 0.6 }); }
          else { const x0 = side < 0 ? rnd(24, 80) : rnd(144, 200); for (let i = 0; i < 5; i++) addE({ k: 'plane', x: x0, y: -10 - i * 18, vx: 0, vy: 2.3, air: true, hp: 1, r: 6, sc: 300, turn: side, ty: rnd(60, 140), fire: Math.random() < 0.5 }); }
        },
        jets() { const n = 2 + (Math.random() < diff() * 0.5 ? 1 : 0); for (let i = 0; i < n; i++) addE({ k: 'jet', x: rnd(30, W - 30), y: -14 - i * 30, vx: 0, vy: 3.5, air: true, hp: 3, r: 7, sc: 500, s: 0, ty: rnd(40, 110) }); },
        helis() { for (let i = 0; i < 3; i++) addE({ k: 'heli', x: 40 + i * 72 + rnd(-10, 10), y: -12 - i * 20, vx: 0, vy: 1.2, air: true, hp: 4, r: 7, sc: 400, ty: rnd(40, 100), life: 300 + i * 30 }); },
        drones() { const x0 = rnd(50, W - 50); for (let i = 0; i < 6; i++) addE({ k: 'drone', x: x0, x0, y: -10 - i * 14, vx: 0, vy: 1.4, air: true, hp: 2, r: 5, sc: 200, ph: i * 0.6, amp: rnd(30, 50) }); },
        bomber() { addE({ k: 'bomber', x: rnd(70, W - 70), y: -30, vx: 0, vy: 0.5, air: true, hp: 40 + diff() * 20, r: 18, sc: 5000, ty: rnd(50, 80), life: 700, drop: true }); },
        carrier() { addE({ k: 'carrier', x: rnd(30, W - 30), y: -10, vx: 0, vy: 0.7, air: true, hp: 5, r: 7, sc: 1000, drop: true }); },
        tanks() {
          const n = 3 + (Math.random() < 0.5 ? 1 : 0), side = Math.random() < 0.4;
          for (let i = 0; i < n; i++) {
            if (side) { const L = Math.random() < 0.5; addE({ k: 'tank', x: L ? -10 - i * 18 : W + 10 + i * 18, y: rnd(10, 70), vx: L ? 0.6 : -0.6, vy: 0, air: false, hp: 6, r: 7, sc: 400 }); }
            else addE({ k: 'tank', x: roadX(scroll + H + 12 + i * 22) + rnd(-3, 3), y: -12 - i * 22, vx: 0, vy: 0.25, air: false, hp: 6, r: 7, sc: 400, road: true });
          }
        },
        turrets() { const n = 2 + (Math.random() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) addE({ k: 'turret', x: rnd(24, W - 24), y: -12 - i * 30, vx: 0, vy: 0, air: false, hp: 10, r: 8, sc: 500, medal: true }); },
        bigtank() { addE({ k: 'bigtank', x: rnd(40, W - 40), y: -20, vx: 0, vy: 0.15, air: false, hp: 26 + diff() * 10, r: 11, sc: 2000, medal: true, ang2: Math.PI / 2 }); },
        boats() { const L = Math.random() < 0.5; for (let i = 0; i < 3; i++) addE({ k: 'boat', x: L ? rnd(20, 90) : rnd(134, 204), y: -10 - i * 26, vx: (L ? 0.3 : -0.3), vy: 0.9, air: false, hp: 4, r: 6, sc: 300 }); },
        ship() { addE({ k: 'ship', x: rnd(50, W - 50), y: -50, vx: 0, vy: -0.2, air: false, hp: 50 + diff() * 15, r: 14, sc: 5000, medal: true, guns: [-24, 0, 24] }); }
      };
      function spawner() {
        const th = THEMES[theme()], d = diff();
        if (--g.airT <= 0) {
          const w = pick(th.air); WAVES[w]();
          if (g.stage > 1 && Math.random() < 0.12 + d * 0.05) WAVES.bomber();
          g.airT = Math.max(70, 190 - d * 45) * rnd(0.75, 1.25);
        }
        if (th.ground.length && --g.gndT <= 0) { WAVES[pick(th.ground)](); g.gndT = Math.max(110, 240 - d * 40) * rnd(0.8, 1.2); }
        if (--g.carT <= 0) { WAVES.carrier(); g.carT = 700 + (Math.random() * 300 | 0); }
      }
      function roadX(wy) { return W / 2 + Math.sin(wy * 0.004) * 60 + Math.sin(wy * 0.0113) * 18; }

      // ---------------- bosses ----------------
      function spawnBoss() {
        const type = stg().boss, hp = 300 + g.stage * 70;
        const b = { type, x: W / 2, y: -80, t: 0, hp, maxHp: hp, flash: 0, parts: [], dying: 0, sa: 0, air: type === 'bigplane' || type === 'mothership', entering: true };
        const P = (dx, dy, php) => b.parts.push({ dx, dy, hp: php, alive: true, flash: 0, ang: Math.PI / 2 });
        const ph = 30 + g.stage * 6;
        if (type === 'spider') { b.ty = 74; b.w = 84; b.h = 64; b.cr = 14; P(-32, -20, ph); P(32, -20, ph); P(-32, 20, ph); P(32, 20, ph); }
        else if (type === 'battleship') { b.ty = 96; b.w = 64; b.h = 170; b.cr = 12; b.coreDy = 36; for (const y of [-62, -36, -10]) { P(-16, y, ph); P(16, y, ph); } }
        else if (type === 'fortress') { b.ty = 80; b.w = 120; b.h = 92; b.cr = 16; P(-44, -32, ph); P(44, -32, ph); P(-44, 32, ph); P(44, 32, ph); }
        else if (type === 'bigplane') { b.ty = 64; b.w = 160; b.h = 56; b.cr = 13; P(-56, 2, ph); P(-30, 4, ph); P(30, 4, ph); P(56, 2, ph); }
        else { b.ty = 70; b.w = 208; b.h = 100; b.cr = 20; P(-80, 0, ph); P(-50, 20, ph); P(-20, 32, ph); P(20, 32, ph); P(50, 20, ph); P(80, 0, ph); }
        b.coreDy = b.coreDy || 0;
        g.boss = b;
      }
      function updBoss() {
        const b = g.boss; b.t++;
        if (b.flash > 0) b.flash--;
        for (const p of b.parts) if (p.flash > 0) p.flash--;
        if (b.dying) {
          b.dying++;
          if (b.dying % 6 === 0) { boom(b.x + rnd(-b.w / 2, b.w / 2), b.y + rnd(-b.h / 2, b.h / 2), 3 + (Math.random() * 3 | 0), !b.air); if (b.dying % 18 === 0) sndBoom(true); }
          if (!b.air) b.y += g.scv;
          if (b.dying > 150) {
            boom(b.x, b.y, 10, !b.air); boom(b.x - 20, b.y + 10, 7, !b.air); boom(b.x + 20, b.y - 10, 7, !b.air);
            if (!b.air) g.decals.push({ x: b.x, y: b.y, r: 26 });
            g.boss = null; g.scv = SCR; g.bossDone = true;
            g.phase = 'clear'; g.phaseT = 300; g.bonus = 10000 * Math.min(10, g.stage);
            addScore(g.bonus);
            if (mode !== 'demo') au.melody([[523, .12], [659, .12], [784, .12], [1047, .25], [988, .12], [1047, .5]], { type: 'square', vol: 0.13, delay: 0.3 });
          }
          return;
        }
        if (b.entering) {
          b.y += b.air ? 0.8 : SCR;
          if (b.y >= b.ty) { b.y = b.ty; b.entering = false; b.t = 0; if (!b.air) g.scv = 0; }
          return;
        }
        const d = diff(), alive = b.parts.filter(p => p.alive).length, rage = alive === 0 ? 1.6 : 1;
        const range = { spider: 54, battleship: 24, fortress: 0, bigplane: 40, mothership: 6 }[b.type];
        b.x = W / 2 + Math.sin(b.t * 0.008) * range;
        if (b.air) b.y = b.ty + Math.sin(b.t * 0.017) * 10;
        if (b.type === 'spider' && b.t % 600 > 300) b.y = Math.min(b.ty + 40, b.y + 0.15); else if (b.type === 'spider') b.y = Math.max(b.ty, b.y - 0.15);
        // part guns: aimed shots
        const pr = Math.max(50, (110 - d * 20) / rage) | 0;
        b.parts.forEach((p, i) => {
          if (!p.alive) return;
          const px = b.x + p.dx, py = b.y + p.dy; p.ang = aim(px, py);
          if ((b.t + i * 17) % pr === 0) { if (b.type === 'battleship' || b.type === 'mothership') fan(px, py, 3, 0.4, bsp() * 0.9); else shoot(px, py, p.ang, bsp()); }
        });
        // core patterns
        const cx = b.x, cy = b.y + b.coreDy, cyc = Math.floor(b.t / 240) % 3, ct = b.t % 240;
        const sp = bsp() * 0.85;
        if (cyc === 0) { if (ct % Math.max(24, (44 - d * 6) / rage | 0) === 0) fan(cx, cy, 5 + Math.min(4, g.stage >> 1), 1.1, sp); }
        else if (cyc === 1) { if (ct % Math.max(30, (56 - d * 8) / rage | 0) === 0) circle(cx, cy, 12 + Math.min(8, g.stage), sp * 0.8, ct * 0.07); }
        else { if (ct % Math.max(3, (6 - d) / rage | 0) === 0 && ct > 20) { b.sa += 0.37; shoot(cx, cy, b.sa, sp * 0.8); shoot(cx, cy, b.sa + Math.PI, sp * 0.8); } }
        if (b.type === 'mothership' && b.t % 300 === 150) { WAVES.drones(); }
        if (b.type === 'fortress' && b.t % 420 === 200) { WAVES.tanks(); }
      }
      function hitBoss(s) {
        const b = g.boss; if (!b || b.dying || b.y < -20) return false;
        for (const p of b.parts) {
          if (!p.alive) continue;
          if (Math.abs(s.x - (b.x + p.dx)) < 9 + s.w && Math.abs(s.y - (b.y + p.dy)) < 9) {
            p.hp -= s.dmg; p.flash = 3;
            if (p.hp <= 0) { p.alive = false; boom(b.x + p.dx, b.y + p.dy, 4, !b.air); sndBoom(false); addScore(2000); }
            return true;
          }
        }
        if (Math.abs(s.x - b.x) < b.cr + s.w && Math.abs(s.y - (b.y + b.coreDy)) < b.cr + 2) { damageBossCore(s.dmg); return true; }
        if (Math.abs(s.x - b.x) < b.w * 0.45 && Math.abs(s.y - b.y) < b.h * 0.42) { if (!b.entering) au.tone(1600, 0.02, { type: 'square', vol: 0.03 }); return true; }
        return false;
      }
      function damageBossCore(n) {
        const b = g.boss; if (!b || b.dying || b.entering) return;
        b.hp -= n; b.flash = 3;
        if (b.hp <= 0) { b.dying = 1; g.eb = []; addScore(30000 + g.stage * 5000); pop(b.x, b.y, 30000 + g.stage * 5000, '#ffe040'); }
      }

      // ---------------- player ----------------
      function updPlayer() {
        const p = g.p;
        if (!p.alive) return;
        if (p.inv > 0) p.inv--;
        if (p.enter > 0) { p.enter--; p.y -= 1.2; return; }
        let dx = 0, dy = 0;
        if (K('ArrowLeft')) dx--; if (K('ArrowRight')) dx++; if (K('ArrowUp')) dy--; if (K('ArrowDown')) dy++;
        const sp = dx && dy ? 1.7 : 2.3;
        p.x = clamp(p.x + dx * sp, 8, W - 8); p.y = clamp(p.y + dy * sp, 20, H - 12);
        p.bank += (dx - p.bank) * 0.2;
        // main shot
        if (g.fireT > 0) g.fireT--;
        if (K('Space') && g.fireT <= 0) {
          if (g.weapon === 'V') {
            for (const [ox, deg] of VULCAN[g.wlv - 1]) { const a = (deg - 90) * Math.PI / 180; g.ps.push({ k: 'v', x: p.x + ox, y: p.y - 8, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: 1, w: 2 }); }
            g.fireT = 5; au.tone(880, 0.04, { type: 'square', vol: 0.05, slideTo: 440 });
          } else {
            g.ps.push({ k: 'l', x: p.x, y: p.y - 14, vx: 0, vy: -11, dmg: 0.7 + g.wlv * 0.2, w: 1 + g.wlv * 0.6 });
            g.fireT = 2; if (frame % 6 === 0) au.tone(1900, 0.06, { type: 'sine', vol: 0.05, slideTo: 1500 });
          }
        }
        // missiles
        if (g.misT > 0) g.misT--;
        if (g.mlv > 0 && K('Space') && g.misT <= 0) {
          if (g.missile === 'H') {
            for (let i = 0; i < g.mlv * 2; i++) { const s = i & 1 ? 1 : -1; g.ps.push({ k: 'h', x: p.x + s * 6, y: p.y, vx: s * (1 + (i >> 1) * 0.5), vy: -1.5, dmg: 1.4, w: 2, life: 110 }); }
            g.misT = 40;
          } else {
            const n = Math.min(4, g.mlv + 1);
            for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * 8; g.ps.push({ k: 'm', x: p.x + ox, y: p.y, vx: ox * 0.03, vy: -1, dmg: 4, w: 2 }); }
            g.misT = 46;
          }
          au.noise(0.12, { vol: 0.05, freq: 3000, type: 'highpass' });
        }
        // bomb
        if ((P('KeyX') || P('KeyZ')) && g.bombs > 0 && !g.bomb) {
          g.bombs--; g.bomb = { x: p.x, y: p.y - 10, ty: Math.max(50, p.y - 90), t: 0, blast: 0 };
          au.tone(1400, 0.4, { type: 'square', vol: 0.08, slideTo: 300 });
        }
      }
      function updBomb() {
        const b = g.bomb; if (!b) return;
        b.t++;
        if (!b.blast) {
          b.y += (b.ty - b.y) * 0.12;
          if (b.t > 24) { b.blast = 1; g.eb = []; au.noise(1.6, { vol: 0.32, freq: 1500, slideTo: 60 }); au.tone(90, 1.2, { type: 'sawtooth', vol: 0.12, slideTo: 25 }); }
          return;
        }
        b.blast++;
        b.r = Math.min(120, b.blast * 3.2);
        g.eb = g.eb.filter(e => Math.hypot(e.x - b.x, e.y - b.y) > b.r);
        for (const e of g.en) if (Math.hypot(e.x - b.x, e.y - b.y) < b.r + e.r) damageEnemy(e, 0.9);
        const bo = g.boss;
        if (bo && !bo.dying && !bo.entering && Math.hypot(bo.x - b.x, bo.y - b.y) < b.r + 30) {
          damageBossCore(0.35);
          for (const p of bo.parts) if (p.alive && b.blast % 4 === 0) { p.hp -= 1; p.flash = 2; if (p.hp <= 0) { p.alive = false; boom(bo.x + p.dx, bo.y + p.dy, 4, !bo.air); addScore(2000); } }
        }
        if (b.blast > 70) g.bomb = null;
      }
      function killPlayer() {
        const p = g.p; if (!p.alive || p.inv > 0 || g.phase !== 'play') return;
        p.alive = false;
        boom(p.x, p.y, 8, false); boom(p.x - 6, p.y + 4, 5, false); boom(p.x + 6, p.y - 4, 5, false);
        au.noise(1.4, { vol: 0.3, freq: 2400, slideTo: 60 }); au.tone(700, 1.1, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
        g.items.push({ k: 'W', x: p.x, y: p.y, vx: 0.6, vy: -0.6, t: 0 });
        if (g.mlv > 0) g.items.push({ k: 'S', x: p.x, y: p.y, vx: -0.6, vy: -0.6, t: 60 });
        g.wlv = 1; g.mlv = 0; g.missile = null; g.bombs = 3;
        g.phase = 'dead'; g.phaseT = 130;
      }

      // ---------------- enemies ----------------
      function damageEnemy(e, n) {
        if (e.dead) return;
        e.hp -= n; e.flash = 3;
        if (e.hp <= 0) killEnemy(e);
      }
      function killEnemy(e) {
        e.dead = true; addScore(e.sc);
        const big = e.k === 'bomber' || e.k === 'ship' || e.k === 'bigtank';
        boom(e.x, e.y, big ? 7 : e.air ? 3 : 4, !e.air); sndBoom(big);
        if (!e.air) g.decals.push({ x: e.x, y: e.y, r: big ? 14 : 8 });
        if (e.medal && Math.random() < (big ? 1 : 0.5)) g.items.push({ k: 'medal', x: e.x, y: e.y, vx: 0, vy: 0, t: 0, ground: true });
        if (big && e.k === 'ship') { g.items.push({ k: 'medal', x: e.x - 10, y: e.y + 10, vx: 0, vy: 0, t: 0, ground: true }); g.items.push({ k: 'medal', x: e.x + 10, y: e.y - 10, vx: 0, vy: 0, t: 0, ground: true }); }
        if (e.drop) dropItem(e.x, e.y);
      }
      function dropItem(x, y) {
        const r = Math.random();
        let k = 'W';
        if (r < 0.03) k = '1'; else if (r < 0.08) k = 'P'; else if (r < 0.3) k = 'B'; else if (r < 0.55) k = 'S';
        g.items.push({ k, x, y, vx: Math.random() < 0.5 ? -0.7 : 0.7, vy: 0.6, t: 0 });
      }
      function updEnemies() {
        const p = g.p, d = diff();
        for (const e of g.en) {
          e.t++; if (e.flash > 0) e.flash--;
          if (!e.air) e.y += g.scv;
          switch (e.k) {
            case 'plane':
              if (e.y > e.ty) { e.vx -= e.turn * 0.07; e.vy = Math.max(0.6, e.vy - 0.03); }
              if (e.fire && e.t === 40 + (e.x | 0) % 30) shoot(e.x, e.y, aim(e.x, e.y), bsp());
              e.ang = Math.atan2(e.vy, e.vx);
              break;
            case 'jet':
              if (e.s === 0 && e.y >= e.ty) { e.s = 1; e.vy = 0; e.st = e.t; }
              if (e.s === 1) { if (e.t - e.st === 20) fan(e.x, e.y, 3 + (d > 0.7 ? 2 : 0), 0.6, bsp()); if (e.t - e.st > 50) e.s = 2; }
              if (e.s === 2) e.vy = Math.min(4.5, e.vy + 0.12);
              break;
            case 'heli':
              if (e.y < e.ty && e.t < e.life) e.vy = 1.2; else e.vy = e.t > e.life ? -0.9 : 0;
              e.vx = clamp((p.x - e.x) * 0.01, -0.5, 0.5);
              if (e.y > 0 && e.t < e.life && e.t % Math.max(60, 110 - d * 30 | 0) === 30) { const a = aim(e.x, e.y); for (let i = 0; i < 3; i++) shoot(e.x - Math.cos(a) * i * 6, e.y - Math.sin(a) * i * 6, a, bsp()); }
              break;
            case 'drone':
              e.x = e.x0 + Math.sin(e.t * 0.04 + e.ph) * e.amp; e.vx = 0;
              if (e.t % 150 === 60 && Math.random() < 0.4 + d * 0.2) shoot(e.x, e.y, aim(e.x, e.y), bsp() * 0.9);
              break;
            case 'bomber':
              if (e.y >= e.ty && e.t < e.life) e.vy = 0; else if (e.t >= e.life) e.vy = 0.8;
              e.vx = Math.sin(e.t * 0.012) * 0.4;
              if (e.y > 10 && e.t % Math.max(50, 90 - d * 20 | 0) === 0) { fan(e.x - 20, e.y + 6, 3, 0.5, bsp() * 0.9); fan(e.x + 20, e.y + 6, 3, 0.5, bsp() * 0.9); }
              break;
            case 'carrier':
              e.vx = Math.sin(e.t * 0.05) * 0.8;
              break;
            case 'tank': case 'bigtank': case 'turret': case 'boat': case 'ship':
              e.ang = aim(e.x, e.y);
              if (e.road) e.x += (roadX(scroll + H - e.y) - e.x) * 0.05;
              if (e.k === 'boat') { e.vx = Math.sin(e.t * 0.02) * 0.5; }
              if (--e.fireT <= 0 && e.y > 4 && e.y < p.y - 24) {
                const r = Math.max(50, (e.k === 'turret' ? 120 : 150) - d * 40);
                e.fireT = r * rnd(0.8, 1.3) | 0;
                if (e.k === 'turret') fan(e.x, e.y, 3, 0.45, bsp());
                else if (e.k === 'bigtank') { fan(e.x, e.y, 2, 0.15, bsp()); e.fireT = e.fireT * 0.6 | 0; }
                else if (e.k === 'ship') { for (const gy of e.guns) fan(e.x, e.y + gy, 2, 0.3, bsp()); }
                else shoot(e.x, e.y, e.ang, bsp());
              }
              break;
          }
          e.x += e.vx; e.y += e.vy;
          if (e.y > H + 40 || e.y < -120 || e.x < -60 || e.x > W + 60) e.dead = true;
          // collide with player (air only)
          if (e.air && p.alive && !e.dead && Math.abs(e.x - p.x) < e.r + 2 && Math.abs(e.y - p.y) < e.r + 3) { damageEnemy(e, 8); killPlayer(); }
        }
        g.en = g.en.filter(e => !e.dead);
      }

      // ---------------- shots, items ----------------
      function nearestTarget(x, y) {
        let best = null, bd = 1e9;
        for (const e of g.en) { if (e.y < 0) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
        const b = g.boss;
        if (b && !b.dying && !b.entering) { const d = Math.hypot(b.x - x, b.y - y); if (d < bd) best = { x: b.x, y: b.y + b.coreDy }; }
        return best;
      }
      function updShots() {
        for (const s of g.ps) {
          if (s.k === 'h') {
            s.life--;
            const t = s.life < 100 ? nearestTarget(s.x, s.y) : null;
            if (t) { const a = Math.atan2(t.y - s.y, t.x - s.x); s.vx += Math.cos(a) * 0.5; s.vy += Math.sin(a) * 0.5; }
            else s.vy -= 0.2;
            const v = Math.hypot(s.vx, s.vy); if (v > 4.5) { s.vx *= 4.5 / v; s.vy *= 4.5 / v; }
            if (s.life <= 0) s.dead = true;
          } else if (s.k === 'm') s.vy = Math.max(-7, s.vy - 0.25);
          s.x += s.vx; s.y += s.vy;
          if (s.y < -20 || s.y > H + 10 || s.x < -10 || s.x > W + 10) { s.dead = true; continue; }
          if (hitBoss(s)) { s.dead = true; splash(s); continue; }
          for (const e of g.en) {
            if (e.dead || e.y < -8) continue;
            if (Math.abs(s.x - e.x) < e.r + s.w && Math.abs(s.y - e.y) < e.r + 3) {
              s.dead = true; damageEnemy(e, s.dmg); splash(s);
              if (!e.dead) au.tone(1500, 0.02, { type: 'square', vol: 0.03 });
              break;
            }
          }
        }
        g.ps = g.ps.filter(s => !s.dead);
        // enemy bullets
        const p = g.p;
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy;
          if (p.alive && p.inv <= 0 && p.enter <= 0 && Math.abs(b.x - p.x) < 3 && Math.abs(b.y - p.y) < 4) { b.dead = true; killPlayer(); }
        }
        g.eb = g.eb.filter(b => !b.dead && b.x > -6 && b.x < W + 6 && b.y > -6 && b.y < H + 6);
        // air boss body collision
        const bo = g.boss;
        if (bo && bo.air && !bo.dying && p.alive && Math.abs(bo.x - p.x) < bo.w * 0.3 && Math.abs(bo.y - p.y) < bo.h * 0.35) killPlayer();
      }
      function splash(s) {
        if (s.k === 'm') {
          g.fx.push({ x: s.x, y: s.y, t: 0, T: 14, r: 2, ground: false });
          for (const e of g.en) if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) < 16) damageEnemy(e, 1.5);
        } else if (s.k === 'v' || s.k === 'l') g.fx.push({ x: s.x + rnd(-2, 2), y: s.y - 2, t: 0, T: 6, r: 0, spark: true });
      }
      function updItems() {
        const p = g.p;
        for (const it of g.items) {
          it.t++;
          if (it.k === 'medal') { it.y += g.scv; }
          else {
            it.x += it.vx; it.y += it.vy;
            if (it.t < 600) {
              if (it.x < 8 || it.x > W - 8) it.vx = -it.vx;
              if (it.y < 16 && it.vy < 0) it.vy = -it.vy;
              if (it.y > H - 24 && it.vy > 0) it.vy = -it.vy;
            }
          }
          if (it.y > H + 16 || it.y < -40 || it.x < -20 || it.x > W + 20) it.dead = true;
          if (p.alive && Math.abs(it.x - p.x) < 11 && Math.abs(it.y - p.y) < 11) { it.dead = true; collect(it); }
        }
        g.items = g.items.filter(i => !i.dead);
      }
      function itemColor(it) { return ((it.t / 100) | 0) % 2; }
      function collect(it) {
        const blip = () => au.melody([[1047, .05], [1319, .05], [1568, .08]], { type: 'square', vol: 0.12 });
        switch (it.k) {
          case 'W': {
            const w = itemColor(it) ? 'L' : 'V';
            if (w === g.weapon) { if (g.wlv < 8) g.wlv++; else { addScore(5000); pop(it.x, it.y, 5000); } } else g.weapon = w;
            blip(); break;
          }
          case 'S': {
            const m = itemColor(it) ? 'H' : 'M';
            if (m === g.missile) { if (g.mlv < 4) g.mlv++; else { addScore(5000); pop(it.x, it.y, 5000); } } else { g.missile = m; g.mlv = Math.max(1, g.mlv); }
            blip(); break;
          }
          case 'B': if (g.bombs < 7) g.bombs++; else { addScore(5000); pop(it.x, it.y, 5000); } blip(); break;
          case 'P': g.wlv = 8; if (!g.missile) g.missile = 'H'; g.mlv = 4; blip(); pop(it.x, it.y, 'FULL POWER', '#ffe040'); break;
          case '1': extraLife(); break;
          case 'medal': { const v = Math.min(10000, 500 * g.stage); addScore(v); pop(it.x, it.y, v, '#ffe040'); au.tone(1760, 0.08, { type: 'triangle', vol: 0.14 }); au.tone(2637, 0.12, { type: 'triangle', vol: 0.1, delay: 0.06 }); break; }
        }
      }

      // ---------------- main update ----------------
      function updFx() {
        for (const f of g.fx) { f.t++; if (f.ground) f.y += g.scv; }
        g.fx = g.fx.filter(f => f.t < f.T);
        for (const d of g.deb) { d.x += d.vx; d.y += d.vy + (d.ground ? g.scv : 0); d.vx *= 0.95; d.vy *= 0.95; d.t--; }
        g.deb = g.deb.filter(d => d.t > 0);
        for (const d of g.decals) d.y += g.scv;
        g.decals = g.decals.filter(d => d.y < H + 30);
        for (const q of g.pops) { q.t--; q.y -= 0.4; }
        g.pops = g.pops.filter(q => q.t > 0);
      }
      function updPlay() {
        g.st++;
        if (g.banner > 0) g.banner--;
        if (g.st < STAGE_LEN) spawner();
        else if (!g.boss && !g.bossDone) {
          if (g.warn === 0) { g.warn = 200; if (mode !== 'demo') for (let i = 0; i < 4; i++) { au.tone(660, 0.22, { type: 'square', vol: 0.1, delay: i * 0.45 }); au.tone(440, 0.22, { type: 'square', vol: 0.1, delay: i * 0.45 + 0.22 }); } }
          else if (--g.warn <= 1) spawnBoss();
        }
        if (g.boss) updBoss();
        updEnemies(); updShots(); updItems(); updBomb();
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++; scroll += SCR;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          else if (titleT > 600) { mode = 'demo'; newGame(); demoT = 0; }
          return;
        }
        if (mode === 'demo') {
          if (api.anyPressed('Enter', 'Space')) { mode = 'title'; titleT = 0; tryStart(); return; }
          if (++demoT > 1500 || g.phase === 'dead') { mode = 'title'; titleT = 0; g = null; return; }
          aiThink();
        }
        scroll += g.scv;
        updFx(); updPlayer();
        switch (g.phase) {
          case 'play': updPlay(); break;
          case 'dead':
            updPlay();
            if (--g.phaseT <= 0) {
              if (g.lives > 0) { g.lives--; respawn(); }
              else {
                g.phase = 'wait'; const cg = g;
                if (api.offerContinue && mode === 'game') api.offerContinue(() => { if (g === cg) { g.lives = 2; g.score = 0; respawn(); } }, () => { if (g === cg) gameOver(); });
                else gameOver();
              }
            }
            break;
          case 'clear':
            updEnemies(); updShots(); updItems(); updBomb();
            if (--g.phaseT <= 0) { g.stage++; startStage(); }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
            break;
        }
      }
      function tryStart() {
        if (api.useCredit()) { mode = 'game'; newGame(); }
        else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
      }
      function respawn() { g.p = { x: W / 2, y: H + 20, alive: true, inv: 180, enter: 60, bank: 0 }; g.phase = 'play'; }
      function gameOver() {
        api.setHiScore(g.score); hi = Math.max(hi, g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .25], [330, .25], [294, .25], [262, .6]], { type: 'square', vol: 0.1 });
      }

      // ---------------- background ----------------
      function drawBG(ctx) {
        const th = theme(), T = 16, r0 = Math.floor(scroll / T);
        for (let r = r0; r <= r0 + H / T + 1; r++) {
          const y = Math.round(H - (r * T + T - scroll));
          if (th === 'fields') bgFields(ctx, r, y, T);
          else if (th === 'sea') bgSea(ctx, r, y, T);
          else if (th === 'ruins') bgRuins(ctx, r, y, T);
          else if (th === 'city') bgCity(ctx, r, y, T);
          else bgSpace(ctx, r, y, T);
        }
        if (th === 'fields' || th === 'ruins') {
          // meandering road, drawn as one strip
          ctx.fillStyle = th === 'fields' ? '#a48c5c' : '#7a7468';
          for (let y = -4; y < H + 4; y += 4) { const x = roadX(scroll + H - y); ctx.fillRect(Math.round(x - 9), y, 18, 4); }
          ctx.fillStyle = th === 'fields' ? '#7a6440' : '#5a564e';
          for (let y = -4; y < H + 4; y += 4) { const x = roadX(scroll + H - y); ctx.fillRect(Math.round(x - 10), y, 2, 4); ctx.fillRect(Math.round(x + 8), y, 2, 4); }
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          for (let y = -4; y < H + 4; y += 8) { const wy = Math.floor((scroll + H - y) / 8); if (wy & 1) { const x = roadX(scroll + H - y); ctx.fillRect(Math.round(x - 5), y, 2, 4); ctx.fillRect(Math.round(x + 3), y, 2, 4); } }
        }
      }
      function bgFields(ctx, r, y, T) {
        ctx.fillStyle = '#3f7a2e'; ctx.fillRect(0, y, W, T);
        const b = r >> 2, sub = r & 3;
        const cols = ['#5a9238', '#7d9b42', '#8c7448', '#4c8a3c', '#9aa050'];
        for (let k = 0; k < 3; k++) {
          if (hash(b * 7 + k * 131) < 0.35) continue;
          const x = (hash(b * 13 + k * 17) * (W - 40)) | 0, w = 30 + (hash(b * 19 + k) * 50 | 0), c = cols[(hash(b * 23 + k) * cols.length) | 0];
          ctx.fillStyle = c; ctx.fillRect(x, y + (sub === 0 ? 2 : 0), w, sub === 3 ? T - 2 : T - (sub === 0 ? 2 : 0));
          if (c === '#8c7448') { ctx.fillStyle = '#76603a'; for (let yy = 0; yy < T; yy += 4) ctx.fillRect(x, y + yy, w, 1); }
          else { ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + w - 2, y, 2, T); }
        }
        for (let k = 0; k < 4; k++) {
          const h = hash(r * 31 + k * 7); if (h > 0.45) continue;
          const x = hash(r * 37 + k * 11) * W, yy = y + hash(r * 41 + k) * T;
          disc(ctx, x + 1, yy + 2, 4, '#1e4a18'); disc(ctx, x, yy, 4, '#2c6424'); disc(ctx, x - 1, yy - 1, 2, '#46883a');
        }
      }
      function bgSea(ctx, r, y, T) {
        ctx.fillStyle = '#1a4c9c'; ctx.fillRect(0, y, W, T);
        for (let k = 0; k < 5; k++) {
          const x = (hash(r * 17 + k * 3) * W) | 0, l = 4 + (hash(r * 29 + k) * 10 | 0), yy = y + (hash(r * 5 + k) * T | 0);
          ctx.fillStyle = k & 1 ? '#3a6cc0' : '#6a9ae0'; ctx.fillRect(x, yy, l, 1);
        }
        const cw = Math.max(0, Math.sin(r * 0.031) * 70 - 20) | 0;
        if (cw > 0) {
          ctx.fillStyle = '#e0d098'; ctx.fillRect(0, y, cw + 6, T);
          ctx.fillStyle = '#4a8a3a'; ctx.fillRect(0, y, cw, T);
          ctx.fillStyle = '#ffffff'; if ((r + (frame >> 4)) & 1) ctx.fillRect(cw + 6, y + 4, 2, 6);
        }
      }
      function bgRuins(ctx, r, y, T) {
        ctx.fillStyle = '#6c6250'; ctx.fillRect(0, y, W, T);
        const b = r >> 1;
        for (let k = 0; k < 3; k++) {
          const h = hash(b * 11 + k * 59); if (h < 0.4) continue;
          const x = (hash(b * 3 + k * 7) * (W - 30)) | 0, w = 14 + (hash(b * 5 + k) * 26 | 0);
          ctx.fillStyle = '#8a8070'; ctx.fillRect(x, y, w, T);
          ctx.fillStyle = '#4a4438'; ctx.fillRect(x, y + T - 3, w, 3); ctx.fillRect(x + w - 2, y, 2, T);
          if ((r & 1) && h > 0.75) { ctx.fillStyle = '#3a342a'; ctx.fillRect(x + 4, y + 4, 4, 4); ctx.fillRect(x + w - 10, y + 6, 3, 3); }
        }
        for (let k = 0; k < 3; k++) { const x = hash(r * 7 + k * 99) * W, yy = y + hash(r * 9 + k) * T; ctx.fillStyle = '#504a3e'; ctx.fillRect(x | 0, yy | 0, 3, 2); }
      }
      function bgCity(ctx, r, y, T) {
        ctx.fillStyle = '#44484c'; ctx.fillRect(0, y, W, T);
        const b = Math.floor(r / 5), sub = r - b * 5;
        if (sub === 0) { ctx.fillStyle = '#5c6064'; ctx.fillRect(0, y, W, T); ctx.fillStyle = '#d8d8a0'; for (let x = (b * 7) % 16; x < W; x += 16) ctx.fillRect(x, y + 7, 8, 1); return; }
        for (let c = 0; c < 4; c++) {
          const x0 = c * 56 + 6, h = hash(b * 4 + c + 300);
          if (h < 0.2) { ctx.fillStyle = '#3c6a34'; ctx.fillRect(x0, y, 44, T); continue; }
          const roof = ['#7a7a84', '#8a7a68', '#6a7480', '#9a9890'][(h * 4) | 0];
          ctx.fillStyle = roof; ctx.fillRect(x0, y, 44, T);
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x0 + 40, y, 4, T);
          if (sub === 4) ctx.fillRect(x0, y + T - 4, 44, 4);
          if (sub === 1) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x0, y, 44, 2); }
          if (sub === 2 && h > 0.5) { ctx.fillStyle = '#505058'; ctx.fillRect(x0 + 8, y + 3, 10, 8); ctx.fillStyle = '#c04040'; ctx.fillRect(x0 + 30, y + 5, 4, 4); }
        }
      }
      function bgSpace(ctx, r, y, T) {
        ctx.fillStyle = '#04040e'; ctx.fillRect(0, y, W, T);
        for (let k = 0; k < 3; k++) {
          const x = hash(r * 13 + k * 7) * W, yy = y + hash(r * 3 + k) * T, h = hash(r + k * 1000);
          ctx.fillStyle = h < 0.3 ? '#ffffff' : h < 0.6 ? '#8080c0' : '#404070'; ctx.fillRect(x | 0, yy | 0, 1, 1);
        }
        // fast star layer
        const s2 = scroll * 2, rr = r;
        const x = hash(rr * 77) * W, yy = ((hash(rr * 55) * H + s2) % H);
        if (r % 3 === 0) { ctx.fillStyle = '#c0c0ff'; ctx.fillRect(x | 0, yy | 0, 1, 2); }
      }

      // ---------------- drawing ----------------
      function drawRot(ctx, img, x, y, a) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a); ctx.drawImage(img, -img.width / 2 | 0, -img.height / 2 | 0); ctx.restore(); }
      function barrel(ctx, x, y, a, len, wd, col) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a); ctx.fillStyle = col; ctx.fillRect(0, -wd / 2, len, wd); ctx.restore(); }
      function drawTank(ctx, e, big) {
        const x = Math.round(e.x), y = Math.round(e.y), f = e.flash > 0, s = big ? 1.6 : 1;
        const body = f ? '#ffffff' : big ? '#8c7c50' : '#6c7c48', dark = f ? '#ffd0d0' : '#2a2a22';
        const tw = Math.round(3 * s), bw = Math.round(7 * s), bh = Math.round(8 * s);
        const horiz = Math.abs(e.vx) > Math.abs(e.vy);
        ctx.save(); ctx.translate(x, y); if (horiz) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = dark; ctx.fillRect(-bw, -bh, tw, bh * 2); ctx.fillRect(bw - tw, -bh, tw, bh * 2);
        ctx.fillStyle = '#5a5a4a'; for (let i = ((frame >> 2) & 3) - bh; i < bh; i += 4) { ctx.fillRect(-bw, i, tw, 1); ctx.fillRect(bw - tw, i, tw, 1); }
        ctx.fillStyle = body; ctx.fillRect(-bw + tw, -bh + 1, (bw - tw) * 2, bh * 2 - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-bw + tw, -bh + 1, (bw - tw) * 2, 2);
        ctx.restore();
        barrel(ctx, x, y, e.ang, Math.round(9 * s), big ? 3 : 2, f ? '#fff' : '#202018');
        if (big) barrel(ctx, x, y - 6, e.ang, 8, 2, '#202018');
        disc(ctx, x, y, 3.5 * s, f ? '#ffffff' : big ? '#a89860' : '#88985a');
        disc(ctx, x - 1, y - 1, 1.2 * s, 'rgba(255,255,255,0.4)');
      }
      function drawTurret(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), f = e.flash > 0;
        ctx.fillStyle = '#5a5850'; ctx.fillRect(x - 10, y - 10, 20, 20);
        ctx.fillStyle = '#8a887c'; ctx.fillRect(x - 9, y - 9, 18, 18);
        ctx.fillStyle = '#6a685e'; ctx.fillRect(x - 9, y + 6, 18, 3);
        const a = e.ang, ox = Math.cos(a + Math.PI / 2) * 2.5, oy = Math.sin(a + Math.PI / 2) * 2.5;
        barrel(ctx, x + ox, y + oy, a, 11, 2, '#202020'); barrel(ctx, x - ox, y - oy, a, 11, 2, '#202020');
        disc(ctx, x, y, 6, f ? '#fff' : '#a04030'); disc(ctx, x - 1.5, y - 1.5, 2, f ? '#fff' : '#d07050');
      }
      function drawBoat(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), f = e.flash > 0;
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 1, y - 16, 2, 8); ctx.fillRect(x - 4, y - 12, 1, 4); ctx.fillRect(x + 3, y - 12, 1, 4);
        ctx.fillStyle = f ? '#fff' : '#7a8088';
        ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x + 5, y + 2); ctx.lineTo(x + 5, y - 8); ctx.lineTo(x - 5, y - 8); ctx.lineTo(x - 5, y + 2); ctx.fill();
        ctx.fillStyle = '#c8c8d0'; ctx.fillRect(x - 3, y - 4, 6, 5);
        barrel(ctx, x, y + 3, e.ang, 6, 2, '#202020'); disc(ctx, x, y + 3, 2, '#505860');
      }
      function drawShip(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), f = e.flash > 0;
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - 8, y + 44, 16, 10); ctx.fillRect(x - 4, y + 54, 8, 10);
        ctx.fillStyle = f ? '#fff' : '#6a7078';
        ctx.beginPath(); ctx.moveTo(x, y - 46); ctx.lineTo(x + 13, y - 26); ctx.lineTo(x + 13, y + 38); ctx.lineTo(x + 8, y + 46); ctx.lineTo(x - 8, y + 46); ctx.lineTo(x - 13, y + 38); ctx.lineTo(x - 13, y - 26); ctx.fill();
        ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x - 9, y - 22, 18, 58);
        ctx.fillStyle = '#c8ccd0'; ctx.fillRect(x - 6, y - 8, 12, 14); ctx.fillStyle = '#404850'; ctx.fillRect(x - 4, y - 4, 8, 3);
        for (const gy of e.guns) { barrel(ctx, x, y + gy, e.ang, 9, 2, '#202020'); disc(ctx, x, y + gy, 4, f ? '#fff' : '#58606a'); }
      }
      function drawBomber(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), f = e.flash > 0;
        const body = f ? '#ffffff' : '#7c8670', dark = f ? '#ffe0e0' : '#4a5242', lite = f ? '#fff' : '#a4ae94';
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 40 + 14, y + 16, 80, 8); ctx.fillRect(x - 5 + 14, y - 10, 10, 50);
        ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - 44, y - 2); ctx.lineTo(x - 4, y - 10); ctx.lineTo(x + 4, y - 10); ctx.lineTo(x + 44, y - 2); ctx.lineTo(x + 44, y + 4); ctx.lineTo(x - 44, y + 4); ctx.fill();
        ctx.fillStyle = lite; ctx.fillRect(x - 40, y - 2, 80, 1);
        ctx.fillStyle = body; ctx.fillRect(x - 6, y - 24, 12, 50); ctx.fillRect(x - 16, y - 24, 32, 5);
        ctx.fillStyle = '#80d0ff'; ctx.fillRect(x - 3, y + 20, 6, 4);
        for (const ex of [-30, -16, 16, 30]) { ctx.fillStyle = dark; ctx.fillRect(x + ex - 3, y - 6, 6, 16); ctx.fillStyle = (frame >> 1) & 1 ? '#ffb040' : '#ff6020'; ctx.fillRect(x + ex - 2, y - 9, 4, 3); }
        disc(ctx, x - 20, y + 6, 2.5, '#ff3030'); disc(ctx, x + 20, y + 6, 2.5, '#ff3030');
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), fi = e.flash > 0 ? 1 : 0;
        switch (e.k) {
          case 'plane': ctx.drawImage(PLANE[2], x - 6 + 8, y - 5 + 12); drawRot(ctx, PLANE[fi], x, y, e.ang - Math.PI / 2); break;
          case 'jet': ctx.drawImage(JET[2], x - 7 + 10, y - 6 + 14); ctx.drawImage(JET[fi], x - 7, y - 6); if (e.s === 2) { ctx.fillStyle = '#ffb040'; ctx.fillRect(x - 1, y - 9, 2, 3); } break;
          case 'heli': {
            ctx.drawImage(HELI[2], x - 6 + 8, y - 5 + 12); ctx.drawImage(HELI[fi], x - 6, y - 5);
            const a = frame * 0.6; ctx.strokeStyle = 'rgba(220,220,220,0.8)'; ctx.lineWidth = 1; ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * 10, y + 1 + Math.sin(a) * 10); ctx.lineTo(x - Math.cos(a) * 10, y + 1 - Math.sin(a) * 10);
            ctx.moveTo(x + Math.cos(a + 1.57) * 10, y + 1 + Math.sin(a + 1.57) * 10); ctx.lineTo(x - Math.cos(a + 1.57) * 10, y + 1 - Math.sin(a + 1.57) * 10); ctx.stroke();
            break;
          }
          case 'drone': ctx.drawImage(DRONE[fi], x - 4, y - 3); break;
          case 'carrier': ctx.drawImage(CARRIER[2], x - 5 + 8, y - 4 + 12); ctx.drawImage(CARRIER[fi], x - 5, y - 4); if ((frame >> 2) & 1) { ctx.fillStyle = '#ffff60'; ctx.fillRect(x - 1, y - 7, 2, 2); } break;
          case 'bomber': drawBomber(ctx, e); break;
          case 'tank': drawTank(ctx, e, false); break;
          case 'bigtank': drawTank(ctx, e, true); break;
          case 'turret': drawTurret(ctx, e); break;
          case 'boat': drawBoat(ctx, e); break;
          case 'ship': drawShip(ctx, e); break;
        }
      }
      function drawBoss(ctx) {
        const b = g.boss, x = Math.round(b.x), y = Math.round(b.y), f = b.flash > 0;
        const sh = (b.dying && (frame & 2)) ? 1 : 0;
        ctx.save(); ctx.translate(sh, 0);
        if (b.type === 'spider') {
          const legT = b.t * 0.12;
          ctx.fillStyle = '#3a3a30';
          for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
            const ly = y - 22 + i * 22, sw = Math.sin(legT + i * 2 + (s > 0 ? 1 : 0)) * 4;
            ctx.fillRect(s > 0 ? x + 38 : x - 54, ly + sw - 3, 16, 6); ctx.fillStyle = '#5a5a48'; ctx.fillRect(s > 0 ? x + 50 : x - 54, ly + sw - 5, 4, 10); ctx.fillStyle = '#3a3a30';
          }
          ctx.fillStyle = f ? '#fff' : '#6a6e58'; ctx.fillRect(x - 42, y - 32, 84, 64);
          ctx.fillStyle = '#8c907a'; ctx.fillRect(x - 38, y - 28, 76, 56);
          ctx.fillStyle = '#5a5e4a'; ctx.fillRect(x - 38, y + 22, 76, 6); ctx.fillRect(x - 4, y - 28, 8, 56);
          ctx.fillStyle = '#4a4e3c'; for (let i = -24; i < 24; i += 8) ctx.fillRect(x - 36, y + i, 6, 3);
        } else if (b.type === 'battleship') {
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 30, y + 70, 60, 14);
          ctx.fillStyle = f ? '#fff' : '#5a6068';
          ctx.beginPath(); ctx.moveTo(x, y - 86); ctx.lineTo(x + 30, y - 50); ctx.lineTo(x + 32, y + 70); ctx.lineTo(x + 20, y + 84); ctx.lineTo(x - 20, y + 84); ctx.lineTo(x - 32, y + 70); ctx.lineTo(x - 30, y - 50); ctx.fill();
          ctx.fillStyle = '#8a9098'; ctx.fillRect(x - 24, y - 50, 48, 120);
          ctx.fillStyle = '#a8aeb6'; ctx.fillRect(x - 14, y + 14, 28, 44); ctx.fillStyle = '#6a7078'; ctx.fillRect(x - 10, y + 50, 20, 16);
          ctx.fillStyle = '#404850'; for (let i = -46; i < 66; i += 10) ctx.fillRect(x - 24, y + i, 3, 2);
        } else if (b.type === 'fortress') {
          ctx.fillStyle = '#3a3830'; ctx.fillRect(x - 62, y - 48, 124, 96);
          ctx.fillStyle = f ? '#fff' : '#7a7466'; ctx.fillRect(x - 58, y - 44, 116, 88);
          ctx.fillStyle = '#9a9484'; ctx.fillRect(x - 36, y - 24, 72, 48);
          ctx.fillStyle = '#5a5648'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 58, y - 40 + i * 24, 116, 2);
          ring(ctx, x, y, 20 + Math.sin(b.t * 0.1) * 2, '#c04030', 2);
        } else if (b.type === 'bigplane') {
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 70 + 18, y + 16, 140, 14);
          ctx.fillStyle = f ? '#fff' : '#6a7464';
          ctx.beginPath(); ctx.moveTo(x - 80, y + 6); ctx.lineTo(x - 10, y - 14); ctx.lineTo(x + 10, y - 14); ctx.lineTo(x + 80, y + 6); ctx.lineTo(x + 80, y + 14); ctx.lineTo(x - 80, y + 14); ctx.fill();
          ctx.fillStyle = '#8c967e'; ctx.fillRect(x - 12, y - 36, 24, 72); ctx.fillRect(x - 30, y - 36, 60, 8);
          ctx.fillStyle = '#4a5244'; for (const ex of [-56, -30, 30, 56]) ctx.fillRect(x + ex - 6, y - 4, 12, 22);
          ctx.fillStyle = '#80d0ff'; ctx.fillRect(x - 5, y + 28, 10, 6);
        } else {
          ctx.fillStyle = f ? '#fff' : '#4a3a6a';
          ctx.beginPath(); ctx.moveTo(x - 104, y); ctx.lineTo(x - 60, y - 40); ctx.lineTo(x + 60, y - 40); ctx.lineTo(x + 104, y); ctx.lineTo(x + 60, y + 44); ctx.lineTo(x - 60, y + 44); ctx.fill();
          ctx.fillStyle = '#6a5a8c'; ctx.fillRect(x - 60, y - 30, 120, 60);
          ctx.fillStyle = '#8a7aac'; for (let i = -54; i < 60; i += 12) ctx.fillRect(x + i, y - 26, 6, 52);
          ctx.fillStyle = (frame >> 3) & 1 ? '#40ffd0' : '#20a080'; for (const ex of [-90, 90]) ctx.fillRect(x + ex - 3, y - 3, 6, 6);
        }
        for (const p of b.parts) {
          const px = Math.round(x + p.dx), py = Math.round(y + p.dy);
          if (!p.alive) { disc(ctx, px, py, 7, '#2a2420'); disc(ctx, px, py, 4, '#141010'); continue; }
          ctx.fillStyle = '#3a3a3a'; ctx.fillRect(px - 8, py - 8, 16, 16);
          barrel(ctx, px, py, p.ang, 12, 3, '#181818');
          disc(ctx, px, py, 6.5, p.flash ? '#ffffff' : '#a85030'); disc(ctx, px - 2, py - 2, 2, p.flash ? '#fff' : '#e09060');
        }
        const cy = y + b.coreDy, pulse = (frame >> 2) & 1;
        disc(ctx, x, cy, b.cr, '#202028'); disc(ctx, x, cy, b.cr - 3, f ? '#ffffff' : pulse ? '#ff3040' : '#c01830'); disc(ctx, x - 3, cy - 3, b.cr * 0.3, '#ffa0a0');
        ctx.restore();
        // boss hp bar
        if (!b.entering) { ctx.fillStyle = '#300000'; ctx.fillRect(40, 22, W - 80, 3); ctx.fillStyle = '#ff4020'; ctx.fillRect(40, 22, Math.max(0, (W - 80) * b.hp / b.maxHp), 3); }
      }
      function drawItem(ctx, it) {
        const x = Math.round(it.x), y = Math.round(it.y);
        if (it.k === 'medal') {
          const sw = Math.abs(Math.cos(it.t * 0.12)) * 5 + 1;
          ctx.fillStyle = '#7a5410'; ctx.fillRect(x - sw, y - 6, sw * 2, 12);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x - sw + 1, y - 5, sw * 2 - 2, 10);
          ctx.fillStyle = '#fff8c0'; ctx.fillRect(x - 1, y - 4, 2, 4);
          return;
        }
        let col = '#ffe040', ch = it.k, fg = '#000';
        if (it.k === 'W') { const c = itemColor(it); col = c ? '#2070ff' : '#ff2020'; ch = ''; fg = '#fff'; }
        else if (it.k === 'S') { const c = itemColor(it); col = c ? '#20c040' : '#ff8020'; ch = c ? 'H' : 'M'; fg = '#fff'; }
        else if (it.k === 'P') { col = ['#ff2020', '#ffe020', '#20ff40', '#2080ff'][(it.t >> 3) & 3]; }
        else if (it.k === '1') { col = '#40ff80'; ch = '1'; }
        if (it.k === 'W') {
          // crystal: Vulcan red / Laser blue
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 7, y); ctx.fill();
          ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x - 2, y - 3, 2, 3);
          return;
        }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 7, y - 6, 14, 12);
        ctx.fillStyle = col; ctx.fillRect(x - 6, y - 5, 12, 10);
        text(ctx, ch, x - 2, y - 3, fg);
      }
      function drawShots(ctx) {
        for (const s of g.ps) {
          const x = Math.round(s.x), y = Math.round(s.y);
          if (s.k === 'v') { ctx.fillStyle = '#ff4020'; ctx.fillRect(x - 1, y - 3, 3, 7); ctx.fillStyle = '#ffe080'; ctx.fillRect(x, y - 2, 1, 4); }
          else if (s.k === 'l') { const w = Math.round(s.w); ctx.fillStyle = '#2050ff'; ctx.fillRect(x - w - 1, y - 11, w * 2 + 2, 22); ctx.fillStyle = '#80c0ff'; ctx.fillRect(x - w, y - 11, w * 2, 22); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - Math.max(1, w >> 1), y - 11, Math.max(2, w), 22); }
          else if (s.k === 'h') { ctx.fillStyle = '#40ff60'; ctx.fillRect(x - 1, y - 2, 2, 4); ctx.fillStyle = '#ffffa0'; ctx.fillRect(x - 1, y + 2, 2, 2); }
          else { ctx.fillStyle = '#d0d0d0'; ctx.fillRect(x - 1, y - 4, 3, 8); ctx.fillStyle = '#ff3020'; ctx.fillRect(x - 1, y - 5, 3, 2); ctx.fillStyle = (frame & 2) ? '#ffe040' : '#ff8020'; ctx.fillRect(x - 1, y + 4, 3, 3); }
        }
      }
      function drawFx(ctx, groundPass) {
        for (const f of g.fx) {
          if (!!f.ground !== groundPass) continue;
          if (f.spark) { ctx.fillStyle = f.t < 3 ? '#ffffff' : '#ffc040'; ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3); continue; }
          const k = f.t / f.T, r = (4 + f.r * 3) * Math.sqrt(k) + 2;
          const col = k < 0.2 ? '#ffffff' : k < 0.45 ? '#ffe040' : k < 0.7 ? '#ff7010' : '#702810';
          disc(ctx, f.x, f.y, r * (1 - k * 0.35), col);
          if (k < 0.5) disc(ctx, f.x, f.y, r * 0.5, '#fffbe0');
        }
        for (const d of g.deb) { if (!!d.ground !== groundPass) continue; ctx.fillStyle = d.t > 25 ? '#ffe080' : d.t > 12 ? '#ff6020' : '#602010'; ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2); }
      }
      function drawPlayer(ctx) {
        const p = g.p; if (!p.alive) return;
        if (p.inv > 0 && (p.inv >> 2) & 1) return;
        const x = Math.round(p.x), y = Math.round(p.y);
        ctx.drawImage(PLAYER[2], x - 7 + 12, y - 8 + 16);
        const sq = Math.abs(p.bank) > 0.5 ? 2 : 0;
        ctx.drawImage(PLAYER[0], x - 7 + (sq >> 1), y - 8, 15 - sq, 16);
        ctx.fillStyle = (frame & 2) ? '#ffe060' : '#ff8030'; ctx.fillRect(x - 3, y + 7, 2, 3 + (frame & 1)); ctx.fillRect(x + 2, y + 7, 2, 3 + (frame & 1));
      }
      function drawBombFx(ctx) {
        const b = g.bomb; if (!b) return;
        if (!b.blast) { disc(ctx, b.x, b.y, 3, '#ffe040'); disc(ctx, b.x, b.y, 1.5, '#ff2020'); return; }
        const k = b.blast / 70;
        ctx.globalAlpha = Math.max(0, 0.8 - k * 0.7);
        disc(ctx, b.x, b.y, b.r, '#ff8020'); disc(ctx, b.x, b.y, b.r * 0.75, '#ffd040'); disc(ctx, b.x, b.y, b.r * 0.45, '#ffffff');
        ctx.globalAlpha = 1;
        ring(ctx, b.x, b.y, b.r, '#ffffff', 2);
        if (b.blast < 6) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, 0, W, H); }
      }
      function hud(ctx) {
        otext(ctx, '1P', 4, 2, '#ff4040'); otext(ctx, pad(g ? g.score : 0, 8), 16, 2, '#ffffff');
        otext(ctx, 'HI', 120, 2, '#ffe040'); otext(ctx, pad(hi, 8), 132, 2, '#ffffff');
        if (!g) return;
        for (let i = 0; i < Math.min(6, g.lives); i++) ctx.drawImage(PLAYER[0], 4 + i * 11, 12, 9, 10);
        for (let i = 0; i < g.bombs; i++) { const bx = 6 + i * 9, by = H - 12; disc(ctx, bx, by + 4, 3.5, '#202020'); disc(ctx, bx, by + 4, 2.5, '#ffd040'); ctx.fillStyle = '#ff3020'; ctx.fillRect(bx - 1, by - 1, 2, 3); }
        const wl = (g.weapon === 'V' ? 'VULCAN ' : 'LASER ') + g.wlv;
        text(ctx, wl, W - 4, H - 10, g.weapon === 'V' ? '#ff6040' : '#60a0ff', 1, 'right');
        if (g.mlv) text(ctx, (g.missile === 'H' ? 'H' : 'M') + g.mlv, W - 4, H - 19, g.missile === 'H' ? '#40ff60' : '#ffa040', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawBG(ctx);
        if (mode === 'title') { renderTitle(ctx); return; }
        for (const d of g.decals) { disc(ctx, d.x, d.y, d.r, 'rgba(20,14,8,0.55)'); disc(ctx, d.x + 1, d.y + 1, d.r * 0.6, 'rgba(0,0,0,0.4)'); }
        for (const it of g.items) if (it.k === 'medal') drawItem(ctx, it);
        for (const e of g.en) if (!e.air) drawEnemy(ctx, e);
        if (g.boss && !g.boss.air) drawBoss(ctx);
        drawFx(ctx, true);
        drawShots(ctx);
        for (const e of g.en) if (e.air) drawEnemy(ctx, e);
        if (g.boss && g.boss.air) drawBoss(ctx);
        for (const it of g.items) if (it.k !== 'medal') drawItem(ctx, it);
        drawPlayer(ctx);
        drawFx(ctx, false);
        drawBombFx(ctx);
        for (const b of g.eb) ctx.drawImage(EB[(frame >> 2) & 1], Math.round(b.x) - 2, Math.round(b.y) - 2);
        for (const q of g.pops) otext(ctx, q.s, q.x, q.y, q.c, 1, 'center');
        hud(ctx);
        if (g.banner > 0 && g.phase === 'play') { otext(ctx, 'STAGE ' + g.stage, W / 2, 100, '#ffffff', 2, 'center'); if (g.banner < 120) otext(ctx, 'READY', W / 2, 124, '#ffe040', 1, 'center'); }
        if (g.warn > 0 && (frame >> 3) & 1) { ctx.fillStyle = 'rgba(160,0,0,0.5)'; ctx.fillRect(0, 96, W, 34); otext(ctx, 'WARNING!', W / 2, 106, '#ffffff', 2, 'center'); }
        if (g.phase === 'clear' && g.phaseT < 260) {
          ctx.fillStyle = 'rgba(0,0,40,0.6)'; ctx.fillRect(16, 92, W - 32, 60);
          otext(ctx, 'STAGE ' + g.stage + ' CLEAR', W / 2, 102, '#ffffff', 1, 'center');
          otext(ctx, 'BONUS ' + g.bonus, W / 2, 120, '#ffe040', 1, 'center');
          if (g.stage % 8 === 0) otext(ctx, 'MISSION COMPLETE', W / 2, 136, '#40ff80', 1, 'center');
        }
        if (g.phase === 'over') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(30, 110, W - 60, 30); otext(ctx, 'GAME OVER', W / 2, 118, '#ff4040', 2, 'center'); }
        if (mode === 'demo') { otext(ctx, 'DEMO PLAY', W / 2, 60, '#ffe040', 1, 'center'); if ((frame >> 5) & 1) otext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 200, '#ffffff', 1, 'center'); }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,20,0.5)'; ctx.fillRect(0, 0, W, H);
        hud(ctx);
        const ly = 44;
        text(ctx, 'RAIDEN', W / 2 + 3, ly + 3, '#000830', 5, 'center');
        for (const [a, b, c] of [[0, 10, '#ffe0a0'], [10, 20, '#ff8030'], [20, 35, '#ff2a10']]) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'RAIDEN', W / 2, ly, c, 5, 'center'); ctx.restore(); }
        ctx.fillStyle = '#40a0ff'; ctx.fillRect(28, ly + 40, W - 56, 2);
        ctx.drawImage(PLAYER[0], W / 2 - 7, 100 + Math.round(Math.sin(frame * 0.05) * 2));
        const page = (titleT / 300 | 0) % 2;
        if (page === 0) {
          text(ctx, 'SUPREME FIGHTING THUNDERBOLT', W / 2, 126, '#a0c8ff', 1, 'center');
          text(ctx, 'EXTEND 200000 500000 1000000', W / 2, 142, '#ffe040', 1, 'center');
          text(ctx, 'SPACE: SHOT   X: BOMB', W / 2, 158, '#ffffff', 1, 'center');
        } else {
          const rows = [['#ff2020', 'RED', 'VULCAN SPREAD'], ['#2070ff', 'BLUE', 'LASER BEAM'], ['#ff8020', 'M', 'NUCLEAR MISSILE'], ['#20c040', 'H', 'HOMING MISSILE'], ['#ffe040', 'B', 'BOMB']];
          rows.forEach((r, i) => { const y = 124 + i * 11; ctx.fillStyle = r[0]; ctx.fillRect(36, y, 10, 8); text(ctx, r[2], 54, y + 1, '#ffffff'); });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 192, '#ff4040', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 192, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1990 SEIBU KAIHATSU', W / 2, 220, '#c0c0c0', 1, 'center');
        text(ctx, cred(api), W - 4, H - 10, '#ffffff', 1, 'right');
      }
      return { update, render, destroy() { } };
    }
  });
})();
