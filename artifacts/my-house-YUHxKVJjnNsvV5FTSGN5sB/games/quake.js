// Quake (id Software, 1996) -- an original take on the slipgate shooter for the Game Room.
// Own software 3D polygon renderer: perspective-correct textured triangles, z-buffer, near-plane clipping,
// baked per-vertex "lightmap" shading with shadow rays, dynamic lights, 3D box-built monsters and weapons.
// All monsters, weapons, levels and sounds are original designs.
(function () {
  'use strict';
  const W = 320, H = 200, VH = 168, CX = 160, CY = 84, FOC = 160, NEAR = 0.05, VSL = 0.56;
  const PI = Math.PI, TAU = PI * 2;

  function RNG(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---------------- palette: 16 ramps x 16 shades, colormap 64 light levels ----------------
  const RAMP = [
    [185, 180, 168], [150, 104, 62], [196, 98, 44], [84, 124, 62], [130, 210, 70], [112, 132, 160],
    [180, 46, 36], [236, 192, 74], [150, 86, 180], [70, 168, 166], [206, 166, 124], [118, 120, 136],
    [255, 150, 40], [130, 210, 255], [96, 112, 176], [236, 230, 214]];
  const CMAP = new Uint32Array(64 * 256);
  (function () {
    for (let r = 0; r < 16; r++) for (let s = 0; s < 16; s++) {
      const k = Math.pow((s + 1) / 16, 1.25), b = RAMP[r], fb = r === 12 || r === 13;
      for (let l = 0; l < 64; l++) {
        const m = fb ? 1.1 : l / 30;
        let R = b[0] * k * m, G = b[1] * k * m, B = b[2] * k * m;
        const ov = Math.max(R, G, B); if (ov > 255) { const e = (ov - 255) * 0.3; R += e; G += e; B += e; }
        CMAP[(l << 8) | (r << 4) | s] = (0xff000000 | (clamp(B | 0, 0, 255) << 16) | (clamp(G | 0, 0, 255) << 8) | clamp(R | 0, 0, 255)) >>> 0;
      }
    }
  })();
  const COL = (r, s, l) => CMAP[((l == null ? 30 : l) << 8) | (r << 4) | s];
  const RGB = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;

  // ---------------- procedural textures (64x64 palette indices) ----------------
  function valueNoise(rng, n) {
    const g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = rng();
    const o = new Float32Array(4096), sc = n / 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const fx = x * sc, fy = y * sc, ix = fx | 0, iy = fy | 0;
      let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const x1 = (ix + 1) % n, y1 = (iy + 1) % n;
      const a = g[iy * n + ix], b = g[iy * n + x1], c = g[y1 * n + ix], d = g[y1 * n + x1];
      o[y * 64 + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
    return o;
  }
  function fbm(seed) {
    const r = RNG(seed), a = valueNoise(r, 4), b = valueNoise(r, 8), c = valueNoise(r, 16), d = valueNoise(r, 32), o = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) o[i] = clamp((a[i] * .4 + b[i] * .3 + c[i] * .2 + d[i] * .1 - 0.5) * 1.8 + 0.5, 0, 1);
    return o;
  }
  const pk = (r, s) => (r << 4) | (s < 0 ? 0 : s > 15 ? 15 : s | 0);
  function mk(f) { const t = new Uint8Array(4096); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) t[(y << 6) | x] = f(x, y, (y << 6) | x); return t; }
  const TEX = [], T = {};
  function def(name, t) { T[name] = TEX.length; TEX.push(t); }
  const N1 = fbm(11), N2 = fbm(23), N3 = fbm(37), N4 = fbm(51), N5 = fbm(77);
  (function () {
    const brick = (ramp, n, bw, bh) => mk((x, y, i) => {
      const row = (y / bh) | 0, bx = (x + (row & 1) * (bw >> 1)) % bw, by = y % bh, v = n[i];
      if (bx < 2 || by < 2) return pk(ramp, 1 + v * 3);
      let s = 5 + v * 8; if (by === 2) s += 2; if (by === bh - 1) s -= 2; if (bx === 2) s += 1; return pk(ramp, s);
    });
    def('BRICK', brick(11, N1, 32, 16));
    def('MOSS', mk((x, y, i) => { const row = y >> 4, bx = (x + (row & 1) * 8) & 15, by = y & 15, v = N2[i];
      if (bx < 1 || by < 1) return pk(0, 1 + v * 2); if (N3[i] > 0.6) return pk(3, 3 + v * 9); return pk(0, 4 + v * 7 + (by === 1 ? 2 : 0)); }));
    def('RUNE', mk((x, y, i) => { const v = N4[i]; const by = y & 31, bx = (x + ((y >> 5) & 1) * 16) & 31;
      if (bx < 1 || by < 1) return pk(11, 1 + v * 2);
      if (by > 8 && by < 24 && bx > 8 && bx < 24) { const gx = bx - 8, gy = by - 8, h = ((x >> 5) * 7 + (y >> 5) * 13) & 7;
        if (((gx === 3 || gx === 12) && (h & 1)) || ((gy === 3 || gy === 12) && (h & 2)) || (gx === gy && (h & 4)) || gx === 8 && gy > 2 && gy < 13) return pk(8, 9 + v * 4); }
      return pk(11, 4 + v * 7); }));
    def('METAL', mk((x, y, i) => { const px = x & 31, py = y & 31; let s = 6 + N2[i] * 4;
      if (px === 0 || py === 0) s = 12; else if (px === 31 || py === 31) s = 2;
      if ((px === 3 || px === 28) && (py === 3 || py === 28)) s = 14; else if ((px === 4 || px === 29) && (py === 4 || py === 29)) s = 2;
      return pk(5, s); }));
    def('RUST', mk((x, y, i) => { const px = x & 31, py = (y + 8) & 31, v = N3[i];
      let s = 5 + N1[i] * 5; if (px === 0 || py === 0) s = 11; else if (px === 31 || py === 31) s = 2;
      if (v > 0.58 && px && py) return pk(2, 3 + N4[i] * 8); return pk(11, s); }));
    def('TECH', mk((x, y, i) => { const v = N5[i];
      if (y >= 24 && y < 28) return pk(0, 1);
      if (y >= 28 && y < 36) { if ((x & 15) >= 6 && (x & 15) <= 9 && y >= 30 && y < 34) return pk(13, 10 + ((x >> 4) & 1) * 3); return pk(5, 4 + v * 3 + (y === 28 ? 4 : 0)); }
      if (y < 24) { const px = x & 15; return pk(0, 5 + v * 5 + (px === 0 ? 3 : px === 15 ? -3 : 0) + (y === 0 ? 3 : 0)); }
      const px = x & 7; return pk(0, 4 + v * 4 + (px === 0 ? 2 : px === 7 ? -2 : 0)); }));
    def('WOOD', mk((x, y, i) => { const px = x & 15, v = N2[i]; if (px === 0) return pk(1, 1);
      const gr = Math.sin((y + v * 30) * 0.45 + (x >> 4) * 2) * 0.5 + 0.5; return pk(1, 4 + gr * 4 + v * 4 + (px === 1 ? 2 : 0)); }));
    def('FLAG', mk((x, y, i) => { const row = y >> 4, ox = (row & 1) ? 10 : 0, bx = (x + ox) % 21, by = y & 15, v = N1[i];
      if (bx === 0 || by === 0) return pk(0, 2); if (N4[i] > 0.78) return pk(0, 3); return pk(0, 5 + v * 6 + (by === 1 ? 2 : 0)); }));
    def('GRATE', mk((x, y, i) => { const px = x & 7, py = y & 7; if (px < 5 && py < 5 && px > 0 && py > 0) return pk(5, 1 + N2[i]);
      return pk(5, 6 + N3[i] * 5 + (px === 0 || py === 0 ? 2 : 0)); }));
    def('PLATE', mk((x, y, i) => { const px = x & 31, py = y & 31; let s = 5 + N4[i] * 5; if (px === 0 || py === 0) s = 10; if (px === 31 || py === 31) s = 2;
      if (((x + y) & 7) === 0 && px > 2 && py > 2 && px < 29 && py < 29) s += 2; return pk(11, s); }));
    def('CEILT', mk((x, y, i) => { const px = x & 15, py = y & 15; let s = 4 + N2[i] * 4; if (px === 0 || py === 0) s = 1; if (px === 8 && py === 8) return pk(13, 9); return pk(11, s); }));
    const door = (er, es) => mk((x, y, i) => { const v = N2[i]; let s = 6 + v * 4;
      if (x === 31 || x === 32) return pk(0, 1); if (y < 3 || y > 60) s = 3;
      if ((y > 12 && y < 18) || (y > 46 && y < 52)) return pk(1, 4 + v * 4 + (y === 13 || y === 47 ? 3 : 0));
      if (er >= 0) { const dx = x - 32, dy = y - 32, d = dx * dx + dy * dy; if (d < 100 && d > 30) return pk(er, es + v * 3); if (d <= 30 && d > 12) return pk(er, es - 4); }
      return pk(5, s); });
    def('DOOR', door(-1, 0)); def('DOORB', door(7, 10)); def('DOORI', door(15, 10));
    def('LAVA', new Uint8Array(4096)); def('SLIME', new Uint8Array(4096)); def('GATE', new Uint8Array(4096));
    // model textures
    const solid = (r, s, n, amp) => mk((x, y, i) => pk(r, s + (n ? (n[i] - 0.5) * amp : 0)));
    def('HIDE', mk((x, y, i) => pk(3, 4 + N3[i] * 5 + (((x >> 2) + (y >> 2)) & 1)))); def('CLOTH', solid(2, 6, N1, 6));
    def('IRON', solid(11, 4, N2, 4)); def('BONE', solid(15, 9, N3, 6)); def('LEATHER', solid(1, 6, N4, 5)); def('STONE', solid(0, 6, N5, 8));
    def('GLOW', solid(13, 13, null, 0)); def('GLOWV', solid(8, 14, N2, 3)); def('EMBER', mk((x, y, i) => N3[i] > 0.55 ? pk(12, 8 + N1[i] * 8) : pk(6, 2 + N2[i] * 4)));
    def('MED', mk((x, y) => { const cx = Math.abs(x - 32), cy = Math.abs(y - 32); return (cx < 6 && cy < 20) || (cy < 6 && cx < 20) ? pk(6, 12) : pk(15, 12); }));
    def('GOLD', solid(7, 11, N1, 6)); def('SILVER', solid(15, 11, N2, 6)); def('GREEN', solid(3, 10, N3, 4)); def('YELLOW', solid(7, 9, N3, 4)); def('RED', solid(6, 10, N3, 4));
    def('CRATE', mk((x, y, i) => { const v = N2[i]; if (x < 4 || y < 4 || x > 59 || y > 59 || Math.abs(x - y) < 3) return pk(1, 8 + v * 3); return pk(1, 4 + v * 4); }));
    def('SHELLS', mk((x, y, i) => y > 20 && y < 44 ? pk(6, 9) : pk(1, 6 + N1[i] * 3))); def('NAILS', mk((x, y, i) => y > 20 && y < 44 ? pk(5, 11) : pk(11, 6 + N1[i] * 3)));
    def('ROCKS', mk((x, y, i) => y > 20 && y < 44 ? pk(2, 11) : pk(1, 5 + N1[i] * 3))); def('CELLS', mk((x, y, i) => y > 20 && y < 44 ? pk(13, 12) : pk(11, 6 + N1[i] * 3)));
    def('TEAL', solid(9, 9, N1, 5)); def('VIOLET', solid(8, 8, N3, 6)); def('FLESH', solid(10, 8, N4, 5));
  })();
  // animated textures
  const LAVAN = fbm(91), GATEA = new Float32Array(4096), GATER = new Float32Array(4096);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const dx = x - 31.5, dy = y - 31.5; GATEA[y * 64 + x] = Math.atan2(dy, dx); GATER[y * 64 + x] = Math.sqrt(dx * dx + dy * dy); }
  const SINT = new Float32Array(256); for (let i = 0; i < 256; i++) SINT[i] = Math.sin(i / 256 * TAU);
  function animTex(t) {
    const L = TEX[T.LAVA], S = TEX[T.SLIME], G = TEX[T.GATE], o1 = (t * 30) | 0, o2 = (t * 22) | 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const u = (x + ((SINT[(y * 4 + o1) & 255] * 4) | 0)) & 63, v = (y + ((SINT[(x * 4 + o2) & 255] * 4) | 0)) & 63, n = LAVAN[(v << 6) | u], i = (y << 6) | x;
      L[i] = pk(12, 2 + n * 14); S[i] = pk(4, 2 + n * 11);
      const r = GATER[i], s = Math.sin(GATEA[i] * 3 + r * 0.32 - t * 5) * 0.5 + 0.5; G[i] = pk(13, 3 + s * 9 + (1 - r / 46) * 4);
    }
  }
  // sky: two scrolling cloud layers
  const SKYA = new Uint32Array(4096), SKYB = new Uint32Array(4096), SKYM = new Uint8Array(4096);
  (function () { const a = fbm(301), b = fbm(302); for (let i = 0; i < 4096; i++) { SKYA[i] = COL(14, clamp(2 + a[i] * 7, 0, 15) | 0, 30); SKYM[i] = b[i] > 0.55 ? 1 : 0; SKYB[i] = COL(8, clamp(4 + (b[i] - .55) * 30, 0, 15) | 0, 30); } })();

  // ---------------- 5x7 font ----------------
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
    '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '%': [24, 25, 2, 4, 8, 19, 3]
  };

  // ---------------- weapons, monsters, items ----------------
  const WPN = [
    { name: 'HATCHET', ammo: null, use: 0, rate: 0.45 },
    { name: 'SCATTERGUN', ammo: 's', use: 1, rate: 0.5, pel: 6, spr: 0.05, dmg: 4 },
    { name: 'TWIN-BORE', ammo: 's', use: 2, rate: 0.75, pel: 14, spr: 0.1, dmg: 4 },
    { name: 'NAILER', ammo: 'n', use: 1, rate: 0.1, dmg: 9 },
    { name: 'RIVETER', ammo: 'n', use: 2, rate: 0.1, dmg: 18 },
    { name: 'LOBBER', ammo: 'r', use: 1, rate: 0.6 },
    { name: 'ROCKET TUBE', ammo: 'r', use: 1, rate: 0.8 },
    { name: 'ARC-CASTER', ammo: 'c', use: 1, rate: 0.1 }];
  const AMAX = { s: 100, n: 200, r: 100, c: 100 };
  const MT = {
    scrapper: { hp: 30, r: 0.26, h: 0.95, spd: 1.7, score: 100, name: 'SCRAPPER' },
    gnasher: { hp: 25, r: 0.3, h: 0.55, spd: 3.6, score: 150, name: 'GNASHER' },
    warden: { hp: 80, r: 0.3, h: 1.05, spd: 2.1, score: 300, name: 'BONEWARDEN' },
    wisp: { hp: 60, r: 0.28, h: 0.6, spd: 1.9, score: 400, fly: true, name: 'LANTERN WISP' },
    brute: { hp: 200, r: 0.4, h: 1.25, spd: 1.3, score: 500, name: 'FURNACE BRUTE' },
    golem: { hp: 400, r: 0.42, h: 1.7, spd: 1.2, score: 1000, name: 'RIVET GOLEM' },
    maw: { hp: 2200, r: 1.6, h: 4.2, spd: 0, score: 15000, name: 'THE MAW OF YLGR' }};

  // themes: [wall, wall2, floor, ceil]
  const THEMES = [['TECH', 'METAL', 'GRATE', 'CEILT'], ['RUST', 'METAL', 'PLATE', 'CEILT'], ['BRICK', 'RUNE', 'FLAG', 'WOOD'],
    ['MOSS', 'BRICK', 'FLAG', 'BRICK'], ['RUNE', 'BRICK', 'PLATE', 'METAL']];
  const LEVELS = [
    { name: 'THE RUST GATE', gx: 3, gy: 2, rooms: 6, themes: [0, 1], sky: 0.4, dens: 0.55, mix: { scrapper: 6, gnasher: 3 }, give: [2], keys: 0, amb: 9, liquid: 'slime', seed: 101 },
    { name: 'OSSUARY HALLS', gx: 3, gy: 3, rooms: 7, themes: [2, 3], sky: 0.2, dens: 0.65, mix: { scrapper: 4, gnasher: 3, warden: 3 }, give: [3, 5], keys: 1, amb: 7, liquid: 'slime', seed: 202 },
    { name: 'THE DROWNED CHAPEL', gx: 4, gy: 3, rooms: 9, themes: [3, 4], sky: 0.3, dens: 0.7, mix: { scrapper: 3, gnasher: 3, warden: 3, wisp: 3 }, give: [6], keys: 1, amb: 7, liquid: 'slime', ledge: 1, lifts: 1, seed: 303 },
    { name: 'CINDER FOUNDRY', gx: 4, gy: 3, rooms: 10, themes: [1, 0], sky: 0.3, dens: 0.75, mix: { scrapper: 4, gnasher: 2, warden: 2, wisp: 2, brute: 3 }, give: [4], keys: 2, amb: 8, liquid: 'lava', ledge: 1, lifts: 1, seed: 404 },
    { name: 'SPIRE OF WHISPERS', gx: 4, gy: 3, rooms: 10, themes: [4, 2], sky: 0.5, dens: 0.8, mix: { gnasher: 2, warden: 3, wisp: 3, brute: 3, golem: 1 }, give: [7], keys: 2, amb: 7, liquid: 'lava', ledge: 1, lifts: 1, seed: 505 },
    { name: 'THE UNDERVAULT', gx: 4, gy: 4, rooms: 11, themes: [3, 1], sky: 0.15, dens: 0.85, mix: { scrapper: 2, gnasher: 2, warden: 3, wisp: 2, brute: 3, golem: 2 }, give: [], keys: 2, amb: 6, liquid: 'slime', ledge: 1, lifts: 1, seed: 606 },
    { name: 'SHATTERED BASTION', gx: 5, gy: 3, rooms: 12, themes: [0, 4, 2], sky: 0.4, dens: 0.9, mix: { scrapper: 2, gnasher: 2, warden: 3, wisp: 3, brute: 3, golem: 2 }, give: [], keys: 2, amb: 7, liquid: 'lava', ledge: 1, lifts: 1, seed: 707 },
    { name: 'THRONE OF THE MAW', boss: true, themes: [4, 2], amb: 9, seed: 808 }];

  const K_NORM = 0, K_LAVA = 1, K_SLIME = 2, K_DOOR = 3, K_SECRET = 4, K_LIFT = 5, K_KEYB = 6, K_KEYI = 7, K_GATE = 8;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const SW = 11, STEP = 0.3, PR = 0.25, PHT = 0.9, EYE = 0.72, GRAV = 13;

  // ---------------- level generator ----------------
  function newGrid(mw, mh) {
    const N = mw * mh;
    return { mw, mh, sol: new Uint8Array(N).fill(1), fl: new Float32Array(N), ce: new Float32Array(N), sky: new Uint8Array(N), kind: new Uint8Array(N),
      th: new Uint8Array(N), corr: new Uint8Array(N), room: new Int16Array(N).fill(-1), ledge: new Uint8Array(N), ents: [], lights: [], secrets: 0, start: null };
  }
  function openCell(g, x, y, f, c, sky, th, room) { const i = y * g.mw + x; g.sol[i] = 0; g.fl[i] = f; g.ce[i] = c; g.sky[i] = sky ? 1 : 0; g.th[i] = th; g.room[i] = room; }

  function genLevel(cfg, seed) {
    const rng = RNG(seed), ri = (a, b) => a + ((rng() * (b - a + 1)) | 0), pick = a => a[(rng() * a.length) | 0];
    const GX = cfg.gx, GY = cfg.gy, g = newGrid(GX * SW + 2, GY * SW + 2), mw = g.mw;
    const slot = new Int16Array(GX * GY).fill(-1), rooms = [];
    const r0 = { sx: 0, sy: ri(0, GY - 1), par: -1, depth: 0, kids: [] }; rooms.push(r0); slot[r0.sy * GX] = 0;
    while (rooms.length < Math.min(cfg.rooms, GX * GY)) {
      const cand = []; let tw = 0;
      for (let i = 0; i < rooms.length; i++) { const r = rooms[i]; for (const [dx, dy] of DIRS) { const nx = r.sx + dx, ny = r.sy + dy;
        if (nx < 0 || ny < 0 || nx >= GX || ny >= GY || slot[ny * GX + nx] >= 0) continue; const w = 1 + r.depth * r.depth * 0.7; cand.push([i, nx, ny, w]); tw += w; } }
      if (!cand.length) break;
      let q = rng() * tw, c = cand[0]; for (const k of cand) { q -= k[3]; if (q <= 0) { c = k; break; } }
      const nr = { sx: c[1], sy: c[2], par: c[0], depth: rooms[c[0]].depth + 1, kids: [] }; rooms[c[0]].kids.push(rooms.length); slot[nr.sy * GX + nr.sx] = rooms.length; rooms.push(nr);
    }
    let exitI = 0; rooms.forEach((r, i) => { if (r.depth > rooms[exitI].depth) exitI = i; });
    const mp = []; for (let i = exitI; i >= 0; i = rooms[i].par) mp.unshift(i);
    const onPath = new Set(mp);
    rooms.forEach((r, i) => {
      const x0 = 1 + r.sx * SW, y0 = 1 + r.sy * SW; r.cx = x0 + 5; r.cy = y0 + 5;
      const big = i === 0 || i === exitI || rng() < 0.3, w = big ? ri(7, 9) : ri(4, 8), h = big ? ri(7, 9) : ri(4, 8);
      r.x0 = ri(Math.max(x0 + 1, r.cx - w + 1), Math.min(r.cx, x0 + 10 - w)); r.x1 = r.x0 + w - 1;
      r.y0 = ri(Math.max(y0 + 1, r.cy - h + 1), Math.min(r.cy, y0 + 10 - h)); r.y1 = r.y0 + h - 1; r.w = w; r.h = h;
      r.th = pick(cfg.themes); r.sky = i === 0 ? true : rng() < cfg.sky; r.tall = big || rng() < 0.4; r.door = rng() < 0.5;
    });
    const corr = (A, B) => { const c = [];
      if (A.sy === B.sy) { if (B.sx > A.sx) for (let x = A.x1 + 1; x < B.x0; x++) c.push([x, A.cy]); else for (let x = A.x0 - 1; x > B.x1; x--) c.push([x, A.cy]); }
      else { if (B.sy > A.sy) for (let y = A.y1 + 1; y < B.y0; y++) c.push([A.cx, y]); else for (let y = A.y0 - 1; y > B.y1; y--) c.push([A.cx, y]); }
      return c; };
    rooms[0].fh = 0;
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i], A = rooms[r.par]; r.corr = corr(A, r); const L = r.corr.length, maxStep = (L - 1) * 0.25;
      let d; r.lift = false;
      if (L >= 3 && cfg.lifts && rng() < 0.35) { d = pick([-1.25, -1, 1, 1.25, 1.5]); r.lift = true; } else d = ri(-2, 2) * 0.25;
      let h = clamp(A.fh + d, 0, 2.5);
      if (r.lift && Math.abs(h - A.fh) < 0.75) r.lift = false;
      if (!r.lift && Math.abs(h - A.fh) > maxStep) h = A.fh + Math.sign(h - A.fh) * maxStep;
      r.fh = Math.round(h * 4) / 4;
    }
    // locks
    const sub = (i, set) => { set.add(i); for (const k of rooms[i].kids) sub(k, set); return set; };
    const locks = [];
    const nk = Math.min(cfg.keys || 0, Math.max(0, mp.length - 2));
    if (nk >= 1) {
      const fr = nk === 1 ? [0.55] : [0.4, 0.75];
      let prevSub = null;
      for (let k = 0; k < nk; k++) {
        const e = clamp(Math.round(fr[k] * (mp.length - 1)), 1 + k, mp.length - 1);
        if (locks.length && e <= locks[locks.length - 1].e) continue;
        const behind = sub(mp[e], new Set());
        const allowed = []; rooms.forEach((r, i) => { if (!behind.has(i) && (!prevSub || prevSub.has(i)) && i !== 0) allowed.push(i); });
        if (!allowed.length) continue;
        allowed.sort((a, b) => (onPath.has(a) - onPath.has(b)) || (rooms[b].depth - rooms[a].depth));
        const keyRoom = allowed[0];
        if (locks.some(l => l.keyRoom === keyRoom)) continue;
        locks.push({ e, room: mp[e], keyRoom, kind: k === 0 ? K_KEYB : K_KEYI }); prevSub = behind;
      }
    }
    const keyRooms = new Set(locks.map(l => l.keyRoom));
    let secretRoom = -1;
    for (let i = rooms.length - 1; i > 0; i--) { const r = rooms[i]; if (!onPath.has(i) && !r.kids.length && !keyRooms.has(i) && r.corr.length >= 2 && !r.lift) { secretRoom = i; break; } }
    // carve rooms
    rooms.forEach((r, i) => { const ceil = r.sky ? r.fh + 6 : r.fh + (r.tall ? 3.5 : 2.5); r.ceil = ceil;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) openCell(g, x, y, r.fh, ceil, r.sky, r.th, i);
      g.lights.push({ x: (r.x0 + r.x1 + 1) / 2, y: r.sky ? r.fh + 4 : ceil - 0.3, z: (r.y0 + r.y1 + 1) / 2, r: 3.5 + Math.max(r.w, r.h) * 0.75, i: r.sky ? 26 : 30 }); });
    // corridors
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i], A = rooms[r.par], cells = r.corr, L = cells.length, k = r.lift ? Math.max(1, L >> 1) : -1;
      const steps = Math.round((r.fh - A.fh) / 0.25), sg = Math.sign(steps);
      cells.forEach(([x, y], j) => {
        let f; if (r.lift) f = j < k ? A.fh : r.fh; else f = A.fh + sg * Math.min(Math.abs(steps), j) * 0.25;
        let c = f + 1.75; if (j === k) { f = Math.min(A.fh, r.fh); c = Math.max(A.fh, r.fh) + 1.9; }
        openCell(g, x, y, f, c, false, A.th, -1); const ci = y * mw + x; g.corr[ci] = 1;
        if (j === k) g.kind[ci] = K_LIFT;
        if (j === 0) { const lk = locks.find(l => l.room === i); if (lk) g.kind[ci] = lk.kind; else if (i === secretRoom) { g.kind[ci] = K_SECRET; g.corr[ci] = 0; } else if (r.door) g.kind[ci] = K_DOOR; }
      });
      if (L >= 4) { const [x, y] = cells[L >> 1]; g.lights.push({ x: x + 0.5, y: Math.max(A.fh, r.fh) + 1.5, z: y + 0.5, r: 3.6, i: 20 }); }
    }
    // features
    const taken = new Set(); let ledges = 0;
    const lavaK = cfg.liquid === 'lava' ? K_LAVA : K_SLIME;
    rooms.forEach((r, i) => {
      if (r.w < 5 || r.h < 5) return;
      const qs = [[r.x0, r.cx - 2, r.y0, r.cy - 2], [r.cx + 2, r.x1, r.y0, r.cy - 2], [r.x0, r.cx - 2, r.cy + 2, r.y1], [r.cx + 2, r.x1, r.cy + 2, r.y1]].filter(q => q[1] >= q[0] + 1 && q[3] >= q[2] + 1);
      for (const q of qs) {
        const roll = rng(), sz = (q[1] - q[0] + 1) * (q[3] - q[2] + 1);
        let type = roll < 0.25 ? 'pillar' : roll < 0.45 ? 'dais' : roll < 0.62 ? 'pool' : 'none';
        if (cfg.ledge && ledges < 2 && (r.tall || r.sky) && rng() < 0.3 && i !== 0) type = 'ledge';
        if (i === 0 && type === 'pool') type = 'none';
        const cells = []; for (let y = q[2]; y <= q[3]; y++) for (let x = q[0]; x <= q[1]; x++) cells.push([x, y]);
        if (type === 'pillar' && sz >= 9) { const x = (q[0] + q[1]) >> 1, y = (q[2] + q[3]) >> 1; g.sol[y * mw + x] = 1; taken.add(y * mw + x); }
        else if (type === 'dais') { for (const [x, y] of cells) { const ci = y * mw + x; let edge = false;
          for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < q[0] || nx > q[1] || ny < q[2] || ny > q[3]) { const ni = ny * mw + nx; if (!g.sol[ni]) edge = true; } }
          g.fl[ci] = r.fh + (edge && sz > 4 ? 0.25 : 0.5); }
          const [x, y] = cells[(cells.length / 2) | 0]; g.lights.push({ x: x + 0.5, y: r.fh + 1.6, z: y + 0.5, r: 4.5, i: 26 }); g.ents.push({ t: 'brazier', x: x + 0.5, z: y + 0.5 }); taken.add(y * mw + x); }
        else if (type === 'pool') { for (const [x, y] of cells) { const ci = y * mw + x; g.fl[ci] = r.fh - 0.5; g.kind[ci] = lavaK; taken.add(ci);
            if (((x + y) & 1) === 0) g.lights.push({ x: x + 0.5, y: r.fh - 0.2, z: y + 0.5, r: 2.6, i: lavaK === K_LAVA ? 22 : 12 }); } }
        else if (type === 'ledge') { ledges++; g.secrets++; for (const [x, y] of cells) { const ci = y * mw + x; g.fl[ci] = r.fh + 1.5; g.ledge[ci] = g.secrets; taken.add(ci); }
          const [x, y] = cells[(cells.length / 2) | 0]; g.ents.push({ t: 'item', k: pick(['mega', 'fury', 'armor3', 'rockets', 'ward']), x: x + 0.5, z: y + 0.5 }); }
      }
    });
    // entities
    const free = (r, avoidCenter) => { const c = [];
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const ci = y * mw + x;
        if (g.sol[ci] || g.kind[ci] || taken.has(ci) || g.fl[ci] !== r.fh) continue; if (avoidCenter && Math.abs(x - r.cx) <= 1 && Math.abs(y - r.cy) <= 1) continue; c.push(ci); }
      return c; };
    const place = (r, ent, avoidCenter) => { const f = free(r, avoidCenter); if (!f.length) return false; const ci = pick(f); taken.add(ci);
      ent.x = (ci % mw) + 0.5; ent.z = ((ci / mw) | 0) + 0.5; g.ents.push(ent); return true; };
    const R0 = rooms[0];
    g.start = { x: R0.cx + 0.5, z: R0.cy + 0.5, yaw: 0 };
    if (R0.kids.length) { const K = rooms[R0.kids[0]]; g.start.yaw = Math.atan2(K.cy - R0.cy, K.cx - R0.cx); }
    taken.add(R0.cy * mw + R0.cx);
    const E = rooms[exitI], ei = E.cy * mw + E.cx; g.kind[ei] = K_GATE; taken.add(ei); g.exit = { x: E.cx + 0.5, z: E.cy + 0.5 };
    g.lights.push({ x: E.cx + 0.5, y: E.fh + 1, z: E.cy + 0.5, r: 4, i: 28 });
    for (const l of locks) place(rooms[l.keyRoom], { t: 'item', k: l.kind === K_KEYB ? 'keyb' : 'keyi' }, false);
    const gv = cfg.give.slice(); for (let j = 0; j < gv.length; j++) place(rooms[mp[Math.min(mp.length - 1, 1 + j)]] || R0, { t: 'item', k: 'w' + gv[j] }, true);
    if (secretRoom >= 0) { const S = rooms[secretRoom]; place(S, { t: 'item', k: pick(['mega', 'fury', 'ward']) }, false); place(S, { t: 'item', k: 'armor3' }, false); place(S, { t: 'item', k: 'rockets' }, false); g.secrets++; g.secretCell = S.corr[0][1] * mw + S.corr[0][0]; }
    const lv = LEVELS.indexOf(cfg);
    const ammoK = ['shells', 'shells', 'health']; if (lv >= 1) ammoK.push('nails', 'nails', 'rockets'); if (lv >= 2) ammoK.push('rockets'); if (lv >= 4) ammoK.push('cells', 'cells');
    const mixK = Object.keys(cfg.mix), mixW = mixK.map(k => cfg.mix[k]), mixT = mixW.reduce((a, b) => a + b, 0);
    const pickMon = () => { let q = rng() * mixT; for (let j = 0; j < mixK.length; j++) { q -= mixW[j]; if (q <= 0) return mixK[j]; } return mixK[0]; };
    rooms.forEach((r, i) => {
      const area = r.w * r.h; let nm = i === 0 ? 0 : Math.round(area / 12 * cfg.dens * (0.7 + rng() * 0.6)) + (i === exitI ? 1 : 0);
      if (i === secretRoom) nm = Math.min(nm, 1);
      for (let j = 0; j < nm; j++) { let t = pickMon(); if (t === 'golem' && (r.w < 5 || r.h < 5 || r.ceil - r.fh < 2.4)) t = 'warden'; place(r, { t: 'mon', k: t, yaw: rng() * TAU }, i === exitI); }
      const ni = i === 0 ? 2 : ri(1, 3); for (let j = 0; j < ni; j++) place(r, { t: 'item', k: pick(ammoK) }, false);
      if (rng() < 0.25) place(r, { t: 'item', k: rng() < 0.7 ? 'armor1' : 'armor2' }, false);
      if (rng() < 0.3) place(r, { t: 'item', k: 'health' }, false);
      if (i > 0 && rng() < 0.45) { const c = [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]][ri(0, 3)], ci = c[1] * mw + c[0];
        if (!taken.has(ci) && !g.kind[ci] && g.fl[ci] === r.fh) { taken.add(ci); g.ents.push({ t: 'brazier', x: c[0] + 0.5, z: c[1] + 0.5 }); g.lights.push({ x: c[0] + 0.5, y: r.fh + 1.1, z: c[1] + 0.5, r: 4.5, i: 30 }); } }
    });
    g.name = cfg.name; g.amb = cfg.amb;
    return g;
  }

  function genBoss(cfg) {
    const g = newGrid(32, 36), mw = 32;
    for (let y = 2; y <= 23; y++) for (let x = 2; x <= 29; x++) openCell(g, x, y, 0, 8, true, 4, 0);
    for (let y = 27; y <= 33; y++) for (let x = 12; x <= 19; x++) openCell(g, x, y, 0, 3, false, 2, 1);
    for (let y = 24; y <= 26; y++) for (let x = 15; x <= 16; x++) openCell(g, x, y, 0, 2.2, false, 2, -1);
    g.kind[26 * mw + 15] = K_DOOR; g.kind[26 * mw + 16] = K_DOOR;
    for (let y = 3; y <= 8; y++) for (let x = 11; x <= 20; x++) { const ci = y * mw + x; g.fl[ci] = -0.5; g.kind[ci] = K_LAVA; }
    for (const [x0, x1] of [[3, 7], [24, 28]]) for (let y = 11; y <= 17; y++) for (let x = x0; x <= x1; x++) { const ci = y * mw + x; const edge = x === x0 || x === x1 || y === 11 || y === 17; g.fl[ci] = edge ? 0.25 : 0.5; }
    for (const [x, y] of [[9, 12], [22, 12], [9, 19], [22, 19], [12, 15], [19, 15]]) g.sol[y * mw + x] = 1;
    for (const [x, y] of [[3, 3], [28, 3], [3, 22], [28, 22]]) { const ci = y * mw + x; g.fl[ci] = -0.5; g.kind[ci] = K_LAVA; }
    g.lights.push({ x: 16, y: 3, z: 6, r: 12, i: 34 }, { x: 16, y: 4, z: 16, r: 14, i: 24 }, { x: 16, y: 2.6, z: 30, r: 6, i: 30 }, { x: 5.5, y: 2, z: 14.5, r: 6, i: 24 }, { x: 26.5, y: 2, z: 14.5, r: 6, i: 24 });
    for (const [x, y] of [[2, 10], [29, 10], [2, 20], [29, 20], [12, 27], [19, 27]]) { g.ents.push({ t: 'brazier', x: x + 0.5, z: y + 0.5 }); g.lights.push({ x: x + 0.5, y: 1.1, z: y + 0.5, r: 5, i: 30 }); }
    const it = (k, x, y) => g.ents.push({ t: 'item', k, x: x + 0.5, z: y + 0.5 });
    it('rockets', 13, 31); it('rockets', 18, 31); it('cells', 13, 28); it('cells', 18, 28); it('armor3', 15, 32); it('health', 16, 32);
    it('rockets', 5, 14); it('mega', 5, 13); it('rockets', 26, 14); it('cells', 26, 13); it('nails', 8, 21); it('shells', 23, 21); it('health', 4, 20); it('health', 27, 20);
    it('fury', 26, 16); it('rockets', 5, 16); it('cells', 16, 21);
    g.ents.push({ t: 'mon', k: 'maw', x: 16, z: 5.5, yaw: PI / 2 });
    g.ents.push({ t: 'mon', k: 'wisp', x: 6.5, z: 6.5, yaw: 0 }, { t: 'mon', k: 'wisp', x: 25.5, z: 6.5, yaw: 0 });
    g.start = { x: 16, z: 32.5, yaw: -PI / 2 }; g.exit = null; g.bossGate = { x: 16, z: 16 };
    g.name = cfg.name; g.amb = cfg.amb; g.boss = true;
    return g;
  }

  // reachability check used by the generator (keys/doors/lifts/steps)
  function validate(g) {
    const mw = g.mw, N = mw * g.mh, keys = new Set();
    const ent = new Map(); for (const e of g.ents) if (e.t === 'item' && (e.k === 'keyb' || e.k === 'keyi')) ent.set(((e.z | 0) * mw + (e.x | 0)), e.k);
    const lo = i => g.kind[i] === K_LIFT ? g.fl[i] : g.fl[i];
    const liftTop = i => { let t = g.fl[i]; for (const [dx, dy] of DIRS) { const j = i + dx + dy * mw; if (!g.sol[j] && g.fl[j] > t) t = g.fl[j]; } return t; };
    for (let pass = 0; pass < 4; pass++) {
      const seen = new Uint8Array(N), q = [((g.start.z | 0) * mw + (g.start.x | 0))]; seen[q[0]] = 1;
      while (q.length) {
        const i = q.shift(); if (ent.has(i)) keys.add(ent.get(i));
        if (g.kind[i] === K_GATE) return true;
        const top = g.kind[i] === K_LIFT ? liftTop(i) : g.fl[i];
        for (const [dx, dy] of DIRS) { const j = i + dx + dy * mw; if (seen[j] || g.sol[j]) continue; const k = g.kind[j];
          if (k === K_LAVA || k === K_SLIME || k === K_SECRET) continue; if (k === K_KEYB && !keys.has('keyb')) continue; if (k === K_KEYI && !keys.has('keyi')) continue;
          if (lo(j) > top + STEP) continue; if (Math.min(g.ce[i], g.ce[j]) - Math.max(g.fl[i], lo(j)) < 1.0) continue;
          seen[j] = 1; q.push(j); }
      }
    }
    return false;
  }
  function buildGrid(idx) {
    const cfg = LEVELS[idx];
    if (cfg.boss) return genBoss(cfg);
    for (let a = 0; a < 60; a++) { const g = genLevel(cfg, cfg.seed + a * 7919); if (validate(g)) return g; }
    return genLevel(cfg, cfg.seed);
  }

  ArcadeRegistry.register({
    id: 'quake', title: 'Quake', year: 1996, maker: 'id Software',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Arrows/WASD: move \u00b7 Space/Click: fire \u00b7 Z/Enter: jump \u00b7 X or 1-8: weapon \u00b7 Mouse or R/F: look \u00b7 A/D strafe',
    marquee: { bg: '#1a1208', fg: '#c8783a', accent: '#e8c060' },
    create(api) {
      const A = api.audio;
      let FB = null, img = null; const ZB = new Float32Array(W * VH);
      let fb32ok = false;
      // ---------------- level state ----------------
      let MW = 0, MH = 0, SOL, FL, CE, SKY, KIND, LEDGE, cellLit, faces, chunks, NCX, NCZ;
      let G = null, levelIdx = 0;
      let doors = [], lifts = [], dynAt = new Map(), mons = [], items = [], projs = [], parts = [], beams = [], dyn = [], braziers = [];
      let flow = null, flowT = 0, kills = 0, totalMons = 0, secretsFound = 0, levelTime = 0, gate = null, noise = null;
      const CHS = 8;

      // ---------------- geometry build ----------------
      function addFace(list, pts, uv, nx, ny, nz, tex, flags) {
        const nv = pts.length / 3;
        list.push({ v: Float32Array.from(pts), uv: Float32Array.from(uv), l: new Float32Array(nv), nv, nx, ny, nz, tex, sky: !!(flags & 1), two: !!(flags & 2) });
      }
      function losStatic(ax, ay, az, bx, by, bz) {
        const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.sqrt(dx * dx + dy * dy + dz * dz), n = Math.ceil(d / 0.12);
        for (let i = 1; i < n; i++) { const t = i / n, x = ax + dx * t, y = ay + dy * t, z = az + dz * t, cx = Math.floor(x), cz = Math.floor(z);
          if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) return false; const c = cz * MW + cx; if (SOL[c]) return false; if (y < FL[c] - 0.01 || y > CE[c] + 0.01) return false; }
        return true;
      }
      function bake(x, y, z, nx, ny, nz, skyb) {
        let L = G.amb + (skyb ? 7 : 0); const ox = x + nx * 0.07, oy = y + ny * 0.07, oz = z + nz * 0.07;
        for (const lt of G.lights) { const dx = lt.x - ox, dy = lt.y - oy, dz = lt.z - oz, d2 = dx * dx + dy * dy + dz * dz; if (d2 > lt.r * lt.r) continue;
          const d = Math.sqrt(d2) || 1e-3; let ndl = (nx || ny || nz) ? (dx * nx + dy * ny + dz * nz) / d : 1; if (ndl <= 0) continue;
          if (!losStatic(ox, oy, oz, lt.x, lt.y, lt.z)) continue; L += lt.i * (1 - d / lt.r) * (0.35 + 0.65 * ndl); }
        return clamp(L, 0, 63);
      }
      function staticFloor(i) { return FL[i]; }
      function buildWorld() {
        const list = [];
        const quad = (pts, uv, nx, ny, nz, tex, fl) => addFace(list, pts, uv, nx, ny, nz, tex, fl);
        for (let z = 0; z < MH; z++) for (let x = 0; x < MW; x++) {
          const i = z * MW + x; if (SOL[i]) continue;
          const th = THEMES[G.th[i]], f = FL[i], c = CE[i], k = KIND[i];
          const wallT = T[G.corr[i] ? th[1] : th[0]], upT = T[th[1]], stepT = T[th[1]];
          if (k !== K_LIFT) quad([x, f, z, x + 1, f, z, x + 1, f, z + 1, x, f, z + 1], [x * 64, z * 64, x * 64 + 64, z * 64, x * 64 + 64, z * 64 + 64, x * 64, z * 64 + 64], 0, 1, 0,
            k === K_LAVA ? T.LAVA : k === K_SLIME ? T.SLIME : T[th[2]], 0);
          quad([x, c, z, x, c, z + 1, x + 1, c, z + 1, x + 1, c, z], [x * 64, z * 64, x * 64, z * 64 + 64, x * 64 + 64, z * 64 + 64, x * 64 + 64, z * 64], 0, -1, 0, T[th[3]], SKY[i] ? 1 : 0);
          for (let d = 0; d < 4; d++) {
            const nxg = x + DIRS[d][0], nzg = z + DIRS[d][1], j = nzg * MW + nxg;
            const segs = [];
            if (nxg < 0 || nzg < 0 || nxg >= MW || nzg >= MH || SOL[j]) segs.push([f, c, wallT]);
            else { const nf = staticFloor(j), nc = CE[j]; if (nf > f) segs.push([f, Math.min(nf, c), stepT]); if (nc < c) segs.push([Math.max(nc, f), c, upT]); }
            for (const [y0, y1, tx] of segs) for (let ya = y0; ya < y1 - 1e-4; ya += 1) {
              const yb = Math.min(y1, ya + 1), va = -ya * 64, vb = -yb * 64;
              if (d === 0) quad([x + 1, ya, z, x + 1, ya, z + 1, x + 1, yb, z + 1, x + 1, yb, z], [z * 64, va, z * 64 + 64, va, z * 64 + 64, vb, z * 64, vb], -1, 0, 0, tx, 0);
              else if (d === 1) quad([x, ya, z + 1, x, ya, z, x, yb, z, x, yb, z + 1], [z * 64 + 64, va, z * 64, va, z * 64, vb, z * 64 + 64, vb], 1, 0, 0, tx, 0);
              else if (d === 2) quad([x + 1, ya, z + 1, x, ya, z + 1, x, yb, z + 1, x + 1, yb, z + 1], [x * 64 + 64, va, x * 64, va, x * 64, vb, x * 64 + 64, vb], 0, 0, -1, tx, 0);
              else quad([x, ya, z, x + 1, ya, z, x + 1, yb, z, x, yb, z], [x * 64, va, x * 64 + 64, va, x * 64 + 64, vb, x * 64, vb], 0, 0, 1, tx, 0);
            }
          }
        }
        // bake light
        const cache = new Map();
        for (const fc of list) {
          const v = fc.v, cxg = Math.floor((v[0] + v[6]) / 2 - fc.nx * 0.1), czg = Math.floor((v[2] + v[8]) / 2 - fc.nz * 0.1);
          const skyb = cxg >= 0 && czg >= 0 && cxg < MW && czg < MH && SKY[czg * MW + cxg];
          for (let k = 0; k < fc.nv; k++) {
            const key = ((v[k * 3] * 8) | 0) + ',' + ((v[k * 3 + 1] * 8) | 0) + ',' + ((v[k * 3 + 2] * 8) | 0) + ',' + fc.nx + fc.ny + fc.nz + (skyb ? 's' : '');
            let L = cache.get(key); if (L === undefined) { L = bake(v[k * 3], v[k * 3 + 1], v[k * 3 + 2], fc.nx, fc.ny, fc.nz, skyb); cache.set(key, L); }
            fc.l[k] = L;
          }
        }
        cellLit = new Float32Array(MW * MH);
        for (let i = 0; i < MW * MH; i++) if (!SOL[i]) cellLit[i] = bake((i % MW) + 0.5, FL[i] + 0.6, ((i / MW) | 0) + 0.5, 0, 0, 0, SKY[i]);
        // chunks
        NCX = Math.ceil(MW / CHS); NCZ = Math.ceil(MH / CHS); chunks = [];
        for (let j = 0; j < NCX * NCZ; j++) chunks.push({ faces: [], x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9, d: 0 });
        for (const fc of list) {
          const v = fc.v, cx = Math.min(NCX - 1, Math.floor(((v[0] + v[6]) / 2) / CHS)), cz = Math.min(NCZ - 1, Math.floor(((v[2] + v[8]) / 2) / CHS)), ch = chunks[cz * NCX + cx];
          ch.faces.push(fc); for (let k = 0; k < fc.nv; k++) { const X = v[k * 3], Y = v[k * 3 + 1], Z = v[k * 3 + 2];
            if (X < ch.x0) ch.x0 = X; if (X > ch.x1) ch.x1 = X; if (Y < ch.y0) ch.y0 = Y; if (Y > ch.y1) ch.y1 = Y; if (Z < ch.z0) ch.z0 = Z; if (Z > ch.z1) ch.z1 = Z; }
        }
        chunks = chunks.filter(c => c.faces.length);
        faces = list;
      }

      // ---------------- dynamic cell queries ----------------
      function floorAt(i) { if (KIND[i] === K_LIFT) { const l = dynAt.get(i); return l ? l.cur : FL[i]; } return FL[i]; }
      function ceilAt(i) { const k = KIND[i]; if (k === K_DOOR || k === K_SECRET || k === K_KEYB || k === K_KEYI) { const d = dynAt.get(i); if (d) return d.f + d.open * (d.c - d.f); } return CE[i]; }
      const PRB = { f: 0, c: 0, sol: false, door: null };
      function probe(x, z, r) {
        const x0 = Math.floor(x - r), x1 = Math.floor(x + r - 1e-4), z0 = Math.floor(z - r), z1 = Math.floor(z + r - 1e-4);
        let fm = -1e9, cm = 1e9, sol = false, door = null;
        for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
          if (xx < 0 || zz < 0 || xx >= MW || zz >= MH) { sol = true; continue; }
          const c = zz * MW + xx; if (SOL[c]) { sol = true; continue; }
          const f = floorAt(c), ce = ceilAt(c); if (f > fm) fm = f; if (ce < cm) cm = ce; if (dynAt.has(c) && KIND[c] !== K_LIFT) door = dynAt.get(c);
        }
        PRB.f = fm; PRB.c = cm; PRB.sol = sol; PRB.door = door; return PRB;
      }
      function los(ax, ay, az, bx, by, bz) {
        const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.sqrt(dx * dx + dy * dy + dz * dz), n = Math.ceil(d / 0.15);
        for (let i = 1; i < n; i++) { const t = i / n, x = ax + dx * t, y = ay + dy * t, z = az + dz * t, cx = Math.floor(x), cz = Math.floor(z);
          if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) return false; const c = cz * MW + cx; if (SOL[c]) return false; if (y < floorAt(c) || y > ceilAt(c)) return false; }
        return true;
      }
      function rayWorld(ox, oy, oz, dx, dy, dz, max) {
        for (let t = 0.05; t < max; t += 0.05) { const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, cx = Math.floor(x), cz = Math.floor(z);
          if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) return t; const c = cz * MW + cx; if (SOL[c] || y < floorAt(c) || y > ceilAt(c)) return t; }
        return max;
      }
      function solidPt(x, y, z) { const cx = Math.floor(x), cz = Math.floor(z); if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) return true; const c = cz * MW + cx; return SOL[c] || y < floorAt(c) || y > ceilAt(c); }
      const cellOf = (x, z) => clamp(Math.floor(z), 0, MH - 1) * MW + clamp(Math.floor(x), 0, MW - 1);

      // ---------------- renderer ----------------
      const PX = new Float64Array(16), PY = new Float64Array(16), PZ = new Float64Array(16), PU = new Float64Array(16), PV = new Float64Array(16), PL = new Float64Array(16);
      const QX = new Float64Array(16), QY = new Float64Array(16), QZ = new Float64Array(16), QU = new Float64Array(16), QV = new Float64Array(16), QL = new Float64Array(16);
      const SX = new Float64Array(16), SY = new Float64Array(16), SZ = new Float64Array(16), SU = new Float64Array(16), SV = new Float64Array(16), SL = new Float64Array(16);
      let EX = 0, EY = 0, EZ = 0, RXv = 0, RZv = 0, FXv = 1, FZv = 0, CP = 1, SP = 0, skyU = 0, skyV = 0, skyU2 = 0;
      function setCam(x, y, z, yaw, pitch) { EX = x; EY = y; EZ = z; FXv = Math.cos(yaw); FZv = Math.sin(yaw); RXv = -FZv; RZv = FXv; CP = Math.cos(pitch); SP = Math.sin(pitch);
        skyU = (yaw * 81 + api.time * 3) | 0; skyV = (-pitch * 70) | 0; skyU2 = (yaw * 81 + api.time * 9) | 0; }
      function tri(a, b, c, tex, mode) {
        const x0 = SX[a], y0 = SY[a], dx1 = SX[b] - x0, dy1 = SY[b] - y0, dx2 = SX[c] - x0, dy2 = SY[c] - y0;
        const area = dx1 * dy2 - dx2 * dy1; if (area > -1e-3 && area < 1e-3) return;
        const ia = 1 / area;
        const z0 = SZ[a], zx = ((SZ[b] - z0) * dy2 - (SZ[c] - z0) * dy1) * ia, zy = ((SZ[c] - z0) * dx1 - (SZ[b] - z0) * dx2) * ia;
        const u0 = SU[a], ux = ((SU[b] - u0) * dy2 - (SU[c] - u0) * dy1) * ia, uy = ((SU[c] - u0) * dx1 - (SU[b] - u0) * dx2) * ia;
        const v0 = SV[a], vx = ((SV[b] - v0) * dy2 - (SV[c] - v0) * dy1) * ia, vy = ((SV[c] - v0) * dx1 - (SV[b] - v0) * dx2) * ia;
        const l0 = SL[a], lx = ((SL[b] - l0) * dy2 - (SL[c] - l0) * dy1) * ia, ly = ((SL[c] - l0) * dx1 - (SL[b] - l0) * dx2) * ia;
        let ax = SX[a], ay = SY[a], bx = SX[b], by = SY[b], qx = SX[c], qy = SY[c], t;
        if (ay > by) { t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
        if (by > qy) { t = bx; bx = qx; qx = t; t = by; by = qy; qy = t; }
        if (ay > by) { t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
        if (qy - ay < 1e-6) return;
        let ys = Math.ceil(ay - 0.5); if (ys < 0) ys = 0;
        let ye = Math.ceil(qy - 0.5); if (ye > VH) ye = VH;
        const sAC = (qx - ax) / (qy - ay), sAB = by - ay > 1e-9 ? (bx - ax) / (by - ay) : 0, sBC = qy - by > 1e-9 ? (qx - bx) / (qy - by) : 0;
        const tx = TEX[tex];
        for (let y = ys; y < ye; y++) {
          const py = y + 0.5;
          let xl = ax + (py - ay) * sAC, xr = py < by ? ax + (py - ay) * sAB : bx + (py - by) * sBC;
          if (xl > xr) { t = xl; xl = xr; xr = t; }
          let xs = Math.ceil(xl - 0.5); if (xs < 0) xs = 0;
          let xe = Math.ceil(xr - 0.5); if (xe > W) xe = W;
          if (xs >= xe) continue;
          const ox = xs + 0.5 - x0, oy = py - y0;
          let iz = z0 + zx * ox + zy * oy, i = y * W + xs; const e = y * W + xe;
          if (mode === 0) {
            let uu = u0 + ux * ox + uy * oy, vv = v0 + vx * ox + vy * oy, ll = l0 + lx * ox + ly * oy;
            for (; i < e; i++) {
              if (iz > ZB[i]) {
                const z = 1 / iz; let lv = (ll * z) | 0; if (lv > 63) lv = 63; else if (lv < 0) lv = 0;
                FB[i] = CMAP[(lv << 8) | tx[((((vv * z) | 0) & 63) << 6) | (((uu * z) | 0) & 63)]]; ZB[i] = iz;
              }
              iz += zx; uu += ux; vv += vx; ll += lx;
            }
          } else {
            let xx = xs; const sy1 = (((y >> 1) + skyV + 64000) & 63) << 6, sy2 = ((((y * 3) >> 2) + skyV + 64000 + ((api.time * 5) | 0)) & 63) << 6;
            for (; i < e; i++, xx++) {
              if (iz > ZB[i]) { const m = sy2 | (((xx * 3 >> 2) + skyU2 + 64000) & 63); FB[i] = SKYM[m] ? SKYB[m] : SKYA[sy1 | (((xx >> 1) + skyU + 64000) & 63)]; ZB[i] = iz; }
              iz += zx;
            }
          }
        }
      }
      function emitPoly(n, tex, mode) {
        let aN = true, aL = true, aR = true, aT = true, aB = true;
        for (let k = 0; k < n; k++) { const z = PZ[k], x = PX[k], y = PY[k];
          if (z > NEAR) aN = false; if (x > -z) aL = false; if (x < z) aR = false; if (y < z * VSL) aT = false; if (y > -z * VSL) aB = false; }
        if (aN || aL || aR || aT || aB) return;
        let m = 0;
        for (let k = 0; k < n; k++) {
          const b = k + 1 === n ? 0 : k + 1, za = PZ[k], zb = PZ[b], ina = za >= NEAR, inb = zb >= NEAR;
          if (ina) { QX[m] = PX[k]; QY[m] = PY[k]; QZ[m] = za; QU[m] = PU[k]; QV[m] = PV[k]; QL[m] = PL[k]; m++; }
          if (ina !== inb) { const t = (NEAR - za) / (zb - za);
            QX[m] = PX[k] + (PX[b] - PX[k]) * t; QY[m] = PY[k] + (PY[b] - PY[k]) * t; QZ[m] = NEAR; QU[m] = PU[k] + (PU[b] - PU[k]) * t; QV[m] = PV[k] + (PV[b] - PV[k]) * t; QL[m] = PL[k] + (PL[b] - PL[k]) * t; m++; }
        }
        if (m < 3) return;
        for (let k = 0; k < m; k++) { const iz = 1 / QZ[k]; SX[k] = CX + QX[k] * FOC * iz; SY[k] = CY - QY[k] * FOC * iz; SZ[k] = iz; SU[k] = QU[k] * iz; SV[k] = QV[k] * iz; SL[k] = QL[k] * iz; }
        for (let k = 1; k < m - 1; k++) tri(0, k, k + 1, tex, mode);
      }
      function dynLight(x, y, z) { let L = 0; for (let j = 0; j < dyn.length; j++) { const d = dyn[j], dx = d.x - x, dy = d.y - y, dz = d.z - z, q = dx * dx + dy * dy + dz * dz; if (q < d.r2) L += d.i * (1 - Math.sqrt(q / d.r2)); } return L; }
      function toCam(k, x, y, z) { const dx = x - EX, dy = y - EY, dz = z - EZ, zf = dx * FXv + dz * FZv; PX[k] = dx * RXv + dz * RZv; PY[k] = dy * CP - zf * SP; PZ[k] = zf * CP + dy * SP; }
      function drawFace(f) {
        const v = f.v, nv = f.nv;
        if (!f.two && f.nx * (EX - v[0]) + f.ny * (EY - v[1]) + f.nz * (EZ - v[2]) <= 0) return;
        const hasDyn = dyn.length > 0 && !f.sky;
        for (let k = 0; k < nv; k++) { const x = v[k * 3], y = v[k * 3 + 1], z = v[k * 3 + 2]; toCam(k, x, y, z); PU[k] = f.uv[k * 2]; PV[k] = f.uv[k * 2 + 1]; PL[k] = f.l[k] + (hasDyn ? dynLight(x, y, z) : 0); }
        emitPoly(nv, f.tex, f.sky ? 1 : 0);
      }
      function boxVisible(x0, y0, z0, x1, y1, z1) {
        let aN = true, aL = true, aR = true, aT = true, aB = true;
        for (let k = 0; k < 8; k++) { toCam(0, k & 1 ? x1 : x0, k & 2 ? y1 : y0, k & 4 ? z1 : z0); const x = PX[0], y = PY[0], z = PZ[0];
          if (z > NEAR) aN = false; if (x > -z) aL = false; if (x < z) aR = false; if (y < z * VSL) aT = false; if (y > -z * VSL) aB = false; }
        return !(aN || aL || aR || aT || aB);
      }
      // matrices (3x4 row-major)
      function mNew(x, y, z, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return [-s, 0, c, x, 0, 1, 0, y, c, 0, s, z]; }
      function mCam(x, y, z) { return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]; }
      function mc(m) { return m.slice(); }
      function mt(m, x, y, z) { m[3] += m[0] * x + m[1] * y + m[2] * z; m[7] += m[4] * x + m[5] * y + m[6] * z; m[11] += m[8] * x + m[9] * y + m[10] * z; return m; }
      function mrx(m, a) { const c = Math.cos(a), s = Math.sin(a); for (let r = 0; r < 12; r += 4) { const p = m[r + 1], q = m[r + 2]; m[r + 1] = p * c + q * s; m[r + 2] = -p * s + q * c; } return m; }
      function mry(m, a) { const c = Math.cos(a), s = Math.sin(a); for (let r = 0; r < 12; r += 4) { const p = m[r], q = m[r + 2]; m[r] = p * c - q * s; m[r + 2] = p * s + q * c; } return m; }
      function mrz(m, a) { const c = Math.cos(a), s = Math.sin(a); for (let r = 0; r < 12; r += 4) { const p = m[r], q = m[r + 1]; m[r] = p * c + q * s; m[r + 1] = -p * s + q * c; } return m; }
      const BXC = new Float64Array(24);
      const BOXF = [[0, 1, 2, 3, 0, 0, -1], [5, 4, 7, 6, 0, 0, 1], [4, 0, 3, 7, -1, 0, 0], [1, 5, 6, 2, 1, 0, 0], [4, 5, 1, 0, 0, -1, 0], [3, 2, 6, 7, 0, 1, 0]];
      function drawBox(m, hx, hy, hz, tex, L, cam, uvs) {
        uvs = uvs || 1;
        for (let i = 0; i < 8; i++) { const lx = (i === 1 || i === 2 || i === 5 || i === 6) ? hx : -hx, ly = (i === 2 || i === 3 || i === 6 || i === 7) ? hy : -hy, lz = i >= 4 ? hz : -hz;
          BXC[i * 3] = m[0] * lx + m[1] * ly + m[2] * lz + m[3]; BXC[i * 3 + 1] = m[4] * lx + m[5] * ly + m[6] * lz + m[7]; BXC[i * 3 + 2] = m[8] * lx + m[9] * ly + m[10] * lz + m[11]; }
        const ex = cam ? 0 : EX, ey = cam ? 0 : EY, ez = cam ? 0 : EZ;
        for (let f = 0; f < 6; f++) {
          const F = BOXF[f], a = F[4], b = F[5], c = F[6];
          const nx = m[0] * a + m[1] * b + m[2] * c, ny = m[4] * a + m[5] * b + m[6] * c, nz = m[8] * a + m[9] * b + m[10] * c;
          const p = F[0] * 3; if (nx * (ex - BXC[p]) + ny * (ey - BXC[p + 1]) + nz * (ez - BXC[p + 2]) <= 0) continue;
          const sh = L * (0.74 + 0.26 * ny + 0.08 * nx);
          const U = (c ? 2 * hx : 2 * hz) * 64 * uvs, V = (b ? 2 * hz : 2 * hy) * 64 * uvs;
          for (let k = 0; k < 4; k++) { const q = F[k] * 3;
            if (cam) { PX[k] = BXC[q]; PY[k] = BXC[q + 1]; PZ[k] = BXC[q + 2]; } else toCam(k, BXC[q], BXC[q + 1], BXC[q + 2]);
            PU[k] = k === 1 || k === 2 ? U : 0; PV[k] = k < 2 ? V : 0; PL[k] = sh; }
          emitPoly(4, tex, 0);
        }
      }
      function part(base, px, py, pz, ax, ox, oy, oz, hx, hy, hz, tex, L, ay) {
        const m = mc(base); mt(m, px, py, pz); if (ay) mry(m, ay); if (ax) mrx(m, ax); mt(m, ox, oy, oz); drawBox(m, hx, hy, hz, tex, L); return m;
      }
      function point3(x, y, z, col, size) {
        toCam(0, x, y, z); const zc = PZ[0]; if (zc < NEAR) return;
        const iz = 1 / zc, sx = (CX + PX[0] * FOC * iz) | 0, sy = (CY - PY[0] * FOC * iz) | 0, s = Math.max(1, Math.round(size * FOC * iz));
        if (sx < -s || sy < -s || sx >= W + s || sy >= VH + s) return;
        for (let yy = Math.max(0, sy - (s >> 1)); yy < Math.min(VH, sy - (s >> 1) + s); yy++) for (let xx = Math.max(0, sx - (s >> 1)); xx < Math.min(W, sx - (s >> 1) + s); xx++) {
          const i = yy * W + xx; if (iz > ZB[i]) FB[i] = col; }
      }
      function line3(x0, y0, z0, x1, y1, z1, col) {
        const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0, z1 - z0) * 12));
        for (let k = 0; k <= n; k++) { const t = k / n; point3(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, col, 0.025); }
      }

      // ---------------- 2D helpers into framebuffer ----------------
      function rect(x, y, w, h, col) { x |= 0; y |= 0; const x0 = Math.max(0, x), x1 = Math.min(W, x + w), y0 = Math.max(0, y), y1 = Math.min(H, y + h); if (x1 <= x0) return; for (let yy = y0; yy < y1; yy++) FB.fill(col, yy * W + x0, yy * W + x1); }
      function txt(s, x, y, col, sc, grad) {
        sc = sc || 1; s = String(s).toUpperCase(); x |= 0; y |= 0;
        for (let i = 0; i < s.length; i++) { const g = FONT[s[i]]; if (!g) continue;
          for (let r = 0; r < 7; r++) { const bits = g[r]; if (!bits) continue; const c = grad ? grad(r) : col; for (let q = 0; q < 5; q++) if (bits & (16 >> q)) rect(x + (i * 6 + q) * sc, y + r * sc, sc, sc, c); } }
      }
      const tw = (s, sc) => (String(s).length * 6 - 1) * (sc || 1);
      function txtC(s, y, col, sc, grad) { txt(s, (W - tw(s, sc)) >> 1, y, col, sc, grad); }
      function txtSh(s, x, y, col, sc) { txt(s, x + 1, y + 1, RGB(0, 0, 0), sc); txt(s, x, y, col, sc); }
      function txtCS(s, y, col, sc) { txtSh(s, (W - tw(s, sc)) >> 1, y, col, sc); }
      function darken(y0, y1, k) { for (let i = y0 * W; i < y1 * W; i++) { const c = FB[i]; FB[i] = (0xff000000 | ((((c >> 16) & 255) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k)) >>> 0; } }
      function tint(r, g, b, a) { const ia = 1 - a, R = r * a, Gc = g * a, B = b * a; for (let i = 0; i < W * VH; i++) { const c = FB[i];
        FB[i] = (0xff000000 | (((((c >> 16) & 255) * ia + B) | 0) << 16) | (((((c >> 8) & 255) * ia + Gc) | 0) << 8) | (((c & 255) * ia + R) | 0)) >>> 0; } }

      // ---------------- sound ----------------
      const sfx = {
        shot() { A.noise(0.2, { vol: 0.22, freq: 1700, slideTo: 300 }); A.tone(95, 0.12, { type: 'square', vol: 0.1, slideTo: 40 }); },
        dbl() { A.noise(0.32, { vol: 0.26, freq: 1300, slideTo: 180 }); A.tone(70, 0.22, { type: 'sawtooth', vol: 0.13, slideTo: 30 }); },
        nail() { A.tone(1100, 0.03, { type: 'square', vol: 0.05, slideTo: 600 }); A.noise(0.03, { vol: 0.05, freq: 5000 }); },
        rocket() { A.noise(0.4, { vol: 0.16, freq: 700, slideTo: 2600 }); A.tone(160, 0.2, { type: 'sawtooth', vol: 0.06, slideTo: 60 }); },
        gren() { A.tone(320, 0.12, { type: 'triangle', vol: 0.14, slideTo: 110 }); A.noise(0.08, { vol: 0.1, freq: 900 }); },
        bounce() { A.tone(500, 0.04, { type: 'triangle', vol: 0.06 }); },
        boom() { A.noise(0.8, { vol: 0.3, freq: 650, slideTo: 50 }); A.tone(62, 0.55, { type: 'sine', vol: 0.22, slideTo: 24 }); },
        zap() { A.tone(110 + Math.random() * 90, 0.09, { type: 'sawtooth', vol: 0.07 }); A.noise(0.07, { vol: 0.05, freq: 6500 }); },
        axe() { A.noise(0.12, { vol: 0.1, freq: 2600, slideTo: 700 }); },
        chop() { A.tone(140, 0.07, { type: 'square', vol: 0.12, slideTo: 70 }); },
        pick() { A.tone(880, 0.05, { type: 'square', vol: 0.09 }); A.tone(1320, 0.07, { type: 'square', vol: 0.09, delay: 0.05 }); },
        weapon() { A.melody([[392, 0.06], [523, 0.06], [784, 0.12]], { type: 'square', vol: 0.11 }); },
        key() { A.melody([[659, 0.08], [988, 0.08], [1319, 0.16]], { type: 'triangle', vol: 0.14 }); },
        power() { A.melody([[220, 0.1], [330, 0.1], [440, 0.1], [660, 0.3]], { type: 'sawtooth', vol: 0.1 }); },
        door() { A.noise(0.7, { vol: 0.08, freq: 260 }); A.tone(52, 0.7, { type: 'sawtooth', vol: 0.06, slideTo: 64 }); },
        lift() { A.tone(66, 0.9, { type: 'sawtooth', vol: 0.05, slideTo: 92 }); },
        locked() { A.tone(140, 0.2, { type: 'square', vol: 0.12 }); A.tone(110, 0.25, { type: 'square', vol: 0.12, delay: 0.18 }); },
        hurt() { A.tone(190, 0.16, { type: 'sawtooth', vol: 0.14, slideTo: 95 }); },
        die() { A.tone(320, 0.9, { type: 'sawtooth', vol: 0.18, slideTo: 40 }); A.noise(0.6, { vol: 0.1, freq: 500 }); },
        jump() { A.tone(210, 0.08, { type: 'triangle', vol: 0.06, slideTo: 330 }); },
        land() { A.noise(0.05, { vol: 0.07, freq: 420 }); },
        gate() { A.tone(220, 0.7, { type: 'sine', vol: 0.12, slideTo: 990 }); A.noise(0.7, { vol: 0.08, freq: 3200, slideTo: 400 }); },
        secret() { A.melody([[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.09], [1319, 0.2]], { type: 'triangle', vol: 0.13 }); },
        sight(t) { const f = { scrapper: 260, gnasher: 420, warden: 120, wisp: 700, brute: 90, golem: 60, maw: 40 }[t] || 200; A.tone(f, 0.35, { type: 'sawtooth', vol: 0.1, slideTo: f * 0.6 }); },
        mpain(t) { A.tone(t === 'wisp' ? 900 : 230, 0.1, { type: 'square', vol: 0.08, slideTo: 120 }); },
        mdie(t) { A.tone(t === 'wisp' ? 1200 : 180, 0.45, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); A.noise(0.3, { vol: 0.08, freq: 700 }); },
        mshot() { A.noise(0.15, { vol: 0.15, freq: 1500, slideTo: 300 }); },
        bolt() { A.tone(600, 0.2, { type: 'sine', vol: 0.09, slideTo: 1400 }); },
        swing() { A.noise(0.15, { vol: 0.08, freq: 1800, slideTo: 500 }); },
        arc() { A.noise(0.4, { vol: 0.18, freq: 4000, slideTo: 800 }); A.tone(80, 0.4, { type: 'sawtooth', vol: 0.12 }); },
        roar() { A.tone(55, 1.2, { type: 'sawtooth', vol: 0.18, slideTo: 35 }); A.noise(1.2, { vol: 0.12, freq: 300, slideTo: 80 }); }
      };
      let droneT = 2;
      function ambient(dt) {
        droneT -= dt; if (droneT > 0) return; droneT = 7 + Math.random() * 5;
        const base = [55, 49, 41.2, 61.7][(Math.random() * 4) | 0];
        A.tone(base, 5, { type: 'sine', vol: 0.06, attack: 1.5 }); A.tone(base * 1.5, 4, { type: 'triangle', vol: 0.025, attack: 2, delay: 0.5 });
        if (Math.random() < 0.5) A.tone(base * 8 + Math.random() * 40, 1.6, { type: 'sine', vol: 0.02, delay: 1.5, slideTo: base * 6 });
      }

      // ---------------- game state ----------------
      let state = 'title', stT = 0, score = 0, hi = api.getHiScore(25000), lives = 3, nextLife = 30000, coinFlash = 0, god = false;
      let P = null, snapshot = null, msg = '', msgT = 0, flashR = 0, flashG = 0, shake = 0, bonusT = 0, interStats = null, deadT = 0;
      let lastMX = null, lastMY = null, demoPath = null, demoT = 0, attractPhase = 0;
      function newPlayer() { return { r: PR, h: PHT, x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, ground: true, hp: 100, armor: 0, absorb: 0, ammo: { s: 25, n: 0, r: 0, c: 0 },
        wpn: [true, true, false, false, false, false, false, false], cur: 1, cool: 0, keys: {}, fury: 0, ward: 0, bob: 0, kick: 0, swing: 0, eyeOff: 0, turn: 0, dead: false, painT: 0, megaT: 0 }; }

      function loadLevel(idx, forDemo) {
        levelIdx = idx; G = buildGrid(idx);
        MW = G.mw; MH = G.mh; SOL = G.sol; FL = G.fl; CE = G.ce; SKY = G.sky; KIND = G.kind; LEDGE = G.ledge;
        doors = []; lifts = []; dynAt = new Map(); mons = []; items = []; projs = []; parts = []; beams = []; dyn = []; braziers = [];
        for (let i = 0; i < MW * MH; i++) {
          const k = KIND[i]; if (SOL[i]) continue;
          if (k === K_DOOR || k === K_KEYB || k === K_KEYI || k === K_SECRET) {
            const x = i % MW, z = (i / MW) | 0; const axisX = !SOL[i - 1] && !SOL[i + 1];
            const d = { i, x: x + 0.5, z: z + 0.5, f: FL[i], c: CE[i], open: 0, st: 0, t: 0, axisX, kind: k, th: G.th[i] };
            if (k === K_SECRET) { const nb = [i - 1, i + 1, i - MW, i + MW].find(j => !SOL[j] && G.room[j] >= 0); d.th = nb != null ? G.th[nb] : G.th[i]; }
            doors.push(d); dynAt.set(i, d);
          } else if (k === K_LIFT) {
            let top = FL[i]; for (const j of [i - 1, i + 1, i - MW, i + MW]) if (!SOL[j] && FL[j] > top) top = FL[j];
            const l = { i, x: (i % MW) + 0.5, z: ((i / MW) | 0) + 0.5, bottom: FL[i], top, cur: FL[i], st: 0, t: 0 }; lifts.push(l); dynAt.set(i, l);
          }
        }
        buildWorld();
        totalMons = 0; kills = 0; secretsFound = 0; levelTime = 0; gate = null;
        for (const e of G.ents) {
          const ci = cellOf(e.x, e.z);
          if (e.t === 'mon') { spawnMon(e.k, e.x, e.z, e.yaw || 0); }
          else if (e.t === 'item') items.push({ k: e.k, x: e.x, z: e.z, y: FL[ci], ph: Math.random() * TAU });
          else if (e.t === 'brazier') braziers.push({ x: e.x, z: e.z, y: FL[ci] });
        }
        if (G.exit) gate = { x: G.exit.x, z: G.exit.z, y: FL[cellOf(G.exit.x, G.exit.z)], on: true };
        flow = null; flowT = 0;
        if (!forDemo) {
          P.x = G.start.x; P.z = G.start.z; P.y = FL[cellOf(P.x, P.z)]; P.yaw = G.start.yaw; P.pitch = 0; P.vx = P.vz = P.vy = 0; P.keys = {}; P.dead = false; P.eyeOff = 0; P.ground = true; deadT = 0;
          snapshot = { hp: Math.max(P.hp, 100), armor: P.armor, absorb: P.absorb, ammo: Object.assign({}, P.ammo), wpn: P.wpn.slice(), cur: P.cur };
          msg = 'LEVEL ' + (idx + 1) + ': ' + G.name; msgT = 3.5;
        }
      }
      function spawnMon(k, x, z, yaw) {
        const t = MT[k], ci = cellOf(x, z);
        const m = { k, x, z, y: t.fly ? FL[ci] + 1.0 : FL[ci], vy: 0, yaw, hp: t.hp, st: 'idle', tm: 0, cd: 1 + Math.random(), ph: Math.random() * 10, fall: 0, flash: 0, r: t.r, h: t.h, los: false, losT: (Math.random() * 10) | 0, fly: !!t.fly, ground: true, lx: 0, lz: 0, rise: 0, sumT: 8 };
        if (k === 'maw') { m.y = FL[ci] - 4.5; m.st = 'sleep'; }
        mons.push(m); totalMons++; return m;
      }
      function restoreSnapshot() { P.hp = snapshot.hp; P.armor = snapshot.armor; P.absorb = snapshot.absorb; P.ammo = Object.assign({}, snapshot.ammo); P.wpn = snapshot.wpn.slice(); P.cur = snapshot.cur; P.fury = P.ward = 0; P.ammo.s = Math.max(P.ammo.s, 25); }
      function startGame() {
        score = 0; lives = 3; nextLife = 30000; P = newPlayer(); loadLevel(0); state = 'play'; stT = 0;
        A.melody([[110, 0.2], [82, 0.2], [98, 0.2], [73, 0.5]], { type: 'sawtooth', vol: 0.09 });
      }
      function addScore(n) { score += n; if (score >= nextLife) { nextLife += 50000; lives++; msg = 'EXTRA LIFE!'; msgT = 2; sfx.power(); } if (score > hi) hi = score; }
      function say(s, t) { msg = s; msgT = t || 2.2; }

      // ---------------- flow field for monster navigation ----------------
      function computeFlow() {
        const N = MW * MH; if (!flow || flow.length !== N) flow = new Int16Array(N);
        flow.fill(-1); const pc = cellOf(P.x, P.z); const q = new Int32Array(N); let h = 0, t = 0; q[t++] = pc; flow[pc] = 0;
        while (h < t) { const i = q[h++], fi = floorAt(i);
          for (let d = 0; d < 4; d++) { const j = i + DIRS[d][0] + DIRS[d][1] * MW; if (j < 0 || j >= N || flow[j] >= 0 || SOL[j]) continue;
            const k = KIND[j]; if (k === K_SECRET || k === K_KEYB || k === K_KEYI) continue; if (k === K_LAVA) continue;
            if (fi > floorAt(j) + STEP + 0.01 && KIND[i] !== K_LIFT) { /* monster would need to climb from j to i */ continue; }
            flow[j] = flow[i] + 1; q[t++] = j; } }
      }

      // ---------------- movement & collision ----------------
      function tryMove(e, nx, nz, step) {
        const pr = probe(nx, nz, e.r);
        if (pr.sol) return false;
        if (pr.door && pr.c - Math.max(pr.f, e.y) < e.h) { if (e === P) touchDoor(pr.door); else if (pr.door.kind === K_DOOR) openDoor(pr.door); return false; }
        if (e.fly) { if (pr.f > e.y - 0.05 || pr.c < e.y + e.h) return false; }
        else { if (pr.f > e.y + step) return false; if (pr.c - Math.max(pr.f, e.y) < e.h) return false; }
        e.x = nx; e.z = nz; return true;
      }
      function moveEnt(e, dx, dz, step) {
        let moved = false;
        if (dx && tryMove(e, e.x + dx, e.z, step)) moved = true;
        if (dz && tryMove(e, e.x, e.z + dz, step)) moved = true;
        return moved;
      }
      function openDoor(d) { if (d.st !== 1 && d.open < 1) { d.st = 1; sfx.door(); } d.t = 3.5; }
      function touchDoor(d) {
        if (d.kind === K_KEYB && !P.keys.b) { if (msgT <= 0 || msg.indexOf('KEY') < 0) { say('YOU NEED THE BRASS KEY'); sfx.locked(); } return; }
        if (d.kind === K_KEYI && !P.keys.i) { if (msgT <= 0 || msg.indexOf('KEY') < 0) { say('YOU NEED THE IRON KEY'); sfx.locked(); } return; }
        if (d.kind === K_SECRET && d.st === 0 && d.open === 0) { secretsFound++; addScore(500); say('A SECRET AREA!'); sfx.secret(); d.t = 1e9; }
        openDoor(d);
      }
      function updateDoors(dt) {
        for (const d of doors) {
          const near = Math.abs(P.x - d.x) < 1.5 && Math.abs(P.z - d.z) < 1.5 && Math.abs(P.y - d.f) < 2;
          if (near && d.kind === K_DOOR) openDoor(d);
          if (near && (d.kind === K_KEYB || d.kind === K_KEYI) && ((d.kind === K_KEYB && P.keys.b) || (d.kind === K_KEYI && P.keys.i))) openDoor(d);
          if (d.st === 1) { d.open = Math.min(1, d.open + dt * 1.2); if (d.open >= 1) d.st = 2; }
          else if (d.st === 2) { d.t -= dt; if (d.t <= 0 && d.kind !== K_SECRET) { const occ = Math.abs(P.x - d.x) < 0.8 && Math.abs(P.z - d.z) < 0.8 || mons.some(m => m.st !== 'dead' && Math.abs(m.x - d.x) < 0.8 && Math.abs(m.z - d.z) < 0.8);
            if (!occ) { d.st = 3; sfx.door(); } else d.t = 1; } }
          else if (d.st === 3) { d.open = Math.max(0, d.open - dt * 1.2); const occ = Math.abs(P.x - d.x) < 0.8 && Math.abs(P.z - d.z) < 0.8; if (occ) d.st = 1; if (d.open <= 0) d.st = 0; }
        }
      }
      function onCell(e, i) { return cellOf(e.x, e.z) === i; }
      function updateLifts(dt) {
        // a lift travels to its other end when someone steps on it fresh; from the top it returns down when left alone
        for (const l of lifts) {
          const riders = (onCell(P, l.i) && Math.abs(P.y - l.cur) < 0.08) || mons.some(m => m.st !== 'dead' && !m.fly && onCell(m, l.i) && Math.abs(m.y - l.cur) < 0.08);
          if (l.st === 0 || l.st === 2) {
            if (!riders) l.armed = true;
            if (riders) { l.t += dt; if (l.t > (l.armed ? 0.5 : 1.6)) { l.st = l.st === 0 ? 1 : 3; l.armed = false; l.t = 0; sfx.lift(); } }
            else if (l.st === 2 && !riders) { l.t += dt; if (l.t > 3) { l.st = 3; l.t = 0; sfx.lift(); } }
            else if (!riders) l.t = 0;
          }
          else if (l.st === 1) { l.cur = Math.min(l.top, l.cur + dt * 1.6); if (l.cur >= l.top) { l.st = 2; l.t = 0; l.armed = !riders; } }
          else { const under = onCell(P, l.i) && P.y < l.cur - 0.05; if (!under) l.cur = Math.max(l.bottom, l.cur - dt * 1.6); if (l.cur <= l.bottom) { l.st = 0; l.t = 0; l.armed = !riders; } }
        }
      }
      // ---------------- particles / effects ----------------
      function spark(x, y, z, n, col, spd, life, grav) {
        for (let k = 0; k < n && parts.length < 600; k++) parts.push({ x, y, z, vx: (Math.random() - .5) * spd, vy: (Math.random() - .3) * spd, vz: (Math.random() - .5) * spd, t: life * (0.5 + Math.random() * 0.5), col, g: grav == null ? 6 : grav, s: 0.03 });
      }
      function addDyn(x, y, z, r, i, t) { dyn.push({ x, y, z, r2: r * r, i, t }); }
      function explode(x, y, z, dmg, rad, owner) {
        sfx.boom(); shake = Math.max(shake, 0.4);
        for (let k = 0; k < 40; k++) { const c = [COL(12, 15), COL(12, 11), COL(7, 14), COL(6, 9), COL(0, 6)][k % 5]; spark(x, y, z, 1, c, 5, 0.8, 2); }
        for (let k = 0; k < 10; k++) parts.push({ x: x + (Math.random() - .5) * .4, y: y + Math.random() * .3, z: z + (Math.random() - .5) * .4, vx: 0, vy: 0.6, vz: 0, t: 0.6, col: COL(12, 13), g: 0, s: 0.18 + Math.random() * .1, grow: 0.5 });
        addDyn(x, y, z, 4, 40, 0.35);
        for (const m of mons) { if (m.st === 'dead' || m === owner) continue; const cy = m.y + m.h / 2, d = Math.hypot(m.x - x, cy - y, m.z - z) - m.r * 0.5;
          if (d < rad && los(x, y + 0.05, z, m.x, cy, m.z)) hurtMon(m, dmg * (1 - Math.max(0, d) / rad), x, z); }
        if (P && !P.dead && state === 'play') { const cy = P.y + 0.45, dx = P.x - x, dy = cy - y, dz = P.z - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < rad) { const k = (1 - d / rad) * dmg, inv = 1 / (d || 0.01); const kb = k * 0.085 * (owner === P ? 1 : 0.5);
            P.vx += dx * inv * kb; P.vz += dz * inv * kb; P.vy += dy * inv * kb + (owner === P ? 1.5 : 0); if (P.vy > 0) P.ground = false;
            hurtPlayer(owner === P ? k * 0.5 : k); } }
      }
      function updateParts(dt) {
        for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.t -= dt; if (p.t <= 0) { parts[k] = parts[parts.length - 1]; parts.pop(); continue; }
          p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.grow) p.s += p.grow * dt; }
        for (let k = dyn.length - 1; k >= 0; k--) { dyn[k].t -= dt; if (dyn[k].t <= 0) dyn.splice(k, 1); }
        for (let k = beams.length - 1; k >= 0; k--) { beams[k].t -= dt; if (beams[k].t <= 0) beams.splice(k, 1); }
      }

      // ---------------- combat ----------------
      function hurtPlayer(d) {
        if (god || P.dead || state !== 'play') return;
        if (P.ward > 0) return;
        let save = Math.min(P.armor, Math.ceil(d * P.absorb)); P.armor -= save; d -= save; if (P.armor <= 0) P.absorb = 0;
        P.hp -= Math.ceil(d); flashR = Math.min(0.6, flashR + d * 0.02 + 0.1); if (P.painT <= 0) { sfx.hurt(); P.painT = 0.4; }
        if (P.hp <= 0) { P.hp = 0; P.dead = true; deadT = 0; sfx.die(); }
      }
      function hurtMon(m, dmg, sx, sz) {
        if (m.st === 'dead' || m.st === 'sleep') return;
        if (P.fury > 0) dmg *= 4;
        m.hp -= dmg; m.flash = 0.12;
        if (m.st === 'idle') wake(m);
        if (m.hp <= 0) { m.st = 'dead'; m.fall = 0; kills++; addScore(MT[m.k].score); sfx.mdie(m.k);
          spark(m.x, m.y + m.h * 0.6, m.z, 12, m.k === 'wisp' ? COL(8, 14) : COL(0, 8), 2.5, 0.6, 3);
          if (m.k === 'scrapper' && Math.random() < 0.7) items.push({ k: 'sshells', x: m.x, z: m.z, y: floorAt(cellOf(m.x, m.z)), ph: 0 });
          if (m.k === 'maw') bossDown(m);
          return; }
        if (m.k !== 'maw' && m.k !== 'golem' && Math.random() < Math.min(0.8, dmg / MT[m.k].hp * 2 + 0.1) && m.st !== 'atk') { m.st = 'pain'; m.tm = 0.25; sfx.mpain(m.k); }
      }
      function wake(m) { if (m.st === 'idle') { m.st = 'chase'; sfx.sight(m.k); m.cd = 0.5 + Math.random(); } }
      function rayMon(ox, oy, oz, dx, dy, dz, max) {
        let best = null, bt = max;
        for (const m of mons) { if (m.st === 'dead' || m.st === 'sleep') continue;
          const x0 = m.x - m.r, x1 = m.x + m.r, y0 = m.y, y1 = m.y + m.h, z0 = m.z - m.r, z1 = m.z + m.r; let tmin = 0, tmax = bt;
          for (const [o, d, a, b] of [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]]) {
            if (Math.abs(d) < 1e-9) { if (o < a || o > b) { tmin = 1e9; break; } continue; }
            let t1 = (a - o) / d, t2 = (b - o) / d; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) break; }
          if (tmin <= tmax && tmin < bt) { bt = tmin; best = m; } }
        return best ? { m: best, t: bt } : null;
      }
      function aimDir() {
        // vertical auto-aim: find monster nearest the crosshair horizontally
        let best = null, ba = 0.13; const ex = P.x, ey = P.y + EYE, ez = P.z;
        for (const m of mons) { if (m.st === 'dead' || m.st === 'sleep') continue; const dx = m.x - ex, dz = m.z - ez, d = Math.hypot(dx, dz); if (d > 30) continue;
          let a = Math.atan2(dz, dx) - P.yaw; while (a > PI) a -= TAU; while (a < -PI) a += TAU; const tol = Math.abs(a) - Math.atan2(m.r, d);
          if (tol < ba && los(ex, ey, ez, m.x, m.y + m.h * 0.5, m.z)) { ba = tol; best = m; } }
        let pitch = P.pitch;
        if (best) { const dx = best.x - ex, dz = best.z - ez; pitch = Math.atan2(best.y + best.h * 0.55 - ey, Math.hypot(dx, dz)); if (Math.abs(P.pitch) > 0.35) pitch = P.pitch; }
        const cp = Math.cos(pitch); return [Math.cos(P.yaw) * cp, Math.sin(pitch), Math.sin(P.yaw) * cp];
      }
      function fire() {
        const w = WPN[P.cur]; if (P.cool > 0) return;
        if (w.ammo && P.ammo[w.ammo] < w.use) { if (w.ammo === 's' && P.ammo.s >= 1 && P.cur === 2) { P.cur = 1; return; } autoSwitch(); return; }
        if (w.ammo) P.ammo[w.ammo] -= w.use;
        P.cool = w.rate; noise = { x: P.x, z: P.z, t: 0.3 };
        const [dx, dy, dz] = aimDir(), ox = P.x, oy = P.y + EYE - 0.08, oz = P.z;
        const rx = -Math.sin(P.yaw), rz = Math.cos(P.yaw);
        if (P.cur === 0) {
          P.swing = 0.45; sfx.axe();
          const hit = rayMon(ox, oy, oz, dx, dy, dz, 1.1);
          if (hit) { hurtMon(hit.m, 20, ox, oz); sfx.chop(); spark(ox + dx * hit.t, oy + dy * hit.t, oz + dz * hit.t, 6, COL(0, 7), 2, 0.3); }
          else { const t = rayWorld(ox, oy, oz, dx, dy, dz, 1.0); if (t < 1.0) { sfx.chop(); spark(ox + dx * t, oy + dy * t, oz + dz * t, 5, COL(7, 14), 2, 0.3); } }
          return;
        }
        P.kick = 1; addDyn(ox + dx * 0.5, oy, oz + dz * 0.5, 3, 18, 0.07);
        if (P.cur === 1 || P.cur === 2) {
          P.cur === 1 ? sfx.shot() : sfx.dbl();
          for (let k = 0; k < w.pel; k++) {
            const sx = (Math.random() - .5) * 2 * w.spr, sy = (Math.random() - .5) * w.spr * 1.2;
            let ddx = dx + rx * sx, ddy = dy + sy, ddz = dz + rz * sx; const n = 1 / Math.hypot(ddx, ddy, ddz); ddx *= n; ddy *= n; ddz *= n;
            const tw2 = rayWorld(ox, oy, oz, ddx, ddy, ddz, 40), hit = rayMon(ox, oy, oz, ddx, ddy, ddz, tw2);
            if (hit) { hurtMon(hit.m, w.dmg, ox, oz); spark(ox + ddx * hit.t, oy + ddy * hit.t, oz + ddz * hit.t, 2, COL(0, 5), 1.5, 0.3); }
            else if (tw2 < 40) spark(ox + ddx * (tw2 - 0.04), oy + ddy * (tw2 - 0.04), oz + ddz * (tw2 - 0.04), 2, COL(7, 12), 1.5, 0.25);
          }
          return;
        }
        if (P.cur === 3 || P.cur === 4) {
          sfx.nail(); const side = (P.nailSide = -(P.nailSide || 1)) * 0.06;
          projs.push({ k: P.cur === 4 ? 'spike' : 'nail', x: ox + rx * side, y: oy, z: oz + rz * side, vx: dx * 20, vy: dy * 20, vz: dz * 20, life: 3, own: P, dmg: w.dmg });
          return;
        }
        if (P.cur === 5) { sfx.gren(); projs.push({ k: 'gren', x: ox + dx * 0.3, y: oy, z: oz + dz * 0.3, vx: dx * 9 + P.vx * 0.5, vy: dy * 9 + 2.4, vz: dz * 9 + P.vz * 0.5, life: 2.4, own: P, dmg: 110 }); return; }
        if (P.cur === 6) { sfx.rocket(); projs.push({ k: 'rocket', x: ox + dx * 0.3, y: oy, z: oz + dz * 0.3, vx: dx * 15, vy: dy * 15, vz: dz * 15, life: 5, own: P, dmg: 110 }); return; }
        if (P.cur === 7) {
          sfx.zap(); const tw2 = rayWorld(ox, oy, oz, dx, dy, dz, 9), hit = rayMon(ox, oy, oz, dx, dy, dz, tw2), t = hit ? hit.t : tw2;
          beams.push({ x0: ox + rx * 0.1, y0: oy - 0.05, z0: oz + rz * 0.1, x1: ox + dx * t, y1: oy + dy * t, z1: oz + dz * t, t: 0.1 });
          if (hit) hurtMon(hit.m, 15, ox, oz); else if (tw2 < 9) spark(ox + dx * t, oy + dy * t, oz + dz * t, 3, COL(13, 15), 2, 0.2);
          addDyn(ox + dx * t * 0.5, oy, oz + dz * t * 0.5, 4, 22, 0.1);
        }
      }
      function hasAmmo(i) { const w = WPN[i]; return !w.ammo || P.ammo[w.ammo] >= w.use; }
      function autoSwitch() { for (const i of [7, 4, 2, 3, 1, 0]) if (P.wpn[i] && hasAmmo(i)) { if (P.cur !== i) { P.cur = i; P.cool = 0.3; } return; } }
      function cycleWeapon() { for (let k = 1; k <= 8; k++) { const i = (P.cur + k) % 8; if (P.wpn[i] && hasAmmo(i)) { P.cur = i; P.cool = Math.max(P.cool, 0.2); sfx.pick(); return; } } }

      function updateProjs(dt) {
        for (let k = projs.length - 1; k >= 0; k--) {
          const p = projs[k]; p.life -= dt; let dead = p.life <= 0;
          const sub = 3;
          for (let s = 0; s < sub && !dead; s++) {
            const h = dt / sub;
            if (p.k === 'gren' || p.k === 'mgren' || p.k === 'fire') p.vy -= GRAV * 0.75 * h;
            const nx = p.x + p.vx * h, ny = p.y + p.vy * h, nz = p.z + p.vz * h;
            if (solidPt(nx, ny, nz)) {
              if (p.k === 'gren' || p.k === 'mgren') {
                if (solidPt(p.x, ny, p.z)) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.vz *= 0.7; }
                else if (solidPt(nx, p.y, p.z)) p.vx = -p.vx * 0.6; else p.vz = -p.vz * 0.6;
                if (Math.abs(p.vy) > 1) sfx.bounce(); continue;
              }
              dead = true;
              if (p.k === 'rocket' || p.k === 'fire') explode(p.x, p.y, p.z, p.dmg, p.k === 'fire' ? 1.8 : 1.9, p.own);
              else spark(p.x, p.y, p.z, 3, p.k === 'bolt' ? COL(8, 15) : COL(7, 13), 1.5, 0.25);
              break;
            }
            p.x = nx; p.y = ny; p.z = nz;
            if (p.own === P) {
              for (const m of mons) { if (m.st === 'dead' || m.st === 'sleep') continue; if (Math.abs(m.x - p.x) < m.r + 0.06 && Math.abs(m.z - p.z) < m.r + 0.06 && p.y > m.y && p.y < m.y + m.h) {
                dead = true; if (p.k === 'rocket' || p.k === 'gren') explode(p.x, p.y, p.z, p.dmg, 1.9, P); else { hurtMon(m, p.dmg, p.x, p.z); spark(p.x, p.y, p.z, 2, COL(0, 6), 1.5, 0.25); } break; } }
            } else if (!P.dead && Math.abs(P.x - p.x) < PR + 0.08 && Math.abs(P.z - p.z) < PR + 0.08 && p.y > P.y && p.y < P.y + PHT) {
              dead = true; if (p.k === 'mgren' || p.k === 'fire') explode(p.x, p.y, p.z, p.dmg, 1.6, p.own); else hurtPlayer(p.dmg);
            }
          }
          if (!dead && p.life <= 0) dead = true;
          if (dead && p.life <= 0 && (p.k === 'gren' || p.k === 'mgren')) explode(p.x, p.y, p.z, p.dmg, 1.9, p.own);
          if (p.k === 'rocket' && Math.random() < 0.8) parts.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0.3, vz: 0, t: 0.5, col: COL(0, 6 + ((Math.random() * 4) | 0)), g: 0, s: 0.05, grow: 0.15 });
          if (p.k === 'fire' && Math.random() < 0.9) parts.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0.2, vz: 0, t: 0.4, col: COL(12, 12), g: 0, s: 0.12, grow: 0.2 });
          if (dead) { projs[k] = projs[projs.length - 1]; projs.pop(); }
        }
      }

      // ---------------- monsters ----------------
      function updateMon(m, dt) {
        const t = MT[m.k];
        m.flash = Math.max(0, m.flash - dt); m.ph += dt;
        if (m.st === 'dead') { m.fall += dt; if (m.fall > 2.2) m.y -= dt * 0.4; if (!m.fly || m.y > floorAt(cellOf(m.x, m.z))) { if (m.fly) m.y = Math.max(floorAt(cellOf(m.x, m.z)), m.y - dt * 3); } return m.fall > 3.4; }
        if (m.k === 'maw') { updateBoss(m, dt); return false; }
        const ex = P.x, ey = P.y + EYE, ez = P.z, dx = ex - m.x, dz = ez - m.z, dist = Math.hypot(dx, dz);
        if (--m.losT <= 0) { m.losT = 8; m.los = !P.dead && dist < 26 && los(m.x, m.y + m.h * 0.8, m.z, ex, ey, ez); }
        if (m.st === 'idle') {
          m.yaw += Math.sin(m.ph * 0.5) * dt * 0.2;
          if (m.los && dist < 18) { let a = Math.atan2(dz, dx) - m.yaw; while (a > PI) a -= TAU; while (a < -PI) a += TAU; if (Math.abs(a) < 1.6 || dist < 4) wake(m); }
          if (noise && Math.hypot(noise.x - m.x, noise.z - m.z) < 9) wake(m);
          if (m.fly) m.y += Math.sin(m.ph * 2) * dt * 0.2;
          return false;
        }
        const face = Math.atan2(dz, dx);
        if (m.st === 'pain') { m.tm -= dt; if (m.tm <= 0) m.st = 'chase'; return false; }
        if (m.st === 'atk') { m.yaw = face; m.tm -= dt; doAttack(m, dist); return false; }
        if (P.dead) { m.yaw += dt; return false; }
        // chase
        m.cd -= dt;
        let tx = ex, tz = ez, direct = m.los && (dist < 7 || m.fly);
        if (!direct && flow) {
          const ci = cellOf(m.x, m.z); let best = flow[ci] >= 0 ? flow[ci] : 1e4, bj = -1;
          for (let d = 0; d < 4; d++) { const j = ci + DIRS[d][0] + DIRS[d][1] * MW; const v = flow[j]; if (v >= 0 && v < best) { best = v; bj = j; } }
          if (bj >= 0) { tx = (bj % MW) + 0.5; tz = ((bj / MW) | 0) + 0.5; }
        }
        let want = Math.atan2(tz - m.z, tx - m.x); let da = want - m.yaw; while (da > PI) da -= TAU; while (da < -PI) da += TAU; m.yaw += clamp(da, -6 * dt, 6 * dt);
        let spd = t.spd * (m.k === 'warden' && dist < 5 && m.los ? 1.6 : 1);
        if (m.k === 'wisp') { if (m.los && dist < 4) spd = -spd * 0.6; else if (m.los && dist < 6) spd = 0.3; }
        const keep = m.k === 'scrapper' && m.los && dist < 3.5;
        if (!keep && dist > (m.k === 'gnasher' || m.k === 'warden' || m.k === 'golem' ? 0.75 + m.r : 0.9)) {
          const mvx = Math.cos(want) * spd * dt, mvz = Math.sin(want) * spd * dt;
          if (!moveEnt(m, mvx, mvz, STEP)) { m.yaw += (Math.random() - 0.5) * 2; moveEnt(m, Math.cos(m.yaw) * spd * dt, Math.sin(m.yaw) * spd * dt, STEP); }
        }
        // separation
        for (const o of mons) { if (o === m || o.st === 'dead') continue; const sx = m.x - o.x, sz = m.z - o.z, sd = Math.hypot(sx, sz), md = m.r + o.r; if (sd < md && sd > 1e-3) moveEnt(m, sx / sd * (md - sd) * 0.5, sz / sd * (md - sd) * 0.5, STEP); }
        // vertical
        if (m.fly) { const ci = cellOf(m.x, m.z), want2 = clamp(P.y + 0.6 + Math.sin(m.ph * 1.7) * 0.3, floorAt(ci) + 0.2, ceilAt(ci) - m.h - 0.05); m.y += clamp(want2 - m.y, -1.5 * dt, 1.5 * dt); }
        else gravityEnt(m, dt);
        // attack choice
        if (m.cd <= 0 && m.los) {
          const r = { scrapper: 14, gnasher: 4.5, warden: 1.3, wisp: 15, brute: 14, golem: 16 }[m.k];
          if (dist < r) { m.st = 'atk'; m.tm = { scrapper: 0.6, gnasher: 0.9, warden: 0.6, wisp: 0.5, brute: 0.8, golem: 1.3 }[m.k]; m.fired = false; if (m.k === 'golem') sfx.sight('golem'); if (m.k === 'warden') sfx.swing(); }
        }
        return false;
      }
      function gravityEnt(m, dt) {
        const pr = probe(m.x, m.z, m.r); m.vy -= GRAV * dt; m.y += m.vy * dt;
        if (m.y <= pr.f) { m.y = pr.f; m.vy = 0; m.ground = true; } else m.ground = false;
      }
      function doAttack(m, dist) {
        const T0 = { scrapper: 0.3, gnasher: 0.6, warden: 0.3, wisp: 0.25, brute: 0.35, golem: 0.4 }[m.k];
        if (!m.fired && m.tm <= T0) {
          m.fired = true; const ex = P.x, ey = P.y + EYE * 0.8, ez = P.z, mx = m.x, my = m.y + m.h * 0.7, mz = m.z;
          const dx = ex - mx, dy = ey - my, dz = ez - mz, d = Math.hypot(dx, dy, dz) || 1;
          if (m.k === 'scrapper') { sfx.mshot(); addDyn(mx, my, mz, 3, 16, 0.08); if (los(mx, my, mz, ex, ey, ez)) { let dmg = 0; for (let k = 0; k < 4; k++) if (Math.random() < clamp(1 - d / 14, 0.12, 0.7)) dmg += 3; if (dmg) hurtPlayer(dmg); } spark(mx + dx / d * 0.4, my, mz + dz / d * 0.4, 3, COL(7, 14), 1, 0.15, 0); }
          else if (m.k === 'gnasher') { if (dist < 1.2) { hurtPlayer(7); sfx.chop(); } else { m.vy = 4.2; m.leap = 0.6; m.lx = dx / d * 6; m.lz = dz / d * 6; sfx.sight('gnasher'); } }
          else if (m.k === 'warden') { if (dist < 1.5) { hurtPlayer(12); sfx.chop(); } }
          else if (m.k === 'wisp') { sfx.bolt(); projs.push({ k: 'bolt', x: mx, y: my, z: mz, vx: dx / d * 9, vy: dy / d * 9, vz: dz / d * 9, life: 4, own: m, dmg: 9 }); }
          else if (m.k === 'brute') { if (dist < 1.4) { hurtPlayer(15); sfx.chop(); } else { sfx.gren(); const tt = clamp(d / 7, 0.4, 1.6); projs.push({ k: 'mgren', x: mx, y: my, z: mz, vx: dx / tt, vy: (dy + 0.5 * GRAV * 0.75 * tt * tt) / tt, vz: dz / tt, life: tt + 0.4, own: m, dmg: 40 }); } }
          else if (m.k === 'golem') { if (dist < 1.6) { hurtPlayer(25); sfx.chop(); } else if (los(mx, my, mz, ex, ey, ez)) { sfx.arc(); hurtPlayer(28); beams.push({ x0: mx, y0: my + 0.3, z0: mz, x1: ex, y1: ey - 0.2, z1: ez, t: 0.3, col: COL(13, 15) }); addDyn(mx, my, mz, 5, 30, 0.3); } }
        }
        if (m.k === 'gnasher' && m.leap > 0) { m.leap -= 1 / 60; moveEnt(m, m.lx / 60, m.lz / 60, STEP); if (Math.hypot(P.x - m.x, P.z - m.z) < 0.7 && !m.bit) { m.bit = true; hurtPlayer(10); } }
        if (!m.fly) gravityEnt(m, 1 / 60);
        if (m.tm <= 0) { m.st = 'chase'; m.bit = false; m.leap = 0; m.cd = { scrapper: 1.6, gnasher: 0.8, warden: 0.6, wisp: 1.6, brute: 1.8, golem: 2.2 }[m.k] * (0.6 + Math.random() * 0.8) * (levelIdx > 4 ? 0.8 : 1); }
      }
      function updateBoss(m, dt) {
        const dx = P.x - m.x, dz = P.z - m.z, base = floorAt(cellOf(m.x, m.z));
        if (m.st === 'sleep') { if (P.z < 23.5) { m.st = 'rise'; m.tm = 3; sfx.roar(); shake = 1.5; say('THE MAW OF YLGR STIRS!', 3); } return; }
        if (m.st === 'rise') { m.tm -= dt; m.y = base - 4.5 * Math.max(0, m.tm / 3); if (Math.random() < 0.5) spark(m.x + (Math.random() - .5) * 3, base + 0.1, m.z + (Math.random() - .5) * 3, 1, COL(12, 14), 3, 0.8); if (m.tm <= 0) { m.st = 'chase'; m.cd = 2; } return; }
        m.yaw = Math.atan2(dz, dx); m.cd -= dt; m.sumT -= dt; m.y = base + Math.sin(m.ph) * 0.1;
        const rage = m.hp < MT.maw.hp * 0.35;
        if (m.cd <= 0 && !P.dead) {
          m.cd = rage ? 1.6 : 2.4; m.atkAnim = 0.6; sfx.roar();
          const n = rage ? 5 : 3, mx = m.x, my = m.y + 3.6, mz = m.z;
          for (let k = 0; k < n; k++) { const spread = (k - (n - 1) / 2) * 0.9; const tx = P.x + Math.cos(P.yaw + PI / 2) * spread + P.vx * 0.5, tz = P.z + Math.sin(P.yaw + PI / 2) * spread + P.vz * 0.5;
            const ddx = tx - mx, ddz = tz - mz, hd = Math.hypot(ddx, ddz), tt = clamp(hd / 9, 0.6, 2.2), ddy = P.y + 0.3 - my;
            projs.push({ k: 'fire', x: mx, y: my, z: mz, vx: ddx / tt, vy: (ddy + 0.5 * GRAV * 0.75 * tt * tt) / tt, vz: ddz / tt, life: tt + 1.5, own: m, dmg: 30 }); }
        }
        if (m.atkAnim > 0) m.atkAnim -= dt;
        if (m.hp < MT.maw.hp * 0.65 && m.sumT <= 0) { m.sumT = rage ? 9 : 13; const alive = mons.filter(o => o.k === 'wisp' && o.st !== 'dead').length;
          if (alive < 4) for (const sx of [-4, 4]) { const w = spawnMon('wisp', m.x + sx, 9.5, 0); w.y = 2.5; wake(w); spark(w.x, w.y, w.z, 20, COL(8, 15), 3, 0.6, 0); } }
      }
      function bossDown(m) {
        sfx.roar(); shake = 2; say('THE MAW IS SLAIN! ENTER THE SLIPGATE', 4);
        for (let k = 0; k < 6; k++) setTimeoutFx.push({ t: k * 0.3, x: m.x + (Math.random() - .5) * 3, y: m.y + 1 + Math.random() * 3, z: m.z + (Math.random() - .5) * 2 });
        const gx = G.bossGate.x, gz = G.bossGate.z, ci = cellOf(gx, gz); KIND[ci] = K_GATE; gate = { x: gx, z: gz, y: FL[ci], on: true };
      }
      const setTimeoutFx = [];

      // ---------------- items ----------------
      function pickup(it) {
        const k = it.k;
        if (k === 'health') { if (P.hp >= 100) return false; P.hp = Math.min(100, P.hp + 25); say('+25 HEALTH'); }
        else if (k === 'mega') { P.hp = Math.min(250, P.hp + 100); P.megaT = 1; say('MEGA HEALTH'); }
        else if (k === 'armor1' || k === 'armor2' || k === 'armor3') { const v = { armor1: [100, 0.3], armor2: [150, 0.6], armor3: [200, 0.8] }[k]; if (P.armor * P.absorb >= v[0] * v[1]) return false; P.armor = v[0]; P.absorb = v[1]; say({ armor1: 'GREEN', armor2: 'YELLOW', armor3: 'RED' }[k] + ' ARMOR'); }
        else if (k === 'shells' || k === 'sshells') { if (P.ammo.s >= AMAX.s) return false; P.ammo.s = Math.min(AMAX.s, P.ammo.s + (k === 'shells' ? 20 : 5)); say('SHELLS'); }
        else if (k === 'nails') { if (P.ammo.n >= AMAX.n) return false; P.ammo.n = Math.min(AMAX.n, P.ammo.n + 30); say('NAILS'); }
        else if (k === 'rockets') { if (P.ammo.r >= AMAX.r) return false; P.ammo.r = Math.min(AMAX.r, P.ammo.r + 5); say('ROCKETS'); }
        else if (k === 'cells') { if (P.ammo.c >= AMAX.c) return false; P.ammo.c = Math.min(AMAX.c, P.ammo.c + 15); say('CELLS'); }
        else if (k === 'keyb') { P.keys.b = true; say('YOU GOT THE BRASS KEY'); sfx.key(); addScore(200); return true; }
        else if (k === 'keyi') { P.keys.i = true; say('YOU GOT THE IRON KEY'); sfx.key(); addScore(200); return true; }
        else if (k === 'fury') { P.fury = 30; say('FURY SIGIL! QUAD DAMAGE'); sfx.power(); return true; }
        else if (k === 'ward') { P.ward = 30; say('WARDING STONE! INVULNERABLE'); sfx.power(); return true; }
        else if (k[0] === 'w') { const wi = +k.slice(1), had = P.wpn[wi]; P.wpn[wi] = true; const a = WPN[wi].ammo;
          if (a) P.ammo[a] = Math.min(AMAX[a], P.ammo[a] + { s: 10, n: 30, r: 5, c: 15 }[a]); if (!had) { P.cur = wi; P.cool = 0.3; } say('YOU GOT THE ' + WPN[wi].name); sfx.weapon(); addScore(100); return true; }
        sfx.pick(); addScore(10); return true;
      }

      // ---------------- player update ----------------
      function updatePlayer(dt) {
        if (P.dead) { deadT += dt; P.eyeOff = Math.max(-0.55, P.eyeOff - dt * 1.2); return; }
        const k = api.key;
        // look
        const m = api.mouse;
        if (lastMX !== null && (m.x !== lastMX || m.y !== lastMY)) { const dx = m.x - lastMX, dy = m.y - lastMY; if (Math.abs(dx) < 40 && Math.abs(dy) < 40) { P.yaw += dx * 0.012; P.pitch = clamp(P.pitch - dy * 0.01, -1.2, 1.2); } }
        lastMX = m.x; lastMY = m.y;
        const tl = k('ArrowLeft'), tr = k('ArrowRight');
        if (tl || tr) P.turn = Math.min(1, P.turn + dt * 5); else P.turn = 0;
        const ts = 2.7 * (0.35 + 0.65 * P.turn);
        if (tl) P.yaw -= ts * dt; if (tr) P.yaw += ts * dt;
        if (k('KeyR') || k('PageUp')) P.pitch = Math.min(1.2, P.pitch + dt * 1.6);
        if (k('KeyF') || k('PageDown')) P.pitch = Math.max(-1.2, P.pitch - dt * 1.6);
        if (k('KeyC') || k('End')) P.pitch *= 0.8;
        // move
        let fw = 0, st = 0;
        if (k('ArrowUp') || k('KeyW')) fw += 1; if (k('ArrowDown') || k('KeyS')) fw -= 1;
        if (k('KeyA')) st -= 1; if (k('KeyD')) st += 1;
        const cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), sp = 5.2;
        let wx = (cs * fw - sn * st) * sp, wz = (sn * fw + cs * st) * sp; const wl = Math.hypot(wx, wz); if (wl > sp) { wx *= sp / wl; wz *= sp / wl; }
        const acc = P.ground ? Math.min(1, 11 * dt) : Math.min(1, 1.1 * dt);
        if (P.ground || wl > 0) { P.vx += (wx - P.vx) * acc; P.vz += (wz - P.vz) * acc; }
        if ((api.pressed('KeyZ') || api.pressed('Enter') || api.pressed('ShiftLeft')) && P.ground) { P.vy = 4.6; P.ground = false; sfx.jump(); }
        const ox = P.x, oz = P.z, oy = P.y;
        const stepH = P.ground ? STEP : 0.0;
        if (!moveEnt(P, P.vx * dt, 0, stepH)) P.vx *= P.ground ? 0 : 0.2;
        if (!moveEnt(P, 0, P.vz * dt, stepH)) P.vz *= P.ground ? 0 : 0.2;
        // push out of monsters
        for (const mm of mons) { if (mm.st === 'dead' || mm.st === 'sleep') continue; const sx = P.x - mm.x, sz = P.z - mm.z, sd = Math.hypot(sx, sz), md = PR + mm.r;
          if (sd < md && sd > 1e-3 && P.y < mm.y + mm.h && P.y + PHT > mm.y) moveEnt(P, sx / sd * (md - sd), sz / sd * (md - sd), stepH); }
        const pr = probe(P.x, P.z, PR);
        if (P.ground && pr.f > P.y && pr.f - P.y <= STEP + 0.01) { P.eyeOff -= pr.f - P.y; P.y = pr.f; }
        P.vy -= GRAV * dt; P.y += P.vy * dt;
        const pr2 = probe(P.x, P.z, PR);
        if (P.y <= pr2.f) { if (!P.ground && P.vy < -6) { sfx.land(); if (P.vy < -11) hurtPlayer(5); } P.y = pr2.f; P.vy = 0; P.ground = true; }
        else if (P.y - pr2.f > 0.02 || P.vy > 0) P.ground = false;
        else { P.y = pr2.f; P.vy = 0; P.ground = true; }
        if (P.y + PHT > pr2.c) { P.y = Math.max(pr2.f, pr2.c - PHT); if (P.vy > 0) P.vy = 0; }
        P.eyeOff *= Math.pow(0.0001, dt); if (Math.abs(P.eyeOff) < 0.002) P.eyeOff = 0;
        const moved = Math.hypot(P.x - ox, P.z - oz);
        P.bob += moved * 7; if (oy) { }
        // weapon switching
        for (let i = 0; i < 8; i++) if (api.pressed('Digit' + (i + 1)) && P.wpn[i]) { if (hasAmmo(i)) { P.cur = i; P.cool = Math.max(P.cool, 0.2); } else say('NOT ENOUGH AMMO'); }
        if (api.pressed('KeyX')) cycleWeapon();
        P.cool -= dt; P.kick = Math.max(0, P.kick - dt * 6); P.swing = Math.max(0, P.swing - dt);
        if (k('Space') || api.mouse.down) fire();
        if (!hasAmmo(P.cur) && P.cool <= 0) autoSwitch();
        // hazards
        const ci = cellOf(P.x, P.z);
        if (P.ground && (KIND[ci] === K_LAVA || KIND[ci] === K_SLIME)) { P.hazT = (P.hazT || 0) - dt; if (P.hazT <= 0) { P.hazT = 0.5; if (P.ward <= 0) { hurtPlayer(KIND[ci] === K_LAVA ? 12 : 4); } } }
        if (LEDGE[ci] && P.ground && P.y > FL[ci] - 0.1) { if (!G['ledgeFound' + LEDGE[ci]]) { G['ledgeFound' + LEDGE[ci]] = true; secretsFound++; addScore(500); say('A SECRET LEDGE!'); sfx.secret(); } }
        // pickups
        for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (Math.abs(it.x - P.x) < 0.55 && Math.abs(it.z - P.z) < 0.55 && Math.abs(it.y - P.y) < 0.8) { if (pickup(it)) items.splice(i, 1); } }
        // gate
        if (gate && gate.on && Math.abs(gate.x - P.x) < 0.5 && Math.abs(gate.z - P.z) < 0.5) levelDone();
        P.fury = Math.max(0, P.fury - dt); P.ward = Math.max(0, P.ward - dt); P.painT -= dt;
        if (P.hp > 100) { P.megaT -= dt; if (P.megaT <= 0) { P.megaT = 1; P.hp--; } }
      }
      function levelDone() {
        sfx.gate(); const secretsTot = G.secrets;
        const bonus = 1000 * (levelIdx + 1) + Math.round(kills / Math.max(1, totalMons) * 2000);
        interStats = { name: G.name, kills, total: totalMons, secrets: secretsFound, stot: secretsTot, time: levelTime, bonus, n: levelIdx + 1 };
        addScore(bonus); state = 'inter'; stT = 0; bonusT = 0;
      }

      function update(dt) {
        stT += dt; if (coinFlash > 0) coinFlash -= dt; if (msgT > 0) msgT -= dt;
        flashR = Math.max(0, flashR - dt * 1.2); shake = Math.max(0, shake - dt);
        if (state === 'title') {
          updateDemo(dt);
          if (api.pressed('Enter') || api.pressed('Space')) { if (api.useCredit()) startGame(); else { coinFlash = 1.5; A.tone(70, 0.25, { type: 'square', vol: 0.2 }); } }
          return;
        }
        if (state === 'inter') { animTex(api.time); updateParts(dt); if (stT > 2 && (api.pressed('Space') || api.pressed('Enter') || api.pressed('KeyZ') || stT > 9)) nextLevel(); return; }
        if (state === 'win') { animTex(api.time); updateParts(dt); if (stT > 4 && (api.pressed('Space') || api.pressed('Enter')) || stT > 22) gameOver(); return; }
        if (state === 'over') { if (stT > 5 || (stT > 1.5 && (api.pressed('Enter') || api.pressed('Space')))) { state = 'title'; stT = 0; setupDemo(); } return; }
        if (state !== 'play') return;
        animTex(api.time); ambient(dt);
        levelTime += dt; if (noise) { noise.t -= dt; if (noise.t <= 0) noise = null; }
        updatePlayer(dt); updateDoors(dt); updateLifts(dt);
        if (--flowT <= 0) { flowT = 15; computeFlow(); }
        for (let i = mons.length - 1; i >= 0; i--) if (updateMon(mons[i], dt)) mons.splice(i, 1);
        updateProjs(dt); updateParts(dt);
        for (let i = setTimeoutFx.length - 1; i >= 0; i--) { const f = setTimeoutFx[i]; f.t -= dt; if (f.t <= 0) { explode(f.x, f.y, f.z, 0, 0.1, null); setTimeoutFx.splice(i, 1); } }
        for (const b of braziers) if (Math.random() < 0.3) parts.push({ x: b.x + (Math.random() - .5) * .15, y: b.y + 0.75, z: b.z + (Math.random() - .5) * .15, vx: 0, vy: 0.8, vz: 0, t: 0.4, col: COL(12, 10 + ((Math.random() * 5) | 0)), g: -0.5, s: 0.05 });
        if (P.dead && deadT > 2.2) playerDied();
      }
      function playerDied() {
        lives--;
        if (lives > 0) { restoreSnapshot(); const keep = P; loadLevel(levelIdx); P = keep; P.hp = Math.max(100, P.hp); state = 'play'; return; }
        state = 'dying';
        const cont = () => { lives = 3; score = 0; restoreSnapshot(); P.hp = 100; loadLevel(levelIdx); state = 'play'; };
        if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver();
      }
      function gameOver() { api.setHiScore(score); hi = Math.max(hi, api.getHiScore(0), score); state = 'over'; stT = 0; }
      function nextLevel() {
        if (levelIdx + 1 >= LEVELS.length) { state = 'win'; stT = 0; api.setHiScore(score); A.melody([[220, 0.3], [277, 0.3], [330, 0.3], [440, 0.9]], { type: 'triangle', vol: 0.14 }); return; }
        loadLevel(levelIdx + 1); state = 'play'; stT = 0;
      }

      // ---------------- attract demo camera ----------------
      function setupDemo() {
        P = newPlayer(); loadLevel(0, true);
        const N = MW * MH, prev = new Int32Array(N).fill(-1), s = cellOf(G.start.x, G.start.z), q = [s]; prev[s] = s;
        while (q.length) { const i = q.shift(); for (const [dx, dz] of DIRS) { const j = i + dx + dz * MW; if (prev[j] >= 0 || SOL[j]) continue; prev[j] = i; q.push(j); } }
        let e = cellOf(G.exit.x, G.exit.z); const path = []; while (e !== s && e >= 0) { path.unshift(e); e = prev[e]; } path.unshift(s);
        demoPath = path.map(i => [(i % MW) + 0.5, ((i / MW) | 0) + 0.5, FL[i]]); demoT = 0;
        for (const d of doors) { d.open = 1; d.st = 2; d.t = 1e9; }
      }
      function updateDemo(dt) {
        if (!demoPath) setupDemo();
        animTex(api.time); updateParts(dt);
        demoT += dt * 1.7; if (demoT >= demoPath.length - 1) demoT = 0;
        for (const b of braziers) if (Math.random() < 0.3) parts.push({ x: b.x, y: b.y + 0.75, z: b.z, vx: 0, vy: 0.8, vz: 0, t: 0.4, col: COL(12, 12), g: -0.5, s: 0.05 });
        for (const m of mons) m.ph += dt;
      }
      function demoCam() {
        const i = Math.floor(demoT), f = demoT - i, a = demoPath[i], b = demoPath[Math.min(demoPath.length - 1, i + 1)], c = demoPath[Math.min(demoPath.length - 1, i + 3)];
        const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f, y = a[2] + (b[2] - a[2]) * f + 0.75;
        const yaw = Math.atan2(c[1] - z, c[0] - x);
        if (P.demoYaw == null) P.demoYaw = yaw; let d = yaw - P.demoYaw; while (d > PI) d -= TAU; while (d < -PI) d += TAU; P.demoYaw += d * 0.04;
        return [x, y, z, P.demoYaw + Math.sin(api.time * 0.5) * 0.3, Math.sin(api.time * 0.3) * 0.12];
      }

      // ---------------- drawing entities ----------------
      function litAt(x, y, z) { const ci = cellOf(x, z); let L = SOL[ci] ? 20 : cellLit[ci]; if (dyn.length) L += dynLight(x, y, z); return L; }
      function drawMonster(m, L) {
        let b = mNew(m.x, m.y, m.z, m.yaw);
        const walk = m.st === 'chase' ? Math.sin(m.ph * 9) * 0.6 : 0, atk = m.st === 'atk' ? 1 : 0;
        if (m.flash > 0) L += 25;
        if (m.st === 'dead') { const f = Math.min(1, m.fall * 2.5); mrx(b, -f * 1.45); if (m.k === 'wisp') { mrz(b, f * 2); } }
        const k = m.k;
        if (k === 'scrapper') {
          part(b, -0.1, 0.45, 0, walk, 0, -0.22, 0, 0.07, 0.23, 0.08, T.CLOTH, L); part(b, 0.1, 0.45, 0, -walk, 0, -0.22, 0, 0.07, 0.23, 0.08, T.CLOTH, L);
          const tor = part(b, 0, 0.45, 0, 0.3, 0, 0.2, 0, 0.17, 0.2, 0.11, T.CLOTH, L);
          const hd = part(tor, 0, 0.22, 0.04, -0.2, 0, 0.1, 0, 0.1, 0.1, 0.1, T.IRON, L);
          part(hd, 0, 0, 0.1, 0, 0.0, -0.02, 0, 0.04, 0.04, 0.05, T.IRON, L);
          part(hd, -0.05, 0.03, 0.1, 0, 0, 0, 0, 0.025, 0.02, 0.01, T.GLOW, 40); part(hd, 0.05, 0.03, 0.1, 0, 0, 0, 0, 0.025, 0.02, 0.01, T.GLOW, 40);
          const ar = part(tor, 0.2, 0.15, 0, -1.2 - atk * 0.3, 0, -0.12, 0, 0.05, 0.13, 0.05, T.CLOTH, L);
          part(ar, 0, -0.14, 0.05, 1.4, 0, 0, 0.12, 0.035, 0.035, 0.22, T.RUST, L);
          part(tor, -0.2, 0.15, 0, -0.9, 0, -0.12, 0, 0.05, 0.13, 0.05, T.CLOTH, L);
          part(tor, 0, 0.05, -0.15, 0, 0, 0, 0, 0.12, 0.13, 0.05, T.LEATHER, L);
        } else if (k === 'gnasher') {
          const by = part(b, 0, 0.35, 0, 0, 0, 0, 0, 0.13, 0.12, 0.3, T.HIDE, L);
          const lg = (x, z, s) => part(by, x, -0.05, z, s, 0, -0.14, 0, 0.04, 0.15, 0.04, T.HIDE, L);
          lg(-0.1, 0.22, walk * 1.4); lg(0.1, 0.22, -walk * 1.4); lg(-0.1, -0.22, -walk * 1.4); lg(0.1, -0.22, walk * 1.4);
          const hd = part(by, 0, 0.05, 0.3, atk ? -0.3 : 0, 0, 0, 0.12, 0.1, 0.08, 0.13, T.HIDE, L);
          part(hd, 0, -0.08, 0.04, atk ? 0.5 : 0.15, 0, 0, 0.06, 0.07, 0.025, 0.1, T.BONE, L);
          part(hd, -0.06, 0.04, 0.1, 0, 0, 0, 0, 0.02, 0.015, 0.01, T.EMBER, 50); part(hd, 0.06, 0.04, 0.1, 0, 0, 0, 0, 0.02, 0.015, 0.01, T.EMBER, 50);
          for (let s = 0; s < 3; s++) part(by, 0, 0.14, 0.15 - s * 0.15, -0.5, 0, 0.05, 0, 0.015, 0.06, 0.03, T.BONE, L);
        } else if (k === 'warden') {
          part(b, -0.09, 0.5, 0, walk, 0, -0.25, 0, 0.04, 0.25, 0.04, T.BONE, L); part(b, 0.09, 0.5, 0, -walk, 0, -0.25, 0, 0.04, 0.25, 0.04, T.BONE, L);
          const tor = part(b, 0, 0.5, 0, 0, 0, 0.22, 0, 0.18, 0.22, 0.11, T.IRON, L);
          const hd = part(tor, 0, 0.24, 0, 0, 0, 0.1, 0.02, 0.09, 0.1, 0.09, T.BONE, L);
          part(hd, 0, 0.06, 0, 0, 0, 0, 0, 0.11, 0.05, 0.11, T.IRON, L);
          part(hd, -0.1, 0.1, 0, 0, 0, 0.06, 0, 0.02, 0.08, 0.02, T.BONE, L, 0); part(hd, 0.1, 0.1, 0, 0, 0, 0.06, 0, 0.02, 0.08, 0.02, T.BONE, L);
          part(hd, -0.04, 0, 0.09, 0, 0, 0, 0, 0.02, 0.015, 0.01, T.GLOWV, 60); part(hd, 0.04, 0, 0.09, 0, 0, 0, 0, 0.02, 0.015, 0.01, T.GLOWV, 60);
          const sw = atk ? (m.tm > 0.3 ? -2.4 : -0.2) : -0.4 - walk * 0.3;
          const ar = part(tor, 0.23, 0.17, 0, sw, 0, -0.14, 0, 0.04, 0.15, 0.04, T.BONE, L);
          part(ar, 0, -0.15, 0, 1.2, 0, 0, 0.25, 0.015, 0.06, 0.26, T.SILVER, L);
          part(tor, -0.23, 0.17, 0, walk * 0.3, 0, -0.14, 0, 0.04, 0.15, 0.04, T.BONE, L);
          part(tor, -0.3, 0.05, 0.05, 0, 0, 0, 0, 0.02, 0.18, 0.14, T.RUST, L);
        } else if (k === 'wisp') {
          const by = mt(mc(b), 0, 0.3 + Math.sin(m.ph * 3) * 0.04, 0); mry(by, m.ph * 1.5);
          drawBox(by, 0.11, 0.11, 0.11, T.GLOWV, 60);
          for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(by, x * 0.15, 0, z * 0.15, 0, 0, 0, 0, 0.018, 0.2, 0.018, T.IRON, L);
          part(by, 0, 0.2, 0, 0, 0, 0, 0, 0.17, 0.02, 0.17, T.IRON, L); part(by, 0, -0.2, 0, 0, 0, 0, 0, 0.17, 0.02, 0.17, T.IRON, L);
          for (let s = 0; s < 3; s++) part(by, (s - 1) * 0.08, -0.22, 0, Math.sin(m.ph * 4 + s) * 0.4, 0, -0.12, 0, 0.012, 0.12, 0.012, T.VIOLET, L);
        } else if (k === 'brute') {
          part(b, -0.17, 0.5, 0, walk * 0.7, 0, -0.25, 0, 0.1, 0.26, 0.11, T.LEATHER, L); part(b, 0.17, 0.5, 0, -walk * 0.7, 0, -0.25, 0, 0.1, 0.26, 0.11, T.LEATHER, L);
          const tor = part(b, 0, 0.5, 0, 0.15, 0, 0.3, 0, 0.3, 0.3, 0.2, T.FLESH, L);
          part(tor, 0, 0.0, 0.0, 0, 0, 0, 0, 0.31, 0.06, 0.21, T.LEATHER, L);
          const hd = part(tor, 0, 0.33, 0.08, 0, 0, 0.07, 0, 0.09, 0.08, 0.09, T.FLESH, L);
          part(hd, 0, 0.0, 0.09, 0, 0, 0, 0, 0.07, 0.03, 0.01, T.EMBER, 45);
          const ar = part(tor, 0.36, 0.2, 0, -1.3 - atk * 0.4, 0, -0.15, 0, 0.08, 0.17, 0.08, T.FLESH, L);
          part(ar, 0, -0.18, 0.05, 1.4, 0, 0, 0.1, 0.11, 0.11, 0.18, T.RUST, L); part(ar, 0, -0.18, 0.05, 1.4, 0, 0, 0.3, 0.07, 0.07, 0.03, T.IRON, L);
          part(tor, -0.36, 0.2, 0, walk * 0.5, 0, -0.18, 0, 0.08, 0.2, 0.08, T.FLESH, L);
          part(tor, 0, 0.1, -0.22, 0, 0, 0, 0, 0.18, 0.16, 0.06, T.IRON, L); part(tor, -0.1, 0.32, -0.25, 0, 0, 0.1, 0, 0.03, 0.12, 0.03, T.IRON, L);
        } else if (k === 'golem') {
          part(b, -0.22, 0.7, 0, walk * 0.5, 0, -0.35, 0, 0.14, 0.36, 0.15, T.STONE, L); part(b, 0.22, 0.7, 0, -walk * 0.5, 0, -0.35, 0, 0.14, 0.36, 0.15, T.STONE, L);
          const tor = part(b, 0, 0.7, 0, 0.1, 0, 0.4, 0, 0.38, 0.4, 0.25, T.STONE, L);
          part(tor, 0, 0.1, 0.25, 0, 0, 0, 0, 0.12, 0.12, 0.02, atk ? T.GLOW : T.GLOWV, atk ? 63 : 50);
          for (const [x, y] of [[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]]) part(tor, x, y, 0.26, 0, 0, 0, 0, 0.03, 0.03, 0.02, T.IRON, L);
          const hd = part(tor, 0, 0.42, 0.1, 0, 0, 0.08, 0, 0.13, 0.1, 0.12, T.STONE, L);
          part(hd, -0.06, 0.02, 0.12, 0, 0, 0, 0, 0.03, 0.02, 0.01, T.GLOW, 63); part(hd, 0.06, 0.02, 0.12, 0, 0, 0, 0, 0.03, 0.02, 0.01, T.GLOW, 63);
          const raise = atk ? -2.2 * Math.min(1, (1.3 - m.tm) * 2) : walk * 0.4;
          part(tor, 0.48, 0.3, 0, raise, 0, -0.3, 0, 0.11, 0.32, 0.12, T.STONE, L); part(tor, -0.48, 0.3, 0, raise, 0, -0.3, 0, 0.11, 0.32, 0.12, T.STONE, L);
          part(tor, 0, 0.3, -0.27, 0, 0, 0, 0, 0.3, 0.1, 0.03, T.MOSS, L);
        } else if (k === 'maw') {
          const tor = part(b, 0, 1.5, 0, 0.15, 0, 0.9, 0, 1.2, 1.1, 0.8, T.EMBER, Math.max(L, 40));
          part(tor, 0, -0.2, 0.81, 0, 0, 0, 0, 0.6, 0.6, 0.02, T.STONE, L);
          const hd = part(tor, 0, 1.2, 0.3, m.atkAnim > 0 ? -0.4 : 0, 0, 0.5, 0, 0.7, 0.55, 0.6, T.STONE, L);
          part(hd, 0, -0.25, 0.6, 0, 0, 0, 0, 0.45, 0.15 + (m.atkAnim > 0 ? 0.12 : 0), 0.04, T.LAVA, 63);
          part(hd, -0.3, 0.2, 0.6, 0, 0, 0, 0, 0.1, 0.06, 0.02, T.GLOW, 63); part(hd, 0.3, 0.2, 0.6, 0, 0, 0, 0, 0.1, 0.06, 0.02, T.GLOW, 63);
          for (const s of [-1, 1]) { part(hd, s * 0.6, 0.5, 0, 0, 0, 0.35, 0, 0.08, 0.4, 0.08, T.BONE, L, 0); const ar = part(tor, s * 1.35, 0.6, 0, -0.8 - (m.atkAnim > 0 ? 1.2 : Math.sin(m.ph) * 0.3), 0, -0.7, 0, 0.3, 0.75, 0.3, T.EMBER, Math.max(L, 40));
            part(ar, 0, -0.8, 0.1, 0.5, 0, -0.2, 0, 0.35, 0.25, 0.4, T.STONE, L); }
        }
      }
      function drawItem(it, L) {
        const y = it.y + 0.25 + Math.sin(api.time * 2 + it.ph) * 0.05, b = mNew(it.x, y, it.z, api.time * 1.2 + it.ph), k = it.k;
        if (k === 'health') { drawBox(b, 0.16, 0.12, 0.16, T.MED, L); }
        else if (k === 'mega') { drawBox(mrx(mc(b), 0.7), 0.17, 0.17, 0.17, T.MED, L + 15); drawBox(b, 0.08, 0.2, 0.08, T.GLOW, 50); }
        else if (k[0] === 'a') { const tx = { armor1: T.GREEN, armor2: T.YELLOW, armor3: T.RED }[k]; drawBox(b, 0.2, 0.17, 0.07, tx, L); part(b, 0, 0.2, 0, 0, 0, 0, 0, 0.1, 0.04, 0.06, tx, L); }
        else if (k === 'shells' || k === 'sshells') drawBox(b, 0.14, 0.09, 0.1, T.SHELLS, L);
        else if (k === 'nails') drawBox(b, 0.15, 0.1, 0.15, T.NAILS, L);
        else if (k === 'rockets') { for (const s of [-1, 1]) part(b, s * 0.06, 0, 0, 0, 0, 0, 0, 0.05, 0.16, 0.05, T.ROCKS, L); }
        else if (k === 'cells') drawBox(b, 0.12, 0.12, 0.08, T.CELLS, L);
        else if (k === 'keyb' || k === 'keyi') { const tx = k === 'keyb' ? T.GOLD : T.SILVER; part(b, 0, 0.12, 0, 0, 0, 0, 0, 0.09, 0.09, 0.02, tx, L + 15); part(b, 0, -0.08, 0, 0, 0, 0, 0, 0.025, 0.14, 0.02, tx, L + 15); part(b, 0.04, -0.18, 0, 0, 0, 0, 0, 0.04, 0.025, 0.02, tx, L + 15); }
        else if (k === 'fury') { const m = mc(b); mrx(m, 0.78); mrz(m, 0.78); drawBox(m, 0.13, 0.13, 0.13, T.VIOLET, 55); drawBox(b, 0.05, 0.22, 0.05, T.GLOW, 60); }
        else if (k === 'ward') { const m = mc(b); mrx(m, 0.6); drawBox(m, 0.15, 0.15, 0.04, T.GOLD, 55); drawBox(mrz(mc(m), 0.78), 0.1, 0.1, 0.05, T.RED, 50); }
        else if (k[0] === 'w') { drawGunModel(+k.slice(1), mt(mc(b), 0, 0.05, 0), L + 8, false); }
      }
      function drawGunModel(i, m, L, cam) {
        const bx = (px, py, pz, hx, hy, hz, tx, l2) => { const q = mt(mc(m), px, py, pz); drawBox(q, hx, hy, hz, tx, l2 == null ? L : l2, cam); return q; };
        if (i === 0) { bx(0, 0.0, 0, 0.012, 0.09, 0.012, T.WOOD); bx(0, 0.08, 0.03, 0.006, 0.035, 0.04, T.SILVER); }
        else if (i === 1) { bx(0, 0, 0.08, 0.016, 0.016, 0.16, T.IRON); bx(0, -0.02, -0.07, 0.022, 0.032, 0.07, T.WOOD); bx(0, -0.022, 0.07, 0.02, 0.013, 0.04, T.WOOD); }
        else if (i === 2) { bx(-0.018, 0, 0.08, 0.015, 0.015, 0.16, T.IRON); bx(0.018, 0, 0.08, 0.015, 0.015, 0.16, T.IRON); bx(0, -0.02, -0.07, 0.035, 0.034, 0.07, T.WOOD); bx(0, 0, 0.0, 0.036, 0.02, 0.012, T.GOLD); }
        else if (i === 3 || i === 4) { const big = i === 4 ? 1.3 : 1; bx(0, 0, -0.02, 0.035 * big, 0.032 * big, 0.09, T.IRON);
          const spin = mt(mc(m), 0, 0, 0.1); mrz(spin, P && P.cur === i && P.cool > 0 ? api.time * 30 : 0);
          for (let s = 0; s < 4; s++) { const a = s * PI / 2, q = mt(mc(spin), Math.cos(a) * 0.016 * big, Math.sin(a) * 0.016 * big, 0); drawBox(q, 0.007 * big, 0.007 * big, 0.08, T.SILVER, L, cam); }
          if (i === 4) bx(0, 0.045, -0.02, 0.02, 0.016, 0.05, T.GOLD); }
        else if (i === 5) { bx(0, 0, 0, 0.045, 0.045, 0.08, T.RUST); bx(0, 0.0, 0.1, 0.035, 0.035, 0.04, T.IRON); bx(0, -0.05, -0.04, 0.014, 0.03, 0.014, T.WOOD); }
        else if (i === 6) { bx(0, 0, 0.04, 0.032, 0.032, 0.2, T.RUST); bx(0, 0, 0.17, 0.036, 0.036, 0.015, T.GOLD); bx(0, 0, -0.06, 0.036, 0.036, 0.015, T.GOLD); bx(0, 0.045, 0.0, 0.006, 0.02, 0.05, T.IRON); bx(0, -0.045, -0.03, 0.012, 0.03, 0.012, T.WOOD); }
        else if (i === 7) { bx(0, 0, -0.03, 0.03, 0.03, 0.09, T.IRON); bx(-0.02, 0, 0.09, 0.007, 0.007, 0.07, T.SILVER); bx(0.02, 0, 0.09, 0.007, 0.007, 0.07, T.SILVER);
          bx(0, 0, 0.08, 0.012 + Math.random() * 0.004, 0.012, 0.05, T.GLOW, 63); }
      }
      function drawViewModel(L) {
        if (P.dead) return;
        const bobx = Math.sin(P.bob) * 0.012, boby = Math.abs(Math.cos(P.bob)) * 0.01;
        const m = mCam(0.11 + bobx, -0.13 - boby + P.kick * 0.01, 0.2 - P.kick * 0.04);
        if (P.cur === 0) { const s = P.swing > 0 ? Math.sin((0.45 - P.swing) / 0.45 * PI) : 0; mt(m, -0.02, 0.02, 0.02); mrx(m, -0.6 + s * 1.6); mrz(m, 0.3); mt(m, 0, 0.06, 0); }
        else { mry(m, -0.06); mrx(m, 0.04); }
        drawGunModel(P.cur, m, L, true);
        if (P.kick > 0.6 && P.cur > 0 && P.cur !== 7) { const q = mt(mc(m), 0, 0, P.cur === 6 ? 0.26 : 0.25); drawBox(q, 0.03, 0.03, 0.01, T.LAVA, 63, true); }
      }

      // ---------------- render ----------------
      function renderWorld(ex, ey, ez, yaw, pitch) {
        setCam(ex, ey, ez, yaw, pitch);
        FB.fill(0xff000000, 0, W * VH); ZB.fill(0);
        const vis = [];
        for (const ch of chunks) { if (!boxVisible(ch.x0, ch.y0, ch.z0, ch.x1, ch.y1, ch.z1)) continue; ch.d = Math.hypot((ch.x0 + ch.x1) / 2 - ex, (ch.z0 + ch.z1) / 2 - ez); vis.push(ch); }
        vis.sort((a, b) => a.d - b.d);
        for (const ch of vis) for (const f of ch.faces) drawFace(f);
        for (const d of doors) {
          if (d.open >= 1 && d.kind !== K_SECRET) continue;
          const h = d.c - d.f, cy = d.f + h / 2 + d.open * h, L = litAt(d.x, d.f + 1, d.z) + 4;
          const m = [1, 0, 0, d.x, 0, 1, 0, cy, 0, 0, 1, d.z];
          if (d.kind === K_SECRET) drawBox(m, 0.5, h / 2, 0.5, T[THEMES[d.th][0]], L, false, 1);
          else drawBox(m, d.axisX ? 0.1 : 0.5, h / 2, d.axisX ? 0.5 : 0.1, d.kind === K_KEYB ? T.DOORB : d.kind === K_KEYI ? T.DOORI : T.DOOR, L);
        }
        for (const l of lifts) { const L = litAt(l.x, l.cur, l.z) + 4, h = (l.cur - l.bottom + 0.2) / 2; drawBox([1, 0, 0, l.x, 0, 1, 0, l.cur - h, 0, 0, 1, l.z], 0.5, h, 0.5, T.METAL, L); }
        if (gate && gate.on) { const m = mNew(gate.x, gate.y, gate.z, 0), L = litAt(gate.x, gate.y + 1, gate.z);
          part(m, 0, 0.9, 0, 0, 0, 0, 0, 0.3, 0.75, 0.3, T.GATE, 63); part(m, -0.4, 0.9, 0, 0, 0, 0, 0, 0.08, 0.9, 0.08, T.IRON, L); part(m, 0.4, 0.9, 0, 0, 0, 0, 0, 0.08, 0.9, 0.08, T.IRON, L);
          part(m, 0, 1.85, 0, 0, 0, 0, 0, 0.5, 0.08, 0.12, T.IRON, L); part(m, 0, 0.03, 0, 0, 0, 0, 0, 0.5, 0.03, 0.4, T.METAL, L); }
        for (const b of braziers) { const m = mNew(b.x, b.y, b.z, 0), L = litAt(b.x, b.y + 0.5, b.z); part(m, 0, 0.3, 0, 0, 0, 0, 0, 0.06, 0.3, 0.06, T.IRON, L); part(m, 0, 0.62, 0, 0, 0, 0, 0, 0.14, 0.04, 0.14, T.IRON, L); part(m, 0, 0.7, 0, 0, 0, 0, 0, 0.08, 0.05, 0.08, T.EMBER, 60); }
        for (const it of items) { if (Math.abs(it.x - ex) + Math.abs(it.z - ez) > 30) continue; drawItem(it, litAt(it.x, it.y + 0.3, it.z) + 6); }
        for (const m of mons) { if (Math.abs(m.x - ex) + Math.abs(m.z - ez) > 36) continue; if (m.st === 'dead' && m.fall > 3.2) continue;
          const rr = m.r + 0.5; if (!boxVisible(m.x - rr, m.y - 0.5, m.z - rr, m.x + rr, m.y + m.h + 0.5, m.z + rr)) continue; drawMonster(m, litAt(m.x, m.y + 0.5, m.z)); }
        for (const p of projs) {
          if (p.k === 'rocket') { const m = mNew(p.x, p.y, p.z, Math.atan2(p.vz, p.vx)); mrx(m, -Math.atan2(p.vy, Math.hypot(p.vx, p.vz))); drawBox(m, 0.03, 0.03, 0.1, T.RUST, 40); point3(p.x - p.vx * 0.008, p.y, p.z - p.vz * 0.008, COL(12, 15), 0.06); }
          else if (p.k === 'gren' || p.k === 'mgren') { const m = mNew(p.x, p.y, p.z, p.life * 8); mrx(m, p.life * 6); drawBox(m, 0.05, 0.05, 0.05, p.k === 'gren' ? T.IRON : T.RUST, litAt(p.x, p.y, p.z) + 10); }
          else if (p.k === 'nail' || p.k === 'spike') point3(p.x, p.y, p.z, COL(15, p.k === 'spike' ? 15 : 11), p.k === 'spike' ? 0.035 : 0.025);
          else if (p.k === 'bolt') { point3(p.x, p.y, p.z, COL(8, 15, 50), 0.12); point3(p.x, p.y, p.z, COL(15, 15, 40), 0.05); }
          else if (p.k === 'fire') { point3(p.x, p.y, p.z, COL(12, 14), 0.35); point3(p.x, p.y, p.z, COL(7, 15, 40), 0.15); }
        }
        for (const p of parts) point3(p.x, p.y, p.z, p.col, p.s);
        for (const b of beams) { const c = b.col || COL(13, 15); let px = b.x0, py = b.y0, pz = b.z0; const n = 6;
          for (let k = 1; k <= n; k++) { const t = k / n, j = k === n ? 0 : 0.08; const qx = b.x0 + (b.x1 - b.x0) * t + (Math.random() - .5) * j, qy = b.y0 + (b.y1 - b.y0) * t + (Math.random() - .5) * j, qz = b.z0 + (b.z1 - b.z0) * t + (Math.random() - .5) * j;
            line3(px, py, pz, qx, qy, qz, c); px = qx; py = qy; pz = qz; } }
      }
      function bigNum(n, x, y, col) {
        const s = String(Math.max(0, Math.floor(n))); const SEG = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcfgd'];
        let cx = x - s.length * 11;
        for (const ch of s) { const g = SEG[+ch], w = 9, h = 16, t = 2;
          const sh = RGB(30, 16, 8);
          const draw = (ox, oy, c) => { if (g.includes('a')) rect(cx + ox, y + oy, w, t, c); if (g.includes('g')) rect(cx + ox, y + oy + 7, w, t, c); if (g.includes('d')) rect(cx + ox, y + oy + h - t, w, t, c);
            if (g.includes('f')) rect(cx + ox, y + oy, t, 9, c); if (g.includes('b')) rect(cx + ox + w - t, y + oy, t, 9, c); if (g.includes('e')) rect(cx + ox, y + oy + 7, t, 9, c); if (g.includes('c')) rect(cx + ox + w - t, y + oy + 7, t, 9, c); };
          draw(1, 1, sh); draw(0, 0, col); cx += 11; }
      }
      function drawHUD() {
        // background: brushed metal plate
        const mt2 = TEX[T.RUST];
        for (let y = VH; y < H; y++) for (let x = 0; x < W; x++) FB[y * W + x] = CMAP[(14 << 8) | mt2[((y & 63) << 6) | (x & 63)]];
        rect(0, VH, W, 1, COL(7, 9)); rect(0, VH + 9, W, 1, COL(1, 3));
        // inventory row
        for (let i = 0; i < 8; i++) { const on = P.wpn[i], sel = P.cur === i; const x = 4 + i * 12; if (sel) rect(x - 1, VH + 1, 9, 8, COL(7, 6)); txt(String(i + 1), x + 1, VH + 1, on ? (sel ? COL(15, 15) : COL(7, 13)) : COL(11, 4)); }
        const ammoRow = [['S', P.ammo.s], ['N', P.ammo.n], ['R', P.ammo.r], ['C', P.ammo.c]];
        ammoRow.forEach(([l, v], j) => { const x = 104 + j * 38; txt(l, x, VH + 1, COL(7, 10)); txt(String(v), x + 8, VH + 1, COL(15, 13)); });
        if (P.keys.b) { rect(262, VH + 2, 6, 6, COL(7, 13)); rect(264, VH + 4, 2, 2, COL(7, 5)); }
        if (P.keys.i) { rect(272, VH + 2, 6, 6, COL(15, 13)); rect(274, VH + 4, 2, 2, COL(11, 5)); }
        txt('L' + lives, 286, VH + 1, COL(13, 13));
        // main row
        const y = VH + 12;
        // armor icon
        const ac = P.absorb >= 0.8 ? 6 : P.absorb >= 0.6 ? 7 : P.absorb > 0 ? 3 : 11;
        rect(6, y + 1, 14, 14, COL(ac, 6)); rect(8, y + 3, 10, 10, COL(ac, 11)); rect(12, y + 3, 2, 10, COL(ac, 5));
        bigNum(P.armor, 70, y, COL(7, 13));
        // status sigil: a rune-circle that cracks as health drops
        const hc = P.hp > 60 ? 3 : P.hp > 25 ? 7 : 6, pulse = P.painT > 0 ? 15 : 12;
        rect(118, y - 1, 18, 18, COL(0, 2)); rect(120, y + 1, 14, 14, COL(hc, 6)); rect(122, y + 3, 10, 10, COL(hc, pulse)); rect(126, y + 1, 2, 14, COL(0, 2)); rect(120, y + 7, 14, 2, COL(0, 2));
        if (P.fury > 0) rect(117, y - 2, 20, 2, COL(8, 14)); if (P.ward > 0) rect(117, y + 16, 20, 2, COL(7, 14));
        bigNum(P.hp, 184, y, P.hp <= 25 ? COL(6, 14) : COL(7, 13));
        // ammo
        const w = WPN[P.cur];
        if (w.ammo) { const ic = { s: 6, n: 5, r: 2, c: 13 }[w.ammo]; rect(198, y + 1, 12, 14, COL(ic, 5)); rect(200, y + 3, 8, 10, COL(ic, 11)); bigNum(P.ammo[w.ammo], 258, y, P.ammo[w.ammo] < 5 ? COL(6, 14) : COL(7, 13)); }
        txt(w.name, 262, y + 9, COL(7, 9));
        txt(String(score).padStart(7, '0'), 266, y, COL(15, 12));
      }
      function render(ctx) {
        if (!img) { img = ctx.createImageData(W, H); FB = new Uint32Array(img.data.buffer); }
        if (state === 'title') renderTitle();
        else if (state === 'inter') { renderInter(); }
        else if (state === 'win') renderWin();
        else if (state === 'over') { renderGameplay(); darken(0, H, 0.35); txtCS('GAME OVER', 70, COL(6, 14), 3); txtCS('SCORE ' + score, 110, COL(7, 13), 1); txtCS('HIGH SCORE ' + hi, 124, COL(15, 12), 1); }
        else renderGameplay();
        ctx.putImageData(img, 0, 0);
      }
      function renderGameplay() {
        const sx = shake > 0 ? (Math.random() - .5) * shake * 0.06 : 0, sy = shake > 0 ? (Math.random() - .5) * shake * 0.04 : 0;
        const eh = P.dead ? 0.2 : EYE + P.eyeOff + Math.abs(Math.cos(P.bob)) * 0.02;
        renderWorld(P.x, P.y + eh + sy, P.z, P.yaw + sx, P.pitch);
        ZB.fill(0);
        if (state === 'play') drawViewModel(litAt(P.x, P.y + 0.6, P.z) + 6);
        if (P.ward > 0) tint(255, 200, 60, 0.18); else if (P.fury > 0) tint(140, 60, 255, 0.16);
        if (flashR > 0) tint(255, 20, 10, Math.min(0.5, flashR));
        if (P.dead) tint(120, 0, 0, Math.min(0.5, deadT * 0.3));
        const ci = cellOf(P.x, P.z); if (KIND[ci] === K_LAVA && P.y < FL[ci] + 0.3) tint(255, 100, 0, 0.25);
        if (!P.dead) { const c = COL(15, 13); rect(CX - 3, CY, 2, 1, c); rect(CX + 2, CY, 2, 1, c); rect(CX, CY - 3, 1, 2, c); rect(CX, CY + 2, 1, 2, c); }
        drawHUD();
        if (msgT > 0) txtCS(msg, 8, COL(15, 14), 1);
        if (P.dead && deadT > 1) txtCS(lives > 1 ? 'YOU WERE SLAIN' : 'YOU WERE SLAIN - LAST LIFE', 70, COL(6, 15), 1);
        if (state === 'play' && levelTime < 3) { txtCS('LEVEL ' + (levelIdx + 1), 52, COL(7, 14), 2); txtCS(G.name, 74, COL(15, 14), 1); }
      }
      const titleGrad = r => COL(r < 2 ? 7 : r < 4 ? 2 : 1, [14, 13, 12, 11, 9, 8, 7][r]);
      function renderTitle() {
        const [x, y, z, yaw, pitch] = demoCam();
        renderWorld(x, y, z, yaw, pitch);
        drawHUDBlank();
        darken(0, VH, 0.55);
        const ph = Math.floor(stT / 9) % 3;
        txt('QUAKE', ((W - tw('QUAKE', 7)) >> 1) + 3, 23, RGB(0, 0, 0), 7); txtC('QUAKE', 20, 0, 7, titleGrad);
        txtCS('INTO THE SLIPGATE', 74, COL(13, 13), 1);
        if (ph === 0) {
          txtCS('THE GATES ARE OPEN. THINGS ARE COMING THROUGH.', 92, COL(15, 11), 1);
          txtCS('EIGHT REALMS. ONE MAW TO SILENCE.', 104, COL(15, 11), 1);
        } else if (ph === 1) {
          txtCS('THE BESTIARY', 90, COL(7, 13), 1);
          const list = ['scrapper', 'gnasher', 'warden', 'wisp', 'brute', 'golem'];
          list.forEach((k, j) => txtCS(MT[k].name + '  ' + MT[k].score, 102 + j * 9, COL(15, 11), 1));
        } else {
          txtCS('HIGH SCORE ' + String(hi).padStart(7, '0'), 92, COL(7, 13), 1);
          txtCS('ARROWS MOVE  SPACE FIRE  Z JUMP', 106, COL(15, 10), 1);
          txtCS('X / 1-8 WEAPONS  R F LOOK  MOUSE AIM', 116, COL(15, 10), 1);
          txtCS('ROCKET-JUMP TO HIDDEN LEDGES', 126, COL(15, 10), 1);
        }
        const blink = Math.floor(stT * 2) % 2 === 0;
        if (api.credits > 0) { if (blink) txtCS('PUSH START', 150, COL(15, 15), 1); }
        else if (blink || coinFlash > 0) txtCS('INSERT COIN', 150, coinFlash > 0 ? COL(6, 15) : COL(7, 14), 1);
        txt('CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, 190, COL(15, 11));
        txt('1996 ID SOFTWARE', W - 8 - tw('1996 ID SOFTWARE'), 190, COL(15, 9));
      }
      function drawHUDBlank() { const mt2 = TEX[T.RUST]; for (let y = VH; y < H; y++) for (let x = 0; x < W; x++) FB[y * W + x] = CMAP[(10 << 8) | mt2[((y & 63) << 6) | (x & 63)]]; rect(0, VH, W, 1, COL(7, 9)); }
      function renderInter() {
        if (P && G) renderWorld(P.x, P.y + EYE, P.z, P.yaw + stT * 0.2, 0.1);
        drawHUD(); darken(0, VH, 0.4);
        const s = interStats;
        txtCS('COMPLETED', 22, COL(7, 14), 2); txtCS(s.name, 44, COL(15, 14), 1);
        const row = (l, v, y) => { txtSh(l, 80, y, COL(15, 11), 1); txtSh(v, 200, y, COL(7, 14), 1); };
        row('KILLS', s.kills + '/' + s.total, 66); row('SECRETS', s.secrets + '/' + s.stot, 80);
        row('TIME', Math.floor(s.time / 60) + ':' + String(Math.floor(s.time % 60)).padStart(2, '0'), 94); row('BONUS', String(s.bonus), 108);
        row('SCORE', String(score), 122);
        if (stT > 2 && Math.floor(stT * 2) % 2 === 0) txtCS(s.n < LEVELS.length ? 'PRESS FIRE TO ENTER THE NEXT GATE' : 'PRESS FIRE', 146, COL(13, 13), 1);
      }
      function renderWin() {
        const t = stT * 0.25; renderWorld(16 + Math.cos(t) * 7, 2.2, 14 + Math.sin(t) * 7, t + PI, -0.1); drawHUDBlank(); darken(0, VH, 0.35);
        txtCS('THE MAW IS SILENCED', 30, COL(7, 14), 2);
        const lines = ['THE LAST SLIPGATE GUTTERS OUT.', 'THE RUST AND THE BONE FALL QUIET.', 'SOMEWHERE, SOMETHING ELSE IS LISTENING.', '', 'FINAL SCORE ' + score];
        lines.forEach((l, j) => txtCS(l, 64 + j * 12, COL(15, 12), 1));
      }

      setupDemo();
      return {
        update(dt) { try { update(dt); } catch (e) { throw e; } },
        render,
        destroy() { },
        debug: {
          get state() { return state; }, get P() { return P; }, get G() { return G; }, get mons() { return mons; }, get items() { return items; }, get doors() { return doors; }, get lifts() { return lifts; },
          get levelIdx() { return levelIdx; }, setGod(b) { god = b; }, start() { startGame(); }, load(i) { loadLevel(i); state = 'play'; },
          floorAt, ceilAt, cellOf, LEVELS, validate, probe, gate: () => gate, kills: () => kills
        }
      };
    }
  });
})();
