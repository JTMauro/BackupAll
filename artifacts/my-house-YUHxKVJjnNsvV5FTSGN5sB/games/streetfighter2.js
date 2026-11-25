// Street Fighter II: The World Warrior (Capcom, 1991) -- from-scratch tribute.
// 8 world warriors with motion & charge specials, 4 grand masters, best of 3 rounds, car-smashing bonus stage.
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
  const W = 384, H = 224, GY = 206, STW = 640, MAXHP = 150;

  // ---------- roster ----------
  // colours: sk skin, th thigh, sh shin, ft foot, to torso, ua upper arm, fa forearm, ha hand, bl belt
  const CH = [
    { id: 'ryu', name: 'RYU', land: 'JAPAN', hair: 'band', hc: '#302010', sk: '#f0b080', th: '#f0f0e6', sh: '#f0f0e6', ft: '#f0b080', to: '#f0f0e6', ua: '#f0f0e6', fa: '#f0b080', ha: '#b02818', bl: '#202020', sc: 1, wd: 1, spd: 1.6, sp: ['shoryu', 'hado', 'tatsu'], stage: 0, quote: 'YOU MUST DEFEAT SHENG LONG TO STAND A CHANCE.' },
    { id: 'honda', name: 'E.HONDA', land: 'JAPAN', hair: 'knot', hc: '#101010', sk: '#f0b080', th: '#3050c0', sh: '#f0b080', ft: '#f0b080', to: '#f0b080', ua: '#f0b080', fa: '#f0b080', ha: '#f0b080', bl: '#3050c0', sc: 1.15, wd: 1.7, spd: 1.3, sp: ['slap', 'headbutt'], stage: 1, quote: 'CAN\'T YOU DO BETTER THAN THAT?' },
    { id: 'blanka', name: 'BLANKA', land: 'BRAZIL', hair: 'mane', hc: '#ff7020', sk: '#48b040', th: '#d08020', sh: '#48b040', ft: '#48b040', to: '#48b040', ua: '#48b040', fa: '#48b040', ha: '#48b040', bl: '#704010', sc: 1.05, wd: 1.25, spd: 1.7, sp: ['thunder', 'roll'], stage: 2, quote: 'SEEING YOU IN ACTION IS A JOKE.' },
    { id: 'guile', name: 'GUILE', land: 'U.S.A.', hair: 'flat', hc: '#f0e060', sk: '#f0c090', th: '#506838', sh: '#506838', ft: '#3a2810', to: '#5a7a30', ua: '#f0c090', fa: '#f0c090', ha: '#f0c090', bl: '#3a2810', sc: 1.05, wd: 1.1, spd: 1.5, sp: ['sonic', 'flash'], stage: 3, quote: 'GO HOME AND BE A FAMILY MAN!' },
    { id: 'ken', name: 'KEN', land: 'U.S.A.', hair: 'long', hc: '#f0d040', sk: '#f0b080', th: '#e02018', sh: '#e02018', ft: '#f0b080', to: '#e02018', ua: '#e02018', fa: '#f0b080', ha: '#801808', bl: '#202020', sc: 1, wd: 1, spd: 1.65, sp: ['shoryu', 'hado', 'tatsu'], stage: 4, quote: 'ATTACK ME IF YOU DARE, I WILL CRUSH YOU.' },
    { id: 'chunli', name: 'CHUN-LI', land: 'CHINA', hair: 'buns', hc: '#3a1a10', sk: '#f4c8a0', th: '#b07850', sh: '#b07850', ft: '#f4f4f4', to: '#2050d0', ua: '#2050d0', fa: '#f4c8a0', ha: '#e8e8e8', bl: '#f0c020', sc: 0.95, wd: 0.85, spd: 2.0, sp: ['legs', 'bird'], stage: 5, quote: 'I\'M THE STRONGEST WOMAN IN THE WORLD.' },
    { id: 'zangief', name: 'ZANGIEF', land: 'U.S.S.R.', hair: 'mohawk', hc: '#c02010', sk: '#e8a070', th: '#d02020', sh: '#e8a070', ft: '#d02020', to: '#e8a070', ua: '#e8a070', fa: '#e8a070', ha: '#ffd020', bl: '#ffd020', sc: 1.2, wd: 1.45, spd: 1.2, sp: ['lariat', 'spd'], stage: 6, tough: 0.85, quote: 'MY STRENGTH IS MUCH GREATER THAN YOURS.' },
    { id: 'dhalsim', name: 'DHALSIM', land: 'INDIA', hair: 'bald', hc: '#000', sk: '#7a4018', th: '#f0a020', sh: '#7a4018', ft: '#7a4018', to: '#7a4018', ua: '#7a4018', fa: '#7a4018', ha: '#f0d040', bl: '#f0a020', sc: 1.05, wd: 0.75, spd: 1.2, reach: 1.9, sp: ['yfire', 'yflame'], stage: 7, quote: 'I WILL MEDITATE AND THEN DESTROY YOU.' },
    { id: 'balrog', name: 'BALROG', land: 'U.S.A.', hair: 'short', hc: '#101010', sk: '#6a3c1c', th: '#2040d0', sh: '#6a3c1c', ft: '#f0f0f0', to: '#2040d0', ua: '#6a3c1c', fa: '#6a3c1c', ha: '#d02020', bl: '#f0f0f0', sc: 1.12, wd: 1.35, spd: 1.6, sp: ['dash'], stage: 8, boss: 1, quote: 'MY FISTS HAVE YOUR BLOOD ON THEM.' },
    { id: 'vega', name: 'VEGA', land: 'SPAIN', hair: 'mask', hc: '#6a3a1a', sk: '#f0c090', th: '#8030a0', sh: '#8030a0', ft: '#f0d040', to: '#f0c090', ua: '#f0c090', fa: '#f0c090', ha: '#c8c8d8', bl: '#d02020', sc: 1.05, wd: 0.95, spd: 2.0, sp: ['crystal'], stage: 9, boss: 1, claw: 1, quote: 'HANDSOME FIGHTERS NEVER LOSE BATTLES.' },
    { id: 'sagat', name: 'SAGAT', land: 'THAILAND', hair: 'patch', hc: '#000', sk: '#b07040', th: '#3a50a0', sh: '#b07040', ft: '#b07040', to: '#b07040', ua: '#b07040', fa: '#b07040', ha: '#e8e8e8', bl: '#e8c040', sc: 1.25, wd: 1.2, spd: 1.4, sp: ['tigerup', 'tiger'], stage: 10, boss: 1, quote: 'YOU ARE NOT A WARRIOR, YOU ARE A BEGINNER.' },
    { id: 'bison', name: 'M.BISON', land: 'THAILAND', hair: 'cap', hc: '#c02030', sk: '#f0c090', th: '#c02030', sh: '#c02030', ft: '#202020', to: '#c02030', ua: '#c02030', fa: '#c02030', ha: '#f0f0f0', bl: '#f0c020', sc: 1.12, wd: 1.15, spd: 1.7, sp: ['psycho', 'scissor'], stage: 11, boss: 1, cape: 1, quote: 'GET LOST, YOU CAN\'T COMPARE WITH MY POWERS!' }
  ];
  const NPLAY = 8;

  // ---------- moves ----------
  const ATK = {
    lp: { s: 3, a: 3, r: 6, x: [8, 40], y: [56, 70], d: 6, l: 'mid', hs: 12, pu: 2.5, po: 'lp', lim: 'arm' },
    hp: { s: 6, a: 4, r: 14, x: [8, 46], y: [54, 72], d: 18, l: 'mid', hs: 20, pu: 3.5, po: 'hp', lim: 'arm' },
    lk: { s: 4, a: 3, r: 8, x: [8, 44], y: [30, 50], d: 7, l: 'mid', hs: 13, pu: 2.5, po: 'lk', lim: 'leg' },
    hk: { s: 8, a: 4, r: 16, x: [8, 52], y: [50, 76], d: 20, l: 'mid', hs: 20, pu: 4, po: 'hk', lim: 'leg' },
    clp: { s: 3, a: 3, r: 6, x: [8, 40], y: [28, 42], d: 5, l: 'mid', hs: 11, pu: 2, po: 'clp', lim: 'arm' },
    chp: { s: 5, a: 5, r: 14, x: [2, 34], y: [40, 98], d: 16, l: 'mid', hs: 20, pu: 3, po: 'chp', lim: 'arm' },
    clk: { s: 4, a: 3, r: 8, x: [8, 46], y: [0, 14], d: 6, l: 'low', hs: 12, pu: 2, po: 'clk', lim: 'leg' },
    chk: { s: 7, a: 5, r: 18, x: [8, 56], y: [0, 14], d: 16, l: 'low', hs: 20, pu: 2, kd: 1, po: 'chk', lim: 'leg' },
    jlp: { s: 3, a: 12, r: 0, x: [4, 36], y: [20, 50], d: 9, l: 'high', hs: 14, pu: 2, po: 'jlp', lim: 'arm' },
    jhp: { s: 5, a: 8, r: 0, x: [4, 42], y: [14, 50], d: 18, l: 'high', hs: 20, pu: 3, po: 'jhp', lim: 'arm' },
    jlk: { s: 3, a: 14, r: 0, x: [2, 40], y: [-4, 30], d: 10, l: 'high', hs: 14, pu: 2, po: 'jlk', lim: 'leg' },
    jhk: { s: 5, a: 8, r: 0, x: [4, 48], y: [-4, 30], d: 19, l: 'high', hs: 20, pu: 3, po: 'jhk', lim: 'leg' }
  };
  const SP = {
    hado: { ty: 'proj', st: 12, rec: 46, v: 3, d: 15, cols: ['#3a7cff', '#b8dcff', '#ffffff'], shape: 'ball', y: 50 },
    yfire: { ty: 'proj', st: 14, rec: 50, v: 2, d: 15, cols: ['#ff4010', '#ffa020', '#fff060'], shape: 'flame', y: 50 },
    tiger: { ty: 'proj', st: 10, rec: 42, v: 3.4, d: 15, cols: ['#ff9010', '#ffd040', '#fff8c0'], shape: 'ball', y: 58 },
    sonic: { ty: 'proj', st: 8, rec: 32, v: 3.6, d: 14, cols: ['#ffd060', '#ffffff', '#ffffff'], shape: 'sonic', y: 52 },
    shoryu: { ty: 'rise', d: 22, vy: -7.6, vx: 1.6, inv: 9, po: 'upper' },
    tigerup: { ty: 'rise', d: 24, vy: -7.2, vx: 1.2, inv: 9, po: 'upper' },
    flash: { ty: 'rise', d: 22, vy: -7, vx: -0.6, inv: 10, po: 'flash', flip: 1 },
    tatsu: { ty: 'spin', d: 16, dur: 46, vx: 2.6, lift: 22, hits: 2, po: 'tatsu', y: [40, 76], x: [-10, 44] },
    bird: { ty: 'spin', d: 8, dur: 54, vx: 2.1, lift: 26, hits: 3, po: 'bird', y: [40, 80], x: [-36, 36] },
    slap: { ty: 'multi', d: 5, dur: 42, ev: 6, po: 'slap', x: [10, 50], y: [44, 76] },
    thunder: { ty: 'multi', d: 5, dur: 42, ev: 6, po: 'thunder', x: [-30, 42], y: [0, 70] },
    legs: { ty: 'multi', d: 5, dur: 42, ev: 6, po: 'legs', x: [10, 52], y: [40, 80] },
    headbutt: { ty: 'dash', d: 18, dur: 34, st: 6, vx: 5.4, po: 'dash', y: [30, 70] },
    roll: { ty: 'dash', d: 17, dur: 36, st: 8, vx: 5.6, po: 'ball', y: [6, 38] },
    psycho: { ty: 'dash', d: 20, dur: 34, st: 8, vx: 5.8, po: 'dash', y: [30, 70], fire: 1 },
    crystal: { ty: 'dash', d: 17, dur: 34, st: 6, vx: 5.4, po: 'ball', y: [6, 38] },
    dash: { ty: 'dash', d: 18, dur: 26, st: 4, vx: 5, po: 'hp', y: [44, 76] },
    scissor: { ty: 'dash', d: 16, dur: 30, st: 6, vx: 4.2, po: 'lk', y: [30, 70], hop: 1 },
    lariat: { ty: 'lariat', d: 12, dur: 50, po: 'lariat', x: [-46, 46], y: [48, 76] },
    spd: { ty: 'grab', d: 36, po: 'grab' },
    yflame: { ty: 'flame', d: 18, dur: 34, po: 'fire', x: [16, 70], y: [46, 72] }
  };
  const PROJ_SP = ['hado', 'yfire', 'tiger', 'sonic'], AA_SP = ['shoryu', 'tigerup', 'flash'];
  const DASH_SP = ['headbutt', 'roll', 'psycho', 'crystal', 'dash', 'scissor', 'tatsu', 'bird'];
  const CLOSE_SP = ['slap', 'thunder', 'legs', 'lariat', 'spd', 'yflame'];

  // ---------- poses (degrees; 0 = straight down, + = toward facing) ----------
  const G = { bu: 30, bf: 110, fu: 55, ff: 85 };
  const base = { ln: 4, bt: -18, bs: 6, ft: 18, fs: -14 };
  const CR = { ln: 18, bt: 40, bs: -125, ft: 80, fs: -115, bu: 40, bf: 100, fu: 60, ff: 80 };
  const JP = { ln: 10, bt: 60, bs: -120, ft: 90, fs: -110, bu: 60, bf: 90, fu: 80, ff: 70 };
  const PO = {
    stand: Object.assign({}, base, G),
    walk1: Object.assign({}, G, { ln: 6, bt: -26, bs: 10, ft: 26, fs: -8 }),
    walk2: Object.assign({}, G, { ln: 6, bt: 6, bs: -24, ft: -4, fs: -12 }),
    crouch: CR, jump: JP,
    lp: Object.assign({}, base, { ln: 8, bu: 40, bf: 110, fu: 90, ff: 0 }),
    hp: { ln: 18, bt: -25, bs: 5, ft: 32, fs: -10, bu: 20, bf: 120, fu: 92, ff: 0 },
    lk: { ln: -6, bt: -10, bs: 0, ft: 82, fs: -4, bu: 30, bf: 110, fu: 40, ff: 100 },
    hk: { ln: -22, bt: -5, bs: 0, ft: 118, fs: -4, bu: 20, bf: 110, fu: -20, ff: 60 },
    clp: Object.assign({}, CR, { fu: 90, ff: 0 }),
    chp: Object.assign({}, CR, { ln: 6, fu: 172, ff: -4 }),
    clk: { ln: 12, bt: 40, bs: -125, ft: 86, fs: -4, bu: 40, bf: 100, fu: 60, ff: 80 },
    chk: { ln: 34, bt: 45, bs: -130, ft: 94, fs: -4, bu: 10, bf: 20, fu: 20, ff: 30 },
    jlp: Object.assign({}, JP, { fu: 110, ff: 0 }),
    jhp: Object.assign({}, JP, { ln: 20, fu: 122, ff: -8 }),
    jlk: Object.assign({}, JP, { ft: 100, fs: -10 }),
    jhk: { ln: -10, bt: 60, bs: -120, ft: 112, fs: 0, bu: 60, bf: 90, fu: 30, ff: 60 },
    hit: { ln: -25, bt: -10, bs: 5, ft: 20, fs: -5, bu: -40, bf: 30, fu: -20, ff: 40 },
    block: { ln: -6, bt: -18, bs: 6, ft: 14, fs: -12, bu: 20, bf: 150, fu: 35, ff: 140 },
    cblock: Object.assign({}, CR, { ln: 0, bu: 20, bf: 150, fu: 35, ff: 140 }),
    windup: { ln: -6, bt: -30, bs: 10, ft: 30, fs: -20, bu: -60, bf: 70, fu: -50, ff: 80 },
    fire: { ln: 18, bt: -35, bs: 10, ft: 35, fs: -20, bu: 85, bf: 5, fu: 88, ff: 0 },
    upper: { ln: -6, bt: -5, bs: 0, ft: 70, fs: -100, bu: 20, bf: 90, fu: 176, ff: 0 },
    flash: { ln: -10, bt: 20, bs: -90, ft: 165, fs: 0, bu: 80, bf: 30, fu: 60, ff: 30 },
    tatsu: { ln: 0, bt: 10, bs: -60, ft: 90, fs: 0, bu: 100, bf: 30, fu: 80, ff: 40 },
    bird: { ln: 0, bt: -90, bs: 0, ft: 90, fs: 0, bu: 175, bf: 0, fu: 178, ff: 0 },
    slap: { ln: 14, bt: -30, bs: 10, ft: 30, fs: -20, bu: 80, bf: 0, fu: 95, ff: 0 },
    thunder: Object.assign({}, CR, { ln: 0, bu: 150, bf: 20, fu: 150, ff: 20 }),
    legs: { ln: -18, bt: 0, bs: 0, ft: 95, fs: 0, bu: -40, bf: 20, fu: -30, ff: 30 },
    dash: { ln: 0, bt: -14, bs: 4, ft: 12, fs: -4, bu: 176, bf: 0, fu: 178, ff: 0 },
    lariat: { ln: 0, bt: -20, bs: 8, ft: 20, fs: -8, bu: -92, bf: 0, fu: 92, ff: 0 },
    grab: Object.assign({}, base, { ln: 12, bu: 80, bf: 30, fu: 82, ff: 30 }),
    win: { ln: 0, bt: -10, bs: 0, ft: 10, fs: 0, bu: 20, bf: 30, fu: 180, ff: 0 },
    dizzy: { ln: -8, bt: -12, bs: 4, ft: 12, fs: -4, bu: 10, bf: 10, fu: 5, ff: 10 },
    throwp: { ln: -20, bt: -25, bs: 5, ft: 30, fs: -10, bu: 150, bf: 10, fu: 160, ff: 0 }
  };

  ArcadeRegistry.register({
    id: 'streetfighter2', title: 'Street Fighter II: The World Warrior', year: 1991, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move/jump/crouch (hold back = block) \u00b7 Space: punch, X: kick (tap = light, hold = heavy) \u00b7 Z/C: heavy P/K \u00b7 Enter: start',
    marquee: { bg: '#100818', fg: '#ffd020', accent: '#e02018' },
    create(api) {
      const A = api.audio;
      const sfx = {
        whoosh: () => A.noise(0.07, { vol: 0.06, freq: 3500, type: 'highpass' }),
        hitL: () => { A.noise(0.08, { vol: 0.2, freq: 1400 }); A.tone(170, 0.06, { type: 'square', vol: 0.07, slideTo: 90 }); },
        hitH: () => { A.noise(0.2, { vol: 0.28, freq: 900, slideTo: 150 }); A.tone(120, 0.14, { type: 'square', vol: 0.11, slideTo: 45 }); },
        block: () => A.noise(0.05, { vol: 0.14, freq: 4500, type: 'bandpass' }),
        fire: () => { A.tone(260, 0.28, { type: 'sawtooth', vol: 0.09, slideTo: 620 }); A.noise(0.3, { vol: 0.08, freq: 900 }); },
        rise: () => A.tone(200, 0.3, { type: 'square', vol: 0.09, slideTo: 900 }),
        jump: () => A.noise(0.05, { vol: 0.05, freq: 1200 }),
        thud: () => { A.noise(0.25, { vol: 0.25, freq: 400, slideTo: 60 }); A.tone(70, 0.2, { type: 'sine', vol: 0.2, slideTo: 35 }); },
        ko: () => A.melody([[523, 0.1], [392, 0.1], [262, 0.12], [196, 0.4]], { type: 'square', vol: 0.14 }),
        bell: () => { A.tone(1046, 0.9, { type: 'triangle', vol: 0.14 }); A.tone(1568, 0.6, { type: 'sine', vol: 0.06 }); },
        fight: () => A.melody([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.25]], { type: 'square', vol: 0.12 }),
        sel: () => A.tone(880, 0.05, { type: 'square', vol: 0.08 }),
        ok: () => A.melody([[659, 0.06], [880, 0.06], [1318, 0.15]], { type: 'square', vol: 0.12 }),
        coin: () => A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }),
        crash: () => { A.noise(0.35, { vol: 0.24, freq: 3000, slideTo: 300 }); A.tone(900, 0.08, { type: 'square', vol: 0.05, slideTo: 300 }); },
        win: () => A.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.12], [784, 0.12], [1046, 0.4]], { type: 'square', vol: 0.13 })
      };
      // little stage tunes: [lead semitones over A4 | null], bass roots
      const TUNES = [
        { m: [0, null, 3, 5, 7, null, 5, 3, 0, null, 3, 5, 10, null, 7, null], b: [0, 0, 0, 0, -2, -2, -4, -5] },
        { m: [7, 7, null, 5, 3, null, 5, 7, 12, null, 10, 7, 5, null, 3, null], b: [0, 0, 5, 5, 3, 3, -2, -2] },
        { m: [0, 3, 7, 3, 10, 7, 3, 7, 0, 3, 8, 3, 7, 3, 2, null], b: [0, 0, -4, -4, -2, -2, -5, -5] },
        { m: [12, null, 7, null, 10, null, 5, 7, 8, null, 7, null, 3, 5, 7, null], b: [0, 0, 3, 3, 5, 5, -2, -2] }
      ];
      let musStep = 0, musT = 0;
      function music(tune) {
        if (++musT < 9) return; musT = 0;
        const t = TUNES[tune % TUNES.length], i = musStep++ % 16;
        const n = t.m[i];
        if (n != null) A.tone(440 * Math.pow(2, n / 12), 0.12, { type: 'square', vol: 0.035 });
        if (i % 2 === 0) A.tone(110 * Math.pow(2, t.b[(i >> 1) % 8] / 12), 0.14, { type: 'triangle', vol: 0.09 });
      }

      let mode = 'title', T = 0, mt = 0, score = 0, hi = api.getHiScore(50000), lastCred = api.credits, coinFlash = 0;
      let P = null, E = null, demo = false, ladder = [], lpos = 0, round = 1, timer = 99, tick = 0, rp = 'intro', rt = 0;
      let freeze = 0, slow = 0, cam = STW / 2 - W / 2, shake = 0, projs = [], sparks = [], parts = [], msgs = [];
      let selIdx = 0, selT = 0, pChar = 0, combo = 0, comboT = 0, perfect = false, roundMsg = '', bonusCar = null, bonusMsg = '';

      // ---------- fighters ----------
      function mkF(ci, x, face, cpu, lv) {
        return {
          ci, c: CH[ci], x, y: 0, vx: 0, vy: 0, face, hp: MAXHP, dhp: MAXHP, st: 'stand', t: 0, anim: 0,
          atk: null, spec: null, req: null, reqT: 0, dir: 5, buf: [], cpu, inv: 0, airAtk: false, hitT: 0,
          chB: 0, chD: 0, bReady: 0, dReady: 0, pressP: [], pressK: [], lastP: -99, lastK: -99, pend: null,
          proj: null, stun: 0, dz: 0, wins: 0, thr: null,
          ai: { lv: lv || 0, hold: 0, dir: 5, cool: 30, walk: 5, seen: null }
        };
      }
      const isAir = f => f.y > 0 || f.st === 'jump';
      const actable = f => f.st === 'stand' || f.st === 'walk' || f.st === 'crouch';
      function hurt(f) {
        if (f.isCar) return [f.x - 58, f.x + 58, 0, 74];
        const s = f.c.sc, hw = 12 * Math.min(1.4, f.c.wd) * s;
        let h = 80 * s;
        if (f.st === 'crouch' || (f.st === 'attack' && f.atk && f.atk.n[0] === 'c') || f.st === 'cblock' || (f.st === 'block' && f.dir <= 3)) h = 52 * s;
        else if (f.st === 'jump') h = 62 * s;
        else if (f.st === 'special' && f.spec && (SP[f.spec.id].po === 'ball' || SP[f.spec.id].po === 'dash')) h = 36;
        else if (f.st === 'down' || f.st === 'ko') h = 14;
        return [f.x - hw, f.x + hw, f.y, f.y + h];
      }

      // ---------- input ----------
      function seq(f, steps, win) {
        const b = f.buf; let s = 0;
        for (let i = Math.max(0, b.length - win); i < b.length && s < steps.length; i++) if (steps[s].indexOf(b[i]) >= 0) s++;
        return s === steps.length;
      }
      const QCF = f => seq(f, [[2], [3, 6]], 16), DP = f => seq(f, [[6, 3], [2, 1], [3, 6]], 16), QCB = f => seq(f, [[2], [1, 4]], 16);
      function mash(f, arr) { const n = arr.filter(t => T - t < 28).length; return n >= 3; }
      function trySpecial(f, b) {
        const near = Math.abs(E && P ? (f === P ? E.x - P.x : P.x - E.x) : 999) < 46;
        for (const id of f.c.sp) {
          let ok = false;
          switch (id) {
            case 'hado': case 'yfire': case 'tiger': ok = b === 'p' && QCF(f); break;
            case 'shoryu': case 'tigerup': ok = b === 'p' && DP(f); break;
            case 'tatsu': ok = b === 'k' && QCB(f); break;
            case 'yflame': ok = b === 'p' && QCB(f); break;
            case 'slap': case 'thunder': ok = b === 'p' && mash(f, f.pressP); break;
            case 'legs': ok = b === 'k' && mash(f, f.pressK); break;
            case 'headbutt': case 'roll': case 'sonic': case 'dash': case 'psycho': case 'crystal': ok = b === 'p' && f.bReady > 0 && f.dir % 3 === 0; break;
            case 'scissor': ok = b === 'k' && f.bReady > 0 && f.dir % 3 === 0; break;
            case 'flash': case 'bird': ok = b === 'k' && f.dReady > 0 && f.dir >= 7; break;
            case 'lariat': ok = (b === 'p' && T - f.lastK <= 5) || (b === 'k' && T - f.lastP <= 5); break;
            case 'spd': ok = b === 'p' && near && (QCB(f) || QCF(f)); break;
          }
          if (ok) return id;
        }
        return null;
      }
      function readPlayer(f) {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const hx = (R ? 1 : 0) - (L ? 1 : 0);
        f.dir = 5 + hx * f.face + (U ? 3 : D ? -3 : 0);
        const pP = api.pressed('Space'), pK = api.pressed('KeyX'), pHP = api.pressed('KeyZ'), pHK = api.pressed('KeyC');
        if (f.st === 'dizzy' && (pP || pK || api.anyPressed('ArrowLeft', 'ArrowRight'))) f.dz -= 6;
        if (pP || pHP) { f.pressP.push(T); f.lastP = T; }
        if (pK || pHK) { f.pressK.push(T); f.lastK = T; }
        if (f.pressP.length > 6) f.pressP.shift();
        if (f.pressK.length > 6) f.pressK.shift();
        let sp = null;
        if (pP || pHP) sp = trySpecial(f, 'p');
        if (!sp && (pK || pHK)) sp = trySpecial(f, 'k');
        if (sp) { f.req = sp; f.reqT = 6; f.pend = null; return; }
        if (pHP) { f.req = 'hp'; f.reqT = 6; f.pend = null; }
        else if (pHK) { f.req = 'hk'; f.reqT = 6; f.pend = null; }
        else if (pP) f.pend = { b: 'p', t: 0 };
        else if (pK) f.pend = { b: 'k', t: 0 };
        if (f.pend) {
          f.pend.t++;
          const held = f.pend.b === 'p' ? api.key('Space') : api.key('KeyX');
          // in the air, attacks come out on press (light) so jump-ins stay responsive
          if (!held || isAir(f)) { f.req = 'l' + f.pend.b; f.reqT = 6; f.pend = null; }
          else if (f.pend.t >= 7) { f.req = 'h' + f.pend.b; f.reqT = 6; f.pend = null; }
        }
      }
      function trackCharge(f) {
        const d = f.dir;
        if (d === 1 || d === 4 || d === 7) f.chB++; else { if (f.chB >= 34) f.bReady = 12; f.chB = 0; }
        if (d <= 3) f.chD++; else { if (f.chD >= 34) f.dReady = 12; f.chD = 0; }
        if (f.bReady > 0) f.bReady--;
        if (f.dReady > 0) f.dReady--;
        f.buf.push(d); if (f.buf.length > 30) f.buf.shift();
      }

      // ---------- CPU ----------
      function aiThink(f, o) {
        const a = f.ai, lv = a.lv;
        if (o.isCar) return;
        const dx = o.x - f.x, dist = Math.abs(dx);
        const has = list => f.c.sp.find(s => list.indexOf(s) >= 0);
        const projSp = has(PROJ_SP), aaSp = has(AA_SP), dashSp = has(DASH_SP), closeSp = has(CLOSE_SP);
        if (f.st === 'dizzy') { if (Math.random() < 0.1) f.dz -= 4; return; }
        if (f.st === 'jump') {
          if (!f.atk && !f.airAtk && f.vy > -1 && dist < 70 && Math.random() < 0.3) { f.req = Math.random() < 0.6 ? 'hk' : 'hp'; f.reqT = 4; }
          return;
        }
        if (f.st === 'block' || f.st === 'cblock') { f.dir = a.dir; return; }
        if (!actable(f)) { f.dir = 5; return; }
        if (a.hold > 0) { a.hold--; f.dir = a.dir; return; }
        f.dir = 5;
        // incoming projectile
        const pr = projs.find(p => p.owner === o && Math.sign(p.vx) === Math.sign(f.x - p.x) && Math.abs(p.x - f.x) < 120);
        if (pr && pr !== a.seen) {
          a.seen = pr;
          const r2 = Math.random();
          if (r2 < 0.25 + lv * 0.04) { f.dir = 8 + (Math.random() < 0.6 ? 1 : 0); }
          else if (projSp && !f.proj && r2 < 0.5 + lv * 0.03) { f.req = projSp; f.reqT = 4; }
          else if (r2 < 0.6 + lv * 0.04) { a.dir = 4; a.hold = 34; f.dir = 4; }
          return;
        }
        // opponent attack starting nearby
        const thr = (o.atk && o.st !== 'jump' && dist < 84) ? o.atk : (o.st === 'special' && dist < 120 ? o.spec : (o.st === 'jump' && o.atk && dist < 70 ? o.atk : null));
        if (thr && thr !== a.seen) {
          a.seen = thr;
          if (Math.random() < Math.min(0.85, 0.18 + lv * 0.07)) {
            const low = o.atk && o.atk.a && o.atk.a.l === 'low';
            a.dir = low ? 1 : 4; a.hold = 20; f.dir = a.dir; return;
          }
        }
        // anti-air
        if (o.st === 'jump' && dist < 100 && Math.sign(o.vx || 0) === Math.sign(f.x - o.x) && o.vy > -3 && o !== a.seen) {
          a.seen = o;
          if (Math.random() < 0.15 + lv * 0.06) { if (aaSp) f.req = aaSp; else { f.dir = 2; a.dir = 2; a.hold = 6; f.req = 'hp'; } f.reqT = 4; return; }
        }
        if (o.st !== 'jump' && a.seen === o) a.seen = null;
        if (--a.cool > 0) { f.dir = a.walk; return; }
        a.cool = 8 + rnd(Math.max(10, 40 - lv * 3)); a.walk = 5;
        const q = Math.random();
        const go = (d, h) => { a.dir = d; a.hold = h; f.dir = d; };
        if (dist > 150) {
          if (projSp && !f.proj && q < 0.4) f.req = projSp;
          else if (dashSp && q < 0.5 && dashSp !== 'bird') f.req = dashSp;
          else if (q < 0.62) f.dir = 9;
          else a.walk = 6;
        } else if (dist > 58) {
          if (q < 0.22) f.dir = 9;
          else if (projSp && !f.proj && q < 0.42) f.req = projSp;
          else if (dashSp && q < 0.55) f.req = dashSp;
          else if (q < 0.88) a.walk = 6; else a.walk = 4;
        } else {
          if (q < 0.12 && dist < 36 && o.y === 0) { f.dir = 6; f.req = 'hp'; }
          else if (closeSp && q < 0.3) f.req = closeSp;
          else if (aaSp && q < 0.36) f.req = aaSp;
          else if (q < 0.82) {
            const n = ['lp', 'lk', 'hp', 'hk'][rnd(4)];
            if (Math.random() < 0.4) go(2, 6);
            f.req = n;
          } else go(4, 18);
        }
        if (f.req) f.reqT = 4;
      }

      // ---------- actions ----------
      function startAction(f, o) {
        const n = f.req; f.req = null;
        if (SP[n]) { startSpecial(f, o, n); return; }
        let name = n;
        if (f.st === 'jump') { if (f.airAtk) return; name = 'j' + n; f.airAtk = true; }
        else {
          const dist = Math.abs(o.x - f.x);
          if ((n === 'hp' || n === 'hk') && f.dir !== 2 && f.dir > 3 && (f.dir === 6 || f.dir === 4) && !o.isCar && dist < 40 && o.y === 0 && o.inv === 0 &&
            (o.st === 'stand' || o.st === 'walk' || o.st === 'crouch')) { startThrow(f, o); return; }
          if (f.dir <= 3) name = 'c' + n;
          f.st = 'attack'; f.vx = 0;
        }
        f.atk = { n: name, a: ATK[name], t: 0, hit: false };
        f.t = 0; sfx.whoosh();
      }
      function startThrow(f, o) {
        f.st = 'throw'; f.t = 0; f.atk = null;
        o.st = 'thrown'; o.t = 0; o.atk = null; o.spec = null;
        o.thr = { x0: o.x, x1: clamp(f.x - f.face * 36, 30, STW - 30), by: f, dmg: 24 };
        sfx.hitL();
      }
      function startSpecial(f, o, id) {
        const s = SP[id];
        if (s.ty === 'proj' && f.proj) { f.req = null; return; }
        f.st = 'special'; f.t = 0; f.atk = null; f.vx = 0;
        f.spec = { id, s, t: 0, hits: 0, hitCd: 0, grab: false };
        if (s.ty === 'rise') { f.inv = s.inv; sfx.rise(); }
        if (s.ty === 'proj') sfx.fire();
        if (s.ty === 'dash' || s.ty === 'spin' || s.ty === 'lariat') sfx.whoosh();
      }
      function endMove(f) { f.st = f.y > 0 ? 'jump' : 'stand'; f.spec = null; f.atk = null; f.t = 0; if (f.y > 0) f.airAtk = true; }
      function dmgMul(f) { return f.cpu && !demo ? 0.85 + f.ai.lv * 0.03 : 1; }

      function runSpecial(f, o) {
        const sp = f.spec, s = sp.s; sp.t++;
        const t = sp.t;
        if (sp.hitCd > 0) sp.hitCd--;
        switch (s.ty) {
          case 'proj':
            if (t === s.st && !f.proj) {
              const p = { x: f.x + f.face * 30 * f.c.sc, y: s.y * f.c.sc, vx: f.face * s.v, owner: f, d: s.d, s, t: 0 };
              projs.push(p); f.proj = p;
            }
            if (t >= s.rec) endMove(f);
            break;
          case 'rise':
            if (t === 4) { f.vy = s.vy; f.vx = s.vx * f.face; f.y = 1; }
            if (t >= 4) {
              f.x += f.vx; f.y -= f.vy; f.vy += 0.38;
              if (t < 22 && sp.hits < 1) boxHit(f, o, [0, 34], [30, 100], { d: s.d, l: 'mid', hs: 20, pu: 2, kd: 1 }, sp);
              if (f.y <= 0) { f.y = 0; f.vy = 0; f.vx = 0; sp.land = (sp.land || 0) + 1; if (sp.land > 14) endMove(f); }
            }
            break;
          case 'spin':
            if (t < 6) break;
            if (t < s.dur) {
              f.y = Math.min(s.lift, f.y + 3); f.x += s.vx * f.face;
              if (sp.hitCd === 0 && sp.hits < s.hits) boxHit(f, o, s.x, s.y, { d: s.d, l: 'high', hs: 18, pu: 3, kd: sp.hits === s.hits - 1 ? 1 : 0 }, sp, 10);
            } else { f.y = Math.max(0, f.y - 3); if (f.y === 0) endMove(f); }
            break;
          case 'multi':
            if (t % s.ev === 0) { sp.hits = 0; sp.hitCd = 0; boxHit(f, o, s.x, s.y, { d: s.d, l: 'mid', hs: 10, pu: 1.2 }, sp); if (f.spec && f.spec.id === 'thunder') A.noise(0.05, { vol: 0.06, freq: 6000, type: 'highpass' }); else sfx.whoosh(); }
            if (t >= s.dur) endMove(f);
            break;
          case 'dash':
            if (t < s.st) break;
            if (t < s.dur) {
              f.x += s.vx * f.face;
              if (s.hop) f.y = Math.max(0, Math.sin((t - s.st) / (s.dur - s.st) * Math.PI) * 30);
              if (sp.hits < 1 && boxHit(f, o, [-6, 30], s.y, { d: s.d, l: 'mid', hs: 22, pu: 3, kd: 1 }, sp)) { sp.t = s.dur; sp.bounce = 1; }
            } else {
              f.y = 0;
              if (sp.bounce) f.x -= f.face * 1.5;
              if (t > s.dur + 10) endMove(f);
            }
            break;
          case 'lariat':
            if (f.cpu ? Math.random() < 0.5 : true) { const m = (f.dir === 6 || f.dir === 3 || f.dir === 9) ? 1 : (f.dir === 4 || f.dir === 1 || f.dir === 7) ? -1 : 0; f.x += m * f.face * 1.3; }
            if (t % 14 === 0) { sp.hits = 0; boxHit(f, o, s.x, s.y, { d: s.d, l: 'mid', hs: 18, pu: 3, kd: 1 }, sp); sfx.whoosh(); }
            if (t >= s.dur) endMove(f);
            break;
          case 'grab':
            if (t === 3) {
              const dist = Math.abs(o.x - f.x);
              if (!o.isCar && dist < 48 && o.y === 0 && o.inv === 0 && (o.st === 'stand' || o.st === 'walk' || o.st === 'crouch' || o.st === 'attack' || o.st === 'block' || o.st === 'dizzy')) {
                sp.grab = true; f.inv = 70; o.st = 'held'; o.atk = null; o.spec = null; f.vy = -6.5; f.y = 1; sfx.hitL();
              }
            }
            if (sp.grab) {
              if (f.y > 0) { f.y -= f.vy; f.vy += 0.3; if (f.y <= 0) f.y = 0; }
              o.x = f.x; o.y = f.y + 20; o.t++;
              if (f.y === 0 && t > 8) {
                o.y = 0; o.t = 0; o.vx = 0; dealDamage(o, Math.round(s.d * dmgMul(f)), f); o.st = o.hp <= 0 ? 'ko' : 'down'; shake = 14; sfx.thud(); sp.grab = false; sp.done = t;
              }
            }
            if ((!sp.grab && t > 34) || (sp.done && t > sp.done + 16)) endMove(f);
            break;
          case 'flame':
            if (t >= 8 && t <= 24) { if (t % 8 === 0) { sp.hits = 0; } boxHit(f, o, s.x, s.y, { d: s.d / 2, l: 'mid', hs: 18, pu: 2.5, kd: 1 }, sp, 8); }
            if (t >= s.dur) endMove(f);
            break;
        }
      }
      // attacker-relative box test -> hit
      function boxHit(f, o, bx, by, h, holder, cd) {
        if (holder.hits >= 9 || (holder.hitCd && holder.hitCd > 0)) return false;
        const x0 = f.x + f.face * bx[0], x1 = f.x + f.face * bx[1];
        const ax0 = Math.min(x0, x1), ax1 = Math.max(x0, x1), ay0 = f.y + by[0] * f.c.sc, ay1 = f.y + by[1] * f.c.sc;
        const hb = hurt(o);
        if (ax1 < hb[0] || ax0 > hb[1] || ay1 < hb[2] || ay0 > hb[3]) return false;
        const r = applyHit(f, o, h, (f.face > 0 ? Math.max(ax0, hb[0]) : Math.min(ax1, hb[1])), Math.min(ay1, hb[3]) - 6);
        if (r) { holder.hits++; if (cd) holder.hitCd = cd; }
        return !!r;
      }
      function canBlock(d, lvl) {
        if (d.y > 0 || d.cpu === undefined) return false;
        if (!(d.st === 'stand' || d.st === 'walk' || d.st === 'crouch' || d.st === 'block' || d.st === 'cblock')) return false;
        const back = d.dir === 1 || d.dir === 4 || d.dir === 7;
        if (!back) return false;
        if (lvl === 'low') return d.dir === 1;
        if (lvl === 'high') return d.dir !== 1;
        return true;
      }
      function applyHit(f, o, h, sx, sy) {
        if (o.isCar) { hitCar(o, h.d, sx, sy); freeze = 4; return 'hit'; }
        if (o.inv > 0 || o.st === 'down' || o.st === 'rise' || o.st === 'ko' || o.st === 'thrown' || o.st === 'held' || (o.st === 'fall' && !h.juggle)) return false;
        if (canBlock(o, h.l)) {
          o.st = o.dir === 1 ? 'cblock' : 'block'; o.hitT = h.hs - 4; o.vx = f.face * h.pu * 0.8; o.atk = null;
          if (h.chip) dealDamage(o, Math.ceil(h.d / 5), f);
          sparks.push({ x: sx, y: sy, t: 0, k: 'b' }); sfx.block(); freeze = 4;
          return 'block';
        }
        const dmg = Math.round(h.d * dmgMul(f));
        o.atk = null; o.spec = null; o.pend = null;
        dealDamage(o, dmg, f);
        o.stun += dmg;
        if (o.hp <= 0 || h.kd || o.y > 0) { o.st = 'fall'; o.vy = -4.6; o.vx = f.face * 2; o.y = Math.max(o.y, 1); }
        else { o.st = 'hit'; o.hitT = h.hs; o.vx = f.face * h.pu; o.dz = 0; }
        o.t = 0;
        sparks.push({ x: sx, y: sy, t: 0, k: dmg >= 14 ? 'H' : 'L' });
        if (dmg >= 14) sfx.hitH(); else sfx.hitL();
        freeze = dmg >= 14 ? 8 : 5;
        if (f === P && !demo) { combo = comboT > 0 ? combo + 1 : 1; comboT = 40; if (combo >= 2) msgs.push({ s: combo + ' HIT COMBO', x: f.face > 0 ? 8 : W - 8, al: f.face > 0 ? 'left' : 'right', t: 70 }); }
        return 'hit';
      }
      function dealDamage(o, d, f) {
        if (o.c.tough) d = Math.round(d * o.c.tough);
        o.hp = Math.max(0, o.hp - d);
        if (f === P && !demo) addScore(d * 100);
        if (o === P) perfect = false;
      }
      function addScore(n) { score += n; if (score > hi) hi = score; }

      // ---------- per-frame fighter update ----------
      function updateFighter(f, o) {
        f.anim++; f.t++;
        if (f.inv > 0) f.inv--;
        if (f.stun > 0) f.stun = Math.max(0, f.stun - 0.12);
        if (f.reqT > 0 && --f.reqT === 0) f.req = null;
        const grounded = f.y <= 0;
        switch (f.st) {
          case 'stand': case 'walk': case 'crouch': {
            f.face = Math.sign(o.x - f.x) || f.face;
            if (f.req) { startAction(f, o); break; }
            const d = f.dir;
            if (d >= 7) { f.st = 'jump'; f.vy = -7.3; f.vx = (d === 9 ? 2.3 : d === 7 ? -2.3 : 0) * f.face; f.y = 1; f.airAtk = false; f.atk = null; sfx.jump(); break; }
            if (d <= 3) { f.st = 'crouch'; break; }
            if (d === 6) { f.x += f.c.spd * f.face; f.st = 'walk'; }
            else if (d === 4) { f.x -= f.c.spd * 0.85 * f.face; f.st = 'walk'; }
            else f.st = 'stand';
            break;
          }
          case 'jump':
            if (f.req && !f.atk && !f.airAtk && !SP[f.req]) startAction(f, o);
            else if (f.req && SP[f.req]) f.req = null;
            f.x += f.vx; f.y -= f.vy; f.vy += 0.36;
            if (f.atk) { f.atk.t++; atkCheck(f, o); }
            if (f.y <= 0) { f.y = 0; f.vy = 0; f.vx = 0; f.atk = null; f.st = 'stand'; f.t = 0; f.lag = 3; }
            break;
          case 'attack':
            f.atk.t++;
            atkCheck(f, o);
            if (f.atk.t >= f.atk.a.s + f.atk.a.a + f.atk.a.r) { f.st = f.atk.n[0] === 'c' && f.dir <= 3 ? 'crouch' : 'stand'; f.atk = null; }
            break;
          case 'special': runSpecial(f, o); break;
          case 'hit': case 'block': case 'cblock':
            f.x += f.vx; f.vx *= 0.82;
            if (--f.hitT <= 0) {
              f.st = 'stand'; f.vx = 0;
              if (f.stun > 42 && f.hp > 0) { f.st = 'dizzy'; f.dz = 120; f.stun = 0; }
            }
            break;
          case 'fall':
            f.x += f.vx; f.y -= f.vy; f.vy += 0.34;
            if (f.y <= 0) { f.y = 0; f.vx = 0; f.st = f.hp <= 0 ? 'ko' : 'down'; f.t = 0; sfx.thud(); shake = 6; }
            break;
          case 'down':
            if (f.hp <= 0) { f.st = 'ko'; break; }
            if (f.t > 40) { f.st = 'rise'; f.t = 0; f.inv = 24; }
            break;
          case 'rise':
            if (f.t > 18) { f.st = 'stand'; if (f.stun > 42 && f.hp > 0) { f.st = 'dizzy'; f.dz = 120; f.stun = 0; } }
            break;
          case 'dizzy':
            if (--f.dz <= 0) f.st = 'stand';
            break;
          case 'throw':
            if (f.t > 30) f.st = 'stand';
            break;
          case 'thrown': {
            const th = f.thr, k = Math.min(1, f.t / 26);
            f.x = th.x0 + (th.x1 - th.x0) * k; f.y = Math.sin(k * Math.PI) * 50;
            if (k >= 1) { f.y = 0; dealDamage(f, th.dmg * dmgMul(th.by), th.by); f.st = f.hp <= 0 ? 'ko' : 'down'; f.t = 0; sfx.thud(); shake = 8; f.face = Math.sign(th.by.x - f.x) || f.face; }
            break;
          }
          case 'held': break;
          case 'ko': f.vx = 0; break;
          case 'win': break;
        }
        if (f.st !== 'thrown' && f.st !== 'held' && f.st !== 'fall' && f.st !== 'jump' && f.st !== 'special' && f.y > 0 && !(f.st === 'special')) { f.y = Math.max(0, f.y - 4); }
        if (f.dhp > f.hp) f.dhp -= 0.6; if (f.dhp < f.hp) f.dhp = f.hp;
      }
      function atkCheck(f, o) {
        const at = f.atk, a = at.a;
        if (at.hit || at.t < a.s || at.t >= a.s + a.a) return;
        const rx = f.c.reach && a.lim ? f.c.reach : 1;
        const big = (f.c.sc - 1) * 20;
        if (boxHit(f, o, [a.x[0], a.x[1] * rx + big], a.y, { d: a.d, l: a.l, hs: a.hs, pu: a.pu, kd: a.kd }, { hits: 0 })) at.hit = true;
      }

      // ---------- projectiles / effects ----------
      function updateProjs() {
        for (const p of projs) {
          p.x += p.vx; p.t++;
          const o = p.owner === P ? E : P;
          if (p.dead || !o) continue;
          const hb = hurt(o);
          const lariatPass = o.st === 'special' && o.spec && o.spec.id === 'lariat';
          if (!lariatPass && p.x + 10 > hb[0] && p.x - 10 < hb[1] && p.y + 8 > hb[2] && p.y - 8 < hb[3]) {
            const r = applyHit(p.owner, o, { d: p.d, l: 'mid', hs: 18, pu: 3, chip: 1 }, p.x, GY - p.y);
            if (r || o.isCar) { p.dead = true; }
          }
          for (const q of projs) if (q !== p && q.owner !== p.owner && !q.dead && Math.abs(q.x - p.x) < 14) { p.dead = q.dead = true; sparks.push({ x: p.x, y: GY - p.y, t: 0, k: 'H' }); sfx.block(); }
          if (p.x < cam - 30 || p.x > cam + W + 30) p.dead = true;
        }
        for (const p of projs) if (p.dead && p.owner.proj === p) p.owner.proj = null;
        projs = projs.filter(p => !p.dead);
      }

      // ---------- bonus car ----------
      function hitCar(car, d, sx, sy) {
        if (car.hp <= 0) return;
        car.hp = Math.max(0, car.hp - d * 0.55); car.flash = 6;
        addScore(d * 50);
        for (let i = 0; i < 4; i++) parts.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4, t: 30 + rnd(20), c: ['#c02020', '#a0a0b0', '#80d0ff', '#303030'][rnd(4)] });
        sparks.push({ x: sx, y: sy, t: 0, k: 'H' });
        sfx.crash();
        if (car.hp <= 0) { shake = 20; rp = 'result'; rt = 0; bonusMsg = 'PERFECT'; addScore(50000 + timer * 300); sfx.win(); P.st = 'win'; }
      }

      // ---------- flow ----------
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); return false;
      }
      function newGame() { score = 0; demo = false; mode = 'select'; mt = 0; selT = 20 * 60; sfx.ok(); }
      function chooseChar(i) {
        pChar = i; sfx.ok();
        const others = []; for (let k = 0; k < NPLAY; k++) if (k !== i) others.push(k);
        for (let k = others.length - 1; k > 0; k--) { const j = rnd(k + 1); [others[k], others[j]] = [others[j], others[k]]; }
        ladder = others.slice(0, 3).concat(['car'], others.slice(3, 6), ['car'], others.slice(6), [8, 9, 10, 11]);
        lpos = 0; startMatch();
      }
      function cpuLevel() { let n = 0; for (let i = 0; i < lpos; i++) if (ladder[i] !== 'car') n++; return n; }
      function startMatch() {
        const L = ladder[lpos];
        if (L === 'car') { startBonus(); return; }
        mode = 'vs'; mt = 0; round = 1;
        P = mkF(pChar, STW / 2 - 70, 1, false); E = mkF(L, STW / 2 + 70, -1, true, cpuLevel());
      }
      function startRound(n) {
        round = n;
        const pw = P.wins, ew = E.wins;
        P = mkF(P.ci, STW / 2 - 70, 1, P.cpu, P.ai.lv); P.wins = pw;
        E = mkF(E.ci, STW / 2 + 70, -1, E.cpu, E.ai.lv); E.wins = ew;
        projs = []; sparks = []; parts = []; msgs = [];
        timer = 99; tick = 0; rp = 'intro'; rt = 0; cam = STW / 2 - W / 2; perfect = true; combo = 0;
        mode = 'fight'; musStep = 0;
      }
      function startDemo() {
        demo = true; const a = rnd(NPLAY); let b = rnd(NPLAY); if (b === a) b = (a + 3) % NPLAY;
        P = mkF(a, 0, 1, true, 5); E = mkF(b, 0, -1, true, 5); startRound(1); mt = 0;
      }
      function startBonus() {
        mode = 'bonus'; round = 0;
        P = mkF(pChar, STW / 2 - 90, 1, false);
        E = bonusCar = { isCar: true, x: STW / 2 + 30, y: 0, hp: 100, face: -1, st: 'car', flash: 0, c: { sc: 1, wd: 1 }, inv: 0, dir: 5, proj: null };
        projs = []; sparks = []; parts = []; msgs = [];
        timer = 50; tick = 0; rp = 'intro'; rt = 0; cam = STW / 2 - W / 2; bonusMsg = '';
      }
      function matchWon() {
        addScore(5000 * (cpuLevel() + 1));
        lpos++;
        if (lpos >= ladder.length) { mode = 'ending'; mt = 0; api.setHiScore(score); sfx.win(); return; }
        startMatch();
      }
      function matchLost() {
        const over = () => { mode = 'gameover'; mt = 0; api.setHiScore(score); };
        if (api.offerContinue) api.offerContinue(() => { startMatch(); }, over); else over();
      }

      function roundStep() {
        rt++;
        if (rp === 'intro') {
          if (rt === 2) sfx.bell();
          if (rt === 70) sfx.fight();
          if (rt >= 100) { rp = 'fight'; rt = 0; }
          stepFighters(false);
          return;
        }
        if (rp === 'fight') {
          if (++tick >= (mode === 'bonus' ? 50 : 54)) { tick = 0; if (timer > 0) timer--; if (timer <= 10 && timer > 0) A.tone(1200, 0.04, { type: 'square', vol: 0.05 }); }
          stepFighters(true);
          if (mode === 'bonus') {
            if (timer === 0 && rp === 'fight') { rp = 'result'; rt = 0; bonusMsg = E.hp <= 0 ? 'PERFECT' : 'TIME UP'; addScore(Math.round((100 - E.hp) * 300)); }
            return;
          }
          if (P.hp <= 0 || E.hp <= 0) {
            rp = 'ko'; rt = 0; slow = 50; sfx.ko(); roundMsg = '';
            for (const f of [P, E]) if (f.hp <= 0 && ['fall', 'ko', 'down', 'thrown', 'held'].indexOf(f.st) < 0) { f.st = 'fall'; f.vy = -4; f.vx = -f.face * 2; f.y = Math.max(1, f.y); f.spec = null; f.atk = null; f.t = 0; }
            return;
          }
          if (timer === 0) { rp = 'ko'; rt = 0; roundMsg = 'TIME OVER'; }
          return;
        }
        if (rp === 'ko') {
          if (slow > 0) { slow--; if (slow % 3 === 0) stepFighters(false); } else stepFighters(false);
          if (rt === 130) {
            let win = null;
            if (P.hp > E.hp) win = P; else if (E.hp > P.hp) win = E;
            if (win) { win.wins++; win.st = 'win'; win.t = 0; win.atk = null; win.spec = null; win.y = 0; }
            if (!demo && win === P) {
              const tb = timer * 100, vb = P.hp * 50;
              addScore(tb + vb + (perfect && P.hp >= MAXHP ? 30000 : 0));
              roundMsg = (perfect && P.hp >= MAXHP ? 'PERFECT  ' : '') + 'TIME ' + tb + '  VITAL ' + vb;
            } else roundMsg = '';
            rp = 'result'; rt = 0;
            if (win === P && !demo) sfx.win();
          }
          return;
        }
        if (rp === 'result') {
          stepFighters(false);
          if (mode === 'bonus') { if (rt > 180) matchWon(); return; }
          if (rt > 200) {
            if (demo) { if (P.wins >= 2 || E.wins >= 2 || round >= 3) { mode = 'rank'; mt = 0; } else startRound(round + 1); return; }
            if (P.wins >= 2) matchWon();
            else if (E.wins >= 2 || round >= 5) matchLost();
            else startRound(round + 1);
          }
        }
      }
      function stepFighters(control) {
        if (freeze > 0) { freeze--; return; }
        const fs = [P, E];
        for (const f of fs) {
          if (f.isCar) { if (f.flash > 0) f.flash--; continue; }
          const o = f === P ? E : P;
          if (control && !(rp !== 'fight')) {
            if (f.cpu) aiThink(f, o); else readPlayer(f);
          } else { f.dir = 5; f.req = null; f.pend = null; }
          trackCharge(f);
          updateFighter(f, o);
        }
        // separation
        const nosep = s => s === 'thrown' || s === 'held';
        const sepOK = E.isCar ? P.y < 40 : (P.y < 50 && E.y < 50 && !nosep(P.st) && !nosep(E.st));
        if (sepOK) {
          const hwP = 12 * Math.min(1.4, P.c.wd) * P.c.sc, hwE = E.isCar ? 56 : 12 * Math.min(1.4, E.c.wd) * E.c.sc;
          const dx = E.x - P.x, ov = hwP + hwE - Math.abs(dx);
          if (ov > 0) {
            const s = Math.sign(dx) || 1;
            if (E.isCar) P.x -= s * ov; else { P.x -= s * ov / 2; E.x += s * ov / 2; }
          }
        }
        updateProjs();
        // camera & bounds
        const mid = E.isCar ? (P.x + E.x) / 2 : (P.x + E.x) / 2;
        cam += (clamp(mid - W / 2, 0, STW - W) - cam) * 0.2;
        for (const f of fs) if (!f.isCar) f.x = clamp(f.x, Math.max(20, cam + 14), Math.min(STW - 20, cam + W - 14));
        if (comboT > 0) comboT--;
      }

      // ---------- update ----------
      function update() {
        T++; mt++;
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        for (const s of sparks) s.t++;
        sparks = sparks.filter(s => s.t < 12);
        for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.2; q.t--; }
        parts = parts.filter(q => q.t > 0);
        for (const m of msgs) m.t--;
        msgs = msgs.filter(m => m.t > 0).slice(-3);
        if (shake > 0) shake--;
        const startPressed = api.anyPressed('Enter') || (mode === 'title' && api.anyPressed('Space'));
        switch (mode) {
          case 'title':
            if (startPressed && tryStart()) { newGame(); break; }
            if (mt > 600) startDemo();
            break;
          case 'rank':
            if (startPressed && tryStart()) { newGame(); break; }
            if (mt > 360) { mode = 'title'; mt = 0; }
            break;
          case 'select': {
            selT--;
            const col = selIdx % 4, row = selIdx >> 2;
            if (api.pressed('ArrowLeft')) { selIdx = row * 4 + (col + 3) % 4; sfx.sel(); }
            if (api.pressed('ArrowRight')) { selIdx = row * 4 + (col + 1) % 4; sfx.sel(); }
            if (api.pressed('ArrowUp') || api.pressed('ArrowDown')) { selIdx = (selIdx + 4) % 8; sfx.sel(); }
            if ((mt > 20 && api.anyPressed('Space', 'Enter', 'KeyX')) || selT <= 0) chooseChar(selIdx);
            break;
          }
          case 'vs':
            if (mt > 170 || (mt > 40 && api.anyPressed('Space', 'Enter'))) startRound(1);
            break;
          case 'fight':
            if (demo && startPressed && tryStart()) { newGame(); break; }
            if (demo && mt > 2400) { mode = 'rank'; mt = 0; break; }
            roundStep();
            if (mode === 'fight' && !E.isCar && (rp === 'fight' || rp === 'intro')) music(CH[E.ci].stage);
            break;
          case 'bonus':
            roundStep();
            break;
          case 'ending':
            if (mt > 720 || (mt > 180 && startPressed)) { mode = 'title'; mt = 0; }
            break;
          case 'gameover':
            if (mt > 240) { mode = 'title'; mt = 0; }
            break;
        }
      }

      // ---------- drawing: fighters ----------
      const ra = d => d * Math.PI / 180;
      function shade(hex, k) {
        const n = parseInt(hex.slice(1), 16);
        const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
        return 'rgb(' + Math.min(255, r) + ',' + Math.min(255, g) + ',' + Math.min(255, b) + ')';
      }
      function seg(ctx, x1, y1, x2, y2, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      function drawBody(ctx, c, Pz, x, y, face, rot, o) {
        o = o || {};
        const wd = c.wd;
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face * c.sc, c.sc); if (rot) ctx.rotate(rot);
        if (o.alpha) ctx.globalAlpha = o.alpha;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const TL = 20, SL = 20, UL = 15, FL = 14, TO = 26;
        const rx = o.reach || 1;
        const leg = (a, b, L) => { const k = [Math.sin(ra(a)) * TL * L, Math.cos(ra(a)) * TL * L]; return [k, [k[0] + Math.sin(ra(a + b)) * SL * L, k[1] + Math.cos(ra(a + b)) * SL * L]]; };
        const lb = leg(Pz.bt, Pz.bs, 1), lf = leg(Pz.ft, Pz.fs, o.ext === 'leg' ? rx : 1);
        const hipY = -Math.max(lb[1][1], lf[1][1], 6);
        const ln = ra(Pz.ln);
        const sh = [Math.sin(ln) * TO, hipY - Math.cos(ln) * TO];
        const hd = [sh[0] + Math.sin(ln) * 9, sh[1] - Math.cos(ln) * 9];
        const arm = (a, b, L) => { const e = [sh[0] + Math.sin(ra(a)) * UL * L, sh[1] + Math.cos(ra(a)) * UL * L]; return [e, [e[0] + Math.sin(ra(a + b)) * FL * L, e[1] + Math.cos(ra(a + b)) * FL * L]]; };
        const ab = arm(Pz.bu, Pz.bf, 1), af = arm(Pz.fu, Pz.ff, o.ext === 'arm' ? rx : 1);
        const fl = o.flash;
        const C = (col, k) => fl ? '#ffffff' : (k ? shade(col, k) : col);
        // cape behind
        if (c.cape) { ctx.fillStyle = C('#e8e8e8', 0.85); ctx.beginPath(); ctx.moveTo(sh[0] - 6, sh[1]); ctx.lineTo(sh[0] + 6, sh[1]); ctx.lineTo(-14 - Math.sin(T / 9) * 3, hipY + 30); ctx.lineTo(-24, hipY + 26); ctx.closePath(); ctx.fill(); }
        if (c.hair === 'mask') { ctx.fillStyle = C(c.hc, 0.8); ctx.fillRect(hd[0] - 9, hd[1] - 4, 6, 20); }
        // back leg
        seg(ctx, 0, hipY, lb[0][0], hipY + lb[0][1], 7 * Math.min(1.5, wd), C(c.th, 0.7));
        seg(ctx, lb[0][0], hipY + lb[0][1], lb[1][0], hipY + lb[1][1], 5.5 * Math.min(1.4, wd), C(c.sh, 0.7));
        ctx.fillStyle = C(c.ft, 0.7); ctx.fillRect(lb[1][0] - 3, hipY + lb[1][1] - 2, 8, 4);
        // back arm
        seg(ctx, sh[0] - 2, sh[1] + 1, ab[0][0], ab[0][1], 5.5 * Math.min(1.5, wd), C(c.ua, 0.7));
        seg(ctx, ab[0][0], ab[0][1], ab[1][0], ab[1][1], 4.5 * Math.min(1.5, wd), C(c.fa, 0.7));
        disc(ctx, ab[1][0], ab[1][1], 3.4 * Math.min(1.4, wd), C(c.ha, 0.7));
        // torso
        ctx.fillStyle = C(c.to);
        const tw = 7.5 * wd, sw = 9.5 * Math.min(1.5, wd);
        const px = Math.cos(ln), py = Math.sin(ln);
        ctx.beginPath();
        ctx.moveTo(-px * tw, hipY - py * tw); ctx.lineTo(px * tw, hipY + py * tw);
        ctx.lineTo(sh[0] + px * sw, sh[1] + py * sw); ctx.lineTo(sh[0] - px * sw, sh[1] - py * sw); ctx.closePath(); ctx.fill();
        if (wd > 1.3) disc(ctx, Math.sin(ln) * 12, hipY - Math.cos(ln) * 12, 10 * (wd - 0.6), C(c.to));
        if (c.id === 'zangief') { ctx.fillStyle = C('#a04a20'); ctx.fillRect(sh[0] - 3, sh[1] + 5, 6, 3); ctx.fillRect(sh[0] - 1, sh[1] + 8, 2, 6); }
        if (c.id === 'dhalsim') for (let i = -1; i <= 1; i++) disc(ctx, sh[0] + i * 4 + 2, sh[1] + 4 + Math.abs(i) * -1, 2, C('#f0f0e0'));
        if (c.id === 'chunli') { ctx.fillStyle = C('#f0c020'); ctx.fillRect(sh[0] - 2, sh[1] + 2, 3, 10); }
        // belt / waist
        seg(ctx, -px * tw, hipY - py * tw + 1, px * tw, hipY + py * tw + 1, 3.5, C(c.bl));
        if (c.id === 'ryu' || c.id === 'ken') seg(ctx, -2, hipY + 1, -6, hipY + 9, 2, C(c.bl));
        // front leg
        seg(ctx, 0, hipY, lf[0][0], hipY + lf[0][1], 7.5 * Math.min(1.5, wd), C(c.th));
        seg(ctx, lf[0][0], hipY + lf[0][1], lf[1][0], hipY + lf[1][1], 6 * Math.min(1.4, wd), C(c.sh));
        ctx.fillStyle = C(c.ft); ctx.fillRect(lf[1][0] - 3, hipY + lf[1][1] - 2, 9, 4);
        // head
        drawHead(ctx, c, hd[0], hd[1], ln, C);
        // front arm
        seg(ctx, sh[0] + 2, sh[1] + 1, af[0][0], af[0][1], 6 * Math.min(1.5, wd), C(c.ua));
        seg(ctx, af[0][0], af[0][1], af[1][0], af[1][1], 5 * Math.min(1.5, wd), C(c.fa));
        disc(ctx, af[1][0], af[1][1], 3.8 * Math.min(1.4, wd), C(c.ha));
        if (c.claw) { const dx = af[1][0] - af[0][0], dy = af[1][1] - af[0][1], L = Math.hypot(dx, dy) || 1; for (let i = -1; i <= 1; i++) seg(ctx, af[1][0], af[1][1] + i * 1.5, af[1][0] + dx / L * 12, af[1][1] + dy / L * 12 + i * 2, 1, '#e0e0f0'); }
        if (c.ha === '#d02020' && c.id === 'balrog') disc(ctx, af[1][0], af[1][1], 5.5, C(c.ha));
        ctx.restore();
        return { hx: x, hy: y };
      }
      function drawHead(ctx, c, x, y, ln, C) {
        const hc = C(c.hc);
        if (c.hair === 'mane') { ctx.fillStyle = hc; for (let i = 0; i < 7; i++) { const a = Math.PI * (0.5 + i / 6); disc(ctx, x - 3 + Math.cos(a) * 7, y + Math.sin(a) * 7 - 1, 4.5, hc); } }
        if (c.hair === 'long') { ctx.fillStyle = hc; ctx.fillRect(x - 9, y - 4, 6, 14); }
        if (c.hair === 'mask') { ctx.fillStyle = hc; ctx.fillRect(x - 9, y - 6, 7, 18); }
        disc(ctx, x, y, 7, C(c.sk));
        ctx.fillStyle = C(c.sk); ctx.fillRect(x + 4, y - 1, 4, 5);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 3, y - 2, 2, 2);
        switch (c.hair) {
          case 'band':
            ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(x - 8, y - 1); ctx.lineTo(x - 6, y - 9); ctx.lineTo(x - 2, y - 7); ctx.lineTo(x + 1, y - 10); ctx.lineTo(x + 6, y - 6); ctx.lineTo(x + 7, y - 3); ctx.lineTo(x - 8, y - 1); ctx.fill();
            ctx.fillStyle = C('#e02020'); ctx.fillRect(x - 7, y - 4, 14, 2); ctx.fillRect(x - 13, y - 4 + Math.sin(T / 5) * 2, 6, 2); ctx.fillRect(x - 12, y - 1 + Math.sin(T / 4) * 2, 5, 2);
            break;
          case 'long':
            ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 8, 14, 5); ctx.fillRect(x - 8, y - 5, 4, 8); break;
          case 'knot':
            ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 8, 13, 4); disc(ctx, x - 2, y - 10, 3, hc);
            ctx.fillStyle = C('#d02020'); ctx.fillRect(x + 1, y - 4, 6, 1); ctx.fillRect(x + 1, y + 2, 6, 1); break;
          case 'buns':
            ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 8, 14, 5); disc(ctx, x - 7, y - 7, 4, hc); disc(ctx, x + 5, y - 9, 4, hc);
            ctx.fillStyle = C('#f4f4f4'); ctx.fillRect(x - 10, y - 9, 5, 3); ctx.fillRect(x + 3, y - 12, 5, 3); break;
          case 'mane':
            ctx.fillStyle = hc; ctx.fillRect(x - 6, y - 9, 12, 4); break;
          case 'mohawk':
            ctx.fillStyle = hc; ctx.fillRect(x - 3, y - 11, 6, 5); ctx.fillRect(x - 6, y + 3, 12, 4); break;
          case 'flat':
            ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 15, 14, 9); ctx.fillRect(x - 7, y - 7, 3, 5); break;
          case 'short':
            ctx.fillStyle = hc; ctx.fillRect(x - 7, y - 8, 14, 4); break;
          case 'mask':
            ctx.fillStyle = C('#f0f0f0'); ctx.fillRect(x - 1, y - 6, 8, 10); ctx.fillStyle = '#000'; ctx.fillRect(x + 3, y - 3, 3, 1); ctx.fillRect(x + 3, y, 3, 1); break;
          case 'patch':
            ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y - 3, 4, 3); ctx.fillRect(x - 6, y - 5, 10, 1); break;
          case 'cap':
            ctx.fillStyle = hc; ctx.fillRect(x - 8, y - 11, 15, 6); ctx.fillRect(x + 3, y - 6, 7, 2); ctx.fillStyle = C('#f0c020'); ctx.fillRect(x + 1, y - 10, 3, 3); break;
          case 'bald':
            if (c.id === 'dhalsim') { ctx.fillStyle = C('#d02020'); ctx.fillRect(x + 1, y - 6, 2, 3); } break;
        }
      }
      function poseOf(f) {
        let po = 'stand', rot = 0, dy = 0, ext = null, face = f.face, alpha = 0;
        switch (f.st) {
          case 'stand': po = (f.anim >> 4) & 1 ? 'stand' : 'stand'; break;
          case 'walk': po = (f.anim >> 3) & 1 ? 'walk1' : 'walk2'; break;
          case 'crouch': po = 'crouch'; break;
          case 'jump':
            if (f.atk && f.atk.t >= f.atk.a.s - 1) { po = f.atk.a.po; ext = f.atk.a.lim; }
            else { po = 'jump'; if (f.vx * f.face > 0 && f.y > 20 && f.c.id !== 'zangief') rot = -Math.min(Math.PI * 2, (f.t / 30) * Math.PI * 2) * 0; }
            break;
          case 'attack': {
            const a = f.atk.a, t = f.atk.t;
            if (t >= a.s - 1 && t < a.s + a.a + 3) { po = a.po; ext = a.lim; } else po = f.atk.n[0] === 'c' ? 'crouch' : 'stand';
            break;
          }
          case 'throw': po = f.t < 14 ? 'grab' : 'throwp'; break;
          case 'hit': po = 'hit'; break;
          case 'block': po = 'block'; break;
          case 'cblock': po = 'cblock'; break;
          case 'fall': po = 'hit'; rot = -Math.min(1.5, f.t * 0.08); dy = -6; break;
          case 'down': case 'ko': po = 'hit'; rot = -Math.PI / 2; dy = -6; break;
          case 'rise': po = 'crouch'; break;
          case 'dizzy': po = 'dizzy'; rot = Math.sin(T / 10) * 0.12; break;
          case 'thrown': case 'held': po = 'hit'; rot = -f.t * 0.25; dy = -30; break;
          case 'win': po = f.t < 20 ? 'stand' : 'win'; break;
          case 'special': {
            const s = f.spec.s, t = f.spec.t;
            switch (s.ty) {
              case 'proj': po = t < s.st ? 'windup' : t < s.st + 16 ? 'fire' : 'stand'; break;
              case 'rise': po = t < 4 ? 'crouch' : f.y > 0 ? s.po : 'crouch'; if (s.flip && f.y > 0) { rot = -Math.min(Math.PI * 2, (t - 4) * 0.3); dy = -30; } break;
              case 'spin': po = t < 6 ? 'crouch' : s.po; if (s.po === 'tatsu') face = ((t >> 2) & 1) ? f.face : -f.face; if (s.po === 'bird') { rot = Math.PI; dy = -62; face = ((t >> 2) & 1) ? 1 : -1; } break;
              case 'multi': po = s.po; break;
              case 'dash': po = t < s.st ? 'crouch' : s.po; if (s.po === 'dash' && t >= s.st && t < s.dur) { rot = Math.PI / 2; dy = -24; } break;
              case 'lariat': po = 'lariat'; face = ((t >> 3) & 1) ? f.face : -f.face; break;
              case 'grab': po = f.spec.grab ? 'grab' : (t < 12 ? 'grab' : 'stand'); if (f.spec.grab && f.y > 0) face = ((t >> 2) & 1) ? 1 : -1; break;
              case 'flame': po = t < 8 ? 'windup' : 'fire'; break;
            }
            break;
          }
        }
        if (!PO[po]) po = 'crouch';
        let Pz = PO[po];
        if (po === 'slap' || po === 'legs') {
          Pz = Object.assign({}, Pz);
          const k = (f.anim >> 1) % 4;
          if (po === 'slap') { Pz.fu = 70 + k * 12; Pz.bu = 110 - k * 10; } else { Pz.ft = 70 + k * 15; }
        }
        if (po === 'stand') { Pz = Object.assign({}, Pz); const b = Math.sin(f.anim / 8) * 3; Pz.fu += b; Pz.bu += b; }
        return { Pz, rot, dy, ext, face, alpha };
      }
      function drawFighter(ctx, f, ox) {
        if (f.isCar) { drawCar(ctx, f, ox); return; }
        const sx = f.x + ox, sy = GY - f.y;
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(sx - 16 * f.c.wd), GY - 1, Math.round(32 * f.c.wd), 3);
        const isBall = f.st === 'special' && f.spec.s.po === 'ball' && f.spec.t >= f.spec.s.st && f.spec.t < f.spec.s.dur;
        if (isBall) {
          const c = f.c, r = 15, a = T * 0.5;
          disc(ctx, sx, sy - r, r, c.sk);
          ctx.strokeStyle = c.hc; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy - r, r - 4, a, a + 2.5); ctx.stroke();
          ctx.strokeStyle = c.th; ctx.beginPath(); ctx.arc(sx, sy - r, r - 9, a + 3, a + 5); ctx.stroke();
          if (c.claw) { ctx.strokeStyle = '#e0e0f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy - r, r + 3, -a, -a + 1.5); ctx.stroke(); }
          return;
        }
        const p = poseOf(f);
        const flash = (f.st === 'hit' || f.st === 'fall') && f.t < 3;
        const reach = f.c.reach || 1;
        if (f.st === 'special' && f.spec.s.fire && f.spec.t >= f.spec.s.st && f.spec.t < f.spec.s.dur) {
          for (let i = 0; i < 6; i++) disc(ctx, sx - f.face * (6 + i * 7), sy - 24 + Math.sin(T + i) * 3, 9 - i, ['#ffffff', '#c080ff', '#8040e0', '#5020a0'][i % 4]);
        }
        if (f.st === 'special' && f.spec.id === 'thunder' && (T >> 1) & 1) {
          ctx.strokeStyle = '#80f0ff'; ctx.lineWidth = 1.5;
          for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; ctx.beginPath(); ctx.moveTo(sx, sy - 28); ctx.lineTo(sx + Math.cos(a) * 20, sy - 28 + Math.sin(a) * 18); ctx.lineTo(sx + Math.cos(a + 0.3) * 34, sy - 28 + Math.sin(a + 0.3) * 30); ctx.stroke(); }
        }
        drawBody(ctx, f.c, p.Pz, sx, sy + p.dy, p.face, p.rot, { ext: p.ext, reach, flash, alpha: f.inv > 0 && f.st === 'rise' && (T & 2) ? 0.6 : 0 });
        if (f.st === 'special' && f.spec.id === 'yflame' && f.spec.t >= 8 && f.spec.t <= 26) {
          for (let i = 0; i < 8; i++) disc(ctx, sx + f.face * (22 + i * 6) * f.c.sc, sy - 60 * f.c.sc + Math.sin(T * 0.7 + i) * 4, 4 + i * 0.9, ['#fff060', '#ffa020', '#ff4010'][i % 3]);
        }
        if (f.st === 'dizzy') for (let i = 0; i < 3; i++) { const a = T / 10 + i * 2.1; text(ctx, '*', sx + Math.cos(a) * 12 - 3, sy - 96 * f.c.sc + Math.sin(a) * 3, '#ffe040'); }
      }
      function drawCar(ctx, car, ox) {
        const x = Math.round(car.x + ox), y = GY, dmg = 1 - car.hp / 100;
        const body = car.flash ? '#ffffff' : '#c81818';
        const lift = car.hp <= 0 ? 6 : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x - 64, y - 2, 128, 4);
        // wheels
        for (const wx of [-38, 38]) { disc(ctx, x + wx, y - 9 + (car.hp <= 0 ? 3 : 0), 9, '#181818'); disc(ctx, x + wx, y - 9 + (car.hp <= 0 ? 3 : 0), 4, '#909090'); }
        // body
        ctx.fillStyle = body; ctx.fillRect(x - 60, y - 30 + lift, 120, 18 - lift / 2);
        if (car.hp > 20) {
          ctx.beginPath(); ctx.moveTo(x - 34, y - 30 + lift); ctx.lineTo(x - 22, y - 48 + lift * 2 + dmg * 6); ctx.lineTo(x + 22, y - 48 + lift * 2 + dmg * 6); ctx.lineTo(x + 36, y - 30 + lift); ctx.fill();
          ctx.fillStyle = dmg > 0.35 ? '#304050' : '#90d0f0';
          ctx.fillRect(x - 24, y - 44 + dmg * 6, 20, 12 - dmg * 5); ctx.fillRect(x + 2, y - 44 + dmg * 6, 20, 12 - dmg * 5);
          if (dmg > 0.35) { ctx.strokeStyle = '#e0f0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 20, y - 42); ctx.lineTo(x - 12, y - 36); ctx.moveTo(x + 8, y - 42); ctx.lineTo(x + 18, y - 35); ctx.stroke(); }
        }
        ctx.fillStyle = '#e0e0e0'; if (dmg < 0.5) { ctx.fillRect(x - 62, y - 18, 8, 4); ctx.fillRect(x + 54, y - 18, 8, 4); }
        ctx.fillStyle = '#ffe080'; if (dmg < 0.7) ctx.fillRect(x + 56, y - 27, 4, 4);
        ctx.fillStyle = '#601010';
        const dents = Math.floor(dmg * 10);
        for (let i = 0; i < dents; i++) ctx.fillRect(x - 54 + ((i * 37) % 104), y - 28 + ((i * 13) % 12), 6, 3);
        if (car.hp <= 0) { ctx.fillStyle = '#404040'; ctx.fillRect(x - 40, y - 40, 80, 10); if ((T >> 3) & 1) text(ctx, '*', x - 10, y - 52 - (T % 20), '#a0a0a0'); }
      }

      // ---------- drawing: stages ----------
      function drawStage(ctx, st, ox) {
        const px = ox * 0.5;
        const SK = [['#081030', '#203070'], ['#3a2a40', '#806060'], ['#204828', '#60a050'], ['#6080c0', '#c0d8f0'], ['#f08040', '#ffd080'], ['#4070b0', '#a0c8f0'],
          ['#303438', '#606870'], ['#e0a050', '#f8e0a0'], ['#100818', '#402050'], ['#f0a050', '#f8d890'], ['#d07030', '#f0c070'], ['#200810', '#502030']][st];
        const g = ctx.createLinearGradient(0, 0, 0, GY);
        g.addColorStop(0, SK[0]); g.addColorStop(1, SK[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY);
        const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), y, w, h); };
        switch (st) {
          case 0: // Japan castle rooftop under the moon
            disc(ctx, 300 + px * 0.3, 50, 22, '#f8f0c0');
            for (let i = 0; i < 3; i++) { const x = 60 + i * 150 + px; R('#182040', x, 90, 70, 80); R('#101830', x - 12, 86 - i * 4, 94, 8); R('#101830', x + 6, 64, 58, 8); R('#182040', x + 16, 72, 38, 14); R('#ffd060', x + 20, 100, 6, 8); R('#ffd060', x + 44, 100, 6, 8); }
            R('#3a2a20', 0, 168, W, 40);
            for (let i = 0; i < 30; i++) R('#2a1a14', ((i * 40 + ox) % (W + 40)) - 20, 168, 2, 38);
            break;
          case 1: // bathhouse
            R('#d8c8a0', 0, 40, W, 130); R('#5080c0', 20 + px, 60, 300, 70);
            ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.moveTo(90 + px, 130); ctx.lineTo(170 + px, 70); ctx.lineTo(250 + px, 130); ctx.fill();
            ctx.fillStyle = '#304880'; ctx.beginPath(); ctx.moveTo(120 + px, 130); ctx.lineTo(170 + px, 96); ctx.lineTo(220 + px, 130); ctx.fill();
            R('#c03020', 0, 30, W, 10); R('#80a0c0', 40 + ox, 150, 220, 20); R('#5a80b0', 46 + ox, 154, 208, 12);
            break;
          case 2: // Brazil river
            for (let i = 0; i < 9; i++) disc(ctx, ((i * 70 + px) % (W + 80)) - 30, 110 + (i % 3) * 10, 40, i % 2 ? '#205020' : '#2a6a2a');
            R('#2070a0', 0, 150, W, 22); for (let i = 0; i < 12; i++) R('#60b0e0', (i * 37 + T / 2) % W, 156 + (i % 3) * 5, 10, 1);
            R('#7a5030', 200 + ox, 120, 6, 52); R('#7a5030', 250 + ox, 120, 6, 52); R('#a07040', 190 + ox, 116, 76, 6);
            break;
          case 3: // air base
            R('#808890', 0, 120, W, 52); R('#606870', 20 + px, 90, 160, 82); R('#404850', 30 + px, 110, 140, 62);
            ctx.fillStyle = '#9098a0'; ctx.beginPath(); ctx.moveTo(220 + px * 1.2, 140); ctx.lineTo(330 + px * 1.2, 140); ctx.lineTo(350 + px * 1.2, 150); ctx.lineTo(220 + px * 1.2, 152); ctx.fill();
            ctx.beginPath(); ctx.moveTo(260 + px * 1.2, 145); ctx.lineTo(300 + px * 1.2, 126); ctx.lineTo(310 + px * 1.2, 145); ctx.fill(); R('#9098a0', 222 + px * 1.2, 124, 10, 18);
            for (let i = 0; i < 12; i++) R('#202020', ((i * 50 + ox * 0.8) % (W + 60)) - 30, 150, 20, 18);
            break;
          case 4: // harbor
            R('#2060a0', 0, 120, W, 40); R('#f0f0f0', 60 + px, 96, 200, 26); R('#c02020', 60 + px, 118, 200, 6); R('#f0f0f0', 120 + px, 76, 70, 20); R('#202020', 150 + px, 40, 4, 40);
            for (let i = 0; i < 14; i++) { const x = ((i * 30 + ox) % (W + 30)) - 10; R(['#d04040', '#4040d0', '#40a040', '#e0c040'][i % 4], x, 146 + (i % 2) * 2 + ((T >> 4) + i & 1), 10, 22); disc(ctx, x + 5, 142 + (i % 2) * 2 + ((T >> 4) + i & 1), 5, '#f0b080'); }
            break;
          case 5: // China market
            for (let i = 0; i < 5; i++) { const x = i * 120 + px; R('#a03020', x, 80, 90, 90); R('#d0a040', x - 6, 72, 102, 10); disc(ctx, x + 20, 100, 6, '#ff3020'); disc(ctx, x + 70, 100, 6, '#ff3020'); }
            for (let i = 0; i < 12; i++) { const x = ((i * 42 + ox) % (W + 40)) - 20; R('#3a3030', x, 148, 12, 20); disc(ctx, x + 6, 144, 5, '#f0c090'); }
            break;
          case 6: // factory
            for (let i = 0; i < 6; i++) { const x = i * 100 + px; R('#484c50', x, 40, 60, 130); R('#2a2c30', x + 10, 50, 10, 120); }
            R('#806040', 0, 60, W, 6); R('#806040', 0, 110, W, 6);
            for (let i = 0; i < 8; i++) { const x = ((i * 55 + ox) % (W + 40)) - 20; R('#305080', x, 146, 14, 22); disc(ctx, x + 7, 142, 5, '#e0a070'); }
            break;
          case 7: // India temple
            for (let i = 0; i < 5; i++) { const x = i * 110 + px; R('#c08040', x + 30, 60, 16, 110); R('#a06030', x + 24, 56, 28, 8); }
            for (let i = 0; i < 3; i++) { const x = 40 + i * 170 + px * 1.3; disc(ctx, x, 130, 26, '#7a7a80'); disc(ctx, x + 24, 118, 14, '#8a8a90'); R('#7a7a80', x - 18, 140, 10, 30); R('#7a7a80', x + 10, 140, 10, 30); R('#8a8a90', x + 32, 120, 5, 34); R('#d02020', x - 4, 106, 16, 6); }
            break;
          case 8: // Las Vegas
            for (let i = 0; i < 6; i++) { const x = i * 100 + px; R('#201830', x, 50, 70, 120); for (let j = 0; j < 5; j++) R((T >> 3) + i + j & 1 ? '#ff40a0' : '#40e0ff', x + 8, 60 + j * 18, 54, 3); }
            text(ctx, 'CASINO', 150 + px, 30, (T >> 4) & 1 ? '#ffe040' : '#ff6020', 2);
            break;
          case 9: // Spain cage
            R('#a06030', 0, 120, W, 52);
            for (let i = 0; i < 30; i++) { R('#303030', ((i * 16 + ox) % (W + 16)) - 8, 60, 1, 112); }
            R('#303030', 0, 60, W, 1); R('#303030', 0, 100, W, 1);
            for (let i = 0; i < 4; i++) { const x = 40 + i * 90 + px; disc(ctx, x, 140, 6, '#f0c090'); R('#c02020', x - 8, 146, 16, 22); }
            break;
          case 10: // Thailand reclining buddha
            disc(ctx, 200 + px, 120, 46, '#d0a030'); R('#d0a030', 60 + px, 110, 280, 50); disc(ctx, 80 + px, 100, 20, '#e0b040'); R('#c09020', 60 + px, 150, 300, 20);
            for (let i = 0; i < 6; i++) R('#406020', i * 70 + px * 0.6, 40, 8, 120);
            break;
          case 11: // Bison's temple
            for (let i = 0; i < 4; i++) { const x = 30 + i * 130 + px; R('#3a1a20', x, 50, 40, 120); disc(ctx, x + 20, 50, 20, '#4a2a30'); R('#ff8030', x + 16, 160 - ((T + i * 9) % 6), 8, 10); }
            R('#2a0a10', 0, 150, W, 22);
            break;
        }
        // floor
        const fg = ctx.createLinearGradient(0, 168, 0, H);
        const FC = [['#5a3a26', '#2a1a10'], ['#c0d0d8', '#7090a0'], ['#8a6a40', '#4a3a20'], ['#9098a0', '#505860'], ['#7a5a3a', '#3a2a1a'], ['#a09080', '#605040'],
          ['#606870', '#303438'], ['#c0a070', '#806040'], ['#402848', '#201020'], ['#c08050', '#704020'], ['#a07030', '#503818'], ['#503038', '#201018']][st];
        fg.addColorStop(0, FC[0]); fg.addColorStop(1, FC[1]); ctx.fillStyle = fg; ctx.fillRect(0, 170, W, H - 170);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = -6; i < 16; i++) { const bx = i * 48 + (ox % 48); ctx.beginPath(); ctx.moveTo(bx, 170); ctx.lineTo(bx + 2, 170); ctx.lineTo(bx + (bx - W / 2) * 0.5 + 2, H); ctx.lineTo(bx + (bx - W / 2) * 0.5, H); ctx.fill(); }
      }
      function drawProj(ctx, p, ox) {
        const x = Math.round(p.x + ox), y = GY - p.y, s = p.s, c = s.cols, d = Math.sign(p.vx);
        if (s.shape === 'sonic') {
          ctx.strokeStyle = c[0]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x - d * 6, y, 13, d > 0 ? -1.1 : Math.PI - 1.1, d > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke();
          ctx.strokeStyle = c[1]; ctx.lineWidth = 2; ctx.stroke();
          return;
        }
        if (s.shape === 'flame') {
          for (let i = 0; i < 6; i++) disc(ctx, x - d * i * 4, y + Math.sin(T * 0.8 + i) * 3, 9 - i, c[i % 3]);
          return;
        }
        for (let i = 3; i > 0; i--) disc(ctx, x - d * i * 7, y, 4 + (3 - i), c[0]);
        disc(ctx, x, y, 11 + ((T >> 1) & 1), c[0]); disc(ctx, x + d * 2, y, 7, c[1]); disc(ctx, x + d * 3, y - 1, 3, c[2]);
      }
      function drawSpark(ctx, s, ox) {
        const x = Math.round(s.x + ox), y = Math.round(s.y), r = s.k === 'H' ? 14 : 9, k = s.t / 12;
        const col = s.k === 'b' ? '#80c0ff' : s.t < 4 ? '#ffffff' : '#ffd040';
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * k * 0.4, y + Math.sin(a) * r * k * 0.4); ctx.lineTo(x + Math.cos(a) * r * (0.5 + k), y + Math.sin(a) * r * (0.5 + k)); ctx.stroke(); }
        if (s.t < 3) disc(ctx, x, y, r * 0.5, '#ffffff');
      }

      // ---------- HUD ----------
      function drawHUD(ctx) {
        text(ctx, '1P', 8, 3, '#40a0ff'); text(ctx, pad(score, 8), 24, 3, '#fff');
        text(ctx, 'HI ' + pad(hi, 8), W / 2, 3, '#ff6060', 1, 'center');
        if (E.isCar) {
          textS(ctx, 'BONUS STAGE', W / 2, 16, '#ffd040', 1, 'center');
          text(ctx, pad(timer, 2), W / 2, 28, timer <= 10 ? '#ff4040' : '#fff', 2, 'center');
          return;
        }
        const bar = (f, x, flip) => {
          const w = 150;
          ctx.fillStyle = '#000'; ctx.fillRect(x - 1, 15, w + 2, 11);
          ctx.fillStyle = '#c01010'; ctx.fillRect(x, 16, w, 9);
          const hw = Math.round(w * f.hp / MAXHP), dw = Math.round(w * f.dhp / MAXHP);
          ctx.fillStyle = '#ffffff'; if (flip) ctx.fillRect(x, 16, dw, 9); else ctx.fillRect(x + w - dw, 16, dw, 9);
          ctx.fillStyle = f.hp < 40 && (T >> 3) & 1 ? '#ff9020' : '#f0e020';
          if (flip) ctx.fillRect(x, 16, hw, 9); else ctx.fillRect(x + w - hw, 16, hw, 9);
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x, 16, w, 2);
        };
        bar(P, 20, false); bar(E, W - 170, true);
        ctx.fillStyle = '#ff2020'; ctx.fillRect(W / 2 - 12, 13, 24, 15); text(ctx, 'KO', W / 2, 17, '#fff', 1, 'center');
        text(ctx, P.c.name, 20, 29, '#fff'); text(ctx, E.c.name, W - 20, 29, '#fff', 1, 'right');
        for (let i = 0; i < P.wins; i++) { disc(ctx, 176 - i * 10, 33, 3.5, '#ffd040'); }
        for (let i = 0; i < E.wins; i++) { disc(ctx, W - 176 + i * 10, 33, 3.5, '#ffd040'); }
        text(ctx, pad(timer, 2), W / 2, 31, timer <= 10 && (T >> 3) & 1 ? '#ff4040' : '#fff', 2, 'center');
        if (demo) text(ctx, 'DEMO', W / 2, 52, '#ffd040', 1, 'center');
      }
      function drawRoundText(ctx) {
        if (rp === 'intro') {
          if (rt < 66) { if (mode === 'bonus') textS(ctx, 'BONUS STAGE', W / 2, 86, '#ffd040', 3, 'center', '#800000'); else textS(ctx, round >= 5 ? 'FINAL ROUND' : 'ROUND ' + round, W / 2, 86, '#ffd040', 3, 'center', '#800000'); }
          else textS(ctx, 'FIGHT!', W / 2, 82, '#ff3020', 4, 'center', '#400000');
        }
        if (rp === 'ko' && rt < 130) {
          if (roundMsg === 'TIME OVER') textS(ctx, 'TIME OVER', W / 2, 86, '#ffd040', 3, 'center');
          else if ((rt >> 2) & 1 || rt > 40) { textS(ctx, 'K.O.', W / 2, 80, '#ff2020', 5, 'center', '#fff'); if (P.hp <= 0 && E.hp <= 0) textS(ctx, 'DOUBLE', W / 2, 64, '#ffd040', 2, 'center'); }
        }
        if (rp === 'result') {
          if (mode === 'bonus') { textS(ctx, bonusMsg, W / 2, 80, '#ffd040', 3, 'center'); text(ctx, 'SCORE ' + pad(score, 8), W / 2, 110, '#fff', 1, 'center'); return; }
          const w = P.st === 'win' ? P : E.st === 'win' ? E : null;
          if (!w) textS(ctx, 'DRAW GAME', W / 2, 80, '#ffd040', 3, 'center');
          else if (demo) textS(ctx, w.c.name + ' WINS', W / 2, 80, '#ffd040', 2, 'center');
          else textS(ctx, w === P ? 'YOU WIN' : 'YOU LOSE', W / 2, 80, w === P ? '#ffd040' : '#ff4040', 3, 'center');
          if (roundMsg && w === P && !demo) text(ctx, roundMsg, W / 2, 108, '#fff', 1, 'center');
          if (w && rt > 60 && (P.wins >= 2 || E.wins >= 2)) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 140, W - 40, 22);
            const q = w.c.quote;
            text(ctx, q.length > 58 ? q.slice(0, 58) : q, W / 2, 148, '#fff', 1, 'center');
          }
        }
      }
      function creditLine(ctx) {
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), W - 8, H - 10, '#fff', 1, 'right');
      }
      function insertCoin(ctx, y) {
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (T >> 2) & 1 : (T >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, y, coinFlash ? '#ff4040' : '#fff', 1, 'center'); }
        else if ((T >> 5) & 1) text(ctx, 'PUSH START', W / 2, y, '#fff', 1, 'center');
      }
      function logo(ctx, y) {
        textS(ctx, 'STREET FIGHTER', W / 2, y, '#ffd020', 3, 'center', '#a01000');
        textS(ctx, 'II', W / 2, y + 26, '#ff3020', 5, 'center', '#ffd020');
        textS(ctx, 'THE WORLD WARRIOR', W / 2, y + 66, '#40c0ff', 1, 'center', '#002060');
      }
      function drawTitle(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000010'); g.addColorStop(1, '#301040');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { ctx.fillStyle = '#fff'; ctx.fillRect((i * 97) % W, (i * 53) % 120, 1, 1); }
        // two warriors facing off
        drawBody(ctx, CH[0], (T >> 5) & 1 ? PO.stand : PO.fire, 80, 206, 1, 0);
        drawBody(ctx, CH[4], (T >> 5) & 1 ? PO.fire : PO.stand, W - 80, 206, -1, 0);
        logo(ctx, 26);
        insertCoin(ctx, 124);
        text(ctx, 'HI-SCORE ' + pad(hi, 8), W / 2, 140, '#ff6060', 1, 'center');
        text(ctx, '\u00a9 CAPCOM 1991  (TRIBUTE)', W / 2, 208, '#c0c0c0', 1, 'center');
        creditLine(ctx);
      }
      function drawRank(ctx) {
        ctx.fillStyle = '#000018'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'THE WORLD WARRIORS', W / 2, 3, '#ffd040', 1, 'center');
        for (let i = 0; i < NPLAY; i++) {
          const x = 48 + (i % 4) * 96, y = i < 4 ? 106 : 184;
          drawBody(ctx, CH[i], (T >> 4) % 8 === i ? PO.win : PO.stand, x, y, 1, 0);
          text(ctx, CH[i].name, x, y + 3, '#fff', 1, 'center');
          if (i < 4) text(ctx, CH[i].land, x, y + 12, '#80c0ff', 1, 'center');
        }
        text(ctx, 'HI ' + pad(hi, 8), 8, H - 10, '#ff6060');
        insertCoin(ctx, 198);
        creditLine(ctx);
      }
      function drawSelect(ctx) {
        ctx.fillStyle = '#081840'; ctx.fillRect(0, 0, W, H);
        // world map flavour
        ctx.fillStyle = '#1a3a20';
        [[30, 40, 80, 40], [60, 80, 40, 50], [150, 30, 60, 30], [160, 60, 40, 50], [210, 30, 120, 50], [290, 90, 40, 26]].forEach(r => ctx.fillRect(r[0], r[1] + 50, r[2], r[3] / 1.4));
        textS(ctx, 'PLAYER SELECT', W / 2, 8, '#ffd040', 2, 'center');
        for (let i = 0; i < NPLAY; i++) {
          const cx = 96 + (i % 4) * 64, cy = 150 + (i >> 2) * 36;
          ctx.fillStyle = '#203060'; ctx.fillRect(cx - 28, cy - 16, 56, 32);
          ctx.save(); ctx.beginPath(); ctx.rect(cx - 28, cy - 16, 56, 32); ctx.clip();
          ctx.save(); ctx.translate(cx, cy + 8); ctx.scale(2.2, 2.2);
          drawHead(ctx, CH[i], 0, 0, 0, col => col);
          ctx.restore(); ctx.restore();
          if (i === selIdx) { ctx.strokeStyle = (T >> 3) & 1 ? '#ff2020' : '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(cx - 28, cy - 16, 56, 32); text(ctx, '1P', cx - 26, cy - 14, '#ff4040'); }
        }
        const c = CH[selIdx];
        drawBody(ctx, c, PO.stand, 40, 130, 1, 0);
        text(ctx, c.name, 70, 40, '#fff', 2); text(ctx, c.land, 70, 58, '#80c0ff', 1);
        const names = { hado: 'HADOKEN: D,DF,F+P', shoryu: 'SHORYUKEN: F,D,DF+P', tatsu: 'HURRICANE KICK: D,DB,B+K', slap: 'HUNDRED HAND SLAP: MASH P', headbutt: 'SUMO HEADBUTT: HOLD B, F+P',
          thunder: 'ELECTRIC THUNDER: MASH P', roll: 'ROLLING ATTACK: HOLD B, F+P', sonic: 'SONIC BOOM: HOLD B, F+P', flash: 'FLASH KICK: HOLD D, U+K', legs: 'LIGHTNING LEGS: MASH K',
          bird: 'SPINNING BIRD KICK: HOLD D, U+K', lariat: 'DOUBLE LARIAT: P+K TOGETHER', spd: 'PILE DRIVER: CLOSE, D,DB,B+P', yfire: 'YOGA FIRE: D,DF,F+P', yflame: 'YOGA FLAME: D,DB,B+P' };
        c.sp.forEach((s, k) => text(ctx, names[s] || s, 70, 74 + k * 11, '#ffe080'));
        text(ctx, 'THROW: CLOSE, F/B + HEAVY', 70, 74 + c.sp.length * 11, '#a0a0a0');
        text(ctx, 'TIME ' + pad(Math.max(0, Math.ceil(selT / 60)), 2), W - 8, 40, '#fff', 1, 'right');
        creditLine(ctx);
      }
      function drawVS(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const k = Math.min(1, mt / 30);
        ctx.fillStyle = '#102060'; ctx.fillRect(0, 30, W / 2 - 10, 150); ctx.fillStyle = '#601010'; ctx.fillRect(W / 2 + 10, 30, W / 2 - 10, 150);
        drawBody(ctx, P.c, PO.stand, -40 + k * 130, 176, 1, 0);
        drawBody(ctx, E.c, PO.stand, W + 40 - k * 130, 176, -1, 0);
        textS(ctx, 'VS', W / 2, 90, '#ffd020', 4, 'center', '#a00000');
        text(ctx, P.c.name, 90, 186, '#fff', 2, 'center'); text(ctx, E.c.name, W - 90, 186, '#fff', 2, 'center');
        text(ctx, E.c.land, W - 90, 206, '#80c0ff', 1, 'center');
        text(ctx, 'STAGE ' + (cpuLevel() + 1), W / 2, 12, '#fff', 1, 'center');
      }
      function drawEnding(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f08040'); g.addColorStop(1, '#402060');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        drawBody(ctx, CH[pChar], PO.win, W / 2, 200, 1, 0);
        textS(ctx, 'CONGRATULATIONS!', W / 2, 30, '#ffd040', 2, 'center');
        text(ctx, CH[pChar].name + ' IS THE WORLD WARRIOR', W / 2, 56, '#fff', 1, 'center');
        text(ctx, 'SCORE ' + pad(score, 8), W / 2, 72, '#fff', 1, 'center');
        text(ctx, 'THANK YOU FOR PLAYING', W / 2, 212, '#fff', 1, 'center');
      }

      function render(ctx) {
        ctx.save();
        if (shake) ctx.translate(((T & 1) ? 1 : -1) * Math.min(3, shake >> 1), 0);
        switch (mode) {
          case 'title': drawTitle(ctx); break;
          case 'rank': drawRank(ctx); break;
          case 'select': drawSelect(ctx); break;
          case 'vs': drawVS(ctx); break;
          case 'ending': drawEnding(ctx); break;
          case 'gameover':
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
            textS(ctx, 'GAME OVER', W / 2, 90, '#ff3020', 3, 'center');
            text(ctx, 'SCORE ' + pad(score, 8), W / 2, 130, '#fff', 1, 'center');
            creditLine(ctx);
            break;
          case 'fight': case 'bonus': {
            const ox = -Math.round(cam);
            drawStage(ctx, mode === 'bonus' ? 4 : E.c.stage, ox);
            const order = (P.st === 'hit' || P.st === 'fall') ? [P, E] : [E, P];
            for (const f of order) drawFighter(ctx, f, ox);
            for (const p of projs) drawProj(ctx, p, ox);
            for (const s of sparks) drawSpark(ctx, s, ox);
            for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x + ox), Math.round(q.y), 3, 3); }
            drawHUD(ctx);
            for (const m of msgs) text(ctx, m.s, m.al === 'left' ? m.x : m.x, 60, (T >> 2) & 1 ? '#ffd040' : '#ff6020', 1, m.al === 'left' ? undefined : 'right');
            drawRoundText(ctx);
            if (demo) insertCoin(ctx, 196);
            creditLine(ctx);
            break;
          }
        }
        ctx.restore();
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
