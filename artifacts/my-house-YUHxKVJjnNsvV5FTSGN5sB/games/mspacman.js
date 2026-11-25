// Ms. Pac-Man (Midway/GCC, 1981) \u2014 faithful browser recreation for Arcade Games Galore.
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


  // Ms. Pac-Man: built from the round body + hand-placed bow, eye and lipstick (14x14, facing right)
  const BOW = ['rr...rr', 'rrr.rrr', 'rrrbrrr', 'rrr.rrr', 'rr...rr'];
  // per mouth frame: lips, eye (with lash) and beauty mark, hand placed on the 16x16 grid
  const MS_DETAIL = [
    { r: [[13, 8], [14, 8], [14, 7], [14, 9]], k: [[9, 5], [9, 6], [10, 4], [9, 11]] },          // closed
    { r: [[11, 5], [12, 5], [11, 11], [12, 11]], k: [[9, 5], [9, 6], [10, 4], [8, 12]] },        // half open
    { r: [[10, 3], [9, 4], [10, 13], [9, 12]], k: [[7, 5], [7, 6], [8, 4], [6, 11]] }            // wide open
  ];
  function msPacArt(f) {
    const g = []; for (let y = 0; y < 16; y++) g.push(new Array(16).fill('.'));
    const a = PAC_ART[f];
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) if (a[y][x] === '#') g[y + 2][x + 2] = 'y';
    const det = MS_DETAIL[f];
    for (const [x, y] of det.r) g[y][x] = 'r';
    for (const [x, y] of det.k) g[y][x] = 'k';
    for (let y = 0; y < BOW.length; y++) for (let x = 0; x < BOW[y].length; x++) g[y][x] = BOW[y][x] === '.' ? (y === 0 || y === 4 ? '.' : g[y][x]) : BOW[y][x];
    return g.map(r => r.join(''));
  }
  const MS_PAL = { y: '#FFFF00', r: '#FF0000', b: '#2121FF', k: '#000000' };
  function flipRows(rows) { return rows.map(r => r.split('').reverse().join('')); }
  function msFrame(f, dir) {
    const art = msPacArt(f);
    if (dir === 3) return art; if (dir === 1) return flipRows(art);
    return orient(art, dir === 0 ? 0 : 2);
  }

  // Bonus fruit (12x12) \u2014 Ms. Pac-Man's set
  const FRUIT_ART = {
    cherry: [['..........ss', '........ssss', '.......s..s.', '......s...s.', '.....s...s..', '..rrrs...s..', '.rrrrr.rrrr.', 'rrwrrrrrrrrr', 'rwrrrrrwrrrr', 'rrrrrrwrrrr.', '.rrrr.rrrrr.', '.......rrr..'], { r: '#FF0000', w: '#DEDEFF', s: '#DE9751' }],
    strawberry: [['.....ww.....', '..gggwwggg..', '.rrggggggrrr', 'rrwrrggrrwrr', 'rrrrrrrrrrrr', 'rwrrrwrrrrwr', 'rrrrrrrrwrrr', '.rrwrrrrrrr.', '.rrrrrwrrwr.', '..rwrrrrrr..', '...rrrwrr...', '.....rr.....'], { r: '#FF0000', w: '#DEDEFF', g: '#00DE00' }],
    orange: [['.....gg.....', '....g.gggg..', '...oogggoo..', '..ooooooooo.', '.oooooooooo.', 'oooooooooooo', 'oooooooooooo', 'oooooooooooo', '.oooooooooo.', '.oooooooooo.', '..oooooooo..', '....oooo....'], { o: '#FFB851', g: '#00DE00' }],
    pretzel: [['...bb..bb...', '..bwwbbwwb..', '.bw..bb..wb.', 'bw..b..b..wb', 'b..b....b..b', 'b..b....b..b', '.bb.b..b.bb.', '....b..b....', '...b.bb.b...', '..b..bb..b..', '.bb......bb.', '............'], { b: '#DE9751', w: '#FFDEAE' }],
    apple: [['.....s......', '..rr.s.rr...', '.rrrrsrrrrr.', 'rrrrrrrrrrrr', 'rrrrrrrrwwrr', 'rrrrrrrrrwrr', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '..rrrr.rrr..', '...rr...r...'], { r: '#FF0000', w: '#DEDEFF', s: '#DE9751' }],
    pear: [['......s.....', '.....s......', '....ggg.....', '...ggggg....', '...gwgggg...', '..gwggggggg.', '.ggwgggggggg', '.gggggggggg.', '.gggggggggg.', '..ggggggggg.', '...gggggg...', '............'], { g: '#00DE00', w: '#DEFFDE', s: '#DE9751' }],
    banana: [['..........b.', '.........yy.', '........yyy.', '.......yyyy.', '......yywy..', '.....yywyy..', 'b..yyywyyy..', 'yyyyywyyy...', '.yyyyyyy....', '..yyyyy.....', '............', '............'], { y: '#FFFF00', w: '#FFFFDE', b: '#DE9751' }]
  };
  const FRUIT_SPR = {}; for (const k in FRUIT_ART) FRUIT_SPR[k] = sprite(FRUIT_ART[k][0], FRUIT_ART[k][1]);
  const LEVEL_FRUIT = ['cherry', 'strawberry', 'orange', 'pretzel', 'apple', 'pear', 'banana'];
  const FRUIT_PTS = { cherry: 100, strawberry: 200, orange: 500, pretzel: 700, apple: 1000, pear: 2000, banana: 5000 };

  // ================= Mazes (left halves, mirrored) =================
  const MAZE_HALVES = [
    ["||||||||||||||", "|......||.....", "|o||||.||.||||", "|.||||.||.||||", "|.............", "|||.||.|||||.|", "__|.||.|||||.|", "|||.||.|||||.|", "   .||.......|", "|||.|||||||| |", "__|.|||||||| |", "__|.          ", "__|.||||| |||-", "__|.||||| |   ", "__|.||    |   ", "__|.|| || |   ", "|||.|| || ||||", "   .   ||     ", "|||.|||||||| |", "__|.|||||||| |", "__|.......   |", "__|.|||||.||||", "|||.|||||.||||", "|............ ", "|.||||.|||||.|", "|.||||.|||||.|", "|.||||.||....|", "|o||||.||.||||", "|.||||.||.||||", "|.............", "||||||||||||||"],
    ["||||||||||||||", "       ||.....", "|||||| ||.||||", "|||||| ||.||||", "|o...........|", "|.|||||||.||.|", "|.|||||||.||.|", "|.||......||.|", "|.||.||||.||..", "|.||.||||.||||", "|......||.||||", "||||||.||     ", "||||||.|| |||-", "|......|| |   ", "|.||||.|| |   ", "|.||||.   |   ", "|...||.|| ||||", "|||.||.||     ", "__|.||.|||| ||", "__|.||.|||| ||", "__|....|||  ||", "__|.||||||.|||", "|||.||||||.|||", "   .......... ", "|||.||.|||||.|", "|o..||.|||||.|", "|.||||........", "|.||||.||.||||", "|.||||.||.||||", "|......||.....", "||||||||||||||"],
    ["||||||||||||||", "|.........||..", "|.||.||||.||.|", "|o||.||||.||.|", "|.............", "|.||||.||.||||", "|.||||.||.||||", "|......||.....", "|||.||.||.||||", "   .||.||.||||", "|||.||.||.||||", "__|.||.||     ", "__|.||....|||-", "__|.||||| |   ", "__|...... |   ", "__|.||||| |   ", "|||.||||| ||||", "   ......     ", "|||.||||.||.||", "__|.||||.||.||", "__|....|....||", "|||.||.||.||||", "|||.||.||.||||", "|............ ", "|.||.|||||.|||", "|o||.|||||.|||", "|......||.....", "|.||||.||.||||", "|.||||.||.||||", "|.............", "||||||||||||||"]
  ].map(h => h.map(r => (r + r.split('').reverse().join('')).replace(/\|/g, '#')));
  // [layout, wall fill, wall border, dot colour]
  const MAZE_STYLE = [
    [0, '#FFB8AE', '#FF0000', '#DEDEFF'],
    [1, '#47B8FF', '#DEDEFF', '#FFFF00'],
    [2, '#DE9751', '#DEDEFF', '#FF0000'],
    [1, '#2121FF', '#FFB851', '#DEDEFF']
  ];
  function styleFor(L) {
    if (L <= 2) return 0; if (L <= 5) return 1; if (L <= 9) return 2; if (L <= 13) return 3;
    return (Math.floor((L - 14) / 4) % 2) ? 3 : 2;
  }
  let MAZE = MAZE_HALVES[0];
  const MROWS = 31, OFFR = 3;
  const isWallCh = ch => ch === '#' || ch === '_';
  function mch(c, r) {
    const mr = r - OFFR; if (mr < 0 || mr >= MROWS) return '#';
    if (c < 0 || c > 27) return isWallCh(MAZE[mr][0]) ? '#' : ' ';
    return MAZE[mr][c];
  }
  const open = (c, r) => { const ch = mch(c, r); return ch !== '#' && ch !== '_' && ch !== '-'; };

  // Filled walls with a 1px border, traced from a distance field (rounded corners like the arcade)
  function buildMazeCanvas(maze, fill, border) {
    const h = MROWS * 8, cv = mkCanvas(W, h), c2 = cv.getContext('2d');
    const wallT = (c, r) => { if (r < 0 || r >= MROWS) return true; if (c < 0 || c > 27) return isWallCh(maze[r][0]); return isWallCh(maze[r][c]); };
    const houseT = (c, r) => r >= 12 && r <= 16 && c >= 10 && c <= 17;
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
    const hex = s => [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
    const F = hex(fill), B = hex(border);
    const img = c2.createImageData(W, h);
    const getD = (x, y) => (x < 0 || x >= W || y < 0 || y >= h) ? 9 : D[y * W + x];
    for (let py = 0; py < h; py++) for (let px = 0; px < W; px++) {
      const d = D[py * W + px]; if (d < 0) continue;
      let col = null;
      if (houseT(px >> 3, py >> 3)) {
        for (const t of [0.5, 3.5]) if (d >= t && d < 3.5 + (t > 1 ? 9 : 0) && (getD(px + 1, py) < t || getD(px - 1, py) < t || getD(px, py + 1) < t || getD(px, py - 1) < t)) col = B;
        if (d >= 3.5) col = null;
      } else {
        const t = 2.5;
        if (d >= t) col = (getD(px + 1, py) < t || getD(px - 1, py) < t || getD(px, py + 1) < t || getD(px, py - 1) < t) ? B : F;
      }
      if (col) { const i = (py * W + px) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; }
    }
    c2.putImageData(img, 0, 0);
    return cv;
  }

  // ================= Constants =================
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const BASE = 75.75757625 / 60;
  const mod8 = v => ((v % 8) + 8) % 8;
  const tX = x => Math.floor(x / 8), tY = y => Math.floor(y / 8);
  const GHOST_DEF = [
    { name: 'blinky', color: '#FF0000', scatter: [25, 0], homeX: 112, nm: 'BLINKY' },
    { name: 'pinky', color: '#FFB8FF', scatter: [2, 0], homeX: 112, nm: 'PINKY' },
    { name: 'inky', color: '#00FFFF', scatter: [27, 35], homeX: 96, nm: 'INKY' },
    { name: 'sue', color: '#FFB852', scatter: [0, 35], homeX: 128, nm: 'SUE' }
  ];
  function params(L) {
    let p;
    if (L === 1) p = { pac: .8, pacF: .9, gh: .75, tun: .4, fr: .5, el: .8 };
    else if (L <= 4) p = { pac: .9, pacF: .95, gh: .85, tun: .45, fr: .55, el: .9 };
    else p = { pac: 1, pacF: 1, gh: .95, tun: .5, fr: .6, el: 1 };
    const ELR = [20, 30, 40, 40, 40, 50, 50, 50, 60, 60, 60, 80, 80, 80, 100, 100, 100, 100, 120];
    p.e1 = ELR[Math.min(L, 19) - 1]; p.e2 = p.e1 / 2;
    const FR = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1];
    p.fright = (L <= 18 ? FR[L - 1] : 0) * 60;
    p.flashes = [9, 12, 13, 15, 16, 18].indexOf(L) >= 0 ? 3 : 5;
    const m = L === 1 ? [7, 20, 7, 20, 5, 20, 5] : L <= 4 ? [7, 20, 7, 20, 5, 1033, 1 / 60] : [5, 20, 5, 20, 5, 1037, 1 / 60];
    p.modes = m.map(s => Math.max(1, Math.round(s * 60))); p.modes.push(Infinity);
    return p;
  }
  const N = { G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, Fs5: 739.99, G5: 783.99, D3: 146.83, C3: 130.81, G2: 98, D2: 73.42 };

  ArcadeRegistry.register({
    id: 'mspacman', title: 'Ms. Pac-Man', year: 1981, maker: 'Midway / GCC',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Enter/Space: start',
    marquee: { bg: '#000', fg: '#FFFF00', accent: '#FF0000' },
    create(api) {
      const A = api.audio;
      const MSPAC = [0, 1, 2].map(f => [0, 1, 2, 3].map(d => sprite(msFrame(f, d), MS_PAL)));
      const GSPR = GHOST_DEF.map(g => [ghostSprite(g.color, 0), ghostSprite(g.color, 1)]);
      const FRI = [[frightSprite('#2121FF', '#FFB8AE', 0), frightSprite('#2121FF', '#FFB8AE', 1)], [frightSprite('#DEDEFF', '#FF0000', 0), frightSprite('#DEDEFF', '#FF0000', 1)]];
      const mazeCache = {};
      const ENERGIZER_ROWS = ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'];
      function mazeArt(si) {
        if (!mazeCache[si]) {
          const [li, fill, border, dotc] = MAZE_STYLE[si];
          mazeCache[si] = { lay: MAZE_HALVES[li], cv: buildMazeCanvas(MAZE_HALVES[li], fill, border), white: buildMazeCanvas(MAZE_HALVES[li], '#000000', '#DEDEFF'), dot: dotc, en: sprite(ENERGIZER_ROWS, { '#': dotc }) };
        }
        return mazeCache[si];
      }
      let art = mazeArt(0);

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 2, level = 1, extraGiven = false, firstReady = true;
      let dots = new Uint8Array(28 * 36), dotsLeft = 0, dotsEaten = 0;
      let pac, ghosts, P, modeIdx, modeT, frightT, combo, fruit, popups, freeze, houseT, globalMode, globalCount, sndT = 0, eatPop = null, dotFlip = false;
      let tunnelRows = [], tunnelSet = {};
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

      function setupMaze() {
        art = mazeArt(styleFor(level)); MAZE = art.lay;
        tunnelRows = []; tunnelSet = {};
        for (let mr = 0; mr < MROWS; mr++) {
          if (isWallCh(MAZE[mr][0])) continue; const r = mr + OFFR; tunnelRows.push(r);
          for (let c = -2; c < 28 && (c < 0 || MAZE[mr][c] === ' '); c++) tunnelSet[c + ',' + r] = 1;
          for (let c = 29; c >= 0 && (c > 27 || MAZE[mr][c] === ' '); c--) tunnelSet[c + ',' + r] = 1;
        }
      }
      function resetDots() {
        dotsLeft = 0; dotsEaten = 0;
        for (let r = 0; r < 36; r++) for (let c = 0; c < 28; c++) { const ch = mch(c, r); const v = ch === '.' ? 1 : ch === 'o' ? 2 : 0; dots[r * 28 + c] = v; if (v) dotsLeft++; }
      }
      function fruitKind() { return level <= 7 ? LEVEL_FRUIT[level - 1] : LEVEL_FRUIT[Math.floor(Math.random() * 7)]; }
      function resetActors() {
        pac = { x: 112, y: 212, dir: 1, want: 1, acc: 0, anim: 0, pause: 0, moving: false };
        ghosts = GHOST_DEF.map((d, i) => ({
          ...d, idx: i, x: i === 0 ? 112 : d.homeX, y: i === 0 ? 116 : 140, dir: i === 0 ? 1 : (i === 1 ? 2 : 0),
          mode: i === 0 ? 'active' : 'house', fright: false, acc: 0, dotCount: 0, dotLimit: 0
        }));
        ghosts[2].dotLimit = level === 1 ? 30 : 0; ghosts[3].dotLimit = level === 1 ? 60 : level === 2 ? 50 : 0;
        modeIdx = 0; modeT = 0; frightT = 0; combo = 0; freeze = 0; houseT = 0; eatPop = null;
        fruit = { on: false }; popups = [];
      }
      function startGame() {
        score = 0; lives = 2; level = 1; extraGiven = false; P = params(1);
        setupMaze(); resetDots(); resetActors(); globalMode = false; globalCount = 0;
        state = 'ready'; T = 0; firstReady = true; playIntro();
      }
      function nextLevel() {
        level++; P = params(level); setupMaze(); resetDots(); resetActors(); globalMode = false;
        state = 'ready'; T = 0; firstReady = false;
      }
      function addScore(n) {
        score += n;
        if (!extraGiven && score >= 10000) { extraGiven = true; lives++; for (let i = 0; i < 6; i++) A.tone(1046, 0.08, { type: 'square', vol: 0.12, delay: i * 0.14 }); }
        if (score > hi) hi = score;
      }

      // ---------- sounds ----------
      function playIntro() {
        const u = 0.125;
        const mel = [[N.G4, .5], [N.A4, .5], [N.B4, 1], [N.D5, 1], [N.C5, .5], [N.B4, .5], [N.A4, 1], [N.E5, 1], [N.D5, 1], [N.B4, .5], [N.G4, .5], [N.A4, 1], [N.Fs4, 1], [N.G4, 1],
          [N.G4, .5], [N.A4, .5], [N.B4, 1], [N.D5, 1], [N.C5, .5], [N.B4, .5], [N.A4, 1], [N.E5, 1], [N.Fs5, 1], [N.D5, .5], [N.E5, .5], [N.Fs5, .5], [N.G5, 2.5]];
        A.melody(mel.map(([f, d]) => [f, d * u]), { type: 'square', vol: 0.08 });
        const bass = [[N.G2, 1], [N.D3, 1], [N.G2, 1], [N.D3, 1], [N.C3, 1], [N.G3, 1], [N.C3, 1], [N.G3, 1], [N.D3, 1], [N.A3, 1], [N.D3, 1], [N.A3, 1], [N.G2, 1], [N.D3, 1], [N.G2, 1], [N.D3, 1],
          [N.C3, 1], [N.G3, 1], [N.C3, 1], [N.G3, 1], [N.D3, 1], [N.A3, 1], [N.D2, 1], [N.G2, 3]];
        A.melody(bass.map(([f, d]) => [f, d * u]), { type: 'triangle', vol: 0.2 });
      }
      function sndDot() { dotFlip = !dotFlip; A.tone(dotFlip ? 300 : 360, 0.06, { type: 'square', vol: 0.06, slideTo: dotFlip ? 520 : 600 }); }
      function sndBackground() {
        if (--sndT > 0) return;
        if (ghosts.some(g => g.mode === 'eyes' || g.mode === 'entering')) { sndT = 7; A.tone(1500, 0.11, { type: 'square', vol: 0.025, slideTo: 800 }); return; }
        if (frightT > 0) { sndT = 10; A.tone(330, 0.15, { type: 'sawtooth', vol: 0.035, slideTo: 880 }); return; }
        const stage = dotsLeft > 180 ? 0 : dotsLeft > 120 ? 1 : dotsLeft > 60 ? 2 : 3;
        const base = 250 + stage * 55; sndT = 16 - stage;
        A.tone(base, sndT / 60 * 1.1, { type: 'triangle', vol: 0.06, slideTo: base * 1.35 });
        A.tone(base * 1.35, sndT / 60, { type: 'triangle', vol: 0.05, slideTo: base, delay: sndT / 120 });
      }
      function sndDeath() {
        for (let i = 0; i < 12; i++) A.tone(500 + (i % 4) * 120, 0.09, { type: 'square', vol: 0.08, slideTo: 260 + (i % 4) * 60, delay: i * 0.09 });
        A.tone(400, 0.4, { type: 'square', vol: 0.1, slideTo: 60, delay: 1.1 });
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
        if (!open(c + DX[pac.dir], r + DY[pac.dir]) && along >= 0) { pac.moving = false; return; }
        pac.x += DX[pac.dir]; pac.y += DY[pac.dir];
        if (DX[pac.dir] !== 0 && oy !== 0) pac.y -= Math.sign(oy);
        if (DY[pac.dir] !== 0 && ox !== 0) pac.x -= Math.sign(ox);
        wrapX(pac); pac.moving = true; pac.anim++;
      }
      function eatAt() {
        const c = tX(pac.x), r = tY(pac.y); if (c < 0 || c > 27) return;
        const v = dots[r * 28 + c]; if (!v) return;
        dots[r * 28 + c] = 0; dotsLeft--; dotsEaten++; houseT = 0;
        if (v === 1) { addScore(10); pac.pause = 1; } else { addScore(50); pac.pause = 3; energize(); }
        sndDot();
        if (globalMode) {
          globalCount++;
          if (globalCount === 7 && ghosts[1].mode === 'house') ghosts[1].mode = 'leaving';
          if (globalCount === 17 && ghosts[2].mode === 'house') ghosts[2].mode = 'leaving';
          if (globalCount === 32 && ghosts[3].mode === 'house') { ghosts[3].mode = 'leaving'; globalMode = false; }
        } else { const g = preferred(); if (g) g.dotCount++; }
        if ((dotsEaten === 64 || dotsEaten === 176) && !fruit.on) spawnFruit();
      }
      function spawnFruit() {
        const r = tunnelRows[Math.floor(Math.random() * tunnelRows.length)], side = Math.random() < 0.5;
        fruit = { on: true, kind: fruitKind(), x: side ? 231 : -8, y: r * 8 + 4, dir: side ? 1 : 3, stage: 0, acc: 0, dist: 0, t: 0, target: [13, 20] };
      }
      function stepFruit() {
        const f = fruit;
        if (++f.t > 60 * 45) { f.on = false; return; }
        f.acc += BASE * 0.42;
        while (f.acc >= 1 && f.on) {
          f.acc -= 1;
          if (mod8(f.x) === 4 && mod8(f.y) === 4) {
            const c = tX(f.x), r = tY(f.y);
            if (f.stage === 0 && c === f.target[0] && r === f.target[1]) {
              f.stage = 1; const er = tunnelRows[Math.floor(Math.random() * tunnelRows.length)];
              f.target = [Math.random() < 0.5 ? -4 : 31, er];
            }
            const opts = [];
            for (let d = 0; d < 4; d++) if (d !== (f.dir + 2) % 4 && open(c + DX[d], r + DY[d])) opts.push(d);
            if (!opts.length) f.dir = (f.dir + 2) % 4;
            else {
              let best = 1e9;
              for (const d of opts) { const ex = c + DX[d] - f.target[0], ey = r + DY[d] - f.target[1], dd = ex * ex + ey * ey + Math.random() * 6; if (dd < best) { best = dd; f.dir = d; } }
            }
          }
          f.x += DX[f.dir]; f.y += DY[f.dir]; f.dist++;
          if (f.stage === 1 && (f.x < -8 || f.x >= 232)) { f.on = false; return; }
          wrapX(f);
          if (f.dist % 16 === 0) A.tone(150, 0.05, { type: 'triangle', vol: 0.08, slideTo: 90 });
        }
        if (tX(pac.x) === tX(f.x) && tY(pac.y) === tY(f.y)) {
          f.on = false; const v = FRUIT_PTS[f.kind]; addScore(v); popups.push({ x: f.x, y: f.y, val: v, t: 120 });
          A.tone(600, 0.12, { type: 'square', vol: 0.12, slideTo: 1500 }); A.tone(900, 0.12, { type: 'square', vol: 0.1, slideTo: 2000, delay: 0.1 });
        }
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
            opts.push(d);
          }
          // Ms. Pac-Man: Blinky & Pinky wander pseudo-randomly during the opening scatter phase
          const wander = g.mode === 'active' && modeIdx === 0 && g.idx <= 1 && !(g.idx === 0 && dotsLeft <= P.e1);
          if (!opts.length) g.dir = (g.dir + 2) % 4;
          else if (g.fright || wander) g.dir = opts[Math.floor(Math.random() * opts.length)];
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
        if (tunnelSet[tX(g.x) + ',' + tY(g.y)]) return BASE * P.tun;
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
        const keys = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
        for (let d = 0; d < 4; d++) if (api.pressed(keys[d])) pac.want = d;
        if (!api.key(keys[pac.want])) for (let d = 0; d < 4; d++) if (api.key(keys[d])) pac.want = d;
        if (frightT > 0) { frightT--; if (frightT === 0) for (const g of ghosts) g.fright = false; }
        else if (++modeT >= P.modes[modeIdx]) { modeIdx++; modeT = 0; for (const g of ghosts) if (g.mode === 'active') g.dir = (g.dir + 2) % 4; }
        if (pac.pause > 0) pac.pause--;
        else { pac.acc += BASE * (frightT > 0 ? P.pacF : P.pac); while (pac.acc >= 1) { pac.acc -= 1; pacStep(); eatAt(); } }
        collide(); if (state !== 'play') return;
        const pg = preferred();
        if (pg && !globalMode && pg.dotCount >= pg.dotLimit) pg.mode = 'leaving';
        if (++houseT >= (level >= 5 ? 180 : 240)) { houseT = 0; const g = preferred(); if (g) g.mode = 'leaving'; }
        for (const g of ghosts) { g.acc += ghostSpeed(g); while (g.acc >= 1) { g.acc -= 1; ghostStep(g); } }
        collide(); if (state !== 'play') return;
        if (fruit.on) stepFruit();
        for (const p of popups) p.t--; popups = popups.filter(p => p.t > 0);
        sndBackground();
        if (dotsLeft === 0) { state = 'clear'; T = 0; fruit.on = false; }
      }

      // ---------- attract: marquee + cast parade ----------
      // Marquee box: tiles cols 6..21, rows 8..15 (pixels 48..176 x 64..128)
      const MQ = { x0: 52, y0: 68, x1: 172, y1: 124 };
      const lights = [];
      for (let x = MQ.x0; x < MQ.x1; x += 4) lights.push([x, MQ.y0]);
      for (let y = MQ.y0; y < MQ.y1; y += 4) lights.push([MQ.x1, y]);
      for (let x = MQ.x1; x > MQ.x0; x -= 4) lights.push([x, MQ.y1]);
      for (let y = MQ.y1; y > MQ.y0; y -= 4) lights.push([MQ.x0, y]);
      let parade = null;
      function newParade() { parade = { who: 0, x: 240, y: 180, phase: 0, anim: 0, done: [], hold: 0 }; }
      newParade();
      function updateAttract() {
        const p = parade; p.anim++;
        if (T < 60) return;
        if (p.who < 4) {
          const slotY = MQ.y1 - 16, slotX = MQ.x0 + 22 + p.who * 26;
          if (p.phase === 0) { p.x -= 1.4; if (p.x <= slotX) { p.x = slotX; p.phase = 1; } }
          else { p.y -= 1.4; if (p.y <= slotY) { p.y = slotY; p.done.push({ i: p.who, x: p.x, y: p.y }); p.who++; p.x = 240; p.y = 180; p.phase = 0; } }
        } else if (p.who === 4) {
          p.x -= 1.2; if (p.x <= 112) { p.x = 112; p.who = 5; p.hold = 0; }
        } else if (++p.hold > 420) { T = 0; newParade(); }
      }
      function renderTitle(ctx) {
        tile(ctx, 'CREDIT ' + Math.min(99, api.credits), 2, 35, '#DEDEFF');
        if (pushScreen()) {
          tile(ctx, 'PUSH START BUTTON', 5, 16, '#FFB852');
          tile(ctx, '1 PLAYER ONLY', 7, 20, '#00FFFF');
          tile(ctx, 'ADDITIONAL', 1, 24, '#FFB8AE'); ctx.drawImage(MSPAC[1][1], 12 * 8, 24 * 8 - 5); tile(ctx, 'AT 10000 PTS', 15, 24, '#FFB8AE');
          tile(ctx, '\u00a9 MIDWAY MFG CO', 6, 31, '#FF0000'); tile(ctx, '1980/1981', 9, 32, '#FF0000');
          return;
        }
        tile(ctx, '"MS. PAC-MAN"', 8, 5, '#FFB852');
        // chasing marquee lights
        ctx.fillStyle = '#100000';
        for (let i = 0; i < lights.length; i++) {
          const on = ((i + (api.frame >> 2)) % 8) === 0;
          ctx.fillStyle = on ? '#DEDEFF' : '#FF0000'; ctx.fillRect(lights[i][0], lights[i][1], 2, 2);
        }
        const p = parade;
        for (const d of p.done) { const x = Math.round(d.x) - 7, y = Math.round(d.y) - 7; ctx.drawImage(GSPR[d.i][(p.anim >> 3) & 1], x, y); drawEyes(ctx, x, y, 3); }
        if (p.who < 4) {
          tile(ctx, p.who === 0 ? 'WITH' : '', 8, 17, '#DEDEFF');
          tile(ctx, GHOST_DEF[p.who].nm, 14 - Math.ceil(GHOST_DEF[p.who].nm.length / 2), 19, GHOST_DEF[p.who].color);
          const x = Math.round(p.x) - 7, y = Math.round(p.y) - 7;
          ctx.drawImage(GSPR[p.who][(p.anim >> 3) & 1], x, y); drawEyes(ctx, x, y, p.phase === 0 ? 1 : 0);
        } else {
          tile(ctx, 'STARRING', 8, 17, '#DEDEFF'); tile(ctx, 'MS. PAC-MAN', 9, 19, '#FFFF00');
          const f = p.who === 4 ? [2, 1, 0, 1][(p.anim >> 2) & 3] : 1;
          ctx.drawImage(MSPAC[f][1], Math.round(p.x) - 8, p.y - 8);
        }
        if (p.who >= 5) {
          ctx.fillStyle = '#FFB8AE'; ctx.fillRect(10 * 8 + 3, 25 * 8 + 3, 2, 2); tile(ctx, '10 PTS', 12, 25, '#DEDEFF');
          if ((T >> 3) & 1) ctx.drawImage(art.en, 10 * 8, 27 * 8); tile(ctx, '50 PTS', 12, 27, '#DEDEFF');
        }
        tile(ctx, '\u00a9 MIDWAY MFG CO', 6, 31, '#FF0000'); tile(ctx, '1980/1981', 9, 32, '#FF0000');
        if (api.credits === 0) { if (coinFlash > 0 || ((T >> 5) & 1)) tile(ctx, 'INSERT COIN', 8, 34, coinFlash > 0 && ((api.frame >> 2) & 1) ? '#FF0000' : '#00FFFF'); }
        else if ((T >> 5) & 1) tile(ctx, 'PUSH START BUTTON', 5, 34, '#00FFFF');
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
            if (T >= 60 + 100 + 40) {
              const respawn = () => { resetActors(); globalMode = true; globalCount = 0; state = 'ready'; T = 0; firstReady = false; };
              const gameOver = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
              if (lives <= 0) {
                if (api.offerContinue) api.offerContinue(() => { lives = 2; respawn(); }, gameOver);
                else gameOver();
              }
              else { lives--; respawn(); }
            }
            break;
          case 'clear':
            if (T >= 60 + 8 * 13 + 20) nextLevel();
            break;
          case 'gameover':
            if (T >= 200 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; newParade(); }
            break;
        }
      }

      // ---------- render ----------
      function drawGhost(ctx, g) {
        const x = g.x - 7, y = g.y - 7, fr = ((api.frame >> 3) & 1);
        if (g.mode === 'eyes' || g.mode === 'entering') { drawEyes(ctx, x, y, g.dir); return; }
        if (g.fright) {
          const flashing = frightT > 0 && frightT < P.flashes * 28 && ((frightT / 14) | 0) % 2 === 0;
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
          for (let i = 0; i < Math.min(showL, 5); i++) ctx.drawImage(MSPAC[1][1], 24 + i * 16, 272);
          for (let l = Math.min(level, 7), i = 0; l >= 1; l--, i++) ctx.drawImage(FRUIT_SPR[LEVEL_FRUIT[l - 1]], 196 - i * 16, 274);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawHUD(ctx); renderTitle(ctx); return; }
        const flashWhite = state === 'clear' && T >= 60 && ((((T - 60) / 13) | 0) % 2 === 0);
        ctx.drawImage(flashWhite ? art.white : art.cv, 0, OFFR * 8);
        if (state !== 'clear') { ctx.fillStyle = '#FFB8FF'; ctx.fillRect(104, 15 * 8 + 4, 16, 2); }
        ctx.fillStyle = art.dot;
        const blink = state !== 'play' || ((api.frame / 10) | 0) % 2 === 0;
        for (let r = 3; r < 34; r++) for (let c = 0; c < 28; c++) {
          const v = dots[r * 28 + c]; if (!v) continue;
          if (v === 1) ctx.fillRect(c * 8 + 3, r * 8 + 3, 2, 2); else if (blink) ctx.drawImage(art.en, c * 8, r * 8);
        }
        if (state === 'play' && fruit.on) {
          const b = Math.round(Math.abs(Math.sin(fruit.dist * Math.PI / 16)) * 4);
          ctx.drawImage(FRUIT_SPR[fruit.kind], fruit.x - 6, fruit.y - 6 - b);
        }
        for (const p of popups) tinyNum(ctx, p.val, p.x, p.y, '#FFB8FF');
        const showActors = !(state === 'ready' && firstReady && T < 130) && state !== 'gameover';
        if (showActors) {
          const ghostsVisible = !(state === 'dying' && T >= 60) && !(state === 'clear' && T >= 60);
          if (ghostsVisible) for (const g of ghosts) { if (eatPop && eatPop.g === g) continue; drawGhost(ctx, g); }
          if (eatPop) tinyNum(ctx, eatPop.val, eatPop.g.x, eatPop.g.y, '#00FFFF');
          if (state === 'dying' && T >= 60) {
            const k = T - 60;
            if (k < 100) ctx.drawImage(MSPAC[k < 90 ? 1 : 0][[3, 2, 1, 0][(k >> 2) & 3]], pac.x - 8, pac.y - 8);
          } else if (!eatPop) {
            const f = state === 'ready' ? 0 : pac.moving ? [2, 1, 0, 1][(pac.anim >> 1) & 3] : 1;
            ctx.drawImage(MSPAC[f][pac.dir], pac.x - 8, pac.y - 8);
          }
        }
        if (state === 'ready') { if (firstReady && T < 130) tile(ctx, 'PLAYER ONE', 9, 14, '#00FFFF'); tile(ctx, 'READY!', 11, 20, '#FFFF00'); }
        if (state === 'gameover') tile(ctx, 'GAME  OVER', 9, 20, '#FF0000');
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, lives, level, dotsLeft }), set: o => { if ('lives' in o) lives = o.lives; if ('score' in o) score = o.score; }, kill: () => { if (state === 'play') { state = 'dying'; T = 0; } } });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
