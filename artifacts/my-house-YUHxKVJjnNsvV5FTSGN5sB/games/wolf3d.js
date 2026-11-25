// Wolfenstein 3D (id Software, 1992) - an original raycasting take for the Game Room: procedural castle floors,
// sliding/locked doors, push-wall secrets, guards with patrol & alert AI. All art and sound generated in code.
(function () {
  'use strict';
  const CFG = {
    id: 'wolf3d', title: 'Wolfenstein 3D', maker: 'id Software',
    marquee: { bg: '#101830', fg: '#e8c040', accent: '#c0c8e0' },
    subtitle: 'ESCAPE FROM CASTLE GRIMSTONE',
    titleColor: [236, 196, 70], subColor: [190, 210, 255], titleSky: [[70, 40, 60], [8, 10, 30]],
    panel: [40, 52, 120], statsBg: [24, 72, 80], castle: [16, 14, 24], hiDefault: 10000,
    hero: { skin: [226, 172, 128], hair: [196, 150, 70], eye: [60, 110, 190], shirt: [80, 100, 70], collar: [60, 76, 52] },
    getReady: 'MOVE OUT, CAPTAIN!',
    bossDown: 'THE IRON MARSHAL HAS FALLEN!',
    scoreNames: ['ROOK', 'MARA', 'HOLT', 'VESS', 'DUNN', 'KORA'],
    story: [
      'CAPTAIN ROOK, ALLIED COMMANDO, WAS TAKEN',
      'PRISONER AND LOCKED IN THE DUNGEON OF',
      'CASTLE GRIMSTONE - FORTRESS OF THE TYRANT',
      'IRON MARSHAL VOHRAK.',
      '',
      'A LOOSE STONE, A STOLEN KNIFE, A CHANCE.',
      'FIGHT UP THROUGH NINE FLOORS OF GUARDS,',
      'FIND THE KEYS, RIDE THE LIFTS, AND',
      'DEFEAT THE MARSHAL IN HIS KEEP.',
      '',
      'WALK INTO DOORS AND WALLS TO OPEN THEM.'
    ],
    ending: [
      'THE IRON MARSHAL LIES IN A HEAP OF',
      'SMOKING ARMOR. HIS GUARDS SCATTER AS',
      'ROOK RIDES THE LAST LIFT TO THE ROOF.',
      '',
      'A RESCUE PLANE CIRCLES THE TOWER IN',
      'THE DAWN LIGHT. CASTLE GRIMSTONE HAS',
      'FALLEN, AND ITS PRISONERS GO FREE.',
      '',
      'WELL DONE, CAPTAIN.'
    ],
    music: [
      { step: 0.16, type: 'square', vol: 0.045, mel: [62, 0, 65, 0, 69, 0, 74, 72, 69, 0, 67, 69, 65, 0, 0, 0, 62, 0, 65, 0, 69, 0, 72, 70, 69, 67, 65, 64, 62, 0, 0, 0], bass: [38, 0, 45, 0, 38, 0, 45, 0, 41, 0, 48, 0, 41, 0, 48, 0, 38, 0, 45, 0, 36, 0, 43, 0, 33, 0, 40, 0, 38, 0, 38, 0] },
      { step: 0.14, type: 'square', vol: 0.03, mel: [57, 0, 57, 60, 0, 62, 0, 64, 0, 62, 60, 0, 57, 0, 0, 0, 57, 0, 57, 60, 0, 64, 0, 67, 0, 65, 64, 0, 62, 0, 0, 0], bass: [33, 0, 33, 0, 40, 0, 33, 0, 36, 0, 36, 0, 43, 0, 36, 0, 38, 0, 38, 0, 45, 0, 38, 0, 40, 0, 40, 0, 40, 0, 28, 0] },
      { step: 0.15, type: 'triangle', vol: 0.05, mel: [64, 0, 67, 71, 0, 72, 71, 67, 64, 0, 62, 64, 0, 0, 0, 0, 64, 0, 67, 71, 0, 74, 72, 71, 69, 0, 67, 69, 0, 0, 0, 0], bass: [40, 0, 47, 0, 40, 0, 47, 0, 45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0, 47, 0, 42, 0, 47, 0, 35, 0] }
    ],
    levels: [
      { name: 'THE DUNGEON', seed: 1101, size: 26, theme: 'grey', keys: 'g', mix: { guard: 6, dog: 1 }, dens: 0.035, secrets: 1, par: 90 },
      { name: 'GUARD BARRACKS', seed: 2202, size: 28, theme: 'wood', keys: 'g', mix: { guard: 5, dog: 2 }, dens: 0.04, secrets: 2, mg: 1, par: 100 },
      { name: 'THE CELLBLOCK', seed: 3303, size: 30, theme: 'blue', keys: 'sg', mix: { guard: 5, dog: 2, officer: 1 }, dens: 0.045, secrets: 2, par: 120 },
      { name: 'THE ARMORY', seed: 4404, size: 32, theme: 'steel', keys: 'sg', mix: { guard: 4, dog: 1, officer: 1, trooper: 1 }, dens: 0.048, secrets: 2, cg: 1, par: 130 },
      { name: 'THE GREAT HALL', seed: 5505, size: 32, theme: 'brick', keys: 'g', mix: { guard: 4, dog: 2, officer: 2, trooper: 1 }, dens: 0.05, secrets: 3, par: 140 },
      { name: 'WINE CELLARS', seed: 6606, size: 34, theme: 'moss', keys: 'sg', mix: { guard: 3, dog: 3, officer: 2, trooper: 1 }, dens: 0.052, secrets: 3, par: 150 },
      { name: 'THE WAR ROOM', seed: 7707, size: 34, theme: 'brick', keys: 'sg', mix: { guard: 3, dog: 1, officer: 2, trooper: 2 }, dens: 0.055, secrets: 3, par: 160 },
      { name: 'OFFICERS QUARTERS', seed: 8808, size: 36, theme: 'wood', keys: 'sg', mix: { guard: 2, dog: 2, officer: 3, trooper: 2 }, dens: 0.058, secrets: 3, par: 170 },
      { name: 'THE MARSHAL\'S KEEP', seed: 9909, size: 30, theme: 'steel', keys: 'sg', mix: { guard: 2, officer: 2, trooper: 2 }, dens: 0.045, secrets: 2, boss: 'marshal', mg: 1, cg: 1, par: 180, final: 1 }
    ]
  };

  // ---------------------------------------------------------------- basics
  const W = 320, H = 200, VW = 320, VH = 160, HALF = 80;
  const FOVT = 0.66, PROJ = (VW / 2) / FOVT, WALLK = PROJ * 0.86;
  const K_WALL = 1, K_DOOR = 2, K_PUSH = 3;
  const TAU = Math.PI * 2;
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function cl(v) { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }
  function C(r, g, b) { return (0xff000000 | (cl(b) << 16) | (cl(g) << 8) | cl(r)) >>> 0; }
  function A(a) { return C(a[0], a[1], a[2]); }
  function shade(c, f) { return C((c & 255) * f, ((c >>> 8) & 255) * f, ((c >>> 16) & 255) * f); }
  function blend(c, d, a) {
    const r = (c & 255), g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    return C(r + ((d & 255) - r) * a, g + (((d >>> 8) & 255) - g) * a, b + (((d >>> 16) & 255) - b) * a);
  }
  function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); }
  function wrapA(a) { a %= TAU; return a < 0 ? a + TAU : a; }
  const BLACK = C(0, 0, 0), WHITE = C(255, 255, 255);

  // ---------------------------------------------------------------- font
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
    '%': [24, 25, 2, 4, 8, 19, 3], '"': [10, 10, 0, 0, 0, 0, 0]
  };
  let buf = null;
  function rect(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
    for (let yy = y0; yy < y1; yy++) { const o = yy * W; for (let xx = x0; xx < x1; xx++) buf[o + xx] = c; }
  }
  function textW(s, sc) { return String(s).length * 6 * (sc || 1) - (sc || 1); }
  function text(s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = textW(s, sc);
    if (align === 'c') x = Math.round(x - w / 2); else if (align === 'r') x = x - w;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) rect(x + (i * 6 + c) * sc, y + r * sc, sc, sc, col);
      }
    }
  }
  function textS(s, x, y, col, sc, align, sh) { text(s, x + (sc || 1), y + (sc || 1), sh || BLACK, sc, align); text(s, x, y, col, sc, align); }

  // ---------------------------------------------------------------- textures (64x64, column-major)
  function newT() { return new Uint32Array(4096); }
  function tset(t, x, y, rgb, f) { t[(x & 63) * 64 + (y & 63)] = C(rgb[0] * f, rgb[1] * f, rgb[2] * f); }
  function tput(t, x, y, c) { t[(x & 63) * 64 + (y & 63)] = c; }
  function tget(t, x, y) { return t[(x & 63) * 64 + (y & 63)]; }
  function tfill(t, x, y, w, h, c) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) tput(t, x + i, y + j, c); }
  function vnoise(seed, n) {
    const R = rng(seed), g = []; for (let i = 0; i < n * n; i++) g.push(R());
    return function (x, y) {
      const fx = x / 64 * n, fy = y / 64 * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const G = (a, b) => g[((b % n + n) % n) * n + ((a % n + n) % n)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      return (G(ix, iy) * (1 - sx) + G(ix + 1, iy) * sx) * (1 - sy) + (G(ix, iy + 1) * (1 - sx) + G(ix + 1, iy + 1) * sx) * sy;
    };
  }
  function texBlocks(seed, rgb, rh, pats, noise) {
    const R = rng(seed), t = newT();
    for (let ry = 0; ry < 64; ry += rh) {
      const pat = pats[(R() * pats.length) | 0], off = (R() * 64) | 0; let bx = 0;
      for (const bw of pat) {
        const tone = 0.76 + R() * 0.34;
        for (let x = 0; x < bw; x++) for (let y = 0; y < rh; y++) {
          let f = tone * (1 - noise / 2 + R() * noise);
          if (y === rh - 1 || x === bw - 1) f = 0.4 + R() * 0.08;
          else if (y === 0 || x === 0) f *= 1.2;
          else if (y === rh - 2 || x === bw - 2) f *= 0.84;
          tset(t, off + bx + x, ry + y, rgb, f);
        }
        bx += bw;
      }
    }
    return t;
  }
  function texWood(seed, rgb) {
    const R = rng(seed), t = newT();
    for (let p = 0; p < 4; p++) {
      const ph = R() * 10, fr = 0.16 + R() * 0.2, tone = 0.82 + R() * 0.25;
      for (let x = 0; x < 16; x++) for (let y = 0; y < 64; y++) {
        let f = tone * (0.86 + 0.12 * Math.sin(y * fr + ph + Math.sin(x * 0.7 + ph) * 1.6) + R() * 0.05);
        if (x === 0) f = 0.38; else if (x === 1) f *= 1.15; else if (x === 15) f *= 0.75;
        tset(t, p * 16 + x, y, rgb, f);
      }
    }
    for (let x = 0; x < 64; x++) for (let y = 0; y < 4; y++) { tset(t, x, y, rgb, y === 3 ? 0.4 : 0.62 + y * 0.08); tset(t, x, 63 - y, rgb, y === 3 ? 0.4 : 0.55); }
    return t;
  }
  function texSteel(seed, rgb) {
    const R = rng(seed), t = newT();
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) {
      const lx = x & 31, ly = y & 31;
      let f = 0.84 + R() * 0.07 + (lx + ly) * 0.002;
      if (lx === 0 || ly === 0) f = 1.25; else if (lx === 31 || ly === 31) f = 0.42; else if (lx === 30 || ly === 30) f = 0.68;
      tset(t, x, y, rgb, f);
    }
    for (let ox = 0; ox < 64; ox += 32) for (let oy = 0; oy < 64; oy += 32) for (const [cx, cy] of [[4, 4], [26, 4], [4, 26], [26, 26]]) {
      tset(t, ox + cx, oy + cy, rgb, 1.5); tset(t, ox + cx + 1, oy + cy, rgb, 1.1); tset(t, ox + cx, oy + cy + 1, rgb, 1.0); tset(t, ox + cx + 1, oy + cy + 1, rgb, 0.4);
    }
    return t;
  }
  function texNoise(seed, rgb, cracks) {
    const R = rng(seed), n1 = vnoise(seed, 4), n2 = vnoise(seed + 1, 8), n3 = vnoise(seed + 2, 16), t = newT();
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) {
      const v = n1(x, y) * 0.45 + n2(x, y) * 0.35 + n3(x, y) * 0.2;
      let f = 0.45 + v * 0.85 + R() * 0.06;
      if (cracks && Math.abs(n2(x, y) - 0.5) < 0.025) f *= 0.45;
      tset(t, x, y, rgb, f);
    }
    return t;
  }
  function texTech(seed, rgb) {
    const R = rng(seed), t = newT();
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) {
      let f = 0.8 + R() * 0.06;
      if (x % 16 === 0 || y % 21 === 0) f = 0.45; else if (x % 16 === 1 || y % 21 === 1) f = 1.15;
      tset(t, x, y, rgb, f);
    }
    for (let i = 0; i < 9; i++) { const x = 3 + ((R() * 4) | 0) * 16, y = 4 + ((R() * 3) | 0) * 21; tfill(t, x, y, 3, 2, R() < 0.5 ? C(255, 200, 60) : C(90, 255, 140)); }
    return t;
  }
  const TX = {}, TEX = [null], TEXD = [null];
  function addTex(name, t) {
    TX[name] = TEX.length; TEX.push(t);
    const d = new Uint32Array(4096); for (let i = 0; i < 4096; i++) d[i] = shade(t[i], 0.7); TEXD.push(d);
  }
  function crest(t, cx, cy, gold) {
    // original emblem: a ringed watchtower
    for (let a = 0; a < 64; a++) { const an = a / 64 * TAU; tput(t, Math.round(cx + Math.cos(an) * 9), Math.round(cy + Math.sin(an) * 9), gold); tput(t, Math.round(cx + Math.cos(an) * 8), Math.round(cy + Math.sin(an) * 8), gold); }
    tfill(t, cx - 3, cy - 3, 7, 9, gold); tfill(t, cx - 5, cy - 6, 11, 3, gold);
    tfill(t, cx - 4, cy - 7, 2, 1, gold); tfill(t, cx - 1, cy - 7, 2, 1, gold); tfill(t, cx + 3, cy - 7, 2, 1, gold);
    tfill(t, cx - 1, cy + 1, 3, 5, C(30, 20, 10));
  }
  function buildTextures() {
    const stone = texBlocks(11, [128, 128, 128], 16, [[16, 16, 16, 16], [24, 20, 20], [20, 24, 20], [32, 16, 16]], 0.12);
    const bstone = texBlocks(23, [86, 96, 150], 16, [[16, 16, 16, 16], [24, 20, 20], [32, 32], [20, 24, 20]], 0.12);
    const brick = texBlocks(37, [150, 62, 48], 8, [[16, 16, 16, 16], [8, 16, 16, 16, 8]], 0.14);
    const purple = texBlocks(41, [112, 70, 130], 16, [[16, 16, 16, 16], [24, 20, 20], [32, 16, 16]], 0.12);
    const wood = texWood(5, [140, 92, 50]);
    const steel = texSteel(7, [116, 124, 138]);
    const cave = texNoise(51, [130, 104, 78], true);
    const tech = texTech(61, [70, 120, 96]);
    addTex('stone', stone); addTex('bstone', bstone); addTex('brick', brick); addTex('purple', purple);
    addTex('wood', wood); addTex('steel', steel); addTex('cave', cave); addTex('tech', tech);
    // moss stone
    const moss = new Uint32Array(stone), mn = vnoise(71, 8), R = rng(72);
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) { const v = mn(x, y) + y / 200; if (v > 0.62) { const f = 0.5 + R() * 0.5; tput(moss, x, y, blend(tget(moss, x, y), C(60 * f, 120 * f, 40 * f), 0.75)); } }
    addTex('moss', moss);
    // banners
    function banner(base, cloth, trim) {
      const t = new Uint32Array(base);
      tfill(t, 14, 2, 36, 2, C(200, 170, 60));
      for (let x = 18; x < 46; x++) for (let y = 4; y < 60; y++) {
        const edge = Math.abs(x - 31.5); const cut = y > 50 ? (y - 50) * 1.6 : -1;
        if (edge < cut) continue;
        let f = 0.85 + 0.15 * Math.sin(x * 0.9);
        if (x === 18 || x === 45) f = 0.55;
        tset(t, x, y, cloth, f);
      }
      tfill(t, 20, 42, 24, 2, trim); tfill(t, 20, 8, 24, 1, trim);
      crest(t, 32, 24, trim);
      return t;
    }
    addTex('banner', banner(stone, [40, 70, 150], C(225, 190, 70)));
    addTex('banner2', banner(bstone, [30, 110, 70], C(220, 220, 220)));
    // painting
    const paint = new Uint32Array(wood);
    tfill(paint, 10, 10, 44, 36, C(190, 150, 50)); tfill(paint, 12, 12, 40, 32, C(120, 90, 30));
    for (let x = 14; x < 50; x++) for (let y = 14; y < 42; y++) {
      const hill = 30 + Math.sin(x * 0.25) * 4, mtn = 22 + Math.abs(x - 34) * 0.8;
      let c = C(100 + y * 3, 150 + y * 2, 220);
      if (y > mtn) c = C(110, 110, 130); if (y > mtn && y < mtn + 3 && mtn < 26) c = WHITE;
      if (y > hill) c = C(50, 110 + (x * 7 % 20), 50);
      tput(paint, x, y, c);
    }
    addTex('paint', paint);
    // cell (barred window)
    const cell = new Uint32Array(stone);
    tfill(cell, 14, 8, 36, 48, C(60, 60, 60)); tfill(cell, 16, 10, 32, 44, C(14, 12, 16));
    for (let x = 18; x < 48; x += 6) tfill(cell, x, 10, 2, 44, C(150, 150, 160));
    tfill(cell, 16, 28, 32, 2, C(120, 120, 130));
    addTex('cell', cell);
    // vent (steel)
    const vent = new Uint32Array(steel);
    tfill(vent, 12, 14, 40, 36, C(50, 54, 60));
    for (let y = 17; y < 48; y += 5) { tfill(vent, 14, y, 36, 2, C(16, 16, 20)); tfill(vent, 14, y + 2, 36, 1, C(150, 156, 170)); }
    addTex('vent', vent);
    // torch (cave)
    const torch = new Uint32Array(cave);
    tfill(torch, 28, 30, 8, 14, C(70, 50, 30)); tfill(torch, 24, 26, 16, 4, C(90, 70, 40));
    for (let y = 8; y < 26; y++) { const w = Math.round((26 - y) * 0.35 + 1); for (let x = -w; x <= w; x++) tput(torch, 32 + x, y + 2, y < 14 ? C(255, 240, 160) : y < 20 ? C(255, 180, 50) : C(230, 90, 20)); }
    addTex('torch', torch);
    // rune (purple)
    const rune = new Uint32Array(purple), RR = rng(91);
    for (let k = 0; k < 6; k++) {
      const gx = 10 + (k % 3) * 16, gy = 16 + ((k / 3) | 0) * 20;
      for (let s = 0; s < 3; s++) { const x0 = gx + ((RR() * 9) | 0), y0 = gy + ((RR() * 10) | 0), x1 = gx + ((RR() * 9) | 0), y1 = gy + ((RR() * 10) | 0); const n = 12; for (let i = 0; i <= n; i++) tput(rune, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), C(120, 240, 255)); }
    }
    addTex('rune', rune);
    // elevator walls + switch
    const elev = newT();
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) { let f = 0.8 + ((x >> 3) & 1) * 0.12; if ((x & 7) === 0) f = 0.45; tset(elev, x, y, [150, 140, 110], f); }
    for (let y = 0; y < 64; y += 2) tput(elev, 31, y, C(255, 230, 140));
    addTex('elev', elev);
    const sw = new Uint32Array(elev);
    tfill(sw, 18, 12, 28, 40, C(40, 40, 46)); tfill(sw, 20, 14, 24, 36, C(80, 84, 92));
    tfill(sw, 30, 20, 4, 18, C(190, 190, 200)); tfill(sw, 27, 16, 10, 5, C(220, 40, 30));
    tfill(sw, 23, 42, 4, 4, C(40, 230, 60)); tfill(sw, 37, 42, 4, 4, C(240, 200, 40));
    for (let x = 0; x < 64; x++) for (let y = 56; y < 62; y++) tput(sw, x, y, ((x + y) >> 2) & 1 ? C(230, 190, 20) : C(20, 20, 20));
    addTex('switch', sw);
    // doors
    function door(lock) {
      const t = newT();
      for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) {
        let f = 0.82 + ((y >> 3) & 1) * 0.08;
        if ((y & 7) === 0) f = 1.18; else if ((y & 7) === 7) f = 0.55;
        if (x < 2 || x > 61) f = 0.4;
        tset(t, x, y, [80, 112, 150], f);
      }
      tfill(t, 52, 28, 4, 8, C(200, 200, 210)); tfill(t, 52, 35, 4, 1, C(60, 60, 70));
      if (lock) {
        const lc = lock === 2 ? C(240, 200, 40) : C(200, 210, 225);
        tfill(t, 24, 24, 16, 16, lc); tfill(t, 26, 26, 12, 12, shade(lc, 0.8)); tfill(t, 31, 28, 2, 6, BLACK); tfill(t, 30, 29, 4, 2, BLACK);
        tfill(t, 2, 6, 60, 3, lc); tfill(t, 2, 55, 60, 3, lc);
      }
      return t;
    }
    addTex('door', door(0)); addTex('dooru', door(1)); addTex('doorg', door(2));
    const frame = newT();
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) tset(frame, x, y, [96, 100, 110], (x > 26 && x < 38) ? (x === 27 || x === 37 ? 0.5 : 0.95) : 0.7);
    addTex('frame', frame);
  }

  // ---------------------------------------------------------------- sprites (64x64, column-major, 0 = transparent)
  function spr() {
    const t = newT();
    const S = {
      t,
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 64 && y >= 0 && y < 64) t[x * 64 + y] = c; },
      r(x, y, w, h, c) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) S.p(x + i, y + j, c); },
      o(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) S.p(cx + x, cy + y, c); },
      l(x0, y0, x1, y1, c, w) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (w > 1) S.r(x - (w >> 1), y - (w >> 1), w, w, c); else S.p(x, y, c); } }
    };
    return S;
  }
  const OUTC = C(18, 14, 12);
  function outline(t) {
    const o = new Uint32Array(t);
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) {
      if (t[x * 64 + y]) continue;
      if ((x > 0 && t[(x - 1) * 64 + y]) || (x < 63 && t[(x + 1) * 64 + y]) || (y > 0 && t[x * 64 + y - 1]) || (y < 63 && t[x * 64 + y + 1])) o[x * 64 + y] = OUTC;
    }
    return o;
  }
  function xform(t, k, sq, dx) {
    const o = newT();
    for (let y = 0; y < 64; y++) {
      const sy = Math.round(63 - (63 - y) / sq); if (sy < 0) continue;
      const sh = Math.round((63 - y) * k) + (dx || 0);
      for (let x = 0; x < 64; x++) { const sx = x - sh; if (sx < 0 || sx > 63) continue; const v = t[sx * 64 + sy]; if (v) o[x * 64 + y] = v; }
    }
    return o;
  }
  function tint(t, c, a) { const o = new Uint32Array(t); for (let i = 0; i < 4096; i++) if (o[i]) o[i] = blend(o[i], c, a); return o; }

  function humanBody(c, pose) {
    const S = spr(), walk = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0;
    S.r(26, 41, 6, 18 - (walk > 0 ? 2 : 0), c.pants); S.r(33, 41, 6, 18 - (walk < 0 ? 2 : 0), c.pants);
    S.r(25, 58 - (walk > 0 ? 2 : 0), 7, 5 + (walk > 0 ? 1 : 0), c.boots); S.r(33, 58 - (walk < 0 ? 2 : 0), 7, 5 + (walk < 0 ? 1 : 0), c.boots);
    if (c.long) { S.r(23, 40, 18, 9, c.coat); S.r(31, 41, 2, 8, c.coatD); }
    S.r(23, 21, 18, 21, c.coat); S.r(23, 21, 2, 21, c.coatD); S.r(39, 21, 2, 21, c.coatD);
    S.r(23, 36, 18, 2, c.belt); S.r(31, 36, 2, 2, c.buckle);
    S.p(32, 25, c.buckle); S.p(32, 29, c.buckle); S.p(32, 33, c.buckle);
    S.r(27, 21, 10, 2, c.coatD);
    if (c.straps) { S.l(24, 22, 38, 35, c.belt); }
    if (pose === 'aim' || pose === 'fire') {
      S.r(19, 22, 5, 9, c.coat); S.r(40, 22, 5, 9, c.coat); S.r(22, 29, 20, 4, c.coat);
      S.r(26, 29, 4, 4, c.skin); S.r(34, 29, 4, 4, c.skin); S.r(29, 23, 6, 10, c.gun); S.r(30, 23, 4, 1, shade(c.gun, 1.6)); S.o(32, 26, 1, 1, BLACK);
      if (pose === 'fire') { S.o(32, 25, 6, 4, C(255, 220, 80)); S.o(32, 25, 3, 2, C(255, 255, 220)); S.l(20, 25, 44, 25, C(255, 190, 60)); S.l(32, 16, 32, 33, C(255, 190, 60)); }
    } else {
      const s = walk * 2;
      S.r(19, 22 + s, 4, 16, c.coat); S.r(41, 22 - s, 4, 16, c.coat);
      S.r(19, 38 + s, 4, 3, c.skin); S.r(41, 38 - s, 4, 3, c.skin);
      S.r(44, 33 - s, 3, 11, c.gun);
    }
    S.r(29, 18, 6, 3, c.skin);
    S.o(32, 13, 5, 6, c.skin);
    S.p(30, 13, BLACK); S.p(34, 13, BLACK); S.r(31, 17, 3, 1, C(120, 60, 50)); S.p(32, 15, shade(c.skin, 0.8));
    if (c.hat === 'helmet') { S.o(32, 9, 7, 5, c.helm); S.r(24, 10, 17, 2, c.helmD); S.r(28, 5, 6, 1, shade(c.helm, 1.25)); }
    else if (c.hat === 'cap') { S.r(26, 4, 13, 5, c.helm); S.r(25, 8, 15, 2, c.helmD); S.r(27, 10, 11, 1, BLACK); S.r(31, 5, 3, 2, c.buckle); }
    else if (c.hat === 'mask') { S.o(32, 12, 7, 8, c.helm); S.r(26, 11, 13, 3, c.visor); S.o(32, 17, 3, 2, c.helmD); S.r(24, 8, 17, 1, c.helmD); }
    return S.t;
  }
  function humanDead(c) {
    const S = spr();
    S.r(16, 55, 24, 7, c.coat); S.r(16, 55, 24, 1, c.coatD); S.r(40, 57, 14, 5, c.pants); S.r(53, 56, 6, 7, c.boots);
    S.o(10, 58, 5, 4, c.skin); if (c.hat) S.o(8, 57, 4, 4, c.helm);
    S.r(22, 53, 12, 3, c.coatD); S.r(30, 61, 10, 2, c.gun); S.r(16, 59, 24, 1, c.belt);
    return S.t;
  }
  function dogBody(c, pose) {
    const S = spr(), w = pose === 'walk1' ? 2 : pose === 'walk2' ? -2 : 0, bite = pose === 'fire' || pose === 'aim';
    S.l(49, 44, 57, 36 + (w > 0 ? 2 : 0), c.fur, 3);
    S.r(24 + w, 50, 3, 13, c.fur); S.r(29 - w, 50, 3, 13, c.furD); S.r(43 - w, 50, 3, 13, c.fur); S.r(48 + w, 50, 3, 13, c.furD);
    S.o(36, 46, 15, 7, c.fur); S.o(36, 50, 12, 3, c.belly);
    S.o(20, 38, 7, 6, c.fur); S.r(9, bite ? 36 : 38, 9, 5, c.furD); S.r(8, bite ? 36 : 38, 2, 2, BLACK);
    S.r(21, 29, 3, 6, c.furD); S.r(17, 30, 3, 5, c.furD); S.p(17, 36, c.eye); S.p(22, 36, c.eye);
    if (bite) { S.r(9, 41, 9, 3, C(150, 40, 60)); S.p(10, 41, WHITE); S.p(13, 41, WHITE); S.p(16, 41, WHITE); S.r(9, 44, 9, 2, c.furD); }
    S.r(14, 41, 12, 2, c.collar);
    return S.t;
  }
  function dogDead(c) { const S = spr(); S.o(32, 58, 18, 4, c.fur); S.o(14, 57, 6, 4, c.fur); S.r(6, 58, 6, 3, c.furD); S.l(48, 58, 60, 62, c.fur, 2); S.r(20, 61, 14, 2, c.furD); return S.t; }
  function robeBody(c, pose) {
    const S = spr(), up = pose === 'aim' || pose === 'fire', w = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0;
    for (let y = 22; y < 62; y++) { const hw = 7 + (y - 22) * 0.32; for (let x = -hw; x <= hw; x++) { if (y > 56 && ((x + y + w) & 3) === 0) continue; S.p(32 + x, y, Math.abs(x) > hw - 2 ? c.robeD : c.robe); } }
    S.r(30, 24, 4, 34, c.robeD);
    if (c.staff) { S.l(48, 6, 48, 62, C(110, 80, 50), 2); S.o(48, 6, 3, 3, c.glow); }
    if (up) { S.l(24, 30, 16, 16, c.robe, 5); S.l(40, 30, 48, 16, c.robe, 5); S.o(15, 14, 3, 3, c.skin); S.o(49, 14, 3, 3, c.skin); if (pose === 'fire') { S.o(32, 12, 7, 7, c.glow); S.o(32, 12, 3, 3, WHITE); } }
    else { S.l(24, 28, 20, 44, c.robe, 5); S.l(40, 28, 44, 44, c.robe, 5); S.o(20, 45, 2, 2, c.skin); S.o(44, 45, 2, 2, c.skin); }
    S.o(32, 16, 8, 9, c.robe); S.o(32, 18, 5, 6, c.face);
    S.p(30, 17, c.eye); S.p(29, 17, c.eye); S.p(34, 17, c.eye); S.p(35, 17, c.eye);
    return S.t;
  }
  function robeDead(c) { const S = spr(); S.o(32, 59, 20, 4, c.robe); S.o(32, 58, 12, 3, c.robeD); S.o(12, 58, 5, 4, c.face); if (c.staff) S.l(10, 62, 56, 60, C(110, 80, 50), 2); return S.t; }
  function bossBody(c, pose) {
    const S = spr(), walk = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0, fire = pose === 'fire';
    if (c.cape) S.r(12, 18, 40, 34, c.cape);
    S.r(20, 44, 10, 15 - (walk > 0 ? 2 : 0), c.dark); S.r(34, 44, 10, 15 - (walk < 0 ? 2 : 0), c.dark);
    S.r(18, 57 - (walk > 0 ? 2 : 0), 13, 7, c.armorD); S.r(33, 57 - (walk < 0 ? 2 : 0), 13, 7, c.armorD);
    S.r(16, 17, 32, 28, c.armor); S.r(20, 21, 24, 10, c.armorL); S.r(16, 39, 32, 4, c.dark); S.r(30, 39, 4, 4, c.trim);
    S.r(31, 21, 2, 18, c.armorD);
    S.o(13, 20, 7, 5, c.armorL); S.o(51, 20, 7, 5, c.armorL); S.r(8, 22, 10, 2, c.trim); S.r(46, 22, 10, 2, c.trim);
    S.o(32, 10, 7, 7, c.armorD); S.r(26, 9, 13, 3, c.visor); S.r(31, 1, 3, 4, c.trim);
    if (c.kind === 'guns') {
      for (const gx of [7, 47]) {
        S.r(gx, 24, 10, 14, c.armorD); S.r(gx + 1, 36, 8, 12, c.gun);
        S.o(gx + 3, 47, 1, 1, BLACK); S.o(gx + 6, 47, 1, 1, BLACK);
        if (fire) { S.o(gx + 5, 50, 5, 4, C(255, 220, 80)); S.o(gx + 5, 50, 2, 2, WHITE); }
      }
    } else if (c.kind === 'launcher') {
      S.r(7, 24, 9, 18, c.armorD); S.o(11, 43, 3, 3, c.armorD);
      S.r(42, 4, 18, 10, c.gun); S.o(51, 9, 3, 3, BLACK); S.r(48, 14, 6, 10, c.armorD);
      if (fire) { S.o(51, 9, 6, 5, C(255, 170, 40)); S.o(51, 9, 2, 2, WHITE); }
    } else {
      S.l(14, 24, 6, 8 + (fire ? 0 : 20), c.armorL, 5); S.l(50, 24, 58, 8 + (fire ? 0 : 20), c.armorL, 5);
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; S.r(32 + Math.cos(an) * 14 - 1, 10 + Math.sin(an) * 9 - 1, 2, 3, c.glow); }
      if (fire) { S.o(6, 6, 4, 4, c.glow); S.o(58, 6, 4, 4, c.glow); S.o(6, 6, 2, 2, WHITE); S.o(58, 6, 2, 2, WHITE); }
    }
    return S.t;
  }
  function bossDead(c) {
    const S = spr();
    S.r(10, 54, 44, 9, c.armorD); S.o(20, 54, 8, 5, c.armor); S.o(44, 55, 9, 4, c.armorL); S.o(32, 57, 6, 5, c.armorD);
    S.r(28, 56, 9, 2, c.visor); if (c.cape) S.r(4, 60, 56, 3, c.cape);
    return S.t;
  }
  function wraithBody(c, pose) { return robeBody(c, pose); }

  // ---------------------------------------------------------------- items, decorations, weapons
  function itemArt(k) {
    const S = spr();
    const gold = C(240, 200, 50), goldD = C(170, 120, 20);
    switch (k) {
      case 'clip': S.r(24, 52, 16, 11, C(70, 70, 60)); S.r(24, 52, 16, 2, C(110, 110, 90)); for (let i = 0; i < 4; i++) S.r(26 + i * 4, 48, 2, 4, C(220, 180, 60)); break;
      case 'food': S.o(32, 59, 15, 4, C(235, 235, 235)); S.o(32, 59, 12, 3, C(200, 200, 205)); S.o(30, 54, 9, 5, C(170, 100, 40)); S.o(28, 53, 4, 2, C(210, 140, 70)); S.r(38, 50, 3, 6, C(240, 230, 210)); S.o(42, 56, 2, 2, C(60, 160, 60)); break;
      case 'med': S.r(20, 47, 24, 16, C(235, 235, 235)); S.r(20, 47, 24, 2, C(255, 255, 255)); S.r(29, 49, 6, 12, C(30, 170, 60)); S.r(25, 52, 14, 6, C(30, 170, 60)); S.r(28, 44, 8, 3, C(130, 130, 130)); break;
      case 'mg': S.r(12, 52, 34, 6, C(60, 60, 66)); S.r(46, 53, 8, 3, C(40, 40, 44)); S.r(18, 58, 5, 5, C(50, 50, 55)); S.r(26, 57, 4, 6, C(40, 40, 40)); S.r(8, 53, 6, 8, C(120, 80, 40)); S.r(14, 51, 30, 1, C(130, 130, 140)); break;
      case 'cg': S.r(10, 50, 36, 10, C(70, 70, 76)); for (let i = 0; i < 3; i++) S.r(46, 51 + i * 3, 12, 2, C(40, 40, 44)); S.r(18, 60, 5, 3, C(40, 40, 40)); S.r(30, 46, 8, 4, C(90, 90, 96)); S.r(10, 50, 36, 1, C(150, 150, 160)); break;
      case 'pistol': S.r(20, 52, 22, 6, C(60, 60, 66)); S.r(20, 57, 7, 6, C(90, 60, 30)); S.r(20, 52, 22, 1, C(140, 140, 150)); break;
      case 'knife': S.r(14, 55, 26, 3, C(210, 210, 220)); S.r(38, 54, 3, 5, C(180, 150, 60)); S.r(41, 55, 10, 3, C(90, 60, 30)); break;
      case 'gkey': case 'skey': {
        const kc = k === 'gkey' ? gold : C(200, 210, 225), kd = k === 'gkey' ? goldD : C(120, 130, 150);
        S.o(32, 46, 6, 6, kc); S.o(32, 46, 3, 3, 0); S.r(31, 52, 3, 11, kc); S.r(34, 57, 4, 2, kc); S.r(34, 61, 3, 2, kc); S.r(30, 52, 1, 11, kd);
        const t = S.t; for (let x = 28; x < 37; x++) for (let y = 43; y < 50; y++) if ((x - 32) * (x - 32) + (y - 46) * (y - 46) <= 9) t[x * 64 + y] = 0;
        break;
      }
      case 'coin': for (const [x, y] of [[26, 59], [34, 59], [30, 56], [38, 60], [22, 61], [32, 61]]) { S.o(x, y, 4, 2, gold); S.r(x - 1, y - 1, 2, 1, C(255, 250, 180)); } break;
      case 'cup': S.o(32, 46, 8, 6, gold); S.r(24, 40, 17, 4, gold); S.r(30, 52, 4, 7, goldD); S.r(25, 59, 14, 4, gold); S.r(26, 44, 2, 4, C(255, 250, 190)); S.o(32, 47, 2, 2, C(220, 30, 60)); break;
      case 'chest': S.r(18, 48, 28, 15, C(130, 70, 30)); S.r(18, 44, 28, 6, C(150, 85, 40)); S.r(18, 48, 28, 2, gold); S.r(18, 58, 28, 2, gold); S.r(30, 50, 4, 5, gold); S.o(24, 46, 1, 1, C(60, 220, 255)); S.o(40, 46, 1, 1, C(255, 60, 90)); break;
      case 'crown': S.r(20, 50, 24, 12, gold); for (let i = 0; i < 5; i++) S.r(20 + i * 5, 42 + (i & 1) * 3, 4, 9, gold); S.r(20, 58, 24, 2, goldD); S.o(26, 54, 1, 1, C(220, 30, 60)); S.o(32, 54, 2, 2, C(60, 200, 255)); S.o(38, 54, 1, 1, C(40, 220, 90)); break;
      case 'life': S.o(32, 50, 11, 11, C(50, 90, 230)); S.o(29, 46, 5, 4, C(130, 170, 255)); S.r(30, 45, 4, 12, WHITE); S.r(26, 49, 12, 4, WHITE); break;
      case 'relic':
        S.r(20, 54, 24, 9, C(110, 100, 120)); S.r(18, 52, 28, 3, C(150, 140, 160)); S.r(31, 6, 3, 47, C(150, 110, 60)); S.r(32, 6, 1, 47, C(200, 160, 90));
        for (let y = 0; y < 12; y++) { const w = Math.round(y < 8 ? y * 0.6 : (12 - y) * 1.2); S.r(32 - w, 1 + y, w * 2 + 1, 1, C(230, 240, 255)); }
        S.r(27, 13, 11, 2, gold); break;
      case 'lamp': S.r(31, 0, 2, 6, C(60, 60, 60)); S.o(32, 9, 7, 4, C(40, 110, 50)); S.r(25, 9, 15, 3, C(30, 80, 40)); S.o(32, 13, 4, 2, C(255, 250, 200)); break;
      case 'chand': S.r(31, 0, 2, 5, C(60, 60, 60)); S.r(20, 6, 25, 2, C(200, 160, 60)); for (const x of [20, 26, 32, 38, 44]) { S.r(x, 3, 2, 3, C(240, 240, 220)); S.r(x, 1, 2, 2, C(255, 200, 60)); } break;
      case 'barrel': S.o(32, 50, 11, 13, C(130, 80, 40)); S.r(21, 44, 23, 2, C(80, 80, 90)); S.r(21, 56, 23, 2, C(80, 80, 90)); S.r(26, 38, 3, 24, C(160, 100, 50)); break;
      case 'drum': S.r(22, 38, 21, 25, C(50, 110, 70)); S.r(22, 38, 21, 3, C(80, 150, 100)); S.r(22, 49, 21, 2, C(30, 70, 40)); S.r(24, 40, 3, 22, C(90, 160, 110)); break;
      case 'plant': S.r(25, 50, 15, 13, C(160, 80, 50)); S.r(23, 48, 19, 3, C(190, 100, 60)); for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.3; S.l(32, 48, 32 + Math.cos(a) * 14, 48 + Math.sin(a) * 18, C(40, 140 + i * 8, 50), 2); } break;
      case 'armor': S.r(22, 58, 21, 5, C(90, 70, 50)); S.r(26, 36, 13, 22, C(170, 175, 185)); S.r(27, 22, 11, 14, C(190, 195, 205)); S.o(32, 15, 5, 6, C(180, 185, 195)); S.r(29, 14, 7, 2, BLACK); S.r(22, 24, 4, 20, C(150, 155, 165)); S.r(39, 24, 4, 20, C(150, 155, 165)); S.r(44, 6, 2, 52, C(120, 90, 50)); S.r(42, 4, 6, 4, C(200, 200, 210)); break;
      case 'table': S.r(10, 46, 44, 4, C(140, 90, 50)); S.r(10, 46, 44, 1, C(180, 120, 70)); S.r(13, 50, 3, 13, C(100, 64, 34)); S.r(48, 50, 3, 13, C(100, 64, 34)); S.r(24, 41, 6, 5, C(220, 220, 230)); S.r(36, 42, 4, 4, C(200, 160, 60)); break;
      case 'vase': S.o(32, 50, 9, 11, C(60, 90, 180)); S.r(28, 36, 9, 5, C(60, 90, 180)); S.r(27, 35, 11, 2, C(90, 120, 210)); S.r(27, 48, 11, 2, C(230, 200, 80)); break;
      case 'column': S.r(24, 4, 17, 59, C(180, 176, 168)); S.r(21, 0, 23, 5, C(200, 196, 188)); S.r(21, 58, 23, 5, C(160, 156, 148)); for (let x = 26; x < 40; x += 4) S.r(x, 5, 1, 53, C(140, 136, 128)); break;
      case 'orb': S.o(32, 32, 6, 6, C(80, 230, 255)); S.o(32, 32, 3, 3, WHITE); return S.t;
      case 'rocket': S.o(32, 32, 5, 5, C(255, 150, 30)); S.o(32, 32, 2, 2, C(255, 250, 200)); return S.t;
      case 'boom': S.o(32, 34, 14, 12, C(255, 120, 20)); S.o(32, 34, 9, 8, C(255, 210, 60)); S.o(32, 34, 4, 4, WHITE); return S.t;
      case 'puff': S.o(32, 34, 9, 8, C(150, 150, 150)); S.o(29, 31, 4, 4, C(200, 200, 200)); return S.t;
    }
    return outline(S.t);
  }
  const ITEM = {
    clip: { pick: 1 }, clip4: { pick: 1, art: 'clip' }, food: { pick: 1 }, med: { pick: 1 }, mg: { pick: 1 }, cg: { pick: 1 }, gkey: { pick: 1 }, skey: { pick: 1 },
    coin: { pick: 1, tre: 100 }, cup: { pick: 1, tre: 500 }, chest: { pick: 1, tre: 1000 }, crown: { pick: 1, tre: 5000 }, life: { pick: 1 }, relic: { pick: 1 },
    lamp: {}, chand: {}, barrel: { block: 1 }, drum: { block: 1 }, plant: { block: 1 }, armor: { block: 1 }, table: { block: 1 }, vase: { block: 1 }, column: { block: 1 }
  };
  // first-person weapon views
  function weaponArt(w, f) {
    const S = spr();
    const skin = C(226, 172, 128), skinD = C(186, 130, 92), sleeve = C(70, 90, 60), metal = C(70, 72, 80), metalL = C(130, 134, 146);
    const flash = (x, y, r) => { S.o(x, y, r + 2, r, C(255, 190, 50)); S.o(x, y, r, r - 2, C(255, 240, 120)); S.o(x, y, r - 3, r - 4, WHITE); };
    if (w === 0) {
      const up = f === 1 ? 10 : f === 2 ? 18 : 0, sx = f === 1 ? -4 : 0;
      S.r(26 + sx, 30 - up, 6, 22, C(215, 215, 225)); S.r(28 + sx, 30 - up, 2, 22, WHITE);
      for (let i = 0; i < 6; i++) S.r(27 + sx + (i >> 1), 24 - up + i, 6 - i, 1, C(215, 215, 225));
      S.r(22 + sx, 51 - up, 14, 3, C(180, 150, 60));
      S.r(23 + sx, 54 - up, 12, 12, skin); S.r(23 + sx, 54 - up, 3, 12, skinD); S.r(22 + sx, 62 - up, 14, 6, sleeve);
    } else if (w === 1) {
      const up = f === 1 ? 4 : 0;
      if (f === 1) flash(32, 26, 7);
      S.r(27, 34 - up, 10, 16, metal); S.r(27, 34 - up, 10, 2, metalL); S.r(31, 31 - up, 2, 3, metalL); S.r(29, 36 - up, 6, 3, C(40, 40, 46)); S.r(30, 37 - up, 4, 1, C(150, 150, 160)); S.r(26, 44 - up, 12, 3, C(110, 74, 40));
      S.r(25, 48 - up, 14, 12, skin); S.r(25, 48 - up, 3, 12, skinD); S.r(36, 50 - up, 3, 8, skinD); S.r(24, 58 - up, 16, 8, sleeve);
    } else if (w === 2) {
      const up = f === 1 ? 3 : 0;
      if (f === 1) flash(32, 22, 8);
      S.r(29, 26 - up, 6, 10, metal); S.r(24, 34 - up, 16, 18, metal); S.r(24, 34 - up, 16, 2, metalL); S.r(16, 40 - up, 8, 12, C(50, 50, 56));
      S.r(20, 48 - up, 9, 12, skin); S.r(36, 46 - up, 9, 12, skin); S.r(18, 58 - up, 12, 8, sleeve); S.r(35, 56 - up, 12, 8, sleeve);
    } else {
      const up = f ? 2 : 0;
      if (f === 1) flash(26, 20, 7); if (f === 2) flash(38, 20, 7);
      S.r(18, 34 - up, 28, 20, metal); S.r(18, 34 - up, 28, 2, metalL);
      for (const [x, y] of [[26, 30], [32, 28], [38, 30]]) { S.o(x, y - up, 4, 4, C(90, 92, 100)); S.o(x, y - up, 1, 1, BLACK); }
      S.r(12, 46 - up, 10, 12, skin); S.r(42, 46 - up, 10, 12, skin); S.r(10, 56 - up, 14, 8, sleeve); S.r(40, 56 - up, 14, 8, sleeve);
    }
    return S.t;
  }
  const WEAP = [
    { name: 'KNIFE', rate: 0.42, icon: 'knife' }, { name: 'PISTOL', rate: 0.36, icon: 'pistol' },
    { name: 'MACHINE GUN', rate: 0.13, icon: 'mg' }, { name: 'CHAIN GUN', rate: 0.075, icon: 'cg' }
  ];

  // ---------------------------------------------------------------- hero face (32x32, row-major)
  function makeFace(tier, look, sp) {
    const f = new Uint32Array(1024);
    const P = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 32 && y >= 0 && y < 32) f[y * 32 + x] = c; };
    const R = (x, y, w, h, c) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) P(x + i, y + j, c); };
    const O = (cx, cy, rx, ry, c) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if (x * x / (rx * rx + .3) + y * y / (ry * ry + .3) <= 1) P(cx + x, cy + y, c); };
    const hc = CFG.hero;
    let skin = A(hc.skin), skinD = shade(skin, 0.78);
    if (sp === 'dead') { skin = C(170, 170, 160); skinD = C(130, 130, 125); }
    const hair = A(hc.hair), hairD = shade(hair, 0.7), white = C(245, 245, 245), eyeC = A(hc.eye), bruise = C(140, 80, 140);
    R(2, 26, 28, 6, A(hc.shirt)); R(12, 24, 8, 3, skinD); R(13, 26, 6, 2, A(hc.collar));
    O(16, 15, 10, 11, skin); R(7, 15, 19, 9, skin); R(8, 23, 17, 2, skinD); R(10, 25, 12, 1, skinD);
    R(5, 13, 2, 6, skinD); R(26, 13, 2, 6, skinD);
    O(16, 5, 10, 4, hair); R(6, 5, 21, 4, hair); R(6, 8, 2, 5, hair); R(25, 8, 2, 5, hair); for (let x = 7; x < 26; x += 2) P(x, 2 + (x & 2 ? 1 : 0), hairD);
    if (hc.band) R(6, 8, 21, 2, A(hc.band));
    const ey = 13, lx = 9, rx2 = 18;
    if (sp === 'dead') { for (const ex of [lx, rx2]) { P(ex, ey, BLACK); P(ex + 4, ey + 3, BLACK); P(ex + 1, ey + 1, BLACK); P(ex + 3, ey + 2, BLACK); P(ex + 4, ey, BLACK); P(ex, ey + 3, BLACK); P(ex + 3, ey + 1, BLACK); P(ex + 1, ey + 2, BLACK); } R(12, 22, 8, 1, C(90, 40, 40)); }
    else if (sp === 'ouch' || tier >= 6) { R(lx, ey + 1, 5, 1, BLACK); R(rx2, ey + 1, 5, 1, BLACK); R(lx, ey - 1, 5, 1, hairD); R(rx2, ey - 1, 5, 1, hairD); }
    else {
      R(lx, ey, 5, 3, white); R(rx2, ey, 5, 3, white);
      const lo = look - 1; R(lx + 2 + lo, ey, 2, 3, eyeC); R(rx2 + 2 + lo, ey, 2, 3, eyeC);
      R(lx - 1, ey - 2, 6, 1, hairD); R(rx2, ey - 2, 6, 1, hairD);
      if (tier >= 4) { R(rx2 - 1, ey - 1, 7, 5, bruise); R(rx2, ey + 1, 5, 1, BLACK); }
      if (tier >= 5) { R(lx, ey, 5, 1, skinD); }
    }
    R(15, 15, 2, 5, skinD); P(14, 19, skinD); P(17, 19, skinD);
    if (sp === 'grin') { R(11, 21, 10, 3, white); R(11, 21, 10, 1, C(120, 50, 50)); R(10, 20, 1, 2, C(120, 50, 50)); R(21, 20, 1, 2, C(120, 50, 50)); }
    else if (sp !== 'dead') {
      if (tier <= 1) R(12, 22, 8, 1, C(150, 70, 60));
      else if (tier <= 3) { R(12, 22, 8, 1, C(150, 70, 60)); P(11, 21, C(150, 70, 60)); }
      else { R(11, 21, 10, 3, white); R(11, 22, 10, 1, C(90, 50, 50)); for (let x = 12; x < 21; x += 2) P(x, 21, C(150, 150, 150)); }
    }
    if (tier >= 1 && sp !== 'dead') { P(27, 9, C(160, 220, 255)); P(27, 10, C(160, 220, 255)); P(26, 11, C(200, 240, 255)); }
    if (tier >= 2) O(9, 19, 2, 1, bruise);
    if (tier >= 3) { R(7, 8, 18, 2, white); P(12, 8, C(200, 200, 200)); P(19, 9, C(200, 200, 200)); }
    if (tier >= 5) { R(21, 23, 4, 1, white); R(22, 22, 2, 3, white); for (let x = 9; x < 24; x += 3) P(x, 24, skinD); }
    if (tier >= 6 && sp !== 'dead') { P(4, 4, C(255, 255, 120)); P(28, 3, C(255, 255, 120)); P(3, 9, C(255, 255, 120)); }
    // outline
    const o = new Uint32Array(f);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (!f[y * 32 + x] && ((x > 0 && f[y * 32 + x - 1]) || (x < 31 && f[y * 32 + x + 1]) || (y > 0 && f[(y - 1) * 32 + x]) || (y < 31 && f[(y + 1) * 32 + x]))) o[y * 32 + x] = OUTC;
    return o;
  }

  // ---------------------------------------------------------------- enemy types
  const ET = {
    guard: { art: 'h', look: { coat: [150, 128, 84], pants: [112, 94, 62], hat: 'helmet', helm: [92, 102, 78] }, hp: 25, spd: 1.8, pat: 0.9, score: 100, acc: 0.75, dmg: [5, 16], burst: 1, aim: 0.35, cool: [0.7, 1.6], drop: 'clip4', hear: 230 },
    dog: { art: 'd', look: { fur: [150, 108, 64], belly: [190, 160, 120], eye: [20, 20, 20], collar: [180, 40, 40] }, hp: 10, spd: 3.4, pat: 1.6, score: 200, melee: 1, dmg: [5, 12], hear: 'dog' },
    officer: { art: 'h', look: { coat: [118, 42, 50], pants: [50, 46, 56], hat: 'cap', helm: [60, 56, 70], long: 1, straps: 1 }, hp: 50, spd: 2.7, pat: 1.2, score: 400, acc: 0.9, dmg: [7, 18], burst: 1, aim: 0.18, cool: [0.4, 1.0], drop: 'clip4', hear: 330 },
    trooper: { art: 'h', look: { coat: [72, 84, 116], pants: [52, 60, 84], hat: 'mask', helm: [96, 104, 120], visor: [40, 220, 240] }, hp: 100, spd: 1.5, pat: 0.8, score: 500, acc: 0.8, dmg: [4, 11], burst: 3, gap: 0.1, aim: 0.4, cool: [0.8, 1.6], drop: 'mgdrop', hear: 160 },
    sentinel: { art: 'h', look: { coat: [96, 116, 80], pants: [70, 84, 60], hat: 'mask', helm: [80, 90, 70], visor: [220, 200, 60], straps: 1 }, hp: 30, spd: 1.9, pat: 0.9, score: 150, acc: 0.78, dmg: [5, 16], burst: 1, aim: 0.3, cool: [0.6, 1.4], drop: 'clip4', hear: 250 },
    hound: { art: 'd', look: { fur: [56, 52, 60], belly: [90, 86, 96], eye: [255, 60, 40], collar: [200, 200, 60] }, hp: 14, spd: 3.7, pat: 1.7, score: 250, melee: 1, dmg: [6, 14], hear: 'dog' },
    wraith: { art: 'r', look: { robe: [40, 90, 100], face: [10, 20, 24], eye: [120, 255, 240], glow: [100, 240, 255], skin: [150, 200, 200] }, ghost: 1, hp: 70, spd: 2.2, pat: 1.0, score: 600, proj: 'orb', dmg: [10, 18], burst: 1, aim: 0.45, cool: [1.0, 2.0], hear: 520 },
    marshal: { art: 'b', look: { kind: 'guns', armor: [120, 124, 132], armorL: [170, 174, 186], armorD: [70, 72, 80], dark: [40, 40, 46], trim: [200, 160, 50], visor: [255, 60, 40], gun: [60, 60, 66], cape: [110, 20, 30] }, hp: 800, spd: 1.4, score: 5000, acc: 0.75, dmg: [4, 9], burst: 5, gap: 0.08, aim: 0.5, cool: [1.0, 1.8], drop: 'gkey', boss: 1, scale: 1.3, hear: 140 },
    gatekeeper: { art: 'b', look: { kind: 'launcher', armor: [150, 100, 60], armorL: [200, 150, 90], armorD: [90, 60, 36], dark: [50, 40, 30], trim: [220, 220, 220], visor: [80, 255, 120], gun: [80, 84, 70] }, hp: 800, spd: 1.3, score: 5000, proj: 'rocket', dmg: [14, 26], burst: 2, gap: 0.35, aim: 0.55, cool: [1.2, 2.0], drop: 'gkey', boss: 1, scale: 1.3, hear: 120 },
    abbot: { art: 'r', look: { robe: [92, 40, 120], face: [30, 10, 30], eye: [255, 210, 60], glow: [255, 120, 220], skin: [200, 170, 150], staff: 1 }, hp: 1000, spd: 1.6, score: 6000, proj: 'orb', spread: 3, dmg: [7, 13], burst: 1, gap: 0.3, aim: 0.5, cool: [0.9, 1.6], drop: 'gkey', boss: 1, scale: 1.35, hear: 200 },
    herald: { art: 'b', look: { kind: 'herald', armor: [220, 220, 230], armorL: [250, 250, 255], armorD: [160, 160, 180], dark: [120, 120, 140], trim: [240, 200, 60], visor: [80, 220, 255], gun: [200, 200, 220], glow: [120, 230, 255], cape: [40, 50, 110] }, hp: 1100, spd: 1.8, score: 10000, proj: 'orb', spread: 3, homing: 1, dmg: [6, 11], burst: 1, gap: 0.35, aim: 0.45, cool: [0.9, 1.6], drop: 'gkey', boss: 1, scale: 1.4, teleport: 1, hear: 600 }
  };
  const ART = {};
  function buildEnemyArt(name) {
    const T = ET[name], c = {};
    for (const k in T.look) c[k] = Array.isArray(T.look[k]) ? A(T.look[k]) : T.look[k];
    if (T.art === 'h') { c.coatD = shade(c.coat, 0.72); c.helmD = shade(c.helm, 0.7); c.skin = C(222, 170, 130); c.boots = C(50, 36, 26); c.belt = C(60, 44, 30); c.buckle = C(220, 190, 80); c.gun = C(50, 50, 56); c.visor = c.visor || BLACK; }
    if (T.art === 'd') c.furD = shade(c.fur, 0.7);
    if (T.art === 'r') c.robeD = shade(c.robe, 0.7);
    const body = T.art === 'h' ? humanBody : T.art === 'd' ? dogBody : T.art === 'r' ? robeBody : bossBody;
    const dead = T.art === 'h' ? humanDead : T.art === 'd' ? dogDead : T.art === 'r' ? robeDead : bossDead;
    const fr = {};
    for (const p of ['stand', 'walk1', 'walk2', 'aim', 'fire']) fr[p] = outline(body(c, p));
    fr.pain = tint(xform(fr.stand, -0.06, 0.97, 1), WHITE, 0.35);
    fr.die1 = xform(fr.stand, 0.18, 0.85, 0);
    fr.die2 = xform(fr.stand, 0.5, 0.55, -4);
    fr.dead = outline(dead(c));
    ART[name] = fr;
  }

  // ---------------------------------------------------------------- level generation
  const THEMES = {
    grey: { mains: ['stone', 'stone', 'stone', 'wood'], acc: ['banner', 'cell'], ceil: [56, 56, 56], floor: [112, 112, 112], deco: ['barrel', 'armor', 'table', 'plant'], lamp: 'lamp' },
    blue: { mains: ['bstone', 'bstone', 'stone'], acc: ['banner2', 'cell'], ceil: [44, 44, 68], floor: [100, 100, 110], deco: ['vase', 'armor', 'column', 'table'], lamp: 'lamp' },
    wood: { mains: ['wood', 'wood', 'stone'], acc: ['paint', 'banner'], ceil: [64, 52, 40], floor: [106, 98, 86], deco: ['table', 'plant', 'vase', 'armor'], lamp: 'chand' },
    steel: { mains: ['steel', 'steel', 'bstone'], acc: ['vent'], ceil: [50, 54, 62], floor: [96, 100, 106], deco: ['drum', 'barrel', 'table'], lamp: 'lamp' },
    brick: { mains: ['brick', 'brick', 'wood'], acc: ['banner', 'paint'], ceil: [64, 44, 40], floor: [112, 102, 98], deco: ['barrel', 'plant', 'column', 'table'], lamp: 'chand' },
    moss: { mains: ['moss', 'moss', 'stone'], acc: ['cell', 'banner'], ceil: [44, 50, 40], floor: [96, 102, 90], deco: ['barrel', 'column', 'plant'], lamp: 'lamp' },
    cave: { mains: ['cave'], acc: ['torch'], ceil: [38, 32, 28], floor: [86, 74, 62], deco: ['barrel', 'column'], lamp: 'lamp' },
    purple: { mains: ['purple', 'purple', 'bstone'], acc: ['rune'], ceil: [42, 30, 54], floor: [92, 86, 104], deco: ['vase', 'column', 'armor'], lamp: 'chand' },
    tech: { mains: ['tech', 'steel'], acc: ['vent'], ceil: [30, 42, 38], floor: [84, 94, 90], deco: ['drum', 'table'], lamp: 'lamp' }
  };
  function genLevel(L) {
    for (let k = 0; k < 60; k++) { const lv = tryGen(L, L.seed + k * 7919, k === 59); if (lv) return lv; }
    return null;
  }
  function tryGen(L, seed, relaxed) {
    const R = rng(seed), N = L.size, NN = N * N;
    const cell = new Uint8Array(NN).fill(K_WALL), wtex = new Uint8Array(NN), room = new Int16Array(NN).fill(-1);
    const leaves = [], edges = [], th = THEMES[L.theme];
    const ri = n => (R() * n) | 0, pick = a => a[ri(a.length)];
    function split(x0, y0, x1, y1) {
      const w = x1 - x0, h = y1 - y0, MIN = 4, canV = w >= 2 * MIN, canH = h >= 2 * MIN, big = w > 11 || h > 11;
      if ((!canV && !canH) || (!big && R() < 0.3)) {
        const id = leaves.length; leaves.push({ id, x0, y0, x1, y1, area: (w - 1) * (h - 1), adj: [] });
        for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) { cell[y * N + x] = 0; room[y * N + x] = id; }
        return;
      }
      const vert = canV && (!canH || (w > h ? R() < 0.85 : w === h ? R() < 0.5 : R() < 0.15));
      if (vert) {
        const s = x0 + MIN + ri(w - 2 * MIN + 1); split(x0, y0, s, y1); split(s, y0, x1, y1);
        const c = []; for (let y = y0 + 1; y < y1; y++) if (cell[y * N + s - 1] === 0 && cell[y * N + s + 1] === 0) c.push(y);
        if (!c.length) return; const y = pick(c);
        cell[y * N + s] = K_DOOR; edges.push({ a: room[y * N + s - 1], b: room[y * N + s + 1], x: s, y, vert: true, lock: 0 });
      } else {
        const s = y0 + MIN + ri(h - 2 * MIN + 1); split(x0, y0, x1, s); split(x0, s, x1, y1);
        const c = []; for (let x = x0 + 1; x < x1; x++) if (cell[(s - 1) * N + x] === 0 && cell[(s + 1) * N + x] === 0) c.push(x);
        if (!c.length) return; const x = pick(c);
        cell[s * N + x] = K_DOOR; edges.push({ a: room[(s - 1) * N + x], b: room[(s + 1) * N + x], x, y: s, vert: false, lock: 0 });
      }
    }
    split(0, 0, N - 1, N - 1);
    if (leaves.length < 6) return null;
    edges.forEach((e, i) => { e.id = i; leaves[e.a].adj.push({ to: e.b, e }); leaves[e.b].adj.push({ to: e.a, e }); });
    // connectivity check
    function comp(from, cut) {
      const seen = new Uint8Array(leaves.length), q = [from]; seen[from] = 1;
      while (q.length) { const r = q.shift(); for (const a of leaves[r].adj) if (!cut.has(a.e.id) && !seen[a.to]) { seen[a.to] = 1; q.push(a.to); } }
      return seen;
    }
    if (comp(0, new Set()).some(v => !v)) return null;
    const border = lf => lf.x0 === 0 || lf.y0 === 0 || lf.x1 === N - 1 || lf.y1 === N - 1;
    const deg1 = leaves.filter(l => l.adj.length === 1);
    const start = (deg1.length ? pick(deg1) : pick(leaves)).id;
    const dist = new Int16Array(leaves.length).fill(-1), par = new Array(leaves.length).fill(null);
    { const q = [start]; dist[start] = 0; while (q.length) { const r = q.shift(); for (const a of leaves[r].adj) if (dist[a.to] < 0) { dist[a.to] = dist[r] + 1; par[a.to] = a.e; q.push(a.to); } } }
    let exit = -1, bs = -1e9;
    for (const lf of leaves) {
      if (lf.id === start) continue;
      const pe = par[lf.id], pred = pe.a === lf.id ? pe.b : pe.a;
      let s = dist[lf.id] + (border(lf) ? 1.5 : 0) + R() * 0.5;
      if (L.boss) { if (pred === start || lf.adj.length !== 1) s -= 50; s += Math.min(60, leaves[pred].area) / 12; }
      if (L.relic && lf.area < 12) s -= 3;
      if (s > bs) { bs = s; exit = lf.id; }
    }
    if (!relaxed && dist[exit] < 3) return null;
    const pathRooms = [exit], pathEdges = [];
    { let r = exit; while (r !== start) { const e = par[r]; pathEdges.unshift(e); r = e.a === r ? e.b : e.a; pathRooms.unshift(r); } }
    const onPath = new Set(pathRooms), k = pathEdges.length;
    const arena = L.boss ? pathRooms[k - 1] : -1;
    if (L.boss && arena === start && !relaxed) return null;
    const keyRooms = {};
    // gold lock
    const gi = L.boss ? k - 1 : Math.max(0, Math.min(k - 1, Math.round(k * 0.66)));
    const ge = pathEdges[gi]; ge.lock = 2;
    const cg = comp(start, new Set([ge.id]));
    let se = null, cs = null;
    if (L.keys.indexOf('s') >= 0) {
      const si = Math.floor(gi * 0.45);
      if (si < gi && pathEdges[si] !== ge) {
        se = pathEdges[si]; cs = comp(start, new Set([se.id]));
        const cand = leaves.filter(l => cs[l.id] && !onPath.has(l.id) && l.id !== start);
        if (!cand.length) { if (!relaxed) return null; se = null; } else { se.lock = 1; keyRooms.s = pick(cand).id; }
      }
    }
    if (!L.boss) {
      let cand = leaves.filter(l => cg[l.id] && !onPath.has(l.id) && l.id !== start && l.id !== keyRooms.s && (!cs || !cs[l.id]));
      if (!cand.length) cand = leaves.filter(l => cg[l.id] && !onPath.has(l.id) && l.id !== start && l.id !== keyRooms.s);
      if (!cand.length) { if (!relaxed) return null; cand = [leaves[start]]; }
      keyRooms.g = pick(cand).id;
    }
    // secret rooms (push walls)
    const used = new Set([start, exit, arena, keyRooms.g, keyRooms.s]);
    const secretCand = deg1.filter(l => !used.has(l.id) && l.adj[0].e.lock === 0);
    const secrets = [];
    const nsec = L.secrets != null ? L.secrets : 2;
    while (secrets.length < nsec && secretCand.length) secrets.push(secretCand.splice(ri(secretCand.length), 1)[0].id);
    const secretSet = new Set(secrets);
    // wall textures per room
    const order = leaves.map(l => l.id).sort((a, b) => leaves[a].area - leaves[b].area);
    const mainOf = [];
    for (const id of order.slice().reverse()) {
      const lf = leaves[id]; const m = TX[pick(th.mains)]; mainOf[id] = m;
      for (let y = lf.y0; y <= lf.y1; y++) for (let x = lf.x0; x <= lf.x1; x++) { const i = y * N + x; if (cell[i] === K_WALL) wtex[i] = m; }
    }
    for (let i = 0; i < NN; i++) if (cell[i] === K_WALL && !wtex[i]) wtex[i] = TX[th.mains[0]];
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x; if (cell[i] !== K_WALL) continue;
      const h = cell[i - 1] === 0 && cell[i + 1] === 0, v = cell[i - N] === 0 && cell[i + N] === 0;
      if ((h || v) && R() < 0.12) wtex[i] = TX[pick(th.acc)];
    }
    for (let i = 0; i < NN; i++) if (cell[i] === K_WALL && R() < 0.07 && (room[i - 1] >= 0 || room[i + 1] >= 0 || room[i - N] >= 0 || room[i + N] >= 0)) wtex[i] = TX[pick(th.acc)];
    // exit room: elevator
    const ex = leaves[exit]; let sw = -1;
    for (let y = ex.y0; y <= ex.y1; y++) for (let x = ex.x0; x <= ex.x1; x++) { const i = y * N + x; if (cell[i] === K_WALL) wtex[i] = TX.elev; }
    if (!L.relic) {
      const cands = [];
      const my = (ex.y0 + ex.y1) >> 1, mx = (ex.x0 + ex.x1) >> 1;
      const tryC = (x, y, nx, ny) => {
        const i = y * N + x, hz = nx === x;
        const f1 = hz ? i - 1 : i - N, f2 = hz ? i + 1 : i + N;
        if (cell[i] === K_WALL && room[ny * N + nx] === exit && cell[f1] === K_WALL && cell[f2] === K_WALL) cands.push({ i, s: (x === 0 || y === 0 || x === N - 1 || y === N - 1 ? 10 : 0) - Math.abs(x - mx) - Math.abs(y - my) });
      };
      for (let y = ex.y0 + 1; y < ex.y1; y++) { tryC(ex.x0, y, ex.x0 + 1, y); tryC(ex.x1, y, ex.x1 - 1, y); }
      for (let x = ex.x0 + 1; x < ex.x1; x++) { tryC(x, ex.y0, x, ex.y0 + 1); tryC(x, ex.y1, x, ex.y1 - 1); }
      cands.sort((a, b) => b.s - a.s);
      if (!cands.length) return null;
      sw = cands[0].i; wtex[sw] = TX.switch;
    }
    // pillars
    for (const lf of leaves) {
      const w = lf.x1 - lf.x0, h = lf.y1 - lf.y0;
      if (lf.id === exit || lf.id === start || w < 8 || h < 8 || R() > 0.5) continue;
      const xs = [lf.x0 + 3, lf.x1 - 3], ys = [lf.y0 + 3, lf.y1 - 3];
      const pt = R() < 0.5 ? mainOf[lf.id] : TX[pick(th.mains)];
      for (const x of xs) for (const y of ys) { cell[y * N + x] = K_WALL; wtex[y * N + x] = pt; room[y * N + x] = -1; }
    }
    // doors and push walls
    const doors = [], doorAt = new Int16Array(NN).fill(-1), push = new Uint8Array(NN), reserved = new Uint8Array(NN);
    for (const e of edges) {
      const i = e.y * N + e.x;
      const sroom = secretSet.has(e.a) ? e.a : secretSet.has(e.b) ? e.b : -1;
      if (sroom >= 0) {
        cell[i] = K_WALL; const other = sroom === e.a ? e.b : e.a; wtex[i] = mainOf[other] || TX.stone;
        let dx = 0, dy = 0;
        if (e.vert) dx = room[i + 1] === sroom ? 1 : -1; else dy = room[i + N] === sroom ? 1 : -1;
        push[i] = dx === 1 ? 1 : dx === -1 ? 2 : dy === 1 ? 3 : 4;
        for (let s = 1; s <= 3; s++) reserved[i + s * (dx + dy * N)] = 2;
        reserved[i - (dx + dy * N)] = 1;
        continue;
      }
      doorAt[i] = doors.length;
      doors.push({ x: e.x, y: e.y, i, vert: e.vert, lock: e.lock, open: 0, st: 0, t: 0 });
      reserved[i - 1] = reserved[i + 1] = reserved[i - N] = reserved[i + N] = 1;
    }
    // objects
    const objs = [], enemies = [], occ = new Uint8Array(NN), block = new Uint8Array(NN);
    const free = (lf, tries) => {
      for (let t = 0; t < (tries || 40); t++) {
        const x = lf.x0 + 1 + ri(lf.x1 - lf.x0 - 1), y = lf.y0 + 1 + ri(lf.y1 - lf.y0 - 1), i = y * N + x;
        if (cell[i] === 0 && !occ[i] && room[i] === lf.id && reserved[i] !== 2 && !(reserved[i] && t < 30)) { occ[i] = 1; return i; }
      }
      return -1;
    };
    const addObj = (i, k) => { if (i < 0) return null; const o = { x: (i % N) + 0.5, y: ((i / N) | 0) + 0.5, k }; objs.push(o); if (ITEM[k].block) block[i] = 1; return o; };
    const sl = leaves[start];
    const sx = (sl.x0 + sl.x1) >> 1, sy = (sl.y0 + sl.y1) >> 1;
    const startI = sy * N + sx; occ[startI] = 1;
    const fe = pathEdges[0];
    const startA = Math.atan2(fe.y + 0.5 - (sy + 0.5), fe.x + 0.5 - (sx + 0.5));
    let treas = 0;
    const mix = L.mix, mixK = Object.keys(mix), mixT = mixK.reduce((s, k) => s + mix[k], 0);
    const pickType = () => { let r = R() * mixT; for (const k of mixK) { r -= mix[k]; if (r < 0) return k; } return mixK[0]; };
    const addEnemy = (i, type) => {
      if (i < 0) return;
      const T = ET[type];
      enemies.push({ id: enemies.length, type, x: (i % N) + 0.5, y: ((i / N) | 0) + 0.5, hp: T.hp, st: 'stand', dir: ri(4) * Math.PI / 2, t: 0, anim: R() * 2, cool: 0, moving: false, tx: 0, ty: 0, tcell: -1, fade: 0, patrol: !T.boss && R() < (T.melee ? 0.6 : 0.25), shots: 0, tele: 0 });
    };
    for (const lf of leaves) {
      const id = lf.id, sec = secretSet.has(id);
      // decorations: corner blockers and ceiling lamps
      if (!sec && id !== exit) {
        const corners = [[lf.x0 + 1, lf.y0 + 1], [lf.x1 - 1, lf.y0 + 1], [lf.x0 + 1, lf.y1 - 1], [lf.x1 - 1, lf.y1 - 1]];
        for (const [x, y] of corners) {
          const i = y * N + x;
          if (R() < 0.3 && !reserved[i] && !occ[i] && cell[i] === 0 && i !== startI) { occ[i] = 1; addObj(i, pick(th.deco)); }
        }
      }
      const cx = (lf.x0 + lf.x1) >> 1, cy = (lf.y0 + lf.y1) >> 1;
      if (lf.area >= 9 && cell[cy * N + cx] === 0) objs.push({ x: cx + 0.5, y: cy + 0.5, k: th.lamp });
      if (sec) {
        const n = 3 + ri(3);
        for (let j = 0; j < n; j++) { const o = addObj(free(lf), pick(['coin', 'coin', 'cup', 'cup', 'chest', 'crown'])); if (o) treas++; }
        addObj(free(lf), pick(['clip', 'med', 'food']));
        if (R() < 0.25) { const o = addObj(free(lf), 'life'); if (o) treas++; }
        continue;
      }
      if (id === start) { if (L.boss || R() < 0.5) addObj(free(lf), 'clip'); continue; }
      if (id === arena) { addEnemy(free(lf, 80), L.boss); addObj(free(lf), 'med'); addObj(free(lf), 'med'); for (let j = 0; j < 4; j++) addObj(free(lf), 'clip'); }
      let n = Math.floor(lf.area * L.dens + R() * 1.3);
      if (id === arena) n = Math.min(n, 3);
      for (let j = 0; j < n; j++) addEnemy(free(lf), pickType());
      if (R() < (L.boss ? 0.65 : 0.5)) addObj(free(lf), 'clip');
      if (R() < 0.22) addObj(free(lf), 'food');
      if (R() < 0.12) addObj(free(lf), 'med');
      if (R() < 0.3) { const o = addObj(free(lf), pick(['coin', 'coin', 'cup', 'chest'])); if (o) treas++; }
    }
    if (keyRooms.g != null) addObj(free(leaves[keyRooms.g], 80), 'gkey');
    if (keyRooms.s != null) addObj(free(leaves[keyRooms.s], 80), 'skey');
    const midRoom = pathRooms[Math.max(1, Math.min(pathRooms.length - 2, (pathRooms.length / 3) | 0))];
    if (L.mg) addObj(free(leaves[midRoom], 80), 'mg');
    if (L.cg) addObj(free(leaves[pathRooms[Math.max(1, Math.min(pathRooms.length - 2, (pathRooms.length / 2) | 0))]], 80), 'cg');
    if (L.relic) { const i = ((ex.y0 + ex.y1) >> 1) * N + ((ex.x0 + ex.x1) >> 1); objs.push({ x: (i % N) + 0.5, y: ((i / N) | 0) + 0.5, k: 'relic' }); }
    // the boss must exist on boss floors
    if (L.boss && !enemies.some(e => e.type === L.boss)) return null;
    if (keyRooms.g != null && !objs.some(o => o.k === 'gkey')) return null;
    if (keyRooms.s != null && !objs.some(o => o.k === 'skey')) return null;
    const th2 = THEMES[L.theme];
    return {
      N, cell, wtex, room, doors, doorAt, push, objs, enemies, block, leaves, exit, sw, arena,
      start: { x: sx + 0.5, y: sy + 0.5, a: startA }, killsTot: enemies.length, secretsTot: secrets.length, treasTot: treas,
      ceil: A(th2.ceil), floor: A(th2.floor), name: L.name, par: L.par || 90
    };
  }

  // ---------------------------------------------------------------- registration
  ArcadeRegistry.register({
    id: CFG.id, title: CFG.title, year: 1992, maker: CFG.maker,
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move/turn \u00b7 Space: fire \u00b7 X: next weapon \u00b7 1-4: weapon \u00b7 A/D: strafe \u00b7 Z: open/push (or walk into it) \u00b7 Enter: start',
    marquee: CFG.marquee,
    create(api) {
      if (!TEX[1]) buildTextures();
      for (const k in ET) if (!ART[k]) buildEnemyArt(k);
      const SPR = {}; for (const k in ITEM) SPR[k] = itemArt(ITEM[k].art || k);
      for (const k of ['orb', 'rocket', 'boom', 'puff', 'pistol', 'knife']) SPR[k] = itemArt(k);
      const WSPR = [0, 1, 2, 3].map(w => [0, 1, 2].map(f => weaponArt(w, f)));
      const FACES = {};
      const face = (t, l, s) => { const k = t + ',' + l + ',' + (s || ''); return FACES[k] || (FACES[k] = makeFace(t, l, s)); };
      const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const zbuf = new Float32Array(VW);
      const R = Math.random;
      const rr = (a) => a[0] + R() * (a[1] - a[0]);
      const LEVELS = CFG.levels;
      // fizzle permutation
      let fizz = null;
      function fizzle() { if (fizz) return fizz; const n = VW * VH; fizz = new Int32Array(n); for (let i = 0; i < n; i++) fizz[i] = i; const r = rng(99); for (let i = n - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = fizz[i]; fizz[i] = fizz[j]; fizz[j] = t; } return fizz; }

      // ---------------- sound
      const au = api.audio;
      const sfx = {
        pistol() { au.noise(0.14, { vol: 0.22, freq: 3200, slideTo: 300 }); au.tone(170, 0.08, { type: 'square', vol: 0.1, slideTo: 60 }); },
        mg() { au.noise(0.08, { vol: 0.2, freq: 2600, slideTo: 400 }); au.tone(140, 0.05, { type: 'square', vol: 0.08, slideTo: 60 }); },
        knife() { au.noise(0.08, { vol: 0.14, freq: 5000, type: 'highpass' }); },
        eshot() { au.noise(0.12, { vol: 0.16, freq: 1600, slideTo: 200 }); },
        door() { au.tone(80, 0.45, { type: 'sawtooth', vol: 0.06, slideTo: 130 }); au.noise(0.4, { vol: 0.05, freq: 400 }); },
        locked() { au.tone(110, 0.12, { type: 'square', vol: 0.12 }); au.tone(90, 0.15, { type: 'square', vol: 0.12, delay: 0.12 }); },
        ammo() { au.tone(660, 0.05, { vol: 0.12 }); au.tone(990, 0.06, { vol: 0.12, delay: 0.05 }); },
        health() { au.tone(520, 0.08, { type: 'triangle', vol: 0.18 }); au.tone(780, 0.12, { type: 'triangle', vol: 0.18, delay: 0.07 }); },
        treasure() { au.melody([[880, 0.05], [1175, 0.05], [1568, 0.09]], { type: 'square', vol: 0.11 }); },
        key() { au.melody([[660, 0.06], [880, 0.06], [1320, 0.12]], { type: 'triangle', vol: 0.18 }); },
        weapon() { au.melody([[392, 0.07], [523, 0.07], [659, 0.07], [784, 0.15]], { type: 'square', vol: 0.12 }); },
        life() { au.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [1319, 0.2]], { type: 'square', vol: 0.13 }); },
        alert(h) { if (h === 'dog') { au.noise(0.07, { vol: 0.18, freq: 900, type: 'bandpass' }); au.noise(0.09, { vol: 0.18, freq: 800, type: 'bandpass', delay: 0.13 }); } else { au.tone(h, 0.08, { type: 'square', vol: 0.12 }); au.tone(h * 0.75, 0.14, { type: 'square', vol: 0.12, delay: 0.09 }); } },
        edie(boss) { au.tone(boss ? 300 : 420, boss ? 1.2 : 0.4, { type: 'triangle', vol: 0.18, slideTo: 60 }); },
        hurt() { au.tone(150, 0.16, { type: 'square', vol: 0.15, slideTo: 70 }); },
        push() { au.noise(1.2, { vol: 0.14, freq: 300, slideTo: 120 }); },
        secret() { au.melody([[523, 0.08], [784, 0.08], [1047, 0.16]], { type: 'triangle', vol: 0.16 }); },
        sw() { au.tone(200, 0.1, { type: 'square', vol: 0.18 }); au.tone(300, 0.6, { type: 'triangle', vol: 0.14, slideTo: 900, delay: 0.1 }); },
        orb() { au.tone(700, 0.3, { type: 'sine', vol: 0.12, slideTo: 300 }); },
        rocket() { au.noise(0.4, { vol: 0.14, freq: 900, slideTo: 200 }); },
        boom() { au.noise(0.6, { vol: 0.25, freq: 700, slideTo: 60 }); },
        tick() { au.tone(1200, 0.02, { type: 'square', vol: 0.07 }); },
        die() { au.tone(300, 1.0, { type: 'sawtooth', vol: 0.15, slideTo: 40 }); }
      };
      // ---------------- music
      const mf = n => 440 * Math.pow(2, (n - 69) / 12);
      let mus = null;
      function music(tr) { if (mus && mus.tr === tr) return; mus = tr ? { tr, i: 0, t: 0.1 } : null; }
      function musicTick(dt) {
        if (!mus) return;
        mus.t -= dt;
        while (mus.t <= 0) {
          const tr = mus.tr, m = tr.mel[mus.i % tr.mel.length], b = tr.bass[mus.i % tr.bass.length];
          if (m) au.tone(mf(m), tr.step * 0.9, { type: tr.type || 'square', vol: tr.vol || 0.05 });
          if (b) au.tone(mf(b), tr.step * 0.95, { type: 'triangle', vol: (tr.vol || 0.05) * 1.4 });
          mus.t += tr.step; mus.i++;
        }
      }

      // ---------------- state
      let mode = 'attract', phase = 'title', phaseT = 0, coinFlash = 0, hi = api.getHiScore(0);
      let lv = null, li = 0, px = 0, py = 0, pa = 0;
      let score = 0, lives = 3, health = 100, ammo = 8, own = [true, true, false, false], weapon = 1, keys = { g: false, s: false }, nextLife = 40000;
      let fireCool = 0, wAnim = 9, wFiring = false, bob = 0, flashR = 0, flashY = 0, msg = '', msgT = 0, faceT = 0, faceLook = 1, faceOuch = 0, faceGrin = 0;
      let kills = 0, secrets = 0, treas = 0, ltime = 0, flow = null, flowT = 0, pw = null, bumpT = 0, introT = 0, dieT = 0, killer = null;
      let projs = [], fx = [], stat = null, frameN = 0, endT = 0, god = false, demoPath = null, levelScore = 0, lockMsgT = 0;

      function setMsg(s, t) { msg = s; msgT = t || 2; }
      function startGame() {
        score = 0; lives = 3; nextLife = 40000; li = 0;
        own = [true, true, false, false]; weapon = 1; ammo = 8; health = 100;
        loadLevel(0); mode = 'intro'; introT = 1.6;
      }
      function loadLevel(n) {
        li = n; lv = genLevel(LEVELS[n]);
        px = lv.start.x; py = lv.start.y; pa = lv.start.a;
        keys = { g: false, s: false }; kills = 0; secrets = 0; treas = 0; ltime = 0;
        projs = []; fx = []; pw = null; flow = new Int16Array(lv.N * lv.N); flowT = 0; fireCool = 0; wAnim = 9;
        flashR = 0; flashY = 0; msg = ''; levelScore = score;
        music(CFG.music[1 + (n % (CFG.music.length - 1))]);
      }

      // ---------------- map queries
      function isDoorClosed(i) { const d = lv.doors[lv.doorAt[i]]; return d.open < 0.9; }
      function solidP(x, y) {
        const N = lv.N; if (x < 0 || y < 0 || x >= N || y >= N) return true;
        const i = (y | 0) * N + (x | 0), c = lv.cell[i];
        if (c === K_WALL || c === K_PUSH) return true;
        if (c === K_DOOR) return isDoorClosed(i);
        return lv.block[i] === 1;
      }
      function blockedAt(x, y, r) { return solidP(x - r, y - r) || solidP(x + r, y - r) || solidP(x - r, y + r) || solidP(x + r, y + r); }
      function los(x0, y0, x1, y1) {
        const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d * 4), N = lv.N;
        for (let i = 1; i < n; i++) {
          const x = x0 + dx * i / n, y = y0 + dy * i / n, j = (y | 0) * N + (x | 0), c = lv.cell[j];
          if (c === K_WALL || c === K_PUSH) return false;
          if (c === K_DOOR && lv.doors[lv.doorAt[j]].open < 0.5) return false;
        }
        return true;
      }
      function openDoor(d) { if (d.st === 0 || d.st === 3) { d.st = 1; sfx.door(); } else if (d.st === 2) d.t = 4; }
      function doorOccupied(d) {
        if (Math.abs(px - d.x - 0.5) < 0.85 && Math.abs(py - d.y - 0.5) < 0.85) return true;
        const N = lv.N;
        for (const e of lv.enemies) if (e.st !== 'dead' && e.st !== 'die' && (((e.y | 0) * N + (e.x | 0)) === d.i || e.tcell === d.i)) return true;
        return false;
      }
      function use(i, bump) {
        const c = lv.cell[i], N = lv.N;
        if (c === K_DOOR) {
          const d = lv.doors[lv.doorAt[i]];
          if (d.lock === 2 && !keys.g && !god) { if (lockMsgT <= 0) { setMsg('YOU NEED THE GOLD KEY'); sfx.locked(); lockMsgT = 1.2; } return; }
          if (d.lock === 1 && !keys.s && !god) { if (lockMsgT <= 0) { setMsg('YOU NEED THE SILVER KEY'); sfx.locked(); lockMsgT = 1.2; } return; }
          if (d.st !== 1 && d.st !== 2) openDoor(d);
          return;
        }
        if (c === K_WALL && i === lv.sw) {
          finishLevel(); return;
        }
        if (c === K_WALL && lv.push[i] && !pw) {
          if (bump && (bumpT += 1 / 60) < 0.35) return;
          const dc = lv.push[i], dx = dc === 1 ? 1 : dc === 2 ? -1 : 0, dy = dc === 3 ? 1 : dc === 4 ? -1 : 0;
          const nx = (i % N) + dx, ny = ((i / N) | 0) + dy, ni = ny * N + nx;
          if (lv.cell[ni] !== 0 || lv.block[ni]) return;
          lv.push[i] = 0;
          pw = { a: i, b: ni, dx, dy, o: 0, n: 0, tex: lv.wtex[i] };
          lv.cell[i] = K_PUSH; lv.cell[ni] = K_WALL; lv.wtex[ni] = pw.tex;
          secrets++; sfx.push(); sfx.secret(); setMsg('SECRET FOUND!', 1.5); score += 0;
        }
      }
      function updatePush(dt) {
        if (!pw) return;
        pw.o += dt * 1.3;
        if (pw.o >= 1) {
          const N = lv.N; lv.cell[pw.a] = 0; pw.a = pw.b; pw.n++;
          const ni = pw.a + pw.dx + pw.dy * N;
          if (pw.n < 2 && lv.cell[ni] === 0 && !lv.block[ni] && !lv.enemies.some(e => e.st !== 'dead' && ((e.y | 0) * N + (e.x | 0)) === ni)) {
            lv.cell[pw.a] = K_PUSH; lv.cell[ni] = K_WALL; lv.wtex[ni] = pw.tex; pw.b = ni; pw.o = 0;
          } else { lv.cell[pw.a] = K_WALL; lv.wtex[pw.a] = pw.tex; pw = null; }
        }
      }
      function updateDoors(dt) {
        for (const d of lv.doors) {
          if (d.st === 1) { d.open += dt * 1.7; if (d.open >= 1) { d.open = 1; d.st = 2; d.t = 4; } }
          else if (d.st === 2) { d.t -= dt; if (d.t <= 0) { if (doorOccupied(d)) d.t = 0.5; else { d.st = 3; sfx.door(); } } }
          else if (d.st === 3) { if (doorOccupied(d)) d.st = 1; else { d.open -= dt * 1.7; if (d.open <= 0) { d.open = 0; d.st = 0; } } }
        }
      }

      // ---------------- enemies
      function computeFlow() {
        const N = lv.N, f = flow; f.fill(32767);
        const q = new Int32Array(N * N); let h = 0, t = 0;
        const s = (py | 0) * N + (px | 0); f[s] = 0; q[t++] = s;
        while (h < t) {
          const c = q[h++], d = f[c] + 1;
          for (const n of [c - 1, c + 1, c - N, c + N]) {
            if (f[n] <= d) continue;
            const k = lv.cell[n];
            if (k === K_WALL || k === K_PUSH || lv.block[n]) continue;
            if (k === K_DOOR) { const dr = lv.doors[lv.doorAt[n]]; if (dr.lock && dr.open < 0.5) continue; }
            f[n] = d; q[t++] = n;
          }
        }
      }
      function enemyAt(i, self) { const N = lv.N; for (const e of lv.enemies) if (e !== self && e.st !== 'dead' && e.st !== 'die' && (((e.y | 0) * N + (e.x | 0)) === i || e.tcell === i)) return true; return false; }
      function passE(n) {
        const k = lv.cell[n]; if (k === K_WALL || k === K_PUSH || lv.block[n]) return false;
        if (k === K_DOOR) { const d = lv.doors[lv.doorAt[n]]; if (d.lock && d.open < 0.5) return false; }
        return true;
      }
      function stepEnemy(e, spd, dt, chase) {
        const N = lv.N;
        if (!e.moving) {
          const ci = (e.y | 0) * N + (e.x | 0), pc = (py | 0) * N + (px | 0);
          let best = -1;
          const nb = [ci - 1, ci + 1, ci - N, ci + N];
          if (chase) {
            let bd = flow[ci];
            for (let j = 0; j < 4; j++) { const n = nb[(j + e.id) & 3]; if (flow[n] < bd && passE(n)) { bd = flow[n]; best = n; } }
            if (best < 0 && bd === 32767) { for (let j = 0; j < 4; j++) { const n = nb[(j + (R() * 4 | 0)) & 3]; if (passE(n)) { best = n; break; } } }
          } else {
            const di = Math.round(wrapA(e.dir) / (Math.PI / 2)) & 3;
            const off = [1, N, -1, -N];
            const tryD = [di, (di + (R() < 0.5 ? 1 : 3)) & 3, (di + 2) & 3];
            for (const d of tryD) { const n = ci + off[d]; if (passE(n) && !enemyAt(n, e)) { best = n; break; } }
          }
          if (best < 0 || best === pc) return false;
          if (enemyAt(best, e)) return false;
          if (lv.cell[best] === K_DOOR) { const d = lv.doors[lv.doorAt[best]]; if (d.open < 0.9) { openDoor(d); return false; } }
          e.tcell = best; e.tx = (best % N) + 0.5; e.ty = ((best / N) | 0) + 0.5; e.moving = true;
          e.dir = Math.atan2(e.ty - e.y, e.tx - e.x);
        }
        if (lv.cell[e.tcell] === K_DOOR && lv.doors[lv.doorAt[e.tcell]].open < 0.9) { openDoor(lv.doors[lv.doorAt[e.tcell]]); return true; }
        const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy), s = spd * dt;
        if (d <= s) { e.x = e.tx; e.y = e.ty; e.moving = false; e.tcell = -1; }
        else { e.x += dx / d * s; e.y += dy / d * s; }
        return true;
      }
      function alert(e) {
        if (e.st !== 'stand' && e.st !== 'patrol') return;
        e.st = 'chase'; e.cool = 0.25 + R() * 0.6; sfx.alert(ET[e.type].hear);
      }
      function soundAlert() {
        const N = lv.N, seen = new Uint8Array(N * N), q = [(py | 0) * N + (px | 0)], dep = [0]; seen[q[0]] = 1;
        for (let h = 0; h < q.length; h++) {
          const c = q[h]; if (dep[h] > 26) continue;
          for (const n of [c - 1, c + 1, c - N, c + N]) {
            if (seen[n]) continue; const k = lv.cell[n];
            if (k === K_WALL || k === K_PUSH) continue;
            if (k === K_DOOR && lv.doors[lv.doorAt[n]].open < 0.3) continue;
            seen[n] = 1; q.push(n); dep.push(dep[h] + 1);
          }
        }
        for (const e of lv.enemies) if (seen[(e.y | 0) * N + (e.x | 0)]) alert(e);
      }
      function hurtPlayer(d, src) {
        if (god || mode !== 'play') return;
        d = Math.round(d * (0.85 + li * 0.04));
        health -= d; flashR = Math.min(0.7, flashR + 0.25 + d / 60); faceOuch = 0.5; sfx.hurt();
        if (health <= 0) { health = 0; mode = 'dying'; dieT = 0; killer = src; sfx.die(); }
      }
      function enemyFire(e) {
        const T = ET[e.type], dx = px - e.x, dy = py - e.y, dist = Math.hypot(dx, dy);
        if (T.proj) {
          const n = T.spread || 1;
          for (let k = 0; k < n; k++) {
            const a = Math.atan2(dy, dx) + (k - (n - 1) / 2) * 0.22;
            const sp = T.proj === 'rocket' ? 6 : 5;
            projs.push({ x: e.x + Math.cos(a) * 0.5, y: e.y + Math.sin(a) * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, k: T.proj, dmg: T.dmg, life: 6, homing: T.homing && k === 0, src: e });
          }
          if (T.proj === 'rocket') sfx.rocket(); else sfx.orb();
          return;
        }
        sfx.eshot();
        if (!los(e.x, e.y, px, py)) return;
        let p = Math.max(0.12, Math.min(0.95, 1 - dist * 0.07)) * (T.acc || 0.8);
        if (api.key('ArrowUp') || api.key('ArrowDown')) p *= 0.8;
        if (R() < p) { const base = dist < 2 ? T.dmg[1] : dist < 5 ? (T.dmg[0] + T.dmg[1]) / 2 : T.dmg[0]; hurtPlayer(base * (0.6 + R() * 0.6), e); }
      }
      function killEnemy(e) {
        const T = ET[e.type];
        e.st = 'die'; e.t = 0.45; e.moving = false; e.tcell = -1; kills++; addScore(T.score); sfx.edie(T.boss);
        let drop = T.drop;
        if (drop === 'mgdrop') drop = own[2] ? 'clip4' : 'mg';
        if (drop) lv.objs.push({ x: e.x, y: e.y, k: drop, amt: drop === 'clip4' ? 4 : 0 });
        if (T.boss) { setMsg(CFG.bossDown || 'THE BOSS IS DOWN!', 3); }
      }
      function damageEnemy(e, d) {
        const T = ET[e.type];
        if (e.st === 'stand' || e.st === 'patrol') d *= 2;
        e.hp -= d;
        if (e.hp <= 0) { killEnemy(e); return; }
        if (T.teleport && e.hp < T.hp * (0.75 - 0.25 * e.tele) && e.tele < 3) { e.tele++; teleport(e); }
        if (!T.boss) { e.st = 'pain'; e.t = 0.18; e.moving = false; e.tcell = -1; }
        else if (e.st === 'stand' || e.st === 'patrol') { e.st = 'chase'; e.cool = 0.3; }
      }
      function teleport(e) {
        const N = lv.N, lf = lv.leaves[lv.room[(e.y | 0) * N + (e.x | 0)] >= 0 ? lv.room[(e.y | 0) * N + (e.x | 0)] : lv.arena];
        if (!lf) return;
        for (let t = 0; t < 40; t++) {
          const x = lf.x0 + 1 + ((R() * (lf.x1 - lf.x0 - 1)) | 0), y = lf.y0 + 1 + ((R() * (lf.y1 - lf.y0 - 1)) | 0), i = y * N + x;
          if (lv.cell[i] === 0 && !lv.block[i] && Math.hypot(x + 0.5 - px, y + 0.5 - py) > 3) {
            fx.push({ x: e.x, y: e.y, k: 'puff', t: 0.5 }); e.x = x + 0.5; e.y = y + 0.5; e.moving = false; e.tcell = -1; sfx.orb(); fx.push({ x: e.x, y: e.y, k: 'puff', t: 0.5 }); return;
          }
        }
      }
      function updateEnemies(dt) {
        flowT -= dt; if (flowT <= 0) { computeFlow(); flowT = 0.2; }
        const N = lv.N;
        for (const e of lv.enemies) {
          const T = ET[e.type];
          if (e.st === 'dead') { e.fade += dt; continue; }
          e.t -= dt; e.anim += dt;
          const dx = px - e.x, dy = py - e.y, dist = Math.hypot(dx, dy);
          switch (e.st) {
            case 'stand': case 'patrol':
              if (((frameN + e.id) & 3) === 0 && dist < 24 && (dist < 1.8 || angDiff(e.dir, Math.atan2(dy, dx)) < 1.45) && los(e.x, e.y, px, py)) alert(e);
              if (e.patrol) { if (!stepEnemy(e, T.pat, dt, false)) e.dir += 0; }
              break;
            case 'chase': {
              e.cool -= dt;
              if (T.melee) {
                if (dist < 1.1) { e.st = 'atk'; e.t = 0.3; break; }
                if (dist < 1.6 && !e.moving && los(e.x, e.y, px, py)) {
                  const s = T.spd * dt, nx = e.x + dx / dist * s, ny = e.y + dy / dist * s;
                  if (!solidP(nx, ny)) { e.x = nx; e.y = ny; } break;
                }
                stepEnemy(e, T.spd, dt, true);
                break;
              }
              if (e.cool <= 0) {
                e.cool = 0.15;
                if (los(e.x, e.y, px, py)) {
                  const ch = dist < 2 ? 0.8 : dist < 5 ? 0.45 : dist < 10 ? 0.25 : 0.12;
                  if (R() < ch * (T.boss ? 1.5 : 1)) { e.st = 'aim'; e.t = T.aim; e.dir = Math.atan2(dy, dx); e.shots = (T.burst || 1); break; }
                }
              }
              stepEnemy(e, T.spd, dt, true);
              break;
            }
            case 'aim': if (e.t <= 0) { e.st = 'fire'; e.t = 0.12; e.shots--; enemyFire(e); } break;
            case 'fire':
              if (e.t <= 0) { if (e.shots > 0) { e.shots--; enemyFire(e); e.t = T.gap || 0.12; } else { e.st = 'chase'; e.cool = rr(T.cool); } }
              break;
            case 'atk': if (e.t <= 0) { if (dist < 1.4 && R() < 0.8) hurtPlayer(rr(T.dmg), e); e.st = 'chase'; e.cool = 0.4; } break;
            case 'pain': if (e.t <= 0) { e.st = 'chase'; e.cool = 0.2 + R() * 0.3; } break;
            case 'die': if (e.t <= 0) { e.st = 'dead'; e.fade = 0; } break;
          }
          if (e.st === 'chase' || e.st === 'aim' || e.st === 'fire') e.dir = e.moving ? e.dir : Math.atan2(dy, dx);
        }
        lv.enemies = lv.enemies.filter(e => !(e.st === 'dead' && e.fade > 5));
      }
      function updateProjs(dt) {
        for (const p of projs) {
          if (p.homing) { const a = Math.atan2(py - p.y, px - p.x), b = Math.atan2(p.vy, p.vx); let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; const nb = b + Math.max(-1.2 * dt, Math.min(1.2 * dt, d)); const sp = Math.hypot(p.vx, p.vy); p.vx = Math.cos(nb) * sp; p.vy = Math.sin(nb) * sp; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          const hitP = Math.hypot(px - p.x, py - p.y) < 0.42;
          if (hitP || solidP(p.x, p.y) && lv.block[(p.y | 0) * lv.N + (p.x | 0)] !== 1 || p.life <= 0) {
            p.dead = true;
            if (p.k === 'rocket') { fx.push({ x: p.x - p.vx * dt, y: p.y - p.vy * dt, k: 'boom', t: 0.4 }); sfx.boom(); const d = Math.hypot(px - p.x, py - p.y); if (d < 1.5) hurtPlayer(rr(p.dmg) * (1.6 - d) / 1.6 + (hitP ? 4 : 0), p.src); }
            else { fx.push({ x: p.x - p.vx * dt, y: p.y - p.vy * dt, k: 'puff', t: 0.25 }); if (hitP) hurtPlayer(rr(p.dmg), p.src); }
          }
        }
        projs = projs.filter(p => !p.dead);
        for (const f of fx) f.t -= dt;
        fx = fx.filter(f => f.t > 0);
      }

      // ---------------- player
      function addScore(n) { score += n; while (score >= nextLife) { nextLife += 40000; lives++; sfx.life(); setMsg('EXTRA LIFE!'); } }
      function bestWeapon() { return own[3] ? 3 : own[2] ? 2 : 1; }
      function pickup() {
        for (const o of lv.objs) {
          if (o.gone || !ITEM[o.k].pick) continue;
          if (Math.abs(o.x - px) > 0.6 || Math.abs(o.y - py) > 0.6) continue;
          const k = o.k; let took = true;
          if (k === 'clip' || k === 'clip4') { if (ammo >= 99) took = false; else { const was = ammo; ammo = Math.min(99, ammo + (o.amt || 8)); sfx.ammo(); if (was === 0 && weapon === 0) weapon = bestWeapon(); } }
          else if (k === 'food') { if (health >= 100) took = false; else { health = Math.min(100, health + 10); sfx.health(); } }
          else if (k === 'med') { if (health >= 100) took = false; else { health = Math.min(100, health + 25); sfx.health(); } }
          else if (k === 'mg' || k === 'cg') { const w = k === 'mg' ? 2 : 3; ammo = Math.min(99, ammo + 6); if (!own[w]) { own[w] = true; setMsg(WEAP[w].name + '!'); } if (weapon < w) weapon = w; sfx.weapon(); faceGrin = 2; }
          else if (k === 'gkey') { keys.g = true; sfx.key(); setMsg('GOLD KEY'); }
          else if (k === 'skey') { keys.s = true; sfx.key(); setMsg('SILVER KEY'); }
          else if (ITEM[k].tre) { addScore(ITEM[k].tre); treas++; sfx.treasure(); flashY = 0.35; }
          else if (k === 'life') { health = 100; ammo = Math.min(99, ammo + 25); lives++; treas++; sfx.life(); flashY = 0.5; setMsg('EXTRA LIFE!'); }
          else if (k === 'relic') { o.gone = true; sfx.life(); victory(); return; }
          if (took) { o.gone = true; if (k !== 'clip' && k !== 'clip4') flashY = Math.max(flashY, 0.2); }
        }
      }
      function aimTarget(range) {
        const dX = Math.cos(pa), dY = Math.sin(pa); let best = null, bd = 1e9;
        for (const e of lv.enemies) {
          if (e.st === 'dead' || e.st === 'die') continue;
          const ex = e.x - px, ey = e.y - py, depth = ex * dX + ey * dY;
          if (depth <= 0.1 || depth > range) continue;
          const lat = Math.abs(-ex * dY + ey * dX), sc = ET[e.type].scale || 1;
          if (lat > 0.32 * sc + depth * 0.025) continue;
          if (!los(px, py, e.x, e.y)) continue;
          if (depth < bd) { bd = depth; best = e; }
        }
        return best ? { e: best, d: bd } : null;
      }
      function playerFire() {
        if (weapon > 0) { if (ammo <= 0) return; ammo--; }
        wAnim = 0; fireCool = WEAP[weapon].rate;
        if (weapon === 0) {
          sfx.knife(); const t = aimTarget(1.5);
          if (t) damageEnemy(t.e, 10 + R() * 22);
          return;
        }
        if (weapon === 1) sfx.pistol(); else sfx.mg();
        soundAlert();
        const t = aimTarget(40);
        if (t) {
          const d = t.d, dmg = d < 2 ? 24 + R() * 22 : d < 4 ? 16 + R() * 18 : 10 + R() * 16;
          if (d < 4 || R() < Math.max(0.35, 1 - (d - 4) * 0.06)) damageEnemy(t.e, dmg);
        }
      }
      function updatePlayer(dt) {
        const run = api.key('ShiftLeft') || api.key('ShiftRight') ? 1.45 : 1;
        let turn = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        pa = wrapA(pa + turn * 2.6 * dt * (run > 1 ? 1.25 : 1));
        let fwd = (api.key('ArrowUp') || api.key('KeyW') ? 1 : 0) - (api.key('ArrowDown') || api.key('KeyS') ? 1 : 0);
        let str = (api.key('KeyD') || api.key('Period') ? 1 : 0) - (api.key('KeyA') || api.key('Comma') ? 1 : 0);
        const dX = Math.cos(pa), dY = Math.sin(pa), sp = 3.6 * run * dt;
        let mx = (dX * fwd - dY * str), my = (dY * fwd + dX * str); const ml = Math.hypot(mx, my);
        if (ml > 1) { mx /= ml; my /= ml; }
        mx *= sp; my *= sp;
        const r = 0.26;
        const eBlock = (nx, ny) => { for (const e of lv.enemies) { if (e.st === 'dead' || e.st === 'die') continue; const lim = 0.62 * (ET[e.type].scale || 1); const d1 = Math.hypot(nx - e.x, ny - e.y); if (d1 < lim && d1 < Math.hypot(px - e.x, py - e.y)) return true; } return false; };
        if (mx && !blockedAt(px + mx, py, r) && !eBlock(px + mx, py)) px += mx;
        if (my && !blockedAt(px, py + my, r) && !eBlock(px, py + my)) py += my;
        if (ml > 0) bob += dt * 9; else bob *= 0.9;
        // bump / use
        const N = lv.N, ai = ((py + dY * 0.75) | 0) * N + ((px + dX * 0.75) | 0);
        if (fwd > 0) { const c = lv.cell[ai]; if (c === K_DOOR || (c === K_WALL && (lv.push[ai] || ai === lv.sw))) use(ai, true); else bumpT = 0; } else bumpT = 0;
        if (api.anyPressed('KeyZ', 'KeyE')) use(ai, false);
        // weapons
        for (let w = 0; w < 4; w++) if (api.pressed('Digit' + (w + 1)) && own[w] && (w === 0 || ammo > 0)) weapon = w;
        if (api.pressed('KeyX')) { for (let k = 1; k <= 4; k++) { const w = (weapon + k) % 4; if (own[w] && (w === 0 || ammo > 0)) { weapon = w; break; } } }
        fireCool -= dt; wAnim += dt;
        if (api.key('Space') && fireCool <= 0) { if (weapon > 0 && ammo <= 0) weapon = 0; playerFire(); }
        if (weapon > 0 && ammo <= 0 && wAnim > 0.3) weapon = 0;
        pickup();
      }
      function finishLevel() {
        sfx.sw(); mode = 'stats'; music(CFG.music[0]);
        const kp = lv.killsTot ? Math.round(kills * 100 / lv.killsTot) : 100;
        const sp = lv.secretsTot ? Math.round(secrets * 100 / lv.secretsTot) : 100;
        const tp = lv.treasTot ? Math.round(treas * 100 / lv.treasTot) : 100;
        stat = { t: 0, k: 0, s: 0, r: 0, kp, sp, tp, step: 0, bonus: 0, timeB: Math.max(0, Math.floor(lv.par - ltime)) * 500, done: false };
      }
      function victory() { mode = 'victory'; endT = 0; music(CFG.music[0]); }
      function gameOver() { mode = 'gameover'; endT = 0; if (score > hi) hi = score; api.setHiScore(score); music(null); }
      function afterDeath() {
        lives--;
        if (lives > 0) { const sc = score; loadLevel(li); score = sc; health = 100; ammo = 8; own = [true, true, false, false]; weapon = 1; mode = 'intro'; introT = 1.4; return; }
        mode = 'contwait';
        const cont = () => { lives = 3; score = 0; nextLife = 40000; loadLevel(li); health = 100; ammo = 8; own = [true, true, false, false]; weapon = 1; mode = 'intro'; introT = 1.4; };
        if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver();
      }

      // ---------------- stats screen
      function updateStats(dt) {
        const s = stat; s.t += dt;
        const skip = api.anyPressed('Space', 'Enter');
        if (s.done) { if (skip || s.t > 10) nextLevel(); return; }
        if (skip) { s.k = s.kp; s.s = s.sp; s.r = s.tp; s.step = 4; }
        if (s.t < 0.6) return;
        const adv = (cur, tgt) => { if (cur < tgt) { cur = Math.min(tgt, cur + 2); if ((cur % 10) === 0) sfx.tick(); } return cur; };
        if (s.step === 0) { s.step = 1; if (s.timeB) sfx.treasure(); }
        else if (s.step === 1) { s.k = adv(s.k, s.kp); if (s.k >= s.kp) { s.step = 2; if (s.kp === 100) sfx.life(); } }
        else if (s.step === 2) { s.s = adv(s.s, s.sp); if (s.s >= s.sp) { s.step = 3; if (s.sp === 100) sfx.life(); } }
        else if (s.step === 3) { s.r = adv(s.r, s.tp); if (s.r >= s.tp) { s.step = 4; if (s.tp === 100) sfx.life(); } }
        if (s.step === 4) {
          s.bonus = s.timeB + (s.kp === 100 ? 10000 : 0) + (s.sp === 100 ? 10000 : 0) + (s.tp === 100 ? 10000 : 0);
          addScore(s.bonus); s.done = true; s.t = 0;
        }
      }
      function nextLevel() {
        if (li + 1 >= LEVELS.length || LEVELS[li].final) { victory(); return; }
        loadLevel(li + 1); mode = 'intro'; introT = 1.6;
      }

      // ---------------- attract / demo
      function startDemo() {
        const dl = LEVELS[(frameN >> 4) % 3];
        lv = genLevel(dl); px = lv.start.x; py = lv.start.y; pa = lv.start.a; projs = []; fx = []; pw = null; flow = new Int16Array(lv.N * lv.N);
        demoPath = planPath(lv.sw >= 0 ? lv.sw : -1);
      }
      function planPath(target) {
        const N = lv.N, prev = new Int32Array(N * N).fill(-1), s = (py | 0) * N + (px | 0), q = [s]; prev[s] = s;
        let goal = -1;
        if (target < 0) { const ex = lv.leaves[lv.exit]; target = ((ex.y0 + ex.y1) >> 1) * N + ((ex.x0 + ex.x1) >> 1); }
        for (let h = 0; h < q.length; h++) {
          const c = q[h];
          for (const n of [c - 1, c + 1, c - N, c + N]) {
            if (n === target) { prev[n] = c; goal = n; break; }
            if (prev[n] >= 0) continue; const k = lv.cell[n];
            if (k === K_WALL || k === K_PUSH || lv.block[n]) continue;
            prev[n] = c; q.push(n);
          }
          if (goal >= 0) break;
        }
        if (goal < 0) return [];
        const path = []; let c = goal; while (c !== s) { path.unshift(c); c = prev[c]; }
        return path;
      }
      function updateDemo(dt) {
        if (!demoPath || !demoPath.length) { phase = 'title'; phaseT = 0; return; }
        const N = lv.N, c = demoPath[0], tx = (c % N) + 0.5, ty = ((c / N) | 0) + 0.5;
        if (lv.cell[c] === K_WALL) { demoPath = []; return; }
        if (lv.cell[c] === K_DOOR) { const d = lv.doors[lv.doorAt[c]]; if (d.st === 0 || d.st === 3) openDoor(d); }
        const want = Math.atan2(ty - py, tx - px); let d = want - pa; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        pa = wrapA(pa + Math.max(-2.6 * dt, Math.min(2.6 * dt, d)));
        if (Math.abs(d) < 0.6) { const sp = 2.6 * dt, nx = px + Math.cos(pa) * sp, ny = py + Math.sin(pa) * sp; if (!blockedAt(nx, ny, 0.2)) { px = nx; py = ny; bob += dt * 9; } }
        if (Math.hypot(tx - px, ty - py) < 0.3) demoPath.shift();
        updateDoors(dt);
        for (const e of lv.enemies) e.anim += dt;
      }

      // ---------------- update
      function update(dt) {
        frameN++; musicTick(dt);
        if (coinFlash > 0) coinFlash--;
        if (lockMsgT > 0) lockMsgT -= dt;
        if (mode === 'attract') {
          phaseT += dt;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { startGame(); return; }
            coinFlash = 90; au.tone(70, 0.25, { type: 'square', vol: 0.2 });
          }
          if (!mus) music(CFG.music[0]);
          if (phase === 'title' && phaseT > 7) { phase = 'story'; phaseT = 0; }
          else if (phase === 'story' && phaseT > 9) { phase = 'scores'; phaseT = 0; }
          else if (phase === 'scores' && phaseT > 5) { phase = 'demo'; phaseT = 0; startDemo(); }
          else if (phase === 'demo') { updateDemo(dt); if (phaseT > 22) { phase = 'title'; phaseT = 0; } }
          return;
        }
        if (mode === 'intro') { introT -= dt; if (introT <= 0) mode = 'play'; return; }
        if (mode === 'play') {
          ltime += dt;
          if (msgT > 0) msgT -= dt;
          flashR = Math.max(0, flashR - dt * 1.5); flashY = Math.max(0, flashY - dt * 1.5);
          faceT -= dt; if (faceT <= 0) { faceT = 0.8 + R() * 1.4; faceLook = (R() * 3) | 0; }
          if (faceOuch > 0) faceOuch -= dt; if (faceGrin > 0) faceGrin -= dt;
          updatePlayer(dt);
          if (mode !== 'play') return;
          updateDoors(dt); updatePush(dt); updateEnemies(dt); updateProjs(dt);
          return;
        }
        if (mode === 'dying') {
          dieT += dt;
          if (killer && dieT < 0.6) { const want = Math.atan2(killer.y - py, killer.x - px); let d = want - pa; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; pa = wrapA(pa + d * Math.min(1, dt * 6)); }
          if (dieT > 2.0) afterDeath();
          return;
        }
        if (mode === 'stats') { updateStats(dt); return; }
        if (mode === 'victory') { endT += dt; if (endT > 3 && (api.anyPressed('Enter', 'Space') || endT > 20)) gameOver(); return; }
        if (mode === 'gameover') { endT += dt; if (endT > 4 || (endT > 1.5 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; phase = 'scores'; phaseT = 0; music(CFG.music[0]); } return; }
      }

      // ---------------- rendering
      function castWalls(dX, dY, plX, plY) {
        const N = lv.N, cell = lv.cell;
        for (let col = 0; col < VW; col++) {
          const camX = 2 * (col + 0.5) / VW - 1, rdx = dX + plX * camX, rdy = dY + plY * camX;
          let mx = px | 0, my = py | 0;
          const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
          let stx, sty, sdx, sdy;
          if (rdx < 0) { stx = -1; sdx = (px - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - px) * ddx; }
          if (rdy < 0) { sty = -1; sdy = (py - my) * ddy; } else { sty = 1; sdy = (my + 1 - py) * ddy; }
          let dist = 64, tex = TEX[1], u = 0, side = 0, hit = false;
          for (let it = 0; it < 200; it++) {
            if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
            if (mx < 0 || my < 0 || mx >= N || my >= N) break;
            const i = my * N + mx, k = cell[i];
            if (k === 0) continue;
            const tEnter = side === 0 ? sdx - ddx : sdy - ddy;
            if (k === K_WALL) {
              dist = tEnter;
              let wx = side === 0 ? py + dist * rdy : px + dist * rdx; wx -= Math.floor(wx);
              u = (wx * 64) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = 63 - u;
              const fi = side === 0 ? i - stx : i - sty * N;
              const ti = cell[fi] === K_DOOR ? TX.frame : lv.wtex[i];
              tex = side ? TEXD[ti] : TEX[ti]; hit = true; break;
            }
            if (k === K_DOOR) {
              const d = lv.doors[lv.doorAt[i]];
              let t, f;
              if (d.vert) { if (rdx === 0) continue; t = (mx + 0.5 - px) / rdx; f = py + t * rdy - my; }
              else { if (rdy === 0) continue; t = (my + 0.5 - py) / rdy; f = px + t * rdx - mx; }
              if (t < tEnter - 1e-6 || f < 0 || f >= 1) continue;
              if (f < d.open) continue;
              dist = t; u = ((f - d.open) * 64) | 0; if (u > 63) u = 63;
              const ti = d.lock === 2 ? TX.doorg : d.lock === 1 ? TX.dooru : TX.door;
              tex = d.vert ? TEX[ti] : TEXD[ti]; hit = true; break;
            }
            if (k === K_PUSH && pw) {
              let t, f;
              if (pw.dx) { const plane = mx + (pw.dx > 0 ? pw.o : 1 - pw.o); if (rdx === 0) continue; t = (plane - px) / rdx; f = py + t * rdy - my; }
              else { const plane = my + (pw.dy > 0 ? pw.o : 1 - pw.o); if (rdy === 0) continue; t = (plane - py) / rdy; f = px + t * rdx - mx; }
              if (t < tEnter - 1e-6 || f < 0 || f >= 1) continue;
              dist = t; u = (f * 64) | 0; tex = pw.dx ? TEX[pw.tex] : TEXD[pw.tex]; hit = true; break;
            }
          }
          if (dist < 0.05) dist = 0.05;
          zbuf[col] = dist;
          if (!hit) continue;
          const lh = WALLK / dist, top = HALF - lh / 2;
          const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(VH, Math.floor(top + lh));
          const step = 64 / lh; let tp = (y0 - top) * step; const base = (u & 63) * 64;
          for (let y = y0; y < y1; y++) { buf[y * W + col] = tex[base + ((tp | 0) & 63)]; tp += step; }
        }
      }
      function drawSprite(x, y, img, scale, alpha, yoff, dX, dY, plX, plY) {
        const sx = x - px, sy = y - py, inv = 1 / (plX * dY - dX * plY);
        const tx = inv * (dY * sx - dX * sy), ty = inv * (-plY * sx + plX * sy);
        if (ty < 0.12) return;
        const scrX = (VW / 2) * (1 + tx / ty), base = WALLK / ty;
        const h = base * scale, w = (PROJ / ty) * scale;
        const bottom = HALF + base / 2 - (yoff || 0) * base, top = bottom - h, left = scrX - w / 2;
        const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(VW, Math.ceil(left + w));
        const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(VH, Math.ceil(bottom));
        const us = 64 / w, vs = 64 / h;
        for (let col = x0; col < x1; col++) {
          if (ty >= zbuf[col]) continue;
          let u = ((col - left) * us) | 0; if (u > 63) u = 63; const b = u * 64;
          for (let yy = y0; yy < y1; yy++) {
            const c = img[b + (((yy - top) * vs) | 0 & 63)];
            if (c && (!alpha || BAYER[((yy & 3) << 2) | (col & 3)] >= alpha)) buf[yy * W + col] = c;
          }
        }
      }
      function enemyFrame(e) {
        const fr = ART[e.type];
        switch (e.st) {
          case 'stand': return fr.stand;
          case 'patrol': case 'chase': return e.moving || (e.st === 'chase' && ET[e.type].melee) ? ((e.anim * 4) | 0) & 1 ? fr.walk1 : fr.walk2 : fr.stand;
          case 'aim': return fr.aim;
          case 'fire': return e.t > 0.06 ? fr.fire : fr.aim;
          case 'atk': return fr.fire;
          case 'pain': return fr.pain;
          case 'die': return e.t > 0.25 ? fr.die1 : fr.die2;
          default: return fr.dead;
        }
      }
      function renderView() {
        for (let y = 0; y < HALF; y++) { const c = shade(lv.ceil, 1 - y / 300), o = y * W; for (let x = 0; x < VW; x++) buf[o + x] = c; }
        for (let y = HALF; y < VH; y++) { const c = shade(lv.floor, 0.75 + (y - HALF) / 320), o = y * W; for (let x = 0; x < VW; x++) buf[o + x] = c; }
        const dX = Math.cos(pa), dY = Math.sin(pa), plX = -dY * FOVT, plY = dX * FOVT;
        castWalls(dX, dY, plX, plY);
        const list = [];
        for (const o of lv.objs) if (!o.gone) list.push({ x: o.x, y: o.y, img: SPR[o.k], s: 1, a: 0, yo: 0 });
        for (const e of lv.enemies) {
          const T = ET[e.type]; let a = 0;
          if (e.st === 'dead' && e.fade > 3) a = Math.min(16, ((e.fade - 3) * 9) | 0);
          if (T.ghost && e.st !== 'dead') a = Math.max(a, 5);
          if (a >= 16) continue;
          list.push({ x: e.x, y: e.y, img: enemyFrame(e), s: T.scale || 1, a, yo: T.ghost && e.st !== 'dead' && e.st !== 'die' ? 0.08 + Math.sin(e.anim * 3) * 0.04 : 0 });
        }
        for (const p of projs) list.push({ x: p.x, y: p.y, img: SPR[p.k], s: 0.5, a: 0, yo: 0.25 });
        for (const f of fx) list.push({ x: f.x, y: f.y, img: SPR[f.k], s: f.k === 'boom' ? 0.9 : 0.6, a: f.t < 0.15 ? 8 : 0, yo: 0.2 });
        for (const s of list) s.d = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
        list.sort((a, b) => b.d - a.d);
        for (const s of list) drawSprite(s.x, s.y, s.img, s.s, s.a, s.yo, dX, dY, plX, plY);
      }
      function drawWeapon() {
        let f = 0; const rate = WEAP[weapon].rate;
        if (wAnim < rate * 0.45) f = 1; else if (wAnim < rate * 0.9) f = 2;
        if (weapon >= 2 && api.key('Space') && ammo > 0 && mode === 'play') f = (((wAnim / rate) * 2) | 0) & 1 ? 2 : 1;
        if (weapon === 1 && f === 2) f = 0;
        const img = WSPR[weapon][f], by = Math.round(Math.abs(Math.sin(bob)) * 4), ox = 96 + Math.round(Math.cos(bob * 0.5) * 3), oy = VH - 128 + 6 + by;
        for (let u = 0; u < 64; u++) for (let v = 0; v < 64; v++) {
          const c = img[u * 64 + v]; if (!c) continue;
          const X = ox + u * 2, Y = oy + v * 2;
          if (Y >= VH - 1) continue;
          buf[Y * W + X] = c; buf[Y * W + X + 1] = c; buf[(Y + 1) * W + X] = c; buf[(Y + 1) * W + X + 1] = c;
        }
      }
      function overlay(col, a) {
        if (a <= 0) return; a = Math.min(0.75, a);
        for (let y = 0; y < VH; y++) { const o = y * W; for (let x = 0; x < VW; x++) buf[o + x] = blend(buf[o + x], col, a); }
      }
      function box(x, y, w, h, bg) { rect(x, y, w, h, C(10, 14, 40)); rect(x + 1, y + 1, w - 1, h - 1, C(110, 130, 200)); rect(x + 1, y + 1, w - 2, h - 2, bg); }
      function drawIcon(img, x, y, sx, sy, w, h) { for (let u = 0; u < w; u++) for (let v = 0; v < h; v++) { const c = img[(sx + u) * 64 + sy + v]; if (c) { const X = x + u, Y = y + v; if (X >= 0 && X < W && Y >= 0 && Y < H) buf[Y * W + X] = c; } } }
      function drawStatus() {
        const pc = A(CFG.panel || [40, 52, 120]);
        rect(0, VH, W, 40, pc); rect(0, VH, W, 1, C(150, 170, 230));
        const bg = shade(pc, 0.55), lab = C(180, 200, 255), val = WHITE;
        box(2, 163, 28, 34, bg); text('FLR', 16, 165, lab, 1, 'c'); text(String(li + 1), 16, 177, val, 2, 'c');
        box(32, 163, 74, 34, bg); text('SCORE', 69, 165, lab, 1, 'c'); text(String(score), 69, 177, val, 2, 'c');
        box(108, 163, 20, 34, bg); text('UP', 118, 165, lab, 1, 'c'); text(String(Math.min(9, lives)), 118, 177, val, 2, 'c');
        box(129, 163, 34, 34, bg);
        let tier = health >= 86 ? 0 : health >= 71 ? 1 : health >= 56 ? 2 : health >= 41 ? 3 : health >= 26 ? 4 : health >= 11 ? 5 : 6;
        const sp = health <= 0 ? 'dead' : faceGrin > 0 ? 'grin' : faceOuch > 0 ? 'ouch' : '';
        const fimg = face(health <= 0 ? 6 : tier, faceLook, sp);
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = fimg[y * 32 + x]; if (c) buf[(164 + y) * W + 130 + x] = c; }
        box(164, 163, 52, 34, bg); text('HEALTH', 190, 165, lab, 1, 'c'); text(health + '%', 190, 177, health <= 25 && (frameN & 16) ? C(255, 80, 60) : val, 2, 'c');
        box(217, 163, 34, 34, bg); text('AMMO', 234, 165, lab, 1, 'c'); text(String(ammo), 234, 177, val, 2, 'c');
        box(252, 163, 14, 34, bg);
        if (keys.g) drawIcon(SPR.gkey, 253, 165, 26, 40, 13, 14); if (keys.s) drawIcon(SPR.skey, 253, 180, 26, 40, 13, 14);
        box(267, 163, 51, 34, bg);
        drawIcon(SPR[WEAP[weapon].icon], 270, 172, 8, 44, 48, 20);
        text(WEAP[weapon].name.split(' ')[0], 292, 189, lab, 1, 'c');
      }
      function drawPlay() {
        renderView();
        if (mode !== 'dying' || dieT < 0.4) drawWeapon();
        overlay(C(255, 0, 0), flashR); overlay(C(255, 230, 80), flashY * 0.6);
        if (msgT > 0 && msg) textS(msg, 160, 6, C(255, 240, 160), 1, 'c');
        if (mode === 'dying') {
          const fz = fizzle(), n = Math.min(fz.length, Math.floor(fz.length * Math.max(0, dieT - 0.3) / 1.2)), red = C(150, 0, 0);
          for (let i = 0; i < n; i++) { const p = fz[i], X = p % VW, Y = (p / VW) | 0; buf[Y * W + X] = red; }
        }
        if (mode === 'intro') {
          rect(40, 54, 240, 50, C(10, 10, 20)); rect(42, 56, 236, 46, A(CFG.panel || [40, 52, 120]));
          textS('FLOOR ' + (li + 1), 160, 62, C(255, 220, 80), 2, 'c');
          textS(lv.name, 160, 80, WHITE, 1, 'c');
          textS(CFG.getReady || 'GET READY!', 160, 92, C(160, 220, 255), 1, 'c');
        }
        if (mode === 'gameover' || mode === 'contwait') { if (mode === 'gameover') { rect(80, 66, 160, 28, BLACK); textS('GAME OVER', 160, 72, C(255, 60, 60), 2, 'c'); } }
        drawStatus();
      }
      function drawBackdrop() {
        const tb = A(CFG.titleSky[0]), tt = A(CFG.titleSky[1]);
        for (let y = 0; y < H; y++) { const c = blend(tt, tb, y / H), o = y * W; for (let x = 0; x < W; x++) buf[o + x] = c; }
        const sr = rng(5); for (let i = 0; i < 70; i++) { const x = (sr() * W) | 0, y = (sr() * 120) | 0; buf[y * W + x] = (i + (frameN >> 4)) % 9 === 0 ? C(120, 120, 140) : C(230, 230, 255); }
        const mc = A(CFG.moon || [240, 236, 210]);
        for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) if (x * x + y * y <= 196) { const X = 290 + x, Y = 92 + y; buf[Y * W + X] = (x + 4) * (x + 4) + (y - 3) * (y - 3) < 30 ? shade(mc, 0.9) : mc; }
        const cs = A(CFG.castle || [20, 16, 28]), win = C(255, 210, 90);
        const hgt = x => { const b = 150 - (Math.abs(x - 160) < 50 ? 40 : 0) - (Math.abs(x - 70) < 14 ? 66 : 0) - (Math.abs(x - 250) < 14 ? 60 : 0) - (Math.abs(x - 160) < 12 ? 30 : 0); return b - ((x >> 2) & 1 ? 4 : 0); };
        for (let x = 0; x < W; x++) { const h = hgt(x); for (let y = h; y < H; y++) buf[y * W + x] = cs; }
        const wr = rng(8);
        for (let i = 0; i < 26; i++) { const x = 10 + ((wr() * 300) | 0), h = hgt(x); const y = h + 8 + ((wr() * (190 - h)) | 0); if (y < H - 4 && (frameN >> 5) % 23 !== i) rect(x, y, 2, 4, win); }
      }
      function drawAttract() {
        if (phase === 'demo' && lv) {
          renderView(); drawWeapon(); drawStatus();
          rect(0, 6, W, 12, BLACK); textS('DEMO', 160, 8, C(255, 220, 80), 1, 'c');
          drawCoin(150); return;
        }
        drawBackdrop();
        if (phase === 'title') {
          const tc = A(CFG.titleColor), sub = A(CFG.subColor);
          const t = CFG.title.toUpperCase(), sc = textW(t, 3) <= 300 ? 3 : 2;
          text(t, 160 + 2, 28 + 2, BLACK, sc, 'c'); text(t, 160 + 1, 28 + 1, shade(tc, 0.5), sc, 'c'); text(t, 160, 28, tc, sc, 'c');
          textS(CFG.subtitle, 160, 56, sub, 1, 'c');
          const fimg = face(0, (frameN >> 5) % 3, (frameN >> 7) % 4 === 0 ? 'grin' : '');
          for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = fimg[y * 32 + x]; if (c) rect(136 + x * 1.5, 76 + y * 1.5, 2, 2, c); }
          textS('\u00a9 1992 ' + CFG.maker.toUpperCase(), 160, 186, C(200, 200, 210), 1, 'c');
          drawCoin(150);
        } else if (phase === 'story') {
          rect(16, 14, 288, 150, C(8, 8, 16)); rect(18, 16, 284, 146, A(CFG.panel || [40, 52, 120]));
          textS('MISSION BRIEFING', 160, 22, C(255, 220, 80), 1, 'c');
          CFG.story.forEach((s, i) => textS(s, 26, 38 + i * 11, WHITE, 1));
          drawCoin(176);
        } else {
          rect(46, 14, 228, 150, C(8, 8, 16)); rect(48, 16, 224, 146, A(CFG.panel || [40, 52, 120]));
          textS('HIGH SCORES', 160, 24, C(255, 220, 80), 2, 'c');
          const names = CFG.scoreNames; const tbl = names.map((n, i) => ({ n, s: (names.length - i) * 2000 + 2000 }));
          if (hi > 0) tbl.push({ n: 'YOU', s: hi }); tbl.sort((a, b) => b.s - a.s);
          tbl.slice(0, 7).forEach((r, i) => { textS((i + 1) + '. ' + r.n, 64, 50 + i * 14, r.n === 'YOU' ? C(120, 255, 140) : WHITE, 1); textS(String(r.s), 256, 50 + i * 14, C(255, 220, 120), 1, 'r'); });
          drawCoin(176);
        }
      }
      function drawCoin(y) {
        const blink = (frameN >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS('INSERT COIN', 160, y, C(255, 80, 80), 1, 'c'); }
        else if (api.credits <= 0) { if (blink) textS('INSERT COIN', 160, y, C(255, 80, 80), 1, 'c'); }
        else if (blink) textS('PUSH START', 160, y, C(120, 255, 140), 1, 'c');
        textS('CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, 191, C(170, 170, 180), 1);
      }
      function drawStats() {
        rect(0, 0, W, VH, A(CFG.statsBg || [0, 64, 64]));
        const s = stat;
        const fimg = face(0, 1, 'grin');
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const c = fimg[y * 32 + x]; if (c) rect(14 + x * 2, 20 + y * 2, 2, 2, c); }
        const Y = C(255, 230, 120), Wt = WHITE;
        textS('FLOOR ' + (li + 1), 200, 14, Wt, 2, 'c'); textS('COMPLETED', 200, 34, Wt, 2, 'c');
        const mm = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
        textS('TIME  ' + mm(ltime) + '   PAR ' + mm(lv.par), 200, 60, Y, 1, 'c');
        textS('KILL RATIO     ' + s.k + '%', 110, 80, Wt, 1);
        textS('SECRET RATIO   ' + s.s + '%', 110, 94, Wt, 1);
        textS('TREASURE RATIO ' + s.r + '%', 110, 108, Wt, 1);
        textS('TIME BONUS ' + s.timeB, 110, 126, Y, 1);
        if (s.done) { textS('BONUS ' + s.bonus, 200, 140, C(140, 255, 140), 1, 'c'); if ((frameN >> 4) & 1) textS('PRESS FIRE', 200, 150, C(200, 220, 255), 1, 'c'); }
        drawStatus();
      }
      function drawVictory() {
        drawBackdrop();
        rect(14, 10, 292, 160, C(8, 8, 16)); rect(16, 12, 288, 156, A(CFG.panel || [40, 52, 120]));
        textS('VICTORY!', 160, 20, C(255, 220, 80), 3, 'c');
        CFG.ending.forEach((s, i) => textS(s, 26, 50 + i * 11, WHITE, 1));
        textS('FINAL SCORE ' + score, 160, 150, C(140, 255, 140), 1, 'c');
        if (endT > 3 && ((frameN >> 4) & 1)) textS('PRESS FIRE', 160, 182, C(200, 220, 255), 1, 'c');
      }
      let img = null;
      function render(ctx) {
        if (!img) { img = ctx.createImageData(W, H); buf = new Uint32Array(img.data.buffer); }
        if (mode === 'attract') drawAttract();
        else if (mode === 'stats') drawStats();
        else if (mode === 'victory') drawVictory();
        else drawPlay();
        ctx.putImageData(img, 0, 0);
      }
      return {
        update, render, destroy() { music(null); },
        _dbg: {
          get s() { return { mode, phase, li, px, py, pa, health, ammo, score, lives, keys, kills, secrets, treas, lv, own, weapon }; },
          set god(v) { god = v; }, startGame, loadLevel, setPos(x, y, a) { px = x; py = y; if (a != null) pa = a; }, setMode(m) { mode = m; },
          finish() { finishLevel(); }, win() { victory(); }, give() { own = [true, true, true, true]; ammo = 99; weapon = 3; }, LEVELS, ET, genLevel
        }
      };
    }
  });
})();
