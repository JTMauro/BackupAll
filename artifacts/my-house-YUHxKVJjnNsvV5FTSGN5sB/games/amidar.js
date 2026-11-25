// Amidar (Konami, 1981) \u2014 written from scratch for the MAME32 Game Room. Paint every line, fill every box, and jump the warriors.
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
    for (const r of s.runs) {
      ctx.fillStyle = o.col || (o.pal && o.pal[r.k]) || r.c;
      const xx = o.flip ? s.w - r.x - r.n : r.x;
      ctx.fillRect(x0 + xx, y0 + r.y, r.n, 1);
    }
  }

  const W = 224, H = 256, TOP = 40, BOT = 232, NV = 7, X0 = 16, GAPW = 32;
  const VX = []; for (let i = 0; i < NV; i++) VX.push(X0 + i * GAPW);
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216; }
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  // ---------- the board: 7 vertical lines, staggered horizontal rungs in each of the 6 gaps ----------
  const HY = [], HS = [];
  (function () {
    const r = rng(1981);
    for (let j = 0; j < NV - 1; j++) {
      const ys = [TOP]; let y = TOP;
      for (;;) {
        y += 16 + 8 * ((r() * 3) | 0);
        if (j > 0 && HS[j - 1].has(y) && y + 8 <= BOT - 16) y += 8;
        if (y > BOT - 16) break;
        ys.push(y);
      }
      ys.push(BOT);
      HY.push(ys); HS.push(new Set(ys));
    }
  })();
  const vIndex = x => { const k = (x - X0) / GAPW; return (k === Math.floor(k) && k >= 0 && k < NV) ? k : -1; };
  function canMove(x, y, d) {
    const i = vIndex(x);
    if (d === 0 || d === 2) { if (i < 0) return false; return d === 0 ? y > TOP : y < BOT; }
    if (i < 0) return true;
    if (d === 1) return i < NV - 1 && HS[i].has(y);
    return i > 0 && HS[i - 1].has(y);
  }
  function isNode(x, y) { const i = vIndex(x); if (i < 0) return false; return (i > 0 && HS[i - 1].has(y)) || (i < NV - 1 && HS[i].has(y)); }

  // sprites (9x9-ish)
  const PAL = { B: '#a05820', F: '#ffc890', W: '#ffffff', K: '#000000', R: '#ff3030', P: '#ff90c0', N: '#ff5090', H: '#c0c0c0', Y: '#ffe040', G: '#40ff60', C: '#40c0ff', V: '#c060ff' };
  const GORILLA = [makeSpr(['..BBBBB..', '.BBFFFBB.', '.BFWFWFB.', '.BBFKFBB.', 'BBBBBBBBB', 'B.BBBBB.B', 'B.BBBBB.B', '..BB.BB..', '.BBB.BBB.'], PAL),
    makeSpr(['..BBBBB..', '.BBFFFBB.', '.BFWFWFB.', '.BBFKFBB.', 'BBBBBBBBB', 'B.BBBBB.B', '..BBBBB..', '.BB...BB.', '.BB...BB.'], PAL)];
  const ROLLER = [makeSpr(['YYYYYYYYY', 'YWWWWWWWY', 'YYYYYYYYY', '....H....', '....H....', '....H....', '...HHH...', '...RRR...', '...RRR...'], PAL),
    makeSpr(['YYYYYYYYY', 'YYWWWWWWY', 'YYYYYYYYY', '....H....', '....H....', '....H....', '...HHH...', '...RRR...', '...RRR...'], PAL)];
  const WARRIOR = [makeSpr(['...FFF...', '..FFFFF..', '..FKFKF..', 'H.FFFFF.H', 'HRRRRRRRH', 'H.RRRRR.H', '..RRRRR..', '..R...R..', '.RR...RR.'], PAL),
    makeSpr(['...FFF...', '..FFFFF..', '..FKFKF..', 'H.FFFFF.H', 'HRRRRRRRH', 'H.RRRRR.H', '..RRRRR..', '...R.R...', '..RR.RR..'], PAL)];
  const PIG = [makeSpr(['.P.....P.', '.PPPPPPP.', 'PPKPPPKPP', 'PPPNNNPPP', 'PPPNKNPPP', '.PPPPPPP.', '.PPPPPPP.', '.PP...PP.'], PAL),
    makeSpr(['.P.....P.', '.PPPPPPP.', 'PPKPPPKPP', 'PPPNNNPPP', 'PPPNKNPPP', '.PPPPPPP.', '.PPPPPPP.', '..PP.PP..'], PAL)];
  const THEME = [
    { name: 'GORILLA', foe: 'WARRIOR', line: '#2848a8', paint: '#ffe040', fill: ['#c03030', '#3070e0', '#30a040', '#c060c0', '#e08020'] },
    { name: 'PAINT ROLLER', foe: 'PIG', line: '#806020', paint: '#40ffff', fill: ['#2050c0', '#c03080', '#20a0a0', '#a0a020', '#8040e0'] }];

  ArcadeRegistry.register({
    id: 'amidar', title: 'Amidar', year: 1981, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: jump \u00b7 Enter: start',
    marquee: { bg: '#100820', fg: '#ffe040', accent: '#ff3030' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', T = 0, coinFlash = 0, g = null, page = 0, lastDir = -1;
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      // the walking tune advances one note per step cycle while the player is moving
      const TUNE = [523, 0, 659, 0, 784, 784, 659, 0, 587, 0, 698, 0, 880, 880, 698, 0, 523, 0, 659, 784, 1047, 0, 784, 0, 659, 587, 523, 0, 392, 0, 523, 0];
      const BASS = [131, 196, 165, 196, 147, 220, 175, 220];
      const snd = {
        step(i) { const f = TUNE[i % TUNE.length]; if (f) au.tone(f, 0.09, { type: 'square', vol: 0.045 }); if (i % 4 === 0) au.tone(BASS[(i >> 2) % 8], 0.12, { type: 'triangle', vol: 0.08 }); },
        fill() { au.melody([[784, 0.04], [988, 0.04], [1175, 0.04], [1568, 0.08]], { type: 'square', vol: 0.08 }); },
        corner() { for (let i = 0; i < 6; i++) au.tone(600 + i * 200, 0.1, { type: 'sawtooth', vol: 0.07, delay: i * 0.08 }); },
        jump() { au.tone(300, 0.35, { type: 'square', vol: 0.09, slideTo: 1200 }); },
        kill(n) { au.tone(400 + n * 150, 0.25, { type: 'square', vol: 0.1, slideTo: 1600 + n * 200 }); },
        die() { au.melody([[784, 0.12], [740, 0.12], [698, 0.12], [659, 0.12], [622, 0.12], [587, 0.12], [554, 0.12], [523, 0.4]], { type: 'square', vol: 0.1 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [0, 0.05], [784, 0.1], [1047, 0.35]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[392, 0.12], [523, 0.12], [659, 0.12], [523, 0.12], [659, 0.12], [784, 0.36]], { type: 'square', vol: 0.1 }); },
        life() { au.melody([[1047, 0.07], [1319, 0.07], [1568, 0.07], [2093, 0.15]], { type: 'square', vol: 0.09 }); },
        over() { au.melody([[523, 0.2], [392, 0.2], [330, 0.2], [262, 0.5]], { type: 'square', vol: 0.11 }); }
      };

      // ---------- edges and boxes ----------
      function buildBoard() {
        const vE = [], hE = [], boxes = [];
        for (let i = 0; i < NV; i++) {
          const st = new Set(); if (i > 0) HY[i - 1].forEach(y => st.add(y)); if (i < NV - 1) HY[i].forEach(y => st.add(y));
          const ys = [...st].sort((a, b) => a - b), list = [];
          for (let k = 0; k < ys.length - 1; k++) list.push({ v: true, i, a: ys[k], b: ys[k + 1], len: ys[k + 1] - ys[k], p: new Uint8Array(ys[k + 1] - ys[k]), n: 0, done: false });
          vE.push(list);
        }
        for (let j = 0; j < NV - 1; j++) {
          const m = new Map();
          for (const y of HY[j]) m.set(y, { v: false, j, y, a: VX[j], b: VX[j + 1], len: GAPW, p: new Uint8Array(GAPW), n: 0, done: false });
          hE.push(m);
          for (let k = 0; k < HY[j].length - 1; k++) {
            const y0 = HY[j][k], y1 = HY[j][k + 1];
            const edges = [m.get(y0), m.get(y1)]
              .concat(vE[j].filter(e => e.a >= y0 && e.b <= y1), vE[j + 1].filter(e => e.a >= y0 && e.b <= y1));
            const corner = (j === 0 || j === NV - 2) && (k === 0 || k === HY[j].length - 2);
            boxes.push({ j, k, x0: VX[j], x1: VX[j + 1], y0, y1, edges, filled: false, corner, col: irnd(5), flash: 0 });
          }
        }
        let total = 0; vE.forEach(l => l.forEach(e => total += e.len)); hE.forEach(m => m.forEach(e => total += e.len));
        return { vE, hE, boxes, total };
      }
      function edgeAt(x, y, d) {
        if (!canMove(x, y, d)) return null;
        if (d === 0 || d === 2) { const py = d === 0 ? y - 1 : y; return g.vE[vIndex(x)].find(e => py >= e.a && py < e.b) || null; }
        const px = d === 3 ? x - 1 : x, j = Math.floor((px - X0) / GAPW);
        return (g.hE[j] && g.hE[j].get(y)) || null;
      }
      function paintStep(x, y, d) {
        const e = edgeAt(x, y, d); if (!e) return;
        const idx = e.v ? (d === 0 ? y - 1 : y) - e.a : (d === 3 ? x - 1 : x) - e.a;
        if (idx < 0 || idx >= e.len || e.p[idx]) return;
        e.p[idx] = 1; e.n++; g.painted++;
        if (g.painted % 4 === 0) addScore(1);
        if (e.n >= e.len && !e.done) { e.done = true; checkBoxes(); }
      }
      function checkBoxes() {
        let any = false;
        for (const b of g.boxes) {
          if (b.filled || !b.edges.every(e => e.done)) continue;
          b.filled = true; b.flash = 30; any = true;
          const pts = Math.max(10, Math.round((b.x1 - b.x0) * (b.y1 - b.y0) / 64) * 10);
          addScore(pts);
          g.pops.push({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 - 3, s: String(pts), t: 50 });
          if (b.corner && !g.cornersDone && g.boxes.filter(q => q.corner).every(q => q.filled)) {
            g.cornersDone = true; g.power = Math.max(180, 420 - g.level * 40); g.killN = 0; snd.corner();
          }
        }
        if (any && !g.demo) snd.fill();
        if (g.boxes.every(b => b.filled) && g.phase === 'play') {
          g.phase = 'clear'; g.phaseT = 0; if (!g.demo) snd.clear();
        }
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 30000; snd.life(); }
        if (g.score > hi) hi = g.score;
      }

      // ---------- game flow ----------
      function newGame(demo) {
        g = { demo, score: 0, lives: 3, level: 1, nextLife: 15000, phase: 'ready', phaseT: 0, pops: [] };
        startLevel(1);
      }
      function startLevel(n) {
        g.level = n;
        const b = buildBoard(); g.vE = b.vE; g.hE = b.hE; g.boxes = b.boxes; g.total = b.total; g.painted = 0;
        g.cornersDone = false; g.power = 0;
        resetActors();
        g.phase = 'ready'; g.phaseT = 0;
      }
      function resetActors() {
        g.p = { x: VX[3], y: BOT, dir: -1, acc: 0, step: 0, anim: 0, face: 1 };
        g.jumps = 3; g.jumpT = 0; g.power = 0;
        g.foes = [];
        const n = Math.min(7, 4 + Math.floor((g.level + 1) / 2));
        for (let i = 0; i < n; i++) g.foes.push({ kind: 'w', x: VX[i % 2 ? 2 : 4], y: TOP, ph: 'v', hd: i % 2 ? -1 : 1, vd: 1, wait: 40 + i * 70, acc: 0, last: -1, dead: 0, anim: irnd(16) });
        g.foes.push({ kind: 't', x: VX[0], y: TOP, wait: 20, acc: 0, dead: 0, anim: 0 });
        if (g.level >= 4) g.foes.push({ kind: 't', x: VX[NV - 1], y: BOT, wait: 300, acc: 0, dead: 0, anim: 0 });
      }
      const foeSpeed = f => f.kind === 't' ? Math.min(1.05, 0.62 + g.level * 0.05) : Math.min(1.15, 0.55 + g.level * 0.07);

      function playerWant() {
        if (g.demo) return demoWant();
        for (let d = 0; d < 4; d++) if (api.pressed(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][d])) lastDir = d;
        if (lastDir >= 0 && api.key(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][lastDir])) return lastDir;
        for (let d = 0; d < 4; d++) if (api.key(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][d])) return d;
        return -1;
      }
      function demoWant() {
        const p = g.p;
        if (p.dir >= 0 && canMove(p.x, p.y, p.dir) && !isNode(p.x, p.y)) {
          // mid-edge: turn back only if something is coming at us
          const ahead = g.foes.some(f => !f.wait && !f.dead && Math.abs(f.x - (p.x + DX[p.dir] * 14)) + Math.abs(f.y - (p.y + DY[p.dir] * 14)) < 12);
          return ahead ? (p.dir + 2) % 4 : p.dir;
        }
        let best = -1, bs = -1e9;
        for (let d = 0; d < 4; d++) {
          if (!canMove(p.x, p.y, d)) continue;
          const e = edgeAt(p.x, p.y, d);
          let s = (e && !e.done ? 10 : 0) + rnd(4) - (d === (p.dir + 2) % 4 ? 3 : 0);
          for (const f of g.foes) {
            if (f.wait || f.dead) continue;
            const dx = f.x - p.x, dy = f.y - p.y, dist = Math.abs(dx) + Math.abs(dy);
            if (dist < 44 && (dx * DX[d] + dy * DY[d]) > 0) s -= g.power ? -8 : 30 - dist / 2;
          }
          if (s > bs) { bs = s; best = d; }
        }
        return best;
      }
      function stepPlayer() {
        const p = g.p, want = playerWant();
        if (want < 0 && !g.demo) { return false; }
        if (want >= 0 && canMove(p.x, p.y, want)) p.dir = want;
        else if (p.dir >= 0 && !canMove(p.x, p.y, p.dir)) p.dir = -1;
        if (p.dir < 0) return false;
        paintStep(p.x, p.y, p.dir);
        p.x += DX[p.dir]; p.y += DY[p.dir];
        if (DX[p.dir]) p.face = DX[p.dir];
        return true;
      }
      function stepFoe(f) {
        if (f.kind === 't') {
          // the tracer circles the board's outer edge
          let d;
          if (f.y === TOP && f.x < VX[NV - 1]) d = 1;
          else if (f.x === VX[NV - 1] && f.y < BOT) d = 2;
          else if (f.y === BOT && f.x > VX[0]) d = 3;
          else d = 0;
          f.x += DX[d]; f.y += DY[d]; return;
        }
        const key = f.x * 1000 + f.y;
        if (isNode(f.x, f.y) && key !== f.last) {
          f.last = key;
          const i = vIndex(f.x);
          if (f.ph === 'h') {
            f.ph = 'v';
            if ((i === 0 && f.hd < 0) || (i === NV - 1 && f.hd > 0)) f.hd = -f.hd;
            if (!canMove(f.x, f.y, f.vd > 0 ? 2 : 0)) f.vd = -f.vd;
          } else {
            if (canMove(f.x, f.y, f.hd > 0 ? 1 : 3)) f.ph = 'h';
            else if (!canMove(f.x, f.y, f.vd > 0 ? 2 : 0)) {
              f.vd = -f.vd; f.hd = -f.hd;
              if (canMove(f.x, f.y, f.hd > 0 ? 1 : 3)) f.ph = 'h';
            }
          }
        }
        let d = f.ph === 'v' ? (f.vd > 0 ? 2 : 0) : (f.hd > 0 ? 1 : 3);
        if (!canMove(f.x, f.y, d)) {
          if (f.ph === 'v') { f.vd = -f.vd; d = f.vd > 0 ? 2 : 0; } else { f.hd = -f.hd; d = f.hd > 0 ? 1 : 3; }
          if (!canMove(f.x, f.y, d)) return;
        }
        f.x += DX[d]; f.y += DY[d];
      }

      function updateGame() {
        g.phaseT++;
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        for (const b of g.boxes) if (b.flash > 0) b.flash--;
        if (g.phase === 'ready') { if (g.phaseT > (g.demo ? 30 : 120)) g.phase = 'play'; return; }
        if (g.phase === 'over') { if (g.phaseT > 240 || (g.phaseT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; page = 0; T = 0; } return; }
        if (g.phase === 'wait') return;
        if (g.phase === 'clear') {
          if (g.phaseT === 100 && !g.demo) { const bonus = 1000 * Math.min(10, g.level); addScore(bonus); g.pops.push({ x: W / 2, y: 120, s: 'BONUS ' + bonus, t: 80 }); }
          if (g.phaseT > 200) { if (g.demo) { mode = 'title'; page = 0; T = 0; return; } startLevel(g.level + 1); }
          return;
        }
        if (g.phase === 'dying') {
          if (g.phaseT === 1 && !g.demo) snd.die();
          if (g.phaseT > 130) {
            if (g.demo) { mode = 'title'; page = 0; T = 0; return; }
            g.lives--;
            if (g.lives <= 0) {
              g.phase = 'wait'; g.phaseT = 0;
              const gameOver = () => { g.phase = 'over'; g.phaseT = 0; api.setHiScore(g.score); snd.over(); };
              if (api.offerContinue) api.offerContinue(() => { g.lives = 3; resetActors(); g.phase = 'ready'; g.phaseT = 0; }, gameOver);
              else gameOver();
            } else { resetActors(); g.phase = 'ready'; g.phaseT = 0; }
          }
          return;
        }
        // --- play ---
        const p = g.p;
        if ((g.demo ? g.foes.some(f => !f.wait && !f.dead && Math.abs(f.x - p.x) + Math.abs(f.y - p.y) < 12) && g.jumps > 0 && !g.jumpT
          : api.anyPressed('Space', 'KeyX', 'KeyZ')) && g.jumps > 0 && !g.jumpT) {
          g.jumps--; g.jumpT = 44; if (!g.demo) snd.jump();
        }
        if (g.jumpT > 0) g.jumpT--;
        p.acc += 1.0;
        let moved = false;
        while (p.acc >= 1) { p.acc -= 1; if (stepPlayer()) moved = true; }
        if (moved) { p.anim++; if (p.anim % 8 === 0 && !g.demo) snd.step(p.step++); }
        if (g.power > 0) g.power--;
        for (const f of g.foes) {
          f.anim++;
          if (f.dead > 0) { if (--f.dead === 0) { f.wait = 1; f.x = VX[3]; f.y = TOP; f.ph = 'v'; f.vd = 1; f.last = -1; if (f.kind === 't') f.x = VX[0]; } continue; }
          if (f.wait > 0) { f.wait--; continue; }
          f.acc += foeSpeed(f) * (g.power ? 0.6 : 1);
          while (f.acc >= 1) { f.acc -= 1; stepFoe(f); }
          if (Math.abs(f.x - p.x) + Math.abs(f.y - p.y) < 7) {
            if (g.power) {
              f.dead = 240; const pts = 100 * (1 << Math.min(5, g.killN)); g.killN++;
              addScore(pts); g.pops.push({ x: f.x, y: f.y - 8, s: String(pts), t: 60 }); if (!g.demo) snd.kill(g.killN);
            } else if (!g.jumpT) { g.phase = 'dying'; g.phaseT = 0; return; }
          }
        }
      }

      function tryStart() {
        if (api.useCredit()) { newGame(false); mode = 'game'; snd.start(); lastDir = -1; return; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
      }
      function update() {
        T++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.pressed('Enter') || api.pressed('Space')) { tryStart(); return; }
          if (page === 1) { updateGame(); if (mode === 'title' && page === 1 && T > 1500) { page = 0; T = 0; } }
          else if (T > 540) { page = 1; T = 0; newGame(true); }
          return;
        }
        updateGame();
      }

      // ---------- rendering ----------
      function drawBoard(ctx, theme, flashAll) {
        for (const b of g.boxes) {
          if (!b.filled) continue;
          ctx.fillStyle = b.flash & 4 || flashAll ? '#ffffff' : theme.fill[(b.j + b.k * 2) % theme.fill.length];
          ctx.fillRect(b.x0 + 2, b.y0 + 2, b.x1 - b.x0 - 3, b.y1 - b.y0 - 3);
        }
        const drawEdge = e => {
          for (let k = 0; k < e.len; k++) {
            const on = e.p[k];
            if (!on && (k & 1)) continue;
            ctx.fillStyle = on ? theme.paint : theme.line;
            if (e.v) ctx.fillRect(VX[e.i], e.a + k, 2, 1); else ctx.fillRect(e.a + k, e.y, 1, 2);
          }
        };
        g.vE.forEach(l => l.forEach(drawEdge));
        g.hE.forEach(m => m.forEach(drawEdge));
        ctx.fillStyle = theme.line; ctx.fillRect(VX[NV - 1], BOT, 2, 2);
      }
      function foeSprite(f, odd) {
        if (f.kind === 't') return odd ? WARRIOR : PIG;
        return odd ? WARRIOR : PIG;
      }
      function drawGame(ctx) {
        const odd = g.level % 2 === 1, theme = THEME[odd ? 0 : 1];
        const flashAll = g.phase === 'clear' && (g.phaseT >> 3) & 1;
        drawBoard(ctx, theme, flashAll);
        // foes
        for (const f of g.foes) {
          if (f.wait > 0 || f.dead > 0) continue;
          const spr = foeSprite(f, odd)[(f.anim >> 3) & 1];
          let col = null;
          if (f.kind === 't') col = '#c060ff';
          if (g.power) col = g.power < 90 && (g.power >> 3) & 1 ? '#ffffff' : '#3060ff';
          const lift = g.jumpT ? Math.round(Math.sin((44 - g.jumpT) / 44 * Math.PI) * 8) : 0;
          if (lift) { ctx.fillStyle = '#000000'; ctx.fillRect(f.x - 2, f.y + 3, 6, 2); }
          drawSpr(ctx, spr, f.x + 1, f.y + 1 - lift, { col, flip: f.hd < 0 });
        }
        // player
        const p = g.p;
        if (g.phase === 'dying') {
          const k = g.phaseT;
          if (k < 70) drawSpr(ctx, (odd ? GORILLA : ROLLER)[(k >> 2) & 1], p.x + 1, p.y + 1, { col: (k >> 2) & 1 ? '#ffffff' : '#ff3030', flip: (k >> 3) & 1 });
          else if (k < 110) { ctx.fillStyle = '#ffffff'; const r = (k - 70) / 3; for (let i = 0; i < 8; i++) ctx.fillRect(p.x + Math.cos(i * 0.785) * r, p.y + Math.sin(i * 0.785) * r, 2, 2); }
        } else {
          drawSpr(ctx, (odd ? GORILLA : ROLLER)[(p.anim >> 3) & 1], p.x + 1, p.y + 1, { flip: p.face < 0 });
        }
        for (const q of g.pops) text(ctx, q.s, q.x, q.y, '#ffffff', 1, 'center');
        drawHud(ctx);
        if (g.phase === 'ready' && !g.demo) {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 44, 128, 88, 20);
          text(ctx, 'PLAYER ONE', W / 2, 130, '#40c0ff', 1, 'center'); text(ctx, 'READY!', W / 2, 140, '#ffe040', 1, 'center');
        }
        if (g.phase === 'clear' && g.phaseT > 60) { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 54, 100, 108, 14); text(ctx, 'LEVEL CLEAR!', W / 2, 104, '#ffe040', 1, 'center'); }
        if (g.phase === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 124, 120, 24); text(ctx, 'GAME OVER', W / 2, 129, '#ff3030', 2, 'center'); }
        if (g.demo) { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 46, 236, 92, 18); drawCoin(ctx, 240); }
      }
      function drawHud(ctx) {
        const sc = g && !g.demo ? g.score : 0;
        text(ctx, '1UP', 24, 2, '#ff3030'); text(ctx, String(sc).padStart(6, '0'), 12, 11, '#ffffff');
        text(ctx, 'HIGH SCORE', W / 2 + 14, 2, '#ff3030', 1, 'center'); text(ctx, String(Math.max(hi, sc)).padStart(6, '0'), W / 2 + 14, 11, '#ffffff', 1, 'center');
        if (!g || g.demo) return;
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) drawSpr(ctx, (g.level % 2 ? GORILLA : ROLLER)[0], W - 10 - i * 11, 26, {});
        text(ctx, 'JUMP', 4, 22, '#40c0ff');
        for (let i = 0; i < g.jumps; i++) { ctx.fillStyle = '#40c0ff'; ctx.fillRect(32 + i * 6, 23, 4, 5); }
        text(ctx, 'L' + g.level, W - 6, 2, '#40ff60', 1, 'right');
        if (g.power) text(ctx, 'POWER', W / 2, 22, (T >> 3) & 1 ? '#ffffff' : '#3060ff', 1, 'center');
      }
      function drawCoin(ctx, y) {
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, y, '#ffffff', 1, 'center');
      }
      function drawTitle(ctx) {
        drawHud(ctx);
        // logo with painted-grid underline
        text(ctx, 'AMIDAR', W / 2, 40, '#ffe040', 4, 'center');
        ctx.fillStyle = '#2848a8'; for (let x = 24; x < W - 24; x += 2) ctx.fillRect(x, 74, 1, 2);
        const k = Math.min(W - 48, (T * 2) % (W + 40)); ctx.fillStyle = '#ffe040'; ctx.fillRect(24, 74, k, 2);
        const rows = [[GORILLA, null, 'GORILLA', '#ffc890'], [WARRIOR, null, 'WARRIOR', '#ff3030'], [WARRIOR, '#c060ff', 'TRACER', '#c060ff'], [ROLLER, null, 'PAINT ROLLER', '#ffe040'], [PIG, null, 'PIG', '#ff90c0']];
        rows.forEach((r, i) => { drawSpr(ctx, r[0][(T >> 4) & 1], 58, 94 + i * 16, { col: r[1] }); text(ctx, r[2], 76, 91 + i * 16, r[3]); });
        text(ctx, 'FILL A BOX ..... SCORE', 30, 178, '#ffffff');
        text(ctx, 'FILL 4 CORNERS .. POWER', 30, 190, '#ffffff');
        text(ctx, 'SPACE .......... JUMP', 30, 202, '#ffffff');
        drawCoin(ctx, 220);
        text(ctx, credStr(), 4, H - 9, '#aaaaaa');
        text(ctx, '\u00a9 1981 KONAMI', W - 4, H - 9, '#aaaaaa', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' && page === 0) { drawTitle(ctx); return; }
        drawGame(ctx);
      }
      return { update, render, destroy() { if (g && !g.demo) api.setHiScore(g.score); } };
    }
  });
})();
