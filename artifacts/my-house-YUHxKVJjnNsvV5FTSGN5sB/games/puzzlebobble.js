// Puzzle Bobble (Taito, 1994) \u2014 from-scratch recreation for the MAME32 Game Room.
// Aim the launcher, shoot coloured bubbles into the hexagonal cluster, match 3+ to pop them and drop anything left
// hanging. The ceiling press comes down every few shots. 1P puzzle mode with 36 hand-made rounds (then looping
// faster), and a VS-CPU mode where dropped bubbles are sent across to the rival's field. Bub cranks, Bob loads.
(function () {
  'use strict';
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
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function otext(ctx, s, x, y, col, sc, align, oc) {
    const o = sc > 1 ? 2 : 1; oc = oc || '#000';
    text(ctx, s, x - o, y, oc, sc, align); text(ctx, s, x + o, y, oc, sc, align); text(ctx, s, x, y - o, oc, sc, align); text(ctx, s, x, y + o, oc, sc, align);
    text(ctx, s, x, y, col, sc, align);
  }
  function compile(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), r = [], f = [];
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (c === '.' || !pal[c]) { x++; continue; }
        let l = 1; while (row[x + l] === c) l++;
        r.push([pal[c], x, y, l]); f.push([pal[c], w - x - l, y, l]); x += l;
      }
    });
    return { w, h: rows.length, r, f };
  }
  function spr(ctx, s, x, y, flip, col) {
    const rr = flip ? s.f : s.r; x = Math.round(x); y = Math.round(y);
    let last = null;
    for (const q of rr) { const c = col || q[0]; if (c !== last) { ctx.fillStyle = c; last = c; } ctx.fillRect(x + q[1], y + q[2], q[3], 1); }
  }

  const W = 320, H = 224, BW = 16, RH = 14, COLS = 8, VROWS = 12, GROWS = 14, TOP = 14;
  // bubble colours: red, yellow, blue, green, purple, orange, black, white
  const CN = 'rybgpokw';
  const BCOL = [
    ['#f03030', '#a01010', '#ff9090'], ['#f8d820', '#a88800', '#fff8a0'], ['#3060f0', '#1830a0', '#90b0ff'], ['#30c040', '#107018', '#a0f0a0'],
    ['#b040e0', '#601890', '#e0a0ff'], ['#ff8820', '#b04800', '#ffc890'], ['#404048', '#101014', '#9090a0'], ['#e0e0e8', '#8888a0', '#ffffff']];
  // pre-built bubble sprites (16x16 shaded circles)
  function bubbleRows() {
    const rows = [];
    for (let y = 0; y < 16; y++) {
      let s = '';
      for (let x = 0; x < 16; x++) {
        const dx = x - 7.5, dy = y - 7.5, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 7.9) s += '.';
        else if (d > 6.7) s += 'k';
        else if ((x - 4.5) ** 2 + (y - 4.5) ** 2 < 3.2) s += 'w';
        else if (dx + dy > 5.5) s += 'd';
        else if ((x - 5) ** 2 + (y - 5) ** 2 < 14) s += 'l';
        else s += 'b';
      }
      rows.push(s);
    }
    return rows;
  }
  const BROWS = bubbleRows();
  const BSPR = BCOL.map(c => compile(BROWS, { k: '#101018', b: c[0], d: c[1], l: c[2], w: '#ffffff' }));
  const GREY = compile(BROWS, { k: '#101018', b: '#707078', d: '#404048', l: '#a0a0a8', w: '#d0d0d0' });
  // Bub (green) / Bob (blue) bubble dragons
  const DRAGON = [
    '.....kkkkk........',
    '....kgggggk.......',
    '...kgggggggkkk....',
    '..kgggggggkwwwk...',
    '..kggggggkwwkwk...',
    '.kwkggggggkwwwk...',
    'kwwkggggggggkk....',
    '.kwkgggggggggk....',
    '..kgggggggggggk...',
    '..kggyyyyyggggk...',
    '.kwkgyyyyyggggk...',
    'kwwkgyyyyyyggk....',
    '.kwkgyyyyyyggk....',
    '..kggyyyyyggk.....',
    '...kggggggggk.....',
    '..kkgggkkgggkk....',
    '.kooookkooook.....',
    '.kkkkk..kkkkk.....'];
  const BUB = compile(DRAGON, { k: '#101810', g: '#40c840', y: '#f8e8a0', w: '#ffffff', o: '#f09020' });
  const BOB = compile(DRAGON, { k: '#101020', g: '#4890f0', y: '#f8e8a0', w: '#ffffff', o: '#f09020' });

  // ---- 36 hand-made round layouts (even rows 8 bubbles, odd rows 7, '.' empty) ----
  const LEVELS = [
    ['rryybbgg', 'rryybbg', 'bbggrryy', 'bggrryy'],
    ['bbbbbbbb', 'ryyyyyr', 'rbbbbbbr', '.ryyyr.', '..rbbr..'],
    ['gggggggg', 'gyyyyyg', 'ggpppgg.', '.gyyyg.', '..gppg..', '...g...'],
    ['r.y.b.g.', 'r.y.b.g', 'r.y.b.g.', 'r.y.b.g', 'g.b.y.r.'],
    ['rrrbbbyy', 'yyrrbbb', 'bbyyrrrb', 'gbbyyrr', 'ggbbyyrr', 'gggbbyy'],
    ['pppppppp', '.yyyyyy', '..gggg..', '...rr..', '...bb...'],
    ['yy....yy', 'gy...yg', 'bgy..ygb', 'bgy.ygb', 'rbgyygbr', 'rbgygbr'],
    ['rgbyrgby', 'gbyrgby', 'byrgbyrg', 'yrgbyrg', 'rgbyrgby'],
    ['kkkkkkkk', 'k.rrrrk', 'k.rrrr.k', 'k.....k', 'kkbbbbkk', 'yyyyyyy'],
    ['oooooooo', 'ryyyyyr', 'rrbbbbrr', '.rgggr.', '..rppr..', '...r...'],
    ['b.b.b.b.', 'yyyyyyy', '.r.r.r.r', 'ggggggg', 'p.p.p.p.', 'bbbbbbb'],
    ['rrrrrrrr', 'yyyyyyy', 'bbbbbbbb', 'ggggggg', 'pppppppp', 'ooooooo'],
    ['wwwwwwww', 'rwrwrwr', 'brbrbrbr', 'ybybyby', 'gygygygy'],
    ['yyyyyyyy', '.bbbbbb', '.rr..rr.', 'gg...gg', 'yy...yy.', 'b.....b'],
    ['p.....p.', 'pp...pp', 'pgp.pgp.', 'pggpggp', 'pgyyygp.', '.pyyyp.', '..prp...'],
    ['rbrbrbrb', 'brbrbrb', 'gygygygy', 'ygygygy', 'okokokok', 'kokokok'],
    ['gggggggg', 'bbbbbbb', 'g......g', 'b.....b', 'gyyyyyyg', 'bbbbbbb'],
    ['r......r', 'rr....r', 'yrr..rry', 'yyrrryy', 'byyrryyb', 'bbyyybb', 'gbbyybbg'],
    ['kkwwkkww', 'wkkwwkk', 'rrrrrrrr', 'wkkwwkk', 'kkwwkkww'],
    ['yyyyyyyy', 'rrrrrrr', '.bb..bb.', '.g...g.', '.pp..pp.', '.o...o.', '.yy..yy.'],
    ['bbbrrrgg', 'ybbbrrr', 'yybbbrrr', 'gyybbbr', 'ggyybbbr', 'pgyyybb'],
    ['oo.oo.oo', 'yo.oy.o', 'yy.yy.yy', 'gy.yg.y', 'gg.gg.gg', 'bg.gb.g'],
    ['pppppppp', 'p.....p', 'p.ry...p', 'p.yrb.p', 'p.gbg..p', 'ppppppp'],
    ['rgrgrgrg', 'grgrgrg', 'byrbyrby', 'yrbyrby', 'okwokwok', 'kwokwok'],
    ['y......y', 'yb....b', 'ybr..rby', 'ybrgrby', 'ybrggrby', 'ybrgrby', '.ybrrby.'],
    ['wwwwwwww', 'kkkkkkk', 'rrrrrrrr', 'ooooooo', 'yyyyyyyy', 'ggggggg', 'bbbbbbbb'],
    ['r.g.b.y.', '.p.o.kw', '.w.r.g.b', '.y.p.o.', '.k.w.rg.'],
    ['bbbbbbbb', 'bgggggb', 'bgrrrrgb', 'bgryrgb', 'bgrrrrgb', 'bgggggb', 'bbbbbbbb'],
    ['yyrryyrr', 'bbggbbg', 'pyrrpyrr', 'obggobg', 'kpyrkpyr', 'wobgwob'],
    ['g.......', 'gg.....', 'gyg.....', 'gyyg...', 'gyrygg..', 'gyrryyg', 'gyrbbryg'],
    ['.......p', '.....pp', '.....pop', '...poop', '...poyop', '.poyyop', '.poykyop'],
    ['rybgpokw', 'ybgpokw', 'bgpokwry', 'gpokwry', 'pokwrybg', 'okwrybg'],
    ['rrrrrrrr', 'r.....r', 'r.bbbb.r', 'r.b..br', 'r.b.yb.r', 'r.bbbb.', 'rrrrrrrr'],
    ['kwkwkwkw', 'wkwkwkw', 'yyyyyyyy', 'ppppppp', 'oooooooo', 'ggggggg', 'bbbbbbbb', 'rrrrrrr'],
    ['ygbrygbr', 'gbrygbr', 'brygbryg', 'rygbryg', 'ygbrygbr', 'gbrygbr', 'brygbryg'],
    ['pppppppp', 'oyyyyyo', 'oykkkkyo', 'oykwkyo', 'oykkkkyo', 'oyyyyyo', 'pppppppp', 'rrrrrrr']
  ];

  ArcadeRegistry.register({
    id: 'puzzlebobble', title: 'Puzzle Bobble', year: 1994, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: aim \u00b7 Space or Up: shoot \u00b7 Up/Down on title: 1P PUZZLE or VS CPU \u00b7 Enter: start',
    marquee: { bg: '#102060', fg: '#ffe040', accent: '#40d040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', mt = 0, coinFlash = 0, overT = 0, frame = 0, menu = 0;
      let G = null;
      const snd = {
        shoot() { au.tone(700, 0.08, { type: 'square', vol: 0.08, slideTo: 1100 }); },
        bounce() { au.tone(1500, 0.025, { type: 'square', vol: 0.05 }); },
        stick() { au.tone(300, 0.05, { type: 'triangle', vol: 0.1, slideTo: 200 }); },
        pop(n) { for (let i = 0; i < Math.min(n, 8); i++) au.tone(880 + i * 120, 0.06, { type: 'square', vol: 0.07, delay: i * 0.04 }); },
        drop(n) { au.tone(900, 0.4, { type: 'triangle', vol: 0.12, slideTo: 200 }); if (n > 3) au.melody([[1047, 0.06], [1319, 0.06], [1568, 0.12]], { type: 'square', vol: 0.08, delay: 0.3 }); },
        press() { au.noise(0.25, { vol: 0.18, freq: 500, slideTo: 80 }); au.tone(90, 0.2, { type: 'square', vol: 0.1 }); },
        warn() { au.tone(1200, 0.04, { type: 'square', vol: 0.04 }); },
        hurry() { au.melody([[1200, 0.05], [0, 0.04], [1200, 0.05]], { type: 'square', vol: 0.08 }); },
        crank() { au.tone(2200, 0.012, { type: 'square', vol: 0.02 }); },
        ready() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [0, 0.1], [1047, 0.25]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[784, 0.1], [659, 0.1], [784, 0.1], [1047, 0.15], [0, 0.05], [988, 0.1], [1047, 0.1], [1175, 0.1], [1319, 0.4]], { type: 'square', vol: 0.12 }); },
        lose() { au.melody([[523, 0.2], [494, 0.2], [466, 0.2], [440, 0.6]], { type: 'triangle', vol: 0.15 }); },
        garbage() { au.tone(200, 0.15, { type: 'sawtooth', vol: 0.07, slideTo: 400 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); return false;
      }

      // ---------- grid helpers ----------
      const ncols = r => (r & 1) ? COLS - 1 : COLS;
      function cellX(F, r, c) { return F.x0 + c * BW + ((r & 1) ? 16 : 8); }
      function cellY(F, r) { return TOP + (F.drop + r) * RH + 8; }
      function nbrs(r, c) {
        const out = [[r, c - 1], [r, c + 1]];
        if (r & 1) out.push([r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]);
        else out.push([r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]);
        return out.filter(([a, b]) => a >= 0 && a < GROWS && b >= 0 && b < ncols(a));
      }
      function emptyGrid() { const g = []; for (let r = 0; r < GROWS; r++) g.push(new Array(COLS).fill(-1)); return g; }
      function cloneGrid(g) { return g.map(r => r.slice()); }
      function group(grid, r, c) {
        const col = grid[r][c], seen = new Set([r * 8 + c]), out = [[r, c]], st = [[r, c]];
        while (st.length) { const [a, b] = st.pop(); for (const [x, y] of nbrs(a, b)) { const k = x * 8 + y; if (!seen.has(k) && grid[x][y] === col) { seen.add(k); out.push([x, y]); st.push([x, y]); } } }
        return out;
      }
      function floating(grid) {
        const seen = new Set(), st = [];
        for (let c = 0; c < COLS; c++) if (grid[0][c] >= 0) { seen.add(c); st.push([0, c]); }
        while (st.length) { const [a, b] = st.pop(); for (const [x, y] of nbrs(a, b)) { const k = x * 8 + y; if (!seen.has(k) && grid[x][y] >= 0) { seen.add(k); st.push([x, y]); } } }
        const out = [];
        for (let r = 0; r < GROWS; r++) for (let c = 0; c < ncols(r); c++) if (grid[r][c] >= 0 && !seen.has(r * 8 + c)) out.push([r, c]);
        return out;
      }
      function colorsOn(grid) { const s = new Set(); for (const row of grid) for (const v of row) if (v >= 0) s.add(v); return [...s]; }
      function count(grid) { let n = 0; for (const row of grid) for (const v of row) if (v >= 0) n++; return n; }
      function randColor(F) { const cs = colorsOn(F.grid); if (!cs.length) return Math.random() * F.ncolors | 0; return cs[Math.random() * cs.length | 0]; }

      // ---------- fields ----------
      function mkField(x0, cpu) {
        return { x0, grid: emptyGrid(), drop: 0, shots: 0, ang: 0, cur: 0, next: 0, fly: null, pops: [], falls: [], st: 'aim', idle: 0, cpu, cpuT: 0, cpuAng: 0,
          garbage: 0, ncolors: 6, anim: 0, shake: 0, loseT: 0, crank: 0, perDrop: 8, bobT: 0 };
      }
      function loadLevel(F, idx) {
        const L = LEVELS[idx % LEVELS.length], lp = Math.floor(idx / LEVELS.length);
        F.grid = emptyGrid(); F.drop = 0; F.shots = 0;
        L.forEach((row, r) => {
          for (let c = 0; c < ncols(r); c++) { const ch = row[c] || '.'; const k = CN.indexOf(ch); if (k >= 0) F.grid[r][c] = k; }
        });
        if (lp > 0) { // looped rounds: recolour for variety
          const perm = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
          for (const row of F.grid) for (let c = 0; c < COLS; c++) if (row[c] >= 0) row[c] = perm[row[c]];
        }
        for (const [r, c] of floating(F.grid)) F.grid[r][c] = -1;
        F.perDrop = Math.max(4, 8 - Math.floor(idx / 8) - lp);
        F.cur = randColor(F); F.next = randColor(F); F.fly = null; F.st = 'aim'; F.idle = 0; F.ang = 0;
      }
      function randomLayout(F, rows, ncol) {
        F.grid = emptyGrid(); F.drop = 0; F.shots = 0; F.ncolors = ncol;
        for (let r = 0; r < rows; r++) for (let c = 0; c < ncols(r); c++) {
          // clumpy random: copy a neighbour colour half the time
          const up = r > 0 ? F.grid[r - 1][Math.min(c, ncols(r - 1) - 1)] : -1, lf = c > 0 ? F.grid[r][c - 1] : -1;
          const k = Math.random();
          F.grid[r][c] = k < 0.3 && lf >= 0 ? lf : k < 0.5 && up >= 0 ? up : Math.random() * ncol | 0;
        }
        F.cur = randColor(F); F.next = randColor(F); F.fly = null; F.st = 'aim'; F.idle = 0; F.ang = 0;
      }

      // ---------- flight simulation ----------
      // advance a bubble one sub-step; returns 'stick' when it touches the cluster or the ceiling
      function stepBubble(F, b, grid) {
        b.x += b.vx; b.y += b.vy;
        const lx = F.x0 + 8, rx = F.x0 + COLS * BW - 8;
        let bounced = false;
        if (b.x < lx) { b.x = lx + (lx - b.x); b.vx = -b.vx; bounced = true; }
        if (b.x > rx) { b.x = rx - (b.x - rx); b.vx = -b.vx; bounced = true; }
        if (b.y <= TOP + F.drop * RH + 8) return 'stick';
        const r0 = Math.floor((b.y - TOP - 8) / RH) - F.drop;
        for (let r = Math.max(0, r0 - 1); r <= Math.min(GROWS - 1, r0 + 2); r++) {
          for (let c = 0; c < ncols(r); c++) {
            if (grid[r][c] < 0) continue;
            const dx = cellX(F, r, c) - b.x, dy = cellY(F, r) - b.y;
            if (dx * dx + dy * dy < 13.5 * 13.5) return 'stick';
          }
        }
        return bounced ? 'bounce' : null;
      }
      function snapCell(F, b, grid) {
        let best = null, bd = 1e9;
        const r0 = Math.round((b.y - TOP - 8) / RH) - F.drop;
        for (let r = Math.max(0, r0 - 1); r <= Math.min(GROWS - 1, r0 + 1); r++) {
          for (let c = 0; c < ncols(r); c++) {
            if (grid[r][c] >= 0) continue;
            // must touch the ceiling or a bubble
            if (r > 0 && !nbrs(r, c).some(([a, d]) => grid[a][d] >= 0)) continue;
            const dx = cellX(F, r, c) - b.x, dy = cellY(F, r) - b.y, d = dx * dx + dy * dy;
            if (d < bd) { bd = d; best = [r, c]; }
          }
        }
        if (!best) { // fallback: nearest empty anywhere
          for (let r = 0; r < GROWS; r++) for (let c = 0; c < ncols(r); c++) if (grid[r][c] < 0) { const dx = cellX(F, r, c) - b.x, dy = cellY(F, r) - b.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [r, c]; } }
        }
        return best;
      }
      function launchPos(F) { return { x: F.x0 + 64, y: 202 }; }
      function simulate(F, ang, grid) {
        const lp = launchPos(F);
        const b = { x: lp.x, y: lp.y, vx: Math.sin(ang) * 3, vy: -Math.cos(ang) * 3 };
        for (let i = 0; i < 400; i++) if (stepBubble(F, b, grid) === 'stick') return snapCell(F, b, grid);
        return null;
      }

      // ---------- shooting & resolving ----------
      function shoot(F) {
        if (F.st !== 'aim' || F.fly) return;
        const lp = launchPos(F), sp = 7;
        F.fly = { x: lp.x, y: lp.y, vx: Math.sin(F.ang) * sp, vy: -Math.cos(F.ang) * sp, c: F.cur };
        F.cur = F.next; F.next = randColor(F); F.idle = 0; F.bobT = 20; F.shots++;
        snd.shoot();
      }
      function settle(F, cell, c) {
        const [r, cc] = cell;
        F.grid[r][cc] = c;
        let popped = 0, dropped = 0;
        const grp = group(F.grid, r, cc);
        if (grp.length >= 3) {
          for (const [a, b] of grp) { F.pops.push({ x: cellX(F, a, b), y: cellY(F, a), c: F.grid[a][b], t: 0 }); F.grid[a][b] = -1; }
          popped = grp.length;
          const fl = floating(F.grid);
          for (const [a, b] of fl) { F.falls.push({ x: cellX(F, a, b), y: cellY(F, a), vx: (Math.random() - 0.5) * 1.5, vy: -1 - Math.random() * 1.5, c: F.grid[a][b] }); F.grid[a][b] = -1; }
          dropped = fl.length;
          snd.pop(popped); if (dropped) snd.drop(dropped);
        } else snd.stick();
        // scoring: 10 per pop, 2^n x 10 for n dropped (capped at 17)
        let pts = popped * 10;
        if (dropped) pts += Math.pow(2, Math.min(17, dropped)) * 10;
        if (F === G.f[0]) addScore(pts);
        if (pts >= 100) G.fx.push({ x: cellX(F, r, cc), y: cellY(F, r), s: String(pts), t: 60 });
        if (G.vs && dropped + (popped > 4 ? popped - 4 : 0) > 0) {
          const other = G.f[F === G.f[0] ? 1 : 0];
          other.garbage += dropped + (popped > 4 ? popped - 4 : 0);
        }
        // ceiling press
        if (F.shots >= F.perDrop) { F.shots = 0; F.drop++; snd.press(); F.shake = 0; }
        if (F.garbage > 0) addGarbage(F);
        if (!G.vs && count(F.grid) === 0) { roundClear(); return; }
        if (G.vs && count(F.grid) === 0) { randomRefill(F); }
        checkLose(F);
        // keep current/next colours valid
        const cs = colorsOn(F.grid);
        if (cs.length) { if (!cs.includes(F.cur)) F.cur = randColor(F); if (!cs.includes(F.next)) F.next = randColor(F); }
      }
      function randomRefill(F) { for (let r = 0; r < 2; r++) for (let c = 0; c < ncols(r); c++) F.grid[r][c] = Math.random() * F.ncolors | 0; }
      function addGarbage(F) {
        const n = Math.min(F.garbage, 12); F.garbage = 0;
        const cs = colorsOn(F.grid); if (!cs.length) return;
        for (let i = 0; i < n; i++) {
          let cand = [], maxR = -1;
          for (let r = 0; r < GROWS - 1; r++) for (let c = 0; c < ncols(r); c++) {
            if (F.grid[r][c] >= 0) continue;
            if (r > 0 && !nbrs(r, c).some(([a, d]) => F.grid[a][d] >= 0)) continue;
            if (r > maxR) { maxR = r; cand = []; }
            if (r === maxR) cand.push([r, c]);
          }
          if (!cand.length) break;
          const [r, c] = cand[Math.random() * cand.length | 0];
          F.grid[r][c] = cs[Math.random() * cs.length | 0];
        }
        snd.garbage();
      }
      function lowestRow(F) { for (let r = GROWS - 1; r >= 0; r--) for (let c = 0; c < ncols(r); c++) if (F.grid[r][c] >= 0) return r; return -1; }
      function checkLose(F) {
        if (lowestRow(F) + F.drop >= VROWS) {
          F.st = 'lose'; F.loseT = 0;
          if (G.vs) { const o = G.f[F === G.f[0] ? 1 : 0]; o.st = 'win'; G.phase = 'vsend'; G.pt = 0; G.loser = F === G.f[0] ? 0 : 1; }
          else { G.phase = 'lost'; G.pt = 0; }
          snd.lose();
        }
      }
      function addScore(n) { G.score += n; if (G.score > hi) hi = G.score; }

      // ---------- CPU ----------
      function cpuPlan(F) {
        const skill = Math.min(1, 0.35 + G.stage * 0.13);
        let best = 0, bs = -1e9;
        for (let a = -1.3; a <= 1.3; a += 0.04) {
          const cell = simulate(F, a, F.grid); if (!cell) continue;
          const g2 = cloneGrid(F.grid); g2[cell[0]][cell[1]] = F.cur;
          const grp = group(g2, cell[0], cell[1]);
          let s;
          if (grp.length >= 3) {
            for (const [x, y] of grp) g2[x][y] = -1;
            s = 100 + grp.length * 30 + floating(g2).length * 60;
          } else {
            s = (grp.length - 1) * 25 - (cell[0] + F.drop) * 6;
            if (cell[0] + F.drop >= VROWS - 1) s -= 300;
          }
          s += (Math.random() - 0.5) * (1 - skill) * 160;
          if (s > bs) { bs = s; best = a; }
        }
        F.cpuAng = best; F.cpuT = Math.round(50 - skill * 35);
      }
      function updCpu(F) {
        if (F.st !== 'aim' || F.fly) return;
        if (F.cpuT === 0 && F.cpuAng === null) cpuPlan(F);
        if (F.cpuAng === null) { cpuPlan(F); return; }
        const d = F.cpuAng - F.ang;
        F.ang += Math.max(-0.035, Math.min(0.035, d));
        if (Math.abs(d) > 0.01) F.crank++;
        if (F.cpuT > 0) F.cpuT--;
        else if (Math.abs(d) < 0.02) { shoot(F); F.cpuAng = null; }
      }

      // ---------- per-field update ----------
      function updField(F, human) {
        F.anim++;
        if (F.bobT > 0) F.bobT--;
        for (const p of F.pops) p.t++;
        F.pops = F.pops.filter(p => p.t < 16);
        for (const b of F.falls) { b.vy += 0.25; b.x += b.vx; b.y += b.vy; }
        F.falls = F.falls.filter(b => b.y < H + 20);
        if (F.st === 'lose') { F.loseT++; return; }
        if (F.st !== 'aim') return;
        if (human) {
          let turn = 0;
          if (api.key('ArrowLeft')) turn = -1; if (api.key('ArrowRight')) turn = 1;
          if (turn) { F.ang = Math.max(-1.35, Math.min(1.35, F.ang + turn * 0.03)); F.crank++; if ((F.crank & 3) === 0) snd.crank(); }
          if (api.anyPressed('Space', 'ArrowUp', 'KeyX')) shoot(F);
          // hurry up: auto-fire after a long wait
          if (!F.fly) {
            F.idle++;
            if (F.idle === 300 || F.idle === 420) snd.hurry();
            if (F.idle >= 480) shoot(F);
          }
        } else updCpu(F);
        F.shake = F.shots >= F.perDrop - 2 ? F.shots - (F.perDrop - 3) : 0;
        if (F.fly) {
          const b = F.fly;
          for (let i = 0; i < 4; i++) {
            const sub = { x: b.x, y: b.y, vx: b.vx / 4, vy: b.vy / 4 };
            const res = stepBubble(F, sub, F.grid);
            b.x = sub.x; b.y = sub.y; b.vx = sub.vx * 4; b.vy = sub.vy * 4;
            if (res === 'bounce') snd.bounce();
            if (res === 'stick') {
              const cell = snapCell(F, b, F.grid);
              F.fly = null;
              if (cell) settle(F, cell, b.c);
              break;
            }
          }
        }
      }

      // ---------- game flow ----------
      function newGame(vs) {
        G = { vs, score: 0, lives: 3, round: 0, stage: 0, f: [], fx: [], phase: 'ready', pt: 0, wins: [0, 0], t0: 0 };
        if (vs) startVsMatch(); else startRound();
        snd.ready();
      }
      function startRound() {
        const F = mkField(96, false);
        G.f = [F]; loadLevel(F, G.round); G.phase = 'ready'; G.pt = 0; G.time = 0;
      }
      function startVsMatch() { G.wins = [0, 0]; startVsRound(); }
      function startVsRound() {
        const a = mkField(16, false), b = mkField(176, true);
        const rows = 5 + Math.min(2, G.stage >> 1), nc = Math.min(7, 4 + (G.stage >> 1));
        randomLayout(a, rows, nc);
        b.grid = cloneGrid(a.grid); b.ncolors = nc; b.cur = a.cur; b.next = a.next;
        a.perDrop = b.perDrop = 9; b.cpuAng = null; b.cpuT = 60;
        G.f = [a, b]; G.phase = 'ready'; G.pt = 0;
      }
      function roundClear() {
        const F = G.f[0]; F.st = 'win';
        G.phase = 'clear'; G.pt = 0;
        const secs = G.time / 60;
        G.bonus = secs <= 5 ? 50000 : secs >= 64 ? 0 : Math.round(50000 * (64 - secs) / 59 / 10) * 10;
        snd.clear();
      }
      function gameOver() {
        api.setHiScore(G.score); mode = 'over'; overT = 300;
      }
      function lostLife() {
        G.lives--;
        if (G.lives <= 0) {
          const cg = G;
          G.phase = 'wait';
          if (api.offerContinue) api.offerContinue(() => { if (G !== cg) return; G.lives = 3; G.vs ? startVsRound() : startRound(); }, () => { if (G === cg) gameOver(); });
          else gameOver();
        } else G.vs ? startVsRound() : startRound();
      }
      function update() {
        mt++; frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.anyPressed('ArrowUp', 'ArrowDown')) { menu ^= 1; au.tone(900, 0.04, { type: 'square', vol: 0.06 }); }
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'play'; newGame(menu === 1); }
          return;
        }
        if (mode === 'over') { if (--overT <= 0 || (overT < 200 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; mt = 0; } return; }
        for (const f of G.fx) { f.t--; f.y -= 0.4; }
        G.fx = G.fx.filter(f => f.t > 0);
        if (G.phase === 'ready') {
          G.pt++; for (const F of G.f) { F.anim++; }
          if (G.pt > 100 || (G.pt > 30 && api.anyPressed('Space', 'Enter'))) G.phase = 'play';
          return;
        }
        if (G.phase === 'play') {
          G.time++;
          updField(G.f[0], true);
          if (G.vs && G.phase === 'play') updField(G.f[1], false);
          return;
        }
        for (const F of G.f) updField(F, false);
        G.pt++;
        if (G.phase === 'clear') {
          if (G.pt === 90) addScore(G.bonus);
          if (G.pt > 220) { G.round++; startRound(); snd.ready(); }
        } else if (G.phase === 'lost') {
          if (G.pt > 180) lostLife();
        } else if (G.phase === 'vsend') {
          if (G.pt === 1) G.wins[1 - G.loser]++;
          if (G.pt > 200) {
            if (G.wins[0] >= 2) { addScore(10000 * (G.stage + 1)); G.stage++; snd.clear(); startVsMatch(); }
            else if (G.wins[1] >= 2) { G.wins = [0, 0]; lostLife(); }
            else startVsRound();
          }
        }
      }

      // ---------- drawing ----------
      const BGS = [['#203880', '#2848a0'], ['#583088', '#6840a0'], ['#185840', '#207050'], ['#803020', '#984030'], ['#204868', '#285880'], ['#605018', '#786428']];
      function drawBackdrop(ctx, k) {
        const c = BGS[k % BGS.length];
        ctx.fillStyle = c[0]; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = c[1];
        for (let y = 0; y < H; y += 16) for (let x = ((y >> 4) & 1) * 16; x < W; x += 32) {
          if (k % 3 === 0) { ctx.fillRect(x + 4, y + 7, 8, 2); ctx.fillRect(x + 7, y + 4, 2, 8); }
          else if (k % 3 === 1) { ctx.fillRect(x + 2, y + 2, 12, 12); }
          else { for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 - i, y + 2 + i, i * 2 + 1, 1); for (let i = 0; i < 6; i++) ctx.fillRect(x + 3 + i, y + 8 + i, 11 - i * 2, 1); }
        }
      }
      function drawBubble(ctx, x, y, c, grey) { spr(ctx, grey ? GREY : BSPR[c], x - 8, y - 8, false); }
      function drawField(ctx, F, idx) {
        const x0 = F.x0;
        // well
        ctx.fillStyle = '#081028'; ctx.fillRect(x0, TOP - 4, 128, 196);
        ctx.fillStyle = '#0c1838'; for (let y = TOP; y < 186; y += 8) ctx.fillRect(x0, y, 128, 1);
        // frame pipes
        ctx.fillStyle = '#a0a8b8'; ctx.fillRect(x0 - 6, 0, 6, 224); ctx.fillRect(x0 + 128, 0, 6, 224);
        ctx.fillStyle = '#d0d8e8'; ctx.fillRect(x0 - 5, 0, 2, 224); ctx.fillRect(x0 + 129, 0, 2, 224);
        ctx.fillStyle = '#606878'; ctx.fillRect(x0 - 1, 0, 1, 224); ctx.fillRect(x0 + 133, 0, 1, 224);
        // ceiling press
        const cy = TOP + F.drop * RH;
        ctx.fillStyle = '#707888'; ctx.fillRect(x0, 0, 128, cy);
        ctx.fillStyle = '#9098a8';
        for (let y = cy - 8; y > -8; y -= 8) ctx.fillRect(x0, y, 128, 2);
        ctx.fillStyle = '#c8d0e0'; ctx.fillRect(x0, cy - 3, 128, 3);
        ctx.fillStyle = '#404858'; ctx.fillRect(x0, cy - 1, 128, 1);
        for (let k = 0; k < 4; k++) { ctx.fillStyle = '#505868'; ctx.fillRect(x0 + 14 + k * 32, 0, 6, Math.max(0, cy - 3)); ctx.fillStyle = '#b0b8c8'; ctx.fillRect(x0 + 15 + k * 32, 0, 2, Math.max(0, cy - 3)); }
        // death line
        ctx.fillStyle = (frame >> 3) & 1 && lowestRow(F) + F.drop >= VROWS - 2 ? '#ff4040' : '#c03040';
        for (let x = x0; x < x0 + 128; x += 6) ctx.fillRect(x, TOP + VROWS * RH + 2, 4, 1);
        // bubbles
        const grey = F.st === 'lose';
        for (let r = 0; r < GROWS; r++) for (let c = 0; c < ncols(r); c++) {
          const v = F.grid[r][c]; if (v < 0) continue;
          let x = cellX(F, r, c), y = cellY(F, r);
          if (F.shake && F.st === 'aim') x += ((frame + r + c) & 2) ? -F.shake * 0.5 : F.shake * 0.5;
          drawBubble(ctx, Math.round(x), y, v, grey && F.loseT > r * 4);
        }
        for (const p of F.pops) {
          const k = p.t;
          if (k < 5) drawBubble(ctx, p.x, p.y, p.c);
          else { ctx.fillStyle = BCOL[p.c][2]; for (let a = 0; a < 6; a++) { const an = a * 1.047; ctx.fillRect(Math.round(p.x + Math.cos(an) * k * 0.9) - 1, Math.round(p.y + Math.sin(an) * k * 0.9) - 1, 3, 3); } }
        }
        for (const b of F.falls) drawBubble(ctx, Math.round(b.x), Math.round(b.y), b.c);
        // launcher
        const lp = launchPos(F);
        ctx.fillStyle = '#6a4a28'; ctx.fillRect(x0 + 40, 206, 48, 18); ctx.fillStyle = '#9a7040'; ctx.fillRect(x0 + 42, 207, 44, 3);
        ctx.fillStyle = '#c8a050'; for (let a = 0; a < 8; a++) { const an = a * 0.785 + F.crank * 0.05; ctx.fillRect(Math.round(lp.x + Math.cos(an) * 12) - 1, Math.round(lp.y + 4 + Math.sin(an) * 6) - 1, 3, 3); }
        // aim guide for early rounds
        if (!G.vs && G.round < 3 && F.st === 'aim') {
          const b = { x: lp.x, y: lp.y, vx: Math.sin(F.ang) * 4, vy: -Math.cos(F.ang) * 4 };
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 60; i++) { if (stepBubble(F, b, F.grid) === 'stick') break; if (i % 3 === 0) ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1); }
        }
        // arrow
        const sx = Math.sin(F.ang), sy = -Math.cos(F.ang);
        for (let k = 0; k < 30; k++) { ctx.fillStyle = k > 24 ? '#ffe040' : k & 2 ? '#e0e0e0' : '#a0a0a0'; ctx.fillRect(Math.round(lp.x + sx * k) - 1, Math.round(lp.y + sy * k) - 1, 3, 3); }
        for (let k = 0; k < 5; k++) { const px = -sy, py = sx; ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.round(lp.x + sx * (30 - k) + px * k) - 1, Math.round(lp.y + sy * (30 - k) + py * k) - 1, 2, 2); ctx.fillRect(Math.round(lp.x + sx * (30 - k) - px * k) - 1, Math.round(lp.y + sy * (30 - k) - py * k) - 1, 2, 2); }
        if (F.st === 'aim' && !F.fly && G.phase !== 'ready') drawBubble(ctx, lp.x, lp.y, F.cur);
        else if (G.phase === 'ready') drawBubble(ctx, lp.x, lp.y, F.cur);
        if (F.fly) drawBubble(ctx, Math.round(F.fly.x), Math.round(F.fly.y), F.fly.c);
        // Bob with next bubble, Bub on the crank
        const nx = x0 + 20 - (F.bobT > 10 ? (20 - F.bobT) : 0), ny = 212;
        drawBubble(ctx, nx + 18, ny, F.next);
        const win = F.st === 'win', lose = F.st === 'lose';
        const jump = win ? Math.abs(Math.sin(F.anim * 0.15)) * 8 : 0;
        spr(ctx, BOB, x0 - 2, 206 - jump, false);
        spr(ctx, BUB, x0 + 92, 206 - jump - ((F.crank >> 3) & 1), true);
        if (lose) { ctx.fillStyle = '#80c0ff'; const t = (F.loseT % 20); ctx.fillRect(x0 + 102, 212 + t / 2, 2, 3); ctx.fillRect(x0 + 8, 212 + ((t + 10) % 20) / 2, 2, 3); }
        if (F.idle > 300 && F.st === 'aim' && (frame >> 3) & 1) otext(ctx, 'HURRY UP!', x0 + 64, 150, '#ff4040', 1, 'center');
        if (F.idle > 300 && F.st === 'aim') otext(ctx, String(Math.max(0, Math.ceil((480 - F.idle) / 60))), x0 + 64, 162, '#fff', 1, 'center');
        if (win && G.vs) otext(ctx, 'WIN!', x0 + 64, 90, '#ffe040', 3, 'center', '#802000');
        if (lose && G.vs) otext(ctx, 'LOSE', x0 + 64, 90, '#8080ff', 3, 'center', '#000040');
        if (F.garbage > 0) for (let i = 0; i < Math.min(F.garbage, 10); i++) { ctx.fillStyle = '#fff'; ctx.fillRect(x0 + 4 + i * 6, 196, 4, 4); }
      }
      function drawPlay(ctx) {
        drawBackdrop(ctx, G.vs ? G.stage : Math.floor(G.round / 4));
        for (let i = 0; i < G.f.length; i++) drawField(ctx, G.f[i], i);
        if (!G.vs) {
          otext(ctx, '1UP', 8, 8, '#ffe040'); otext(ctx, String(G.score), 88, 18, '#fff', 1, 'right');
          otext(ctx, 'HI-SCORE', 8, 34, '#ff8040'); otext(ctx, String(hi), 88, 44, '#fff', 1, 'right');
          otext(ctx, 'ROUND', 8, 70, '#40e0ff'); otext(ctx, String(G.round + 1), 60, 80, '#fff', 2, 'center');
          otext(ctx, 'BUB', 8, 110, '#40e040'); for (let i = 0; i < G.lives - 1; i++) spr(ctx, BUB, 8 + i * 20, 120, false);
          otext(ctx, 'TIME', 236, 70, '#40e0ff'); otext(ctx, String(Math.floor(G.time / 60)), 312, 80, '#fff', 1, 'right');
          otext(ctx, 'NEXT DROP', 236, 100, '#40e0ff');
          const F = G.f[0]; for (let i = 0; i < F.perDrop; i++) { ctx.fillStyle = i < F.perDrop - F.shots ? '#ffe040' : '#404040'; ctx.fillRect(236 + i * 8, 112, 6, 6); }
          otext(ctx, '2UP', 236, 8, '#40a0ff'); otext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 236, 18, (frame >> 5) & 1 ? '#fff' : '#888');
          otext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 312, H - 10, '#ccc', 1, 'right');
        } else {
          otext(ctx, 'VS', 160, 30, '#ffe040', 2, 'center', '#802000');
          otext(ctx, 'STG', 160, 60, '#40e0ff', 1, 'center'); otext(ctx, String(G.stage + 1), 160, 70, '#fff', 1, 'center');
          for (let i = 0; i < 2; i++) { ctx.fillStyle = i < G.wins[0] ? '#ffe040' : '#404040'; ctx.fillRect(150, 100 + i * 10, 6, 6); ctx.fillStyle = i < G.wins[1] ? '#ffe040' : '#404040'; ctx.fillRect(164, 100 + i * 10, 6, 6); }
          otext(ctx, 'YOU', 160, 130, '#40e040', 1, 'center'); otext(ctx, 'CPU', 160, 142, '#4090f0', 1, 'center');
          otext(ctx, String(G.score), 160, 4, '#fff', 1, 'center');
          for (let i = 0; i < G.lives - 1; i++) { ctx.fillStyle = '#40c840'; ctx.fillRect(148 + i * 8, 170, 6, 6); }
        }
        if (G.phase === 'ready') {
          const cx = G.vs ? 160 : 160;
          if (!G.vs) otext(ctx, 'ROUND ' + (G.round + 1), cx, 70, '#ffe040', 2, 'center', '#802000');
          otext(ctx, G.pt < 60 ? 'READY' : 'GO!', cx, 96, '#ffffff', 3, 'center', '#802000');
        }
        if (G.phase === 'clear') {
          otext(ctx, 'ROUND CLEAR!', 160, 70, '#ffe040', 2, 'center', '#802000');
          otext(ctx, (G.time / 60).toFixed(1) + ' SEC', 160, 100, '#fff', 1, 'center');
          otext(ctx, 'BONUS ' + G.bonus, 160, 114, G.bonus ? '#80ff80' : '#aaa', 1, 'center');
        }
        if (G.phase === 'lost') otext(ctx, 'GAME OVER?', 160, 90, '#ff6060', 2, 'center', '#400000');
        for (const f of G.fx) otext(ctx, f.s, f.x, f.y, '#fff', 1, 'center');
        if (mode === 'over') { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 86, W, 40); otext(ctx, 'GAME OVER', W / 2, 96, '#ff4040', 3, 'center'); }
      }
      function renderTitle(ctx) {
        drawBackdrop(ctx, (mt / 300 | 0));
        // floating bubbles
        for (let i = 0; i < 14; i++) { const x = (i * 53 + mt * (0.2 + (i % 3) * 0.1)) % (W + 20) - 10, y = H - ((i * 37 + mt * (0.4 + (i % 4) * 0.15)) % (H + 30)); drawBubble(ctx, Math.round(x), Math.round(y), i % 8); }
        const word = (s, y, cols) => {
          const n = s.length, x0 = W / 2 - n * 13;
          for (let i = 0; i < n; i++) {
            const bob = Math.round(Math.sin(mt * 0.06 + i * 0.7) * 2);
            const x = x0 + i * 26 + 13;
            for (let dy = -12; dy <= 12; dy++) { const w = Math.floor(Math.sqrt(144 - dy * dy)); ctx.fillStyle = '#101018'; ctx.fillRect(x - w, y + dy + bob, w * 2 + 1, 1); }
            for (let dy = -11; dy <= 11; dy++) { const w = Math.floor(Math.sqrt(121 - dy * dy)); ctx.fillStyle = BCOL[cols[i % cols.length]][dy < -4 ? 2 : dy > 5 ? 1 : 0]; ctx.fillRect(x - w, y + dy + bob, w * 2 + 1, 1); }
            ctx.fillStyle = '#fff'; ctx.fillRect(x - 7, y - 8 + bob, 3, 3);
            otext(ctx, s[i], x + 1, y - 6 + bob, '#ffffff', 2, 'center', '#101018');
          }
        };
        word('PUZZLE', 36, [0, 1, 3, 2, 4, 5]);
        word('BOBBLE', 66, [2, 0, 1, 3, 5, 4]);
        spr(ctx, BUB, 52, 112 + Math.round(Math.abs(Math.sin(mt * 0.1)) * -6), false);
        spr(ctx, BOB, 250, 112 + Math.round(Math.abs(Math.sin(mt * 0.1 + 1)) * -6), true);
        otext(ctx, (menu === 0 ? '> ' : '  ') + '1P PUZZLE GAME', 108, 112, menu === 0 ? '#ffe040' : '#ffffff');
        otext(ctx, (menu === 1 ? '> ' : '  ') + 'VS CPU BATTLE', 108, 126, menu === 1 ? '#ffe040' : '#ffffff');
        otext(ctx, 'HI-SCORE ' + hi, W / 2, 148, '#40e0ff', 1, 'center');
        const blink = (mt >> 4) & 1;
        if (coinFlash > 0 ? (coinFlash >> 2) & 1 : api.credits === 0 && blink) otext(ctx, 'INSERT COIN', W / 2, 168, '#fff', 1, 'center');
        else if (api.credits > 0 && blink) otext(ctx, 'PUSH START', W / 2, 168, '#fff', 1, 'center');
        otext(ctx, '\u00a9 1994 TAITO', W / 2, 196, '#fff', 1, 'center');
        otext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 6, H - 10, '#ccc', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        drawPlay(ctx);
      }
      return { update, render, destroy() { } };
    }
  });
})();
