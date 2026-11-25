// Mr. Do! (Universal, 1982) \u2014 procedural recreation for the MAME32 Game Room.
// Dig through the garden, eat the cherries, drop apples on the creeps, bounce the power ball,
// and spell EXTRA by beating the Alphamonsters.
(function () {
  'use strict';
  const W = 192, H = 240, FY = 24, FW = 192, FH = 192, CELL = 16, NC = 12, NR = 12, MW = 48, MH = 48;

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
  const flipV = rows => rows.slice().reverse();

  // ================= Sprites =================
  const PAL = { W: '#ffffff', R: '#ff2020', B: '#2050ff', b: '#80a0ff', Y: '#ffe000', S: '#ffc8a0', K: '#000000', G: '#20c020', g: '#106010', O: '#ff9000', P: '#ff70c0', N: '#904010', C: '#00e0ff' };
  // Mr. Do, facing right (16x16) - a clown with a pom-pom hat
  const DO_ART = [
    ['......WW........', '.....RRRRW......', '....RRRRRR......', '...RRRRRRRR.....', '...WWWWWWWWW....', '...WSSSSSKSW....', '...SSSSSSSSRR...', '...SSSSSSSSRR...',
      '....SSKKKSS.....', '...BBBBBBBB.....', '..BBYBBBBBBWW...', '..BBBBBBBBBWW...', '...BBBBBBBB.....', '...BB....BB.....', '..RRR....RRR....', '................'],
    ['......WW........', '.....RRRRW......', '....RRRRRR......', '...RRRRRRRR.....', '...WWWWWWWWW....', '...WSSSSSKSW....', '...SSSSSSSSRR...', '...SSSSSSSSRR...',
      '....SSKKKSS.....', '...BBBBBBBB.....', '..BBYBBBBBBWW...', '..BBBBBBBBBWW...', '...BBBBBBBB.....', '....BB.BB.......', '....RRRRRR......', '................']];
  const DO_UP = [
    ['.......WW.......', '......RRRR......', '.....RRRRRR.....', '....RRRRRRRR....', '....WWWWWWWW....', '....SSSSSSSS....', '....SSSSSSSS....', '.....SSSSSS.....',
      '..WW.BBBBBB.WW..', '..WBBBBBBBBBBW..', '...BBBBBBBBBB...', '....BBBBBBBB....', '....BBBBBBBB....', '....BB....BB....', '...RRR....RRR...', '................'],
    ['.......WW.......', '......RRRR......', '.....RRRRRR.....', '....RRRRRRRR....', '....WWWWWWWW....', '....SSSSSSSS....', '....SSSSSSSS....', '.....SSSSSS.....',
      '..WW.BBBBBB.WW..', '..WBBBBBBBBBBW..', '...BBBBBBBBBB...', '....BBBBBBBB....', '....BBBBBBBB....', '.....BB..BB.....', '.....RRRRRR.....', '................']];
  const DO_DOWN = [
    ['.......WW.......', '......RRRR......', '.....RRRRRR.....', '....RRRRRRRR....', '....WWWWWWWW....', '....SKSSSSKS....', '....SSSRRSSS....', '.....SSRRSS.....',
      '..WW.SKKKKS.WW..', '..WBBBBBBBBBBW..', '...BBBYBBYBBB...', '....BBBBBBBB....', '....BBBBBBBB....', '....BB....BB....', '...RRR....RRR...', '................'],
    ['.......WW.......', '......RRRR......', '.....RRRRRR.....', '....RRRRRRRR....', '....WWWWWWWW....', '....SKSSSSKS....', '....SSSRRSSS....', '.....SSRRSS.....',
      '..WW.SKKKKS.WW..', '..WBBBBBBBBBBW..', '...BBBYBBYBBB...', '....BBBBBBBB....', '....BBBBBBBB....', '.....BB..BB.....', '.....RRRRRR.....', '................']];
  // creep (red dinosaur-ish monster), facing right
  const CREEP = [
    ['................', '.....RRRRR......', '....RRRRRRR.....', '...RRWWRWWRR....', '...RRWKRWKRR....', '..RRRRRRRRRRR...', '..RRRRRRRRRRRR..', '..RRYYYYYYYRRR..',
      '..RRRYYYYYRRR...', '...RRRRRRRRR....', '..RRRRRRRRRRR...', '.RRR.RRRRR.RR...', '.....RR..RR.....', '....RRR..RRR....', '................', '................'],
    ['................', '.....RRRRR......', '....RRRRRRR.....', '...RRWWRWWRR....', '...RRWKRWKRR....', '..RRRRRRRRRRR...', '..RRRRRRRRRRRR..', '..RRRRRRRRRRRR..',
      '..RRRYYYYYRRR...', '...RRRRRRRRR....', '..RRRRRRRRRRR...', '.RR.RRRRRRR.RR..', '......RRRR......', '.....RRRRRR.....', '................', '................']];
  const DIGGER = [
    ['................', '....BBBBBBB.....', '...BBBBBBBBB....', '..BBWWBBBWWBB...', '..BBWKBBBWKBB...', '..BBBBBBBBBBBB..', '.BBBWWWWWWWWBB..', '.BBW.........W..',
      '.BBW.........W..', '.BBBWWWWWWWWBB..', '..BBBBBBBBBBB...', '...BBBBBBBBB....', '...BB.....BB....', '..BBB.....BBB...', '................', '................'],
    ['................', '....BBBBBBB.....', '...BBBBBBBBB....', '..BBWWBBBWWBB...', '..BBWKBBBWKBB...', '..BBBBBBBBBBBB..', '.BBBWWWWWWWWBB..', '.BBBBBBBBBBBBB..',
      '.BBBWWWWWWWWBB..', '..BBBBBBBBBBB...', '..BBBBBBBBBBB...', '...BBBBBBBBB....', '....BB...BB.....', '...BBB...BBB....', '................', '................']];
  const DRONE_PAL = { ...PAL, R: '#40a0ff', Y: '#ffffff' };
  const APPLE = ['.......g........', '......g.GG......', '....RRgRRGG.....', '...RRRRRRRRR....', '..RRWRRRRRRRR...', '..RWWRRRRRRRR...', '..RRWRRRRRRRR...', '..RRRRRRRRRRR...',
    '..RRRRRRRRRRR...', '..RRRRRRRRRRR...', '...RRRRRRRRR....', '....RRRRRRR.....', '.....RR.RR......', '................', '................', '................'];
  const APPLE_BROKEN = ['................', '................', '................', '................', '................', '................', '................', '................',
    '................', '..R..........R..', '.RRR.......RRR..', '.RWRR.....RRRR..', '.RRRRR...RRRRR..', '..RRRRR.RRRRR...', '................', '................'];
  const CHERRY = ['........gg......', '......gg.g......', '.....g....g.....', '....g......g....', '...g........g...', '..RRR......RRR..', '.RWRRR....RWRRR.', '.RRRRR....RRRRR.',
    '.RRRRR....RRRRR.', '..RRR......RRR..', '................', '................', '................', '................', '................', '................'];
  const FOODS = [
    ['................', '................', '.......R........', '......WWW.......', '....PPPPPPP.....', '...PPPPPPPPP....', '...WWWWWWWWW....', '...YYYYYYYYY....', '...NNNNNNNNN....', '...WWWWWWWWW....', '...NNNNNNNNN....', '..WWWWWWWWWWW...', '................', '................', '................', '................'],
    ['................', '................', '.....GG.........', '....RRRRRR......', '...RRRWRRRR.....', '...RRWRRRRR.....', '...RRRRRRRR.....', '....RRRRRR......', '......YY........', '.....YYYY.......', '.....YYYY.......', '......YY........', '................', '................', '................', '................'],
    ['................', '.......Y........', '......YYY.......', '.....YYOYY......', '....YYYYOYY.....', '...YYOYYYYYY....', '..YYYYYYOYYYY...', '..NNNNNNNNNNN...', '...NNNNNNNNN....', '....NNNNNNN.....', '................', '................', '................', '................', '................', '................']];

  // ================= Field layouts (12x12) =================
  // '.' dirt  ' ' tunnel  'c' cherry  'a' apple  'D' monster den  'S' Mr. Do's start
  const LAYOUTS = [
    ['...a......a.', '.cccc..cccc.', '.cccc..cccc.', '......a.....', '.a..........', '...  D  ....', '..... ....a.', '.cccc ..cccc', '.cccc .acccc', '..a.. ...a..', '..... ......', '     S      '],
    ['cccc..a.cccc', 'cccc....cccc', '..a......a..', '....a..a....', '............', '     D...   ', '.a..........', '....cccc....', '....cccc..a.', '............', '............', '     S      '],
    ['......a.....', '.cccc.cccc..', '.cccc.cccc..', '...a....a...', '..... ......', '  a  D      ', '..... ......', '.a... ..cccc', '..... a.cccc', 'cccc. ......', 'cccc. ......', '     S      ']
  ];
  const DIRT = [['#e08020', '#a04010', '#ffb040'], ['#20a0c0', '#106070', '#80e0f0'], ['#c040a0', '#702060', '#ff90e0'], ['#80a020', '#405010', '#d0f060']];
  const LETTERS = 'EXTRA';
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];

  ArcadeRegistry.register({
    id: 'mrdo', title: 'Mr. Do!', year: 1982, maker: 'Universal',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move / dig \u00b7 Space or X: power ball \u00b7 Enter: start',
    marquee: { bg: '#200040', fg: '#ff3030', accent: '#ffe000' },
    create(api) {
      const A = api.audio;
      const DO_R = DO_ART.map(r => spr(r, PAL)), DO_L = DO_ART.map(r => spr(flipH(r), PAL));
      const DO_U = DO_UP.map(r => spr(r, PAL)), DO_D = DO_DOWN.map(r => spr(r, PAL));
      const CR_R = CREEP.map(r => spr(r, PAL)), CR_L = CREEP.map(r => spr(flipH(r), PAL));
      const DR_R = CREEP.map(r => spr(r, DRONE_PAL)), DR_L = CREEP.map(r => spr(flipH(r), DRONE_PAL));
      const DG_R = DIGGER.map(r => spr(r, PAL)), DG_L = DIGGER.map(r => spr(flipH(r), PAL));
      const FROZEN = spr(CREEP[0], { ...PAL, R: '#c0c0ff', Y: '#ffffff' });
      const APPLE_S = spr(APPLE, PAL), APPLE_B = spr(APPLE_BROKEN, PAL), CHERRY_S = spr(CHERRY, PAL);
      const FOOD_S = FOODS.map(f => spr(f, PAL));

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, page = 0, demo = false, coinFlash = 0;
      let score = 0, lives = 3, level = 1, extra = [0, 0, 0, 0, 0], alphaAt = 5000;
      const mask = new Uint8Array(MW * MH);
      let fieldCv = mk(FW, FH), fctx = fieldCv.getContext('2d');
      let cherries, cherriesLeft, apples, monsters, mdo, ball, pops, released, toRelease, killedNormal, relT, den, freezeT, streak, streakT, ballUses, digSnd = 0, musicT = 0, musicI = 0;
      let demoAI = { d: 3, t: 0 };

      // ---------- sound ----------
      const snd = {
        cherry() { A.tone(1200, 0.04, { type: 'square', vol: 0.09 }); A.tone(1600, 0.05, { type: 'square', vol: 0.07, delay: 0.04 }); },
        streak() { A.melody([[1047, 0.05], [1319, 0.05], [1568, 0.05], [2093, 0.12]], { type: 'square', vol: 0.12 }); },
        ball() { A.tone(1400, 0.1, { type: 'square', vol: 0.08, slideTo: 2600 }); },
        bounce() { A.tone(2200, 0.015, { type: 'square', vol: 0.04 }); },
        kill() { A.tone(700, 0.2, { type: 'sawtooth', vol: 0.12, slideTo: 150 }); },
        wobble() { A.tone(180, 0.05, { type: 'triangle', vol: 0.1 }); },
        fall() { A.tone(900, 0.4, { type: 'square', vol: 0.07, slideTo: 200 }); },
        crash() { A.noise(0.2, { vol: 0.2, freq: 500 }); },
        letter() { A.melody([[880, 0.07], [1175, 0.07], [1760, 0.15]], { type: 'square', vol: 0.12 }); },
        food() { A.melody([[659, 0.08], [784, 0.08], [988, 0.08], [1319, 0.2]], { type: 'square', vol: 0.12 }); },
        death() { A.melody([[784, 0.15], [659, 0.15], [523, 0.15], [392, 0.15], [330, 0.15], [262, 0.4]], { type: 'square', vol: 0.12 }); },
        clear() { A.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.16], [0, 0.04], [988, 0.08], [1047, 0.08], [1175, 0.08], [1319, 0.3]], { type: 'square', vol: 0.12 }); },
        start() {
          const m = [[523, 0.12], [587, 0.12], [659, 0.12], [523, 0.12], [784, 0.24], [659, 0.12], [784, 0.36], [0, 0.06], [880, 0.12], [784, 0.12], [659, 0.12], [587, 0.12], [523, 0.36]];
          A.melody(m, { type: 'square', vol: 0.1 }); A.melody(m.map(([f, d]) => [f / 2, d]), { type: 'triangle', vol: 0.12 });
        },
        noCoin() { A.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
      };
      const TUNE = [523, 0, 659, 0, 784, 659, 523, 0, 587, 0, 698, 0, 880, 698, 587, 0, 659, 0, 784, 0, 988, 784, 659, 0, 587, 659, 698, 659, 587, 0, 494, 0];
      function music(moving) {
        if (demo || !moving) return;
        if (++musicT >= 8) {
          musicT = 0; const f = TUNE[musicI++ % TUNE.length];
          if (f) { A.tone(f, 0.1, { type: 'square', vol: 0.035 }); A.tone(f / 4, 0.1, { type: 'triangle', vol: 0.07 }); }
        }
      }

      // ---------- dirt / tunnels ----------
      const dugAt = (px, py) => px >= 0 && py >= 0 && px < FW && py < FH && mask[(py >> 2) * MW + (px >> 2)] === 1;
      function dig(x, y) {
        let n = 0;
        const c0 = Math.max(0, x >> 2), c1 = Math.min(MW - 1, (x + 15) >> 2), r0 = Math.max(0, y >> 2), r1 = Math.min(MH - 1, (y + 15) >> 2);
        fctx.fillStyle = '#000000';
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
          const i = r * MW + c;
          if (!mask[i]) { mask[i] = 1; n++; fctx.fillRect(c * 4, r * 4, 4, 4); }
        }
        return n;
      }
      function boxDug(x, y) {
        const c0 = (x + 1) >> 2, c1 = (x + 14) >> 2, r0 = (y + 1) >> 2, r1 = (y + 14) >> 2;
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!mask[r * MW + c]) return false;
        return true;
      }
      function paintDirt() {
        const pal = DIRT[(level - 1) % DIRT.length];
        fctx.fillStyle = pal[0]; fctx.fillRect(0, 0, FW, FH);
        for (let y = 0; y < FH; y += 4) for (let x = 0; x < FW; x += 4) {
          const h = (x * 7 + y * 13 + ((x * y) >> 3)) % 11;
          if (h === 0) { fctx.fillStyle = pal[1]; fctx.fillRect(x + 1, y + 1, 2, 1); }
          else if (h === 5) { fctx.fillStyle = pal[2]; fctx.fillRect(x + 2, y, 1, 1); }
        }
        fctx.fillStyle = '#000000';
        for (let i = 0; i < mask.length; i++) if (mask[i]) fctx.fillRect((i % MW) * 4, ((i / MW) | 0) * 4, 4, 4);
      }

      // ---------- setup ----------
      function initLevel() {
        const lay = LAYOUTS[(level - 1) % LAYOUTS.length];
        mask.fill(0);
        cherries = new Uint8Array(NC * NR); cherriesLeft = 0; apples = [];
        for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
          const ch = lay[r][c], x = c * CELL, y = r * CELL;
          if (ch === ' ' || ch === 'D' || ch === 'S') for (let yy = y >> 2; yy < (y + 16) >> 2; yy++) for (let xx = x >> 2; xx < (x + 16) >> 2; xx++) mask[yy * MW + xx] = 1;
          if (ch === 'c') { cherries[r * NC + c] = 1; cherriesLeft++; }
          if (ch === 'a') apples.push({ x, y, state: 'rest', t: 0, sy: y, carried: [] });
          if (ch === 'D') den = { x, y };
        }
        paintDirt();
        toRelease = Math.min(10, 5 + level);
        released = 0; killedNormal = 0;
        resetActors();
      }
      function resetActors() {
        mdo = { x: 5 * CELL, y: 11 * CELL, dir: 3, face: 3, acc: 0, anim: 0, moving: false, slow: false };
        dig(mdo.x, mdo.y);
        monsters = []; pops = [];
        ball = { st: 'held', x: 0, y: 0, vx: 0, vy: 0, t: 0 };
        relT = 90; freezeT = 0; streak = 0; streakT = 0; ballUses = 0;
        den.food = false;
      }
      function startGame(isDemo) {
        demo = isDemo; score = 0; lives = 3; level = 1; extra = [0, 0, 0, 0, 0]; alphaAt = 5000;
        initLevel(); state = 'ready'; T = 0;
        if (!demo) snd.start();
      }
      function addScore(n, x, y) {
        if (demo) return;
        score += n;
        if (x != null) pops.push({ x, y, v: n, t: 60 });
        if (score > hi) hi = score;
        if (score >= alphaAt) { alphaAt += 5000; spawnAlpha(false); }
      }

      // ---------- monsters ----------
      function mSpeed(m) {
        const base = Math.min(1.25, 0.72 + level * 0.06);
        if (m.type === 'digger') return base * 0.62;
        if (m.type === 'alpha') return base * 0.9;
        if (m.type === 'drone') return base * 1.05;
        return base;
      }
      function spawnAlpha(withDrones) {
        if (monsters.some(m => m.type === 'alpha')) return;
        const x = 5 * CELL, y = 0;
        dig(x, y);
        monsters.push({ type: 'alpha', x, y, dir: 2, acc: 0, anim: 0, t: 0, letter: 0, state: 'walk' });
        if (withDrones) for (let i = 0; i < 3; i++) monsters.push({ type: 'drone', x, y, dir: 2, acc: -i * 40, anim: 0, t: 0, state: 'walk' });
      }
      function appleAt(x, y, except) {
        for (const a of apples) if (a !== except && a.state !== 'gone' && Math.abs(a.x - x) < 14 && Math.abs(a.y - y) < 14) return a;
        return null;
      }
      function monsterPassable(m, nx, ny) {
        if (nx < 0 || ny < 0 || nx > FW - 16 || ny > FH - 16) return false;
        if (m.type === 'alpha') return m.digT > 0 || boxDug(nx, ny);
        if (appleAt(nx, ny)) return false;
        if (m.type === 'digger') return true;
        return boxDug(nx, ny);
      }
      function chooseDir(m) {
        const opts = [];
        for (let d = 0; d < 4; d++) if (monsterPassable(m, m.x + DX[d], m.y + DY[d])) opts.push(d);
        if (!opts.length) return -1;
        let o2 = opts.filter(d => d !== (m.dir ^ 2)); if (!o2.length) o2 = opts;
        const chase = m.type === 'digger' ? 0.95 : m.type === 'alpha' ? 0.55 : 0.72;
        if (Math.random() > chase) return o2[Math.random() * o2.length | 0];
        let best = o2[0], bs = 1e9;
        for (const d of o2) {
          const s = Math.abs(m.x + DX[d] * 16 - mdo.x) + Math.abs(m.y + DY[d] * 16 - mdo.y) + Math.random() * 6;
          if (s < bs) { bs = s; best = d; }
        }
        return best;
      }
      function moveMonster(m) {
        m.acc += mSpeed(m);
        while (m.acc >= 1) {
          m.acc -= 1;
          const aligned = (m.x & 15) === 0 && (m.y & 15) === 0;
          if (aligned) {
            const d = chooseDir(m);
            if (d < 0) {
              // boxed in: normal creeps turn into diggers to get out
              if (m.type === 'normal' || m.type === 'drone') { m.type2 = m.type; m.type = 'digger'; m.t = 120 + (Math.random() * 120 | 0); }
              else if (m.type === 'alpha') m.digT = 48;
              break;
            }
            m.dir = d;
          }
          const nx = m.x + DX[m.dir], ny = m.y + DY[m.dir];
          if (!monsterPassable(m, nx, ny)) { m.dir ^= 2; break; }
          m.x = nx; m.y = ny;
          if (m.type === 'digger') dig(m.x, m.y);
          if (m.digT > 0) { m.digT--; dig(m.x, m.y); }
          if (m.type === 'alpha') { const a = appleAt(m.x, m.y); if (a && a.state === 'rest') { a.state = 'gone'; A.tone(300, 0.1, { type: 'square', vol: 0.08 }); } }
        }
        m.anim++;
        if (m.type === 'digger' && --m.t <= 0 && (m.x & 15) === 0 && (m.y & 15) === 0) m.type = m.type2 || 'normal';
      }
      function killMonster(m, pts, how) {
        if (m.state === 'dead') return;
        m.state = 'dead';
        if (m.type === 'alpha') {
          const i = currentLetter();
          if (i >= 0 && !demo) { extra[i] = 1; snd.letter(); }
          addScore(how === 'ball' ? 500 : pts, m.x + 8, m.y + FY - 6);
        } else {
          if (m.type === 'normal' || m.type2 === 'normal') killedNormal++;
          addScore(pts, m.x + 8, m.y + FY - 6);
          snd.kill();
        }
      }
      function currentLetter() {
        const left = []; for (let i = 0; i < 5; i++) if (!extra[i]) left.push(i);
        if (!left.length) return -1;
        return left[((T / 50) | 0) % left.length];
      }

      // ---------- input ----------
      function readInput() {
        if (demo) {
          if (--demoAI.t <= 0) { demoAI.t = 30 + (Math.random() * 80 | 0); demoAI.d = Math.random() * 4 | 0; }
          return { d: demoAI.d, fire: Math.random() < 0.01 };
        }
        let d = -1;
        if (api.key('ArrowUp')) d = 0; else if (api.key('ArrowDown')) d = 2; else if (api.key('ArrowLeft')) d = 1; else if (api.key('ArrowRight')) d = 3;
        return { d, fire: api.anyPressed('Space', 'KeyX', 'KeyZ') };
      }

      // ---------- Mr. Do ----------
      function doStep(want) {
        const p = mdo;
        let d = want;
        if ((want === 1 || want === 3) && (p.y & 15)) d = (p.y & 15) < 8 ? 0 : 2;
        else if ((want === 0 || want === 2) && (p.x & 15)) d = (p.x & 15) < 8 ? 1 : 3;
        const nx = p.x + DX[d], ny = p.y + DY[d];
        if (nx < 0 || ny < 0 || nx > FW - 16 || ny > FH - 16) return false;
        const a = appleAt(nx, ny);
        if (a) {
          if (a.state !== 'rest' || d === 0 || d === 2) return false;
          const ax = a.x + DX[d];
          if (ax < 0 || ax > FW - 16 || appleAt(ax, a.y, a)) return false;
          a.x = ax;
        }
        p.x = nx; p.y = ny; p.dir = d;
        if (d === 1 || d === 3) p.face = d;
        const n = dig(p.x, p.y);
        p.slow = n > 0;
        if (n > 0 && (++digSnd & 3) === 0) A.noise(0.03, { vol: 0.05, freq: 900 });
        return true;
      }
      function updateDo(inp) {
        const p = mdo;
        p.moving = false;
        if (inp.d < 0) { p.acc = 0; return; }
        p.acc += p.slow ? 0.82 : 1.1;
        while (p.acc >= 1) { p.acc -= 1; if (!doStep(inp.d)) break; p.moving = true; }
        if (p.moving) p.anim++;
        // eat cherries
        const cx = (p.x + 8) >> 4, cy = (p.y + 8) >> 4, ci = cy * NC + cx;
        if (cherries[ci] && Math.abs(p.x - cx * 16) < 8 && Math.abs(p.y - cy * 16) < 8) {
          cherries[ci] = 0; cherriesLeft--; snd.cherry(); addScore(50);
          if (T - streakT < 40) streak++; else streak = 1;
          streakT = T;
          if (streak >= 8) { streak = 0; snd.streak(); addScore(500, p.x + 8, p.y + FY - 6); }
        }
        // center food
        if (den.food && Math.abs(p.x - den.x) < 10 && Math.abs(p.y - den.y) < 10) {
          den.food = false;
          const v = Math.min(8000, 1000 * level);
          addScore(v, den.x + 8, den.y + FY - 6); snd.food();
          freezeT = 600;
          for (const m of monsters) if (m.type === 'normal' || m.type === 'digger') m.frozen = true;
          spawnAlpha(true);
        }
      }
      function throwBall() {
        if (ball.st !== 'held') return;
        const p = mdo, f = p.face;
        let vx = f === 1 ? -1 : 1, vy = -1;
        if (p.dir === 2) vy = 1;
        ball = { st: 'fly', x: p.x + 8, y: p.y + 8, vx, vy, t: 300 };
        snd.ball();
      }
      function updateBall() {
        if (ball.st === 'recharge') { if (--ball.t <= 0) { ball.st = 'held'; A.tone(1800, 0.05, { type: 'sine', vol: 0.06 }); } return; }
        if (ball.st !== 'fly') return;
        for (let s = 0; s < 3; s++) {
          const nx = ball.x + ball.vx;
          if (!dugAt(nx + ball.vx * 2, ball.y)) { ball.vx = -ball.vx; snd.bounce(); } else ball.x = nx;
          const ny = ball.y + ball.vy;
          if (!dugAt(ball.x, ny + ball.vy * 2)) { ball.vy = -ball.vy; snd.bounce(); } else ball.y = ny;
          for (const m of monsters) {
            if (m.state === 'dead') continue;
            if (ball.x >= m.x + 1 && ball.x <= m.x + 15 && ball.y >= m.y + 1 && ball.y <= m.y + 15) {
              killMonster(m, 500, 'ball');
              ballUses++;
              ball = { st: 'recharge', t: Math.min(420, 60 + ballUses * 45) };
              return;
            }
          }
        }
        if (--ball.t <= 0) { ball.st = 'recharge'; ball.t = 30; }
      }

      // ---------- apples ----------
      function belowDug(a) {
        const yy = a.y + 16; if (yy >= FH) return false;
        const r = yy >> 2; const c0 = (a.x + 2) >> 2, c1 = (a.x + 13) >> 2;
        for (let c = c0; c <= c1; c++) if (!mask[r * MW + c]) return false;
        return true;
      }
      function updateApples() {
        for (const a of apples) {
          if (a.state === 'gone') continue;
          if (a.state === 'rest') {
            if (belowDug(a) && !appleAt(a.x, a.y + 16, a)) {
              const under = Math.abs(mdo.x - a.x) < 14 && mdo.y >= a.y + 8 && mdo.y < a.y + 20;
              if (under) { if ((T & 15) === 0) a.wob = 8; continue; }
              a.state = 'wobble'; a.t = 36; snd.wobble();
            }
          } else if (a.state === 'wobble') {
            if (--a.t <= 0) { a.state = 'fall'; a.sy = a.y; a.carried = []; snd.fall(); }
          } else if (a.state === 'fall') {
            for (let s = 0; s < 2; s++) {
              if ((a.y & 3) === 0 && (!belowDug(a) || appleAt(a.x, a.y + 16, a))) { land(a); break; }
              a.y++;
            }
            if (a.state !== 'fall') continue;
            for (const m of monsters) {
              if (m.state === 'dead' || m.carried) continue;
              if (Math.abs(m.x - a.x) < 12 && m.y > a.y && m.y < a.y + 16) { m.carried = a; a.carried.push(m); }
            }
            for (const m of a.carried) { m.y = Math.min(FH - 16, a.y + 10); }
            if (state === 'play' && Math.abs(mdo.x - a.x) < 12 && mdo.y > a.y + 2 && mdo.y < a.y + 14) { mdo.squashed = true; die(); }
          } else if (a.state === 'broken') {
            if (--a.t <= 0) a.state = 'gone';
          }
        }
      }
      function land(a) {
        const dist = a.y - a.sy;
        snd.crash();
        const n = a.carried.length;
        a.carried.forEach((m, i) => { m.carried = null; killMonster(m, 1000 * Math.pow(2, Math.min(3, i)), 'apple'); });
        a.carried = [];
        if (dist > 16 || n > 0) { a.state = 'broken'; a.t = 40; }
        else a.state = 'rest';
      }

      // ---------- play loop ----------
      function updatePlay() {
        const inp = readInput();
        updateDo(inp);
        if (inp.fire) throwBall();
        updateBall();
        // release monsters from the den
        if (released < toRelease) {
          if (--relT <= 0) {
            relT = Math.max(50, 120 - level * 8);
            if (!appleAt(den.x, den.y) && Math.abs(mdo.x - den.x) + Math.abs(mdo.y - den.y) > 28) { monsters.push({ type: 'normal', x: den.x, y: den.y, dir: Math.random() < 0.5 ? 1 : 3, acc: 0, anim: 0, t: 0, state: 'walk' }); released++; }
            if (released === toRelease) den.food = true;
          }
        }
        if (freezeT > 0 && --freezeT <= 0) for (const m of monsters) m.frozen = false;
        // occasional digger transformation
        const diggers = monsters.filter(m => m.type === 'digger').length;
        for (const m of monsters) {
          if (m.state === 'dead' || m.carried) continue;
          if (m.type === 'normal' && !m.frozen && diggers < 1 + (level >> 2) && Math.random() < 0.0006 + level * 0.0002 && (m.x & 15) === 0 && (m.y & 15) === 0) {
            m.type = 'digger'; m.type2 = 'normal'; m.t = 180 + (Math.random() * 180 | 0);
          }
          if (!m.frozen) moveMonster(m);
        }
        updateApples();
        if (state !== 'play') return;
        monsters = monsters.filter(m => m.state !== 'dead');
        if (freezeT > 0 && !monsters.some(m => m.type === 'alpha' || m.type === 'drone')) { freezeT = 0; for (const m of monsters) m.frozen = false; }
        for (const o of pops) o.t--;
        pops = pops.filter(o => o.t > 0);
        // collisions
        for (const m of monsters) {
          if (m.carried) continue;
          if (Math.abs(m.x - mdo.x) < 11 && Math.abs(m.y - mdo.y) < 11) { die(); return; }
        }
        // level end conditions
        const allExtra = extra.every(v => v);
        if (cherriesLeft <= 0 || (released >= toRelease && killedNormal >= toRelease) || allExtra) {
          state = 'clear'; T = 0;
          if (demo) { state = 'title'; page = 0; T = 0; return; }
          if (allExtra) { lives++; extra = [0, 0, 0, 0, 0]; A.melody([[1047, 0.1], [1319, 0.1], [1568, 0.1], [2093, 0.3]], { type: 'square', vol: 0.12, delay: 1.2 }); clearMsg = 'EXTRA!  1UP'; }
          else clearMsg = cherriesLeft <= 0 ? 'ALL CHERRIES!' : 'ALL MONSTERS!';
          snd.clear();
        }
        music(mdo.moving);
      }
      let clearMsg = '';
      function die() {
        if (state !== 'play') return;
        state = 'dying'; T = 0;
        if (!demo) snd.death();
      }
      function afterDeath() {
        if (demo) { state = 'title'; page = 0; T = 0; return; }
        const respawn = () => {
          // surviving creeps go back to the den and come out again
          const back = monsters.filter(m => m.type === 'normal' || m.type2 === 'normal').length;
          released = Math.max(0, released - back);
          resetActors(); state = 'ready'; T = 60;
        };
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
            updateApples();
            if (T >= 160) afterDeath();
            break;
          case 'clear':
            if (T >= 240) { level++; initLevel(); state = 'ready'; T = 60; }
            break;
          case 'gameover':
            if (T > 240) { state = 'title'; page = 0; T = 0; demo = false; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawMonster(ctx, m) {
        const x = m.x, y = m.y + FY, fr = (m.anim >> 3) & 1, left = m.dir === 1;
        if (m.frozen) { ctx.drawImage(((T >> 3) & 1) ? FROZEN : CR_R[0], x, y); return; }
        if (m.type === 'digger') { ctx.drawImage((left ? DG_L : DG_R)[fr], x, y); return; }
        if (m.type === 'drone') { ctx.drawImage((left ? DR_L : DR_R)[fr], x, y); return; }
        if (m.type === 'alpha') {
          ctx.fillStyle = '#2040ff'; ctx.fillRect(x + 1, y + 1, 14, 14);
          ctx.fillStyle = '#80a0ff'; ctx.fillRect(x + 1, y + 1, 14, 1); ctx.fillRect(x + 1, y + 1, 1, 14);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y - 2 + fr, 3, 3); ctx.fillRect(x + 10, y - 2 + fr, 3, 3);
          ctx.fillStyle = '#000'; ctx.fillRect(x + 4, y - 1 + fr, 1, 1); ctx.fillRect(x + 11, y - 1 + fr, 1, 1);
          const li = currentLetter();
          if (li >= 0) txt(ctx, LETTERS[li], x + 5, y + 5, '#ffe000');
          ctx.fillStyle = '#2040ff'; ctx.fillRect(x + 2 + fr * 2, y + 15, 3, 2); ctx.fillRect(x + 11 - fr * 2, y + 15, 3, 2);
          return;
        }
        ctx.drawImage((left ? CR_L : CR_R)[fr], x, y);
      }
      function drawDo(ctx) {
        const p = mdo, fr = (p.anim >> 3) & 1, x = p.x, y = p.y + FY;
        let img;
        if (p.dir === 0) img = DO_U[fr]; else if (p.dir === 2) img = DO_D[fr]; else img = (p.face === 1 ? DO_L : DO_R)[fr];
        ctx.drawImage(img, x, y);
        if (ball.st === 'held') { ctx.fillStyle = '#ffffff'; const bx = p.face === 1 ? x - 1 : x + 13; ctx.fillRect(bx, y + 9, 4, 4); ctx.fillStyle = '#c0c0ff'; ctx.fillRect(bx + 2, y + 11, 2, 2); }
      }
      function drawField(ctx) {
        ctx.drawImage(fieldCv, 0, FY);
        for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) if (cherries[r * NC + c]) ctx.drawImage(CHERRY_S, c * 16, r * 16 + FY);
        if (den.food) ctx.drawImage(FOOD_S[(level - 1) % FOOD_S.length], den.x, den.y + FY);
        else if (released < toRelease) { ctx.fillStyle = ((T >> 4) & 1) ? '#ffffff' : '#ff4040'; ctx.fillRect(den.x + 4, den.y + FY + 12, 8, 2); }
        for (const a of apples) {
          if (a.state === 'gone') continue;
          if (a.state === 'broken') { ctx.drawImage(APPLE_B, a.x, a.y + FY); continue; }
          let ox = 0;
          if (a.state === 'wobble' || a.wob > 0) { ox = ((T >> 2) & 1) ? 1 : -1; if (a.wob > 0) a.wob--; }
          ctx.drawImage(APPLE_S, a.x + ox, a.y + FY);
        }
        for (const m of monsters) drawMonster(ctx, m);
        if (ball.st === 'fly') { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(ball.x) - 2, Math.round(ball.y) - 2 + FY, 4, 4); }
        for (const o of pops) tinyNum(ctx, o.v, o.x, o.y, '#ffffff');
      }
      function drawExtra(ctx, x, y) {
        const li = currentLetter();
        for (let i = 0; i < 5; i++) {
          let col = extra[i] ? '#ffe000' : '#404060';
          if (!extra[i] && i === li && monsters && monsters.some(m => m.type === 'alpha') && ((T >> 3) & 1)) col = '#ffffff';
          ctx.fillStyle = extra[i] ? '#2040ff' : '#101030'; ctx.fillRect(x + i * 12 - 2, y - 2, 11, 11);
          txt(ctx, LETTERS[i], x + i * 12, y, col);
        }
      }
      function drawHUD(ctx) {
        txt(ctx, '1UP', 4, 0, '#ff4040'); txt(ctx, String(score).padStart(6, ' '), 0, 10, '#ffffff');
        txt(ctx, 'HI', 156, 0, '#ff4040'); txt(ctx, String(Math.max(hi, score)).padStart(6, ' '), 140, 10, '#ffffff');
        drawExtra(ctx, 68, 6);
        const shown = Math.min(7, lives - (state === 'play' || state === 'dying' ? 1 : 0));
        for (let i = 0; i < shown; i++) ctx.drawImage(DO_R[0], 2 + i * 14, H - 20, 12, 12);
        txt(ctx, 'SCENE ' + level, 112, H - 14, '#00e0ff');
      }
      function drawCredit(ctx) { txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 40, H - 10, '#ffffff'); }
      function drawCoinMsg(ctx, y) {
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) ctr(ctx, 'INSERT COIN', y, '#ff3030'); }
        else if (api.credits === 0) { if ((T >> 5) & 1) ctr(ctx, 'INSERT COIN', y, '#ffe000'); }
        else if ((T >> 5) & 1) ctr(ctx, 'PUSH START', y, '#ffe000');
      }
      function renderTitle(ctx) {
        if (page % 3 === 0) {
          const cols = ['#ff3030', '#ffe000', '#30e030', '#30c0ff', '#ff70c0'];
          const s = 'MR.DO!';
          for (let i = 0; i < s.length; i++) bigTxt(ctx, s[i], 14 + i * 28, 30, cols[(i + (T >> 4)) % cols.length], 4, '#400060');
          ctx.drawImage(DO_R[(T >> 3) & 1], 40, 78); ctx.drawImage(CHERRY_S, 64, 78); ctx.drawImage(APPLE_S, 88, 78);
          ctx.drawImage(CR_L[(T >> 3) & 1], 112, 78); ctx.drawImage(DG_L[(T >> 3) & 1], 136, 78);
          ctr(ctx, 'EAT ALL CHERRIES', 108, '#ffffff');
          ctr(ctx, 'OR DEFEAT ALL', 120, '#ffffff');
          ctr(ctx, 'MONSTERS', 132, '#ffffff');
          ctr(ctx, 'OR SPELL', 144, '#ffffff');
          drawExtra(ctx, 68, 158);
          drawCoinMsg(ctx, 184);
          ctr(ctx, '\u00a9 1982 UNIVERSAL', 204, '#30c0ff');
        } else {
          ctr(ctx, '- SCORE TABLE -', 28, '#ffe000');
          const rows = [[CHERRY_S, 'CHERRY', '50'], [CHERRY_S, '8 IN A ROW', '500'], [CR_R[0], 'BALL HIT', '500'], [APPLE_S, 'APPLE DROP', '1000+'], [FOOD_S[0], 'DESSERT', '1000+']];
          rows.forEach(([im, n, v], i) => {
            ctx.drawImage(im, 8, 44 + i * 22);
            txt(ctx, n, 30, 49 + i * 22, '#ffffff'); txt(ctx, v.padStart(5, ' '), 140, 49 + i * 22, '#ffe000');
          });
          ctr(ctx, 'APPLES CRUSH 1000 2000', 160, '#30e030');
          ctr(ctx, '4000 8000 IN A ROW', 170, '#30e030');
          drawCoinMsg(ctx, 196);
        }
        txt(ctx, 'HI ' + hi, 4, 2, '#ff4040');
        drawCredit(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        drawHUD(ctx);
        drawField(ctx);
        if (state === 'dying') {
          const x = mdo.x, y = mdo.y + FY;
          if (T < 60) ctx.drawImage([DO_R[0], DO_D[0], DO_L[0], DO_U[0]][(T >> 2) & 3], x, y);
          else {
            ctx.save(); ctx.translate(x + 8, y + 8); ctx.rotate(Math.PI); ctx.drawImage(DO_D[0], -8, -8); ctx.restore();
            ctx.fillStyle = '#ffe000'; ctx.fillRect(x + 3, y - 4 - ((T - 60) >> 3), 10, 2);
          }
        } else drawDo(ctx);
        if (state === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(48, 104, 96, 30);
          ctr(ctx, demo ? 'DEMO PLAY' : 'PLAYER 1', 108, '#ffffff');
          ctr(ctx, 'SCENE ' + level, 120, '#ffe000');
        }
        if (state === 'clear' && T > 20) { ctx.fillStyle = '#000'; ctx.fillRect(16, 108, 160, 18); if ((T >> 3) & 1) ctr(ctx, clearMsg, 113, '#ffe000'); }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(48, 108, 96, 18); ctr(ctx, 'GAME OVER', 113, '#ff3030'); }
        if (demo) { ctx.fillStyle = '#000'; ctx.fillRect(48, H - 12, 96, 10); drawCoinMsg(ctx, H - 11); }
      }

      initLevel();
      if (api.debugHook) api.debugHook({ get: () => ({ state, level, score, lives, monsters, apples, mdo, cherriesLeft, released, toRelease, killedNormal, extra, T, ball }), kill: killMonster, set(o) { if ('cherriesLeft' in o) cherriesLeft = o.cherriesLeft; } });
      return { update, render, destroy() { } };
    }
  });
})();
