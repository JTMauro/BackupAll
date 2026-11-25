// Double Dragon (Technos, 1987) - from-scratch recreation for the MAME32 Game Room.
// Billy Lee fights through the city slum, the factory, the forest and the Black Warriors' hideout to rescue Marian.
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

  // ---------- procedural pixel-limb fighter renderer ----------
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
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    const h = w / 2;
    for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(x0 + dx * t - h), Math.round(y0 + dy * t - h), w, w); }
  }
  // P: {lean, ra:[upper,fore], la, rl:[thigh,shin], ll}; angles in degrees from straight down (+ = forward); lean from up.
  function drawMan(ctx, x, y, f, P, C, s) {
    const LT = 9 * s, LS = 9 * s, TT = 12 * s, UA = 7 * s, FA = 7 * s;
    const cs = a => Math.cos(a * D2R), sn = a => Math.sin(a * D2R);
    const legH = L => cs(L[0]) * LT + cs(L[1]) * LS;
    const hy = y - Math.max(legH(P.rl), legH(P.ll), 2 * s);
    const hx = x;
    const lean = P.lean || 0;
    const nx = hx + sn(lean) * TT * f, ny = hy - cs(lean) * TT;
    const shx = hx + sn(lean) * TT * 0.85 * f, shy = hy - cs(lean) * TT * 0.85;
    const lw = Math.max(3, Math.round(4 * s)), aw = Math.max(2, Math.round(3 * s)), tw = Math.round(7 * s);
    function leg(L, dark) {
      const kx = hx + sn(L[0]) * LT * f, ky = hy + cs(L[0]) * LT;
      const fx = kx + sn(L[1]) * LS * f, fy = ky + cs(L[1]) * LS;
      const pc = dark ? shade(C.pants, 0.7) : C.pants;
      seg(ctx, hx, hy, kx, ky, lw, pc); seg(ctx, kx, ky, fx, fy, lw, pc);
      ctx.fillStyle = dark ? shade(C.shoes, 0.7) : C.shoes;
      ctx.fillRect(Math.round(fx - 2 * s + (f > 0 ? 1 : -1) * s), Math.round(fy - 2 * s), Math.round(5 * s), Math.round(3 * s));
    }
    function arm(A, dark) {
      const ex = shx + sn(A[0]) * UA * f, ey = shy + cs(A[0]) * UA;
      const wx = ex + sn(A[1]) * FA * f, wy = ey + cs(A[1]) * FA;
      const sl = C.sleeve || C.skin;
      seg(ctx, shx, shy, ex, ey, aw, dark ? shade(sl, 0.75) : sl);
      seg(ctx, ex, ey, wx, wy, aw, dark ? shade(C.skin, 0.75) : C.skin);
      ctx.fillStyle = dark ? shade(C.skin, 0.75) : C.skin;
      ctx.fillRect(Math.round(wx - 1.5 * s), Math.round(wy - 1.5 * s), Math.round(3 * s), Math.round(3 * s));
      return { x: wx, y: wy, a: A[1], ex, ey };
    }
    const backHand = arm(P.la, true);
    leg(P.ll, true);
    seg(ctx, hx, hy, nx, ny, tw, C.top);
    if (C.belt) seg(ctx, hx, hy, hx + sn(lean) * 2 * s * f, hy - cs(lean) * 2 * s, tw, C.belt);
    leg(P.rl, false);
    // head
    const hcx = hx + sn(lean) * (TT + 4 * s) * f, hcy = hy - cs(lean) * (TT + 4 * s);
    const hw = Math.round(6 * s), hh = Math.round(7 * s);
    const X0 = Math.round(hcx - hw / 2), Y0 = Math.round(hcy - hh / 2);
    ctx.fillStyle = C.skin; ctx.fillRect(X0, Y0, hw, hh);
    ctx.fillStyle = C.hair;
    if (C.hood) { ctx.fillRect(X0, Y0, hw, hh); ctx.fillStyle = C.skin; ctx.fillRect(f > 0 ? X0 + hw - Math.round(3 * s) : X0, Y0 + Math.round(2 * s), Math.round(3 * s), Math.round(2 * s)); }
    else {
      ctx.fillRect(X0, Y0, hw, Math.round(2 * s));
      ctx.fillRect(f > 0 ? X0 : X0 + hw - Math.round(2 * s), Y0, Math.round(2 * s), Math.round(5 * s));
      if (C.long) ctx.fillRect(f > 0 ? X0 - Math.round(2 * s) : X0 + hw, Y0 + 1, Math.round(2 * s), Math.round(9 * s));
      if (C.mohawk) ctx.fillRect(X0 + Math.round(2 * s), Y0 - Math.round(2 * s), Math.round(2 * s), Math.round(3 * s));
      ctx.fillStyle = '#000'; ctx.fillRect(f > 0 ? X0 + hw - Math.round(2 * s) : X0 + Math.round(s), Y0 + Math.round(3 * s), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
    }
    if (C.band) { ctx.fillStyle = C.band; ctx.fillRect(X0, Y0 + Math.round(2 * s), hw, Math.max(1, Math.round(s))); }
    const front = arm(P.ra, false);
    return { front, back: backHand, head: { x: hcx, y: hcy } };
  }
  const POSE = {
    stand: { lean: 4, ra: [25, 150], la: [-5, 135], rl: [12, -4], ll: [-12, 4] },
    stand2: { lean: 6, ra: [28, 155], la: [-2, 140], rl: [13, -2], ll: [-11, 5] },
    walk0: { lean: 8, ra: [35, 140], la: [-25, 100], rl: [28, 2], ll: [-22, -12] },
    walk1: { lean: 8, ra: [15, 130], la: [-5, 120], rl: [6, -8], ll: [-6, -18] },
    walk2: { lean: 8, ra: [-10, 110], la: [25, 140], rl: [-22, -12], ll: [28, 2] },
    punchW: { lean: 0, ra: [-20, 130], la: [10, 150], rl: [15, 0], ll: [-15, 0] },
    punch: { lean: 14, ra: [88, 90], la: [-25, 100], rl: [24, 0], ll: [-22, -6] },
    kickW: { lean: -4, ra: [30, 150], la: [-20, 120], rl: [70, -30], ll: [-4, -4] },
    kick: { lean: -24, ra: [30, 160], la: [-50, 40], rl: [96, 92], ll: [-6, -6] },
    elbowW: { lean: 4, ra: [20, 150], la: [-10, 130], rl: [10, 0], ll: [-12, 0] },
    elbow: { lean: -6, ra: [40, 150], la: [-100, -30], rl: [16, 0], ll: [-20, -4] },
    knee: { lean: 18, ra: [70, 120], la: [60, 110], rl: [96, 8], ll: [-8, -4] },
    grab: { lean: 12, ra: [70, 125], la: [60, 115], rl: [16, 0], ll: [-16, 0] },
    throwW: { lean: 30, ra: [100, 160], la: [90, 150], rl: [20, 0], ll: [-20, 0] },
    throw: { lean: -20, ra: [-160, -170], la: [-150, -160], rl: [20, 0], ll: [-25, -5] },
    swingW: { lean: -6, ra: [-160, -175], la: [-20, 100], rl: [14, 0], ll: [-16, -2] },
    swing: { lean: 16, ra: [80, 95], la: [-25, 100], rl: [26, 0], ll: [-22, -6] },
    jump: { lean: 6, ra: [60, 160], la: [30, 150], rl: [70, -25], ll: [40, -45] },
    jumpkick: { lean: -18, ra: [40, 160], la: [-60, 30], rl: [96, 94], ll: [30, -60] },
    hit: { lean: -26, ra: [-25, 40], la: [-45, 30], rl: [12, 0], ll: [-16, 0] },
    bent: { lean: 72, ra: [25, 10], la: [15, 0], rl: [16, 0], ll: [-10, 0] },
    fall: { lean: -62, ra: [-120, -140], la: [-100, -150], rl: [60, 40], ll: [40, 30] },
    down: { lean: -90, ra: [-100, -80], la: [-95, -85], rl: [88, 92], ll: [86, 90] },
    getup: { lean: -20, ra: [-30, 0], la: [-40, -10], rl: [80, 92], ll: [70, 100] },
    aim: { lean: 4, ra: [80, 88], la: [60, 85], rl: [14, 0], ll: [-14, 0] },
    cheer: { lean: 0, ra: [-160, -170], la: [-150, -175], rl: [10, 0], ll: [-10, 0] }
  };

  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }

  const W = 256, H = 240, YMIN = 166, YMAX = 228, HUD = 34;

  const PAL = {
    billy: { skin: '#f4b884', hair: '#6a3a14', top: '#2f5fe8', sleeve: '#f4b884', pants: '#2f5fe8', shoes: '#5a3010', belt: '#203070' },
    williams: { skin: '#f0b080', hair: '#181818', top: '#e8e8e8', pants: '#3050a8', shoes: '#202020', belt: '#6a4820' },
    roper: { skin: '#c88a58', hair: '#2a1408', top: '#c03020', sleeve: '#c88a58', pants: '#506070', shoes: '#202020', belt: '#202020' },
    linda: { skin: '#f4c094', hair: '#c02080', top: '#e02868', pants: '#1c1c28', shoes: '#c02080', long: true, belt: '#000' },
    abobo: { skin: '#9a5a2c', hair: '#9a5a2c', top: '#9a5a2c', pants: '#3e6020', shoes: '#2a1a10', belt: '#202020', mohawk: true },
    jeff: { skin: '#f4b884', hair: '#3a2008', top: '#d09020', sleeve: '#f4b884', pants: '#d09020', shoes: '#5a3010', belt: '#704000' },
    willy: { skin: '#e8b088', hair: '#d8d8d8', top: '#383838', pants: '#383838', shoes: '#101010', belt: '#801010' },
    marian: { skin: '#f8c8a0', hair: '#e8c040', top: '#f0f0f0', pants: '#e04040', shoes: '#e04040', long: true }
  };
  const TYPES = {
    williams: { hp: 10, sp: 0.85, sc: 1, reach: 22, pow: 1, pts: 500, grab: true },
    roper: { hp: 12, sp: 0.8, sc: 1.05, reach: 22, pow: 1, pts: 600, grab: true },
    linda: { hp: 8, sp: 1.05, sc: 0.95, reach: 22, pow: 1, pts: 500, grab: true },
    abobo: { hp: 30, sp: 0.6, sc: 1.38, reach: 28, pow: 1.6, pts: 2000, grab: false, boss: true },
    jeff: { hp: 26, sp: 1.1, sc: 1, reach: 24, pow: 1.3, pts: 3000, grab: false, boss: true },
    willy: { hp: 34, sp: 0.6, sc: 1.08, reach: 22, pow: 1.4, pts: 10000, grab: false, boss: true }
  };
  // move table: wind-up, active, recovery frames; reach; damage
  const MOVES = {
    punch: { w: 3, a: 4, r: 7, reach: 20, dmg: 1, pose: 'punch', wpose: 'punchW' },
    punch2: { w: 3, a: 4, r: 8, reach: 20, dmg: 1, pose: 'punch', wpose: 'punchW' },
    kick: { w: 6, a: 5, r: 10, reach: 27, dmg: 2, pose: 'kick', wpose: 'kickW' },
    elbow: { w: 3, a: 5, r: 10, reach: 22, dmg: 3, back: true, pose: 'elbow', wpose: 'elbowW' },
    knee: { w: 4, a: 3, r: 7, reach: 18, dmg: 2, pose: 'knee', wpose: 'grab' },
    bat: { w: 8, a: 5, r: 12, reach: 32, dmg: 3, kd: true, pose: 'swing', wpose: 'swingW' },
    whip: { w: 9, a: 6, r: 12, reach: 44, dmg: 3, pose: 'swing', wpose: 'swingW' },
    toss: { w: 10, a: 1, r: 10, reach: 0, dmg: 0, pose: 'throw', wpose: 'throwW', toss: true },
    eshot: { w: 16, a: 1, r: 22, reach: 0, dmg: 0, pose: 'aim', wpose: 'aim', gun: true }
  };
  const THROWN = { knife: { sp: 3.4, dmg: 4, arc: false }, barrel: { sp: 2.4, dmg: 5, arc: true, roll: true }, box: { sp: 2.4, dmg: 5, arc: true }, dynamite: { sp: 2.0, dmg: 6, arc: true, boom: true } };

  const MISSIONS = [
    {
      name: 'CITY SLUM', bg: 'slum', len: 1180, items: [{ k: 'bat', x: 340, y: 200 }, { k: 'barrel', x: 640, y: 180 }],
      waves: [{ at: 0, list: ['williams', 'williams'] }, { at: 230, list: ['roper:barrel', 'linda:whip'] }, { at: 470, list: ['williams:bat', 'linda', 'williams'] },
      { at: 700, list: ['roper:box', 'williams', 'linda:whip'] }, { at: 924, list: ['abobo', 'williams:bat'], boss: true }]
    },
    {
      name: 'FACTORY', bg: 'factory', len: 1240, conveyor: [380, 640], items: [{ k: 'box', x: 300, y: 190 }, { k: 'dynamite', x: 820, y: 205 }],
      waves: [{ at: 0, list: ['linda:whip', 'williams'] }, { at: 260, list: ['roper:dynamite', 'williams:knife', 'linda'] },
      { at: 520, list: ['abobo', 'linda:whip'] }, { at: 760, list: ['williams:bat', 'roper:barrel', 'williams:knife'] }, { at: 984, list: ['abobo', 'abobo', 'linda:whip'], boss: true }]
    },
    {
      name: 'FOREST', bg: 'forest', len: 1300, items: [{ k: 'knife', x: 380, y: 210 }, { k: 'bat', x: 760, y: 185 }],
      waves: [{ at: 0, list: ['williams:knife', 'roper'] }, { at: 270, list: ['linda:whip', 'linda', 'williams:bat'] },
      { at: 540, list: ['abobo', 'roper:dynamite'] }, { at: 800, list: ['williams:knife', 'linda:whip', 'roper:box', 'williams'] }, { at: 1044, list: ['jeff', 'abobo', 'linda:whip'], boss: true }]
    },
    {
      name: 'HIDEOUT', bg: 'hideout', len: 1360, items: [{ k: 'dynamite', x: 420, y: 190 }, { k: 'bat', x: 900, y: 210 }],
      waves: [{ at: 0, list: ['williams:knife', 'linda:whip', 'roper'] }, { at: 280, list: ['abobo', 'williams:bat'] },
      { at: 560, list: ['jeff', 'linda:whip'] }, { at: 830, list: ['roper:dynamite', 'williams:knife', 'abobo'] }, { at: 1104, list: ['willy:gun', 'abobo', 'linda:whip'], boss: true }]
    }
  ];

  ArcadeRegistry.register({
    id: 'doubledragon', title: 'Double Dragon', year: 1987, maker: 'Technos',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk \u00b7 Space: punch/pick up \u00b7 X: kick (back+X: elbow) \u00b7 Space+X or Z: jump \u00b7 walk into a dazed foe: grab (Space knee, X throw) \u00b7 Enter: start',
    marquee: { bg: '#100808', fg: '#ffcc22', accent: '#e02020' },
    create(api) {
      const A = api.audio;
      const sfx = {
        swish() { A.noise(0.05, { vol: 0.08, freq: 3000, type: 'highpass' }); },
        hit() { A.noise(0.08, { vol: 0.22, freq: 1400 }); A.tone(150, 0.07, { type: 'square', vol: 0.1, slideTo: 70 }); },
        heavy() { A.noise(0.14, { vol: 0.25, freq: 900 }); A.tone(110, 0.12, { type: 'square', vol: 0.12, slideTo: 50 }); },
        thud() { A.noise(0.2, { vol: 0.22, freq: 300, slideTo: 80 }); },
        pick() { A.tone(880, 0.05, { type: 'square', vol: 0.1 }); A.tone(1320, 0.06, { type: 'square', vol: 0.1, delay: 0.05 }); },
        gun() { A.noise(0.06, { vol: 0.2, freq: 4000 }); },
        boom() { A.noise(0.6, { vol: 0.3, freq: 1200, slideTo: 60 }); },
        die() { A.melody([[392, 0.12], [330, 0.12], [262, 0.12], [196, 0.3]], { type: 'square', vol: 0.13 }); },
        extend() { A.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.14]], { type: 'square', vol: 0.12 }); },
        start() { A.melody([[220, 0.12], [262, 0.12], [330, 0.12], [294, 0.12], [262, 0.12], [330, 0.24], [392, 0.36]], { type: 'square', vol: 0.12 }); A.melody([[110, 0.36], [131, 0.36], [165, 0.36], [196, 0.36]], { type: 'triangle', vol: 0.15 }); },
        clear() { A.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.2], [659, 0.1], [784, 0.4]], { type: 'square', vol: 0.13 }); },
        over() { A.melody([[330, 0.25], [294, 0.25], [262, 0.25], [247, 0.25], [220, 0.6]], { type: 'triangle', vol: 0.16 }); }
      };
      let hi = api.getHiScore(50000);
      let mode = 'attract', T = 0, coinFlash = 0, lastCred = api.credits;
      let score = 0, lives = 3, mi = 0, loop = 0, timer = 0, nextExtend = 30000;
      let P = null, ents = [], items = [], shots = [], fx = [], camX = 0, lock = false, wi = 0, spawnQ = [], spawnT = 0, goT = 0;
      let phase = 'play', phaseT = 0, musicT = 0;

      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function addScore(n) {
        score += n;
        if (score >= nextExtend) { lives++; nextExtend += 50000; sfx.extend(); fx.push({ k: 'txt', s: 'EXTEND!', x: P.x, y: P.y - 60, t: 90, c: '#ffe040' }); }
        if (score > hi) hi = score;
      }
      function mkBody(type, x, y, face) {
        const T0 = TYPES[type] || { hp: 30, sp: 1.3, sc: 1, reach: 22, pow: 1 };
        const hpBoost = type === 'billy' ? 0 : loop * 4 + mi;
        return {
          type, x, y, z: 0, vx: 0, vz: 0, face: face || 1, hp: (T0.hp || 30) + hpBoost, maxhp: (T0.hp || 30) + hpBoost, state: 'idle', t: 0, anim: 0,
          combo: 0, comboT: 0, weapon: null, move: null, hitSet: null, inv: 0, cd: 60, sc: T0.sc || 1, def: T0, pal: PAL[type],
          slot: Math.random(), oy: (Math.random() - 0.5) * 30, isP: type === 'billy', kneeN: 0, flying: false, pend: 0, engaged: false
        };
      }
      function newGame() {
        score = 0; lives = 3; mi = 0; loop = 0; nextExtend = 30000;
        startMission(true);
        mode = 'game';
      }
      function startMission(first) {
        const m = MISSIONS[mi];
        P = mkBody('billy', 40, 200, 1); P.hp = P.maxhp = 30; P.inv = 60;
        P.bufA = P.bufB = -1;
        ents = []; shots = []; fx = [];
        items = m.items.map(it => ({ k: it.k, x: it.x, y: it.y, z: 0, vx: 0, vz: 0 }));
        camX = 0; lock = false; wi = 0; spawnQ = []; goT = 0;
        timer = 200; phase = 'intro'; phaseT = 0;
        if (!first) { }
        sfx.start();
      }
      // ---------- waves ----------
      function triggerWave() {
        const wv = MISSIONS[mi].waves[wi];
        lock = true; camX = wv.at;
        spawnQ = wv.list.slice(); spawnT = 10;
      }
      function spawnOne(spec) {
        const [type, wpn] = spec.split(':');
        const side = (ents.length + spawnQ.length) % 2 === 0 ? 1 : -1;
        let x = side > 0 ? camX + W + 16 : camX - 16;
        if (camX < 4 && side < 0) x = camX + W + 30;
        const e = mkBody(type, x, YMIN + 6 + Math.random() * (YMAX - YMIN - 12), x > P.x ? -1 : 1);
        if (wpn) e.weapon = wpn;
        if (type === 'willy') e.weapon = 'gun';
        e.cd = 40 + Math.random() * 40;
        ents.push(e);
      }
      // ---------- combat ----------
      function canBeHit(t) { return t.state !== 'fall' && t.state !== 'down' && t.state !== 'dead' && t.state !== 'getup' && !(t.isP && t.inv > 0) && t.state !== 'grabbed'; }
      function dropWeapon(t) {
        if (t.weapon && t.weapon !== 'gun') { items.push({ k: t.weapon, x: t.x, y: t.y, z: 10, vx: -t.face * 0.8, vz: 1.5 }); }
        t.weapon = null;
      }
      function knockdown(t, dir, sp) {
        if (t.state === 'grabbed' && P && P.grab === t) { P.grab = null; P.state = 'idle'; }
        t.state = 'fall'; t.vx = dir * (sp || 1.6); t.vz = 2.6; t.z = Math.max(t.z, 1); t.combo = 0; t.face = -dir;
        dropWeapon(t);
      }
      function applyHit(t, dmg, dir, kd, src) {
        if (t.grab) { if (t.grab.state === 'grabbed') { t.grab.state = 'hit'; t.grab.t = 10; } t.grab = null; }
        if (t.state === 'jump' || t.state === 'ejump') kd = true;
        t.hp -= dmg;
        if (!t.isP) addScore(dmg >= 3 ? 200 : 100);
        fx.push({ k: 'spark', x: t.x - dir * 4, y: t.y, z: t.z + 26 * t.sc, t: 8 });
        if (dmg >= 3) sfx.heavy(); else sfx.hit();
        if (t.hp <= 0) { t.hp = 0; knockdown(t, dir, 2); return; }
        if (kd) { knockdown(t, dir, 1.8); return; }
        t.combo++; t.comboT = 45;
        if (t.def.boss && t.combo >= 4) { knockdown(t, dir, 1.4); return; }
        if (!t.def.boss && t.combo >= 3 && src !== 'punch') { knockdown(t, dir, 1.6); return; }
        if (!t.isP && t.def.grab && t.combo >= 2 && src === 'punch') { t.state = 'bent'; t.t = 70; t.x += dir * 2; if (t.combo >= 4) knockdown(t, dir, 1.6); return; }
        if (t.isP && t.combo >= 3) { knockdown(t, dir, 1.6); return; }
        t.state = 'hit'; t.t = t.def.boss ? 8 : 14; t.x += dir * 3; t.move = null;
        if (t.weapon && !t.isP && Math.random() < 0.35) dropWeapon(t);
        if (t.isP && t.weapon && Math.random() < 0.5) dropWeapon(t);
      }
      function startMove(a, mv) {
        a.state = 'att'; a.move = mv; a.t = 0; a.hitSet = [];
        sfx.swish();
      }
      function targetsOf(a) { return a.isP ? ents : (P.state === 'dead' ? [] : [P]); }
      function stepAttack(a) {
        const M = MOVES[a.move]; a.t++;
        if (a.t === M.w + 1 && M.toss) {
          const k = a.weapon; const d = THROWN[k];
          if (d) shots.push({ k, x: a.x + a.face * 10, y: a.y, z: 30 * a.sc, vx: a.face * d.sp, vz: d.arc ? 2.2 : 0, from: a.isP ? 'p' : 'e', t: 0, fuse: 70 });
          a.weapon = null;
        }
        if (a.t === M.w + 1 && M.gun) {
          for (let i = 0; i < 3; i++) shots.push({ k: 'bullet', x: a.x + a.face * 18, y: a.y, z: 30 * a.sc, vx: a.face * 4.5, vz: 0, from: 'e', t: -i * 6, fuse: 0 });
          sfx.gun(); A.noise(0.06, { vol: 0.2, freq: 4000, delay: 0.1 }); A.noise(0.06, { vol: 0.2, freq: 4000, delay: 0.2 });
        }
        if (a.t > M.w && a.t <= M.w + M.a && M.reach > 0) {
          const f = M.back ? -a.face : a.face;
          for (const t of targetsOf(a)) {
            if (t === a || a.hitSet.includes(t) || !canBeHit(t)) continue;
            const dx = (t.x - a.x) * f, dy = Math.abs(t.y - a.y), dz = Math.abs(t.z - a.z);
            if (dx > 0 && dx < M.reach * a.sc + 6 * t.sc && dy < 8 && dz < 22) {
              a.hitSet.push(t);
              const dmg = Math.round(M.dmg * (a.isP ? 1 : a.def.pow) + (a.isP ? 0 : 1));
              applyHit(t, dmg, f, M.kd, a.move === 'punch' || a.move === 'punch2' ? 'punch' : 'other');
            }
          }
        }
        if (a.t >= M.w + M.a + M.r) { a.state = 'idle'; a.move = null; a.t = 0; }
      }
      // generic involuntary states; returns true if body is busy
      function stepBody(e) {
        if (e.comboT > 0 && --e.comboT === 0) e.combo = 0;
        switch (e.state) {
          case 'hit': if (--e.t <= 0) e.state = 'idle'; return true;
          case 'bent': if (--e.t <= 0) { e.state = 'idle'; e.combo = 0; } return true;
          case 'grabbed': if (!P || P.grab !== e) e.state = 'idle'; return true;
          case 'fall': {
            e.x += e.vx; e.z += e.vz; e.vz -= 0.22;
            e.y = Math.max(YMIN, Math.min(YMAX, e.y));
            if (e.flying) {
              for (const o of ents) if (o !== e && canBeHit(o) && Math.abs(o.x - e.x) < 14 && Math.abs(o.y - e.y) < 8) { applyHit(o, 3, Math.sign(e.vx) || 1, true, 'other'); }
            }
            if (e.z <= 0) {
              e.z = 0; e.vx = 0; e.state = 'down'; e.t = e.hp <= 0 ? 40 : 46; e.flying = false; sfx.thud();
              if (e.pend) { e.hp -= e.pend; e.pend = 0; if (e.hp < 0) e.hp = 0; }
            }
            return true;
          }
          case 'down': if (--e.t <= 0) { if (e.hp <= 0) { e.state = 'dead'; e.t = 60; } else { e.state = 'getup'; e.t = 16; } } return true;
          case 'getup': if (--e.t <= 0) { e.state = 'idle'; e.combo = 0; if (e.isP) e.inv = 40; else e.cd = 30; } return true;
          case 'dead': e.t--; return true;
          case 'att': stepAttack(e); return true;
        }
        return false;
      }
      // ---------- player ----------
      function nearItem(p) {
        let best = null, bd = 1e9;
        for (const it of items) { if (it.z > 2) continue; const d = Math.abs(it.x - p.x) + Math.abs(it.y - p.y) * 1.5; if (Math.abs(it.x - p.x) < 16 && Math.abs(it.y - p.y) < 9 && d < bd) { bd = d; best = it; } }
        return best;
      }
      function doA(p) {
        if (!p.weapon) {
          const it = nearItem(p);
          if (it) { items.splice(items.indexOf(it), 1); p.weapon = it.k; sfx.pick(); p.state = 'hit'; p.t = 6; return; }
        }
        if (p.weapon === 'bat' || p.weapon === 'whip') { startMove(p, p.weapon); return; }
        if (p.weapon) { startMove(p, 'toss'); return; }
        p.pc = (p.pcT > 0 ? (p.pc || 0) + 1 : 0); p.pcT = 30;
        startMove(p, p.pc % 2 ? 'punch2' : 'punch');
      }
      function doB(p, lx) {
        if (lx !== 0 && lx !== p.face) startMove(p, 'elbow');
        else startMove(p, 'kick');
      }
      function updPlayer() {
        const p = P;
        if (p.inv > 0) p.inv--;
        if (p.pcT > 0) p.pcT--;
        if (p.bufA >= 0) p.bufA++;
        if (p.bufB >= 0) p.bufB++;
        if (api.pressed('Space')) p.bufA = 0;
        if (api.pressed('KeyX')) p.bufB = 0;
        if (p.bufA > 12) p.bufA = -1;
        if (p.bufB > 12) p.bufB = -1;
        const lx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const ly = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        if (p.state === 'grab') {
          const e = p.grab;
          if (!e || e.state !== 'grabbed') { p.state = 'idle'; p.grab = null; }
          else {
            e.x = p.x + p.face * 15 * Math.max(1, e.sc); e.y = p.y; e.face = -p.face;
            if (p.kt > 0) p.kt--;
            if (p.bufA >= 0 && p.kt <= 0) {
              p.bufA = -1; p.kt = 14; sfx.swish();
              e.kneeN++; applyHitGrabbed(e, 2);
            } else if (p.bufB >= 0 && p.kt <= 0) {
              p.bufB = -1; p.grab = null; p.state = 'throwing'; p.t = 18;
              e.state = 'fall'; e.vx = -p.face * 2.6; e.vz = 3.4; e.z = 6; e.x = p.x - p.face * 4; e.flying = true; e.pend = 4; e.face = p.face;
              addScore(300); sfx.heavy();
            } else if (--p.t <= 0 || lx === -p.face) { p.state = 'idle'; p.grab = null; e.state = 'hit'; e.t = 10; }
          }
          return;
        }
        if (p.state === 'throwing') { if (--p.t <= 0) p.state = 'idle'; return; }
        if (p.state === 'jump') {
          p.x += p.vx; p.z += p.vz; p.vz -= 0.2;
          if (!p.jk && (p.bufA >= 0 || p.bufB >= 0) && p.vz < 2.5) { p.jk = true; p.hitSet = []; p.bufA = p.bufB = -1; sfx.swish(); }
          if (p.jk) {
            for (const t of ents) {
              if (p.hitSet.includes(t) || !canBeHit(t)) continue;
              const dx = (t.x - p.x) * p.face;
              if (dx > -4 && dx < 30 && Math.abs(t.y - p.y) < 9 && Math.abs(t.z - p.z) < 26) { p.hitSet.push(t); applyHit(t, 3, p.face, true, 'other'); }
            }
          }
          if (p.z <= 0) { p.z = 0; p.state = 'land'; p.t = 6; p.jk = false; }
          clampP(); return;
        }
        if (p.state === 'land') { if (--p.t <= 0) p.state = 'idle'; return; }
        if (stepBody(p)) return;
        // free
        if (api.pressed('KeyZ') || (p.bufA >= 0 && p.bufB >= 0)) {
          p.bufA = p.bufB = -1; p.state = 'jump'; p.vz = 3.7; p.vx = lx * 1.5; p.jk = false; p.z = 0.1; A.tone(300, 0.08, { type: 'square', vol: 0.06, slideTo: 600 }); return;
        }
        if (p.bufA >= 3) { p.bufA = -1; doA(p); return; }
        if (p.bufB >= 3) { p.bufB = -1; doB(p, lx); return; }
        if (lx || ly) {
          p.state = 'walk'; p.anim++;
          p.x += lx * 1.3; p.y += ly * 0.9;
          if (lx && p.bufB < 0) p.face = lx;
          // hair grab
          if (lx) for (const e of ents) {
            if (e.state === 'bent' && Math.abs(e.y - p.y) < 7 && Math.abs(e.x - p.x) < 20 && Math.sign(e.x - p.x) === lx) {
              p.state = 'grab'; p.grab = e; p.t = 140; p.kt = 8; p.face = lx; e.state = 'grabbed'; e.kneeN = 0; break;
            }
          }
        } else { p.state = 'idle'; p.anim = 0; }
        clampP();
      }
      function applyHitGrabbed(e, dmg) {
        e.hp -= dmg; addScore(150); sfx.hit();
        fx.push({ k: 'spark', x: e.x, y: e.y, z: 24, t: 8 });
        if (e.hp <= 0 || e.kneeN >= 4) { e.hp = Math.max(0, e.hp); P.grab = null; P.state = 'idle'; knockdown(e, P.face, 1.6); }
      }
      function clampP() {
        P.y = Math.max(YMIN, Math.min(YMAX, P.y));
        P.x = Math.max(camX + 8, Math.min(camX + W - 8, P.x));
      }
      function playerDies() {
        P.state = 'dead'; P.t = 999; phase = 'dying'; phaseT = 0; sfx.die();
      }
      function hurtPlayerEnv(dmg) {
        if (!canBeHit(P)) return;
        applyHit(P, dmg, -P.face, false, 'other');
      }
      // ---------- enemies ----------
      function assignEngage() {
        const live = ents.filter(e => e.state !== 'dead' && e.hp > 0);
        live.sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x));
        const max = 2 + Math.min(2, loop + (mi >= 2 ? 1 : 0));
        let n = 0;
        for (const e of live) { e.engaged = e.def.boss || n < max; if (!e.def.boss) n++; }
      }
      function updEnemy(e) {
        if (e.inv > 0) e.inv--;
        if (stepBody(e)) return;
        e.cd--;
        const side = e.x < P.x ? -1 : 1;
        const dxP = P.x - e.x, dyP = P.y - e.y;
        e.face = dxP >= 0 ? 1 : -1;
        if (P.state === 'dead' || phase !== 'play') { e.state = 'idle'; return; }
        // pick up items
        if (!e.weapon && e.type !== 'abobo') {
          for (const it of items) if (it.z <= 2 && Math.abs(it.x - e.x) < 12 && Math.abs(it.y - e.y) < 8 && Math.random() < 0.05) { e.weapon = it.k; items.splice(items.indexOf(it), 1); break; }
        }
        const ranged = e.weapon && THROWN[e.weapon];
        let tx, ty;
        if (e.weapon === 'gun') { tx = P.x + side * 96; ty = P.y; }
        else if (ranged) { tx = P.x + side * 70; ty = P.y; }
        else if (e.engaged) { tx = P.x + side * (e.weapon === 'whip' ? 36 : e.weapon === 'bat' ? 26 : 16 + 7 * e.sc); ty = P.y; }
        else { tx = P.x + side * (64 + e.slot * 30); ty = P.y + e.oy; }
        tx = Math.max(camX + 12, Math.min(camX + W - 12, tx));
        const sp = e.def.sp * (1 + loop * 0.12) * (e.engaged ? 1 : 0.7);
        let mx = 0, my = 0;
        if (Math.abs(tx - e.x) > 3) mx = Math.sign(tx - e.x);
        if (Math.abs(ty - e.y) > 2) my = Math.sign(ty - e.y);
        e.x += mx * sp; e.y += my * sp * 0.7;
        e.y = Math.max(YMIN, Math.min(YMAX, e.y));
        e.state = (mx || my) ? 'walk' : 'idle'; if (mx || my) e.anim++;
        if (e.cd > 0) return;
        const adx = Math.abs(dxP), ady = Math.abs(dyP);
        if (e.weapon === 'gun') {
          if (ady < 6 && adx > 40) { startMove(e, 'eshot'); e.cd = 90 - loop * 10; return; }
          if (adx < 30 && ady < 8) { startMove(e, 'kick'); e.cd = 50; }
          return;
        }
        if (ranged) {
          if (ady < 8 && adx > 30 && adx < 150) { startMove(e, 'toss'); e.cd = 70; }
          return;
        }
        if (e.type === 'jeff' && ady < 8 && adx > 30 && adx < 60 && Math.random() < 0.04) {
          e.state = 'ejump'; e.vz = 3.4; e.vx = e.face * 1.6; e.z = 0.1; e.hitSet = []; e.cd = 60; return;
        }
        const rch = e.weapon === 'whip' ? 46 : e.weapon === 'bat' ? 34 : e.def.reach * e.sc + 8;
        if (e.engaged && ady < 6 && adx < rch) {
          let mv;
          if (e.weapon === 'bat' || e.weapon === 'whip') mv = e.weapon;
          else mv = Math.random() < 0.55 ? 'punch' : 'kick';
          startMove(e, mv);
          e.cd = (e.def.boss ? 30 : 50) + Math.random() * 40 - loop * 6 - mi * 3;
        }
      }
      function updJeffJump(e) {
        e.x += e.vx; e.z += e.vz; e.vz -= 0.2;
        if (canBeHit(P) && !e.hitSet.includes(P)) {
          const dx = (P.x - e.x) * e.face;
          if (dx > -4 && dx < 30 && Math.abs(P.y - e.y) < 9 && Math.abs(P.z - e.z) < 26) { e.hitSet.push(P); applyHit(P, 4, e.face, true, 'other'); }
        }
        if (e.z <= 0) { e.z = 0; e.state = 'idle'; }
      }
      // ---------- projectiles & items ----------
      function updShots() {
        for (const s of shots) {
          s.t++; if (s.t < 0) continue;
          if (s.k === 'boom') { continue; }
          s.x += s.vx; s.z += s.vz; if (THROWN[s.k] && THROWN[s.k].arc) s.vz -= 0.15;
          if (s.z <= 0 && s.vz <= 0) {
            s.z = 0; s.vz = 0;
            if (s.k === 'barrel') { s.vx *= 0.985; }
            else if (s.k === 'box') { s.vx *= 0.9; }
            else if (s.k === 'dynamite') { s.vx *= 0.85; }
          }
          // damage
          const d = s.k === 'bullet' ? { dmg: 4 } : THROWN[s.k];
          if (s.k !== 'dynamite' && d) {
            const tg = s.from === 'p' ? ents : [P];
            for (const t of tg) {
              if (!canBeHit(t)) continue;
              if (Math.abs(t.x - s.x) < 10 && Math.abs(t.y - s.y) < 8 && Math.abs(t.z + 20 - s.z) < 26) {
                applyHit(t, d.dmg, Math.sign(s.vx) || 1, s.k !== 'bullet' && s.k !== 'knife', 'other');
                if (s.k === 'bullet') s.dead = true;
                else { s.dead = true; items.push({ k: s.k, x: s.x, y: s.y, z: Math.max(4, s.z), vx: -s.vx * 0.2, vz: 1.5 }); }
                break;
              }
            }
          }
          if (s.k === 'dynamite') {
            s.fuse--;
            if (s.fuse <= 0) {
              s.dead = true; sfx.boom(); fx.push({ k: 'boom', x: s.x, y: s.y, z: 0, t: 30 });
              for (const t of ents.concat([P])) if (canBeHit(t) && Math.abs(t.x - s.x) < 34 && Math.abs(t.y - s.y) < 18) applyHit(t, 6, t.x >= s.x ? 1 : -1, true, 'other');
            }
          }
          if ((s.k === 'barrel' || s.k === 'box') && s.z === 0 && Math.abs(s.vx) < 0.4) { s.dead = true; items.push({ k: s.k, x: s.x, y: s.y, z: 0, vx: 0, vz: 0 }); }
          if (s.x < camX - 40 || s.x > camX + W + 40) s.dead = true;
        }
        shots = shots.filter(s => !s.dead);
        for (const it of items) {
          if (it.z > 0 || it.vz > 0) { it.z += it.vz; it.vz -= 0.2; it.x += it.vx; if (it.z <= 0) { it.z = 0; it.vz = 0; it.vx = 0; } }
          it.y = Math.max(YMIN, Math.min(YMAX, it.y));
        }
        items = items.filter(it => it.x > camX - 200);
      }
      // ---------- main update ----------
      function updGame() {
        T++;
        for (const f of fx) f.t--;
        fx = fx.filter(f => f.t > 0);
        if (phase === 'intro') { phaseT++; if (phaseT > 150) phase = 'play'; P.state = 'idle'; return; }
        if (phase === 'ending') { phaseT++; if (phaseT > 600 || (phaseT > 200 && api.anyPressed('Enter', 'Space'))) { loop++; mi = 0; startMission(false); } return; }
        if (phase === 'clear') {
          phaseT++;
          if (phaseT > 60 && timer > 0 && phaseT % 2 === 0) { timer--; addScore(50); if (timer % 4 === 0) A.tone(1200, 0.02, { type: 'square', vol: 0.05 }); }
          if (timer <= 0 && phaseT > 120) {
            if (phaseT > 260) {
              if (mi === MISSIONS.length - 1) { phase = 'ending'; phaseT = 0; sfx.clear(); }
              else { mi++; startMission(false); }
            }
          }
          P.state = 'idle'; return;
        }
        if (phase === 'dying') {
          phaseT++;
          if (phaseT === 100) {
            lives--;
            if (lives > 0) respawn();
            else {
              api.setHiScore(score);
              const over = () => { mode = 'over'; T = 0; sfx.over(); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over();
            }
          }
          for (const e of ents) if (e.state === 'dead') e.t--;
          return;
        }
        // play
        if (T % 60 === 0) { timer--; if (timer <= 0) { timer = 0; P.hp = 0; P.state = 'fall'; P.vx = 0; P.vz = 2; P.z = 1; } }
        updPlayer();
        assignEngage();
        for (const e of ents) { if (e.state === 'ejump') updJeffJump(e); else updEnemy(e); }
        for (const e of ents) if (e.state === 'dead' && e.t <= 0) { addScore(e.def.pts || 500); e.gone = true; }
        ents = ents.filter(e => !e.gone);
        updShots();
        // conveyor
        const m = MISSIONS[mi];
        if (m.conveyor) for (const b of ents.concat([P])) if (b.x > m.conveyor[0] && b.x < m.conveyor[1] && b.y > 206 && b.z === 0) { b.x -= 0.45; if (b.isP) clampP(); }
        // spawns
        if (spawnQ.length) { if (--spawnT <= 0) { spawnOne(spawnQ.shift()); spawnT = 45; } }
        // camera / waves
        const waves = m.waves;
        if (lock) {
          if (!spawnQ.length && ents.length === 0) {
            const wv = waves[wi];
            lock = false; wi++;
            if (wv.boss || wi >= waves.length) { phase = 'clear'; phaseT = 0; sfx.clear(); addScore(1000 * (mi + 1)); return; }
            goT = 150; A.melody([[660, 0.08], [880, 0.12]], { type: 'square', vol: 0.1 });
          }
        } else {
          const maxCam = Math.min(m.len - W, wi < waves.length ? waves[wi].at : m.len - W);
          if (P.x > camX + 140) camX = Math.min(maxCam, P.x - 140);
          if (wi < waves.length && camX >= waves[wi].at - 0.5) triggerWave();
        }
        if (goT > 0) goT--;
        if (P.state === 'dead' && phase === 'play') playerDies();
        // keep enemies from stacking
        for (let i = 0; i < ents.length; i++) for (let j = i + 1; j < ents.length; j++) {
          const a = ents[i], b = ents[j];
          if (a.state === 'walk' || a.state === 'idle') if (Math.abs(a.x - b.x) < 10 && Math.abs(a.y - b.y) < 5) { const d = a.x <= b.x ? -0.6 : 0.6; a.x += d; b.x -= d; }
        }
        // simple music pulse
        if (--musicT <= 0) {
          musicT = 32;
          const bass = [110, 110, 131, 98, 110, 110, 147, 131][(T >> 5) % 8];
          A.tone(bass, 0.18, { type: 'triangle', vol: 0.09 });
        }
      }
      function respawn() {
        P = Object.assign(mkBody('billy', P.x, P.y, P.face), { bufA: -1, bufB: -1 });
        P.hp = P.maxhp = 30; P.inv = 150; P.x = Math.max(camX + 20, Math.min(camX + W - 20, P.x));
        phase = 'play'; timer = Math.max(timer, 60);
      }
      function update() {
        if (api.credits > lastCred) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          T++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCred = api.credits; newGame(); }
            else { coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        if (mode === 'over') {
          T++;
          if (T > 300 || (T > 90 && api.anyPressed('Enter'))) { mode = 'attract'; T = 0; }
          return;
        }
        updGame();
      }

      // ---------- rendering ----------
      function drawBg(ctx) {
        const m = MISSIONS[mi];
        const bg = m.bg;
        const c0 = Math.floor(camX / 64) - 1;
        if (bg === 'slum') {
          ctx.fillStyle = '#18183a'; ctx.fillRect(0, HUD, W, 60);
          ctx.fillStyle = '#2a2a50';
          for (let i = Math.floor(camX * 0.3 / 30) - 1; i < Math.floor(camX * 0.3 / 30) + 11; i++) { const h = 20 + hash(i * 13) * 40; ctx.fillRect(Math.round(i * 30 - camX * 0.3), HUD + 60 - h + 30, 28, h); }
          for (let c = c0; c < c0 + 7; c++) {
            const x0 = Math.round(c * 64 - camX), r = hash(c * 7 + 3);
            ctx.fillStyle = r < 0.5 ? '#7a3a28' : '#6a5040'; ctx.fillRect(x0, HUD + 22, 64, 140 - 22);
            ctx.fillStyle = shade(r < 0.5 ? '#7a3a28' : '#6a5040', 0.75);
            for (let y = HUD + 26; y < 160; y += 6) ctx.fillRect(x0, y, 64, 1);
            for (let y = HUD + 26, k = 0; y < 160; y += 6, k++) for (let x = x0 + (k % 2 ? 8 : 0); x < x0 + 64; x += 16) ctx.fillRect(x, y, 1, 6);
            if (r < 0.3) { ctx.fillStyle = '#505060'; ctx.fillRect(x0 + 8, 108, 48, 52); ctx.fillStyle = '#404050'; for (let y = 110; y < 160; y += 5) ctx.fillRect(x0 + 8, y, 48, 1); }
            else { for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) { ctx.fillStyle = hash(c * 31 + k * 5 + j) < 0.3 ? '#e0d070' : '#202838'; ctx.fillRect(x0 + 10 + k * 28, HUD + 36 + j * 40, 16, 22); ctx.fillStyle = '#3a2018'; ctx.fillRect(x0 + 9 + k * 28, HUD + 58 + j * 40, 18, 2); } }
            if (r > 0.8) { ctx.fillStyle = '#9a9aa0'; for (let x = x0; x < x0 + 64; x += 4) ctx.fillRect(x, 130, 1, 30); ctx.fillRect(x0, 130, 64, 1); ctx.fillRect(x0, 145, 64, 1); }
          }
          ctx.fillStyle = '#6c6c70'; ctx.fillRect(0, 160, W, H - 160);
          ctx.fillStyle = '#5a5a60';
          for (let c = c0; c < c0 + 7; c++) { const x0 = Math.round(c * 64 - camX); ctx.fillRect(x0, 160, 1, 80); ctx.fillRect(x0 + 32, 190, 1, 50); }
          ctx.fillRect(0, 190, W, 1); ctx.fillStyle = '#888890'; ctx.fillRect(0, 160, W, 3);
        } else if (bg === 'factory') {
          ctx.fillStyle = '#202820'; ctx.fillRect(0, HUD, W, 130);
          for (let c = c0; c < c0 + 7; c++) {
            const x0 = Math.round(c * 64 - camX), r = hash(c * 11 + 5);
            ctx.fillStyle = '#4a5a50'; ctx.fillRect(x0, HUD + 10, 64, 125);
            ctx.fillStyle = '#3a4840'; ctx.fillRect(x0, HUD + 10, 2, 125); ctx.fillRect(x0 + 32, HUD + 10, 1, 125);
            ctx.fillStyle = '#5a6a60'; for (let y = HUD + 14; y < 160; y += 16) for (let x = x0 + 4; x < x0 + 64; x += 16) ctx.fillRect(x, y, 2, 2);
            if (r < 0.4) { ctx.fillStyle = '#8a6a30'; ctx.fillRect(x0, HUD + 40, 64, 6); ctx.fillStyle = '#6a5020'; ctx.fillRect(x0, HUD + 44, 64, 2); }
            if (r > 0.6) { ctx.fillStyle = '#e8c020'; ctx.fillRect(x0 + 12, 120, 40, 8); ctx.fillStyle = '#202020'; for (let x = x0 + 12; x < x0 + 52; x += 8) ctx.fillRect(x, 120, 4, 8); }
            if (r > 0.3 && r < 0.6) { ctx.fillStyle = '#304038'; ctx.fillRect(x0 + 10, HUD + 60, 44, 40); ctx.fillStyle = '#80c0a0'; ctx.fillRect(x0 + 12, HUD + 62, 40, 36); ctx.fillStyle = '#304038'; ctx.fillRect(x0 + 31, HUD + 62, 2, 36); }
          }
          ctx.fillStyle = '#585858'; ctx.fillRect(0, 160, W, H - 160);
          ctx.fillStyle = '#4a4a4a'; for (let c = c0; c < c0 + 9; c++) ctx.fillRect(Math.round(c * 32 - camX), 160, 1, 80);
          if (m.conveyor) {
            const a = Math.round(m.conveyor[0] - camX), b = Math.round(m.conveyor[1] - camX);
            ctx.fillStyle = '#2a2a2a'; ctx.fillRect(a, 204, b - a, 26);
            ctx.fillStyle = '#4a4a40'; for (let x = a + ((-T * 0.45) % 8 + 8) % 8; x < b; x += 8) ctx.fillRect(Math.round(x), 206, 3, 22);
            ctx.fillStyle = '#e8c020'; ctx.fillRect(a, 202, b - a, 2); ctx.fillRect(a, 230, b - a, 2);
          }
        } else if (bg === 'forest') {
          ctx.fillStyle = '#4070b8'; ctx.fillRect(0, HUD, W, 50);
          ctx.fillStyle = '#5080c8'; ctx.fillRect(0, HUD + 30, W, 20);
          ctx.fillStyle = '#3a6a3a';
          for (let i = Math.floor(camX * 0.4 / 24) - 1; i < Math.floor(camX * 0.4 / 24) + 13; i++) { const h = 20 + hash(i * 3) * 30; ctx.fillRect(Math.round(i * 24 - camX * 0.4), HUD + 70 - h, 24, h + 20); }
          ctx.fillStyle = '#2a5a2a'; ctx.fillRect(0, HUD + 80, W, 50);
          for (let c = c0; c < c0 + 7; c++) {
            const x0 = Math.round(c * 64 - camX), r = hash(c * 17 + 9);
            const tx = x0 + Math.round(r * 40);
            ctx.fillStyle = '#5a3a1a'; ctx.fillRect(tx + 6, HUD + 40, 10, 120 - HUD);
            ctx.fillStyle = '#4a2a10'; ctx.fillRect(tx + 6, HUD + 40, 3, 120 - HUD);
            ctx.fillStyle = '#2a7a2a'; ctx.fillRect(tx - 10, HUD + 14, 42, 34); ctx.fillStyle = '#3a9a3a'; ctx.fillRect(tx - 4, HUD + 8, 30, 20);
            if (r > 0.7) { ctx.fillStyle = '#7a7a70'; ctx.fillRect(x0 + 40, 140, 20, 20); ctx.fillStyle = '#9a9a90'; ctx.fillRect(x0 + 42, 140, 12, 4); }
          }
          ctx.fillStyle = '#5a8a2a'; ctx.fillRect(0, 160, W, H - 160);
          ctx.fillStyle = '#4a7a20';
          for (let c = c0 * 2; c < c0 * 2 + 14; c++) { const x0 = Math.round(c * 32 - camX); ctx.fillRect(x0 + Math.round(hash(c) * 20), 170 + Math.round(hash(c + 99) * 60), 6, 2); }
          ctx.fillStyle = '#8a6a3a'; ctx.fillRect(0, 186, W, 18); ctx.fillStyle = '#7a5a2a'; ctx.fillRect(0, 186, W, 2); ctx.fillRect(0, 202, W, 2);
        } else {
          ctx.fillStyle = '#100810'; ctx.fillRect(0, HUD, W, 130);
          for (let c = c0; c < c0 + 7; c++) {
            const x0 = Math.round(c * 64 - camX), r = hash(c * 23 + 1);
            ctx.fillStyle = '#4a4048'; ctx.fillRect(x0, HUD + 6, 64, 154 - HUD);
            ctx.fillStyle = '#3a3038';
            for (let y = HUD + 6, k = 0; y < 160; y += 10, k++) { ctx.fillRect(x0, y, 64, 1); for (let x = x0 + (k % 2 ? 0 : 10); x < x0 + 64; x += 20) ctx.fillRect(x, y, 1, 10); }
            if (r < 0.35) { const fl = (T >> 3) & 1; ctx.fillStyle = '#6a4020'; ctx.fillRect(x0 + 30, 90, 4, 12); ctx.fillStyle = fl ? '#ffb020' : '#ff6010'; ctx.fillRect(x0 + 29, 82 - fl, 6, 8 + fl); ctx.fillStyle = '#fff080'; ctx.fillRect(x0 + 31, 86, 2, 3); }
            if (r > 0.75) { ctx.fillStyle = '#801818'; ctx.fillRect(x0 + 6, HUD + 20, 52, 90); ctx.fillStyle = '#a02020'; for (let x = x0 + 8; x < x0 + 58; x += 6) ctx.fillRect(x, HUD + 20, 2, 90); ctx.fillStyle = '#e0c040'; ctx.fillRect(x0 + 6, HUD + 18, 52, 3); }
          }
          ctx.fillStyle = '#383038'; ctx.fillRect(0, 160, W, H - 160);
          ctx.fillStyle = '#2a242a'; for (let c = c0 * 2; c < c0 * 2 + 14; c++) { const x0 = Math.round(c * 32 - camX); ctx.fillRect(x0, 160, 1, 80); }
          for (let y = 176; y < 240; y += 16) ctx.fillRect(0, y, W, 1);
        }
      }
      function poseOf(e) {
        switch (e.state) {
          case 'walk': return POSE[['walk0', 'walk1', 'walk2', 'walk1'][(e.anim >> 3) & 3]];
          case 'att': { const M = MOVES[e.move]; return POSE[e.t <= M.w ? M.wpose : M.pose]; }
          case 'jump': return POSE[e.jk ? 'jumpkick' : 'jump'];
          case 'ejump': return POSE.jumpkick;
          case 'land': return POSE.getup;
          case 'hit': return POSE.hit;
          case 'fall': return POSE.fall;
          case 'down': case 'dead': return POSE.down;
          case 'getup': return POSE.getup;
          case 'bent': case 'grabbed': return POSE.bent;
          case 'grab': return e.kt > 6 ? POSE.knee : POSE.grab;
          case 'throwing': return e.t > 10 ? POSE.throwW : POSE.throw;
          default: return ((T + (e.slot * 60 | 0)) >> 5) & 1 ? POSE.stand2 : POSE.stand;
        }
      }
      function drawItem(ctx, k, x, y, held, f) {
        x = Math.round(x); y = Math.round(y);
        switch (k) {
          case 'bat': ctx.fillStyle = '#b07a3a'; if (held) return; ctx.fillRect(x - 9, y - 2, 18, 3); ctx.fillStyle = '#8a5a20'; ctx.fillRect(x + 4, y - 3, 6, 4); break;
          case 'whip': ctx.fillStyle = '#5a3010'; ctx.fillRect(x - 6, y - 2, 12, 2); ctx.fillRect(x - 6, y - 5, 2, 4); ctx.fillRect(x + 4, y - 5, 2, 4); ctx.fillRect(x - 6, y - 5, 12, 1); break;
          case 'knife': ctx.fillStyle = '#d8d8e8'; ctx.fillRect(x - 4, y - 2, 7, 2); ctx.fillStyle = '#6a4020'; ctx.fillRect(x + 3, y - 2, 3, 2); break;
          case 'barrel': ctx.fillStyle = '#8a5020'; ctx.fillRect(x - 6, y - 14, 12, 14); ctx.fillStyle = '#5a3010'; ctx.fillRect(x - 6, y - 11, 12, 1); ctx.fillRect(x - 6, y - 4, 12, 1); ctx.fillStyle = '#a86a30'; ctx.fillRect(x - 4, y - 14, 2, 14); break;
          case 'box': ctx.fillStyle = '#a07a40'; ctx.fillRect(x - 7, y - 12, 14, 12); ctx.fillStyle = '#6a4a20'; ctx.fillRect(x - 7, y - 12, 14, 1); ctx.fillRect(x - 7, y - 1, 14, 1); ctx.fillRect(x - 7, y - 12, 1, 12); ctx.fillRect(x + 6, y - 12, 1, 12); for (let i = 0; i < 10; i++) ctx.fillRect(x - 5 + i, y - 11 + i, 1, 1); break;
          case 'dynamite': ctx.fillStyle = '#d02020'; ctx.fillRect(x - 4, y - 7, 3, 7); ctx.fillRect(x - 1, y - 7, 3, 7); ctx.fillRect(x + 2, y - 7, 3, 7); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 4, y - 5, 9, 1); ctx.fillStyle = (T >> 2) & 1 ? '#ffe040' : '#ff6020'; ctx.fillRect(x, y - 10, 1, 3); break;
          case 'bullet': ctx.fillStyle = '#ffffa0'; ctx.fillRect(x - 3, y - 1, 6, 2); break;
        }
      }
      function drawBody(ctx, e) {
        const sx = Math.round(e.x - camX), sy = Math.round(e.y);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx - Math.round(9 * e.sc), sy - 1, Math.round(18 * e.sc), 3);
        if (e.state === 'dead' && (e.t >> 2) & 1) return;
        if (e.isP && e.inv > 0 && (e.inv >> 2) & 1 && e.state !== 'down') return;
        const r = drawMan(ctx, sx, sy - Math.round(e.z), e.face, poseOf(e), e.pal, e.sc);
        const w = e.weapon;
        if (w && e.state !== 'down' && e.state !== 'fall') {
          const h = r.front, a = h.a * D2R, f = e.face;
          if (w === 'bat') seg(ctx, h.x, h.y, h.x + Math.sin(a) * 13 * f, h.y + Math.cos(a) * 13, 3, '#b07a3a');
          else if (w === 'whip') {
            const att = e.state === 'att' && e.t > MOVES.whip.w;
            if (att) { ctx.fillStyle = '#5a3010'; for (let i = 0; i < 30; i++) ctx.fillRect(Math.round(h.x + i * f), Math.round(h.y + Math.sin(i * 0.4 + T) * 2), 1, 1); }
            else seg(ctx, h.x, h.y, h.x + 2 * f, h.y + 10, 1, '#5a3010');
          } else if (w === 'knife') seg(ctx, h.x, h.y, h.x + Math.sin(a) * 6 * f, h.y + Math.cos(a) * 6, 2, '#e0e0f0');
          else if (w === 'gun') { ctx.fillStyle = '#202020'; ctx.fillRect(Math.round(h.x - (f > 0 ? 4 : 14)), Math.round(h.y - 3), 18, 4); ctx.fillStyle = '#704020'; ctx.fillRect(Math.round(h.x - (f > 0 ? 6 : -2)), Math.round(h.y - 1), 4, 5); }
          else {
            const hd = r.head;
            if (e.state === 'att' && MOVES[e.move] && MOVES[e.move].toss) drawItem(ctx, w, hd.x, hd.y - 6, true, f);
            else drawItem(ctx, w, h.x, h.y + 6, true, f);
          }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUD);
        text(ctx, '1P', 6, 4, '#4fa0ff');
        text(ctx, String(score).padStart(6, '0'), 22, 4, '#fff');
        text(ctx, 'HI', 96, 4, '#ff5050'); text(ctx, String(hi).padStart(6, '0'), 112, 4, '#fff');
        text(ctx, 'TIME', 190, 4, '#ffe040'); text(ctx, String(Math.max(0, timer)).padStart(3, '0'), 220, 4, (timer < 30 && (T >> 3) & 1) ? '#ff3030' : '#fff');
        // health bar
        const hp = P ? Math.max(0, P.hp) : 0;
        for (let i = 0; i < 15; i++) { ctx.fillStyle = i < Math.ceil(hp / 2) ? '#30a0ff' : '#202040'; ctx.fillRect(22 + i * 5, 15, 4, 6); }
        text(ctx, 'X' + Math.max(0, lives - 1), 104, 15, '#fff');
        text(ctx, 'MISSION ' + (mi + 1), 140, 15, '#ffcc22');
        // boss bar
        const boss = ents.find(e => e.def.boss && e.hp > 0);
        if (boss) {
          text(ctx, boss.type, 6, 25, '#ff8080');
          const n = Math.ceil(boss.hp / boss.maxhp * 30);
          ctx.fillStyle = '#401010'; ctx.fillRect(60, 26, 120, 4); ctx.fillStyle = '#ff3030'; ctx.fillRect(60, 26, n * 4, 4);
        }
      }
      function drawTitleLogo(ctx, y) {
        // dragon emblem: two coiled dragons around a disc
        const cx = W / 2;
        ctx.fillStyle = '#601010'; ctx.fillRect(cx - 40, y, 80, 2);
        for (let i = 0; i < 60; i++) {
          const a = i / 60 * Math.PI * 2 + T * 0.01;
          const r = 34 + Math.sin(i * 0.5) * 3;
          ctx.fillStyle = i % 2 ? '#e8b020' : '#c08010';
          ctx.fillRect(Math.round(cx + Math.cos(a) * r * 1.6 - 2), Math.round(y + 40 + Math.sin(a) * r * 0.6 - 2), 4, 4);
        }
        textS(ctx, 'DOUBLE', cx, y + 18, '#4fa0ff', 3, 'center');
        textS(ctx, 'DRAGON', cx, y + 44, '#ff3030', 3, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { renderAttract(ctx); return; }
        drawBg(ctx);
        // items + shots + bodies sorted by depth
        const list = [];
        for (const it of items) list.push({ y: it.y, d: () => drawItem(ctx, it.k, it.x - camX, it.y - it.z, false, 1) });
        for (const s of shots) if (s.t >= 0) list.push({ y: s.y, d: () => { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(s.x - camX - 4), Math.round(s.y - 1), 8, 2); drawItem(ctx, s.k, s.x - camX, s.y - s.z, false, 1); } });
        for (const e of ents) list.push({ y: e.y, d: () => drawBody(ctx, e) });
        if (P && P.state !== 'dead') list.push({ y: P.y, d: () => drawBody(ctx, P) });
        else if (P) list.push({ y: P.y, d: () => { const sx = Math.round(P.x - camX); if ((T >> 3) & 1) drawMan(ctx, sx, P.y, P.face, POSE.down, P.pal, 1); } });
        list.sort((a, b) => a.y - b.y);
        for (const o of list) o.d();
        for (const f of fx) {
          const x = Math.round(f.x - camX);
          if (f.k === 'spark') { ctx.fillStyle = f.t > 4 ? '#fff' : '#ffe040'; const y = Math.round(f.y - f.z); ctx.fillRect(x - 4, y, 9, 1); ctx.fillRect(x, y - 4, 1, 9); ctx.fillRect(x - 2, y - 2, 5, 5); }
          else if (f.k === 'boom') { const r = 30 - f.t; ctx.fillStyle = f.t > 20 ? '#fff' : f.t > 10 ? '#ffc020' : '#c04010'; ctx.fillRect(x - r, Math.round(f.y) - r * 1.5, r * 2, r * 1.5); ctx.fillStyle = '#ff6020'; ctx.fillRect(x - r / 2, Math.round(f.y) - r, r, r); }
          else if (f.k === 'txt') textS(ctx, f.s, x, Math.round(f.y), f.c, 1, 'center');
        }
        if (goT > 0 && (goT >> 3) & 1) {
          textS(ctx, 'GO', W - 44, 100, '#ffe040', 2);
          ctx.fillStyle = '#ffe040'; for (let i = 0; i < 7; i++) ctx.fillRect(W - 18 + i, 100 + i, 1, 14 - i * 2);
        }
        if (phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 90, W, 50);
          textS(ctx, 'MISSION ' + (mi + 1), W / 2, 100, '#ffcc22', 2, 'center');
          textS(ctx, MISSIONS[mi].name, W / 2, 122, '#fff', 1, 'center');
        }
        if (phase === 'clear') {
          textS(ctx, 'MISSION ' + (mi + 1) + ' CLEAR', W / 2, 90, '#ffcc22', 2, 'center');
          textS(ctx, 'TIME BONUS', W / 2, 116, '#fff', 1, 'center');
        }
        if (phase === 'ending') renderEnding(ctx);
        drawHUD(ctx);
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 100, W, 40);
          textS(ctx, 'GAME OVER', W / 2, 112, '#ff3030', 2, 'center');
        }
      }
      function renderEnding(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, HUD, W, H - HUD);
        const t = phaseT;
        const mx = Math.max(150, W + 20 - t * 0.8);
        drawMan(ctx, 100, 200, 1, t > 180 ? POSE.cheer : POSE.stand, PAL.billy, 1.4);
        drawMan(ctx, Math.round(mx), 200, -1, mx > 150 ? POSE[['walk0', 'walk1', 'walk2', 'walk1'][(t >> 3) & 3]] : POSE.stand, PAL.marian, 1.3);
        if (t > 180) { ctx.fillStyle = '#ff4080'; const hy = 120 - ((t - 180) % 60) / 2; ctx.fillRect(122, hy, 3, 3); ctx.fillRect(127, hy, 3, 3); ctx.fillRect(122, hy + 3, 8, 2); ctx.fillRect(123, hy + 5, 6, 2); ctx.fillRect(125, hy + 7, 2, 1); }
        textS(ctx, 'YOU RESCUED MARIAN!', W / 2, 60, '#ffcc22', 1, 'center');
        if (t > 120) textS(ctx, 'THE BLACK WARRIORS ARE FINISHED', W / 2, 76, '#fff', 1, 'center');
        if (t > 260) textS(ctx, 'BUT THE STREETS ARE NEVER SAFE...', W / 2, 92, '#aaa', 1, 'center');
      }
      function renderAttract(ctx) {
        const page = Math.floor(T / 420) % 3, t = T % 420;
        if (page === 0) {
          ctx.fillStyle = '#100808'; ctx.fillRect(0, 0, W, H);
          drawTitleLogo(ctx, 34);
          // sparring
          const fr = (t >> 4) % 4;
          const pa = fr === 1 ? POSE.punch : fr === 3 ? POSE.kick : POSE.stand;
          const pb = fr === 1 ? POSE.hit : fr === 3 ? POSE.hit : POSE.stand2;
          ctx.fillStyle = '#301818'; ctx.fillRect(0, 168, W, 2);
          drawMan(ctx, 100, 168, 1, pa, PAL.billy, 1.1);
          drawMan(ctx, 150, 168, -1, pb, PAL.williams, 1.1);
          text(ctx, '\u00a9 1987 TECHNOS', W / 2, 220, '#888', 1, 'center');
        } else if (page === 1) {
          ctx.fillStyle = '#080810'; ctx.fillRect(0, 0, W, H);
          textS(ctx, 'THE STORY', W / 2, 24, '#ffcc22', 2, 'center');
          const lines = ['MARIAN HAS BEEN KIDNAPPED', 'BY THE BLACK WARRIORS GANG.', '', 'BILLY LEE MUST FIGHT THROUGH', 'THE SLUMS, THE FACTORY, THE', 'FOREST AND THEIR HIDEOUT', 'TO GET HER BACK.', '', 'WALK INTO A DAZED THUG TO', 'GRAB HIM BY THE HAIR.', 'PICK UP BATS, WHIPS, KNIVES,', 'BARRELS AND DYNAMITE.'];
          lines.forEach((l, i) => { if (t > i * 10) text(ctx, l, W / 2, 56 + i * 11, '#fff', 1, 'center'); });
          drawMan(ctx, 30, 220, 1, POSE.stand, PAL.billy, 1); drawMan(ctx, 226, 220, -1, POSE.stand, PAL.abobo, 1.38);
          drawMan(ctx, 196, 220, -1, POSE.stand2, PAL.linda, 0.95);
        } else {
          ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, W, H);
          textS(ctx, 'BEST FIGHTERS', W / 2, 30, '#ffcc22', 2, 'center');
          const names = [['BILLY', hi], ['JIMMY', 40000], ['MARIAN', 30000], ['ABOBO', 20000], ['WILLY', 10000]];
          names.sort((a, b) => b[1] - a[1]);
          names.forEach((n, i) => { text(ctx, (i + 1) + '.', 50, 70 + i * 18, '#4fa0ff'); text(ctx, n[0], 70, 70 + i * 18, '#fff'); text(ctx, String(n[1]).padStart(7, ' '), 200, 70 + i * 18, '#fff', 1, 'right'); });
          text(ctx, 'EXTEND AT 30000 AND EVERY 50000', W / 2, 180, '#aaa', 1, 'center');
        }
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 196, '#fff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) textS(ctx, 'PUSH START', W / 2, 196, '#ffe040', 1, 'center'); }
        else if (blink) textS(ctx, 'INSERT COIN', W / 2, 196, '#fff', 1, 'center');
        text(ctx, credStr(), W - 4, H - 10, '#aaa', 1, 'right');
        text(ctx, 'HI ' + hi, 4, H - 10, '#aaa');
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
