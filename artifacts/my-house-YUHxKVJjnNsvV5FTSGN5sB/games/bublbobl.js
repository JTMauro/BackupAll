// Bubble Bobble (Taito, 1986) \u2014 Bub the bubble dragon: trap monsters in bubbles, pop them for fruit, spell EXTEND,
// beat the clock before Baron von Blubba arrives, and reach the final boss on round 30.
(function () {
  'use strict';
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
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0],
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
  function text(ctx, s, x, y, col, sc, align, shadow) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    if (shadow) text(ctx, s, x + sc, y + sc, shadow, sc);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function spr(rows, pal, flip) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = mkCanvas(w, rows.length), x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(flip ? w - 1 - i : i, y, 1, 1); } } });
    return c;
  }
  function sprSet(rows, pal) { return [spr(rows, pal, true), spr(rows, pal, false)]; } // [facing left, facing right]

  const W = 256, H = 224, T = 8;
  const COLS = 32, ROWS = 28;
  const FLOOR = 216;               // y of floor top (row 27)
  const PROWS = [7, 11, 15, 19, 23];
  const START_X = 40, START_Y = FLOOR;
  const LAST = 30;                 // final boss round

  // ---------- sprite art (all drawn facing right) ----------
  const ART = {
    bub: [
      '.....kkkkk......',
      '...kkGGGGGkk....',
      '..kGGGGGWWWGk...',
      '.kGGGGGWWkkWk...',
      'WkGGGGGWWkkWGk..',
      'WWkGGGGGWWWGGGk.',
      '.WkGGGGGGGGGGGGk',
      'WWkGGGGGGGkkkkk.',
      '.WkGGGGYYYYGk...',
      'WWkGGGYYYYYGk...',
      '.kGGGGYYYYYGk...',
      '.kGGGGGYYYGGk...',
      '..kGGGGGGGGk....',
      '...kOOkkOOk.....',
      '..kOOOk.kOOOk...',
      '..kkkk...kkkk...'],
    bub2: [
      '.....kkkkk......',
      '...kkGGGGGkk....',
      '..kGGGGGWWWGk...',
      '.kGGGGGWWkkWk...',
      'WkGGGGGWWkkWGk..',
      'WWkGGGGGWWWGGGk.',
      '.WkGGGGGGGGGGGGk',
      'WWkGGGGGGGkkkkk.',
      '.WkGGGGYYYYGk...',
      'WWkGGGYYYYYGk...',
      '.kGGGGYYYYYGk...',
      '.kGGGGGYYYGGk...',
      '..kGGGGGGGGk....',
      '....kOOOOk......',
      '...kOOOOOOk.....',
      '...kkkkkkkk.....'],
    bubBlow: [
      '.....kkkkk......',
      '...kkGGGGGkk....',
      '..kGGGGGWWWGk...',
      '.kGGGGGWWkkWk...',
      'WkGGGGGWWkkWGk..',
      'WWkGGGGGWWWGGGk.',
      '.WkGGGGGGGGGkkk.',
      'WWkGGGGGGGk.....',
      '.WkGGGGYYYGkkkk.',
      'WWkGGGYYYYYGGGk.',
      '.kGGGGYYYYYGk...',
      '.kGGGGGYYYGGk...',
      '..kGGGGGGGGk....',
      '...kOOkkOOk.....',
      '..kOOOk.kOOOk...',
      '..kkkk...kkkk...'],
    zen: [
      '.......kk.......',
      '......kYYk......',
      '.......kk.......',
      '....kkkkkkkk....',
      '...kWWWWWWWWk...',
      '..kWWWWWWWWWWk..',
      '..kWWkkWWkkWWk..',
      '..kWWBkWWBkWWk..',
      '..kWWWWWWWWWWk..',
      '..kWWWWWWWWWWk..',
      '..kWWRRRRRRWWk..',
      '..kWWWWWWWWWWk..',
      '...kWWWWWWWWk...',
      '....kkkkkkkk....',
      '....kOk..kOk....',
      '...kOOk..kOOk...'],
    mighta: [
      '......kkkk......',
      '....kkWWWWkk....',
      '...kWWWWWWWWk...',
      '..kWWWWWWWWWWk..',
      '..kWkkkkkkkkWk..',
      '..kWkkkkBkkBWk..',
      '..kWkkkkkkkkWk..',
      '..kWWWWWWWWWWk..',
      '...kWWWWWWWWk...',
      '..kWWWWWWWWWWk..',
      '.kWWWWWWWWWWWWk.',
      '.kWWWWWWWWWWWWk.',
      '.kWWWWWWWWWWWWk.',
      '..kWWWWWWWWWWk..',
      '...kOOk..kOOk...',
      '...kkkk..kkkk...'],
    monsta: [
      '................',
      '.....kkkkkk.....',
      '...kkWWWWWWkk...',
      '..kWWWWWWWWWWk..',
      '.kWWWWWWWBBWWBk.',
      '.kWWWWWWWBkWWkk.',
      'kWWWWWWWWWWWWWWk',
      'kWWWWWWWWWWWWWWk',
      'kWWWWWWWkkkkkkWk',
      'kWWWWWWWWWWWWWWk',
      '.kWWWWWWWWWWWWk.',
      '.kWWWWWWWWWWWWk.',
      '..kWWkWWWWkWWk..',
      '..kWk.kWWk.kWk..',
      '...k...kk...k...',
      '................'],
    pulpul: [
      '......kkkk......',
      '....kkCCCCkk....',
      '......kkkk......',
      '.....kWWWWk.....',
      '...kkWWWWWWkk...',
      '..kWWWWWWWWWWk..',
      '.kWWWWWWBBWWBBk.',
      '.kWWWWWWBkWWBkk.',
      '.kWWWWWWWWWWWWk.',
      '.kWWWWWkkkkWWWk.',
      '..kWWWWWWWWWWk..',
      '...kWWWWWWWWk...',
      '....kkWWWWkk....',
      '......kWWk......',
      '.......kk.......',
      '................'],
    banebou: [
      '......kkkk......',
      '....kkWWWWkk....',
      '...kWWWWWWWWk...',
      '..kWWWWBBWWBBk..',
      '..kWWWWBkWWBkk..',
      '..kWWWWWWWWWWk..',
      '..kWWWWkkkkWWk..',
      '...kWWWWWWWWk...',
      '....kkkkkkkk....',
      '......kYYk......',
      '.....kYYk.......',
      '......kYYk......',
      '.....kYYk.......',
      '......kYYk......',
      '....kkkkkkkk....',
      '....kRRRRRRk....'],
    drunk: [
      '................',
      '.....kkkkkk.....',
      '....kRRRRRRk....',
      '...kRRRRRRRRk...',
      '...kSSSSSSSSk...',
      '...kSSSSkSSkk...',
      '...kSSSSSSSSk...',
      '..kWWWWWWWWWWk..',
      '..kWWWWWWWWWWk..',
      '...kWWWWWWWWk...',
      '..kBBBWWWWBBBk..',
      '.kBBBBBBBBBBBBk.',
      '.kBBBBBBBBBBBBk.',
      '..kBBBBBBBBBBk..',
      '...kOOk..kOOk...',
      '...kkkk..kkkk...'],
    hidegon: [
      '................',
      '....kkkkkkkk....',
      '...kWWWWWWWWk...',
      '..kWWWWWWWWWWk..',
      '..kWWWWWBBWBBk..',
      '..kWWWWWBkWBkk..',
      '..kWWWWWWWWWWk..',
      '..kWWWWRRRRRRk..',
      '..kWWWWWRRRRWk..',
      '..kWWWWWWWWWWk..',
      '...kWWWWWWWWk...',
      '..kWWWWWWWWWWk..',
      '..kWWWWWWWWWWk..',
      '..kWkWWkkWWkWk..',
      '...k.kk..kk.k...',
      '................'],
    invader: [
      '................',
      '................',
      '...W.......W....',
      '....W.....W.....',
      '...WWWWWWWWW....',
      '..WWW.WWW.WWW...',
      '.WWWWWWWWWWWWW..',
      '.W.WWWWWWWWW.W..',
      '.W.W.......W.W..',
      '....WW...WW.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'],
    baron: [
      '................',
      '....WWWWWWWW....',
      '..WWWWWWWWWWWW..',
      '.WWWWWWWWWWWWWW.',
      '.WWkkWWWWWWkkWW.',
      'WWWkkkWWWWkkkWWW',
      'WWWWWWWWWWWWWWWW',
      'WWWWWWkWWkWWWWWW',
      'WWWWWWWWWWWWWWWW',
      '.WWkWkWkWkWkWWW.',
      '.WWWWWWWWWWWWWW.',
      '..WWWWWWWWWWWW..',
      '...WW..WW..WW...',
      '..WW..WW..WW....',
      '................',
      '................']
  };
  const K = '#000000';
  const PAL = {
    bub: { k: K, G: '#40d040', W: '#ffffff', Y: '#ffe890', O: '#ff9030' },
    bob: { k: K, G: '#40a0ff', W: '#ffffff', Y: '#ffe890', O: '#ff9030' },
    zen: { k: K, W: '#e8e8ff', Y: '#ffd040', B: '#2040ff', R: '#ff3030', O: '#ff9030' },
    mighta: { k: K, W: '#f0f0f0', B: '#ffff40', O: '#ff9030' },
    monsta: { k: K, W: '#c060ff', B: '#ffffff' },
    pulpul: { k: K, W: '#ff9040', B: '#ffffff', C: '#40e0ff' },
    banebou: { k: K, W: '#40e080', B: '#ffffff', Y: '#ffd040', R: '#ff4040' },
    drunk: { k: K, R: '#ff4040', S: '#ffc080', W: '#ffffff', B: '#4060ff', O: '#a06030' },
    hidegon: { k: K, W: '#a0a0b0', B: '#ffffff', R: '#ff6020' },
    invader: { W: '#40ff60' },
    baron: { k: K, W: '#ffffff' }
  };
  const ANGRY = '#ff4060';
  function angryPal(p) { const q = Object.assign({}, p); if (q.W) q.W = ANGRY; if (q.G) q.G = ANGRY; return q; }
  const SPR = {
    bub: [sprSet(ART.bub, PAL.bub), sprSet(ART.bub2, PAL.bub), sprSet(ART.bubBlow, PAL.bub)],
    bob: [sprSet(ART.bub, PAL.bob), sprSet(ART.bub2, PAL.bob)],
    baron: sprSet(ART.baron, PAL.baron)
  };
  const ETYPES = ['zen', 'mighta', 'monsta', 'pulpul', 'banebou', 'drunk', 'hidegon', 'invader'];
  for (const t of ETYPES) SPR[t] = { n: sprSet(ART[t], PAL[t]), a: sprSet(ART[t], angryPal(PAL[t])) };
  const BOSS = sprSet(ART.drunk, { k: K, R: '#ff4040', S: '#ffc080', W: '#ffffff', B: '#8040ff', O: '#a06030' });
  const BOSS_HIT = sprSet(ART.drunk, { k: '#ffffff', R: '#ffffff', S: '#ffffff', W: '#ffffff', B: '#ffffff', O: '#ffffff' });

  // bubble rings: normal (green), warn (yellow/orange), red, letter (pink), thunder (yellow)
  function ring(col, hi, inner) {
    const c = mkCanvas(18, 18), x = c.getContext('2d');
    for (let py = 0; py < 18; py++) for (let px = 0; px < 18; px++) {
      const d = Math.hypot(px - 8.5, py - 8.5);
      if (d > 6.8 && d < 8.6) { x.fillStyle = col; x.fillRect(px, py, 1, 1); }
      else if (d <= 6.8 && inner) { x.fillStyle = inner; x.fillRect(px, py, 1, 1); }
    }
    x.fillStyle = hi; x.fillRect(4, 4, 2, 1); x.fillRect(4, 5, 1, 2); x.fillRect(6, 3, 2, 1);
    return c;
  }
  const RING = {
    green: ring('#40e060', '#ffffff', 'rgba(120,255,160,0.18)'),
    yellow: ring('#ffd040', '#ffffff', 'rgba(255,220,80,0.2)'),
    red: ring('#ff3030', '#ffffff', 'rgba(255,60,60,0.2)'),
    pink: ring('#ff60e0', '#ffffff', 'rgba(255,120,230,0.35)'),
    thunder: ring('#ffff40', '#ffffff', 'rgba(255,255,80,0.35)'),
    blue: ring('#60a0ff', '#ffffff', 'rgba(100,160,255,0.25)')
  };
  const BIGRING = (() => {
    const c = mkCanvas(64, 64), x = c.getContext('2d');
    for (let py = 0; py < 64; py++) for (let px = 0; px < 64; px++) {
      const d = Math.hypot(px - 31.5, py - 31.5);
      if (d > 28 && d < 31.5) { x.fillStyle = '#40e060'; x.fillRect(px, py, 1, 1); }
      else if (d <= 28) { x.fillStyle = 'rgba(120,255,160,0.2)'; x.fillRect(px, py, 1, 1); }
    }
    x.fillStyle = '#ffffff'; x.fillRect(14, 12, 6, 2); x.fillRect(12, 14, 2, 6);
    return c;
  })();

  // ---------- rounds ----------
  // p: five platform rows (rows 7, 11, 15, 19, 23), left half = 14 tiles from the wall to the centre, mirrored.
  // '#' platform (one-way from below), '|' solid block. v: extra vertical pillars [halfCol, row0, row1]. gap: holes in floor/ceiling.
  // e: enemy roster. air: where floating bubbles gather (-1 left, 0 centre, 1 right).
  const ROUNDS = [
    { p: ['...###########', '...###########', '...###########', '...###########', '...###########'], e: 'zen zen zen', air: 0 },
    { p: ['##....########', '..######......', '######....####', '....##########', '##..######....'], e: 'zen zen zen zen', air: 0, gap: 1 },
    { p: ['##########....', '.....#########', '##########....', '.....#########', '##########....'], e: 'zen zen zen zen', air: -1 },
    { p: ['#####...#####.', '.....###......', '##.......#####', '...#####......', '#######.....##'], e: 'zen zen zen zen zen', air: 0, gap: 1 },
    { p: ['......########', '....##########', '..############', '....##########', '......########'], e: 'mighta zen zen mighta', air: 0 },
    { p: ['##.##.##.##.##', '.##.##.##.##.#', '##.##.##.##.##', '.##.##.##.##.#', '##.##.##.##.##'], e: 'mighta mighta zen zen', air: 1, gap: 1 },
    { p: ['..||||||||....', '..|.....|.....', '..|.....|.###.', '..|.....|.....', '..||||..|..###'], e: 'mighta mighta mighta zen', air: 0 },
    { p: ['#.#.#.#.#.#.#.', '##############', '#.#.#.#.#.#.#.', '##############', '#.#.#.#.#.#.#.'], e: 'mighta mighta mighta mighta zen', air: -1, gap: 1 },
    { p: ['.....#########', '###.......####', '.....#####....', '###.....######', '.....###......'], e: 'monsta monsta monsta', air: 0 },
    { p: ['##############', '..............'.replace(/^../, '##'), '.....####.....', '###.......####', '.....####.....'], e: 'monsta monsta monsta monsta', air: 0, gap: 1, thunder: 1 },
    { p: ['......##......', '....######....', '..##########..', '....######....', '......##......'], e: 'monsta monsta zen zen monsta', air: 1, v: [[0, 8, 22]] },
    { p: ['|||.....|||...', '..#####.......', '|||.....|||...', '..#####.......', '|||.....|||...'], e: 'monsta mighta monsta mighta', air: 0, gap: 1, thunder: 1 },
    { p: ['###.###.###.##', '.###.###.###.#', '###.###.###.##', '.###.###.###.#', '###.###.###.##'], e: 'banebou banebou banebou', air: 0 },
    { p: ['.##########...', '...........###', '.##########...', '...........###', '.##########...'], e: 'banebou banebou banebou banebou', air: -1, gap: 1 },
    { p: ['...#.....#....', '..###...###...', '.#####.#####..', '..###...###...', '...#.....#....'], e: 'banebou banebou zen zen banebou', air: 0, v: [[6, 4, 6]] },
    { p: ['##############', '#............#'.slice(0, 14), '#..########...', '#............#'.slice(0, 14), '#######.......'], e: 'banebou monsta banebou monsta', air: 1, gap: 1 },
    { p: ['......####....', '....##....##..', '..##........##', '....##....##..', '......####....'], e: 'pulpul pulpul pulpul', air: 0 },
    { p: ['#.....#.....#.', '.#...#.#...#.#', '..#.#...#.#...', '...#.....#....', '..#.#...#.#...'], e: 'pulpul pulpul pulpul pulpul', air: 0, gap: 1 },
    { p: ['||||||||||....', '..........####', '||||||||||....', '..........####', '||||||||||....'], e: 'pulpul banebou pulpul banebou', air: -1, thunder: 1 },
    { p: ['.....|########', '.....|........', '.....|..######', '.....|........', '.....|########'], e: 'pulpul pulpul mighta mighta pulpul', air: 1, gap: 1 },
    { p: ['##....##....##', '..####..####..', '##....##....##', '..####..####..', '##....##....##'], e: 'drunk drunk drunk', air: 0 },
    { p: ['.############.', '.#..........#.', '.#..######..#.', '.#..........#.', '.######..####.'], e: 'drunk drunk drunk drunk', air: 0, gap: 1 },
    { p: ['..##..##..##..', '##..##..##..##', '..##..##..##..', '##..##..##..##', '..##..##..##..'], e: 'hidegon hidegon hidegon', air: -1 },
    { p: ['#############.', '.............#', '.############.', '#.............', '.#############'], e: 'hidegon hidegon drunk drunk', air: 1, gap: 1, thunder: 1 },
    { p: ['.....###......', '...#######....', '.###########..', '...#######....', '.....###......'], e: 'invader invader invader invader', air: 0, v: [[2, 9, 22], [11, 9, 13]] },
    { p: ['####......####', '......####....', '####......####', '......####....', '####......####'], e: 'invader invader hidegon hidegon invader', air: 0, gap: 1 },
    { p: ['.#.#.#.#.#.#.#', '#.#.#.#.#.#.#.', '.#.#.#.#.#.#.#', '#.#.#.#.#.#.#.', '.#.#.#.#.#.#.#'], e: 'zen mighta monsta pulpul banebou', air: 0 },
    { p: ['||..........||', '..##########..', '||..........||', '..##########..', '||..........||'], e: 'drunk hidegon invader monsta drunk', air: -1, gap: 1, thunder: 1 },
    { p: ['#.##.##.##.##.', '#.##.##.##.##.', '#.##.##.##.##.', '#.##.##.##.##.', '#.##.##.##.##.'], e: 'mighta monsta drunk hidegon invader zen', air: 0 },
    // 30: Super Drunk
    { p: ['..##......##..', '.....####.....', '##..........##', '.....####.....', '..##......##..'], e: '', air: 0, boss: 1, thunder: 1 }
  ];
  const TILE_PALS = [
    ['#ff70b0', '#ffc0e0', '#a02060'], ['#40c0ff', '#c0f0ff', '#1050a0'], ['#ffb030', '#ffe0a0', '#a05000'],
    ['#60e060', '#d0ffd0', '#207020'], ['#c070ff', '#f0d0ff', '#5020a0'], ['#ff5050', '#ffc0c0', '#902020'],
    ['#e0e040', '#ffffc0', '#808000'], ['#40e0c0', '#c0fff0', '#108060'], ['#a0a0ff', '#e0e0ff', '#4040a0'],
    ['#ff9070', '#ffd8c8', '#a04020']
  ];
  const tileCache = {};
  function tileImg(n) {
    if (tileCache[n]) return tileCache[n];
    const [a, b, c] = TILE_PALS[n % TILE_PALS.length], st = Math.floor(n / TILE_PALS.length) % 4;
    const cv = mkCanvas(8, 8), x = cv.getContext('2d');
    x.fillStyle = c; x.fillRect(0, 0, 8, 8);
    x.fillStyle = a;
    if (st === 0) { x.fillRect(0, 0, 7, 7); x.fillStyle = b; x.fillRect(0, 0, 7, 1); x.fillRect(0, 0, 1, 7); x.fillStyle = c; x.fillRect(3, 3, 2, 2); }
    else if (st === 1) { x.fillRect(0, 0, 8, 3); x.fillRect(0, 4, 3, 3); x.fillRect(4, 4, 4, 3); x.fillStyle = b; x.fillRect(0, 0, 8, 1); x.fillRect(0, 4, 3, 1); x.fillRect(4, 4, 4, 1); }
    else if (st === 2) { for (let i = 0; i < 4; i++) x.fillRect(3 - i, i, 2 + i * 2, 1); for (let i = 0; i < 3; i++) x.fillRect(1 + i, 4 + i, 6 - i * 2, 1); x.fillStyle = b; x.fillRect(3, 0, 2, 1); }
    else { x.fillRect(1, 1, 6, 6); x.fillStyle = b; x.fillRect(1, 1, 3, 3); x.fillStyle = c; x.fillRect(5, 5, 2, 2); }
    tileCache[n] = cv; return cv;
  }

  // fruit & treasure (drawn procedurally): value by index
  const FRUIT_VAL = [500, 700, 1000, 2000, 3000, 4000, 5000, 6000];
  const SPECIALS = ['shoes', 'pink', 'blue', 'yellow', 'clock', 'cross', 'cake', 'umbrella', 'ring'];
  const SPECIAL_W = [14, 14, 14, 12, 8, 6, 12, 3, 8];

  ArcadeRegistry.register({
    id: 'bublbobl', title: 'Bubble Bobble', year: 1986, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: blow bubble \u00b7 X/Up: jump (hold to bounce on bubbles) \u00b7 Enter: start',
    marquee: { bg: '#000040', fg: '#60ff60', accent: '#40a0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, musicT = 0, musicOn = false;
      let g = null;

      const sfx = {
        blow() { au.tone(900, 0.06, { type: 'square', vol: 0.06, slideTo: 1400 }); },
        jump() { au.tone(300, 0.1, { type: 'square', vol: 0.07, slideTo: 700 }); },
        pop() { au.tone(1200, 0.04, { type: 'square', vol: 0.08, slideTo: 400 }); },
        trap() { au.tone(600, 0.1, { type: 'triangle', vol: 0.1, slideTo: 900 }); },
        kill(k) { au.melody([[880 + k * 110, .05], [1175 + k * 110, .08]], { type: 'square', vol: 0.1 }); },
        fruit() { au.melody([[1319, .04], [1760, .06]], { type: 'square', vol: 0.09 }); },
        item() { au.melody([[784, .06], [988, .06], [1175, .06], [1568, .12]], { type: 'square', vol: 0.1 }); },
        letter() { au.melody([[1047, .06], [1568, .1]], { type: 'triangle', vol: 0.14 }); },
        die() { au.melody([[880, .1], [831, .1], [784, .1], [740, .1], [698, .1], [659, .3]], { type: 'square', vol: 0.11 }); },
        hurry() { au.melody([[1568, .06], [0, .03], [1568, .06], [0, .03], [1568, .06], [0, .03], [2093, .2]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [880, .1], [1047, .3]], { type: 'square', vol: 0.1 }); },
        extend() { au.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [1319, .08], [1568, .3]], { type: 'square', vol: 0.12 }); },
        thunder() { au.noise(0.35, { vol: 0.16, freq: 5000, slideTo: 600 }); },
        throw() { au.tone(250, 0.07, { type: 'sawtooth', vol: 0.05 }); },
        bounce() { au.tone(500, 0.05, { type: 'triangle', vol: 0.08, slideTo: 800 }); },
        coin() { au.tone(1320, 0.06, { type: 'square', vol: 0.08, slideTo: 1980 }); },
        nocoin() { au.tone(98, 0.28, { type: 'square', vol: 0.16 }); }
      };
      // original bouncy loop (not the arcade tune)
      const TUNE = [[659, 1], [784, 1], [880, 2], [784, 1], [659, 1], [587, 2], [523, 1], [587, 1], [659, 1], [784, 1], [659, 2], [0, 2],
        [698, 1], [784, 1], [880, 2], [988, 1], [880, 1], [784, 2], [659, 1], [587, 1], [523, 2], [587, 2], [523, 2], [0, 2]];
      function music() {
        if (!musicOn || api.continuing) return;
        if (--musicT > 0) return;
        const sp = g && g.hurry ? 0.085 : 0.12;
        const d = au.melody(TUNE.map(([f, l]) => [f, l * sp]), { type: 'square', vol: 0.035 }) || 3;
        const bass = []; for (let i = 0; i < 12; i++) bass.push([[131, 165, 147, 196][(i >> 2) % 4] , sp * 2]);
        au.melody(bass, { type: 'triangle', vol: 0.06 });
        musicT = Math.round(d * 60);
      }

      // ---------- map ----------
      let map = new Uint8Array(COLS * ROWS);
      function buildMap(n) {
        const R = ROUNDS[n - 1], m = new Uint8Array(COLS * ROWS);
        const set = (c, r, v) => { if (c >= 0 && c < COLS && r >= 0 && r < ROWS) m[r * COLS + c] = v; };
        for (let r = 2; r < ROWS; r++) { set(0, r, 2); set(1, r, 2); set(30, r, 2); set(31, r, 2); }
        for (let c = 2; c < 30; c++) {
          const gap = R.gap && c >= 14 && c <= 17;
          if (!gap) { set(c, 27, 1); set(c, 2, 3); }
        }
        R.p.forEach((half, i) => {
          const s = (half + '..............').slice(0, 14), row = PROWS[i];
          for (let k = 0; k < 14; k++) {
            const ch = s[k], v = ch === '#' ? 1 : ch === '|' ? 2 : 0;
            if (v) { set(2 + k, row, v); set(29 - k, row, v); }
          }
        });
        if (R.v) for (const [hc, r0, r1] of R.v) for (let r = r0; r <= r1; r++) { set(2 + hc, r, 2); set(29 - hc, r, 2); }
        return m;
      }
      const tile = (c, r) => (c < 0 || c >= COLS) ? 2 : (r < 0 || r >= ROWS) ? 0 : map[r * COLS + c];
      const tileAtPx = (x, y) => tile(Math.floor(x / T), Math.floor(y / T));
      const wallPx = (x, y) => tileAtPx(x, y) === 2;

      // ---------- physics helpers (entities: x = centre, y = feet) ----------
      function land(e, prevY) {
        if (e.vy < 0) return false;
        const r0 = Math.max(3, Math.ceil(prevY / T)), r1 = Math.floor(e.y / T);
        for (let r = r0; r <= r1 && r < ROWS; r++) {
          const top = r * T;
          if (prevY > top + 0.01 || e.y < top) continue;
          for (const dx of [-5, 0, 5]) {
            const c = Math.floor((e.x + dx) / T), t = tile(c, r);
            if ((t === 1 || t === 2) && tile(c, r - 1) !== 2) { e.y = top; e.vy = 0; return true; }
          }
        }
        return false;
      }
      function moveX(e, dx) {
        if (!dx) return false;
        const nx = e.x + dx, edge = nx + Math.sign(dx) * 6;
        const blocked = (wallPx(edge, e.y - 3) || wallPx(edge, e.y - 12)) && !wallPx(e.x, e.y - 3) && !wallPx(e.x, e.y - 12);
        if (blocked || nx < 22 || nx > 234) { e.x = Math.max(22, Math.min(234, e.x)); return true; }
        e.x = nx; return false;
      }
      function physY(e, grav, maxFall) {
        const py = e.y;
        e.vy = Math.min(maxFall, e.vy + grav);
        e.y += e.vy;
        e.onGround = land(e, py);
        if (e.vy < 0 && e.y - 16 < 24) { e.y = 40; e.vy = 0; }
        if (e.y > H + 16) e.y -= H;     // fell through the floor gap: wrap to the top
      }
      function groundAhead(e, dir) {
        const c = Math.floor((e.x + dir * 7) / T), r = Math.floor((e.y + 1) / T);
        const t = tile(c, r); return t === 1 || t === 2;
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, round: 1, letters: [0, 0, 0, 0, 0, 0], nextExtra: 30000, phase: 'start', t: 0, pops: [], over: 0 };
        g.player = mkPlayer();
        loadRound(1);
        musicOn = true; musicT = 60;
      }
      function mkPlayer() {
        return { x: START_X, y: START_Y, vx: 0, vy: 0, dir: 1, onGround: true, fireCD: 0, inv: 120, dead: 0, anim: 0, blowT: 0, shoes: 0, pink: 0, blue: 0, yellow: 0 };
      }
      function enemySpots(n) {
        const spots = [];
        for (const r of [7, 11, 15, 19]) for (let c = 3; c < 29; c++) {
          const t = tile(c, r);
          if ((t === 1 || t === 2) && tile(c, r - 1) === 0 && tile(c, r - 2) === 0 && tile(c - 1, r) && tile(c + 1, r)) spots.push([c * T + 4, r * T]);
        }
        let seed = n * 977 + 3;
        const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = spots[i]; spots[i] = spots[j]; spots[j] = t; }
        const out = [];
        for (const s of spots) if (out.every(o => Math.abs(o[0] - s[0]) > 24 || o[1] !== s[1])) out.push(s);
        return out.length ? out : [[128, 56]];
      }
      function loadRound(n) {
        g.round = n;
        const R = ROUNDS[n - 1];
        map = buildMap(n);
        g.R = R;
        g.enemies = []; g.bubbles = []; g.items = []; g.shots = []; g.bolts = []; g.fx = [];
        g.levelT = 0; g.hurry = false; g.hurryMsg = 0; g.baron = null; g.special = false; g.freeze = 0;
        g.letterT = 600 + Math.floor(Math.random() * 600); g.thunderT = 120; g.chainId = 0; g.storm = 0;
        g.specialT = 420 + Math.floor(Math.random() * 600);
        g.hurryAt = Math.max(1200, 1900 - n * 20);
        const types = R.e ? R.e.split(' ') : [];
        const spots = enemySpots(n);
        types.forEach((t, i) => {
          const s = spots[i % spots.length];
          g.enemies.push(mkEnemy(t, s[0], s[1], i));
        });
        g.boss = R.boss ? { x: 128, y: 120, vx: 0.9, vy: 0.6, hp: 24, flash: 0, throwT: 120, state: 'fight', t: 0 } : null;
      }
      function mkEnemy(type, tx, ty, i) {
        return { type, x: 128, y: -10 - i * 20, tx, ty, vx: 0, vy: 0, dir: i & 1 ? -1 : 1, state: 'enter', t: 0, angry: false, onGround: false, cd: 60 + i * 30, ph: i * 1.3, enterT: 70 + i * 12, sx: 128, sy: -10 - i * 20 };
      }
      function addScore(n, x, y) {
        g.score += n;
        if (g.score > hi) hi = g.score;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 30000 ? 70000 : 100000; sfx.extend(); }
        if (x != null) g.pops.push({ x, y, txt: String(n), t: 0 });
      }
      function enemiesLeft() { return g.enemies.some(e => e.state !== 'die'); }
      function speedOf(e) {
        const base = { zen: 0.75, mighta: 0.65, monsta: 0.8, pulpul: 0.8, banebou: 0.9, drunk: 0.7, hidegon: 0.7, invader: 0.6 }[e.type] || 0.7;
        return (base + Math.min(0.4, g.round * 0.012)) * (e.angry ? 1.7 : 1);
      }

      // ---------- player ----------
      const jumpKey = () => api.key('KeyX') || api.key('ArrowUp') || api.key('KeyZ');
      const jumpPressed = () => api.anyPressed('KeyX', 'ArrowUp', 'KeyZ');
      function updatePlayer() {
        const p = g.player;
        if (p.dead) return;
        if (p.inv > 0) p.inv--;
        if (p.fireCD > 0) p.fireCD--;
        if (p.blowT > 0) p.blowT--;
        const sp = p.shoes ? 1.9 : 1.35;
        let mv = 0;
        if (api.key('ArrowLeft')) mv = -1; else if (api.key('ArrowRight')) mv = 1;
        if (mv) { p.dir = mv; p.anim++; moveX(p, mv * sp); }
        if (p.onGround && jumpPressed()) { p.vy = -4.4; p.onGround = false; sfx.jump(); }
        physY(p, 0.2, 2.1);
        if (api.pressed('Space') && p.fireCD <= 0) {
          p.fireCD = p.blue ? 9 : 16; p.blowT = 10; sfx.blow();
          const bx = p.x + p.dir * 10;
          g.bubbles.push({ x: Math.max(24, Math.min(232, bx)), y: p.y - 8, vx: p.dir * (p.yellow ? 5.5 : 4), state: 'shot', t: 0, range: p.pink ? 24 : 15, life: 640, kind: 'normal', enemy: null, pop: 0 });
        }
        // bubbles: bounce or pop
        for (const b of g.bubbles) {
          if (b.pop || (b.state === 'shot' && b.t < 8)) continue;
          const dx = b.x - p.x, dy = b.y - (p.y - 8);
          if (dx * dx + dy * dy > 13 * 13) continue;
          if (p.vy > 0 && p.y < b.y + 2 && jumpKey() && !b.enemy && b.kind === 'normal') { p.vy = -3.9; sfx.bounce(); continue; }
          if (p.vy > 0 && p.y < b.y - 2 && jumpKey() && b.enemy) { p.vy = -3.9; sfx.bounce(); }
          startChain(b);
        }
        // items
        for (const it of g.items) {
          if (it.got || it.t < 10) continue;
          if (Math.abs(it.x - p.x) < 12 && Math.abs(it.y - p.y) < 14) collect(it);
        }
      }
      function killPlayer() {
        const p = g.player;
        if (p.dead || p.inv > 0 || g.phase !== 'play') return;
        p.dead = 1; sfx.die(); musicOn = false;
      }
      function updateDeath() {
        const p = g.player;
        p.dead++;
        if (p.dead < 100) return;
        g.baron = null; g.levelT = 0; g.hurry = false; g.shots = [];
        for (const e of g.enemies) e.angry = false;
        const respawn = () => {
          const q = mkPlayer(); g.player = q; musicOn = true; musicT = 30;
        };
        if (g.lives <= 1) {
          const cg = g;
          p.dead = 0; p.hold = true;
          g.phase = 'hold';
          const over = () => { if (g !== cg) return; api.setHiScore(g.score); g.phase = 'over'; g.t = 360; musicOn = false; au.melody([[523, .2], [494, .2], [466, .2], [440, .5]], { type: 'square', vol: 0.1 }); };
          if (api.offerContinue) api.offerContinue(() => { if (g !== cg) return; g.lives = 3; respawn(); g.phase = 'play'; }, over);
          else over();
          return;
        }
        g.lives--; respawn();
      }

      // ---------- bubbles ----------
      function startChain(b) { g.chainId++; g.chainCount = 0; b.pop = 1; b.chain = g.chainId; }
      function burst(b) {
        g.fx.push({ kind: 'pop', x: b.x, y: b.y, t: 0, col: b.kind === 'letter' ? '#ff60e0' : b.kind === 'thunder' ? '#ffff40' : '#80ff90' });
        // neighbours pop in a chain
        for (const o of g.bubbles) {
          if (o === b || o.pop || o.dead || o.state === 'shot') continue;
          const dx = o.x - b.x, dy = o.y - b.y;
          if (dx * dx + dy * dy < 20 * 20) { o.pop = 5; o.chain = b.chain; }
        }
        b.dead = true;
        if (b.enemy) {
          const e = b.enemy; g.chainCount = (g.chainCount || 0) + 1;
          const k = g.chainCount;
          killEnemy(e, k, b.x < g.player.x ? -1 : 1);
          if (k >= 3) spawnLetter();
        } else if (b.kind === 'letter') {
          g.letters[b.letter] = 1; addScore(100, b.x, b.y); sfx.letter();
          if (g.letters.every(v => v)) { extend(); }
        } else if (b.kind === 'thunder') {
          const dir = g.player.dir;
          g.bolts.push({ x: b.x, y: b.y, vx: dir * 4, t: 0 }); sfx.thunder();
        } else { addScore(10); sfx.pop(); }
      }
      function killEnemy(e, k, dir) {
        e.state = 'die'; e.vx = dir * (1 + Math.random()); e.vy = -4; e.t = 0; e.k = k;
        addScore(1000 * Math.pow(2, Math.min(6, k - 1)), e.x, e.y - 16);
        sfx.kill(k);
      }
      function spawnLetter() {
        if (g.bubbles.some(b => b.kind === 'letter') || g.R.boss) return;
        const missing = []; g.letters.forEach((v, i) => { if (!v) missing.push(i); });
        const L = missing.length && Math.random() < 0.7 ? missing[Math.floor(Math.random() * missing.length)] : Math.floor(Math.random() * 6);
        const fromL = Math.random() < 0.5;
        g.bubbles.push({ x: fromL ? 26 : 230, y: 200, vx: 0, state: 'float', t: 0, life: 900, kind: 'letter', letter: L, enemy: null, pop: 0, drift: fromL ? 0.6 : -0.6 });
      }
      function spawnThunder() {
        if (g.bubbles.filter(b => b.kind === 'thunder').length >= (g.R.boss ? 5 : 3)) return;
        const x = g.R.gap ? 128 + (Math.random() - 0.5) * 24 : (Math.random() < 0.5 ? 40 : 216);
        g.bubbles.push({ x, y: 214, vx: 0, state: 'float', t: 0, life: 900, kind: 'thunder', enemy: null, pop: 0, drift: (Math.random() - 0.5) * 0.8 });
      }
      function extend() {
        g.letters = [0, 0, 0, 0, 0, 0]; g.lives++; sfx.extend();
        g.extendMsg = 180;
        // spelling EXTEND also clears the round, like the arcade
        for (const e of g.enemies) if (e.state !== 'die') { if (e.bubble) e.bubble.dead = true; killEnemy(e, 1, 1); }
      }
      function updateBubbles() {
        const R = g.R, gx = R.air < 0 ? 52 : R.air > 0 ? 204 : 128, gy = 36;
        for (const b of g.bubbles) {
          if (b.dead) continue;
          b.t++;
          if (b.pop) { if (--b.pop <= 0) burst(b); continue; }
          if (b.state === 'shot') {
            b.x += b.vx;
            const blocked = wallPx(b.x + Math.sign(b.vx) * 8, b.y) || b.x < 24 || b.x > 232;
            // capture enemies on the way
            for (const e of g.enemies) {
              if (e.state === 'die' || e.state === 'bub' || e.state === 'enter') continue;
              if (Math.abs(e.x - b.x) < 12 && Math.abs((e.y - 8) - b.y) < 12) {
                e.state = 'bub'; e.bubble = b; b.enemy = e; b.escape = Math.max(260, 520 - g.round * 8); b.state = 'float'; sfx.trap();
                break;
              }
            }
            if (blocked) { b.x = Math.max(24, Math.min(232, b.x - b.vx)); b.state = 'float'; }
            if (b.t >= b.range) b.state = 'float';
            continue;
          }
          // floating: rise, then drift to the gathering point
          if (b.kind !== 'normal' && b.t < 160) { b.y -= 0.45; b.x += b.drift || 0; if (b.x < 24 || b.x > 232) b.drift = -(b.drift || 0); }
          else if (b.y > gy + 4) { b.y -= 0.55; b.x += Math.sin((b.t + b.x) * 0.05) * 0.25; }
          else { b.x += Math.max(-0.4, Math.min(0.4, (gx - b.x) * 0.02)) + Math.sin(b.t * 0.07) * 0.15; b.y += Math.sin(b.t * 0.09) * 0.12; }
          b.x = Math.max(24, Math.min(232, b.x)); b.y = Math.max(32, Math.min(212, b.y));
          // keep apart
          for (const o of g.bubbles) {
            if (o === b || o.dead || o.state === 'shot') continue;
            const dx = b.x - o.x, dy = b.y - o.y, d2 = dx * dx + dy * dy;
            if (d2 < 196 && d2 > 0.01) { const d = Math.sqrt(d2); b.x += dx / d * 0.25; b.y += dy / d * 0.25; }
          }
          if (b.enemy) {
            b.enemy.x = b.x; b.enemy.y = b.y + 8;
            if (g.freeze <= 0 && --b.escape <= 0) {
              const e = b.enemy; e.state = 'air'; e.bubble = null; e.angry = true; e.vy = -2; b.dead = true; b.enemy = null;
              au.tone(200, 0.15, { type: 'sawtooth', vol: 0.08, slideTo: 400 });
            }
          } else if (--b.life <= 0) { b.dead = true; g.fx.push({ kind: 'pop', x: b.x, y: b.y, t: 0, col: '#80ff90' }); }
        }
        g.bubbles = g.bubbles.filter(b => !b.dead);
        if (g.bubbles.length > 40) g.bubbles.splice(0, g.bubbles.length - 40);
      }
      function updateBolts() {
        for (const bo of g.bolts) {
          bo.x += bo.vx; bo.t++;
          for (const e of g.enemies) {
            if (e.state === 'die') continue;
            if (Math.abs(e.x - bo.x) < 10 && Math.abs(e.y - 8 - bo.y) < 12) {
              if (e.bubble) e.bubble.dead = true;
              g.chainCount = 1; killEnemy(e, 1, Math.sign(bo.vx));
            }
          }
          const B = g.boss;
          if (B && B.state === 'fight' && Math.abs(B.x - bo.x) < 24 && Math.abs(B.y - 24 - bo.y) < 26) {
            bo.dead = true; B.hp--; B.flash = 10; addScore(100);
            au.tone(150, 0.12, { type: 'sawtooth', vol: 0.12, slideTo: 60 });
            if (B.hp <= 0) { B.state = 'bub'; B.t = 0; g.shots = []; sfx.clear(); }
          }
          if (bo.x < 16 || bo.x > 240) bo.dead = true;
        }
        g.bolts = g.bolts.filter(b => !b.dead);
      }

      // ---------- enemies ----------
      function updateEnemies() {
        const p = g.player;
        for (const e of g.enemies) {
          e.t++;
          if (e.state === 'die') {
            e.vy = Math.min(3, e.vy + 0.15);
            const py = e.y; e.y += e.vy; e.x += e.vx;
            if (e.x < 22 || e.x > 234) { e.vx = -e.vx; e.x = Math.max(22, Math.min(234, e.x)); }
            if (e.t > 30 && e.y > 40 && land(e, py)) { spawnFruit(e.x, e.y, e.k); e.gone = true; }
            if (e.y > FLOOR) { e.y = FLOOR; spawnFruit(e.x, e.y, e.k); e.gone = true; }
            continue;
          }
          if (e.state === 'bub') continue;
          if (e.state === 'enter') {
            const k = Math.min(1, e.t / e.enterT);
            e.x = e.sx + (e.tx - e.sx) * k; e.y = e.sy + (e.ty - e.sy) * k;
            if (k >= 1) { e.state = 'walk'; e.onGround = true; }
            continue;
          }
          if (g.freeze > 0) continue;
          if (g.hurry) e.angry = true;
          const sp = speedOf(e);
          // projectile throwers
          if (--e.cd <= 0 && p && !p.dead) {
            e.cd = 150 + Math.floor(Math.random() * 150) - (e.angry ? 60 : 0);
            const sameRow = Math.abs(p.y - e.y) < 12, facing = Math.sign(p.x - e.x) === e.dir;
            if (e.type === 'mighta' && sameRow && facing) { g.shots.push({ kind: 'rock', x: e.x + e.dir * 8, y: e.y - 8, vx: e.dir * 1.8, vy: 0, t: 0 }); sfx.throw(); }
            if (e.type === 'drunk' && Math.random() < 0.7) { g.shots.push({ kind: 'bottle', x: e.x, y: e.y - 12, vx: e.dir * 1.8, vy: -2.2, t: 0 }); sfx.throw(); }
            if (e.type === 'hidegon' && sameRow) { g.shots.push({ kind: 'fire', x: e.x + e.dir * 8, y: e.y - 8, vx: e.dir * 2.2, vy: 0, t: 0 }); sfx.throw(); }
            if (e.type === 'invader' && Math.abs(p.x - e.x) < 40 && p.y > e.y) { g.shots.push({ kind: 'beam', x: e.x, y: e.y, vx: 0, vy: 2, t: 0 }); sfx.throw(); }
          }
          if (e.type === 'monsta') {
            // diagonal bouncer, ignores platforms
            if (!e.vx) { e.vx = e.dir * sp; e.vy = sp * 0.75; }
            e.vx = Math.sign(e.vx) * sp; e.vy = Math.sign(e.vy) * sp * 0.75;
            e.x += e.vx; e.y += e.vy;
            if (e.x < 24 || e.x > 232 || wallPx(e.x + Math.sign(e.vx) * 8, e.y - 8)) { e.vx = -e.vx; e.x += e.vx * 2; }
            if (e.y < 42 || e.y > FLOOR) { e.vy = -e.vy; e.y = Math.max(42, Math.min(FLOOR, e.y)); }
            e.dir = Math.sign(e.vx);
            continue;
          }
          if (e.type === 'pulpul' || e.type === 'invader') {
            // flyers: drift horizontally, home vertically toward the player in a wave
            e.x += e.dir * sp;
            if (e.x < 24 || e.x > 232 || wallPx(e.x + e.dir * 8, e.y - 8)) { e.dir = -e.dir; e.x += e.dir * 2; }
            const ty = e.type === 'invader' ? 60 + Math.sin(e.t * 0.01 + e.ph) * 30 : p.y + Math.sin(e.t * 0.04 + e.ph) * 24;
            e.y += Math.max(-0.6, Math.min(0.6, (ty - e.y) * 0.02)) + Math.sin(e.t * 0.08) * 0.3;
            e.y = Math.max(42, Math.min(FLOOR, e.y));
            continue;
          }
          if (e.type === 'banebou') {
            // spring: always hopping in arcs
            if (e.onGround) { e.vy = -3.8 - Math.random() * 1.2; e.onGround = false; if (Math.random() < 0.25) e.dir = Math.sign(p.x - e.x) || e.dir; }
            if (moveX(e, e.dir * sp * 1.2)) e.dir = -e.dir;
            physY(e, 0.18, 2.4);
            continue;
          }
          // walkers: zen-chan, mighta, drunk, hidegons
          if (e.onGround) {
            if (moveX(e, e.dir * sp)) e.dir = -e.dir;
            if (!groundAhead(e, e.dir)) {
              if (Math.random() < (p.y > e.y + 8 ? 0.85 : 0.35)) { /* walk off */ } else e.dir = -e.dir;
            }
            const above = p.y < e.y - 20;
            if (above && Math.random() < (e.angry ? 0.03 : 0.012)) {
              // jump if there's a platform within reach overhead
              const c = Math.floor(e.x / T), r = Math.floor(e.y / T);
              for (let k = 2; k <= 5; k++) { const t = tile(c, r - k); if (t === 1 || t === 2) { e.vy = -4.4; e.onGround = false; break; } }
            }
            if (Math.abs(p.y - e.y) < 8 && Math.random() < 0.01) e.dir = Math.sign(p.x - e.x) || e.dir;
          } else moveX(e, e.dir * sp * 0.6);
          physY(e, 0.2, 2.1);
        }
        g.enemies = g.enemies.filter(e => !e.gone);
        // collisions with Bub
        if (!p.dead && p.inv <= 0) {
          for (const e of g.enemies) {
            if (e.state === 'die' || e.state === 'bub' || e.state === 'enter') continue;
            if (Math.abs(e.x - p.x) < 11 && Math.abs(e.y - p.y) < 12) { killPlayer(); break; }
          }
        }
      }
      function updateShots() {
        const p = g.player;
        for (const s of g.shots) {
          s.t++;
          if (s.kind === 'bottle') s.vy += 0.1;
          s.x += s.vx; s.y += s.vy;
          if (s.x < 20 || s.x > 236 || s.y > H || (s.kind !== 'beam' && wallPx(s.x, s.y)) || (s.kind === 'bottle' && s.vy > 0 && tileAtPx(s.x, s.y) === 1) || s.t > 400) s.dead = true;
          if (!p.dead && p.inv <= 0 && Math.abs(s.x - p.x) < 7 && Math.abs(s.y - (p.y - 8)) < 9) { s.dead = true; killPlayer(); }
        }
        g.shots = g.shots.filter(s => !s.dead);
      }
      function updateBaron() {
        const p = g.player;
        if (g.R.boss) return;
        if (!g.hurry && g.levelT >= g.hurryAt) {
          g.hurry = true; g.hurryMsg = 150; sfx.hurry(); musicT = 1;
        }
        if (!g.baron && g.levelT >= g.hurryAt + 600) {
          g.baron = { x: 128, y: 24, t: 0 }; au.melody([[220, .15], [208, .15], [196, .3]], { type: 'sawtooth', vol: 0.1 });
        }
        const b = g.baron;
        if (b && !p.dead) {
          b.t++;
          const sp = Math.min(1.6, 0.5 + g.round * 0.01 + b.t * 0.0002);
          const dx = p.x - b.x, dy = (p.y - 8) - b.y, d = Math.hypot(dx, dy) || 1;
          b.x += dx / d * sp; b.y += dy / d * sp;
          if (d < 11 && p.inv <= 0) killPlayer();
        }
      }
      function updateBoss() {
        const B = g.boss; if (!B) return;
        B.t++;
        if (B.flash > 0) B.flash--;
        if (B.state === 'fight') {
          if (g.freeze <= 0) {
            B.x += B.vx; B.y += B.vy;
            if (B.x < 48 || B.x > 208) B.vx = -B.vx;
            if (B.y < 72 || B.y > FLOOR) B.vy = -B.vy;
            if (--B.throwT <= 0) {
              B.throwT = Math.max(60, 130 - (24 - B.hp) * 3);
              const n = B.hp < 12 ? 7 : 5;
              for (let i = 0; i < n; i++) {
                const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5 + (Math.random() - 0.5) * 0.1;
                g.shots.push({ kind: 'bottle', x: B.x, y: B.y - 30, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.6, t: 0 });
              }
              sfx.throw();
            }
          }
          const p = g.player;
          if (!p.dead && p.inv <= 0 && Math.abs(B.x - p.x) < 22 && Math.abs(B.y - 22 - (p.y - 8)) < 26) killPlayer();
        } else if (B.state === 'bub') {
          B.y = Math.max(70, B.y - 0.6); B.x += (128 - B.x) * 0.02;
          if (B.t > 200) {
            B.state = 'gone';
            for (let i = 0; i < 12; i++) g.fx.push({ kind: 'pop', x: B.x + (Math.random() - 0.5) * 50, y: B.y - 20 + (Math.random() - 0.5) * 50, t: -i * 3, col: '#80ff90' });
            g.items.push({ kind: 'special', sp: 'diamond', x: B.x, y: B.y - 20, vy: 0, t: 0, life: 1e9, fall: true, val: 100000 });
          }
        }
      }

      // ---------- items ----------
      function spawnFruit(x, y, k) {
        const idx = Math.min(7, (k || 1) - 1 + Math.floor(g.round / 8));
        g.items.push({ kind: 'fruit', f: idx, val: FRUIT_VAL[idx], x: Math.max(24, Math.min(232, x)), y, t: 0, life: 600 });
      }
      function spawnSpecial() {
        if (g.special || g.R.boss) return;
        g.special = true;
        const tot = SPECIAL_W.reduce((a, b) => a + b, 0);
        let k = Math.random() * tot, sp = SPECIALS[0];
        for (let i = 0; i < SPECIALS.length; i++) { k -= SPECIAL_W[i]; if (k <= 0) { sp = SPECIALS[i]; break; } }
        if (sp === 'umbrella' && g.round >= LAST - 4) sp = 'cake';
        const spots = enemySpots(g.round * 3 + 1 + Math.floor(Math.random() * 50));
        const s = spots[Math.floor(Math.random() * spots.length)];
        g.items.push({ kind: 'special', sp, x: s[0], y: s[1], t: 0, life: 720 });
      }
      function collect(it) {
        it.got = true;
        const p = g.player;
        if (it.kind === 'fruit') { addScore(it.val, it.x, it.y - 12); sfx.fruit(); return; }
        sfx.item();
        switch (it.sp) {
          case 'shoes': p.shoes = 1; addScore(100, it.x, it.y - 12); break;
          case 'pink': p.pink = 1; addScore(100, it.x, it.y - 12); break;
          case 'blue': p.blue = 1; addScore(100, it.x, it.y - 12); break;
          case 'yellow': p.yellow = 1; addScore(100, it.x, it.y - 12); break;
          case 'clock': g.freeze = 480; addScore(1000, it.x, it.y - 12); break;
          case 'cake': addScore(5000, it.x, it.y - 12); break;
          case 'ring': addScore(3000, it.x, it.y - 12); break;
          case 'cross':
            g.storm = 60; sfx.thunder();
            g.chainCount = 0;
            for (const e of g.enemies) if (e.state !== 'die') { if (e.bubble) e.bubble.dead = true; g.chainCount++; killEnemy(e, Math.min(4, g.chainCount), e.x < 128 ? -1 : 1); }
            break;
          case 'umbrella':
            g.skip = 3; addScore(3000, it.x, it.y - 12);
            for (const e of g.enemies) e.gone = true;
            g.enemies = [];
            break;
          case 'diamond': addScore(it.val, it.x, it.y - 12); g.bossDone = true; break;
        }
      }
      function updateItems() {
        for (const it of g.items) {
          it.t++;
          if (it.fall) { const py = it.y; it.vy = Math.min(2, (it.vy || 0) + 0.1); it.y += it.vy; if (land(it, py) || it.y >= FLOOR) { it.fall = false; it.y = Math.min(it.y, FLOOR); } }
          if (--it.life <= 0) it.got = true;
        }
        g.items = g.items.filter(it => !it.got);
      }

      // ---------- round flow ----------
      function updatePlay() {
        g.levelT++;
        if (g.freeze > 0) g.freeze--;
        if (g.hurryMsg > 0) g.hurryMsg--;
        if (g.extendMsg > 0) g.extendMsg--;
        if (g.storm > 0) g.storm--;
        const p = g.player;
        if (p.dead) { updateDeath(); if (g.phase !== 'play') return; }
        else updatePlayer();
        updateBubbles(); updateBolts();
        if (!p.dead) { updateEnemies(); updateShots(); updateBaron(); updateBoss(); }
        updateItems();
        if (--g.letterT <= 0) { g.letterT = 900 + Math.floor(Math.random() * 900); spawnLetter(); }
        if (g.R.thunder && --g.thunderT <= 0) { g.thunderT = g.R.boss ? 70 : 200 + Math.floor(Math.random() * 200); spawnThunder(); }
        if (--g.specialT <= 0 && !g.special) spawnSpecial();
        // round cleared?
        const cleared = g.R.boss ? g.bossDone : (!enemiesLeft() && !g.enemies.length);
        if ((cleared || g.skip) && !p.dead) {
          g.phase = 'clear'; g.t = g.skip ? 90 : (g.R.boss ? 120 : 200);
          g.baron = null; g.shots = [];
          if (g.R.boss) { g.phase = 'clear'; }
        }
      }
      function startScroll() {
        let next = g.round + (g.skip || 1);
        g.skip = 0;
        if (g.round >= LAST) { g.phase = 'ending'; g.t = 900; musicOn = false; au.melody([[523, .15], [659, .15], [784, .15], [1047, .3], [784, .15], [1047, .5]], { type: 'square', vol: 0.12 }); return; }
        next = Math.min(LAST, next);
        g.prevMap = map; g.prevRound = g.round;
        loadRound(next);
        g.phase = 'scroll'; g.t = 0;
        const p = g.player; g.scrollFrom = { x: p.x, y: p.y };
        sfx.clear();
      }

      let lastCred = api.credits;
      function update() {
        frame++;
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { newGame(); mode = 'game'; g.phase = 'start'; g.t = 150; au.melody([[523, .1], [659, .1], [784, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.11 }); }
            else { coinFlash = 90; sfx.nocoin(); }
          }
          return;
        }
        for (const pp of g.pops) pp.t++;
        g.pops = g.pops.filter(pp => pp.t < 50);
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 14);
        if (g.phase !== 'hold' && g.phase !== 'over') music();
        switch (g.phase) {
          case 'start':
            // enemies drop in while ROUND n / READY shows
            for (const e of g.enemies) if (e.state === 'enter') { e.t++; const k = Math.min(1, e.t / e.enterT); e.x = e.sx + (e.tx - e.sx) * k; e.y = e.sy + (e.ty - e.sy) * k; if (k >= 1) { e.state = 'walk'; e.onGround = true; } }
            if (--g.t <= 0) g.phase = 'play';
            break;
          case 'play': updatePlay(); break;
          case 'clear':
            g.player.inv = 2;
            updatePlayer(); updateItems(); updateBubbles();
            for (const e of g.enemies) if (e.state === 'die') { e.t++; e.vy = Math.min(3, e.vy + 0.15); const py = e.y; e.y += e.vy; e.x += e.vx; if ((e.t > 30 && land(e, py)) || e.y > FLOOR) { spawnFruit(e.x, Math.min(e.y, FLOOR), e.k); e.gone = true; } }
            g.enemies = g.enemies.filter(e => !e.gone);
            if (--g.t <= 0) startScroll();
            break;
          case 'scroll':
            g.t++;
            if (g.t >= 110) { g.phase = 'start'; g.t = 60; g.prevMap = null; g.player.x = START_X; g.player.y = START_Y; g.player.vy = 0; g.player.inv = 90; g.player.onGround = true; for (const e of g.enemies) e.t = 0; }
            break;
          case 'over':
            if (--g.t <= 0 || (g.t < 250 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
          case 'ending':
            if (--g.t <= 0 || (g.t < 700 && api.anyPressed('Enter', 'Space'))) { api.setHiScore(g.score); mode = 'title'; titleT = 0; }
            break;
        }
      }

      // ---------- drawing ----------
      function drawMap(ctx, m, round, oy) {
        const img = tileImg(round - 1);
        for (let r = 2; r < ROWS; r++) {
          const y = r * T + oy; if (y < 8 || y > H) continue;
          for (let c = 0; c < COLS; c++) {
            const t = m[r * COLS + c];
            if (!t) continue;
            if (t === 3 && r === 2) { ctx.drawImage(img, c * T, y); continue; }
            ctx.drawImage(img, c * T, y);
            // shadow under platforms (BB's dark drop shadow)
            if ((t === 1 || t === 2) && c > 1 && c < 30 && r < 27 && !m[(r + 1) * COLS + c]) { ctx.fillStyle = 'rgba(0,0,40,0.55)'; ctx.fillRect(c * T + 2, y + T, T, 2); }
          }
        }
      }
      function drawFruit(ctx, it) {
        const x = Math.round(it.x), y = Math.round(it.y);
        const blink = it.life < 120 && (it.t >> 2) & 1;
        if (blink) return;
        if (it.kind === 'fruit') {
          switch (it.f) {
            case 0: // banana
              ctx.fillStyle = '#ffe040'; for (let i = 0; i < 9; i++) ctx.fillRect(x - 5 + i, y - 5 - Math.round(Math.sin(i / 8 * Math.PI) * 4), 2, 3);
              ctx.fillStyle = '#806000'; ctx.fillRect(x - 6, y - 6, 2, 2); break;
            case 1: // cherries
              ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 6, y - 6, 5, 5); ctx.fillRect(x + 1, y - 5, 5, 5);
              ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y - 5, 1, 1); ctx.fillRect(x + 2, y - 4, 1, 1);
              ctx.fillStyle = '#20a020'; ctx.fillRect(x - 3, y - 11, 1, 5); ctx.fillRect(x + 3, y - 11, 1, 6); ctx.fillRect(x - 3, y - 12, 7, 1); break;
            case 2: // peach
              ctx.fillStyle = '#ffa080'; ctx.fillRect(x - 5, y - 10, 10, 9); ctx.fillRect(x - 4, y - 11, 8, 11);
              ctx.fillStyle = '#ff6060'; ctx.fillRect(x, y - 9, 4, 6); ctx.fillStyle = '#30b030'; ctx.fillRect(x - 3, y - 13, 4, 2); break;
            case 3: // watermelon slice
              ctx.fillStyle = '#20a020'; ctx.fillRect(x - 7, y - 3, 14, 3);
              ctx.fillStyle = '#ff3040'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 6 + i, y - 4 - i, 12 - i * 2, 1);
              ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 6, 1, 1); ctx.fillRect(x + 2, y - 6, 1, 1); ctx.fillRect(x, y - 8, 1, 1); break;
            case 4: // grapes
              ctx.fillStyle = '#9040e0';
              for (const [dx, dy] of [[-4, -11], [0, -11], [4, -11], [-2, -7], [2, -7], [0, -3]]) ctx.fillRect(x + dx - 2, y + dy, 4, 4);
              ctx.fillStyle = '#e0c0ff'; ctx.fillRect(x - 5, y - 11, 1, 1); ctx.fillRect(x - 1, y - 11, 1, 1); break;
            case 5: // pineapple
              ctx.fillStyle = '#e0a020'; ctx.fillRect(x - 4, y - 9, 8, 9);
              ctx.fillStyle = '#a06010'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 4, y - 8 + i * 3, 8, 1);
              ctx.fillStyle = '#30c030'; ctx.fillRect(x - 3, y - 13, 2, 4); ctx.fillRect(x, y - 14, 2, 5); ctx.fillRect(x + 2, y - 12, 2, 3); break;
            case 6: // cake slice
              ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x - 6, y - 7, 12, 7);
              ctx.fillStyle = '#ff80c0'; ctx.fillRect(x - 6, y - 9, 12, 3); ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 1, y - 12, 3, 3); break;
            default: // diamond ring-ish gem
              ctx.fillStyle = '#80f0ff'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 5 + i, y - 9 + i, 10 - i * 2, 1);
              ctx.fillRect(x - 5, y - 10, 10, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 9, 2, 1);
          }
          return;
        }
        // specials
        switch (it.sp) {
          case 'shoes':
            ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 6, y - 6, 12, 5); ctx.fillRect(x - 6, y - 10, 5, 4);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 2, 12, 2); break;
          case 'pink': case 'blue': case 'yellow': {
            const col = it.sp === 'pink' ? '#ff70d0' : it.sp === 'blue' ? '#4080ff' : '#ffe040';
            ctx.fillStyle = col; ctx.fillRect(x - 4, y - 9, 8, 7);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 8, y - 8, 4, 5); ctx.fillRect(x + 4, y - 8, 4, 5); ctx.fillRect(x - 2, y - 8, 2, 2); break;
          }
          case 'clock':
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 6, y - 12, 12, 12); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y - 11, 10, 10);
            ctx.fillStyle = '#000'; ctx.fillRect(x, y - 9, 1, 4); ctx.fillRect(x, y - 6, 3, 1); break;
          case 'cross':
            ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 1, y - 14, 3, 14); ctx.fillRect(x - 5, y - 10, 11, 3);
            ctx.fillStyle = '#4060ff'; ctx.fillRect(x, y - 9, 1, 1); break;
          case 'cake':
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 7, y - 8, 14, 8); ctx.fillStyle = '#ff60a0'; ctx.fillRect(x - 7, y - 10, 14, 3);
            ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 4, y - 13, 2, 3); ctx.fillRect(x + 2, y - 13, 2, 3); break;
          case 'umbrella':
            ctx.fillStyle = (it.t >> 3) & 1 ? '#ff40ff' : '#ff8040';
            for (let i = 0; i < 5; i++) ctx.fillRect(x - 7 + i, y - 14 + 4 - i, 14 - i * 2, 1);
            ctx.fillRect(x - 7, y - 10, 15, 2); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x, y - 9, 1, 8); ctx.fillRect(x - 2, y - 2, 3, 1); break;
          case 'ring':
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 4, y - 6, 8, 2); ctx.fillRect(x - 4, y - 2, 8, 2); ctx.fillRect(x - 5, y - 5, 2, 4); ctx.fillRect(x + 3, y - 5, 2, 4);
            ctx.fillStyle = '#ff2060'; ctx.fillRect(x - 2, y - 9, 4, 3); break;
          case 'diamond': {
            const s = 2;
            ctx.fillStyle = (it.t >> 2) & 1 ? '#ffffff' : '#80f0ff';
            for (let i = 0; i < 8; i++) ctx.fillRect(x - (8 - i) * s, y - 20 + i * s * 1.2, (8 - i) * 2 * s, s);
            ctx.fillRect(x - 16, y - 22, 32, 3); break;
          }
        }
      }
      function enemySprite(e) {
        const s = SPR[e.type]; const set = e.angry ? s.a : s.n;
        return set[e.dir < 0 ? 0 : 1];
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x - 8), y = Math.round(e.y - 16);
        if (e.state === 'die') {
          // spin (flip) while flying
          const im = enemySprite({ type: e.type, angry: (e.t >> 2) & 1, dir: (e.t >> 3) & 1 ? 1 : -1 });
          ctx.save(); ctx.translate(x + 8, y + 8); ctx.scale(1, (e.t >> 2) & 1 ? -1 : 1); ctx.drawImage(im, -8, -8); ctx.restore();
          return;
        }
        if (e.state === 'bub') return;            // drawn with its bubble
        const bob = e.type === 'zen' || e.type === 'mighta' || e.type === 'drunk' || e.type === 'hidegon' ? ((e.t >> 3) & 1) : 0;
        if (e.state === 'enter') { ctx.globalAlpha = 0.6 + 0.4 * ((frame >> 2) & 1); }
        ctx.drawImage(enemySprite(e), x, y - bob);
        ctx.globalAlpha = 1;
        if (g.freeze > 0 && (frame >> 3) & 1) { ctx.fillStyle = 'rgba(160,200,255,0.5)'; ctx.fillRect(x + 2, y + 2, 12, 12); }
      }
      function drawBubble(ctx, b) {
        const x = Math.round(b.x - 9), y = Math.round(b.y - 9);
        const wob = b.state === 'shot' ? 0 : Math.round(Math.sin(b.t * 0.15));
        if (b.state === 'shot' && b.t < 6) {
          const r = 2 + b.t; ctx.fillStyle = '#80ff90';
          ctx.fillRect(Math.round(b.x - r / 2), Math.round(b.y - r / 2), r, r); return;
        }
        if (b.enemy) {
          const e = b.enemy;
          const im = enemySprite({ type: e.type, angry: e.angry, dir: (b.t >> 4) & 1 ? 1 : -1 });
          ctx.drawImage(im, x + 1, y + 1 + wob);
          const esc = b.escape;
          const rimg = esc > 150 ? RING.green : esc > 60 ? RING.yellow : ((b.t >> 2) & 1 ? RING.red : RING.yellow);
          ctx.drawImage(rimg, x, y + wob);
          return;
        }
        if (b.kind === 'letter') {
          ctx.drawImage(RING.pink, x, y + wob);
          text(ctx, 'EXTEND'[b.letter], b.x - 2, b.y - 3 + wob, '#ffffff', 1);
          return;
        }
        if (b.kind === 'thunder') {
          ctx.drawImage(RING.thunder, x, y + wob);
          ctx.fillStyle = '#ffff40'; ctx.fillRect(Math.round(b.x), y + 4 + wob, 2, 4); ctx.fillRect(Math.round(b.x) - 2, y + 8 + wob, 4, 1); ctx.fillRect(Math.round(b.x) - 2, y + 9 + wob, 2, 4);
          return;
        }
        if (b.life < 90 && (b.t >> 2) & 1) return;
        ctx.drawImage(b.life < 200 ? RING.blue : RING.green, x, y + wob);
      }
      function drawPlayer(ctx) {
        const p = g.player;
        if (!p || p.hold) return;
        const x = Math.round(p.x - 8), y = Math.round(p.y - 16);
        if (p.dead) {
          // spinning death with stars
          const k = p.dead;
          const f = (k >> 3) & 3;
          const im = SPR.bub[0][f & 1];
          ctx.save(); ctx.translate(x + 8, y + 8); ctx.rotate(f * Math.PI / 2); ctx.drawImage(im, -8, -8); ctx.restore();
          if (k > 40) for (let i = 0; i < 5; i++) { const a = k * 0.1 + i * 1.256; ctx.fillStyle = i & 1 ? '#ffff40' : '#ffffff'; ctx.fillRect(Math.round(p.x + Math.cos(a) * 12), Math.round(p.y - 8 + Math.sin(a) * 6 - 10), 2, 2); }
          return;
        }
        if (p.inv > 0 && (p.inv >> 2) & 1 && g.phase === 'play') return;
        const frameIdx = p.blowT > 0 ? 2 : (!p.onGround ? 1 : ((p.anim >> 3) & 1));
        ctx.drawImage(SPR.bub[frameIdx][p.dir < 0 ? 0 : 1], x, y);
      }
      function drawShots(ctx) {
        for (const s of g.shots) {
          const x = Math.round(s.x), y = Math.round(s.y);
          if (s.kind === 'rock') { ctx.fillStyle = '#a07040'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#e0b080'; ctx.fillRect(x - 3, y - 3, 3, 2); ctx.fillStyle = '#604020'; ctx.fillRect(x + (s.t >> 2) % 3 - 1, y + 1, 2, 2); }
          else if (s.kind === 'bottle') { ctx.fillStyle = '#40c060'; ctx.fillRect(x - 2, y - 4, 4, 7); ctx.fillStyle = '#a0ffa0'; ctx.fillRect(x - 1, y - 6, 2, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 2, 1, 2); }
          else if (s.kind === 'fire') { ctx.fillStyle = (s.t >> 2) & 1 ? '#ffff40' : '#ff8020'; ctx.fillRect(x - 4, y - 3, 8, 6); ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 2 - Math.sign(s.vx) * 4, y - 1, 4, 3); }
          else { ctx.fillStyle = (s.t >> 1) & 1 ? '#ffffff' : '#40ff60'; ctx.fillRect(x - 1, y - 4, 2, 8); }
        }
      }
      function drawBolts(ctx) {
        for (const b of g.bolts) {
          ctx.fillStyle = (b.t >> 1) & 1 ? '#ffffff' : '#ffff40';
          let yy = b.y - 10;
          for (let i = 0; i < 6; i++) { const xo = (i & 1) ? 3 : -3; ctx.fillRect(Math.round(b.x + xo), Math.round(yy), 3, 4); yy += 3.5; }
          ctx.fillRect(Math.round(b.x) - 6, Math.round(b.y) - 1, 12, 2);
        }
      }
      function drawBoss(ctx) {
        const B = g.boss; if (!B || B.state === 'gone') return;
        const sc = 3, set = B.flash > 0 && (B.flash >> 1) & 1 ? BOSS_HIT : BOSS;
        const im = set[g.player.x < B.x ? 0 : 1];
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(im, Math.round(B.x - 8 * sc), Math.round(B.y - 16 * sc), 16 * sc, 16 * sc);
        ctx.restore();
        if (B.state === 'bub') ctx.drawImage(BIGRING, Math.round(B.x - 32), Math.round(B.y - 24 - 32));
        // HP bar
        if (B.state === 'fight') {
          ctx.fillStyle = '#400000'; ctx.fillRect(88, 18, 80, 4);
          ctx.fillStyle = '#ff4040'; ctx.fillRect(88, 18, Math.round(80 * B.hp / 24), 4);
        }
      }
      function drawBaron(ctx) {
        const b = g.baron; if (!b) return;
        ctx.drawImage(SPR.baron[g.player.x < b.x ? 0 : 1], Math.round(b.x - 8), Math.round(b.y - 8) + ((frame >> 3) & 1));
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 16);
        text(ctx, '1UP', 24, 0, '#40ff40');
        text(ctx, String(g ? g.score : 0).padStart(2, '0'), 80, 8, '#ffffff', 1, 'right');
        text(ctx, 'HIGH SCORE', 128, 0, '#ff4040', 1, 'center');
        text(ctx, String(hi), 128, 8, '#ffffff', 1, 'center');
        text(ctx, '2UP', 210, 0, '#40a0ff');
        text(ctx, 'CREDIT ' + Math.min(99, api.credits), 248, 8, '#a0a0a0', 1, 'right');
      }
      function drawSide(ctx) {
        // round number on the left wall, EXTEND letters below it, lives at the bottom
        const r = String(g.round).padStart(2, '0');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 16, 16, 9);
        text(ctx, r, 2, 17, '#ffffff');
        for (let i = 0; i < 6; i++) {
          const has = g.letters[i];
          ctx.fillStyle = has ? '#ff60e0' : 'rgba(0,0,0,0.6)'; ctx.fillRect(2, 40 + i * 12, 11, 10);
          text(ctx, 'EXTEND'[i], 5, 41 + i * 12, has ? '#ffffff' : '#606060');
        }
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) {
          const y = 208 - i * 10;
          ctx.fillStyle = '#000'; ctx.fillRect(1, y, 14, 9);
          ctx.fillStyle = '#40d040'; ctx.fillRect(3, y + 2, 9, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(8, y + 3, 3, 2); ctx.fillStyle = '#000'; ctx.fillRect(10, y + 3, 1, 2);
        }
      }
      function drawPlayfield(ctx) {
        if (g.phase === 'scroll' && g.prevMap) {
          const k = Math.min(1, g.t / 100), off = Math.round(k * 208);
          drawMap(ctx, g.prevMap, g.prevRound, -off);
          drawMap(ctx, map, g.round, 208 - off);
          // Bub rides a bubble to the start point
          const p = g.player, sx = g.scrollFrom.x + (START_X - g.scrollFrom.x) * k, sy = g.scrollFrom.y + (START_Y - g.scrollFrom.y) * k;
          ctx.drawImage(SPR.bub[0][1], Math.round(sx - 8), Math.round(sy - 16));
          ctx.drawImage(RING.green, Math.round(sx - 9), Math.round(sy - 17)); void p;
          return;
        }
        drawMap(ctx, map, g.round, 0);
        for (const it of g.items) drawFruit(ctx, it);
        drawBoss(ctx);
        for (const e of g.enemies) drawEnemy(ctx, e);
        drawPlayer(ctx);
        for (const b of g.bubbles) drawBubble(ctx, b);
        drawShots(ctx); drawBolts(ctx);
        drawBaron(ctx);
        for (const f of g.fx) {
          if (f.t < 0) continue;
          const r = 4 + f.t; ctx.fillStyle = f.col;
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), 2, 2); }
        }
        for (const pp of g.pops) text(ctx, pp.txt, pp.x, pp.y - pp.t * 0.4, pp.txt.length > 4 ? '#ffff40' : '#ffffff', 1, 'center', '#000');
        if (g.storm > 0 && (g.storm >> 1) & 1) { ctx.fillStyle = 'rgba(255,255,160,0.35)'; ctx.fillRect(16, 16, W - 32, H - 16); }
      }
      function bubbleTitle(ctx, s, cx, y, cols) {
        const w = s.length * 20;
        for (let i = 0; i < s.length; i++) {
          if (s[i] === ' ') continue;
          const bx = cx - w / 2 + i * 20 + 10, by = y + Math.round(Math.sin(titleT * 0.08 + i * 0.7) * 3);
          ctx.fillStyle = cols[i % cols.length];
          ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(bx - 6, by - 7, 3, 2);
          text(ctx, s[i], bx - 4, by - 6, '#000', 2);
          text(ctx, s[i], bx - 5, by - 7, '#ffffff', 2);
        }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000020'; ctx.fillRect(0, 0, W, H);
        // floating background bubbles
        for (let i = 0; i < 14; i++) {
          const bx = (i * 71 + Math.sin(titleT * 0.02 + i) * 10) % W, by = H - ((titleT * (0.3 + (i % 3) * 0.2) + i * 40) % (H + 20));
          ctx.drawImage(i % 3 ? RING.green : RING.blue, Math.round(bx), Math.round(by));
        }
        drawHUD(ctx);
        const page = Math.floor(titleT / 480) % 2;
        bubbleTitle(ctx, 'BUBBLE', W / 2, 40, ['#40c040', '#40a0ff', '#ff60c0', '#ffc040']);
        bubbleTitle(ctx, 'BOBBLE', W / 2, 66, ['#ffc040', '#ff60c0', '#40a0ff', '#40c040']);
        if (page === 0) {
          ctx.drawImage(SPR.bub[(titleT >> 4) & 1][1], 60, 92); ctx.drawImage(SPR.bob[(titleT >> 4) & 1][0], 180, 92);
          ctx.drawImage(RING.green, 76 + ((titleT >> 1) % 30), 94);
          ctx.drawImage(RING.blue, 162 - ((titleT >> 1) % 30), 94);
          const lines = ['THE FANTASTIC STORY BEGINS!', 'JOURNEY TO THE CAVE OF', 'MONSTERS AND RESCUE YOUR', 'FRIENDS. GOOD LUCK!'];
          lines.forEach((l, i) => text(ctx, l, W / 2, 120 + i * 11, '#ffffff', 1, 'center'));
          text(ctx, 'SPELL EXTEND FOR AN EXTRA LIFE', W / 2, 168, '#ff60e0', 1, 'center');
        } else {
          text(ctx, '- HOW TO PLAY -', W / 2, 92, '#ffff40', 1, 'center');
          ctx.drawImage(SPR.zen.n[1], 40, 104); ctx.drawImage(RING.green, 39, 103);
          text(ctx, 'BLOW BUBBLES TO TRAP', 64, 106, '#ffffff'); text(ctx, 'MONSTERS, THEN POP THEM', 64, 115, '#ffffff');
          drawFruit(ctx, { kind: 'fruit', f: 3, x: 48, y: 144, t: 0, life: 999 });
          text(ctx, 'POP SEVERAL AT ONCE FOR', 64, 130, '#ffffff'); text(ctx, '1000 2000 4000 8000...', 64, 139, '#40ff40');
          ctx.drawImage(SPR.baron[1], 40, 152);
          text(ctx, "DON'T TAKE TOO LONG!", 64, 156, '#ff6060');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 186, '#ff4040', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 186, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 186, '#ffff40', 1, 'center');
        text(ctx, 'BONUS AT 30000 AND 100000 PTS', W / 2, 198, '#40a0ff', 1, 'center');
        text(ctx, '\u00a9 1986 TAITO CORP', W / 2, 212, '#ffffff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawPlayfield(ctx);
        drawHUD(ctx);
        drawSide(ctx);
        const cx = W / 2;
        if (g.phase === 'start') {
          text(ctx, g.round === LAST ? 'FINAL ROUND' : 'ROUND ' + g.round, cx, 96, '#ffffff', 1, 'center', '#000');
          if ((frame >> 3) & 1) text(ctx, 'READY !', cx, 110, '#ffff40', 1, 'center', '#000');
        }
        if (g.phase === 'play' && g.hurryMsg > 0 && (frame >> 3) & 1) text(ctx, 'HURRY UP !!', cx, 100, '#ff4040', 2, 'center', '#000');
        if (g.extendMsg > 0) text(ctx, 'EXTEND !!', cx, 80, (frame >> 2) & 1 ? '#ff60e0' : '#ffffff', 2, 'center', '#000');
        if (g.phase === 'clear' && g.skip) text(ctx, 'WARP ' + g.skip + ' ROUNDS', cx, 100, '#ff60e0', 1, 'center', '#000');
        if (g.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(48, 88, 160, 44);
          text(ctx, 'GAME OVER', cx, 96, '#ff4040', 2, 'center');
          text(ctx, 'SCORE ' + g.score, cx, 118, '#ffffff', 1, 'center');
        }
        if (g.phase === 'ending') {
          ctx.fillStyle = 'rgba(0,0,30,0.85)'; ctx.fillRect(16, 16, W - 32, H - 16);
          bubbleTitle(ctx, 'HAPPY END', cx, 48, ['#ff60e0', '#ffc040', '#40c040', '#40a0ff']);
          const lines = ['THE MONSTER BOSS IS BEATEN', 'AND THE CAVE IS QUIET AGAIN.', '', 'BUB AND BOB FOUND THEIR', 'FRIENDS AND TURNED BACK', 'INTO BOYS AT LAST!', '', 'CONGRATULATIONS!', 'FINAL SCORE ' + g.score];
          const shown = Math.floor((900 - g.t) / 3); let cc = 0;
          lines.forEach((l, i) => { const n = Math.max(0, Math.min(l.length, shown - cc)); cc += l.length; text(ctx, l.slice(0, n), cx, 84 + i * 12, i === 7 ? '#ffff40' : '#ffffff', 1, 'center'); });
          ctx.drawImage(SPR.bub[(frame >> 4) & 1][1], 96, 196); ctx.drawImage(SPR.bob[(frame >> 4) & 1][0], 144, 196);
        }
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode, start: () => { newGame(); mode = 'game'; }, killAll: () => { for (const e of g.enemies) if (e.state !== 'die') { if (e.bubble) e.bubble.dead = true; killEnemy(e, 1, 1); } }, collect: it => collect(it), burst: b => startChain(b) });
      return { update, render, destroy() { musicOn = false; } };
    }
  });
})();
