// U.S. Navy Fighters (Electronic Arts, 1994) -- arcade-friendly original take on the carrier jet sim.
// Own flat-shaded 3D renderer: per-pixel sky/sea with ray-cast wave pattern, painter-sorted polygons, carrier ops.
(function () {
  'use strict';
  const W = 320, H = 240, VH = 176, CX = 160, CY = 84, FOC = 230, DT = 1 / 60, NEAR = 1.2;
  const G = 9.81, DECK_Y = 20, CV_SPEED = 12, GS_DEG = 3.5;
  const WIRES = [-121, -109, -97, -85];   // arresting wires (carrier-local z)
  const TD_Z = -91;                        // glide-slope aim point (hook lands ~6 m aft, on the 3-wire)

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
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 31, 10, 0]
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
        for (let c = 0; c < 5; c++) {
          if (!(bits & (16 >> c))) continue;
          let e = c; while (e + 1 < 5 && (bits & (16 >> (e + 1)))) e++;
          ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, (e - c + 1) * sc, sc); c = e;
        }
      }
    }
  }

  // ---------- math ----------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
  function hash(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function basisYaw(yaw) { const f = [Math.sin(yaw), 0, Math.cos(yaw)]; return { f, u: [0, 1, 0], r: [Math.cos(yaw), 0, -Math.sin(yaw)] }; }
  function basisDir(f, bank) {
    f = norm(f);
    let r = cross([0, 1, 0], f); if (len(r) < 1e-3) r = [1, 0, 0]; r = norm(r);
    let u = cross(f, r);
    if (bank) { const c = Math.cos(bank), s = Math.sin(bank); const u2 = add(mul(u, c), mul(r, s)); r = add(mul(r, c), mul(u, -s)); u = u2; }
    return { f, u, r };
  }

  // ---------- models (built from 8-vertex hexahedra so normals orient outward per part) ----------
  const FACES = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  function hexa(b, t, col, decal) { return { v: b.concat(t), col, decal }; }
  function box(x0, y0, z0, x1, y1, z1, col, decal) {
    return hexa([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col, decal);
  }
  // tapered piece along z: rect at z0 (half widths w0,h0) to rect at z1 (w1,h1), centred on (cx, cy)
  function taperZ(cx, cy, z0, w0, h0, z1, w1, h1, col) {
    return hexa([[cx - w0, cy - h0, z0], [cx + w0, cy - h0, z0], [cx + w1, cy - h1, z1], [cx - w1, cy - h1, z1]],
      [[cx - w0, cy + h0, z0], [cx + w0, cy + h0, z0], [cx + w1, cy + h1, z1], [cx - w1, cy + h1, z1]], col);
  }
  // flat planform (wing): 4 corner points in x/z at height y, thickness th
  function plate(pts, y, th, col) { return hexa(pts.map(p => [p[0], y - th, p[1]]), pts.map(p => [p[0], y + th, p[1]]), col); }
  // vertical fin: profile points in z/y at x, thickness th
  function fin(x, pts, th, col) {
    return hexa([[x - th, pts[0][1], pts[0][0]], [x + th, pts[0][1], pts[0][0]], [x + th, pts[1][1], pts[1][0]], [x - th, pts[1][1], pts[1][0]]],
      [[x - th, pts[3][1], pts[3][0]], [x + th, pts[3][1], pts[3][0]], [x + th, pts[2][1], pts[2][0]], [x - th, pts[2][1], pts[2][0]]], col);
  }
  function buildModel(parts) {
    const faces = []; let rad = 0;
    for (const p of parts) {
      const c = [0, 0, 0]; for (const v of p.v) { c[0] += v[0] / 8; c[1] += v[1] / 8; c[2] += v[2] / 8; rad = Math.max(rad, len(v)); }
      for (const fi of FACES) {
        const vs = fi.map(i => p.v[i]);
        let n = [0, 0, 0];
        for (let i = 0; i < 4; i++) { const a = vs[i], b = vs[(i + 1) % 4]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
        if (len(n) < 1e-6) continue;
        n = norm(n);
        const fc = mul(add(add(vs[0], vs[1]), add(vs[2], vs[3])), 0.25);
        if (dot(n, sub(fc, c)) < 0) n = mul(n, -1);
        faces.push({ v: vs, n, col: p.col, decal: !!p.decal });
      }
    }
    return { faces, rad };
  }
  const M = {};
  (function () {
    const NAVY = [150, 158, 166], DK = [96, 102, 110], CAN = [40, 60, 80];
    const jet = (body, dark, canopy, tailc) => buildModel([
      taperZ(0, 0, -7, 1.1, 0.9, 6, 1.4, 1.1, body), taperZ(0, 0, 6, 1.4, 1.1, 11, 0.15, 0.15, body),
      taperZ(0, 1.0, 3, 0.5, 0.2, 7, 0.6, 0.5, canopy),
      plate([[-7, -3], [-1, -3], [-1, 4], [-1.2, 3.5]], 0, 0.15, dark), plate([[1, -3], [7, -3], [1.2, 3.5], [1, 4]], 0, 0.15, dark),
      plate([[-3.5, -8], [-0.8, -8], [-0.8, -4.5], [-1, -5]], 0, 0.1, dark), plate([[0.8, -8], [3.5, -8], [1, -5], [0.8, -4.5]], 0, 0.1, dark),
      fin(-1.1, [[-7.5, 0.5], [-3.5, 0.5], [-5, 4], [-7.5, 4]], 0.1, tailc), fin(1.1, [[-7.5, 0.5], [-3.5, 0.5], [-5, 4], [-7.5, 4]], 0.1, tailc)
    ]);
    M.player = jet(NAVY, DK, CAN, [130, 136, 144]);
    M.bandit = jet([120, 96, 78], [86, 70, 58], [30, 30, 40], [170, 60, 50]);
    M.bomber = buildModel([
      taperZ(0, 0, -20, 2.4, 2.4, 14, 2.6, 2.6, [110, 112, 100]), taperZ(0, 0, 14, 2.6, 2.6, 22, 0.4, 0.6, [110, 112, 100]),
      plate([[-24, -10], [-2, -2], [-2, 6], [-24, -6]], 0.5, 0.3, [90, 92, 84]), plate([[2, -2], [24, -10], [24, -6], [2, 6]], 0.5, 0.3, [90, 92, 84]),
      box(-12, -2.2, -6, -9, 0, 0, [70, 70, 66]), box(9, -2.2, -6, 12, 0, 0, [70, 70, 66]),
      fin(0, [[-20, 2], [-12, 2], [-16, 9], [-20, 9]], 0.3, [160, 60, 50]),
      plate([[-8, -21], [8, -21], [2, -15], [-2, -15]], 1, 0.2, [90, 92, 84])
    ]);
    const HULL = [92, 98, 106], DECK = [66, 68, 72];
    M.carrier = buildModel([
      hexa([[-16, -6, -150], [16, -6, -150], [16, -6, 130], [-16, -6, 130]], [[-32, 19, -160], [32, 19, -160], [32, 19, 150], [-32, 19, 150]], HULL),
      hexa([[-16, -6, 130], [16, -6, 130], [0.5, -6, 158], [-0.5, -6, 158]], [[-32, 19, 150], [32, 19, 150], [1, 19, 182], [-1, 19, 182]], HULL),
      box(-32, 19, -160, 32, 20, 150, DECK),
      hexa([[-32, 19, 150], [32, 19, 150], [1, 19, 182], [-1, 19, 182]], [[-32, 20, 150], [32, 20, 150], [1, 20, 182], [-1, 20, 182]], DECK),
      box(24, 20, -12, 33, 40, 30, [118, 124, 132]), box(25, 40, -2, 32, 47, 22, [128, 134, 142]), box(28, 47, 8, 30, 62, 10, [80, 84, 90]),
      box(-0.6, 20, -158, 0.6, 20.15, 110, [226, 226, 214], 1),
      box(-15, 20, -160, -14, 20.15, -30, [226, 226, 214], 1), box(14, 20, -160, 15, 20.15, -30, [226, 226, 214], 1),
      box(-12, 20, WIRES[0] - 0.4, 12, 20.2, WIRES[0] + 0.4, [20, 20, 20], 1), box(-12, 20, WIRES[1] - 0.4, 12, 20.2, WIRES[1] + 0.4, [20, 20, 20], 1),
      box(-12, 20, WIRES[2] - 0.4, 12, 20.2, WIRES[2] + 0.4, [20, 20, 20], 1), box(-12, 20, WIRES[3] - 0.4, 12, 20.2, WIRES[3] + 0.4, [20, 20, 20], 1),
      box(-8.4, 20, 10, -7.6, 20.15, 160, [140, 140, 136], 1), box(-4, 20, -160, 4, 20.1, -152, [230, 200, 60], 1)
    ]);
    M.boat = buildModel([
      hexa([[-2, -1, -14], [2, -1, -14], [1, -1, 12], [-1, -1, 12]], [[-4, 3, -15], [4, 3, -15], [0.5, 3, 16], [-0.5, 3, 16]], [96, 104, 96]),
      box(-2.5, 3, -8, 2.5, 7, 2, [150, 156, 150]), box(-0.4, 7, -5, 0.4, 12, -4, [60, 60, 60]), box(-1, 3, 6, 1, 4.5, 9, [70, 74, 70])
    ]);
    M.frigate = buildModel([
      hexa([[-4, -3, -55], [4, -3, -55], [3, -3, 45], [-3, -3, 45]], [[-8, 7, -58], [8, 7, -58], [0.5, 7, 62], [-0.5, 7, 62]], [104, 110, 116]),
      box(-6, 7, -30, 6, 16, 10, [160, 164, 168]), box(-4, 16, -20, 4, 22, 2, [150, 154, 160]), box(-0.6, 22, -12, 0.6, 38, -10, [60, 60, 66]),
      box(-2, 7, 22, 2, 10, 30, [90, 94, 100]), box(-0.4, 8.5, 30, 0.4, 9.5, 40, [50, 50, 54]), box(-3, 7, -50, 3, 11, -40, [120, 124, 130])
    ]);
    M.sam = buildModel([
      box(-6, 0, -6, 6, 3, 6, [104, 110, 80]),
      hexa([[-4, 3, -3], [-1, 3, -3], [-1, 6, 4], [-4, 6, 4]], [[-4, 5, -4], [-1, 5, -4], [-1, 8, 3], [-4, 8, 3]], [220, 220, 210]),
      hexa([[1, 3, -3], [4, 3, -3], [4, 6, 4], [1, 6, 4]], [[1, 5, -4], [4, 5, -4], [4, 8, 3], [1, 8, 3]], [220, 220, 210])
    ]);
    M.radar = buildModel([
      box(-8, 0, -8, 8, 8, 8, [170, 168, 150]), box(-1, 8, -1, 1, 16, 1, [80, 80, 80]),
      hexa([[-9, 14, -1], [9, 14, -1], [9, 14, 1], [-9, 14, 1]], [[-9, 26, 2], [9, 26, 2], [9, 26, 4], [-9, 26, 4]], [220, 220, 220])
    ]);
    M.fuel = buildModel([
      taperZ(0, 7, -9, 8, 7, 9, 8, 7, [200, 200, 196]), box(-8.5, 0, -1, 8.5, 14.5, 1, [190, 60, 50]),
      taperZ(20, 7, -9, 8, 7, 9, 8, 7, [200, 200, 196])
    ]);
    M.bunker = buildModel([
      hexa([[-20, 0, -16], [20, 0, -16], [20, 0, 16], [-20, 0, 16]], [[-12, 9, -9], [12, 9, -9], [12, 9, 9], [-12, 9, 9]], [140, 134, 120]),
      box(-2, 9, -2, 2, 20, 2, [80, 80, 80]), box(-6, 3, 15, 6, 6, 16.5, [30, 30, 30])
    ]);
    M.aaa = buildModel([box(-4, 0, -4, 4, 3, 4, [104, 110, 80]), hexa([[-1.5, 3, 0], [-0.5, 3, 0], [-0.5, 3, 1], [-1.5, 3, 1]], [[-1.5, 9, 5], [-0.5, 9, 5], [-0.5, 9, 6], [-1.5, 9, 6]], [40, 40, 40]),
      hexa([[0.5, 3, 0], [1.5, 3, 0], [1.5, 3, 1], [0.5, 3, 1]], [[0.5, 9, 5], [1.5, 9, 5], [1.5, 9, 6], [0.5, 9, 6]], [40, 40, 40])]);
    M.hangar = buildModel([box(-15, 0, -10, 15, 10, 10, [150, 146, 130]), hexa([[-15, 10, -10], [15, 10, -10], [15, 10, 10], [-15, 10, 10]], [[-15, 14, -1], [15, 14, -1], [15, 14, 1], [-15, 14, 1]], [110, 70, 60])]);
  })();

  // ---------- unit types ----------
  const TYPES = {
    fighter: { model: 'bandit', hp: 2, score: 1000, name: 'BANDIT', air: true, r: 14 },
    bomber: { model: 'bomber', hp: 5, score: 2000, name: 'BOMBER', air: true, r: 26 },
    boat: { model: 'boat', hp: 3, score: 800, name: 'PATROL BOAT', sea: true, r: 16 },
    frigate: { model: 'frigate', hp: 9, score: 3000, name: 'FRIGATE', sea: true, r: 45 },
    sam: { model: 'sam', hp: 3, score: 1000, name: 'SAM SITE', r: 12 },
    aaa: { model: 'aaa', hp: 2, score: 500, name: 'AAA', r: 10 },
    radar: { model: 'radar', hp: 4, score: 1500, name: 'RADAR', r: 16 },
    fuel: { model: 'fuel', hp: 3, score: 1200, name: 'FUEL DEPOT', r: 20 },
    hangar: { model: 'hangar', hp: 4, score: 800, name: 'HANGAR', r: 18 },
    bunker: { model: 'bunker', hp: 8, score: 3000, name: 'COMMAND POST', r: 22 }
  };
  const WPN = [
    { s: 'GUN', name: 'M61 GUN', max: 600 },
    { s: 'SRM', name: 'SHORT RANGE AAM', max: 4, air: true, cone: 0.3, range: 3500, lockT: 40, spd: 620, turn: 3.2, life: 9, dmg: 3 },
    { s: 'MRM', name: 'RADAR AAM', max: 4, air: true, cone: 0.5, range: 10000, lockT: 70, spd: 760, turn: 2.2, life: 20, dmg: 3 },
    { s: 'ASM', name: 'AIR-SURFACE MSL', max: 6, air: false, cone: 0.45, range: 9000, lockT: 50, spd: 420, turn: 3.5, life: 30, dmg: 4 }
  ];

  // ---------- missions (positions in metres relative to the carrier's start; +z north, +x east) ----------
  const MISSIONS = [
    {
      name: 'FIRST WATCH', type: 'CAP',
      text: ['TWO BANDITS ARE PROBING', 'THE BATTLE GROUP FROM THE', 'NORTH. INTERCEPT AND SPLASH', 'THEM, THEN RECOVER ABOARD.'],
      isl: [[9000, 14000, 1600, 90]],
      u: [{ t: 'fighter', x: 1500, z: 16000, y: 3000, n: 2, obj: 1 }]
    },
    {
      name: 'LIGHTHOUSE', type: 'STRIKE',
      text: ['AN ENEMY RADAR ON THE', 'NORTHEAST ISLAND IS', 'TRACKING OUR SHIPS. TAKE', 'OUT THE RADAR AND ITS SAM.'],
      isl: [[8000, 10000, 2200, 140], [-6000, 15000, 1200, 60]],
      u: [{ t: 'radar', isle: 0, dx: 200, dz: -300, obj: 1 }, { t: 'sam', isle: 0, dx: -500, dz: 200, obj: 1 }, { t: 'aaa', isle: 0, dx: 300, dz: 400 }]
    },
    {
      name: 'NARROW STRAIT', type: 'ANTI-SHIP',
      text: ['A FRIGATE AND TWO PATROL', 'BOATS ARE FORCING THE', 'STRAIT. SINK ALL THREE.', 'WATCH FOR ENEMY FIGHTERS.'],
      isl: [[14000, 6000, 2600, 160], [9000, 17000, 2400, 120]],
      u: [{ t: 'frigate', x: 11000, z: 12000, obj: 1, hdg: 200 }, { t: 'boat', x: 10200, z: 11000, n: 2, obj: 1, hdg: 200 },
        { t: 'fighter', x: 14000, z: 18000, y: 4000, n: 2 }]
    },
    {
      name: 'HAMMER DOWN', type: 'INTERCEPT',
      text: ['THREE BOMBERS WITH ESCORT', 'ARE INBOUND FROM THE NORTH', 'WEST. KILL EVERY BOMBER', 'BEFORE IT REACHES THE CV.'],
      isl: [[-9000, 8000, 1800, 90]],
      u: [{ t: 'bomber', x: -14000, z: 22000, y: 2500, n: 3, obj: 1, bomber: 1 }, { t: 'fighter', x: -12000, z: 21000, y: 3500, n: 2 }]
    },
    {
      name: 'COASTAL FIRE', type: 'STRIKE',
      text: ['STRIKE THE FUEL FARM AND', 'HANGARS ON THE WESTERN', 'COAST. SAM SITES AND AAA', 'DEFEND THE BEACHHEAD.'],
      isl: [[-15000, 9000, 6500, 260]],
      u: [{ t: 'fuel', isle: 0, dx: 4300, dz: -1200, obj: 1 }, { t: 'fuel', isle: 0, dx: 4100, dz: -700, obj: 1 }, { t: 'hangar', isle: 0, dx: 3800, dz: 300, obj: 1 },
        { t: 'sam', isle: 0, dx: 4700, dz: 600 }, { t: 'sam', isle: 0, dx: 4500, dz: -2000 }, { t: 'aaa', isle: 0, dx: 4500, dz: -400, n: 2 }, { t: 'fighter', x: -14000, z: 16000, y: 3500, n: 2 }]
    },
    {
      name: 'IRON TIDE', type: 'ALPHA STRIKE',
      text: ['ALL-OUT STRIKE. DESTROY THE', 'COMMAND POST ON THE ISLAND', 'AND SINK THE FRIGATE. ENEMY', 'FIGHTERS ARE UP IN FORCE.'],
      isl: [[6000, 15000, 3000, 180], [-8000, 12000, 1500, 70]],
      u: [{ t: 'bunker', isle: 0, dx: 0, dz: -600, obj: 1 }, { t: 'sam', isle: 0, dx: -900, dz: -300 }, { t: 'sam', isle: 0, dx: 800, dz: 300 }, { t: 'aaa', isle: 0, dx: 200, dz: -1200, n: 2 },
        { t: 'frigate', x: 2000, z: 11000, obj: 1, hdg: 90 }, { t: 'fighter', x: 3000, z: 18000, y: 4000, n: 4 }]
    }
  ];

  ArcadeRegistry.register({
    id: 'usnavyfighters', title: 'U.S. Navy Fighters', year: 1994, maker: 'Electronic Arts',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: roll/pitch (Down pulls up) \u00b7 A/Z or hold X+Up/Down: throttle \u00b7 Space: fire/launch \u00b7 X: weapon (flare when missile inbound) \u00b7 Enter: gear+hook \u00b7 1-4 weapon \u00b7 T target \u00b7 F flare \u00b7 B brake \u00b7 V view',
    marquee: { bg: '#0a1830', fg: '#e8e8f0', accent: '#f0c030' },
    create(api) {
      const au = api.audio;
      let img = null, buf = null;
      const invLen = new Float32Array(W * VH);
      for (let y = 0; y < VH; y++) for (let x = 0; x < W; x++) { const a = (x - CX) / FOC, b = (CY - y) / FOC; invLen[y * W + x] = 1 / Math.sqrt(1 + a * a + b * b); }

      // ---------- state ----------
      let mode = 'attract', modeT = 0, page = 0, coinFlash = 0, paused = false, view = 0;
      let score = 0, hi = api.getHiScore(60000), lives = 3, mi = 0, loop = 0, nextLife = 40000, diff = 1;
      let P = null, CV = null, units = [], islands = [], islandFaces = [], shots = [], emsl = [], parts = [], flares = [];
      let tgt = null, lockT = 0, msg = '', msgT = 0, objDone = false, missionT = 0, flash = 0, warnT = 0, xHeld = 0, xUsed = false;
      let lso = '', lsoT = 0, lastBall = 0, trapInfo = null, doneInfo = null, failWhy = '', engT = 0, kills = 0, ballSeen = false;
      const cam = { p: [0, 0, 0], f: [0, 0, 1], u: [0, 1, 0], r: [1, 0, 0] };
      const demo = { t: 0 };

      function say(s, t) { msg = s; msgT = t || 150; }
      function lsoSay(s) { if (lso !== s || lsoT < 40) { lso = s; lsoT = 90; au.tone(520, 0.05, { type: 'square', vol: 0.05 }); } }

      // ---------- islands ----------
      function makeIsland(cx, cz, R, peak, seed) {
        const N = 16, S = R * 1.25, R0 = rng(seed), p1 = R0() * 6.28, p2 = R0() * 6.28;
        const hs = new Float32Array((N + 1) * (N + 1));
        for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
          const x = -S + 2 * S * i / N, z = -S + 2 * S * j / N, d = Math.hypot(x, z), th = Math.atan2(z, x);
          const rr = R * (1 + 0.22 * Math.sin(3 * th + p1) + 0.12 * Math.sin(5 * th + p2));
          let h = d < rr ? peak * Math.pow(1 - d / rr, 0.8) * (0.75 + 0.5 * hash(i + seed, j)) : -20;
          if (d < rr && h < 6) h = 6;
          hs[j * (N + 1) + i] = h;
        }
        const isl = { cx, cz, R, S, N, hs, peak };
        const faces = [];
        const P3 = (i, j) => [cx - S + 2 * S * i / N, hs[j * (N + 1) + i], cz - S + 2 * S * j / N];
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const a = P3(i, j), b = P3(i + 1, j), c = P3(i + 1, j + 1), d = P3(i, j + 1);
          for (const tri of [[a, c, b], [a, d, c]]) {
            const mh = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
            if (Math.max(tri[0][1], tri[1][1], tri[2][1]) < 1) continue;
            let n = norm(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0]))); if (n[1] < 0) n = mul(n, -1);
            const k = hash(i * 3 + j, seed + tri.length) * 0.12 - 0.06, t = mh / peak;
            let col = mh < 12 ? [196, 182, 132] : t < 0.45 ? [70, 122, 52] : t < 0.75 ? [96, 104, 62] : [128, 118, 104];
            col = col.map(v => v * (1 + k));
            faces.push({ v: tri, n, col });
          }
        }
        islands.push(isl);
        for (const f of faces) islandFaces.push(f);
        return isl;
      }
      function terrainH(x, z) {
        for (const s of islands) {
          const lx = x - s.cx + s.S, lz = z - s.cz + s.S;
          if (lx < 0 || lz < 0 || lx >= 2 * s.S || lz >= 2 * s.S) continue;
          const gx = lx / (2 * s.S) * s.N, gz = lz / (2 * s.S) * s.N, i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j, N1 = s.N + 1;
          const h00 = s.hs[j * N1 + i], h10 = s.hs[j * N1 + i + 1], h01 = s.hs[(j + 1) * N1 + i], h11 = s.hs[(j + 1) * N1 + i + 1];
          return Math.max(0, (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz);
        }
        return 0;
      }

      // ---------- mission setup ----------
      function spawnUnit(t, x, y, z, o) {
        const d = TYPES[t];
        const u = {
          t, d, p: [x, y, z], hp: d.hp, alive: true, obj: !!o.obj, f: [0, 0, -1], spd: 0, bank: 0, cool: 4 + Math.random() * 6,
          state: 'patrol', stT: 0, deadT: 0, smokeT: 0, home: [x, y, z], bomber: !!o.bomber, ammo: 2, yaw: 0
        };
        if (d.air) { u.f = norm([-x * 0.2 + (Math.random() - 0.5) * 2000, 0, -z * 0.2]); u.spd = t === 'bomber' ? 170 : 230; }
        if (d.sea) { u.yaw = (o.hdg || 0) * Math.PI / 180; u.spd = t === 'boat' ? 9 : 6; u.f = [Math.sin(u.yaw), 0, Math.cos(u.yaw)]; }
        if (!d.air && !d.sea) u.yaw = Math.random() * 6.28;
        units.push(u); return u;
      }
      function loadMission() {
        const m = MISSIONS[mi];
        diff = 1 + loop * 0.3;
        islands = []; islandFaces = []; units = []; shots = []; emsl = []; parts = []; flares = [];
        m.isl.forEach((s, k) => makeIsland(s[0], s[1], s[2], s[3], 77 + k * 31 + mi * 7 + loop * 3));
        CV = { p: [0, 0, 0], yaw: 0 };
        for (const g of m.u) {
          const n = (g.n || 1) + (loop > 0 && !g.obj && TYPES[g.t].air ? loop : 0);
          for (let k = 0; k < n; k++) {
            if (g.isle != null) {
              const s = islands[g.isle], x = s.cx + g.dx + k * 140, z = s.cz + g.dz + k * 90;
              spawnUnit(g.t, x, terrainH(x, z), z, g);
            } else spawnUnit(g.t, g.x + k * 250, g.y || 0, g.z + k * 180, g);
          }
        }
        objDone = false; missionT = 0; kills = 0;
        P = null; resetOnDeck();
      }
      function newPlayerState() {
        P = { p: [0, 0, 0], f: [0, 0, 1], u: [0, 1, 0], r: [1, 0, 0], spd: 0, thr: 0.8, hp: 100, fuel: 100, gear: true, hook: false,
          ammo: WPN.map(w => w.max), wpn: 0, cool: 0, flares: 16, brake: false, dead: false, onDeck: true, catT: 0, trapT: 0, bolter: 0, pull: 0, lastVy: 0 };
      }
      function cvLocalToWorld(lx, ly, lz) { const b = basisYaw(CV.yaw); return add(CV.p, add(add(mul(b.r, lx), mul(b.u, ly)), mul(b.f, lz))); }
      function worldToCv(p) { const b = basisYaw(CV.yaw), d = sub(p, CV.p); return [dot(d, b.r), dot(d, b.u), dot(d, b.f)]; }
      function resetOnDeck() {
        const keep = P && !P.dead ? { ammo: P.ammo } : null;
        newPlayerState();
        P.p = cvLocalToWorld(-8, DECK_Y + 2.6, 22);
        const b = basisYaw(CV.yaw); P.f = b.f; P.u = b.u; P.r = b.r;
        P.spd = CV_SPEED; P.onDeck = true; P.thr = 1;
        mode = 'deck'; modeT = 0; tgt = null; lockT = 0; view = 0;
        if (keep) P.ammo = keep.ammo;
      }
      function startGame() {
        score = 0; lives = 3; mi = 0; loop = 0; nextLife = 40000;
        loadMission(); mode = 'brief'; modeT = 0;
        au.melody([[392, .12], [523, .12], [659, .12], [784, .12], [659, .1], [784, .3]], { type: 'square', vol: .1 });
      }
      function addScore(n) {
        score += n;
        if (score >= nextLife) { nextLife += 40000; lives++; say('EXTRA JET', 120); au.melody([[660, .08], [880, .08], [1320, .16]], { type: 'square', vol: .12 }); }
        if (score > hi) hi = score;
      }
      const objLeft = () => units.filter(u => u.obj && u.alive).length;
      const objTotal = () => units.filter(u => u.obj).length;

      // ---------- effects ----------
      function puff(p, kind, size, life, v) { parts.push({ p: p.slice(), v: v || [0, 0, 0], kind, size, life, max: life }); }
      function boom(p, big) {
        puff(p, 'fire', big ? 18 : 8, big ? 0.9 : 0.5, [0, 4, 0]);
        for (let i = 0; i < (big ? 7 : 3); i++) puff(add(p, [(Math.random() - 0.5) * 12, Math.random() * 6, (Math.random() - 0.5) * 12]), 'smoke', big ? 12 : 6, 2 + Math.random() * 1.5, [0, 6, 0]);
        for (let i = 0; i < (big ? 10 : 4); i++) puff(p, 'spark', 1.5, 0.8 + Math.random() * 0.6, [(Math.random() - 0.5) * 80, Math.random() * 60, (Math.random() - 0.5) * 80]);
        const d = P ? len(sub(p, P.p)) : 9999;
        au.noise(big ? 1 : 0.4, { freq: big ? 900 : 1500, slideTo: 60, vol: (big ? 0.24 : 0.14) * clamp(1.4 - d / 4000, 0.25, 1) });
      }
      function damageUnit(u, n) {
        if (!u.alive) return;
        u.hp -= n;
        if (u.hp <= 0) {
          u.alive = false; u.deadT = 0; kills++;
          addScore(u.d.score); boom(u.p, true);
          if (u === tgt) { tgt = null; lockT = 0; }
          const left = objLeft();
          if (u.obj) say(u.d.name + ' DESTROYED' + (left ? '  ' + left + ' TO GO' : ''), 150);
          else say(u.d.air ? 'SPLASH ONE' : u.d.name + ' DESTROYED', 100);
        } else puff(u.p, 'spark', 3, 0.3, [0, 10, 0]);
      }

      // ---------- targeting ----------
      function angTo(p) { const d = sub(p, P.p), l = len(d) || 1; return { d: l, ang: Math.acos(clamp(dot(d, P.f) / l, -1, 1)) }; }
      function wantAir() { return P.wpn !== 3; }
      function targetOk(u, cone, range) { if (!u || !u.alive) return false; if (!!u.d.air !== wantAir()) return false; const a = angTo(u.p); return a.ang < cone && a.d < range; }
      function updateTargeting() {
        const w = WPN[P.wpn];
        if (tgt && !targetOk(tgt, 1.2, 22000)) { tgt = null; lockT = 0; }
        if (!tgt || api.frame % 30 === 0) {
          let best = null, bs = 1e9;
          for (const u of units) { if (!u.alive || !!u.d.air !== wantAir()) continue; const a = angTo(u.p); if (a.d > 22000 || a.ang > 0.9) continue; const s = a.ang * 4000 + a.d * 0.2 - (u.obj ? 300 : 0); if (s < bs) { bs = s; best = u; } }
          if (!tgt && best) { tgt = best; lockT = 0; }
        }
        if (tgt && w.cone) { const a = angTo(tgt.p); if (a.ang < w.cone && a.d < w.range) lockT++; else lockT = Math.max(0, lockT - 3); }
        else lockT = 0;
      }
      function cycleTarget() {
        const c = units.filter(u => u.alive && !!u.d.air === wantAir() && angTo(u.p).d < 22000).sort((a, b) => angTo(a.p).ang - angTo(b.p).ang);
        if (!c.length) return;
        tgt = c[(c.indexOf(tgt) + 1) % c.length]; lockT = 0; au.tone(900, 0.04, { type: 'square', vol: 0.07 });
      }
      const locked = () => { const w = WPN[P.wpn]; return !!(w.cone && tgt && tgt.alive && lockT >= w.lockT); };

      // ---------- weapons ----------
      function fire() {
        if (P.cool > 0) return;
        const w = WPN[P.wpn];
        if (P.ammo[P.wpn] <= 0) { P.cool = 20; say(w.s + ' EMPTY', 50); au.tone(140, 0.06, { type: 'square', vol: 0.08 }); return; }
        if (P.wpn === 0) {
          const dir = norm(add(P.f, add(mul(P.r, (Math.random() - 0.5) * 0.006), mul(P.u, (Math.random() - 0.5) * 0.006 + 0.004))));
          const v = add(mul(dir, 1050), mul(P.f, P.spd));
          shots.push({ k: 'gun', p: add(P.p, mul(P.u, -1)), v, life: 1.4, dmg: 0.35 });
          P.ammo[0]--; P.cool = 3;
          if (api.frame % 6 === 0) au.noise(0.08, { freq: 1800, vol: 0.09, type: 'bandpass' });
          return;
        }
        if (!locked()) { P.cool = 15; say('NO LOCK', 40); au.tone(220, 0.08, { type: 'square', vol: 0.07 }); return; }
        shots.push({ k: 'msl', p: add(P.p, mul(P.u, -2)), v: add(mul(P.f, P.spd + 40), mul(P.u, -15)), w, tgt, life: w.life, dmg: w.dmg, decoy: null, arm: 0.3 });
        P.ammo[P.wpn]--; P.cool = 40;
        if (tgt.d.air && Math.random() < 0.25 / diff + 0.1) tgt.flareReact = 1.5 + Math.random();
        au.noise(0.8, { freq: 1600, slideTo: 200, vol: 0.14 }); au.tone(320, 0.6, { type: 'sawtooth', slideTo: 90, vol: 0.06 });
      }
      function dropFlares() {
        if (P.flares <= 0) { say('NO FLARES', 50); return; }
        P.flares--;
        for (let i = 0; i < 2; i++) flares.push({ p: P.p.slice(), v: add(mul(P.f, P.spd * 0.6), [(Math.random() - 0.5) * 30, -15, (Math.random() - 0.5) * 30]), life: 3 });
        for (const m of emsl) if (!m.decoy && Math.random() < 0.72 / Math.sqrt(diff)) m.decoy = flares[flares.length - 1];
        au.noise(0.25, { freq: 3000, vol: 0.1, type: 'highpass' });
      }
      function segHit(p, v, c, r) {
        const d = sub(c, p), l2 = dot(v, v) || 1, t = clamp(dot(d, v) / l2, 0, 1);
        const e = sub(d, mul(v, t)); return dot(e, e) < r * r;
      }
      function updShots() {
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.life -= DT;
          if (s.k === 'msl') {
            s.arm -= DT;
            let aim = null;
            if (s.decoy && s.decoy.life > 0) aim = s.decoy.p;
            else if (s.tgt && s.tgt.alive) {
              if (s.tgt.flaring && !s.decoy && Math.random() < (s.w === WPN[1] ? 0.012 : 0.006)) { s.decoy = { p: add(s.tgt.p, [0, -20, 0]), life: 2 }; flares.push(s.decoy); }
              const tt = len(sub(s.tgt.p, s.p)) / s.w.spd;
              aim = add(s.tgt.p, mul(s.tgt.f, s.tgt.spd * tt * 0.8));
            }
            if (aim && s.arm < 0) {
              const want = mul(norm(sub(aim, s.p)), s.w.spd), k = Math.min(1, s.w.turn * DT);
              s.v = add(s.v, mul(sub(want, s.v), k));
            }
            const sp = len(s.v), ns = Math.min(s.w.spd, sp + 300 * DT); s.v = mul(s.v, ns / (sp || 1));
            if (api.frame & 1) puff(s.p, 'trail', 3, 1.2, [0, 1, 0]);
          }
          const step = mul(s.v, DT);
          let hit = null;
          if (s.k !== 'egun') for (const u of units) {
            if (!u.alive) continue;
            const r = s.k === 'gun' ? u.d.r * 1.2 : u.d.r + 12;
            if (Math.abs(u.p[0] - s.p[0]) > 400 || Math.abs(u.p[2] - s.p[2]) > 400) continue;
            if (segHit(s.p, step, add(u.p, [0, u.d.air ? 0 : 4, 0]), r)) { hit = u; break; }
          }
          s.p = add(s.p, step);
          if (hit) {
            damageUnit(hit, s.dmg);
            if (s.k === 'msl') boom(s.p, false);
            shots.splice(i, 1); continue;
          }
          const gh = terrainH(s.p[0], s.p[2]);
          if (s.p[1] < gh + 0.5) {
            if (s.k === 'msl') { for (const u of units) if (u.alive && s.dmg && !u.d.air && Math.hypot(u.p[0] - s.p[0], u.p[2] - s.p[2]) < u.d.r + 25) { damageUnit(u, s.dmg); break; } boom(s.p, false); } else if (Math.random() < 0.3) puff([s.p[0], gh + 1, s.p[2]], 'splash', 4, 0.6, [0, 10, 0]); shots.splice(i, 1); continue; }
          if (s.life <= 0) { if (s.k === 'msl') puff(s.p, 'smoke', 6, 1, [0, 2, 0]); shots.splice(i, 1); }
        }
      }

      // ---------- enemy AI ----------
      function hurtPlayer(n, why) {
        if (P.dead) return;
        P.hp -= n; flash = 12;
        au.noise(0.3, { freq: 2000, slideTo: 300, vol: 0.2 });
        if (P.hp <= 0) { P.hp = 0; killPlayer(why); }
        else if (P.hp < 35) say('DAMAGE CRITICAL', 90);
      }
      function launchEnemyMissile(from, sp, turn) {
        emsl.push({ p: from.slice(), v: [0, 0, 0], sp, turn, life: 16, decoy: null, launched: from });
        au.tone(1250, 0.12, { type: 'square', vol: 0.11 }); au.tone(1250, 0.12, { type: 'square', vol: 0.11, delay: 0.18 });
        say('MISSILE LAUNCH!', 80);
      }
      function steer(u, want, rate) {
        const k = Math.min(1, rate * DT);
        const nf = norm(add(u.f, mul(sub(norm(want), u.f), k)));
        const lat = dot(sub(nf, u.f), cross([0, 1, 0], u.f));
        u.bank += (clamp(-lat * 160, -1.2, 1.2) - u.bank) * 0.08;
        u.f = nf;
      }
      function updUnits() {
        const cvp = CV.p;
        for (const u of units) {
          if (!u.alive) {
            u.deadT += DT;
            if (u.d.air && u.p[1] > terrainH(u.p[0], u.p[2])) {
              u.p = add(u.p, mul(u.f, u.spd * DT)); u.p[1] -= (30 + u.deadT * 40) * DT; u.spd *= 0.99;
              if ((api.frame & 3) === 0) puff(u.p, 'smoke', 8, 2, [0, 3, 0]);
              if (u.p[1] <= terrainH(u.p[0], u.p[2]) + 1) { puff(u.p, 'splash', 20, 1.2, [0, 25, 0]); u.p[1] = -100; }
            } else if (!u.d.air && u.deadT < 25 && (u.smokeT -= DT) <= 0) { u.smokeT = 0.3; puff(add(u.p, [0, 8, 0]), 'smoke', 10, 3, [3, 8, 0]); }
            continue;
          }
          const toP = sub(P.p, u.p), dP = len(toP);
          if (u.d.air) {
            u.cool -= DT;
            if (u.flareReact > 0) { u.flareReact -= DT; u.flaring = true; if ((api.frame % 20) === 0) flares.push({ p: u.p.slice(), v: [0, -10, 0], life: 2 }); } else u.flaring = false;
            let want;
            if (u.bomber) {
              want = sub(add(cvp, [0, 2500 - cvp[1], 0]), u.p);
              const dc = Math.hypot(u.p[0] - cvp[0], u.p[2] - cvp[2]);
              if (dc < 4000 && !objDone && (mode === 'fly' || mode === 'deck' || mode === 'cat')) { failWhy = 'BOMBERS REACHED THE CARRIER'; mode = 'failed'; modeT = 0; au.melody([[330, .2], [262, .2], [196, .4]], { type: 'square', vol: .12 }); }
            } else {
              u.stT -= DT;
              const behind = dot(norm(sub(u.p, P.p)), P.f) > 0.85 && dP < 3000; // player is lined up on us
              if (u.state !== 'break' && (behind && Math.random() < 0.01 * diff || u.flaring)) { u.state = 'break'; u.stT = 2.5 + Math.random() * 2; u.breakDir = Math.random() < 0.5 ? -1 : 1; }
              if (u.state === 'break') {
                want = add(u.f, mul(cross([0, 1, 0], u.f), u.breakDir * 1.5)); want[1] += u.p[1] < 800 ? 0.6 : -0.1;
                if (u.stT <= 0) u.state = 'attack';
              } else if (P.dead || mode !== 'fly' || dP > 30000) {
                want = sub(u.home, u.p); if (len(want) < 2000) want = cross([0, 1, 0], u.f);
              } else {
                u.state = 'attack';
                const tt = dP / 900;
                want = sub(add(P.p, mul(P.f, P.spd * tt)), u.p);
                const ang = Math.acos(clamp(dot(norm(toP), u.f), -1, 1));
                if (ang < 0.3 && dP < 4500 && dP > 900 && u.cool <= 0 && u.ammo > 0 && mode === 'fly') {
                  launchEnemyMissile(add(u.p, mul(u.f, 10)), 560 + loop * 30, 1.4 + loop * 0.15); u.ammo--; u.cool = (12 + Math.random() * 8) / diff;
                }
                if (ang < 0.08 && dP < 900 && (api.frame % 12) === 0 && mode === 'fly') {
                  shots.push({ k: 'egun', p: u.p.slice(), v: mul(norm(toP), 900), life: 1.2 });
                  if (Math.random() < 0.3 * diff) hurtPlayer(4, 'SHOT DOWN');
                }
              }
              if (u.p[1] < 400) want = add(norm(want), [0, 1, 0]);
            }
            steer(u, want, (u.bomber ? 0.25 : 0.55 + loop * 0.06) * (u.state === 'break' ? 1.3 : 1));
            u.p = add(u.p, mul(u.f, u.spd * DT));
            if (u.p[1] < terrainH(u.p[0], u.p[2]) + 30) u.p[1] = terrainH(u.p[0], u.p[2]) + 30;
          } else {
            if (u.d.sea) { u.p = add(u.p, mul(u.f, u.spd * DT)); if (terrainH(u.p[0] + u.f[0] * 200, u.p[2] + u.f[2] * 200) > 0) { u.yaw += 0.5 * DT; u.f = [Math.sin(u.yaw), 0, Math.cos(u.yaw)]; } }
            u.cool -= DT;
            if (P.dead || mode !== 'fly') continue;
            if ((u.t === 'sam' || u.t === 'frigate') && dP < 9000 && P.p[1] < 7000 && u.cool <= 0) {
              launchEnemyMissile(add(u.p, [0, 15, 0]), 520 + loop * 30, 1.2 + loop * 0.12); u.cool = (u.t === 'sam' ? 9 : 12) / diff + Math.random() * 4;
            }
            if ((u.t === 'aaa' || u.t === 'boat' || u.t === 'frigate') && dP < 2200 && (api.frame % 10) === 0) {
              const dir = norm(add(norm(toP), [(Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05]));
              shots.push({ k: 'egun', p: add(u.p, [0, 6, 0]), v: mul(dir, 800), life: 2.6 });
              if (Math.random() < 0.06 * diff * (1 - dP / 2600)) { hurtPlayer(5, 'SHOT DOWN BY FLAK'); puff(add(P.p, mul(P.f, 30)), 'flak', 6, 0.6); }
              else if (Math.random() < 0.3) puff(add(P.p, add(mul(P.f, 60 + Math.random() * 100), [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, 0])), 'flak', 6, 0.8);
            }
          }
        }
        // enemy gun tracers are visual only (separate list entries flagged egun)
      }
      function updEnemyMissiles() {
        let warn = false;
        for (let i = emsl.length - 1; i >= 0; i--) {
          const m = emsl[i];
          m.life -= DT;
          let aim;
          if (m.decoy) aim = m.decoy.life > 0 ? m.decoy.p : null;
          else aim = P.dead ? null : add(P.p, mul(P.f, P.spd * len(sub(P.p, m.p)) / m.sp * 0.6));
          if (aim) {
            const want = mul(norm(sub(aim, m.p)), m.sp), k = Math.min(1, m.turn * DT * (m.life > 15.4 ? 3 : 1));
            m.v = add(m.v, mul(sub(want, m.v), k));
          }
          const sp = len(m.v), ns = Math.min(m.sp, sp + 400 * DT); m.v = mul(m.v, ns / (sp || 1));
          const step = mul(m.v, DT);
          if (!m.decoy && !P.dead) {
            const dd = len(sub(P.p, m.p)); if (dd < 6000) warn = true;
            if (segHit(m.p, step, P.p, 18)) { hurtPlayer(45, 'MISSILE HIT'); boom(add(P.p, mul(P.f, 20)), false); emsl.splice(i, 1); continue; }
          }
          m.p = add(m.p, step);
          if (api.frame & 1) puff(m.p, 'trail', 3, 1.2, [0, 1, 0]);
          if (m.life <= 0 || m.p[1] < terrainH(m.p[0], m.p[2])) { puff(m.p, 'smoke', 6, 1, [0, 2, 0]); emsl.splice(i, 1); }
        }
        return warn;
      }
      function updParts() {
        for (let i = parts.length - 1; i >= 0; i--) {
          const q = parts[i]; q.life -= DT;
          if (q.life <= 0) { parts.splice(i, 1); continue; }
          q.p = add(q.p, mul(q.v, DT));
          if (q.kind === 'spark') q.v[1] -= G * 3 * DT;
          if (q.kind === 'smoke' || q.kind === 'trail') q.size += DT * (q.kind === 'smoke' ? 4 : 2);
          if (q.kind === 'fire') q.size += DT * 20;
          if (q.kind === 'splash') q.v[1] -= 20 * DT;
        }
        if (parts.length > 500) parts.splice(0, parts.length - 500);
        for (let i = flares.length - 1; i >= 0; i--) { const f = flares[i]; f.life -= DT; if (f.v) { f.p = add(f.p, mul(f.v, DT)); f.v[1] -= 6 * DT; } if (f.life <= 0) flares.splice(i, 1); }
      }

      // ---------- player flight ----------
      function killPlayer(why) {
        if (P.dead) return;
        P.dead = true; P.why = why; mode = 'dying'; modeT = 0;
        say(why, 240); boom(P.p, true);
        au.noise(1.5, { freq: 1000, slideTo: 60, vol: 0.25 });
      }
      function rotPitch(a) { const c = Math.cos(a), s = Math.sin(a); const f = add(mul(P.f, c), mul(P.u, s)); P.u = add(mul(P.u, c), mul(P.f, -s)); P.f = f; }
      function rotRoll(a) { const c = Math.cos(a), s = Math.sin(a); const u = add(mul(P.u, c), mul(P.r, s)); P.r = add(mul(P.r, c), mul(P.u, -s)); P.u = u; }
      function rotYaw(a) { P.f = rotY(P.f, a); P.u = rotY(P.u, a); P.r = rotY(P.r, a); }
      function ortho() { P.f = norm(P.f); P.r = norm(cross(P.u, P.f)); P.u = cross(P.f, P.r); }
      function controls() {
        const xm = api.key('KeyX');
        if (xm) xHeld++; else {
          if (xHeld > 0 && xHeld < 18 && !xUsed) {
            if (emsl.some(m => !m.decoy)) dropFlares();
            else { P.wpn = (P.wpn + 1) % 4; lockT = 0; tgt = null; au.tone(700, 0.04, { type: 'square', vol: 0.07 }); }
          }
          xHeld = 0; xUsed = false;
        }
        const up = api.key('ArrowUp'), dn = api.key('ArrowDown');
        let thrIn = (api.key('KeyA') ? 1 : 0) - (api.key('KeyZ') ? 1 : 0);
        if (xm && (up || dn)) { xUsed = true; thrIn = up ? 1 : -1; }
        P.thr = clamp(P.thr + thrIn * 0.6 * DT, 0, 1);
        let pitchIn = 0;
        if (!xm) pitchIn = (dn ? 1 : 0) - (up ? 1 : 0);
        const rollIn = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        for (let i = 0; i < 4; i++) if (api.pressed('Digit' + (i + 1))) { P.wpn = i; lockT = 0; tgt = null; au.tone(700, 0.04, { type: 'square', vol: 0.07 }); }
        if (api.anyPressed('KeyT', 'Tab')) cycleTarget();
        if (api.pressed('KeyF')) dropFlares();
        if (api.pressed('KeyV')) view = view ? 0 : 1;
        if (api.pressed('KeyB')) P.brake = !P.brake;
        if (api.anyPressed('Enter', 'KeyG', 'KeyH')) {
          P.gear = !P.gear; P.hook = P.gear;
          say(P.gear ? 'GEAR AND HOOK DOWN' : 'GEAR AND HOOK UP', 70); au.tone(P.gear ? 300 : 420, 0.2, { type: 'triangle', vol: 0.1 });
        }
        return { pitchIn, rollIn };
      }
      function flight(ci) {
        const ctl = Math.min(1, P.spd / 110);
        P.pull += (ci.pitchIn - P.pull) * 0.15;
        rotRoll(ci.rollIn * 2.3 * DT * Math.max(0.3, ctl));
        rotPitch(P.pull * (P.pull > 0 ? 0.85 : 0.6) * DT * Math.max(0.2, ctl));
        rotYaw(-P.r[1] * 0.55 * DT * Math.max(0.3, ctl));
        // gravity sag when slow or not pulling: keeps the nose honest
        const bankSag = (1 - Math.abs(P.u[1])) * 0.06 * DT;
        if (P.u[1] > 0) { const a = Math.min(bankSag, 0.02); rotPitch(-a * Math.sign(P.f[1] + 1)); }
        ortho();
        // approach power compensator: gear down holds approach speed
        let thr = P.thr;
        if (P.gear && P.hook && !P.onDeck && P.fuel > 0) { const tgtS = 72; thr = clamp(0.45 + (tgtS - P.spd) * 0.05 + P.f[1] * 2.5, 0, 1); P.thr = thr; }
        if (P.fuel <= 0) thr = 0;
        const ab = thr > 0.95;
        const thrust = thr * 22 + (ab ? 14 : 0);
        const drag = P.spd * P.spd * (0.00022 + (P.gear ? 0.00045 : 0) + (P.brake ? 0.0006 : 0));
        P.spd += (thrust - drag - G * P.f[1]) * DT;
        P.spd = Math.max(0, P.spd);
        let sink = 0;
        if (P.spd < 62) { sink = (62 - P.spd) * 0.6; if (P.f[1] > -0.3) rotPitch(-0.25 * DT); ortho(); }
        const v = mul(P.f, P.spd); v[1] -= sink;
        P.lastVy = v[1];
        P.p = add(P.p, mul(v, DT));
        P.fuel = Math.max(0, P.fuel - DT * (0.08 + thr * 0.18 + (ab ? 0.4 : 0)) / (1 + loop * 0));
        if (P.fuel <= 0 && api.frame % 300 === 0) say('FLAMEOUT - FUEL EXHAUSTED', 150);
        else if (P.fuel < 15 && api.frame % 400 === 0) say('BINGO FUEL - RETURN TO MOTHER', 150);
        if ((++engT) >= 6) { engT = 0; au.noise(0.12, { freq: 200 + thr * 500 + (ab ? 400 : 0), vol: 0.035 + thr * 0.03 }); }
      }
      function carrierContact() {
        // returns true if the plane is resting on / interacting with the deck this frame
        const l = worldToCv(P.p);
        const lx = l[0], h = l[1] - DECK_Y, lz = l[2];
        const overDeck = Math.abs(lx) < 32 && lz > -160 && lz < 175;
        if (overDeck && lx > 22 && lz > -14 && lz < 32 && h < 44) { killPlayer('HIT THE ISLAND'); return; }
        if (P.bolter > 0) {
          P.bolter -= DT;
          if (overDeck && h < 2.6) { P.p = cvLocalToWorld(lx, DECK_Y + 2.6, lz); if (P.f[1] < 0.02) { rotPitch(0.04); ortho(); } if (P.spd < 75) P.spd += 30 * DT; }
          return;
        }
        if (overDeck && h < 3.0) {
          const vy = P.lastVy;
          if (!P.gear) { killPlayer('GEAR UP LANDING'); return; }
          if (vy < -11) { killPlayer('HARD LANDING - GEAR COLLAPSE'); return; }
          const hookZ = lz - 6;
          if (P.hook && hookZ < WIRES[3] + 7) {
            let wire = 0, best = 1e9;
            for (let i = 0; i < 4; i++) { const d = Math.abs(hookZ - WIRES[i]); if (d < best) { best = d; wire = i; } }
            if (hookZ < WIRES[0]) wire = 0;
            trap(wire + 1, lx);
          } else {
            P.bolter = 2.5; say('BOLTER! BOLTER!', 120); lsoSay('BOLTER - POWER UP');
            au.tone(300, 0.3, { type: 'square', vol: 0.12 });
            P.p = cvLocalToWorld(lx, DECK_Y + 2.6, lz);
          }
          return;
        }
        if (Math.abs(lx) < 34 && lz > -175 && lz < 182 && h < 0) killPlayer(lz < -150 ? 'RAMP STRIKE' : 'CRASHED INTO THE CARRIER');
      }
      function trap(wire, lx) {
        const grades = ['NO GRADE', 'FAIR', 'OK', 'FAIR'];
        let g = grades[wire - 1], pts = [600, 1200, 2500, 1200][wire - 1];
        if (Math.abs(lx) > 10) { g = 'FAIR (LINEUP)'; pts = Math.round(pts * 0.6); }
        trapInfo = { wire, grade: g, pts };
        addScore(pts);
        P.trapT = 0; mode = 'trapped'; modeT = 0; P.onDeck = true;
        say(wire + '-WIRE  ' + g, 200);
        au.noise(0.8, { freq: 500, slideTo: 80, vol: 0.2 }); au.melody([[523, .1], [659, .1], [784, .25]], { type: 'square', vol: .1, delay: 0.5 });
      }
      function glideInfo() {
        const l = worldToCv(P.p), h = l[1] - DECK_Y - 2.6, dz = TD_Z - l[2];
        const ang = Math.atan2(h, Math.max(1, dz)) * 180 / Math.PI;
        return { lx: l[0], lz: l[2], h, dist: dz, dev: ang - GS_DEG, behind: dz > 0 && dz < 7000 && Math.abs(l[0]) < dz * 0.35 + 60 };
      }
      function updLSO() {
        const g = glideInfo();
        const dirOk = dot(P.f, basisYaw(CV.yaw).f) > 0.85;
        if (!(g.behind && P.gear && dirOk && g.dist < 3500)) { ballSeen = false; return; }
        if (!ballSeen) { ballSeen = true; lsoSay('ROGER BALL'); }
        if (api.frame % 50 !== 0) return;
        if (g.dev > 0.9) lsoSay("YOU'RE HIGH");
        else if (g.dev < -1.2) lsoSay('POWER! YOU\'RE LOW');
        else if (g.dev < -0.6) lsoSay('A LITTLE POWER');
        else if (g.lx > 12) lsoSay('COME LEFT FOR LINEUP');
        else if (g.lx < -12) lsoSay('RIGHT FOR LINEUP');
      }

      // ---------- mode flow ----------
      function tryStart() { if (api.useCredit()) { startGame(); return; } coinFlash = 90; au.tone(70, 0.25, { type: 'square', vol: 0.2 }); }
      function missionComplete() {
        const b = 5000 + Math.round(P.hp) * 20 + Math.round(P.fuel) * 10;
        doneInfo = { name: MISSIONS[mi].name, trap: trapInfo, bonus: b, kills };
        addScore(b); mode = 'done'; modeT = 0;
        au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .35]], { type: 'square', vol: .12 });
      }
      function loseLife(reload) {
        lives--;
        const go = () => { if (reload) { loadMission(); mode = 'brief'; } else { emsl = []; resetOnDeck(); say('NEW JET ON CATAPULT ONE', 120); } modeT = 0; };
        if (lives > 0) { go(); return; }
        const end = () => { mode = 'over'; modeT = 0; api.setHiScore(score); au.melody([[392, .25], [330, .25], [262, .5]], { type: 'square', vol: .12 }); };
        if (api.offerContinue) { mode = 'cont'; api.offerContinue(() => { lives = 3; go(); }, end); } else end();
      }
      function moveCarrier() {
        const b = basisYaw(CV.yaw); CV.p = add(CV.p, mul(b.f, CV_SPEED * DT));
      }
      function update() {
        modeT += DT;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        if (lsoT > 0) lsoT--;
        if (flash > 0) flash--;
        if (mode === 'attract') {
          demo.t += DT;
          if (modeT > 8) { modeT = 0; page = (page + 1) % 3; }
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (mode === 'brief') { if (modeT > 0.6 && api.anyPressed('Enter', 'Space')) { mode = 'deck'; modeT = 0; } return; }
        if (mode === 'over') { if (modeT > 5 || (modeT > 1.5 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; modeT = 0; page = 2; } return; }
        if (mode === 'cont') return;
        if (mode === 'done') {
          if (modeT > 7 || (modeT > 1.5 && api.anyPressed('Enter', 'Space'))) { mi++; if (mi >= MISSIONS.length) { mi = 0; loop++; } loadMission(); mode = 'brief'; modeT = 0; }
          return;
        }
        if (mode === 'failed') { if (modeT > 4) loseLife(true); return; }
        if (api.pressed('KeyP')) paused = !paused;
        if (paused) return;
        moveCarrier();
        missionT += DT;
        if (mode === 'deck') {
          // sitting on the catapult moving with the ship
          P.p = cvLocalToWorld(-8, DECK_Y + 2.6, 22 + Math.sin(modeT * 30) * 0.02);
          if (api.pressed('KeyV')) view = view ? 0 : 1;
          if (modeT > 0.5 && api.key('Space')) { mode = 'cat'; modeT = 0; au.noise(2.4, { freq: 600, slideTo: 2500, vol: 0.18 }); say('', 1); }
        } else if (mode === 'cat') {
          if (api.pressed('KeyV')) view = view ? 0 : 1;
          const t = Math.min(1, modeT / 2.2), lz = 22 + 138 * t * t;
          P.spd = CV_SPEED + 76 * t;
          P.p = cvLocalToWorld(-8, DECK_Y + 2.6, lz);
          if (t >= 1) {
            mode = 'fly'; modeT = 0; P.onDeck = false; P.gear = true; P.hook = false; P.thr = 1;
            rotPitch(0.08); ortho();
            say('GOOD SHOT - GEAR UP WITH ENTER', 150);
          }
        } else if (mode === 'fly') {
          const ci = controls();
          flight(ci);
          if (P.cool > 0) P.cool--;
          if (api.key('Space')) fire();
          updateTargeting();
          if (locked() && lockT === WPN[P.wpn].lockT) au.tone(1500, 0.1, { type: 'sine', vol: 0.1 });
          carrierContact();
          if (mode === 'fly') {
            const gh = terrainH(P.p[0], P.p[2]);
            if (P.p[1] < gh + 2) killPlayer(gh > 0 ? 'FLEW INTO TERRAIN' : 'SPLASHED INTO THE SEA');
            if (P.p[1] > 15000) { P.p[1] = 15000; }
          }
          updLSO();
          if (!objDone && objLeft() === 0) { objDone = true; say('MISSION OBJECTIVES COMPLETE - RECOVER ABOARD', 240); au.melody([[784, .1], [988, .1], [1175, .2]], { type: 'square', vol: .12 }); }
        } else if (mode === 'trapped') {
          P.trapT += DT;
          const l = worldToCv(P.p);
          const rel = Math.max(0, (P.spd - CV_SPEED) * (1 - DT * 2.2));
          P.spd = CV_SPEED + rel;
          P.p = cvLocalToWorld(l[0], DECK_Y + 2.6, l[2] + rel * DT);
          const b = basisYaw(CV.yaw); P.f = b.f; P.u = b.u; P.r = b.r;
          if (modeT > 3.5) {
            if (objDone) { missionComplete(); return; }
            P.fuel = 100; P.hp = Math.min(100, P.hp + 50); P.ammo = WPN.map(w => w.max); P.flares = 16;
            say('REARMED AND REFUELED - BACK TO THE CAT', 150);
            const keepAmmo = P.ammo, keepHp = P.hp; resetOnDeck(); P.ammo = keepAmmo; P.hp = keepHp;
          }
        } else if (mode === 'dying') {
          if (modeT > 3.5) { loseLife(false); return; }
        }
        if (mode === 'fly' || mode === 'dying' || mode === 'deck' || mode === 'cat' || mode === 'trapped') {
          updUnits(); updShots();
          const warn = updEnemyMissiles(); updParts();
          if (warn && mode === 'fly') { if (++warnT % 14 === 0) au.tone(warnT % 28 ? 900 : 700, 0.09, { type: 'square', vol: 0.1 }); } else warnT = 0;
        }
      }

      // ---------- rendering ----------
      const SKY_Z = [58, 104, 186], SKY_H = [196, 212, 230], SEA_D = [22, 58, 104], SEA_H = [150, 172, 196];
      const pk = (r, g, b) => ((255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0)) >>> 0;
      const SKYL = new Uint32Array(256), SEAL = new Uint32Array(256 * 12);
      for (let i = 0; i < 256; i++) {
        const t = i / 255;
        SKYL[i] = pk(SKY_H[0] + (SKY_Z[0] - SKY_H[0]) * t, SKY_H[1] + (SKY_Z[1] - SKY_H[1]) * t, SKY_H[2] + (SKY_Z[2] - SKY_H[2]) * t);
        for (let pat = 0; pat < 4; pat++) for (let fd = 0; fd < 3; fd++) {
          const k = pat * 0.035 * (fd === 0 ? 1 : fd === 1 ? 0.5 : 0);
          SEAL[(pat * 3 + fd) * 256 + i] = pk((SEA_H[0] + (SEA_D[0] - SEA_H[0]) * t) * (1 - k), (SEA_H[1] + (SEA_D[1] - SEA_H[1]) * t) * (1 - k), (SEA_H[2] + (SEA_D[2] - SEA_H[2]) * t) * (1 - k * 0.6));
        }
      }
      function drawBackground() {
        const f = cam.f, r = cam.r, u = cam.u, ry = r[1] / FOC, py = cam.p[1], px0 = cam.p[0], pz0 = cam.p[2];
        const rx = r[0] / FOC, rz = r[2] / FOC, b32 = buf, il = invLen;
        for (let y = 0; y < VH; y++) {
          const b = (CY - y) / FOC;
          let dy = f[1] + u[1] * b - r[1] * CX / FOC;
          let dxw = f[0] + u[0] * b - r[0] * CX / FOC, dzw = f[2] + u[2] * b - r[2] * CX / FOC;
          let p = y * W;
          for (let x = 0; x < W; x++, p++) {
            const e = dy * il[p];
            if (e >= 0) {
              let i = (e * 816) | 0; if (i > 255) i = 255;
              b32[p] = SKYL[i];
            } else {
              let i = (-e * 2295) | 0; if (i > 255) i = 255;
              const tt = py / -dy;
              let fd = 2, pat = 0;
              if (tt < 9000) {
                fd = tt < 3000 ? 0 : tt < 6000 ? 1 : 2;
                const wx = px0 + dxw * tt, wz = pz0 + dzw * tt;
                pat = ((((wx / 60) | 0) * 7 + ((wz / 45) | 0) * 13) & 3);
              }
              b32[p] = SEAL[(pat * 3 + fd) * 256 + i];
            }
            dy += ry; dxw += rx; dzw += rz;
          }
        }
      }
      const LIGHT = norm([0.4, 0.8, 0.35]);
      const HAZE = [190, 205, 222];
      function shadeCss(col, n, dist) {
        const s = 0.42 + 0.58 * Math.max(0, dot(n, LIGHT));
        const fg = clamp((dist - 1500) / 22000, 0, 0.85);
        const r = col[0] * s * (1 - fg) + HAZE[0] * fg, g = col[1] * s * (1 - fg) + HAZE[1] * fg, b = col[2] * s * (1 - fg) + HAZE[2] * fg;
        return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
      }
      function toCam(p) { const d = sub(p, cam.p); return [dot(d, cam.r), dot(d, cam.u), dot(d, cam.f)]; }
      function projC(c) { return [CX + c[0] / c[2] * FOC, CY - c[1] / c[2] * FOC]; }
      function clipNear(cs) {
        const out = [];
        for (let i = 0; i < cs.length; i++) {
          const a = cs[i], b = cs[(i + 1) % cs.length], ain = a[2] >= NEAR, bin = b[2] >= NEAR;
          if (ain) out.push(a);
          if (ain !== bin) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
        }
        return out;
      }
      function faceToPoly(wv, n, col, list, bias) {
        // backface cull
        if (dot(n, sub(cam.p, wv[0])) <= 0) return;
        let cs = wv.map(toCam), anyIn = false, allIn = true, zs = 0;
        for (const c of cs) { if (c[2] >= NEAR) anyIn = true; else allIn = false; zs += c[2]; }
        if (!anyIn) return;
        if (!allIn) cs = clipNear(cs);
        if (cs.length < 3) return;
        const pts = cs.map(projC);
        let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
        for (const p of pts) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
        if (maxx < 0 || minx > W || maxy < 0 || miny > VH) return;
        const z = zs / wv.length;
        list.push({ z: z - (bias || 0), pts, css: shadeCss(col, n, z) });
      }
      function drawPolys(ctx, list) {
        list.sort((a, b) => b.z - a.z);
        for (const q of list) {
          ctx.fillStyle = q.css; ctx.beginPath();
          ctx.moveTo(q.pts[0][0], q.pts[0][1]);
          for (let i = 1; i < q.pts.length; i++) ctx.lineTo(q.pts[i][0], q.pts[i][1]);
          ctx.closePath(); ctx.fill();
        }
      }
      function instanceFaces(m, pos, b, list) {
        const out = [], decals = [];
        for (const fc of m.faces) {
          const wv = fc.v.map(v => [pos[0] + b.r[0] * v[0] + b.u[0] * v[1] + b.f[0] * v[2], pos[1] + b.r[1] * v[0] + b.u[1] * v[1] + b.f[1] * v[2], pos[2] + b.r[2] * v[0] + b.u[2] * v[1] + b.f[2] * v[2]]);
          const n = [b.r[0] * fc.n[0] + b.u[0] * fc.n[1] + b.f[0] * fc.n[2], b.r[1] * fc.n[0] + b.u[1] * fc.n[1] + b.f[1] * fc.n[2], b.r[2] * fc.n[0] + b.u[2] * fc.n[1] + b.f[2] * fc.n[2]];
          faceToPoly(wv, n, fc.col, fc.decal ? decals : out);
        }
        out.sort((a, b2) => b2.z - a.z);
        decals.sort((a, b2) => b2.z - a.z);
        return out.concat(decals);
      }
      function drawScene(ctx, hidePlayer) {
        drawBackground();
        ctx.putImageData(img, 0, 0);
        // islands (ground layer)
        const il = [];
        for (const f of islandFaces) {
          const c = f.v[0]; if (Math.abs(c[0] - cam.p[0]) > 32000 || Math.abs(c[2] - cam.p[2]) > 32000) continue;
          faceToPoly(f.v, f.n, f.col, il);
        }
        drawPolys(ctx, il);
        // objects sorted by distance
        const objs = [];
        const addInst = (m, pos, b, kind, extra) => {
          const c = toCam(pos), d = len(sub(pos, cam.p));
          if (c[2] < -m.rad || d > 30000) return;
          objs.push({ m, pos, b, d, c, kind, extra });
        };
        if (CV) addInst(M.carrier, CV.p, basisYaw(CV.yaw), 'cv');
        for (const u of units) {
          if (!u.alive && (u.d.air || u.deadT > 25) && u.p[1] < -50) continue;
          const b = u.d.air ? basisDir(u.f, u.bank) : basisYaw(u.yaw);
          addInst(M[u.d.model], u.p, b, 'unit', u);
        }
        if (P && !hidePlayer && !P.dead) addInst(M.player, P.p, { f: P.f, u: P.u, r: P.r }, 'player');
        for (const q of parts) objs.push({ d: len(sub(q.p, cam.p)), q });
        for (const s of shots) objs.push({ d: len(sub(s.p, cam.p)), s });
        for (const m of emsl) objs.push({ d: len(sub(m.p, cam.p)), s: m, enemy: true });
        for (const fl of flares) if (fl.v) objs.push({ d: len(sub(fl.p, cam.p)), fl });
        objs.sort((a, b) => b.d - a.d);
        for (const o of objs) {
          if (o.m) {
            const c = o.c;
            if (c[2] > NEAR) {
              const pr = o.m.rad / c[2] * FOC;
              if (pr < 1.6) {
                const p = projC(c); if (p[0] < -2 || p[0] > W + 2 || p[1] < -2 || p[1] > VH + 2) continue;
                const u = o.extra, dead = u && !u.alive;
                ctx.fillStyle = o.kind === 'cv' ? '#5a6068' : dead ? '#333' : u && u.d.air ? '#303438' : '#4a5048';
                ctx.fillRect(Math.round(p[0]) - (pr > 0.8 ? 1 : 0), Math.round(p[1]) - 1, pr > 0.8 ? 2 : 1, pr > 0.8 ? 2 : 1);
                continue;
              }
            }
            const list = instanceFaces(o.m, o.pos, o.b);
            if (o.extra && !o.extra.alive) for (const q of list) q.css = 'rgb(40,38,36)';
            for (const q of list) {
              ctx.fillStyle = q.css; ctx.beginPath(); ctx.moveTo(q.pts[0][0], q.pts[0][1]);
              for (let i = 1; i < q.pts.length; i++) ctx.lineTo(q.pts[i][0], q.pts[i][1]);
              ctx.closePath(); ctx.fill();
            }
          } else if (o.q) {
            const q = o.q, c = toCam(q.p); if (c[2] < (q.kind === 'trail' ? 25 : 4)) continue;
            const p = projC(c), r = Math.min(q.kind === 'trail' ? 12 : 40, Math.max(0.7, q.size / c[2] * FOC)), t = q.life / q.max;
            let col;
            if (q.kind === 'fire') col = t > 0.6 ? '#fff4b0' : t > 0.3 ? '#ffa030' : '#c04018';
            else if (q.kind === 'smoke') { const g = 50 + (1 - t) * 70 | 0; col = 'rgba(' + g + ',' + g + ',' + g + ',' + (0.4 + t * 0.5).toFixed(2) + ')'; }
            else if (q.kind === 'trail') col = 'rgba(235,235,235,' + (t * 0.7).toFixed(2) + ')';
            else if (q.kind === 'splash') col = 'rgba(235,245,255,' + (t * 0.9).toFixed(2) + ')';
            else if (q.kind === 'flak') col = 'rgba(30,30,30,' + (t * 0.8).toFixed(2) + ')';
            else col = '#ffd060';
            ctx.fillStyle = col;
            if (r < 1.5) ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1);
            else { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); }
          } else if (o.s) {
            const s = o.s, c = toCam(s.p); if (c[2] < NEAR) continue;
            const tail = toCam(sub(s.p, mul(s.v, s.k === 'gun' || s.k === 'egun' ? 0.02 : 0.03)));
            if (tail[2] < NEAR) continue;
            const a = projC(c), b2 = projC(tail);
            ctx.strokeStyle = s.k === 'gun' ? '#ffe880' : s.k === 'egun' ? '#ff9050' : '#ffffff'; ctx.lineWidth = s.k === 'msl' || o.enemy ? 2 : 1;
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
            if (s.k === 'msl' || o.enemy) { ctx.fillStyle = '#fff8c0'; ctx.fillRect(Math.round(a[0]) - 1, Math.round(a[1]) - 1, 2, 2); }
            ctx.lineWidth = 1;
          } else if (o.fl) {
            const c = toCam(o.fl.p); if (c[2] < NEAR) continue;
            const p = projC(c); ctx.fillStyle = (api.frame & 2) ? '#ffffff' : '#ffe080'; ctx.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, 3, 3);
          }
        }
      }

      // ---------- HUD ----------
      const HUD = '#66ff7a', HUDD = '#2f9a3c';
      function hudLine(ctx, x0, y0, x1, y1, col) { ctx.strokeStyle = col || HUD; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + 0.5, y0 + 0.5); ctx.lineTo(x1 + 0.5, y1 + 0.5); ctx.stroke(); }
      function projDir(d) { const c = [dot(d, cam.r), dot(d, cam.u), dot(d, cam.f)]; if (c[2] < 0.05) return null; return projC(c); }
      const heading = f => ((Math.atan2(f[0], f[2]) * 180 / Math.PI) % 360 + 360) % 360;
      function wpTarget() {
        if (objDone || !units.some(u => u.obj && u.alive)) return { p: CV.p, l: 'CV' };
        let best = null, bd = 1e9;
        for (const u of units) if (u.obj && u.alive) { const d = len(sub(u.p, P.p)); if (d < bd) { bd = d; best = u; } }
        return { p: best.p, l: 'WP' };
      }
      function drawHUD(ctx) {
        ctx.save && ctx.save();
        // pitch ladder
        const hf = norm([P.f[0], 0, P.f[2]]), hr = [hf[2], 0, -hf[0]];
        for (let a = -60; a <= 60; a += 10) {
          const ra = a * Math.PI / 180, dir = add(mul(hf, Math.cos(ra)), [0, Math.sin(ra), 0]);
          const p1 = projDir(add(dir, mul(hr, 0.07))), p2 = projDir(add(dir, mul(hr, -0.07)));
          const q1 = projDir(add(dir, mul(hr, 0.022))), q2 = projDir(add(dir, mul(hr, -0.022)));
          if (!p1 || !p2 || !q1 || !q2) continue;
          if (Math.max(p1[1], p2[1]) < 18 || Math.min(p1[1], p2[1]) > VH - 22) continue;
          const col = a === 0 ? HUD : a > 0 ? HUD : '#46c85a';
          if (a === 0) hudLine(ctx, p1[0] + (p1[0] - p2[0]) * 0.6, p1[1] + (p1[1] - p2[1]) * 0.6, p2[0] + (p2[0] - p1[0]) * 0.6, p2[1] + (p2[1] - p1[1]) * 0.6, col);
          else if (a > 0) { hudLine(ctx, p1[0], p1[1], q1[0], q1[1], col); hudLine(ctx, p2[0], p2[1], q2[0], q2[1], col); }
          else {
            for (let k = 0; k < 3; k++) { const t0 = k / 3, t1 = t0 + 0.18; hudLine(ctx, p1[0] + (q1[0] - p1[0]) * t0, p1[1] + (q1[1] - p1[1]) * t0, p1[0] + (q1[0] - p1[0]) * t1, p1[1] + (q1[1] - p1[1]) * t1, col); hudLine(ctx, p2[0] + (q2[0] - p2[0]) * t0, p2[1] + (q2[1] - p2[1]) * t0, p2[0] + (q2[0] - p2[0]) * t1, p2[1] + (q2[1] - p2[1]) * t1, col); }
          }
          if (a !== 0 && p1[0] > 4 && p1[0] < W - 20) text(ctx, String(Math.abs(a)), Math.round(p1[0]) + 3, Math.round(p1[1]) - 3, col);
        }
        // boresight / waterline
        ctx.fillStyle = HUD;
        ctx.fillRect(CX - 10, CY, 6, 1); ctx.fillRect(CX + 5, CY, 6, 1); ctx.fillRect(CX - 4, CY + 1, 2, 2); ctx.fillRect(CX + 3, CY + 1, 2, 2); ctx.fillRect(CX - 1, CY + 3, 3, 1);
        // heading tape
        const hd = heading(P.f);
        for (let d = Math.floor((hd - 25) / 5) * 5; d <= hd + 25; d += 5) {
          const x = Math.round(CX + (d - hd) * 2.6), dd = ((d % 360) + 360) % 360;
          ctx.fillStyle = HUD; ctx.fillRect(x, 12, 1, dd % 10 === 0 ? 4 : 2);
          if (dd % 10 === 0) text(ctx, String(dd / 10).padStart(2, '0'), x, 3, HUD, 1, 'center');
        }
        ctx.fillRect(CX, 17, 1, 3);
        const wp = wpTarget(), wd0 = sub(wp.p, P.p);
        let rel = heading(wd0) - hd; if (rel > 180) rel -= 360; if (rel < -180) rel += 360;
        const wx = Math.round(CX + clamp(rel, -25, 25) * 2.6);
        ctx.fillStyle = '#40e0ff'; ctx.fillRect(wx - 2, 20, 5, 1); ctx.fillRect(wx - 1, 21, 3, 1); ctx.fillRect(wx, 22, 1, 1);
        // speed / altitude boxes
        const kts = Math.round(P.spd * 1.944), ft = Math.round(P.p[1] * 3.28);
        ctx.strokeStyle = HUD; ctx.strokeRect(40.5, CY - 5.5, 34, 11); text(ctx, String(kts), 72, CY - 3, HUD, 1, 'right');
        ctx.strokeRect(245.5, CY - 5.5, 40, 11); text(ctx, String(ft), 283, CY - 3, HUD, 1, 'right');
        text(ctx, 'THR ' + Math.round(P.thr * 100) + (P.thr > 0.95 && !P.gear ? ' AB' : ''), 40, CY + 10, HUDD);
        const vs = Math.round(P.lastVy * 196.85 / 100) * 100; text(ctx, 'VS ' + vs, 245, CY + 10, HUDD);
        const gload = Math.max(0, P.pull) * 4 + Math.abs(P.u[1]) * 1; text(ctx, 'G ' + gload.toFixed(1), 40, CY - 16, HUDD);
        // waypoint marker
        const wpp = projDir(norm(wd0));
        if (wpp && wpp[0] > 0 && wpp[0] < W && wpp[1] > 24 && wpp[1] < VH - 10) {
          ctx.strokeStyle = '#40e0ff'; ctx.beginPath(); ctx.moveTo(wpp[0], wpp[1] - 4); ctx.lineTo(wpp[0] + 4, wpp[1]); ctx.lineTo(wpp[0], wpp[1] + 4); ctx.lineTo(wpp[0] - 4, wpp[1]); ctx.closePath(); ctx.stroke();
          text(ctx, wp.l + ' ' + (len(wd0) / 1852).toFixed(1), Math.round(wpp[0]), Math.round(wpp[1]) + 6, '#40e0ff', 1, 'center');
        }
        // target box
        const w = WPN[P.wpn];
        if (tgt && tgt.alive) {
          const tp = projDir(norm(sub(tgt.p, P.p))), dist = len(sub(tgt.p, P.p));
          const lk = locked();
          if (tp && tp[0] > -5 && tp[0] < W + 5 && tp[1] > -5 && tp[1] < VH + 5) {
            const col = lk ? ((api.frame >> 2) & 1 ? '#ff5050' : '#ffd040') : HUD;
            ctx.strokeStyle = col; ctx.strokeRect(Math.round(tp[0]) - 6.5, Math.round(tp[1]) - 6.5, 13, 13);
            if (w.cone && !lk && lockT > 0) { const r = 10 - 4 * lockT / w.lockT; ctx.strokeRect(Math.round(tp[0] - r) + 0.5, Math.round(tp[1] - r) + 0.5, Math.round(2 * r), Math.round(2 * r)); }
            if (lk) { text(ctx, 'SHOOT', Math.round(tp[0]), Math.round(tp[1]) + 9, col, 1, 'center'); }
            text(ctx, (dist / 1852).toFixed(1), Math.round(tp[0]) + 9, Math.round(tp[1]) - 9, col);
            if (P.wpn === 0 && dist < 1500) {
              // gun lead pipper
              const tt = dist / (1050 + P.spd), lead = add(tgt.p, mul(tgt.f, tgt.spd * tt));
              const lp = projDir(norm(sub(lead, P.p)));
              if (lp) { ctx.strokeStyle = HUD; ctx.beginPath(); ctx.arc(lp[0], lp[1], 5, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = HUD; ctx.fillRect(Math.round(lp[0]), Math.round(lp[1]), 1, 1); }
            }
          } else {
            const d = sub(tgt.p, P.p), lx = dot(d, P.r), ly = dot(d, P.u), a = Math.atan2(-ly, lx);
            const ax = CX + Math.cos(a) * 34, ay = CY + Math.sin(a) * 34;
            hudLine(ctx, CX + Math.cos(a) * 24, CY + Math.sin(a) * 24, ax, ay, '#ffd040');
            ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 3, 3);
          }
        }
        // weapon & status lines
        text(ctx, w.s + ' ' + P.ammo[P.wpn], 40, VH - 22, HUD);
        if (P.gear) text(ctx, 'GEAR' + (P.hook ? ' HOOK' : ''), 40, VH - 12, '#ffd040');
        if (P.brake) text(ctx, 'BRK', 112, VH - 12, '#ffd040');
        if (tgt && tgt.alive) text(ctx, tgt.d.name, 285, VH - 22, HUD, 1, 'right');
        if (warnT > 0 && (api.frame >> 3) & 1) text(ctx, 'MISSILE', CX, 28, '#ff4040', 2, 'center');
        if (P.p[1] < 150 && P.f[1] < -0.1 && !P.gear && (api.frame >> 3) & 1) text(ctx, 'PULL UP', CX, 110, '#ff4040', 2, 'center');
        if (P.spd < 70 && !P.gear && (api.frame >> 3) & 1) text(ctx, 'STALL', CX, 100, '#ffb040', 1, 'center');
        if (msgT > 0) text(ctx, msg, CX, VH - 36, msgT > 30 || (msgT >> 2) & 1 ? '#ffffff' : '#888', 1, 'center');
        // meatball / LSO
        const g = glideInfo();
        if (P.gear && g.behind && g.dist < 6000) drawMeatball(ctx, g);
        if (lsoT > 0) text(ctx, 'LSO: ' + lso, CX, 40, '#ffd040', 1, 'center');
        if (paused) text(ctx, 'PAUSED', CX, 60, '#fff', 2, 'center');
      }
      function drawMeatball(ctx, g) {
        const x0 = 286, y0 = 44;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x0 - 2, y0 - 2, 32, 62);
        // datum lights
        ctx.fillStyle = '#30ff50';
        for (let i = 0; i < 3; i++) { ctx.fillRect(x0 + i * 3, y0 + 27, 2, 2); ctx.fillRect(x0 + 19 + i * 3, y0 + 27, 2, 2); }
        // lens cells
        ctx.fillStyle = '#20262a'; ctx.fillRect(x0 + 10, y0, 8, 56);
        const cell = clamp(-g.dev / 0.25, -3.2, 3.2);
        const by = Math.round(y0 + 27 + cell * 8);
        ctx.fillStyle = cell > 2.2 ? ((api.frame >> 2) & 1 ? '#ff2020' : '#801010') : '#ffb020';
        ctx.fillRect(x0 + 11, by - 2, 6, 5);
        text(ctx, 'BALL', x0 + 14, y0 + 58, '#ffd040', 1, 'center');
        // lineup needle
        const lx = clamp(g.lx / 3, -14, 14);
        ctx.fillStyle = Math.abs(g.lx) < 8 ? '#30ff50' : '#ffd040';
        ctx.fillRect(Math.round(x0 + 14 - lx), y0 + 50, 1, 5);
        // HUD glide-path marker over the touchdown point
        const tdp = cvLocalToWorld(0, DECK_Y, TD_Z), pp = projDir(norm(sub(tdp, cam.p)));
        if (pp && view === 0) { ctx.strokeStyle = '#ffd040'; ctx.strokeRect(Math.round(pp[0]) - 3.5, Math.round(pp[1]) - 1.5, 8, 3); }
        text(ctx, (g.dist / 1852).toFixed(1) + 'NM', x0 + 14, y0 - 10, '#ffd040', 1, 'center');
      }
      function bar(ctx, x, y, w, v, col) { ctx.fillStyle = '#0b2210'; ctx.fillRect(x, y, w, 5); ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * clamp(v, 0, 1)), 5); }
      function drawPanel(ctx) {
        const y0 = VH;
        ctx.fillStyle = '#23272c'; ctx.fillRect(0, y0, W, H - y0);
        ctx.fillStyle = '#3c434a'; ctx.fillRect(0, y0, W, 2); ctx.fillStyle = '#0e1012'; ctx.fillRect(0, y0 + 2, W, 1);
        // radar MFD
        ctx.fillStyle = '#04080c'; ctx.fillRect(6, y0 + 5, 84, 56);
        const rc = [48, y0 + 52], rng0 = 25000, k = 44 / rng0;
        ctx.fillStyle = '#0f3a1a';
        for (let i = 0; i < 24; i++) { const a = Math.PI + i / 23 * Math.PI; ctx.fillRect(Math.round(rc[0] + Math.cos(a) * 44), Math.round(rc[1] + Math.sin(a) * 44), 1, 1); ctx.fillRect(Math.round(rc[0] + Math.cos(a) * 22), Math.round(rc[1] + Math.sin(a) * 22), 1, 1); }
        const hf = norm([P.f[0], 0, P.f[2]]), hr = [hf[2], 0, -hf[0]];
        const blip = (p, col, s, blink) => {
          const d = sub(p, P.p); let x = dot(d, hr) * k, y = -dot(d, hf) * k;
          if (y > 2 || Math.hypot(x, y) > 44) { if (!blink) return; const l = Math.hypot(x, y) || 1; x = x / l * 44; y = Math.min(2, y / l * 44); if ((api.frame >> 3) & 1) return; }
          ctx.fillStyle = col; ctx.fillRect(Math.round(rc[0] + x - s / 2), Math.round(rc[1] + y - s / 2), s, s);
        };
        blip(CV.p, '#40e0ff', 3, true);
        for (const u of units) if (u.alive) blip(u.p, u === tgt ? '#ffffff' : u.d.air ? '#ff4040' : u.d.sea ? '#ffd040' : '#ff60ff', u.obj ? 3 : 2, u.obj);
        for (const m of emsl) blip(m.p, '#ffffff', 1);
        ctx.fillStyle = HUD; ctx.fillRect(rc[0] - 1, rc[1] - 2, 3, 3);
        text(ctx, 'RDR 25', 9, y0 + 7, HUDD);
        // centre: weapons, systems
        ctx.fillStyle = '#04080c'; ctx.fillRect(96, y0 + 5, 128, 56);
        for (let i = 0; i < 4; i++) {
          const y = y0 + 8 + i * 9, sel = i === P.wpn;
          if (sel) { ctx.fillStyle = '#1f5a27'; ctx.fillRect(98, y - 1, 60, 9); }
          text(ctx, (i + 1) + ' ' + WPN[i].s, 100, y, sel ? '#fff' : HUDD);
          text(ctx, String(P.ammo[i]), 156, y, sel ? '#fff' : HUD, 1, 'right');
        }
        text(ctx, 'FLR ' + P.flares, 100, y0 + 45, HUD);
        text(ctx, P.gear ? 'GEAR DN' : 'GEAR UP', 221, y0 + 8, P.gear ? '#ffd040' : HUDD, 1, 'right');
        text(ctx, P.hook ? 'HOOK DN' : 'HOOK UP', 221, y0 + 17, P.hook ? '#ffd040' : HUDD, 1, 'right');
        text(ctx, locked() ? 'LOCK' : tgt ? 'TRACK' : 'SRCH', 221, y0 + 26, locked() ? '#ff5050' : HUD, 1, 'right');
        text(ctx, warnT > 0 ? 'RWR!' : 'RWR', 221, y0 + 35, warnT > 0 ? '#ff4040' : HUDD, 1, 'right');
        text(ctx, objDone ? 'RTB' : 'OBJ ' + (objTotal() - objLeft()) + '/' + objTotal(), 221, y0 + 45, objDone ? '#40e0ff' : '#ffd040', 1, 'right');
        // right MFD
        ctx.fillStyle = '#04080c'; ctx.fillRect(230, y0 + 5, 84, 56);
        text(ctx, 'DMG', 233, y0 + 8, HUDD); bar(ctx, 256, y0 + 9, 54, P.hp / 100, P.hp < 35 ? '#ff4040' : HUD);
        text(ctx, 'FUEL', 233, y0 + 18, HUDD); bar(ctx, 262, y0 + 19, 48, P.fuel / 100, P.fuel < 15 ? '#ffb040' : HUD);
        text(ctx, String(score).padStart(7, '0'), 311, y0 + 29, '#fff', 1, 'right');
        text(ctx, 'HI ' + String(hi).padStart(7, '0'), 311, y0 + 39, HUDD, 1, 'right');
        for (let i = 0; i < Math.min(6, lives - 1); i++) { const x = 236 + i * 12; ctx.fillStyle = HUD; ctx.fillRect(x + 3, y0 + 48, 2, 8); ctx.fillRect(x, y0 + 52, 8, 2); ctx.fillRect(x + 2, y0 + 55, 4, 1); }
        text(ctx, 'M' + (mi + 1), 311, y0 + 50, HUDD, 1, 'right');
      }

      function setCamCockpit() { cam.p = add(P.p, mul(P.u, 1.2)); cam.f = P.f; cam.u = P.u; cam.r = P.r; }
      function setCamLook(eye, at) { const b = basisDir(sub(at, eye), 0); cam.p = eye; cam.f = b.f; cam.u = b.u; cam.r = b.r; }
      function render(ctx) {
        if (!img) { img = ctx.createImageData(W, VH); buf = new Uint32Array(img.data.buffer); }
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract' || mode === 'over') {
          if (!CV) { CV = { p: [0, 0, 0], yaw: 0 }; newPlayerState(); }
          if (!islands.length) makeIsland(-2500, 6000, 1400, 120, 5);
          // demo: orbit camera around the carrier with a jet circling
          const t = demo.t, a = t * 0.15;
          P.p = add(CV.p, [Math.cos(t * 0.4) * 900, 260, Math.sin(t * 0.4) * 900]);
          P.f = norm([-Math.sin(t * 0.4), 0, Math.cos(t * 0.4)]); P.u = norm([Math.cos(t * 0.4) * 0.5, 1, Math.sin(t * 0.4) * 0.5]); ortho(); P.dead = false;
          setCamLook(add(CV.p, [Math.cos(a) * 700, 160, Math.sin(a) * 700 - 100]), add(CV.p, [0, 30, 0]));
          drawScene(ctx, false);
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, 22);
          text(ctx, 'SCORE ' + String(score).padStart(7, '0'), 6, 6, '#ccc');
          text(ctx, 'HI ' + String(hi).padStart(7, '0'), 314, 6, '#ffd040', 1, 'right');
          if (mode === 'over') text(ctx, 'GAME OVER', CX, 70, '#ff4040', 3, 'center');
          else if (page === 0) {
            text(ctx, 'U.S. NAVY', CX + 2, 40, '#000', 3, 'center'); text(ctx, 'U.S. NAVY', CX, 38, '#ffffff', 3, 'center');
            text(ctx, 'FIGHTERS', CX + 2, 70, '#000', 4, 'center'); text(ctx, 'FIGHTERS', CX, 68, '#f0c030', 4, 'center');
            text(ctx, 'CARRIER STRIKE OPERATIONS', CX, 108, '#e8e8f0', 1, 'center');
          } else if (page === 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 30, 280, 130);
            ['ARROWS   ROLL / PITCH', '         (DOWN PULLS NOSE UP)', 'A,Z OR X+UP/DN  THROTTLE', 'SPACE    FIRE  / CAT LAUNCH', 'X        NEXT WEAPON (FLARES)', 'ENTER    GEAR + TAILHOOK', '1-4 WEAPON  T TARGET  V VIEW', 'LAND ON THE GLIDE SLOPE -', 'KEEP THE BALL CENTERED!']
              .forEach((s, i) => text(ctx, s, 30, 38 + i * 13, i < 7 ? '#9fe8ff' : '#ffd040'));
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(50, 30, 220, 130);
            text(ctx, 'CAMPAIGN', CX, 38, '#f0c030', 2, 'center');
            MISSIONS.forEach((m, i) => text(ctx, (i + 1) + ' ' + m.name.padEnd(14, ' ') + m.type, 60, 62 + i * 14, '#9fe8ff'));
          }
          const blink = (api.frame >> 4) & 1;
          ctx.fillStyle = '#000'; ctx.fillRect(0, VH, W, H - VH);
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', CX, 196, '#fff', 1, 'center'); }
          else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', CX, 196, '#fff', 1, 'center'); }
          else text(ctx, 'PUSH START', CX, 196, blink ? '#fff' : '#888', 1, 'center');
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 6, 226, '#888');
          text(ctx, '\u00a9 1994 ELECTRONIC ARTS', 314, 226, '#666', 1, 'right');
          return;
        }
        if (mode === 'brief') {
          ctx.fillStyle = '#081420'; ctx.fillRect(0, 0, W, H);
          const m = MISSIONS[mi];
          text(ctx, 'MISSION ' + (mi + 1) + '  ' + m.type + (loop ? '  CRUISE ' + (loop + 1) : ''), 8, 8, '#f0c030');
          text(ctx, m.name, 8, 20, '#ffffff', 2);
          // tactical map
          const mx = 8, my = 44, ms = 130, sc = ms / 44000;
          ctx.fillStyle = '#0c2a48'; ctx.fillRect(mx, my, ms, ms);
          ctx.strokeStyle = '#1d4a72'; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(mx + i * ms / 4, my); ctx.lineTo(mx + i * ms / 4, my + ms); ctx.moveTo(mx, my + i * ms / 4); ctx.lineTo(mx + ms, my + i * ms / 4); ctx.stroke(); }
          const mp = (x, z) => [mx + ms / 2 + x * sc, my + ms * 0.8 - z * sc];
          for (const s of islands) { const c = mp(s.cx, s.cz); ctx.fillStyle = '#4a7a3a'; ctx.beginPath(); ctx.arc(c[0], c[1], Math.max(2, s.R * sc), 0, 6.283); ctx.fill(); }
          const cv = mp(CV.p[0], CV.p[2]); ctx.fillStyle = '#40e0ff'; ctx.fillRect(Math.round(cv[0]) - 2, Math.round(cv[1]) - 3, 4, 7);
          for (const u of units) { const c = mp(u.p[0], u.p[2]); ctx.fillStyle = u.obj ? ((api.frame >> 3) & 1 ? '#fff' : '#ff4040') : '#b03030'; ctx.fillRect(Math.round(c[0]) - 1, Math.round(c[1]) - 1, 3, 3); }
          ctx.strokeStyle = '#9fe8ff'; ctx.strokeRect(mx - 0.5, my - 0.5, ms + 1, ms + 1);
          text(ctx, 'N', mx + ms / 2, my + 3, '#9fe8ff', 1, 'center');
          m.text.forEach((s, i) => text(ctx, s, 146, 48 + i * 12, '#9fe8ff'));
          text(ctx, 'OBJECTIVES: ' + objTotal(), 146, 104, '#ffd040');
          text(ctx, 'THEN RECOVER ABOARD', 146, 116, '#ffd040');
          text(ctx, 'JETS ' + lives + '  SCORE ' + score, 146, 134, '#ccc');
          text(ctx, 'BLUE=CARRIER WHITE=TARGET', 146, 152, '#7ab');
          if ((api.frame >> 4) & 1) text(ctx, 'PRESS START TO MAN YOUR JET', CX, 200, '#fff', 1, 'center');
          return;
        }
        // in the jet
        let hide = view === 0;
        if (mode === 'dying') {
          const a = modeT * 0.6; setCamLook(add(P.p, [Math.cos(a) * 160, 60, Math.sin(a) * 160]), P.p); hide = true;
        } else if (view === 1 || mode === 'trapped' && modeT > 1.2 || mode === 'done') {
          const back = mode === 'trapped' || mode === 'done' ? add(add(P.p, mul(P.f, -35)), add(mul(P.u, 12), mul(P.r, -25))) : add(add(P.p, mul(P.f, -38)), mul(P.u, 9));
          setCamLook(back, add(P.p, mul(P.f, 20))); hide = false;
        } else setCamCockpit();
        drawScene(ctx, hide);
        if (flash > 0) { ctx.fillStyle = 'rgba(255,40,20,' + (flash / 30).toFixed(2) + ')'; ctx.fillRect(0, 0, W, VH); }
        if (mode === 'fly' && view === 0) drawHUD(ctx);
        else if (mode === 'fly') { text(ctx, msgT > 0 ? msg : '', CX, VH - 36, '#fff', 1, 'center'); const g = glideInfo(); if (P.gear && g.behind && g.dist < 6000) drawMeatball(ctx, g); if (lsoT > 0) text(ctx, 'LSO: ' + lso, CX, 40, '#ffd040', 1, 'center'); }
        if (mode === 'deck') {
          if (view === 0) { ctx.fillStyle = HUD; ctx.fillRect(CX - 10, CY, 6, 1); ctx.fillRect(CX + 5, CY, 6, 1); }
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(40, 30, 240, 34);
          text(ctx, 'CATAPULT ONE - ENGINES AT MIL', CX, 36, '#ffd040', 1, 'center');
          if ((api.frame >> 4) & 1) text(ctx, 'PRESS SPACE TO LAUNCH', CX, 50, '#fff', 1, 'center');
        }
        if (mode === 'cat') text(ctx, 'LAUNCH!', CX, 40, '#ffffff', 2, 'center');
        if (mode === 'trapped' && trapInfo) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(60, 24, 200, 40);
          text(ctx, 'TRAPPED - ' + trapInfo.wire + ' WIRE', CX, 30, '#ffffff', 1, 'center');
          text(ctx, 'LSO GRADE: ' + trapInfo.grade, CX, 42, '#ffd040', 1, 'center');
          text(ctx, '+' + trapInfo.pts, CX, 54, '#9fe8ff', 1, 'center');
        }
        if (mode === 'dying') text(ctx, P.why || '', CX, 50, '#ff4040', 1, 'center');
        drawPanel(ctx);
        if (mode === 'done' && doneInfo) {
          ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(30, 24, 260, 120);
          text(ctx, 'MISSION COMPLETE', CX, 32, '#f0c030', 2, 'center');
          text(ctx, doneInfo.name, CX, 52, '#fff', 1, 'center');
          text(ctx, 'KILLS          ' + String(doneInfo.kills).padStart(6, ' '), 50, 70, '#ccc');
          if (doneInfo.trap) text(ctx, 'TRAP ' + doneInfo.trap.wire + '-WIRE ' + doneInfo.trap.grade, 50, 82, '#ccc');
          if (doneInfo.trap) text(ctx, 'TRAP BONUS     ' + String(doneInfo.trap.pts).padStart(6, ' '), 50, 94, '#ccc');
          text(ctx, 'MISSION BONUS  ' + String(doneInfo.bonus).padStart(6, ' '), 50, 106, '#ccc');
          text(ctx, 'SCORE        ' + String(score).padStart(8, ' '), 50, 124, '#ffd040');
        }
        if (mode === 'failed') { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(30, 50, 260, 46); text(ctx, 'MISSION FAILED', CX, 58, '#ff4040', 2, 'center'); text(ctx, failWhy, CX, 80, '#fff', 1, 'center'); }
      }

      newPlayerState();
      return {
        update, render, destroy() { },
        _dbg: () => ({ mode, P, CV, units, mi, loop, score, lives, objDone, tgt, locked: locked(), glide: glideInfo, cvLocal: worldToCv, terrainH, emsl, trapInfo })
      };
    }
  });
})();
