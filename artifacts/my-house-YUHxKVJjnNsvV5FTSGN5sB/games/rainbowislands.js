// Rainbow Islands (Taito, 1987) \u2014 from-scratch recreation: climb with rainbows, beat the rising water, collect the 7 diamonds.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 10, 31, 10], '$': [4, 15, 20, 14, 5, 30, 4]
  };
  // text(ctx, str, x, y, colour, scale, align: 'left'|'center'|'right')
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  // text with a 1px dark drop shadow
  function stext(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function flipH(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');

  // ======================= RAINBOW ISLANDS =======================
  const W = 320, H = 224, TS = 16, COLS = 20;
  const RBA = 24, RBB = 22;          // rainbow half-width and height
  const RB_COLS = ['#ff2020', '#ff9020', '#ffe020', '#30e030', '#20d0ff', '#3050ff', '#b040ff'];
  const ISLANDS = [
    { name: 'INSECT ISLAND', sky: ['#70b8ff', '#c0e8ff'], top: '#40d040', body: '#906030', dark: '#5a3818', foe: ['#40c040', '#ffe020', '#202020'], bossName: 'GIANT SPIDER' },
    { name: 'COMBAT ISLAND', sky: ['#88a0c0', '#d0d8e8'], top: '#a0a060', body: '#606848', dark: '#383c28', foe: ['#708050', '#e0e0e0', '#ff4040'], bossName: 'ARMORED CHOPPER' },
    { name: 'MONSTER ISLAND', sky: ['#402060', '#a060c0'], top: '#c060ff', body: '#603070', dark: '#381840', foe: ['#e0e0ff', '#ff40a0', '#40ff80'], bossName: 'COUNT DRACULA' },
    { name: 'TOY ISLAND', sky: ['#ffa0d0', '#fff0a0'], top: '#ff60a0', body: '#ffd040', dark: '#c08020', foe: ['#ff4040', '#4080ff', '#ffffff'], bossName: 'PUPPET CLOWN' },
    { name: 'DOH ISLAND', sky: ['#103080', '#4080e0'], top: '#e0e0ff', body: '#8090c0', dark: '#405080', foe: ['#c0c0c0', '#40ffff', '#ff8020'], bossName: 'DOH' },
    { name: 'ROBOT ISLAND', sky: ['#304040', '#80a0a0'], top: '#c0c8d0', body: '#707880', dark: '#404850', foe: ['#c0c0d0', '#ff3030', '#30ff30'], bossName: 'BIG ROBOT' },
    { name: 'DRAGON ISLAND', sky: ['#601010', '#f08040'], top: '#ff8020', body: '#a03010', dark: '#601808', foe: ['#30d030', '#ffe020', '#ff2020'], bossName: 'DRAGON' }
  ];

  // ---------- sprites ----------
  const BUB = [[
    '....kkkkkk......',
    '...kGGGGGGk.....',
    '..kGgggggGGk....',
    '..kgwwkgwwGk....',
    '..kgwkkgwkgk....',
    '..ksssssssgk....',
    '...kssrrssk.....',
    '....kkkkkk......',
    '...kbbbbbbk.....',
    '..ksbbbbbbsk....',
    '..ksbbbbbbsk....',
    '...kbbbbbbk.....',
    '...kbbkkbbk.....',
    '...kbk..kbk.....',
    '..krrk..krrk....',
    '..kkkk..kkkk....'
  ], [
    '....kkkkkk......',
    '...kGGGGGGk.....',
    '..kGgggggGGk....',
    '..kgwwkgwwGk....',
    '..kgwkkgwkgk....',
    '..ksssssssgk....',
    '...kssrrssk.....',
    '....kkkkkk......',
    '...kbbbbbbk.....',
    '..ksbbbbbbsk....',
    '...sbbbbbbs.....',
    '...kbbbbbbk.....',
    '....kbbbbk......',
    '....kbkbbk......',
    '...krrkrrk......',
    '...kkkkkkk......'
  ], [
    '....kkkkkk......',
    '...kGGGGGGk.....',
    '..kGgggggGGk....',
    '..kgwwkgwwGk....',
    'sskgwkkgwkgk....',
    '.sksssssssgk.ss.',
    '..kkssrrsskks...',
    '....kkkkkk......',
    '...kbbbbbbk.....',
    '...kbbbbbbk.....',
    '...kbbbbbbk.....',
    '...kbbbbbbk.....',
    '..kbbk..kbbk....',
    '.kbk......kbk...',
    'krrk......krrk..',
    'kkk........kkk..'
  ]];
  const BUBPAL = { k: '#000', G: '#20a020', g: '#40e040', w: '#fff', s: '#ffc898', r: '#e02020', b: '#3060ff' };
  // generic enemy shapes; colours come from the island palette (a/b/c)
  const FOES = {
    crawler: [[
      '................',
      '......aaaa......',
      '....aaaaaaaa....',
      '...aawwaaaaaa...',
      '..aawkwaabbaaa..',
      '..aaaaaabbaaaaa.',
      '.aaabbaaaaaabba.',
      '.aaaaaaaaaaaaaa.',
      '.ccaaccaaccaacc.',
      '..c..c..c..c..c.'
    ], [
      '................',
      '......aaaa......',
      '....aaaaaaaa....',
      '...aawwaaaaaa...',
      '..aawkwaabbaaa..',
      '..aaaaaabbaaaaa.',
      '.aaabbaaaaaabba.',
      '.aaaaaaaaaaaaaa.',
      '..ccaaccaaccaac.',
      '.c..c..c..c..c..'
    ]],
    flyer: [[
      '..ww......ww....',
      '.wwww....wwww...',
      '.wwwww..wwwww...',
      '..wwwwaawwww....',
      '....abbbba......',
      '...abkbbkba.....',
      '...abbbbbba.....',
      '....bbccbb......',
      '....bccccb......',
      '.....bccb.......',
      '......cc........'
    ], [
      '................',
      '................',
      '.wwwwwaawwwww...',
      'wwwwwwaawwwwww..',
      '....abbbba......',
      '...abkbbkba.....',
      '...abbbbbba.....',
      '....bbccbb......',
      '....bccccb......',
      '.....bccb.......',
      '......cc........'
    ]],
    dropper: [[
      '.....cccc.......',
      '..c.cccccc.c....',
      '.c.cwwccwwc.c...',
      'c..ckwcckwc..c..',
      '.cccccccccccc...',
      'c..cbbccbbc..c..',
      '.c..cccccc..c...',
      '..c..c..c..c....'
    ]],
    hopper: [[
      '................',
      '....aaaaaa......',
      '...aaaaaaaa.....',
      '..aawwaawwaa....',
      '..aawkaawkaa....',
      '..aaaaaaaaaa....',
      '..aabbbbbbaa....',
      '...aaaaaaaa.....',
      '....aa..aa......',
      '...ccc..ccc.....'
    ]]
  };
  const BOSS = [
    '..........cccccccccccc..........',
    '.......cccaaaaaaaaaaaaccc.......',
    '.....ccaaaaaaaaaaaaaaaaaacc.....',
    '....caaaaaaaaaaaaaaaaaaaaaac....',
    '...caaaawwwwwaaaaaawwwwwaaaac...',
    '..caaaawwwwwwwaaaawwwwwwwaaaac..',
    '..caaaawwkkkwwaaaawwkkkwwaaaac..',
    '.caaaaawwkkkwwaaaawwkkkwwaaaaac.',
    '.caaaaaawwwwwaaaaaawwwwwaaaaaac.',
    'caaaaaaaaaaaaaaaaaaaaaaaaaaaaaac',
    'caaaaaabbbbbbbbbbbbbbbbbbaaaaaac',
    'caaaaabbwbwbwbwbwbwbwbwbbbaaaaac',
    'caaaaabbbbbbbbbbbbbbbbbbbbaaaaac',
    '.caaaaabbwbwbwbwbwbwbwbbbaaaaac.',
    '.caaaaaabbbbbbbbbbbbbbbbaaaaaac.',
    '..caaaaaaaaaaaaaaaaaaaaaaaaaac..',
    '...ccaaaaaaaaaaaaaaaaaaaaaacc...',
    'c....cccaaaaaaaaaaaaaaaaccc....c',
    '.c......cccccccccccccccc......c.',
    '..c....c..c..c....c..c..c....c..',
    '...c..c...c..c....c..c...c..c...',
    '....cc....c..c....c..c....cc....',
    '.........c...c....c...c.........',
    '........c...c......c...c........'
  ];
  const FRUIT = [
    { pts: 100, rows: ['....g...', '...g....', '.rrrrr..', 'rrwrrrr.', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...'], pal: { r: '#ff2020', g: '#20a020', w: '#fff' } },
    { pts: 200, rows: ['...gg...', '..ooo...', '.oooooo.', 'oowooooo', 'oooooooo', 'oooooooo', '.oooooo.', '..oooo..'], pal: { o: '#ff9020', g: '#20a020', w: '#fff' } },
    { pts: 300, rows: ['...g....', '..gyg...', '.yyyyy..', 'yywyyyy.', 'yyyyyyy.', '.yyyyy..', '..yyy...', '...y....'], pal: { y: '#ffe020', g: '#20a020', w: '#fff' } },
    { pts: 500, rows: ['..g..g..', '...gg...', '..pp.pp.', '.pwpppp.', '.pppppp.', '..pppp..', '...pp...', '........'], pal: { p: '#b040ff', g: '#20a020', w: '#fff' } },
    { pts: 1000, rows: ['..gggg..', '.gmmmmg.', 'gmwmmmmg', 'gmmmmmmg', 'gmmmmmmg', '.gmmmmg.', '..gggg..', '........'], pal: { m: '#ff60c0', g: '#ffe020', w: '#fff' } }
  ];
  const GEM_ROWS = ['..ccc...', '.cwccc..', 'cwcccccc', '.cccccc.', '..cccc..', '...cc...'];
  const POWER = {
    shoe: { rows: ['........', '.rrr....', '.rrr....', '.rrrr...', '.rrrrrr.', 'rrrrrrrr', 'wwwwwwww'], pal: { r: '#ff2020', w: '#fff' } },
    rpot: { rows: ['...ww...', '...kk...', '..wrrw..', '.wrrrrw.', '.rrwrrr.', '.rrrrrr.', '..rrrr..'], pal: { r: '#ff2020', w: '#fff', k: '#804020' } },
    ypot: { rows: ['...ww...', '...kk...', '..wyyw..', '.wyyyyw.', '.yywyyy.', '.yyyyyy.', '..yyyy..'], pal: { y: '#ffe020', w: '#fff', k: '#804020' } }
  };
  const BUBR = BUB.map(f => spr(f, BUBPAL)), BUBL = BUBR.map(flipH);
  const FRUITS = FRUIT.map(f => spr(f.rows, f.pal));
  const GEMS = RB_COLS.map(c => spr(GEM_ROWS, { c, w: '#fff' }));
  const POW = {}; for (const k in POWER) POW[k] = spr(POWER[k].rows, POWER[k].pal);
  const foeCache = {};
  function foeSprites(island) {
    if (foeCache[island]) return foeCache[island];
    const f = ISLANDS[island].foe, pal = { a: f[0], b: f[1], c: f[2], w: '#fff', k: '#000' };
    const o = {};
    for (const k in FOES) { o[k] = FOES[k].map(r => spr(r, pal)); o[k + 'L'] = o[k].map(flipH); }
    o.boss = spr(BOSS, { a: f[0], b: f[1], c: f[2], w: '#fff', k: '#000' });
    o.bossHit = spr(BOSS, { a: '#fff', b: '#fff', c: '#fff', w: '#fff', k: '#fff' });
    return (foeCache[island] = o);
  }

  ArcadeRegistry.register({
    id: 'rainbowislands', title: 'Rainbow Islands', year: 1987, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: rainbow \u00b7 X / Up: jump \u00b7 Enter: start',
    marquee: { bg: '#3060ff', fg: '#ffe020', accent: '#ff2020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(100000);
      let mode = 'title', modeT = 0, frame = 0, coinFlash = 0;
      let G = null;
      const snd = {
        rainbow() { au.tone(500, 0.18, { type: 'triangle', vol: 0.14, slideTo: 1400 }); au.tone(750, 0.18, { type: 'square', vol: 0.04, slideTo: 2000 }); },
        jump() { au.tone(330, 0.12, { type: 'square', vol: 0.08, slideTo: 660 }); },
        kill() { au.tone(880, 0.1, { type: 'square', vol: 0.12, slideTo: 220 }); au.noise(0.08, { vol: 0.08, freq: 4000 }); },
        crash() { au.noise(0.25, { vol: 0.15, freq: 2500, slideTo: 300 }); au.tone(600, 0.3, { type: 'triangle', vol: 0.1, slideTo: 150 }); },
        fruit() { au.tone(1047, 0.06, { type: 'square', vol: 0.1 }); au.tone(1568, 0.08, { type: 'square', vol: 0.1, delay: 0.06 }); },
        gem() { au.melody([[1319, .05], [1568, .05], [2093, .1]], { type: 'triangle', vol: 0.16 }); },
        power() { au.melody([[523, .06], [659, .06], [784, .06], [1047, .06], [1319, .12]], { type: 'square', vol: 0.12 }); },
        die() { au.melody([[784, .1], [740, .1], [698, .1], [659, .1], [622, .1], [587, .3]], { type: 'square', vol: 0.14 }); },
        hurry() { au.melody([[988, .08], [0, .04], [988, .08], [0, .04], [988, .08], [1319, .2]], { type: 'square', vol: 0.14 }); },
        goal() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .4]], { type: 'square', vol: 0.14 }); },
        start() { au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .36]], { type: 'triangle', vol: 0.18 }); },
        bossHit() { au.tone(150, 0.12, { type: 'sawtooth', vol: 0.15, slideTo: 80 }); },
        extra() { au.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: 0.14 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.14 });
        return false;
      }

      // ---------- level generation ----------
      function genLevel(k) {
        const rows = 10 + 3 * k;
        const t = []; for (let r = 0; r < rows; r++) t.push(new Uint8Array(COLS));
        t[rows - 1].fill(2); t[rows - 2].fill(2);
        let prev = [[0, COLS - 1]];
        const plats = [];
        for (let r = rows - 5; r >= 8; r -= 3) {
          const segs = [];
          const ps = pick(prev), len = irand(4, 8);
          let s0 = clamp(irand(ps[0] - len + 2, ps[1] - 1), 0, COLS - len);
          segs.push([s0, s0 + len - 1]);
          const extra = irand(0, 2);
          for (let n = 0; n < extra * 3 && segs.length < 1 + extra; n++) {
            const l2 = irand(3, 7), a = irand(0, COLS - l2);
            if (segs.every(s => a + l2 + 1 < s[0] || a > s[1] + 1)) segs.push([a, a + l2 - 1]);
          }
          for (const s of segs) { for (let c = s[0]; c <= s[1]; c++) t[r][c] = 1; plats.push({ r, a: s[0], b: s[1] }); }
          prev = segs;
        }
        t[5].fill(1);
        return { t, rows, plats, goalY: 5 * TS };
      }
      function genBoss() {
        const rows = 14, t = []; for (let r = 0; r < rows; r++) t.push(new Uint8Array(COLS));
        t[12].fill(2); t[13].fill(2);
        for (let c = 1; c <= 6; c++) t[9][c] = 1;
        for (let c = 13; c <= 18; c++) t[9][c] = 1;
        for (let c = 7; c <= 12; c++) t[6][c] = 1;
        for (let c = 0; c <= 3; c++) t[4][c] = 1;
        for (let c = 16; c <= 19; c++) t[4][c] = 1;
        return { t, rows, plats: [], goalY: -999 };
      }
      function solidAt(px, py) {
        const c = Math.floor(px / TS), r = Math.floor(py / TS);
        if (c < 0 || c >= COLS || r < 0 || r >= G.lv.rows) return 0;
        return G.lv.t[r][c];
      }

      // ---------- game state ----------
      function newGame() {
        G = { score: 0, lives: 2, island: 0, round: 0, loop: 0, gems: new Set(), extraAt: 100000, speed: 0, rapid: 0, dbl: 0 };
        startRound();
      }
      function startRound() {
        const boss = G.round === 3;
        const k = boss ? 0 : 14 + G.round * 3 + G.island * 2 + G.loop * 4;
        G.lv = boss ? genBoss() : genLevel(Math.min(k, 30));
        G.levelH = G.lv.rows * TS;
        G.boss = null; G.chest = null;
        G.rbs = []; G.foes = []; G.items = []; G.shots = []; G.pops = [];
        G.P = { x: W / 2, y: G.levelH - 2 * TS, vx: 0, vy: 0, dir: 1, onGround: true, jumping: false, stand: null, anim: 0, dead: false, deadT: 0, inv: 90, fireCool: 0 };
        G.camY = Math.max(0, G.levelH - H);
        G.timer = 0; G.limit = 60 * (boss ? 70 : 30 + G.lv.rows);
        G.waterY = G.levelH + 40; G.hurry = false;
        G.phase = 'intro'; G.phaseT = 150;
        G.msg = ''; G.msgT = 0;
        const fs = foeSprites(G.island);
        if (boss) {
          G.boss = { x: W - 70, y: 12 * TS, vx: -1.2, vy: 0, hp: 12 + G.island * 3 + G.loop * 6, max: 0, flash: 0, t: 0, dead: false, deadT: 0 };
          G.boss.max = G.boss.hp;
        } else {
          const n = Math.min(22, 6 + G.round * 2 + G.island + G.loop * 3);
          const plats = G.lv.plats.filter(p => p.r < G.lv.rows - 7);
          for (let i = 0; i < n && plats.length; i++) {
            const p = pick(plats), rr = Math.random();
            const fy = p.r * TS;
            if (rr < 0.45) G.foes.push(mkFoe('crawler', (p.a + p.b + 1) * TS / 2, fy, p));
            else if (rr < 0.7) G.foes.push(mkFoe('flyer', rand(20, W - 20), fy - rand(20, 36), null));
            else if (rr < 0.85 && G.island + G.round > 0) G.foes.push(mkFoe('dropper', rand(30, W - 30), fy + 20, null));
            else G.foes.push(mkFoe(G.island > 0 ? 'hopper' : 'crawler', (p.a + p.b + 1) * TS / 2, fy, p));
          }
          // a few power-ups resting on platforms
          if (Math.random() < 0.6 && plats.length) { const p = pick(plats); G.items.push(mkItem(pick(['shoe', 'rpot', 'ypot']), (p.a + 1) * TS, p.r * TS - 10)); }
        }
        void fs;
      }
      function mkFoe(type, x, y, plat) {
        const sp = (0.45 + G.island * 0.05 + G.loop * 0.15) * (type === 'flyer' ? 1.3 : 1);
        return { type, x, y, y0: y, vx: (Math.random() < 0.5 ? -1 : 1) * sp, vy: 0, sp, t: Math.random() * 100, dead: false, onGround: true, plat };
      }
      function mkItem(kind, x, y, extra) {
        return Object.assign({ kind, x, y, vy: -2, t: 0, land: false }, extra || {});
      }
      function addScore(n, x, y) {
        G.score += n;
        if (x != null) G.pops.push({ x, y, s: String(n), t: 50 });
        if (G.score >= G.extraAt) { G.extraAt += G.extraAt < 300000 ? 200000 : 300000; G.lives++; snd.extra(); G.msg = 'EXTRA LIFE'; G.msgT = 120; }
        if (G.score > hi) hi = G.score;
      }

      // ---------- rainbows ----------
      function rbSurface(rb, x) {
        const dx = x - rb.cx; if (Math.abs(dx) > RBA) return null;
        return rb.by - RBB * Math.sqrt(Math.max(0, 1 - (dx / RBA) * (dx / RBA)));
      }
      function fireRainbow() {
        const P = G.P;
        const count = G.rbs.filter(r => r.state !== 'fall').length;
        if (count >= 8) { const old = G.rbs.find(r => r.state !== 'fall'); if (old) old.life = Math.min(old.life, 1); }
        const mk = (dy) => G.rbs.push({ cx: P.x + P.dir * (RBA + 3), by: P.y - dy, dir: P.dir, t: 0, life: 300, state: 'grow', vy: 0, hitBoss: false });
        mk(0); if (G.dbl) mk(RBB - 2);
        snd.rainbow();
      }
      function breakRainbow(rb) {
        if (rb.state === 'fall') return;
        rb.state = 'fall'; rb.vy = 0.5; rb.combo = 0; rb.hitBoss = false;
        snd.crash();
        for (const o of G.rbs) if (o !== rb && o.state !== 'fall' && Math.abs(o.cx - rb.cx) < RBA * 1.6 && Math.abs(o.by - rb.by) < RBB + 4) breakRainbow(o);
      }
      function updateRainbows() {
        for (const rb of G.rbs) {
          if (rb.state === 'grow') { rb.t += G.rapid ? 0.16 : 0.1; if (rb.t >= 1) { rb.t = 1; rb.state = 'solid'; } }
          else if (rb.state === 'solid') { rb.life--; }
          else if (rb.state === 'fall') { rb.vy = Math.min(6, rb.vy + 0.3); rb.by += rb.vy; }
          // enemy collisions
          if (rb.state === 'grow' || rb.state === 'fall') {
            for (const f of G.foes) {
              if (f.dead) continue;
              const fy = f.y - 6;
              let hit = false;
              if (rb.state === 'fall') hit = Math.abs(f.x - rb.cx) < RBA + 4 && fy > rb.by - RBB - 6 && fy < rb.by + 6;
              else {
                const dx = (f.x - rb.cx) / RBA, dy = (fy - rb.by) / RBB, d = Math.sqrt(dx * dx + dy * dy);
                const u = (dx * rb.dir + 1) / 2;   // 0 at the player end
                hit = dy <= 0.25 && d > 0.45 && d < 1.3 && u <= rb.t + 0.1;
              }
              if (hit) killFoe(f, rb.state === 'fall' ? 'gem' : 'fruit', rb);
            }
            const B = G.boss;
            if (B && !B.dead && !rb.hitBoss) {
              const inX = Math.abs(B.x - rb.cx) < RBA + 18, inY = B.y - 30 < rb.by + 4 && B.y > rb.by - RBB - 8;
              if (inX && inY) {
                rb.hitBoss = true; B.hp -= rb.state === 'fall' ? 3 : 1; B.flash = 10; snd.bossHit(); addScore(100);
                if (B.hp <= 0) { B.dead = true; B.deadT = 0; addScore(30000 * (G.island + 1), B.x, B.y - 40); snd.goal(); G.foes.forEach(f => f.dead = true); }
              }
            }
          }
        }
        G.rbs = G.rbs.filter(rb => (rb.state !== 'fall' || rb.by < G.camY + H + 60) && rb.life > 0);
      }
      function killFoe(f, drop, rb) {
        f.dead = true; f.vy = -3; f.vx = (Math.random() < 0.5 ? -1 : 1) * 1.5; f.spin = 0;
        snd.kill();
        if (rb) rb.combo = (rb.combo || 0) + 1;
        const mult = rb && rb.combo > 1 ? Math.pow(2, Math.min(4, rb.combo - 1)) : 1;
        addScore(100 * mult, f.x, f.y - 16);
        const rr = Math.random();
        if (rr < 0.06) G.items.push(mkItem(pick(['shoe', 'rpot', 'ypot']), f.x, f.y - 8));
        else if (drop === 'gem') G.items.push(mkItem('gem', f.x, f.y - 8, { c: clamp(Math.floor(f.x / (W / 7)), 0, 6) }));
        else G.items.push(mkItem('fruit', f.x, f.y - 8, { f: Math.min(4, Math.floor(Math.random() * (2 + G.island))) }));
      }

      // ---------- player ----------
      function landCheck(o, oldY, w) {
        // one-way platforms: land when the feet cross a tile top while falling
        if (o.vy < 0) return false;
        const r0 = Math.floor(oldY / TS), r1 = Math.floor(o.y / TS);
        for (let r = r0; r <= r1; r++) {
          const top = r * TS;
          if (oldY <= top + 0.01 && o.y >= top) {
            if (solidAt(o.x - w, top + 1) || solidAt(o.x + w, top + 1)) { o.y = top; o.vy = 0; return true; }
          }
        }
        return false;
      }
      function updatePlayer() {
        const P = G.P;
        if (P.inv > 0) P.inv--;
        if (P.fireCool > 0) P.fireCool--;
        const sp = G.speed ? 2.2 : 1.5;
        let mv = 0;
        if (api.key('ArrowLeft')) { mv = -1; P.dir = -1; }
        if (api.key('ArrowRight')) { mv = 1; P.dir = 1; }
        P.x = clamp(P.x + mv * sp, 8, W - 8);
        if (mv) P.anim++;
        if (api.pressed('Space') && P.fireCool <= 0) { fireRainbow(); P.fireCool = G.rapid ? 10 : 18; }
        const jumpKey = api.pressed('KeyX') || api.pressed('ArrowUp');
        if (jumpKey && (P.onGround || P.stand)) { P.vy = -5.1; P.onGround = false; P.stand = null; P.jumping = true; snd.jump(); }
        // walking on a rainbow
        if (P.stand) {
          const rb = P.stand, s = rb.state === 'fall' || rb.life <= 0 ? null : rbSurface(rb, P.x);
          if (s == null) { P.stand = null; P.onGround = false; P.vy = 0; P.jumping = false; }
          else P.y = s;
        } else if (P.onGround) {
          if (!(solidAt(P.x - 5, P.y + 1) || solidAt(P.x + 5, P.y + 1))) { P.onGround = false; P.vy = 0; P.jumping = false; }
          else {
            // step onto a rainbow whose foot we walk into
            for (const rb of G.rbs) {
              if (rb.state === 'fall' || rb.state === 'grow') continue;
              const s = rbSurface(rb, P.x);
              if (s != null && Math.abs(rb.by - P.y) < 8 && Math.abs(Math.abs(P.x - rb.cx) - RBA) < 10 && s <= P.y + 2 && s >= P.y - 16) { P.stand = rb; P.onGround = false; P.y = s; break; }
            }
          }
        }
        if (!P.onGround && !P.stand) {
          const oy = P.y;
          P.vy = Math.min(5, P.vy + 0.25);
          P.y += P.vy;
          if (landCheck(P, oy, 5)) { P.onGround = true; P.jumping = false; }
          else if (P.vy > 0) {
            for (const rb of G.rbs) {
              if (rb.state === 'fall') continue;
              const s = rbSurface(rb, P.x);
              if (s == null || rb.t < 1) continue;
              if (oy <= s + 3 && P.y >= s) {
                if (P.jumping) { breakRainbow(rb); }
                else { P.stand = rb; P.y = s; P.vy = 0; }
                break;
              }
            }
          }
        }
        if (P.y > G.levelH - 2 * TS) { P.y = G.levelH - 2 * TS; P.vy = 0; P.onGround = true; P.jumping = false; }
        // items
        for (const it of G.items) {
          if (it.got) continue;
          if (Math.abs(it.x - P.x) < 11 && Math.abs(it.y - (P.y - 8)) < 14 && it.t > 10) {
            it.got = true;
            if (it.kind === 'fruit') { addScore(FRUIT[it.f].pts, it.x, it.y - 10); snd.fruit(); }
            else if (it.kind === 'gem') { addScore(1000 * (it.c + 1), it.x, it.y - 10); G.gems.add(it.c); snd.gem(); }
            else { if (it.kind === 'shoe') G.speed = 1; else if (it.kind === 'rpot') G.rapid = 1; else G.dbl = 1; addScore(500, it.x, it.y - 10); snd.power(); G.msg = it.kind === 'shoe' ? 'SPEED UP' : it.kind === 'rpot' ? 'FAST RAINBOW' : 'DOUBLE RAINBOW'; G.msgT = 90; }
          }
        }
        G.items = G.items.filter(it => !it.got && it.t < 900);
        // chest after a boss
        if (G.chest && Math.abs(G.chest.x - P.x) < 18 && Math.abs(G.chest.y - P.y) < 20) islandClear();
        // goal
        if (!G.boss && (P.onGround || P.stand) && P.y <= G.lv.goalY + 1) goalIn();
        // water
        if (P.y - 6 > G.waterY) killPlayer();
      }
      function killPlayer() {
        const P = G.P;
        if (P.dead || P.inv > 0 || G.phase !== 'play') return;
        P.dead = true; P.deadT = 0; P.vy = -4;
        G.phase = 'dying'; snd.die();
      }
      function goalIn() {
        G.phase = 'goal'; G.phaseT = 210;
        G.bonus = Math.max(0, Math.floor((G.limit - G.timer) / 60)) * 100 + 1000 * (G.round + 1);
        addScore(G.bonus);
        snd.goal();
      }
      function islandClear() {
        G.chest = null;
        G.phase = 'island'; G.phaseT = 300;
        G.bonus = 50000 * (G.island + 1);
        if (G.gems.size >= 7) { G.bonus += 100000; G.lives++; G.perfect = true; } else G.perfect = false;
        addScore(G.bonus);
        snd.extra();
      }
      function nextRound() {
        G.round++;
        if (G.round > 3) { G.round = 0; G.island++; G.gems = new Set(); if (G.island >= ISLANDS.length) { G.island = 0; G.loop++; } }
        startRound();
      }
      function respawn() {
        const P = G.P, lv = G.lv;
        let row = clamp(Math.floor((G.camY + H * 0.55) / TS), 1, lv.rows - 2);
        let found = null;
        for (let r = row; r < lv.rows && !found; r++) {
          let best = -1;
          for (let c = 0; c < COLS; c++) if (lv.t[r][c] && (best < 0 || Math.abs(c - 10) < Math.abs(best - 10))) best = c;
          if (best >= 0) found = { r, c: best };
        }
        if (!found) found = { r: lv.rows - 2, c: 10 };
        Object.assign(P, { x: found.c * TS + 8, y: found.r * TS, vx: 0, vy: 0, onGround: true, jumping: false, stand: null, dead: false, inv: 150 });
        G.rbs = [];
        G.waterY = Math.max(G.waterY, P.y + 110);
        G.speed = 0; G.rapid = 0; G.dbl = 0;
        G.phase = 'play';
      }

      // ---------- enemies ----------
      function updateFoes() {
        const P = G.P, angry = G.hurry ? 1.5 : 1;
        for (const f of G.foes) {
          f.t++;
          if (f.dead) { f.vy += 0.2; f.x += f.vx; f.y += f.vy; f.spin = (f.spin || 0) + 1; continue; }
          if (Math.abs(f.y - G.camY - H / 2) > H + 60) continue;   // dormant off-screen
          if (f.type === 'crawler') {
            const nx = f.x + f.vx * angry;
            const ahead = nx + Math.sign(f.vx) * 7;
            if (!solidAt(ahead, f.y + 1) || ahead < 4 || ahead > W - 4) f.vx = -f.vx; else f.x = nx;
          } else if (f.type === 'flyer') {
            f.x += f.vx * angry; if (f.x < 10 || f.x > W - 10) f.vx = -f.vx;
            const ty = Math.abs(P.y - f.y) < 140 ? P.y - 10 : f.y0;
            f.y += Math.sin(f.t * 0.08) * 0.8 + clamp(ty - f.y, -0.3, 0.3) * angry;
          } else if (f.type === 'dropper') {
            f.y = f.y0 + 34 * (1 - Math.cos(f.t * 0.03 * angry));
            f.x += Math.sin(f.t * 0.01) * 0.2;
          } else if (f.type === 'hopper') {
            if (f.onGround) {
              if (f.t % 80 === 0) { f.vy = -4.2; f.onGround = false; f.vx = (P.x > f.x ? 1 : -1) * f.sp * 1.4; }
              else if (!solidAt(f.x, f.y + 1)) f.onGround = false;
            } else {
              const oy = f.y; f.vy = Math.min(4, f.vy + 0.22); f.y += f.vy; f.x = clamp(f.x + f.vx * angry, 8, W - 8);
              if (landCheck(f, oy, 4)) { f.onGround = true; }
              if (f.y > G.levelH - 2 * TS) { f.y = G.levelH - 2 * TS; f.onGround = true; f.vy = 0; }
            }
          }
          if (!P.dead && P.inv <= 0 && Math.abs(f.x - P.x) < 10 && Math.abs((f.y - 6) - (P.y - 8)) < 11) killPlayer();
        }
        G.foes = G.foes.filter(f => !f.dead || f.y < G.camY + H + 40);
        // boss
        const B = G.boss;
        if (B) {
          B.t++; if (B.flash > 0) B.flash--;
          if (B.dead) {
            B.deadT++; B.y += 2;
            if (B.deadT === 90) G.chest = { x: W / 2, y: 12 * TS };
          } else {
            const rage = 1 + (1 - B.hp / B.max) * 0.8;
            B.x += B.vx * rage; if (B.x < 24 || B.x > W - 24) { B.vx = -B.vx; B.x = clamp(B.x, 24, W - 24); }
            B.vy += 0.15; B.y += B.vy;
            if (B.y >= 12 * TS) { B.y = 12 * TS; B.vy = -(3.5 + Math.random() * 2.5); }
            if (B.t % Math.max(50, 110 - G.island * 8) === 0) {
              for (let k = -1; k <= 1; k++) {
                const a = Math.atan2(P.y - 8 - (B.y - 20), P.x - B.x) + k * 0.3;
                G.shots.push({ x: B.x, y: B.y - 20, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 });
              }
              au.tone(220, 0.1, { type: 'square', vol: 0.08, slideTo: 110 });
            }
            if (!P.dead && P.inv <= 0 && Math.abs(B.x - P.x) < 22 && P.y - 8 > B.y - 38 && P.y - 8 < B.y + 2) killPlayer();
          }
        }
        for (const s of G.shots) {
          s.x += s.vx; s.y += s.vy;
          if (!P.dead && P.inv <= 0 && Math.abs(s.x - P.x) < 6 && Math.abs(s.y - (P.y - 8)) < 8) killPlayer();
        }
        G.shots = G.shots.filter(s => s.x > -10 && s.x < W + 10 && s.y > -10 && s.y < G.levelH + 10);
      }
      function updateItems() {
        for (const it of G.items) {
          it.t++;
          if (!it.land) {
            const oy = it.y; it.vy = Math.min(4, it.vy + 0.2); it.y += it.vy;
            if (landCheck(it, oy, 2)) it.land = true;
            if (it.y > G.levelH - 2 * TS) { it.y = G.levelH - 2 * TS; it.land = true; }
          }
        }
      }

      // ---------- update ----------
      function update() {
        frame++; modeT++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; modeT = 0; newGame(); snd.start(); }
          return;
        }
        if (G.msgT > 0) G.msgT--;
        for (const p of G.pops) { p.t--; p.y -= 0.5; }
        G.pops = G.pops.filter(p => p.t > 0);
        // camera
        const P = G.P;
        const target = clamp(P.y - H * 0.6, 0, G.levelH - H);
        G.camY += (target - G.camY) * 0.08;
        if (G.phase === 'intro') { if (--G.phaseT <= 0) G.phase = 'play'; return; }
        if (G.phase === 'goal') {
          G.phaseT--; updateItems();
          if (G.phaseT <= 0) nextRound();
          return;
        }
        if (G.phase === 'island') { if (--G.phaseT <= 0) nextRound(); return; }
        if (G.phase === 'dying') {
          P.deadT++; P.vy += 0.15; P.y += P.vy;
          updateFoes();
          if (P.deadT === 100) {
            if (G.lives > 0) { G.lives--; respawn(); }
            else if (api.offerContinue) api.offerContinue(() => { G.lives = 2; respawn(); }, gameOver);
            else gameOver();
          }
          return;
        }
        if (G.phase === 'over') {
          if (--G.phaseT <= 0 || (G.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; modeT = 0; }
          return;
        }
        G.timer++;
        if (G.timer === G.limit) { G.hurry = true; G.msg = 'HURRY UP!'; G.msgT = 150; snd.hurry(); G.waterY = Math.min(G.waterY, G.camY + H + 30); }
        if (G.hurry) G.waterY -= 0.3 + G.loop * 0.1 + G.island * 0.02;
        updatePlayer();
        if (G.phase !== 'play' && G.phase !== 'dying') return;
        updateRainbows();
        updateFoes();
        updateItems();
      }
      function gameOver() {
        api.setHiScore(G.score);
        G.phase = 'over'; G.phaseT = 420;
        au.melody([[523, .2], [392, .2], [330, .2], [262, .5]], { type: 'triangle', vol: 0.16 });
      }

      // ---------- drawing ----------
      function drawRainbow(ctx, rb, oy) {
        if (rb.state === 'solid' && rb.life < 60 && (frame & 4)) return;
        for (let dx = -RBA; dx < RBA; dx++) {
          const u = (dx * rb.dir / RBA + 1) / 2;
          if (rb.state === 'grow' && u > rb.t) continue;
          const x = Math.round(rb.cx + dx);
          let prev = null;
          for (let i = 0; i <= 7; i++) {
            const a = RBA - i, b = RBB - i;
            const q = 1 - (dx + 0.5) * (dx + 0.5) / (a * a);
            const y = q > 0 ? rb.by - b * Math.sqrt(q) : rb.by;
            if (prev != null && i > 0) {
              ctx.fillStyle = RB_COLS[i - 1];
              ctx.fillRect(x, Math.round(prev - oy), 1, Math.max(1, Math.round(y - prev)));
            }
            prev = y;
          }
        }
        if (rb.state === 'grow') {
          // sparkle at the growing tip
          const ang = Math.PI * rb.t, dx = -Math.cos(ang) * RBA * rb.dir, dy = -Math.sin(ang) * RBB;
          ctx.fillStyle = (frame & 2) ? '#fff' : '#ffe020';
          ctx.fillRect(rb.cx + dx - 2, rb.by + dy - oy - 2, 4, 4);
        }
      }
      function drawBG(ctx, isl, oy) {
        const I = ISLANDS[isl];
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, I.sky[0]); g.addColorStop(1, I.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // parallax clouds / hills
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 6; i++) {
          const y = ((i * 97 - oy * 0.3) % (H + 60) + H + 60) % (H + 60) - 30;
          const x = (i * 71) % W;
          ctx.fillRect(x, y, 48, 8); ctx.fillRect(x + 8, y - 6, 28, 6);
        }
      }
      function drawTiles(ctx, oy) {
        const I = ISLANDS[G.island], lv = G.lv;
        const r0 = Math.max(0, Math.floor(oy / TS)), r1 = Math.min(lv.rows - 1, Math.floor((oy + H) / TS));
        for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) {
          const t = lv.t[r][c]; if (!t) continue;
          const x = c * TS, y = Math.round(r * TS - oy);
          if (t === 2) {
            ctx.fillStyle = I.dark; ctx.fillRect(x, y, TS, TS);
            ctx.fillStyle = I.body; ctx.fillRect(x + 1, y + 1, TS - 2, TS - 2);
            if (r === lv.rows - 2) { ctx.fillStyle = I.top; ctx.fillRect(x, y, TS, 4); }
          } else {
            ctx.fillStyle = I.body; ctx.fillRect(x, y, TS, TS - 4);
            ctx.fillStyle = I.dark; ctx.fillRect(x, y + TS - 6, TS, 2); ctx.fillRect(x + ((c & 1) ? 4 : 10), y + 4, 2, 6);
            ctx.fillStyle = I.top; ctx.fillRect(x, y, TS, 4);
            ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.35; ctx.fillRect(x, y, TS, 1); ctx.globalAlpha = 1;
          }
        }
        if (!G.boss && G.lv.goalY > oy - 20 && G.lv.goalY < oy + H + 20) {
          const y = G.lv.goalY - oy;
          stext(ctx, 'GOAL', W / 2, y - 26, (frame >> 3) & 1 ? '#ffe020' : '#ff2020', 2, 'center');
          // treasure chest
          ctx.fillStyle = '#804010'; ctx.fillRect(W / 2 + 40, y - 14, 20, 14);
          ctx.fillStyle = '#ffe020'; ctx.fillRect(W / 2 + 40, y - 9, 20, 2); ctx.fillRect(W / 2 + 48, y - 10, 4, 5);
        }
      }
      function drawBubby(ctx, P, oy) {
        if (P.inv > 0 && (frame & 2) && !P.dead) return;
        let f = 0;
        if (P.dead) f = 2;
        else if (!P.onGround && !P.stand) f = 2;
        else if (api.key('ArrowLeft') || api.key('ArrowRight')) f = (P.anim >> 3) & 1;
        const img = (P.dir > 0 ? BUBR : BUBL)[f];
        const x = Math.round(P.x - 8), y = Math.round(P.y - 16 - oy);
        if (P.dead) {
          ctx.save(); ctx.translate(x + 8, y + 8); ctx.rotate(P.deadT * 0.3); ctx.drawImage(img, -8, -8); ctx.restore();
        } else ctx.drawImage(img, x, y);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const oy = Math.round(G.camY);
        drawBG(ctx, G.island, oy);
        drawTiles(ctx, oy);
        const fs = foeSprites(G.island);
        for (const it of G.items) {
          if (it.t > 700 && (frame & 4)) continue;
          const img = it.kind === 'fruit' ? FRUITS[it.f] : it.kind === 'gem' ? GEMS[it.c] : POW[it.kind];
          ctx.drawImage(img, Math.round(it.x - 4), Math.round(it.y - img.height - oy));
        }
        if (G.chest) {
          const y = G.chest.y - oy;
          ctx.fillStyle = '#804010'; ctx.fillRect(G.chest.x - 16, y - 22, 32, 22);
          ctx.fillStyle = '#ffe020'; ctx.fillRect(G.chest.x - 16, y - 14, 32, 3); ctx.fillRect(G.chest.x - 3, y - 16, 6, 8);
          if ((frame >> 3) & 1) stext(ctx, 'GOAL IN', G.chest.x, y - 34, '#fff', 1, 'center');
        }
        for (const f of G.foes) {
          const imgs = fs[f.type + (f.vx < 0 ? 'L' : '')];
          const img = imgs[(f.t >> 3) % imgs.length];
          const x = Math.round(f.x - img.width / 2), y = Math.round(f.y - img.height - oy);
          if (y < -20 || y > H + 20) continue;
          if (f.type === 'dropper' && !f.dead) { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(Math.round(f.x), Math.round(f.y0 - 40 - oy), 1, Math.round(f.y - f.y0 + 40 - img.height)); }
          if (f.dead) { ctx.save(); ctx.translate(x + img.width / 2, y + img.height / 2); ctx.rotate(f.spin * 0.4); ctx.scale(1, -1); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore(); }
          else ctx.drawImage(img, x, y);
        }
        const B = G.boss;
        if (B) {
          const img = B.flash > 0 && (frame & 2) ? fs.bossHit : fs.boss;
          ctx.drawImage(img, Math.round(B.x - 32), Math.round(B.y - 48 - oy), 64, 48);
          if (!B.dead) {
            stext(ctx, ISLANDS[G.island].bossName, W / 2, 20, '#fff', 1, 'center');
            ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 51, 30, 102, 6);
            ctx.fillStyle = '#ff2020'; ctx.fillRect(W / 2 - 50, 31, 100 * B.hp / B.max, 4);
          }
        }
        for (const s of G.shots) { ctx.fillStyle = (frame & 2) ? '#fff' : '#ff4040'; ctx.fillRect(Math.round(s.x - 2), Math.round(s.y - 2 - oy), 4, 4); }
        for (const rb of G.rbs) drawRainbow(ctx, rb, oy);
        drawBubby(ctx, G.P, oy);
        for (const p of G.pops) text(ctx, p.s, Math.round(p.x), Math.round(p.y - oy), (frame & 4) ? '#fff' : '#ffe020', 1, 'center');
        // rising water
        if (G.waterY < oy + H) {
          const wy = Math.round(G.waterY - oy);
          ctx.fillStyle = 'rgba(30,90,255,0.6)'; ctx.fillRect(0, wy, W, H - wy);
          ctx.fillStyle = '#a0d0ff';
          for (let x = 0; x < W; x += 8) ctx.fillRect(x, wy + Math.round(Math.sin(frame * 0.1 + x * 0.2) * 1.5), 6, 2);
        }
        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, 14);
        stext(ctx, '1UP', 8, 4, '#ff2020'); stext(ctx, pad(G.score, 7), 32, 4, '#fff');
        stext(ctx, 'HI', W / 2 - 30, 4, '#ff2020'); stext(ctx, pad(hi, 7), W / 2 - 14, 4, '#fff');
        stext(ctx, 'ROUND ' + (G.island + 1) + '-' + (G.round + 1), W - 8, 4, '#ffe020', 1, 'right');
        for (let i = 0; i < Math.min(6, G.lives); i++) ctx.drawImage(BUBR[0], 4 + i * 14, H - 18, 12, 12);
        for (let i = 0; i < 7; i++) {
          if (G.gems.has(i)) ctx.drawImage(GEMS[i], W - 66 + i * 9, H - 12);
          else { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(W - 65 + i * 9, H - 11, 6, 5); }
        }
        if (G.speed) ctx.drawImage(POW.shoe, 92, H - 12);
        if (G.rapid) ctx.drawImage(POW.rpot, 102, H - 12);
        if (G.dbl) ctx.drawImage(POW.ypot, 112, H - 12);
        if (G.msgT > 0) stext(ctx, G.msg, W / 2, 46, (frame & 8) ? '#fff' : '#ffe020', 2, 'center');
        if (G.phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 70, W, 64);
          stext(ctx, ISLANDS[G.island].name, W / 2, 80, '#fff', 2, 'center');
          stext(ctx, G.boss ? 'BOSS ROUND' : 'ROUND ' + (G.island + 1) + '-' + (G.round + 1), W / 2, 102, '#ffe020', 1, 'center');
          stext(ctx, G.boss ? 'BREAK RAINBOWS ON IT!' : 'CLIMB TO THE GOAL', W / 2, 116, '#a0ffff', 1, 'center');
        }
        if (G.phase === 'goal') {
          stext(ctx, 'GOAL IN!', W / 2, 74, RB_COLS[(frame >> 2) % 7], 3, 'center');
          stext(ctx, 'BONUS ' + G.bonus, W / 2, 104, '#fff', 1, 'center');
        }
        if (G.phase === 'island') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 60, W, 90);
          stext(ctx, ISLANDS[G.island].name, W / 2, 70, '#fff', 1, 'center');
          stext(ctx, 'CLEAR!', W / 2, 84, RB_COLS[(frame >> 2) % 7], 3, 'center');
          stext(ctx, 'BONUS ' + G.bonus, W / 2, 114, '#fff', 1, 'center');
          if (G.perfect) stext(ctx, 'ALL 7 DIAMONDS! 1UP', W / 2, 128, '#ffe020', 1, 'center');
        }
        if (G.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 80, W, 50);
          stext(ctx, 'GAME OVER', W / 2, 92, '#ff2020', 3, 'center');
        }
      }
      // title rainbow helper (static arc)
      function titleArc(ctx, cx, by, a, b) {
        for (let dx = -a; dx < a; dx++) {
          let prev = null;
          for (let i = 0; i <= 7; i++) {
            const aa = a - i * 2, bb = b - i * 2;
            const q = 1 - (dx + 0.5) * (dx + 0.5) / (aa * aa);
            const y = q > 0 ? by - bb * Math.sqrt(q) : by;
            if (prev != null) { ctx.fillStyle = RB_COLS[i - 1]; ctx.fillRect(cx + dx, Math.round(prev), 1, Math.max(1, Math.round(y - prev))); }
            prev = y;
          }
        }
      }
      function renderTitle(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#3060ff'); g.addColorStop(1, '#a0e0ff');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        titleArc(ctx, W / 2, 100, 130, 80);
        stext(ctx, 'RAINBOW', W / 2, 46, '#fff', 4, 'center');
        stext(ctx, 'ISLANDS', W / 2, 78, '#ffe020', 4, 'center');
        stext(ctx, 'THE STORY OF BUBBLE BOBBLE 2', W / 2, 110, '#fff', 1, 'center');
        // little demo: Bubby on an island throwing rainbows
        ctx.fillStyle = '#40d040'; ctx.fillRect(60, 170, 200, 4); ctx.fillStyle = '#906030'; ctx.fillRect(60, 174, 200, 30);
        const bx = 100 + Math.sin(modeT * 0.02) * 40;
        ctx.drawImage(Math.cos(modeT * 0.02) > 0 ? BUBR[(modeT >> 3) & 1] : BUBL[(modeT >> 3) & 1], Math.round(bx - 8), 154);
        const ph = (modeT % 120) / 40;
        if (ph < 2.5) drawRainbow(ctx, { cx: 210, by: 170, dir: 1, t: Math.min(1, ph), state: ph < 1 ? 'grow' : 'solid', life: 300 }, 0);
        const page = Math.floor(modeT / 400) % 2;
        if (page === 0) {
          stext(ctx, 'SHOOT RAINBOWS  CLIMB ON THEM', W / 2, 124, '#fff', 1, 'center');
          stext(ctx, 'JUMP ON A RAINBOW TO DROP IT', W / 2, 135, '#fff', 1, 'center');
        } else {
          stext(ctx, 'HIGH SCORE ' + pad(hi, 7), W / 2, 124, '#ffe020', 1, 'center');
          stext(ctx, 'COLLECT ALL 7 DIAMONDS', W / 2, 135, '#fff', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) stext(ctx, 'INSERT COIN', W / 2, 148, '#fff', 1, 'center'); }
        else if (blink) stext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 148, '#ff2020', 1, 'center');
        stext(ctx, '\u00a9 1987 TAITO', W / 2, 210, '#fff', 1, 'center');
        stext(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), W - 8, 210, '#fff', 1, 'right');
      }
      return { update, render, destroy() { } };
    }
  });
})();
