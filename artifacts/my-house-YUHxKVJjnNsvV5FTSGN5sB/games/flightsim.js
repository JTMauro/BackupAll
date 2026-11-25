// Flight Simulator -- an original homage to the early-80s home-computer flight sims.
// Own flat-shaded polygon renderer (painter's sort), light-aircraft flight model, six-pack cockpit,
// three airports, a river city with a bridge, mountains, and a flight-school course of challenges.
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
  let SKY = [120, 172, 228], HAZE = [178, 204, 226], HAZE0 = 1800, HAZE1 = 16000;
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
    const t = clamp((z - HAZE0) / (HAZE1 - HAZE0), 0, 0.88);
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
    ctx.fillStyle = 'rgb(' + SKY.join(',') + ')'; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
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
  const LIGHT = nrm([-0.35, 0.85, -0.4]);
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

  const AIRPORTS = [
    { name: 'HOME FIELD', code: 'HOM', x: 0, z: 0, hdg: 0, len: 1400, wid: 30 },
    { name: 'LAKESIDE', code: 'LKS', x: 5500, z: 9500, hdg: 90, len: 1200, wid: 30 },
    { name: 'PINE VALLEY', code: 'PNV', x: -6000, z: 8000, hdg: 40, len: 1000, wid: 25 }
  ];
  for (const a of AIRPORTS) { a.dx = Math.sin(a.hdg * D2R); a.dz = Math.cos(a.hdg * D2R); a.rx = a.dz; a.rz = -a.dx; }
  const MOUNTAINS = [
    [-9000, 11000, 3000, 1400], [-4000, 13800, 2500, 1100], [-11500, 6000, 2000, 900], [-2400, 11300, 1300, 650],
    [1500, 15500, 3500, 1500], [-13000, 14000, 3000, 1700], [6000, 16800, 2500, 1000], [11000, 13000, 2800, 1200],
    [10000, -6000, 2500, 800], [-9000, -7000, 3000, 1000], [3000, -9500, 2000, 600], [14000, 3000, 2600, 950]
  ];
  const RIVER = [[-18000, 2000], [-9000, 3000], [-4000, 4500], [0, 4300], [1200, 4000], [5200, 4000], [7000, 3500], [10000, 5000], [18000, 4500]];
  const RIVER_HW = 60;
  const LAKE = { x: 5500, z: 11800, rx: 2500, rz: 1250 };
  const BRIDGE = { x: 2500, z0: 3945, z1: 4055, deck: 28 };
  const ROADS = [
    [[60, -500], [60, 600], [1000, 1800], [2500, 2600], [2500, 6400], [4000, 8200], [5200, 9000]],
    [[-60, 600], [-2000, 3000], [-4000, 5500], [-5500, 7500]],
    [[1000, 4700], [4200, 4700]], [[1000, 3300], [4200, 3300]],
    [[-18000, -2000], [18000, -1500]]
  ];
  let WORLD = null;
  function buildWorld() {
    const r = rng(1982);
    const decals = [], objs = [], solids = [];
    function decal(v, c, near) {
      let x = 0, z = 0, rr = 0; const n = v.length / 3;
      for (let i = 0; i < n; i++) { x += v[i * 3]; z += v[i * 3 + 2]; }
      x /= n; z /= n;
      for (let i = 0; i < n; i++) rr = Math.max(rr, Math.hypot(v[i * 3] - x, v[i * 3 + 2] - z));
      decals.push({ v, n, c, x, z, r: rr, near: near || 0 });
    }
    function rectD(cx, cz, dx, dz, a0, a1, c0, c1, c, y, near) {
      const rx = dz, rz = -dx; y = y || 0;
      decal([cx + dx * a0 + rx * c0, y, cz + dz * a0 + rz * c0, cx + dx * a1 + rx * c0, y, cz + dz * a1 + rz * c0,
        cx + dx * a1 + rx * c1, y, cz + dz * a1 + rz * c1, cx + dx * a0 + rx * c1, y, cz + dz * a0 + rz * c1], c, near);
    }
    function strip(pts, hw, c, near) {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const l = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / l, dz = (z1 - z0) / l;
        rectD(x0, z0, dx, dz, -hw * 0.9, l + hw * 0.9, -hw, hw, c, 0, near);
      }
    }
    // farmland patchwork
    const FIELD = [[96, 150, 62], [118, 160, 70], [150, 150, 80], [88, 128, 54], [128, 140, 72], [160, 168, 92]];
    for (let i = 0; i < 90; i++) {
      const x = (r() - 0.5) * 30000, z = (r() - 0.5) * 30000;
      if (x > 800 && x < 4400 && z > 2600 && z < 5500) continue;
      const w = 250 + r() * 700, d = 250 + r() * 700;
      decal([x, 0, z, x + w, 0, z, x + w, 0, z + d, x, 0, z + d], FIELD[(r() * FIELD.length) | 0], 0);
    }
    // lake
    const lv = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; lv.push(LAKE.x + Math.cos(a) * LAKE.rx, 0, LAKE.z + Math.sin(a) * LAKE.rz); }
    decal(lv, [56, 104, 176]);
    strip(RIVER, RIVER_HW, [56, 104, 176]);
    // city ground
    decal([1100, 0, 2700, 4000, 0, 2700, 4000, 0, 5500, 1100, 0, 5500], [128, 128, 118]);
    for (const rd of ROADS) strip(rd, 7, [70, 70, 74]);
    // airports
    for (const a of AIRPORTS) {
      rectD(a.x, a.z, a.dx, a.dz, -a.len / 2 - 60, a.len / 2 + 60, -a.wid * 3, a.wid * 3, [104, 150, 70]);
      rectD(a.x, a.z, a.dx, a.dz, -a.len / 2, a.len / 2, -a.wid / 2, a.wid / 2, [62, 62, 66]);
      // apron + taxiway
      rectD(a.x, a.z, a.dx, a.dz, -150, 150, a.wid / 2 + 50, a.wid / 2 + 160, [90, 90, 92]);
      rectD(a.x, a.z, a.dx, a.dz, -10, 10, a.wid / 2, a.wid / 2 + 50, [90, 90, 92]);
      for (let s = -a.len / 2 + 80; s < a.len / 2 - 80; s += 60) rectD(a.x, a.z, a.dx, a.dz, s, s + 30, -0.6, 0.6, [235, 235, 235], 0, 1);
      for (const e of [-1, 1]) {
        for (let k = -5; k <= 5; k++) if (k) rectD(a.x, a.z, a.dx, a.dz, e * (a.len / 2 - 6) - 22 * (e > 0 ? 1 : 0), e * (a.len / 2 - 6) + 22 * (e < 0 ? 1 : 0), k * 2.5 - 0.8, k * 2.5 + 0.8, [235, 235, 235], 0, 1);
        const ap = e * (a.len / 2 - 300);
        rectD(a.x, a.z, a.dx, a.dz, ap - 22, ap + 22, -9, -5, [235, 235, 235], 0, 1);
        rectD(a.x, a.z, a.dx, a.dz, ap - 22, ap + 22, 5, 9, [235, 235, 235], 0, 1);
      }
      // hangars + tower
      const o = mkObj();
      for (let k = 0; k < 3; k++) {
        const s = -110 + k * 75, off = a.wid / 2 + 175;
        const cx = a.x + a.dx * s + a.rx * off, cz = a.z + a.dz * s + a.rz * off;
        addBox(o, cx - 22, 0, cz - 22, cx + 22, 12, cz + 22, [170, 160, 140], [150, 70, 60]);
        solids.push([cx - 22, 0, cz - 22, cx + 22, 12, cz + 22]);
      }
      const tx = a.x + a.dx * 130 + a.rx * (a.wid / 2 + 190), tz = a.z + a.dz * 130 + a.rz * (a.wid / 2 + 190);
      addBox(o, tx - 4, 0, tz - 4, tx + 4, 20, tz + 4, [200, 200, 190]);
      addBox(o, tx - 6, 20, tz - 6, tx + 6, 26, tz + 6, [80, 120, 140], [60, 60, 60]);
      solids.push([tx - 6, 0, tz - 6, tx + 6, 26, tz + 6]);
      objs.push(finObj(o));
    }
    // mountains
    for (const m of MOUNTAINS) {
      const [mx, mz, mr, mh] = m, n = 7, o = mkObj();
      const snow = mh > 900, cut = 0.58;
      const ins = [mx, mh * 0.25, mz];
      const pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + mx * 0.001; pts.push([mx + Math.cos(a) * mr, mz + Math.sin(a) * mr]); }
      for (let i = 0; i < n; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % n];
        const m0 = [mx + (p0[0] - mx) * (1 - cut), mz + (p0[1] - mz) * (1 - cut)], m1 = [mx + (p1[0] - mx) * (1 - cut), mz + (p1[1] - mz) * (1 - cut)];
        addFace(o, [p0[0], 0, p0[1], p1[0], 0, p1[1], m1[0], mh * cut, m1[1], m0[0], mh * cut, m0[1]], i % 2 ? [92, 112, 66] : [104, 118, 72], ins);
        addFace(o, [m0[0], mh * cut, m0[1], m1[0], mh * cut, m1[1], mx, mh, mz], snow ? [236, 240, 246] : [128, 116, 96], ins);
      }
      objs.push(finObj(o));
    }
    // city buildings
    const city = mkObj(), city2 = mkObj();
    const BC = [[176, 170, 160], [150, 150, 160], [190, 176, 150], [128, 120, 116], [200, 196, 190], [140, 150, 170]];
    for (let gx = 1300; gx <= 3800; gx += 210) {
      for (let gz = 2950; gz <= 5300; gz += 210) {
        if (gz > 3750 && gz < 4250) continue;
        if (Math.abs(gx - 2500) < 90) continue;
        if (r() < 0.38) continue;
        const cd = Math.hypot(gx - 2500, gz - 4000);
        const w = 40 + r() * 60, d = 40 + r() * 60, h = 15 + r() * Math.max(20, 170 - cd * 0.08);
        const o = gz < 4000 ? city : city2;
        const c = BC[(r() * BC.length) | 0];
        addBox(o, gx - w / 2, 0, gz - d / 2, gx + w / 2, h, gz + d / 2, c, [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7]);
        solids.push([gx - w / 2, 0, gz - d / 2, gx + w / 2, h, gz + d / 2]);
      }
    }
    objs.push(finObj(city), finObj(city2));
    // bridge
    const br = mkObj(), bx = BRIDGE.x;
    const deckC = [150, 70, 50], towC = [200, 90, 60];
    addBox(br, bx - 12, BRIDGE.deck, 3850, bx + 12, BRIDGE.deck + 5, 4150, deckC, [90, 90, 94]);
    solids.push([bx - 12, BRIDGE.deck, 3850, bx + 12, BRIDGE.deck + 5, 4150]);
    for (const tz of [3938, 4062]) {
      for (const sx of [-12, 10]) { addBox(br, bx + sx, 0, tz - 3, bx + sx + 2, 75, tz + 3, towC); solids.push([bx + sx, 0, tz - 3, bx + sx + 2, 75, tz + 3]); }
      addBox(br, bx - 12, 68, tz - 3, bx + 12, 73, tz + 3, towC);
      solids.push([bx - 12, 68, tz - 3, bx + 12, 73, tz + 3]);
      for (const sx of [-11, 11]) for (const k of [-1, 1]) {
        br.lines.push([bx + sx, 72, tz, bx + sx, BRIDGE.deck + 5, tz + k * 90, [60, 50, 50]]);
        br.lines.push([bx + sx, 72, tz, bx + sx, BRIDGE.deck + 5, tz + k * 45, [60, 50, 50]]);
      }
    }
    for (const e of [-1, 1]) {
      const z0 = e < 0 ? 3850 : 4150, z1 = z0 + e * 170;
      const ins = [bx, 5, (z0 + z1) / 2];
      addFace(br, [bx - 12, BRIDGE.deck + 5, z0, bx + 12, BRIDGE.deck + 5, z0, bx + 12, 0.5, z1, bx - 12, 0.5, z1], [90, 90, 94], ins);
      addFace(br, [bx - 12, BRIDGE.deck + 5, z0, bx - 12, 0, z0, bx - 12, 0, z1], deckC, ins);
      addFace(br, [bx + 12, BRIDGE.deck + 5, z0, bx + 12, 0, z0, bx + 12, 0, z1], deckC, ins);
      for (let k = 0; k < 5; k++) { const za = z0 + e * k * 34, zb = za + e * 34, hh = BRIDGE.deck + 5 - k * 6.6; solids.push([bx - 12, 0, Math.min(za, zb), bx + 12, hh, Math.max(za, zb)]); }
    }
    objs.push(finObj(br));
    // radio mast
    const mast = mkObj();
    addBox(mast, 4497, 0, 6497, 4503, 220, 6503, [210, 60, 50], [255, 255, 255]);
    solids.push([4497, 0, 6497, 4503, 220, 6503]);
    objs.push(finObj(mast));
    WORLD = { decals, objs, solids };
  }

  function groundH(x, z) {
    let h = 0;
    for (const m of MOUNTAINS) {
      const d = Math.hypot(x - m[0], z - m[1]);
      if (d < m[2] * 0.95) h = Math.max(h, m[3] * (1 - d / (m[2] * 0.95)));
    }
    return h;
  }
  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
  }
  function inWater(x, z) {
    const lx = (x - LAKE.x) / LAKE.rx, lz = (z - LAKE.z) / LAKE.rz;
    if (lx * lx + lz * lz < 0.95) return true;
    for (let i = 0; i < RIVER.length - 1; i++) if (segDist(x, z, RIVER[i][0], RIVER[i][1], RIVER[i + 1][0], RIVER[i + 1][1]) < RIVER_HW - 4) return true;
    return false;
  }
  function runwayAt(x, z) {
    for (let i = 0; i < AIRPORTS.length; i++) {
      const a = AIRPORTS[i], ox = x - a.x, oz = z - a.z;
      const al = ox * a.dx + oz * a.dz, cr = ox * a.rx + oz * a.rz;
      if (Math.abs(al) <= a.len / 2 + 5 && Math.abs(cr) <= a.wid / 2 + 3) return { i, al, cr };
    }
    return null;
  }

  // ---------- plane model (body coords: x right, y up, z forward) ----------
  const PLANE_FACES = (() => {
    const W1 = [236, 236, 230], RD = [200, 40, 36], DK = [60, 70, 90], GR = [90, 90, 90];
    const f = [];
    const nf = [-0.42, -0.42, 3.6, 0.42, -0.42, 3.6, 0.42, 0.32, 3.6, -0.42, 0.32, 3.6];
    const fr = [-0.58, -0.62, 1.7, 0.58, -0.62, 1.7, 0.58, 0.75, 1.7, -0.58, 0.75, 1.7];
    const tl = [-0.14, 0.05, -4.6, 0.14, 0.05, -4.6, 0.14, 0.45, -4.6, -0.14, 0.45, -4.6];
    const P = (a, i) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
    f.push([nf, W1]);
    for (const [a, b] of [[nf, fr], [fr, tl]]) {
      f.push([[...P(a, 0), ...P(a, 1), ...P(b, 1), ...P(b, 0)], [200, 200, 196]]);
      f.push([[...P(a, 3), ...P(a, 2), ...P(b, 2), ...P(b, 3)], W1]);
      f.push([[...P(a, 0), ...P(a, 3), ...P(b, 3), ...P(b, 0)], W1]);
      f.push([[...P(a, 1), ...P(a, 2), ...P(b, 2), ...P(b, 1)], W1]);
    }
    f.push([[-0.5, 0.55, 1.6, 0.5, 0.55, 1.6, 0.45, 0.85, 0.9, -0.45, 0.85, 0.9], DK]); // windscreen
    f.push([[-5.6, 0.82, 1.9, 5.6, 0.82, 1.9, 5.6, 0.82, 0.4, -5.6, 0.82, 0.4], W1]); // wing
    f.push([[-5.6, 0.83, 1.9, -4.6, 0.83, 1.9, -4.6, 0.83, 0.4, -5.6, 0.83, 0.4], RD]);
    f.push([[4.6, 0.83, 1.9, 5.6, 0.83, 1.9, 5.6, 0.83, 0.4, 4.6, 0.83, 0.4], RD]);
    f.push([[-1.9, 0.3, -3.5, 1.9, 0.3, -3.5, 1.9, 0.3, -4.5, -1.9, 0.3, -4.5], RD]); // stabilizer
    f.push([[0, 0.4, -3.4, 0, 1.9, -4.3, 0, 1.9, -4.8, 0, 0.4, -4.65], RD]); // fin
    f.push([[-0.9, -0.4, 3.66, 0.9, -0.4, 3.66, 0.9, 0.3, 3.66, -0.9, 0.3, 3.66], GR]); // prop disc
    return f;
  })();

  ArcadeRegistry.register({
    id: 'flightsim', title: 'Flight Simulator', year: 1982, maker: 'Original',
    width: 320, height: 240, vector: false, pointer: false,
    controls: 'Arrows: pitch/roll (Down = pull up) \u00b7 Space/A: throttle up \u00b7 X/S: throttle down \u00b7 Z/C: rudder \u00b7 G: gear \u00b7 F/R: flaps \u00b7 B: brakes \u00b7 V: view \u00b7 Enter: menu',
    marquee: { bg: '#1c4a86', fg: '#ffffff', accent: '#ffd040' },
    create(api) {
      if (!WORLD) buildWorld();
      const W = 320, H = 240, MASS = 1100, G = 9.81, S = 16.2;
      const CH = [
        { id: 'takeoff', name: 'TAKEOFF', time: 150, brief: ['DEPART HOME FIELD RUNWAY 36.', 'FULL THROTTLE, ROTATE AT 55 KT', '(HOLD DOWN), CLIMB TO 1000 FT.'] },
        { id: 'landing', name: 'LANDING', time: 240, brief: ['YOU ARE 3 MILES SOUTH OF HOME.', 'GEAR DOWN, FLAPS, 65 KT FINAL.', 'TOUCH DOWN SOFTLY AND STOP.'] },
        { id: 'xc', name: 'CROSS-COUNTRY', time: 600, brief: ['FLY FROM HOME FIELD TO LAKESIDE', '(FOLLOW THE ADF NEEDLE).', 'LAND ON RUNWAY 09/27 AND STOP.'] },
        { id: 'bridge', name: 'UNDER THE BRIDGE', time: 120, brief: ['FOLLOW THE RIVER WEST TO THE', 'CITY. FLY UNDER THE BRIDGE DECK', 'THEN CLIMB ABOVE 500 FT.'] },
        { id: 'xwind', name: 'CROSSWIND LANDING', time: 240, brief: ['LAKESIDE RUNWAY 09, STRONG', 'NORTH WIND. CRAB INTO THE WIND,', 'LAND ON THE CENTERLINE.'] }
      ];
      const MENU = ['FLIGHT SCHOOL (ALL 5)', 'FREE FLIGHT', 'TAKEOFF', 'LANDING', 'CROSS-COUNTRY', 'UNDER THE BRIDGE', 'CROSSWIND LANDING'];
      let state = 'title', menuSel = 0, coinFlash = 0, tick = 0;
      let mode = 'course', chIdx = 0, round = 1, score = 0, lives = 3, chT = 0, chScore = 0;
      let hi = api.getHiScore(5000);
      let view = 0; // 0 cockpit, 1 chase
      let pauseSel = 0, result = null, crash = null, msg = '', msgT = 0, stT = 0;
      let windBase = [0, 0, 0], gust = 0, ch = null, flags = {};
      const replay = [];
      const parts = [];
      const P = {};
      function resetPlane(x, z, hdg, y, spd, ground) {
        const h = hdg * D2R;
        P.x = x; P.z = z; P.F = [Math.sin(h), 0, Math.cos(h)]; P.R = [Math.cos(h), 0, -Math.sin(h)]; P.U = [0, 1, 0];
        P.y = ground ? groundH(x, z) + 1.5 : y;
        P.vx = P.F[0] * spd; P.vy = 0; P.vz = P.F[2] * spd;
        P.p = 0; P.q = 0; P.r = 0; P.elev = 0; P.ail = 0; P.rud = 0; P.wob = 0;
        P.thr = ground ? 0 : 0.55; P.flaps = 0; P.flapPos = 0; P.gear = ground ? 1 : 0; P.gearPos = P.gear;
        P.onGround = !!ground; P.brk = false; P.aoa = 0; P.beta = 0; P.V = spd; P.stall = false; P.td = null; P.turn = 0;
        P.maxCl = 0; P.lastHdg = hdg; P.gs = spd;
        replay.length = 0;
      }
      function eul() {
        return { pitch: Math.asin(clamp(P.F[1], -1, 1)), roll: Math.atan2(-P.R[1], P.U[1]), hdg: wrap360(Math.atan2(P.F[0], P.F[2]) * R2D) };
      }
      function wind() {
        const g = gust;
        return [windBase[0] * (1 + g), 0, windBase[2] * (1 + g)];
      }
      function setWind(fromDeg, spd) { const a = fromDeg * D2R; windBase = [-Math.sin(a) * spd, 0, -Math.cos(a) * spd]; }
      function windInfo() { const s = Math.hypot(windBase[0], windBase[2]); return { from: s < 0.1 ? 0 : wrap360(Math.atan2(-windBase[0], -windBase[2]) * R2D), kt: s * 1.944 }; }

      // ---------- challenges ----------
      function target() {
        if (!ch) return null;
        if (ch.id === 'xc' || ch.id === 'xwind') return AIRPORTS[1];
        if (ch.id === 'bridge') return { code: 'BRG', x: BRIDGE.x, z: 4000 };
        if (ch.id === 'free') { let best = null, bd = 1e9; for (const a of AIRPORTS) { const d = Math.hypot(a.x - P.x, a.z - P.z); if (d > 1500 && d < bd) { bd = d; best = a; } } return best; }
        return AIRPORTS[0];
      }
      function setupChallenge() {
        flags = { maxCl: 0, under: false, passed: false };
        gust = 0;
        const extra = (round - 1) * 2.5;
        const id = ch.id;
        if (id === 'free') { resetPlane(0, -640, 0, 0, 0, true); setWind(270, 3); }
        else if (id === 'takeoff') { resetPlane(0, -640, 0, 0, 0, true); setWind(360, 3 + extra); }
        else if (id === 'landing') { resetPlane(0, -5600, 0, 300, 50, false); setWind(10, 4 + extra); }
        else if (id === 'xc') { resetPlane(0, -640, 0, 0, 0, true); setWind(300, 5 + extra); }
        else if (id === 'bridge') { resetPlane(5000, 4000, 270, 110, 52, false); setWind(90, 2 + extra * 0.5); }
        else if (id === 'xwind') { resetPlane(-500, 9500, 90, 300, 50, false); setWind(0, 9 + extra); }
        chT = 0; view = 0;
      }
      function startChallenge() {
        ch = mode === 'free' ? { id: 'free', name: 'FREE FLIGHT', time: 0, brief: ['NO RULES. EXPLORE THE VALLEY,', 'THE CITY AND ITS BRIDGE, THREE', 'AIRPORTS. ENTER FOR THE MENU.'] } : CH[chIdx];
        setupChallenge();
        state = 'brief'; stT = 0;
      }
      function landingScore(td, mult) {
        const lines = [];
        let s = 0;
        const fpm = -td.vs * 196.85;
        const a = fpm < 150 ? 400 : fpm < 300 ? 300 : fpm < 500 ? 180 : 60; s += a; lines.push(['SINK ' + Math.round(fpm) + ' FPM', a]);
        const c = Math.abs(td.cr) < 2 ? 300 : Math.abs(td.cr) < 5 ? 200 : Math.abs(td.cr) < 10 ? 100 : 20; s += c; lines.push(['CENTERLINE ' + Math.abs(td.cr).toFixed(1) + ' M', c]);
        const he = Math.abs(td.hdgErr);
        const h = he < 3 ? 200 : he < 8 ? 120 : 40; s += h; lines.push(['ALIGNMENT ' + he.toFixed(0) + ' DEG', h]);
        const z = td.dist > 150 && td.dist < 500 ? 200 : td.dist < 800 ? 100 : 0; s += z; lines.push(['TOUCHDOWN ' + Math.round(td.dist) + ' M IN', z]);
        const g = Math.round(s * mult);
        return { lines, s: g, grade: s >= 1000 ? 'GREASED IT!' : s >= 750 ? 'NICE LANDING' : s >= 500 ? 'SAFE ARRIVAL' : 'ANY LANDING YOU WALK AWAY FROM...' };
      }
      function complete(r) {
        r.timeBonus = r.timeBonus || 0;
        chScore = r.s + r.timeBonus;
        score += chScore;
        if (score > hi) { hi = score; api.setHiScore(hi); }
        result = r; state = 'result'; stT = 0;
        api.audio.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25], [784, 0.1], [1047, 0.35]], { type: 'square', vol: 0.12 });
      }
      function fail(reason) {
        crash = { reason, t: 0, x: P.x, y: P.y, z: P.z, noBoom: true, rp: replay.slice() };
        state = 'crash';
        api.audio.melody([[392, 0.18], [330, 0.18], [262, 0.4]], { type: 'triangle', vol: 0.14 });
      }
      function checkChallenge() {
        const e = eul(), agl = P.y - groundH(P.x, P.z);
        const id = ch.id;
        if (id === 'free') return;
        if (ch.time && chT > ch.time) { fail('OUT OF TIME'); return; }
        if (id === 'takeoff') {
          const rw = runwayAt(P.x, P.z);
          if (P.onGround && rw && P.V > 5) flags.maxCl = Math.max(flags.maxCl, Math.abs(rw.cr));
          if (!P.onGround && agl > 305) {
            const c = flags.maxCl < 3 ? 300 : flags.maxCl < 8 ? 150 : 50;
            complete({ title: 'TAKEOFF COMPLETE', lines: [['CLIMB OUT', 500], ['CENTERLINE ' + flags.maxCl.toFixed(1) + ' M', c]], s: 500 + c, timeBonus: Math.max(0, Math.round((ch.time - chT) * 3)) });
          }
        } else if (id === 'landing' || id === 'xc' || id === 'xwind') {
          const tgt = id === 'landing' ? 0 : 1;
          if (P.onGround && P.gs < 1 && P.td) {
            const rw = runwayAt(P.x, P.z);
            if (!rw) { fail('STOPPED OFF THE RUNWAY'); return; }
            if (rw.i !== tgt) { fail('WRONG AIRPORT: ' + AIRPORTS[rw.i].name); return; }
            const ls = landingScore(P.td, id === 'xwind' ? 1.5 : 1);
            const base = id === 'xc' ? 800 : 0;
            const lines = (base ? [['ARRIVED LAKESIDE', base]] : []).concat(ls.lines);
            complete({ title: ls.grade, lines, s: ls.s + base, timeBonus: Math.max(0, Math.round((ch.time - chT) * (id === 'xc' ? 1 : 2))) });
          }
        } else if (id === 'bridge') {
          if (flags.under && agl > 152) {
            complete({ title: 'DAREDEVIL!', lines: [['UNDER THE BRIDGE', 1000], ['CLEARANCE ' + flags.clear.toFixed(0) + ' M', flags.clear > 8 ? 200 : 400]], s: 1000 + (flags.clear > 8 ? 200 : 400), timeBonus: Math.max(0, Math.round((ch.time - chT) * 4)) });
          } else if (!flags.under && P.x < BRIDGE.x - 400) fail('MISSED THE BRIDGE');
        }
        void e;
      }

      // ---------- flight model ----------
      function physics(dt) {
        const F = P.F, U = P.U, R = P.R;
        const wd = wind();
        const ax = P.vx - wd[0], ay = P.vy - wd[1], az = P.vz - wd[2];
        const V = Math.hypot(ax, ay, az);
        const vf = ax * F[0] + ay * F[1] + az * F[2], vu = ax * U[0] + ay * U[1] + az * U[2], vr = ax * R[0] + ay * R[1] + az * R[2];
        const aoa = V > 2 ? Math.atan2(-vu, Math.max(0.1, vf)) : 0;
        const beta = V > 2 ? Math.atan2(vr, Math.max(0.1, vf)) : 0;
        P.aoa = aoa; P.beta = beta; P.V = V;
        const rho = 1.225 * Math.exp(-P.y / 9500), qd = 0.5 * rho * V * V;
        const fl = P.flapPos, stallA = 0.27 - fl * 0.012, cl0 = 0.25 + fl * 0.15;
        let cl;
        if (aoa > stallA) cl = Math.max(0.55, cl0 + 4.8 * stallA - (aoa - stallA) * 6);
        else if (aoa < -0.24) cl = Math.min(-0.3, cl0 - 4.8 * 0.24 + (-0.24 - aoa) * 6);
        else cl = cl0 + 4.8 * aoa;
        const stalled = aoa > stallA && V > 5;
        P.stall = aoa > stallA - 0.05 && !P.onGround && V > 5;
        const cd = 0.028 + 0.045 * cl * cl + fl * 0.012 + P.gearPos * 0.008 + (stalled ? 0.12 : 0);
        let fx = 0, fy = -MASS * G, fz = 0;
        const T = P.thr * 3200 * Math.max(0, 1 - Math.max(0, vf) / 95);
        fx += F[0] * T; fy += F[1] * T; fz += F[2] * T;
        let liftY = 0;
        if (V > 0.5) {
          const ix = ax / V, iy = ay / V, iz = az / V;
          const ud = U[0] * ix + U[1] * iy + U[2] * iz;
          let lx = U[0] - ud * ix, ly = U[1] - ud * iy, lz = U[2] - ud * iz;
          const ll = Math.hypot(lx, ly, lz) || 1; lx /= ll; ly /= ll; lz /= ll;
          const L = qd * S * cl, D = qd * S * cd;
          fx += lx * L - ix * D; fy += ly * L - iy * D; fz += lz * L - iz * D;
          liftY = ly * L;
          const sf = qd * S * 0.45 * beta;
          fx -= R[0] * sf; fy -= R[1] * sf; fz -= R[2] * sf;
        }
        P.vx += fx / MASS * dt; P.vy += fy / MASS * dt; P.vz += fz / MASS * dt;
        // angular rates
        const e = eul();
        const auth = clamp(V / 45, 0, 1.3);
        let qc = P.elev * 1.05 * auth + 3.0 * (0.035 - aoa) * auth;
        let pc = P.ail * 1.5 * auth - (Math.abs(e.roll) < 1.2 ? e.roll * 0.12 * auth : 0);
        let rc = P.onGround ? 0.25 * beta * auth : P.rud * 0.5 * auth + 2.5 * beta * auth;
        if (stalled) { P.wob = clamp(P.wob + (Math.random() - 0.5) * dt * 8, -0.8, 0.8); pc += P.wob; } else P.wob *= 0.95;
        const k = Math.min(1, dt * 5);
        P.q += (qc - P.q) * k; P.p += (pc - P.p) * k; P.r += (rc - P.r) * k;
        rotPair(F, U, P.q * dt); rotPair(U, R, P.p * dt); rotPair(F, R, P.r * dt);
        nrm(F); const nr = nrm(cross(U, F)); R[0] = nr[0]; R[1] = nr[1]; R[2] = nr[2];
        const nu = cross(F, R); U[0] = nu[0]; U[1] = nu[1]; U[2] = nu[2];
        // ground
        const gh = groundH(P.x, P.z);
        const contact = gh + (P.gearPos > 0.95 ? 1.5 : 0.7);
        if (P.onGround) {
          const e2 = eul();
          let h = e2.hdg * D2R, pitch = clamp(e2.pitch, 0, 0.22);
          const hx = Math.sin(h), hz = Math.cos(h);
          let along = P.vx * hx + P.vz * hz;
          const steer = (P.ail + P.rud) * 0.45 * clamp(along / 6, -1, 1);
          h += steer * dt;
          const nx = Math.sin(h), nz = Math.cos(h);
          const N = Math.max(0, MASS * G - liftY);
          const rw = runwayAt(P.x, P.z);
          P.brk = api.key('KeyB') || (P.thr < 0.02 && P.td != null) || (P.thr < 0.02 && along < 3);
          const mu = (rw ? 0.02 : 0.07) + (P.brk ? 0.45 : 0);
          const dec = mu * N / MASS * dt;
          along = Math.abs(along) <= dec ? 0 : along - Math.sign(along) * dec;
          let lat = P.vx * nz - P.vz * nx;
          const ld = 7 * dt;
          lat = Math.abs(lat) <= ld ? 0 : lat - Math.sign(lat) * ld;
          P.vx = nx * along + nz * lat; P.vz = nz * along - nx * lat;
          const cp = Math.cos(pitch);
          F[0] = nx * cp; F[1] = Math.sin(pitch); F[2] = nz * cp;
          R[0] = Math.cos(h); R[1] = 0; R[2] = -Math.sin(h);
          const u2 = cross(F, R); U[0] = u2[0]; U[1] = u2[1]; U[2] = u2[2];
          P.p = 0;
        }
        P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
        if (P.y < contact) {
          if (!P.onGround) touchdown(gh);
          if (state !== 'fly') return;
          P.onGround = true; P.y = contact; if (P.vy < 0) P.vy = 0;
        } else if (P.y > contact + 0.4) P.onGround = false;
        if (P.onGround) {
          if (gh > 3) return doCrash('HIT TERRAIN');
          if (inWater(P.x, P.z) && P.y < 3) return doCrash('ROLLED INTO THE WATER');
        }
        // collisions
        for (const b of WORLD.solids) {
          if (P.x > b[0] - 4 && P.x < b[3] + 4 && P.z > b[2] - 4 && P.z < b[5] + 4 && P.y > b[1] - 1 && P.y < b[4] + 1.2) return doCrash(b[4] > 60 && b[3] - b[0] < 10 ? 'HIT A TOWER' : 'HIT A STRUCTURE');
        }
        if (V > 92) return doCrash('STRUCTURAL FAILURE');
        // bridge pass
        const bx = BRIDGE.x;
        if ((flags.px - bx) * (P.x - bx) <= 0 && flags.px != null && P.z > BRIDGE.z0 && P.z < BRIDGE.z1 && P.y < BRIDGE.deck && !P.onGround) {
          if (!flags.under) { flags.under = true; flags.clear = BRIDGE.deck - P.y; api.audio.melody([[784, 0.08], [988, 0.08], [1319, 0.2]], { type: 'square', vol: 0.12 }); msg = 'UNDER THE BRIDGE!'; msgT = 120; }
        }
        flags.px = P.x;
        P.gs = Math.hypot(P.vx, P.vz);
        // turn rate
        const nh = eul().hdg; P.turn = P.turn * 0.9 + angDiff(nh, P.lastHdg) / dt * 0.1; P.lastHdg = nh;
      }
      function touchdown(gh) {
        const e = eul(), vs = P.vy;
        if (gh > 3) return doCrash('FLEW INTO TERRAIN');
        if (inWater(P.x, P.z)) return doCrash('DITCHED IN THE WATER');
        if (P.gearPos < 0.95) return doCrash('GEAR-UP LANDING');
        if (vs < -4.2) return doCrash('HARD LANDING - GEAR COLLAPSED');
        if (Math.abs(e.roll) > 0.28) return doCrash('WINGTIP STRIKE');
        if (e.pitch < -0.1) return doCrash('NOSE-FIRST IMPACT');
        const rw = runwayAt(P.x, P.z);
        if (rw) {
          const a = AIRPORTS[rw.i];
          const d1 = angDiff(e.hdg, a.hdg), d2 = angDiff(e.hdg, a.hdg + 180);
          const fwd = Math.abs(d1) < Math.abs(d2);
          P.td = { vs, cr: rw.cr, hdgErr: fwd ? d1 : d2, dist: fwd ? rw.al + a.len / 2 : a.len / 2 - rw.al, i: rw.i };
        } else P.td = { vs, cr: 99, hdgErr: 45, dist: 9999, i: -1 };
        api.audio.noise(0.12, { vol: 0.2, freq: 3000, type: 'highpass' });
        api.audio.tone(900, 0.06, { type: 'triangle', vol: 0.06 });
      }
      function doCrash(reason) {
        if (state !== 'fly') return;
        crash = { reason, t: 0, x: P.x, y: Math.max(P.y, groundH(P.x, P.z) + 1), z: P.z, rp: replay.slice() };
        state = 'crash';
        boom(crash.x, crash.y, crash.z);
        api.audio.noise(1.4, { vol: 0.3, freq: 1500, slideTo: 80 });
        api.audio.tone(120, 0.8, { type: 'sawtooth', vol: 0.12, slideTo: 30 });
      }
      function boom(x, y, z) {
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI / 2, s = 4 + Math.random() * 18;
          parts.push({ x, y, z, vx: Math.cos(a) * Math.cos(b) * s, vy: Math.sin(b) * s + 4, vz: Math.sin(a) * Math.cos(b) * s, life: 1 + Math.random() * 2, t: 0, smoke: i % 3 === 0 });
        }
      }
      function stepParts(dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.smoke) { p.vy = 3; p.vx *= 0.97; p.vz *= 0.97; } else { p.vy -= 9 * dt; if (p.y < 0) { p.y = 0; p.vy *= -0.3; } }
        }
      }

      // ---------- input ----------
      function controls(dt) {
        const k = api.key;
        const up = k('ArrowUp'), dn = k('ArrowDown'), lf = k('ArrowLeft'), rt = k('ArrowRight');
        const te = dn ? 1 : up ? -1 : 0, ta = rt ? 1 : lf ? -1 : 0;
        const tr = k('KeyC') || k('KeyE') ? 1 : k('KeyZ') || k('KeyQ') ? -1 : 0;
        const mv = (v, t, r) => v + clamp(t - v, -r * dt, r * dt);
        P.elev = mv(P.elev, te, te ? 2.2 : 4); P.ail = mv(P.ail, ta, ta ? 3 : 5); P.rud = mv(P.rud, tr, 3);
        if (k('Space') || k('KeyA')) P.thr = Math.min(1, P.thr + 0.5 * dt);
        if (k('KeyX') || k('KeyS')) P.thr = Math.max(0, P.thr - 0.5 * dt);
        if (api.pressed('KeyG')) toggleGear();
        if (api.pressed('KeyF')) setFlaps(P.flaps >= 3 ? 0 : P.flaps + 1);
        if (api.pressed('KeyR')) setFlaps(Math.max(0, P.flaps - 1));
        if (api.pressed('KeyV')) view = 1 - view;
      }
      function toggleGear() {
        if (P.onGround && P.gear) { msg = 'GEAR LOCKED ON GROUND'; msgT = 90; return; }
        P.gear = P.gear ? 0 : 1; api.audio.tone(140, 0.3, { type: 'square', vol: 0.08, slideTo: P.gear ? 90 : 200 });
      }
      function setFlaps(n) { P.flaps = n; api.audio.tone(300, 0.25, { type: 'triangle', vol: 0.08, slideTo: 260 + n * 30 }); }

      // ---------- game flow ----------
      function startGame(m) {
        mode = m === 0 ? 'course' : m === 1 ? 'free' : 'single';
        chIdx = m >= 2 ? m - 2 : 0; round = 1; score = 0; lives = 3;
        startChallenge();
        api.audio.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.2]], { type: 'square', vol: 0.12 });
      }
      function afterResult() {
        if (mode === 'course') {
          chIdx++;
          if (chIdx >= CH.length) { chIdx = 0; round++; lives = Math.min(5, lives + 1); msg = 'ROUND ' + round + ' - STRONGER WINDS'; msgT = 240; }
          startChallenge();
        } else { state = 'title'; }
      }
      function afterCrash() {
        parts.length = 0;
        if (mode === 'free') { startChallenge(); state = 'fly'; return; }
        lives--;
        if (lives > 0) { startChallenge(); return; }
        state = 'wait';
        const end = () => { state = 'over'; stT = 0; if (score > hi) { hi = score; } api.setHiScore(score); };
        if (api.offerContinue) api.offerContinue(() => { lives = 3; score = 0; startChallenge(); }, end);
        else end();
      }
      function tryStart() {
        if (api.useCredit()) { startGame(menuSel); return; }
        coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.2 });
      }

      function update(dt) {
        tick++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        stepParts(dt);
        if (state === 'title') {
          if (api.pressed('ArrowUp')) { menuSel = (menuSel + MENU.length - 1) % MENU.length; api.audio.tone(660, 0.04, { vol: 0.08 }); }
          if (api.pressed('ArrowDown')) { menuSel = (menuSel + 1) % MENU.length; api.audio.tone(660, 0.04, { vol: 0.08 }); }
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (state === 'over') { stT++; if (stT > 240 || (stT > 60 && api.anyPressed('Enter', 'Space'))) state = 'title'; return; }
        if (state === 'wait') return;
        if (state === 'brief') {
          stT++;
          if ((stT > 30 && api.anyPressed('Enter', 'Space')) || stT > 400) { state = 'fly'; stT = 0; }
          return;
        }
        if (state === 'result') {
          stT++;
          if ((stT > 60 && api.anyPressed('Enter', 'Space')) || stT > 420) afterResult();
          return;
        }
        if (state === 'crash') {
          crash.t += dt;
          if (crash.t > 1.2 && crash.t < 7 && Math.random() < 0.08 && !crash.noBoom) boom(crash.x, crash.y, crash.z);
          if ((crash.t > 1.5 && api.anyPressed('Enter', 'Space')) || crash.t > 9) afterCrash();
          return;
        }
        if (state === 'pause') {
          const items = pauseItems();
          if (api.pressed('ArrowUp')) pauseSel = (pauseSel + items.length - 1) % items.length;
          if (api.pressed('ArrowDown')) pauseSel = (pauseSel + 1) % items.length;
          if (api.pressed('KeyX')) state = 'fly';
          if (api.anyPressed('Enter', 'Space')) {
            const it = items[pauseSel];
            if (it === 'RESUME') state = 'fly';
            else if (it.startsWith('GEAR')) { toggleGear(); state = 'fly'; }
            else if (it.startsWith('FLAPS +')) { setFlaps(Math.min(3, P.flaps + 1)); state = 'fly'; }
            else if (it.startsWith('FLAPS -')) { setFlaps(Math.max(0, P.flaps - 1)); state = 'fly'; }
            else if (it.startsWith('VIEW')) { view = 1 - view; state = 'fly'; }
            else if (it === 'RESTART') { if (mode === 'free') startChallenge(); else { doCrashless(); } }
            else if (it === 'QUIT TO TITLE') { state = 'title'; if (score > hi) { hi = score; api.setHiScore(hi); } }
          }
          return;
        }
        // fly
        if (api.pressed('Enter')) { state = 'pause'; pauseSel = 0; return; }
        controls(dt);
        P.flapPos += clamp(P.flaps - P.flapPos, -dt * 0.8, dt * 0.8);
        P.gearPos += clamp(P.gear - P.gearPos, -dt / 3, dt / 3);
        gust = windBase[0] || windBase[2] ? Math.sin(chT * 0.7) * 0.15 + Math.sin(chT * 2.3 + 1) * 0.1 * (round > 1 || (ch && ch.id === 'xwind') ? 2 : 1) : 0;
        physics(dt);
        if (state !== 'fly') return;
        chT += dt;
        if (tick % 2 === 0) { replay.push([P.x, P.y, P.z, P.R.slice(), P.U.slice(), P.F.slice(), P.gearPos]); if (replay.length > 300) replay.shift(); }
        checkChallenge();
        // sounds
        if (tick % 6 === 0) api.audio.tone(45 + P.thr * 70 + P.V * 0.4, 0.11, { type: 'sawtooth', vol: 0.025 + P.thr * 0.02 });
        if (P.stall && tick % 16 === 0) api.audio.tone(470, 0.12, { type: 'square', vol: 0.07 });
        if (P.onGround && P.V > 8 && tick % 10 === 0 && !runwayAt(P.x, P.z)) api.audio.noise(0.08, { vol: 0.06, freq: 500 });
      }
      function doCrashless() { lives++; fail('RESTARTED'); crash.t = 8.5; }
      function pauseItems() {
        return ['RESUME', 'GEAR ' + (P.gear ? 'UP' : 'DOWN'), 'FLAPS +', 'FLAPS -', 'VIEW ' + (view ? 'COCKPIT' : 'CHASE'), 'RESTART', 'QUIT TO TITLE'];
      }

      // ---------- rendering ----------
      function drawWorld(ctx, plane) {
        const cx = CAM.x, cz = CAM.z;
        // ground rings
        for (const [rad, c] of [[200000, [150, 180, 150]], [9000, [92, 146, 66]]]) {
          const v = [];
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; v.push(cx + Math.cos(a) * rad, 0, cz + Math.sin(a) * rad); }
          const p = project(v, 8); if (p) { p.c = colStr(c, rad > 10000 ? 0 : 1500); decalQ.push(p); }
        }
        const alt = Math.max(1, CAM.y);
        for (const d of WORLD.decals) {
          const dist = Math.hypot(d.x - cx, d.z - cz) - d.r;
          if (dist > (d.near ? 2500 + alt * 2 : 15000)) continue;
          addPoly(d.v, d.n, d.c, true);
        }
        for (const o of WORLD.objs) {
          const dx = o.x - cx, dy = o.y - CAM.y, dz = o.z - CAM.z;
          const d = Math.hypot(dx, dy, dz);
          if (d - o.r > 22000) continue;
          if (dx * CAM.f[0] + dy * CAM.f[1] + dz * CAM.f[2] < -o.r) continue;
          for (const f of o.faces) {
            if (f.cull && f.nx * (CAM.x - f.v[0]) + f.ny * (CAM.y - f.v[1]) + f.nz * (CAM.z - f.v[2]) <= 0) continue;
            addPoly(f.v, f.n, f.c, false);
          }
          for (const l of o.lines) addLine(l[0], l[1], l[2], l[3], l[4], l[5], l[6]);
        }
        if (plane) drawPlane(plane);
      }
      function drawPlane(pl) {
        const [x, y, z, R, U, F, gp] = pl;
        for (const [v, c] of PLANE_FACES) {
          const n = v.length / 3, w = new Array(v.length);
          for (let i = 0; i < n; i++) {
            const a = v[i * 3], b = v[i * 3 + 1], cc = v[i * 3 + 2];
            w[i * 3] = x + R[0] * a + U[0] * b + F[0] * cc; w[i * 3 + 1] = y + R[1] * a + U[1] * b + F[1] * cc; w[i * 3 + 2] = z + R[2] * a + U[2] * b + F[2] * cc;
          }
          const ax = w[3] - w[0], ay = w[4] - w[1], az = w[5] - w[2], bx = w[6] - w[0], by = w[7] - w[1], bz = w[8] - w[2];
          const nn = nrm([ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]);
          const tow = (CAM.x - w[0]) * nn[0] + (CAM.y - w[1]) * nn[1] + (CAM.z - w[2]) * nn[2];
          if (tow < 0) { nn[0] = -nn[0]; nn[1] = -nn[1]; nn[2] = -nn[2]; }
          addPoly(w, n, shade(c, nn[0], nn[1], nn[2]), false, -0.5);
        }
        if (gp > 0.5) {
          for (const [gx, gz] of [[-1.3, 0.8], [1.3, 0.8], [0, 2.8]]) {
            const a = [x + R[0] * gx + U[0] * -0.5 + F[0] * gz, y + R[1] * gx + U[1] * -0.5 + F[1] * gz, z + R[2] * gx + U[2] * -0.5 + F[2] * gz];
            addLine(a[0], a[1], a[2], a[0] - U[0] * 0.9, a[1] - U[1] * 0.9, a[2] - U[2] * 0.9, [30, 30, 30]);
          }
        }
        // shadow
        const gh = groundH(x, z);
        if (y - gh < 300) {
          const s = [];
          for (const [a, b] of [[-5.5, 1.5], [5.5, 1.5], [5.5, 0.5], [0.5, 0.5], [0.3, -4.5], [-0.3, -4.5], [-0.5, 0.5], [-5.5, 0.5]]) s.push(x + R[0] * a + F[0] * b, gh + 0.15, z + R[2] * a + F[2] * b);
          addPoly(s, 8, [40, 70, 40], true);
        }
      }
      function drawParts(ctx) {
        for (const p of parts) {
          const s = projPoint(p.x, p.y, p.z); if (!s) continue;
          const k = p.t / p.life, rad = Math.max(1, (p.smoke ? 6 + k * 14 : 3 + k * 4) * VIEW.f / s.z);
          ctx.fillStyle = p.smoke ? 'rgba(60,60,60,' + (0.7 - k * 0.6).toFixed(2) + ')' : k < 0.3 ? '#fff4a0' : k < 0.6 ? '#ffa020' : '#c03010';
          ctx.beginPath(); ctx.arc(s.x, s.y, Math.min(rad, 60), 0, Math.PI * 2); ctx.fill();
        }
      }
      function planeTuple() { return [P.x, P.y, P.z, P.R, P.U, P.F, P.gearPos]; }
      function cockpitCam() { setCam(P.x + P.U[0] * 1.1 + P.F[0] * 0.5, P.y + P.U[1] * 1.1 + P.F[1] * 0.5, P.z + P.U[2] * 1.1 + P.F[2] * 0.5, P.R, P.U, P.F); }
      function chaseCam() {
        const h = Math.atan2(P.F[0], P.F[2]);
        const ex = P.x - Math.sin(h) * 26, ez = P.z - Math.cos(h) * 26;
        const ey = Math.max(P.y + 7 - P.F[1] * 10, groundH(ex, ez) + 2);
        lookAt(ex, ey, ez, P.x + P.F[0] * 10, P.y + P.F[1] * 10 + 1, P.z + P.F[2] * 10);
      }

      function dial(ctx, x, y, r) {
        ctx.fillStyle = '#3a3a3e'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0b0b0d'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      function needle(ctx, x, y, a, len, col, w) {
        ctx.strokeStyle = col; ctx.lineWidth = w || 1.5; ctx.beginPath();
        ctx.moveTo(x - Math.sin(a) * 3, y + Math.cos(a) * 3); ctx.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len); ctx.stroke();
      }
      function ticks(ctx, x, y, r, a0, a1, n, len, col) {
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; ctx.moveTo(x + Math.sin(a) * r, y - Math.cos(a) * r); ctx.lineTo(x + Math.sin(a) * (r - len), y - Math.cos(a) * (r - len)); }
        ctx.stroke();
      }
      function arcBand(ctx, x, y, r, a0, a1, col) {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, a0 - Math.PI / 2, a1 - Math.PI / 2); ctx.stroke();
      }
      function drawPanel(ctx) {
        const e = eul(), kt = P.V * 1.944, ft = P.y * 3.281, fpm = P.vy * 196.85;
        ctx.fillStyle = '#4a4438'; ctx.fillRect(0, 152, W, 88);
        ctx.fillStyle = '#2a2620'; ctx.fillRect(0, 152, W, 3);
        ctx.fillStyle = '#57513f'; ctx.fillRect(130, 156, 116, 82);
        // ASI
        const ka = kt2a => kt2a / 200 * Math.PI * 1.8;
        let x = 24, y = 174, r = 19;
        dial(ctx, x, y, r);
        arcBand(ctx, x, y, r - 2, ka(45), ka(85), '#e8e8e8'); arcBand(ctx, x, y, r - 4, ka(52), ka(125), '#30c040');
        arcBand(ctx, x, y, r - 4, ka(125), ka(165), '#e8d020'); ticks(ctx, x, y, r, ka(165), ka(166), 1, 6, '#ff3030');
        ticks(ctx, x, y, r, 0, ka(200), 10, 3, '#bbb');
        needle(ctx, x, y, ka(Math.min(kt, 205)), r - 3, '#fff');
        text(ctx, String(Math.round(kt)), x, y + 5, '#9cf', 1, 'center');
        text(ctx, 'KT', x, y - 11, '#888', 1, 'center');
        // attitude
        x = 66;
        dial(ctx, x, y, r);
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.clip();
        ctx.translate(x, y); ctx.rotate(-e.roll);
        const off = clamp(e.pitch * R2D * 0.7, -40, 40);
        ctx.fillStyle = '#3a8ae0'; ctx.fillRect(-40, -80 + off, 80, 80);
        ctx.fillStyle = '#9a6a30'; ctx.fillRect(-40, off, 80, 80);
        ctx.fillStyle = '#fff'; ctx.fillRect(-40, off - 0.5, 80, 1);
        for (const d of [-20, -10, 10, 20]) { const yy = off - d * 0.7; ctx.fillRect(-(Math.abs(d) === 10 ? 5 : 8), yy - 0.5, Math.abs(d) === 10 ? 10 : 16, 1); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -r + 2); ctx.lineTo(-3, -r + 7); ctx.lineTo(3, -r + 7); ctx.fill();
        ctx.restore();
        ticks(ctx, x, y, r, -Math.PI / 3, Math.PI / 3, 4, 3, '#fff');
        ctx.fillStyle = '#ffa000'; ctx.fillRect(x - 11, y - 0.5, 7, 2); ctx.fillRect(x + 4, y - 0.5, 7, 2); ctx.fillRect(x - 1, y - 1, 2, 2);
        // altimeter
        x = 108;
        dial(ctx, x, y, r);
        ticks(ctx, x, y, r, 0, Math.PI * 1.8, 9, 3, '#bbb');
        text(ctx, String(Math.max(0, Math.round(ft / 10) * 10)), x, y + 5, '#9cf', 1, 'center');
        text(ctx, 'ALT', x, y - 11, '#888', 1, 'center');
        needle(ctx, x, y, (ft / 10000) * Math.PI * 2, r - 9, '#ddd', 2.5);
        needle(ctx, x, y, (ft % 1000) / 1000 * Math.PI * 2, r - 3, '#fff', 1.3);
        // turn coordinator
        x = 24; y = 217;
        dial(ctx, x, y, r);
        ctx.save(); ctx.translate(x, y - 2); ctx.rotate(clamp(P.turn / 3, -1.5, 1.5) * 0.35);
        ctx.fillStyle = '#fff'; ctx.fillRect(-12, -1, 24, 2); ctx.fillRect(-1, -4, 2, 4); ctx.restore();
        ctx.fillStyle = '#ddd'; ctx.fillRect(x - 10, y + 8, 20, 6);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + clamp(-P.beta * 40, -8, 8), y + 11, 2.6, 0, Math.PI * 2); ctx.fill();
        text(ctx, 'TC', x, y - 14, '#888', 1, 'center');
        // heading indicator
        x = 66;
        dial(ctx, x, y, r);
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.beginPath();
        for (let d = 0; d < 360; d += 10) {
          const a = (d - e.hdg) * D2R, l = d % 30 ? 2 : 4;
          ctx.moveTo(x + Math.sin(a) * r, y - Math.cos(a) * r); ctx.lineTo(x + Math.sin(a) * (r - l), y - Math.cos(a) * (r - l));
        }
        ctx.stroke();
        for (const [d, s] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) {
          const a = (d - e.hdg) * D2R; text(ctx, s, x + Math.sin(a) * (r - 9) - 2, y - Math.cos(a) * (r - 9) - 3, d ? '#fff' : '#fc4');
        }
        ctx.fillStyle = '#ffa000'; ctx.beginPath(); ctx.moveTo(x, y - r + 1); ctx.lineTo(x - 2, y - r - 3); ctx.lineTo(x + 2, y - r - 3); ctx.fill();
        ctx.fillRect(x - 4, y - 1, 8, 1.5); ctx.fillRect(x - 0.7, y - 5, 1.5, 9);
        // VSI
        x = 108;
        dial(ctx, x, y, r);
        ticks(ctx, x, y, r, -Math.PI / 2 - Math.PI * 0.85, -Math.PI / 2 + Math.PI * 0.85, 8, 3, '#bbb');
        needle(ctx, x, y, -Math.PI / 2 + clamp(fpm / 2000, -1, 1) * Math.PI * 0.85, r - 3, '#fff');
        text(ctx, 'VS', x + 4, y - 11, '#888', 1, 'center');
        text(ctx, (fpm >= 0 ? '+' : '') + Math.round(fpm / 10) * 10, x + 2, y + 6, '#9cf', 1, 'center');
        // throttle
        ctx.fillStyle = '#111'; ctx.fillRect(139, 162, 4, 64);
        const ty = 222 - P.thr * 58;
        ctx.fillStyle = '#222'; ctx.fillRect(134, ty, 14, 7); ctx.fillStyle = '#ddd'; ctx.fillRect(135, ty + 1, 12, 5);
        text(ctx, 'THR', 141, 229, '#ccc', 1, 'center');
        text(ctx, String(Math.round(P.thr * 100)), 141, 156, '#9cf', 1, 'center');
        // flaps
        ctx.fillStyle = '#111'; ctx.fillRect(161, 168, 4, 50);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#888'; ctx.fillRect(167, 168 + i * 16, 4, 1); }
        const fy = 165 + P.flapPos * 16;
        ctx.fillStyle = '#ddd'; ctx.fillRect(156, fy, 14, 6); ctx.fillStyle = '#999'; ctx.fillRect(158, fy + 2, 10, 2);
        text(ctx, 'FLP', 163, 229, '#ccc', 1, 'center');
        text(ctx, String(P.flaps * 10), 163, 156, '#9cf', 1, 'center');
        // gear
        ctx.fillStyle = '#111'; ctx.fillRect(184, 178, 4, 30);
        const gy = P.gear ? 204 : 176;
        ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(186, gy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(186, gy, 2, 0, Math.PI * 2); ctx.fill();
        const gl = P.gearPos > 0.98 ? '#30ff40' : P.gearPos > 0.02 ? '#ff3020' : '#202020';
        for (let i = 0; i < 3; i++) { ctx.fillStyle = gl; ctx.fillRect(176 + i * 8, 214, 5, 5); }
        text(ctx, 'GEAR', 186, 229, '#ccc', 1, 'center');
        // warning lamps
        ctx.fillStyle = P.stall && tick % 20 < 12 ? '#ff2020' : '#401010'; ctx.fillRect(196, 157, 30, 9);
        text(ctx, 'STALL', 211, 158, P.stall ? '#fff' : '#704040', 1, 'center');
        ctx.fillStyle = P.brk && P.onGround ? '#ffb020' : '#403010'; ctx.fillRect(196, 168, 30, 9);
        text(ctx, 'BRAKE', 211, 169, P.brk && P.onGround ? '#000' : '#706040', 1, 'center');
        // ADF
        x = 222; y = 198; r = 17;
        dial(ctx, x, y, r);
        ticks(ctx, x, y, r, 0, Math.PI * 2, 12, 3, '#888');
        const tg = target();
        if (tg) {
          const brg = Math.atan2(tg.x - P.x, tg.z - P.z) * R2D;
          needle(ctx, x, y, angDiff(brg, e.hdg) * D2R, r - 3, '#ffd040', 2);
        }
        text(ctx, 'ADF', x, y + 4, '#888', 1, 'center');
        // tach strip
        const rpm = Math.round(700 + P.thr * 1900 + P.V * 4);
        text(ctx, 'RPM' + rpm, 222, 229, '#ccc', 1, 'center');
        // info column
        const wi = windInfo();
        let ly = 157;
        const line = (s, c) => { text(ctx, s, 250, ly, c || '#eee'); ly += 10; };
        line('SC ' + score, '#ffd040');
        line(mode === 'free' ? 'FREE FLT' : 'PLANES ' + lives);
        line('W' + String(Math.round(wi.from)).padStart(3, '0') + '/' + Math.round(wi.kt) + 'KT', '#9cf');
        if (tg) { line('TO ' + tg.code, '#ffd040'); line((Math.hypot(tg.x - P.x, tg.z - P.z) / 1852).toFixed(1) + ' NM', '#ffd040'); }
        else { line(''); line(''); }
        line('HDG ' + String(Math.round(e.hdg) % 360).padStart(3, '0'));
        if (ch && ch.time) { const rem = Math.max(0, ch.time - chT); line('T ' + Math.floor(rem / 60) + ':' + String(Math.floor(rem % 60)).padStart(2, '0'), rem < 30 ? '#f66' : '#eee'); }
        else line('T ' + Math.floor(chT / 60) + ':' + String(Math.floor(chT % 60)).padStart(2, '0'));
        line(view ? 'CHASE' : 'COCKPIT', '#888');
      }
      function drawChaseHud(ctx) {
        const e = eul();
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 226, W, 14);
        const tg = target();
        const s = Math.round(P.V * 1.944) + 'KT ' + Math.round(P.y * 3.281) + 'FT ' + (P.vy >= 0 ? '+' : '') + Math.round(P.vy * 196.85) + 'FPM HDG' + String(Math.round(e.hdg) % 360).padStart(3, '0') +
          ' T' + Math.round(P.thr * 100) + ' F' + P.flaps * 10 + (P.gearPos > 0.98 ? ' GR' : P.gearPos > 0.02 ? ' G?' : ' --');
        text(ctx, s, 3, 230, '#fff');
        if (tg) text(ctx, tg.code + ' ' + (Math.hypot(tg.x - P.x, tg.z - P.z) / 1852).toFixed(1), W - 3, 218, '#ffd040', 1, 'right');
        if (P.stall && tick % 20 < 12) shadowText(ctx, 'STALL', W / 2, 30, '#ff3030', 2, 'center');
        text(ctx, 'SC ' + score + (mode !== 'free' ? '  PLANES ' + lives : ''), 3, 218, '#ffd040');
      }
      function topBar(ctx) {
        if (!ch) return;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 10);
        text(ctx, ch.name + (mode === 'course' ? ' (' + (chIdx + 1) + '/5' + (round > 1 ? ' R' + round : '') + ')' : ''), 3, 2, '#ffd040');
        const e = eul();
        let hint = '';
        if (ch.id === 'takeoff') hint = P.onGround ? (P.V * 1.944 < 50 ? 'FULL POWER' : 'ROTATE') : 'CLIMB ' + Math.round((P.y - groundH(P.x, P.z)) * 3.281) + '/1000';
        else if (ch.id === 'bridge') hint = flags.under ? 'CLIMB ABOVE 500 FT' : 'FLY UNDER THE DECK';
        else if (ch.id !== 'free') hint = P.gearPos < 0.5 && !P.onGround ? 'GEAR IS UP' : P.onGround ? 'BRAKE TO A STOP' : 'LAND AND STOP';
        text(ctx, hint, W - 3, 2, '#fff', 1, 'right');
        void e;
        if (msgT > 0 && msg) shadowText(ctx, msg, W / 2, 24, '#ffd040', 1, 'center');
      }
      function sceneSetup(full) { if (full) setView(0, 0, W, H, 70); else setView(0, 0, W, 152, 70); }

      function renderTitle(ctx) {
        const t = api.time;
        setView(0, 0, W, H, 60);
        const a = t * 0.08;
        lookAt(2500 + Math.cos(a) * 2600, 420, 4000 + Math.sin(a) * 2600, 2500, 60, 4000);
        beginScene(ctx);
        const pa = t * 0.35, px = 2500 + Math.cos(pa) * 900, pz = 4000 + Math.sin(pa) * 900;
        const F = [-Math.sin(pa), 0, Math.cos(pa)], U = nrm([Math.cos(pa) * -0.4, 1, Math.sin(pa) * -0.4]);
        const R = nrm(cross(U, F)), U2 = cross(F, R);
        drawWorld(ctx, [px, 160, pz, R, U2, F, 0]);
        flush(ctx);
        ctx.fillStyle = 'rgba(0,0,30,0.55)'; ctx.fillRect(20, 10, 280, 222);
        shadowText(ctx, 'FLIGHT', W / 2, 18, '#ffd040', 3, 'center');
        shadowText(ctx, 'SIMULATOR', W / 2, 42, '#ffffff', 3, 'center');
        text(ctx, '\u00a9 1982 ORIGINAL', W / 2, 68, '#9cf', 1, 'center');
        for (let i = 0; i < MENU.length; i++) {
          const sel = i === menuSel;
          text(ctx, (sel ? '> ' : '  ') + MENU[i], 60, 84 + i * 12, sel ? '#ffd040' : '#ccc');
        }
        text(ctx, 'HI SCORE ' + hi, W / 2, 172, '#fff', 1, 'center');
        text(ctx, 'ARROWS FLY  SPACE/X THROTTLE  ENTER MENU', W / 2, 186, '#8ab', 1, 'center');
        text(ctx, 'G GEAR  F/R FLAPS  Z/C RUDDER  V VIEW', W / 2, 196, '#8ab', 1, 'center');
        const blink = (tick >> 5) % 2 === 0;
        if (coinFlash > 0) { if ((coinFlash >> 3) % 2) text(ctx, 'INSERT COIN', W / 2, 210, '#f44', 1, 'center'); }
        else if (blink) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 210, '#38f4ff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 222, '#aaa', 1, 'center');
      }
      function renderFlight(ctx) {
        if (view === 0) { sceneSetup(false); cockpitCam(); beginScene(ctx); drawWorld(ctx, null); flush(ctx); drawParts(ctx); drawPanel(ctx); }
        else { sceneSetup(true); chaseCam(); beginScene(ctx); drawWorld(ctx, planeTuple()); flush(ctx); drawParts(ctx); drawChaseHud(ctx); }
        topBar(ctx);
      }
      function box(ctx, x, y, w, h) { ctx.fillStyle = 'rgba(0,0,20,0.8)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
      function renderCrash(ctx) {
        const c = crash, rp = c.rp;
        setView(0, 0, W, H, 60);
        let pl = null;
        if (c.t > 1.2 && rp.length) {
          const span = Math.min(rp.length, 150);
          const idx = Math.min(rp.length - 1, rp.length - span + Math.floor((c.t - 1.2) * 30));
          pl = rp[idx];
          if (idx >= rp.length - 1 && !c.noBoom) pl = null;
        }
        const ex = c.x + 70, ey = c.y + 30, ez = c.z - 60;
        const tx = pl ? pl[0] : c.x, ty = pl ? pl[1] : c.y, tz = pl ? pl[2] : c.z;
        lookAt(ex, Math.max(ey, groundH(ex, ez) + 5), ez, tx, ty, tz);
        beginScene(ctx); drawWorld(ctx, pl); flush(ctx);
        if (!pl || c.t < 1.2) drawParts(ctx);
        if (c.t > 1.2 && pl && (tick >> 4) % 2) shadowText(ctx, 'REPLAY', 6, 6, '#f44', 1);
        box(ctx, 30, 168, 260, 50);
        shadowText(ctx, c.noBoom ? 'MISSION FAILED' : 'CRASH!', W / 2, 174, '#ff5040', 2, 'center');
        text(ctx, c.reason, W / 2, 192, '#fff', 1, 'center');
        text(ctx, mode === 'free' ? 'PRESS START TO RESTART' : 'PLANES LEFT ' + Math.max(0, lives - 1), W / 2, 204, '#ffd040', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        if (state === 'crash') { renderCrash(ctx); return; }
        if (state === 'over' || state === 'wait') {
          renderTitleBg(ctx);
          box(ctx, 50, 70, 220, 90);
          shadowText(ctx, 'GAME OVER', W / 2, 84, '#ff5040', 2, 'center');
          text(ctx, 'FINAL SCORE ' + score, W / 2, 112, '#fff', 1, 'center');
          text(ctx, 'HI SCORE ' + hi, W / 2, 126, '#ffd040', 1, 'center');
          text(ctx, 'LICENSE PENDING...', W / 2, 142, '#9cf', 1, 'center');
          return;
        }
        renderFlight(ctx);
        if (state === 'brief') {
          box(ctx, 24, 40, 272, 92);
          shadowText(ctx, ch.name, W / 2, 48, '#ffd040', 2, 'center');
          for (let i = 0; i < ch.brief.length; i++) text(ctx, ch.brief[i], W / 2, 72 + i * 11, '#fff', 1, 'center');
          const wi = windInfo();
          text(ctx, 'WIND ' + String(Math.round(wi.from)).padStart(3, '0') + ' AT ' + Math.round(wi.kt) + ' KT' + (ch.time ? '   LIMIT ' + Math.floor(ch.time / 60) + ' MIN' : ''), W / 2, 108, '#9cf', 1, 'center');
          if ((tick >> 4) % 2) text(ctx, 'PRESS START', W / 2, 120, '#38f4ff', 1, 'center');
        } else if (state === 'pause') {
          const it = pauseItems();
          box(ctx, 90, 30, 140, 24 + it.length * 11);
          text(ctx, 'PAUSED', W / 2, 36, '#ffd040', 1, 'center');
          for (let i = 0; i < it.length; i++) text(ctx, (i === pauseSel ? '> ' : '  ') + it[i], 100, 50 + i * 11, i === pauseSel ? '#ffd040' : '#ddd');
        } else if (state === 'result') {
          const r = result;
          box(ctx, 30, 26, 260, 34 + (r.lines.length + 3) * 11);
          shadowText(ctx, r.title, W / 2, 32, '#ffd040', r.title.length > 20 ? 1 : 2, 'center');
          let y = 54;
          for (const [s, v] of r.lines) { text(ctx, s, 40, y, '#fff'); text(ctx, String(v), 280, y, '#9cf', 1, 'right'); y += 11; }
          text(ctx, 'TIME BONUS', 40, y, '#fff'); text(ctx, String(r.timeBonus), 280, y, '#9cf', 1, 'right'); y += 13;
          text(ctx, 'CHALLENGE', 40, y, '#ffd040'); text(ctx, String(chScore), 280, y, '#ffd040', 1, 'right'); y += 11;
          text(ctx, 'TOTAL', 40, y, '#ffd040'); text(ctx, String(score), 280, y, '#ffd040', 1, 'right');
        }
      }
      function renderTitleBg(ctx) {
        setView(0, 0, W, H, 60);
        const a = api.time * 0.05;
        lookAt(Math.cos(a) * 3000, 600, Math.sin(a) * 3000, 0, 0, 0);
        beginScene(ctx); drawWorld(ctx, null); flush(ctx);
      }

      return {
        update, render, destroy() { },
        debug: { get P() { return P; }, get state() { return state; }, get score() { return score; }, get lives() { return lives; }, get chIdx() { return chIdx; }, get round() { return round; }, get flags() { return flags; }, get crash() { return crash; }, eul, runwayAt, groundH, AIRPORTS, BRIDGE, get ch() { return ch; }, get chT() { return chT; } }
      };
    }
  });
})();
