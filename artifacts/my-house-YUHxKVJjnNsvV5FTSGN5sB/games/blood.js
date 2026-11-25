// Blood (Monolith, 1997) -- an original horror-comedy take for the Game Room.
// Build-style renderer of our own: per-column portal casting through a sector grid with variable floor and
// ceiling heights, y-shearing look up/down, textured floors/ceilings, parallax night sky, raising doors,
// distance shading, depth-tested billboard sprites. Hero, monsters, weapons and levels are original designs.
(function () {
  'use strict';
  const W = 320, H = 200, VH = 168, PROJ = 160, FOG = 2.4;
  const PI = Math.PI, TAU = PI * 2;
  function RNG(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---------------- palette ----------------
  const RAMP = [
    [168, 164, 158], [146, 96, 58], [186, 40, 40], [84, 116, 64], [226, 208, 172], [70, 82, 146], [140, 74, 160], [242, 192, 82],
    [255, 140, 40], [214, 176, 152], [104, 108, 122], [126, 156, 112], [255, 214, 110], [170, 232, 255], [62, 60, 116], [236, 236, 236]];
  const CMAP = new Uint32Array(64 * 256);
  (function () {
    for (let r = 0; r < 16; r++) for (let s = 0; s < 16; s++) {
      const k = Math.pow((s + 1) / 16, 1.25), b = RAMP[r], fb = r === 8 || r === 12 || r === 13;
      for (let l = 0; l < 64; l++) {
        const m = fb ? 1.1 : l / 30;
        let R = b[0] * k * m, G = b[1] * k * m, B = b[2] * k * m;
        if (!fb && l < 30) { const q = l / 30; B += (1 - q) * 10 * k; }
        const ov = Math.max(R, G, B); if (ov > 255) { const e = (ov - 255) * 0.3; R += e; G += e; B += e; }
        CMAP[(l << 8) | (r << 4) | s] = (0xff000000 | (clamp(B | 0, 0, 255) << 16) | (clamp(G | 0, 0, 255) << 8) | clamp(R | 0, 0, 255)) >>> 0;
      }
    }
  })();
  const COL = (r, s, l) => CMAP[((l == null ? 30 : l) << 8) | (r << 4) | s];
  const RGB = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  const pk = (r, s) => (r << 4) | (s < 0 ? 0 : s > 15 ? 15 : s | 0);

  // ---------------- textures ----------------
  function valueNoise(rng, n) {
    const g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = rng();
    const o = new Float32Array(4096), sc = n / 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const fx = x * sc, fy = y * sc, ix = fx | 0, iy = fy | 0; let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const x1 = (ix + 1) % n, y1 = (iy + 1) % n, a = g[iy * n + ix], b = g[iy * n + x1], c = g[y1 * n + ix], d = g[y1 * n + x1];
      o[y * 64 + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
    return o;
  }
  function fbm(seed) { const r = RNG(seed), a = valueNoise(r, 4), b = valueNoise(r, 8), c = valueNoise(r, 16), d = valueNoise(r, 32), o = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) o[i] = clamp((a[i] * .4 + b[i] * .3 + c[i] * .2 + d[i] * .1 - 0.5) * 1.8 + 0.5, 0, 1); return o; }
  function mk(f) { const t = new Uint8Array(4096); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) t[(y << 6) | x] = f(x, y, (y << 6) | x); return t; }
  const TEX = [], T = {};
  function def(n, t) { T[n] = TEX.length; TEX.push(t); }
  const N1 = fbm(5), N2 = fbm(17), N3 = fbm(29), N4 = fbm(43), N5 = fbm(61);
  (function () {
    def('STONEW', mk((x, y, i) => { const row = y >> 4, bx = (x + (row & 1) * 12) % 24, by = y & 15, v = N1[i]; if (bx < 1 || by < 1) return pk(0, 1 + v * 2); return pk(0, 4 + v * 6 + (by === 1 ? 2 : 0) - (by === 15 ? 1 : 0)); }));
    def('MOSSW', mk((x, y, i) => { const row = y >> 4, bx = (x + (row & 1) * 12) % 24, by = y & 15, v = N2[i]; if (bx < 1 || by < 1) return pk(10, 1 + v * 2); if (N3[i] > 0.55 + y / 300) return pk(3, 2 + v * 8); return pk(10, 4 + v * 6); }));
    def('WALLPAPER', mk((x, y, i) => { if (y > 46) { if (y === 47) return pk(1, 10); return pk(1, 3 + N2[i] * 4 + ((x & 15) === 0 ? -2 : 0)); }
      const dx = Math.abs(((x + 8) & 15) - 8), dy = Math.abs(((y + (((x >> 4) & 1) * 8)) & 15) - 8); const dm = dx + dy * 0.7;
      if (dm < 4 && dm > 2.2) return pk(6, 6 + N1[i] * 2); if (dm <= 1.2) return pk(7, 5); return pk(6, 2 + N1[i] * 2); }));
    def('PANEL', mk((x, y, i) => { const px = x & 31, py = y & 31, v = N4[i]; let s = 4 + v * 3 + Math.sin((y + v * 20) * 0.5) * 0.8;
      if (px < 2 || py < 2) s = 2; else if (px > 29 || py > 29) s = 7; else if (px < 5 || py < 5 || px > 26 || py > 26) s += 2; return pk(1, s); }));
    def('CARPET', mk((x, y, i) => { const v = N2[i], bx = x & 31, by = y & 31; const b = bx < 3 || by < 3; if (b) return pk(7, 5 + v * 3); const d = Math.abs(bx - 16) + Math.abs(by - 16);
      if (d < 7 && d > 4) return pk(7, 4 + v * 2); return pk(2, 3 + v * 3); }));
    def('WOODF', mk((x, y, i) => { const py = y & 15, v = N3[i]; if (py === 0) return pk(1, 1); const off = ((y >> 4) * 23) & 63; if (((x + off) & 63) === 0) return pk(1, 2);
      return pk(1, 5 + v * 4 + Math.sin(x * 0.3 + v * 5) * 0.8); }));
    def('PLASTER', mk((x, y, i) => pk(4, 4 + N5[i] * 4 - (N3[i] > 0.75 ? 2 : 0))));
    def('PLANK', mk((x, y, i) => { const px = x & 15, v = N4[i]; if (px === 0) return pk(1, 1); return pk(1, 3 + v * 4); }));
    def('GRASS', mk((x, y, i) => { const v = N1[i], w = N4[(i * 7) & 4095]; if (w > 0.7) return pk(1, 3 + v * 3); return pk(3, 2 + v * 5 + (((x * 7 + y * 13) % 5) === 0 ? 2 : 0)); }));
    def('DIRT', mk((x, y, i) => pk(1, 2 + N2[i] * 5 + (((x * 5 + y * 3) % 7) === 0 ? 1 : 0))));
    def('FLAGB', mk((x, y, i) => { const bx = (x + ((y >> 5) & 1) * 16) & 31, by = y & 31; if (bx === 0 || by === 0) return pk(10, 1); return pk(10, 4 + N3[i] * 5); }));
    def('TRAINWIN', mk((x, y, i) => { const px = x & 31; if (y < 14 || y > 46 || px < 4 || px > 27) return pk(1, 4 + N2[i] * 3 + (y === 13 || y === 47 ? 3 : 0));
      if (px === 4 || px === 27 || y === 14 || y === 46) return pk(10, 3); if (y < 26 && N5[(x * 3 + y * 64) & 4095] > 0.82) return pk(15, 12); return pk(14, 2 + (46 - y) / 8); }));
    def('TRAINWOOD', mk((x, y, i) => { const py = y & 7, v = N1[i]; if (py === 0) return pk(1, 2); return pk(1, 6 + v * 3); }));
    def('TRAINCEIL', mk((x, y, i) => { const px = x & 15; if (px < 2) return pk(7, 7); return pk(10, 5 + N3[i] * 3); }));
    def('TENT', mk((x, y, i) => { const st = ((x >> 3) & 1); return st ? pk(2, 6 + N2[i] * 4) : pk(4, 9 + N2[i] * 3); }));
    def('STRIPE', mk((x, y, i) => { const st = (((x + y) >> 3) & 1); return st ? pk(6, 6 + N1[i] * 3) : pk(7, 9 + N1[i] * 3); }));
    def('MIRROR', mk((x, y, i) => { const px = x & 31; if (px < 2 || y < 2 || y > 61) return pk(7, 8); const sh = ((x - y * 0.5 + 64) & 31) < 4; return pk(13, sh ? 9 : 3 + N4[i] * 2); }));
    def('CHECKER', mk((x, y) => ((x >> 4) + (y >> 4)) & 1 ? pk(15, 12) : pk(10, 1)));
    def('CRYPT', mk((x, y, i) => { const bx = x & 31, by = y & 31, v = N5[i]; if (bx > 6 && bx < 26 && by > 6 && by < 26) { const d = Math.hypot(bx - 16, by - 18); if (d < 8) return pk(10, 1 + d * 0.2); }
      if (bx < 1 || by < 1) return pk(4, 1); return pk(4, 4 + v * 5); }));
    const door = (er) => mk((x, y, i) => { const v = N2[i]; if (x === 31 || x === 32) return pk(1, 1); let s = 4 + v * 3 + Math.sin(y * 0.4 + v * 6) * 0.6;
      if (y < 3 || y > 60 || x < 3 || x > 60) s = 2; if ((x === 26 || x === 37) && y > 28 && y < 36) return pk(7, 12);
      if (er === 1) { const dx = x - 32, dy = y - 16; if (dx * dx + dy * dy < 40) return pk(4, 12 - (dx * dx + dy * dy < 9 ? 10 : 0)); }
      if (er === 2) { const d1 = Math.hypot(x - 32, y - 16), d2 = Math.hypot(x - 35, y - 14); if (d1 < 7 && d2 > 6) return pk(7, 13); }
      return pk(1, s); });
    def('DOOR', door(0)); def('DOORB', door(1)); def('DOORM', door(2));
    def('WATER', new Uint8Array(4096)); def('BRIM', new Uint8Array(4096));
    def('METALP', mk((x, y, i) => { const px = x & 15, py = y & 15; return pk(10, 5 + N2[i] * 3 + (px === 0 || py === 0 ? 3 : 0) + (px === 15 || py === 15 ? -2 : 0)); }));
  })();
  const WATN = fbm(97), SINT = new Float32Array(256); for (let i = 0; i < 256; i++) SINT[i] = Math.sin(i / 256 * TAU);
  function animTex(t) { const Wt = TEX[T.WATER], B = TEX[T.BRIM], o1 = (t * 24) | 0, o2 = (t * 18) | 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const u = (x + ((SINT[(y * 4 + o1) & 255] * 3) | 0)) & 63, v = (y + ((SINT[(x * 4 + o2) & 255] * 3) | 0)) & 63, n = WATN[(v << 6) | u], i = (y << 6) | x;
      Wt[i] = pk(3, 1 + n * 6); B[i] = pk(8, 2 + n * 13); } }
  // sky 256 x 200: night, moon, stars, drifting purple clouds
  const SKYW = 256, SKYH = 200, SKY = new Uint32Array(SKYW * SKYH);
  (function () { const r = RNG(77), cl = fbm(131);
    for (let y = 0; y < SKYH; y++) for (let x = 0; x < SKYW; x++) { const t = y / SKYH; let c = COL(14, clamp(1 + t * 9, 0, 15) | 0, 30);
      const n = cl[((y & 63) << 6) | (x & 63)]; if (n > 0.55 && y > 60 && y < 150) c = COL(6, clamp(2 + (n - 0.55) * 18, 0, 8) | 0, 30); SKY[y * SKYW + x] = c; }
    for (let k = 0; k < 90; k++) { const x = (r() * SKYW) | 0, y = (r() * 110) | 0; SKY[y * SKYW + x] = COL(15, 10 + ((r() * 6) | 0)); }
    for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) { const d = Math.hypot(x, y); if (d < 14) { const dd = Math.hypot(x + 6, y - 3); if (dd < 11) continue; SKY[(50 + y) * SKYW + 180 + x] = COL(4, clamp(15 - d * 0.3 - cl[((y & 63) << 6) | (x & 63)] * 3, 0, 15) | 0, 30); } }
  })();

  // ---------------- sprite art (procedural pixel art, palette indices; 0 = transparent) ----------------
  function SP(w, h) { return { w, h, d: new Uint8Array(w * h) }; }
  const put = (s, x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < s.w && y < s.h && c) s.d[y * s.w + x] = c; };
  function rect(s, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(s, x + i, y + j, typeof c === 'function' ? c(x + i, y + j) : c); }
  function ell(s, cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry; if (nx * nx + ny * ny <= 1) put(s, x, y, typeof c === 'function' ? c(nx, ny, x, y) : c); } }
  function line(s, x0, y0, x1, y1, c, th) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); th = th || 1; for (let k = 0; k <= n; k++) { const t = k / n; rect(s, Math.round(x0 + (x1 - x0) * t - (th - 1) / 2), Math.round(y0 + (y1 - y0) * t - (th - 1) / 2), th, th, c); } }
  function poly(s, pts, c) { let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= y1; y++) { const xs = []; const yc = y + 0.5;
      for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) put(s, x, y, typeof c === 'function' ? c(x, y) : c); } }
  const sh = (r, b) => (nx, ny) => pk(r, b - nx * 2 - ny * 3);
  function outline(s) { const o = new Uint8Array(s.d); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { if (s.d[y * s.w + x]) continue;
      if ((x > 0 && s.d[y * s.w + x - 1]) || (x < s.w - 1 && s.d[y * s.w + x + 1]) || (y > 0 && s.d[(y - 1) * s.w + x]) || (y < s.h - 1 && s.d[(y + 1) * s.w + x])) o[y * s.w + x] = pk(10, 0) || 1; }
    s.d = o; return s; }
  const S = {};
  (function () {
    // Robed acolyte (brown) and zealot (red): frame 0/1 walk, 2 attack, 3 dead
    const robed = (rr, f, zeal) => { const s = SP(32, 52), wob = f === 1 ? 2 : f === 0 ? -1 : 0;
      poly(s, [[10, 15], [22, 15], [28 + wob, 51], [4 + wob, 51]], (x, y) => pk(rr, 4 - (x - 16) * 0.15 + ((x + wob) % 6 === 0 ? -2 : 0) - y * 0.02));
      if (zeal) rect(s, 4 + wob, 49, 25, 2, pk(4, 9)); else rect(s, 9, 30, 15, 2, pk(7, 7));
      ell(s, 16, 10, 8, 10, sh(rr, 6)); ell(s, 16, 12, 4.5, 5.5, pk(10, 0) || 1); put(s, 14, 11, pk(12, 15)); put(s, 18, 11, pk(12, 15));
      if (f === 2) { if (zeal) { line(s, 22, 18, 27, 4, pk(rr, 5), 3); rect(s, 26, 0, 4, 6, pk(3, 6)); rect(s, 27, 0, 2, 2, pk(8, 15)); line(s, 10, 18, 12, 30, pk(rr, 4), 3); }
        else { rect(s, 6, 20, 24, 3, pk(10, 6)); rect(s, 4, 21, 6, 4, pk(1, 6)); rect(s, 12, 22, 4, 3, pk(9, 8)); rect(s, 22, 22, 3, 3, pk(9, 8)); ell(s, 30, 21, 2, 3, pk(12, 15)); } }
      else if (zeal) { line(s, 22, 18, 25, 30, pk(rr, 4), 3); rect(s, 23, 30, 4, 6, pk(3, 6)); rect(s, 24, 28, 2, 2, pk(8, 14)); line(s, 10, 18, 8, 30, pk(rr, 4), 3); }
      else { rect(s, 7, 27, 22, 3, pk(10, 6)); rect(s, 4, 27, 5, 4, pk(1, 6)); rect(s, 12, 28, 4, 3, pk(9, 8)); rect(s, 21, 28, 3, 3, pk(9, 8)); }
      return outline(s); };
    const heap = (rr, extra) => { const s = SP(36, 14); ell(s, 18, 9, 16, 5, sh(rr, 5)); ell(s, 29, 7, 5, 4, sh(rr, 6)); if (extra) rect(s, 4, 10, 10, 2, extra); return outline(s); };
    S.acolyte = [robed(1, 0), robed(1, 1), robed(1, 2), heap(1, pk(10, 6))];
    S.zealot = [robed(2, 0, 1), robed(2, 1, 1), robed(2, 2, 1), heap(2)];
    const zomb = f => { const s = SP(30, 50), a = f === 1 ? 2 : 0, b = f === 0 ? 2 : 0;
      rect(s, 10, 34 + a, 4, 15 - a, pk(5, 4)); rect(s, 16, 34 + b, 4, 15 - b, pk(5, 4)); rect(s, 9, 47, 6, 3, pk(1, 3)); rect(s, 15, 47, 6, 3, pk(1, 3));
      rect(s, 8, 18, 14, 18, (x, y) => pk(5, 5 - (x - 15) * 0.2)); rect(s, 10, 18, 2, 8, pk(5, 8)); rect(s, 18, 18, 2, 8, pk(5, 8)); rect(s, 9, 19, 12, 5, pk(11, 6));
      ell(s, 15, 10, 6, 7.5, sh(11, 8)); rect(s, 12, 9, 2, 2, pk(10, 0) || 1); rect(s, 17, 9, 2, 2, pk(10, 0) || 1); rect(s, 13, 14, 5, 1, pk(10, 1)); rect(s, 10, 3, 9, 2, pk(1, 3));
      if (f === 2) { line(s, 5, 2, 22, 22, pk(1, 6), 2); rect(s, 2, 0, 6, 6, pk(10, 8)); rect(s, 20, 19, 4, 4, pk(11, 7)); }
      else { line(s, 24, 12, 27, 46, pk(1, 6), 2); rect(s, 24, 44, 6, 6, pk(10, 8)); rect(s, 22, 22, 4, 4, pk(11, 7)); rect(s, 4, 22, 4, 10, pk(11, 6)); }
      return outline(s); };
    S.zombie = [zomb(0), zomb(1), zomb(2), heap(5, pk(11, 7))];
    const garg = f => { const s = SP(48, 40), up = f === 1 ? -8 : f === 2 ? 4 : 0;
      poly(s, [[18, 16], [1, 6 + up], [5, 20 + up / 2], [3, 28], [18, 26]], (x, y) => pk(0, 3 + y * 0.1)); poly(s, [[30, 16], [47, 6 + up], [43, 20 + up / 2], [45, 28], [30, 26]], (x, y) => pk(0, 3 + y * 0.1));
      ell(s, 24, 23, 8, 10, sh(0, 8)); ell(s, 24, 11, 5.5, 5, sh(0, 9)); line(s, 20, 8, 17, 2, pk(0, 6), 2); line(s, 28, 8, 31, 2, pk(0, 6), 2);
      put(s, 22, 11, pk(8, 15)); put(s, 26, 11, pk(8, 15)); rect(s, 22, 14, 5, 1, pk(10, 1)); rect(s, 18, 32, 4, 7, pk(0, 6)); rect(s, 26, 32, 4, 7, pk(0, 6));
      if (f === 2) { line(s, 17, 22, 12, 34, pk(0, 7), 2); line(s, 31, 22, 36, 34, pk(0, 7), 2); }
      return outline(s); };
    const gheap = () => { const s = SP(36, 14); ell(s, 18, 9, 15, 5, sh(0, 7)); ell(s, 8, 8, 6, 4, sh(0, 6)); ell(s, 28, 8, 6, 4, sh(0, 6)); return outline(s); };
    S.gargoyle = [garg(0), garg(1), garg(2), gheap()];
    const hound = f => { const s = SP(40, 26), a = f === 1 ? 3 : -3;
      ell(s, 19, 13, 12, 6, sh(10, 4)); ell(s, 32, 9, 6, 5, sh(10, 5)); rect(s, 35, 10, 5, 3, pk(10, 3)); line(s, 28, 5, 27, 1, pk(10, 3), 2);
      line(s, 11, 16, 9 + a, 25, pk(10, 3), 2); line(s, 15, 16, 15 - a, 25, pk(10, 3), 2); line(s, 25, 16, 23 + a, 25, pk(10, 3), 2); line(s, 28, 16, 30 - a, 25, pk(10, 3), 2);
      line(s, 7, 11, 1, 6, pk(10, 4), 2); put(s, 33, 8, pk(8, 15)); put(s, 34, 8, pk(8, 15));
      if (f === 2) { rect(s, 35, 12, 5, 2, pk(2, 6)); } return outline(s); };
    S.hound = [hound(0), hound(1), hound(2), (() => { const s = SP(36, 12); ell(s, 18, 8, 14, 4, sh(10, 4)); ell(s, 30, 7, 5, 3, sh(10, 5)); return outline(s); })()];
    const spec = f => { const s = SP(32, 48), w = f === 1 ? 2 : -2;
      poly(s, [[8, 8], [24, 8], [28 + w, 38], [23, 47], [16, 41], [9, 47], [4 + w, 38]], (x, y) => pk(13, 12 - y * 0.15 - Math.abs(x - 16) * 0.12));
      ell(s, 16, 11, 8, 9, sh(13, 13)); ell(s, 13, 10, 2, 3, pk(14, 1)); ell(s, 19, 10, 2, 3, pk(14, 1)); ell(s, 16, 16, 2.5, f === 2 ? 4 : 2.5, pk(14, 1));
      line(s, 8, 16, 1 + w, 26, pk(13, 9), 2); line(s, 24, 16, 31 + w, 26, pk(13, 9), 2); return s; };
    S.specter = [spec(0), spec(1), spec(2), (() => { const s = SP(24, 10); ell(s, 12, 6, 11, 4, pk(13, 6)); return s; })()];
    const baron = f => { const s = SP(64, 112);
      rect(s, 22, 74, 8, 36, pk(10, 2)); rect(s, 34, 74, 8, 36, pk(10, 2)); rect(s, 19, 106, 12, 6, pk(10, 1) || 1); rect(s, 33, 106, 12, 6, pk(10, 1) || 1);
      poly(s, [[16, 34], [48, 34], [52, 84], [44, 92], [40, 76], [24, 76], [20, 92], [12, 84]], (x, y) => pk(2, 6 - (x - 32) * 0.08 + ((x % 9) === 0 ? -1 : 0)));
      poly(s, [[26, 34], [38, 34], [36, 70], [28, 70]], (x, y) => pk(7, 6 + (x === 32 ? 3 : 0))); for (let k = 0; k < 4; k++) put(s, 32, 40 + k * 8, pk(7, 14));
      rect(s, 27, 30, 10, 5, pk(15, 12)); ell(s, 32, 22, 10, 11, sh(4, 12));
      for (let x = 24; x <= 40; x++) { const y = 26 + Math.round(Math.sin((x - 24) / 16 * PI) * 3); put(s, x, y, pk(10, 0) || 1); put(s, x, y - 1, (x & 1) ? pk(15, 14) : pk(15, 10)); }
      ell(s, 27, 19, 2.5, 2, pk(10, 0) || 1); ell(s, 37, 19, 2.5, 2, pk(10, 0) || 1); put(s, 27, 19, pk(12, 15)); put(s, 37, 19, pk(12, 15));
      rect(s, 18, 9, 28, 3, pk(10, 2)); rect(s, 22, -1, 20, 11, (x, y) => pk(10, 2 + (x === 23 ? 3 : 0))); rect(s, 22, 6, 20, 2, pk(2, 8));
      if (f === 2) { line(s, 48, 38, 58, 14, pk(2, 6), 5); ell(s, 58, 10, 5, 5, pk(8, 15)); ell(s, 58, 10, 2.5, 2.5, pk(12, 15)); }
      else { line(s, 48, 38, 54, 66, pk(2, 6), 5); rect(s, 52, 64, 5, 5, pk(15, 13)); line(s, 55, 66, 57, 108, pk(1, 4), 2); ell(s, 55, 64, 3, 3, pk(7, 13)); }
      line(s, 16, 38, f === 1 ? 8 : 10, 64, pk(2, 6), 5); rect(s, f === 1 ? 6 : 8, 62, 5, 5, pk(15, 13));
      return outline(s); };
    S.baron = [baron(0), baron(1), baron(2), (() => { const s = SP(64, 24); ell(s, 32, 16, 28, 7, sh(2, 6)); rect(s, 40, 4, 16, 9, pk(10, 2)); rect(s, 37, 12, 22, 2, pk(10, 2)); return outline(s); })()];
    // items
    const it = (w, h, fn) => { const s = SP(w, h); fn(s); return outline(s); };
    S.tonic = it(12, 18, s => { rect(s, 5, 0, 3, 5, pk(4, 10)); ell(s, 6, 11, 5, 6.5, sh(2, 10)); rect(s, 3, 9, 7, 4, pk(4, 12)); });
    S.essence = it(16, 18, s => { ell(s, 8, 10, 7, 7.5, sh(12, 14)); ell(s, 8, 10, 3.5, 4, pk(2, 12)); rect(s, 5, 0, 6, 3, pk(7, 10)); });
    S.armor = it(20, 20, s => { poly(s, [[3, 2], [17, 2], [19, 18], [1, 18]], (x, y) => pk(1, 6 - (x - 10) * 0.2)); rect(s, 7, 0, 6, 6, 0); for (let y = 5; y < 18; y += 4) rect(s, 2, y, 16, 1, pk(10, 7)); rect(s, 9, 6, 2, 12, pk(7, 9)); });
    S.shells = it(16, 12, s => { rect(s, 0, 3, 16, 9, pk(2, 6)); for (let k = 0; k < 4; k++) { rect(s, 2 + k * 3, 0, 2, 5, pk(2, 11)); rect(s, 2 + k * 3, 4, 2, 1, pk(7, 12)); } });
    S.bullets = it(16, 16, s => { ell(s, 8, 8, 7.5, 7.5, sh(10, 7)); ell(s, 8, 8, 3, 3, pk(10, 3)); rect(s, 7, 0, 2, 3, pk(7, 12)); });
    S.flares = it(14, 12, s => { rect(s, 0, 4, 14, 8, pk(8, 9)); rect(s, 2, 0, 3, 5, pk(12, 14)); rect(s, 6, 0, 3, 5, pk(12, 14)); rect(s, 10, 0, 3, 5, pk(12, 14)); });
    S.dyna = it(14, 16, s => { for (let k = 0; k < 3; k++) rect(s, 1 + k * 4, 3, 4, 13, (x, y) => pk(2, 9 - (x % 4))); rect(s, 0, 8, 14, 2, pk(1, 4)); line(s, 7, 3, 9, 0, pk(4, 10)); });
    S.pins = it(14, 14, s => { ell(s, 7, 9, 6.5, 5, sh(2, 9)); for (let k = 0; k < 4; k++) { line(s, 3 + k * 3, 6, 2 + k * 3 + (k & 1), 0, pk(15, 13)); put(s, 2 + k * 3 + (k & 1), 0, pk(7, 13)); } });
    S.keyb = it(10, 20, s => { ell(s, 5, 4, 4, 4, sh(4, 13)); ell(s, 5, 4, 1.5, 1.5, 0); rect(s, 4, 7, 2, 12, pk(4, 12)); rect(s, 6, 15, 3, 2, pk(4, 12)); rect(s, 6, 11, 2, 2, pk(4, 12)); });
    S.keym = it(14, 20, s => { ell(s, 7, 6, 6, 6, sh(7, 14)); ell(s, 10, 4, 5, 5, 0); rect(s, 6, 11, 2, 8, pk(7, 12)); rect(s, 8, 16, 3, 2, pk(7, 12)); });
    S.charm = it(14, 18, s => { line(s, 2, 0, 7, 6, pk(7, 11)); line(s, 12, 0, 7, 6, pk(7, 11)); ell(s, 7, 11, 6, 6.5, sh(7, 13)); ell(s, 7, 11, 3, 3.5, pk(6, 13)); });
    S.wrath = it(12, 18, s => { rect(s, 5, 0, 3, 5, pk(10, 6)); ell(s, 6, 11, 5, 6.5, sh(6, 12)); ell(s, 5, 10, 1.5, 2, pk(15, 15)); });
    S.w2 = it(28, 8, s => { rect(s, 0, 1, 16, 2, pk(10, 7)); rect(s, 0, 4, 16, 2, pk(10, 7)); rect(s, 14, 1, 14, 6, pk(1, 6)); });
    S.w3 = it(30, 12, s => { rect(s, 0, 2, 20, 3, pk(10, 6)); ell(s, 14, 8, 4, 4, pk(10, 4)); rect(s, 20, 1, 10, 5, pk(1, 6)); rect(s, 8, 5, 3, 6, pk(1, 5)); });
    S.w4 = it(16, 18, s => { for (let k = 0; k < 4; k++) rect(s, 1 + k * 3, 3, 3, 15, pk(2, 9)); rect(s, 0, 8, 16, 2, pk(1, 4)); line(s, 8, 3, 11, 0, pk(4, 10)); });
    S.w5 = it(14, 20, s => { ell(s, 7, 6, 5, 5, sh(1, 9)); rect(s, 3, 10, 8, 9, pk(1, 8)); line(s, 3, 12, 0, 16, pk(1, 8), 2); line(s, 11, 12, 13, 16, pk(1, 8), 2); put(s, 5, 5, pk(10, 0) || 1); put(s, 9, 5, pk(10, 0) || 1); line(s, 4, 8, 10, 8, pk(2, 8)); });
    // decor
    S.tomb = it(20, 26, s => { rect(s, 2, 8, 16, 18, (x, y) => pk(0, 7 - (x - 10) * 0.2)); ell(s, 10, 9, 8, 7, sh(0, 9)); rect(s, 9, 6, 2, 12, pk(0, 3)); rect(s, 6, 9, 8, 2, pk(0, 3)); rect(s, 0, 23, 20, 3, pk(3, 4)); });
    S.cross = it(16, 30, s => { rect(s, 6, 0, 4, 30, pk(0, 8)); rect(s, 0, 7, 16, 4, pk(0, 8)); rect(s, 3, 27, 10, 3, pk(0, 5)); });
    S.tree = it(44, 70, s => { line(s, 22, 69, 22, 30, pk(1, 3), 5); line(s, 22, 40, 8, 20, pk(1, 3), 3); line(s, 22, 34, 36, 14, pk(1, 3), 3); line(s, 8, 20, 2, 8, pk(1, 2), 2); line(s, 8, 20, 14, 4, pk(1, 2), 2);
      line(s, 36, 14, 42, 6, pk(1, 2), 2); line(s, 36, 14, 30, 2, pk(1, 2), 2); line(s, 22, 30, 24, 4, pk(1, 3), 3); line(s, 24, 10, 18, 0, pk(1, 2), 2); });
    S.candle = it(8, 16, s => { rect(s, 2, 6, 4, 10, pk(4, 12)); ell(s, 4, 3, 2, 3, pk(12, 15)); put(s, 4, 4, pk(8, 15)); });
    S.candelabra = it(22, 44, s => { rect(s, 10, 10, 2, 32, pk(7, 9)); rect(s, 5, 40, 12, 4, pk(7, 8)); line(s, 3, 10, 19, 10, pk(7, 9), 2); rect(s, 2, 4, 3, 6, pk(4, 12)); rect(s, 10, 4, 2, 6, pk(4, 12)); rect(s, 17, 4, 3, 6, pk(4, 12));
      for (const x of [3, 11, 18]) ell(s, x, 2, 1.5, 2.5, pk(12, 15)); });
    S.coffin = it(20, 40, s => { poly(s, [[6, 0], [14, 0], [19, 10], [16, 39], [4, 39], [1, 10]], (x, y) => pk(1, 4 + (x === 10 ? 3 : 0) - (x - 10) * 0.15)); rect(s, 9, 8, 2, 14, pk(7, 10)); rect(s, 6, 12, 8, 2, pk(7, 10)); });
    S.crate = it(24, 24, s => { rect(s, 0, 0, 24, 24, (x, y) => (x < 3 || y < 3 || x > 20 || y > 20 || Math.abs(x - y) < 2) ? pk(1, 9) : pk(1, 5 + ((y >> 2) & 1))); });
    S.barrel = it(18, 26, s => { rect(s, 1, 0, 16, 26, (x, y) => pk(2, 9 - Math.abs(x - 9) * 0.6)); rect(s, 1, 4, 16, 2, pk(10, 5)); rect(s, 1, 20, 16, 2, pk(10, 5)); rect(s, 5, 10, 8, 6, pk(7, 12)); rect(s, 7, 12, 4, 2, pk(10, 1)); });
    S.balloon = it(12, 26, s => { ell(s, 6, 6, 5.5, 6, sh(2, 11)); line(s, 6, 12, 7, 25, pk(15, 11)); });
    S.balloon2 = it(12, 26, s => { ell(s, 6, 6, 5.5, 6, sh(6, 11)); line(s, 6, 12, 5, 25, pk(15, 11)); });
    S.clown = it(26, 52, s => { rect(s, 6, 20, 14, 22, (x, y) => (((x >> 2) + (y >> 2)) & 1) ? pk(6, 8) : pk(7, 10)); rect(s, 7, 42, 5, 10, pk(6, 6)); rect(s, 14, 42, 5, 10, pk(6, 6));
      ell(s, 13, 11, 8, 9, sh(15, 13)); ell(s, 13, 12, 2.5, 2.5, pk(2, 11)); ell(s, 9, 8, 2, 2, pk(10, 1)); ell(s, 17, 8, 2, 2, pk(10, 1)); for (let x = 7; x <= 19; x++) put(s, x, 15 + Math.round(Math.sin((x - 7) / 12 * PI) * 2), pk(2, 8));
      ell(s, 4, 6, 4, 4, sh(8, 10)); ell(s, 22, 6, 4, 4, sh(8, 10)); line(s, 6, 24, 0, 34, pk(6, 8), 3); line(s, 20, 24, 25, 34, pk(6, 8), 3); });
    S.lantern = it(10, 18, s => { rect(s, 4, 0, 2, 3, pk(10, 5)); rect(s, 1, 3, 8, 2, pk(10, 5)); rect(s, 2, 5, 6, 10, pk(12, 13)); rect(s, 1, 15, 8, 2, pk(10, 5)); rect(s, 4, 5, 2, 10, pk(8, 15)); });
    S.bones = it(22, 8, s => { line(s, 1, 6, 12, 2, pk(4, 11), 2); line(s, 8, 6, 20, 4, pk(4, 10), 2); ell(s, 16, 3, 3.5, 3, sh(4, 12)); put(s, 15, 3, pk(10, 0) || 1); });
    S.flare = it(6, 6, s => { ell(s, 3, 3, 3, 3, pk(12, 15)); put(s, 3, 3, pk(15, 15)); });
    S.stick = it(6, 10, s => { rect(s, 1, 3, 4, 7, pk(2, 10)); put(s, 3, 1, pk(12, 15)); put(s, 3, 2, pk(4, 9)); });
    S.bottle = it(6, 10, s => { rect(s, 2, 0, 2, 3, pk(4, 10)); ell(s, 3, 6, 2.5, 3.5, pk(3, 8)); put(s, 3, 0, pk(8, 15)); });
    S.fireball = it(12, 12, s => { ell(s, 6, 6, 6, 6, (nx, ny) => pk(8, 15 - (nx * nx + ny * ny) * 8)); ell(s, 6, 6, 2.5, 2.5, pk(12, 15)); });
  })();
  // viewmodel weapon art (2D, Build-style) -- 0 pitchfork, 1 flare pistol, 2 sawed-off, 3 tommy gun, 4 dynamite, 5 hex poppet
  const VM = [];
  (function () {
    const hand = (s, x, y) => { ell(s, x, y, 9, 7, sh(9, 9)); rect(s, x - 9, y + 4, 18, 30, (xx, yy) => pk(10, 2 + ((xx + yy) % 7 === 0 ? 1 : 0))); rect(s, x - 9, y + 4, 18, 3, pk(15, 12)); };
    let s = SP(80, 110); line(s, 46, 109, 36, 20, pk(1, 7), 5); rect(s, 22, 14, 28, 4, pk(10, 8)); for (const x of [23, 35, 47]) line(s, x, 15, x - 3, 0, pk(10, 10), 2); hand(s, 42, 80); VM.push(outline(s));
    s = SP(70, 80); rect(s, 26, 18, 14, 40, (x, y) => pk(8, 8 - (x - 33) * 0.3)); rect(s, 24, 14, 18, 8, pk(8, 10)); ell(s, 33, 16, 5, 3, pk(10, 1) || 1); rect(s, 30, 40, 22, 12, pk(1, 6)); hand(s, 44, 52); VM.push(outline(s));
    s = SP(90, 90); for (const x of [32, 46]) rect(s, x, 8, 12, 50, (xx, yy) => pk(10, 8 - Math.abs(xx - x - 6) * 0.6)); ell(s, 38, 10, 5, 4, pk(10, 0) || 1); ell(s, 52, 10, 5, 4, pk(10, 0) || 1);
    rect(s, 30, 50, 30, 12, pk(10, 4)); poly(s, [[32, 58], [60, 58], [66, 90], [38, 90]], (x, y) => pk(1, 7 - (x - 50) * 0.1)); hand(s, 30, 66); VM.push(outline(s));
    s = SP(100, 90); rect(s, 44, 0, 8, 46, pk(10, 7)); for (let y = 4; y < 40; y += 5) rect(s, 42, y, 12, 2, pk(10, 4)); rect(s, 38, 40, 20, 26, pk(10, 5)); ell(s, 32, 56, 14, 14, sh(10, 7)); ell(s, 32, 56, 4, 4, pk(10, 3));
    rect(s, 52, 50, 10, 30, pk(1, 7)); poly(s, [[50, 66], [64, 66], [74, 90], [56, 90]], pk(1, 6)); hand(s, 60, 72); hand(s, 30, 70); VM.push(outline(s));
    s = SP(70, 90); for (let k = 0; k < 4; k++) rect(s, 22 + k * 7, 10, 7, 36, (x, y) => pk(2, 10 - ((x - 22) % 7))); rect(s, 20, 24, 30, 4, pk(1, 4)); line(s, 36, 10, 42, 0, pk(4, 10), 2); hand(s, 36, 50); VM.push(outline(s));
    s = SP(80, 90); ell(s, 34, 22, 14, 13, sh(1, 9)); rect(s, 22, 32, 24, 28, (x, y) => pk(1, 8 - ((x + y) % 5 === 0 ? 1 : 0))); line(s, 22, 38, 10, 50, pk(1, 8), 6); line(s, 46, 38, 56, 30, pk(1, 8), 6);
    ell(s, 28, 20, 3, 3, pk(10, 0) || 1); ell(s, 40, 20, 3, 3, pk(10, 0) || 1); put(s, 28, 20, pk(15, 12)); put(s, 40, 20, pk(15, 12)); for (let x = 27; x < 42; x += 2) put(s, x, 28, pk(2, 8)); rect(s, 26, 46, 16, 2, pk(2, 8));
    line(s, 46, 30, 52, 18, pk(15, 14), 1); line(s, 38, 34, 44, 24, pk(15, 14), 1); hand(s, 34, 66); VM.push(outline(s));
  })();

  // ---------------- font ----------------
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
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '&': [12, 18, 20, 8, 21, 18, 13]
  };

  // ---------------- game data ----------------
  const WPN = [
    { name: 'PITCHFORK', ammo: null, rate: 0.45 },
    { name: 'FLARE PISTOL', ammo: 'f', rate: 0.7 },
    { name: 'SAWED-OFF', ammo: 's', rate: 0.55 },
    { name: 'TOMMY GUN', ammo: 'b', rate: 0.085 },
    { name: 'DYNAMITE', ammo: 'd', rate: 0.9 },
    { name: 'HEX POPPET', ammo: 'p', rate: 0.4 }];
  const AMAX = { f: 50, s: 100, b: 400, d: 50, p: 100 };
  const MT = {
    acolyte: { hp: 40, r: 0.25, h: 1.0, spd: 1.6, score: 100, spr: 'acolyte', name: 'ACOLYTE' },
    zealot: { hp: 60, r: 0.25, h: 1.0, spd: 1.5, score: 200, spr: 'zealot', name: 'ZEALOT' },
    zombie: { hp: 55, r: 0.25, h: 0.98, spd: 1.0, score: 150, spr: 'zombie', name: 'GROUNDSKEEPER' },
    hound: { hp: 40, r: 0.3, h: 0.55, spd: 3.4, score: 150, spr: 'hound', name: 'EMBER HOUND', wide: 1.5 },
    gargoyle: { hp: 120, r: 0.3, h: 0.85, spd: 2.4, score: 400, spr: 'gargoyle', fly: true, name: 'GUTTER GARGOYLE', wide: 1.2 },
    specter: { hp: 70, r: 0.25, h: 0.95, spd: 1.5, score: 350, spr: 'specter', fly: true, name: 'WAILING SPECTER', ghost: true },
    baron: { hp: 1800, r: 0.6, h: 2.3, spd: 0.9, score: 15000, spr: 'baron', name: 'THE PALE IMPRESARIO' }};
  // themes: wall, wall2, floor, ceil
  const THEMES = [['STONEW', 'STONEW', 'GRASS', 'PLANK'], ['MOSSW', 'STONEW', 'DIRT', 'PLANK'], ['WALLPAPER', 'PANEL', 'CARPET', 'PLASTER'], ['PANEL', 'WALLPAPER', 'WOODF', 'PLASTER'],
    ['TRAINWIN', 'TRAINWOOD', 'WOODF', 'TRAINCEIL'], ['TENT', 'PLANK', 'DIRT', 'TENT'], ['STRIPE', 'MIRROR', 'CHECKER', 'STRIPE'], ['CRYPT', 'STONEW', 'FLAGB', 'CRYPT']];
  const DECOR = {
    grave: [['tomb', 1, 0.5], ['tomb', 1, 0.5], ['cross', 0, 0.6], ['tree', 1, 1.5], ['candle', 0, 0.3, 1], ['bones', 0, 0.15]],
    parlor: [['candelabra', 1, 0.9, 1], ['coffin', 1, 0.95], ['crate', 1, 0.5], ['candle', 0, 0.3, 1]],
    train: [['crate', 1, 0.5], ['barrel', 1, 0.55], ['lantern', 0, 0.35, 1], ['crate', 1, 0.5]],
    carnival: [['balloon', 0, 0.5], ['balloon2', 0, 0.5], ['barrel', 1, 0.55], ['clown', 1, 1.1], ['lantern', 0, 0.35, 1], ['crate', 1, 0.5]],
    funhouse: [['clown', 1, 1.1], ['balloon', 0, 0.5], ['balloon2', 0, 0.5], ['candelabra', 1, 0.9, 1], ['barrel', 1, 0.55]],
    crypt: [['coffin', 1, 0.95], ['candle', 0, 0.3, 1], ['bones', 0, 0.15], ['tomb', 1, 0.5], ['candelabra', 1, 0.9, 1]]};
  const LEVELS = [
    { name: 'HOLLOW REST CEMETERY', gx: 3, gy: 2, rooms: 6, themes: [0, 1], sky: 0.8, dens: 0.55, mix: { acolyte: 5, zombie: 4 }, give: [2], keys: 0, amb: 12, decor: 'grave', seed: 11 },
    { name: 'GRAVES & SONS FUNERAL PARLOR', gx: 3, gy: 3, rooms: 7, themes: [2, 3], sky: 0.1, dens: 0.6, mix: { acolyte: 4, zombie: 3, hound: 2 }, give: [3], keys: 1, amb: 9, decor: 'parlor', seed: 22 },
    { name: 'THE MIDNIGHT EXPRESS', gx: 7, gy: 1, rooms: 7, themes: [4], sky: 0, dens: 0.8, mix: { acolyte: 4, zealot: 3, hound: 2 }, give: [4], keys: 1, amb: 10, decor: 'train', train: true, seed: 33 },
    { name: 'CARNIVAL OF CROWS', gx: 4, gy: 3, rooms: 9, themes: [5, 6], sky: 0.7, dens: 0.7, mix: { acolyte: 3, zealot: 3, zombie: 2, gargoyle: 2 }, give: [5], keys: 1, amb: 11, decor: 'carnival', water: 1, seed: 44 },
    { name: 'THE GRINNING FUNHOUSE', gx: 4, gy: 3, rooms: 10, themes: [6, 5], sky: 0.1, dens: 0.75, mix: { zealot: 3, zombie: 3, specter: 2, hound: 2 }, give: [], keys: 2, amb: 10, decor: 'funhouse', seed: 55 },
    { name: 'BLACKWOOD MANOR', gx: 4, gy: 4, rooms: 11, themes: [2, 3], sky: 0.15, dens: 0.8, mix: { acolyte: 3, zealot: 3, specter: 3, gargoyle: 2, hound: 2 }, give: [], keys: 2, amb: 8, decor: 'parlor', seed: 66 },
    { name: 'LANTERN HILL CATACOMBS', gx: 5, gy: 3, rooms: 12, themes: [7, 1], sky: 0.2, dens: 0.85, mix: { zombie: 4, specter: 3, gargoyle: 3, zealot: 2, acolyte: 2 }, give: [], keys: 2, amb: 7, decor: 'crypt', water: 1, seed: 77 },
    { name: 'THE BIG TOP', boss: true, amb: 12, seed: 88 }];
  const K_DOOR = 3, K_WATER = 1, K_BRIM = 2, K_KEYB = 6, K_KEYM = 7, K_EXIT = 8;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const SW = 11, STEP = 0.3, PR = 0.25, PHT = 0.9, EYE = 0.72, GRAV = 13;

  // ---------------- level generation ----------------
  function newGrid(mw, mh) { const N = mw * mh;
    return { mw, mh, sol: new Uint8Array(N).fill(1), fl: new Float32Array(N), ce: new Float32Array(N), sky: new Uint8Array(N), kind: new Uint8Array(N), th: new Uint8Array(N), corr: new Uint8Array(N),
      room: new Int16Array(N).fill(-1), ents: [], lights: [], secrets: 0 }; }
  function openCell(g, x, y, f, c, sky, th, room) { const i = y * g.mw + x; g.sol[i] = 0; g.fl[i] = f; g.ce[i] = c; g.sky[i] = sky ? 1 : 0; g.th[i] = th; g.room[i] = room; }
  function genLevel(cfg, seed) {
    const rng = RNG(seed), ri = (a, b) => a + ((rng() * (b - a + 1)) | 0), pick = a => a[(rng() * a.length) | 0];
    const GX = cfg.gx, GY = cfg.gy, g = newGrid(GX * SW + 2, GY * SW + 2), mw = g.mw;
    const slot = new Int16Array(GX * GY).fill(-1), rooms = [];
    rooms.push({ sx: 0, sy: ri(0, GY - 1), par: -1, depth: 0, kids: [] }); slot[rooms[0].sy * GX] = 0;
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
      const big = i === 0 || i === exitI || rng() < 0.3; let w = big ? ri(7, 9) : ri(4, 8), h = big ? ri(7, 9) : ri(4, 8);
      if (cfg.train) { w = 9; h = (i === 0 || i === exitI) ? 7 : 3; }
      r.x0 = ri(Math.max(x0 + 1, r.cx - w + 1), Math.min(r.cx, x0 + 10 - w)); r.x1 = r.x0 + w - 1;
      r.y0 = ri(Math.max(y0 + 1, r.cy - h + 1), Math.min(r.cy, y0 + 10 - h)); r.y1 = r.y0 + h - 1; r.w = w; r.h = h;
      r.th = pick(cfg.themes); r.sky = cfg.train ? (i === 0 || i === exitI) : (i === 0 || rng() < cfg.sky); r.tall = big || rng() < 0.4; r.door = cfg.train || rng() < 0.5;
      if (cfg.train && r.sky) r.th = 1;
    });
    const corr = (A, B) => { const c = [];
      if (A.sy === B.sy) { if (B.sx > A.sx) for (let x = A.x1 + 1; x < B.x0; x++) c.push([x, A.cy]); else for (let x = A.x0 - 1; x > B.x1; x--) c.push([x, A.cy]); }
      else { if (B.sy > A.sy) for (let y = A.y1 + 1; y < B.y0; y++) c.push([A.cx, y]); else for (let y = A.y0 - 1; y > B.y1; y--) c.push([A.cx, y]); }
      return c; };
    rooms[0].fh = 0;
    for (let i = 1; i < rooms.length; i++) { const r = rooms[i], A = rooms[r.par]; r.corr = corr(A, r); const L = r.corr.length, maxStep = (L - 1) * 0.25;
      let h = clamp(A.fh + (cfg.train ? 0 : ri(-2, 2) * 0.25), 0, 1.5); if (Math.abs(h - A.fh) > maxStep) h = A.fh + Math.sign(h - A.fh) * maxStep; r.fh = Math.round(h * 4) / 4; }
    const sub = (i, set) => { set.add(i); for (const k of rooms[i].kids) sub(k, set); return set; };
    const locks = []; const nk = Math.min(cfg.keys || 0, Math.max(0, mp.length - 2));
    if (nk >= 1) { const fr = nk === 1 ? [0.55] : [0.4, 0.75]; let prevSub = null;
      for (let k = 0; k < nk; k++) { const e = clamp(Math.round(fr[k] * (mp.length - 1)), 1 + k, mp.length - 1); if (locks.length && e <= locks[locks.length - 1].e) continue;
        const behind = sub(mp[e], new Set()); const allowed = []; rooms.forEach((r, i) => { if (!behind.has(i) && (!prevSub || prevSub.has(i)) && i !== 0) allowed.push(i); });
        if (!allowed.length) continue; allowed.sort((a, b) => (onPath.has(a) - onPath.has(b)) || (rooms[b].depth - rooms[a].depth));
        const keyRoom = allowed[0]; if (locks.some(l => l.keyRoom === keyRoom)) continue; locks.push({ e, room: mp[e], keyRoom, kind: k === 0 ? K_KEYB : K_KEYM }); prevSub = behind; } }
    rooms.forEach((r, i) => { const ceil = r.sky ? r.fh + 5 : r.fh + (cfg.train ? 2.1 : r.tall ? 3 : 2.3); r.ceil = ceil;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) openCell(g, x, y, r.fh, ceil, r.sky, r.th, i);
      if (!r.sky) g.lights.push({ x: (r.x0 + r.x1 + 1) / 2, y: ceil - 0.3, z: (r.y0 + r.y1 + 1) / 2, r: 3 + Math.max(r.w, r.h) * 0.7, i: 26 }); });
    for (let i = 1; i < rooms.length; i++) { const r = rooms[i], A = rooms[r.par], steps = Math.round((r.fh - A.fh) / 0.25), sg = Math.sign(steps);
      r.corr.forEach(([x, y], j) => { const f = A.fh + sg * Math.min(Math.abs(steps), j) * 0.25; openCell(g, x, y, f, f + (cfg.train ? 2.1 : 1.9), false, cfg.train ? 4 : A.th, -1); const ci = y * mw + x; g.corr[ci] = 1;
        if (j === 0) { const lk = locks.find(l => l.room === i); if (lk) g.kind[ci] = lk.kind; else if (r.door) g.kind[ci] = K_DOOR; } }); }
    const taken = new Set(), blockers = [];
    // features: water pools, pillars
    rooms.forEach((r, i) => { if (r.w < 5 || r.h < 5) return;
      const qs = [[r.x0, r.cx - 2, r.y0, r.cy - 2], [r.cx + 2, r.x1, r.y0, r.cy - 2], [r.x0, r.cx - 2, r.cy + 2, r.y1], [r.cx + 2, r.x1, r.cy + 2, r.y1]].filter(q => q[1] >= q[0] + 1 && q[3] >= q[2] + 1);
      for (const q of qs) { const roll = rng(); const cells = []; for (let y = q[2]; y <= q[3]; y++) for (let x = q[0]; x <= q[1]; x++) cells.push([x, y]);
        if (cfg.water && roll < 0.25 && i !== 0) { for (const [x, y] of cells) { const ci = y * mw + x; g.fl[ci] = r.fh - 0.25; g.kind[ci] = K_WATER; taken.add(ci); } }
        else if (roll < 0.45 && cells.length >= 9 && !r.sky) { const x = (q[0] + q[1]) >> 1, y = (q[2] + q[3]) >> 1; g.sol[y * mw + x] = 1; taken.add(y * mw + x); }
        else if (roll < 0.6 && !r.sky) { for (const [x, y] of cells) g.fl[y * mw + x] = r.fh + 0.25; const [x, y] = cells[(cells.length / 2) | 0]; g.ents.push({ t: 'decor', k: 'candelabra', b: 1, h: 0.9, x: x + 0.5, z: y + 0.5 }); g.lights.push({ x: x + 0.5, y: r.fh + 1.3, z: y + 0.5, r: 4.5, i: 26 }); taken.add(y * mw + x); }
      } });
    const free = (r, avoidCenter, avoidCross) => { const c = [];
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const ci = y * mw + x;
        if (g.sol[ci] || g.kind[ci] || taken.has(ci) || g.fl[ci] !== r.fh) continue; if (avoidCenter && Math.abs(x - r.cx) <= 1 && Math.abs(y - r.cy) <= 1) continue;
        if (avoidCross && (Math.abs(x - r.cx) <= 1 || Math.abs(y - r.cy) <= 1)) continue; c.push(ci); }
      return c; };
    const place = (r, ent, avoidCenter, avoidCross) => { const f = free(r, avoidCenter, avoidCross); if (!f.length) return false; const ci = pick(f); taken.add(ci); ent.x = (ci % mw) + 0.5; ent.z = ((ci / mw) | 0) + 0.5; g.ents.push(ent); return ent; };
    const R0 = rooms[0]; g.start = { x: R0.cx + 0.5, z: R0.cy + 0.5, yaw: 0 };
    if (R0.kids.length) { const K = rooms[R0.kids[0]]; g.start.yaw = Math.atan2(K.cy - R0.cy, K.cx - R0.cx); }
    taken.add(R0.cy * mw + R0.cx);
    const E = rooms[exitI], ei = E.cy * mw + E.cx; g.kind[ei] = K_EXIT; taken.add(ei); g.exit = { x: E.cx + 0.5, z: E.cy + 0.5 };
    g.lights.push({ x: E.cx + 0.5, y: E.fh + 1, z: E.cy + 0.5, r: 4, i: 26 });
    for (const l of locks) place(rooms[l.keyRoom], { t: 'item', k: l.kind === K_KEYB ? 'keyb' : 'keym' }, false);
    cfg.give.forEach((w, j) => place(rooms[mp[Math.min(mp.length - 1, 1 + j)]] || R0, { t: 'item', k: 'w' + w }, true));
    // secret stash: a powerup tucked in a dead-end room behind a fake wall section
    let sec = -1; for (let i = rooms.length - 1; i > 0; i--) if (!onPath.has(i) && !rooms[i].kids.length && !locks.some(l => l.keyRoom === i)) { sec = i; break; }
    if (sec >= 0) { const r = rooms[sec]; const nx = r.x1 + 1 < mw - 1 && r.x1 + 2 < mw - 1 ? r.x1 + 1 : r.x0 - 1; let ok = true;
      for (let y = r.cy - 1; y <= r.cy + 1; y++) for (const xx of [nx, nx + (nx > r.x1 ? 1 : -1)]) if (xx <= 0 || xx >= mw - 1 || !g.sol[y * mw + xx]) ok = false;
      for (let y = r.cy - 2; y <= r.cy + 2; y++) { const xx = nx + (nx > r.x1 ? 1 : -1) * 2; if (xx > 0 && xx < mw - 1 && !g.sol[y * mw + xx]) ok = false; }
      if (ok) { const ax = nx + (nx > r.x1 ? 1 : -1); openCell(g, ax, r.cy, r.fh, r.fh + 2, false, r.th, -2); g.kind[r.cy * mw + nx] = 0;
        openCell(g, nx, r.cy, r.fh, r.fh + 2, false, r.th, -2); g.kind[r.cy * mw + nx] = 4; g.secretCell = r.cy * mw + nx;
        g.ents.push({ t: 'item', k: pick(['charm', 'wrath', 'essence']), x: ax + 0.5, z: r.cy + 0.5 }); g.secrets++; } }
    const lv = LEVELS.indexOf(cfg);
    const ammoK = ['flares', 'tonic', 'shells', 'shells']; if (lv >= 1) ammoK.push('bullets', 'bullets'); if (lv >= 2) ammoK.push('dyna'); if (lv >= 3) ammoK.push('pins');
    const mixK = Object.keys(cfg.mix), mixW = mixK.map(k => cfg.mix[k]), mixT = mixW.reduce((a, b) => a + b, 0);
    const pickMon = () => { let q = rng() * mixT; for (let j = 0; j < mixK.length; j++) { q -= mixW[j]; if (q <= 0) return mixK[j]; } return mixK[0]; };
    const dec = DECOR[cfg.decor];
    rooms.forEach((r, i) => {
      const area = r.w * r.h; const nm = i === 0 ? 0 : Math.round(area / 11 * cfg.dens * (0.7 + rng() * 0.6)) + (i === exitI ? 1 : 0);
      for (let j = 0; j < nm; j++) place(r, { t: 'mon', k: pickMon(), yaw: rng() * TAU }, i === exitI);
      const ni = i === 0 ? 2 : ri(1, 3); for (let j = 0; j < ni; j++) place(r, { t: 'item', k: pick(ammoK) }, false);
      if (rng() < 0.25) place(r, { t: 'item', k: 'armor' }, false);
      const nd = Math.round(area / (r.sky ? 7 : 12)) + 1;
      for (let j = 0; j < nd; j++) { const d = pick(dec); const e = place(r, { t: 'decor', k: d[0], b: d[1], h: d[2] }, true, !!d[1]); if (e && d[3]) g.lights.push({ x: e.x, y: r.fh + d[2] + 0.2, z: e.z, r: 3.5, i: 22 }); }
    });
    if (cfg.decor === 'carnival' || cfg.decor === 'funhouse' || cfg.decor === 'train') rooms.forEach(r => { if (rng() < 0.5) place(r, { t: 'decor', k: 'barrel', b: 1, h: 0.55, tnt: 1 }, true, true); });
    g.name = cfg.name; g.amb = cfg.amb; return g;
  }
  function genBoss(cfg) {
    const g = newGrid(30, 36), mw = 30;
    for (let y = 2; y <= 23; y++) for (let x = 2; x <= 27; x++) { const d = Math.hypot(x + 0.5 - 15, (y + 0.5 - 12.5) * 1.15); if (d < 12.6) openCell(g, x, y, 0, 6, false, 5, 0); }
    for (let y = 2; y <= 23; y++) for (let x = 2; x <= 27; x++) { const i = y * mw + x; if (g.sol[i]) continue; const d = Math.hypot(x + 0.5 - 15, (y + 0.5 - 12.5) * 1.15);
      if (d > 10.5) g.fl[i] = d > 11.6 ? 0.75 : 0.5; else if (d > 9.5) g.fl[i] = 0.25; if (d < 4.5) g.fl[i] = 0.25; }
    for (let y = 27; y <= 33; y++) for (let x = 11; x <= 18; x++) openCell(g, x, y, 0, 2.6, true, 0, 1);
    for (let y = 18; y <= 26; y++) for (let x = 14; x <= 15; x++) { const i = y * mw + x; if (g.sol[i]) openCell(g, x, y, 0, 2.2, false, 5, -1); else g.fl[i] = 0; }
    g.kind[26 * mw + 14] = K_DOOR; g.kind[26 * mw + 15] = K_DOOR;
    for (const [x, y] of [[9, 9], [20, 9], [9, 16], [20, 16]]) g.sol[y * mw + x] = 1;
    g.lights.push({ x: 15, y: 5, z: 12.5, r: 13, i: 30 }, { x: 15, y: 2, z: 30, r: 6, i: 20 });
    const it = (k, x, y) => g.ents.push({ t: 'item', k, x: x + 0.5, z: y + 0.5 });
    it('dyna', 12, 31); it('bullets', 17, 31); it('shells', 12, 28); it('pins', 17, 28); it('armor', 14, 32); it('essence', 15, 32);
    it('dyna', 4, 12); it('bullets', 25, 12); it('tonic', 6, 6); it('tonic', 23, 6); it('shells', 6, 19); it('flares', 23, 19); it('pins', 15, 4); it('wrath', 4, 14); it('bullets', 25, 14);
    for (const [x, y, k] of [[11, 31, 'lantern'], [18, 31, 'lantern'], [5, 9, 'clown'], [24, 9, 'clown'], [5, 16, 'balloon'], [24, 16, 'balloon2'], [8, 4, 'barrel'], [21, 4, 'barrel']])
      g.ents.push({ t: 'decor', k, b: k === 'clown' || k === 'barrel' ? 1 : 0, h: k === 'clown' ? 1.1 : k === 'barrel' ? 0.55 : k === 'lantern' ? 0.35 : 0.5, x: x + 0.5, z: y + 0.5, tnt: k === 'barrel' ? 1 : 0 });
    g.ents.push({ t: 'mon', k: 'baron', x: 15, z: 7, yaw: PI / 2 }, { t: 'mon', k: 'acolyte', x: 8, z: 12, yaw: 0 }, { t: 'mon', k: 'acolyte', x: 22, z: 12, yaw: PI });
    g.start = { x: 15, z: 32, yaw: -PI / 2 }; g.exit = null; g.bossGate = { x: 15.5, z: 12.5 }; g.name = cfg.name; g.amb = cfg.amb; g.boss = true;
    return g;
  }
  function validate(g) {
    const mw = g.mw, N = mw * g.mh, keys = new Set(), ent = new Map(), blocked = new Set();
    for (const e of g.ents) { if (e.t === 'item' && (e.k === 'keyb' || e.k === 'keym')) ent.set(((e.z | 0) * mw + (e.x | 0)), e.k); if (e.t === 'decor' && e.b) blocked.add((e.z | 0) * mw + (e.x | 0)); }
    for (let pass = 0; pass < 4; pass++) {
      const seen = new Uint8Array(N), q = [((g.start.z | 0) * mw + (g.start.x | 0))]; seen[q[0]] = 1;
      while (q.length) { const i = q.shift(); if (ent.has(i)) keys.add(ent.get(i)); if (g.kind[i] === K_EXIT) return true;
        for (const [dx, dy] of DIRS) { const j = i + dx + dy * mw; if (seen[j] || g.sol[j] || blocked.has(j)) continue; const k = g.kind[j];
          if (k === 4) continue; if (k === K_KEYB && !keys.has('keyb')) continue; if (k === K_KEYM && !keys.has('keym')) continue;
          if (g.fl[j] > g.fl[i] + STEP) continue; if (Math.min(g.ce[i], g.ce[j]) - Math.max(g.fl[i], g.fl[j]) < 1.0) continue; seen[j] = 1; q.push(j); } }
    }
    return false;
  }
  function buildGrid(idx) { const cfg = LEVELS[idx]; if (cfg.boss) return genBoss(cfg);
    for (let a = 0; a < 60; a++) { const g = genLevel(cfg, cfg.seed + a * 7919); if (validate(g)) return g; } return genLevel(cfg, cfg.seed); }

  ArcadeRegistry.register({
    id: 'blood', title: 'Blood', year: 1997, maker: 'Monolith',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Arrows/WASD: move \u00b7 Space/Click: fire \u00b7 Z: alt-fire \u00b7 Enter/C: jump \u00b7 X or 1-6: weapon \u00b7 Mouse or R/F: look \u00b7 A/D strafe',
    marquee: { bg: '#0c0606', fg: '#c01818', accent: '#e0d0a0' },
    create(api) {
      const A = api.audio;
      let FB = null, img = null; const ZB = new Float32Array(W * VH), RINV = new Float32Array(VH);
      let MW = 0, MH = 0, SOL, FL, CE, SKYC, KIND, TH, BLOCK, LG, G = null, levelIdx = 0;
      let doors = [], dynAt = new Map(), mons = [], items = [], projs = [], parts = [], decor = [], flow = null, flowT = 0;
      let kills = 0, totalMons = 0, secretsFound = 0, levelTime = 0, exitOn = null, noise = null, flashL = 0;

      function losStatic(ax, ay, az, bx, by, bz) { const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz), n = Math.ceil(d / 0.15);
        for (let i = 1; i < n; i++) { const t = i / n, x = ax + dx * t, y = ay + dy * t, z = az + dz * t, cx = Math.floor(x), cz = Math.floor(z);
          if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) return false; const c = cz * MW + cx; if (SOL[c] || y < FL[c] || y > CE[c]) return false; } return true; }
      function bakeLights() {
        const cl = new Float32Array(MW * MH);
        for (let i = 0; i < MW * MH; i++) { if (SOL[i]) continue; const x = (i % MW) + 0.5, z = ((i / MW) | 0) + 0.5, y = FL[i] + 0.6; let L = G.amb + (SKYC[i] ? 10 : 0);
          for (const lt of G.lights) { const dx = lt.x - x, dy = lt.y - y, dz = lt.z - z, d2 = dx * dx + dy * dy + dz * dz; if (d2 > lt.r * lt.r) continue; const d = Math.sqrt(d2);
            if (d > 0.8 && !losStatic(x, y, z, lt.x, lt.y, lt.z)) continue; L += lt.i * (1 - d / lt.r); }
          cl[i] = clamp(L, 0, 60); }
        LG = new Float32Array((MW + 1) * (MH + 1));
        for (let z = 0; z <= MH; z++) for (let x = 0; x <= MW; x++) { let s = 0, n = 0;
          for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const cx = x + dx, cz = z + dz; if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) continue; const i = cz * MW + cx; if (SOL[i]) continue; s += cl[i]; n++; }
          LG[z * (MW + 1) + x] = n ? s / n : 4; }
      }
      function lightAt(x, z) { const W1 = MW + 1; let gx = x, gz = z; if (gx < 0) gx = 0; if (gz < 0) gz = 0; if (gx > MW - 0.001) gx = MW - 0.001; if (gz > MH - 0.001) gz = MH - 0.001;
        const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = iz * W1 + ix; const a = LG[i] + (LG[i + 1] - LG[i]) * fx, b = LG[i + W1] + (LG[i + W1 + 1] - LG[i + W1]) * fx; return a + (b - a) * fz; }

      // ---------------- dynamic world ----------------
      function floorAt(i) { return FL[i]; }
      function ceilAt(i) { const k = KIND[i]; if (k === K_DOOR || k === K_KEYB || k === K_KEYM || k === 4) { const d = dynAt.get(i); if (d) return d.f + d.open * (d.c - d.f); } return CE[i]; }
      const PRB = { f: 0, c: 0, sol: false, door: null };
      function probe(x, z, r) { const x0 = Math.floor(x - r), x1 = Math.floor(x + r - 1e-4), z0 = Math.floor(z - r), z1 = Math.floor(z + r - 1e-4); let fm = -1e9, cm = 1e9, sol = false, door = null;
        for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) { if (xx < 0 || zz < 0 || xx >= MW || zz >= MH) { sol = true; continue; } const c = zz * MW + xx; if (SOL[c] || BLOCK[c]) { sol = true; continue; }
          const f = FL[c], ce = ceilAt(c); if (f > fm) fm = f; if (ce < cm) cm = ce; if (dynAt.has(c)) door = dynAt.get(c); }
        PRB.f = fm; PRB.c = cm; PRB.sol = sol; PRB.door = door; return PRB; }
      function los(ax, ay, az, bx, by, bz) { const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz), n = Math.ceil(d / 0.15);
        for (let i = 1; i < n; i++) { const t = i / n, x = ax + dx * t, y = ay + dy * t, z = az + dz * t, cx = Math.floor(x), cz = Math.floor(z);
          if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) return false; const c = cz * MW + cx; if (SOL[c] || y < FL[c] || y > ceilAt(c)) return false; } return true; }
      function rayWorld(ox, oy, oz, dx, dy, dz, max) { for (let t = 0.05; t < max; t += 0.05) { const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t, cx = Math.floor(x), cz = Math.floor(z);
          if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) return t; const c = cz * MW + cx; if (SOL[c] || y < FL[c] || y > ceilAt(c)) return t; } return max; }
      function solidPt(x, y, z) { const cx = Math.floor(x), cz = Math.floor(z); if (cx < 0 || cz < 0 || cx >= MW || cz >= MH) return true; const c = cz * MW + cx; return SOL[c] || y < FL[c] || y > ceilAt(c); }
      const cellOf = (x, z) => clamp(Math.floor(z), 0, MH - 1) * MW + clamp(Math.floor(x), 0, MW - 1);

      // ---------------- renderer ----------------
      let EX = 0, EY = 0, EZ = 0, DX = 1, DZ = 0, PXv = 0, PZv = 1, HOR = VH / 2, YAW = 0;
      function wallTex(cell, ncell, upper) {
        const k = KIND[ncell];
        if (!SOL[ncell] && (k === K_DOOR)) return T.DOOR; if (!SOL[ncell] && k === K_KEYB) return T.DOORB; if (!SOL[ncell] && k === K_KEYM) return T.DOORM;
        if (!SOL[ncell] && k === 4) return T[THEMES[TH[ncell]][0]];
        const th = THEMES[TH[cell]]; if (SOL[ncell]) return T[G.corr[cell] ? th[1] : th[0]]; return T[upper ? th[1] : th[1]];
      }
      function drawWall(x, y0, y1, d, u, tex, L) {
        const tx = TEX[tex], tu = ((u * 64) | 0) & 63, sc = d / PROJ; let v = -(EY + (HOR - (y0 + 0.5)) * sc) * 64; const dv = sc * 64;
        let lv = (L - d * FOG + flashL) | 0; if (lv < 0) lv = 0; if (lv > 63) lv = 63; const base = lv << 8;
        for (let y = y0, i = y0 * W + x; y < y1; y++, i += W) { FB[i] = CMAP[base | tx[((((v | 0) & 63)) << 6) | tu]]; ZB[i] = d; v += dv; }
      }
      function drawFlat(x, y0, y1, h, rdx, rdz, tex, ceil) {
        const tx = TEX[tex], hh = (EY - h) * PROJ;
        for (let y = y0, i = y0 * W + x; y < y1; y++, i += W) { const d = hh * RINV[y]; if (!(d > 0)) { FB[i] = 0xff000000; continue; } const wx = EX + rdx * d, wz = EZ + rdz * d;
          let lv = (lightAt(wx, wz) - d * FOG + flashL) | 0; if (lv < 0) lv = 0; if (lv > 63) lv = 63;
          FB[i] = CMAP[(lv << 8) | tx[((((wz * 64) | 0) & 63) << 6) | (((wx * 64) | 0) & 63)]]; ZB[i] = d; }
      }
      function drawSky(x, y0, y1, su) { for (let y = y0, i = y0 * W + x; y < y1; y++, i += W) { let v = (y - HOR + 110) | 0; if (v < 0) v = 0; if (v >= SKYH) v = SKYH - 1; FB[i] = SKY[v * SKYW + su]; ZB[i] = 1e6; } }
      function render3D(px, pz, ey, yaw, pitchPx) {
        EX = px; EZ = pz; EY = ey; YAW = yaw; HOR = VH / 2 + pitchPx; DX = Math.cos(yaw); DZ = Math.sin(yaw); PXv = -DZ; PZv = DX;
        for (let y = 0; y < VH; y++) { const q = (y + 0.5) - HOR; RINV[y] = Math.abs(q) < 0.01 ? (q < 0 ? -100 : 100) : 1 / q; }
        for (let x = 0; x < W; x++) {
          const cam = 2 * (x + 0.5) / W - 1, rdx = DX + PXv * cam, rdz = DZ + PZv * cam;
          let mx = Math.floor(px), mz = Math.floor(pz);
          const ddx = Math.abs(1 / (rdx || 1e-9)), ddz = Math.abs(1 / (rdz || 1e-9));
          let sx, sz, sdx, sdz;
          if (rdx < 0) { sx = -1; sdx = (px - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - px) * ddx; }
          if (rdz < 0) { sz = -1; sdz = (pz - mz) * ddz; } else { sz = 1; sdz = (mz + 1 - pz) * ddz; }
          let top = 0, bot = VH, cell = mz * MW + mx;
          const su = ((((yaw + Math.atan(cam)) / TAU) * 1024) | 0) & 255;
          if (cell < 0 || cell >= MW * MH || SOL[cell]) { for (let y = 0; y < VH; y++) { FB[y * W + x] = 0xff000000; ZB[y * W + x] = 0.01; } continue; }
          for (let it = 0; it < 96; it++) {
            let far, side; if (sdx < sdz) { far = sdx; side = 0; } else { far = sdz; side = 1; }
            if (far < 0.01) far = 0.01;
            const f = FL[cell], c = ceilAt(cell), sky = SKYC[cell], th = THEMES[TH[cell]];
            let yce = Math.ceil(HOR - (c - ey) * PROJ / far - 0.5); if (yce > bot) yce = bot;
            if (yce > top) { if (sky) drawSky(x, top, yce, su); else drawFlat(x, top, yce, c, rdx, rdz, T[th[3]], true); top = yce; }
            let yfs = Math.ceil(HOR - (f - ey) * PROJ / far - 0.5); if (yfs < top) yfs = top;
            if (yfs < bot) { const k = KIND[cell]; drawFlat(x, yfs, bot, f, rdx, rdz, k === K_WATER ? T.WATER : k === K_BRIM ? T.BRIM : T[th[2]], false); bot = yfs; }
            if (top >= bot) break;
            if (side === 0) { sdx += ddx; mx += sx; } else { sdz += ddz; mz += sz; }
            if (mx < 0 || mz < 0 || mx >= MW || mz >= MH) { for (let y = top; y < bot; y++) FB[y * W + x] = 0xff000000; break; }
            const nc = mz * MW + mx;
            let hit = side === 0 ? pz + far * rdz : px + far * rdx; let u = hit - Math.floor(hit); if ((side === 0 && rdx < 0) || (side === 1 && rdz > 0)) u = 1 - u;
            const L = lightAt(px + far * rdx, pz + far * rdz) * (side ? 0.92 : 1);
            if (SOL[nc]) { drawWall(x, top, bot, far, u, wallTex(cell, nc), L); top = bot; break; }
            const nf = FL[nc], ncc = ceilAt(nc);
            const isDoor = dynAt.has(nc);
            if (ncc < c && (isDoor || !(sky && SKYC[nc]))) { let y2 = Math.ceil(HOR - (ncc - ey) * PROJ / far - 0.5); if (y2 > bot) y2 = bot; if (y2 > top) { drawWall(x, top, y2, far, u, wallTex(cell, nc, true), L); top = y2; } }
            if (nf > f) { let y1 = Math.ceil(HOR - (nf - ey) * PROJ / far - 0.5); if (y1 < top) y1 = top; if (y1 < bot) { drawWall(x, y1, bot, far, u, T[th[1]], L * 0.85); bot = y1; } }
            if (top >= bot) break;
            cell = nc;
          }
          for (let y = top; y < bot; y++) { FB[y * W + x] = 0xff000000; ZB[y * W + x] = 1e6; }
        }
      }
      // sprites
      const SPQ = [];
      function queueSprite(img, x, y, z, h, light, opt) { const rx = x - EX, rz = z - EZ, depth = rx * DX + rz * DZ; if (depth < 0.12) return; SPQ.push({ img, x, y, z, h, light, opt: opt || 0, depth, lat: rx * PXv + rz * PZv }); }
      function drawSprites() {
        SPQ.sort((a, b) => b.depth - a.depth);
        for (const s of SPQ) {
          const img = s.img, d = s.depth, sxc = 160 * (1 + s.lat / d), hp = s.h * PROJ / d, wp = hp * img.w / img.h;
          const ytop = HOR - (s.y + s.h - EY) * PROJ / d, x0 = Math.round(sxc - wp / 2), x1 = Math.round(sxc + wp / 2), y0 = Math.round(ytop), y1 = Math.round(ytop + hp);
          if (x1 < 0 || x0 >= W || y1 < 0 || y0 >= VH) continue;
          let lv = (s.light - d * FOG + flashL) | 0; if (s.opt & 4) lv = 40; if (lv < 0) lv = 0; if (lv > 63) lv = 63; const base = lv << 8;
          const flip = s.opt & 1, ghost = s.opt & 2, fade = s.opt >> 8;
          const xa = Math.max(0, x0), xb = Math.min(W, x1), ya = Math.max(0, y0), yb = Math.min(VH, y1), ku = img.w / (x1 - x0), kv = img.h / (y1 - y0);
          for (let x = xa; x < xb; x++) { let u = ((x - x0 + 0.5) * ku) | 0; if (u >= img.w) u = img.w - 1; if (flip) u = img.w - 1 - u;
            for (let y = ya, i = ya * W + x; y < yb; y++, i += W) { if (ZB[i] <= d) continue; if (fade && ((x + y) & 3) < fade) continue; let v = ((y - y0 + 0.5) * kv) | 0; if (v >= img.h) v = img.h - 1;
              const c = img.d[v * img.w + u]; if (!c) continue; const col = CMAP[base | c];
              if (ghost) { const o = FB[i]; FB[i] = ((((o & 0xfefefe) >>> 1) + ((col & 0xfefefe) >>> 1)) | 0xff000000) >>> 0; } else FB[i] = col; } }
        }
        SPQ.length = 0;
      }
      function point(x, y, z, col, size) { const rx = x - EX, rz = z - EZ, d = rx * DX + rz * DZ; if (d < 0.1) return; const sx = (160 * (1 + (rx * PXv + rz * PZv) / d)) | 0, sy = (HOR - (y - EY) * PROJ / d) | 0;
        const s = Math.max(1, Math.round(size * PROJ / d)); for (let yy = Math.max(0, sy - (s >> 1)); yy < Math.min(VH, sy - (s >> 1) + s); yy++) for (let xx = Math.max(0, sx - (s >> 1)); xx < Math.min(W, sx - (s >> 1) + s); xx++) { const i = yy * W + xx; if (ZB[i] > d) FB[i] = col; } }

      // ---------------- 2D helpers ----------------
      function rectF(x, y, w, h, col) { x |= 0; y |= 0; const x0 = Math.max(0, x), x1 = Math.min(W, x + w), y0 = Math.max(0, y), y1 = Math.min(H, y + h); if (x1 <= x0) return; for (let yy = y0; yy < y1; yy++) FB.fill(col, yy * W + x0, yy * W + x1); }
      function txt(s, x, y, col, sc, grad) { sc = sc || 1; s = String(s).toUpperCase(); x |= 0; y |= 0;
        for (let i = 0; i < s.length; i++) { const g = FONT[s[i]]; if (!g) continue; for (let r = 0; r < 7; r++) { const bits = g[r]; if (!bits) continue; const c = grad ? grad(r) : col; for (let q = 0; q < 5; q++) if (bits & (16 >> q)) rectF(x + (i * 6 + q) * sc, y + r * sc, sc, sc, c); } } }
      const tw = (s, sc) => (String(s).length * 6 - 1) * (sc || 1);
      function txtC(s, y, col, sc, grad) { txt(s, (W - tw(s, sc)) >> 1, y, col, sc, grad); }
      function txtSh(s, x, y, col, sc) { txt(s, x + 1, y + 1, RGB(0, 0, 0), sc); txt(s, x, y, col, sc); }
      function txtCS(s, y, col, sc) { txtSh(s, (W - tw(s, sc)) >> 1, y, col, sc); }
      function darken(y0, y1, k) { for (let i = y0 * W; i < y1 * W; i++) { const c = FB[i]; FB[i] = (0xff000000 | ((((c >> 16) & 255) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k)) >>> 0; } }
      function tint(r, g, b, a) { const ia = 1 - a, R = r * a, Gc = g * a, B = b * a; for (let i = 0; i < W * VH; i++) { const c = FB[i];
        FB[i] = (0xff000000 | (((((c >> 16) & 255) * ia + B) | 0) << 16) | (((((c >> 8) & 255) * ia + Gc) | 0) << 8) | (((c & 255) * ia + R) | 0)) >>> 0; } }
      function blit(img, x, y, lv, flipX) { lv = clamp(lv | 0, 0, 63); const base = lv << 8; x |= 0; y |= 0;
        for (let j = 0; j < img.h; j++) { const yy = y + j; if (yy < 0 || yy >= VH) continue; for (let i = 0; i < img.w; i++) { const xx = x + i; if (xx < 0 || xx >= W) continue; const c = img.d[j * img.w + (flipX ? img.w - 1 - i : i)]; if (c) FB[yy * W + xx] = CMAP[base | c]; } } }

      // ---------------- sound ----------------
      const sfx = {
        fork() { A.noise(0.12, { vol: 0.1, freq: 2200, slideTo: 600 }); },
        stab() { A.tone(160, 0.06, { type: 'square', vol: 0.12, slideTo: 80 }); },
        flare() { A.tone(700, 0.25, { type: 'sawtooth', vol: 0.08, slideTo: 200 }); A.noise(0.25, { vol: 0.1, freq: 3000, slideTo: 800 }); },
        shot() { A.noise(0.22, { vol: 0.24, freq: 1500, slideTo: 250 }); A.tone(85, 0.14, { type: 'square', vol: 0.1, slideTo: 40 }); },
        dbl() { A.noise(0.35, { vol: 0.28, freq: 1200, slideTo: 150 }); A.tone(60, 0.25, { type: 'sawtooth', vol: 0.14, slideTo: 28 }); },
        tommy() { A.noise(0.05, { vol: 0.13, freq: 2600, slideTo: 900 }); A.tone(130, 0.04, { type: 'square', vol: 0.06 }); },
        toss() { A.noise(0.15, { vol: 0.06, freq: 1200 }); A.tone(900, 0.4, { type: 'sine', vol: 0.03, slideTo: 1100 }); },
        boom() { A.noise(0.9, { vol: 0.3, freq: 700, slideTo: 50 }); A.tone(58, 0.6, { type: 'sine', vol: 0.22, slideTo: 24 }); },
        pin() { A.tone(1800, 0.05, { type: 'triangle', vol: 0.1 }); A.tone(240, 0.2, { type: 'sawtooth', vol: 0.06, slideTo: 120, delay: 0.04 }); },
        ouch() { A.tone(520, 0.08, { type: 'square', vol: 0.12, slideTo: 700 }); A.tone(380, 0.12, { type: 'square', vol: 0.1, delay: 0.08 }); },
        pick() { A.tone(660, 0.05, { type: 'triangle', vol: 0.11 }); A.tone(990, 0.08, { type: 'triangle', vol: 0.1, delay: 0.05 }); },
        weapon() { A.melody([[196, 0.08], [247, 0.08], [294, 0.08], [392, 0.18]], { type: 'square', vol: 0.1 }); },
        key() { A.melody([[523, 0.1], [494, 0.1], [523, 0.1], [784, 0.2]], { type: 'triangle', vol: 0.13 }); },
        power() { A.melody([[147, 0.12], [175, 0.12], [208, 0.12], [294, 0.35]], { type: 'sawtooth', vol: 0.1 }); },
        door() { A.noise(0.6, { vol: 0.07, freq: 300 }); A.tone(70, 0.5, { type: 'triangle', vol: 0.06, slideTo: 110 }); },
        creak() { A.tone(340, 0.5, { type: 'sawtooth', vol: 0.04, slideTo: 210 }); },
        locked() { A.tone(150, 0.2, { type: 'square', vol: 0.12 }); A.tone(120, 0.25, { type: 'square', vol: 0.12, delay: 0.18 }); },
        hurt() { A.tone(170, 0.16, { type: 'sawtooth', vol: 0.14, slideTo: 90 }); },
        die() { A.melody([[392, 0.2], [370, 0.2], [349, 0.2], [330, 0.6]], { type: 'sawtooth', vol: 0.12 }); },
        jump() { A.tone(200, 0.08, { type: 'triangle', vol: 0.06, slideTo: 320 }); },
        chant() { const b = [220, 233, 196][(Math.random() * 3) | 0]; A.tone(b, 0.35, { type: 'sawtooth', vol: 0.06 }); A.tone(b * 1.5, 0.35, { type: 'triangle', vol: 0.04, delay: 0.12 }); },
        moan() { A.tone(110, 0.7, { type: 'sine', vol: 0.12, slideTo: 80 }); A.tone(113, 0.7, { type: 'sine', vol: 0.06 }); },
        growl() { A.noise(0.4, { vol: 0.1, freq: 400, slideTo: 200 }); A.tone(70, 0.4, { type: 'sawtooth', vol: 0.08 }); },
        screech() { A.tone(1200, 0.4, { type: 'sawtooth', vol: 0.07, slideTo: 600 }); },
        wail() { A.tone(600, 1.0, { type: 'sine', vol: 0.08, slideTo: 900 }); A.tone(606, 1.0, { type: 'sine', vol: 0.05, slideTo: 300 }); },
        laugh() { for (let k = 0; k < 4; k++) A.tone(160 - k * 10, 0.12, { type: 'sawtooth', vol: 0.12, delay: k * 0.15, slideTo: 120 - k * 10 }); },
        mpain() { A.tone(260, 0.09, { type: 'square', vol: 0.07, slideTo: 140 }); },
        mdie() { A.tone(200, 0.45, { type: 'sawtooth', vol: 0.1, slideTo: 50 }); },
        mshot() { A.noise(0.15, { vol: 0.15, freq: 1400, slideTo: 300 }); },
        burn() { A.noise(0.4, { vol: 0.07, freq: 1800, slideTo: 600 }); },
        secret() { A.melody([[330, 0.1], [415, 0.1], [494, 0.1], [659, 0.25]], { type: 'triangle', vol: 0.12 }); }
      };
      const SIGHT = { acolyte: 'chant', zealot: 'chant', zombie: 'moan', hound: 'growl', gargoyle: 'screech', specter: 'wail', baron: 'laugh' };
      let musT = 1, musI = 0;
      const ORGAN = [[110, 147, 175], [104, 139, 165], [98, 131, 156], [104, 123, 165]];
      function music(dt) { musT -= dt; if (musT > 0) return; musT = 3.2; const ch = ORGAN[musI++ % 4];
        for (const f of ch) A.tone(f, 3.0, { type: 'triangle', vol: 0.025, attack: 0.6 }); if (Math.random() < 0.4) A.tone(ch[2] * 4, 0.5, { type: 'sine', vol: 0.02, delay: 1.5 }); }

      // ---------------- state ----------------
      let state = 'title', stT = 0, score = 0, hi = api.getHiScore(25000), lives = 3, nextLife = 30000, coinFlash = 0, god = false;
      let P = null, snapshot = null, msg = '', msgT = 0, flashR = 0, shake = 0, interStats = null, deadT = 0, lastMX = null, lastMY = null, demoPath = null, demoT = 0, demoYaw = null;
      const QUIPS = ['I DIG THIS JOB.', 'REST IN PIECES.', 'NOTHING PERSONAL. JUST BUSINESS.', 'CLOSED CASKET, I THINK.', 'ANOTHER SATISFIED CUSTOMER.', 'SIX FEET UNDER, SIR.', 'HOLD STILL. I MEASURE FOR FREE.'];
      function newPlayer() { return { r: PR, h: PHT, x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, ground: true, hp: 100, armor: 0, ammo: { f: 12, s: 0, b: 0, d: 0, p: 0 },
        wpn: [true, true, false, false, false, false], cur: 1, cool: 0, keys: {}, charm: 0, wrath: 0, bob: 0, kick: 0, eyeOff: 0, turn: 0, dead: false, painT: 0, barrel: 0, quipT: 0 }; }
      function loadLevel(idx, forDemo) {
        levelIdx = idx; G = buildGrid(idx); MW = G.mw; MH = G.mh; SOL = G.sol; FL = G.fl; CE = G.ce; SKYC = G.sky; KIND = G.kind; TH = G.th; BLOCK = new Uint8Array(MW * MH);
        doors = []; dynAt = new Map(); mons = []; items = []; projs = []; parts = []; decor = [];
        for (let i = 0; i < MW * MH; i++) { const k = KIND[i]; if (SOL[i]) continue;
          if (k === K_DOOR || k === K_KEYB || k === K_KEYM || k === 4) { const d = { i, x: (i % MW) + 0.5, z: ((i / MW) | 0) + 0.5, f: FL[i], c: CE[i], open: 0, st: 0, t: 0, kind: k }; doors.push(d); dynAt.set(i, d); } }
        bakeLights();
        kills = 0; totalMons = 0; secretsFound = 0; levelTime = 0; exitOn = G.exit ? { x: G.exit.x, z: G.exit.z } : null;
        for (const e of G.ents) { const ci = cellOf(e.x, e.z);
          if (e.t === 'mon') spawnMon(e.k, e.x, e.z, e.yaw || 0);
          else if (e.t === 'item') items.push({ k: e.k, x: e.x, z: e.z, y: FL[ci], ph: Math.random() * TAU });
          else if (e.t === 'decor') { decor.push({ k: e.k, x: e.x, z: e.z, y: FL[ci] + (e.k === 'lantern' ? 1.1 : e.k.indexOf('balloon') === 0 ? 0.6 : 0), h: e.h, b: e.b, tnt: e.tnt, hp: 15, ph: Math.random() * TAU }); if (e.b) BLOCK[ci] = 1; } }
        flow = null; flowT = 0;
        if (!forDemo) { P.x = G.start.x; P.z = G.start.z; P.y = FL[cellOf(P.x, P.z)]; P.yaw = G.start.yaw; P.pitch = 0; P.vx = P.vz = P.vy = 0; P.keys = {}; P.dead = false; P.eyeOff = 0; P.ground = true; deadT = 0;
          snapshot = { hp: Math.max(P.hp, 100), armor: P.armor, ammo: Object.assign({}, P.ammo), wpn: P.wpn.slice(), cur: P.cur }; msg = G.name; msgT = 3; }
      }
      function spawnMon(k, x, z, yaw) { const t = MT[k], ci = cellOf(x, z);
        const m = { k, x, z, y: t.fly ? FL[ci] + 0.7 : FL[ci], vy: 0, yaw, hp: t.hp, st: 'idle', tm: 0, cd: 1 + Math.random(), ph: Math.random() * 10, fall: 0, flash: 0, r: t.r, h: t.h, los: false, losT: (Math.random() * 10) | 0, fly: !!t.fly, burn: 0, revive: 0, revived: false, sumT: 10, tele: 6 };
        mons.push(m); totalMons++; return m; }
      function restoreSnapshot() { P.hp = snapshot.hp; P.armor = snapshot.armor; P.ammo = Object.assign({}, snapshot.ammo); P.wpn = snapshot.wpn.slice(); P.cur = snapshot.cur; P.charm = P.wrath = 0; P.ammo.f = Math.max(P.ammo.f, 8); }
      function startGame() { score = 0; lives = 3; nextLife = 30000; P = newPlayer(); loadLevel(0); state = 'play'; stT = 0; A.melody([[147, 0.3], [139, 0.3], [131, 0.3], [98, 0.8]], { type: 'triangle', vol: 0.12 }); }
      function addScore(n) { score += n; if (score >= nextLife) { nextLife += 50000; lives++; say('EXTRA LIFE!'); sfx.power(); } if (score > hi) hi = score; }
      function say(s, t) { msg = s; msgT = t || 2.2; }
      function quip() { if (P.quipT > 0) return; P.quipT = 9; say(QUIPS[(Math.random() * QUIPS.length) | 0], 2); }

      function computeFlow() { const N = MW * MH; if (!flow) flow = new Int16Array(N); flow.fill(-1); const pc = cellOf(P.x, P.z), q = new Int32Array(N); let h = 0, t = 0; q[t++] = pc; flow[pc] = 0;
        while (h < t) { const i = q[h++], fi = FL[i]; for (let d = 0; d < 4; d++) { const j = i + DIRS[d][0] + DIRS[d][1] * MW; if (j < 0 || j >= N || flow[j] >= 0 || SOL[j] || BLOCK[j]) continue;
            const k = KIND[j]; if (k === 4 || k === K_KEYB || k === K_KEYM) continue; if (fi > FL[j] + STEP + 0.01) continue; flow[j] = flow[i] + 1; q[t++] = j; } } }
      function tryMove(e, nx, nz, step) { const pr = probe(nx, nz, e.r); if (pr.sol) return false;
        if (pr.door && pr.c - Math.max(pr.f, e.y) < e.h) { if (e === P) touchDoor(pr.door); else if (pr.door.kind === K_DOOR) openDoor(pr.door); return false; }
        if (e.fly) { if (pr.f > e.y - 0.05 || pr.c < e.y + e.h) return false; } else { if (pr.f > e.y + step) return false; if (pr.c - Math.max(pr.f, e.y) < e.h) return false; }
        e.x = nx; e.z = nz; return true; }
      function moveEnt(e, dx, dz, step) { let m = false; if (dx && tryMove(e, e.x + dx, e.z, step)) m = true; if (dz && tryMove(e, e.x, e.z + dz, step)) m = true; return m; }
      function openDoor(d) { if (d.st !== 1 && d.open < 1) { d.st = 1; sfx.door(); } d.t = 3.5; }
      function touchDoor(d) {
        if (d.kind === K_KEYB && !P.keys.b) { if (msgT <= 0 || msg.indexOf('KEY') < 0) { say('THIS DOOR NEEDS THE BONE KEY'); sfx.locked(); } return; }
        if (d.kind === K_KEYM && !P.keys.m) { if (msgT <= 0 || msg.indexOf('KEY') < 0) { say('THIS DOOR NEEDS THE MOON KEY'); sfx.locked(); } return; }
        if (d.kind === 4 && d.st === 0 && d.open === 0) { secretsFound++; addScore(500); say('A SECRET! HOW MORBID.'); sfx.secret(); }
        openDoor(d); }
      function updateDoors(dt) { for (const d of doors) {
        const near = Math.abs(P.x - d.x) < 1.5 && Math.abs(P.z - d.z) < 1.5;
        if (near && (d.kind === K_DOOR || (d.kind === K_KEYB && P.keys.b) || (d.kind === K_KEYM && P.keys.m))) openDoor(d);
        if (d.st === 1) { d.open = Math.min(1, d.open + dt * 1.3); if (d.open >= 1) d.st = 2; }
        else if (d.st === 2) { d.t -= dt; if (d.t <= 0 && d.kind !== 4) { const occ = (Math.abs(P.x - d.x) < 0.8 && Math.abs(P.z - d.z) < 0.8) || mons.some(m => m.st !== 'dead' && Math.abs(m.x - d.x) < 0.8 && Math.abs(m.z - d.z) < 0.8); if (!occ) { d.st = 3; sfx.creak(); } else d.t = 1; } }
        else if (d.st === 3) { d.open = Math.max(0, d.open - dt * 1.3); if (Math.abs(P.x - d.x) < 0.8 && Math.abs(P.z - d.z) < 0.8) d.st = 1; if (d.open <= 0) d.st = 0; } } }

      function spark(x, y, z, n, col, spd, life, grav) { for (let k = 0; k < n && parts.length < 600; k++) parts.push({ x, y, z, vx: (Math.random() - .5) * spd, vy: (Math.random() - .3) * spd, vz: (Math.random() - .5) * spd, t: life * (0.5 + Math.random() * 0.5), col, g: grav == null ? 6 : grav, s: 0.03 }); }
      function smoke(x, y, z) { parts.push({ x, y, z, vx: (Math.random() - .5) * .3, vy: 0.5, vz: (Math.random() - .5) * .3, t: 0.8, col: COL(10, 4 + ((Math.random() * 3) | 0)), g: 0, s: 0.08, grow: 0.15 }); }
      function explode(x, y, z, dmg, rad, owner) {
        sfx.boom(); shake = Math.max(shake, 0.5); flashL = Math.max(flashL, 14);
        for (let k = 0; k < 40; k++) spark(x, y, z, 1, [COL(12, 15), COL(8, 13), COL(8, 10), COL(7, 14), COL(10, 5)][k % 5], 5, 0.8, 2);
        for (let k = 0; k < 10; k++) parts.push({ x: x + (Math.random() - .5) * .5, y: y + Math.random() * .3, z: z + (Math.random() - .5) * .5, vx: 0, vy: 0.6, vz: 0, t: 0.6, col: COL(8, 13), g: 0, s: 0.2, grow: 0.6 });
        for (const m of mons) { if (m.st === 'dead' || m === owner) continue; const d = Math.hypot(m.x - x, m.y + m.h / 2 - y, m.z - z) - m.r * 0.5; if (d < rad && los(x, y + 0.1, z, m.x, m.y + m.h / 2, m.z)) hurtMon(m, dmg * (1 - Math.max(0, d) / rad), 'blast'); }
        for (const b of decor) { if (b.tnt && b.hp > 0 && Math.hypot(b.x - x, b.z - z) < rad) { b.hp = 0; b.fuse = 0.25; } }
        if (P && !P.dead && state === 'play') { const dx = P.x - x, dy = P.y + 0.45 - y, dz = P.z - z, d = Math.hypot(dx, dy, dz); if (d < rad) { const k = (1 - d / rad) * dmg, inv = 1 / (d || 0.01), kb = k * 0.06;
            P.vx += dx * inv * kb; P.vz += dz * inv * kb; P.vy += Math.max(0, dy * inv * kb); if (P.vy > 0) P.ground = false; hurtPlayer(owner === P ? k * 0.6 : k); } }
      }
      function hurtPlayer(d) { if (god || P.dead || state !== 'play' || P.charm > 0) return; const save = Math.min(P.armor, Math.ceil(d * 0.5)); P.armor -= save; d -= save;
        P.hp -= Math.ceil(d); flashR = Math.min(0.6, flashR + d * 0.02 + 0.1); if (P.painT <= 0) { sfx.hurt(); P.painT = 0.4; } if (P.hp <= 0) { P.hp = 0; P.dead = true; deadT = 0; sfx.die(); } }
      function hurtMon(m, dmg, type) {
        if (m.st === 'dead') return; if (P.wrath > 0) dmg *= 3; m.hp -= dmg; m.flash = 0.12; if (m.st === 'idle') wake(m);
        if (type === 'fire' && m.k !== 'specter') { m.burn = 4; }
        if (m.hp <= 0) { m.st = 'dead'; m.fall = 0; kills++; addScore(MT[m.k].score); sfx.mdie(); m.burn = 0;
          if (m.k === 'zombie' && !m.revived && type !== 'fire' && type !== 'blast' && Math.random() < 0.6) m.revive = 3.5;
          spark(m.x, m.y + m.h * 0.6, m.z, 10, m.k === 'specter' ? COL(13, 13) : COL(10, 6), 2, 0.6, 3);
          if (m.k === 'acolyte' && Math.random() < 0.6) items.push({ k: 'shells', x: m.x, z: m.z, y: FL[cellOf(m.x, m.z)], ph: 0, small: 1 });
          if (m.k === 'zealot' && Math.random() < 0.5) items.push({ k: 'dyna', x: m.x, z: m.z, y: FL[cellOf(m.x, m.z)], ph: 0, small: 1 });
          if (m.k === 'baron') bossDown(m); else if (Math.random() < 0.25) quip(); return; }
        if (m.k !== 'baron' && Math.random() < Math.min(0.7, dmg / MT[m.k].hp * 2 + 0.1) && m.st !== 'atk') { m.st = 'pain'; m.tm = 0.25; sfx.mpain(); }
      }
      function wake(m) { if (m.st === 'idle') { m.st = 'chase'; sfx[SIGHT[m.k]](); m.cd = 0.5 + Math.random(); } }
      function rayMon(ox, oy, oz, dx, dy, dz, max) { let best = null, bt = max;
        for (const m of mons) { if (m.st === 'dead') continue; const x0 = m.x - m.r, x1 = m.x + m.r, y0 = m.y, y1 = m.y + m.h, z0 = m.z - m.r, z1 = m.z + m.r; let tmin = 0, tmax = bt;
          for (const [o, d, a, b] of [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]]) { if (Math.abs(d) < 1e-9) { if (o < a || o > b) { tmin = 1e9; break; } continue; }
            let t1 = (a - o) / d, t2 = (b - o) / d; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) break; }
          if (tmin <= tmax && tmin < bt) { bt = tmin; best = m; } }
        for (const b of decor) { if (!b.tnt || b.hp <= 0) continue; const dx2 = b.x - ox, dz2 = b.z - oz, t = dx2 * dx + dz2 * dz; if (t < 0 || t > bt) continue; const px = ox + dx * t - b.x, pz = oz + dz * t - b.z, py = oy + dy * t - b.y;
          if (px * px + pz * pz < 0.09 && py > 0 && py < 0.6) { bt = t; best = b; } }
        return best ? { m: best, t: bt } : null; }
      function damageAny(o, dmg, type) { if (o.tnt !== undefined && o.k === 'barrel') { o.hp -= dmg; if (o.hp <= 0 && !o.fuse) o.fuse = 0.15; } else hurtMon(o, dmg, type); }
      function findTarget(maxA, maxD) { let best = null, ba = maxA; const ex = P.x, ey = P.y + EYE, ez = P.z;
        for (const m of mons) { if (m.st === 'dead') continue; const dx = m.x - ex, dz = m.z - ez, d = Math.hypot(dx, dz); if (d > maxD) continue; let a = Math.atan2(dz, dx) - P.yaw; while (a > PI) a -= TAU; while (a < -PI) a += TAU;
          const tol = Math.abs(a) - Math.atan2(m.r, d); if (tol < ba && los(ex, ey, ez, m.x, m.y + m.h * 0.5, m.z)) { ba = tol; best = m; } }
        return best; }
      function aimDir(spread) { const best = findTarget(0.13, 30); let pitch = -P.pitch / PROJ;
        if (best && Math.abs(P.pitch) < 40) { const dx = best.x - P.x, dz = best.z - P.z; pitch = Math.atan2(best.y + best.h * 0.55 - (P.y + EYE), Math.hypot(dx, dz)); }
        const cp = Math.cos(pitch); return [Math.cos(P.yaw) * cp, Math.sin(pitch), Math.sin(P.yaw) * cp]; }
      function hitscan(n, spr, dmg, range) { const [dx, dy, dz] = aimDir(), ox = P.x, oy = P.y + EYE - 0.08, oz = P.z, rx = -Math.sin(P.yaw), rz = Math.cos(P.yaw);
        for (let k = 0; k < n; k++) { const sx = (Math.random() - .5) * 2 * spr, sy = (Math.random() - .5) * spr; let ddx = dx + rx * sx, ddy = dy + sy, ddz = dz + rz * sx; const nn = 1 / Math.hypot(ddx, ddy, ddz); ddx *= nn; ddy *= nn; ddz *= nn;
          const twd = rayWorld(ox, oy, oz, ddx, ddy, ddz, range), hit = rayMon(ox, oy, oz, ddx, ddy, ddz, twd);
          if (hit) { damageAny(hit.m, dmg, 'normal'); spark(ox + ddx * hit.t, oy + ddy * hit.t, oz + ddz * hit.t, 2, COL(10, 6), 1.5, 0.3); }
          else if (twd < range) { spark(ox + ddx * (twd - 0.04), oy + ddy * (twd - 0.04), oz + ddz * (twd - 0.04), 2, COL(7, 12), 1.5, 0.25); if (Math.random() < 0.3) smoke(ox + ddx * (twd - 0.05), oy + ddy * (twd - 0.05), oz + ddz * (twd - 0.05)); } } }
      function fire(alt) {
        const w = WPN[P.cur]; if (P.cool > 0) return; const need = alt ? ({ 1: 3, 2: 2, 3: 3, 4: 1, 5: 10 }[P.cur] || 0) : (w.ammo ? 1 : 0);
        if (w.ammo && P.ammo[w.ammo] < need) { if (alt && P.ammo[w.ammo] >= 1) return fire(false); autoSwitch(); return; }
        if (w.ammo) P.ammo[w.ammo] -= need; P.cool = w.rate; noise = { x: P.x, z: P.z, t: 0.3 };
        const ox = P.x, oy = P.y + EYE - 0.1, oz = P.z;
        if (P.cur === 0) { P.kick = 1; sfx.fork(); const [dx, dy, dz] = aimDir(); const hit = rayMon(ox, oy, oz, dx, dy, dz, 1.2); if (hit) { damageAny(hit.m, alt ? 26 : 18, 'normal'); sfx.stab(); } return; }
        P.kick = 1;
        if (P.cur === 1) { sfx.flare(); flashL = Math.max(flashL, 8); const [dx, dy, dz] = aimDir(); const n = alt ? 3 : 1;
          for (let k = 0; k < n; k++) { const a = (k - (n - 1) / 2) * 0.12, c = Math.cos(a), s = Math.sin(a); const vx = dx * c - dz * s, vz = dx * s + dz * c; projs.push({ k: 'flare', x: ox, y: oy, z: oz, vx: vx * 14, vy: dy * 14, vz: vz * 14, life: 3, own: P, dmg: 10 }); } return; }
        if (P.cur === 2) { flashL = Math.max(flashL, 12); if (alt) { sfx.dbl(); hitscan(14, 0.1, 5, 30); P.cool = 1.0; P.barrel = 0; } else { sfx.shot(); hitscan(7, 0.07, 5, 30); P.barrel++; if (P.barrel >= 2) { P.barrel = 0; P.cool = 0.95; } } return; }
        if (P.cur === 3) { flashL = Math.max(flashL, 6); sfx.tommy(); if (alt) { hitscan(3, 0.12, 6, 30); P.cool = 0.12; } else hitscan(1, 0.03, 6, 30); return; }
        if (P.cur === 4) { sfx.toss(); const [dx, dy, dz] = aimDir(); const sp = alt ? 11 : 7.5; projs.push({ k: 'dyna', x: ox + dx * 0.3, y: oy, z: oz + dz * 0.3, vx: dx * sp + P.vx * 0.4, vy: dy * sp + 2.6, vz: dz * sp + P.vz * 0.4, life: alt ? 1.4 : 2.1, own: P, dmg: 120 }); return; }
        if (P.cur === 5) { sfx.pin();
          if (alt) { let n = 0; for (const m of mons) { if (m.st === 'dead') continue; const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < 14 && los(P.x, P.y + EYE, P.z, m.x, m.y + m.h / 2, m.z)) { hurtMon(m, 35, 'hex'); spark(m.x, m.y + m.h * 0.7, m.z, 8, COL(6, 14), 2, 0.5, 0); n++; } } flashL = 16; if (!n) say('THE POPPET GIGGLES.'); }
          else { const t = findTarget(0.2, 40); if (t) { hurtMon(t, 14, 'hex'); t.st = t.st === 'dead' ? 'dead' : 'pain'; t.tm = 0.3; spark(t.x, t.y + t.h * 0.8, t.z, 6, COL(6, 14), 1.5, 0.4, 0); } else { sfx.ouch(); if (!god) { P.hp = Math.max(1, P.hp - 2); flashR = 0.2; } say('OUCH! WRONG END.'); } }
        }
      }
      function hasAmmo(i) { const w = WPN[i]; return !w.ammo || P.ammo[w.ammo] >= 1; }
      function autoSwitch() { for (const i of [3, 2, 1, 0]) if (P.wpn[i] && hasAmmo(i)) { if (P.cur !== i) { P.cur = i; P.cool = 0.3; } return; } }
      function cycleWeapon() { for (let k = 1; k <= 6; k++) { const i = (P.cur + k) % 6; if (P.wpn[i] && hasAmmo(i)) { P.cur = i; P.cool = Math.max(P.cool, 0.25); sfx.pick(); return; } } }
      function updateProjs(dt) {
        for (let k = projs.length - 1; k >= 0; k--) { const p = projs[k]; p.life -= dt; let dead = p.life <= 0;
          for (let s = 0; s < 3 && !dead; s++) { const h = dt / 3; if (p.k === 'dyna' || p.k === 'bottle' || p.k === 'fireball') p.vy -= GRAV * 0.75 * h;
            const nx = p.x + p.vx * h, ny = p.y + p.vy * h, nz = p.z + p.vz * h;
            if (solidPt(nx, ny, nz)) { if (p.k === 'dyna') { if (solidPt(p.x, ny, p.z)) { p.vy = -p.vy * 0.35; p.vx *= 0.6; p.vz *= 0.6; } else if (solidPt(nx, p.y, p.z)) p.vx = -p.vx * 0.5; else p.vz = -p.vz * 0.5; continue; }
              dead = true; if (p.k === 'bottle' || p.k === 'fireball') explode(p.x, p.y, p.z, p.dmg, 1.5, p.own); else spark(p.x, p.y, p.z, 6, COL(12, 14), 2, 0.4); break; }
            p.x = nx; p.y = ny; p.z = nz;
            if (p.own === P) { for (const m of mons) { if (m.st === 'dead') continue; if (Math.abs(m.x - p.x) < m.r + 0.08 && Math.abs(m.z - p.z) < m.r + 0.08 && p.y > m.y && p.y < m.y + m.h) {
                  dead = true; if (p.k === 'dyna') explode(p.x, p.y, p.z, p.dmg, 2.2, P); else { hurtMon(m, p.dmg, 'fire'); sfx.burn(); } break; } } }
            else if (!P.dead && Math.abs(P.x - p.x) < PR + 0.1 && Math.abs(P.z - p.z) < PR + 0.1 && p.y > P.y && p.y < P.y + PHT) { dead = true; if (p.k === 'bottle' || p.k === 'fireball') explode(p.x, p.y, p.z, p.dmg, 1.5, p.own); else hurtPlayer(p.dmg); }
          }
          if (dead && p.k === 'dyna') explode(p.x, p.y, p.z, p.dmg, 2.2, p.own);
          if (p.k === 'dyna' && Math.random() < 0.6) parts.push({ x: p.x, y: p.y + 0.06, z: p.z, vx: 0, vy: 0.5, vz: 0, t: 0.2, col: COL(12, 15), g: 0, s: 0.02 });
          if ((p.k === 'flare' || p.k === 'fireball' || p.k === 'bottle') && Math.random() < 0.8) parts.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0.2, vz: 0, t: 0.35, col: COL(8, 12 + ((Math.random() * 3) | 0)), g: 0, s: p.k === 'fireball' ? 0.12 : 0.04, grow: 0.1 });
          if (dead) { projs[k] = projs[projs.length - 1]; projs.pop(); } }
      }

      // ---------------- monsters ----------------
      function gravityEnt(m, dt) { const pr = probe(m.x, m.z, m.r); m.vy -= GRAV * dt; m.y += m.vy * dt; if (m.y <= pr.f) { m.y = pr.f; m.vy = 0; } }
      function updateMon(m, dt) {
        const t = MT[m.k]; m.flash = Math.max(0, m.flash - dt); m.ph += dt;
        if (m.burn > 0 && m.st !== 'dead') { m.burn -= dt; if (Math.random() < 0.5) parts.push({ x: m.x + (Math.random() - .5) * .3, y: m.y + Math.random() * m.h, z: m.z + (Math.random() - .5) * .3, vx: 0, vy: 1, vz: 0, t: 0.4, col: COL(8, 11 + ((Math.random() * 4) | 0)), g: -1, s: 0.06 });
          m.burnT = (m.burnT || 0) - dt; if (m.burnT <= 0) { m.burnT = 0.25; hurtMon(m, 2.5, 'fire'); if (m.st === 'dead') return false; } }
        if (m.st === 'dead') { m.fall += dt;
          if (m.revive > 0 && m.fall > m.revive) { m.st = 'chase'; m.hp = 30; m.revived = true; m.revive = 0; kills--; sfx.moan(); say('IT GOT BACK UP...'); return false; }
          if (m.fly) { const f = FL[cellOf(m.x, m.z)]; m.y = Math.max(f, m.y - dt * 3); } return m.fall > (m.revive > 0 ? 99 : 4.5); }
        if (m.k === 'baron') { updateBoss(m, dt); return false; }
        const ex = P.x, ey = P.y + EYE, ez = P.z, dx = ex - m.x, dz = ez - m.z, dist = Math.hypot(dx, dz);
        if (--m.losT <= 0) { m.losT = 8; m.los = !P.dead && dist < 24 && los(m.x, m.y + m.h * 0.8, m.z, ex, ey, ez); }
        if (m.st === 'idle') { if (m.los && dist < 16) wake(m); if (noise && Math.hypot(noise.x - m.x, noise.z - m.z) < 9) wake(m); if (m.fly) m.y += Math.sin(m.ph * 2) * dt * 0.2; return false; }
        if (m.st === 'pain') { m.tm -= dt; if (m.tm <= 0) m.st = 'chase'; return false; }
        if (m.st === 'atk') { m.tm -= dt; doAttack(m, dist); return false; }
        if (P.dead) return false;
        m.cd -= dt;
        let tx = ex, tz = ez; const panic = m.burn > 0 && m.k !== 'hound';
        if (!(m.los && (dist < 7 || m.fly)) && flow) { const ci = cellOf(m.x, m.z); let best = flow[ci] >= 0 ? flow[ci] : 1e4, bj = -1;
          for (let d = 0; d < 4; d++) { const j = ci + DIRS[d][0] + DIRS[d][1] * MW; const v = flow[j]; if (v >= 0 && v < best) { best = v; bj = j; } } if (bj >= 0) { tx = (bj % MW) + 0.5; tz = ((bj / MW) | 0) + 0.5; } }
        let want = Math.atan2(tz - m.z, tx - m.x); if (panic) want = m.yaw + Math.sin(m.ph * 3) * 1.5;
        let da = want - m.yaw; while (da > PI) da -= TAU; while (da < -PI) da += TAU; m.yaw += clamp(da, -6 * dt, 6 * dt);
        let spd = t.spd * (panic ? 1.4 : 1); if (m.k === 'gargoyle' && m.los && dist < 5) spd *= 1.5;
        const keep = (m.k === 'acolyte' || m.k === 'zealot') && m.los && dist < 3.5 && !panic;
        if (!keep && dist > (m.k === 'acolyte' || m.k === 'zealot' ? 1 : 0.5 + m.r)) { if (!moveEnt(m, Math.cos(m.yaw) * spd * dt, Math.sin(m.yaw) * spd * dt, STEP)) { m.yaw += (Math.random() - 0.5) * 2; } }
        for (const o of mons) { if (o === m || o.st === 'dead') continue; const sx = m.x - o.x, sz = m.z - o.z, sd = Math.hypot(sx, sz), md = m.r + o.r; if (sd < md && sd > 1e-3) moveEnt(m, sx / sd * (md - sd) * 0.5, sz / sd * (md - sd) * 0.5, STEP); }
        if (m.fly) { const ci = cellOf(m.x, m.z); const tgt = clamp(P.y + (m.k === 'gargoyle' && dist < 2 ? 0.2 : 0.7) + Math.sin(m.ph * 1.7) * 0.25, FL[ci] + 0.1, ceilAt(ci) - m.h - 0.05); m.y += clamp(tgt - m.y, -1.5 * dt, 1.5 * dt); }
        else gravityEnt(m, dt);
        if (m.k === 'specter' && dist < 0.8 && Math.abs(P.y - m.y) < 1) { m.drainT = (m.drainT || 0) - dt; if (m.drainT <= 0) { m.drainT = 0.5; hurtPlayer(5); } }
        if (m.cd <= 0 && m.los && !panic) { const r = { acolyte: 13, zealot: 10, zombie: 1.2, hound: 3, gargoyle: 1.3, specter: 9 }[m.k];
          if (dist < r) { m.st = 'atk'; m.tm = { acolyte: 0.6, zealot: 0.8, zombie: 0.7, hound: 0.7, gargoyle: 0.5, specter: 0.6 }[m.k]; m.fired = false; } }
        return false;
      }
      function doAttack(m, dist) {
        const T0 = { acolyte: 0.3, zealot: 0.35, zombie: 0.3, hound: 0.5, gargoyle: 0.2, specter: 0.25 }[m.k];
        m.yaw = Math.atan2(P.z - m.z, P.x - m.x);
        if (!m.fired && m.tm <= T0) { m.fired = true; const ex = P.x, ey = P.y + EYE * 0.8, ez = P.z, mx = m.x, my = m.y + m.h * 0.7, mz = m.z, dx = ex - mx, dy = ey - my, dz = ez - mz, d = Math.hypot(dx, dy, dz) || 1;
          if (m.k === 'acolyte') { sfx.mshot(); flashL = Math.max(flashL, 4); if (los(mx, my, mz, ex, ey, ez)) { let dmg = 0; for (let k = 0; k < 4; k++) if (Math.random() < clamp(1 - d / 13, 0.12, 0.65)) dmg += 3; if (dmg) hurtPlayer(dmg); } }
          else if (m.k === 'zealot') { sfx.toss(); const tt = clamp(d / 7, 0.4, 1.5); projs.push({ k: 'bottle', x: mx, y: my, z: mz, vx: dx / tt, vy: (dy + 0.5 * GRAV * 0.75 * tt * tt) / tt, vz: dz / tt, life: tt + 0.5, own: m, dmg: 30 }); }
          else if (m.k === 'zombie') { if (dist < 1.4) { hurtPlayer(10); sfx.stab(); } }
          else if (m.k === 'hound') { sfx.burn(); for (let k = 0; k < 10; k++) parts.push({ x: mx, y: m.y + 0.35, z: mz, vx: dx / d * 4 + (Math.random() - .5), vy: (Math.random() - .3), vz: dz / d * 4 + (Math.random() - .5), t: 0.5, col: COL(8, 11 + ((Math.random() * 5) | 0)), g: 0, s: 0.06, grow: 0.15 });
            if (dist < 3.2 && los(mx, my, mz, ex, ey, ez)) hurtPlayer(9); }
          else if (m.k === 'gargoyle') { if (dist < 1.5) { hurtPlayer(13); sfx.stab(); } }
          else if (m.k === 'specter') { sfx.wail(); projs.push({ k: 'wisp', x: mx, y: my, z: mz, vx: dx / d * 7, vy: dy / d * 7, vz: dz / d * 7, life: 4, own: m, dmg: 8 }); }
        }
        if (!m.fly) gravityEnt(m, 1 / 60);
        if (m.tm <= 0) { m.st = 'chase'; m.cd = { acolyte: 1.7, zealot: 2.0, zombie: 0.8, hound: 1.2, gargoyle: 0.8, specter: 2.0 }[m.k] * (0.6 + Math.random() * 0.8) * (levelIdx > 4 ? 0.8 : 1); }
      }
      function updateBoss(m, dt) {
        const dx = P.x - m.x, dz = P.z - m.z, dist = Math.hypot(dx, dz);
        if (m.st === 'idle') { if (P.z < 24) { m.st = 'chase'; sfx.laugh(); say('LADIES AND GHOULS... THE PALE IMPRESARIO!', 3.5); m.cd = 2; } return; }
        m.yaw = Math.atan2(dz, dx); m.cd -= dt; m.sumT -= dt; m.tele -= dt;
        const rage = m.hp < MT.baron.hp * 0.35;
        if (m.st === 'atk') { m.tm -= dt; if (m.tm <= 0) m.st = 'chase'; }
        if (dist > 3) moveEnt(m, Math.cos(m.yaw) * MT.baron.spd * dt, Math.sin(m.yaw) * MT.baron.spd * dt, STEP);
        gravityEnt(m, dt);
        if (m.cd <= 0 && !P.dead) { m.cd = rage ? 1.5 : 2.3; m.st = 'atk'; m.tm = 0.6; sfx.laugh(); const n = rage ? 5 : 3, mx = m.x, my = m.y + 2, mz = m.z;
          for (let k = 0; k < n; k++) { const sp = (k - (n - 1) / 2) * 0.8, tx = P.x + Math.cos(P.yaw + PI / 2) * sp + P.vx * 0.4, tz = P.z + Math.sin(P.yaw + PI / 2) * sp + P.vz * 0.4;
            const ddx = tx - mx, ddz = tz - mz, hd = Math.hypot(ddx, ddz), tt = clamp(hd / 8, 0.5, 2), ddy = P.y + 0.3 - my;
            projs.push({ k: 'fireball', x: mx, y: my, z: mz, vx: ddx / tt, vy: (ddy + 0.5 * GRAV * 0.75 * tt * tt) / tt, vz: ddz / tt, life: tt + 1.5, own: m, dmg: 25 }); } }
        if (m.hp < MT.baron.hp * 0.65 && m.sumT <= 0) { m.sumT = rage ? 10 : 14; if (mons.filter(o => o.st !== 'dead' && o.k !== 'baron').length < 4)
          for (const [x, z] of [[6.5, 12.5], [23.5, 12.5]]) { const s = spawnMon(Math.random() < 0.5 ? 'acolyte' : 'zealot', x, z, 0); wake(s); spark(x, 0.5, z, 20, COL(6, 14), 3, 0.6, 0); } }
        if (m.tele <= 0 && dist < 3) { m.tele = 7; const spots = [[8, 6], [22, 6], [8, 19], [22, 19], [15, 5]]; const s = spots[(Math.random() * spots.length) | 0]; spark(m.x, m.y + 1, m.z, 20, COL(6, 13), 3, 0.6, 0); m.x = s[0] + 0.5; m.z = s[1] + 0.5; sfx.laugh(); }
      }
      function bossDown(m) { sfx.laugh(); shake = 2; say('THE SHOW IS OVER! TAKE A BOW AT THE EXIT.', 4); for (let k = 0; k < 5; k++) explode(m.x + (Math.random() - .5) * 2, m.y + 1 + Math.random(), m.z + (Math.random() - .5) * 2, 0, 0.1, m);
        const gx = G.bossGate.x, gz = G.bossGate.z; KIND[cellOf(gx, gz)] = K_EXIT; exitOn = { x: gx, z: gz }; }

      // ---------------- items ----------------
      function pickup(it) { const k = it.k;
        if (k === 'tonic') { if (P.hp >= 100) return false; P.hp = Math.min(100, P.hp + 20); say('DOCTOR\'S TONIC'); }
        else if (k === 'essence') { if (P.hp >= 200) return false; P.hp = Math.min(200, P.hp + 50); say('LIFE ESSENCE'); }
        else if (k === 'armor') { if (P.armor >= 200) return false; P.armor = Math.min(200, P.armor + 100); say('BODY ARMOR'); }
        else if (k === 'shells') { if (P.ammo.s >= AMAX.s) return false; P.ammo.s = Math.min(AMAX.s, P.ammo.s + (it.small ? 4 : 12)); say('SHELLS'); }
        else if (k === 'bullets') { if (P.ammo.b >= AMAX.b) return false; P.ammo.b = Math.min(AMAX.b, P.ammo.b + 50); say('TOMMY DRUM'); }
        else if (k === 'flares') { if (P.ammo.f >= AMAX.f) return false; P.ammo.f = Math.min(AMAX.f, P.ammo.f + 8); say('FLARES'); }
        else if (k === 'dyna') { if (P.ammo.d >= AMAX.d) return false; P.ammo.d = Math.min(AMAX.d, P.ammo.d + (it.small ? 1 : 5)); if (!P.wpn[4]) { P.wpn[4] = true; } say('DYNAMITE'); }
        else if (k === 'pins') { if (P.ammo.p >= AMAX.p) return false; P.ammo.p = Math.min(AMAX.p, P.ammo.p + 20); say('PINCUSHION'); }
        else if (k === 'keyb') { P.keys.b = true; say('YOU FOUND THE BONE KEY'); sfx.key(); addScore(200); return true; }
        else if (k === 'keym') { P.keys.m = true; say('YOU FOUND THE MOON KEY'); sfx.key(); addScore(200); return true; }
        else if (k === 'charm') { P.charm = 25; say('REAPER\'S CHARM! DEATH CAN WAIT.'); sfx.power(); return true; }
        else if (k === 'wrath') { P.wrath = 25; say('WRATH TONIC! TRIPLE DAMAGE'); sfx.power(); return true; }
        else if (k[0] === 'w') { const wi = +k.slice(1), had = P.wpn[wi]; P.wpn[wi] = true; const a = WPN[wi].ammo; if (a) P.ammo[a] = Math.min(AMAX[a], P.ammo[a] + { f: 8, s: 12, b: 50, d: 5, p: 20 }[a]);
          if (!had) { P.cur = wi; P.cool = 0.3; } say('YOU GOT THE ' + WPN[wi].name); sfx.weapon(); addScore(100); return true; }
        sfx.pick(); addScore(10); return true; }

      // ---------------- player ----------------
      function updatePlayer(dt) {
        if (P.dead) { deadT += dt; P.eyeOff = Math.max(-0.55, P.eyeOff - dt * 1.2); return; }
        const k = api.key, m = api.mouse;
        if (lastMX !== null && (m.x !== lastMX || m.y !== lastMY)) { const dx = m.x - lastMX, dy = m.y - lastMY; if (Math.abs(dx) < 40 && Math.abs(dy) < 40) { P.yaw += dx * 0.012; P.pitch = clamp(P.pitch - dy * 1.4, -70, 70); } }
        lastMX = m.x; lastMY = m.y;
        const tl = k('ArrowLeft'), tr = k('ArrowRight'); if (tl || tr) P.turn = Math.min(1, P.turn + dt * 5); else P.turn = 0; const ts = 2.7 * (0.35 + 0.65 * P.turn);
        if (tl) P.yaw -= ts * dt; if (tr) P.yaw += ts * dt;
        if (k('KeyR') || k('PageUp')) P.pitch = Math.min(70, P.pitch + dt * 120); if (k('KeyF') || k('PageDown')) P.pitch = Math.max(-70, P.pitch - dt * 120); if (k('KeyV') || k('End')) P.pitch *= 0.8;
        let fw = 0, st = 0; if (k('ArrowUp') || k('KeyW')) fw += 1; if (k('ArrowDown') || k('KeyS')) fw -= 1; if (k('KeyA')) st -= 1; if (k('KeyD')) st += 1;
        const ci0 = cellOf(P.x, P.z), wet = KIND[ci0] === K_WATER && P.ground;
        const cs = Math.cos(P.yaw), sn = Math.sin(P.yaw), sp = wet ? 3 : 5; let wx = (cs * fw - sn * st) * sp, wz = (sn * fw + cs * st) * sp; const wl = Math.hypot(wx, wz); if (wl > sp) { wx *= sp / wl; wz *= sp / wl; }
        const acc = P.ground ? Math.min(1, 11 * dt) : Math.min(1, 1.5 * dt); P.vx += (wx - P.vx) * acc; P.vz += (wz - P.vz) * acc;
        if ((api.pressed('Enter') || api.pressed('KeyC') || api.pressed('ShiftLeft')) && P.ground) { P.vy = 4.4; P.ground = false; sfx.jump(); }
        const ox = P.x, oz = P.z, stepH = P.ground ? STEP : 0;
        if (!moveEnt(P, P.vx * dt, 0, stepH)) P.vx *= P.ground ? 0 : 0.2; if (!moveEnt(P, 0, P.vz * dt, stepH)) P.vz *= P.ground ? 0 : 0.2;
        for (const mm of mons) { if (mm.st === 'dead' || mm.k === 'specter') continue; const sx = P.x - mm.x, sz = P.z - mm.z, sd = Math.hypot(sx, sz), md = PR + mm.r;
          if (sd < md && sd > 1e-3 && P.y < mm.y + mm.h && P.y + PHT > mm.y) moveEnt(P, sx / sd * (md - sd), sz / sd * (md - sd), stepH); }
        const pr = probe(P.x, P.z, PR); if (P.ground && pr.f > P.y && pr.f - P.y <= STEP + 0.01) { P.eyeOff -= pr.f - P.y; P.y = pr.f; }
        P.vy -= GRAV * dt; P.y += P.vy * dt; const pr2 = probe(P.x, P.z, PR);
        if (P.y <= pr2.f) { if (!P.ground && P.vy < -10) hurtPlayer(5); P.y = pr2.f; P.vy = 0; P.ground = true; } else P.ground = false;
        if (P.y + PHT > pr2.c) { P.y = Math.max(pr2.f, pr2.c - PHT); if (P.vy > 0) P.vy = 0; }
        P.eyeOff *= Math.pow(0.0001, dt); if (Math.abs(P.eyeOff) < 0.002) P.eyeOff = 0;
        P.bob += Math.hypot(P.x - ox, P.z - oz) * 7;
        for (let i = 0; i < 6; i++) if (api.pressed('Digit' + (i + 1)) && P.wpn[i]) { if (hasAmmo(i)) { P.cur = i; P.cool = Math.max(P.cool, 0.25); } else say('OUT OF AMMO'); }
        if (api.pressed('KeyX')) cycleWeapon();
        P.cool -= dt; P.kick = Math.max(0, P.kick - dt * 5); P.quipT -= dt;
        if (k('Space') || m.down) fire(false); else if (k('KeyZ')) fire(true);
        if (!hasAmmo(P.cur) && P.cool <= 0) autoSwitch();
        if (KIND[ci0] === K_BRIM && P.ground) { P.hazT = (P.hazT || 0) - dt; if (P.hazT <= 0) { P.hazT = 0.5; hurtPlayer(8); } }
        for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (Math.abs(it.x - P.x) < 0.55 && Math.abs(it.z - P.z) < 0.55 && Math.abs(it.y - P.y) < 0.8) { if (pickup(it)) items.splice(i, 1); } }
        if (exitOn && Math.abs(exitOn.x - P.x) < 0.5 && Math.abs(exitOn.z - P.z) < 0.5) levelDone();
        P.charm = Math.max(0, P.charm - dt); P.wrath = Math.max(0, P.wrath - dt); P.painT -= dt;
      }
      function levelDone() { A.melody([[262, 0.12], [330, 0.12], [392, 0.12], [523, 0.3]], { type: 'triangle', vol: 0.12 });
        const bonus = 1000 * (levelIdx + 1) + Math.round(kills / Math.max(1, totalMons) * 2000); interStats = { name: G.name, kills, total: totalMons, secrets: secretsFound, stot: G.secrets, time: levelTime, bonus, n: levelIdx + 1 };
        addScore(bonus); state = 'inter'; stT = 0; }
      function updateDecor(dt) { for (const b of decor) { if (b.fuse > 0) { b.fuse -= dt; if (b.fuse <= 0) { b.fuse = -1; b.gone = true; BLOCK[cellOf(b.x, b.z)] = 0; explode(b.x, b.y + 0.3, b.z, 100, 2.2, null); } } }
        for (let i = decor.length - 1; i >= 0; i--) if (decor[i].gone) decor.splice(i, 1); }
      function updateParts(dt) { for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.t -= dt; if (p.t <= 0) { parts[k] = parts[parts.length - 1]; parts.pop(); continue; } p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.grow) p.s += p.grow * dt; } }

      function update(dt) {
        stT += dt; if (coinFlash > 0) coinFlash -= dt; if (msgT > 0) msgT -= dt; flashR = Math.max(0, flashR - dt * 1.2); shake = Math.max(0, shake - dt); flashL = Math.max(0, flashL - dt * 60);
        if (state === 'title') { updateDemo(dt); if (api.pressed('Enter') || api.pressed('Space')) { if (api.useCredit()) startGame(); else { coinFlash = 1.5; A.tone(70, 0.25, { type: 'square', vol: 0.2 }); } } return; }
        if (state === 'inter') { animTex(api.time); if (stT > 2 && (api.pressed('Space') || api.pressed('Enter') || stT > 9)) nextLevel(); return; }
        if (state === 'win') { animTex(api.time); if ((stT > 4 && (api.pressed('Space') || api.pressed('Enter'))) || stT > 22) gameOver(); return; }
        if (state === 'over') { if (stT > 5 || (stT > 1.5 && (api.pressed('Enter') || api.pressed('Space')))) { state = 'title'; stT = 0; setupDemo(); } return; }
        if (state !== 'play') return;
        animTex(api.time); music(dt); levelTime += dt; if (noise) { noise.t -= dt; if (noise.t <= 0) noise = null; }
        updatePlayer(dt); updateDoors(dt); if (--flowT <= 0) { flowT = 15; computeFlow(); }
        for (let i = mons.length - 1; i >= 0; i--) if (updateMon(mons[i], dt)) mons.splice(i, 1);
        updateProjs(dt); updateParts(dt); updateDecor(dt);
        for (const b of decor) if ((b.k === 'candle' || b.k === 'candelabra' || b.k === 'lantern') && Math.random() < 0.05) parts.push({ x: b.x, y: b.y + b.h + 0.05, z: b.z, vx: 0, vy: 0.4, vz: 0, t: 0.5, col: COL(10, 5), g: 0, s: 0.02 });
        if (P.dead && deadT > 2.2) playerDied();
      }
      function playerDied() { lives--;
        if (lives > 0) { restoreSnapshot(); loadLevel(levelIdx); P.hp = Math.max(100, P.hp); state = 'play'; return; }
        state = 'dying'; const cont = () => { lives = 3; restoreSnapshot(); P.hp = 100; loadLevel(levelIdx); state = 'play'; };
        if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver(); }
      function gameOver() { api.setHiScore(score); hi = Math.max(hi, score); state = 'over'; stT = 0; }
      function nextLevel() { if (levelIdx + 1 >= LEVELS.length) { state = 'win'; stT = 0; api.setHiScore(score); A.melody([[196, 0.3], [233, 0.3], [294, 0.3], [392, 0.9]], { type: 'triangle', vol: 0.14 }); return; } loadLevel(levelIdx + 1); state = 'play'; stT = 0; }

      // ---------------- attract ----------------
      function setupDemo() { P = newPlayer(); loadLevel(0, true);
        const N = MW * MH, prev = new Int32Array(N).fill(-1), s = cellOf(G.start.x, G.start.z), q = [s]; prev[s] = s;
        while (q.length) { const i = q.shift(); for (const [dx, dz] of DIRS) { const j = i + dx + dz * MW; if (prev[j] >= 0 || SOL[j] || BLOCK[j]) continue; prev[j] = i; q.push(j); } }
        let e = cellOf(G.exit.x, G.exit.z); const path = []; while (e !== s && e >= 0) { path.unshift(e); e = prev[e]; } path.unshift(s);
        demoPath = path.map(i => [(i % MW) + 0.5, ((i / MW) | 0) + 0.5, FL[i]]); demoT = 0; demoYaw = null; for (const d of doors) { d.open = 1; d.st = 2; d.t = 1e9; } }
      function updateDemo(dt) { if (!demoPath) setupDemo(); animTex(api.time); demoT += dt * 1.5; if (demoT >= demoPath.length - 1) demoT = 0; for (const m of mons) m.ph += dt; }
      function demoCam() { const i = Math.floor(demoT), f = demoT - i, a = demoPath[i], b = demoPath[Math.min(demoPath.length - 1, i + 1)], c = demoPath[Math.min(demoPath.length - 1, i + 3)];
        const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f, y = a[2] + (b[2] - a[2]) * f + 0.72, yaw = Math.atan2(c[1] - z, c[0] - x);
        if (demoYaw == null) demoYaw = yaw; let d = yaw - demoYaw; while (d > PI) d -= TAU; while (d < -PI) d += TAU; demoYaw += d * 0.04; return [x, y, z, demoYaw + Math.sin(api.time * 0.5) * 0.3, Math.sin(api.time * 0.3) * 10]; }

      // ---------------- drawing ----------------
      function litAt(x, z) { return lightAt(x, z); }
      function queueWorld() {
        for (const b of decor) { if (Math.abs(b.x - EX) + Math.abs(b.z - EZ) > 28) continue; const img = S[b.k === 'tomb' ? 'tomb' : b.k]; if (!img) continue;
          const bob = b.k.indexOf('balloon') === 0 ? Math.sin(api.time * 1.5 + b.ph) * 0.06 : 0; queueSprite(img, b.x, b.y + bob, b.z, b.h, litAt(b.x, b.z) + (b.k === 'candle' || b.k === 'lantern' || b.k === 'candelabra' ? 20 : 0)); }
        for (const it of items) { if (Math.abs(it.x - EX) + Math.abs(it.z - EZ) > 28) continue; const k = it.k, img = S[k === 'keyb' ? 'keyb' : k === 'keym' ? 'keym' : k[0] === 'w' ? 'w' + k.slice(1) : k] || S.tonic;
          const h = { armor: 0.35, keyb: 0.3, keym: 0.3, essence: 0.3, w2: 0.13, w3: 0.16, w4: 0.28, w5: 0.3 }[k] || 0.22; queueSprite(img, it.x, it.y + 0.05 + Math.abs(Math.sin(api.time * 2 + it.ph)) * 0.04, it.z, h * (it.small ? 0.8 : 1), litAt(it.x, it.z) + 8); }
        if (exitOn) { const bl = Math.sin(api.time * 4) * 0.5 + 0.5; for (let k = 0; k < 3; k++) { const a = api.time * 2 + k * 2.1; point(exitOn.x + Math.cos(a) * 0.3, FL[cellOf(exitOn.x, exitOn.z)] + 0.2 + k * 0.25, exitOn.z + Math.sin(a) * 0.3, COL(13, 13), 0.05); }
          queueSprite(S.lantern, exitOn.x, FL[cellOf(exitOn.x, exitOn.z)] + 0.02, exitOn.z, 0.5 + bl * 0.05, 50, 4); }
        for (const m of mons) { if (Math.abs(m.x - EX) + Math.abs(m.z - EZ) > 30) continue; const t = MT[m.k], fr = S[t.spr];
          let img, h = t.h * (t.wide ? 1 : 1), opt = 0, y = m.y;
          if (m.st === 'dead') { img = fr[3]; h = t.h * fr[3].h / fr[0].h; if (m.fall > 2.5 && !(m.revive > 0)) opt |= (Math.min(3, ((m.fall - 2.5) * 2) | 0) + 1) << 8; if (m.revive > 0 && m.fall > m.revive - 0.6) { img = fr[0]; h = t.h * Math.min(1, (m.fall - m.revive + 0.6) / 0.6); } }
          else if (m.st === 'atk' || (m.k === 'baron' && m.tm > 0 && m.st === 'atk')) img = fr[2]; else img = fr[(m.ph * 4 | 0) & 1];
          if (m.k === 'gargoyle' && m.st !== 'dead') img = fr[(m.ph * 6 | 0) & 1 ? 1 : 0], m.st === 'atk' && (img = fr[2]);
          if (t.ghost && m.st !== 'dead') { opt |= 2; if (Math.sin(m.ph * 2) > 0.85) continue; } if (t.ghost) opt |= 4;
          const rel = Math.atan2(m.z - EZ, m.x - EX), facing = Math.sin(m.yaw - rel) > 0; if (facing) opt |= 1;
          let L = litAt(m.x, m.z) + (m.flash > 0 ? 25 : 0) + (m.burn > 0 ? 18 : 0); queueSprite(img, m.x, y, m.z, h, L, opt); }
        for (const p of projs) { if (p.k === 'flare') queueSprite(S.flare, p.x, p.y - 0.04, p.z, 0.08, 60, 4); else if (p.k === 'dyna') queueSprite(S.stick, p.x, p.y - 0.05, p.z, 0.12, litAt(p.x, p.z) + 10);
          else if (p.k === 'bottle') queueSprite(S.bottle, p.x, p.y - 0.06, p.z, 0.14, litAt(p.x, p.z) + 10); else if (p.k === 'fireball') queueSprite(S.fireball, p.x, p.y - 0.2, p.z, 0.4, 60, 4);
          else if (p.k === 'wisp') queueSprite(S.flare, p.x, p.y - 0.06, p.z, 0.12, 60, 6); }
      }
      function drawView(px, pz, ey, yaw, pitchPx) { render3D(px, pz, ey, yaw, pitchPx); queueWorld(); drawSprites(); for (const p of parts) point(p.x, p.y, p.z, p.col, p.s); }
      function bigNum(n, x, y, col) { const s = String(Math.max(0, Math.floor(n))); const SEG = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcfgd']; let cx = x - s.length * 11;
        for (const ch of s) { const g = SEG[+ch], w = 9, h = 16, t = 2; const draw = (ox, oy, c) => { if (g.includes('a')) rectF(cx + ox, y + oy, w, t, c); if (g.includes('g')) rectF(cx + ox, y + oy + 7, w, t, c); if (g.includes('d')) rectF(cx + ox, y + oy + h - t, w, t, c);
            if (g.includes('f')) rectF(cx + ox, y + oy, t, 9, c); if (g.includes('b')) rectF(cx + ox + w - t, y + oy, t, 9, c); if (g.includes('e')) rectF(cx + ox, y + oy + 7, t, 9, c); if (g.includes('c')) rectF(cx + ox + w - t, y + oy + 7, t, 9, c); };
          draw(1, 1, RGB(20, 4, 4)); draw(0, 0, col); cx += 11; } }
      function hudBack() { const tx = TEX[T.STONEW]; for (let y = VH; y < H; y++) for (let x = 0; x < W; x++) FB[y * W + x] = CMAP[(12 << 8) | tx[((y & 63) << 6) | (x & 63)]]; rectF(0, VH, W, 1, COL(2, 8)); }
      function drawHUD() {
        hudBack(); const y = VH + 12;
        for (let i = 0; i < 6; i++) { const on = P.wpn[i], sel = P.cur === i, x = 4 + i * 12; if (sel) rectF(x - 1, VH + 2, 9, 8, COL(2, 6)); txt(String(i + 1), x + 1, VH + 2, on ? (sel ? COL(15, 15) : COL(4, 12)) : COL(10, 4)); }
        [['F', P.ammo.f], ['S', P.ammo.s], ['B', P.ammo.b], ['D', P.ammo.d], ['P', P.ammo.p]].forEach(([l, v], j) => { const x = 80 + j * 36; txt(l, x, VH + 2, COL(2, 11)); txt(String(v), x + 8, VH + 2, COL(4, 13)); });
        if (P.keys.b) blit(S.keyb, 262, VH + 1, 40); if (P.keys.m) blit(S.keym, 272, VH + 1, 40); txt('X' + lives, 290, VH + 2, COL(4, 13));
        // heart
        const hb = P.painT > 0 ? 15 : 11; rectF(8, y + 2, 5, 4, COL(2, hb)); rectF(14, y + 2, 5, 4, COL(2, hb)); rectF(7, y + 5, 13, 4, COL(2, hb)); rectF(9, y + 9, 9, 3, COL(2, hb - 2)); rectF(11, y + 12, 5, 2, COL(2, hb - 3));
        bigNum(P.hp, 70, y, P.hp <= 25 ? COL(2, 15) : COL(4, 13));
        rectF(80, y + 2, 12, 12, COL(1, 6)); rectF(82, y + 4, 8, 8, COL(1, 10)); bigNum(P.armor, 132, y, COL(4, 12));
        const w = WPN[P.cur]; if (w.ammo) bigNum(P.ammo[w.ammo], 206, y, P.ammo[w.ammo] < 3 ? COL(2, 15) : COL(4, 13)); txt(w.name, 212, VH + 23, COL(2, 11));
        txt(String(score).padStart(7, '0'), 266, y, COL(4, 12)); if (P.charm > 0) txt('CHARM', 212, y, COL(7, 14)); else if (P.wrath > 0) txt('WRATH', 212, y, COL(6, 14));
      }
      function drawViewModel() {
        if (P.dead) return; const img = VM[P.cur], L = litAt(P.x, P.z) + 10 + flashL; const bx = Math.sin(P.bob) * 5, by = Math.abs(Math.cos(P.bob)) * 4;
        let x = 160 - img.w / 2 + 34 + bx, y = VH - img.h + 14 + by + P.kick * 8;
        if (P.cur === 0) { y -= P.kick * 30; x -= P.kick * 10; } if (P.cur === 4) { y += P.kick * 30; } if (P.cur === 5) { y -= P.kick * 6; }
        blit(img, x, y, L);
        if (P.kick > 0.7 && (P.cur === 2 || P.cur === 3 || P.cur === 1)) { const fx = x + (P.cur === 2 ? 45 : P.cur === 3 ? 48 : 33), fy = y + (P.cur === 3 ? -4 : 6); for (let k = 0; k < 30; k++) { const a = Math.random() * TAU, r = Math.random() * 9; rectF(fx + Math.cos(a) * r, fy + Math.sin(a) * r * 0.7, 2, 2, COL(12, 12 + ((Math.random() * 4) | 0))); } }
        if (P.cur === 4) { rectF(x + 41 + Math.random() * 2, y - 2 + Math.random() * 2, 2, 2, COL(12, 15)); }
      }
      function renderGameplay() {
        const sx = shake > 0 ? (Math.random() - .5) * shake * 0.05 : 0, sy = shake > 0 ? (Math.random() - .5) * shake * 6 : 0;
        const eh = P.dead ? 0.2 : EYE + P.eyeOff + Math.abs(Math.cos(P.bob)) * 0.02;
        drawView(P.x, P.z, P.y + eh, P.yaw + sx, P.pitch + sy);
        if (state === 'play') drawViewModel();
        if (P.charm > 0) tint(200, 200, 255, 0.12); else if (P.wrath > 0) tint(255, 60, 20, 0.12);
        if (flashR > 0) tint(255, 20, 10, Math.min(0.5, flashR)); if (P.dead) tint(110, 0, 0, Math.min(0.55, deadT * 0.3));
        if (!P.dead) { const c = COL(15, 12); rectF(158, VH / 2, 2, 1, c); rectF(162, VH / 2, 2, 1, c); rectF(160, VH / 2 - 2, 1, 2, c); rectF(160, VH / 2 + 1, 1, 2, c); }
        drawHUD(); if (msgT > 0) txtCS(msg, 8, COL(4, 14), 1);
        if (P.dead && deadT > 1) txtCS(lives > 1 ? 'YOU CROAKED' : 'YOU CROAKED - LAST LIFE', 70, COL(2, 15), 1);
        if (state === 'play' && levelTime < 3) { txtCS('CHAPTER ' + (levelIdx + 1), 50, COL(2, 14), 2); txtCS(G.name, 72, COL(4, 14), 1); }
      }
      const titleGrad = r => COL(2, [15, 14, 13, 12, 11, 10, 9][r]);
      function renderTitle() {
        const [x, y, z, yaw, pitch] = demoCam(); drawView(x, z, y, yaw, pitch); hudBack(); darken(0, VH, 0.5);
        txt('BLOOD', ((W - tw('BLOOD', 8)) >> 1) + 3, 21, RGB(0, 0, 0), 8); txtC('BLOOD', 18, 0, 8, titleGrad);
        for (let k = 0; k < 9; k++) { const dx = 52 + k * 25 + ((k * 7) % 11), len = 4 + ((k * 13 + ((stT * 6) | 0)) % 9); rectF(dx, 74, 3, len, COL(2, 10)); rectF(dx, 74 + len, 3, 2, COL(2, 12)); }
        txtCS('THE UNDERTAKER RETURNS', 88, COL(4, 13), 1);
        const ph = Math.floor(stT / 9) % 3;
        if (ph === 0) { txtCS('BURIED ALIVE BY THE CULT OF THE CROW,', 104, COL(15, 11), 1); txtCS('EZRA GRAVES DIGS HIS WAY BACK OUT.', 114, COL(15, 11), 1); txtCS('HE HAS SOME APPOINTMENTS TO KEEP.', 124, COL(15, 11), 1); }
        else if (ph === 1) { txtCS('THE GUEST LIST', 102, COL(2, 13), 1); ['acolyte', 'zealot', 'zombie', 'hound', 'gargoyle', 'specter'].forEach((k, j) => txtCS(MT[k].name + '  ' + MT[k].score, 113 + j * 8, COL(15, 11), 1)); }
        else { txtCS('HIGH SCORE ' + String(hi).padStart(7, '0'), 104, COL(2, 13), 1); txtCS('SPACE FIRE  Z ALT-FIRE  ENTER JUMP', 118, COL(15, 10), 1); txtCS('X / 1-6 WEAPONS  R F LOOK  MOUSE AIM', 128, COL(15, 10), 1); }
        const blink = Math.floor(stT * 2) % 2 === 0; if (api.credits > 0) { if (blink) txtCS('PUSH START', 152, COL(15, 15), 1); } else if (blink || coinFlash > 0) txtCS('INSERT COIN', 152, coinFlash > 0 ? COL(2, 15) : COL(4, 14), 1);
        txt('CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, 190, COL(4, 11)); txt('1997 MONOLITH', W - 8 - tw('1997 MONOLITH'), 190, COL(4, 9));
      }
      function renderInter() { if (P && G) drawView(P.x, P.z, P.y + EYE, P.yaw + stT * 0.2, 0); drawHUD(); darken(0, VH, 0.4); const s = interStats;
        txtCS('CHAPTER ' + s.n + ' DONE', 22, COL(2, 14), 2); txtCS(s.name, 44, COL(4, 14), 1);
        const row = (l, v, y) => { txtSh(l, 80, y, COL(15, 11), 1); txtSh(v, 200, y, COL(4, 14), 1); };
        row('KILLS', s.kills + '/' + s.total, 66); row('SECRETS', s.secrets + '/' + s.stot, 80); row('TIME', Math.floor(s.time / 60) + ':' + String(Math.floor(s.time % 60)).padStart(2, '0'), 94); row('BONUS', String(s.bonus), 108); row('SCORE', String(score), 122);
        if (stT > 2 && Math.floor(stT * 2) % 2 === 0) txtCS('PRESS FIRE TO CONTINUE', 146, COL(2, 13), 1); }
      function renderWin() { const t = stT * 0.25; drawView(15 + Math.cos(t) * 6, 12.5 + Math.sin(t) * 6, 1.3, t + PI, 0); hudBack(); darken(0, VH, 0.35); txtCS('CURTAIN CALL', 30, COL(2, 14), 2);
        ['THE IMPRESARIO TAKES HIS FINAL BOW.', 'THE CULT OF THE CROW IS SHORT ONE CROW.', 'EZRA TIPS HIS HAT AND GRABS A SHOVEL.', 'BUSINESS IS, AS EVER, DEAD GOOD.', '', 'FINAL SCORE ' + score].forEach((l, j) => txtCS(l, 64 + j * 12, COL(15, 12), 1)); }
      function render(ctx) {
        if (!img) { img = ctx.createImageData(W, H); FB = new Uint32Array(img.data.buffer); }
        if (state === 'title') renderTitle(); else if (state === 'inter') renderInter(); else if (state === 'win') renderWin();
        else if (state === 'over') { renderGameplay(); darken(0, H, 0.35); txtCS('GAME OVER', 70, COL(2, 15), 3); txtCS('SCORE ' + score, 110, COL(4, 13), 1); txtCS('HIGH SCORE ' + hi, 124, COL(15, 12), 1); }
        else renderGameplay();
        ctx.putImageData(img, 0, 0);
      }
      setupDemo();
      return { update, render, destroy() { },
        debug: { get state() { return state; }, get P() { return P; }, get G() { return G; }, get mons() { return mons; }, get items() { return items; }, get doors() { return doors; }, get lifts() { return []; },
          get levelIdx() { return levelIdx; }, setGod(b) { god = b; }, start() { startGame(); }, load(i) { loadLevel(i); state = 'play'; }, floorAt, ceilAt, cellOf, LEVELS, validate, probe, gate: () => exitOn, kills: () => kills, block: () => BLOCK } };
    }
  });
})();
