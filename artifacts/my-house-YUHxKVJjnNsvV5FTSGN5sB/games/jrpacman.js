// Jr. Pac-Man (Bally Midway, 1983) \u2014 from-scratch recreation: scrolling mazes, propeller beanie, bouncing toys that fatten dots.
(function () {
  'use strict';
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
  // text(ctx, str, x, y, colour, {scale, adv, center, right, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold === false ? 1 : 2;
    s = String(s).toUpperCase();
    const w = s.length * adv - (adv - (4 + bw) * sc);
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, bw * sc - (bw - 1) * (sc - 1), sc); }
    }
  }
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; if (g) for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, cy - 2 + r, 1, 1); } x += 4; }
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // sprite from rows of chars; pal maps char -> colour ('.' or unmapped = transparent)
  function sprite(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flipRows = rows => rows.map(r => r.split('').reverse().join(''));
  const vflipRows = rows => rows.slice().reverse();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => Math.floor(Math.random() * n);
  const pick = a => a[irnd(a.length)];
  const pad = (n, l) => String(n).padStart(l, '0');
  // coin-op helper: start with a credit or flash INSERT COIN
  function makeCoin(api) {
    let flash = 0, last = api.credits;
    return {
      tick() {
        if (flash > 0) flash = api.credits > 0 ? 0 : flash - 1;
        if (api.credits > last) api.audio.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        last = api.credits;
      },
      tryStart() {
        if (api.useCredit()) { last = api.credits; return true; }
        flash = 90; api.audio.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      },
      // draws PUSH START / INSERT COIN centred at cx,y and CREDIT nn at cx2,y2
      draw(ctx, cx, y, col, frame) {
        const blink = (frame >> 4) & 1;
        if (flash > 0) { if ((flash >> 2) & 1) text(ctx, 'INSERT COIN', cx, y, '#ff4040', { center: true }); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', cx, y, col, { center: true }); }
        else if (blink) text(ctx, 'PUSH START', cx, y, col, { center: true });
      },
      credit(ctx, x, y, col) { text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), x, y, col); }
    };
  }
  // looping background tune (frame-driven)
  function makeMusic(api) {
    let notes = null, opts = null, len = 0, t = 0, on = false;
    return {
      play(n, o) { notes = n; opts = o || {}; len = n.reduce((s, x) => s + x[1], 0); t = 0; on = true; api.audio.melody(notes, opts); },
      stop() { on = false; },
      tick() { if (!on) return; t += 1 / 60; if (t >= len) { t -= len; api.audio.melody(notes, opts); } },
      get on() { return on; }
    };
  }
  // particle bursts
  function burst(list, x, y, cols, n, sp) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (sp || 1.5) * (0.3 + Math.random()); list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + irnd(20), c: pick(cols) }); }
  }
  function stepParts(list) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; if (--p.t <= 0) list.splice(i, 1); } }
  function drawParts(ctx, list, ox) { ox = ox || 0; for (const p of list) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - ox), Math.round(p.y), p.t > 10 ? 2 : 1, p.t > 10 ? 2 : 1); } }
  // ---- maze renderer: walls are tiles '#'; corridors shrink walls by a margin, giving rounded, outlined blocks ----
  function buildMazeCanvas(rows, fill, line, margin) {
    margin = margin == null ? 3 : margin;
    const R = rows.length, C = rows[0].length, w = C * 8, h = R * 8;
    const cv = mkCanvas(w, h), c2 = cv.getContext('2d');
    const wall = (c, r) => r < 0 || r >= R || c < 0 || c >= C ? true : rows[r][c] === '#';
    const img = c2.createImageData(w, h);
    const hex = s => [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
    const F = fill ? hex(fill) : null, L = hex(line);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const tc = px >> 3, tr = py >> 3; if (!wall(tc, tr)) continue;
      let d = 9; const cx = px + 0.5, cy = py + 0.5;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (wall(tc + dc, tr + dr)) continue;
        const x0 = (tc + dc) * 8, y0 = (tr + dr) * 8;
        const dx = Math.max(x0 - cx, 0, cx - x0 - 8), dy = Math.max(y0 - cy, 0, cy - y0 - 8);
        d = Math.min(d, Math.hypot(dx, dy));
      }
      let col = null;
      if (d < margin) col = null; else if (d < margin + 1.2) col = L; else if (F) col = F;
      if (col) { const i = (py * w + px) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; }
    }
    c2.putImageData(img, 0, 0);
    return cv;
  }
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const mod8 = v => ((v % 8) + 8) % 8;
  const MAZES = [
    ['########################################',
     '#......................................#',
     '#.###.####.##################.####.###.#',
     '#o###.####.##################.####.###o#',
     '#.###.####.##################.####.###.#',
     '#......................................#',
     '#.###.####.##################.####.###.#',
     '#.###.####.##################.####.###.#',
     '#.....####......########......####.....#',
     '#.###.####.####.########.####.####.###.#',
     '#.###.####.#### ######## ####.####.###.#',
     '#.###.####....            ....####.###.#',
     '#.###.####.#### ###--### ####.####.###.#',
     '#.###.####.#### #______# ####.####.###.#',
     '#o............  #______#  ............o#',
     '#.###.####.#### #______# ####.####.###.#',
     '#.###.####.#### ######## ####.####.###.#',
     '#.###.####....            ....####.###.#',
     '#.###.####.#### ######## ####.####.###.#',
     '#.###.####.####.########.####.####.###.#',
     '#..................  ..................#',
     '#.###.####.####.########.####.####.###.#',
     '#.###.####.####.########.####.####.###.#',
     '#.....####......########......####.....#',
     '#.###.####.##################.####.###.#',
     '#.###.####.##################.####.###.#',
     '#......................................#',
     '#o###.############################.###o#',
     '#.###.############################.###.#',
     '#......................................#',
     '########################################'],
    ['########################################',
     '#........###................###........#',
     '#o###.##.###.##############.###.##.###o#',
     '#.###.##.###.##############.###.##.###.#',
     '#.###.##.###.##############.###.##.###.#',
     '#......................................#',
     '#.###.####.##################.####.###.#',
     '#.###.####.##################.####.###.#',
     '#..........##################..........#',
     '#####.####.##################.####.#####',
     '#####.####.##################.####.#####',
     '#####.####....            ....####.#####',
     '#####.######### ###--### #########.#####',
     '#####.######### #______# #########.#####',
     '#.............  #______#  .............#',
     '#.###.######### #______# #########.###.#',
     '#o###.######### ######## #########.###o#',
     '#.###.#########          #########.###.#',
     '#.###.######### ######## #########.###.#',
     '#.###.#########.########.#########.###.#',
     '#..................  ..................#',
     '#.###.####.####.########.####.####.###.#',
     '#.###.####.####.########.####.####.###.#',
     '#........#.#................#.#........#',
     '#.###.##.#.#.##.########.##.#.#.##.###.#',
     '#.###.##.#.#.##.########.##.#.#.##.###.#',
     '#.###...........########...........###.#',
     '#.######.######################.######.#',
     '#o######.######################.######o#',
     '#......................................#',
     '########################################'],
    ['########################################',
     '#.............###......###.............#',
     '#.###########.###.####.###.###########.#',
     '#o###########.###.####.###.###########o#',
     '#.###########.###.####.###.###########.#',
     '#......................................#',
     '#####.############################.#####',
     '#####.############################.#####',
     '#####...........########...........#####',
     '#####.####.####.########.####.####.#####',
     '#####.####.#### ######## ####.####.#####',
     '#####.####....            ....####.#####',
     '#####.####.#### ###--### ####.####.#####',
     '#####.####.#### #______# ####.####.#####',
     '#.............  #______#  .............#',
     '#.###.####.#### #______# ####.####.###.#',
     '#.###.####.#### ######## ####.####.###.#',
     '#o###.####....            ....####.###o#',
     '#.###.####.#### ######## ####.####.###.#',
     '#.###.####.####.########.####.####.###.#',
     '#..................  ..................#',
     '#.###.####.####.########.####.####.###.#',
     '#.###.####.####.########.####.####.###.#',
     '#..........####.########.####..........#',
     '#.###.#########.########.#########.###.#',
     '#.###.#########.########.#########.###.#',
     '#.###..............................###.#',
     '#.###.############################.###.#',
     '#o###.############################.###o#',
     '#......................................#',
     '########################################'],
  ];
  // ===================== Jr. Pac-Man =====================
  const W = 224, H = 288, OFFR = 3, COLS = 40, MROWS = 31, MW = COLS * 8;
  const CX = 160;                         // maze centre x (house door)
  const MAZE_COL = [
    { fill: '#c02868', line: '#ffb8de', dot: '#ffb8ae' },
    { fill: '#1c1cb8', line: '#47b8ff', dot: '#ffffff' },
    { fill: '#b05a00', line: '#ffde97', dot: '#ffff80' }
  ];
  const GHOSTS = [
    { name: 'BLINKY', color: '#ff0000', scatter: [37, 0], homeX: CX },
    { name: 'PINKY', color: '#ffb8ff', scatter: [2, 0], homeX: CX },
    { name: 'INKY', color: '#00ffff', scatter: [39, 35], homeX: CX - 16 },
    { name: 'TIM', color: '#ffb852', scatter: [0, 35], homeX: CX + 16 }
  ];
  const ITEMS = [
    { name: 'TRICYCLE', pts: 100, art: ['....kk......', '.....k......', '..rrrrr.....', '...r..r.....', '...r..rrrrr.', '..www.r..www', '.w...wr.w...', '.w.k.w..w.k.', '.w...w..w...', '..www....www', '............', '............'] },
    { name: 'KITE', pts: 200, art: ['.....rr.....', '....rrrr....', '...rryyrr...', '..rryyyyrr..', '.rryyyyyyrr.', '..rryyyyrr..', '...rryyrr...', '....rrrr....', '.....rr.....', '......w.....', '.....w.r....', '......w.....'] },
    { name: 'DRUM', pts: 500, art: ['.w.......w..', '..w.....w...', '...w...w....', '.wwwwwwwwww.', 'rrrrrrrrrrrr', 'ryrryrryrryr', 'rryyrryyrryr', 'ryrryrryrryr', 'rrrrrrrrrrrr', '.wwwwwwwwww.', '............', '............'] },
    { name: 'BALLOON', pts: 700, art: ['....bbbb....', '...bbbbbb...', '..bbwbbbbb..', '..bwbbbbbb..', '..bbbbbbbb..', '..bbbbbbbb..', '...bbbbbb...', '....bbbb....', '.....bb.....', '......w.....', '.....w......', '......w.....'] },
    { name: 'TRAIN', pts: 1000, art: ['..ww........', '.rrrr.......', '.rrrr...bbbb', '.rrrr...bwwb', 'rrrrrrrrbbbb', 'ryyrryyrrbbb', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', '.ww..ww..ww.', 'wkkwwkkwwkkw', '.ww..ww..ww.', '............'] },
    { name: 'KITTEN', pts: 2000, art: ['.o......o...', '.oo....oo...', '.oooooooo...', '.okoooko....', '.oooppoo....', '..oooooo...o', '...oooooo..o', '..oooooooooo', '..oooooooo..', '..o.o..o.o..', '..o.o..o.o..', '............'] },
    { name: 'BEER', pts: 5000, art: ['..wwwwww....', '.wwwwwwww...', '.yyyyyyyw...', '.yyyyyyy.ww.', '.ywyyyyy..w.', '.ywyyyyy..w.', '.ywyyyyy..w.', '.yyyyyyy.ww.', '.yyyyyyyy...', '.yyyyyyy....', '.wwwwwww....', '............'] }
  ];
  const IPAL = { k: '#000000', r: '#ff2020', w: '#ffffff', y: '#ffe030', b: '#3080ff', o: '#ff9030', p: '#ffb0d0' };
  const BASE = 1.26;

  ArcadeRegistry.register({
    id: 'jrpacman', title: 'Jr. Pac-Man', year: 1983, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Enter/Space: start',
    marquee: { bg: '#000', fg: '#ffff00', accent: '#ff2060' },
    create(api) {
      const A = api.audio, coin = makeCoin(api);
      const MAZE_CV = MAZES.map((m, i) => buildMazeCanvas(m, MAZE_COL[i].fill, MAZE_COL[i].line));
      const MAZE_WHITE = MAZES.map(m => buildMazeCanvas(m, '#000000', '#ffffff'));
      const ISPR = ITEMS.map(it => sprite(it.art, IPAL));
      // ---- procedural Jr. Pac-Man (mouth frames x facing) ----
      function makeJr(mouth, facingLeft, prop) {
        const cv = mkCanvas(15, 17), c = cv.getContext('2d');
        const px = (x, y, col) => { c.fillStyle = col; c.fillRect(facingLeft ? 14 - x : x, y, 1, 1); };
        for (let y = 0; y < 13; y++) for (let x = 0; x < 15; x++) {
          const dx = x - 7, dy = y - 6; if (dx * dx + dy * dy > 45) continue;
          const ang = Math.atan2(dy, dx);
          if (dx > 0 && Math.abs(ang) < mouth) continue;
          px(x, y + 4, '#ffff00');
        }
        // eye
        px(8, 6, '#000000'); px(8, 7, '#000000');
        // beanie
        const cap = ['....rrrrr.....', '...rrrrrrr....', '..rrrrrrrrr...'];
        cap.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === 'r') px(x, y + 1, '#ff2020'); });
        px(7, 0, '#ffffff');
        if (prop) { px(4, 0, '#00c0ff'); px(5, 0, '#00c0ff'); px(6, 0, '#00c0ff'); px(8, 0, '#00c0ff'); px(9, 0, '#00c0ff'); px(10, 0, '#00c0ff'); }
        else { px(6, 0, '#00c0ff'); px(8, 0, '#00c0ff'); }
        return cv;
      }
      const JR = [0.05, 0.45, 0.8].map(m => [makeJr(m, false, true), makeJr(m, true, true), makeJr(m, false, false), makeJr(m, true, false)]);
      const GBODY = ['.....####.....', '...########...', '..##########..', '.############.', '.############.', '.############.', '##############', '##############', '##############', '##############', '##############', '##############'];
      const GSK = [['##.###..###.##', '#...##..##...#'], ['####.####.####', '.##...##...##.']];
      const gs = (col, f) => sprite(GBODY.concat(GSK[f]), { '#': col });
      const GSPR = GHOSTS.map(g => [gs(g.color, 0), gs(g.color, 1)]);
      function frightSpr(body, face, f) {
        const rows = GBODY.concat(GSK[f]).map((r, y) => {
          const a = r.split('');
          if (y === 5 || y === 6) [4, 5, 8, 9].forEach(x => a[x] = 'f');
          if (y === 9) [2, 4, 6, 8, 10].forEach(x => a[x] = 'f');
          if (y === 10) [3, 5, 7, 9, 11].forEach(x => a[x] = 'f');
          return a.join('');
        });
        return sprite(rows, { '#': body, f: face });
      }
      const FR = [[frightSpr('#2121ff', '#ffb8ae', 0), frightSpr('#2121ff', '#ffb8ae', 1)], [frightSpr('#dedeff', '#ff0000', 0), frightSpr('#dedeff', '#ff0000', 1)]];
      const EYEPOS = [[[2, 2], [8, 2]], [[1, 4], [7, 4]], [[2, 5], [8, 5]], [[3, 4], [9, 4]]];
      const PUP = [[1, 0], [0, 2], [1, 3], [2, 2]];
      function drawEyes(ctx, x, y, dir) {
        for (const [ex, ey] of EYEPOS[dir]) {
          ctx.fillStyle = '#dedeff'; ctx.fillRect(x + ex + 1, y + ey, 2, 5); ctx.fillRect(x + ex, y + ey + 1, 4, 3);
          ctx.fillStyle = '#2121ff'; ctx.fillRect(x + ex + PUP[dir][0], y + ey + PUP[dir][1], 2, 2);
        }
      }

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, level = 1, extraGiven = false;
      let maze, mz = 0, dots = new Uint8Array(COLS * 36), dotsLeft = 0, dotsEaten = 0;
      let pac, ghosts, P, modeIdx, modeT, frightT, combo, item, popups = [], freeze, houseT, camX = 0, sndT = 0, waka = false, eatPop = null, itemsSpawned = 0, lastH = 3;

      const tX = x => Math.floor(x / 8), tY = y => Math.floor(y / 8);
      function mch(c, r) { const mr = r - OFFR; if (mr < 0 || mr >= MROWS || c < 0 || c >= COLS) return '#'; return maze[mr][c]; }
      const open = (c, r) => { const ch = mch(c, r); return ch !== '#' && ch !== '_' && ch !== '-'; };

      function params(L) {
        let p;
        if (L === 1) p = { pac: .8, gh: .75, fr: .5, frp: .9 };
        else if (L <= 4) p = { pac: .9, gh: .85, fr: .55, frp: .95 };
        else p = { pac: 1, gh: .95, fr: .6, frp: 1 };
        const FT = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0];
        p.fright = (L <= FT.length ? FT[L - 1] : 0) * 60 || (L <= 20 ? 40 : 0);
        p.modes = (L === 1 ? [7, 20, 7, 20, 5, 20, 5] : [5, 20, 5, 20, 5, 60, 1]).map(s => s * 60); p.modes.push(Infinity);
        p.elroy = 20 + Math.min(L, 10) * 6;
        return p;
      }
      function setupMaze() {
        mz = Math.floor((level - 1) / 2) % 3; maze = MAZES[mz];
        dotsLeft = 0; dotsEaten = 0; dots.fill(0);
        for (let r = 0; r < 36; r++) for (let c = 0; c < COLS; c++) { const ch = mch(c, r); const v = ch === '.' ? 1 : ch === 'o' ? 2 : 0; dots[r * COLS + c] = v; if (v) dotsLeft++; }
      }
      function resetActors() {
        pac = { x: CX, y: (20 + OFFR) * 8 + 4, dir: 1, want: 1, acc: 0, anim: 0, pause: 0, face: 1 };
        ghosts = GHOSTS.map((d, i) => ({
          ...d, idx: i, x: i === 0 ? CX : d.homeX, y: i === 0 ? 116 : 140, dir: i === 0 ? 1 : (i === 1 ? 2 : 0),
          mode: i === 0 ? 'active' : 'house', fright: false, acc: 0, dots: 0, limit: [0, 0, level === 1 ? 30 : 10, level === 1 ? 60 : 30][i]
        }));
        modeIdx = 0; modeT = 0; frightT = 0; combo = 0; freeze = 0; houseT = 0; eatPop = null; item = null; popups = [];
        camX = clamp(pac.x - 112, 0, MW - W);
      }
      function startGame() {
        score = 0; lives = 3; level = 1; extraGiven = false; P = params(1);
        setupMaze(); resetActors(); itemsSpawned = 0; state = 'ready'; T = 0;
        A.melody([[523, .12], [659, .12], [784, .12], [659, .12], [1047, .24], [988, .12], [880, .12], [784, .24], [659, .12], [698, .12], [784, .12], [880, .12], [1047, .36]], { type: 'square', vol: 0.08 });
        A.melody([[131, .24], [196, .24], [131, .24], [196, .24], [175, .24], [262, .24], [196, .24], [262, .48]], { type: 'triangle', vol: 0.16 });
      }
      function nextLevel() { level++; P = params(level); setupMaze(); resetActors(); itemsSpawned = 0; state = 'ready'; T = 60; }
      function addScore(n) {
        score += n;
        if (!extraGiven && score >= 10000) { extraGiven = true; lives++; for (let i = 0; i < 6; i++) A.tone(1046, 0.08, { type: 'square', vol: 0.12, delay: i * 0.14 }); }
        if (score > hi) hi = score;
      }
      // ---- sounds ----
      function sndDot(fat) {
        waka = !waka;
        if (fat) { A.tone(160, 0.12, { type: 'square', vol: 0.12, slideTo: 90 }); return; }
        A.tone(waka ? 300 : 600, 0.06, { type: 'triangle', vol: 0.18, slideTo: waka ? 600 : 300 });
      }
      function sndBg() {
        if (--sndT > 0) return;
        if (ghosts.some(g => g.mode === 'eyes' || g.mode === 'entering')) { sndT = 6; A.tone(1500, 0.09, { type: 'square', vol: 0.025, slideTo: 800 }); return; }
        if (frightT > 0) { sndT = 10; A.tone(300, 0.15, { type: 'sawtooth', vol: 0.03, slideTo: 800 }); return; }
        const st = Math.min(3, Math.floor(dotsEaten / 70));
        sndT = 16 - st * 2; const b = 380 + st * 60;
        A.tone(b, sndT / 60, { type: 'sine', vol: 0.05, slideTo: b * 1.4 });
      }

      // ---- movement ----
      function pacStep() {
        const c = tX(pac.x), r = tY(pac.y), ox = mod8(pac.x) - 4, oy = mod8(pac.y) - 4;
        const d = pac.want;
        if (d !== pac.dir) {
          if (d === (pac.dir + 2) % 4) pac.dir = d;
          else if (open(c + DX[d], r + DY[d]) && Math.abs(DX[d] ? oy : ox) <= 3) pac.dir = d;
        }
        const along = DX[pac.dir] * ox + DY[pac.dir] * oy;
        if (!open(c + DX[pac.dir], r + DY[pac.dir]) && along >= 0) return false;
        pac.x += DX[pac.dir]; pac.y += DY[pac.dir];
        if (DX[pac.dir] !== 0 && oy !== 0) pac.y -= Math.sign(oy);
        if (DY[pac.dir] !== 0 && ox !== 0) pac.x -= Math.sign(ox);
        if (DX[pac.dir]) pac.face = pac.dir;
        pac.anim++;
        return true;
      }
      function eatAt() {
        const c = tX(pac.x), r = tY(pac.y);
        const i = r * COLS + c, v = dots[i]; if (!v) return;
        dots[i] = 0; dotsLeft--; dotsEaten++; houseT = 0;
        if (v === 1) { addScore(10); pac.pause = 1; sndDot(false); }
        else if (v === 3) { addScore(50); pac.pause = 6; sndDot(true); }
        else { addScore(50); pac.pause = 3; energize(); sndDot(false); }
        const g = ghosts.find(q => q.mode === 'house'); if (g) g.dots++;
        if ((dotsEaten === 50 || dotsEaten === 150) && !item) spawnItem();
      }
      function energize() {
        combo = 0;
        for (const g of ghosts) { if (g.mode === 'active') g.dir = (g.dir + 2) % 4; if (P.fright > 0 && g.mode !== 'eyes' && g.mode !== 'entering') g.fright = true; }
        if (P.fright > 0) frightT = P.fright;
      }
      function ghostTarget(g) {
        if (g.mode === 'eyes') return [19, 14];
        const pc = tX(pac.x), pr = tY(pac.y), pd = pac.dir;
        const elroy = g.idx === 0 && dotsLeft <= P.elroy;
        if (modeIdx % 2 === 0 && !elroy) return g.scatter;
        if (g.idx === 0) return [pc, pr];
        if (g.idx === 1) return [pc + 4 * DX[pd], pr + 4 * DY[pd]];
        if (g.idx === 2) { const ax = pc + 2 * DX[pd], ay = pr + 2 * DY[pd]; const b = ghosts[0]; return [2 * ax - tX(b.x), 2 * ay - tY(b.y)]; }
        const dx = tX(g.x) - pc, dy = tY(g.y) - pr; return dx * dx + dy * dy > 64 ? [pc, pr] : g.scatter;
      }
      function ghostStep(g) {
        if (g.mode === 'house') { g.y += g.dir === 0 ? -1 : 1; if (g.y <= 136) g.dir = 2; if (g.y >= 144) g.dir = 0; return; }
        if (g.mode === 'leaving') {
          if (g.x !== CX) { if (g.y !== 140) { g.y += g.y < 140 ? 1 : -1; return; } g.dir = g.x < CX ? 3 : 1; g.x += g.x < CX ? 1 : -1; }
          else if (g.y > 116) { g.y--; g.dir = 0; }
          else { g.mode = 'active'; g.dir = Math.random() < 0.5 ? 1 : 3; }
          return;
        }
        if (g.mode === 'entering') {
          if (g.y === 116 && g.x !== CX) g.x += g.x < CX ? 1 : -1;
          else if (g.y < 140) { g.y++; g.dir = 2; }
          else if (g.x !== g.homeX) { g.dir = g.x < g.homeX ? 3 : 1; g.x += g.x < g.homeX ? 1 : -1; }
          else { g.mode = 'leaving'; g.fright = false; }
          return;
        }
        if (mod8(g.x) === 4 && mod8(g.y) === 4) {
          const c = tX(g.x), r = tY(g.y);
          if (g.mode === 'eyes' && r === 14 && (c === 19 || c === 20)) { g.mode = 'entering'; g.x = c === 19 ? CX - 4 : CX + 4; return; }
          const opts = [];
          for (let d = 0; d < 4; d++) { if (d === (g.dir + 2) % 4) continue; if (open(c + DX[d], r + DY[d])) opts.push(d); }
          if (!opts.length) g.dir = (g.dir + 2) % 4;
          else if (g.fright && g.mode !== 'eyes') g.dir = pick(opts);
          else {
            const [tx, ty] = ghostTarget(g); let best = 1e9;
            for (const d of opts) { const ex = c + DX[d] - tx, ey = r + DY[d] - ty, dd = ex * ex + ey * ey; if (dd < best) { best = dd; g.dir = d; } }
          }
        }
        g.x += DX[g.dir]; g.y += DY[g.dir];
      }
      function ghostSpeed(g) {
        if (g.mode === 'eyes' || g.mode === 'entering') return BASE * 1.7;
        if (g.mode === 'house' || g.mode === 'leaving') return BASE * 0.5;
        if (g.fright) return BASE * P.fr;
        if (g.idx === 0 && dotsLeft <= P.elroy) return BASE * (P.gh + 0.08);
        return BASE * P.gh;
      }
      // ---- bonus toy: enters at a side and bounces around the maze ----
      function spawnItem() {
        itemsSpawned++;
        const k = level <= 7 ? level - 1 : irnd(7);
        const rowsOpen = []; for (let r = OFFR; r < OFFR + MROWS; r++) if (open(1, r) && open(2, r)) rowsOpen.push(r);
        const left = Math.random() < 0.5;
        const r = pick(rowsOpen.length ? rowsOpen : [OFFR + 1]);
        item = { k, x: (left ? 1 : COLS - 2) * 8 + 4, y: r * 8 + 4, dir: left ? 3 : 1, t: 0, life: 60 * 22 };
        A.tone(800, 0.1, { type: 'square', vol: 0.06, slideTo: 1200 });
      }
      function itemStep() {
        const it = item;
        if (mod8(it.x) === 4 && mod8(it.y) === 4) {
          const c = tX(it.x), r = tY(it.y);
          const di = r * COLS + c;
          if (dots[di] === 1) dots[di] = 3;
          else if (dots[di] === 2) { dots[di] = 0; dotsLeft--; item = null; burstPop(c * 8 + 4, r * 8 + 4); A.noise(0.3, { vol: 0.15, freq: 2500, slideTo: 300 }); return; }
          const opts = [];
          for (let d = 0; d < 4; d++) { if (d === (it.dir + 2) % 4) continue; if (open(c + DX[d], r + DY[d])) opts.push(d); }
          it.dir = opts.length ? pick(opts) : (it.dir + 2) % 4;
        }
        it.x += DX[it.dir]; it.y += DY[it.dir];
      }
      let parts = [];
      function burstPop(x, y) { burst(parts, x, y, ['#ffffff', '#ffb8ae', '#ffff00'], 12); }

      function die() {
        state = 'dying'; T = 0;
        for (let i = 0; i < 10; i++) A.tone(900 - i * 70, 0.12, { type: 'square', vol: 0.08, slideTo: 450 - i * 40, delay: 0.9 + i * 0.11 });
      }
      function collide() {
        const pc = tX(pac.x), pr = tY(pac.y);
        for (const g of ghosts) {
          if (g.mode !== 'active' || tX(g.x) !== pc || tY(g.y) !== pr) continue;
          if (g.fright) {
            const v = 200 << combo; combo = Math.min(combo + 1, 3); addScore(v);
            g.fright = false; g.mode = 'eyes'; freeze = 60; eatPop = { x: g.x, y: g.y, v, g };
            A.tone(200, 0.35, { type: 'sawtooth', vol: 0.12, slideTo: 1600 });
          } else { die(); return; }
        }
        if (item && Math.abs(item.x - pac.x) < 6 && Math.abs(item.y - pac.y) < 6) {
          const v = ITEMS[item.k].pts; addScore(v); popups.push({ x: item.x, y: item.y, v, t: 120 }); item = null;
          A.melody([[880, .06], [1175, .06], [1568, .12]], { type: 'square', vol: 0.12 });
        }
      }

      function updatePlay() {
        if (freeze > 0) { freeze--; if (freeze === 0) eatPop = null; return; }
        // input
        if (api.key('ArrowLeft')) pac.want = 1; else if (api.key('ArrowRight')) pac.want = 3;
        else if (api.key('ArrowUp')) pac.want = 0; else if (api.key('ArrowDown')) pac.want = 2;
        // modes
        if (frightT > 0) { frightT--; if (frightT === 0) ghosts.forEach(g => g.fright = false); }
        else { modeT++; if (modeT >= P.modes[modeIdx]) { modeT = 0; modeIdx++; ghosts.forEach(g => { if (g.mode === 'active') g.dir = (g.dir + 2) % 4; }); } }
        // ghost release
        houseT++;
        for (const g of ghosts) if (g.mode === 'house' && (g.dots >= g.limit || houseT > 240)) { g.mode = 'leaving'; houseT = 0; break; }
        // pac
        if (pac.pause > 0) pac.pause--;
        else {
          pac.acc += BASE * (frightT > 0 ? P.frp : P.pac);
          while (pac.acc >= 1) { pac.acc--; if (pacStep()) eatAt(); collide(); if (state !== 'play') return; }
        }
        // ghosts
        for (const g of ghosts) { g.acc += ghostSpeed(g); while (g.acc >= 1) { g.acc--; ghostStep(g); } }
        collide(); if (state !== 'play') return;
        if (item) {
          item.t++;
          if (item.t % 2 === 0) itemStep();
          if (item && --item.life <= 0) item = null;
          if (item) collide();
        }
        sndBg();
        camX += (clamp(pac.x - 112, 0, MW - W) - camX) * 0.25;
        if (dotsLeft <= 0) { state = 'clear'; T = 0; }
      }

      function update() {
        coin.tick(); T++;
        stepParts(parts);
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        if (state === 'title') {
          if (api.anyPressed('Enter', 'Space')) { if (coin.tryStart()) startGame(); }
          return;
        }
        if (state === 'ready') { if (T > 150) { state = 'play'; T = 0; } camX = clamp(pac.x - 112, 0, MW - W); return; }
        if (state === 'play') { updatePlay(); return; }
        if (state === 'dying') {
          if (T === 220) {
            lives--;
            if (lives > 0) { resetActors(); state = 'ready'; T = 60; }
            else {
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              state = 'hold';
              if (api.offerContinue) api.offerContinue(() => { lives = 3; resetActors(); state = 'ready'; T = 60; }, over); else over();
            }
          }
          return;
        }
        if (state === 'clear') { if (T > 200) nextLevel(); return; }
        if (state === 'over') { if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; } }
      }

      // ---- drawing ----
      function drawHUD(ctx) {
        if (state === 'title' || ((api.frame >> 4) & 1)) text(ctx, '1UP', 24, 0, '#ffffff');
        text(ctx, String(score || '00'), 64, 9, '#ffffff', { right: true });
        text(ctx, 'HIGH SCORE', 112, 0, '#ffffff', { center: true });
        text(ctx, String(hi), 152, 9, '#ffffff', { right: true });
      }
      function drawBottom(ctx) {
        const showL = state === 'ready' && T < 60 ? lives : lives - 1;
        for (let i = 0; i < Math.min(showL, 5); i++) ctx.drawImage(JR[1][0], 8 + i * 16, 271);
        const n = Math.min(level, 7);
        for (let i = 0; i < n; i++) ctx.drawImage(ISPR[Math.min(level, 7) - 1 - i], W - 18 - i * 14, 273);
      }
      function drawGhost(ctx, g, ox) {
        const x = Math.round(g.x - 7 - ox), y = Math.round(g.y - 7) + 24 - OFFR * 8;
        if (x < -16 || x > W) return;
        const f = (api.frame >> 3) & 1;
        if (g.mode === 'eyes' || g.mode === 'entering') { drawEyes(ctx, x, y, g.dir); return; }
        if (g.fright && g.mode !== 'eyes') {
          const flashing = frightT < 120 && ((frightT / 14 | 0) % 2 === 0);
          ctx.drawImage(FR[flashing ? 1 : 0][f], x, y); return;
        }
        ctx.drawImage(GSPR[g.idx][f], x, y); drawEyes(ctx, x, y, g.dir);
      }
      function renderTitle(ctx) {
        drawHUD(ctx);
        text(ctx, 'JR. PAC-MAN', 112, 40, '#ffff00', { center: true, scale: 2 });
        ctx.drawImage(JR[1][0], 104, 62);
        text(ctx, 'CHARACTER / NICKNAME', 112, 88, '#ffffff', { center: true });
        const nick = ['"BLINKY"', '"PINKY"', '"INKY"', '"TIM"'];
        GHOSTS.forEach((g, i) => { if (T > 30 + i * 30) { ctx.drawImage(GSPR[i][0], 40, 102 + i * 18); drawEyes(ctx, 40, 102 + i * 18, 3); text(ctx, nick[i], 64, 106 + i * 18, g.color); } });
        if (T > 160) {
          text(ctx, '. 10 PTS', 96, 180, '#ffffff'); ctx.fillStyle = '#ffb8ae'; ctx.fillRect(83, 182, 2, 2);
          text(ctx, '. 50 PTS', 96, 192, '#ffffff'); ctx.fillStyle = '#ffb8ae'; ctx.fillRect(81, 191, 5, 5);
          ctx.fillStyle = '#ffb8ae'; ctx.beginPath(); ctx.arc(84, 206, 4, 0, Math.PI * 2); ctx.fill(); text(ctx, '  50 PTS', 96, 203, '#ffffff');
        }
        // marquee chase
        const cx = ((T * 1.2) % 360) - 60;
        ctx.drawImage(JR[(T >> 2) % 3][0], Math.round(cx), 222);
        for (let i = 0; i < 4; i++) { const gx = Math.round(cx - 22 - i * 16); ctx.drawImage(GSPR[i][(T >> 3) & 1], gx, 223); drawEyes(ctx, gx, 223, 3); }
        coin.draw(ctx, 112, 248, '#ffb852', api.frame);
        text(ctx, '\u00a9 1983 BALLY MIDWAY', 112, 262, '#ff60a0', { center: true, adv: 7 });
        coin.credit(ctx, 8, 278, '#dedeff');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        const ox = Math.round(camX);
        const flashW = state === 'clear' && T > 60 && (((T - 60) / 12 | 0) % 2 === 0);
        ctx.drawImage(flashW ? MAZE_WHITE[mz] : MAZE_CV[mz], -ox, OFFR * 8);
        // door
        if (state !== 'clear') { ctx.fillStyle = '#ffb8ff'; ctx.fillRect(CX - 8 - ox, (12 + OFFR) * 8 + 3, 16, 2); }
        // dots
        const blink = (api.frame >> 3) & 1, dc = MAZE_COL[mz].dot;
        const c0 = Math.max(0, (ox >> 3) - 1), c1 = Math.min(COLS - 1, c0 + 30);
        ctx.fillStyle = dc;
        for (let r = OFFR; r < OFFR + MROWS; r++) for (let c = c0; c <= c1; c++) {
          const v = dots[r * COLS + c]; if (!v) continue;
          const x = c * 8 - ox, y = r * 8;
          if (v === 1) ctx.fillRect(x + 3, y + 3, 2, 2);
          else if (v === 3) ctx.fillRect(x + 2, y + 2, 4, 4);
          else if (blink || state !== 'play') { ctx.beginPath(); ctx.arc(x + 4, y + 4, 4, 0, Math.PI * 2); ctx.fill(); }
        }
        if (item && (item.life > 120 || (item.life >> 3) & 1)) {
          const bob = Math.round(Math.abs(Math.sin(item.t / 8)) * 4);
          ctx.drawImage(ISPR[item.k], Math.round(item.x - 6 - ox), Math.round(item.y - 6 - bob));
        }
        const showActors = state !== 'over' && state !== 'hold';
        if (showActors) {
          const ghostsVisible = !(state === 'dying' && T >= 60) && state !== 'clear';
          if (ghostsVisible) for (const g of ghosts) { if (eatPop && eatPop.g === g) continue; drawGhost(ctx, g, ox); }
          if (state === 'dying' && T >= 60) {
            const k = Math.min(1, (T - 60) / 110);
            if (k < 1) { ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.moveTo(pac.x - ox, pac.y); ctx.arc(pac.x - ox, pac.y, 6.5, -Math.PI / 2 + k * Math.PI, -Math.PI / 2 - k * Math.PI + Math.PI * 2); ctx.closePath(); ctx.fill(); }
            else if (T < 200) { ctx.fillStyle = '#ffff00'; for (let a = 0; a < 8; a++) ctx.fillRect(pac.x - ox + Math.cos(a * 0.785) * 7, pac.y + Math.sin(a * 0.785) * 7, 1, 1); }
          } else if (!eatPop) {
            const f = state === 'play' ? [0, 1, 2, 1][(pac.anim >> 1) & 3] : 1;
            const prop = (api.frame >> 2) & 1;
            ctx.drawImage(JR[f][(pac.face === 1 ? 1 : 0) + (prop ? 0 : 2)], Math.round(pac.x - 7 - ox), Math.round(pac.y - 10));
          }
          if (eatPop) tinyNum(ctx, eatPop.v, eatPop.x - ox, eatPop.y, '#00ffff');
        }
        for (const p of popups) tinyNum(ctx, p.v, p.x - ox, p.y, '#ffb8ff');
        drawParts(ctx, parts, ox);
        drawHUD(ctx); drawBottom(ctx);
        if (state === 'ready') { text(ctx, 'READY!', 112, (14 + OFFR) * 8 + 32, '#ffff00', { center: true }); }
        if (state === 'over' || state === 'hold') text(ctx, 'GAME  OVER', 112, (14 + OFFR) * 8 + 32, '#ff0000', { center: true });
        // scroll hints
        if (ox > 4) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 140, 2, 8); }
        if (ox < MW - W - 4) { ctx.fillStyle = '#ffffff'; ctx.fillRect(W - 2, 140, 2, 8); }
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, lives, level, dotsLeft, mz }), pac: () => pac, ghosts: () => ghosts, open: (c, r) => open(c, r), dots: () => dots });
      return { update, render };
    }
  });
})();
