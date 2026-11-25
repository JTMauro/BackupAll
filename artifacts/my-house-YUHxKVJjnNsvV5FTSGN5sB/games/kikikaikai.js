// KiKi KaiKai (Taito, 1986) \u2014 built-in recreation for the MAME32 Game Room. Sayo-chan the shrine maiden throws ofuda and swings her gohei through haunted shrine grounds, all drawn and synthesized from scratch.
(function () {
  'use strict';
  // ================= Bitmap font (5x7) =================
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
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '=': '00001F001F0000', '+': '0004041F040400', 'x': '00110A040A1100', '>': '08040201020408',
    '<': '02040810080402', '#': '0A1F0A0A1F0A00', '*': '00150E1F0E1500', '%': '19190204081313'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // text(ctx, str, x, y, colour, {scale, center, right, shadow})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc; s = String(s);
    if (s.toUpperCase) s = s.replace(/[a-wyz]/g, c => c.toUpperCase());
    const w = s.length * adv - (adv - 5 * sc);
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    if (o.shadow) { const sh = o.shadow; o.shadow = null; text(ctx, s, x + sc, y + sc, sh, { scale: sc, adv: o.adv }); }
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, sc, sc); }
    }
  }
  function mkRng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const TAU = Math.PI * 2;
  // build a sprite canvas from rows of chars + palette {char: colour}; flip mirrors horizontally
  function spr(rows, pal, flip) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(flip ? w - 1 - i : i, y, 1, 1); } } });
    return c;
  }
  // rotate a char-grid (nearest neighbour) so the art (drawn facing UP) faces angle a (radians, 0 = right)
  function rotRows(rows, a) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const N = Math.ceil(Math.sqrt(w * w + h * h)) | 1;
    const r = a + Math.PI / 2, cs = Math.cos(r), sn = Math.sin(r);
    const out = [];
    for (let y = 0; y < N; y++) {
      let line = '';
      for (let x = 0; x < N; x++) {
        const dx = x - (N - 1) / 2, dy = y - (N - 1) / 2;
        const sx = Math.round(dx * cs + dy * sn + (w - 1) / 2), sy = Math.round(-dx * sn + dy * cs + (h - 1) / 2);
        line += (sy >= 0 && sy < h && sx >= 0 && sx < w) ? (rows[sy][sx] || '.') : '.';
      }
      out.push(line);
    }
    return out;
  }
  // n rotations of an UP-facing sprite: index 0 faces right, increasing clockwise
  function rotSet(rows, pal, n) { const a = []; for (let i = 0; i < n; i++) a.push(spr(rotRows(rows, i / n * TAU), pal)); return a; }
  function angIdx(a, n) { return ((Math.round(a / TAU * n) % n) + n) % n; }
  function drawC(ctx, im, x, y) { ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height / 2)); }
  const DIR8 = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
  function dir8Of(dx, dy) { return angIdx(Math.atan2(dy, dx), 8); }
  function boxHit(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }
  function coinOp(api) {
    // shared attract helper: returns true if a credit was used
    return api.useCredit();
  }
  function pad2(n) { return String(Math.min(99, n)).padStart(2, '0'); }
  const W = 224, H = 256, TOP = 16;

  // ================= Pixel art =================
  const PAL = {
    K: '#202030', S: '#f8c8a0', E: '#101018', p: '#e07070', W: '#f8f8f8', R: '#e02828', r: '#ff5050', w: '#c8c8d8',
    B: '#3858e8', b: '#1830a0', Y: '#f8d838', y: '#c09018', G: '#30a840', g: '#186820', O: '#f08828', o: '#a85010',
    P: '#c060e0', V: '#7030a0', N: '#a06030', n: '#603818', T: '#ff80a0', C: '#60e0ff', D: '#505060', L: '#9090a0', Z: '#000000'
  };
  const SAYO = {
    down: [[
      '....KKKK....', '...KKKKKK...', '..KKKKKKKK..', '..KKSSSSKK..', '..KSESSESK..', '..KSSSSSSK..', '..KKSppSKK..', '..K.WWWW.K..',
      '.KWWWRRWWWK.', '.SWWWWWWWWS.', '.SWWWWWWWWS.', '..RRRRRRRR..', '..RRRRRRRR..', '..RRRRRRRR..', '..RRR..RRR..', '..WW....WW..'], [
      '....KKKK....', '...KKKKKK...', '..KKKKKKKK..', '..KKSSSSKK..', '..KSESSESK..', '..KSSSSSSK..', '..KKSppSKK..', '..K.WWWW.K..',
      '.KWWWRRWWWK.', '.SWWWWWWWWS.', '.SWWWWWWWWS.', '..RRRRRRRR..', '..RRRRRRRR..', '..RRRRRRRR..', '...RR..RR...', '...WW..WW...']],
    up: [[
      '....KKKK....', '...KKKKKK...', '..KKKKKKKK..', '..KKKKKKKK..', '..KKRrrRKK..', '..KKKKKKKK..', '...KKKKKK...', '...KKKKKK...',
      '.WWWKKKKWWW.', '.SWWWKKWWWS.', '.SWWWWWWWWS.', '..RRRRRRRR..', '..RRRRRRRR..', '..RRRRRRRR..', '..RRR..RRR..', '..WW....WW..'], [
      '....KKKK....', '...KKKKKK...', '..KKKKKKKK..', '..KKKKKKKK..', '..KKRrrRKK..', '..KKKKKKKK..', '...KKKKKK...', '...KKKKKK...',
      '.WWWKKKKWWW.', '.SWWWKKWWWS.', '.SWWWWWWWWS.', '..RRRRRRRR..', '..RRRRRRRR..', '..RRRRRRRR..', '...RR..RR...', '...WW..WW...']],
    side: [[
      '....KKKK....', '...KKKKKK...', '..KKKKKKKK..', '..KKKKSSSK..', '..KKKSSESK..', '..KKKSSSSS..', '..KKKSSpS...', '..KK.WWW....',
      '..KWWWRWWW..', '...WWWWWWS..', '...WWWWWWS..', '...RRRRRR...', '..RRRRRRRR..', '..RRRRRRRR..', '..RRR..RRR..', '..WW....WW..'], [
      '....KKKK....', '...KKKKKK...', '..KKKKKKKK..', '..KKKKSSSK..', '..KKKSSESK..', '..KKKSSSSS..', '..KKKSSpS...', '..KK.WWW....',
      '..KWWWRWWW..', '...WWWWWWS..', '...WWWWWWS..', '...RRRRRR...', '...RRRRRR...', '...RRRRRR...', '....RRRR....', '....WWWW....']]
  };
  const ART = {
    obake: [[
      '.....WWWW.....', '...WWWWWWWW...', '..WWWWWWWWWW..', '.WWWZZWWZZWWW.', '.WWWZZWWZZWWW.', 'WWWWWWWWWWWWWW', 'WWWWWZZZZWWWWW',
      'WWWWWZTTZWWWWW', 'WWWWWWTTWWWWWW', 'WWWWWWWWWWWWWW', '.WWWWWWWWWWWW.', '.WW.WWW.WWW.W.', '.W...W...W....'], [
      '.....WWWW.....', '...WWWWWWWW...', '..WWWWWWWWWW..', '.WWWZZWWZZWWW.', '.WWWZZWWZZWWW.', 'WWWWWWWWWWWWWW', 'WWWWWZZZZWWWWW',
      'WWWWWZTTZWWWWW', 'WWWWWWTTWWWWWW', 'WWWWWWWWWWWWWW', '.WWWWWWWWWWWW.', '..W.WWW.WWW.WW', '....W...W...W.']],
    hitotsume: [[
      '....bbbbbb....', '...bBBBBBBb...', '..bBBBBBBBBb..', '..bBBWWWWBBb..', '..bBWWZZWWBb..', '..bBBWWWWBBb..', '..bBBBZZBBBb..',
      '...bBBBBBBb...', '..YYYYYYYYYY..', '.BBYYYYYYYYBB.', '.B.YYYYYYYY.B.', '...bbb..bbb...', '...BB....BB...'], [
      '....bbbbbb....', '...bBBBBBBb...', '..bBBBBBBBBb..', '..bBBWWWWBBb..', '..bBWWZZWWBb..', '..bBBWWWWBBb..', '..bBBBZZBBBb..',
      '...bBBBBBBb...', '..YYYYYYYYYY..', '.BBYYYYYYYYBB.', '.B.YYYYYYYY.B.', '....bb..bb....', '....BB..BB....']],
    chochin: [[
      '....nnnnnn....', '...OOOOOOOO...', '..OOWWWWWWOO..', '.OOWWZZWWWWOO.', '.oOOOOOOOOOOo.', '.OWWWWWWWZZWO.', '.oOOOOOOOOOOo.',
      '.OWWWRRRRWWWO.', '.oOOORTTROOOo.', '..OOWWTTWWOO..', '...OOOOOOOO...', '....nnnnnn....'], [
      '....nnnnnn....', '...OOOOOOOO...', '..OOWWWWWWOO..', '.OOWWWWWZZWOO.', '.oOOOOOOOOOOo.', '.OWZZWWWWWWWO.', '.oOOOOOOOOOOo.',
      '.OWWWRRRRWWWO.', '.oOOORRRROOOo.', '..OOWWWWWWOO..', '...OOOOOOOO...', '....nnnnnn....']],
    kasa: [[
      '......PP......', '....PPPPPP....', '..PPPPPPPPPP..', '.PPWWZZPPPPPP.', 'PPPWWZZPPTTPPP', 'PVPVPVPVPVPVPV', '......nn......',
      '......nn......', '......nn......', '.....SSSS.....', '.....S..S.....'], [
      '......PP......', '....PPPPPP....', '..PPPPPPPPPP..', '.PPPPPPWWZZPP.', 'PPPTTPPWWZZPPP', 'PVPVPVPVPVPVPV', '......nn......',
      '......nn......', '......nn......', '......SS......', '......SS......']],
    nukekubi: [[
      '...KKKKKKK....', '..KKKKKKKKK...', '.KKSSSSSSSKK..', '.KSEESSEESKK..', '.KSSSSSSSSKKK.', '.KSSRRRRSSKKKK', '..SSSSSSSSKKK.',
      '...SSSSSS.KKK.', '..........KK..', '...........K..'], [
      '...KKKKKKK....', '..KKKKKKKKK...', '.KKSSSSSSSKK..', '.KSEESSEESKK..', '.KSSSSSSSSKK..', '.KSSZZZZSSKKK.', '..SSRRRRSSKKKK',
      '...SSSSSS..KK.', '...........KK.', '............K.']]
  };
  const BOSSART = [
    // giant ghost
    ['......WWWWWWWW......', '....WWWWWWWWWWWW....', '...WWWWWWWWWWWWWW...', '..WWWWWWWWWWWWWWWW..', '.WWWWZZZWWWWZZZWWWW.', '.WWWZZYZZWWZZYZZWWW.',
      '.WWWWZZZWWWWZZZWWWW.', 'WWWWWWWWWWWWWWWWWWWW', 'WWWWWWZZZZZZZZWWWWWW', 'WWWWWZRRRRRRRRZWWWWW', 'WWWWWZRTTTTTTRZWWWWW', 'WWWWWWZRTTTTRZWWWWWW',
      'WWWWWWWZZTTZZWWWWWWW', 'WWWWWWWWWTTWWWWWWWWW', 'WWWWWWWWWWWWWWWWWWWW', '.WWWWWWWWWWWWWWWWWW.', '.WWWWWWWWWWWWWWWWWW.', '.WW.WWWW.WWWW.WWWW..', '.W...WW...WW...WW...', '......W....W....W...'],
    // umbrella lord
    ['.........PP.........', '......PPPPPPPP......', '....PPPPPPPPPPPP....', '...PPPPPPPPPPPPPP...', '..PPPWWWPPPPWWWPPP..', '.PPPWWZZWPPWWZZWPPP.',
      '.PPPWWZZWPPWWZZWPPP.', 'PPPPPWWWPPPPWWWPPPPP', 'PPPPPPPPRRRRPPPPPPPP', 'PPPPPPPRTTTTRPPPPPPP', 'PVPVPVPVPTTPVPVPVPVP', 'V.V.V.V.V..V.V.V.V.V',
      '.........nn.........', '.........nn.........', '.........nn.........', '.........nn.........', '........SSSS........', '.......SSSSSS.......', '.......SS..SS.......', '......SSS..SSS......'],
    // tengu
    ['......KKKKKKKK......', '.....KKKKKKKKKK.....', '....RRRRRRRRRRRR....', '...RRRRRRRRRRRRRR...', '..RRYYRRRRRRRRYYRR..', '..RRZYRRRRRRRRZYRR..',
      '..RRRRRRRRRRRRRRRR..', '..RRRRRRRrrRRRRRRR..', '..RRRRRRrrrrRRRRRR..', '..RRRRRRrrrrRRRRRR..', '...RRRRRrrrrRRRRR...', '...WWWWWrrrrWWWWW...',
      '..WWWWWWWrrWWWWWWW..', '.GGWWWWWWrrWWWWWWGG.', 'GGGGWWWWWWWWWWWGGGG.', 'GGGGGWWWWWWWWWGGGGG.', 'GGGGgBBBBBBBBBgGGGGG', '.GGg.BBBBBBBBB.gGG..', '.Gg..BBB..BBBB..gG..', '.....YY.....YY......'],
    // nine-tail fox
    ['..YY..........YY....', '..YYY........YYY....', '..YYYY......YYYY....', '..YYWYYYYYYYYWYY....', '..YYYYYYYYYYYYYY....', '.YYYRZYYYYYYZRYYY...',
      '.YYYZZYYYYYYZZYYY...', '.YYYYYYYYYYYYYYYY.YW', 'YYWWWYYYYYYYYWWWYYYW', 'YWWWWWYYZZYYWWWWWYYW', '.WWWWWWWRRWWWWWWYYWY', '..WWWWWWWWWWWWWYYWYY',
      '...WWWWWWWWWWYYYWYY.', '...YYYYYYYYYYYYWYY..', '..YYYYYYYYYYYYYYY...', '..YYyYYYYYYYYyYYY...', '..YY.yY....Yy.YY....', '..WW..W....W..WW....', '....................', '....................']
  ];
  const BOSSNAME = ['O-BAKE KING', 'KASA DAIMYO', 'DAI-TENGU', 'KYUBI NO KITSUNE'];

  ArcadeRegistry.register({
    id: 'kikikaikai', title: 'KiKi KaiKai', year: 1986, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk (8 ways) \u00b7 Space: throw ofuda (the way Sayo faces; hold for rapid) \u00b7 X: swing gohei wand \u00b7 Enter: start',
    marquee: { bg: '#3a0a10', fg: '#fff0d0', accent: '#e02828' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null;

      // ---- sprites ----
      const SP = {};
      for (const k of ['down', 'up', 'side']) SP[k] = SAYO[k].map(r => spr(r, PAL));
      SP.sideL = SAYO.side.map(r => spr(r, PAL, true));
      for (const k in ART) { SP[k] = ART[k].map(r => spr(r, PAL)); SP[k + 'L'] = ART[k].map(r => spr(r, PAL, true)); }
      const BOSSSP = BOSSART.map(r => spr(r, PAL));
      const BOSSHIT = BOSSART.map(r => spr(r, { W: '#fff', Y: '#fff', P: '#fff', V: '#fff', R: '#fff', G: '#fff', K: '#fff', S: '#fff', B: '#fff', n: '#fff', Z: '#fff', T: '#fff', r: '#fff', y: '#fff', g: '#fff' }));
      const LIFE = spr(['..KKKK..', '.KKKKKK.', '.KSSSSK.', '.KSEESK.', '..WRRW..', '.WWWWWW.', '.RRRRRR.', '.R....R.'], PAL);

      // ---- sound ----
      const sfx = {
        throw() { au.tone(1400, 0.05, { type: 'square', vol: 0.06, slideTo: 2200 }); },
        swing() { au.noise(0.12, { vol: 0.12, freq: 2500, slideTo: 600, type: 'bandpass' }); au.tone(500, 0.1, { type: 'triangle', vol: 0.08, slideTo: 1200 }); },
        hit() { au.tone(880, 0.06, { type: 'square', vol: 0.08, slideTo: 220 }); },
        kill() { au.tone(1200, 0.12, { type: 'triangle', vol: 0.12, slideTo: 300 }); au.noise(0.08, { vol: 0.06, freq: 3000 }); },
        boss() { au.tone(160, 0.08, { type: 'square', vol: 0.08, slideTo: 90 }); },
        eshot() { au.tone(320, 0.12, { type: 'sine', vol: 0.06, slideTo: 640 }); },
        item() { au.melody([[988, .05], [1319, .05], [1760, .1]], { type: 'square', vol: 0.1 }); },
        power() { au.melody([[659, .05], [784, .05], [988, .05], [1319, .05], [1568, .12]], { type: 'square', vol: 0.1 }); },
        die() { au.melody([[880, .08], [831, .08], [784, .08], [740, .08], [698, .08], [659, .08], [622, .1], [587, .3]], { type: 'triangle', vol: 0.14 }); },
        oneup() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .14]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[587, .14], [659, .14], [784, .14], [880, .28], [784, .14], [880, .14], [1047, .14], [1175, .4]], { type: 'triangle', vol: 0.14 }); },
        bossin() { au.melody([[220, .2], [233, .2], [220, .2], [233, .2], [196, .5]], { type: 'sawtooth', vol: 0.08 }); },
        clear() { au.melody([[784, .1], [880, .1], [1047, .1], [1175, .2], [1047, .1], [1175, .1], [1568, .45]], { type: 'square', vol: 0.11 }); },
        bigboom() { au.noise(0.9, { vol: 0.22, freq: 1200, slideTo: 60 }); }
      };
      // little koto-ish background phrase on stage start
      const THEMES = [
        { name: 'SHRINE GROUNDS', g1: '#c8b07c', g2: '#b89c68', path: '#e0d0a8', pathE: '#a89060', tree: '#2c8a3c', tree2: '#1c6028' },
        { name: 'GRAVEYARD', g1: '#7a8a6a', g2: '#6a7a5c', path: '#a8a898', pathE: '#5a6050', tree: '#3c6a3c', tree2: '#284a28' },
        { name: 'BAMBOO FOREST', g1: '#6a9a4a', g2: '#5a8a3c', path: '#c8b888', pathE: '#7a7048', tree: '#58c050', tree2: '#2c8a2c' },
        { name: 'MOONLIT CASTLE', g1: '#4a4a6a', g2: '#3c3c5a', path: '#7a7a98', pathE: '#2c2c40', tree: '#2a5a4a', tree2: '#1a3a30' }
      ];

      // ================= Stage map =================
      function buildMap(stage) {
        const r = mkRng(stage * 4441 + 7);
        const th = stage % 4;
        const L = 1700 + Math.min(6, stage) * 120;
        const solids = [], deco = [], spawners = [];
        const pathX = y => 112 + Math.sin(y * 0.004 + stage) * 34;
        const nearPath = (x, y, m) => Math.abs(x - pathX(y)) < 30 + m;
        // horizontal walls with a gap at the path every ~420
        for (let y = -380; y > -L + 220; y -= 380 + Math.round(r() * 80)) {
          const px = pathX(y), gap = 46;
          solids.push({ x: 0, y, w: Math.max(0, px - gap / 2), h: 10, t: 'wall' });
          solids.push({ x: px + gap / 2, y, w: W - (px + gap / 2), h: 10, t: 'wall' });
          // torii at the gap
          deco.push({ x: px, y: y - 2, t: 'torii' });
          solids.push({ x: px - gap / 2 - 2, y: y - 6, w: 6, h: 16, t: 'post' });
          solids.push({ x: px + gap / 2 - 4, y: y - 6, w: 6, h: 16, t: 'post' });
        }
        const isFree = (x, y, w, h) => !solids.some(s => x < s.x + s.w + 6 && x + w + 6 > s.x && y < s.y + s.h + 6 && y + h + 6 > s.y);
        // props
        for (let y = -120; y > -L + 200; y -= 22 + r() * 30) {
          const side = r() < 0.5 ? -1 : 1;
          const x = Math.round(pathX(y) + side * (40 + r() * 60));
          if (x < 8 || x > W - 20) continue;
          const roll = r();
          let o;
          if (th === 1 && roll < 0.55) o = { x: x - 5, y, w: 10, h: 10, t: 'grave' };
          else if (th === 2 && roll < 0.6) o = { x: x - 3, y, w: 6, h: 8, t: 'bamboo' };
          else if (roll < 0.35) o = { x: x - 4, y, w: 8, h: 8, t: 'lantern' };
          else if (roll < 0.8) o = { x: x - 5, y: y + 6, w: 10, h: 6, t: 'tree' };
          else o = { x: x - 8, y, w: 16, h: 10, t: 'rock' };
          if (isFree(o.x, o.y, o.w, o.h)) { solids.push(o); if (o.t === 'grave' && r() < 0.4) spawners.push({ x: o.x + 5, y: o.y, cd: 0 }); }
        }
        // ponds off the path
        const ponds = [];
        for (let i = 0; i < 3; i++) {
          const y = -300 - r() * (L - 600), px = pathX(y);
          const x = px > 112 ? 6 + r() * 20 : W - 66 - r() * 20;
          const p = { x, y, w: 56, h: 28, t: 'pond' };
          if (isFree(p.x, p.y, p.w, p.h)) { solids.push(p); ponds.push(p); }
        }
        return { L, solids, deco, spawners, pathX, th, ponds };
      }

      // ================= Game state =================
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, loop: 0, nextExtra: 20000, power: 1, wide: 0 };
        startStage(true);
        sfx.start();
      }
      function startStage(first) {
        g.map = buildMap(g.stage);
        g.camY = -H;
        g.en = []; g.shots = []; g.eb = []; g.items = []; g.fx = []; g.pops = [];
        g.boss = null; g.spawnT = 120; g.kills = 0;
        g.phase = 'ready'; g.phaseT = first ? 150 : 120;
        resetPlayer(g.map.pathX(-40), -40);
      }
      function resetPlayer(x, y) {
        g.p = { x, y, dir: 6, step: 0, stepT: 0, fireT: 0, swing: 0, swingCd: 0, inv: 120, dead: 0 };
      }
      function diff() { return g.stage + g.loop * 2; }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra < 50000 ? 30000 : 50000; sfx.oneup(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, txt, col) { g.pops.push({ x, y, txt, col: col || '#fff', t: 50 }); }

      // ---- collision with scenery ----
      function solidAt(x, y, w, h) {
        for (const s of g.map.solids) if (x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y) return s;
        return null;
      }
      function movePlayer(dx, dy) {
        const p = g.p;
        const fx = () => solidAt(p.x - 4, p.y + 2, 8, 6);
        p.x += dx; if (p.x < 6 || p.x > W - 6 || fx()) p.x -= dx;
        p.y += dy; if (p.y > g.camY + H - 10 || p.y < g.camY + TOP + 12 || fx()) p.y -= dy;
      }

      // ---- spawning ----
      const KINDS = ['obake', 'hitotsume', 'kasa', 'chochin', 'nukekubi'];
      const SCORE = { obake: 100, hitotsume: 200, kasa: 200, chochin: 300, nukekubi: 500 };
      function spawnEnemy(kind, x, y) {
        const d = diff();
        const e = { k: kind, x, y, vx: 0, vy: 0, t: 0, hp: kind === 'nukekubi' ? 2 : kind === 'chochin' ? 2 : 1, z: 0, flash: 0, face: 1,
          spd: (kind === 'obake' ? 0.55 : kind === 'hitotsume' ? 0.7 : kind === 'nukekubi' ? 1.6 : 0.5) * (1 + d * 0.08),
          fireT: 60 + Math.random() * 90, appear: 20 };
        g.en.push(e);
        return e;
      }
      function chooseKind() {
        const d = diff(), r = Math.random();
        const w = [5, 3 + (g.map.th === 0 ? 1 : 0), d >= 1 ? 3 : 1, d >= 1 ? 2 : 1, d >= 2 ? 2 : d >= 1 ? 1 : 0];
        if (g.map.th === 1) w[0] += 3;
        if (g.map.th === 2) w[2] += 2;
        if (g.map.th === 3) w[4] += 2;
        let tot = 0; for (const v of w) tot += v;
        let a = r * tot;
        for (let i = 0; i < w.length; i++) { a -= w[i]; if (a < 0) return KINDS[i]; }
        return 'obake';
      }
      function spawnTick() {
        const d = diff();
        const cap = 5 + Math.min(5, d);
        if (--g.spawnT > 0 || g.en.length >= cap) return;
        g.spawnT = Math.max(28, 80 - d * 8) + Math.random() * 40;
        const kind = chooseKind();
        const side = Math.random();
        let x, y;
        if (side < 0.6) { x = 16 + Math.random() * (W - 32); y = g.camY + TOP - 8; }
        else if (side < 0.8) { x = -8; y = g.camY + TOP + 20 + Math.random() * 140; }
        else { x = W + 8; y = g.camY + TOP + 20 + Math.random() * 140; }
        spawnEnemy(kind, x, y);
      }

      // ---- player shots ----
      function fire() {
        const p = g.p;
        const maxShots = 3 + g.power * 2;
        if (g.shots.length >= maxShots) return;
        const a = p.dir / 8 * TAU;
        const spd = 4.2;
        const mk = (ang) => g.shots.push({ x: p.x + Math.cos(ang) * 6, y: p.y - 2 + Math.sin(ang) * 6, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 40 + g.power * 6, big: g.power >= 2 });
        mk(a);
        if (g.power >= 3) { mk(a - 0.28); mk(a + 0.28); }
        sfx.throw();
      }
      function eShot(x, y, ang, spd) { g.eb.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, t: 0 }); }
      function aimAt(x, y) { return Math.atan2(g.p.y - y, g.p.x - x); }

      function killEnemy(e, byWand) {
        e.dead = true;
        const pts = SCORE[e.k] * (byWand ? 2 : 1);
        addScore(pts); pop(e.x, e.y - 8, String(pts), byWand ? '#ffd838' : '#fff');
        g.fx.push({ x: e.x, y: e.y, t: 0, k: 'puff' });
        sfx.kill();
        g.kills++;
        if (g.kills % 7 === 0 || (e.k === 'chochin' && Math.random() < 0.35)) dropItem(e.x, e.y);
      }
      function dropItem(x, y) {
        const r = Math.random();
        const k = g.power < 3 && r < 0.45 ? 'red' : r < 0.7 ? 'blue' : r < 0.9 ? 'koban' : 'scroll';
        g.items.push({ x, y, k, t: 600 });
      }

      // ---- boss ----
      function startBoss() {
        const type = g.stage % 4, d = diff();
        g.boss = { type, x: W / 2, y: g.camY + TOP - 30, hp: 36 + d * 10, max: 36 + d * 10, t: 0, flash: 0, state: 'enter', vx: 0, vy: 0, z: 0, alpha: 1, timer: 0, wandCd: 0 };
        g.boss.max = g.boss.hp;
        g.phase = 'boss';
        g.en.forEach(e => { e.dead = true; g.fx.push({ x: e.x, y: e.y, t: 0, k: 'puff' }); });
        sfx.bossin();
      }
      function updBoss() {
        const b = g.boss, p = g.p, d = diff();
        b.t++; if (b.flash) b.flash--; if (b.wandCd) b.wandCd--;
        const top = g.camY + TOP;
        if (b.state === 'enter') { b.y += 0.8; if (b.y >= top + 50) { b.state = 'fight'; b.t = 0; } return; }
        const rate = Math.max(0.6, 1 - d * 0.06);
        if (b.type === 0) {
          // figure-eight float + rings of hinotama
          b.x = W / 2 + Math.sin(b.t * 0.018) * 70;
          b.y = top + 60 + Math.sin(b.t * 0.036) * 30;
          if (b.t % Math.round(90 * rate) === 0) { const n = 8 + Math.min(6, d); for (let i = 0; i < n; i++) eShot(b.x, b.y + 6, i / n * TAU + b.t * 0.01, 1.1 + d * 0.05); sfx.eshot(); }
          if (b.t % Math.round(140 * rate) === 70 && g.en.length < 4) { spawnEnemy('obake', b.x - 20, b.y); spawnEnemy('obake', b.x + 20, b.y); }
        } else if (b.type === 1) {
          // hop toward player, shockwave on landing
          if (b.state === 'fight') {
            b.timer++;
            if (b.timer > 40 * rate) { b.state = 'jump'; b.timer = 0; const tx = clamp(p.x, 30, W - 30), ty = clamp(p.y - 30, top + 30, top + 150); b.vx = (tx - b.x) / 50; b.vy = (ty - b.y) / 50; }
          } else {
            b.timer++; b.x += b.vx; b.y += b.vy; b.z = Math.sin(b.timer / 50 * Math.PI) * 40;
            if (b.timer >= 50) { b.state = 'fight'; b.timer = 0; b.z = 0; const n = 10 + Math.min(6, d); for (let i = 0; i < n; i++) eShot(b.x, b.y + 16, i / n * TAU, 1.3 + d * 0.05); sfx.boss(); g.shake = 10; }
          }
        } else if (b.type === 2) {
          // teleport and fire spreads
          b.timer++;
          if (b.state === 'fight') {
            b.alpha = 1;
            if (b.timer % Math.round(36 * rate) === 0 && b.timer < 120) { const a = aimAt(b.x, b.y); for (let i = -2; i <= 2; i++) eShot(b.x, b.y + 8, a + i * 0.22, 1.6 + d * 0.06); sfx.eshot(); }
            if (b.timer >= 150) { b.state = 'vanish'; b.timer = 0; }
          } else if (b.state === 'vanish') {
            b.alpha = 1 - b.timer / 30;
            if (b.timer >= 30) { b.x = 30 + Math.random() * (W - 60); b.y = top + 30 + Math.random() * 90; b.state = 'appear'; b.timer = 0; if (g.en.length < 4) spawnEnemy('nukekubi', b.x, b.y); }
          } else { b.alpha = b.timer / 30; if (b.timer >= 30) { b.state = 'fight'; b.timer = 0; } }
        } else {
          // fox: dash side to side, spiral foxfire
          b.x += b.vx || 1.4; if (!b.vx) b.vx = 1.4 + d * 0.1;
          if (b.x < 30) b.vx = Math.abs(b.vx); if (b.x > W - 30) b.vx = -Math.abs(b.vx);
          b.y = top + 50 + Math.sin(b.t * 0.03) * 24;
          if (b.t % Math.max(5, Math.round(8 * rate)) === 0) { eShot(b.x, b.y + 8, b.t * 0.13, 1.2 + d * 0.04); if (b.t % 40 === 0) sfx.eshot(); }
          if (b.t % Math.round(120 * rate) === 0) { const a = aimAt(b.x, b.y); for (let i = -1; i <= 1; i++) eShot(b.x, b.y, a + i * 0.15, 2.2); }
        }
        // contact
        if (!p.dead && !p.inv && b.alpha > 0.5 && b.z < 10 && Math.abs(p.x - b.x) < 16 && Math.abs(p.y - b.y) < 16) killPlayer();
      }
      function hurtBoss(n) {
        const b = g.boss; if (!b || b.state === 'enter' || b.alpha < 0.5 || b.z > 14) return false;
        b.hp -= n; b.flash = 4; sfx.hit();
        if (b.hp <= 0) {
          const pts = 10000 * (1 + g.loop) + g.stage * 2000;
          addScore(pts); pop(b.x, b.y - 30, String(pts), '#ffd838');
          for (let i = 0; i < 12; i++) g.fx.push({ x: b.x + rnd(-24, 24), y: b.y + rnd(-24, 24), t: -i * 5, k: 'puff' });
          g.boss = null; g.eb = []; g.en.forEach(e => e.dead = true);
          g.phase = 'clear'; g.phaseT = 260; sfx.bigboom();
          setTimeout0(() => sfx.clear());
        }
        return true;
      }
      let pendClear = 0;
      function setTimeout0(f) { pendClear = 50; pendFn = f; }
      let pendFn = null;

      function killPlayer() {
        const p = g.p; if (p.dead) return;
        p.dead = 1; g.phase = 'dead'; g.phaseT = 120; sfx.die();
        g.power = Math.max(1, g.power - 1); g.wide = 0;
      }

      // ================= Update =================
      function updPlay() {
        const p = g.p, d = diff();
        // movement
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        if (dx || dy) {
          const n = (dx && dy) ? 0.7071 : 1, sp = 1.25;
          movePlayer(dx * n * sp, 0); movePlayer(0, dy * n * sp);
          p.dir = dir8Of(dx, dy);
          if (++p.stepT > 8) { p.stepT = 0; p.step ^= 1; }
        }
        if (p.inv) p.inv--;
        // camera follows upward only
        if (g.phase === 'play') {
          const want = p.y - 140;
          if (want < g.camY) g.camY = Math.max(-g.map.L, want);
          if (g.camY <= -g.map.L) startBoss();
        }
        // fire
        if (p.fireT) p.fireT--;
        if ((api.pressed('Space') || (api.key('Space') && !p.fireT)) && !p.swing) { fire(); p.fireT = 10; }
        if (p.swingCd) p.swingCd--;
        if (api.pressed('KeyX') && !p.swingCd) { p.swing = 16; p.swingCd = 24; sfx.swing(); }
        if (p.swing) p.swing--;
        const wandR = 20 + (g.wide ? 8 : 0);
        if (g.wide) g.wide--;
        // shots
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.x < -8 || s.x > W + 8 || s.y < g.camY - 8 || s.y > g.camY + H + 8) s.life = 0;
        }
        // enemies
        if (g.phase === 'play') spawnTick();
        // graves spawn ghosts when near
        if (g.phase === 'play') for (const sp of g.map.spawners) {
          if (sp.cd) { sp.cd--; continue; }
          if (sp.y > g.camY + TOP + 10 && sp.y < g.camY + H - 40 && Math.abs(sp.y - p.y) > 40 && g.en.length < 10 && Math.random() < 0.01) {
            const e = spawnEnemy('obake', sp.x, sp.y - 4); e.appear = 40; sp.cd = 400;
          }
        }
        for (const e of g.en) {
          e.t++; if (e.flash) e.flash--;
          if (e.appear) { e.appear--; continue; }
          const ax = p.x - e.x, ay = p.y - e.y, dist = Math.hypot(ax, ay) || 1;
          if (e.k === 'obake') {
            e.vx += (ax / dist * e.spd - e.vx) * 0.03; e.vy += (ay / dist * e.spd - e.vy) * 0.03;
            e.x += e.vx + Math.sin(e.t * 0.08) * 0.5; e.y += e.vy;
          } else if (e.k === 'hitotsume') {
            if (e.t % 50 === 1) { if (Math.abs(ax) > Math.abs(ay)) { e.vx = Math.sign(ax) * e.spd; e.vy = 0; } else { e.vx = 0; e.vy = Math.sign(ay) * e.spd; } }
            e.x += e.vx; e.y += e.vy;
            if (d >= 2 && e.t % 120 === 60) { eShot(e.x, e.y, aimAt(e.x, e.y), 1.4); }
          } else if (e.k === 'kasa') {
            const per = 44, ph = e.t % per;
            if (ph === 0) { const a = Math.atan2(ay, ax) + rnd(-0.4, 0.4); e.vx = Math.cos(a) * e.spd * 2.2; e.vy = Math.sin(a) * e.spd * 2.2; }
            if (ph < 30) { e.x += e.vx; e.y += e.vy; e.z = Math.sin(ph / 30 * Math.PI) * 10; } else e.z = 0;
          } else if (e.k === 'chochin') {
            const ty = g.camY + TOP + 40 + (e.t % 300 < 150 ? 20 : 50);
            e.x += Math.sign(ax) * 0.3 + Math.sin(e.t * 0.05) * 0.6; e.y += (ty - e.y) * 0.02;
            e.z = Math.abs(Math.sin(e.t * 0.1)) * 4;
            if (--e.fireT <= 0) { e.fireT = Math.max(50, 130 - d * 12) + Math.random() * 60; eShot(e.x, e.y, aimAt(e.x, e.y), 1.3 + d * 0.08); sfx.eshot(); }
          } else if (e.k === 'nukekubi') {
            if (!e.mode) { e.mode = 'hover'; e.mt = 40; }
            if (e.mode === 'hover') { e.x += Math.sin(e.t * 0.1) * 1; e.y += Math.cos(e.t * 0.07) * 0.5 + 0.2; if (--e.mt <= 0) { e.mode = 'dive'; e.mt = 50; e.vx = ax / dist * e.spd * 1.6; e.vy = ay / dist * e.spd * 1.6; sfx.boss(); } }
            else { e.x += e.vx; e.y += e.vy; if (--e.mt <= 0) { e.mode = 'hover'; e.mt = 50 + Math.random() * 40; } }
          }
          if (Math.abs(ax) > 2) e.face = ax > 0 ? 1 : -1;
          // keep on screen sides
          if (e.t > 60) e.x = clamp(e.x, -12, W + 12);
          if (e.y > g.camY + H + 30 || e.y < g.camY - 80) e.dead = true;
          // touch player
          if (!p.dead && !p.inv && e.z < 6 && Math.abs(e.x - p.x) < 9 && Math.abs(e.y - p.y) < 10) killPlayer();
        }
        // shots vs enemies / boss
        for (const s of g.shots) {
          if (s.life <= 0) continue;
          for (const e of g.en) {
            if (e.dead || e.appear) continue;
            if (Math.abs(e.x - s.x) < 8 && Math.abs(e.y - s.y) < 8) {
              s.life = 0; e.hp -= s.big ? 2 : 1; e.flash = 4;
              if (e.hp <= 0) killEnemy(e, false); else sfx.hit();
              break;
            }
          }
          const b = g.boss;
          if (s.life > 0 && b && Math.abs(b.x - s.x) < 20 && Math.abs(b.y - b.z - s.y) < 20) { if (hurtBoss(s.big ? 1.5 : 1)) s.life = 0; }
        }
        // wand
        if (p.swing) {
          for (const e of g.en) if (!e.dead && !e.appear && Math.hypot(e.x - p.x, e.y - p.y) < wandR) { e.hp = 0; killEnemy(e, true); }
          for (const b of g.eb) if (Math.hypot(b.x - p.x, b.y - p.y) < wandR + 4) { b.dead = true; addScore(10); }
          const b = g.boss;
          if (b && !b.wandCd && Math.hypot(b.x - p.x, b.y - b.z - p.y) < wandR + 18) { if (hurtBoss(3)) b.wandCd = 16; }
        }
        // enemy bullets
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy; b.t++;
          if (b.x < -10 || b.x > W + 10 || b.y < g.camY - 10 || b.y > g.camY + H + 10) b.dead = true;
          if (!p.dead && !p.inv && Math.abs(b.x - p.x) < 4 && Math.abs(b.y - p.y) < 6) { b.dead = true; killPlayer(); }
        }
        // items
        for (const it of g.items) {
          it.t--;
          if (!p.dead && Math.abs(it.x - p.x) < 10 && Math.abs(it.y - p.y) < 12) {
            it.t = 0;
            if (it.k === 'red') { if (g.power < 3) { g.power++; sfx.power(); pop(it.x, it.y - 8, 'POWER UP', '#ff5050'); } else { addScore(2000); pop(it.x, it.y - 8, '2000', '#ff5050'); sfx.item(); } }
            else if (it.k === 'blue') { g.wide = 900; sfx.power(); pop(it.x, it.y - 8, 'GOHEI UP', '#60e0ff'); }
            else if (it.k === 'koban') { addScore(1000); pop(it.x, it.y - 8, '1000', '#ffd838'); sfx.item(); }
            else { addScore(500); g.eb.forEach(b => b.dead = true); g.en.forEach(e => { if (!e.appear) killEnemy(e, false); }); pop(it.x, it.y - 8, 'HARAE!', '#fff'); sfx.power(); }
          }
        }
        if (g.boss) updBoss();
        g.shots = g.shots.filter(s => s.life > 0);
        g.en = g.en.filter(e => !e.dead);
        g.eb = g.eb.filter(b => !b.dead);
        g.items = g.items.filter(i => i.t > 0 && i.y < g.camY + H + 20);
      }

      function gameOver() {
        api.setHiScore(g.score); if (g.score > hi) hi = g.score;
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[523, .25], [494, .25], [466, .25], [440, .5], [349, .6]], { type: 'triangle', vol: 0.12 });
      }

      function update() {
        frame++; if (coinFlash) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        if (g.shake) g.shake--;
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 24);
        for (const q of g.pops) { q.t--; q.y -= 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (pendClear && --pendClear === 0 && pendFn) { const f = pendFn; pendFn = null; f(); }
        switch (g.phase) {
          case 'ready': if (--g.phaseT <= 0) g.phase = 'play'; break;
          case 'play': case 'boss': updPlay(); break;
          case 'dead': {
            g.p.dead++;
            for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
            for (const e of g.en) e.t++;
            if (--g.phaseT <= 0) {
              const cont = () => {
                const bossFight = !!g.boss;
                const p = g.p; resetPlayer(p.x, p.y); g.eb = [];
                if (solidAt(g.p.x - 4, g.p.y + 2, 8, 6)) { g.p.x = g.map.pathX(g.p.y); }
                g.en = g.en.filter(e => Math.hypot(e.x - g.p.x, e.y - g.p.y) > 50);
                g.phase = bossFight ? 'boss' : 'play';
              };
              if (g.lives > 1) { g.lives--; cont(); }
              else {
                g.phase = 'wait'; const cg = g;
                if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 3; cont(); } }, () => { if (g === cg) gameOver(); });
                else gameOver();
              }
            }
            break;
          }
          case 'clear':
            if (--g.phaseT <= 0) {
              g.stage++; if (g.stage % 4 === 0) g.loop++;
              startStage(false);
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
            break;
        }
      }

      // ================= Render =================
      function hash(x, y) { let n = (x * 374761393 + y * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
      function drawGround(ctx, camY, map) {
        const th = THEMES[map.th];
        ctx.fillStyle = th.g1; ctx.fillRect(0, 0, W, H);
        const y0 = Math.floor(camY / 8) * 8;
        for (let y = y0; y < camY + H; y += 8) {
          for (let x = 0; x < W; x += 8) {
            const h = hash(x >> 3, y >> 3);
            if (h < 0.25) { ctx.fillStyle = th.g2; ctx.fillRect(x + ((h * 40) | 0) % 6, y - camY + ((h * 90) | 0) % 6, 2, 1); }
          }
          // path band
          const px = map.pathX(y), sy = y - camY;
          ctx.fillStyle = th.pathE; ctx.fillRect(Math.round(px - 26), sy, 52, 8);
          ctx.fillStyle = th.path; ctx.fillRect(Math.round(px - 24), sy, 48, 8);
          // flagstones
          ctx.fillStyle = th.pathE;
          if (((y >> 3) & 1) === 0) { ctx.fillRect(Math.round(px - 24), sy, 48, 1); ctx.fillRect(Math.round(px), sy, 1, 8); }
          else { ctx.fillRect(Math.round(px - 12), sy, 1, 8); ctx.fillRect(Math.round(px + 12), sy, 1, 8); }
        }
      }
      function drawSolid(ctx, s, camY, th) {
        const x = Math.round(s.x), y = Math.round(s.y - camY);
        if (y > H + 30 || y < -40) return;
        switch (s.t) {
          case 'wall':
            ctx.fillStyle = '#d8d0c0'; ctx.fillRect(x, y - 6, s.w, 6);
            ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x, y - 8, s.w, 2);
            ctx.fillStyle = '#9a9488'; ctx.fillRect(x, y, s.w, s.h);
            ctx.fillStyle = '#6a645a'; for (let i = x; i < x + s.w; i += 8) ctx.fillRect(i, y + ((i >> 3) & 1) * 5, 1, 5);
            ctx.fillRect(x, y + 5, s.w, 1);
            break;
          case 'post': ctx.fillStyle = '#c02818'; ctx.fillRect(x + 1, y - 10, 4, s.h + 10); ctx.fillStyle = '#202020'; ctx.fillRect(x, y + s.h - 3, 6, 3); break;
          case 'lantern':
            ctx.fillStyle = '#8a8a8a'; ctx.fillRect(x + 2, y - 6, 4, 14); ctx.fillStyle = '#b0b0b0'; ctx.fillRect(x - 1, y - 10, 10, 3); ctx.fillRect(x, y - 7, 8, 4);
            ctx.fillStyle = (frame >> 3) & 1 ? '#ffd040' : '#ffa020'; ctx.fillRect(x + 2, y - 6, 4, 2); ctx.fillStyle = '#707070'; ctx.fillRect(x, y + 5, 8, 3);
            break;
          case 'tree':
            ctx.fillStyle = '#5a3818'; ctx.fillRect(x + 3, y - 4, 4, 10);
            ctx.fillStyle = th.tree2; ctx.fillRect(x - 6, y - 20, 22, 16); ctx.fillRect(x - 3, y - 24, 16, 22);
            ctx.fillStyle = th.tree; ctx.fillRect(x - 4, y - 20, 16, 12); ctx.fillRect(x - 1, y - 23, 10, 16);
            ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 1, y - 21, 5, 3);
            break;
          case 'bamboo':
            ctx.fillStyle = '#4a9a3a'; ctx.fillRect(x + 1, y - 28, 4, 36); ctx.fillStyle = '#2a6a20';
            for (let i = 0; i < 4; i++) ctx.fillRect(x + 1, y - 26 + i * 9, 4, 1);
            ctx.fillStyle = '#6ac050'; ctx.fillRect(x + 5, y - 24, 5, 2); ctx.fillRect(x - 4, y - 14, 5, 2);
            break;
          case 'grave':
            ctx.fillStyle = '#5a5a60'; ctx.fillRect(x, y + 4, s.w, 6); ctx.fillStyle = '#9a9aa8'; ctx.fillRect(x + 2, y - 10, s.w - 4, 16);
            ctx.fillStyle = '#5a5a68'; ctx.fillRect(x + 4, y - 7, 2, 9);
            ctx.fillStyle = '#8a7050'; ctx.fillRect(x + s.w - 2, y - 12, 1, 12);
            break;
          case 'rock':
            ctx.fillStyle = '#6a6a6a'; ctx.fillRect(x, y - 2, s.w, s.h + 2); ctx.fillStyle = '#9a9a9a'; ctx.fillRect(x + 2, y - 4, s.w - 6, 5); ctx.fillStyle = '#4a4a4a'; ctx.fillRect(x, y + s.h - 2, s.w, 2);
            break;
          case 'pond':
            ctx.fillStyle = '#6a5a40'; ctx.fillRect(x - 2, y - 2, s.w + 4, s.h + 4);
            ctx.fillStyle = '#2858a8'; ctx.fillRect(x, y, s.w, s.h);
            ctx.fillStyle = '#5888d8'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 6 + ((i * 13 + (frame >> 4)) % (s.w - 14)), y + 5 + i * 6, 6, 1);
            ctx.fillStyle = '#38a040'; ctx.fillRect(x + 8, y + 16, 5, 3); ctx.fillRect(x + 40, y + 6, 5, 3);
            break;
        }
      }
      function drawTorii(ctx, d, camY) {
        const x = Math.round(d.x), y = Math.round(d.y - camY);
        if (y > H + 30 || y < -40) return;
        ctx.fillStyle = '#202020'; ctx.fillRect(x - 32, y - 30, 64, 3);
        ctx.fillStyle = '#d83020'; ctx.fillRect(x - 30, y - 27, 60, 4); ctx.fillRect(x - 26, y - 20, 52, 3);
        ctx.fillStyle = '#202020'; ctx.fillRect(x - 3, y - 23, 6, 6); ctx.fillStyle = '#f0e0a0'; ctx.fillRect(x - 2, y - 22, 4, 4);
      }
      function drawSayo(ctx, p) {
        const d = p.dir;
        let set, flip = false;
        if (d === 2 || d === 1 || d === 3) set = SP.down; else if (d === 6 || d === 5 || d === 7) set = SP.up; else set = SP.side;
        if (d === 0) set = SP.side; if (d === 4) set = SP.sideL;
        const im = set[p.step];
        const x = Math.round(p.x - 6), y = Math.round(p.y - g.camY - 10);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 2, y + 15, 8, 2);
        ctx.drawImage(im, x, y);
        // gohei held in hand
        const a = d / 8 * TAU;
        if (!p.swing) {
          const hx = p.x + Math.cos(a) * 5, hy = p.y - g.camY - 1 + Math.sin(a) * 3;
          ctx.fillStyle = '#a07040'; ctx.fillRect(Math.round(hx), Math.round(hy - 6), 1, 7);
          ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(hx) - 1, Math.round(hy - 8), 3, 2);
        }
      }
      function drawSwing(ctx, p) {
        const k = 16 - p.swing, R = 14 + (g.wide ? 6 : 0);
        const base = p.dir / 8 * TAU - Math.PI * 0.9 + k / 16 * Math.PI * 1.8;
        const cx = p.x, cy = p.y - g.camY - 2;
        ctx.fillStyle = '#a07040';
        for (let i = 3; i < R; i += 1) ctx.fillRect(Math.round(cx + Math.cos(base) * i), Math.round(cy + Math.sin(base) * i), 1, 1);
        for (let j = 0; j < 4; j++) {
          const aa = base - j * 0.22, rr = R + 1;
          ctx.fillStyle = j & 1 ? '#e0e0ff' : '#ffffff';
          ctx.fillRect(Math.round(cx + Math.cos(aa) * rr) - 1, Math.round(cy + Math.sin(aa) * rr) - 1, 3, 3);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let j = 0; j < 10; j++) { const aa = base - j * 0.15; ctx.fillRect(Math.round(cx + Math.cos(aa) * (R + 3)), Math.round(cy + Math.sin(aa) * (R + 3)), 2, 2); }
      }
      function drawEnemy(ctx, e) {
        const set = e.face < 0 ? SP[e.k + 'L'] : SP[e.k];
        const im = set[(e.t >> 3) & 1];
        const x = Math.round(e.x - im.width / 2), y = Math.round(e.y - g.camY - im.height / 2 - e.z);
        if (e.appear) {
          if ((e.appear >> 1) & 1) { ctx.globalAlpha = 0.5; ctx.drawImage(im, x, y); ctx.globalAlpha = 1; }
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(Math.round(e.x - 5), Math.round(e.y - g.camY + 6), 10, 2);
        if (e.flash) { ctx.globalAlpha = 0.5; }
        ctx.drawImage(im, x, y);
        ctx.globalAlpha = 1;
      }
      function drawBoss(ctx, b) {
        const im = b.flash ? BOSSHIT[b.type] : BOSSSP[b.type];
        const x = Math.round(b.x - 20), y = Math.round(b.y - b.z - g.camY - 20);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(b.x - 16), Math.round(b.y - g.camY + 18), 32, 4);
        ctx.globalAlpha = clamp(b.alpha, 0, 1);
        const wob = b.type === 0 ? Math.round(Math.sin(b.t * 0.1)) : 0;
        ctx.drawImage(im, x, y + wob, 40, 40);
        if (b.type === 3) { // tails
          ctx.fillStyle = '#f8d838';
          for (let i = 0; i < 9; i++) { const a = Math.PI * 0.75 + i * 0.12 + Math.sin(b.t * 0.08 + i) * 0.1; ctx.fillRect(Math.round(b.x + 14 + Math.cos(a) * -16), Math.round(y + 28 + Math.sin(a) * 10), 4, 3); ctx.fillStyle = i & 1 ? '#f8d838' : '#fff'; }
        }
        ctx.globalAlpha = 1;
      }
      function drawHinotama(ctx, b) {
        const x = Math.round(b.x), y = Math.round(b.y - g.camY), f = (b.t >> 2) & 1;
        ctx.fillStyle = '#2050ff'; ctx.fillRect(x - 3, y - 2, 6, 5); ctx.fillRect(x - 2, y - 4 - f, 4, 3);
        ctx.fillStyle = '#80d0ff'; ctx.fillRect(x - 2, y - 1, 4, 3); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y, 2, 2);
      }
      function drawOfuda(ctx, s) {
        const x = Math.round(s.x), y = Math.round(s.y - g.camY), f = ((frame + s.life) >> 2) & 1;
        if (s.big) { ctx.fillStyle = 'rgba(255,80,80,0.5)'; ctx.fillRect(x - 4, y - 4, 8, 8); }
        ctx.fillStyle = '#fff';
        if (f) ctx.fillRect(x - 2, y - 3, 4, 7); else ctx.fillRect(x - 3, y - 2, 7, 4);
        ctx.fillStyle = '#e02020'; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      function drawItem(ctx, it) {
        if (it.t < 120 && (frame >> 2) & 1) return;
        const x = Math.round(it.x), y = Math.round(it.y - g.camY + Math.sin(frame * 0.1) * 1.5);
        const col = { red: ['#ff3030', '#ffa0a0'], blue: ['#3070ff', '#a0d0ff'], koban: ['#e0b020', '#fff0a0'], scroll: ['#f0f0f0', '#e02020'] }[it.k];
        if (it.k === 'koban') { ctx.fillStyle = col[0]; ctx.fillRect(x - 4, y - 6, 8, 12); ctx.fillRect(x - 5, y - 4, 10, 8); ctx.fillStyle = col[1]; ctx.fillRect(x - 2, y - 4, 1, 8); ctx.fillRect(x + 1, y - 4, 1, 8); return; }
        if (it.k === 'scroll') { ctx.fillStyle = '#a07040'; ctx.fillRect(x - 6, y - 4, 12, 2); ctx.fillRect(x - 6, y + 3, 12, 2); ctx.fillStyle = col[0]; ctx.fillRect(x - 5, y - 2, 10, 5); ctx.fillStyle = col[1]; ctx.fillRect(x - 1, y - 2, 2, 5); return; }
        ctx.fillStyle = col[0]; ctx.fillRect(x - 4, y - 3, 8, 6); ctx.fillRect(x - 3, y - 4, 6, 8);
        ctx.fillStyle = col[1]; ctx.fillRect(x - 2, y - 3, 2, 2);
        ctx.fillStyle = '#806040'; ctx.fillRect(x - 4, y + 4, 8, 2);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        if ((frame >> 4) & 1 || mode === 'title') text(ctx, '1UP', 8, 0, '#ff4040');
        text(ctx, String(g ? g.score : 0), 64, 8, '#fff', { right: true });
        text(ctx, 'HI-SCORE', 112, 0, '#ff4040', { center: true });
        text(ctx, String(Math.max(hi, g ? g.score : 0)), 136, 8, '#fff', { right: true });
        if (g && mode === 'game') {
          for (let i = 0; i < Math.min(5, g.lives - 1); i++) ctx.drawImage(LIFE, 4 + i * 10, H - 10);
          for (let i = 0; i < g.power; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(W - 10 - i * 7, H - 10, 4, 7); ctx.fillStyle = '#e02020'; ctx.fillRect(W - 9 - i * 7, H - 8, 2, 2); }
          if (g.wide) { ctx.fillStyle = '#60e0ff'; ctx.fillRect(W - 40, H - 3, Math.ceil(g.wide / 900 * 20), 2); }
          text(ctx, 'STAGE ' + (g.stage + 1), 220, 0, '#ffd838', { right: true });
        }
      }
      function drawTitle(ctx) {
        // night shrine backdrop
        ctx.fillStyle = '#100820'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f8f0c0'; ctx.fillRect(170, 30, 16, 16); ctx.fillRect(168, 33, 20, 10); ctx.fillStyle = '#100820'; ctx.fillRect(176, 30, 12, 12);
        for (let i = 0; i < 30; i++) { ctx.fillStyle = (i + (frame >> 4)) % 7 ? '#5050a0' : '#fff'; ctx.fillRect((i * 53) % W, 18 + (i * 29) % 90, 1, 1); }
        // torii
        ctx.fillStyle = '#c02818'; ctx.fillRect(40, 70, 6, 70); ctx.fillRect(178, 70, 6, 70); ctx.fillRect(26, 62, 172, 7); ctx.fillRect(34, 80, 156, 4);
        ctx.fillStyle = '#202020'; ctx.fillRect(22, 58, 180, 4);
        const t = titleT;
        const sc = 3;
        text(ctx, 'KIKI', 112 + 2, 90 + 2, '#300010', { center: true, scale: sc });
        text(ctx, 'KIKI', 112, 90, '#ff3040', { center: true, scale: sc });
        text(ctx, 'KAIKAI', 112 + 2, 116 + 2, '#300010', { center: true, scale: sc });
        text(ctx, 'KAIKAI', 112, 116, '#fff0d0', { center: true, scale: sc });
        text(ctx, '- SAYO-CHAN AND THE YOKAI -', 112, 146, '#c0a0ff', { center: true, adv: 7 });
        // parade of yokai
        const kinds = ['obake', 'hitotsume', 'kasa', 'chochin', 'nukekubi'];
        const phase = Math.floor(t / 400) % 2;
        if (phase === 0) {
          ctx.drawImage(SP.down[(frame >> 3) & 1], 20, 168);
          text(ctx, 'OFUDA  SPACE', 40, 168, '#fff'); text(ctx, 'GOHEI  X', 40, 178, '#fff');
          for (let i = 0; i < 5; i++) { const x = 140 + i * 16, y = 172 + Math.sin(frame * 0.08 + i) * 4; ctx.drawImage(SP[kinds[i]][(frame >> 3) & 1], x - 7, Math.round(y) - 6); }
        } else {
          for (let i = 0; i < 5; i++) {
            ctx.drawImage(SP[kinds[i]][(frame >> 3) & 1], 50, 160 + i * 14);
            text(ctx, String(SCORE[kinds[i]]) + ' PTS', 150, 163 + i * 14, '#fff', { right: true });
          }
        }
        if (api.credits > 0) { if ((frame >> 5) & 1) text(ctx, 'PUSH START', 112, 236, '#40ffff', { center: true }); }
        else if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', 112, 236, coinFlash ? '#ffd838' : '#ff4040', { center: true });
        text(ctx, '\u00a9 1986 TAITO (RECREATION)', 112, 222, '#a0a0a0', { center: true, adv: 7 });
        text(ctx, 'CREDIT ' + pad2(api.credits), 8, 247, '#fff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        const camY = g.camY + (g.shake ? ((g.shake & 2) - 1) * 2 : 0);
        const th = THEMES[g.map.th];
        drawGround(ctx, camY, g.map);
        // y-sorted world draw: solids first (they're short), then actors
        for (const s of g.map.solids) if (s.t === 'pond' || s.t === 'wall' || s.t === 'rock' || s.t === 'grave' || s.t === 'post') drawSolid(ctx, s, camY, th);
        for (const it of g.items) drawItem(ctx, it);
        const actors = [];
        for (const s of g.map.solids) if (s.t === 'lantern' || s.t === 'tree' || s.t === 'bamboo') actors.push({ y: s.y + s.h, f: () => drawSolid(ctx, s, camY, th) });
        for (const e of g.en) actors.push({ y: e.y + 6, f: () => drawEnemy(ctx, e) });
        const p = g.p;
        if (g.phase !== 'wait' && g.phase !== 'over') actors.push({
          y: p.y + 6, f: () => {
            if (p.dead) {
              const k = p.dead; const x = Math.round(p.x), y = Math.round(p.y - g.camY);
              if (k < 60) { const set = [SP.down, SP.sideL, SP.up, SP.side][(k >> 3) & 3]; ctx.drawImage(set[0], x - 6, y - 10); }
              else if (k < 100) { ctx.globalAlpha = 1 - (k - 60) / 40; ctx.drawImage(SP.down[0], x - 6, y - 10 - (k - 60)); ctx.globalAlpha = 1; }
              return;
            }
            if (p.inv && (frame >> 1) & 1) return;
            drawSayo(ctx, p); if (p.swing) drawSwing(ctx, p);
          }
        });
        actors.sort((a, b) => a.y - b.y).forEach(a => a.f());
        for (const d of g.map.deco) if (d.t === 'torii') drawTorii(ctx, d, camY);
        if (g.boss) drawBoss(ctx, g.boss);
        for (const s of g.shots) drawOfuda(ctx, s);
        for (const b of g.eb) drawHinotama(ctx, b);
        for (const f of g.fx) {
          if (f.t < 0) continue;
          const x = Math.round(f.x), y = Math.round(f.y - g.camY), r = 3 + f.t / 2;
          ctx.fillStyle = f.t < 8 ? '#fff' : f.t < 16 ? '#c0c0ff' : '#8080c0';
          for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + f.t * 0.05; ctx.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y + Math.sin(a) * r) - 1, 3, 3); }
        }
        for (const q of g.pops) text(ctx, q.txt, q.x, Math.round(q.y - g.camY), q.col, { center: true, adv: 6 });
        // boss bar
        if (g.boss) {
          const b = g.boss;
          text(ctx, BOSSNAME[b.type], 112, 20, '#ff8080', { center: true, adv: 7 });
          ctx.fillStyle = '#400'; ctx.fillRect(40, 29, 144, 4); ctx.fillStyle = '#ff3030'; ctx.fillRect(40, 29, Math.max(0, Math.round(144 * b.hp / b.max)), 4);
        }
        if (g.phase === 'ready') {
          text(ctx, 'STAGE ' + (g.stage + 1), 112, 100, '#ffd838', { center: true, scale: 2 });
          text(ctx, THEMES[g.map.th].name, 112, 122, '#fff', { center: true, shadow: '#000' });
          if (g.loop) text(ctx, 'ROUND ' + (g.loop + 1), 112, 134, '#ff8080', { center: true, shadow: '#000' });
        }
        if (g.phase === 'clear' && g.phaseT < 200) { text(ctx, 'STAGE CLEAR!', 112, 110, '#fff', { center: true, scale: 2, shadow: '#a00000' }); }
        if (g.phase === 'over') text(ctx, 'GAME OVER', 112, 120, '#ff4040', { center: true, scale: 2, shadow: '#000' });
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
