// BurgerTime (Data East, 1982) \u2014 procedural recreation for the MAME32 Game Room.
// Peter Pepper walks the girders and ladders, stomping burger layers down to the plates while
// Mr. Hot Dog, Mr. Pickle and Mr. Egg give chase. Pepper stuns, falling layers crush.
(function () {
  'use strict';
  const W = 240, H = 256, COLS = 30, ROWS = 32;

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
  const flipH = rows => rows.map(r => r.split('').reverse().join(''));

  // ================= Sprites (16x16, drawn feet-at-bottom) =================
  const PAL = { W: '#ffffff', S: '#ffb48c', K: '#000000', R: '#f02020', B: '#3050ff', Y: '#ffd800', G: '#30c030', D: '#107010', O: '#ff8000', P: '#c00000', E: '#e8e8e8', N: '#a05020' };
  const CHEF_TOP = [
    '................',
    '.....WWWWW......',
    '....WWWWWWW.....',
    '....WWWWWWW.....',
    '.....WWWWW......',
    '.....SSSSSS.....',
    '.....SSSKSSS....',
    '.....SSSSSSSS...',
    '......SSKKS.....',
    '.....WWWWWW.....',
    '....WWWWWWWW....',
    '....WWWSSWWW....',
    '.....BBBBBB.....'];
  const CHEF_WALK = [
    CHEF_TOP.concat(['.....WW..WW.....', '....WW....WW....', '...KKK....KKK...']),
    CHEF_TOP.concat(['......WWWW......', '......WWWW......', '.....KKKKK......'])
  ];
  const CHEF_BACK_TOP = [
    '................',
    '.....WWWWWW.....',
    '....WWWWWWWW....',
    '....WWWWWWWW....',
    '.....WWWWWW.....',
    '.....SSSSSS.....',
    '.....SSSSSS.....',
    '......SSSS......'];
  const CHEF_CLIMB = [
    CHEF_BACK_TOP.concat(['..SWWWWWWWWW....', '...WWWWWWWWWW...', '....WWWWWWWWS...', '....WWWWWWW.....', '.....BBBBBB.....', '.....WW..WW.....', '.....WW...WW....', '....KK....KK....']),
    CHEF_BACK_TOP.concat(['....WWWWWWWWWS..', '...WWWWWWWWWW...', '...SWWWWWWWW....', '.....WWWWWWW....', '.....BBBBBB.....', '.....WW..WW.....', '....WW...WW.....', '....KK....KK....'])
  ];
  const CHEF_FRONT = [
    '................', '.....WWWWWW.....', '....WWWWWWWW....', '....WWWWWWWW....', '.....WWWWWW.....', '.....SSSSSS.....', '.....SKSSKS.....', '.....SSSSSS.....',
    '......SKKS......', '...WWWWWWWWWW...', '..SWWWWWWWWWWS..', '....WWWWWWWW....', '.....BBBBBB.....', '.....WW..WW.....', '.....WW..WW.....', '....KKK..KKK....'];
  const DOG = [
    ['................', '......RRRR......', '.....RRRRRR.....', '....RRRRRRRR....', '....RWWRRWWR....', '....RWKRRWKR....', '....RRRRRRRR....', '....RRRKKRRR....',
      '...YRRRRRRRRY...', '....RRRRRRRR....', '....RRRRRRRR....', '....RRRRRRRR....', '....RRRRRRRR....', '.....RRRRRR.....', '.....YY..YY.....', '....YYY..YYY....'],
    ['................', '......RRRR......', '.....RRRRRR.....', '....RRRRRRRR....', '....RWWRRWWR....', '....RWKRRWKR....', '....RRRRRRRR....', '....RRRKKRRR....',
      '....RRRRRRRR....', '...YRRRRRRRRY...', '....RRRRRRRR....', '....RRRRRRRR....', '....RRRRRRRR....', '.....RRRRRR.....', '......YYYY......', '.....YYYYYY.....']];
  const PICKLE = [
    ['......GG........', '.....GGGG.......', '.....GDGGG......', '....GGGGGG......', '....GWWGWWG.....', '....GWKGWKG.....', '....GGGGGGG.....', '....GDGGGDG.....',
      '...WGGKKKGGW....', '....GGGGGGG.....', '....GDGGGDG.....', '....GGGGGGG.....', '.....GGDGG......', '.....GGGGG......', '.....WW.WW......', '....WWW.WWW.....'],
    ['......GG........', '.....GGGG.......', '.....GDGGG......', '....GGGGGG......', '....GWWGWWG.....', '....GWKGWKG.....', '....GGGGGGG.....', '....GDGGGDG.....',
      '....GGKKKGG.....', '...WGGGGGGGW....', '....GDGGGDG.....', '....GGGGGGG.....', '.....GGDGG......', '.....GGGGG......', '......WWW.......', '.....WWWWW......']];
  const EGG = [
    ['................', '................', '.......EE.......', '.....EEEEEE.....', '....EEEEEEEE....', '...EEKEEEEKEE...', '...EERKEEKREE...', '...EEEEEEEEEE...',
      '..REEEEKKEEEER..', '...EEEEEEEEEE...', '...EEEEEEEEEE...', '....EEEEEEEE....', '.....EEEEEE.....', '......E..E......', '.....OO..OO.....', '....OOO..OOO....'],
    ['................', '................', '.......EE.......', '.....EEEEEE.....', '....EEEEEEEE....', '...EEKEEEEKEE...', '...EERKEEKREE...', '...EEEEEEEEEE...',
      '...EEEEKKEEEE...', '..REEEEEEEEEER..', '...EEEEEEEEEE...', '....EEEEEEEE....', '.....EEEEEE.....', '.......EE.......', '......OOOO......', '.....OOOOOO.....']];
  const ICECREAM = ['....RRRR....', '...RRWRRR...', '..RRRRRRRR..', '..WWWWWWWW..', '..WWWWWWWW..', '...OOOOOO...', '...OYOOYO...', '....OOOO....', '....OYOO....', '.....OO.....', '.....OO.....', '............'];
  const COFFEE = ['...W..W.....', '....W..W....', '...W..W.....', '............', '.WWWWWWWW...', '.WNNNNNNWWW.', '.WWWWWWWW.W.', '.WWWWWWWW.W.', '.WWWWWWWWWW.', '..WWWWWW....', '.EEEEEEEEE..', '............'];
  const FRIES = ['..Y.Y.YY.Y..', '..YYYYYYYY..', '.YYYYYYYYYY.', '..YYYYYYYY..', '..RRRRRRRR..', '..RWWRRWWR..', '..RRRRRRRR..', '..RRRRRRRR..', '...RRRRRR...', '...RRRRRR...', '...RRRRRR...', '............'];

  // ================= Stage layouts =================
  // floors [row, col0, col1] ; ladders [col, row0, row1] ; burgers {c, l:[[row,type],...]} top-to-bottom
  const LAYOUTS = [
    {
      floors: [[4, 1, 28], [8, 1, 14], [8, 21, 28], [12, 1, 28], [16, 1, 8], [16, 14, 28], [20, 1, 28], [24, 1, 28]],
      ladders: [[1, 4, 12], [1, 16, 24], [8, 4, 8], [8, 12, 24], [14, 4, 20], [21, 4, 16], [21, 20, 24], [28, 4, 24]],
      burgers: [{ c: 3, l: [[4, 'tb'], [8, 'l'], [16, 'p'], [24, 'bb']] }, { c: 10, l: [[4, 'tb'], [12, 'l'], [20, 'p'], [24, 'bb']] },
        { c: 16, l: [[4, 'tb'], [12, 'l'], [16, 'p'], [24, 'bb']] }, { c: 23, l: [[4, 'tb'], [12, 'l'], [16, 'p'], [24, 'bb']] }],
      start: [14, 24], bonus: [14, 12]
    },
    {
      floors: [[4, 1, 28], [8, 1, 8], [8, 14, 28], [12, 1, 28], [16, 1, 14], [16, 21, 28], [20, 8, 28], [24, 1, 28]],
      ladders: [[1, 4, 16], [8, 4, 8], [8, 12, 24], [14, 4, 20], [21, 4, 12], [21, 16, 24], [28, 4, 24]],
      burgers: [{ c: 3, l: [[4, 'tb'], [12, 'c'], [16, 'p'], [24, 'bb']] }, { c: 10, l: [[4, 'tb'], [12, 'l'], [16, 'p'], [24, 'bb']] },
        { c: 16, l: [[4, 'tb'], [8, 'l'], [12, 'p'], [20, 'bb']] }, { c: 23, l: [[4, 'tb'], [8, 'c'], [16, 'p'], [24, 'bb']] }],
      start: [14, 24], bonus: [14, 12]
    },
    {
      floors: [[4, 1, 28], [8, 1, 21], [12, 1, 8], [12, 14, 28], [16, 1, 28], [20, 1, 14], [20, 21, 28], [24, 1, 28]],
      ladders: [[1, 4, 24], [8, 8, 16], [8, 20, 24], [14, 4, 12], [14, 16, 24], [21, 8, 20], [28, 4, 24]],
      burgers: [{ c: 3, l: [[4, 'tb'], [8, 'l'], [12, 't'], [16, 'p'], [24, 'bb']] }, { c: 10, l: [[4, 'tb'], [8, 'c'], [16, 'p'], [20, 'l'], [24, 'bb']] },
        { c: 16, l: [[4, 'tb'], [8, 'l'], [12, 'p'], [16, 'c'], [24, 'bb']] }, { c: 23, l: [[4, 'tb'], [12, 't'], [16, 'p'], [20, 'l'], [24, 'bb']] }],
      start: [14, 24], bonus: [14, 16]
    }
  ];
  const ING_H = { tb: 7, l: 4, p: 5, c: 3, t: 4, bb: 5 };
  const PLATE_Y = 28 * 8 + 2;
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const ENEMY_PTS = { dog: 100, pickle: 200, egg: 300 };

  ArcadeRegistry.register({
    id: 'burgertime', title: 'BurgerTime', year: 1982, maker: 'Data East',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk / climb \u00b7 Space or X: pepper \u00b7 Enter: start',
    marquee: { bg: '#101040', fg: '#ffb020', accent: '#30d030' },
    create(api) {
      const A = api.audio;
      const CHEF_R = CHEF_WALK.map(r => spr(r, PAL)), CHEF_L = CHEF_WALK.map(r => spr(flipH(r), PAL));
      const CHEF_U = CHEF_CLIMB.map(r => spr(r, PAL)), CHEF_F = spr(CHEF_FRONT, PAL);
      const ESPR = {};
      for (const [k, art] of [['dog', DOG], ['pickle', PICKLE], ['egg', EGG]]) ESPR[k] = { r: art.map(a => spr(a, PAL)), l: art.map(a => spr(flipH(a), PAL)) };
      const STUN_PAL = { ...PAL, R: '#8080ff', G: '#8080ff', E: '#8080ff' };
      const ESTUN = {}; for (const [k, art] of [['dog', DOG], ['pickle', PICKLE], ['egg', EGG]]) ESTUN[k] = spr(art[0], STUN_PAL);
      const BONUS = [spr(ICECREAM, PAL), spr(COFFEE, PAL), spr(FRIES, PAL)];
      const BONUS_PTS = [500, 1000, 1500];

      let hi = api.getHiScore(20000);
      let state = 'title', T = 0, page = 0, demo = false, coinFlash = 0;
      let score = 0, lives = 3, level = 1, pepper = 5, nextLife = 10000;
      let grid = new Uint8Array(COLS * ROWS), L, ings, peter, enemies, clouds, pops, bonus, dropCount, spawnQ, spawnT, musicT = 0, musicI = 0, plateTop;
      let demoAI = { d: 3, t: 0 };

      // ---------- sound ----------
      const snd = {
        step() { A.tone(520 + Math.random() * 60, 0.03, { type: 'square', vol: 0.08 }); },
        drop() { A.tone(900, 0.25, { type: 'square', vol: 0.1, slideTo: 300 }); },
        land() { A.noise(0.08, { vol: 0.15, freq: 600 }); A.tone(110, 0.08, { type: 'triangle', vol: 0.2 }); },
        pepper() { A.noise(0.18, { vol: 0.12, freq: 3000, slideTo: 1200 }); },
        squash() { A.tone(300, 0.15, { type: 'square', vol: 0.12, slideTo: 80 }); },
        bonus() { A.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.12]], { type: 'square', vol: 0.12 }); },
        life() { A.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.12 }); },
        death() { A.melody([[880, 0.12], [831, 0.12], [784, 0.12], [740, 0.12], [698, 0.12], [659, 0.12], [622, 0.12], [587, 0.3], [0, 0.1], [294, 0.15], [147, 0.4]], { type: 'square', vol: 0.12 }); },
        clear() { A.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [784, 0.1], [1047, 0.1], [1319, 0.3], [0, 0.05], [1175, 0.1], [1319, 0.1], [1568, 0.4]], { type: 'square', vol: 0.12 }); },
        start() {
          const m = [[392, 0.1], [392, 0.1], [523, 0.1], [659, 0.15], [0, 0.05], [587, 0.1], [523, 0.1], [440, 0.1], [523, 0.3], [0, 0.05], [659, 0.1], [784, 0.1], [880, 0.1], [784, 0.4]];
          A.melody(m, { type: 'square', vol: 0.1 }); A.melody(m.map(([f, d]) => [f / 2, d]), { type: 'triangle', vol: 0.12 });
        },
        noCoin() { A.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
      };
      const BASS = [196, 0, 294, 0, 196, 247, 294, 0, 220, 0, 330, 0, 220, 262, 330, 0, 175, 0, 262, 0, 175, 220, 262, 0, 196, 0, 294, 0, 247, 220, 196, 0];
      function music() {
        if (demo) return;
        if (++musicT >= 9) {
          musicT = 0; const f = BASS[musicI++ % BASS.length];
          if (f) A.tone(f, 0.12, { type: 'triangle', vol: 0.09 });
          if (musicI % 4 === 1) A.tone(f ? f * 4 : 1568, 0.05, { type: 'square', vol: 0.025 });
        }
      }

      // ---------- grid ----------
      const flag = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS) ? 0 : grid[r * COLS + c];
      function can(c, r, d) {
        const nc = c + DX[d], nr = r + DY[d];
        if (d === 1 || d === 3) return (flag(c, r) & 1) && (flag(nc, nr) & 1);
        return (flag(c, r) & 2) && (flag(nc, nr) & 2);
      }
      const atCenter = a => ((a.x - 4) & 7) === 0 && (a.y & 7) === 0;
      function buildGrid() {
        grid.fill(0);
        for (const [r, c0, c1] of L.floors) for (let c = c0; c <= c1; c++) grid[r * COLS + c] |= 1;
        for (const [c, r0, r1] of L.ladders) for (let r = r0; r <= r1; r++) grid[r * COLS + c] |= 2;
      }
      function nextFloorBelow(c, row) {
        for (let r = row + 1; r < ROWS; r++) if ((flag(c + 1, r) & 1) && (flag(c + 2, r) & 1)) return r;
        return -1;
      }

      // ---------- setup ----------
      function initLevel() {
        L = LAYOUTS[(level - 1) % LAYOUTS.length];
        buildGrid();
        ings = [];
        plateTop = [];
        L.burgers.forEach((b, bi) => {
          plateTop[bi] = PLATE_Y;
          for (const [row, type] of b.l) ings.push({ type, c: b.c, b: bi, row, y: row * 8, seg: [0, 0, 0, 0], state: 'rest', target: -1, riders: [], extra: 0, bounce: 0 });
        });
        dropCount = 0; bonus = null;
        resetActors();
      }
      function roster() {
        const base = ['dog', 'dog', 'egg', 'pickle', 'dog', 'pickle', 'egg'];
        const n = Math.min(6, 3 + ((level + 1) >> 1));
        return base.slice(0, n);
      }
      function resetActors() {
        peter = { x: L.start[0] * 8 + 4, y: L.start[1] * 8, dir: 3, face: 3, acc: 0, anim: 0, moving: false, climb: false, lastDir: 3 };
        enemies = []; clouds = []; pops = [];
        spawnQ = roster().map((k, i) => ({ kind: k, t: 60 + i * 110 }));
        spawnT = 0;
      }
      function enemySpeed(kind) {
        const b = Math.min(0.92, 0.55 + level * 0.045);
        return b * (kind === 'pickle' ? 1.06 : kind === 'egg' ? 0.95 : 1);
      }
      function spawnEnemy(kind) {
        const rowsL = L.floors.filter(f => f[1] === 1).map(f => f[0]);
        const rowsR = L.floors.filter(f => f[2] === 28).map(f => f[0]);
        // pick the edge/row farthest from Peter for fairness
        const opts = [];
        for (const r of rowsL) opts.push([0, r]); for (const r of rowsR) opts.push([1, r]);
        opts.sort((a, b) => dist2(b) - dist2(a));
        const pick = opts[Math.floor(Math.random() * Math.min(3, opts.length))];
        function dist2(o) { const x = o[0] ? 228 : 12; return Math.abs(x - peter.x) + Math.abs(o[1] * 8 - peter.y) * 2; }
        const right = pick[0] === 1;
        enemies.push({ kind, x: right ? W + 10 : -10, y: pick[1] * 8, dir: right ? 1 : 3, tx: right ? 228 : 12, acc: 0, anim: 0, state: 'enter', t: 0 });
      }
      function startGame(isDemo) {
        demo = isDemo; score = 0; lives = 3; level = 1; pepper = 5; nextLife = 10000;
        initLevel(); state = 'ready'; T = 0;
        if (!demo) snd.start();
      }
      function addScore(n, x, y) {
        if (demo) return;
        score += n;
        if (x != null) pops.push({ x, y, v: n, t: 60 });
        if (score >= nextLife) { lives++; nextLife += 20000; snd.life(); }
        if (score > hi) hi = score;
      }

      // ---------- input ----------
      function readInput() {
        if (demo) return demoInput();
        let v = -1, h = -1;
        if (api.key('ArrowUp')) v = 0; else if (api.key('ArrowDown')) v = 2;
        if (api.key('ArrowLeft')) h = 1; else if (api.key('ArrowRight')) h = 3;
        return { v, h, fire: api.anyPressed('Space', 'KeyX', 'KeyZ') };
      }
      function demoInput() {
        const p = peter;
        if (--demoAI.t <= 0) { demoAI.t = 40 + (Math.random() * 90 | 0); demoAI.d = Math.random() * 4 | 0; }
        let near = false;
        for (const e of enemies) if (e.state === 'walk' && Math.abs(e.x - p.x) < 28 && Math.abs(e.y - p.y) < 6) near = true;
        const d = demoAI.d;
        return { v: d === 0 || d === 2 ? d : -1, h: d === 1 || d === 3 ? d : (p.face), fire: near && Math.random() < 0.1 };
      }

      // ---------- movement ----------
      function decide(p, d) {
        if (d < 0) return -1;
        const horiz = d === 1 || d === 3;
        if (atCenter(p)) {
          const c = (p.x - 4) >> 3, r = p.y >> 3;
          if (can(c, r, d)) return d;
          if (!horiz) { const order = p.face === 1 ? [1, 3] : [3, 1]; for (const hd of order) if (can(c, r, hd) && can(c + DX[hd], r, d)) return hd; }
          else { for (const vd of [0, 2]) if (can(c, r, vd) && can(c, r + DY[vd], d)) return vd; }
          return -1;
        }
        if ((p.y & 7) === 0) { // between columns on a floor
          if (horiz) return d;
          const c0 = (p.x - 4) >> 3, r = p.y >> 3, off = (p.x - 4) & 7;
          const cands = off <= 4 ? [[c0, 1], [c0 + 1, 3]] : [[c0 + 1, 3], [c0, 1]];
          for (const [cc, dir] of cands) if (can(cc, r, d)) return dir;
          return -1;
        }
        // between rows on a ladder
        if (!horiz) return d;
        const r0 = p.y >> 3, c = (p.x - 4) >> 3, off = p.y & 7;
        const cands = off <= 4 ? [[r0, 0], [r0 + 1, 2]] : [[r0 + 1, 2], [r0, 0]];
        for (const [rr, dir] of cands) if (can(c, rr, d)) return dir;
        return -1;
      }
      function movePeter(inp) {
        const p = peter;
        const spd = Math.min(1.05, 0.88 + level * 0.01);
        if (inp.v < 0 && inp.h < 0) { p.acc = 0; p.moving = false; return; }
        p.acc += spd; p.moving = false;
        while (p.acc >= 1) {
          p.acc -= 1;
          let d = decide(p, inp.v);
          if (d < 0) d = decide(p, inp.h);
          if (d < 0) break;
          p.x += DX[d]; p.y += DY[d]; p.dir = d; p.lastDir = d; p.moving = true;
          if (d === 1 || d === 3) p.face = d;
          p.climb = (p.y & 7) !== 0 || (d === 0 || d === 2);
          stepOnIngredient();
        }
        if (p.moving) { p.anim++; if (p.climb && (p.anim % 10 === 0)) A.tone(300, 0.02, { type: 'square', vol: 0.03 }); }
        if (atCenter(p) && !(flag((p.x - 4) >> 3, p.y >> 3) & 2)) p.climb = false;
        if (atCenter(p) && (flag((p.x - 4) >> 3, p.y >> 3) & 1) && (p.dir === 1 || p.dir === 3)) p.climb = false;
      }
      function stepOnIngredient() {
        const p = peter;
        if ((p.y & 7) !== 0) return;
        const row = p.y >> 3;
        for (const g of ings) {
          if (g.state !== 'rest' || g.row !== row) continue;
          const rel = p.x - g.c * 8;
          if (rel < 0 || rel >= 32) continue;
          const q = rel >> 3;
          if (!g.seg[q]) {
            g.seg[q] = 1; snd.step();
            if (g.seg[0] && g.seg[1] && g.seg[2] && g.seg[3]) startFall(g);
          }
        }
      }
      function startFall(g) {
        g.state = 'fall'; g.vy = 1; g.target = -1;
        g.riders = enemies.filter(e => (e.state === 'walk' || e.state === 'stun') && (e.y & 7) === 0 && (e.y >> 3) === g.row && e.x >= g.c * 8 - 4 && e.x < g.c * 8 + 36);
        for (const e of g.riders) { e.state = 'ride'; e.rx = e.x - g.c * 8; }
        g.extra = g.riders.length;
        g.seg = [0, 0, 0, 0];
        snd.drop();
        if (!demo) {
          dropCount++;
          if (dropCount % 3 === 0 && !bonus) bonus = { kind: Math.min(2, ((level - 1) / 2) | 0), t: 600 };
        }
      }
      function enemyAI(e) {
        const c = (e.x - 4) >> 3, r = e.y >> 3;
        const opts = []; for (let d = 0; d < 4; d++) if (can(c, r, d)) opts.push(d);
        if (!opts.length) return e.dir ^ 2;
        let o2 = opts.filter(d => d !== (e.dir ^ 2)); if (!o2.length) o2 = opts;
        if (o2.length === 1) return o2[0];
        const pc = (peter.x - 4) >> 3, pr = peter.y >> 3;
        if (Math.random() < 0.18) return o2[Math.random() * o2.length | 0];
        let best = o2[0], bs = 1e9;
        for (const d of o2) {
          const nc = c + DX[d], nr = r + DY[d];
          const s = Math.abs(nc - pc) + Math.abs(nr - pr) * 3 + Math.random() * 1.5;
          if (s < bs) { bs = s; best = d; }
        }
        return best;
      }
      function moveEnemy(e) {
        e.acc += enemySpeed(e.kind);
        while (e.acc >= 1) {
          e.acc -= 1;
          if (e.state === 'enter') {
            e.x += e.x < e.tx ? 1 : -1;
            if (e.x === e.tx) { e.state = 'walk'; e.dir = e.tx < 100 ? 3 : 1; }
            continue;
          }
          if (atCenter(e)) e.dir = enemyAI(e);
          e.x += DX[e.dir]; e.y += DY[e.dir];
        }
        e.anim++;
      }

      // ---------- ingredients ----------
      function updateIngredients() {
        for (const g of ings) {
          if (g.bounce > 0) g.bounce--;
          if (g.state !== 'fall') continue;
          if (g.target < 0) {
            const r = nextFloorBelow(g.c, g.row);
            g.target = r < 0 ? 999 : r;
          }
          const ty = g.target === 999 ? plateTop[g.b] : g.target * 8;
          g.vy = Math.min(3, g.vy + 0.15);
          g.y += g.vy;
          // carry riders
          for (const e of g.riders) { e.x = g.c * 8 + e.rx; e.y = Math.round(g.y); }
          // crush enemies beneath
          for (const e of enemies) {
            if (e.state !== 'walk' && e.state !== 'stun' && e.state !== 'enter') continue;
            if (e.x < g.c * 8 - 2 || e.x > g.c * 8 + 34) continue;
            if (g.y > e.y - 14 && g.y < e.y + 2) {
              e.state = 'squash'; e.t = 50; snd.squash();
              addScore(ENEMY_PTS[e.kind], e.x, e.y - 20);
            }
          }
          if (g.y < ty) continue;
          if (g.target === 999) {
            g.y = ty; g.state = 'plate'; plateTop[g.b] -= ING_H[g.type] + 1; g.bounce = 8; snd.land(); addScore(50);
            finishRiders(g);
            continue;
          }
          const below = ings.find(o => o !== g && o.state === 'rest' && o.b === g.b && o.row === g.target);
          g.row = g.target; g.target = -1;
          addScore(50);
          if (below) {
            g.y = g.row * 8; g.state = 'rest'; g.bounce = 8; snd.land();
            startFall(below);
            finishRiders(g);
          } else if (g.extra > 0) {
            g.extra--; // keep falling with the enemies aboard
          } else {
            g.y = g.row * 8; g.state = 'rest'; g.bounce = 8; snd.land();
            finishRiders(g);
          }
        }
      }
      function finishRiders(g) {
        if (!g.riders.length) return;
        const n = g.riders.length;
        const pts = 500 * Math.pow(2, Math.min(5, n - 1));
        for (const e of g.riders) { e.state = 'squash'; e.t = 50; }
        addScore(pts, g.c * 8 + 16, g.y - 24);
        snd.squash();
        g.riders = []; g.extra = 0;
      }

      // ---------- main play update ----------
      function updatePlay() {
        const inp = readInput();
        movePeter(inp);
        const p = peter;
        // pepper
        if (inp.fire) {
          if (pepper > 0 && clouds.length < 2) {
            if (!demo) pepper--;
            const d = p.lastDir;
            clouds.push({ x: p.x + DX[d] * 16, y: p.y - 8 + DY[d] * 16, t: 30 });
            snd.pepper();
          } else A.tone(150, 0.05, { type: 'square', vol: 0.06 });
        }
        for (const c of clouds) {
          c.t--;
          for (const e of enemies) if (e.state === 'walk' && Math.abs(e.x - c.x) < 14 && Math.abs(e.y - 8 - c.y) < 13) {
            e.state = 'stun'; e.t = Math.max(110, 230 - level * 10);
          }
        }
        clouds = clouds.filter(c => c.t > 0);
        // spawns
        spawnT++;
        for (const s of spawnQ) if (!s.done && spawnT >= s.t) { s.done = true; spawnEnemy(s.kind); }
        spawnQ = spawnQ.filter(s => !s.done);
        // enemies
        for (const e of enemies) {
          if (e.state === 'walk' || e.state === 'enter') moveEnemy(e);
          else if (e.state === 'stun') { if (--e.t <= 0) e.state = 'walk'; }
          else if (e.state === 'squash') { if (--e.t <= 0) { e.state = 'dead'; spawnQ.push({ kind: e.kind, t: spawnT + 200 + Math.random() * 120 }); } }
        }
        enemies = enemies.filter(e => e.state !== 'dead');
        updateIngredients();
        // bonus item
        if (bonus) {
          bonus.t--;
          const bx = L.bonus[0] * 8 + 4, by = L.bonus[1] * 8;
          if (Math.abs(p.x - bx) < 8 && Math.abs(p.y - by) < 4) {
            addScore(BONUS_PTS[bonus.kind], bx, by - 22); pepper++; snd.bonus(); bonus = null;
          } else if (bonus.t <= 0) bonus = null;
        }
        for (const o of pops) o.t--;
        pops = pops.filter(o => o.t > 0);
        // collisions
        for (const e of enemies) {
          if (e.state !== 'walk' && e.state !== 'enter') continue;
          if (Math.abs(e.x - p.x) < 9 && Math.abs(e.y - p.y) < 10) { die(); return; }
        }
        // stage clear
        if (ings.every(g => g.state === 'plate')) {
          state = 'clear'; T = 0;
          if (demo) { state = 'title'; page = 0; T = 0; return; }
          snd.clear();
        }
        music();
      }
      function die() {
        state = 'dying'; T = 0;
        if (!demo) snd.death();
      }
      function afterDeath() {
        if (demo) { state = 'title'; page = 0; T = 0; return; }
        const respawn = () => { resetActors(); state = 'ready'; T = 60; };
        const gameOver = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
        if (lives <= 1) {
          lives = 0;
          if (api.offerContinue) api.offerContinue(() => { lives = 3; pepper = Math.max(pepper, 5); respawn(); }, gameOver);
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
            if (T > 420) { T = 0; page++; if (page % 3 === 2) { startGame(true); } }
            break;
          case 'ready':
            if (demo && api.anyPressed('Enter')) { state = 'title'; T = 0; tryStart(); break; }
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
            for (const o of pops) o.t--;
            if (T >= 170) afterDeath();
            break;
          case 'clear':
            if (T >= 260) { level++; pepper++; initLevel(); state = 'ready'; T = 60; }
            break;
          case 'gameover':
            if (T > 240) { state = 'title'; page = 0; T = 0; demo = false; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawFloorsLadders(ctx) {
        for (const [c, r0, r1] of L.ladders) {
          const x = c * 8 + 4, y0 = r0 * 8, y1 = r1 * 8;
          ctx.fillStyle = '#1878ff';
          ctx.fillRect(x - 7, y0, 1, y1 - y0); ctx.fillRect(x + 6, y0, 1, y1 - y0);
          for (let y = y0 + 4; y < y1; y += 4) ctx.fillRect(x - 6, y, 12, 1);
        }
        for (const [r, c0, c1] of L.floors) {
          const y = r * 8, x0 = c0 * 8 - 4, x1 = c1 * 8 + 12;
          ctx.fillStyle = '#2040ff'; ctx.fillRect(x0, y, x1 - x0, 3);
          ctx.fillStyle = '#80a0ff'; ctx.fillRect(x0, y, x1 - x0, 1);
          ctx.fillStyle = '#101880'; for (let x = x0 + 3; x < x1; x += 8) ctx.fillRect(x, y + 1, 2, 2);
        }
        // plates
        L.burgers.forEach(b => {
          const x = b.c * 8 - 4;
          ctx.fillStyle = '#d0d0d0'; ctx.fillRect(x, PLATE_Y, 40, 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, PLATE_Y + 2, 36, 2);
          ctx.fillStyle = '#909090'; ctx.fillRect(x + 6, PLATE_Y + 4, 28, 1);
        });
      }
      function drawCol(ctx, type, px, x, y) {
        const e = Math.min(px, 31 - px);
        switch (type) {
          case 'tb': {
            const h = e >= 3 ? 7 : 4 + e;
            ctx.fillStyle = '#e8902c'; ctx.fillRect(x, y - h, 1, h);
            ctx.fillStyle = '#ffc060'; ctx.fillRect(x, y - h, 1, 1);
            ctx.fillStyle = '#9c4e10'; ctx.fillRect(x, y - 1, 1, 1);
            if (px % 6 === 3 && e > 2) { ctx.fillStyle = '#fff8d0'; ctx.fillRect(x, y - 5 + ((px / 6 | 0) & 1), 1, 1); }
            break;
          }
          case 'bb': {
            const h = e >= 2 ? 5 : 3 + e;
            ctx.fillStyle = '#e8902c'; ctx.fillRect(x, y - h, 1, h);
            ctx.fillStyle = '#ffc060'; ctx.fillRect(x, y - h, 1, 1);
            ctx.fillStyle = '#9c4e10'; ctx.fillRect(x, y - 1, 1, 1);
            break;
          }
          case 'l': {
            const w = (px >> 1) & 1;
            ctx.fillStyle = '#40e040'; ctx.fillRect(x, y - 4 + w, 1, 4 - w);
            ctx.fillStyle = '#108010'; ctx.fillRect(x, y - 1, 1, 1);
            break;
          }
          case 'p': {
            const h = e >= 1 ? 5 : 4;
            ctx.fillStyle = '#8a3a14'; ctx.fillRect(x, y - h, 1, h);
            if ((px * 7) % 5 === 1) { ctx.fillStyle = '#5a2008'; ctx.fillRect(x, y - 3, 1, 1); }
            ctx.fillStyle = '#b05828'; ctx.fillRect(x, y - h, 1, 1);
            break;
          }
          case 'c': {
            ctx.fillStyle = '#ffd820'; ctx.fillRect(x, y - 3, 1, 3);
            if (px % 9 === 4) ctx.fillRect(x, y, 1, 2);
            break;
          }
          case 't': {
            const h = e >= 1 ? 4 : 3;
            ctx.fillStyle = '#e02020'; ctx.fillRect(x, y - h, 1, h);
            if (px % 8 === 3 || px % 8 === 4) { ctx.fillStyle = '#ffb0a0'; ctx.fillRect(x, y - 3, 1, 2); }
            break;
          }
        }
      }
      const ING_SPR = {};
      for (const type of Object.keys(ING_H)) {
        ING_SPR[type] = [0, 1, 2, 3].map(q => {
          const cv = mk(8, 12), c = cv.getContext('2d');
          for (let i = 0; i < 8; i++) drawCol(c, type, q * 8 + i, i, 9);
          return cv;
        });
      }
      function drawIng(ctx, g) {
        const x0 = g.c * 8, yb = Math.round(g.y) - (g.bounce > 4 ? 1 : 0);
        for (let q = 0; q < 4; q++) ctx.drawImage(ING_SPR[g.type][q], x0 + q * 8, yb + (g.seg[q] ? 2 : 0) - 9);
      }
      function drawPeter(ctx) {
        const p = peter, x = p.x - 8, y = p.y - 16;
        let img;
        if (p.climb) img = CHEF_U[(p.anim >> 3) & 1];
        else if (state !== 'play' || !p.moving && p.anim === 0) img = (p.face === 1 ? CHEF_L : CHEF_R)[0];
        else img = (p.face === 1 ? CHEF_L : CHEF_R)[(p.anim >> 3) & 1];
        if (state === 'ready' || state === 'clear') img = CHEF_F;
        ctx.drawImage(img, x, y);
      }
      function drawDeath(ctx) {
        const p = peter;
        if (T < 70) {
          const imgs = [CHEF_F, CHEF_R[0], CHEF_U[0], CHEF_L[0]];
          ctx.drawImage(imgs[(T >> 3) & 3], p.x - 8, p.y - 16);
        } else {
          ctx.save(); ctx.translate(p.x, p.y - 4); ctx.rotate(Math.PI / 2); ctx.drawImage(CHEF_F, -8, -8); ctx.restore();
          if ((T >> 4) & 1) { ctx.fillStyle = '#ffd800'; for (let i = 0; i < 3; i++) { const a = T / 8 + i * 2.1; ctx.fillRect(p.x + Math.cos(a) * 9, p.y - 14 + Math.sin(a) * 3, 2, 2); } }
        }
      }
      function drawEnemy(ctx, e) {
        const fr = (e.anim >> 3) & 1;
        let img;
        if (e.state === 'stun') img = ((T >> 2) & 1) ? ESTUN[e.kind] : ESPR[e.kind].r[0];
        else if (e.state === 'squash') {
          const s = ESPR[e.kind].r[0];
          ctx.drawImage(s, 0, 0, 16, 16, e.x - 9, e.y - 6, 18, 6);
          return;
        } else img = (e.dir === 1 ? ESPR[e.kind].l : ESPR[e.kind].r)[fr];
        ctx.drawImage(img, e.x - 8, e.y - 16);
      }
      function drawHUD(ctx) {
        txt(ctx, '1UP', 8, 0, '#ff3030');
        txt(ctx, String(score).padStart(6, ' '), 0, 9, '#ffffff');
        txt(ctx, 'HI-SCORE', 88, 0, '#ff3030');
        txt(ctx, String(Math.max(hi, score)).padStart(6, ' '), 96, 9, '#ffffff');
        txt(ctx, 'PEPPER', 184, 0, '#30e030');
        txt(ctx, String(pepper).padStart(3, ' '), 200, 9, '#ffffff');
        // lives & level
        for (let i = 0; i < Math.min(6, lives - (state === 'play' || state === 'dying' ? 1 : 0)); i++) ctx.drawImage(CHEF_F, 2 + i * 12, H - 16, 12, 12);
        for (let i = 0; i < Math.min(8, level); i++) {
          const x = W - 12 - i * 10, y = H - 12;
          ctx.fillStyle = '#e8902c'; ctx.fillRect(x, y, 8, 3); ctx.fillStyle = '#40e040'; ctx.fillRect(x, y + 3, 8, 1);
          ctx.fillStyle = '#8a3a14'; ctx.fillRect(x, y + 4, 8, 2); ctx.fillStyle = '#e8902c'; ctx.fillRect(x, y + 6, 8, 2);
        }
      }
      function drawField(ctx) {
        drawFloorsLadders(ctx);
        for (const g of ings) drawIng(ctx, g);
        if (bonus && ((bonus.t > 120) || ((T >> 3) & 1))) ctx.drawImage(BONUS[bonus.kind], L.bonus[0] * 8 - 2, L.bonus[1] * 8 - 13);
        for (const e of enemies) drawEnemy(ctx, e);
        for (const c of clouds) {
          const a = c.t;
          for (let i = 0; i < 9; i++) {
            const ang = i * 0.7 + a * 0.2, r = 3 + (30 - a) * 0.25 + (i % 3);
            ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#c0c0c0';
            ctx.fillRect(Math.round(c.x + Math.cos(ang) * r), Math.round(c.y + Math.sin(ang) * r * 0.8), 2, 2);
          }
        }
        for (const o of pops) tinyNum(ctx, o.v, o.x, o.y, '#ffffff');
      }
      function drawCredit(ctx) { txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 72, H - 10, '#ffffff'); }
      function drawCoinMsg(ctx, y) {
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) ctr(ctx, 'INSERT COIN', y, '#ff3030'); }
        else if (api.credits === 0) { if ((T >> 5) & 1) ctr(ctx, 'INSERT COIN', y, '#ffd800'); }
        else if ((T >> 5) & 1) ctr(ctx, 'PUSH START', y, '#ffd800');
      }
      function drawLogo(ctx, y) {
        const cols = ['#ff3030', '#ffb020', '#ffe020', '#30e030', '#30c0ff', '#ff60ff'];
        const s1 = 'BURGER', s2 = 'TIME';
        for (let i = 0; i < s1.length; i++) bigTxt(ctx, s1[i], 30 + i * 30, y, cols[(i + (T >> 4)) % cols.length], 5, '#602000');
        for (let i = 0; i < s2.length; i++) bigTxt(ctx, s2[i], 60 + i * 30, y + 40, cols[(i + 3 + (T >> 4)) % cols.length], 5, '#602000');
      }
      function renderTitle(ctx) {
        if (page % 3 === 0) {
          drawLogo(ctx, 34);
          // a burger under the logo
          const g = { type: 'tb', c: 13, y: 132, seg: [0, 0, 0, 0], bounce: 0 };
          for (const [t, y] of [['tb', 132], ['l', 137], ['c', 141], ['p', 147], ['bb', 153]]) { g.type = t; g.y = y; drawIng(ctx, g); }
          ctx.fillStyle = '#ffffff'; ctx.fillRect(100, 154, 40, 2);
          ctr(ctx, 'BONUS CHEF FOR 10000 PTS', 176, '#ffffff');
          ctr(ctx, 'AND EVERY 20000 PTS', 188, '#ffffff');
          drawCoinMsg(ctx, 208);
          ctr(ctx, '\u00a9 1982 DATA EAST', 226, '#30c0ff');
        } else {
          ctr(ctx, '- SCORE -', 30, '#ffd800');
          const rows = [['dog', 'MR. HOT DOG', 100], ['pickle', 'MR. PICKLE', 200], ['egg', 'MR. EGG', 300]];
          rows.forEach(([k, n, v], i) => {
            ctx.drawImage(ESPR[k].r[(T >> 4) & 1], 28, 48 + i * 22);
            txt(ctx, n, 52, 54 + i * 22, '#ffffff'); txt(ctx, String(v).padStart(5, ' ') + ' PTS', 140, 54 + i * 22, '#ffd800');
          });
          ctr(ctx, 'DROP A BURGER WITH', 124, '#30e030');
          ctr(ctx, 'ENEMIES ON BOARD', 134, '#30e030');
          const dv = [500, 1000, 2000, 4000, 8000, 16000];
          dv.forEach((v, i) => txt(ctx, (i + 1) + ' : ' + String(v).padStart(5, ' '), 70 + (i % 2) * 0, 148 + i * 9, '#ffffff'));
          ctx.drawImage(BONUS[0], 22, 152); ctx.drawImage(BONUS[1], 22, 168); ctx.drawImage(BONUS[2], 22, 184);
          drawCoinMsg(ctx, 214);
        }
        txt(ctx, 'HI-SCORE ' + hi, 48, 2, '#ff3030');
        drawCredit(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        drawHUD(ctx);
        drawField(ctx);
        if (state === 'dying') drawDeath(ctx); else drawPeter(ctx);
        if (state === 'ready') {
          if (T < 150) {
            ctx.fillStyle = '#000'; ctx.fillRect(72, 106, 96, 30);
            ctr(ctx, demo ? 'DEMO PLAY' : 'PLAYER 1', 110, '#ffffff');
            ctr(ctx, 'STAGE ' + level, 122, '#ffd800');
          }
        }
        if (state === 'clear' && T > 30) {
          ctx.fillStyle = '#000'; ctx.fillRect(56, 106, 128, 18);
          if ((T >> 3) & 1) ctr(ctx, 'STAGE CLEAR!', 111, '#ffd800');
        }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(72, 106, 96, 18); ctr(ctx, 'GAME OVER', 111, '#ff3030'); }
        if (demo) { ctx.fillStyle = '#000'; ctx.fillRect(56, H - 30, 128, 10); drawCoinMsg(ctx, H - 29); }
      }

      // initial layout for the attract screen
      L = LAYOUTS[0]; buildGrid(); initLevel();
      if (api.debugHook) api.debugHook({ get: () => ({ state, ings, peter, enemies, level, score, lives, T }), stomp: stepOnIngredient });
      return { update, render, destroy() { } };
    }
  });
})();
