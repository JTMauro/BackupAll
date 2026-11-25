// Frogger (Konami / Sega, 1981) — browser recreation for Arcade Games Galore.
// Hand-made pixel art defined as string arrays + palettes; no external assets.
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pixel helpers
  // ---------------------------------------------------------------------------
  const FONTSRC = "01c26636363321c10c1c0c0c0c0c3f23e63071e3c707f33f060c1e03633e40e1e36667f060657e607e0303633e61e30607e63633e77f63060c18181883c62723c4f433e93e63633f03063cA1c3663637f6363B7e63637e63637eC1e33606060331eD7c66636363667cE7f60607e60607fF7f60607e606060G1f30606763331fH6363637f636363I3f0c0c0c0c0c3fJ0703030363633eK63666c787c6e67L3030303030303fM63777f7f6b6363N63737b7f6f6763O3e63636363633eP7e6363637e6060Q3e6363636f663dR7e6363677c6e67S3c66603e03633eT7e181818181818U6363636363633eV636363773e1c08W63636b7f7f7763X63773e1c3e7763Y6666663c181818Z7f070e1c38707f 00000000000000.00000000001818,00000000181830-0000003e000000!18181818180018?3e63060c0c000c=00007e007e0000:00181800181800'18183000000000\"6c6c4800000000/03060c18306000(0c18303030180c)180c0606060c18@1e214d514d211e*002a1c3e1c2a00+0008083e080800%62640810264600<060c1830180c06>30180c060c1830#14147f147f1414";
  const FONT = {};
  for (let i = 0; i + 15 <= FONTSRC.length; i += 15) {
    const rows = [];
    for (let r = 0; r < 7; r++) rows.push(parseInt(FONTSRC.substr(i + 1 + r * 2, 2), 16));
    FONT[FONTSRC[i]] = rows;
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').imageSmoothingEnabled = false; return c; }
  const glyphCache = new Map();
  function glyph(ch, col) {
    const k = ch + col; let g = glyphCache.get(k);
    if (g) return g;
    const rows = FONT[ch]; if (!rows) return null;
    g = mk(7, 7); const x = g.getContext('2d'); x.fillStyle = col;
    for (let r = 0; r < 7; r++) for (let b = 0; b < 7; b++) if (rows[r] & (64 >> b)) x.fillRect(b, r, 1, 1);
    glyphCache.set(k, g); return g;
  }
  function txt(ctx, s, x, y, col) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) { const g = glyph(s[i], col || '#fff'); if (g) ctx.drawImage(g, x + i * 8, y); }
  }
  function txtC(ctx, s, y, col) { s = String(s); txt(ctx, s, Math.round((224 - s.length * 8) / 2), y, col); }
  function spr(rows, pal) {
    let w = 0; for (const r of rows) w = Math.max(w, r.length);
    const c = mk(w, rows.length), x = c.getContext('2d');
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
    }
    return c;
  }
  function flip(c) { const o = mk(c.width, c.height), x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; }
  function rot(c, q) {
    q = ((q % 4) + 4) % 4; if (!q) return c;
    const w = c.width, h = c.height, o = (q & 1) ? mk(h, w) : mk(w, h), x = o.getContext('2d');
    x.translate(o.width / 2, o.height / 2); x.rotate(q * Math.PI / 2); x.drawImage(c, -w / 2, -h / 2); return o;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const chance = p => Math.random() < p;

  // ---------------------------------------------------------------------------
  // Pixel art
  // ---------------------------------------------------------------------------
  const FROG_SIT = [
    '................',
    '..D..........D..',
    '..GG.........GG.',
    '...GG.DGGD..GG..',
    '....GGYGGYGG....',
    '...GWWGYYGWWG...',
    '...GWKGGGGKWG...',
    '....GGGYYGGG....',
    '..DGGGYYYYGGGD..',
    '.GG.GGGYYGGG.GG.',
    '.G..GGGYYGGG..G.',
    '....GGGGGGGG....',
    '...DGGG..GGGD...',
    '..GGG......GGG..',
    '..GGGG....GGGG..',
    '................'];
  const FROG_HOP = [
    '...D........D...',
    '..GGG......GGG..',
    '...GG.DGGD.GG...',
    '....GGYGGYGG....',
    '...GWWGYYGWWG...',
    '...GWKGGGGKWG...',
    '....GGGYYGGG....',
    '....GGYYYYGG....',
    '....GGGYYGGG....',
    '....GGGGGGGG....',
    '....DGG..GGD....',
    '....GG....GG....',
    '....GG....GG....',
    '...GG......GG...',
    '...GG......GG...',
    '..GGG......GGG..'];
  const PAL_FROG = { G: '#28d828', D: '#108c10', Y: '#f8f840', W: '#ffffff', K: '#000000' };
  const PAL_LADY = { G: '#ff70c0', D: '#c02880', Y: '#ffe0f0', W: '#ffffff', K: '#000000' };

  const CAR_YELLOW = [
    '...KKK....KKK...',
    '...KKK....KKK...',
    '..YYYYYYYYYYYYY.',
    '.YYYYYCCYYYYYYYY',
    'YYYYYCCCYYYRRYYY',
    'YYYYYCCCYYYRRYYY',
    'YYYYYCCCYYYRRYYY',
    'YYYYYCCCYYYRRYYY',
    '.YYYYYCCYYYYYYYY',
    '..YYYYYYYYYYYYY.',
    '...KKK....KKK...',
    '...KKK....KKK...'];
  const TRACTOR = [
    '.WWWW.....KK....',
    '.WWWW.....KK....',
    'GGGGGGGGGG...B..',
    'GGGGGGGGGGGG.B..',
    'GGHHHGGGGGGGBBB.',
    'GGHHHGGGGGGGBBB.',
    'GGHHHGGGGGGGBBB.',
    'GGGGGGGGGGGG.B..',
    'GGGGGGGGGG...B..',
    '.WWWW.....KK....',
    '.WWWW.....KK....'];
  const CAR_PINK = [
    '...KK......KK...',
    '..PPPPPPPPPPPP..',
    '.PPPPPPPPPPPPPP.',
    'PPWWPPCCCPPPPPPP',
    'PPWWPCCCCCPPPPPP',
    'PPPPPCCCCCPPPPPP',
    'PPWWPCCCCCPPPPPP',
    'PPWWPPCCCPPPPPPP',
    '.PPPPPPPPPPPPPP.',
    '..PPPPPPPPPPPP..',
    '...KK......KK...'];
  const RACER = [
    '..KKK.....KKK...',
    '..KKK.....KKK...',
    'WWWWWWWWWWWWWW..',
    'WWRRWWWWWYYWWWWW',
    'WRRRWWWWYYYWWWWW',
    'WRRRWWWWYYYWWWW.',
    'WWRRWWWWWYYWWWWW',
    'WWWWWWWWWWWWWW..',
    '..KKK.....KKK...',
    '..KKK.....KKK...'];
  const TRUCK = [
    '..KKK.......KKK.......KKK.......',
    '..KKK.......KKK.......KKK.......',
    '.RRRRRR.WWWWWWWWWWWWWWWWWWWWWWW.',
    'RRCCRRR.WWWWWWWWWWWWWWWWWWWWWWWW',
    'RCCCRRRSWWWLWWWWWWWWLWWWWWWWLWWW',
    'RCCCRRRSWWWLWWWWWWWWLWWWWWWWLWWW',
    'RCCCRRRSWWWLWWWWWWWWLWWWWWWWLWWW',
    'RRCCRRR.WWWWWWWWWWWWWWWWWWWWWWWW',
    '.RRRRRR.WWWWWWWWWWWWWWWWWWWWWWW.',
    '..KKK.......KKK.......KKK.......',
    '..KKK.......KKK.......KKK.......'];
  const PAL_CAR = { K: '#6060a0', Y: '#f8f800', C: '#202060', R: '#ff2020', W: '#ffffff', G: '#28c028', H: '#f8f800', B: '#c0c0c0', P: '#e050ff', S: '#808080', L: '#d0d0d0' };

  const LOG_L = [
    '....DDDDDDDDDDDD',
    '..DDBBBBBBBBBBBB',
    '.DLLDBBBBBBBBBBB',
    'DLLLLDBBBDDBBBBB',
    'DLDDLDBBBBBBBBBB',
    'DLDDLDBBBBBBBDDB',
    'DLDDLDBBBBBBBBBB',
    'DLLLLDBDDBBBBBBB',
    '.DLLDBBBBBBBBBBB',
    '..DDBBBBBBBBBBBB',
    '....DDDDDDDDDDDD'];
  const LOG_M = [
    'DDDDDDDDDDDDDDDD',
    'BBBBBBBBBBBBBBBB',
    'BBBBBDDBBBBBBBBB',
    'BBBBBBBBBBBBDDBB',
    'BBBDDBBBBBBBBBBB',
    'BBBBBBBBBDDBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBBBBDDBBBBBBBB',
    'BBBBBBBBBBBBBBDD',
    'BBBBBBBBBBBBBBBB',
    'DDDDDDDDDDDDDDDD'];
  const LOG_R = [
    'DDDDDDDDDDDD....',
    'BBBBBBBBBBBBDD..',
    'BBBBBBBBBBBBBBD.',
    'BBBBBDDBBBBBBBBD',
    'BBBBBBBBBBBBBBBD',
    'BBBBBBBBBDDBBBBD',
    'BBBBBBBBBBBBBBBD',
    'BBBDDBBBBBBBBBBD',
    'BBBBBBBBBBBBBBD.',
    'BBBBBBBBBBBBDD..',
    'DDDDDDDDDDDD....'];
  const PAL_LOG = { D: '#5a2800', B: '#a85a10', L: '#f0b070' };

  const TURTLE_A = [
    '................',
    '....F......F....',
    '...FF.RRRR.FF...',
    '....RRrrrrRR....',
    '...RrRRrrRRrR...',
    'HH.RrrRRRRrrR...',
    'HHHRRRrrrrRRR...',
    'HHHRRRrrrrRRRF..',
    'HH.RrrRRRRrrR...',
    '...RrRRrrRRrR...',
    '....RRrrrrRR....',
    '...FF.RRRR.FF...',
    '....F......F....'];
  const TURTLE_B = [
    '................',
    '...F........F...',
    '..FF..RRRR..FF..',
    '...FRRrrrrRRF...',
    '...RrRRrrRRrR...',
    '.H.RrrRRRRrrR...',
    'HHHRRRrrrrRRR.F.',
    'HHHRRRrrrrRRRF..',
    '.H.RrrRRRRrrR...',
    '...RrRRrrRRrR...',
    '...FRRrrrrRRF...',
    '..FF..RRRR..FF..',
    '...F........F...'];
  const TURTLE_C = [
    '................',
    '................',
    '.....F.RRRR.F...',
    '....FRRrrrrRRF..',
    '...RrRRrrRRrR...',
    'HH.RrrRRRRrrR...',
    'HHHRRRrrrrRRR...',
    'HHHRRRrrrrRRR...',
    'HH.RrrRRRRrrR...',
    '...RrRRrrRRrR...',
    '....FRRrrrrRRF..',
    '.....F.RRRR.F...',
    '................'];
  const TURTLE_DIVE1 = [
    '................',
    '................',
    '................',
    '......RRRR......',
    '....RRrrrrRR....',
    '...RrrRRRRrrR...',
    '...RRRrrrrRRR...',
    '...RRRrrrrRRR...',
    '...RrrRRRRrrR...',
    '....RRrrrrRR....',
    '......RRRR......',
    '................',
    '................'];
  const TURTLE_DIVE2 = [
    '................',
    '................',
    '................',
    '................',
    '.....w.ww.w.....',
    '....w.RRRR.w....',
    '...w.RrrrrR.w...',
    '...w.RrrrrR.w...',
    '....w.RRRR.w....',
    '.....w.ww.w.....',
    '................',
    '................',
    '................'];
  const PAL_TURTLE = { R: '#e82000', r: '#901000', F: '#f8f8f8', H: '#f8f8f8', w: '#4080ff' };

  const CROC = [
    '................................................',
    '....d...d...d...d...d...d.......................',
    '..ddGGdGGGdGGGdGGGdGGGdGGd..........GGGGGG......',
    '.dGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWKGGGGGG....',
    'dGGGLLGGGLLGGGLLGGGLLGGGGGGGGGGGGGGGGGGGGGGGGGG.',
    'GGGLLLLGLLLLGLLLLGLLLLGGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGLLLLGLLLLGLLLLGLLLLGGGGGGGGGGGGGGGWWWWWWWWWW.',
    'dGGGLLGGGLLGGGLLGGGLLGGGGGGGGGGGGGGGGGGGGGGGGGG.',
    '.dGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....',
    '..ddGGdGGGdGGGdGGGdGGGdGGd..................... ',
    '....d...d...d...d...d...d.......................'];
  const CROC_OPEN = CROC.map((r, i) => {
    if (i === 3) return r.slice(0, 36) + 'WKGGG.......';
    if (i === 4) return r.slice(0, 36) + 'GGGG.W.W.W..';
    if (i === 5) return r.slice(0, 36) + 'GGG.........';
    if (i === 6) return r.slice(0, 36) + 'GGGG.W.W.W..';
    if (i === 7) return r.slice(0, 36) + 'GGGGGGGGGGG.';
    return r;
  });
  const PAL_CROC = { G: '#20a020', d: '#0c5c0c', L: '#70e040', W: '#ffffff', K: '#000000' };
  const CROC_HEAD = [
    '................',
    '................',
    '................',
    '....GGG..GGG....',
    '...GWKGGGGKWG...',
    '...GGGGGGGGGG...',
    '..GGLGGGGGGLGG..',
    '..GGGGGGGGGGGG..',
    '..GWGWGWGWGWGG..',
    '..G..........G..',
    '..GWGWGWGWGWGG..',
    '..GGGGGGGGGGGG..',
    '...GGGGGGGGGG...',
    '....GGGGGGGG....'];
  const FLY = [
    '................',
    '................',
    '...WW......WW...',
    '..WWWW....WWWW..',
    '..WWWWW..WWWWW..',
    '...WWWWWWWWWW...',
    '.....KYYYYK.....',
    '......YKKY......',
    '......YYYY......',
    '......KYYK......',
    '.......YY.......'];
  const PAL_FLY = { W: '#c0e8ff', K: '#404040', Y: '#f8f800' };
  const SNAKE_A = [
    '..............................PP',
    '..PP....PP....PP....PP.......PKP',
    '.PPPP..PPPP..PPPP..PPPP.....PPP.',
    'PP..PPPP..PPPP..PPPP..PPPPPPPP..',
    'P....PP....PP....PP....PPPP.....',
    '................................'];
  const SNAKE_B = [
    '..............................PP',
    'P....PP....PP....PP.........PKP.',
    'PP..PPPP..PPPP..PPPP..PPPPPPPP..',
    '.PPPP..PPPP..PPPP..PPPP..PPP....',
    '..PP....PP....PP....PP..........',
    '................................'];
  const PAL_SNAKE = { P: '#30e030', K: '#ff2020' };
  const SKULL = [
    '................',
    '.....WWWWWW.....',
    '....WWWWWWWW....',
    '...WWWWWWWWWW...',
    '...WKKWWWWKKW...',
    '...WKKWWWWKKW...',
    '...WWWWKKWWWW...',
    '....WWWWWWWW....',
    '.....W.WW.W.....',
    'WW...WWWWWW...WW',
    '.WWW..WWWW..WWW.',
    '...WWW....WWW...',
    '....WWW..WWW....',
    '.WWW...WW...WWW.',
    'WW............WW',
    '................'];
  const SPLAT1 = [
    '................',
    '..Y..........Y..',
    '...Y...YY...Y...',
    '....YYYYYYYY....',
    '...YYRRRRRRYY...',
    '..YYRRRRRRRRYY..',
    '.YYRRRRRRRRRRYY.',
    '..YYRRRRRRRRYY..',
    '...YYRRRRRRYY...',
    '....YYYYYYYY....',
    '...Y...YY...Y...',
    '..Y..........Y..'];
  const SPLAT2 = [
    'Y......Y......Y.',
    '.Y.....Y.....Y..',
    '..Y..R...R..Y...',
    '.....RRRRR......',
    '...RR.RRR.RR....',
    'YY..RRR.RRR...YY',
    '...RR.RRR.RR....',
    '.....RRRRR......',
    '..Y..R...R..Y...',
    '.Y.....Y.....Y..',
    'Y......Y......Y.'];
  const SPLASH1 = [
    '................',
    '................',
    '......W..W......',
    '....W..WW..W....',
    '.....WBBBBW.....',
    '...WBBBBBBBBW...',
    '..W.BBBBBBBB.W..',
    '...WBBBBBBBBW...',
    '.....WBBBBW.....',
    '....W..WW..W....',
    '......W..W......'];
  const SPLASH2 = [
    '...W...W...W....',
    '.W...........W..',
    '....W.....W.....',
    'W..............W',
    '...B.........B..',
    '.W.....BB.....W.',
    '...B.........B..',
    'W..............W',
    '....W.....W.....',
    '.W...........W..',
    '...W...W...W....'];
  const PAL_DEATH = { Y: '#f8f800', R: '#ff3030', W: '#ffffff', B: '#4090ff' };
  const LIFE = ['..G..G..', '.GGGGGG.', 'GGYGGYGG', '.GGGGGG.', 'GG.GG.GG', 'G......G'];

  let SP = null;
  function buildSprites() {
    if (SP) return SP;
    const four = c => [c, rot(c, 1), rot(c, 2), rot(c, 3)]; // up, right, down, left
    const fs = spr(FROG_SIT, PAL_FROG), fh = spr(FROG_HOP, PAL_FROG);
    const ls = spr(FROG_SIT, PAL_LADY), lh = spr(FROG_HOP, PAL_LADY);
    const lr = (rows) => { const s = spr(rows, PAL_CAR); return [s, flip(s)]; };
    SP = {
      frog: four(fs), frogHop: four(fh), lady: four(ls), ladyHop: four(lh),
      carYellow: lr(CAR_YELLOW), tractor: lr(TRACTOR), carPink: lr(CAR_PINK), racer: lr(RACER), truck: lr(TRUCK),
      logL: spr(LOG_L, PAL_LOG), logM: spr(LOG_M, PAL_LOG), logR: spr(LOG_R, PAL_LOG),
      turtle: [spr(TURTLE_A, PAL_TURTLE), spr(TURTLE_B, PAL_TURTLE), spr(TURTLE_C, PAL_TURTLE)],
      turtleDive: [spr(TURTLE_DIVE1, PAL_TURTLE), spr(TURTLE_DIVE2, PAL_TURTLE)],
      croc: [spr(CROC, PAL_CROC), spr(CROC_OPEN, PAL_CROC)],
      crocHead: spr(CROC_HEAD, PAL_CROC),
      fly: spr(FLY, PAL_FLY),
      snake: [spr(SNAKE_A, PAL_SNAKE), spr(SNAKE_B, PAL_SNAKE)],
      skull: spr(SKULL, { W: '#ffffff', K: '#000000' }),
      splat: [spr(SPLAT1, PAL_DEATH), spr(SPLAT2, PAL_DEATH)],
      splash: [spr(SPLASH1, PAL_DEATH), spr(SPLASH2, PAL_DEATH)],
      life: spr(LIFE, PAL_FROG)
    };
    SP.snakeL = SP.snake.map(flip);
    return SP;
  }

  // background tiles
  let BG = null;
  function buildBG() {
    if (BG) return BG;
    const c = mk(224, 256), x = c.getContext('2d');
    x.fillStyle = '#000047'; x.fillRect(0, 24, 224, 104);   // river (incl. home row)
    x.fillStyle = '#000000'; x.fillRect(0, 128, 224, 128);
    // purple sidewalks (median & start)
    const walk = (y) => {
      for (let i = 0; i < 224; i += 8) {
        x.fillStyle = '#9c1cc8'; x.fillRect(i, y, 8, 16);
        x.fillStyle = '#d070ff'; x.fillRect(i, y, 7, 1); x.fillRect(i, y + 8, 7, 1); x.fillRect(i, y, 1, 7); x.fillRect(i + 4, y + 8, 1, 7);
        x.fillStyle = '#5c0080'; x.fillRect(i + 7, y + 1, 1, 7); x.fillRect(i + 3, y + 9, 1, 7); x.fillRect(i, y + 7, 8, 1); x.fillRect(i, y + 15, 8, 1);
      }
    };
    walk(128); walk(224);
    // hedge home row with 5 bays
    for (let i = 0; i < 224; i++) {
      for (let j = 16; j < 48; j++) {
        const n = (i * 37 + j * 91 + ((i * j) >> 3)) % 11;
        x.fillStyle = n < 3 ? '#006000' : n < 7 ? '#00a000' : '#20d020';
        x.fillRect(i, j, 1, 1);
      }
    }
    for (const cx of BAYS) {
      x.fillStyle = '#000047'; x.fillRect(cx - 12, 28, 24, 20);
      x.fillStyle = '#00a000'; x.fillRect(cx - 12, 28, 1, 20); x.fillRect(cx + 11, 28, 1, 20);
    }
    x.fillStyle = '#20d020'; x.fillRect(0, 16, 224, 1);
    BG = c; return c;
  }
  const BAYS = [24, 68, 112, 156, 200];

  // ---------------------------------------------------------------------------
  ArcadeRegistry.register({
    id: 'frogger',
    title: 'Frogger',
    year: 1981,
    maker: 'Konami',
    width: 224, height: 256,
    controls: 'Arrows: hop · Enter: start',
    marquee: { bg: '#000047', fg: '#28d828', accent: '#e050ff' },
    create(api) {
      const sp = buildSprites(); const bg = buildBG();
      const au = api.audio;
      const W = 224, H = 256, L = 288; // lane wrap length (visible 224 + 64 offscreen)
      const TIME = 1800;

      const S = { mode: 'title', t: 0, score: 0, hi: api.getHiScore(10000), lives: 4, level: 1, extra: false, homes: [0, 0, 0, 0, 0], timer: TIME, msg: '', msgT: 0 };
      let F = null, lanes = [], bayFx = { fly: -1, flyT: 0, croc: -1, crocT: 0, timer: 300 }, lady = null, snake = null, popups = [];
      let bgmT = 0, bgmI = 0;

      // Melody loosely in the style of Frogger's folk-song soundtrack
      const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880 };
      const TUNE = [
        ['E5', 1], ['E5', 1], ['D5', 1], ['C5', 1], ['D5', 1], ['E5', 1], ['G5', 2],
        ['E5', 1], ['D5', 1], ['C5', 1], ['A4', 1], ['G4', 2], ['G4', 2],
        ['A4', 1], ['C5', 1], ['D5', 1], ['E5', 1], ['D5', 1], ['C5', 1], ['A4', 2],
        ['C5', 1], ['A4', 1], ['G4', 1], ['E4', 1], ['G4', 4],
        ['G4', 1], ['A4', 1], ['C5', 1], ['C5', 1], ['D5', 1], ['E5', 1], ['D5', 2],
        ['E5', 1], ['G5', 1], ['E5', 1], ['D5', 1], ['C5', 2], ['A4', 2],
        ['G4', 1], ['A4', 1], ['C5', 1], ['D5', 1], ['E5', 1], ['D5', 1], ['C5', 2],
        ['A4', 1], ['C5', 1], ['G4', 2], ['C5', 4]
      ];
      const BASS = ['C4', 'G4', 'A4', 'E4', 'F4', 'C4', 'G4', 'G4'];
      const snd = {
        hop() { au.tone(880, 0.05, { type: 'square', vol: 0.06, slideTo: 440 }); },
        squash() { au.noise(0.35, { vol: 0.3, freq: 1500, slideTo: 100 }); au.tone(200, 0.3, { type: 'square', vol: 0.08, slideTo: 50 }); },
        splash() { au.noise(0.6, { vol: 0.25, freq: 2500, slideTo: 300, type: 'bandpass' }); au.tone(600, 0.3, { type: 'sine', vol: 0.06, slideTo: 150 }); },
        death() { au.melody([[784, 0.1], [740, 0.1], [698, 0.1], [659, 0.1], [622, 0.1], [587, 0.1], [554, 0.15], [523, 0.4]], { type: 'square', vol: 0.06, delay: 0.4 }); },
        home() { au.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [784, 0.08], [1047, 0.25]], { type: 'square', vol: 0.07 }); },
        bonus() { au.melody([[1047, 0.06], [1319, 0.06], [1568, 0.06], [2093, 0.15]], { type: 'square', vol: 0.07 }); },
        allHome() { au.melody([[523, 0.12], [587, 0.12], [659, 0.12], [784, 0.24], [659, 0.12], [784, 0.12], [1047, 0.5]], { type: 'square', vol: 0.08 }); },
        warn() { au.tone(1760, 0.05, { type: 'square', vol: 0.05 }); },
        start() { au.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.24], [659, 0.12], [784, 0.36]], { type: 'square', vol: 0.07 }); },
        extra() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.07 }); }
      };

      // ---------------- lanes ----------------
      // rows: 0 start(y224) 1..5 road, 6 median, 7..11 river, 12 home(y32)
      const rowY = r => 224 - r * 16;
      function buildLanes() {
        const lv = S.level, m = Math.min(2.2, 1 + 0.18 * (lv - 1));
        const mkLane = (row, dir, speed, kind, xs, w, o) => ({ row, y: rowY(row), dir, speed: speed * m, kind, items: xs.map(x => Object.assign({ x, w }, o || {})) });
        lanes = [
          mkLane(1, -1, 0.45, 'carYellow', [0, 96, 192], 16),
          mkLane(2, 1, 0.55, 'tractor', [20, 116, 212], 16),
          mkLane(3, -1, 0.75, 'carPink', [10, 106, 202].concat(lv >= 3 ? [58] : []), 16),
          mkLane(4, 1, 1.5, 'racer', lv >= 2 ? [0, 144] : [0], 16),
          mkLane(5, -1, 0.65, 'truck', [0, 144].concat(lv >= 4 ? [72] : []), 32),
          mkLane(7, -1, 0.55, 'turtle', [0, 96, 192], 48, { n: 3 }),
          mkLane(8, 1, 0.45, 'log', lv >= 3 ? [0, 144] : [0, 96, 192], 48),
          mkLane(9, 1, 1.05, 'log', [0, 160], lv >= 4 ? 80 : 96),
          mkLane(10, -1, 0.65, 'turtle', [0, 72, 144, 216], 32, { n: 2 }),
          mkLane(11, 1, 0.75, 'log', [0, 96, 192], 64)
        ];
        // diving turtle groups (more from level 2)
        lanes[5].items[1].dive = 0; lanes[8].items[2].dive = 100;
        if (lv >= 2) { lanes[5].items[2].dive = 200; lanes[8].items[0].dive = 50; }
        for (const ln of lanes) for (const it of ln.items) if (it.dive != null) { it.diveT = it.dive; it.phase = 0; }
        // crocodile replaces a log in the top lane from level 2
        if (lv >= 2) { const it = lanes[9].items[1]; it.croc = true; it.w = 48; }
      }
      function itemX(ln, it) { return it.x - 32; }
      function itemPhase(it) { // 0 surfaced, 1 diving, 2 deep, 3 rising
        if (it.dive == null) return 0;
        const c = it.diveT % 360;
        return c < 230 ? 0 : c < 260 ? 1 : c < 320 ? 2 : 3;
      }
      function updateLanes() {
        for (const ln of lanes) {
          for (const it of ln.items) {
            it.x += ln.dir * ln.speed;
            if (it.x >= L) it.x -= L; if (it.x < 0) it.x += L;
            if (it.dive != null) it.diveT++;
          }
        }
      }

      // ---------------- frog ----------------
      function newFrog() {
        F = { x: 104, row: 0, y: rowY(0), dir: 0, hop: 0, buf: -1, cool: 0, hx: 0, hy: 0, maxRow: 0, dead: 0, how: '', withLady: false };
        S.timer = TIME;
      }
      function startGame() {
        S.score = 0; S.lives = 4; S.level = 1; S.extra = false; S.homes = [0, 0, 0, 0, 0];
        buildLanes(); newFrog(); lady = null; snake = null; popups = [];
        bayFx = { fly: -1, flyT: 0, croc: -1, crocT: 0, timer: 300 };
        S.mode = 'play'; S.t = 0; snd.start(); bgmT = -90;
      }
      function addScore(n, x, y) {
        S.score += n;
        if (!S.extra && S.score >= 20000) { S.extra = true; S.lives++; snd.extra(); }
        if (S.score > S.hi) S.hi = S.score;
        if (x != null) popups.push({ x, y, s: String(n), t: 60 });
      }
      function kill(how) {
        if (F.dead) return;
        F.dead = 1; F.how = how;
        if (how === 'water' || how === 'off') snd.splash(); else snd.squash();
        snd.death();
        if (F.withLady) { F.withLady = false; lady = null; }
      }
      function frogSupport() {
        // what is the frog standing on in a river row?
        const ln = lanes.find(l => l.row === F.row);
        if (!ln) return null;
        const cx = F.x + 8;
        for (const it of ln.items) {
          const x0 = itemX(ln, it);
          if (cx < x0 + 3 || cx > x0 + it.w - 3) continue;
          if (ln.kind === 'turtle' && itemPhase(it) === 2) continue;
          if (it.croc) {
            const open = ((api.frame / 40) | 0) % 2 === 1;
            if (cx > x0 + 34) return open ? 'mouth' : { ln, it };
          }
          return { ln, it };
        }
        return null;
      }
      function reachHome() {
        const cx = F.x + 8;
        let bay = -1;
        for (let i = 0; i < 5; i++) if (Math.abs(cx - BAYS[i]) <= 9) bay = i;
        if (bay < 0 || S.homes[bay]) { kill('hedge'); return; }
        if (bayFx.croc === bay && bayFx.crocT > 40) { kill('croc'); return; }
        S.homes[bay] = 1;
        F.x = BAYS[bay] - 8;
        let pts = 50 + Math.floor(S.timer / 30) * 10;
        addScore(pts, null, null);
        S.msg = 'TIME ' + Math.ceil((TIME - S.timer) / 60); S.msgT = 90;
        if (bayFx.fly === bay) { addScore(200, BAYS[bay] - 12, 36); bayFx.fly = -1; snd.bonus(); }
        if (F.withLady) { addScore(200, BAYS[bay] - 12, 36); lady = null; snd.bonus(); }
        if (bayFx.croc === bay) bayFx.croc = -1;
        snd.home();
        if (S.homes.every(h => h)) {
          addScore(1000, null, null); snd.allHome();
          S.mode = 'levelclear'; S.t = 0;
        } else newFrog();
      }
      function updateFrog() {
        if (F.dead) {
          F.dead++;
          if (F.dead > 110) {
            S.lives--;
            if (S.lives <= 0) {
              const over = () => { api.setHiScore(S.score); S.hi = Math.max(S.hi, api.getHiScore(0)); S.mode = 'gameover'; S.t = 0; };
              // last frog lost: offer a continue — a fresh frog starts on the same level, filled homes kept
              if (api.offerContinue) api.offerContinue(() => { S.lives = 4; newFrog(); }, over);
              else over();
            }
            else newFrog();
          }
          return;
        }
        // timer
        S.timer--;
        if (S.timer === 480 || S.timer === 300 || S.timer === 180 || S.timer === 60) snd.warn();
        if (S.timer <= 0) { kill('time'); return; }
        if (F.hop > 0) {
          for (let i = 0, cs = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']; i < 4; i++) if (api.pressed(cs[i])) F.buf = i;
          F.hop--;
          F.x += F.hx / 8; F.y += F.hy / 8;
          if (F.hop === 0) {
            F.y = rowY(F.row);
            if (F.row === 12) { reachHome(); return; }
            if (F.row > F.maxRow) { addScore(10 * (F.row - F.maxRow), null, null); F.maxRow = F.row; }
          }
        } else {
          let d = -1;
          const codes = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
          for (let i = 0; i < 4; i++) if (api.pressed(codes[i]) || (F.buf === i)) { d = i; F.buf = -1; break; }
          if (d < 0 && (F.cool | 0) <= 0) for (let i = 0; i < 4; i++) if (api.key(codes[i])) { d = i; break; }
          if (d >= 0 && (F.cool | 0) > 0 && api.pressed(codes[d])) { F.buf = d; d = -1; }
          if (d >= 0 && (F.cool | 0) <= 0) {
            const dr = d === 0 ? 1 : d === 2 ? -1 : 0, dx = d === 1 ? 16 : d === 3 ? -16 : 0;
            const nr = F.row + dr;
            F.dir = d;
            if (nr >= 0 && nr <= 12 && F.x + dx >= -2 && F.x + dx <= W - 14) {
              F.row = nr; F.hop = 8; F.hx = dx; F.hy = -dr * 16; snd.hop(); F.cool = 10;
            } else F.cool = 6;
          }
        }
        if (F.cool > 0) F.cool--;
        // river: ride or drown
        if (F.row >= 7 && F.row <= 11 && F.hop === 0) {
          const s = frogSupport();
          if (!s) { kill('water'); return; }
          if (s === 'mouth') { kill('croc'); return; }
          F.x += s.ln.dir * s.ln.speed;
          if (F.x < -6 || F.x > W - 10) { kill('off'); return; }
        } else if (F.row >= 7 && F.row <= 11 && F.hop > 0) {
          // keep drifting with the lane we are leaving/arriving on while in the air
          const ln = lanes.find(l => l.row === F.row);
          if (ln && F.hop < 4) F.x += ln.dir * ln.speed;
        }
        // road: vehicles
        if (F.row >= 1 && F.row <= 5) {
          const ln = lanes.find(l => l.row === F.row);
          for (const it of ln.items) {
            const x0 = itemX(ln, it);
            if (F.x + 13 > x0 + 1 && F.x + 3 < x0 + it.w - 1 && Math.abs(F.y - ln.y) < 10) { kill('car'); return; }
          }
        }
        // snake on the median
        if (snake && F.row === snake.row && Math.abs(F.y - rowY(snake.row)) < 8) {
          const hx = snake.dir > 0 ? snake.x + 28 : snake.x + 2;
          if (F.x + 13 > hx - 4 && F.x + 3 < hx + 6) { kill('snake'); return; }
        }
        // lady frog pick-up
        if (lady && !F.withLady && F.hop === 0 && F.row === lady.ln.row && Math.abs(F.x + 8 - (itemX(lady.ln, lady.it) + lady.off + 8)) < 10) {
          F.withLady = true; snd.bonus();
        }
      }

      // ---------------- extras: fly, croc head, lady, snake ----------------
      function updateExtras() {
        bayFx.timer--;
        if (bayFx.flyT > 0 && --bayFx.flyT === 0) bayFx.fly = -1;
        if (bayFx.crocT > 0 && ++bayFx.crocT > 300) { bayFx.croc = -1; bayFx.crocT = 0; }
        if (bayFx.timer <= 0) {
          bayFx.timer = (rnd(240, 420)) | 0;
          const empty = [0, 1, 2, 3, 4].filter(i => !S.homes[i] && i !== bayFx.fly && i !== bayFx.croc);
          if (empty.length) {
            const b = empty[(Math.random() * empty.length) | 0];
            if (S.level >= 2 && chance(0.4) && bayFx.croc < 0) { bayFx.croc = b; bayFx.crocT = 1; }
            else if (bayFx.fly < 0) { bayFx.fly = b; bayFx.flyT = 300; }
          }
        }
        // lady frog appears on a short log
        if (!lady && !F.withLady && chance(0.002)) {
          const ln = lanes.find(l => l.row === 8);
          const it = ln.items[(Math.random() * ln.items.length) | 0];
          const x0 = itemX(ln, it);
          if (x0 < -20) lady = { ln, it, off: 0, dir: 1, t: 0 };
        }
        if (lady && !F.withLady) {
          lady.t++;
          if (lady.t % 40 === 0) { lady.off += lady.dir * 16; if (lady.off <= 0 || lady.off >= lady.it.w - 16) lady.dir = -lady.dir; lady.off = Math.max(0, Math.min(lady.it.w - 16, lady.off)); }
          if (lady.t > 900) lady = null;
        }
        // snake on the median (level 2+)
        if (S.level >= 2) {
          if (!snake) snake = { row: 6, x: -32, dir: 1, t: 0 };
          snake.t++;
          snake.x += snake.dir * 0.5;
          if (snake.x > W - 32 || snake.x < 0) { if (snake.x > W + 40 || snake.x < -40) snake.dir = -snake.dir; else if (chance(0.01)) snake.dir = -snake.dir; }
          if (snake.x > W + 40) snake.dir = -1; if (snake.x < -40) snake.dir = 1;
        }
      }

      // ---------------- update ----------------
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      function update() {
        S.t++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        const cr = api.credits;
        if (S.mode === 'title') {
          if (!lanes.length) buildLanes();
          updateLanes();
          if (lastCredits === 0 && cr > 0) { coinHold = 150; coinFlash = 0; }
          lastCredits = cr;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); }
            else { coinFlash = 150; api.audio.tone(70, 0.28, { type: 'square', vol: 0.3 }); api.audio.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 }); }
          }
          return;
        }
        lastCredits = cr;
        if (S.mode === 'gameover') {
          updateLanes();
          if (S.t > 240 || (S.t > 60 && api.anyPressed('Enter'))) { S.mode = 'title'; S.t = 0; }
          return;
        }
        if (S.mode === 'levelclear') {
          if (S.t > 150) { S.level++; S.homes = [0, 0, 0, 0, 0]; buildLanes(); newFrog(); snake = null; lady = null; S.mode = 'play'; S.t = 0; }
          return;
        }
        updateLanes();
        updateExtras();
        updateFrog();
        if (S.msgT > 0) S.msgT--;
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        // music
        bgmT++;
        if (bgmT > 0 && bgmT % 9 === 0 && !F.dead) {
          const [n, d] = TUNE[bgmI % TUNE.length];
          if (!S.nextNoteT || bgmT >= S.nextNoteT) {
            au.tone(N[n], d * 0.14, { type: 'square', vol: 0.035 });
            if (bgmI % 4 === 0) au.tone(N[BASS[(bgmI / 4 | 0) % BASS.length]] / 2, 0.25, { type: 'triangle', vol: 0.08 });
            S.nextNoteT = bgmT + d * 9; bgmI++;
          }
        }
      }

      // ---------------- rendering ----------------
      function drawLane(ctx, ln) {
        for (const it of ln.items) {
          const x = Math.round(itemX(ln, it)), y = ln.y;
          const d = ln.dir < 0 ? 0 : 1;
          switch (ln.kind) {
            case 'carYellow': ctx.drawImage(sp.carYellow[d], x, y + 2); break;
            case 'tractor': ctx.drawImage(sp.tractor[ln.dir > 0 ? 0 : 1], x, y + 2); break;
            case 'carPink': ctx.drawImage(sp.carPink[d], x, y + 2); break;
            case 'racer': ctx.drawImage(sp.racer[ln.dir > 0 ? 0 : 1], x, y + 3); break;
            case 'truck': ctx.drawImage(sp.truck[d], x, y + 2); break;
            case 'log':
              if (it.croc) { ctx.drawImage(sp.croc[((api.frame / 40) | 0) % 2], x, y + 2); break; }
              ctx.drawImage(sp.logL, x, y + 2);
              for (let k = 16; k < it.w - 16; k += 16) ctx.drawImage(sp.logM, x + k, y + 2);
              ctx.drawImage(sp.logR, x + it.w - 16, y + 2);
              break;
            case 'turtle': {
              const ph = itemPhase(it);
              for (let k = 0; k < it.n; k++) {
                let s;
                if (ph === 0) s = sp.turtle[((api.frame >> 3) + k) % 3];
                else if (ph === 1 || ph === 3) s = sp.turtleDive[0];
                else s = (api.frame >> 3) & 1 ? sp.turtleDive[1] : null;
                if (ph === 2) s = sp.turtleDive[1];
                if (s && !(ph === 2 && (api.frame >> 2) & 1)) ctx.drawImage(s, x + k * 16, y + 1);
              }
              break;
            }
          }
        }
      }
      function drawFrog(ctx) {
        const x = Math.round(F.x), y = Math.round(F.y);
        if (F.dead) {
          const t = F.dead;
          const water = F.how === 'water' || F.how === 'off';
          if (t < 60) ctx.drawImage((water ? sp.splash : sp.splat)[(t >> 4) & 1], x, y + 2);
          else ctx.drawImage(sp.skull, x, y);
          return;
        }
        const s = (F.hop > 0 ? sp.frogHop : sp.frog)[F.dir];
        ctx.drawImage(s, x, y);
        if (F.withLady) ctx.drawImage(sp.lady[F.dir], x, y - 3);
      }
      function drawHUD(ctx) {
        txt(ctx, '1-UP', 16, 0, '#ffffff'); txt(ctx, 'HI-SCORE', 80, 0, '#ffffff');
        txt(ctx, String(S.score).padStart(5, '0'), 16, 8, '#ff2020'); txt(ctx, String(S.hi).padStart(5, '0'), 96, 8, '#ff2020');
        if (S.mode === 'title') { txt(ctx, 'CREDIT ' + String(Math.min(api.credits, 99)).padStart(2, '0'), 152, 248, '#00e8e8'); return; }
        for (let i = 0; i < Math.min(S.lives - 1, 8); i++) ctx.drawImage(sp.life, 2 + i * 9, 242);
        // level flags
        for (let i = 0; i < Math.min(S.level, 6); i++) { ctx.fillStyle = '#ff2020'; ctx.fillRect(214 - i * 6, 241, 4, 4); ctx.fillStyle = '#f8f800'; ctx.fillRect(214 - i * 6, 245, 1, 3); }
        // time bar
        const w = Math.max(0, Math.round(S.timer / TIME * 112));
        ctx.fillStyle = S.timer < 480 ? '#ff2020' : '#28d828';
        ctx.fillRect(176 - w, 249, w, 6);
        txt(ctx, 'TIME', 184, 249, '#f8f800');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (S.mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        ctx.drawImage(bg, 0, 0);
        // home bays content
        for (let i = 0; i < 5; i++) {
          const x = BAYS[i] - 8;
          if (S.homes[i]) ctx.drawImage(sp.frog[2], x, 30);
          else if (bayFx.fly === i) ctx.drawImage(sp.fly, x, 32);
          else if (bayFx.croc === i) {
            const peek = bayFx.crocT < 40;
            ctx.drawImage(sp.crocHead, 0, peek ? 6 : 0, 16, peek ? 8 : 14, x, peek ? 38 : 32, 16, peek ? 8 : 14);
          }
        }
        for (const ln of lanes) if (ln.row >= 7) drawLane(ctx, ln);
        if (lady && !F.withLady) { const x = itemX(lady.ln, lady.it) + lady.off; ctx.drawImage(sp.lady[lady.ln.dir > 0 ? 1 : 3], Math.round(x), lady.ln.y); }
        for (const ln of lanes) if (ln.row < 7) drawLane(ctx, ln);
        if (snake) ctx.drawImage((snake.dir > 0 ? sp.snake : sp.snakeL)[(snake.t >> 4) & 1], Math.round(snake.x), rowY(snake.row) + 5);
        if (S.mode === 'play' || S.mode === 'levelclear' || S.mode === 'gameover') { if (S.mode !== 'levelclear') drawFrog(ctx); }
        for (const p of popups) txt(ctx, p.s, Math.round(p.x), Math.round(p.y), '#ffffff');
        drawHUD(ctx);
        if (S.msgT > 0) { ctx.fillStyle = '#000'; ctx.fillRect(76, 132, 72, 9); txtC(ctx, S.msg, 133, '#ff2020'); }
        if (S.mode === 'levelclear') { ctx.fillStyle = '#000'; ctx.fillRect(56, 130, 112, 12); txtC(ctx, 'WELL DONE !', 132, '#f8f800'); }
        if (S.mode === 'play' && S.t < 90) { ctx.fillStyle = '#000'; ctx.fillRect(64, 130, 96, 12); txtC(ctx, 'START', 132, '#f8f800'); }
        if (S.mode === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(64, 130, 96, 12); txtC(ctx, 'GAME OVER', 132, '#ff2020'); }
      }
      function drawTitle(ctx) {
        ctx.drawImage(bg, 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 16, 224, 224);
        for (const ln of lanes) drawLane(ctx, ln);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 40, 224, 168);
        // FROGGER logo in green blocks
        const s = 'FROGGER', k = 3;
        let x0 = (W - (s.length * 8 * k - k)) >> 1;
        for (const ch of s) {
          const rows = FONT[ch];
          for (let r = 0; r < 7; r++) for (let b = 0; b < 7; b++) if (rows[r] & (64 >> b)) {
            ctx.fillStyle = '#28d828'; ctx.fillRect(x0 + b * k, 48 + r * k, k, k);
            ctx.fillStyle = '#f8f800'; ctx.fillRect(x0 + b * k, 48 + r * k, k, 1);
          }
          x0 += 8 * k;
        }
        ctx.drawImage(sp.frog[0], 104, 76);
        txtC(ctx, '-POINT TABLE-', 98, '#e050ff');
        txt(ctx, '10 PTS EACH STEP', 16, 112, '#ffffff');
        txt(ctx, '50 PTS PER FROG HOME', 16, 122, '#ffffff');
        txt(ctx, '1000 PTS FIVE HOMES', 16, 132, '#ffffff');
        txt(ctx, 'BONUS 10 PTS X', 16, 142, '#ffffff');
        txt(ctx, 'REMAINING HALF SEC.', 24, 152, '#ffffff');
        ctx.drawImage(sp.fly, 12, 160); txt(ctx, '200 PTS', 32, 164, '#f8f800');
        ctx.drawImage(sp.lady[0], 112, 160); txt(ctx, '200 PTS', 132, 164, '#ff70c0');
        if (api.credits > 0) { if (coinHold > 0 || (S.t % 60) < 40) txtC(ctx, 'PUSH START BUTTON', 182, '#28d828'); }
        else if (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : (S.t % 60) < 40) txtC(ctx, 'INSERT COIN', 182, coinFlash > 0 ? '#ff2020' : '#f8f800');
        txtC(ctx, 'KONAMI 1981', 196, '#ff2020');
      }

      if (/[?&]dbg=1/.test(location.search)) {
        window.__G = { S, get F() { return F; }, get lanes() { return lanes; }, bayFx: () => bayFx, setLevel(l) { S.level = l; buildLanes(); } };
      }
      return { update, render };
    }
  });
})();
