// Hexen: Beyond Heretic (Raven Software, 1995) -- an original dark-fantasy hub-based shooter in the spirit of the PC classic.
// Three classes with their own weapons and mana, hubs of linked maps with switches, puzzle items and sliding polyobject doors.
(function () {
  'use strict';
  // ======================================================================
  //  Shared first-person engine: height-field raycaster (per-cell floor and
  //  ceiling heights, sector lighting, y-shearing look), procedural textures
  //  and sprites, map generator with locked zones, physics and monster AI.
  // ======================================================================
  const W = 320, H = 200, VH = 160, BAR = H - VH;
  const TAU = Math.PI * 2;
  const FOVK = 0.66, PROJ = (W / 2) / FOVK;
  const SKY = 255;
  const PHEIGHT = 0.9, MAXSTEP = 0.4, PRAD = 0.22;
  const SP_DOOR = 1, SP_POLY = 2, SP_EXIT = 4, SP_PORTAL = 5, SP_SWITCH = 6;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgb(r, g, b) { return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; }
  function hexc(s) { const n = parseInt(s.slice(1), 16); return rgb(n >> 16 & 255, n >> 8 & 255, n & 255); }
  function shadeC(c, s) {
    return (0xff000000 | ((((c >>> 16) & 255) * s >> 8) << 16) | ((((c >>> 8) & 255) * s >> 8) << 8) | ((c & 255) * s >> 8)) >>> 0;
  }
  function mixC(a, b, t) {
    const it = 1 - t;
    return rgb(((a & 255) * it + (b & 255) * t) | 0, (((a >>> 8) & 255) * it + ((b >>> 8) & 255) * t) | 0, (((a >>> 16) & 255) * it + ((b >>> 16) & 255) * t) | 0);
  }
  function RNG(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    r.int = n => Math.floor(r() * n);
    r.range = (a, b) => a + r() * (b - a);
    r.pick = a => a[Math.floor(r() * a.length)];
    return r;
  }
  function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

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
    '%': [24, 25, 2, 4, 8, 19, 3], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14]
  };

  // ---------- frame buffer ----------
  function Screen() {
    const buf = new Uint32Array(W * H);
    let img = null, img32 = null;
    const S = {
      buf,
      clear(c) { buf.fill(c); },
      rect(x, y, w, h, c) {
        x = x | 0; y = y | 0; w = w | 0; h = h | 0;
        const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
        if (x1 <= x0) return;
        for (let j = y0; j < y1; j++) buf.fill(c, j * W + x0, j * W + x1);
      },
      blend(x, y, w, h, c, a) {
        x = x | 0; y = y | 0;
        const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
        for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) buf[j * W + i] = mixC(buf[j * W + i], c, a);
      },
      frame(x, y, w, h, light, dark) {
        S.rect(x, y, w, 1, light); S.rect(x, y, 1, h, light); S.rect(x, y + h - 1, w, 1, dark); S.rect(x + w - 1, y, 1, h, dark);
      },
      text(s, x, y, c, sc, align, shadow) {
        sc = sc || 1; s = String(s).toUpperCase();
        const w = s.length * 6 * sc - sc;
        if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
        if (shadow) S.text(s, x + sc, y + sc, shadow, sc);
        for (let i = 0; i < s.length; i++) {
          const g = FONT[s[i]]; if (!g) continue;
          for (let r = 0; r < 7; r++) {
            const bits = g[r]; if (!bits) continue;
            for (let k = 0; k < 5; k++) if (bits & (16 >> k)) S.rect(x + (i * 6 + k) * sc, y + r * sc, sc, sc, c);
          }
        }
        return w;
      },
      blit(sp, x, y, sc, s, flip) {
        sc = sc || 1; x = x | 0; y = y | 0;
        const px = sp.px, sw = sp.w;
        const hh = Math.floor(sp.h * sc), ww = Math.floor(sw * sc);
        for (let j = 0; j < hh; j++) {
          const yy = y + j; if (yy < 0 || yy >= H) continue;
          const row = ((j / sc) | 0) * sw;
          for (let i = 0; i < ww; i++) {
            const xx = x + i; if (xx < 0 || xx >= W) continue;
            const tx = (i / sc) | 0;
            const c = px[row + (flip ? sw - 1 - tx : tx)];
            if (c) buf[yy * W + xx] = s == null ? c : shadeC(c, s);
          }
        }
      },
      present(ctx) {
        if (!img) {
          img = ctx.createImageData(W, H);
          img32 = (img && img.data && img.data.length === W * H * 4) ? new Uint32Array(img.data.buffer) : null;
        }
        if (img32) img32.set(buf);
        ctx.putImageData(img, 0, 0);
      }
    };
    return S;
  }

  // ---------- procedural noise & textures ----------
  function hash2(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const PERM = new Uint8Array(512), RV = new Float32Array(256);
  (function () { const r = RNG(12345); for (let i = 0; i < 256; i++) { PERM[i] = i; RV[i] = r(); } for (let i = 255; i > 0; i--) { const j = r.int(i + 1), t = PERM[i]; PERM[i] = PERM[j]; PERM[j] = t; } for (let i = 0; i < 256; i++) PERM[i + 256] = PERM[i]; })();
  function lat(x, y, s) { return RV[PERM[PERM[PERM[(x + s * 13) & 255] + (y & 255)] + (s & 255)]]; }
  function vnoise(x, y, s, p) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    let x0 = xi % p; if (x0 < 0) x0 += p; let y0 = yi % p; if (y0 < 0) y0 += p;
    const x1 = x0 + 1 === p ? 0 : x0 + 1, y1 = y0 + 1 === p ? 0 : y0 + 1;
    const a = lat(x0, y0, s), b = lat(x1, y0, s), c = lat(x0, y1, s), d = lat(x1, y1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, p, oct) {
    let t = 0, amp = 0.5, f = 1, nm = 0;
    for (let i = 0; i < (oct || 4); i++) { t += vnoise(x * f, y * f, s + i * 17, p * f) * amp; nm += amp; amp *= 0.5; f *= 2; }
    return t / nm;
  }
  function TX(f, w, h) {
    w = w || 64; h = h || 64;
    const px = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = f(x, y);
      px[y * w + x] = rgb(clamp(c[0] | 0, 0, 255), clamp(c[1] | 0, 0, 255), clamp(c[2] | 0, 0, 255));
    }
    return px;
  }
  const sc3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const TG = {
    bricks(base, mortar, bw, bh, seed, rough) {
      rough = rough == null ? 0.5 : rough;
      return TX((x, y) => {
        const row = (y / bh) | 0, off = (row & 1) ? bw >> 1 : 0;
        const xx = (x + off) & 63, bx = xx % bw, by = y % bh, id = (xx / bw) | 0;
        const n = fbm(x / 8, y / 8, seed, 8, 3);
        if (bx === 0 || by === 0) return sc3(mortar, 0.7 + n * 0.5);
        let k = (0.8 + hash2(id, row, seed) * 0.35) * (1 - rough * 0.5 + n * rough);
        if (by === 1 || bx === 1) k *= 1.2;
        if (by === bh - 1 || bx === bw - 1) k *= 0.7;
        return sc3(base, k);
      });
    },
    blocks(base, seed) {
      return TX((x, y) => {
        const n = fbm(x / 16, y / 16, seed, 4, 4), n2 = fbm(x / 4, y / 4, seed + 5, 16, 2);
        const row = (y / 21) | 0, off = [0, 13, 29][row % 3], xx = (x + off) & 63;
        const bx = xx % 32, by = y % 21;
        if (bx < 1 || by < 1 || (y >= 63)) return sc3(base, 0.35);
        let k = 0.72 + hash2((xx / 32) | 0, row, seed) * 0.3 + (n - 0.5) * 0.5 + (n2 - 0.5) * 0.2;
        if (by < 2 || bx < 2) k += 0.15; if (by > 19 || bx > 30) k -= 0.2;
        return sc3(base, k);
      });
    },
    flags(base, seam, seed) {
      const pts = [];
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) pts.push([i * 16 + 3 + hash2(i, j, seed) * 10, j * 16 + 3 + hash2(i, j, seed + 1) * 10]);
      return TX((x, y) => {
        let d1 = 1e9, d2 = 1e9, id = 0;
        const ci = (x / 16) | 0, cj = (y / 16) | 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const i = (ci + di + 4) & 3, j = (cj + dj + 4) & 3;
          const p = pts[j * 4 + i], px = p[0] + (ci + di - i) * 16 - ((ci + di) < 0 ? 0 : 0), py = p[1] + (cj + dj - j) * 16;
          const ax = (ci + di) * 16 + (p[0] - i * 16), ay = (cj + dj) * 16 + (p[1] - j * 16);
          const d = Math.hypot(x - ax, y - ay);
          if (d < d1) { d2 = d1; d1 = d; id = j * 4 + i; } else if (d < d2) d2 = d;
          void px; void py;
        }
        const n = fbm(x / 8, y / 8, seed, 8, 3);
        if (d2 - d1 < 1.6) return sc3(seam, 0.6 + n * 0.4);
        const k = 0.75 + hash2(id, 3, seed) * 0.3 + (n - 0.5) * 0.4 + (d2 - d1 < 3 ? -0.12 : 0);
        return sc3(base, k);
      });
    },
    planks(base, seed, vertical) {
      return TX((x, y) => {
        const a = vertical ? x : y, b = vertical ? y : x;
        const pw = 16, pi = (a / pw) | 0, pa = a % pw;
        const g = fbm(b / 16 + pi * 3, a / 2, seed, 4, 3);
        if (pa === 0) return sc3(base, 0.3);
        let k = 0.7 + hash2(pi, 1, seed) * 0.25 + (g - 0.5) * 0.6 + Math.sin(b * 0.4 + g * 6) * 0.06;
        if (pa === 1) k += 0.15; if (pa === pw - 1) k -= 0.2;
        if (((b + pi * 23) & 63) === 5 && pa > 4 && pa < 12) k -= 0.3;
        return sc3(base, k);
      });
    },
    metal(base, seed) {
      return TX((x, y) => {
        const bx = x % 32, by = y % 32, n = fbm(x / 8, y / 8, seed, 8, 3);
        let k = 0.75 + (n - 0.5) * 0.3 - by * 0.004;
        if (bx < 1 || by < 1) k = 0.35; else if (bx > 30 || by > 30) k = 0.5; else if (bx < 2 || by < 2) k = 1.1;
        const rx = bx - 4, ry = by - 4, rx2 = bx - 28, ry2 = by - 28;
        if (rx * rx + ry * ry < 3 || rx2 * rx2 + ry * ry < 3 || rx * rx + ry2 * ry2 < 3 || rx2 * rx2 + ry2 * ry2 < 3) k = 1.25;
        return sc3(base, k);
      });
    },
    marble(base, vein, seed) {
      return TX((x, y) => {
        const n = fbm(x / 16, y / 16, seed, 4, 5);
        const v = Math.abs(Math.sin((x + y) * 0.09817 + n * 9));
        const bx = x % 32, by = y % 32;
        let c = mix3(vein, base, Math.min(1, v * 1.6));
        if (bx === 0 || by === 0) c = sc3(c, 0.6);
        return sc3(c, 0.85 + n * 0.3);
      });
    },
    rock(base, seed) {
      return TX((x, y) => {
        const n = fbm(x / 16, y / 16, seed, 4, 5), r = fbm(x / 8, y / 8, seed + 9, 8, 2);
        const cr = Math.abs(n - 0.5) < 0.02 ? 0.5 : 1;
        return sc3(base, (0.55 + n * 0.7) * cr * (0.9 + r * 0.2));
      });
    },
    ground(a, b, seed) {
      return TX((x, y) => {
        const n = fbm(x / 16, y / 16, seed, 4, 4), d = hash2(x, y, seed);
        return sc3(mix3(a, b, clamp((n - 0.35) * 2.5, 0, 1)), 0.8 + d * 0.3);
      });
    },
    tiles(a, b, seed) {
      return TX((x, y) => {
        const tx = (x / 16) | 0, ty = (y / 16) | 0, bx = x % 16, by = y % 16;
        const n = fbm(x / 8, y / 8, seed, 8, 2);
        let c = ((tx + ty) & 1) ? a : b;
        let k = 0.85 + n * 0.25;
        if (bx === 0 || by === 0) k = 0.4; else if (bx === 1 || by === 1) k *= 1.2; else if (bx === 15 || by === 15) k *= 0.7;
        return sc3(c, k);
      });
    },
    liquid(a, b, seed) {
      return TX((x, y) => {
        const n = fbm(x / 16, y / 16, seed, 4, 4), m = fbm(x / 8 + 3, y / 8, seed + 3, 8, 2);
        const t = clamp(Math.abs(Math.sin(n * 12 + m * 3)), 0, 1);
        return mix3(a, b, t * t);
      });
    },
    door(wood, iron, gem, seed) {
      const pl = TG.planks(wood, seed, true);
      return TX((x, y) => {
        const c = pl[y * 64 + x];
        let col = [c & 255, (c >> 8) & 255, (c >> 16) & 255];
        if ((y > 8 && y < 13) || (y > 50 && y < 55) || x < 3 || x > 60 || y < 3) col = sc3(iron, 0.8 + hash2(x, y, seed) * 0.3);
        if ((y === 10 || y === 52) && (x % 8) === 4) col = sc3(iron, 1.4);
        if (gem) {
          const dx = x - 32, dy = y - 31, d = Math.abs(dx) + Math.abs(dy);
          if (d < 11) col = sc3(iron, 0.9); if (d < 8) col = sc3(gem, 1.25 - d * 0.07 - (dx + dy) * 0.02);
          if (d < 3 && dx < 0) col = [255, 255, 255];
        }
        return col;
      });
    },
    panel(base, glow, seed, on) {
      const bg = TG.blocks(base, seed);
      return TX((x, y) => {
        const c = bg[y * 64 + x];
        let col = [c & 255, (c >> 8) & 255, (c >> 16) & 255];
        if (x > 18 && x < 46 && y > 14 && y < 50) {
          col = sc3(base, 0.35);
          if (x === 19 || y === 15) col = sc3(base, 0.9);
          const ly = on ? 40 : 22;
          if (x > 29 && x < 35 && Math.abs(y - (on ? 34 : 28)) < 8) col = [120, 110, 100];
          if (Math.hypot(x - 32, y - ly) < 4.5) col = on ? glow : sc3(glow, 0.35);
        }
        return col;
      });
    },
    glyph(base, glow, seed) {
      return TX((x, y) => {
        const dx = x - 31.5, dy = y - 31.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const n = fbm(x / 8, y / 8, seed, 8, 3);
        let c = sc3(base, 0.6 + n * 0.5);
        if (Math.abs(r - 26) < 2 || Math.abs(r - 18) < 1.2) c = glow;
        if (r < 18 && Math.abs(Math.sin(a * 3 + r * 0.25)) < 0.18) c = mix3(glow, [255, 255, 255], 0.3);
        if (r < 5) c = [255, 255, 230];
        return c;
      });
    }
  };
  function makeSky(top, mid, hill, seed, stars) {
    const w = 256, h = 128;
    return TX((x, y) => {
      const t = y / h;
      let c = mix3(top, mid, clamp(t * 1.6, 0, 1));
      const cl = fbm(x / 32, y / 12, seed, 8, 4);
      if (cl > 0.55) c = mix3(c, sc3(mid, 1.3), (cl - 0.55) * 2.2);
      if (stars && hash2(x, y, seed) > 0.996 && t < 0.5) c = [230, 230, 255];
      const hh = 88 + fbm(x / 32, 0.5, seed + 4, 8, 4) * 30 - 6;
      if (y > hh) c = sc3(hill, 0.6 + fbm(x / 8, y / 8, seed, 32, 2) * 0.3);
      const hh2 = 100 + fbm(x / 16, 0.5, seed + 8, 16, 3) * 18;
      if (y > hh2) c = sc3(hill, 0.3);
      return c;
    }, w, h);
  }

  // ---------- sprite painter ----------
  function Spr(w, h) { return { w, h, px: new Uint32Array(w * h) }; }
  const PT = {
    dot(s, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < s.w && y < s.h) s.px[y * s.w + x] = c; },
    rect(s, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) PT.dot(s, x + i, y + j, c); },
    ell(s, cx, cy, rx, ry, col, flat) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, q = nx * nx + ny * ny;
        if (q > 1) continue;
        let k = 1;
        if (!flat) { const nz = Math.sqrt(1 - q); k = 0.35 + 0.85 * Math.max(0, -0.45 * nx - 0.55 * ny + 0.7 * nz); }
        PT.dot(s, x, y, rgb(clamp(col[0] * k | 0, 0, 255), clamp(col[1] * k | 0, 0, 255), clamp(col[2] * k | 0, 0, 255)));
      }
    },
    line(s, x0, y0, x1, y1, col, th, shade) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      th = th || 1;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        if (th <= 1) PT.dot(s, x, y, rgb(col[0], col[1], col[2]));
        else if (shade) PT.ell(s, x, y, th / 2, th / 2, col);
        else PT.ell(s, x, y, th / 2, th / 2, col, true);
      }
    },
    tri(s, x0, y0, x1, y1, x2, y2, col) {
      const minx = Math.floor(Math.min(x0, x1, x2)), maxx = Math.ceil(Math.max(x0, x1, x2));
      const miny = Math.floor(Math.min(y0, y1, y2)), maxy = Math.ceil(Math.max(y0, y1, y2));
      const ar = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (Math.abs(ar) < 1e-6) return;
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / ar;
        const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / ar;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
          const k = 0.75 + 0.35 * w0;
          PT.dot(s, x, y, rgb(clamp(col[0] * k | 0, 0, 255), clamp(col[1] * k | 0, 0, 255), clamp(col[2] * k | 0, 0, 255)));
        }
      }
    },
    outline(s, col) {
      const c = rgb(col[0], col[1], col[2]), src = s.px.slice();
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        if (src[y * s.w + x]) continue;
        if ((x > 0 && src[y * s.w + x - 1]) || (x < s.w - 1 && src[y * s.w + x + 1]) || (y > 0 && src[(y - 1) * s.w + x]) || (y < s.h - 1 && src[(y + 1) * s.w + x])) s.px[y * s.w + x] = c;
      }
      return s;
    },
    tint(s, col, t) {
      const o = Spr(s.w, s.h), c = rgb(col[0], col[1], col[2]);
      for (let i = 0; i < s.px.length; i++) if (s.px[i]) o.px[i] = mixC(s.px[i], c, t);
      return o;
    },
    flipX(s) {
      const o = Spr(s.w, s.h);
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) o.px[y * s.w + x] = s.px[y * s.w + s.w - 1 - x];
      return o;
    }
  };
  // round glowing ball (projectiles, effects)
  function ballSpr(sz, core, edge) {
    const s = Spr(sz, sz), r = sz / 2;
    for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      if (d > 1) continue;
      const t = d * d;
      s.px[y * sz + x] = rgb(...mix3(core, edge, t).map(v => clamp(v | 0, 0, 255)));
    }
    return s;
  }
  function burstSpr(sz, core, edge, seed) {
    const s = Spr(sz, sz), r = sz / 2;
    for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
      const dx = x + 0.5 - r, dy = y + 0.5 - r, a = Math.atan2(dy, dx);
      const lim = 0.6 + 0.4 * vnoise(a * 2 + 10, 0.5, seed, 13);
      const d = Math.hypot(dx, dy) / r / lim;
      if (d > 1) continue;
      s.px[y * sz + x] = rgb(...mix3(core, edge, d).map(v => clamp(v | 0, 0, 255)));
    }
    return s;
  }

  // ---------- map ----------
  function newMap(w, h) {
    const n = w * h;
    return {
      w, h, n, solid: new Uint8Array(n).fill(1), wtex: new Uint8Array(n), ftex: new Uint8Array(n), ctex: new Uint8Array(n),
      fh: new Float32Array(n), ch: new Float32Array(n).fill(99), light: new Float32Array(n).fill(0.6), lfx: new Uint8Array(n),
      lnow: new Float32Array(n), special: new Uint8Array(n), tag: new Int16Array(n).fill(-1), hazard: new Uint8Array(n),
      secret: new Uint8Array(n), ppos: new Float32Array(n), paxis: new Uint8Array(n), seen: new Uint8Array(n),
      doors: [], switches: [], portals: [], things: [], rooms: [], start: { x: 1.5, y: 1.5, ang: 0 }, secretsTotal: 0
    };
  }
  function cellIdx(M, x, y) {
    if (x < 0 || y < 0) return -1;
    const ix = x | 0, iy = y | 0;
    if (ix >= M.w || iy >= M.h) return -1;
    return iy * M.w + ix;
  }
  function cellBlocks(M, i, z, h, step) {
    if (i < 0 || M.solid[i]) return true;
    if (M.special[i] === SP_POLY && M.ppos[i] < 0.92) return true;
    const f = M.fh[i];
    if (f > z + step) return true;
    if (M.ch[i] - Math.max(f, z) < h) return true;
    return false;
  }
  // returns -1 if free, else index of a blocking cell (or -2 out of map)
  function areaBlocked(M, x, y, r, z, h, step) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (cx < 0 || cy < 0 || cx >= M.w || cy >= M.h) return -2;
      const i = cy * M.w + cx;
      if (cellBlocks(M, i, z, h, step)) return i;
    }
    return -1;
  }
  function floorAt(M, x, y, r) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    let f = -99;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const i = cellIdx(M, cx, cy); if (i < 0 || M.solid[i]) continue;
      if (M.fh[i] > f) f = M.fh[i];
    }
    return f;
  }
  function ceilAt(M, x, y, r) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    let c = 99;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const i = cellIdx(M, cx, cy); if (i < 0 || M.solid[i]) continue;
      if (M.ch[i] < c) c = M.ch[i];
    }
    return c;
  }
  function moveEnt(M, e, dx, dy, h, step) {
    let hit = -1;
    if (dx) { const b = areaBlocked(M, e.x + dx, e.y, e.r, e.z, h, step); if (b === -1) e.x += dx; else hit = b; }
    if (dy) { const b = areaBlocked(M, e.x, e.y + dy, e.r, e.z, h, step); if (b === -1) e.y += dy; else if (hit === -1) hit = b; }
    return hit;
  }
  function los(M, x0, y0, z0, x1, y1, z1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 0.2));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t;
      const c = cellIdx(M, x, y);
      if (c < 0 || M.solid[c]) return false;
      if (M.special[c] === SP_POLY && M.ppos[c] < 0.9) return false;
      if (z < M.fh[c] || z > M.ch[c]) return false;
    }
    return true;
  }
  // BFS distance field toward (sx,sy) for monster navigation
  function flowField(M, sx, sy, fly, out, q) {
    out.fill(-1);
    const s = cellIdx(M, sx, sy); if (s < 0) return;
    let qh = 0, qt = 0; q[qt++] = s; out[s] = 0;
    const w = M.w;
    while (qh < qt) {
      const a = q[qh++], ax = a % w, ay = (a / w) | 0, da = out[a];
      for (let k = 0; k < 4; k++) {
        const bx = ax + (k === 0 ? 1 : k === 1 ? -1 : 0), by = ay + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (bx < 0 || by < 0 || bx >= w || by >= M.h) continue;
        const b = by * w + bx;
        if (out[b] >= 0 || M.solid[b]) continue;
        if (M.special[b] === SP_DOOR || M.special[b] === SP_POLY) { const d = M.doors[M.tag[b]]; if (d && (d.req || d.secret) && d.pos < 0.9) continue; }
        else {
          if (!fly && M.fh[a] - M.fh[b] > 0.45) continue;
          if (!fly && M.fh[b] - M.fh[a] > 1.6) continue;
          if (M.ch[b] - M.fh[b] < 0.7) continue;
        }
        out[b] = da + 1; q[qt++] = b;
      }
    }
  }
  function doorAt(M, i) { return (M.special[i] === SP_DOOR || M.special[i] === SP_POLY) ? M.doors[M.tag[i]] : null; }
  function updateDoors(M, dt, occupied, onSound) {
    for (const d of M.doors) {
      if (d.state === 1) { d.pos += d.spd * dt; if (d.pos >= 1) { d.pos = 1; d.state = 2; d.wait = 4; } }
      else if (d.state === 2) {
        if (!d.stay) { d.wait -= dt; if (d.wait <= 0) { if (d.cells.some(occupied)) d.wait = 1; else { d.state = 3; onSound && onSound(d, 'close'); } } }
      } else if (d.state === 3) {
        if (d.cells.some(occupied)) { d.state = 1; }
        else { d.pos -= d.spd * dt; if (d.pos <= 0) { d.pos = 0; d.state = 0; } }
      }
      for (const c of d.cells) {
        if (d.kind === 'poly') M.ppos[c] = d.pos;
        else M.ch[c] = M.fh[c] + Math.max(0, d.pos) * (d.top - M.fh[c]);
      }
    }
  }
  function openDoor(d) { if (d.state === 0 || d.state === 3) { d.state = 1; return true; } if (d.state === 2) d.wait = 4; return false; }
  function updateLights(M, t, boost) {
    const n = M.n, L = M.light, fx = M.lfx, out = M.lnow;
    const fl = (Math.floor(t * 9) * 7919) | 0;
    for (let i = 0; i < n; i++) {
      let l = L[i];
      const f = fx[i];
      if (f === 1) l *= ((((i * 2654435761) ^ fl) >>> 0) % 97) < 24 ? 0.55 : 1;
      else if (f === 2) l *= 0.75 + 0.25 * Math.sin(t * 3 + (i % 7));
      else if (f === 3) l *= (Math.floor(t * 2.5) & 1) ? 1 : 0.5;
      out[i] = Math.min(1.2, l + boost);
    }
  }

  // ---------- renderer ----------
  function Renderer(scr, TEX, SKYP) {
    const buf = scr.buf, zb = new Float32Array(W * VH);
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    function shadeOf(L, d) {
      const v = L * 1.12 * (1 - d / (6 + L * 18));
      return v <= 0.05 ? 13 : v >= 1 ? 256 : (v * 256) | 0;
    }
    let hor, eye, cx, cy, rdx, rdy, x, top, bot, M, time, skyU;
    function flats(cur, d) {
      const cf = M.fh[cur], cc = M.ch[cur];
      if (eye > cf) {
        const yf = hor + (eye - cf) * PROJ / d;
        const y0 = Math.max(top, Math.ceil(yf - 0.5));
        if (y0 < bot) {
          const T = TEX[M.ftex[cur]], tp = T.px, k = (eye - cf) * PROJ, L = M.lnow[cur];
          const ao = T.anim ? time * T.anim : 0, br = T.bright;
          for (let y = y0, o = y0 * W + x; y < bot; y++, o += W) {
            const rd = k / (y + 0.5 - hor);
            const wx = cx + rdx * rd + ao, wy = cy + rdy * rd + ao * 0.5;
            const c = tp[(((wy * 64) | 0) & 63) * 64 + (((wx * 64) | 0) & 63)];
            buf[o] = br ? c : shadeC(c, shadeOf(L, rd)); zb[o] = rd;
          }
          bot = y0;
        }
      }
      if (M.ctex[cur] === SKY) {
        const yc = hor - (cc - eye) * PROJ / d;
        const y1 = Math.min(bot, Math.ceil(yc - 0.5));
        if (y1 > top) { sky(top, y1); top = y1; }
      } else if (cc > eye) {
        const yc = hor - (cc - eye) * PROJ / d;
        const y1 = Math.min(bot, Math.ceil(yc - 0.5));
        if (y1 > top) {
          const T = TEX[M.ctex[cur]], tp = T.px, k = (cc - eye) * PROJ, L = M.lnow[cur], br = T.bright;
          for (let y = top, o = top * W + x; y < y1; y++, o += W) {
            const rd = k / (hor - y - 0.5);
            const wx = cx + rdx * rd, wy = cy + rdy * rd;
            const c = tp[(((wy * 64) | 0) & 63) * 64 + (((wx * 64) | 0) & 63)];
            buf[o] = br ? c : shadeC(c, shadeOf(L, rd)); zb[o] = rd;
          }
          top = y1;
        }
      }
    }
    function sky(y0, y1) {
      for (let y = y0, o = y0 * W + x; y < y1; y++, o += W) {
        const v = clamp((y - hor + 70) | 0, 0, 127);
        buf[o] = SKYP[v * 256 + skyU]; zb[o] = 1e9;
      }
    }
    function span(y0, y1, d, T, tx, L, anchor, sideK) {
      if (y1 <= y0) return;
      const s = T.bright ? 256 : (shadeOf(L, d) * sideK) | 0, tp = T.px;
      const zs = d / PROJ; let z = eye - (y0 + 0.5 - hor) * zs;
      for (let y = y0, o = y0 * W + x; y < y1; y++, o += W) {
        const ty = (((anchor - z) * 64) | 0) & 63;
        const c = tp[ty * 64 + tx];
        buf[o] = s >= 256 ? c : shadeC(c, s); zb[o] = d; z -= zs;
      }
    }
    function draw(map, cam, sprites, t) {
      M = map; time = t; hor = (VH >> 1) + cam.pitch; eye = cam.z; cx = cam.x; cy = cam.y;
      const dirX = Math.cos(cam.ang), dirY = Math.sin(cam.ang), plX = -dirY * FOVK, plY = dirX * FOVK;
      const MW = M.w, MH = M.h;
      for (x = 0; x < W; x++) {
        const camX = 2 * (x + 0.5) / W - 1;
        rdx = dirX + plX * camX; rdy = dirY + plY * camX;
        let mx = cx | 0, my = cy | 0;
        const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
        let stx, sty, sdx, sdy;
        if (rdx < 0) { stx = -1; sdx = (cx - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - cx) * ddx; }
        if (rdy < 0) { sty = -1; sdy = (cy - my) * ddy; } else { sty = 1; sdy = (my + 1 - cy) * ddy; }
        top = 0; bot = VH;
        let cur = my * MW + mx, d0 = 0.0001;
        let a = (cam.ang + Math.atan(camX * FOVK)) / TAU * 1024; a = ((a % 256) + 256) % 256; skyU = a | 0;
        let it = 0;
        for (; it < 100; it++) {
          let d, side;
          if (sdx < sdy) { d = sdx; sdx += ddx; mx += stx; side = 0; } else { d = sdy; sdy += ddy; my += sty; side = 1; }
          if (M.special[cur] === SP_POLY) {
            const px0 = cur % MW, py0 = (cur / MW) | 0;
            let tt, s;
            if (M.paxis[cur] === 0) { tt = (px0 + 0.5 - cx) / rdx; s = cy + rdy * tt - py0; }
            else { tt = (py0 + 0.5 - cy) / rdy; s = cx + rdx * tt - px0; }
            if (tt >= d0 - 1e-4 && tt <= d) {
              const half = M.ppos[cur] * 0.5;
              let u = -1;
              if (s < 0.5 - half) u = s + half; else if (s >= 0.5 + half) u = s - half;
              if (u >= 0 && u < 1) {
                flats(cur, tt);
                if (top < bot) span(top, bot, tt, TEX[M.wtex[cur]], (u * 64) & 63, M.lnow[cur], M.fh[cur] + 1, 0.95);
                top = bot; break;
              }
            }
          }
          flats(cur, d);
          if (top >= bot) break;
          if (mx < 0 || my < 0 || mx >= MW || my >= MH) break;
          const nx = my * MW + mx;
          M.seen[cur] = 1; M.seen[nx] = 1;
          let u = side === 0 ? cy + d * rdy : cx + d * rdx; u -= Math.floor(u);
          if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) u = 1 - u;
          const tx = (u * 64) & 63, sk = side ? 0.82 : 1, L = M.lnow[cur];
          if (M.solid[nx]) {
            const wt = M.ch[nx];
            let ys = top;
            if (wt < 50) {
              const yy = hor - (wt - eye) * PROJ / d;
              ys = clamp(Math.ceil(yy - 0.5), top, bot);
              if (ys > top) sky(top, ys);
            }
            span(ys, bot, d, TEX[M.wtex[nx]], tx, L, 0, sk);
            top = bot; break;
          }
          const nf = M.fh[nx], nc = M.ch[nx], cf = M.fh[cur], cc = M.ch[cur];
          if (nf > cf) {
            const yy = hor + (eye - nf) * PROJ / d;
            const y0 = Math.max(top, Math.ceil(yy - 0.5));
            if (y0 < bot) { span(y0, bot, d, TEX[M.wtex[nx]], tx, L, nf, sk); bot = y0; }
          }
          if (nc < cc && !(M.ctex[cur] === SKY && M.ctex[nx] === SKY)) {
            const yy = hor - (nc - eye) * PROJ / d;
            const y1 = Math.min(bot, Math.ceil(yy - 0.5));
            if (y1 > top) { span(top, y1, d, TEX[M.wtex[nx]], tx, L, nc + 1, sk); top = y1; }
          }
          if (top >= bot) break;
          cur = nx; d0 = d;
        }
        for (let y = top, o = top * W + x; y < bot; y++, o += W) { buf[o] = 0xff000000; zb[o] = 1e9; }
      }
      // sprites
      const inv = 1 / (plX * dirY - dirX * plY);
      const vis = [];
      for (const s of sprites) {
        const dx = s.x - cx, dy = s.y - cy;
        const ty = inv * (-plY * dx + plX * dy);
        if (ty < 0.12 || ty > 40) continue;
        s._tx = inv * (dirY * dx - dirX * dy); s._ty = ty; vis.push(s);
      }
      vis.sort((a, b) => b._ty - a._ty);
      for (const s of vis) drawSprite(s);
    }
    function drawSprite(s) {
      const ty = s._ty, scale = PROJ / ty;
      const scx = (W / 2) * (1 + s._tx / ty);
      const sw = s.w * scale, sh = s.h * scale;
      if (sw < 0.5) return;
      const x0 = scx - sw / 2, yTop = hor - (s.z + s.h - eye) * scale;
      const sp = s.spr, px = sp.px;
      const xa = Math.max(0, Math.floor(x0)), xb = Math.min(W, Math.ceil(x0 + sw));
      const ya = Math.max(0, Math.floor(yTop)), yb = Math.min(VH, Math.ceil(yTop + sh));
      const ci = cellIdx(M, s.x, s.y);
      const L = s.bright ? 256 : shadeOf(ci >= 0 ? M.lnow[ci] : 0.5, ty);
      const fade = s.fade == null ? 1 : s.fade, ghost = s.ghost;
      const tint = s.tint || 0, tk = s.tintK || 0.6;
      for (let X = xa; X < xb; X++) {
        let tx = ((X + 0.5 - x0) / sw * sp.w) | 0; if (tx >= sp.w) tx = sp.w - 1;
        if (s.flip) tx = sp.w - 1 - tx;
        for (let Y = ya; Y < yb; Y++) {
          const o = Y * W + X;
          if (zb[o] < ty) continue;
          let tyy = ((Y + 0.5 - yTop) / sh * sp.h) | 0; if (tyy >= sp.h) tyy = sp.h - 1;
          let c = px[tyy * sp.w + tx];
          if (!c) continue;
          if (fade < 1 && BAYER[(Y & 3) * 4 + (X & 3)] >= fade * 16) continue;
          if (ghost && ((X + Y) & 1)) continue;
          if (tint) c = mixC(c, tint, tk);
          buf[o] = L >= 256 ? c : shadeC(c, L);
        }
      }
    }
    return { draw };
  }

  // ---------- map generator ----------
  function Heap() {
    const a = [];
    return {
      size: () => a.length,
      push(k, v) { a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } },
      pop() {
        const top = a[0], last = a.pop();
        if (a.length) { a[0] = last; let i = 0; for (; ;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
        return top[1];
      }
    };
  }
  function genMap(seed, o) {
    for (let a = 0; a < 120; a++) {
      const M = tryGen((seed * 2654435761 + a * 7919 + 13) >>> 0, o);
      if (M) return M;
    }
    return null;
  }
  // o: {w,h,rooms,maxRoom,theme,gates:[req],zoneItems:[[...]],final:[...],monDensity,pickMon(R,zone),pickLoot(R,zone),
  //     poly,doorChance,outdoor,secrets,secretLoot(R),deco(R)}
  function tryGen(seed, o) {
    const R = RNG(seed), w = o.w, h = o.h, M = newMap(w, h), th = o.theme, n = w * h;
    M.wtex.fill(th.wall[0]); M.seed = seed;
    const rooms = [];
    for (let t = 0; t < 800 && rooms.length < o.rooms; t++) {
      const rw = 5 + R.int(o.maxRoom - 4), rh = 5 + R.int(o.maxRoom - 4);
      const rx = 2 + R.int(w - rw - 4), ry = 2 + R.int(h - rh - 4);
      let ok = true;
      for (const r of rooms) if (rx < r.x + r.w + 3 && rx + rw + 3 > r.x && ry < r.y + r.h + 3 && ry + rh + 3 > r.y) { ok = false; break; }
      if (ok) rooms.push({ x: rx, y: ry, w: rw, h: rh, id: rooms.length, adj: [] });
    }
    const G = o.gates.length;
    if (rooms.length < G + 3) return null;
    const N = rooms.length;
    const ctr = r => [r.x + r.w / 2, r.y + r.h / 2];
    // Prim MST
    const inT = new Array(N).fill(false); inT[0] = true;
    const edges = [];
    for (let k = 1; k < N; k++) {
      let best = 1e9, ba = -1, bb = -1;
      for (let a = 0; a < N; a++) if (inT[a]) for (let b = 0; b < N; b++) if (!inT[b]) {
        const [ax, ay] = ctr(rooms[a]), [bx, by] = ctr(rooms[b]);
        const d = Math.hypot(ax - bx, ay - by) * (0.9 + R() * 0.2);
        if (d < best) { best = d; ba = a; bb = b; }
      }
      inT[bb] = true; edges.push([ba, bb]); rooms[ba].adj.push(bb); rooms[bb].adj.push(ba);
    }
    const treeDist = (s) => { const d = new Array(N).fill(-1), par = new Array(N).fill(-1); d[s] = 0; const q = [s]; while (q.length) { const a = q.shift(); for (const b of rooms[a].adj) if (d[b] < 0) { d[b] = d[a] + 1; par[b] = a; q.push(b); } } return { d, par }; };
    let t0 = treeDist(R.int(N)); let start = t0.d.indexOf(Math.max(...t0.d));
    const td = treeDist(start); let exitR = td.d.indexOf(Math.max(...td.d));
    const path = []; for (let c = exitR; c >= 0; c = td.par[c]) path.unshift(c);
    const k = path.length - 1;
    if (k < G + 1) return null;
    const gateEdge = new Map(); let prev = -1;
    for (let g = 1; g <= G; g++) {
      let j = Math.round(g * k / (G + 1)) - 1 + (g === G && G > 0 ? 0 : 0);
      j = Math.max(prev + 1, j); if (j > k - 1 - (G - g)) j = k - 1 - (G - g);
      if (j <= prev) return null;
      prev = j; gateEdge.set(path[j + 1], g); // keyed by child room (deeper)
    }
    const zone = new Array(N).fill(0), depth = td.d, onPath = new Array(N).fill(false);
    for (const p of path) onPath[p] = true;
    const order = rooms.map((r, i) => i).sort((a, b) => depth[a] - depth[b]);
    for (const i of order) if (i !== start) { const p = td.par[i]; zone[i] = zone[p] + (gateEdge.has(i) ? 1 : 0); }
    // room properties
    for (const i of order) {
      const r = rooms[i];
      r.zone = zone[i];
      r.f = i === start ? 0 : clamp(rooms[td.par[i]].f + R.pick([-0.5, -0.25, 0, 0, 0.25, 0.5]), -1, 1.5);
      const big = r.w * r.h > 50;
      r.sky = i !== start && R() < o.outdoor * (big ? 1.4 : 0.6);
      r.ch = r.sky ? 5 : (big ? R.pick([2, 2.5, 3]) : R.pick([1.5, 1.75, 2]));
      r.wt = R.pick(th.wall); r.ft = R.pick(th.floor); r.ct = R.pick(th.ceil);
      r.light = r.sky ? 0.95 : clamp(0.45 + R() * 0.5 - r.zone * 0.03, 0.3, 1);
      r.lfx = R() < 0.15 ? 1 + R.int(3) : 0;
    }
    const roomAt = new Int16Array(n).fill(-1), ring = new Int16Array(n).fill(-1), corr = new Int16Array(n).fill(-1);
    for (const r of rooms) {
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
        const i = y * w + x;
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
          roomAt[i] = r.id; M.solid[i] = 0; M.fh[i] = r.f; M.ch[i] = r.f + r.ch;
          M.ftex[i] = r.ft; M.ctex[i] = r.sky ? SKY : r.ct; M.light[i] = r.light; M.lfx[i] = r.lfx; M.wtex[i] = th.trim;
        } else { ring[i] = r.id; M.wtex[i] = r.wt; if (r.sky) M.ch[i] = r.f + 2.6 + (hash2(x, y, 5) < 0.3 ? 0.4 : 0); }
      }
    }
    // corridors
    const usedEnd = [];
    function endpoint(r, tx, ty) {
      const [cxr, cyr] = ctr(r), dx = tx - cxr, dy = ty - cyr;
      const horiz = Math.abs(dx) / r.w > Math.abs(dy) / r.h;
      const cands = [];
      if (horiz) { for (let y = r.y + 1; y < r.y + r.h - 1; y++) cands.push(dx > 0 ? [r.x + r.w, y, 1, 0] : [r.x - 1, y, -1, 0]); }
      else { for (let x = r.x + 1; x < r.x + r.w - 1; x++) cands.push(dy > 0 ? [x, r.y + r.h, 0, 1] : [x, r.y - 1, 0, -1]); }
      cands.sort((a, b) => (Math.abs(a[0] - tx) + Math.abs(a[1] - ty)) - (Math.abs(b[0] - tx) + Math.abs(b[1] - ty)) + (R() - 0.5) * 4);
      for (const c of cands) {
        if (usedEnd.some(u => Math.abs(u[0] - c[0]) + Math.abs(u[1] - c[1]) <= 2)) continue;
        const ox = c[0] + c[2], oy = c[1] + c[3];
        if (ox < 1 || oy < 1 || ox >= w - 1 || oy >= h - 1) continue;
        if (ring[oy * w + ox] >= 0 || roomAt[oy * w + ox] >= 0) continue;
        return c;
      }
      return null;
    }
    const doorPlan = [];
    for (const [a0, b0] of edges) {
      const A = depth[a0] < depth[b0] ? rooms[a0] : rooms[b0], B = A === rooms[a0] ? rooms[b0] : rooms[a0];
      const [bx, by] = ctr(B), [ax, ay] = ctr(A);
      const eA = endpoint(A, bx, by); if (!eA) return null; usedEnd.push(eA);
      const eB = endpoint(B, ax, ay); if (!eB) return null; usedEnd.push(eB);
      const z = A.zone;
      const sA = (eA[1] + eA[3]) * w + eA[0] + eA[2], sB = (eB[1] + eB[3]) * w + eB[0] + eB[2];
      const okCell = (i) => {
        const x = i % w, y = (i / w) | 0;
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return false;
        if (ring[i] >= 0 || roomAt[i] >= 0) return false;
        for (const j of [i, i - 1, i + 1, i - w, i + w]) if (corr[j] >= 0 && corr[j] !== z) return false;
        return true;
      };
      if (!okCell(sA) || !okCell(sB)) return null;
      const cost = new Float32Array(n).fill(1e9), from = new Int32Array(n).fill(-1), dirOf = new Int8Array(n);
      const hp = Heap(); cost[sA] = 0; hp.push(0, sA);
      const tgx = sB % w, tgy = (sB / w) | 0;
      let found = false;
      while (hp.size()) {
        const c = hp.pop();
        if (c === sB) { found = true; break; }
        const cxx = c % w, cyy = (c / w) | 0;
        for (let d = 0; d < 4; d++) {
          const nb = c + [1, -1, w, -w][d];
          if (!okCell(nb)) continue;
          const turn = (from[c] >= 0 && dirOf[c] !== d) ? 0.6 : 0;
          const nc = cost[c] + (corr[nb] === z ? 0.5 : 1) + turn + R() * 0.3;
          if (nc < cost[nb]) { cost[nb] = nc; from[nb] = c; dirOf[nb] = d; const nxx = nb % w, nyy = (nb / w) | 0; hp.push(nc + Math.abs(nxx - tgx) + Math.abs(nyy - tgy), nb); }
        }
        void cxx; void cyy;
      }
      if (!found) return null;
      const cells = []; for (let c = sB; c >= 0; c = from[c]) cells.unshift(c);
      const iA = eA[1] * w + eA[0], iB = eB[1] * w + eB[0];
      for (const c of cells) { corr[c] = z; M.solid[c] = 0; M.ftex[c] = th.cfloor; M.ctex[c] = th.cceil; M.light[c] = clamp(Math.min(A.light, B.light) - 0.1, 0.3, 0.8); M.wtex[c] = th.trim; }
      for (const [c, R0] of [[iA, A], [iB, B]]) { M.solid[c] = 0; M.ftex[c] = th.cfloor; M.ctex[c] = th.cceil; M.light[c] = R0.light * 0.85; M.wtex[c] = th.trim; corr[c] = -2; M.fh[c] = R0.f; }
      doorPlan.push({ A, B, iA, iB, eA, eB, gate: gateEdge.has(B.id) ? gateEdge.get(B.id) : 0, cells });
    }
    // smooth corridor heights (Laplace relaxation with fixed room/door ends)
    const isC = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (corr[i] >= 0) isC[i] = 1;
    for (let i = 0; i < n; i++) if (isC[i]) M.fh[i] = 0;
    for (const dp of doorPlan) for (const c of dp.cells) M.fh[c] = (dp.A.f + dp.B.f) / 2;
    for (let itn = 0; itn < 120; itn++) for (let i = 0; i < n; i++) if (isC[i]) {
      let s = 0, c = 0;
      for (const j of [i - 1, i + 1, i - w, i + w]) if (!M.solid[j]) { s += M.fh[j]; c++; }
      if (c) M.fh[i] = s / c;
    }
    for (let i = 0; i < n; i++) if (isC[i]) { M.fh[i] = Math.round(M.fh[i] * 8) / 8; }
    for (let i = 0; i < n; i++) if (isC[i] || corr[i] === -2) M.ch[i] = M.fh[i] + 1.35;
    for (let i = 0; i < n; i++) if (isC[i]) { let mx = M.fh[i]; for (const j of [i - 1, i + 1, i - w, i + w]) if (!M.solid[j] && roomAt[j] < 0) mx = Math.max(mx, M.fh[j]); M.ch[i] = mx + 1.35; }
    // doors
    function addDoor(i, kind, req, tex, ax, extra) {
      const d = Object.assign({ cells: [i], kind, req, top: M.fh[i] + 1.25, pos: 0, state: 0, wait: 0, spd: kind === 'poly' ? 1.1 : 1.6, stay: !!req, secret: false }, extra || {});
      M.doors.push(d); M.special[i] = kind === 'poly' ? SP_POLY : SP_DOOR; M.tag[i] = M.doors.length - 1; M.wtex[i] = tex;
      if (kind === 'poly') { M.paxis[i] = ax; M.ch[i] = M.fh[i] + 1.35; } else M.ch[i] = M.fh[i];
      return d;
    }
    for (const dp of doorPlan) {
      if (dp.gate) { const req = o.gates[dp.gate - 1]; addDoor(dp.iB, 'up', req, req.tex); continue; }
      if (R() < o.doorChance) { const useA = R() < 0.5, i = useA ? dp.iA : dp.iB, e = useA ? dp.eA : dp.eB; addDoor(i, o.poly ? 'poly' : 'up', null, o.poly ? th.poly : th.door, e[2] !== 0 ? 0 : 1); }
      else { M.ch[dp.iA] = M.fh[dp.iA] + 1.2; M.ch[dp.iB] = M.fh[dp.iB] + 1.2; }
    }
    // room features
    const usedCell = new Uint8Array(n);
    for (const r of rooms) {
      if (r.id === start || r.id === exitR) continue;
      const ix0 = r.x + 2, ix1 = r.x + r.w - 3, iy0 = r.y + 2, iy1 = r.y + r.h - 3;
      if (ix1 - ix0 < 1 || iy1 - iy0 < 1) continue;
      const f = R.pick(th.features);
      if (f === 'pillars') {
        for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) if ((x - r.x) % 3 === 2 && (y - r.y) % 3 === 2) { const i = y * w + x; M.solid[i] = 1; M.wtex[i] = th.pillar; M.ch[i] = 99; }
      } else if (f === 'dais') {
        for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) { const i = y * w + x; const inner = x > ix0 && x < ix1 && y > iy0 && y < iy1; M.fh[i] = r.f + (inner ? 0.5 : 0.25); M.ftex[i] = th.dais; if (inner) M.light[i] = Math.min(1, r.light + 0.15); }
      } else if (f === 'pit' && th.lava != null) {
        for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) { const i = y * w + x; const inner = x > ix0 && x < ix1 && y > iy0 && y < iy1; M.fh[i] = r.f - (inner ? 0.5 : 0.25); if (inner) { M.ftex[i] = th.lava; M.hazard[i] = th.lavaHaz || 1; M.light[i] = 1; } }
      } else if (f === 'column') {
        const mx = (r.x + r.w / 2) | 0, my = (r.y + r.h / 2) | 0;
        for (const [x, y] of [[mx, my], [mx - 1, my], [mx, my - 1], [mx - 1, my - 1]]) if (x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1) { const i = y * w + x; M.solid[i] = 1; M.wtex[i] = th.pillar; }
      } else if (f === 'coffer' && !r.sky) {
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { if (x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1) { const i = y * w + x; M.ch[i] = Math.max(M.fh[i] + 1.3, M.ch[i] - 0.4); } }
      } else if (f === 'pool' && th.water != null) {
        for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) { const i = y * w + x; M.fh[i] = r.f - 0.25; M.ftex[i] = th.water; M.hazard[i] = 2; }
      }
    }
    function freeCell(r, edgeOk) {
      for (let t = 0; t < 60; t++) {
        const x = r.x + 1 + R.int(Math.max(1, r.w - 2)), y = r.y + 1 + R.int(Math.max(1, r.h - 2)), i = y * w + x;
        if (M.solid[i] || M.hazard[i] || M.special[i] || usedCell[i]) continue;
        usedCell[i] = 1; return { x: x + 0.5, y: y + 0.5, i };
      }
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const i = y * w + x; if (!M.solid[i] && !M.special[i] && !usedCell[i] && (edgeOk || !M.hazard[i])) { usedCell[i] = 1; return { x: x + 0.5, y: y + 0.5, i }; } }
      return null;
    }
    function interiorCell(r) { // a cell at least 2 from walls, for switches/pads
      for (let t = 0; t < 80; t++) {
        const x = r.x + 2 + R.int(Math.max(1, r.w - 4)), y = r.y + 2 + R.int(Math.max(1, r.h - 4)), i = y * w + x;
        if (M.solid[i] || M.special[i] || usedCell[i] || M.hazard[i]) continue;
        let ok = true; for (const j of [i - 1, i + 1, i - w, i + w]) if (M.solid[j] || M.special[j]) ok = false;
        if (!ok) continue;
        usedCell[i] = 1; return { x: x + 0.5, y: y + 0.5, i };
      }
      return null;
    }
    // start
    const sr = rooms[start];
    const sc = { x: sr.x + sr.w / 2, y: sr.y + sr.h / 2 };
    M.start = { x: Math.floor(sc.x) + 0.5, y: Math.floor(sc.y) + 0.5, ang: R() * TAU };
    usedCell[Math.floor(sc.y) * w + Math.floor(sc.x)] = 1;
    // zone items
    const placeList = [];
    for (let z = 0; z <= G; z++) {
      const items = (o.zoneItems[z] || []).slice();
      if (z === G && o.final) items.push(...o.final);
      if (!items.length) continue;
      const inZ = rooms.filter(r => r.zone === z);
      const offP = inZ.filter(r => !onPath[r.id] && r.id !== start).sort((a, b) => depth[b.id] - depth[a.id]);
      const onP = inZ.filter(r => onPath[r.id] && r.id !== start && r.id !== exitR);
      let cand = offP.concat(onP); if (!cand.length) cand = inZ.filter(r => r.id !== exitR); if (!cand.length) cand = inZ;
      let ci = 0;
      for (const it of items) {
        const r = (it.t === 'exit' || it.final) ? rooms[exitR] : cand[ci++ % cand.length];
        placeList.push([it, r]);
      }
    }
    for (const [it, r] of placeList) {
      if (it.t === 'switch') {
        const c = interiorCell(r) || freeCell(r); if (!c) return null;
        M.solid[c.i] = 1; M.special[c.i] = SP_SWITCH; M.tag[c.i] = M.switches.length; M.wtex[c.i] = th.switchOff; M.ch[c.i] = M.fh[c.i] + 1.1;
        M.switches.push({ i: c.i, on: false, flag: it.flag, msg: it.msg }); it.room = r.id;
      } else if (it.t === 'exit' || it.t === 'portal') {
        const c = interiorCell(r) || freeCell(r); if (!c) return null;
        M.special[c.i] = it.t === 'exit' ? SP_EXIT : SP_PORTAL; M.ftex[c.i] = th.pad; M.light[c.i] = 1;
        if (it.t === 'portal') { M.tag[c.i] = M.portals.length; M.portals.push({ i: c.i, x: c.x, y: c.y, to: it.to, id: it.id, room: r.id }); }
        M.things.push({ t: 'deco', kind: it.t === 'exit' ? 'exitglow' : 'portalglow', x: c.x, y: c.y });
      } else {
        const c = freeCell(r); if (!c) return null;
        M.things.push(Object.assign({}, it, { x: c.x, y: c.y }));
      }
    }
    // monsters, loot, deco
    for (const r of rooms) {
      if (r.id !== start) {
        const cnt = Math.round(r.w * r.h / 12 * o.monDensity * (0.6 + R() * 0.7));
        for (let k2 = 0; k2 < cnt; k2++) { const c = freeCell(r, true); if (c) M.things.push({ t: 'mon', kind: o.pickMon(R, r.zone, r), x: c.x, y: c.y }); }
      }
      const lc = R() < 0.75 ? 1 + R.int(3) : 0;
      for (let k2 = 0; k2 < lc; k2++) { const c = freeCell(r); if (c) M.things.push({ t: 'item', kind: o.pickLoot(R, r.zone), x: c.x, y: c.y }); }
      if (o.deco) for (const [x, y] of [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1]]) {
        const i = y * w + x; if (M.solid[i] || usedCell[i] || R() < 0.45) continue; usedCell[i] = 1;
        M.things.push({ t: 'deco', kind: o.deco(R, r), x: x + 0.5, y: y + 0.5 });
      }
    }
    // secrets
    M.secretsTotal = 0;
    for (let s = 0; s < o.secrets; s++) {
      for (let t = 0; t < 40; t++) {
        const r = rooms[R.int(N)];
        const side = R.int(4);
        let ex, ey, ox, oy, lx, ly;
        if (side === 0) { ex = r.x + 1 + R.int(r.w - 2); ey = r.y - 1; ox = 0; oy = -1; lx = 1; ly = 0; }
        else if (side === 1) { ex = r.x + 1 + R.int(r.w - 2); ey = r.y + r.h; ox = 0; oy = 1; lx = 1; ly = 0; }
        else if (side === 2) { ex = r.x - 1; ey = r.y + 1 + R.int(r.h - 2); ox = -1; oy = 0; lx = 0; ly = 1; }
        else { ex = r.x + r.w; ey = r.y + 1 + R.int(r.h - 2); ox = 1; oy = 0; lx = 0; ly = 1; }
        const di = ey * w + ex;
        if (!M.solid[di] || M.special[di] || usedEnd.some(u => Math.abs(u[0] - ex) + Math.abs(u[1] - ey) <= 1)) continue;
        if (!M.solid[di - lx - ly * w] || !M.solid[di + lx + ly * w]) continue;
        const cl = [];
        for (let a = 1; a <= 2; a++) for (let b = 0; b <= 1; b++) cl.push((ey + oy * a + ly * b) * w + ex + ox * a + lx * b);
        let ok = true;
        for (const c of cl) {
          const x = c % w, y = (c / w) | 0;
          if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) { ok = false; break; }
          for (const j of [c, c - 1, c + 1, c - w, c + w]) { if (j === di || cl.includes(j)) continue; if (!M.solid[j] || roomAt[j] >= 0 || corr[j] !== -1 || M.special[j]) { ok = false; break; } }
          if (!ok || ring[c] >= 0 && ring[c] !== r.id) { ok = false; break; }
        }
        if (!ok) continue;
        for (const c of cl) { M.solid[c] = 0; M.fh[c] = r.f; M.ch[c] = r.f + 1.3; M.ftex[c] = th.dais; M.ctex[c] = th.cceil; M.light[c] = 0.85; M.lfx[c] = 2; M.secret[c] = 1; M.wtex[c] = th.trim; corr[c] = -3; }
        M.solid[di] = 0; M.fh[di] = r.f; M.ftex[di] = th.cfloor; M.ctex[di] = th.cceil; M.light[di] = r.light;
        addDoor(di, 'up', null, r.wt, 0, { secret: true, stay: true, top: r.f + 1.3 });
        const c0 = cl[2];
        M.things.push({ t: 'item', kind: o.secretLoot(R), x: (c0 % w) + 0.5, y: ((c0 / w) | 0) + 0.5 });
        M.things.push({ t: 'item', kind: o.pickLoot(R, 0), x: (cl[1] % w) + 0.5, y: ((cl[1] / w) | 0) + 0.5 });
        M.secretsTotal++;
        break;
      }
    }
    M.rooms = rooms; M.startRoom = start; M.exitRoom = exitR; M.zoneOf = zone;
    if (!validate(M)) return null;
    return M;
  }
  // can a walker get everywhere that matters, assuming every requirement can be met?
  function validate(M) {
    const w = M.w, seen = new Uint8Array(M.n), q = [];
    const s = cellIdx(M, M.start.x, M.start.y); if (s < 0 || M.solid[s]) return false;
    seen[s] = 1; q.push(s);
    const top = i => { const d = doorAt(M, i); return d ? (d.kind === 'poly' ? M.ch[i] : d.top) : M.ch[i]; };
    while (q.length) {
      const a = q.pop();
      for (const b of [a - 1, a + 1, a - w, a + w]) {
        if (b < 0 || b >= M.n || seen[b] || M.solid[b]) continue;
        if (M.fh[b] - M.fh[a] > MAXSTEP - 0.05) continue;
        if (Math.min(top(a), top(b)) - Math.max(M.fh[a], M.fh[b]) < PHEIGHT + 0.1) continue;
        seen[b] = 1;
        if (M.special[b] !== SP_PORTAL && M.special[b] !== SP_EXIT) q.push(b);
      }
    }
    for (const t of M.things) { const i = cellIdx(M, t.x, t.y); if (i < 0 || M.solid[i]) return false; if (t.t !== 'mon' && t.t !== 'deco' && !seen[i] && !M.secret[i]) return false; }
    for (const p of M.portals) if (!seen[p.i]) return false;
    for (const sw of M.switches) { const i = sw.i; if (![i - 1, i + 1, i - w, i + w].some(j => seen[j])) return false; }
    for (let i = 0; i < M.n; i++) if (M.special[i] === SP_EXIT && !seen[i]) return false;
    return true;
  }


  // ---------- world simulation ----------
  // cfg: { mon: {kind: def}, items: {kind: {spr,w,h,bright,float}}, deco: {kind: {spr,w,h,bright,block}},
  //        onItem(G,it)->bool, onKill(G,m), hurtPlayer(G,dmg,src), sfx(name,x,y) }
  function World(M, cfg, P) {
    const G = {
      M, cfg, P, mons: [], projs: [], items: [], decos: [], fx: [], time: 0, frame: 0, noise: 0,
      ff: new Int16Array(M.n), ffF: new Int16Array(M.n), q: new Int32Array(M.n), R: RNG((M.seed ^ 0x5bd1e995) >>> 0), nextId: 1,
      kills: 0, killsTotal: 0, itemsGot: 0, itemsTotal: 0, secretsGot: 0
    };
    for (const t of M.things) spawnThing(G, t);
    return G;
  }
  function spawnThing(G, t) {
    const cfg = G.cfg, M = G.M;
    if (t.t === 'mon') return spawnMon(G, t.kind, t.x, t.y);
    const f = floorAt(M, t.x, t.y, 0.01);
    if (t.t === 'item') { const d = cfg.items[t.kind]; if (!d) return null; const it = Object.assign({}, t, { d, z: f, alive: true }); G.items.push(it); if (!d.noCount) G.itemsTotal++; return it; }
    if (t.t === 'deco') { const d = cfg.deco[t.kind]; if (!d) return null; const it = Object.assign({}, t, { d, z: f + (d.zoff || 0) }); G.decos.push(it); return it; }
    return null;
  }
  function spawnMon(G, kind, x, y, z) {
    const D = G.cfg.mon[kind]; if (!D) return null;
    const f = floorAt(G.M, x, y, D.r);
    const m = { id: G.nextId++, kind, def: D, x, y, z: z != null ? z : f + (D.fly ? (D.hover || 0.5) : 0), r: D.r, h: D.h, hp: D.hp, maxhp: D.hp, st: 0, t: 0, cd: 1 + G.R() * 1.5, ang: G.R() * TAU, anim: G.R() * 3, flash: 0, seeP: false, stuck: 0, wdir: 0, wt: 0, dead: false, alpha: 1 };
    G.mons.push(m); if (!D.noCount) G.killsTotal++;
    return m;
  }
  function wakeMon(G, m) { if (m.st === 0) { m.st = 1; G.cfg.sfx && G.cfg.sfx('sight', m); } }
  function hurtMon(G, m, dmg, src) {
    if (m.dead) return;
    if (m.def.shield && m.def.shield(G, m, dmg, src)) return;
    m.hp -= dmg; m.flash = 0.12; wakeMon(G, m);
    if (m.hp <= 0) {
      m.dead = true; m.st = 4; m.t = 0;
      if (!m.def.noCount) G.kills++;
      G.cfg.onKill && G.cfg.onKill(G, m);
      return;
    }
    if (m.st !== 2 && G.R() < (m.def.pain || 0.3)) { m.st = 3; m.t = 0.25; G.cfg.sfx && G.cfg.sfx('pain', m); }
  }
  function spawnProj(G, D, x, y, z, ang, slope, owner, extra) {
    const s = D.speed;
    const cz = Math.cos(Math.atan(slope));
    const p = Object.assign({ def: D, x: x + Math.cos(ang) * 0.3, y: y + Math.sin(ang) * 0.3, z, vx: Math.cos(ang) * s * cz, vy: Math.sin(ang) * s * cz, vz: Math.sin(Math.atan(slope)) * s, owner, life: D.life || 4, dmg: D.dmg, r: D.r || 0.12, bounces: D.bounce || 0, hits: D.rip ? [] : null, t: 0, alive: true }, extra || {});
    G.projs.push(p);
    return p;
  }
  function addFx(G, x, y, z, spr, w, life, o) {
    const f = Object.assign({ x, y, z, spr, w, h: w, t: 0, life, vz: 0, grow: 0, alive: true }, o || {});
    G.fx.push(f); return f;
  }
  function radiusDamage(G, x, y, z, rad, dmg, owner, hurtsPlayer) {
    for (const m of G.mons) {
      if (m.dead || m === owner) continue;
      const d = Math.hypot(m.x - x, m.y - y, (m.z + m.h / 2) - z) - m.r;
      if (d < rad && los(G.M, x, y, z, m.x, m.y, m.z + m.h / 2)) hurtMon(G, m, dmg * (1 - Math.max(0, d) / rad), owner);
    }
    if (hurtsPlayer) {
      const P = G.P, d = Math.hypot(P.x - x, P.y - y, P.z + 0.5 - z) - PRAD;
      if (d < rad && los(G.M, x, y, z, P.x, P.y, P.z + 0.5)) G.cfg.hurtPlayer(G, dmg * (1 - Math.max(0, d) / rad) * 0.5, owner);
    }
  }
  function explodeProj(G, p, target) {
    p.alive = false;
    const D = p.def;
    if (target === 'P') G.cfg.hurtPlayer(G, p.dmg * (0.75 + G.R() * 0.5), p.owner);
    else if (target) hurtMon(G, target, p.dmg * (0.75 + G.R() * 0.5), p.owner);
    if (D.splash) radiusDamage(G, p.x, p.y, p.z, D.splash, D.splashDmg || p.dmg, target && target !== 'P' ? null : p.owner, p.owner !== 'P' && D.splashHurtsPlayer !== false && p.owner !== G.P);
    if (D.onHit) D.onHit(G, p, target);
    if (D.boom) addFx(G, p.x - p.vx * 0.01, p.y - p.vy * 0.01, p.z - 0.2, D.boom, D.boomSize || 0.6, D.boomLife || 0.3, { grow: 1.2 });
    G.cfg.sfx && G.cfg.sfx(D.hitSfx || 'phit', p);
  }
  function updateProjs(G, dt) {
    const M = G.M, P = G.P;
    for (const p of G.projs) {
      if (!p.alive) continue;
      p.t += dt; p.life -= dt;
      if (p.life <= 0) { if (p.def.expire) { explodeProj(G, p, null); } else p.alive = false; continue; }
      const D = p.def;
      if (D.seek && p.target && !p.target.dead) {
        const tg = p.target === 'P' ? P : p.target;
        const a = Math.atan2(tg.y - p.y, tg.x - p.x), cur = Math.atan2(p.vy, p.vx), sp = Math.hypot(p.vx, p.vy);
        const na = cur + clamp(angDiff(cur, a), -D.seek * dt, D.seek * dt);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        const tz = (tg === P ? P.z + 0.5 : tg.z + tg.h * 0.5);
        p.vz += clamp(tz - p.z, -1, 1) * dt * 6; p.vz *= 0.95;
      }
      if (D.grav) p.vz -= D.grav * dt;
      if (D.trail && (G.frame & 1)) addFx(G, p.x, p.y, p.z - 0.1, D.trail, 0.25, 0.25, { vz: 0.3 });
      const dist = Math.hypot(p.vx, p.vy, p.vz) * dt, steps = Math.max(1, Math.ceil(dist / 0.12));
      const sx = p.vx * dt / steps, sy = p.vy * dt / steps, sz = p.vz * dt / steps;
      for (let s = 0; s < steps && p.alive; s++) {
        const ox = p.x, oy = p.y;
        p.x += sx; p.y += sy; p.z += sz;
        const c = cellIdx(M, p.x, p.y);
        let wall = c < 0 || M.solid[c] || (M.special[c] === SP_POLY && M.ppos[c] < 0.9);
        if (!wall && (p.z < M.fh[c] || p.z > M.ch[c])) {
          if (p.z > M.ch[c] && M.ctex[c] === SKY) { p.alive = false; break; }
          if (p.bounces > 0) { p.bounces--; if (p.z < M.fh[c]) { p.z = M.fh[c] + 0.01; p.vz = Math.abs(p.vz) * 0.65; } else { p.z = M.ch[c] - 0.01; p.vz = -Math.abs(p.vz); } G.cfg.sfx && G.cfg.sfx('bounce', p); break; }
          wall = true;
        }
        if (wall) {
          if (p.bounces > 0 && c >= 0) {
            p.bounces--; p.x = ox; p.y = oy;
            const cx2 = cellIdx(M, ox + sx, oy), cy2 = cellIdx(M, ox, oy + sy);
            const bx = cx2 < 0 || M.solid[cx2] || p.z < M.fh[cx2] || p.z > M.ch[cx2];
            const by = cy2 < 0 || M.solid[cy2] || p.z < M.fh[cy2] || p.z > M.ch[cy2];
            if (bx || !by) p.vx = -p.vx; if (by || !bx) p.vy = -p.vy;
            G.cfg.sfx && G.cfg.sfx('bounce', p); break;
          }
          p.x = ox; p.y = oy; explodeProj(G, p, null); break;
        }
        if (p.owner === P) {
          for (const m of G.mons) {
            if (m.dead || Math.abs(m.x - p.x) > m.r + p.r || Math.abs(m.y - p.y) > m.r + p.r || p.z < m.z - 0.1 || p.z > m.z + m.h + 0.1) continue;
            if (p.hits) { if (p.hits.indexOf(m) < 0) { p.hits.push(m); hurtMon(G, m, p.dmg * (0.75 + G.R() * 0.5), P); if (D.ripFx) addFx(G, p.x, p.y, p.z - 0.15, D.ripFx, 0.4, 0.2); } continue; }
            explodeProj(G, p, m); break;
          }
        } else if (!P.dead && Math.abs(P.x - p.x) < PRAD + p.r && Math.abs(P.y - p.y) < PRAD + p.r && p.z > P.z - 0.05 && p.z < P.z + PHEIGHT + 0.05) {
          explodeProj(G, p, 'P');
        }
      }
    }
    G.projs = G.projs.filter(p => p.alive);
  }
  function updateFx(G, dt) {
    for (const f of G.fx) { f.t += dt; f.z += f.vz * dt; if (f.grow) { f.w += f.grow * dt; f.h = f.w; } if (f.t >= f.life) f.alive = false; }
    G.fx = G.fx.filter(f => f.alive);
  }
  function monStep(G, m, dx, dy) {
    const D = m.def, M = G.M, P = G.P;
    const ox = m.x, oy = m.y;
    const hit = moveEnt(M, m, dx, dy, D.fly ? m.h * 0.6 : m.h * 0.8, D.fly ? 0.05 : 0.45);
    if (!P.dead && Math.hypot(m.x - P.x, m.y - P.y) < m.r + PRAD) { m.x = ox; m.y = oy; }
    for (const o of G.mons) {
      if (o === m || o.dead) continue;
      const d = Math.hypot(m.x - o.x, m.y - o.y), rr = m.r + o.r;
      if (d < rr && d > 0.001 && Math.abs(o.z - m.z) < Math.max(o.h, m.h)) {
        const push = (rr - d) * 0.5, nx = (m.x - o.x) / d, ny = (m.y - o.y) / d;
        if (areaBlocked(M, m.x + nx * push, m.y + ny * push, m.r, m.z, D.fly ? m.h * 0.6 : m.h * 0.8, D.fly ? 0.05 : 0.45) === -1) { m.x += nx * push; m.y += ny * push; }
      }
    }
    if (hit >= 0) {
      const d = doorAt(M, hit);
      if (d && !d.req && !d.secret) openDoor(d);
    }
    return hit;
  }
  function updateMons(G, dt) {
    const M = G.M, P = G.P;
    if (G.frame % 12 === 0) { flowField(M, P.x, P.y, false, G.ff, G.q); flowField(M, P.x, P.y, true, G.ffF, G.q); }
    for (const m of G.mons) {
      const D = m.def;
      m.anim += dt;
      if (m.flash > 0) m.flash -= dt;
      if (m.st === 4) { m.t += dt; if (D.fly && m.z > floorAt(M, m.x, m.y, m.r)) m.z = Math.max(floorAt(M, m.x, m.y, m.r), m.z - dt * 3); continue; }
      const dx = P.x - m.x, dy = P.y - m.y, dist = Math.hypot(dx, dy);
      if (m.st === 0) {
        if ((G.frame + m.id) % 8 === 0) {
          if ((G.noise > 0 && dist < 13) || (dist < 24 && los(M, m.x, m.y, m.z + m.h * 0.8, P.x, P.y, P.z + 0.7) && (Math.cos(angDiff(m.ang, Math.atan2(dy, dx))) > -0.2 || dist < 4))) wakeMon(G, m);
        }
        if (D.fly) m.z += Math.sin(m.anim * 2) * 0.002;
        continue;
      }
      if (D.think && D.think(G, m, dt, dist)) continue;
      if (m.st === 3) { m.t -= dt; if (m.t <= 0) m.st = 1; continue; }
      if (m.st === 2) {
        m.t -= dt; m.ang = Math.atan2(dy, dx);
        if (m.t <= 0) { m.st = 1; monAttack(G, m, dist); }
        continue;
      }
      m.cd -= dt;
      if ((G.frame + m.id) % 4 === 0) m.seeP = !P.dead && los(M, m.x, m.y, m.z + m.h * 0.75, P.x, P.y, P.z + 0.6);
      if (!P.dead && D.melee && dist < m.r + PRAD + (D.mrange || 0.45) && Math.abs(P.z - m.z) < 1.3 && m.cd <= 0) {
        m.st = 2; m.t = D.mwind || 0.3; m.atk = 'm'; m.cd = D.mcd || 0.9; continue;
      }
      if (!P.dead && D.ranged && m.cd <= 0 && m.seeP && dist < (D.ranged.range || 22) && dist > (D.ranged.min || 0) && G.R() < (D.ranged.chance || 0.5) * dt * 3) {
        m.st = 2; m.t = D.ranged.wind || 0.4; m.atk = 'r'; m.cd = D.ranged.cd * (0.7 + G.R() * 0.6); continue;
      }
      // navigation
      let tx = P.x, ty = P.y;
      if (m.wt > 0) { m.wt -= dt; tx = m.x + Math.cos(m.wdir); ty = m.y + Math.sin(m.wdir); }
      else if (!(m.seeP && dist < 3.5)) {
        const ff = D.fly ? G.ffF : G.ff, c = cellIdx(M, m.x, m.y);
        if (c >= 0 && ff[c] > 0) {
          let best = ff[c], bi = -1;
          const w = M.w;
          for (const j of [c + 1, c - 1, c + w, c - w]) if (j >= 0 && j < M.n && ff[j] >= 0 && ff[j] < best) { best = ff[j]; bi = j; }
          if (bi >= 0) { tx = (bi % w) + 0.5; ty = ((bi / w) | 0) + 0.5; }
        }
      }
      if (P.dead) { tx = m.x + Math.cos(m.ang); ty = m.y + Math.sin(m.ang); }
      const a = Math.atan2(ty - m.y, tx - m.x);
      m.ang = a;
      const sp = D.spd * dt * (G.speedMul || 1);
      if (dist > m.r + PRAD + 0.1 || P.dead) {
        const ox = m.x, oy = m.y;
        monStep(G, m, Math.cos(a) * sp, Math.sin(a) * sp);
        const moved = Math.hypot(m.x - ox, m.y - oy);
        if (moved < sp * 0.2) { m.stuck += dt; if (m.stuck > 0.6) { m.stuck = 0; m.wdir = G.R() * TAU; m.wt = 0.5 + G.R() * 0.5; } }
        else m.stuck = Math.max(0, m.stuck - dt);
      }
      // vertical
      const f = floorAt(M, m.x, m.y, m.r);
      if (D.fly) {
        const c = ceilAt(M, m.x, m.y, m.r);
        const tz = clamp(P.z + (D.hover || 0.4) + Math.sin(m.anim * 2) * 0.15, f + 0.05, c - m.h - 0.05);
        m.z += clamp(tz - m.z, -1.6 * dt, 1.6 * dt);
        if (m.z < f) m.z = f;
      } else {
        if (m.z > f) m.z = Math.max(f, m.z - 6 * dt); else m.z = f;
      }
    }
    // remove long-dead
    G.mons = G.mons.filter(m => !(m.dead && m.t > (m.def.corpse || 2.2)));
  }
  function monAttack(G, m, dist) {
    const D = m.def, P = G.P;
    if (D.attack) { D.attack(G, m, dist, m.atk); return; }
    if (m.atk === 'm') {
      if (dist < m.r + PRAD + (D.mrange || 0.45) + 0.35 && Math.abs(P.z - m.z) < 1.4) { G.cfg.hurtPlayer(G, D.melee * (0.75 + G.R() * 0.5), m); G.cfg.sfx && G.cfg.sfx('melee', m); }
      else G.cfg.sfx && G.cfg.sfx('swing', m);
      return;
    }
    monShoot(G, m, D.ranged.proj, D.ranged.n || 1, D.ranged.spread || 0);
  }
  function monShoot(G, m, proj, n, spread, extra) {
    const P = G.P, z0 = m.z + m.h * 0.6;
    const d = Math.max(0.5, Math.hypot(P.x - m.x, P.y - m.y));
    const base = Math.atan2(P.y - m.y, P.x - m.x) + (G.R() - 0.5) * 0.06;
    const slope = (P.z + 0.55 - z0) / d;
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i - (n - 1) / 2) * spread : 0);
      spawnProj(G, proj, m.x, m.y, z0, a, slope, m, extra ? Object.assign({}, extra) : null);
    }
    G.cfg.sfx && G.cfg.sfx('mshoot', m, proj);
  }
  // player movement with collisions (map + monsters); returns bumped cell index or -1
  function playerMove(G, P, dx, dy, step) {
    const M = G.M;
    let bump = -1;
    const blockedByMon = (x, y) => {
      for (const m of G.mons) if (!m.dead && Math.hypot(m.x - x, m.y - y) < m.r + PRAD && P.z + PHEIGHT > m.z && P.z < m.z + m.h) return true;
      for (const d of G.decos) if (d.d.block && Math.hypot(d.x - x, d.y - y) < 0.25 + PRAD) return true;
      return false;
    };
    const tryAxis = (nx, ny) => {
      const b = areaBlocked(M, nx, ny, PRAD, P.z, PHEIGHT, step);
      if (b !== -1) { if (bump < 0 && b >= 0) bump = b; return false; }
      if (blockedByMon(nx, ny) && !blockedByMon(P.x, P.y)) return false;
      P.x = nx; P.y = ny; return true;
    };
    if (dx) tryAxis(P.x + dx, P.y);
    if (dy) tryAxis(P.x, P.y + dy);
    return bump;
  }
  function playerVertical(G, P, dt, flying, flyIn) {
    const M = G.M;
    const f = floorAt(M, P.x, P.y, PRAD), c = ceilAt(M, P.x, P.y, PRAD);
    let landed = 0;
    if (flying) {
      P.vz = flyIn * 3; P.z += P.vz * dt;
      if (P.z < f) P.z = f;
    } else if (P.z > f + 0.001) {
      P.vz -= 13 * dt; P.z += P.vz * dt;
      if (P.z <= f) { landed = -P.vz; P.z = f; P.vz = 0; }
    } else {
      if (P.z < f) { P.viewOff -= (f - P.z); P.z = f; }
      if (P.vz > 0) P.z += P.vz * dt; else P.vz = 0;
    }
    if (P.z + PHEIGHT > c) { P.z = Math.max(f, c - PHEIGHT); if (P.vz > 0) P.vz = 0; }
    P.onGround = P.z <= f + 0.002;
    P.viewOff *= Math.pow(0.0005, dt); if (Math.abs(P.viewOff) < 0.002) P.viewOff = 0;
    return landed;
  }
  // nearest monster in an aim cone (autoaim); returns {m, slope} or null
  function autoAim(G, x, y, z, ang, cone, range) {
    let best = null, bd = 1e9;
    for (const m of G.mons) {
      if (m.dead || m.def.noAim) continue;
      const dx = m.x - x, dy = m.y - y, d = Math.hypot(dx, dy);
      if (d > (range || 24)) continue;
      const da = Math.abs(angDiff(ang, Math.atan2(dy, dx)));
      if (da > cone + Math.atan2(m.r, d)) continue;
      const tz = m.z + m.h * 0.55;
      if (!los(G.M, x, y, z, m.x, m.y, tz)) continue;
      const score = d * (1 + da * 4);
      if (score < bd) { bd = score; best = { m, slope: (tz - z) / Math.max(0.3, d), ang: Math.atan2(dy, dx) }; }
    }
    return best;
  }
  function meleeHit(G, P, range, dmg, cone) {
    let best = null, bd = 1e9;
    for (const m of G.mons) {
      if (m.dead) continue;
      const dx = m.x - P.x, dy = m.y - P.y, d = Math.hypot(dx, dy) - m.r;
      if (d > range || Math.abs(angDiff(P.ang, Math.atan2(dy, dx))) > (cone || 0.5)) continue;
      if (m.z > P.z + PHEIGHT + 0.3 || m.z + m.h < P.z - 0.2) continue;
      if (d < bd) { bd = d; best = m; }
    }
    if (best) hurtMon(G, best, dmg, P);
    return best;
  }
  function buildSprites(G, cam, out, monSpr) {
    out.length = 0;
    for (const d of G.decos) out.push({ x: d.x, y: d.y, z: d.z, spr: d.anim ? d.anim[(G.time * 6 | 0) % d.anim.length] : (d.d.anim ? d.d.anim[((G.time * 6) | 0) % d.d.anim.length] : d.d.spr), w: d.d.w, h: d.d.h, bright: d.d.bright });
    for (const it of G.items) {
      if (!it.alive) continue;
      const d = it.d, bob = d.float ? 0.12 + Math.sin(G.time * 3 + it.x) * 0.06 : 0;
      out.push({ x: it.x, y: it.y, z: it.z + bob, spr: d.anim ? d.anim[((G.time * 5) | 0) % d.anim.length] : d.spr, w: d.w, h: d.h, bright: d.bright });
    }
    for (const m of G.mons) out.push(monSpr(m, cam));
    for (const p of G.projs) { const D = p.def; out.push({ x: p.x, y: p.y, z: p.z - D.size / 2, spr: D.anim ? D.anim[((p.t * 12) | 0) % D.anim.length] : D.spr, w: D.size, h: D.size, bright: true }); }
    for (const f of G.fx) out.push({ x: f.x, y: f.y, z: f.z - f.h / 2 + 0.2, spr: f.spr, w: f.w, h: f.h, bright: true, fade: f.fade === false ? 1 : 1 - f.t / f.life });
    return out;
  }
  function standardMonSprite(m, cam) {
    const D = m.def, S = D.spr;
    let spr, h = D.sh, fade = 1, z = m.z;
    if (m.dead) {
      const t = m.t; spr = S.die || S.pain || S.walk[0];
      h = D.sh * Math.max(0.35, 1 - t * 1.4); fade = clamp(1.6 - t / ((D.corpse || 2.2) * 0.7), 0, 1);
    } else if (m.st === 2) spr = S.atk;
    else if (m.st === 3) spr = S.pain || S.walk[0];
    else if (m.st === 0) spr = S.walk[0];
    else spr = S.walk[((m.anim * (D.animRate || 4)) | 0) % S.walk.length];
    const rel = Math.atan2(m.y - cam.y, m.x - cam.x);
    const flip = Math.sin(m.ang - rel) < 0;
    return { x: m.x, y: m.y, z, spr, w: D.sw, h, bright: D.bright || (m.st === 2 && D.atkBright), fade: fade * (D.alpha || 1), ghost: D.ghost, flip, tint: m.flash > 0 ? 0xffffffff : 0, tintK: 0.55 };
  }


  // boss arena: one big open court with corner daises, pillars and an anteroom
  function genArena(seed, th, light) {
    const w = 30, h = 34, M = newMap(w, h), R = RNG(seed);
    M.seed = seed; M.wtex.fill(th.wall[0]);
    const room = (x0, y0, rw, rh, f, ch, ft, ct, l) => {
      for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) {
        const i = y * w + x; M.solid[i] = 0; M.fh[i] = f; M.ch[i] = f + ch; M.ftex[i] = ft; M.ctex[i] = ct; M.light[i] = l; M.wtex[i] = th.trim;
      }
    };
    room(3, 3, 24, 22, 0, 5, th.floor[0], SKY, light);
    for (let x = 2; x < 28; x++) { M.ch[2 * w + x] = 3; M.ch[25 * w + x] = 3; }
    for (let y = 2; y < 26; y++) { M.ch[y * w + 2] = 3; M.ch[y * w + 27] = 3; }
    room(12, 27, 6, 5, 0, 1.6, th.cfloor, th.cceil, 0.7);
    // gate between anteroom and court
    for (const x of [14, 15]) { const i = 25 * w + x, j = 26 * w + x; for (const c of [i, j]) { M.solid[c] = 0; M.fh[c] = 0; M.ch[c] = 1.4; M.ftex[c] = th.cfloor; M.ctex[c] = th.cceil; M.light[c] = 0.6; M.wtex[c] = th.trim; } }
    const dais = (x0, y0) => { for (let y = y0; y < y0 + 5; y++) for (let x = x0; x < x0 + 5; x++) { const i = y * w + x, inner = x > x0 && x < x0 + 4 && y > y0 && y < y0 + 4; M.fh[i] = inner ? 0.5 : 0.25; M.ftex[i] = th.dais; } };
    dais(4, 4); dais(21, 4); dais(4, 19); dais(21, 19);
    for (const [px, py] of [[9, 10], [19, 10], [9, 17], [19, 17]]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = (py + dy) * w + px + dx; M.solid[i] = 1; M.wtex[i] = th.pillar; M.ch[i] = 99; }
    if (th.lava != null) for (const [lx, ly] of [[13, 4], [14, 4], [15, 4], [16, 4], [13, 23], [16, 23], [3, 13], [3, 14], [26, 13], [26, 14]]) { const i = ly * w + lx; M.fh[i] = -0.25; M.ftex[i] = th.lava; M.hazard[i] = 1; M.light[i] = 1; }
    M.start = { x: 15, y: 30, ang: -Math.PI / 2 };
    M.rooms = [{ x: 3, y: 3, w: 24, h: 22, zone: 0, f: 0 }, { x: 12, y: 27, w: 6, h: 5, zone: 0, f: 0 }];
    M.startRoom = 1; M.exitRoom = 0; M.arena = true;
    return M;
  }


  // ====================== textures ======================
  function buildTextures() {
    const TEX = [], idx = {};
    const add = (name, px, o) => { idx[name] = TEX.length; TEX.push(Object.assign({ px }, o || {})); };
    add('moss', TG.bricks([88, 104, 74], [36, 44, 30], 16, 8, 51, 0.6));
    add('fstone', TG.blocks([104, 108, 96], 52));
    add('wood', TG.planks([116, 84, 52], 53, true));
    add('grass', TG.ground([60, 86, 40], [86, 74, 46], 54));
    add('mud', TG.ground([72, 60, 44], [52, 46, 36], 55));
    add('flag', TG.flags([96, 98, 90], [36, 38, 34], 56));
    add('beams', TG.planks([84, 60, 38], 57, false));
    add('trim', TG.bricks([78, 80, 70], [34, 36, 30], 32, 8, 58, 0.4));
    add('water', TG.liquid([20, 60, 70], [80, 150, 150], 59), { anim: 0.15 });
    add('ice', TG.blocks([150, 190, 220], 60));
    add('snow', TG.ground([210, 220, 236], [170, 186, 210], 61));
    add('marble', TG.marble([196, 204, 220], [110, 130, 170], 62));
    add('fmarble', TG.marble([90, 110, 150], [210, 220, 240], 63));
    add('silver', TG.metal([150, 160, 176], 64));
    add('itile', TG.tiles([170, 190, 214], [90, 110, 150], 65));
    add('basalt', TG.rock([70, 54, 50], 66));
    add('ember', TG.bricks([86, 38, 30], [255, 110, 30], 16, 16, 67, 0.6));
    add('ash', TG.ground([68, 60, 56], [38, 34, 32], 68));
    add('lava', TG.liquid([150, 24, 0], [255, 196, 50], 69), { anim: 0.1, bright: true });
    add('obsid', TG.blocks([52, 46, 64], 70));
    add('gold', TG.metal([184, 142, 54], 71));
    add('ptile', TG.tiles([80, 60, 110], [40, 30, 60], 72));
    add('iron', TG.metal([96, 96, 108], 73));
    add('poly', TG.door([90, 92, 104], [170, 140, 60], [120, 200, 255], 74));
    add('door', TG.door([116, 80, 46], [70, 70, 76], null, 75));
    add('doorK1', TG.door([96, 98, 110], [70, 70, 76], [210, 210, 230], 76));
    add('doorK2', TG.door([96, 98, 110], [70, 70, 76], [120, 220, 255], 77));
    add('doorK3', TG.door([96, 98, 110], [70, 70, 76], [255, 120, 40], 78));
    add('socket', TG.panel([96, 90, 110], [255, 200, 80], 79, false));
    add('gate', TX((x, y) => { const bar = (x % 11) < 3; const n = hash2(x, y, 80); return bar ? [110 + n * 30, 110 + n * 30, 124 + n * 30] : ((y % 32) < 3 ? [80, 80, 90] : [12, 12, 16]); }));
    add('swOff', TG.panel([100, 100, 96], [120, 255, 120], 81, false));
    add('swOn', TG.panel([100, 100, 96], [120, 255, 120], 81, true));
    add('pad', TG.glyph([40, 44, 70], [130, 170, 255], 82), { bright: true });
    add('itrim', TG.bricks([140, 160, 184], [70, 80, 100], 32, 8, 83, 0.3));
    add('etrim', TG.bricks([60, 48, 44], [28, 22, 20], 32, 16, 84, 0.7));
    const SKIES = [makeSky([30, 44, 40], [120, 140, 120], [24, 34, 26], 91, false), makeSky([6, 10, 30], [70, 90, 140], [150, 170, 200], 92, true), makeSky([30, 0, 0], [220, 80, 20], [24, 10, 8], 93, false), makeSky([10, 0, 24], [110, 50, 140], [20, 10, 30], 94, true)];
    const i = idx;
    const THEMES = [
      { wall: [i.moss, i.fstone, i.wood, i.moss], floor: [i.grass, i.mud, i.flag], ceil: [i.beams, i.fstone], trim: i.trim, cfloor: i.flag, cceil: i.beams, door: i.door, poly: i.poly, pillar: i.fstone, dais: i.flag, water: i.water, lava: null, pad: i.pad, switchOff: i.swOff, features: ['pillars', 'pool', 'dais', 'column', 'coffer', 'none'] },
      { wall: [i.ice, i.marble, i.fmarble, i.itrim], floor: [i.snow, i.itile, i.marble], ceil: [i.silver, i.fmarble], trim: i.itrim, cfloor: i.itile, cceil: i.silver, door: i.door, poly: i.poly, pillar: i.ice, dais: i.silver, water: i.water, lava: null, pad: i.pad, switchOff: i.swOff, features: ['pillars', 'dais', 'pool', 'column', 'coffer'] },
      { wall: [i.ember, i.basalt, i.etrim, i.obsid], floor: [i.ash, i.basalt], ceil: [i.basalt, i.iron], trim: i.etrim, cfloor: i.ash, cceil: i.basalt, door: i.door, poly: i.poly, pillar: i.obsid, dais: i.iron, water: null, lava: i.lava, pad: i.pad, switchOff: i.swOff, features: ['pit', 'pillars', 'dais', 'pit', 'column'] },
      { wall: [i.obsid], floor: [i.ptile], ceil: [i.gold], trim: i.etrim, cfloor: i.ptile, cceil: i.gold, door: i.door, poly: i.poly, pillar: i.gold, dais: i.gold, water: null, lava: i.lava, pad: i.pad, switchOff: i.swOff, features: [] }
    ];
    return { TEX, idx, SKIES, THEMES };
  }

  // ====================== sprites ======================
  const OUT = [12, 12, 16];
  const dk = (c, k) => sc3(c, k);
  function sprHound(c, f, atk) {
    const s = Spr(40, 28), lo = f & 1 ? 3 : -3;
    for (const [x, d] of [[10, lo], [14, -lo], [26, -lo], [30, lo]]) PT.line(s, x, 16, x + d, 27, dk(c, 0.7), 2);
    PT.ell(s, 20, 15, 12, 6, c);
    for (let k = 0; k < 6; k++) PT.tri(s, 11 + k * 4, 11, 13 + k * 4, 4 + (k & 1) * 2, 15 + k * 4, 11, [150, 130, 80]);
    const hx = atk ? 35 : 33;
    PT.ell(s, hx, 12, 6, 5, dk(c, 1.1)); PT.tri(s, hx + 2, 11, hx + 8, 13, hx + 2, 16, dk(c, 0.9));
    if (atk) { PT.line(s, hx + 2, 15, hx + 7, 15, [240, 230, 200]); PT.ell(s, hx + 3, 16, 3, 1.5, [120, 20, 20], true); }
    PT.dot(s, hx + 1, 10, rgb(255, 200, 40)); PT.line(s, 8, 13, 2, 8 + (f & 1) * 3, dk(c, 0.8), 2);
    return PT.outline(s, OUT);
  }
  function sprHulk(c, f, atk) {
    const s = Spr(42, 54), lo = f === 1 ? 2 : f === 2 ? -2 : 0;
    PT.ell(s, 15, 46 - Math.max(0, lo), 5, 8, dk(c, 0.75)); PT.ell(s, 27, 46 - Math.max(0, -lo), 5, 8, dk(c, 0.75));
    PT.ell(s, 21, 29, 13, 13, c);
    for (let k = 0; k < 7; k++) PT.dot(s, 12 + k * 3, 22 + (k % 3) * 4, rgb(60, 90, 40));
    PT.ell(s, 21, 13, 6, 6, dk(c, 1.05)); PT.dot(s, 19, 12, rgb(255, 230, 120)); PT.dot(s, 23, 12, rgb(255, 230, 120)); PT.line(s, 18, 16, 24, 16, [40, 40, 30]);
    PT.ell(s, 7, 30 + lo, 4.5, 10, c);
    if (atk) { PT.ell(s, 35, 18, 4.5, 9, c); PT.line(s, 36, 12, 40, 0, [110, 80, 50], 4, true); PT.ell(s, 40, 2, 4, 4, [90, 90, 96]); }
    else { PT.ell(s, 35, 30 - lo, 4.5, 10, c); PT.line(s, 36, 38, 40, 52, [110, 80, 50], 4, true); PT.ell(s, 40, 51, 4, 4, [90, 90, 96]); }
    return PT.outline(s, OUT);
  }
  function sprShade(c, f, atk) {
    const s = Spr(32, 44), sw = f & 1 ? 2 : -2;
    PT.tri(s, 16, 6, 3 + sw, 42, 29 + sw, 42, c);
    for (let x = 3; x < 31; x += 3) { const len = 2 + ((x * 7 + f * 5) % 9); for (let y = 43 - len; y < 44; y++) PT.dot(s, x + sw, y, 0); }
    PT.ell(s, 16, 10, 6, 7, dk(c, 1.1));
    PT.ell(s, 16, 11, 4, 4.5, [10, 20, 30], true);
    PT.ell(s, 14.5, 10, 1, 1.3, [200, 255, 255], true); PT.ell(s, 17.5, 10, 1, 1.3, [200, 255, 255], true);
    if (atk) { PT.line(s, 9, 16, 1, 8, c, 3); PT.line(s, 23, 16, 31, 8, c, 3); }
    else { PT.line(s, 9, 18, 5, 28, c, 3); PT.line(s, 23, 18, 27, 28, c, 3); }
    return s;
  }
  function sprDrake(c, f, atk) {
    const s = Spr(40, 30), wy = f & 1 ? 6 : -4;
    PT.tri(s, 16, 13, 2, 2 + wy, 10, 20, dk(c, 0.65)); PT.tri(s, 24, 13, 38, 2 + wy, 30, 20, dk(c, 0.65));
    PT.ell(s, 20, 16, 7, 6, c);
    PT.line(s, 20, 20, 14, 28, dk(c, 0.8), 3); PT.tri(s, 12, 26, 16, 27, 11, 30, dk(c, 0.8));
    PT.ell(s, 20, 8, 4.5, 4, dk(c, 1.1)); PT.line(s, 17, 5, 15, 1, [230, 210, 160]); PT.line(s, 23, 5, 25, 1, [230, 210, 160]);
    PT.dot(s, 18, 8, rgb(255, 240, 80)); PT.dot(s, 22, 8, rgb(255, 240, 80));
    if (atk) PT.ell(s, 20, 11, 2.5, 1.5, [255, 200, 60], true);
    return PT.outline(s, OUT);
  }
  function sprSentinel(c, f, atk, block) {
    const s = Spr(36, 54), lo = f === 1 ? 2 : f === 2 ? -2 : 0;
    PT.ell(s, 14, 46 - Math.max(0, lo), 3.5, 8, dk(c, 0.7)); PT.ell(s, 22, 46 - Math.max(0, -lo), 3.5, 8, dk(c, 0.7));
    PT.ell(s, 18, 29, 9, 11, c);
    PT.ell(s, 18, 12, 5.5, 6.5, dk(c, 1.15)); PT.rect(s, 15, 11, 7, 2, rgb(255, 170, 60));
    PT.tri(s, 13, 7, 18, 0, 23, 7, dk(c, 1.25));
    if (atk) { PT.line(s, 26, 26, 34, 10, [140, 110, 60], 2); PT.ell(s, 34, 8, 3, 3, [210, 230, 255], true); }
    else PT.line(s, 29, 44, 31, 6, [140, 110, 60], 2);
    const sx = block ? 18 : 9;
    PT.ell(s, sx, 30, 8, 10, [150, 120, 50]); PT.ell(s, sx, 30, 5, 7, [120, 40, 40]); PT.ell(s, sx, 30, 2, 2, [230, 210, 120], true);
    return PT.outline(s, OUT);
  }
  function sprSeer(c, glow, f, atk) {
    const s = Spr(34, 56), sw = f === 1 ? 2 : f === 2 ? -2 : 0;
    PT.tri(s, 17, 12, 3 + sw, 55, 31 + sw, 55, c);
    PT.ell(s, 17, 19, 9, 5, dk(c, 1.1));
    for (let k = 0; k < 4; k++) PT.tri(s, 8 + k * 6, 36, 11 + k * 6, 36, 9.5 + k * 6, 46, [220, 240, 255]);
    PT.tri(s, 10, 9, 17, -2, 24, 9, dk(c, 0.8));
    PT.ell(s, 17, 11, 5, 5.5, dk(c, 0.7)); PT.ell(s, 17, 12, 3, 3.5, [10, 20, 40], true);
    PT.dot(s, 16, 12, rgb(...glow)); PT.dot(s, 18, 12, rgb(...glow));
    if (atk) { PT.line(s, 10, 18, 4, 6, c, 3); PT.line(s, 24, 18, 30, 6, c, 3); PT.ell(s, 4, 4, 3.5, 3.5, glow, true); PT.ell(s, 30, 4, 3.5, 3.5, glow, true); }
    else { PT.line(s, 10, 19, 15, 27, c, 3); PT.line(s, 24, 19, 19, 27, c, 3); PT.ell(s, 17, 28, 2.5, 2.5, glow, true); }
    return PT.outline(s, OUT);
  }
  function sprRegent(f, atk) {
    const s = Spr(64, 88), sw = f ? 2 : -2;
    PT.tri(s, 32, 18, 4 + sw, 86, 60 + sw, 86, [60, 30, 90]);
    PT.tri(s, 32, 24, 14, 84, 50, 84, [40, 44, 60]);
    for (let y = 30; y < 80; y += 6) PT.line(s, 22 + (y - 30) * 0.15, y, 42 - (y - 30) * 0.15, y, [80, 90, 120]);
    PT.ell(s, 32, 26, 18, 8, [70, 76, 100]);
    PT.ell(s, 14, 24, 6, 5, [150, 130, 60]); PT.ell(s, 50, 24, 6, 5, [150, 130, 60]);
    PT.ell(s, 32, 13, 8, 9, [40, 44, 60]);
    PT.ell(s, 32, 14, 5, 6, [20, 60, 120], true); PT.ell(s, 32, 14, 3, 4, [120, 220, 255], true);
    for (let k = 0; k < 5; k++) PT.tri(s, 23 + k * 4, 6, 25 + k * 4, -1 - (k === 2 ? 3 : 0), 27 + k * 4, 6, [200, 160, 60]);
    if (atk) { PT.line(s, 16, 28, 6, 10, [60, 66, 90], 6); PT.line(s, 48, 28, 58, 10, [60, 66, 90], 6); PT.ell(s, 6, 7, 6, 6, [140, 220, 255], true); PT.ell(s, 58, 7, 6, 6, [140, 220, 255], true); PT.ell(s, 6, 7, 3, 3, [255, 255, 255], true); PT.ell(s, 58, 7, 3, 3, [255, 255, 255], true); }
    else { PT.line(s, 15, 28, 10 + sw, 52, [60, 66, 90], 6); PT.line(s, 49, 28, 54 + sw, 52, [60, 66, 90], 6); PT.line(s, 54 + sw, 30, 56 + sw, 86, [180, 150, 70], 2); PT.ell(s, 56 + sw, 28, 3, 3, [140, 220, 255], true); }
    return PT.outline(s, OUT);
  }
  function monSet(fn) { const walk = [fn(0, false), fn(1, false), fn(0, false), fn(2, false)]; return { walk, atk: fn(0, true), pain: PT.tint(walk[0], [255, 255, 255], 0.35), die: PT.tint(walk[0], [0, 0, 0], 0.45) }; }
  // items
  function sprVial(c) { const s = Spr(10, 14); PT.rect(s, 4, 0, 2, 4, rgb(190, 210, 220)); PT.ell(s, 5, 9, 4, 4.5, c); PT.dot(s, 3, 7, rgb(255, 255, 255)); return PT.outline(s, OUT); }
  function sprUrn() { const s = Spr(14, 18); PT.ell(s, 7, 11, 6, 6.5, [40, 120, 200]); PT.rect(s, 4, 2, 6, 3, rgb(200, 170, 70)); PT.ell(s, 7, 11, 2, 2, [200, 240, 255], true); return PT.outline(s, OUT); }
  function sprWings() { const s = Spr(20, 12); for (let k = 0; k < 4; k++) { PT.ell(s, 6 - k * 1.3, 3 + k * 2, 5 - k * 0.6, 1.8, [210, 220, 255]); PT.ell(s, 14 + k * 1.3, 3 + k * 2, 5 - k * 0.6, 1.8, [210, 220, 255]); } return PT.outline(s, OUT); }
  function sprRune(c) { const s = Spr(12, 14); PT.ell(s, 6, 7, 5, 6.5, [90, 90, 100]); PT.line(s, 6, 3, 6, 11, c); PT.line(s, 3, 6, 9, 9, c); PT.line(s, 9, 5, 3, 10, c); return PT.outline(s, OUT); }
  function sprDisc() { const s = Spr(14, 14); PT.ell(s, 7, 7, 6, 6, [200, 170, 70]); PT.ell(s, 7, 7, 3, 3, [255, 80, 200], true); return PT.outline(s, OUT); }
  function sprFlech() { const s = Spr(10, 14); PT.ell(s, 5, 9, 4, 4.5, [80, 200, 60]); PT.rect(s, 4, 1, 2, 4, rgb(150, 110, 70)); return PT.outline(s, OUT); }
  function sprTorchI() { const s = Spr(8, 16); PT.rect(s, 3, 6, 2, 10, rgb(110, 70, 40)); PT.ell(s, 4, 4, 3, 4, [255, 140, 30], true); PT.ell(s, 4, 5, 1.5, 2, [255, 240, 160], true); return PT.outline(s, OUT); }
  function sprMana(c, big) { const s = Spr(12, 16); PT.tri(s, 6, 0, 11, 8, 1, 8, c); PT.tri(s, 1, 8, 11, 8, 6, 16, dk(c, 0.7)); if (big) PT.ell(s, 6, 8, 2, 2, [255, 255, 255], true); return s; }
  function sprMana2() { const s = Spr(16, 16); PT.tri(s, 4, 1, 7, 8, 1, 8, [80, 140, 255]); PT.tri(s, 1, 8, 7, 8, 4, 15, [50, 90, 200]); PT.tri(s, 12, 1, 15, 8, 9, 8, [90, 255, 110]); PT.tri(s, 9, 8, 15, 8, 12, 15, [50, 180, 70]); return s; }
  function sprKeyH(c) { const s = Spr(14, 10); PT.ell(s, 3.5, 5, 3, 3, c); PT.ell(s, 3.5, 5, 1.2, 1.2, [0, 0, 0], true); PT.rect(s, 6, 4, 8, 2, rgb(...c)); PT.rect(s, 11, 6, 1, 3, rgb(...c)); PT.rect(s, 13, 6, 1, 2, rgb(...c)); for (let i = 0; i < s.px.length; i++) if (s.px[i] === rgb(0, 0, 0)) s.px[i] = 0; return PT.outline(s, OUT); }
  function sprPuz(h) {
    const s = Spr(14, 14);
    if (h === 0) { PT.ell(s, 7, 7, 6, 6, [200, 80, 30]); PT.line(s, 7, 2, 7, 12, [255, 230, 120]); PT.line(s, 3, 7, 11, 7, [255, 230, 120]); }
    else if (h === 1) { PT.tri(s, 2, 2, 12, 2, 7, 8, [200, 210, 230]); PT.rect(s, 6, 8, 2, 4, rgb(180, 190, 210)); PT.rect(s, 3, 12, 8, 2, rgb(180, 190, 210)); PT.ell(s, 7, 4, 2, 1.2, [120, 200, 255], true); }
    else { PT.ell(s, 7, 7, 6, 6, [60, 160, 70]); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; PT.dot(s, 7 + Math.cos(a) * 6.5, 7 + Math.sin(a) * 6.5, rgb(40, 110, 50)); } PT.ell(s, 7, 7, 2, 2, [20, 50, 20], true); }
    return PT.outline(s, OUT);
  }
  function sprPiece(h) { const s = Spr(12, 16); PT.tri(s, 6, 0, 11, 6, 1, 6, [255, 230, 140]); PT.rect(s, 4, 6, 4, 10, rgb(200, 170, 70)); PT.dot(s, 6, 3 + h, rgb(255, 255, 255)); return PT.outline(s, OUT); }
  function sprArmor(k) {
    const s = Spr(14, 14), m = [170, 176, 190];
    if (k === 0) { PT.ell(s, 7, 7, 6, 6, m); PT.line(s, 7, 2, 7, 12, dk(m, 0.6)); }
    else if (k === 1) { PT.ell(s, 7, 8, 6, 5.5, m); PT.rect(s, 3, 8, 8, 2, rgb(40, 40, 50)); PT.ell(s, 7, 2, 1.5, 2, [200, 50, 50]); }
    else if (k === 2) { PT.line(s, 3, 1, 7, 7, [200, 170, 70]); PT.line(s, 11, 1, 7, 7, [200, 170, 70]); PT.ell(s, 7, 9, 3.5, 4, [80, 200, 255]); }
    else { PT.ell(s, 4, 7, 3, 6, m); PT.ell(s, 10, 7, 3, 6, m); }
    return PT.outline(s, OUT);
  }
  function sprTorchStand(f) { const s = Spr(8, 30); PT.rect(s, 3, 10, 2, 20, rgb(80, 70, 66)); PT.rect(s, 1, 9, 6, 2, rgb(120, 100, 80)); PT.ell(s, 4, 5 + (f ? 1 : 0), 3, 5 - (f ? 1 : 0), [120, 200, 255], true); PT.ell(s, 4, 6, 1.5, 2.5, [230, 250, 255], true); return s; }
  function sprBrazier(f) { const s = Spr(16, 18); PT.ell(s, 8, 10, 7, 3, [90, 84, 80]); PT.rect(s, 7, 12, 2, 6, rgb(70, 66, 60)); PT.rect(s, 4, 16, 8, 2, rgb(70, 66, 60)); PT.ell(s, 8, 5 + f, 5, 5 - f, [255, 120, 20], true); PT.ell(s, 8, 6, 2.5, 3, [255, 230, 120], true); return s; }
  function sprTree() { const s = Spr(30, 48); PT.line(s, 15, 47, 15, 20, [80, 60, 40], 5, true); PT.line(s, 15, 26, 6, 14, [80, 60, 40], 3); PT.line(s, 15, 22, 25, 10, [80, 60, 40], 3); for (const [x, y, r] of [[8, 12, 7], [22, 9, 7], [15, 6, 8], [12, 18, 6], [20, 17, 6]]) PT.ell(s, x, y, r, r * 0.8, [50, 80, 40]); return PT.outline(s, OUT); }
  function sprCrystal() { const s = Spr(12, 24); PT.tri(s, 6, 0, 11, 16, 1, 16, [160, 220, 255]); PT.tri(s, 1, 16, 11, 16, 6, 23, [100, 160, 220]); return s; }
  function sprGlow(c, f) { const s = Spr(16, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) { const d = Math.abs(x - 7.5) / 8, v = (1 - d) * (0.5 + 0.5 * Math.sin(y * 0.6 + f * 2)); if (v > 0.35 && hash2(x, y + f * 40, 3) < v) s.px[y * 16 + x] = rgb(...mix3(c, [255, 255, 255], v * 0.6).map(q => q | 0)); } return s; }
  // class portraits for the selection screen
  function sprHero(k) {
    const s = Spr(40, 64);
    const body = [[120, 120, 132], [110, 40, 40], [50, 60, 130]][k], skin = [220, 180, 140];
    PT.ell(s, 15, 54, 4, 9, dk(body, 0.7)); PT.ell(s, 25, 54, 4, 9, dk(body, 0.7));
    if (k === 0) { PT.ell(s, 20, 34, 11, 13, body); PT.ell(s, 9, 24, 5, 4, [170, 170, 180]); PT.ell(s, 31, 24, 5, 4, [170, 170, 180]); PT.ell(s, 20, 13, 6, 7, [150, 150, 160]); PT.rect(s, 17, 12, 7, 2, rgb(20, 20, 20)); PT.line(s, 33, 46, 37, 12, [110, 80, 50], 2); PT.tri(s, 34, 8, 40, 12, 35, 20, [200, 210, 230]); }
    else if (k === 1) { PT.tri(s, 20, 18, 6, 62, 34, 62, body); PT.ell(s, 20, 24, 10, 6, dk(body, 1.1)); PT.ell(s, 20, 13, 6, 7, dk(body, 0.8)); PT.ell(s, 20, 14, 4, 5, skin); PT.line(s, 20, 30, 20, 60, [200, 170, 70]); PT.line(s, 30, 40, 36, 20, [120, 100, 80], 2); PT.ell(s, 36, 18, 3.5, 3.5, [150, 150, 160]); PT.ell(s, 20, 4, 7, 2, [255, 230, 120], true); }
    else { PT.tri(s, 20, 16, 5, 62, 35, 62, body); PT.ell(s, 20, 24, 9, 5, dk(body, 1.1)); PT.tri(s, 12, 10, 20, -4, 28, 10, dk(body, 0.8)); PT.ell(s, 20, 14, 4, 5, skin); PT.line(s, 14, 18, 26, 18, [230, 230, 240]); PT.line(s, 8, 30, 4, 18, dk(body, 0.9), 3); PT.ell(s, 4, 15, 4, 4, [120, 200, 255], true); PT.ell(s, 4, 15, 2, 2, [255, 255, 255], true); }
    return PT.outline(s, OUT);
  }
  // first-person weapons: class c (0 warden, 1 oracle, 2 arcanist), slot k
  function wSpr(c, k, fire, alt) {
    const s = Spr(120, 80), fy = fire ? -8 : 0;
    const glove = c === 0 ? [140, 140, 150] : c === 1 ? [150, 110, 70] : [70, 80, 150];
    if (c === 0) {
      if (k === 0) { const fx = fire ? (alt ? -14 : 14) : 0; PT.ell(s, 38 + (alt ? fx : 0), 66 + (alt ? fy : 0), 13, 11, glove); PT.ell(s, 82 + (alt ? 0 : fx), 66 + (alt ? 0 : fy), 13, 11, glove); for (const x of [30, 38, 46]) PT.tri(s, x + (alt ? fx : 0), 58 + (alt ? fy : 0), x + 4 + (alt ? fx : 0), 58 + (alt ? fy : 0), x + 2 + (alt ? fx : 0), 50 + (alt ? fy : 0), [220, 220, 230]); for (const x of [74, 82, 90]) PT.tri(s, x + (alt ? 0 : fx), 58 + (alt ? 0 : fy), x + 4 + (alt ? 0 : fx), 58 + (alt ? 0 : fy), x + 2 + (alt ? 0 : fx), 50 + (alt ? 0 : fy), [220, 220, 230]); }
      else if (k === 1) { const ox = fire ? -24 : 0; PT.line(s, 90 + ox, 80, 70 + ox * 1.5, 30 + fy, [110, 76, 46], 6, true); PT.tri(s, 70 + ox * 1.5, 22 + fy, 52 + ox * 1.5, 18 + fy, 58 + ox * 1.5, 44 + fy, [170, 190, 220]); PT.line(s, 60 + ox * 1.5, 26 + fy, 60 + ox * 1.5, 36 + fy, [90, 160, 255], 2); PT.ell(s, 86 + ox, 68, 10, 8, glove); }
      else if (k === 2) { const ox = fire ? -10 : 0; PT.line(s, 84 + ox, 80, 66 + ox, 34 + fy, [110, 76, 46], 7, true); PT.ell(s, 64 + ox, 26 + fy, 15, 10, [120, 120, 130]); PT.ell(s, 64 + ox, 26 + fy, 6, 6, [90, 255, 120], fire); for (let j = 0; j < 4; j++) PT.line(s, 64 + ox, 26 + fy, 64 + ox + Math.cos(j * 1.7) * 18, 26 + fy + Math.sin(j * 1.7) * 12, [160, 255, 170]); PT.ell(s, 82 + ox, 70, 10, 8, glove); }
      else { const ox = fire ? -20 : 0; PT.line(s, 80 + ox, 80, 66 + ox, 60 + fy, [80, 60, 40], 6, true); PT.line(s, 56 + ox - 6, 62 + fy, 76 + ox + 6, 58 + fy, [200, 170, 70], 4); PT.line(s, 66 + ox, 58 + fy, 56 + ox * 1.6, 6 + fy, [230, 240, 255], 7, true); PT.line(s, 66 + ox, 56 + fy, 57 + ox * 1.6, 10 + fy, [255, 255, 220], 2); if (fire) PT.ell(s, 50, 20, 14, 10, [255, 240, 160], true); PT.ell(s, 80 + ox, 72, 10, 8, glove); }
    } else if (c === 1) {
      if (k === 0) { const ox = fire ? -18 : 0; PT.line(s, 88 + ox, 80, 70 + ox * 1.4, 34 + fy, [110, 80, 50], 6, true); PT.ell(s, 68 + ox * 1.4, 28 + fy, 9, 9, [150, 150, 164]); for (let j = 0; j < 6; j++) { const a = j / 6 * TAU; PT.tri(s, 68 + ox * 1.4 + Math.cos(a) * 7, 28 + fy + Math.sin(a) * 7, 68 + ox * 1.4 + Math.cos(a + 0.3) * 7, 28 + fy + Math.sin(a + 0.3) * 7, 68 + ox * 1.4 + Math.cos(a + 0.15) * 13, 28 + fy + Math.sin(a + 0.15) * 13, [190, 190, 200]); } PT.ell(s, 84 + ox, 68, 10, 8, glove); }
      else if (k === 1) { PT.line(s, 82, 80, 64, 24 + fy, [70, 90, 50], 6, true); for (let j = 0; j < 5; j++) PT.line(s, 80 - j * 3.5, 74 - j * 10 + fy * j / 5, 74 - j * 3.5, 70 - j * 10 + fy * j / 5, [120, 160, 70], 2); PT.ell(s, 63, 20 + fy, 6, 6, [110, 255, 90], fire); if (fire) PT.ell(s, 63, 18 + fy, 12, 10, [180, 255, 160], true); PT.ell(s, 80, 70, 10, 8, glove); }
      else if (k === 2) { const sw = fire ? -16 : 0; PT.line(s, 80, 80, 74, 50, [120, 90, 60], 5, true); PT.line(s, 74, 50, 60 + sw, 30 + fy, [160, 160, 170], 1); PT.line(s, 75, 50, 61 + sw, 30 + fy, [160, 160, 170], 1); PT.ell(s, 60 + sw, 34 + fy, 9, 8, [190, 150, 60]); PT.ell(s, 60 + sw, 30 + fy, 5, 4, [255, 140, 30], true); if (fire) PT.ell(s, 60 + sw, 24 + fy, 12, 10, [255, 200, 80], true); PT.ell(s, 80, 72, 10, 8, glove); }
      else { PT.ell(s, 60, 30 + fy, 18, 18, [230, 210, 120]); PT.ell(s, 60, 30 + fy, 13, 13, [0, 0, 0], true); for (let j = 0; j < s.px.length; j++) if (s.px[j] === rgb(0, 0, 0)) s.px[j] = 0; for (let j = 0; j < 4; j++) { const a = j / 4 * TAU + (fire ? 0.6 : 0); PT.ell(s, 60 + Math.cos(a) * 15, 30 + fy + Math.sin(a) * 15, 3, 3, [220, 255, 255], true); } PT.line(s, 60, 48 + fy, 60, 80, [180, 150, 70], 4, true); PT.ell(s, 60, 72, 10, 8, glove); }
    } else {
      if (k === 0) { PT.line(s, 80, 80, 64, 34 + fy, [80, 80, 140], 5, true); PT.ell(s, 63, 30 + fy, 5, 6, [90, 160, 255]); if (fire) PT.ell(s, 62, 26 + fy, 10, 9, [180, 220, 255], true); PT.ell(s, 80, 70, 10, 8, glove); }
      else if (k === 1) { PT.ell(s, 60, 66, 14, 10, glove); for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + (j - 2) * 0.35, r = fire ? 34 : 22; PT.tri(s, 60 + Math.cos(a - 0.08) * 8, 60 + Math.sin(a - 0.08) * 8, 60 + Math.cos(a + 0.08) * 8, 60 + Math.sin(a + 0.08) * 8, 60 + Math.cos(a) * r, 60 + Math.sin(a) * r, [190, 230, 255]); } }
      else if (k === 2) { PT.ell(s, 36, 68, 11, 9, glove); PT.ell(s, 84, 68, 11, 9, glove); let x0 = 40, y0 = 60; for (let j = 1; j <= 8; j++) { const x1 = 40 + j * 5, y1 = 60 - Math.sin(j * 1.9 + (fire ? 1 : 0)) * (fire ? 12 : 5) - (fire ? 10 : 0); PT.line(s, x0, y0, x1, y1, [200, 230, 255], fire ? 2 : 1); x0 = x1; y0 = y1; } }
      else { PT.ell(s, 60, 70, 13, 9, glove); PT.ell(s, 60, 38 + fy, fire ? 13 : 10, fire ? 13 : 10, [255, 220, 120], true); PT.ell(s, 60, 38 + fy, 6, 6, [255, 255, 240], true); for (let j = 0; j < 8; j++) { const a = j / 8 * TAU; PT.dot(s, 60 + Math.cos(a) * 16, 38 + fy + Math.sin(a) * 16, rgb(255, 240, 180)); } }
    }
    return PT.outline(s, [10, 10, 12]);
  }

  ArcadeRegistry.register({
    id: 'hexen', title: 'Hexen: Beyond Heretic', year: 1995, maker: 'Raven Software',
    width: 320, height: 200, vector: false, pointer: false,
    controls: 'Arrows/WASD: move \u00b7 A/D: strafe \u00b7 Space: fire \u00b7 1-4/X: weapon \u00b7 Enter: use item \u00b7 Z/[ ]: pick item \u00b7 PgUp/PgDn or R/F: look \u00b7 C: jump/fly up \u00b7 V: fly down \u00b7 Tab: map',
    marquee: { bg: '#0a0c14', fg: '#a8c8ff', accent: '#d0a040' },
    create(api) {
      const au = api.audio;
      const scr = Screen();
      const TX0 = buildTextures();
      const TEX = TX0.TEX, T = TX0.idx;
      let skyIdx = 0;
      const skyProxy = TX0.SKIES[0].slice();
      const R3 = Renderer(scr, TEX, skyProxy);
      function setSky(e) { if (skyIdx !== e) { skyIdx = e; skyProxy.set(TX0.SKIES[e]); } }

      const BALL = (sz, a, b) => ballSpr(sz, a, b);
      const PD = {
        rod: { speed: 30, dmg: 9, size: 0.18, spr: BALL(8, [220, 240, 255], [60, 120, 255]), boom: burstSpr(10, [220, 240, 255], [60, 120, 255], 1), boomSize: 0.3, boomLife: 0.15 },
        frost: { speed: 22, dmg: 9, size: 0.18, life: 0.45, spr: BALL(8, [240, 250, 255], [150, 210, 255]), boom: burstSpr(10, [240, 250, 255], [140, 200, 255], 2), boomSize: 0.3 },
        arc: { speed: 34, dmg: 26, size: 0.3, rip: true, life: 1.0, spr: burstSpr(12, [255, 255, 255], [120, 180, 255], 3), trail: BALL(6, [200, 230, 255], [80, 120, 255]), boom: burstSpr(14, [230, 240, 255], [100, 140, 255], 4), boomSize: 0.5, ripFx: burstSpr(10, [255, 255, 255], [120, 180, 255], 5) },
        star: { speed: 12, dmg: 120, size: 0.6, splash: 2.2, splashDmg: 120, spr: BALL(18, [255, 255, 230], [255, 180, 60]), trail: BALL(8, [255, 230, 160], [220, 120, 20]), boom: burstSpr(26, [255, 255, 220], [255, 150, 40], 6), boomSize: 2.2, boomLife: 0.5 },
        hatch: { speed: 16, dmg: 18, size: 0.32, life: 0.35, rip: true, spr: burstSpr(14, [200, 230, 255], [60, 120, 255], 7), boom: burstSpr(12, [200, 230, 255], [60, 120, 255], 8), boomSize: 0.4 },
        maul: { speed: 16, dmg: 60, size: 0.42, splash: 1.0, splashDmg: 30, anim: [0, 1, 2, 3].map(k => { const s = Spr(14, 14); const a = k * Math.PI / 2; PT.line(s, 7 - Math.cos(a) * 6, 7 - Math.sin(a) * 6, 7 + Math.cos(a) * 3, 7 + Math.sin(a) * 3, [130, 90, 50], 2); PT.ell(s, 7 + Math.cos(a) * 4, 7 + Math.sin(a) * 4, 3.5, 3.5, [170, 170, 190]); return s; }), boom: burstSpr(18, [220, 255, 220], [80, 220, 100], 9), boomSize: 0.9 },
        blade: { speed: 20, dmg: 40, size: 0.5, rip: true, life: 0.9, spr: burstSpr(16, [255, 255, 220], [255, 200, 60], 10), boom: burstSpr(16, [255, 255, 220], [255, 200, 60], 11), boomSize: 0.6, ripFx: burstSpr(12, [255, 255, 200], [255, 190, 50], 12) },
        venom: { speed: 20, dmg: 11, size: 0.22, spr: BALL(10, [220, 255, 200], [70, 200, 40]), boom: burstSpr(12, [210, 255, 190], [60, 180, 30], 13), boomSize: 0.4 },
        pyre: { speed: 16, dmg: 25, size: 0.36, splash: 1.4, splashDmg: 55, spr: BALL(14, [255, 240, 180], [255, 100, 20]), trail: BALL(8, [255, 180, 60], [200, 50, 0]), boom: burstSpr(22, [255, 240, 180], [255, 90, 10], 14), boomSize: 1.5, boomLife: 0.5 },
        spirit: { speed: 9, dmg: 20, size: 0.32, seek: 4, life: 5, spr: BALL(12, [255, 255, 255], [160, 240, 255]), trail: BALL(6, [220, 250, 255], [120, 200, 255]), boom: burstSpr(14, [255, 255, 255], [140, 220, 255], 15), boomSize: 0.5 },
        flech: { speed: 7, dmg: 30, size: 0.3, grav: 6, bounce: 2, life: 1.4, expire: true, splash: 2.0, splashDmg: 90, spr: sprFlech(), boom: burstSpr(22, [200, 255, 150], [60, 180, 40], 16), boomSize: 1.8, splashHurtsPlayer: false },
        mfire: { speed: 11, dmg: 9, size: 0.3, spr: BALL(12, [255, 240, 160], [230, 80, 10]), boom: burstSpr(14, [255, 220, 120], [220, 70, 0], 17), boomSize: 0.5 },
        disc: { speed: 13, dmg: 12, size: 0.3, spr: BALL(10, [255, 230, 180], [200, 150, 60]), boom: burstSpr(12, [255, 220, 160], [200, 140, 50], 18), boomSize: 0.4 },
        ice: { speed: 14, dmg: 9, size: 0.26, spr: BALL(10, [240, 250, 255], [120, 190, 255]), boom: burstSpr(12, [240, 250, 255], [120, 180, 255], 19), boomSize: 0.4 },
        wraith: { speed: 7, dmg: 14, size: 0.4, seek: 2.0, life: 6, spr: BALL(14, [220, 240, 255], [40, 60, 140]), boom: burstSpr(16, [200, 230, 255], [50, 70, 160], 20), boomSize: 0.7 },
        bfrost: { speed: 13, dmg: 16, size: 0.45, splash: 1.0, splashDmg: 16, spr: BALL(14, [255, 255, 255], [100, 180, 255]), trail: BALL(6, [220, 240, 255], [100, 160, 255]), boom: burstSpr(18, [240, 250, 255], [100, 170, 255], 21), boomSize: 1.0 }
      };
      PD.maul.spr = PD.maul.anim[0];
      const SM = {
        hound: monSet((f, a) => sprHound([96, 108, 62], f, a)),
        hulk: monSet((f, a) => sprHulk([84, 104, 78], f, a)),
        shade: monSet((f, a) => sprShade([170, 210, 230], f, a)),
        drake: monSet((f, a) => sprDrake([184, 64, 42], f, a)),
        sentinel: monSet((f, a) => sprSentinel([112, 122, 142], f, a, false)),
        seer: monSet((f, a) => sprSeer([140, 180, 220], [180, 240, 255], f, a)),
        regent: { walk: [sprRegent(0, false), sprRegent(1, false)], atk: sprRegent(0, true) }
      };
      SM.sentinel.block = sprSentinel([112, 122, 142], 0, false, true);
      SM.regent.pain = PT.tint(SM.regent.walk[0], [255, 255, 255], 0.3); SM.regent.die = PT.tint(SM.regent.walk[0], [0, 0, 0], 0.4);
      const MON = {
        hound: { name: 'BRIAR HOUND', hp: 60, spd: 4.2, r: 0.32, h: 0.7, sw: 1.15, sh: 0.8, melee: 8, mrange: 0.45, mwind: 0.2, mcd: 0.7, pain: 0.5, score: 120, spr: SM.hound, animRate: 8, snd: 'growl' },
        hulk: { name: 'MARSH HULK', hp: 175, spd: 2.2, r: 0.42, h: 1.4, sw: 1.2, sh: 1.55, melee: 20, mrange: 0.6, mwind: 0.45, mcd: 1.2, pain: 0.3, score: 350, spr: SM.hulk, snd: 'roar' },
        shade: { name: 'STORM SHADE', hp: 90, spd: 3.0, r: 0.3, h: 1.0, sw: 0.95, sh: 1.25, fly: true, hover: 0.2, ghost: true, melee: 10, mrange: 0.5, mwind: 0.25, mcd: 0.9, pain: 0.5, score: 250, spr: SM.shade, snd: 'wail' },
        drake: { name: 'EMBER DRAKE', hp: 120, spd: 2.8, r: 0.35, h: 0.8, sw: 1.15, sh: 0.9, fly: true, hover: 0.8, melee: 8, mcd: 1.0, pain: 0.4, score: 300, spr: SM.drake, animRate: 7, ranged: { proj: PD.mfire, cd: 1.8, wind: 0.4, chance: 0.6, range: 18 }, snd: 'shriek' },
        sentinel: { name: 'GRAVE SENTINEL', hp: 250, spd: 1.9, r: 0.36, h: 1.3, sw: 1.05, sh: 1.6, melee: 15, mrange: 0.5, mcd: 1.1, pain: 0.25, score: 500, spr: SM.sentinel, ranged: { proj: PD.disc, cd: 1.6, wind: 0.45, chance: 0.6, range: 20, n: 2, spread: 0.1 }, think: blockThink, shield: blockShield, snd: 'clank' },
        seer: { name: 'RIME SEER', hp: 220, spd: 1.6, r: 0.35, h: 1.4, sw: 1.05, sh: 1.75, pain: 0.25, score: 600, spr: SM.seer, atkBright: true, ranged: { proj: PD.ice, cd: 2.2, wind: 0.55, chance: 0.6, range: 22, n: 3, spread: 0.14 }, think: blinkThink, snd: 'hiss' },
        regent: { name: 'THE HOLLOW REGENT', hp: 4200, spd: 1.4, r: 0.7, h: 2.4, sw: 2.2, sh: 3.0, fly: true, hover: 0.15, pain: 0.03, score: 30000, spr: SM.regent, boss: true, atkBright: true, ranged: { proj: PD.bfrost, cd: 1.3, wind: 0.55, chance: 1.5, range: 40 }, attack: bossAttack, think: bossThink, corpse: 4, snd: 'roar' }
      };
      function blockThink(G, m, dt, dist) {
        if (m.blockT > 0) { m.blockT -= dt; m.ang = Math.atan2(P.y - m.y, P.x - m.x); return true; }
        if (m.st === 1 && m.seeP && dist < 10 && G.R() < dt * 0.35) { m.blockT = 1.4; return true; }
        return false;
      }
      function blockShield(G, m, dmg, src) {
        if (m.blockT > 0 && src === P) { addFx(G, m.x - Math.cos(m.ang) * -0.3, m.y + Math.sin(m.ang) * 0.3, m.z + 0.8, PD.disc.boom, 0.5, 0.2); sfx('clank', m); return true; }
        return false;
      }
      function blinkThink(G, m, dt) {
        if (m.st === 1 && G.R() < dt * 0.22) {
          for (let t = 0; t < 10; t++) {
            const a = G.R() * TAU, d = 2 + G.R() * 3, nx = m.x + Math.cos(a) * d, ny = m.y + Math.sin(a) * d;
            if (areaBlocked(G.M, nx, ny, m.r, floorAt(G.M, nx, ny, m.r), m.h, 0.45) === -1 && los(G.M, m.x, m.y, m.z + 1, nx, ny, m.z + 1)) {
              addFx(G, m.x, m.y, m.z + 0.8, PD.ice.boom, 1.0, 0.4); m.x = nx; m.y = ny; m.z = floorAt(G.M, nx, ny, m.r); sfx('blink'); break;
            }
          }
        }
        return false;
      }
      function bossThink(G, m, dt) {
        m.summon = (m.summon || 7) - dt;
        if (m.summon <= 0 && m.st === 1) {
          m.summon = 10 - (m.hp < m.maxhp / 2 ? 3 : 0);
          let n = 0; for (const o of G.mons) if (!o.dead && !o.def.boss) n++;
          if (n < 6) for (let k = 0; k < 2; k++) { const a = G.R() * TAU; const mm = spawnMon(G, G.R() < 0.6 ? 'shade' : 'hound', m.x + Math.cos(a) * 1.8, m.y + Math.sin(a) * 1.8); if (mm) { mm.st = 1; addFx(G, mm.x, mm.y, mm.z + 0.4, PD.wraith.boom, 1, 0.4); } }
          sfx('roar');
        }
        m.tele = (m.tele || 12) - dt;
        if (m.tele <= 0 && m.st === 1) {
          m.tele = 9 + G.R() * 6;
          for (let t = 0; t < 12; t++) { const nx = 5 + G.R() * 20, ny = 5 + G.R() * 18; if (areaBlocked(G.M, nx, ny, m.r, 3, 0.5, 9) === -1) { addFx(G, m.x, m.y, m.z + 1, PD.wraith.boom, 2, 0.5); m.x = nx; m.y = ny; sfx('blink'); break; } }
        }
        return false;
      }
      function bossAttack(G, m) {
        const r = G.R(), enr = m.hp < m.maxhp / 2;
        if (r < 0.45) monShoot(G, m, PD.bfrost, enr ? 5 : 3, 0.2);
        else if (r < 0.8) monShoot(G, m, PD.wraith, enr ? 3 : 2, 0.6, { target: P });
        else { for (let k = 0; k < 14; k++) spawnProj(G, PD.ice, m.x, m.y, m.z + 1.2, k / 14 * TAU + m.anim, 0, m); sfx('mshoot'); }
      }

      // classes and weapons
      const CLASSES = [
        { name: 'WARDEN', desc: ['IRON-CLAD', 'SWORN BLADE.', 'FAST, TOUGH,', 'DEADLY CLOSE.'], hp: 100, ac: 15, spd: 1.12, armorVal: [25, 20, 15, 10], color: [170, 170, 190], wpn: ['IRON KNUCKLES', 'RUNE HATCHET', 'STORM MAUL', 'DAWNBLADE'] },
        { name: 'ORACLE', desc: ['PRIESTESS OF', 'THE GREY FLAME', 'WHO HEALS AS', 'SHE SMITES.'], hp: 100, ac: 10, spd: 1.0, armorVal: [10, 25, 20, 15], color: [200, 80, 70], wpn: ['IRON MACE', 'VENOM STAFF', 'PYRE CENSER', 'SPIRIT HALO'] },
        { name: 'ARCANIST', desc: ['SCHOLAR OF', 'THE STORM.', 'FRAIL, BUT', 'STRIKES FAR.'], hp: 90, ac: 5, spd: 0.92, armorVal: [5, 15, 25, 20], color: [100, 140, 255], wpn: ['SAPPHIRE ROD', 'FROST FAN', 'ARC LIGHTNING', 'STARFALL ORB'] }
      ];
      // mana cost [blue, green] and fire rate per class/slot
      const WDEF = [
        [{ cost: [0, 0], rate: 0.45 }, { cost: [2, 0], rate: 0.6 }, { cost: [0, 3], rate: 0.75 }, { cost: [14, 14], rate: 0.8 }],
        [{ cost: [0, 0], rate: 0.55 }, { cost: [1, 0], rate: 0.35 }, { cost: [0, 4], rate: 0.85 }, { cost: [12, 12], rate: 1.0 }],
        [{ cost: [0, 0], rate: 0.28 }, { cost: [3, 0], rate: 0.6 }, { cost: [0, 5], rate: 0.45 }, { cost: [15, 15], rate: 1.1 }]
      ];
      const WS = [0, 1, 2].map(c => [0, 1, 2, 3].map(k => [wSpr(c, k, false, false), wSpr(c, k, true, false), wSpr(c, k, true, true)]));
      const HERO = [0, 1, 2].map(sprHero);
      const ITEMS = {
        vial: { spr: sprVial([220, 40, 50]), w: 0.3, h: 0.42, float: true, art: true, name: 'CRYSTAL VIAL' },
        urn: { spr: sprUrn(), w: 0.4, h: 0.52, float: true, art: true, name: 'MYSTIC URN' },
        wings: { spr: sprWings(), w: 0.55, h: 0.33, float: true, art: true, name: 'WINGS OF THE SKY' },
        shield: { spr: sprRune([255, 220, 80]), w: 0.32, h: 0.38, float: true, art: true, name: 'SHIELD RUNE' },
        disc: { spr: sprDisc(), w: 0.36, h: 0.36, float: true, art: true, name: 'DISC OF REPULSION' },
        flech: { spr: sprFlech(), w: 0.28, h: 0.4, float: true, art: true, name: 'BLIGHT FLASK' },
        torch: { spr: sprTorchI(), w: 0.22, h: 0.45, float: true, art: true, name: 'EVERBURNING TORCH' },
        manaB: { spr: sprMana([80, 140, 255]), w: 0.3, h: 0.4, float: true, bright: true, mana: [15, 0], name: 'BLUE MANA' },
        manaG: { spr: sprMana([90, 255, 110]), w: 0.3, h: 0.4, float: true, bright: true, mana: [0, 15], name: 'GREEN MANA' },
        manaC: { spr: sprMana2(), w: 0.38, h: 0.38, float: true, bright: true, mana: [20, 20], name: 'COMBINED MANA' },
        arm0: { spr: sprArmor(0), w: 0.4, h: 0.4, armor: 0, name: 'MESH CUIRASS' },
        arm1: { spr: sprArmor(1), w: 0.4, h: 0.4, armor: 1, name: 'BRONZE HELM' },
        arm2: { spr: sprArmor(2), w: 0.4, h: 0.4, armor: 2, name: 'WARDING AMULET' },
        arm3: { spr: sprArmor(3), w: 0.4, h: 0.4, armor: 3, name: 'FALCON BRACERS' },
        key0: { spr: sprKeyH([210, 210, 230]), w: 0.4, h: 0.3, float: true, bright: true, key: 'k0', name: 'STEEL KEY' },
        key1: { spr: sprKeyH([120, 220, 255]), w: 0.4, h: 0.3, float: true, bright: true, key: 'k1', name: 'FROST KEY' },
        key2: { spr: sprKeyH([255, 130, 50]), w: 0.4, h: 0.3, float: true, bright: true, key: 'k2', name: 'FIRE KEY' },
        puz0: { spr: sprPuz(0), w: 0.36, h: 0.36, float: true, bright: true, puzzle: 'p0', name: 'EMBER SIGIL' },
        puz1: { spr: sprPuz(1), w: 0.36, h: 0.36, float: true, bright: true, puzzle: 'p1', name: 'MOON CHALICE' },
        puz2: { spr: sprPuz(2), w: 0.36, h: 0.36, float: true, bright: true, puzzle: 'p2', name: 'VERDANT GEAR' },
        piece0: { spr: sprPiece(0), w: 0.3, h: 0.45, float: true, bright: true, piece: 0, name: 'FIRST FRAGMENT' },
        piece1: { spr: sprPiece(1), w: 0.3, h: 0.45, float: true, bright: true, piece: 1, name: 'SECOND FRAGMENT' },
        piece2: { spr: sprPiece(2), w: 0.3, h: 0.45, float: true, bright: true, piece: 2, name: 'THIRD FRAGMENT' },
        wpn1: { spr: null, w: 0.55, h: 0.38, weapon: 1, name: '' },
        wpn2: { spr: null, w: 0.55, h: 0.38, weapon: 2, name: '' }
      };
      const DECO = {
        torch: { anim: [sprTorchStand(0), sprTorchStand(1)], w: 0.25, h: 0.95, bright: true },
        brazier: { anim: [sprBrazier(0), sprBrazier(1)], w: 0.55, h: 0.6, bright: true, block: true },
        tree: { spr: sprTree(), w: 1.2, h: 1.9, block: true },
        crystal: { spr: sprCrystal(), w: 0.4, h: 0.8, bright: true },
        portalglow: { anim: [0, 1, 2, 3].map(f => sprGlow([140, 170, 255], f)), w: 0.6, h: 1.4, bright: true },
        exitglow: { anim: [0, 1, 2, 3].map(f => sprGlow([255, 220, 120], f)), w: 0.6, h: 1.4, bright: true }
      };
      ITEMS.wpn1.spr = icon(0, 1); ITEMS.wpn2.spr = icon(0, 2);
      const ARTS = ['vial', 'urn', 'wings', 'shield', 'disc', 'flech', 'torch'];
      const HUBS = [
        { name: 'THE WEEPING MARCHES', maps: { A: 'THE MOSSGATE', B: 'BRIARWOOD KEEP', C: 'THE DROWNING SHRINE' }, dens: 0.5, mons: ['hound', 'hulk', 'shade', 'drake'], deco: ['tree', 'torch', 'torch'] },
        { name: 'THE FROSTBOUND SPIRES', maps: { A: 'RIME COURT', B: 'THE GLASS STAIR', C: 'ORRERY OF WINTER' }, dens: 0.65, mons: ['shade', 'hound', 'seer', 'sentinel', 'hulk'], deco: ['crystal', 'torch'] },
        { name: 'THE CINDER DEEP', maps: { A: 'ASHFALL GATE', B: 'THE SMELTERS', C: 'FURNACE OF VOICES' }, dens: 0.8, mons: ['drake', 'hulk', 'sentinel', 'seer', 'shade'], deco: ['brazier', 'torch'] },
        { name: 'THRONE OF THE HOLLOW REGENT', arena: true }
      ];
      const STORY = [
        'THE HOLLOW REGENT HAS SEALED', 'THE REALM OF VAELOR BEHIND', 'THREE WARDS OF SIGIL AND STONE.', '',
        'WANDER THE HUBS. PULL THE', 'ANCIENT LEVERS. CARRY EACH', 'RELIC TO ITS SOCKET AND THE', 'WAY BEYOND WILL OPEN.'
      ];

      // ---------- maps ----------
      function lootFor(h) {
        return (R) => {
          const r = R();
          if (r < 0.28) return 'manaB';
          if (r < 0.48) return h >= 1 || R() < 0.5 ? 'manaG' : 'manaB';
          if (r < 0.56) return 'manaC';
          if (r < 0.7) return 'vial';
          if (r < 0.76) return 'arm' + R.int(4);
          if (r < 0.8) return R.pick(['flech', 'disc', 'torch', 'shield', 'wings']);
          return 'manaB';
        };
      }
      function buildMap(h, key) {
        const HB = HUBS[h], th = TX0.THEMES[h];
        setSky(h);
        if (HB.arena) {
          const M = genArena(5150, th, 0.85);
          M.things.push({ t: 'mon', kind: 'regent', x: 15, y: 7 });
          for (const [x, y, k] of [[5.5, 5.5, 'manaC'], [24.5, 5.5, 'manaC'], [5.5, 22.5, 'manaB'], [24.5, 22.5, 'manaG'], [6.5, 6.5, 'vial'], [23.5, 21.5, 'vial'], [14.5, 29.5, 'urn'], [15.5, 29.5, 'manaC'], [13.5, 28.5, 'shield'], [16.5, 28.5, 'arm0'], [5.5, 13.5, 'manaC'], [24.5, 14.5, 'vial']]) M.things.push({ t: 'item', kind: k, x, y });
          for (const [x, y] of [[3.5, 3.5], [26.5, 3.5], [3.5, 24.5], [26.5, 24.5]]) M.things.push({ t: 'deco', kind: 'brazier', x, y });
          M.portals = [];
          return M;
        }
        const flag = 'sw' + h;
        let gates, zi;
        if (key === 'A') { gates = [{ item: 'p' + h, tex: T.socket, name: ITEMS['puz' + h].name }]; zi = [[{ t: 'portal', to: 'B' }, { t: 'portal', to: 'C' }, { t: 'item', kind: 'arm' + h }], [{ t: 'portal', to: 'NEXT' }, { t: 'item', kind: 'urn' }]]; }
        else if (key === 'B') { gates = [{ key: 'k' + h, tex: T['doorK' + (h + 1)], name: ITEMS['key' + h].name }]; zi = [[{ t: 'portal', to: 'A' }, { t: 'item', kind: 'key' + h }, ...(h < 2 ? [{ t: 'item', kind: 'wpn' + (h + 1) }] : [{ t: 'item', kind: 'manaC' }])], [{ t: 'switch', flag, msg: 'A DISTANT GATE GRINDS OPEN' }, { t: 'item', kind: 'piece' + h }]]; }
        else { gates = [{ flag, tex: T.gate, name: 'GATE' }]; zi = [[{ t: 'portal', to: 'A' }, { t: 'item', kind: 'wings' }], [{ t: 'item', kind: 'puz' + h }, { t: 'item', kind: 'shield' }]]; }
        const mons = HB.mons;
        const M = genMap(4000 + h * 101 + key.charCodeAt(0) * 7, {
          w: 40 + h * 2, h: 40 + h * 2, rooms: 9 + h, maxRoom: 10, theme: th, gates, zoneItems: zi,
          monDensity: HB.dens, poly: true, doorChance: 0.6, outdoor: h === 0 ? 0.45 : h === 1 ? 0.3 : 0.25, secrets: 1,
          pickMon: (R, zone) => mons[R.int(Math.min(mons.length, 2 + zone + (R() < 0.35 ? 1 : 0)))],
          pickLoot: lootFor(h), secretLoot: R => R.pick(['urn', 'shield', 'wings', 'manaC', 'flech', 'disc']),
          deco: R => R.pick(HB.deco)
        });
        if (flags[flag]) for (const d of M.doors) if (d.req && d.req.flag === flag) { d.state = 1; d.stay = true; }
        return M;
      }

      // ---------- sound ----------
      const SFX = {
        punch() { au.noise(0.08, { vol: 0.12, freq: 900, slideTo: 300 }); },
        hit() { au.tone(110, 0.08, { type: 'square', vol: 0.15 }); au.noise(0.08, { vol: 0.15, freq: 1500 }); },
        swing() { au.noise(0.12, { vol: 0.08, freq: 2400, slideTo: 600 }); },
        zap() { au.tone(1300, 0.08, { type: 'square', vol: 0.06, slideTo: 500 }); },
        frost() { au.noise(0.2, { vol: 0.1, freq: 6000, type: 'highpass' }); au.tone(1800, 0.12, { type: 'sine', vol: 0.06, slideTo: 900 }); },
        arc() { au.noise(0.25, { vol: 0.12, freq: 3000, type: 'bandpass' }); au.tone(80, 0.2, { type: 'sawtooth', vol: 0.08 }); },
        star() { au.tone(200, 0.6, { type: 'sine', vol: 0.15, slideTo: 800 }); au.noise(0.4, { vol: 0.1, freq: 2000 }); },
        maul() { au.tone(150, 0.2, { type: 'sawtooth', vol: 0.1, slideTo: 70 }); },
        venom() { au.tone(500, 0.1, { type: 'triangle', vol: 0.08, slideTo: 250 }); },
        pyre() { au.noise(0.35, { vol: 0.16, freq: 1200, slideTo: 200 }); },
        holy() { au.melody([[880, 0.06], [1109, 0.06], [1319, 0.1]], { type: 'sine', vol: 0.1 }); },
        phit() { au.noise(0.12, { vol: 0.1, freq: 1800, slideTo: 400 }); },
        boom() { au.noise(0.5, { vol: 0.22, freq: 900, slideTo: 80 }); },
        bounce() { au.tone(400, 0.04, { type: 'square', vol: 0.05 }); },
        door() { au.noise(0.5, { vol: 0.1, freq: 400, slideTo: 150 }); au.tone(60, 0.5, { type: 'sawtooth', vol: 0.06 }); },
        locked() { au.tone(120, 0.15, { type: 'square', vol: 0.12 }); au.tone(90, 0.2, { type: 'square', vol: 0.12, delay: 0.12 }); },
        item() { au.tone(660, 0.06, { type: 'triangle', vol: 0.12 }); au.tone(990, 0.08, { type: 'triangle', vol: 0.12, delay: 0.05 }); },
        art() { au.melody([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.12]], { type: 'triangle', vol: 0.14 }); },
        wpn() { au.melody([[330, 0.08], [440, 0.08], [554, 0.08], [659, 0.2]], { type: 'square', vol: 0.12 }); },
        key() { au.melody([[784, 0.08], [1047, 0.08], [1568, 0.16]], { type: 'triangle', vol: 0.16 }); },
        puzzle() { au.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]], { type: 'triangle', vol: 0.15 }); },
        secret() { au.melody([[440, 0.12], [554, 0.12], [659, 0.12], [880, 0.3]], { type: 'triangle', vol: 0.15 }); },
        lever() { au.noise(0.3, { vol: 0.15, freq: 500 }); au.tone(200, 0.3, { type: 'square', vol: 0.08, slideTo: 100 }); au.melody([[262, 0.2], [196, 0.4]], { type: 'triangle', vol: 0.1, delay: 0.3 }); },
        pain() { au.tone(180, 0.15, { type: 'sawtooth', vol: 0.14, slideTo: 110 }); },
        die() { au.tone(260, 0.9, { type: 'sawtooth', vol: 0.16, slideTo: 50 }); },
        growl() { au.tone(110, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 80 }); },
        roar() { au.tone(70, 0.5, { type: 'sawtooth', vol: 0.14, slideTo: 40 }); au.noise(0.4, { vol: 0.1, freq: 400 }); },
        wail() { au.tone(600, 0.6, { type: 'sine', vol: 0.06, slideTo: 300 }); },
        shriek() { au.tone(1400, 0.18, { type: 'sawtooth', vol: 0.06, slideTo: 700 }); },
        clank() { au.noise(0.1, { vol: 0.1, freq: 4000 }); au.tone(300, 0.1, { type: 'square', vol: 0.05 }); },
        hiss() { au.noise(0.3, { vol: 0.08, freq: 5000, type: 'highpass' }); },
        mpain() { au.tone(240, 0.1, { type: 'square', vol: 0.07, slideTo: 160 }); },
        mdie() { au.tone(300, 0.4, { type: 'sawtooth', vol: 0.1, slideTo: 60 }); au.noise(0.3, { vol: 0.08, freq: 700, slideTo: 100 }); },
        mshoot() { au.tone(300, 0.15, { type: 'sawtooth', vol: 0.07, slideTo: 600 }); },
        melee() { au.noise(0.1, { vol: 0.14, freq: 800 }); },
        blink() { au.tone(1600, 0.2, { type: 'sine', vol: 0.08, slideTo: 200 }); },
        thud() { au.noise(0.2, { vol: 0.2, freq: 300 }); },
        portal() { au.tone(150, 0.8, { type: 'sine', vol: 0.15, slideTo: 1200 }); au.tone(225, 0.8, { type: 'triangle', vol: 0.1, slideTo: 1800 }); },
        lava() { au.noise(0.15, { vol: 0.08, freq: 600 }); },
        jump() { au.tone(220, 0.1, { type: 'triangle', vol: 0.06, slideTo: 330 }); },
        clear() { au.melody([[330, 0.12], [392, 0.12], [494, 0.12], [659, 0.12], [587, 0.12], [659, 0.4]], { type: 'square', vol: 0.12 }); },
        coin() { au.tone(70, 0.25, { type: 'square', vol: 0.2 }); },
        start() { au.melody([[220, 0.1], [262, 0.1], [330, 0.1], [440, 0.3]], { type: 'square', vol: 0.14 }); },
        oneup() { au.melody([[784, 0.08], [988, 0.08], [1319, 0.2]], { type: 'square', vol: 0.14 }); },
        sel() { au.tone(500, 0.05, { type: 'square', vol: 0.1 }); }
      };
      const sndGate = {};
      function sfx(n, src) {
        const f = SFX[n]; if (!f) return;
        if (src && src.x != null && P && n !== 'die') { const d = Math.hypot(src.x - P.x, src.y - P.y); if (d > 16) return; }
        const now = api.time; if (sndGate[n] && now - sndGate[n] < 0.05) return; sndGate[n] = now;
        f();
      }
      const MEL = [[57, 0], [60, 1], [57, 0], [64, 2], [62, 0], [60, 1], [59, 0], [55, 2], [57, 0], [64, 1], [65, 0], [64, 2]];
      let musT = 0, musI = 0;
      function music(dt) {
        musT -= dt; if (musT > 0) return; musT = 0.48;
        const [n, a] = MEL[musI % MEL.length]; musI++;
        const f = 440 * Math.pow(2, (n - 69) / 12);
        au.tone(f / 4, 0.44, { type: 'triangle', vol: 0.05 });
        if (a === 1) au.tone(f, 0.4, { type: 'sine', vol: 0.04 });
        if (a === 2) au.tone(f * 2, 0.6, { type: 'triangle', vol: 0.03 });
      }

      // ---------- state ----------
      let mode = 'attract', attractT = 0, coinFlash = 0, selCls = 0, selT = 0;
      let hub = 0, mapKey = 'A', hubMaps = {}, M = null, G = null, P = null, flags = {}, score = 0, lives = 3, nextLife = 30000;
      let hi = api.getHiScore(25000);
      let interT = 0, interMsg = null, endT = 0, god = false, mapOn = false, invShow = 0, flash = { r: 0, g: 0, b: 0 }, demo = null;
      let barBg = null, interBg = null, lastCell = -1, arrival = null;
      const sprBuf = [];

      function newPlayer(c) {
        const C = CLASSES[c];
        return {
          cls: c, x: 0, y: 0, z: 0, vz: 0, vx: 0, vy: 0, ang: 0, pitch: 0, viewOff: 0, bob: 0, turnV: 0, onGround: true,
          hp: C.hp, armor: [0, 0, 0, 0], weapons: [true, false, false, false], pieces: [false, false, false], mana: [50, 0],
          cur: 0, want: 0, wy: 40, cool: 0, fireT: 0, alt: false, inv: { vial: 1 }, sel: 'vial', keys: {}, puzzle: {}, wings: 0, shield: 0, torch: 0,
          dead: false, deadT: 0, msg: '', msgT: 0, hurtT: 0, lavaT: 0, lookT: 9, lockT: 0, jumpT: 0
        };
      }
      function msg(s) { if (P) { P.msg = s; P.msgT = 3; } }
      function addScore(n) {
        score += n;
        while (score >= nextLife) { lives++; nextLife += 30000; sfx('oneup'); msg('EXTRA LIFE!'); }
        if (score > hi) hi = score;
      }
      function ac() { const C = CLASSES[P.cls]; let a = C.ac; for (let k = 0; k < 4; k++) a += P.armor[k]; return a; }
      function enterMap(h, key, fromKey) {
        hub = h; mapKey = key;
        const id = h + key;
        if (!hubMaps[id]) {
          const Mx = buildMap(h, key);
          const cfg = { mon: MON, items: ITEMS, deco: DECO, onItem, onKill, hurtPlayer, sfx: (n2, src) => { if (n2 === 'sight' && src && src.def) sfx(src.def.snd, src); else if (n2 === 'pain') sfx('mpain', src); else if (n2 === 'phit') sfx(src && src.def && src.def.splash ? 'boom' : 'phit', src); else sfx(n2, src); } };
          hubMaps[id] = { M: Mx, G: World(Mx, cfg, P) };
        }
        M = hubMaps[id].M; G = hubMaps[id].G; G.P = P;
        setSky(h);
        let sx = M.start.x, sy = M.start.y, sa = M.start.ang;
        const back = fromKey && M.portals.find(p => p.to === fromKey);
        if (back) {
          const w = M.w;
          let best = null;
          for (const j of [back.i + 1, back.i - 1, back.i + w, back.i - w]) {
            if (M.solid[j] || M.special[j]) continue;
            const j2 = j + (j - back.i), far = !M.solid[j2] && !M.special[j2] && Math.abs(M.fh[j2] - M.fh[j]) < 0.3;
            if (!best || (far && !best.far)) best = { j: far ? j2 : j, far };
          }
          if (best) { sx = (best.j % w) + 0.5; sy = ((best.j / w) | 0) + 0.5; sa = Math.atan2(sy - back.y, sx - back.x); }
        }
        P.x = sx; P.y = sy; P.ang = sa; P.z = floorAt(M, sx, sy, PRAD); P.vx = P.vy = P.vz = 0;
        arrival = { x: sx, y: sy, ang: sa };
        lastCell = cellIdx(M, sx, sy);
        msg(HUBS[h].arena ? HUBS[h].name : HUBS[h].maps[key]);
        mode = 'play';
      }
      function travel(to) {
        sfx('portal'); flash.b = 0.8;
        if (to === 'NEXT') { addScore(5000); interMsg = { from: HUBS[hub].name, to: HUBS[hub + 1].name, n: hub + 1 }; mode = 'inter'; interT = 0; return; }
        enterMap(hub, to, mapKey);
      }
      function giveMana(a, b) { const m0 = P.mana[0], m1 = P.mana[1]; P.mana[0] = Math.min(200, m0 + a); P.mana[1] = Math.min(200, m1 + b); return P.mana[0] !== m0 || P.mana[1] !== m1; }
      function onItem(G2, it) {
        const d = it.d;
        let took = false, s = 'item';
        if (d.key) { P.keys[d.key] = true; took = true; s = 'key'; }
        else if (d.puzzle) { P.puzzle[d.puzzle] = true; took = true; s = 'puzzle'; }
        else if (d.piece != null) { P.pieces[d.piece] = true; took = true; s = 'puzzle'; if (P.pieces.every(x => x)) { P.weapons[3] = true; P.want = 3; giveMana(50, 50); msg(CLASSES[P.cls].wpn[3] + ' IS WHOLE AGAIN!'); sfx('wpn'); addScore(1000); G2.itemsGot++; return true; } }
        else if (d.mana) took = giveMana(d.mana[0], d.mana[1]);
        else if (d.weapon) { const k = d.weapon; const had = P.weapons[k]; P.weapons[k] = true; took = giveMana(k === 1 ? 25 : 0, k === 2 ? 25 : 0) || !had; if (!had) { P.want = k; s = 'wpn'; } }
        else if (d.armor != null) { const v = CLASSES[P.cls].armorVal[d.armor]; if (P.armor[d.armor] < v) { P.armor[d.armor] = v; took = true; } }
        else if (d.art) { const c = P.inv[it.kind] || 0; if (c < 10) { P.inv[it.kind] = c + 1; took = true; s = 'art'; if (!P.inv[P.sel]) P.sel = it.kind; } }
        if (took) { sfx(s); msg(d.weapon ? CLASSES[P.cls].wpn[d.weapon] : d.name); addScore(d.key || d.puzzle ? 500 : d.weapon ? 300 : 20); flash.g = 0.25; G2.itemsGot++; }
        return took;
      }
      function onKill(G2, m) {
        addScore(m.def.score); sfx('mdie', m);
        if (m.def.boss) {
          for (const o of G2.mons) if (!o.dead && o !== m) hurtMon(G2, o, 9999, null);
          const c = cellIdx(M, 15, 14); M.special[c] = SP_EXIT; M.ftex[c] = T.pad; M.light[c] = 1;
          G2.decos.push({ x: 15.5, y: 14.5, z: 0, d: DECO.exitglow });
          msg('THE REGENT FALLS. STEP INTO THE LIGHT.'); sfx('clear');
        } else if (G2.R() < 0.15) {
          const it = spawnThing(G2, { t: 'item', kind: G2.R() < 0.5 ? 'manaB' : 'manaG', x: m.x, y: m.y }); if (it) G2.itemsTotal--;
        }
      }
      function hurtPlayer(G2, dmg, src) {
        if (P.dead || god || P.shield > 0 || mode !== 'play') return;
        dmg = Math.max(1, Math.round(dmg * (1 - Math.min(80, ac()) / 100)));
        P.hp -= dmg; flash.r = Math.min(0.6, flash.r + dmg * 0.02);
        if (src && src.x != null) P.hurtA = Math.atan2(src.y - P.y, src.x - P.x);
        if (P.hp <= 0) { P.hp = 0; P.dead = true; P.deadT = 0; sfx('die'); }
        else if (P.hurtT <= 0) { sfx('pain'); P.hurtT = 0.4; }
      }
      function useCell(i) {
        const d = doorAt(M, i);
        if (d) {
          if (d.req) {
            const r = d.req;
            if (r.key && !P.keys[r.key]) { lockMsg('YOU NEED THE ' + r.name); return; }
            if (r.item && !P.puzzle[r.item]) { lockMsg('THIS SOCKET AWAITS THE ' + r.name); return; }
            if (r.flag && !flags[r.flag]) { lockMsg('THE GATE IS SEALED FROM AFAR'); return; }
            if (r.item && d.state === 0) { delete P.puzzle[r.item]; msg('THE ' + r.name + ' FITS. THE WAY IS OPEN.'); sfx('puzzle'); addScore(1000); }
          }
          if (openDoor(d)) sfx('door');
          return;
        }
        if (M.special[i] === SP_SWITCH) {
          const s = M.switches[M.tag[i]];
          if (!s.on) {
            s.on = true; M.wtex[i] = T.swOn; flags[s.flag] = true; sfx('lever'); msg(s.msg); addScore(500);
            for (const k in hubMaps) for (const d2 of hubMaps[k].M.doors) if (d2.req && d2.req.flag === s.flag) { d2.state = 1; d2.stay = true; }
          }
        }
      }
      function lockMsg(s) { if (P.lockT <= 0) { msg(s); sfx('locked'); P.lockT = 1; } }
      function useArtifact(k) {
        if (!P.inv[k]) return false;
        const mx = CLASSES[P.cls].hp;
        let ok = true;
        if (k === 'vial') { if (P.hp >= mx) ok = false; else P.hp = Math.min(mx, P.hp + 25); }
        else if (k === 'urn') { if (P.hp >= mx) ok = false; else P.hp = mx; }
        else if (k === 'wings') P.wings = 30;
        else if (k === 'shield') P.shield = 20;
        else if (k === 'torch') P.torch = 60;
        else if (k === 'disc') { for (const m of G.mons) { if (m.dead) continue; const d = Math.hypot(m.x - P.x, m.y - P.y); if (d < 4) { hurtMon(G, m, 40, P); for (let s = 0; s < 6; s++) monStep(G, m, (m.x - P.x) / Math.max(0.1, d) * 0.4, (m.y - P.y) / Math.max(0.1, d) * 0.4); } } for (const p of G.projs) if (p.owner !== P && Math.hypot(p.x - P.x, p.y - P.y) < 4) { p.vx = -p.vx; p.vy = -p.vy; p.owner = P; } addFx(G, P.x, P.y, P.z + 0.5, PD.spirit.boom, 3, 0.4, { grow: 4 }); }
        else if (k === 'flech') spawnProj(G, PD.flech, P.x, P.y, P.z + 0.6, P.ang, 0.4, P);
        if (!ok) return false;
        P.inv[k]--; sfx('art'); flash.g = 0.3;
        if (!P.inv[k]) { delete P.inv[k]; cycleSel(1); }
        return true;
      }
      function invList() { return ARTS.filter(a => P.inv[a] > 0); }
      function cycleSel(dir) { const l = invList(); if (!l.length) { P.sel = 'vial'; return; } let i = l.indexOf(P.sel); i = i < 0 ? 0 : (i + dir + l.length) % l.length; P.sel = l[i]; }
      function canFire(k) { const c = WDEF[P.cls][k].cost; return P.mana[0] >= c[0] && P.mana[1] >= c[1]; }
      function bestWeapon() { for (const k of [3, 2, 1, 0]) if (P.weapons[k] && canFire(k)) return k; return 0; }
      function fire() {
        const cl = P.cls, k = P.cur, wd = WDEF[cl][k];
        if (!canFire(k)) {
          if (cl === 0 && k === 1) { /* hatchet still swings without mana */ } else { P.want = bestWeapon(); return; }
        }
        const hasMana = canFire(k);
        if (hasMana) { P.mana[0] -= wd.cost[0]; P.mana[1] -= wd.cost[1]; }
        P.cool = wd.rate; P.fireT = 0.15; G.noise = 0.3; P.alt = !P.alt;
        const z = P.z + 0.55, aim = autoAim(G, P.x, P.y, z, P.ang, 0.12);
        const slope = aim ? aim.slope : P.pitch / PROJ * 1.2, a = P.ang;
        const shoot = (d, an, sl, ex) => spawnProj(G, d, P.x, P.y, z, an, sl == null ? slope : sl, P, ex);
        if (cl === 0) {
          if (k === 0) { const m = meleeHit(G, P, 1.0, (P.combo = (P.combo || 0) + 1) % 3 === 0 ? 45 : 18 + G.R() * 10, 0.6); sfx(m ? 'hit' : 'punch'); if (m && P.combo % 3 === 0) monStep(G, m, Math.cos(a) * 0.6, Math.sin(a) * 0.6); }
          else if (k === 1) { const m = meleeHit(G, P, 1.15, hasMana ? 40 + G.R() * 20 : 22 + G.R() * 10, 0.6); if (hasMana) shoot(PD.hatch, a); sfx(m ? 'hit' : 'swing'); }
          else if (k === 2) { const m = meleeHit(G, P, 1.2, 70 + G.R() * 30, 0.5); if (m) sfx('hit'); else { shoot(PD.maul, a); sfx('maul'); } }
          else { for (let j = -1; j <= 1; j++) shoot(PD.blade, a + j * 0.14); sfx('swing'); sfx('star'); }
        } else if (cl === 1) {
          if (k === 0) { const m = meleeHit(G, P, 1.05, 25 + G.R() * 15, 0.6); sfx(m ? 'hit' : 'swing'); }
          else if (k === 1) { const m = meleeHit(G, P, 0.8, 30, 0.4); if (m) { P.hp = Math.min(CLASSES[cl].hp, P.hp + 4); sfx('hit'); } else { for (let j = -1; j <= 1; j++) shoot(PD.venom, a + j * 0.08); sfx('venom'); } }
          else if (k === 2) { shoot(PD.pyre, a); sfx('pyre'); }
          else { for (let j = 0; j < 5; j++) { const p = shoot(PD.spirit, a + (j - 2) * 0.35, slope + 0.1); const t = autoAim(G, P.x, P.y, z, a + (j - 2) * 0.25, 0.9); p.target = t ? t.m : (aim ? aim.m : null); } sfx('holy'); }
        } else {
          if (k === 0) { shoot(PD.rod, a + (G.R() - 0.5) * 0.02); sfx('zap'); }
          else if (k === 1) { for (let j = -2; j <= 2; j++) shoot(PD.frost, a + j * 0.09 + (G.R() - 0.5) * 0.03); sfx('frost'); }
          else if (k === 2) { shoot(PD.arc, a); sfx('arc'); }
          else { shoot(PD.star, a); sfx('star'); }
        }
      }
      function loseLife() {
        lives--;
        if (lives > 0) { respawn(); return; }
        mode = 'dead-wait';
        const done = () => { mode = 'over'; endT = 0; api.setHiScore(hi); };
        if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, done); else done();
      }
      function respawn() {
        P.dead = false; P.hp = CLASSES[P.cls].hp; P.x = arrival.x; P.y = arrival.y; P.ang = arrival.ang; P.z = floorAt(M, P.x, P.y, PRAD); P.viewOff = 0; P.pitch = 0;
        P.shield = 3; P.wings = 0; P.vx = P.vy = P.vz = 0; P.wy = 40; mode = 'play';
        for (const p of G.projs) p.alive = false;
        if (P.mana[0] < 30) P.mana[0] = 30;
        msg('YOU RISE AGAIN');
      }
      function newGame(c) {
        score = 0; lives = 3; nextLife = 30000; flags = {}; hubMaps = {};
        P = newPlayer(c);
        ITEMS.wpn1.spr = icon(c, 1); ITEMS.wpn2.spr = icon(c, 2);
        enterMap(0, 'A', null); sfx('start');
      }
      function icon(c, k) { const s = WS[c][k][0], o = Spr(60, 40); for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) o.px[y * 60 + x] = s.px[(y * 2) * 120 + x * 2]; return o; }

      // ---------- play update ----------
      function updatePlay(dt) {
        const k = api.key;
        G.time += dt; G.frame++;
        if (G.noise > 0) G.noise -= dt;
        flash.r = Math.max(0, flash.r - dt * 1.2); flash.g = Math.max(0, flash.g - dt * 1.5); flash.b = Math.max(0, flash.b - dt * 1.2);
        if (P.msgT > 0) P.msgT -= dt; if (P.hurtT > 0) P.hurtT -= dt; if (P.lockT > 0) P.lockT -= dt;
        for (const t of ['wings', 'shield', 'torch']) if (P[t] > 0) { P[t] -= dt; if (P[t] <= 0) P[t] = 0; }
        if (api.pressed('Tab') || api.pressed('KeyM')) mapOn = !mapOn;
        if (P.dead) {
          P.deadT += dt; P.viewOff = Math.max(-0.45, P.viewOff - dt * 0.6); P.pitch *= 0.95;
          updateMons(G, dt); updateProjs(G, dt); updateFx(G, dt);
          if (P.deadT > 1.5 && (api.anyPressed('Space', 'Enter') || P.deadT > 4)) loseLife();
          return;
        }
        const turn = (k('ArrowRight') || k('KeyE') ? 1 : 0) - (k('ArrowLeft') || k('KeyQ') ? 1 : 0);
        P.turnV += (turn * 2.9 - P.turnV) * Math.min(1, dt * 14);
        P.ang += P.turnV * dt;
        const look = (k('PageUp') || k('KeyR') ? 1 : 0) - (k('PageDown') || k('KeyF') ? 1 : 0);
        if (look) { P.pitch = clamp(P.pitch + look * 110 * dt, -60, 60); P.lookT = 0; } else P.lookT += dt;
        if (k('Home') || k('KeyT')) P.pitch = 0;
        const fwd = (k('ArrowUp') || k('KeyW') ? 1 : 0) - (k('ArrowDown') || k('KeyS') ? 1 : 0);
        const str = (k('KeyD') || k('Period') ? 1 : 0) - (k('KeyA') || k('Comma') ? 1 : 0);
        if ((fwd || str) && P.lookT > 1.2) P.pitch *= Math.pow(0.05, dt);
        const ci = cellIdx(M, P.x, P.y), flying = P.wings > 0;
        const inWater = ci >= 0 && M.hazard[ci] === 2 && P.z <= M.fh[ci] + 0.05;
        const spd = (k('ShiftLeft') || k('ShiftRight') ? 5.6 : 4.2) * CLASSES[P.cls].spd * (inWater ? 0.6 : 1);
        const ca = Math.cos(P.ang), sa = Math.sin(P.ang);
        let tx = ca * fwd - sa * str, ty = sa * fwd + ca * str; const tl = Math.hypot(tx, ty); if (tl > 1) { tx /= tl; ty /= tl; }
        const acc = (P.onGround || flying) ? 10 : 1.5;
        P.vx += (tx * spd - P.vx) * Math.min(1, dt * acc); P.vy += (ty * spd - P.vy) * Math.min(1, dt * acc);
        const bump = playerMove(G, P, P.vx * dt, P.vy * dt, MAXSTEP);
        if (bump >= 0) useCell(bump);
        if (fwd > 0) { const ahead = cellIdx(M, P.x + ca * 0.5, P.y + sa * 0.5); if (ahead >= 0 && (doorAt(M, ahead) || M.special[ahead] === SP_SWITCH)) useCell(ahead); }
        // jump (Hexen lets heroes hop onto ledges)
        if (P.jumpT > 0) P.jumpT -= dt;
        if (!flying && (k('KeyC') || k('Insert')) && P.onGround && P.jumpT <= 0) { P.vz = 4.6; P.z += 0.01; P.jumpT = 0.4; sfx('jump'); }
        let flyIn = 0;
        if (flying) { flyIn = (k('KeyC') || k('Insert') ? 1 : 0) - (k('KeyV') || k('Delete') ? 1 : 0); if (fwd && P.pitch && !flyIn) flyIn = clamp(P.pitch / 40, -1, 1) * fwd; }
        const landed = playerVertical(G, P, dt, flying, flyIn);
        if (landed > 6) { P.viewOff -= 0.12; sfx('thud'); }
        P.bob += Math.hypot(P.vx, P.vy) * dt * 2.2;
        const c2 = cellIdx(M, P.x, P.y);
        if (c2 >= 0) {
          if (M.hazard[c2] === 1 && P.onGround && P.z <= M.fh[c2] + 0.05) { P.lavaT -= dt; if (P.lavaT <= 0) { P.lavaT = 0.6; hurtPlayer(G, 7, null); sfx('lava'); } }
          if (M.secret[c2] === 1) { M.secret[c2] = 2; for (let j = 0; j < M.n; j++) if (M.secret[j] === 1 && Math.abs((j % M.w) - (c2 % M.w)) + Math.abs(((j / M.w) | 0) - ((c2 / M.w) | 0)) <= 3) M.secret[j] = 2; G.secretsGot++; addScore(500); msg('A SECRET IS REVEALED!'); sfx('secret'); }
          if (c2 !== lastCell && M.special[c2] === SP_PORTAL && P.z <= M.fh[c2] + 0.6) { const pt = M.portals[M.tag[c2]]; lastCell = c2; travel(pt.to); return; }
          if (M.special[c2] === SP_EXIT && (P.onGround || flying)) { sfx('portal'); interMsg = { final: true }; mode = 'inter'; interT = 0; addScore(20000 + lives * 5000); return; }
          lastCell = c2;
        }
        for (const it of G.items) if (it.alive && Math.abs(it.x - P.x) < 0.5 && Math.abs(it.y - P.y) < 0.5 && Math.abs(it.z - P.z) < 1.0) { if (onItem(G, it)) it.alive = false; }
        G.items = G.items.filter(it => it.alive);
        if (api.pressed('BracketLeft') || api.pressed('KeyZ')) { cycleSel(-1); invShow = 2; }
        if (api.pressed('BracketRight')) { cycleSel(1); invShow = 2; }
        if (invShow > 0) invShow -= dt;
        if (P.hp < 40 && P.inv.vial && P.sel !== 'vial') P.sel = 'vial';
        if (api.pressed('Enter') || api.pressed('KeyU')) { if (!useArtifact(P.sel)) sfx('locked'); }
        for (let n = 1; n <= 4; n++) if (api.pressed('Digit' + n) && P.weapons[n - 1]) P.want = n - 1;
        if (api.pressed('KeyX')) { for (let j = 1; j <= 4; j++) { const c = (P.want + j) % 4; if (P.weapons[c] && (canFire(c) || c === 0)) { P.want = c; break; } } }
        if (P.want !== P.cur) { P.wy += dt * 300; if (P.wy >= 60) P.cur = P.want; }
        else if (P.wy > 0) P.wy = Math.max(0, P.wy - dt * 300);
        if (P.cool > 0) P.cool -= dt; if (P.fireT > 0) P.fireT -= dt;
        if ((k('Space') || k('ControlLeft') || k('ControlRight')) && P.cool <= 0 && P.wy < 8 && P.want === P.cur) fire();
        if (P.cur > 0 && !canFire(P.cur) && P.cool <= 0 && !(P.cls === 0 && P.cur === 1)) P.want = bestWeapon();
        updateDoors(M, dt, (c) => { const cx = c % M.w, cy = (c / M.w) | 0; if (Math.floor(P.x + PRAD) >= cx && Math.floor(P.x - PRAD) <= cx && Math.floor(P.y + PRAD) >= cy && Math.floor(P.y - PRAD) <= cy) return true; return G.mons.some(m => !m.dead && (m.x | 0) === cx && (m.y | 0) === cy); }, (d, w) => { if (w === 'close') sfx('door', { x: (d.cells[0] % M.w) + 0.5, y: ((d.cells[0] / M.w) | 0) + 0.5 }); });
        updateMons(G, dt); updateProjs(G, dt); updateFx(G, dt);
        music(dt);
      }

      // ---------- demo ----------
      let demoN = 0;
      function startDemo() {
        const h = demoN % 3; demoN++;
        const Md = buildMap(h, 'BCA'[h]);
        const cfg = { mon: MON, items: ITEMS, deco: DECO, onItem: () => false, onKill: () => { }, hurtPlayer: () => { }, sfx: () => { } };
        const Pd = newPlayer(0); Pd.x = Md.start.x; Pd.y = Md.start.y; Pd.ang = Md.start.ang; Pd.z = floorAt(Md, Pd.x, Pd.y, PRAD);
        demo = { M: Md, G: World(Md, cfg, Pd), P: Pd, turn: 0 };
      }
      function updateDemo(dt) {
        const D = demo, Pd = D.P, Gd = D.G;
        Gd.time += dt; Gd.frame++;
        const ca = Math.cos(Pd.ang), sa = Math.sin(Pd.ang);
        const blockedAhead = areaBlocked(D.M, Pd.x + ca * 1.2, Pd.y + sa * 1.2, PRAD, Pd.z, PHEIGHT, MAXSTEP) !== -1;
        if (blockedAhead) { if (!D.turn) D.turn = Gd.R() < 0.5 ? -1 : 1; }
        if (D.turn) Pd.ang += D.turn * 1.6 * dt; else Pd.ang += Math.sin(Gd.time * 0.7) * 0.2 * dt;
        const ox = Pd.x, oy = Pd.y;
        const b = playerMove(Gd, Pd, ca * 2.4 * dt, sa * 2.4 * dt, MAXSTEP);
        if (b >= 0) { const d = doorAt(D.M, b); if (d && !d.req) openDoor(d); }
        const mv = Math.hypot(Pd.x - ox, Pd.y - oy);
        if (mv < 0.005 && !D.turn) D.turn = 1;
        if (!blockedAhead && mv > 0.02) D.turn = 0;
        playerVertical(Gd, Pd, dt, false, 0);
        Pd.bob += dt * 5;
        updateDoors(D.M, dt, () => false, null);
        for (const m of Gd.mons) m.anim += dt;
      }

      // ---------- render ----------
      function camOf(p) { return { x: p.x, y: p.y, z: p.z + 0.62 + p.viewOff + Math.sin(p.bob) * 0.025 * Math.min(1, Math.hypot(p.vx, p.vy) / 3), ang: p.ang, pitch: p.pitch }; }
      function monSprite(m, cam) { const s = standardMonSprite(m, cam); if (m.def === MON.sentinel && m.blockT > 0 && !m.dead) s.spr = SM.sentinel.block; if (m.def === MON.shade) s.fade = (s.fade == null ? 1 : s.fade) * (0.55 + 0.35 * Math.sin(m.anim * 3)); return s; }
      function drawWorld(Mx, Gx, Px, withWeapon) {
        const boost = (Px.torch > 0 ? 0.3 : 0) + (Px.fireT > 0 && Px.cur > 0 ? 0.1 : 0);
        updateLights(Mx, Gx.time, boost);
        const cam = camOf(Px);
        buildSprites(Gx, cam, sprBuf, monSprite);
        R3.draw(Mx, cam, sprBuf, Gx.time);
        if (withWeapon && !Px.dead) {
          const f = Px.fireT > 0 ? (Px.alt ? 2 : 1) : 0;
          const sp = WS[Px.cls][Px.cur][f];
          const mv = Math.min(1, Math.hypot(Px.vx, Px.vy) / 3);
          const bx = Math.cos(Px.bob) * 6 * mv, by = Math.abs(Math.sin(Px.bob)) * 5 * mv;
          const ci = cellIdx(Mx, Px.x, Px.y), L = ci >= 0 ? Mx.lnow[ci] : 0.7;
          scr.blit(sp, 76 + bx, VH - 104 + by + Px.wy, 1.4, f ? 256 : clamp((L * 1.1 + 0.25) * 256, 90, 256) | 0);
        }
      }
      function tintView(c, a) { if (a > 0.01) scr.blend(0, 0, W, VH, c, Math.min(0.7, a)); }
      function drawAutomap() {
        scr.rect(0, 0, W, VH, rgb(4, 6, 10));
        const s = 4, ox = W / 2 - P.x * s, oy = VH / 2 - P.y * s;
        for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) {
          const i = y * M.w + x; if (!M.seen[i]) continue;
          const sx = ox + x * s, sy = oy + y * s;
          if (sx < -s || sy < -s || sx > W || sy > VH) continue;
          let c;
          if (M.solid[i]) c = M.special[i] === SP_SWITCH ? rgb(120, 255, 120) : rgb(90, 110, 140);
          else if (M.special[i] === SP_DOOR || M.special[i] === SP_POLY) { const d = M.doors[M.tag[i]]; c = d.req ? rgb(255, 200, 80) : d.secret ? rgb(90, 110, 140) : rgb(170, 190, 220); }
          else if (M.special[i] === SP_PORTAL || M.special[i] === SP_EXIT) c = rgb(140, 170, 255);
          else if (M.hazard[i] === 1) c = rgb(120, 40, 10);
          else c = rgb(26 + M.fh[i] * 14 | 0, 32 + M.fh[i] * 16 | 0, 40 + M.fh[i] * 18 | 0);
          scr.rect(sx, sy, s, s, c);
        }
        for (let k = 0; k < 6; k++) scr.rect(W / 2 + Math.cos(P.ang) * k - 1, VH / 2 + Math.sin(P.ang) * k - 1, 2, 2, rgb(255, 255, 255));
        scr.text('MAP - ' + (HUBS[hub].arena ? HUBS[hub].name : HUBS[hub].maps[mapKey]), 4, 4, rgb(160, 190, 255), 1);
      }
      function drawBar() {
        const y0 = VH;
        if (!barBg) { barBg = new Uint32Array(W * BAR); for (let y = 0; y < BAR; y++) for (let x = 0; x < W; x++) { const n = hash2(x >> 1, y >> 1, 78); barBg[y * W + x] = rgb(40 + n * 18 | 0, 44 + n * 18 | 0, 54 + n * 20 | 0); } }
        scr.buf.set(barBg, y0 * W);
        scr.rect(0, y0, W, 1, rgb(140, 150, 180)); scr.rect(0, y0 + 1, W, 1, rgb(16, 18, 24));
        const box = (x, w) => { scr.rect(x, y0 + 4, w, 30, rgb(12, 14, 20)); scr.frame(x - 1, y0 + 3, w + 2, 32, rgb(16, 18, 24), rgb(130, 140, 170)); };
        box(4, 42); box(50, 28); box(82, 62); box(148, 40); box(192, 44); box(240, 28); box(272, 44);
        const lab = rgb(150, 160, 190), gold = rgb(240, 210, 120), red = rgb(240, 60, 40);
        scr.text('LIFE', 25, y0 + 6, lab, 1, 'center'); scr.text(String(P.hp), 25, y0 + 17, P.hp < 25 ? red : gold, 2, 'center');
        scr.text('AC', 64, y0 + 6, lab, 1, 'center'); scr.text(String(ac()), 64, y0 + 19, gold, 1, 'center');
        const bar = (y, v, c) => { scr.rect(86, y, 34, 5, rgb(30, 30, 40)); scr.rect(86, y, (34 * v / 200) | 0, 5, c); };
        scr.text('MANA', 113, y0 + 6, lab, 1, 'center');
        bar(y0 + 16, P.mana[0], rgb(70, 130, 255)); scr.text(String(P.mana[0]), 142, y0 + 15, rgb(150, 190, 255), 1, 'right');
        bar(y0 + 25, P.mana[1], rgb(70, 230, 90)); scr.text(String(P.mana[1]), 142, y0 + 24, rgb(150, 255, 160), 1, 'right');
        for (let j = 0; j < 4; j++) { const x = 151 + j * 9, c = P.weapons[j] ? (j === P.cur ? rgb(255, 220, 100) : rgb(150, 150, 170)) : rgb(40, 40, 50); scr.rect(x, y0 + 6, 7, 9, c); scr.text(String(j + 1), x + 1, y0 + 7, rgb(10, 10, 14), 1); }
        for (let j = 0; j < 3; j++) scr.rect(152 + j * 12, y0 + 22, 9, 6, P.pieces[j] ? rgb(255, 220, 120) : rgb(40, 40, 50));
        let kx = 195;
        for (let h2 = 0; h2 < 3; h2++) { if (P.keys['k' + h2]) { scr.blit(ITEMS['key' + h2].spr, kx, y0 + 6, 1); kx += 14; } }
        kx = 195; for (let h2 = 0; h2 < 3; h2++) { if (P.puzzle['p' + h2]) { scr.blit(ITEMS['puz' + h2].spr, kx, y0 + 19, 1); kx += 15; } }
        const cnt = P.inv[P.sel] || 0;
        if (cnt) { const sp = ITEMS[P.sel].spr; scr.blit(sp, 254 - sp.w / 2, y0 + 18 - sp.h / 2, 1); scr.text(String(cnt), 267, y0 + 26, rgb(255, 255, 255), 1, 'right'); }
        scr.text('SCORE', 294, y0 + 6, lab, 1, 'center'); scr.text(String(score), 294, y0 + 16, gold, 1, 'center'); scr.text('LIVES ' + lives, 294, y0 + 25, rgb(200, 200, 210), 1, 'center');
        P.gemX = P.gemX == null ? P.hp : P.gemX + (P.hp - P.gemX) * 0.1;
        const gx = 4 + (W - 14) * clamp(P.gemX / CLASSES[P.cls].hp, 0, 1);
        for (let x = 4; x < W - 4; x += 4) scr.rect(x, y0 + 37, 3, 1, rgb(110, 110, 120));
        scr.rect(gx, y0 + 35, 6, 5, rgb(200, 30, 40)); scr.rect(gx + 1, y0 + 36, 2, 1, rgb(255, 170, 170));
        if (invShow > 0) {
          const bx = 60;
          scr.rect(bx - 2, VH - 26, 204, 24, rgb(12, 14, 20)); scr.frame(bx - 2, VH - 26, 204, 24, rgb(130, 140, 170), rgb(16, 18, 24));
          for (let j = 0; j < 7; j++) { const a = ARTS[j], x = bx + j * 29; scr.frame(x, VH - 24, 27, 20, rgb(60, 70, 90), rgb(30, 34, 44)); if (P.inv[a]) { const sp = ITEMS[a].spr; scr.blit(sp, x + 13 - sp.w / 2, VH - 14 - sp.h / 2, 1); scr.text(String(P.inv[a]), x + 25, VH - 11, rgb(255, 255, 255), 1, 'right'); } if (a === P.sel) scr.frame(x - 1, VH - 25, 29, 22, rgb(255, 220, 80), rgb(255, 220, 80)); }
        }
      }
      function drawPlay() {
        if (mapOn) drawAutomap();
        else {
          drawWorld(M, G, P, true);
          if (P.dead) tintView(rgb(120, 0, 0), 0.25 + Math.min(0.35, P.deadT * 0.2));
          tintView(rgb(220, 30, 20), flash.r); tintView(rgb(240, 220, 120), flash.g); tintView(rgb(160, 190, 255), flash.b);
          if (P.shield > 0) tintView(rgb(255, 240, 180), 0.15);
          if (P.hurtT > 0 && P.hurtA != null) { const rel = angDiff(P.ang, P.hurtA); const x = rel < -0.3 ? 0 : rel > 0.3 ? W - 6 : -1; if (x >= 0) scr.blend(x, 0, 6, VH, rgb(255, 30, 20), 0.5); }
          let x = W - 14;
          for (const kk of ['wings', 'shield', 'torch']) if (P[kk] > 0 && (P[kk] > 3 || (api.frame >> 3) & 1)) { const sp = ITEMS[kk].spr; scr.blit(sp, x - sp.w / 2, 4, 1); x -= 22; }
        }
        if (P.msgT > 0) scr.text(P.msg, 4, 4, rgb(190, 210, 255), 1, null, rgb(0, 0, 0));
        if (P.dead && P.deadT > 1.5) scr.text('PRESS SPACE', W / 2, VH / 2 - 4, rgb(220, 230, 255), 1, 'center', rgb(0, 0, 0));
        drawBar();
      }
      function title(s, y, sc) {
        scr.text(s, W / 2 + 2, y + 2, rgb(0, 0, 20), sc, 'center');
        scr.text(s, W / 2, y, rgb(150, 20, 16), sc, 'center');
        const w = s.length * 6 * sc - sc, x0 = Math.round(W / 2 - w / 2);
        for (let yy = y; yy < y + 7 * sc; yy++) for (let xx = x0; xx < x0 + w; xx++) { const o = yy * W + xx; if (o >= 0 && o < W * H && scr.buf[o] === rgb(150, 20, 16)) { const t = (yy - y) / (7 * sc); scr.buf[o] = rgb((230 - t * 140) | 0, (240 - t * 120) | 0, 255); } }
      }
      function pushStart(y) {
        const blink = (api.frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) scr.text('INSERT COIN', W / 2, y, rgb(255, 255, 255), 1, 'center', rgb(0, 0, 0)); }
        else if (api.credits === 0) { if (blink) scr.text('INSERT COIN', W / 2, y, rgb(255, 255, 255), 1, 'center', rgb(0, 0, 0)); }
        else scr.text('PUSH START', W / 2, y, blink ? rgb(200, 220, 255) : rgb(110, 130, 180), 1, 'center', rgb(0, 0, 0));
      }
      function attractPhase() { const t = attractT % 30; return t < 8 ? 0 : t < 18 ? 1 : t < 24 ? 2 : 3; }
      function drawAttract() {
        const ph = attractPhase();
        if (demo) drawWorld(demo.M, demo.G, demo.P, false); else scr.clear(0xff000000);
        scr.rect(0, VH, W, BAR, rgb(8, 8, 14));
        if (ph === 0) {
          scr.blend(0, 0, W, VH, rgb(0, 0, 12), 0.6);
          title('HEXEN', 26, 5);
          scr.text('BEYOND HERETIC', W / 2, 70, rgb(220, 200, 140), 1, 'center', rgb(0, 0, 0));
          scr.text('\u00a9 1995 RAVEN SOFTWARE', W / 2, 140, rgb(130, 140, 170), 1, 'center', rgb(0, 0, 0));
          pushStart(108);
        } else if (ph === 1) {
          if ((api.frame >> 5) & 1) scr.text('DEMO', W / 2, 8, rgb(200, 220, 255), 1, 'center', rgb(0, 0, 0));
          pushStart(VH - 14);
        } else if (ph === 2) {
          scr.blend(0, 0, W, VH, rgb(0, 0, 0), 0.75);
          STORY.forEach((l, j) => scr.text(l, W / 2, 20 + j * 12, rgb(200, 210, 240), 1, 'center'));
          pushStart(140);
        } else {
          scr.blend(0, 0, W, VH, rgb(0, 0, 0), 0.75);
          title('CHOOSE YOUR PATH', 14, 2);
          for (let c = 0; c < 3; c++) { scr.blit(HERO[c], 40 + c * 100, 40, 1); scr.text(CLASSES[c].name, 60 + c * 100, 108, rgb(220, 220, 240), 1, 'center'); }
          scr.text('HIGH SCORE ' + hi, W / 2, 124, rgb(255, 220, 120), 1, 'center');
          pushStart(140);
        }
        scr.text('CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, rgb(130, 140, 170), 1);
        scr.text('HI ' + hi, W - 4, H - 10, rgb(130, 140, 170), 1, 'right');
      }
      function drawSelect() {
        scr.clear(rgb(6, 6, 14));
        if (demo) { drawWorld(demo.M, demo.G, demo.P, false); scr.blend(0, 0, W, H, rgb(0, 0, 10), 0.75); }
        title('CHOOSE YOUR CLASS', 10, 2);
        for (let c = 0; c < 3; c++) {
          const x = 14 + c * 102, on = c === selCls;
          scr.rect(x, 34, 90, 132, on ? rgb(30, 34, 60) : rgb(14, 14, 24));
          scr.frame(x, 34, 90, 132, on ? rgb(255, 220, 120) : rgb(60, 60, 80), on ? rgb(160, 120, 40) : rgb(30, 30, 40));
          scr.blit(HERO[c], x + 25, 40 + (on ? Math.sin(selT * 4) * 2 : 0), 1, on ? null : 150);
          scr.text(CLASSES[c].name, x + 45, 110, on ? rgb(255, 230, 140) : rgb(170, 170, 190), 1, 'center');
          CLASSES[c].desc.forEach((l, j) => scr.text(l, x + 45, 124 + j * 10, rgb(160, 170, 200), 1, 'center'));
        }
        scr.text('LEFT/RIGHT TO CHOOSE  SPACE TO BEGIN', W / 2, 178, (api.frame >> 4) & 1 ? rgb(220, 230, 255) : rgb(120, 130, 170), 1, 'center');
      }
      function drawInter() {
        if (!interBg) { interBg = new Uint32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = hash2(x >> 2, y >> 2, 6); interBg[y * W + x] = n > 0.9 ? rgb(30, 30, 60) : rgb(6, 6, 16 + (y >> 4)); } }
        scr.buf.set(interBg);
        if (interMsg.final) {
          title('VICTORY', 30, 4);
          ['THE HOLLOW REGENT IS NO MORE.', 'THE WARDS OF VAELOR BREAK AND', 'DAWN RETURNS TO THE REALM.', '', 'HAIL, ' + CLASSES[P.cls].name + '!'].forEach((l, j) => scr.text(l, W / 2, 80 + j * 12, rgb(210, 220, 250), 1, 'center'));
        } else {
          title('HUB COMPLETE', 20, 2);
          scr.text(interMsg.from, W / 2, 50, rgb(170, 180, 210), 1, 'center');
          if (interT > 1) { scr.text('THE PORTAL CARRIES YOU TO', W / 2, 90, rgb(170, 180, 210), 1, 'center'); scr.text(interMsg.to, W / 2, 104, rgb(255, 230, 150), 1, 'center'); }
        }
        scr.text('SCORE ' + score, W / 2, 176, rgb(240, 210, 120), 1, 'center');
      }
      function drawOver() {
        if (M && G && P) drawWorld(M, G, P, false); else scr.clear(0xff000000);
        scr.blend(0, 0, W, H, rgb(0, 0, 30), 0.6);
        title('GAME OVER', 70, 3);
        scr.text('SCORE ' + score, W / 2, 110, rgb(255, 220, 120), 1, 'center');
        scr.text('HIGH ' + hi, W / 2, 124, rgb(170, 180, 210), 1, 'center');
      }

      function update(dt) {
        dt = 1 / 60;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          attractT += dt;
          if (!demo || (attractPhase() === 0 && attractT % 30 < dt * 1.5)) startDemo();
          updateDemo(dt);
          if (api.anyPressed('Enter', 'Space')) { if (api.useCredit()) { mode = 'select'; selT = 0; sfx('start'); } else { coinFlash = 90; sfx('coin'); } }
          return;
        }
        if (mode === 'select') {
          selT += dt; if (demo) updateDemo(dt);
          if (api.anyPressed('ArrowLeft', 'ArrowUp', 'KeyA')) { selCls = (selCls + 2) % 3; sfx('sel'); }
          if (api.anyPressed('ArrowRight', 'ArrowDown', 'KeyD')) { selCls = (selCls + 1) % 3; sfx('sel'); }
          for (let c = 1; c <= 3; c++) if (api.pressed('Digit' + c)) selCls = c - 1;
          if (selT > 0.3 && api.anyPressed('Space', 'Enter')) newGame(selCls);
          return;
        }
        if (mode === 'play') { updatePlay(dt); return; }
        if (mode === 'inter') {
          interT += dt;
          if (interT > 1.5 && (api.anyPressed('Space', 'Enter') || interT > 9)) {
            if (interMsg.final) { mode = 'over'; endT = 0; api.setHiScore(hi); }
            else { P.keys = {}; P.wings = 0; enterMap(interMsg.n, 'A', null); }
          }
          return;
        }
        if (mode === 'over') { endT += dt; if (endT > 6 || (endT > 1.5 && api.anyPressed('Space', 'Enter'))) { mode = 'attract'; attractT = 0; demo = null; } }
      }
      function render(ctx) {
        if (mode === 'attract') drawAttract();
        else if (mode === 'select') drawSelect();
        else if (mode === 'play' || mode === 'dead-wait') drawPlay();
        else if (mode === 'inter') drawInter();
        else drawOver();
        scr.present(ctx);
      }
      return {
        update, render, destroy() { },
        debug: {
          get mode() { return mode; }, get G() { return G; }, get P() { return P; }, get M() { return M; }, get hub() { return hub; }, get mapKey() { return mapKey; }, get flags() { return flags; },
          set god(v) { god = v; }, start(c) { newGame(c); }, warpHub(h) { hub = h; enterMap(h, 'A', null); }
        }
      };
    }
  });
})();
