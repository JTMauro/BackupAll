// Frenzy (Stern, 1982) \u2014 written from scratch for the MAME32 Game Room.
// Berzerk's sequel: shootable dotted walls, reflecting walls, robots, the bouncing Otto and special rooms.
(function () {
  'use strict';
  // ---------- compact 5x7 bitmap font ----------
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  // ---------- run-length pixel sprites ----------
  function makeSpr(rows, pal) {
    const runs = []; let w = 0;
    rows.forEach((r, y) => {
      w = Math.max(w, r.length);
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (!pal[ch]) { x++; continue; }
        let e = x + 1; while (e < r.length && r[e] === ch) e++;
        runs.push({ x, y, n: e - x, c: pal[ch], k: ch }); x = e;
      }
    });
    return { w, h: rows.length, runs };
  }
  function drawSpr(ctx, s, cx, cy, o) {
    o = o || {};
    const x0 = Math.round(cx - s.w / 2), y0 = Math.round(cy - s.h / 2);
    const sx = o.sx || 0, sy = o.sy || 0;
    for (const r of s.runs) {
      ctx.fillStyle = o.col || (o.pal && o.pal[r.k]) || r.c;
      const xx = o.flip ? s.w - r.x - r.n : r.x;
      const d = r.y - s.h / 2;
      ctx.fillRect(x0 + xx + Math.round(d * sx), y0 + r.y + Math.round(d * sy), r.n, 1);
    }
  }
  FONT['$'] = [4, 15, 20, 14, 5, 30, 4]; FONT['%'] = [25, 25, 2, 4, 8, 19, 19]; FONT['#'] = [10, 31, 10, 10, 31, 10, 0];
  FONT['&'] = [12, 18, 20, 8, 21, 18, 13]; FONT['"'] = [10, 10, 0, 0, 0, 0, 0];
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0, clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = a => a[(Math.random() * a.length) | 0];
  const CYC = ['#ff2020', '#ff9000', '#ffff00', '#20ff20', '#20ffff', '#2060ff', '#d040ff', '#ffffff'];

  // ---------- geometry ----------
  const W = 256, H = 224;
  const MX = 6, MY = 16, TS = 4, GC = 61, GR = 46, CWT = 12, CHT = 15;
  const MX1 = MX + GC * TS, MY1 = MY + GR * TS; // 250, 200
  const EMPTY = 0, SOLID = 1, DOTS = 2, MIRROR = 3;
  const cellCX = cx => MX + (cx * CWT + 6) * TS + 2;
  const cellCY = cy => MY + (cy * CHT + 7.5) * TS + 2;
  const OPP = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

  // ---------- art ----------
  const PP = { G: '#30ff30', Y: '#ffd200' };
  const HERO = [
    makeSpr(['..G..', '.GGG.', '..G..', 'GGGGG', 'G.G.G', 'G.G.G', '..G..', '.G.G.', '.G.G.', '.G.G.', 'GG.GG'], PP),
    makeSpr(['..G..', '.GGG.', '..G..', '.GGG.', 'G.G.G', '..G.G', '..G..', '.G.G.', 'G...G', 'G...G', 'G...G'], PP),
    makeSpr(['..G..', '.GGG.', '..G..', '.GGGG', '.GG..', '..G..', '..G..', '.G.G.', '.G.G.', '.G.G.', 'GG.GG'], PP)
  ];
  const ROBO = [
    makeSpr(['..XXXX..', '.XXXXXX.', 'XX.EE.XX', '.XXXXXX.', '..X..X..', 'XXXXXXXX', 'X.XXXX.X', 'X.XXXX.X', '..XXXX..', '..X..X..', '.XX..XX.'], { X: '#fff', E: '#fff' }),
    makeSpr(['..XXXX..', '.XXXXXX.', 'XXE..EXX', '.XXXXXX.', '..X..X..', 'XXXXXXXX', 'X.XXXX.X', 'X.XXXX.X', '..XXXX..', '.X....X.', 'XX....XX'], { X: '#fff', E: '#fff' })
  ];
  const OTTO = makeSpr(['..YYYYY..', '.YYYYYYY.', 'YY.YYY.YY', 'YY.YYY.YY', 'YYYYYYYYY', 'YY.YYY.YY', 'YYY...YYY', '.YYYYYYY.', '..YYYYY..'], { Y: '#ffd200' });
  const LEVELS = [
    { col: '#d8d800', shots: 0, sp: 0.22, fire: 9999, bs: 1.2 },
    { col: '#ff4040', shots: 1, sp: 0.26, fire: 110, bs: 1.4 },
    { col: '#40a0ff', shots: 2, sp: 0.3, fire: 95, bs: 1.5 },
    { col: '#40ff60', shots: 3, sp: 0.33, fire: 80, bs: 1.7 },
    { col: '#ff50ff', shots: 4, sp: 0.36, fire: 70, bs: 1.85 },
    { col: '#ffffff', shots: 5, sp: 0.4, fire: 60, bs: 2.0 },
    { col: '#ff9020', shots: 6, sp: 0.44, fire: 50, bs: 2.2 }
  ];
  const SPECIALS = ['power', 'computer', 'bigrobot', 'factory'];
  const SPEECH = {
    enter: ['INTRUDER ALERT! INTRUDER ALERT!', 'HUMANOID DETECTED IN SECTOR', 'LOCATE AND ERASE THE HUMANOID', 'ALL UNITS: SEEK AND DESTROY'],
    otto: ['BOUNCER UNIT RELEASED', 'DEPLOY THE BOUNCER', 'YOU CANNOT HIDE, HUMANOID'],
    coward: ['RETREAT LOGGED. COWARD!', 'THE HUMANOID FLEES. PURSUE!'],
    clear: ['UNIT LOSSES CRITICAL', 'SECTOR LOST. RECALCULATING'],
    die: ['INTRUDER NEUTRALIZED', 'HUMANOID OFFLINE. HA HA HA'],
    power: ['WARNING: POWER CORE EXPOSED'], powerdown: ['POWER FAILURE! POWER FAILURE!'],
    computer: ['CENTRAL COMPUTER ONLINE'], crash: ['SYSTEM ERROR. REBOOTING...'],
    bigrobot: ['I AM THE MASTER UNIT. KNEEL!'], bigdown: ['MASTER UNIT... OFFLINE'],
    factory: ['PRODUCTION LINE ONLINE'], halt: ['PRODUCTION HALTED']
  };

  ArcadeRegistry.register({
    id: 'frenzy', title: 'Frenzy', year: 1982, maker: 'Stern',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire facing (hold Space + arrow to aim) \u00b7 WASD: fire \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#30ff30', accent: '#ff3030' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;
      const grid = new Uint8Array(GC * GR), orient = new Uint8Array(GC * GR);

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');

      const snd = {
        shot() { au.tone(1400, 0.07, { type: 'square', vol: 0.06, slideTo: 500 }); },
        rshot() { au.tone(600, 0.06, { type: 'square', vol: 0.04, slideTo: 300 }); },
        boom() { au.noise(0.25, { vol: 0.13, freq: 2600, slideTo: 200 }); },
        crunch() { au.noise(0.05, { vol: 0.07, freq: 5000, slideTo: 1500 }); },
        ping() { au.tone(2400, 0.05, { type: 'triangle', vol: 0.08, slideTo: 3200 }); },
        otto() { au.tone(180, 0.07, { type: 'square', vol: 0.05, slideTo: 360 }); },
        die() { au.tone(80, 1.2, { type: 'sawtooth', vol: 0.12, slideTo: 900 }); au.noise(1.0, { vol: 0.1, freq: 6000, slideTo: 400 }); },
        big() { au.noise(0.8, { vol: 0.18, freq: 1800, slideTo: 80 }); au.tone(300, 0.8, { type: 'sawtooth', vol: 0.08, slideTo: 40 }); },
        hit() { au.tone(220, 0.05, { type: 'square', vol: 0.07 }); },
        beep() { au.tone(1600 + rnd(800), 0.04, { type: 'square', vol: 0.04 }); },
        life() { au.melody([[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.2]], { type: 'square', vol: 0.1 }); }
      };
      // robot "speech": a gravelly sawtooth burble, one blip per syllable, shown as text
      function speak(key, force) {
        if (!g) return;
        if (g.speech && g.speech.t > 60 && !force) return;
        const txt = pick(SPEECH[key]);
        g.speech = { txt, t: 200 };
        let t = 0;
        const words = txt.split(' ');
        for (const w of words) {
          const syl = Math.max(1, Math.round(w.replace(/[^A-Z]/g, '').length / 2.5));
          for (let i = 0; i < syl; i++) {
            const f = 95 + rnd(70) + (i === syl - 1 ? -15 : 10);
            au.tone(f, 0.1, { type: 'sawtooth', vol: 0.08, slideTo: f * (0.75 + rnd(0.4)), delay: t });
            au.noise(0.03, { vol: 0.03, freq: 2500, delay: t });
            t += 0.105;
          }
          t += 0.06;
        }
      }

      // ---------- maze ----------
      function setT(c, r, t, o) {
        if (c < 0 || r < 0 || c >= GC || r >= GR) return;
        const i = r * GC + c; grid[i] = t; if (t) orient[i] |= o; else orient[i] = 0;
      }
      function hseg(c0, c1, r, t) { for (let c = c0; c <= c1; c++) setT(c, r, t, 1); }
      function vseg(c, r0, r1, t) { for (let r = r0; r <= r1; r++) setT(c, r, t, 2); }
      function tileIdx(px, py) {
        const c = Math.floor((px - MX) / TS), r = Math.floor((py - MY) / TS);
        if (c < 0 || r < 0 || c >= GC || r >= GR) return -1;
        return r * GC + c;
      }
      function tileAt(px, py) { const i = tileIdx(px, py); return i < 0 ? 0 : grid[i]; }
      function rectWall(x0, y0, x1, y1) {
        const c0 = Math.floor((x0 - MX) / TS), c1 = Math.floor((x1 - MX) / TS);
        const r0 = Math.floor((y0 - MY) / TS), r1 = Math.floor((y1 - MY) / TS);
        for (let r = r0; r <= r1; r++) {
          if (r < 0 || r >= GR) continue;
          for (let c = c0; c <= c1; c++) { if (c < 0 || c >= GC) continue; if (grid[r * GC + c]) return true; }
        }
        return false;
      }
      function connected(segs) {
        const adj = [];
        for (let i = 0; i < 15; i++) adj.push([]);
        const blocked = new Set();
        for (const s of segs) if (s.t !== DOTS) blocked.add(Math.min(s.a, s.b) + ',' + Math.max(s.a, s.b));
        for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 5; cx++) {
          const i = cy * 5 + cx;
          if (cx < 4 && !blocked.has(i + ',' + (i + 1))) { adj[i].push(i + 1); adj[i + 1].push(i); }
          if (cy < 2 && !blocked.has(i + ',' + (i + 5))) { adj[i].push(i + 5); adj[i + 5].push(i); }
        }
        const seen = new Set([0]), q = [0];
        while (q.length) { const n = q.shift(); for (const m of adj[n]) if (!seen.has(m)) { seen.add(m); q.push(m); } }
        return seen.size === 15;
      }
      function buildRoom(entry, special) {
        grid.fill(0); orient.fill(0);
        const typ = () => { const v = Math.random(); return v < 0.5 ? DOTS : v < 0.78 ? SOLID : MIRROR; };
        // interior pillar walls
        const segs = [];
        for (let k = 1; k <= 4; k++) for (let j = 1; j <= 2; j++) {
          const d = irnd(4), t = typ();
          if (d === 0) segs.push({ h: true, c0: k * CWT, c1: k * CWT + CWT, r: j * CHT, t, a: (j - 1) * 5 + k, b: j * 5 + k });
          else if (d === 1) segs.push({ h: true, c0: k * CWT - CWT, c1: k * CWT, r: j * CHT, t, a: (j - 1) * 5 + k - 1, b: j * 5 + k - 1 });
          else if (d === 2) segs.push({ h: false, c: k * CWT, r0: j * CHT - CHT, r1: j * CHT, t, a: (j - 1) * 5 + k - 1, b: (j - 1) * 5 + k });
          else segs.push({ h: false, c: k * CWT, r0: j * CHT, r1: j * CHT + CHT, t, a: j * 5 + k - 1, b: j * 5 + k });
        }
        // a couple of extra free-standing dotted screens
        for (let n = 0; n < 2; n++) {
          const k = 1 + irnd(4), j = irnd(3);
          segs.push({ h: false, c: k * CWT, r0: j * CHT + 4, r1: j * CHT + 11, t: DOTS, a: -1, b: -1 });
        }
        for (const s of segs) if (s.t !== DOTS && s.a >= 0 && !connected(segs)) s.t = DOTS;
        if (!connected(segs)) for (const s of segs) s.t = DOTS;
        for (const s of segs) { if (s.h) hseg(s.c0, s.c1, s.r, s.t); else vseg(s.c, s.r0, s.r1, s.t); }
        if (special) {
          hseg(24, 36, CHT, DOTS); hseg(24, 36, 2 * CHT, DOTS); vseg(24, CHT, 2 * CHT, DOTS); vseg(36, CHT, 2 * CHT, DOTS);
        }
        // border, with the door you came in sealed
        const bt = () => (Math.random() < 0.22 ? MIRROR : SOLID);
        for (let cx = 0; cx < 5; cx++) {
          const c0 = cx * CWT, c1 = Math.min(GC - 1, cx * CWT + CWT);
          const tt = bt(), tb = bt();
          for (let c = c0; c <= c1; c++) {
            const door = cx === 2 && c > 24 && c < 36;
            if (!door || entry === 'top') setT(c, 0, door ? SOLID : tt, 1);
            if (!door || entry === 'bottom') setT(c, GR - 1, door ? SOLID : tb, 1);
          }
        }
        for (let cy = 0; cy < 3; cy++) {
          const r0 = cy * CHT, r1 = Math.min(GR - 1, cy * CHT + CHT);
          const tl = bt(), tr = bt();
          for (let r = r0; r <= r1; r++) {
            const door = cy === 1 && r > 15 && r < 30;
            if (!door || entry === 'left') setT(0, r, door ? SOLID : tl, 2);
            if (!door || entry === 'right') setT(GC - 1, r, door ? SOLID : tr, 2);
          }
        }
        g.sealed = entry;
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, nextLife: 5000, rooms: 0, phase: 'enter', phaseT: 50, speech: null, fx: [], parts: [], pops: [] };
        enterRoom('left');
      }
      function level() { return LEVELS[Math.min(LEVELS.length - 1, Math.floor(g.rooms / 2))]; }
      function enterRoom(entry) {
        g.rooms++;
        const sp = g.rooms % 3 === 0 ? SPECIALS[Math.floor(g.rooms / 3 - 1) % SPECIALS.length] : null;
        buildRoom(entry, sp);
        g.entry = entry; g.special = null;
        const ent = { left: [MX + 9, cellCY(1)], right: [MX1 - 9, cellCY(1)], top: [cellCX(2), MY + 12], bottom: [cellCX(2), MY1 - 12] }[entry];
        g.p = { x: ent[0], y: ent[1], fx: entry === 'right' ? -1 : entry === 'left' ? 1 : 0, fy: entry === 'top' ? 1 : entry === 'bottom' ? -1 : 0, walk: 0, fireT: 0, pose: 0 };
        g.pshots = []; g.rshots = []; g.robots = []; g.otto = null; g.jam = false;
        g.fx = []; g.parts = []; g.pops = [];
        const entryCell = { left: 5, right: 9, top: 2, bottom: 12 }[entry];
        const lv = level();
        const n = Math.min(11, 4 + Math.floor(g.rooms / 2) + irnd(3));
        const cells = [];
        for (let i = 0; i < 15; i++) if (i !== entryCell && !(sp && i === 7)) cells.push(i);
        for (let i = 0; i < n; i++) {
          const ci = cells[irnd(cells.length)];
          const cx = ci % 5, cy = (ci / 5) | 0;
          let x = cellCX(cx) + rnd(24) - 12, y = cellCY(cy) + rnd(26) - 13;
          if (rectWall(x - 6, y - 7, x + 6, y + 7)) { x = cellCX(cx); y = cellCY(cy); }
          g.robots.push(mkRobot(x, y, lv));
        }
        g.startCount = g.robots.length; g.bonusDone = false; g.roomT = 0;
        g.ottoT = Math.max(420, 1100 - g.rooms * 35);
        if (sp) {
          const o = { type: sp, x: cellCX(2), y: cellCY(1), hp: 0, t: 0, dead: false, hw: 10, hh: 10, open: false };
          if (sp === 'power') { o.hp = 4; o.hw = 9; o.hh = 12; }
          if (sp === 'computer') { o.hp = 8; o.hw = 14; o.hh = 9; }
          if (sp === 'bigrobot') { o.hp = 7; o.hw = 15; o.hh = 17; }
          if (sp === 'factory') { o.hp = 6; o.hw = 12; o.hh = 10; o.spawnT = 200; }
          g.special = o;
        }
        g.phase = 'enter'; g.phaseT = 50;
        speak(sp || 'enter', true);
      }
      function mkRobot(x, y, lv) {
        return { x, y, hw: 4, hh: 5, vx: 0, vy: 0, mt: 20 + irnd(60), fireT: 40 + irnd(lv.fire), anim: 0, lv, dead: false };
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 10000; snd.life(); }
        if (g.score > hi) hi = g.score;
      }
      function burst(x, y, col, n) {
        for (let i = 0; i < n; i++) { const a = rnd(6.283), s = 0.3 + rnd(1.6); g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + irnd(25), col }); }
      }
      function killRobot(r, pts) {
        if (r.dead) return;
        r.dead = true; snd.boom(); burst(r.x, r.y, r.lv.col, 14);
        g.fx.push({ x: r.x, y: r.y, t: 0, col: r.lv.col });
        if (pts) { addScore(pts); g.pops.push({ x: r.x, y: r.y - 8, txt: String(pts), t: 40 }); }
      }
      function playerDie() {
        if (g.phase !== 'play') return;
        g.phase = 'dead'; g.phaseT = 110; snd.die(); speak('die', true);
      }
      function hitPlayer(x, y) { const p = g.p; return Math.abs(x - p.x) <= 3 && Math.abs(y - p.y) <= 6; }
      // bullets: step a pixel at a time; erode dots, bounce on mirrors, stop on solid
      function stepBullet(s) {
        const nx = s.x + s.ux, ny = s.y + s.uy;
        const i = tileIdx(nx, ny);
        if (i >= 0 && grid[i]) {
          const t = grid[i];
          if (t === DOTS) {
            const c = i % GC, r = (i / GC) | 0;
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
              const cc = c + dc, rr = r + dr;
              if (cc <= 0 || rr <= 0 || cc >= GC - 1 || rr >= GR - 1) continue;
              const j = rr * GC + cc; if (grid[j] === DOTS) { grid[j] = 0; orient[j] = 0; }
            }
            burst(nx, ny, '#4060ff', 4); snd.crunch(); return false;
          }
          if (t === MIRROR && s.bounces < 4) {
            const o = orient[i];
            if (o === 1) s.uy = -s.uy; else if (o === 2) s.ux = -s.ux; else { s.ux = -s.ux; s.uy = -s.uy; }
            if (!s.ux && !s.uy) return false;
            s.bounces++; s.bounced = true; snd.ping(); return true;
          }
          return false;
        }
        s.x = nx; s.y = ny;
        if (nx < MX - 4 || nx > MX1 + 4 || ny < MY - 4 || ny > MY1 + 4) return false;
        return true;
      }
      function specHit(x, y) {
        const o = g.special; if (!o || o.dead) return false;
        return Math.abs(x - o.x) <= o.hw && Math.abs(y - o.y) <= o.hh;
      }
      function damageSpecial(x, y) {
        const o = g.special;
        if (o.type === 'bigrobot') {
          const inMouth = o.open && Math.abs(x - o.x) <= 7 && y > o.y + 2;
          if (!inMouth) { burst(x, y, '#ffffff', 3); snd.hit(); return; }
        }
        o.hp--; o.t2 = 8; snd.hit(); burst(x, y, '#ffd200', 6);
        if (o.type === 'computer') { addScore(50); g.pops.push({ x: o.x, y: o.y - 14, txt: '50', t: 30 }); }
        if (o.hp > 0) return;
        o.dead = true; snd.big(); burst(o.x, o.y, '#ffd200', 40); burst(o.x, o.y, '#ff4040', 30); g.flash = 20;
        if (o.type === 'power') {
          addScore(1000); g.pops.push({ x: o.x, y: o.y, txt: '1000', t: 80 });
          for (const r of g.robots) killRobot(r, 50);
          speak('powerdown', true);
        } else if (o.type === 'computer') {
          addScore(1000); g.pops.push({ x: o.x, y: o.y, txt: '1000', t: 80 }); g.jam = true; g.rshots = []; speak('crash', true);
        } else if (o.type === 'bigrobot') {
          addScore(5000); g.pops.push({ x: o.x, y: o.y, txt: '5000', t: 80 }); speak('bigdown', true);
        } else {
          addScore(1500); g.pops.push({ x: o.x, y: o.y, txt: '1500', t: 80 }); speak('halt', true);
        }
      }
      function updPlayer() {
        const p = g.p;
        const ax = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const ay = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        let fx = (api.key('KeyD') ? 1 : 0) - (api.key('KeyA') ? 1 : 0);
        let fy = (api.key('KeyS') ? 1 : 0) - (api.key('KeyW') ? 1 : 0);
        let move = true;
        if (api.key('Space')) {
          move = false;
          if (!fx && !fy) { if (ax || ay) { fx = ax; fy = ay; } else if (api.pressed('Space')) { fx = p.fx; fy = p.fy; } }
        }
        if (p.fireT > 0) p.fireT--;
        p.pose = 0;
        if ((fx || fy)) {
          p.pose = 2; p.fx = fx; p.fy = fy;
          if (p.fireT <= 0 && g.pshots.length < 2) {
            const k = fx && fy ? 0.7071 : 1;
            g.pshots.push({ x: p.x + fx * 3, y: p.y - 2 + fy * 4, ux: fx * k, uy: fy * k, bounces: 0, bounced: false, sp: 3.2 });
            p.fireT = 12; snd.shot();
          }
          move = move && !api.key('KeyW') && !api.key('KeyA') && !api.key('KeyS') && !api.key('KeyD') ? move : false;
        }
        if (move && (ax || ay)) {
          const sp = 0.85;
          const blocked = (x, y) => rectWall(x - 2, y - 5, x + 2, y + 5) || (g.special && !g.special.dead && Math.abs(x - g.special.x) < g.special.hw + 3 && Math.abs(y - g.special.y) < g.special.hh + 6);
          if (ax && !blocked(p.x + ax * sp, p.y)) p.x += ax * sp;
          if (ay && !blocked(p.x, p.y + ay * sp)) p.y += ay * sp;
          p.fx = ax; p.fy = ay; p.walk++; p.pose = (p.walk >> 3) & 1;
        }
        // leaving the room
        let exit = null;
        if (p.x < MX - 2) exit = 'left'; else if (p.x > MX1 + 2) exit = 'right';
        else if (p.y < MY - 4) exit = 'top'; else if (p.y > MY1 + 4) exit = 'bottom';
        if (exit) {
          if (g.robots.some(r => !r.dead)) speak('coward', true);
          g.phase = 'exit'; g.phaseT = 40; g.exitDir = exit; g.pshots = []; g.rshots = [];
        }
      }
      function updRobots() {
        const p = g.p, lv = level();
        let liveShots = g.rshots.length;
        for (const r of g.robots) {
          if (r.dead) continue;
          r.anim++;
          if (--r.mt <= 0) {
            r.mt = 30 + irnd(70);
            const dx = p.x - r.x, dy = p.y - r.y;
            r.vx = 0; r.vy = 0;
            if (Math.random() < 0.15) { /* pause */ } else if (Math.abs(dx) > Math.abs(dy) * (0.5 + rnd(1))) r.vx = Math.sign(dx);
            else r.vy = Math.sign(dy);
            if (Math.random() < 0.3 && Math.abs(dx) > 6 && Math.abs(dy) > 6) { r.vx = Math.sign(dx); r.vy = Math.sign(dy); }
          }
          const sp = r.lv.sp * (g.otto ? 1.25 : 1);
          const nx = r.x + r.vx * sp, ny = r.y + r.vy * sp;
          if (rectWall(nx - 4, ny - 5, nx + 4, ny + 5)) {
            // smarter robots usually stop before a wall; the dim ones walk straight into it
            if (Math.random() < 0.65 + g.rooms * 0.02) { r.vx = 0; r.vy = 0; r.mt = Math.min(r.mt, 10); }
            else { r.x = nx; r.y = ny; killRobot(r, 50); continue; }
          } else { r.x = nx; r.y = ny; }
          if (Math.abs(r.x - p.x) < 7 && Math.abs(r.y - p.y) < 10) { playerDie(); killRobot(r, 0); }
          // shooting
          if (g.jam || r.lv.shots === 0) continue;
          if (--r.fireT <= 0) {
            r.fireT = r.lv.fire + irnd(40);
            if (liveShots >= r.lv.shots) continue;
            const dx = p.x - r.x, dy = p.y - r.y;
            let ux = 0, uy = 0;
            if (Math.abs(dy) < 8) ux = Math.sign(dx);
            else if (Math.abs(dx) < 6) uy = Math.sign(dy);
            else if (Math.abs(Math.abs(dx) - Math.abs(dy)) < 12) { ux = Math.sign(dx) * 0.7071; uy = Math.sign(dy) * 0.7071; }
            else if (Math.random() < 0.25) { if (Math.abs(dx) > Math.abs(dy)) ux = Math.sign(dx); else uy = Math.sign(dy); }
            if (ux || uy) { liveShots++; g.rshots.push({ x: r.x + ux * 6, y: r.y - 2 + uy * 7, ux, uy, bounces: 0, sp: r.lv.bs, own: r }); snd.rshot(); }
          }
        }
        // robots collide with each other
        for (let i = 0; i < g.robots.length; i++) {
          const a = g.robots[i]; if (a.dead) continue;
          for (let j = i + 1; j < g.robots.length; j++) {
            const b = g.robots[j]; if (b.dead) continue;
            if (Math.abs(a.x - b.x) < 6 && Math.abs(a.y - b.y) < 8) { killRobot(a, 50); killRobot(b, 50); }
          }
        }
        g.robots = g.robots.filter(r => !r.dead);
      }
      function updShots() {
        for (const s of g.pshots) {
          for (let k = 0; k < Math.round(s.sp * 2) && !s.dead; k++) {
            const ok = stepBullet(s);
            if (!ok) { s.dead = true; break; }
            if (s.bounced && hitPlayer(s.x, s.y)) { s.dead = true; playerDie(); break; }
            for (const r of g.robots) if (!r.dead && Math.abs(s.x - r.x) <= 4 && Math.abs(s.y - r.y) <= 6) { killRobot(r, 50); s.dead = true; break; }
            if (s.dead) break;
            if (specHit(s.x, s.y)) { damageSpecial(s.x, s.y); s.dead = true; break; }
            if (g.otto && Math.abs(s.x - g.otto.x) < 5 && Math.abs(s.y - (g.otto.y - g.otto.b)) < 5) { s.dead = true; snd.otto(); }
          }
        }
        g.pshots = g.pshots.filter(s => !s.dead);
        for (const s of g.rshots) {
          for (let k = 0; k < Math.round(s.sp * 2) && !s.dead; k++) {
            if (!stepBullet(s)) { s.dead = true; break; }
            if (hitPlayer(s.x, s.y)) { s.dead = true; playerDie(); break; }
            for (const r of g.robots) if (!r.dead && r !== s.own && Math.abs(s.x - r.x) <= 4 && Math.abs(s.y - r.y) <= 6) { killRobot(r, 50); s.dead = true; break; }
            if (s.dead) break;
            if (!s.boss && specHit(s.x, s.y)) { s.dead = true; break; }
          }
        }
        g.rshots = g.rshots.filter(s => !s.dead);
        // player bullets cancel robot bullets
        for (const a of g.pshots) for (const b of g.rshots) if (!b.dead && Math.abs(a.x - b.x) < 3 && Math.abs(a.y - b.y) < 3) { a.dead = b.dead = true; burst(a.x, a.y, '#fff', 4); }
        g.pshots = g.pshots.filter(s => !s.dead); g.rshots = g.rshots.filter(s => !s.dead);
      }
      function updSpecial() {
        const o = g.special; if (!o || o.dead) return;
        o.t++; if (o.t2 > 0) o.t2--;
        if (o.type === 'bigrobot') {
          const cyc = o.t % 150;
          o.open = cyc > 90;
          if (o.open && cyc % 18 === 0) {
            const dx = g.p.x - o.x, dy = g.p.y - (o.y + 8), d = Math.hypot(dx, dy) || 1;
            g.rshots.push({ x: o.x, y: o.y + 12, ux: dx / d, uy: dy / d, bounces: 0, sp: 1.3, boss: true, big: true });
            au.tone(140, 0.12, { type: 'sawtooth', vol: 0.07, slideTo: 70 });
          }
        } else if (o.type === 'factory') {
          if (--o.spawnT <= 0) {
            o.spawnT = Math.max(150, 260 - g.rooms * 5);
            if (g.robots.length < 10) {
              const spots = [[cellCX(1), cellCY(1)], [cellCX(3), cellCY(1)], [cellCX(2), cellCY(0)], [cellCX(2), cellCY(2)]];
              const s = pick(spots);
              if (!rectWall(s[0] - 6, s[1] - 7, s[0] + 6, s[1] + 7) && Math.hypot(s[0] - g.p.x, s[1] - g.p.y) > 30) {
                const r = mkRobot(s[0], s[1], level()); r.spawn = 30; g.robots.push(r);
                au.tone(300, 0.3, { type: 'square', vol: 0.06, slideTo: 1200 });
              }
            }
          }
        } else if (o.type === 'computer') { if (o.t % 9 === 0 && Math.random() < 0.3) snd.beep(); }
      }
      function updOtto() {
        g.roomT++;
        if (!g.otto) {
          if (g.roomT === g.ottoT - 100) speak('otto', true);
          if (g.roomT >= g.ottoT) {
            const ent = { left: [MX + 4, cellCY(1)], right: [MX1 - 4, cellCY(1)], top: [cellCX(2), MY + 6], bottom: [cellCX(2), MY1 - 6] }[g.entry];
            g.otto = { x: ent[0], y: ent[1], b: 0, t: 0 };
          }
          return;
        }
        const o = g.otto, p = g.p; o.t++;
        const sp = Math.min(0.95, (g.robots.length ? 0.5 : 0.8) + g.rooms * 0.015);
        const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
        o.x += dx / d * sp; o.y += dy / d * sp;
        o.b = Math.abs(Math.sin(o.t * 0.12)) * 10;
        if (o.b < 0.8 && o.t % 26 < 2) snd.otto();
        if (Math.abs(o.x - p.x) < 6 && Math.abs(o.y - o.b - p.y) < 9) playerDie();
        for (const r of g.robots) if (!r.dead && Math.abs(o.x - r.x) < 6 && Math.abs(o.y - o.b - r.y) < 8) killRobot(r, 0);
      }
      function updPlay() {
        updPlayer(); if (g.phase !== 'play') return;
        for (const r of g.robots) if (r.spawn > 0) r.spawn--;
        updRobots(); updShots(); updSpecial(); updOtto();
        g.robots = g.robots.filter(r => !r.dead);
        if (!g.bonusDone && g.robots.length === 0 && !(g.special && g.special.type === 'factory' && !g.special.dead)) {
          g.bonusDone = true;
          const b = g.startCount * 10;
          addScore(b); g.pops.push({ x: W / 2, y: MY + 24, txt: 'BONUS ' + b, t: 120 });
          speak('clear', true);
        }
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 360;
        au.melody([[330, 0.2], [311, 0.2], [294, 0.2], [262, 0.6]], { type: 'sawtooth', vol: 0.08 });
      }
      function lastLife(onCont) {
        g.phase = 'wait';
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) onCont(); }, () => { if (g === cg) gameOver(); });
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (g.speech && --g.speech.t <= 0) g.speech = null;
        if (g.flash > 0) g.flash--;
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 24);
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.vx *= 0.96; q.vy *= 0.96; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.2; }
        g.pops = g.pops.filter(q => q.t > 0);
        switch (g.phase) {
          case 'enter': if (--g.phaseT <= 0) g.phase = 'play'; break;
          case 'play': updPlay(); break;
          case 'exit': if (--g.phaseT <= 0) enterRoom(OPP[g.exitDir]); break;
          case 'dead':
            if (--g.phaseT <= 0) {
              g.lives--;
              if (g.lives > 0) enterRoom(pick(['left', 'right', 'top', 'bottom']));
              else lastLife(() => { g.lives = 3; enterRoom('left'); });
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 280 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawWalls(ctx) {
        const pulse = (frame >> 3) & 1;
        for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
          const t = grid[r * GC + c]; if (!t) continue;
          const x = MX + c * TS, y = MY + r * TS;
          if (t === SOLID) { ctx.fillStyle = '#2040e0'; ctx.fillRect(x, y, 4, 4); ctx.fillStyle = '#5070ff'; ctx.fillRect(x, y, 4, 1); }
          else if (t === DOTS) { ctx.fillStyle = '#3c64ff'; ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x + 1, y + 2, 1, 1); ctx.fillRect(x + 3, y + 2, 1, 1); }
          else { ctx.fillStyle = pulse ? '#ff60ff' : '#c030ff'; ctx.fillRect(x, y, 4, 4); ctx.fillStyle = '#ffffff'; if (orient[r * GC + c] & 1) ctx.fillRect(x, y + 1, 4, 1); else ctx.fillRect(x + 1, y, 1, 4); }
        }
      }
      function drawSpecial(ctx) {
        const o = g.special; if (!o) return;
        const x = Math.round(o.x), y = Math.round(o.y);
        if (o.dead) { // smoking ruin
          ctx.fillStyle = '#404040'; ctx.fillRect(x - 8, y + 4, 16, 4);
          if (frame % 6 < 3) { ctx.fillStyle = '#808080'; ctx.fillRect(x - 2 + ((frame >> 3) % 5), y - 2 - ((frame >> 2) % 10), 2, 2); }
          return;
        }
        const hitc = o.t2 > 0 && (frame & 2);
        if (o.type === 'power') {
          ctx.fillStyle = hitc ? '#fff' : '#606870'; ctx.fillRect(x - 9, y - 12, 18, 24);
          ctx.fillStyle = '#20ffff';
          for (let i = 0; i < 4; i++) { const yy = y - 10 + ((i * 6 + (frame >> 1)) % 22); ctx.fillRect(x - 7, yy, 14, 1); }
          ctx.fillStyle = CYC[(frame >> 2) & 7]; ctx.fillRect(x - 3, y - 3, 6, 6);
          ctx.fillStyle = '#ffff40';
          if (frame & 4) { ctx.fillRect(x - 13, y - 8 + (frame % 16), 3, 1); ctx.fillRect(x + 10, y + 6 - (frame % 14), 3, 1); }
          text(ctx, 'HV', x, y + 14, '#ff4040', 1, 'center');
        } else if (o.type === 'computer') {
          ctx.fillStyle = hitc ? '#fff' : '#808890'; ctx.fillRect(x - 14, y - 9, 28, 18);
          for (let i = 0; i < 12; i++) { ctx.fillStyle = ((i * 7 + (frame >> 3)) % 5 < 2) ? '#ff3030' : (i % 3 ? '#30ff30' : '#ffd200'); ctx.fillRect(x - 12 + (i % 6) * 4, y - 7 + ((i / 6) | 0) * 4, 2, 2); }
          ctx.fillStyle = '#000'; ctx.fillRect(x - 10, y + 2, 7, 5); ctx.fillRect(x + 3, y + 2, 7, 5);
          ctx.fillStyle = '#fff'; const sp = (frame >> 2) % 4; ctx.fillRect(x - 7 + (sp & 1), y + 4, 2, 1); ctx.fillRect(x + 6 - (sp & 1), y + 4, 2, 1);
        } else if (o.type === 'bigrobot') {
          ctx.fillStyle = hitc ? '#fff' : '#d0d0d0'; ctx.fillRect(x - 15, y - 17, 30, 34);
          ctx.fillStyle = '#909090'; ctx.fillRect(x - 15, y - 17, 30, 3); ctx.fillRect(x - 2, y - 22, 4, 5);
          ctx.fillStyle = CYC[(frame >> 3) & 7]; ctx.fillRect(x - 1, y - 24, 2, 2);
          ctx.fillStyle = o.open ? '#ff2020' : '#802020'; ctx.fillRect(x - 10, y - 9, 7, 5); ctx.fillRect(x + 3, y - 9, 7, 5);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 12, y + 3, 24, o.open ? 10 : 2);
          if (o.open) { ctx.fillStyle = '#ff9020'; ctx.fillRect(x - 6, y + 6, 12, 4); ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 11 + i * 4, y + 3, 2, 2); }
          ctx.fillStyle = '#909090'; ctx.fillRect(x - 18, y - 6, 3, 10); ctx.fillRect(x + 15, y - 6, 3, 10);
        } else {
          ctx.fillStyle = hitc ? '#fff' : '#a08040'; ctx.fillRect(x - 12, y - 10, 24, 20);
          ctx.fillStyle = '#302010'; ctx.fillRect(x - 10, y - 2, 20, 6);
          ctx.fillStyle = '#ffd200'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 10 + ((i * 5 + (frame >> 1)) % 20), y, 2, 2);
          ctx.fillStyle = (frame & 8) ? '#ff2020' : '#ff9020'; ctx.fillRect(x - 3, y - 8, 6, 4);
          ctx.fillStyle = '#606060'; ctx.fillRect(x - 12, y + 10, 4, 3); ctx.fillRect(x + 8, y + 10, 4, 3);
        }
      }
      function drawHUD(ctx) {
        text(ctx, String(g ? g.score : 0).padStart(6, '0'), 8, 4, '#30ff30', 1);
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2, 4, '#ffd200', 1, 'center');
        if (g) for (let i = 0; i < Math.min(6, g.lives - 1); i++) drawSpr(ctx, HERO[0], W - 10 - i * 8, 8, {});
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        drawHUD(ctx);
        const p = g.p;
        if (g.flash > 0 && (g.flash & 2)) { ctx.fillStyle = '#402040'; ctx.fillRect(MX, MY, MX1 - MX, MY1 - MY); }
        if (g.phase === 'exit') {
          const k = 1 - g.phaseT / 40;
          ctx.save(); ctx.beginPath(); ctx.rect(MX, MY, MX1 - MX, MY1 - MY); ctx.clip();
          const ox = g.exitDir === 'left' ? k * 240 : g.exitDir === 'right' ? -k * 240 : 0;
          const oy = g.exitDir === 'top' ? k * 184 : g.exitDir === 'bottom' ? -k * 184 : 0;
          ctx.translate(Math.round(ox), Math.round(oy)); drawWalls(ctx); drawSpecial(ctx); ctx.restore();
          drawSpr(ctx, HERO[(frame >> 3) & 1], clamp(p.x + ox, MX, MX1), clamp(p.y + oy, MY, MY1), { flip: p.fx < 0 });
        } else {
          drawWalls(ctx); drawSpecial(ctx);
          for (const r of g.robots) {
            if (r.spawn > 0) { ctx.fillStyle = CYC[frame & 7]; const s = Math.max(1, 10 - (r.spawn >> 2)); ctx.fillRect(r.x - s / 2, r.y - s / 2, s, s); continue; }
            const blink = g.phase === 'enter' && (frame & 4);
            drawSpr(ctx, ROBO[(r.anim >> 4) & 1], r.x, r.y, { col: blink ? '#ffffff' : (g.jam && (frame & 16) ? '#808080' : r.lv.col) });
          }
          for (const f of g.fx) {
            ctx.fillStyle = f.t & 2 ? '#ffffff' : f.col;
            const s = f.t >> 1;
            ctx.fillRect(f.x - s, f.y, 1, 1); ctx.fillRect(f.x + s, f.y, 1, 1); ctx.fillRect(f.x, f.y - s, 1, 1); ctx.fillRect(f.x, f.y + s, 1, 1);
            ctx.fillRect(f.x - s * 0.7, f.y - s * 0.7, 1, 1); ctx.fillRect(f.x + s * 0.7, f.y + s * 0.7, 1, 1); ctx.fillRect(f.x + s * 0.7, f.y - s * 0.7, 1, 1); ctx.fillRect(f.x - s * 0.7, f.y + s * 0.7, 1, 1);
          }
          for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
          if (g.otto) drawSpr(ctx, OTTO, g.otto.x, g.otto.y - g.otto.b, {});
          // player
          if (g.phase === 'dead') {
            const k = 110 - g.phaseT;
            drawSpr(ctx, HERO[0], p.x, p.y, { col: k < 60 ? CYC[frame & 7] : '#30ff30', sx: k > 60 ? (k - 60) * 0.1 * ((frame & 1) ? 1 : -1) : 0 });
            if (k < 60) for (let i = 0; i < 3; i++) { ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - 6 + rnd(12), p.y - 8 + rnd(16), 1, 1); }
          } else if (g.phase !== 'wait' && g.phase !== 'over') {
            if (!(g.phase === 'enter' && (frame & 4))) drawSpr(ctx, HERO[p.pose], p.x, p.y, { flip: p.fx < 0 });
          }
          ctx.fillStyle = '#ffffff';
          for (const s of g.pshots) for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(s.x - s.ux * i), Math.round(s.y - s.uy * i), 1, 1);
          for (const s of g.rshots) {
            ctx.fillStyle = s.big ? CYC[frame & 7] : (frame & 2 ? '#ff4040' : '#ffff40');
            if (s.big) ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3);
            else for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(s.x - s.ux * i), Math.round(s.y - s.uy * i), 1, 1);
          }
        }
        for (const q of g.pops) text(ctx, q.txt, q.x, q.y, (frame & 4) ? '#ffffff' : '#ffd200', 1, 'center');
        // bottom: robot voice and room counter
        if (g.speech) {
          const n = Math.min(g.speech.txt.length, Math.floor((200 - g.speech.t) / 2));
          text(ctx, g.speech.txt.slice(0, n), W / 2, 205, (frame & 8) ? '#30ff30' : '#20c020', 1, 'center');
        }
        const rm = g.special && !g.special.dead ? { power: 'POWER PLANT', computer: 'COMPUTER ROOM', bigrobot: 'MASTER UNIT', factory: 'ROBOT FACTORY' }[g.special.type] : 'SECTOR';
        text(ctx, rm + ' ' + g.rooms, 8, 215, '#4060ff', 1);
        text(ctx, credStr(), W - 8, 215, '#606060', 1, 'right');
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 58, 98, 116, 24);
          text(ctx, 'GAME OVER', W / 2, 104, '#ff3030', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        const page = Math.floor(titleT / 420) % 3;
        drawHUD(ctx);
        ctx.fillStyle = '#2040e0';
        ctx.fillRect(MX, MY, MX1 - MX, 2); ctx.fillRect(MX, MY1 - 2, MX1 - MX, 2); ctx.fillRect(MX, MY, 2, MY1 - MY); ctx.fillRect(MX1 - 2, MY, 2, MY1 - MY);
        if (page === 0) {
          const t = 'FRENZY';
          for (let i = 0; i < t.length; i++) text(ctx, t[i], 50 + i * 27, 36 + Math.round(Math.sin(frame * 0.08 + i) * 3), CYC[(i + (frame >> 3)) & 7], 4);
          // dotted, solid and mirror wall swatches
          for (let i = 0; i < 20; i++) { ctx.fillStyle = '#3c64ff'; ctx.fillRect(48 + i * 4, 84, 1, 1); ctx.fillRect(50 + i * 4, 86, 1, 1); }
          text(ctx, 'SHOOT THROUGH', 140, 82, '#ffffff', 1);
          ctx.fillStyle = '#c030ff'; ctx.fillRect(48, 96, 80, 4); ctx.fillStyle = '#fff'; ctx.fillRect(48, 97, 80, 1);
          text(ctx, 'RICOCHET!', 140, 95, '#ffffff', 1);
          ctx.fillStyle = '#2040e0'; ctx.fillRect(48, 108, 80, 4);
          text(ctx, 'SOLID STEEL', 140, 107, '#ffffff', 1);
          text(ctx, 'THE ROBOTS ARE BACK', W / 2, 128, '#30ff30', 1, 'center');
          text(ctx, 'AND THEY HAVE REBUILT THE MAZE', W / 2, 140, '#30ff30', 1, 'center');
          drawSpr(ctx, HERO[(frame >> 4) & 1], 90, 166, {});
          drawSpr(ctx, ROBO[(frame >> 4) & 1], 130, 166, { col: LEVELS[(frame >> 6) % LEVELS.length].col });
          drawSpr(ctx, OTTO, 170, 166 - Math.abs(Math.sin(frame * 0.1)) * 8, {});
        } else if (page === 1) {
          text(ctx, 'SCORING', W / 2, 26, '#ffd200', 2, 'center');
          drawSpr(ctx, ROBO[(frame >> 4) & 1], 50, 56, { col: '#ff4040' }); text(ctx, 'ROBOT', 66, 53, '#fff', 1); text(ctx, '50', 210, 53, '#ffd200', 1, 'right');
          text(ctx, 'ROOM BONUS', 66, 70, '#fff', 1); text(ctx, '10 EACH', 210, 70, '#ffd200', 1, 'right');
          text(ctx, 'POWER PLANT', 66, 86, '#20ffff', 1); text(ctx, '1000', 210, 86, '#ffd200', 1, 'right');
          text(ctx, 'COMPUTER ROOM', 66, 100, '#30ff30', 1); text(ctx, '1400', 210, 100, '#ffd200', 1, 'right');
          text(ctx, 'ROBOT FACTORY', 66, 114, '#ff9020', 1); text(ctx, '1500', 210, 114, '#ffd200', 1, 'right');
          text(ctx, 'MASTER UNIT', 66, 128, '#ff4040', 1); text(ctx, '5000', 210, 128, '#ffd200', 1, 'right');
          text(ctx, 'HIT THE MASTER IN THE MOUTH', W / 2, 146, '#aaaaaa', 1, 'center');
          drawSpr(ctx, OTTO, 50, 166, {}); text(ctx, 'THE BOUNCER CANNOT BE STOPPED', 62, 163, '#ffd200', 1);
          text(ctx, 'BONUS LIFE AT 5000, EVERY 10000', W / 2, 182, '#4060ff', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2, 40, '#ffd200', 2, 'center');
          text(ctx, String(hi), W / 2, 70, CYC[(frame >> 2) & 7], 3, 'center');
          text(ctx, 'ARROWS MOVE', W / 2, 110, '#30ff30', 1, 'center');
          text(ctx, 'SPACE FIRES THE WAY YOU FACE', W / 2, 122, '#30ff30', 1, 'center');
          text(ctx, 'HOLD SPACE + ARROW TO AIM', W / 2, 134, '#30ff30', 1, 'center');
          text(ctx, 'OR FIRE WITH WASD', W / 2, 146, '#30ff30', 1, 'center');
          text(ctx, 'WATCH YOUR RICOCHETS', W / 2, 164, '#ff60ff', 1, 'center');
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 205, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 205, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 205, blink ? '#ffffff' : '#888888', 1, 'center');
        text(ctx, credStr(), 8, 215, '#888888', 1);
        text(ctx, '\u00a9 1982 STERN', W - 8, 215, '#888888', 1, 'right');
      }
      return { update, render, destroy() { }, debug: () => ({ g, mode, grid }) };
    }
  });
})();
