// Tutankham (Konami, 1982) \u2014 written from scratch for the MAME32 Game Room. Explore the tomb, blast its guardians sideways, find the key and reach the door.
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

  const W = 224, H = 256, PY = 32, COLS = 40, ROWS = 8, PITCH = 24, WW = COLS * PITCH + 8, WH = ROWS * PITCH + 8, ZONE = 10;
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216; }
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const cxOf = x => (x - 16) / PITCH, cyOf = y => (y - 16) / PITCH, ctr = c => 16 + c * PITCH;

  const PAL = { K: '#000000', W: '#ffffff', S: '#f0c080', H: '#e8d8a0', B: '#4060ff', R: '#ff3030', Y: '#ffe040', G: '#40e040', D: '#208020', P: '#c060ff', M: '#802080', O: '#ff9020', C: '#40e0ff', N: '#a06030', L: '#c0c0c0' };
  const HERO = [makeSpr(['...HHHH....', '..HHHHHH...', '.HHHHHHHH..', '...SSKS....', '...SSSS....', '..BBBBB.LLL', '.SBBBBBBLL.', '..BBBBB....', '..NNNNN....', '..N...N....', '.NN...NN...'], PAL),
    makeSpr(['...HHHH....', '..HHHHHH...', '.HHHHHHHH..', '...SSKS....', '...SSSS....', '..BBBBB.LLL', '.SBBBBBBLL.', '..BBBBB....', '..NNNNN....', '...N.N.....', '...NNNN....'], PAL)];
  const FOES = [
    { name: 'COBRA', pts: 20, spr: [makeSpr(['....GGG.....', '...GGKGG....', '...GGGGG....', '....GGRR....', '.....GG.....', '....GG......', '...GG..GG...', '..GGGGGGGGG.', '.GGGDGGDGGG.'], PAL),
      makeSpr(['...GGG......', '..GGKGG.....', '..GGGGG.....', '...GGRR.....', '....GG......', '.....GG.....', '..GG..GG....', '.GGGGGGGGGG.', 'GGGDGGDGGGG.'], PAL)] },
    { name: 'VULTURE', pts: 30, spr: [makeSpr(['P..........P', 'PP...MM...PP', '.PPP.MK.PPP.', '..PPPMMPPP..', '....MMMM....', '....M..M....', '...YY..YY...'], PAL),
      makeSpr(['............', '.....MM.....', '.....MK.....', 'PPPPPMMPPPPP', '.PPPMMMMPPP.', '....M..M....', '...YY..YY...'], PAL)] },
    { name: 'BAT', pts: 40, spr: [makeSpr(['R....RR....R', 'RR..RKKR..RR', 'RRRRRRRRRRRR', '.RRRRRRRRRR.', '..R..RR..R..', '.....RR.....'], PAL),
      makeSpr(['.....RR.....', '....RKKR....', '.RRRRRRRRRR.', 'RRRRRRRRRRRR', 'R...RRRR...R', '.....RR.....'], PAL)] },
    { name: 'CURSE', pts: 50, spr: [makeSpr(['...CCCCC...', '..CCCCCCC..', '.CCKCCCKCC.', '.CCCCCCCCC.', '.CCCKKKCCC.', '.CCCCCCCCC.', '.C.CC.CC.C.', 'C..C..C..C.'], PAL),
      makeSpr(['...CCCCC...', '..CCCCCCC..', '.CCKCCCKCC.', '.CCCCCCCCC.', '.CCCKKKCCC.', '.CCCCCCCCC.', '.CC.CC.CC..', '..C..C..C..'], PAL)] }];
  const TREASURE = [
    { name: 'CROWN', pts: 1000, spr: makeSpr(['Y.Y.Y.Y', 'YYYYYYY', 'YRYCYRY', 'YYYYYYY'], PAL) },
    { name: 'RING', pts: 1500, spr: makeSpr(['..CCC..', '.C...C.', 'Y.....Y', 'Y.....Y', '.Y...Y.', '..YYY..'], PAL) },
    { name: 'CHALICE', pts: 2000, spr: makeSpr(['YYYYYYY', 'YRYYYRY', '.YYYYY.', '..YYY..', '...Y...', '..YYY..', '.YYYYY.'], PAL) },
    { name: 'MASK', pts: 3000, spr: makeSpr(['.BYBYB.', 'BYBYBYB', 'YSSSSSY', 'SKSSSKS', 'SSSSSSS', '.SSRSS.', '..SSS..', '..YYY..'], PAL) }];
  const KEY = makeSpr(['.YYY.......', 'Y...YYYYYYY', 'Y...Y..Y.Y.', '.YYY.......'], PAL);
  const THEMES = [
    { name: 'TOMB 1', wall: '#c06020', hi: '#ff9040', lo: '#602808', floor: '#100804' },
    { name: 'TOMB 2', wall: '#2060c0', hi: '#60a0ff', lo: '#102860', floor: '#040810' },
    { name: 'TOMB 3', wall: '#20a050', hi: '#60f090', lo: '#0c4020', floor: '#04100a' },
    { name: 'TOMB 4', wall: '#a02090', hi: '#f060e0', lo: '#401040', floor: '#100410' }];

  ArcadeRegistry.register({
    id: 'tutankham', title: 'Tutankham', year: 1982, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: laser (left/right) \u00b7 X: flash bomb \u00b7 Enter: start',
    marquee: { bg: '#100800', fg: '#ffe040', accent: '#c06020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', T = 0, coinFlash = 0, g = null, page = 0, lastDir = -1;
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        laser() { au.tone(2400, 0.12, { type: 'square', vol: 0.06, slideTo: 600 }); },
        fizzle() { au.tone(200, 0.06, { type: 'square', vol: 0.06 }); },
        kill() { au.noise(0.18, { vol: 0.14, freq: 2500, slideTo: 300 }); },
        flash() { au.noise(0.8, { vol: 0.22, freq: 4000, slideTo: 100 }); au.tone(1800, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 80 }); },
        spawn() { au.tone(110, 0.15, { type: 'triangle', vol: 0.08, slideTo: 220 }); },
        treasure() { au.melody([[1047, 0.06], [1319, 0.06], [1568, 0.06], [2093, 0.12]], { type: 'square', vol: 0.09 }); },
        key() { au.melody([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.2]], { type: 'triangle', vol: 0.14 }); },
        warp() { au.tone(200, 0.4, { type: 'sine', vol: 0.12, slideTo: 2000 }); },
        die() { au.melody([[659, 0.15], [622, 0.15], [587, 0.15], [554, 0.15], [523, 0.15], [494, 0.4]], { type: 'square', vol: 0.1 }); },
        door() { au.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.12], [659, 0.12], [784, 0.12], [1047, 0.4]], { type: 'square', vol: 0.11 }); },
        tick() { au.tone(1000, 0.04, { type: 'square', vol: 0.05 }); },
        start() { au.melody([[294, 0.15], [349, 0.15], [440, 0.15], [415, 0.15], [349, 0.15], [294, 0.4]], { type: 'square', vol: 0.1 }); },
        needkey() { au.tone(150, 0.2, { type: 'square', vol: 0.08 }); },
        life() { au.melody([[1047, 0.07], [1319, 0.07], [1568, 0.07], [2093, 0.15]], { type: 'square', vol: 0.09 }); },
        over() { au.melody([[440, 0.25], [415, 0.25], [392, 0.25], [349, 0.6]], { type: 'square', vol: 0.11 }); }
      };

      // ---------- maze ----------
      function buildMaze(level) {
        const r = rng(level * 7717 + 1982);
        const e = new Uint8Array(COLS * ROWS), s = new Uint8Array(COLS * ROWS), seen = new Uint8Array(COLS * ROWS);
        const stack = [[0, 3]]; seen[3 * COLS] = 1;
        while (stack.length) {
          const [cx, cy] = stack[stack.length - 1];
          const opts = [];
          for (let d = 0; d < 4; d++) {
            const nx = cx + DX[d], ny = cy + DY[d];
            if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen[ny * COLS + nx]) continue;
            opts.push(d); if (d === 1 || d === 3) opts.push(d); // favour long horizontal runs
          }
          if (!opts.length) { stack.pop(); continue; }
          const d = opts[(r() * opts.length) | 0], nx = cx + DX[d], ny = cy + DY[d];
          if (d === 1) e[cy * COLS + cx] = 1; else if (d === 3) e[cy * COLS + nx] = 1; else if (d === 2) s[cy * COLS + cx] = 1; else s[ny * COLS + cx] = 1;
          seen[ny * COLS + nx] = 1; stack.push([nx, ny]);
        }
        const M = { e, s };
        const deg = (cx, cy) => { let n = 0; for (let d = 0; d < 4; d++) if (openM(M, cx, cy, d)) n++; return n; };
        // braid: knock out most dead ends so the tomb has loops
        for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
          if (deg(cx, cy) !== 1 || r() < 0.45) continue;
          const ds = [];
          for (let d = 0; d < 4; d++) { const nx = cx + DX[d], ny = cy + DY[d]; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !openM(M, cx, cy, d)) ds.push(d); }
          if (!ds.length) continue;
          const d = ds[(r() * ds.length) | 0];
          if (d === 1) e[cy * COLS + cx] = 1; else if (d === 3) e[cy * COLS + cx - 1] = 1; else if (d === 2) s[cy * COLS + cx] = 1; else s[(cy - 1) * COLS + cx] = 1;
        }
        const dead = [];
        for (let cy = 0; cy < ROWS; cy++) for (let cx = 2; cx < COLS - 1; cx++) if (deg(cx, cy) === 1) dead.push([cx, cy]);
        const used = new Set(['0,3']);
        const take = (lo, hi, pref) => {
          let c = (pref || dead).filter(([x, y]) => x >= lo && x <= hi && !used.has(x + ',' + y));
          if (!c.length) { c = []; for (let y = 0; y < ROWS; y++) for (let x = lo; x <= hi; x++) if (!used.has(x + ',' + y)) c.push([x, y]); }
          const p = c[(r() * c.length) | 0]; used.add(p[0] + ',' + p[1]); return { cx: p[0], cy: p[1] };
        };
        M.doorRow = (r() * ROWS) | 0; used.add((COLS - 1) + ',' + M.doorRow);
        for (let z = 0; z < 4; z++) for (let y = 0; y < ROWS; y++) used.add(z * ZONE + ',' + y); // checkpoint column stays clear
        M.key = take(22, 36);
        M.treasures = [];
        for (let z = 0; z < 4; z++) { const t = take(z * ZONE + 2, z * ZONE + 9); t.kind = (z + level) % 4; t.got = false; M.treasures.push(t); }
        // warps live in dead ends so they never block a corridor
        const takeDead = (lo, hi) => {
          const c = dead.filter(([x, y]) => x >= lo && x <= hi && !used.has(x + ',' + y));
          if (!c.length) return null;
          const q = c[(r() * c.length) | 0]; used.add(q[0] + ',' + q[1]); return { cx: q[0], cy: q[1] };
        };
        M.warps = [];
        const w1 = takeDead(3, 9), w2 = takeDead(13, 19);
        if (w1 && w2) M.warps.push({ a: w1, b: w2 });
        const w3 = takeDead(23, 29), w4 = takeDead(31, 37);
        if (w3 && w4) M.warps.push({ a: w3, b: w4 });
        M.nests = [];
        const nn = Math.min(4, 2 + Math.floor(level / 2));
        for (let z = 0; z < 4; z++) for (let k = 0; k < nn; k++) { const t = take(z * ZONE + 3, z * ZONE + 9, []); t.cool = 60 + irnd(120); M.nests.push(t); }
        return M;
      }
      function openM(M, cx, cy, d) {
        if (d === 1) return cx < COLS - 1 && M.e[cy * COLS + cx] === 1;
        if (d === 3) return cx > 0 && M.e[cy * COLS + cx - 1] === 1;
        if (d === 2) return cy < ROWS - 1 && M.s[cy * COLS + cx] === 1;
        return cy > 0 && M.s[(cy - 1) * COLS + cx] === 1;
      }
      function canMove(x, y, d) {
        const ox = (x - 16) % PITCH, oy = (y - 16) % PITCH;
        if (ox === 0 && oy === 0) return openM(g.M, cxOf(x), cyOf(y), d);
        if (ox !== 0) return d === 1 || d === 3;
        return d === 0 || d === 2;
      }
      const atCenter = e => (e.x - 16) % PITCH === 0 && (e.y - 16) % PITCH === 0;
      const cellOf = e => [Math.round(cxOf(e.x)), Math.round(cyOf(e.y))];
      function bfs(tx, ty, noWarp) {
        const dist = new Int16Array(COLS * ROWS).fill(-1), q = [tx + ty * COLS]; dist[q[0]] = 0;
        if (noWarp) for (const w of g.M.warps) for (const c of [w.a, w.b]) dist[c.cx + c.cy * COLS] = 30000;
        for (let h = 0; h < q.length; h++) {
          const i = q[h], cx = i % COLS, cy = (i / COLS) | 0;
          for (let d = 0; d < 4; d++) if (openM(g.M, cx, cy, d)) { const j = (cx + DX[d]) + (cy + DY[d]) * COLS; if (dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); }
          }
        }
        return dist;
      }

      // ---------- flow ----------
      function newGame(demo) {
        g = { demo, score: 0, lives: 3, level: 1, nextLife: 20000, phase: 'ready', phaseT: 0, pops: [], fx: [] };
        startLevel(1);
      }
      function startLevel(n) {
        g.level = n; g.M = buildMaze(n); g.theme = THEMES[(n - 1) % 4];
        g.hasKey = false; g.time = 240 * 60; g.zone = 0; g.flashT = 0;
        spawnPlayer(0, 3);
        g.phase = 'ready'; g.phaseT = 0;
        if (g.demo) { g.dKey = [bfs(g.M.key.cx, g.M.key.cy, true), bfs(g.M.key.cx, g.M.key.cy)]; g.dDoor = [bfs(COLS - 1, g.M.doorRow, true), bfs(COLS - 1, g.M.doorRow)]; }
      }
      function spawnPlayer(cx, cy) {
        g.p = { x: ctr(cx), y: ctr(cy), dir: -1, face: 1, acc: 0, anim: 0, warpCool: 30 };
        g.foes = []; g.beam = null; g.bombs = 1; g.pcell = -1;
        g.M.nests.forEach(n => n.cool = 90 + irnd(120));
        g.cam = Math.max(0, Math.min(WW - W, g.p.x - W / 2));
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 40000; snd.life(); }
        if (g.score > hi) hi = g.score;
      }
      const maxFoes = () => Math.min(8, 3 + g.level);
      const foeSpeed = () => Math.min(1.15, 0.55 + g.level * 0.1);

      function playerWant() {
        const keys = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
        if (g.demo) return demoWant();
        for (let d = 0; d < 4; d++) if (api.pressed(keys[d])) lastDir = d;
        if (lastDir >= 0 && api.key(keys[lastDir])) return lastDir;
        for (let d = 0; d < 4; d++) if (api.key(keys[d])) return d;
        return -1;
      }
      function demoWant() {
        const p = g.p, maps = g.hasKey ? g.dDoor : g.dKey;
        if (!atCenter(p)) return p.dir;
        const [cx, cy] = cellOf(p);
        for (const dist of maps) {
          let best = -1, bd = 1e9;
          for (let d = 0; d < 4; d++) {
            if (!openM(g.M, cx, cy, d)) continue;
            const v = dist[(cx + DX[d]) + (cy + DY[d]) * COLS];
            if (v >= 0 && v < 30000 && v < bd) { bd = v; best = d; }
          }
          if (best >= 0) return best;
        }
        return -1;
      }

      function fire(dir) {
        if (g.beam) return;
        if (g.time <= 0) { snd.fizzle(); return; }
        const p = g.p;
        if ((p.y - 16) % PITCH !== 0) { snd.fizzle(); g.fx.push({ t: 'spark', x: p.x + dir * 6, y: p.y, life: 6 }); return; }
        g.beam = { x: p.x, y: p.y, dir, range: 200, life: 0 };
        if (!g.demo) snd.laser();
      }
      function stepBeam() {
        const b = g.beam;
        b.life++;
        for (let i = 0; i < 6; i++) {
          if ((b.x - 16) % PITCH === 0 && !openM(g.M, cxOf(b.x), cyOf(b.y), b.dir > 0 ? 1 : 3)) { g.fx.push({ t: 'spark', x: b.x + b.dir * 7, y: b.y, life: 6 }); g.beam = null; return; }
          b.x += b.dir; b.range--;
          if (b.range <= 0 || b.x < 0 || b.x > WW) { g.beam = null; return; }
          for (const f of g.foes) {
            if (f.pop > 0 || f.dead) continue;
            if (Math.abs(f.y - b.y) < 8 && Math.abs(f.x - b.x) < 6) { killFoe(f); g.beam = null; return; }
          }
        }
      }
      function killFoe(f) {
        f.dead = true;
        const pts = FOES[f.type].pts * (1 + Math.floor((g.level - 1) / 2));
        addScore(pts);
        g.pops.push({ x: f.x, y: f.y - 10, s: String(pts), t: 45 });
        g.fx.push({ t: 'boom', x: f.x, y: f.y, life: 18 });
        if (!g.demo) snd.kill();
      }
      function flashBomb() {
        if (g.bombs <= 0) return;
        g.bombs--; g.flashT = 24;
        for (const f of g.foes) if (!f.dead && f.x > g.cam - 8 && f.x < g.cam + W + 8) killFoe(f);
        if (!g.demo) snd.flash();
      }
      function spawnFoes() {
        const alive = g.foes.filter(f => !f.dead).length;
        for (const n of g.M.nests) {
          if (n.cool > 0) { n.cool--; continue; }
          const x = ctr(n.cx), y = ctr(n.cy);
          if (x < g.cam - 24 || x > g.cam + W + 24) continue;
          if (Math.abs(x - g.p.x) + Math.abs(y - g.p.y) < 40) continue;
          if (alive >= maxFoes()) return;
          n.cool = Math.max(120, 330 - g.level * 30) + irnd(120);
          const types = [[0, 1], [1, 2], [2, 3], [0, 3]][(g.level - 1) % 4];
          g.foes.push({ x, y, dir: -1, acc: 0, type: types[irnd(2)], pop: 36, dead: false, anim: irnd(20), last: -1 });
          if (!g.demo) snd.spawn();
          return;
        }
      }
      function stepFoe(f) {
        if (atCenter(f)) {
          const cx = cxOf(f.x), cy = cyOf(f.y), here = cx + cy * COLS;
          if (here !== f.last || f.dir < 0 || !openM(g.M, cx, cy, f.dir)) {
            f.last = here;
            const opts = [];
            for (let d = 0; d < 4; d++) if (openM(g.M, cx, cy, d)) opts.push(d);
            const nonRev = opts.filter(d => d !== (f.dir + 2) % 4);
            const pool = nonRev.length ? nonRev : opts;
            const erratic = f.type === 2 ? 0.35 : 0.15;
            if (Math.random() < erratic) f.dir = pool[irnd(pool.length)];
            else {
              let best = pool[0], bd = 1e9;
              for (const d of pool) { const v = g.dist[(cx + DX[d]) + (cy + DY[d]) * COLS]; if (v >= 0 && v < bd) { bd = v; best = d; } }
              f.dir = best;
            }
          }
        }
        if (f.dir >= 0 && canMove(f.x, f.y, f.dir)) { f.x += DX[f.dir]; f.y += DY[f.dir]; }
        else f.dir = -1;
      }

      function die() { g.phase = 'dying'; g.phaseT = 0; g.beam = null; if (!g.demo) snd.die(); }
      function updateGame() {
        g.phaseT++;
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        for (const f of g.fx) f.life--;
        g.fx = g.fx.filter(f => f.life > 0);
        if (g.flashT > 0) g.flashT--;
        if (g.phase === 'ready') { if (g.phaseT > (g.demo ? 40 : 120)) g.phase = 'play'; return; }
        if (g.phase === 'over') { if (g.phaseT > 240 || (g.phaseT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; page = 0; T = 0; } return; }
        if (g.phase === 'wait') return;
        if (g.phase === 'clear') {
          if (g.phaseT % 4 === 0 && g.time > 0) { const k = Math.min(g.time, 120); g.time -= k; addScore(Math.round(k / 60 * 10)); if (!g.demo && g.phaseT % 8 === 0) snd.tick(); }
          if (g.phaseT > 200 && g.time <= 0) { if (g.demo) { mode = 'title'; page = 0; T = 0; return; } startLevel(g.level + 1); }
          return;
        }
        if (g.phase === 'dying') {
          if (g.phaseT > 120) {
            if (g.demo) { mode = 'title'; page = 0; T = 0; return; }
            g.lives--;
            if (g.lives <= 0) {
              g.phase = 'wait'; g.phaseT = 0;
              const gameOver = () => { g.phase = 'over'; g.phaseT = 0; api.setHiScore(g.score); snd.over(); };
              if (api.offerContinue) api.offerContinue(() => { g.lives = 3; g.time = Math.max(g.time, 120 * 60); spawnPlayer(g.zone * ZONE, 3); g.phase = 'ready'; g.phaseT = 0; }, gameOver);
              else gameOver();
            } else { spawnPlayer(g.zone * ZONE, 3); g.phase = 'ready'; g.phaseT = 0; }
          }
          return;
        }
        // --- play ---
        const p = g.p;
        if (g.time > 0) { g.time--; if (!g.demo && g.time > 0 && g.time < 20 * 60 && g.time % 60 === 0) snd.tick(); }
        // fire / flash
        if (g.demo) {
          for (const f of g.foes) {
            if (f.dead || f.pop) continue;
            if (Math.abs(f.y - p.y) < 6 && Math.abs(f.x - p.x) < 90) { p.face = f.x > p.x ? 1 : -1; fire(p.face); break; }
            if (Math.abs(f.x - p.x) + Math.abs(f.y - p.y) < 18) flashBomb();
          }
        } else {
          if (api.pressed('Space')) {
            let d = p.face;
            if (api.key('ArrowLeft')) d = -1; else if (api.key('ArrowRight')) d = 1;
            p.face = d; fire(d);
          }
          if (api.anyPressed('KeyX', 'KeyZ')) flashBomb();
        }
        // move player
        p.acc += 1.0;
        let moved = false;
        while (p.acc >= 1) {
          p.acc -= 1;
          const want = playerWant();
          if (want < 0) break;
          if (canMove(p.x, p.y, want)) p.dir = want;
          else if (p.dir >= 0 && !canMove(p.x, p.y, p.dir)) p.dir = -1;
          if (p.dir < 0) break;
          p.x += DX[p.dir]; p.y += DY[p.dir]; moved = true;
          if (DX[p.dir]) p.face = DX[p.dir];
        }
        if (moved) p.anim++;
        if (p.warpCool > 0) p.warpCool--;
        if (atCenter(p) && moved) {
          const [cx, cy] = cellOf(p);
          const z = Math.floor(cx / ZONE);
          if (z > g.zone) g.zone = z;
          for (const w of g.M.warps) {
            if (p.warpCool > 0) break;
            const from = (w.a.cx === cx && w.a.cy === cy) ? w.a : (w.b.cx === cx && w.b.cy === cy) ? w.b : null;
            if (!from) continue;
            const to = from === w.a ? w.b : w.a;
            g.fx.push({ t: 'warp', x: p.x, y: p.y, life: 24 });
            p.x = ctr(to.cx); p.y = ctr(to.cy); p.warpCool = 90; p.dir = -1; g.cam = Math.max(0, Math.min(WW - W, p.x - W / 2));
            g.fx.push({ t: 'warp', x: p.x, y: p.y, life: 24 });
            if (!g.demo) snd.warp();
            if (Math.floor(to.cx / ZONE) > g.zone) g.zone = Math.floor(to.cx / ZONE);
          }
          if (cx === COLS - 1 && cy === g.M.doorRow) {
            if (g.hasKey) { g.phase = 'clear'; g.phaseT = 0; g.foes = []; g.beam = null; if (!g.demo) snd.door(); addScore(1000); return; }
            else if (p.dir === 1 || p.dir < 0) { if (!g.needKey) { g.needKey = 90; if (!g.demo) snd.needkey(); } }
          }
        }
        if (g.needKey > 0) g.needKey--;
        // pickups
        const k = g.M.key;
        if (!g.hasKey && Math.abs(p.x - ctr(k.cx)) + Math.abs(p.y - ctr(k.cy)) < 10) {
          g.hasKey = true; addScore(500); g.pops.push({ x: p.x, y: p.y - 12, s: 'KEY', t: 60 }); if (!g.demo) snd.key();
        }
        for (const t of g.M.treasures) {
          if (t.got || Math.abs(p.x - ctr(t.cx)) + Math.abs(p.y - ctr(t.cy)) >= 10) continue;
          t.got = true; const v = TREASURE[t.kind].pts; addScore(v); g.pops.push({ x: p.x, y: p.y - 12, s: String(v), t: 60 }); if (!g.demo) snd.treasure();
        }
        // camera
        const target = Math.max(0, Math.min(WW - W, p.x - W / 2));
        g.cam += Math.max(-3, Math.min(3, target - g.cam));
        // enemies
        const pc = cellOf(p), pi = pc[0] + pc[1] * COLS;
        if (pi !== g.pcell) { g.pcell = pi; g.dist = bfs(pc[0], pc[1]); }
        spawnFoes();
        if (g.beam) stepBeam();
        const sp = foeSpeed();
        for (const f of g.foes) {
          if (f.dead) continue;
          f.anim++;
          if (f.pop > 0) { f.pop--; continue; }
          f.acc += sp;
          while (f.acc >= 1) { f.acc -= 1; stepFoe(f); }
          if (f.x < g.cam - 140 || f.x > g.cam + W + 140) { f.dead = true; continue; }
          if (Math.abs(f.x - p.x) < 9 && Math.abs(f.y - p.y) < 9) { die(); return; }
        }
        g.foes = g.foes.filter(f => !f.dead);
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
          if (page === 1) { updateGame(); if (mode === 'title' && page === 1 && T > 1800) { page = 0; T = 0; } }
          else if (T > 600) { page = 1; T = 0; newGame(true); }
          return;
        }
        updateGame();
      }

      // ---------- rendering ----------
      function wallRect(ctx, x, y, w, h, th) {
        const sx = x - Math.round(g.cam), sy = PY + y;
        if (sx + w < 0 || sx > W) return;
        ctx.fillStyle = th.wall; ctx.fillRect(sx, sy, w, h);
        ctx.fillStyle = th.hi; ctx.fillRect(sx, sy, w, 1);
        ctx.fillStyle = th.lo;
        for (let yy = 3; yy < h; yy += 4) ctx.fillRect(sx, sy + yy, w, 1);
        for (let yy = 0; yy < h; yy += 4) ctx.fillRect(sx + (((y + yy) >> 2) & 1 ? 2 : 6), sy + yy, 1, 3);
      }
      function drawMaze(ctx) {
        const th = g.theme, M = g.M, cam = Math.round(g.cam);
        ctx.fillStyle = th.floor; ctx.fillRect(0, PY, W, WH);
        const c0 = Math.max(0, Math.floor(cam / PITCH) - 1), c1 = Math.min(COLS, Math.ceil((cam + W) / PITCH) + 1);
        for (let cx = c0; cx <= c1; cx++) {
          for (let cy = 0; cy <= ROWS; cy++) wallRect(ctx, cx * PITCH, cy * PITCH, 8, 8, th);
          if (cx >= COLS) continue;
          for (let cy = 0; cy < ROWS; cy++) {
            if (cy === 0) wallRect(ctx, cx * PITCH + 8, 0, 16, 8, th);
            if (!openM(M, cx, cy, 2)) wallRect(ctx, cx * PITCH + 8, (cy + 1) * PITCH, 16, 8, th);
            if (!openM(M, cx, cy, 1)) wallRect(ctx, (cx + 1) * PITCH, cy * PITCH + 8, 8, 16, th);
            if (cx === 0) wallRect(ctx, 0, cy * PITCH + 8, 8, 16, th);
          }
        }
        // zone markers on the floor
        for (let z = 1; z < 4; z++) { const sx = z * ZONE * PITCH + 8 - cam; if (sx > -4 && sx < W) { ctx.fillStyle = '#303030'; for (let y = 0; y < WH; y += 4) ctx.fillRect(sx, PY + y, 1, 2); } }
        // nests
        for (const n of M.nests) {
          const sx = ctr(n.cx) - cam, sy = PY + ctr(n.cy);
          if (sx < -10 || sx > W + 10) continue;
          ctx.fillStyle = '#000000'; ctx.fillRect(sx - 6, sy - 4, 12, 8);
          ctx.fillStyle = th.lo; ctx.fillRect(sx - 7, sy - 5, 14, 1); ctx.fillRect(sx - 7, sy + 4, 14, 1);
        }
        // warps
        for (const w of M.warps) for (const c of [w.a, w.b]) {
          const sx = ctr(c.cx) - cam, sy = PY + ctr(c.cy);
          if (sx < -10 || sx > W + 10) continue;
          const ph = (T >> 2) % 4;
          ctx.fillStyle = ['#ffffff', '#40e0ff', '#4060ff', '#40e0ff'][ph];
          ctx.fillRect(sx - 6, sy - 6, 12, 1); ctx.fillRect(sx - 6, sy + 5, 12, 1); ctx.fillRect(sx - 6, sy - 6, 1, 12); ctx.fillRect(sx + 5, sy - 6, 1, 12);
          ctx.fillStyle = '#4060ff'; ctx.fillRect(sx - 3, sy - 3, 6, 6);
        }
        // door
        const dx = WW - 8 - cam, dy = PY + M.doorRow * PITCH + 8;
        if (dx > -10 && dx < W + 10) {
          ctx.fillStyle = g.hasKey && (T >> 3) & 1 ? '#ffffff' : '#ffe040'; ctx.fillRect(dx, dy, 8, 16);
          ctx.fillStyle = '#a07010'; ctx.fillRect(dx + 2, dy + 2, 4, 12);
          ctx.fillStyle = '#000'; ctx.fillRect(dx + 3, dy + 7, 2, 3);
        }
        // key & treasures
        const k = M.key;
        if (!g.hasKey) drawSpr(ctx, KEY, ctr(k.cx) - cam, PY + ctr(k.cy), { col: (T >> 3) & 1 ? '#ffffff' : null });
        for (const t of M.treasures) if (!t.got) drawSpr(ctx, TREASURE[t.kind].spr, ctr(t.cx) - cam, PY + ctr(t.cy), {});
      }
      function drawGame(ctx) {
        const cam = Math.round(g.cam);
        drawMaze(ctx);
        for (const f of g.foes) {
          const sx = f.x - cam, sy = PY + f.y;
          if (f.pop > 0) { if (f.pop & 2) drawSpr(ctx, FOES[f.type].spr[0], sx, sy, { col: '#ffffff' }); continue; }
          drawSpr(ctx, FOES[f.type].spr[(f.anim >> 3) & 1], sx, sy, { flip: f.dir === 3 });
        }
        const p = g.p;
        if (g.phase === 'dying') {
          const k = g.phaseT;
          if (k < 60) drawSpr(ctx, HERO[0], p.x - cam, PY + p.y, { col: (k >> 2) & 1 ? '#ffffff' : '#ff3030', flip: (k >> 3) & 1 });
          else if (k < 100) { ctx.fillStyle = '#ffe040'; const r = (k - 60) / 2.5; for (let i = 0; i < 8; i++) ctx.fillRect(p.x - cam + Math.cos(i * 0.785) * r, PY + p.y + Math.sin(i * 0.785) * r, 2, 2); }
        } else if (g.phase !== 'clear' || (g.phaseT >> 2) & 1) {
          drawSpr(ctx, HERO[(p.anim >> 3) & 1], p.x - cam, PY + p.y, { flip: p.face < 0 });
        }
        if (g.beam) {
          const b = g.beam, sx = b.x - cam, sy = PY + b.y - 1;
          ctx.fillStyle = (T & 2) ? '#ffffff' : '#40e0ff';
          ctx.fillRect(b.dir > 0 ? sx - 14 : sx, sy, 14, 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, sy - 1, 3, 4);
        }
        for (const f of g.fx) {
          const sx = f.x - cam, sy = PY + f.y;
          if (f.t === 'boom') { const r = 18 - f.life; ctx.fillStyle = f.life & 2 ? '#ffe040' : '#ff3030'; for (let i = 0; i < 8; i++) ctx.fillRect(sx + Math.cos(i * 0.785) * r - 1, sy + Math.sin(i * 0.785) * r - 1, 2, 2); }
          else if (f.t === 'spark') { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 2, sy - 2, 4, 4); }
          else if (f.t === 'warp') { ctx.fillStyle = '#40e0ff'; const r = f.life / 2; ctx.fillRect(sx - r, sy - 1, r * 2, 2); ctx.fillRect(sx - 1, sy - r, 2, r * 2); }
        }
        for (const q of g.pops) text(ctx, q.s, q.x - cam, PY + q.y, '#ffffff', 1, 'center');
        if (g.flashT > 0 && (g.flashT >> 1) & 1) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(0, PY, W, WH); }
        drawHud(ctx);
        if (g.needKey > 0 && (g.needKey >> 3) & 1) text(ctx, 'FIND THE KEY!', W / 2, PY + WH / 2 - 4, '#ffe040', 1, 'center');
        if (g.phase === 'ready' && !g.demo) {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 48, PY + 80, 96, 26);
          text(ctx, g.theme.name, W / 2, PY + 83, '#ffe040', 1, 'center');
          text(ctx, g.zone ? 'ZONE ' + (g.zone + 1) : 'READY!', W / 2, PY + 95, '#ffffff', 1, 'center');
        }
        if (g.phase === 'clear') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, PY + 80, 120, 26); text(ctx, 'TOMB CLEARED!', W / 2, PY + 83, '#ffe040', 1, 'center'); text(ctx, 'TIME BONUS', W / 2, PY + 95, '#ffffff', 1, 'center'); }
        if (g.phase === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, PY + 84, 120, 24); text(ctx, 'GAME OVER', W / 2, PY + 89, '#ff3030', 2, 'center'); }
        if (g.demo) { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 46, PY + 4, 92, 12); drawCoin(ctx, PY + 6); }
      }
      function drawHud(ctx) {
        const sc = g && !g.demo ? g.score : 0;
        text(ctx, '1UP', 8, 2, '#ff3030'); text(ctx, String(sc).padStart(6, '0'), 8, 11, '#ffffff');
        text(ctx, 'HI-SCORE', W - 8, 2, '#ff3030', 1, 'right'); text(ctx, String(Math.max(hi, sc)).padStart(6, '0'), W - 8, 11, '#ffffff', 1, 'right');
        if (!g) return;
        // time bar
        const tf = Math.max(0, g.time) / (240 * 60);
        text(ctx, 'TIME', 8, 21, '#40e0ff');
        ctx.fillStyle = '#203040'; ctx.fillRect(36, 22, 180, 5);
        ctx.fillStyle = tf < 0.15 ? ((T >> 3) & 1 ? '#ff3030' : '#ffe040') : '#40e0ff'; ctx.fillRect(36, 22, Math.round(180 * tf), 5);
        if (g.time <= 0 && !g.demo && (T >> 4) & 1) text(ctx, 'NO LASER', W / 2, 21, '#ff3030', 1, 'center');
        // bottom row
        const by = PY + WH + 6;
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) drawSpr(ctx, HERO[0], 10 + i * 13, by + 5, {});
        text(ctx, 'FLASH', 84, by + 2, '#ffffff');
        if (g.bombs > 0) { ctx.fillStyle = (T >> 3) & 1 ? '#ffffff' : '#ffe040'; ctx.fillRect(116, by + 2, 6, 7); }
        if (g.hasKey) drawSpr(ctx, KEY, 140, by + 5, {});
        text(ctx, g.theme.name.replace('TOMB ', 'T') + '-Z' + (g.zone + 1), W - 6, by + 2, '#c0c0c0', 1, 'right');
        // progress map strip
        ctx.fillStyle = '#404040'; ctx.fillRect(8, by + 14, W - 16, 1);
        ctx.fillStyle = '#ffe040'; ctx.fillRect(8 + Math.round((g.p.x / WW) * (W - 16)) - 1, by + 12, 3, 5);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(W - 9, by + 12, 2, 5);
      }
      function drawCoin(ctx, y) {
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, y, '#ffffff', 1, 'center');
      }
      function drawTitle(ctx) {
        const gg = g; g = null; drawHud(ctx); g = gg;
        text(ctx, 'TUTANKHAM', W / 2, 30, '#ffe040', 2, 'center');
        // a little sarcophagus-coloured frieze
        for (let x = 12; x < W - 12; x += 8) { ctx.fillStyle = (x >> 3) & 1 ? '#c06020' : '#40e0ff'; ctx.fillRect(x, 50, 6, 3); }
        let y = 62;
        FOES.forEach((f, i) => { drawSpr(ctx, f.spr[(T >> 4) & 1], 54, y + 4, {}); text(ctx, f.name, 72, y, '#ffffff'); text(ctx, f.pts + ' PTS', 176, y, '#40e0ff', 1, 'right'); y += 15; });
        y += 3;
        TREASURE.forEach(t => { drawSpr(ctx, t.spr, 54, y + 3, {}); text(ctx, t.name, 72, y, '#ffe040'); text(ctx, t.pts + ' PTS', 176, y, '#40e0ff', 1, 'right'); y += 13; });
        drawSpr(ctx, KEY, 54, y + 3, {}); text(ctx, 'KEY OPENS THE DOOR', 72, y, '#ffe040'); y += 16;
        text(ctx, 'LASER FIRES LEFT/RIGHT', W / 2, y, '#c0c0c0', 1, 'center'); y += 10;
        text(ctx, 'X: ONE FLASH BOMB PER LIFE', W / 2, y, '#c0c0c0', 1, 'center'); y += 16;
        drawCoin(ctx, y);
        text(ctx, credStr(), 4, H - 9, '#aaaaaa');
        text(ctx, '\u00a9 1982 KONAMI', W - 4, H - 9, '#aaaaaa', 1, 'right');
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
