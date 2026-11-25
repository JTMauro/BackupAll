// F-117A Stealth Fighter -- arcade-style, from-scratch night stealth strike game for the Game Room.
// Own flat-shaded polygon renderer (painter's sort), radar threat circles, signature (EMV) meter,
// laser-guided bombs with an IR target camera, SAMs, fighters, AWACS, landing and a debrief with ranks/medals.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '%': [24, 25, 2, 4, 8, 19, 3]
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
  function shadowText(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }

  // ---------- math ----------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const wrap360 = a => ((a % 360) + 360) % 360;
  const angDiff = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
  function nrm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; v[0] /= l; v[1] /= l; v[2] /= l; return v; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function rotPair(a, b, ang) { // a' = a cos + b sin ; b' = b cos - a sin
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < 3; i++) { const ai = a[i], bi = b[i]; a[i] = ai * c + bi * s; b[i] = bi * c - ai * s; }
  }
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ---------- 3D renderer: flat polygons, near-plane clip, painter's sort ----------
  const VIEW = { x: 0, y: 0, w: 320, h: 152, cx: 160, cy: 76, f: 180 };
  const CAM = { x: 0, y: 0, z: 0, r: [1, 0, 0], u: [0, 1, 0], f: [0, 0, 1] };
  const NEAR = 0.6;
  let SKY = [5, 7, 16], HAZE = [8, 11, 18], HAZE0 = 1500, HAZE1 = 22000, IR = false;
  const decalQ = [], polyQ = [];
  function setView(x, y, w, h, fov) {
    VIEW.x = x; VIEW.y = y; VIEW.w = w; VIEW.h = h; VIEW.cx = x + w / 2; VIEW.cy = y + h / 2;
    VIEW.f = (w / 2) / Math.tan(fov * D2R / 2);
  }
  function setCam(x, y, z, R, U, F) {
    CAM.x = x; CAM.y = y; CAM.z = z;
    for (let i = 0; i < 3; i++) { CAM.r[i] = R[i]; CAM.u[i] = U[i]; CAM.f[i] = F[i]; }
  }
  function lookAt(ex, ey, ez, tx, ty, tz) {
    const F = nrm([tx - ex, ty - ey, tz - ez]);
    let R = cross([0, 1, 0], F); if (Math.hypot(R[0], R[1], R[2]) < 1e-4) R = [1, 0, 0]; nrm(R);
    const U = cross(F, R);
    setCam(ex, ey, ez, R, U, F);
  }
  const csBuf = [], clBuf = [];
  function project(w, n) {
    let front = false;
    csBuf.length = 0;
    const cr = CAM.r, cu = CAM.u, cf = CAM.f;
    for (let i = 0; i < n; i++) {
      const dx = w[i * 3] - CAM.x, dy = w[i * 3 + 1] - CAM.y, dz = w[i * 3 + 2] - CAM.z;
      const z = dx * cf[0] + dy * cf[1] + dz * cf[2];
      csBuf.push(dx * cr[0] + dy * cr[1] + dz * cr[2], dx * cu[0] + dy * cu[1] + dz * cu[2], z);
      if (z > NEAR) front = true;
    }
    if (!front) return null;
    clBuf.length = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const az = csBuf[i * 3 + 2], bz = csBuf[j * 3 + 2];
      const ain = az >= NEAR, bin = bz >= NEAR;
      if (ain) clBuf.push(csBuf[i * 3], csBuf[i * 3 + 1], az);
      if (ain !== bin) {
        const t = (NEAR - az) / (bz - az);
        clBuf.push(csBuf[i * 3] + (csBuf[j * 3] - csBuf[i * 3]) * t, csBuf[i * 3 + 1] + (csBuf[j * 3 + 1] - csBuf[i * 3 + 1]) * t, NEAR);
      }
    }
    const m = clBuf.length / 3; if (m < 3) return null;
    const s = new Array(m * 2);
    let zs = 0, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let i = 0; i < m; i++) {
      const z = clBuf[i * 3 + 2];
      const sx = VIEW.cx + clBuf[i * 3] / z * VIEW.f, sy = VIEW.cy - clBuf[i * 3 + 1] / z * VIEW.f;
      s[i * 2] = sx; s[i * 2 + 1] = sy; zs += z;
      if (sx < minx) minx = sx; if (sx > maxx) maxx = sx; if (sy < miny) miny = sy; if (sy > maxy) maxy = sy;
    }
    if (maxx < VIEW.x || minx > VIEW.x + VIEW.w || maxy < VIEW.y || miny > VIEW.y + VIEW.h) return null;
    return { s, z: zs / m };
  }
  function colStr(c, z) {
    if (IR) {
      const l = Math.min(255, (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) * 1.7 + 8) * (1 - clamp(z / 40000, 0, 0.5));
      return 'rgb(' + ((l * 0.55) | 0) + ',' + (l | 0) + ',' + ((l * 0.62) | 0) + ')';
    }
    const t = clamp((z - HAZE0) / (HAZE1 - HAZE0), 0, 0.92);
    return 'rgb(' + ((c[0] + (HAZE[0] - c[0]) * t) | 0) + ',' + ((c[1] + (HAZE[1] - c[1]) * t) | 0) + ',' + ((c[2] + (HAZE[2] - c[2]) * t) | 0) + ')';
  }
  function addPoly(w, n, c, decal, bias) {
    const p = project(w, n); if (!p) return;
    p.c = colStr(c, p.z);
    if (decal) decalQ.push(p); else { p.z += bias || 0; p.e = true; polyQ.push(p); }
  }
  function addLine(x1, y1, z1, x2, y2, z2, c) {
    const p = project([x1, y1, z1, x2, y2, z2, x2, y2, z2], 3); if (!p) return;
    p.c = colStr(c, p.z); p.l = true; polyQ.push(p);
  }
  function beginScene(ctx) {
    decalQ.length = 0; polyQ.length = 0;
    ctx.fillStyle = IR ? '#031a0a' : 'rgb(' + SKY.join(',') + ')'; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
  }
  function drawP(ctx, p) {
    const s = p.s;
    ctx.beginPath(); ctx.moveTo(s[0], s[1]);
    for (let i = 2; i < s.length; i += 2) ctx.lineTo(s[i], s[i + 1]);
    if (p.l) { ctx.strokeStyle = p.c; ctx.lineWidth = 1; ctx.stroke(); return; }
    ctx.closePath(); ctx.fillStyle = p.c; ctx.fill();
    if (p.e) { ctx.strokeStyle = p.c; ctx.lineWidth = 0.6; ctx.stroke(); }
  }
  function flush(ctx) {
    ctx.save(); ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); ctx.clip();
    for (const p of decalQ) drawP(ctx, p);
    polyQ.sort((a, b) => b.z - a.z);
    for (const p of polyQ) drawP(ctx, p);
    ctx.restore();
  }
  function projPoint(x, y, z) {
    const dx = x - CAM.x, dy = y - CAM.y, dz = z - CAM.z;
    const cz = dx * CAM.f[0] + dy * CAM.f[1] + dz * CAM.f[2];
    if (cz < NEAR) return null;
    return { x: VIEW.cx + (dx * CAM.r[0] + dy * CAM.r[1] + dz * CAM.r[2]) / cz * VIEW.f, y: VIEW.cy - (dx * CAM.u[0] + dy * CAM.u[1] + dz * CAM.u[2]) / cz * VIEW.f, z: cz };
  }

  // ---------- world building ----------
  const LIGHT = nrm([0.45, 0.7, 0.3]);
  function shade(c, nx, ny, nz) {
    const k = 0.55 + 0.5 * Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
  }
  function mkObj() { return { faces: [], lines: [], b: [1e9, 1e9, 1e9, -1e9, -1e9, -1e9] }; }
  function addFace(o, v, c, inside) {
    const ax = v[3] - v[0], ay = v[4] - v[1], az = v[5] - v[2], bx = v[6] - v[0], by = v[7] - v[1], bz = v[8] - v[2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (inside) { if (nx * (v[0] - inside[0]) + ny * (v[1] - inside[1]) + nz * (v[2] - inside[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; } }
    else if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    o.faces.push({ v, n: v.length / 3, nx, ny, nz, c: shade(c, nx, ny, nz), cull: !!inside });
    for (let i = 0; i < v.length; i += 3) {
      for (let k = 0; k < 3; k++) { if (v[i + k] < o.b[k]) o.b[k] = v[i + k]; if (v[i + k] > o.b[k + 3]) o.b[k + 3] = v[i + k]; }
    }
  }
  function addBox(o, x0, y0, z0, x1, y1, z1, c, top) {
    const ins = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    addFace(o, [x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0], c, ins);
    addFace(o, [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], c, ins);
    addFace(o, [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0], c, ins);
    addFace(o, [x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0], c, ins);
    addFace(o, [x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1], top || c, ins);
  }
  function finObj(o) {
    const b = o.b;
    o.x = (b[0] + b[3]) / 2; o.y = (b[1] + b[4]) / 2; o.z = (b[2] + b[5]) / 2;
    o.r = Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2;
    return o;
  }


  function frustum(o, cx, cz, r0, r1, y0, y1, n, c, top) {
    const ins = [cx, (y0 + y1) / 2, cz];
    const p = i => { const a = i / n * Math.PI * 2 + 0.3; return [Math.cos(a), Math.sin(a)]; };
    for (let i = 0; i < n; i++) {
      const [a0, b0] = p(i), [a1, b1] = p(i + 1);
      addFace(o, [cx + a0 * r0, y0, cz + b0 * r0, cx + a1 * r0, y0, cz + b1 * r0, cx + a1 * r1, y1, cz + b1 * r1, cx + a0 * r1, y1, cz + b0 * r1], c, ins);
    }
    if (r1 > 0.5) { const v = []; for (let i = n - 1; i >= 0; i--) { const [a, b] = p(i); v.push(cx + a * r1, y1, cz + b * r1); } addFace(o, v, top || c, ins); }
  }

  // ---------- theater ----------
  const BASE = { x: 0, z: -12000, len: 3000, wid: 50 };
  const MOUNT = [
    [-18000, 2000, 4000, 1500], [15000, 4000, 3500, 1300], [-20000, 20000, 5000, 2200], [22000, 14000, 4000, 1800],
    [-2000, 18500, 2500, 1100], [10000, 36000, 4000, 1600], [-14000, 38000, 4500, 2000], [25000, 30000, 4000, 1500],
    [-28000, 30000, 5000, 2400], [6000, -2000, 2500, 900], [-8000, -4000, 2500, 800], [30000, -5000, 5000, 1700],
    [-30000, -6000, 5000, 1800], [-26000, 10000, 4000, 1400], [30000, 20000, 4500, 1900], [4000, 42000, 6000, 2500]
  ];
  const RIVER = [[-34000, 7000], [-15000, 8500], [-6000, 9000], [5000, 10500], [34000, 9500]];
  const CITIES = [[-2000, 12500, 1500], [6000, 21000, 1800], [-9000, 27000, 1600], [14000, 9000, 1200]];
  function groundH(x, z) {
    let h = 0;
    for (const m of MOUNT) {
      const d = Math.hypot(x - m[0], z - m[1]);
      if (d < m[2] * 0.95) h = Math.max(h, m[3] * (1 - d / (m[2] * 0.95)));
    }
    return h;
  }
  let TERR = null;
  function buildTerrain() {
    const r = rng(1991);
    const decals = [], objs = [], lights = [];
    function decal(v, c, near) {
      let x = 0, z = 0, rr = 0; const n = v.length / 3;
      for (let i = 0; i < n; i++) { x += v[i * 3]; z += v[i * 3 + 2]; }
      x /= n; z /= n;
      for (let i = 0; i < n; i++) rr = Math.max(rr, Math.hypot(v[i * 3] - x, v[i * 3 + 2] - z));
      decals.push({ v, n, c, x, z, r: rr, near: near || 0 });
    }
    function rectD(cx, cz, dx, dz, a0, a1, c0, c1, c, near) {
      const rx = dz, rz = -dx;
      decal([cx + dx * a0 + rx * c0, 0, cz + dz * a0 + rz * c0, cx + dx * a1 + rx * c0, 0, cz + dz * a1 + rz * c0,
        cx + dx * a1 + rx * c1, 0, cz + dz * a1 + rz * c1, cx + dx * a0 + rx * c1, 0, cz + dz * a0 + rz * c1], c, near);
    }
    function strip(pts, hw, c) {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const l = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / l, dz = (z1 - z0) / l;
        rectD(x0, z0, dx, dz, -hw, l + hw, -hw, hw, c);
      }
    }
    for (let i = 0; i < 70; i++) {
      const x = (r() - 0.5) * 64000, z = -20000 + r() * 64000, w = 600 + r() * 2000, d = 600 + r() * 2000;
      const c = [[20, 34, 24], [26, 38, 26], [18, 28, 22], [30, 36, 28]][(r() * 4) | 0];
      decal([x, 0, z, x + w, 0, z, x + w, 0, z + d, x, 0, z + d], c);
    }
    strip(RIVER, 70, [14, 26, 52]);
    strip([[0, -10400], [0, 2000], [-6000, 8700], [-6000, 9400], [-2000, 12500], [6000, 21000], [-4000, 32000]], 8, [36, 36, 40]);
    strip([[-30000, 15000], [-9000, 27000], [6000, 21000], [16000, 28000], [30000, 26000]], 8, [36, 36, 40]);
    // home base
    rectD(BASE.x, BASE.z, 0, 1, -BASE.len / 2, BASE.len / 2, -BASE.wid / 2, BASE.wid / 2, [40, 40, 46]);
    rectD(BASE.x, BASE.z, 0, 1, -400, 400, BASE.wid / 2 + 80, BASE.wid / 2 + 260, [34, 34, 38]);
    for (let s = -BASE.len / 2 + 60; s < BASE.len / 2 - 60; s += 80) rectD(BASE.x, BASE.z, 0, 1, s, s + 40, -0.8, 0.8, [150, 150, 150], 1);
    for (let s = -BASE.len / 2; s <= BASE.len / 2; s += 150) {
      lights.push([BASE.x - BASE.wid / 2 - 2, 0.5, BASE.z + s, '#ffffff'], [BASE.x + BASE.wid / 2 + 2, 0.5, BASE.z + s, '#ffffff']);
    }
    for (let k = 1; k <= 10; k++) { lights.push([BASE.x, 0.5, BASE.z - BASE.len / 2 - k * 60, '#ffe080'], [BASE.x, 0.5, BASE.z + BASE.len / 2 + k * 60, '#ffe080']); }
    for (let k = -4; k <= 4; k++) { lights.push([BASE.x + k * 6, 0.5, BASE.z - BASE.len / 2, '#40ff60'], [BASE.x + k * 6, 0.5, BASE.z + BASE.len / 2, '#40ff60']); }
    const hb = mkObj();
    for (let k = 0; k < 4; k++) addBox(hb, BASE.wid / 2 + 300, 0, BASE.z - 300 + k * 160, BASE.wid / 2 + 360, 18, BASE.z - 220 + k * 160, [52, 56, 60], [40, 42, 46]);
    addBox(hb, BASE.wid / 2 + 120, 0, BASE.z + 500, BASE.wid / 2 + 130, 30, BASE.z + 510, [70, 70, 72]);
    addBox(hb, BASE.wid / 2 + 116, 30, BASE.z + 496, BASE.wid / 2 + 134, 36, BASE.z + 514, [60, 110, 90], [40, 40, 40]);
    lights.push([BASE.wid / 2 + 125, 37, BASE.z + 505, '#ff3030']);
    objs.push(finObj(hb));
    for (const m of MOUNT) {
      const [mx, mz, mr, mh] = m, n = 8, o = mkObj(), ins = [mx, mh * 0.25, mz], cut = 0.55;
      const pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + mz * 0.0007; const rr = mr * (0.85 + 0.15 * Math.sin(i * 2.3 + mx)); pts.push([mx + Math.cos(a) * rr, mz + Math.sin(a) * rr]); }
      for (let i = 0; i < n; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % n];
        const m0 = [mx + (p0[0] - mx) * (1 - cut), mz + (p0[1] - mz) * (1 - cut)], m1 = [mx + (p1[0] - mx) * (1 - cut), mz + (p1[1] - mz) * (1 - cut)];
        addFace(o, [p0[0], 0, p0[1], p1[0], 0, p1[1], m1[0], mh * cut, m1[1], m0[0], mh * cut, m0[1]], i % 2 ? [30, 42, 34] : [36, 46, 38], ins);
        addFace(o, [m0[0], mh * cut, m0[1], m1[0], mh * cut, m1[1], mx, mh, mz], mh > 1600 ? [70, 76, 86] : [44, 48, 46], ins);
      }
      objs.push(finObj(o));
    }
    for (const [cx, cz, cr] of CITIES) {
      const o = mkObj();
      for (let i = 0; i < 26; i++) {
        const x = cx + (r() - 0.5) * cr * 1.6, z = cz + (r() - 0.5) * cr * 1.6, w = 30 + r() * 50, h = 10 + r() * 50;
        addBox(o, x - w / 2, 0, z - w / 2, x + w / 2, h, z + w / 2, [40, 40, 44], [30, 30, 34]);
      }
      objs.push(finObj(o));
      for (let i = 0; i < 70; i++) lights.push([cx + (r() - 0.5) * cr * 2, 1, cz + (r() - 0.5) * cr * 2, r() < 0.8 ? '#ffd070' : '#ffffff']);
    }
    TERR = { decals, objs, lights };
  }

  // ---------- models (body coords: x right, y up, z forward) ----------
  function mkModel(list) { return list.map(([v, c]) => [v, c]); }
  const M_F117 = mkModel([
    [[0, 0, 9, -1.1, 0.75, 3, 1.1, 0.75, 3], [40, 42, 48]],
    [[0, 0, 9, -1.1, 0.75, 3, -3.2, 0.1, 1.2], [30, 32, 38]],
    [[0, 0, 9, 1.1, 0.75, 3, 3.2, 0.1, 1.2], [34, 36, 42]],
    [[-1.1, 0.75, 3, 1.1, 0.75, 3, 0.9, 0.9, -1, -0.9, 0.9, -1], [26, 30, 40]],
    [[-1.1, 0.75, 3, -0.9, 0.9, -1, -6.7, 0, -3.6, -3.2, 0.1, 1.2], [38, 40, 46]],
    [[1.1, 0.75, 3, 0.9, 0.9, -1, 6.7, 0, -3.6, 3.2, 0.1, 1.2], [42, 44, 50]],
    [[-0.9, 0.9, -1, 0.9, 0.9, -1, 1.6, 0.4, -4.6, 0, 0.3, -5.4, -1.6, 0.4, -4.6], [32, 34, 40]],
    [[-0.9, 0.9, -1, -1.6, 0.4, -4.6, -3.2, 0, -4.4, -6.7, 0, -3.6], [28, 30, 36]],
    [[0.9, 0.9, -1, 1.6, 0.4, -4.6, 3.2, 0, -4.4, 6.7, 0, -3.6], [30, 32, 38]],
    [[0, 0, 9, 6.7, 0, -3.6, 3.2, 0, -4.4, 0, 0, -5.4, -3.2, 0, -4.4, -6.7, 0, -3.6], [20, 20, 24]],
    [[-1.2, 0.5, -2.6, -2.9, 2.6, -5.0, -3.3, 2.6, -6.0, -1.5, 0.4, -4.6], [44, 46, 54]],
    [[1.2, 0.5, -2.6, 2.9, 2.6, -5.0, 3.3, 2.6, -6.0, 1.5, 0.4, -4.6], [44, 46, 54]],
    [[-0.5, 0.82, 2.7, 0.5, 0.82, 2.7, 0.35, 0.9, 1.4, -0.35, 0.9, 1.4], [60, 70, 90]]
  ]);
  const M_MIG = mkModel([
    [[0, 0, 8, -0.9, 0.6, 3, 0.9, 0.6, 3], [90, 96, 104]],
    [[0, 0, 8, -0.9, -0.5, 3, 0.9, -0.5, 3], [70, 74, 80]],
    [[-0.9, 0.6, 3, 0.9, 0.6, 3, 0.9, 0.6, -6, -0.9, 0.6, -6], [100, 106, 114]],
    [[-0.9, -0.5, 3, 0.9, -0.5, 3, 0.9, -0.5, -6, -0.9, -0.5, -6], [60, 62, 66]],
    [[-0.9, 0.2, 2, -6, 0.1, -3.5, -6, 0.1, -4.5, -0.9, 0.2, -4.5], [96, 100, 108]],
    [[0.9, 0.2, 2, 6, 0.1, -3.5, 6, 0.1, -4.5, 0.9, 0.2, -4.5], [96, 100, 108]],
    [[-0.6, 0.6, -3, -1.3, 3.2, -5.4, -1.3, 3.2, -6.3, -0.6, 0.6, -6], [110, 110, 120]],
    [[0.6, 0.6, -3, 1.3, 3.2, -5.4, 1.3, 3.2, -6.3, 0.6, 0.6, -6], [110, 110, 120]],
    [[-0.9, 0.2, -4.5, -3.2, 0.1, -6.2, -0.9, 0.2, -6.2], [90, 96, 104]],
    [[0.9, 0.2, -4.5, 3.2, 0.1, -6.2, 0.9, 0.2, -6.2], [90, 96, 104]]
  ]);
  const M_AWACS = mkModel([
    [[-2, -2, 22, 2, -2, 22, 2, 2, 22, -2, 2, 22], [120, 120, 126]],
    [[-2, 2, 22, 2, 2, 22, 2, 2, -22, -2, 2, -22], [140, 140, 146]],
    [[-2, -2, 22, 2, -2, 22, 2, -2, -22, -2, -2, -22], [90, 90, 96]],
    [[-2, -2, 22, -2, 2, 22, -2, 2, -22, -2, -2, -22], [110, 110, 116]],
    [[2, -2, 22, 2, 2, 22, 2, 2, -22, 2, -2, -22], [110, 110, 116]],
    [[-2, 0, 6, -22, -1, -6, -22, -1, -10, -2, 0, -4], [126, 126, 132]],
    [[2, 0, 6, 22, -1, -6, 22, -1, -10, 2, 0, -4], [126, 126, 132]],
    [[0, 2, -14, 0, 9, -21, 0, 9, -24, 0, 2, -22], [120, 120, 126]],
    [[-8, 4, -18, 8, 4, -18, 8, 4, -23, -8, 4, -23], [120, 120, 126]],
    [[-5, 5.2, -2, 5, 5.2, -2, 5, 5.2, -9, -5, 5.2, -9], [70, 70, 90]],
    [[-0.5, 2, -4, 0.5, 2, -4, 0.5, 5.2, -6, -0.5, 5.2, -6], [90, 90, 96]]
  ]);

  // ---------- missions ----------
  const MISSIONS = [
    { name: 'OPERATION FIRST LIGHT', pri: ['radar', 8000, 6000, 'EARLY WARNING RADAR'], sec: ['bridge', -6000, 9000, 'RIVER BRIDGE'],
      sams: [[5000, 9000], [-3000, 5000]], radars: [[0, 14500]], bases: [], awacs: false, cap: 0,
      text: ['KNOCK OUT THE EARLY WARNING', 'RADAR THAT GUARDS THE BORDER.', 'THEN DROP THE RIVER BRIDGE.'] },
    { name: 'OPERATION BLACK RAIN', pri: ['chem', -10000, 16000, 'CHEMICAL PLANT'], sec: ['hangars', 12000, 18300, 'AIRBASE HANGARS'],
      sams: [[-8000, 13000], [-12500, 18500], [9000, 15000], [3000, 10000]], radars: [[0, 14500], [-4000, 22500]], bases: [[12000, 18000, 2]], awacs: false, cap: 0,
      text: ['DESTROY THE CHEMICAL PLANT', 'IN THE WESTERN VALLEY. HIT THE', 'FIGHTER HANGARS IF YOU CAN.'] },
    { name: 'OPERATION DEEP SHADOW', pri: ['bunker', 2000, 24000, 'COMMAND BUNKER'], sec: ['power', -14000, 22500, 'POWER PLANT'],
      sams: [[0, 21000], [4500, 26000], [-12000, 19500], [-16000, 25000], [-5000, 15000], [7000, 12000]], radars: [[0, 14500], [-4000, 22500]],
      bases: [[12000, 18000, 3]], awacs: true, cap: 0,
      text: ['AN AWACS IS ON STATION. STAY', 'LOW AND SLOW. THE BUNKER NEEDS', 'A DIRECT HIT FROM A GBU-27.'] },
    { name: 'OPERATION LONG KNIFE', pri: ['factory', 16000, 28000, 'MISSILE FACTORY'], sec: ['bridge', -6000, 9000, 'RIVER BRIDGE'],
      sams: [[13000, 26000], [18500, 30500], [15000, 23000], [-4000, 11500], [-8000, 7000], [6000, 16000], [10000, 22000], [2000, 9000]],
      radars: [[0, 14500], [12000, 24000], [-4000, 22500]], bases: [[12000, 18000, 3], [-12000, 30000, 2]], awacs: true, cap: 2,
      text: ['THE MISSILE FACTORY IS DEEP IN', 'ENEMY TERRITORY. FIGHTERS ARE', 'ALREADY ON PATROL.'] },
    { name: 'OPERATION LAST CALL', pri: ['hq', -4000, 32000, 'HEADQUARTERS'], sec: ['comms', 8000, 30000, 'COMMS TOWER'],
      sams: [[-2000, 29000], [-6500, 34000], [-1000, 35000], [6000, 27500], [10500, 31500], [-4000, 24000], [3000, 18000], [-8000, 14000], [8000, 12000], [0, 7000]],
      radars: [[0, 14500], [12000, 24000], [-4000, 22500]], bases: [[12000, 18000, 3], [-12000, 30000, 3]], awacs: true, cap: 2,
      text: ['THE ENEMY HEADQUARTERS. HEAVIEST', 'DEFENSES OF THE WAR. BRING', 'EVERYONE HOME.'] }
  ];
  const TNAME = { sam: 'SAM SITE', radar: 'RADAR', airbase: 'AIRBASE' };
  function buildSiteModel(t, x, z) {
    const o = mkObj();
    const OL = [52, 62, 44], GY = [70, 72, 76], HOT = [120, 110, 90];
    if (t === 'sam') {
      addBox(o, x - 4, 0, z - 6, x + 4, 2, z + 6, OL);
      addBox(o, x - 3, 2, z - 4, x - 1, 4, z + 5, GY, [110, 110, 110]); addBox(o, x + 1, 2, z - 4, x + 3, 4, z + 5, GY, [110, 110, 110]);
      addBox(o, x + 10, 0, z - 3, x + 15, 4, z + 3, OL); addBox(o, x + 11, 4, z - 1, x + 14, 7, z + 1, GY);
    } else if (t === 'radar') {
      addBox(o, x - 3, 0, z - 3, x + 3, 28, z + 3, GY);
      addBox(o, x - 9, 28, z - 1, x + 9, 36, z + 1, [90, 96, 104]);
      addBox(o, x - 12, 0, z + 8, x + 4, 6, z + 20, OL, [40, 46, 36]);
    } else if (t === 'bridge') {
      addBox(o, x - 10, 10, z - 150, x + 10, 14, z + 150, [70, 66, 60], [56, 56, 56]);
      for (const zz of [-60, 0, 60]) addBox(o, x - 6, 0, z + zz - 3, x + 6, 10, z + zz + 3, [60, 58, 54]);
    } else if (t === 'chem') {
      for (const [dx, dz] of [[-30, -30], [0, -30], [30, -30], [-30, 10], [0, 10]]) frustum(o, x + dx, z + dz, 11, 11, 0, 18, 7, HOT, [140, 130, 110]);
      addBox(o, x + 20, 0, z, x + 70, 14, z + 50, GY); frustum(o, x + 60, z + 45, 3, 2.5, 14, 50, 6, [90, 80, 70]);
    } else if (t === 'hangars') {
      for (let k = 0; k < 3; k++) addBox(o, x - 120 + k * 80, 0, z - 30, x - 70 + k * 80, 16, z + 30, HOT, [80, 80, 80]);
    } else if (t === 'bunker') {
      addFace(o, [x - 50, 0, z - 40, x + 50, 0, z - 40, x + 30, 12, z - 20, x - 30, 12, z - 20], [80, 80, 76], [x, 4, z]);
      addFace(o, [x - 50, 0, z + 40, x + 50, 0, z + 40, x + 30, 12, z + 20, x - 30, 12, z + 20], [80, 80, 76], [x, 4, z]);
      addFace(o, [x - 50, 0, z - 40, x - 50, 0, z + 40, x - 30, 12, z + 20, x - 30, 12, z - 20], [76, 76, 72], [x, 4, z]);
      addFace(o, [x + 50, 0, z - 40, x + 50, 0, z + 40, x + 30, 12, z + 20, x + 30, 12, z - 20], [76, 76, 72], [x, 4, z]);
      addFace(o, [x - 30, 12, z - 20, x + 30, 12, z - 20, x + 30, 12, z + 20, x - 30, 12, z + 20], HOT, [x, 4, z]);
      addBox(o, x + 20, 12, z, x + 22, 40, z + 2, GY);
    } else if (t === 'power') {
      addBox(o, x - 40, 0, z - 25, x + 40, 25, z + 25, GY, [60, 60, 64]);
      frustum(o, x - 25, z, 4, 3, 25, 90, 6, HOT); frustum(o, x + 25, z, 4, 3, 25, 90, 6, HOT);
      frustum(o, x + 90, z + 20, 30, 18, 0, 60, 8, [96, 96, 100]);
    } else if (t === 'factory') {
      for (let k = 0; k < 4; k++) addBox(o, x - 80, 0, z - 60 + k * 30, x + 80, 14 + (k % 2) * 4, z - 34 + k * 30, k % 2 ? GY : HOT, [70, 70, 74]);
      frustum(o, x + 90, z, 4, 3, 0, 70, 6, [90, 80, 70]);
    } else if (t === 'hq') {
      addBox(o, x - 40, 0, z - 40, x + 40, 50, z + 40, HOT, [90, 90, 90]);
      addBox(o, x - 100, 0, z - 20, x - 40, 24, z + 20, GY); addBox(o, x + 40, 0, z - 20, x + 100, 24, z + 20, GY);
      addBox(o, x - 2, 50, z - 2, x + 2, 80, z + 2, GY);
    } else if (t === 'comms') {
      addBox(o, x - 3, 0, z - 3, x + 3, 160, z + 3, [110, 60, 50]);
      addBox(o, x + 10, 0, z + 10, x + 40, 10, z + 40, HOT);
    } else if (t === 'airbase') {
      for (let k = 0; k < 3; k++) addBox(o, x - 120 + k * 80, 0, z - 30, x - 70 + k * 80, 16, z + 30, [70, 72, 70], [60, 60, 60]);
      addBox(o, x + 160, 0, z + 60, x + 170, 30, z + 70, GY);
    }
    return finObj(o);
  }
  const HEIGHT = { radar: 36, comms: 160, power: 90, hq: 80, factory: 70, chem: 50, bunker: 40, bridge: 14 };
  const RANKS = ['2ND LIEUTENANT', '1ST LIEUTENANT', 'CAPTAIN', 'MAJOR', 'LT COLONEL', 'COLONEL', 'BRIGADIER GENERAL'];
  const MEDALS = [
    [5200, 'MEDAL OF HONOR', ['#2a6ad8', '#fff', '#2a6ad8']], [4200, 'SILVER STAR', ['#2050a0', '#fff', '#c02020', '#fff', '#2050a0']],
    [3200, 'DISTINGUISHED FLYING CROSS', ['#2050a0', '#c02020', '#fff', '#c02020', '#2050a0']], [2400, 'AIR MEDAL', ['#2050a0', '#f0b020', '#2050a0']]
  ];

  ArcadeRegistry.register({
    id: 'f117a', title: 'F-117A Stealth Fighter', year: 1991, maker: 'MicroProse (home original; arcade-style version)',
    width: 320, height: 240, vector: false, pointer: false,
    controls: 'Arrows: fly (Down = pull up) \u00b7 Space: fire \u00b7 X tap: weapon \u00b7 X+Up/Down: throttle \u00b7 X+Space: decoys \u00b7 A/S: throttle \u00b7 Z: chaff \u00b7 C: flare \u00b7 B: bay \u00b7 G: gear \u00b7 T: target \u00b7 M: map \u00b7 V: view \u00b7 Enter: menu',
    marquee: { bg: '#05070e', fg: '#c8d0dc', accent: '#40ff70' },
    create(api) {
      if (!TERR) buildTerrain();
      const W = 320, H = 240, VH = 166, G = 9.81;
      let state = 'title', tick = 0, stT = 0, coinFlash = 0, msg = '', msgT = 0, msgC = '#40ff70';
      let lives = 3, score = 0, total = 0, mIdx = 0, cyc = 0, hi = api.getHiScore(10000);
      let view = 0, mapOn = false, pauseSel = 0;
      let M = null, sites = [], fighters = [], missiles = [], decoys = [], bombs = [], parts = [], awacs = null;
      let alert = 0, alerted = false, lastKnown = null, detT = 0, detected = false, launchWarn = 0, missionT = 0;
      let deb = null, down = null, tgtSel = 0;
      const PL = {};
      const stars = []; { const r = rng(7); for (let i = 0; i < 110; i++) { const a = r() * Math.PI * 2, e = 0.03 + Math.pow(r(), 0.7) * 1.4; stars.push([Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e), r() < 0.2 ? 2 : 1]); } }

      function resetPlayer() {
        Object.assign(PL, {
          x: BASE.x, y: 450, z: BASE.z + 2500, R: [1, 0, 0], U: [0, 1, 0], F: [0, 0, 1], spd: 190, thr: 0.55, elev: 0, ail: 0,
          gear: 0, gearPos: 0, bay: 0, bayPos: 0, bayT: 0, hp: 2, fuel: 100, wpn: 0, gbu: 2, aim: 2, chaff: 20, flares: 20,
          onGround: false, sig: 0.3, q: 0, xT: 0, xUsed: false, xPrev: false, relQ: 0, lock: null, autoGear: false
        });
      }
      function buildMission() {
        const md = MISSIONS[mIdx];
        M = { md, pri: null, sec: null, kills: 0, airKills: 0, awacsKill: false, other: 0, landed: false, landBonus: 0 };
        sites = []; fighters = []; missiles = []; decoys = []; bombs = []; parts = [];
        alert = 0; alerted = false; lastKnown = null; detT = 0; missionT = 0; launchWarn = 0; tgtSel = 0;
        const boost = 1 + cyc * 0.15;
        const mk = (t, x, z, extra) => { const s = Object.assign({ t, x, z, alive: true, lock: 0, reload: 4 + Math.random() * 4, model: buildSiteModel(t, x, z), name: TNAME[t] || t.toUpperCase() }, extra || {}); sites.push(s); return s; };
        for (const [x, z] of md.sams) mk('sam', x, z, { R0: 9000 * boost, mr: 10000 });
        for (const [x, z] of md.radars) mk('radar', x, z, { R0: 20000 * boost });
        for (const [x, z, n] of md.bases) mk('airbase', x, z, { n: n + cyc, launchT: 0 });
        M.pri = mk(md.pri[0], md.pri[1], md.pri[2], { name: md.pri[3], target: 1, R0: md.pri[0] === 'radar' ? 20000 * boost : 0 });
        M.sec = mk(md.sec[0], md.sec[1], md.sec[2], { name: md.sec[3], target: 2, R0: md.sec[0] === 'radar' ? 20000 * boost : 0 });
        awacs = md.awacs ? { ang: 0, x: 0, y: 8000, z: 26000, alive: true, R0: 40000 * boost, cx: 0, cz: 26000, lock: 0 } : null;
        for (let i = 0; i < md.cap + (cyc > 0 && mIdx > 1 ? 1 : 0); i++) spawnFighter(i % 2 ? -8000 : 8000, 22000 + i * 3000, true);
        resetPlayer();
      }
      function spawnFighter(x, z, cap) {
        fighters.push({ x, y: cap ? 3000 : 300, z, hdg: Math.PI, pitch: 0, roll: 0, spd: 230, alive: true, msl: 2, cool: 6, seen: 0, cap: !!cap, px: x, pz: z, st: 'patrol' });
      }
      function say(s, c, t) { msg = s; msgC = c || '#40ff70'; msgT = t || 150; }
      function eul() { return { pitch: Math.asin(clamp(PL.F[1], -1, 1)), roll: Math.atan2(-PL.R[1], PL.U[1]), hdg: wrap360(Math.atan2(PL.F[0], PL.F[2]) * R2D) }; }
      function navTarget() {
        if (M.pri.alive) return { x: M.pri.x, z: M.pri.z, code: 'PRI' };
        if (M.sec.alive) return { x: M.sec.x, z: M.sec.z, code: 'SEC' };
        return { x: BASE.x, z: BASE.z, code: 'BASE' };
      }
      function bombTarget() {
        const list = [M.pri, M.sec].filter(s => s.alive);
        for (const s of sites) if (s.alive && !s.target && s.t !== 'airbase') list.push(s);
        if (!list.length) return null;
        if (tgtSel >= list.length) tgtSel = 0;
        // auto: nearest of the two mission targets unless player cycled
        return list[tgtSel];
      }

      // ---------- player flight ----------
      function flyPlayer(dt) {
        const k = api.key, xh = k('KeyX');
        if (api.pressed('KeyX')) { PL.xT = 0; PL.xUsed = false; }
        if (xh) PL.xT += dt;
        if (xh && (k('ArrowUp') || k('ArrowDown'))) PL.xUsed = true;
        if (k('KeyA') || (xh && k('ArrowUp'))) PL.thr = Math.min(1, PL.thr + 0.45 * dt);
        if (k('KeyS') || (xh && k('ArrowDown'))) PL.thr = Math.max(0, PL.thr - 0.45 * dt);
        if (!xh && PL.xPrev && !PL.xUsed && PL.xT < 0.45) cycleWeapon();
        PL.xPrev = xh;
        if (api.pressed('Space')) { if (xh) { PL.xUsed = true; dropDecoy('chaff'); dropDecoy('flare'); } else fire(); }
        if (api.pressed('KeyZ')) dropDecoy('chaff');
        if (api.pressed('KeyC')) dropDecoy('flare');
        if (api.pressed('KeyB')) { PL.bay = PL.bay ? 0 : 1; PL.bayT = PL.bay ? 1e9 : 0; api.audio.noise(0.4, { vol: 0.1, freq: 600 }); }
        if (api.pressed('KeyG')) toggleGear();
        if (api.pressed('KeyT')) { tgtSel++; api.audio.tone(900, 0.04, { vol: 0.08 }); }
        if (api.pressed('KeyM')) mapOn = !mapOn;
        if (api.pressed('KeyV')) view = 1 - view;
        const te = xh ? 0 : k('ArrowDown') ? 1 : k('ArrowUp') ? -1 : 0, ta = k('ArrowRight') ? 1 : k('ArrowLeft') ? -1 : 0;
        const mv = (v, t, r) => v + clamp(t - v, -r * dt, r * dt);
        PL.elev = mv(PL.elev, te, te ? 3 : 5); PL.ail = mv(PL.ail, ta, ta ? 4 : 6);
        // bay automation
        if (PL.bayT > 0 && PL.bayT < 1e8) { PL.bayT -= dt; if (PL.bayT <= 0) PL.bay = 0; }
        PL.bayPos += clamp(PL.bay - PL.bayPos, -dt * 2, dt * 2);
        PL.gearPos += clamp(PL.gear - PL.gearPos, -dt / 2.5, dt / 2.5);
        if (PL.relQ > 0) { PL.relQ -= dt; if (PL.relQ <= 0) releaseBomb(); }
        // auto gear in the landing pattern
        const dB = Math.hypot(PL.x - BASE.x, PL.z - BASE.z), agl0 = PL.y - groundH(PL.x, PL.z);
        if (!PL.gear && dB < 9000 && agl0 < 450 && PL.spd < 125 && !PL.onGround) { PL.gear = 1; say('GEAR DOWN'); api.audio.tone(140, 0.4, { vol: 0.08, slideTo: 90 }); }
        // fuel
        PL.fuel = Math.max(0, PL.fuel - (0.012 + PL.thr * 0.05) * dt);
        const thrEff = PL.fuel > 0 ? PL.thr : 0;
        if (PL.fuel <= 0 && tick % 300 === 0) say('FLAMEOUT - FUEL EXHAUSTED', '#ff4040');
        const F = PL.F, U = PL.U, R = PL.R;
        if (PL.onGround) { groundRoll(dt, thrEff); return; }
        // speed
        const tgt = 85 + thrEff * 235 - PL.gearPos * 40;
        PL.spd += (tgt - PL.spd) * 0.22 * dt - G * F[1] * dt * 0.9 - Math.abs(PL.q) * PL.spd * 0.05 * dt;
        PL.spd = clamp(PL.spd, 30, 340);
        const e = eul();
        const auth = clamp(PL.spd / 150, 0.25, 1);
        let q = PL.elev * 0.85 * auth - (G / PL.spd) * (1 - Math.cos(e.roll)) * 0.6;
        let p = PL.ail * 2.2 * auth;
        if (!ta && Math.abs(e.roll) < 0.6 && Math.abs(e.pitch) < 1.2) p -= e.roll * 0.8;
        PL.stall = PL.spd < 82;
        if (PL.stall) { q -= 0.5 * (82 - PL.spd) / 30; }
        PL.q = q;
        rotPair(F, U, q * dt); rotPair(U, R, p * dt);
        // coordinated turn about world up
        const cr = clamp(e.roll, -1.35, 1.35);
        const yr = (G / PL.spd) * Math.tan(cr) * Math.max(0, Math.cos(e.pitch)) * (Math.abs(e.roll) > 1.6 ? 0 : 1);
        const a = yr * dt, c = Math.cos(a), s = Math.sin(a);
        for (const v of [F, U, R]) { const x = v[0], z = v[2]; v[0] = x * c + z * s; v[2] = -x * s + z * c; }
        nrm(F); const nr = nrm(cross(U, F)); R[0] = nr[0]; R[1] = nr[1]; R[2] = nr[2];
        const nu = cross(F, R); U[0] = nu[0]; U[1] = nu[1]; U[2] = nu[2];
        PL.x += F[0] * PL.spd * dt; PL.y += F[1] * PL.spd * dt; PL.z += F[2] * PL.spd * dt;
        PL.y = Math.min(PL.y, 14000);
        // signature
        const agl = PL.y - groundH(PL.x, PL.z);
        PL.sig = clamp(0.12 + 0.3 * (PL.spd / 300) + PL.bayPos * 0.45 + PL.gearPos * 0.25 + clamp((agl - 300) / 8000, 0, 0.3), 0.05, 1.3);
        PL.agl = agl;
        // terrain / landing
        if (agl < 2.2) touchdown(e);
        else {
          for (const st of sites) {
            const h = HEIGHT[st.t] || 0;
            if (st.alive && h > 20 && PL.y < h + 2 && Math.hypot(PL.x - st.x, PL.z - st.z) < 25) { crashOut('HIT A TOWER'); return; }
          }
        }
      }
      function onRunway() { return Math.abs(PL.x - BASE.x) < BASE.wid / 2 + 4 && Math.abs(PL.z - BASE.z) < BASE.len / 2 + 10; }
      function touchdown(e) {
        const vs = PL.F[1] * PL.spd;
        if (onRunway() && PL.gearPos > 0.95 && vs > -7.5 && Math.abs(e.roll) < 0.35 && e.pitch > -0.12 && PL.spd < 125) {
          PL.onGround = true; PL.y = groundH(PL.x, PL.z) + 2.2; PL.tdVs = vs;
          api.audio.noise(0.15, { vol: 0.2, freq: 3000, type: 'highpass' });
          say('TOUCHDOWN', '#40ff70', 90);
          return;
        }
        let why = 'FLEW INTO THE GROUND';
        if (onRunway()) why = PL.gearPos < 0.95 ? 'GEAR-UP LANDING' : vs <= -7.5 ? 'HARD LANDING' : PL.spd >= 125 ? 'TOO FAST ON TOUCHDOWN' : 'BAD LANDING ATTITUDE';
        crashOut(why);
      }
      function groundRoll(dt, thrEff) {
        const h = Math.atan2(PL.F[0], PL.F[2]);
        const steer = PL.ail * 0.25 * clamp(PL.spd / 20, 0, 1);
        const nh = h + steer * dt;
        const pitch = clamp(Math.asin(clamp(PL.F[1], -1, 1)) + PL.elev * 0.3 * dt - 0.15 * dt, 0, 0.18);
        PL.F[0] = Math.sin(nh) * Math.cos(pitch); PL.F[1] = Math.sin(pitch); PL.F[2] = Math.cos(nh) * Math.cos(pitch);
        PL.R[0] = Math.cos(nh); PL.R[1] = 0; PL.R[2] = -Math.sin(nh);
        const u = cross(PL.F, PL.R); PL.U[0] = u[0]; PL.U[1] = u[1]; PL.U[2] = u[2];
        if (thrEff > 0.6) {
          PL.spd += (85 + thrEff * 235 - PL.spd) * 0.15 * dt;
          if (PL.spd > 95 && PL.elev > 0.3) { PL.onGround = false; PL.y += 3; rotPair(PL.F, PL.U, 0.08); say('TOUCH AND GO'); }
        } else PL.spd = Math.max(0, PL.spd - (PL.spd > 60 ? 7 : 10) * dt);
        PL.x += Math.sin(nh) * PL.spd * dt; PL.z += Math.cos(nh) * PL.spd * dt;
        PL.sig = 0.2; PL.agl = 2.2;
        if (!onRunway() && PL.spd > 25) { crashOut('RAN OFF THE RUNWAY'); return; }
        if (PL.spd < 1) landed();
      }
      function toggleGear() {
        PL.gear = PL.gear ? 0 : 1; api.audio.tone(140, 0.4, { vol: 0.08, slideTo: PL.gear ? 90 : 200 });
        say(PL.gear ? 'GEAR DOWN' : 'GEAR UP');
      }
      function cycleWeapon() {
        PL.wpn = (PL.wpn + 1) % 2; api.audio.tone(700, 0.05, { vol: 0.08 });
        say(PL.wpn ? 'AIM-9 SIDEWINDER x' + PL.aim : 'GBU-27 LASER BOMB x' + PL.gbu);
      }
      function dropDecoy(kind) {
        if (kind === 'chaff' ? PL.chaff <= 0 : PL.flares <= 0) return;
        if (kind === 'chaff') PL.chaff--; else PL.flares--;
        decoys.push({ kind, x: PL.x - PL.F[0] * 10, y: PL.y - 3, z: PL.z - PL.F[2] * 10, vx: PL.F[0] * PL.spd * 0.3, vz: PL.F[2] * PL.spd * 0.3, life: 3 });
        api.audio.noise(0.15, { vol: 0.12, freq: kind === 'chaff' ? 5000 : 1500, type: 'highpass' });
        for (const m of missiles) {
          if (m.tgt !== 'player') continue;
          if ((m.kind === 'sam') !== (kind === 'chaff')) continue;
          const d = Math.hypot(m.x - PL.x, m.y - PL.y, m.z - PL.z);
          if (d < 6000 && Math.random() < 0.7) m.tgt = decoys[decoys.length - 1];
        }
      }
      function fire() {
        if (PL.wpn === 0) {
          if (PL.gbu <= 0) { say('NO BOMBS LEFT', '#ffd040'); return; }
          if (PL.relQ > 0) return;
          PL.bay = 1; PL.bayT = 2.4; PL.relQ = PL.bayPos > 0.9 ? 0.05 : 0.6;
          api.audio.noise(0.4, { vol: 0.1, freq: 600 });
        } else {
          if (PL.aim <= 0) { say('NO MISSILES LEFT', '#ffd040'); return; }
          const t = airLock();
          if (!t) { say('NO LOCK', '#ffd040', 60); api.audio.tone(200, 0.1, { vol: 0.08 }); return; }
          PL.aim--; PL.bay = 1; PL.bayT = 1.2;
          missiles.push({ kind: 'aim', x: PL.x, y: PL.y - 2, z: PL.z, d: PL.F.slice(), spd: PL.spd + 100, tgt: t, life: 14, turn: 0.9, trail: [] });
          api.audio.noise(0.6, { vol: 0.15, freq: 2500, slideTo: 400 });
        }
      }
      function releaseBomb() {
        if (PL.gbu <= 0) return;
        PL.gbu--;
        const t = bombTarget();
        bombs.push({ x: PL.x, y: PL.y - 2, z: PL.z, vx: PL.F[0] * PL.spd, vy: PL.F[1] * PL.spd, vz: PL.F[2] * PL.spd, tgt: t, t: 0 });
        api.audio.tone(300, 0.3, { type: 'triangle', vol: 0.1, slideTo: 150 });
        say('BOMB AWAY', '#40ff70', 90);
      }
      function airLock() {
        let best = null, bd = 1e9;
        const cands = fighters.filter(f => f.alive);
        if (awacs && awacs.alive) cands.push(awacs);
        for (const f of cands) {
          const dx = f.x - PL.x, dy = f.y - PL.y, dz = f.z - PL.z, d = Math.hypot(dx, dy, dz);
          if (d > 8000) continue;
          const c = (dx * PL.F[0] + dy * PL.F[1] + dz * PL.F[2]) / d;
          if (c < Math.cos(30 * D2R)) continue;
          if (d < bd) { bd = d; best = f; }
        }
        return best;
      }
      function laserLock(t) {
        if (!t || !t.alive) return false;
        const dx = t.x - PL.x, dz = t.z - PL.z, d = Math.hypot(dx, dz);
        if (d > 14000 || PL.y < 40) return false;
        const fwd = (dx * PL.F[0] + dz * PL.F[2]) / Math.max(1, d * Math.hypot(PL.F[0], PL.F[2]));
        return d < 300 || fwd > -0.5;
      }
      function bombCue() {
        const t = bombTarget(); if (!t) return null;
        const h = Math.max(1, PL.y - groundH(t.x, t.z)), vh = PL.spd * Math.hypot(PL.F[0], PL.F[2]), vy = PL.spd * PL.F[1];
        const tf = (vy + Math.sqrt(vy * vy + 2 * G * h)) / G;
        const range = vh * tf * 0.97, slack = 0.5 * 22 * tf * tf * 0.6;
        const dx = t.x - PL.x, dz = t.z - PL.z, d = Math.hypot(dx, dz);
        const along = (dx * PL.F[0] + dz * PL.F[2]) / Math.max(0.01, Math.hypot(PL.F[0], PL.F[2]));
        return { t, d, range, slack, inRange: Math.abs(d - range) < slack && along > 0, tf };
      }

      // ---------- enemies ----------
      function playerSeen(by) { lastKnown = { x: PL.x, y: PL.y, z: PL.z, t: missionT }; void by; }
      function updateSites(dt) {
        detected = false;
        const lowMask = PL.agl < 200 ? 0.6 : 1;
        for (const s of sites) {
          if (!s.alive || !s.R0) continue;
          const d = Math.hypot(PL.x - s.x, PL.y - 10, PL.z - s.z);
          const rr = s.R0 * PL.sig * lowMask;
          s.rr = rr;
          if (d < rr && !PL.onGround) {
            s.lock += dt; detected = true; playerSeen(s);
            if (s.lock > 1.5) alert += dt;
          } else s.lock = Math.max(0, s.lock - dt * 0.7);
          if (s.t === 'sam') {
            s.reload -= dt;
            if (s.lock > 2.5 && d < s.mr && s.reload <= 0) {
              s.reload = 9 - Math.min(4, cyc + mIdx * 0.6);
              const dir = nrm([PL.x - s.x, d * 0.4, PL.z - s.z]);
              missiles.push({ kind: 'sam', x: s.x, y: 5, z: s.z, d: dir, spd: 120, tgt: 'player', site: s, life: 22, turn: 0.5, trail: [] });
              launchWarn = 3; say('SAM LAUNCH!', '#ff4040', 120);
              api.audio.melody([[1200, 0.08], [0, 0.04], [1200, 0.08], [0, 0.04], [1200, 0.08]], { type: 'square', vol: 0.12 });
            }
          }
        }
        if (awacs && awacs.alive) {
          awacs.ang += dt * 0.02;
          const px = awacs.x, pz = awacs.z;
          awacs.x = awacs.cx + Math.cos(awacs.ang) * 9000; awacs.z = awacs.cz + Math.sin(awacs.ang) * 9000;
          awacs.vx = (awacs.x - px) / dt; awacs.vz = (awacs.z - pz) / dt;
          const d = Math.hypot(PL.x - awacs.x, PL.y - awacs.y, PL.z - awacs.z);
          awacs.rr = awacs.R0 * PL.sig * (PL.agl < 200 ? 0.8 : 1);
          if (d < awacs.rr && !PL.onGround) { detected = true; playerSeen(awacs); alert += dt * 1.5; awacs.lock += dt; } else awacs.lock = 0;
        }
        if (detected) detT += dt;
        if (!alerted && alert > 2.5) { alerted = true; say('ENEMY ALERTED - FIGHTERS SCRAMBLING', '#ffd040', 180); }
        if (alerted) {
          for (const s of sites) {
            if (s.t !== 'airbase' || !s.alive || s.n <= 0) continue;
            s.launchT -= dt;
            if (s.launchT <= 0) { s.launchT = 22 - Math.min(8, cyc * 3); s.n--; spawnFighter(s.x, s.z, false); fighters[fighters.length - 1].st = 'intercept'; }
          }
        }
      }
      function updateFighters(dt) {
        for (const f of fighters) {
          if (!f.alive) continue;
          const dx = PL.x - f.x, dy = PL.y - f.y, dz = PL.z - f.z, d = Math.hypot(dx, dy, dz);
          const vis = 1000 + PL.sig * 3200;
          if (d < vis && !PL.onGround) { f.seen = 4; playerSeen(f); }
          else f.seen -= dt;
          let tx, ty, tz;
          if (f.msl <= 0 && f.cool <= 0) { tx = f.px; ty = 3000; tz = f.pz; f.st = 'rtb'; if (Math.hypot(f.x - f.px, f.z - f.pz) < 1500) f.alive = false; }
          else if (f.seen > 0) { tx = PL.x; ty = PL.y; tz = PL.z; f.st = 'attack'; }
          else if (lastKnown && missionT - lastKnown.t < 45 && (alerted || f.cap)) { tx = lastKnown.x; ty = Math.max(lastKnown.y, 500); tz = lastKnown.z; f.st = 'intercept'; }
          else { const a = missionT * 0.05 + f.px * 0.001; tx = f.px + Math.cos(a) * 6000; ty = 3000; tz = f.pz + Math.sin(a) * 6000; f.st = 'patrol'; }
          const want = Math.atan2(tx - f.x, tz - f.z);
          let dh = want - f.hdg; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
          const tr = 0.32 * dt;
          f.hdg += clamp(dh, -tr, tr);
          f.roll += (clamp(dh * 2, -1.1, 1.1) - f.roll) * dt * 2;
          const gh = groundH(f.x, f.z);
          const tyy = Math.max(ty, gh + 250);
          const hd = Math.hypot(tx - f.x, tz - f.z);
          f.pitch += (clamp(Math.atan2(tyy - f.y, Math.max(500, hd)), -0.5, 0.5) - f.pitch) * dt * 1.5;
          f.spd += ((f.st === 'attack' ? 280 : 230) - f.spd) * dt * 0.3;
          f.x += Math.sin(f.hdg) * Math.cos(f.pitch) * f.spd * dt; f.z += Math.cos(f.hdg) * Math.cos(f.pitch) * f.spd * dt; f.y += Math.sin(f.pitch) * f.spd * dt;
          if (f.y < gh + 60) f.y = gh + 60;
          f.cool -= dt;
          if (f.seen > 0 && f.msl > 0 && f.cool <= 0 && d < 3800 && d > 400) {
            const fx = Math.sin(f.hdg), fz = Math.cos(f.hdg);
            const c = (dx * fx + dz * fz) / Math.max(1, Math.hypot(dx, dz));
            if (c > Math.cos(28 * D2R)) {
              f.msl--; f.cool = 9 - Math.min(4, cyc * 2);
              missiles.push({ kind: 'aa', x: f.x, y: f.y - 2, z: f.z, d: nrm([dx, dy, dz]), spd: f.spd + 80, tgt: 'player', life: 12, turn: 0.75, trail: [] });
              launchWarn = 3; say('MISSILE LAUNCH!', '#ff4040', 120);
              api.audio.melody([[1500, 0.06], [0, 0.03], [1500, 0.06], [0, 0.03], [1500, 0.06], [0, 0.03], [1500, 0.06]], { type: 'square', vol: 0.12 });
            }
          }
        }
      }
      function steer(m, tx, ty, tz, dt) {
        const want = nrm([tx - m.x, ty - m.y, tz - m.z]);
        const c = clamp(dot(want, m.d), -1, 1), a = Math.acos(c), mx = m.turn * dt;
        if (a < 1e-4) return;
        const t = Math.min(1, mx / a);
        m.d = nrm([m.d[0] + (want[0] - m.d[0]) * t, m.d[1] + (want[1] - m.d[1]) * t, m.d[2] + (want[2] - m.d[2]) * t]);
      }
      function updateMissiles(dt) {
        for (let i = missiles.length - 1; i >= 0; i--) {
          const m = missiles[i];
          m.life -= dt;
          const top = m.kind === 'sam' ? 620 : m.kind === 'aim' ? 750 : 600;
          m.spd = Math.min(top, m.spd + 260 * dt);
          let tx = null, ty, tz;
          if (m.tgt === 'player') {
            const guided = m.kind !== 'sam' || (m.site && m.site.alive && m.site.lock > 0.3);
            if (guided) { const tt = Math.hypot(PL.x - m.x, PL.y - m.y, PL.z - m.z) / m.spd; tx = PL.x + PL.F[0] * PL.spd * tt * 0.5; ty = PL.y + PL.F[1] * PL.spd * tt * 0.5; tz = PL.z + PL.F[2] * PL.spd * tt * 0.5; }
          } else if (m.tgt && m.tgt.life !== undefined && m.tgt.kind) { tx = m.tgt.x; ty = m.tgt.y; tz = m.tgt.z; }
          else if (m.tgt && m.tgt.alive) { tx = m.tgt.x; ty = m.tgt.y; tz = m.tgt.z; }
          if (tx !== null) steer(m, tx, ty, tz, dt);
          if (tick % 3 === 0) { m.trail.push([m.x, m.y, m.z]); if (m.trail.length > 14) m.trail.shift(); }
          m.x += m.d[0] * m.spd * dt; m.y += m.d[1] * m.spd * dt; m.z += m.d[2] * m.spd * dt;
          let dead = m.life <= 0 || m.y < groundH(m.x, m.z);
          if (m.tgt === 'player' && !dead && state === 'fly') {
            if (Math.hypot(PL.x - m.x, PL.y - m.y, PL.z - m.z) < 40) { dead = true; hitPlayer(); }
          } else if (m.kind === 'aim' && m.tgt && m.tgt.alive && Math.hypot(m.tgt.x - m.x, m.tgt.y - m.y, m.tgt.z - m.z) < 40) {
            dead = true; m.tgt.alive = false; boom(m.tgt.x, m.tgt.y, m.tgt.z, 30);
            if (m.tgt === awacs) { M.awacsKill = true; say('AWACS DESTROYED!', '#40ff70', 150); }
            else { M.airKills++; say('FIGHTER DESTROYED', '#40ff70', 120); }
            api.audio.noise(1, { vol: 0.25, freq: 1200, slideTo: 100 });
          } else if (m.tgt && m.tgt.kind && Math.hypot(m.tgt.x - m.x, m.tgt.y - m.y, m.tgt.z - m.z) < 30) dead = true;
          if (dead) { boom(m.x, Math.max(m.y, groundH(m.x, m.z) + 1), m.z, 6); missiles.splice(i, 1); }
        }
        if (launchWarn > 0) launchWarn -= dt;
        for (let i = decoys.length - 1; i >= 0; i--) {
          const d = decoys[i]; d.life -= dt; d.x += d.vx * dt; d.z += d.vz * dt; d.y -= 20 * dt;
          if (d.life <= 0) decoys.splice(i, 1);
        }
      }
      function updateBombs(dt) {
        for (let i = bombs.length - 1; i >= 0; i--) {
          const b = bombs[i];
          b.t += dt;
          b.vy -= G * dt;
          const lock = laserLock(b.tgt);
          if (lock) {
            const hh = Math.max(0, b.y - groundH(b.tgt.x, b.tgt.z)), tt = Math.max(0.3, (b.vy + Math.sqrt(b.vy * b.vy + 2 * G * hh)) / G);
            const ax = clamp(((b.tgt.x - b.x) / tt - b.vx) * 1.5, -22, 22), az = clamp(((b.tgt.z - b.z) / tt - b.vz) * 1.5, -22, 22);
            b.vx += ax * dt; b.vz += az * dt;
          }
          b.vx *= 1 - 0.02 * dt; b.vz *= 1 - 0.02 * dt;
          b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          if (b.y <= groundH(b.x, b.z) + 1) { bombs.splice(i, 1); impact(b); }
        }
      }
      function impact(b) {
        boom(b.x, groundH(b.x, b.z) + 2, b.z, 40);
        api.audio.noise(1.6, { vol: 0.3, freq: 900, slideTo: 60 });
        let hit = false;
        for (const s of sites) {
          if (!s.alive) continue;
          const r = s.t === 'bridge' ? 45 : s.t === 'hangars' || s.t === 'airbase' || s.t === 'factory' ? 70 : 40;
          if (Math.hypot(b.x - s.x, b.z - s.z) < r) {
            s.alive = false; hit = true;
            for (let k = 0; k < 3; k++) boom(s.x + (Math.random() - 0.5) * 30, 10, s.z + (Math.random() - 0.5) * 30, 25);
            if (s.target === 1) say('PRIMARY TARGET DESTROYED!', '#40ff70', 200);
            else if (s.target === 2) say('SECONDARY TARGET DESTROYED!', '#40ff70', 200);
            else { M.other++; say(s.name + ' DESTROYED', '#40ff70', 150); }
          }
        }
        if (!hit) say('TARGET MISSED', '#ffd040', 120);
      }
      function hitPlayer() {
        PL.hp--;
        boom(PL.x, PL.y, PL.z, 15);
        api.audio.noise(0.8, { vol: 0.3, freq: 1500, slideTo: 200 });
        if (PL.hp <= 0) crashOut('SHOT DOWN');
        else say('HIT! SYSTEMS DAMAGED', '#ff4040', 180);
      }
      function crashOut(why) {
        if (state !== 'fly') return;
        state = 'down'; stT = 0;
        down = { why, x: PL.x, y: PL.y, z: PL.z, F: PL.F.slice(), U: PL.U.slice(), R: PL.R.slice(), spd: PL.spd, ej: why === 'SHOT DOWN' };
        boom(PL.x, Math.max(PL.y, groundH(PL.x, PL.z) + 2), PL.z, 50);
        api.audio.noise(1.6, { vol: 0.32, freq: 1400, slideTo: 60 });
        api.audio.tone(110, 1, { type: 'sawtooth', vol: 0.12, slideTo: 30 });
      }
      function boom(x, y, z, n) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - 0.3, s = 5 + Math.random() * 25;
          parts.push({ x, y, z, vx: Math.cos(a) * Math.cos(b) * s, vy: Math.sin(b) * s + 6, vz: Math.sin(a) * Math.cos(b) * s, life: 0.8 + Math.random() * 2.2, t: 0, smoke: i % 3 === 0 });
        }
        if (parts.length > 500) parts.splice(0, parts.length - 500);
      }
      function stepParts(dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.smoke) { p.vy = 6; p.vx *= 0.97; p.vz *= 0.97; } else p.vy -= 9 * dt;
        }
        // burning wrecks
        if (tick % 20 === 0) for (const s of sites) if (!s.alive && s.target && Math.random() < 0.6) parts.push({ x: s.x + (Math.random() - 0.5) * 30, y: 5, z: s.z + (Math.random() - 0.5) * 30, vx: 0, vy: 10, vz: 0, life: 2, t: 0, smoke: Math.random() < 0.5 });
      }
      function landed() {
        if (state !== 'fly') return;
        M.landed = true;
        M.landBonus = 500 + (PL.tdVs > -3 ? 200 : 0);
        debrief();
      }
      function debrief() {
        const lines = [];
        let s = 0;
        const add = (t, v) => { lines.push([t, v]); s += v; };
        add('PRIMARY: ' + M.md.pri[3], M.pri.alive ? 0 : 2000);
        add('SECONDARY: ' + M.md.sec[3], M.sec.alive ? 0 : 1000);
        if (M.other) add('OTHER GROUND TARGETS x' + M.other, M.other * 200);
        if (M.airKills) add('AIR KILLS x' + M.airKills, M.airKills * 300);
        if (M.awacsKill) add('AWACS KILL', 600);
        add('SAFE LANDING', M.landBonus);
        add('TIME DETECTED ' + Math.floor(detT / 60) + ':' + String(Math.floor(detT % 60)).padStart(2, '0'), -Math.round(detT * 6));
        const bonus = Math.round(s * (0.2 * (mIdx + cyc * 5)));
        if (bonus > 0) add('DIFFICULTY BONUS', bonus);
        s = Math.max(0, s);
        const ok = !M.pri.alive;
        score += s;
        if (score > hi) { hi = score; api.setHiScore(hi); }
        const prevRank = rankOf(score - s);
        let medal = null;
        for (const md of MEDALS) if (s >= md[0] * (1 + mIdx * 0.08) && ok) { medal = md; break; }
        deb = { lines, s, ok, medal, rank: rankOf(score), promoted: rankOf(score) > prevRank };
        state = 'debrief'; stT = 0;
        api.audio.melody(ok ? [[392, 0.15], [523, 0.15], [659, 0.15], [784, 0.4], [659, 0.15], [784, 0.6]] : [[392, 0.3], [349, 0.3], [330, 0.6]], { type: 'square', vol: 0.12 });
      }
      function rankOf(sc) { return Math.min(RANKS.length - 1, Math.floor(sc / 4500)); }
      function afterDebrief() {
        if (deb.ok) { mIdx++; if (mIdx >= MISSIONS.length) { mIdx = 0; cyc++; say('CAMPAIGN COMPLETE - DEFENSES INCREASE', '#ffd040', 240); } }
        buildMission(); state = 'brief'; stT = 0;
      }
      function afterDown() {
        lives--;
        if (lives > 0) { buildMission(); state = 'brief'; stT = 0; return; }
        state = 'wait';
        const end = () => { state = 'over'; stT = 0; if (score > hi) hi = score; api.setHiScore(score); };
        if (api.offerContinue) api.offerContinue(() => { lives = 3; score = 0; buildMission(); state = 'brief'; stT = 0; }, end);
        else end();
      }
      function startGame() {
        lives = 3; score = 0; mIdx = 0; cyc = 0; buildMission(); state = 'brief'; stT = 0;
        api.audio.melody([[220, 0.15], [330, 0.15], [440, 0.3]], { type: 'sawtooth', vol: 0.1 });
      }

      function update(dt) {
        tick++; if (coinFlash > 0) coinFlash--; if (msgT > 0) msgT--;
        stepParts(dt);
        if (state === 'title') {
          if (api.anyPressed('Enter', 'Space')) { if (api.useCredit()) startGame(); else { coinFlash = 90; api.audio.tone(70, 0.25, { vol: 0.2 }); } }
          return;
        }
        if (state === 'wait') return;
        if (state === 'over') { stT++; if (stT > 300 || (stT > 60 && api.anyPressed('Enter', 'Space'))) state = 'title'; return; }
        if (state === 'brief') { stT++; if ((stT > 30 && api.anyPressed('Enter', 'Space')) || stT > 900) { state = 'fly'; stT = 0; } return; }
        if (state === 'debrief') { stT++; if ((stT > 60 && api.anyPressed('Enter', 'Space')) || stT > 900) afterDebrief(); return; }
        if (state === 'down') {
          stT++;
          if (down.y > groundH(down.x, down.z) + 2) { down.y -= Math.min(80, 10 + stT * 0.6) / 60; down.x += down.F[0] * down.spd / 60 * 0.3; down.z += down.F[2] * down.spd / 60 * 0.3; rotPair(down.U, down.R, 0.08); if (tick % 6 === 0) boom(down.x, down.y, down.z, 2); }
          updateMissiles(dt); updateFighters(dt);
          if ((stT > 90 && api.anyPressed('Enter', 'Space')) || stT > 420) afterDown();
          return;
        }
        if (state === 'pause') {
          const it = pauseItems();
          if (api.pressed('ArrowUp')) pauseSel = (pauseSel + it.length - 1) % it.length;
          if (api.pressed('ArrowDown')) pauseSel = (pauseSel + 1) % it.length;
          if (api.pressed('KeyX')) { state = 'fly'; PL.xPrev = true; PL.xUsed = true; }
          if (api.anyPressed('Enter', 'Space')) {
            const s = it[pauseSel]; state = 'fly'; PL.xUsed = true;
            if (s.startsWith('GEAR')) toggleGear();
            else if (s.startsWith('BAY')) { PL.bay = PL.bay ? 0 : 1; PL.bayT = PL.bay ? 1e9 : 0; }
            else if (s.startsWith('MAP')) mapOn = !mapOn;
            else if (s.startsWith('VIEW')) view = 1 - view;
            else if (s.startsWith('NEXT TARGET')) tgtSel++;
            else if (s === 'ABORT TO TITLE') state = 'title';
          }
          return;
        }
        // fly
        if (api.pressed('Enter')) { state = 'pause'; pauseSel = 0; return; }
        missionT += dt;
        flyPlayer(dt);
        if (state !== 'fly') return;
        updateSites(dt); updateFighters(dt); updateMissiles(dt); updateBombs(dt);
        if (tick % 8 === 0) api.audio.tone(70 + PL.thr * 60, 0.15, { type: 'sawtooth', vol: 0.02 + PL.thr * 0.015 });
        if (launchWarn > 0 && tick % 12 === 0) api.audio.tone(1300, 0.05, { vol: 0.07 });
        if (detected && tick % 45 === 0) api.audio.tone(600, 0.06, { type: 'triangle', vol: 0.06 });
        if (PL.stall && tick % 16 === 0) api.audio.tone(400, 0.1, { vol: 0.07 });
        if (PL.fuel < 15 && PL.fuel > 0 && tick % 600 === 0) say('BINGO FUEL - RETURN TO BASE', '#ffd040');
      }
      function pauseItems() {
        return ['RESUME', 'GEAR ' + (PL.gear ? 'UP' : 'DOWN'), 'BAY DOORS ' + (PL.bay ? 'CLOSE' : 'OPEN'), 'NEXT TARGET', 'MAP ' + (mapOn ? 'OFF' : 'ON'), 'VIEW ' + (view ? 'COCKPIT' : 'CHASE'), 'ABORT TO TITLE'];
      }

      // ---------- rendering ----------
      function drawModel(model, x, y, z, R, U, F, sc) {
        sc = sc || 1;
        for (const [v, c] of model) {
          const n = v.length / 3, w = new Array(v.length);
          for (let i = 0; i < n; i++) {
            const a = v[i * 3] * sc, b = v[i * 3 + 1] * sc, cc = v[i * 3 + 2] * sc;
            w[i * 3] = x + R[0] * a + U[0] * b + F[0] * cc; w[i * 3 + 1] = y + R[1] * a + U[1] * b + F[1] * cc; w[i * 3 + 2] = z + R[2] * a + U[2] * b + F[2] * cc;
          }
          const ax = w[3] - w[0], ay = w[4] - w[1], az = w[5] - w[2], bx = w[6] - w[0], by = w[7] - w[1], bz = w[8] - w[2];
          const nn = nrm([ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]);
          if ((CAM.x - w[0]) * nn[0] + (CAM.y - w[1]) * nn[1] + (CAM.z - w[2]) * nn[2] < 0) { nn[0] = -nn[0]; nn[1] = -nn[1]; nn[2] = -nn[2]; }
          addPoly(w, n, shade(c, nn[0], nn[1], nn[2]), false, -1);
        }
      }
      function basisFrom(h, p, r) {
        const F = [Math.sin(h) * Math.cos(p), Math.sin(p), Math.cos(h) * Math.cos(p)];
        let R = [Math.cos(h), 0, -Math.sin(h)];
        let U = cross(F, R);
        const c = Math.cos(r), s = Math.sin(r);
        const R2 = [R[0] * c - U[0] * s, R[1] * c - U[1] * s, R[2] * c - U[2] * s], U2 = [U[0] * c + R[0] * s, U[1] * c + R[1] * s, U[2] * c + R[2] * s];
        return [R2, U2, F];
      }
      function drawObj(o) {
        const dx = o.x - CAM.x, dy = o.y - CAM.y, dz = o.z - CAM.z;
        if (Math.hypot(dx, dy, dz) - o.r > 26000) return;
        if (dx * CAM.f[0] + dy * CAM.f[1] + dz * CAM.f[2] < -o.r) return;
        for (const f of o.faces) {
          if (f.cull && f.nx * (CAM.x - f.v[0]) + f.ny * (CAM.y - f.v[1]) + f.nz * (CAM.z - f.v[2]) <= 0) continue;
          addPoly(f.v, f.n, f.c, false);
        }
      }
      const rubble = [];
      function drawScene(ctx, opt) {
        opt = opt || {};
        beginScene(ctx);
        if (!IR) {
          for (const s of stars) {
            const cz = s[0] * CAM.f[0] + s[1] * CAM.f[1] + s[2] * CAM.f[2]; if (cz < 0.05) continue;
            const sx = VIEW.cx + (s[0] * CAM.r[0] + s[1] * CAM.r[1] + s[2] * CAM.r[2]) / cz * VIEW.f, sy = VIEW.cy - (s[0] * CAM.u[0] + s[1] * CAM.u[1] + s[2] * CAM.u[2]) / cz * VIEW.f;
            if (sx < VIEW.x || sx > VIEW.x + VIEW.w || sy < VIEW.y || sy > VIEW.y + VIEW.h) continue;
            ctx.fillStyle = s[3] > 1 ? '#c8d0e0' : '#6a7080'; ctx.fillRect(sx, sy, 1, 1);
          }
        }
        const cx = CAM.x, cz = CAM.z;
        for (const [rad, c] of [[300000, [10, 14, 14]], [12000, [16, 26, 20]]]) {
          const v = [];
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; v.push(cx + Math.cos(a) * rad, 0, cz + Math.sin(a) * rad); }
          const p = project(v, 8); if (p) { p.c = colStr(c, rad > 20000 ? 0 : 500); decalQ.push(p); }
        }
        const lim = opt.near || 26000, fx = opt.fx == null ? cx : opt.fx, fz = opt.fz == null ? cz : opt.fz;
        for (const d of TERR.decals) {
          if (Math.hypot(d.x - fx, d.z - fz) - d.r > (d.near ? Math.min(lim, 3000 + CAM.y * 2) : lim)) continue;
          addPoly(d.v, d.n, d.c, true);
        }
        for (const o of TERR.objs) if (Math.hypot(o.x - fx, o.z - fz) - o.r < lim) drawObj(o);
        for (const s of sites) {
          if (Math.hypot(s.x - fx, s.z - fz) > lim) continue;
          if (s.alive) drawObj(s.model);
          else {
            const v = [];
            for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; v.push(s.x + Math.cos(a) * 40, 0, s.z + Math.sin(a) * 40); }
            addPoly(v, 7, [12, 10, 8], true);
          }
          if (s.t === 'airbase') { /* runway */ }
        }
        for (const f of fighters) if (f.alive) { const [R, U, F] = basisFrom(f.hdg, f.pitch, f.roll); drawModel(M_MIG, f.x, f.y, f.z, R, U, F); }
        if (awacs && awacs.alive) { const h = Math.atan2(-Math.sin(awacs.ang), Math.cos(awacs.ang)); const [R, U, F] = basisFrom(h, 0, -0.25); drawModel(M_AWACS, awacs.x, awacs.y, awacs.z, R, U, F); }
        if (opt.player) drawModel(M_F117, opt.player.x, opt.player.y, opt.player.z, opt.player.R, opt.player.U, opt.player.F);
        for (const m of missiles) for (let i = 1; i < m.trail.length; i++) { const a = m.trail[i - 1], b = m.trail[i]; addLine(a[0], a[1], a[2], b[0], b[1], b[2], [80, 80, 80]); }
        for (const b of bombs) addLine(b.x, b.y, b.z, b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.z - b.vz * 0.02, [150, 150, 150]);
        flush(ctx);
        // point lights
        const lt = (x, y, z, col, sz) => { const p = projPoint(x, y, z); if (!p || p.y > VIEW.y + VIEW.h || p.y < VIEW.y || p.x < VIEW.x || p.x > VIEW.x + VIEW.w) return; ctx.fillStyle = col; const s = sz || (p.z < 2500 ? 2 : 1); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); };
        if (!IR) for (const l of TERR.lights) { if (Math.abs(l[0] - cx) + Math.abs(l[2] - cz) < 22000) lt(l[0], l[1], l[2], l[3]); }
        for (const s of sites) {
          if (s.t === 'airbase' && s.alive && !IR) for (let k = -6; k <= 6; k++) { lt(s.x - 120 + k * 60, 0.5, s.z + 80, '#ff8040'); lt(s.x - 120 + k * 60, 0.5, s.z + 130, '#ff8040'); }
          if (s.t === 'radar' && s.alive && (tick >> 4) % 2) lt(s.x, 38, s.z, '#ff2020');
          if (s.t === 'comms' && s.alive) lt(s.x, 162, s.z, '#ff2020', 2);
        }
        if (!IR) for (const f of fighters) if (f.alive && (tick >> 3) % 3) { const [R] = basisFrom(f.hdg, f.pitch, f.roll); lt(f.x - R[0] * 6, f.y - R[1] * 6, f.z - R[2] * 6, '#ff3030'); lt(f.x + R[0] * 6, f.y + R[1] * 6, f.z + R[2] * 6, '#30ff30'); }
        for (const m of missiles) lt(m.x, m.y, m.z, m.kind === 'aim' ? '#ffffff' : '#ffe080', 3);
        for (const d of decoys) lt(d.x, d.y, d.z, d.kind === 'flare' ? '#fff0a0' : '#a0a0b0', d.kind === 'flare' ? 3 : 1);
        for (const p of parts) {
          const s = projPoint(p.x, p.y, p.z); if (!s || s.y < VIEW.y || s.y > VIEW.y + VIEW.h || s.x < VIEW.x || s.x > VIEW.x + VIEW.w) continue;
          const k = p.t / p.life, rad = Math.min(40, Math.max(1, (p.smoke ? 6 + k * 16 : 3 + k * 5) * VIEW.f / s.z));
          ctx.fillStyle = p.smoke ? 'rgba(50,50,56,' + (0.6 - k * 0.5).toFixed(2) + ')' : IR ? '#e0ffe0' : k < 0.3 ? '#fff4a0' : k < 0.6 ? '#ffa020' : '#c03010';
          ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, Math.PI * 2); ctx.fill();
        }
      }
      const HG = '#40ff70';
      function hud(ctx) {
        const e = eul();
        ctx.strokeStyle = HG; ctx.fillStyle = HG; ctx.lineWidth = 1;
        // heading tape
        ctx.beginPath();
        for (let d = -40; d <= 40; d += 5) {
          const hd = Math.round(e.hdg / 5) * 5 + d, x = 160 + angDiff(hd, e.hdg) * 2;
          if (x < 90 || x > 230) continue;
          const big = wrap360(hd) % 10 === 0;
          ctx.moveTo(x + 0.5, 14); ctx.lineTo(x + 0.5, big ? 9 : 11);
          if (wrap360(hd) % 30 === 0) text(ctx, String(wrap360(hd) / 10 | 0).padStart(2, '0'), x, 1, HG, 1, 'center');
        }
        ctx.moveTo(160.5, 15); ctx.lineTo(160.5, 19);
        ctx.stroke();
        // pitch ladder
        const ph = e.hdg * D2R;
        ctx.save(); ctx.beginPath(); ctx.rect(60, 22, 200, VH - 40); ctx.clip();
        ctx.beginPath();
        for (let a = -60; a <= 60; a += 10) {
          const pa = a * D2R;
          const P1 = projPoint(PL.x + Math.sin(ph - 0.06) * Math.cos(pa) * 1000, PL.y + Math.sin(pa) * 1000, PL.z + Math.cos(ph - 0.06) * Math.cos(pa) * 1000);
          const P2 = projPoint(PL.x + Math.sin(ph + 0.06) * Math.cos(pa) * 1000, PL.y + Math.sin(pa) * 1000, PL.z + Math.cos(ph + 0.06) * Math.cos(pa) * 1000);
          if (!P1 || !P2) continue;
          const mx = (P1.x + P2.x) / 2, my = (P1.y + P2.y) / 2;
          let dx = P2.x - P1.x, dy = P2.y - P1.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
          const w = a === 0 ? 60 : 22, gap = a === 0 ? 14 : 8;
          if (a < 0) { for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 3; k++) { const s0 = gap + k * (w - gap) / 3, s1 = s0 + (w - gap) / 6; ctx.moveTo(mx + dx * s0 * s, my + dy * s0 * s); ctx.lineTo(mx + dx * s1 * s, my + dy * s1 * s); } }
          else { ctx.moveTo(mx - dx * w, my - dy * w); ctx.lineTo(mx - dx * gap, my - dy * gap); ctx.moveTo(mx + dx * gap, my + dy * gap); ctx.lineTo(mx + dx * w, my + dy * w); }
          if (a) { ctx.moveTo(mx - dx * w, my - dy * w); ctx.lineTo(mx - dx * w - dy * 3 * Math.sign(a), my - dy * w + dx * 3 * Math.sign(a)); }
        }
        ctx.stroke(); ctx.restore();
        // boresight / flight path
        ctx.beginPath(); ctx.moveTo(150, VIEW.cy); ctx.lineTo(156, VIEW.cy); ctx.moveTo(164, VIEW.cy); ctx.lineTo(170, VIEW.cy); ctx.moveTo(160, VIEW.cy - 6); ctx.lineTo(160, VIEW.cy - 3);
        ctx.stroke(); ctx.beginPath(); ctx.arc(160, VIEW.cy, 3, 0, Math.PI * 2); ctx.stroke();
        // speed / alt boxes
        ctx.strokeRect(24.5, VIEW.cy - 6.5, 34, 12); text(ctx, String(Math.round(PL.spd * 1.944)), 56, VIEW.cy - 4, HG, 1, 'right');
        text(ctx, 'KT', 41, VIEW.cy + 8, HG, 1, 'center');
        ctx.strokeRect(261.5, VIEW.cy - 6.5, 40, 12); text(ctx, String(Math.round(PL.y * 3.281)), 299, VIEW.cy - 4, HG, 1, 'right');
        text(ctx, 'R' + Math.round(Math.max(0, PL.agl) * 3.281), 281, VIEW.cy + 8, PL.agl < 60 ? '#ff4040' : HG, 1, 'center');
        text(ctx, 'T' + Math.round(PL.thr * 100), 41, VIEW.cy + 18, HG, 1, 'center');
        // nav waypoint
        const nt = navTarget();
        const wp = projPoint(nt.x, groundH(nt.x, nt.z) + 20, nt.z);
        if (wp && wp.x > 10 && wp.x < 310 && wp.y > 20 && wp.y < VH - 10) {
          ctx.beginPath(); ctx.moveTo(wp.x, wp.y - 5); ctx.lineTo(wp.x + 5, wp.y); ctx.lineTo(wp.x, wp.y + 5); ctx.lineTo(wp.x - 5, wp.y); ctx.closePath(); ctx.stroke();
        } else {
          const brg = angDiff(Math.atan2(nt.x - PL.x, nt.z - PL.z) * R2D, e.hdg);
          const x = 160 + clamp(brg * 2, -70, 70);
          ctx.beginPath(); ctx.moveTo(x, 21); ctx.lineTo(x - 3, 25); ctx.lineTo(x + 3, 25); ctx.closePath(); ctx.fill();
        }
        text(ctx, nt.code + ' ' + (Math.hypot(nt.x - PL.x, nt.z - PL.z) / 1852).toFixed(1) + 'NM', 4, 24, HG);
        // weapons
        const wtxt = PL.wpn === 0 ? 'GBU-27 x' + PL.gbu : 'AIM-9 x' + PL.aim;
        text(ctx, wtxt, 4, VH - 22, HG);
        if (PL.bayPos > 0.05) text(ctx, 'BAY OPEN', 4, VH - 12, (tick >> 3) % 2 ? '#ffd040' : HG);
        if (PL.gearPos > 0.05) text(ctx, 'GEAR', 60, VH - 12, PL.gearPos > 0.98 ? HG : '#ffd040');
        if (PL.wpn === 0) {
          const bc = bombCue();
          if (bc) {
            const tp = projPoint(bc.t.x, groundH(bc.t.x, bc.t.z) + 5, bc.t.z);
            if (tp && tp.y < VH) { ctx.strokeRect(tp.x - 5.5, tp.y - 5.5, 11, 11); }
            const cue = bc.inRange ? 'RELEASE' : bc.d < bc.range ? 'TOO CLOSE' : 'RNG ' + ((bc.d - bc.range) / 1000).toFixed(1) + 'KM';
            text(ctx, cue, 316, VH - 22, bc.inRange ? (tick >> 2) % 2 ? '#ffffff' : HG : HG, 1, 'right');
            // release cue bar
            const k = clamp((bc.d - bc.range) / 4000, -0.2, 1);
            ctx.strokeRect(306.5, 40.5, 6, 80); ctx.fillRect(305, 40 + 80 - (k + 0.2) / 1.2 * 80, 10, 2);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(306, 120 - 0.2 / 1.2 * 80 - 1, 8, 1);
          }
        } else {
          const t = airLock();
          if (t) { const tp = projPoint(t.x, t.y, t.z); if (tp) { ctx.strokeStyle = '#ff4040'; ctx.beginPath(); ctx.arc(tp.x, tp.y, 7, 0, Math.PI * 2); ctx.stroke(); text(ctx, 'LOCK', tp.x, tp.y + 10, '#ff4040', 1, 'center'); } }
          text(ctx, t ? 'SHOOT' : 'NO LOCK', 316, VH - 22, t ? '#ff4040' : HG, 1, 'right');
        }
        // fighters in view: diamonds
        ctx.strokeStyle = '#ffd040';
        for (const f of fighters) if (f.alive) { const p = projPoint(f.x, f.y, f.z); if (p && p.z < 9000 && p.y < VH) { ctx.strokeRect(p.x - 4.5, p.y - 4.5, 9, 9); } }
        // warnings
        if (detected) text(ctx, 'DETECTED', 160, 26, (tick >> 3) % 2 ? '#ff4040' : '#ffd040', 1, 'center');
        if (launchWarn > 0 && (tick >> 2) % 2) shadowText(ctx, 'MISSILE', 160, 36, '#ff4040', 2, 'center');
        if (PL.stall && (tick >> 3) % 2) text(ctx, 'STALL', 160, VH - 40, '#ff4040', 1, 'center');
        if (PL.agl < 120 && PL.F[1] < -0.15 && !PL.onGround && (tick >> 3) % 2) shadowText(ctx, 'PULL UP', 160, VH - 52, '#ff4040', 2, 'center');
        if (msgT > 0) shadowText(ctx, msg, 160, VH - 34, msgC, 1, 'center');
      }
      function mfdFrame(ctx, x, y, w, h, title) {
        ctx.fillStyle = '#1a1c20'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        ctx.fillStyle = '#020604'; ctx.fillRect(x, y, w, h);
        if (title) text(ctx, title, x + 2, y + 2, '#2a8a46');
      }
      function drawMap(ctx, x, y, w, h, scale, cxw, czw, full) {
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        const mx = wx => x + w / 2 + (wx - cxw) * scale, my = wz => y + h / 2 - (wz - czw) * scale;
        // terrain hints
        ctx.fillStyle = '#0c1a10';
        for (const m of MOUNT) { ctx.beginPath(); ctx.arc(mx(m[0]), my(m[1]), m[2] * scale, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = '#1a3a6a'; ctx.lineWidth = Math.max(1, 140 * scale); ctx.beginPath();
        RIVER.forEach((p, i) => i ? ctx.lineTo(mx(p[0]), my(p[1])) : ctx.moveTo(mx(p[0]), my(p[1]))); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = '#4080ff'; ctx.fillRect(mx(BASE.x) - 1, my(BASE.z + BASE.len / 2), 3, BASE.len * scale + 1);
        text(ctx, 'B', mx(BASE.x) + 4, my(BASE.z) - 3, '#4080ff');
        // threat circles
        for (const s of sites) {
          if (!s.alive) continue;
          const px = mx(s.x), py = my(s.z);
          if (s.R0) {
            const rr = (s.rr || s.R0 * PL.sig) * scale;
            ctx.strokeStyle = s.lock > 0 ? '#ff3030' : s.t === 'sam' ? '#a03030' : '#a08030';
            ctx.beginPath(); ctx.arc(px, py, Math.max(1, rr), 0, Math.PI * 2); ctx.stroke();
          }
          if (s.target) { ctx.strokeStyle = '#40ff70'; ctx.strokeRect(px - 3.5, py - 3.5, 7, 7); if (full) text(ctx, s.target === 1 ? 'PRI' : 'SEC', px + 6, py - 3, '#40ff70'); }
          else { ctx.fillStyle = s.t === 'sam' ? '#ff5050' : s.t === 'radar' ? '#ffb040' : '#c0c0c0'; ctx.fillRect(px - 1, py - 1, 3, 3); }
          if (s.t === 'airbase' && full) text(ctx, 'AB', px + 4, py - 3, '#c0c0c0');
        }
        for (const s of sites) if (!s.alive && s.target) { ctx.strokeStyle = '#2a6a3a'; ctx.beginPath(); ctx.moveTo(mx(s.x) - 4, my(s.z) - 4); ctx.lineTo(mx(s.x) + 4, my(s.z) + 4); ctx.moveTo(mx(s.x) + 4, my(s.z) - 4); ctx.lineTo(mx(s.x) - 4, my(s.z) + 4); ctx.stroke(); }
        if (awacs && awacs.alive) {
          ctx.strokeStyle = awacs.lock > 0 ? '#ff3030' : '#806020'; ctx.beginPath(); ctx.arc(mx(awacs.x), my(awacs.z), Math.max(1, (awacs.rr || awacs.R0 * PL.sig) * scale), 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#ffd040'; ctx.fillRect(mx(awacs.x) - 2, my(awacs.z) - 1, 5, 3);
        }
        for (const f of fighters) if (f.alive && Math.hypot(f.x - PL.x, f.z - PL.z) < 20000) { ctx.fillStyle = '#ff8080'; ctx.fillRect(mx(f.x) - 1, my(f.z) - 1, 3, 3); }
        for (const m of missiles) { ctx.fillStyle = m.kind === 'aim' ? '#fff' : '#ff4040'; ctx.fillRect(mx(m.x), my(m.z), 1.5, 1.5); }
        // player
        if (state !== 'brief') {
          const e = eul(), a = e.hdg * D2R, px = mx(PL.x), py = my(PL.z);
          ctx.fillStyle = '#ffffff'; ctx.beginPath();
          ctx.moveTo(px + Math.sin(a) * 5, py - Math.cos(a) * 5); ctx.lineTo(px + Math.sin(a + 2.5) * 4, py - Math.cos(a + 2.5) * 4); ctx.lineTo(px + Math.sin(a - 2.5) * 4, py - Math.cos(a - 2.5) * 4); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      function targetCam(ctx, x, y, w, h) {
        const t = PL.wpn === 0 ? bombTarget() : airLock();
        mfdFrame(ctx, x, y, w, h, '');
        if (!t) { text(ctx, 'NO TARGET', x + w / 2, y + h / 2 - 3, '#2a8a46', 1, 'center'); return; }
        const ty = t.y !== undefined && t.y > 50 ? t.y : groundH(t.x, t.z) + 8;
        const d = Math.hypot(t.x - PL.x, ty - PL.y, t.z - PL.z);
        if (d > 16000) { text(ctx, 'OUT OF RANGE', x + w / 2, y + h / 2 - 3, '#2a8a46', 1, 'center'); text(ctx, (d / 1000).toFixed(1) + ' KM', x + w / 2, y + h / 2 + 7, '#2a8a46', 1, 'center'); return; }
        const fov = clamp(Math.atan2(160, d) * 2 * R2D, 0.6, 50);
        setView(x, y, w, h, fov);
        lookAt(PL.x, PL.y - 3, PL.z, t.x, ty, t.z);
        IR = true;
        drawScene(ctx, { near: 3000, fx: t.x, fz: t.z });
        IR = false;
        ctx.strokeStyle = '#c0ffd0'; ctx.lineWidth = 1; ctx.beginPath();
        const cx = x + w / 2, cy = y + h / 2;
        ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 4, cy); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 14, cy); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 4); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 14); ctx.stroke();
        const lock = PL.wpn === 0 ? laserLock(t) : true;
        text(ctx, (t.name || 'FIGHTER').slice(0, 16), x + 2, y + 2, '#c0ffd0');
        text(ctx, (lock ? 'LASER ' : 'NO LOS ') + (d / 1000).toFixed(1) + 'KM', x + 2, y + h - 9, lock ? '#c0ffd0' : '#ff6060');
        setView(0, 0, W, VH, 60);
      }
      function panel(ctx) {
        ctx.fillStyle = '#0a0b0e'; ctx.fillRect(0, VH, W, H - VH);
        const y = VH + 4, h = H - VH - 7;
        mfdFrame(ctx, 3, y, 100, h, '');
        drawMap(ctx, 3, y, 100, h, 100 / 30000, PL.x, PL.z, false);
        text(ctx, 'MAP', 5, y + 2, '#2a8a46');
        targetCam(ctx, 110, y, 100, h);
        mfdFrame(ctx, 217, y, 100, h, '');
        // EMV (signature) meter
        text(ctx, 'EMV', 220, y + 3, '#2a8a46');
        const sw = 70, sv = clamp(PL.sig / 1.0, 0, 1);
        ctx.fillStyle = '#0a2010'; ctx.fillRect(242, y + 3, sw, 7);
        ctx.fillStyle = sv < 0.35 ? '#30d060' : sv < 0.6 ? '#e0c030' : '#ff3030'; ctx.fillRect(242, y + 3, sw * sv, 7);
        let ly = y + 14;
        const line = (s, c) => { text(ctx, s, 220, ly, c || '#40ff70'); ly += 9; };
        line('FUEL ' + Math.round(PL.fuel) + '%', PL.fuel < 15 ? '#ff4040' : '#40ff70');
        line('GBU ' + PL.gbu + ' AIM ' + PL.aim, '#40ff70');
        line('CHF ' + PL.chaff + ' FLR ' + PL.flares, '#40ff70');
        line('DMG ' + (PL.hp >= 2 ? 'NONE' : 'HEAVY'), PL.hp >= 2 ? '#40ff70' : '#ff4040');
        line('JETS ' + lives + ' SC ' + score, '#ffd040');
        line(alerted ? 'ALERT: HIGH' : 'ALERT: LOW', alerted ? '#ff4040' : '#2a8a46');
      }
      function playerTuple() { return { x: PL.x, y: PL.y, z: PL.z, R: PL.R, U: PL.U, F: PL.F }; }
      function renderFly(ctx) {
        setView(0, 0, W, VH, 60);
        if (view === 0) {
          setCam(PL.x, PL.y + 1, PL.z, PL.R, PL.U, PL.F);
          drawScene(ctx);
        } else {
          const h = Math.atan2(PL.F[0], PL.F[2]);
          const ex = PL.x - Math.sin(h) * 40, ez = PL.z - Math.cos(h) * 40, ey = Math.max(PL.y + 9 - PL.F[1] * 30, groundH(ex, ez) + 3);
          lookAt(ex, ey, ez, PL.x + PL.F[0] * 20, PL.y + PL.F[1] * 20, PL.z + PL.F[2] * 20);
          drawScene(ctx, { player: playerTuple() });
        }
        if (view === 0) { setCam(PL.x, PL.y + 1, PL.z, PL.R, PL.U, PL.F); hud(ctx); }
        else { setCam(PL.x, PL.y + 1, PL.z, PL.R, PL.U, PL.F); text(ctx, Math.round(PL.spd * 1.944) + 'KT ' + Math.round(PL.y * 3.281) + 'FT', 4, 4, HG); if (detected) text(ctx, 'DETECTED', 160, 26, '#ff4040', 1, 'center'); if (launchWarn > 0 && (tick >> 2) % 2) shadowText(ctx, 'MISSILE', 160, 36, '#ff4040', 2, 'center'); if (msgT > 0) shadowText(ctx, msg, 160, VH - 34, msgC, 1, 'center'); }
        panel(ctx);
        if (mapOn) {
          mfdFrame(ctx, 20, 12, 280, 150, '');
          drawMap(ctx, 20, 12, 280, 150, 150 / 60000, 0, 14000, true);
          text(ctx, 'TACTICAL MAP  M: CLOSE', 24, 15, '#40ff70');
        }
      }
      function box(ctx, x, y, w, h) { ctx.fillStyle = 'rgba(0,4,2,0.88)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#2a8a46'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
      function renderTitle(ctx) {
        setView(0, 0, W, H, 50);
        const a = api.time * 0.4;
        lookAt(Math.sin(a) * 32, 9, Math.cos(a) * 32 + 2000, 0, 2, 2000);
        drawScene(ctx, { player: { x: 0, y: 0, z: 2000, R: [1, 0, 0], U: [0, 1, 0], F: [0, 0, 1] }, near: 1 });
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, 72);
        shadowText(ctx, 'F-117A', W / 2, 8, '#c8d0dc', 4, 'center');
        shadowText(ctx, 'STEALTH FIGHTER', W / 2, 42, '#40ff70', 2, 'center');
        text(ctx, '\u00a9 1991  ARCADE-STYLE VERSION', W / 2, 60, '#6a7a8a', 1, 'center');
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 150, W, 90);
        text(ctx, 'FLY 5 NIGHT STRIKES. STAY OUT OF THE', W / 2, 154, '#9ab', 1, 'center');
        text(ctx, 'RADAR CIRCLES: SLOW, LOW, BAY CLOSED.', W / 2, 164, '#9ab', 1, 'center');
        text(ctx, 'HI SCORE ' + hi, W / 2, 180, '#fff', 1, 'center');
        const blink = (tick >> 5) % 2 === 0;
        if (coinFlash > 0) { if ((coinFlash >> 3) % 2) text(ctx, 'INSERT COIN', W / 2, 198, '#f44', 1, 'center'); }
        else if (blink) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 198, '#38f4ff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 214, '#aaa', 1, 'center');
        text(ctx, 'RANKS: ' + RANKS[0] + ' TO GENERAL', W / 2, 228, '#556', 1, 'center');
      }
      function renderBrief(ctx) {
        ctx.fillStyle = '#020604'; ctx.fillRect(0, 0, W, H);
        const md = M.md;
        text(ctx, 'MISSION ' + (mIdx + 1) + (cyc ? '  (TOUR ' + (cyc + 1) + ')' : '') + ' - ' + md.name, W / 2, 4, '#40ff70', 1, 'center');
        mfdFrame(ctx, 6, 16, 190, 150, '');
        drawMap(ctx, 6, 16, 190, 150, 150 / 60000, 0, 13000, true);
        let y = 18;
        const tl = (s, c) => { text(ctx, s, 202, y, c || '#9ab'); y += 10; };
        tl('PRIMARY:', '#40ff70'); tl(' ' + md.pri[3].slice(0, 19), '#fff'); tl('SECONDARY:', '#40ff70'); tl(' ' + md.sec[3].slice(0, 19), '#fff');
        y += 4; tl('THREATS:', '#ff6060'); tl(' SAM SITES ' + md.sams.length); tl(' RADARS ' + md.radars.length);
        tl(' FIGHTERS ' + (md.bases.reduce((a, b) => a + b[2] + cyc, 0) + md.cap)); tl(' AWACS ' + (md.awacs ? 'YES' : 'NO'));
        y += 4; tl('LOADOUT:', '#40ff70'); tl(' 2 GBU-27, 2 AIM-9');
        for (let i = 0; i < md.text.length; i++) text(ctx, md.text[i], W / 2, 172 + i * 10, '#c8d0dc', 1, 'center');
        text(ctx, 'JETS ' + lives + '   SCORE ' + score + '   RANK ' + RANKS[rankOf(score)], W / 2, 206, '#ffd040', 1, 'center');
        if (msgT > 0) text(ctx, msg, W / 2, 218, msgC, 1, 'center');
        if ((tick >> 4) % 2) text(ctx, 'PRESS START TO LAUNCH', W / 2, 228, '#38f4ff', 1, 'center');
      }
      function ribbon(ctx, x, y, cols) {
        const w = 36 / cols.length;
        for (let i = 0; i < cols.length; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(x + i * w, y, Math.ceil(w), 10); }
        ctx.strokeStyle = '#888'; ctx.strokeRect(x - 0.5, y - 0.5, 37, 11);
        ctx.fillStyle = '#d0a030'; ctx.beginPath(); ctx.arc(x + 18, y + 22, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#806010'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 2.5 : 6; ctx.lineTo(x + 18 + Math.cos(a) * r, y + 22 + Math.sin(a) * r); }
        ctx.fill();
      }
      function renderDebrief(ctx) {
        ctx.fillStyle = '#020604'; ctx.fillRect(0, 0, W, H);
        shadowText(ctx, deb.ok ? 'MISSION SUCCESSFUL' : 'MISSION FAILED', W / 2, 6, deb.ok ? '#40ff70' : '#ff5050', 2, 'center');
        text(ctx, M.md.name, W / 2, 24, '#9ab', 1, 'center');
        let y = 40;
        for (const [s, v] of deb.lines) { text(ctx, s.slice(0, 40), 10, y, '#c8d0dc'); text(ctx, String(v), 310, y, v < 0 ? '#ff6060' : '#40ff70', 1, 'right'); y += 11; }
        y += 4;
        text(ctx, 'MISSION SCORE', 10, y, '#ffd040'); text(ctx, String(deb.s), 310, y, '#ffd040', 1, 'right'); y += 11;
        text(ctx, 'CAREER SCORE', 10, y, '#ffd040'); text(ctx, String(score), 310, y, '#ffd040', 1, 'right'); y += 16;
        text(ctx, 'RANK: ' + RANKS[deb.rank] + (deb.promoted ? '  PROMOTED!' : ''), 10, y, deb.promoted ? '#ffffff' : '#c8d0dc'); y += 14;
        if (deb.medal) { ribbon(ctx, 12, y, deb.medal[2]); text(ctx, 'AWARDED THE', 60, y + 4, '#c8d0dc'); text(ctx, deb.medal[1], 60, y + 16, '#ffd040'); }
        else if (!deb.ok) text(ctx, 'THE PRIMARY TARGET SURVIVED. FLY IT AGAIN.', 10, y, '#ff8080');
        if ((tick >> 4) % 2) text(ctx, 'PRESS START', W / 2, 228, '#38f4ff', 1, 'center');
      }
      function renderDown(ctx) {
        setView(0, 0, W, H, 60);
        const ex = down.x + 90, ez = down.z - 120, ey = Math.max(down.y + 40, groundH(ex, ez) + 10);
        lookAt(ex, ey, ez, down.x, down.y, down.z);
        drawScene(ctx, { player: { x: down.x, y: down.y, z: down.z, R: down.R, U: down.U, F: down.F } });
        box(ctx, 40, 168, 240, 52);
        shadowText(ctx, down.why, W / 2, 174, '#ff5050', down.why.length > 16 ? 1 : 2, 'center');
        if (stT > 60) text(ctx, down.ej ? 'PILOT EJECTED - RESCUED BY CSAR' : 'PILOT INJURED - AIRCRAFT LOST', W / 2, 194, '#c8d0dc', 1, 'center');
        text(ctx, 'JETS LEFT ' + Math.max(0, lives - 1), W / 2, 206, '#ffd040', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') return renderTitle(ctx);
        if (state === 'brief') return renderBrief(ctx);
        if (state === 'debrief') return renderDebrief(ctx);
        if (state === 'down') return renderDown(ctx);
        if (state === 'over' || state === 'wait') {
          renderTitle(ctx);
          box(ctx, 50, 80, 220, 70);
          shadowText(ctx, 'GAME OVER', W / 2, 90, '#ff5050', 2, 'center');
          text(ctx, 'FINAL SCORE ' + score, W / 2, 114, '#fff', 1, 'center');
          text(ctx, 'FINAL RANK ' + RANKS[rankOf(score)], W / 2, 128, '#ffd040', 1, 'center');
          return;
        }
        renderFly(ctx);
        if (state === 'pause') {
          const it = pauseItems();
          box(ctx, 90, 24, 140, 22 + it.length * 11);
          text(ctx, 'PAUSED', W / 2, 30, '#40ff70', 1, 'center');
          for (let i = 0; i < it.length; i++) text(ctx, (i === pauseSel ? '> ' : '  ') + it[i], 98, 44 + i * 11, i === pauseSel ? '#ffd040' : '#c8d0dc');
        }
      }
      return {
        update, render, destroy() { },
        debug: { get PL() { return PL; }, get state() { return state; }, get M() { return M; }, get sites() { return sites; }, get missiles() { return missiles; }, get bombs() { return bombs; }, get fighters() { return fighters; }, get score() { return score; }, get lives() { return lives; }, get mIdx() { return mIdx; }, get cyc() { return cyc; }, get down() { return down; }, get deb() { return deb; }, eul, bombCue, bombTarget, laserLock, groundH, BASE, get detected() { return detected; }, get alerted() { return alerted; } }
      };
    }
  });
})();
