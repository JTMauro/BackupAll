// Rise of the Triad (Apogee, 1995) - an original take for the Game Room: an over-the-top island-fortress shooter
// with its own raycaster (textured/lit floors and ceilings, sky, sliding doors), five commandos, unlimited-ammo
// pistols, five kinds of missiles, jump pads, gravity-disk platforms, spinning blades, God mode and Dog mode.
(function () {
  'use strict';
  ArcadeRegistry.register({
    id: 'riseofthetriad', title: 'Rise of the Triad', year: 1995, maker: 'Apogee',
    width: 320, height: 200, vector: false, pointer: false,
    controls: 'Arrows: move/turn \u00b7 Space: fire \u00b7 A/D or Z+Arrows: strafe \u00b7 1-4/X: weapon \u00b7 Tab/M: map \u00b7 Enter: start',
    marquee: { bg: '#1a0606', fg: '#ff3b1f', accent: '#ffd23a' },
    create(api) {
      // ====================================================================================
      // Raycaster engine (written for the Game Room): grid walls, sliding doors, textured +
      // lit floors and ceilings, sky, billboard sprites, per-tile light map with dynamic lights.
      // ====================================================================================
      const W = 320, H = 200, PLANE = 0.8, FP = (W / 2) / PLANE;
      const TAU = Math.PI * 2;
      let img = null, fb = null;
      const zbuf = new Float32Array(W), colAng = new Float32Array(W);
      for (let x = 0; x < W; x++) colAng[x] = Math.atan((2 * x / W - 1) * PLANE);
      const rowD = new Float32Array(H), rowF = new Float32Array(H);
      const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

      function rgb(r, g, b) { return (0xff000000 | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0; }
      function hx(s) { const n = parseInt(s.slice(1), 16); return rgb(n >> 16 & 255, n >> 8 & 255, n & 255); }
      function cr(c) { return c & 255; } function cg(c) { return c >> 8 & 255; } function cb(c) { return c >> 16 & 255; }
      function mixc(a, b, t) { return rgb(cr(a) + (cr(b) - cr(a)) * t, cg(a) + (cg(b) - cg(a)) * t, cb(a) + (cb(b) - cb(a)) * t); }
      function shd(c, s) {
        let r = ((c & 255) * s) >> 8, g = (((c >> 8) & 255) * s) >> 8, b = (((c >> 16) & 255) * s) >> 8;
        if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
        return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
      }
      function dk(c, f) { return shd(c, (f * 256) | 0); }
      function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

      // ---------- RNG / noise ----------
      function mkRng(seed) {
        let s = seed >>> 0;
        const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        f.int = n => (f() * n) | 0; f.pick = a => a[(f() * a.length) | 0]; f.range = (a, b) => a + f() * (b - a);
        return f;
      }
      function hash(x, y, s) {
        let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      }
      function vnoise(x, y, s, per) {
        const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
        const P = per || 1 << 20, w = v => ((v % P) + P) % P;
        const a = hash(w(x0), w(y0), s), b = hash(w(x0 + 1), w(y0), s), c = hash(w(x0), w(y0 + 1), s), d = hash(w(x0 + 1), w(y0 + 1), s);
        const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
        return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
      }
      function fbm(x, y, s, per) { return (vnoise(x, y, s, per) * 0.55 + vnoise(x * 2, y * 2, s + 7, per ? per * 2 : 0) * 0.3 + vnoise(x * 4, y * 4, s + 13, per ? per * 4 : 0) * 0.15); }
      function makeTex(w, h, fn) { const d = new Uint32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = fn(x, y); return { w, h, d }; }

      // ---------- sprite painter ----------
      function spr(w, h) { return { w, h, d: new Uint32Array(w * h) }; }
      function sp(s, x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < s.w && y < s.h) s.d[y * s.w + x] = c; }
      function sr(s, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) sp(s, x + i, y + j, c); }
      function se(s, cx, cy, rx, ry, c) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) sp(s, x, y, c);
        }
      }
      function sl(s, x0, y0, x1, y1, c, th) {
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
        th = th || 1;
        for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; sr(s, Math.round(x - (th - 1) / 2), Math.round(y - (th - 1) / 2), th, th, c); }
      }
      function outline(s, c) {
        const o = new Uint32Array(s.d);
        for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
          if (s.d[y * s.w + x]) continue;
          const n = (x > 0 && s.d[y * s.w + x - 1]) || (x < s.w - 1 && s.d[y * s.w + x + 1]) || (y > 0 && s.d[(y - 1) * s.w + x]) || (y < s.h - 1 && s.d[(y + 1) * s.w + x]);
          if (n) o[y * s.w + x] = c;
        }
        s.d = o; return s;
      }
      function flipH(s) { const o = spr(s.w, s.h); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) o.d[y * s.w + x] = s.d[y * s.w + s.w - 1 - x]; return o; }
      function tintSpr(s, c, t) { const o = spr(s.w, s.h); for (let i = 0; i < s.d.length; i++) o.d[i] = s.d[i] ? mixc(s.d[i], c, t) : 0; return o; }

      // ---------- framebuffer drawing / bitmap font ----------
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
        '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 31, 10, 0], '"': [10, 10, 0, 0, 0, 0, 0], '_': [0, 0, 0, 0, 0, 0, 31],
        '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], '$': [4, 15, 20, 14, 5, 30, 4], '&': [12, 18, 20, 8, 21, 18, 13]
      };
      function fbRect(x, y, w, h, c) {
        x |= 0; y |= 0; w |= 0; h |= 0;
        let x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
        for (let j = y0; j < y1; j++) { const o = j * W; for (let i = x0; i < x1; i++) fb[o + i] = c; }
      }
      function fbShade(x, y, w, h, s) {
        x |= 0; y |= 0; let x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
        const si = (s * 256) | 0;
        for (let j = y0; j < y1; j++) { const o = j * W; for (let i = x0; i < x1; i++) fb[o + i] = shd(fb[o + i], si); }
      }
      function fbTint(x, y, w, h, c, a) {
        x |= 0; y |= 0; let x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
        const R = cr(c), G = cg(c), B = cb(c), ia = 1 - a;
        for (let j = y0; j < y1; j++) {
          const o = j * W; for (let i = x0; i < x1; i++) {
            const p = fb[o + i]; fb[o + i] = rgb((p & 255) * ia + R * a, ((p >> 8) & 255) * ia + G * a, ((p >> 16) & 255) * ia + B * a);
          }
        }
      }
      function fbBox(x, y, w, h, c) { fbRect(x, y, w, 1, c); fbRect(x, y + h - 1, w, 1, c); fbRect(x, y, 1, h, c); fbRect(x + w - 1, y, 1, h, c); }
      function textW(s, sc) { return String(s).length * 6 * (sc || 1) - (sc || 1); }
      function fbText(s, x, y, c, sc, align, shadow) {
        sc = sc || 1; s = String(s).toUpperCase();
        if (align === 'center') x = Math.round(x - textW(s, sc) / 2); else if (align === 'right') x = x - textW(s, sc);
        if (shadow) fbText(s, x + sc, y + sc, shadow, sc);
        for (let i = 0; i < s.length; i++) {
          const g = FONT[s[i]]; if (!g) continue;
          for (let r = 0; r < 7; r++) {
            const bits = g[r]; if (!bits) continue;
            for (let q = 0; q < 5; q++) if (bits & (16 >> q)) fbRect(x + (i * 6 + q) * sc, y + r * sc, sc, sc, c);
          }
        }
      }
      function fbBlit(s, x, y, sc, shadeV) {
        sc = sc || 1; const si = shadeV == null ? 256 : (shadeV * 256) | 0;
        for (let j = 0; j < s.h * sc; j++) {
          const yy = y + j; if (yy < 0 || yy >= H) continue;
          const row = ((j / sc) | 0) * s.w;
          for (let i = 0; i < s.w * sc; i++) {
            const xx = x + i; if (xx < 0 || xx >= W) continue;
            const c = s.d[row + ((i / sc) | 0)]; if (c) fb[yy * W + xx] = si === 256 ? c : shd(c, si);
          }
        }
      }
      function wrapText(s, n) {
        const out = []; let line = '';
        for (const w of String(s).split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; }
        if (line.trim()) out.push(line.trim()); return out;
      }

      // ---------- world ----------
      let MW = 1, MH = 1, CW = 2;
      let wallM = new Uint8Array(1), floorM = new Uint8Array(1), ceilM = new Uint8Array(1), seen = new Uint8Array(1);
      let doorM = [], doors = [];
      let tileL = new Float32Array(1), lcBase = new Float32Array(4), lc = new Float32Array(4);
      let WALLTEX = [null], FLOORTEX = [], CEILTEX = [], SKY = null;
      let WALLANIM = {}, WALLBRIGHT = {}, FLOORSCROLL = {}, FLOORBRIGHT = {}, CEILBRIGHT = {};
      let JAMB = 0, WH = 1, FOGK = 0.1, FOGMIN = 0.12, VH = 152;
      const DYN = [];   // dynamic lights this frame {x,y,r,i}

      function initMap(w, h) {
        MW = w; MH = h; CW = w + 1;
        wallM = new Uint8Array(w * h); floorM = new Uint8Array(w * h); ceilM = new Uint8Array(w * h); seen = new Uint8Array(w * h);
        doorM = new Array(w * h).fill(null); doors = [];
        tileL = new Float32Array(w * h); lcBase = new Float32Array((w + 1) * (h + 1)); lc = new Float32Array((w + 1) * (h + 1));
      }
      function inMap(x, y) { return x >= 0 && y >= 0 && x < MW && y < MH; }
      function addDoor(x, y, vert, tex, key, secret) {
        const d = { x, y, vert, tex, key: key || 0, secret: !!secret, open: 0, st: 0, t: 0 };
        doorM[y * MW + x] = d; doors.push(d); return d;
      }
      function solid(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
        const t = ty * MW + tx; if (wallM[t]) return true;
        const d = doorM[t]; return !!(d && d.open < 0.9);
      }
      function opaque(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
        const t = ty * MW + tx; if (wallM[t]) return true;
        const d = doorM[t]; return !!(d && d.open < 0.5);
      }
      function blockedAt(x, y, r) {
        return solid(Math.floor(x - r), Math.floor(y - r)) || solid(Math.floor(x + r), Math.floor(y - r)) ||
          solid(Math.floor(x - r), Math.floor(y + r)) || solid(Math.floor(x + r), Math.floor(y + r));
      }
      function los(x0, y0, x1, y1) {
        const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 0.1);
        for (let i = 1; i < n; i++) { const x = x0 + dx * i / n, y = y0 + dy * i / n; if (opaque(Math.floor(x), Math.floor(y))) return false; }
        return true;
      }
      function updateDoors(dt, occupied) {
        for (const d of doors) {
          if (d.st === 1) { d.open += dt * (d.secret ? 0.7 : 2.2); if (d.open >= 1) { d.open = 1; d.st = 2; d.t = d.secret ? 1e9 : 4; } }
          else if (d.st === 2) { d.t -= dt; if (d.t <= 0) { if (occupied(d.x, d.y)) d.t = 0.5; else { d.st = 3; if (d.onClose) d.onClose(d); } } }
          else if (d.st === 3) { if (occupied(d.x, d.y)) { d.st = 1; } else { d.open -= dt * 2.2; if (d.open <= 0) { d.open = 0; d.st = 0; } } }
        }
      }
      function openDoor(d) { if (d.st === 0 || d.st === 3) { d.st = 1; return true; } if (d.st === 2) d.t = 4; return false; }

      // ---------- lighting ----------
      function buildLights(ambient, sources) {
        for (let t = 0; t < MW * MH; t++) tileL[t] = ambient[t];
        for (const s of sources) {
          const r = s.r, x0 = Math.max(0, Math.floor(s.x - r)), x1 = Math.min(MW - 1, Math.floor(s.x + r));
          const y0 = Math.max(0, Math.floor(s.y - r)), y1 = Math.min(MH - 1, Math.floor(s.y + r));
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const t = y * MW + x; if (wallM[t]) continue;
            const d = Math.hypot(x + 0.5 - s.x, y + 0.5 - s.y); if (d > r) continue;
            if (d > 1 && !losWalls(s.x, s.y, x + 0.5, y + 0.5)) continue;
            tileL[t] += s.i * (1 - d / r);
          }
        }
        for (let y = 0; y <= MH; y++) for (let x = 0; x <= MW; x++) {
          let sum = 0, n = 0;
          for (let j = -1; j <= 0; j++) for (let i = -1; i <= 0; i++) {
            const tx = x + i, ty = y + j; if (!inMap(tx, ty)) continue; const t = ty * MW + tx; if (wallM[t]) continue; sum += tileL[t]; n++;
          }
          lcBase[y * CW + x] = n ? sum / n : 0;
        }
      }
      function losWalls(x0, y0, x1, y1) {
        const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 0.2);
        for (let i = 1; i < n; i++) { const x = Math.floor(x0 + dx * i / n), y = Math.floor(y0 + dy * i / n); if (!inMap(x, y) || wallM[y * MW + x]) return false; }
        return true;
      }
      function applyDynLights() {
        lc.set(lcBase);
        for (const L of DYN) {
          const r = L.r, x0 = Math.max(0, Math.floor(L.x - r)), x1 = Math.min(MW, Math.ceil(L.x + r));
          const y0 = Math.max(0, Math.floor(L.y - r)), y1 = Math.min(MH, Math.ceil(L.y + r));
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const d = Math.hypot(x - L.x, y - L.y); if (d < r) lc[y * CW + x] += L.i * (1 - d / r);
          }
        }
        DYN.length = 0;
      }
      function lightAt(x, y) {
        let ix = Math.floor(x), iy = Math.floor(y);
        if (ix < 0) ix = 0; if (iy < 0) iy = 0; if (ix >= MW) ix = MW - 1; if (iy >= MH) iy = MH - 1;
        const fx = clamp(x - ix, 0, 1), fy = clamp(y - iy, 0, 1), i0 = iy * CW + ix;
        return (lc[i0] * (1 - fx) + lc[i0 + 1] * fx) * (1 - fy) + (lc[i0 + CW] * (1 - fx) + lc[i0 + CW + 1] * fx) * fy;
      }

      // ---------- the renderer ----------
      // cam: {x, y, a, ez (eye height), hz (horizon offset), t (time), flash (global light add)}
      function render3D(cam, sprites) {
        const px = cam.x, py = cam.y, ez = cam.ez, tm = cam.t, flash = cam.flash || 0;
        const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a), plX = -dirY * PLANE, plY = dirX * PLANE;
        const hz = VH / 2 + (cam.hz || 0);
        applyDynLights();
        for (let y = 0; y < VH; y++) {
          const dy = y + 0.5 - hz;
          rowD[y] = dy > 0 ? ez * FP / dy : (WH - ez) * FP / -dy;
          rowF[y] = Math.max(FOGMIN, 1 / (1 + rowD[y] * FOGK));
        }
        const wAnimFrame = (tm * 4) | 0;
        for (let x = 0; x < W; x++) {
          const camX = 2 * x / W - 1;
          const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
          let mx = Math.floor(px), my = Math.floor(py);
          const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
          let stepX, stepY, sdx, sdy;
          if (rdx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
          if (rdy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
          let dist = 30, side = 0, tex = null, u = 0, tEnter = 0, bright = false, lastDoor = false;
          // the player may stand in an open door tile: ignore it
          for (let i = 0; i < 96; i++) {
            let wasDoor = false;
            if (sdx < sdy) { tEnter = sdx; sdx += ddx; mx += stepX; side = 0; } else { tEnter = sdy; sdy += ddy; my += stepY; side = 1; }
            if (mx < 0 || my < 0 || mx >= MW || my >= MH) { dist = tEnter; tex = WALLTEX[1]; u = 0; break; }
            const t = my * MW + mx;
            seen[t] = 1;
            let w = wallM[t];
            if (w) {
              dist = tEnter;
              if (lastDoor && JAMB) w = JAMB;
              const an = WALLANIM[w]; if (an) w = an[wAnimFrame % an.length];
              tex = WALLTEX[w]; bright = !!WALLBRIGHT[w];
              if (side === 0) { u = py + dist * rdy; u -= Math.floor(u); if (rdx > 0) u = 1 - u; }
              else { u = px + dist * rdx; u -= Math.floor(u); if (rdy < 0) u = 1 - u; }
              break;
            }
            const d = doorM[t];
            if (d) {
              const tExit = Math.min(sdx, sdy);
              let tt, uu;
              if (d.vert) { if (rdx === 0) continue; tt = (mx + 0.5 - px) / rdx; uu = py + tt * rdy - my; }
              else { if (rdy === 0) continue; tt = (my + 0.5 - py) / rdy; uu = px + tt * rdx - mx; }
              if (tt < tEnter || tt > tExit) { wasDoor = true; lastDoor = wasDoor; continue; }
              if (uu < d.open) { lastDoor = true; continue; }
              dist = tt; u = uu - d.open; tex = WALLTEX[d.tex]; side = d.vert ? 0 : 1; break;
            }
            lastDoor = false;
          }
          if (dist < 0.02) dist = 0.02;
          zbuf[x] = dist;
          const lh = FP / dist, top = hz - (WH - ez) * lh, bot = hz + ez * lh;
          const hxw = px + rdx * dist, hyw = py + rdy * dist;
          let L = (lightAt(hxw - (side === 0 ? stepX * 0.01 : 0), hyw - (side === 1 ? stepY * 0.01 : 0)) + flash) * Math.max(FOGMIN, 1 / (1 + dist * FOGK));
          if (side) L *= 0.84;
          if (bright && L < 1) L = 1;
          let si = (L * 256) | 0; if (si > 460) si = 460;
          const y0 = Math.max(0, Math.ceil(top - 0.5)), y1 = Math.min(VH, Math.ceil(bot - 0.5));
          if (tex) {
            const tw = tex.w, th = tex.h, td = tex.d;
            const tx = Math.min(tw - 1, (u * tw) | 0);
            const step = th / (bot - top); let tv = (y0 + 0.5 - top) * step;
            for (let y = y0; y < y1; y++) {
              let vi = tv | 0; if (vi >= th) vi = th - 1;
              fb[y * W + x] = shd(td[vi * tw + tx], si); tv += step;
            }
          }
          // floor
          for (let y = Math.max(y1, 0); y < VH; y++) {
            if (y + 0.5 <= hz) continue;
            const d = rowD[y], wx = px + rdx * d, wy = py + rdy * d;
            const ix = Math.floor(wx), iy = Math.floor(wy);
            if (ix < 0 || iy < 0 || ix >= MW || iy >= MH) { fb[y * W + x] = 0xff000000; continue; }
            const fid = floorM[iy * MW + ix], ft = FLOORTEX[fid];
            let fu = wx - ix, fv = wy - iy;
            const scr = FLOORSCROLL[fid]; if (scr) { fu += tm * scr[0]; fv += tm * scr[1]; fu -= Math.floor(fu); fv -= Math.floor(fv); }
            const c = ft.d[((((fv * 64) | 0) & 63) << 6) | (((fu * 64) | 0) & 63)];
            const fx = wx - ix, fy = wy - iy, i0 = iy * CW + ix;
            let l = ((lc[i0] * (1 - fx) + lc[i0 + 1] * fx) * (1 - fy) + (lc[i0 + CW] * (1 - fx) + lc[i0 + CW + 1] * fx) * fy + flash) * rowF[y];
            if (FLOORBRIGHT[fid] && l < 1) l = 1;
            let s = (l * 256) | 0; if (s > 460) s = 460;
            fb[y * W + x] = shd(c, s);
          }
          // ceiling / sky
          const yc = Math.min(y0, VH);
          for (let y = 0; y < yc; y++) {
            if (y + 0.5 >= hz) break;
            const d = rowD[y], wx = px + rdx * d, wy = py + rdy * d;
            const ix = Math.floor(wx), iy = Math.floor(wy);
            if (ix < 0 || iy < 0 || ix >= MW || iy >= MH) { fb[y * W + x] = 0xff000000; continue; }
            const cid = ceilM[iy * MW + ix];
            if (cid === 255 && SKY) {
              let ang = cam.a + colAng[x]; ang = ((ang % TAU) + TAU) % TAU;
              const sx = ((ang / TAU) * SKY.w) | 0, sy = clamp((y - hz + SKY.h * 0.78) | 0, 0, SKY.h - 1);
              fb[y * W + x] = SKY.d[sy * SKY.w + sx];
              continue;
            }
            const ct = CEILTEX[cid] || CEILTEX[0];
            const fx = wx - ix, fy = wy - iy, i0 = iy * CW + ix;
            const c = ct.d[((((fy * 64) | 0) & 63) << 6) | (((fx * 64) | 0) & 63)];
            let l = ((lc[i0] * (1 - fx) + lc[i0 + 1] * fx) * (1 - fy) + (lc[i0 + CW] * (1 - fx) + lc[i0 + CW + 1] * fx) * fy + flash) * rowF[y];
            let s = (l * 230) | 0; if (s > 460) s = 460; if (CEILBRIGHT[cid] && s < 256) s = 256;
            fb[y * W + x] = shd(c, s);
          }
        }
        // sprites
        if (!sprites || !sprites.length) return;
        const invDet = 1 / (plX * dirY - dirX * plY);
        for (const s of sprites) {
          const sx = s.x - px, sy = s.y - py;
          s.tx = invDet * (dirY * sx - dirX * sy);
          s.ty = invDet * (-plY * sx + plX * sy);
        }
        sprites.sort((a, b) => b.ty - a.ty);
        for (const s of sprites) {
          if (s.ty < 0.08 || !s.tex) continue;
          const tex = s.tex, depth = s.ty;
          const hpx = s.h * FP / depth, wpx = hpx * (tex.w / tex.h) * (s.wscale || 1);
          const scx = (W / 2) * (1 + s.tx / depth);
          const botY = hz + (ez - (s.z || 0)) * FP / depth, topY = botY - hpx;
          const x0 = Math.max(0, Math.ceil(scx - wpx / 2 - 0.5)), x1 = Math.min(W, Math.ceil(scx + wpx / 2 - 0.5));
          const yy0 = Math.max(0, Math.ceil(topY - 0.5)), yy1 = Math.min(VH, Math.ceil(botY - 0.5));
          if (x0 >= x1 || yy0 >= yy1) continue;
          let L;
          if (s.full) L = 1.05; else { L = (lightAt(s.x, s.y) + flash) * Math.max(FOGMIN, 1 / (1 + depth * FOGK)); }
          let si = (L * 256) | 0; if (si > 460) si = 460;
          const fade = s.fade ? (s.fade * 16) | 0 : 0;
          const flashC = s.flashc || 0;
          const stepU = tex.w / wpx, stepV = tex.h / hpx, left = scx - wpx / 2;
          for (let x = x0; x < x1; x++) {
            if (depth >= zbuf[x]) continue;
            let tu = ((x + 0.5 - left) * stepU) | 0; if (tu >= tex.w) tu = tex.w - 1; if (tu < 0) tu = 0;
            if (s.flip) tu = tex.w - 1 - tu;
            let tv = (yy0 + 0.5 - topY) * stepV;
            for (let y = yy0; y < yy1; y++, tv += stepV) {
              let vi = tv | 0; if (vi >= tex.h) vi = tex.h - 1;
              const c = tex.d[vi * tex.w + tu]; if (!c) continue;
              if (fade && BAYER[(x & 3) | ((y & 3) << 2)] < fade) continue;
              fb[y * W + x] = flashC ? flashC : shd(c, si);
            }
          }
        }
      }

      // ---------- BFS distance field ----------
      function bfs(sx, sy, pass, maxD) {
        const dist = new Int16Array(MW * MH).fill(-1);
        if (!inMap(sx, sy)) return dist;
        const q = new Int32Array(MW * MH); let h = 0, t = 0;
        dist[sy * MW + sx] = 0; q[t++] = sy * MW + sx;
        while (h < t) {
          const c = q[h++], cx = c % MW, cy = (c / MW) | 0, d = dist[c];
          if (maxD && d >= maxD) continue;
          for (let k = 0; k < 4; k++) {
            const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
            if (!inMap(nx, ny)) continue; const n = ny * MW + nx;
            if (dist[n] >= 0 || !pass(nx, ny)) continue;
            dist[n] = d + 1; q[t++] = n;
          }
        }
        return dist;
      }

      // ---------- level generator: cell grid of rooms joined by a spanning tree, with key locks ----------
      // returns {cells, edges, start, exit, keyCells, path}. Tiles: wallM=1 everywhere solid, 0 carved.
      function genLayout(o) {
        const R = mkRng(o.seed), C = o.cols, Rw = o.rows, S = o.S, half = S >> 1;
        initMap(C * S + 1, Rw * S + 1);
        wallM.fill(1);
        const cells = [];
        for (let j = 0; j < Rw; j++) for (let i = 0; i < C; i++) cells.push({ i, j, id: j * C + i, cx: i * S + half, cy: j * S + half, nb: [], edges: [], par: -1, depth: 0, lock: 0, kind: 'room' });
        const at = (i, j) => (i >= 0 && j >= 0 && i < C && j < Rw) ? cells[j * C + i] : null;
        const edges = [];
        function link(a, b, type) { const e = { a: a.id, b: b.id, type, key: 0, horiz: a.j === b.j }; edges.push(e); a.edges.push(e); b.edges.push(e); return e; }
        // spanning tree by randomised DFS from a corner-ish start
        const start = at(o.startCorner ? 0 : R.int(C), o.startCorner ? Rw - 1 : R.int(Rw));
        const vis = new Set([start.id]), stack = [start];
        while (stack.length) {
          const c = stack[stack.length - 1];
          const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => at(c.i + dx, c.j + dy)).filter(n => n && !vis.has(n.id));
          if (!nbs.length) { stack.pop(); continue; }
          const n = R.pick(nbs); vis.add(n.id); n.par = c.id; n.depth = c.depth + 1; link(c, n, 'open'); stack.push(n);
        }
        // exit = deepest cell
        let exit = start; for (const c of cells) if (c.depth > exit.depth) exit = c;
        // main path
        const path = []; for (let c = exit; c.par >= 0; c = cells[c.par]) path.unshift(edges.find(e => (e.a === c.par && e.b === c.id)));
        const nLocks = Math.min(o.keys || 0, Math.max(0, Math.floor((path.length - 1) / 2)));
        for (let k = 0; k < nLocks; k++) { const e = path[Math.min(path.length - 1, Math.round((k + 1) * path.length / (nLocks + 1)))]; if (e.type === 'lock') continue; e.type = 'lock'; e.key = k + 1; }
        let locks = path.filter(e => e.type === 'lock'); locks.forEach((e, k) => e.key = k + 1);
        // lock levels
        const order = cells.slice().sort((a, b) => a.depth - b.depth);
        for (const c of order) if (c.par >= 0) { const e = c.edges.find(e => e.a === c.par && e.b === c.id); c.lock = cells[c.par].lock + (e.type === 'lock' ? 1 : 0); }
        const onPath = new Set([start.id]); for (const e of path) onPath.add(e.b);
        const isLeaf = c => c.edges.length === 1 && c !== start;
        // key cells
        const keyCells = [];
        for (let k = 0; k < locks.length; k++) {
          let cand = cells.filter(c => c.lock === k && c !== start && c !== exit && !keyCells.includes(c));
          let best = null, bs = -1;
          for (const c of cand) { const s = c.depth + (onPath.has(c.id) ? 0 : 6) + (isLeaf(c) ? 3 : 0); if (s > bs) { bs = s; best = c; } }
          if (!best) best = start;
          keyCells.push(best); best.kind = 'key';
        }
        // secret leaves
        let nSec = o.secrets || 0;
        for (const c of cells) {
          if (nSec <= 0) break;
          if (!isLeaf(c) || c === exit || keyCells.includes(c) || onPath.has(c.id)) continue;
          c.edges[0].type = 'secret'; c.kind = 'secret'; nSec--;
        }
        // extra loops inside the same lock level
        for (let n = 0; n < (o.loops || 0); n++) {
          const a = R.pick(cells), dirs = [[1, 0], [0, 1]], d = R.pick(dirs), b = at(a.i + d[0], a.j + d[1]);
          if (!b || a.lock !== b.lock || a.kind === 'secret' || b.kind === 'secret') continue;
          if (a.edges.some(e => e.a === b.id || e.b === b.id)) continue;
          link(a, b, 'open');
        }
        // hazards and doors on remaining open edges
        for (const e of edges) {
          if (e.type !== 'open') continue;
          const a = cells[e.a], b = cells[e.b];
          if (o.hazard && R() < o.hazard && a !== start && b !== start && a.kind !== 'secret' && b.kind !== 'secret') { e.type = 'hazard'; e.hz = R.pick(o.hazardKinds); }
          else if (R() < (o.doorFrac == null ? 0.6 : o.doorFrac)) e.type = 'door';
        }
        // room sizes
        for (const c of cells) {
          const big = (c === exit && o.bigExit) || (c === start && o.bigStart);
          const base = { x: c.i * S, y: c.j * S };
          let lo = { x: R.int(half - 1) + 1, y: R.int(half - 1) + 1 }, hi = { x: S - 1 - R.int(half - 1), y: S - 1 - R.int(half - 1) };
          if (big) { lo = { x: 1, y: 1 }; hi = { x: S - 1, y: S - 1 }; }
          // hazard edges need long corridors: shrink the room toward that side
          for (const e of c.edges) {
            if (e.type !== 'hazard' || big) continue;
            const other = cells[e.a === c.id ? e.b : e.a];
            if (other.i > c.i) hi.x = Math.min(hi.x, half + 1); if (other.i < c.i) lo.x = Math.max(lo.x, half - 1);
            if (other.j > c.j) hi.y = Math.min(hi.y, half + 1); if (other.j < c.j) lo.y = Math.max(lo.y, half - 1);
          }
          if (c.kind === 'secret') { lo = { x: half - 1, y: half - 1 }; hi = { x: half + 2, y: half + 2 }; }
          c.x0 = base.x + lo.x; c.y0 = base.y + lo.y; c.x1 = base.x + hi.x - 1; c.y1 = base.y + hi.y - 1;
          if (c.x1 < c.cx) c.x1 = c.cx; if (c.y1 < c.cy) c.y1 = c.cy; if (c.x0 > c.cx) c.x0 = c.cx; if (c.y0 > c.cy) c.y0 = c.cy;
          for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) wallM[y * MW + x] = 0;
        }
        // corridors
        for (const e of edges) {
          const a = cells[e.a], b = cells[e.b];
          e.tiles = [];
          if (e.horiz) { const y = a.cy, x0 = Math.min(a.cx, b.cx), x1 = Math.max(a.cx, b.cx); for (let x = x0; x <= x1; x++) { if (wallM[y * MW + x]) e.tiles.push([x, y]); wallM[y * MW + x] = 0; } e.bx = Math.max(a.i, b.i) * S; e.by = y; }
          else { const x = a.cx, y0 = Math.min(a.cy, b.cy), y1 = Math.max(a.cy, b.cy); for (let y = y0; y <= y1; y++) { if (wallM[y * MW + x]) e.tiles.push([x, y]); wallM[y * MW + x] = 0; } e.bx = x; e.by = Math.max(a.j, b.j) * S; }
        }
        return { cells, edges, start, exit, keyCells, path, locks, S, C, Rw, R };
      }
      // tiles of a room that are not on its centre cross (safe for solid decorations)
      function roomTiles(c, offCross) {
        const out = [];
        for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
          if (offCross && (x === c.cx || y === c.cy)) continue;
          out.push([x, y]);
        }
        return out;
      }

      VH = 160; WH = 1.5; FOGK = 0.075; FOGMIN = 0.1;
      const EYE = 0.62, GRAV = 5.6, JUMPV = 2.8;

      // ================= textures =================
      const T = {};
      function wallTex(fn) { WALLTEX.push(makeTex(64, 96, fn)); return WALLTEX.length - 1; }
      function blocks(x, y, bw, bh, s, base, mortar, var_) {
        const row = (y / bh) | 0, off = (row & 1) ? bw / 2 : 0, bx = ((x + off) / bw) | 0;
        const lx = (x + off) % bw, ly = y % bh;
        if (lx < 1 || ly < 1) return mortar;
        const n = hash(bx, row, s) * var_ + fbm(x / 9, y / 9, s) * 0.35;
        let c = dk(base, 0.7 + n);
        if (lx === 1 || ly === 1) c = dk(c, 1.18); if (lx === bw - 1 || ly === bh - 1) c = dk(c, 0.75);
        return c;
      }
      T.stone = wallTex((x, y) => blocks(x, y, 32, 16, 1, hx('#7c7f86'), hx('#3a3a40'), 0.35));
      T.sand = wallTex((x, y) => blocks(x, y, 21, 12, 2, hx('#b49563'), hx('#6c5532'), 0.3));
      T.wood = wallTex((x, y) => {
        const pl = (x / 16) | 0, g = fbm(x / 3, y / 22, 3 + pl) * 0.5 + Math.sin((y + pl * 17) / 5 + fbm(x / 6, y / 30, 5) * 4) * 0.08;
        let c = dk(hx('#6e4524'), 0.75 + g); if (x % 16 === 0) c = hx('#2d1a0c'); if (y % 48 < 2) c = hx('#3b2412');
        if (x % 16 === 8 && (y % 48 === 6 || y % 48 === 42)) c = hx('#c9b27a'); return c;
      });
      T.moss = wallTex((x, y) => { let c = blocks(x, y, 24, 14, 4, hx('#6f7468'), hx('#353a2c'), 0.4); const m = fbm(x / 10, y / 10, 9); if (m > 0.55 + y / 400) c = mixc(c, hx('#4b7a2c'), 0.6); return c; });
      T.brick = wallTex((x, y) => blocks(x, y, 16, 8, 6, hx('#8e3a2a'), hx('#4a3a33'), 0.3));
      T.metal = wallTex((x, y) => {
        const px = x % 32, py = y % 48; let c = dk(hx('#5d6670'), 0.8 + fbm(x / 20, y / 20, 7) * 0.4);
        if (px === 0 || py === 0) c = hx('#262b30'); else if (px === 1 || py === 1) c = hx('#8a959f');
        if ((px === 4 || px === 28) && (py === 4 || py === 44)) c = hx('#b8c0c8'); return c;
      });
      T.marble = wallTex((x, y) => {
        const v = Math.sin((x + y * 0.6) / 7 + fbm(x / 14, y / 14, 11) * 6) * 0.5 + 0.5;
        let c = mixc(hx('#d8d2c4'), hx('#8f8878'), v * v); if (y < 6 || y > 89) c = (y === 3 || y === 92) ? hx('#fff1a8') : hx('#b8902a');
        if (x % 32 === 0) c = dk(c, 0.75); return c;
      });
      T.banner = wallTex((x, y) => {
        let c = blocks(x, y, 32, 16, 1, hx('#7c7f86'), hx('#3a3a40'), 0.35);
        if (x >= 14 && x < 50 && y >= 8 && y < 84 + ((x % 6 < 3) ? 4 : 0)) {
          c = dk(hx('#9c1a16'), 0.85 + fbm(x / 4, y / 12, 3) * 0.3);
          if (x === 14 || x === 49) c = hx('#d6a531');
          const cx = x - 32, cy = y - 40;
          const tri = cy > -14 && cy < 10 && Math.abs(cx) < (cy + 14) * 0.62;
          const inner = cy > -8 && cy < 7 && Math.abs(cx) < (cy + 8) * 0.55;
          if (tri && !inner) c = hx('#f0c64a'); if (Math.hypot(cx, cy - 2) < 3) c = hx('#f0c64a');
        }
        return c;
      });
      function doorTex(stripe, lock) {
        return wallTex((x, y) => {
          let c = dk(hx('#6a6f78'), 0.85 + fbm(x / 30, y / 30, 21) * 0.3);
          if (x < 3 || x > 60 || y < 3 || y > 92) c = hx('#30343a');
          if (y % 24 === 12 && x > 4 && x < 60) c = hx('#3c4047');
          if ((x === 8 || x === 55) && y % 12 === 6) c = hx('#c2c8d0');
          if (stripe && (y > 40 && y < 56)) c = dk(stripe, 0.8 + (x % 8 < 4 ? 0.2 : 0));
          if (lock && x > 26 && x < 38 && y > 36 && y < 60) { c = hx('#1a1a1a'); if (x > 28 && x < 36 && y > 38 && y < 58) c = dk(stripe, 1.2); if (x > 30 && x < 34 && y > 44 && y < 52) c = hx('#000000'); }
          return c;
        });
      }
      T.door = doorTex(hx('#b03a1a'), false);
      T.dgold = doorTex(hx('#f2c21a'), true); T.dsilver = doorTex(hx('#c8d0dc'), true); T.dcopper = doorTex(hx('#c86a2c'), true);
      T.jamb = wallTex((x, y) => { let c = dk(hx('#4c5058'), 0.9 + fbm(x / 8, y / 8, 31) * 0.2); if (x % 16 < 2) c = hx('#2a2c30'); return c; });
      T.exit = wallTex((x, y) => {
        let c = T.metal ? WALLTEX[T.metal].d[y * 64 + x] : 0;
        if (x > 6 && x < 58 && y > 30 && y < 58) { c = hx('#141414'); }
        return c;
      });
      T.exitOff = WALLTEX.length; WALLTEX.push(makeTex(64, 96, (x, y) => WALLTEX[T.exit].d[y * 64 + x]));
      // "EXIT" lettering
      (function () {
        const draw = (id, col) => { const t = WALLTEX[id]; const s = 'EXIT'; for (let i = 0; i < 4; i++) { const g = FONT[s[i]]; for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (g[r] & (16 >> q)) for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) t.d[(34 + r * 3 + b) * 64 + 9 + i * 12 + q * 2 + a] = col; } };
        draw(T.exit, hx('#ff3322')); draw(T.exitOff, hx('#552222'));
      })();
      WALLBRIGHT[T.exit] = 1;
      JAMB = T.jamb;
      const KEYDOOR = [0, T.dgold, T.dsilver, T.dcopper];
      const KEYNAME = ['', 'GOLD', 'SILVER', 'COPPER'];
      const KEYCOL = [0, hx('#ffd21a'), hx('#dfe6f0'), hx('#d4783a')];

      function flTex(fn) { FLOORTEX.push(makeTex(64, 64, fn)); return FLOORTEX.length - 1; }
      function ceTex(fn) { CEILTEX.push(makeTex(64, 64, fn)); return CEILTEX.length - 1; }
      const FL = {};
      FL.slab = flTex((x, y) => { let c = dk(hx('#6e6a62'), 0.75 + fbm(x / 8, y / 8, 41, 8) * 0.45); if (x % 32 === 0 || y % 32 === 0) c = hx('#36332e'); return c; });
      FL.grass = flTex((x, y) => { const n = fbm(x / 6, y / 6, 42, 10.6667); return mixc(hx('#2f5c1c'), hx('#6c9a34'), n + hash(x, y, 3) * 0.25 - 0.1); });
      FL.planks = flTex((x, y) => { let c = dk(hx('#7a5230'), 0.7 + fbm(x / 30, y / 3, 43, 2.1333) * 0.4 + hash((x / 64) | 0, (y / 16) | 0, 4) * 0.2); if (y % 16 === 0) c = hx('#2e1c0e'); return c; });
      FL.checker = flTex((x, y) => { const k = ((x >> 4) + (y >> 4)) & 1; let c = k ? hx('#d9d3c6') : hx('#3b3a44'); return dk(c, 0.85 + fbm(x / 10, y / 10, 44, 6.4) * 0.25); });
      FL.lava = flTex((x, y) => { const n = fbm(x / 10, y / 10, 45, 6.4); const v = Math.sin(n * 12) * 0.5 + 0.5; return mixc(hx('#8a1500'), hx('#ffcf3a'), v * v); });
      FLOORSCROLL[FL.lava] = [0.08, 0.05]; FLOORBRIGHT[FL.lava] = 1;
      FL.pad = flTex((x, y) => {
        const d = Math.hypot(x - 31.5, y - 31.5); let c = dk(hx('#3b3f48'), 0.8 + hash(x, y, 9) * 0.2);
        if (d < 28) c = hx('#20242c'); if (d < 28 && d > 24) c = hx('#ffd23a'); if (d < 18 && d > 15) c = hx('#ff7a1a');
        if (d < 10) c = hx('#fff2a0'); if (x % 32 === 0 || y % 32 === 0) c = dk(c, 0.7); return c;
      });
      FLOORBRIGHT[FL.pad] = 1;
      FL.sand = flTex((x, y) => mixc(hx('#a98f5c'), hx('#d4bf88'), fbm(x / 5, y / 5, 46, 12.8) + hash(x, y, 5) * 0.2 - 0.1));
      FL.grate = flTex((x, y) => { let c = hx('#1a1c20'); if (x % 8 < 2 || y % 8 < 2) c = dk(hx('#6a727c'), 0.8 + hash(x >> 3, y >> 3, 7) * 0.3); return c; });
      FL.carpet = flTex((x, y) => { let c = dk(hx('#7a1418'), 0.85 + hash(x, y, 8) * 0.15); if (x < 4 || x > 59) c = hx('#c09030'); return c; });
      const CE = {};
      CE.plaster = ceTex((x, y) => { let c = dk(hx('#8c867a'), 0.8 + fbm(x / 7, y / 7, 51, 9.1428) * 0.3); if (x % 32 === 0 || y % 32 === 0) c = hx('#55504a'); return c; });
      CE.beams = ceTex((x, y) => { let c = dk(hx('#4a3020'), 0.8 + fbm(x / 20, y / 3, 52, 3.2) * 0.3); if (x % 32 < 6) c = dk(hx('#2a1a0f'), 0.9 + hash(x, y, 2) * 0.2); return c; });
      CE.metal = ceTex((x, y) => { let c = dk(hx('#4d545c'), 0.8 + fbm(x / 16, y / 16, 53, 4) * 0.3); if (x % 16 === 0 || y % 16 === 0) c = hx('#22262a'); return c; });
      CE.rock = ceTex((x, y) => dk(hx('#4a4038'), 0.6 + fbm(x / 8, y / 8, 54, 8) * 0.6));
      SKY = makeTex(512, 110, (x, y) => {
        const t = y / 110; let c = mixc(hx('#2a64c8'), hx('#bfe2ff'), t * t);
        const cl = fbm(x / 40, y / 12, 61, 12.8);
        if (cl > 0.52) c = mixc(c, hx('#ffffff'), Math.min(1, (cl - 0.52) * 4) * (1 - t * 0.6));
        if (y > 96) c = mixc(hx('#1d4f86'), hx('#2f6fa8'), hash(x, y, 1) * 0.5);
        const m = 92 - Math.abs(Math.sin(x / 31) * 9 + Math.sin(x / 13) * 4); if (y > m && y <= 96) c = dk(hx('#3b5a3a'), 0.8 + fbm(x / 6, y / 6, 62) * 0.3);
        return c;
      });

      // ================= sprites =================
      const C = n => hx(n);
      const BLK = C('#0c0c10');
      function human(o, pose) {
        const s = spr(32, 48), sk = C(o.skin || '#e0a878'), top = C(o.top), top2 = C(o.top2 || o.top), lg = C(o.legs), bt = C(o.boots || '#2a2018');
        const walk = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0, aim = pose === 'aim' || pose === 'fire', pain = pose === 'pain';
        const bob = walk ? 1 : 0;
        // legs
        if (o.robe) {
          for (let y = 24; y < 46; y++) { const w = 6 + (y - 24) * 0.3; sr(s, 16 - w, y, w * 2, 1, y > 43 ? dk(top, 0.6) : dk(top, 0.85 + ((y + walk * 3) % 7 === 0 ? -0.15 : 0))); }
          sr(s, 11 + walk * 2, 45, 4, 2, bt); sr(s, 17 - walk * 2, 45, 4, 2, bt);
        } else {
          sr(s, 11 + walk, 28 + bob, 4, 15, lg); sr(s, 17 - walk, 28 + bob, 4, 15, lg);
          sr(s, 10 + walk, 43, 5, 4, bt); sr(s, 17 - walk, 43, 5, 4, bt);
          sr(s, 11, 27 + bob, 10, 3, dk(lg, 0.8));
        }
        // torso
        sr(s, 10, 13 + bob, 12, 15, top); sr(s, 11, 14 + bob, 10, 1, dk(top, 1.2));
        if (o.vest) { sr(s, 11, 16 + bob, 10, 8, top2); sr(s, 15, 16 + bob, 2, 8, dk(top2, 0.7)); }
        if (o.belt !== false) sr(s, 10, 25 + bob, 12, 2, C(o.belt || '#2a2218'));
        if (o.sash) for (let i = 0; i < 12; i++) sr(s, 11 + i * 0.8, 13 + i + bob, 2, 1, C(o.sash));
        // arms
        if (pain) { sr(s, 6, 6, 4, 10, top); sr(s, 22, 6, 4, 10, top); sr(s, 6, 4, 4, 3, sk); sr(s, 22, 4, 4, 3, sk); }
        else if (aim) { sr(s, 8, 15 + bob, 4, 9, top); sr(s, 20, 15 + bob, 4, 9, top); sr(s, 12, 20 + bob, 8, 4, top); sr(s, 13, 22 + bob, 6, 3, sk); }
        else { sr(s, 7, 14 + bob, 3, 12, top); sr(s, 22, 14 + bob, 3, 12, top); sr(s, 7, 26 + bob, 3, 3, sk); sr(s, 22, 26 + bob, 3, 3, sk); }
        // head
        const hy = pain ? 3 : 2 + bob;
        se(s, 16, hy + 6, 4.5, 5.2, sk);
        sr(s, 14, hy + 5, 1, 1, BLK); sr(s, 18, hy + 5, 1, 1, BLK); sr(s, 15, hy + 9, 3, 1, dk(sk, 0.6));
        if (o.head === 'beret') { se(s, 15, hy + 2, 6, 2.5, C(o.hat)); sr(s, 19, hy + 1, 2, 2, C('#e0c040')); }
        else if (o.head === 'helmet') { se(s, 16, hy + 3, 5.5, 4, C(o.hat)); sr(s, 11, hy + 3, 11, 2, C(o.hat)); if (o.visor) sr(s, 12, hy + 4, 9, 3, C(o.visor)); }
        else if (o.head === 'hood') { se(s, 16, hy + 5, 6.5, 7, C(o.hat)); se(s, 16, hy + 7, 4, 4.5, dk(sk, 0.55)); sr(s, 14, hy + 6, 1, 1, C(o.eyes || '#ffcc33')); sr(s, 18, hy + 6, 1, 1, C(o.eyes || '#ffcc33')); }
        else if (o.head === 'cap') { sr(s, 11, hy, 10, 3, C(o.hat)); sr(s, 10, hy + 3, 12, 1, dk(C(o.hat), 0.7)); }
        else if (o.head === 'mask') { se(s, 16, hy + 5, 5, 5.5, C(o.hat)); sr(s, 13, hy + 5, 7, 2, C(o.visor || '#ff3030')); }
        // weapon
        if (o.gun === 'pistol' || o.gun === 'rifle') {
          if (aim) { const L = o.gun === 'rifle' ? 5 : 3; sr(s, 14, 18 + bob, 4, L + 2, C('#22252a')); se(s, 16, 18 + bob, 1.5, 1.5, BLK); if (pose === 'fire') { se(s, 16, 16 + bob, 4, 3.5, C('#ffe066')); se(s, 16, 16 + bob, 2, 2, C('#ffffff')); } }
          else if (o.gun === 'rifle') sl(s, 20, 26 + bob, 27, 14 + bob, C('#22252a'), 2);
          else sr(s, 23, 28 + bob, 2, 4, C('#22252a'));
        }
        if (o.gun === 'tube') {
          sr(s, 19, 9 + bob, 9, 6, C('#3a4a2a')); sr(s, 18, 8 + bob, 2, 8, C('#222222'));
          if (aim) { se(s, 22, 12 + bob, 3, 3, BLK); if (pose === 'fire') se(s, 22, 12 + bob, 5, 5, C('#ffb030')); }
        }
        if (o.gun === 'orb') { const g = pose === 'fire' ? C('#ffffa0') : C('#ff8a1a'); if (aim) { se(s, 16, 21 + bob, 3.5, 3.5, g); se(s, 16, 21 + bob, 1.6, 1.6, C('#ffffff')); } else { se(s, 8, 27 + bob, 2, 2, g); se(s, 23, 27 + bob, 2, 2, g); } }
        if (o.shield) { sr(s, 3, 14 + bob, 12, 22, C('#5a6068')); sr(s, 4, 15 + bob, 10, 20, C('#8a929c')); sr(s, 5, 18 + bob, 8, 2, C('#3a3e44')); sr(s, 8, 15 + bob, 2, 20, C('#6a7078')); }
        return outline(s, C('#101014'));
      }
      function humanSet(o) { return { stand: human(o, 'stand'), walk1: human(o, 'walk1'), walk2: human(o, 'walk2'), aim: human(o, 'aim'), fire: human(o, 'fire'), pain: human(o, 'pain') }; }
      const ESPR = {
        guard: humanSet({ top: '#7a6a3a', top2: '#5a4e2a', legs: '#5d532f', head: 'beret', hat: '#7a1c1c', gun: 'pistol' }),
        trooper: humanSet({ top: '#2c3e66', top2: '#4a5e8c', legs: '#1f2a44', head: 'helmet', hat: '#3a4a70', visor: '#66e0ff', vest: true, gun: 'rifle', skin: '#c88a60' }),
        monk: humanSet({ top: '#c0601a', legs: '#c0601a', robe: true, head: 'hood', hat: '#8c3e10', sash: '#f0d040', gun: 'orb', belt: '#5a2a08', skin: '#b07850' }),
        shield: humanSet({ top: '#5a5e66', top2: '#7a8088', legs: '#3c4048', head: 'helmet', hat: '#2c3036', visor: '#ff5040', vest: true, gun: 'pistol', shield: true }),
        rocket: humanSet({ top: '#4a5a2a', top2: '#6a7a3a', legs: '#3a4422', head: 'mask', hat: '#2a2a2a', visor: '#ff9020', gun: 'tube', vest: true })
      };
      // boss: the Abbot Supreme on a hovering throne
      function bossSpr(pose) {
        const s = spr(64, 80), gold = C('#e8b830'), robe = C('#5a1a6a'), robe2 = C('#7a2a8a'), sk = C('#d09a70');
        // throne disk
        se(s, 32, 70, 28, 7, C('#4a4e58')); se(s, 32, 68, 26, 5, C('#8a92a0')); se(s, 32, 74, 12, 3, C(pose === 'fire' ? '#ffffff' : '#60e0ff'));
        sr(s, 8, 20, 6, 46, C('#6a4a20')); sr(s, 50, 20, 6, 46, C('#6a4a20')); se(s, 11, 18, 5, 5, gold); se(s, 53, 18, 5, 5, gold);
        // robe body
        for (let y = 24; y < 66; y++) { const w = 12 + (y - 24) * 0.35; sr(s, 32 - w, y, w * 2, 1, (y % 9 === 0) ? robe2 : robe); }
        sr(s, 30, 24, 4, 42, gold);
        // arms
        const up = pose === 'fire' || pose === 'aim';
        if (up) { sr(s, 12, 14, 7, 16, robe); sr(s, 45, 14, 7, 16, robe); se(s, 15, 12, 5, 5, C('#ff9a20')); se(s, 49, 12, 5, 5, C('#ff9a20')); se(s, 15, 12, 2.5, 2.5, C('#ffffc0')); se(s, 49, 12, 2.5, 2.5, C('#ffffc0')); }
        else { sr(s, 14, 28, 7, 20, robe); sr(s, 43, 28, 7, 20, robe); se(s, 17, 49, 3, 3, sk); se(s, 46, 49, 3, 3, sk); }
        if (pose === 'pain') sr(s, 20, 30, 24, 4, C('#ffffff'));
        // head + tall mitre
        se(s, 32, 19, 7, 7, sk); sr(s, 28, 18, 2, 2, BLK); sr(s, 35, 18, 2, 2, BLK); sr(s, 28, 23, 9, 3, C('#f0f0f0'));
        for (let y = 0; y < 13; y++) { const w = 3 + y * 0.45; sr(s, 32 - w, y, w * 2, 1, y % 4 === 0 ? gold : C('#c02020')); }
        se(s, 32, 5, 2, 2, C('#40ff60'));
        return outline(s, C('#100810'));
      }
      const BOSS = { stand: bossSpr('stand'), walk1: bossSpr('stand'), walk2: bossSpr('stand'), aim: bossSpr('aim'), fire: bossSpr('fire'), pain: bossSpr('pain') };

      function item(w, h, fn) { const s = spr(w, h); fn(s); return outline(s, C('#0c0c0c')); }
      const ISPR = {
        medkit: item(20, 14, s => { sr(s, 1, 2, 18, 12, C('#e8e8e8')); sr(s, 8, 4, 4, 8, C('#d02020')); sr(s, 6, 6, 8, 4, C('#d02020')); sr(s, 7, 0, 6, 2, C('#888888')); }),
        noodle: item(16, 12, s => { se(s, 8, 7, 7, 4, C('#f0f0f0')); se(s, 8, 5, 6, 2, C('#e8c070')); sl(s, 10, 0, 14, 5, C('#8a5a2a')); sl(s, 12, 0, 15, 5, C('#8a5a2a')); }),
        tonic: item(10, 14, s => { sr(s, 2, 4, 6, 10, C('#30d060')); sr(s, 3, 1, 4, 3, C('#c0c0c0')); sr(s, 3, 6, 2, 5, C('#a0ffb0')); }),
        armor: item(18, 16, s => { sr(s, 2, 2, 14, 13, C('#4a6aa0')); sr(s, 0, 2, 3, 6, C('#4a6aa0')); sr(s, 15, 2, 3, 6, C('#4a6aa0')); sr(s, 6, 0, 6, 3, C('#2a2a2a')); sr(s, 8, 4, 2, 10, C('#7aa0e0')); }),
        coin: item(10, 10, s => { se(s, 5, 5, 4.5, 4.5, C('#ffd21a')); se(s, 5, 5, 2.5, 2.5, C('#c08a10')); }),
        gem: item(12, 12, s => { for (let y = 0; y < 11; y++) { const w = y < 4 ? 2 + y * 1.5 : 7 - (y - 4); sr(s, 6 - w, y, w * 2, 1, y < 4 ? C('#a0f0ff') : C('#30b0e0')); } }),
        idol: item(14, 20, s => { sr(s, 2, 16, 10, 4, C('#a07810')); se(s, 7, 10, 4, 6, C('#ffd21a')); se(s, 7, 4, 3, 3.5, C('#ffe060')); sr(s, 5, 3, 1, 1, C('#40ff60')); sr(s, 8, 3, 1, 1, C('#40ff60')); }),
        oneup: item(16, 16, s => { se(s, 8, 8, 7.5, 7.5, C('#ffd21a')); se(s, 8, 8, 5.5, 5.5, C('#d02020')); sr(s, 5, 5, 2, 6, C('#ffffff')); sr(s, 8, 5, 3, 6, C('#ffffff')); sr(s, 9, 6, 1, 2, C('#d02020')); }),
        twin: item(24, 12, s => { sr(s, 1, 2, 9, 3, C('#3a3e44')); sr(s, 6, 4, 3, 6, C('#5a3a20')); sr(s, 13, 2, 9, 3, C('#3a3e44')); sr(s, 18, 4, 3, 6, C('#5a3a20')); }),
        carbine: item(26, 10, s => { sr(s, 0, 3, 22, 3, C('#2a2c30')); sr(s, 14, 5, 3, 5, C('#2a2c30')); sr(s, 20, 2, 6, 5, C('#6a4424')); sr(s, 6, 5, 3, 4, C('#2a2c30')); }),
        god: item(18, 22, s => { se(s, 9, 11, 8.5, 10.5, C('#ffe878')); se(s, 9, 11, 6, 8, C('#fff8d0')); se(s, 9, 4, 6, 2, C('#ffd21a')); se(s, 9, 4, 4, 1, C('#fff8d0')); sr(s, 6, 9, 2, 2, C('#806010')); sr(s, 11, 9, 2, 2, C('#806010')); sr(s, 7, 14, 5, 1, C('#806010')); }),
        dog: item(22, 16, s => { se(s, 11, 9, 9, 6, C('#a06a3a')); se(s, 4, 4, 3, 5, C('#6a4020')); se(s, 18, 4, 3, 5, C('#6a4020')); se(s, 11, 12, 4, 3, C('#e0c09a')); se(s, 11, 10, 2, 1.5, BLK); sr(s, 7, 7, 2, 2, BLK); sr(s, 14, 7, 2, 2, BLK); sr(s, 10, 14, 3, 2, C('#e04060')); })
      };
      const MISSILES = {
        bazooka: { name: 'BAZOOKA', ammo: 10, col: '#7a8a3a' },
        heat: { name: 'HEAT-SEEKER', ammo: 7, col: '#c03020' },
        drunk: { name: 'DRUNK MISSILE', ammo: 5, col: '#8a40c0' },
        fire: { name: 'FIREBOMB', ammo: 5, col: '#ff7010' },
        split: { name: 'SPLIT MISSILE', ammo: 7, col: '#20a0c0' }
      };
      for (const k in MISSILES) {
        const m = MISSILES[k];
        ISPR['m_' + k] = item(28, 12, s => { sr(s, 2, 3, 22, 6, C(m.col)); sr(s, 0, 2, 3, 8, C('#222222')); sr(s, 22, 1, 4, 10, C('#333333')); sr(s, 10, 8, 3, 4, C('#222222')); sr(s, 4, 4, 16, 1, dk(C(m.col), 1.4)); });
      }
      ISPR.key = [null];
      for (let k = 1; k <= 3; k++) ISPR.key.push(item(12, 20, s => { se(s, 6, 4, 4.5, 4.5, KEYCOL[k]); se(s, 6, 4, 2, 2, 0); sr(s, 5, 8, 3, 11, KEYCOL[k]); sr(s, 8, 13, 3, 2, KEYCOL[k]); sr(s, 8, 16, 3, 2, KEYCOL[k]); }));
      const DSPR = {
        pillar: item(16, 48, s => { sr(s, 1, 0, 14, 4, C('#b8b0a0')); sr(s, 3, 4, 10, 40, C('#a8a090')); for (let y = 4; y < 44; y++) sr(s, 5 + (y % 2), y, 1, 1, C('#d8d0c0')); sr(s, 11, 4, 2, 40, C('#7a7468')); sr(s, 0, 44, 16, 4, C('#8a8478')); }),
        brazier: item(16, 22, s => { sr(s, 6, 12, 4, 10, C('#3a3a3a')); sr(s, 3, 20, 10, 2, C('#2a2a2a')); se(s, 8, 11, 7, 3, C('#5a4a3a')); se(s, 8, 7, 5, 5, C('#ff8a1a')); se(s, 8, 6, 3, 4, C('#ffe060')); }),
        brazier2: item(16, 22, s => { sr(s, 6, 12, 4, 10, C('#3a3a3a')); sr(s, 3, 20, 10, 2, C('#2a2a2a')); se(s, 8, 11, 7, 3, C('#5a4a3a')); se(s, 7, 6, 5, 6, C('#ff7010')); se(s, 9, 5, 3, 5, C('#ffe060')); }),
        statue: item(20, 44, s => { sr(s, 2, 36, 16, 8, C('#6a6a6a')); se(s, 10, 22, 6, 14, C('#9a9a92')); se(s, 10, 7, 4, 5, C('#a8a8a0')); sr(s, 3, 14, 3, 12, C('#8a8a82')); sr(s, 14, 10, 3, 14, C('#8a8a82')); sr(s, 15, 2, 2, 10, C('#c8a040')); }),
        barrel: item(16, 20, s => { sr(s, 1, 1, 14, 18, C('#8a5a2a')); sr(s, 0, 3, 16, 2, C('#4a4a4a')); sr(s, 0, 15, 16, 2, C('#4a4a4a')); sr(s, 4, 1, 1, 18, C('#a87a4a')); }),
        tree: item(32, 56, s => { sr(s, 14, 30, 5, 26, C('#5a3a1a')); se(s, 16, 18, 15, 13, C('#2c5c1c')); se(s, 12, 14, 9, 8, C('#3c7c2a')); se(s, 20, 22, 8, 7, C('#3c7c2a')); se(s, 14, 10, 4, 3, C('#5aa03a')); }),
        lamp: item(12, 20, s => { sl(s, 6, 0, 6, 8, C('#333333')); se(s, 6, 13, 5, 6, C('#5a4a2a')); se(s, 6, 13, 3.5, 4.5, C('#ffe8a0')); })
      };
      function gadSpr(on) { const s = spr(40, 12); se(s, 20, 5, 19, 4.5, C('#5a6270')); se(s, 20, 4, 17, 3, C('#a8b4c4')); se(s, 20, 9, 10, 2.5, C(on ? '#c0ffff' : '#40c0ff')); return outline(s, C('#101820')); }
      const GADSPR = [gadSpr(0), gadSpr(1)];
      function bladeSpr(f) {
        const s = spr(32, 40); sr(s, 14, 26, 4, 14, C('#3a3a3a')); sr(s, 10, 37, 12, 3, C('#2a2a2a'));
        const a0 = f * Math.PI / 8;
        se(s, 16, 14, 13, 13, C('#9aa4ae'));
        for (let k = 0; k < 8; k++) { const a = a0 + k * Math.PI / 4; const x = 16 + Math.cos(a) * 14, y = 14 + Math.sin(a) * 14; sl(s, 16 + Math.cos(a) * 11, 14 + Math.sin(a) * 11, x, y, C('#e8eef4'), 2); }
        se(s, 16, 14, 9, 9, C('#6a747e')); for (let k = 0; k < 3; k++) { const a = a0 * 2 + k * 2.09; sl(s, 16, 14, 16 + Math.cos(a) * 8, 14 + Math.sin(a) * 8, C('#c8d0d8')); }
        se(s, 16, 14, 2.5, 2.5, C('#d03020'));
        return outline(s, C('#101010'));
      }
      const BLADESPR = [0, 1, 2, 3].map(bladeSpr);
      function boom(f) { const s = spr(32, 32), r = 6 + f * 3.4; se(s, 16, 16, r, r, C(f < 3 ? '#ffe060' : '#ff7a10')); se(s, 16, 16, r * 0.7, r * 0.7, C(f < 2 ? '#ffffff' : '#ffb030')); if (f > 2) { for (let k = 0; k < 6; k++) se(s, 16 + Math.cos(k) * r * 0.7, 16 + Math.sin(k * 1.7) * r * 0.7, 3, 3, C('#5a4a3a')); } return s; }
      const BOOMSPR = [0, 1, 2, 3, 4].map(boom);
      const FLAMESPR = [0, 1].map(f => { const s = spr(16, 24); se(s, 8, 16, 7, 8, C('#ff5a10')); se(s, 8 + f, 12, 5, 9, C('#ff9a20')); se(s, 8 - f, 13, 3, 6, C('#ffe060')); return s; });
      const PROJSPR = {
        missile: (() => { const s = spr(14, 10); se(s, 7, 5, 6, 3.5, C('#6a7a3a')); se(s, 7, 5, 3, 2, C('#ffe080')); return outline(s, C('#101010')); })(),
        orb: (() => { const s = spr(12, 12); se(s, 6, 6, 5.5, 5.5, C('#ff7010')); se(s, 6, 6, 3, 3, C('#ffe8a0')); return s; })(),
        god: (() => { const s = spr(16, 16); se(s, 8, 8, 7.5, 7.5, C('#ffe060')); se(s, 8, 8, 5, 5, C('#ffffff')); return s; })(),
        bark: (() => { const s = spr(24, 16); for (let k = 0; k < 3; k++) { se(s, 12, 8, 4 + k * 4, 2 + k * 2.5, C(['#ffffff', '#c0e0ff', '#80b0ff'][k])); se(s, 12, 8, 3 + k * 4, 1 + k * 2.5, 0); } return s; })()
      };

      // first-person weapons (drawn at half size, blitted 2x)
      function fpPistol(fire, dx) {
        const s = spr(40, 34), sk = C(player ? player.skin : '#d8a070');
        sr(s, 14 + dx, 16, 12, 18, sk); sr(s, 12 + dx, 22, 3, 8, dk(sk, 0.85)); sr(s, 15 + dx, 20, 10, 2, dk(sk, 0.75));
        sr(s, 16 + dx, 4, 8, 14, C('#2c2f36')); sr(s, 17 + dx, 2, 6, 3, C('#44484f')); sr(s, 19 + dx, 2, 2, 1, C('#9aa0a8')); sr(s, 17 + dx, 8, 6, 1, C('#555a62'));
        if (fire) { se(s, 20 + dx, 1, 7, 4, C('#ffd040')); se(s, 20 + dx, 1, 3, 2, C('#ffffff')); }
        return outline(s, C('#0a0a0a'));
      }
      function fpCarbine(fire) {
        const s = spr(48, 40), sk = C(player ? player.skin : '#d8a070');
        sr(s, 18, 4, 10, 30, C('#2a2c30')); sr(s, 20, 0, 6, 6, C('#3a3c42')); sr(s, 21, 0, 4, 2, C('#111111'));
        sr(s, 16, 18, 14, 8, C('#5a3a20')); sr(s, 28, 24, 14, 16, sk); sr(s, 8, 24, 12, 16, sk); sr(s, 18, 32, 10, 8, C('#4a2a14'));
        sr(s, 14, 10, 18, 3, C('#3a3c42'));
        if (fire) { se(s, 23, 0, 8, 5, C('#ffd040')); se(s, 23, 0, 3, 2, C('#ffffff')); }
        return outline(s, C('#0a0a0a'));
      }
      function fpLauncher(fire, col) {
        const s = spr(56, 40), sk = C(player ? player.skin : '#d8a070');
        sr(s, 24, 2, 18, 38, C(col)); sr(s, 24, 2, 18, 3, C('#222222')); se(s, 33, 3, 7, 2, C('#0a0a0a'));
        sr(s, 27, 6, 3, 34, dk(C(col), 1.35)); sr(s, 38, 6, 2, 34, dk(C(col), 0.6));
        sr(s, 14, 26, 12, 14, sk); sr(s, 18, 22, 8, 5, C('#2a2a2a'));
        if (fire) { se(s, 33, 2, 12, 5, C('#ffb030')); se(s, 33, 2, 6, 3, C('#ffffff')); }
        return outline(s, C('#0a0a0a'));
      }
      function fpGod(fire) {
        const s = spr(44, 40);
        se(s, 22, 26, 13, 14, C('#ffe8a0')); for (let k = 0; k < 4; k++) sr(s, 11 + k * 6, 4 + (k === 0 || k === 3 ? 6 : 0), 5, 22, C('#ffe8a0'));
        sr(s, 3, 22, 8, 5, C('#ffe8a0'));
        se(s, 22, 26, 7, 7, C(fire ? '#ffffff' : '#fff8d8'));
        return outline(s, C(fire ? '#ffffff' : '#c09020'));
      }
      function fpDog(fire) {
        const s = spr(64, 30);
        se(s, 32, 30, 22, 16, C('#a06a3a')); se(s, 32, 22, 9, 6, C('#e0c09a')); se(s, 32, 17, 5, 3.5, BLK); sr(s, 31, 14, 2, 1, C('#ffffff'));
        if (fire) { se(s, 32, 28, 7, 4, C('#5a0a0a')); sr(s, 27, 25, 2, 3, C('#ffffff')); sr(s, 35, 25, 2, 3, C('#ffffff')); }
        se(s, 8, 28, 7, 5, C('#a06a3a')); se(s, 56, 28, 7, 5, C('#a06a3a'));
        return outline(s, C('#1a0e06'));
      }

      // ================= characters =================
      const CHARS = [
        { name: 'ACE RAMIREZ', role: 'COMMANDO', hp: 100, speed: 1.0, acc: 1.0, jump: 1.0, skin: '#c88a5a', suit: '#4a6a3a', hair: '#2a1a10', blurb: 'ALL-ROUNDER. NO WEAKNESSES, NO EXCUSES.' },
        { name: 'JUNO STEELE', role: 'SCOUT', hp: 80, speed: 1.22, acc: 0.95, jump: 1.08, skin: '#f0c49a', suit: '#3a4a7a', hair: '#e0b030', blurb: 'FASTEST BOOTS ON THE ISLAND.' },
        { name: 'BIG MOE KOWALSKI', role: 'HEAVY', hp: 145, speed: 0.86, acc: 0.95, jump: 0.94, skin: '#e8b090', suit: '#6a3a2a', hair: '#8a3a1a', blurb: 'SOAKS UP PUNISHMENT LIKE A SPONGE.' },
        { name: 'PRIYA VANCE', role: 'MARKSMAN', hp: 90, speed: 1.05, acc: 1.3, jump: 1.0, skin: '#a8724a', suit: '#5a2a5a', hair: '#1a1010', blurb: 'EVERY BULLET HITS HARDER.' },
        { name: 'DEX OKAFOR', role: 'ACROBAT', hp: 100, speed: 1.1, acc: 1.0, jump: 1.18, skin: '#6a4028', suit: '#2a6a6a', hair: '#0a0a0a', blurb: 'BIGGEST AIR OFF EVERY JUMP PAD.' }
      ];
      function portrait(ch) {
        const s = spr(32, 32), sk = C(ch.skin);
        sr(s, 0, 0, 32, 32, C('#1a1e26'));
        sr(s, 4, 24, 24, 8, C(ch.suit)); sr(s, 13, 22, 6, 4, dk(sk, 0.85));
        se(s, 16, 14, 8, 10, sk); se(s, 16, 7, 8.5, 4.5, C(ch.hair));
        sr(s, 11, 13, 3, 2, C('#ffffff')); sr(s, 18, 13, 3, 2, C('#ffffff')); sr(s, 12, 13, 2, 2, BLK); sr(s, 19, 13, 2, 2, BLK);
        sr(s, 10, 11, 5, 1, C(ch.hair)); sr(s, 17, 11, 5, 1, C(ch.hair)); sr(s, 13, 20, 6, 1, dk(sk, 0.55)); sr(s, 15, 15, 2, 3, dk(sk, 0.8));
        return s;
      }
      CHARS.forEach(c => c.pic = portrait(c));

      // ================= levels =================
      const LEVELS = [
        { name: 'THE LANDING', blurb: 'THE BEACHHEAD IS OURS. NOW CRACK THE OUTER WALLS OF THE ABBOT\'S ISLAND FORTRESS.', cols: 3, rows: 3, keys: 1, theme: 'beach', foes: ['guard'], density: 1.2, hazard: 0.35, hk: ['lava'], seed: 1101 },
        { name: 'OUTER BASTION', blurb: 'GUARD BARRACKS AND GUN TOWERS. WATCH FOR THE STRIKE TROOPERS.', cols: 4, rows: 3, keys: 1, theme: 'stone', foes: ['guard', 'guard', 'trooper'], density: 1.4, hazard: 0.35, hk: ['lava', 'gad'], seed: 2202 },
        { name: 'THE GATEHOUSE', blurb: 'THE GATE IS RUN BY THE EMBER MONKS. THEIR FIRE ORBS HURT. DODGE THEM.', cols: 4, rows: 4, keys: 2, theme: 'wood', foes: ['guard', 'trooper', 'monk'], density: 1.6, hazard: 0.35, hk: ['lava', 'gad', 'blade'], seed: 3303 },
        { name: 'CLOISTER GARDENS', blurb: 'BULWARK GUARDS CARRY SHIELDS. MISSILES GO STRAIGHT THROUGH THEM.', cols: 4, rows: 4, keys: 2, theme: 'garden', foes: ['guard', 'trooper', 'monk', 'shield'], density: 1.7, hazard: 0.4, hk: ['lava', 'gad', 'blade'], seed: 4404 },
        { name: 'FURNACE HALLS', blurb: 'THE FORGES BENEATH THE KEEP. THE FLOOR IS LAVA. LITERALLY.', cols: 5, rows: 4, keys: 2, theme: 'furnace', foes: ['trooper', 'monk', 'rocket', 'guard'], density: 1.8, hazard: 0.5, hk: ['lava', 'lava', 'gad'], seed: 5505 },
        { name: 'THE BLADEWORKS', blurb: 'SOMEBODY HERE REALLY LIKES SPINNING BLADES. KEEP YOUR FINGERS.', cols: 5, rows: 5, keys: 3, theme: 'metal', foes: ['trooper', 'shield', 'rocket', 'monk'], density: 1.9, hazard: 0.5, hk: ['blade', 'blade', 'gad', 'lava'], seed: 6606 },
        { name: 'THE HIGH SPIRE', blurb: 'THE ABBOT\'S ELITE GUARD THE STAIRS TO THE SANCTUM. ALMOST THERE.', cols: 5, rows: 5, keys: 3, theme: 'marble', foes: ['trooper', 'shield', 'rocket', 'monk', 'monk'], density: 2.1, hazard: 0.45, hk: ['lava', 'gad', 'blade'], seed: 7707 },
        { name: 'SANCTUM OF THE ABBOT', blurb: 'THE ABBOT SUPREME AWAITS ON HIS FLOATING THRONE. END THIS.', cols: 4, rows: 4, keys: 2, theme: 'sanctum', foes: ['monk', 'shield', 'trooper', 'rocket'], density: 1.8, hazard: 0.4, hk: ['lava', 'gad', 'blade'], seed: 8808, boss: true }
      ];
      const THEMES = {
        beach: { walls: [T.moss, T.sand, T.stone], floors: [FL.sand, FL.slab], ceils: [CE.plaster], outdoor: 0.6, amb: 0.75, corr: [T.stone, FL.slab, CE.plaster] },
        stone: { walls: [T.stone, T.banner, T.sand], floors: [FL.slab, FL.planks], ceils: [CE.plaster, CE.beams], outdoor: 0.3, amb: 0.55, corr: [T.stone, FL.slab, CE.plaster] },
        wood: { walls: [T.wood, T.stone, T.banner], floors: [FL.planks, FL.carpet, FL.slab], ceils: [CE.beams], outdoor: 0.2, amb: 0.5, corr: [T.wood, FL.planks, CE.beams] },
        garden: { walls: [T.marble, T.moss, T.banner], floors: [FL.grass, FL.checker], ceils: [CE.plaster], outdoor: 0.5, amb: 0.65, corr: [T.marble, FL.checker, CE.plaster] },
        furnace: { walls: [T.brick, T.metal], floors: [FL.grate, FL.slab], ceils: [CE.rock, CE.metal], outdoor: 0, amb: 0.32, corr: [T.brick, FL.grate, CE.rock] },
        metal: { walls: [T.metal, T.brick], floors: [FL.grate, FL.checker], ceils: [CE.metal], outdoor: 0.1, amb: 0.45, corr: [T.metal, FL.grate, CE.metal] },
        marble: { walls: [T.marble, T.banner, T.wood], floors: [FL.checker, FL.carpet], ceils: [CE.plaster, CE.beams], outdoor: 0.25, amb: 0.6, corr: [T.marble, FL.carpet, CE.plaster] },
        sanctum: { walls: [T.banner, T.marble, T.brick], floors: [FL.carpet, FL.checker, FL.grate], ceils: [CE.rock, CE.beams], outdoor: 0.15, amb: 0.42, corr: [T.brick, FL.carpet, CE.rock] }
      };

      // ================= game state =================
      let mode = 'attract', attractT = 0, coinFlash = 0, modeT = 0;
      let hi = api.getHiScore(50000);
      let player = null, level = 0, lv = null;
      let actors = [], items = [], projs = [], fx = [], gads = [], blades = [], decor = [];
      let msgs = [], hurtFlash = 0, pickFlash = 0, shake = 0, showMap = false, selIdx = 0;
      let tally = null, deathT = 0, lavaHurtT = 0;
      const DBG = { god: false };

      function sndShot(k) {
        if (k === 0) { api.audio.noise(0.09, { vol: 0.18, freq: 2400, type: 'bandpass' }); api.audio.tone(220, 0.07, { type: 'square', vol: 0.06, slideTo: 70 }); }
        else { api.audio.noise(0.06, { vol: 0.15, freq: 3000, type: 'bandpass' }); api.audio.tone(260, 0.05, { type: 'square', vol: 0.05, slideTo: 90 }); }
      }
      const SND = {
        missile() { api.audio.noise(0.45, { vol: 0.16, freq: 3000, slideTo: 300 }); api.audio.tone(320, 0.35, { type: 'sawtooth', vol: 0.06, slideTo: 110 }); },
        boom() { api.audio.noise(0.7, { vol: 0.3, freq: 900, slideTo: 60 }); api.audio.tone(90, 0.5, { type: 'triangle', vol: 0.18, slideTo: 30 }); },
        door() { api.audio.tone(90, 0.35, { type: 'sawtooth', vol: 0.06, slideTo: 150 }); api.audio.noise(0.3, { vol: 0.05, freq: 500 }); },
        locked() { api.audio.tone(140, 0.12, { type: 'square', vol: 0.1 }); api.audio.tone(110, 0.15, { type: 'square', vol: 0.1, delay: 0.12 }); },
        pick() { api.audio.melody([[880, 0.04], [1320, 0.07]], { type: 'square', vol: 0.09 }); },
        treasure() { api.audio.melody([[1047, 0.04], [1319, 0.04], [1568, 0.08]], { type: 'triangle', vol: 0.14 }); },
        key() { api.audio.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.14]], { type: 'square', vol: 0.1 }); },
        weapon() { api.audio.melody([[392, 0.05], [523, 0.05], [784, 0.12]], { type: 'sawtooth', vol: 0.1 }); },
        jump() { api.audio.tone(180, 0.4, { type: 'square', vol: 0.1, slideTo: 1100 }); },
        land() { api.audio.noise(0.08, { vol: 0.1, freq: 400 }); },
        hurt() { api.audio.tone(200, 0.15, { type: 'square', vol: 0.12, slideTo: 90 }); },
        alert(t) { const f = t === 'monk' ? 330 : t === 'boss' ? 110 : 440; api.audio.tone(f, 0.08, { type: 'square', vol: 0.08 }); api.audio.tone(f * 1.5, 0.12, { type: 'square', vol: 0.08, delay: 0.08 }); },
        die() { api.audio.tone(320, 0.45, { type: 'sawtooth', vol: 0.09, slideTo: 60 }); },
        pdie() { api.audio.melody([[392, 0.15], [330, 0.15], [262, 0.15], [196, 0.4]], { type: 'square', vol: 0.12 }); },
        orb() { api.audio.tone(600, 0.25, { type: 'sine', vol: 0.1, slideTo: 200 }); },
        god() { api.audio.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [1319, 0.3]], { type: 'triangle', vol: 0.16 }); },
        bark() { api.audio.noise(0.12, { vol: 0.22, freq: 1200, type: 'bandpass' }); api.audio.tone(520, 0.12, { type: 'sawtooth', vol: 0.12, slideTo: 260 }); },
        blade() { api.audio.tone(900, 0.12, { type: 'sawtooth', vol: 0.03, slideTo: 700 }); },
        secret() { api.audio.melody([[523, 0.08], [784, 0.08], [659, 0.08], [1047, 0.2]], { type: 'triangle', vol: 0.13 }); },
        exit() { api.audio.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.12], [784, 0.08], [1047, 0.3]], { type: 'square', vol: 0.12 }); },
        oneup() { api.audio.melody([[659, 0.08], [784, 0.08], [1319, 0.08], [1047, 0.08], [1175, 0.08], [1568, 0.25]], { type: 'square', vol: 0.12 }); }
      };
      function title() { api.audio.melody([[220, 0.14], [220, 0.07], [262, 0.14], [294, 0.14], [330, 0.28], [294, 0.14], [262, 0.14], [330, 0.42], [392, 0.14], [440, 0.5]], { type: 'sawtooth', vol: 0.07 }); }

      function say(t, dur) { msgs.unshift({ t, life: dur || 2.5 }); if (msgs.length > 3) msgs.length = 3; }
      function addScore(n) {
        const before = player.score; player.score += n;
        if (Math.floor(player.score / 50000) > Math.floor(before / 50000)) { player.lives++; say('EXTRA LIFE!'); SND.oneup(); }
      }

      // ================= level building =================
      const ENEMY = {
        guard: { hp: 25, speed: 1.5, range: 10, cool: 1.1, dmg: [4, 9], kind: 'hit', pts: 200, h: 0.86, react: 0.6 },
        trooper: { hp: 45, speed: 2.0, range: 11, cool: 0.9, dmg: [3, 7], burst: 3, kind: 'hit', pts: 400, h: 0.9, react: 0.4 },
        monk: { hp: 40, speed: 1.35, range: 12, cool: 1.6, dmg: [10, 14], kind: 'orb', pts: 500, h: 0.88, react: 0.5 },
        shield: { hp: 85, speed: 1.1, range: 9, cool: 1.3, dmg: [3, 6], pellets: 3, kind: 'hit', pts: 700, h: 0.92, react: 0.5, armor: true },
        rocket: { hp: 50, speed: 1.3, range: 13, cool: 2.4, dmg: [20, 30], kind: 'missile', pts: 600, h: 0.88, react: 0.7 },
        boss: { hp: 1600, speed: 0.9, range: 20, cool: 1.0, dmg: [12, 16], kind: 'boss', pts: 25000, h: 1.35, react: 0.2 }
      };
      function lavaAt(tx, ty) { return inMap(tx, ty) && floorM[ty * MW + tx] === FL.lava; }
      function buildLevel(n) {
        const L = LEVELS[n], th = THEMES[L.theme];
        const G = genLayout({ seed: L.seed, cols: L.cols, rows: L.rows, S: 10, keys: L.keys, secrets: 1 + (n >> 2), loops: 1 + (n >> 1), hazard: L.hazard, hazardKinds: L.hk, doorFrac: 0.55, bigExit: !!L.boss, bigStart: false });
        const R = G.R;
        actors = []; items = []; projs = []; fx = []; gads = []; blades = []; decor = [];
        const ambient = new Float32Array(MW * MH), lights = [];
        // per-cell themes
        for (const c of G.cells) {
          c.out = c !== G.start && R() < th.outdoor;
          c.wt = c.out ? (R() < 0.5 ? T.moss : th.walls[0]) : R.pick(th.walls);
          c.ft = c.out ? (L.theme === 'beach' ? FL.sand : FL.grass) : R.pick(th.floors);
          c.ct = c.out ? 255 : R.pick(th.ceils);
          if (L.boss && c === G.exit) { c.out = false; c.wt = T.banner; c.ft = FL.checker; c.ct = CE.rock; }
        }
        const cellOf = (x, y) => G.cells[Math.min(G.Rw - 1, Math.floor(y / 10)) * G.C + Math.min(G.C - 1, Math.floor(x / 10))];
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
          const t = y * MW + x, c = cellOf(x, y);
          const inRoom = x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1;
          if (wallM[t]) {
            // a wall takes the texture of the room it faces
            let wt = th.corr[0];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inMap(nx, ny) || wallM[ny * MW + nx]) continue; const nc = cellOf(nx, ny); if (nx >= nc.x0 && nx <= nc.x1 && ny >= nc.y0 && ny <= nc.y1) { wt = nc.wt; break; } }
            wallM[t] = wt;
          } else if (inRoom) { floorM[t] = c.ft; ceilM[t] = c.ct; ambient[t] = c.out ? 0.95 : th.amb; }
          else { floorM[t] = th.corr[1]; ceilM[t] = th.corr[2]; ambient[t] = th.amb * 0.85; }
        }
        // banners only every few tiles
        for (let t = 0; t < MW * MH; t++) if (wallM[t] === T.banner && hash(t, 3, n) < 0.6) wallM[t] = T.stone;
        // edges: doors, locks, secrets, hazards
        lv = { n, G, exitTile: null, kills: 0, total: 0, treasure: 0, ttotal: 0, secrets: 0, stotal: 0, time: 0, bossDead: !L.boss, boss: null };
        for (const e of G.edges) {
          const t = e.by * MW + e.bx;
          if (e.type === 'door') addDoor(e.bx, e.by, e.horiz, T.door, 0, false);
          else if (e.type === 'lock') addDoor(e.bx, e.by, e.horiz, KEYDOOR[e.key], e.key, false);
          else if (e.type === 'secret') { const wt = wallM[e.horiz ? t - MW : t - 1] || th.corr[0]; addDoor(e.bx, e.by, e.horiz, wt, 0, true); lv.stotal++; }
          else if (e.type === 'hazard') {
            const tl = e.tiles, Ln = tl.length;
            let kind = e.hz;
            if (kind === 'lava' && Ln < 6) kind = Ln >= 5 ? 'gad' : 'blade';
            if (kind === 'gad' && Ln < 5) kind = 'blade';
            if (kind === 'blade' && Ln < 3) continue;
            if (kind === 'lava') {
              const a = Math.floor((Ln - 3) / 2);
              for (let i = a; i < a + 3; i++) { floorM[tl[i][1] * MW + tl[i][0]] = FL.lava; lights.push({ x: tl[i][0] + 0.5, y: tl[i][1] + 0.5, r: 2.6, i: 0.28 }); }
              floorM[tl[a - 1][1] * MW + tl[a - 1][0]] = FL.pad; floorM[tl[a + 3][1] * MW + tl[a + 3][0]] = FL.pad;
            } else if (kind === 'gad') {
              for (let i = 1; i < Ln - 1; i++) { floorM[tl[i][1] * MW + tl[i][0]] = FL.lava; lights.push({ x: tl[i][0] + 0.5, y: tl[i][1] + 0.5, r: 2.2, i: 0.22 }); }
              gads.push({ ax: tl[0][0] + 0.5, ay: tl[0][1] + 0.5, bx: tl[Ln - 1][0] + 0.5, by: tl[Ln - 1][1] + 0.5, x: tl[0][0] + 0.5, y: tl[0][1] + 0.5, p: 0, dir: 1, wait: 1.5, dx: 0, dy: 0 });
            } else {
              blades.push({ ax: tl[0][0] + 0.5, ay: tl[0][1] + 0.5, bx: tl[Ln - 1][0] + 0.5, by: tl[Ln - 1][1] + 0.5, p: R(), dir: 1, speed: 0.45 + n * 0.03, x: 0, y: 0, f: 0, hit: 0 });
            }
          }
        }
        // exit switch in the exit room
        const ex = G.exit, cand = [];
        for (let x = ex.x0; x <= ex.x1; x++) { if (x !== ex.cx) { cand.push([x, ex.y0 - 1]); cand.push([x, ex.y1 + 1]); } }
        for (let y = ex.y0; y <= ex.y1; y++) { if (y !== ex.cy) { cand.push([ex.x0 - 1, y]); cand.push([ex.x1 + 1, y]); } }
        const good = cand.filter(([x, y]) => inMap(x, y) && wallM[y * MW + x] && !doorM[y * MW + x]);
        const et = good.length ? good[R.int(good.length)] : [ex.x0 - 1, ex.y0];
        wallM[et[1] * MW + et[0]] = L.boss ? T.exitOff : T.exit; lv.exitTile = et;
        lights.push({ x: et[0] + 0.5, y: et[1] + 0.5, r: 3, i: 0.45 });
        // decorate rooms
        const used = new Set();
        const key = (x, y) => y * MW + x;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = et[0] + dx, y = et[1] + dy; if (inMap(x, y)) used.add(key(x, y)); }
        const occupyOK = (x, y) => !used.has(key(x, y)) && !wallM[key(x, y)] && !doorM[key(x, y)] && floorM[key(x, y)] !== FL.lava && floorM[key(x, y)] !== FL.pad;
        for (const c of G.cells) {
          const big = (c.x1 - c.x0 >= 4 && c.y1 - c.y0 >= 4);
          const off = roomTiles(c, true);
          const rollRoom = R();
          if (c === G.exit && L.boss) {
            // the sanctum: pillars ring, braziers
            for (const [x, y] of off) if ((x - c.x0) % 3 === 1 && (y - c.y0) % 3 === 1 && hash(x, y, 5) < 0.5) { decor.push({ x: x + 0.5, y: y + 0.5, tex: DSPR.pillar, h: 1.5, solid: true }); used.add(key(x, y)); }
          } else if (c !== G.start && big && rollRoom < 0.18 + n * 0.02 && c.kind === 'room') {
            // fire-pit room: off-cross tiles become lava, a gem sits in the fire
            let gem = null;
            for (const [x, y] of off) { if (Math.abs(x - c.cx) <= 1 || Math.abs(y - c.cy) <= 1) continue; floorM[key(x, y)] = FL.lava; used.add(key(x, y)); lights.push({ x: x + 0.5, y: y + 0.5, r: 2.2, i: 0.2 }); if (!gem || R() < 0.2) gem = [x, y]; }
            if (gem) { items.push({ x: gem[0] + 0.5, y: gem[1] + 0.5, type: 'idol', tex: ISPR.idol, h: 0.32 }); lv.ttotal++; }
          } else if (c !== G.start && big && rollRoom < 0.36 && n >= 2) {
            // blade room: a blade sweeps across the room
            const y = R() < 0.5 ? c.y0 : c.y1;
            if (y !== c.cy) blades.push({ ax: c.x0 + 0.5, ay: y + 0.5, bx: c.x1 + 0.5, by: y + 0.5, p: R(), dir: 1, speed: 0.35 + n * 0.02, x: 0, y: 0, f: 0, hit: 0 });
            const x2 = R() < 0.5 ? c.x0 : c.x1;
            if (x2 !== c.cx && n >= 4) blades.push({ ax: x2 + 0.5, ay: c.y0 + 0.5, bx: x2 + 0.5, by: c.y1 + 0.5, p: R(), dir: 1, speed: 0.3 + n * 0.02, x: 0, y: 0, f: 0, hit: 0 });
            for (const b of blades) for (let i = 0; i <= 8; i++) used.add(key(Math.floor(b.ax + (b.bx - b.ax) * i / 8), Math.floor(b.ay + (b.by - b.ay) * i / 8)));
          }
          // solid decorations off the cross, never 8-adjacent to each other
          const nDec = c.out ? 3 : 2;
          for (let k = 0; k < nDec * 3 && off.length; k++) {
            const [x, y] = R.pick(off);
            if (!occupyOK(x, y)) continue;
            let near = false; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (decor.some(d => d.solid && Math.floor(d.x) === x + i && Math.floor(d.y) === y + j)) near = true;
            if (near) continue;
            let dtype;
            if (c.out) dtype = R() < 0.6 ? 'tree' : 'statue'; else dtype = R.pick(['pillar', 'brazier', 'barrel', 'statue', 'brazier']);
            const d = { x: x + 0.5, y: y + 0.5, tex: DSPR[dtype], h: { tree: 1.45, pillar: 1.5, statue: 1.05, brazier: 0.6, barrel: 0.55 }[dtype], solid: true, type: dtype };
            decor.push(d); used.add(key(x, y));
            if (dtype === 'brazier') { lights.push({ x: d.x, y: d.y, r: 4.5, i: 0.55 }); d.flick = true; }
            if (decor.filter(q => Math.floor(q.x) >= c.x0 && Math.floor(q.x) <= c.x1 && Math.floor(q.y) >= c.y0 && Math.floor(q.y) <= c.y1).length >= nDec) break;
          }
          if (!c.out) { decor.push({ x: c.cx + 0.5, y: c.cy + 0.5, tex: DSPR.lamp, h: 0.4, z: WH - 0.42, solid: false, full: true }); lights.push({ x: c.cx + 0.5, y: c.cy + 0.5, r: 5, i: 0.35 }); }
          const free = () => { for (let k = 0; k < 30; k++) { const x = c.x0 + R.int(c.x1 - c.x0 + 1), y = c.y0 + R.int(c.y1 - c.y0 + 1); if (occupyOK(x, y) && !(x === c.cx && y === c.cy)) { used.add(key(x, y)); return [x + 0.5, y + 0.5]; } } return null; };
          // items
          const addItem = (type, tex, h) => { const p = free(); if (p) { items.push({ x: p[0], y: p[1], type, tex, h }); if (['coin', 'gem', 'idol'].includes(type)) lv.ttotal++; } };
          if (c.kind === 'secret') { addItem('idol', ISPR.idol, 0.32); addItem('gem', ISPR.gem, 0.22); addItem(R() < 0.5 ? 'oneup' : 'god', R() < 0.5 ? ISPR.oneup : ISPR.god, 0.32); continue; }
          if (c === G.start) { addItem('coin', ISPR.coin, 0.18); continue; }
          const nIt = 1 + R.int(3);
          for (let k = 0; k < nIt; k++) {
            const r = R();
            if (r < 0.3) addItem('coin', ISPR.coin, 0.18); else if (r < 0.42) addItem('gem', ISPR.gem, 0.22);
            else if (r < 0.62) addItem(R() < 0.5 ? 'medkit' : 'noodle', R() < 0.5 ? ISPR.medkit : ISPR.noodle, 0.25);
            else if (r < 0.72) addItem('tonic', ISPR.tonic, 0.22);
            else if (r < 0.8) addItem('armor', ISPR.armor, 0.28);
            else { const mk = R.pick(Object.keys(MISSILES)); addItem('m_' + mk, ISPR['m_' + mk], 0.24); }
          }
          // enemies
          if (c === G.exit && L.boss) continue;
          const nE = Math.max(1, Math.round(L.density * (0.6 + R() * 0.8)));
          for (let k = 0; k < nE; k++) { const p = free(); if (p) spawnEnemy(R.pick(L.foes), p[0], p[1], R() * TAU); }
        }
        // weapon pickups along the way
        const wcells = G.cells.filter(c => c !== G.start && c.kind === 'room');
        if (wcells.length) { const c = wcells[R.int(wcells.length)]; items.push({ x: c.cx + 0.5, y: c.cy + 0.5 + (c.y1 > c.cy ? 1 : c.y0 < c.cy ? -1 : 0), type: n === 0 ? 'twin' : (R() < 0.5 ? 'twin' : 'carbine'), tex: null, h: 0.2 }); const it = items[items.length - 1]; it.tex = ISPR[it.type]; }
        if (n >= 1 && wcells.length > 1) { const c = wcells[R.int(wcells.length)]; items.push({ x: c.cx + 0.5 + (c.x1 > c.cx ? 1 : 0), y: c.cy + 0.5, type: 'carbine', tex: ISPR.carbine, h: 0.2 }); }
        // first missile weapon early
        { const c = G.cells.find(c => c.par === G.start.id) || G.start; const mk = n === 0 ? 'bazooka' : R.pick(Object.keys(MISSILES)); items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: 'm_' + mk, tex: ISPR['m_' + mk], h: 0.24 }); }
        // powerups: dog mode and god mode in the middle of the level
        const mid = G.cells.filter(c => c !== G.start && c !== G.exit && c.kind === 'room');
        if (mid.length) { const c = R.pick(mid); items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: n % 2 ? 'god' : 'dog', tex: n % 2 ? ISPR.god : ISPR.dog, h: 0.34 }); }
        if (L.boss) { const c = G.cells.find(c => c.par === G.exit.id) || G.cells[G.exit.par]; if (c) { items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: 'm_heat', tex: ISPR.m_heat, h: 0.24 }, { x: c.cx + 0.5, y: c.cy + 1.5 > c.y1 + 0.5 ? c.cy - 0.5 : c.cy + 1.5, type: 'medkit', tex: ISPR.medkit, h: 0.25 }); } }
        // keys at key-cell centres
        G.keyCells.forEach((c, i) => { items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: 'key', key: i + 1, tex: ISPR.key[i + 1], h: 0.32 }); });
        // the boss
        if (L.boss) { const c = G.exit; lv.boss = spawnEnemy('boss', c.cx + 0.5, c.cy + 0.5, 0); }
        lv.total = actors.length;
        for (const d of decor) if (d.solid) { /* nothing: collision handled via decor list */ }
        buildLights(ambient, lights);
        // place the player
        const st = G.start, e0 = st.edges[0], o = G.cells[e0.a === st.id ? e0.b : e0.a];
        return { x: st.cx + 0.5, y: st.cy + 0.5, a: Math.atan2(o.j - st.j, o.i - st.i) };
      }
      function spawnEnemy(type, x, y, a) {
        const d = ENEMY[type];
        const e = { type, d, x, y, a, hp: d.hp, st: 'idle', t: 0, cool: 1 + Math.random(), react: 0, burst: 0, anim: 0, pain: 0, fade: 0, spr: type === 'boss' ? BOSS : ESPR[type], tgt: null, path: 0, strafe: 0, summoned: 0 };
        actors.push(e); return e;
      }

      // ================= player =================
      function newPlayer(ci) {
        const ch = CHARS[ci];
        return { ch, skin: ch.skin, x: 0, y: 0, a: 0, z: 0, vz: 0, vx: 0, vy: 0, hp: ch.hp, maxhp: ch.hp, armor: 0, lives: 3, score: 0,
          wpn: 0, has: [true, false, false], missile: null, mammo: 0, keys: [false, false, false, false], god: 0, dog: 0, fireT: 0, flashT: 0, alt: 0, bob: 0, padT: 0, onGad: null, dmgT: 0 };
      }
      function startLevel(n) {
        level = n; const st = buildLevel(n);
        player.x = st.x; player.y = st.y; player.a = st.a; player.z = 0; player.vz = 0; player.vx = player.vy = 0;
        player.keys = [false, false, false, false]; player.god = 0; player.dog = 0;
        player.levelScore = player.score;
        mode = 'intro'; modeT = 0; msgs = []; showMap = false;
      }

      // ================= combat =================
      function damagePlayer(n, srcx, srcy) {
        if (mode !== 'play' || DBG.god) return;
        if (player.god > 0) return;
        if (player.dog > 0) n *= 0.5;
        if (player.armor > 0) { const a = Math.min(player.armor, n * 0.5); player.armor -= a; n -= a; }
        player.hp -= n; hurtFlash = Math.min(1, hurtFlash + n / 30); shake = Math.min(6, shake + n / 5);
        if (player.dmgT <= 0) { SND.hurt(); player.dmgT = 0.25; }
        if (player.hp <= 0) { player.hp = 0; killPlayer(); }
      }
      function killPlayer() { mode = 'dying'; deathT = 0; SND.pdie(); }
      function hurtActor(e, dmg, splash, fromX, fromY) {
        if (e.st === 'die' || e.st === 'dead') return;
        if (e.d.armor && !splash) { const ang = Math.atan2(player.y - e.y, player.x - e.x); let da = Math.abs(((ang - e.a + Math.PI * 3) % TAU) - Math.PI); if (da < 1.2) { dmg *= 0.25; spark(e); } }
        e.hp -= dmg; e.pain = 0.15;
        if (e.st === 'idle') wake(e);
        if (e.hp <= 0) {
          e.st = 'die'; e.t = 0; SND.die(); lv.kills++; addScore(e.d.pts);
          if (e.type === 'boss') { lv.bossDead = true; wallM[lv.exitTile[1] * MW + lv.exitTile[0]] = T.exit; say('THE ABBOT IS DEFEATED! THE EXIT IS OPEN!', 4); for (let k = 0; k < 8; k++) fx.push({ x: e.x + (Math.random() - 0.5) * 1.5, y: e.y + (Math.random() - 0.5) * 1.5, z: Math.random() * 0.8, t: -k * 0.15, kind: 'boom' }); SND.boom(); }
          else if (Math.random() < 0.25) items.push({ x: e.x, y: e.y, type: Math.random() < 0.5 ? 'tonic' : 'coin', tex: null, h: 0.2 }), (items[items.length - 1].tex = ISPR[items[items.length - 1].type]);
        } else if (e.type !== 'boss' && Math.random() < 0.5) { e.st = 'pain'; e.t = 0; }
      }
      function spark(e) { fx.push({ x: e.x, y: e.y, z: 0.5, t: 0.2, kind: 'spark' }); }
      function wake(e) { if (e.st === 'idle') { e.st = 'chase'; e.react = e.d.react * (0.5 + Math.random()); SND.alert(e.type); } }
      function noise(x, y, r) { for (const e of actors) if (e.st === 'idle' && Math.hypot(e.x - x, e.y - y) < r) wake(e); }
      function hitscan(dmg, spread) {
        // nearest enemy close to the view ray
        const dx = Math.cos(player.a), dy = Math.sin(player.a);
        let best = null, bd = 1e9;
        for (const e of actors) {
          if (e.st === 'die' || e.st === 'dead') continue;
          const rx = e.x - player.x, ry = e.y - player.y, along = rx * dx + ry * dy; if (along <= 0.1) continue;
          const perp = Math.abs(-rx * dy + ry * dx); if (perp > 0.32 + along * spread) continue;
          if (along < bd && los(player.x, player.y, e.x, e.y)) { bd = along; best = e; }
        }
        if (best) { hurtActor(best, dmg, false); fx.push({ x: best.x - dx * 0.3, y: best.y - dy * 0.3, z: 0.5, t: 0.15, kind: 'spark' }); }
        noise(player.x, player.y, 9);
      }
      function fireMissile(kind, ang, owner, x, y, z) {
        const sp = kind === 'drunk' ? 5 : kind === 'orb' ? 5.5 : kind === 'god' ? 9 : 7.5;
        projs.push({ kind, x, y, z: z == null ? 0.5 : z, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, a: ang, sp, owner, t: 0, ph: Math.random() * TAU });
      }
      function explode(x, y, owner, power) {
        SND.boom(); shake = Math.min(8, shake + 4);
        fx.push({ x, y, z: 0.3, t: 0, kind: 'boom' });
        DYNL.push({ x, y, r: 5, i: 1.6, t: 0.35 });
        const R = 1.9;
        for (const e of actors) { const d = Math.hypot(e.x - x, e.y - y); if (d < R && e.st !== 'dead') hurtActor(e, power * (1 - d / R * 0.6), true); }
        const pd = Math.hypot(player.x - x, player.y - y);
        if (pd < R) damagePlayer(power * (1 - pd / R) * (owner === 'p' ? 0.45 : 1));
        noise(x, y, 12);
      }
      const DYNL = [];
      function fireWeapon() {
        const p = player;
        if (p.fireT > 0) return;
        if (p.god > 0) { p.fireT = 0.35; p.flashT = 0.12; fireMissile('god', p.a, 'p', p.x, p.y, 0.55); SND.god(); return; }
        if (p.dog > 0) {
          p.fireT = 0.5; p.flashT = 0.15; SND.bark();
          fireMissile('bark', p.a, 'p', p.x, p.y, 0.25);
          for (const e of actors) { if (e.st === 'dead' || e.st === 'die') continue; const rx = e.x - p.x, ry = e.y - p.y, d = Math.hypot(rx, ry); if (d < 2.6) { const da = Math.abs(((Math.atan2(ry, rx) - p.a + Math.PI * 3) % TAU) - Math.PI); if (da < 0.7 && los(p.x, p.y, e.x, e.y)) hurtActor(e, 45, true); } }
          noise(p.x, p.y, 8); return;
        }
        const acc = p.ch.acc;
        if (p.wpn === 0) { p.fireT = 0.32; p.flashT = 0.08; sndShot(0); hitscan((8 + Math.random() * 6) * acc, 0.02); }
        else if (p.wpn === 1) { p.fireT = 0.17; p.flashT = 0.08; p.alt ^= 1; sndShot(0); hitscan((8 + Math.random() * 6) * acc, 0.025); }
        else if (p.wpn === 2) { p.fireT = 0.09; p.flashT = 0.05; sndShot(1); hitscan((6 + Math.random() * 5) * acc, 0.045); }
        else if (p.wpn === 3 && p.missile && p.mammo > 0) {
          p.mammo--; p.flashT = 0.15; SND.missile(); const k = p.missile;
          if (k === 'drunk') { p.fireT = 0.9; for (let i = 0; i < 5; i++) fireMissile('drunk', p.a + (i - 2) * 0.08, 'p', p.x, p.y, 0.45); }
          else { p.fireT = k === 'heat' ? 0.8 : 0.9; fireMissile(k, p.a, 'p', p.x, p.y, 0.45); }
          if (p.mammo <= 0) { say(MISSILES[k].name + ' EMPTY'); p.missile = null; p.wpn = p.has[2] ? 2 : p.has[1] ? 1 : 0; }
        }
      }
      function enemyShoot(e) {
        const d = e.d, dist = Math.hypot(player.x - e.x, player.y - e.y);
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        if (d.kind === 'orb') { fireMissile('orb', ang + (Math.random() - 0.5) * 0.1, 'e', e.x, e.y, 0.5); SND.orb(); return; }
        if (d.kind === 'missile') { fireMissile('emissile', ang, 'e', e.x, e.y, 0.5); SND.missile(); return; }
        if (d.kind === 'boss') {
          if (Math.random() < 0.35) { fireMissile('emissile', ang, 'e', e.x, e.y, 0.6); SND.missile(); }
          else { for (let i = -2; i <= 2; i++) fireMissile('orb', ang + i * 0.16, 'e', e.x, e.y, 0.7); SND.orb(); }
          return;
        }
        sndShot(1);
        const n = d.pellets || 1;
        const moving = Math.hypot(player.vx, player.vy) > 1;
        for (let i = 0; i < n; i++) {
          let ch = 0.72 - dist * 0.04 - (moving ? 0.15 : 0); if (player.dog > 0) ch -= 0.2;
          if (Math.random() < ch) damagePlayer(d.dmg[0] + Math.random() * (d.dmg[1] - d.dmg[0]));
        }
      }

      // ================= update =================
      let flow = null, flowT = 0, flowTile = -1;
      function passEnemy(x, y) { const t = y * MW + x; if (wallM[t]) return false; const d = doorM[t]; if (d && (d.secret || (d.key && d.open < 0.9))) return false; if (floorM[t] === FL.lava) return false; return true; }
      function actorBlocked(x, y, r, self) {
        if (blockedAt(x, y, r)) return true;
        for (const d of decor) if (d.solid && Math.abs(d.x - x) < r + 0.3 && Math.abs(d.y - y) < r + 0.3) return true;
        for (const e of actors) if (e !== self && e.st !== 'dead' && e.st !== 'die' && Math.abs(e.x - x) < r + 0.3 && Math.abs(e.y - y) < r + 0.3) return true;
        return false;
      }
      function updateActors(dt) {
        const ptile = Math.floor(player.y) * MW + Math.floor(player.x);
        flowT -= dt;
        if (flowT <= 0 || ptile !== flowTile) { flow = bfs(Math.floor(player.x), Math.floor(player.y), passEnemy, 40); flowT = 0.5; flowTile = ptile; }
        for (const e of actors) {
          e.t += dt; if (e.pain > 0) e.pain -= dt;
          if (e.st === 'dead') { e.fade += dt * 0.6; continue; }
          if (e.st === 'die') { if (e.t > 0.7) { e.st = 'dead'; e.fade = 0; } continue; }
          const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy);
          if (e.st === 'idle') {
            e.anim += dt;
            if (dist < 14 && mode === 'play' && ((e.lc = (e.lc || 0) - dt) <= 0)) { e.lc = 0.25; if (los(e.x, e.y, player.x, player.y)) wake(e); }
            continue;
          }
          if (e.st === 'pain') { if (e.t > 0.25) { e.st = 'chase'; e.t = 0; } continue; }
          if (mode !== 'play') continue;
          if (e.react > 0) { e.react -= dt; continue; }
          e.a = Math.atan2(dy, dx);
          e.cool -= dt;
          // boss: summon monks at half health
          if (e.type === 'boss' && e.hp < e.d.hp * 0.5 && e.summoned < 2 && e.cool < 0) {
            e.summoned++; for (let k = 0; k < 3; k++) { const a = k * 2.1, x = e.x + Math.cos(a) * 2, y = e.y + Math.sin(a) * 2; if (!blockedAt(x, y, 0.3)) { const m = spawnEnemy('monk', x, y, 0); m.st = 'chase'; lv.total++; fx.push({ x, y, z: 0.3, t: 0, kind: 'boom' }); } }
            say('THE ABBOT CALLS HIS FAITHFUL!'); e.cool = 1.5;
          }
          if (e.st === 'attack') {
            if (e.t > 0.25 && !e.fired) { e.fired = true; enemyShoot(e); if (e.burst > 1) { e.burst--; e.t = 0.1; e.fired = false; } }
            if (e.t > 0.55) { e.st = 'chase'; e.t = 0; }
            continue;
          }
          const see = dist < e.d.range && (e.seeT = (e.seeT || 0) - dt) <= 0 ? (e.seeT = 0.2, e.sees = los(e.x, e.y, player.x, player.y)) : e.sees;
          if (see && e.cool <= 0 && dist < e.d.range) {
            e.st = 'attack'; e.t = 0; e.fired = false; e.burst = e.d.burst || 1;
            e.cool = e.d.cool * (0.7 + Math.random() * 0.6) * (1.15 - level * 0.03); continue;
          }
          // move along flow field (or strafe when in sight and close)
          const sp = e.d.speed * (1 + level * 0.03) * dt;
          let mx = 0, my = 0;
          const tx = Math.floor(e.x), ty = Math.floor(e.y);
          if (see && dist < 4 && e.type !== 'boss') { e.strafe = e.strafe || (Math.random() < 0.5 ? 1 : -1); mx = -dy / dist * e.strafe; my = dx / dist * e.strafe; if (Math.random() < dt * 0.5) e.strafe = -e.strafe; }
          else if (see && e.type === 'boss') { mx = dx / dist * 0.5; my = dy / dist * 0.5; if (dist < 3) { mx = -mx; my = -my; } }
          else if (flow && flow[ty * MW + tx] > 0) {
            let best = flow[ty * MW + tx], bx = tx, by = ty;
            for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = flow[(ty + oy) * MW + tx + ox]; if (v >= 0 && v < best) { best = v; bx = tx + ox; by = ty + oy; } }
            const d = doorM[by * MW + bx]; if (d && d.open < 0.9 && !d.key && !d.secret) { if (openDoor(d)) SND.door(); }
            const gx = bx + 0.5 - e.x, gy = by + 0.5 - e.y, gl = Math.hypot(gx, gy) || 1; mx = gx / gl; my = gy / gl;
          } else if (dist > 1.2) { mx = dx / dist; my = dy / dist; }
          if (dist < 1.1 && e.type !== 'boss') { mx = -dx / dist * 0.5; my = -dy / dist * 0.5; }
          const r = e.type === 'boss' ? 0.5 : 0.28;
          const nx = e.x + mx * sp, ny = e.y + my * sp;
          if (!actorBlocked(nx, e.y, r, e) && !lavaAt(Math.floor(nx), Math.floor(e.y))) e.x = nx;
          if (!actorBlocked(e.x, ny, r, e) && !lavaAt(Math.floor(e.x), Math.floor(ny))) e.y = ny;
          if (mx || my) e.anim += dt * 4;
        }
        actors = actors.filter(e => !(e.st === 'dead' && e.fade >= 1));
      }
      function updateProjs(dt) {
        for (const p of projs) {
          p.t += dt;
          if (p.kind === 'heat') {
            let best = null, bd = 1e9;
            for (const e of actors) { if (e.st === 'die' || e.st === 'dead') continue; const d = Math.hypot(e.x - p.x, e.y - p.y); const da = Math.abs(((Math.atan2(e.y - p.y, e.x - p.x) - p.a + Math.PI * 3) % TAU) - Math.PI); if (d < bd && da < 1.4 && d < 14) { bd = d; best = e; } }
            if (best) { const ta = Math.atan2(best.y - p.y, best.x - p.x); let da = ((ta - p.a + Math.PI * 3) % TAU) - Math.PI; p.a += clamp(da, -3 * dt, 3 * dt); }
          }
          if (p.kind === 'drunk') p.a += Math.sin(p.t * 9 + p.ph) * 4.5 * dt;
          if (p.kind === 'split' && p.t > 0.3 && !p.done) { p.done = true; p.dead = true; for (const s of [-0.22, 0.22]) { fireMissile('bazooka', p.a + s, p.owner, p.x, p.y, p.z); } continue; }
          p.vx = Math.cos(p.a) * p.sp; p.vy = Math.sin(p.a) * p.sp;
          const steps = 3;
          for (let s = 0; s < steps && !p.dead; s++) {
            p.x += p.vx * dt / steps; p.y += p.vy * dt / steps;
            if (p.kind !== 'bark' && p.kind !== 'god' || true) {
              if (solid(Math.floor(p.x), Math.floor(p.y))) { p.dead = true; impact(p); break; }
            }
            if (p.owner === 'p') {
              for (const e of actors) { if (e.st === 'die' || e.st === 'dead') continue; if (Math.hypot(e.x - p.x, e.y - p.y) < (e.type === 'boss' ? 0.7 : 0.38)) { if (p.kind === 'god') { hurtActor(e, 220, true); } else if (p.kind === 'bark') { } else { p.dead = true; impact(p); } break; } }
            } else if (Math.hypot(player.x - p.x, player.y - p.y) < 0.35 && Math.abs(p.z - (player.z + 0.4)) < 0.6) { p.dead = true; impact(p); }
          }
          if (p.kind === 'bark' && p.t > 0.25) p.dead = true;
          if (p.t > 6) p.dead = true;
          if (!p.dead && p.kind !== 'bark') DYN.push({ x: p.x, y: p.y, r: 2.2, i: p.kind === 'god' ? 0.8 : 0.45 });
        }
        projs = projs.filter(p => !p.dead);
      }
      function impact(p) {
        if (p.kind === 'orb') { if (Math.hypot(player.x - p.x, player.y - p.y) < 0.6) damagePlayer(10 + Math.random() * 5); fx.push({ x: p.x, y: p.y, z: p.z, t: 0, kind: 'puff' }); return; }
        if (p.kind === 'bark') return;
        if (p.kind === 'god') { explode(p.x - Math.cos(p.a) * 0.2, p.y - Math.sin(p.a) * 0.2, 'p', 120); return; }
        const bx = p.x - Math.cos(p.a) * 0.15, by = p.y - Math.sin(p.a) * 0.15;
        if (p.kind === 'emissile') { explode(bx, by, 'e', 28); return; }
        explode(bx, by, 'p', p.kind === 'drunk' ? 45 : 75);
        if (p.kind === 'fire') {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            let x = Math.floor(bx), y = Math.floor(by);
            for (let k = 0; k < 4; k++) { x += dx; y += dy; if (solid(x, y)) break; fx.push({ x: x + 0.5, y: y + 0.5, z: 0, t: -k * 0.08, kind: 'flame', life: 1.6 }); }
          }
        }
      }
      function updateFx(dt) {
        for (const f of fx) {
          f.t += dt;
          if (f.kind === 'flame' && f.t > 0) {
            DYN.push({ x: f.x, y: f.y, r: 2, i: 0.5 });
            for (const e of actors) if (Math.hypot(e.x - f.x, e.y - f.y) < 0.6) hurtActor(e, 40 * dt, true);
            if (Math.hypot(player.x - f.x, player.y - f.y) < 0.5) damagePlayer(15 * dt);
          }
        }
        fx = fx.filter(f => f.t < (f.kind === 'boom' ? 0.5 : f.kind === 'flame' ? f.life : f.kind === 'puff' ? 0.3 : 0.2));
        for (const L of DYNL) { L.t -= dt; DYN.push({ x: L.x, y: L.y, r: L.r, i: L.i * Math.max(0, L.t / 0.35) }); }
        for (let i = DYNL.length - 1; i >= 0; i--) if (DYNL[i].t <= 0) DYNL.splice(i, 1);
      }
      function updateTraps(dt) {
        for (const g of gads) {
          const ox = g.x, oy = g.y;
          if (g.wait > 0) g.wait -= dt;
          else { const len = Math.hypot(g.bx - g.ax, g.by - g.ay); g.p += g.dir * dt * 1.5 / len; if (g.p >= 1) { g.p = 1; g.dir = -1; g.wait = 1.6; } if (g.p <= 0) { g.p = 0; g.dir = 1; g.wait = 1.6; } }
          g.x = g.ax + (g.bx - g.ax) * g.p; g.y = g.ay + (g.by - g.ay) * g.p; g.dx = g.x - ox; g.dy = g.y - oy;
          DYN.push({ x: g.x, y: g.y, r: 1.6, i: 0.35 });
        }
        for (const b of blades) {
          const len = Math.hypot(b.bx - b.ax, b.by - b.ay) || 1;
          b.p += b.dir * dt * b.speed * 4 / len; if (b.p >= 1) { b.p = 1; b.dir = -1; } if (b.p <= 0) { b.p = 0; b.dir = 1; }
          b.x = b.ax + (b.bx - b.ax) * b.p; b.y = b.ay + (b.by - b.ay) * b.p; b.f += dt * 20; b.hit -= dt;
          const d = player ? Math.hypot(player.x - b.x, player.y - b.y) : 99;
          if (mode !== 'play' || !player) continue;
          if (d < 0.5 && player.z < 0.45 && b.hit <= 0) { b.hit = 0.4; damagePlayer(14); SND.blade(); }
          if (d < 4 && ((b.f | 0) % 12 === 0)) SND.blade();
          for (const e of actors) if (e.st !== 'die' && e.st !== 'dead' && Math.hypot(e.x - b.x, e.y - b.y) < 0.45 && e.type !== 'boss') hurtActor(e, 30 * dt, true);
        }
      }
      function tryBump() {
        const p = player, fx2 = p.x + Math.cos(p.a) * 0.7, fy2 = p.y + Math.sin(p.a) * 0.7;
        const tx = Math.floor(fx2), ty = Math.floor(fy2);
        if (!inMap(tx, ty)) return;
        const t = ty * MW + tx;
        const d = doorM[t];
        if (d && d.open < 0.9) {
          if (d.key && !p.keys[d.key]) { if (!p.lockMsg) { say('YOU NEED THE ' + KEYNAME[d.key] + ' KEY'); SND.locked(); } p.lockMsg = 0.8; return; }
          if (d.secret && d.st === 0) { lv.secrets++; say('SECRET AREA FOUND!'); SND.secret(); addScore(1000); }
          if (openDoor(d)) SND.door();
        }
        if (lv.exitTile && tx === lv.exitTile[0] && ty === lv.exitTile[1]) {
          if (!lv.bossDead) { if (!p.lockMsg) { say('SEALED BY THE ABBOT\'S POWER'); SND.locked(); } p.lockMsg = 0.8; return; }
          finishLevel();
        }
      }
      function finishLevel() {
        SND.exit();
        const pct = (a, b) => b ? Math.round(a * 100 / b) : 100;
        tally = { kills: pct(lv.kills, lv.total), tre: pct(lv.treasure, lv.ttotal), sec: pct(lv.secrets, lv.stotal), time: lv.time, bonus: 0 };
        let bonus = 0; if (tally.kills >= 100) bonus += 10000; if (tally.tre >= 100) bonus += 10000; if (tally.sec >= 100) bonus += 10000;
        const par = 90 + level * 30; if (lv.time < par) bonus += Math.floor(par - lv.time) * 100;
        tally.bonus = bonus; addScore(bonus);
        mode = 'tally'; modeT = 0;
      }
      function pickup(it) {
        const p = player; let ok = true; const ty = it.type;
        if (ty === 'medkit' || ty === 'noodle' || ty === 'tonic') { const v = ty === 'medkit' ? 30 : ty === 'noodle' ? 20 : 10; if (p.hp >= p.maxhp) ok = false; else { p.hp = Math.min(p.maxhp, p.hp + v); say(ty === 'medkit' ? 'FIRST AID KIT' : ty === 'noodle' ? 'BOWL OF NOODLES. SLURP!' : 'HEALTH TONIC'); SND.pick(); } }
        else if (ty === 'armor') { if (p.armor >= 100) ok = false; else { p.armor = Math.min(100, p.armor + 50); say('FLAK VEST'); SND.pick(); } }
        else if (ty === 'coin' || ty === 'gem' || ty === 'idol') { addScore(ty === 'coin' ? 100 : ty === 'gem' ? 500 : 2500); lv.treasure++; say(ty === 'coin' ? 'ABBEY COIN' : ty === 'gem' ? 'SAPPHIRE' : 'GOLDEN IDOL!'); SND.treasure(); }
        else if (ty === 'oneup') { p.lives++; say('EXTRA LIFE!'); SND.oneup(); }
        else if (ty === 'key') { p.keys[it.key] = true; say(KEYNAME[it.key] + ' KEY'); SND.key(); }
        else if (ty === 'twin') { if (p.has[1]) { addScore(200); } p.has[1] = true; if (p.wpn < 1 && p.god <= 0 && p.dog <= 0) p.wpn = 1; say('TWIN PISTOLS. TWICE THE FUN.'); SND.weapon(); }
        else if (ty === 'carbine') { p.has[2] = true; if (p.wpn < 2 && p.god <= 0 && p.dog <= 0) p.wpn = 2; say('BURST CARBINE'); SND.weapon(); }
        else if (ty.startsWith('m_')) { const k = ty.slice(2); if (p.missile === k) p.mammo = Math.min(p.mammo + MISSILES[k].ammo, 20); else { p.missile = k; p.mammo = MISSILES[k].ammo; } p.wpn = 3; say(MISSILES[k].name + '!'); SND.weapon(); }
        else if (ty === 'god') { p.god = 22; p.dog = 0; say('GOD MODE! TRY TO STAY HUMBLE.', 3.5); SND.god(); }
        else if (ty === 'dog') { p.dog = 22; p.god = 0; say('DOG MODE! WHO\'S A GOOD COMMANDO?', 3.5); SND.bark(); }
        if (ok) { pickFlash = 0.25; it.dead = true; }
      }
      function updatePlayer(dt) {
        const p = player, ch = p.ch;
        if (p.fireT > 0) p.fireT -= dt; if (p.flashT > 0) p.flashT -= dt; if (p.dmgT > 0) p.dmgT -= dt; if (p.lockMsg > 0) p.lockMsg -= dt; else p.lockMsg = 0;
        if (p.god > 0) { p.god -= dt; if (p.god <= 0) say('YOU ARE MORTAL AGAIN.'); }
        if (p.dog > 0) { p.dog -= dt; if (p.dog <= 0) say('BACK ON TWO LEGS.'); }
        const strafeMode = api.key('KeyZ');
        let turn = 0, fwd = 0, side = 0;
        if (api.key('ArrowLeft')) { if (strafeMode) side -= 1; else turn -= 1; }
        if (api.key('ArrowRight')) { if (strafeMode) side += 1; else turn += 1; }
        if (api.key('ArrowUp') || api.key('KeyW')) fwd += 1;
        if (api.key('ArrowDown') || api.key('KeyS')) fwd -= 1;
        if (api.key('KeyA')) side -= 1; if (api.key('KeyD')) side += 1;
        p.a += turn * 2.7 * dt;
        const grounded = p.z <= 0.001 && p.vz <= 0;
        const spd = 3.3 * ch.speed * (p.dog > 0 ? 1.35 : 1);
        const cx = Math.cos(p.a), cy = Math.sin(p.a);
        const tvx = (cx * fwd - cy * side) * spd, tvy = (cy * fwd + cx * side) * spd;
        const k = grounded ? Math.min(1, dt * 14) : Math.min(1, dt * 1.2);
        p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
        // jump pads
        const tx = Math.floor(p.x), ty = Math.floor(p.y), ft = floorM[ty * MW + tx];
        if (p.padT > 0) p.padT -= dt;
        if (grounded && ft === FL.pad && p.padT <= 0) {
          p.vz = JUMPV * ch.jump; p.padT = 1.6; SND.jump();
          const along = p.vx * cx + p.vy * cy, boost = Math.max(along, 4.6 * ch.jump);
          p.vx = cx * boost; p.vy = cy * boost;
        }
        if (!grounded || p.vz > 0) { p.vz -= GRAV * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; SND.land(); } if (p.z > WH - EYE - 0.12) { p.z = WH - EYE - 0.12; p.vz = Math.min(0, p.vz); } }
        // moving platform
        p.onGad = null;
        if (p.z < 0.05) for (const g of gads) if (Math.hypot(p.x - g.x, p.y - g.y) < 0.5) { p.onGad = g; break; }
        let mvx = p.vx * dt, mvy = p.vy * dt;
        if (p.onGad) { mvx += p.onGad.dx; mvy += p.onGad.dy; }
        const r = 0.24;
        const blockedP = (x, y) => { if (blockedAt(x, y, r)) return true; for (const d of decor) if (d.solid && Math.abs(d.x - x) < r + 0.18 && Math.abs(d.y - y) < r + 0.18) return true; for (const e of actors) if (e.st !== 'dead' && e.st !== 'die' && Math.abs(e.x - x) < r + (e.type === 'boss' ? 0.5 : 0.25) && Math.abs(e.y - y) < r + (e.type === 'boss' ? 0.5 : 0.25)) return true; return false; };
        if (!blockedP(p.x + mvx, p.y)) p.x += mvx; else p.vx = 0;
        if (!blockedP(p.x, p.y + mvy)) p.y += mvy; else p.vy = 0;
        if (fwd > 0) tryBump();
        const moving = Math.hypot(p.vx, p.vy);
        if (grounded) p.bob += moving * dt * 2.4;
        // lava
        const t2 = Math.floor(p.y) * MW + Math.floor(p.x);
        if (floorM[t2] === FL.lava && p.z < 0.05 && !p.onGad) { lavaHurtT -= dt; if (lavaHurtT <= 0) { lavaHurtT = 0.25; damagePlayer(6); } }
        // items
        for (const it of items) if (!it.dead && Math.hypot(it.x - p.x, it.y - p.y) < 0.5 && p.z < 0.6) pickup(it);
        items = items.filter(i => !i.dead);
        // weapons
        if (p.god <= 0 && p.dog <= 0) {
          const sel = w => { if (w === 3 ? !!p.missile : p.has[w]) { if (p.wpn !== w) { p.wpn = w; api.audio.tone(300, 0.04, { type: 'square', vol: 0.06 }); } } };
          if (api.pressed('Digit1')) sel(0); if (api.pressed('Digit2')) sel(1); if (api.pressed('Digit3')) sel(2); if (api.pressed('Digit4')) sel(3);
          if (api.pressed('KeyX')) { for (let i = 1; i <= 4; i++) { const w = (p.wpn + i) % 4; if (w === 3 ? !!p.missile : p.has[w]) { sel(w); break; } } }
        }
        if (api.key('Space') || api.key('ControlLeft')) fireWeapon();
        if (api.pressed('Tab') || api.pressed('KeyM')) showMap = !showMap;
        // god-mode glow
        if (p.god > 0) DYN.push({ x: p.x, y: p.y, r: 3.5, i: 0.5 });
        if (p.flashT > 0) DYN.push({ x: p.x + cx * 0.5, y: p.y + cy * 0.5, r: 3.5, i: 0.5 });
      }

      // ================= main update =================
      let demoT = 0;
      function startAttractDemo() { try { const s = buildLevel(0); demo = s; } catch (e) { demo = null; } }
      let demo = null;
      function update(dt) {
        if (coinFlash > 0) coinFlash -= dt;
        if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt * 1.5);
        if (pickFlash > 0) pickFlash -= dt;
        if (shake > 0) shake = Math.max(0, shake - dt * 20);
        for (const m of msgs) m.life -= dt; msgs = msgs.filter(m => m.life > 0);
        modeT += dt;
        if (mode === 'attract') {
          attractT += dt; demoT += dt;
          if (!demo) startAttractDemo();
          updateDoors(dt, () => false); updateTraps(dt);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'select'; modeT = 0; selIdx = 0; SND.weapon(); }
            else { coinFlash = 1.5; SND.locked(); }
          }
          return;
        }
        if (mode === 'select') {
          if (api.pressed('ArrowLeft') || api.pressed('ArrowUp')) { selIdx = (selIdx + CHARS.length - 1) % CHARS.length; api.audio.tone(440, 0.05, { vol: 0.08 }); }
          if (api.pressed('ArrowRight') || api.pressed('ArrowDown')) { selIdx = (selIdx + 1) % CHARS.length; api.audio.tone(440, 0.05, { vol: 0.08 }); }
          if (modeT > 0.3 && api.anyPressed('Enter', 'Space')) { player = newPlayer(selIdx); startLevel(0); SND.exit(); }
          return;
        }
        if (mode === 'intro') { if (modeT > 3.5 || (modeT > 0.5 && api.anyPressed('Enter', 'Space'))) { mode = 'play'; modeT = 0; } return; }
        if (mode === 'tally') {
          if (modeT > 6 || (modeT > 1.2 && api.anyPressed('Enter', 'Space'))) {
            if (level + 1 >= LEVELS.length) { mode = 'victory'; modeT = 0; title(); }
            else startLevel(level + 1);
          }
          return;
        }
        if (mode === 'victory') { if (modeT > 14 || (modeT > 3 && api.anyPressed('Enter', 'Space'))) gameOver(); return; }
        if (mode === 'over') { if (modeT > 6 || (modeT > 1.5 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; attractT = 0; demo = null; } return; }
        if (mode === 'dying') {
          deathT += dt; updateActors(dt); updateProjs(dt); updateFx(dt);
          if (deathT > 2.2 && !player.contPending) {
            player.lives--;
            if (player.lives > 0) { restartAfterDeath(); }
            else {
              player.contPending = true;
              const cont = () => { player.contPending = false; player.lives = 3; player.score = 0; restartAfterDeath(); };
              if (api.offerContinue) api.offerContinue(cont, () => { player.contPending = false; gameOver(); }); else gameOver();
            }
          }
          return;
        }
        if (mode !== 'play') return;
        lv.time += dt;
        updatePlayer(dt);
        if (mode !== 'play') return;
        updateDoors(dt, (x, y) => (Math.abs(player.x - x - 0.5) < 0.8 && Math.abs(player.y - y - 0.5) < 0.8) || actors.some(e => e.st !== 'dead' && Math.abs(e.x - x - 0.5) < 0.85 && Math.abs(e.y - y - 0.5) < 0.85));
        updateTraps(dt);
        updateActors(dt);
        updateProjs(dt);
        updateFx(dt);
        for (const d of decor) if (d.flick) DYN.push({ x: d.x, y: d.y, r: 3, i: 0.12 * Math.sin(api.time * 13 + d.x * 7) });
      }
      function restartAfterDeath() {
        const keep = { lives: player.lives, score: player.score, ch: player.ch, has: [true, player.has[1], false] };
        const ci = CHARS.indexOf(keep.ch);
        player = newPlayer(ci); player.lives = keep.lives; player.score = keep.score; player.has = keep.has; player.wpn = keep.has[1] ? 1 : 0;
        startLevel(level);
      }
      function gameOver() {
        if (player && player.score > hi) { hi = player.score; api.setHiScore(hi); }
        mode = 'over'; modeT = 0;
      }

      // ================= rendering =================
      const spritesOut = [];
      function gatherSprites(t) {
        spritesOut.length = 0;
        for (const d of decor) spritesOut.push({ x: d.x, y: d.y, z: d.z || 0, h: d.h, tex: d.type === 'brazier' && ((t * 6 + d.x) | 0) % 2 ? DSPR.brazier2 : d.tex, full: d.full || d.type === 'brazier' });
        for (const it of items) spritesOut.push({ x: it.x, y: it.y, z: 0.05 + Math.sin(t * 3 + it.x) * 0.03, h: it.h, tex: it.tex, full: it.type === 'god' || it.type === 'key' });
        for (const g of gads) spritesOut.push({ x: g.x, y: g.y, z: 0, h: 0.3, tex: GADSPR[(t * 4 | 0) & 1], full: true });
        for (const b of blades) spritesOut.push({ x: b.x, y: b.y, z: 0, h: 0.85, tex: BLADESPR[(b.f | 0) & 3] });
        for (const e of actors) {
          const S = e.spr; let tex = S.stand, h = e.d.h, z = 0, fade = 0, ws = 1;
          if (e.st === 'die') { const k = Math.min(1, e.t / 0.7); tex = S.pain; h = e.d.h * (1 - k * 0.7); ws = 1 + k * 0.5; }
          else if (e.st === 'dead') { tex = S.pain; h = e.d.h * 0.3; ws = 1.5; fade = Math.min(0.99, e.fade); }
          else if (e.st === 'pain' || e.pain > 0.05) tex = S.pain;
          else if (e.st === 'attack') tex = e.t > 0.2 && e.t < 0.35 ? S.fire : S.aim;
          else if (e.st === 'chase' || e.anim > 0) tex = ((e.anim * 1.5) | 0) % 2 ? S.walk1 : S.walk2;
          if (e.st === 'idle') tex = S.stand;
          if (e.type === 'boss') z = 0.15 + Math.sin(t * 2) * 0.06;
          spritesOut.push({ x: e.x, y: e.y, z, h, tex, fade, wscale: ws, flashc: e.pain > 0.1 && e.st !== 'die' ? 0xffffffff : 0, full: e.type === 'boss' && e.st === 'attack' });
        }
        for (const p of projs) {
          const tex = p.kind === 'orb' ? PROJSPR.orb : p.kind === 'god' ? PROJSPR.god : p.kind === 'bark' ? PROJSPR.bark : PROJSPR.missile;
          spritesOut.push({ x: p.x, y: p.y, z: p.z - 0.1, h: p.kind === 'god' ? 0.35 : p.kind === 'bark' ? 0.4 : 0.18, tex, full: true });
        }
        for (const f of fx) {
          if (f.t < 0) continue;
          if (f.kind === 'boom') spritesOut.push({ x: f.x, y: f.y, z: Math.max(0, f.z - 0.3), h: 1.1, tex: BOOMSPR[Math.min(4, (f.t / 0.1) | 0)], full: true });
          else if (f.kind === 'flame') spritesOut.push({ x: f.x, y: f.y, z: 0, h: 0.6, tex: FLAMESPR[((f.t * 10) | 0) & 1], full: true, fade: f.t > f.life - 0.4 ? (f.t - (f.life - 0.4)) * 2.4 : 0 });
          else if (f.kind === 'puff') spritesOut.push({ x: f.x, y: f.y, z: f.z - 0.2, h: 0.4, tex: BOOMSPR[0], full: true, fade: f.t * 3 });
          else spritesOut.push({ x: f.x, y: f.y, z: f.z - 0.08, h: 0.16, tex: BOOMSPR[0], full: true });
        }
        return spritesOut;
      }
      const FPC = {};
      function fpc(k, fn) { return FPC[k] || (FPC[k] = fn()); }
      function drawWeapon() {
        const p = player; const bobx = Math.sin(p.bob) * 4, boby = Math.abs(Math.cos(p.bob)) * 4 + (p.z > 0 ? -p.vz * 2 : 0);
        const fire = p.flashT > 0;
        let s, x, y;
        if (p.dog > 0) { s = fpc('dog' + fire, () => fpDog(fire)); fbBlit(s, 160 - s.w + bobx | 0, VH - s.h * 2 + 6 + boby | 0, 2); return; }
        if (p.god > 0) { s = fpc('god' + fire, () => fpGod(fire)); fbBlit(s, 170 + bobx | 0, VH - s.h * 2 + 10 + boby + (fire ? -6 : 0) | 0, 2); return; }
        if (p.wpn === 0) { s = fpc('p' + fire + p.skin, () => fpPistol(fire, 0)); x = 150; }
        else if (p.wpn === 1) { const f1 = fire && p.alt === 0, f2 = fire && p.alt === 1, s1 = fpc('p' + f1 + p.skin, () => fpPistol(f1, 0)), s2 = fpc('q' + f2 + p.skin, () => flipH(fpPistol(f2, 0))); fbBlit(s2, 50 - bobx | 0, VH - s2.h * 2 + 8 + boby + (fire && p.alt ? -4 : 0) | 0, 2); fbBlit(s1, 190 + bobx | 0, VH - s1.h * 2 + 8 + boby + (fire && !p.alt ? -4 : 0) | 0, 2); return; }
        else if (p.wpn === 2) { s = fpc('c' + fire + p.skin, () => fpCarbine(fire)); x = 136; }
        else { const col = p.missile ? MISSILES[p.missile].col : '#666666'; s = fpc('l' + fire + col + p.skin, () => fpLauncher(fire, col)); x = 120; }
        y = VH - s.h * 2 + 8 + (fire ? -4 : 0);
        fbBlit(s, x + bobx | 0, y + boby | 0, 2);
      }
      const HUDC = { bg: hx('#20130e'), panel: hx('#3a2418'), edge: hx('#8a5a2a'), hl: hx('#d8a04a'), txt: hx('#ffd890'), red: hx('#ff4030'), dim: hx('#7a6a50') };
      function drawHud() {
        const p = player, y0 = VH;
        fbRect(0, y0, W, H - y0, HUDC.bg); fbRect(0, y0, W, 1, HUDC.hl); fbRect(0, y0 + 1, W, 1, HUDC.edge);
        // portrait
        fbRect(3, y0 + 4, 34, 34, HUDC.edge); fbBlit(p.ch.pic, 4, y0 + 5, 1);
        if (p.god > 0) fbTint(4, y0 + 5, 32, 32, hx('#ffe060'), 0.35); if (p.dog > 0) fbTint(4, y0 + 5, 32, 32, hx('#a06a3a'), 0.45);
        if (hurtFlash > 0.2) fbTint(4, y0 + 5, 32, 32, hx('#ff0000'), 0.4);
        // health bar
        fbText('HEALTH', 42, y0 + 5, HUDC.dim);
        fbRect(42, y0 + 14, 62, 7, hx('#100806')); const hw = Math.round(60 * p.hp / p.maxhp); fbRect(43, y0 + 15, hw, 5, p.hp < p.maxhp * 0.3 ? HUDC.red : hx('#40d040'));
        fbText(String(Math.ceil(p.hp)), 108, y0 + 14, HUDC.txt);
        fbText('ARMOR', 42, y0 + 25, HUDC.dim); fbRect(76, y0 + 26, 28, 5, hx('#100806')); fbRect(76, y0 + 26, Math.round(28 * p.armor / 100), 5, hx('#5a8ae0'));
        // weapon
        fbRect(128, y0 + 4, 92, 34, HUDC.panel); fbBox(128, y0 + 4, 92, 34, HUDC.edge);
        let wn, am;
        if (p.god > 0) { wn = 'HAND OF GLORY'; am = Math.ceil(p.god) + 'S'; }
        else if (p.dog > 0) { wn = 'BARK BLAST'; am = Math.ceil(p.dog) + 'S'; }
        else if (p.wpn === 3 && p.missile) { wn = MISSILES[p.missile].name; am = String(p.mammo); }
        else { wn = ['PISTOL', 'TWIN PISTOLS', 'BURST CARBINE'][p.wpn]; am = 'UNLIMITED'; }
        fbText(wn, 174, y0 + 8, HUDC.txt, 1, 'center'); fbText(am, 174, y0 + 18, p.god > 0 || p.dog > 0 ? hx('#ffe060') : HUDC.hl, 1, 'center');
        for (let i = 0; i < 4; i++) { const has = i === 3 ? !!p.missile : p.has[i]; fbText(String(i + 1), 146 + i * 10, y0 + 28, p.wpn === i && p.god <= 0 && p.dog <= 0 ? hx('#ffffff') : has ? HUDC.hl : hx('#4a3a2a')); }
        // keys
        for (let k = 1; k <= 3; k++) { const kx = 226 + (k - 1) * 11; fbRect(kx, y0 + 25, 9, 12, hx('#100806')); if (p.keys[k]) { fbRect(kx + 2, y0 + 26, 5, 4, KEYCOL[k]); fbRect(kx + 4, y0 + 27, 1, 2, hx('#100806')); fbRect(kx + 3, y0 + 30, 2, 6, KEYCOL[k]); fbRect(kx + 5, y0 + 33, 2, 1, KEYCOL[k]); } }
        // score / lives / level
        fbText('SCORE', 226, y0 + 4, HUDC.dim); fbText(String(p.score), 316, y0 + 4, HUDC.txt, 1, 'right');
        fbText('LIVES ' + p.lives, 226, y0 + 14, HUDC.txt);
        fbText('AREA ' + (level + 1), 316, y0 + 14, HUDC.hl, 1, 'right');
        const m = Math.floor(lv.time / 60), s2 = Math.floor(lv.time % 60);
        fbText(m + ':' + String(s2).padStart(2, '0'), 316, y0 + 28, HUDC.dim, 1, 'right');
      }
      function drawMap() {
        const G = lv.G; const sc = Math.max(2, Math.min(Math.floor(150 / MH), Math.floor(300 / MW)));
        const ox = (W - MW * sc) >> 1, oy = (VH - MH * sc) >> 1;
        fbShade(0, 0, W, VH, 0.25);
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
          const t = y * MW + x; if (!seen[t]) continue;
          let c = 0;
          if (wallM[t]) c = wallM[t] === T.exit || wallM[t] === T.exitOff ? hx('#ff3020') : hx('#a08a6a');
          else if (doorM[t]) c = doorM[t].secret ? hx('#a08a6a') : doorM[t].key ? KEYCOL[doorM[t].key] : hx('#40a0ff');
          else if (floorM[t] === FL.lava) c = hx('#a03000'); else if (floorM[t] === FL.pad) c = hx('#ffd23a'); else c = hx('#2a2420');
          fbRect(ox + x * sc, oy + y * sc, sc, sc, c);
        }
        const px2 = ox + player.x * sc, py2 = oy + player.y * sc;
        fbRect(px2 - 1, py2 - 1, 3, 3, hx('#ffffff')); fbRect(px2 + Math.cos(player.a) * 3, py2 + Math.sin(player.a) * 3, 1, 1, hx('#ffff00'));
        fbText(LEVELS[level].name, W / 2, 4, HUDC.txt, 1, 'center');
      }
      function drawMsgs() {
        let y = 4;
        for (const m of msgs) { fbText(m.t, W / 2, y, m.life < 0.4 && ((m.life * 20) | 0) % 2 ? HUDC.dim : hx('#fff4c0'), 1, 'center', hx('#000000')); y += 10; }
      }
      function bigTitle(y) {
        fbText('RISE OF THE', W / 2 + 2, y + 2, hx('#000000'), 2, 'center'); fbText('RISE OF THE', W / 2, y, hx('#ffd23a'), 2, 'center');
        fbText('TRIAD', W / 2 + 3, y + 21, hx('#000000'), 5, 'center');
        fbText('TRIAD', W / 2, y + 18, hx('#e02818'), 5, 'center');
        fbRect(W / 2 - 74, y + 55, 148, 2, hx('#ffd23a'));
      }
      function credits() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function render(ctx) {
        if (!img) { img = ctx.createImageData(W, H); fb = new Uint32Array(img.data.buffer); }
        const t = api.time;
        fb.fill(0xff000000);
        if (mode === 'attract') {
          if (demo) {
            const a = demo.a + Math.sin(attractT * 0.15) * 2.2;
            VH = 200;
            render3D({ x: demo.x, y: demo.y, a, ez: EYE, t }, gatherSprites(t));
            VH = 160;
          }
          fbShade(0, 0, W, H, 0.55);
          const phase = Math.floor(attractT / 9) % 3;
          if (phase === 0) {
            bigTitle(24);
            fbText('THE ABBOT\'S ISLAND', W / 2, 92, hx('#ffffff'), 1, 'center', hx('#000000'));
            fbText('\u00a9 1995 APOGEE  -  GAME ROOM EDITION', W / 2, 186, hx('#a0a0a0'), 1, 'center');
          } else if (phase === 1) {
            fbText('MEET THE ABBOT\'S FLOCK', W / 2, 10, hx('#ffd23a'), 1, 'center', hx('#000000'));
            const list = [['guard', 'GRUNT', 200], ['trooper', 'STRIKE TROOPER', 400], ['monk', 'EMBER MONK', 500], ['shield', 'BULWARK', 700], ['rocket', 'ROCKETEER', 600]];
            list.forEach(([k, n, p], i) => { const x = 22 + i * 60; fbBlit(ESPR[k][((attractT * 2) | 0) % 2 ? 'walk1' : 'aim'], x, 34, 1); fbText(n.split(' ')[0], x + 16, 88, hx('#ffffff'), 1, 'center'); fbText(String(p), x + 16, 98, hx('#ffd23a'), 1, 'center'); });
            fbText('JUMP PADS. GRAVITY DISKS. SPINNING BLADES.', W / 2, 118, hx('#ff9a40'), 1, 'center');
            fbText('GOD MODE. DOG MODE. FIVE KINDS OF MISSILE.', W / 2, 130, hx('#ff9a40'), 1, 'center');
          } else {
            fbText('HIGH SCORE', W / 2, 40, hx('#ffd23a'), 2, 'center', hx('#000000'));
            fbText(String(hi), W / 2, 64, hx('#ffffff'), 2, 'center', hx('#000000'));
            fbText('ARROWS MOVE  SPACE FIRES  X SWAPS GUNS', W / 2, 100, hx('#c0c0c0'), 1, 'center');
            fbText('A/D OR HOLD Z TO STRAFE  TAB = MAP', W / 2, 112, hx('#c0c0c0'), 1, 'center');
            fbText('BUMP DOORS TO OPEN THEM', W / 2, 124, hx('#c0c0c0'), 1, 'center');
          }
          const blink = ((t * 2) | 0) % 2;
          if (coinFlash > 0) { if (((t * 8) | 0) % 2) fbText('INSERT COIN', W / 2, 160, hx('#ff4030'), 1, 'center'); }
          else if (api.credits > 0) { if (blink) fbText('PUSH START', W / 2, 160, hx('#ffffff'), 1, 'center', hx('#000000')); }
          else if (blink) fbText('INSERT COIN', W / 2, 160, hx('#ff4030'), 1, 'center');
          fbText(credits(), 4, 191, hx('#909090'));
          fbText('HI ' + hi, 316, 191, hx('#909090'), 1, 'right');
        } else if (mode === 'select') {
          fbRect(0, 0, W, H, hx('#160c08'));
          for (let y = 0; y < H; y += 4) fbRect(0, y, W, 1, hx('#1e120c'));
          fbText('CHOOSE YOUR COMMANDO', W / 2, 8, hx('#ffd23a'), 2, 'center', hx('#000000'));
          CHARS.forEach((c, i) => { const x = 14 + i * 60, sel = i === selIdx; fbRect(x - 2, 30, 36, 36, sel ? hx('#ffd23a') : hx('#4a3020')); fbBlit(c.pic, x, 32, 1); if (sel && ((t * 4) | 0) % 2) fbBox(x - 4, 28, 40, 40, hx('#ffffff')); });
          const c = CHARS[selIdx];
          fbBlit(c.pic, 20, 80, 2);
          fbText(c.name, 96, 80, hx('#ffffff'), 1); fbText(c.role, 96, 90, hx('#ff9a40'));
          const bar = (lbl, v, y) => { fbText(lbl, 96, y, hx('#a08a6a')); fbRect(160, y, 100, 7, hx('#2a1a10')); fbRect(160, y + 1, Math.round(clamp(v, 0, 1) * 100), 5, hx('#e0a030')); };
          bar('HEALTH', c.hp / 150, 104); bar('SPEED', c.speed / 1.3, 114); bar('AIM', c.acc / 1.35, 124); bar('JUMP', c.jump / 1.25, 134);
          wrapText(c.blurb, 36).forEach((l, i) => fbText(l, 96, 150 + i * 10, hx('#ffe8c0')));
          fbText('LEFT/RIGHT TO CHOOSE  -  SPACE TO DEPLOY', W / 2, 188, hx('#909090'), 1, 'center');
        } else if (mode === 'intro') {
          fbRect(0, 0, W, H, hx('#120a08'));
          fbText('AREA ' + (level + 1), W / 2, 40, hx('#ff9a40'), 2, 'center');
          fbText(LEVELS[level].name, W / 2, 64, hx('#ffd23a'), 2, 'center', hx('#000000'));
          wrapText(LEVELS[level].blurb, 44).forEach((l, i) => fbText(l, W / 2, 100 + i * 11, hx('#ffffff'), 1, 'center'));
          fbText(player.ch.name + '  x' + player.lives, W / 2, 160, hx('#a08a6a'), 1, 'center');
          if (((t * 2) | 0) % 2) fbText('GET READY', W / 2, 176, hx('#ffffff'), 1, 'center');
        } else if (mode === 'tally') {
          fbRect(0, 0, W, H, hx('#120a08'));
          fbText(LEVELS[level].name, W / 2, 18, hx('#ffd23a'), 1, 'center');
          fbText('AREA COMPLETE', W / 2, 32, hx('#ffffff'), 2, 'center');
          const row = (l, v, y, k) => { if (modeT > k) { fbText(l, 70, y, hx('#ff9a40')); fbText(v, 250, y, hx('#ffffff'), 1, 'right'); } };
          row('ENEMIES', tally.kills + '%', 70, 0.3); row('TREASURE', tally.tre + '%', 84, 0.6); row('SECRETS', tally.sec + '%', 98, 0.9);
          row('TIME', Math.floor(tally.time / 60) + ':' + String(Math.floor(tally.time % 60)).padStart(2, '0'), 112, 1.2);
          row('BONUS', String(tally.bonus), 130, 1.5); row('SCORE', String(player.score), 146, 1.8);
          if (modeT > 2 && ((t * 2) | 0) % 2) fbText('PRESS SPACE', W / 2, 176, hx('#a08a6a'), 1, 'center');
        } else if (mode === 'victory') {
          fbRect(0, 0, W, H, hx('#0a0614'));
          for (let i = 0; i < 40; i++) fbRect((hash(i, 1, 2) * W) | 0, (hash(i, 2, 3) * 100) | 0, 1, 1, hx('#ffffff'));
          bigTitle(10);
          const lines = ['THE ABBOT\'S THRONE CRASHES INTO THE SEA.', 'HIS FLOCK SCATTERS. THE ISLAND IS FREE,', 'AND THE COMMANDOS FLY HOME LOUDLY,', 'AS IS TRADITION.', '', 'CONGRATULATIONS, ' + player.ch.name + '!'];
          lines.forEach((l, i) => fbText(l, W / 2, 84 + i * 11, hx('#ffffff'), 1, 'center'));
          fbText('FINAL SCORE ' + player.score, W / 2, 166, hx('#ffd23a'), 1, 'center');
        } else if (mode === 'over') {
          fbRect(0, 0, W, H, hx('#100404'));
          fbText('GAME OVER', W / 2, 70, hx('#e02818'), 3, 'center', hx('#000000'));
          fbText('SCORE ' + (player ? player.score : 0), W / 2, 110, hx('#ffffff'), 1, 'center');
          fbText('HIGH SCORE ' + hi, W / 2, 124, hx('#ffd23a'), 1, 'center');
        } else {
          // play / dying
          const p = player;
          let ez = (p.dog > 0 ? 0.3 : EYE) + p.z + Math.sin(p.bob * 2) * 0.012;
          let hz = shake ? (Math.random() - 0.5) * shake : 0;
          if (mode === 'dying') ez = Math.max(0.12, ez - deathT * 0.4);
          render3D({ x: p.x, y: p.y, a: p.a + (mode === 'dying' ? deathT * 0.3 : 0), ez, hz, t, flash: p.flashT > 0 ? 0.15 : 0 }, gatherSprites(t));
          if (mode === 'play') drawWeapon();
          if (p.god > 0) fbTint(0, 0, W, VH, hx('#ffe060'), 0.12 + Math.sin(t * 6) * 0.04);
          if (p.dog > 0) fbTint(0, 0, W, VH, hx('#a07a40'), 0.12);
          if (hurtFlash > 0) fbTint(0, 0, W, VH, hx('#ff0000'), Math.min(0.55, hurtFlash * 0.6));
          if (pickFlash > 0) fbTint(0, 0, W, VH, hx('#ffe080'), pickFlash * 0.6);
          const tt = Math.floor(p.y) * MW + Math.floor(p.x);
          if (floorM[tt] === FL.lava && p.z < 0.05 && !p.onGad) fbTint(0, 0, W, VH, hx('#ff5000'), 0.25);
          if (mode === 'dying') fbTint(0, 0, W, VH, hx('#800000'), Math.min(0.7, deathT * 0.4));
          if (showMap && mode === 'play') drawMap();
          // crosshair
          if (mode === 'play' && !showMap) { fbRect(159, VH / 2 - 3, 1, 2, hx('#ffffff')); fbRect(159, VH / 2 + 2, 1, 2, hx('#ffffff')); fbRect(155, VH / 2, 3, 1, hx('#ffffff')); fbRect(161, VH / 2, 3, 1, hx('#ffffff')); }
          drawMsgs();
          if (lv.boss && lv.boss.st !== 'dead' && lv.boss.st !== 'die' && lv.boss.st !== 'idle') { fbRect(80, 34, 160, 5, hx('#300000')); fbRect(80, 34, Math.round(160 * Math.max(0, lv.boss.hp) / lv.boss.d.hp), 5, hx('#e02818')); fbText('THE ABBOT SUPREME', W / 2, 42, hx('#ffd23a'), 1, 'center', hx('#000000')); }
          drawHud();
          if (mode === 'dying' && deathT > 1) fbText(player.lives > 1 ? 'YOU HAVE DIED' : 'LAST LIFE LOST', W / 2, 70, hx('#ffffff'), 2, 'center', hx('#000000'));
        }
        ctx.putImageData(img, 0, 0);
      }
      
      return { update, render, destroy() { } };
    }
  });
})();
