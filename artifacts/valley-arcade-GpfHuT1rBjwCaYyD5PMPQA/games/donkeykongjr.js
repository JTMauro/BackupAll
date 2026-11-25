// Donkey Kong Jr. (Nintendo, 1982) — browser recreation for Arcade Games Galore.
// Hand-made pixel art from string arrays; no external assets.
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
  function mirror(left, right) { return left.map((r, i) => r + (right || left)[i].split('').reverse().join('')); }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const chance = p => Math.random() < p;

  // ---------------------------------------------------------------------------
  // Pixel art
  // ---------------------------------------------------------------------------
  const PAL_JR = { D: '#b04810', E: '#5a1c00', T: '#ffb878', W: '#ffffff', R: '#ff2020' };
  const JR_HEAD = [
    '.....DDDDD......',
    '...DDDDDDDDD....',
    '..DDDDDDDDDDD...',
    '..DDDDDDDTTTD...',
    '..DDDDDDTWWTT...',
    '.DDDDDDDTWETTT..',
    '.DDDDDDDTTTTTTT.',
    '..DDDDDDDTTTETT.',
    '...DDDDDDTTTTT..'];
  const JR_STAND = JR_HEAD.concat([
    '....DDWWWWWW....',
    '...DDWWRRWWWDD..',
    '...DTWWWRWWWTT..',
    '....TDDDDDDDTT..',
    '....DDDD.DDDD...',
    '...TTTT...TTTT..',
    '..TTTTT...TTTTT.']);
  const JR_WALK = JR_HEAD.concat([
    '....DDWWWWWW....',
    '..TDDWWRRWWWDT..',
    '..TTWWWWRWWWTT..',
    '....DDDDDDDD....',
    '...DDDD..DDDD...',
    '.TTTT......DDDD.',
    'TTTT........TTTT']);
  const JR_JUMP = [
    '.....DDDDD...TT.',
    '...DDDDDDDDD.TT.',
    '..DDDDDDDDDDDDD.',
    '..DDDDDDDTTTDD..',
    '..DDDDDDTWWTT...',
    '.DDDDDDDTWETTT..',
    '.DDDDDDDTTTTTTT.',
    '..DDDDDDDTTTETT.',
    '...DDDDDDTTTTT..',
    'TT..DDWWWWWW....',
    'TTDDDWWRRWWW....',
    '...DWWWWRWWW....',
    '....DDDDDDDD....',
    '...DDDD..DDDDD..',
    '.TTTT......TTTT.',
    'TTT..........TTT'];
  const JR_CLIMB1 = [
    '......TT........',
    '......TTDDDD....',
    '......DDDDDDDD..',
    '.....DDDDDDDDDD.',
    '.....DTTDDDDDDD.',
    '....TTWWTDDDDDD.',
    '....TEWWTDDDDDD.',
    '...TTTTTTDDDDD..',
    '...TETTTDDDDD...',
    '....TTTTWWWDD...',
    '......TTWWWWDD..',
    '......TTWRWWDD..',
    '.......DDDDDDD..',
    '.......DDDD.DDD.',
    '......TTTT...TT.',
    '.....TTTT....TTT'];
  const JR_CLIMB1B = JR_CLIMB1.slice(0, 12).concat([
    '.......DDDDDDD..',
    '.......DDDDDDD..',
    '........DDDDDD..',
    '........TTTTTT..']);
  const JR_CLIMB2 = [
    '.TT..........TT.',
    '.TT..........TT.',
    '.DD...DDDD...DD.',
    '..DD.DDDDDD.DD..',
    '..DDDDEDDEDDDD..',
    '...TDDDDDDDDT...',
    '...TDDDDDDDDT...',
    '....DDDDDDDD....',
    '....EDDDDDDE....',
    '...WWWWWWWWWW...',
    '...WWWWWWWWWW...',
    '....WWWWWWWW....',
    '....DDDDDDDD....',
    '...DDDE..EDDD...',
    '..TTT......TTT..',
    '..TT........TT..'];
  const JR_CLIMB2B = JR_CLIMB2.slice(0, 12).concat([
    '....DDDDDDDD....',
    '...DDDE.EDD.....',
    '..TTT...TTT.....',
    '..TT.....TT.....']);
  const JR_ICON = [
    '..DDDD..',
    '.DDDDDD.',
    'DDDDTTD.',
    'DDDTWTT.',
    'DDDTTTTT',
    '.DDDTTT.',
    '..WWWW..'];
  const HALO = ['..YYYY..', '.Y....Y.', '..YYYY..'];

  const PAL_MARIO = { R: '#f42020', B: '#2060ff', S: '#ffb48c', H: '#6a2a00', W: '#e0e0e0' };
  const MARIO_STAND = [
    '.....RRRRR......',
    '....RRRRRRRRR...',
    '....HHHSSHS.....',
    '...HSHSSSHSSS...',
    '...HSHHSSSHSSS..',
    '...HHSSSSHHHH...',
    '.....SSSSSSS....',
    '....BBRBBB......',
    '...BBBRBBRBBB...',
    '..BBBBRRRRBBBB..',
    '..SSBRSRRSRBSS..',
    '..SSSRRRRRRSSS..',
    '..SSRRRRRRRRSS..',
    '....RRR..RRR....',
    '...HHH....HHH...',
    '..HHHH....HHHH..'];
  const MARIO_WHIP = [
    '.....RRRRR......',
    '....RRRRRRRRR...',
    '....HHHSSHS.....',
    '...HSHSSSHSSS...',
    '...HSHHSSSHSSS..',
    '...HHSSSSHHHH...',
    '.....SSSSSSS....',
    '....BBRBBBBSS...',
    '...BBBRBBRBSS...',
    '..BBBBRRRRBB....',
    '..SSBRSRRSR.....',
    '..SSSRRRRRR.....',
    '..SSRRRRRRRR....',
    '....RRR..RRR....',
    '...HHH....HHH...',
    '..HHHH....HHHH..'];

  const PAL_DK = { D: '#a8400c', E: '#6e2400', T: '#ffb878', W: '#ffffff', K: '#3c1000' };
  const DK_HALF = [
    '..............DDDDDD',
    '............DDDDDDDD',
    '...........DDDDDDDDD',
    '..........DDDDDDDDDD',
    '..........DDDDDTTTTT',
    '..........DDDDTWWWTT',
    '..........DDDTTWKWTT',
    '..........DDDTTWWWTT',
    '..........DDDTTTTTTT',
    '...........DDTTTTTKT',
    '......DDDDDDDTTTTTTT',
    '....DDDDDDDDDTTTTTTT',
    '...DDDDDDDDDDTTWWWWW',
    '..DDDDDDDDDDDDTTTTTT',
    '..DDDDDDDDDDDDDDDDDD',
    '.DDDDDDDDDDDDDDDDTTT',
    '.DDDDDDDDDDDDDDTTTTT',
    '.DDDDEDDDDDDDTTTTTTT',
    'DDDDE.DDDDDDDTTTTTTT',
    'DDDDE..DDDDDDTTTTTTT',
    'DDDD...DDDDDDDTTTTTT',
    'DDDD...DDDDDDDDTTTTT',
    'DDDD....DDDDDDDDDDDD',
    'DDDD....DDDDDDDDDDDD',
    'TTTT....DDDDDDDDDDDD',
    'TTTTT...DDDDDDD..DDD',
    'TTTTT...DDDDDD....DD',
    'TT.TT...DDDDDD......',
    '........TTTTTTT.....',
    '.......TTTTTTTT.....',
    '......TTTTTTTTT.....',
    '....................'];
  const DK_HALF_UP = DK_HALF.map((r, i) => {
    const up = ['..TTT.....', '.TTTTT....', '.TTTTT....', '.TTTTT....', '.DDDDD....', '.DDDDDDDDD', '.DDDDDDDDD', '..DDDDDDDD', '...DDDDDDD', '....DDDDDD', '.....DDDDD', '.....DDDDD', '......DDDD', '......DDDD', '.......DDD', '.......DDD', '.......DDD', '........DD', '........DD', '........DD', '........DD', '........DD', '..........', '..........'];
    if (i >= 5 && i < 5 + up.length) return up[i - 5] + r.slice(10);
    return r;
  });
  const DK_HALF_GRIN = DK_HALF.map((r, i) => i === 11 ? '....DDDDDDDDDTWWWWWW' : i === 12 ? '...DDDDDDDDDDTWKKKKK' : i === 13 ? '..DDDDDDDDDDDDTWWWWW' : r);

  const PAL_SNAP_B = { B: '#2c7cff', L: '#9cd0ff', W: '#ffffff', K: '#000030', R: '#ff9030' };
  const PAL_SNAP_R = { B: '#f02020', L: '#ff9c9c', W: '#ffffff', K: '#300000', R: '#ffe040' };
  const SNAP_OPEN = [
    '..BBBBBBBBBB....',
    '.BLLBBBBBBBBBB..',
    '.BWKBBBBBB......',
    'BBBBBB.W.W.W.W..',
    'BBBBBB..........',
    'BBBBBB.W.W.W.W..',
    '.BBBBBBBBBBBBBB.',
    '..RR........RR..'];
  const SNAP_SHUT = [
    '..BBBBBBBBBB....',
    '.BLLBBBBBBBBBBB.',
    '.BWKBBBBBBBBBBB.',
    'BBBBBBWWWWWWWW..',
    'BBBBBBWWWWWWWW..',
    'BBBBBBBBBBBBBBB.',
    '.BBBBBBBBBBBBB..',
    '..RR........RR..'];

  const PAL_BIRD = { P: '#7858ff', L: '#b8a8ff', Y: '#ffd000', W: '#ffffff', K: '#000000', R: '#ff7020' };
  const BIRD_A = [
    '..........PP....',
    '.........PLP....',
    '........PLPP....',
    '....PPPPPPP.....',
    '...PPPPPPPP.....',
    '..YPWKPPPPPPP...',
    '.YYPPPPPPPPPPP..',
    '..YPPPPPPPPPPPPP',
    '....PPPPPPPPP...',
    '......RR..RR....'];
  const BIRD_B = [
    '................',
    '................',
    '................',
    '....PPPPP.......',
    '...PPPPPPP......',
    '..YPWKPPPPPPP...',
    '.YYPPPPPPPPPPP..',
    '..YPPPPPPPPPPPPP',
    '....PPPLLLPPP...',
    '......PPPPP.....',
    '.......PPP......'];
  const EGG = ['..WW..', '.WWWW.', 'WWWWWW', 'WWWWLW', 'WWWWLW', '.WWWW.'];
  const SPARK_A = [
    '...Y....',
    '.Y.Y.Y..',
    '..YWY...',
    'YYWWWYY.',
    '..YWY...',
    '.Y.Y.Y..',
    '...Y....'];
  const SPARK_B = [
    'Y.....Y.',
    '.Y.Y.Y..',
    '..WWW...',
    '.YWWWY..',
    '..WWW...',
    '.Y.Y.Y..',
    'Y.....Y.'];

  const APPLE = [
    '....G...',
    '...GG...',
    '.RRGRRR.',
    'RRWRRRRR',
    'RWRRRRRR',
    'RRRRRRRR',
    'RRRRRRRD',
    '.RRRRRD.',
    '..RD.R..'];
  const BANANA = [
    '.....G....',
    '....YY....',
    '...YYY..Y.',
    '..YYY..YY.',
    '.YYY..YYY.',
    'YYY..YYY..',
    'YY..YYY...',
    '.Y..YY....'];
  const GRAPES = [
    '...G....',
    '..GG....',
    '.PPPP...',
    'PLPPPP..',
    'PPPPLPP.',
    '.PLPPP..',
    '.PPPLP..',
    '..PPP...',
    '..PP....'];
  const PAL_FRUIT = { R: '#ff2020', D: '#a00000', W: '#ffc0c0', G: '#30d020', Y: '#ffe040', P: '#c040ff', L: '#f0a0ff' };
  const KEY = [
    '...Y....',
    '...YY...',
    '...Y....',
    '...YY...',
    '...Y....',
    '...Y....',
    '...Y....',
    '..YYY...',
    '.YY.YY..',
    '.Y...Y..',
    '.YY.YY..',
    '..YYY...'];
  const SPRING_UP = [
    'YYYYYYYYYYYYYYYY',
    'OOOOOOOOOOOOOOOO',
    '..R..R..R..R..R.',
    '.R..R..R..R..R..',
    '..R..R..R..R..R.',
    '.R..R..R..R..R..',
    'GGGGGGGGGGGGGGGG'];
  const SPRING_DN = [
    'YYYYYYYYYYYYYYYY',
    'OOOOOOOOOOOOOOOO',
    '.RRRRRRRRRRRRRR.',
    'GGGGGGGGGGGGGGGG'];
  const PAL_SPRING = { Y: '#ffe040', O: '#ff8000', R: '#ff3030', G: '#00a8ff' };
  const SMASH = [
    '.W.....Y.....W..',
    '...Y...W...Y....',
    '.....Y...Y......',
    '.Y....WWW....Y..',
    '.....Y...Y......',
    '...Y...W...Y....',
    '.W.....Y.....W..'];

  let SP = null;
  function buildSprites() {
    if (SP) return SP;
    const j = s => spr(s, PAL_JR);
    const two = s => [s, flip(s)];
    const stand = j(JR_STAND);
    SP = {
      jr: { stand: two(stand), walk: two(j(JR_WALK)), jump: two(j(JR_JUMP)), climb1: two(j(JR_CLIMB1)), climb1b: two(j(JR_CLIMB1B)), climb2: [j(JR_CLIMB2), j(JR_CLIMB2B)] },
      jrRot: [stand, rot(stand, 1), rot(stand, 2), rot(stand, 3)],
      jrIcon: spr(JR_ICON, PAL_JR),
      halo: spr(HALO, { Y: '#ffe040' }),
      mario: two(spr(MARIO_STAND, PAL_MARIO)), marioWhip: two(spr(MARIO_WHIP, PAL_MARIO)),
      dk: spr(mirror(DK_HALF), PAL_DK), dkUpL: spr(mirror(DK_HALF_UP, DK_HALF), PAL_DK), dkUpR: flip(spr(mirror(DK_HALF_UP, DK_HALF), PAL_DK)),
      dkGrin: spr(mirror(DK_HALF_GRIN), PAL_DK), dkUp: spr(mirror(DK_HALF_UP), PAL_DK),
      snapB: [two(spr(SNAP_OPEN, PAL_SNAP_B)), two(spr(SNAP_SHUT, PAL_SNAP_B))],
      snapR: [two(spr(SNAP_OPEN, PAL_SNAP_R)), two(spr(SNAP_SHUT, PAL_SNAP_R))],
      bird: [two(spr(BIRD_A, PAL_BIRD)), two(spr(BIRD_B, PAL_BIRD))],
      egg: spr(EGG, { W: '#ffffff', L: '#c0c0c0' }),
      sparkB: [spr(SPARK_A, { Y: '#40a0ff', W: '#ffffff' }), spr(SPARK_B, { Y: '#40a0ff', W: '#ffffff' })],
      sparkY: [spr(SPARK_A, { Y: '#ffd000', W: '#ffffff' }), spr(SPARK_B, { Y: '#ffd000', W: '#ffffff' })],
      fruit: { apple: spr(APPLE, PAL_FRUIT), banana: spr(BANANA, PAL_FRUIT), grapes: spr(GRAPES, PAL_FRUIT) },
      key: spr(KEY, { Y: '#ffe040' }), keyBlue: spr(KEY, { Y: '#60c0ff' }),
      spring: [spr(SPRING_UP, PAL_SPRING), spr(SPRING_DN, PAL_SPRING)],
      smash: spr(SMASH, { W: '#ffffff', Y: '#ffe040' })
    };
    // snapjaws rotated for vine travel (head down / head up)
    SP.snapVB = [rot(SP.snapB[0][0], 1), rot(SP.snapB[1][0], 1)];
    SP.snapVBu = [rot(SP.snapB[0][0], 3), rot(SP.snapB[1][0], 3)];
    SP.snapVR = [rot(SP.snapR[0][0], 1), rot(SP.snapR[1][0], 1)];
    SP.snapVRu = [rot(SP.snapR[0][0], 3), rot(SP.snapR[1][0], 3)];
    return SP;
  }

  // Tiles drawn procedurally per pixel (grass/earth islands, girders, water)
  let TILES = null;
  function buildTiles() {
    if (TILES) return TILES;
    const grass = mk(8, 8), g = grass.getContext('2d');
    const gr = ['GLGGLGGG', 'GGGGGGLG', 'DGGDGGGD', 'BBDBBBBD', 'BBBBDBBB', 'BDBBBBDB', 'BBBBBBBB', 'DBBDBBBD'];
    const gp = { G: '#20c020', L: '#90ff60', D: '#106000', B: '#c06018' };
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let c = gp[gr[y][x]]; if (y >= 3 && gr[y][x] === 'D') c = '#7a3008'; g.fillStyle = c; g.fillRect(x, y, 1, 1); }
    const gird = mk(16, 8), q = gird.getContext('2d');
    const gs = ['################', '.#....#..#....#.', '..#..#....#..#..', '...##......##...', '...##......##...', '..#..#....#..#..', '.#....#..#....#.', '################'];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) if (gs[y][x] === '#') { q.fillStyle = y === 0 ? '#9cf0ff' : '#00a0e8'; q.fillRect(x, y, 1, 1); }
    const beam = mk(16, 8), b = beam.getContext('2d');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) if (gs[y][x] === '#') { b.fillStyle = y === 0 ? '#ffd890' : '#e07020'; b.fillRect(x, y, 1, 1); }
    TILES = { grass, gird, beam };
    return TILES;
  }

  // ---------------------------------------------------------------------------
  // Stages
  // ---------------------------------------------------------------------------
  function P(x0, x1, y, o) { return Object.assign({ x0, x1, y, style: 'grass' }, o || {}); }
  function V(x, top, bot, o) { return Object.assign({ x, top, bot, kind: 'vine' }, o || {}); }
  function F(v, y, k) { return { v, x: v.x, y, k, st: 'hang', vy: 0, kills: 0 }; }

  function buildStage(n) {
    if (n === 1) {
      const T = P(0, 120, 64), U = P(144, 224, 88);
      const plats = [P(0, 40, 232), P(56, 88, 216), P(120, 152, 200), P(176, 224, 160), U, T];
      const vines = [V(24, 72, 200), V(36, 72, 200), V(88, 72, 196), V(108, 72, 176), V(156, 104, 208), V(168, 104, 208), V(200, 88, 160), V(212, 88, 160), V(132, 40, 150), V(48, 112, 204)];
      return {
        n, name: 'JUNGLE', water: 240, plats, vines, top: T,
        fruits: [F(vines[0], 140, 'apple'), F(vines[2], 120, 'banana'), F(vines[4], 150, 'grapes'), F(vines[8], 100, 'apple'), F(vines[9], 150, 'banana')],
        start: { x: 16, y: 232 }, key: { x: 100, y: 64 }, mario: { x: 72, y: 64 }, cage: { x: 4, y: 64 },
        snapVines: [vines[2], vines[3]], movers: []
      };
    }
    if (n === 2) {
      const T = P(0, 124, 64);
      const plats = [P(0, 40, 232), P(200, 224, 168), P(152, 224, 96), T];
      const vines = [V(208, 96, 168), V(220, 96, 168), V(136, 40, 150), V(88, 72, 150), V(100, 72, 150), V(60, 72, 150), V(176, 104, 200)];
      return {
        n, name: 'SPRINGBOARD', water: 240, plats, vines, top: T,
        fruits: [F(vines[4], 110, 'apple'), F(vines[2], 120, 'banana'), F(vines[5], 100, 'grapes'), F(vines[6], 150, 'apple')],
        start: { x: 10, y: 232 }, key: { x: 100, y: 64 }, mario: { x: 72, y: 64 }, cage: { x: 4, y: 64 },
        spring: { x: 24, y: 232 }, lane: { y: 168, x0: 40, x1: 200, w: 24 }, movers: []
      };
    }
    if (n === 3) {
      const T = P(0, 124, 64, { style: 'gird' });
      const F0 = P(0, 224, 240, { style: 'gird' }), F1 = P(40, 224, 196, { style: 'gird' }), F2 = P(0, 184, 152, { style: 'gird' }), F3 = P(40, 224, 108, { style: 'gird' });
      const ch = o => Object.assign(o, { kind: 'chain' });
      const vines = [ch(V(28, 150, 240)), ch(V(196, 116, 196)), ch(V(28, 72, 152)), ch(V(136, 30, 108)), ch(V(120, 160, 196)), ch(V(80, 116, 152)), ch(V(184, 72, 108))];
      return {
        n, name: 'HIDEOUT', water: 0, plats: [F0, F1, F2, F3, T], vines, top: T,
        fruits: [F(vines[4], 176, 'apple'), F(vines[5], 128, 'banana'), F(vines[3], 70, 'grapes'), F(vines[6], 84, 'apple')],
        start: { x: 12, y: 240 }, key: { x: 100, y: 64 }, mario: { x: 72, y: 64 }, cage: { x: 4, y: 64 },
        wires: [F1, F2, F3], movers: []
      };
    }
    // stage 4: chains & keys
    const beam = P(0, 224, 64, { style: 'beam', noWalk: false });
    const F0 = P(0, 224, 240, { style: 'beam' }), L1 = P(0, 48, 192, { style: 'beam' }), R1 = P(176, 224, 192, { style: 'beam' }), M1 = P(80, 144, 144, { style: 'beam' });
    const ch = (x, top, bot) => V(x, top, bot, { kind: 'chain' });
    const chains = [ch(24, 72, 184), ch(56, 72, 224), ch(96, 72, 136), ch(128, 72, 136), ch(168, 72, 224), ch(200, 72, 184)];
    const extra = [ch(72, 112, 228)];
    const keys = chains.map((c, i) => ({ c, home: [150, 196, 112, 112, 196, 150][i], y: 0, locked: false }));
    keys.forEach(k => { k.y = k.home; });
    return {
      n, name: 'KEYS', water: 0, plats: [F0, L1, R1, M1, beam], vines: chains.concat(extra), top: beam,
      fruits: [F(chains[1], 120, 'apple'), F(chains[4], 120, 'banana'), F(extra[0], 190, 'grapes')],
      start: { x: 112, y: 240 }, keys, mario: { x: 172, y: 64 }, cage: { x: 88, y: 64 }, movers: [], beamY: 64
    };
  }

  // ---------------------------------------------------------------------------
  ArcadeRegistry.register({
    id: 'donkeykongjr',
    title: 'Donkey Kong Jr.',
    year: 1982,
    maker: 'Nintendo',
    width: 224, height: 256,
    controls: 'Arrows: move/climb (two vines = faster up) · Space: jump · Enter: start',
    marquee: { bg: '#081808', fg: '#ffb020', accent: '#30d020' },
    create(api) {
      const sp = buildSprites(); const tl = buildTiles();
      const au = api.audio;
      const W = 224, H = 256;
      const WALK = 0.85, JV = 2.15, GRAV = 0.13;

      const S = { mode: 'title', t: 0, score: 0, hi: api.getHiScore(10000), lives: 3, level: 1, stage: 1, bonus: 5000, extra: false, ready: 0 };
      let st = null, J = null;
      let enemies = [], eggs = [], popups = [], fx = [], movers = [];
      let stT = 0, bonusT = 0, bgmT = 0, spawnT = 0, birdT = 0, sparkT = 0;
      let marioWhip = 0;

      const snd = {
        step() { au.tone(api.frame & 8 ? 520 : 440, 0.03, { type: 'square', vol: 0.04 }); },
        climb() { au.tone(api.frame & 8 ? 660 : 590, 0.03, { type: 'triangle', vol: 0.06 }); },
        jump() { au.tone(330, 0.18, { type: 'square', vol: 0.07, slideTo: 700 }); },
        spring() { au.tone(150, 0.35, { type: 'triangle', vol: 0.15, slideTo: 900 }); },
        fruit() { au.tone(880, 0.25, { type: 'square', vol: 0.06, slideTo: 220 }); },
        kill() { au.melody([[1047, 0.05], [1319, 0.05], [1568, 0.05], [2093, 0.1]], { type: 'square', vol: 0.07 }); au.noise(0.2, { vol: 0.12, freq: 2500, slideTo: 300 }); },
        points() { au.melody([[1568, 0.05], [2093, 0.08]], { type: 'square', vol: 0.06 }); },
        whip() { au.noise(0.08, { vol: 0.15, freq: 5000, type: 'highpass' }); },
        key() { au.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.12]], { type: 'square', vol: 0.07 }); },
        lock() { au.melody([[523, 0.06], [784, 0.06], [1047, 0.15]], { type: 'square', vol: 0.08 }); au.noise(0.1, { vol: 0.1, freq: 3000 }); },
        death() {
          au.melody([[784, 0.08], [740, 0.08], [698, 0.08], [659, 0.08], [622, 0.08], [587, 0.08], [554, 0.08], [523, 0.08], [494, 0.08], [466, 0.08]], { type: 'square', vol: 0.07, delay: 0.5 });
          au.melody([[392, 0.15], [0, 0.05], [330, 0.15], [0, 0.05], [262, 0.4]], { type: 'square', vol: 0.08, delay: 1.4 });
        },
        splash() { au.noise(0.5, { vol: 0.25, freq: 1500, slideTo: 200 }); },
        clear() { au.melody([[523, 0.1], [587, 0.1], [659, 0.1], [784, 0.2], [659, 0.1], [784, 0.4]], { type: 'square', vol: 0.08 }); au.melody([[262, 0.2], [330, 0.2], [392, 0.4], [523, 0.4]], { type: 'triangle', vol: 0.1 }); },
        start() { au.melody([[392, 0.1], [440, 0.1], [494, 0.1], [523, 0.1], [587, 0.1], [659, 0.2], [523, 0.2], [784, 0.4]], { type: 'square', vol: 0.07 }); au.melody([[196, 0.4], [262, 0.4], [196, 0.4], [262, 0.4]], { type: 'triangle', vol: 0.1 }); },
        ending() { au.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.24], [988, 0.12], [880, 0.12], [784, 0.12], [880, 0.12], [988, 0.12], [1047, 0.5]], { type: 'square', vol: 0.08 }); },
        timer() { au.tone(1760, 0.04, { type: 'square', vol: 0.04 }); },
        egg() { au.tone(1200, 0.12, { type: 'triangle', vol: 0.05, slideTo: 400 }); },
        zap() { au.noise(0.04, { vol: 0.05, freq: 6000, type: 'highpass' }); }
      };
      const BGM = {
        1: [262, 0, 330, 0, 392, 330, 262, 0, 294, 0, 349, 0, 440, 349, 294, 0],
        2: [392, 0, 392, 494, 587, 0, 494, 0, 440, 0, 440, 523, 659, 0, 523, 0],
        3: [196, 233, 262, 233, 196, 233, 262, 294, 175, 208, 233, 208, 175, 208, 233, 262],
        4: [330, 0, 392, 0, 440, 0, 392, 330, 294, 0, 349, 0, 392, 0, 349, 294]
      };

      function addScore(n, x, y) {
        S.score += n;
        if (!S.extra && S.score >= 10000) { S.extra = true; S.lives++; au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.07 }); }
        if (S.score > S.hi) S.hi = S.score;
        if (x != null && popups.length < 10) popups.push({ x, y, s: String(n), t: 60 });
      }
      const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
      const jBox = () => [J.x - 5, J.y - 14, J.x + 5, J.y - 1];
      const diff = () => Math.min(6, S.level + Math.floor(stT / 1800));
      function allPlats() { return movers.length ? st.plats.concat(movers) : st.plats; }
      function supportAt(x, y, tol) {
        for (const p of allPlats()) if (x >= p.x0 && x < p.x1 && Math.abs(p.y - y) <= tol) return p;
        return null;
      }
      function landOn(x, y0, y1) {
        let best = null;
        for (const p of allPlats()) if (x >= p.x0 && x < p.x1 && y0 <= p.y + 0.5 && y1 >= p.y && (!best || p.y < best.y)) best = p;
        return best;
      }
      function vineAt(x, y, tol) {
        // vine whose x is near and covers the hand height (y-14) or body
        let best = null, bd = 99;
        for (const v of st.vines) {
          const d = Math.abs(v.x - x);
          if (d <= tol && y - 14 >= v.top - 2 && y - 16 <= v.bot && d < bd) { best = v; bd = d; }
        }
        return best;
      }
      function partner(v, dir, y) {
        for (const w of st.vines) {
          if (w === v || w.kind !== v.kind) continue;
          const dx = (w.x - v.x) * dir;
          if (dx > 0 && dx <= 14 && y - 14 >= w.top - 1 && y - 14 <= w.bot) return w;
        }
        return null;
      }

      // ---------------- flow ----------------
      function initStage() {
        st = buildStage(S.stage);
        enemies = []; eggs = []; popups = []; fx = []; movers = [];
        J = { x: st.start.x, y: st.start.y, dir: 1, state: 'walk', on: null, v1: null, v2: null, vx: 0, vy: 0, y0: st.start.y, anim: 0, noGrab: 0, moving: false, jumpId: 0, shuffle: 0 };
        J.on = supportAt(J.x, J.y, 2);
        S.bonus = Math.min(8000, 5000 + 1000 * (S.level - 1));
        stT = 0; bonusT = 0; bgmT = 0; spawnT = 90; birdT = 150; sparkT = 60;
        if (st.lane) { for (let x = st.lane.x0 + 8; x < st.lane.x1 - 20; x += 56) movers.push(P(x, x + st.lane.w, st.lane.y, { style: 'mover', vx: 0.4 })); st.laneT = 0; }
        if (st.n === 3) {
          const cnt = Math.min(5, 1 + S.level);
          for (let i = 0; i < cnt; i++) addSpark(st.wires[i % 3], i % 2 === 0 ? 'blue' : 'yellow', i * 0.37);
        }
        if (st.n === 4) {
          enemies.push(newSnap(200, 240, chance(0.5) ? 'red' : 'blue', 'walk', st.plats[0]));
        }
        S.ready = 90;
      }
      function startGame() {
        S.score = 0; S.lives = 3; S.level = 1; S.stage = 1; S.extra = false;
        initStage(); S.mode = 'play'; S.t = 0; snd.start();
      }
      function kill(why) {
        if (S.mode !== 'play') return;
        S.mode = 'dying'; S.t = 0; S.why = why;
        if (why === 'water') snd.splash();
        snd.death();
      }
      function stageClear() {
        if (S.mode !== 'play') return;
        S.mode = 'clear'; S.t = 0;
        addScore(S.bonus, null, null);
        if (st.n === 4) snd.ending(); else snd.clear();
      }
      function nextStage() {
        S.stage++;
        if (S.stage > 4) { S.stage = 1; S.level++; }
        initStage(); S.mode = 'play'; S.t = 0;
      }

      // ---------------- enemies ----------------
      function newSnap(x, y, col, mode, p) { return { type: 'snap', x, y, col, mode, p, v: null, dir: chance(0.5) ? 1 : -1, vdir: 1, t: 0, jumped: -1, life: 0 }; }
      function addSpark(p, col, phase) {
        // loop path around a girder: top (left->right), right end down, bottom (right->left), left end up
        const x0 = p.x0 + 3, x1 = p.x1 - 3, yt = p.y - 4, yb = p.y + 12;
        const path = [[x0, yt], [x1, yt], [x1, yb], [x0, yb]];
        let len = 0; const segs = [];
        for (let i = 0; i < 4; i++) { const a = path[i], b = path[(i + 1) % 4]; const l = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]); segs.push({ a, b, l }); len += l; }
        enemies.push({ type: 'spark', col, segs, len, d: phase * len, x: x0, y: yt, t: 0, jumped: -1, dir: col === 'blue' ? 1 : -1 });
      }
      function sparkPos(e) {
        let d = ((e.d % e.len) + e.len) % e.len;
        for (const s of e.segs) {
          if (d <= s.l) { const f = d / s.l; e.x = s.a[0] + (s.b[0] - s.a[0]) * f; e.y = s.a[1] + (s.b[1] - s.a[1]) * f; return; }
          d -= s.l;
        }
      }
      function enemyBox(e) {
        if (e.type === 'snap') return e.mode === 'vine' ? [e.x - 4, e.y - 8, e.x + 4, e.y + 8] : [e.x - 7, e.y - 8, e.x + 7, e.y];
        if (e.type === 'bird') return [e.x - 7, e.y - 6, e.x + 7, e.y + 4];
        if (e.type === 'spark') return [e.x - 3, e.y - 3, e.x + 3, e.y + 3];
        return [e.x - 3, e.y - 3, e.x + 3, e.y + 3];
      }
      function updateEnemies() {
        const d = diff();
        const sSpeed = 0.45 + d * 0.06;
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]; e.t++;
          if (e.type === 'snap') {
            if (e.mode === 'walk') {
              e.x += e.dir * sSpeed;
              // on stage 1/2 top: looking for a vine to descend
              if (e.target && Math.abs(e.x - e.target.x) < sSpeed) { e.mode = 'vine'; e.v = e.target; e.x = e.v.x; e.y = e.v.top + 8; e.vdir = 1; e.target = null; }
              if (e.p && (e.x < e.p.x0 + 6 || e.x > e.p.x1 - 6)) {
                if (st.n === 4 && e.p === st.plats[0]) e.dir = -e.dir;
                else { e.dir = -e.dir; e.x = Math.max(e.p.x0 + 6, Math.min(e.p.x1 - 6, e.x)); }
              }
              // stage 4: red snapjaws may climb chains
              if (st.n === 4 && e.col === 'red' && e.t % 60 === 0 && chance(0.3)) {
                for (const v of st.vines) if (Math.abs(v.x - e.x) < 10 && v.bot >= e.y - 20) { e.mode = 'vine'; e.v = v; e.x = v.x; e.y = Math.min(v.bot, e.y - 8); e.vdir = -1; break; }
              }
            } else if (e.mode === 'vine') {
              e.y += e.vdir * sSpeed * (e.col === 'blue' ? 1.2 : 0.9);
              if (e.y > e.v.bot) {
                if (e.col === 'blue') { e.mode = 'fall'; e.vy = 0.5; }
                else {
                  e.y = e.v.bot; e.vdir = -1;
                  if (st.n === 4) { const p = supportAt(e.x, e.v.bot + 16, 20); if (p && chance(0.5)) { e.mode = 'walk'; e.p = p; e.y = p.y; } }
                }
              } else if (e.y < e.v.top + 8) {
                e.y = e.v.top + 8; e.vdir = 1;
                // red ones may hop to a neighbouring vine
                if (chance(0.3)) { const w = partner(e.v, chance(0.5) ? 1 : -1, e.y + 14); if (w) { e.v = w; e.x = w.x; } }
              }
              if (e.col === 'red' && chance(0.004)) e.vdir = -e.vdir;
            } else if (e.mode === 'fall') {
              e.vy = Math.min(3, e.vy + 0.1); e.y += e.vy;
              if (e.y > H + 10) { enemies.splice(i, 1); continue; }
            }
          } else if (e.type === 'bird') {
            e.x += e.dir * (0.8 + d * 0.08);
            e.y = e.by + Math.sin(e.t * 0.06) * 10;
            if (e.dive) { e.by += 0.6; }
            e.eggCool--;
            if (e.eggCool <= 0 && Math.abs(e.x - J.x) < 10 && e.y < J.y - 20 && eggs.length < 6) {
              eggs.push({ x: e.x, y: e.y + 4, vy: 0.4 }); e.eggCool = 120; snd.egg();
            }
            if (e.x < -20 || e.x > W + 20 || e.y > H) { enemies.splice(i, 1); continue; }
          } else if (e.type === 'spark') {
            e.d += e.dir * (0.6 + d * 0.06) * (e.col === 'yellow' ? 1.25 : 1);
            sparkPos(e);
            if (e.t % 20 === 0) snd.zap();
          }
          // collisions with Junior
          const box = enemyBox(e);
          if (J.state === 'jump' && e.jumped !== J.jumpId && Math.abs(e.x - J.x) < 7 && e.y > J.y - 2 && e.y - J.y < 24 && e.type !== 'bird') {
            e.jumped = J.jumpId; addScore(100, e.x, e.y - 16); snd.points();
          }
          if (overlap(jBox(), box)) kill('enemy');
        }
        for (let i = eggs.length - 1; i >= 0; i--) {
          const g = eggs[i]; g.vy = Math.min(2.2, g.vy + 0.05); g.y += g.vy;
          if (g.y > H + 8) { eggs.splice(i, 1); continue; }
          if (overlap(jBox(), [g.x - 3, g.y - 3, g.x + 3, g.y + 3])) kill('enemy');
        }
      }
      function spawnLogic() {
        const d = diff();
        if (st.n === 1 || st.n === 2 || st.n === 4) {
          spawnT--;
          const snaps = enemies.filter(e => e.type === 'snap').length;
          if (st.n !== 2 && spawnT <= 0) {
            spawnT = (rnd(200, 320) - d * 20) | 0;
            if (snaps < 2 + d) {
              marioWhip = 30; snd.whip();
              const reds = enemies.filter(e => e.type === 'snap' && e.col === 'red').length;
              const col = reds < Math.min(3, 1 + (d >> 1)) && chance(0.5) ? 'red' : 'blue';
              if (st.n === 1) {
                const e = newSnap(st.mario.x + 8, st.mario.y, col, 'walk', st.top); e.dir = 1;
                e.target = st.snapVines[(Math.random() * st.snapVines.length) | 0];
                enemies.push(e);
              } else {
                const fl = st.plats[0];
                const e = newSnap(chance(0.5) ? 8 : W - 8, fl.y, col, 'walk', fl); e.dir = e.x < 100 ? 1 : -1;
                enemies.push(e);
              }
            }
          }
        }
        if (st.n === 2 || st.n === 4 || (st.n === 1 && S.level >= 2)) {
          birdT--;
          if (birdT <= 0) {
            birdT = (rnd(160, 260) - d * 12) | 0;
            const birds = enemies.filter(e => e.type === 'bird').length;
            if (birds < 1 + (d >> 1)) {
              const fromLeft = chance(0.5);
              enemies.push({ type: 'bird', x: fromLeft ? -12 : W + 12, by: rnd(84, 140), y: 0, dir: fromLeft ? 1 : -1, t: 0, eggCool: 40, jumped: -1, dive: chance(0.2) });
            }
          }
        }
      }

      // ---------------- fruit ----------------
      function updateFruit() {
        for (const f of st.fruits) {
          if (f.st === 'gone') continue;
          if (f.st === 'hang') {
            if (overlap(jBox(), [f.x - 4, f.y - 4, f.x + 4, f.y + 4])) { f.st = 'drop'; f.vy = 0.5; snd.fruit(); }
          } else {
            f.vy = Math.min(3.5, f.vy + 0.12); f.y += f.vy;
            for (let i = enemies.length - 1; i >= 0; i--) {
              const e = enemies[i];
              if (overlap([f.x - 5, f.y - 5, f.x + 5, f.y + 5], enemyBox(e))) {
                f.kills++; const v = f.kills === 1 ? 400 : f.kills === 2 ? 800 : 1200;
                addScore(v, e.x, e.y - 12); fx.push({ x: e.x, y: e.y, t: 0 }); snd.kill();
                enemies.splice(i, 1);
              }
            }
            if (f.y > H + 8 || (st.water === 0 && f.y >= 238)) f.st = 'gone';
          }
        }
      }

      // ---------------- Junior ----------------
      function enterClimb(v, w) {
        J.state = 'climb'; J.v1 = v; J.v2 = w || null; J.on = null; J.vx = 0; J.vy = 0;
        J.x = w ? (v.x + w.x) / 2 : v.x;
        const top = Math.max(v.top, w ? w.top : v.top) + 14;
        if (J.y < top) J.y = top;
      }
      function updateJunior() {
        const left = api.key('ArrowLeft'), right = api.key('ArrowRight'), up = api.key('ArrowUp'), down = api.key('ArrowDown');
        const jump = api.pressed('Space') || api.pressed('KeyX') || api.pressed('KeyZ');
        J.moving = false;
        if (J.noGrab > 0) J.noGrab--;
        if (J.state === 'walk') {
          if (J.on && J.on.vx) J.x += J.on.vx;
          const dx = left ? -1 : right ? 1 : 0;
          let v;
          if (jump) {
            const onSpring = st.spring && Math.abs(J.x - st.spring.x) < 10 && Math.abs(J.y - st.spring.y) < 2;
            J.state = 'jump'; J.vy = onSpring ? -4.5 : -JV; J.vx = dx * (onSpring ? 0.95 : WALK); J.y0 = J.y; J.on = null; J.jumpId++;
            if (dx) J.dir = dx;
            if (onSpring) { snd.spring(); st.springAnim = 12; } else snd.jump();
            return;
          } else if (up && (v = vineAt(J.x, J.y, 6)) && v.bot >= J.y - 26) {
            const w = partner(v, J.dir, J.y) || partner(v, -J.dir, J.y);
            if (w && Math.abs((v.x + w.x) / 2 - J.x) < 8) enterClimb(Math.min(v.x, w.x) === v.x ? v : w, Math.min(v.x, w.x) === v.x ? w : v); else enterClimb(v);
          } else if (dx) {
            J.x += dx * WALK; J.dir = dx; J.moving = true; J.anim += WALK;
            if (((J.anim / WALK) | 0) % 10 === 0) snd.step();
          }
          J.x = Math.max(6, Math.min(W - 6, J.x));
          if (J.state === 'walk') {
            const s = supportAt(J.x, J.y, 2.5);
            if (s) { J.on = s; J.y = s.y; } else { J.state = 'fall'; J.vy = 0; J.vx = J.dir * 0.5; J.y0 = J.y; J.on = null; }
          }
        } else if (J.state === 'climb') {
          const v1 = J.v1, v2 = J.v2;
          const two = !!v2;
          const upSp = two ? 1.0 : 0.5, dnSp = two ? 0.6 : 1.3;
          const top = Math.max(v1.top, two ? v2.top : v1.top) + 14;
          const bot = Math.min(v1.bot, two ? v2.bot : v1.bot) + 6;
          // stage 4: keys block / get pushed
          let keyLimit = -1, key = null;
          if (st.keys) for (const k of st.keys) if ((k.c === v1 || k.c === v2) && !k.locked) { key = k; keyLimit = k.y + 6 + 16; }
          if (jump) {
            const dx = left ? -1 : right ? 1 : J.dir;
            J.state = 'jump'; J.vy = -1.4; J.vx = dx * 0.9; J.dir = dx; J.y0 = J.y; J.noGrab = 12; J.jumpId++; J.v1 = J.v2 = null; snd.jump();
            return;
          }
          if (up) {
            let ny = J.y - upSp;
            if (key && ny < keyLimit) {
              // push the key up the chain
              key.y = Math.max(st.beamY + 14, ny - 22);
              key.pushed = 20;
              if (key.y <= st.beamY + 14) { key.locked = true; addScore(200 * S.level, key.c.x, key.y - 14); snd.lock(); }
            }
            if (ny < top) {
              ny = top;
              // climb onto a platform at the vine top
              const p = supportAt(J.x, v1.top, 2);
              if (p && !st.keys) { J.state = 'walk'; J.on = p; J.y = p.y; J.v1 = J.v2 = null; return; }
            }
            if (ny !== J.y) { J.moving = true; J.anim += upSp; }
            J.y = ny;
          } else if (down) {
            let ny = J.y + dnSp;
            const p = supportAt(J.x, ny, 2);
            if (p && ny >= p.y) { J.state = 'walk'; J.on = p; J.y = p.y; J.v1 = J.v2 = null; return; }
            if (ny > bot) {
              ny = bot;
              // let go at the bottom
              J.state = 'fall'; J.vy = 0; J.vx = 0; J.y0 = J.y; J.v1 = J.v2 = null; J.noGrab = 20; return;
            }
            J.y = ny; J.moving = true; J.anim += dnSp;
          }
          // shuffle between vines
          const dx = left ? -1 : right ? 1 : 0;
          if (dx) {
            if (J.shuffle > 0) J.shuffle--;
            else {
              J.shuffle = 10;
              J.dir = dx;
              if (two) {
                const keep = dx > 0 ? (v1.x > v2.x ? v1 : v2) : (v1.x < v2.x ? v1 : v2);
                enterClimb(keep);
              } else {
                const w = partner(v1, dx, J.y);
                const stepP = supportAt(J.x + dx * 14, J.y, 12);
                if (w) enterClimb(dx > 0 ? v1 : w, dx > 0 ? w : v1);
                else if (stepP) { J.state = 'walk'; J.on = stepP; J.y = stepP.y; J.x = Math.min(stepP.x1 - 3, Math.max(stepP.x0 + 3, J.x + dx * 12)); J.v1 = J.v2 = null; return; }
              }
            }
          } else J.shuffle = 0;
          if (J.moving && ((J.anim | 0) % 8 === 0)) snd.climb();
        } else { // jump / fall
          const py = J.y;
          J.vy = Math.min(J.vy + GRAV, 3.2);
          J.x += J.vx; J.y += J.vy;
          if (J.x < 6 || J.x > W - 6) { J.x = Math.max(6, Math.min(W - 6, J.x)); J.vx = 0; }
          // grab vines in the air
          if (!J.noGrab) {
            const v = vineAt(J.x, J.y, 4);
            if (v) {
              const w = partner(v, J.vx >= 0 ? 1 : -1, J.y);
              if (w && Math.abs((v.x + w.x) / 2 - J.x) < 7) enterClimb(v.x < w.x ? v : w, v.x < w.x ? w : v); else enterClimb(v);
              return;
            }
          }
          if (J.vy > 0) {
            const g = landOn(J.x, py, J.y);
            if (g) {
              J.y = g.y; J.on = g;
              if (J.y - J.y0 > 36) { J.state = 'walk'; kill('fall'); return; }
              J.state = 'walk'; J.vx = 0;
            }
          }
          if (st.water && J.y >= st.water + 4) { kill('water'); return; }
          if (J.y > H + 10) { kill('fall'); return; }
        }
        if (st.water && J.y >= st.water + 4) kill('water');
        // goals
        if (st.key && overlap(jBox(), [st.key.x - 4, st.key.y - 20, st.key.x + 4, st.key.y - 4])) { snd.key(); stageClear(); }
        if (st.keys && st.keys.every(k => k.locked)) stageClear();
      }

      function updateKeys() {
        if (!st.keys) return;
        for (const k of st.keys) {
          if (k.locked) continue;
          if (k.pushed > 0) { k.pushed--; continue; }
          if (k.y < k.home) k.y = Math.min(k.home, k.y + 0.25);
        }
      }
      function updateMovers() {
        if (!st.lane) return;
        const L = st.lane;
        for (let i = movers.length - 1; i >= 0; i--) {
          const m = movers[i];
          m.x0 += m.vx; m.x1 += m.vx;
          if (m.x0 > L.x1 - 4) { if (J.on === m && J.state === 'walk') { J.on = null; } movers.splice(i, 1); }
        }
        st.laneT += 0.4;
        if (st.laneT >= 56) { st.laneT = 0; movers.push(P(L.x0 - L.w + 4, L.x0 + 4, L.y, { style: 'mover', vx: 0.4 })); }
        if (st.springAnim > 0) st.springAnim--;
      }

      // ---------------- update ----------------
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      function update() {
        S.t++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        const cr = api.credits;
        if (S.mode === 'title') {
          if (lastCredits === 0 && cr > 0) { coinHold = 150; coinFlash = 0; }
          lastCredits = cr;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); }
            else { coinFlash = 150; au.tone(70, 0.28, { type: 'square', vol: 0.3 }); au.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 }); }
          }
          return;
        }
        lastCredits = cr;
        if (S.mode === 'gameover') { if (S.t > 200 || (S.t > 60 && api.anyPressed('Enter'))) { S.mode = 'title'; S.t = 0; } return; }
        if (S.mode === 'dying') {
          if (S.t > 40 && J.state !== 'walk' && S.why !== 'water') {
            J.vy = Math.min(3, (J.vy || 0) + 0.12); J.y += J.vy;
            const g = landOn(J.x, J.y - J.vy, J.y); if (g) { J.y = g.y; J.state = 'walk'; }
            if (st.water && J.y > st.water + 4) J.y = st.water + 4;
          }
          if (S.t === 220) {
            S.lives--;
            if (S.lives <= 0) {
              const over = () => { api.setHiScore(S.score); S.mode = 'gameover'; S.t = 0; };
              // last life: offer a continue, then replay this stage with the score kept
              if (api.offerContinue) api.offerContinue(() => { S.lives = 3; initStage(); S.mode = 'play'; S.t = 0; }, over);
              else over();
            }
            else { initStage(); S.mode = 'play'; S.t = 0; }
          }
          return;
        }
        if (S.mode === 'clear') {
          if (S.t > (st.n === 4 ? 360 : 220)) nextStage();
          return;
        }
        if (S.ready > 0) { S.ready--; return; }
        stT++;
        bonusT++;
        if (bonusT >= 110) {
          bonusT = 0; S.bonus = Math.max(0, S.bonus - 100);
          if (S.bonus <= 1000) snd.timer();
          if (S.bonus <= 0) { kill('time'); return; }
        }
        bgmT++;
        if (bgmT % 12 === 0) {
          const pat = BGM[st.n], n = pat[(bgmT / 12 | 0) % pat.length];
          if (n) au.tone(n, 0.11, { type: 'triangle', vol: 0.1 });
        }
        if (marioWhip > 0) marioWhip--;
        updateMovers();
        updateJunior();
        if (S.mode !== 'play') return;
        spawnLogic();
        updateEnemies();
        updateFruit();
        updateKeys();
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        for (let i = fx.length - 1; i >= 0; i--) if (++fx[i].t > 24) fx.splice(i, 1);
      }

      // ---------------- rendering ----------------
      function drawPlat(ctx, p) {
        if (p.style === 'grass' || p.style === 'mover') {
          for (let x = p.x0; x < p.x1; x += 8) { const w = Math.min(8, p.x1 - x); ctx.drawImage(tl.grass, 0, 0, w, 8, x, p.y, w, 8); }
          if (p.style === 'grass') {
            // earthy underside
            ctx.fillStyle = '#7a3008';
            for (let x = p.x0 + 2; x < p.x1 - 2; x += 4) ctx.fillRect(x, p.y + 8, 2, 2 + ((x * 7) % 3));
          }
        } else {
          const t = p.style === 'beam' ? tl.beam : tl.gird;
          for (let x = p.x0; x < p.x1; x += 16) { const w = Math.min(16, p.x1 - x); ctx.drawImage(t, 0, 0, w, 8, x, p.y, w, 8); }
        }
      }
      function drawVine(ctx, v) {
        if (v.kind === 'chain') {
          for (let y = v.top; y < v.bot; y += 4) {
            ctx.fillStyle = '#c8c8d8';
            if ((y >> 2) & 1) { ctx.fillRect(v.x - 1, y, 2, 4); }
            else { ctx.fillRect(v.x - 2, y, 1, 4); ctx.fillRect(v.x + 1, y, 1, 4); ctx.fillStyle = '#707088'; ctx.fillRect(v.x - 1, y, 2, 1); ctx.fillRect(v.x - 1, y + 3, 2, 1); }
          }
          return;
        }
        ctx.fillStyle = '#30c020'; ctx.fillRect(v.x - 1, v.top, 2, v.bot - v.top);
        ctx.fillStyle = '#106000'; ctx.fillRect(v.x, v.top, 1, v.bot - v.top);
        for (let y = v.top + 6; y < v.bot - 4; y += 12) {
          const s = ((y / 12) | 0) & 1 ? 1 : -1;
          ctx.fillStyle = '#60f040';
          ctx.fillRect(v.x + s * 2, y, s * 3, 2); ctx.fillRect(v.x + s * 4, y - 1, s * 2, 1);
        }
        // leafy top
        ctx.fillStyle = '#20a020';
        ctx.fillRect(v.x - 4, v.top - 2, 8, 3); ctx.fillStyle = '#60f040'; ctx.fillRect(v.x - 3, v.top - 3, 2, 2); ctx.fillRect(v.x + 1, v.top - 3, 2, 2);
      }
      function drawWater(ctx) {
        if (!st.water) return;
        const y0 = st.water;
        ctx.fillStyle = '#0030c0'; ctx.fillRect(0, y0 + 2, W, H - y0);
        ctx.fillStyle = '#40a0ff';
        const off = (api.frame >> 2) % 16;
        for (let x = -16; x < W + 16; x += 16) { ctx.fillRect(x + off, y0, 8, 2); ctx.fillRect(x + off + 8, y0 + 2, 8, 1); }
        ctx.fillStyle = '#2060e0';
        for (let x = -16; x < W + 16; x += 16) { ctx.fillRect(x - off + 4, y0 + 8, 6, 1); ctx.fillRect(x - off + 10, y0 + 12, 4, 1); }
      }
      function drawCage(ctx) {
        const c = st.cage, x = c.x - clearOff(), y = c.y - 40;
        const open = S.mode === 'clear' && st.n === 4;
        // DK inside
        if (!open) {
          const pose = S.mode === 'dying' ? 'grin' : (api.frame >> 4) % 4 === 1 ? 'upL' : (api.frame >> 4) % 4 === 3 ? 'upR' : 'front';
          const s = pose === 'upL' ? sp.dkUpL : pose === 'upR' ? sp.dkUpR : pose === 'grin' ? sp.dkGrin : sp.dk;
          ctx.drawImage(s, x + 4, y + 8);
          ctx.fillStyle = '#60c8ff';
          ctx.fillRect(x, y, 48, 2); ctx.fillRect(x, y + 38, 48, 2);
          for (let bx = x; bx <= x + 46; bx += 6) ctx.fillRect(bx, y, 2, 40);
          ctx.fillStyle = '#c0f0ff'; ctx.fillRect(x, y, 48, 1);
        } else {
          // DK falls out and lands, Mario falls
          const t = S.t;
          const dy = Math.min(150, t * t * 0.01);
          ctx.drawImage(t > 120 && ((t >> 4) & 1) ? sp.dkUpL : sp.dkGrin, x + 4, y + 8 + Math.min(dy, 176 - c.y + 40));
        }
      }
      function clearOff() { return S.mode === 'clear' && st.n !== 4 && S.t > 70 ? (S.t - 70) * 0.9 : 0; }
      function drawMario(ctx) {
        const m = st.mario;
        let my = m.y;
        if (S.mode === 'clear' && st.n === 4) { my += Math.min(190, S.t * S.t * 0.012); }
        const s = (marioWhip > 0 && (marioWhip >> 3) & 1) ? sp.marioWhip[st.n === 4 ? 1 : 0] : sp.mario[st.n === 4 ? 1 : 0];
        const mx = m.x - clearOff();
        ctx.drawImage(clearOff() > 0 && ((S.t >> 3) & 1) ? sp.mario[1] : s, mx - 8, my - 16);
        if (marioWhip > 0 && ((marioWhip >> 3) & 1)) {
          ctx.fillStyle = '#e0e0e0';
          const d = st.n === 4 ? -1 : 1;
          for (let i = 0; i < 10; i++) ctx.fillRect(mx + d * (6 + i), my - 9 + ((i * i) >> 4), 1, 1);
        }
      }
      function drawJunior(ctx) {
        const d = J.dir > 0 ? 0 : 1;
        const x = Math.round(J.x), y = Math.round(J.y);
        if (S.mode === 'dying') {
          if (S.why === 'water' && S.t > 20) { if (S.t < 60) { ctx.fillStyle = '#9cd0ff'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 8 + i * 3, st.water - 2 - ((S.t + i * 5) % 8), 2, 2); } return; }
          if (S.t < 40) ctx.drawImage(sp.jr.stand[d], x - 8, y - 16);
          else if (S.t < 140) ctx.drawImage(sp.jrRot[((S.t - 40) >> 3) % 4], x - 8, y - 16);
          else { ctx.drawImage(sp.jrRot[1], x - 8, y - 16); ctx.drawImage(sp.halo, x - 4, y - 20); }
          return;
        }
        if (J.state === 'climb') {
          const fr = ((J.anim / 6) | 0) & 1;
          if (J.v2) ctx.drawImage(sp.jr.climb2[fr], x - 8, y - 16);
          else {
            const s = fr ? sp.jr.climb1b : sp.jr.climb1;
            if (J.dir < 0) ctx.drawImage(s[0], Math.round(J.v1.x) - 7, y - 16);
            else ctx.drawImage(s[1], Math.round(J.v1.x) - 9, y - 16);
          }
          return;
        }
        let s;
        if (J.state === 'jump' || J.state === 'fall') s = sp.jr.jump[d];
        else if (J.moving) s = (((J.anim / 6) | 0) & 1) ? sp.jr.walk[d] : sp.jr.stand[d];
        else s = sp.jr.stand[d];
        ctx.drawImage(s, x - 8, y - 16);
      }
      function drawEnemies(ctx) {
        for (const e of enemies) {
          const fr = (e.t >> 3) & 1;
          if (e.type === 'snap') {
            if (e.mode === 'vine' || e.mode === 'fall') {
              const arr = e.col === 'red' ? (e.vdir < 0 ? sp.snapVRu : sp.snapVR) : (e.vdir < 0 && e.mode === 'vine' ? sp.snapVBu : sp.snapVB);
              ctx.drawImage(arr[fr], Math.round(e.x) - 4, Math.round(e.y) - 8);
            } else {
              const set = e.col === 'red' ? sp.snapR : sp.snapB;
              ctx.drawImage(set[fr][e.dir > 0 ? 0 : 1], Math.round(e.x) - 8, Math.round(e.y) - 8);
            }
          } else if (e.type === 'bird') {
            ctx.drawImage(sp.bird[fr][e.dir < 0 ? 0 : 1], Math.round(e.x) - 8, Math.round(e.y) - 6);
          } else if (e.type === 'spark') {
            ctx.drawImage((e.col === 'blue' ? sp.sparkB : sp.sparkY)[(e.t >> 2) & 1], Math.round(e.x) - 4, Math.round(e.y) - 4);
          }
        }
        for (const g of eggs) ctx.drawImage(sp.egg, Math.round(g.x) - 3, Math.round(g.y) - 3);
      }
      function drawHUD(ctx) {
        const blink = (api.frame >> 4) & 1;
        if (S.mode !== 'play' || blink) txt(ctx, '1UP', 24, 0, '#ff2a2a');
        txt(ctx, 'HIGH SCORE', 72, 0, '#ff2a2a');
        txt(ctx, String(S.score).padStart(6, '0'), 8, 9, '#fff');
        txt(ctx, String(S.hi).padStart(6, '0'), 88, 9, '#fff');
        if (S.mode === 'title') return;
        for (let i = 0; i < Math.min(S.lives - 1, 6); i++) ctx.drawImage(sp.jrIcon, 176 + i * 9, 0);
        txt(ctx, 'L=' + String(Math.min(99, S.level)).padStart(2, '0'), 176, 9, '#3a62ff');
        const bx = 168, by = 20;
        ctx.fillStyle = '#3a62ff';
        ctx.fillRect(bx, by, 48, 2); ctx.fillRect(bx, by + 20, 48, 2); ctx.fillRect(bx, by, 2, 22); ctx.fillRect(bx + 46, by, 2, 22);
        txt(ctx, 'BONUS', bx + 4, by + 3, '#00e8e8');
        txt(ctx, String(S.bonus).padStart(4, '0'), bx + 8, by + 12, S.bonus <= 1000 && blink ? '#ff2a2a' : '#fff');
      }
      function drawTitle(ctx) {
        const big = (s, y, k, c1, c2) => {
          const w = s.length * 8 * k - k; let x0 = (W - w) >> 1;
          for (const ch of s) {
            const rows = FONT[ch];
            if (rows) for (let r = 0; r < 7; r++) for (let b = 0; b < 7; b++) if (rows[r] & (64 >> b)) {
              ctx.fillStyle = c1; ctx.fillRect(x0 + b * k, y + r * k, k, k);
              ctx.fillStyle = c2; ctx.fillRect(x0 + b * k, y + r * k + k - 1, k, 1);
            }
            x0 += 8 * k;
          }
        };
        big('DONKEY', 34, 4, '#ffb020', '#c05000');
        big('KONG JR.', 70, 3, '#ffb020', '#c05000');
        // jungle vignette
        const v1 = { x: 60, top: 100, bot: 180, kind: 'vine' }, v2 = { x: 72, top: 100, bot: 180, kind: 'vine' }, v3 = { x: 160, top: 100, bot: 170, kind: 'vine' };
        drawVine(ctx, v1); drawVine(ctx, v2); drawVine(ctx, v3);
        ctx.drawImage(sp.jr.climb2[(S.t >> 4) & 1], 58, 128 + Math.round(Math.sin(S.t * 0.05) * 6));
        ctx.drawImage(sp.fruit.apple, 156, 130);
        const snapY = 110 + ((S.t * 0.4) % 60);
        ctx.drawImage(sp.snapVR[(S.t >> 3) & 1], 156, snapY);
        for (let x = 40; x < 184; x += 8) ctx.drawImage(tl.grass, x, 184);
        if (api.credits > 0) { if (coinHold > 0 || (S.t % 60) < 40) txtC(ctx, 'PUSH ONLY 1 PLAYER BUTTON', 200, '#00e8e8'); }
        else if (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : (S.t % 60) < 40) txtC(ctx, 'INSERT COIN', 200, coinFlash > 0 ? '#ff2a2a' : '#00e8e8');
        txt(ctx, 'CREDIT ' + String(Math.min(api.credits, 99)).padStart(2, '0'), 144, 248, '#00e8e8');
        txtC(ctx, 'RESCUE PAPA FROM MARIO!', 214, '#fff');
        txtC(ctx, 'ENTER OR SPACE TO PLAY', 228, '#ff2a2a');
        txtC(ctx, 'NINTENDO 1982', 238, '#fff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (S.mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawWater(ctx);
        for (const v of st.vines) drawVine(ctx, v);
        for (const p of st.plats) drawPlat(ctx, p);
        for (const m of movers) drawPlat(ctx, m);
        if (st.spring) ctx.drawImage(sp.spring[st.springAnim > 0 ? 1 : 0], st.spring.x - 8, st.spring.y - (st.springAnim > 0 ? 4 : 7));
        // locks & keys (stage 4)
        if (st.keys) {
          for (const k of st.keys) {
            ctx.fillStyle = k.locked ? '#ffe040' : '#606080';
            ctx.fillRect(k.c.x - 4, st.beamY + 8, 8, 5); ctx.fillStyle = '#000'; if (!k.locked) ctx.fillRect(k.c.x - 1, st.beamY + 9, 2, 3);
            ctx.drawImage(k.locked ? sp.key : sp.keyBlue, Math.round(k.c.x) - 4, Math.round(k.y) - 6);
          }
        }
        // cage, Mario, goal key
        drawCage(ctx);
        drawMario(ctx);
        if (st.key && !(S.mode === 'clear')) { ctx.fillStyle = '#c8c8d8'; ctx.fillRect(st.key.x - 1, st.key.y - 30, 1, 10); ctx.drawImage(sp.key, st.key.x - 4, st.key.y - 20); }
        // fruit
        for (const f of st.fruits) if (f.st !== 'gone') { const s = sp.fruit[f.k]; ctx.drawImage(s, Math.round(f.x - s.width / 2), Math.round(f.y - s.height / 2)); }
        drawEnemies(ctx);
        for (const e of fx) if ((e.t >> 2) & 1 || e.t < 8) ctx.drawImage(sp.smash, Math.round(e.x) - 8, Math.round(e.y) - 4);
        drawJunior(ctx);
        for (const p of popups) txt(ctx, p.s, Math.round(Math.max(0, Math.min(W - p.s.length * 8, p.x - p.s.length * 4))), Math.round(p.y), '#fff');
        drawHUD(ctx);
        if (S.mode === 'play' && S.ready > 0) {
          txtC(ctx, 'PLAYER 1', 112, '#00e8e8'); txtC(ctx, 'READY', 124, '#00e8e8');
        }
        if (S.mode === 'clear') {
          const msg = st.n === 4 ? (S.t > 120 ? 'CONGRATULATIONS !' : '') : ((S.t >> 3) & 1 ? 'STAGE CLEAR' : '');
          if (msg) { ctx.fillStyle = '#000'; ctx.fillRect(108 - msg.length * 4 - 4, 108, msg.length * 8 + 8, 15); txtC(ctx, msg, 112, '#ffe040'); }
        }
        if (S.mode === 'gameover') {
          ctx.fillStyle = '#000'; ctx.fillRect(56, 116, 112, 24);
          ctx.fillStyle = '#3a62ff'; ctx.fillRect(56, 116, 112, 1); ctx.fillRect(56, 139, 112, 1); ctx.fillRect(56, 116, 1, 24); ctx.fillRect(167, 116, 1, 24);
          txtC(ctx, 'GAME  OVER', 124, '#00e8e8');
        }
      }

      if (/[?&]dbg=1/.test(location.search)) {
        window.__G = { S, get st() { return st; }, get J() { return J; }, get enemies() { return enemies; }, goto(n) { S.stage = n; S.level = 2; initStage(); S.mode = 'play'; S.ready = 0; } };
      }
      return { update, render };
    }
  });
})();
