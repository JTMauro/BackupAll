// The King of Fighters (SNK, 1994) - from-scratch recreation for the MAME32 Game Room.
// 3-on-3 team battles with original-style fighters: survivor carries over, power gauge charging, MAXIMUM mode,
// dodges, runs and desperation moves at low life. Win against five teams, then face the host.
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
  function textS(ctx, s, x, y, col, sc, align) { text(ctx, s, x + (sc || 1), y + (sc || 1), '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  function R(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const D2R = Math.PI / 180;
  const shadeCache = {};
  function shade(hex, k) {
    const key = hex + k; if (shadeCache[key]) return shadeCache[key];
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * k)), g = Math.min(255, Math.round(((n >> 8) & 255) * k)), b = Math.min(255, Math.round((n & 255) * k));
    return (shadeCache[key] = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1));
  }
  function seg(ctx, x0, y0, x1, y1, w, col) {
    ctx.fillStyle = col;
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
    const h = w / 2, ww = Math.round(w);
    for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(x0 + dx * t - h), Math.round(y0 + dy * t - h), ww, ww); }
  }
  const W = 320, H = 224, GY = 200, STW = 560, MAXHP = 100;

  // ---------- roster: original-style fighters ----------
  // arch selects the special-move set; colours: sk skin, hr hair, hs hair style, to top, pa pants, gl gloves, sh shoes, bl belt/accent
  const CH = {
    kaze: { name: 'KAZE', arch: 'flame', sk: '#f0c090', hr: '#2a1a10', hs: 'spiky', to: '#f0f0f0', pa: '#303048', gl: '#e02020', sh: '#202020', bl: '#e02020', spd: 1.7 },
    tora: { name: 'TORA', arch: 'grappler', sk: '#e8b080', hr: '#f0f0f0', hs: 'short', to: '#f8f8f0', pa: '#f8f8f0', gl: '#f8f8f0', sh: '#e8b080', bl: '#202020', spd: 1.4, sc: 1.06, wd: 1.2 },
    beni: { name: 'BENI', arch: 'kicker', sk: '#f4c8a0', hr: '#c02040', hs: 'pony', to: '#c02040', pa: '#f0f0f0', gl: '#f0f0f0', sh: '#c02040', bl: '#f0d040', spd: 1.9, sc: 0.95, wd: 0.9 },
    duke: { name: 'DUKE', arch: 'shoto', sk: '#f0c090', hr: '#f0d040', hs: 'cap', to: '#e03020', pa: '#3050a0', gl: '#202020', sh: '#f0f0f0', bl: '#f0f0f0', spd: 1.7 },
    rocky: { name: 'ROCKY', arch: 'brawler', sk: '#a06840', hr: '#101010', hs: 'short', to: '#a06840', pa: '#2040c0', gl: '#e02020', sh: '#f0f0f0', bl: '#f0f0f0', spd: 1.8, wd: 1.1 },
    sky: { name: 'SKY', arch: 'kicker', sk: '#f0c090', hr: '#6a3010', hs: 'long', to: '#40a040', pa: '#f0f0e0', gl: '#f0f0e0', sh: '#204020', bl: '#40a040', spd: 1.8 },
    lin: { name: 'LIN', arch: 'lady', sk: '#f4c8a0', hr: '#1a1010', hs: 'buns', to: '#e05090', pa: '#e05090', gl: '#f0f0f0', sh: '#f0f0f0', bl: '#f0d040', spd: 1.9, sc: 0.94, wd: 0.88 },
    wu: { name: 'MASTER WU', arch: 'ninja', sk: '#e8b890', hr: '#e8e8e8', hs: 'bald', to: '#8040a0', pa: '#8040a0', gl: '#e8b890', sh: '#202020', bl: '#f0d040', spd: 1.5, sc: 0.9 },
    bao: { name: 'BAO', arch: 'shoto', sk: '#f4c8a0', hr: '#1a1010', hs: 'cap', to: '#4080e0', pa: '#f0f0f0', gl: '#4080e0', sh: '#f0f0f0', bl: '#f0d040', spd: 1.8, sc: 0.86, wd: 0.85 },
    han: { name: 'HAN', arch: 'kicker', sk: '#f0c090', hr: '#101010', hs: 'short', to: '#f0f0f0', pa: '#f0f0f0', gl: '#f0f0f0', sh: '#f0f0f0', bl: '#2040c0', spd: 1.8 },
    choi: { name: 'CHOI', arch: 'ninja', sk: '#f0c090', hr: '#402010', hs: 'cap', to: '#e0e020', pa: '#3050a0', gl: '#c0c0d0', sh: '#202020', bl: '#e02020', spd: 2.1, sc: 0.84, wd: 0.85 },
    bul: { name: 'BUL', arch: 'heavy', sk: '#e8a870', hr: '#101010', hs: 'mohawk', to: '#e8a870', pa: '#204020', gl: '#202020', sh: '#202020', bl: '#c08020', spd: 1.3, sc: 1.12, wd: 1.35 },
    soldado: { name: 'SOLDADO', arch: 'heavy', sk: '#c08858', hr: '#2a2a10', hs: 'bald', to: '#4a5a30', pa: '#4a5a30', gl: '#202020', sh: '#202020', bl: '#202020', spd: 1.3, sc: 1.1, wd: 1.3 },
    ramos: { name: 'RAMOS', arch: 'brawler', sk: '#d09868', hr: '#f0f0f0', hs: 'short', to: '#e8e8e0', pa: '#5a6a40', gl: '#202020', sh: '#202020', bl: '#5a6a40', spd: 1.7 },
    marco: { name: 'MARCO', arch: 'shoto', sk: '#d09868', hr: '#101010', hs: 'band', to: '#5a6a40', pa: '#5a6a40', gl: '#202020', sh: '#202020', bl: '#e02020', spd: 1.7 },
    rose: { name: 'ROSE', arch: 'lady', sk: '#f8d0b0', hr: '#f0d040', hs: 'long', to: '#2040a0', pa: '#2040a0', gl: '#f0f0f0', sh: '#2040a0', bl: '#e02020', spd: 1.8, sc: 0.95, wd: 0.88 },
    mary: { name: 'MARY', arch: 'grappler', sk: '#f8d0b0', hr: '#e06020', hs: 'pony', to: '#e0e0e0', pa: '#303030', gl: '#303030', sh: '#303030', bl: '#e06020', spd: 1.6, sc: 1.0, wd: 1.0 },
    anna: { name: 'ANNA', arch: 'kicker', sk: '#f8d0b0', hr: '#a02020', hs: 'buns', to: '#f0f0f0', pa: '#202020', gl: '#202020', sh: '#202020', bl: '#a02020', spd: 1.9, sc: 0.94, wd: 0.88 },
    omega: { name: 'OMEGA', arch: 'boss', sk: '#e8b890', hr: '#e8e8e8', hs: 'short', to: '#801818', pa: '#202020', gl: '#202020', sh: '#202020', bl: '#f0d040', spd: 1.6, sc: 1.12, wd: 1.15, boss: 1 }
  };
  const TEAMS = [
    { name: 'HERO TEAM', land: 'JAPAN', m: ['kaze', 'beni', 'tora'], st: 0 },
    { name: 'U.S.A. TEAM', land: 'U.S.A.', m: ['duke', 'rocky', 'sky'], st: 1 },
    { name: 'CHINA TEAM', land: 'CHINA', m: ['lin', 'bao', 'wu'], st: 2 },
    { name: 'KOREA TEAM', land: 'KOREA', m: ['han', 'choi', 'bul'], st: 3 },
    { name: 'BRAZIL TEAM', land: 'BRAZIL', m: ['marco', 'ramos', 'soldado'], st: 4 },
    { name: 'ENGLAND TEAM', land: 'ENGLAND', m: ['rose', 'anna', 'mary'], st: 5 }
  ];
  const BOSS_TEAM = { name: 'THE HOST', land: 'BLACK NOAH', m: ['omega'], st: 6 };
  const STAGES = [
    { sky: ['#f08040', '#f8d080'], far: '#803020', floor: ['#806040', '#5a4028'], crowd: '#402010', deco: 'temple' },
    { sky: ['#101830', '#304878'], far: '#181828', floor: ['#505058', '#383840'], crowd: '#202030', deco: 'city' },
    { sky: ['#401010', '#a03020'], far: '#300808', floor: ['#806048', '#604030'], crowd: '#301010', deco: 'lanterns' },
    { sky: ['#4080c0', '#a0d0f0'], far: '#305830', floor: ['#708050', '#506038'], crowd: '#203018', deco: 'park' },
    { sky: ['#608050', '#c0d090'], far: '#304020', floor: ['#7a6a40', '#5a4a28'], crowd: '#283018', deco: 'base' },
    { sky: ['#283040', '#607080'], far: '#202830', floor: ['#605050', '#403838'], crowd: '#201818', deco: 'pub' },
    { sky: ['#000008', '#201040'], far: '#100820', floor: ['#303048', '#202030'], crowd: '#000000', deco: 'ship' }
  ];
  const ARCH = {
    shoto: { pqcf: 'fireball', pdp: 'uppercut', kqcb: 'spinkick', dm: 'superball' },
    flame: { pqcf: 'flamewave', pdp: 'flameup', pqcb: 'dashpunch', dm: 'superflame' },
    grappler: { pqcf: 'cmdthrow', kqcb: 'tackle', pdp: 'uppercut', dm: 'supergrab' },
    kicker: { kqcb: 'flykick', kdp: 'risekick', kqcf: 'kickrush', dm: 'superkick' },
    ninja: { pqcf: 'kunai', kqcb: 'flykick', kdp: 'risekick', dm: 'superdash' },
    brawler: { pqcf: 'rushpunch', pqcb: 'dashpunch', pdp: 'uppercut', dm: 'superdash' },
    lady: { pqcf: 'fan', kqcb: 'spinkick', kdp: 'risekick', dm: 'superball' },
    heavy: { pqcf: 'quake', kqcb: 'tackle', pdp: 'uppercut', dm: 'supergrab' },
    boss: { pqcf: 'fireball', pqcb: 'dashpunch', pdp: 'uppercut', kqcb: 'spinkick', dm: 'superball' }
  };
  // normal attacks: s startup, a active, r recovery, x/y hitbox (forward/up from feet), d damage, l level, hs hitstun
  const ATK = {
    lp: { s: 3, a: 3, r: 7, x: [10, 46], y: [60, 78], d: 4, l: 'mid', hs: 12, pu: 2.5, po: 'lp' },
    hp: { s: 6, a: 4, r: 16, x: [10, 56], y: [56, 80], d: 9, l: 'mid', hs: 18, pu: 3.5, po: 'hp' },
    lk: { s: 4, a: 3, r: 9, x: [10, 54], y: [32, 56], d: 5, l: 'mid', hs: 13, pu: 2.5, po: 'lk' },
    hk: { s: 8, a: 4, r: 18, x: [10, 64], y: [52, 86], d: 10, l: 'mid', hs: 18, pu: 4, po: 'hk' },
    clp: { s: 3, a: 3, r: 6, x: [10, 44], y: [36, 52], d: 3, l: 'mid', hs: 11, pu: 2, po: 'clp' },
    chp: { s: 5, a: 5, r: 16, x: [4, 40], y: [48, 100], d: 8, l: 'mid', hs: 18, pu: 3, po: 'chp' },
    clk: { s: 4, a: 3, r: 8, x: [10, 52], y: [0, 16], d: 4, l: 'low', hs: 12, pu: 2, po: 'clk' },
    chk: { s: 7, a: 5, r: 20, x: [10, 66], y: [0, 14], d: 8, l: 'low', hs: 18, pu: 2, kd: 1, po: 'chk' },
    jlp: { s: 3, a: 10, r: 0, x: [6, 40], y: [30, 60], d: 5, l: 'high', hs: 13, pu: 2, po: 'jlp' },
    jhp: { s: 5, a: 8, r: 0, x: [6, 46], y: [20, 56], d: 9, l: 'high', hs: 18, pu: 3, po: 'jhp' },
    jlk: { s: 3, a: 12, r: 0, x: [4, 48], y: [6, 36], d: 6, l: 'high', hs: 13, pu: 2, po: 'jlk' },
    jhk: { s: 5, a: 8, r: 0, x: [6, 54], y: [2, 36], d: 10, l: 'high', hs: 18, pu: 3, po: 'jhk' }
  };
  const SP = {
    fireball: { ty: 'proj', st: 12, rec: 30, v: 3.2, d: 10, w: 12, h: 12, y: 58, cols: ['#2050ff', '#80c0ff', '#ffffff'], sh: 'ball' },
    kunai: { ty: 'proj', st: 8, rec: 24, v: 4.6, d: 7, w: 10, h: 4, y: 62, cols: ['#c0c0d0', '#ffffff', '#ffffff'], sh: 'kunai' },
    fan: { ty: 'proj', st: 10, rec: 28, v: 3, d: 8, w: 10, h: 10, y: 60, cols: ['#e05090', '#f0d040', '#ffffff'], sh: 'fan' },
    flamewave: { ty: 'proj', st: 12, rec: 30, v: 2.6, d: 10, w: 12, h: 26, y: 0, cols: ['#ff4010', '#ffa020', '#fff060'], sh: 'flame' },
    quake: { ty: 'proj', st: 16, rec: 30, v: 3, d: 11, w: 14, h: 18, y: 0, cols: ['#806040', '#c0a060', '#ffffff'], sh: 'rock' },
    superball: { ty: 'proj', st: 18, rec: 34, v: 3.6, d: 30, w: 24, h: 24, y: 50, cols: ['#ff2020', '#ffa040', '#ffffff'], sh: 'ball', dm: 1, kd: 1 },
    superflame: { ty: 'proj', st: 18, rec: 34, v: 3.2, d: 30, w: 18, h: 50, y: 0, cols: ['#a020ff', '#ff60ff', '#ffffff'], sh: 'flame', dm: 1, kd: 1 },
    uppercut: { ty: 'rise', d: 13, vy: -7.4, vx: 1.4, inv: 8, po: 'upper' },
    flameup: { ty: 'rise', d: 14, vy: -7, vx: 1.2, inv: 8, po: 'upper', fire: 1 },
    risekick: { ty: 'rise', d: 12, vy: -7.2, vx: 1.6, inv: 6, po: 'risek' },
    superkick: { ty: 'rise', d: 26, vy: -8, vx: 2.2, inv: 16, po: 'risek', dm: 1, hits: 4 },
    spinkick: { ty: 'spin', d: 7, dur: 40, vx: 2.6, lift: 16, hits: 2, po: 'spin' },
    flykick: { ty: 'fly', d: 12, vx: 4.6, vy: -3.4, po: 'flyk' },
    tackle: { ty: 'dash', d: 13, dur: 26, st: 8, vx: 5, po: 'dash', y: [20, 70] },
    dashpunch: { ty: 'dash', d: 12, dur: 22, st: 6, vx: 5.6, po: 'dashp', y: [40, 80] },
    superdash: { ty: 'dash', d: 28, dur: 40, st: 10, vx: 6.2, po: 'dashp', y: [20, 84], dm: 1, hits: 5 },
    rushpunch: { ty: 'rush', d: 3, dur: 40, ev: 6, po: 'rush', x: [10, 54], y: [50, 80] },
    kickrush: { ty: 'rush', d: 3, dur: 40, ev: 6, po: 'rushk', x: [10, 60], y: [30, 80] },
    cmdthrow: { ty: 'grab', d: 16, rng: 46, po: 'grab' },
    supergrab: { ty: 'grab', d: 32, rng: 58, po: 'grab', dm: 1 }
  };
  // ---------- poses (absolute degrees; 0 = straight down, + = toward facing, 180 = up) ----------
  const G = { bu: 30, bf: 125, fu: 50, ff: 140 };
  const LS = { ln: 6, bt: -12, bs: -6, ft: 16, fs: 6 };
  const CRL = { ln: 22, bt: 70, bs: -30, ft: 80, fs: -20 };
  const JPL = { ln: 10, bt: 40, bs: -60, ft: 100, fs: -20 };
  const PO = {
    stand: Object.assign({}, LS, G),
    walk1: Object.assign({}, G, { ln: 8, bt: -24, bs: -10, ft: 24, fs: 0 }),
    walk2: Object.assign({}, G, { ln: 8, bt: 0, bs: -18, ft: 4, fs: -4 }),
    run1: { ln: 28, bt: -40, bs: -60, ft: 50, fs: 10, bu: -40, bf: 20, fu: 70, ff: 120 },
    run2: { ln: 28, bt: 30, bs: -10, ft: -20, fs: -70, bu: 60, bf: 120, fu: -30, ff: 30 },
    crouch: Object.assign({}, CRL, { bu: 40, bf: 130, fu: 60, ff: 140 }),
    jump: Object.assign({}, JPL, { bu: 60, bf: 120, fu: 80, ff: 120 }),
    lp: Object.assign({}, LS, { ln: 10, bu: 30, bf: 125, fu: 90, ff: 90 }),
    hp: { ln: 18, bt: -25, bs: -10, ft: 30, fs: 10, bu: 10, bf: 60, fu: 92, ff: 92 },
    lk: { ln: -8, bt: -6, bs: -4, ft: 85, fs: 85, bu: 30, bf: 125, fu: 40, ff: 120 },
    hk: { ln: -24, bt: -4, bs: -4, ft: 122, fs: 122, bu: 20, bf: 100, fu: 10, ff: 80 },
    clp: Object.assign({}, CRL, { bu: 40, bf: 130, fu: 90, ff: 90 }),
    chp: Object.assign({}, CRL, { ln: 10, bu: 40, bf: 130, fu: 170, ff: 176 }),
    clk: { ln: 14, bt: 70, bs: -30, ft: 92, fs: 92, bu: 40, bf: 130, fu: 60, ff: 140 },
    chk: { ln: 34, bt: 84, bs: -44, ft: 96, fs: 95, bu: 10, bf: 30, fu: 20, ff: 40 },
    jlp: Object.assign({}, JPL, { bu: 60, bf: 120, fu: 105, ff: 105 }),
    jhp: Object.assign({}, JPL, { ln: 20, bu: 50, bf: 100, fu: 125, ff: 115 }),
    jlk: Object.assign({}, JPL, { ft: 96, fs: 96, bu: 60, bf: 120, fu: 80, ff: 120 }),
    jhk: { ln: -10, bt: 40, bs: -60, ft: 112, fs: 104, bu: 60, bf: 100, fu: 30, ff: 60 },
    hit: { ln: -20, bt: -10, bs: -4, ft: 20, fs: 4, bu: -30, bf: 20, fu: -10, ff: 40 },
    block: Object.assign({}, LS, { ln: -4, bu: 40, bf: 160, fu: 50, ff: 165 }),
    cblock: Object.assign({}, CRL, { ln: 6, bu: 40, bf: 160, fu: 50, ff: 165 }),
    fire: { ln: 16, bt: -30, bs: -10, ft: 34, fs: 10, bu: 88, bf: 90, fu: 90, ff: 90 },
    windup: { ln: -6, bt: -20, bs: -6, ft: 24, fs: 6, bu: -40, bf: 40, fu: -30, ff: 60 },
    upper: { ln: -4, bt: -4, bs: -4, ft: 80, fs: -60, bu: 20, bf: 90, fu: 175, ff: 178 },
    risek: { ln: -20, bt: 20, bs: -40, ft: 165, fs: 170, bu: 120, bf: 140, fu: 60, ff: 90 },
    spin: { ln: 0, bt: 30, bs: -40, ft: 92, fs: 92, bu: 100, bf: 100, fu: 80, ff: 80 },
    flyk: { ln: -20, bt: 40, bs: -60, ft: 100, fs: 100, bu: 120, bf: 140, fu: 60, ff: 100 },
    dash: { ln: 30, bt: -40, bs: -30, ft: 40, fs: 10, bu: 20, bf: 40, fu: 70, ff: 160 },
    dashp: { ln: 30, bt: -40, bs: -30, ft: 40, fs: 10, bu: 20, bf: 40, fu: 92, ff: 92 },
    rush: Object.assign({}, LS, { ln: 14, bu: 80, bf: 90, fu: 92, ff: 92 }),
    rushk: { ln: -10, bt: -6, bs: -4, ft: 100, fs: 100, bu: 30, bf: 125, fu: 40, ff: 120 },
    grab: Object.assign({}, LS, { ln: 12, bu: 70, bf: 60, fu: 85, ff: 70 }),
    throwp: { ln: -20, bt: -25, bs: -5, ft: 30, fs: 10, bu: 150, bf: 170, fu: 160, ff: 175 },
    win: { ln: 0, bt: -10, bs: -4, ft: 10, fs: 4, bu: 20, bf: 30, fu: 172, ff: 178 },
    charge: { ln: 0, bt: -22, bs: -18, ft: 22, fs: 18, bu: 20, bf: -20, fu: 20, ff: -20 },
    dodge: Object.assign({}, CRL, { ln: -10, bu: 40, bf: 160, fu: 50, ff: 165 })
  };

  ArcadeRegistry.register({
    id: 'kingoffighters', title: 'King of Fighters', year: 1994, maker: 'SNK',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move/jump/crouch (hold back = guard, tap twice = run) \u00b7 Space: punch, X: kick (tap light, hold heavy) \u00b7 Space+X: dodge (hold to charge POW) \u00b7 Enter: start',
    marquee: { bg: '#081030', fg: '#f0d040', accent: '#e02020' },
    create(api) {
      const A = api.audio;
      const sfx = {
        whoosh: () => A.noise(0.07, { vol: 0.05, freq: 3500, type: 'highpass' }),
        hitL: () => { A.noise(0.08, { vol: 0.2, freq: 1500 }); A.tone(180, 0.06, { type: 'square', vol: 0.07, slideTo: 90 }); },
        hitH: () => { A.noise(0.2, { vol: 0.28, freq: 900, slideTo: 150 }); A.tone(120, 0.14, { type: 'square', vol: 0.11, slideTo: 45 }); },
        block: () => A.noise(0.05, { vol: 0.14, freq: 4500, type: 'bandpass' }),
        fire: () => { A.tone(260, 0.28, { type: 'sawtooth', vol: 0.09, slideTo: 620 }); A.noise(0.3, { vol: 0.08, freq: 900 }); },
        rise: () => A.tone(200, 0.3, { type: 'square', vol: 0.09, slideTo: 900 }),
        jump: () => A.noise(0.05, { vol: 0.05, freq: 1200 }),
        thud: () => { A.noise(0.25, { vol: 0.25, freq: 400, slideTo: 60 }); A.tone(70, 0.2, { type: 'sine', vol: 0.2, slideTo: 35 }); },
        ko: () => A.melody([[523, 0.1], [392, 0.1], [262, 0.12], [196, 0.4]], { type: 'square', vol: 0.14 }),
        dm: () => { A.melody([[392, 0.06], [523, 0.06], [784, 0.06], [1047, 0.2]], { type: 'square', vol: 0.12 }); A.noise(0.5, { vol: 0.12, freq: 2000, slideTo: 400 }); },
        max: () => A.melody([[659, 0.06], [784, 0.06], [988, 0.06], [1319, 0.25]], { type: 'square', vol: 0.12 }),
        charge: () => A.tone(300 + Math.random() * 200, 0.06, { type: 'sawtooth', vol: 0.03 }),
        fight: () => A.melody([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.25]], { type: 'square', vol: 0.12 }),
        sel: () => A.tone(880, 0.05, { type: 'square', vol: 0.08 }),
        ok: () => A.melody([[659, 0.06], [880, 0.06], [1318, 0.15]], { type: 'square', vol: 0.12 }),
        coin: () => A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }),
        win: () => A.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.12], [784, 0.12], [1046, 0.4]], { type: 'square', vol: 0.13 }),
        over: () => A.melody([[330, 0.25], [294, 0.25], [262, 0.25], [196, 0.6]], { type: 'triangle', vol: 0.15 })
      };
      const TUNES = [
        { m: [7, null, 10, 12, 10, null, 7, 5, 7, null, 3, 5, 7, null, null, null], b: [0, 0, -2, -2, -4, -4, -5, -5] },
        { m: [0, 3, 5, 7, null, 5, 3, 0, 10, null, 7, null, 5, 3, 5, null], b: [0, 0, 3, 3, 5, 5, -2, -2] },
        { m: [12, null, 7, null, 8, 7, 5, null, 3, null, 5, 7, 0, null, null, null], b: [0, 0, -4, -4, -2, -2, -5, -7] },
        { m: [0, null, 0, 12, 10, null, 7, null, 5, 7, 10, null, 7, null, 3, null], b: [0, 0, 5, 5, 3, 3, -2, -2] }
      ];
      let musStep = 0, musT = 0;
      function music(tune) {
        if (++musT < 9) return; musT = 0;
        const t = TUNES[tune % TUNES.length], i = musStep++ % 16, n = t.m[i];
        if (n != null) A.tone(440 * Math.pow(2, n / 12), 0.12, { type: 'square', vol: 0.03 });
        if (i % 2 === 0) A.tone(110 * Math.pow(2, t.b[(i >> 1) % 8] / 12), 0.14, { type: 'triangle', vol: 0.09 });
        if (i % 4 === 0) A.noise(0.04, { vol: 0.04, freq: 500 });
      }

      let mode = 'title', T = 0, mt = 0, score = 0, hi = api.getHiScore(80000), lastCred = api.credits, coinFlash = 0;
      let P = null, E = null, demo = false, myTeam = null, enTeam = null, ladder = [], lpos = 0, round = 1, timer = 60, tick = 0, rp = 'intro', rt = 0;
      let freeze = 0, cam = STW / 2 - W / 2, shake = 0, projs = [], sparks = [], msgs = [], selIdx = 0, superFlash = 0, stageIdx = 0, koWho = null;

      // ---------- fighters ----------
      function mkF(id, x, face, cpu, lv, hp) {
        const c = CH[id];
        return {
          id, c, x, y: 0, vx: 0, vy: 0, face, hp: hp == null ? MAXHP : hp, dhp: hp == null ? MAXHP : hp, st: 'stand', t: 0, anim: 0,
          atk: null, spec: null, req: null, reqT: 0, dir: 5, buf: [], cpu, inv: 0, airAtk: false, flash: 0, pow: 0, maxT: 0,
          lastP: -99, lastK: -99, pend: null, both: null, proj: null, stun: 0, thr: null, tapT: { 4: -99, 6: -99 }, prevH: 0, run: false,
          ai: { lv: lv || 0, hold: 0, dir: 5, cool: 30, walk: 5, seen: null }
        };
      }
      const isAir = f => f.y > 0 || f.st === 'jump';
      const actable = f => f.st === 'stand' || f.st === 'walk' || f.st === 'crouch' || f.st === 'run';
      const sc = f => f.c.sc || 1, wd = f => f.c.wd || 1;
      function hurt(f) {
        const s = sc(f), hw = 12 * Math.min(1.4, wd(f)) * s;
        let h = 86 * s;
        if (f.st === 'crouch' || f.st === 'cblock' || f.st === 'dodge' || (f.st === 'attack' && f.atk && f.atk.n[0] === 'c')) h = 58 * s;
        else if (f.st === 'jump') h = 66 * s;
        else if (f.st === 'down' || f.st === 'ko' || f.st === 'getup') h = 14;
        return [f.x - hw, f.x + hw, f.y, f.y + h];
      }
      // ---------- input ----------
      function seq(f, steps, win) {
        const b = f.buf; let s = 0;
        for (let i = Math.max(0, b.length - win); i < b.length && s < steps.length; i++) if (steps[s].indexOf(b[i]) >= 0) s++;
        return s === steps.length;
      }
      const QCF = f => seq(f, [[2], [3], [6]], 18), DP = f => seq(f, [[6], [2, 1], [3]], 18), QCB = f => seq(f, [[2], [1], [4]], 18);
      const QCF2 = f => seq(f, [[2], [3, 6], [2], [3], [6]], 36);
      const canDM = f => f.hp <= MAXHP * 0.25 || f.maxT > 0;
      function trySpecial(f, b) {
        const a = ARCH[f.c.arch];
        if (b === 'p' && canDM(f) && QCF2(f)) return a.dm;
        if (DP(f) && a[b + 'dp']) return a[b + 'dp'];
        if (QCB(f) && a[b + 'qcb']) return a[b + 'qcb'];
        if (QCF(f) && a[b + 'qcf']) return a[b + 'qcf'];
        return null;
      }
      function readPlayer(f) {
        const L = api.key('ArrowLeft'), Rr = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const hx = (Rr ? 1 : 0) - (L ? 1 : 0);
        f.dir = 5 + hx * f.face + (U ? 3 : D ? -3 : 0);
        // double-tap run / backstep
        const h = hx * f.face;
        if (h !== 0 && f.prevH !== h && !U && !D) { const k = h > 0 ? 6 : 4; f.dash = (T - f.tapT[k] < 14) ? k : 0; f.tapT[k] = T; }
        if (h === 0) f.dash = 0;
        f.prevH = h;
        const pP = api.pressed('Space'), pK = api.pressed('KeyX'), pHP = api.pressed('KeyZ'), pHK = api.pressed('KeyC');
        if (pP) f.lastP = T; if (pK) f.lastK = T;
        if ((pP && T - f.lastK <= 3) || (pK && T - f.lastP <= 3)) { f.pend = null; f.both = { t: 0 }; return; }
        if (f.both) {
          if (api.key('Space') && api.key('KeyX')) { f.both.t++; f.charging = f.both.t > 10; }
          else { if (f.both.t <= 10) { f.req = 'dodge'; f.reqT = 6; } f.both = null; f.charging = false; }
          return;
        }
        f.charging = false;
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
          if (!held || isAir(f)) { f.req = 'l' + f.pend.b; f.reqT = 6; f.pend = null; }
          else if (f.pend.t >= 6) { f.req = 'h' + f.pend.b; f.reqT = 6; f.pend = null; }
        }
      }
      // ---------- CPU ----------
      function aiThink(f, o) {
        const a = f.ai, lv = a.lv, dx = o.x - f.x, dist = Math.abs(dx), ar = ARCH[f.c.arch];
        const projSp = ar.pqcf && SP[ar.pqcf].ty === 'proj' ? ar.pqcf : null;
        const aaSp = ar.pdp || ar.kdp, dashSp = ar.kqcb || ar.pqcb, closeSp = ar.pqcf && !projSp ? ar.pqcf : ar.kqcf;
        f.charging = false;
        if (f.st === 'charge' && a.hold > 0) { a.hold--; f.charging = true; f.dir = 5; return; }
        if (f.st === 'jump') {
          if (!f.atk && !f.airAtk && f.vy > -1 && dist < 70 && Math.random() < 0.3) { f.req = Math.random() < 0.6 ? 'hk' : 'hp'; f.reqT = 4; }
          return;
        }
        if (f.st === 'block' || f.st === 'cblock') { f.dir = a.dir; return; }
        if (!actable(f)) { f.dir = 5; return; }
        if (a.hold > 0) { a.hold--; f.dir = a.dir; if (a.charge) f.charging = true; return; }
        a.charge = false;
        f.dir = 5;
        const pr = projs.find(p => p.owner === o && Math.sign(p.vx) === Math.sign(f.x - p.x) && Math.abs(p.x - f.x) < 120);
        if (pr && pr !== a.seen) {
          a.seen = pr;
          const r2 = Math.random();
          if (r2 < 0.2 + lv * 0.04) f.dir = 9;
          else if (r2 < 0.35 + lv * 0.04) { f.req = 'dodge'; f.reqT = 4; }
          else if (projSp && !f.proj && r2 < 0.55) { f.req = projSp; f.reqT = 4; }
          else if (r2 < 0.75 + lv * 0.02) { a.dir = 4; a.hold = 30; f.dir = 4; }
          return;
        }
        const thr = (o.atk && dist < 90) ? o.atk : (o.st === 'special' && dist < 130 ? o.spec : null);
        if (thr && thr !== a.seen) {
          a.seen = thr;
          if (Math.random() < Math.min(0.85, 0.2 + lv * 0.07)) {
            const low = o.atk && o.atk.a && o.atk.a.l === 'low';
            if (Math.random() < 0.12 + lv * 0.02) { f.req = 'dodge'; f.reqT = 4; return; }
            a.dir = low ? 1 : 4; a.hold = 18; f.dir = a.dir; return;
          }
        }
        if (o.st === 'jump' && dist < 100 && o.vy > -3 && o !== a.seen) {
          a.seen = o;
          if (Math.random() < 0.15 + lv * 0.06) { if (aaSp) f.req = aaSp; else { f.dir = 2; a.dir = 2; a.hold = 6; f.req = 'hp'; } f.reqT = 4; return; }
        }
        if (o.st !== 'jump' && a.seen === o) a.seen = null;
        if (canDM(f) && dist < 150 && Math.random() < 0.012 + lv * 0.004) { f.req = ARCH[f.c.arch].dm; f.reqT = 4; return; }
        if (--a.cool > 0) { f.dir = a.walk; return; }
        a.cool = 8 + Math.floor(Math.random() * Math.max(10, 40 - lv * 3)); a.walk = 5;
        const q = Math.random();
        const go = (d, h) => { a.dir = d; a.hold = h; f.dir = d; };
        if (dist > 150) {
          if (projSp && !f.proj && q < 0.35) f.req = projSp;
          else if (f.pow < 100 && f.maxT <= 0 && q < 0.45 && o.st !== 'special') { a.charge = true; go(5, 30); }
          else if (q < 0.6) f.dir = 9;
          else a.walk = 6;
        } else if (dist > 60) {
          if (q < 0.2) f.dir = 9;
          else if (projSp && !f.proj && q < 0.38) f.req = projSp;
          else if (dashSp && q < 0.5) f.req = dashSp;
          else if (q < 0.88) a.walk = 6; else a.walk = 4;
        } else {
          if (q < 0.14 && closeSp) f.req = closeSp;
          else if (q < 0.3) f.req = ['lp', 'lk', 'hp', 'hk'][Math.floor(Math.random() * 4)];
          else if (q < 0.48) { go(2, 3); f.req = Math.random() < 0.5 ? 'hk' : 'lk'; }
          else if (q < 0.56 && dist < 36) { f.dir = 6; f.req = 'hp'; }
          else if (q < 0.64 && aaSp) f.req = aaSp;
          else if (q < 0.76) go(4, 16);
          else if (q < 0.84) go(1, 16);
          else f.dir = 8;
        }
        if (f.req) f.reqT = 4;
      }
      // ---------- actions ----------
      function startAttack(f, n) {
        const a = ATK[n];
        f.st = 'attack'; f.atk = { n, a, t: 0, hit: false }; f.t = 0; sfx.whoosh();
      }
      function startSpecial(f, id) {
        const s = SP[id];
        if (s.ty === 'proj' && f.proj) return false;
        if (s.dm) {
          if (!canDM(f)) return false;
          if (f.maxT > 0) { f.maxT = 0; f.pow = 0; }
          superFlash = 30; freeze = 18; sfx.dm();
          msgs.push({ s: 'DESPERATION!', t: 50, x: f.x, y: GY - 110, c: '#ffe040' });
        }
        f.st = 'special'; f.spec = { id, s, t: 0, hits: 0, lastHit: -99 }; f.t = 0; f.vx = 0;
        if (s.ty === 'rise') { f.inv = s.inv; sfx.rise(); }
        if (s.ty === 'fly') { f.vx = s.vx * f.face; f.vy = s.vy; f.y = 1; }
        f.pow = Math.min(100, f.pow + 1);
        return true;
      }
      function act(f, o) {
        if (f.reqT > 0) f.reqT--; else f.req = null;
        const r = f.req;
        if (f.st === 'jump') {
          if (r && !f.atk && !f.airAtk && ATK['j' + r]) { f.atk = { n: 'j' + r, a: ATK['j' + r], t: 0, hit: false }; f.airAtk = true; f.req = null; sfx.whoosh(); }
          return;
        }
        if (!actable(f)) return;
        if (r === 'dodge') { f.req = null; f.st = 'dodge'; f.t = 0; f.inv = 22; return; }
        if (r && SP[r]) { if (startSpecial(f, r)) { f.req = null; return; } f.req = null; }
        if (r && ATK[r]) {
          // throw: close, forward/back + heavy punch
          if (r === 'hp' && (f.dir === 6 || f.dir === 4) && Math.abs(o.x - f.x) < 38 && !isAir(o) && actable(o) && o.inv <= 0) {
            f.req = null; f.st = 'throw'; f.t = 0; f.thr = { back: f.dir === 4 };
            o.st = 'thrown'; o.t = 0; o.atk = null; o.spec = null;
            return;
          }
          const crouch = f.dir <= 3;
          startAttack(f, crouch ? 'c' + r : r); f.req = null; return;
        }
        if (f.charging) { f.st = 'charge'; f.t = 0; return; }
        if (f.dir >= 7) { f.st = 'prejump'; f.t = 0; f.jdir = f.dir === 9 ? 1 : f.dir === 7 ? -1 : 0; return; }
        if (f.dir <= 3) { f.st = 'crouch'; return; }
        if (f.dir === 6) { f.st = f.dash === 6 || f.st === 'run' && f.dir === 6 ? 'run' : 'walk'; f.wdir = 1; return; }
        if (f.dir === 4) {
          if (f.dash === 4 && f.st !== 'backstep') { f.dash = 0; f.st = 'backstep'; f.t = 0; f.y = 1; f.vy = -2.6; f.vx = -3.4 * f.face; return; }
          f.st = 'walk'; f.wdir = -1; return;
        }
        f.st = 'stand';
      }
      function hitStop(n) { freeze = Math.max(freeze, n); }
      function dmgMul(f) { return f.maxT > 0 ? 1.5 : 1; }
      function applyHit(att, def, dmg, hs, pu, lvl, kd, x, y, isSpecial) {
        // returns 'hit' | 'block'
        const back = def.dir === 4 || def.dir === 1 || def.dir === 7;
        const canBlock = (actable(def) || def.st === 'block' || def.st === 'cblock') && back && !isAir(def);
        const crouching = def.dir <= 3;
        const okLevel = lvl === 'mid' || (lvl === 'low' && crouching) || (lvl === 'high' && !crouching);
        if (canBlock && okLevel) {
          def.st = crouching ? 'cblock' : 'block'; def.t = 0; def.stun = Math.max(8, Math.round(hs * 0.6));
          def.vx = -def.face * pu * 0.8;
          const chip = isSpecial ? Math.max(1, Math.round(dmg * 0.15)) : 0;
          def.hp = Math.max(1, def.hp - chip);
          sparks.push({ x, y, t: 10, k: 'block' }); sfx.block(); hitStop(6);
          att.pow = Math.min(100, att.pow + 1); def.pow = Math.min(100, def.pow + 2); checkMax(att); checkMax(def);
          return 'block';
        }
        dmg = Math.round(dmg * dmgMul(att));
        def.hp = Math.max(0, def.hp - dmg); def.flash = 6;
        if (att === P && !demo) score += dmg * 100;
        def.atk = null; def.spec = null; def.charging = false;
        if (isAir(def) || kd || def.hp <= 0) {
          def.st = 'fall'; def.t = 0; def.vy = -4; def.vx = -def.face * 2.2; def.y = Math.max(def.y, 1);
        } else { def.st = 'hit'; def.t = 0; def.stun = hs; def.vx = -def.face * pu; }
        sparks.push({ x, y, t: 12, k: dmg >= 9 ? 'big' : 'small' });
        dmg >= 9 ? sfx.hitH() : sfx.hitL();
        hitStop(dmg >= 9 ? 9 : 6); if (dmg >= 12) shake = 8;
        att.pow = Math.min(100, att.pow + 3); def.pow = Math.min(100, def.pow + 4); checkMax(att); checkMax(def);
        return 'hit';
      }
      function checkMax(f) {
        if (f.pow >= 100 && f.maxT <= 0) { f.maxT = 600; f.pow = 100; if (!demo) sfx.max(); msgs.push({ s: 'MAXIMUM', t: 50, x: f.x, y: GY - 120, c: '#ff6040' }); }
      }
      function boxHit(f, o, bx, by) {
        // bx,by local box: forward range and height range; returns contact point or null
        const x0 = f.face > 0 ? f.x + bx[0] * sc(f) : f.x - bx[1] * sc(f), x1 = f.face > 0 ? f.x + bx[1] * sc(f) : f.x - bx[0] * sc(f);
        const y0 = f.y + by[0] * sc(f), y1 = f.y + by[1] * sc(f);
        const h = hurt(o);
        if (o.inv > 0 || o.st === 'ko' || o.st === 'down' || o.st === 'getup' || o.st === 'thrown') return null;
        if (x1 < h[0] || x0 > h[1] || y1 < h[2] || y0 > h[3]) return null;
        return [(Math.max(x0, h[0]) + Math.min(x1, h[1])) / 2, GY - (Math.max(y0, h[2]) + Math.min(y1, h[3])) / 2];
      }
      function stepFighter(f, o) {
        f.anim++; f.t++;
        if (f.inv > 0) f.inv--;
        if (f.flash > 0) f.flash--;
        if (f.maxT > 0) { f.maxT--; if (f.maxT === 0) f.pow = 0; }
        if (f.dhp > f.hp) f.dhp = Math.max(f.hp, f.dhp - 0.6);
        f.buf.push(f.dir); if (f.buf.length > 40) f.buf.shift();
        if (actable(f) && !isAir(f)) f.face = o.x >= f.x ? 1 : -1;
        act(f, o);
        const s = f.st;
        if (s === 'walk') { f.x += (f.wdir > 0 ? f.c.spd : -f.c.spd * 0.8) * f.face; }
        else if (s === 'run') { f.x += f.c.spd * 2.2 * f.face; if (f.dir !== 6) f.st = 'stand'; if (f.anim % 12 === 0) sfx.jump(); }
        else if (s === 'charge') { f.pow = Math.min(100, f.pow + 0.9); if (f.anim % 5 === 0) sfx.charge(); checkMax(f); if (!f.charging || f.maxT > 0) f.st = 'stand'; }
        else if (s === 'dodge') { if (f.t > 26) f.st = 'stand'; }
        else if (s === 'prejump') { if (f.t >= 3) { f.st = 'jump'; f.vy = -6.6; f.vx = f.jdir * 2.3 * f.face; f.y = 1; f.airAtk = false; f.atk = null; sfx.jump(); } }
        else if (s === 'backstep') { f.vy += 0.35; f.y -= f.vy; f.x += f.vx; if (f.y <= 0) { f.y = 0; f.vx = 0; f.st = 'stand'; } }
        else if (s === 'jump') {
          f.vy += 0.3; f.y -= f.vy; f.x += f.vx;
          if (f.atk) { f.atk.t++; airHitCheck(f, o); }
          if (f.y <= 0) { f.y = 0; f.vx = 0; f.st = 'land'; f.t = 0; f.atk = null; }
        } else if (s === 'land') { if (f.t > 4) f.st = 'stand'; }
        else if (s === 'attack') {
          const a = f.atk.a; f.atk.t++;
          const t = f.atk.t;
          if (t > a.s && t <= a.s + a.a && !f.atk.hit) {
            const cp = boxHit(f, o, a.x, a.y);
            if (cp) { f.atk.hit = true; applyHit(f, o, a.d, a.hs, a.pu, a.l, a.kd, cp[0], cp[1], false); }
          }
          if (t > a.s + a.a + a.r) { f.atk = null; f.st = f.dir <= 3 ? 'crouch' : 'stand'; }
        } else if (s === 'special') stepSpecial(f, o);
        else if (s === 'hit') { f.x += f.vx; f.vx *= 0.8; if (f.t >= f.stun) f.st = 'stand'; }
        else if (s === 'block' || s === 'cblock') { f.x += f.vx; f.vx *= 0.8; if (f.t >= f.stun) f.st = s === 'cblock' ? 'crouch' : 'stand'; }
        else if (s === 'fall') {
          f.vy += 0.3; f.y -= f.vy; f.x += f.vx;
          if (f.y <= 0) { f.y = 0; f.vx = 0; f.st = f.hp <= 0 ? 'ko' : 'down'; f.t = 0; sfx.thud(); shake = 6; }
        } else if (s === 'down') { if (f.t > 40) { f.st = 'getup'; f.t = 0; } }
        else if (s === 'getup') { if (f.t > 18) { f.st = 'stand'; f.inv = 8; } }
        else if (s === 'throw') {
          if (f.t === 14) {
            o.x = f.x + (f.thr.back ? -1 : 1) * f.face * 30; o.face = -o.face;
            o.st = 'fall'; o.t = 0; o.vy = -3.5; o.vx = (f.thr.back ? -1 : 1) * f.face * 2.4; o.y = 30;
            const d = Math.round(12 * dmgMul(f)); o.hp = Math.max(0, o.hp - d); o.flash = 6; if (f === P && !demo) score += d * 100;
            sfx.hitH(); shake = 6;
            f.pow = Math.min(100, f.pow + 4); checkMax(f);
          }
          if (f.t > 26) f.st = 'stand';
        } else if (s === 'thrown') { if (f.t > 60) { f.st = 'fall'; f.t = 0; f.vy = -2; f.y = Math.max(f.y, 1); } }
        else if (s === 'ko') { }
        else if (s === 'win') { }
        // ground friction & bounds
        f.x = clamp(f.x, cam + 14, cam + W - 14);
        f.x = clamp(f.x, 16, STW - 16);
      }
      function airHitCheck(f, o) {
        const a = f.atk.a;
        if (f.atk.t > a.s && f.atk.t <= a.s + a.a && !f.atk.hit) {
          const cp = boxHit(f, o, a.x, a.y);
          if (cp) { f.atk.hit = true; applyHit(f, o, a.d, a.hs, a.pu, a.l, false, cp[0], cp[1], false); }
        }
      }
      function stepSpecial(f, o) {
        const sp = f.spec, s = sp.s; sp.t++;
        const t = sp.t;
        const done = () => { f.spec = null; f.st = 'stand'; f.vx = 0; f.y = 0; };
        if (s.ty === 'proj') {
          if (t === s.st) {
            const p = { owner: f, x: f.x + f.face * 30, y: s.y * sc(f) + (s.sh === 'flame' || s.sh === 'rock' ? 0 : 0), vx: s.v * f.face, d: s.d, w: s.w, h: s.h, cols: s.cols, sh: s.sh, t: 0, kd: s.kd, dm: s.dm };
            projs.push(p); f.proj = p; sfx.fire();
          }
          if (t > s.st + s.rec) done();
        } else if (s.ty === 'rise') {
          if (t === 3) { f.vy = s.vy; f.vx = s.vx * f.face; f.y = 1; }
          if (t > 3) {
            f.vy += 0.36; f.y -= f.vy; f.x += f.vx;
            const maxHits = s.hits || 1;
            if (sp.hits < maxHits && t - sp.lastHit > 6 && f.vy < 2) {
              const cp = boxHit(f, o, [0, 40], [30, 110]);
              if (cp) { sp.hits++; sp.lastHit = t; applyHit(f, o, Math.round(s.d / maxHits), 20, 2, 'mid', sp.hits >= maxHits, cp[0], cp[1], true); }
            }
            if (f.y <= 0) { f.y = 0; f.st = 'land'; f.t = -10; f.spec = null; f.vx = 0; }
          }
        } else if (s.ty === 'spin') {
          f.y = Math.min(s.lift, t * 2); f.x += s.vx * f.face;
          if (t % 12 === 6 && sp.hits < s.hits) {
            const cp = boxHit(f, o, [-20, 50], [s.lift + 20, s.lift + 70]);
            if (cp) { sp.hits++; applyHit(f, o, s.d, 16, 2, 'mid', sp.hits >= s.hits, cp[0], cp[1], true); }
          }
          if (t >= s.dur) { f.y = 0; f.st = 'land'; f.t = -6; f.spec = null; }
        } else if (s.ty === 'fly') {
          f.vy += 0.25; f.y -= f.vy; f.x += f.vx;
          if (sp.hits < 1) { const cp = boxHit(f, o, [0, 46], [0, 50]); if (cp) { sp.hits = 1; applyHit(f, o, s.d, 18, 3, 'mid', true, cp[0], cp[1], true); f.vx = -f.vx * 0.3; } }
          if (f.y <= 0) { f.y = 0; f.st = 'land'; f.t = -8; f.spec = null; f.vx = 0; }
        } else if (s.ty === 'dash') {
          if (t > s.st && t <= s.st + s.dur) {
            f.x += s.vx * f.face;
            const maxHits = s.hits || 1;
            if (sp.hits < maxHits && t - sp.lastHit > 6) {
              const cp = boxHit(f, o, [0, 44], s.y);
              if (cp) { sp.hits++; sp.lastHit = t; applyHit(f, o, Math.round(s.d / maxHits), 16, 1, 'mid', sp.hits >= maxHits, cp[0], cp[1], true); if (sp.hits >= maxHits) sp.t = s.st + s.dur; }
            }
          }
          if (t > s.st + s.dur + 18) done();
        } else if (s.ty === 'rush') {
          if (t % s.ev === 0 && t < s.dur) {
            f.x += f.face * 1.5;
            const cp = boxHit(f, o, s.x, s.y);
            if (cp) applyHit(f, o, s.d, 14, 1, 'mid', t + s.ev >= s.dur, cp[0], cp[1], true);
            else sfx.whoosh();
          }
          if (t > s.dur + 14) done();
        } else if (s.ty === 'grab') {
          if (t === 6) {
            if (Math.abs(o.x - f.x) < s.rng * sc(f) && !isAir(o) && o.inv <= 0 && o.st !== 'down' && o.st !== 'ko') {
              o.st = 'thrown'; o.t = 0; o.atk = null; o.spec = null; sp.got = true;
            }
          }
          if (sp.got) {
            o.x = f.x + f.face * 22; o.y = t < 30 ? Math.min(40, (t - 6) * 3) : Math.max(0, 40 - (t - 30) * 6);
            if (t % 8 === 0) { sfx.hitL(); shake = 3; }
            if (t === 36) {
              const d = Math.round(s.d * dmgMul(f)); o.hp = Math.max(0, o.hp - d); o.flash = 6; o.st = 'fall'; o.t = 0; o.vy = -3; o.vx = f.face * 2; o.y = 10;
              if (f === P && !demo) score += d * 100; sfx.hitH(); shake = 10; hitStop(10);
              f.pow = Math.min(100, f.pow + 5); checkMax(f);
            }
            if (t > 44) done();
          } else if (t > 32) done();
        }
      }
      function stepProjs() {
        for (const p of projs) {
          p.x += p.vx; p.t++;
          if (p.x < cam - 40 || p.x > cam + W + 40) p.dead = true;
          const o = p.owner === P ? E : P;
          if (!p.dead && o) {
            const h = hurt(o);
            if (o.inv <= 0 && o.st !== 'ko' && o.st !== 'down' && o.st !== 'thrown' && p.x + p.w > h[0] && p.x - p.w < h[1] && p.y + p.h > h[2] && p.y - (p.sh === 'flame' || p.sh === 'rock' ? 0 : p.h) < h[3]) {
              applyHit(p.owner, o, p.d, 18, 3, 'mid', p.kd, p.x, GY - p.y - p.h / 2, true);
              p.dead = true;
            }
          }
        }
        for (const a of projs) for (const b of projs) if (a !== b && a.owner !== b.owner && !a.dead && !b.dead && Math.abs(a.x - b.x) < a.w + b.w) {
          if (a.dm && !b.dm) b.dead = true; else if (b.dm && !a.dm) a.dead = true; else { a.dead = b.dead = true; }
          sparks.push({ x: (a.x + b.x) / 2, y: GY - a.y - 8, t: 12, k: 'big' }); sfx.hitL();
        }
        projs = projs.filter(p => { if (p.dead && p.owner.proj === p) p.owner.proj = null; return !p.dead; });
      }
      function pushApart() {
        if (P.st === 'thrown' || E.st === 'thrown') return;
        const d = E.x - P.x, min = 22 * Math.max(wd(P), wd(E));
        if (Math.abs(d) < min && Math.abs(P.y - E.y) < 60) {
          const push = (min - Math.abs(d)) / 2, s = d >= 0 ? 1 : -1;
          P.x -= push * s; E.x += push * s;
        }
      }
      // ---------- match flow ----------
      function teamOf(i) { return { ...TEAMS[i], hp: TEAMS[i].m.map(() => MAXHP), idx: 0 }; }
      function bossTeam() { return { ...BOSS_TEAM, hp: [MAXHP * 2], idx: 0 }; }
      function startMatch() {
        stageIdx = enTeam.st; round = 1; startRound(true);
        mode = 'vs'; mt = 0;
      }
      function startRound(fresh) {
        const lv = demo ? 3 : Math.min(9, lpos * 1.5 + 1);
        const pid = myTeam.m[myTeam.idx], eid = enTeam.m[enTeam.idx];
        const keepP = P && !fresh && P.id === pid && P.hp > 0, keepE = E && !fresh && E.id === eid && E.hp > 0;
        const ppow = P ? P.pow : 0, epow = E ? E.pow : 0;
        P = mkF(pid, STW / 2 - 60, 1, demo, 3, myTeam.hp[myTeam.idx]);
        E = mkF(eid, STW / 2 + 60, -1, true, lv, enTeam.hp[enTeam.idx]);
        if (keepP) P.pow = ppow; if (keepE) E.pow = epow;
        cam = STW / 2 - W / 2; projs = []; sparks = []; msgs = []; timer = 60; tick = 0; rp = 'intro'; rt = 0; koWho = null;
      }
      function endRound() {
        myTeam.hp[myTeam.idx] = P.hp; enTeam.hp[enTeam.idx] = E.hp;
        const pDead = P.hp <= 0, eDead = E.hp <= 0;
        if (eDead) { enTeam.idx++; if (!demo) score += 5000 + timer * 100; }
        if (pDead) myTeam.idx++;
        // survivor recovers a little
        if (!pDead) myTeam.hp[myTeam.idx] = Math.min(MAXHP, myTeam.hp[myTeam.idx] + 10 + Math.floor(timer / 4));
        if (!eDead && enTeam.idx < enTeam.m.length) enTeam.hp[enTeam.idx] = Math.min(enTeam.m[0] === 'omega' ? MAXHP * 2 : MAXHP, enTeam.hp[enTeam.idx] + 10);
        if (score > hi) hi = score;
        round++;
        const pOut = myTeam.idx >= myTeam.m.length, eOut = enTeam.idx >= enTeam.m.length;
        if (demo) { mode = 'title'; mt = 0; demo = false; P = E = null; return; }
        if (eOut && !pOut) {
          mode = 'matchwin'; mt = 0; sfx.win();
          return;
        }
        if (pOut) {
          api.setHiScore(score);
          const over = () => { mode = 'gameover'; mt = 0; sfx.over(); };
          const cont = () => { myTeam.hp = myTeam.m.map(() => MAXHP); myTeam.idx = 0; enTeam.hp = enTeam.m.map(() => enTeam.m[0] === 'omega' ? MAXHP * 2 : MAXHP); enTeam.idx = 0; startMatch(); };
          mode = 'lose'; mt = 0;
          if (api.offerContinue) api.offerContinue(cont, over); else over();
          return;
        }
        startRound(false);
      }
      function nextOpponent() {
        lpos++;
        if (lpos >= ladder.length) { mode = 'ending'; mt = 0; api.setHiScore(score); return; }
        enTeam = ladder[lpos] === -1 ? bossTeam() : teamOf(ladder[lpos]);
        myTeam.idx = Math.min(myTeam.idx, myTeam.m.length - 1);
        // fresh members back in for the next match (KO'd ones too, as in the arcade)
        myTeam.hp = myTeam.m.map(() => MAXHP); myTeam.idx = 0;
        startMatch();
      }
      function newGame() {
        score = 0; mode = 'select'; mt = 0; selIdx = 0; demo = false;
      }
      function beginLadder() {
        myTeam = teamOf(selIdx);
        const others = TEAMS.map((t, i) => i).filter(i => i !== selIdx);
        for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
        ladder = others.concat([-1]); lpos = 0;
        enTeam = teamOf(ladder[0]);
        startMatch();
      }
      function startDemo() {
        demo = true;
        const a = Math.floor(Math.random() * TEAMS.length); let b = Math.floor(Math.random() * TEAMS.length); if (b === a) b = (a + 1) % TEAMS.length;
        myTeam = teamOf(a); enTeam = teamOf(b); stageIdx = enTeam.st; startRound(true); mode = 'fight';
      }
      function updFight() {
        if (rp === 'fight' && !demo) music(stageIdx);
        if (freeze > 0) { freeze--; return; }
        if (superFlash > 0) superFlash--;
        if (shake > 0) shake--;
        rt++;
        if (rp === 'intro') {
          if (rt === 70) msgs.push({ s: 'READY', t: 40, x: W / 2, y: 80, c: '#fff', fixed: 1, big: 1 });
          if (rt === 110) { msgs.push({ s: 'GO!', t: 40, x: W / 2, y: 80, c: '#ffe040', fixed: 1, big: 1 }); sfx.fight(); }
          if (rt >= 110) { rp = 'fight'; rt = 0; }
        }
        if (rp === 'fight') {
          if (P.cpu) aiThink(P, E); else readPlayer(P);
          aiThink(E, P);
          if (++tick >= 60) { tick = 0; timer--; if (timer <= 0) { timer = 0; rp = 'timeup'; rt = 0; msgs.push({ s: 'TIME UP', t: 90, x: W / 2, y: 80, c: '#fff', fixed: 1, big: 1 }); } }
        } else { P.dir = 5; E.dir = 5; P.req = E.req = null; P.charging = E.charging = false; }
        stepFighter(P, E); stepFighter(E, P);
        pushApart(); stepProjs();
        const mid = (P.x + E.x) / 2;
        cam += (clamp(mid - W / 2, 0, STW - W) - cam) * 0.2;
        if (rp === 'fight' && (P.hp <= 0 || E.hp <= 0) && (P.st === 'ko' || E.st === 'ko' || P.st === 'fall' || E.st === 'fall')) {
          rp = 'ko'; rt = 0; sfx.ko(); freeze = 30; koWho = P.hp <= 0 && E.hp <= 0 ? 'both' : P.hp <= 0 ? P : E;
          msgs.push({ s: 'K.O.', t: 100, x: W / 2, y: 76, c: '#ff3020', fixed: 1, big: 1 });
        }
        if (rp === 'ko') {
          if (rt === 90) { const w = P.hp > 0 ? P : E.hp > 0 ? E : null; if (w && actable(w)) { w.st = 'win'; } }
          if (rt > 170) endRound();
        }
        if (rp === 'timeup' && rt > 100) {
          const pp = P.hp / MAXHP, ep = E.hp / (enTeam.m[0] === 'omega' ? MAXHP * 2 : MAXHP);
          if (pp > ep) E.hp = 0; else if (ep > pp) P.hp = 0; else { P.hp = 0; E.hp = 0; }
          endRound();
        }
        for (const s of sparks) s.t--; sparks = sparks.filter(s => s.t > 0);
        for (const m of msgs) { m.t--; if (!m.fixed) m.y -= 0.3; } msgs = msgs.filter(m => m.t > 0);
      }
      function update() {
        T++;
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        const startPressed = api.anyPressed('Enter') || (mode === 'title' && api.anyPressed('Space'));
        if (mode === 'title' || (mode === 'fight' && demo)) {
          if (mode === 'title') { mt++; if (mt > 600) startDemo(); }
          else updFight();
          if (startPressed) {
            if (api.useCredit()) { lastCred = api.credits; newGame(); sfx.ok(); }
            else { coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        mt++;
        if (mode === 'select') {
          if (api.pressed('ArrowLeft')) { selIdx = (selIdx + TEAMS.length - 1) % TEAMS.length; sfx.sel(); }
          if (api.pressed('ArrowRight')) { selIdx = (selIdx + 1) % TEAMS.length; sfx.sel(); }
          if (api.pressed('ArrowUp') || api.pressed('ArrowDown')) { selIdx = (selIdx + 3) % TEAMS.length; sfx.sel(); }
          if ((mt > 20 && api.anyPressed('Space', 'Enter', 'KeyX')) || mt > 1200) { sfx.ok(); beginLadder(); }
          return;
        }
        if (mode === 'vs') { if (mt > 150 || (mt > 40 && api.anyPressed('Enter', 'Space'))) { mode = 'fight'; } return; }
        if (mode === 'fight') { updFight(); return; }
        if (mode === 'matchwin') { if (mt > 200 || (mt > 60 && api.anyPressed('Enter', 'Space'))) nextOpponent(); return; }
        if (mode === 'lose') return;
        if (mode === 'ending') { if (mt > 900 || (mt > 240 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; } return; }
        if (mode === 'gameover') { if (mt > 240 || (mt > 60 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; P = E = null; } }
      }
      // ---------- rendering ----------
      function curPose(f) {
        const s = f.st;
        if (s === 'walk') return (f.anim >> 3) & 1 ? PO.walk1 : PO.walk2;
        if (s === 'run') return (f.anim >> 2) & 1 ? PO.run1 : PO.run2;
        if (s === 'crouch' || s === 'land' || s === 'prejump' || s === 'getup') return PO.crouch;
        if (s === 'jump' || s === 'backstep') return f.atk ? (f.atk.t > f.atk.a.s ? PO[f.atk.a.po] : PO.jump) : PO.jump;
        if (s === 'attack') { const a = f.atk; return a.t > a.a.s && a.t <= a.a.s + a.a.a + 4 ? PO[a.a.po] : (a.n[0] === 'c' ? PO.crouch : PO.stand); }
        if (s === 'hit' || s === 'thrown' || s === 'fall') return PO.hit;
        if (s === 'block') return PO.block;
        if (s === 'cblock') return PO.cblock;
        if (s === 'charge') return PO.charge;
        if (s === 'dodge') return PO.dodge;
        if (s === 'throw') return f.t < 12 ? PO.grab : PO.throwp;
        if (s === 'win') return PO.win;
        if (s === 'special') {
          const sp = f.spec, d = sp.s;
          if (d.ty === 'proj') return sp.t < d.st - 4 ? PO.windup : PO.fire;
          if (d.ty === 'rush') return d.po === 'rushk' ? ((sp.t >> 2) & 1 ? PO.rushk : PO.lk) : ((sp.t >> 2) & 1 ? PO.rush : PO.lp);
          if (d.ty === 'dash' && sp.t <= d.st) return PO.windup;
          return PO[d.po] || PO.stand;
        }
        return PO.stand;
      }
      function drawHead(ctx, f, x, y, s, fc, flash) {
        const c = f.c, sk = flash ? '#fff' : c.sk, hr = flash ? '#fff' : c.hr;
        const hw = 6 * s, hh = 7 * s;
        R(ctx, sk, x - hw, y - hh, hw * 2, hh * 2);
        R(ctx, '#000', x + fc * 2.5 * s - 1, y - 2 * s, Math.max(1, s * 1.5), 2 * s);
        R(ctx, shade(c.sk, 0.75), x + fc * hw - (fc > 0 ? 2 * s : 0), y + 2 * s, 2 * s, 2 * s);
        const hs = c.hs;
        if (hs === 'spiky') { R(ctx, hr, x - hw - 1, y - hh - 3 * s, hw * 2 + 2, 5 * s); for (let i = 0; i < 4; i++) R(ctx, hr, x - hw - fc * 2 * s + i * 3.5 * s - (fc < 0 ? 4 * s : 0), y - hh - 6 * s + (i % 2) * 2 * s, 2.5 * s, 4 * s); R(ctx, hr, x - fc * hw - (fc > 0 ? 2 * s : 0), y - hh, 3 * s, hh * 1.4); }
        else if (hs === 'short') { R(ctx, hr, x - hw, y - hh - 2 * s, hw * 2, 4 * s); R(ctx, hr, x - fc * hw - (fc > 0 ? 1 : 0), y - hh, 2 * s, hh); }
        else if (hs === 'long') { R(ctx, hr, x - hw - 1, y - hh - 3 * s, hw * 2 + 2, 5 * s); R(ctx, hr, x - fc * (hw + 1) - (fc > 0 ? 0 : -1) - 2 * s * (fc > 0 ? 0 : 1), y - hh, 4 * s, hh * 2.6); }
        else if (hs === 'pony') { R(ctx, hr, x - hw, y - hh - 3 * s, hw * 2, 5 * s); R(ctx, hr, x - fc * (hw + 4 * s) - 2 * s, y - hh - 2 * s, 5 * s, 4 * s); R(ctx, hr, x - fc * (hw + 6 * s) - 2 * s, y - hh + 2 * s, 4 * s, 10 * s); }
        else if (hs === 'buns') { R(ctx, hr, x - hw, y - hh - 2 * s, hw * 2, 4 * s); R(ctx, hr, x - hw - 3 * s, y - hh - 4 * s, 5 * s, 5 * s); R(ctx, hr, x + hw - 2 * s, y - hh - 4 * s, 5 * s, 5 * s); }
        else if (hs === 'cap') { R(ctx, c.bl === '#f0f0f0' ? '#e02020' : c.bl, x - hw - 1, y - hh - 3 * s, hw * 2 + 2, 5 * s); R(ctx, c.bl === '#f0f0f0' ? '#e02020' : c.bl, x + fc * hw - (fc > 0 ? 0 : 5 * s), y - hh, 5 * s, 2 * s); R(ctx, hr, x - fc * hw - (fc > 0 ? 1 : 0), y - hh + 2 * s, 2 * s, 5 * s); }
        else if (hs === 'band') { R(ctx, hr, x - hw, y - hh - 3 * s, hw * 2, 5 * s); R(ctx, c.bl, x - hw, y - hh + 1 * s, hw * 2, 2 * s); R(ctx, c.bl, x - fc * (hw + 5 * s) - 1, y - hh + 1 * s, 6 * s, 1.5 * s); }
        else if (hs === 'mohawk') { R(ctx, hr, x - 2 * s, y - hh - 6 * s, 4 * s, 7 * s); }
        else if (hs === 'bald') { R(ctx, hr, x - fc * hw - (fc > 0 ? 1 : 0), y - 2 * s, 2 * s, 4 * s); R(ctx, hr, x - hw + 2 * s, y + 4 * s, hw * 2 - 4 * s, 3 * s); }
      }
      function drawFighter(ctx, f, ox) {
        const c = f.c, s = sc(f), w = wd(f);
        const x = f.x - ox, gy = GY - f.y, fc = f.face, fl = f.flash > 0 && (f.flash & 2);
        const col = k => fl ? '#ffffff' : c[k];
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(x - 18 * s), GY - 2, Math.round(36 * s), 4);
        if (f.st === 'dodge') ctx.globalAlpha = 0.55;
        if (f.st === 'down' || f.st === 'ko') {
          const by = GY - 6;
          R(ctx, col('pa'), x - fc * 32 * s, by - 6 * s, 24 * s, 8 * s);
          R(ctx, col('to'), x - fc * 8 * s - 12 * s, by - 8 * s, 24 * s, 10 * s);
          R(ctx, col('sk'), x + fc * 14 * s - 6 * s, by - 9 * s, 12 * s, 10 * s);
          R(ctx, col('hr'), x + fc * 20 * s - 3 * s, by - 9 * s, 5 * s, 10 * s);
          R(ctx, col('sh'), x - fc * 34 * s - 3 * s, by - 6 * s, 6 * s, 7 * s);
          ctx.globalAlpha = 1; return;
        }
        const P0 = curPose(f);
        const TH = 17 * s, SH = 17 * s, TO = 26 * s, UA = 13 * s, FA = 13 * s;
        const cs = a => Math.cos(a * D2R), sn = a => Math.sin(a * D2R);
        const lh = Math.max(cs(P0.bt) * TH + cs(P0.bs) * SH, cs(P0.ft) * TH + cs(P0.fs) * SH, 10 * s);
        const hx = x, hy = gy - lh;
        const ln = P0.ln;
        const nx = hx + sn(ln) * TO * fc, ny = hy - cs(ln) * TO;
        const leg = (t, sh) => { const kx = hx + sn(t) * TH * fc, ky = hy + cs(t) * TH; return [kx, ky, kx + sn(sh) * SH * fc, ky + cs(sh) * SH]; };
        const arm = (u, a, off) => { const sx = nx - fc * off, sy = ny + 4 * s; const ex = sx + sn(u) * UA * fc, ey = sy + cs(u) * UA; return [sx, sy, ex, ey, ex + sn(a) * FA * fc, ey + cs(a) * FA]; };
        const lw = 8 * s * Math.min(1.3, w), aw = 6 * s * Math.min(1.3, w);
        // back arm & leg
        const ba = arm(P0.bu, P0.bf, 5 * s);
        seg(ctx, ba[0], ba[1], ba[2], ba[3], aw, fl ? '#fff' : shade(c.to === c.sk ? c.sk : c.to, 0.7));
        seg(ctx, ba[2], ba[3], ba[4], ba[5], aw * 0.9, fl ? '#fff' : shade(c.sk, 0.75));
        R(ctx, fl ? '#fff' : shade(c.gl, 0.75), ba[4] - 3 * s, ba[5] - 3 * s, 6 * s, 6 * s);
        const bl = leg(P0.bt, P0.bs);
        seg(ctx, hx, hy, bl[0], bl[1], lw, fl ? '#fff' : shade(c.pa, 0.72));
        seg(ctx, bl[0], bl[1], bl[2], bl[3], lw * 0.85, fl ? '#fff' : shade(c.pa, 0.72));
        R(ctx, fl ? '#fff' : shade(c.sh, 0.72), bl[2] - 4 * s + fc * 2 * s, bl[3] - 3 * s, 8 * s, 4 * s);
        // torso
        const tw = 15 * s * w;
        seg(ctx, hx, hy - 2 * s, nx, ny + 2 * s, tw, col('to'));
        if (c.to === c.sk) { R(ctx, fl ? '#fff' : shade(c.sk, 0.85), (hx + nx) / 2 - 1, (hy + ny) / 2 - 4 * s, 2, 6 * s); }
        else { seg(ctx, (hx + nx) / 2 + fc * 3 * s, (hy + ny) / 2 - 6 * s, nx + fc * 2 * s, ny + 3 * s, 3 * s, fl ? '#fff' : shade(c.to, 0.8)); }
        seg(ctx, hx, hy, hx + sn(ln) * 5 * s * fc, hy - cs(ln) * 5 * s, tw * 0.95, col('pa'));
        R(ctx, col('bl'), hx + sn(ln) * 5 * s * fc - tw / 2, hy - cs(ln) * 5 * s - 2 * s, tw, 3 * s);
        // front leg
        const fl2 = leg(P0.ft, P0.fs);
        seg(ctx, hx, hy, fl2[0], fl2[1], lw, col('pa'));
        seg(ctx, fl2[0], fl2[1], fl2[2], fl2[3], lw * 0.85, col('pa'));
        R(ctx, col('sh'), fl2[2] - 4 * s + fc * 2 * s, fl2[3] - 3 * s, 8 * s, 4 * s);
        // head
        drawHead(ctx, f, nx + sn(ln) * 7 * s * fc, ny - cs(ln) * 7 * s - 3 * s, s, fc, fl);
        // front arm
        const fa = arm(P0.fu, P0.ff, -4 * s);
        seg(ctx, fa[0], fa[1], fa[2], fa[3], aw, c.to === c.sk ? col('sk') : col('to'));
        seg(ctx, fa[2], fa[3], fa[4], fa[5], aw * 0.9, col('sk'));
        R(ctx, col('gl'), fa[4] - 3.5 * s, fa[5] - 3.5 * s, 7 * s, 7 * s);
        ctx.globalAlpha = 1;
        // effects on special moves
        if (f.st === 'special' && f.spec.s.fire && f.y > 0) { for (let i = 0; i < 4; i++) R(ctx, i & 1 ? '#ffa020' : '#ff4010', fa[4] - 6 + Math.random() * 12, fa[5] - 6 + Math.random() * 18, 4, 4); }
        if (f.st === 'charge' || (f.maxT > 0 && (T & 4))) {
          ctx.strokeStyle = f.maxT > 0 ? 'rgba(255,80,40,0.7)' : 'rgba(120,200,255,0.7)'; ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) { const yy = gy - ((T * 3 + i * 30) % 90) * s; ctx.beginPath(); ctx.moveTo(x - 20 * s, yy); ctx.lineTo(x - 14 * s, yy - 8); ctx.moveTo(x + 20 * s, yy); ctx.lineTo(x + 14 * s, yy - 8); ctx.stroke(); }
        }
        if (f.st === 'special' && f.spec.s.ty === 'dash' && f.spec.s.dm) for (let i = 1; i < 4; i++) { ctx.globalAlpha = 0.2; R(ctx, c.to, x - fc * i * 10 - 8 * s, hy - 30 * s, 16 * s, 40 * s); ctx.globalAlpha = 1; }
      }
      function drawProj(ctx, p, ox) {
        const x = p.x - ox, y = GY - p.y, c = p.cols, fl = (p.t >> 1) & 1, f = Math.sign(p.vx);
        if (p.sh === 'ball') {
          const r = p.w;
          ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(x, y, r + (fl ? 2 : 0), 0, 7); ctx.fill();
          ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(x + f * 2, y, r * 0.65, 0, 7); ctx.fill();
          ctx.fillStyle = c[2]; ctx.beginPath(); ctx.arc(x + f * 3, y, r * 0.3, 0, 7); ctx.fill();
          for (let i = 1; i < 4; i++) R(ctx, c[0], x - f * (r + i * 5), y - 2 + ((p.t + i) % 3) - 1, 4, 3);
        } else if (p.sh === 'kunai') { R(ctx, c[0], x - 8, y - 1, 16, 3); R(ctx, '#fff', x + f * 6 - 2, y - 2, 4, 5); R(ctx, '#802020', x - f * 9 - 2, y - 1, 4, 3); }
        else if (p.sh === 'fan') { ctx.fillStyle = c[0]; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.arc(x, y + 6, 12, -Math.PI * 0.85 + p.t * 0.3, -Math.PI * 0.15 + p.t * 0.3); ctx.fill(); R(ctx, c[1], x - 1, y + 4, 3, 3); }
        else if (p.sh === 'flame') {
          for (let i = 0; i < 6; i++) {
            const hh = p.h * (0.5 + 0.5 * Math.abs(Math.sin(p.t * 0.4 + i)));
            R(ctx, c[i % 3], x - p.w + i * (p.w * 2 / 6), y - hh, p.w * 2 / 6 + 1, hh);
          }
        } else if (p.sh === 'rock') {
          for (let i = 0; i < 4; i++) { const hh = 6 + ((p.t + i * 3) % 12); R(ctx, i & 1 ? c[0] : c[1], x - p.w + i * 7, y - hh, 6, hh); }
          R(ctx, c[2], x - 2, y - 14 - (p.t % 6), 3, 3);
        }
      }
      function drawStage(ctx) {
        const st = STAGES[stageIdx];
        let g = ctx.createLinearGradient(0, 0, 0, GY);
        g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY);
        const p1 = cam * 0.3, p2 = cam * 0.6;
        ctx.fillStyle = st.far;
        if (st.deco === 'temple') {
          ctx.beginPath(); ctx.arc(250 - p1 * 0.2, 60, 26, 0, 7); ctx.fillStyle = '#fff0a0'; ctx.fill();
          ctx.fillStyle = st.far;
          for (let i = 0; i < 4; i++) { const x = 40 + i * 140 - p1; R(ctx, st.far, x, 90, 70, 70); ctx.beginPath(); ctx.moveTo(x - 14, 92); ctx.lineTo(x + 35, 66); ctx.lineTo(x + 84, 92); ctx.fill(); R(ctx, '#a02010', x + 8, 120, 6, 40); R(ctx, '#a02010', x + 56, 120, 6, 40); }
        } else if (st.deco === 'city') {
          for (let i = 0; i < 16; i++) { const x = i * 40 - p1, h = 60 + hash(i) * 80; R(ctx, st.far, x, 150 - h, 36, h); for (let y = 160 - h; y < 140; y += 8) for (let k = 0; k < 3; k++) if (hash(i * 9 + y + k) < 0.4) R(ctx, '#f0e080', x + 4 + k * 10, y, 4, 4); }
        } else if (st.deco === 'lanterns') {
          for (let i = 0; i < 10; i++) { const x = i * 70 - p1; R(ctx, st.far, x, 70, 60, 90); ctx.beginPath(); ctx.moveTo(x - 10, 72); ctx.lineTo(x + 30, 52); ctx.lineTo(x + 70, 72); ctx.fill(); }
          for (let i = 0; i < 14; i++) { const x = i * 48 - p2 * 0.8, y = 40 + Math.sin(i + T * 0.03) * 2; R(ctx, '#300', x + 4, 30, 1, y - 30); R(ctx, (T >> 4) & 1 && i % 3 === 0 ? '#ff6040' : '#e02020', x, y, 10, 12); R(ctx, '#f0d040', x + 2, y + 12, 6, 2); }
        } else if (st.deco === 'park') {
          for (let i = 0; i < 10; i++) { const x = i * 64 - p1; ctx.beginPath(); ctx.arc(x, 120, 34, 0, 7); ctx.fill(); R(ctx, '#3a2a10', x - 3, 130, 6, 30); }
        } else if (st.deco === 'base') {
          for (let i = 0; i < 6; i++) { const x = i * 110 - p1; R(ctx, st.far, x, 100, 90, 60); R(ctx, '#202818', x + 10, 110, 70, 10); }
          R(ctx, '#202818', 0, 144, W, 2);
          for (let i = 0; i < 30; i++) R(ctx, '#202818', i * 24 - (p2 % 24), 136, 1, 10);
        } else if (st.deco === 'pub') {
          for (let i = 0; i < 8; i++) { const x = i * 90 - p1; R(ctx, '#3a2a20', x, 70, 84, 90); R(ctx, '#f0c060', x + 10, 90, 24, 20); R(ctx, '#f0c060', x + 50, 90, 24, 20); R(ctx, '#202020', x + 21, 90, 2, 20); R(ctx, '#202020', x + 61, 90, 2, 20); }
        } else if (st.deco === 'ship') {
          for (let i = 0; i < 60; i++) R(ctx, '#fff', (hash(i) * 600 - p1 * 0.5) % W, hash(i + 3) * 120, 1, 1);
          for (let i = 0; i < 6; i++) { const x = i * 110 - p1; R(ctx, st.far, x, 90, 100, 70); R(ctx, '#ff2020', x + 46, 100, 8, 4); }
          R(ctx, '#401060', 0, 150, W, 4);
        }
        // crowd
        for (let i = 0; i < 40; i++) {
          const x = Math.round(i * 16 - p2 * 1.0 + 10) % (STW * 0.6 + 40), hgt = 18 + hash(i * 3) * 8, bob = ((T >> 4) + i) % 3 === 0 && rp !== 'intro' ? 2 : 0;
          R(ctx, st.crowd, x, 160 - hgt - bob, 12, hgt + 10); R(ctx, shade(st.crowd === '#000000' ? '#101010' : st.crowd, 1.4), x + 3, 154 - hgt - bob, 7, 7);
        }
        g = ctx.createLinearGradient(0, 160, 0, H);
        g.addColorStop(0, st.floor[0]); g.addColorStop(1, st.floor[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 160, W, H - 160);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = -2; i < 14; i++) { const x0 = i * 48 - (cam % 48); ctx.beginPath(); ctx.moveTo(x0, 160); ctx.lineTo(x0 + 2, 160); ctx.lineTo((x0 - W / 2) * 1.8 + W / 2 + 4, H); ctx.lineTo((x0 - W / 2) * 1.8 + W / 2, H); ctx.fill(); }
      }
      function portrait(ctx, id, x, y, sz, flip, dead) {
        const c = CH[id];
        R(ctx, '#101028', x, y, sz, sz);
        const f = { c, flash: 0 };
        drawHead(ctx, f, x + sz / 2, y + sz / 2 + sz * 0.12, sz / 18, flip ? -1 : 1, false);
        R(ctx, c.to === c.sk ? c.sk : c.to, x + sz * 0.2, y + sz * 0.85, sz * 0.6, sz * 0.15);
        if (dead) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, sz, sz); R(ctx, '#e02020', x + 2, y + sz / 2 - 1, sz - 4, 2); }
        ctx.strokeStyle = '#f0d040'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, sz - 1, sz - 1);
      }
      function drawHud(ctx) {
        const bar = (f, x, flip, max) => {
          const w = 120, pct = f.hp / max, dp = f.dhp / max;
          R(ctx, '#000', x - 1, 19, w + 2, 10);
          R(ctx, '#802010', x, 20, w, 8);
          const dw = Math.round(w * dp), hw = Math.round(w * pct);
          R(ctx, '#ffffff', flip ? x + w - dw : x, 20, dw, 8);
          const low = pct <= 0.25;
          R(ctx, low ? ((T >> 3) & 1 ? '#ff2020' : '#ff8040') : '#ffd020', flip ? x + w - hw : x, 20, hw, 8);
          R(ctx, 'rgba(255,255,255,0.35)', flip ? x + w - hw : x, 20, hw, 2);
        };
        const pmax = MAXHP, emax = enTeam && enTeam.m[0] === 'omega' ? MAXHP * 2 : MAXHP;
        bar(P, 14, true, pmax); bar(E, W - 134, false, emax);
        text(ctx, P.c.name, 14, 31, '#fff'); text(ctx, E.c.name, W - 14, 31, '#fff', 1, 'right');
        // team icons
        myTeam.m.forEach((id, i) => portrait(ctx, id, 14 + i * 14, 3, 13, false, i < myTeam.idx || (i === myTeam.idx && P.hp <= 0)));
        enTeam.m.forEach((id, i) => portrait(ctx, id, W - 27 - i * 14, 3, 13, true, i < enTeam.idx || (i === enTeam.idx && E.hp <= 0)));
        // timer
        R(ctx, '#000', W / 2 - 15, 14, 30, 20); R(ctx, '#2040a0', W / 2 - 14, 15, 28, 18);
        text(ctx, String(timer).padStart(2, '0'), W / 2, 18, timer <= 10 ? '#ff4040' : '#fff', 2, 'center');
        // power gauges
        const pow = (f, x, flip) => {
          R(ctx, '#000', x - 1, H - 13, 82, 9); R(ctx, '#202040', x, H - 12, 80, 7);
          if (f.maxT > 0) { const w = 80 * f.maxT / 600; R(ctx, (T >> 2) & 1 ? '#ff4020' : '#ffe040', flip ? x + 80 - w : x, H - 12, w, 7); text(ctx, 'MAXIMUM', x + 40, H - 22, (T >> 3) & 1 ? '#ff4020' : '#ffe040', 1, 'center'); }
          else { const w = 80 * f.pow / 100; R(ctx, '#40a0ff', flip ? x + 80 - w : x, H - 12, w, 7); }
          text(ctx, 'POW', flip ? x + 84 : x - 20, H - 12, '#fff');
          if (canDM(f) && (T >> 4) & 1) text(ctx, 'DM OK', flip ? x : x + 80, H - 30, '#ff8080', 1, flip ? undefined : 'right');
        };
        pow(P, 34, false); pow(E, W - 114, true);
        if (!demo) { text(ctx, String(score).padStart(8, '0'), 14, 42, '#a0c0ff'); }
        else text(ctx, 'DEMO PLAY', W / 2, 42, '#a0c0ff', 1, 'center');
      }
      function drawSparks(ctx) {
        for (const s of sparks) {
          const x = s.x - cam, y = s.y, k = s.t;
          if (s.k === 'block') { R(ctx, '#80c0ff', x - 6, y - 1, 12, 2); R(ctx, '#80c0ff', x - 1, y - 6, 2, 12); R(ctx, '#fff', x - 2, y - 2, 4, 4); }
          else {
            const r = (s.k === 'big' ? 14 : 9) * (1 - k / 14) + 3;
            ctx.fillStyle = k & 2 ? '#ffffff' : '#ffe040';
            for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + k; ctx.fillRect(Math.round(x + Math.cos(a) * r - 1.5), Math.round(y + Math.sin(a) * r - 1.5), 3, 3); }
            R(ctx, '#fff', x - 3, y - 3, 6, 6);
          }
        }
      }
      function renderFight(ctx) {
        ctx.save();
        if (shake) ctx.translate(((shake >> 1) & 1) ? 2 : -2, 0);
        drawStage(ctx);
        if (superFlash > 0) { ctx.fillStyle = 'rgba(0,0,0,' + (0.5 * superFlash / 30) + ')'; ctx.fillRect(0, 0, W, H); }
        const order = (P.st === 'attack' || P.st === 'special') ? [E, P] : [P, E];
        for (const f of order) drawFighter(ctx, f, cam);
        for (const p of projs) drawProj(ctx, p, cam);
        drawSparks(ctx);
        ctx.restore();
        drawHud(ctx);
        for (const m of msgs) {
          if (m.fixed) textS(ctx, m.s, m.x, m.y, m.c, m.big ? 4 : 1, 'center');
          else textS(ctx, m.s, m.x - cam, m.y, m.c, 1, 'center');
        }
        if (rp === 'intro' && rt < 70) {
          const n = myTeam.idx + enTeam.idx + 1;
          textS(ctx, 'ROUND ' + n, W / 2, 80, '#fff', 3, 'center');
        }
        if (rp === 'ko' && rt > 90) {
          const w = P.hp > 0 ? P : E.hp > 0 ? E : null;
          if (w) textS(ctx, w.c.name + ' WINS', W / 2, 112, '#fff', 2, 'center'); else textS(ctx, 'DOUBLE K.O.', W / 2, 112, '#fff', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000010'); g.addColorStop(1, '#203070');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 60; i++) R(ctx, '#fff', hash(i) * W, hash(i + 9) * 120, 1, 1);
        // emblem
        const cxp = W / 2, cyp = 70;
        ctx.fillStyle = '#c01818'; ctx.beginPath(); ctx.arc(cxp, cyp, 40, 0, 7); ctx.fill();
        ctx.strokeStyle = '#f0d040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cxp, cyp, 40, 0, 7); ctx.stroke();
        textS(ctx, 'THE KING', cxp, 46, '#f0d040', 3, 'center');
        textS(ctx, 'OF', cxp, 70, '#ffffff', 2, 'center');
        textS(ctx, 'FIGHTERS', cxp, 88, '#f0d040', 3, 'center');
        textS(ctx, "'94", cxp + 96, 92, '#ff4040', 2, 'center');
        const ids = ['kaze', 'rocky', 'lin', 'han', 'marco', 'rose'];
        for (let i = 0; i < 6; i++) portrait(ctx, ids[i], 40 + i * 42, 128, 34, i >= 3, false);
        text(ctx, '3 ON 3 TEAM BATTLE', W / 2, 168, '#a0c0ff', 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 184, '#fff', 1, 'center'); }
        else if ((T >> 4) & 1) textS(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 184, api.credits > 0 ? '#ffe040' : '#fff', 1, 'center');
        text(ctx, '\u00a9 1994 SNK', W / 2, 200, '#c0c0c0', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, H - 10, '#aaa', 1, 'right');
        text(ctx, 'HI ' + hi, 4, H - 10, '#aaa');
      }
      function renderSelect(ctx) {
        R(ctx, '#081030', 0, 0, W, H);
        for (let y = 0; y < H; y += 4) R(ctx, '#0c1440', 0, y, W, 2);
        textS(ctx, 'TEAM SELECT', W / 2, 10, '#f0d040', 2, 'center');
        TEAMS.forEach((t, i) => {
          const x = 14 + (i % 3) * 100, y = 34 + Math.floor(i / 3) * 62, sel = i === selIdx;
          R(ctx, sel ? ((T >> 3) & 1 ? '#f0d040' : '#e02020') : '#203060', x - 2, y - 2, 96, 58);
          R(ctx, '#101830', x, y, 92, 54);
          t.m.forEach((id, k) => portrait(ctx, id, x + 4 + k * 29, y + 4, 27, false, false));
          text(ctx, t.name, x + 46, y + 36, sel ? '#ffe040' : '#fff', 1, 'center');
          text(ctx, t.land, x + 46, y + 45, '#a0c0ff', 1, 'center');
        });
        const t = TEAMS[selIdx];
        R(ctx, '#000', 0, 162, W, 62);
        t.m.forEach((id, k) => { const f = mkF(id, 70 + k * 90, 1, false, 0); f.anim = T; drawFighter(ctx, f, 0); });
        text(ctx, t.m.map(id => CH[id].name).join(' - '), W / 2, 206, '#fff', 1, 'center');
        text(ctx, 'ARROWS: CHOOSE   SPACE: DECIDE', W / 2, 216, '#808080', 1, 'center');
      }
      function renderVs(ctx) {
        R(ctx, '#000', 0, 0, W, H);
        const sl = Math.min(1, mt / 30);
        R(ctx, '#102060', 0, 30, W / 2 * sl, 140); R(ctx, '#601010', W - W / 2 * sl, 30, W / 2 * sl, 140);
        myTeam.m.forEach((id, k) => portrait(ctx, id, 14 + k * 46, 60, 42, false, false));
        enTeam.m.forEach((id, k) => portrait(ctx, id, W - 56 - k * 46, 60, 42, true, false));
        text(ctx, myTeam.name, 80, 112, '#fff', 1, 'center'); text(ctx, enTeam.name, W - 80, 112, '#fff', 1, 'center');
        textS(ctx, 'VS', W / 2, 74, (T >> 2) & 1 ? '#f0d040' : '#ff4040', 4, 'center');
        text(ctx, 'STAGE ' + (lpos + 1) + ' - ' + enTeam.land, W / 2, 186, '#a0c0ff', 1, 'center');
        if (enTeam.m[0] === 'omega') textS(ctx, 'FINAL BATTLE', W / 2, 150, '#ff4040', 2, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        if (mode === 'select') { renderSelect(ctx); return; }
        if (mode === 'vs') { renderVs(ctx); return; }
        if (mode === 'fight' || mode === 'lose') {
          renderFight(ctx);
          if (demo) {
            if ((T >> 4) & 1) textS(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 130, '#ffe040', 1, 'center');
            textS(ctx, 'THE KING OF FIGHTERS', W / 2, 56, '#f0d040', 1, 'center');
          }
          return;
        }
        if (mode === 'matchwin') {
          renderFight(ctx);
          R(ctx, 'rgba(0,0,0,0.6)', 0, 70, W, 70);
          textS(ctx, 'YOUR TEAM WINS!', W / 2, 82, '#ffe040', 2, 'center');
          text(ctx, 'NEXT: ' + (lpos + 1 < ladder.length ? (ladder[lpos + 1] === -1 ? '???' : TEAMS[ladder[lpos + 1]].name) : 'THE END'), W / 2, 112, '#fff', 1, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 124, '#a0c0ff', 1, 'center');
          return;
        }
        if (mode === 'ending') {
          R(ctx, '#000010', 0, 0, W, H);
          textS(ctx, 'CONGRATULATIONS!', W / 2, 30, '#f0d040', 2, 'center');
          text(ctx, 'THE ' + myTeam.name + ' IS', W / 2, 64, '#fff', 1, 'center');
          textS(ctx, 'THE KING OF FIGHTERS', W / 2, 78, '#ffe040', 1, 'center');
          myTeam.m.forEach((id, k) => { const f = mkF(id, 90 + k * 70, 1, false, 0); f.st = 'win'; drawFighter(ctx, f, 0); });
          text(ctx, 'FINAL SCORE ' + score, W / 2, 210, '#a0c0ff', 1, 'center');
          return;
        }
        if (mode === 'gameover') {
          if (P && E) renderFight(ctx);
          R(ctx, 'rgba(0,0,0,0.6)', 0, 0, W, H);
          textS(ctx, 'GAME OVER', W / 2, 96, '#ff4040', 3, 'center');
        }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
