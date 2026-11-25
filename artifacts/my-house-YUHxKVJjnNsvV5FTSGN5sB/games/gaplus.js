// Gaplus (Namco, 1984) - from-scratch recreation for the MAME32 Game Room.
// Galaga's sequel: the fighter roams the lower part of the screen, enemies swirl in and hold a
// breathing, swaying formation, the spy saucer drops the Phalanx tractor beam (capture enemies to fly
// and fire beside you) or twin shot, Queen Gaplus guards every 5th stage, bonus stages every 4th.
(function () {
  'use strict';
  // ---------- 5x7 bitmap font ----------
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
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 31, 10, 0], '^': [4, 14, 31, 4, 4, 4, 4]
  };
  // text(ctx, str, x, y, colour, scale, align('left'|'center'|'right'))
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
  // outlined text (shadow on all sides) for readability over busy backgrounds
  function otext(ctx, s, x, y, col, sc, align, sh) {
    sc = sc || 1; sh = sh || '#000';
    text(ctx, s, x + sc, y + sc, sh, sc, align); text(ctx, s, x - 1, y, sh, sc, align);
    text(ctx, s, x + 1, y, sh, sc, align); text(ctx, s, x, y - 1, sh, sc, align);
    text(ctx, s, x, y, col, sc, align);
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // sprite from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = mkCanvas(w, rows.length), x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  // mirror a half-sprite (left half incl. centre column) into a full symmetric one
  function mir(rows) { return rows.map(r => r + r.slice(0, r.length - 1).split('').reverse().join('')); }
  function flipV(rows) { return rows.slice().reverse(); }
  function hash(n) { n = n | 0; n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function flipH(rows) { const w = Math.max.apply(null, rows.map(r => r.length)); return rows.map(r => r.padEnd(w, '.').split('').reverse().join('')); }
  function credStr(api) { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
  function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill(); }
  const W = 224, H = 288, PYMIN = 176, PYMAX = 262;
  const SHIP_ROWS = [
    '.......w.......',
    '.......w.......',
    '......wrw......',
    '......www......',
    '...r..wbw..r...',
    '...w.wwbww.w...',
    '...wwwwbwwww...',
    'r..wwwbbbwww..r',
    'w.wwwbbwbbwww.w',
    'wwwwwbwwwbwwwww',
    'www.wwwwwww.www',
    'ww..rww.wwr..ww',
    'w....r...r....w'
  ];
  const SHIP = spr(SHIP_ROWS, { w: '#e8e8f0', r: '#ff2020', b: '#3050ff' });
  // enemies face down (towards the player)
  const E_ROWS = {
    zako: [[
      '...y.....y...',
      '....y...y....',
      '..bbbbbbbbb..',
      '.bbyybbbyybb.',
      'b.bbbrrrbbb.b',
      'b..bbrrrbb..b',
      'b...bbbbb...b',
      '.....bbb.....',
      '......b......'
    ], [
      '...y.....y...',
      '....y...y....',
      '..bbbbbbbbb..',
      'bbbyybbbyybbb',
      '..bbbrrrbbb..',
      '...bbrrrbb...',
      '..b.bbbbb.b..',
      '.b...bbb...b.',
      '......b......'
    ]],
    goei: [[
      '..w.......w..',
      '...w.....w...',
      'rr..rrrrr..rr',
      'rrrrrwwwrrrrr',
      'rrr.rrwrr.rrr',
      'rr..rwwwr..rr',
      '.....rrr.....',
      '......r......'
    ], [
      '..w.......w..',
      '...w.....w...',
      '....rrrrr....',
      'rrrrrwwwrrrrr',
      '.rrrrrwrrrrr.',
      '..r.rwwwr.r..',
      '.....rrr.....',
      '......r......'
    ]],
    boss: [[
      '...g.....g...',
      '....g...g....',
      '..ggggggggg..',
      '.gyygggggyyg.',
      'gggggpppggggg',
      'g.gggpppggg.g',
      'g..ggggggg..g',
      'g...ggggg...g',
      '....g...g....'
    ], [
      '...g.....g...',
      '....g...g....',
      '..ggggggggg..',
      'ggyygggggyygg',
      '.ggggpppgggg.',
      '..gggpppggg..',
      '.g.ggggggg.g.',
      'g...ggggg...g',
      '....g...g....'
    ]]
  };
  const EPAL = {
    zako: { y: '#ffe040', b: '#4060ff', r: '#ff3030' },
    goei: { w: '#ffffff', r: '#e02030' },
    boss: { g: '#30d050', y: '#ffff60', p: '#ff40ff' },
    boss2: { g: '#4070ff', y: '#ffff60', p: '#ff40ff' }
  };
  const SP = {};
  for (const k of ['zako', 'goei', 'boss']) {
    SP[k] = E_ROWS[k].map(r => spr(r, EPAL[k]));
    SP[k + 'U'] = E_ROWS[k].map(r => spr(flipV(r), EPAL[k]));
  }
  SP.boss2 = E_ROWS.boss.map(r => spr(r, EPAL.boss2));
  SP.boss2U = E_ROWS.boss.map(r => spr(flipV(r), EPAL.boss2));
  const QUEEN = spr([
    '.....p.........p.....',
    '......p.......p......',
    '...pppppppppppppp....',
    '..ppyyppppppppyypp...',
    '.pppyypppwwwppyyppp..',
    'pppppppwwrrrwwppppppp',
    'pp.ppppwrrrrrwpppp.pp',
    'pp..pppwwrrrwwppp..pp',
    'p....pppwwwwwppp....p',
    'p.....ppppppppp.....p',
    '.......ppp.ppp.......',
    '......pp.....pp......'
  ], { p: '#c040ff', y: '#ffff40', w: '#ffffff', r: '#ff2040' });
  const SPY = spr([
    '....wwwww....',
    '..wwcccccww..',
    '.wwwwwwwwwww.',
    'woowoowoowoow',
    '.wwwwwwwwwww.',
    '...w..w..w...'
  ], { w: '#d0d0e0', c: '#40e0ff', o: '#ff8020' });

  ArcadeRegistry.register({
    id: 'gaplus', title: 'Gaplus', year: 1984, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move (up/down too) \u00b7 Space: fire \u00b7 X: Phalanx tractor beam \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#ff40c0', accent: '#40e0ff' },
    create(api) {
      const au = api.audio, R = Math.random;
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null;
      const STARC = ['#ff4040', '#ffff40', '#40ff40', '#40ffff', '#4040ff', '#ff40ff', '#ffffff', '#ff9040'];
      const stars = [];
      for (let i = 0; i < 80; i++) stars.push({ x: R() * W, y: R() * H, c: STARC[i % 8], sp: i & 1 ? 0.6 : 1.2, ph: (R() * 64) | 0 });
      const SFX = {
        shot() { au.tone(1600, 0.05, { type: 'square', vol: 0.05, slideTo: 600 }); },
        hit() { au.noise(0.12, { vol: 0.12, freq: 3000, slideTo: 300 }); au.tone(500, 0.08, { type: 'square', vol: 0.05, slideTo: 150 }); },
        bossHit() { au.tone(900, 0.06, { type: 'square', vol: 0.08, slideTo: 1400 }); },
        dive() { au.tone(1200, 0.4, { type: 'sine', vol: 0.05, slideTo: 300 }); },
        die() { au.noise(1.1, { vol: 0.25, freq: 2800, slideTo: 70 }); au.tone(700, 1, { type: 'sawtooth', vol: 0.08, slideTo: 40 }); },
        beam() { for (let i = 0; i < 6; i++) au.tone(300 + i * 80, 0.18, { type: 'triangle', vol: 0.07, delay: i * 0.12, slideTo: 900 }); },
        capture() { au.melody([[880, 0.05], [1320, 0.05], [1760, 0.08]], { type: 'square', vol: 0.09 }); },
        item() { au.melody([[1047, 0.06], [1319, 0.06], [1568, 0.06], [2093, 0.12]], { type: 'square', vol: 0.1 }); },
        spy() { au.tone(1500, 0.12, { type: 'sine', vol: 0.04, slideTo: 1800 }); },
        extend() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.12 }); },
        start() { au.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.12], [988, 0.12], [784, 0.12], [880, 0.12], [1047, 0.35]], { type: 'square', vol: 0.1 }); },
        stage() { au.melody([[784, 0.08], [988, 0.08], [1175, 0.16]], { type: 'square', vol: 0.08 }); },
        buzz() { au.tone(98, 0.28, { type: 'square', vol: 0.14 }); },
        coin() { au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 }); }
      };
      function tryStart() { if (api.useCredit()) return true; coinFlash = 90; SFX.buzz(); return false; }

      // ---------- formation ----------
      // 40 slots: row0 4 bosses, rows 1-2 goei, rows 3-4 zako
      const SLOTS = [];
      for (let c = 3; c <= 6; c++) SLOTS.push({ row: 0, col: c, type: 'boss' });
      for (let r = 1; r <= 2; r++) for (let c = 1; c <= 8; c++) SLOTS.push({ row: r, col: c, type: 'goei' });
      for (let r = 3; r <= 4; r++) for (let c = 0; c <= 9; c++) SLOTS.push({ row: r, col: c, type: 'zako' });
      function slotXY(row, col) {
        const sp = 16 + g.breath;
        return { x: W / 2 + g.sway + (col - 4.5) * sp, y: 44 + row * (14 + g.breath * 0.5) };
      }
      // entrance path templates (left side; mirrored for right)
      const PATHS = [
        [[W / 2 - 10, -16], [W / 2 - 10, 140], [10, 210], [50, 120]],
        [[-16, 230], [120, 210], [130, 90], [60, 70]],
        [[-16, 40], [150, 40], [190, 180], [100, 150]],
        [[W / 2 - 30, -16], [-40, 120], [180, 220], [140, 110]]
      ];
      const BPATHS = [
        [[-16, 60], [140, 20], [200, 280], [W + 20, 160]],
        [[W / 2 - 6, -16], [W / 2 - 6, 200], [-60, 160], [-20, -20]],
        [[-16, 250], [80, 100], [180, 40], [W + 20, 60]],
        [[30, -16], [260, 120], [-40, 220], [W + 20, 200]],
        [[-16, 140], [80, 60], [140, 260], [W + 20, 120]]
      ];
      function bez(P, t, mir) {
        const u = 1 - t;
        let x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
        const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
        if (mir) x = W - x;
        return { x, y };
      }

      function newGame() {
        g = {
          score: 0, lives: 2, stage: 0, nextExtra: 20000,
          p: { x: W / 2, y: PYMAX - 8, alive: true, t: 0, inv: 0, twin: false, beamReady: false },
          en: [], pb: [], eb: [], booms: [], pops: [], items: [], allies: [],
          beam: null, sway: 0, breath: 0, swayDir: 1, phase: 'intro', phaseT: 200, first: true,
          diveT: 200, spyT: 900, spy: null, waves: [], waveIdx: 0, waveT: 0, bonus: false, bHits: 0, bTotal: 0, shots: 0, hits: 0
        };
        nextStage();
      }
      function isBonus(n) { return n % 4 === 3; }
      function isQueen(n) { return n % 5 === 0; }
      function nextStage() {
        g.stage++;
        g.bonus = isBonus(g.stage);
        g.en = []; g.eb = []; g.items = [];
        g.phase = 'intro'; g.phaseT = g.first ? 200 : 110;
        g.waveIdx = 0; g.waveT = 0; g.diveT = 240; g.bHits = 0; g.bTotal = 0;
        g.beam = null;
        g.waves = buildWaves();
        if (!g.first) SFX.stage();
      }
      function buildWaves() {
        const waves = [];
        if (g.bonus) {
          const kinds = ['zako', 'goei', 'boss', 'zako', 'goei'];
          for (let w = 0; w < 5; w++) {
            const list = [];
            for (let i = 0; i < 8; i++) list.push({ type: kinds[w], path: BPATHS[(w + g.stage) % BPATHS.length], mir: (i & 1) === 1, delay: (i >> 1) * 10 });
            waves.push(list);
          }
          return waves;
        }
        const order = [
          [[5, 6, 7, 8, 25, 26, 27, 28], 0],
          [[0, 1, 2, 3, 4, 9, 10, 11], 1],
          [[12, 13, 14, 15, 16, 17, 18, 19], 1],
          [[20, 21, 22, 23, 24, 29, 30, 31], 2],
          [[32, 33, 34, 35, 36, 37, 38, 39], 3]
        ];
        for (const [ids, pi] of order) {
          const list = [];
          ids.forEach((id, i) => list.push({ slot: SLOTS[id], path: PATHS[(pi + g.stage) % PATHS.length], mir: pi === 0 ? (i & 1) === 1 : (i < 4) === (g.stage & 1) > 0, delay: pi === 0 ? (i >> 1) * 9 : (i % 4) * 9 + (i >= 4 ? 4 : 0) }));
          waves.push(list);
        }
        return waves;
      }
      function spawnWave(list) {
        for (const s of list) {
          const type = g.bonus ? s.type : s.slot.type;
          const e = { type, row: g.bonus ? -1 : s.slot.row, col: g.bonus ? -1 : s.slot.col, state: 'path', path: s.path, mir: s.mir, t: 0, delay: s.delay, hp: type === 'boss' ? 2 : 1, x: -50, y: -50, vx: 0, vy: 1, ang: 0, shotT: 30 + (R() * 80 | 0), dead: false };
          g.en.push(e);
        }
      }
      function spawnQueen() {
        g.en.push({ type: 'queen', row: -1, col: -1, state: 'queen', t: 0, delay: 0, hp: 10 + Math.min(10, g.stage), x: W / 2, y: -20, vx: 0.6, vy: 0, ang: 0, shotT: 120, dead: false });
      }
      function dif() { return Math.min(14, g.stage - 1); }
      function bspd() { return 2.3 + dif() * 0.1; }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 20000 ? 50000 : 70000; SFX.extend(); }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, big) { g.booms.push({ x, y, t: 0, big: !!big }); }
      function pop(x, y, s, c) { g.pops.push({ x, y, s: String(s), c: c || '#40e0ff', t: 60 }); }
      function eShoot(e, spread) {
        if (!g.p.alive || g.bonus) return;
        const a = Math.atan2(g.p.y - e.y, g.p.x - e.x), s = bspd();
        const n = spread || 1;
        for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * 0.22; g.eb.push({ x: e.x, y: e.y + 4, vx: Math.cos(aa) * s, vy: Math.max(1.2, Math.sin(aa) * s) }); }
      }
      function scoreOf(e) {
        const diving = e.state !== 'form';
        if (e.type === 'zako') return diving ? 100 : 50;
        if (e.type === 'goei') return diving ? 160 : 80;
        if (e.type === 'boss') return diving ? 400 : 150;
        return 0;
      }
      function killEnemy(e, byBeam) {
        if (e.dead) return;
        if (e.type === 'queen') {
          e.dead = true; boom(e.x, e.y, true); SFX.die();
          addScore(10000); pop(e.x, e.y, 10000, '#ffff40');
          for (const o of g.en) if (!o.dead && o !== e) { o.dead = true; boom(o.x, o.y); addScore(scoreOf(o)); }
          return;
        }
        e.dead = true; g.hits++;
        let pts = scoreOf(e);
        if (g.bonus) { g.bHits++; pts = byBeam ? 200 : 100; }
        addScore(pts);
        if (pts >= 160) pop(e.x, e.y, pts);
        boom(e.x, e.y); SFX.hit();
      }
      function hitEnemy(e) {
        if (e.type === 'boss' && e.hp > 1) { e.hp--; SFX.bossHit(); return; }
        if (e.type === 'queen') { e.hp--; e.flash = 4; SFX.bossHit(); if (e.hp <= 0) killEnemy(e); return; }
        killEnemy(e);
      }
      function startDive(e, lead) {
        e.state = 'dive'; e.t = 0; e.ang = -Math.PI / 2; e.turn = (e.x < W / 2 ? -1 : 1) * 0.07; e.spd = 1.9 + dif() * 0.06;
        e.shotT = 30 + (R() * 50 | 0); e.lead = lead || null;
        if (!lead) SFX.dive();
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 400; g.p.alive = false;
        au.melody([[523, 0.2], [494, 0.2], [440, 0.2], [392, 0.2], [349, 0.4], [330, 0.6]], { type: 'square', vol: 0.07 });
      }
      function lastLife() {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 2; g.score = 0; g.nextExtra = 20000; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function respawn() { const p = g.p; p.alive = true; p.x = W / 2; p.y = PYMAX - 8; p.inv = 120; p.t = 0; p.twin = false; }
      function killPlayer() {
        const p = g.p;
        if (!p.alive || p.inv > 0) return;
        p.alive = false; p.t = 0; boom(p.x, p.y, true); SFX.die();
        for (const a of g.allies) boom(p.x + a.ox, p.y + a.oy);
        g.allies = []; g.beam = null; p.beamReady = false;
      }
      const ALLYPOS = [[-15, 2], [15, 2], [-30, 4], [30, 4], [-8, -14], [8, -14]];

      function updPlayer() {
        const p = g.p;
        if (!p.alive) {
          if (g.phase === 'over') return;
          if (++p.t === 130) { if (g.lives > 0) { g.lives--; respawn(); } else lastLife(); }
          return;
        }
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        p.x = clamp(p.x + dx * 1.9, 9, W - 9); p.y = clamp(p.y + dy * 1.5, PYMIN, PYMAX);
        if (p.inv > 0) p.inv--;
        if (api.pressed('Space') && g.phase !== 'clear' && g.phase !== 'results') {
          const max = p.twin ? 6 : 3;
          if (g.pb.length < max) {
            const xs = p.twin ? [-4, 4] : [0];
            for (const o of xs) g.pb.push({ x: p.x + o, y: p.y - 8 });
            for (const a of g.allies) if (g.pb.length < max + 6) g.pb.push({ x: p.x + a.ox, y: p.y + a.oy - 6, ally: true });
            g.shots++; SFX.shot();
          }
        }
        if (api.pressed('KeyX') && !g.beam && (p.beamReady || g.bonus)) {
          g.beam = { t: 0, len: 150 }; if (!g.bonus) p.beamReady = false; SFX.beam();
        }
        for (const it of g.items) {
          if (it.got || Math.abs(it.x - p.x) > 10 || Math.abs(it.y - p.y) > 10) continue;
          it.got = true; SFX.item(); addScore(1000);
          if (it.k === 'beam') { p.beamReady = true; pop(it.x, it.y, 'PHALANX BEAM', '#ff80ff'); }
          else { p.twin = true; pop(it.x, it.y, 'TWIN SHOT', '#80ff80'); }
        }
        // collisions
        for (const b of g.eb) {
          if (Math.abs(b.x - p.x) < 5 && Math.abs(b.y - p.y) < 6) { b.gone = true; killPlayer(); break; }
          for (let i = 0; i < g.allies.length; i++) {
            const a = g.allies[i];
            if (Math.abs(b.x - (p.x + a.ox)) < 5 && Math.abs(b.y - (p.y + a.oy)) < 5) { b.gone = true; boom(p.x + a.ox, p.y + a.oy); g.allies.splice(i, 1); SFX.hit(); break; }
          }
        }
        if (p.alive) for (const e of g.en) {
          if (e.dead || e.delay > 0 || e.state === 'captured') continue;
          if (Math.abs(e.x - p.x) < (e.type === 'queen' ? 16 : 10) && Math.abs(e.y - p.y) < 10) { if (e.type !== 'queen') killEnemy(e); killPlayer(); break; }
        }
      }
      function updBeam() {
        const b = g.beam, p = g.p;
        if (!b) return;
        b.t++;
        if (!p.alive || b.t > b.len) { g.beam = null; return; }
        for (const e of g.en) {
          if (e.dead || e.delay > 0 || e.type === 'queen' || e.state === 'captured' || e.y > p.y - 8 || e.y < 0) continue;
          const half = 6 + (p.y - e.y) * 0.22;
          if (Math.abs(e.x - p.x) < half) {
            if (g.bonus) { killEnemy(e, true); SFX.capture(); continue; }
            if (g.allies.length + g.en.filter(o => o.state === 'captured').length < 6) { e.state = 'captured'; e.t = 0; SFX.capture(); }
          }
        }
      }
      function updShots() {
        for (const s of g.pb) {
          s.y -= 7;
          if (s.y < -8) { s.gone = true; continue; }
          for (const e of g.en) {
            if (e.dead || e.delay > 0 || e.state === 'captured') continue;
            const rx = e.type === 'queen' ? 11 : 7;
            if (Math.abs(e.x - s.x) < rx && Math.abs(e.y - s.y) < 7) { s.gone = true; hitEnemy(e); break; }
          }
          if (!s.gone && g.spy && Math.abs(g.spy.x - s.x) < 8 && Math.abs(g.spy.y - s.y) < 5) {
            s.gone = true; boom(g.spy.x, g.spy.y); addScore(1500); pop(g.spy.x, g.spy.y, 1500, '#ffff40');
            g.items.push({ k: g.spy.k, x: g.spy.x, y: g.spy.y, t: 0 }); g.spy = null; SFX.hit();
          }
        }
        g.pb = g.pb.filter(s => !s.gone);
      }
      function homeTo(e, tx, ty, sp) {
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d < sp) { e.x = tx; e.y = ty; return true; }
        e.vx = dx / d * sp; e.vy = dy / d * sp; e.x += e.vx; e.y += e.vy; return false;
      }
      function updEnemies() {
        const p = g.p;
        for (const e of g.en) {
          if (e.dead) continue;
          if (e.delay > 0) { e.delay--; continue; }
          e.t++; if (e.flash > 0) e.flash--;
          const ox = e.x, oy = e.y;
          switch (e.state) {
            case 'path': {
              const sp = g.bonus ? 0.0075 : 0.0085;
              const q = bez(e.path, Math.min(1, e.t * sp), e.mir);
              e.x = q.x; e.y = q.y;
              if (!g.bonus && e.t === e.shotT && R() < 0.3 + dif() * 0.04 && e.y < 160) eShoot(e);
              if (e.t * sp >= 1) { if (g.bonus) e.dead = true, e.gone = true; else e.state = 'home'; }
              break;
            }
            case 'home': case 'return': {
              const s = slotXY(e.row, e.col);
              if (homeTo(e, s.x, s.y, 2.6)) e.state = 'form';
              break;
            }
            case 'form': {
              const s = slotXY(e.row, e.col); e.x = s.x; e.y = s.y; e.vy = 1;
              break;
            }
            case 'dive': {
              if (e.lead && !e.lead.dead && e.lead.state === 'dive') { e.ang = e.lead.ang; e.spd = e.lead.spd; }
              else if (e.t < 45) e.ang += e.turn;
              else {
                const ta = Math.atan2(p.y + 30 - e.y, p.x - e.x);
                let d = ta - e.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
                if (e.y < p.y - 20) e.ang += clamp(d, -0.035, 0.035);
              }
              e.x += Math.cos(e.ang) * e.spd; e.y += Math.sin(e.ang) * e.spd;
              if (e.t === e.shotT || e.t === e.shotT + 18 && dif() > 3) eShoot(e, e.type === 'boss' && dif() > 5 ? 3 : 1);
              if (e.x < -20 || e.x > W + 20) e.ang = Math.PI - e.ang;
              if (e.y > H + 12) { const s = slotXY(e.row, e.col); e.x = s.x; e.y = -12; e.state = 'return'; }
              break;
            }
            case 'captured': {
              if (homeTo(e, p.x, p.y - 4, 2.4) || e.t > 120) {
                e.dead = true;
                if (p.alive && g.allies.length < 6) { const pos = ALLYPOS[g.allies.length]; g.allies.push({ type: e.type, ox: pos[0], oy: pos[1] }); addScore(scoreOf(e)); }
              }
              break;
            }
            case 'queen': {
              if (e.y < 26) e.y += 0.5; else { e.x += e.vx; if (e.x < 30 || e.x > W - 30) e.vx = -e.vx; }
              if (--e.shotT <= 0) { e.shotT = Math.max(60, 120 - dif() * 5); eShoot(e, 5); }
              if (e.t % 600 === 300 && g.p.alive) { e.state = 'qdive'; e.t = 0; SFX.dive(); }
              break;
            }
            case 'qdive': {
              const ty = e.t < 70 ? p.y - 30 : 26;
              homeTo(e, e.t < 70 ? p.x : e.x, ty, 2.2);
              if (e.t === 40) eShoot(e, 3);
              if (e.t > 70 && e.y <= 27) { e.state = 'queen'; e.t = 1; }
              break;
            }
          }
          if (e.state !== 'form' && e.state !== 'queen') { e.vx = e.x - ox; e.vy = e.y - oy; }
        }
        g.en = g.en.filter(e => !e.dead);
      }
      function updFormation() {
        const allForm = g.waveIdx >= g.waves.length;
        if (!allForm || g.formShift) g.sway += 0.35 * g.swayDir;
        if (g.sway > 22) g.swayDir = -1; if (g.sway < -22) g.swayDir = 1;
        g.breath = allForm ? 3 + Math.sin(frame * 0.035) * 3 : 0;
        if (allForm) g.formShift = true;
      }
      function updDives() {
        if (g.bonus || g.waveIdx < g.waves.length || !g.p.alive) return;
        const form = g.en.filter(e => e.state === 'form');
        const left = g.en.filter(e => e.type !== 'queen').length;
        if (--g.diveT > 0 || !form.length) return;
        g.diveT = Math.max(40, (left < 8 ? 50 : 140) - dif() * 7) + R() * 60;
        const e = pick(form);
        startDive(e);
        if (e.type === 'boss') {
          const esc = form.filter(o => o.type === 'goei' && o !== e && Math.abs(o.col - e.col) <= 2).slice(0, 2);
          for (const o of esc) { startDive(o, e); o.t = 0; }
        } else if (dif() > 2 && R() < 0.4) {
          const o = form.find(o2 => o2 !== e && o2.type === e.type && Math.abs(o2.col - e.col) === 1 && o2.row === e.row);
          if (o) startDive(o, e);
        }
      }
      function updSpy() {
        if (g.bonus) return;
        if (g.spy) {
          const s = g.spy; s.x += s.vx; s.t++;
          if ((s.t & 15) === 0) SFX.spy();
          if (s.x < -20 || s.x > W + 20) g.spy = null;
        } else if (--g.spyT <= 0 && g.phase === 'play') {
          g.spyT = 1100 + R() * 600;
          const left = R() < 0.5;
          g.spy = { x: left ? -14 : W + 14, y: 28 + R() * 30, vx: left ? 1.1 : -1.1, t: 0, k: g.p.beamReady || (R() < 0.35 && !g.p.twin) ? 'twin' : 'beam' };
        }
      }
      function updMisc() {
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 64 : 24));
        for (const q of g.pops) { q.t--; }
        g.pops = g.pops.filter(q => q.t > 0);
        for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
        g.eb = g.eb.filter(b => !b.gone && b.y < H + 8 && b.x > -8 && b.x < W + 8);
        for (const it of g.items) { it.t++; it.y += 0.9; }
        g.items = g.items.filter(it => !it.got && it.y < H + 10);
      }

      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        const spd = g && g.phase === 'intro' ? 2 : 1;
        for (const s of stars) { s.y += s.sp * spd; if (s.y >= H) { s.y -= H; s.x = R() * W; } }
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); SFX.start(); }
          return;
        }
        updMisc();
        if (g.phase === 'over') {
          if (--g.phaseT <= 0 || (g.phaseT < 300 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        updPlayer(); if (g.phase === 'over') return;
        updBeam(); updShots(); updEnemies(); updFormation(); updSpy();
        if (g.phase === 'intro') {
          if (--g.phaseT <= 0) { g.phase = 'play'; g.first = false; if (isQueen(g.stage) && !g.bonus) spawnQueen(); }
          return;
        }
        if (g.phase === 'play') {
          if (g.waveIdx < g.waves.length) {
            const busy = g.en.some(e => e.state === 'path' || e.delay > 0);
            if (--g.waveT <= 0 && (!busy || g.bonus)) { spawnWave(g.waves[g.waveIdx++]); g.waveT = g.bonus ? 150 : 60; g.bTotal += 8; }
          } else {
            updDives();
            if (!g.en.length && !g.beam) {
              if (g.bonus) { g.phase = 'results'; g.phaseT = 300; }
              else { g.phase = 'clear'; g.phaseT = 90; }
            }
          }
          return;
        }
        if (g.phase === 'clear' || g.phase === 'results') {
          if (g.phase === 'results' && g.phaseT === 160) {
            if (g.bHits >= g.bTotal) { addScore(10000); au.melody([[1047, 0.12], [1319, 0.12], [1568, 0.12], [2093, 0.4]], { type: 'square', vol: 0.08 }); }
            else addScore(g.bHits * 100);
          }
          if (--g.phaseT <= 0) nextStage();
        }
      }

      // ---------- rendering ----------
      function eSprite(e) {
        const fl = (frame >> 4) & 1;
        const up = e.state === 'return' || e.state === 'home' || (e.state === 'path' && e.vy < -0.3) || (e.state === 'dive' && Math.sin(e.ang) < -0.3);
        let k = e.type === 'boss' && e.hp < 2 ? 'boss2' : e.type;
        return SP[k + (up ? 'U' : '')][e.state === 'form' ? fl : (frame >> 3) & 1];
      }
      function drawStars(ctx) {
        for (const s of stars) if (((frame + s.ph) & 63) < 40) { ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
      }
      function drawHUD(ctx) {
        if ((frame >> 4) & 1 || mode === 'title') text(ctx, '1UP', 20, 2, '#ff3030');
        text(ctx, String(g ? g.score : 0).padStart(2, '0'), 64, 11, '#ffffff', 1, 'right');
        text(ctx, 'HIGH SCORE', W / 2, 2, '#ff3030', 1, 'center');
        text(ctx, String(hi), W / 2 + 24, 11, '#ffffff', 1, 'right');
        if (!g) { text(ctx, credStr(api), 4, H - 10, '#ffffff'); return; }
        for (let i = 0; i < Math.min(6, g.lives); i++) ctx.drawImage(SHIP, 2 + i * 16, H - 15);
        // stage flags
        let x = W - 4, n = g.stage;
        const flags = [];
        for (const v of [50, 20, 10, 5, 1]) while (n >= v) { flags.push(v); n -= v; }
        for (const f of flags) {
          const w = f >= 10 ? 8 : 6; x -= w + 2; if (x < 110) break;
          ctx.fillStyle = f === 50 ? '#ff40ff' : f === 20 ? '#40ffff' : f === 10 ? '#ffff40' : f === 5 ? '#ff4040' : '#ffffff';
          ctx.fillRect(x, H - 13, w, 6); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x, H - 13, 1, 11);
        }
        if (g.p.beamReady) { text(ctx, 'BEAM', W - 30, 11, (frame >> 3) & 1 ? '#ff80ff' : '#8040a0'); }
      }
      function drawTitle(ctx) {
        const ly = 52;
        otext(ctx, 'GAPLUS', W / 2 + 2, ly + 2, '#400040', 4, 'center');
        const bands = [[0, 9, '#ffc0ff'], [9, 18, '#ff40c0'], [18, 28, '#c02080']];
        for (const [a, b, col] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'GAPLUS', W / 2, ly, col, 4, 'center'); ctx.restore(); }
        const page = Math.floor(titleT / 500) % 2;
        if (page === 0) {
          text(ctx, '-- SCORE --', W / 2, 100, '#40e0ff', 1, 'center');
          const rows = [['zako', '50', '100'], ['goei', '80', '160'], ['boss', '150', '400']];
          rows.forEach((r, i) => {
            const y = 118 + i * 20;
            ctx.drawImage(SP[r[0]][(frame >> 4) & 1], 40, y - 1);
            text(ctx, r[1], 120, y, '#ffffff', 1, 'right'); text(ctx, r[2], 176, y, '#ffffff', 1, 'right');
          });
          text(ctx, 'FORMATION   ATTACK', 140, 180, '#c080ff', 1, 'center');
          ctx.drawImage(QUEEN, 34, 196); text(ctx, 'QUEEN GAPLUS', 134, 200, '#ff80ff', 1, 'center');
        } else {
          ctx.drawImage(SPY, 40, 108); text(ctx, 'SHOOT THE SPY SHIP', 136, 109, '#ffffff', 1, 'center');
          text(ctx, 'TO GET THE', W / 2, 128, '#ffffff', 1, 'center');
          text(ctx, 'PHALANX BEAM', W / 2, 142, '#ff80ff', 1, 'center');
          text(ctx, 'X: CAPTURE ENEMIES', W / 2, 160, '#40e0ff', 1, 'center');
          text(ctx, 'THEY FIGHT BY YOUR SIDE', W / 2, 172, '#40e0ff', 1, 'center');
          text(ctx, '1ST BONUS 20000 PTS', W / 2, 196, '#ffff40', 1, 'center');
          text(ctx, 'EVERY 70000 PTS', W / 2, 208, '#ffff40', 1, 'center');
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 234, '#ff3030', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 234, '#40e0ff', 1, 'center');
        text(ctx, '\u00a9 1984 NAMCO LTD.', W / 2, 254, '#ffffff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawStars(ctx);
        if (mode === 'title' || !g) { drawTitle(ctx); drawHUD(ctx); return; }
        const p = g.p;
        // tractor beam
        if (g.beam && p.alive) {
          const b = g.beam;
          for (let y = p.y - 10; y > 0; y -= 4) {
            const half = 6 + (p.y - y) * 0.22, k = ((y + b.t * 3) >> 2) & 3;
            ctx.fillStyle = ['#ff40ff', '#c040ff', '#4080ff', '#40ffff'][k];
            ctx.globalAlpha = 0.35 + 0.15 * Math.sin(b.t * 0.3);
            ctx.fillRect(Math.round(p.x - half), y, Math.round(half * 2), 2);
          }
          ctx.globalAlpha = 1;
        }
        for (const e of g.en) {
          if (e.delay > 0) continue;
          if (e.type === 'queen') {
            ctx.drawImage(QUEEN, Math.round(e.x - 10), Math.round(e.y - 6));
            if (e.flash > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(e.x - 4), Math.round(e.y - 2), 8, 5); }
            continue;
          }
          const im = eSprite(e);
          if (e.state === 'captured' && (frame & 2)) continue;
          ctx.drawImage(im, Math.round(e.x - 6), Math.round(e.y - 4));
        }
        if (g.spy) ctx.drawImage(SPY, Math.round(g.spy.x - 6), Math.round(g.spy.y - 3));
        for (const it of g.items) {
          const x = Math.round(it.x), y = Math.round(it.y);
          ctx.fillStyle = it.k === 'beam' ? '#ff40ff' : '#40ff40'; ctx.fillRect(x - 5, y - 5, 10, 10);
          ctx.fillStyle = (frame >> 2) & 1 ? '#ffffff' : '#000000'; ctx.fillRect(x - 3, y - 3, 6, 6);
          text(ctx, it.k === 'beam' ? 'P' : 'T', x - 2, y - 3, it.k === 'beam' ? '#ff40ff' : '#40ff40');
        }
        if (p.alive && !(p.inv > 0 && (frame & 4))) {
          ctx.drawImage(SHIP, Math.round(p.x - 7), Math.round(p.y - 6));
          for (const a of g.allies) ctx.drawImage(SP[a.type + 'U'][(frame >> 3) & 1], Math.round(p.x + a.ox - 6), Math.round(p.y + a.oy - 4));
        }
        if (g.phase === 'intro' && g.first && g.phaseT < 100) ctx.drawImage(SHIP, Math.round(p.x - 7), Math.round(p.y - 6));
        for (const s of g.pb) { ctx.fillStyle = s.ally ? '#ffff60' : '#ffffff'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 6); ctx.fillStyle = '#ff4040'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 2); }
        for (const b of g.eb) { ctx.fillStyle = '#ff2020'; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 2), 2, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x), Math.round(b.y - 2), 1, 2); }
        for (const b of g.booms) {
          const k = b.t / (b.big ? 64 : 24), r = (b.big ? 18 : 9) * Math.min(1, k * 2.2);
          const cols = ['#ffffff', '#ffff40', '#ff8020', '#ff2020', '#802080'];
          const ci = Math.min(4, Math.floor(k * 5));
          ctx.fillStyle = cols[ci];
          for (let i = 0; i < 10; i++) { const a = i * 0.628 + b.t * 0.02; const rr = r * (i & 1 ? 0.6 : 1); ctx.fillRect(Math.round(b.x + Math.cos(a) * rr) - 1, Math.round(b.y + Math.sin(a) * rr) - 1, b.big ? 3 : 2, b.big ? 3 : 2); }
          if (k < 0.3) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 2, 4, 4); }
        }
        for (const q of g.pops) text(ctx, q.s, q.x, q.y - 3, q.c, 1, 'center');
        if (g.phase === 'intro') {
          if (g.first && g.phaseT > 100) text(ctx, 'PLAYER 1', W / 2, 140, '#40e0ff', 1, 'center');
          else text(ctx, g.bonus ? 'BONUS STAGE' : 'STAGE ' + g.stage, W / 2, 140, '#40e0ff', 1, 'center');
          if (isQueen(g.stage) && !g.bonus && g.phaseT < 100) text(ctx, 'QUEEN GAPLUS APPEARS', W / 2, 154, '#ff80ff', 1, 'center');
          if (g.first && g.phaseT <= 100) text(ctx, 'READY', W / 2, 154, '#ff3030', 1, 'center');
        }
        if (!p.alive && g.phase !== 'over' && p.t > 60) text(ctx, 'READY', W / 2, 150, '#ff3030', 1, 'center');
        if (g.phase === 'results') {
          const t = 300 - g.phaseT;
          if (t > 30) { text(ctx, 'NUMBER OF HITS', 24, 130, '#40e0ff'); text(ctx, String(g.bHits), 200, 130, '#40e0ff', 1, 'right'); }
          if (t > 140) {
            if (g.bHits >= g.bTotal) { text(ctx, 'PERFECT !', W / 2, 150, '#ff3030', 1, 'center'); text(ctx, 'SPECIAL BONUS 10000 PTS', W / 2, 166, '#ffff40', 1, 'center'); }
            else { text(ctx, 'BONUS', 24, 150, '#ffff40'); text(ctx, String(g.bHits * 100), 200, 150, '#ffff40', 1, 'right'); }
          }
        }
        if (g.phase === 'over') {
          const t = 400 - g.phaseT;
          if (t < 160) text(ctx, 'GAME OVER', W / 2, 140, '#40e0ff', 1, 'center');
          else {
            text(ctx, '- RESULTS -', W / 2, 110, '#ff3030', 1, 'center');
            text(ctx, 'SHOTS FIRED', 24, 132, '#ffff40'); text(ctx, String(g.shots), 204, 132, '#ffff40', 1, 'right');
            text(ctx, 'NUMBER OF HITS', 24, 150, '#ffff40'); text(ctx, String(g.hits), 204, 150, '#ffff40', 1, 'right');
            text(ctx, 'HIT-MISS RATIO', 24, 168, '#ffffff'); text(ctx, (g.shots ? (g.hits / g.shots * 100).toFixed(1) : '0.0') + ' %', 204, 168, '#ffffff', 1, 'right');
          }
        }
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ god() { if (g && g.p.alive) g.p.inv = 5; }, sum: () => g && { ph: g.phase, st: g.stage, sc: g.score, lv: g.lives, en: g.en.length, wave: g.waveIdx, al: g.allies.length, beam: g.p.beamReady, twin: g.p.twin, form: g.en.filter(e => e.state === 'form').length } });
      return { update, render, destroy() { } };
    }
  });
})();
