// Pac-Man (Namco, 1980) \u2014 faithful browser recreation for Arcade Games Galore.
(function () {
  'use strict';
  const W = 224, H = 288;

  // ================= Bitmap font (5x7, drawn bold into 8px cells) =================
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
    ' ': '00000000000000', '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C',
    ':': '000C0C000C0C00', '/': '00010204081000', '"': '0A0A0000000000', "'": '04040000000000',
    '?': '0E110102040004', '@': '0E11171517100E', '#': '0A0A1F0A1F0A0A', '\u00a9': '0E11171417110E',
    '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408', '=': '00001F001F0000',
    '>': '08040201020408', '<': '02040810080402', '&': '0C12140815120D', '*': '0004150E150400',
    '+': '0004041F040400', '%': '18190204081303'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function txt(ctx, s, x, y, col) {
    ctx.fillStyle = col; s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * 8 + c, y + r, 2, 1); }
    }
  }
  const tile = (ctx, s, col, row, color) => txt(ctx, s, col * 8, row * 8, color);
  // tiny 3x5 digits for score pop-ups
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, cy - 2 + r, 1, 1); } x += 4; }
  }

  // ================= Sprite helpers =================
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  // rotate string-array art: dir 0 up,1 left,2 down,3 right (art is drawn facing right)
  function orient(rows, dir) {
    const n = rows.length; const g = rows.map(r => r.split(''));
    const out = [];
    for (let y = 0; y < n; y++) { let s = ''; for (let x = 0; x < n; x++) {
      let ch;
      if (dir === 3) ch = g[y][x];
      else if (dir === 1) ch = g[y][n - 1 - x];
      else if (dir === 2) ch = g[x][y];          // transpose: right -> down
      else ch = g[n - 1 - x][y];                 // up
      s += ch; } out.push(s); }
    return out;
  }

  // Pac-Man frames, hand drawn facing right (13x13)
  const PAC_ART = [
    ['....#####....', '..#########..', '.###########.', '.###########.', '#############', '#############', '#############', '#############', '#############', '.###########.', '.###########.', '..#########..', '....#####....'],
    ['....#####....', '..#########..', '.###########.', '.##########..', '#########....', '#######......', '#####........', '#######......', '#########....', '.##########..', '.###########.', '..#########..', '....#####....'],
    ['....#####....', '..#######....', '.#######.....', '.######......', '######.......', '#####........', '####.........', '#####........', '######.......', '.######......', '.#######.....', '..#######....', '....#####....']
  ];
  // death sequence (facing up, mouth opening to nothing)
  const DEATH_ART = [
    ['.............', '.............', '.............', '#...........#', '###.......###', '#####...#####', '#############', '#############', '#############', '.###########.', '.###########.', '..#########..', '....#####....'],
    ['.............', '.............', '.............', '.............', '##.........##', '#####...#####', '#############', '#############', '#############', '.###########.', '.###########.', '..#########..', '....#####....'],
    ['.............', '.............', '.............', '.............', '.............', '####.....####', '######.######', '#############', '#############', '.###########.', '.###########.', '..#########..', '....#####....'],
    ['.............', '.............', '.............', '.............', '.............', '.............', '#####...#####', '###########.#', '#############', '.###########.', '.###########.', '..#########..', '....#####....'],
    ['.............', '.............', '.............', '.............', '.............', '.............', '.............', '###.......###', '######.######', '.###########.', '.###########.', '..#########..', '....#####....'],
    ['.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '###.......###', '.####...####.', '.###########.', '..#########..', '....#####....'],
    ['.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.##.......##.', '..#########..', '..#########..', '....#####....'],
    ['.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '...#######...', '...#######...', '....#####....'],
    ['.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.....###.....', '....#####....'],
    ['.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.............', '.....###.....'],
    ['......#......', '..#...#...#..', '...#.....#...', '.............', '.............', '##.........##', '.............', '.............', '.............', '...#.....#...', '..#...#...#..', '......#......', '.............']
  ];

  // Ghost (14x14), two skirt frames
  const GHOST_BODY = ['.....####.....', '...########...', '..##########..', '.############.', '.############.', '.############.', '##############', '##############', '##############', '##############', '##############', '##############'];
  const SKIRT = [['##.###..###.##', '#...##..##...#'], ['####.####.####', '.##...##...##.']];
  const FRIGHT_FACE = { 5: [4, 5, 8, 9], 6: [4, 5, 8, 9], 9: [3, 4, 7, 8, 11], 10: [2, 5, 6, 9, 10] };
  function ghostSprite(color, frame) { return sprite(GHOST_BODY.concat(SKIRT[frame]), { '#': color }); }
  function frightSprite(body, face, frame) {
    const rows = GHOST_BODY.concat(SKIRT[frame]).map((r, y) => {
      const f = FRIGHT_FACE[y]; if (!f) return r; const a = r.split(''); f.forEach(x => a[x] = 'f'); return a.join('');
    });
    return sprite(rows, { '#': body, 'f': face });
  }
  // eyes: whites at offsets by direction; pupils 2x2
  const EYE_W = ['.##.', '####', '####', '####', '.##.'];
  const EYE_POS = [[[2, 2], [8, 2]], [[1, 4], [7, 4]], [[2, 5], [8, 5]], [[3, 4], [9, 4]]];
  const PUP_OFF = [[1, 0], [0, 2], [1, 3], [2, 2]];
  function drawEyes(ctx, x, y, dir) {
    const ep = EYE_POS[dir], po = PUP_OFF[dir];
    for (const [ex, ey] of ep) {
      ctx.fillStyle = '#DEDEFF';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) if (EYE_W[r][c] === '#') ctx.fillRect(x + ex + c, y + ey + r, 1, 1);
      ctx.fillStyle = '#2121FF'; ctx.fillRect(x + ex + po[0], y + ey + po[1], 2, 2);
    }
  }

  // Bonus fruit (12x12)
  const FRUIT_ART = {
    cherry: [['..........ss', '........ssss', '.......s..s.', '......s...s.', '.....s...s..', '..rrrs...s..', '.rrrrr.rrrr.', 'rrwrrrrrrrrr', 'rwrrrrrwrrrr', 'rrrrrrwrrrr.', '.rrrr.rrrrr.', '.......rrr..'], { r: '#FF0000', w: '#DEDEFF', s: '#DE9751' }],
    strawberry: [['.....ww.....', '..gggwwggg..', '.rrggggggrrr', 'rrwrrggrrwrr', 'rrrrrrrrrrrr', 'rwrrrwrrrrwr', 'rrrrrrrrwrrr', '.rrwrrrrrrr.', '.rrrrrwrrwr.', '..rwrrrrrr..', '...rrrwrr...', '.....rr.....'], { r: '#FF0000', w: '#DEDEFF', g: '#00DE00' }],
    orange: [['.....gg.....', '....g.gggg..', '...oogggoo..', '..ooooooooo.', '.oooooooooo.', 'oooooooooooo', 'oooooooooooo', 'oooooooooooo', '.oooooooooo.', '.oooooooooo.', '..oooooooo..', '....oooo....'], { o: '#FFB851', g: '#00DE00' }],
    apple: [['.....s......', '..rr.s.rr...', '.rrrrsrrrrr.', 'rrrrrrrrrrrr', 'rrrrrrrrwwrr', 'rrrrrrrrrwrr', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '..rrrr.rrr..', '...rr...r...'], { r: '#FF0000', w: '#DEDEFF', s: '#DE9751' }],
    melon: [['.....ss.....', '....gggg....', '..gdgwdgdg..', '.gdgwgdgwdg.', '.dgwgdgwgdg.', 'gdgwgdgwgdgd', 'dgwgdgwgdgdg', 'gwgdgwgdgdgw', '.gdgwgdgdgw.', '.dgwgdgdgwg.', '..gdgdgwgd..', '....gdgd....'], { g: '#00DE00', d: '#007700', w: '#DEDEFF', s: '#DE9751' }],
    galaxian: [['.....rr.....', 'y...rrrr...y', 'y..rrrrrr..y', 'yyyyyyyyyyyy', 'yyybyyyybyyy', 'yybbyyyybbyy', 'y..bbbbbb..y', 'y...bbbb...y', '.....bb.....', '.....bb.....', '.....bb.....', '............'], { y: '#FFFF00', b: '#2121FF', r: '#FF0000' }],
    bell: [['.....yy.....', '....yyyy....', '...yyyyyy...', '..yywyyyyy..', '..ywyyyyyy..', '..ywyyyyyy..', '.yyyyyyyyyy.', '.ywyyyyyyyy.', 'yyyyyyyyyyyy', 'bbbbbbbbbbbb', '.....ww.....', '............'], { y: '#FFFF00', w: '#DEDEFF', b: '#47B8FF' }],
    key: [['...cccccc...', '..c..cc..c..', '..cccccccc..', '...cccccc...', '.....ww.....', '.....ww.....', '.....wwww...', '.....ww.....', '.....wwww...', '.....ww.....', '.....www....', '......w.....'], { c: '#47B8FF', w: '#DEDEFF' }]
  };
  const FRUIT_SPR = {}; for (const k in FRUIT_ART) FRUIT_SPR[k] = sprite(FRUIT_ART[k][0], FRUIT_ART[k][1]);
  const LEVEL_FRUIT = ['cherry', 'strawberry', 'orange', 'orange', 'apple', 'apple', 'melon', 'melon', 'galaxian', 'galaxian', 'bell', 'bell', 'key'];
  const FRUIT_PTS = { cherry: 100, strawberry: 300, orange: 500, apple: 700, melon: 1000, galaxian: 2000, bell: 3000, key: 5000 };
  const fruitFor = l => LEVEL_FRUIT[Math.min(l, 13) - 1];

  const ENERGIZER = sprite(['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'], { '#': '#FFB8AE' });

  // ================= Maze =================
  const HALF = ["##############", "#............#", "#.####.#####.#", "#o####.#####.#", "#.####.#####.#", "#.............", "#.####.##.####", "#.####.##.####", "#......##....#", "######.##### #", "_____#.##### #", "_____#.##     ", "_____#.## ###-", "######.## #   ", "      .   #   ", "######.## #   ", "_____#.## ####", "_____#.##     ", "_____#.## ####", "######.## ####", "#............#", "#.####.#####.#", "#.####.#####.#", "#o..##....... ", "###.##.##.####", "###.##.##.####", "#......##....#", "#.##########.#", "#.##########.#", "#.............", "##############"];
  const MAZE = HALF.map(r => r + r.split('').reverse().join(''));
  const MROWS = MAZE.length, OFFR = 3; // maze starts at tile row 3

  const isWallCh = ch => ch === '#' || ch === '_';
  function mch(c, r) { // r = screen tile row
    const mr = r - OFFR; if (mr < 0 || mr >= MROWS) return '#';
    if (c < 0 || c > 27) return isWallCh(MAZE[mr][0]) ? '#' : ' ';
    return MAZE[mr][c];
  }
  const open = (c, r) => { const ch = mch(c, r); return ch !== '#' && ch !== '_' && ch !== '-'; };

  // Render walls by tracing contours of a distance field: double lines for border & house, rounded corners.
  function buildMazeCanvas(color) {
    const h = MROWS * 8, cv = mkCanvas(W, h), c2 = cv.getContext('2d');
    const wallT = (c, r) => { if (r < 0 || r >= MROWS) return true; if (c < 0 || c > 27) return isWallCh(MAZE[r][0]); return isWallCh(MAZE[r][c]); };
    // components
    const comp = new Int16Array(28 * MROWS).fill(-1); let nComp = 0; const kind = [];
    for (let r = 0; r < MROWS; r++) for (let c = 0; c < 28; c++) {
      if (!wallT(c, r) || comp[r * 28 + c] >= 0) continue;
      const st = [[c, r]]; let edge = false; comp[r * 28 + c] = nComp;
      while (st.length) { const [x, y] = st.pop(); if (x === 0 || x === 27 || y === 0 || y === MROWS - 1) edge = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || nx > 27 || ny < 0 || ny >= MROWS) continue; if (wallT(nx, ny) && comp[ny * 28 + nx] < 0) { comp[ny * 28 + nx] = nComp; st.push([nx, ny]); } } }
      kind.push(edge ? 'outer' : 'inner'); nComp++;
    }
    const houseComp = comp[12 * 28 + 10]; if (houseComp >= 0) kind[houseComp] = 'house';
    const D = new Float32Array(W * h);
    for (let py = 0; py < h; py++) for (let px = 0; px < W; px++) {
      const tc = px >> 3, tr = py >> 3; if (!wallT(tc, tr)) { D[py * W + px] = -1; continue; }
      let d = 8; const cx = px + 0.5, cy = py + 0.5;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (wallT(tc + dc, tr + dr)) continue;
        const x0 = (tc + dc) * 8, y0 = (tr + dr) * 8;
        const dx = Math.max(x0 - cx, 0, cx - x0 - 8), dy = Math.max(y0 - cy, 0, cy - y0 - 8);
        d = Math.min(d, Math.hypot(dx, dy));
      }
      D[py * W + px] = d;
    }
    const TH = { outer: [3.5, 6.5], inner: [3.5], house: [0.5, 3.5] };
    const img = c2.createImageData(W, h);
    const rgb = [parseInt(color.substr(1, 2), 16), parseInt(color.substr(3, 2), 16), parseInt(color.substr(5, 2), 16)];
    const getD = (x, y) => (x < 0 || x >= W || y < 0 || y >= h) ? 9 : D[y * W + x];
    for (let py = 0; py < h; py++) for (let px = 0; px < W; px++) {
      const d = D[py * W + px]; if (d < 0) continue;
      const k = kind[comp[(py >> 3) * 28 + (px >> 3)]];
      let on = false;
      for (const t of TH[k]) { if (d >= t && (getD(px + 1, py) < t || getD(px - 1, py) < t || getD(px, py + 1) < t || getD(px, py - 1) < t)) on = true; }
      if (k === 'house' && d >= 3.5) on = false;
      if (on) { const i = (py * W + px) * 4; img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255; }
    }
    c2.putImageData(img, 0, 0);
    return cv;
  }

  // ================= Constants =================
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const BASE = 75.75757625 / 60;
  const mod8 = v => ((v % 8) + 8) % 8;
  const tX = x => Math.floor(x / 8), tY = y => Math.floor(y / 8);
  const RESTRICT = { '12,14': 1, '15,14': 1, '12,26': 1, '15,26': 1 };
  const GHOST_DEF = [
    { name: 'blinky', color: '#FF0000', scatter: [25, 0], homeX: 112, nick: 'SHADOW', nm: '"BLINKY"' },
    { name: 'pinky', color: '#FFB8FF', scatter: [2, 0], homeX: 112, nick: 'SPEEDY', nm: '"PINKY"' },
    { name: 'inky', color: '#00FFFF', scatter: [27, 35], homeX: 96, nick: 'BASHFUL', nm: '"INKY"' },
    { name: 'clyde', color: '#FFB852', scatter: [0, 35], homeX: 128, nick: 'POKEY', nm: '"CLYDE"' }
  ];

  function params(L) {
    let p;
    if (L === 1) p = { pac: .8, pacF: .9, gh: .75, tun: .4, fr: .5, el: .8 };
    else if (L <= 4) p = { pac: .9, pacF: .95, gh: .85, tun: .45, fr: .55, el: .9 };
    else if (L <= 20) p = { pac: 1, pacF: 1, gh: .95, tun: .5, fr: .6, el: 1 };
    else p = { pac: .9, pacF: .9, gh: .95, tun: .5, fr: .6, el: 1 };
    const ELR = [20, 30, 40, 40, 40, 50, 50, 50, 60, 60, 60, 80, 80, 80, 100, 100, 100, 100, 120];
    p.e1 = ELR[Math.min(L, 19) - 1]; p.e2 = p.e1 / 2;
    const FR = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1];
    p.fright = (L <= 18 ? FR[L - 1] : 0) * 60;
    p.flashes = [9, 12, 13, 15, 16, 18].indexOf(L) >= 0 ? 3 : 5;
    const m = L === 1 ? [7, 20, 7, 20, 5, 20, 5] : L <= 4 ? [7, 20, 7, 20, 5, 1033, 1 / 60] : [5, 20, 5, 20, 5, 1037, 1 / 60];
    p.modes = m.map(s => Math.max(1, Math.round(s * 60))); p.modes.push(Infinity);
    return p;
  }

  // ================= Sounds =================
  const N = { B4: 493.88, B5: 987.77, Fs5: 739.99, Ds5: 622.25, C5: 523.25, C6: 1046.5, G5: 783.99, E5: 659.25, F5: 698.46, Gs5: 830.61, A5: 880, B2: 123.47, B3: 246.94, C3: 130.81, C4: 261.63, Fs3: 185, G3: 196, A3: 220, Ds3: 155.56, E3: 164.81 };

  ArcadeRegistry.register({
    id: 'pacman', title: 'Pac-Man', year: 1980, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Enter/Space: start',
    marquee: { bg: '#000', fg: '#FFFF00', accent: '#2121DE' },
    create(api) {
      const A = api.audio;
      const MAZE_BLUE = buildMazeCanvas('#2121DE'), MAZE_WHITE = buildMazeCanvas('#DEDEFF');
      const PAC = PAC_ART.map(f => [0, 1, 2, 3].map(d => sprite(orient(f, d), { '#': '#FFFF00' })));
      const DEATH = DEATH_ART.map(f => sprite(f, { '#': '#FFFF00' }));
      const GSPR = GHOST_DEF.map(g => [ghostSprite(g.color, 0), ghostSprite(g.color, 1)]);
      const FRI = [[frightSprite('#2121FF', '#FFB8AE', 0), frightSprite('#2121FF', '#FFB8AE', 1)], [frightSprite('#DEDEFF', '#FF0000', 0), frightSprite('#DEDEFF', '#FF0000', 1)]];
      const BIGPAC = buildBigPac();

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 2, level = 1, extraGiven = false, firstReady = true;
      let dots = new Uint8Array(28 * 36), dotsLeft = 0, dotsEaten = 0;
      let pac, ghosts, P, modeIdx, modeT, frightT, combo, fruit, popups, freeze, houseT, globalMode, globalCount, wakaFlip = false, sndT = 0, eatPop = null;
      let attract = null, inter = null;
      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; A.tone(98, 0.28, { type: 'square', vol: 0.14 }); A.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 });
        return false;
      }
      const pushScreen = () => coinOp && api.credits > 0;
      function drawCredit(ctx) { tile(ctx, 'CREDIT ' + Math.min(99, api.credits), 2, 35, '#DEDEFF'); }

      function resetDots() {
        dotsLeft = 0; dotsEaten = 0;
        for (let r = 0; r < 36; r++) for (let c = 0; c < 28; c++) { const ch = mch(c, r); const v = ch === '.' ? 1 : ch === 'o' ? 2 : 0; dots[r * 28 + c] = v; if (v) dotsLeft++; }
      }
      function resetActors() {
        pac = { x: 112, y: 212, dir: 1, want: 1, acc: 0, anim: 0, pause: 0, moving: false };
        ghosts = GHOST_DEF.map((d, i) => ({
          ...d, idx: i, x: i === 0 ? 112 : d.homeX, y: i === 0 ? 116 : 140, dir: i === 0 ? 1 : (i === 1 ? 2 : 0),
          mode: i === 0 ? 'active' : 'house', fright: false, acc: 0, dotCount: 0, dotLimit: 0
        }));
        const g = ghosts;
        g[1].dotLimit = 0; g[2].dotLimit = level === 1 ? 30 : 0; g[3].dotLimit = level === 1 ? 60 : level === 2 ? 50 : 0;
        modeIdx = 0; modeT = 0; frightT = 0; combo = 0; freeze = 0; houseT = 0; eatPop = null;
        fruit = { on: false, t: 0, kind: fruitFor(level) }; popups = [];
      }
      function startGame() {
        score = 0; lives = 2; level = 1; extraGiven = false; P = params(1);
        resetDots(); resetActors(); globalMode = false; globalCount = 0;
        state = 'ready'; T = 0; firstReady = true;
        playIntro();
      }
      function nextLevel() {
        level++; P = params(level); resetDots(); resetActors(); globalMode = false;
        state = 'ready'; T = 0; firstReady = false;
      }
      function addScore(n) {
        score += n;
        if (!extraGiven && score >= 10000) { extraGiven = true; lives++; for (let i = 0; i < 6; i++) A.tone(1046, 0.08, { type: 'square', vol: 0.12, delay: i * 0.14 }); }
        if (score > hi) hi = score;
      }

      // ---------- sounds ----------
      function playIntro() {
        const u = 0.135;
        const mel = [[N.B4, 1], [N.B5, 1], [N.Fs5, 1], [N.Ds5, 1], [N.B5, .5], [N.Fs5, 1.5], [N.Ds5, 2], [N.C5, 1], [N.C6, 1], [N.G5, 1], [N.E5, 1], [N.C6, .5], [N.G5, 1.5], [N.E5, 2],
          [N.B4, 1], [N.B5, 1], [N.Fs5, 1], [N.Ds5, 1], [N.B5, .5], [N.Fs5, 1.5], [N.Ds5, 2], [N.Ds5, .5], [N.E5, .5], [N.F5, 1], [N.F5, .5], [N.Fs5, .5], [N.G5, 1], [N.G5, .5], [N.Gs5, .5], [N.A5, 1], [N.B5, 2]];
        A.melody(mel.map(([f, d]) => [f, d * u]), { type: 'square', vol: 0.09 });
        const bass = [[N.B2, 3], [N.B3, 1], [N.B2, 3], [N.B3, 1], [N.C3, 3], [N.C4, 1], [N.C3, 3], [N.C4, 1], [N.B2, 3], [N.B3, 1], [N.B2, 3], [N.B3, 1], [N.Fs3, 2], [N.G3, 2], [N.A3, 2], [N.B3, 2]];
        A.melody(bass.map(([f, d]) => [f, d * u]), { type: 'triangle', vol: 0.2 });
      }
      function sndWaka() { wakaFlip = !wakaFlip; if (wakaFlip) A.tone(220, 0.075, { type: 'triangle', vol: 0.22, slideTo: 520 }); else A.tone(520, 0.075, { type: 'triangle', vol: 0.22, slideTo: 220 }); }
      function sndBackground() {
        if (--sndT > 0) return;
        if (ghosts.some(g => g.mode === 'eyes' || g.mode === 'entering')) { sndT = 7; A.tone(1400, 0.11, { type: 'square', vol: 0.025, slideTo: 700 }); return; }
        if (frightT > 0) { sndT = 9; A.tone(260, 0.14, { type: 'sawtooth', vol: 0.035, slideTo: 700 }); return; }
        const stage = dotsLeft > 180 ? 0 : dotsLeft > 120 ? 1 : dotsLeft > 60 ? 2 : 3;
        const base = 330 + stage * 70; sndT = 14 - stage;
        A.tone(base, sndT / 60 * 1.1, { type: 'triangle', vol: 0.06, slideTo: base * 1.55 });
        A.tone(base * 1.55, sndT / 60, { type: 'triangle', vol: 0.05, slideTo: base, delay: sndT / 120 });
      }
      function sndDeath() {
        for (let i = 0; i < 9; i++) A.tone(880 - i * 70, 0.14, { type: 'square', vol: 0.08, slideTo: 440 - i * 40, delay: i * 0.13 });
        A.tone(200, 0.12, { type: 'square', vol: 0.1, slideTo: 60, delay: 1.25 }); A.tone(200, 0.12, { type: 'square', vol: 0.1, slideTo: 60, delay: 1.42 });
      }

      // ---------- movement ----------
      function wrapX(e) { if (e.x < -8) e.x += 240; else if (e.x >= 232) e.x -= 240; }
      function pacStep() {
        const c = tX(pac.x), r = tY(pac.y), ox = mod8(pac.x) - 4, oy = mod8(pac.y) - 4;
        const d = pac.want;
        if (d !== pac.dir) {
          if (d === (pac.dir + 2) % 4) pac.dir = d;
          else if (open(c + DX[d], r + DY[d])) pac.dir = d;
        }
        const along = DX[pac.dir] * ox + DY[pac.dir] * oy;
        if (!open(c + DX[pac.dir], r + DY[pac.dir]) && along >= 0) { pac.moving = false; return false; }
        pac.x += DX[pac.dir]; pac.y += DY[pac.dir];
        if (DX[pac.dir] !== 0 && oy !== 0) pac.y -= Math.sign(oy); // cornering
        if (DY[pac.dir] !== 0 && ox !== 0) pac.x -= Math.sign(ox);
        wrapX(pac); pac.moving = true; pac.anim++;
        return true;
      }
      function eatAt() {
        const c = tX(pac.x), r = tY(pac.y); if (c < 0 || c > 27) return;
        const v = dots[r * 28 + c]; if (!v) return;
        dots[r * 28 + c] = 0; dotsLeft--; dotsEaten++; houseT = 0;
        if (v === 1) { addScore(10); pac.pause = 1; } else { addScore(50); pac.pause = 3; energize(); }
        sndWaka();
        if (globalMode) {
          globalCount++;
          if (globalCount === 7 && ghosts[1].mode === 'house') ghosts[1].mode = 'leaving';
          if (globalCount === 17 && ghosts[2].mode === 'house') ghosts[2].mode = 'leaving';
          if (globalCount === 32 && ghosts[3].mode === 'house') { ghosts[3].mode = 'leaving'; globalMode = false; }
        } else { const g = preferred(); if (g) g.dotCount++; }
        if (dotsEaten === 70 || dotsEaten === 170) { fruit.on = true; fruit.t = 560 + Math.floor(Math.random() * 40); }
      }
      function energize() {
        combo = 0;
        for (const g of ghosts) {
          if (g.mode === 'active') g.dir = (g.dir + 2) % 4;
          if (P.fright > 0 && g.mode !== 'eyes' && g.mode !== 'entering') g.fright = true;
        }
        if (P.fright > 0) frightT = P.fright;
      }
      function preferred() { for (let i = 1; i < 4; i++) if (ghosts[i].mode === 'house') return ghosts[i]; return null; }
      function ghostTarget(g) {
        if (g.mode === 'eyes') return [13, 14];
        const pc = tX(pac.x), pr = tY(pac.y), pd = pac.dir;
        const elroy = g.idx === 0 && dotsLeft <= P.e1;
        if ((modeIdx % 2 === 0) && !elroy) return g.scatter;
        if (g.idx === 0) return [pc, pr];
        if (g.idx === 1) return [pc + 4 * DX[pd] - (pd === 0 ? 4 : 0), pr + 4 * DY[pd]];
        if (g.idx === 2) { const ax = pc + 2 * DX[pd] - (pd === 0 ? 2 : 0), ay = pr + 2 * DY[pd]; const b = ghosts[0]; return [2 * ax - tX(b.x), 2 * ay - tY(b.y)]; }
        const dx = tX(g.x) - pc, dy = tY(g.y) - pr; return dx * dx + dy * dy > 64 ? [pc, pr] : g.scatter;
      }
      function ghostStep(g) {
        if (g.mode === 'house') { g.y += g.dir === 0 ? -1 : 1; if (g.y <= 136) g.dir = 2; if (g.y >= 144) g.dir = 0; return; }
        if (g.mode === 'leaving') {
          if (g.x !== 112) { if (g.y !== 140) { g.y += g.y < 140 ? 1 : -1; return; } g.dir = g.x < 112 ? 3 : 1; g.x += g.x < 112 ? 1 : -1; }
          else if (g.y > 116) { g.y--; g.dir = 0; }
          else { g.mode = 'active'; g.dir = 1; }
          return;
        }
        if (g.mode === 'entering') {
          if (g.y === 116 && g.x !== 112) { g.x += g.x < 112 ? 1 : -1; }
          else if (g.y < 140) { g.y++; g.dir = 2; }
          else if (g.x !== g.homeX) { g.dir = g.x < g.homeX ? 3 : 1; g.x += g.x < g.homeX ? 1 : -1; }
          else { g.mode = 'leaving'; g.fright = false; }
          return;
        }
        if (mod8(g.x) === 4 && mod8(g.y) === 4) {
          const c = tX(g.x), r = tY(g.y);
          if (g.mode === 'eyes' && r === 14 && (c === 13 || c === 14)) { g.mode = 'entering'; return; }
          const opts = [];
          for (let d = 0; d < 4; d++) {
            if (d === (g.dir + 2) % 4) continue;
            if (!open(c + DX[d], r + DY[d])) continue;
            if (d === 0 && g.mode !== 'eyes' && !g.fright && RESTRICT[c + ',' + r]) continue;
            opts.push(d);
          }
          if (!opts.length) g.dir = (g.dir + 2) % 4;
          else if (g.fright) g.dir = opts[Math.floor(Math.random() * opts.length)];
          else {
            const [tx, ty] = ghostTarget(g); let best = 1e9;
            for (const d of opts) { const ex = c + DX[d] - tx, ey = r + DY[d] - ty, dd = ex * ex + ey * ey; if (dd < best) { best = dd; g.dir = d; } }
          }
        }
        g.x += DX[g.dir]; g.y += DY[g.dir]; wrapX(g);
      }
      function ghostSpeed(g) {
        if (g.mode === 'eyes' || g.mode === 'entering') return BASE * 1.6;
        if (g.mode === 'house' || g.mode === 'leaving') return BASE * 0.5;
        const r = tY(g.y), c = tX(g.x);
        if (r === 17 && (c <= 5 || c >= 22)) return BASE * P.tun;
        if (g.fright) return BASE * P.fr;
        if (g.idx === 0 && dotsLeft <= P.e2) return BASE * (P.el + 0.05);
        if (g.idx === 0 && dotsLeft <= P.e1) return BASE * P.el;
        return BASE * P.gh;
      }
      function collide() {
        const pc = tX(pac.x), pr = tY(pac.y);
        for (const g of ghosts) {
          if (g.mode !== 'active' || tX(g.x) !== pc || tY(g.y) !== pr) continue;
          if (g.fright) {
            const val = 200 << combo; combo = Math.min(combo + 1, 3); addScore(val);
            g.fright = false; g.mode = 'eyes'; eatPop = { g, val }; freeze = 60;
            A.tone(220, 0.5, { type: 'square', vol: 0.12, slideTo: 1800 });
          } else { state = 'dying'; T = 0; return; }
        }
      }

      function updatePlay() {
        if (freeze > 0) {
          freeze--;
          for (const g of ghosts) if ((g.mode === 'eyes' || g.mode === 'entering') && (!eatPop || g !== eatPop.g)) { g.acc += ghostSpeed(g); while (g.acc >= 1) { g.acc -= 1; ghostStep(g); } }
          if (freeze === 0) eatPop = null;
          return;
        }
        // input
        const keys = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
        for (let d = 0; d < 4; d++) if (api.pressed(keys[d])) pac.want = d;
        if (!api.key(keys[pac.want])) for (let d = 0; d < 4; d++) if (api.key(keys[d])) pac.want = d;
        // mode timers
        if (frightT > 0) { frightT--; if (frightT === 0) { for (const g of ghosts) g.fright = false; } }
        else if (++modeT >= P.modes[modeIdx]) { modeIdx++; modeT = 0; for (const g of ghosts) if (g.mode === 'active') g.dir = (g.dir + 2) % 4; }
        // pac
        if (pac.pause > 0) pac.pause--;
        else { pac.acc += BASE * (frightT > 0 ? P.pacF : P.pac); while (pac.acc >= 1) { pac.acc -= 1; pacStep(); eatAt(); } }
        collide(); if (state !== 'play') return;
        // house release
        const pg = preferred();
        if (pg && !globalMode && pg.dotCount >= pg.dotLimit) pg.mode = 'leaving';
        if (++houseT >= (level >= 5 ? 180 : 240)) { houseT = 0; const g = preferred(); if (g) g.mode = 'leaving'; }
        // ghosts
        for (const g of ghosts) { g.acc += ghostSpeed(g); while (g.acc >= 1) { g.acc -= 1; ghostStep(g); } }
        collide(); if (state !== 'play') return;
        // fruit
        if (fruit.on) {
          if (--fruit.t <= 0) fruit.on = false;
          else if (pac.y === 164 && Math.abs(pac.x - 112) <= 5) {
            fruit.on = false; const v = FRUIT_PTS[fruit.kind]; addScore(v); popups.push({ x: 112, y: 164, val: v, t: 120 });
            A.tone(600, 0.12, { type: 'square', vol: 0.12, slideTo: 1500 }); A.tone(900, 0.12, { type: 'square', vol: 0.1, slideTo: 2000, delay: 0.1 });
          }
        }
        for (const p of popups) p.t--; popups = popups.filter(p => p.t > 0);
        sndBackground();
        if (dotsLeft === 0) { state = 'clear'; T = 0; }
      }

      // ---------- title / attract ----------
      function newAttract() { attract = { phase: 0, px: 248, gx: [276, 292, 308, 324], eaten: [0, 0, 0, 0], pause: 0, pop: null, n: 0, anim: 0, done: 0 }; }
      newAttract();
      function updateAttract() {
        const a = attract; if (T < 500) return;
        if (a.pause > 0) { a.pause--; if (!a.pause) a.pop = null; return; }
        a.anim++;
        if (a.phase === 0) {
          a.px -= 1.2; for (let i = 0; i < 4; i++) a.gx[i] -= 1.28;
          if (a.px <= 36) { a.phase = 1; }
        } else if (a.phase === 1) {
          a.px += 1.25; for (let i = 0; i < 4; i++) if (!a.eaten[i]) a.gx[i] += 0.6;
          for (let i = 0; i < 4; i++) if (!a.eaten[i] && a.px + 4 >= a.gx[i]) { a.eaten[i] = 1; a.pop = { x: a.gx[i], val: 200 << a.n }; a.n++; a.pause = 50; }
          if (a.px > 260) { a.phase = 2; a.done = 0; }
        } else if (++a.done > 90) { T = 0; newAttract(); }
      }
      function renderTitle(ctx) {
        drawCredit(ctx);
        if (pushScreen()) {
          tile(ctx, 'PUSH START BUTTON', 5, 16, '#FFB852');
          tile(ctx, '1 PLAYER ONLY', 7, 20, '#00FFFF');
          tile(ctx, 'BONUS PAC-MAN FOR 10000', 1, 24, '#FFB8AE'); tile(ctx, 'PTS', 25, 24, '#FFB8AE');
          tile(ctx, '\u00a9 1980 NAMCO LTD.', 5, 28, '#FFB8FF');
          return;
        }
        tile(ctx, 'CHARACTER / NICKNAME', 7, 5, '#DEDEFF');
        for (let i = 0; i < 4; i++) {
          const b = 30 + i * 90, g = GHOST_DEF[i], row = 7 + i * 3;
          if (T > b) { ctx.drawImage(GSPR[i][0], 4 * 8 + 1, row * 8 - 4); drawEyes(ctx, 4 * 8 + 1, row * 8 - 4, 3); }
          if (T > b + 30) tile(ctx, '-' + g.nick, 7, row, g.color);
          if (T > b + 60) tile(ctx, g.nm, 18, row, g.color);
        }
        if (T > 400) {
          ctx.fillStyle = '#FFB8AE'; ctx.fillRect(10 * 8 + 3, 25 * 8 + 3, 2, 2); tile(ctx, '10', 12, 25, '#DEDEFF'); tile(ctx, 'PTS', 15, 25, '#DEDEFF');
          if ((T >> 3) & 1) ctx.drawImage(ENERGIZER, 10 * 8, 27 * 8); tile(ctx, '50', 12, 27, '#DEDEFF'); tile(ctx, 'PTS', 15, 27, '#DEDEFF');
        }
        if (T > 460) tile(ctx, '\u00a9 1980 NAMCO LTD.', 5, 31, '#FFB8FF');
        if (T >= 500) {
          const a = attract, y = 164;
          if (a.phase === 0 && ((T >> 3) & 1)) ctx.drawImage(ENERGIZER, 32, 160);
          for (let i = 0; i < 4; i++) {
            if (a.eaten[i]) continue; const x = Math.round(a.gx[i]) - 7, fr = (a.anim >> 3) & 1;
            if (a.phase === 0) { ctx.drawImage(GSPR[i][fr], x, y - 7); drawEyes(ctx, x, y - 7, 1); }
            else ctx.drawImage(FRI[0][fr], x, y - 7);
          }
          if (a.pop) tinyNum(ctx, a.pop.val, a.pop.x, y, '#00FFFF');
          else { const f = [2, 1, 0, 1][(a.anim >> 2) & 3]; ctx.drawImage(PAC[f][a.phase === 0 ? 1 : 3], Math.round(a.px) - 6, y - 6); }
        }
        if (api.credits === 0) { if (coinFlash > 0 || ((T >> 5) & 1)) tile(ctx, 'INSERT COIN', 8, 33, coinFlash > 0 && ((api.frame >> 2) & 1) ? '#FF0000' : '#FFB852'); }
        else if ((T >> 5) & 1) tile(ctx, 'PUSH START BUTTON', 5, 33, '#FFB852');
      }

      // ---------- intermission (Act I) ----------
      function startInter() {
        inter = { t: 0, px: 240, gx: 272, phase: 0, anim: 0 }; state = 'inter'; T = 0;
        const u = 0.12, m = [[N.C5, 1], [0, 1], [N.C5, 1], [0, 1], [N.G5, 1], [N.E5, 1], [N.C5, 2], [N.D5 || 587.33, 1], [N.E5, 1], [N.F5, 1], [N.E5, 1], [N.D5 || 587.33, 2], [0, 2],
          [N.C5, 1], [0, 1], [N.C5, 1], [0, 1], [N.G5, 1], [N.E5, 1], [N.C5, 2], [N.A5, 1], [N.G5, 1], [N.E5, 1], [N.D5 || 587.33, 1], [N.C5, 4]];
        A.melody(m.map(([f, d]) => [f, d * u]), { type: 'square', vol: 0.08 });
        A.melody(m.map(([f, d]) => [f / 4, d * u]), { type: 'triangle', vol: 0.18 });
      }
      function updateInter() {
        const it = inter; it.anim++;
        if (it.phase === 0) { it.px -= 1.3; it.gx -= 1.36; if (it.gx < -30) { it.phase = 1; it.gx = -20; it.px = -110; } }
        else { it.gx += 0.75; it.px += 1.3; if (it.px > 280) { nextLevel(); } }
      }
      function renderInter(ctx) {
        const it = inter, y = 164, fr = (it.anim >> 3) & 1;
        if (it.phase === 0) {
          const f = [2, 1, 0, 1][(it.anim >> 2) & 3]; ctx.drawImage(PAC[f][1], Math.round(it.px) - 6, y - 6);
          ctx.drawImage(GSPR[0][fr], Math.round(it.gx) - 7, y - 7); drawEyes(ctx, Math.round(it.gx) - 7, y - 7, 1);
        } else {
          ctx.drawImage(FRI[0][fr], Math.round(it.gx) - 7, y - 7);
          ctx.drawImage(BIGPAC[[2, 1, 0, 1][(it.anim >> 3) & 3]], Math.round(it.px) - 16, y - 24);
        }
      }

      // ---------- update ----------
      function update() {
        T++; pollCoins(); if (coinFlash > 0) coinFlash--;
        switch (state) {
          case 'title':
            if (!pushScreen()) updateAttract();
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            break;
          case 'ready':
            if (T >= (firstReady ? 250 : 120)) { state = 'play'; T = 0; sndT = 0; }
            break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (T === 60) sndDeath();
            if (T >= 60 + 11 * 9 + 50) {
              const respawn = () => { resetActors(); globalMode = true; globalCount = 0; state = 'ready'; T = 0; firstReady = false; };
              const gameOver = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
              if (lives <= 0) {
                if (api.offerContinue) { api.offerContinue(() => { lives = 2; respawn(); }, gameOver); }
                else gameOver();
              }
              else { lives--; respawn(); }
            }
            break;
          case 'clear':
            if (T >= 60 + 8 * 13 + 20) { if (level === 2 || level === 5 || level === 9) startInter(); else nextLevel(); }
            break;
          case 'inter': updateInter(); break;
          case 'gameover':
            if (T >= 200 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; newAttract(); }
            break;
        }
      }

      // ---------- render ----------
      function drawPacAt(ctx) {
        const f = pac.moving ? [2, 1, 0, 1][(pac.anim >> 1) & 3] : 1;
        ctx.drawImage(PAC[state === 'ready' ? 0 : f][pac.dir], pac.x - 6, pac.y - 6);
      }
      function drawGhost(ctx, g) {
        const x = g.x - 7, y = g.y - 7, fr = ((api.frame >> 3) & 1);
        if (g.mode === 'eyes' || g.mode === 'entering') { drawEyes(ctx, x, y, g.dir); return; }
        if (g.fright) {
          const flashing = frightT < P.flashes * 28 && ((frightT / 14) | 0) % 2 === 0 && frightT > 0;
          ctx.drawImage(FRI[flashing ? 1 : 0][fr], x, y); return;
        }
        ctx.drawImage(GSPR[g.idx][fr], x, y); drawEyes(ctx, x, y, g.dir);
      }
      function drawHUD(ctx) {
        if (state === 'title' || state === 'gameover' || ((api.frame >> 4) & 1)) tile(ctx, '1UP', 3, 0, '#DEDEFF');
        tile(ctx, 'HIGH SCORE', 9, 0, '#DEDEFF');
        const s = String(state === 'title' ? score : score || '00');
        tile(ctx, s, 7 - s.length, 1, '#DEDEFF');
        const hs = String(hi); tile(ctx, hs, 17 - hs.length, 1, '#DEDEFF');
        if (state !== 'title') {
          const showL = state === 'ready' && firstReady && T < 130 ? lives + 1 : lives;
          for (let i = 0; i < Math.min(showL, 5); i++) ctx.drawImage(PAC[1][1], 24 + i * 16, 274);
          const first = Math.max(1, level - 6);
          for (let l = first, i = 0; l <= level; l++, i++) ctx.drawImage(FRUIT_SPR[fruitFor(l)], 196 - i * 16, 274);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawHUD(ctx); renderTitle(ctx); return; }
        if (state === 'inter') { drawHUD(ctx); renderInter(ctx); return; }
        const flashWhite = state === 'clear' && T >= 60 && ((((T - 60) / 13) | 0) % 2 === 0);
        ctx.drawImage(flashWhite ? MAZE_WHITE : MAZE_BLUE, 0, OFFR * 8);
        if (!(state === 'clear')) { ctx.fillStyle = '#FFB8FF'; ctx.fillRect(104, 15 * 8 + 4, 16, 2); }
        // dots
        ctx.fillStyle = '#FFB8AE';
        const blink = state !== 'play' || ((api.frame / 10) | 0) % 2 === 0;
        for (let r = 3; r < 34; r++) for (let c = 0; c < 28; c++) {
          const v = dots[r * 28 + c]; if (!v) continue;
          if (v === 1) ctx.fillRect(c * 8 + 3, r * 8 + 3, 2, 2); else if (blink || state === 'ready') ctx.drawImage(ENERGIZER, c * 8, r * 8);
        }
        if (state === 'play' && fruit.on) ctx.drawImage(FRUIT_SPR[fruit.kind], 106, 158);
        for (const p of popups) tinyNum(ctx, p.val, p.x, p.y, '#FFB8FF');
        const showActors = !(state === 'ready' && firstReady && T < 130) && state !== 'gameover';
        if (showActors) {
          const ghostsVisible = !(state === 'dying' && T >= 60) && !(state === 'clear' && T >= 60);
          if (ghostsVisible) for (const g of ghosts) { if (eatPop && eatPop.g === g) continue; drawGhost(ctx, g); }
          if (eatPop) tinyNum(ctx, eatPop.val, eatPop.g.x, eatPop.g.y, '#00FFFF');
          if (state === 'dying' && T >= 60) { const f = Math.floor((T - 60) / 9); if (f < 11) ctx.drawImage(DEATH[f], pac.x - 6, pac.y - 6); }
          else if (!eatPop) drawPacAt(ctx);
        }
        if (state === 'ready') { if (firstReady && T < 130) tile(ctx, 'PLAYER ONE', 9, 14, '#00FFFF'); tile(ctx, 'READY!', 11, 20, '#FFFF00'); }
        if (state === 'gameover') tile(ctx, 'GAME  OVER', 9, 20, '#FF0000');
        drawHUD(ctx);
      }

      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, lives, level, dotsLeft }), set: o => { if ('lives' in o) lives = o.lives; if ('score' in o) score = o.score; }, kill: () => { if (state === 'play') { state = 'dying'; T = 0; } } });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });

  function buildBigPac() {
    // 32x32 "super" Pac-Man for the intermission, built from a hand-tuned quarter outline
    const frames = [];
    const mouths = [0, 0.38, 0.78];
    for (const m of mouths) {
      const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; const c = cv.getContext('2d'); c.fillStyle = '#FFFF00';
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - 16, dy = y + 0.5 - 16; if (dx * dx + dy * dy > 16 * 16) continue;
        if (m > 0 && dx > 0 && Math.abs(Math.atan2(dy, dx)) < m) continue; c.fillRect(x, y, 1, 1);
      }
      frames.push(cv);
    }
    return frames;
  }
})();
