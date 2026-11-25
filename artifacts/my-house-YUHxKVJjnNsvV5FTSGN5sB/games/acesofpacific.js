// Aces of the Pacific (Dynamix, 1992) -- arcade-friendly from-scratch take on the PC WWII naval air combat sim.
// Own flat-shaded 3D renderer, generic period fighters/bombers/ships, AI pilots of varying skill, bomber intercepts,
// dive-bombing strikes, carrier landings, a damage model (smoke, fire, engine and control loss) and a scored campaign.
(function () {
  'use strict';
  const W = 320, H = 240;

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
    '%': [25, 26, 2, 4, 8, 11, 19], '#': [10, 31, 10, 10, 31, 10, 0]
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
  function shadow(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }

  // ---------- vector math ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  function rotY(v, c) { const cs = Math.cos(c), sn = Math.sin(c); return [v[0] * cs + v[2] * sn, v[1], -v[0] * sn + v[2] * cs]; }
  function eulerFrame(yaw, pitch, roll) {
    const cp = Math.cos(pitch);
    const f = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
    const r0 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const u0 = cross(f, r0);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    return { f, u: add(mul(u0, cr), mul(r0, sr)), r: sub(mul(r0, cr), mul(u0, sr)) };
  }

  // ---------- model building ----------
  function mkFace(p, c, ref, o) {
    o = o || {};
    let n = norm(cross(sub(p[1], p[0]), sub(p[2], p[0])));
    if (o.n) n = o.n;
    else if (ref) {
      const cen = p.reduce((s, q) => add(s, q), [0, 0, 0]).map(v => v / p.length);
      if (dot(n, sub(cen, ref)) < 0) n = mul(n, -1);
    }
    return { p, c, c2: o.c2 || c, n, two: !!o.two, bias: o.bias || 0, dec: o.dec || null };
  }
  function loft(faces, S, top, bot) {
    const ring = s => { const [z, hw, ht, hb, yc] = s, y = yc || 0; return [[0, y + ht, z], [hw, y + ht * 0.4, z], [hw, y - hb * 0.5, z], [0, y - hb, z], [-hw, y - hb * 0.5, z], [-hw, y + ht * 0.4, z]]; };
    for (let i = 0; i < S.length - 1; i++) {
      const a = ring(S[i]), b = ring(S[i + 1]), col = S[i][5] || null;
      const ref = [0, S[i][4] || 0, (S[i][0] + S[i + 1][0]) / 2];
      for (let k = 0; k < 6; k++) {
        const k2 = (k + 1) % 6, c = col || (k === 2 || k === 3 ? bot : top);
        faces.push(mkFace([a[k], a[k2], b[k2], b[k]], c, ref));
      }
    }
    const f0 = ring(S[0]), f1 = ring(S[S.length - 1]);
    faces.push(mkFace(f0, top, [0, 0, S[0][0] + 1]));
    faces.push(mkFace(f1, S[S.length - 1][5] || [40, 40, 44], [0, 0, S[S.length - 1][0] - 1]));
  }
  function hexa(faces, p, c, ref) { // p: 8 points, 0-3 one end, 4-7 other end (same order)
    const q = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    const cen = ref || p.reduce((s, v) => add(s, v), [0, 0, 0]).map(v => v / 8);
    for (const k of q) faces.push(mkFace(k.map(i => p[i]), Array.isArray(c[0]) ? c[faces.length % c.length] : c, cen));
  }
  function box(faces, x0, x1, y0, y1, z0, z1, c) {
    hexa(faces, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c);
  }
  function disc(cx, y, cz, r, n, up) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = (up ? 1 : -1) * i / n * Math.PI * 2; p.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]); }
    return p;
  }
  function star(cx, y, cz, r) {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i & 1 ? r * 0.4 : r; p.push([cx + Math.cos(a) * rr, y, cz - Math.sin(a) * rr]); }
    return p;
  }
  function marking(side, cx, y, cz, r, up) {
    const n = [0, up ? 1 : -1, 0], off = up ? 0.03 : -0.03;
    if (side === 'US') return [
      { p: disc(cx, y + off, cz, r, 10, up), c: [40, 60, 130], n },
      { p: star(cx, y + off * 2, cz, r * 0.85), c: [235, 235, 235], n }];
    return [{ p: disc(cx, y + off, cz, r * 1.08, 10, up), c: [235, 235, 230], n }, { p: disc(cx, y + off * 2, cz, r * 0.9, 10, up), c: [200, 30, 30], n }];
  }
  function finish(faces) {
    let rad = 0; for (const f of faces) for (const p of f.p) rad = Math.max(rad, len(p));
    return { faces, rad };
  }

  // ---------- aircraft & ship designs (generic period types) ----------
  const PLANES = {
    US: [
      { name: 'F2N SEAHAWK', desc: ['RUGGED NAVY FIGHTER', 'TOUGH, FAIR TURN, 4 GUNS'], vmax: 150, pitch: 1.3, roll: 2.4, armor: 1.5, gun: 1.0, shape: 'stub', top: [80, 96, 118], bot: [176, 180, 186] },
      { name: 'F6N TEMPEST', desc: ['LATE-WAR HEAVY FIGHTER', 'FAST, ARMORED, 6 GUNS'], vmax: 172, pitch: 1.2, roll: 2.2, armor: 1.9, gun: 1.3, shape: 'big', top: [52, 70, 104], bot: [190, 194, 200] }],
    JP: [
      { name: 'TYPE 1 KESTREL', desc: ['NIMBLE CARRIER FIGHTER', 'TIGHT TURN, LIGHT ARMOR'], vmax: 154, pitch: 1.55, roll: 2.8, armor: 0.8, gun: 1.15, shape: 'slim', top: [186, 186, 166], bot: [196, 196, 184] },
      { name: 'TYPE 3 SHRIKE', desc: ['FAST INTERCEPTOR', 'CLIMBS WELL, 2 CANNON'], vmax: 168, pitch: 1.4, roll: 2.6, armor: 1.05, gun: 1.3, shape: 'slim2', top: [66, 92, 58], bot: [176, 176, 164] }]
  };
  function makeFighter(t, side) {
    const faces = [], T = t.top, B = t.bot, D = [44, 44, 48], G = [120, 165, 195];
    const heavy = t.shape === 'big' || t.shape === 'stub';
    const fw = heavy ? 0.72 : 0.6, span = t.shape === 'big' ? 6.6 : t.shape === 'stub' ? 5.9 : 6.1;
    loft(faces, [[-4.6, 0.1, 0.35, 0.12, 0.2], [-3.0, 0.3, 0.45, 0.3, 0.1], [-0.4, fw, 0.7, 0.6, 0], [1.9, fw * 1.02, 0.66, 0.62, 0, D], [2.9, fw * 0.95, 0.62, 0.58, 0, D], [3.3, 0.2, 0.2, 0.2, 0, D]], T, B);
    hexa(faces, [[-0.25, 0.62, -1.2], [0.25, 0.62, -1.2], [0.18, 1.12, -0.7], [-0.18, 1.12, -0.7], [-0.25, 0.64, 1.1], [0.25, 0.64, 1.1], [0.18, 1.1, 0.5], [-0.18, 1.1, 0.5]], G, [0, 0.6, 0]);
    for (const s of [-1, 1]) {
      const wp = [[0, -0.25, -1.0], [0, -0.25, 1.5], [s * span, 0.25, 0.7], [s * span, 0.25, -0.35]];
      const dec = marking(side, s * span * 0.62, 0.0, 0.25, 0.75, true).map(d => (d.side = 1, d))
        .concat(marking(side, s * span * 0.62, 0.0, 0.25, 0.75, false).map(d => (d.side = -1, d)));
      faces.push(mkFace(wp, T, null, { two: true, c2: B, n: [0, 1, 0], dec }));
      faces.push(mkFace([[0, 0.15, -4.5], [0, 0.15, -3.6], [s * 2.1, 0.2, -3.95], [s * 2.1, 0.2, -4.45]], T, null, { two: true, c2: B, n: [0, 1, 0] }));
    }
    faces.push(mkFace([[0, 0.3, -4.7], [0, 1.9, -4.5], [0, 1.85, -4.0], [0, 0.45, -3.2]], T, null, { two: true, n: [1, 0, 0] }));
    return finish(faces);
  }
  function makeBomber(side) {
    const faces = [], T = side === 'US' ? [70, 86, 110] : [72, 96, 64], B = side === 'US' ? [170, 174, 180] : [168, 168, 156], D = [44, 44, 48], G = [120, 165, 195];
    loft(faces, [[-9, 0.15, 0.4, 0.2, 0.4], [-6, 0.6, 0.8, 0.6, 0.2], [-1, 1.1, 1.1, 1.0, 0], [4, 1.1, 1.0, 1.0, 0], [6.5, 0.8, 0.8, 0.8, 0, G], [7.4, 0.3, 0.3, 0.3, 0, G]], T, B);
    for (const s of [-1, 1]) {
      const dec = marking(side, s * 9.5, 0.3, 1.2, 1.1, true).map(d => (d.side = 1, d)).concat(marking(side, s * 9.5, 0.3, 1.2, 1.1, false).map(d => (d.side = -1, d)));
      faces.push(mkFace([[0, 0, -0.5], [0, 0, 3.4], [s * 13, 0.6, 2.2], [s * 13, 0.6, 0.4]], T, null, { two: true, c2: B, n: [0, 1, 0], dec }));
      const ex = s * 4;
      const nf = []; loft(nf, [[-1.5, 0.45, 0.5, 0.5, 0, T], [2.6, 0.6, 0.6, 0.6, 0, D], [3.6, 0.55, 0.55, 0.55, 0, D]], T, B);
      for (const f of nf) { f.p = f.p.map(p => [p[0] + ex, p[1] - 0.2, p[2]]); faces.push(f); }
      faces.push(mkFace([[0, 0.3, -8.6], [0, 0.3, -7], [s * 4, 0.35, -7.6], [s * 4, 0.35, -8.6]], T, null, { two: true, c2: B, n: [0, 1, 0] }));
    }
    faces.push(mkFace([[0, 0.5, -9.2], [0, 3.6, -8.9], [0, 3.4, -7.9], [0, 0.8, -6]], T, null, { two: true, n: [1, 0, 0] }));
    return finish(faces);
  }
  function makeShip(type, side) {
    const faces = [];
    const hullC = side === 'US' ? [112, 120, 132] : [104, 108, 112], deckC = side === 'US' ? [92, 96, 104] : [128, 112, 92], sup = side === 'US' ? [140, 146, 156] : [132, 136, 140];
    const spec = { dd: [110, 11, 6], cl: [170, 16, 8], cv: [250, 26, 11] }[type];
    const [L, B, dh] = spec;
    const out = (s, y) => [[0, y, L / 2 * s], [B / 2 * s, y, (L / 2 - B * 1.6) * s], [B / 2 * s, y, (-L / 2 + B * 0.6) * s], [B * 0.32 * s, y, -L / 2 * s], [-B * 0.32 * s, y, -L / 2 * s], [-B / 2 * s, y, (-L / 2 + B * 0.6) * s], [-B / 2 * s, y, (L / 2 - B * 1.6) * s]];
    const top = out(1, dh), wl = out(0.96, 0);
    for (let i = 0; i < 7; i++) { const j = (i + 1) % 7; faces.push(mkFace([top[i], top[j], wl[j], wl[i]], hullC, [0, dh / 2, 0])); }
    faces.push(mkFace(top.slice().reverse(), deckC, null, { n: [0, 1, 0] }));
    if (type === 'cv') {
      const fd = [52, 54, 58], y0 = dh, y1 = 14;
      box(faces, -B * 0.72, B * 0.72, y0, y1, -L / 2, L / 2 - 8, fd);
      for (let i = faces.length - 6; i < faces.length; i++) if (faces[i].p.every(q => q[1] === y1)) { faces.splice(i, 1); break; }
      const deckTop = mkFace([[-B * 0.72, y1, L / 2 - 8], [B * 0.72, y1, L / 2 - 8], [B * 0.72, y1, -L / 2], [-B * 0.72, y1, -L / 2]], [96, 86, 70], null, { n: [0, 1, 0] });
      deckTop.dec = [];
      for (let z = -L / 2 + 14; z < L / 2 - 20; z += 24) deckTop.dec.push({ side: 1, n: [0, 1, 0], c: [225, 225, 215], p: [[-0.6, y1 + 0.05, z], [0.6, y1 + 0.05, z], [0.6, y1 + 0.05, z + 12], [-0.6, y1 + 0.05, z + 12]] });
      deckTop.dec.push({ side: 1, n: [0, 1, 0], c: side === 'US' ? [235, 235, 235] : [200, 30, 30], p: disc(0, y1 + 0.06, L / 2 - 30, 7, 10, true) });
      faces.push(deckTop);
      box(faces, B * 0.5, B * 0.72, y1, y1 + 12, -10, 18, sup);
      box(faces, B * 0.55, B * 0.7, y1 + 12, y1 + 20, -2, 8, [60, 60, 64]);
    } else {
      const big = type === 'cl';
      box(faces, -B * 0.3, B * 0.3, dh, dh + (big ? 9 : 6), L * 0.05, L * 0.2, sup);
      box(faces, -B * 0.18, B * 0.18, dh + (big ? 9 : 6), dh + (big ? 14 : 9), L * 0.1, L * 0.18, sup);
      box(faces, -B * 0.16, B * 0.16, dh, dh + (big ? 12 : 8), -L * 0.05, L * 0.03, [70, 70, 74]);
      if (big) box(faces, -B * 0.16, B * 0.16, dh, dh + 11, -L * 0.16, -L * 0.08, [70, 70, 74]);
      for (const z of big ? [L * 0.3, L * 0.38, -L * 0.3] : [L * 0.3, -L * 0.3]) {
        box(faces, -B * 0.22, B * 0.22, dh, dh + 2.5, z - 3, z + 3, sup);
        box(faces, -0.4, 0.4, dh + 1, dh + 1.8, z, z + (z > 0 ? 10 : -10) * (big ? 1.2 : 0.8), [60, 60, 60]);
      }
    }
    const m = finish(faces); m.L = L; m.B = B; m.dh = type === 'cv' ? 14 : dh;
    return m;
  }
  function makeIsland(r, h, seed) {
    let s = seed; const rr = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const n = 9, ring0 = [], ring1 = [], faces = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, k = 0.75 + rr() * 0.4;
      ring0.push([Math.cos(a) * r * k, 0.4, Math.sin(a) * r * k]);
      ring1.push([Math.cos(a) * r * k * 0.8, h * (0.2 + rr() * 0.2), Math.sin(a) * r * k * 0.8]);
    }
    const peak = [rr() * r * 0.2, h, rr() * r * 0.2];
    faces.push(mkFace(ring0.map(p => [p[0] * 1.12, 0.3, p[2] * 1.12]), [214, 200, 150], null, { n: [0, 1, 0], bias: -5000 }));
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push(mkFace([ring0[i], ring0[j], ring1[j], ring1[i]], [70, 128, 60], [0, h * 0.2, 0]));
      faces.push(mkFace([ring1[i], ring1[j], peak], i & 1 ? [58, 104, 52] : [84, 120, 64], [0, h * 0.3, 0]));
    }
    return finish(faces);
  }

  // ---------- AI skill table ----------
  const SK = [
    { name: 'NOVICE', turn: 0.55, err: 0.05, cone: 0.09, evade: 0.25, lead: 0.4, hp: 4, pts: 100, vm: 0.88, dmg: 0.8 },
    { name: 'VETERAN', turn: 0.72, err: 0.036, cone: 0.07, evade: 0.55, lead: 0.8, hp: 5, pts: 150, vm: 0.96, dmg: 1.0 },
    { name: 'ACE', turn: 0.88, err: 0.026, cone: 0.06, evade: 0.85, lead: 1.0, hp: 7, pts: 300, vm: 1.02, dmg: 1.2 }];
  const ACE_NAMES = { US: ['LT. MERCER', 'LT. CORDELL', 'CDR. HALVORSEN', 'LT. BRANNIGAN'], JP: ['WO. KAITO', 'LT. SAEKI', 'PO. HAYASE', 'LT. MINOBE'] };
  const MISSIONS = [
    { name: 'COMBAT AIR PATROL', type: 'sweep', f: [0, 0, 0], brief: ['BANDITS REPORTED NEAR THE FLEET.', 'CLIMB, FIND THEM AND SHOOT', 'DOWN ALL THREE FIGHTERS.'] },
    { name: 'BOMBER INTERCEPT', type: 'intercept', bombers: 3, f: [0], brief: ['ENEMY BOMBERS INBOUND FOR', 'OUR CARRIER. STOP THEM BEFORE', 'THEY REACH THE FLEET.'] },
    { name: 'DIVE BOMBING STRIKE', type: 'strike', ships: ['dd'], f: [], bombs: 2, brief: ['A LONE DESTROYER PATROLS NORTH.', 'CLIMB HIGH, DIVE STEEP, PRESS X', 'TO RELEASE YOUR BOMB. WATCH FLAK.'] },
    { name: 'FIGHTER SWEEP', type: 'sweep', f: [0, 1, 1, 0], brief: ['CLEAR THE SKY AHEAD OF THE', 'STRIKE GROUP. FOUR FIGHTERS,', 'SOME OF THEM VETERANS.'] },
    { name: 'FLEET DEFENSE', type: 'intercept', bombers: 4, f: [1, 0], brief: ['A LARGE RAID IS ON RADAR.', 'ESCORTED BOMBERS. KEEP THEM', 'AWAY FROM THE CARRIER.'] },
    { name: 'CONVOY STRIKE', type: 'strike', ships: ['dd', 'cl'], f: [0, 1], bombs: 3, brief: ['A CRUISER AND DESTROYER ARE', 'UNDER FIGHTER COVER. SINK BOTH.', 'LAND ON THE CARRIER TO REARM.'] },
    { name: 'ACE HUNT', type: 'sweep', f: [2, 1, 1], ace: true, brief: ['A FAMOUS ENEMY ACE LEADS A', 'FLIGHT OVER THE ISLANDS.', 'BRING HIM DOWN.'] },
    { name: 'CARRIER STRIKE', type: 'strike', ships: ['cv', 'dd'], f: [1, 1, 2], bombs: 3, brief: ['THE ENEMY CARRIER IS FOUND!', 'PUT BOMBS ON HER DECK.', 'THIS IS THE BIG ONE.'] }];
  const RANKS = ['CADET', 'ENSIGN', 'LIEUTENANT JG', 'LIEUTENANT', 'LT COMMANDER', 'COMMANDER', 'CAPTAIN'];

  ArcadeRegistry.register({
    id: 'acesofpacific', title: 'Aces of the Pacific', year: 1992, maker: 'Dynamix',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: stick (Up=dive) \u00b7 Space: guns \u00b7 X: bomb \u00b7 A/Z: throttle \u00b7 V: view \u00b7 Enter: start/pause',
    marquee: { bg: '#10243c', fg: '#f2e6c0', accent: '#e8a020' },
    create(api) {
      const FOC = 190, CX = 160;
      let CY = 96;
      const cam = { p: [0, 100, 0], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1] };
      const LIGHT = norm([0.35, 0.85, -0.4]);
      const FOGC = [178, 196, 214];
      let items = [];
      const MODELS = {};
      const ISLANDS = [];
      [[2600, 5400, 260, 110, 3], [-3800, 2400, 340, 160, 7], [5200, -1500, 200, 70, 11], [-1400, 9200, 420, 190, 17], [6400, 11000, 300, 120, 23]]
        .forEach(([x, z, r, h, s]) => ISLANDS.push({ pos: [x, 0, z], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1], model: makeIsland(r, h, s) }));
      const CLOUDS = [];
      for (let i = 0; i < 22; i++) CLOUDS.push({ x: rnd(0, 9000), z: rnd(0, 9000), y: rnd(900, 1500), n: 3 + (i % 3), s: rnd(50, 110) });
      function model(key, fn) { return MODELS[key] || (MODELS[key] = fn()); }

      // ---------- renderer ----------
      function toCam(w) { const d = sub(w, cam.p); return [dot(d, cam.r), dot(d, cam.u), dot(d, cam.f)]; }
      function proj(c) { return [CX + FOC * c[0] / c[2], CY - FOC * c[1] / c[2]]; }
      function clipNear(cs) {
        const NZ = 0.6, out = [];
        for (let i = 0; i < cs.length; i++) {
          const a = cs[i], b = cs[(i + 1) % cs.length], ain = a[2] >= NZ, bin = b[2] >= NZ;
          if (ain) out.push(a);
          if (ain !== bin) { const t = (NZ - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NZ]); }
        }
        return out;
      }
      function rgb(c, k, fog) {
        const r = c[0] * k * (1 - fog) + FOGC[0] * fog, g = c[1] * k * (1 - fog) + FOGC[1] * fog, b = c[2] * k * (1 - fog) + FOGC[2] * fog;
        return 'rgb(' + (r > 255 ? 255 : r | 0) + ',' + (g > 255 ? 255 : g | 0) + ',' + (b > 255 ? 255 : b | 0) + ')';
      }
      function xf(o, p) { return [o.pos[0] + o.r[0] * p[0] + o.u[0] * p[1] + o.f[0] * p[2], o.pos[1] + o.r[1] * p[0] + o.u[1] * p[1] + o.f[1] * p[2], o.pos[2] + o.r[2] * p[0] + o.u[2] * p[1] + o.f[2] * p[2]]; }
      function xn(o, n) { return [o.r[0] * n[0] + o.u[0] * n[1] + o.f[0] * n[2], o.r[1] * n[0] + o.u[1] * n[1] + o.f[1] * n[2], o.r[2] * n[0] + o.u[2] * n[1] + o.f[2] * n[2]]; }
      function polyScreen(o, pts) {
        const cs = clipNear(pts.map(p => toCam(xf(o, p))));
        if (cs.length < 3) return null;
        let d = 0; for (const c of cs) d += c[2];
        return { pts: cs.map(proj), d: d / cs.length };
      }
      function drawObj(o, dotCol) {
        const rel = sub(o.pos, cam.p), rad = o.model.rad;
        const cz = dot(rel, cam.f);
        if (cz < -rad) return;
        const dist = len(rel);
        if (dist > 14000) return;
        if (cz > 0 && FOC * rad / cz < 1.4) {
          const s = proj(toCam(o.pos));
          items.push({ d: cz, dot: s, fill: dotCol || '#333' });
          return;
        }
        const fog = Math.min(0.85, dist / 10000);
        for (const fc of o.model.faces) {
          const wn = xn(o, fc.n);
          const side = dot(wn, sub(xf(o, fc.p[0]), cam.p)) < 0 ? 1 : -1;
          if (side < 0 && !fc.two) continue;
          const ps = polyScreen(o, fc.p);
          if (!ps) continue;
          const nn = side > 0 ? wn : mul(wn, -1);
          const k = 0.5 + 0.55 * Math.max(0, dot(nn, LIGHT));
          const it = { d: ps.d - fc.bias, pts: ps.pts, fill: rgb(side > 0 ? fc.c : fc.c2, o.dim ? k * o.dim : k, fog) };
          if (fc.dec) {
            for (const dc of fc.dec) {
              if (dc.side && dc.side !== side) continue;
              const q = polyScreen(o, dc.p);
              if (q) (it.dec || (it.dec = [])).push({ pts: q.pts, fill: rgb(dc.c, k, fog) });
            }
          }
          items.push(it);
        }
      }
      function pushPoint(p, size, fill) {
        const c = toCam(p);
        if (c[2] < 1) return;
        const s = proj(c);
        items.push({ d: c[2], circ: [s[0], s[1], Math.max(0.6, size * FOC / c[2])], fill });
      }
      function pushLine(a, b, col) {
        const ca = toCam(a), cb = toCam(b);
        if (ca[2] < 1 || cb[2] < 1) return;
        items.push({ d: ca[2], line: [proj(ca), proj(cb)], fill: col });
      }
      function flush(ctx) {
        items.sort((a, b) => b.d - a.d);
        for (const it of items) {
          if (it.pts) {
            ctx.fillStyle = it.fill; ctx.beginPath();
            ctx.moveTo(it.pts[0][0], it.pts[0][1]);
            for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i][0], it.pts[i][1]);
            ctx.closePath(); ctx.fill();
            if (it.dec) for (const d of it.dec) {
              ctx.fillStyle = d.fill; ctx.beginPath(); ctx.moveTo(d.pts[0][0], d.pts[0][1]);
              for (let i = 1; i < d.pts.length; i++) ctx.lineTo(d.pts[i][0], d.pts[i][1]);
              ctx.closePath(); ctx.fill();
            }
          } else if (it.circ) {
            ctx.fillStyle = it.fill; ctx.beginPath(); ctx.arc(it.circ[0], it.circ[1], Math.min(60, it.circ[2]), 0, Math.PI * 2); ctx.fill();
          } else if (it.dot) {
            ctx.fillStyle = it.fill; ctx.fillRect(it.dot[0] - 1, it.dot[1] - 1, 2, 2);
          } else if (it.line) {
            ctx.strokeStyle = it.fill; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(it.line[0][0], it.line[0][1]); ctx.lineTo(it.line[1][0], it.line[1][1]); ctx.stroke();
          }
        }
        items = [];
      }
      function sOf(x, y) { const X = (x - CX) / FOC, Y = -(y - CY) / FOC; return cam.r[1] * X + cam.u[1] * Y + cam.f[1]; }
      function clipHalf(poly, thr) {
        const out = [];
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i], b = poly[(i + 1) % poly.length], sa = sOf(a[0], a[1]) - thr, sb = sOf(b[0], b[1]) - thr;
          if (sa <= 0) out.push(a);
          if ((sa <= 0) !== (sb <= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
        }
        return out;
      }
      function fillPoly(ctx, p, col) {
        if (p.length < 3) return;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
        ctx.closePath(); ctx.fill();
      }
      function drawWorld(ctx, extra) {
        const scr = [[0, 0], [W, 0], [W, H], [0, H]];
        ctx.fillStyle = '#4a7cc0'; ctx.fillRect(0, 0, W, H);
        fillPoly(ctx, clipHalf(scr, 0.25), '#6e9ad0');
        fillPoly(ctx, clipHalf(scr, 0.1), '#93b6dc');
        fillPoly(ctx, clipHalf(scr, 0.03), '#b4cce0');
        fillPoly(ctx, clipHalf(scr, 0), '#5f8aa8');
        fillPoly(ctx, clipHalf(scr, -0.04), '#3c6e94');
        fillPoly(ctx, clipHalf(scr, -0.2), '#2c5a80');
        // whitecaps for a sense of motion
        const alt = cam.p[1];
        if (alt < 2500) {
          const sp = alt < 600 ? 90 : 220, gx = Math.floor(cam.p[0] / sp), gz = Math.floor(cam.p[2] / sp), R = 12;
          ctx.fillStyle = 'rgba(220,235,245,0.55)';
          for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
            const ix = gx + i, iz = gz + j, h = ((ix * 73856093) ^ (iz * 19349663)) >>> 0;
            if (h % 3) continue;
            const c = toCam([ix * sp + (h % 97) / 97 * sp, 0, iz * sp + (h % 89) / 89 * sp]);
            if (c[2] < 5) continue;
            const s = proj(c);
            if (s[0] < 0 || s[0] > W || s[1] < 0 || s[1] > H) continue;
            ctx.fillRect(s[0], s[1], c[2] < 300 ? 3 : 2, 1);
          }
        }
        for (const isl of ISLANDS) drawObj(isl, '#4a7a40');
        // clouds tiled around the camera
        const T = 9000;
        for (const c of CLOUDS) {
          const x = c.x + Math.round((cam.p[0] - c.x) / T) * T, z = c.z + Math.round((cam.p[2] - c.z) / T) * T;
          for (let k = 0; k < c.n; k++) pushPoint([x + (k - c.n / 2) * c.s * 0.8, c.y + (k & 1) * c.s * 0.25, z + (k % 2) * c.s * 0.3], c.s * (0.7 + (k % 2) * 0.3), k & 1 ? 'rgba(236,240,246,0.9)' : 'rgba(250,252,255,0.92)');
        }
        if (extra) extra();
        flush(ctx);
      }

      // ---------- game state ----------
      let state = 'title', tTitle = 0, coinFlash = 0, paused = false;
      let side = 'US', planeIdx = 0, sel = 0;
      let score = 0, lives = 3, missionIdx = 0, tour = 0, hiScore = api.getHiScore(25000);
      let P = null, enemies = [], ships = [], bullets = [], bombs = [], parts = [], msgs = [], carrier = null;
      let mission = null, view = 0, stateT = 0, engT = 0;
      let demo = null;
      const PT = () => PLANES[side][planeIdx];
      const enemySide = () => side === 'US' ? 'JP' : 'US';

      function msg(s, col, t) { msgs.push({ s, col: col || '#ffe070', t: t || 2.5 }); if (msgs.length > 3) msgs.shift(); }
      function part(p, v, life, size, kind) { if (parts.length < 500) parts.push({ p: p.slice(), v: v.slice(), life, max: life, size, kind }); }
      function boom(p, n, big) {
        for (let i = 0; i < n; i++) part(p, [rnd(-1, 1) * 18 * big, rnd(-0.5, 1.5) * 14 * big, rnd(-1, 1) * 18 * big], rnd(0.5, 1.4), rnd(3, 7) * big, i % 3 ? 'smoke' : 'fire');
        api.audio.noise(0.5 + big * 0.3, { vol: 0.22, freq: 900, slideTo: 80 });
      }
      function splash(p, big) {
        for (let i = 0; i < 10 * big; i++) part([p[0], 1, p[2]], [rnd(-6, 6) * big, rnd(15, 35) * big, rnd(-6, 6) * big], rnd(0.8, 1.6), rnd(2, 5) * big, 'splash');
        api.audio.noise(0.4, { vol: 0.15, freq: 1500, slideTo: 200 });
      }

      function newPlayer(atDeck) {
        const t = PT();
        const p = {
          pos: [0, 220, 220], r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1], speed: t.vmax * 0.85, throttle: 0.85,
          hull: 10, eng: 1, ctrl: 1, fire: false, ammo: 600, bombs: mission ? (mission.def.bombs || 0) : 0,
          pr: 0, rr: 0, gunCd: 0, dead: false, deadT: 0, drift: Math.random() < 0.5 ? -1 : 1, approach: false, model: model(side + planeIdx, () => makeFighter(t, side))
        };
        if (carrier) {
          const cf = [Math.sin(carrier.hdg), 0, Math.cos(carrier.hdg)];
          p.pos = add(carrier.pos, add(mul(cf, atDeck ? 140 : 260), [0, atDeck ? 40 : 220, 0]));
          const fr = eulerFrame(carrier.hdg, 0.05, 0); p.f = fr.f; p.u = fr.u; p.r = fr.r;
        }
        return p;
      }
      function mkShip(type, s, pos, hdg) {
        const m = model('ship' + type + s, () => makeShip(type, s));
        const hp = { dd: 1, cl: 2, cv: 3 }[type];
        return { type, side: s, pos, hdg, speed: type === 'cv' ? 9 : 11, model: m, hp, maxhp: hp, sink: 0, list: 0, flakT: rnd(0.5, 2), friendly: s === side, r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1] };
      }
      function mkEnemy(kind, skill, pos, yaw) {
        const es = enemySide(), sk = SK[Math.min(2, skill)];
        const t = PLANES[es][missionIdx >= 4 || tour > 0 ? 1 : 0];
        const m = kind === 'bomber' ? model('bomber' + es, () => makeBomber(es)) : model(es + (missionIdx >= 4 || tour > 0 ? 1 : 0), () => makeFighter(t, es));
        const e = {
          kind, skill: Math.min(2, skill), pos, yaw, pitch: 0, roll: 0, speed: kind === 'bomber' ? 74 : t.vmax * sk.vm * 0.9,
          vmax: kind === 'bomber' ? 78 : t.vmax * sk.vm, turn: kind === 'bomber' ? 0.25 : sk.turn + tour * 0.08,
          hp: kind === 'bomber' ? 9 + tour : sk.hp + tour, mode: kind === 'bomber' ? 'bomb' : 'attack', modeT: rnd(0, 2), gunCd: 1, burst: 0,
          falling: false, gone: false, spin: 0, model: m, alt: pos[1], name: '', escaped: false, smokeT: 0
        };
        e.maxhp0 = e.hp; frameOf(e);
        return e;
      }
      function setupMission() {
        const def = MISSIONS[missionIdx % MISSIONS.length];
        mission = { def, done: false, failed: false, doneT: 0, carrierHits: 0, kills: 0, sunk: 0, pts0: score, landed: false, t: 0 };
        enemies = []; ships = []; bullets = []; bombs = []; parts = []; msgs = [];
        carrier = mkShip('cv', side, [0, 0, 0], 0); carrier.friendly = true;
        ships.push(carrier);
        P = newPlayer(false);
        const es = enemySide();
        const ang = rnd(-0.5, 0.5);
        const base = [Math.sin(ang) * 4200, 0, 4200 + Math.cos(ang) * 600];
        if (def.type === 'strike') {
          def.ships.forEach((t, i) => ships.push(mkShip(t, es, add(base, [i * 420 - 200, 0, i * 300 + 1600]), Math.PI + rnd(-0.6, 0.6))));
        }
        if (def.type === 'intercept') {
          const st = [rnd(-1500, 1500), 0, 11000];
          for (let i = 0; i < def.bombers + Math.min(2, tour); i++) {
            const e = mkEnemy('bomber', 0, add(st, [(i - def.bombers / 2) * 60, 1300 + (i % 2) * 30, -Math.abs(i - def.bombers / 2) * 50]), Math.PI);
            enemies.push(e);
          }
        }
        def.f.forEach((s, i) => {
          const sk = Math.min(2, s + (tour > 1 ? 1 : 0));
          const p = def.type === 'intercept' ? add(enemies[0].pos, [i * 120 - 60, 260, 200]) : add(base, [i * 160 - 200, 1300 + i * 90, i * 80]);
          const e = mkEnemy('fighter', sk, p, Math.PI + rnd(-0.3, 0.3));
          if (def.type === 'intercept') e.mode = 'escort';
          if (def.ace && i === 0) { e.name = ACE_NAMES[es][(missionIdx + tour) % 4]; e.hp += 3; }
          enemies.push(e);
        });
        if (tour > 0 && def.type === 'sweep') enemies.push(mkEnemy('fighter', Math.min(2, tour), add(base, [300, 1600, 300]), Math.PI));
        view = 0; paused = false;
        msg(def.name, '#ffffff', 3);
      }
      function objectiveLeft() {
        const d = mission.def;
        if (d.type === 'sweep') return enemies.filter(e => !e.falling && !e.gone && e.kind === 'fighter').length;
        if (d.type === 'intercept') return enemies.filter(e => !e.falling && !e.gone && !e.escaped && e.kind === 'bomber').length;
        return ships.filter(s => !s.friendly && s.hp > 0).length;
      }

      // ---------- player ----------
      function hitPlayer(dmg) {
        if (P.dead) return;
        P.hull -= dmg / PT().armor;
        const r = Math.random();
        if (r < 0.16 && P.eng > 0) { P.eng = Math.max(0, P.eng - 0.3); msg(P.eng <= 0 ? 'ENGINE DEAD!' : 'ENGINE HIT', '#ff8040'); }
        else if (r < 0.23 && !P.fire) { P.fire = true; msg('FIRE! DIVE TO BLOW IT OUT', '#ff4020', 3); }
        else if (r < 0.33) { P.ctrl = Math.max(0, P.ctrl - 0.25); msg('CONTROLS DAMAGED', '#ff8040'); }
        api.audio.noise(0.08, { vol: 0.2, freq: 3000 });
        api.audio.tone(140, 0.06, { type: 'square', vol: 0.1 });
        if (P.hull <= 0) killPlayer('SHOT DOWN');
      }
      function killPlayer(why) {
        if (P.dead) return;
        P.dead = true; P.deadT = 3.2; P.fire = true; P.why = why;
        msg(why, '#ff4040', 3.5);
        boom(P.pos, 8, 1);
        api.audio.melody([[220, 0.15], [185, 0.15], [147, 0.3]], { type: 'square', vol: 0.12 });
      }
      function reorth(o) { o.f = norm(o.f); o.r = norm(cross(o.u, o.f)); o.u = cross(o.f, o.r); }
      function pitchObj(o, a) { const c = Math.cos(a), s = Math.sin(a), f = add(mul(o.f, c), mul(o.u, s)); o.u = sub(mul(o.u, c), mul(o.f, s)); o.f = f; }
      function rollObj(o, b) { const c = Math.cos(b), s = Math.sin(b), u = add(mul(o.u, c), mul(o.r, s)); o.r = sub(mul(o.r, c), mul(o.u, s)); o.u = u; }
      function updatePlayer(dt) {
        const t = PT();
        if (P.dead) {
          P.deadT -= dt;
          rollObj(P, 2.4 * dt); pitchObj(P, -0.5 * dt); P.f = add(P.f, [0, -0.6 * dt, 0]); reorth(P);
          if (P.pos[1] > 0) P.pos = add(P.pos, mul(P.f, P.speed * dt));
          else if (!P.splashed) { P.splashed = true; splash(P.pos, 2); }
          if ((engT += dt) > 0.04) { engT = 0; part(P.pos, [0, 4, 0], 2.5, 4, 'smoke'); part(P.pos, [0, 2, 0], 0.5, 3, 'fire'); }
          if (P.deadT <= 0) planeLost();
          return;
        }
        let pi = 0, ri = 0;
        if (api.key('ArrowUp')) pi -= 1;
        if (api.key('ArrowDown')) pi += 1;
        if (api.key('ArrowLeft')) ri -= 1;
        if (api.key('ArrowRight')) ri += 1;
        if (api.key('KeyA')) P.throttle = Math.min(1, P.throttle + dt * 0.6);
        if (api.key('KeyZ')) P.throttle = Math.max(0, P.throttle - dt * 0.6);
        const auth = (0.35 + 0.65 * P.ctrl) * clamp((P.speed - 30) / 45, 0.25, 1);
        P.pr += (pi * t.pitch * auth - P.pr) * Math.min(1, dt * 6);
        P.rr += (ri * t.roll * auth - P.rr) * Math.min(1, dt * 8);
        if (P.ctrl < 0.55) P.rr += P.drift * (0.55 - P.ctrl) * 1.6 * dt;
        if (P.ctrl <= 0) killPlayer('LOST CONTROL - BAILED OUT');
        pitchObj(P, P.pr * dt); rollObj(P, P.rr * dt);
        const bank = -P.r[1];
        const yaw = bank * 0.55 * dt * clamp(P.speed / 120, 0.4, 1.2);
        P.f = rotY(P.f, yaw); P.u = rotY(P.u, yaw);
        const stall = 52;
        if (P.speed < stall) { P.f = add(P.f, [0, -(stall - P.speed) * 0.025 * dt, 0]); if (Math.random() < 0.05) msg('STALL!', '#ff8040', 0.8); }
        reorth(P);
        // carrier approach assist
        let thr = P.throttle;
        P.approach = false;
        if (carrier && carrier.hp > 0) {
          const cf = [Math.sin(carrier.hdg), 0, Math.cos(carrier.hdg)], cr = [Math.cos(carrier.hdg), 0, -Math.sin(carrier.hdg)];
          const rel = sub(P.pos, carrier.pos), lx = dot(rel, cr), lz = dot(rel, cf);
          const hd = Math.abs(wrapA(Math.atan2(P.f[0], P.f[2]) - carrier.hdg));
          if (lz > -1400 && lz < 120 && Math.abs(lx) < 140 && P.pos[1] < 260 && hd < 0.5) { P.approach = true; thr = Math.min(thr, 0.25); }
          if (Math.abs(lx) < 19 && lz > -125 && lz < 112 && P.pos[1] < 14 + 4) {
            if (P.approach && P.f[1] > -0.45 && Math.abs(bank) < 0.65 && P.speed < 115) { trap(); return; }
            if (P.pos[1] < 14.5) { killPlayer('CRASHED ON DECK'); return; }
          }
        }
        const target = thr * (0.25 + 0.75 * P.eng) * (P.eng > 0 ? 1 : 0);
        P.speed += (24 * (target - (P.speed / t.vmax) ** 2) - 15 * P.f[1]) * dt;
        if (P.approach) P.speed += (78 - P.speed) * Math.min(1, dt * 0.7);
        P.speed = clamp(P.speed, 20, t.vmax * 1.6);
        P.pos = add(P.pos, mul(P.f, P.speed * dt));
        if (P.pos[1] > 7000) P.pos[1] = 7000;
        if (P.pos[1] < 2) { P.pos[1] = 0.5; killPlayer('CRASHED INTO THE SEA'); splash(P.pos, 2); return; }
        for (const s of ships) {
          if (s.sink > 0.9) continue;
          const rel = sub(P.pos, s.pos), sf = [Math.sin(s.hdg), 0, Math.cos(s.hdg)], sr = [Math.cos(s.hdg), 0, -Math.sin(s.hdg)];
          if (Math.abs(dot(rel, sr)) < s.model.B / 2 && Math.abs(dot(rel, sf)) < s.model.L / 2 && P.pos[1] < s.model.dh + s.pos[1] - 1) { killPlayer('HIT A SHIP'); return; }
        }
        // damage effects
        if (P.fire) {
          P.hull -= 0.4 * dt;
          if ((P.speed > t.vmax * 1.12 && Math.random() < dt * 0.9) || Math.random() < dt * 0.03) { P.fire = false; msg('FIRE IS OUT', '#80ff80'); }
          if (P.hull <= 0) { killPlayer('PLANE ON FIRE - BAILED OUT'); return; }
        }
        if ((engT += dt) > 0.07) {
          engT = 0;
          const back = add(P.pos, mul(P.f, -4));
          if (P.fire) { part(back, [0, 3, 0], 0.4, 1.4, 'fire'); part(back, [0, 3, 0], 2, 2.5, 'smoke'); }
          else if (P.eng < 0.7 || P.hull < 5) part(back, [0, 2, 0], 1.6, 1.8, P.eng < 0.4 ? 'black' : 'smoke');
        }
        // guns
        P.gunCd -= dt;
        if (api.key('Space') && P.gunCd <= 0 && P.ammo > 0) {
          P.gunCd = 1 / 13; P.ammo--;
          const sp = 0.006, d = norm(add(P.f, [rnd(-sp, sp), rnd(-sp, sp), rnd(-sp, sp)]));
          const side2 = (P.ammo & 1 ? 1 : -1) * 1.5;
          bullets.push({ p: add(add(P.pos, mul(P.r, side2)), mul(P.f, 3)), v: add(mul(d, 720), mul(P.f, P.speed)), life: 1.0, mine: true, dmg: t.gun });
          if (P.ammo % 2 === 0) api.audio.noise(0.05, { vol: 0.09, freq: 2200, slideTo: 500 });
        }
        if (api.pressed('KeyX')) {
          if (P.bombs > 0) {
            P.bombs--; bombs.push({ p: add(P.pos, mul(P.u, -1.5)), v: mul(P.f, P.speed) });
            msg('BOMB AWAY', '#ffffff', 1.2); api.audio.tone(900, 0.5, { type: 'triangle', vol: 0.1, slideTo: 300 });
          } else if (mission.def.type === 'strike') msg('NO BOMBS - LAND TO REARM', '#ffa040', 1.5);
        }
        if (api.pressed('KeyV')) view = 1 - view;
      }
      function trap() {
        api.audio.melody([[392, 0.1], [523, 0.1], [659, 0.2]], { type: 'square', vol: 0.12 });
        state = 'deck'; stateT = 0;
        if (mission.done) { mission.landed = true; score += 500; msg('GOOD TRAP! +500', '#80ff80', 3); }
        else msg('ON DECK - REARM AND REPAIR', '#80ff80', 3);
      }
      function relaunch() {
        const keep = P.bombs;
        P = newPlayer(true);
        P.bombs = mission.def.type === 'strike' ? (mission.def.bombs || 0) : 0;
        if (keep > P.bombs) P.bombs = keep;
        state = 'fly';
        msg('LAUNCH!', '#ffffff', 1.5);
      }
      function planeLost() {
        lives--;
        if (lives > 0) { state = 'lost'; stateT = 0; return; }
        const onEnd = () => { gameOver(); };
        if (api.offerContinue) { state = 'lost'; stateT = 999; api.offerContinue(() => { lives = 3; state = 'brief'; stateT = 0; }, onEnd); }
        else onEnd();
      }
      function gameOver() {
        state = 'over'; stateT = 6;
        if (score > hiScore) hiScore = score;
        api.setHiScore(score);
      }
      function endMission() {
        const d = mission.def;
        mission.bonus = mission.failed ? 0 : 1000 + tour * 500;
        score += mission.bonus;
        if (score > hiScore) { hiScore = score; }
        api.setHiScore(score);
        state = 'debrief'; stateT = 0;
        api.audio.melody(mission.failed ? [[330, 0.2], [262, 0.4]] : [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.35]], { type: 'square', vol: 0.12 });
        void d;
      }

      // ---------- AI ----------
      function frameOf(e) { const fr = eulerFrame(e.yaw, e.pitch, e.roll); e.f = fr.f; e.u = fr.u; e.r = fr.r; }
      function steer(e, T, tr, dt) {
        const d = sub(T, e.pos);
        const dyaw = wrapA(Math.atan2(d[0], d[2]) - e.yaw);
        let dp = clamp(Math.atan2(d[1], Math.hypot(d[0], d[2])), -0.9, 0.9);
        if (e.pos[1] < 220) dp = Math.max(dp, 0.3);
        const yr = clamp(dyaw * 2.2, -tr, tr);
        e.yaw = wrapA(e.yaw + yr * dt);
        e.pitch += clamp(dp - e.pitch, -tr * 0.8 * dt, tr * 0.8 * dt);
        e.roll += (clamp(yr / tr, -1, 1) * 1.15 - e.roll) * Math.min(1, dt * 3);
      }
      function moveAI(e, dt) {
        e.speed += (e.vmax - e.speed) * 0.4 * dt - Math.sin(e.pitch) * 9 * dt;
        e.speed = clamp(e.speed, 50, e.vmax * 1.4);
        frameOf(e);
        e.pos = add(e.pos, mul(e.f, e.speed * dt));
      }
      function aiFire(e, target, err, dmg) {
        const dist = len(sub(target, e.pos)), k = err * dist;
        const d = norm(add(sub(target, e.pos), [rnd(-1, 1) * k, rnd(-1, 1) * k, rnd(-1, 1) * k]));
        bullets.push({ p: add(e.pos, mul(d, 6)), v: mul(d, 640), life: 1.1, mine: false, dmg });
        if (Math.random() < 0.5) api.audio.noise(0.04, { vol: 0.05, freq: 1400 });
      }
      function updateEnemy(e, dt) {
        if (e.gone) return;
        if (e.falling) {
          e.pitch = Math.max(-1.25, e.pitch - 0.45 * dt); e.roll += e.spin * dt; e.yaw += e.spin * 0.15 * dt;
          e.speed = Math.min(e.speed + 12 * dt, 190); frameOf(e);
          e.pos = add(e.pos, mul(e.f, e.speed * dt));
          if ((e.smokeT += dt) > 0.06) { e.smokeT = 0; part(e.pos, [0, 3, 0], 2.6, e.kind === 'bomber' ? 6 : 3.5, 'black'); part(e.pos, [0, 1, 0], 0.4, 2.5, 'fire'); }
          if (e.pos[1] <= 0) { e.gone = true; splash(e.pos, e.kind === 'bomber' ? 2 : 1.4); }
          return;
        }
        const sk = SK[e.skill];
        const toP = sub(P.pos, e.pos), dist = len(toP);
        if (e.hp < (e.kind === 'bomber' ? 6 : 2.5) && (e.smokeT += dt) > 0.12) { e.smokeT = 0; part(add(e.pos, mul(e.f, -3)), [0, 2, 0], 1.5, 2.5, 'smoke'); }
        e.gunCd -= dt; e.modeT -= dt;
        if (e.kind === 'bomber') {
          let T;
          if (!e.escaped && carrier) {
            T = [carrier.pos[0], e.alt, carrier.pos[2]];
            const hd = Math.hypot(e.pos[0] - carrier.pos[0], e.pos[2] - carrier.pos[2]);
            if (hd < 280 && carrier.hp > 0) {
              e.escaped = true;
              if (Math.random() < 0.7) {
                mission.carrierHits++;
                boom(add(carrier.pos, [rnd(-20, 20), 16, rnd(-80, 80)]), 10, 2);
                msg('THE CARRIER IS HIT!', '#ff4040', 3);
              } else { splash(add(carrier.pos, [rnd(40, 70), 0, rnd(-60, 60)]), 2); msg('NEAR MISS ON THE CARRIER', '#ffa040'); }
              e.away = norm([e.pos[0] - carrier.pos[0] + rnd(-50, 50), 0, e.pos[2] - carrier.pos[2] + 300]);
            }
          } else T = add(e.pos, mul(e.away || [0, 0, 1], 2000));
          if (e.escaped && Math.hypot(e.pos[0], e.pos[2]) > 9000) e.gone = true;
          steer(e, T, e.turn, dt); moveAI(e, dt);
          // tail gunner
          if (!P.dead && dist < 380 && dot(toP, e.f) < 0 && e.gunCd <= 0) { e.gunCd = rnd(0.45, 0.8); aiFire(e, P.pos, 0.085, 0.35); }
          return;
        }
        let T;
        if (e.mode === 'escort') {
          const lead = enemies.find(b => b.kind === 'bomber' && !b.falling && !b.gone);
          if (!lead || dist < 1900 || e.hp < e.maxhp0) e.mode = 'attack';
          else T = add(lead.pos, add(mul(lead.f, 160), [0, 220, 0]));
        }
        if (e.mode === 'break') {
          T = e.brk;
          if (e.modeT <= 0) { e.mode = 'attack'; e.modeT = rnd(2, 4); }
        }
        if (e.mode === 'attack') {
          if (P.dead) T = add(e.pos, mul(e.f, 800));
          else {
            const tt = dist / 640 * sk.lead;
            T = add(P.pos, mul(P.f, P.speed * tt));
            // evade when someone is on our tail
            const behind = dot(norm(toP), e.f) < -0.4 && dist < 520;
            const headOn = dist < 140 && dot(norm(toP), e.f) > 0.5 && dot(P.f, e.f) < -0.5;
            if ((behind && e.modeT <= 0) || headOn) {
              e.modeT = 1.5;
              if (headOn || Math.random() < sk.evade) {
                e.mode = 'break'; e.modeT = rnd(1.6, 3);
                e.brk = add(e.pos, add(mul(rotY(e.f, (Math.random() < 0.5 ? -1 : 1) * rnd(1.2, 2)), 900), [0, rnd(-250, 300), 0]));
              }
            }
            const ang = Math.acos(clamp(dot(e.f, norm(sub(T, e.pos))), -1, 1));
            if (dist < 560 && ang < sk.cone && e.gunCd <= 0 && e.mode === 'attack') {
              e.gunCd = 0.11; e.burst++;
              if (e.burst > 8) { e.burst = 0; e.gunCd = rnd(0.6, 1.4); }
              aiFire(e, T, sk.err, sk.dmg);
            }
          }
        }
        steer(e, T || add(e.pos, mul(e.f, 500)), e.turn, dt);
        moveAI(e, dt);
        if (!P.dead && dist < 4.5) { e.hp = 0; downEnemy(e); killPlayer('MID-AIR COLLISION'); }
      }
      function downEnemy(e) {
        e.falling = true; e.spin = rnd(1.5, 3) * (Math.random() < 0.5 ? -1 : 1);
        const pts = e.kind === 'bomber' ? 200 : SK[e.skill].pts * (e.name ? 3 : 1);
        score += pts; mission.kills++;
        msg((e.name ? e.name + ' ' : '') + (e.kind === 'bomber' ? 'BOMBER' : SK[e.skill].name) + ' DOWN! +' + pts, '#80ff80', 2.5);
        boom(e.pos, 6, e.kind === 'bomber' ? 1.5 : 1);
        api.audio.melody([[660, 0.06], [880, 0.08]], { type: 'square', vol: 0.1 });
      }

      // ---------- ships, bombs, flak ----------
      function shipFrame(s) {
        const fr = eulerFrame(s.hdg, 0, s.list);
        s.f = fr.f; s.u = fr.u; s.r = fr.r;
      }
      function shipLocal(s, p) {
        const rel = sub(p, s.pos);
        return [dot(rel, [Math.cos(s.hdg), 0, -Math.sin(s.hdg)]), dot(rel, [Math.sin(s.hdg), 0, Math.cos(s.hdg)])];
      }
      function damageShip(s, n) {
        if (s.hp <= 0) return;
        s.hp -= n;
        boom(add(s.pos, [0, s.model.dh, 0]), 12, 2.5);
        if (s.hp <= 0) {
          const pts = { dd: 600, cl: 1000, cv: 2000 }[s.type];
          score += pts; mission.sunk++;
          msg(({ dd: 'DESTROYER', cl: 'CRUISER', cv: 'CARRIER' })[s.type] + ' SUNK! +' + pts, '#80ff80', 3.5);
          api.audio.melody([[392, 0.1], [494, 0.1], [587, 0.1], [784, 0.3]], { type: 'square', vol: 0.12 });
        } else msg('DIRECT HIT! +' + 100, '#80ff80');
        score += 100;
      }
      function updateShips(dt) {
        for (const s of ships) {
          if (s.hp > 0) s.pos = add(s.pos, [Math.sin(s.hdg) * s.speed * dt, 0, Math.cos(s.hdg) * s.speed * dt]);
          if (s.hp <= 0) { s.sink += dt / 14; s.pos[1] = -s.sink * 30; s.list = s.sink * 0.5; s.speed = 0; }
          shipFrame(s);
          if (s.hp < s.maxhp && Math.random() < dt * 8) part(add(s.pos, [rnd(-6, 6), s.model.dh + 2, rnd(-20, 20)]), [rnd(-2, 2), 9, 0], 4, 9, s.hp <= 0 ? 'black' : 'smoke');
          if (s.friendly || s.hp <= 0 || P.dead || state !== 'fly') continue;
          const d = len(sub(P.pos, s.pos));
          s.flakT -= dt;
          if (d < 1900 && s.flakT <= 0) {
            s.flakT = rnd(0.35, 0.8) / ({ dd: 1, cl: 1.6, cv: 1.9 }[s.type]);
            const acc = 26 + d * 0.03;
            const bp = add(add(P.pos, mul(P.f, P.speed * rnd(0.2, 0.5))), [rnd(-1, 1) * acc, rnd(-1, 1) * acc, rnd(-1, 1) * acc]);
            part(bp, [0, 0, 0], 2.2, 5, 'flak'); part(bp, [0, 0, 0], 0.15, 4, 'flash');
            api.audio.noise(0.2, { vol: Math.max(0.03, 0.16 - d / 15000), freq: 500, slideTo: 80 });
            if (len(sub(bp, P.pos)) < 22) hitPlayer(1.4);
          }
        }
        ships = ships.filter(s => s.sink < 1);
      }
      function predictBomb() {
        let p = P.pos.slice(), v = mul(P.f, P.speed);
        for (let i = 0; i < 400 && p[1] > 0; i++) { v = add(v, [0, -9.8 * 0.05, 0]); p = add(p, mul(v, 0.05)); }
        return p;
      }
      function updateBombs(dt) {
        for (const b of bombs) {
          b.v = add(b.v, [0, -9.8 * dt, 0]); b.p = add(b.p, mul(b.v, dt));
          let hit = false;
          for (const s of ships) {
            if (s.hp <= 0) continue;
            const [lx, lz] = shipLocal(s, b.p);
            if (Math.abs(lx) < s.model.B / 2 + 7 && Math.abs(lz) < s.model.L / 2 + 7 && b.p[1] < s.model.dh) {
              if (s.friendly) { hit = true; break; }
              damageShip(s, 1); hit = true; break;
            }
          }
          if (!hit && b.p[1] <= 0) { splash(b.p, 2.5); hit = true; msg('MISSED', '#ffa040', 1); }
          if (hit) b.dead = true;
        }
        bombs = bombs.filter(b => !b.dead);
      }
      function segHit(p, d, c, r) {
        const dd = dot(d, d) || 1;
        const t = clamp(dot(sub(c, p), d) / dd, 0, 1);
        return len(sub(add(p, mul(d, t)), c)) < r;
      }
      function updateBullets(dt) {
        for (const b of bullets) {
          const d = mul(b.v, dt);
          if (b.mine) {
            for (const e of enemies) {
              if (e.falling || e.gone) continue;
              if (segHit(b.p, d, e.pos, e.kind === 'bomber' ? 11 : 6.5)) {
                if (e.maxhp0 == null) e.maxhp0 = e.hp;
                e.hp -= b.dmg; b.life = 0;
                part(e.pos, [0, 0, 0], 0.12, 1.5, 'flash');
                api.audio.tone(1300, 0.03, { type: 'square', vol: 0.06 });
                if (e.mode === 'escort') e.mode = 'attack';
                if (e.hp <= 0) downEnemy(e);
                break;
              }
            }
            if (b.life > 0) for (const s of ships) {
              if (s.friendly || s.hp <= 0) continue;
              const [lx, lz] = shipLocal(s, b.p);
              if (Math.abs(lx) < s.model.B / 2 && Math.abs(lz) < s.model.L / 2 && b.p[1] < s.model.dh + 3) {
                b.life = 0; part(b.p, [0, 0, 0], 0.12, 1.5, 'flash');
                if (s.type === 'dd') { s.hp -= 0.012; if (s.hp <= 0) { s.hp = 0.0001; damageShip(s, 1); } }
              }
            }
          } else if (!P.dead && segHit(b.p, d, P.pos, 5)) { b.life = 0; hitPlayer(b.dmg); }
          b.p = add(b.p, d); b.life -= dt;
          if (b.p[1] < 0) b.life = 0;
        }
        bullets = bullets.filter(b => b.life > 0);
      }
      function updateParts(dt) {
        for (const q of parts) {
          q.life -= dt; q.p = add(q.p, mul(q.v, dt));
          if (q.kind === 'splash') q.v[1] -= 30 * dt;
          if (q.kind === 'smoke' || q.kind === 'black' || q.kind === 'flak') q.size += dt * 3;
        }
        parts = parts.filter(q => q.life > 0 && q.p[1] > -2);
      }
      function addSceneItems(withPlayer) {
        for (const s of ships) drawObj(s, '#555');
        for (const e of enemies) if (!e.gone) drawObj(e, '#222');
        if (withPlayer) drawObj(P, '#222');
        for (const q of parts) {
          const a = q.life / q.max;
          let col;
          if (q.kind === 'fire') col = 'rgba(255,' + (120 + a * 120 | 0) + ',40,' + (0.5 + a * 0.5).toFixed(2) + ')';
          else if (q.kind === 'flash') col = 'rgba(255,240,180,0.9)';
          else if (q.kind === 'black' || q.kind === 'flak') col = 'rgba(30,30,30,' + (a * 0.75).toFixed(2) + ')';
          else if (q.kind === 'splash') col = 'rgba(235,245,255,' + (a * 0.9).toFixed(2) + ')';
          else col = 'rgba(160,160,160,' + (a * 0.6).toFixed(2) + ')';
          pushPoint(q.p, q.size, col);
        }
        for (const b of bullets) pushLine(b.p, sub(b.p, mul(b.v, 0.025)), b.mine ? '#ffe080' : '#ff9060');
        for (const b of bombs) pushPoint(b.p, 0.8, '#202020');
      }

      // ---------- demo (attract) ----------
      function setupDemo() {
        const a = { pos: [0, 900, 0], yaw: 0, pitch: 0, roll: 0, speed: 140, vmax: 150, model: model('US0', () => makeFighter(PLANES.US[0], 'US')) };
        const b = { pos: [30, 940, 260], yaw: 0, pitch: 0, roll: 0, speed: 140, vmax: 146, model: model('JP0', () => makeFighter(PLANES.JP[0], 'JP')), wp: [0, 900, 2000] };
        const c = mkShip('cv', 'US', [400, 0, 1500], 0.4);
        demo = { a, b, c, t: 0 };
        frameOf(a); frameOf(b); shipFrame(c);
      }
      function updateDemo(dt) {
        const { a, b } = demo; demo.t += dt;
        if (len(sub(b.wp, b.pos)) < 300 || demo.t % 9 < dt) b.wp = add(a.pos, [rnd(-1500, 1500), rnd(-200, 300), rnd(-1500, 1500)]);
        b.wp[1] = clamp(b.wp[1], 500, 1600);
        steer(b, b.wp, 0.6, dt); moveAI(b, dt);
        steer(a, add(b.pos, mul(b.f, 60)), 0.7, dt); moveAI(a, dt);
        demo.c.pos = add(demo.c.pos, [Math.sin(0.4) * 9 * dt, 0, Math.cos(0.4) * 9 * dt]);
      }

      // ---------- main update ----------
      function tryStart() {
        if (api.useCredit()) {
          score = 0; lives = 3; missionIdx = 0; tour = 0; sel = 0;
          state = 'side'; api.audio.melody([[392, 0.08], [523, 0.08], [659, 0.15]], { type: 'square', vol: 0.12 });
        } else { coinFlash = 90; api.audio.tone(80, 0.25, { vol: 0.2 }); }
      }
      function update(dt) {
        if (coinFlash > 0) coinFlash--;
        for (const m of msgs) m.t -= dt;
        msgs = msgs.filter(m => m.t > 0);
        stateT += dt;
        if (state === 'title') {
          tTitle += dt; if (!demo) setupDemo(); updateDemo(dt);
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (state === 'side' || state === 'plane') {
          if (api.anyPressed('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown')) { sel = 1 - sel; api.audio.tone(700, 0.04, { vol: 0.1 }); }
          if (api.anyPressed('Enter', 'Space')) {
            api.audio.tone(1000, 0.08, { vol: 0.12 });
            if (state === 'side') { side = sel ? 'JP' : 'US'; sel = 0; state = 'plane'; }
            else { planeIdx = sel; state = 'brief'; stateT = 0; }
          }
          return;
        }
        if (state === 'brief') {
          if (stateT > 0.4 && api.anyPressed('Enter', 'Space', 'KeyX')) { setupMission(); state = 'fly'; stateT = 0; api.audio.melody([[262, 0.1], [330, 0.1], [392, 0.2]], { type: 'square', vol: 0.1 }); }
          return;
        }
        if (state === 'debrief') {
          if (stateT > 1 && api.anyPressed('Enter', 'Space', 'KeyX')) {
            if (!mission.failed) { missionIdx++; if (missionIdx % MISSIONS.length === 0) { tour++; score += 5000; } }
            state = 'brief'; stateT = 0;
          }
          return;
        }
        if (state === 'over') { if (stateT > 6 || (stateT > 1.5 && api.anyPressed('Enter', 'Space'))) { state = 'title'; demo = null; } return; }
        if (state === 'lost') { if (stateT > 3 && stateT < 900) { state = 'brief'; stateT = 0; } return; }
        if (state === 'deck') {
          updateShips(dt); updateParts(dt);
          if (stateT > 3.2) {
            if (mission.done) endMission();
            else { stateT = 0; relaunch(); }
          }
          return;
        }
        if (state !== 'fly') return;
        if (api.pressed('Enter') || api.pressed('KeyP')) {
          if (mission.done && !P.dead) { endMission(); return; }
          paused = !paused;
        }
        if (paused) return;
        mission.t += dt;
        updatePlayer(dt);
        if (state !== 'fly') return;
        for (const e of enemies) updateEnemy(e, dt);
        enemies = enemies.filter(e => !e.gone);
        updateShips(dt); updateBombs(dt); updateBullets(dt); updateParts(dt);
        if (api.frame % 14 === 0 && !P.dead) api.audio.tone(48 + P.throttle * 40, 0.2, { type: 'sawtooth', vol: 0.025 });
        if (!mission.done && !P.dead) {
          if (mission.def.type === 'intercept' && mission.carrierHits >= 2) { mission.failed = true; mission.done = true; msg('MISSION FAILED - CARRIER DAMAGED', '#ff4040', 4); }
          else if (objectiveLeft() === 0) { mission.done = true; msg('MISSION COMPLETE! LAND OR PRESS ENTER', '#80ff80', 5); api.audio.melody([[523, 0.1], [784, 0.2]], { type: 'square', vol: 0.12 }); }
        }
        if (mission.done && !P.dead) { mission.doneT += dt; if (mission.doneT > 70) endMission(); }
        if (mission.t > 600 && !mission.done) { mission.done = true; mission.failed = true; msg('OUT OF FUEL - MISSION ABORTED', '#ff4040', 4); }
      }

      // ---------- rendering ----------
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function setChaseCam(o, back, upk) {
        const cp = add(add(o.pos, mul(o.f, -back)), mul(o.u, upk));
        const f = norm(sub(add(o.pos, mul(o.f, 30)), cp));
        let r = cross(o.u, f); if (len(r) < 0.01) r = [1, 0, 0];
        r = norm(r); cam.p = cp; cam.f = f; cam.r = r; cam.u = cross(f, r);
      }
      function drawGauge(ctx, x, y, r, frac, label, col) {
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#777'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2; ctx.fillStyle = '#bbb'; ctx.fillRect(x + Math.cos(a) * (r - 2) - 0.5, y + Math.sin(a) * (r - 2) - 0.5, 1, 1); }
        const a = -Math.PI / 2 + frac * Math.PI * 2;
        ctx.strokeStyle = col || '#fff'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3)); ctx.stroke();
        const sp = label.split(' ');
        text(ctx, sp[0], x, y - 9, '#8a7a5a', 1, 'center');
        text(ctx, sp[1], x, y + r + 2, '#c8b890', 1, 'center');
      }
      function drawCockpit(ctx) {
        const t = PT(), Y0 = 184;
        // canopy frame
        ctx.fillStyle = '#23272a';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, 0); ctx.lineTo(56, Y0); ctx.lineTo(0, Y0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - 26, 0); ctx.lineTo(W - 56, Y0); ctx.lineTo(W, Y0); ctx.fill();
        ctx.fillRect(0, 0, W, 6);
        // panel
        ctx.fillStyle = '#3a3a34'; ctx.fillRect(0, Y0, W, H - Y0);
        ctx.fillStyle = '#4c4a42'; ctx.fillRect(0, Y0, W, 2);
        ctx.beginPath(); ctx.fillStyle = '#3a3a34'; ctx.moveTo(100, Y0); ctx.quadraticCurveTo(160, Y0 - 16, 220, Y0); ctx.fill();
        drawGauge(ctx, 26, 206, 15, Math.min(1, P.speed / 250), 'KTS ' + Math.round(P.speed * 1.94), '#fff');
        drawGauge(ctx, 66, 206, 15, (P.pos[1] % 1000) / 1000, 'ALT ' + Math.round(P.pos[1] * 3.28), '#fff');
        // artificial horizon
        const hx = 106, hy = 206, hr = 14;
        ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#4a78b0'; ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
        const bank = Math.atan2(-P.r[1], P.u[1]), pit = Math.asin(clamp(P.f[1], -1, 1));
        ctx.translate(hx, hy); ctx.rotate(-bank); ctx.fillStyle = '#7a5a30'; ctx.fillRect(-30, pit * 20, 60, 40);
        ctx.restore();
        ctx.fillStyle = '#ffd040'; ctx.fillRect(hx - 6, hy, 12, 1);
        // compass strip
        const hdg = (Math.atan2(P.f[0], P.f[2]) * 180 / Math.PI + 360) % 360;
        ctx.fillStyle = '#111'; ctx.fillRect(128, 190, 64, 11);
        ctx.save(); ctx.beginPath(); ctx.rect(128, 190, 64, 11); ctx.clip();
        for (let d = -60; d <= 60; d += 15) {
          const hh = Math.round((hdg + d) / 15) * 15, x = 160 + (hh - hdg) * 0.9;
          ctx.fillStyle = '#ccc'; ctx.fillRect(x, 190, 1, 3);
          const n = ((hh % 360) + 360) % 360;
          const lab = n % 45 === 0 ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][n / 45] : '';
          if (lab) text(ctx, lab, x, 194, '#ffe070', 1, 'center');
        }
        ctx.restore();
        ctx.fillStyle = '#ff4040'; ctx.fillRect(159, 189, 2, 3);
        // throttle
        ctx.fillStyle = '#111'; ctx.fillRect(200, 190, 6, 34);
        ctx.fillStyle = '#c0a040'; const th = P.approach ? 0.25 : P.throttle; ctx.fillRect(199, 222 - th * 30, 8, 3);
        text(ctx, 'THR', 203, 227, '#c8b890', 1, 'center');
        // stores
        text(ctx, 'AMMO ' + P.ammo, 132, 205, '#c8b890');
        text(ctx, 'BOMB ' + P.bombs, 132, 215, P.bombs ? '#ffe070' : '#776');
        // damage lights
        const lights = [['ENG', P.eng < 1 ? (P.eng <= 0 ? 2 : 1) : 0], ['FIRE', P.fire ? 2 : 0], ['CTRL', P.ctrl < 1 ? (P.ctrl < 0.5 ? 2 : 1) : 0], ['HULL', P.hull < 10 ? (P.hull < 4 ? 2 : 1) : 0]];
        lights.forEach(([n, lv], i) => {
          const x = 216 + (i % 2) * 26, y = 190 + (i >> 1) * 13;
          ctx.fillStyle = lv === 2 ? ((api.frame >> 3) & 1 ? '#ff2020' : '#801010') : lv === 1 ? '#d09020' : '#1c3a1c';
          ctx.fillRect(x, y, 24, 10); text(ctx, n, x + 12, y + 2, lv ? '#000' : '#5a8a5a', 1, 'center');
        });
        // rank/score plate
        text(ctx, 'SCORE', 270, 190, '#c8b890');
        text(ctx, String(score), 314, 200, '#ffffff', 1, 'right');
        text(ctx, 'PLANES ' + lives, 270, 214, '#c8b890');
        text(ctx, t.name.split(' ').pop(), 270, 224, '#776');
      }
      function drawGunsight(ctx) {
        ctx.strokeStyle = 'rgba(255,170,60,0.9)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(CX, CY, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,170,60,0.9)'; ctx.fillRect(CX - 1, CY - 1, 2, 2);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillRect(CX + dx * 24 - (dx ? 0 : 0.5) + (dx < 0 ? -5 : 0), CY + dy * 24 + (dy < 0 ? -5 : 0), dx ? 5 : 1, dy ? 5 : 1);
      }
      function drawTargetInfo(ctx) {
        let best = null, bd = 1e9;
        const strike = mission.def.type === 'strike';
        for (const e of enemies) { if (e.falling || e.escaped) continue; const d = len(sub(e.pos, P.pos)); if (d < bd) { bd = d; best = e; } }
        let bs = null, bsd = 1e9;
        for (const s of ships) { if (s.friendly || s.hp <= 0) continue; const d = len(sub(s.pos, P.pos)); if (d < bsd) { bsd = d; bs = s; } }
        if (strike && bs && (!best || bd > 1500)) { best = bs; bd = bsd; }
        if (mission.done && carrier) { best = carrier; bd = len(sub(carrier.pos, P.pos)); }
        if (!best) return;
        const c = toCam(best.pos);
        const col = best === carrier ? '#80ff80' : '#ff6060';
        if (c[2] > 1) {
          const s = proj(c);
          if (s[0] > 4 && s[0] < W - 4 && s[1] > 8 && s[1] < (view ? H - 4 : 180)) {
            ctx.strokeStyle = col; ctx.strokeRect(s[0] - 6, s[1] - 6, 12, 12);
            text(ctx, (bd / 1000).toFixed(1), s[0] + 8, s[1] - 3, col);
            return;
          }
        }
        const a = Math.atan2(-c[1], c[0]);
        const x = CX + Math.cos(a) * 62, y = CY + Math.sin(a) * 62;
        ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
        ctx.lineTo(x + Math.cos(a + 2.5) * 6, y + Math.sin(a + 2.5) * 6);
        ctx.lineTo(x + Math.cos(a - 2.5) * 6, y + Math.sin(a - 2.5) * 6); ctx.fill();
        text(ctx, (bd / 1000).toFixed(1), x, y + 8, col, 1, 'center');
      }
      function drawFlight(ctx) {
        CY = view ? 120 : 96;
        if (view === 0 && !P.dead && state === 'fly') { cam.p = add(P.pos, mul(P.u, 1.2)); cam.r = P.r; cam.u = P.u; cam.f = P.f; }
        else setChaseCam(P, P.dead ? 50 : 26, 7);
        drawWorld(ctx, () => addSceneItems(view !== 0 || P.dead || state !== 'fly'));
        if (state === 'fly' && !P.dead) {
          if (P.bombs > 0 && P.f[1] < -0.35) {
            const c = toCam(predictBomb());
            if (c[2] > 1) { const s = proj(c); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(s[0] - 4, s[1]); ctx.lineTo(s[0] + 4, s[1]); ctx.moveTo(s[0], s[1] - 4); ctx.lineTo(s[0], s[1] + 4); ctx.stroke(); }
          }
          if (view === 0) { drawGunsight(ctx); drawCockpit(ctx); }
          else {
            text(ctx, 'SPD ' + Math.round(P.speed * 1.94) + '  ALT ' + Math.round(P.pos[1] * 3.28) + '  AMMO ' + P.ammo + '  BOMB ' + P.bombs, 4, 228, '#fff');
            text(ctx, 'SCORE ' + score, 316, 228, '#fff', 1, 'right');
          }
          drawTargetInfo(ctx);
        }
        // top HUD
        const left = objectiveLeft();
        const lab = mission.def.type === 'sweep' ? 'BANDITS ' : mission.def.type === 'intercept' ? 'BOMBERS ' : 'SHIPS ';
        shadow(ctx, mission.done ? (mission.failed ? 'RETURN TO BASE' : 'RETURN TO CARRIER') : lab + left, 30, 10, mission.done ? '#80ff80' : '#ffffff');
        if (mission.def.type === 'intercept') shadow(ctx, 'CV HITS ' + mission.carrierHits + '/2', 290, 10, '#ffa040', 1, 'right');
        if (P.approach && state === 'fly') shadow(ctx, 'ON APPROACH - LINE UP, DESCEND TO DECK', 160, 140, '#80ff80', 1, 'center');
        msgs.forEach((m, i) => shadow(ctx, m.s, 160, 22 + i * 10, m.col, 1, 'center'));
        if (paused) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 100, W, 24); shadow(ctx, 'PAUSED', 160, 108, '#fff', 1, 'center'); }
        if (state === 'deck') { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 96, W, 30); shadow(ctx, mission.done ? 'TRAPPED ABOARD - MISSION OVER' : 'ON DECK: REARMING AND REPAIRING', 160, 106, '#80ff80', 1, 'center'); }
        if (state === 'lost' && stateT < 900) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 96, W, 34); shadow(ctx, 'PILOT RESCUED BY DESTROYER', 160, 102, '#ffffff', 1, 'center'); shadow(ctx, 'PLANES LEFT ' + lives, 160, 116, '#ffe070', 1, 'center'); }
      }
      function panel(ctx, title) {
        ctx.fillStyle = '#0e1c2c'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#16304a'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
        ctx.fillStyle = '#c8a050'; ctx.fillRect(10, 24, W - 20, 1); ctx.fillRect(10, H - 22, W - 20, 1);
        shadow(ctx, title, 160, 10, '#f2e6c0', 1, 'center');
      }
      function drawPlaneCard(ctx, x, y, t, s, on) {
        ctx.fillStyle = on ? '#24476a' : '#142636'; ctx.fillRect(x, y, 140, 132);
        ctx.strokeStyle = on ? '#ffd040' : '#3a5a7a'; ctx.strokeRect(x + 0.5, y + 0.5, 139, 131);
        // little 3D preview
        const o = { pos: [0, 0, 0], model: model(s + PLANES[s].indexOf(t), () => makeFighter(t, s)) };
        const fr = eulerFrame(api.time * 0.8 + x, -0.35, 0.15); o.f = fr.f; o.u = fr.u; o.r = fr.r;
        const savedCY = CY; CY = y + 46;
        cam.p = [0, 0, -15]; cam.r = [1, 0, 0]; cam.u = [0, 1, 0]; cam.f = [0, 0, 1];
        const ox = x + 70 - CX;
        drawObj(o); items.forEach(it => { if (it.pts) { it.pts = it.pts.map(p => [p[0] + ox, p[1]]); if (it.dec) it.dec.forEach(d => d.pts = d.pts.map(p => [p[0] + ox, p[1]])); } });
        flush(ctx); CY = savedCY;
        text(ctx, t.name, x + 70, y + 88, '#ffe070', 1, 'center');
        text(ctx, t.desc[0], x + 70, y + 100, '#c8d8e8', 1, 'center');
        text(ctx, t.desc[1], x + 70, y + 110, '#c8d8e8', 1, 'center');
        text(ctx, 'SPD ' + Math.round(t.vmax * 1.94) + ' TURN ' + Math.round(t.pitch * 50), x + 70, y + 120, '#90a0b0', 1, 'center');
      }
      function render(ctx) {
        ctx.save();
        if (state === 'title') {
          const { a, b, c } = demo || (setupDemo(), demo);
          frameOf(a); frameOf(b); shipFrame(c);
          setChaseCam(a, 22 + Math.sin(tTitle * 0.3) * 6, 5);
          CY = 120;
          drawWorld(ctx, () => { drawObj(a); drawObj(b); drawObj(c); });
          ctx.fillStyle = 'rgba(8,20,40,0.55)'; ctx.fillRect(0, 18, W, 58);
          shadow(ctx, 'ACES OF THE', 160, 24, '#f2e6c0', 2, 'center');
          shadow(ctx, 'PACIFIC', 160, 44, '#e8a020', 3, 'center');
          const page = Math.floor(tTitle / 6) % 3;
          ctx.fillStyle = 'rgba(8,20,40,0.6)'; ctx.fillRect(0, 150, W, 60);
          if (page === 0) {
            text(ctx, 'WWII NAVAL AIR COMBAT 1942-1945', 160, 156, '#c8d8e8', 1, 'center');
            text(ctx, 'FLY FOR EITHER NAVY - 8 MISSION TOUR', 160, 168, '#c8d8e8', 1, 'center');
            text(ctx, 'HIGH SCORE ' + hiScore, 160, 184, '#ffe070', 1, 'center');
          } else if (page === 1) {
            text(ctx, 'ARROWS: STICK  (UP = NOSE DOWN)', 160, 154, '#c8d8e8', 1, 'center');
            text(ctx, 'SPACE: GUNS   X: DROP BOMB', 160, 164, '#c8d8e8', 1, 'center');
            text(ctx, 'A/Z: THROTTLE  V: OUTSIDE VIEW', 160, 174, '#c8d8e8', 1, 'center');
            text(ctx, 'LAND: LINE UP BEHIND THE CARRIER', 160, 186, '#90a0b0', 1, 'center');
          } else {
            text(ctx, 'NOVICE 100  VETERAN 150  ACE 300', 160, 156, '#c8d8e8', 1, 'center');
            text(ctx, 'BOMBER 200  DESTROYER 600', 160, 166, '#c8d8e8', 1, 'center');
            text(ctx, 'CRUISER 1000  CARRIER 2000', 160, 176, '#c8d8e8', 1, 'center');
            text(ctx, 'NAMED ACES COUNT TRIPLE', 160, 188, '#ffe070', 1, 'center');
          }
          if (api.credits > 0) { if ((api.frame >> 5) & 1) shadow(ctx, 'PUSH START', 160, 214, '#ffffff', 1, 'center'); }
          else if (coinFlash > 0 ? (api.frame >> 2) & 1 : (api.frame >> 5) & 1) shadow(ctx, 'INSERT COIN', 160, 214, '#ff6040', 1, 'center');
          text(ctx, credStr(), 316, 230, '#90a0b0', 1, 'right');
          text(ctx, '\u00a9 1992 DYNAMIX', 4, 230, '#90a0b0');
        } else if (state === 'side') {
          panel(ctx, 'CHOOSE YOUR NAVY');
          for (let i = 0; i < 2; i++) {
            const x = 20 + i * 150, on = sel === i, s = i ? 'JP' : 'US';
            ctx.fillStyle = on ? '#24476a' : '#142636'; ctx.fillRect(x, 50, 130, 120);
            ctx.strokeStyle = on ? '#ffd040' : '#3a5a7a'; ctx.strokeRect(x + 0.5, 50.5, 129, 119);
            const cx = x + 65, cy = 92;
            if (s === 'US') {
              ctx.fillStyle = '#28408a'; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#eee'; ctx.beginPath();
              for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k & 1 ? 8 : 20; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
              ctx.fill();
            } else {
              ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.arc(cx, cy, 23, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#c82020'; ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.fill();
            }
            text(ctx, s === 'US' ? 'UNITED STATES' : 'IMPERIAL JAPAN', cx, 128, '#ffe070', 1, 'center');
            text(ctx, s === 'US' ? 'NAVY AIR GROUP' : 'NAVAL AIR GROUP', cx, 140, '#c8d8e8', 1, 'center');
          }
          text(ctx, 'LEFT/RIGHT TO CHOOSE, SPACE TO SELECT', 160, 190, '#c8d8e8', 1, 'center');
        } else if (state === 'plane') {
          panel(ctx, 'CHOOSE YOUR AIRCRAFT');
          const s = sel ? 1 : 0;
          drawPlaneCard(ctx, 14, 40, PLANES[side][0], side, s === 0);
          drawPlaneCard(ctx, 166, 40, PLANES[side][1], side, s === 1);
          text(ctx, 'LEFT/RIGHT TO CHOOSE, SPACE TO SELECT', 160, 196, '#c8d8e8', 1, 'center');
        } else if (state === 'brief') {
          const d = MISSIONS[missionIdx % MISSIONS.length];
          panel(ctx, 'MISSION ' + (missionIdx + 1) + (tour ? '  (TOUR ' + (tour + 1) + ')' : ''));
          shadow(ctx, d.name, 160, 36, '#ffe070', 2, 'center');
          d.brief.forEach((l, i) => text(ctx, l, 160, 66 + i * 12, '#c8d8e8', 1, 'center'));
          const opp = d.f.map(s => SK[Math.min(2, s + (tour > 1 ? 1 : 0))].name);
          text(ctx, 'OPPOSITION: ' + (d.bombers ? d.bombers + ' BOMBERS ' : '') + (d.ships ? d.ships.length + ' SHIPS ' : '') + (opp.length ? opp.length + ' FIGHTERS' : ''), 160, 118, '#ffa040', 1, 'center');
          if (opp.length) text(ctx, opp.join(' '), 160, 130, '#90a0b0', 1, 'center');
          text(ctx, 'PILOT: ' + RANKS[Math.min(RANKS.length - 1, Math.floor(score / 6000))], 160, 150, '#c8d8e8', 1, 'center');
          text(ctx, PT().name + '   PLANES ' + lives, 160, 162, '#c8d8e8', 1, 'center');
          text(ctx, 'SCORE ' + score, 160, 174, '#ffffff', 1, 'center');
          if ((api.frame >> 4) & 1) text(ctx, 'PRESS SPACE TO LAUNCH', 160, 200, '#ffffff', 1, 'center');
        } else if (state === 'debrief') {
          panel(ctx, 'MISSION DEBRIEFING');
          shadow(ctx, mission.failed ? 'MISSION FAILED' : 'MISSION ACCOMPLISHED', 160, 40, mission.failed ? '#ff6060' : '#80ff80', 2, 'center');
          const rows = [['AIRCRAFT DOWNED', mission.kills], ['SHIPS SUNK', mission.sunk], ['CARRIER LANDING', mission.landed ? 'YES +500' : 'NO'], ['MISSION BONUS', mission.bonus], ['MISSION POINTS', score - mission.pts0]];
          rows.forEach(([a, b], i) => { text(ctx, a, 50, 76 + i * 14, '#c8d8e8'); text(ctx, String(b), 270, 76 + i * 14, '#ffe070', 1, 'right'); });
          text(ctx, 'TOTAL SCORE ' + score, 160, 156, '#ffffff', 1, 'center');
          text(ctx, 'RANK: ' + RANKS[Math.min(RANKS.length - 1, Math.floor(score / 6000))], 160, 170, '#ffe070', 1, 'center');
          if (mission.failed) text(ctx, 'THE MISSION WILL BE FLOWN AGAIN', 160, 184, '#ffa040', 1, 'center');
          if (stateT > 1 && (api.frame >> 4) & 1) text(ctx, 'PRESS SPACE', 160, 204, '#ffffff', 1, 'center');
        } else if (state === 'over') {
          panel(ctx, 'END OF CAREER');
          shadow(ctx, 'GAME OVER', 160, 70, '#ff6060', 3, 'center');
          text(ctx, 'FINAL SCORE ' + score, 160, 120, '#ffffff', 1, 'center');
          text(ctx, 'FINAL RANK ' + RANKS[Math.min(RANKS.length - 1, Math.floor(score / 6000))], 160, 134, '#ffe070', 1, 'center');
          text(ctx, 'MISSIONS FLOWN ' + (missionIdx + 1), 160, 148, '#c8d8e8', 1, 'center');
          text(ctx, 'HIGH SCORE ' + hiScore, 160, 170, '#c8d8e8', 1, 'center');
        } else if (mission && P) {
          drawFlight(ctx);
        } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
        ctx.restore();
      }

      return {
        update, render, destroy() { },
        _bot: () => ({ state, P, enemies, ships, carrier, mission, score, lives, missionIdx, sel, predictBomb, objectiveLeft, view })
      };
    }
  });
})();
