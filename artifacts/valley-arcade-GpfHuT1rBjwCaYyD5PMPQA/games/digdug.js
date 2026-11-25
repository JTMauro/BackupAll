// Dig Dug (Namco, 1982) — faithful browser recreation for Arcade Games Galore.
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
    '?': '0E110102040004', '@': '0E11171517100E', '#': '0A0A1F0A1F0A0A', '©': '0E11171417110E',
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

  // ================= Sprites (16x16, hand drawn, facing right) =================
  const TAIZO_PAL = { w: '#FFFFFF', b: '#2147FF', s: '#FFB89C', k: '#000000', r: '#FF2020', g: '#B8B8B8' };
  const HEAD = [
    '................',
    '.....wwwwww.....',
    '...wwwwwwwwww...',
    '..wwwwwwwwwwww..',
    '..wwwwwbbbbbbb..',
    '..wwwwbssssks...',
    '..wwwwbsssssss..',
    '...wwwbbsssss...',
    '....wwwbbbbb....'];
  const TAIZO = {
    walk1: HEAD.concat(['...bbwwwwwww....', '..bbwwwwwwwwbb..', '..bbwwbbbbwwbb..', '....wwwwwwww....', '....bbb..bbb....', '...bbbb..bbbb...', '................']),
    walk2: HEAD.concat(['...bbwwwwwww....', '..bbwwwwwwwwbb..', '..bbwwbbbbwwbb..', '....wwwwwwww....', '.....bbbbbb.....', '.....bbbbbbb....', '................']),
    pump1: HEAD.concat(['...bwwwwwwwwbbbg', '..bbwwwwwwwwbbbg', '..bbwwbbbbww....', '....wwwwwwww....', '....bbb..bbb....', '...bbbb..bbbb...', '................']),
    pump2: HEAD.concat(['...bwwwwwwwbbbbg', '..bbwwwwwwwbbbbg', '..bbwwbbbbww....', '....wwwwwwww....', '....bbbbbbb.....', '...bbbb..bbb....', '................'])
  };
  const TAIZO_DIE = [
    ['................', '................', '................', '................', '.....wwwwww.....', '...wwwwwwwwww...', '..wwwwbbbbbbbb..', '..wwwbsssskss...', '..wwwbbssssss...', '..bbwwwwwwwwbb..', '..bbwwbbbbwwbb..', '...wwwwwwwwww...', '...bbbb..bbbb...', '..bbbbb..bbbbb..', '................', '................'],
    ['................', '................', '................', '................', '................', '................', '................', '................', '....wwwwwwww....', '..wwwwbbbbbbbb..', '.wwwwbsskskss...', '.bbwwwwwwwwwwbb.', '.bbwwbbbbbbwwbb.', '..bbbbb..bbbbb..', '................', '................'],
    ['................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '..wwwwwwwwwwww..', '.wwbbskskkssbww.', 'bbbwwwwwwwwwwbbb', '.bbbbbb..bbbbbb.']
  ];
  const POOKA_PAL = { r: '#FF2800', d: '#A80000', h: '#FF9070', w: '#FFFFFF', y: '#FFE000', k: '#000000' };
  const POOKA = [
    ['................', '.....rrrrrr.....', '...rrhhrrrrrr...', '..rrhhrrrrrrrr..', '.rrhrrwwwwwwwww.', '.rrrrwyyyywyyyyw', 'rrrrrwyykywyykyw', 'rrrrrwyykywyykyw', 'drrrrwyyyywyyyyw', 'drrrrrwwwwwwwww.', 'ddrrrrrrrrrrrrr.', '.ddrrrrrrrrrrrr.', '..ddrrrrrrrrrr..', '...dddrrrrrrr...', '....ww....ww....', '...www...www....'],
    ['................', '.....rrrrrr.....', '...rrhhrrrrrr...', '..rrhhrrrrrrrr..', '.rrhrrwwwwwwwww.', '.rrrrwyyyywyyyyw', 'rrrrrwyykywyykyw', 'rrrrrwyykywyykyw', 'drrrrwyyyywyyyyw', 'drrrrrwwwwwwwww.', 'ddrrrrrrrrrrrrr.', '.ddrrrrrrrrrrrr.', '..ddrrrrrrrrrr..', '...dddrrrrrrr...', '.....ww..ww.....', '....www..www....']
  ];
  const POOKA_GHOST = ['................', '................', '................', '................', '......wwwwwwwww.', '.....wyyyywyyyyw', '.....wyykywyykyw', '.....wyykywyykyw', '.....wyyyywyyyyw', '......wwwwwwwww.', '................', '................', '................', '................', '................', '................'];
  const POOKA_FLAT = ['................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '..rrrrrrrrrrrr..', '.rrrrwwwwwwwwwr.', 'rrrrwyykywyykyw.', 'drrrrwwwwwwwwwr.', '.ddrrrrrrrrrrrr.', '..ww...ww...ww..'];
  const FYGAR_PAL = { g: '#00D800', d: '#007800', l: '#90FF90', w: '#FFFFFF', k: '#000000', y: '#FFE000', r: '#FF2000' };
  const FYGAR = [
    ['................', '..........gggg..', '.........gglggg.', '........gglwwgg.', '..ww....ggwkwggg', '.wwww..gggggggrr', 'wwwwww.gggggg...', '.wwwwgggggggggg.', '..wwgglgggggggg.', '...gglgggggggg..', '..ggggggggggggg.', 'dgggggggggggggg.', 'ddgggggggggggg..', '.ddddgg..dgg....', '....ddd...ddd...', '...yyy....yyy...'],
    ['................', '..........gggg..', '.........gglggg.', '........gglwwgg.', '.w......ggwkwggg', 'www....gggggggrr', 'wwwwww.gggggg...', '.wwwwgggggggggg.', '..wwgglgggggggg.', '...gglgggggggg..', '..ggggggggggggg.', 'dgggggggggggggg.', 'ddgggggggggggg..', '.ddddgg..dgg....', '.....ddd.ddd....', '....yyy..yyy....']
  ];
  const FYGAR_GHOST = ['................', '................', '................', '...........ww...', '..........wkw...', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '................'];
  const FYGAR_FLAT = ['................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '.........gggggg.', 'ww....ggglwkwggg', 'wwwwgggggggggrr.', 'dggggggggggggg..', '.ddddgggddgggg..', '...yyy....yyy...'];
  const ROCK_PAL = { k: '#3A1A00', h: '#FFD8A0', m: '#D08840', d: '#8A4A18', s: '#5A2A08' };
  const ROCK = ['................', '.....kkkkkk.....', '...kkhhhmmmkk...', '..khhhhmmmmmmk..', '.khhhmmmmmmmmdk.', '.khhmmmmmmmmmdk.', 'khmmmmmmhmmmmddk', 'khmmmmmhmmmmdddk', 'kmmmmmmmmmmmdddk', 'kmmmmdmmmmmddddk', 'kmmmmmddmmddddsk', '.kmmmmmmmdddddk.', '.kdmmmmmddddssk.', '..kddddddddssk..', '...kkssssssskk..', '.....kkkkkkk....'];
  const ROCK_CRUMBLE = [
    ['................', '................', '................', '................', '................', '................', '.....kkkk.kkk...', '...kkhhmk.kmmk..', '..khhmmdk.kmddk.', '..kmmmdkk..kdk..', '.kkk.kk...kkk...', 'khmmk...kkmmdk..', 'kmmddk.khhmmddk.', '.kdddk.kmmmddsk.', '..kkk...kkkkkk..', '................'],
    ['................', '................', '................', '................', '................', '................', '................', '................', '................', '..kk.......kk...', '.khmk.....kmdk..', '..kk..kk...kk...', '.....khdk.......', '.kk...kk...kkk..', 'kmdk......kmmdk.', '.kk........kkk..']
  ];
  const POP = ['................', '..w....w....w...', '...w...w...w....', '....w..r..w.....', '.....w.r.w......', '..rr..rrr..rr...', '.....rrwrr......', 'wwwrrrwwwrrrwww.', '.....rrwrr......', '..rr..rrr..rr...', '.....w.r.w......', '....w..r..w.....', '...w...w...w....', '..w....w....w...', '................', '................'];
  const VEG_ART = [
    [['..........g.g...', '...........gg.g.', '..........gggg..', '.........oogg...', '........oooo....', '.......ooOoo....', '......oooooo....', '.....oOoooo.....', '....oooooo......', '...oooOo........', '...oooo.........', '..ooo...........', '.oo.............', 'o...............', '................', '................'], { g: '#00D800', o: '#FF8C00', O: '#C05800' }, 400],
    [['......g..g......', '.....gg.gg......', '......gggg......', '.......gg.......', '.....pppppp.....', '....pppppppp....', '...pwwppppppp...', '...wwwwwwwwww...', '...wwwwwwwwww...', '...wwwwwwwwwg...', '....wwwwwwgg....', '.....wwwwww.....', '......wwww......', '.......ww.......', '.......w........', '................'], { g: '#00D800', p: '#C040E0', w: '#FFFFFF' }, 600],
    [['................', '.....rrrrrr.....', '...rrwwrrrrrr...', '..rrwwwrrrwwrr..', '.rrrrwrrrrwwwrr.', '.rrrrrrrrrrwrrr.', 'rrwwrrrrrrrrrrrr', 'rwwwwrrrrrwwrrrr', 'rrwwrrrrrwwwwrrr', '..rrrrrrrrrrrr..', '......bbbb......', '......bbbb......', '.....bbbbbb.....', '.....bbbbBb.....', '......bbBb......', '................'], { r: '#FF2020', w: '#FFFFFF', b: '#FFE0B0', B: '#C8A070' }, 800],
    [['................', '...........ggg..', '..........gGgGg.', '.........gGgggg.', '........gggGgg..', '.......gGgggg...', '......gggGgg....', '.....gGgggg.....', '....gggGgg......', '...gGgggg.......', '..gggGgg........', '..gGggg.........', '..gggg..........', '...gg...........', '................', '................'], { g: '#00C000', G: '#004800' }, 1000],
    [['......gg........', '.....gggg.......', '....gggggg......', '.....pppp.......', '....pppppp......', '....pwpppp......', '...pwppppppp....', '...pwpppppppp...', '...ppppppppppp..', '....pppppppppp..', '....ppppppppppp.', '.....pppppppppp.', '......pppppppp..', '.......pppppp...', '................', '................'], { g: '#00C000', p: '#8020C0', w: '#E0A0FF' }, 2000],
    [['.......gg.......', '.......g........', '...gggggggggg...', '..gggwgggggggg..', '.ggggwggggggggg.', '.gggwgggggggggg.', '.gggwggggGggggg.', '.ggggggggGggggg.', '.ggggggggGggggg.', '.gggggggGgggggg.', '..ggggggGggggg..', '..gggggGgggggg..', '...ggggGggggg...', '....ggg..ggg....', '................', '................'], { g: '#20E020', G: '#008000', w: '#C0FFC0' }, 3000],
    [['................', '......g.g.......', '....gggggggg....', '...rrggggggrr...', '..rrrrrggrrrrr..', '.rrwwrrrrrrrrrr.', '.rwwrrrrrrrrrrr.', '.rwrrrrrrrrrrrr.', '.rrrrrrrrrrrrrr.', '.rrrrrrrrrrrrrr.', '.rrrrrrrrrrrrRr.', '..rrrrrrrrrrRr..', '...rrrrrrrrRr...', '....rrrrrrrr....', '................', '................'], { g: '#00C000', r: '#FF2020', R: '#A00000', w: '#FFFFFF' }, 4000],
    [['....g..g..g.....', '.....g.g.g......', '...g.ggggg.g....', '....ggggggg.....', '.....yyyyy......', '....yYyyYyy.....', '...yyyYyyYyy....', '...yYyyYyyYy....', '...yyYyyYyyy....', '...yyyYyyYyy....', '...yYyyYyyYy....', '...yyYyyYyyy....', '....yyYyyYy.....', '.....yyyyy......', '................', '................'], { g: '#00C000', y: '#FFD000', Y: '#A06000' }, 8000]
  ];
  const FLOWER = ['...w....', '..wyw...', '...w....', '...g....', '..gg....', '...g.g..', '...gg...', '...g....'];
  const BIGFLOWER = ['....ww.ww....', '...wwwwwww...', '..wwwyyywww..', '...wyyyyyw...', '..wwwyyywww..', '...wwwwwww...', '....ww.ww....', '......g......', '....g.g......', '.....gg..g...', '......g.g....', '......gg.....'];

  function mkCanvasDD(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function flipH(rows) { return rows.map(r => r.split('').reverse().join('')); }
  // four orientations: 0 up,1 left,2 down,3 right (up/down rotate the side view so he digs head-first)
  function dirSprites(rows, pal) { return [sprite(orient(rows, 0), pal), sprite(flipH(rows), pal), sprite(orient(rows, 2), pal), sprite(rows, pal)]; }
  // inflated enemies: pixel balloon with shading, then the creature's own hand-drawn face stamped on
  function balloon(size, base, dark, light, kind) {
    const cv = mkCanvasDD(size, size), c = cv.getContext('2d'), R = size / 2;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - R, dy = y + 0.5 - R, d = Math.sqrt(dx * dx + dy * dy); if (d > R - 0.3) continue;
      const lx = dx + dy; let col = base;
      if (d > R - 1.6 && lx > 0) col = dark; else if (lx > R * 0.9) col = dark;
      if (dx < -R * 0.25 && dy < -R * 0.25 && d > R * 0.45 && d < R * 0.75) col = light;
      c.fillStyle = col; c.fillRect(x, y, 1, 1);
    }
    if (kind === 'pooka') {
      const g = sprite(['.wwwwwwwww.', 'wyyyywyyyyw', 'wyykywyykyw', 'wyykywyykyw', 'wyyyywyyyyw', '.wwwwwwwww.'], POOKA_PAL);
      c.drawImage(g, size - 13, Math.round(R - 4));
    } else {
      c.drawImage(sprite(['.ww.', 'wwkw', '.ww.'], FYGAR_PAL), size - 9, Math.round(R - 5));
      c.drawImage(sprite(['rr.', 'rrr', 'rr.'], FYGAR_PAL), size - 4, Math.round(R));
      c.drawImage(sprite(['.w.', 'www', 'www', '.w.'], FYGAR_PAL), 1, Math.round(R - 6));
    }
    return cv;
  }
  // Fygar's flame: 48px plume, bright core fading to red edges, two flicker frames
  function flameSprite(seed) {
    const cv = mkCanvasDD(48, 16), c = cv.getContext('2d');
    for (let x = 0; x < 48; x++) {
      const h = 1.5 + x / 48 * 5.5 + (((x * 7 + seed * 5) % 5) - 2) * 0.5;
      for (let y = 0; y < 16; y++) {
        const d = Math.abs(y + 0.5 - 8); if (d > h) continue;
        const f = d / h; let col = f < 0.35 ? '#FFFFA0' : f < 0.7 ? '#FFB000' : '#FF3000';
        if (((x + y + seed) % 7) === 0 && f > 0.5) continue;
        c.fillStyle = col; c.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }

  // ================= Field =================
  const FY0 = 48;                   // screen y of ground row 0
  const SUB = 4, SC = 56, SR = 56;  // 4px dig resolution
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const LAYER_ROWS = [0, 3, 7, 11]; // first row of each layer
  const layerOf = fy => { const r = Math.floor((fy + 8) / 16); return r >= 11 ? 3 : r >= 7 ? 2 : r >= 3 ? 1 : 0; };
  const PALETTES = [
    ['#F8B800', '#E07000', '#B83800', '#882000'],
    ['#D8D800', '#88B000', '#C06800', '#904000'],
    ['#FFB0A0', '#E06090', '#A03070', '#701850']
  ];
  const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5 };
  const WALK_TUNE = [N.E5, N.G5, N.A5, N.G5, N.E5, N.C5, N.D5, N.E5, N.C5, N.A4, N.G4, N.A4, N.C5, N.D5, N.E5, 0, N.F5, N.A5, N.C6, N.A5, N.F5, N.D5, N.E5, N.F5, N.E5, N.C5, N.A4, N.C5, N.D5, N.G4, N.C5, 0];

  ArcadeRegistry.register({
    id: 'digdug', title: 'Dig Dug', year: 1982, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: dig · Space (tap/hold): harpoon & pump · Enter: start',
    marquee: { bg: '#1828C8', fg: '#FFFFFF', accent: '#F8B800' },
    create(api) {
      const A = api.audio;
      const SPR = {};
      for (const k in TAIZO) SPR[k] = dirSprites(TAIZO[k], TAIZO_PAL);
      const DIE = TAIZO_DIE.map(r => sprite(r, TAIZO_PAL));
      const PK = POOKA.map(r => [sprite(flipH(r), POOKA_PAL), sprite(r, POOKA_PAL)]);
      const PKG = [sprite(flipH(POOKA_GHOST), POOKA_PAL), sprite(POOKA_GHOST, POOKA_PAL)];
      const PKF = sprite(POOKA_FLAT, POOKA_PAL);
      const FG = FYGAR.map(r => [sprite(flipH(r), FYGAR_PAL), sprite(r, FYGAR_PAL)]);
      const FGW = FYGAR.map(r => [sprite(flipH(r), { ...FYGAR_PAL, g: '#FFFFFF', d: '#FF6060', l: '#FFFFFF' }), sprite(r, { ...FYGAR_PAL, g: '#FFFFFF', d: '#FF6060', l: '#FFFFFF' })]);
      const FGG = [sprite(flipH(FYGAR_GHOST), FYGAR_PAL), sprite(FYGAR_GHOST, FYGAR_PAL)];
      const FGF = sprite(FYGAR_FLAT, FYGAR_PAL);
      const INF = { pooka: [], fygar: [] };
      for (let s = 1; s <= 3; s++) {
        INF.pooka.push(balloon(16 + s * 4, '#FF2800', '#A80000', '#FF9070', 'pooka'));
        INF.fygar.push(balloon(16 + s * 4, '#00D800', '#007800', '#90FF90', 'fygar'));
      }
      const INF_FLIP = { pooka: INF.pooka.map(flipCanvas), fygar: INF.fygar.map(flipCanvas) };
      const FLAME = [flameSprite(0), flameSprite(3)];
      const FLAME_L = FLAME.map(flipCanvas);
      const ROCKS = sprite(ROCK, ROCK_PAL), CRUMB = ROCK_CRUMBLE.map(r => sprite(r, ROCK_PAL));
      const POPS = sprite(POP, { w: '#FFFFFF', r: '#FF4040' });
      const VEG = VEG_ART.map(v => sprite(v[0], v[1]));
      const FLW = sprite(FLOWER, { w: '#FFFFFF', y: '#FFE000', g: '#00C000' }), BFLW = sprite(BIGFLOWER, { w: '#FF4080', y: '#FFE000', g: '#00C000' });
      function flipCanvas(cv) { const o = mkCanvasDD(cv.width, cv.height), c = o.getContext('2d'); c.translate(cv.width, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0); return o; }

      // dirt texture & dig map
      const dirt = mkCanvasDD(224, 224), dctx = dirt.getContext('2d');
      const dug = new Uint8Array(SC * SR);
      function paintDirt(round) {
        const pal = PALETTES[(round - 1) % PALETTES.length];
        for (let y = 0; y < 224; y++) { const row = Math.floor(y / 16); dctx.fillStyle = pal[row >= 11 ? 3 : row >= 7 ? 2 : row >= 3 ? 1 : 0]; dctx.fillRect(0, y, 224, 1); }
        // speckle texture: per layer different dot pattern, darker shade
        for (let y = 0; y < 224; y++) for (let x = 0; x < 224; x++) {
          const row = Math.floor(y / 16), li = row >= 11 ? 3 : row >= 7 ? 2 : row >= 3 ? 1 : 0;
          const h = ((x * 73856093) ^ (y * 19349663) ^ (li * 83492791)) >>> 0;
          const pat = li === 0 ? (x % 8 === 0 && y % 8 === 2) || (x % 8 === 4 && y % 8 === 6)
            : li === 1 ? ((x + y * 2) % 8 === 0 && y % 4 === 1)
              : li === 2 ? (x % 6 === 1 && y % 6 === 3) || ((x + 3) % 6 === 1 && y % 6 === 0)
                : (h % 11 === 0);
          if (pat) { dctx.fillStyle = 'rgba(0,0,0,0.35)'; dctx.fillRect(x, y, 1, 1); }
          else if (h % 37 === 0) { dctx.fillStyle = 'rgba(255,255,255,0.18)'; dctx.fillRect(x, y, 1, 1); }
        }
        dug.fill(0);
      }
      function digBox(x, y) {
        let n = 0;
        const c0 = Math.max(0, Math.floor(x / SUB)), c1 = Math.min(SC - 1, Math.floor((x + 15) / SUB));
        const r0 = Math.max(0, Math.floor(y / SUB)), r1 = Math.min(SR - 1, Math.floor((y + 15) / SUB));
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!dug[r * SC + c]) {
          dug[r * SC + c] = 1; n++;
          dctx.clearRect(c * SUB, r * SUB, SUB, SUB);
        }
        return n;
      }
      function boxClear(x, y) {
        if (y < 0) return y >= -16 ? true : false;
        const c0 = Math.floor(x / SUB), c1 = Math.floor((x + 15) / SUB), r0 = Math.floor(y / SUB), r1 = Math.floor((y + 15) / SUB);
        if (c0 < 0 || c1 >= SC || r1 >= SR) return false;
        for (let r = Math.max(0, r0); r <= r1; r++) for (let c = c0; c <= c1; c++) if (!dug[r * SC + c]) return false;
        return true;
      }
      function solidAt(px, py) { // single point in dirt?
        if (py < 0) return false; const c = Math.floor(px / SUB), r = Math.floor(py / SUB);
        if (c < 0 || c >= SC || r >= SR) return true; return !dug[r * SC + c];
      }

      // ---------- state ----------
      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 2, round = 1, nextExtra = 10000;
      let p, enemies = [], rocks = [], popups = [], veg = null, rocksDropped = 0, walkNote = 0, walkT = 0, spawnInfo = [], deathKind = '';
      let rng = 1;
      const rnd = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };

      function genRound() {
        rng = round * 7919 + 17;
        paintDirt(round);
        // player shaft from the surface to the centre
        for (let r = 0; r <= 6; r++) digBox(96, r * 16);
        const cells = new Uint8Array(14 * 14); for (let r = 0; r <= 6; r++) cells[r * 14 + 6] = 2;
        const blocked = (c, r) => c < 0 || c > 13 || r < 1 || r > 13 || cells[r * 14 + c] || (c >= 5 && c <= 7 && r <= 7);
        const nEnemy = Math.min(4 + Math.floor((round - 1) / 2), 8), nFy = Math.max(1, Math.round(nEnemy * 0.34));
        spawnInfo = [];
        for (let i = 0; i < nEnemy; i++) {
          for (let tries = 0; tries < 200; tries++) {
            const horiz = rnd() < 0.6, len = horiz ? 3 + Math.floor(rnd() * 2) : 3;
            const c = Math.floor(rnd() * (horiz ? 14 - len : 14)), r = 2 + Math.floor(rnd() * (horiz ? 11 : 12 - len));
            let ok = true;
            for (let k = 0; k < len && ok; k++) { const cc = horiz ? c + k : c, rr = horiz ? r : r + k; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (blocked(cc + a, rr + b) && !(cc + a < 0 || cc + a > 13 || rr + b > 13)) ok = false; if (blocked(cc, rr)) ok = false; }
            if (!ok) continue;
            for (let k = 0; k < len; k++) { const cc = horiz ? c + k : c, rr = horiz ? r : r + k; cells[rr * 14 + cc] = 1; digBox(cc * 16, rr * 16); }
            const mid = Math.floor(len / 2);
            spawnInfo.push({ type: i < nFy ? 'fygar' : 'pooka', x: (horiz ? c + mid : c) * 16, y: (horiz ? r : r + mid) * 16, dir: horiz ? 3 : 2 });
            break;
          }
        }
        rocks = [];
        const nRock = 3 + (round >= 5 ? 1 : 0) + (round >= 10 ? 1 : 0);
        for (let i = 0, tries = 0; i < nRock && tries < 500; tries++) {
          const c = Math.floor(rnd() * 14), r = 1 + Math.floor(rnd() * 10);
          if (cells[r * 14 + c] || cells[(r + 1) * 14 + c] || (r > 0 && cells[(r - 1) * 14 + c]) || rocks.some(k => Math.abs(k.x / 16 - c) < 2 && Math.abs(k.y / 16 - r) < 2)) continue;
          if (c === 6) continue;
          cells[r * 14 + c] = 3; rocks.push({ x: c * 16, y: r * 16, state: 'idle', t: 0, crushed: [] }); i++;
        }
        rocksDropped = 0; veg = null;
      }
      function spawnActors() {
        p = { x: 96, y: 96, dir: 3, face: 3, moving: false, anim: 0, acc: 0, harp: null, pumpAnim: 0, lastCell: -1 };
        enemies = spawnInfo.map(s => ({ ...s, face: s.dir === 1 ? 1 : 3, state: 'walk', inflate: 0, deflT: 0, acc: 0, anim: 0, ghostT: 400 + Math.floor(Math.random() * 500), fireCool: 120 + Math.floor(Math.random() * 200), t: 0, gx: 0, gy: 0, flee: false }));
        popups = [];
      }
      function startGame() {
        score = 0; lives = 2; round = 1; nextExtra = 10000;
        genRound(); spawnActors(); state = 'ready'; T = 0; jingleStart();
      }
      function addScore(n) {
        score += n; if (score > hi) hi = score;
        if (score >= nextExtra) { lives++; nextExtra = nextExtra === 10000 ? 40000 : nextExtra + 40000; for (let i = 0; i < 4; i++) A.tone(1318, 0.1, { type: 'square', vol: 0.1, delay: i * 0.15 }); }
      }
      function jingleStart() {
        A.melody([[N.C5, .1], [N.E5, .1], [N.G5, .1], [N.C6, .2], [0, .05], [N.G5, .1], [N.C6, .35]], { type: 'square', vol: 0.09 });
        A.melody([[N.C4, .3], [N.G4, .3], [N.C4 / 2, .4]], { type: 'triangle', vol: 0.2 });
      }

      // ---------- helpers ----------
      const overlap = (a, b, m) => Math.abs(a.x - b.x) < 16 - m && Math.abs(a.y - b.y) < 16 - m;
      function rockBlocks(x, y, self) { for (const r of rocks) if (r !== self && r.state !== 'crumble' && Math.abs(r.x - x) < 16 && Math.abs(r.y - y) < 16) return true; return false; }
      function enemyCanMove(e, d) { const nx = e.x + DX[d], ny = e.y + DY[d]; if (nx < 0 || nx > 208 || ny < 0 || ny > 208) return false; return boxClear(nx, ny) && !rockBlocks(nx, ny); }
      function inTunnelAligned(x, y) { return x % 16 === 0 && y % 16 === 0 && boxClear(x, y) && !rockBlocks(x, y); }

      // ---------- player ----------
      function updatePlayer() {
        const keys = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
        let want = -1;
        for (let d = 0; d < 4; d++) if (api.key(keys[d])) want = d;
        for (let d = 0; d < 4; d++) if (api.pressed(keys[d])) p.lastPress = d;
        if (p.lastPress != null && api.key(keys[p.lastPress])) want = p.lastPress;
        const fire = api.pressed('Space') || api.pressed('KeyX') || api.pressed('KeyZ');
        const hold = api.key('Space') || api.key('KeyX') || api.key('KeyZ');
        // harpoon / pump
        if (p.harp) {
          const h = p.harp;
          if (want !== -1 && h.state !== 'out') { detach(); }
          else if (h.state === 'out') {
            h.len += 4;
            const tipx = p.x + 8 + DX[h.dir] * (6 + h.len), tipy = p.y + 8 + DY[h.dir] * (6 + h.len);
            let hit = null;
            for (const e of enemies) if ((e.state === 'walk' || e.state === 'fire' || e.state === 'prep' || e.state === 'inflate') && tipx >= e.x && tipx < e.x + 16 && tipy >= e.y && tipy < e.y + 16) { hit = e; break; }
            if (hit) {
              h.state = 'attached'; h.target = hit; h.horiz = h.dir % 2 === 1;
              h.len = Math.max(4, Math.abs((hit.x - p.x) * DX[h.dir] + (hit.y - p.y) * DY[h.dir]) - 4);
              hit.state = 'inflate'; hit.inflate = Math.max(1, hit.inflate); hit.deflT = 0; pumpSound(hit.inflate);
            } else if (solidAt(tipx, tipy) || h.len >= 44) { p.harp = null; A.tone(180, 0.06, { type: 'square', vol: 0.08 }); }
            return;
          } else if (h.state === 'attached') {
            const e = h.target;
            if (!enemies.includes(e) || e.state !== 'inflate') { p.harp = null; return; }
            h.cool = (h.cool || 0) - 1;
            if (fire || (hold && h.cool <= 0)) {
              h.cool = 14; e.inflate++; e.deflT = 0; p.pumpAnim = 8; pumpSound(e.inflate);
              if (e.inflate >= 4) { popEnemy(e, h.horiz); p.harp = null; }
            }
            if (p.pumpAnim > 0) p.pumpAnim--;
            return;
          }
        }
        if (fire && !p.harp) { p.harp = { state: 'out', len: 0, dir: p.dir }; A.tone(1500, 0.12, { type: 'sawtooth', vol: 0.06, slideTo: 400 }); return; }
        // movement — turns only on the 16px lattice, like the arcade
        p.moving = false;
        if (want === -1) return;
        let d = p.dir;
        if (want === d || want === (d + 2) % 4) d = want;
        else { const aligned = (want % 2 === 0) ? p.x % 16 === 0 : p.y % 16 === 0; if (aligned) d = want; }
        const nx = p.x + DX[d], ny = p.y + DY[d];
        if (nx < 0 || nx > 208 || ny < 0 || ny > 208 || rockBlocks(nx, ny)) { p.dir = d; p.face = d; return; }
        p.dir = d; p.face = d;
        p.acc += 1.0; // tile per 16 frames
        let moved = false;
        while (p.acc >= 1) {
          p.acc -= 1; p.x += DX[d]; p.y += DY[d]; moved = true;
          const n = digBox(p.x, p.y);
          if (n) { p.digging = 6; const cell = Math.floor((p.y + 8) / 16) * 14 + Math.floor((p.x + 8) / 16); if (cell !== p.lastCell && n >= 3) { p.lastCell = cell; addScore(10); } }
        }
        if (moved) { p.moving = true; p.anim++; if (--walkT <= 0) { walkT = 8; const f = WALK_TUNE[walkNote++ % WALK_TUNE.length]; if (f) { A.tone(f, 0.12, { type: 'square', vol: 0.05 }); A.tone(f / 2, 0.12, { type: 'triangle', vol: 0.08 }); } } }
      }
      function detach() { p.harp = null; }
      function pumpSound(s) { A.noise(0.08, { vol: 0.12, freq: 1500 + s * 600, type: 'bandpass' }); A.tone(220 + s * 110, 0.1, { type: 'square', vol: 0.07, slideTo: 330 + s * 140 }); }
      function popEnemy(e, horiz) {
        e.state = 'pop'; e.t = 0;
        let pts = [200, 300, 400, 500][layerOf(e.y)];
        if (e.type === 'fygar' && horiz) pts *= 2;
        addScore(pts); popups.push({ x: e.x + 8, y: e.y + 8, txt: String(pts), t: 70 });
        A.noise(0.3, { vol: 0.3, freq: 3000, slideTo: 200 }); A.tone(900, 0.15, { type: 'square', vol: 0.08, slideTo: 120 });
      }

      // ---------- enemies ----------
      function enemySpeed(e) { return Math.min(1.25, 0.55 + round * 0.05) * (e.flee ? 1.3 : 1); }
      function updateEnemy(e) {
        e.anim++;
        if (e.state === 'pop') { if (++e.t > 18) e.dead = true; return; }
        if (e.state === 'crushed') return;
        if (e.state === 'inflate') {
          const attached = p.harp && p.harp.target === e;
          if (++e.deflT > (attached ? 50 : 30)) { e.deflT = 0; e.inflate--; if (e.inflate <= 0) { e.state = 'walk'; e.inflate = 0; if (attached) p.harp = null; } }
          return;
        }
        if (e.state === 'prep') { if (++e.t >= 36) { e.state = 'fire'; e.t = 0; A.noise(0.6, { vol: 0.2, freq: 900, type: 'bandpass', slideTo: 400 }); } return; }
        if (e.state === 'fire') { if (++e.t >= 50) { e.state = 'walk'; e.fireCool = 150 + Math.floor(Math.random() * 200); } return; }
        if (e.state === 'ghost') {
          e.t++;
          const tx = e.flee ? 0 : p.x, ty = e.flee ? -16 : p.y;
          const dx = tx - e.gx, dy = ty - e.gy, dl = Math.hypot(dx, dy) || 1, sp = 0.5 + round * 0.02;
          e.gx += dx / dl * sp; e.gy += dy / dl * sp; e.face = dx < 0 ? 1 : 3;
          e.x = Math.round(e.gx); e.y = Math.round(e.gy);
          if (e.flee && e.y <= -16) { e.state = 'walk'; e.y = -16; e.x = Math.round(e.x); return; }
          if (e.t > 70) { const sx = Math.round(e.gx / 16) * 16, sy = Math.round(e.gy / 16) * 16; if (Math.abs(sx - e.gx) < 1 && Math.abs(sy - e.gy) < 1 && sy >= 0 && inTunnelAligned(sx, sy)) { e.x = sx; e.y = sy; e.state = 'walk'; e.ghostT = 300 + Math.floor(Math.random() * 500) - round * 15; } }
          return;
        }
        // walking
        if (e.flee && e.y === -16) { e.x -= 1; e.face = 1; if (e.x < -16) { e.dead = true; e.escaped = true; } return; }
        if (e.type === 'fygar' && --e.fireCool <= 0 && e.y >= 0) {
          const pd = p.x - e.x, sameRow = Math.abs(p.y - e.y) < 10;
          if ((sameRow && Math.abs(pd) < 72 && Math.sign(pd) === (e.face === 3 ? 1 : -1)) || Math.random() < 0.004) { e.state = 'prep'; e.t = 0; return; }
          e.fireCool = 20;
        }
        if (--e.ghostT <= 0 || (e.flee && e.anim % 240 === 0)) { e.state = 'ghost'; e.t = 0; e.gx = e.x; e.gy = e.y; e.ghostT = 400; return; }
        e.acc += enemySpeed(e);
        while (e.acc >= 1) {
          e.acc -= 1;
          if (e.x % 16 === 0 && e.y % 16 === 0) {
            const opts = []; for (let d = 0; d < 4; d++) if (enemyCanMove(e, d)) opts.push(d);
            const fwd = opts.filter(d => d !== (e.dir + 2) % 4);
            const tx = e.flee ? 0 : p.x, ty = e.flee ? -16 : p.y;
            if (fwd.length) {
              if (Math.random() < 0.7) { let best = 1e9; for (const d of fwd) { const dd = Math.hypot(e.x + DX[d] * 16 - tx, e.y + DY[d] * 16 - ty); if (dd < best) { best = dd; e.dir = d; } } }
              else if (!fwd.includes(e.dir)) e.dir = fwd[Math.floor(Math.random() * fwd.length)];
            } else if (opts.length) e.dir = opts[0];
          }
          if (enemyCanMove(e, e.dir)) { e.x += DX[e.dir]; e.y += DY[e.dir]; }
          else e.dir = (e.dir + 2) % 4;
          if (e.dir === 1) e.face = 1; else if (e.dir === 3) e.face = 3;
          if (e.flee && e.y === 0 && e.x % 16 === 0) { e.state = 'ghost'; e.t = 0; e.gx = e.x; e.gy = e.y; break; }
        }
      }

      // ---------- rocks ----------
      function belowClear(r) {
        const yb = r.y + 16; if (yb >= 224) return false;
        const row = Math.floor(yb / SUB), c0 = Math.floor(r.x / SUB), c1 = Math.floor((r.x + 15) / SUB);
        let n = 0; for (let c = c0; c <= c1; c++) if (dug[row * SC + c]) n++;
        return n >= 3;
      }
      function updateRocks() {
        for (const r of rocks) {
          if (r.state === 'idle') {
            if (belowClear(r)) {
              const under = Math.abs(p.x - r.x) < 16 && p.y > r.y && p.y - r.y <= 20;
              if (!under) { r.state = 'wobble'; r.t = 0; }
            }
          } else if (r.state === 'wobble') {
            if (++r.t % 10 === 0) A.tone(120, 0.04, { type: 'square', vol: 0.08 });
            if (r.t >= 48) { r.state = 'fall'; r.t = 0; r.hitPlayer = false; A.tone(700, 0.9, { type: 'triangle', vol: 0.09, slideTo: 150 }); }
          } else if (r.state === 'fall') {
            for (let s = 0; s < 2; s++) {
              if (r.y % 4 === 0 && !belowClear(r)) { r.state = 'crumble'; r.t = 0; landRock(r); break; }
              r.y++;
              for (const e of enemies) if (!r.crushed.includes(e) && e.state !== 'pop' && e.state !== 'ghost' && Math.abs(e.x - r.x) < 14 && e.y - r.y < 14 && e.y - r.y > 0) { e.state = 'crushed'; r.crushed.push(e); if (p.harp && p.harp.target === e) p.harp = null; }
              for (const e of r.crushed) e.y = r.y + 6;
              if (state === 'play' && Math.abs(p.x - r.x) < 13 && p.y - r.y < 14 && p.y - r.y > 0) { killPlayer('rock'); r.carry = true; }
              if (r.carry) p.y = r.y + 6;
            }
          } else if (r.state === 'crumble') { if (++r.t >= 36) r.gone = true; }
        }
        rocks = rocks.filter(r => !r.gone);
      }
      function landRock(r) {
        A.noise(0.35, { vol: 0.3, freq: 600, slideTo: 100 });
        rocksDropped++;
        const n = r.crushed.length;
        if (n) { const pts = [0, 1000, 2500, 4000, 6000, 8000, 10000, 12000, 15000][Math.min(n, 8)]; addScore(pts); popups.push({ x: r.x + 8, y: r.y + 8, txt: String(pts), t: 90 }); for (const e of r.crushed) e.dead = true; }
        r.carry = false;
        if (rocksDropped === 2 && !veg) { veg = { kind: Math.min(round - 1, VEG.length - 1), t: 600 }; A.melody([[N.C5, .07], [N.E5, .07], [N.G5, .07], [N.C6, .12]], { type: 'square', vol: 0.08 }); }
      }

      function killPlayer(kind) {
        if (state !== 'play') return;
        state = 'dying'; T = 0; deathKind = kind; p.harp = null;
        A.melody([[N.C6, .12], [N.B4 * 2, .12], [N.A5, .12], [N.G5, .12], [N.F5, .12], [N.E5, .12], [N.D5, .12], [N.C5, .3]], { type: 'square', vol: 0.08 });
      }

      function updatePlay() {
        updatePlayer();
        for (const e of enemies) updateEnemy(e);
        updateRocks();
        enemies = enemies.filter(e => !e.dead);
        if (state !== 'play') return;
        // collisions
        for (const e of enemies) {
          if ((e.state === 'walk' || e.state === 'prep' || e.state === 'fire') && overlap(e, p, 4)) { killPlayer('enemy'); return; }
          if (e.state === 'fire') {
            const len = Math.min(48, 16 * (1 + Math.floor(e.t / 8)));
            const fx0 = e.face === 3 ? e.x + 16 : e.x - len, fx1 = fx0 + len;
            if (p.x + 13 > fx0 && p.x + 3 < fx1 && Math.abs(p.y - e.y) < 10) { killPlayer('fire'); return; }
          }
        }
        // last enemy flees
        const live = enemies.filter(e => e.state !== 'pop');
        if (live.length === 1 && !live[0].flee) { live[0].flee = true; A.melody([[N.A5, .08], [N.E5, .08], [N.A5, .08], [N.E5, .08]], { type: 'square', vol: 0.06 }); }
        if (veg) { if (--veg.t <= 0) veg = null; else if (Math.abs(p.x - 96) < 10 && Math.abs(p.y - 96) < 10) { const pts = VEG_ART[veg.kind][2]; addScore(pts); popups.push({ x: 104, y: 104, txt: String(pts), t: 90 }); veg = null; A.melody([[N.G5, .06], [N.C6, .06], [N.E5 * 2, .1]], { type: 'square', vol: 0.09 }); } }
        for (const q of popups) q.t--; popups = popups.filter(q => q.t > 0);
        if (enemies.length === 0) { state = 'clear'; T = 0; A.melody([[N.G5, .1], [N.E5, .1], [N.G5, .1], [N.C6, .3], [0, .1], [N.A5, .1], [N.C6, .4]], { type: 'square', vol: 0.09 }); }
      }

      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) A.tone(2093, 0.05, { type: 'square', vol: 0.08, slideTo: 2637 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; A.tone(98, 0.28, { type: 'square', vol: 0.14 }); A.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 });
        return false;
      }
      const pushScreen = () => coinOp && api.credits > 0;

      // ---------- attract demo ----------
      let demo = null;
      function newDemo() { demo = { px: -16, py: 0, ex: 230, inf: 0, t: 0, phase: 0, dug: 0 }; }
      newDemo();
      function updateDemo() {
        const d = demo; d.t++;
        if (d.phase === 0) { d.px += 1; d.dug = Math.max(d.dug, d.px + 16); if (d.px >= 70) { d.phase = 1; d.t = 0; } }
        if (d.ex > d.px + 64) d.ex -= 0.7;
        if (d.phase === 1 && d.t > 20) { d.phase = 2; d.t = 0; A.tone(1500, 0.12, { type: 'sawtooth', vol: 0.04, slideTo: 400 }); }
        if (d.phase === 2 && d.ex <= d.px + 66 && d.t % 22 === 0) { d.inf++; pumpSound(d.inf); if (d.inf >= 4) { d.phase = 3; d.t = 0; A.noise(0.3, { vol: 0.2, freq: 3000, slideTo: 200 }); } }
        if (d.phase === 3 && d.t > 150) newDemo();
      }
      function renderDemo(ctx) {
        const d = demo, y0 = 176;
        const pal = PALETTES[0];
        ctx.fillStyle = pal[1]; ctx.fillRect(0, y0 - 8, 224, 32);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = 0; x < 224; x += 8) for (let y = y0 - 8; y < y0 + 24; y += 8) ctx.fillRect(x + ((y >> 3) & 1) * 4, y + 2, 1, 1);
        ctx.fillStyle = '#000'; ctx.fillRect(0, y0, Math.max(0, d.dug), 16); ctx.fillRect(Math.round(d.ex) - 24, y0, 250, 16);
        const fr = (d.t >> 3) & 1;
        if (d.phase < 3 || d.t < 18) {
          if (d.inf === 0) ctx.drawImage(PK[fr][0], Math.round(d.ex), y0);
          else if (d.phase < 3) { const s = INF_FLIP.pooka[d.inf - 1]; ctx.drawImage(s, Math.round(d.ex) + 8 - s.width / 2, y0 + 8 - s.height / 2); }
          else ctx.drawImage(POPS, Math.round(d.ex), y0);
        } else txt(ctx, '200', Math.round(d.ex) - 4, y0 + 4, '#FFFFFF');
        const pump = d.phase === 2 && d.inf > 0;
        ctx.drawImage(SPR[pump ? ((d.t >> 3) & 1 ? 'pump1' : 'pump2') : (fr ? 'walk1' : 'walk2')][3], d.px, y0);
        if (d.phase === 2 && d.phase < 3) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(d.px + 16, y0 + 9, Math.max(0, Math.round(d.ex) - d.px - 14), 1); }
      }
      function renderTitle(ctx) {
        // big logo from the bitmap font, 4x blocks with dirt-coloured shading
        const word = 'DIG DUG', sx = 112 - (word.length * 24 - 4) / 2;
        for (let i = 0; i < word.length; i++) {
          const g = FONT[word[i]]; if (!g) continue;
          for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) {
            const x = sx + i * 24 + c * 4, y = 40 + r * 4;
            ctx.fillStyle = '#882000'; ctx.fillRect(x + 1, y + 1, 4, 4);
            ctx.fillStyle = r < 2 ? '#FFFFFF' : r < 4 ? '#F8B800' : '#E07000'; ctx.fillRect(x, y, 4, 4);
          }
        }
        txt(ctx, 'CREDIT ' + Math.min(99, api.credits), 16, 276, '#FFFFFF');
        if (pushScreen()) {
          txt(ctx, 'PUSH START BUTTON', 44, 112, '#FFFF00');
          txt(ctx, '1 PLAYER ONLY', 60, 136, '#FFFFFF');
          txt(ctx, '1ST BONUS FOR 10000 PTS', 20, 168, '#00FFFF');
          txt(ctx, '2ND BONUS FOR 40000 PTS', 20, 184, '#00FFFF');
          txt(ctx, 'AND FOR EVERY 40000 PTS', 20, 200, '#00FFFF');
          txt(ctx, '© 1982 NAMCO LTD.', 44, 240, '#FFFFFF');
          return;
        }
        txt(ctx, '© 1982 NAMCO LTD.', 44, 80, '#FFFFFF');
        ctx.drawImage(PK[(T >> 4) & 1][1], 40, 100); txt(ctx, 'POOKA', 64, 104, '#FF6040');
        ctx.drawImage(FG[(T >> 4) & 1][1], 120, 100); txt(ctx, 'FYGAR', 144, 104, '#40FF40');
        ctx.drawImage(ROCKS, 40, 124); txt(ctx, 'ROCK', 64, 128, '#F8B800');
        ctx.drawImage(VEG[0], 120, 124); txt(ctx, 'BONUS', 144, 128, '#FF8C00');
        txt(ctx, 'PUMP THEM UP!', 60, 150, '#FFFFFF');
        renderDemo(ctx);
        txt(ctx, '1ST BONUS 10000 PTS', 36, 222, '#00FFFF');
        txt(ctx, 'AND EVERY 40000 PTS', 36, 234, '#00FFFF');
        if (api.credits === 0) { if (coinFlash > 0 || ((T >> 5) & 1)) txt(ctx, 'INSERT COIN', 68, 256, coinFlash > 0 && ((api.frame >> 2) & 1) ? '#FF4040' : '#FFFF00'); }
        else if ((T >> 5) & 1) txt(ctx, 'PUSH START BUTTON', 44, 256, '#FFFF00');
      }

      // ---------- update ----------
      function update() {
        T++; pollCoins(); if (coinFlash > 0) coinFlash--;
        switch (state) {
          case 'title': if (!pushScreen()) updateDemo(); if (api.anyPressed('Enter', 'Space') && tryStart()) startGame(); break;
          case 'ready': if (T >= 150) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (deathKind === 'rock') updateRocks();
            if (T >= 150) {
              const gameOver = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
              const respawn = () => { rocks = rocks.filter(r => r.state === 'idle'); const remaining = enemies.filter(e => e.state !== 'pop' && e.state !== 'crushed').length; spawnInfo = spawnInfo.slice(0, remaining); spawnActors(); state = 'ready'; T = 60; };
              if (lives <= 0) {
                if (api.offerContinue) api.offerContinue(() => { lives = 2; respawn(); }, gameOver);
                else gameOver();
              }
              else { lives--; respawn(); }
            }
            break;
          case 'clear': if (T >= 150) { round++; genRound(); spawnActors(); state = 'ready'; T = 0; jingleStart(); } break;
          case 'gameover': if (T >= 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; newDemo(); } break;
        }
      }

      // ---------- render ----------
      function drawEnemy(ctx, e) {
        const sx = e.x, sy = e.y + FY0, fr = (e.anim >> 3) & 1, fi = e.face === 3 ? 1 : 0;
        if (e.state === 'pop') { ctx.drawImage(POPS, sx, sy); return; }
        if (e.state === 'crushed') { ctx.drawImage(e.type === 'pooka' ? PKF : FGF, sx, sy); return; }
        if (e.state === 'ghost') { ctx.drawImage((e.type === 'pooka' ? PKG : FGG)[fi], sx, sy); return; }
        if (e.state === 'inflate') { const s = (fi ? INF : INF_FLIP)[e.type][Math.min(3, e.inflate) - 1]; ctx.drawImage(s, sx + 8 - s.width / 2, sy + 8 - s.height / 2); return; }
        if (e.type === 'pooka') { ctx.drawImage(PK[fr][fi], sx, sy); return; }
        if (e.state === 'prep') { ctx.drawImage(((e.t >> 2) & 1 ? FGW : FG)[0][fi], sx, sy); return; }
        ctx.drawImage(FG[e.state === 'fire' ? 0 : fr][fi], sx, sy);
        if (e.state === 'fire') {
          const len = Math.min(48, 16 * (1 + Math.floor(e.t / 8))), f = (e.anim >> 2) & 1;
          if (e.face === 3) ctx.drawImage(FLAME[f], 0, 0, len, 16, sx + 14, sy, len, 16);
          else ctx.drawImage(FLAME_L[f], 48 - len, 0, len, 16, sx + 2 - len, sy, len, 16);
        }
      }
      function drawPlayer(ctx) {
        const sx = p.x, sy = p.y + FY0;
        if (state === 'dying') {
          if (deathKind === 'rock') { ctx.drawImage(DIE[2], sx, sy); return; }
          const k = T < 30 ? -1 : Math.floor((T - 30) / 20);
          if (k < 0) ctx.drawImage(SPR.walk1[p.face], sx, sy);
          else if (k < 3) ctx.drawImage(DIE[k], sx, sy);
          else if (k < 4) { ctx.fillStyle = '#FFFFFF'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + T * 0.1; ctx.fillRect(Math.round(sx + 8 + Math.cos(a) * (k * 3)), Math.round(sy + 12 + Math.sin(a) * (k * 2)), 1, 1); } }
          return;
        }
        let key = p.moving ? (((p.anim >> 3) & 1) ? 'walk1' : 'walk2') : 'walk1';
        if (p.harp) key = (p.harp.state === 'attached' && p.pumpAnim > 4) ? 'pump2' : 'pump1';
        ctx.drawImage(SPR[key][p.face], sx, sy);
        if (p.harp) {
          const h = p.harp, cx = sx + 8, cy = sy + 8, L = h.len + 6;
          ctx.fillStyle = '#FFFFFF';
          if (h.dir === 3) ctx.fillRect(cx + 6, cy, L - 4, 1); else if (h.dir === 1) ctx.fillRect(cx - 2 - L, cy, L - 4, 1);
          else if (h.dir === 0) ctx.fillRect(cx, cy - 2 - L, 1, L - 4); else ctx.fillRect(cx, cy + 6, 1, L - 4);
          const tx = cx + DX[h.dir] * (L + 2), ty = cy + DY[h.dir] * (L + 2);
          ctx.fillStyle = '#B8B8B8'; ctx.fillRect(tx - 1, ty - 1, 3, 3); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(tx, ty, 1, 1);
        }
      }
      function drawHUD(ctx) {
        txt(ctx, '1UP', 16, 0, '#FF4040');
        const s = String(score); txt(ctx, s, 56 - s.length * 8 + 8, 8, '#FFFFFF');
        txt(ctx, 'HI-SCORE', 96, 0, '#FF4040');
        const h = String(hi); txt(ctx, h, 168 - h.length * 8, 8, '#FFFFFF');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawHUD(ctx); renderTitle(ctx); return; }
        // sky & surface flowers (one per round, big flower = 10 rounds)
        ctx.fillStyle = '#1828C8'; ctx.fillRect(0, 16, 224, 32);
        let fx = 208; const big = Math.floor(round / 10), small = round % 10;
        for (let i = 0; i < small; i++) { ctx.drawImage(FLW, fx, 40); fx -= 8; }
        for (let i = 0; i < big; i++) { fx -= 6; ctx.drawImage(BFLW, fx, 36); fx -= 8; }
        ctx.fillStyle = '#000'; ctx.fillRect(96, 40, 16, 8);
        ctx.drawImage(dirt, 0, FY0);
        if (veg) ctx.drawImage(VEG[veg.kind], 96, 96 + FY0);
        for (const r of rocks) {
          const wob = r.state === 'wobble' ? ((r.t >> 2) & 1 ? 1 : -1) : 0;
          if (r.state === 'crumble') ctx.drawImage(CRUMB[r.t < 18 ? 0 : 1], r.x, r.y + FY0);
          else ctx.drawImage(ROCKS, r.x + wob, r.y + FY0);
        }
        const under = p.harp && p.harp.state === 'attached';
        if (under && state !== 'gameover') drawPlayer(ctx);
        for (const e of enemies) drawEnemy(ctx, e);
        if (!under && state !== 'gameover') drawPlayer(ctx);
        for (const q of popups) txt(ctx, q.txt, Math.round(q.x - q.txt.length * 4), Math.round(q.y + FY0 - 4 - (90 - q.t) * 0.1), '#FFFFFF');
        // bottom bar
        for (let i = 0; i < Math.min(lives, 6); i++) ctx.drawImage(SPR.walk1[3], 4 + i * 18, 272);
        txt(ctx, 'ROUND', 136, 276, '#FFFFFF'); txt(ctx, String(round), 184, 276, '#FFFFFF');
        if (state === 'ready') { txt(ctx, 'PLAYER 1', 80, 128 + FY0 - 24, '#FFFFFF'); txt(ctx, 'ROUND ' + round, 84 - (round > 9 ? 4 : 0), 128 + FY0 - 8, '#FFFFFF'); }
        if (state === 'clear' && T > 30) txt(ctx, 'ROUND CLEAR!', 64, 120, '#FFFF00');
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(68, 132, 88, 16); txt(ctx, 'GAME OVER', 76, 136, '#FF4040'); }
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, lives, round, enemies: enemies.length }), set: o => { if ('lives' in o) lives = o.lives; if ('score' in o) score = o.score; }, kill: () => killPlayer('enemy') });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
