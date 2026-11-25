// Final Fight (Capcom, 1989) -- from-scratch tribute.
// Haggar / Cody / Guy vs the Mad Gear gang: combos, grabs & throws, jump attacks, desperation attack,
// pipe / knife / sword, food from barrels, six areas each with a boss.
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
  function textS(ctx, s, x, y, col, sc, align, sh) { text(ctx, s, x + sc, y + sc, sh || '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  const pad = (n, l) => String(n).padStart(l, '0');
  const rnd = n => (Math.random() * n) | 0;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const W = 384, H = 224, Y0 = 152, Y1 = 216, MAXHP = 100;

  // ---------- characters ----------
  const HEROES = [
    { id: 'cody', name: 'CODY', hair: 'cody', hc: '#f0d040', sk: '#f0b080', th: '#3050a0', sh: '#3050a0', ft: '#e8e8e8', to: '#f4f4f4', ua: '#f4f4f4', fa: '#f0b080', ha: '#f0b080', bl: '#202020', sc: 1, wd: 1, spd: 1.6, pow: 1, best: 'knife', desc: 'BALANCED STREET FIGHTER' },
    { id: 'guy', name: 'GUY', hair: 'guy', hc: '#201010', sk: '#f0b080', th: '#e05818', sh: '#e05818', ft: '#202020', to: '#e05818', ua: '#e05818', fa: '#f0b080', ha: '#303030', bl: '#202020', sc: 0.95, wd: 0.9, spd: 2.0, pow: 0.85, best: 'sword', desc: 'FAST BUSHIN NINJA' },
    { id: 'haggar', name: 'HAGGAR', hair: 'haggar', hc: '#6a3a1a', sk: '#e8a070', th: '#3a7a3a', sh: '#3a7a3a', ft: '#3a2a1a', to: '#e8a070', ua: '#e8a070', fa: '#e8a070', ha: '#e8a070', bl: '#3a2a1a', sc: 1.12, wd: 1.45, spd: 1.25, pow: 1.35, best: 'pipe', strap: 1, desc: 'MAYOR AND EX-WRESTLER' }
  ];
  const ET = {
    bred: { name: 'BRED', hp: 22, spd: 0.9, dmg: 5, ai: 'thug', pts: 300, hair: 'short', hc: '#402010', sk: '#f0b080', th: '#404060', sh: '#404060', ft: '#202020', to: '#e08020', ua: '#f0b080', fa: '#f0b080', ha: '#f0b080', bl: '#202020', sc: 1, wd: 1 },
    dug: { name: 'DUG', hp: 26, spd: 0.9, dmg: 6, ai: 'thug', pts: 300, hair: 'cap', hc: '#2040c0', sk: '#f0b080', th: '#306030', sh: '#306030', ft: '#202020', to: '#c03030', ua: '#f0b080', fa: '#f0b080', ha: '#f0b080', bl: '#202020', sc: 1, wd: 1.05 },
    jake: { name: 'JAKE', hp: 26, spd: 1.0, dmg: 6, ai: 'thug', pts: 300, hair: 'short', hc: '#c0a020', sk: '#f0b080', th: '#505050', sh: '#505050', ft: '#202020', to: '#30a0a0', ua: '#30a0a0', fa: '#f0b080', ha: '#f0b080', bl: '#202020', sc: 1, wd: 1 },
    twop: { name: 'TWO.P', hp: 30, spd: 1.0, dmg: 7, ai: 'thug', pts: 400, hair: 'mohawk', hc: '#ff4080', sk: '#f0b080', th: '#202020', sh: '#202020', ft: '#606060', to: '#8030c0', ua: '#f0b080', fa: '#f0b080', ha: '#f0b080', bl: '#c0c0c0', sc: 1, wd: 1 },
    holly: { name: 'HOLLY WOOD', hp: 28, spd: 1.1, dmg: 8, ai: 'knife', pts: 500, hair: 'short', hc: '#202020', sk: '#f0b080', th: '#707070', sh: '#707070', ft: '#202020', to: '#a0a0a0', ua: '#a0a0a0', fa: '#f0b080', ha: '#f0b080', bl: '#202020', sc: 1, wd: 0.95 },
    poison: { name: 'POISON', hp: 24, spd: 1.4, dmg: 7, ai: 'acro', pts: 500, hair: 'pink', hc: '#ff60c0', sk: '#f4c8a0', th: '#4060c0', sh: '#f4c8a0', ft: '#c02020', to: '#f4f4f4', ua: '#f4c8a0', fa: '#f4c8a0', ha: '#f4c8a0', bl: '#202020', sc: 0.95, wd: 0.8 },
    axl: { name: 'AXL', hp: 50, spd: 1.0, dmg: 9, ai: 'block', pts: 800, hair: 'shades', hc: '#f0d040', sk: '#f0b080', th: '#3050a0', sh: '#3050a0', ft: '#202020', to: '#202020', ua: '#f0b080', fa: '#f0b080', ha: '#f0b080', bl: '#c0c0c0', sc: 1.08, wd: 1.15 },
    bull: { name: 'BILL BULL', hp: 60, spd: 0.8, dmg: 10, ai: 'charge', pts: 1000, hair: 'bald', hc: '#000', sk: '#e8a070', th: '#806030', sh: '#806030', ft: '#202020', to: '#e8a070', ua: '#e8a070', fa: '#e8a070', ha: '#e8a070', bl: '#202020', sc: 1.2, wd: 1.6 },
    andore: { name: 'ANDORE', hp: 90, spd: 0.8, dmg: 12, ai: 'big', pts: 1500, hair: 'short', hc: '#c08020', sk: '#f0a090', th: '#e070a0', sh: '#f0a090', ft: '#e070a0', to: '#e070a0', ua: '#f0a090', fa: '#f0a090', ha: '#f0a090', bl: '#802050', sc: 1.4, wd: 1.6, nograb: 1 },
    damnd: { name: 'DAMND', hp: 180, spd: 1.2, dmg: 9, ai: 'damnd', pts: 10000, boss: 1, hair: 'dread', hc: '#3a2010', sk: '#a06030', th: '#e0e0e0', sh: '#e0e0e0', ft: '#806040', to: '#e0e0e0', ua: '#a06030', fa: '#a06030', ha: '#a06030', bl: '#c02020', sc: 1.2, wd: 1.3 },
    sodom: { name: 'SODOM', hp: 210, spd: 1.2, dmg: 12, ai: 'sodom', pts: 15000, boss: 1, hair: 'kabuto', hc: '#c0a020', sk: '#f0b080', th: '#4040a0', sh: '#4040a0', ft: '#202020', to: '#c02020', ua: '#c02020', fa: '#f0b080', ha: '#202020', bl: '#c0a020', sc: 1.25, wd: 1.4, katana: 1 },
    edie: { name: 'EDI.E', hp: 220, spd: 1.1, dmg: 10, ai: 'edie', pts: 20000, boss: 1, hair: 'police', hc: '#203070', sk: '#f0b080', th: '#203070', sh: '#203070', ft: '#101010', to: '#3050a0', ua: '#3050a0', fa: '#f0b080', ha: '#f0b080', bl: '#101010', sc: 1.15, wd: 1.3 },
    rolento: { name: 'ROLENTO', hp: 230, spd: 1.5, dmg: 10, ai: 'rolento', pts: 25000, boss: 1, hair: 'beret', hc: '#c02020', sk: '#f0b080', th: '#506838', sh: '#506838', ft: '#202020', to: '#506838', ua: '#506838', fa: '#f0b080', ha: '#f0b080', bl: '#202020', sc: 1.1, wd: 1.1, stick: 1 },
    abigail: { name: 'ABIGAIL', hp: 300, spd: 1.0, dmg: 14, ai: 'abigail', pts: 30000, boss: 1, hair: 'mohawk', hc: '#f04040', sk: '#f0b080', th: '#202020', sh: '#202020', ft: '#606060', to: '#202020', ua: '#f0b080', fa: '#f0b080', ha: '#f0b080', bl: '#c0c0c0', sc: 1.5, wd: 1.7, nograb: 1 },
    belger: { name: 'BELGER', hp: 260, spd: 0.7, dmg: 12, ai: 'belger', pts: 50000, boss: 1, hair: 'belger', hc: '#a0a0a0', sk: '#f0c090', th: '#303040', sh: '#303040', ft: '#101010', to: '#303040', ua: '#303040', fa: '#f0c090', ha: '#f0c090', bl: '#c0a020', sc: 1.15, wd: 1.3, nograb: 1 }
  };
  const STAGES = [
    { name: 'SLUM', pool: ['bred', 'dug', 'jake', 'twop', 'bred', 'dug'], late: ['axl'], boss: 'damnd', len: 1500, bg: 0 },
    { name: 'SUBWAY', pool: ['bred', 'jake', 'twop', 'holly', 'poison'], late: ['andore'], boss: 'sodom', len: 1500, bg: 1 },
    { name: 'WEST SIDE', pool: ['dug', 'twop', 'holly', 'poison', 'axl'], late: ['bull', 'andore'], boss: 'edie', len: 1600, bg: 2 },
    { name: 'INDUSTRIAL AREA', pool: ['jake', 'holly', 'poison', 'axl', 'twop'], late: ['andore', 'bull'], boss: 'rolento', len: 1600, bg: 3 },
    { name: 'BAY AREA', pool: ['dug', 'holly', 'poison', 'axl', 'bull'], late: ['andore', 'andore'], boss: 'abigail', len: 1700, bg: 4 },
    { name: 'UP TOWN', pool: ['twop', 'holly', 'poison', 'axl', 'bull', 'andore'], late: ['andore', 'axl'], boss: 'belger', len: 1700, bg: 5 }
  ];
  const FOOD = { apple: { hp: 25, pts: 500 }, bread: { hp: 35, pts: 500 }, meat: { hp: 60, pts: 1000 }, chicken: { hp: 100, pts: 2000 } };
  const TREAS = { watch: 2000, gold: 5000, gem: 10000, necklace: 3000 };
  const WEAP = { pipe: { dmg: 16, reach: 40, t: 18 }, knife: { dmg: 12, reach: 30, t: 12 }, sword: { dmg: 20, reach: 46, t: 18 } };

  // ---------- poses ----------
  const G = { bu: 30, bf: 110, fu: 55, ff: 85 };
  const base = { ln: 4, bt: -12, bs: 4, ft: 12, fs: -8 };
  const PO = {
    stand: Object.assign({}, base, { bu: 15, bf: 40, fu: 20, ff: 50 }),
    guard: Object.assign({}, base, G),
    walk1: { ln: 6, bt: -26, bs: 10, ft: 26, fs: -8, bu: 30, bf: 30, fu: -10, ff: 40 },
    walk2: { ln: 6, bt: 6, bs: -24, ft: -4, fs: -12, bu: -10, bf: 40, fu: 30, ff: 30 },
    jab: Object.assign({}, base, { ln: 8, bu: 40, bf: 110, fu: 90, ff: 0 }),
    jab2: Object.assign({}, base, { ln: 10, bu: 92, bf: 0, fu: 40, ff: 110 }),
    hook: { ln: 18, bt: -25, bs: 5, ft: 32, fs: -10, bu: 20, bf: 120, fu: 95, ff: 0 },
    upper: { ln: -6, bt: -5, bs: 0, ft: 40, fs: -60, bu: 20, bf: 90, fu: 170, ff: 0 },
    kick: { ln: -18, bt: -5, bs: 0, ft: 105, fs: -4, bu: 20, bf: 110, fu: -20, ff: 60 },
    jump: { ln: 10, bt: 60, bs: -120, ft: 90, fs: -110, bu: 60, bf: 90, fu: 80, ff: 70 },
    jkick: { ln: -10, bt: 50, bs: -110, ft: 110, fs: 0, bu: 60, bf: 90, fu: 30, ff: 60 },
    grab: Object.assign({}, base, { ln: 10, bu: 80, bf: 30, fu: 82, ff: 30 }),
    knee: { ln: 14, bt: -10, bs: 4, ft: 95, fs: -110, bu: 80, bf: 40, fu: 82, ff: 40 },
    throwp: { ln: -20, bt: -25, bs: 5, ft: 30, fs: -10, bu: 150, bf: 10, fu: 160, ff: 0 },
    hit: { ln: -25, bt: -10, bs: 5, ft: 20, fs: -5, bu: -40, bf: 30, fu: -20, ff: 40 },
    swing1: Object.assign({}, base, { ln: -10, bu: 30, bf: 60, fu: 170, ff: 20 }),
    swing2: Object.assign({}, base, { ln: 18, bu: 40, bf: 60, fu: 80, ff: 10 }),
    spin: { ln: 0, bt: -20, bs: 8, ft: 20, fs: -8, bu: -92, bf: 0, fu: 92, ff: 0 },
    win: { ln: 0, bt: -10, bs: 0, ft: 10, fs: 0, bu: 20, bf: 30, fu: 180, ff: 0 },
    crouch: { ln: 18, bt: 40, bs: -125, ft: 80, fs: -115, bu: 40, bf: 100, fu: 60, ff: 80 },
    shoot: Object.assign({}, base, { bu: 85, bf: 0, fu: 90, ff: 0 }),
    sit: { ln: 0, bt: 90, bs: -90, ft: 90, fs: -90, bu: 40, bf: 60, fu: 80, ff: 0 }
  };

  ArcadeRegistry.register({
    id: 'finalfight', title: 'Final Fight', year: 1989, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk (into enemy = grab) \u00b7 Space: attack / pick up \u00b7 X: jump (Space in air = jump kick) \u00b7 Space+X or Z: desperation attack \u00b7 Enter: start',
    marquee: { bg: '#101010', fg: '#ffd020', accent: '#d02020' },
    create(api) {
      const A = api.audio;
      const sfx = {
        swing: () => A.noise(0.06, { vol: 0.06, freq: 3500, type: 'highpass' }),
        hit: () => { A.noise(0.08, { vol: 0.2, freq: 1300 }); A.tone(180, 0.06, { type: 'square', vol: 0.07, slideTo: 90 }); },
        big: () => { A.noise(0.2, { vol: 0.28, freq: 900, slideTo: 150 }); A.tone(110, 0.14, { type: 'square', vol: 0.1, slideTo: 45 }); },
        thud: () => { A.noise(0.25, { vol: 0.22, freq: 400, slideTo: 60 }); A.tone(70, 0.2, { type: 'sine', vol: 0.18, slideTo: 35 }); },
        pick: () => A.melody([[880, 0.05], [1175, 0.08]], { type: 'square', vol: 0.1 }),
        food: () => A.melody([[523, 0.06], [659, 0.06], [784, 0.06], [1046, 0.12]], { type: 'square', vol: 0.11 }),
        crash: () => A.noise(0.3, { vol: 0.2, freq: 2500, slideTo: 300 }),
        hurt: () => A.tone(300, 0.15, { type: 'sawtooth', vol: 0.09, slideTo: 120 }),
        go: () => A.melody([[784, 0.08], [0, 0.04], [784, 0.08]], { type: 'square', vol: 0.1 }),
        shot: () => A.noise(0.12, { vol: 0.2, freq: 3000, slideTo: 500 }),
        boom: () => { A.noise(0.5, { vol: 0.3, freq: 800, slideTo: 60 }); },
        coin: () => A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }),
        clear: () => A.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.12], [784, 0.12], [1046, 0.4]], { type: 'square', vol: 0.13 }),
        die: () => A.melody([[392, 0.15], [330, 0.15], [262, 0.15], [196, 0.4]], { type: 'triangle', vol: 0.15 }),
        sel: () => A.tone(880, 0.05, { type: 'square', vol: 0.08 })
      };
      const TUNE = [0, null, 0, 3, null, 5, 7, null, 7, 5, 3, null, 0, null, -2, null];
      const BASS = [0, 0, 0, 0, 3, 3, -2, -2];
      let musT = 0, musS = 0;
      function music() {
        if (++musT < 8) return; musT = 0;
        const i = musS++ % 16, n = TUNE[i];
        if (n != null && (musS >> 4) % 2 === 1) A.tone(330 * Math.pow(2, (n + stage) / 12), 0.1, { type: 'square', vol: 0.03 });
        if (i % 2 === 0) A.tone(82 * Math.pow(2, (BASS[(i >> 1) % 8] + stage) / 12), 0.12, { type: 'triangle', vol: 0.1 });
      }

      let mode = 'title', T = 0, mt = 0, score = 0, hi = api.getHiScore(100000), lastCred = api.credits, coinFlash = 0;
      let p = null, hero = 0, lives = 3, stage = 0, cam = 0, lockX = -1, waves = [], wave = null, enemies = [], items = [], objs = [], shots = [], parts = [], pops = [];
      let timer = 99, tick = 0, goT = 0, shake = 0, lastFoe = null, lastFoeT = 0, nextExtend = 100000, demo = false, sel = 0, clearT = 0, bossOn = null;

      // ---------- setup ----------
      function mkPlayer() {
        return { x: cam + 60, y: 190, h: 0, vh: 0, vx: 0, face: 1, st: 'stand', t: 0, anim: 0, hp: MAXHP, c: HEROES[hero], atk: null, combo: 0, comboT: 0,
          inv: 120, weap: null, held: null, grabT: 0, knees: 0, hits: 0, hitsT: 0, lastAtk: -99, lastJmp: -99, airAtk: false };
      }
      function buildStage() {
        const S = STAGES[stage];
        waves = []; objs = []; items = []; enemies = []; shots = []; parts = []; pops = [];
        const n = 4 + (stage > 2 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const x = Math.round(220 + i * (S.len - 520) / n);
          const cnt = 4 + Math.min(6, stage + i);
          const list = [];
          for (let k = 0; k < cnt; k++) list.push(k >= cnt - 1 - (i >> 1) && i > 0 ? S.late[rnd(S.late.length)] : S.pool[rnd(S.pool.length)]);
          waves.push({ x, list, max: 3 + Math.min(2, (stage + i) >> 1), done: false, spawnT: 0 });
          // breakables between waves
          objs.push({ x: x + 120 + rnd(80), y: Y0 + 8 + rnd(40), kind: rnd(2) ? 'barrel' : 'drum', hp: 1, item: pickItem(i) });
          if (i % 2) objs.push({ x: x + 220 + rnd(60), y: Y0 + 14 + rnd(36), kind: 'barrel', hp: 1, item: pickItem(i + 1) });
        }
        waves.push({ x: S.len - W, list: [S.boss], max: 1, done: false, spawnT: 0, boss: true, extra: S.pool });
        objs.push({ x: S.len - W - 100, y: Y0 + 30, kind: 'drum', hp: 1, item: 'chicken' });
        cam = 0; lockX = -1; wave = null; bossOn = null; timer = 99; tick = 0; goT = 0;
      }
      function pickItem(i) {
        const r = Math.random();
        if (r < 0.35) return ['apple', 'bread', 'meat'][rnd(3)];
        if (r < 0.6) return ['pipe', 'knife', 'sword'][rnd(3)];
        if (r < 0.85) return ['watch', 'gold', 'gem', 'necklace'][rnd(4)];
        return i % 2 ? 'chicken' : 'meat';
      }
      function mkEnemy(type, x, y) {
        const d = ET[type];
        return { type, d, x, y, h: 0, vh: 0, vx: 0, face: -1, st: 'walk', t: 0, anim: rnd(30), hp: d.hp + stage * 4 * (d.boss ? 3 : 1), max: d.hp + stage * 4 * (d.boss ? 3 : 1),
          cd: 40 + rnd(60), hitT: 0, inv: 0, hits: 0, phase: 0, dead: false, side: Math.random() < 0.5 ? -1 : 1, knife: type === 'holly', chair: type === 'belger' };
      }

      // ---------- flow ----------
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); return false;
      }
      function newGame() { demo = false; score = 0; lives = 3; nextExtend = 100000; mode = 'select'; mt = 0; sel = 0; }
      function startStage() { buildStage(); p = mkPlayer(); mode = 'intro'; mt = 0; }
      function startDemo() { demo = true; hero = rnd(3); stage = rnd(3); lives = 1; score = 0; buildStage(); p = mkPlayer(); mode = 'play'; mt = 0; }
      function addScore(n) {
        if (demo) return;
        score += n; if (score > hi) hi = score;
        if (score >= nextExtend) { lives++; nextExtend += 200000; A.melody([[1046, 0.08], [1318, 0.08], [1568, 0.15]], { type: 'square', vol: 0.12 }); }
      }
      function pop(s, x, y) { pops.push({ s: String(s), x, y, t: 50 }); }

      // ---------- input ----------
      function autopilot() {
        const o = { l: false, r: false, u: false, d: false, atk: false, jmp: false, atkH: false, desp: false };
        let tgt = null, bd = 1e9;
        for (const e of enemies) if (!e.dead && e.st !== 'down') { const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 2; if (d < bd) { bd = d; tgt = e; } }
        if (tgt) {
          const tx = tgt.x - Math.sign(tgt.x - p.x || 1) * 26;
          if (tx > p.x + 3) o.r = true; else if (tx < p.x - 3) o.l = true;
          if (tgt.y > p.y + 3) o.d = true; else if (tgt.y < p.y - 3) o.u = true;
          if (Math.abs(tgt.y - p.y) < 6 && Math.abs(tgt.x - p.x) < 40) { o.atk = T % 9 === 0; if (tgt.x > p.x) o.r = true; else o.l = true; }
        } else o.r = true;
        return o;
      }
      function readInput() {
        if (demo) return autopilot();
        return { l: api.key('ArrowLeft'), r: api.key('ArrowRight'), u: api.key('ArrowUp'), d: api.key('ArrowDown'),
          atk: api.pressed('Space'), jmp: api.pressed('KeyX'), atkH: api.key('Space'), jH: api.key('KeyX'), desp: api.pressed('KeyZ') };
      }

      // ---------- player ----------
      const free = s => s === 'stand' || s === 'walk';
      function nearItem() { for (const it of items) if (Math.abs(it.x - p.x) < 14 && Math.abs(it.y - p.y) < 8) return it; return null; }
      function pickup(it) {
        items.splice(items.indexOf(it), 1);
        if (FOOD[it.kind]) { p.hp = Math.min(MAXHP, p.hp + FOOD[it.kind].hp); addScore(FOOD[it.kind].pts); pop(FOOD[it.kind].pts, it.x, it.y - 30); sfx.food(); }
        else if (TREAS[it.kind]) { addScore(TREAS[it.kind]); pop(TREAS[it.kind], it.x, it.y - 30); sfx.pick(); }
        else { if (p.weap) items.push({ kind: p.weap, x: p.x - p.face * 10, y: p.y, t: 0 }); p.weap = it.kind; sfx.pick(); }
        p.st = 'pick'; p.t = 0;
      }
      function updatePlayer(inp) {
        p.t++; p.anim++;
        if (p.inv > 0) p.inv--;
        if (p.comboT > 0) p.comboT--; else p.combo = 0;
        if (p.hitsT > 0) p.hitsT--; else p.hits = 0;
        const mx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), my = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
        if (inp.atk) p.lastAtk = T;
        if (inp.jmp) p.lastJmp = T;
        const despNow = inp.desp || (inp.jmp && (inp.atkH || T - p.lastAtk <= 3)) || (inp.atk && (inp.jH || T - p.lastJmp <= 3));
        if (despNow && (free(p.st) || (p.st === 'atk' && p.t < 5) || (p.st === 'jump' && p.t < 6))) { p.h = 0; p.combo = 0; startDesp(); }
        switch (p.st) {
          case 'stand': case 'walk': {
            if (inp.atk) {
              const it = nearItem();
              if (it) { pickup(it); break; }
              if (p.weap) { p.st = 'swing'; p.t = 0; p.atk = { hit: [], w: WEAP[p.weap] }; sfx.swing(); break; }
              p.combo = p.comboT > 0 ? p.combo + 1 : 1;
              if (p.combo > 4) p.combo = 1;
              p.st = 'atk'; p.t = 0; p.atk = { n: p.combo, hit: [], landed: false }; sfx.swing(); break;
            }
            if (inp.jmp) { p.st = 'jump'; p.t = 0; p.vh = 6.2; p.h = 0.1; p.vx = mx * p.c.spd * 1.1; p.airAtk = false; break; }
            if (mx || my) {
              p.st = 'walk'; if (mx) p.face = mx;
              p.x += mx * p.c.spd; p.y = clamp(p.y + my * p.c.spd * 0.65, Y0, Y1);
              // walk-in grab
              if (mx) for (const e of enemies) {
                if (grabbable(e) && Math.abs(e.y - p.y) < 6 && (e.x - p.x) * mx > 0 && Math.abs(e.x - p.x) < 18 * (e.d.sc || 1)) {
                  p.st = 'grab'; p.t = 0; p.held = e; p.knees = 0; e.st = 'grabbed'; e.t = 0; e.face = -mx; e.x = p.x + mx * 16; break;
                }
              }
            } else p.st = 'stand';
            break;
          }
          case 'atk': {
            const n = p.atk.n, fin = n === 4, dur = fin ? 22 : 11;
            if (p.t >= (fin ? 6 : 3) && p.t <= (fin ? 10 : 5)) {
              const dmg = Math.round((fin ? 10 : 5) * p.c.pow);
              const got = meleeHit(p.x, p.y, p.h, p.face, fin ? 40 : 34, dmg, fin, p.atk.hit);
              if (got) { p.atk.landed = true; p.comboT = 26; }
            }
            if (p.t >= dur) { if (!p.atk.landed) p.combo = 0; if (fin) p.combo = 0; p.st = 'stand'; p.atk = null; }
            break;
          }
          case 'swing': {
            const w = p.atk.w;
            if (p.weap === 'knife' && p.c.id !== 'cody' && p.t === 6) {
              shots.push({ x: p.x + p.face * 16, y: p.y, h: 44, vx: p.face * 6, vh: 0, kind: 'knife', own: 'p', t: 0 }); p.weap = null;
            } else if (p.t >= 6 && p.t <= 10 && p.weap) {
              const mul = p.weap === p.c.best ? 1.3 : 1;
              meleeHit(p.x, p.y, p.h, p.face, w.reach, Math.round(w.dmg * mul), p.weap !== 'knife', p.atk.hit);
            }
            if (p.t >= w.t + 4) { p.st = 'stand'; p.atk = null; }
            break;
          }
          case 'jump':
            p.x += p.vx; p.h += p.vh; p.vh -= 0.34;
            if (inp.atk && !p.airAtk) { p.airAtk = true; p.atk = { hit: [] }; sfx.swing(); }
            if (p.airAtk) meleeHit(p.x, p.y, p.h, p.face, 34, Math.round(10 * p.c.pow), true, p.atk.hit);
            if (p.h <= 0) { p.h = 0; p.st = 'stand'; p.t = 0; p.atk = null; }
            break;
          case 'desp':
            if (p.t >= 4 && p.t <= 26 && p.t % 4 === 0) {
              const got = meleeHit(p.x, p.y, p.h, p.face, 40, Math.round(12 * p.c.pow), true, p.atk.hit, true);
              if (got && !p.atk.paid) { p.atk.paid = true; p.hp = Math.max(1, p.hp - 6); }
            }
            if (p.t >= 32) { p.st = 'stand'; p.atk = null; p.inv = Math.max(p.inv, 6); }
            break;
          case 'grab': {
            const e = p.held;
            if (!e || e.st !== 'grabbed') { p.st = 'stand'; p.held = null; break; }
            e.x = p.x + p.face * 16; e.y = p.y;
            if (mx && mx !== p.face && !inp.atk) { p.face = mx; }
            if (inp.atk) {
              if (mx || p.knees >= 2) throwEnemy(mx || p.face);
              else { p.knees++; p.st = 'knee'; p.t = 0; damageEnemy(e, Math.round(6 * p.c.pow), false); if (e.hp <= 0) { knock(e, p.face, 3); p.held = null; } sfx.hit(); }
            }
            if (p.t > 100 && p.st === 'grab') { e.st = 'walk'; e.cd = 30; p.st = 'stand'; p.held = null; }
            break;
          }
          case 'knee':
            if (p.held) { p.held.x = p.x + p.face * 16; p.held.y = p.y; }
            if (p.t > 12) { p.st = p.held && p.held.st === 'grabbed' ? 'grab' : 'stand'; p.t = p.st === 'grab' ? 40 : 0; }
            break;
          case 'throw':
            if (p.c.id === 'haggar' && p.held) {
              // piledriver: hop up with the foe and slam him down
              p.h = Math.sin(Math.min(1, p.t / 30) * Math.PI) * 40; p.held.x = p.x; p.held.y = p.y; p.held.h = p.h + 20;
              if (p.t >= 30) { const e = p.held; p.held = null; p.h = 0; e.h = 0; damageEnemy(e, 30, true); e.st = e.hp <= 0 ? 'dying' : 'down'; e.t = 0; shake = 10; sfx.thud(); splash(p.x, p.y, 40, 12); }
            }
            if (p.t > 36) p.st = 'stand';
            break;
          case 'pick': if (p.t > 8) p.st = 'stand'; break;
          case 'hit': p.x += p.vx; p.vx *= 0.8; if (p.t > 16) p.st = 'stand'; break;
          case 'fall':
            p.x += p.vx; p.h += p.vh; p.vh -= 0.34;
            if (p.h <= 0) { p.h = 0; p.st = p.hp <= 0 ? 'dead' : 'down'; p.t = 0; sfx.thud(); }
            break;
          case 'down': if (p.t > 40) { p.st = 'stand'; p.inv = 60; } break;
          case 'held': if (!enemies.some(e => e.st === 'grabP')) { p.st = 'stand'; p.inv = 30; break; } if (inp.atk || inp.jmp || mx) p.escape = (p.escape || 0) + 1; break;
          case 'dead':
            if (p.t === 1) sfx.die();
            if (p.t > 90) loseLife();
            break;
        }
        p.y = clamp(p.y, Y0, Y1);
        p.x = clamp(p.x, cam + 12, cam + W - 12);
      }
      function startDesp() { p.st = 'desp'; p.t = 0; p.atk = { hit: [], paid: false }; p.inv = 34; sfx.big(); }
      function grabbable(e) { return !e.dead && !e.d.nograb && !e.chair && (e.st === 'walk' || e.st === 'hit' || e.st === 'wait') && e.h === 0; }
      function throwEnemy(dir) {
        const e = p.held; if (!e) return;
        p.face = dir; p.st = 'throw'; p.t = 0; p.inv = Math.max(p.inv, 38);
        if (p.c.id === 'haggar' && !e.d.boss) { e.st = 'thrown2'; return; }
        p.held = null;
        e.st = 'thrown'; e.t = 0; e.vx = dir * 4.5; e.vh = 4; e.h = 20; e.x = p.x; e.face = -dir; sfx.swing();
      }
      function hurtPlayer(dmg, dir, heavy) {
        if (p.inv > 0 || p.st === 'fall' || p.st === 'down' || p.st === 'dead' || p.st === 'desp') return false;
        if (p.held && (p.held.st === 'grabbed' || p.held.st === 'thrown2')) { p.held.st = 'walk'; p.held.h = 0; p.held.cd = 40; }
        p.held = null;
        p.hp -= dmg; p.hits++; p.hitsT = 60; sfx.hurt();
        splash(p.x, p.y, 50, 3);
        if (p.weap && (heavy || p.hp <= 0)) { items.push({ kind: p.weap, x: p.x, y: p.y, t: 0 }); p.weap = null; }
        if (p.hp <= 0 || heavy || p.hits >= 3) { p.st = 'fall'; p.t = 0; p.vh = 3.5; p.h = Math.max(0.1, p.h); p.vx = dir * 2; p.hits = 0; p.atk = null; if (p.hp <= 0) p.hp = 0; }
        else { p.st = 'hit'; p.t = 0; p.vx = dir * 1.5; p.atk = null; }
        return true;
      }
      function loseLife() {
        if (demo) { mode = 'title'; mt = 0; return; }
        lives--;
        const respawn = () => {
          p = Object.assign(mkPlayer(), { x: clamp(p.x, cam + 30, cam + W - 30), y: p.y, weap: null });
          for (const e of enemies) if (!e.dead && !e.d.boss && e.st !== 'down') knock(e, Math.sign(e.x - p.x) || 1, 0);
          timer = 99;
        };
        if (lives <= 0) {
          const over = () => { mode = 'gameover'; mt = 0; api.setHiScore(score); };
          if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over();
        } else respawn();
      }

      // ---------- combat ----------
      function meleeHit(x, y, h, face, reach, dmg, kd, list, around) {
        let got = false;
        for (const e of enemies) {
          if (e.dead || list.indexOf(e) >= 0 || e.inv > 0 || e.st === 'down' || e.st === 'rise' || e.st === 'thrown' || e.st === 'grabbed' || e.st === 'thrown2') continue;
          const dx = (e.x - x) * face;
          const inX = around ? Math.abs(e.x - x) < reach : dx > -4 && dx < reach + 6 * ((e.d.sc || 1) - 1) * 4;
          if (!inX || Math.abs(e.y - y) > 9 || Math.abs(e.h - h) > 40) continue;
          list.push(e); got = true;
          if (e.type === 'axl' && e.st === 'walk' && Math.random() < 0.45 && !kd) { e.st = 'block'; e.t = 0; sfx.swing(); splash(e.x, e.y, 46, 2, '#80c0ff'); continue; }
          damageEnemy(e, dmg, true);
          if (e.hp <= 0 || kd) knock(e, around ? Math.sign(e.x - x) || face : face, 3);
          else { e.st = 'hit'; e.t = 0; e.hitT = 18; e.x += face * 2; }
          splash((e.x + x) / 2, e.y, 44 + h, kd ? 8 : 4);
          if (kd) sfx.big(); else sfx.hit();
        }
        for (const o of objs) {
          if (o.broken || list.indexOf(o) >= 0) continue;
          if ((o.x - x) * face > -4 && (o.x - x) * face < reach + 8 && Math.abs(o.y - y) < 10) { list.push(o); breakObj(o); got = true; }
        }
        return got;
      }
      function damageEnemy(e, dmg, scoreIt) {
        e.hp -= dmg; lastFoe = e; lastFoeT = 180;
        if (scoreIt !== false) addScore(dmg * 20);
        if (e.d.boss && e.st !== 'down' && e.st !== 'fall') { e.cd = Math.max(e.cd, 20); }
      }
      function knock(e, dir, vh) {
        e.st = 'fall'; e.t = 0; e.vx = dir * 2.4; e.vh = vh || 3; e.h = Math.max(e.h, 0.1); e.face = -dir;
      }
      function breakObj(o) {
        o.broken = true; sfx.crash(); addScore(100);
        for (let i = 0; i < 10; i++) parts.push({ x: o.x, y: o.y - 14, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4, t: 30, c: o.kind === 'drum' ? '#4060a0' : '#8a5a2a', fy: o.y });
        if (o.item) items.push({ kind: o.item, x: o.x, y: o.y, t: 0 });
      }
      function splash(x, y, hgt, n, col) {
        for (let i = 0; i < n; i++) parts.push({ x, y: y - hgt, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, t: 14 + rnd(10), c: col || ['#ffffff', '#ffd040', '#ff8020'][rnd(3)], fy: y });
      }

      // ---------- enemies ----------
      function attackers() { return enemies.filter(e => e.st === 'wind' || e.st === 'strike').length; }
      function enemyStrike(e, reach, dmg, heavy) {
        if (Math.abs(e.y - p.y) < 8 && (p.x - e.x) * e.face > -6 && (p.x - e.x) * e.face < reach && Math.abs(p.h - e.h) < 40) return hurtPlayer(dmg, e.face, heavy);
        return false;
      }
      function updateEnemy(e) {
        e.t++; e.anim++;
        if (e.inv > 0) e.inv--;
        const dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx);
        const d = e.d;
        switch (e.st) {
          case 'enter': e.x += e.face * 1.2; if (e.x > cam + 10 && e.x < cam + W - 10) e.st = 'walk'; return;
          case 'grabbed': if (p.st !== 'grab' && p.st !== 'knee') { e.st = 'walk'; e.cd = 30; } return;
          case 'thrown2': if (p.st !== 'throw' || p.held !== e) { e.st = 'fall'; e.vh = 2; e.vx = 0; e.h = Math.max(e.h, 0.1); } return;
          case 'thrown':
            e.x += e.vx; e.h += e.vh; e.vh -= 0.3;
            for (const o of enemies) if (o !== e && !o.dead && o.st !== 'down' && o.st !== 'fall' && Math.abs(o.x - e.x) < 16 && Math.abs(o.y - e.y) < 10) { damageEnemy(o, 10); knock(o, Math.sign(e.vx), 3); sfx.big(); }
            if (e.h <= 0) { e.h = 0; damageEnemy(e, Math.round(14 * p.c.pow)); e.st = e.hp <= 0 ? 'dying' : 'down'; e.t = 0; sfx.thud(); shake = 5; }
            return;
          case 'fall':
            e.x += e.vx; e.h += e.vh; e.vh -= 0.3;
            if (e.h <= 0) { e.h = 0; e.st = e.hp <= 0 ? 'dying' : 'down'; e.t = 0; sfx.thud(); }
            return;
          case 'down': if (e.t > 50) { e.st = 'rise'; e.t = 0; } return;
          case 'rise': if (e.t > 14) { e.st = 'walk'; e.inv = 20; e.cd = 20 + rnd(40); if (e.chair && e.phase === 0) e.chair = false; } return;
          case 'dying':
            if (e.t === 1) { addScore(d.pts); pop(d.pts, e.x, e.y - 60); if (d.boss) { bossOn = null; for (const o of enemies) if (o !== e && !o.dead) { o.hp = 0; knock(o, Math.sign(o.x - e.x) || 1, 3); } } }
            if (e.t > 50) e.dead = true;
            return;
          case 'hit': if (--e.hitT <= 0) { e.st = 'walk'; e.cd = Math.max(e.cd, 15); } return;
          case 'block': if (e.t > 16) { e.st = 'wind'; e.t = 0; } return;
          case 'wind': {
            e.face = Math.sign(dx) || e.face;
            const wt = d.ai === 'big' || d.ai === 'abigail' ? 22 : 14;
            if (e.t >= wt) { e.st = 'strike'; e.t = 0; enemyStrike(e, 30 * (d.sc || 1), d.dmg, d.ai === 'big' || d.ai === 'abigail'); sfx.swing(); }
            return;
          }
          case 'strike': if (e.t > 14) { e.st = 'walk'; e.cd = 30 + rnd(50) - stage * 4; } return;
          case 'slash': // knife/katana lunge
            e.x += e.face * 3.5;
            if (!e.done && enemyStrike(e, 26, d.dmg, true)) e.done = true;
            if (e.t > 20) { e.st = 'walk'; e.cd = 50; }
            return;
          case 'flip': // Poison / Rolento flip kick
            e.x += e.vx; e.h += e.vh; e.vh -= 0.32;
            if (!e.done && e.vh < 1 && enemyStrike(e, 22, d.dmg, true)) e.done = true;
            if (e.h <= 0) { e.h = 0; e.st = 'walk'; e.cd = 40 + rnd(30); }
            return;
          case 'charge':
            e.x += e.face * (d.ai === 'abigail' ? 4.2 : 4);
            if (!e.done && enemyStrike(e, 22 * (d.sc || 1), d.dmg + 2, true)) e.done = true;
            if (e.t > 60 || e.x < cam - 40 || e.x > cam + W + 40) { e.st = 'walk'; e.cd = 60; e.x = clamp(e.x, cam - 30, cam + W + 30); }
            return;
          case 'grabP':
            p.x = e.x + e.face * 14; p.y = e.y;
            if ((p.escape || 0) > 8) { e.st = 'walk'; e.cd = 60; p.st = 'stand'; p.escape = 0; p.inv = 30; return; }
            if (e.t > 50) { e.st = 'walk'; e.cd = 60; p.st = 'stand'; p.escape = 0; hurtPlayer(d.dmg + 6, e.face, true); shake = 8; sfx.thud(); }
            return;
          case 'whistle':
            if (e.t === 10) { A.melody([[1568, 0.15], [1760, 0.3]], { type: 'sine', vol: 0.12 }); for (let i = 0; i < 3; i++) { const s = mkEnemy(STAGES[stage].pool[rnd(5)], i % 2 ? cam - 20 : cam + W + 20, Y0 + rnd(Y1 - Y0)); s.st = 'enter'; s.face = i % 2 ? 1 : -1; enemies.push(s); } }
            if (e.t > 50) { e.st = 'walk'; e.cd = 30; }
            return;
          case 'shoot':
            e.face = Math.sign(dx) || e.face;
            if (e.t === 16) { shots.push({ x: e.x + e.face * 20, y: e.y, h: e.chair ? 30 : 46, vx: e.face * (e.chair ? 4 : 6), vh: 0, kind: e.chair ? 'bolt' : 'bullet', own: 'e', dmg: d.dmg, t: 0 }); sfx.shot();
              if (e.chair) { shots.push({ x: e.x + e.face * 20, y: e.y - 8, h: 30, vx: e.face * 4, vy: -0.4, vh: 0, kind: 'bolt', own: 'e', dmg: d.dmg, t: 0 }); shots.push({ x: e.x + e.face * 20, y: e.y + 8, h: 30, vx: e.face * 4, vy: 0.4, vh: 0, kind: 'bolt', own: 'e', dmg: d.dmg, t: 0 }); } }
            if (e.t > 34) { e.st = 'walk'; e.cd = 50 + rnd(40); }
            return;
          case 'toss':
            if (e.t === 10) {
              const kind = d.ai === 'rolento' ? 'grenade' : 'knife';
              if (kind === 'grenade') shots.push({ x: e.x, y: e.y, h: 50, vx: dx / 50, vy: dy / 50, vh: 4, kind, own: 'e', dmg: d.dmg + 4, t: 0 });
              else shots.push({ x: e.x + e.face * 14, y: e.y, h: 44, vx: e.face * 4.5, vh: 0, kind, own: 'e', dmg: d.dmg, t: 0 });
              sfx.swing();
            }
            if (e.t > 24) { e.st = 'walk'; e.cd = 60 + rnd(40); }
            return;
        }
        // ---- 'walk' : approach & choose attacks ----
        if (p.st === 'dead') { e.x += Math.sign(e.x - p.x) * 0.5; return; }
        e.face = Math.sign(dx) || e.face;
        if (e.cd > 0) e.cd--;
        const sp = d.spd * (1 + stage * 0.06) * (e.chair ? 0.6 : 1);
        let tx = p.x - e.side * (d.boss ? 30 : 28) * (d.sc || 1), ty = p.y;
        if (attackers() >= 2 && !d.boss) { tx = p.x - e.side * 80; ty = p.y + (e.side > 0 ? -14 : 14); }
        if (d.ai === 'knife' && e.knife && adx > 70) tx = e.x;
        if (e.chair) { tx = p.x + (p.x < cam + W / 2 ? 140 : -140); ty = Y0 + 4; }
        tx = clamp(tx, cam + 20, cam + W - 20);
        const mx = tx - e.x, my = ty - e.y;
        if (Math.abs(mx) > 2) e.x += Math.sign(mx) * Math.min(sp, Math.abs(mx));
        if (Math.abs(my) > 1) e.y += Math.sign(my) * Math.min(sp * 0.6, Math.abs(my));
        e.y = clamp(e.y, Y0, Y1);
        if (e.cd > 0) return;
        const inLine = Math.abs(dy) < 7;
        const busy = attackers() >= 2;
        switch (d.ai) {
          case 'thug': case 'block':
            if (inLine && adx < 34 && !busy) { e.st = 'wind'; e.t = 0; }
            break;
          case 'knife':
            if (e.knife && inLine && adx > 60 && adx < 200 && Math.random() < 0.03) { e.st = 'toss'; e.t = 0; e.knife = false; }
            else if (inLine && adx < 60 && !busy) { e.st = 'slash'; e.t = 0; e.done = false; }
            break;
          case 'acro':
            if (inLine && adx < 90 && adx > 30 && !busy) { e.st = 'flip'; e.t = 0; e.vh = 4.5; e.vx = Math.sign(dx) * Math.min(3, adx / 26); e.done = false; }
            else if (inLine && adx < 30 && !busy) { e.st = 'wind'; e.t = 0; }
            break;
          case 'charge':
            if (inLine && adx > 60 && Math.random() < 0.05) { e.st = 'charge'; e.t = 0; e.done = false; }
            else if (inLine && adx < 34 && !busy) { e.st = 'wind'; e.t = 0; }
            break;
          case 'big':
            if (inLine && adx < 30 && p.st !== 'fall' && p.st !== 'down' && p.inv === 0 && Math.random() < 0.4) { e.st = 'grabP'; e.t = 0; p.st = 'held'; p.t = 0; p.escape = 0; if (p.held) { p.held.st = 'walk'; p.held = null; } }
            else if (inLine && adx < 38 && !busy) { e.st = 'wind'; e.t = 0; }
            break;
          case 'damnd':
            if (e.phase === 0 && e.hp < e.max / 2) { e.phase = 1; e.st = 'whistle'; e.t = 0; break; }
            if (inLine && adx > 60 && adx < 150 && Math.random() < 0.04) { e.st = 'flip'; e.t = 0; e.vh = 5; e.vx = Math.sign(dx) * adx / 32; e.done = false; }
            else if (inLine && adx < 40) { e.st = 'wind'; e.t = 0; }
            break;
          case 'sodom':
            if (inLine && adx < 110 && Math.random() < 0.06) { e.st = 'slash'; e.t = 0; e.done = false; }
            else if (inLine && adx < 40) { e.st = 'wind'; e.t = 0; }
            break;
          case 'edie':
            if (e.hp < e.max * 0.5 && inLine && adx > 50 && Math.random() < 0.05) { e.st = 'shoot'; e.t = 0; }
            else if (inLine && adx < 40) { e.st = 'wind'; e.t = 0; }
            break;
          case 'rolento':
            if (adx > 70 && Math.random() < 0.025) { e.st = 'toss'; e.t = 0; }
            else if (inLine && adx < 120 && Math.random() < 0.04) { e.st = 'flip'; e.t = 0; e.vh = 5.5; e.vx = Math.sign(dx) * adx / 34; e.done = false; }
            else if (inLine && adx < 40) { e.st = 'wind'; e.t = 0; }
            break;
          case 'abigail':
            if (inLine && adx > 70 && Math.random() < 0.04) { e.st = 'charge'; e.t = 0; e.done = false; }
            else if (inLine && adx < 34 && p.inv === 0 && p.st !== 'down' && Math.random() < 0.3) { e.st = 'grabP'; e.t = 0; p.st = 'held'; p.t = 0; p.escape = 0; if (p.held) { p.held.st = 'walk'; p.held = null; } }
            else if (inLine && adx < 44) { e.st = 'wind'; e.t = 0; }
            break;
          case 'belger':
            if (e.chair) { if (Math.random() < 0.04) { e.st = 'shoot'; e.t = 0; } if (e.hp < e.max * 0.55) { e.chair = false; e.phase = 1; } }
            else if (inLine && adx < 38) { e.st = 'wind'; e.t = 0; }
            else if (adx > 90 && Math.random() < 0.02) { e.st = 'shoot'; e.t = 0; }
            break;
        }
      }
      function updateShots() {
        for (const s of shots) {
          s.t++; s.x += s.vx; if (s.vy) s.y += s.vy;
          if (s.kind === 'grenade') {
            s.h += s.vh; s.vh -= 0.2;
            if (s.h <= 0) { s.dead = true; sfx.boom(); splash(s.x, s.y, 4, 14, '#ff8020'); shake = 6;
              if (Math.abs(p.x - s.x) < 30 && Math.abs(p.y - s.y) < 14) hurtPlayer(s.dmg, Math.sign(p.x - s.x) || 1, true); }
            continue;
          }
          if (s.own === 'e') {
            if (Math.abs(s.x - p.x) < 10 && Math.abs(s.y - p.y) < 8 && p.h < 40) { if (hurtPlayer(s.dmg, Math.sign(s.vx), s.kind !== 'knife')) s.dead = true; }
          } else {
            for (const e of enemies) if (!e.dead && e.st !== 'down' && e.st !== 'fall' && e.st !== 'dying' && Math.abs(s.x - e.x) < 12 && Math.abs(s.y - e.y) < 9) { damageEnemy(e, 20); knock(e, Math.sign(s.vx), 3); s.dead = true; sfx.big(); break; }
          }
          if (s.x < cam - 40 || s.x > cam + W + 40 || s.t > 200) s.dead = true;
        }
        shots = shots.filter(s => !s.dead);
      }

      // ---------- waves / camera ----------
      function updateWaves() {
        if (!wave) {
          const nw = waves.find(w => !w.done && cam >= w.x - 2);
          if (nw) { wave = nw; lockX = nw.x; wave.spawned = 0; }
        }
        if (wave) {
          const alive = enemies.filter(e => !e.dead).length;
          if (wave.spawned < wave.list.length && alive < wave.max + (wave.boss ? 2 : 0) && --wave.spawnT <= 0) {
            const type = wave.list[wave.spawned++];
            const fromL = !wave.boss && Math.random() < 0.4;
            const e = mkEnemy(type, fromL ? cam - 20 : cam + W + 20, Y0 + 4 + rnd(Y1 - Y0 - 8));
            e.st = 'enter'; e.face = fromL ? 1 : -1;
            if (ET[type].boss) { bossOn = e; lastFoe = e; lastFoeT = 9999; }
            enemies.push(e);
            wave.spawnT = 50 + rnd(60);
            if (wave.boss && wave.extra && wave.spawned >= wave.list.length && stage > 0 && !wave.extraDone) { wave.extraDone = true; for (let i = 0; i < 1 + (stage >> 1); i++) wave.list.push(wave.extra[rnd(wave.extra.length)]); }
          }
          if (wave.spawned >= wave.list.length && alive === 0) {
            wave.done = true; const wasBoss = wave.boss; wave = null; lockX = -1; timer = 99;
            if (wasBoss) { mode = 'clear'; mt = 0; clearT = 0; sfx.clear(); }
            else { goT = 150; sfx.go(); }
          }
        }
        const S = STAGES[stage];
        let target = p.x - W * 0.5;
        const maxCam = lockX >= 0 ? lockX : S.len - W;
        if (target > cam) cam = Math.min(maxCam, cam + Math.min(2.5, target - cam));
        cam = clamp(cam, 0, S.len - W);
      }

      // ---------- update ----------
      function update() {
        T++; mt++;
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (shake > 0) shake--;
        const start = api.anyPressed('Enter') || ((mode === 'title' || mode === 'story') && api.anyPressed('Space'));
        switch (mode) {
          case 'title': if (start && tryStart()) { newGame(); break; } if (mt > 480) { mode = 'story'; mt = 0; } break;
          case 'story': if (start && tryStart()) { newGame(); break; } if (mt > 420) startDemo(); break;
          case 'rank': if (start && tryStart()) { newGame(); break; } if (mt > 300) { mode = 'title'; mt = 0; } break;
          case 'select':
            if (api.pressed('ArrowLeft')) { sel = (sel + 2) % 3; sfx.sel(); }
            if (api.pressed('ArrowRight')) { sel = (sel + 1) % 3; sfx.sel(); }
            if (mt > 20 && api.anyPressed('Space', 'Enter', 'KeyX') || mt > 900) { hero = sel; stage = 0; sfx.clear(); startStage(); }
            break;
          case 'intro': if (mt > 150 || (mt > 30 && api.anyPressed('Space', 'Enter'))) { mode = 'play'; mt = 0; } break;
          case 'play': {
            if (demo && (start && tryStart())) { newGame(); break; }
            if (demo && mt > 1500) { mode = 'rank'; mt = 0; break; }
            const inp = readInput();
            updatePlayer(inp);
            for (const e of enemies) if (!e.dead) updateEnemy(e);
            if (p.st === 'throw' && p.c.id === 'haggar' && p.held && p.held.st === 'thrown2') { /* handled in player */ }
            enemies = enemies.filter(e => !e.dead);
            updateShots();
            updateWaves();
            for (const it of items) it.t++;
            for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.25; q.t--; }
            parts = parts.filter(q => q.t > 0);
            for (const q of pops) q.t--;
            pops = pops.filter(q => q.t > 0);
            if (lastFoeT > 0 && !(lastFoe && lastFoe.d.boss && !lastFoe.dead)) lastFoeT--;
            if (goT > 0) goT--;
            if (p.st !== 'dead' && ++tick >= 60) { tick = 0; if (--timer <= 0) { timer = 0; p.hp = 0; p.st = 'dead'; p.t = 0; } }
            if (!demo) music();
            break;
          }
          case 'clear':
            clearT++;
            if (clearT === 60) { addScore(timer * 100 + p.hp * 100); }
            if (clearT > 240) {
              if (demo) { mode = 'rank'; mt = 0; break; }
              stage++;
              if (stage >= STAGES.length) { mode = 'ending'; mt = 0; api.setHiScore(score); }
              else { const keepHp = p.hp, keepW = p.weap; startStage(); p.hp = Math.max(keepHp, 60); p.weap = keepW; }
            }
            break;
          case 'ending': if (mt > 900 || (mt > 200 && start)) { mode = 'title'; mt = 0; } break;
          case 'gameover': if (mt > 240) { mode = 'title'; mt = 0; } break;
        }
      }

      // ---------- drawing helpers ----------
      const ra = d => d * Math.PI / 180;
      function shade(hex, k) {
        const n = parseInt(hex.slice(1), 16);
        return 'rgb(' + Math.min(255, Math.round(((n >> 16) & 255) * k)) + ',' + Math.min(255, Math.round(((n >> 8) & 255) * k)) + ',' + Math.min(255, Math.round((n & 255) * k)) + ')';
      }
      function seg(ctx, x1, y1, x2, y2, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      function drawBody(ctx, c, Pz, x, y, face, rot, o) {
        o = o || {};
        const wd = c.wd, sc = (c.sc || 1) * 0.85;
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face * sc, sc); if (rot) ctx.rotate(rot);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const TL = 20, SL = 20, UL = 15, FL = 14, TO = 26;
        const leg = (a, b) => { const k = [Math.sin(ra(a)) * TL, Math.cos(ra(a)) * TL]; return [k, [k[0] + Math.sin(ra(a + b)) * SL, k[1] + Math.cos(ra(a + b)) * SL]]; };
        const lb = leg(Pz.bt, Pz.bs), lf = leg(Pz.ft, Pz.fs);
        const hipY = -Math.max(lb[1][1], lf[1][1], 6);
        const ln = ra(Pz.ln);
        const sh = [Math.sin(ln) * TO, hipY - Math.cos(ln) * TO];
        const hd = [sh[0] + Math.sin(ln) * 9, sh[1] - Math.cos(ln) * 9];
        const arm = (a, b) => { const e = [sh[0] + Math.sin(ra(a)) * UL, sh[1] + Math.cos(ra(a)) * UL]; return [e, [e[0] + Math.sin(ra(a + b)) * FL, e[1] + Math.cos(ra(a + b)) * FL]]; };
        const ab = arm(Pz.bu, Pz.bf), af = arm(Pz.fu, Pz.ff);
        const fl = o.flash;
        const C = (col, k) => fl ? '#ffffff' : (k ? shade(col, k) : col);
        const lw = Math.min(1.5, wd);
        if (c.hair === 'pink' || c.hair === 'dread') { ctx.fillStyle = C(c.hc); ctx.fillRect(hd[0] - 10, hd[1] - 4, 7, c.hair === 'pink' ? 22 : 16); }
        seg(ctx, 0, hipY, lb[0][0], hipY + lb[0][1], 7 * lw, C(c.th, 0.7));
        seg(ctx, lb[0][0], hipY + lb[0][1], lb[1][0], hipY + lb[1][1], 5.5 * lw, C(c.sh, 0.7));
        ctx.fillStyle = C(c.ft, 0.7); ctx.fillRect(lb[1][0] - 3, hipY + lb[1][1] - 2, 8, 4);
        seg(ctx, sh[0] - 2, sh[1] + 1, ab[0][0], ab[0][1], 5.5 * lw, C(c.ua, 0.7));
        seg(ctx, ab[0][0], ab[0][1], ab[1][0], ab[1][1], 4.5 * lw, C(c.fa, 0.7));
        disc(ctx, ab[1][0], ab[1][1], 3.4 * Math.min(1.4, wd), C(c.ha, 0.7));
        ctx.fillStyle = C(c.to);
        const tw = 7.5 * wd, sw = 9.5 * lw, px = Math.cos(ln), py = Math.sin(ln);
        ctx.beginPath();
        ctx.moveTo(-px * tw, hipY - py * tw); ctx.lineTo(px * tw, hipY + py * tw);
        ctx.lineTo(sh[0] + px * sw, sh[1] + py * sw); ctx.lineTo(sh[0] - px * sw, sh[1] - py * sw); ctx.closePath(); ctx.fill();
        if (wd > 1.3) disc(ctx, Math.sin(ln) * 12, hipY - Math.cos(ln) * 12, 10 * (wd - 0.6), C(c.to));
        if (c.strap) seg(ctx, sh[0] - 6, sh[1] + 1, Math.sin(ln) * 6 + 6, hipY - 4, 2.5, C('#3a2a1a'));
        seg(ctx, -px * tw, hipY - py * tw + 1, px * tw, hipY + py * tw + 1, 3.5, C(c.bl));
        seg(ctx, 0, hipY, lf[0][0], hipY + lf[0][1], 7.5 * lw, C(c.th));
        seg(ctx, lf[0][0], hipY + lf[0][1], lf[1][0], hipY + lf[1][1], 6 * lw, C(c.sh));
        ctx.fillStyle = C(c.ft); ctx.fillRect(lf[1][0] - 3, hipY + lf[1][1] - 2, 9, 4);
        drawHead(ctx, c, hd[0], hd[1], C);
        seg(ctx, sh[0] + 2, sh[1] + 1, af[0][0], af[0][1], 6 * lw, C(c.ua));
        seg(ctx, af[0][0], af[0][1], af[1][0], af[1][1], 5 * lw, C(c.fa));
        const hx = af[1][0], hy = af[1][1], dx = af[1][0] - af[0][0], dy = af[1][1] - af[0][1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        const wp = o.weap || (c.katana ? 'sword' : c.stick ? 'stick' : o.knife ? 'knife' : o.gun ? 'gun' : null);
        if (wp === 'pipe') seg(ctx, hx - ux * 6, hy - uy * 6, hx + ux * 26, hy + uy * 26, 3, C('#a0a8b0'));
        if (wp === 'stick') seg(ctx, hx - ux * 14, hy - uy * 14, hx + ux * 24, hy + uy * 24, 2.5, C('#8a5a2a'));
        if (wp === 'sword') { seg(ctx, hx, hy, hx + ux * 32, hy + uy * 32, 2, C('#e8f0ff')); seg(ctx, hx - uy * 4, hy + ux * 4, hx + uy * 4, hy - ux * 4, 2, C('#c0a020')); }
        if (wp === 'knife') seg(ctx, hx, hy, hx + ux * 11, hy + uy * 11, 2, C('#e8f0ff'));
        if (wp === 'gun') { ctx.fillStyle = '#202020'; ctx.fillRect(hx, hy - 2, 9, 3); }
        disc(ctx, hx, hy, 3.8 * Math.min(1.4, wd), C(c.ha));
        ctx.restore();
      }
      function drawHead(ctx, c, x, y, C) {
        const hc = C(c.hc);
        disc(ctx, x, y, 7, C(c.sk));
        ctx.fillStyle = C(c.sk); ctx.fillRect(x + 4, y - 1, 4, 5);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 3, y - 2, 2, 2);
        switch (c.hair) {
          case 'cody': ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 9, 13, 5); ctx.fillRect(x - 8, y - 6, 4, 6); ctx.fillRect(x + 2, y - 10, 5, 3); break;
          case 'guy': ctx.fillStyle = hc; ctx.fillRect(x - 8, y - 10, 15, 6); ctx.fillRect(x - 9, y - 6, 4, 8); ctx.fillStyle = C('#202020'); ctx.fillRect(x - 6, y - 5, 13, 2); break;
          case 'haggar': ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 9, 13, 4); ctx.fillRect(x - 8, y - 6, 4, 6); ctx.fillRect(x + 2, y + 2, 7, 2); break;
          case 'short': ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 8, 14, 4); break;
          case 'cap': ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 9, 14, 5); ctx.fillRect(x - 12, y - 6, 6, 2); break;
          case 'mohawk': ctx.fillStyle = hc; ctx.fillRect(x - 3, y - 13, 6, 7); break;
          case 'pink': ctx.fillStyle = hc; ctx.fillRect(x - 8, y - 9, 15, 5); ctx.fillStyle = C('#202060'); ctx.fillRect(x - 7, y - 11, 13, 3); ctx.fillRect(x + 4, y - 9, 5, 2); break;
          case 'shades': ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 9, 14, 5); ctx.fillStyle = '#000'; ctx.fillRect(x, y - 3, 8, 3); ctx.fillStyle = C('#d02020'); ctx.fillRect(x - 7, y - 6, 14, 2); break;
          case 'bald': ctx.fillStyle = '#000'; ctx.fillRect(x + 1, y + 3, 6, 2); break;
          case 'dread': ctx.fillStyle = hc; for (let i = 0; i < 5; i++) ctx.fillRect(x - 9 + i * 3, y - 10, 2, 9 + (i & 1) * 4); ctx.fillRect(x - 7, y - 10, 13, 3); break;
          case 'kabuto': ctx.fillStyle = C('#802020'); ctx.fillRect(x - 9, y - 11, 17, 7); ctx.fillStyle = hc; ctx.fillRect(x - 2, y - 17, 3, 7); ctx.fillRect(x - 7, y - 16, 2, 5); ctx.fillRect(x + 4, y - 16, 2, 5); ctx.fillStyle = '#202020'; ctx.fillRect(x, y, 8, 5); break;
          case 'police': ctx.fillStyle = hc; ctx.fillRect(x - 8, y - 12, 16, 7); ctx.fillRect(x + 2, y - 6, 8, 2); ctx.fillStyle = C('#f0c020'); ctx.fillRect(x + 1, y - 10, 3, 3); break;
          case 'beret': ctx.fillStyle = hc; ctx.fillRect(x - 8, y - 11, 14, 5); ctx.fillRect(x - 9, y - 9, 3, 3); break;
          case 'belger': ctx.fillStyle = hc; ctx.fillRect(x - 3, y + 2, 10, 5); ctx.fillStyle = '#000'; ctx.fillRect(x + 1, y - 3, 7, 2); break;
        }
      }
      function heroPose() {
        let po = 'stand', rot = 0, dy = 0, face = p.face, weap = p.weap;
        switch (p.st) {
          case 'walk': po = (p.anim >> 3) & 1 ? 'walk1' : 'walk2'; break;
          case 'atk': { const n = p.atk.n; po = n === 4 ? (p.t < 6 ? 'guard' : p.c.id === 'guy' ? 'kick' : p.c.id === 'haggar' ? 'upper' : 'kick') : n === 3 ? 'hook' : n === 2 ? 'jab2' : 'jab'; if (n < 4 && p.t > 7) po = 'guard'; break; }
          case 'swing': po = p.t < 6 ? 'swing1' : 'swing2'; break;
          case 'jump': po = p.airAtk ? 'jkick' : 'jump'; break;
          case 'desp': po = 'spin'; face = ((p.t >> 2) & 1) ? p.face : -p.face; if (p.c.id === 'guy') { po = 'kick'; rot = 0; } dy = -Math.sin(p.t / 32 * Math.PI) * 14; break;
          case 'grab': po = 'grab'; break;
          case 'knee': po = 'knee'; break;
          case 'throw': po = 'throwp'; break;
          case 'pick': po = 'crouch'; break;
          case 'hit': po = 'hit'; break;
          case 'held': po = 'hit'; dy = -6; break;
          case 'fall': po = 'hit'; rot = -Math.min(1.5, p.t * 0.08); break;
          case 'down': case 'dead': po = 'hit'; rot = -Math.PI / 2; dy = -5; break;
        }
        return { po, rot, dy, face, weap };
      }
      function enemyPose(e) {
        let po = 'guard', rot = 0, dy = 0, face = e.face;
        switch (e.st) {
          case 'walk': case 'enter': po = (e.anim >> 3) & 1 ? 'walk1' : 'walk2'; if (Math.abs(e.x - p.x) < 50 && !e.chair) po = (e.anim >> 4) & 1 ? 'guard' : po; break;
          case 'wind': po = e.d.ai === 'big' || e.d.ai === 'abigail' ? 'swing1' : 'guard'; break;
          case 'strike': po = e.t < 8 ? (e.d.ai === 'acro' ? 'kick' : 'hook') : 'guard'; break;
          case 'block': po = 'grab'; break;
          case 'slash': po = 'swing2'; break;
          case 'flip': po = 'jkick'; if (e.vh > 1) { rot = -e.t * 0.35; dy = -20; po = 'jump'; } break;
          case 'charge': po = e.d.ai === 'abigail' ? 'grab' : 'hook'; rot = e.d.ai === 'charge' ? 0.5 : 0; break;
          case 'grabP': po = 'throwp'; break;
          case 'grabbed': case 'hit': po = 'hit'; break;
          case 'thrown': case 'thrown2': po = 'hit'; rot = -e.t * 0.25; dy = -20; break;
          case 'fall': po = 'hit'; rot = -Math.min(1.5, e.t * 0.08); break;
          case 'down': case 'dying': po = 'hit'; rot = -Math.PI / 2; dy = -5; break;
          case 'rise': po = 'crouch'; break;
          case 'whistle': po = 'win'; break;
          case 'shoot': po = 'shoot'; break;
          case 'toss': po = e.t < 10 ? 'swing1' : 'swing2'; break;
        }
        if (e.chair && (e.st === 'walk' || e.st === 'shoot' || e.st === 'enter')) po = e.st === 'shoot' ? 'shoot' : 'sit';
        return { po, rot, dy, face };
      }
      function drawActor(ctx, a, ox) {
        const isP = a === p;
        const sx = a.x + ox, sy = a.y - a.h;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(sx - 13), a.y - 1, 26, 3);
        if (isP) {
          if (p.inv > 0 && p.inv < 100 && (T & 2) && p.st !== 'desp') return;
          const q = heroPose();
          drawBody(ctx, p.c, PO[q.po], sx, sy + q.dy, q.face, q.rot, { weap: q.weap, flash: p.st === 'hit' && p.t < 3 });
          if (p.st === 'desp' && p.c.id !== 'guy') { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy - 44 + q.dy, 30, T * 0.6, T * 0.6 + 2.4); ctx.stroke(); }
          return;
        }
        const e = a;
        if (e.st === 'dying' && (T & 4)) return;
        if (e.chair) {
          // wheelchair
          disc(ctx, sx - e.face * 4, a.y - 12, 11, '#303030'); disc(ctx, sx - e.face * 4, a.y - 12, 8, '#909090'); disc(ctx, sx - e.face * 4, a.y - 12, 2, '#303030');
          ctx.fillStyle = '#602020'; ctx.fillRect(sx - 14, a.y - 36, 6, 26); ctx.fillRect(sx - 12, a.y - 24, 24, 5);
        }
        const q = enemyPose(e);
        drawBody(ctx, e.d, PO[q.po], sx, sy + q.dy - (e.chair && q.po !== 'shoot' ? 14 : 0), q.face, q.rot, { flash: (e.st === 'hit' && e.hitT > 14) || e.inv > 0 && (T & 2), knife: e.type === 'holly' && e.knife || (e.type === 'holly' && e.st === 'slash'), gun: e.type === 'edie' && e.hp < e.max / 2 || e.type === 'belger', weap: null });
      }
      function drawItem(ctx, it, ox) {
        const x = Math.round(it.x + ox), y = it.y;
        if (it.t > 600 && (T & 4)) return;
        switch (it.kind) {
          case 'apple': disc(ctx, x, y - 5, 5, '#e02020'); ctx.fillStyle = '#40a020'; ctx.fillRect(x, y - 12, 2, 3); break;
          case 'bread': ctx.fillStyle = '#d09040'; ctx.fillRect(x - 8, y - 7, 16, 6); ctx.fillStyle = '#f0c070'; ctx.fillRect(x - 6, y - 8, 12, 2); break;
          case 'meat': disc(ctx, x, y - 6, 6, '#a04020'); ctx.fillStyle = '#f0f0e0'; ctx.fillRect(x + 4, y - 7, 7, 2); break;
          case 'chicken': ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 12, y - 3, 24, 3); disc(ctx, x, y - 8, 8, '#c07020'); disc(ctx, x - 3, y - 10, 3, '#e09040'); break;
          case 'watch': disc(ctx, x, y - 5, 5, '#f0d040'); disc(ctx, x, y - 5, 3, '#ffffff'); break;
          case 'gold': ctx.fillStyle = '#f0c020'; ctx.fillRect(x - 7, y - 6, 14, 6); ctx.fillStyle = '#fff080'; ctx.fillRect(x - 5, y - 6, 10, 2); break;
          case 'gem': ctx.fillStyle = '#60e0ff'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y - 6); ctx.lineTo(x - 3, y - 10); ctx.lineTo(x + 3, y - 10); ctx.lineTo(x + 6, y - 6); ctx.fill(); break;
          case 'necklace': ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 6, 5, 0, Math.PI * 2); ctx.stroke(); disc(ctx, x, y - 1, 2, '#ff4040'); break;
          case 'pipe': ctx.fillStyle = '#a0a8b0'; ctx.fillRect(x - 14, y - 3, 28, 3); break;
          case 'knife': ctx.fillStyle = '#e8f0ff'; ctx.fillRect(x - 4, y - 3, 9, 2); ctx.fillStyle = '#603010'; ctx.fillRect(x - 8, y - 3, 4, 2); break;
          case 'sword': ctx.fillStyle = '#e8f0ff'; ctx.fillRect(x - 12, y - 3, 26, 2); ctx.fillStyle = '#c0a020'; ctx.fillRect(x - 14, y - 5, 2, 6); ctx.fillStyle = '#202020'; ctx.fillRect(x - 20, y - 3, 6, 2); break;
        }
      }
      function drawObj(ctx, o, ox) {
        if (o.broken) return;
        const x = Math.round(o.x + ox), y = o.y;
        if (o.kind === 'drum') { ctx.fillStyle = '#3a5a9a'; ctx.fillRect(x - 9, y - 26, 18, 26); ctx.fillStyle = '#2a4070'; ctx.fillRect(x - 9, y - 18, 18, 2); ctx.fillRect(x - 9, y - 9, 18, 2); ctx.fillStyle = '#5a7aba'; ctx.fillRect(x - 6, y - 26, 3, 26); }
        else { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 10, y - 24, 20, 24); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 10, y - 20, 20, 2); ctx.fillRect(x - 10, y - 6, 20, 2); ctx.fillStyle = '#a07040'; ctx.fillRect(x - 10, y - 26, 20, 3); }
      }
      function drawShot(ctx, s, ox) {
        const x = Math.round(s.x + ox), y = Math.round(s.y - s.h);
        if (s.kind === 'knife') { ctx.fillStyle = '#e8f0ff'; ctx.fillRect(x - 5, y, 10, 2); }
        else if (s.kind === 'bullet') { ctx.fillStyle = '#ffe060'; ctx.fillRect(x - 3, y, 6, 2); }
        else if (s.kind === 'bolt') { ctx.fillStyle = '#c0a060'; ctx.fillRect(x - 7, y, 14, 1); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x + (s.vx > 0 ? 5 : -7), y - 1, 2, 3); }
        else if (s.kind === 'grenade') { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(s.x + ox) - 3, Math.round(s.y), 6, 2); disc(ctx, x, y, 3, '#305020'); }
      }

      // ---------- backgrounds ----------
      function drawBG(ctx) {
        const st = STAGES[stage].bg, ox = -cam;
        const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
        const sky = [['#101828', '#303850'], ['#181818', '#303030'], ['#201020', '#502840'], ['#281808', '#603010'], ['#204060', '#80a0c0'], ['#080818', '#202048']][st];
        const g = ctx.createLinearGradient(0, 0, 0, Y0); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Y0);
        const rep = (period, fn) => { const s0 = Math.floor(cam / period) - 1; for (let i = s0; i < s0 + Math.ceil(W / period) + 3; i++) fn(i * period + ox, i); };
        switch (st) {
          case 0: // slum: brick tenements, fire escapes, graffiti
            rep(160, (x, i) => {
              R(i % 2 ? '#6a2a1a' : '#5a3020', x, 10, 160, Y0 - 10);
              for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { R('#1a1010', x + 14 + k * 36, 22 + r * 30, 18, 20); if ((i + r + k) % 5 === 0) R('#f0d080', x + 16 + k * 36, 24 + r * 30, 14, 16); }
              R('#202020', x + 10, 50, 70, 3); R('#202020', x + 10, 80, 70, 3); for (let k = 0; k < 6; k++) R('#202020', x + 10 + k * 14, 50, 1, 30);
              if (i % 3 === 1) text(ctx, 'MAD GEAR', x + 30, Y0 - 24, '#40e060', 2);
              R('#303030', x + 120, Y0 - 34, 26, 34); R('#504030', x + 124, Y0 - 30, 18, 30);
            });
            break;
          case 1: // subway: tiled walls, then train windows
            rep(120, (x, i) => {
              R('#c8c8b8', x, 20, 120, Y0 - 20); for (let r = 0; r < 12; r++) R('#a8a898', x, 22 + r * 11, 120, 1);
              R('#2040a0', x, 70, 120, 8); if (i % 4 === 0) text(ctx, 'METRO', x + 30, 34, '#2040a0', 2);
              R('#606060', x + 100, 20, 6, Y0 - 20);
              if (i % 4 === 2) { R('#404040', x + 10, 90, 80, Y0 - 90); R('#80a0c0', x + 16, 96, 30, 24); R('#80a0c0', x + 54, 96, 30, 24); }
            });
            break;
          case 2: // west side: bars and neon
            rep(200, (x, i) => {
              R('#3a2030', x, 20, 200, Y0 - 20); R('#2a1020', x + 20, 60, 70, Y0 - 60);
              const on = (T >> 4) + i & 1;
              text(ctx, i % 2 ? 'BAR' : 'CLUB', x + 110, 40, on ? '#ff40a0' : '#802050', 3);
              R(on ? '#40e0ff' : '#206080', x + 100, 70, 80, 3);
              R('#f0c060', x + 30, 80, 20, 28); R('#f0c060', x + 60, 80, 20, 28);
            });
            break;
          case 3: // industrial: pipes, furnace glow
            rep(140, (x, i) => {
              R('#4a3a30', x, 10, 140, Y0 - 10); R('#2a2018', x + 10, 30, 16, Y0 - 30); R('#2a2018', x + 70, 30, 16, Y0 - 30);
              R('#706050', x, 50, 140, 8); R('#706050', x, 100, 140, 5);
              if (i % 3 === 0) { const gl = 0.6 + Math.sin(T / 10 + i) * 0.3; R('rgba(255,120,20,' + gl.toFixed(2) + ')', x + 34, Y0 - 50, 30, 50); }
            });
            break;
          case 4: // bay area: sea, cranes
            R('#2060a0', 0, 80, W, Y0 - 80);
            for (let i = 0; i < 16; i++) R('#80c0f0', ((i * 47 - cam * 0.3 + T * 0.2) % W + W) % W, 90 + (i % 5) * 12, 12, 1);
            rep(260, (x, i) => {
              const cx = x * 0.7 + 60; R('#d06020', cx, 20, 8, 70); R('#d06020', cx - 30, 20, 80, 6); R('#303030', cx + 40, 26, 1, 30);
              R('#606060', x, 120, 260, 6); for (let k = 0; k < 6; k++) R('#404040', x + k * 46, 126, 6, Y0 - 126);
              if (i % 2) { R('#c03030', x + 120, 100, 60, 20); R('#3060c0', x + 182, 100, 60, 20); }
            });
            break;
          case 5: // up town: skyscrapers, penthouse
            for (let i = 0; i < 30; i++) R('#f0f0d0', (i * 61) % W, (i * 37) % 60, 1, 1);
            rep(110, (x, i) => {
              R('#202038', x * 0.6 + 20, 30 + (i % 3) * 20, 70, Y0);
              for (let r = 0; r < 6; r++) R((i + r) % 3 ? '#f0e080' : '#303050', x * 0.6 + 30 + (r % 3) * 20, 40 + (i % 3) * 20 + (r >> 1) * 22, 8, 10);
            });
            rep(180, (x, i) => { R('#d8d0c0', x, 90, 180, Y0 - 90); R('#b0a080', x, 90, 180, 4); R('#405080', x + 20, 100, 50, 40); R('#405080', x + 100, 100, 50, 40); R('#c0a020', x + 85, 90, 4, Y0 - 90); });
            break;
        }
        // floor: sidewalk + street
        const fc = [['#707070', '#4a4a4a'], ['#8a8a80', '#5a5a50'], ['#6a4a30', '#4a3020'], ['#5a5048', '#3a3028'], ['#8a7050', '#5a4a30'], ['#a09080', '#706050']][st];
        ctx.fillStyle = fc[0]; ctx.fillRect(0, Y0 - 6, W, 22);
        ctx.fillStyle = fc[1]; ctx.fillRect(0, Y0 + 16, W, H - Y0 - 16);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = -2; i < 14; i++) { const bx = i * 40 - (cam % 40); ctx.fillRect(Math.round(bx), Y0 - 6, 1, 22); }
        ctx.fillRect(0, Y0 + 15, W, 2);
        if (st !== 1) for (let i = -2; i < 10; i++) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(Math.round(i * 80 - (cam % 80)), 196, 30, 2); }
      }

      // ---------- HUD ----------
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 34);
        text(ctx, p.c.name, 8, 3, '#ffd040'); text(ctx, pad(score, 7), 60, 3, '#fff');
        text(ctx, '=' + Math.max(0, lives - 1), 112, 3, '#fff');
        ctx.fillStyle = '#400000'; ctx.fillRect(8, 13, 102, 7); ctx.fillStyle = '#f0e020'; ctx.fillRect(9, 14, Math.max(0, p.hp), 5);
        text(ctx, 'HI ' + pad(hi, 7), W - 8, 3, '#ff6060', 1, 'right');
        text(ctx, 'TIME', W / 2, 3, '#fff', 1, 'center'); text(ctx, pad(timer, 2), W / 2, 12, timer < 20 && (T & 16) ? '#ff4040' : '#fff', 2, 'center');
        if (lastFoe && (lastFoeT > 0 || lastFoe === bossOn) && !lastFoe.dead) {
          text(ctx, lastFoe.d.name, 8, 23, '#80e0ff');
          const w = Math.max(0, Math.round(100 * lastFoe.hp / lastFoe.max));
          ctx.fillStyle = '#400000'; ctx.fillRect(110, 23, 102, 7); ctx.fillStyle = lastFoe.d.boss ? '#ff6020' : '#f0e020'; ctx.fillRect(111, 24, w, 5);
        }
        if (p.weap) text(ctx, p.weap, W - 8, 23, '#c0c0c0', 1, 'right');
        if (goT > 0 && (T >> 3) & 1) { textS(ctx, 'GO', W - 50, 80, '#ffd040', 3); textS(ctx, '>', W - 22, 80, '#ffd040', 3); }
        if (demo) { textS(ctx, 'DEMO PLAY', W / 2, 60, '#ffd040', 1, 'center'); insertCoin(ctx, 72); }
      }
      function insertCoin(ctx, y) {
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (T >> 2) & 1 : (T >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, y, coinFlash ? '#ff4040' : '#fff', 1, 'center'); }
        else if ((T >> 5) & 1) text(ctx, 'PUSH START', W / 2, y, '#fff', 1, 'center');
      }
      function credit(ctx) { text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), W - 8, H - 10, '#fff', 1, 'right'); }
      function drawWorld(ctx) {
        drawBG(ctx);
        const ox = -Math.round(cam);
        const list = [];
        for (const o of objs) if (!o.broken) list.push({ y: o.y, f: () => drawObj(ctx, o, ox) });
        for (const it of items) list.push({ y: it.y - 0.5, f: () => drawItem(ctx, it, ox) });
        for (const e of enemies) list.push({ y: e.y + (e.st === 'thrown' || e.st === 'thrown2' ? 1 : 0), f: () => drawActor(ctx, e, ox) });
        if (p) list.push({ y: p.y + 0.1, f: () => drawActor(ctx, p, ox) });
        for (const s of shots) list.push({ y: s.y, f: () => drawShot(ctx, s, ox) });
        list.sort((a, b) => a.y - b.y);
        for (const q of list) q.f();
        for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x + ox), Math.round(q.y), 3, 3); }
        for (const q of pops) text(ctx, q.s, Math.round(q.x + ox), Math.round(q.y - (50 - q.t) * 0.4), '#fff', 1, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#080810'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 12; i++) { const h = 40 + ((i * 53) % 70); ctx.fillStyle = '#181828'; ctx.fillRect(i * 34, H - 40 - h, 30, h); for (let k = 0; k < 6; k++) if ((i + k) % 3) { ctx.fillStyle = '#c0a040'; ctx.fillRect(i * 34 + 6 + (k % 2) * 12, H - 34 - h + (k >> 1) * 14, 5, 6); } }
        ctx.fillStyle = '#303030'; ctx.fillRect(0, H - 40, W, 40);
        textS(ctx, 'FINAL', W / 2, 24, '#ffd020', 5, 'center', '#a01000');
        textS(ctx, 'FIGHT', W / 2, 64, '#ffd020', 5, 'center', '#a01000');
        HEROES.forEach((h, i) => drawBody(ctx, h, (T >> 5) % 3 === i ? PO.hook : PO.guard, 110 + i * 82, 196, 1, 0));
        insertCoin(ctx, 110);
        text(ctx, '\u00a9 CAPCOM 1989  (TRIBUTE)', W / 2, H - 22, '#c0c0c0', 1, 'center');
        credit(ctx);
      }
      function drawStory(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const lines = ['METRO CITY...', 'THE MAD GEAR GANG HAS', 'KIDNAPPED JESSICA, THE', 'DAUGHTER OF MAYOR HAGGAR.', '', 'HAGGAR, CODY AND GUY', 'TAKE TO THE STREETS', 'TO GET HER BACK!'];
        const n = Math.min(lines.length, Math.floor(mt / 30));
        for (let i = 0; i < n; i++) text(ctx, lines[i], W / 2, 40 + i * 14, i < 4 ? '#fff' : '#ffd040', 1, 'center');
        drawBody(ctx, ET.damnd, PO.win, 70, 200, 1, 0);
        insertCoin(ctx, 170); credit(ctx);
      }
      function drawRank(ctx) {
        ctx.fillStyle = '#000018'; ctx.fillRect(0, 0, W, H);
        textS(ctx, 'MAD GEAR MOST WANTED', W / 2, 10, '#ffd040', 2, 'center');
        ['damnd', 'sodom', 'edie', 'rolento', 'abigail', 'belger'].forEach((k, i) => {
          const x = 40 + i * 61; drawBody(ctx, ET[k], PO.guard, x, 140, 1, 0); text(ctx, ET[k].name, x, 146, '#fff', 1, 'center'); text(ctx, String(ET[k].pts), x, 156, '#80c0ff', 1, 'center');
        });
        text(ctx, 'HI-SCORE ' + pad(hi, 7), W / 2, 180, '#ff6060', 1, 'center');
        insertCoin(ctx, 196); credit(ctx);
      }
      function drawSelect(ctx) {
        ctx.fillStyle = '#100808'; ctx.fillRect(0, 0, W, H);
        textS(ctx, 'PLAYER SELECT', W / 2, 12, '#ffd040', 2, 'center');
        HEROES.forEach((h, i) => {
          const x = 72 + i * 120;
          ctx.fillStyle = i === sel ? '#602010' : '#281818'; ctx.fillRect(x - 50, 36, 100, 150);
          if (i === sel) { ctx.strokeStyle = (T >> 3) & 1 ? '#ff4040' : '#ffd040'; ctx.lineWidth = 2; ctx.strokeRect(x - 50, 36, 100, 150); }
          drawBody(ctx, h, i === sel && (T >> 4) & 1 ? PO.hook : PO.guard, x, 150, 1, 0);
          text(ctx, h.name, x, 158, '#fff', 2, 'center');
          text(ctx, 'POW ' + '*'.repeat(Math.round(h.pow * 3)), x - 40, 176, '#ffd040');
        });
        text(ctx, HEROES[sel].desc, W / 2, 196, '#80e0ff', 1, 'center');
        text(ctx, 'BEST WEAPON: ' + HEROES[sel].best, W / 2, 206, '#c0c0c0', 1, 'center');
      }
      function render(ctx) {
        ctx.save();
        if (shake) ctx.translate(0, ((T & 1) ? 1 : -1) * Math.min(3, shake));
        switch (mode) {
          case 'title': drawTitle(ctx); break;
          case 'story': drawStory(ctx); break;
          case 'rank': drawRank(ctx); break;
          case 'select': drawSelect(ctx); break;
          case 'intro':
            drawWorld(ctx); drawHUD(ctx);
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 80, W, 50);
            textS(ctx, 'ROUND ' + (stage + 1), W / 2, 88, '#ffd040', 2, 'center'); text(ctx, STAGES[stage].name, W / 2, 112, '#fff', 1, 'center');
            break;
          case 'play': drawWorld(ctx); drawHUD(ctx); if (p.st === 'held' && (T >> 3) & 1) text(ctx, 'SHAKE FREE!', p.x - cam, p.y - 90, '#ff4040', 1, 'center'); break;
          case 'clear':
            drawWorld(ctx); drawHUD(ctx);
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 70, W - 80, 70);
            textS(ctx, 'ROUND ' + (stage + 1) + ' CLEAR', W / 2, 78, '#ffd040', 2, 'center');
            if (clearT > 60) { text(ctx, 'TIME BONUS   ' + timer * 100, W / 2, 104, '#fff', 1, 'center'); text(ctx, 'VITAL BONUS  ' + p.hp * 100, W / 2, 118, '#fff', 1, 'center'); }
            break;
          case 'ending':
            ctx.fillStyle = '#100820'; ctx.fillRect(0, 0, W, H);
            drawBody(ctx, HEROES[hero], PO.win, W / 2 - 30, 190, 1, 0);
            drawBody(ctx, { hair: 'pink', hc: '#f0d040', sk: '#f4c8a0', th: '#f0f0f0', sh: '#f4c8a0', ft: '#c02020', to: '#ff80a0', ua: '#f4c8a0', fa: '#f4c8a0', ha: '#f4c8a0', bl: '#ff80a0', sc: 0.95, wd: 0.8 }, PO.stand, W / 2 + 30, 190, -1, 0);
            textS(ctx, 'JESSICA IS SAFE!', W / 2, 30, '#ffd040', 2, 'center');
            text(ctx, 'THE MAD GEAR GANG IS FINISHED.', W / 2, 56, '#fff', 1, 'center');
            text(ctx, 'METRO CITY IS PEACEFUL AGAIN.', W / 2, 68, '#fff', 1, 'center');
            text(ctx, 'SCORE ' + pad(score, 7), W / 2, 206, '#ffd040', 1, 'center');
            break;
          case 'gameover':
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
            textS(ctx, 'GAME OVER', W / 2, 90, '#ff3020', 3, 'center'); text(ctx, 'SCORE ' + pad(score, 7), W / 2, 130, '#fff', 1, 'center'); credit(ctx);
            break;
        }
        ctx.restore();
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
