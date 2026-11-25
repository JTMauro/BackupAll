// Bad Dudes vs. DragonNinja (Data East, 1988) - from-scratch recreation for the MAME32 Game Room.
// Two-tier side-scrolling brawler: streets, truck convoy, sewer, forest and freight train, then rescue the President.
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
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }

  const W = 256, H = 240, HUD = 26, GRAV = 0.35;
  const POSE = {
    stand: { lean: 4, ra: [25, 150], la: [-5, 135], rl: [12, -4], ll: [-12, 4] },
    stand2: { lean: 6, ra: [28, 155], la: [-2, 140], rl: [13, -2], ll: [-11, 5] },
    walk0: { lean: 8, ra: [35, 140], la: [-25, 100], rl: [28, 2], ll: [-22, -12] },
    walk1: { lean: 8, ra: [15, 130], la: [-5, 120], rl: [6, -8], ll: [-6, -18] },
    walk2: { lean: 8, ra: [-10, 110], la: [25, 140], rl: [-22, -12], ll: [28, 2] },
    run0: { lean: 18, ra: [50, 140], la: [-40, 80], rl: [45, 10], ll: [-30, -40] },
    run1: { lean: 18, ra: [-30, 90], la: [50, 140], rl: [-30, -40], ll: [45, 10] },
    punchW: { lean: 0, ra: [-20, 130], la: [10, 150], rl: [15, 0], ll: [-15, 0] },
    punch: { lean: 14, ra: [88, 90], la: [-25, 100], rl: [24, 0], ll: [-22, -6] },
    charge: { lean: -4, ra: [-60, 40], la: [20, 140], rl: [20, 0], ll: [-20, -4] },
    superp: { lean: 24, ra: [90, 90], la: [-40, 80], rl: [50, 0], ll: [-50, -40] },
    crouch: { lean: 20, ra: [60, 150], la: [30, 140], rl: [85, -10], ll: [-20, -80] },
    lowkick: { lean: -10, ra: [40, 160], la: [10, 150], rl: [88, 90], ll: [-20, -80] },
    jump: { lean: 6, ra: [60, 160], la: [30, 150], rl: [70, -25], ll: [40, -45] },
    jumpkick: { lean: -18, ra: [40, 160], la: [-60, 30], rl: [96, 94], ll: [30, -60] },
    flip: { lean: 90, ra: [120, 160], la: [100, 150], rl: [100, 10], ll: [80, -10] },
    hit: { lean: -26, ra: [-25, 40], la: [-45, 30], rl: [12, 0], ll: [-16, 0] },
    fall: { lean: -62, ra: [-120, -140], la: [-100, -150], rl: [60, 40], ll: [40, 30] },
    down: { lean: -90, ra: [-100, -80], la: [-95, -85], rl: [88, 92], ll: [86, 90] },
    kick: { lean: -24, ra: [30, 160], la: [-50, 40], rl: [96, 92], ll: [-6, -6] },
    throwS: { lean: 10, ra: [100, 100], la: [-30, 110], rl: [20, 0], ll: [-20, -4] },
    throwW: { lean: -6, ra: [-120, -60], la: [20, 140], rl: [14, 0], ll: [-16, 0] },
    breath: { lean: 16, ra: [40, 90], la: [30, 80], rl: [22, 0], ll: [-22, -4] },
    cheer: { lean: 0, ra: [-160, -170], la: [-150, -175], rl: [10, 0], ll: [-10, 0] },
    wave: { lean: 0, ra: [-150, -120], la: [10, 150], rl: [10, 0], ll: [-10, 0] }
  };
  const PAL = {
    dude: { skin: '#f4b884', hair: '#3a2008', top: '#f4f4f4', sleeve: '#f4b884', pants: '#3a5ad0', shoes: '#f0f0f0', belt: '#202020', band: '#e02020' },
    ninja: { skin: '#f0b080', hair: '#2040c0', top: '#2040c0', sleeve: '#2040c0', pants: '#2040c0', shoes: '#101040', belt: '#101010', hood: true },
    ninjaR: { skin: '#f0b080', hair: '#c02020', top: '#c02020', sleeve: '#c02020', pants: '#c02020', shoes: '#401010', belt: '#101010', hood: true },
    star: { skin: '#f0b080', hair: '#e8e8e8', top: '#e8e8e8', sleeve: '#e8e8e8', pants: '#e8e8e8', shoes: '#404040', belt: '#c02020', hood: true },
    kuno: { skin: '#f4c094', hair: '#a020a0', top: '#d040c0', sleeve: '#f4c094', pants: '#d040c0', shoes: '#401040', belt: '#ffe040', long: true },
    karnov: { skin: '#e09060', hair: '#e09060', top: '#e09060', sleeve: '#e09060', pants: '#2050a0', shoes: '#704020', belt: '#c0a020' },
    claw: { skin: '#f0b080', hair: '#20a040', top: '#20a040', sleeve: '#20a040', pants: '#20a040', shoes: '#103010', belt: '#ffe040', hood: true },
    mirror: { skin: '#f0b080', hair: '#8040e0', top: '#8040e0', sleeve: '#8040e0', pants: '#8040e0', shoes: '#201040', belt: '#e0e0e0', hood: true },
    giant: { skin: '#c08860', hair: '#808890', top: '#808890', sleeve: '#a0a8b0', pants: '#505860', shoes: '#303030', belt: '#c0a020' },
    dragon: { skin: '#f0b080', hair: '#181818', top: '#181818', sleeve: '#181818', pants: '#181818', shoes: '#c0a020', belt: '#e0b020', hood: true },
    prez: { skin: '#f4c8a0', hair: '#c0b8b0', top: '#303850', sleeve: '#303850', pants: '#303850', shoes: '#101010', belt: '#303850' }
  };
  const ETYPE = {
    ninja: { hp: 1, sp: 0.9, sc: 1.05, h: 40, pts: 100 },
    ninjaR: { hp: 2, sp: 1.1, sc: 1.05, h: 40, pts: 200, nun: true },
    star: { hp: 1, sp: 0.8, sc: 1.05, h: 40, pts: 200, ranged: true },
    dog: { hp: 1, sp: 2.2, sc: 1, h: 12, pts: 100, dog: true },
    kuno: { hp: 2, sp: 1.3, sc: 1, h: 38, pts: 300, flips: true },
    karnov: { hp: 26, sp: 0.6, sc: 1.6, h: 64, pts: 5000, boss: true, name: 'KARNOV' },
    claw: { hp: 24, sp: 1.4, sc: 1.15, h: 44, pts: 5000, boss: true, name: 'CLAW NINJA' },
    mirror: { hp: 20, sp: 1.0, sc: 1.1, h: 42, pts: 6000, boss: true, name: 'MIRROR NINJA' },
    giant: { hp: 34, sp: 0.55, sc: 1.75, h: 70, pts: 7000, boss: true, name: 'ANIMAL' },
    dragon: { hp: 40, sp: 1.2, sc: 1.2, h: 46, pts: 20000, boss: true, name: 'DRAGONNINJA' },
    clone: { hp: 1, sp: 1.0, sc: 1.1, h: 42, pts: 200 }
  };
  function seg3(x0, x1, y) { return { x0, x1, y }; }
  const STAGES = [
    { name: 'CITY STREETS', len: 2200, bg: 'street', boss: 'karnov', mix: ['ninja', 'ninja', 'ninja', 'dog', 'ninjaR', 'star'],
      floors: [seg3(0, 2200, 212), seg3(330, 700, 140), seg3(1000, 1420, 140), seg3(1700, 1900, 140)], items: [[520, 'nunchaku'], [1200, 'cola'], [1650, 'knife']] },
    { name: 'TRUCK CONVOY', len: 2400, bg: 'trucks', boss: 'claw', mix: ['ninja', 'ninja', 'ninjaR', 'kuno', 'star'], moving: true,
      floors: [seg3(0, 400, 176), seg3(440, 840, 176), seg3(880, 1300, 176), seg3(1344, 1800, 176), seg3(1840, 2400, 176), seg3(250, 400, 120), seg3(1150, 1300, 120)], items: [[600, 'knife'], [1500, 'cola'], [2000, 'clock']] },
    { name: 'SEWER', len: 2300, bg: 'sewer', boss: 'mirror', mix: ['ninja', 'ninjaR', 'star', 'dog', 'kuno'],
      floors: [seg3(0, 2300, 212), seg3(150, 600, 140), seg3(800, 1300, 140), seg3(1500, 1900, 140)], items: [[400, 'nunchaku'], [1100, 'cola'], [1700, 'clock']] },
    { name: 'FOREST', len: 2400, bg: 'forest', boss: 'giant', mix: ['ninja', 'ninjaR', 'dog', 'dog', 'kuno', 'star'],
      floors: [seg3(0, 2400, 212), seg3(200, 500, 140), seg3(650, 1100, 140), seg3(1300, 1600, 140), seg3(1800, 2100, 140)], items: [[300, 'knife'], [900, 'cola'], [1500, 'nunchaku'], [2000, 'cola']] },
    { name: 'FREIGHT TRAIN', len: 2600, bg: 'train', boss: 'dragon', mix: ['ninja', 'ninjaR', 'star', 'kuno', 'kuno'], moving: true,
      floors: [seg3(0, 330, 168), seg3(364, 700, 168), seg3(734, 1070, 168), seg3(1104, 1440, 168), seg3(1474, 1810, 168), seg3(1844, 2180, 168), seg3(2214, 2600, 168)], items: [[500, 'cola'], [1200, 'nunchaku'], [1900, 'cola']] }
  ];

  ArcadeRegistry.register({
    id: 'baddudes', title: 'Bad Dudes vs. DragonNinja', year: 1988, maker: 'Data East',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk/crouch \u00b7 Space: punch (Down+Space low kick, hold & release: super punch) \u00b7 X: jump (Up+X high jump, Down+X drop down) \u00b7 Enter: start',
    marquee: { bg: '#0a0a20', fg: '#ffe040', accent: '#e02020' },
    create(api) {
      const A = api.audio;
      const sfx = {
        swish() { A.noise(0.05, { vol: 0.08, freq: 3000, type: 'highpass' }); },
        hit() { A.noise(0.08, { vol: 0.22, freq: 1500 }); A.tone(160, 0.07, { type: 'square', vol: 0.1, slideTo: 70 }); },
        superp() { A.noise(0.3, { vol: 0.3, freq: 2000, slideTo: 200 }); A.tone(80, 0.3, { type: 'sawtooth', vol: 0.15, slideTo: 40 }); },
        charge() { A.tone(400, 0.06, { type: 'square', vol: 0.05, slideTo: 800 }); },
        jump() { A.tone(250, 0.1, { type: 'square', vol: 0.06, slideTo: 500 }); },
        hurt() { A.tone(300, 0.15, { type: 'square', vol: 0.12, slideTo: 100 }); },
        pick() { A.melody([[880, 0.05], [1175, 0.05], [1760, 0.1]], { type: 'square', vol: 0.1 }); },
        star() { A.tone(1400, 0.05, { type: 'triangle', vol: 0.07, slideTo: 900 }); },
        fire() { A.noise(0.25, { vol: 0.15, freq: 800, slideTo: 300 }); },
        bark() { A.tone(500, 0.06, { type: 'sawtooth', vol: 0.1, slideTo: 300 }); A.tone(450, 0.06, { type: 'sawtooth', vol: 0.1, slideTo: 280, delay: 0.1 }); },
        die() { A.melody([[392, 0.15], [330, 0.15], [262, 0.15], [196, 0.4]], { type: 'square', vol: 0.13 }); },
        clear() { A.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25], [784, 0.1], [1047, 0.4]], { type: 'square', vol: 0.13 }); },
        boss() { A.melody([[110, 0.15], [117, 0.15], [110, 0.15], [117, 0.15], [110, 0.4]], { type: 'sawtooth', vol: 0.12 }); },
        over() { A.melody([[330, 0.25], [294, 0.25], [262, 0.25], [247, 0.25], [220, 0.6]], { type: 'triangle', vol: 0.16 }); }
      };
      let hi = api.getHiScore(60000);
      let mode = 'attract', T = 0, coinFlash = 0, lastCred = api.credits, atT = 0;
      let score = 0, lives = 3, si = 0, loop = 0, timer = 0, nextExtend = 50000;
      let P = null, ents = [], shots = [], items = [], fx = [], camX = 0, spawnT = 0, bossOn = false, boss = null;
      let phase = 'play', phaseT = 0, bgOff = 0, musicT = 0, musicI = 0;

      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function addScore(n) {
        score += n; if (score > hi) hi = score;
        if (score >= nextExtend) { nextExtend += 70000; lives++; A.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.14]], { type: 'square', vol: 0.12 }); fx.push({ k: 'txt', s: '1UP', x: P.x, y: P.y - 50, t: 80, c: '#40ff40' }); }
      }
      const ST = () => STAGES[si];
      // ---------- terrain ----------
      function floorAt(x, y) { for (const f of ST().floors) if (x >= f.x0 && x <= f.x1 && Math.abs(f.y - y) < 0.5) return f; return null; }
      function floorBelow(x, y) { for (const f of ST().floors) if (x >= f.x0 && x <= f.x1 && f.y > y + 10) return true; return false; }
      function physics(b) {
        // b: x,y,vx,vy,onG,ignoreY
        if (b.onG) {
          if (!floorAt(b.x, b.y)) { b.onG = false; b.vy = 0; }
        }
        if (!b.onG) {
          const py = b.y;
          b.vy = Math.min(7, b.vy + GRAV); b.y += b.vy;
          if (b.vy >= 0) {
            for (const f of ST().floors) {
              if (b.x < f.x0 || b.x > f.x1) continue;
              if (b.ignoreT > 0 && Math.abs(f.y - b.ignoreY) < 1) continue;
              if (py <= f.y && b.y >= f.y) { b.y = f.y; b.vy = 0; b.onG = true; return true; }
            }
          }
        }
        return false;
      }
      // ---------- setup ----------
      function newGame() { score = 0; lives = 3; si = 0; loop = 0; nextExtend = 50000; mode = 'game'; startStage(); }
      function mkPlayer(x) {
        const f = floorAt(x, 212) ? 212 : ST().floors[0].y;
        return { x, y: f, vx: 0, vy: 0, onG: true, face: 1, hp: 16, state: 'stand', t: 0, anim: 0, inv: 90, charge: 0, att: null, hitSet: [], weapon: null, wT: 0, ignoreT: 0, ignoreY: 0 };
      }
      function startStage() {
        P = mkPlayer(40);
        ents = []; shots = []; fx = []; camX = 0; spawnT = 60; bossOn = false; boss = null; bgOff = 0;
        items = ST().items.map(([x, k]) => ({ k, x, y: ST().floors.filter(f => x >= f.x0 && x <= f.x1).reduce((m, f) => Math.min(m, f.y), 999) - 1, vy: 0 }));
        timer = 200; phase = 'intro'; phaseT = 0;
        A.melody([[330, 0.1], [392, 0.1], [494, 0.1], [587, 0.2], [494, 0.1], [587, 0.3]], { type: 'square', vol: 0.12 });
      }
      function respawn() {
        const x = Math.max(camX + 30, Math.min(camX + 120, P.x));
        let fx0 = x, best = null;
        for (let dx = 0; dx < 200 && !best; dx += 4) for (const f of ST().floors) if (fx0 + dx >= f.x0 + 8 && fx0 + dx <= f.x1 - 8 && f.y > 150) { best = { x: fx0 + dx, y: f.y }; break; }
        P = mkPlayer(best ? best.x : x); if (best) P.y = best.y;
        P.inv = 150; phase = 'play'; timer = Math.max(timer, 90);
        shots = [];
      }
      // ---------- enemies ----------
      function spawnEnemy(type, side) {
        const d = ETYPE[type];
        const x = side > 0 ? camX + W + 14 : camX - 14;
        // choose floor present at x
        const fl = ST().floors.filter(f => x >= f.x0 && x <= f.x1);
        let y;
        if (fl.length) y = fl[Math.random() * fl.length | 0].y;
        else { y = -10; }
        const e = { type, x, y, vx: 0, vy: 0, onG: y > 0, face: -side, hp: d.hp + (d.boss ? loop * 6 : 0), maxhp: d.hp + (d.boss ? loop * 6 : 0), d, state: 'walk', t: 0, anim: 0, cd: 40 + Math.random() * 60, sc: d.sc, inv: 0, ignoreT: 0, ignoreY: 0 };
        if (y < 0) { e.x = camX + 40 + Math.random() * (W - 80); e.y = HUD; e.onG = false; e.vy = 1; }
        ents.push(e);
        return e;
      }
      function spawnBoss() {
        bossOn = true;
        const t = ST().boss;
        const e = spawnEnemy(t, 1);
        e.x = camX + W - 40; e.y = HUD + 4; e.face = -1;
        e.onG = false; e.vy = 0; e.cd = 90;
        boss = e; sfx.boss();
      }
      function hurtPlayer(dmg, dir) {
        if (P.inv > 0 || P.state === 'dead') return;
        P.hp -= dmg; P.inv = 50; sfx.hurt();
        P.weapon = P.weapon === 'nunchaku' ? 'nunchaku' : null;
        if (P.weapon === 'knife') P.weapon = null;
        if (P.hp <= 0) { P.hp = 0; killPlayer(); return; }
        P.state = 'hit'; P.t = 16; P.vx = dir * 1.5; P.charge = 0;
      }
      function killPlayer() {
        P.state = 'dead'; P.t = 0; P.vy = -4; P.onG = false; phase = 'dying'; phaseT = 0; sfx.die();
      }
      function killEnemy(e, dir, big) {
        e.state = 'dying'; e.t = 0; e.vx = dir * (big ? 3 : 1.8); e.vy = -3.5; e.onG = false;
        addScore(e.d.pts * (big ? 2 : 1));
        fx.push({ k: 'txt', s: String(e.d.pts * (big ? 2 : 1)), x: e.x, y: e.y - 50, t: 40, c: '#fff' });
        if (Math.random() < 0.06 && !e.d.boss) items.push({ k: Math.random() < 0.6 ? 'cola' : 'clock', x: e.x, y: e.y - 1, vy: -2 });
      }
      function damageEnemy(e, dmg, dir, big) {
        if (e.state === 'dying' || e.inv > 0) return false;
        if (e.type === 'mirror' && e.fake) { killEnemy(e, dir, false); return true; }
        e.hp -= dmg; sfx.hit();
        fx.push({ k: 'spark', x: e.x - dir * 4, y: e.y - e.d.h * 0.6, t: 8 });
        if (e.hp <= 0) {
          killEnemy(e, dir, big);
          if (e.d.boss) { bossDefeated(e); }
        } else { e.inv = e.d.boss ? 18 : 10; e.state = 'hurt'; e.t = e.d.boss ? 10 : 16; e.vx = dir * (e.d.boss ? 0.6 : 1.6); addScore(50); }
        return true;
      }
      function bossDefeated(e) {
        for (const o of ents) if (o !== e && o.state !== 'dying') killEnemy(o, 1, false);
        shots = [];
        phase = 'bossdown'; phaseT = 0;
      }
      // attack box test
      function boxHits(a, f, x0, x1, top, bot, t) {
        // a's attack spans forward x0..x1, heights top..bot above a's feet; t's body spans heights 0..t.d.h
        const rx = (t.x - a.x) * f;
        if (rx < x0 - 6 * t.sc || rx > x1 + 6 * t.sc) return false;
        const aTop = a.y - top, aBot = a.y - bot, tTop = t.y - t.d.h, tBot = t.y;
        return aTop < tBot && aBot > tTop;
      }
      // ---------- player ----------
      function updPlayer() {
        const p = P;
        if (p.inv > 0) p.inv--;
        if (p.ignoreT > 0) p.ignoreT--;
        const lx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const up = api.key('ArrowUp'), dn = api.key('ArrowDown');
        if (p.state === 'hit') { p.x += p.vx; p.vx *= 0.85; physics(p); if (--p.t <= 0) p.state = p.onG ? 'stand' : 'jump'; clampP(); return; }
        // attacks in progress
        if (p.att) {
          p.att.t++;
          const at = p.att;
          if (at.t >= at.act0 && at.t <= at.act1) attackCheck(at);
          if (at.k === 'jk') { /* lasts while airborne */ }
          else if (at.t >= at.end) p.att = null;
        }
        // charge
        if (api.key('Space') && !p.att && p.charge >= 0) { p.charge++; if (p.charge === 40) sfx.charge(); }
        if (!api.key('Space') && p.charge > 0) {
          if (p.charge >= 40 && p.onG && !p.att) { startAtt('super'); sfx.superp(); }
          p.charge = 0;
        }
        if (api.pressed('Space') && !p.att) {
          p.charge = 1;
          if (!p.onG) startAtt('jk');
          else if (p.weapon === 'knife') { startAtt('throw'); }
          else if (dn) startAtt('low');
          else startAtt('punch');
        }
        // jump
        if (api.pressed('KeyX') && p.onG && (!p.att || p.att.k === 'punch' && p.att.t > 6)) {
          if (dn && floorAt(p.x, p.y) && floorBelow(p.x, p.y)) { p.ignoreT = 14; p.ignoreY = p.y; p.onG = false; p.vy = 1; }
          else { p.onG = false; p.vy = up ? -7.6 : -5.3; p.vx = lx * (up ? 1.2 : 1.5); sfx.jump(); }
          p.att = null;
        }
        if (p.onG) {
          const busy = p.att && p.att.k !== 'jk';
          if (!busy) {
            if (dn) { p.state = 'crouch'; }
            else if (lx) { p.x += lx * 1.35; p.face = lx; p.state = 'walk'; p.anim++; }
            else p.state = 'stand';
          }
          if (p.att && p.att.k === 'jk') p.att = null;
          physics(p);
        } else {
          p.state = 'jump';
          if (lx) { p.vx += lx * 0.15; p.vx = Math.max(-1.6, Math.min(1.6, p.vx)); p.face = lx; }
          p.x += p.vx;
          if (physics(p)) { if (p.att && p.att.k === 'jk') p.att = null; p.vx = 0; }
        }
        if (p.weapon && p.weapon !== 'knife') { if (--p.wT <= 0) p.weapon = null; }
        clampP();
        // fall to death
        if (p.y > H + 20 && p.state !== 'dead') { P.hp = 0; killPlayer(); }
        // items
        for (const it of items) if (!it.got && Math.abs(it.x - p.x) < 12 && Math.abs(it.y - p.y) < 20) {
          it.got = true; sfx.pick();
          if (it.k === 'cola') { p.hp = Math.min(16, p.hp + 6); addScore(500); }
          else if (it.k === 'clock') { timer += 30; addScore(500); }
          else if (it.k === 'nunchaku') { p.weapon = 'nunchaku'; p.wT = 60 * 25; addScore(300); }
          else if (it.k === 'knife') { p.weapon = 'knife'; addScore(300); }
          fx.push({ k: 'txt', s: it.k.toUpperCase(), x: it.x, y: it.y - 30, t: 50, c: '#ffe040' });
        }
        items = items.filter(it => !it.got && it.x > camX - 40);
      }
      function clampP() { P.x = Math.max(camX + 8, Math.min(camX + W - 8, P.x)); }
      function startAtt(k) {
        const nun = P.weapon === 'nunchaku';
        const D = {
          punch: { act0: 3, act1: 7, end: 13, x0: 0, x1: nun ? 34 : 24, top: 38, bot: 18, dmg: nun ? 2 : 1 },
          low: { act0: 3, act1: 8, end: 14, x0: 0, x1: nun ? 32 : 26, top: 16, bot: -2, dmg: nun ? 2 : 1 },
          jk: { act0: 2, act1: 999, end: 999, x0: -4, x1: 26, top: 34, bot: -4, dmg: 2 },
          super: { act0: 2, act1: 10, end: 22, x0: -6, x1: 44, top: 46, bot: 0, dmg: 4, big: true },
          throw: { act0: 4, act1: 4, end: 12, x0: 0, x1: 0, top: 0, bot: 0, dmg: 0 }
        }[k];
        P.att = Object.assign({ k, t: 0, hit: [] }, D);
        if (k === 'throw') shots.push({ k: 'knife', x: P.x + P.face * 10, y: P.y - 28, vx: P.face * 4.5, vy: 0, from: 'p', t: 0 });
        sfx.swish();
        if (k === 'super') fx.push({ k: 'flash', x: P.x + P.face * 22, y: P.y - 26, t: 12 });
      }
      function attackCheck(at) {
        for (const e of ents) {
          if (e.state === 'dying' || at.hit.includes(e)) continue;
          if (boxHits(P, P.face, at.x0, at.x1, at.top, at.bot, e)) {
            at.hit.push(e);
            damageEnemy(e, at.dmg + (at.big && !e.d.boss ? 9 : 0), P.face, !!at.big);
          }
        }
        // punch shurikens / fireballs away
        for (const s of shots) {
          if (s.from === 'p' || s.dead) continue;
          const rx = (s.x - P.x) * P.face;
          if (rx > at.x0 - 6 && rx < at.x1 + 6 && s.y > P.y - at.top - 6 && s.y < P.y - at.bot + 6) { s.dead = true; addScore(50); fx.push({ k: 'spark', x: s.x, y: s.y, t: 6 }); }
        }
      }
      // ---------- enemy AI ----------
      function enemyAttack(e, reach, dmg, top, bot) {
        if (P.state === 'dead') return;
        const t = { x: P.x, y: P.y, d: { h: 40 }, sc: 1 };
        if (boxHits(e, e.face, 0, reach, top, bot, t)) hurtPlayer(dmg, e.face);
      }
      function sameTier(e) { return Math.abs(e.y - P.y) < 12; }
      function updEnemy(e) {
        if (e.inv > 0) e.inv--;
        if (e.ignoreT > 0) e.ignoreT--;
        e.t++;
        if (e.state === 'dying') { e.x += e.vx; e.vy += GRAV; e.y += e.vy; if (e.y > H + 60) e.gone = true; return; }
        if (e.state === 'hurt') { e.x += e.vx; e.vx *= 0.85; physics(e); if (e.t > (e.d.boss ? 10 : 16)) { e.state = 'walk'; e.t = 0; } return; }
        const dx = P.x - e.x, adx = Math.abs(dx), dir = Math.sign(dx) || 1;
        if (e.y > H + 20) { e.gone = true; return; }
        switch (e.type) {
          case 'dog': dogAI(e, dx, adx, dir); break;
          case 'karnov': karnovAI(e, dx, adx, dir); break;
          case 'claw': clawAI(e, dx, adx, dir); break;
          case 'mirror': case 'clone': mirrorAI(e, dx, adx, dir); break;
          case 'giant': giantAI(e, dx, adx, dir); break;
          case 'dragon': dragonAI(e, dx, adx, dir); break;
          default: ninjaAI(e, dx, adx, dir);
        }
        if (!e.d.boss && (e.x < camX - 120 || e.x > camX + W + 120)) e.gone = true;
        if (e.d.boss) e.x = Math.max(camX + 10, Math.min(camX + W - 10, e.x));
      }
      function walkPhys(e) { e.x += e.vx; physics(e); }
      function ninjaAI(e, dx, adx, dir) {
        e.cd--;
        if (e.state === 'att') {
          if (e.t === 10) { sfx.swish(); }
          if (e.t >= 10 && e.t <= 14) { if (!e.didHit) { const r = e.d.nun ? 30 : 22; const before = P.hp; enemyAttack(e, r, e.d.nun ? 3 : 2, 36, 14); if (P.hp !== before) e.didHit = true; } }
          if (e.t > 22) { e.state = 'walk'; e.t = 0; e.cd = 40 + Math.random() * 50 - loop * 8; }
          e.vx = 0; physics(e); return;
        }
        if (e.state === 'throw') {
          if (e.t === 12) { shots.push({ k: 'star', x: e.x + e.face * 10, y: e.y - 26, vx: e.face * 2.6, vy: 0, from: 'e', t: 0 }); sfx.star(); }
          if (e.t > 24) { e.state = 'walk'; e.t = 0; e.cd = 70 + Math.random() * 60; }
          e.vx = 0; physics(e); return;
        }
        if (!e.onG) { walkPhys(e); return; }
        e.face = dir;
        const same = sameTier(e);
        if (e.d.ranged && same && adx > 60 && adx < 170 && e.cd <= 0) { e.state = 'throw'; e.t = 0; return; }
        if (e.d.flips && e.cd <= 0 && adx < 90 && adx > 30 && same) { e.onG = false; e.vy = -5.5; e.vx = dir * 2.2; e.state = 'walk'; e.cd = 60; return; }
        if (same) {
          if (adx > 20) { e.vx = dir * e.d.sp * (1 + loop * 0.15); }
          else { e.vx = 0; if (e.cd <= 0) { e.state = 'att'; e.t = 0; e.didHit = false; return; } }
          if (e.d.ranged && adx < 60) e.vx = -dir * e.d.sp;
        } else {
          // change tiers: jump up or drop down near the player
          e.vx = dir * e.d.sp;
          if (adx < 50 && e.cd <= 0) {
            if (P.y < e.y - 20 && floorBelowAbove(e)) { e.onG = false; e.vy = -7.6; e.vx = dir * 0.8; e.cd = 60; }
            else if (P.y > e.y + 20 && floorBelow(e.x, e.y)) { e.ignoreT = 14; e.ignoreY = e.y; e.onG = false; e.vy = 1; e.cd = 60; }
          }
        }
        e.anim++;
        walkPhys(e);
      }
      function floorBelowAbove(e) { for (const f of ST().floors) if (e.x >= f.x0 && e.x <= f.x1 && f.y < e.y - 20 && f.y > e.y - 90) return true; return false; }
      function dogAI(e, dx, adx, dir) {
        if (e.onG) {
          if (e.state !== 'run') { e.state = 'run'; e.face = dir; }
          e.vx = e.face * e.d.sp * (1 + loop * 0.1);
          if (adx < 46 && sameTier(e) && Math.sign(dx) === e.face && e.cd <= 0) { e.onG = false; e.vy = -4; e.cd = 80; sfx.bark(); }
          if (Math.sign(dx) !== e.face && adx > 70) e.face = dir;
        }
        e.anim += 2;
        walkPhys(e);
        if (Math.abs(P.x - e.x) < 12 && P.y - e.y > -20 && P.y - e.y < 40 && Math.abs(P.y - e.y) < 30) {
          const pTop = P.y - (P.state === 'crouch' ? 20 : 40);
          if (e.y > pTop && e.y - 12 < P.y) hurtPlayer(2, e.face);
        }
        e.cd--;
      }
      function karnovAI(e, dx, adx, dir) {
        e.face = dir; e.cd--;
        if (e.state === 'breath') {
          if (e.t % 10 === 0 && e.t <= 30) { shots.push({ k: 'fire', x: e.x + e.face * 22, y: e.y - 56, vx: e.face * 2.4, vy: 0.25, from: 'e', t: 0 }); sfx.fire(); }
          if (e.t > 50) { e.state = 'walk'; e.t = 0; e.cd = 80 - loop * 10; }
          physics(e); return;
        }
        if (!e.onG) { walkPhys(e); if (e.onG) { A.noise(0.2, { vol: 0.2, freq: 200 }); fx.push({ k: 'shake', t: 12 }); } return; }
        if (e.cd <= 0) {
          if (Math.random() < 0.65) { e.state = 'breath'; e.t = 0; }
          else { e.onG = false; e.vy = -6.5; e.vx = dir * 1.6; e.cd = 60; }
          return;
        }
        e.vx = adx > 40 ? dir * e.d.sp : 0; e.anim++;
        walkPhys(e);
        if (adx < 22 && Math.abs(P.y - e.y) < 30) hurtPlayer(3, dir);
      }
      function clawAI(e, dx, adx, dir) {
        e.cd--;
        if (e.state === 'att') {
          if (e.t >= 8 && e.t <= 13) enemyAttack(e, 32, 3, 40, 10);
          if (e.t > 20) { e.state = 'walk'; e.t = 0; e.cd = 30 + Math.random() * 30; }
          physics(e); return;
        }
        if (!e.onG) { walkPhys(e); if (e.vy > 0 && adx < 30 && Math.abs(P.y - e.y) < 30) hurtPlayer(3, dir); return; }
        e.face = dir;
        if (e.cd <= 0) {
          if (adx < 34) { e.state = 'att'; e.t = 0; return; }
          if (Math.random() < 0.5) { e.onG = false; e.vy = -6.8; e.vx = dir * Math.min(3, adx / 30); e.cd = 50; return; }
        }
        e.vx = adx > 26 ? dir * e.d.sp : -dir * 0.6; e.anim++;
        walkPhys(e);
      }
      function mirrorAI(e, dx, adx, dir) {
        e.cd--;
        if (e.type === 'mirror' && !e.fake && e.cd <= -200) {
          e.cd = 60;
          for (let i = 0; i < 2; i++) { const c = spawnEnemy('mirror', 1); c.fake = true; c.d = ETYPE.clone; c.hp = 1; c.x = camX + 40 + Math.random() * (W - 80); c.y = e.y; c.onG = false; c.vy = -4; c.inv = 20; }
          fx.push({ k: 'flash', x: e.x, y: e.y - 20, t: 10 });
          A.tone(800, 0.3, { type: 'sine', vol: 0.1, slideTo: 200 });
        }
        if (e.state === 'throw') {
          if (e.t === 10) { shots.push({ k: 'star', x: e.x + e.face * 10, y: e.y - 28, vx: e.face * 2.8, vy: 0, from: 'e', t: 0 }); sfx.star(); }
          if (e.t > 20) { e.state = 'walk'; e.t = 0; }
          physics(e); return;
        }
        if (e.state === 'att') {
          if (e.t >= 8 && e.t <= 12) enemyAttack(e, 26, 2, 36, 12);
          if (e.t > 18) { e.state = 'walk'; e.t = 0; }
          physics(e); return;
        }
        e.face = dir;
        if (!e.onG) { walkPhys(e); return; }
        if (e.t > 40 && Math.random() < 0.03) { e.state = adx < 30 ? 'att' : 'throw'; e.t = 0; return; }
        e.vx = adx > 50 ? dir * e.d.sp : adx < 30 ? -dir * e.d.sp * 0.6 : 0; e.anim++;
        walkPhys(e);
      }
      function giantAI(e, dx, adx, dir) {
        e.cd--; e.face = dir;
        if (e.state === 'att') {
          if (e.t >= 14 && e.t <= 18) enemyAttack(e, 40, 4, 64, 10);
          if (e.t > 30) { e.state = 'walk'; e.t = 0; e.cd = 40; }
          physics(e); return;
        }
        if (e.state === 'charge') {
          e.vx = e.face * 3; walkPhys(e);
          if (adx < 20 && Math.abs(P.y - e.y) < 30) hurtPlayer(4, e.face);
          if (e.t > 50) { e.state = 'walk'; e.t = 0; e.cd = 60; }
          return;
        }
        if (e.cd <= 0 && adx < 44) { e.state = 'att'; e.t = 0; return; }
        if (e.cd <= 0 && adx > 100 && Math.random() < 0.02) { e.state = 'charge'; e.t = 0; A.noise(0.3, { vol: 0.15, freq: 300 }); return; }
        e.vx = dir * e.d.sp; e.anim++;
        walkPhys(e);
      }
      function dragonAI(e, dx, adx, dir) {
        e.cd--; e.face = dir;
        if (e.state === 'vanish') {
          if (e.t === 30) { e.x = camX + (P.x - camX > W / 2 ? 40 : W - 40); e.y = 168; e.onG = false; e.vy = -2; }
          if (e.t > 40) { e.state = 'walk'; e.t = 0; e.cd = 30; }
          return;
        }
        if (e.state === 'throw') {
          if (e.t === 10) { for (let i = -1; i <= 1; i++) shots.push({ k: 'star', x: e.x + e.face * 10, y: e.y - 30, vx: e.face * 2.8, vy: i * 0.6, from: 'e', t: 0 }); sfx.star(); }
          if (e.t > 22) { e.state = 'walk'; e.t = 0; e.cd = 50 - loop * 8; }
          physics(e); return;
        }
        if (e.state === 'att') {
          if (e.t >= 8 && e.t <= 12) enemyAttack(e, 34, 3, 40, 10);
          if (e.t > 20) { e.state = 'walk'; e.t = 0; e.cd = 40; }
          physics(e); return;
        }
        if (!e.onG) { walkPhys(e); return; }
        if (e.cd <= 0) {
          const r = Math.random();
          if (adx < 36) { e.state = 'att'; e.t = 0; }
          else if (r < 0.5) { e.state = 'throw'; e.t = 0; }
          else if (r < 0.75) { e.state = 'vanish'; e.t = 0; A.tone(1200, 0.3, { type: 'sine', vol: 0.08, slideTo: 300 }); }
          else { e.onG = false; e.vy = -6; e.vx = dir * 2; e.cd = 40; }
          return;
        }
        e.vx = adx > 60 ? dir * e.d.sp : 0; e.anim++;
        walkPhys(e);
      }
      // ---------- shots ----------
      function updShots() {
        for (const s of shots) {
          s.t++; s.x += s.vx; s.y += s.vy;
          if (s.k === 'fire') s.vy *= 0.98;
          if (s.from === 'p') {
            for (const e of ents) if (e.state !== 'dying' && Math.abs(e.x - s.x) < 10 && s.y > e.y - e.d.h && s.y < e.y) { damageEnemy(e, 2, Math.sign(s.vx), false); s.dead = true; break; }
          } else if (P.state !== 'dead' && Math.abs(P.x - s.x) < 8 && s.y > P.y - (P.state === 'crouch' ? 22 : 42) && s.y < P.y) { hurtPlayer(s.k === 'fire' ? 3 : 2, Math.sign(s.vx)); s.dead = true; }
          if (s.x < camX - 20 || s.x > camX + W + 20 || s.t > 300) s.dead = true;
        }
        shots = shots.filter(s => !s.dead);
      }
      // ---------- game loop ----------
      function updGame() {
        T++;
        for (const f of fx) f.t--;
        fx = fx.filter(f => f.t > 0);
        if (ST().moving) bgOff += 4;
        if (phase === 'intro') { phaseT++; if (phaseT > 120) phase = 'play'; return; }
        if (phase === 'dying') {
          phaseT++;
          P.vy += GRAV * 0.6; P.y += P.vy;
          if (phaseT === 120) {
            lives--;
            if (lives > 0) respawn();
            else {
              api.setHiScore(score);
              const over = () => { mode = 'over'; T = 0; sfx.over(); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over();
            }
          }
          return;
        }
        if (phase === 'bossdown') {
          phaseT++;
          for (const e of ents) updEnemy(e);
          ents = ents.filter(e => !e.gone);
          if (phaseT === 60) sfx.clear();
          if (phaseT > 90 && timer > 0) { timer = Math.max(0, timer - 2); addScore(100); if (timer % 10 === 0) A.tone(1300, 0.02, { type: 'square', vol: 0.05 }); }
          if (phaseT > 90 && timer <= 0 && phaseT > 240) {
            if (si === STAGES.length - 1) { phase = 'ending'; phaseT = 0; }
            else { si++; startStage(); }
          }
          return;
        }
        if (phase === 'ending') { phaseT++; if (phaseT > 900 || (phaseT > 300 && api.anyPressed('Enter'))) { loop++; si = 0; startStage(); } return; }
        // play
        if (T % 60 === 0) { timer--; if (timer <= 0) { timer = 0; killPlayer(); return; } }
        updPlayer();
        if (phase !== 'play') return;
        const maxCam = ST().len - W;
        if (P.x > camX + 110) camX = Math.min(maxCam, P.x - 110);
        if (!bossOn && camX >= maxCam - 0.5) spawnBoss();
        // spawns
        if (!bossOn) {
          if (--spawnT <= 0) {
            const alive = ents.filter(e => e.state !== 'dying').length;
            if (alive < 4 + Math.min(3, si + loop)) {
              const mix = ST().mix, t = mix[Math.random() * mix.length | 0];
              spawnEnemy(t, Math.random() < 0.72 ? 1 : -1);
            }
            spawnT = Math.max(28, 80 - si * 8 - loop * 10) + Math.random() * 40;
          }
        } else if (ST().boss !== 'mirror' && ents.length < 3 && Math.random() < 0.004 + si * 0.001) {
          spawnEnemy(ST().mix[0], Math.random() < 0.5 ? 1 : -1);
        }
        for (const e of ents) updEnemy(e);
        ents = ents.filter(e => !e.gone);
        if (bossOn && boss && !ents.includes(boss) && phase === 'play') spawnBoss();
        updShots();
        for (const it of items) { if (it.vy !== 0 || !floorAt(it.x, it.y)) { const b = { x: it.x, y: it.y, vy: it.vy, onG: false, ignoreT: 0 }; physics(b); it.y = b.y; it.vy = b.onG ? 0 : b.vy; if (it.y > H + 10) it.got = true; } }
        musicTick();
      }
      function musicTick() {
        if (--musicT > 0) return;
        musicT = 12;
        const bass = [82, 82, 98, 82, 110, 98, 82, 73];
        const mel = [330, 0, 392, 330, 0, 294, 330, 0, 440, 0, 392, 330, 294, 0, 262, 294];
        const b = bass[(musicI >> 1) % 8], m = mel[musicI % 16];
        if (musicI % 2 === 0) A.tone(b, 0.18, { type: 'triangle', vol: 0.1 });
        if (m && (musicI >> 4) % 2 === 1) A.tone(m, 0.1, { type: 'square', vol: 0.035 });
        musicI++;
      }
      function update() {
        if (api.credits > lastCred) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          T++; atT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCred = api.credits; newGame(); }
            else { coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        if (mode === 'over') { T++; if (T > 300 || (T > 90 && api.anyPressed('Enter'))) { mode = 'attract'; atT = 0; } return; }
        updGame();
      }
      // ---------- rendering ----------
      function drawBg(ctx) {
        const bg = ST().bg;
        const c0 = Math.floor(camX / 64) - 1;
        if (bg === 'street') {
          ctx.fillStyle = '#101028'; ctx.fillRect(0, HUD, W, 120);
          ctx.fillStyle = '#e8e8c0'; for (let i = 0; i < 25; i++) ctx.fillRect(Math.round((hash(i) * 600 - camX * 0.1) % W + W) % W, HUD + 4 + Math.round(hash(i + 9) * 50), 1, 1);
          for (let i = Math.floor(camX * 0.3 / 36) - 1; i < Math.floor(camX * 0.3 / 36) + 9; i++) {
            const h = 50 + hash(i * 5) * 60, x = Math.round(i * 36 - camX * 0.3);
            ctx.fillStyle = '#242440'; ctx.fillRect(x, 150 - h, 34, h);
            ctx.fillStyle = '#d0c060'; for (let y = 156 - h; y < 146; y += 8) for (let k = 0; k < 4; k++) if (hash(i * 97 + y * 3 + k) < 0.35) ctx.fillRect(x + 4 + k * 8, y, 3, 4);
          }
          ctx.fillStyle = '#3a3a48'; ctx.fillRect(0, 150, W, 62);
          ctx.fillStyle = '#2a2a38'; for (let c = c0; c < c0 + 7; c++) { const x = Math.round(c * 64 - camX); ctx.fillRect(x, 150, 2, 62); ctx.fillStyle = '#6a3a28'; ctx.fillRect(x + 10, 170, 20, 42); ctx.fillStyle = '#2a2a38'; }
          ctx.fillStyle = '#505058'; ctx.fillRect(0, 212, W, H - 212);
          ctx.fillStyle = '#c0c040'; for (let c = c0 * 2; c < c0 * 2 + 14; c++) ctx.fillRect(Math.round(c * 32 - camX), 228, 16, 2);
          ctx.fillStyle = '#707078'; ctx.fillRect(0, 212, W, 3);
        } else if (bg === 'trucks') {
          ctx.fillStyle = '#e09050'; ctx.fillRect(0, HUD, W, 60); ctx.fillStyle = '#f0c080'; ctx.fillRect(0, HUD + 60, W, 40);
          ctx.fillStyle = '#806040'; for (let i = 0; i < 10; i++) { const x = Math.round(((i * 70 - bgOff * 0.2 - camX * 0.2) % 700 + 700) % 700 - 60); ctx.fillRect(x, 100, 40, 26); ctx.fillRect(x + 10, 90, 20, 10); }
          ctx.fillStyle = '#404048'; ctx.fillRect(0, 126, W, H - 126);
          ctx.fillStyle = '#e0e0e0'; for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(((i * 48 - bgOff - camX) % 384 + 384) % 384 - 64), 222, 24, 3);
        } else if (bg === 'sewer') {
          ctx.fillStyle = '#1a2a24'; ctx.fillRect(0, HUD, W, H - HUD);
          for (let c = c0; c < c0 + 7; c++) {
            const x = Math.round(c * 64 - camX);
            ctx.fillStyle = '#2a3a30'; ctx.fillRect(x, HUD, 62, 186);
            ctx.fillStyle = '#223228'; for (let y = HUD + 8; y < 212; y += 12) ctx.fillRect(x, y, 62, 1);
            ctx.fillStyle = '#101a14'; ctx.fillRect(x + 20, 60, 24, 24); ctx.fillStyle = '#405048'; ctx.fillRect(x + 20, 60, 24, 2); ctx.fillRect(x + 31, 60, 2, 24); ctx.fillRect(x + 20, 71, 24, 2);
            if (hash(c) < 0.4) { ctx.fillStyle = '#50a060'; ctx.fillRect(x + 30, 84, 4, 20 + ((T >> 3) % 4) * 4); }
          }
          ctx.fillStyle = '#2a5040'; ctx.fillRect(0, 212, W, H - 212);
          ctx.fillStyle = '#3a7058'; for (let i = 0; i < 10; i++) ctx.fillRect(Math.round(((i * 30 - T * 0.5 - camX) % 300 + 300) % 300 - 20), 220 + (i % 3) * 6, 12, 1);
        } else if (bg === 'forest') {
          ctx.fillStyle = '#80b0e0'; ctx.fillRect(0, HUD, W, 80);
          ctx.fillStyle = '#5a8a50'; for (let i = Math.floor(camX * 0.3 / 30) - 1; i < Math.floor(camX * 0.3 / 30) + 11; i++) { const h = 30 + hash(i) * 30; ctx.fillRect(Math.round(i * 30 - camX * 0.3), HUD + 80 - h, 30, h + 10); }
          ctx.fillStyle = '#2a5a2a'; ctx.fillRect(0, HUD + 86, W, 130);
          for (let c = c0; c < c0 + 7; c++) {
            const x = Math.round(c * 64 - camX) + Math.round(hash(c * 3) * 30);
            ctx.fillStyle = '#4a2a10'; ctx.fillRect(x, HUD + 30, 9, 160);
            ctx.fillStyle = '#1a6a1a'; ctx.fillRect(x - 16, HUD + 18, 40, 30); ctx.fillStyle = '#2a8a2a'; ctx.fillRect(x - 10, HUD + 10, 28, 18);
          }
          ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, 212, W, H - 212); ctx.fillStyle = '#4a8a2a'; ctx.fillRect(0, 212, W, 4);
        } else {
          ctx.fillStyle = '#c0d0f0'; ctx.fillRect(0, HUD, W, 70);
          ctx.fillStyle = '#90a0b0'; for (let i = 0; i < 8; i++) { const x = Math.round(((i * 90 - bgOff * 0.3) % 720 + 720) % 720 - 80); ctx.fillRect(x, 70, 50, 26); ctx.fillRect(x + 12, 56, 26, 14); }
          ctx.fillStyle = '#7a9a5a'; ctx.fillRect(0, 96, W, 110);
          ctx.fillStyle = '#5a7a3a'; for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(((i * 40 - bgOff) % 480 + 480) % 480 - 40), 120 + (i % 4) * 18, 20, 4);
          ctx.fillStyle = '#6a5040'; ctx.fillRect(0, 206, W, H - 206);
          ctx.fillStyle = '#909090'; ctx.fillRect(0, 214, W, 3);
          ctx.fillStyle = '#4a3020'; for (let i = 0; i < 14; i++) ctx.fillRect(Math.round(((i * 20 - bgOff * 2) % 280 + 280) % 280 - 20), 217, 10, 6);
        }
        // floors
        for (const f of ST().floors) {
          const x0 = Math.round(f.x0 - camX), x1 = Math.round(f.x1 - camX);
          if (x1 < 0 || x0 > W) continue;
          if (bg === 'trucks') {
            if (f.y === 176) {
              ctx.fillStyle = '#d8d8e0'; ctx.fillRect(x0, 176, x1 - x0, 40); ctx.fillStyle = '#a0a0b0'; ctx.fillRect(x0, 176, x1 - x0, 3);
              ctx.fillStyle = '#c03030'; ctx.fillRect(x0 + 10, 186, Math.max(0, x1 - x0 - 20), 10);
              text(ctx, 'DE TRANS', (x0 + x1) / 2, 188, '#fff', 1, 'center');
              ctx.fillStyle = '#202020'; for (let w = x0 + 20; w < x1 - 10; w += 60) { ctx.fillRect(w, 214, 14, 14); ctx.fillStyle = '#808080'; ctx.fillRect(w + 5, 219, 4, 4); ctx.fillStyle = '#202020'; }
            } else { ctx.fillStyle = '#3060c0'; ctx.fillRect(x0, f.y, x1 - x0, 56); ctx.fillStyle = '#80c0f0'; ctx.fillRect(x0 + 6, f.y + 8, 20, 14); ctx.fillStyle = '#2050a0'; ctx.fillRect(x0, f.y, x1 - x0, 3); }
          } else if (bg === 'train') {
            ctx.fillStyle = '#8a3020'; ctx.fillRect(x0, f.y, x1 - x0, 46); ctx.fillStyle = '#6a2010'; for (let x = x0; x < x1; x += 12) ctx.fillRect(x, f.y + 4, 2, 42);
            ctx.fillStyle = '#4a4a4a'; ctx.fillRect(x0, f.y, x1 - x0, 3);
            ctx.fillStyle = '#202020'; for (let w = x0 + 20; w < x1 - 10; w += 80) ctx.fillRect(w, f.y + 44, 18, 8);
          } else if (f.y < 200) {
            const c = bg === 'sewer' ? ['#506858', '#3a5040'] : bg === 'forest' ? ['#7a5a3a', '#4a8a2a'] : ['#8a7a6a', '#5a4a3a'];
            ctx.fillStyle = c[0]; ctx.fillRect(x0, f.y, x1 - x0, 10); ctx.fillStyle = c[1]; ctx.fillRect(x0, f.y, x1 - x0, 2);
            ctx.fillStyle = c[0]; for (let x = x0 + 8; x < x1; x += 48) ctx.fillRect(x, f.y + 10, 5, 212 - f.y - 10);
          }
        }
      }
      function drawItem(ctx, it) {
        const x = Math.round(it.x - camX), y = Math.round(it.y);
        const bob = (T >> 4) & 1;
        if (it.k === 'cola') { ctx.fillStyle = '#e02020'; ctx.fillRect(x - 3, y - 10 - bob, 6, 10); ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 7 - bob, 6, 2); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 3, y - 11 - bob, 6, 1); }
        else if (it.k === 'clock') { ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 5, y - 11 - bob, 10, 10); ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 9 - bob, 6, 6); ctx.fillStyle = '#000'; ctx.fillRect(x, y - 8 - bob, 1, 3); ctx.fillRect(x, y - 6 - bob, 2, 1); }
        else if (it.k === 'nunchaku') { ctx.fillStyle = '#a06020'; ctx.fillRect(x - 7, y - 4 - bob, 6, 2); ctx.fillRect(x + 1, y - 8 - bob, 2, 6); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 1, y - 5 - bob, 2, 1); }
        else if (it.k === 'knife') { ctx.fillStyle = '#e0e0f0'; ctx.fillRect(x - 5, y - 4 - bob, 8, 2); ctx.fillStyle = '#6a4020'; ctx.fillRect(x + 3, y - 4 - bob, 3, 2); }
      }
      function drawDog(ctx, e, x, y) {
        const f = e.face, leg = (e.anim >> 2) & 1;
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(x - 10, y - 11, 18, 6);
        ctx.fillRect(x + f * 8 - 3, y - 14, 7, 6);
        ctx.fillRect(x + f * 12 - (f < 0 ? 3 : 0), y - 11, 4, 3);
        ctx.fillRect(x - f * 11 - 1, y - 13, 3, 2);
        const L = e.onG ? (leg ? [-8, 4] : [-5, 7]) : [-10, 10];
        ctx.fillRect(x + L[0], y - 5, 2, 5); ctx.fillRect(x + L[1], y - 5, 2, 5); ctx.fillRect(x + L[0] + 3, y - 5, 2, 5); ctx.fillRect(x + L[1] - 3, y - 5, 2, 5);
        ctx.fillStyle = '#ff2020'; ctx.fillRect(x + f * 9, y - 12, 1, 1);
        ctx.fillStyle = '#fff'; ctx.fillRect(x + f * 12, y - 9, 1, 1);
      }
      function poseFor(e) {
        if (e.state === 'dying') return POSE.fall;
        if (e.state === 'hurt') return POSE.hit;
        if (!e.onG) return e.d && e.d.flips ? POSE.flip : (e.type === 'claw' || e.type === 'dragon') && e.vy > 0 ? POSE.kick : POSE.jump;
        if (e.state === 'att') return e.t < 8 ? POSE.punchW : e.type === 'giant' || e.type === 'claw' || e.d.nun ? POSE.punch : (e.t & 16 ? POSE.kick : POSE.punch);
        if (e.state === 'throw') return e.t < 10 ? POSE.throwW : POSE.throwS;
        if (e.state === 'breath') return POSE.breath;
        if (e.state === 'charge') return POSE[(e.t >> 2) & 1 ? 'run0' : 'run1'];
        if (Math.abs(e.vx) > 0.05) return POSE[['walk0', 'walk1', 'walk2', 'walk1'][(e.anim >> 3) & 3]];
        return (T >> 5) & 1 ? POSE.stand2 : POSE.stand;
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x - camX), y = Math.round(e.y);
        if (e.inv > 0 && (e.inv >> 1) & 1 && e.d.boss) return;
        if (e.type === 'dog') { if (e.state === 'dying') { ctx.save(); ctx.globalAlpha = 0.7; drawDog(ctx, e, x, y); ctx.restore(); } else drawDog(ctx, e, x, y); return; }
        if (e.state === 'vanish') { if (e.t < 30 && (e.t >> 1) & 1) drawMan(ctx, x, y, e.face, POSE.stand, PAL.dragon, e.sc); return; }
        const pal = PAL[e.type] || PAL.ninja;
        if (e.fake && (T >> 2) % 5 === 0) return;
        const r = drawMan(ctx, x, y, e.face, poseFor(e), pal, e.sc);
        if (e.d.nun && e.state === 'att' && e.t >= 8) { seg(ctx, r.front.x, r.front.y, r.front.x + e.face * 10, r.front.y - 4 + ((T >> 1) & 1) * 6, 2, '#a06020'); }
        if (e.type === 'claw') { ctx.fillStyle = '#e0e0e0'; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(r.front.x + e.face * (2 + i)), Math.round(r.front.y - 2 + i * 2), e.face * 6, 1); }
        if (e.type === 'karnov') { ctx.fillStyle = '#202020'; ctx.fillRect(Math.round(r.head.x - 4), Math.round(r.head.y + 2), 8, 2); }
        if (e.type === 'giant') { ctx.fillStyle = '#c0c8d0'; ctx.fillRect(Math.round(r.head.x - 6), Math.round(r.head.y - 7), 12, 5); ctx.fillStyle = '#e04040'; ctx.fillRect(Math.round(r.head.x - 1), Math.round(r.head.y - 11), 2, 4); }
        if (e.type === 'dragon') { ctx.fillStyle = '#e0b020'; ctx.fillRect(Math.round(r.head.x - 4), Math.round(r.head.y - 2), 8, 1); }
      }
      function drawPlayer(ctx) {
        const p = P, x = Math.round(p.x - camX), y = Math.round(p.y);
        if (p.inv > 0 && (p.inv >> 2) & 1 && p.state !== 'dead') return;
        let pose;
        if (p.state === 'dead') pose = POSE.fall;
        else if (p.state === 'hit') pose = POSE.hit;
        else if (p.att) {
          const k = p.att.k, t = p.att.t;
          pose = k === 'punch' ? (t < 3 ? POSE.punchW : POSE.punch) : k === 'low' ? POSE.lowkick : k === 'jk' ? POSE.jumpkick : k === 'super' ? POSE.superp : (t < 4 ? POSE.throwW : POSE.throwS);
        } else if (!p.onG) pose = POSE.jump;
        else if (p.charge >= 40) pose = POSE.charge;
        else if (p.state === 'crouch') pose = POSE.crouch;
        else if (p.state === 'walk') pose = POSE[['walk0', 'walk1', 'walk2', 'walk1'][(p.anim >> 3) & 3]];
        else pose = (T >> 5) & 1 ? POSE.stand2 : POSE.stand;
        const r = drawMan(ctx, x, y, p.face, pose, PAL.dude, 1.12);
        if (p.weapon === 'nunchaku') seg(ctx, r.front.x, r.front.y, r.front.x + p.face * (p.att ? 12 : 3), r.front.y + (p.att ? -2 : 9), 2, '#a06020');
        if (p.charge >= 40 && (T >> 1) & 1) { ctx.fillStyle = (T >> 2) & 1 ? '#ffff80' : '#ff8020'; ctx.fillRect(Math.round(r.front.x - 3), Math.round(r.front.y - 3), 6, 6); }
      }
      function drawShot(ctx, s) {
        const x = Math.round(s.x - camX), y = Math.round(s.y);
        if (s.k === 'star') { ctx.fillStyle = '#e0e0f0'; const r = (s.t >> 2) & 1; if (r) { ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7); } else { for (let i = -2; i <= 2; i++) { ctx.fillRect(x + i, y + i, 1, 1); ctx.fillRect(x + i, y - i, 1, 1); } } ctx.fillRect(x - 1, y - 1, 3, 3); }
        else if (s.k === 'fire') { ctx.fillStyle = (s.t >> 2) & 1 ? '#ffe040' : '#ff6020'; ctx.fillRect(x - 5, y - 4, 10, 8); ctx.fillStyle = '#fff8c0'; ctx.fillRect(x - 2, y - 2, 4, 4); }
        else if (s.k === 'knife') { ctx.fillStyle = '#e0e0f0'; ctx.fillRect(x - 5, y, 8, 2); ctx.fillStyle = '#6a4020'; ctx.fillRect(s.vx > 0 ? x - 7 : x + 3, y, 3, 2); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUD);
        text(ctx, '1P', 4, 3, '#40a0ff'); text(ctx, String(score).padStart(7, '0'), 18, 3, '#fff');
        text(ctx, 'HI', 70, 3, '#ff4040'); text(ctx, String(hi).padStart(7, '0'), 84, 3, '#fff');
        text(ctx, 'LV' + (si + 1), 142, 3, '#ffe040');
        text(ctx, 'TIME ' + String(Math.max(0, timer)).padStart(3, '0'), W - 4, 3, timer < 30 && (T >> 3) & 1 ? '#ff3030' : '#fff', 1, 'right');
        for (let i = 0; i < 16; i++) { ctx.fillStyle = P && i < P.hp ? (P.hp <= 4 ? '#ff3030' : '#40e040') : '#203020'; ctx.fillRect(4 + i * 5, 14, 4, 7); }
        text(ctx, 'X' + Math.max(0, lives - 1), 88, 14, '#fff');
        if (P && P.weapon) text(ctx, P.weapon.toUpperCase(), 110, 14, '#ffe040');
        if (boss && boss.state !== 'dying' && bossOn) {
          text(ctx, boss.d.name, 160, 14, '#ff8080');
          ctx.fillStyle = '#401010'; ctx.fillRect(160, 22, 92, 3); ctx.fillStyle = '#ff3030'; ctx.fillRect(160, 22, Math.round(92 * Math.max(0, boss.hp) / boss.maxhp), 3);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { renderAttract(ctx); return; }
        const shake = fx.some(f => f.k === 'shake') ? ((T & 2) - 1) : 0;
        ctx.save(); ctx.translate(0, shake);
        drawBg(ctx);
        for (const it of items) drawItem(ctx, it);
        for (const e of ents) drawEnemy(ctx, e);
        if (P && phase !== 'ending') drawPlayer(ctx);
        for (const s of shots) drawShot(ctx, s);
        for (const f of fx) {
          const x = Math.round(f.x - camX);
          if (f.k === 'spark') { ctx.fillStyle = f.t > 4 ? '#fff' : '#ffe040'; const y = Math.round(f.y); ctx.fillRect(x - 4, y, 9, 1); ctx.fillRect(x, y - 4, 1, 9); ctx.fillRect(x - 1, y - 1, 3, 3); }
          else if (f.k === 'flash') { ctx.fillStyle = f.t & 2 ? '#ffffc0' : '#ff9020'; const r = 14 - f.t; ctx.fillRect(x - r, Math.round(f.y) - r, r * 2, r * 2); }
          else if (f.k === 'txt') textS(ctx, f.s, x, Math.round(f.y - (40 - f.t) * 0.3), f.c, 1, 'center');
        }
        ctx.restore();
        if (phase === 'intro') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 84, W, 44); textS(ctx, 'LEVEL ' + (si + 1), W / 2, 92, '#ffe040', 2, 'center'); textS(ctx, ST().name, W / 2, 114, '#fff', 1, 'center'); }
        if (phase === 'bossdown' && phaseT > 60) { textS(ctx, 'LEVEL CLEAR!', W / 2, 90, '#ffe040', 2, 'center'); textS(ctx, 'TIME BONUS', W / 2, 112, '#fff', 1, 'center'); }
        if (phase === 'ending') renderEnding(ctx);
        drawHUD(ctx);
        if (mode === 'over') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 100, W, 36); textS(ctx, 'GAME OVER', W / 2, 110, '#ff3030', 2, 'center'); }
      }
      function renderEnding(ctx) {
        const t = phaseT;
        ctx.fillStyle = '#80a0d0'; ctx.fillRect(0, HUD, W, H - HUD);
        ctx.fillStyle = '#505860'; ctx.fillRect(0, 190, W, H - 190);
        // helicopter
        const hy = Math.min(120, 30 + t * 0.4);
        ctx.fillStyle = '#304030'; ctx.fillRect(150, hy, 60, 24); ctx.fillRect(110, hy + 6, 44, 6); ctx.fillRect(106, hy - 2, 6, 14);
        ctx.fillStyle = '#90c0e0'; ctx.fillRect(194, hy + 4, 12, 10);
        ctx.fillStyle = '#202020'; const bl = (t >> 1) & 1 ? 46 : 30; ctx.fillRect(180 - bl, hy - 4, bl * 2, 2); ctx.fillRect(176, hy - 4, 4, 4); ctx.fillRect(150, hy + 28, 60, 2);
        drawMan(ctx, 70, 190, 1, t > 200 ? POSE.cheer : POSE.stand, PAL.dude, 1.12);
        drawMan(ctx, 94, 190, 1, t > 200 ? POSE.cheer : POSE.stand2, Object.assign({}, PAL.dude, { top: '#202020', sleeve: '#f4b884', hair: '#d0a040', band: '#2060e0' }), 1.12);
        if (t > 120) drawMan(ctx, Math.round(Math.max(130, 180 - (t - 120) * 0.5)), 190, -1, t > 220 ? POSE.wave : POSE[['walk0', 'walk1', 'walk2', 'walk1'][(t >> 3) & 3]], PAL.prez, 1.1);
        textS(ctx, 'THE PRESIDENT IS SAFE!', W / 2, 40, '#ffe040', 1, 'center');
        if (t > 240) textS(ctx, '"THANKS, DUDES!', W / 2, 60, '#fff', 1, 'center');
        if (t > 300) textS(ctx, 'BURGERS ARE ON ME!"', W / 2, 72, '#fff', 1, 'center');
        if (t > 420) textS(ctx, 'BUT THE DRAGONNINJA WILL RETURN...', W / 2, 160, '#ff8080', 1, 'center');
      }
      function renderAttract(ctx) {
        const page = Math.floor(atT / 480) % 3, t = atT % 480;
        ctx.fillStyle = '#080818'; ctx.fillRect(0, 0, W, H);
        if (page === 0) {
          textS(ctx, 'BAD DUDES', W / 2, 28, '#ffe040', 3, 'center');
          textS(ctx, 'VS.', W / 2, 58, '#fff', 1, 'center');
          textS(ctx, 'DRAGONNINJA', W / 2, 70, '#e02020', 2, 'center');
          ctx.fillStyle = '#202040'; ctx.fillRect(0, 176, W, 2);
          const fr = (t >> 4) % 6;
          drawMan(ctx, 80, 176, 1, [POSE.stand, POSE.punch, POSE.stand, POSE.charge, POSE.superp, POSE.stand][fr], PAL.dude, 1.2);
          drawMan(ctx, 150, 176, -1, fr === 1 || fr === 4 ? POSE.hit : POSE.stand, PAL.ninja, 1.1);
          drawMan(ctx, 190, 176, -1, POSE.stand2, PAL.ninjaR, 1.1);
          text(ctx, '\u00a9 1988 DATA EAST', W / 2, 222, '#888', 1, 'center');
        } else if (page === 1) {
          const lines = ['THE PRESIDENT HAS BEEN', 'KIDNAPPED BY THE NINJAS.', '', 'ARE YOU A BAD ENOUGH DUDE', 'TO RESCUE THE PRESIDENT?', '', 'SPACE  PUNCH', 'DOWN+SPACE  LOW KICK', 'HOLD+RELEASE  SUPER PUNCH', 'X  JUMP   UP+X  HIGH JUMP', 'DOWN+X  DROP FROM LEDGE'];
          lines.forEach((l, i) => { if (t > i * 12) text(ctx, l, W / 2, 30 + i * 13, i < 5 ? '#fff' : '#80c0ff', 1, 'center'); });
        } else {
          textS(ctx, 'TOP DUDES', W / 2, 30, '#ffe040', 2, 'center');
          const rows = [['BLADE', Math.max(hi, 60000)], ['STRIKER', 50000], ['KARNOV', 40000], ['ANIMAL', 30000], ['NINJA', 20000]];
          rows.sort((a, b) => b[1] - a[1]);
          rows.forEach((r, i) => { text(ctx, (i + 1) + '.', 50, 70 + i * 18, '#40a0ff'); text(ctx, r[0], 70, 70 + i * 18, '#fff'); text(ctx, String(r[1]), 206, 70 + i * 18, '#fff', 1, 'right'); });
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
