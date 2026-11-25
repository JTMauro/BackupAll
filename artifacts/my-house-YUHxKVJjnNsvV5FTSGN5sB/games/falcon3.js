// Falcon 3.0 (Spectrum HoloByte, 1991) -- arcade-friendly F-16 combat flight sim with its own flat-shaded 3D renderer
(function () {
  'use strict';
  // ======================================================================
  // Shared mini 3D engine: flat-shaded polygons, painter's sort, heightmap
  // terrain, simple models, HUD helpers. Written from scratch.
  // ======================================================================
  const PI = Math.PI, TAU = PI * 2, D2R = PI / 180, R2D = 180 / PI;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function madd(a, b, s) { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function vlen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function norm(a) { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function dist3(a, b) { return vlen(sub(a, b)); }
  function hdist(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
  function wrapPI(a) { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; }
  function mkRng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const UPV = [0, 1, 0];

  // ---------- orientation frames {R,U,F} (x right, y up, z forward) ----------
  function frameFrom(F, up) {
    F = norm(F); let R = cross(up || UPV, F);
    if (vlen(R) < 1e-4) R = [1, 0, 0];
    R = norm(R); return { R, U: cross(F, R), F };
  }
  function frameYaw(h) { return frameFrom([Math.sin(h), 0, Math.cos(h)]); }
  function orthoN(o) { o.F = norm(o.F); o.R = norm(cross(o.U, o.F)); o.U = cross(o.F, o.R); }
  function rotPitch(o, a) { const c = Math.cos(a), s = Math.sin(a); const F = add(mul(o.F, c), mul(o.U, s)); o.U = sub(mul(o.U, c), mul(o.F, s)); o.F = F; }
  function rotRoll(o, a) { const c = Math.cos(a), s = Math.sin(a); const U = add(mul(o.U, c), mul(o.R, s)); o.R = sub(mul(o.R, c), mul(o.U, s)); o.U = U; }
  function headingOf(F) { return Math.atan2(F[0], F[2]); }
  function pitchOf(F) { return Math.asin(clamp(F[1], -1, 1)); }
  function rollOf(o) { return Math.atan2(-o.R[1], o.U[1]); }
  function copyFrame(o) { return { R: o.R.slice(), U: o.U.slice(), F: o.F.slice() }; }
  // turn a frame's forward toward a desired direction (AI flight), banking into the turn
  function steerFrame(o, des, maxAng, bankK) {
    des = norm(des);
    const d = clamp(dot(o.F, des), -1, 1), ang = Math.acos(d);
    let F;
    if (ang < 1e-5) F = des;
    else if (d < -0.995) F = norm(add(o.F, mul(o.R, maxAng)));
    else { const t = Math.min(1, maxAng / ang); F = norm(add(mul(o.F, 1 - t), mul(des, t))); }
    const lat = sub(des, mul(F, dot(des, F))); lat[1] = 0;
    const Ud = norm(add([0, 1.15, 0], mul(lat, bankK || 4)));
    o.F = F; o.U = norm(add(mul(o.U, 0.88), mul(Ud, 0.12))); orthoN(o);
  }

  // ---------- 5x7 bitmap font (cached per colour) ----------
  const GLY = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
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
    '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '%': [24, 25, 2, 4, 8, 19, 3],
    '#': [10, 10, 31, 10, 31, 10, 10], '^': [4, 14, 21, 4, 4, 4, 4], '_': [0, 0, 0, 0, 0, 0, 31], '[': [14, 8, 8, 8, 8, 8, 14],
    ']': [14, 2, 2, 2, 2, 2, 14], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '"': [10, 10, 0, 0, 0, 0, 0]
  };
  const GKEYS = Object.keys(GLY), GIDX = {};
  GKEYS.forEach((k, i) => { GIDX[k] = i; });
  const fontCache = {};
  function fontAtlas(col) {
    let a = fontCache[col]; if (a) return a;
    let cv = null;
    try { cv = (typeof document !== 'undefined' && document.createElement) ? document.createElement('canvas') : null; } catch (e) { cv = null; }
    let g = null;
    if (cv) { cv.width = GKEYS.length * 6; cv.height = 7; try { g = cv.getContext('2d'); } catch (e) { g = null; } }
    if (!g) { fontCache[col] = a = { cv: null }; return a; }
    g.fillStyle = col;
    GKEYS.forEach((k, i) => { const gl = GLY[k]; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r] & (16 >> c)) g.fillRect(i * 6 + c, r, 1, 1); });
    fontCache[col] = a = { cv }; return a;
  }
  function txt(ctx, s, x, y, col, align, sc) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'c') x = x - w / 2; else if (align === 'r') x = x - w;
    x = Math.round(x); y = Math.round(y);
    const a = fontAtlas(col);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const k = GIDX[s[i]]; if (k == null) continue;
      if (a.cv) ctx.drawImage(a.cv, k * 6, 0, 5, 7, x + i * 6 * sc, y, 5 * sc, 7 * sc);
      else { const gl = GLY[s[i]]; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r] & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
    return w;
  }
  function pad(n, l, ch) { return String(n).padStart(l, ch || '0'); }

  // ---------- renderer state ----------
  const LIGHT = norm([0.45, 0.8, 0.3]);
  const RD = { layers: [[], [], []], cam: null, mono: 0, fog: [170, 190, 210], view: 9000 };
  function colStr(r, g, b) {
    if (RD.mono) {
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      return 'rgb(' + (l * 0.62 | 0) + ',' + (Math.min(255, l * 1.05 + 6) | 0) + ',' + (l * 0.55 | 0) + ')';
    }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  function shadeCol(c, lum, d, hot) {
    let t = d / RD.view; t = t < 0.4 ? 0 : Math.min(1, (t - 0.4) / 0.6);
    let r = c[0] * lum, g = c[1] * lum, b = c[2] * lum;
    if (RD.mono) { if (hot) { r = r * 0.5 + 140; g = g * 0.5 + 140; b = b * 0.5 + 140; } else { r *= 0.6; g *= 0.6; b *= 0.6; } }
    const f = RD.fog;
    return colStr(r + (f[0] - r) * t, g + (f[1] - g) * t, b + (f[2] - b) * t);
  }
  function mkCam(pos, o, vp, f, cyFrac) {
    return { pos: pos.slice(), R: o.R, U: o.U, F: o.F, vp, f, cx: vp.x + vp.w / 2, cy: vp.y + vp.h * (cyFrac == null ? 0.5 : cyFrac) };
  }
  function toCam(c, p) {
    const dx = p[0] - c.pos[0], dy = p[1] - c.pos[1], dz = p[2] - c.pos[2];
    return [dx * c.R[0] + dy * c.R[1] + dz * c.R[2], dx * c.U[0] + dy * c.U[1] + dz * c.U[2], dx * c.F[0] + dy * c.F[1] + dz * c.F[2]];
  }
  function projW(c, p) { const q = toCam(c, p); if (q[2] < 1) return null; return [c.cx + q[0] * c.f / q[2], c.cy - q[1] * c.f / q[2], q[2]]; }
  function projDir(c, d) {
    const q = [dot(d, c.R), dot(d, c.U), dot(d, c.F)];
    if (q[2] < 0.02) return null; return [c.cx + q[0] * c.f / q[2], c.cy - q[1] * c.f / q[2]];
  }
  function clipNear(qs, n) {
    const out = [];
    for (let i = 0; i < qs.length; i++) {
      const a = qs[i], b = qs[(i + 1) % qs.length], ain = a[2] >= n, bin = b[2] >= n;
      if (ain) out.push(a);
      if (ain !== bin) { const t = (n - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, n]); }
    }
    return out;
  }
  function pushPoly(layer, qs, col, depth) {
    let pts = qs;
    for (let i = 0; i < qs.length; i++) if (qs[i][2] < 1) { pts = clipNear(qs, 1); break; }
    if (pts.length < 3) return;
    const c = RD.cam, xy = new Array(pts.length * 2);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], x = c.cx + q[0] * c.f / q[2], y = c.cy - q[1] * c.f / q[2];
      xy[i * 2] = x; xy[i * 2 + 1] = y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const vp = c.vp;
    if (x1 < vp.x || x0 > vp.x + vp.w || y1 < vp.y || y0 > vp.y + vp.h) return;
    RD.layers[layer].push({ k: 0, xy, c: col, d: depth });
  }
  function pushDot(layer, q, size, col, minPx) {
    if (q[2] < 1) return;
    const c = RD.cam, r = Math.max(minPx || 1, size * c.f / q[2]);
    const x = c.cx + q[0] * c.f / q[2], y = c.cy - q[1] * c.f / q[2];
    if (x < c.vp.x - r || x > c.vp.x + c.vp.w + r || y < c.vp.y - r || y > c.vp.y + c.vp.h + r) return;
    RD.layers[layer].push({ k: 1, x, y, r, c: col, d: q[2] });
  }
  function pushLine(layer, qa, qb, col, w) {
    if (qa[2] < 1 && qb[2] < 1) return;
    if (qa[2] < 1) { const t = (1 - qa[2]) / (qb[2] - qa[2]); qa = [qa[0] + (qb[0] - qa[0]) * t, qa[1] + (qb[1] - qa[1]) * t, 1]; }
    if (qb[2] < 1) { const t = (1 - qb[2]) / (qa[2] - qb[2]); qb = [qb[0] + (qa[0] - qb[0]) * t, qb[1] + (qa[1] - qb[1]) * t, 1]; }
    const c = RD.cam;
    RD.layers[layer].push({ k: 2, x: c.cx + qa[0] * c.f / qa[2], y: c.cy - qa[1] * c.f / qa[2], x2: c.cx + qb[0] * c.f / qb[2], y2: c.cy - qb[1] * c.f / qb[2], c: col, w: w || 1, d: (qa[2] + qb[2]) / 2 });
  }
  function flush(ctx) {
    const byD = (a, b) => b.d - a.d;
    ctx.lineWidth = 1;
    for (let li = 0; li < RD.layers.length; li++) {
      const L = RD.layers[li], seam = li === 0;
      L.sort(byD);
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        if (p.k === 0) {
          const xy = p.xy; ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(xy[0], xy[1]);
          for (let j = 2; j < xy.length; j += 2) ctx.lineTo(xy[j], xy[j + 1]);
          ctx.closePath(); ctx.fill();
          if (seam) { ctx.strokeStyle = p.c; ctx.stroke(); }
        } else if (p.k === 1) {
          ctx.fillStyle = p.c;
          if (p.r < 2.2) ctx.fillRect(p.x - p.r * 0.5, p.y - p.r * 0.5, Math.max(1, p.r), Math.max(1, p.r));
          else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
        } else {
          ctx.strokeStyle = p.c; ctx.lineWidth = p.w; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
        }
      }
      L.length = 0;
    }
  }
  function clip2(pts, fn) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], fa = fn(a[0], a[1]), fb = fn(b[0], b[1]);
      if (fa <= 0) out.push(a);
      if ((fa <= 0) !== (fb <= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  function fillPts(ctx, pts) {
    if (pts.length < 3) return;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill();
  }
  // sky, haze band and the infinite ground plane beyond the terrain tiles
  function drawSky(ctx, c, th) {
    const vp = c.vp, rect = [[vp.x, vp.y], [vp.x + vp.w, vp.y], [vp.x + vp.w, vp.y + vp.h], [vp.x, vp.y + vp.h]];
    const g = off => (x, y) => ((x - c.cx) * c.R[1] - (y - c.cy) * c.U[1] + c.f * c.F[1]) / c.f - off;
    ctx.fillStyle = colStr(th.sky[0], th.sky[1], th.sky[2]); ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
    ctx.fillStyle = colStr(th.sky2[0], th.sky2[1], th.sky2[2]); fillPts(ctx, clip2(rect, g(0.22)));
    ctx.fillStyle = colStr(RD.fog[0], RD.fog[1], RD.fog[2]); fillPts(ctx, clip2(rect, g(0.06)));
    const gc = th.far; ctx.fillStyle = RD.mono ? colStr(gc[0] * 0.6, gc[1] * 0.6, gc[2] * 0.6) : colStr(gc[0], gc[1], gc[2]);
    fillPts(ctx, clip2(rect, g(-0.004)));
  }

  // ---------- heightmap terrain ----------
  // gen(x, z) -> height; typeFn(avgH, slope, x, z, rnd) -> type index; theme.cols[type] = [r,g,b]
  function makeTerrain(N, CS, gen, typeFn, theme, seed) {
    const N1 = N + 1, H = new Float32Array(N1 * N1), C = new Float32Array(N * N * 3), T = new Uint8Array(N * N);
    for (let j = 0; j < N1; j++) for (let i = 0; i < N1; i++) H[j * N1 + i] = gen(i * CS, j * CS);
    const r = mkRng(seed || 99);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = H[j * N1 + i], b = H[j * N1 + i + 1], c = H[(j + 1) * N1 + i], d = H[(j + 1) * N1 + i + 1];
      const avg = (a + b + c + d) / 4, sl = Math.max(a, b, c, d) - Math.min(a, b, c, d);
      const t = typeFn(avg, sl, (i + 0.5) * CS, (j + 0.5) * CS, r); T[j * N + i] = t;
      const base = theme.cols[t], v = 0.93 + r() * 0.1 + (((i + j) & 1) ? 0.03 : -0.03);
      C[(j * N + i) * 3] = base[0] * v; C[(j * N + i) * 3 + 1] = base[1] * v; C[(j * N + i) * 3 + 2] = base[2] * v;
    }
    return { N, CS, H, C, T, theme, size: N * CS, vc: null, vn: 0 };
  }
  function vh(T, i, j) { return (i < 0 || j < 0 || i > T.N || j > T.N) ? 0 : T.H[j * (T.N + 1) + i]; }
  function hAt(T, x, z) {
    const gx = x / T.CS, gz = z / T.CS, ix = Math.floor(gx), iz = Math.floor(gz);
    if (ix < 0 || iz < 0 || ix >= T.N || iz >= T.N) return 0;
    const fx = gx - ix, fz = gz - iz, N1 = T.N + 1, o = iz * N1 + ix;
    const h00 = T.H[o], h10 = T.H[o + 1], h01 = T.H[o + N1], h11 = T.H[o + N1 + 1];
    if (fx + fz < 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }
  function typeAt(T, x, z) {
    const i = Math.floor(x / T.CS), j = Math.floor(z / T.CS);
    if (i < 0 || j < 0 || i >= T.N || j >= T.N) return T.theme.outType || 1;
    return T.T[j * T.N + i];
  }
  function los(T, a, b) {
    for (let i = 1; i < 10; i++) {
      const t = i / 10, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
      if (hAt(T, x, z) > y + 4) return false;
    }
    return true;
  }
  function drawTerrain(T) {
    const c = RD.cam, CS = T.CS, rc = Math.ceil(RD.view / CS), n = rc * 2 + 1, nv = n + 1;
    const ix0 = Math.floor(c.pos[0] / CS) - rc, iz0 = Math.floor(c.pos[2] / CS) - rc;
    if (!T.vc || T.vn < nv * nv) { T.vc = new Float32Array(nv * nv * 3); T.vn = nv * nv; }
    const V = T.vc, R = c.R, U = c.U, F = c.F, px = c.pos[0], py = c.pos[1], pz = c.pos[2];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nv; i++) {
      const dx = (ix0 + i) * CS - px, dy = vh(T, ix0 + i, iz0 + j) - py, dz = (iz0 + j) * CS - pz, k = (j * nv + i) * 3;
      V[k] = dx * R[0] + dy * R[1] + dz * R[2]; V[k + 1] = dx * U[0] + dy * U[1] + dz * U[2]; V[k + 2] = dx * F[0] + dy * F[1] + dz * F[2];
    }
    const tx = (c.vp.w / 2) / c.f * 1.15, ty = (c.vp.h / 2) / c.f * 1.6, vd2 = RD.view * RD.view, th = T.theme;
    const q = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const gi = ix0 + i, gj = iz0 + j;
      const cxw = (gi + 0.5) * CS - px, czw = (gj + 0.5) * CS - pz;
      if (cxw * cxw + czw * czw > vd2) continue;
      const k00 = (j * nv + i) * 3, k10 = k00 + 3, k01 = k00 + nv * 3, k11 = k01 + 3;
      const z00 = V[k00 + 2], z10 = V[k10 + 2], z01 = V[k01 + 2], z11 = V[k11 + 2];
      if (z00 < 1 && z10 < 1 && z01 < 1 && z11 < 1) continue;
      if (z00 > 0 && z10 > 0 && z01 > 0 && z11 > 0) {
        if (V[k00] > z00 * tx && V[k10] > z10 * tx && V[k01] > z01 * tx && V[k11] > z11 * tx) continue;
        if (V[k00] < -z00 * tx && V[k10] < -z10 * tx && V[k01] < -z01 * tx && V[k11] < -z11 * tx) continue;
        if (V[k00 + 1] < -z00 * ty && V[k10 + 1] < -z10 * ty && V[k01 + 1] < -z01 * ty && V[k11 + 1] < -z11 * ty) continue;
        if (V[k00 + 1] > z00 * ty && V[k10 + 1] > z10 * ty && V[k01 + 1] > z01 * ty && V[k11 + 1] > z11 * ty) continue;
      }
      const h00 = vh(T, gi, gj), h10 = vh(T, gi + 1, gj), h01 = vh(T, gi, gj + 1), h11 = vh(T, gi + 1, gj + 1);
      let base;
      if (gi >= 0 && gj >= 0 && gi < T.N && gj < T.N) { const o = (gj * T.N + gi) * 3; base = [T.C[o], T.C[o + 1], T.C[o + 2]]; }
      else { const b = th.cols[th.outType || 1], v = ((gi + gj) & 1) ? 1.03 : 0.97; base = [b[0] * v, b[1] * v, b[2] * v]; }
      const d = Math.sqrt(cxw * cxw + czw * czw);
      const set = (qq, kk) => { qq[0] = V[kk]; qq[1] = V[kk + 1]; qq[2] = V[kk + 2]; return qq; };
      if (h00 === h10 && h00 === h01 && h00 === h11) {
        if (py < h00) continue;
        pushPoly(0, [set([0, 0, 0], k00), set([0, 0, 0], k10), set([0, 0, 0], k11), set([0, 0, 0], k01)], shadeCol(base, 0.35 + 0.65 * LIGHT[1], d), (z00 + z11) / 2);
        continue;
      }
      // triangle 1: 00,10,01
      let nx = -CS * (h10 - h00), ny = CS * CS, nz = -CS * (h01 - h00);
      let ln = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nx * (px - gi * CS) + ny * (py - h00) + nz * (pz - gj * CS) > 0)
        pushPoly(0, [set(q[0].slice(), k00), set(q[1].slice(), k10), set(q[2].slice(), k01)],
          shadeCol(base, 0.35 + 0.65 * Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / ln), d), (z00 + z10 + z01) / 3);
      nx = CS * (h01 - h11); nz = CS * (h10 - h11);
      ln = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nx * (px - (gi + 1) * CS) + ny * (py - h11) + nz * (pz - (gj + 1) * CS) > 0)
        pushPoly(0, [set(q[0].slice(), k11), set(q[1].slice(), k01), set(q[2].slice(), k10)],
          shadeCol(base, 0.35 + 0.65 * Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / ln), d), (z11 + z01 + z10) / 3);
    }
  }

  // ---------- models ----------
  function MB() { this.v = []; this.f = []; }
  MB.prototype.poly = function (pts, col, ds, ref) {
    const b = this.v.length; for (const p of pts) this.v.push(p);
    this.f.push({ i: pts.map((_, k) => b + k), c: col, ds: !!ds, ref }); return this;
  };
  MB.prototype.box = function (x0, y0, z0, x1, y1, z1, col, top) {
    const ref = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    this.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], top || col, false, ref);
    this.poly([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], col, false, ref);
    this.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col, false, ref);
    this.poly([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], col, false, ref);
    this.poly([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], col, false, ref);
    this.poly([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], col, false, ref);
    return this;
  };
  // fuselage-like prism from cross sections [z, halfW, halfH, yCentre]
  MB.prototype.prism = function (secs, col, colTop) {
    const pts = s => [[-s[1], s[3] - s[2], s[0]], [s[1], s[3] - s[2], s[0]], [s[1], s[3] + s[2], s[0]], [-s[1], s[3] + s[2], s[0]]];
    for (let i = 0; i < secs.length - 1; i++) {
      const a = pts(secs[i]), b = pts(secs[i + 1]), ref = [0, (secs[i][3] + secs[i + 1][3]) / 2, (secs[i][0] + secs[i + 1][0]) / 2];
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        this.poly([a[k], a[k2], b[k2], b[k]], (k === 2 && colTop) ? colTop : col, false, ref);
      }
    }
    const f = secs[0], l = secs[secs.length - 1];
    if (f[1] > 0.05) this.poly(pts(f), col, false, [0, f[3], f[0] + (secs[1][0] - f[0]) * 0.5]);
    if (l[1] > 0.05) this.poly(pts(l), col, false, [0, l[3], l[0] + (secs[secs.length - 2][0] - l[0]) * 0.5]);
    return this;
  };
  MB.prototype.mirror = function (pts, col, ds) { this.poly(pts, col, ds); this.poly(pts.map(p => [-p[0], p[1], p[2]]).reverse(), col, ds); return this; };
  MB.prototype.done = function (dotCol) {
    const v = this.v; let cx = 0, cy = 0, cz = 0;
    for (const p of v) { cx += p[0]; cy += p[1]; cz += p[2]; }
    const cen = [cx / v.length, cy / v.length, cz / v.length];
    let r = 0; for (const p of v) r = Math.max(r, vlen(p));
    for (const f of this.f) {
      let n = [0, 0, 0], fc = [0, 0, 0];
      for (let k = 0; k < f.i.length; k++) {
        const a = v[f.i[k]], b = v[f.i[(k + 1) % f.i.length]];
        n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
        fc = add(fc, a);
      }
      fc = mul(fc, 1 / f.i.length); n = norm(n);
      if (!f.ds && dot(n, sub(fc, f.ref || cen)) < 0) n = mul(n, -1);
      f.n = n; delete f.ref;
    }
    const dc = dotCol || this.f[0].c;
    return { v, f: this.f, r, dot: colStr(dc[0] * 0.7, dc[1] * 0.7, dc[2] * 0.7) };
  };
  // draw a model with frame o at pos. layer 2 = objects, 1 = ground decals.
  function drawModel(m, pos, o, sc, layer, hot, dimK) {
    const c = RD.cam; sc = sc || 1; layer = layer == null ? 2 : layer;
    const q0 = toCam(c, pos), r = m.r * sc;
    if (q0[2] < -r) return;
    const dd = Math.sqrt(q0[0] * q0[0] + q0[1] * q0[1] + q0[2] * q0[2]);
    if (dd - r > RD.view * 1.25) return;
    if (q0[2] > r) {
      const tx = (c.vp.w / 2) / c.f * 1.1, ty = (c.vp.h / 2) / c.f * 1.1;
      if (Math.abs(q0[0]) - r > q0[2] * tx || Math.abs(q0[1]) - r > q0[2] * ty) return;
      if (r * c.f / q0[2] < 1.4) { pushDot(layer, q0, 0, RD.mono ? '#efe' : m.dot, 1.5); return; }
    }
    const R = o.R, U = o.U, F = o.F, W = new Array(m.v.length), Q = new Array(m.v.length);
    for (let i = 0; i < m.v.length; i++) {
      const p = m.v[i], x = p[0] * sc, y = p[1] * sc, z = p[2] * sc;
      const w = [pos[0] + R[0] * x + U[0] * y + F[0] * z, pos[1] + R[1] * x + U[1] * y + F[1] * z, pos[2] + R[2] * x + U[2] * y + F[2] * z];
      W[i] = w; Q[i] = toCam(c, w);
    }
    const dk = dimK || 1;
    for (const f of m.f) {
      const n = f.n, nw = [R[0] * n[0] + U[0] * n[1] + F[0] * n[2], R[1] * n[0] + U[1] * n[1] + F[1] * n[2], R[2] * n[0] + U[2] * n[1] + F[2] * n[2]];
      const w0 = W[f.i[0]];
      let ld = dot(nw, LIGHT);
      if (!f.ds) { if ((w0[0] - c.pos[0]) * nw[0] + (w0[1] - c.pos[1]) * nw[1] + (w0[2] - c.pos[2]) * nw[2] > 0) continue; }
      else ld = Math.abs(ld);
      const qs = new Array(f.i.length); let zs = 0;
      for (let k = 0; k < f.i.length; k++) { qs[k] = Q[f.i[k]]; zs += qs[k][2]; }
      pushPoly(layer, qs, shadeCol(f.c, (0.42 + 0.58 * Math.max(0, ld)) * dk, dd, hot), zs / f.i.length);
    }
  }

  // ---------- particles ----------
  function addFx(list, pos, vel, life, size, col, grow, kind) { list.push({ pos: pos.slice(), vel: vel ? vel.slice() : [0, 0, 0], life, max: life, size, col, grow: grow || 0, kind: kind || 0 }); }
  function boom(list, pos, big) {
    const n = big ? 14 : 7;
    for (let i = 0; i < n; i++) {
      const v = [(Math.random() - 0.5) * 40 * (big ? 2 : 1), Math.random() * 30 * (big ? 2 : 1), (Math.random() - 0.5) * 40 * (big ? 2 : 1)];
      addFx(list, pos, v, 0.6 + Math.random() * 0.8, (big ? 9 : 5) + Math.random() * 6, i % 3 === 0 ? [255, 240, 140] : [255, 140, 40], big ? 14 : 8, 1);
    }
    for (let i = 0; i < n; i++) addFx(list, add(pos, [(Math.random() - 0.5) * 20, Math.random() * 10, (Math.random() - 0.5) * 20]), [0, 8 + Math.random() * 10, 0], 2.5 + Math.random() * 2, big ? 12 : 7, [60, 58, 55], big ? 9 : 5, 0);
  }
  function stepFx(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]; p.life -= dt;
      if (p.life <= 0) { list[i] = list[list.length - 1]; list.pop(); continue; }
      p.pos = madd(p.pos, p.vel, dt); p.vel = mul(p.vel, 0.97); p.size += p.grow * dt;
    }
  }
  function drawFx(list) {
    const c = RD.cam;
    for (const p of list) {
      const q = toCam(c, p.pos); if (q[2] < 2) continue;
      const t = p.life / p.max, col = p.col;
      let s;
      if (p.kind === 1) s = RD.mono ? '#fff' : colStr(col[0], col[1] * (0.5 + t * 0.5), col[2] * t);
      else s = RD.mono ? colStr(120 * t + 40, 120 * t + 40, 120 * t + 40) : colStr(lerp(RD.fog[0], col[0], t), lerp(RD.fog[1], col[1], t), lerp(RD.fog[2], col[2], t));
      pushDot(2, q, p.size, s, 1);
    }
  }

  // ---------- player flight model ----------
  // p: {pos, o, v, thr, gear, fuel, pr, rr, g}; inp: {pitch, roll} in -1..1
  function flyPlane(p, inp, dt, cfg) {
    const v = Math.max(1, p.v), o = p.o;
    const auth = clamp((v - 35) / 90, 0.2, 1);
    const maxP = Math.min(cfg.pitchRate, cfg.gmax * 9.8 / Math.max(v, 60)) * auth;
    p.pr = lerp(p.pr || 0, inp.pitch * maxP, 0.2);
    p.rr = lerp(p.rr || 0, inp.roll * cfg.rollRate * auth, 0.22);
    rotPitch(o, p.pr * dt); rotRoll(o, p.rr * dt);
    // lift vs gravity bends the flight path (banked turns, stalls, inverted sag)
    const lf = Math.min(1, (v / cfg.stall) * (v / cfg.stall)) * (p.onGround ? 0 : 1);
    const a = [o.U[0] * lf * 9.8, o.U[1] * lf * 9.8 - 9.8, o.U[2] * lf * 9.8];
    const ap = sub(a, mul(o.F, dot(a, o.F)));
    o.F = norm(madd(o.F, ap, dt / v));
    o.U = norm(sub(o.U, mul(o.F, dot(o.U, o.F)))); o.R = cross(o.U, o.F);
    const thrust = p.fuel > 0 ? (p.thr <= 1 ? p.thr * cfg.mil : cfg.mil + (p.thr - 1) / 0.3 * (cfg.ab - cfg.mil)) * (p.hp < 30 ? 0.6 : 1) : 0;
    const k = cfg.drag * (p.gear ? 2.6 : 1) * (p.brake ? 2.2 : 1);
    const acc = thrust - k * v * v - 9.8 * o.F[1] - Math.abs(p.pr) * v * 0.05;
    p.v = clamp(p.v + acc * dt, 0, 600);
    p.vel = mul(o.F, p.v);
    p.pos = madd(p.pos, p.vel, dt);
    p.g = 1 + p.pr * p.v / 9.8;
    if (p.fuel > 0) p.fuel = Math.max(0, p.fuel - (0.25 + (p.thr > 1 ? p.thr * 4 : p.thr)) * cfg.burn * dt);
  }
  // bank-to-turn steering toward a world point -> {pitch, roll}
  function steerInputs(o, pos, tgt, maxBank, gain) {
    const d = sub(tgt, pos), hd = Math.atan2(d[0], d[2]), herr = wrapPI(hd - headingOf(o.F));
    const dh = Math.hypot(d[0], d[2]), gam = clamp(Math.atan2(d[1], dh), -0.5, 0.5);
    const roll = rollOf(o), bankDes = clamp(herr * 2.5 * (gain || 1), -maxBank, maxBank);
    const rollIn = clamp((bankDes - roll) * 2.2, -1, 1);
    const pit = pitchOf(o.F), cr = Math.cos(clamp(roll, -1.3, 1.3));
    const turnPull = Math.abs(roll) > 0.3 && Math.abs(herr) > 0.03 ? Math.min(0.65, Math.abs(herr) * 0.9) * Math.min(1, Math.abs(Math.sin(roll)) * 1.4) : 0;
    let pitchIn = clamp((gam - pit) * 5 + (1 / cr - 1) * 0.3 + turnPull, -1, 1);
    return { pitch: pitchIn, roll: rollIn };
  }
  // predicted bomb impact point (ballistic)
  function bombImpact(T, pos, vel, floorY) {
    let p = pos.slice(), v = vel.slice();
    for (let i = 0; i < 400; i++) {
      const dt = 0.1; v[1] -= 9.8 * dt; v = mul(v, 0.998);
      const np = madd(p, v, dt);
      if (np[1] <= (floorY == null ? hAt(T, np[0], np[2]) : floorY)) return { p: np, t: i * 0.1 };
      p = np;
    }
    return null;
  }
  // ---------- value noise ----------
  function hash2(i, j, s) { const n = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
  function vnoise(x, z, s) {
    const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
    return lerp(lerp(hash2(i, j, s), hash2(i + 1, j, s), u), lerp(hash2(i, j + 1, s), hash2(i + 1, j + 1, s), u), w);
  }
  function fbm(x, z, s, oct) { let t = 0, a = 1, n = 0; for (let o = 0; o < (oct || 5); o++) { t += a * vnoise(x, z, s + o * 13); n += a; a *= 0.5; x *= 2.03; z *= 2.03; } return t / n; }
  function smooth01(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
  function rotToward(a, b, maxAng) {
    const d = clamp(dot(a, b), -1, 1), ang = Math.acos(d);
    if (ang <= maxAng) return b.slice();
    const perp = sub(b, mul(a, d)); const pl = vlen(perp);
    if (pl < 1e-6) return a.slice();
    const pn = mul(perp, 1 / pl);
    return norm(add(mul(a, Math.cos(maxAng)), mul(pn, Math.sin(maxAng))));
  }
  // cached top-down terrain picture for briefing maps
  function terrainPic(T, px) {
    let cv = null, g = null;
    try { cv = document.createElement('canvas'); cv.width = T.N * px; cv.height = T.N * px; g = cv.getContext('2d'); } catch (e) { g = null; }
    if (!g) return null;
    for (let j = 0; j < T.N; j++) for (let i = 0; i < T.N; i++) {
      const o = (j * T.N + i) * 3, h = vh(T, i, j), l = 0.8 + Math.min(0.5, h / 3000);
      g.fillStyle = colStr(T.C[o] * l, T.C[o + 1] * l, T.C[o + 2] * l);
      g.fillRect(i * px, (T.N - 1 - j) * px, px, px);
    }
    return cv;
  }
  // ---------- model library (generic designs, metres; x right, y up, z forward) ----------
  function mdlLightFighter(col, col2) {
    col = col || [150, 156, 166]; col2 = col2 || [110, 116, 126];
    const m = new MB();
    m.prism([[7.6, 0.04, 0.04, 0.15], [5.4, 0.5, 0.5, 0.15], [2.5, 0.7, 0.72, 0.1], [-3.5, 0.72, 0.7, 0.1], [-7.2, 0.45, 0.5, 0.15]], col, col);
    m.box(-0.33, 0.62, 1.4, 0.33, 1.1, 4.4, [40, 60, 90], [70, 100, 140]);
    m.box(-0.5, -1.05, -0.5, 0.5, -0.4, 3.3, col2);
    m.mirror([[-0.7, 0, 1.6], [-4.8, 0, -2.6], [-4.8, 0, -3.6], [-0.7, 0, -3.8]], col, true);
    m.mirror([[-0.6, 0.1, -5.0], [-2.9, 0.1, -6.8], [-2.9, 0.1, -7.5], [-0.5, 0.1, -7.5]], col2, true);
    m.poly([[0, 0.75, -3.9], [0, 3.7, -6.6], [0, 3.7, -7.5], [0, 0.75, -7.3]], col2, true);
    return m.done();
  }
  function mdlDeltaBandit(col, col2) {
    col = col || [120, 128, 92]; col2 = col2 || [90, 96, 70];
    const m = new MB();
    m.prism([[8, 0.04, 0.04, 0], [5.5, 0.55, 0.55, 0], [1, 0.8, 0.75, 0], [-5.5, 0.75, 0.7, 0], [-7, 0.5, 0.5, 0]], col, col);
    m.box(-0.3, 0.5, 2.0, 0.3, 1.0, 4.2, [30, 40, 60]);
    m.mirror([[-0.8, 0, 2.5], [-4.6, 0, -5.4], [-0.8, 0, -5.6]], col2, true);
    m.poly([[0, 0.7, -2.5], [0, 3.6, -6.2], [0, 3.6, -7.0], [0, 0.7, -6.6]], col2, true);
    return m.done();
  }
  function mdlHeavyBandit(col, col2) {
    col = col || [130, 136, 150]; col2 = col2 || [96, 102, 120];
    const m = new MB();
    m.prism([[10, 0.04, 0.04, 0.2], [7, 0.6, 0.6, 0.2], [3, 1.4, 0.8, 0], [-6, 1.6, 0.7, 0], [-9, 1.2, 0.55, 0]], col, col);
    m.box(-0.35, 0.65, 3.5, 0.35, 1.2, 6.4, [30, 40, 60]);
    m.mirror([[-1.4, 0, 2.5], [-7.2, 0, -3.2], [-7.2, 0, -4.4], [-1.5, 0, -5.4]], col2, true);
    m.mirror([[-1.2, 0, -6.2], [-3.6, 0, -8.2], [-3.6, 0, -9], [-1.1, 0, -9]], col2, true);
    m.mirror([[-1.1, 0.6, -4.8], [-1.6, 3.6, -7.6], [-1.6, 3.6, -8.6], [-1.1, 0.6, -8.8]], col2, true);
    return m.done();
  }
  function mdlStrikeEagle(col, col2) {
    col = col || [96, 102, 108]; col2 = col2 || [76, 80, 86];
    const m = new MB();
    m.prism([[9.8, 0.04, 0.04, 0.3], [7.2, 0.55, 0.6, 0.3], [4, 0.9, 0.85, 0.3], [1.5, 1.9, 0.75, 0], [-6.5, 1.9, 0.7, 0], [-9, 1.3, 0.55, 0]], col, col);
    m.box(-0.4, 0.85, 1.6, 0.4, 1.45, 6.2, [40, 60, 90], [60, 90, 130]);
    m.mirror([[-1.9, 0, 2.2], [-6.6, 0, -2.8], [-6.6, 0, -4.4], [-1.9, 0, -5.2]], col, true);
    m.mirror([[-1.6, 0, -6.4], [-4.0, 0, -8.0], [-4.0, 0, -9.2], [-1.4, 0, -9.2]], col2, true);
    m.mirror([[-1.5, 0.7, -5.2], [-1.6, 4.0, -7.9], [-1.6, 4.0, -9.0], [-1.5, 0.7, -9.1]], col2, true);
    return m.done();
  }
  function mdlTanker() {
    const c = [175, 178, 182], c2 = [140, 144, 150], m = new MB();
    m.prism([[24, 0.2, 0.2, 0.5], [20, 2, 2.2, 0.5], [-14, 2, 2.2, 0.5], [-22, 0.8, 1.2, 1.5]], c, c);
    m.mirror([[-2, 0, 4], [-22, 0, -6], [-22, 0, -9], [-2, 0, -4]], c2, true);
    m.mirror([[-1, 1, -16], [-8, 1, -21], [-8, 1, -23], [-1, 1, -22]], c2, true);
    m.poly([[0, 2.5, -14], [0, 9, -21], [0, 9, -23], [0, 2.5, -22]], c2, true);
    for (const x of [-7, -14, 7, 14]) m.box(x - 0.8, -1.8, -1 + Math.abs(x) * -0.4 + 3, x + 0.8, -0.4, 4 + Math.abs(x) * -0.4 + 3, [110, 112, 118]);
    m.box(-0.2, -0.6, -28, 0.2, -0.2, -20, [90, 90, 90]);
    return m.done();
  }
  function mdlMissile(c) { const m = new MB(); m.prism([[1.8, 0.02, 0.02, 0], [1.3, 0.12, 0.12, 0], [-1.8, 0.12, 0.12, 0]], c || [235, 235, 235]); m.mirror([[-0.1, 0, -1.2], [-0.45, 0, -1.8], [-0.1, 0, -1.8]], [150, 150, 150], true); return m.done(); }
  function mdlBomb(c) { const m = new MB(); m.prism([[1.2, 0.02, 0.02, 0], [0.7, 0.22, 0.22, 0], [-0.9, 0.22, 0.22, 0], [-1.4, 0.1, 0.1, 0]], c || [70, 90, 60]); return m.done(); }
  function mdlSam() {
    const m = new MB(), g = [96, 104, 74];
    m.box(-1.4, 0, -3, 1.4, 1.6, 3, g, [110, 118, 84]);
    m.box(-0.8, 1.6, -1.2, 0.8, 2.4, 1.2, [84, 90, 64]);
    for (const x of [-0.6, 0.6]) {
      m.poly([[x - 0.25, 2.0, -2.2], [x + 0.25, 2.0, -2.2], [x + 0.25, 5.2, 2.6], [x - 0.25, 5.2, 2.6]], [230, 230, 225], true);
      m.poly([[x, 1.8, -2.4], [x, 2.6, -2.0], [x, 5.4, 2.6], [x, 5.0, 2.8]], [210, 210, 205], true);
    }
    return m.done();
  }
  function mdlRadarBase() {
    const m = new MB();
    m.box(-4, 0, -4, 4, 3.5, 4, [150, 145, 130], [120, 116, 104]);
    m.box(-0.5, 3.5, -0.5, 0.5, 8, 0.5, [90, 90, 90]);
    return m.done();
  }
  function mdlDish() {
    const m = new MB(), c = [210, 210, 215];
    m.poly([[-5, -1.8, 0.8], [5, -1.8, 0.8], [6, 0, 0], [5, 1.8, 0.8], [-5, 1.8, 0.8], [-6, 0, 0]], c, true);
    m.box(-0.3, -0.3, 0, 0.3, 0.3, 2.5, [120, 120, 120]);
    return m.done();
  }
  function mdlAAA() {
    const m = new MB(), g = [90, 96, 70];
    m.box(-1.6, 0, -1.6, 1.6, 1.2, 1.6, g);
    m.box(-0.8, 1.2, -0.8, 0.8, 2.2, 0.8, [80, 86, 62]);
    m.poly([[-0.4, 1.8, 0.5], [-0.4, 3.6, 3.4], [-0.25, 3.7, 3.4], [-0.25, 1.9, 0.5]], [50, 50, 50], true);
    m.poly([[0.4, 1.8, 0.5], [0.4, 3.6, 3.4], [0.25, 3.7, 3.4], [0.25, 1.9, 0.5]], [50, 50, 50], true);
    return m.done();
  }
  function mdlBridgeSpan(len) {
    const m = new MB(), c = [140, 132, 120], h = len / 2;
    m.box(-6, 7, -h, 6, 9, h, c, [100, 98, 96]);
    m.box(-6.5, 9, -h, -5.5, 10.2, h, [170, 165, 150]);
    m.box(5.5, 9, -h, 6.5, 10.2, h, [170, 165, 150]);
    for (const z of [-h + 4, 0, h - 4]) m.box(-3, -4, z - 2.5, 3, 7, z + 2.5, [120, 115, 105]);
    return m.done();
  }
  function mdlHangar(c) {
    const m = new MB(); c = c || [128, 128, 112];
    m.box(-14, 0, -18, 14, 7, 18, c);
    const r = [104, 108, 96];
    m.poly([[-14, 7, -18], [0, 12, -18], [0, 12, 18], [-14, 7, 18]], r, false, [0, 4, 0]);
    m.poly([[14, 7, -18], [0, 12, -18], [0, 12, 18], [14, 7, 18]], r, false, [0, 4, 0]);
    m.poly([[-14, 7, 18], [14, 7, 18], [0, 12, 18]], c, false, [0, 4, 0]);
    m.poly([[-14, 7, -18], [14, 7, -18], [0, 12, -18]], c, false, [0, 4, 0]);
    m.poly([[-10, 0.5, 18.05], [10, 0.5, 18.05], [10, 6, 18.05], [-10, 6, 18.05]], [60, 60, 60], false, [0, 3, 0]);
    return m.done();
  }
  function mdlBunker() {
    const m = new MB(), c = [130, 126, 116], t = [110, 106, 98], ref = [0, 0, 0];
    m.poly([[-14, 6, -10], [14, 6, -10], [14, 6, 10], [-14, 6, 10]], t, false, ref);
    m.poly([[-20, 0, -16], [20, 0, -16], [14, 6, -10], [-14, 6, -10]], c, false, ref);
    m.poly([[-20, 0, 16], [20, 0, 16], [14, 6, 10], [-14, 6, 10]], c, false, ref);
    m.poly([[-20, 0, -16], [-20, 0, 16], [-14, 6, 10], [-14, 6, -10]], c, false, ref);
    m.poly([[20, 0, -16], [20, 0, 16], [14, 6, 10], [14, 6, -10]], c, false, ref);
    m.box(-2, 6, -2, 2, 9, 2, [90, 90, 90]);
    return m.done();
  }
  function mdlTruck(c) { const m = new MB(); c = c || [100, 100, 70]; m.box(-1.2, 0.5, -3.5, 1.2, 3, 1.5, c, [120, 120, 86]); m.box(-1.2, 0.5, 1.5, 1.2, 2.4, 3.5, [80, 80, 60]); return m.done(); }
  function mdlTank(c) {
    const m = new MB(); c = c || [96, 100, 70];
    m.box(-1.7, 0, -3.3, 1.7, 1.5, 3.3, c); m.box(-1.1, 1.5, -1.6, 1.1, 2.4, 1.2, [86, 90, 62]);
    m.poly([[-0.12, 1.95, 1.2], [0.12, 1.95, 1.2], [0.12, 1.95, 5.0], [-0.12, 1.95, 5.0]], [60, 60, 50], true);
    return m.done();
  }
  function mdlFactory() {
    const m = new MB();
    m.box(-25, 0, -15, 25, 12, 15, [150, 120, 100], [110, 100, 92]);
    m.box(-25, 0, 15, -5, 18, 30, [140, 130, 115]);
    m.box(15, 12, -10, 19, 34, -6, [120, 80, 70]); m.box(5, 12, -10, 9, 30, -6, [120, 80, 70]);
    return m.done();
  }
  function mdlTower() { const m = new MB(); m.box(-3, 0, -3, 3, 14, 3, [170, 165, 150]); m.box(-4.5, 14, -4.5, 4.5, 18, 4.5, [60, 80, 100]); return m.done(); }
  function mdlFuelTank() { const m = new MB(); m.prism([[6, 0.1, 0.1, 6], [5.6, 6, 6, 6], [-5.6, 6, 6, 6], [-6, 0.1, 0.1, 6]], [200, 200, 190]); return m.done(); }
  function mdlRubble() { const m = new MB(), c = [52, 48, 44]; m.box(-8, 0, -6, 2, 1.6, 4, c); m.box(-1, 0, -2, 7, 2.6, 7, [64, 58, 50]); m.box(-5, 0, 3, 0, 1, 8, c); return m.done(); }
  function mdlBuilding(w, h, d, c) { const m = new MB(); m.box(-w, 0, -d, w, h, d, c || [160, 150, 130], [120, 112, 100]); return m.done(); }
  function mdlChute() {
    const m = new MB(), c = [235, 235, 235], c2 = [230, 120, 40];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, b = (i + 1) / 6 * TAU; m.poly([[0, 8, 0], [Math.cos(a) * 4, 6, Math.sin(a) * 4], [Math.cos(b) * 4, 6, Math.sin(b) * 4]], i & 1 ? c : c2, true); }
    m.box(-0.3, 0, -0.3, 0.3, 1.6, 0.3, [80, 90, 70]);
    return m.done();
  }
  function mdlDerrick() {
    const m = new MB(), c = [90, 80, 70];
    m.poly([[-3, 0, -3], [3, 0, 3], [0, 22, 0]], c, true); m.poly([[3, 0, -3], [-3, 0, 3], [0, 22, 0]], c, true);
    m.box(-4, 0, -4, 4, 1, 4, [70, 64, 60]); return m.done();
  }
  function mdlShip() {
    const m = new MB(), c = [120, 124, 130];
    m.prism([[45, 0.3, 2, 2], [35, 6, 4, 2], [-40, 6, 4, 2], [-44, 4, 4, 2]], c, [100, 104, 110]);
    m.box(-4, 6, -15, 4, 14, 0, [150, 150, 155]); m.box(-1, 14, -8, 1, 22, -6, [90, 90, 95]);
    return m.done();
  }
  // flat decal rectangle list -> model ([x0,z0,x1,z1,col])
  function mdlDecal(rects) {
    const m = new MB();
    for (const r of rects) m.poly([[r[0], 0, r[1]], [r[2], 0, r[1]], [r[2], 0, r[3]], [r[0], 0, r[3]]], r[4], true);
    return m.done(rects[0][4]);
  }
  function mdlRunway(len, w) {
    const h = len / 2, rects = [[-w / 2, -h, w / 2, h, [66, 66, 70]]];
    for (let z = -h + 120; z < h - 120; z += 90) rects.push([-0.8, z, 0.8, z + 40, [225, 225, 225]]);
    for (let k = -3; k <= 3; k++) { if (!k) continue; rects.push([k * 5 - 1.4, -h + 10, k * 5 + 1.4, -h + 45, [225, 225, 225]]); rects.push([k * 5 - 1.4, h - 45, k * 5 + 1.4, h - 10, [225, 225, 225]]); }
    rects.push([w / 2, -h + 200, w / 2 + 120, -h + 260, [80, 80, 82]], [w / 2 + 120, -h + 200, w / 2 + 300, h - 600, [86, 86, 88]]);
    return mdlDecal(rects);
  }
  const SHADOW = mdlDecal([[-5, -7, 5, 7, [20, 20, 20]]]);
  ArcadeRegistry.register({
    id: 'falcon3', title: 'Falcon 3.0', year: 1991, maker: 'Spectrum HoloByte',
    width: 320, height: 240, vector: false, pointer: false,
    controls: 'Arrows: fly (Down = pull up) \u00b7 Space: fire \u00b7 X: weapon \u00b7 Enter: start / flares+chaff \u00b7 W/S: throttle \u00b7 T or Z: target \u00b7 R: radar range \u00b7 G: gear \u00b7 A: autopilot \u00b7 N: steerpoint \u00b7 V: view \u00b7 Q/E: wingman attack/rejoin',
    marquee: { bg: '#0b1420', fg: '#7dff9a', accent: '#ffcc33' },
    create(api) {
      const W = 320, H = 240, VP = { x: 0, y: 0, w: 320, h: 172 }, FOC = 205, CYF = 0.46, VIEW = 9500;
      const HUDC = '#6f9', HUDD = '#3a6', AMB = '#fc4', RED = '#f44', WHT = '#eee', GRY = '#999', CYA = '#6cf';
      const FCFG = { pitchRate: 0.62, rollRate: 2.8, gmax: 9, stall: 62, mil: 14, ab: 25, drag: 14 / (300 * 300), burn: 0.33 };
      const KT = 1.944, FT = 3.281, NM = 1 / 1852;
      const TH = {
        sky: [62, 112, 186], sky2: [104, 150, 206], fog: [172, 192, 210], far: [150, 170, 172], outType: 1,
        cols: [[52, 86, 140], [104, 132, 70], [62, 98, 52], [122, 122, 86], [128, 118, 106], [226, 228, 236], [150, 140, 96]]
      };
      // ---------- the campaign map ----------
      const N = 64, CS = 500, SIZE = N * CS;
      const RW = { x: 6000, z0: 3600, z1: 6200, y: 20 };
      const EAF = { x: 24200, z0: 24000, z1: 26400, y: 70 };
      const riverZ = x => 13500 + 2200 * Math.sin(x / 4300) + 700 * Math.sin(x / 1700 + 1);
      const FLATS = [[RW.x + 150, (RW.z0 + RW.z1) / 2, 2700, RW.y], [EAF.x + 150, (EAF.z0 + EAF.z1) / 2, 2400, EAF.y], [20000, 29000, 900, 0], [27500, 29500, 700, 0]];
      function gen(x, z) {
        const n = fbm(x / 7000, z / 7000, 3, 5);
        const m = clamp((z - 8000) / 15000, 0.1, 1) * (0.7 + 0.3 * smooth01(5000, 25000, x));
        let h = Math.max(0, n - 0.36) * 3300 * m + 40 * n;
        const dz = Math.abs(z - riverZ(x));
        h *= smooth01(320, 1500, dz);
        for (const f of FLATS) {
          const d = Math.hypot(x - f[0], z - f[1]);
          if (d < f[2]) { const fh = f[3] || Math.min(h, 400); h = lerp(fh, h, smooth01(f[2] * 0.62, f[2], d)); }
        }
        return Math.round(h);
      }
      function typeFn(avg, sl, x, z) {
        if (Math.abs(z - riverZ(x)) < 330) return 0;
        if (avg > 1500) return 5;
        if (avg > 950 || sl > 280) return 4;
        if (avg > 420) return 3;
        const f = fbm(x / 2500, z / 2500, 9, 3);
        return f > 0.56 ? 2 : (f < 0.33 ? 6 : 1);
      }
      const T = makeTerrain(N, CS, gen, typeFn, TH, 1991);
      let mapPic = null;
      // ---------- models ----------
      const M = {
        f16: mdlLightFighter(), wing: mdlLightFighter([140, 148, 160], [104, 110, 122]), banA: mdlDeltaBandit(), banB: mdlHeavyBandit(),
        tanker: mdlTanker(), aam: mdlMissile(), sam: mdlMissile([240, 240, 240]), bomb: mdlBomb(), harm: mdlMissile([200, 200, 180]),
        rubble: mdlRubble(), chute: mdlChute(), dish: mdlDish(), runway: mdlRunway(RW.z1 - RW.z0, 46), erunway: mdlRunway(EAF.z1 - EAF.z0, 46)
      };
      const GK = {
        sam: { m: mdlSam(), hp: 1, r: 16, pts: 300, name: 'SAM SITE', emit: true },
        radar: { m: mdlRadarBase(), hp: 2, r: 18, pts: 500, name: 'RADAR', emit: true },
        aaa: { m: mdlAAA(), hp: 1, r: 12, pts: 150, name: 'AAA' },
        bridge: { m: mdlBridgeSpan(240), hp: 2, r: 60, pts: 600, name: 'BRIDGE SPAN' },
        hangar: { m: mdlHangar(), hp: 2, r: 26, pts: 450, name: 'HANGAR' },
        bunker: { m: mdlBunker(), hp: 3, r: 26, pts: 900, name: 'COMMAND BUNKER' },
        factory: { m: mdlFactory(), hp: 3, r: 36, pts: 700, name: 'FACTORY' },
        fuel: { m: mdlFuelTank(), hp: 1, r: 12, pts: 250, name: 'FUEL TANK' },
        truck: { m: mdlTruck(), hp: 1, r: 14, pts: 120, name: 'TRUCK' },
        tank: { m: mdlTank(), hp: 1, r: 9, pts: 150, name: 'TANK' },
        tower: { m: mdlTower(), hp: 1, r: 8, pts: 100, name: 'TOWER' },
        parked: { m: mdlDeltaBandit([110, 116, 90]), hp: 1, r: 10, pts: 200, name: 'PARKED JET' },
        fhangar: { m: mdlHangar([150, 150, 140]), hp: 99, r: 1, pts: 0, name: 'BASE', friendly: true },
        ftower: { m: mdlTower(), hp: 99, r: 1, pts: 0, name: 'BASE', friendly: true }
      };
      const RANKS = [[0, '2ND LT'], [6000, '1ST LT'], [15000, 'CAPTAIN'], [28000, 'MAJOR'], [45000, 'LT COLONEL'], [66000, 'COLONEL'], [90000, 'BRIG GENERAL']];
      const rankOf = s => { let r = 0; for (let i = 0; i < RANKS.length; i++) if (s >= RANKS[i][0]) r = i; return r; };
      const WNAMES = ['GUN', 'AIM-9', 'AIM-120', 'MK-82', 'AGM-88'], WSHORT = ['GUN', 'AIM9', 'A120', 'MK82', 'HARM'];
      // ---------- missions ----------
      const SAMS = [[11000, 17600], [17200, 18800], [22300, 21200], [26200, 27800], [14200, 24200], [8200, 22300], [19800, 27600], [28800, 24000]];
      const MSN = [
        { name: 'BORDER PATROL', text: ['ENEMY FIGHTERS ARE PROBING', 'OUR SIDE OF THE RIVER.', 'FLY THE CAP STATION AND', 'SPLASH 3 BANDITS. THEN', 'RETURN TO BASE AND LAND.'],
          kills: 3, load: [2, 4, 0, 0], cap: [[12500, 15500, 2, 0], [16500, 17000, 1, 0]], ip: [9000, 11000], tp: [14000, 16000], sams: [0] },
        { name: 'BRIDGE BUSTER', text: ['THE WEST BRIDGE CARRIES', 'ENEMY ARMOR SOUTH.', 'DROP ONE SPAN WITH MK-82S.', 'HOLD SPACE FOR AUTO RELEASE', 'WHEN THE TARGET IS BOXED.'],
          obj: [['bridgeW', 1]], load: [2, 4, 6, 0], cap: [[11000, 19000, 1, 0]], ip: [7000, 10000], tp: null, sams: [0, 5] },
        { name: 'IRON HAND', text: ['TWO SAM BATTERIES GUARD', 'THE CENTRAL VALLEY.', 'KILL BOTH WITH AGM-88', 'ANTI-RADAR MISSILES OR', 'BOMBS. WATCH YOUR RWR.'],
          obj: [['sam1', 1], ['sam2', 1]], load: [2, 4, 4, 2], cap: [], ip: [13000, 12000], tp: null, sams: [1, 2, 5] },
        { name: 'FIGHTER SWEEP', text: ['ENEMY AIR IS MASSING FOR', 'A STRIKE. CLEAR THE SKY:', 'SPLASH 5 BANDITS.', 'THE TANKER ORBITS SOUTH', 'IF YOU RUN LOW ON GAS.'],
          kills: 5, load: [2, 4, 0, 0], cap: [[16000, 20000, 2, 1], [21000, 22000, 2, 0], [13000, 23000, 1, 1]], ip: [14000, 15000], tp: [18000, 21000], sams: [1, 4] },
        { name: 'AIRFIELD ATTACK', text: ['STRIKE THE ENEMY AIRBASE.', 'DESTROY 2 HANGARS TO', 'GROUND THEIR FIGHTERS.', 'AAA AND A SAM COVER THE', 'FIELD. GO IN FAST.'],
          obj: [['hangar', 2]], load: [2, 4, 6, 0], cap: [[22000, 22000, 2, 1]], ip: [19000, 19000], tp: null, sams: [2, 3, 7] },
        { name: 'EARLY WARNING', text: ['A RADAR ON THE NORTH', 'RIDGE SEES OUR STRIKES.', 'TAKE IT OUT, THEN THE', 'SAM PROTECTING IT.', ''],
          obj: [['radar', 1], ['sam6', 1]], load: [2, 4, 4, 2], cap: [[15000, 25000, 2, 1]], ip: [12000, 18000], tp: null, sams: [4, 5, 6] },
        { name: 'CONVOY HUNT', text: ['A SUPPLY CONVOY IS MOVING', 'DOWN THE VALLEY ROAD.', 'DESTROY 4 TRUCKS BEFORE', 'THEY REACH THE RIVER.', 'GUN OR BOMBS.'],
          obj: [['truck', 4]], load: [2, 4, 6, 0], cap: [[17000, 22000, 2, 1]], ip: [12000, 15000], tp: null, sams: [1, 2], convoy: true },
        { name: 'DEEP STRIKE', text: ['THE ENEMY COMMAND BUNKER', 'AND ITS FACTORY LIE DEEP', 'IN THE NORTH. HIT BOTH.', 'EXPECT HEAVY RESISTANCE.', 'GOOD HUNTING, VIPER.'],
          obj: [['bunker', 1], ['factory', 1]], load: [2, 4, 6, 2], cap: [[23000, 26000, 2, 1], [19000, 24000, 2, 0]], ip: [20000, 22000], tp: null, sams: [2, 3, 6, 7] }
      ];
      // ---------- state ----------
      let state = 'title', stT = 0, attractT = 0, coinFlash = 0;
      let score = 0, hi = api.getHiScore(25000), jets = 3, msnIdx = 0, tour = 1, rankIdx = 0, promoted = false;
      let pl = null, air = [], gnd = [], mis = [], bul = [], fx = [], decals = [], tanker = null, wing = null, steer = [], stIdx = 0;
      let msn = null, objs = [], kills = 0, myKills = 0, gKills = 0, msnScore = 0, msnDone = false, result = '', refueled = false;
      let view = 0, radarRng = 1, msgs = [], spawnT = 0, deadT = 0, deadPos = null, engT = 0, lockTone = 0, warnT = 0, launchWarn = 0;
      let attract = null, dbgStart = 0, carry = null;
      function credStr() { return 'CREDIT ' + pad(Math.min(99, api.credits), 2); }
      function msg(t, c, d) { msgs.push({ t, c: c || HUDC, d: d || 3 }); if (msgs.length > 3) msgs.shift(); }
      const S = {
        gun() { api.audio.noise(0.05, { vol: 0.12, freq: 1800 }); },
        launch() { api.audio.noise(0.7, { vol: 0.2, freq: 2400, slideTo: 300 }); },
        boom(big) { api.audio.noise(big ? 1.1 : 0.6, { vol: big ? 0.3 : 0.2, freq: 900, slideTo: 60 }); },
        lock() { api.audio.tone(1300, 0.05, { type: 'square', vol: 0.06 }); },
        growl() { api.audio.tone(380 + Math.random() * 60, 0.06, { type: 'triangle', vol: 0.05 }); },
        warn() { api.audio.tone(900, 0.08, { type: 'square', vol: 0.1 }); api.audio.tone(600, 0.08, { type: 'square', vol: 0.1, delay: 0.09 }); },
        rwr() { api.audio.tone(2000, 0.03, { type: 'square', vol: 0.05 }); },
        drop() { api.audio.tone(200, 0.12, { type: 'square', vol: 0.12, slideTo: 90 }); },
        flare() { api.audio.noise(0.15, { vol: 0.1, freq: 4000, type: 'highpass' }); },
        good() { api.audio.melody([[523, 0.08], [659, 0.08], [784, 0.16]], { type: 'square', vol: 0.12 }); },
        bad() { api.audio.melody([[392, 0.15], [330, 0.15], [262, 0.3]], { type: 'square', vol: 0.12 }); },
        click() { api.audio.tone(1000, 0.03, { type: 'square', vol: 0.06 }); }
      };
      function addG(kind, x, z, yaw, tag, obj) {
        const k = GK[kind], y = kind === 'bridge' ? 0 : hAt(T, x, z);
        const g = { kind, k, pos: [x, y, z], o: frameYaw(yaw || 0), hp: k.hp, alive: true, tag: tag || kind, obj: !!obj, cool: 2 + Math.random() * 3, track: 0, rot: Math.random() * 6, side: 1, vel: [0, 0, 0], path: null };
        gnd.push(g); return g;
      }
      function buildWorld(m) {
        gnd = []; decals = [];
        decals.push({ m: M.runway, pos: [RW.x, RW.y + 0.3, (RW.z0 + RW.z1) / 2], o: frameYaw(0) });
        decals.push({ m: M.erunway, pos: [EAF.x, EAF.y + 0.3, (EAF.z0 + EAF.z1) / 2], o: frameYaw(0) });
        addG('fhangar', RW.x + 260, 4600, -PI / 2); addG('fhangar', RW.x + 260, 4980, -PI / 2); addG('ftower', RW.x + 200, 5500, 0);
        const objTags = {}; (m.obj || []).forEach(o => { objTags[o[0]] = 1; });
        const isObj = t => !!objTags[t];
        // bridges (3 spans across the river)
        for (const [bx, tag] of [[9000, 'bridgeW'], [19500, 'bridgeE']]) {
          const bz = riverZ(bx), s = (riverZ(bx + 50) - riverZ(bx - 50)) / 100, yaw = Math.atan2(-s, 1), F = [Math.sin(yaw), 0, Math.cos(yaw)];
          for (let i = -1; i <= 1; i++) addG('bridge', bx + F[0] * 240 * i, bz + F[2] * 240 * i, yaw, tag, isObj(tag));
        }
        // SAM batteries (mission set) + AAA
        m.sams.forEach(i => { const s = SAMS[i]; addG('sam', s[0], s[1], Math.random() * 6, 'sam' + i, isObj('sam' + i)); addG('aaa', s[0] + 220, s[1] - 180, 0, 'aaa'); });
        // enemy airfield
        for (let i = 0; i < 4; i++) addG('hangar', EAF.x + 300, EAF.z0 + 500 + i * 420, PI / 2, 'hangar', isObj('hangar'));
        for (let i = 0; i < 3; i++) addG('parked', EAF.x + 140, EAF.z0 + 650 + i * 420, PI / 2, 'parked');
        addG('tower', EAF.x - 160, EAF.z0 + 1200, 0, 'tower'); addG('fuel', EAF.x + 500, EAF.z1 - 300, 0, 'fuel'); addG('fuel', EAF.x + 540, EAF.z1 - 340, 0, 'fuel');
        for (const [dx, dz] of [[-400, 300], [600, 1200], [-300, 2100], [400, 2400]]) addG('aaa', EAF.x + dx, EAF.z0 + dz, 0, 'aaa');
        // radar on the ridge, factory, bunker
        addG('radar', 15600, 26800, 0, 'radar', isObj('radar')); addG('aaa', 15800, 26600, 0, 'aaa');
        addG('factory', 20000, 29000, 0.3, 'factory', isObj('factory')); addG('fuel', 20100, 28880, 0, 'fuel'); addG('aaa', 19700, 29200, 0, 'aaa'); addG('aaa', 20300, 28700, 0, 'aaa');
        addG('bunker', 27500, 29500, 0, 'bunker', isObj('bunker')); addG('aaa', 27300, 29700, 0, 'aaa'); addG('aaa', 27700, 29300, 0, 'aaa');
        // armour scattered north of the river
        for (let i = 0; i < 6; i++) addG('tank', 10000 + i * 2600, riverZ(10000 + i * 2600) + 1800 + (i % 3) * 400, Math.random() * 6, 'tank');
        if (m.convoy) {
          for (let i = 0; i < 6; i++) {
            const g = addG('truck', 0, 0, 0, 'truck', true);
            g.path = { a: [21000, 26500], b: [12500, riverZ(12500) + 700], t: -i * 0.009 };
            placeConvoy(g, 0);
          }
        }
      }
      function placeConvoy(g, dt) {
        const p = g.path; p.t = Math.min(1, p.t + dt * 0.0016);
        const t = clamp(p.t, 0, 1), x = lerp(p.a[0], p.b[0], t), z = lerp(p.a[1], p.b[1], t);
        const yaw = Math.atan2(p.b[0] - p.a[0], p.b[1] - p.a[1]);
        g.pos = [x, hAt(T, x, z), z]; g.o = frameYaw(yaw);
        const sp = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) * 0.0016;
        g.vel = [Math.sin(yaw) * sp, 0, Math.cos(yaw) * sp];
      }
      function newPlayer() {
        const ld = msn.load;
        pl = {
          pos: [RW.x, 900, RW.z1 + 2500], o: frameYaw(0), v: 200, vel: [0, 0, 200], thr: 0.8, autoThr: true, gear: false, fuel: 100, hp: 100,
          pr: 0, rr: 0, g: 1, alive: true, side: 0, isPl: true, ammo: [510, ld[0], ld[1], ld[2], ld[3]], wsel: ld[1] ? 2 : 1, tgt: null, lockT: 0,
          flares: 40, chaff: 40, gunCool: 0, relCool: 0, ap: false, onGround: false, roll: false, ripple: 0, brake: false
        };
        const hd = Math.atan2(steer[0].p[0] - pl.pos[0], steer[0].p[2] - pl.pos[2]); pl.o = frameYaw(hd); pl.vel = mul(pl.o.F, pl.v);
      }
      function mkAir(kind, side, pos, hd, opts) {
        const a = { kind, side, pos: pos.slice(), o: frameYaw(hd), v: 230, vt: 240, vel: [0, 0, 0], hp: 100, alive: true, dead: 0, tgt: null, retgt: 0,
          msl: 2, mslCool: 4 + Math.random() * 4, gunCool: 0, turn: 0.3, m: kind === 'B' ? M.banB : kind === 'W' ? M.wing : M.banA, home: pos.slice(), orbit: Math.random() * 6, flares: 2, cmd: 0, bombs: 0 };
        Object.assign(a, opts || {}); a.vel = mul(a.o.F, a.v); air.push(a); return a;
      }
      function spawnBandit(x, z, kind) {
        const y = Math.max(hAt(T, x, z) + 900, 2500 + Math.random() * 2500);
        const hd = Math.atan2(pl.pos[0] - x, pl.pos[2] - z);
        const k = kind ? 'B' : 'A';
        return mkAir(k, 1, [x, y, z], hd, { turn: (k === 'B' ? 0.27 : 0.31) + tour * 0.03, vt: 245 + tour * 15, msl: k === 'B' ? 3 : 2, aggro: 0.6 + tour * 0.1 });
      }
      function startMission() {
        msn = MSN[msnIdx % MSN.length]; air = []; mis = []; bul = []; fx = []; msgs = [];
        buildWorld(msn);
        objs = (msn.obj || []).map(o => ({ tag: o[0], need: o[1], label: o[0] }));
        kills = 0; myKills = 0; gKills = 0; msnScore = 0; msnDone = false; refueled = false; spawnT = 50;
        // the war goes on: targets destroyed on an earlier sortie of this mission stay destroyed
        if (carry && carry.idx === msnIdx) {
          kills = carry.kills;
          for (const tag in carry.tags) { let n = carry.tags[tag]; for (const g of gnd) if (n > 0 && g.tag === tag && g.obj) { g.alive = false; n--; } }
        }
        carry = null;
        const tgtPt = msn.tp || (() => { const g = gnd.find(g => g.obj); return g ? [g.pos[0], g.pos[2]] : [16000, 20000]; })();
        steer = [{ n: 'IP', p: [msn.ip[0], 3000, msn.ip[1]] }, { n: 'TGT', p: [tgtPt[0], 3000, tgtPt[1]] }, { n: 'HOME', p: [RW.x, RW.y + 600, RW.z0 - 6000] }, { n: 'TNKR', p: [0, 0, 0] }];
        stIdx = 0;
        newPlayer();
        wing = mkAir('W', 0, add(pl.pos, [-80, 0, -90]), headingOf(pl.o.F), { turn: 0.4, vt: pl.v, msl: 4, bombs: 2, wing: true });
        tanker = { pos: [0, 4200, 0], o: frameYaw(0), v: 150, vel: [0, 0, 0], ang: 0, alive: true };
        msn.cap.forEach(c => { for (let i = 0; i < c[2] + (tour > 1 ? 1 : 0); i++) { const b = spawnBandit(c[0] + i * 400, c[1] + i * 300, c[3]); b.home = [c[0], b.pos[1], c[1]]; } });
        state = 'fly'; stT = 0; view = 0;
        msg(msn.name, AMB, 4); msg('FENCE IN. ' + (msn.kills ? 'SPLASH ' + msn.kills + ' BANDITS' : 'TARGET: ' + objText()), HUDC, 5);
      }
      function objText() { return objs.map(o => GK[gnd.find(g => g.tag === o.tag).kind].name + (o.need > 1 ? ' X' + o.need : '')).join(', '); }
      function objCount(o) { return gnd.filter(g => g.tag === o.tag && !g.alive && !g.escaped).length; }
      function tankerUpd(dt) {
        const C = [12500, 4200, 8000], R = 4200;
        tanker.ang += tanker.v / R * dt;
        const a = tanker.ang;
        tanker.pos = [C[0] + Math.cos(a) * R, C[1], C[2] + Math.sin(a) * R];
        const F = [-Math.sin(a), 0, Math.cos(a)];
        tanker.o = frameFrom(F, norm([Math.cos(a) * 0.25, 1, Math.sin(a) * 0.25]));
        tanker.vel = mul(F, tanker.v);
        steer[3].p = add(tanker.pos, mul(tanker.o.F, -260));
      }
      // ---------- targeting ----------
      function aaMode() { return pl.wsel <= 2; }
      function radarRange() { return [10000, 20000, 40000][radarRng]; }
      function candidates() {
        const out = [];
        if (aaMode()) {
          for (const a of air) {
            if (!a.alive || a.side !== 1) continue;
            const d = sub(a.pos, pl.pos), r = vlen(d); if (r > radarRange()) continue;
            const c = dot(norm(d), pl.o.F); if (c < 0.5) continue;
            out.push({ e: a, s: r * (2 - c) });
          }
        } else {
          for (const g of gnd) {
            if (!g.alive || g.k.friendly) continue;
            if (pl.wsel === 4 && !g.k.emit) continue;
            const d = sub(g.pos, pl.pos), r = vlen(d); if (r > (pl.wsel === 4 ? 26000 : 16000)) continue;
            const c = dot(norm(d), pl.o.F); if (c < 0.6 && !(g.obj && r < 25000)) continue;
            out.push({ e: g, s: g.obj ? r * 0.01 : r * (2 - c) + 1000 });
          }
        }
        out.sort((a, b) => a.s - b.s);
        return out.map(o => o.e);
      }
      function validTgt(t) {
        if (!t || !t.alive) return false;
        if (aaMode() !== (t.side === 1 && t.o && !t.k)) return false;
        const d = sub(t.pos, pl.pos), r = vlen(d);
        if (aaMode()) return r < radarRange() * 1.1 && dot(norm(d), pl.o.F) > 0.35;
        return r < 30000 && (t.obj || dot(norm(d), pl.o.F) > 0.2);
      }
      function cycleTarget() {
        const c = candidates(); if (!c.length) { pl.tgt = null; return; }
        const i = c.indexOf(pl.tgt); pl.tgt = c[(i + 1) % c.length]; pl.lockT = 0; S.click();
      }
      // ---------- weapons ----------
      function fireMissile(owner, kind, tgt) {
        const o = owner.o, sp = owner.v || 200;
        const m = { kind, side: owner.side, owner, pos: madd(madd(owner.pos, o.U, -1.5), o.F, 3), dir: o.F.slice(), spd: sp + 30, tgt, life: kind === 'sam' ? 22 : kind === 'arm' ? 34 : 16, age: 0, decoy: null, trail: 0 };
        if (kind === 'sam') { m.dir = norm(add(norm(sub(tgt.pos, owner.pos)), [0, 0.6, 0])); m.spd = 60; m.pos = add(owner.pos, [0, 6, 0]); }
        if (kind === 'bomb') { m.vel = owner.vel.slice(); m.pos = madd(owner.pos, o.U, -2); m.life = 60; }
        mis.push(m); return m;
      }
      const MP = { ir: { max: 850, acc: 280, turn: 1.0, mot: 3 }, rad: { max: 1000, acc: 260, turn: 0.85, mot: 5 }, eir: { max: 740, acc: 230, turn: 0.4, mot: 3 },
        sam: { max: 850, acc: 200, turn: 0.32, mot: 6 }, arm: { max: 900, acc: 220, turn: 0.6, mot: 8 } };
      // bomb impact solution against the target's elevation where it will be when the bombs arrive
      function ccrp(t) {
        if (!t) return bombImpact(T, pl.pos, pl.vel);
        let imp = bombImpact(T, pl.pos, pl.vel, t.pos[1] + 4);
        if (imp && t.vel && (t.vel[0] || t.vel[2])) {
          const tp = madd(t.pos, t.vel, imp.t);
          imp = bombImpact(T, pl.pos, pl.vel, hAt(T, tp[0], tp[2]) + 3) || imp;
        }
        return imp;
      }
      function playerFire(dt) {
        const w = pl.wsel, held = api.key('Space'), press = api.pressed('Space');
        pl.gunCool -= dt; pl.relCool -= dt;
        if (w === 0) {
          if (held && pl.ammo[0] > 0 && pl.gunCool <= 0) {
            pl.gunCool = 0.05; pl.ammo[0] = Math.max(0, pl.ammo[0] - 6);
            const spread = [(Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.006, 0];
            const dir = norm(add(pl.o.F, add(mul(pl.o.R, spread[0]), mul(pl.o.U, spread[1] + 0.004))));
            bul.push({ pos: madd(pl.pos, pl.o.F, 8), vel: add(pl.vel, mul(dir, 1050)), life: 1.6, side: 0, pl: true });
            if ((api.frame & 3) === 0) S.gun();
          }
          return;
        }
        if (w === 1 || w === 2) {
          if (press) {
            if (pl.ammo[w] <= 0) { msg('NO ' + WNAMES[w], AMB, 1.5); return; }
            pl.ammo[w]--; const locked = pl.tgt && pl.lockT > 0.6 && validTgt(pl.tgt);
            fireMissile(pl, w === 1 ? 'ir' : 'rad', locked ? pl.tgt : null); S.launch();
            msg(w === 1 ? 'FOX TWO' : 'FOX THREE', HUDC, 1.5);
            if (!pl.ammo[w]) { msg('WINCHESTER ' + WNAMES[w], AMB, 2); autoNextWeapon(); }
          }
          return;
        }
        if (w === 3) {
          if (pl.ammo[3] <= 0) { if (press) msg('NO BOMBS', AMB, 1.5); return; }
          const imp = ccrp(pl.tgt && pl.tgt.alive && !aaMode() ? pl.tgt : null);
          let rel = false;
          if (pl.tgt && pl.tgt.alive && imp && held) {
            const tv = pl.tgt.vel || [0, 0, 0], d = [pl.tgt.pos[0] + tv[0] * imp.t - imp.p[0], 0, pl.tgt.pos[2] + tv[2] * imp.t - imp.p[2]], hv = norm([pl.vel[0], 0, pl.vel[2]]);
            const along = dot(d, hv), cross_ = Math.abs(d[0] * hv[2] - d[2] * hv[0]);
            if ((Math.hypot(d[0], d[2]) < 45 || (along < 0 && pl.lastAlong > 0 && cross_ < 160))) rel = true;
            pl.lastAlong = along; pl.lastCross = cross_;
          } else if (press && (!pl.tgt || !pl.tgt.alive)) rel = true;
          if (press && pl.tgt && pl.tgt.alive && imp && Math.hypot(pl.tgt.pos[0] - imp.p[0], pl.tgt.pos[2] - imp.p[2]) > 2000) msg('HOLD SPACE - AUTO RELEASE', AMB, 1.5);
          if (rel && pl.relCool <= 0) { pl.ripple = 2; pl.relCool = 1.2; }
          if (pl.ripple > 0 && (api.frame % 8) === 0 && pl.ammo[3] > 0) { pl.ripple--; pl.ammo[3]--; fireMissile(pl, 'bomb', null); S.drop(); msg('PICKLE', HUDC, 1); }
          if (!pl.ammo[3] && !pl.ripple) autoNextWeapon();
          return;
        }
        if (w === 4 && press) {
          if (pl.ammo[4] <= 0) return;
          if (!pl.tgt || !pl.tgt.alive || !pl.tgt.k || !pl.tgt.k.emit) { msg('NO EMITTER', AMB, 1.5); return; }
          pl.ammo[4]--; fireMissile(pl, 'arm', pl.tgt); S.launch(); msg('MAGNUM', HUDC, 1.5);
          if (!pl.ammo[4]) autoNextWeapon();
        }
      }
      function autoNextWeapon() { for (let k = 1; k <= 5; k++) { const w = (pl.wsel + k) % 5; if (w === 0 || pl.ammo[w] > 0) { if (w !== pl.wsel) { pl.wsel = w; pl.tgt = null; } return; } } }
      function cycleWeapon() { for (let k = 1; k <= 5; k++) { const w = (pl.wsel + k) % 5; if (w === 0 || pl.ammo[w] > 0) { pl.wsel = w; pl.tgt = null; pl.lockT = 0; S.click(); return; } } }
      function dispense(who) {
        let used = false;
        if (who.flares > 0) { who.flares--; used = true; }
        if (who.chaff > 0) { who.chaff--; used = true; }
        if (!used) { msg('NO EXPENDABLES', AMB, 1.5); return; }
        S.flare();
        for (let i = 0; i < 2; i++) addFx(fx, madd(who.pos, who.o.F, -10), add(mul(who.vel, 0.3), [(Math.random() - 0.5) * 30, -20, (Math.random() - 0.5) * 30]), 1.6, 3, [255, 250, 200], 0, 1);
        for (const m of mis) {
          if (m.tgt !== who || m.decoy) continue;
          if (dist3(m.pos, who.pos) > 6000) continue;
          if (Math.random() < (m.kind === 'eir' ? 0.65 : 0.65)) { m.decoy = { pos: madd(who.pos, who.o.F, -20), vel: mul(who.vel, 0.3) }; m.tgt = null; }
        }
      }
      function hurtAir(a, dmg, byPl, byWing) {
        if (!a.alive) return;
        a.hp -= dmg;
        if (a.isPl) { (pl.hitLog = pl.hitLog || []).push((pl.lastHit || '?') + ':' + dmg); pl.lastHit = null; S.boom(false); if (a.hp > 0) msg(a.hp < 40 ? 'HEAVY DAMAGE' : 'HIT!', RED, 2); if (a.hp <= 0) playerDown('SHOT DOWN'); return; }
        if (a.hp <= 0) {
          a.alive = false; a.dead = 0; boom(fx, a.pos, true); S.boom(true);
          if (a.side === 1) {
            kills++;
            if (byPl) { myKills++; addScore(500); msg('SPLASH ONE!', AMB, 2.5); }
            else if (byWing) { addScore(100); msg('TWO: SPLASH ONE', CYA, 2.5); }
            else msg('BANDIT DOWN', HUDC, 2);
          } else if (a.wing) msg('TWO IS HIT - EJECTING', RED, 3);
        }
      }
      function hurtGnd(g, dmg, byPl) {
        if (!g.alive || g.k.friendly) return;
        g.hp -= dmg;
        if (g.hp <= 0) {
          g.alive = false; boom(fx, add(g.pos, [0, 8, 0]), true); S.boom(true);
          g.smoke = 25;
          if (byPl) { gKills++; addScore(g.k.pts + (g.obj ? 1000 : 0)); }
          msg((g.obj ? 'TARGET DESTROYED: ' : '') + g.k.name, g.obj ? AMB : HUDC, 2.5);
          if (pl.tgt === g) pl.tgt = null;
        }
      }
      function addScore(n) { score += n; msnScore += n; }
      function blast(p, rad, dmg, byPl) {
        for (const g of gnd) { if (!g.alive) continue; if (hdist(g.pos, p) < g.k.r + rad && Math.abs(g.pos[1] - p[1]) < 60) hurtGnd(g, dmg, byPl); }
      }
      function updMissiles(dt) {
        for (let i = mis.length - 1; i >= 0; i--) {
          const m = mis[i]; m.age += dt; m.life -= dt;
          const prev = m.pos.slice();
          if (m.kind === 'bomb') {
            m.vel[1] -= 9.8 * dt; m.vel = mul(m.vel, 1 - 0.02 * dt); m.pos = madd(m.pos, m.vel, dt); m.dir = norm(m.vel);
            if (m.pos[1] <= hAt(T, m.pos[0], m.pos[2])) {
              boom(fx, m.pos, true); S.boom(true); blast(m.pos, 40, 2, m.owner === pl);
              if (dist3(m.pos, pl.pos) < 120) { pl.lastHit = 'OWNBOMB'; hurtAir(pl, 40); }
              mis.splice(i, 1);
            }
            continue;
          }
          const P = MP[m.kind];
          if (m.age < P.mot) m.spd = Math.min(P.max, m.spd + P.acc * dt); else m.spd = Math.max(250, m.spd - 30 * dt);
          let aim = null;
          if (m.decoy) { m.decoy.pos = madd(m.decoy.pos, m.decoy.vel, dt); m.decoy.vel[1] -= 4 * dt; aim = m.decoy.pos; }
          else if (m.tgt && m.tgt.alive !== false && (m.tgt.alive || m.tgt.isPl)) {
            const r = dist3(m.tgt.pos, m.pos), tgo = r / Math.max(300, m.spd);
            aim = madd(m.tgt.pos, m.tgt.vel || [0, 0, 0], tgo * 0.9);
            // beaming: a target flying perpendicular to the missile can break a radar lock
            if ((m.kind === 'sam' || m.kind === 'rad') && m.tgt.vel && m.tgt.isPl) {
              const asp = Math.abs(dot(norm(m.tgt.vel), norm(sub(m.tgt.pos, m.pos))));
              if (asp < 0.25 && Math.random() < 0.25 * dt) { m.tgt = null; if (m.side === 1) msg('MISSILE DEFEATED', HUDC, 1.5); }
            }
          }
          if (aim) {
            const want = norm(sub(aim, m.pos));
            if (dot(want, m.dir) < 0.2 && m.age > 1) { m.tgt = null; m.decoy = null; }
            else m.dir = rotToward(m.dir, want, P.turn * (m.age < 0.4 ? 0.2 : 1) * dt);
          }
          m.pos = madd(m.pos, m.dir, m.spd * dt);
          m.trail -= dt;
          if (m.trail <= 0) { m.trail = 0.05; addFx(fx, m.pos, [0, 2, 0], 1.6, 1.5, [235, 235, 230], 3, 0); }
          // proximity fuse
          let hit = false;
          if (m.age > 0.5 && m.tgt && !m.decoy && (m.tgt.alive || m.tgt.isPl)) {
            const t = m.tgt, seg = sub(m.pos, prev), sl = vlen(seg) || 1, sd = mul(seg, 1 / sl);
            const rel = sub(t.pos, prev), along = clamp(dot(rel, sd), 0, sl), cl = vlen(sub(rel, mul(sd, along)));
            if (cl < (m.kind === 'arm' ? 30 : 22)) {
              hit = true; boom(fx, m.pos, false); S.boom(false);
              if (m.kind === 'arm') hurtGnd(t, 3, m.owner === pl);
              else if (t.isPl) { pl.lastHit = m.kind; hurtAir(t, m.kind === 'sam' ? 60 : 45); }
              else hurtAir(t, 100, m.owner === pl, m.owner === wing);
            }
          }
          if (!hit && m.pos[1] < hAt(T, m.pos[0], m.pos[2])) {
            hit = true; boom(fx, m.pos, false);
            if (m.kind === 'arm') blast(m.pos, 20, 3, m.owner === pl);
          }
          if (hit || m.life <= 0) { if (!hit) addFx(fx, m.pos, [0, 0, 0], 0.5, 4, [255, 200, 100], 6, 1); mis.splice(i, 1); }
        }
      }
      function updBullets(dt) {
        for (let i = bul.length - 1; i >= 0; i--) {
          const b = bul[i]; b.life -= dt;
          const prev = b.pos; b.vel[1] -= 9.8 * dt; b.pos = madd(b.pos, b.vel, dt);
          let gone = b.life <= 0;
          if (!gone) {
            const targets = b.side === 0 ? air.filter(a => a.alive && a.side === 1) : [pl, wing].filter(a => a && a.alive);
            const seg = sub(b.pos, prev), sl = vlen(seg) || 1, sd = mul(seg, 1 / sl);
            for (const a of targets) {
              const rel = sub(a.pos, prev); if (Math.abs(rel[0]) > 120 || Math.abs(rel[2]) > 120) continue;
              const along = clamp(dot(rel, sd), 0, sl), cl = vlen(sub(rel, mul(sd, along)));
              if (cl < (b.side === 0 ? 14 : b.aaa ? 8 : 9)) {
                gone = true; addFx(fx, a.pos, [0, 0, 0], 0.3, 2, [255, 230, 120], 3, 1);
                if (a.isPl) pl.lastHit = b.aaa ? 'AAA' : 'GUN';
                hurtAir(a, b.side === 0 ? 16 : b.aaa ? 3 : 2 + Math.min(3, tour), b.pl, false);
                break;
              }
            }
          }
          if (!gone && b.pos[1] < hAt(T, b.pos[0], b.pos[2])) {
            gone = true;
            if (dist3(b.pos, pl.pos) < 3000) addFx(fx, b.pos, [0, 6, 0], 0.6, 2.5, [120, 105, 80], 3, 0);
            if (b.side === 0) for (const g of gnd) if (g.alive && hdist(g.pos, b.pos) < g.k.r + 8) { hurtGnd(g, 0.12, b.pl); break; }
          }
          if (gone) { bul[i] = bul[bul.length - 1]; bul.pop(); }
        }
      }
      // ---------- AI aircraft ----------
      function pickTarget(a) {
        if (a.side === 1) {
          const opts = [pl, wing].filter(t => t && t.alive);
          if (!opts.length) return null;
          opts.sort((x, y) => dist3(x.pos, a.pos) * (x.isPl ? 0.7 : 1) - dist3(y.pos, a.pos) * (y.isPl ? 0.7 : 1));
          return opts[0];
        }
        if (a.cmd === 1 && pl.tgt && pl.tgt.alive) return pl.tgt;
        let best = null, bd = 9000;
        for (const e of air) if (e.alive && e.side === 1) { const d = dist3(e.pos, a.pos); if (d < bd) { bd = d; best = e; } }
        return best;
      }
      function updAI(a, dt) {
        if (!a.alive) {
          a.dead += dt; a.vel[1] -= 9.8 * dt; a.pos = madd(a.pos, a.vel, dt); rotRoll(a.o, dt * 2.5);
          if ((api.frame & 3) === 0) addFx(fx, a.pos, [0, 5, 0], 2.5, 6, [50, 48, 46], 5, 0);
          if (a.pos[1] < hAt(T, a.pos[0], a.pos[2]) || a.dead > 25) { boom(fx, a.pos, true); a.gone = true; }
          return;
        }
        a.retgt -= dt; a.mslCool -= dt; a.gunCool -= dt;
        if (a.retgt <= 0 || (a.tgt && !a.tgt.alive)) { a.tgt = pickTarget(a); a.retgt = 3 + Math.random() * 2; }
        let des = null, vt = a.vt;
        // missile threat -> break turn and flares
        const thr = mis.find(m => m.tgt === a && !m.decoy && dist3(m.pos, a.pos) < 3500 && (m.seen = m.seen || (Math.random() < 0.3 ? 1 : 2)) === 1);
        if (thr) {
          const los_ = norm(sub(a.pos, thr.pos)); des = norm(add(cross(los_, UPV), [0, -0.15, 0]));
          if (dot(des, a.o.F) < 0) des = mul(des, -1);
          if (a.flares > 0 && Math.random() < 0.02) { a.flares--; if (Math.random() < 0.3) thr.decoy = { pos: a.pos.slice(), vel: mul(a.vel, 0.3) }; addFx(fx, a.pos, [0, -20, 0], 1.2, 3, [255, 250, 200], 0, 1); }
          vt = a.vt + 60;
        } else if (a.wing && a.cmd === 2) des = null;
        else if (a.tgt && a.tgt.alive) {
          const t = a.tgt, d = sub(t.pos, a.pos), r = vlen(d);
          if (t.k) { // ground target (wingman strike)
            const hp = [t.pos[0], t.pos[1] + 1500, t.pos[2]]; des = sub(hp, a.pos);
            if (hdist(t.pos, a.pos) < 1300 && a.bombs > 0 && a.gunCool <= 0) {
              a.bombs--; a.gunCool = 2; const m = fireMissile(a, 'arm', t); m.dir = norm(sub(t.pos, a.pos)); m.spd = 300; msg('TWO: BOMBS AWAY', CYA, 2);
            }
            if (a.bombs <= 0 && a.gunCool <= 0) a.cmd = 2;
          } else {
            const tof = r / 1000, lead = madd(t.pos, t.vel || [0, 0, 0], tof);
            des = sub(lead, a.pos);
            const ang = Math.acos(clamp(dot(norm(des), a.o.F), -1, 1));
            const shootOk = a.side === 0 || Math.random() < (a.aggro || 0.6);
            const tailG = a.side === 0 || !t.o || dot(t.o.F, norm(d)) > 0.1;
            if (r < 750 && ang < 0.07 && a.gunCool <= 0 && shootOk && tailG) {
              a.burst = (a.burst || 0) + 1; a.gunCool = a.burst % 12 === 0 && a.side === 1 ? 2.2 : 0.09;
              const sp = a.side === 1 ? 0.05 : 0.012, dir = norm(add(a.o.F, [(Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp]));
              bul.push({ pos: madd(a.pos, a.o.F, 8), vel: add(a.vel, mul(dir, 1000)), life: 1.4, side: a.side, pl: false });
            }
            const tail = !t.o || dot(t.o.F, norm(d)) > -0.2;
            if (a.msl > 0 && r < 4800 && r > 900 && ang < 0.3 && tail && a.mslCool <= 0 && shootOk) {
              a.msl--; a.mslCool = 10 + Math.random() * 6;
              fireMissile(a, a.side === 1 ? 'eir' : 'ir', t);
              if (t.isPl) { launchWarn = 3; msg('MISSILE LAUNCH!', RED, 2); }
              else if (a.wing) msg('TWO: FOX TWO', CYA, 2);
            }
            if (r < 600 && dot(a.o.F, t.o ? t.o.F : a.o.F) < 0) des = add(des, mul(a.o.U, 600));
          }
        }
        if (!des) {
          if (a.wing) {
            const slot = add(add(pl.pos, mul(pl.o.F, -90)), mul(pl.o.R, -110));
            const err = sub(slot, a.pos); des = add(err, mul(pl.o.F, 700));
            vt = pl.v + clamp(dot(err, pl.o.F) * 0.15, -60, 80);
            if (vlen(err) > 3000) vt = pl.v + 120;
          } else {
            a.orbit += dt * 0.08;
            const p = [a.home[0] + Math.cos(a.orbit) * 3000, a.home[1], a.home[2] + Math.sin(a.orbit) * 3000];
            des = sub(p, a.pos);
            if (dist3(pl.pos, a.pos) < 14000 + tour * 3000) a.tgt = pickTarget(a);
          }
        }
        // terrain avoidance
        const ahead = madd(a.pos, a.o.F, 900), gh = Math.max(hAt(T, a.pos[0], a.pos[2]), hAt(T, ahead[0], ahead[2]));
        des = norm(des);
        if (a.pos[1] - gh < 500) des = norm([des[0], Math.max(des[1], 0.5), des[2]]);
        else if (a.pos[1] - gh < 900 && des[1] < 0) des[1] *= 0.2;
        steerFrame(a.o, des, a.turn * dt, 4);
        a.v += clamp(vt - a.v, -25 * dt, 25 * dt);
        a.vel = mul(a.o.F, a.v); a.pos = madd(a.pos, a.vel, dt);
        if (a.pos[1] < hAt(T, a.pos[0], a.pos[2]) + 5) { a.hp = 0; a.alive = false; boom(fx, a.pos, true); a.gone = true; }
      }
      // ---------- ground threats ----------
      function updGround(dt) {
        let samTrack = false;
        for (const g of gnd) {
          if (g.path && g.alive) {
            placeConvoy(g, dt);
            if (g.path.t >= 1) { g.path = null; g.escaped = true; g.alive = false; g.gone = true; msg('A TRUCK ESCAPED', AMB, 2); }
          }
          if (!g.alive) { if (g.smoke > 0) { g.smoke -= dt; if ((api.frame & 7) === 0 && dist3(g.pos, pl.pos) < VIEW) addFx(fx, add(g.pos, [0, 6, 0]), [3, 12, 0], 4, 6, [45, 43, 40], 6, 0); } continue; }
          if (g.kind === 'radar') g.rot += dt * 1.2;
          if (!pl.alive) continue;
          const d = dist3(g.pos, pl.pos);
          if (g.kind === 'sam') {
            const tgt = (wing && wing.alive && dist3(wing.pos, g.pos) < d * 0.6) ? wing : pl;
            const dd = dist3(g.pos, tgt.pos);
            if (dd < 8000 && tgt.pos[1] - g.pos[1] > 80 && los(T, add(g.pos, [0, 10, 0]), tgt.pos)) {
              g.track += dt; if (tgt === pl) samTrack = true;
            } else g.track = Math.max(0, g.track - dt);
            g.cool -= dt;
            if (g.track > 4 - tour * 0.3 && g.cool <= 0) {
              g.cool = 14 - Math.min(5, tour * 1.5); fireMissile(g, 'sam', tgt);
              if (tgt === pl) { launchWarn = 4; msg('SAM LAUNCH!', RED, 2.5); }
            }
          } else if (g.kind === 'aaa') {
            g.cool -= dt;
            const agl = pl.pos[1] - g.pos[1];
            if (d < 2300 && agl < 1900 && g.cool <= 0 && los(T, add(g.pos, [0, 4, 0]), pl.pos)) {
              g.cool = 0.25;
              const tof = d / 900, lead = madd(pl.pos, pl.vel, tof), sp = 0.07;
              const dir = norm(add(norm(sub(lead, g.pos)), [(Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp]));
              bul.push({ pos: add(g.pos, [0, 4, 0]), vel: mul(dir, 900), life: 3.2, side: 1, aaa: true });
            }
          }
        }
        pl.samTrack = samTrack;
      }
      // ---------- player ----------
      function playerDown(why) {
        if (!pl.alive) return;
        pl.alive = false; boom(fx, pl.pos, true); S.boom(true); S.bad();
        deadPos = pl.pos.slice(); deadT = 0; state = 'dead'; result = why;
        carry = { idx: msnIdx, kills, tags: {} };
        for (const o of objs) carry.tags[o.tag] = objCount(o);
        pl.chute = madd(pl.pos, [0, 1, 0], 30);
      }
      function controls(dt) {
        let pitch = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        let roll = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        if (pitch || roll) { if (pl.ap) msg('AUTOPILOT OFF', AMB, 1.5); pl.ap = false; }
        if (api.pressed('KeyA')) { pl.ap = !pl.ap; msg(pl.ap ? 'AUTOPILOT ON' : 'AUTOPILOT OFF', AMB, 1.5); }
        if (pl.ap) { const s = autopilot(); pitch = s.pitch; roll = s.roll; }
        if (api.key('KeyW')) { pl.autoThr = false; pl.thr = Math.min(1.3, pl.thr + 0.5 * dt); }
        if (api.key('KeyS')) { pl.autoThr = false; pl.thr = Math.max(0, pl.thr - 0.5 * dt); }
        pl.brake = api.key('KeyB');
        if (pl.autoThr) {
          let vt = pl.gear ? 76 : (msnDone && stIdx === 2 && hdist(pl.pos, steer[2].p) < 9000 ? 130 : 245);
          const tb = sub(steer[3].p, pl.pos);
          if (vlen(tb) < 2500 && dot(tb, tanker.o.F) > -400) vt = tanker.v + clamp(dot(tb, tanker.o.F) * 0.06, -25, 45);
          pl.thr = clamp(pl.thr + (vt - pl.v) * 0.012, 0, vt > 260 ? 1.3 : 1);
        }
        if (api.pressed('KeyG')) { pl.gear = !pl.gear; msg(pl.gear ? 'GEAR DOWN' : 'GEAR UP', HUDC, 1.5); }
        if (api.anyPressed('KeyX')) cycleWeapon();
        if (api.anyPressed('KeyT', 'KeyZ')) cycleTarget();
        if (api.pressed('KeyR')) { radarRng = (radarRng + 1) % 3; S.click(); }
        if (api.pressed('KeyN')) { stIdx = (stIdx + 1) % steer.length; S.click(); }
        if (api.pressed('KeyV')) { view = (view + 1) % 2; }
        if (api.anyPressed('Enter', 'KeyC', 'KeyF')) dispense(pl);
        if (api.pressed('KeyQ') && wing && wing.alive) { wing.cmd = 1; wing.tgt = pl.tgt || pickTarget(wing); wing.retgt = 20; msg(wing.tgt ? 'TWO: ENGAGING' : 'TWO: NO JOY', CYA, 2); }
        if (api.pressed('KeyE') && wing && wing.alive) { wing.cmd = 2; wing.tgt = null; msg('TWO: REJOINING', CYA, 2); }
        return { pitch, roll };
      }
      function autopilot() {
        const sp = steer[stIdx];
        let tgt = sp.p.slice();
        const ah = madd(pl.pos, pl.o.F, 1500), gh = Math.max(hAt(T, pl.pos[0], pl.pos[2]), hAt(T, ah[0], ah[2]));
        if (stIdx === 2 && msnDone) return approach();
        if (pl.wsel === 3 && pl.tgt && pl.tgt.alive && pl.tgt.k) return bombSteer(gh);
        pl.onFinal = false; pl.apB = false; pl.apSide = 0;
        tgt[1] = Math.max(tgt[1], gh + 700);
        if (stIdx === 3) tgt[1] = steer[3].p[1];
        return steerInputs(pl.o, pl.pos, tgt, 1.0);
      }
      // CCRP steering: the autopilot flies the bomb run so the release cue comes up on target
      function bombSteer(gh) {
        const t = pl.tgt, tv = t.vel || [0, 0, 0], hd = hdist(t.pos, pl.pos);
        const alt = Math.max(t.pos[1] + 2000, gh + 700);
        const brg = Math.atan2(t.pos[0] - pl.pos[0], t.pos[2] - pl.pos[2]), herr = Math.abs(wrapPI(brg - headingOf(pl.vel)));
        let aim = [t.pos[0], alt, t.pos[2]];
        const imp = ccrp(t);
        if (imp && herr < 0.5 && hd < 16000) {
          const hv = norm([pl.vel[0], 0, pl.vel[2]]), e = [t.pos[0] + tv[0] * imp.t - imp.p[0], 0, t.pos[2] + tv[2] * imp.t - imp.p[2]];
          const al = dot(e, hv), lat = sub(e, mul(hv, al));
          aim = [t.pos[0] + lat[0], alt, t.pos[2] + lat[2]];
        }
        if (hd < 2000 || (imp && herr < 0.5 && dot(sub(t.pos, imp.p), pl.vel) < -600)) pl.bombOut = true;
        if (pl.bombOut && hd > pl.v * Math.sqrt(2 * Math.max(200, pl.pos[1] - t.pos[1]) / 9.8) + 9000) pl.bombOut = false;
        if (pl.bombOut) aim = [pl.pos[0] + pl.vel[0] * 12, alt, pl.pos[2] + pl.vel[2] * 12];
        return steerInputs(pl.o, pl.pos, aim, herr > 0.5 ? 1.25 : 0.8, 1.5);
      }
      // ILS-style auto approach: swing wide, line up 6 km out, ride a 3 degree glideslope, flare
      function approach() {
        const p = pl.pos, tdz = RW.z0 + 350, hdg = wrapPI(headingOf(pl.o.F));
        if (!pl.onFinal) {
          if (p[2] < RW.z0 - 2500 && Math.abs(p[0] - RW.x) < 1500 && Math.abs(hdg) < 1.0) pl.onFinal = true;
          else if (p[2] > RW.z0 - 5500 && !pl.apB) {
            if (!pl.apSide) pl.apSide = p[0] < RW.x ? -1 : 1;
            const A = [RW.x + pl.apSide * 3200, RW.y + 900, RW.z0 - 9500];
            if (hdist(p, A) < 1500) pl.apB = true;
            return steerInputs(pl.o, p, A, 0.9);
          } else {
            pl.apB = true;
            return steerInputs(pl.o, p, [RW.x, RW.y + 380, RW.z0 - 6000], 0.9);
          }
        }
        const s_ = tdz - p[2], agl = p[1] - RW.y;
        if (s_ < 5000) pl.gear = true;
        let tgt;
        if (agl < 16) tgt = [RW.x, p[1] - 6, p[2] + 300];
        else { const la = Math.min(900, Math.max(300, s_ * 0.5)), sz = s_ - la; tgt = [RW.x, RW.y + Math.max(0, sz) * 0.0524, p[2] + la]; }
        return steerInputs(pl.o, p, tgt, 0.45, 1.8);
      }
      function updPlayer(dt) {
        const inp = controls(dt);
        if (pl.onGround) {
          pl.v = Math.max(0, pl.v - 14 * dt); pl.vel = mul(pl.o.F, pl.v); pl.pos = madd(pl.pos, pl.vel, dt);
          pl.pos[1] = hAt(T, pl.pos[0], pl.pos[2]) + 1.6;
          if (pl.v < 3) landedDone();
          return;
        }
        flyPlane(pl, inp, dt, FCFG);
        if (pl.hp < 50 && (api.frame & 3) === 0) addFx(fx, pl.pos, [0, 3, 0], 1.5, 3, [70, 68, 66], 3, 0);
        // auto gear near home
        const nearHome = hdist(pl.pos, [RW.x, 0, (RW.z0 + RW.z1) / 2]) < 7000;
        const agl = pl.pos[1] - hAt(T, pl.pos[0], pl.pos[2]);
        if (nearHome && agl < 450 && pl.v < 125 && !pl.gear) { pl.gear = true; msg('GEAR DOWN', HUDC, 1.5); }
        if (pl.gear && pl.v > 150 && agl > 600) { pl.gear = false; msg('GEAR UP', HUDC, 1.5); }
        if (agl <= 1.6) touchdown();
        // refuelling
        if (tanker) {
          const boom_ = add(add(tanker.pos, mul(tanker.o.F, -32)), mul(tanker.o.U, -7)), d = dist3(boom_, pl.pos);
          pl.refuel = d < 160 && Math.abs(pl.v - tanker.v) < 35;
          if (pl.refuel && pl.fuel < 100) {
            pl.fuel = Math.min(100, pl.fuel + 9 * dt);
            if (pl.fuel >= 100) { msg('REFUEL COMPLETE', HUDC, 2.5); if (!refueled) { refueled = true; addScore(300); } }
          }
        }
        if (pl.fuel <= 0 && (api.frame % 120) === 0) msg('FLAMEOUT!', RED, 2);
        // steerpoint auto-advance
        if (stIdx < 2 && hdist(pl.pos, steer[stIdx].p) < 2500) { stIdx++; msg('STEERPOINT ' + (stIdx + 1) + ' ' + steer[stIdx].n, HUDC, 2); }
        // targeting
        if (!validTgt(pl.tgt)) { pl.tgt = null; pl.lockT = 0; }
        if (!pl.tgt) { const c = candidates(); if (c.length) { pl.tgt = c[0]; pl.lockT = 0; } }
        if (pl.tgt) {
          const d = sub(pl.tgt.pos, pl.pos), r = vlen(d), c = dot(norm(d), pl.o.F);
          let ok = false;
          if (pl.wsel === 1) ok = r < 7000 && c > 0.94;
          else if (pl.wsel === 2) ok = r < 22000 && c > 0.5;
          else ok = true;
          pl.lockT = ok ? pl.lockT + dt : 0;
          if (pl.wsel === 1 && ok && (api.frame % 6) === 0) S.growl();
          if (pl.wsel === 2 && pl.lockT > 0.6 && pl.lockT - dt <= 0.6) S.lock();
        }
        playerFire(dt);
      }
      function touchdown() {
        const onRw = Math.abs(pl.pos[0] - RW.x) < 30 && pl.pos[2] > RW.z0 - 20 && pl.pos[2] < RW.z1 - 100;
        const vs = pl.vel[1], roll = Math.abs(rollOf(pl.o)), pit = pitchOf(pl.o.F);
        if (onRw && pl.gear && pl.v < 118 && vs > -11 && roll < 0.35 && pit > -0.15) {
          pl.onGround = true; pl.o = frameYaw(headingOf(pl.o.F)); pl.pos[1] = hAt(T, pl.pos[0], pl.pos[2]) + 1.6; pl.ap = false;
          addScore(msnDone ? 1000 : 0); msg('TOUCHDOWN', HUDC, 2.5); S.click();
          api.audio.noise(0.4, { vol: 0.12, freq: 600 });
        } else playerDown(onRw ? (pl.gear ? 'HARD LANDING' : 'GEAR UP LANDING') : 'CRASHED');
      }
      function landedDone() {
        if (msnDone) { endMission(true); return; }
        // re-arm, refuel and launch again
        const ld = msn.load; pl.ammo = [510, ld[0], ld[1], ld[2], ld[3]]; pl.fuel = 100; pl.hp = 100; pl.flares = 40; pl.chaff = 40;
        pl.onGround = false; pl.gear = false; pl.pos = [RW.x, RW.y + 250, RW.z1 + 300]; pl.v = 170; pl.o = frameYaw(0); pl.vel = mul(pl.o.F, pl.v);
        pl.o.F = norm([0, 0.12, 1]); orthoN(pl.o); pl.thr = 1; stIdx = 0; pl.onFinal = false;
        msg('REARMED AND REFUELED', HUDC, 3); msg('CLEARED FOR TAKEOFF', HUDC, 3);
      }
      function endMission(ok) {
        state = 'debrief'; stT = 0; result = ok ? 'MISSION SUCCESS' : result;
        if (ok) {
          const bonus = 2000 * tour + (pl.hp >= 100 ? 500 : 0) + (wing && wing.alive ? 500 : 0);
          addScore(bonus); S.good(); msnIdx++;
          if (msnIdx % MSN.length === 0) tour++;
        }
        const nr = rankOf(score); promoted = nr > rankIdx; if (promoted) { rankIdx = nr; jets++; }
        if (score > hi) { hi = score; api.setHiScore(hi); }
      }
      function checkObjectives() {
        if (msnDone) return;
        let ok = true;
        if (msn.kills && kills < msn.kills) ok = false;
        for (const o of objs) if (objCount(o) < o.need) ok = false;
        if (msn.convoy) {
          const left = gnd.filter(g => g.kind === 'truck' && g.alive).length, killedT = gnd.filter(g => g.kind === 'truck' && !g.alive && !g.escaped).length;
          if (killedT < 4 && left + killedT < 4) { result = 'CONVOY ESCAPED'; failMission(); return; }
        }
        if (ok) { msnDone = true; stIdx = 2; addScore(500); S.good(); msg('OBJECTIVES COMPLETE - RTB', AMB, 4); msg('LAND AT HOME PLATE', AMB, 4); }
      }
      function failMission() { state = 'debrief'; stT = 0; S.bad(); }
      function spawnInterceptors(dt) {
        spawnT -= dt;
        const alive = air.filter(a => a.alive && a.side === 1).length;
        const hangars = gnd.filter(g => g.kind === 'hangar' && g.alive).length;
        if (spawnT <= 0 && alive < 1 + Math.floor((msnIdx % MSN.length) / 3) + tour && hangars > 0) {
          spawnT = Math.max(45, 90 - (msnIdx % MSN.length) * 4 - tour * 10);
          const b = spawnBandit(EAF.x, (EAF.z0 + EAF.z1) / 2, Math.random() < 0.4);
          b.pos[1] = EAF.y + 1500; b.tgt = pl; msg('BANDITS SCRAMBLING', AMB, 2.5);
        }
      }
      // ---------- update ----------
      function updateFly(dt) {
        stT += dt;
        tankerUpd(dt);
        updPlayer(dt);
        if (state !== 'fly') return;
        for (const a of air) updAI(a, dt);
        air = air.filter(a => !a.gone);
        updGround(dt); updMissiles(dt); updBullets(dt); stepFx(fx, dt);
        spawnInterceptors(dt);
        if (state !== 'fly') return;
        checkObjectives();
        if (launchWarn > 0) { launchWarn -= dt; warnT -= dt; if (warnT <= 0) { warnT = 0.35; S.warn(); } }
        else if (pl.samTrack && (api.frame % 40) === 0) S.rwr();
        engT -= dt; if (engT <= 0) { engT = 0.22; api.audio.noise(0.3, { vol: 0.025 + pl.thr * 0.025, freq: 200 + pl.thr * 300 }); }
      }
      function update(dt) {
        dt = 1 / 60;
        for (const m of msgs) m.d -= dt;
        msgs = msgs.filter(m => m.d > 0);
        if (coinFlash > 0) coinFlash--;
        if (state === 'title') {
          attractT += dt; attractUpd(dt);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { score = 0; jets = 3; msnIdx = dbgStart; tour = 1; rankIdx = 0; state = 'brief'; stT = 0; S.good(); }
            else { coinFlash = 90; api.audio.tone(80, 0.25, { type: 'square', vol: 0.2 }); }
          }
          return;
        }
        if (state === 'brief') { stT += dt; if (stT > 0.5 && api.anyPressed('Enter', 'Space')) startMission(); return; }
        if (state === 'fly') { updateFly(dt); return; }
        if (state === 'dead') {
          deadT += dt; stepFx(fx, dt);
          for (const a of air) updAI(a, dt); air = air.filter(a => !a.gone); updMissiles(dt); updBullets(dt); tankerUpd(dt);
          if (pl.chute) pl.chute = madd(pl.chute, [3, -6, 0], dt);
          if (deadT > 4 || (deadT > 1 && api.anyPressed('Enter', 'Space'))) {
            jets--;
            if (jets <= 0) {
              state = 'wait';
              const over = () => { state = 'over'; stT = 0; if (score > hi) { hi = score; api.setHiScore(hi); } };
              if (api.offerContinue) api.offerContinue(() => { jets = 3; score = Math.floor(score / 2); state = 'brief'; stT = 0; }, over);
              else over();
            } else { state = 'debrief'; stT = 0; }
          }
          return;
        }
        if (state === 'debrief') { stT += dt; if (stT > 1 && api.anyPressed('Enter', 'Space')) { state = 'brief'; stT = 0; } return; }
        if (state === 'over') { stT += dt; if (stT > 6 || (stT > 1.5 && api.anyPressed('Enter', 'Space'))) { state = 'title'; attractT = 0; } return; }
      }
      // ---------- attract mode ----------
      function attractUpd(dt) {
        if (!attract) attract = { pos: [6000, 900, 9000], o: frameYaw(0.6), v: 220, t: 0 };
        const a = attract; a.t += dt;
        const tgt = [16000 + Math.cos(a.t * 0.05) * 9000, 1100 + Math.sin(a.t * 0.2) * 300, 16000 + Math.sin(a.t * 0.05) * 9000];
        const gh = hAt(T, a.pos[0] + a.o.F[0] * 1500, a.pos[2] + a.o.F[2] * 1500);
        tgt[1] = Math.max(tgt[1], gh + 600);
        steerFrame(a.o, sub(tgt, a.pos), 0.2 * dt, 5);
        a.pos = madd(a.pos, a.o.F, a.v * dt);
        stepFx(fx, dt);
      }
      // ---------- rendering ----------
      function drawWorld(ctx, cam, showPl) {
        RD.cam = cam; RD.view = VIEW; RD.fog = TH.fog; RD.mono = 0;
        ctx.save(); ctx.beginPath(); ctx.rect(cam.vp.x, cam.vp.y, cam.vp.w, cam.vp.h); ctx.clip();
        drawSky(ctx, cam, TH);
        drawTerrain(T);
        for (const d of decals) drawModel(d.m, d.pos, d.o, 1, 1);
        for (const g of gnd) {
          if (g.gone) continue;
          const d = dist3(g.pos, cam.pos); if (d > VIEW * 1.1) continue;
          if (d > 900 && !los(T, cam.pos, add(g.pos, [0, 6, 0]))) continue;
          if (!g.alive) { drawModel(M.rubble, g.pos, g.o, g.kind === 'bridge' ? 2 : 1); continue; }
          drawModel(g.k.m, g.pos, g.o, 1, 2);
          if (g.kind === 'radar') drawModel(M.dish, add(g.pos, [0, 9, 0]), frameYaw(g.rot), 1, 2);
        }
        const aircraft = air.slice(); if (tanker) aircraft.push({ m: M.tanker, pos: tanker.pos, o: tanker.o, alive: true });
        if (showPl && pl && pl.alive) aircraft.push({ m: M.f16, pos: pl.pos, o: pl.o, alive: true, isPl: true, gear: pl.gear });
        for (const a of aircraft) {
          const d = dist3(a.pos, cam.pos); if (d > VIEW * 1.4) continue;
          if (d > 2000 && !los(T, cam.pos, a.pos)) continue;
          drawModel(a.m, a.pos, a.o, 1, 2, false, a.alive ? 1 : 0.5);
          const gh = hAt(T, a.pos[0], a.pos[2]);
          if (a.pos[1] - gh < 250) drawModel(SHADOW, [a.pos[0], gh + 0.5, a.pos[2]], frameYaw(headingOf(a.o.F)), 1, 1);
        }
        if (pl && !pl.alive && pl.chute) drawModel(M.chute, pl.chute, frameYaw(0), 1, 2);
        for (const m of mis) {
          const mm = m.kind === 'bomb' ? M.bomb : m.kind === 'sam' ? M.sam : m.kind === 'arm' ? M.harm : M.aam;
          drawModel(mm, m.pos, frameFrom(m.dir), m.kind === 'sam' ? 1.6 : 1, 2);
          if (m.kind !== 'bomb') { const q = toCam(cam, madd(m.pos, m.dir, -2.5)); pushDot(2, q, 1.2, '#ffd890', 1.5); }
        }
        for (const b of bul) {
          const qa = toCam(cam, b.pos), qb = toCam(cam, madd(b.pos, b.vel, -0.025));
          if (qa[2] > 1 || qb[2] > 1) pushLine(2, qa, qb, b.side === 0 ? '#ffe070' : '#ff8040', 1);
        }
        drawFx(fx);
        flush(ctx);
        ctx.restore();
      }
      function cockpitCam() { return mkCam(madd(pl.pos, pl.o.U, 1.2), pl.o, VP, FOC, CYF); }
      function chaseCam(p, o, vp, dist, cyf) {
        const back = madd(madd(p, o.F, -(dist || 38)), UPV, 9);
        const F = norm(sub(madd(p, o.F, 30), back));
        return mkCam(back, frameFrom(F, norm(add(UPV, mul(o.U, 0.6)))), vp, FOC, cyf || 0.5);
      }
      function line(ctx, x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      function boxS(ctx, x, y, w, h) { ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h); }
      function drawHUD(ctx, cam) {
        ctx.save(); ctx.beginPath(); ctx.rect(30, 2, 260, 168); ctx.clip();
        ctx.strokeStyle = HUDC; ctx.fillStyle = HUDC; ctx.lineWidth = 1;
        const o = pl.o, hd = headingOf(o.F), pit = pitchOf(o.F) * R2D;
        let ax = o.U[1], ay = o.R[1]; const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
        // pitch ladder
        for (let p = -85; p <= 85; p += 5) {
          if (Math.abs(p - pit) > 24) continue;
          const cp = Math.cos(p * D2R), dir = [Math.sin(hd) * cp, Math.sin(p * D2R), Math.cos(hd) * cp];
          const s = projDir(cam, dir); if (!s) continue;
          const g0 = p === 0 ? 14 : 12, g1 = p === 0 ? 90 : 34;
          for (const sg of [-1, 1]) {
            if (p >= 0) line(ctx, s[0] + ax * g0 * sg, s[1] + ay * g0 * sg, s[0] + ax * g1 * sg, s[1] + ay * g1 * sg);
            else for (let k = 0; k < 3; k++) { const a0 = g0 + k * 8, a1 = a0 + 5; line(ctx, s[0] + ax * a0 * sg, s[1] + ay * a0 * sg, s[0] + ax * a1 * sg, s[1] + ay * a1 * sg); }
            if (p !== 0) {
              const tx = s[0] + ax * g1 * sg, ty = s[1] + ay * g1 * sg, td = p > 0 ? 4 : -4;
              line(ctx, tx, ty, tx - ay * td, ty + ax * td);
              if (sg > 0) txt(ctx, Math.abs(p), tx + ax * 4 - 4, ty + ay * 4 - 3, HUDC);
            }
          }
        }
        // boresight + flight path marker
        const cx = cam.cx, cy = cam.cy;
        line(ctx, cx - 6, cy, cx - 2, cy); line(ctx, cx + 2, cy, cx + 6, cy); line(ctx, cx, cy - 4, cx, cy - 1);
        const alpha = clamp(1.2 + Math.max(0.3, pl.g) * Math.pow(85 / Math.max(pl.v, 40), 2) * 2.2, 0, 18);
        const fy = cy + Math.tan(alpha * D2R) * FOC * Math.cos(rollOf(o)), fxp = cx - Math.tan(alpha * D2R) * FOC * Math.sin(rollOf(o)) * 0;
        ctx.beginPath(); ctx.arc(fxp, fy, 3, 0, TAU); ctx.stroke();
        line(ctx, fxp - 9, fy, fxp - 3, fy); line(ctx, fxp + 3, fy, fxp + 9, fy); line(ctx, fxp, fy - 3, fxp, fy - 7);
        // heading tape
        const hdg = (hd * R2D + 360) % 360;
        for (let k = -30; k <= 30; k += 5) {
          const v = Math.round(hdg / 5) * 5 + k, x = 160 + (v - hdg) * 2.4;
          if (x < 108 || x > 212) continue;
          line(ctx, x, 14, x, v % 10 === 0 ? 10 : 12);
          if (v % 10 === 0) txt(ctx, pad(((v % 360) + 360) % 360 / 10, 2), x - 5, 3, HUDC);
        }
        line(ctx, 160, 16, 157, 19); line(ctx, 160, 16, 163, 19);
        // speed & altitude tapes
        const kts = pl.v * KT, ft = pl.pos[1] * FT;
        for (let k = -6; k <= 6; k++) {
          const v = Math.round(kts / 20) * 20 + k * 20, y = cy + (kts - v) * 1.1;
          if (y < 40 || y > 130) continue; line(ctx, 66, y, v % 100 === 0 ? 60 : 63, y);
          const a = Math.round(ft / 200) * 200 + k * 200, y2 = cy + (ft - a) * 0.11;
          if (y2 > 40 && y2 < 130) line(ctx, 254, y2, a % 1000 === 0 ? 260 : 257, y2);
        }
        ctx.fillStyle = '#000'; ctx.fillRect(34, cy - 5, 30, 11); ctx.fillRect(256, cy - 5, 32, 11);
        boxS(ctx, 34, cy - 5, 30, 11); boxS(ctx, 256, cy - 5, 32, 11);
        txt(ctx, Math.round(kts), 61, cy - 3, HUDC, 'r'); txt(ctx, Math.round(ft), 286, cy - 3, HUDC, 'r');
        const agl = (pl.pos[1] - hAt(T, pl.pos[0], pl.pos[2])) * FT;
        if (agl < 5000) txt(ctx, 'R ' + Math.round(agl), 286, cy + 10, HUDC, 'r');
        txt(ctx, 'G ' + pl.g.toFixed(1), 36, 34, HUDC); txt(ctx, 'M ' + (pl.v / 300).toFixed(2), 36, 136, HUDC);
        txt(ctx, pl.thr > 1.001 ? 'AB' : Math.round(pl.thr * 100) + '%', 36, 145, pl.thr > 1.001 ? AMB : HUDC);
        if (pl.ap) txt(ctx, 'AP', 36, 154, AMB);
        // weapon / mode
        const w = pl.wsel, mode = w === 0 ? 'GUN' : w <= 2 ? 'A-A' : 'A-G';
        txt(ctx, mode, 270, 34, HUDC, 'r');
        txt(ctx, WNAMES[w] + ' ' + pl.ammo[w], 270, 136, HUDC, 'r');
        // steerpoint
        const sp = steer[stIdx], sd = hdist(pl.pos, sp.p) * NM;
        txt(ctx, (stIdx + 1) + ' ' + sp.n + ' ' + sd.toFixed(1), 286, 154, HUDC, 'r');
        const sps = projW(cam, stIdx === 3 ? tanker.pos : [sp.p[0], hAt(T, sp.p[0], sp.p[2]), sp.p[2]]);
        if (sps) { const x = sps[0], y = sps[1]; line(ctx, x, y - 4, x + 4, y); line(ctx, x + 4, y, x, y + 4); line(ctx, x, y + 4, x - 4, y); line(ctx, x - 4, y, x, y - 4); }
        // target symbology
        const t = pl.tgt;
        if (t) {
          const r = dist3(t.pos, pl.pos), s = projW(cam, t.pos);
          const on = s && s[0] > 34 && s[0] < 286 && s[1] > 6 && s[1] < 168;
          if (on) {
            if (aaMode()) boxS(ctx, s[0] - 5, s[1] - 5, 10, 10);
            else { line(ctx, s[0], s[1] - 6, s[0] + 6, s[1]); line(ctx, s[0] + 6, s[1], s[0], s[1] + 6); line(ctx, s[0], s[1] + 6, s[0] - 6, s[1]); line(ctx, s[0] - 6, s[1], s[0], s[1] - 6); }
            txt(ctx, (r * NM).toFixed(1), s[0], s[1] + 8, HUDC, 'c');
          } else {
            const d = norm(sub(t.pos, pl.pos)), q = [dot(d, o.R), dot(d, o.U)], ql = Math.hypot(q[0], q[1]) || 1;
            line(ctx, cx, cy, cx + q[0] / ql * 40, cy - q[1] / ql * 40);
            txt(ctx, Math.round(Math.acos(clamp(dot(d, o.F), -1, 1)) * R2D), cx + q[0] / ql * 48, cy - q[1] / ql * 48 - 3, HUDC, 'c');
          }
          if (w === 1) {
            let sx = cx, sy = cy; if (pl.lockT > 0.6 && on) { sx = s[0]; sy = s[1]; }
            ctx.beginPath(); ctx.arc(sx, sy, 9, 0, TAU); ctx.stroke();
            if (pl.lockT > 0.6 && r < 6000 && r > 400 && (api.frame & 8)) txt(ctx, 'SHOOT', 160, 128, HUDC, 'c');
          }
          if (w === 2) {
            const x = 246, y0 = 50, y1 = 120, rm = 18000, ry = y1 - clamp(r / rm, 0, 1) * (y1 - y0);
            line(ctx, x, y0, x, y1); line(ctx, x, y0, x - 4, y0); line(ctx, x, y1 - (y1 - y0) * 0.05, x - 4, y1 - (y1 - y0) * 0.05);
            line(ctx, x - 1, ry, x - 6, ry - 3); line(ctx, x - 1, ry, x - 6, ry + 3);
            if (pl.lockT > 0.6) { txt(ctx, 'LOCK', 160, 128, HUDC, 'c'); if (r < rm && r > 900 && (api.frame & 8)) txt(ctx, 'SHOOT', 160, 118, HUDC, 'c'); }
          }
          if (w === 0 && aaMode() && r < 2500) {
            const tof = r / 1050, rel = madd(sub(t.pos, pl.pos), sub(t.vel || [0, 0, 0], pl.vel), tof);
            rel[1] += 0.5 * 9.8 * tof * tof;
            const ls = projDir(cam, norm(rel));
            if (ls) { ctx.beginPath(); ctx.arc(ls[0], ls[1], 7, 0, TAU); ctx.stroke(); ctx.fillRect(ls[0] - 0.5, ls[1] - 0.5, 1.5, 1.5); }
            if (r < 1200 && (api.frame & 8)) txt(ctx, 'IN RNG', 160, 128, HUDC, 'c');
          }
        }
        if (w === 3) {
          const imp = ccrp(t && t.alive && t.k ? t : null);
          if (imp) {
            const s = projW(cam, imp.p);
            if (s) { line(ctx, fxp, fy + 4, s[0], s[1] - 5); ctx.beginPath(); ctx.arc(s[0], s[1], 5, 0, TAU); ctx.stroke(); ctx.fillRect(s[0], s[1], 1, 1); }
            if (t && t.alive) {
              const d = hdist(t.pos, imp.p), tr = d / Math.max(50, pl.v);
              txt(ctx, d < 45 ? 'RELEASE' : 'REL ' + tr.toFixed(0), 160, 128, HUDC, 'c');
            }
          }
        }
        if (w === 4 && t) txt(ctx, t.k && t.k.emit ? 'HARM HANDOFF' : 'NO EMITTER', 160, 128, HUDC, 'c');
        // warnings
        const blink = api.frame & 16;
        if (agl < 500 && pl.vel[1] < -25 && !pl.gear && blink) txt(ctx, 'PULL UP', 160, 100, HUDC, 'c', 2);
        if (pl.v < 70 && !pl.gear && blink) txt(ctx, 'STALL', 160, 112, HUDC, 'c');
        if (pl.fuel < 20 && pl.fuel > 0 && (api.frame & 32)) txt(ctx, 'BINGO', 160, 146, HUDC, 'c');
        if (pl.refuel) txt(ctx, 'REFUELING ' + Math.round(pl.fuel) + '%', 160, 146, HUDC, 'c');
        if (pl.gear) txt(ctx, 'GEAR', 36, 125, HUDC);
        ctx.restore();
      }
      function drawMsgs(ctx, y) {
        let yy = y;
        for (const m of msgs) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; const w = m.t.length * 6 + 4; ctx.fillRect(160 - w / 2, yy - 1, w, 9); txt(ctx, m.t, 160, yy, m.c, 'c'); yy += 10; }
      }
      function mfdFrame(ctx, x, y, w, h, title) {
        ctx.fillStyle = '#05100a'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#5a5e66'; ctx.lineWidth = 1; boxS(ctx, x - 1, y - 1, w + 1, h + 1);
        txt(ctx, title, x + 2, y + 2, HUDD);
      }
      function drawRadar(ctx, x, y, w, h) {
        const aa = aaMode(), rr = aa ? radarRange() : 16000;
        mfdFrame(ctx, x, y, w, h, aa ? 'A-A ' + Math.round(rr * NM) : 'A-G ' + Math.round(rr * NM));
        ctx.strokeStyle = '#163'; ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) line(ctx, x, y + h - k * h / 4, x + w, y + h - k * h / 4);
        line(ctx, x + w / 2, y + 10, x + w / 2, y + h);
        const sweep = Math.sin(api.time * 2.2) * 0.5 + 0.5; ctx.strokeStyle = '#2a6'; line(ctx, x + sweep * w, y + 10, x + sweep * w, y + h);
        const plot = (e, col, big) => {
          const d = sub(e.pos, pl.pos), r = vlen(d); if (r > rr) return null;
          const lx = dot(d, pl.o.R), lz = dot(d, pl.o.F); if (lz < 0) return null;
          const az = Math.atan2(lx, lz); if (Math.abs(az) > 1.05) return null;
          const px = x + w / 2 + az / 1.05 * (w / 2), py = y + h - r / rr * (h - 10);
          ctx.fillStyle = col; ctx.fillRect(px - (big ? 2 : 1), py - (big ? 2 : 1), big ? 4 : 3, big ? 4 : 3);
          return [px, py];
        };
        if (aa) { for (const a of air) if (a.alive) plot(a, a.side === 1 ? '#f84' : '#6cf', a.side === 1); }
        else for (const g of gnd) if (g.alive && !g.k.friendly) plot(g, g.obj ? '#fd4' : '#9c9', g.obj);
        if (pl.tgt) { const p = plot(pl.tgt, '#fff', true); if (p) { ctx.strokeStyle = '#fff'; boxS(ctx, p[0] - 4, p[1] - 4, 8, 8); } }
        txt(ctx, pl.tgt ? (pl.lockT > 0.6 ? 'STT' : 'TRK') : (aa ? 'RWS' : 'GM'), x + w - 2, y + 2, HUDD, 'r');
      }
      function drawMap(ctx, x, y, w, h) {
        mfdFrame(ctx, x, y, w, h, 'HSD');
        const sc = (h - 8) / 24000, ox = x + w / 2, oy = y + h - 10, hd = headingOf(pl.o.F), c = Math.cos(hd), s = Math.sin(hd);
        const P = p => { const dx = p[0] - pl.pos[0], dz = p[2] - pl.pos[2]; return [ox + (dx * c - dz * s) * sc, oy - (dx * s + dz * c) * sc]; };
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.strokeStyle = '#3a8'; ctx.beginPath();
        const pts = steer.slice(0, 3).map(sp => P(sp.p)); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
        pts.forEach((p, i) => { ctx.fillStyle = i === stIdx ? '#fff' : '#3a8'; ctx.fillRect(p[0] - 1, p[1] - 1, 3, 3); });
        for (const g of gnd) if (g.alive && g.kind === 'sam') { const p = P(g.pos); ctx.strokeStyle = '#a33'; ctx.beginPath(); ctx.arc(p[0], p[1], 8000 * sc, 0, TAU); ctx.stroke(); }
        for (const g of gnd) if (g.alive && g.obj) { const p = P(g.pos); ctx.fillStyle = '#fd4'; ctx.fillRect(p[0] - 1, p[1] - 1, 3, 3); }
        const rp = P([RW.x, 0, RW.z0]), rq = P([RW.x, 0, RW.z1]); ctx.strokeStyle = '#ccc'; line(ctx, rp[0], rp[1], rq[0], rq[1]);
        for (const a of air) if (a.alive && a.side === 1 && dist3(a.pos, pl.pos) < 20000) { const p = P(a.pos); ctx.fillStyle = '#f84'; ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2); }
        if (wing && wing.alive) { const p = P(wing.pos); ctx.fillStyle = '#6cf'; ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2); }
        const tp = P(tanker.pos); ctx.fillStyle = '#cff'; ctx.fillRect(tp[0] - 1, tp[1] - 1, 3, 2);
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ox, oy - 4); ctx.lineTo(ox + 3, oy + 3); ctx.lineTo(ox - 3, oy + 3); ctx.closePath(); ctx.fill();
      }
      function drawPanel(ctx) {
        ctx.fillStyle = '#26282d'; ctx.fillRect(0, 172, W, 68);
        ctx.fillStyle = '#34373d'; ctx.fillRect(0, 172, W, 2);
        drawRadar(ctx, 5, 177, 66, 60);
        drawMap(ctx, 249, 177, 66, 60);
        // RWR
        const rx = 160, ry = 206, rr = 28;
        ctx.fillStyle = '#05100a'; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2a5'; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(rx, ry, rr / 2, 0, TAU); ctx.stroke();
        const hd = headingOf(pl.o.F);
        const sym = (p, ch, col, inner) => {
          const b = Math.atan2(p[0] - pl.pos[0], p[2] - pl.pos[2]) - hd, rad = inner ? rr * 0.42 : rr * 0.75;
          txt(ctx, ch, rx + Math.sin(b) * rad, ry - Math.cos(b) * rad - 3, col, 'c');
        };
        for (const g of gnd) if (g.alive && g.k.emit && dist3(g.pos, pl.pos) < 22000) sym(g.pos, g.kind === 'sam' ? (g.track > 0 ? 'S' : 's') : 'R', g.track > 0 ? RED : HUDC, g.track > 0);
        for (const a of air) if (a.alive && a.side === 1 && dist3(a.pos, pl.pos) < 15000) sym(a.pos, a.kind === 'B' ? '2' : '9', a.tgt === pl ? AMB : HUDC, a.tgt === pl);
        for (const m of mis) if (m.tgt === pl && (api.frame & 8)) sym(m.pos, 'M', RED, true);
        ctx.fillStyle = HUDC; ctx.fillRect(rx - 1, ry - 1, 2, 2);
        // stores
        let yy = 178;
        for (let i = 0; i < 5; i++) {
          if (i > 0 && !msn.load[i - 1] && !pl.ammo[i]) continue;
          txt(ctx, (i === pl.wsel ? '>' : ' ') + WSHORT[i] + ' ' + pl.ammo[i], 76, yy, i === pl.wsel ? WHT : GRY); yy += 9;
        }
        txt(ctx, 'FL ' + pl.flares, 76, 230, GRY);
        // fuel / engine
        txt(ctx, 'FUEL', 196, 178, GRY);
        ctx.fillStyle = '#111'; ctx.fillRect(196, 187, 46, 5); ctx.fillStyle = pl.fuel < 20 ? '#f44' : '#4c6'; ctx.fillRect(196, 187, 46 * pl.fuel / 100, 5);
        txt(ctx, 'THR ' + (pl.thr > 1.001 ? 'AB' : Math.round(pl.thr * 100)), 196, 195, GRY);
        txt(ctx, 'HP ' + Math.max(0, Math.round(pl.hp)), 196, 204, pl.hp < 50 ? RED : GRY);
        txt(ctx, 'JETS ' + jets, 196, 213, GRY);
        // lights
        const lit = (x, y, s, on, col) => { ctx.fillStyle = on ? col : '#3a3c40'; ctx.fillRect(x, y, 22, 8); txt(ctx, s, x + 11, y + 1, on ? '#000' : '#555', 'c'); };
        lit(196, 223, 'GR', pl.gear, '#4c6'); lit(220, 223, 'ML', launchWarn > 0 && (api.frame & 8), '#f44');
        txt(ctx, pad(score, 7), 160, 233, AMB, 'c');
      }
      function drawBrief(ctx) {
        ctx.fillStyle = '#0a0f16'; ctx.fillRect(0, 0, W, H);
        const m = MSN[msnIdx % MSN.length];
        txt(ctx, 'MISSION ' + (msnIdx + 1) + (tour > 1 ? '  TOUR ' + tour : ''), 160, 6, AMB, 'c');
        txt(ctx, m.name, 160, 16, WHT, 'c', 2);
        if (!mapPic) mapPic = terrainPic(T, 2);
        const mx = 8, my = 36, ms = 128;
        if (mapPic) ctx.drawImage(mapPic, mx, my, ms, ms); else { ctx.fillStyle = '#365'; ctx.fillRect(mx, my, ms, ms); }
        const P = (x, z) => [mx + x / SIZE * ms, my + ms - z / SIZE * ms];
        ctx.strokeStyle = '#ddd'; const a = P(RW.x, RW.z0), b = P(RW.x, RW.z1); line(ctx, a[0], a[1], b[0], b[1]);
        txt(ctx, 'BASE', a[0] + 3, a[1] - 4, WHT);
        for (const s of m.sams) { const p = P(SAMS[s][0], SAMS[s][1]); ctx.strokeStyle = '#d44'; ctx.beginPath(); ctx.arc(p[0], p[1], 8000 / SIZE * ms, 0, TAU); ctx.stroke(); }
        const ip = P(m.ip[0], m.ip[1]); ctx.fillStyle = '#6f9'; ctx.fillRect(ip[0] - 2, ip[1] - 2, 4, 4); txt(ctx, 'IP', ip[0] + 3, ip[1] - 3, HUDC);
        const tpos = { bridgeW: [9000, riverZ(9000)], hangar: [EAF.x + 300, EAF.z0 + 1100], sam1: SAMS[1], sam2: SAMS[2], sam6: SAMS[6], radar: [15600, 26800], truck: [17000, 23000], bunker: [27500, 29500], factory: [20000, 29000] };
        const tl = m.tp ? [m.tp] : (m.obj || []).map(o => tpos[o[0]]);
        for (const t of tl) { const p = P(t[0], t[1]); ctx.strokeStyle = (api.frame & 16) ? '#fd4' : '#a80'; boxS(ctx, p[0] - 4, p[1] - 4, 8, 8); }
        ctx.strokeStyle = '#6f9'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(ip[0], ip[1]); if (tl[0]) { const p = P(tl[0][0], tl[0][1]); ctx.lineTo(p[0], p[1]); } ctx.stroke();
        ctx.strokeStyle = '#5a5e66'; boxS(ctx, mx - 1, my - 1, ms + 1, ms + 1);
        let y = 40;
        for (const l of m.text) { txt(ctx, l, 144, y, WHT); y += 10; }
        y += 6;
        txt(ctx, 'LOADOUT:', 144, y, AMB); y += 10;
        txt(ctx, 'GUN 510  AIM-9 X' + m.load[0], 144, y, GRY); y += 9;
        txt(ctx, 'AIM-120 X' + m.load[1] + (m.load[2] ? '  MK-82 X' + m.load[2] : ''), 144, y, GRY); y += 9;
        if (m.load[3]) { txt(ctx, 'AGM-88 X' + m.load[3], 144, y, GRY); y += 9; }
        y += 6;
        txt(ctx, 'PILOT: ' + RANKS[rankOf(score)][1], 144, y, CYA); y += 10;
        txt(ctx, 'SCORE ' + score + '  JETS ' + jets, 144, y, CYA);
        txt(ctx, 'WINGMAN: Q ATTACK  E REJOIN', 8, 172, GRY);
        txt(ctx, 'TANKER ORBITS SOUTH OF THE RIVER', 8, 182, GRY);
        txt(ctx, 'LAND ON THE HOME RUNWAY WITH GEAR DOWN', 8, 192, GRY);
        txt(ctx, 'AUTOPILOT (A) FLIES STEERPOINTS + ILS', 8, 202, GRY);
        if (api.frame & 32) txt(ctx, 'PRESS START TO FLY', 160, 222, AMB, 'c');
      }
      function drawDebrief(ctx) {
        ctx.fillStyle = '#0a0f16'; ctx.fillRect(0, 0, W, H);
        const ok = result === 'MISSION SUCCESS';
        txt(ctx, 'DEBRIEFING', 160, 12, AMB, 'c', 2);
        txt(ctx, result, 160, 40, ok ? HUDC : RED, 'c', 2);
        let y = 70;
        const row = (a, b) => { txt(ctx, a, 60, y, GRY); txt(ctx, String(b), 260, y, WHT, 'r'); y += 12; };
        row('AIR KILLS (YOU)', myKills); row('AIR KILLS (FLIGHT)', kills); row('GROUND KILLS', gKills);
        row('WINGMAN', wing && wing.alive ? 'RTB' : 'LOST'); row('MISSION POINTS', msnScore); row('TOTAL SCORE', score);
        y += 6;
        txt(ctx, 'RANK: ' + RANKS[rankOf(score)][1], 160, y, CYA, 'c'); y += 12;
        if (promoted && ok && (api.frame & 16)) txt(ctx, 'PROMOTED! BONUS JET AWARDED', 160, y, AMB, 'c');
        y += 12;
        txt(ctx, 'JETS REMAINING ' + jets, 160, y, WHT, 'c');
        if (stT > 1 && (api.frame & 32)) txt(ctx, 'PRESS START', 160, 220, AMB, 'c');
      }
      function drawTitle(ctx) {
        if (!attract) attractUpd(0);
        const a = attract;
        const cam = chaseCam(a.pos, a.o, { x: 0, y: 0, w: W, h: H }, 30 + Math.sin(a.t * 0.3) * 10, 0.36);
        RD.cam = cam;
        drawWorld(ctx, cam, false);
        RD.cam = cam; RD.view = VIEW; drawModel(M.f16, a.pos, a.o, 1, 2); flush(ctx);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 10, W, 54);
        txt(ctx, 'FALCON 3.0', 160, 16, '#000', 'c', 4); txt(ctx, 'FALCON 3.0', 158, 14, '#ffcc33', 'c', 4);
        txt(ctx, 'F-16 COMBAT FLIGHT', 160, 48, HUDC, 'c');
        const page = Math.floor(attractT / 6) % 3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(40, 120, 240, 76);
        if (page === 0) {
          txt(ctx, 'FLY 8 MISSIONS OVER THE RIVER', 160, 126, WHT, 'c');
          txt(ctx, 'VALLEY. SPLASH BANDITS, BUST', 160, 136, WHT, 'c');
          txt(ctx, 'BRIDGES, KILL SAMS AND BRING', 160, 146, WHT, 'c');
          txt(ctx, 'YOUR JET HOME TO EARN RANK.', 160, 156, WHT, 'c');
          txt(ctx, 'HIGH SCORE ' + hi, 160, 176, AMB, 'c');
        } else if (page === 1) {
          txt(ctx, 'PILOT RANKS', 160, 124, AMB, 'c');
          RANKS.forEach((r, i) => { txt(ctx, r[1], 70, 134 + i * 8, WHT); txt(ctx, String(r[0]), 250, 134 + i * 8, GRY, 'r'); });
        } else {
          txt(ctx, 'DOWN PULL UP  ARROWS ROLL', 160, 126, WHT, 'c');
          txt(ctx, 'SPACE FIRE  X WEAPON', 160, 136, WHT, 'c');
          txt(ctx, 'ENTER FLARES  W/S THROTTLE', 160, 146, WHT, 'c');
          txt(ctx, 'A AUTOPILOT  G GEAR  V VIEW', 160, 156, WHT, 'c');
          txt(ctx, 'T TARGET  N STEERPOINT', 160, 166, WHT, 'c');
          txt(ctx, 'Q/E WINGMAN  R RADAR RANGE', 160, 176, WHT, 'c');
        }
        const blink = api.frame & 32;
        if (coinFlash > 0) { if (coinFlash & 8) txt(ctx, 'INSERT COIN', 160, 204, WHT, 'c'); }
        else if (blink) txt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 160, 204, WHT, 'c');
        txt(ctx, '\u00a9 1991 SPECTRUM HOLOBYTE', 160, 218, GRY, 'c');
        txt(ctx, credStr(), 4, 230, GRY);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); return; }
        if (state === 'brief') { drawBrief(ctx); return; }
        if (state === 'debrief') { drawDebrief(ctx); return; }
        if (state === 'over' || state === 'wait') {
          ctx.fillStyle = '#0a0f16'; ctx.fillRect(0, 0, W, H);
          txt(ctx, 'GAME OVER', 160, 80, RED, 'c', 3);
          txt(ctx, 'FINAL RANK: ' + RANKS[rankOf(score)][1], 160, 120, CYA, 'c');
          txt(ctx, 'SCORE ' + score, 160, 134, WHT, 'c'); txt(ctx, 'HIGH SCORE ' + hi, 160, 148, AMB, 'c');
          return;
        }
        if (state === 'dead') {
          const t = deadT, c = pl.chute || deadPos;
          const cpos = add(c, [Math.cos(t * 0.4) * 80, 30, Math.sin(t * 0.4) * 80]);
          const cam = mkCam(cpos, frameFrom(sub(c, cpos)), { x: 0, y: 0, w: W, h: H }, FOC, 0.5);
          drawWorld(ctx, cam, false);
          txt(ctx, result, 160, 40, RED, 'c', 2);
          txt(ctx, 'EJECT! EJECT!', 160, 64, WHT, 'c');
          return;
        }
        // flying
        if (view === 0) {
          const cam = cockpitCam();
          drawWorld(ctx, cam, false);
          drawHUD(ctx, cam);
          ctx.strokeStyle = '#2b2d33'; ctx.lineWidth = 3; line(ctx, 30, 172, 50, 0); line(ctx, 290, 172, 270, 0); ctx.lineWidth = 1;
        } else {
          const cam = chaseCam(pl.pos, pl.o, VP, 40);
          drawWorld(ctx, cam, true);
          txt(ctx, Math.round(pl.v * KT) + ' KTS  ' + Math.round(pl.pos[1] * FT) + ' FT', 160, 4, HUDC, 'c');
        }
        drawMsgs(ctx, 22);
        drawPanel(ctx);
      }
      return {
        update, render, destroy() { },
        _setMsn: n => { dbgStart = n; },
        _dbg: () => ({ msgs, state, pl, air, gnd, mis, steer, stIdx, msnDone, msnIdx, kills, score, jets, wing, tanker, RW, T, hAt, steerInputs, bombImpact, result, objs, tour })
      };
    }
  });
})();
