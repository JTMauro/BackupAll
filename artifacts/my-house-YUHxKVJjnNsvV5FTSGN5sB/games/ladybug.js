// Lady Bug (Universal, 1981) \u2014 procedural recreation for the MAME32 Game Room.
// Push the turnstile gates to steer through the garden maze, eat the flowers, hearts and letters,
// dodge skulls and insects released by the timer around the border, and grab the center vegetable.
(function () {
  'use strict';
  const W = 192, H = 240, N = 11, CS = 16, MX = 8, MY = 32;

  // ================= Bitmap font (5x7 in 8px cells) =================
  const FONT_HEX = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E',
    '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
    '8': '0E11110E11110E', '9': '0E11110F01020C', 'A': '0E11111F111111', 'B': '1E11111E11111E',
    'C': '0E11101010110E', 'D': '1C12111111121C', 'E': '1F10101E10101F', 'F': '1F10101E101010',
    'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E04040404040E', 'J': '0702020202120C',
    'K': '11121418141211', 'L': '1010101010101F', 'M': '111B1515111111', 'N': '11111915131111',
    'O': '0E11111111110E', 'P': '1E11111E101010', 'Q': '0E11111115120D', 'R': '1E11111E141211',
    'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E', 'V': '11111111110A04',
    'W': '1111111515150A', 'X': '11110A040A1111', 'Y': '1111110A040404', 'Z': '1F01020408101F',
    '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C', ':': '000C0C000C0C00',
    '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004', '\u00a9': '0E11171417110E',
    '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408', '=': '00001F001F0000',
    '>': '08040201020408', '<': '02040810080402', '*': '0004150E150400', '+': '0004041F040400'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k], a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const gcache = {};
  function glyph(ch, col) {
    const k = col + ch; let g = gcache[k];
    if (!g) {
      g = mk(5, 7); const c = g.getContext('2d'); c.fillStyle = col; const a = FONT[ch];
      for (let r = 0; r < 7; r++) for (let x = 0; x < 5; x++) if (a[r] & (16 >> x)) c.fillRect(x, r, 1, 1);
      gcache[k] = g;
    }
    return g;
  }
  function txt(ctx, s, x, y, col) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) { const ch = s[i]; if (FONT[ch]) ctx.drawImage(glyph(ch, col), x + i * 8, y); }
  }
  const ctr = (ctx, s, y, col) => txt(ctx, s, Math.round((W - String(s).length * 8) / 2) + 1, y, col);
  function bigTxt(ctx, s, x, y, col, sc, shade) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const a = FONT[s[i]]; if (!a) continue;
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (a[r] & (16 >> c)) {
        if (shade) { ctx.fillStyle = shade; ctx.fillRect(x + (i * 6 + c) * sc + 1, y + r * sc + 1, sc, sc); }
        ctx.fillStyle = col; ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n), w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, cy + r, 1, 1); } x += 4; }
  }
  function spr(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  // rotate square art drawn facing UP: dir 0 up, 1 left, 2 down, 3 right
  function orient(rows, dir) {
    const n = rows.length, g = rows.map(r => r.split('')), out = [];
    for (let y = 0; y < n; y++) {
      let s = '';
      for (let x = 0; x < n; x++) {
        let ch;
        if (dir === 0) ch = g[y][x];
        else if (dir === 2) ch = g[n - 1 - y][x];
        else if (dir === 1) ch = g[x][n - 1 - y];
        else ch = g[n - 1 - x][y];
        s += ch;
      }
      out.push(s);
    }
    return out;
  }

  // ================= Sprites (14x14, facing up) =================
  const LADY = [
    ['..............', '.....KKKK.....', '....KWKKWK....', '...K.KKKK.K...', '..RRRRKKRRRR..', '.RRKKRKKRKKRR.', '.RRKKRKKRKKRR.', 'KRRRRRKKRRRRRK',
      '.RRRRRKKRRRRR.', '.RKKRRKKRRKKR.', '.RKKRRKKRRKKR.', 'K.RRRRKKRRRR.K', '...RRRKKRRR...', '..............'],
    ['..............', '.....KKKK.....', '....KWKKWK....', '..K..KKKK..K..', '..RRRRKKRRRR..', 'KRRKKRKKRKKRRK', '.RRKKRKKRKKRR.', '.RRRRRKKRRRRR.',
      'KRRRRRKKRRRRRK', '.RKKRRKKRRKKR.', '.RKKRRKKRRKKR.', '..RRRRKKRRRR..', '.K.RRRKKRRR.K.', '..............']];
  const BUG = [
    ['..............', '...A......A...', '....A....A....', '.....BBBB.....', '....BWBBWB....', '....BKBBKB....', '.A..BBBBBB..A.', '..ABBCCCCBBA..',
      '...BCCCCCCB...', '.ABBCCCCCCBBA.', 'A..BCCCCCCB..A', '...BBCCCCBB...', '....BBBBBB....', '..............'],
    ['..............', '..A........A..', '...A......A...', '.....BBBB.....', '....BWBBWB....', '....BKBBKB....', 'A...BBBBBB...A', '.AABBCCCCBBAA.',
      '...BCCCCCCB...', 'A.BBCCCCCCBB.A', '.A.BCCCCCCB.A.', '...BBCCCCBB...', '....BBBBBB....', '..............']];
  const SKULL = ['..WWWWWW..', '.WWWWWWWW.', 'WWWWWWWWWW', 'WKKWWWWKKW', 'WKKWWWWKKW', 'WWWWKKWWWW', '.WWWWWWWW.', '..W.WW.W..', '..WWWWWW..', '...W..W...'];
  const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const FLOWER = ['.W.', 'WYW', '.W.'];
  const VEGS = [
    ['CUCUMBER', 1000, ['.....GG.....', '....GGGG....', '...GgGGgG...', '...GGGgGG...', '...GgGGGG...', '...GGGgGG...', '...GgGGgG...', '...GGGGGG...', '...GgGGGG...', '....GGgG....', '.....GG.....', '............']],
    ['EGGPLANT', 1500, ['....GGG.....', '...GGGGG....', '....PPP.....', '...PPPPP....', '..PPWPPPP...', '..PWPPPPPP..', '..PPPPPPPP..', '..PPPPPPPP..', '...PPPPPP...', '....PPPP....', '............', '............']],
    ['CARROT', 2000, ['..G.G.G.....', '...GGG......', '....GG......', '...OOOO.....', '...OOOO.....', '...OOOO.....', '....OOO.....', '....OOO.....', '....OO......', '.....O......', '.....O......', '............']],
    ['RADISH', 2500, ['....G.G.....', '.....GG.....', '....RRRR....', '...RRRRRR...', '..RRWRRRRR..', '..RWRRRRRR..', '..RRRRRRRR..', '...RRRRRR...', '....RRRR....', '.....WW.....', '......W.....', '............']],
    ['PARSLEY', 3000, ['...G.G.G....', '..GGGGGGG...', '.GgGGgGGgG..', '..GGGGGGG...', '...GgGGG....', '....GG......', '.....g......', '.....g......', '.....g......', '.....g......', '............', '............']],
    ['TOMATO', 3500, ['.....G......', '...GGGGG....', '..RRRGRRR...', '.RRRRRRRRR..', '.RWRRRRRRR..', '.RWRRRRRRR..', '.RRRRRRRRR..', '.RRRRRRRRR..', '..RRRRRRR...', '...RRRRR....', '............', '............']],
    ['PUMPKIN', 4000, ['.....g......', '.....g......', '..OOOOOOO...', '.OOoOOoOOO..', 'OOOoOOoOOOO.', 'OOOoOOoOOOO.', 'OOOoOOoOOOO.', '.OOoOOoOOO..', '..OOOOOOO...', '............', '............', '............']],
    ['MUSHROOM', 4500, ['...RRRRR....', '..RRWRRRR...', '.RRRRRRWRR..', '.RWRRRRRRR..', '..........  '.replace(/ /g, '.'), '....YYY.....', '....YYY.....', '....YYY.....', '....YYY.....', '...YYYYY....', '............', '............']]
  ];
  const INSECT_COLS = [['#30d030', '#a0ff60'], ['#3070ff', '#a0c0ff'], ['#ffd000', '#fff080'], ['#ff6000', '#ffb070'], ['#e040e0', '#ffa0ff'], ['#00d0d0', '#a0ffff'], ['#ff3030', '#ffa0a0'], ['#ffffff', '#c0c0c0']];
  const PHASE_COL = ['#3090ff', '#ff3030', '#ffe000'];   // blue, red, yellow
  const SPECIAL = 'SPECIAL', EXTRA = 'EXTRA';
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];

  // ================= Maze =================
  // walls in vertex coords (0..11); left half, mirrored x -> 11 - x
  const HS = [[2, 1, 2], [2, 4, 7], [4, 0, 1], [4, 3, 4], [6, 1, 2], [9, 1, 2], [9, 4, 7], [6, 5, 6], [8, 0, 1]]; // [y, x1, x2]
  const VS = [[2, 2, 3], [4, 4, 5], [2, 8, 9], [5, 5, 6], [4, 0, 1], [3, 10, 11], [3, 6, 7], [4, 8, 9], [1, 4, 5]]; // [x, y1, y2]
  const GATE_POS = [[1, 1, 'v'], [3, 1, 'h'], [1, 3, 'h'], [3, 3, 'v'], [2, 5, 'v'], [1, 7, 'h'], [4, 6, 'v'], [3, 8, 'v'], [2, 10, 'h'], [4, 10, 'h']];
  const hw = [], vw = [];
  for (let y = 0; y <= N; y++) hw.push(new Uint8Array(N));
  for (let x = 0; x <= N; x++) vw.push(new Uint8Array(N));
  for (let x = 0; x < N; x++) { hw[0][x] = 1; hw[N][x] = 1; }
  for (let y = 0; y < N; y++) { vw[0][y] = 1; vw[N][y] = 1; }
  for (const [y, x1, x2] of HS) for (let x = x1; x < x2; x++) { hw[y][x] = 1; hw[y][N - 1 - x] = 1; }
  for (const [x, y1, y2] of VS) for (let y = y1; y < y2; y++) { vw[x][y] = 1; vw[N - x][y] = 1; }
  const GATES0 = [];
  for (const [x, y, o] of GATE_POS) { GATES0.push({ x, y, o }); GATES0.push({ x: N - x, y, o }); }
  const CENTER = [5, 5], START = [5, 9];

  ArcadeRegistry.register({
    id: 'ladybug', title: 'Lady Bug', year: 1981, maker: 'Universal',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move (push the green gates) \u00b7 Enter: start',
    marquee: { bg: '#002000', fg: '#ff2020', accent: '#30e030' },
    create(api) {
      const A = api.audio;
      const LADY_S = [0, 1, 2, 3].map(d => LADY.map(f => spr(orient(f, d), { R: '#ff2020', K: '#101010', W: '#ffffff' })));
      const LADY_DEAD = spr(LADY[0], { R: '#ffffff', K: '#606060', W: '#000' });
      const SKULL_S = spr(SKULL, { W: '#ffffff', K: '#000' });
      const HEART_S = PHASE_COL.map(c => spr(HEART, { X: c }));
      const FLOWER_S = spr(FLOWER, { W: '#ffffff', Y: '#ffe000' });
      const VEG_S = VEGS.map(v => spr(v[2], { G: '#30c030', g: '#107010', P: '#a020c0', W: '#ffffff', O: '#ff8000', o: '#c05000', R: '#ff2020', Y: '#ffe0a0' }));
      const bugCache = {};
      function bugSprite(type, dir, fr) {
        const k = type + ':' + dir + ':' + fr;
        if (!bugCache[k]) { const c = INSECT_COLS[type % INSECT_COLS.length]; bugCache[k] = spr(orient(BUG[fr], dir), { A: c[1], B: c[0], C: c[1], W: '#ffffff', K: '#000' }); }
        return bugCache[k];
      }
      const FROZEN_BUG = spr(BUG[0], { A: '#8080ff', B: '#6060c0', C: '#a0a0ff', W: '#fff', K: '#000' });

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, page = 0, demo = false, coinFlash = 0;
      let score = 0, lives = 3, level = 1, mult = 1, spec = Array(7).fill(0), ext = Array(5).fill(0);
      let gates, items, itemsLeft, lb, insects, queue, timerT, lapLen, veg, freezeT, pops, phase, phaseT, msg, msgT, moveSnd = 0;
      let demoAI = { d: 0, t: 0 }, vegGiven = false;

      // ---------- sound ----------
      const snd = {
        dot() { A.tone(1500 + (moveSnd++ & 1) * 200, 0.025, { type: 'square', vol: 0.05 }); },
        heart() { A.melody([[1047, 0.05], [1397, 0.08]], { type: 'square', vol: 0.1 }); },
        mult() { A.melody([[784, 0.06], [1047, 0.06], [1319, 0.06], [1568, 0.12]], { type: 'square', vol: 0.12 }); },
        letter() { A.melody([[1319, 0.06], [1175, 0.06], [1568, 0.12]], { type: 'square', vol: 0.12 }); },
        gate() { A.tone(220, 0.06, { type: 'square', vol: 0.08, slideTo: 330 }); },
        release() { A.tone(200, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 600 }); },
        skullKill() { A.noise(0.25, { vol: 0.15, freq: 900 }); },
        veg() { A.melody([[523, 0.06], [784, 0.06], [1047, 0.06], [1568, 0.15]], { type: 'square', vol: 0.12 }); },
        death() { A.melody([[1175, 0.1], [1047, 0.1], [880, 0.1], [784, 0.1], [698, 0.1], [587, 0.1], [523, 0.3], [0, 0.1], [262, 0.4]], { type: 'square', vol: 0.12 }); },
        clear() { A.melody([[784, 0.08], [880, 0.08], [988, 0.08], [1047, 0.16], [0, 0.04], [1319, 0.08], [1175, 0.08], [1047, 0.3]], { type: 'square', vol: 0.12 }); },
        bonus() { A.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [1319, 0.1], [1568, 0.1], [2093, 0.3]], { type: 'square', vol: 0.12 }); },
        start() {
          const m = [[659, 0.1], [784, 0.1], [880, 0.1], [784, 0.1], [659, 0.2], [523, 0.2], [587, 0.1], [659, 0.1], [587, 0.1], [523, 0.1], [440, 0.4], [0, 0.05], [523, 0.1], [587, 0.1], [659, 0.1], [784, 0.1], [880, 0.4]];
          A.melody(m, { type: 'square', vol: 0.1 }); A.melody(m.map(([f, d]) => [f / 2, d]), { type: 'triangle', vol: 0.12 });
        },
        noCoin() { A.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
      };

      // ---------- maze helpers ----------
      const cx = c => MX + c * CS + 8, cy = r => MY + r * CS + 8;
      const atCenter = a => ((a.x - MX - 8) & 15) === 0 && ((a.y - MY - 8) & 15) === 0;
      function wall(c, r, d) {
        if (d === 0) return hw[r][c]; if (d === 2) return hw[r + 1][c];
        if (d === 1) return vw[c][r]; return vw[c + 1][r];
      }
      function edgeKey(c, r, d) {
        if (d === 0) return 'h' + r + ',' + c; if (d === 2) return 'h' + (r + 1) + ',' + c;
        if (d === 1) return 'v' + c + ',' + r; return 'v' + (c + 1) + ',' + r;
      }
      function gateKeys(g) { return g.o === 'v' ? ['v' + g.x + ',' + (g.y - 1), 'v' + g.x + ',' + g.y] : ['h' + g.y + ',' + (g.x - 1), 'h' + g.y + ',' + g.x]; }
      function gateOn(c, r, d) {
        const k = edgeKey(c, r, d);
        for (const g of gates) { const ks = gateKeys(g); if (ks[0] === k || ks[1] === k) return g; }
        return null;
      }
      const canBug = (c, r, d) => !wall(c, r, d) && !gateOn(c, r, d);
      const canLady = (c, r, d) => !wall(c, r, d);

      // ---------- setup ----------
      function initLevel() {
        gates = GATES0.map(g => ({ x: g.x, y: g.y, o: g.o, anim: 0, sign: 1 }));
        items = new Array(N * N).fill(null);
        const free = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if ((c === CENTER[0] && r === CENTER[1]) || (c === START[0] && r === START[1])) continue;
          items[r * N + c] = { k: 'dot' }; free.push([c, r]);
        }
        const take = (avoidStart) => {
          for (let tries = 0; tries < 200; tries++) {
            const i = Math.random() * free.length | 0, [c, r] = free[i];
            if (avoidStart && Math.abs(c - START[0]) + Math.abs(r - START[1]) < 3) continue;
            if (avoidStart && c === CENTER[0] && r === CENTER[1] - 1) continue;
            free.splice(i, 1); return [c, r];
          }
          return free.pop();
        };
        for (let i = 0; i < 3; i++) { const [c, r] = take(false); items[r * N + c] = { k: 'heart' }; }
        const pool = 'SPECIALEXTR';
        for (let i = 0; i < 3; i++) {
          // favour letters still missing
          const need = [];
          for (let j = 0; j < 7; j++) if (!spec[j]) need.push(SPECIAL[j]);
          for (let j = 0; j < 5; j++) if (!ext[j]) need.push(EXTRA[j]);
          const ch = need.length && Math.random() < 0.8 ? need[Math.random() * need.length | 0] : pool[Math.random() * pool.length | 0];
          const [c, r] = take(false); items[r * N + c] = { k: 'letter', ch };
        }
        const nsk = Math.min(6, 1 + level);
        for (let i = 0; i < nsk; i++) { const [c, r] = take(true); items[r * N + c] = { k: 'skull' }; }
        itemsLeft = items.filter(it => it && it.k !== 'skull').length;
        mult = 1; veg = null; vegGiven = false; phase = 0; phaseT = 0;
        lapLen = Math.max(270, 560 - level * 30);
        resetActors();
      }
      function resetActors() {
        lb = { x: cx(START[0]), y: cy(START[1]), dir: 0, acc: 0, anim: 0, moving: false };
        insects = []; queue = 4; timerT = 0; freezeT = 0; pops = [];
        for (const g of gates) g.anim = 0;
      }
      function startGame(isDemo) {
        demo = isDemo; score = 0; lives = 3; level = 1;
        if (!demo) { spec = Array(7).fill(0); ext = Array(5).fill(0); }
        initLevel(); state = 'ready'; T = 0; msg = ''; msgT = 0;
        if (!demo) snd.start();
      }
      function addScore(n, x, y) {
        if (demo) return;
        score += n;
        if (x != null) pops.push({ x, y, v: n, t: 50 });
        if (score > hi) hi = score;
      }
      function insectSpeed() { return Math.min(1.2, 0.7 + level * 0.05); }

      // ---------- input ----------
      function readInput() {
        if (demo) {
          if (--demoAI.t <= 0 || (atCenter(lb) && !canLady(...cellOf(lb), demoAI.d))) { demoAI.t = 25 + (Math.random() * 60 | 0); demoAI.d = Math.random() * 4 | 0; }
          return [demoAI.d];
        }
        const ds = [];
        if (api.key('ArrowUp')) ds.push(0); if (api.key('ArrowDown')) ds.push(2);
        if (api.key('ArrowLeft')) ds.push(1); if (api.key('ArrowRight')) ds.push(3);
        return ds;
      }
      const cellOf = a => [Math.round((a.x - MX - 8) / CS), Math.round((a.y - MY - 8) / CS)];

      // ---------- Lady Bug ----------
      function pushGate(g, c, r, d) {
        // arm being pushed: from the pivot toward the cell edge Lady Bug crosses
        const px = MX + g.x * CS, py = MY + g.y * CS;
        const ax = cx(c) + DX[d] * 8 - px, ay = cy(r) + DY[d] * 8 - py;
        const cross = ax * DY[d] - ay * DX[d];
        g.from = g.o === 'v' ? Math.PI / 2 : 0;
        g.sign = cross >= 0 ? 1 : -1;
        g.o = g.o === 'v' ? 'h' : 'v';
        g.anim = 10;
        snd.gate();
      }
      function updateLady(ds) {
        const p = lb;
        p.moving = false;
        if (!ds.length) { p.acc = 0; return; }
        p.acc += Math.min(1.25, 1.0 + level * 0.015);
        while (p.acc >= 1) {
          p.acc -= 1;
          if (atCenter(p)) {
            const [c, r] = cellOf(p);
            let nd = -1;
            // prefer a requested turn, then any requested direction, then keep going
            for (const d of ds) if (d !== p.dir && d !== (p.dir ^ 2) && canLady(c, r, d)) { nd = d; break; }
            if (nd < 0) for (const d of ds) if (canLady(c, r, d)) { nd = d; break; }
            if (nd < 0 && ds.some(d => d !== p.dir && d !== (p.dir ^ 2)) && canLady(c, r, p.dir)) nd = p.dir;
            if (nd < 0) break;
            const g = gateOn(c, r, nd);
            if (g) pushGate(g, c, r, nd);
            p.dir = nd;
          } else {
            for (const d of ds) if (d === (p.dir ^ 2)) { p.dir = d; break; }
            if (!ds.includes(p.dir) && !ds.includes(p.dir ^ 2)) {
              // a turn is buffered: keep going to the next junction
            }
          }
          p.x += DX[p.dir]; p.y += DY[p.dir]; p.moving = true;
          if (atCenter(p)) { eat(); if (state !== 'play') return; }
        }
        if (p.moving) p.anim++;
      }
      function eat() {
        const [c, r] = cellOf(lb);
        const it = items[r * N + c];
        const x = cx(c), y = cy(r) - 12;
        if (c === CENTER[0] && r === CENTER[1] && veg) {
          const v = VEGS[veg.i];
          addScore(v[1], x, y); snd.veg(); veg = null; freezeT = 360;
          msg = v[0] + ' ' + v[1]; msgT = 120;
        }
        if (!it) return;
        if (it.k === 'skull') { die(); return; }
        items[r * N + c] = null; itemsLeft--;
        if (it.k === 'dot') { addScore(10 * mult); snd.dot(); }
        else if (it.k === 'heart') {
          if (phase === 0 && mult < 5) { mult = mult === 1 ? 2 : mult === 2 ? 3 : 5; snd.mult(); }
          else snd.heart();
          addScore(100 * mult, x, y);
        } else if (it.k === 'letter') {
          let got = false;
          if (phase === 1) { const i = firstMissing(SPECIAL, spec, it.ch); if (i >= 0) { spec[i] = 1; got = true; } }
          if (phase === 2) { const i = firstMissing(EXTRA, ext, it.ch); if (i >= 0) { ext[i] = 1; got = true; } }
          addScore((phase === 0 ? 800 : 300) * mult, x, y);
          snd.letter();
          if (got && !demo) checkWords();
        }
      }
      function firstMissing(word, arr, ch) { for (let i = 0; i < word.length; i++) if (word[i] === ch && !arr[i]) return i; return -1; }
      function checkWords() {
        if (ext.every(v => v)) { ext = Array(5).fill(0); lives++; msg = 'EXTRA  1UP!'; msgT = 180; snd.bonus(); }
        if (spec.every(v => v)) { spec = Array(7).fill(0); addScore(30000); msg = 'SPECIAL 30000'; msgT = 180; snd.bonus(); }
      }

      // ---------- insects ----------
      function moveInsect(e) {
        e.acc += insectSpeed();
        while (e.acc >= 1) {
          e.acc -= 1;
          if (atCenter(e)) {
            const [c, r] = cellOf(e);
            const opts = []; for (let d = 0; d < 4; d++) if (canBug(c, r, d)) opts.push(d);
            if (!opts.length) break;
            let o2 = opts.filter(d => d !== (e.dir ^ 2)); if (!o2.length) o2 = opts;
            let nd = o2[Math.random() * o2.length | 0];
            if (Math.random() < Math.min(0.85, 0.5 + level * 0.05)) {
              const [lc, lr] = cellOf(lb); let bs = 1e9;
              for (const d of o2) { const s = Math.abs(c + DX[d] - lc) + Math.abs(r + DY[d] - lr) + Math.random() * 0.8; if (s < bs) { bs = s; nd = d; } }
            }
            e.dir = nd;
          }
          e.x += DX[e.dir]; e.y += DY[e.dir];
          if (atCenter(e)) {
            const [c, r] = cellOf(e), it = items[r * N + c];
            if (it && it.k === 'skull') {
              items[r * N + c] = null; e.dead = true; queue++; snd.skullKill();
              return;
            }
          }
        }
        e.anim++;
      }

      // ---------- play loop ----------
      function updatePlay() {
        updateLady(readInput());
        if (state !== 'play') return;
        // colour cycle of hearts and letters
        if (++phaseT >= 150) { phaseT = 0; phase = (phase + 1) % 3; }
        for (const g of gates) if (g.anim > 0) g.anim--;
        // timer border
        if (++timerT >= lapLen) {
          timerT = 0;
          if (queue > 0) {
            queue--;
            insects.push({ x: cx(CENTER[0]), y: cy(CENTER[1]), dir: 0, acc: 0, anim: 0, type: (level - 1) % INSECT_COLS.length });
            snd.release();
            if (queue === 0 && !veg && !vegGiven) { veg = { i: (level - 1) % VEGS.length }; vegGiven = true; }
          }
        }
        if (timerT % 6 === 0 && timerT > lapLen - 60) A.tone(900, 0.02, { type: 'square', vol: 0.04 });
        if (freezeT > 0) freezeT--;
        else for (const e of insects) moveInsect(e);
        insects = insects.filter(e => !e.dead);
        for (const o of pops) o.t--;
        pops = pops.filter(o => o.t > 0);
        if (msgT > 0) msgT--;
        for (const e of insects) if (Math.abs(e.x - lb.x) < 11 && Math.abs(e.y - lb.y) < 11) { die(); return; }
        if (itemsLeft <= 0) {
          state = 'clear'; T = 0;
          if (demo) { state = 'title'; page = 0; T = 0; return; }
          snd.clear();
        }
      }
      function die() {
        if (state !== 'play') return;
        state = 'dying'; T = 0;
        if (!demo) snd.death();
      }
      function afterDeath() {
        if (demo) { state = 'title'; page = 0; T = 0; return; }
        const respawn = () => { resetActors(); state = 'ready'; T = 60; };
        const gameOver = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
        if (lives <= 1) {
          lives = 0;
          if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, gameOver);
          else gameOver();
        } else { lives--; respawn(); }
      }
      function tryStart() {
        if (api.useCredit()) { startGame(false); return; }
        coinFlash = 90; snd.noCoin();
      }

      function update() {
        T++; if (coinFlash > 0) coinFlash--;
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space')) { tryStart(); break; }
            if (T > 420) { T = 0; page++; if (page % 3 === 2) startGame(true); }
            break;
          case 'ready':
            if (demo && api.anyPressed('Enter', 'Space')) { state = 'title'; T = 0; tryStart(); break; }
            if (T >= 150) { state = 'play'; T = 0; }
            break;
          case 'play':
            if (demo) {
              if (api.anyPressed('Enter', 'Space')) { state = 'title'; page = 0; T = 0; tryStart(); break; }
              if (T > 1500) { state = 'title'; page = 0; T = 0; break; }
            }
            updatePlay();
            break;
          case 'dying':
            if (T >= 150) afterDeath();
            break;
          case 'clear':
            if (T >= 200) { level++; initLevel(); state = 'ready'; T = 60; }
            break;
          case 'gameover':
            if (T > 240) { state = 'title'; page = 0; T = 0; demo = false; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawBorder(ctx) {
        // the timer runs clockwise from the top centre around the maze
        const x0 = 1, y0 = MY - 7, x1 = W - 1, y1 = MY + N * CS + 7, segs = [];
        const seg = 8;
        for (let x = W / 2; x < x1; x += seg) segs.push([x, y0, seg, 5]);
        for (let y = y0; y < y1; y += seg) segs.push([x1 - 5, y, 5, seg]);
        for (let x = x1 - seg; x >= x0; x -= seg) segs.push([x, y1 - 5, seg, 5]);
        for (let y = y1 - seg; y >= y0; y -= seg) segs.push([x0, y, 5, seg]);
        for (let x = x0; x < W / 2; x += seg) segs.push([x, y0, seg, 5]);
        const lit = state === 'play' || state === 'dying' ? Math.floor(timerT / lapLen * segs.length) : 0;
        segs.forEach((s, i) => {
          ctx.fillStyle = i < lit ? '#ffffff' : '#20a020';
          ctx.fillRect(s[0] + 1, s[1] + 1, s[2] - 2, s[3] - 2);
        });
      }
      function drawMaze(ctx) {
        ctx.fillStyle = '#c0c0c0';
        for (let y = 0; y <= N; y++) for (let x = 0; x < N; x++) if (hw[y][x]) ctx.fillRect(MX + x * CS - 1, MY + y * CS - 1, CS + 2, 3);
        for (let x = 0; x <= N; x++) for (let y = 0; y < N; y++) if (vw[x][y]) ctx.fillRect(MX + x * CS - 1, MY + y * CS - 1, 3, CS + 2);
        ctx.fillStyle = '#ffffff';
        for (let y = 0; y <= N; y++) for (let x = 0; x < N; x++) if (hw[y][x]) ctx.fillRect(MX + x * CS, MY + y * CS, CS, 1);
        // center box
        ctx.fillStyle = '#004000'; ctx.fillRect(cx(5) - 6, cy(5) - 6, 12, 12);
      }
      function drawGates(ctx) {
        for (const g of gates) {
          const px = MX + g.x * CS, py = MY + g.y * CS;
          let ang = g.o === 'v' ? Math.PI / 2 : 0;
          if (g.anim > 0) ang = g.from + g.sign * (Math.PI / 2) * (1 - g.anim / 10);
          ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
          ctx.fillStyle = '#30e030'; ctx.fillRect(-15, -1, 30, 3);
          ctx.restore();
          ctx.fillStyle = '#c0ffc0'; ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      }
      function drawItems(ctx) {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const it = items[r * N + c]; if (!it) continue;
          const x = cx(c), y = cy(r);
          if (it.k === 'dot') ctx.drawImage(FLOWER_S, x - 1, y - 1);
          else if (it.k === 'heart') ctx.drawImage(HEART_S[phase], x - 3, y - 3);
          else if (it.k === 'skull') ctx.drawImage(SKULL_S, x - 5, y - 5);
          else if (it.k === 'letter') txt(ctx, it.ch, x - 2, y - 3, PHASE_COL[phase]);
        }
        if (veg) ctx.drawImage(VEG_S[veg.i], cx(5) - 6, cy(5) - 6);
        else if (queue > 0 && (state === 'play' || state === 'ready') && ((T >> 4) & 1)) ctx.drawImage(bugSprite((level - 1) % INSECT_COLS.length, 0, 0), cx(5) - 7, cy(5) - 7);
      }
      function drawWord(ctx, word, arr, x, y, col) {
        for (let i = 0; i < word.length; i++) txt(ctx, word[i], x + i * 8, y, arr[i] ? col : '#404040');
      }
      function drawHUD(ctx) {
        drawWord(ctx, SPECIAL, spec, 0, 2, '#ff3030');
        drawWord(ctx, EXTRA, ext, 64, 2, '#ffe000');
        const ms = [2, 3, 5];
        ms.forEach((m, i) => txt(ctx, 'X' + m, 120 + i * 24, 2, mult >= m ? '#3090ff' : '#303050'));
        txt(ctx, '1UP', 0, 13, '#ff3030'); txt(ctx, String(score).padStart(6, ' '), 24, 13, '#ffffff');
        txt(ctx, 'HI', 96, 13, '#ff3030'); txt(ctx, String(Math.max(hi, score)).padStart(6, ' '), 112, 13, '#ffffff');
        const by = MY + N * CS + 9;
        const shown = Math.min(6, lives - (state === 'play' || state === 'dying' ? 1 : 0));
        for (let i = 0; i < shown; i++) ctx.drawImage(LADY_S[0][0], 2 + i * 13, by + 1, 11, 11);
        txt(ctx, 'PART ' + level, 96, by + 4, '#30e030');
        ctx.drawImage(VEG_S[(level - 1) % VEGS.length], 176, by + 1);
      }
      function drawCredit(ctx) { txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 40, H - 10, '#ffffff'); }
      function drawCoinMsg(ctx, y) {
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) ctr(ctx, 'INSERT COIN', y, '#ff3030'); }
        else if (api.credits === 0) { if ((T >> 5) & 1) ctr(ctx, 'INSERT COIN', y, '#ffe000'); }
        else if ((T >> 5) & 1) ctr(ctx, 'PUSH START', y, '#ffe000');
      }
      function renderTitle(ctx) {
        if (page % 3 === 0) {
          bigTxt(ctx, 'LADY', 34, 26, '#ff2020', 5, '#600000');
          bigTxt(ctx, 'BUG', 50, 66, '#ff2020', 5, '#600000');
          ctx.drawImage(LADY_S[3][(T >> 3) & 1], 30, 112);
          ctx.drawImage(bugSprite(0, 1, (T >> 3) & 1), 148, 112);
          ctr(ctx, 'COLLECT', 136, '#ffffff');
          drawWord(ctx, SPECIAL, [1, 1, 1, 1, 1, 1, 1], 40, 148, '#ff3030');
          txt(ctx, 'RED', 112, 148, '#ff3030');
          drawWord(ctx, EXTRA, [1, 1, 1, 1, 1], 48, 160, '#ffe000');
          txt(ctx, 'YELLOW', 96, 160, '#ffe000');
          ctr(ctx, 'BLUE HEARTS X2 X3 X5', 172, '#3090ff');
          drawCoinMsg(ctx, 192);
          ctr(ctx, '\u00a9 1981 UNIVERSAL', 210, '#30e030');
        } else {
          ctr(ctx, '- SCORE -', 26, '#ffe000');
          ctx.drawImage(FLOWER_S, 30, 46); txt(ctx, 'FLOWER       10', 46, 44, '#ffffff');
          ctx.drawImage(HEART_S[0], 28, 60); txt(ctx, 'HEART       100', 46, 60, '#ffffff');
          txt(ctx, 'A', 28, 76, '#ff3030'); txt(ctx, 'LETTER  300/800', 46, 76, '#ffffff');
          ctx.drawImage(SKULL_S, 27, 91); txt(ctx, 'SKULL    DANGER', 46, 92, '#ffffff');
          ctr(ctx, 'VEGETABLE BONUS', 112, '#30e030');
          for (let i = 0; i < 6; i++) { ctx.drawImage(VEG_S[i], 12 + (i % 2) * 88, 126 + (i >> 1) * 16); txt(ctx, String(VEGS[i][1]), 30 + (i % 2) * 88, 128 + (i >> 1) * 16, '#ffffff'); }
          drawCoinMsg(ctx, 196);
        }
        txt(ctx, 'HI ' + hi, 4, 2, '#ff3030');
        drawCredit(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        drawHUD(ctx);
        drawBorder(ctx);
        drawMaze(ctx);
        drawItems(ctx);
        drawGates(ctx);
        for (const e of insects) {
          const img = freezeT > 0 && ((T >> 3) & 1) ? FROZEN_BUG : bugSprite(e.type, e.dir, (e.anim >> 3) & 1);
          ctx.drawImage(img, e.x - 7, e.y - 7);
        }
        if (state === 'dying') {
          if (T < 60) ctx.drawImage(LADY_S[(T >> 2) & 3][0], lb.x - 7, lb.y - 7);
          else { ctx.drawImage(LADY_DEAD, lb.x - 7, lb.y - 7 - (T - 60) / 3); ctx.fillStyle = '#ffe000'; ctx.fillRect(lb.x - 4, lb.y - 11 - (T - 60) / 3, 8, 1); }
        } else ctx.drawImage(LADY_S[lb.dir][(lb.anim >> 2) & 1], lb.x - 7, lb.y - 7);
        for (const o of pops) if (o.v) tinyNum(ctx, o.v, o.x, o.y, '#ffffff');
        if (msgT > 0 && state === 'play') { ctx.fillStyle = '#000'; ctx.fillRect(16, 110, 160, 12); ctr(ctx, msg, 112, '#ffe000'); }
        if (state === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(48, 104, 96, 30);
          ctr(ctx, demo ? 'DEMO PLAY' : 'PLAYER 1', 108, '#ffffff');
          ctr(ctx, 'PART ' + level, 120, '#30e030');
        }
        if (state === 'clear' && T > 20) { ctx.fillStyle = '#000'; ctx.fillRect(32, 108, 128, 18); if ((T >> 3) & 1) ctr(ctx, 'WELL DONE!', 113, '#ffe000'); }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(48, 108, 96, 18); ctr(ctx, 'GAME OVER', 113, '#ff3030'); }
        if (demo) { ctx.fillStyle = '#000'; ctx.fillRect(48, H - 12, 96, 10); drawCoinMsg(ctx, H - 11); }
      }

      initLevel();
      if (api.debugHook) api.debugHook({ get: () => ({ state, level, score, lives, lb, insects, itemsLeft, items, gates, queue, T }), eat });
      return { update, render, destroy() { } };
    }
  });
})();
