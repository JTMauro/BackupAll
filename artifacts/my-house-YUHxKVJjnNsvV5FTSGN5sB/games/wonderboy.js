// Wonder Boy (Sega / Escape, 1986) \u2014 from-scratch recreation. Tom-Tom runs right through jungle, seaside,
// cave and night rounds to rescue Tanya. Vitality drains constantly and is refilled by fruit; eggs hold stone
// hatchets, skateboards, guardian angels or the cursed eggplant. Snails, frogs, bees, spiders, boulders and
// bonfires block the way; every 4th round ends with the masked king boss.
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
    '"': [10, 10, 20, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2],
    '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // col: css colour or array of 7 per-row colours (gradient lettering)
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let r = 0; r < 7; r++) {
      ctx.fillStyle = typeof col === 'string' ? col : col[r];
      for (let i = 0; i < s.length; i++) {
        const g = FONT[s[i]]; if (!g) continue;
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
    return w;
  }
  function textS(ctx, s, x, y, col, sc, align) { // with 1px drop shadow / outline
    sc = sc || 1;
    text(ctx, s, x + 1, y + 1, '#000', sc, align);
    if (sc > 1) { text(ctx, s, x - 1, y, '#000', sc, align); text(ctx, s, x + 1, y, '#000', sc, align); text(ctx, s, x, y - 1, '#000', sc, align); text(ctx, s, x, y + sc, '#000', sc, align); }
    return text(ctx, s, x, y, col, sc, align);
  }

  // ---------- helpers ----------
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function paint(rows, pal) {
    const h = rows.length; let w = 0; for (const r of rows) w = Math.max(w, r.length);
    const [c, x] = mkCanvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
      const col = pal[rows[j][i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
    }
    return c;
  }
  function mirror(rows) { let w = 0; for (const r of rows) w = Math.max(w, r.length); return rows.map(r => r.padEnd(w, '.').split('').reverse().join('')); }
  function sprite(rows, pal) { let w = 0; for (const r of rows) w = Math.max(w, r.length); return { r: paint(rows, pal), l: paint(mirror(rows), pal), w, h: rows.length }; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const PAL = {
    y: '#ffd820', Y: '#c09000', s: '#ffc088', S: '#d08850', k: '#000', w: '#fff', g: '#30c030', G: '#107010', r: '#e02020', R: '#901010',
    n: '#a06020', N: '#603010', b: '#3060ff', B: '#102890', p: '#ff80c0', P: '#a02880', o: '#ff8c00', e: '#808080', E: '#404040', v: '#9040e0', V: '#501890', c: '#60e0ff'
  };
  const TOM = [
    ['...yyyyy....', '..yyyyyyy...', '.yyyyyyyyy..', '.yysssskss..', '.yysssssss..', '..ssssssss..', '...sssss....', '..ssssssss..',
      '.ss.sssss.s.', '.s..sssss.s.', '....gggggs..', '...ggGgGgg..', '...gGgGgGg..', '....ss.ss...', '....ss..ss..', '...ss....ss.', '..sSk....sSk'],
    ['...yyyyy....', '..yyyyyyy...', '.yyyyyyyyy..', '.yysssskss..', '.yysssssss..', '..ssssssss..', '...sssss....', '..ssssssss..',
      '..ss.sssss..', '..s..sssss..', '....gggggs..', '...ggGgGgg..', '...gGgGgGg..', '.....ss.....', '.....sss....', '.....s.ss...', '....sSk.....'],
    ['...yyyyy....', '..yyyyyyy...', '.yyyyyyyyy..', '.yysssskss..', '.yysssssss..', '..ssssssss..', 'ss.sssss.ss.', '.ssssssssss.',
      '....sssss...', '....sssss...', '....gggggs..', '...ggGgGgg..', '...gGgGgGg..', '...ss...ss..', '..ss.....ss.', '.sSk.....sSk', '............']
  ].map(r => sprite(r, PAL));
  const SNAIL = sprite(['.....nnnn...', '....nNNNNn..', '...nNnnnNn..', '...nNnNNNn..', 'e..nNnnnNn..', '.e.nnNNNnn..', 'eeeennnnnn..', 'eeeeeeeeeeee', '.eeeeeeeeee.'], PAL);
  const FROG = [sprite(['..ww..ww....', '.wkgggkw....', '.gggggggg...', 'ggggggggggg.', 'gGgggggggGg.', '.g.GG.GG.g..', 'gg.......gg.'], PAL),
    sprite(['..ww..ww....', '.wkgggkw....', '.gggggggg...', 'gggggggggg..', '.ggggggggg..', 'g.g.....g.g.', '.g.......g..'], PAL)];
  const BEE = [sprite(['...ww.....', '..wwww....', '.yykyyy...', 'yykyykyyk.', 'yykyykyy..', '.ykyyky...', '.......k..'], PAL),
    sprite(['..........', '..........', '.yykyyy...', 'yykyykyyk.', 'yykyykyy..', '.ykyyky...', '.wwww..k..'], PAL)];
  const BAT = [sprite(['v........v', 'vv.vvvv.vv', 'vvvvwvwvvv', '.vvvvvvvv.', '...vVVv...'], PAL), sprite(['..........', '...vvvv...', 'vvvvwvwvvv', 'vvvvvvvvvv', 'v..vVVv..v'], PAL)];
  const SPIDER = sprite(['..kkkk...', '.kEEEEk..', 'kEwEEwEk.', 'kEEEEEEk.', '.kkkkkk..', 'k.k..k.k.', 'k..kk..k.'], PAL);
  const FIRE = [sprite(['...r....', '..ror...', '..roor..', '.royor..', 'rooyyor.', 'royyyyor', '.ryyyyr.', 'NnNnNnNn'], PAL),
    sprite(['....r...', '...ror..', '..roor..', '.roooyr.', '.royyor.', 'royyyyor', '.ryyyyr.', 'nNnNnNnN'], PAL)];
  const ROCK = sprite(['..eeee..', '.eeeeEe.', 'eeeeeEEe', 'eeeEeeEe', 'EEEEEEEE'], PAL);
  const EGG = sprite(['..wwww..', '.wwwwww.', 'wwwpwwww', 'wwwwwpww', 'wpwwwwww', 'wwwwwwww', '.wwwwww.', '..wwww..'], PAL);
  const HATCHET = sprite(['..eee..', '.eeeee.', 'eeeEeee', '..nn...', '..nn...', '..nn...', '..nn...'], PAL);
  const SKATE = sprite(['rrrrrrrrrrrr', '.RRRRRRRRRR.', '..kk....kk..'], PAL);
  const ANGEL = sprite(['.yyyyyy.', 'y......y', '.yyyyyy.', '..ssss..', 'w.ssss.w', 'wwwwwwww', '.wwwwww.', '..w..w..'], PAL);
  const EGGPLANT = sprite(['...gg...', '..gGg...', '.vvvvv..', 'vvvwvvv.', 'vvwvvvvv', 'vvvvvvvv', '.vvvvvv.', '..vvvv..'], PAL);
  const FRUITS = [
    { s: sprite(['....g...', '...g....', '.rrrrr..', 'rrwrrrr.', 'rwrrrrr.', 'rrrrrrr.', '.rrrrr..', '..r.r...'], PAL), pts: 50, v: 1 },     // apple
    { s: sprite(['......n.', '.....yy.', '....yyy.', '...yyy..', '.yyyy...', 'yyyY....', '.YY.....'], PAL), pts: 100, v: 1 },             // banana
    { s: sprite(['..g.g...', '...g....', '.rrrrr..', 'rwrrrrr.', 'rrrrrrr.', '.rrrrr..'], PAL), pts: 200, v: 2 },                       // tomato
    { s: sprite(['.g.g.g..', '..ggg...', '.oYoYo..', 'oYoYoYo.', 'YoYoYoY.', 'oYoYoYo.', '.oYoYo..'], PAL), pts: 300, v: 2 },          // pineapple
    { s: sprite(['..gGgG..', '.gGgGgG.', 'gGgGgGgG', 'GgGgGgGg', 'gGgGgGgG', '.gGgGgG.', '..gGgG..'], PAL), pts: 500, v: 4 }           // melon
  ];

  ArcadeRegistry.register({
    id: 'wonderboy', title: 'Wonder Boy', year: 1986, maker: 'Sega / Escape',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Arrows: run \u00b7 Space: jump \u00b7 X: throw hatchet / hold to dash \u00b7 Enter: start',
    marquee: { bg: '#106020', fg: '#ffd820', accent: '#ff4020' },
    create(api) {
      const W = 256, H = 224, CW = 16, BASE = 192, PIT = 999, HUDH = 24;
      const audio = api.audio;
      const THEMES = [
        { name: 'FOREST', sky: ['#58b8ff', '#98d8ff'], far: '#2a8a40', near: '#1a6a28', grass: '#40d040', dirt: '#a06020', dirtD: '#704010', pit: '#000', water: false },
        { name: 'SEASIDE', sky: ['#3890ff', '#a8e0ff'], far: '#e0d090', near: '#2a9a50', grass: '#f0e080', dirt: '#d0a050', dirtD: '#a07030', pit: '#1050c0', water: true },
        { name: 'CAVE', sky: ['#201018', '#402028'], far: '#503030', near: '#382020', grass: '#a08070', dirt: '#705048', dirtD: '#402820', pit: '#000', water: false },
        { name: 'NIGHT', sky: ['#081040', '#283080'], far: '#203850', near: '#102028', grass: '#30a060', dirt: '#605040', dirtD: '#3a3028', pit: '#000', water: false }
      ];
      let hi = api.getHiScore(30000);
      let mode = 'title', modeT = 0, score = 0, lives = 0, area = 1, rnd = 1, loop = 0, nextExtra = 30000, coinFlash = 0;
      let ground = [], plats = [], spawns = [], objs = [], hatchets = [], shots = [], pops = [], signs = [];
      let len = 0, camX = 0, checkpoint = 0, p = null, vit = 16, curse = 0, boss = null, bossRound = false, arenaX = 0, bgmT = 0, tally = 0;

      function theme() { return THEMES[(area - 1) % 4]; }
      function addScore(n) {
        score += n;
        while (score >= nextExtra) { lives++; nextExtra = nextExtra < 100000 ? 100000 : nextExtra + 100000; audio.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .15]], { type: 'square', vol: 0.12 }); pops.push({ x: p ? p.x : 128, y: 60, t: '1UP', f: 90, col: '#7ff' }); }
        if (score > hi) hi = score;
      }
      function pop(x, y, t, col) { pops.push({ x, y, t: String(t), f: 50, col: col || '#fff' }); }
      const sfx = {
        jump() { audio.tone(300, 0.14, { type: 'square', vol: 0.08, slideTo: 700 }); },
        thrw() { audio.tone(1200, 0.08, { type: 'square', vol: 0.07, slideTo: 600 }); },
        kill() { audio.tone(900, 0.12, { type: 'square', vol: 0.1, slideTo: 200 }); audio.noise(0.08, { vol: 0.1, freq: 3000 }); },
        fruit() { audio.tone(1319, 0.05, { type: 'square', vol: 0.1 }); audio.tone(1760, 0.08, { type: 'square', vol: 0.1, delay: 0.05 }); },
        egg() { audio.noise(0.1, { vol: 0.2, freq: 4000 }); audio.tone(600, 0.1, { type: 'triangle', vol: 0.15, slideTo: 1200 }); },
        item() { audio.melody([[784, .06], [988, .06], [1175, .06], [1568, .12]], { type: 'square', vol: 0.11 }); },
        trip() { audio.tone(180, 0.2, { type: 'square', vol: 0.12, slideTo: 90 }); },
        die() { audio.melody([[880, .1], [831, .1], [784, .1], [740, .1], [0, .1], [523, .12], [392, .12], [262, .3]], { type: 'square', vol: 0.12 }); },
        clear() { audio.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [988, .1], [1047, .1], [1175, .1], [1319, .35]], { type: 'square', vol: 0.12 }); },
        boss() { audio.noise(0.25, { vol: 0.22, freq: 1500 }); audio.tone(160, 0.2, { type: 'sawtooth', vol: 0.1, slideTo: 80 }); }
      };
      const BGM = [[523, .14], [0, .07], [523, .07], [659, .14], [784, .14], [880, .14], [784, .14], [659, .28],
        [587, .14], [0, .07], [587, .07], [698, .14], [880, .14], [784, .14], [698, .14], [659, .28],
        [523, .14], [659, .14], [784, .14], [1047, .14], [988, .14], [880, .14], [784, .14], [698, .14],
        [659, .14], [587, .14], [523, .14], [494, .14], [523, .42]];
      const BASS = [[131, .28], [196, .28], [131, .28], [196, .28], [147, .28], [220, .28], [147, .28], [196, .28], [175, .28], [262, .28], [196, .28], [247, .28], [131, .28], [196, .28], [131, .56]];
      const BOSSM = [[220, .15], [0, .05], [220, .1], [262, .15], [247, .15], [208, .3], [220, .15], [0, .05], [220, .1], [294, .15], [262, .15], [247, .3]];

      // ---------- course generation ----------
      function genCourse() {
        const lv = (area - 1) * 4 + rnd + loop * 16;
        let s = (lv * 104729 + 7) % 2147483647; const R = () => (s = (s * 48271) % 2147483647) / 2147483647;
        bossRound = rnd === 4;
        len = 230 + Math.min(70, lv * 4);
        ground = new Array(len + 40).fill(BASE);
        plats = []; spawns = []; signs = [];
        const dens = Math.min(1, 0.35 + lv * 0.05);
        const th = (area - 1) % 4;
        let c = 14, h = BASE;
        const flyer = th >= 2 ? 'bat' : 'bee';
        while (c < len - 22) {
          const roll = R();
          if (roll < 0.22 && c > 20) {                          // pit
            const wide = R() < 0.4 + lv * 0.02;
            const pw = wide ? 4 + Math.floor(R() * 3) : 2 + Math.floor(R() * 2);
            for (let k = 0; k < pw; k++) ground[c + k] = PIT;
            if (wide) {
              const n = pw >= 6 ? 2 : 1;
              for (let k = 0; k < n; k++) plats.push({ x: (c + 1 + k * 3) * CW - 4, w: 28, y: h - 20 - Math.floor(R() * 12), cloud: th === 1 || th === 3 });
            }
            if (R() < dens * 0.6) spawns.push({ x: (c + pw / 2) * CW, kind: flyer, y: h - 40 });
            c += pw;
          } else if (roll < 0.36) {                             // step up or down
            const nh = h === BASE ? BASE - 16 : (h <= BASE - 32 ? h + 16 : (R() < 0.5 ? h - 16 : h + 16));
            h = clamp(nh, BASE - 32, BASE);
            const run = 6 + Math.floor(R() * 6);
            for (let k = 0; k < run; k++) ground[c + k] = h;
            if (R() < dens) spawns.push({ x: (c + 3) * CW, kind: R() < 0.5 ? 'snail' : 'frog' });
            if (R() < 0.5) spawns.push({ x: (c + 2) * CW, kind: 'fruit', y: h - 28 - Math.floor(R() * 20), f: Math.floor(R() * 5) });
            c += run;
          } else {                                              // flat run with hazards
            const run = 8 + Math.floor(R() * 10);
            for (let k = 0; k < run; k++) ground[c + k] = h;
            const hz = R();
            if (hz < 0.3) spawns.push({ x: (c + 3 + Math.floor(R() * (run - 5))) * CW, kind: 'rock' });
            else if (hz < 0.3 + dens * 0.3) spawns.push({ x: (c + 3 + Math.floor(R() * (run - 5))) * CW, kind: 'fire' });
            if (R() < dens) spawns.push({ x: (c + run - 2) * CW, kind: ['snail', 'frog', flyer, 'spider', 'boulder'][Math.floor(R() * Math.min(5, 2 + lv / 2))], y: h - 36 - Math.floor(R() * 20) });
            if (R() < dens * 0.5) spawns.push({ x: (c + 5) * CW, kind: flyer, y: h - 30 - Math.floor(R() * 30) });
            const nf = 1 + Math.floor(R() * 2);
            for (let k = 0; k < nf; k++) spawns.push({ x: (c + 2 + k * 3) * CW, kind: 'fruit', y: h - 30 - Math.floor(R() * 24), f: Math.floor(R() * 5) });
            if (R() < 0.12) spawns.push({ x: (c + 4) * CW, kind: 'egg', e: R() });
            c += run;
          }
        }
        for (let k = c; k < ground.length; k++) ground[k] = BASE;
        len = c + 22;
        // signposts (checkpoints 1..3) and the goal or boss arena
        for (let q = 1; q <= 3; q++) {
          let sc = Math.floor(len * q / 4);
          while (ground[sc] === PIT) sc++;
          signs.push({ x: sc * CW, n: q, y: ground[sc] });
        }
        arenaX = (len - 18) * CW;
        if (bossRound) spawns.push({ x: arenaX - 3 * CW, kind: 'egg', e: 0 });   // the hatchet is always waiting before the boss
        else signs.push({ x: (len - 8) * CW, n: 4, y: BASE });
        // early hatchet egg in the very first round, extra eggs further on
        if (lv === 1) spawns.push({ x: 9 * CW, kind: 'egg', e: 0 });
        spawns.push({ x: Math.floor(len * 0.55) * CW, kind: 'egg', e: R() });
        spawns.sort((a, b) => a.x - b.x);
      }
      function eggContent(e) {
        if (e < 0.45) return 'hatchet';
        if (e < 0.7) return 'skate';
        if (e < 0.85) return 'angel';
        return 'eggplant';
      }
      function gAt(x) { const c = Math.floor(x / CW); if (c < 0) return BASE; if (c >= ground.length) return BASE; return ground[c]; }
      function drainRate() { return 16 / (60 * Math.max(24, 46 - (area - 1) * 4 - loop * 6 - (rnd - 1))); }

      function startRound(fromCP) {
        genCourse();
        const cx = fromCP ? signs.find(s => s.n === checkpoint) : null;
        const sx0 = cx ? cx.x : 24;
        camX = Math.max(0, sx0 - 60);
        objs = []; hatchets = []; shots = []; boss = null;
        spawns = spawns.filter(sp => sp.x > camX + 8);
        p = { x: sx0, y: gAt(sx0 + 5), vx: 0, vy: 0, ground: true, face: 1, anim: 0, axe: false, skate: false, angel: 0, trip: 0, dieT: 0, inv: 90, throwT: 0 };
        vit = 16; curse = 0;
        mode = 'ready'; modeT = 0; bgmT = 0;
      }
      function startGame() {
        score = 0; lives = 2; area = 1; rnd = 1; loop = 0; nextExtra = 30000; checkpoint = 0;
        startRound(false);
        audio.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.12 });
      }
      function nextRound() {
        rnd++;
        if (rnd > 4) { rnd = 1; area++; if (area > 4) { area = 1; loop++; } }
        checkpoint = 0; startRound(false);
      }
      function killPlayer(why) {
        if (mode !== 'play') return;
        mode = 'die'; modeT = 0; p.dieT = 0; p.vy = why === 'pit' ? 0 : -4; p.why = why;
        sfx.die();
      }
      function hurt() {
        if (p.angel > 0 || p.inv > 0) return;
        if (p.skate) { loseSkate(); return; }
        killPlayer('hit');
      }
      function loseSkate() {
        p.skate = false; p.inv = 60;
        objs.push({ kind: 'deck', x: p.x, y: p.y, vx: 2.5, vy: -2, t: 0 });
        audio.tone(400, 0.25, { type: 'square', vol: 0.1, slideTo: 100 });
      }

      // ---------- player ----------
      function updatePlayer() {
        const L = api.key('ArrowLeft'), Rt = api.key('ArrowRight'), dash = api.key('KeyX') || api.key('KeyZ');
        if (p.trip > 0) p.trip--;
        if (p.angel > 0) p.angel--;
        if (p.inv > 0) p.inv--;
        if (p.throwT > 0) p.throwT--;
        let target;
        if (p.skate) {
          target = Rt ? 3.0 : L ? 1.1 : 2.0; p.face = 1;
        } else {
          const top = (dash ? 2.4 : 1.35) * (p.trip ? 0.4 : 1);
          target = Rt && !L ? top : L && !Rt ? -top : 0;
          if (Rt && !L) p.face = 1; else if (L && !Rt) p.face = -1;
        }
        const acc = p.ground ? 0.12 : 0.07;
        p.vx += clamp(target - p.vx, -acc, acc);
        // horizontal move with walls
        let nx = p.x + p.vx;
        if (nx < camX + 2) { nx = camX + 2; p.vx = Math.max(0, p.vx); }
        if (bossRound && boss && nx > arenaX + 18 * CW - 14) nx = arenaX + 18 * CW - 14;
        if (nx > camX + W - 12) { nx = camX + W - 12; p.vx = Math.min(p.vx, 1); }
        const edge = p.vx > 0 ? nx + 10 : nx;
        if (gAt(edge) < p.y - 3) { nx = p.x; p.vx = 0; }
        p.x = nx;
        if (p.ground) {
          if ((api.pressed('Space') || api.pressed('ArrowUp')) && !p.trip) {
            p.vy = -(4.9 + Math.min(0.9, Math.abs(p.vx) * 0.3)); p.ground = false; sfx.jump();
          } else {
            const gy = Math.min(gAt(p.x + 2), gAt(p.x + 8));
            const onPlat = plats.some(pl => p.x + 8 > pl.x && p.x + 2 < pl.x + pl.w && Math.abs(p.y - pl.y) < 1);
            if (gy > p.y + 1 && !onPlat) { p.ground = false; p.vy = 0; }
            else if (gy < p.y && gy > p.y - 4 && !onPlat) p.y = gy;
          }
        }
        if (!p.ground) {
          if (p.vy < -2 && !api.key('Space') && !api.key('ArrowUp')) p.vy += 0.25;
          const py = p.y;
          p.vy = Math.min(6, p.vy + 0.26); p.y += p.vy;
          if (p.vy >= 0) {
            const gy = Math.min(gAt(p.x + 2), gAt(p.x + 8));
            if (py <= gy && p.y >= gy) { p.y = gy; p.vy = 0; p.ground = true; }
            for (const pl of plats) if (p.x + 8 > pl.x && p.x + 2 < pl.x + pl.w && py <= pl.y && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.ground = true; }
          }
          if (p.y > H + 16) { killPlayer('pit'); return; }
        }
        p.anim += Math.abs(p.vx) * 0.1;
        // throw
        if (p.axe && (api.pressed('KeyX') || api.pressed('KeyZ')) && hatchets.length < 2) {
          hatchets.push({ x: p.x + 5 + p.face * 6, y: p.y - 14, vx: p.face * 3.6 + p.vx * 0.5, vy: -2.4, t: 0 });
          p.throwT = 10; sfx.thrw();
        }
        // vitality
        vit -= drainRate() * (curse > 0 ? 4 : 1);
        if (curse > 0) curse--;
        if (vit <= 0) { vit = 0; killPlayer('vit'); return; }
        // signposts
        for (const s of signs) {
          if (!s.passed && p.x > s.x) {
            s.passed = true;
            if (s.n < 4) { checkpoint = s.n; audio.tone(1047, 0.1, { type: 'square', vol: 0.1 }); audio.tone(1568, 0.15, { type: 'square', vol: 0.1, delay: 0.1 }); }
            else { mode = 'goal'; modeT = 0; tally = Math.floor(vit); sfx.clear(); }
          }
        }
        // camera
        const lock = bossRound && p.x > arenaX + 30;
        if (lock) camX = Math.min(Math.max(camX, p.x - 100), arenaX + 16);
        else camX = Math.max(camX, Math.min(p.x - 100, (len - 2) * CW - W));
        if (bossRound && !boss && camX >= arenaX + 15) startBoss();
      }

      // ---------- objects ----------
      function spawnFrom(sp) {
        const gy = gAt(sp.x + 6);
        const o = { kind: sp.kind, x: sp.x, y: sp.y || gy, vx: 0, vy: 0, t: 0, ground: true, hp: 1 };
        if (sp.kind === 'snail' || sp.kind === 'frog') { o.vx = sp.kind === 'snail' ? -0.35 : 0; o.y = gy; if (gy === PIT) o.dead = true; }
        if (sp.kind === 'boulder') { o.vx = -1.4 - Math.min(1, area * 0.15); o.y = gy; o.x = Math.max(sp.x, camX + W + 4); }
        if (sp.kind === 'bee' || sp.kind === 'bat') { o.y0 = sp.y || gy - 40; o.vx = -0.8 - area * 0.08; }
        if (sp.kind === 'spider') { o.y0 = HUDH + 8; o.span = Math.max(30, Math.min(BASE, gAt(sp.x)) - HUDH - 40); o.y = o.y0; }
        if (sp.kind === 'fruit') { o.f = sp.f; }
        if (sp.kind === 'egg') { o.content = eggContent(sp.e); o.state = 'egg'; }
        if (sp.kind === 'fire' || sp.kind === 'rock') { o.y = gy; }
        objs.push(o);
      }
      function hitBox(o) {
        switch (o.kind) {
          case 'snail': return [o.x, o.y - 9, 12, 9];
          case 'frog': return [o.x, o.y - 7, 11, 7];
          case 'bee': case 'bat': return [o.x, o.y - 7, 10, 7];
          case 'spider': return [o.x, o.y - 7, 9, 7];
          case 'boulder': return [o.x, o.y - 14, 14, 14];
          case 'fire': return [o.x + 1, o.y - 7, 6, 7];
          case 'rock': return [o.x + 1, o.y - 4, 6, 4];
          case 'fruit': return [o.x, o.y - 8, 8, 8];
          case 'egg': return [o.x, o.y - 8, 8, 8];
          case 'eggplant': return [o.x, o.y - 8, 8, 8];
          default: return [o.x, o.y - 8, 8, 8];
        }
      }
      const PTS = { snail: 100, frog: 100, bee: 100, bat: 100, spider: 200, boulder: 200 };
      const overlap = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
      function updateObjs() {
        while (spawns.length && spawns[0].x < camX + W + 24) spawnFrom(spawns.shift());
        const pb = [p.x + 1, p.y - 16, 8, 16];
        for (let i = objs.length - 1; i >= 0; i--) {
          const o = objs[i]; o.t++;
          switch (o.kind) {
            case 'snail': {
              o.x += o.vx; const gy = gAt(o.x + 6);
              if (gy === PIT || Math.abs(gy - o.y) > 2) { o.x -= o.vx; o.vx = -o.vx; }
              break;
            }
            case 'frog':
              if (o.ground) {
                if (o.t % 70 === 0) { o.vx = (p.x < o.x ? -1 : 1) * (0.9 + area * 0.1); o.vy = -3.6; o.ground = false; }
              } else {
                o.x += o.vx; o.vy += 0.2; o.y += o.vy;
                const gy = gAt(o.x + 5);
                if (o.vy > 0 && o.y >= gy && o.y - o.vy <= gy + 2) { o.y = gy; o.ground = true; o.vx = 0; }
                if (o.y > H + 20) o.dead = true;
              }
              break;
            case 'bee': case 'bat':
              o.x += o.vx; o.y = o.y0 + Math.sin(o.t * (o.kind === 'bat' ? 0.06 : 0.09)) * (o.kind === 'bat' ? 22 : 12);
              break;
            case 'spider':
              o.y = o.y0 + (0.5 - 0.5 * Math.cos(o.t * 0.03)) * o.span + 7;
              break;
            case 'boulder': {
              o.x += o.vx; const gy = gAt(o.x + 7);
              if (o.ground) { if (gy > o.y + 1) { o.ground = false; o.vy = 0; } else if (gy < o.y - 2) { o.vy = -3; o.ground = false; o.y -= 1; } }
              else { o.vy += 0.25; o.y += o.vy; if (o.vy > 0 && o.y >= gy && gy !== PIT) { o.y = gy; o.vy = o.vy > 2 ? -o.vy * 0.4 : 0; o.ground = o.vy === 0; } }
              if (o.y > H + 20) o.dead = true;
              if (o.t % 14 === 0 && o.ground && o.x < camX + W) audio.noise(0.05, { vol: 0.05, freq: 400 });
              break;
            }
            case 'egg':
              if (o.state === 'item') { if (o.vy < 0 || o.y < o.ty) { o.vy += 0.15; o.y += o.vy; if (o.y >= o.ty) { o.y = o.ty; o.vy = 0; } } }
              break;
            case 'eggplant':
              o.x += Math.sign(p.x - o.x) * 0.7; o.y += Math.sign(p.y - 12 - o.y) * 0.5;
              break;
            case 'deck':
              o.x += o.vx; o.vy += 0.2; o.y += o.vy; if (o.y > H + 10) o.dead = true;
              break;
          }
          if (o.x < camX - 40 || o.x > camX + W + 200) o.dead = true;
          if (o.dead) { objs.splice(i, 1); continue; }
          if (mode !== 'play' || o.kind === 'deck') continue;
          const hb = hitBox(o);
          if (!overlap(pb, hb)) continue;
          if (o.kind === 'fruit') {
            const F = FRUITS[o.f]; vit = Math.min(16, vit + F.v); addScore(F.pts); pop(o.x, o.y - 10, F.pts, '#ffd820'); sfx.fruit(); objs.splice(i, 1);
          } else if (o.kind === 'egg') {
            if (o.state === 'egg') { o.state = 'item'; o.ty = o.y - 18; o.vy = -2; o.t = 0; sfx.egg(); if (o.content === 'eggplant') { o.kind = 'eggplant'; } }
            else if (o.t > 12) { collect(o.content, o); objs.splice(i, 1); }
          } else if (o.kind === 'eggplant') {
            if (o.t > 30) { curse = 600; objs.splice(i, 1); audio.melody([[392, .15], [370, .15], [349, .15], [330, .3]], { type: 'sawtooth', vol: 0.1 }); pop(p.x, p.y - 30, 'CURSED!', '#c060ff'); }
          } else if (o.kind === 'rock') {
            if (!o.hit && p.ground) {
              o.hit = true;
              if (p.skate) loseSkate(); else if (p.angel <= 0) { p.trip = 40; vit = Math.max(0.01, vit - 2); sfx.trip(); }
            }
          } else if (o.kind === 'fire') {
            if (p.angel > 0) continue;
            hurt();
          } else {
            if (p.angel > 0) { o.dead = true; addScore(PTS[o.kind] || 100); pop(o.x, o.y - 10, PTS[o.kind] || 100); sfx.kill(); objs.splice(i, 1); }
            else hurt();
          }
          if (mode !== 'play') return;
        }
      }
      function collect(c, o) {
        sfx.item();
        if (c === 'hatchet') { p.axe = true; pop(o.x, o.y - 12, 'HATCHET', '#ffd820'); }
        else if (c === 'skate') { p.skate = true; pop(o.x, o.y - 12, 'SKATEBOARD', '#ffd820'); }
        else if (c === 'angel') { p.angel = 600; pop(o.x, o.y - 12, 'ANGEL', '#fff'); }
        addScore(500);
      }
      function updateHatchets() {
        for (let i = hatchets.length - 1; i >= 0; i--) {
          const h = hatchets[i]; h.x += h.vx; h.vy += 0.18; h.y += h.vy; h.t++;
          let gone = h.y > H || h.x > camX + W + 8 || h.x < camX - 8 || (h.vy > 0 && h.y >= gAt(h.x));
          const hb = [h.x - 3, h.y - 3, 7, 7];
          for (const o of objs) {
            if (!PTS[o.kind] || o.dead) continue;
            if (overlap(hb, hitBox(o))) { o.dead = true; addScore(PTS[o.kind]); pop(o.x, o.y - 10, PTS[o.kind]); sfx.kill(); gone = true; break; }
          }
          if (boss && boss.hp > 0 && overlap(hb, [boss.x - 14, boss.y - 46, 28, 46])) {
            boss.hp--; boss.flash = 8; gone = true; addScore(100); audio.tone(200, 0.08, { type: 'square', vol: 0.14 }); audio.noise(0.06, { vol: 0.15, freq: 2500 });
            if (boss.hp <= 0) { boss.deadT = 0; sfx.boss(); shots = []; }
          }
          if (gone) { hatchets.splice(i, 1); for (let j = objs.length - 1; j >= 0; j--) if (objs[j].dead) objs.splice(j, 1); }
        }
      }

      // ---------- boss: the masked king ----------
      function startBoss() {
        const hp = 8 + (area - 1) * 2 + loop * 4;
        boss = { x: arenaX + 16 + 220, y: BASE, hp, maxHp: hp, t: 0, dir: -1, flash: 0, deadT: -1, head: { x: 0, y: 0, vx: 0, vy: 0 } };
        bgmT = 0; sfx.boss();
      }
      function updateBoss() {
        const b = boss; b.t++; if (b.flash > 0) b.flash--;
        if (b.deadT >= 0) {
          b.deadT++;
          if (b.deadT === 1) { b.head = { x: b.x, y: b.y - 40, vx: 1.5, vy: -4 }; addScore(10000 * Math.min(4, area)); pop(b.x, b.y - 60, 10000 * Math.min(4, area), '#ffd820'); }
          b.head.x += b.head.vx; b.head.vy += 0.15; b.head.y += b.head.vy;
          b.x += 2.2;
          if (b.deadT > 200) { mode = 'goal'; modeT = 0; tally = Math.floor(vit); sfx.clear(); }
          return;
        }
        const minX = arenaX + 16 + 140, maxX = arenaX + 16 + 236;
        b.x += b.dir * (0.5 + area * 0.1);
        if (b.x < minX) b.dir = 1; if (b.x > maxX) b.dir = -1;
        const rate = Math.max(50, 100 - area * 10 - loop * 10);
        if (b.t % rate === 0) {
          const n = Math.min(3, 1 + Math.floor((area - 1 + loop) / 1.5));
          for (let k = 0; k < n; k++) shots.push({ x: b.x - 12, y: b.y - 34, vx: -(1.6 + area * 0.2), vy: -1.6 + k * 1.1, t: 0 });
          audio.tone(160, 0.15, { type: 'sawtooth', vol: 0.1, slideTo: 400 });
        }
        if (mode === 'play' && overlap([p.x + 1, p.y - 16, 8, 16], [b.x - 12, b.y - 44, 24, 44])) hurt();
      }
      function updateShots() {
        const pb = [p.x + 1, p.y - 16, 8, 16];
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; s.x += s.vx; s.vy += 0.04; s.y += s.vy; s.t++;
          if (s.y > BASE + 4) s.vy = -Math.abs(s.vy) * 0.8;
          if (s.x < camX - 10 || s.t > 400) { shots.splice(i, 1); continue; }
          if (mode === 'play' && overlap(pb, [s.x - 3, s.y - 3, 6, 6])) { shots.splice(i, 1); hurt(); }
        }
      }

      // ---------- main update ----------
      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].y -= 0.4; if (--pops[i].f <= 0) pops.splice(i, 1); }
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { coinFlash = 0; startGame(); }
            else { coinFlash = 90; audio.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (mode === 'over') { if (modeT > 360 || (modeT > 90 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; modeT = 0; } return; }
        if (mode === 'ready') { if (modeT > 110) { mode = 'play'; modeT = 0; } return; }
        if (mode === 'goal') {
          p.vx = 0;
          if (modeT > 60 && tally > 0 && modeT % 6 === 0) { tally--; vit = Math.max(0, vit - 1); addScore(200); audio.tone(1500, 0.04, { vol: 0.08 }); }
          if (modeT > 120 && tally <= 0 && modeT > 260) nextRound();
          return;
        }
        if (mode === 'die') {
          p.dieT++;
          if (p.why !== 'pit') { p.vy += 0.2; p.y += p.vy; }
          if (modeT === 150) {
            if (lives > 0) { lives--; startRound(checkpoint > 0); }
            else if (api.offerContinue) api.offerContinue(() => { lives = 2; startRound(checkpoint > 0); }, () => { mode = 'over'; modeT = 0; api.setHiScore(hi); });
            else { mode = 'over'; modeT = 0; api.setHiScore(hi); }
          }
          return;
        }
        if (mode === 'play') {
          if (--bgmT <= 0) {
            if (boss) { bgmT = Math.round(audio.melody(BOSSM, { type: 'sawtooth', vol: 0.05 }) * 60) + 10; }
            else { const l = audio.melody(BGM, { type: 'square', vol: 0.045 }); audio.melody(BASS, { type: 'triangle', vol: 0.08 }); bgmT = Math.round(l * 60) + 12; }
          }
          updatePlayer(); if (mode !== 'play') return;
          updateObjs(); if (mode !== 'play') return;
          updateHatchets();
          if (boss) updateBoss();
          updateShots();
        }
      }

      // ---------- rendering ----------
      function drawSpr(ctx, s, x, y, face) { ctx.drawImage(face < 0 ? s.l : s.r, Math.round(x), Math.round(y - s.h)); }
      function drawWorld(ctx) {
        const th = theme();
        const g = ctx.createLinearGradient(0, HUDH, 0, BASE);
        g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, HUDH, W, H - HUDH);
        const ti = (area - 1) % 4;
        if (ti === 3) { ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97 - camX * 0.05) % W + (i * 97 - camX * 0.05 < 0 ? W : 0), HUDH + (i * 53) % 90, 1, 1); ctx.fillStyle = '#ffffc0'; ctx.fillRect(200, 40, 12, 12); ctx.fillRect(198, 42, 16, 8); }
        if (ti === 0 || ti === 1) { ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const cx = ((i * 140 - camX * 0.2) % 560 + 560) % 560 - 60; ctx.fillRect(cx, 44 + (i & 1) * 18, 40, 8); ctx.fillRect(cx + 8, 38 + (i & 1) * 18, 22, 6); } }
        // far hills / cave wall
        ctx.fillStyle = th.far;
        for (let x = 0; x < W; x += 4) {
          const wx = x + camX * 0.3;
          const hh = ti === 2 ? 30 + Math.sin(wx * 0.05) * 14 + Math.sin(wx * 0.13) * 6 : 40 + Math.sin(wx * 0.02) * 18 + Math.sin(wx * 0.07) * 8;
          ctx.fillRect(x, BASE - 40 - hh, 4, hh + 40);
          if (ti === 2) ctx.fillRect(x, HUDH, 4, 20 + Math.sin(wx * 0.09) * 10);
        }
        if (ti === 1) { ctx.fillStyle = '#2060e0'; ctx.fillRect(0, BASE - 46, W, 8); ctx.fillStyle = '#80b0ff'; for (let x = (-camX * 0.4 % 16 + 16) % 16 - 16; x < W; x += 16) ctx.fillRect(x, BASE - 44, 6, 1); }
        // near palms / trees
        for (let i = 0; i < 6; i++) {
          const tx = ((i * 90 - camX * 0.6) % 540 + 540) % 540 - 40;
          ctx.fillStyle = th.near;
          if (ti === 2) { ctx.fillRect(tx, HUDH, 10, 30 + (i % 3) * 8); ctx.fillRect(tx + 2, HUDH + 30 + (i % 3) * 8, 6, 6); continue; }
          ctx.fillRect(tx + 8, BASE - 70, 5, 70);
          ctx.fillRect(tx, BASE - 78, 22, 6); ctx.fillRect(tx - 6, BASE - 74, 8, 4); ctx.fillRect(tx + 18, BASE - 74, 10, 4); ctx.fillRect(tx + 4, BASE - 84, 14, 6);
        }
        // ground columns
        const c0 = Math.floor(camX / CW);
        for (let c = c0; c <= c0 + 17; c++) {
          const x = Math.round(c * CW - camX);
          const gy = c < 0 || c >= ground.length ? BASE : ground[c];
          if (gy === PIT) {
            ctx.fillStyle = th.pit; ctx.fillRect(x, BASE + 8, CW, H - BASE - 8);
            if (th.water) { ctx.fillStyle = '#60a0ff'; ctx.fillRect(x + ((api.frame >> 3) & 7), BASE + 10, 4, 1); }
            continue;
          }
          ctx.fillStyle = th.dirt; ctx.fillRect(x, gy, CW, H - gy);
          ctx.fillStyle = th.dirtD;
          for (let yy = gy + 8; yy < H; yy += 8) ctx.fillRect(x + ((yy >> 3) & 1) * 8, yy, 6, 2);
          ctx.fillStyle = th.grass; ctx.fillRect(x, gy, CW, 4);
          ctx.fillStyle = th.dirtD; ctx.fillRect(x, gy + 4, CW, 1);
          const prev = c - 1 >= 0 ? ground[c - 1] : BASE;
          if (prev !== PIT && prev > gy) { ctx.fillStyle = th.dirtD; ctx.fillRect(x, gy, 1, H - gy); }
          if (prev === PIT) { ctx.fillStyle = th.dirtD; ctx.fillRect(x, gy, 2, H - gy); }
        }
        for (const pl of plats) {
          const x = Math.round(pl.x - camX); if (x < -40 || x > W) continue;
          if (pl.cloud) { ctx.fillStyle = '#fff'; ctx.fillRect(x, pl.y, pl.w, 5); ctx.fillRect(x + 3, pl.y - 2, pl.w - 6, 2); ctx.fillStyle = '#c0d0ff'; ctx.fillRect(x + 2, pl.y + 5, pl.w - 4, 2); }
          else { ctx.fillStyle = th.grass; ctx.fillRect(x, pl.y, pl.w, 3); ctx.fillStyle = th.dirt; ctx.fillRect(x + 2, pl.y + 3, pl.w - 4, 6); ctx.fillStyle = th.dirtD; ctx.fillRect(x + pl.w / 2 - 2, pl.y + 9, 4, 3); }
        }
        // signposts
        for (const s of signs) {
          const x = Math.round(s.x - camX); if (x < -30 || x > W + 10) continue;
          ctx.fillStyle = '#704010'; ctx.fillRect(x, s.y - 26, 3, 26);
          if (s.n === 4) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 12, s.y - 38, 28, 13); text(ctx, 'GOAL', x + 2, s.y - 35, '#e02020', 1, 'center'); }
          else { ctx.fillStyle = '#ffd820'; ctx.fillRect(x - 6, s.y - 36, 15, 12); text(ctx, String(s.n), x + 2, s.y - 33, '#000', 1, 'center'); }
        }
      }
      function drawObjs(ctx) {
        for (const o of objs) {
          const x = o.x - camX;
          switch (o.kind) {
            case 'snail': drawSpr(ctx, SNAIL, x, o.y, o.vx > 0 ? -1 : 1); break;
            case 'frog': drawSpr(ctx, FROG[o.ground ? 0 : 1], x, o.y, p.x < o.x ? 1 : -1); break;
            case 'bee': drawSpr(ctx, BEE[(api.frame >> 2) & 1], x, o.y, 1); break;
            case 'bat': drawSpr(ctx, BAT[(api.frame >> 3) & 1], x, o.y, 1); break;
            case 'spider': ctx.fillStyle = '#ddd'; ctx.fillRect(Math.round(x + 4), HUDH, 1, Math.round(o.y - 7 - HUDH)); drawSpr(ctx, SPIDER, x, o.y, 1); break;
            case 'boulder': {
              const cx = x + 7, cy = o.y - 7, a = o.t * 0.25;
              ctx.fillStyle = '#909090'; ctx.fillRect(cx - 5, cy - 7, 10, 14); ctx.fillRect(cx - 7, cy - 5, 14, 10);
              ctx.fillStyle = '#505050'; ctx.fillRect(Math.round(cx + Math.cos(a) * 4 - 1), Math.round(cy + Math.sin(a) * 4 - 1), 3, 3); ctx.fillRect(Math.round(cx - Math.cos(a) * 3), Math.round(cy - Math.sin(a) * 3), 2, 2);
              ctx.fillStyle = '#c8c8c8'; ctx.fillRect(cx - 4, cy - 5, 3, 2);
              break;
            }
            case 'fire': drawSpr(ctx, FIRE[(api.frame >> 3) & 1], x, o.y, 1); break;
            case 'rock': drawSpr(ctx, ROCK, x, o.y, 1); break;
            case 'fruit': drawSpr(ctx, FRUITS[o.f].s, x, o.y + Math.round(Math.sin(api.frame * 0.08 + o.x) * 1.5), 1); break;
            case 'egg':
              if (o.state === 'egg') drawSpr(ctx, EGG, x, o.y, 1);
              else drawSpr(ctx, o.content === 'hatchet' ? HATCHET : o.content === 'skate' ? SKATE : ANGEL, x, o.y, 1);
              break;
            case 'eggplant': drawSpr(ctx, EGGPLANT, x, o.y, 1); break;
            case 'deck': drawSpr(ctx, SKATE, x, o.y, 1); break;
          }
        }
        for (const h of hatchets) {
          const a = (h.t >> 2) & 3, x = Math.round(h.x - camX), y = Math.round(h.y);
          ctx.fillStyle = '#a06020';
          if (a & 1) ctx.fillRect(x - 3, y, 7, 2); else ctx.fillRect(x, y - 3, 2, 7);
          ctx.fillStyle = '#c0c0c0';
          const hx = [0, 3, 0, -4][a], hy = [-4, 0, 3, 0][a];
          ctx.fillRect(x + hx - 1, y + hy - 1, 4, 4);
        }
        for (const s of shots) {
          const x = Math.round(s.x - camX), y = Math.round(s.y);
          ctx.fillStyle = '#ff4000'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 1, y - 1, 3, 3);
        }
      }
      function drawBoss(ctx) {
        const b = boss, x = Math.round(b.x - camX), y = b.y;
        const cols = ['#e03020', '#2060e0', '#20b040', '#c040e0'];
        const mc = cols[(area - 1) % 4];
        if (b.flash & 2) return;
        const step = ((b.t >> 4) & 1) * 2;
        // legs and body
        ctx.fillStyle = '#402010'; ctx.fillRect(x - 8, y - 12, 6, 12 - step); ctx.fillRect(x + 2, y - 12, 6, 12 - (2 - step));
        ctx.fillStyle = '#ffc088'; ctx.fillRect(x - 10, y - 30, 20, 18);
        ctx.fillStyle = '#30a030'; ctx.fillRect(x - 11, y - 16, 22, 6);
        ctx.fillStyle = '#ffc088'; ctx.fillRect(x - 16, y - 28, 6, 4); ctx.fillRect(x - 18, y - 32, 4, 6);
        ctx.fillRect(x + 10, y - 28, 6, 4);
        if (b.deadT < 0) {
          // the mask
          ctx.fillStyle = mc; ctx.fillRect(x - 12, y - 48, 24, 20); ctx.fillRect(x - 14, y - 44, 28, 12);
          ctx.fillStyle = '#ffd820'; ctx.fillRect(x - 12, y - 52, 4, 6); ctx.fillRect(x - 2, y - 54, 4, 8); ctx.fillRect(x + 8, y - 52, 4, 6);
          ctx.fillStyle = '#fff'; ctx.fillRect(x - 8, y - 42, 6, 5); ctx.fillRect(x + 2, y - 42, 6, 5);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 7, y - 40, 3, 3); ctx.fillRect(x + 3, y - 40, 3, 3); ctx.fillRect(x - 6, y - 34, 12, 3);
        } else {
          ctx.fillStyle = '#ffc088'; ctx.fillRect(x - 5, y - 38, 10, 8); ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 36, 2, 2); ctx.fillRect(x + 1, y - 36, 2, 2);
          const hx = Math.round(b.head.x - camX), hy = Math.round(b.head.y);
          ctx.fillStyle = mc; ctx.fillRect(hx - 12, hy - 10, 24, 20);
          ctx.fillStyle = '#fff'; ctx.fillRect(hx - 8, hy - 4, 6, 5); ctx.fillRect(hx + 2, hy - 4, 6, 5);
        }
      }
      function drawPlayer(ctx) {
        const x = Math.round(p.x - camX) - 1;
        if (mode === 'die') {
          const fr = TOM[2];
          drawSpr(ctx, fr, x, p.y, (p.dieT >> 3) & 1 ? 1 : -1);
          if (p.dieT > 30 && p.why !== 'pit') { ctx.fillStyle = '#ffd820'; ctx.fillRect(x + 1, Math.round(p.y) - 22 - (p.dieT - 30) * 0.5, 10, 2); }
          return;
        }
        if (p.inv > 0 && (p.inv & 4) && !p.skate) return;
        const fr = !p.ground ? 2 : p.skate ? 0 : Math.abs(p.vx) > 0.2 ? (Math.floor(p.anim) & 1) : 0;
        let yy = p.y;
        if (p.skate) { drawSpr(ctx, SKATE, x, p.y, 1); yy -= 3; }
        if (p.trip > 0 && (p.trip & 8)) yy += 2;
        drawSpr(ctx, TOM[fr], x, yy, p.face);
        if (p.angel > 0 && (p.angel > 120 || (p.angel & 4))) {
          ctx.fillStyle = '#ffd820'; ctx.fillRect(x + 2, Math.round(yy) - 21, 8, 1);
          ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x - 4, Math.round(yy) - 14, 4, 6); ctx.fillRect(x + 12, Math.round(yy) - 14, 4, 6);
        }
        if (p.throwT > 0) { ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x + (p.face > 0 ? 10 : -2), Math.round(yy) - 18, 4, 3); }
        if (curse > 0) drawSpr(ctx, EGGPLANT, x + 2, yy - 18 - Math.abs(Math.sin(api.frame * 0.1)) * 3, 1);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUDH);
        text(ctx, 'SCORE', 4, 2, '#ff4040'); text(ctx, String(score), 40, 2, '#fff');
        text(ctx, 'TOP', 112, 2, '#ff4040'); text(ctx, String(hi), 134, 2, '#fff');
        text(ctx, 'AREA ' + area + '-' + rnd, W - 4, 2, '#ffd820', 1, 'right');
        text(ctx, 'VITALITY', 4, 13, '#7ff');
        for (let i = 0; i < 16; i++) {
          const on = i < Math.ceil(vit);
          const c = !on ? '#303030' : i < 4 ? '#ff3020' : i < 8 ? '#ffd820' : '#30e040';
          ctx.fillStyle = c; ctx.fillRect(56 + i * 6, 13, 4, 7);
        }
        if (curse > 0 && (api.frame & 8)) { ctx.fillStyle = '#c060ff'; ctx.fillRect(54, 12, 98, 1); ctx.fillRect(54, 21, 98, 1); }
        for (let i = 0; i < Math.min(4, lives); i++) ctx.drawImage(TOM[0].r, 0, 0, 12, 8, 156 + i * 12, 13, 12, 8);
        if (p && p.axe) drawSpr(ctx, HATCHET, 210, 21, 1);
        if (p && p.skate) drawSpr(ctx, SKATE, 222, 20, 1);
      }
      function renderTitle(ctx) {
        ctx.fillStyle = '#106020'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#58b8ff'; ctx.fillRect(0, 0, W, 120);
        ctx.fillStyle = '#2a8a40'; for (let x = 0; x < W; x += 4) { const hh = 20 + Math.sin(x * 0.03) * 10; ctx.fillRect(x, 120 - hh, 4, hh); }
        const GR = ['#fff8a0', '#ffe838', '#ffd020', '#ffb018', '#ff8c10', '#f06008', '#d84000'];
        textS(ctx, 'WONDER', W / 2, 26, GR, 4, 'center');
        textS(ctx, 'BOY', W / 2, 62, GR, 4, 'center');
        // Tom-Tom running across with a hatchet
        const tx = (modeT * 1.4) % (W + 60) - 30;
        drawSpr(ctx, TOM[(modeT >> 3) & 1], tx, 150, 1);
        drawSpr(ctx, SNAIL, (tx + 100) % (W + 60) - 30, 150, 1);
        ctx.fillStyle = '#40d040'; ctx.fillRect(0, 150, W, 4); ctx.fillStyle = '#a06020'; ctx.fillRect(0, 154, W, 70);
        const page = (modeT >> 8) & 1;
        if (page === 0) {
          text(ctx, 'RESCUE TANYA FROM THE KING!', W / 2, 100, '#fff', 1, 'center');
          text(ctx, 'EAT FRUIT TO KEEP YOUR VITALITY', W / 2, 160, '#fff', 1, 'center');
        } else {
          drawSpr(ctx, FRUITS[0].s, 40, 168, 1); drawSpr(ctx, FRUITS[2].s, 52, 168, 1); drawSpr(ctx, FRUITS[4].s, 64, 168, 1);
          text(ctx, 'FRUIT 50-500', 80, 161, '#fff');
          drawSpr(ctx, EGG, 40, 100, 1); text(ctx, 'EGGS HIDE HATCHETS', 56, 93, '#fff');
        }
        text(ctx, 'TOP ' + hi, W / 2, 176, '#ffd820', 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 190, '#ff5040', 1, 'center'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) textS(ctx, 'INSERT COIN', W / 2, 190, '#fff', 1, 'center'); }
        else textS(ctx, 'PUSH START BUTTON', W / 2, 190, (api.frame >> 5) & 1 ? '#fff' : '#ffd820', 1, 'center');
        text(ctx, '\u00a9 1986 SEGA / ESCAPE', W / 2, 204, '#fff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#ddd');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        drawWorld(ctx);
        drawObjs(ctx);
        if (boss) drawBoss(ctx);
        drawPlayer(ctx);
        for (const q of pops) textS(ctx, q.t, Math.round(q.x - camX), Math.round(q.y), q.col, 1, 'center');
        drawHUD(ctx);
        if (boss && boss.deadT < 0) { ctx.fillStyle = '#000'; ctx.fillRect(W - 70, HUDH + 2, 66, 6); ctx.fillStyle = '#ff3020'; ctx.fillRect(W - 69, HUDH + 3, Math.round(64 * boss.hp / boss.maxHp), 4); }
        if (mode === 'ready') {
          textS(ctx, 'AREA ' + area + '-' + rnd, W / 2, 80, '#ffd820', 2, 'center');
          text(ctx, theme().name, W / 2, 100, '#fff', 1, 'center');
          if (modeT & 16) textS(ctx, 'READY', W / 2, 114, '#fff', 1, 'center');
        }
        if (mode === 'goal') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 70, 176, 50);
          textS(ctx, bossRound ? 'AREA CLEAR!' : 'ROUND CLEAR!', W / 2, 78, '#ffd820', 2, 'center');
          text(ctx, 'VITALITY BONUS ' + (tally * 200), W / 2, 102, '#fff', 1, 'center');
        }
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(48, 84, 160, 44);
          textS(ctx, 'GAME OVER', W / 2, 92, '#ff4040', 2, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 114, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { api.setHiScore(hi); } };
    }
  });
})();
