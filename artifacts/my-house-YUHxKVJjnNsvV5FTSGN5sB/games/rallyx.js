// Rally-X (Namco, 1980) - scrolling hedge maze with radar, 10 flags (Special and Lucky), red pursuit cars, smokescreen, rocks, fuel and challenging stages.
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
    '"': [10, 10, 20, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2],
    '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // col: css colour or array of 7 per-row colours (gradient lettering)
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let r = 0; r < 7; r++) {
      ctx.fillStyle = typeof col === 'string' ? col : col[r];
      for (let i = 0; i < s.length; i++) {
        const g = FONT[s[i]]; if (!g) continue;
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
    return w;
  }
  function textS(ctx, s, x, y, col, sc, align) { // with 1px drop shadow / outline
    sc = sc || 1;
    text(ctx, s, x + 1, y + 1, '#000', sc, align);
    if (sc > 1) { text(ctx, s, x - 1, y, '#000', sc, align); text(ctx, s, x + 1, y, '#000', sc, align); text(ctx, s, x, y - 1, '#000', sc, align); text(ctx, s, x, y + sc, '#000', sc, align); }
    return text(ctx, s, x, y, col, sc, align);
  }

  // ---------- helpers ----------
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function paint(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const [c, x] = mkCanvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
      const col = pal[rows[j][i]];
      if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
    }
    return c;
  }
  // rotate char rows 90 degrees clockwise (an up-facing sprite becomes right-facing)
  function rot90(rows) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), out = [];
    for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x] || '.'; out.push(s); }
    return out;
  }
  function flipV(rows) { return rows.slice().reverse(); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const pad2 = n => String(Math.min(99, n)).padStart(2, '0');


  // ======================================================================
  // Rally-X: geometry
  // ======================================================================
  const W = 288, H = 224, VW = 224;          // playfield viewport is VW x H, the radar panel sits on the right
  const C = 16, COLS = 33, ROWS = 57, WW = COLS * C, WH = ROWS * C;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const START = { cx: 18, cy: 50 };
  const ENEMY_START = [[14, 54], [22, 54], [10, 54], [26, 54], [18, 54], [6, 54], [30, 54], [2, 54]];

  // A fixed city-block maze (same every round, like the original): a grid of 3x3 blocks with roads between,
  // then a seeded pass that fills in road segments to merge blocks, keeping every road cell connected.
  function buildMaze() {
    let seed = 1980;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const g = [];
    for (let y = 0; y < ROWS; y++) {
      const row = [];
      for (let x = 0; x < COLS; x++) row.push((x >= 2 && x <= 30 && y >= 2 && y <= 54 && (x % 4 === 2 || y % 4 === 2)) ? 0 : 1);
      g.push(row);
    }
    const segs = [];
    for (let y = 2; y <= 54; y += 4) for (let x = 2; x < 30; x += 4) segs.push([[x + 1, y], [x + 2, y], [x + 3, y]]);
    for (let x = 2; x <= 30; x += 4) for (let y = 2; y < 54; y += 4) segs.push([[x, y + 1], [x, y + 2], [x, y + 3]]);
    for (let i = segs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = segs[i]; segs[i] = segs[j]; segs[j] = t; }
    const connected = () => {
      let total = 0, sx = -1, sy = -1;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!g[y][x]) { total++; if (sx < 0) { sx = x; sy = y; } }
      const seen = new Uint8Array(COLS * ROWS), q = [sx, sy]; seen[sy * COLS + sx] = 1; let n = 0;
      while (q.length) {
        const y = q.pop(), x = q.pop(); n++;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d];
          if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !g[ny][nx] && !seen[ny * COLS + nx]) { seen[ny * COLS + nx] = 1; q.push(nx, ny); }
        }
      }
      return n === total;
    };
    let removed = 0;
    for (const s of segs) {
      if (removed >= 64) break;
      if (s.some(([x, y]) => x >= 12 && x <= 24 && y >= 45)) continue;   // keep the start area open
      for (const [x, y] of s) g[y][x] = 1;
      if (!connected()) { for (const [x, y] of s) g[y][x] = 0; } else removed++;
    }
    // a couple of wide plazas give the chase some open ground
    for (const [x0, y0] of [[7, 19], [23, 31]]) for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 3; x++) g[y][x] = 0;
    return g;
  }

  // ======================================================================
  // Pixel art (all facing up)
  // ======================================================================
  const CAR = [
    '....kkkkkk....',
    '...kXXXXXXk...',
    '.kkXXwwwwXXkk.',
    'kkkXwwwwwwXkkk',
    'kkkXXXXXXXXkkk',
    '..kXXXXXXXXk..',
    '..kXXYXXYXXk..',
    '..kXXXXXXXXk..',
    '..kXwwwwwwXk..',
    'kkkXwwwwwwXkkk',
    'kkkXXXXXXXXkkk',
    'kkkXXXXXXXXkkk',
    '..kXrXXXXrXk..',
    '...kkkkkkkk...'];
  const FLAG = [
    'w.........',
    'wYYYYYYY..',
    'wYYYYYYYY.',
    'wYYYYYYYY.',
    'wYYYYYYYY.',
    'wYYYYYYY..',
    'w.........',
    'w.........',
    'w.........',
    'ww........'];
  const ROCK = [
    '....kkkk....',
    '..kkLLLLkk..',
    '.kLLLWLLLGk.',
    '.kLWWLLLLGk.',
    'kLLLLLLLGGGk',
    'kLLLLLGGGGGk',
    'kGLLLGGGGGGk',
    'kGGGGGGGDDGk',
    '.kGGGGDDDDk.',
    '.kDGGDDDDDk.',
    '..kkDDDDkk..',
    '....kkkk....'];
  const CRASH = [
    '.....Y......Y.',
    '..Y..YY....YY.',
    '...YYYYY..YY..',
    '...YRRRYYYY...',
    'YYYRRWWRRY....',
    '.YYRWWWWRRYYYY',
    '..YRWWWWWRY...',
    '...YRWWWRRYY..',
    '..YYRRRRRYY...',
    '.YY.YYRRYY....',
    'YY...YYYYYY...',
    '....YY...YY...',
    '...YY.....Y...',
    '..............'];

  function carSet(body, accent) {
    const pal = { k: '#101010', X: body, w: '#d8f0ff', Y: '#ffe060', r: accent };
    const out = []; let rows = CAR;
    for (let i = 0; i < 4; i++) { out.push(paint(rows, pal)); rows = rot90(rows); }
    return out;
  }

  // ======================================================================
  // Music: an original bouncy rally loop (square lead + triangle bass)
  // ======================================================================
  const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, G3: 196, C3: 131, F3: 175, A3: 220, E3: 165, D3: 147 };
  const LEAD = ['G4', 0, 'C5', 'E5', 'G5', 0, 'E5', 0, 'F5', 'E5', 'D5', 0, 'C5', 0, 'D5', 0,
    'E5', 0, 'G5', 'E5', 'C5', 0, 'A4', 0, 'G4', 'A4', 'C5', 0, 'D5', 0, 0, 0,
    'A4', 0, 'C5', 'F5', 'A5', 0, 'F5', 0, 'G5', 'F5', 'E5', 0, 'D5', 0, 'E5', 0,
    'F5', 'E5', 'D5', 'C5', 'B4', 0, 'D5', 0, 'C5', 0, 'G4', 0, 'C5', 0, 0, 0];
  const BASS = ['C3', 'G3', 'C3', 'G3', 'C3', 'G3', 'C3', 'G3', 'F3', 'C4', 'F3', 'C4', 'G3', 'D4', 'G3', 'D4'];

  ArcadeRegistry.register({
    id: 'rallyx', title: 'Rally-X', year: 1980, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: steer \u00b7 Space: smokescreen \u00b7 Enter: start',
    marquee: { bg: '#001048', fg: '#ffe040', accent: '#ff2020' },
    create(api) {
      const au = api.audio;
      const MAZE = buildMaze();
      const isRoad = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && MAZE[y][x] === 0;

      // ---------- pre-rendered world map ----------
      const [mapCv, mx] = mkCanvas(WW, WH);
      (function drawMap() {
        let s = 77; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        mx.fillStyle = '#1c1c2e'; mx.fillRect(0, 0, WW, WH);
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const px = x * C, py = y * C;
          if (MAZE[y][x]) {
            mx.fillStyle = '#187818'; mx.fillRect(px, py, C, C);
            mx.fillStyle = '#28a428';
            for (let i = 0; i < 6; i++) mx.fillRect(px + Math.floor(r() * 14), py + Math.floor(r() * 14), 2, 2);
            if (r() < 0.35) { mx.fillStyle = r() < 0.5 ? '#ffd840' : '#ff70a0'; const fx = px + 3 + Math.floor(r() * 9), fy = py + 3 + Math.floor(r() * 9); mx.fillRect(fx, fy, 2, 2); mx.fillStyle = '#fff'; mx.fillRect(fx, fy, 1, 1); }
            // kerb edge where the hedge meets the road
            mx.fillStyle = '#e0e0c0';
            if (isRoad(x, y - 1)) mx.fillRect(px, py, C, 1);
            if (isRoad(x, y + 1)) mx.fillRect(px, py + C - 1, C, 1);
            if (isRoad(x - 1, y)) mx.fillRect(px, py, 1, C);
            if (isRoad(x + 1, y)) mx.fillRect(px + C - 1, py, 1, C);
          } else {
            mx.fillStyle = '#2a2a40'; mx.fillRect(px, py, C, C);
            mx.fillStyle = '#323250';
            if ((x + y) & 1) mx.fillRect(px + 7, py + 7, 2, 2);
          }
        }
      })();

      // ---------- sprites ----------
      const PCAR = carSet('#2c64ff', '#ff4040');
      const ECAR = carSet('#e01818', '#ffe060');
      const FLAG_N = paint(FLAG, { w: '#ffffff', Y: '#ffd800' });
      const FLAG_S = paint(FLAG.map((r, i) => i === 2 ? 'wYYRRRYYY.' : i === 3 ? 'wYYRYYYYY.' : i === 4 ? 'wYYYRRRYY.' : r), { w: '#fff', Y: '#ffd800', R: '#e00000' });
      const FLAG_L = paint(FLAG.map((r, i) => i >= 2 && i <= 4 ? (i === 4 ? 'wYYRRRRYY.' : 'wYYRYYYYY.') : r), { w: '#fff', Y: '#40e0ff', R: '#0020a0' });
      const ROCKI = paint(ROCK, { k: '#202020', L: '#d0c8b0', W: '#ffffff', G: '#988e78', D: '#605848' });
      const CRASHI = paint(CRASH, { Y: '#ffe040', R: '#ff3010', W: '#ffffff' });

      // ---------- state ----------
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      function newGame() {
        g = { score: 0, lives: 2, round: 0, extraGiven: false, phase: 'ready', t: 0, pops: [], musicStep: 0 };
        nextRound();
      }
      const isChallenge = r => r % 4 === 3;
      function nextRound() {
        g.round++;
        g.challenge = isChallenge(g.round);
        g.fuel = 100; g.flagCount = 0; g.special = false;
        placeObjects();
        resetPositions();
        g.phase = 'ready'; g.t = g.round === 1 ? 200 : 150;
        au.melody([[523, .08], [659, .08], [784, .08], [1047, .14], [0, .06], [784, .08], [1047, .25]], { type: 'square', vol: .1 });
      }
      function placeObjects() {
        const roads = [];
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!MAZE[y][x]) roads.push([x, y]);
        const far = (x, y, d) => Math.abs(x - START.cx) + Math.abs(y - START.cy) >= d;
        for (let attempt = 0; attempt < 60; attempt++) {
          // rocks: never on junctions, never near the start
          g.rocks = []; g.rockSet = new Set();
          const nRocks = g.challenge ? 10 : Math.min(12, 2 + g.round);
          let guard = 0;
          while (g.rocks.length < nRocks && guard++ < 500) {
            const [x, y] = roads[Math.floor(Math.random() * roads.length)];
            const junction = (isRoad(x - 1, y) || isRoad(x + 1, y)) && (isRoad(x, y - 1) || isRoad(x, y + 1));
            if (junction || !far(x, y, 7) || y >= 53 || g.rockSet.has(y * COLS + x)) continue;
            if (g.rocks.some(r => Math.abs(r.cx - x) + Math.abs(r.cy - y) < 5)) continue;
            g.rocks.push({ cx: x, cy: y, x: x * C + 8, y: y * C + 8 }); g.rockSet.add(y * COLS + x);
          }
          // flags: 8 normal + Special + Lucky, spread out
          g.flags = [];
          guard = 0;
          while (g.flags.length < 10 && guard++ < 3000) {
            const [x, y] = roads[Math.floor(Math.random() * roads.length)];
            if (!far(x, y, 9) || g.rockSet.has(y * COLS + x) || y >= 53) continue;
            if (g.flags.some(f => Math.abs(f.cx - x) + Math.abs(f.cy - y) < 7)) continue;
            g.flags.push({ cx: x, cy: y, x: x * C + 8, y: y * C + 8, kind: 'N', got: false });
          }
          if (g.flags.length < 10) continue;
          g.flags[3].kind = 'S'; g.flags[7].kind = 'L';
          // every flag must be reachable without driving through a rock
          const seen = new Uint8Array(COLS * ROWS), q = [START.cx, START.cy]; seen[START.cy * COLS + START.cx] = 1;
          while (q.length) {
            const y = q.pop(), x = q.pop();
            for (let d = 0; d < 4; d++) {
              const nx = x + DX[d], ny = y + DY[d], k = ny * COLS + nx;
              if (isRoad(nx, ny) && !seen[k] && !g.rockSet.has(k)) { seen[k] = 1; q.push(nx, ny); }
            }
          }
          if (g.flags.every(f => seen[f.cy * COLS + f.cx])) {
            // on a challenging stage most of these spots hold parked enemy cars instead of rocks
            g.parkSpots = [];
            if (g.challenge) while (g.rocks.length > 2) { const r = g.rocks.pop(); g.rockSet.delete(r.cy * COLS + r.cx); g.parkSpots.push(r); }
            return;
          }
        }
        g.rocks = []; g.rockSet = new Set(); g.parkSpots = [];  // fallback: no rocks this round
      }
      function resetPositions() {
        g.player = { x: START.cx * C + 8, y: START.cy * C + 8, dir: 0, want: 0, spd: 1.45, stall: 0 };
        const n = g.challenge ? 8 : Math.min(8, 3 + Math.floor((g.round - 1) / 2));
        g.enemies = [];
        for (let i = 0; i < n; i++) {
          let [cx, cy] = ENEMY_START[i];
          if (g.challenge && g.parkSpots[i]) { cx = g.parkSpots[i].cx; cy = g.parkSpots[i].cy; }
          g.enemies.push({ x: cx * C + 8, y: cy * C + 8, dir: g.challenge ? (isRoad(cx, cy - 1) ? 0 : 1) : 0, enemy: true, stun: 0, wait: g.challenge ? 0 : 90 + i * 70, kind: i % 3, rand: 0.08 + (i % 4) * 0.03, tx: 16, ty: 2, spinA: 0, parked: g.challenge });
        }
        g.smoke = []; g.smokeCD = 0;
      }

      // ---------- coin-op ----------
      function pollCoins() {
        if (api.credits > lastCred) au.tone(1568, .06, { type: 'square', vol: .08, slideTo: 2093 });
        lastCred = api.credits;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(110, .25, { type: 'square', vol: .14 });
        return false;
      }

      // ---------- scoring ----------
      function addScore(n) {
        g.score += n;
        if (!g.extraGiven && g.score >= 20000) { g.extraGiven = true; g.lives++; au.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .15]], { type: 'square', vol: .1 }); }
        if (g.score > hi) { hi = g.score; }
      }
      function pop(x, y, txt, col) { g.pops.push({ x, y, txt, col, t: 70 }); }

      // ---------- grid movement ----------
      const cellOf = v => Math.floor(v / C), centre = c => c * C + C / 2;
      function move(e, dist, decide) {
        let guard = 0;
        while (dist > 1e-4 && guard++ < 6) {
          const cx = cellOf(e.x), cy = cellOf(e.y), ccx = centre(cx), ccy = centre(cy);
          let d = (ccx - e.x) * DX[e.dir] + (ccy - e.y) * DY[e.dir];
          if (Math.abs(d) <= 1e-4) {
            e.x = ccx; e.y = ccy;
            const nd = decide(e, cx, cy);
            if (nd < 0) return false;
            e.dir = nd;
            const st = Math.min(dist, C - 0.01);
            e.x += DX[e.dir] * st; e.y += DY[e.dir] * st; dist -= st;
            continue;
          }
          if (d < 0) d += C;
          const st = Math.min(dist, d);
          e.x += DX[e.dir] * st; e.y += DY[e.dir] * st; dist -= st;
        }
        return true;
      }
      function playerDecide(e, cx, cy) {
        const ok = d => isRoad(cx + DX[d], cy + DY[d]);
        if (e.want >= 0 && ok(e.want)) return e.want;
        if (ok(e.dir)) return e.dir;
        // the rally car steers itself around a dead stop: try right, then left, then back
        const r = (e.dir + 1) % 4, l = (e.dir + 3) % 4;
        if (ok(r) && ok(l)) return Math.random() < 0.5 ? r : l;
        if (ok(r)) return r;
        if (ok(l)) return l;
        if (ok((e.dir + 2) % 4)) return (e.dir + 2) % 4;
        return -1;
      }
      function enemyBlocked(x, y) { return !isRoad(x, y) || g.rockSet.has(y * COLS + x); }
      function enemyDecide(e, cx, cy) {
        const opts = [];
        for (let d = 0; d < 4; d++) if (d !== (e.dir + 2) % 4 && !enemyBlocked(cx + DX[d], cy + DY[d])) opts.push(d);
        if (!opts.length) { const rv = (e.dir + 2) % 4; return enemyBlocked(cx + DX[rv], cy + DY[rv]) ? -1 : rv; }
        if (opts.length === 1) return opts[0];
        if (Math.random() < e.rand) return opts[Math.floor(Math.random() * opts.length)];
        let best = opts[0], bd = 1e9;
        for (const d of opts) {
          const nx = cx + DX[d], ny = cy + DY[d];
          const dd = (nx - e.tx) * (nx - e.tx) + (ny - e.ty) * (ny - e.ty);
          if (dd < bd) { bd = dd; best = d; }
        }
        return best;
      }

      // ---------- play ----------
      function die(why) {
        g.phase = 'dying'; g.t = 130; g.why = why || '';
        au.noise(0.6, { vol: .25, freq: 1800, slideTo: 200 });
        au.tone(400, .7, { type: 'sawtooth', vol: .12, slideTo: 60 });
      }
      function updatePlay() {
        const p = g.player;
        // input: remember the last direction asked for
        const KEYS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
        for (let d = 0; d < 4; d++) if (api.pressed(KEYS[d])) p.want = d;
        if (!api.key(KEYS[p.want])) for (let d = 0; d < 4; d++) if (api.key(KEYS[d])) p.want = d;
        if (p.want === (p.dir + 2) % 4) p.dir = p.want;   // reverse at any time

        // fuel
        const drain = g.challenge ? 100 / (60 * 38) : 100 / (60 * (82 - Math.min(20, g.round * 2)));
        if (g.fuel > 0) {
          g.fuel = Math.max(0, g.fuel - drain);
          if (g.fuel < 25 && frame % 40 === 0) au.tone(1200, .05, { type: 'square', vol: .07 });
          if (g.fuel === 0) { pop(p.x, p.y - 12, 'OUT OF FUEL', '#ff4040'); au.melody([[600, .1], [450, .1], [300, .2]], { type: 'square', vol: .1 }); }
        } else {
          p.spd = Math.max(0, p.spd - 0.012);
          if (p.spd === 0 && ++p.stall > 100) { die('OUT OF FUEL'); return; }
        }
        // smokescreen (costs fuel)
        if (g.smokeCD > 0) g.smokeCD--;
        if (api.key('Space') && g.smokeCD === 0 && g.fuel > 1.5 && (api.pressed('Space') || frame % 2 === 0)) {
          g.smoke.push({ x: p.x - DX[p.dir] * 10, y: p.y - DY[p.dir] * 10, t: 150 });
          g.fuel -= 1.2; g.smokeCD = 14;
          au.noise(0.25, { vol: .14, freq: 900, slideTo: 300 });
        }
        for (const s of g.smoke) s.t--;
        g.smoke = g.smoke.filter(s => s.t > 0);

        move(p, p.spd, playerDecide);

        // enemies
        const esp = Math.min(1.6, 1.08 + 0.05 * (g.round - 1));
        const pcx = cellOf(p.x), pcy = cellOf(p.y);
        g.enemies.forEach((e, i) => {
          if (e.parked) { if (g.fuel <= 0) e.parked = false; else return; }
          if (e.wait > 0) { e.wait--; return; }
          if (e.stun > 0) { e.stun--; e.spinA = (e.spinA + (e.stun % 6 === 0 ? 1 : 0)) % 4; return; }
          // targets: chaser / ambusher / roamer
          if (e.kind === 0) { e.tx = pcx; e.ty = pcy; }
          else if (e.kind === 1) { e.tx = pcx + DX[p.dir] * 5; e.ty = pcy + DY[p.dir] * 5; }
          else {
            if (frame % 360 < 140) { if (frame % 120 === i * 7) { e.tx = 2 + Math.floor(Math.random() * 29); e.ty = 2 + Math.floor(Math.random() * 53); } }
            else { e.tx = pcx; e.ty = pcy; }
          }
          move(e, esp + (i % 2) * 0.04, enemyDecide);
          for (const s of g.smoke) {
            if (Math.abs(s.x - e.x) < 12 && Math.abs(s.y - e.y) < 12) { e.stun = 160; au.tone(1500, .2, { type: 'triangle', vol: .1, slideTo: 300 }); break; }
          }
        });
        // collisions
        for (const e of g.enemies) {
          if (e.wait > 0) continue;
          if (Math.abs(e.x - p.x) < 12 && Math.abs(e.y - p.y) < 12) { die(); return; }
        }
        for (const r of g.rocks) if (Math.abs(r.x - p.x) < 12 && Math.abs(r.y - p.y) < 12) { die(); return; }
        for (const f of g.flags) {
          if (f.got || Math.abs(f.x - p.x) > 8 || Math.abs(f.y - p.y) > 8) continue;
          f.got = true; g.flagCount++;
          let v = g.flagCount * 100;
          if (g.special) v *= 2;
          addScore(v); pop(f.x, f.y - 10, String(v), '#ffffff');
          if (f.kind === 'S') {
            g.special = true; pop(f.x, f.y + 4, 'SPECIAL', '#ff6060');
            au.melody([[784, .06], [988, .06], [1175, .06], [1568, .06], [1175, .06], [1568, .14]], { type: 'square', vol: .12 });
          } else if (f.kind === 'L') {
            const b = Math.floor(g.fuel) * 10 * (g.special ? 2 : 1);
            addScore(b); pop(f.x, f.y + 4, 'LUCKY ' + b, '#40e0ff');
            au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .06], [1568, .06], [2093, .2]], { type: 'square', vol: .12 });
          } else {
            au.melody([[1319, .05], [1760, .05], [2637, .09]], { type: 'square', vol: .1 });
          }
          if (g.flagCount >= 10) {
            g.phase = 'tally'; g.t = 0; g.tallyFuel = Math.floor(g.fuel);
            au.melody([[784, .1], [784, .1], [1047, .1], [1319, .1], [1568, .2], [1319, .1], [1568, .35]], { type: 'square', vol: .12 });
          }
          break;
        }
        // music
        if (frame % 8 === 0) {
          const st = g.musicStep++ % LEAD.length;
          const n = LEAD[st]; if (n) au.tone(N[n], .11, { type: 'square', vol: .045 });
          if (st % 4 === 0) { const b = BASS[(st >> 2) % BASS.length]; au.tone(N[b], .22, { type: 'triangle', vol: .09 }); }
        }
      }

      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.t = 300;
        au.melody([[523, .18], [392, .18], [330, .18], [262, .5]], { type: 'square', vol: .1 });
      }

      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        for (const pp of g.pops) { pp.t--; pp.y -= 0.15; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') { updatePlay(); return; }
        if (g.phase === 'dying') {
          if (--g.t > 0) return;
          const respawn = () => { g.fuel = Math.max(g.fuel, 55); resetPositions(); g.phase = 'ready'; g.t = 110; };
          if (g.lives <= 0) {
            g.phase = 'wait';
            if (api.offerContinue) api.offerContinue(() => { g.lives = 2; respawn(); }, gameOver);
            else gameOver();
          } else { g.lives--; respawn(); }
          return;
        }
        if (g.phase === 'tally') {
          g.t++;
          if (g.t > 60 && g.tallyFuel > 0 && g.t % 2 === 0) {
            g.tallyFuel--; g.fuel = g.tallyFuel; addScore(10);
            if (g.t % 4 === 0) au.tone(880 + g.tallyFuel * 6, .03, { type: 'square', vol: .07 });
          }
          if (g.t > 60 && g.t < 1000 && g.tallyFuel <= 0) g.t = 1000;
          if (g.t > 1100) nextRound();
          return;
        }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
        }
      }

      // ======================================================================
      // Rendering
      // ======================================================================
      function drawCar(ctx, set, x, y, dir) { ctx.drawImage(set[dir], Math.round(x - 7), Math.round(y - 7)); }
      function drawPanel(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(VW, 0, W - VW, H);
        text(ctx, 'HI-SCORE', 256, 3, '#ff3030', 1, 'center');
        text(ctx, String(hi), 284, 12, '#ffffff', 1, 'right');
        text(ctx, '1UP', 236, 24, (frame >> 4) & 1 || mode === 'title' ? '#ff3030' : '#000', 1);
        text(ctx, String(g ? g.score : 0), 284, 33, '#ffffff', 1, 'right');
        // radar
        const rx = 228, ry = 46, rw = 56, rh = 97, sx = rw / WW, sy = rh / WH;
        ctx.fillStyle = '#0828a0'; ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
        ctx.fillStyle = '#001060'; ctx.fillRect(rx, ry, rw, rh);
        if (g) {
          for (const f of g.flags) if (!f.got) { ctx.fillStyle = f.kind === 'S' ? '#ff6060' : f.kind === 'L' ? '#40e0ff' : '#ffe000'; ctx.fillRect(rx + Math.floor(f.x * sx) - 1, ry + Math.floor(f.y * sy) - 1, 2, 2); }
          if ((frame >> 3) & 1) for (const e of g.enemies) { ctx.fillStyle = '#ff2020'; ctx.fillRect(rx + Math.floor(e.x * sx) - 1, ry + Math.floor(e.y * sy) - 1, 2, 2); }
          ctx.fillStyle = '#ffffff'; ctx.fillRect(rx + Math.floor(g.player.x * sx) - 1, ry + Math.floor(g.player.y * sy) - 1, 3, 3);
        }
        // fuel
        text(ctx, 'FUEL', 228, 148, '#ffe040', 1);
        ctx.fillStyle = '#303030'; ctx.fillRect(228, 158, 56, 6);
        const fu = g ? g.fuel : 100;
        ctx.fillStyle = fu < 25 ? ((frame >> 3) & 1 ? '#ff2020' : '#802020') : '#ffd000';
        ctx.fillRect(228, 158, Math.round(56 * fu / 100), 6);
        for (let i = 1; i < 4; i++) { ctx.fillStyle = '#000'; ctx.fillRect(228 + i * 14, 158, 1, 6); }
        // lives
        if (g) for (let i = 0; i < Math.min(4, g.lives); i++) ctx.drawImage(PCAR[0], 228 + i * 14, 170);
        // round and remaining flags
        if (g) {
          text(ctx, 'ROUND', 228, 190, '#40e0ff', 1);
          text(ctx, String(g.round), 284, 190, '#ffffff', 1, 'right');
          const left = g.flags.filter(f => !f.got).length;
          for (let i = 0; i < left; i++) ctx.drawImage(FLAG_N, 226 + (i % 5) * 12, 201 + Math.floor(i / 5) * 11);
        }
      }
      function drawField(ctx) {
        const p = g.player;
        const camX = Math.round(clamp(p.x - VW / 2, 0, WW - VW)), camY = Math.round(clamp(p.y - H / 2, 0, WH - H));
        ctx.drawImage(mapCv, camX, camY, VW, H, 0, 0, VW, H);
        const vis = (x, y) => x > camX - 16 && x < camX + VW + 16 && y > camY - 16 && y < camY + H + 16;
        for (const r of g.rocks) if (vis(r.x, r.y)) ctx.drawImage(ROCKI, r.x - 6 - camX, r.y - 6 - camY);
        for (const f of g.flags) if (!f.got && vis(f.x, f.y)) ctx.drawImage(f.kind === 'S' ? FLAG_S : f.kind === 'L' ? FLAG_L : FLAG_N, f.x - 4 - camX, f.y - 5 - camY);
        for (const s of g.smoke) {
          if (!vis(s.x, s.y)) continue;
          const k = s.t / 150, rr = Math.round(4 + (1 - k) * 4);
          ctx.fillStyle = k > 0.3 ? '#e8e8e8' : '#a0a0a0';
          const x = Math.round(s.x - camX), y = Math.round(s.y - camY);
          ctx.fillRect(x - rr, y - rr + 2, rr * 2, rr * 2 - 4); ctx.fillRect(x - rr + 2, y - rr, rr * 2 - 4, rr * 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - rr + 1, 3, 2);
        }
        for (const e of g.enemies) {
          if (e.wait > 0 || !vis(e.x, e.y)) continue;
          drawCar(ctx, ECAR, e.x - camX, e.y - camY, e.stun > 0 ? e.spinA : e.dir);
          if (e.stun > 0 && (frame >> 2) & 1) text(ctx, '*', e.x - camX + 3, e.y - camY - 12, '#ffff80');
        }
        if (g.phase === 'dying') {
          if ((g.t >> 3) & 1 || g.t < 40) ctx.drawImage(CRASHI, Math.round(p.x - 7 - camX), Math.round(p.y - 7 - camY));
          else drawCar(ctx, PCAR, p.x - camX, p.y - camY, (g.t >> 2) & 3);
        } else drawCar(ctx, PCAR, p.x - camX, p.y - camY, p.dir);
        for (const pp of g.pops) textS(ctx, pp.txt, Math.round(pp.x - camX), Math.round(pp.y - camY), pp.col, 1, 'center');

        if (g.phase === 'ready') {
          textS(ctx, g.challenge ? 'CHALLENGING STAGE' : 'ROUND ' + g.round, VW / 2, 80, '#40e0ff', 1, 'center');
          if (g.round === 1 && g.t > 110) textS(ctx, 'PLAYER ONE', VW / 2, 66, '#ffffff', 1, 'center');
          textS(ctx, 'READY!', VW / 2, 132, '#ffe040', 1, 'center');
          if (g.challenge) textS(ctx, 'GRAB THE FLAGS FAST!', VW / 2, 146, '#ffffff', 1, 'center');
        }
        if (g.phase === 'dying' && g.why && g.t < 100) textS(ctx, g.why, VW / 2, 80, '#ff4040', 1, 'center');
        if (g.phase === 'tally') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(30, 70, 164, 70);
          textS(ctx, g.challenge ? 'STAGE CLEAR!' : 'ROUND CLEAR!', VW / 2, 80, '#ffe040', 1, 'center');
          textS(ctx, 'FUEL BONUS', VW / 2, 100, '#40e0ff', 1, 'center');
          textS(ctx, String(Math.max(0, g.tallyFuel)) + ' X 10 PTS', VW / 2, 116, '#ffffff', 1, 'center');
        }
        if (g.phase === 'over' || g.phase === 'wait') textS(ctx, 'GAME OVER', VW / 2, 104, '#ff3030', 2, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, H);
        // logo with a chequered underline
        const cols = ['#ffffff', '#ffe868', '#ffd820', '#ffb000', '#ff8800', '#ff5800', '#e83000'];
        textS(ctx, 'RALLY-X', VW / 2, 22, cols, 4, 'center');
        for (let i = 0; i < 28; i++) { ctx.fillStyle = (i + ((titleT >> 3) & 1)) & 1 ? '#fff' : '#000'; ctx.fillRect(14 + i * 7, 56, 7, 3); ctx.fillStyle = (i + ((titleT >> 3) & 1) + 1) & 1 ? '#fff' : '#000'; ctx.fillRect(14 + i * 7, 59, 7, 3); }
        text(ctx, '- SCORE -', VW / 2, 70, '#40e0ff', 1, 'center');
        ctx.drawImage(FLAG_N, 40, 82); text(ctx, '100 200 300 ... 1000', 58, 84, '#ffffff', 1);
        ctx.drawImage(FLAG_S, 40, 98); text(ctx, 'SPECIAL: DOUBLES FLAGS', 58, 100, '#ff8080', 1);
        ctx.drawImage(FLAG_L, 40, 114); text(ctx, 'LUCKY: FUEL BONUS NOW', 58, 116, '#40e0ff', 1);
        ctx.drawImage(ROCKI, 39, 129); text(ctx, 'AVOID ROCKS', 58, 132, '#c8c0a8', 1);
        text(ctx, 'SPACE: SMOKESCREEN STUNS', VW / 2, 148, '#e0e0e0', 1, 'center');
        text(ctx, 'BONUS CAR AT 20000 PTS', VW / 2, 160, '#ffe040', 1, 'center');
        // little chase across the bottom
        const t = titleT % 420, px = -20 + t * 0.8;
        for (let i = 0; i < 3; i++) {
          const sx = px - 20 - i * 12; if (sx > -10 && t % 60 > i * 8) { ctx.fillStyle = '#d8d8d8'; ctx.fillRect(Math.round(sx), 186, 8, 8); }
        }
        drawCar(ctx, PCAR, px, 190, 1);
        for (let i = 0; i < 3; i++) drawCar(ctx, ECAR, px - 50 - i * 22, 190, (t > 200 && i === 0) ? (t >> 2) & 3 : 1);
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', VW / 2, 172, '#ff3030', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', VW / 2, 172, '#ff3030', 1, 'center');
        text(ctx, '\u00a9 1980 NAMCO', VW / 2, 204, '#ffffff', 1, 'center');
        text(ctx, 'CREDIT ' + pad2(api.credits), 4, 215, '#ffffff', 1);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') drawTitle(ctx); else drawField(ctx);
        drawPanel(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g, maze: MAZE, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
