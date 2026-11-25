// Samurai Shodown (SNK, 1993) - from-scratch recreation for the MAME32 Game Room.
// Weapon duels with original-style warriors: huge heavy slashes, the rage gauge, blade clashes that can
// knock a sword away, a zooming camera, the referee and the courier who throws bombs and food into the fight.
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
    const h = w / 2, ww = Math.max(1, Math.round(w));
    for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(x0 + dx * t - h), Math.round(y0 + dy * t - h), ww, ww); }
  }
  const W = 320, H = 224, GY = 200, STW = 620, MAXHP = 128;

  // ---------- roster: original-style warriors ----------
  // wp: weapon kind, rch: blade reach. colours: sk skin, hr hair, hs style, to top, pa hakama/pants, gl hands, sh feet, bl sash
  const CH = [
    { id: 'hayate', name: 'HAYATE', land: 'JAPAN', arch: 'katana', wp: 'katana', rch: 34, sk: '#f0c090', hr: '#201010', hs: 'topknot', to: '#3050a0', pa: '#505060', gl: '#f0c090', sh: '#c0a080', bl: '#f0f0f0', spd: 1.5, stage: 0, quote: 'A BLADE IS ONLY AS SHARP AS ITS MASTER.' },
    { id: 'kagero', name: 'KAGERO', land: 'IGA', arch: 'ninja', wp: 'ninjato', rch: 24, sk: '#f0c090', hr: '#181828', hs: 'hood', to: '#202840', pa: '#202840', gl: '#202840', sh: '#101018', bl: '#c02020', spd: 1.9, sc: 0.95, wd: 0.9, stage: 1, quote: 'YOU NEVER SAW THE SHADOW MOVE.' },
    { id: 'tamaki', name: 'TAMAKI', land: 'EZO', arch: 'kodachi', wp: 'kodachi', rch: 22, sk: '#f8d0b0', hr: '#101010', hs: 'long', to: '#c03050', pa: '#e8e0f0', gl: '#f8d0b0', sh: '#e8e0f0', bl: '#40a0e0', spd: 1.8, sc: 0.92, wd: 0.85, stage: 2, quote: 'NATURE ITSELF FIGHTS AT MY SIDE.' },
    { id: 'goro', name: 'GORO', land: 'JAPAN', arch: 'club', wp: 'kanabo', rch: 40, sk: '#d89060', hr: '#302010', hs: 'wild', to: '#d89060', pa: '#e0a020', gl: '#d89060', sh: '#d89060', bl: '#202020', spd: 1.2, sc: 1.14, wd: 1.4, stage: 3, quote: 'HAH! I SWAT FLIES BIGGER THAN YOU.' },
    { id: 'raoul', name: 'RAOUL', land: 'FRANCE', arch: 'rapier', wp: 'rapier', rch: 44, sk: '#f8d8b8', hr: '#e0c040', hs: 'long', to: '#f0f0f0', pa: '#304080', gl: '#f0f0f0', sh: '#202020', bl: '#c02020', spd: 1.7, stage: 4, quote: 'EN GARDE! YOUR FORM IS AN INSULT.' },
    { id: 'wang', name: 'WANG', land: 'CHINA', arch: 'big', wp: 'dao', rch: 32, sk: '#e8b888', hr: '#e0e0e0', hs: 'bald', to: '#307040', pa: '#307040', gl: '#e8b888', sh: '#202020', bl: '#e0c040', spd: 1.3, sc: 1.08, wd: 1.3, stage: 5, quote: 'HO HO! THE OLD WAYS STILL CUT DEEP.' },
    { id: 'razen', name: 'RAZEN', land: 'AMAZON', arch: 'claw', wp: 'claw', rch: 16, sk: '#c08858', hr: '#c03020', hs: 'wild', to: '#c08858', pa: '#806040', gl: '#c0c0d0', sh: '#c08858', bl: '#40a040', spd: 2.0, sc: 0.95, wd: 0.95, stage: 6, quote: 'GRRAH! MEAT! MORE MEAT!' },
    { id: 'souji', name: 'SOUJI', land: 'JAPAN', arch: 'nodachi', wp: 'nodachi', rch: 50, sk: '#f0d0b0', hr: '#303040', hs: 'pony', to: '#e8e8f0', pa: '#6040a0', gl: '#f0d0b0', sh: '#e8e8f0', bl: '#c02020', spd: 1.5, stage: 7, quote: 'ONE STROKE. THAT IS ALL IT TAKES.' }
  ];
  const BOSS = { id: 'tenkai', name: 'TENKAI', land: 'SHIMABARA', arch: 'boss', wp: 'orb', rch: 30, sk: '#e8d0c0', hr: '#f0f0f0', hs: 'long', to: '#702080', pa: '#401050', gl: '#e8d0c0', sh: '#401050', bl: '#e0c040', spd: 1.5, sc: 1.08, wd: 1.1, stage: 8, boss: 1, quote: 'THE DARK LORD HAS NEED OF YOUR SOUL.' };
  const STAGES = [
    { sky: ['#f08040', '#f8d0a0'], far: '#a03020', floor: ['#a08060', '#806040'], deco: 'shrine' },
    { sky: ['#203020', '#507040'], far: '#183018', floor: ['#605030', '#403020'], deco: 'bamboo' },
    { sky: ['#8090b0', '#d0d8e8'], far: '#b0b8c8', floor: ['#e8f0f8', '#c0c8d8'], deco: 'snow' },
    { sky: ['#e0a0c0', '#f8e0e8'], far: '#806070', floor: ['#a08070', '#806050'], deco: 'sakura' },
    { sky: ['#081028', '#283860'], far: '#101828', floor: ['#605040', '#403020'], deco: 'harbor' },
    { sky: ['#c06030', '#f0b060'], far: '#402020', floor: ['#806850', '#604830'], deco: 'castle' },
    { sky: ['#205040', '#60a080'], far: '#204030', floor: ['#506050', '#304030'], deco: 'falls' },
    { sky: ['#402040', '#c06050'], far: '#301828', floor: ['#706050', '#504030'], deco: 'village' },
    { sky: ['#100000', '#600010'], far: '#200008', floor: ['#401010', '#200808'], deco: 'hell' }
  ];
  const ARCH = {
    katana: { sqcf: 'wind', sdp: 'riseslash', sqcb: 'dashslash' },
    ninja: { sqcf: 'shuriken', kqcb: 'flamedash', kdp: 'risekick' },
    kodachi: { sqcf: 'crosswave', kqcb: 'spin', sdp: 'riseslash' },
    club: { sqcf: 'quake', kqcb: 'tackle', sdp: 'bigswing' },
    rapier: { sqcf: 'thrusts', sqcb: 'lunge', sdp: 'riseslash' },
    big: { sqcf: 'quake', sqcb: 'dashslash', kdp: 'risekick' },
    claw: { kqcb: 'clawdive', kqcf: 'spin', sdp: 'riseslash' },
    nodachi: { sqcf: 'bigwave', sqcb: 'dashslash', sdp: 'riseslash' },
    boss: { sqcf: 'orb', sqcb: 'dashslash', sdp: 'riseslash', kqcb: 'spin' }
  };
  // sl: slash (blade reach is added to x[1]); arc: slash-trail angles
  const ATK = {
    ls: { s: 5, a: 4, r: 11, x: [10, 30], y: [50, 82], d: 7, l: 'mid', hs: 14, pu: 3, po: 'ls', sl: 1, arc: [150, 70] },
    hs: { s: 15, a: 5, r: 26, x: [6, 34], y: [24, 96], d: 22, l: 'mid', hs: 26, pu: 6, po: 'hs', sl: 1, arc: [175, 40], heavy: 1 },
    lk: { s: 4, a: 3, r: 9, x: [10, 52], y: [30, 56], d: 4, l: 'mid', hs: 12, pu: 2.5, po: 'lk' },
    hk: { s: 8, a: 4, r: 18, x: [10, 60], y: [50, 86], d: 8, l: 'mid', hs: 18, pu: 4, po: 'hk' },
    cls: { s: 5, a: 4, r: 12, x: [10, 30], y: [0, 34], d: 7, l: 'low', hs: 14, pu: 2.5, po: 'cls', sl: 1, arc: [120, 80] },
    chs: { s: 12, a: 5, r: 24, x: [6, 32], y: [0, 50], d: 18, l: 'low', hs: 24, pu: 4, po: 'chs', sl: 1, arc: [150, 60], heavy: 1 },
    clk: { s: 4, a: 3, r: 8, x: [10, 50], y: [0, 16], d: 3, l: 'low', hs: 12, pu: 2, po: 'clk' },
    chk: { s: 7, a: 5, r: 20, x: [10, 64], y: [0, 14], d: 7, l: 'low', hs: 18, pu: 2, kd: 1, po: 'chk' },
    jls: { s: 3, a: 9, r: 0, x: [4, 26], y: [10, 60], d: 9, l: 'high', hs: 14, pu: 2, po: 'jls', sl: 1, arc: [150, 80] },
    jhs: { s: 6, a: 8, r: 0, x: [4, 30], y: [0, 60], d: 17, l: 'high', hs: 20, pu: 3, po: 'jhs', sl: 1, arc: [170, 60], heavy: 1 },
    jlk: { s: 3, a: 12, r: 0, x: [4, 48], y: [6, 36], d: 5, l: 'high', hs: 13, pu: 2, po: 'jlk' },
    jhk: { s: 5, a: 8, r: 0, x: [6, 54], y: [2, 36], d: 9, l: 'high', hs: 18, pu: 3, po: 'jhk' }
  };
  const SP = {
    wind: { ty: 'proj', st: 14, rec: 30, v: 3.2, d: 13, w: 10, h: 16, y: 50, cols: ['#a0e0ff', '#ffffff', '#ffffff'], sh: 'crescent', blade: 1 },
    crosswave: { ty: 'proj', st: 12, rec: 28, v: 3.6, d: 11, w: 10, h: 12, y: 54, cols: ['#ff80c0', '#ffffff', '#ffffff'], sh: 'cross', blade: 1 },
    bigwave: { ty: 'proj', st: 18, rec: 34, v: 2.8, d: 17, w: 14, h: 26, y: 46, cols: ['#c0a0ff', '#ffffff', '#ffffff'], sh: 'crescent', blade: 1 },
    shuriken: { ty: 'proj', st: 8, rec: 24, v: 4.8, d: 8, w: 6, h: 6, y: 62, cols: ['#c0c0d0', '#ffffff', '#ffffff'], sh: 'star' },
    quake: { ty: 'proj', st: 16, rec: 30, v: 3, d: 13, w: 14, h: 18, y: 0, cols: ['#806040', '#c0a060', '#ffffff'], sh: 'rock', blade: 1 },
    orb: { ty: 'proj', st: 12, rec: 26, v: 3.4, d: 15, w: 12, h: 12, y: 58, cols: ['#a020ff', '#ff60ff', '#ffffff'], sh: 'ball' },
    riseslash: { ty: 'rise', d: 17, vy: -7.4, vx: 1.4, inv: 8, po: 'rises', blade: 1 },
    bigswing: { ty: 'rise', d: 20, vy: -5.6, vx: 1.0, inv: 6, po: 'rises', blade: 1 },
    risekick: { ty: 'rise', d: 13, vy: -7.2, vx: 1.6, inv: 6, po: 'risek' },
    spin: { ty: 'spin', d: 8, dur: 40, vx: 2.6, lift: 16, hits: 2, po: 'spin' },
    clawdive: { ty: 'fly', d: 14, vx: 4.8, vy: -3.6, po: 'flyk' },
    dashslash: { ty: 'dash', d: 17, dur: 20, st: 8, vx: 6, po: 'dashs', y: [30, 84], blade: 1 },
    lunge: { ty: 'dash', d: 15, dur: 18, st: 6, vx: 6.4, po: 'thrust', y: [50, 80], blade: 1 },
    tackle: { ty: 'dash', d: 15, dur: 26, st: 8, vx: 5, po: 'dash', y: [20, 70] },
    flamedash: { ty: 'dash', d: 14, dur: 22, st: 6, vx: 6, po: 'dash', y: [20, 80], fire: 1 },
    thrusts: { ty: 'rush', d: 4, dur: 42, ev: 6, po: 'thrust', x: [10, 70], y: [50, 82], blade: 1 }
  };
  // ---------- poses (absolute degrees; 0 = down, 90 = forward, 180 = up) ----------
  const G = { bu: 40, bf: 100, fu: 50, ff: 115 };
  const LS = { ln: 6, bt: -16, bs: -8, ft: 20, fs: 8 };
  const CRL = { ln: 22, bt: 70, bs: -30, ft: 80, fs: -20 };
  const JPL = { ln: 10, bt: 40, bs: -60, ft: 100, fs: -20 };
  const LUNGE = { bt: -40, bs: -20, ft: 50, fs: 10 };
  const PO = {
    stand: Object.assign({}, LS, G),
    walk1: Object.assign({}, G, { ln: 8, bt: -24, bs: -10, ft: 24, fs: 0 }),
    walk2: Object.assign({}, G, { ln: 8, bt: 0, bs: -18, ft: 4, fs: -4 }),
    run1: { ln: 28, bt: -40, bs: -60, ft: 50, fs: 10, bu: -30, bf: 10, fu: 20, ff: -20 },
    run2: { ln: 28, bt: 30, bs: -10, ft: -20, fs: -70, bu: -30, bf: 10, fu: 20, ff: -20 },
    crouch: Object.assign({}, CRL, G),
    jump: Object.assign({}, JPL, { bu: 60, bf: 120, fu: 80, ff: 120 }),
    ls: Object.assign({ ln: 14 }, LUNGE, { bu: 60, bf: 90, fu: 92, ff: 90 }),
    hsw: { ln: -10, bt: -14, bs: -8, ft: 20, fs: 8, bu: 165, bf: 175, fu: 170, ff: 178 },
    hs: Object.assign({ ln: 28 }, LUNGE, { bu: 70, bf: 60, fu: 72, ff: 62 }),
    lk: { ln: -8, bt: -6, bs: -4, ft: 85, fs: 85, bu: 40, bf: 100, fu: 40, ff: 100 },
    hk: { ln: -24, bt: -4, bs: -4, ft: 122, fs: 122, bu: 20, bf: 80, fu: 10, ff: 60 },
    cls: Object.assign({}, CRL, { bu: 70, bf: 90, fu: 92, ff: 98 }),
    chs: Object.assign({}, CRL, { ln: 34, bu: 70, bf: 70, fu: 80, ff: 76 }),
    clk: { ln: 14, bt: 70, bs: -30, ft: 92, fs: 92, bu: 40, bf: 100, fu: 50, ff: 115 },
    chk: { ln: 34, bt: 84, bs: -44, ft: 96, fs: 95, bu: 10, bf: 30, fu: 20, ff: 40 },
    jls: Object.assign({}, JPL, { bu: 80, bf: 100, fu: 105, ff: 100 }),
    jhs: Object.assign({}, JPL, { ln: 24, bu: 60, bf: 50, fu: 70, ff: 40 }),
    jlk: Object.assign({}, JPL, { ft: 96, fs: 96, bu: 60, bf: 120, fu: 80, ff: 120 }),
    jhk: { ln: -10, bt: 40, bs: -60, ft: 112, fs: 104, bu: 60, bf: 100, fu: 30, ff: 60 },
    hit: { ln: -20, bt: -10, bs: -4, ft: 20, fs: 4, bu: -30, bf: 20, fu: -10, ff: 40 },
    block: Object.assign({}, LS, { ln: -4, bu: 60, bf: 150, fu: 70, ff: 160 }),
    cblock: Object.assign({}, CRL, { ln: 6, bu: 60, bf: 150, fu: 70, ff: 160 }),
    fire: Object.assign({ ln: 18 }, LUNGE, { bu: 60, bf: 70, fu: 95, ff: 92 }),
    windup: { ln: -8, bt: -20, bs: -6, ft: 24, fs: 6, bu: -40, bf: 20, fu: -50, ff: -30 },
    rises: { ln: -6, bt: -4, bs: -4, ft: 80, fs: -60, bu: 150, bf: 170, fu: 172, ff: 178 },
    risek: { ln: -20, bt: 20, bs: -40, ft: 165, fs: 170, bu: 120, bf: 140, fu: 60, ff: 90 },
    spin: { ln: 0, bt: 30, bs: -40, ft: 92, fs: 92, bu: 100, bf: 100, fu: 80, ff: 80 },
    flyk: { ln: -20, bt: 40, bs: -60, ft: 100, fs: 100, bu: 120, bf: 140, fu: 90, ff: 90 },
    dash: { ln: 30, bt: -40, bs: -30, ft: 40, fs: 10, bu: 20, bf: 40, fu: 70, ff: 160 },
    dashs: { ln: 34, bt: -50, bs: -30, ft: 50, fs: 10, bu: -40, bf: -20, fu: 80, ff: 86 },
    thrust: Object.assign({ ln: 20 }, LUNGE, { bu: 140, bf: 170, fu: 92, ff: 90 }),
    grab: Object.assign({}, LS, { ln: 12, bu: 70, bf: 60, fu: 85, ff: 70 }),
    throwp: { ln: -20, bt: -25, bs: -5, ft: 30, fs: 10, bu: 150, bf: 170, fu: 160, ff: 175 },
    win: { ln: 0, bt: -10, bs: -4, ft: 10, fs: 4, bu: 30, bf: 60, fu: 165, ff: 172 },
    clash: Object.assign({ ln: 10 }, LUNGE, { bu: 100, bf: 130, fu: 110, ff: 140 })
  };

  ArcadeRegistry.register({
    id: 'samuraishodown', title: 'Samurai Shodown', year: 1993, maker: 'SNK',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move/jump/crouch (hold back = guard, tap twice = dash) \u00b7 Space: slash, X: kick (tap light, hold heavy) \u00b7 Z/C: heavy slash/kick \u00b7 Enter: start',
    marquee: { bg: '#100404', fg: '#f0e0c0', accent: '#d01818' },
    create(api) {
      const A = api.audio;
      const sfx = {
        whoosh: () => A.noise(0.09, { vol: 0.06, freq: 4000, type: 'highpass' }),
        swish: () => { A.noise(0.18, { vol: 0.1, freq: 2500, slideTo: 6000, type: 'bandpass' }); },
        cut: () => { A.noise(0.12, { vol: 0.22, freq: 3000, slideTo: 800 }); A.tone(900, 0.08, { type: 'sawtooth', vol: 0.06, slideTo: 300 }); },
        bigcut: () => { A.noise(0.35, { vol: 0.3, freq: 2000, slideTo: 200 }); A.tone(200, 0.3, { type: 'sawtooth', vol: 0.12, slideTo: 50 }); },
        hitK: () => { A.noise(0.08, { vol: 0.18, freq: 1200 }); A.tone(160, 0.06, { type: 'square', vol: 0.07, slideTo: 80 }); },
        clang: () => { A.tone(2200, 0.4, { type: 'triangle', vol: 0.14 }); A.tone(3300, 0.3, { type: 'sine', vol: 0.08 }); A.noise(0.1, { vol: 0.15, freq: 6000, type: 'highpass' }); },
        block: () => { A.tone(1600, 0.08, { type: 'triangle', vol: 0.1 }); A.noise(0.05, { vol: 0.1, freq: 5000, type: 'bandpass' }); },
        fire: () => { A.noise(0.3, { vol: 0.1, freq: 3000, slideTo: 1000 }); A.tone(500, 0.25, { type: 'sine', vol: 0.06, slideTo: 1200 }); },
        rise: () => A.tone(240, 0.3, { type: 'square', vol: 0.08, slideTo: 1000 }),
        jump: () => A.noise(0.05, { vol: 0.05, freq: 1200 }),
        thud: () => { A.noise(0.25, { vol: 0.25, freq: 400, slideTo: 60 }); A.tone(70, 0.2, { type: 'sine', vol: 0.2, slideTo: 35 }); },
        ko: () => { A.tone(1200, 1.2, { type: 'triangle', vol: 0.14, slideTo: 1100 }); A.melody([[392, 0.3], [349, 0.3], [262, 0.6]], { type: 'square', vol: 0.1, delay: 0.3 }); },
        rage: () => A.melody([[220, 0.08], [277, 0.08], [330, 0.08], [440, 0.3]], { type: 'sawtooth', vol: 0.12 }),
        drum: () => { A.tone(90, 0.25, { type: 'sine', vol: 0.2, slideTo: 50 }); A.noise(0.08, { vol: 0.08, freq: 300 }); },
        boom: () => { A.noise(0.5, { vol: 0.26, freq: 900, slideTo: 60 }); A.tone(70, 0.4, { type: 'sine', vol: 0.18, slideTo: 30 }); },
        eat: () => A.melody([[660, 0.05], [880, 0.05], [1100, 0.1]], { type: 'square', vol: 0.1 }),
        sel: () => A.tone(880, 0.05, { type: 'square', vol: 0.08 }),
        ok: () => { A.tone(150, 0.4, { type: 'sine', vol: 0.2, slideTo: 60 }); A.tone(1320, 0.3, { type: 'triangle', vol: 0.08 }); },
        coin: () => A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }),
        win: () => A.melody([[440, 0.15], [523, 0.15], [587, 0.15], [659, 0.3], [784, 0.15], [880, 0.5]], { type: 'triangle', vol: 0.15 }),
        over: () => A.melody([[330, 0.3], [311, 0.3], [262, 0.3], [220, 0.7]], { type: 'triangle', vol: 0.15 })
      };
      // miyako-bushi scale tunes (semitones over A3)
      const SCALE = [0, 1, 5, 7, 8, 12, 13, 17, 19, 20];
      const TUNES = [
        [4, null, 3, 2, 3, null, null, 1, 0, null, 1, 2, 4, null, 5, null],
        [7, 6, 5, null, 4, null, 3, 4, 5, null, null, 4, 3, null, 2, null],
        [0, 2, 3, 4, null, 3, 2, null, 5, null, 4, 3, 2, null, 1, null]
      ];
      let musStep = 0, musT = 0;
      function music(tune) {
        if (++musT < 12) return; musT = 0;
        const t = TUNES[tune % TUNES.length], i = musStep++ % 16, n = t[i];
        if (n != null) { const f = 220 * Math.pow(2, SCALE[n] / 12); A.tone(f, 0.35, { type: 'triangle', vol: 0.07 }); A.tone(f * 2, 0.08, { type: 'square', vol: 0.015 }); }
        if (i % 4 === 0) A.tone(55, 0.2, { type: 'sine', vol: 0.14, slideTo: 40 });
        if (i % 8 === 6) A.noise(0.05, { vol: 0.05, freq: 3000, type: 'bandpass' });
      }

      let mode = 'title', T = 0, mt = 0, score = 0, hi = api.getHiScore(100000), lastCred = api.credits, coinFlash = 0;
      let P = null, E = null, demo = false, ladder = [], lpos = 0, round = 1, timer = 99, tick = 0, rp = 'intro', rt = 0;
      let freeze = 0, cam = STW / 2 - W / 2, zoom = 1, shake = 0, projs = [], sparks = [], msgs = [], petals = [];
      let selIdx = 0, pChar = 0, stageIdx = 0, items = [], courier = null, courierT = 600, wpns = [], mash = null, ref = { flag: 0, t: 0 }, cutFlash = 0;

      const charOf = i => i === -1 ? BOSS : CH[i];
      // ---------- fighters ----------
      function mkF(c, x, face, cpu, lv) {
        return {
          c, x, y: 0, vx: 0, vy: 0, face, hp: c.boss ? MAXHP * 1.4 : MAXHP, dhp: c.boss ? MAXHP * 1.4 : MAXHP, max: c.boss ? MAXHP * 1.4 : MAXHP,
          st: 'stand', t: 0, anim: 0, atk: null, spec: null, req: null, reqT: 0, dir: 5, buf: [], cpu, inv: 0, airAtk: false, flash: 0,
          pow: 0, rage: 0, wins: 0, disarmed: false, pend: null, proj: null, stun: 0, thr: null, tapT: { 4: -99, 6: -99 }, prevH: 0, dash: 0,
          ai: { lv: lv || 0, hold: 0, dir: 5, cool: 30, walk: 5, seen: null }
        };
      }
      const isAir = f => f.y > 0 || f.st === 'jump';
      const actable = f => f.st === 'stand' || f.st === 'walk' || f.st === 'crouch' || f.st === 'run';
      const sc = f => f.c.sc || 1, wd = f => f.c.wd || 1;
      const reach = f => f.disarmed ? 0 : f.c.rch;
      function hurt(f) {
        const s = sc(f), hw = 12 * Math.min(1.4, wd(f)) * s;
        let h = 86 * s;
        if (f.st === 'crouch' || f.st === 'cblock' || (f.st === 'attack' && f.atk && f.atk.n[0] === 'c')) h = 58 * s;
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
      function trySpecial(f, b) {
        const a = ARCH[f.c.arch];
        const ok = id => id && !(f.disarmed && SP[id].blade) ? id : null;
        if (DP(f) && ok(a[b + 'dp'])) return a[b + 'dp'];
        if (QCB(f) && ok(a[b + 'qcb'])) return a[b + 'qcb'];
        if (QCF(f) && ok(a[b + 'qcf'])) return a[b + 'qcf'];
        return null;
      }
      function readPlayer(f) {
        const L = api.key('ArrowLeft'), Rr = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const hx = (Rr ? 1 : 0) - (L ? 1 : 0);
        f.dir = 5 + hx * f.face + (U ? 3 : D ? -3 : 0);
        const h = hx * f.face;
        if (h !== 0 && f.prevH !== h && !U && !D) { const k = h > 0 ? 6 : 4; f.dash = (T - f.tapT[k] < 14) ? k : 0; f.tapT[k] = T; }
        if (h === 0) f.dash = 0;
        f.prevH = h;
        const pS = api.pressed('Space'), pK = api.pressed('KeyX'), pHS = api.pressed('KeyZ'), pHK = api.pressed('KeyC');
        let sp = null;
        if (pS || pHS) sp = trySpecial(f, 's');
        if (!sp && (pK || pHK)) sp = trySpecial(f, 'k');
        if (sp) { f.req = sp; f.reqT = 6; f.pend = null; return; }
        if (pHS) { f.req = 'hs'; f.reqT = 6; f.pend = null; }
        else if (pHK) { f.req = 'hk'; f.reqT = 6; f.pend = null; }
        else if (pS) f.pend = { b: 's', t: 0 };
        else if (pK) f.pend = { b: 'k', t: 0 };
        if (f.pend) {
          f.pend.t++;
          const held = f.pend.b === 's' ? api.key('Space') : api.key('KeyX');
          if (!held || (isAir(f) && f.pend.t > 2)) { f.req = (held ? 'h' : 'l') + f.pend.b; f.reqT = 6; f.pend = null; }
          else if (f.pend.t >= 7) { f.req = 'h' + f.pend.b; f.reqT = 6; f.pend = null; }
        }
      }
      // ---------- CPU ----------
      function aiThink(f, o) {
        const a = f.ai, lv = a.lv, dx = o.x - f.x, dist = Math.abs(dx), ar = ARCH[f.c.arch];
        const pick = (...ks) => { for (const k of ks) if (ar[k] && !(f.disarmed && SP[ar[k]].blade)) return ar[k]; return null; };
        const projSp = pick('sqcf', 'kqcf') && SP[pick('sqcf', 'kqcf')].ty === 'proj' ? pick('sqcf', 'kqcf') : null;
        const aaSp = pick('sdp', 'kdp'), dashSp = pick('sqcb', 'kqcb'), closeSp = pick('sqcf', 'kqcf');
        if (f.st === 'jump') {
          if (!f.atk && !f.airAtk && f.vy > -1 && dist < 80 && Math.random() < 0.3) { f.req = Math.random() < 0.6 ? 'hs' : 'hk'; f.reqT = 4; }
          return;
        }
        if (f.st === 'block' || f.st === 'cblock') { f.dir = a.dir; return; }
        if (!actable(f)) { f.dir = 5; return; }
        if (a.hold > 0) { a.hold--; f.dir = a.dir; return; }
        f.dir = 5;
        // go fetch a lost weapon
        if (f.disarmed) {
          const w = wpns.find(q => q.owner === f && q.land);
          if (w && Math.random() < 0.85) { f.dir = w.x > f.x ? (f.face > 0 ? 6 : 4) : (f.face > 0 ? 4 : 6); if (Math.abs(w.x - f.x) > 40 && Math.random() < 0.05) f.dir = f.dir === 6 ? 9 : 7; return; }
        }
        const pr = projs.find(p => p.owner === o && Math.sign(p.vx) === Math.sign(f.x - p.x) && Math.abs(p.x - f.x) < 120);
        if (pr && pr !== a.seen) {
          a.seen = pr;
          const r2 = Math.random();
          if (r2 < 0.25 + lv * 0.04) f.dir = 9;
          else if (projSp && !f.proj && r2 < 0.45) { f.req = projSp; f.reqT = 4; }
          else if (r2 < 0.7 + lv * 0.03) { a.dir = 4; a.hold = 30; f.dir = 4; }
          return;
        }
        const thr = (o.atk && dist < 110) ? o.atk : (o.st === 'special' && dist < 140 ? o.spec : null);
        if (thr && thr !== a.seen) {
          a.seen = thr;
          if (Math.random() < Math.min(0.85, 0.2 + lv * 0.07)) {
            const low = o.atk && o.atk.a && o.atk.a.l === 'low';
            a.dir = low ? 1 : 4; a.hold = 20; f.dir = a.dir; return;
          }
        }
        if (o.st === 'jump' && dist < 110 && o.vy > -3 && o !== a.seen) {
          a.seen = o;
          if (Math.random() < 0.15 + lv * 0.06) { if (aaSp) f.req = aaSp; else { f.dir = 2; a.dir = 2; a.hold = 6; f.req = 'hs'; } f.reqT = 4; return; }
        }
        if (o.st !== 'jump' && a.seen === o) a.seen = null;
        // punish a whiffed heavy slash
        if (o.st === 'attack' && o.atk && o.atk.a.heavy && o.atk.t > o.atk.a.s + o.atk.a.a && dist < 90 && Math.random() < 0.1 + lv * 0.05) { f.req = 'hs'; f.reqT = 4; return; }
        if (--a.cool > 0) { f.dir = a.walk; return; }
        a.cool = 10 + Math.floor(Math.random() * Math.max(10, 44 - lv * 3)); a.walk = 5;
        const q = Math.random(), rch = 40 + reach(f);
        const go = (d, h) => { a.dir = d; a.hold = h; f.dir = d; };
        if (dist > 170) {
          if (projSp && !f.proj && q < 0.3) f.req = projSp;
          else if (q < 0.5) a.walk = 6;
          else if (q < 0.62) f.dir = 9;
          else if (f.dash !== 6 && q < 0.8) { a.walk = 6; }
        } else if (dist > rch + 10) {
          if (q < 0.16) f.dir = 9;
          else if (projSp && !f.proj && q < 0.32) f.req = projSp;
          else if (dashSp && q < 0.44) f.req = dashSp;
          else if (q < 0.85) a.walk = 6; else a.walk = 4;
        } else {
          if (q < 0.12 && closeSp) f.req = closeSp;
          else if (q < 0.34) f.req = Math.random() < 0.4 + lv * 0.03 ? 'hs' : 'ls';
          else if (q < 0.48) { go(2, 3); f.req = Math.random() < 0.5 ? 'hs' : 'lk'; }
          else if (q < 0.56 && dist < 36) { f.dir = 6; f.req = 'hs'; }
          else if (q < 0.62 && aaSp) f.req = aaSp;
          else if (q < 0.7) f.req = Math.random() < 0.5 ? 'lk' : 'hk';
          else if (q < 0.82) go(4, 16);
          else if (q < 0.9) go(1, 16);
          else f.dir = 8;
        }
        if (f.req) f.reqT = 4;
      }
      // ---------- actions ----------
      function startAttack(f, n) {
        const a = ATK[n];
        f.st = 'attack'; f.atk = { n, a, t: 0, hit: false }; f.t = 0;
        if (a.sl) { if (!f.disarmed) (a.heavy ? sfx.swish : sfx.whoosh)(); } else sfx.whoosh();
      }
      function startSpecial(f, id) {
        const s = SP[id];
        if (s.ty === 'proj' && f.proj) return false;
        f.st = 'special'; f.spec = { id, s, t: 0, hits: 0, lastHit: -99 }; f.t = 0; f.vx = 0;
        if (s.ty === 'rise') { f.inv = s.inv; sfx.rise(); }
        if (s.ty === 'fly') { f.vx = s.vx * f.face; f.vy = s.vy; f.y = 1; }
        return true;
      }
      function mapReq(r) { return { ls: 'ls', hs: 'hs', lk: 'lk', hk: 'hk' }[r] || r; }
      function act(f, o) {
        if (f.reqT > 0) f.reqT--; else f.req = null;
        const r = f.req;
        if (f.st === 'jump') {
          if (r && !f.atk && !f.airAtk && ATK['j' + r]) { f.atk = { n: 'j' + r, a: ATK['j' + r], t: 0, hit: false }; f.airAtk = true; f.req = null; ATK['j' + r].sl ? sfx.swish() : sfx.whoosh(); }
          return;
        }
        if (!actable(f)) return;
        if (r && SP[r]) { if (startSpecial(f, r)) { f.req = null; return; } f.req = null; }
        if (r && ATK[mapReq(r)]) {
          if (r === 'hs' && (f.dir === 6 || f.dir === 4) && Math.abs(o.x - f.x) < 38 && !isAir(o) && actable(o) && o.inv <= 0) {
            f.req = null; f.st = 'throw'; f.t = 0; f.thr = { back: f.dir === 4 };
            o.st = 'thrown'; o.t = 0; o.atk = null; o.spec = null;
            return;
          }
          startAttack(f, f.dir <= 3 ? 'c' + r : r); f.req = null; return;
        }
        if (f.dir >= 7) { f.st = 'prejump'; f.t = 0; f.jdir = f.dir === 9 ? 1 : f.dir === 7 ? -1 : 0; return; }
        if (f.dir <= 3) { f.st = 'crouch'; return; }
        if (f.dir === 6) { f.st = f.dash === 6 ? 'run' : 'walk'; f.wdir = 1; return; }
        if (f.dir === 4) {
          if (f.dash === 4) { f.dash = 0; f.st = 'backstep'; f.t = 0; f.y = 1; f.vy = -2.6; f.vx = -3.4 * f.face; return; }
          f.st = 'walk'; f.wdir = -1; return;
        }
        f.st = 'stand';
      }
      function hitStop(n) { freeze = Math.max(freeze, n); }
      const dmgMul = f => (f.rage > 0 ? 1.5 : 1);
      function addRage(f, d) {
        if (f.rage > 0) return;
        f.pow = Math.min(100, f.pow + d);
        if (f.pow >= 100) { f.rage = 480; if (!demo || f === P) sfx.rage(); msgs.push({ s: 'RAGE!', t: 50, x: f.x, y: GY - 120, c: '#ff3020' }); }
      }
      function applyHit(att, def, dmg, hs, pu, lvl, kd, x, y, isSpecial, slash) {
        const back = def.dir === 4 || def.dir === 1 || def.dir === 7;
        const canBlock = (actable(def) || def.st === 'block' || def.st === 'cblock') && back && !isAir(def);
        const crouching = def.dir <= 3;
        const okLevel = lvl === 'mid' || (lvl === 'low' && crouching) || (lvl === 'high' && !crouching);
        if (canBlock && okLevel) {
          def.st = crouching ? 'cblock' : 'block'; def.t = 0; def.stun = Math.max(8, Math.round(hs * 0.6));
          def.vx = -def.face * pu * 0.8;
          const chip = isSpecial || dmg >= 15 ? Math.max(1, Math.round(dmg * 0.12)) : 0;
          def.hp = Math.max(1, def.hp - chip);
          sparks.push({ x, y, t: 10, k: 'block' }); sfx.block(); hitStop(6);
          return 'block';
        }
        if (slash && att.disarmed) dmg *= 0.35;
        dmg = Math.max(1, Math.round(dmg * dmgMul(att)));
        def.hp = Math.max(0, def.hp - dmg); def.flash = 6;
        if (att === P && !demo) score += dmg * 100;
        def.atk = null; def.spec = null;
        if (isAir(def) || kd || def.hp <= 0) { def.st = 'fall'; def.t = 0; def.vy = -4; def.vx = -def.face * 2.2; def.y = Math.max(def.y, 1); }
        else { def.st = 'hit'; def.t = 0; def.stun = hs; def.vx = -def.face * pu; }
        const big = dmg >= 15;
        sparks.push({ x, y, t: big ? 18 : 12, k: slash && !att.disarmed ? (big ? 'bigcut' : 'cut') : (big ? 'big' : 'small') });
        if (slash && !att.disarmed) { big ? sfx.bigcut() : sfx.cut(); } else sfx.hitK();
        hitStop(big ? 14 : 7); if (big) { shake = 10; cutFlash = 6; }
        addRage(def, dmg * 1.4);
        return 'hit';
      }
      function boxHit(f, o, bx, by, slash) {
        const ext = slash ? reach(f) : 0;
        const x0 = f.face > 0 ? f.x + bx[0] * sc(f) : f.x - (bx[1] * sc(f) + ext), x1 = f.face > 0 ? f.x + bx[1] * sc(f) + ext : f.x - bx[0] * sc(f);
        const y0 = f.y + by[0] * sc(f), y1 = f.y + by[1] * sc(f);
        const h = hurt(o);
        if (o.inv > 0 || o.st === 'ko' || o.st === 'down' || o.st === 'getup' || o.st === 'thrown') return null;
        if (x1 < h[0] || x0 > h[1] || y1 < h[2] || y0 > h[3]) return null;
        return [(Math.max(x0, h[0]) + Math.min(x1, h[1])) / 2, GY - (Math.max(y0, h[2]) + Math.min(y1, h[3])) / 2];
      }
      const slashActive = f => f.st === 'attack' && f.atk && f.atk.a.sl && !f.disarmed && f.atk.t > f.atk.a.s - 7 && f.atk.t <= f.atk.a.s + f.atk.a.a + 2;
      function startClash(a, b) {
        const heavy = a.atk.a.heavy || b.atk.a.heavy;
        a.atk.hit = true; b.atk.hit = true;
        const mx = (a.x + b.x) / 2;
        for (const f of [a, b]) { f.st = 'hit'; f.t = 0; f.stun = 22; f.vx = -f.face * 4; f.atk = null; }
        sparks.push({ x: mx, y: GY - 70, t: 24, k: 'clash' }); sfx.clang(); hitStop(16); shake = 8;
        // a clash involving a heavy slash turns into a button-mash contest
        if (heavy) { mash = { t: 0, p: 0, e: 0, x: mx }; msgs.push({ s: 'CLASH!', t: 60, x: W / 2, y: 60, c: '#ffe040', fixed: 1, big: 1 }); }
      }
      function disarm(f) {
        f.disarmed = true;
        wpns.push({ owner: f, x: f.x, y: 60, vx: -f.face * (2 + Math.random()), vy: -4, rot: 0, land: false });
        msgs.push({ s: 'DISARMED!', t: 70, x: f.x, y: GY - 120, c: '#ff8080' });
      }
      function stepFighter(f, o) {
        f.anim++; f.t++;
        if (f.inv > 0) f.inv--;
        if (f.flash > 0) f.flash--;
        if (f.rage > 0) { f.rage--; if (f.rage === 0) f.pow = 0; }
        if (f.dhp > f.hp) f.dhp = Math.max(f.hp, f.dhp - 0.7);
        f.buf.push(f.dir); if (f.buf.length > 40) f.buf.shift();
        if (actable(f) && !isAir(f)) f.face = o.x >= f.x ? 1 : -1;
        act(f, o);
        const s = f.st;
        if (s === 'walk') f.x += (f.wdir > 0 ? f.c.spd : -f.c.spd * 0.8) * f.face;
        else if (s === 'run') { f.x += f.c.spd * 2.1 * f.face; if (f.dir !== 6) f.st = 'stand'; }
        else if (s === 'prejump') { if (f.t >= 3) { f.st = 'jump'; f.vy = -6.6; f.vx = f.jdir * 2.3 * f.face; f.y = 1; f.airAtk = false; f.atk = null; sfx.jump(); } }
        else if (s === 'backstep') { f.vy += 0.35; f.y -= f.vy; f.x += f.vx; if (f.y <= 0) { f.y = 0; f.vx = 0; f.st = 'stand'; } }
        else if (s === 'jump') {
          f.vy += 0.3; f.y -= f.vy; f.x += f.vx;
          if (f.atk) {
            f.atk.t++;
            const a = f.atk.a;
            if (f.atk.t > a.s && f.atk.t <= a.s + a.a && !f.atk.hit) { const cp = boxHit(f, o, a.x, a.y, a.sl); if (cp) { f.atk.hit = true; applyHit(f, o, a.d, a.hs, a.pu, a.l, false, cp[0], cp[1], false, a.sl); } }
          }
          if (f.y <= 0) { f.y = 0; f.vx = 0; f.st = 'land'; f.t = 0; f.atk = null; }
        } else if (s === 'land') { if (f.t > 4) f.st = 'stand'; }
        else if (s === 'attack') {
          const a = f.atk.a; f.atk.t++;
          const t = f.atk.t;
          if (t > a.s && t <= a.s + a.a && !f.atk.hit) {
            if (a.sl && slashActive(o) && Math.abs(o.x - f.x) < 30 + reach(f) + reach(o)) { startClash(f, o); return; }
            const cp = boxHit(f, o, a.x, a.y, a.sl);
            if (cp) { f.atk.hit = true; applyHit(f, o, a.d, a.hs, a.pu, a.l, a.kd, cp[0], cp[1], false, a.sl); }
          }
          if (a.heavy && t === a.s) f.x += f.face * 4;
          if (f.atk && t > a.s + a.a + a.r) { f.atk = null; f.st = f.dir <= 3 ? 'crouch' : 'stand'; }
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
            const d = Math.round(14 * dmgMul(f)); o.hp = Math.max(0, o.hp - d); o.flash = 6; if (f === P && !demo) score += d * 100;
            sfx.hitK(); shake = 6; addRage(o, d);
          }
          if (f.t > 26) f.st = 'stand';
        } else if (s === 'thrown') { if (f.t > 60) { f.st = 'fall'; f.t = 0; f.vy = -2; f.y = Math.max(f.y, 1); } }
        // weapon pickup
        if (f.disarmed && actable(f)) {
          const w = wpns.find(q => q.owner === f && q.land && Math.abs(q.x - f.x) < 14);
          if (w) { f.disarmed = false; w.gone = true; sfx.sel(); msgs.push({ s: 'GOT IT!', t: 40, x: f.x, y: GY - 110, c: '#a0ff80' }); }
        }
        // items
        if (actable(f) && f.y === 0) for (const it of items) {
          if (it.gone || !it.land || Math.abs(it.x - f.x) > 14) continue;
          if (it.k === 'food') { it.gone = true; f.hp = Math.min(f.max, f.hp + 24); sfx.eat(); msgs.push({ s: '+HEALTH', t: 40, x: f.x, y: GY - 110, c: '#80ff80' }); }
          else if (it.k === 'coin') { it.gone = true; if (f === P && !demo) { score += 3000; } sfx.sel(); msgs.push({ s: f === P && !demo ? '3000' : 'MINE!', t: 40, x: f.x, y: GY - 110, c: '#ffe040' }); }
        }
        const vw = W / zoom;
        f.x = clamp(f.x, cam + 14, cam + vw - 14);
        f.x = clamp(f.x, 16, STW - 16);
      }
      function stepSpecial(f, o) {
        const sp = f.spec, s = sp.s; sp.t++;
        const t = sp.t;
        const done = () => { f.spec = null; f.st = 'stand'; f.vx = 0; f.y = 0; };
        if (s.ty === 'proj') {
          if (t === s.st) { const p = { owner: f, x: f.x + f.face * 30, y: s.y * sc(f), vx: s.v * f.face, d: s.d, w: s.w, h: s.h, cols: s.cols, sh: s.sh, t: 0 }; projs.push(p); f.proj = p; sfx.fire(); }
          if (t > s.st + s.rec) done();
        } else if (s.ty === 'rise') {
          if (t === 3) { f.vy = s.vy; f.vx = s.vx * f.face; f.y = 1; if (s.blade) sfx.swish(); }
          if (t > 3) {
            f.vy += 0.36; f.y -= f.vy; f.x += f.vx;
            if (sp.hits < 1 && f.vy < 2) { const cp = boxHit(f, o, [0, 30], [30, 110], s.blade); if (cp) { sp.hits = 1; applyHit(f, o, s.d, 20, 2, 'mid', true, cp[0], cp[1], true, s.blade); } }
            if (f.y <= 0) { f.y = 0; f.st = 'land'; f.t = -12; f.spec = null; f.vx = 0; }
          }
        } else if (s.ty === 'spin') {
          f.y = Math.min(s.lift, t * 2); f.x += s.vx * f.face;
          if (t % 12 === 6 && sp.hits < s.hits) { const cp = boxHit(f, o, [-20, 50], [s.lift + 20, s.lift + 70]); if (cp) { sp.hits++; applyHit(f, o, s.d, 16, 2, 'mid', sp.hits >= s.hits, cp[0], cp[1], true, false); } }
          if (t >= s.dur) { f.y = 0; f.st = 'land'; f.t = -6; f.spec = null; }
        } else if (s.ty === 'fly') {
          f.vy += 0.25; f.y -= f.vy; f.x += f.vx;
          if (sp.hits < 1) { const cp = boxHit(f, o, [0, 46], [0, 50]); if (cp) { sp.hits = 1; applyHit(f, o, s.d, 18, 3, 'mid', true, cp[0], cp[1], true, true); f.vx = -f.vx * 0.3; } }
          if (f.y <= 0) { f.y = 0; f.st = 'land'; f.t = -8; f.spec = null; f.vx = 0; }
        } else if (s.ty === 'dash') {
          if (t === s.st && s.blade) sfx.swish();
          if (t > s.st && t <= s.st + s.dur) {
            f.x += s.vx * f.face;
            if (sp.hits < 1) { const cp = boxHit(f, o, [0, 30], s.y, s.blade); if (cp) { sp.hits = 1; applyHit(f, o, s.d, 18, 2, 'mid', true, cp[0], cp[1], true, s.blade); sp.t = s.st + s.dur; } }
          }
          if (t > s.st + s.dur + 18) done();
        } else if (s.ty === 'rush') {
          if (t % s.ev === 0 && t < s.dur) {
            f.x += f.face * 1.2;
            const cp = boxHit(f, o, s.x, s.y, false);
            if (cp) applyHit(f, o, s.d, 14, 1, 'mid', t + s.ev >= s.dur, cp[0], cp[1], true, true); else sfx.whoosh();
          }
          if (t > s.dur + 14) done();
        }
      }
      function stepProjs() {
        for (const p of projs) {
          p.x += p.vx; p.t++;
          if (p.x < cam - 60 || p.x > cam + W / zoom + 60) p.dead = true;
          const o = p.owner === P ? E : P;
          if (!p.dead && o) {
            const h = hurt(o), ground = p.sh === 'rock';
            if (o.inv <= 0 && o.st !== 'ko' && o.st !== 'down' && o.st !== 'thrown' && p.x + p.w > h[0] && p.x - p.w < h[1] && p.y + p.h > h[2] && p.y - (ground ? 0 : p.h) < h[3]) {
              applyHit(p.owner, o, p.d, 18, 3, 'mid', false, p.x, GY - p.y - p.h / 2, true, false);
              p.dead = true;
            }
          }
        }
        for (const a of projs) for (const b of projs) if (a !== b && a.owner !== b.owner && !a.dead && !b.dead && Math.abs(a.x - b.x) < a.w + b.w) {
          a.dead = b.dead = true; sparks.push({ x: (a.x + b.x) / 2, y: GY - a.y - 8, t: 12, k: 'big' }); sfx.block();
        }
        projs = projs.filter(p => { if (p.dead && p.owner.proj === p) p.owner.proj = null; return !p.dead; });
      }
      function pushApart() {
        if (P.st === 'thrown' || E.st === 'thrown') return;
        const d = E.x - P.x, min = 22 * Math.max(wd(P), wd(E));
        if (Math.abs(d) < min && Math.abs(P.y - E.y) < 60) { const push = (min - Math.abs(d)) / 2, s = d >= 0 ? 1 : -1; P.x -= push * s; E.x += push * s; }
      }
      function stepWorld() {
        // dropped weapons
        for (const w of wpns) {
          if (!w.land) { w.vy += 0.3; w.y -= w.vy; w.x += w.vx; w.rot += 0.4; if (w.y <= 0) { w.y = 0; w.land = true; w.rot = 0; sfx.block(); } w.x = clamp(w.x, cam + 20, cam + W / zoom - 20); }
        }
        wpns = wpns.filter(w => !w.gone);
        // the courier runs past and tosses things into the fight
        if (rp === 'fight' && !courier && --courierT <= 0) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          courier = { x: dir > 0 ? cam - 30 : cam + W / zoom + 30, dir, drop: cam + 40 + Math.random() * (W / zoom - 80), dropped: false, t: 0 };
          courierT = 900 + Math.random() * 600;
        }
        if (courier) {
          courier.t++; courier.x += courier.dir * 2.4;
          if (!courier.dropped && Math.abs(courier.x - courier.drop) < 3) {
            courier.dropped = true;
            const r = Math.random(), k = r < 0.4 ? 'bomb' : r < 0.8 ? 'food' : 'coin';
            items.push({ k, x: courier.x, y: 60, vy: -3, land: false, t: 0, fuse: 110 });
            A.tone(600, 0.1, { type: 'square', vol: 0.06, slideTo: 300 });
          }
          if (courier.x < cam - 60 || courier.x > cam + W / zoom + 60) courier = null;
        }
        for (const it of items) {
          it.t++;
          if (!it.land) { it.vy += 0.25; it.y -= it.vy; if (it.y <= 0) { it.y = 0; it.land = true; } }
          else if (it.k === 'bomb') {
            if (--it.fuse <= 0) {
              it.gone = true; sfx.boom(); shake = 12;
              sparks.push({ x: it.x, y: GY - 14, t: 26, k: 'boom' });
              for (const f of [P, E]) if (Math.abs(f.x - it.x) < 44 && f.y < 50 && f.st !== 'ko' && f.st !== 'down') {
                f.hp = Math.max(0, f.hp - 12); f.flash = 6; f.st = 'fall'; f.t = 0; f.vy = -4; f.vx = Math.sign(f.x - it.x || 1) * 2.4; f.y = Math.max(1, f.y); f.atk = null; f.spec = null; addRage(f, 16);
              }
            }
          } else if (it.t > 700) it.gone = true;
        }
        items = items.filter(it => !it.gone);
      }
      // ---------- match flow ----------
      function newGame() { score = 0; mode = 'select'; mt = 0; demo = false; }
      function beginLadder() {
        pChar = selIdx;
        const others = CH.map((c, i) => i).filter(i => i !== selIdx);
        for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
        ladder = others.concat([-1]); lpos = 0;
        startMatch();
      }
      function startMatch() {
        const ec = charOf(ladder[lpos]);
        P = mkF(CH[pChar], STW / 2 - 70, 1, false, 0);
        E = mkF(ec, STW / 2 + 70, -1, true, Math.min(9, 1 + lpos * 1.2));
        stageIdx = ec.stage; round = 1;
        mode = 'vs'; mt = 0; startRound();
      }
      function startRound() {
        P.x = STW / 2 - 70; E.x = STW / 2 + 70; P.face = 1; E.face = -1;
        for (const f of [P, E]) { f.hp = f.max; f.dhp = f.max; f.st = 'stand'; f.y = 0; f.vx = f.vy = 0; f.atk = f.spec = null; f.proj = null; f.disarmed = false; f.inv = 0; f.t = 0; f.rage = 0; }
        cam = STW / 2 - W / 2; zoom = 1; projs = []; sparks = []; msgs = []; items = []; wpns = []; courier = null; courierT = 500 + Math.random() * 400; mash = null;
        timer = 99; tick = 0; rp = 'intro'; rt = 0; ref.flag = 0;
      }
      function startDemo() {
        demo = true;
        const a = Math.floor(Math.random() * CH.length); let b = Math.floor(Math.random() * CH.length); if (b === a) b = (a + 3) % CH.length;
        P = mkF(CH[a], 0, 1, true, 4); E = mkF(CH[b], 0, -1, true, 4);
        stageIdx = CH[b].stage; round = 1; startRound(); mode = 'fight';
      }
      function endRound() {
        const pw = P.hp > E.hp, ew = E.hp > P.hp;
        if (pw || (P.hp > 0 && E.hp <= 0)) P.wins++;
        if (ew || (E.hp > 0 && P.hp <= 0)) E.wins++;
        if (P.hp <= 0 && E.hp <= 0) { P.wins++; E.wins++; }
        if (pw && !demo) score += 3000 + timer * 100 + (P.hp >= P.max ? 20000 : 0);
        if (score > hi) hi = score;
        round++;
        if (demo) { mode = 'title'; mt = 0; demo = false; P = E = null; return; }
        if (P.wins >= 2 && E.wins < 2) { mode = 'matchwin'; mt = 0; sfx.win(); return; }
        if (E.wins >= 2) {
          api.setHiScore(score);
          const over = () => { mode = 'gameover'; mt = 0; sfx.over(); };
          const cont = () => { P.wins = 0; E.wins = 0; round = 1; startRound(); mode = 'fight'; };
          mode = 'lose'; mt = 0;
          if (api.offerContinue) api.offerContinue(cont, over); else over();
          return;
        }
        startRound();
      }
      function nextOpponent() {
        lpos++;
        if (lpos >= ladder.length) { mode = 'ending'; mt = 0; api.setHiScore(score); return; }
        startMatch();
      }
      function updFight() {
        if (rp === 'fight' && !demo) music(stageIdx);
        // petals / snow / embers
        if ((T & 7) === 0 && [2, 3, 8].indexOf(stageIdx) >= 0) petals.push({ x: Math.random() * (W + 60), y: -6, vx: -0.4 - Math.random() * 0.5, vy: 0.5 + Math.random() * 0.4, t: 0 });
        for (const p of petals) { p.x += p.vx + Math.sin(p.t * 0.05); p.y += p.vy; p.t++; }
        petals = petals.filter(p => p.y < H + 6 && p.t < 600);
        if (freeze > 0) { freeze--; return; }
        if (shake > 0) shake--;
        if (cutFlash > 0) cutFlash--;
        rt++;
        if (mash) {
          // button-mash contest after a clash
          mash.t++;
          if (P.cpu) { if (Math.random() < 0.16 + P.ai.lv * 0.02) mash.p++; } else if (api.anyPressed('Space', 'KeyX', 'KeyZ', 'KeyC')) mash.p++;
          if (Math.random() < 0.13 + E.ai.lv * 0.022) mash.e++;
          if (mash.t % 6 === 0) A.tone(1800 + (mash.t % 12) * 50, 0.03, { type: 'triangle', vol: 0.05 });
          if (mash.t >= 70) {
            const d = mash.p - mash.e;
            if (d >= 2) disarm(E); else if (d <= -2) disarm(P);
            mash = null;
          }
          for (const s of sparks) s.t--; sparks = sparks.filter(s => s.t > 0);
          for (const m of msgs) m.t--; msgs = msgs.filter(m => m.t > 0);
          return;
        }
        if (rp === 'intro') {
          if (rt === 20) sfx.drum();
          if (rt === 70) msgs.push({ s: 'IPPON SHOBU', t: 40, x: W / 2, y: 80, c: '#fff', fixed: 1, big: 1 });
          if (rt === 115) { msgs.push({ s: 'BEGIN!', t: 40, x: W / 2, y: 80, c: '#ff3020', fixed: 1, big: 1 }); sfx.drum(); }
          if (rt >= 115) { rp = 'fight'; rt = 0; }
        }
        if (rp === 'fight') {
          if (P.cpu) aiThink(P, E); else readPlayer(P);
          aiThink(E, P);
          if (++tick >= 50) { tick = 0; timer--; if (timer <= 0) { timer = 0; rp = 'timeup'; rt = 0; msgs.push({ s: 'TIME UP', t: 90, x: W / 2, y: 80, c: '#fff', fixed: 1, big: 1 }); } }
        } else { P.dir = 5; E.dir = 5; P.req = E.req = null; }
        stepFighter(P, E); if (!mash) stepFighter(E, P);
        pushApart(); stepProjs(); stepWorld();
        // zooming camera
        const dist = Math.abs(P.x - E.x);
        const tz = clamp(1.5 - (dist - 70) / 180, 1, 1.5);
        zoom += (tz - zoom) * 0.06;
        const mid = (P.x + E.x) / 2, vw = W / zoom;
        cam += (clamp(mid - vw / 2, 0, STW - vw) - cam) * 0.25;
        cam = clamp(cam, 0, STW - vw);
        if (rp === 'fight' && (P.hp <= 0 || E.hp <= 0) && (P.st === 'ko' || E.st === 'ko' || P.st === 'fall' || E.st === 'fall')) {
          rp = 'ko'; rt = 0; sfx.ko(); freeze = 40; cutFlash = 10;
          msgs.push({ s: 'IPPON!', t: 110, x: W / 2, y: 70, c: '#ff3020', fixed: 1, big: 1 });
          ref.flag = P.hp > 0 ? 1 : E.hp > 0 ? 2 : 3;
        }
        if (rp === 'ko') { if (rt === 90) { const w = P.hp > 0 ? P : E.hp > 0 ? E : null; if (w && actable(w)) w.st = 'win'; } if (rt > 180) endRound(); }
        if (rp === 'timeup') { ref.flag = P.hp / P.max > E.hp / E.max ? 1 : E.hp / E.max > P.hp / P.max ? 2 : 3; if (rt > 110) { if (P.hp / P.max > E.hp / E.max) E.hp = 0; else if (E.hp / E.max > P.hp / P.max) P.hp = 0; else { P.hp = 0; E.hp = 0; } endRound(); } }
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
          if (mode === 'title') { mt++; if (mt > 600) startDemo(); } else updFight();
          if ((T & 7) === 0 && mode === 'title') petals.push({ x: Math.random() * (W + 60), y: -6, vx: -0.4 - Math.random() * 0.5, vy: 0.5 + Math.random() * 0.4, t: 0 });
          if (mode === 'title') { for (const p of petals) { p.x += p.vx + Math.sin(p.t * 0.05); p.y += p.vy; p.t++; } petals = petals.filter(p => p.y < H + 6); }
          if (startPressed) {
            if (api.useCredit()) { lastCred = api.credits; newGame(); sfx.ok(); }
            else { coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        mt++;
        if (mode === 'select') {
          if (api.pressed('ArrowLeft')) { selIdx = (selIdx + CH.length - 1) % CH.length; sfx.sel(); }
          if (api.pressed('ArrowRight')) { selIdx = (selIdx + 1) % CH.length; sfx.sel(); }
          if (api.pressed('ArrowUp') || api.pressed('ArrowDown')) { selIdx = (selIdx + 4) % CH.length; sfx.sel(); }
          if ((mt > 20 && api.anyPressed('Space', 'Enter', 'KeyX')) || mt > 1200) { sfx.ok(); beginLadder(); }
          return;
        }
        if (mode === 'vs') { if (mt > 160 || (mt > 40 && api.anyPressed('Enter', 'Space'))) mode = 'fight'; return; }
        if (mode === 'fight') { updFight(); return; }
        if (mode === 'matchwin') { if (mt > 220 || (mt > 60 && api.anyPressed('Enter', 'Space'))) nextOpponent(); return; }
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
        if (s === 'attack') {
          const a = f.atk;
          if (a.n === 'hs' && a.t <= a.a.s) return PO.hsw;
          return a.t > a.a.s - 2 && a.t <= a.a.s + a.a.a + 6 ? PO[a.a.po] : (a.n[0] === 'c' ? PO.crouch : PO.stand);
        }
        if (s === 'hit' || s === 'thrown' || s === 'fall') return mash ? PO.clash : PO.hit;
        if (s === 'block') return PO.block;
        if (s === 'cblock') return PO.cblock;
        if (s === 'throw') return f.t < 12 ? PO.grab : PO.throwp;
        if (s === 'win') return PO.win;
        if (s === 'special') {
          const sp = f.spec, d = sp.s;
          if (d.ty === 'proj') return sp.t < d.st - 4 ? PO.windup : PO.fire;
          if (d.ty === 'rush') return (sp.t >> 2) & 1 ? PO.thrust : PO.ls;
          if (d.ty === 'dash' && sp.t <= d.st) return PO.windup;
          return PO[d.po] || PO.stand;
        }
        return PO.stand;
      }
      function drawHead(ctx, c, x, y, s, fc, flash) {
        const sk = flash ? '#fff' : c.sk, hr = flash ? '#fff' : c.hr;
        const hw = 6 * s, hh = 7 * s;
        R(ctx, sk, x - hw, y - hh, hw * 2, hh * 2);
        R(ctx, '#000', x + fc * 2.5 * s - 1, y - 2 * s, Math.max(1, s * 1.5), 2 * s);
        const hs = c.hs;
        if (hs === 'topknot') { R(ctx, hr, x - hw, y - hh - 2 * s, hw * 2, 4 * s); R(ctx, hr, x - fc * 2 * s - 2 * s, y - hh - 6 * s, 4 * s, 5 * s); R(ctx, hr, x - fc * hw - (fc > 0 ? 1 : 0), y - hh, 2 * s, hh * 1.2); }
        else if (hs === 'hood') { R(ctx, hr, x - hw - 1, y - hh - 2 * s, hw * 2 + 2, hh + 2 * s); R(ctx, hr, x - hw - 1, y + 1 * s, hw * 2 + 2, hh); R(ctx, sk, x - hw + 2 * s + (fc > 0 ? 2 * s : 0), y - 3 * s, hw * 1.2, 3 * s); R(ctx, '#000', x + fc * 2.5 * s - 1, y - 2 * s, Math.max(1, s * 1.5), 2 * s); R(ctx, c.bl, x - fc * (hw + 4 * s) - 2 * s, y - hh, 5 * s, 2 * s); }
        else if (hs === 'long') { R(ctx, hr, x - hw - 1, y - hh - 3 * s, hw * 2 + 2, 5 * s); R(ctx, hr, x - fc * (hw + 1) - (fc > 0 ? 3 * s : 0), y - hh, 4 * s, hh * 2.8); }
        else if (hs === 'pony') { R(ctx, hr, x - hw, y - hh - 3 * s, hw * 2, 5 * s); R(ctx, hr, x - fc * (hw + 4 * s) - 2 * s, y - hh - 2 * s, 5 * s, 4 * s); R(ctx, hr, x - fc * (hw + 6 * s) - 2 * s, y - hh + 2 * s, 4 * s, 12 * s); R(ctx, c.bl, x - hw, y - hh + 1 * s, hw * 2, 1.5 * s); }
        else if (hs === 'wild') { for (let i = 0; i < 5; i++) R(ctx, hr, x - hw - 3 * s + i * 3.5 * s, y - hh - 5 * s + (i % 2) * 2 * s, 3.5 * s, 7 * s); R(ctx, hr, x - fc * hw - (fc > 0 ? 3 * s : 0), y - hh, 4 * s, hh * 2); }
        else if (hs === 'bald') { R(ctx, hr, x - hw + 1 * s, y + 3 * s, hw * 2 - 2 * s, 6 * s); R(ctx, hr, x + fc * 1 * s - 2 * s, y + 7 * s, 4 * s, 6 * s); }
      }
      function drawWeapon(ctx, f, hx, hy, ang, s, fl) {
        if (f.disarmed) return;
        const c = f.c, L = c.rch * s * 0.95, fc = f.face, cs = Math.cos(ang * D2R), sn = Math.sin(ang * D2R);
        const ex = hx + sn * L * fc, ey = hy + cs * L;
        const wp = c.wp;
        if (wp === 'kanabo') { seg(ctx, hx, hy, ex, ey, 7 * s, fl ? '#fff' : '#3a2a20'); for (let i = 3; i < 8; i++) { const t = i / 8; R(ctx, '#a0a0a8', hx + (ex - hx) * t - 2, hy + (ey - hy) * t - 2, 3, 3); } return; }
        if (wp === 'claw') { for (let i = -1; i <= 1; i++) seg(ctx, hx, hy + i * 2 * s, ex + i * 1.5 * s, ey + i * 2 * s, 1.5, '#e0e8f0'); return; }
        if (wp === 'orb') { ctx.fillStyle = (T >> 2) & 1 ? '#ff60ff' : '#a020ff'; ctx.beginPath(); ctx.arc(hx + sn * 8 * fc, hy + cs * 8, 5 * s, 0, 7); ctx.fill(); return; }
        // hilt + guard + blade
        const gx = hx + sn * 5 * s * fc, gy = hy + cs * 5 * s;
        seg(ctx, hx - sn * 5 * s * fc, hy - cs * 5 * s, gx, gy, 2.5 * s, '#402018');
        R(ctx, '#d0b040', gx - 2 * s, gy - 2 * s, 4 * s, 4 * s);
        const bw = wp === 'rapier' ? 1.2 : wp === 'dao' ? 4 * s : wp === 'nodachi' ? 2.6 * s : 2.2 * s;
        seg(ctx, gx, gy, ex, ey, bw, fl ? '#fff' : '#d8e0e8');
        seg(ctx, gx + 1, gy, ex + 1, ey, 1, '#ffffff');
        if (wp === 'kodachi') { /* second blade drawn by caller */ }
      }
      function drawFighter(ctx, f, ox) {
        const c = f.c, s = sc(f), w = wd(f);
        const x = f.x - ox, gy = GY - f.y, fc = f.face, fl = f.flash > 0 && (f.flash & 2);
        const col = k => fl ? '#ffffff' : c[k];
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(x - 18 * s), GY - 2, Math.round(36 * s), 4);
        if (f.st === 'down' || f.st === 'ko') {
          const by = GY - 6;
          R(ctx, col('pa'), x - fc * 32 * s, by - 6 * s, 24 * s, 8 * s);
          R(ctx, col('to'), x - fc * 8 * s - 12 * s, by - 8 * s, 24 * s, 10 * s);
          R(ctx, col('sk'), x + fc * 14 * s - 6 * s, by - 9 * s, 12 * s, 10 * s);
          R(ctx, col('hr'), x + fc * 20 * s - 3 * s, by - 9 * s, 5 * s, 10 * s);
          if (f.st === 'ko') R(ctx, '#a01010', x - 10 * s, GY - 1, 26 * s, 2);
          return;
        }
        const P0 = curPose(f);
        const TH = 17 * s, SH = 17 * s, TO = 26 * s, UA = 13 * s, FA = 13 * s;
        const cs = a => Math.cos(a * D2R), sn = a => Math.sin(a * D2R);
        const lh = Math.max(cs(P0.bt) * TH + cs(P0.bs) * SH, cs(P0.ft) * TH + cs(P0.fs) * SH, 10 * s);
        const hx = x, hy = gy - lh, ln = P0.ln;
        const nx = hx + sn(ln) * TO * fc, ny = hy - cs(ln) * TO;
        const leg = (t, sh) => { const kx = hx + sn(t) * TH * fc, ky = hy + cs(t) * TH; return [kx, ky, kx + sn(sh) * SH * fc, ky + cs(sh) * SH]; };
        const arm = (u, a, off) => { const sx = nx - fc * off, sy = ny + 4 * s; const ex = sx + sn(u) * UA * fc, ey = sy + cs(u) * UA; return [sx, sy, ex, ey, ex + sn(a) * FA * fc, ey + cs(a) * FA]; };
        const lw = 9 * s * Math.min(1.3, w), aw = 6 * s * Math.min(1.3, w);
        if (f.rage > 0) { ctx.fillStyle = (T >> 2) & 1 ? 'rgba(255,40,20,0.25)' : 'rgba(255,120,20,0.2)'; ctx.beginPath(); ctx.ellipse(x + fc * 4 * s, gy - 45 * s, 30 * s, 52 * s, 0, 0, 7); ctx.fill(); }
        // back arm & leg
        const ba = arm(P0.bu, P0.bf, 5 * s);
        seg(ctx, ba[0], ba[1], ba[2], ba[3], aw, fl ? '#fff' : shade(c.to === c.sk ? c.sk : c.to, 0.7));
        seg(ctx, ba[2], ba[3], ba[4], ba[5], aw * 0.9, fl ? '#fff' : shade(c.to === c.sk ? c.sk : c.to, 0.75));
        R(ctx, fl ? '#fff' : shade(c.gl, 0.75), ba[4] - 3 * s, ba[5] - 3 * s, 6 * s, 6 * s);
        if (c.wp === 'kodachi') drawWeapon(ctx, f, ba[4], ba[5], P0.bf, s * 0.9, fl);
        const bl = leg(P0.bt, P0.bs);
        seg(ctx, hx, hy, bl[0], bl[1], lw * 1.15, fl ? '#fff' : shade(c.pa, 0.72));
        seg(ctx, bl[0], bl[1], bl[2], bl[3], lw, fl ? '#fff' : shade(c.pa, 0.72));
        R(ctx, fl ? '#fff' : shade(c.sh, 0.72), bl[2] - 4 * s + fc * 2 * s, bl[3] - 3 * s, 8 * s, 4 * s);
        // torso (kimono with collar), sash
        const tw = 15 * s * w;
        seg(ctx, hx, hy - 2 * s, nx, ny + 2 * s, tw, col('to'));
        if (c.to !== c.sk) { seg(ctx, nx - fc * 3 * s, ny + 2 * s, (hx + nx) / 2 + fc * 2 * s, (hy + ny) / 2, 2 * s, fl ? '#fff' : shade(c.to, 1.35)); seg(ctx, nx + fc * 3 * s, ny + 2 * s, (hx + nx) / 2 + fc * 2 * s, (hy + ny) / 2, 2 * s, fl ? '#fff' : shade(c.to, 0.7)); }
        else { R(ctx, fl ? '#fff' : shade(c.sk, 0.85), (hx + nx) / 2 - 1, (hy + ny) / 2 - 4 * s, 2, 6 * s); }
        seg(ctx, hx, hy, hx + sn(ln) * 5 * s * fc, hy - cs(ln) * 5 * s, tw * 1.05, col('pa'));
        R(ctx, col('bl'), hx + sn(ln) * 5 * s * fc - tw / 2, hy - cs(ln) * 5 * s - 2 * s, tw, 3 * s);
        // front leg (hakama: wide)
        const fl2 = leg(P0.ft, P0.fs);
        seg(ctx, hx, hy, fl2[0], fl2[1], lw * 1.15, col('pa'));
        seg(ctx, fl2[0], fl2[1], fl2[2], fl2[3], lw, col('pa'));
        R(ctx, col('sh'), fl2[2] - 4 * s + fc * 2 * s, fl2[3] - 3 * s, 8 * s, 4 * s);
        drawHead(ctx, c, nx + sn(ln) * 7 * s * fc, ny - cs(ln) * 7 * s - 3 * s, s, fc, fl);
        // front arm + weapon
        const fa = arm(P0.fu, P0.ff, -4 * s);
        seg(ctx, fa[0], fa[1], fa[2], fa[3], aw, c.to === c.sk ? col('sk') : col('to'));
        seg(ctx, fa[2], fa[3], fa[4], fa[5], aw * 0.9, c.to === c.sk || c.wp === 'claw' ? col('sk') : col('to'));
        drawWeapon(ctx, f, fa[4], fa[5], P0.ff, s, fl);
        R(ctx, col('gl'), fa[4] - 3.5 * s, fa[5] - 3.5 * s, 7 * s, 7 * s);
        // slash trail
        const at = f.st === 'attack' ? f.atk : (f.st === 'jump' && f.atk ? f.atk : null);
        if (at && at.a.sl && !f.disarmed && at.t > at.a.s - 1 && at.t <= at.a.s + at.a.a + 3) {
          const r0 = UA + FA, r1 = r0 + c.rch * s, [a0, a1] = at.a.arc, k = Math.min(1, (at.t - at.a.s + 1) / (at.a.a + 1));
          const sx0 = fa[0], sy0 = fa[1];
          for (let i = 0; i <= 14; i++) {
            const tt = i / 14; if (tt > k) break;
            const a = a0 + (a1 - a0) * tt, rr = r0 + (r1 - r0) * 0.7;
            const px = sx0 + Math.sin(a * D2R) * rr * fc, py = sy0 + Math.cos(a * D2R) * rr;
            ctx.fillStyle = at.a.heavy ? (i & 1 ? 'rgba(255,255,255,0.85)' : 'rgba(160,220,255,0.7)') : 'rgba(255,255,255,0.6)';
            const th = (at.a.heavy ? 7 : 4) * s * (0.4 + tt * 0.6);
            ctx.fillRect(Math.round(px - th / 2), Math.round(py - th / 2), Math.round(th), Math.round(th));
          }
        }
        if (f.st === 'special' && f.spec.s.fire) for (let i = 0; i < 6; i++) R(ctx, i & 1 ? '#ffa020' : '#ff4010', x - fc * (10 + Math.random() * 30) - 3, hy - Math.random() * 40 * s, 5, 5);
      }
      function drawProj(ctx, p, ox) {
        const x = p.x - ox, y = GY - p.y, c = p.cols, f = Math.sign(p.vx);
        if (p.sh === 'crescent') {
          ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(x, y, p.w, p.h, 0, -Math.PI / 2, Math.PI / 2, f < 0); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0)';
          ctx.fillStyle = c[1]; ctx.beginPath(); ctx.ellipse(x + f * 2, y, p.w * 0.5, p.h * 0.85, 0, -Math.PI / 2, Math.PI / 2, f < 0); ctx.fill();
          for (let i = 1; i < 4; i++) R(ctx, c[0], x - f * (p.w + i * 6), y - 1 + ((p.t + i) % 5) - 2, 3, 2);
        } else if (p.sh === 'cross') {
          ctx.save(); ctx.translate(x, y); ctx.rotate(p.t * 0.3);
          R(ctx, c[0], -p.w, -2, p.w * 2, 4); R(ctx, c[0], -2, -p.h, 4, p.h * 2); R(ctx, c[1], -2, -2, 4, 4);
          ctx.restore();
        } else if (p.sh === 'star') {
          ctx.save(); ctx.translate(x, y); ctx.rotate(p.t * 0.5);
          R(ctx, c[0], -6, -1, 12, 2); R(ctx, c[0], -1, -6, 2, 12); R(ctx, '#fff', -1, -1, 2, 2);
          ctx.restore();
        } else if (p.sh === 'ball') {
          ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(x, y, p.w + ((p.t >> 1) & 1), 0, 7); ctx.fill();
          ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(x, y, p.w * 0.6, 0, 7); ctx.fill();
          ctx.fillStyle = c[2]; ctx.beginPath(); ctx.arc(x + f * 2, y - 2, p.w * 0.25, 0, 7); ctx.fill();
        } else if (p.sh === 'rock') {
          for (let i = 0; i < 4; i++) { const hh = 6 + ((p.t + i * 3) % 12); R(ctx, i & 1 ? c[0] : c[1], x - p.w + i * 7, y - hh, 6, hh); }
        }
      }
      function drawStage(ctx) {
        const st = STAGES[stageIdx], vw = W / zoom;
        let g = ctx.createLinearGradient(0, -80, 0, GY);
        g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(-10, -120, vw + 20, GY + 120);
        const p1 = cam * 0.3, p2 = cam * 0.6;
        const d = st.deco;
        if (d === 'shrine') {
          ctx.fillStyle = '#fff0c0'; ctx.beginPath(); ctx.arc(260 - p1 * 0.2, 40, 24, 0, 7); ctx.fill();
          for (let i = 0; i < 5; i++) { const x = i * 160 - p1; R(ctx, st.far, x + 10, 60, 12, 100); R(ctx, st.far, x + 90, 60, 12, 100); R(ctx, st.far, x - 4, 56, 120, 10); R(ctx, st.far, x + 4, 72, 104, 6); }
        } else if (d === 'bamboo') {
          for (let i = 0; i < 40; i++) { const x = i * 22 - p1 * (0.6 + (i % 3) * 0.2), c = i % 3 === 0 ? '#305828' : i % 3 === 1 ? '#406830' : '#284820'; R(ctx, c, x, -120, 7, 290); for (let y = -100; y < 160; y += 30) R(ctx, '#1a3010', x, y + (i % 4) * 5, 7, 2); R(ctx, '#508040', x + 7, (i * 37) % 120, 10, 3); }
        } else if (d === 'snow') {
          for (let i = 0; i < 8; i++) { const x = i * 120 - p1; ctx.fillStyle = st.far; ctx.beginPath(); ctx.moveTo(x - 60, 160); ctx.lineTo(x + 30, 40 + hash(i) * 40); ctx.lineTo(x + 120, 160); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 10, 70); ctx.lineTo(x + 30, 40 + hash(i) * 40); ctx.lineTo(x + 50, 70); ctx.fill(); }
          for (let i = 0; i < 6; i++) { const x = i * 130 - p2; R(ctx, '#5a4030', x, 110, 80, 50); ctx.fillStyle = '#f0f8ff'; ctx.beginPath(); ctx.moveTo(x - 10, 112); ctx.lineTo(x + 40, 90); ctx.lineTo(x + 90, 112); ctx.fill(); }
        } else if (d === 'sakura') {
          for (let i = 0; i < 9; i++) { const x = i * 100 - p1; R(ctx, '#4a3028', x + 30, 80, 10, 80); for (let k = 0; k < 7; k++) { ctx.fillStyle = k & 1 ? '#f8b0d0' : '#f090b8'; ctx.beginPath(); ctx.arc(x + 35 + Math.cos(k) * 30, 70 + Math.sin(k * 1.7) * 14, 20, 0, 7); ctx.fill(); } }
        } else if (d === 'harbor') {
          ctx.fillStyle = '#f0f0c0'; ctx.beginPath(); ctx.arc(80 - p1 * 0.1, 40, 16, 0, 7); ctx.fill();
          R(ctx, '#183050', -10, 120, vw + 20, 40);
          for (let i = 0; i < 4; i++) { const x = i * 200 - p1; R(ctx, st.far, x, 90, 120, 30); R(ctx, st.far, x + 50, 20, 4, 70); ctx.fillStyle = '#c0b090'; ctx.beginPath(); ctx.moveTo(x + 54, 24); ctx.lineTo(x + 54, 84); ctx.lineTo(x + 100, 80); ctx.fill(); }
          for (let i = 0; i < 12; i++) R(ctx, '#ffd060', i * 60 - p2 + 10, 150, 6, 8);
        } else if (d === 'castle') {
          for (let i = 0; i < 3; i++) { const x = i * 260 - p1 + 60; R(ctx, '#e0d8c8', x, 70, 90, 90); for (let k = 0; k < 3; k++) { ctx.fillStyle = st.far; ctx.beginPath(); ctx.moveTo(x - 14 + k * 10, 72 - k * 26); ctx.lineTo(x + 45, 50 - k * 26); ctx.lineTo(x + 104 - k * 10, 72 - k * 26); ctx.fill(); R(ctx, '#e0d8c8', x + 10 + k * 10, 50 - k * 26 + 20, 70 - k * 20, 22); } }
          R(ctx, '#605048', -10, 140, vw + 20, 20);
        } else if (d === 'falls') {
          for (let i = 0; i < 3; i++) { const x = i * 240 - p1 + 40; R(ctx, '#304838', x - 40, -120, 60, 280); R(ctx, '#304838', x + 80, -120, 60, 280); R(ctx, '#a0d0f0', x + 20, -120, 60, 280); for (let k = 0; k < 10; k++) R(ctx, '#ffffff', x + 22 + k * 6, ((T * 4 + k * 37) % 280) - 120, 2, 20); }
        } else if (d === 'village') {
          for (let i = 0; i < 7; i++) { const x = i * 110 - p1; R(ctx, '#3a2830', x, 100, 90, 60); ctx.fillStyle = st.far; ctx.beginPath(); ctx.moveTo(x - 10, 102); ctx.lineTo(x + 45, 76); ctx.lineTo(x + 100, 102); ctx.fill(); R(ctx, (T >> 5) % 3 === i % 3 ? '#ffc060' : '#e0a040', x + 20, 120, 14, 12); }
        } else if (d === 'hell') {
          for (let i = 0; i < 12; i++) { const x = i * 60 - p1, hh = 60 + hash(i) * 80; ctx.fillStyle = st.far; ctx.beginPath(); ctx.moveTo(x - 20, 160); ctx.lineTo(x + 10, 160 - hh); ctx.lineTo(x + 40, 160); ctx.fill(); }
          for (let i = 0; i < 20; i++) R(ctx, (T + i) & 8 ? '#ff4010' : '#ffa020', (i * 41 - p2) % (vw + 40), 150 + (i % 4) * 3, 8, 6);
        }
        // the referee
        const rx = STW / 2 - cam - 30 + Math.sin(T * 0.01) * 20, ry = 160;
        R(ctx, '#202020', rx - 4, ry - 26, 8, 18); R(ctx, '#f0c090', rx - 3, ry - 33, 6, 7); R(ctx, '#101010', rx - 4, ry - 36, 8, 4);
        R(ctx, '#202020', rx - 4, ry - 8, 3, 8); R(ctx, '#202020', rx + 1, ry - 8, 3, 8);
        const up1 = ref.flag === 1 || ref.flag === 3 || (rp === 'intro' && rt > 100), up2 = ref.flag === 2 || ref.flag === 3 || (rp === 'intro' && rt > 100);
        R(ctx, '#f0c090', rx - 7, ry - (up1 ? 36 : 22), 2, up1 ? 12 : 8); R(ctx, '#f0f0f0', rx - 13, ry - (up1 ? 42 : 18), 7, 5);
        R(ctx, '#f0c090', rx + 5, ry - (up2 ? 36 : 22), 2, up2 ? 12 : 8); R(ctx, '#e02020', rx + 6, ry - (up2 ? 42 : 18), 7, 5);
        // courier running past
        if (courier) {
          const cx = courier.x - cam, cy = 160, st2 = (courier.t >> 2) & 1;
          R(ctx, '#f0c090', cx - 4, cy - 22, 8, 12); R(ctx, '#3050a0', cx - 4, cy - 12, 8, 4); R(ctx, '#f0c090', cx - 4, cy - 8, 3, 8 - st2 * 3); R(ctx, '#f0c090', cx + 1, cy - 8, 3, 5 + st2 * 3);
          R(ctx, '#f0c090', cx - 3, cy - 29, 6, 7); R(ctx, '#202020', cx - 3, cy - 31, 6, 2);
          R(ctx, '#806030', cx - courier.dir * 12, cy - 26, 26, 2); R(ctx, '#c0a060', cx - courier.dir * 12 - 4, cy - 26, 8, 8); R(ctx, '#c0a060', cx - courier.dir * 12 + 22, cy - 26, 8, 8);
        }
        g = ctx.createLinearGradient(0, 160, 0, H + 60);
        g.addColorStop(0, st.floor[0]); g.addColorStop(1, st.floor[1]);
        ctx.fillStyle = g; ctx.fillRect(-10, 160, vw + 20, H + 80 - 160);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let i = -2; i < 18; i++) { const x0 = i * 48 - (cam % 48); ctx.fillRect(Math.round(x0), 160, 1, H + 60); }
        R(ctx, 'rgba(0,0,0,0.15)', -10, 160, vw + 20, 2);
      }
      function portrait(ctx, c, x, y, sz, flip, dim) {
        const g = ctx.createLinearGradient(0, y, 0, y + sz); g.addColorStop(0, '#301010'); g.addColorStop(1, '#100404');
        ctx.fillStyle = g; ctx.fillRect(x, y, sz, sz);
        drawHead(ctx, c, x + sz / 2, y + sz / 2 + sz * 0.1, sz / 18, flip ? -1 : 1, false);
        R(ctx, c.to === c.sk ? c.sk : c.to, x + sz * 0.2, y + sz * 0.85, sz * 0.6, sz * 0.15);
        if (dim) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, sz, sz); }
        ctx.strokeStyle = '#c0a060'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, sz - 1, sz - 1);
      }
      function drawHud(ctx) {
        const bar = (f, x, flip) => {
          const w = 124, pct = f.hp / f.max, dp = f.dhp / f.max;
          R(ctx, '#000', x - 1, 13, w + 2, 10); R(ctx, '#401010', x, 14, w, 8);
          const dw = Math.round(w * dp), hw = Math.round(w * pct);
          R(ctx, '#e02020', flip ? x + w - dw : x, 14, dw, 8);
          R(ctx, pct < 0.3 ? ((T >> 3) & 1 ? '#ff8020' : '#ffd020') : '#f0e040', flip ? x + w - hw : x, 14, hw, 8);
          R(ctx, 'rgba(255,255,255,0.35)', flip ? x + w - hw : x, 14, hw, 2);
          for (let i = 0; i < f.wins; i++) { R(ctx, '#000', flip ? x + w - 10 - i * 12 : x + i * 12, 25, 10, 8); R(ctx, '#e02020', flip ? x + w - 9 - i * 12 : x + 1 + i * 12, 26, 8, 6); R(ctx, '#fff', flip ? x + w - 7 - i * 12 : x + 3 + i * 12, 28, 4, 2); }
        };
        bar(P, 10, true); bar(E, W - 134, false);
        text(ctx, P.c.name, 10, 3, '#f0e0c0'); text(ctx, E.c.name, W - 10, 3, '#f0e0c0', 1, 'right');
        R(ctx, '#000', W / 2 - 14, 8, 28, 20); R(ctx, '#501010', W / 2 - 13, 9, 26, 18);
        text(ctx, String(timer).padStart(2, '0'), W / 2, 12, timer <= 15 ? '#ff6040' : '#f0e0c0', 2, 'center');
        const pw = (f, x, flip) => {
          R(ctx, '#000', x - 1, H - 12, 66, 8); R(ctx, '#202020', x, H - 11, 64, 6);
          const v = f.rage > 0 ? 64 * f.rage / 480 : 64 * f.pow / 100;
          R(ctx, f.rage > 0 ? ((T >> 2) & 1 ? '#ff2010' : '#ffe040') : '#c03020', flip ? x + 64 - v : x, H - 11, v, 6);
          text(ctx, f.rage > 0 ? 'RAGE' : 'POW', flip ? x - 30 : x + 70, H - 12, f.rage > 0 ? '#ff4020' : '#c0a080');
          if (f.disarmed && (T >> 3) & 1) text(ctx, 'NO WEAPON', flip ? x + 64 : x, H - 22, '#ff8080', 1, flip ? 'right' : undefined);
        };
        pw(P, 10, false); pw(E, W - 74, true);
        if (!demo) text(ctx, String(score).padStart(8, '0'), W / 2, 30, '#c0a080', 1, 'center');
        else text(ctx, 'DEMO PLAY', W / 2, 30, '#c0a080', 1, 'center');
      }
      function drawSparks(ctx) {
        for (const s of sparks) {
          const x = s.x - cam, y = s.y, k = s.t;
          if (s.k === 'block') { R(ctx, '#ffffff', x - 7, y - 1, 14, 2); R(ctx, '#ffffff', x - 1, y - 7, 2, 14); R(ctx, '#ffe040', x - 2, y - 2, 4, 4); }
          else if (s.k === 'cut' || s.k === 'bigcut') {
            const big = s.k === 'bigcut', L = big ? 34 : 20;
            ctx.strokeStyle = k & 2 ? '#ffffff' : '#ff4040'; ctx.lineWidth = big ? 4 : 2;
            ctx.beginPath(); ctx.moveTo(x - L, y - L * 0.6); ctx.lineTo(x + L, y + L * 0.6); ctx.stroke();
            for (let i = 0; i < (big ? 10 : 5); i++) R(ctx, '#c01010', x + (hash(i + s.x) - 0.5) * L * 1.4 + (18 - k) * (hash(i * 3) - 0.5) * 2, y + (hash(i * 7) - 0.3) * 20 + (18 - k) * 1.2, 3, 3);
          } else if (s.k === 'clash') {
            const r = (24 - k) * 2 + 4;
            ctx.fillStyle = k & 2 ? '#ffffff' : '#ffe040';
            for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.fillRect(Math.round(x + Math.cos(a) * r - 2), Math.round(y + Math.sin(a) * r - 2), 4, 4); }
            R(ctx, '#fff', x - 5, y - 5, 10, 10);
          } else if (s.k === 'boom') {
            ctx.fillStyle = k & 2 ? '#ffe040' : '#ff6020'; ctx.beginPath(); ctx.arc(x, y, 6 + (26 - k) * 1.6, 0, 7); ctx.fill();
          } else {
            const r = (s.k === 'big' ? 14 : 9) * (1 - k / 14) + 3;
            ctx.fillStyle = k & 2 ? '#ffffff' : '#ffe040';
            for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + k; ctx.fillRect(Math.round(x + Math.cos(a) * r - 1.5), Math.round(y + Math.sin(a) * r - 1.5), 3, 3); }
          }
        }
      }
      function renderFight(ctx) {
        ctx.save();
        ctx.translate(shake ? (((shake >> 1) & 1) ? 2 : -2) : 0, GY * (1 - zoom));
        ctx.scale(zoom, zoom);
        drawStage(ctx);
        for (const w of wpns) {
          const x = w.x - cam, y = GY - w.y - 3;
          ctx.save(); ctx.translate(x, y); ctx.rotate(w.land ? 0 : w.rot);
          if (w.owner.c.wp === 'kanabo') R(ctx, '#3a2a20', -18, -3, 36, 6); else if (w.owner.c.wp === 'orb') { R(ctx, '#a020ff', -5, -5, 10, 10); } else { R(ctx, '#402018', -16, -1, 8, 3); R(ctx, '#d0b040', -8, -2, 3, 5); R(ctx, '#d8e0e8', -5, -1, Math.max(10, w.owner.c.rch * 0.8), 2); }
          ctx.restore();
        }
        for (const it of items) {
          const x = it.x - cam, y = GY - it.y;
          if (it.k === 'bomb') { ctx.fillStyle = '#202020'; ctx.beginPath(); ctx.arc(x, y - 6, 6, 0, 7); ctx.fill(); R(ctx, '#806040', x + 2, y - 15, 2, 4); if (it.land && (it.fuse & 4)) R(ctx, '#ffe040', x + 1, y - 18, 4, 4); }
          else if (it.k === 'food') { R(ctx, '#f0f0e0', x - 8, y - 6, 4, 3); R(ctx, '#c06030', x - 5, y - 10, 12, 9); R(ctx, '#e08050', x - 3, y - 9, 5, 3); }
          else { R(ctx, '#c0a040', x - 6, y - 10, 12, 10); R(ctx, '#806020', x - 6, y - 12, 12, 3); R(ctx, '#ffe060', x - 2, y - 7, 4, 4); }
        }
        const order = (P.st === 'attack' || P.st === 'special') ? [E, P] : [P, E];
        for (const f of order) drawFighter(ctx, f, cam);
        for (const p of projs) drawProj(ctx, p, cam);
        drawSparks(ctx);
        ctx.restore();
        for (const p of petals) R(ctx, stageIdx === 8 ? '#ff6020' : stageIdx === 2 ? '#ffffff' : '#f8b0d0', p.x, p.y, 2, 2);
        if (cutFlash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (cutFlash / 16) + ')'; ctx.fillRect(0, 0, W, H); }
        drawHud(ctx);
        for (const m of msgs) {
          if (m.fixed) textS(ctx, m.s, m.x, m.y, m.c, m.big ? 3 : 1, 'center');
          else textS(ctx, m.s, (m.x - cam) * zoom, GY - (GY - m.y) * zoom, m.c, 1, 'center');
        }
        if (mash) {
          textS(ctx, 'MASH THE BUTTONS!', W / 2, 96, (T >> 2) & 1 ? '#ffe040' : '#ffffff', 1, 'center');
          R(ctx, '#000', W / 2 - 61, 108, 122, 8);
          const tot = Math.max(1, mash.p + mash.e), pw = 120 * mash.p / tot;
          R(ctx, '#4080ff', W / 2 - 60, 109, pw, 6); R(ctx, '#ff4040', W / 2 - 60 + pw, 109, 120 - pw, 6);
        }
        if (rp === 'intro' && rt < 70) textS(ctx, 'ROUND ' + round, W / 2, 80, '#f0e0c0', 3, 'center');
        if (rp === 'ko' && rt > 90) {
          const w = P.hp > 0 ? P : E.hp > 0 ? E : null;
          if (w) { textS(ctx, w.c.name + ' WINS', W / 2, 110, '#f0e0c0', 2, 'center'); if (rt > 110) text(ctx, '"' + w.c.quote + '"', W / 2, 132, '#ffffff', 1, 'center'); }
          else textS(ctx, 'DRAW', W / 2, 110, '#f0e0c0', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#200404'); g.addColorStop(0.7, '#801010'); g.addColorStop(1, '#100202');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#e02818'; ctx.beginPath(); ctx.arc(W / 2, 78, 50, 0, 7); ctx.fill();
        // brush-stroke style title
        textS(ctx, 'SAMURAI', W / 2 + 2, 46, '#100000', 4, 'center');
        textS(ctx, 'SAMURAI', W / 2, 44, '#f0e0c0', 4, 'center');
        textS(ctx, 'SHODOWN', W / 2 + 2, 84, '#100000', 4, 'center');
        textS(ctx, 'SHODOWN', W / 2, 82, '#f0e0c0', 4, 'center');
        R(ctx, '#f0e0c0', W / 2 - 100, 118, 200, 2);
        // silhouettes facing off
        ctx.fillStyle = '#000';
        R(ctx, '#000', 60, 150, 14, 40); R(ctx, '#000', 58, 140, 12, 12); seg(ctx, 74, 160, 112, 128, 2, '#d8e0e8');
        R(ctx, '#000', 246, 150, 14, 40); R(ctx, '#000', 250, 140, 12, 12); seg(ctx, 246, 160, 208, 128, 2, '#d8e0e8');
        R(ctx, '#000', 0, 190, W, 34);
        for (const p of petals) R(ctx, '#f8b0d0', p.x, p.y, 2, 2);
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 160, '#fff', 1, 'center'); }
        else if ((T >> 4) & 1) textS(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 160, api.credits > 0 ? '#ffe040' : '#fff', 1, 'center');
        text(ctx, '\u00a9 1993 SNK', W / 2, 200, '#c0a080', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, H - 10, '#aaa', 1, 'right');
        text(ctx, 'HI ' + hi, 4, H - 10, '#aaa');
      }
      function renderSelect(ctx) {
        R(ctx, '#180404', 0, 0, W, H);
        textS(ctx, 'SELECT YOUR WARRIOR', W / 2, 8, '#f0e0c0', 2, 'center');
        CH.forEach((c, i) => {
          const x = 24 + (i % 4) * 70, y = 30 + Math.floor(i / 4) * 62, sel = i === selIdx;
          R(ctx, sel ? ((T >> 3) & 1 ? '#ffe040' : '#e02020') : '#402010', x - 2, y - 2, 56, 56);
          portrait(ctx, c, x, y, 52, false, !sel);
          text(ctx, c.name, x + 26, y + 55, sel ? '#ffe040' : '#c0a080', 1, 'center');
        });
        const c = CH[selIdx];
        R(ctx, '#000', 0, 158, W, 66);
        const f = mkF(c, 60, 1, false, 0); f.anim = T; drawFighter(ctx, f, 0);
        text(ctx, c.name + ' - ' + c.land, 110, 170, '#ffe040');
        text(ctx, 'WEAPON: ' + c.wp.toUpperCase(), 110, 182, '#f0e0c0');
        const a = ARCH[c.arch], mv = [];
        for (const k in a) mv.push((k[0] === 's' ? 'S' : 'K') + ' ' + k.slice(1).toUpperCase());
        text(ctx, 'SPECIALS: ' + mv.join('  '), 110, 194, '#a08060');
        text(ctx, 'ARROWS: CHOOSE  SPACE: DECIDE', 110, 210, '#806040');
      }
      function renderVs(ctx) {
        R(ctx, '#100202', 0, 0, W, H);
        const ec = charOf(ladder[lpos]);
        const sl = Math.min(1, mt / 30);
        portrait(ctx, CH[pChar], -80 + 120 * sl, 50, 80, false, false);
        portrait(ctx, ec, W + 0 - 120 * sl, 50, 80, true, false);
        text(ctx, CH[pChar].name, 80, 136, '#f0e0c0', 1, 'center'); text(ctx, ec.name, W - 80, 136, '#f0e0c0', 1, 'center');
        textS(ctx, 'VS', W / 2, 80, (T >> 2) & 1 ? '#ffe040' : '#e02020', 4, 'center');
        if (mt > 50) text(ctx, '"' + ec.quote + '"', W / 2, 168, '#ffffff', 1, 'center');
        text(ctx, 'BATTLE ' + (lpos + 1) + ' - ' + ec.land, W / 2, 190, '#c0a080', 1, 'center');
        if (ec.boss) textS(ctx, 'FINAL BATTLE', W / 2, 20, '#ff4040', 2, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        if (mode === 'select') { renderSelect(ctx); return; }
        if (mode === 'vs') { renderVs(ctx); return; }
        if (mode === 'fight' || mode === 'lose') {
          renderFight(ctx);
          if (demo) { if ((T >> 4) & 1) textS(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 150, '#ffe040', 1, 'center'); textS(ctx, 'SAMURAI SHODOWN', W / 2, 46, '#f0e0c0', 1, 'center'); }
          return;
        }
        if (mode === 'matchwin') {
          renderFight(ctx);
          R(ctx, 'rgba(0,0,0,0.6)', 0, 70, W, 64);
          textS(ctx, 'VICTORY', W / 2, 80, '#ffe040', 3, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 112, '#f0e0c0', 1, 'center');
          return;
        }
        if (mode === 'ending') {
          R(ctx, '#100202', 0, 0, W, H);
          ctx.fillStyle = '#e02818'; ctx.beginPath(); ctx.arc(W / 2, 70, 40, 0, 7); ctx.fill();
          textS(ctx, 'THE DARK LORD IS SLAIN', W / 2, 26, '#f0e0c0', 1, 'center');
          const f = mkF(CH[pChar], W / 2, 1, false, 0); f.st = 'win'; drawFighter(ctx, f, 0);
          text(ctx, CH[pChar].name + ' WALKS ON,', W / 2, 150, '#fff', 1, 'center');
          text(ctx, 'SEEKING A WORTHIER FOE.', W / 2, 162, '#fff', 1, 'center');
          text(ctx, 'FINAL SCORE ' + score, W / 2, 196, '#c0a080', 1, 'center');
          for (const p of petals) R(ctx, '#f8b0d0', p.x, p.y, 2, 2);
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
