// Triple Hunt (Atari, 1977) \u2014 black-and-white light-rifle gallery with the cabinet's coloured
// overlay. Three selectable games: Hit the Bear, Witch Hunt, Raccoon Hunt. Timed play,
// score, extended play when the operator threshold is reached.
(function () {
  'use strict';
  const W = 256, H = 224;

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
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '/': [0, 1, 2, 4, 8, 16, 0], "'": [4, 4, 8, 0, 0, 0, 0],
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '@': [14, 17, 23, 21, 23, 16, 14], '(': [2, 4, 8, 8, 8, 4, 2],
    ')': [8, 4, 2, 2, 2, 4, 8], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '*': [0, 4, 21, 14, 21, 4, 0], ' ': [0, 0, 0, 0, 0, 0, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'c') x = Math.round(x - w / 2); else if (align === 'r') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const b = g[r]; if (!b) continue;
        for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
    return w;
  }

  // ---------- sprite helpers ----------
  function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const PAL = { '#': '#ffffff', 'o': '#9a9a9a', 'x': '#000000' };
  function mk(rows) {
    const h = rows.length; let w = 0; for (const r of rows) w = Math.max(w, r.length);
    const c = newCanvas(w, h), g = c.getContext('2d');
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x], col = PAL[ch];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); mask[y * w + x] = 1; }
    }
    c.mask = mask; return c;
  }
  function flip(src) {
    const c = newCanvas(src.width, src.height), g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    const m = new Uint8Array(src.width * src.height);
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) m[y * src.width + x] = src.mask[y * src.width + (src.width - 1 - x)];
    c.mask = m; return c;
  }
  // pixel-mask hit test with tolerance (rifle sight isn't perfect)
  function hitImg(img, ox, oy, px, py, tol) {
    const lx = Math.floor(px - ox), ly = Math.floor(py - oy);
    for (let dy = -tol; dy <= tol; dy++) for (let dx = -tol; dx <= tol; dx++) {
      const x = lx + dx, y = ly + dy;
      if (x >= 0 && y >= 0 && x < img.width && y < img.height && img.mask[y * img.width + x]) return true;
    }
    return false;
  }

  const BEAR_W0 = [
    '.....................########....##...........',
    '.................#############...#o...#.......',
    '............############o##############.......',
    '........###############o#######o#######.......',
    '.....#############o####o#######o########......',
    '....#############oo###o#######oo######x###....',
    '...####o#########o############o#############x.',
    '.######o######################o#############x.',
    '.#####o#####################################..',
    '..####o#################################xxxx..',
    '...###################################........',
    '....##############################............',
    '.....###o##################o######............',
    '.....o###o################o#######............',
    '....ooooooo#####ooooooooooo######.............',
    '....ooooooo######........o#######o............',
    '....oooooooo#####........o######oo............',
    '...oooooo..o######......o#######oo............',
    '...oooooo..#o#####......o#######ooo...........',
    '...ooooo....######.....o.######oooo...........',
    '..oooooo....#######.....#######oooo...........',
    '..oooooo....#######.....#######ooooo..........',
    '..oooooo....#######.....######ooooooo.........',
    '..ooooooo...########...#######................',
    '.......................########...............'
  ];
  const BEAR_W1 = [
    '.....................########....##...........',
    '.................#############...#o...#.......',
    '............############o##############.......',
    '........###############o#######o#######.......',
    '.....#############o####o#######o########......',
    '....#############oo###o#######oo######x###....',
    '...####o#########o############o#############x.',
    '.######o######################o#############x.',
    '.#####o#####################################..',
    '..####o#################################xxxx..',
    '...###################################........',
    '....##############################............',
    '.....###o##################o######............',
    '......##o##################o######............',
    '......ooo#######oooooooooooo######............',
    '.....oooo#######..........oo######............',
    '.....ooooo######..........o#######............',
    '.....ooooo######..........o#######............',
    '.....ooooo######..........o######.............',
    '.....ooooo######...........######.............',
    '.....oooo#######...........######.............',
    '.....oooo#######...........######.............',
    '.....oooo#######..........#######.............',
    '.........#######..........########............',
    '.........########.............................'
  ];
  const BEAR_W2 = [
    '.....................########....##...........',
    '.................#############...#o...#.......',
    '............############o##############.......',
    '........###############o#######o#######.......',
    '.....#############o####o#######o########......',
    '....#############oo###o#######oo######x###....',
    '...####o#########o############o#############x.',
    '.######o######################o#############x.',
    '.#####o#####################################..',
    '..####o#################################xxxx..',
    '...###################################........',
    '....###############################...........',
    '.....###o##################o#######...........',
    '......#o####################o######...........',
    '......oo########ooooooooooo#o#######..........',
    '......o#######..........oooooo######..........',
    '.....oo######o..........oooooo######..........',
    '.....o#######o.........oooooo.o#####..........',
    '....o.######oo.........oooooo.o######.........',
    '.....#######ooo........ooooo..#o#####.........',
    '.....#######ooo.......oooooo...######.........',
    '.....######oooo.......oooooo...#######........',
    '....#######ooooo......ooooooo..#######........',
    '....########ooooo..............#######........',
    '...............................########.......'
  ];
  const BEAR_W3 = [
    '.....................########....##...........',
    '.................#############...#o...#.......',
    '............############o##############.......',
    '........###############o#######o#######.......',
    '.....#############o####o#######o########......',
    '....#############oo###o#######oo######x###....',
    '...####o#########o############o#############x.',
    '.######o######################o#############x.',
    '.#####o#####################################..',
    '..####o#################################xxxx..',
    '...###################################........',
    '....###############################...........',
    '.....###o##################o#######...........',
    '......##o##################o#######...........',
    '......ooo#######oooooooooooo#######...........',
    '......ooo######...........ooo######...........',
    '.......o#######..........oooo######...........',
    '.......o#######..........oooo######...........',
    '.......o#######..........oooo######...........',
    '.......o######...........ooo#######...........',
    '.......o######...........ooo#######...........',
    '.......o######...........ooo#######...........',
    '.......o######...........ooo#######...........',
    '.......#######...........ooo########..........',
    '.......########...............................'
  ];
  const BEAR_REAR = [
    '...............##...............',
    '...............#o#..............',
    '....###........#######...###....',
    '.....#.........########..#......',
    '....###.......#############.....',
    '....####......########x#####....',
    '.....####.....##############x...',
    '......###.....###############...',
    '......####....##############....',
    '.......###.....###########......',
    '........###...##########........',
    '.........##.###########.........',
    '..........###########...........',
    '..........############..........',
    '.........##############.........',
    '.........####o#########.........',
    '........#####o#########.........',
    '........#####o#########.........',
    '........#####o#########.........',
    '........#####o#####o###.........',
    '.......######o#####o###.........',
    '.......#####oo######o##.........',
    '.......#####o#######o##.........',
    '.......#####o#######o##.........',
    '.......#####o########o#.........',
    '.......#####o########o#.........',
    '........####o##########.........',
    '........####o#########..........',
    '........##############..........',
    '........###oooooooooo#..........',
    '........##############..........',
    '........#######.x#####..........',
    '.......########.x#####..........',
    '.......#######..x######.........',
    '.......#######..x######.........',
    '.......#######..x######.........',
    '.......#######..x######.........',
    '.......#######..x#######........',
    '.......########.x########.......'
  ];
  const BEAR_ROAR = [
    '....###........##........###....',
    '.....#.........#o#.......#......',
    '....###........#######..###.....',
    '....####.......########.####....',
    '.....####.....#############.....',
    '.....####.....########x#####....',
    '......###.....##############x...',
    '......####....###############...',
    '.......###....###########xx#x...',
    '........###....#########xxxxx...',
    '........###...#############xx...',
    '.........##.###########.####....',
    '..........###########...........',
    '..........############..........',
    '.........##############.........',
    '.........####o#########.........',
    '........#####o#########.........',
    '........#####o#########.........',
    '........#####o#########.........',
    '........#####o#####o###.........',
    '.......######o#####o###.........',
    '.......#####oo######o##.........',
    '.......#####o#######o##.........',
    '.......#####o#######o##.........',
    '.......#####o########o#.........',
    '.......#####o########o#.........',
    '........####o##########.........',
    '........####o#########..........',
    '........##############..........',
    '........###oooooooooo#..........',
    '........##############..........',
    '........#######.x#####..........',
    '.......########.x#####..........',
    '.......#######..x######.........',
    '.......#######..x######.........',
    '.......#######..x######.........',
    '.......#######..x######.........',
    '.......#######..x#######........',
    '.......########.x########.......'
  ];
  const GHOST0 = [
    '.......########.......',
    '......##########......',
    '.....############.....',
    '....##############....',
    '....##############....',
    '....###xx####xx###....',
    '....##xoxx##xoxx##....',
    '...###xxxx##xxxx###...',
    '#..####xx####xx####..#',
    '##.################.##',
    '#####################.',
    '.#########xx########..',
    '..#######xxxx######...',
    '...#######xx#######...',
    '..#################...',
    '..#################...',
    '..#################...',
    '..##################..',
    '..####.#####.#####.#..',
    '...###..####..####....',
    '...##....##....##.....',
    '...#.....#.....#......'
  ];
  const GHOST1 = [
    '.......########.......',
    '......##########......',
    '.....############.....',
    '....##############....',
    '....##############....',
    '....###xx####xx###....',
    '....##xoxx##xoxx##....',
    '...###xxxx##xxxx###...',
    '#..####xx####xx####...',
    '##.################..#',
    '.#########xx##########',
    '..#######xxxx########.',
    '...######xxxx#######..',
    '...######xxxx######...',
    '..########xx#######...',
    '..#################...',
    '..#################...',
    '..##################..',
    '..#.#####.#####.####..',
    '.....####..####..###..',
    '......##....##....##..',
    '......#.....#.....#...'
  ];
  const WITCH0 = [
    '..................######......................',
    '...................######.....................',
    '....................######....................',
    '.....................ooooooo..................',
    '...................############...............',
    '...................############...............',
    '.......................####...................',
    '.....................oo###x##.................',
    '..................ooooo#######................',
    '.................oo#oo#####...................',
    '..............#####oo######...................',
    '..........########o########...................',
    '.........###################..................',
    '##......######################................',
    '###....########################...............',
    '#xxxx.........############..####..ooooo.......',
    '####xx.......##############ooo#oooooooo.......',
    '#######.....##############ooooooooo...........',
    '#xxxxx#...ooo#####oooooo###...................',
    '#######oooooooooooo.....###...................',
    '#######oooo..............######...............',
    '#xxxxx#...................##..................',
    '######....................#.#.................',
    '####xx........................................',
    '#xxx..........................................',
    '.##...........................................'
  ];
  const WITCH1 = [
    '..................######......................',
    '...................######.....................',
    '....................######....................',
    '.....................ooooooo..................',
    '...................############...............',
    '...................############...............',
    '.......................####...................',
    '.....................oo###x##.................',
    '.........###......ooooo#######................',
    '......##########.oo#oo#####...................',
    '......#############oo######...................',
    '........##########o########...................',
    '..........#####.############..................',
    '##...........#.###############................',
    '###...........#################...............',
    '#xxxx.........############..####..ooooo.......',
    '####xx.......##############ooo#oooooooo.......',
    '#######.....##############ooooooooo...........',
    '#xxxxx#...ooo#####oooooo###...................',
    '#######oooooooooooo.....###...................',
    '#######oooo..............######...............',
    '#xxxxx#...................##..................',
    '######....................#.#.................',
    '####xx........................................',
    '#xxx..........................................',
    '.##...........................................'
  ];
  const COON0 = [
    '.......................#..#.....',
    '.......................####.....',
    '.......o..########....######....',
    '##oo##oo.####################...',
    '##oo##oo################xx#xx#..',
    '##oo##oo#####ooooooo###########x',
    '##oo...#######################..',
    '.......################.........',
    '........##############..........',
    '.........##o......oo##..........',
    '.........##oo.....oo.##.........',
    '.........###oo....ooo###........'
  ];
  const COON1 = [
    '.......................#..#.....',
    '.......................####.....',
    '.......o..########....######....',
    '...o##oo.####################...',
    '##oo##oo################xx#xx#..',
    '##oo##oo#####ooooooo###########x',
    '##oo...#######################..',
    '##o....################.........',
    '........############.oo.........',
    '.......oo...##...##..oo.........',
    '.......oo....##..##...oo........',
    '.......ooo...###.###..ooo.......'
  ];
  const CLIMB0 = [
    '....#......#....',
    '....######.#....',
    '....#######.....',
    '....########....',
    '....xxxx#xxxx...',
    '....########...#',
    '.....###o##...##',
    '.....######..###',
    '....###########.',
    '##############..',
    '########o####...',
    '..######o###....',
    '....####o###....',
    '....####o###....',
    '....####o###....',
    '....####o###....',
    '...#########....',
    '.###########....',
    '.##...#######...',
    '.......###.###..',
    '.......###..###.',
    '.......ooo...##.',
    '.......ooo....#.',
    '.......###......',
    '.......###......',
    '.......ooo......'
  ];
  const CLIMB1 = [
    '....#......#....',
    '....######.#....',
    '....#######.....',
    '....########....',
    '....xxxx#xxxx...',
    '....########....',
    '#....###o##.....',
    '##...######.....',
    '.##.########....',
    '..##############',
    '...#####o#######',
    '....####o#####..',
    '....####o###....',
    '....####o###....',
    '....####o###....',
    '....####o###....',
    '....#########...',
    '....###########.',
    '...##.####..###.',
    '..##...###......',
    '.##....###......',
    '.#.....ooo......',
    '.......ooo......',
    '.......###......',
    '.......###......',
    '.......ooo......'
  ];
  const BAT0 = [
    '..##...............##...',
    '.#####............####..',
    '..#####..........####...',
    '...#####...#.#..####....',
    '..#######..##..######...',
    '....################....',
    '......#####x#x####......',
    '.......##########.......',
    '..........####..........',
    '...........##...........'
  ];
  const BAT1 = [
    '...........#.#..........',
    '....###....##...####....',
    '.######################.',
    '###########x#x#########.',
    '.##.###############..#..',
    '.....##...####..##......',
    '...........##...........'
  ];
  const BAT2 = [
    '...........#.#..........',
    '...........##...........',
    '..........####..........',
    '.........##x#x#.........',
    '.......##########.......',
    '.....#############......',
    '....######.##.#####.....',
    '...######......#####....',
    '..###.##........##.##...'
  ];

  const S = {
    bear: [BEAR_W0, BEAR_W1, BEAR_W2, BEAR_W3].map(mk), rear: mk(BEAR_REAR), roar: mk(BEAR_ROAR),
    ghost: [mk(GHOST0), mk(GHOST1)], bat: [mk(BAT0), mk(BAT1), mk(BAT2), mk(BAT1)],
    witch: [mk(WITCH0), mk(WITCH1)], coon: [mk(COON0), mk(COON1)], climb: [mk(CLIMB0), mk(CLIMB1)]
  };
  S.bearL = S.bear.map(flip); S.rearL = flip(S.rear); S.roarL = flip(S.roar);
  S.witchL = S.witch.map(flip); S.coonL = S.coon.map(flip);

  // ---------- grayscale backdrop art (the cabinet's painted scenes seen in B&W) ----------
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function bayer(x, y) { const m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; return m[(y & 3) * 4 + (x & 3)] / 16; }
  function pine(g, x, base, h, col, r) {
    for (let y = 0; y < h; y++) {
      const t = y / h, tier = (y % 9) / 9;
      const w = Math.round((2 + t * h * 0.32) * (0.7 + tier * 0.45));
      g.fillStyle = col; g.fillRect(x - w, base - h + y, w * 2 + 1, 1);
    }
    g.fillRect(x - 1, base - 3, 3, 4);
  }
  function trunk(g, x, w, top, bottom, light, dark, r) {
    for (let y = top; y < bottom; y++) {
      const flare = y > bottom - 10 ? (y - (bottom - 10)) * 0.6 : 0;
      const x0 = Math.round(x - w / 2 - flare), x1 = Math.round(x + w / 2 + flare);
      g.fillStyle = '#000'; g.fillRect(x0, y, x1 - x0, 1);
      g.fillStyle = light; g.fillRect(x0, y, 1, 1); g.fillRect(x1 - 1, y, 1, 1);
    }
    for (let i = 0; i < (bottom - top) / 3; i++) {
      const yy = top + Math.floor(r() * (bottom - top - 6)), xx = Math.round(x - w / 2 + 2 + r() * (w - 4));
      g.fillStyle = dark; g.fillRect(xx, yy, 1, 3 + Math.floor(r() * 5));
    }
  }

  function sceneBear() {
    const c = newCanvas(W, H), g = c.getContext('2d'), r = rng(5);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    // far pine ridge
    for (let i = 0; i < 26; i++) pine(g, i * 11 + r() * 8, 128 + r() * 6, 34 + r() * 26, '#262626', r);
    for (let i = 0; i < 18; i++) pine(g, i * 15 + r() * 10, 150 + r() * 6, 40 + r() * 30, '#383838', r);
    // forest floor
    for (let y = 150; y < H; y++) for (let x = 0; x < W; x++) {
      const v = (y - 150) / 74;
      if (bayer(x, y) < 0.15 + v * 0.25) { g.fillStyle = y > 196 ? '#5a5a5a' : '#3a3a3a'; g.fillRect(x, y, 1, 1); }
    }
    g.fillStyle = '#6a6a6a'; g.fillRect(0, 197, W, 1);
    // ferns / grass tufts on the path edge
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = 199 + r() * 20, h = 3 + r() * 6;
      g.fillStyle = '#7a7a7a';
      for (let k = 0; k < h; k++) { g.fillRect(Math.round(x - k * 0.5), Math.round(y - k), 1, 1); g.fillRect(Math.round(x + k * 0.5), Math.round(y - k), 1, 1); }
    }
    // mid trunks with branches
    for (const [x, w] of [[22, 6], [118, 5], [150, 7], [236, 6]]) {
      trunk(g, x, w, 16, 160, '#555', '#333', r);
      g.fillStyle = '#444';
      for (let k = 0; k < 4; k++) { const by = 30 + k * 26 + r() * 10, dir = k % 2 ? 1 : -1; for (let j = 0; j < 14; j++) g.fillRect(Math.round(x + dir * (w / 2 + j)), Math.round(by - j * 0.5), 1, 1); }
    }
    return c;
  }
  function sceneBearFront() {
    // foreground trunks the bear walks behind (drawn over the bear)
    const c = newCanvas(W, H), g = c.getContext('2d'), r = rng(9);
    trunk(g, 74, 14, 14, 224, '#d0d0d0', '#555', r);
    trunk(g, 196, 12, 14, 224, '#d0d0d0', '#555', r);
    // leafy boughs at the top
    for (const [x, d] of [[74, 1], [196, -1]]) {
      g.fillStyle = '#bbb';
      for (let j = 0; j < 40; j++) { g.fillRect(Math.round(x + d * j), Math.round(30 + j * 0.3), 1, 1); if (j % 5 === 0) { g.fillRect(Math.round(x + d * j), Math.round(31 + j * 0.3), 1, 3); } }
    }
    return c;
  }

  function sceneWitch() {
    const c = newCanvas(W, H), g = c.getContext('2d'), r = rng(13);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    // stars
    for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.3 ? '#999' : '#555'; g.fillRect(Math.floor(r() * W), 16 + Math.floor(r() * 70), 1, 1); }
    // moon with craters
    for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) {
      const d = Math.hypot(x, y); if (d > 11) continue;
      const shade = Math.hypot(x + 5, y + 2) < 11 ? '#c8c8c8' : '#808080';
      g.fillStyle = shade; g.fillRect(212 + x, 38 + y, 1, 1);
    }
    g.fillStyle = '#909090'; g.fillRect(208, 34, 3, 2); g.fillRect(214, 42, 2, 2); g.fillRect(206, 41, 2, 1);
    // hill
    for (let x = 0; x < W; x++) { const h = 184 - Math.sin(x / 50) * 6; g.fillStyle = '#2a2a2a'; g.fillRect(x, Math.round(h), 1, H - Math.round(h)); }
    // the haunted house (outline art)
    const hx = 64, hy = 92, hw = 128, hh = 96;
    g.fillStyle = '#1c1c1c'; g.fillRect(hx, hy, hw, hh);
    // clapboard
    g.fillStyle = '#2c2c2c'; for (let y = hy + 3; y < hy + hh; y += 4) g.fillRect(hx, y, hw, 1);
    g.fillStyle = '#707070'; g.fillRect(hx, hy, 1, hh); g.fillRect(hx + hw - 1, hy, 1, hh);
    // roof
    for (let y = 0; y < 34; y++) {
      const w2 = Math.round(hw / 2 + 8 - y * 2.1);
      g.fillStyle = y === 0 ? '#808080' : (y % 3 ? '#262626' : '#383838');
      g.fillRect(128 - w2, hy - y, w2 * 2, 1);
      g.fillStyle = '#707070'; g.fillRect(128 - w2, hy - y, 1, 1); g.fillRect(128 + w2 - 1, hy - y, 1, 1);
    }
    // tower + chimney
    g.fillStyle = '#1c1c1c'; g.fillRect(150, 50, 18, 30);
    g.fillStyle = '#707070'; g.fillRect(150, 50, 1, 30); g.fillRect(167, 50, 1, 30);
    for (let y = 0; y < 22; y++) { const w2 = Math.round(11 - y * 0.5); g.fillStyle = y % 3 ? '#262626' : '#383838'; g.fillRect(159 - w2, 50 - y, w2 * 2, 1); g.fillStyle = '#707070'; g.fillRect(159 - w2, 50 - y, 1, 1); g.fillRect(159 + w2 - 1, 50 - y, 1, 1); }
    g.fillStyle = '#909090'; g.fillRect(158, 22, 1, 7); g.fillRect(156, 24, 5, 1);
    g.fillStyle = '#5a5a5a'; g.fillRect(90, 60, 8, 20);
    // door
    g.fillStyle = '#000'; g.fillRect(120, 160, 16, 28);
    g.fillStyle = '#606060'; g.fillRect(119, 159, 18, 1); g.fillRect(119, 159, 1, 29); g.fillRect(136, 159, 1, 29); g.fillRect(132, 174, 2, 2);
    // porch steps and broken fence
    g.fillStyle = '#4a4a4a'; g.fillRect(114, 188, 28, 2); g.fillRect(110, 192, 36, 2);
    for (let x = 4; x < W; x += 9) { if (x > 100 && x < 156) continue; const tilt = (r() - 0.5) * 3; g.fillStyle = '#5a5a5a'; for (let k = 0; k < 16; k++) g.fillRect(Math.round(x + tilt * k / 16), 200 - k, 2, 1); g.fillRect(x, 184, 1, 1); }
    g.fillStyle = '#4a4a4a'; g.fillRect(0, 189, 100, 1); g.fillRect(156, 189, 100, 1); g.fillRect(0, 195, 100, 1); g.fillRect(156, 195, 100, 1);
    // dead tree on the left
    g.fillStyle = '#5a5a5a';
    const branch = (x, y, a, len, w) => {
      for (let i = 0; i < len; i++) { g.fillRect(Math.round(x + Math.cos(a) * i), Math.round(y + Math.sin(a) * i), w, 1); }
      if (len > 6) { const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; branch(ex, ey, a - 0.5, len * 0.62, Math.max(1, w - 1)); branch(ex, ey, a + 0.45, len * 0.55, Math.max(1, w - 1)); }
    };
    branch(26, 200, -Math.PI / 2, 46, 4);
    return c;
  }
  const WINDOWS = [[78, 106], [116, 106], [154, 106], [78, 140], [154, 140], [153, 58]];
  function drawWindowFrames(g) {
    for (const [x, y] of WINDOWS) {
      g.fillStyle = '#7a7a7a'; g.fillRect(x - 1, y - 1, 26, 1); g.fillRect(x - 1, y + 24, 26, 1); g.fillRect(x - 1, y - 1, 1, 26); g.fillRect(x + 24, y - 1, 1, 26);
      g.fillStyle = '#505050'; g.fillRect(x - 3, y + 25, 30, 2); // sill
    }
  }
  function drawWindowBars(g) {
    for (const [x, y] of WINDOWS) {
      g.fillStyle = '#7a7a7a'; g.fillRect(x + 11, y, 2, 24);
      g.fillRect(x, y + 11, 24, 1);
    }
  }

  function sceneCoon() {
    const c = newCanvas(W, H), g = c.getContext('2d'), r = rng(21);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 25; i++) { g.fillStyle = '#4a4a4a'; g.fillRect(Math.floor(r() * W), 16 + Math.floor(r() * 40), 1, 1); }
    // moon
    for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) if (Math.hypot(x, y) <= 8 && Math.hypot(x - 4, y - 2) > 7) { g.fillStyle = '#b0b0b0'; g.fillRect(226 + x, 32 + y, 1, 1); }
    // distant hills and barn
    for (let x = 0; x < W; x++) { const h = 150 - Math.sin(x / 40 + 1) * 8 - Math.sin(x / 17) * 2; g.fillStyle = '#1c1c1c'; g.fillRect(x, Math.round(h), 1, 60); }
    g.fillStyle = '#2a2a2a'; g.fillRect(186, 116, 40, 34);
    for (let y = 0; y < 16; y++) g.fillRect(186 - 3 + Math.round(y * 0.4), 116 - y, 46 - Math.round(y * 0.8), 1);
    g.fillStyle = '#000'; g.fillRect(200, 130, 12, 20);
    g.fillStyle = '#4a4a4a'; g.fillRect(200, 130, 12, 1); g.fillRect(200, 130, 1, 20); g.fillRect(211, 130, 1, 20); g.fillRect(201, 131, 10, 1);
    for (let k = 0; k < 10; k++) { g.fillRect(201 + k, 131 + k * 2, 1, 1); g.fillRect(210 - k, 131 + k * 2, 1, 1); }
    // ground
    for (let y = 196; y < H; y++) for (let x = 0; x < W; x++) if (bayer(x, y) < 0.35) { g.fillStyle = '#3c3c3c'; g.fillRect(x, y, 1, 1); }
    // big oak: trunk + two main limbs
    trunk(g, 44, 18, 60, 200, '#9a9a9a', '#444', r);
    const limb = (x0, y0, x1, y1, w0, w1) => {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, w = w0 + (w1 - w0) * t;
        g.fillStyle = '#000'; g.fillRect(Math.round(x), Math.round(y - w / 2), 1, Math.round(w));
        g.fillStyle = '#9a9a9a'; g.fillRect(Math.round(x), Math.round(y - w / 2), 1, 1);
        g.fillStyle = '#5a5a5a'; g.fillRect(Math.round(x), Math.round(y + w / 2) - 1, 1, 1);
      }
    };
    limb(50, 82, 172, 76, 9, 5);   // long limb the raccoons walk out on
    limb(40, 112, 4, 100, 7, 3);
    limb(48, 62, 90, 36, 6, 3);
    // foliage clumps (stippled)
    for (let i = 0; i < 1600; i++) {
      const cx = [44, 90, 140, 20, 170][i % 5], cy = [40, 32, 58, 70, 62][i % 5], rr = [30, 24, 22, 20, 16][i % 5];
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rr;
      const x = Math.round(cx + Math.cos(a) * d * 1.3), y = Math.round(cy + Math.sin(a) * d * 0.8);
      if (y > 16 && y < 70 && !(y > 66 && x > 54 && x < 175)) { g.fillStyle = r() < 0.5 ? '#3a3a3a' : '#555'; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  function sceneCoonFront() {
    // the fence (raccoons run along its top rail) \u2014 drawn over tree-climbers' lower path
    const c = newCanvas(W, H), g = c.getContext('2d');
    for (let x = 2; x < W; x += 22) {
      g.fillStyle = '#000'; g.fillRect(x, 162, 6, 40);
      g.fillStyle = '#b0b0b0'; g.fillRect(x, 162, 6, 1); g.fillRect(x, 162, 1, 40); g.fillRect(x + 5, 162, 1, 40);
      g.fillStyle = '#606060'; g.fillRect(x + 2, 168, 1, 10);
    }
    for (const y of [164, 182]) {
      g.fillStyle = '#000'; g.fillRect(0, y, W, 5);
      g.fillStyle = '#c0c0c0'; g.fillRect(0, y, W, 1);
      g.fillStyle = '#606060'; g.fillRect(0, y + 4, W, 1);
      for (let x = 7; x < W; x += 13) g.fillRect(x, y + 2, 4, 1);
    }
    return c;
  }

  // cabinet overlay colours (multiplied over the B&W picture)
  function overlay(bands) {
    const c = newCanvas(W, H), g = c.getContext('2d');
    for (const [y0, y1, col] of bands) { g.fillStyle = col; g.fillRect(0, y0, W, y1 - y0); }
    // soft seams between bands
    return c;
  }

  const GAMES = [
    {
      name: 'HIT THE BEAR', key: 'bear', ext: 200,
      bg: sceneBear(), fg: sceneBearFront(),
      ov: overlay([[0, 16, '#ffe070'], [16, 124, '#7ce88c'], [124, 200, '#ffb36a'], [200, 224, '#9ce060']])
    },
    {
      name: 'WITCH HUNT', key: 'witch', ext: 400,
      bg: sceneWitch(), fg: null,
      ov: overlay([[0, 16, '#ffd060'], [16, 86, '#b48cff'], [86, 196, '#ffa040'], [196, 224, '#80e070']])
    },
    {
      name: 'RACCOON HUNT', key: 'coon', ext: 300,
      bg: sceneCoon(), fg: sceneCoonFront(),
      ov: overlay([[0, 16, '#fff070'], [16, 74, '#8ce0ff'], [74, 150, '#90f080'], [150, 200, '#ffc070'], [200, 224, '#a0e070']])
    }
  ];

  const TITLE_OV = overlay([[0, 64, '#ffe070'], [64, 156, '#7ce88c'], [156, 186, '#ffb36a'], [186, 224, '#8ce0ff']]);

  ArcadeRegistry.register({
    id: 'triplehunt',
    title: 'Triple Hunt',
    year: 1977,
    maker: 'Atari',
    width: W, height: H,
    vector: false,
    pointer: true,
    controls: 'Mouse: aim rifle \u00b7 Click: fire \u00b7 Arrows+Space also work \u00b7 Left/Right: pick game \u00b7 Enter: start',
    marquee: { bg: '#1a3a1a', fg: '#ffe070', accent: '#ff8030' },
    create(api) {
      const au = api.audio;
      let state = 'title', sel = 0, titleT = 0;
      let coinFlash = 0;   // coin-op: INSERT COIN flash after a start attempt with no credit
      // the credit is spent when the chosen game actually begins; browsing the selection is free
      function tryStart(i) {
        if (api.useCredit()) { coinFlash = 0; start(i); return; }
        coinFlash = 90; au.tone(70, 0.25, { type: 'square', vol: 0.25 });
      }
      let G = GAMES[0], score = 0, timeLeft = 0, extended = false, cool = 0, banner = null, overT = 0;
      let aimX = 128, aimY = 112, lastMX = -1, lastMY = -1;
      let bear = null, actors = [], fx = [], spawnT = 0, elapsed = 0, witchT = 0, flash = 0, stepT = 0;
      const his = [0, 1, 2].map(i => 0);
      let hi = api.getHiScore(0);

      const sfx = {
        shot() { au.noise(0.22, { vol: 0.45, freq: 5000, slideTo: 400, type: 'lowpass' }); au.tone(220, 0.06, { type: 'square', vol: 0.15, slideTo: 60 }); },
        click() { au.tone(1800, 0.02, { type: 'square', vol: 0.05, delay: 0.18 }); au.tone(1200, 0.02, { type: 'square', vol: 0.05, delay: 0.24 }); },
        roar() { au.tone(140, 0.7, { type: 'sawtooth', vol: 0.25, slideTo: 60 }); au.noise(0.6, { vol: 0.2, freq: 600, slideTo: 200 }); au.tone(150, 0.6, { type: 'square', vol: 0.08, slideTo: 70, delay: 0.03 }); },
        step() { au.tone(70, 0.06, { type: 'triangle', vol: 0.12 }); },
        wail() { au.tone(500, 0.25, { type: 'sine', vol: 0.18, slideTo: 900 }); au.tone(900, 0.5, { type: 'sine', vol: 0.15, slideTo: 250, delay: 0.25 }); },
        squeak() { au.tone(2400, 0.06, { type: 'square', vol: 0.08, slideTo: 3200 }); au.tone(2600, 0.05, { type: 'square', vol: 0.06, delay: 0.08 }); },
        cackle() { for (let i = 0; i < 7; i++) au.tone(i % 2 ? 900 : 1200, 0.07, { type: 'square', vol: 0.1, delay: i * 0.08, slideTo: i % 2 ? 700 : 1000 }); },
        chitter() { for (let i = 0; i < 4; i++) au.tone(1600 + i * 150, 0.04, { type: 'square', vol: 0.07, delay: i * 0.05 }); au.tone(1400, 0.6, { type: 'triangle', vol: 0.12, slideTo: 300, delay: 0.2 }); },
        thump() { au.noise(0.12, { vol: 0.3, freq: 300 }); },
        ping() { au.tone(1500, 0.04, { type: 'square', vol: 0.06 }); },
        start() { au.melody([[392, .1], [523, .1], [659, .1], [784, .25]], { type: 'square', vol: 0.1 }); },
        ext() { au.melody([[784, .08], [988, .08], [1175, .08], [1568, .3]], { type: 'square', vol: 0.12 }); },
        buzz() { au.tone(110, 0.9, { type: 'sawtooth', vol: 0.2 }); au.tone(116, 0.9, { type: 'square', vol: 0.08 }); },
        tick() { au.tone(880, 0.03, { type: 'square', vol: 0.06 }); },
        spook() { au.tone(220, 1.2, { type: 'sine', vol: 0.06, slideTo: 207 }); au.tone(330, 1.2, { type: 'sine', vol: 0.04, slideTo: 311 }); }
      };

      function start(i) {
        sel = i; G = GAMES[i]; state = 'play'; score = 0; timeLeft = 60; extended = false; elapsed = 0;
        actors = []; fx = []; spawnT = 1; witchT = 6; cool = 0; flash = 0;
        banner = { t: 0, s: G.name };
        bear = G.key === 'bear' ? { x: -60, dir: 1, speed: 40, state: 'walk', t: 0, f: 0 } : null;
        sfx.start();
      }

      function endHunt() {
        timeLeft = 0; state = 'over'; overT = 0; sfx.buzz();
        if (score > hi) { hi = score; api.setHiScore(score); }
      }

      function addFx(x, y, kind, v) { fx.push({ x, y, kind, v, t: 0 }); if (fx.length > 24) fx.shift(); }

      function fire() {
        if (cool > 0) return;
        cool = 0.28; sfx.shot(); sfx.click(); flash = 2;
        addFx(aimX, aimY, 'puff');
        // foreground cover stops the bullet
        if (G.fg && G.key === 'bear') {
          const m = G.fg.getContext('2d').getImageData(Math.floor(aimX), Math.floor(aimY), 1, 1).data;
          if (m[3] > 0 && m[0] < 20) { sfx.thump(); return; }
        }
        if (bear && bear.state === 'walk') {
          const img = curBearImg();
          const bx = Math.round(bear.x - img.width), by = 199 - img.height * 2;
          if (hitImg(img, bx / 2, by / 2, aimX / 2, aimY / 2, 1)) {
            bear.state = 'rear'; bear.t = 0; score += 10; sfx.roar(); addFx(bear.x, by - 6, 'pts', 10);
            return;
          }
        }
        for (let i = actors.length - 1; i >= 0; i--) {
          const a = actors[i];
          if (a.dead) continue;
          const d = actorDraw(a); if (!d) continue;
          if (hitImg(d.img, d.x, d.y, aimX, aimY, 1)) {
            a.dead = true; a.t = 0; score += a.pts; addFx(d.x + d.img.width / 2, d.y - 4, 'pts', a.pts);
            if (a.kind === 'ghost') sfx.wail(); else if (a.kind === 'bat') sfx.squeak(); else if (a.kind === 'witch') sfx.cackle(); else sfx.chitter();
            if (a.kind === 'coon' || a.kind === 'bat' || a.kind === 'witch') { a.vy = -30; a.spin = 0; }
            return;
          }
        }
      }

      function curBearImg() {
        const left = bear.dir < 0;
        if (bear.state === 'rear') { const roar = bear.t > 0.15 && bear.t < 0.75; return left ? (roar ? S.roarL : S.rearL) : (roar ? S.roar : S.rear); }
        return left ? S.bearL[bear.f] : S.bear[bear.f];
      }

      // ----- per-game spawning -----
      function difficulty() { return Math.min(1, elapsed / 70); }
      function spawnWitchGame(dt) {
        spawnT -= dt; witchT -= dt;
        const dif = difficulty();
        if (spawnT <= 0) {
          spawnT = 0.9 - dif * 0.45 + Math.random() * 0.6;
          const ghosts = actors.filter(a => a.kind === 'ghost' && !a.dead).length;
          const bats = actors.filter(a => a.kind === 'bat').length;
          const used = new Set(actors.filter(a => a.kind === 'ghost').map(a => a.win));
          if (Math.random() < 0.55 && ghosts < 3) {
            const free = WINDOWS.map((w, i) => i).filter(i => !used.has(i));
            if (free.length) {
              const win = free[Math.floor(Math.random() * free.length)];
              actors.push({ kind: 'ghost', win, t: 0, life: 1.9 - dif * 0.8 + Math.random() * 0.5, pts: 20 });
              if (Math.random() < 0.4) sfx.spook();
            }
          } else if (bats < 4) {
            const w = WINDOWS[Math.floor(Math.random() * WINDOWS.length)];
            const dir = Math.random() < 0.5 ? -1 : 1;
            actors.push({ kind: 'bat', x: w[0] + 12, y: w[1] + 10, vx: dir * (45 + dif * 50 + Math.random() * 20), vy: -40 - Math.random() * 20, t: Math.random() * 3, pts: 10 });
            sfx.squeak();
          }
        }
        if (witchT <= 0 && !actors.some(a => a.kind === 'witch')) {
          witchT = 9 + Math.random() * 5;
          const dir = Math.random() < 0.5 ? 1 : -1;
          actors.push({ kind: 'witch', x: dir > 0 ? -50 : W + 50, y: 30 + Math.random() * 20, vx: dir * (70 + dif * 50), t: 0, pts: 50 });
          sfx.cackle();
        }
      }
      function spawnCoonGame(dt) {
        spawnT -= dt;
        const dif = difficulty();
        const live = actors.filter(a => !a.dead).length;
        if (spawnT <= 0 && live < 4) {
          spawnT = 1.1 - dif * 0.5 + Math.random() * 0.8;
          const sp = 46 + dif * 50 + Math.random() * 18;
          if (Math.random() < 0.6) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            actors.push({ kind: 'coon', mode: 'run', x: dir > 0 ? -30 : W + 30, y: 163, dir, sp, t: 0, pts: 10, path: null, pause: Math.random() < 0.4 ? 0.3 + Math.random() * 0.6 : 0, pauseAt: 40 + Math.random() * 176 });
          } else {
            // climb the oak, walk out the long limb, look around, come back down
            const out = 110 + Math.random() * 56;
            actors.push({
              kind: 'coon', x: 44, y: 205, dir: 1, sp, t: 0, pts: 20, seg: 0,
              path: [{ m: 'up', x: 44, y: 78 }, { m: 'run', x: out, y: 78 }, { m: 'wait', w: 0.6 + Math.random() }, { m: 'run', x: 52, y: 78 }, { m: 'down', x: 44, y: 205 }]
            });
          }
        }
      }

      function updateActors(dt) {
        for (const a of actors) {
          a.t += dt;
          if (a.dead) {
            if (a.kind === 'coon' || a.kind === 'bat' || a.kind === 'witch') { a.vy += 300 * dt; a.y += a.vy * dt; a.spin += dt * 10; if (a.y > H + 30) a.gone = true; }
            else if (a.t > 0.5) a.gone = true;
            continue;
          }
          if (a.kind === 'ghost') {
            if (a.t > a.life + 0.6) a.gone = true;
          } else if (a.kind === 'bat') {
            a.x += a.vx * dt; a.y += a.vy * dt + Math.sin(a.t * 6) * 40 * dt;
            a.vy += (Math.random() - 0.5) * 120 * dt;
            if (a.y < 22) a.vy = Math.abs(a.vy) * 0.5 + 10; if (a.y > 80 && a.t > 1) a.vy = -Math.abs(a.vy) - 10;
            if (a.x < -30 || a.x > W + 30) a.gone = true;
          } else if (a.kind === 'witch') {
            a.x += a.vx * dt; a.y += Math.sin(a.t * 2.2) * 18 * dt;
            if ((a.vx > 0 && a.x > W + 60) || (a.vx < 0 && a.x < -60)) a.gone = true;
          } else if (a.kind === 'coon') {
            if (!a.path) {
              if (a.pause > 0 && Math.abs(a.x - a.pauseAt) < 2) { a.pause -= dt; continue; }
              a.x += a.dir * a.sp * dt;
              if (a.x < -40 || a.x > W + 40) a.gone = true;
            } else {
              const s = a.path[a.seg];
              if (!s) { a.gone = true; continue; }
              if (s.m === 'wait') { s.w -= dt; a.mode = 'look'; if (s.w <= 0) { a.seg++; } continue; }
              a.mode = s.m;
              const dx = s.x - a.x, dy = s.y - a.y, d = Math.hypot(dx, dy), st = a.sp * (s.m === 'run' ? 1 : 0.7) * dt;
              if (d <= st) { a.x = s.x; a.y = s.y; a.seg++; }
              else { a.x += dx / d * st; a.y += dy / d * st; if (Math.abs(dx) > 0.1) a.dir = Math.sign(dx); }
            }
          }
        }
        actors = actors.filter(a => !a.gone);
      }

      // returns {img, x, y} (top-left)
      function actorDraw(a) {
        if (a.kind === 'ghost') {
          const [wx, wy] = WINDOWS[a.win];
          let rise = Math.min(1, a.t / 0.3);
          if (a.t > a.life + 0.3) rise = Math.max(0, 1 - (a.t - a.life - 0.3) / 0.3);
          const img = S.ghost[Math.floor(a.t * 4) % 2];
          return { img, x: wx + 1, y: wy + 24 - Math.round(rise * 22), clipWin: [wx, wy] };
        }
        if (a.kind === 'bat') { const img = S.bat[Math.floor(a.t * 12) % 4]; return { img, x: Math.round(a.x - img.width / 2), y: Math.round(a.y - img.height / 2) }; }
        if (a.kind === 'witch') { const set = a.vx > 0 ? S.witch : S.witchL; const img = set[Math.floor(a.t * 5) % 2]; return { img, x: Math.round(a.x - img.width / 2), y: Math.round(a.y - img.height / 2) }; }
        if (a.kind === 'coon') {
          const f = Math.floor(a.t * 10) % 2;
          let img;
          if (a.mode === 'up' || a.mode === 'down') img = S.climb[f];
          else if (a.mode === 'look') img = (Math.floor(a.t * 2) % 2 ? S.coon : S.coonL)[0];
          else img = a.dir > 0 ? S.coon[f] : S.coonL[f];
          return { img, x: Math.round(a.x - img.width / 2), y: Math.round(a.y - img.height) };
        }
        return null;
      }

      function updateBear(dt) {
        const b = bear;
        b.t += dt;
        if (b.state === 'walk') {
          b.x += b.dir * b.speed * dt;
          const fr = Math.floor(b.t * b.speed / 14) % 4;
          if (fr !== b.f) { b.f = fr; if (fr % 2 === 0) sfx.step(); }
          if ((b.dir > 0 && b.x > W + 60) || (b.dir < 0 && b.x < -60)) {
            // walked off \u2014 after a short while comes back from the same side
            b.state = 'away'; b.t = 0;
          }
        } else if (b.state === 'away') {
          if (b.t > 0.9) { b.dir = -b.dir; b.state = 'walk'; b.t = 0; }
        } else if (b.state === 'rear') {
          if (b.t > 0.95) { b.state = 'walk'; b.dir = -b.dir; b.t = 0; b.speed = Math.min(170, b.speed * 1.08 + 3); }
        }
      }

      function updateAim(dt) {
        const m = api.mouse;
        if (m.x !== lastMX || m.y !== lastMY) { aimX = m.x; aimY = m.y; lastMX = m.x; lastMY = m.y; }
        const sp = 130 * dt;
        if (api.key('ArrowLeft')) aimX -= sp; if (api.key('ArrowRight')) aimX += sp;
        if (api.key('ArrowUp')) aimY -= sp; if (api.key('ArrowDown')) aimY += sp;
        aimX = Math.max(0, Math.min(W - 1, aimX)); aimY = Math.max(0, Math.min(H - 1, aimY));
      }

      return {
        update(dt) {
          if (flash > 0) flash--;
          if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
          if (state === 'title') {
            titleT += dt;
            const m = api.mouse;
            if (m.x !== lastMX || m.y !== lastMY) { aimX = m.x; aimY = m.y; lastMX = m.x; lastMY = m.y; }
            if (api.anyPressed('ArrowLeft', 'ArrowUp')) { sel = (sel + 2) % 3; sfx.tick(); }
            if (api.anyPressed('ArrowRight', 'ArrowDown', 'KeyX')) { sel = (sel + 1) % 3; sfx.tick(); }
            if (m.clicked) { if (m.y > 70 && m.y < 170) sel = Math.max(0, Math.min(2, Math.floor((m.x - 8) / 80))); tryStart(sel); return; }
            if (api.anyPressed('Enter', 'Space')) tryStart(sel);
            return;
          }
          if (state === 'over') {
            overT += dt;
            if (overT > 4 || (overT > 1.5 && (api.mouse.clicked || api.anyPressed('Enter', 'Space')))) { state = 'title'; titleT = 0; }
            return;
          }
          updateAim(dt);
          cool -= dt;
          if (banner) { banner.t += dt; if (banner.t > 2.2) banner = null; }
          if (api.mouse.clicked) { aimX = api.mouse.x; aimY = api.mouse.y; fire(); }
          if (api.pressed('Space')) fire();
          elapsed += dt;
          const before = Math.ceil(timeLeft);
          timeLeft -= dt;
          if (Math.ceil(timeLeft) !== before && timeLeft < 10 && timeLeft > 0) sfx.tick();
          if (timeLeft <= 0) {
            if (!extended && score >= G.ext) {
              extended = true; timeLeft = 30; banner = { t: 0, s: 'EXTENDED PLAY' }; sfx.ext();
            } else {
              timeLeft = 0;
              // Continue: a fresh 60-second period in the same hunt, score kept
              if (api.offerContinue) api.offerContinue(() => { timeLeft = 60; banner = { t: 0, s: 'CONTINUE' }; sfx.start(); }, endHunt);
              else endHunt();
            }
          }
          if (bear) updateBear(dt);
          if (G.key === 'witch') spawnWitchGame(dt);
          if (G.key === 'coon') spawnCoonGame(dt);
          updateActors(dt);
          for (const f of fx) f.t += dt;
          while (fx.length && fx[0].t > 1) fx.shift();
        },

        render(g) {
          if (state === 'title') return renderTitle(g);
          g.drawImage(G.bg, 0, 0);
          if (G.key === 'witch') {
            drawWindowFrames(g);
            for (const [x, y] of WINDOWS) { g.fillStyle = '#000'; g.fillRect(x, y, 24, 24); }
          }
          // actors
          for (const a of actors) {
            const d = actorDraw(a); if (!d) continue;
            if (a.kind === 'ghost') {
              const [wx, wy] = d.clipWin;
              g.save(); g.beginPath(); g.rect(wx, wy, 24, 24); g.clip();
              if (a.dead) { g.globalAlpha = Math.max(0, 1 - a.t / 0.5); g.drawImage(d.img, d.x, d.y - Math.round(a.t * 20)); }
              else g.drawImage(d.img, d.x, d.y);
              g.restore();
            } else if (a.dead && a.spin !== undefined) {
              g.save(); g.translate(d.x + d.img.width / 2, d.y + d.img.height / 2); g.rotate(a.spin); g.drawImage(d.img, -d.img.width / 2, -d.img.height / 2); g.restore();
            } else g.drawImage(d.img, d.x, d.y);
          }
          if (G.key === 'witch') drawWindowBars(g);
          if (bear && bear.state !== 'away') {
            const img = curBearImg();
            g.drawImage(img, Math.round(bear.x - img.width), 199 - img.height * 2, img.width * 2, img.height * 2);
          }
          if (G.fg) g.drawImage(G.fg, 0, 0);
          // effects
          for (const f of fx) {
            if (f.kind === 'puff' && f.t < 0.2) {
              const r = 2 + Math.floor(f.t * 20);
              g.fillStyle = '#fff';
              for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), 1, 1); }
            } else if (f.kind === 'pts') {
              text(g, f.v, f.x, Math.round(f.y - f.t * 10), '#fff', 1, 'c');
            }
          }
          // score strip
          g.fillStyle = '#000'; g.fillRect(0, 0, W, 15);
          text(g, 'SCORE ' + String(score).padStart(3, '0'), 4, 4, '#fff');
          text(g, 'TIME ' + String(Math.ceil(timeLeft)).padStart(2, '0'), 128, 4, '#fff', 1, 'c');
          text(g, 'HI ' + String(hi).padStart(3, '0'), 252, 4, '#fff', 1, 'r');
          g.fillStyle = '#fff'; g.fillRect(0, 14, W, 1);
          if (banner) {
            const w = banner.s.length * 6 + 12;
            g.fillStyle = '#000'; g.fillRect(128 - w / 2, 92, w, 17);
            g.fillStyle = '#fff'; g.fillRect(128 - w / 2, 92, w, 1); g.fillRect(128 - w / 2, 108, w, 1);
            text(g, banner.s, 128, 97, '#fff', 1, 'c');
            if (banner.s === G.name) text(g, 'EXTENDED PLAY AT ' + G.ext, 128, 114, '#fff', 1, 'c');
          }
          if (state === 'over') {
            g.fillStyle = '#000'; g.fillRect(64, 84, 128, 50);
            g.fillStyle = '#fff'; g.fillRect(64, 84, 128, 1); g.fillRect(64, 133, 128, 1);
            text(g, 'GAME OVER', 128, 92, '#fff', 2, 'c');
            text(g, 'SCORE ' + score, 128, 112, '#fff', 1, 'c');
            if (score >= hi && score > 0) text(g, 'HIGH SCORE!', 128, 122, '#fff', 1, 'c');
          }
          if (flash > 0) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, 0, W, H); }
          // coloured overlay sheet on the monitor glass
          g.globalCompositeOperation = 'multiply'; g.drawImage(G.ov, 0, 0); g.globalCompositeOperation = 'source-over';
          drawSight(g);
        },
        destroy() { }
      };

      function drawSight(g) {
        const x = Math.round(aimX), y = Math.round(aimY);
        g.strokeStyle = '#000'; g.fillStyle = '#ff4030';
        g.fillStyle = '#000';
        g.fillRect(x - 6, y - 1, 13, 3); g.fillRect(x - 1, y - 6, 3, 13);
        g.fillStyle = '#ff5a3a';
        g.fillRect(x - 5, y, 4, 1); g.fillRect(x + 2, y, 4, 1); g.fillRect(x, y - 5, 1, 4); g.fillRect(x, y + 2, 1, 4);
      }

      function renderTitle(g) {
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        text(g, 'TRIPLE', 128, 12, '#fff', 3, 'c');
        text(g, 'HUNT', 128, 38, '#fff', 3, 'c');
        const icons = [S.bear[Math.floor(titleT * 6) % 4], S.ghost[Math.floor(titleT * 4) % 2], S.coon[Math.floor(titleT * 8) % 2]];
        const names = [['HIT THE', 'BEAR'], ['WITCH', 'HUNT'], ['RACCOON', 'HUNT']];
        for (let i = 0; i < 3; i++) {
          const cx = 48 + i * 80;
          const img = icons[i];
          g.drawImage(img, Math.round(cx - img.width / 2), 120 - img.height);
          text(g, names[i][0], cx, 128, '#fff', 1, 'c'); text(g, names[i][1], cx, 138, '#fff', 1, 'c');
          if (i === sel) {
            g.fillStyle = '#fff';
            g.fillRect(cx - 36, 74, 72, 1); g.fillRect(cx - 36, 150, 72, 1); g.fillRect(cx - 36, 74, 1, 77); g.fillRect(cx + 35, 74, 1, 77);
          }
        }
        text(g, 'EXTENDED PLAY AT ' + GAMES[sel].ext, 128, 160, '#fff', 1, 'c');
        text(g, 'HIGH SCORE ' + String(hi).padStart(3, '0'), 128, 174, '#fff', 1, 'c');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(g, 'INSERT COIN', 128, 192, '#fff', 1, 'c'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) text(g, 'INSERT COIN', 128, 192, '#fff', 1, 'c'); }
        else text(g, 'SHOOT OR PRESS START', 128, 192, '#fff', 1, 'c');
        text(g, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, 3, '#fff', 1);
        text(g, '@1977 ATARI', 128, 208, '#fff', 1, 'c');
        g.globalCompositeOperation = 'multiply'; g.drawImage(TITLE_OV, 0, 0); g.globalCompositeOperation = 'source-over';
        drawSight(g);
      }
    }
  });
})();
