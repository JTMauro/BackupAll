// Blake Stone: Aliens of Gold (JAM Productions/Apogee, 1993) - an original take for the Game Room: a sci-fi secret-agent
// raycaster shooter set in a bio-research complex. Own engine with textured, lit floors and ceilings (light panels),
// colour keycards, friendly informants, food units and vending machines, an auto-map and eight floors ending in a boss.
(function () {
  'use strict';
  ArcadeRegistry.register({
    id: 'blakestone', title: 'Blake Stone: Aliens of Gold', year: 1993, maker: 'JAM Productions/Apogee',
    width: 320, height: 200, vector: false, pointer: false,
    controls: 'Arrows: move/turn \u00b7 Space: fire \u00b7 A/D or Z+Arrows: strafe \u00b7 1-5/X: weapon \u00b7 Enter/Tab: auto-map \u00b7 walk into doors, people and machines',
    marquee: { bg: '#06101e', fg: '#40c8ff', accent: '#ffcc33' },
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

      VH = 152; WH = 1; FOGK = 0.11; FOGMIN = 0.08;
      const EYE = 0.5;

      // ================= textures =================
      const T = {};
      function wallTex(fn) { WALLTEX.push(makeTex(64, 64, fn)); return WALLTEX.length - 1; }
      const C = n => hx(n), BLK = C('#0a0c10');
      function panel(x, y, base, s, pw, ph) {
        const px = x % pw, py = y % ph; let c = dk(base, 0.85 + fbm(x / 16, y / 16, s, 4) * 0.25);
        if (px === 0 || py === 0) c = dk(base, 0.45); else if (px === 1 || py === 1) c = dk(base, 1.25);
        return c;
      }
      T.lab = wallTex((x, y) => { let c = panel(x, y, C('#a8b0b8'), 1, 32, 32); if (y > 28 && y < 34) c = C('#3a7ab0'); if (y === 28 || y === 34) c = C('#1a3a5a'); return c; });
      T.blue = wallTex((x, y) => { let c = panel(x, y, C('#3a5a8a'), 2, 16, 64); if (x % 16 === 8 && y % 8 < 4) c = C('#7ab0ff'); return c; });
      T.steel = wallTex((x, y) => { let c = panel(x, y, C('#5a6068'), 3, 64, 16); if ((x === 4 || x === 59) && y % 16 === 8) c = C('#c0c8d0'); return c; });
      T.wood = wallTex((x, y) => { let c = dk(C('#7a5232'), 0.75 + fbm(x / 3, y / 20, 4, 21.3) * 0.4); if (x % 16 === 0) c = C('#3a2414'); if (y < 4 || y > 59) c = C('#5a5e66'); return c; });
      T.warn = wallTex((x, y) => { let c = panel(x, y, C('#5a6068'), 5, 64, 64); if (y > 48 && y < 60) c = ((x + y) >> 3) & 1 ? C('#f0c020') : C('#1a1a1a'); return c; });
      function comp(f) {
        return wallTex((x, y) => {
          let c = panel(x, y, C('#4a5260'), 6, 64, 64);
          if (x > 6 && x < 58 && y > 8 && y < 30) { c = C('#0a1a10'); if (y % 3 === 0 && hash(x >> 2, y, 7 + f) > 0.45) c = C('#40ff80'); }
          if (y > 36 && y < 52 && x > 6 && x < 58) { const bx = (x - 6) >> 3, by = (y - 36) >> 3; c = C('#22262c'); if (x % 8 > 1 && x % 8 < 6 && y % 8 > 1 && y % 8 < 6) c = hash(bx, by, f) > 0.5 ? [C('#ff3030'), C('#30ff60'), C('#ffcc20'), C('#40a0ff')][(bx + by + f) & 3] : C('#3a3a3a'); }
          return c;
        });
      }
      T.comp = comp(0); T.comp2 = comp(1); WALLANIM[T.comp] = [T.comp, T.comp2];
      function tank(f) {
        return wallTex((x, y) => {
          let c = panel(x, y, C('#5a6068'), 8, 64, 64);
          if (x > 10 && x < 54 && y > 6 && y < 58) {
            c = mixc(C('#0a4a2a'), C('#30c070'), y / 64 * 0.6 + fbm(x / 6, y / 6, 9) * 0.3);
            const cx = x - 32, cy = y - 32;
            if (Math.hypot(cx / 9, cy / 14) < 1) c = mixc(C('#c0a040'), C('#806010'), fbm(x / 3, y / 3, 3)); // a golden specimen
            if (Math.hypot(cx + 3, cy + 8) < 2 || Math.hypot(cx - 3, cy + 8) < 2) c = C('#ff3020');
            if (hash(x, (y + f * 9) >> 2, 2) > 0.985) c = C('#c0ffe0');
            if (x === 11 || x === 53) c = C('#a0e0c0');
          }
          return c;
        });
      }
      T.tank = tank(0); T.tank2 = tank(1); WALLANIM[T.tank] = [T.tank, T.tank, T.tank2, T.tank2]; WALLBRIGHT[T.tank] = WALLBRIGHT[T.tank2] = 1;
      T.vend = wallTex((x, y) => {
        let c = C('#8a1c1c'); if (x < 3 || x > 60) c = C('#3a0a0a');
        if (x > 6 && x < 40 && y > 6 && y < 44) { c = C('#1a1e24'); const bx = (x - 6) % 11, by = (y - 6) % 12; if (bx > 2 && bx < 9 && by > 3 && by < 10) c = [C('#ffcc20'), C('#40c040'), C('#e06020'), C('#a040e0')][(((x - 6) / 11 | 0) + ((y - 6) / 12 | 0)) & 3]; if (by === 11) c = C('#6a7078'); }
        if (x > 44 && x < 58 && y > 8 && y < 20) c = C('#30ff70'); if (x > 44 && x < 58 && y > 24 && y < 40) c = ((y >> 2) & 1) ? C('#c0c0c0') : C('#5a5a5a');
        if (y > 48 && y < 58 && x > 8 && x < 40) c = C('#0a0a0a');
        if (y > 2 && y < 6 && x > 6 && x < 58) c = C('#ffe060');
        return c;
      });
      WALLBRIGHT[T.vend] = 1;
      function doorTex(stripe, slot) {
        return wallTex((x, y) => {
          let c = panel(x, y, C('#7a828c'), 11, 64, 64);
          if (x < 2 || x > 61) c = C('#2a2e34');
          if (x > 20 && x < 44 && y > 8 && y < 22) c = C('#0a1420'), (hash(x, y, 3) > 0.97) && (c = C('#406080'));
          if (stripe && y > 32 && y < 40) c = dk(stripe, ((x >> 2) & 1) ? 1 : 0.8);
          if (slot && x > 50 && x < 58 && y > 26 && y < 46) { c = C('#1a1a1a'); if (y > 28 && y < 44 && x > 52 && x < 56) c = stripe; }
          if (x === 31 || x === 32) c = C('#3a3e44');
          return c;
        });
      }
      T.door = doorTex(C('#c0c8d0'), false);
      T.dred = doorTex(C('#e02020'), true); T.dyel = doorTex(C('#f0d020'), true); T.dblue = doorTex(C('#2a6aff'), true);
      T.jamb = wallTex((x, y) => { let c = panel(x, y, C('#4a4e56'), 13, 8, 64); return c; });
      T.elev = wallTex((x, y) => {
        let c = panel(x, y, C('#8a7a5a'), 14, 64, 64);
        if (x > 6 && x < 50 && y > 4) { c = dk(C('#b8a070'), 0.85 + fbm(x / 20, y / 20, 3) * 0.2); if (x === 28) c = C('#3a3020'); }
        if (x > 52 && x < 62 && y > 22 && y < 44) { c = C('#202020'); if (y > 25 && y < 31 && x > 54 && x < 60) c = C('#ffe060'); if (y > 35 && y < 41 && x > 54 && x < 60) c = C('#ff4020'); }
        if (y < 4 && x > 18 && x < 40) c = C('#30ff60');
        return c;
      });
      T.elevOff = WALLTEX.length; WALLTEX.push(makeTex(64, 64, (x, y) => { const c = WALLTEX[T.elev].d[y * 64 + x]; return (y < 4 && x > 18 && x < 40) || (x > 54 && x < 60 && y > 25 && y < 41) ? C('#5a2020') : c; }));
      WALLBRIGHT[T.elev] = 1;
      JAMB = T.jamb;
      const KEYDOOR = [0, T.dred, T.dyel, T.dblue], KEYNAME = ['', 'RED', 'YELLOW', 'BLUE'], KEYCOL = [0, C('#ff3030'), C('#ffe030'), C('#3a7aff')];
      function flTex(fn) { FLOORTEX.push(makeTex(64, 64, fn)); return FLOORTEX.length - 1; }
      function ceTex(fn) { CEILTEX.push(makeTex(64, 64, fn)); return CEILTEX.length - 1; }
      const FL = {}, CE = {};
      FL.tile = flTex((x, y) => { let c = dk(C('#8a8e94'), 0.85 + fbm(x / 8, y / 8, 21, 8) * 0.2); if (x % 32 === 0 || y % 32 === 0) c = C('#4a4e54'); return c; });
      FL.lab = flTex((x, y) => { const k = ((x >> 4) + (y >> 4)) & 1; let c = k ? C('#7aa890') : C('#4a6a5a'); if (x % 16 === 0 || y % 16 === 0) c = C('#2a3a32'); return dk(c, 0.9 + hash(x, y, 4) * 0.1); });
      FL.carpet = flTex((x, y) => dk(C('#2a3a6a'), 0.8 + hash(x, y, 5) * 0.2 + ((x + y) % 8 === 0 ? 0.15 : 0)));
      FL.grate = flTex((x, y) => { let c = C('#14161a'); if (x % 8 < 2 || y % 8 < 2) c = dk(C('#6a727c'), 0.8 + hash(x >> 3, y >> 3, 7) * 0.3); return c; });
      FL.hall = flTex((x, y) => { let c = dk(C('#5a5e66'), 0.85 + fbm(x / 10, y / 10, 22, 6.4) * 0.2); if (y % 64 < 2) c = C('#e0b020'); if (x % 32 === 0) c = C('#3a3e44'); return c; });
      CE.acoustic = ceTex((x, y) => { let c = dk(C('#9a9a94'), 0.85 + hash(x, y, 31) * 0.15); if (x % 32 === 0 || y % 32 === 0) c = C('#5a5a56'); if (hash(x >> 1, y >> 1, 3) > 0.93) c = dk(c, 0.7); return c; });
      CE.light = ceTex((x, y) => { let c = C('#e8f4ff'); if (x < 4 || x > 59 || y < 4 || y > 59) c = C('#6a6e74'); else if (x % 15 === 4) c = C('#a8c0d8'); return c; });
      CEILBRIGHT[CE.light] = 1;
      CE.metal = ceTex((x, y) => { let c = dk(C('#4a5058'), 0.85 + fbm(x / 16, y / 16, 33, 4) * 0.2); if (x % 16 === 0 || y % 16 === 0) c = C('#22262a'); return c; });
      CE.dark = ceTex((x, y) => dk(C('#2a2e34'), 0.8 + hash(x, y, 34) * 0.2));

      // ================= sprites =================
      function human(o, pose) {
        const s = spr(32, 48), sk = C(o.skin || '#e0a878'), top = C(o.top), top2 = C(o.top2 || o.top), lg = C(o.legs), bt = C(o.boots || '#1a1c20');
        const walk = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0, aim = pose === 'aim' || pose === 'fire', pain = pose === 'pain';
        const bob = walk ? 1 : 0;
        sr(s, 11 + walk, 28 + bob, 4, 15, lg); sr(s, 17 - walk, 28 + bob, 4, 15, lg);
        sr(s, 10 + walk, 43, 5, 4, bt); sr(s, 17 - walk, 43, 5, 4, bt);
        sr(s, 10, 13 + bob, 12, 15, top); sr(s, 11, 14 + bob, 10, 1, dk(top, 1.25));
        if (o.coat) { sr(s, 9, 13 + bob, 14, 22, C('#f0f0ec')); sr(s, 15, 15 + bob, 2, 20, C('#c8c8c4')); sr(s, 13, 13 + bob, 6, 4, top); sr(s, 10, 20 + bob, 3, 3, C('#5080c0')); }
        if (o.plate) { sr(s, 10, 14 + bob, 12, 9, top2); sr(s, 10, 18 + bob, 12, 1, dk(top2, 0.6)); sr(s, 8, 13 + bob, 4, 4, top2); sr(s, 20, 13 + bob, 4, 4, top2); }
        sr(s, 10, 25 + bob, 12, 2, C(o.belt || '#22262c'));
        const arm = o.coat ? C('#f0f0ec') : top;
        if (pain) { sr(s, 6, 6, 4, 10, arm); sr(s, 22, 6, 4, 10, arm); sr(s, 6, 4, 4, 3, sk); sr(s, 22, 4, 4, 3, sk); }
        else if (aim) { sr(s, 8, 15 + bob, 4, 9, arm); sr(s, 20, 15 + bob, 4, 9, arm); sr(s, 12, 20 + bob, 8, 4, arm); sr(s, 13, 22 + bob, 6, 3, sk); }
        else { sr(s, 7, 14 + bob, 3, 12, arm); sr(s, 22, 14 + bob, 3, 12, arm); sr(s, 7, 26 + bob, 3, 3, sk); sr(s, 22, 26 + bob, 3, 3, sk); }
        const hy = pain ? 3 : 2 + bob;
        se(s, 16, hy + 6, 4.5, 5.2, sk);
        sr(s, 14, hy + 5, 1, 1, BLK); sr(s, 18, hy + 5, 1, 1, BLK); sr(s, 15, hy + 9, 3, 1, dk(sk, 0.6));
        if (o.head === 'helmet') { se(s, 16, hy + 3, 5.5, 4.2, C(o.hat)); sr(s, 11, hy + 3, 11, 2, C(o.hat)); sr(s, 12, hy + 4, 9, 3, C(o.visor)); sr(s, 12, hy + 4, 3, 1, C('#ffffff')); }
        else if (o.head === 'hair') { se(s, 16, hy + 2, 5, 3, C(o.hat)); sr(s, 11, hy + 2, 2, 5, C(o.hat)); sr(s, 20, hy + 2, 2, 5, C(o.hat)); if (o.glasses) { sr(s, 13, hy + 5, 3, 2, C('#a0d0ff')); sr(s, 17, hy + 5, 3, 2, C('#a0d0ff')); sr(s, 16, hy + 5, 1, 1, BLK); } }
        else if (o.head === 'bald') { se(s, 16, hy + 2, 4.5, 2, dk(sk, 1.1)); if (o.glasses) { sr(s, 13, hy + 5, 3, 2, C('#a0d0ff')); sr(s, 17, hy + 5, 3, 2, C('#a0d0ff')); } sr(s, 12, hy + 4, 1, 4, C('#c0c0c0')); sr(s, 20, hy + 4, 1, 4, C('#c0c0c0')); }
        if (o.gun) {
          if (aim) { const L = o.gun === 'rifle' ? 5 : 3; sr(s, 14, 18 + bob, 4, L + 2, C('#2a3038')); se(s, 16, 18 + bob, 1.5, 1.5, C(o.glow || '#60ffff')); if (pose === 'fire') { se(s, 16, 16 + bob, 4.5, 3.5, C(o.glow || '#60ffff')); se(s, 16, 16 + bob, 2, 2, C('#ffffff')); } }
          else if (o.gun === 'rifle') sl(s, 20, 26 + bob, 27, 14 + bob, C('#2a3038'), 2);
          else sr(s, 23, 28 + bob, 2, 4, C('#2a3038'));
        }
        if (o.clip) { sr(s, 22, 18 + bob, 4, 6, C('#b08a40')); sr(s, 22, 18 + bob, 4, 1, C('#808080')); }
        return outline(s, C('#0a0c10'));
      }
      function humanSet(o) { return { stand: human(o, 'stand'), walk1: human(o, 'walk1'), walk2: human(o, 'walk2'), aim: human(o, 'aim'), fire: human(o, 'fire'), pain: human(o, 'pain') }; }
      function mutant(pose, kind) {
        const s = spr(40, 48), g = C(kind === 'spit' ? '#8a4aa0' : '#5a9a3a'), g2 = C(kind === 'spit' ? '#c080d0' : '#9ad060'), dkc = dk(g, 0.6);
        const walk = pose === 'walk1' ? 2 : pose === 'walk2' ? -2 : 0, atk = pose === 'aim' || pose === 'fire', pain = pose === 'pain';
        sr(s, 12 + walk, 32, 6, 13, dkc); sr(s, 22 - walk, 32, 6, 13, dkc); sr(s, 10 + walk, 44, 9, 3, C('#2a2a20')); sr(s, 21 - walk, 44, 9, 3, C('#2a2a20'));
        if (kind === 'spit') { se(s, 20, 26, 13, 12, g); se(s, 20, 28, 9, 8, g2); for (let k = 0; k < 4; k++) se(s, 12 + k * 5, 22 + (k & 1) * 6, 2, 2, C('#e0ff60')); }
        else { se(s, 20, 24, 11, 12, g); se(s, 20, 26, 7, 8, g2); for (let k = 0; k < 4; k++) sr(s, 14, 20 + k * 3, 12, 1, dkc); }
        const ay = atk ? 8 : pain ? 4 : 20;
        if (kind === 'spit') { se(s, 7, ay + 8, 4, 6, g); se(s, 33, ay + 8, 4, 6, g); }
        else {
          sr(s, 4, ay, 6, 16, g); sr(s, 30, ay, 6, 16, g);
          for (let k = 0; k < 3; k++) { sl(s, 4 + k * 2, ay + (atk ? -1 : 16), 2 + k * 3, ay + (atk ? -6 : 21), C('#f0f0d0')); sl(s, 31 + k * 2, ay + (atk ? -1 : 16), 33 + k * 3, ay + (atk ? -6 : 21), C('#f0f0d0')); }
        }
        const hy = pain ? 4 : 2;
        se(s, 20, hy + 8, 7, 7, g); se(s, 17, hy + 7, 2, 2, C('#ffe020')); se(s, 23, hy + 7, 2, 2, C('#ffe020')); sr(s, 17, hy + 7, 1, 1, BLK); sr(s, 23, hy + 7, 1, 1, BLK);
        sr(s, 16, hy + 11, 9, pose === 'fire' ? 4 : 2, C('#3a0a0a')); if (pose === 'fire') { sr(s, 17, hy + 11, 1, 2, C('#ffffff')); sr(s, 23, hy + 11, 1, 2, C('#ffffff')); }
        if (kind === 'spit' && pose === 'fire') se(s, 20, hy + 14, 4, 3, C('#c0ff40'));
        se(s, 20, hy + 2, 4, 2, g2);
        return outline(s, C('#0a100a'));
      }
      function mutSet(k) { return { stand: mutant('stand', k), walk1: mutant('walk1', k), walk2: mutant('walk2', k), aim: mutant('aim', k), fire: mutant('fire', k), pain: mutant('pain', k) }; }
      function drone(pose) {
        const s = spr(32, 32);
        se(s, 16, 15, 12, 11, C('#6a7480')); se(s, 16, 13, 10, 8, C('#9aa4b0')); sr(s, 4, 15, 24, 2, C('#3a4048'));
        se(s, 16, 16, 5, 5, C('#1a1a1a')); se(s, 16, 16, 3, 3, C(pose === 'fire' ? '#ffffff' : pose === 'aim' ? '#ff6040' : '#ff2020'));
        sl(s, 6, 24, 3, 30, C('#3a4048')); sl(s, 26, 24, 29, 30, C('#3a4048')); sr(s, 14, 26, 4, 4, C(pose === 'walk1' ? '#40c0ff' : '#2080c0'));
        if (pose === 'pain') sr(s, 8, 8, 16, 2, C('#ffffff'));
        return outline(s, C('#0a0c10'));
      }
      function dSet() { return { stand: drone('stand'), walk1: drone('walk1'), walk2: drone('walk2'), aim: drone('aim'), fire: drone('fire'), pain: drone('pain') }; }
      function colossus(pose) {
        const s = spr(64, 80), gold = C('#d8a830'), gold2 = C('#f8d870'), dark = C('#3a3020');
        const walk = pose === 'walk1' ? 2 : pose === 'walk2' ? -2 : 0, atk = pose === 'aim' || pose === 'fire';
        sr(s, 18 + walk, 50, 10, 26, dark); sr(s, 36 - walk, 50, 10, 26, dark); sr(s, 15 + walk, 74, 15, 6, C('#202020')); sr(s, 34 - walk, 74, 15, 6, C('#202020'));
        se(s, 32, 34, 20, 20, gold); se(s, 32, 32, 14, 14, gold2); se(s, 32, 36, 6, 6, C(pose === 'fire' ? '#ffffff' : '#40e0ff'));
        for (let k = 0; k < 4; k++) sr(s, 18, 22 + k * 7, 28, 1, C('#a07818'));
        const ay = atk ? 18 : 30;
        sr(s, 4, ay, 10, 22, gold); sr(s, 50, ay, 10, 22, gold); sr(s, 2, ay + 20, 14, 8, C('#4a4a4a')); sr(s, 48, ay + 20, 14, 8, C('#4a4a4a'));
        if (atk) { se(s, 9, ay + 28, 4, 4, C(pose === 'fire' ? '#ffffff' : '#ff8030')); se(s, 55, ay + 28, 4, 4, C(pose === 'fire' ? '#ffffff' : '#ff8030')); }
        se(s, 32, 12, 9, 9, gold); sr(s, 24, 10, 16, 4, C('#101010')); sr(s, 26, 11, 4, 2, C('#ff2020')); sr(s, 34, 11, 4, 2, C('#ff2020'));
        sl(s, 26, 4, 20, -2, gold2, 2); sl(s, 38, 4, 44, -2, gold2, 2);
        if (pose === 'pain') sr(s, 14, 30, 36, 3, C('#ffffff'));
        return outline(s, C('#100c04'));
      }
      const ESPR = {
        tech: humanSet({ top: '#4a5a7a', top2: '#8a9ab8', legs: '#2a3448', head: 'helmet', hat: '#e0e4ea', visor: '#e02020', plate: true, gun: 'pistol' }),
        heavy: humanSet({ top: '#1a4a4a', top2: '#2a7a7a', legs: '#0a2a2a', head: 'helmet', hat: '#202428', visor: '#40ff60', plate: true, gun: 'rifle', glow: '#80ff80', skin: '#c08a60' }),
        mutant: mutSet('claw'), spitter: mutSet('spit'), drone: dSet(),
        boss: { stand: colossus('stand'), walk1: colossus('walk1'), walk2: colossus('walk2'), aim: colossus('aim'), fire: colossus('fire'), pain: colossus('pain') }
      };
      const SCI = [
        humanSet({ top: '#4a6a8a', legs: '#3a3a44', coat: true, head: 'hair', hat: '#5a3a1a', glasses: true, clip: true }),
        humanSet({ top: '#8a3a3a', legs: '#2a2a30', coat: true, head: 'bald', glasses: true, skin: '#c89070' }),
        humanSet({ top: '#3a7a4a', legs: '#4a3a2a', coat: true, head: 'hair', hat: '#e0c060', skin: '#f0c8a0', clip: true }),
        humanSet({ top: '#6a4a8a', legs: '#2a2a3a', coat: true, head: 'hair', hat: '#1a1010', skin: '#7a4a30', glasses: true })
      ];
      function item(w, h, fn) { const s = spr(w, h); fn(s); return outline(s, C('#0a0a0a')); }
      const ISPR = {
        firstaid: item(20, 14, s => { sr(s, 1, 2, 18, 12, C('#e8e8e8')); sr(s, 8, 4, 4, 8, C('#2080e0')); sr(s, 6, 6, 8, 4, C('#2080e0')); }),
        tray: item(20, 10, s => { sr(s, 0, 6, 20, 4, C('#9aa4b0')); se(s, 6, 5, 4, 2.5, C('#e0a040')); se(s, 14, 5, 4, 2.5, C('#60c040')); }),
        water: item(8, 14, s => { sr(s, 1, 3, 6, 11, C('#80c0ff')); sr(s, 2, 0, 4, 3, C('#e0e0e0')); }),
        food: item(12, 12, s => { se(s, 6, 6, 5.5, 5.5, C('#40e080')); se(s, 6, 6, 3.5, 3.5, C('#108040')); sr(s, 5, 3, 2, 6, C('#c0ffd0')); }),
        cell: item(12, 12, s => { sr(s, 2, 2, 8, 10, C('#3a4048')); sr(s, 3, 3, 6, 7, C('#40e0ff')); sr(s, 4, 0, 4, 2, C('#808890')); }),
        cellpack: item(20, 14, s => { for (let k = 0; k < 3; k++) { sr(s, 1 + k * 6, 3, 5, 11, C('#3a4048')); sr(s, 2 + k * 6, 4, 3, 8, C('#40e0ff')); } sr(s, 0, 0, 20, 3, C('#e0b020')); }),
        chip: item(12, 10, s => { sr(s, 1, 1, 10, 8, C('#206040')); for (let k = 0; k < 5; k++) { sp(s, 2 + k * 2, 0, C('#e0c040')); sp(s, 2 + k * 2, 9, C('#e0c040')); } sr(s, 4, 3, 4, 4, C('#101010')); }),
        bar: item(16, 8, s => { sr(s, 1, 2, 14, 6, C('#e0b020')); sr(s, 3, 0, 10, 3, C('#ffe060')); }),
        alien: item(14, 20, s => { sr(s, 2, 17, 10, 3, C('#5a4a20')); se(s, 7, 12, 3, 5, C('#ffd030')); se(s, 7, 5, 5, 4.5, C('#ffe060')); se(s, 5, 5, 1.5, 2, BLK); se(s, 9, 5, 1.5, 2, BLK); }),
        badge: item(16, 16, s => { se(s, 8, 8, 7.5, 7.5, C('#c0c8d0')); se(s, 8, 8, 5, 5, C('#2a5aa0')); sr(s, 7, 4, 2, 8, C('#ffe060')); sr(s, 4, 7, 8, 2, C('#ffe060')); }),
        rifle: item(26, 10, s => { sr(s, 0, 3, 22, 4, C('#5a6470')); sr(s, 14, 6, 3, 4, C('#2a2e34')); sr(s, 2, 4, 14, 1, C('#40e0ff')); }),
        repeater: item(26, 12, s => { sr(s, 0, 3, 20, 5, C('#3a3e44')); sr(s, 18, 2, 8, 7, C('#2a2e34')); sr(s, 6, 7, 4, 5, C('#2a2e34')); sr(s, 1, 4, 3, 3, C('#ff8030')); }),
        ion: item(28, 14, s => { sr(s, 0, 3, 24, 8, C('#5a4a7a')); se(s, 22, 7, 5, 5, C('#c080ff')); sr(s, 8, 10, 4, 4, C('#2a2e34')); }),
        lobber: item(28, 14, s => { sr(s, 2, 2, 22, 9, C('#2a5a3a')); se(s, 4, 6, 4, 5, C('#60ff80')); sr(s, 14, 10, 4, 4, C('#2a2e34')); })
      };
      ISPR.card = [null];
      for (let k = 1; k <= 3; k++) ISPR.card.push(item(16, 11, s => { sr(s, 0, 0, 16, 11, KEYCOL[k]); sr(s, 0, 2, 16, 2, C('#101010')); sr(s, 2, 6, 6, 3, C('#e0e0e0')); sr(s, 11, 5, 3, 4, C('#e0c040')); }));
      const DSPR = {
        console: item(24, 26, s => { sr(s, 1, 8, 22, 18, C('#4a5260')); sr(s, 3, 0, 18, 10, C('#3a4048')); sr(s, 5, 2, 14, 6, C('#30d070')); for (let k = 0; k < 5; k++) sr(s, 3 + k * 4, 12, 2, 2, [C('#ff3030'), C('#ffe030'), C('#30ff60')][k % 3]); }),
        plant: item(20, 30, s => { sr(s, 6, 20, 8, 10, C('#8a5a3a')); for (let k = 0; k < 7; k++) sl(s, 10, 20, 2 + k * 2.6, 2 + (k & 1) * 6, C('#3a8a3a'), 2); }),
        crate: item(24, 22, s => { sr(s, 0, 0, 24, 22, C('#7a6a4a')); sr(s, 0, 0, 24, 2, C('#5a4a2a')); sr(s, 0, 20, 24, 2, C('#5a4a2a')); sl(s, 1, 1, 22, 20, C('#5a4a2a'), 2); sr(s, 9, 8, 6, 5, C('#e0b020')); }),
        tube: item(20, 48, s => { sr(s, 1, 0, 18, 4, C('#5a6068')); sr(s, 1, 44, 18, 4, C('#5a6068')); sr(s, 3, 4, 14, 40, C('#2a8a5a')); se(s, 10, 24, 5, 9, C('#c09030')); se(s, 10, 17, 4, 3.5, C('#e0b040')); sr(s, 4, 4, 2, 40, C('#a0f0c0')); }),
        lamp: item(12, 40, s => { sr(s, 5, 8, 2, 30, C('#3a3a3a')); sr(s, 2, 37, 8, 3, C('#2a2a2a')); se(s, 6, 5, 5, 5, C('#fff0b0')); }),
        cooler: item(14, 30, s => { sr(s, 2, 12, 10, 18, C('#e0e0e0')); sr(s, 3, 0, 8, 12, C('#80c0ff')); sr(s, 5, 18, 4, 2, C('#2060c0')); }),
        desk: item(30, 18, s => { sr(s, 0, 4, 30, 4, C('#6a4a2a')); sr(s, 1, 8, 4, 10, C('#4a3020')); sr(s, 25, 8, 4, 10, C('#4a3020')); sr(s, 10, 0, 8, 5, C('#3a4048')); sr(s, 11, 1, 6, 3, C('#40c0ff')); })
      };
      function boom(f, col) { const s = spr(32, 32), r = 6 + f * 3.4; se(s, 16, 16, r, r, C(f < 3 ? col[0] : col[1])); se(s, 16, 16, r * 0.65, r * 0.65, C(f < 2 ? '#ffffff' : col[0])); return s; }
      const BOOMSPR = [0, 1, 2, 3, 4].map(f => boom(f, ['#a0f0ff', '#4080ff']));
      const ACIDSPR = [0, 1, 2, 3, 4].map(f => boom(f, ['#d0ff60', '#60a020']));
      const PROJSPR = {
        bolt: (() => { const s = spr(10, 10); se(s, 5, 5, 4.5, 4.5, C('#40e0ff')); se(s, 5, 5, 2, 2, C('#ffffff')); return s; })(),
        ion: (() => { const s = spr(16, 16); se(s, 8, 8, 7.5, 7.5, C('#a060ff')); se(s, 8, 8, 4, 4, C('#ffffff')); return s; })(),
        plasma: (() => { const s = spr(14, 14); se(s, 7, 7, 6.5, 6.5, C('#40ff60')); se(s, 7, 7, 3, 3, C('#e0ffe0')); return s; })(),
        acid: (() => { const s = spr(12, 12); se(s, 6, 6, 5.5, 5, C('#a0e020')); se(s, 5, 5, 2, 2, C('#f0ffa0')); return s; })(),
        boss: (() => { const s = spr(14, 14); se(s, 7, 7, 6.5, 6.5, C('#ff8030')); se(s, 7, 7, 3, 3, C('#ffffc0')); return s; })()
      };
      // first-person weapons (half size, blitted 2x)
      function fpGun(w, fire) {
        const s = spr(56, 40), sk = C('#d8a070'), sl2 = C('#2a3a5a');
        const glow = [C('#40e0ff'), C('#40e0ff'), C('#ff9030'), C('#c080ff'), C('#60ff80')][w];
        if (w === 0) { sr(s, 22, 6, 10, 18, C('#5a6470')); sr(s, 23, 2, 8, 5, C('#3a4048')); sr(s, 25, 10, 4, 8, glow); sr(s, 20, 22, 14, 18, sk); sr(s, 18, 30, 18, 10, sl2); }
        else if (w === 1) { sr(s, 22, 0, 10, 30, C('#6a7480')); sr(s, 24, 4, 6, 18, glow); sr(s, 20, 24, 16, 16, sk); sr(s, 10, 30, 12, 10, sk); sr(s, 18, 32, 20, 8, sl2); }
        else if (w === 2) { sr(s, 18, 2, 18, 30, C('#3a3e44')); for (let k = 0; k < 3; k++) se(s, 22 + k * 5, 4, 2, 2, BLK); sr(s, 20, 14, 14, 3, glow); sr(s, 14, 26, 26, 14, sk); sr(s, 12, 32, 30, 8, sl2); }
        else if (w === 3) { sr(s, 16, 0, 24, 34, C('#5a4a7a')); se(s, 28, 4, 9, 4, C('#2a1a3a')); se(s, 28, 4, 5, 2, glow); sr(s, 20, 12, 3, 20, glow); sr(s, 12, 28, 32, 12, sk); sr(s, 10, 34, 36, 6, sl2); }
        else { sr(s, 18, 4, 20, 30, C('#2a5a3a')); se(s, 28, 6, 8, 5, C('#0a2a10')); se(s, 28, 6, 4, 3, glow); sr(s, 14, 26, 28, 14, sk); sr(s, 12, 32, 32, 8, sl2); }
        if (fire) { se(s, 27, 1, 9, 5, glow); se(s, 27, 1, 4, 2, C('#ffffff')); }
        return outline(s, C('#06080a'));
      }
      const FPCACHE = {};
      function fpSpr(w, fire) { const k = w + (fire ? 'f' : ''); return FPCACHE[k] || (FPCACHE[k] = fpGun(w, fire)); }

      // ================= floors =================
      const FLOORS = [
        { name: 'RECEPTION AND SECURITY', cols: 3, rows: 3, keys: 1, foes: ['tech'], dens: 1.2, seed: 9101, theme: 0 },
        { name: 'ADMINISTRATION', cols: 4, rows: 3, keys: 1, foes: ['tech', 'tech', 'drone'], dens: 1.4, seed: 9202, theme: 1 },
        { name: 'GENETICS LAB A', cols: 4, rows: 4, keys: 2, foes: ['tech', 'mutant', 'drone'], dens: 1.6, seed: 9303, theme: 2 },
        { name: 'STORAGE AND POWER', cols: 4, rows: 4, keys: 2, foes: ['tech', 'heavy', 'mutant', 'drone'], dens: 1.7, seed: 9404, theme: 3 },
        { name: 'SPECIMEN VAULTS', cols: 5, rows: 4, keys: 2, foes: ['heavy', 'mutant', 'spitter', 'tech'], dens: 1.8, seed: 9505, theme: 2 },
        { name: 'BIO-TECH BARRACKS', cols: 5, rows: 4, keys: 3, foes: ['tech', 'heavy', 'heavy', 'drone', 'spitter'], dens: 2.0, seed: 9606, theme: 3 },
        { name: 'THE GOLD PROGRAM', cols: 5, rows: 5, keys: 3, foes: ['heavy', 'mutant', 'spitter', 'drone', 'tech'], dens: 2.1, seed: 9707, theme: 2 },
        { name: 'DR. VANE\'S PENTHOUSE', cols: 4, rows: 4, keys: 2, foes: ['heavy', 'spitter', 'mutant', 'drone'], dens: 1.8, seed: 9808, theme: 1, boss: true }
      ];
      const THEMES = [
        { walls: [T.lab, T.blue, T.wood], floors: [FL.tile, FL.carpet], amb: 0.44 },
        { walls: [T.wood, T.blue, T.lab], floors: [FL.carpet, FL.tile], amb: 0.42 },
        { walls: [T.lab, T.lab, T.steel], floors: [FL.lab, FL.tile], amb: 0.38 },
        { walls: [T.steel, T.warn, T.blue], floors: [FL.grate, FL.tile], amb: 0.34 }
      ];
      const ENEMY = {
        tech: { hp: 30, speed: 1.5, range: 10, cool: 1.2, dmg: [4, 9], kind: 'hit', pts: 300, h: 0.78, react: 0.6 },
        heavy: { hp: 60, speed: 1.35, range: 11, cool: 1.1, dmg: [3, 7], burst: 3, kind: 'hit', pts: 500, h: 0.82, react: 0.5 },
        mutant: { hp: 55, speed: 2.4, range: 1.3, cool: 0.8, dmg: [8, 14], kind: 'melee', pts: 400, h: 0.82, react: 0.3, w: 40 },
        spitter: { hp: 45, speed: 1.2, range: 10, cool: 1.8, dmg: [10, 14], kind: 'acid', pts: 450, h: 0.8, react: 0.6, w: 40 },
        drone: { hp: 25, speed: 2.0, range: 9, cool: 1.0, dmg: [3, 6], kind: 'hit', pts: 350, h: 0.42, z: 0.38, react: 0.3 },
        boss: { hp: 1500, speed: 1.0, range: 20, cool: 0.9, dmg: [12, 18], kind: 'boss', pts: 30000, h: 1.15, react: 0.2 }
      };
      const WEAP = [
        { name: 'CHARGE PISTOL', cost: 0, rate: 0.36, dmg: [9, 15], spread: 0.02 },
        { name: 'PULSE RIFLE', cost: 1, rate: 0.3, dmg: [16, 24], spread: 0.02 },
        { name: 'BURST REPEATER', cost: 1, rate: 0.1, dmg: [8, 12], spread: 0.045 },
        { name: 'ION CANNON', cost: 4, rate: 0.75, proj: 'ion' },
        { name: 'PLASMA LOBBER', cost: 6, rate: 0.95, proj: 'plasma' }
      ];
      const WITEM = ['', 'rifle', 'repeater', 'ion', 'lobber'];

      // ================= state =================
      let mode = 'attract', modeT = 0, attractT = 0, coinFlash = 0;
      let hi = api.getHiScore(40000);
      let player = null, level = 0, lv = null;
      let actors = [], items = [], projs = [], fx = [], decor = [];
      let msgs = [], hurtFlash = 0, pickFlash = 0, shake = 0, showMap = false, talk = null, tally = null, deathT = 0;
      const DBG = { god: false };
      const DYNL = [];
      let demo = null;

      const SND = {
        shot(w) {
          if (w === 0) { api.audio.tone(1200, 0.12, { type: 'square', vol: 0.07, slideTo: 300 }); api.audio.noise(0.06, { vol: 0.08, freq: 4000, type: 'highpass' }); }
          else if (w === 1) { api.audio.tone(900, 0.16, { type: 'sawtooth', vol: 0.08, slideTo: 180 }); api.audio.noise(0.08, { vol: 0.1, freq: 2500, type: 'bandpass' }); }
          else if (w === 2) { api.audio.tone(700, 0.06, { type: 'square', vol: 0.06, slideTo: 250 }); }
          else if (w === 3) { api.audio.tone(200, 0.5, { type: 'sawtooth', vol: 0.1, slideTo: 1200 }); }
          else { api.audio.tone(300, 0.3, { type: 'sine', vol: 0.12, slideTo: 90 }); api.audio.noise(0.2, { vol: 0.08, freq: 800 }); }
        },
        eshot() { api.audio.tone(1500, 0.08, { type: 'square', vol: 0.05, slideTo: 500 }); },
        boom() { api.audio.noise(0.6, { vol: 0.28, freq: 1200, slideTo: 70 }); api.audio.tone(110, 0.4, { type: 'triangle', vol: 0.16, slideTo: 35 }); },
        door() { api.audio.noise(0.25, { vol: 0.07, freq: 3000, type: 'highpass', slideTo: 800 }); api.audio.tone(400, 0.2, { type: 'sine', vol: 0.04, slideTo: 300 }); },
        locked() { api.audio.tone(180, 0.1, { type: 'square', vol: 0.09 }); api.audio.tone(140, 0.16, { type: 'square', vol: 0.09, delay: 0.1 }); },
        pick() { api.audio.melody([[1047, 0.04], [1568, 0.06]], { type: 'square', vol: 0.08 }); },
        treasure() { api.audio.melody([[1319, 0.04], [1568, 0.04], [2093, 0.08]], { type: 'triangle', vol: 0.12 }); },
        key() { api.audio.melody([[880, 0.05], [1109, 0.05], [1319, 0.05], [1760, 0.12]], { type: 'square', vol: 0.09 }); },
        weapon() { api.audio.melody([[440, 0.05], [660, 0.05], [880, 0.12]], { type: 'sawtooth', vol: 0.09 }); },
        hurt() { api.audio.tone(240, 0.14, { type: 'square', vol: 0.1, slideTo: 100 }); },
        alert(t) { if (t === 'mutant' || t === 'spitter') api.audio.noise(0.3, { vol: 0.12, freq: 600, slideTo: 200, type: 'bandpass' }); else if (t === 'drone') api.audio.tone(1800, 0.15, { type: 'sine', vol: 0.06, slideTo: 2400 }); else { api.audio.tone(520, 0.07, { type: 'square', vol: 0.07 }); api.audio.tone(780, 0.1, { type: 'square', vol: 0.07, delay: 0.07 }); } },
        die(t) { if (t === 'drone') { api.audio.noise(0.4, { vol: 0.15, freq: 2000, slideTo: 200 }); } else api.audio.tone(300, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 60 }); },
        pdie() { api.audio.melody([[440, 0.15], [349, 0.15], [294, 0.15], [220, 0.45]], { type: 'square', vol: 0.11 }); },
        talk() { api.audio.melody([[660, 0.04], [0, 0.03], [740, 0.04], [0, 0.03], [620, 0.05]], { type: 'square', vol: 0.06 }); },
        vend() { api.audio.melody([[523, 0.05], [392, 0.05], [262, 0.1]], { type: 'triangle', vol: 0.12 }); api.audio.noise(0.15, { vol: 0.08, freq: 500, delay: 0.2 }); },
        elev() { api.audio.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]], { type: 'sine', vol: 0.14 }); },
        secret() { api.audio.melody([[523, 0.08], [784, 0.08], [659, 0.08], [1047, 0.2]], { type: 'triangle', vol: 0.12 }); },
        oneup() { api.audio.melody([[659, 0.08], [784, 0.08], [1319, 0.08], [1047, 0.08], [1175, 0.08], [1568, 0.25]], { type: 'square', vol: 0.1 }); },
        melee() { api.audio.noise(0.12, { vol: 0.14, freq: 1500, type: 'bandpass' }); }
      };
      function theme() { api.audio.melody([[262, 0.15], [311, 0.15], [392, 0.15], [466, 0.3], [415, 0.15], [392, 0.15], [311, 0.3], [349, 0.15], [392, 0.6]], { type: 'triangle', vol: 0.1 }); }
      function say(t, dur) { msgs.unshift({ t, life: dur || 3 }); if (msgs.length > 2) msgs.length = 2; }
      function addScore(n) { const b = player.score; player.score = Math.max(0, player.score + n); if (n > 0 && Math.floor(player.score / 40000) > Math.floor(b / 40000)) { player.lives++; say('EXTRA LIFE!'); SND.oneup(); } }

      // ================= level building =================
      function compass(dx, dy) {
        const a = Math.atan2(dy, dx), k = Math.round(a / (Math.PI / 4));
        return ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'][(k + 8) % 8];
      }
      function buildLevel(n) {
        const L = FLOORS[n], th = THEMES[L.theme];
        const G = genLayout({ seed: L.seed, cols: L.cols, rows: L.rows, S: 9, keys: L.keys, secrets: 1 + (n >> 2), loops: 1 + (n >> 1), hazard: 0, doorFrac: 0.75, bigExit: !!L.boss, bigStart: false, startCorner: n % 2 === 0 });
        const R = G.R;
        actors = []; items = []; projs = []; fx = []; decor = []; talk = null;
        const ambient = new Float32Array(MW * MH), lights = [];
        for (const c of G.cells) {
          const r = R();
          c.rt = c === G.start ? 'lobby' : r < 0.3 ? 'lab' : r < 0.55 ? 'office' : r < 0.75 ? 'storage' : 'mess';
          if (L.boss && c === G.exit) c.rt = 'boss';
          c.wt = c.rt === 'lab' ? T.lab : c.rt === 'office' ? T.wood : c.rt === 'storage' ? T.steel : c.rt === 'boss' ? T.warn : R.pick(th.walls);
          c.ft = c.rt === 'lab' ? FL.lab : c.rt === 'office' ? FL.carpet : c.rt === 'storage' ? FL.grate : R.pick(th.floors);
          c.ct = c.rt === 'storage' ? CE.metal : c.rt === 'boss' ? CE.dark : CE.acoustic;
          c.amb = th.amb * (c.rt === 'storage' ? 0.75 : 1) * (R() < 0.15 ? 0.5 : 1);
        }
        const cellOf = (x, y) => G.cells[Math.min(G.Rw - 1, Math.floor(y / 9)) * G.C + Math.min(G.C - 1, Math.floor(x / 9))];
        const inRoom = (c, x, y) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1;
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
          const t = y * MW + x, c = cellOf(x, y);
          if (wallM[t]) {
            let wt = T.steel;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inMap(nx, ny) || wallM[ny * MW + nx]) continue; const nc = cellOf(nx, ny); if (inRoom(nc, nx, ny)) { wt = nc.wt; break; } }
            wallM[t] = wt;
          } else if (inRoom(c, x, y)) { floorM[t] = c.ft; ceilM[t] = c.ct; ambient[t] = c.amb; }
          else { floorM[t] = FL.hall; ceilM[t] = CE.metal; ambient[t] = th.amb * 0.8; }
        }
        // lab walls get computer banks and specimen tanks; mess rooms get vending machines
        let vendCount = 0;
        for (const c of G.cells) {
          const ring = [];
          for (let x = c.x0; x <= c.x1; x++) { if (x !== c.cx) { ring.push([x, c.y0 - 1]); ring.push([x, c.y1 + 1]); } }
          for (let y = c.y0; y <= c.y1; y++) { if (y !== c.cy) { ring.push([c.x0 - 1, y]); ring.push([c.x1 + 1, y]); } }
          c.ring = ring.filter(([x, y]) => inMap(x, y) && wallM[y * MW + x]);
          for (const [x, y] of c.ring) {
            const h = hash(x, y, n + 77);
            if (c.rt === 'lab' && h < 0.3) wallM[y * MW + x] = h < 0.15 ? T.comp : T.tank;
            else if (c.rt === 'mess' && h < 0.2) { wallM[y * MW + x] = T.vend; vendCount++; }
            else if (c.rt === 'storage' && h < 0.2) wallM[y * MW + x] = T.warn;
            else if (c.rt === 'boss' && h < 0.25) wallM[y * MW + x] = T.tank;
          }
        }
        if (vendCount < 2) { const cs = G.cells.filter(c => c !== G.exit && c.ring.length); for (let k = 0; k < 2 && cs.length; k++) { const c = R.pick(cs); const [x, y] = R.pick(c.ring); wallM[y * MW + x] = T.vend; } }
        lv = { n, G, exitTile: null, kills: 0, total: 0, treasure: 0, ttotal: 0, secrets: 0, stotal: 0, time: 0, bossDead: !L.boss, boss: null, keyAt: [] };
        for (const e of G.edges) {
          const t = e.by * MW + e.bx;
          if (e.type === 'door' || e.type === 'open' || e.type === 'hazard') addDoor(e.bx, e.by, e.horiz, T.door, 0, false);
          else if (e.type === 'lock') addDoor(e.bx, e.by, e.horiz, KEYDOOR[e.key], e.key, false);
          else if (e.type === 'secret') { const wt = wallM[e.horiz ? t - MW : t - 1] || T.steel; addDoor(e.bx, e.by, e.horiz, wt === T.vend || wt === T.comp || wt === T.tank ? T.steel : wt, 0, true); lv.stotal++; }
        }
        // the elevator out
        const ex = G.exit, good = ex.ring.filter(([x, y]) => !doorM[y * MW + x]);
        const et = good.length ? good[R.int(good.length)] : [ex.x0 - 1, ex.y0];
        wallM[et[1] * MW + et[0]] = L.boss ? T.elevOff : T.elev; lv.exitTile = et;
        lights.push({ x: et[0] + 0.5, y: et[1] + 0.5, r: 3, i: 0.4 });
        // the elevator we arrive in (decorative)
        const st = G.start, sg = st.ring.filter(([x, y]) => !doorM[y * MW + x]);
        if (sg.length) { const [x, y] = sg[R.int(sg.length)]; wallM[y * MW + x] = T.elevOff; }
        // ceiling light panels
        for (const c of G.cells) {
          for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
            if ((x - c.cx) % 3 === 0 && (y - c.cy) % 3 === 0) {
              if (c.amb < th.amb * 0.6 && hash(x, y, 5) < 0.6) continue;   // dim rooms: broken lights
              ceilM[y * MW + x] = CE.light; lights.push({ x: x + 0.5, y: y + 0.5, r: 4.2, i: 0.42 });
            }
          }
        }
        for (const e of G.edges) for (let i = 0; i < e.tiles.length; i += 4) { const [x, y] = e.tiles[i]; if (!doorM[y * MW + x]) { ceilM[y * MW + x] = CE.light; lights.push({ x: x + 0.5, y: y + 0.5, r: 3, i: 0.3 }); } }
        // decorations / items / actors
        const used = new Set(), key = (x, y) => y * MW + x;
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const w = wallM[y * MW + x]; if (w === T.vend || w === T.elev || w === T.elevOff) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inMap(x + dx, y + dy)) used.add(key(x + dx, y + dy)); }
        const occupyOK = (x, y) => !used.has(key(x, y)) && !wallM[key(x, y)] && !doorM[key(x, y)];
        for (const c of G.cells) {
          const off = roomTiles(c, true);
          const dlist = c.rt === 'lab' ? ['tube', 'console', 'tube', 'desk'] : c.rt === 'office' ? ['desk', 'plant', 'cooler', 'lamp'] : c.rt === 'storage' ? ['crate', 'crate', 'console'] : c.rt === 'boss' ? ['tube'] : ['plant', 'cooler', 'lamp'];
          const nDec = c.rt === 'boss' ? 4 : 2 + R.int(2);
          let placed = 0;
          for (let k = 0; k < nDec * 4 && placed < nDec && off.length; k++) {
            const [x, y] = R.pick(off);
            if (!occupyOK(x, y)) continue;
            let near = false; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (decor.some(d => Math.floor(d.x) === x + i && Math.floor(d.y) === y + j)) near = true;
            if (near) continue;
            const ty = R.pick(dlist);
            const d = { x: x + 0.5, y: y + 0.5, tex: DSPR[ty], h: { tube: 0.95, console: 0.5, desk: 0.38, plant: 0.6, cooler: 0.55, lamp: 0.85, crate: 0.5 }[ty], solid: true, type: ty, full: ty === 'lamp' };
            if (ty === 'lamp') lights.push({ x: d.x, y: d.y, r: 3.5, i: 0.35 });
            if (ty === 'tube') lights.push({ x: d.x, y: d.y, r: 2, i: 0.2 });
            decor.push(d); used.add(key(x, y)); placed++;
          }
          const free = () => { for (let k = 0; k < 40; k++) { const x = c.x0 + R.int(c.x1 - c.x0 + 1), y = c.y0 + R.int(c.y1 - c.y0 + 1); if (occupyOK(x, y) && !(x === c.cx && y === c.cy)) { used.add(key(x, y)); return [x + 0.5, y + 0.5]; } } return null; };
          const addItem = (type, h, extra) => { const p = free(); if (p) { const it = Object.assign({ x: p[0], y: p[1], type, tex: ISPR[type], h }, extra || {}); items.push(it); if (['chip', 'bar', 'alien'].includes(type)) lv.ttotal++; return it; } return null; };
          if (c.kind === 'secret') { addItem('alien', 0.3); addItem('bar', 0.14); addItem(R() < 0.5 ? 'badge' : 'cellpack', 0.25); continue; }
          if (c === G.start) { addItem('food', 0.18); addItem('cell', 0.18); continue; }
          const nIt = 1 + R.int(3);
          for (let k = 0; k < nIt; k++) {
            const r = R();
            if (r < 0.2) addItem('chip', 0.14); else if (r < 0.28) addItem('bar', 0.14);
            else if (r < 0.42) addItem('food', 0.18);
            else if (r < 0.56) addItem(R() < 0.5 ? 'firstaid' : 'tray', 0.22);
            else if (r < 0.62) addItem('water', 0.2);
            else if (r < 0.85) addItem('cell', 0.18); else addItem('cellpack', 0.22);
          }
          // informants: friendly scientists
          if (c.rt !== 'boss' && c.rt !== 'storage' && R() < (c.rt === 'lab' ? 0.55 : 0.3)) { const p = free(); if (p) spawnSci(p[0], p[1], R.int(SCI.length)); }
          if (c === G.exit && L.boss) continue;
          const nE = Math.max(1, Math.round(L.dens * (0.6 + R() * 0.8)));
          for (let k = 0; k < nE; k++) { const p = free(); if (p) spawnEnemy(R.pick(L.foes), p[0], p[1], R() * TAU); }
        }
        // weapons: one new gun per floor from floor 2
        const wc = G.cells.filter(c => c !== G.start && c.kind === 'room');
        const gun = Math.min(4, 1 + Math.floor(n / 2) + (n >= 6 ? 1 : 0));
        if (n >= 1 && wc.length) { const c = R.pick(wc); items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: WITEM[gun], tex: ISPR[WITEM[gun]], h: 0.2, gun }); }
        if (n === 0) { const c = G.cells.find(c => c.par === G.start.id) || G.start; items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: 'rifle', tex: ISPR.rifle, h: 0.2, gun: 1 }); }
        if (L.boss) { const c = G.cells[G.exit.par]; if (c) { items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: 'cellpack', tex: ISPR.cellpack, h: 0.22 }); items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: 'firstaid', tex: ISPR.firstaid, h: 0.22 }); } }
        G.keyCells.forEach((c, i) => { items.push({ x: c.cx + 0.5, y: c.cy + 0.5, type: 'card', key: i + 1, tex: ISPR.card[i + 1], h: 0.2 }); lv.keyAt[i + 1] = [c.cx + 0.5, c.cy + 0.5]; });
        if (L.boss) lv.boss = spawnEnemy('boss', G.exit.cx + 0.5, G.exit.cy + 0.5, 0);
        lv.total = actors.filter(a => !a.friendly).length;
        lv.secretAt = G.cells.filter(c => c.kind === 'secret').map(c => [c.cx + 0.5, c.cy + 0.5]);
        buildLights(ambient, lights);
        const e0 = st.edges[0], o = G.cells[e0.a === st.id ? e0.b : e0.a];
        return { x: st.cx + 0.5, y: st.cy + 0.5, a: Math.atan2(o.j - st.j, o.i - st.i) };
      }
      function spawnEnemy(type, x, y, a) {
        const d = ENEMY[type];
        const e = { type, d, x, y, a, hp: d.hp, st: 'idle', t: 0, cool: 1 + Math.random(), react: 0, burst: 0, anim: 0, pain: 0, fade: 0, spr: ESPR[type], strafe: 0, summoned: 0 };
        actors.push(e); return e;
      }
      function spawnSci(x, y, v) {
        const e = { type: 'sci', friendly: true, d: { hp: 20, h: 0.8, speed: 0.8 }, x, y, a: 0, hp: 20, st: 'wander', t: 0, anim: 0, pain: 0, fade: 0, spr: SCI[v], told: false, wx: x, wy: y, hx: x, hy: y, name: ['DR. OKONJO', 'DR. HALLIWELL', 'TECHNICIAN REYES', 'DR. MARSH', 'DR. LINDQVIST', 'ANALYST PARK'][(x * 7 + y * 3) % 6 | 0] };
        actors.push(e); return e;
      }

      // ================= player =================
      function newPlayer() { return { x: 0, y: 0, a: 0, vx: 0, vy: 0, hp: 100, lives: 3, score: 0, cells: 20, food: 0, wpn: 0, has: [true, false, false, false, false], keys: [false, false, false, false], fireT: 0, flashT: 0, bob: 0, dmgT: 0, lockMsg: 0, beat: 0 }; }
      function startLevel(n) {
        level = n; const s = buildLevel(n);
        Object.assign(player, { x: s.x, y: s.y, a: s.a, vx: 0, vy: 0, keys: [false, false, false, false] });
        mode = 'intro'; modeT = 0; msgs = []; showMap = false;
      }

      // ================= combat =================
      function damagePlayer(n) {
        if (mode !== 'play' || DBG.god) return;
        player.hp -= n; hurtFlash = Math.min(1, hurtFlash + n / 30); shake = Math.min(5, shake + n / 6);
        if (player.dmgT <= 0) { SND.hurt(); player.dmgT = 0.25; }
        if (player.hp <= 0) { player.hp = 0; mode = 'dying'; deathT = 0; SND.pdie(); }
      }
      function hurtActor(e, dmg) {
        if (e.st === 'die' || e.st === 'dead') return;
        e.hp -= dmg; e.pain = 0.15;
        if (e.friendly) {
          if (e.hp <= 0) { e.st = 'die'; e.t = 0; addScore(-1000); say('YOU SHOT AN INFORMANT! -1000', 3); SND.die('sci'); }
          else { e.st = 'flee'; e.t = 0; say(e.name + ': HEY! I\'M ON YOUR SIDE!', 2.5); }
          return;
        }
        if (e.st === 'idle') wake(e);
        if (e.hp <= 0) {
          e.st = 'die'; e.t = 0; SND.die(e.type); lv.kills++; addScore(e.d.pts);
          if (e.type === 'boss') { lv.bossDead = true; wallM[lv.exitTile[1] * MW + lv.exitTile[0]] = T.elev; say('PROJECT COLOSSUS DESTROYED! ELEVATOR ONLINE!', 4); for (let k = 0; k < 8; k++) fx.push({ x: e.x + (Math.random() - 0.5) * 1.4, y: e.y + (Math.random() - 0.5) * 1.4, z: Math.random() * 0.6, t: -k * 0.15, kind: 'boom' }); SND.boom(); }
          else if (Math.random() < 0.35) { const ty = e.type === 'drone' ? 'cell' : Math.random() < 0.6 ? 'cell' : 'food'; items.push({ x: e.x, y: e.y, type: ty, tex: ISPR[ty], h: 0.18 }); }
        } else if (e.type !== 'boss' && Math.random() < 0.5) { e.st = 'pain'; e.t = 0; }
      }
      function wake(e) { if (e.st === 'idle') { e.st = 'chase'; e.react = e.d.react * (0.5 + Math.random()); SND.alert(e.type); } }
      function noise(x, y, r) { for (const e of actors) if (e.st === 'idle' && Math.hypot(e.x - x, e.y - y) < r) wake(e); }
      function hitscan(dmg, spread) {
        const dx = Math.cos(player.a), dy = Math.sin(player.a);
        let best = null, bd = 1e9;
        for (const e of actors) {
          if (e.st === 'die' || e.st === 'dead') continue;
          const rx = e.x - player.x, ry = e.y - player.y, along = rx * dx + ry * dy; if (along <= 0.1) continue;
          const perp = Math.abs(-rx * dy + ry * dx); if (perp > 0.3 + along * spread) continue;
          if (along < bd && los(player.x, player.y, e.x, e.y)) { bd = along; best = e; }
        }
        if (best) { hurtActor(best, dmg); fx.push({ x: best.x - dx * 0.3, y: best.y - dy * 0.3, z: (best.d.z || 0) + 0.45, t: 0, kind: 'spark' }); }
        noise(player.x, player.y, 9);
      }
      function fireProj(kind, ang, owner, x, y, z) {
        const sp = kind === 'acid' ? 5 : kind === 'bolt' ? 7 : kind === 'boss' ? 6.5 : kind === 'plasma' ? 6 : 8;
        projs.push({ kind, x, y, z: z == null ? 0.45 : z, a: ang, sp, owner, t: 0 });
      }
      function explode(x, y, owner, power, acid) {
        SND.boom(); shake = Math.min(7, shake + 3);
        fx.push({ x, y, z: 0.3, t: 0, kind: acid ? 'acid' : 'boom' });
        DYNL.push({ x, y, r: 4.5, i: 1.3, t: 0.35 });
        const R = acid ? 0.9 : 2;
        for (const e of actors) { const d = Math.hypot(e.x - x, e.y - y); if (d < R && owner === 'p') hurtActor(e, power * (1 - d / R * 0.6)); }
        const pd = Math.hypot(player.x - x, player.y - y);
        if (pd < R) damagePlayer(power * (1 - pd / R) * (owner === 'p' ? 0.4 : 1));
        noise(x, y, 10);
      }
      function fireWeapon() {
        const p = player, w = WEAP[p.wpn];
        if (p.fireT > 0) return;
        if (w.cost > p.cells) { p.fireT = 0.3; api.audio.tone(120, 0.08, { type: 'square', vol: 0.06 }); say('NOT ENOUGH ENERGY CELLS', 1.2); autoSwitch(); return; }
        p.cells -= w.cost; p.fireT = w.rate; p.flashT = 0.08; SND.shot(p.wpn);
        if (w.proj) fireProj(w.proj, p.a, 'p', p.x, p.y, 0.4);
        else hitscan(w.dmg[0] + Math.random() * (w.dmg[1] - w.dmg[0]), w.spread);
        DYNL.push({ x: p.x + Math.cos(p.a) * 0.6, y: p.y + Math.sin(p.a) * 0.6, r: 3, i: 0.5, t: 0.1 });
      }
      function autoSwitch() { for (let w = 4; w >= 0; w--) if (player.has[w] && WEAP[w].cost <= player.cells && WEAP[w].cost < 4) { player.wpn = w; return; } player.wpn = 0; }
      function enemyShoot(e) {
        const d = e.d, dist = Math.hypot(player.x - e.x, player.y - e.y), ang = Math.atan2(player.y - e.y, player.x - e.x);
        if (d.kind === 'melee') { SND.melee(); if (dist < 1.5) damagePlayer(d.dmg[0] + Math.random() * (d.dmg[1] - d.dmg[0])); return; }
        if (d.kind === 'acid') { fireProj('acid', ang, 'e', e.x, e.y, 0.45); api.audio.noise(0.2, { vol: 0.1, freq: 900, type: 'bandpass' }); return; }
        if (d.kind === 'boss') { for (let i = -1; i <= 1; i++) fireProj('boss', ang + i * 0.14, 'e', e.x, e.y, 0.55); SND.shot(3); if (Math.random() < 0.3) fireProj('acid', ang + 0.4, 'e', e.x, e.y, 0.3); return; }
        SND.eshot();
        const moving = Math.hypot(player.vx, player.vy) > 1;
        let ch = 0.72 - dist * 0.045 - (moving ? 0.15 : 0);
        if (Math.random() < ch) damagePlayer(d.dmg[0] + Math.random() * (d.dmg[1] - d.dmg[0]));
        DYNL.push({ x: e.x, y: e.y, r: 2.5, i: 0.5, t: 0.1 });
      }

      // ================= update =================
      let flow = null, flowT = 0, flowTile = -1;
      function passEnemy(x, y) { const t = y * MW + x; if (wallM[t]) return false; const d = doorM[t]; if (d && (d.secret || (d.key && d.open < 0.9))) return false; return true; }
      function decorAt(x, y, r) { for (const d of decor) if (d.solid && Math.abs(d.x - x) < r + 0.2 && Math.abs(d.y - y) < r + 0.2) return true; return false; }
      function actorBlocked(x, y, r, self) {
        if (blockedAt(x, y, r) || decorAt(x, y, r)) return true;
        for (const e of actors) if (e !== self && e.st !== 'dead' && e.st !== 'die' && (!e.friendly || (self && self.friendly)) && Math.abs(e.x - x) < r + 0.28 && Math.abs(e.y - y) < r + 0.28) return true;
        if (self && Math.abs(player.x - x) < r + 0.25 && Math.abs(player.y - y) < r + 0.25) return true;
        return false;
      }
      function updateSci(e, dt) {
        if (e.st === 'flee' || e.st === 'wander') {
          const sp = (e.st === 'flee' ? 2.2 : 0.6) * dt;
          if (e.st === 'flee') { e.wx = e.x + (e.x - player.x); e.wy = e.y + (e.y - player.y); if (e.t > 3) e.st = 'wander'; }
          else if (Math.hypot(e.wx - e.x, e.wy - e.y) < 0.1 || e.t > 4) { e.t = 0; const a = Math.random() * TAU; e.wx = e.hx + Math.cos(a) * 1.5; e.wy = e.hy + Math.sin(a) * 1.5; }
          const dx = e.wx - e.x, dy = e.wy - e.y, l = Math.hypot(dx, dy) || 1;
          if (talk && talk.who === e) return;
          const nx = e.x + dx / l * sp, ny = e.y + dy / l * sp;
          if (!actorBlocked(nx, e.y, 0.25, e)) e.x = nx; else e.wx = e.x;
          if (!actorBlocked(e.x, ny, 0.25, e)) e.y = ny; else e.wy = e.y;
          e.anim += dt * 3;
        }
      }
      function updateActors(dt) {
        const ptile = Math.floor(player.y) * MW + Math.floor(player.x);
        flowT -= dt;
        if (flowT <= 0 || ptile !== flowTile) { flow = bfs(Math.floor(player.x), Math.floor(player.y), passEnemy, 40); flowT = 0.5; flowTile = ptile; }
        for (const e of actors) {
          e.t += dt; if (e.pain > 0) e.pain -= dt;
          if (e.st === 'dead') { e.fade += dt * 0.6; continue; }
          if (e.st === 'die') { if (e.t > 0.7) { e.st = 'dead'; e.fade = 0; } continue; }
          if (e.friendly) { updateSci(e, dt); continue; }
          const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy);
          if (e.st === 'idle') {
            e.anim += dt * 0.3;
            if (dist < 13 && mode === 'play' && ((e.lc = (e.lc || 0) - dt) <= 0)) { e.lc = 0.25; if (los(e.x, e.y, player.x, player.y)) wake(e); }
            continue;
          }
          if (e.st === 'pain') { if (e.t > 0.25) { e.st = 'chase'; e.t = 0; } continue; }
          if (mode !== 'play') continue;
          if (e.react > 0) { e.react -= dt; continue; }
          e.a = Math.atan2(dy, dx); e.cool -= dt;
          if (e.type === 'boss' && e.hp < e.d.hp * 0.5 && e.summoned < 2 && e.cool < 0) {
            e.summoned++; for (let k = 0; k < 3; k++) { const a = k * 2.1, x = e.x + Math.cos(a) * 2, y = e.y + Math.sin(a) * 2; if (!blockedAt(x, y, 0.3)) { const m = spawnEnemy(k === 1 ? 'spitter' : 'mutant', x, y, 0); m.st = 'chase'; lv.total++; fx.push({ x, y, z: 0.3, t: 0, kind: 'acid' }); } }
            say('THE SPECIMEN TANKS BURST OPEN!'); e.cool = 1.5;
          }
          if (e.st === 'attack') {
            if (e.t > 0.25 && !e.fired) { e.fired = true; enemyShoot(e); if (e.burst > 1) { e.burst--; e.t = 0.12; e.fired = false; } }
            if (e.t > 0.55) { e.st = 'chase'; e.t = 0; }
            continue;
          }
          if ((e.seeT = (e.seeT || 0) - dt) <= 0) { e.seeT = 0.2; e.sees = dist < 16 && los(e.x, e.y, player.x, player.y); }
          const see = e.sees;
          if (see && e.cool <= 0 && dist < e.d.range) { e.st = 'attack'; e.t = 0; e.fired = false; e.burst = e.d.burst || 1; e.cool = e.d.cool * (0.7 + Math.random() * 0.6) * (1.15 - level * 0.03); continue; }
          const sp = e.d.speed * (1 + level * 0.03) * dt;
          let mx = 0, my = 0;
          const tx = Math.floor(e.x), ty = Math.floor(e.y);
          const melee = e.d.kind === 'melee';
          if (see && dist < 4 && !melee && e.type !== 'boss') { e.strafe = e.strafe || (Math.random() < 0.5 ? 1 : -1); mx = -dy / dist * e.strafe; my = dx / dist * e.strafe; if (Math.random() < dt * 0.5) e.strafe = -e.strafe; }
          else if (see && (melee || e.type === 'boss')) { mx = dx / dist; my = dy / dist; if (e.type === 'boss' && dist < 3) { mx = -mx * 0.5; my = -my * 0.5; } }
          else if (flow && flow[ty * MW + tx] > 0) {
            let best = flow[ty * MW + tx], bx = tx, by = ty;
            for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = flow[(ty + oy) * MW + tx + ox]; if (v >= 0 && v < best) { best = v; bx = tx + ox; by = ty + oy; } }
            const d = doorM[by * MW + bx]; if (d && d.open < 0.9 && !d.key && !d.secret) { if (openDoor(d)) SND.door(); }
            const gx = bx + 0.5 - e.x, gy = by + 0.5 - e.y, gl = Math.hypot(gx, gy) || 1; mx = gx / gl; my = gy / gl;
          } else if (dist > 1.2) { mx = dx / dist; my = dy / dist; }
          if (dist < (melee ? 0.75 : 1.1) && e.type !== 'boss') { mx = -dx / dist * 0.5; my = -dy / dist * 0.5; }
          const r = e.type === 'boss' ? 0.45 : 0.28;
          const nx = e.x + mx * sp, ny = e.y + my * sp;
          if (!actorBlocked(nx, e.y, r, e)) e.x = nx;
          if (!actorBlocked(e.x, ny, r, e)) e.y = ny;
          if (mx || my) e.anim += dt * 4;
        }
        actors = actors.filter(e => !(e.st === 'dead' && e.fade >= 1));
      }
      function updateProjs(dt) {
        for (const p of projs) {
          p.t += dt;
          for (let s = 0; s < 3 && !p.dead; s++) {
            p.x += Math.cos(p.a) * p.sp * dt / 3; p.y += Math.sin(p.a) * p.sp * dt / 3;
            if (solid(Math.floor(p.x), Math.floor(p.y))) { p.dead = true; impact(p); break; }
            if (p.owner === 'p') { for (const e of actors) { if (e.st === 'die' || e.st === 'dead') continue; if (Math.hypot(e.x - p.x, e.y - p.y) < (e.type === 'boss' ? 0.65 : 0.38)) { p.dead = true; impact(p); break; } } }
            else if (Math.hypot(player.x - p.x, player.y - p.y) < 0.35) { p.dead = true; impact(p); }
          }
          if (p.kind === 'plasma' && p.t > 1.2 && !p.dead) { p.dead = true; impact(p); }
          if (p.t > 6) p.dead = true;
          if (!p.dead) DYN.push({ x: p.x, y: p.y, r: 2, i: 0.45 });
        }
        projs = projs.filter(p => !p.dead);
      }
      function impact(p) {
        const bx = p.x - Math.cos(p.a) * 0.15, by = p.y - Math.sin(p.a) * 0.15;
        if (p.kind === 'acid') { explode(bx, by, 'e', 11, true); return; }
        if (p.kind === 'boss') { explode(bx, by, 'e', 14); return; }
        if (p.kind === 'ion') { explode(bx, by, 'p', 85); return; }
        if (p.kind === 'plasma') { explode(bx, by, 'p', 110); return; }
      }
      function updateFx(dt) {
        for (const f of fx) f.t += dt;
        fx = fx.filter(f => f.t < (f.kind === 'boom' || f.kind === 'acid' ? 0.5 : 0.18));
        for (const L of DYNL) { L.t -= dt; DYN.push({ x: L.x, y: L.y, r: L.r, i: L.i * Math.max(0, L.t / 0.35) }); }
        for (let i = DYNL.length - 1; i >= 0; i--) if (DYNL[i].t <= 0) DYNL.splice(i, 1);
      }
      function hintFor(e) {
        const p = lv;
        const needKey = [1, 2, 3].find(k => p.keyAt[k] && !player.keys[k] && items.some(i => i.type === 'card' && i.key === k));
        const opts = [];
        if (needKey) { const [kx, ky] = p.keyAt[needKey]; opts.push('THE ' + KEYNAME[needKey] + ' ACCESS CARD IS IN A ROOM TO THE ' + compass(kx - e.x, ky - e.y) + '.'); }
        const [ex, ey] = p.exitTile; opts.push('THE ELEVATOR TO THE NEXT FLOOR IS TO THE ' + compass(ex + 0.5 - e.x, ey + 0.5 - e.y) + '.');
        if (p.secretAt.length) { const [sx, sy] = p.secretAt[0]; opts.push('THEY SAY THERE IS A HIDDEN STORE ROOM TO THE ' + compass(sx - e.x, sy - e.y) + '. CHECK THE WALLS.'); }
        opts.push('DR. VANE IS GROWING GOLDEN MONSTERS IN THOSE TANKS. STOP HIM, AGENT!');
        opts.push('THE VENDING MACHINES TAKE FOOD UNITS. EAT SOMETHING, YOU LOOK AWFUL.');
        return opts[needKey ? 0 : Math.floor(Math.random() * Math.min(3, opts.length))];
      }
      function talkTo(e) {
        if (talk && (talk.who === e || talk.t > 3.5)) return;
        let text, gift = '';
        if (!e.told) {
          e.told = true; text = hintFor(e);
          const r = (e.x * 13 + e.y * 7) % 3 | 0;
          if (r === 0) { player.food += 3; gift = 'HERE, TAKE MY FOOD UNITS. (+3)'; }
          else if (r === 1) { player.cells = Math.min(199, player.cells + 15); gift = 'I SWIPED SOME ENERGY CELLS. (+15)'; }
          else gift = 'I\'VE GOT NOTHING ELSE. GOOD LUCK.';
          addScore(100);
        } else { text = hintFor(e); gift = 'NOW PLEASE GET ME OUT OF HERE!'; }
        talk = { who: e, name: e.name, text, gift, t: 4.5, pic: e.spr.stand };
        SND.talk();
      }
      function tryBump() {
        const p = player, ax = p.x + Math.cos(p.a) * 0.62, ay = p.y + Math.sin(p.a) * 0.62;
        const tx = Math.floor(ax), ty = Math.floor(ay);
        // informants
        for (const e of actors) if (e.friendly && e.st !== 'die' && e.st !== 'dead' && Math.hypot(e.x - ax, e.y - ay) < 0.5) { talkTo(e); return; }
        if (!inMap(tx, ty)) return;
        const t = ty * MW + tx, d = doorM[t];
        if (d && d.open < 0.9) {
          if (d.key && !p.keys[d.key]) { if (!p.lockMsg) { say(KEYNAME[d.key] + ' ACCESS CARD REQUIRED'); SND.locked(); } p.lockMsg = 0.8; return; }
          if (d.secret && d.st === 0) { lv.secrets++; say('YOU FOUND A HIDDEN AREA!'); SND.secret(); addScore(1000); }
          if (openDoor(d)) SND.door();
        }
        if (wallM[t] === T.vend && !p.lockMsg) {
          p.lockMsg = 0.6;
          if (p.food <= 0) { say('THIS MACHINE NEEDS FOOD UNITS'); SND.locked(); }
          else if (p.hp >= 100) say('YOU ARE NOT HUNGRY RIGHT NOW');
          else { p.food--; p.hp = Math.min(100, p.hp + 12); say(['CANDY BAR', 'SOY SANDWICH', 'PROTEIN SHAKE', 'CHEESE PUFFS'][(Math.random() * 4) | 0] + '. +12 HEALTH'); SND.vend(); pickFlash = 0.2; }
        }
        if (lv.exitTile && tx === lv.exitTile[0] && ty === lv.exitTile[1]) {
          if (!lv.bossDead) { if (!p.lockMsg) { say('ELEVATOR LOCKED DOWN BY PROJECT COLOSSUS'); SND.locked(); } p.lockMsg = 0.8; return; }
          finishLevel();
        }
      }
      function finishLevel() {
        SND.elev();
        const pct = (a, b) => b ? Math.round(a * 100 / b) : 100;
        tally = { kills: pct(lv.kills, lv.total), tre: pct(lv.treasure, lv.ttotal), sec: pct(lv.secrets, lv.stotal), time: lv.time };
        let bonus = 0; if (tally.kills >= 100) bonus += 10000; if (tally.tre >= 100) bonus += 10000; if (tally.sec >= 100) bonus += 10000;
        const par = 80 + level * 25; if (lv.time < par) bonus += Math.floor(par - lv.time) * 100;
        tally.bonus = bonus; addScore(bonus); mode = 'tally'; modeT = 0;
      }
      function pickup(it) {
        const p = player, ty = it.type; let ok = true;
        if (ty === 'firstaid' || ty === 'tray' || ty === 'water') { const v = ty === 'firstaid' ? 25 : ty === 'tray' ? 15 : 5; if (p.hp >= 100) ok = false; else { p.hp = Math.min(100, p.hp + v); say(ty === 'firstaid' ? 'FIRST AID KIT' : ty === 'tray' ? 'CAFETERIA TRAY' : 'WATER FLASK'); SND.pick(); } }
        else if (ty === 'food') { p.food++; say('FOOD UNIT'); SND.pick(); }
        else if (ty === 'cell' || ty === 'cellpack') { if (p.cells >= 199) ok = false; else { p.cells = Math.min(199, p.cells + (ty === 'cell' ? 8 : 25)); say(ty === 'cell' ? 'ENERGY CELL' : 'CELL PACK'); SND.pick(); } }
        else if (ty === 'chip' || ty === 'bar' || ty === 'alien') { addScore(ty === 'chip' ? 100 : ty === 'bar' ? 500 : 2000); lv.treasure++; say(ty === 'chip' ? 'DATA CHIP' : ty === 'bar' ? 'GOLD BAR' : 'GOLDEN ALIEN STATUETTE!'); SND.treasure(); }
        else if (ty === 'badge') { p.lives++; say('BUREAU BADGE - EXTRA LIFE!'); SND.oneup(); }
        else if (ty === 'card') { p.keys[it.key] = true; say(KEYNAME[it.key] + ' ACCESS CARD'); SND.key(); }
        else if (it.gun) { const fresh = !p.has[it.gun]; p.has[it.gun] = true; p.cells = Math.min(199, p.cells + 20); if (fresh) p.wpn = it.gun; say(WEAP[it.gun].name + '!'); SND.weapon(); }
        if (ok) { it.dead = true; pickFlash = 0.22; }
      }
      function updatePlayer(dt) {
        const p = player;
        if (p.fireT > 0) p.fireT -= dt; if (p.flashT > 0) p.flashT -= dt; if (p.dmgT > 0) p.dmgT -= dt; if (p.lockMsg > 0) p.lockMsg = Math.max(0, p.lockMsg - dt);
        const strafeMode = api.key('KeyZ');
        let turn = 0, fwd = 0, side = 0;
        if (api.key('ArrowLeft')) { if (strafeMode) side -= 1; else turn -= 1; }
        if (api.key('ArrowRight')) { if (strafeMode) side += 1; else turn += 1; }
        if (api.key('ArrowUp') || api.key('KeyW')) fwd += 1;
        if (api.key('ArrowDown') || api.key('KeyS')) fwd -= 1;
        if (api.key('KeyA')) side -= 1; if (api.key('KeyD')) side += 1;
        p.a += turn * 2.6 * dt;
        const spd = 3.1, cx = Math.cos(p.a), cy = Math.sin(p.a);
        const tvx = (cx * fwd - cy * side) * spd, tvy = (cy * fwd + cx * side) * spd, k = Math.min(1, dt * 12);
        p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
        const r = 0.24;
        const blockedP = (x, y) => { if (blockedAt(x, y, r) || decorAt(x, y, r - 0.06)) return true; for (const e of actors) if (e.st !== 'dead' && e.st !== 'die' && !e.friendly && Math.abs(e.x - x) < r + (e.type === 'boss' ? 0.45 : 0.22) && Math.abs(e.y - y) < r + (e.type === 'boss' ? 0.45 : 0.22)) return true; return false; };
        if (!blockedP(p.x + p.vx * dt, p.y)) p.x += p.vx * dt; else p.vx = 0;
        if (!blockedP(p.x, p.y + p.vy * dt)) p.y += p.vy * dt; else p.vy = 0;
        if (fwd > 0) tryBump();
        p.bob += Math.hypot(p.vx, p.vy) * dt * 2.4;
        p.beat += dt * (1 + (100 - p.hp) / 40);
        for (const it of items) if (!it.dead && Math.hypot(it.x - p.x, it.y - p.y) < 0.5) pickup(it);
        items = items.filter(i => !i.dead);
        const sel = w => { if (p.has[w] && p.wpn !== w) { p.wpn = w; api.audio.tone(320, 0.04, { type: 'square', vol: 0.06 }); } };
        for (let i = 0; i < 5; i++) if (api.pressed('Digit' + (i + 1))) sel(i);
        if (api.pressed('KeyX')) { for (let i = 1; i <= 5; i++) { const w = (p.wpn + i) % 5; if (p.has[w]) { sel(w); break; } } }
        if (api.key('Space') || api.key('ControlLeft')) fireWeapon();
        if (api.pressed('Tab') || api.pressed('KeyM') || api.pressed('Enter')) showMap = !showMap;
      }
      function update(dt) {
        if (coinFlash > 0) coinFlash -= dt;
        if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt * 1.5);
        if (pickFlash > 0) pickFlash -= dt;
        if (shake > 0) shake = Math.max(0, shake - dt * 20);
        for (const m of msgs) m.life -= dt; msgs = msgs.filter(m => m.life > 0);
        if (talk) { talk.t -= dt; if (talk.t <= 0) talk = null; }
        modeT += dt;
        if (mode === 'attract') {
          attractT += dt;
          if (!demo) { demo = buildLevel(0); }
          updateDoors(dt, () => false);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { player = newPlayer(); mode = 'briefing'; modeT = 0; SND.elev(); }
            else { coinFlash = 1.5; SND.locked(); }
          }
          return;
        }
        if (mode === 'briefing') { if (modeT > 0.4 && api.anyPressed('Enter', 'Space') || modeT > 12) startLevel(0); return; }
        if (mode === 'intro') { if (modeT > 3 || (modeT > 0.5 && api.anyPressed('Enter', 'Space'))) { mode = 'play'; modeT = 0; } return; }
        if (mode === 'tally') { if (modeT > 6 || (modeT > 1.2 && api.anyPressed('Enter', 'Space'))) { if (level + 1 >= FLOORS.length) { mode = 'victory'; modeT = 0; theme(); } else startLevel(level + 1); } return; }
        if (mode === 'victory') { if (modeT > 14 || (modeT > 3 && api.anyPressed('Enter', 'Space'))) gameOver(); return; }
        if (mode === 'over') { if (modeT > 6 || (modeT > 1.5 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; attractT = 0; demo = null; } return; }
        if (mode === 'dying') {
          deathT += dt; updateActors(dt); updateProjs(dt); updateFx(dt);
          if (deathT > 2.2 && !player.contPending) {
            player.lives--;
            if (player.lives > 0) restartAfterDeath();
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
        updateActors(dt); updateProjs(dt); updateFx(dt);
      }
      function restartAfterDeath() {
        const keep = player; player = newPlayer(); player.lives = keep.lives; player.score = keep.score; player.has = keep.has.slice(); player.cells = Math.max(20, Math.min(keep.cells, 60)); player.food = keep.food;
        startLevel(level);
      }
      function gameOver() { if (player && player.score > hi) { hi = player.score; api.setHiScore(hi); } mode = 'over'; modeT = 0; }

      // ================= rendering =================
      const SO = [];
      function gatherSprites(t) {
        SO.length = 0;
        for (const d of decor) SO.push({ x: d.x, y: d.y, z: 0, h: d.h, tex: d.tex, full: d.full });
        for (const it of items) SO.push({ x: it.x, y: it.y, z: 0.03 + (it.type === 'card' ? Math.sin(t * 3) * 0.04 + 0.1 : 0), h: it.h, tex: it.tex, full: it.type === 'card' });
        for (const e of actors) {
          const S = e.spr; let tex = S.stand, h = e.d.h, z = e.d.z || 0, fade = 0, ws = 1;
          if (e.st === 'die') { const k = Math.min(1, e.t / 0.7); tex = S.pain; h = e.d.h * (1 - k * 0.7); ws = 1 + k * 0.5; z = z * (1 - k); }
          else if (e.st === 'dead') { tex = S.pain; h = e.d.h * 0.3; ws = 1.5; fade = Math.min(0.99, e.fade); z = 0; }
          else if (e.st === 'pain' || e.pain > 0.05) tex = S.pain;
          else if (e.st === 'attack') tex = e.t > 0.2 && e.t < 0.35 ? S.fire : S.aim;
          else if (e.st !== 'idle') tex = ((e.anim * 1.5) | 0) % 2 ? S.walk1 : S.walk2;
          if (e.type === 'drone' && e.st !== 'dead') z += Math.sin(t * 3 + e.x) * 0.04;
          SO.push({ x: e.x, y: e.y, z, h, tex, fade, wscale: ws, flashc: e.pain > 0.1 && e.st !== 'die' ? 0xffffffff : 0 });
        }
        for (const p of projs) SO.push({ x: p.x, y: p.y, z: p.z - 0.1, h: p.kind === 'ion' ? 0.3 : 0.2, tex: PROJSPR[p.kind] || PROJSPR.bolt, full: true });
        for (const f of fx) {
          if (f.t < 0) continue;
          if (f.kind === 'boom' || f.kind === 'acid') SO.push({ x: f.x, y: f.y, z: Math.max(0, f.z - 0.3), h: f.kind === 'acid' ? 0.5 : 0.9, tex: (f.kind === 'acid' ? ACIDSPR : BOOMSPR)[Math.min(4, (f.t / 0.1) | 0)], full: true });
          else SO.push({ x: f.x, y: f.y, z: f.z - 0.06, h: 0.12, tex: BOOMSPR[0], full: true });
        }
        return SO;
      }
      const HC = { bg: hx('#0c1626'), panel: hx('#16243a'), edge: hx('#3a6a9a'), hl: hx('#7ac8ff'), txt: hx('#d0ecff'), dim: hx('#5a7a9a'), gold: hx('#ffcc33'), red: hx('#ff4030'), grn: hx('#40ff80') };
      function drawWeapon() {
        const p = player, bx = Math.sin(p.bob) * 4, by = Math.abs(Math.cos(p.bob)) * 4;
        const s = fpSpr(p.wpn, p.flashT > 0);
        fbBlit(s, (160 - s.w + bx) | 0, (VH - s.h * 2 + 8 + by + (p.flashT > 0 ? -3 : 0)) | 0, 2);
      }
      function drawHud() {
        const p = player, y0 = VH;
        fbRect(0, y0, W, H - y0, HC.bg); fbRect(0, y0, W, 1, HC.hl); fbRect(0, y0 + 1, W, 1, HC.edge);
        const box = (x, w, lbl) => { fbRect(x, y0 + 4, w, 30, HC.panel); fbBox(x, y0 + 4, w, 30, HC.edge); fbText(lbl, x + 3, y0 + 6, HC.dim); };
        box(2, 54, 'FLOOR'); fbText(String(level + 1), 29, y0 + 17, HC.txt, 2, 'center');
        box(58, 66, 'SCORE'); fbText(String(p.score), 120, y0 + 20, HC.txt, 1, 'right');
        box(126, 70, 'HEALTH');
        fbText(Math.ceil(p.hp) + '%', 192, y0 + 6, p.hp < 30 ? HC.red : HC.grn, 1, 'right');
        // heartbeat monitor
        fbRect(129, y0 + 15, 64, 17, hx('#04100a'));
        for (let i = 0; i < 64; i++) { const ph = (p.beat * 1.2 - i / 64 * 1.5); const f = ph - Math.floor(ph); let v = 0; if (f < 0.06) v = Math.sin(f / 0.06 * Math.PI) * 6; else if (f < 0.1) v = -3; const yy = y0 + 24 - Math.round(v * (p.hp > 0 ? 1 : 0)); fbRect(129 + i, yy, 1, 1, p.hp < 30 ? HC.red : HC.grn); }
        box(198, 74, 'WEAPON'); fbText(WEAP[p.wpn].name.split(' ')[0], 235, y0 + 16, HC.txt, 1, 'center');
        fbText(WEAP[p.wpn].cost ? 'CELLS ' + p.cells : 'CELLS ' + p.cells, 235, y0 + 25, WEAP[p.wpn].cost > p.cells ? HC.red : HC.hl, 1, 'center');
        box(274, 44, 'LIVES'); fbText(String(p.lives), 296, y0 + 17, HC.txt, 2, 'center');
        // bottom line: keycards, food, message
        for (let k = 1; k <= 3; k++) { const x = 4 + (k - 1) * 14; fbRect(x, y0 + 37, 12, 8, p.keys[k] ? KEYCOL[k] : hx('#1a2434')); if (p.keys[k]) fbRect(x, y0 + 39, 12, 1, hx('#101010')); }
        fbText('FOOD ' + p.food, 48, y0 + 38, HC.gold);
        const m = msgs[0];
        fbRect(100, y0 + 36, 218, 10, hx('#04080e'));
        if (m) fbText(m.t.length > 36 ? m.t.slice(0, 36) : m.t, 209, y0 + 38, HC.hl, 1, 'center');
        else fbText('INFO: ' + FLOORS[level].name, 209, y0 + 38, HC.dim, 1, 'center');
      }
      function drawMap() {
        const sc = Math.max(2, Math.min(Math.floor(140 / MH), Math.floor(300 / MW)));
        const ox = (W - MW * sc) >> 1, oy = 6 + ((VH - 6 - MH * sc) >> 1);
        fbRect(0, 0, W, VH, hx('#04080e'));
        for (let y = 0; y < VH; y += 8) fbRect(0, y, W, 1, hx('#081424'));
        for (let x = 0; x < W; x += 8) fbRect(x, 0, 1, VH, hx('#081424'));
        for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
          const t = y * MW + x; if (!seen[t]) continue;
          let c;
          if (wallM[t]) c = wallM[t] === T.elev || wallM[t] === T.elevOff ? hx('#ffcc33') : wallM[t] === T.vend ? hx('#ff4040') : hx('#3a7ab8');
          else if (doorM[t]) c = doorM[t].secret ? hx('#3a7ab8') : doorM[t].key ? KEYCOL[doorM[t].key] : hx('#c0e0ff');
          else c = hx('#163a5e');
          fbRect(ox + x * sc, oy + y * sc, sc, sc, c);
        }
        for (const e of actors) if (e.friendly && seen[Math.floor(e.y) * MW + Math.floor(e.x)] && e.st !== 'dead') fbRect(ox + e.x * sc - 1, oy + e.y * sc - 1, 2, 2, hx('#ffffff'));
        const px = ox + player.x * sc, py = oy + player.y * sc;
        if (((api.time * 4) | 0) % 2) fbRect(px - 1, py - 1, 3, 3, hx('#40ff80'));
        for (let i = 1; i < 5; i++) fbRect(px + Math.cos(player.a) * i, py + Math.sin(player.a) * i, 1, 1, hx('#40ff80'));
        fbText('AUTO-MAP  ' + FLOORS[level].name, W / 2, 2, HC.hl, 1, 'center');
      }
      function drawTalk() {
        fbRect(8, 6, 304, 50, hx('#0a1424')); fbBox(8, 6, 304, 50, HC.hl);
        fbRect(12, 10, 26, 40, hx('#16243a')); fbBlit(talk.pic, 9, 6, 1);
        fbText(talk.name, 44, 10, HC.gold);
        const lines = wrapText(talk.text, 43); lines.slice(0, 3).forEach((l, i) => fbText(l, 44, 20 + i * 9, HC.txt));
        fbText(talk.gift, 44, 20 + Math.min(3, lines.length) * 9, HC.grn);
      }
      function title(y) {
        fbText('BLAKE STONE', W / 2 + 2, y + 2, hx('#000000'), 4, 'center'); fbText('BLAKE STONE', W / 2, y, hx('#40c8ff'), 4, 'center');
        fbRect(40, y + 32, 240, 1, hx('#ffcc33'));
        fbText('ALIENS OF GOLD', W / 2 + 1, y + 39, hx('#000000'), 2, 'center'); fbText('ALIENS OF GOLD', W / 2, y + 38, hx('#ffcc33'), 2, 'center');
      }
      function render(ctx) {
        if (!img) { img = ctx.createImageData(W, H); fb = new Uint32Array(img.data.buffer); }
        const t = api.time;
        fb.fill(0xff000000);
        if (mode === 'attract') {
          if (demo) { VH = 200; render3D({ x: demo.x, y: demo.y, a: demo.a + Math.sin(attractT * 0.15) * 2.4, ez: EYE, t }, gatherSprites(t)); VH = 152; }
          fbShade(0, 0, W, H, 0.5);
          const ph = Math.floor(attractT / 9) % 3;
          if (ph === 0) { title(30); fbText('A BUREAU OF COVERT INTELLIGENCE ADVENTURE', W / 2, 100, hx('#c0d8f0'), 1, 'center', hx('#000000')); fbText('\u00a9 1993 JAM PRODUCTIONS / APOGEE', W / 2, 186, hx('#909090'), 1, 'center'); }
          else if (ph === 1) {
            fbText('KNOW YOUR ENEMY', W / 2, 8, hx('#ffcc33'), 1, 'center', hx('#000000'));
            const list = [['tech', 'BIO-TECH'], ['heavy', 'HEAVY'], ['mutant', 'MUTANT'], ['spitter', 'SPITTER'], ['drone', 'DRONE']];
            list.forEach(([k, n], i) => { const s = ESPR[k][((attractT * 2) | 0) % 2 ? 'walk1' : 'aim']; const x = 32 + i * 64; fbBlit(s, x - (s.w >> 1), 74 - s.h, 1); fbText(n, x, 80, hx('#ffffff'), 1, 'center'); fbText(String(ENEMY[k].pts), x, 90, hx('#ffcc33'), 1, 'center'); });
            fbBlit(SCI[((attractT) | 0) % 4].stand, 30, 104, 1);
            fbText('WALK INTO INFORMANTS TO TALK.', 70, 112, hx('#40ff80')); fbText('DON\'T SHOOT THE SCIENTISTS!', 70, 122, hx('#40ff80')); fbText('FOOD UNITS BUY SNACKS AT VENDING MACHINES.', 70, 132, hx('#c0d8f0'));
          } else {
            fbText('HIGH SCORE', W / 2, 40, hx('#ffcc33'), 2, 'center', hx('#000000'));
            fbText(String(hi), W / 2, 64, hx('#ffffff'), 2, 'center', hx('#000000'));
            fbText('ARROWS MOVE  SPACE FIRES  X/1-5 WEAPONS', W / 2, 100, hx('#c0d8f0'), 1, 'center');
            fbText('A/D OR HOLD Z TO STRAFE', W / 2, 112, hx('#c0d8f0'), 1, 'center');
            fbText('ENTER/TAB TOGGLES THE AUTO-MAP', W / 2, 124, hx('#c0d8f0'), 1, 'center');
          }
          const blink = ((t * 2) | 0) % 2;
          if (coinFlash > 0) { if (((t * 8) | 0) % 2) fbText('INSERT COIN', W / 2, 160, hx('#ff4030'), 1, 'center'); }
          else if (api.credits > 0) { if (blink) fbText('PUSH START', W / 2, 160, hx('#ffffff'), 1, 'center', hx('#000000')); }
          else if (blink) fbText('INSERT COIN', W / 2, 160, hx('#ff4030'), 1, 'center');
          fbText('CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, 191, hx('#909090'));
          fbText('HI ' + hi, 316, 191, hx('#909090'), 1, 'right');
        } else if (mode === 'briefing') {
          fbRect(0, 0, W, H, hx('#06101e'));
          for (let y = 0; y < H; y += 3) fbRect(0, y, W, 1, hx('#0a1828'));
          fbText('MISSION BRIEFING', W / 2, 10, hx('#ffcc33'), 2, 'center');
          const lines = ['TO: AGENT STONE, BUREAU OF COVERT INTELLIGENCE', '', 'DR. AURELIUS VANE HAS TURNED THE STAR RIDGE', 'RESEARCH CENTRE INTO A FACTORY FOR GOLD-SKINNED', 'BIO-ENGINEERED MONSTERS.', '', 'INFILTRATE ALL EIGHT FLOORS. FIND THE COLOURED', 'ACCESS CARDS, RIDE THE ELEVATORS UP, AND SHUT', 'DOWN PROJECT COLOSSUS IN HIS PENTHOUSE.', '', 'FRIENDLY SCIENTISTS WILL HELP YOU. PROTECT THEM.'];
          lines.forEach((l, i) => fbText(l, 12, 36 + i * 11, i === 0 ? hx('#7ac8ff') : hx('#d0ecff')));
          if (((t * 2) | 0) % 2) fbText('PRESS SPACE', W / 2, 186, hx('#909090'), 1, 'center');
        } else if (mode === 'intro') {
          fbRect(0, 0, W, H, hx('#140f08'));
          // elevator doors opening
          const op = Math.min(1, modeT / 2.5) * 140;
          fbRect(0, 0, W, H, hx('#06101e'));
          fbText('FLOOR ' + (level + 1), W / 2, 60, hx('#ffcc33'), 3, 'center');
          fbText(FLOORS[level].name, W / 2, 96, hx('#ffffff'), 1, 'center');
          fbText('LIVES ' + player.lives + '   SCORE ' + player.score, W / 2, 112, hx('#7ac8ff'), 1, 'center');
          const dc = hx('#b8a070');
          fbRect(0, 0, 160 - op, H, dc); fbRect(160 + op, 0, 160 - op, H, dc);
          fbRect(159 - op, 0, 2, H, hx('#3a3020')); fbRect(159 + op, 0, 2, H, hx('#3a3020'));
        } else if (mode === 'tally') {
          fbRect(0, 0, W, H, hx('#06101e'));
          fbText('FLOOR ' + (level + 1) + ' COMPLETED', W / 2, 24, hx('#ffcc33'), 2, 'center');
          const row = (l, v, y, k) => { if (modeT > k) { fbText(l, 70, y, hx('#7ac8ff')); fbText(v, 250, y, hx('#ffffff'), 1, 'right'); } };
          row('ENEMIES', tally.kills + '%', 66, 0.3); row('TREASURE', tally.tre + '%', 80, 0.6); row('SECRETS', tally.sec + '%', 94, 0.9);
          row('TIME', Math.floor(tally.time / 60) + ':' + String(Math.floor(tally.time % 60)).padStart(2, '0'), 108, 1.2);
          row('BONUS', String(tally.bonus), 126, 1.5); row('SCORE', String(player.score), 142, 1.8);
          if (modeT > 2 && ((t * 2) | 0) % 2) fbText('PRESS SPACE', W / 2, 176, hx('#909090'), 1, 'center');
        } else if (mode === 'victory') {
          fbRect(0, 0, W, H, hx('#06101e'));
          title(14);
          ['PROJECT COLOSSUS LIES IN A HEAP OF GOLD PLATE.', 'DR. VANE FLEES IN HIS PRIVATE SHUTTLE,', 'BUT THE STAR RIDGE LABS ARE SHUT DOWN', 'AND THE SCIENTISTS ARE FREE.', '', 'WELL DONE, AGENT STONE.'].forEach((l, i) => fbText(l, W / 2, 80 + i * 11, hx('#d0ecff'), 1, 'center'));
          fbText('FINAL SCORE ' + player.score, W / 2, 160, hx('#ffcc33'), 1, 'center');
        } else if (mode === 'over') {
          fbRect(0, 0, W, H, hx('#06080e'));
          fbText('GAME OVER', W / 2, 70, hx('#ff4030'), 3, 'center', hx('#000000'));
          fbText('SCORE ' + (player ? player.score : 0), W / 2, 110, hx('#ffffff'), 1, 'center');
          fbText('HIGH SCORE ' + hi, W / 2, 124, hx('#ffcc33'), 1, 'center');
        } else {
          const p = player;
          let ez = EYE + Math.sin(p.bob * 2) * 0.012;
          if (mode === 'dying') ez = Math.max(0.1, ez - deathT * 0.3);
          if (showMap && mode === 'play') drawMap();
          else {
            render3D({ x: p.x, y: p.y, a: p.a + (mode === 'dying' ? deathT * 0.25 : 0), ez, hz: shake ? (Math.random() - 0.5) * shake : 0, t, flash: 0 }, gatherSprites(t));
            if (mode === 'play') drawWeapon();
            if (hurtFlash > 0) fbTint(0, 0, W, VH, hx('#ff0000'), Math.min(0.55, hurtFlash * 0.6));
            if (pickFlash > 0) fbTint(0, 0, W, VH, hx('#80c0ff'), pickFlash * 0.5);
            if (mode === 'dying') fbTint(0, 0, W, VH, hx('#600000'), Math.min(0.7, deathT * 0.4));
            if (mode === 'play') { fbRect(159, VH / 2 - 3, 1, 2, hx('#40ff80')); fbRect(159, VH / 2 + 2, 1, 2, hx('#40ff80')); fbRect(155, VH / 2, 3, 1, hx('#40ff80')); fbRect(161, VH / 2, 3, 1, hx('#40ff80')); }
            if (talk) drawTalk();
            if (lv.boss && lv.boss.st !== 'dead' && lv.boss.st !== 'die' && lv.boss.st !== 'idle') { fbRect(80, 4, 160, 5, hx('#300000')); fbRect(80, 4, Math.round(160 * Math.max(0, lv.boss.hp) / lv.boss.d.hp), 5, hx('#ffcc33')); fbText('PROJECT COLOSSUS', W / 2, 12, hx('#ffcc33'), 1, 'center', hx('#000000')); }
          }
          drawHud();
          if (mode === 'dying' && deathT > 1) fbText(p.lives > 1 ? 'AGENT DOWN' : 'LAST LIFE LOST', W / 2, 64, hx('#ffffff'), 2, 'center', hx('#000000'));
        }
        ctx.putImageData(img, 0, 0);
      }
      
      return { update, render, destroy() { } };
    }
  });
})();
