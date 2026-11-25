// Doom (id Software, 1993) - original Game Room take: cell-sector renderer with variable floor/ceiling heights, sector lighting, diagonal walls, procedural textures/sprites.
(function () {
  'use strict';
  // ===================================================================================
  //  Shared core: palette, fonts, procedural textures and sprites (all drawn in code).
  // ===================================================================================
  const W = 320, H = 200, VW = 320, VH = 168, PROJ = 160;
  const TAU = Math.PI * 2;

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
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 31, 10, 0], '"': [10, 10, 0, 0, 0, 0, 0]
  };
  // 3x5 mini font (status bar)
  const MINIS = { '/': '001001010100100', M: '101111111101101', O: '111101101101111', D: '110101101101110', I: '111010010010111', N: '110101101101101', P: '111101111100100', Y: '101101010010010', G: '111100101101111', F: '111100110100100', W: '101101111111101', V: '101101101101010', X: '101101010101101', Z: '111001010100111', J: '001001001101111', Q: '111101101111001' };
  const MINI = {
    0: 0x7B6F, 1: 0x2C97, 2: 0x73E7, 3: 0x73CF, 4: 0x5BC9, 5: 0x79CF, 6: 0x79EF, 7: 0x7249, 8: 0x7BEF, 9: 0x7BCF,
    A: 0x2BED, B: 0x6BAE, C: 0x7927, E: 0x79E7, H: 0x5BED, K: 0x5AED, L: 0x4927, R: 0x6BAD, S: 0x388E, T: 0x7492, U: 0x5B6F, '-': 0x01C0
  };

  // ---------- palette: 16 ramps x 16 shades ----------
  const RAMPS = [[200, 200, 200], [150, 105, 65], [205, 175, 125], [105, 135, 60], [110, 255, 70], [235, 45, 35], [255, 140, 30], [255, 230, 80],
    [70, 100, 245], [70, 210, 210], [165, 80, 210], [235, 170, 140], [175, 85, 40], [125, 145, 175], [150, 55, 45], [255, 250, 225]];
  const PAL = new Uint8Array(768);
  for (let r = 0; r < 16; r++) for (let s = 0; s < 16; s++) {
    const k = (s + 1) / 16, i = (r * 16 + s) * 3;
    for (let c = 0; c < 3; c++) {
      const b = RAMPS[r][c];
      let v = b * Math.min(1, k * 1.12);
      if (k > 0.8) v += (k - 0.8) / 0.2 * (255 - b) * 0.4;
      PAL[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  function C(r, s) { s = s < 0 ? 0 : s > 15 ? 15 : s | 0; const v = r * 16 + s; return v === 0 ? 1 : v; }
  function rgb32(r, g, b) { return (255 << 24 | b << 16 | g << 8 | r) >>> 0; }
  function palRGB(i) { return rgb32(PAL[i * 3], PAL[i * 3 + 1], PAL[i * 3 + 2]); }
  const NL = 32;
  const CM = new Uint32Array(NL * 256);
  for (let l = 0; l < NL; l++) {
    const k0 = l / (NL - 1), k = k0 * (0.35 + 0.65 * k0);
    for (let i = 0; i < 256; i++) {
      const r = i >> 4, s = i & 15;
      const fb = (r === 15 && s >= 11) || ((r === 4 || r === 6 || r === 7 || r === 9) && s >= 14);
      const kk = fb ? Math.max(k, 0.95) : k;
      CM[l * 256 + i] = rgb32(Math.min(255, PAL[i * 3] * kk) | 0, Math.min(255, PAL[i * 3 + 1] * kk) | 0, Math.min(255, PAL[i * 3 + 2] * kk) | 0);
    }
  }
  const FULL = (NL - 1) * 256;

  // ---------- noise ----------
  function hash2(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const LAT = new Map();
  function vnoise(x, y, p, s) {
    const key = p * 100003 + s;
    let a = LAT.get(key);
    if (!a) { a = new Float32Array(p * p); for (let j = 0; j < p; j++) for (let i = 0; i < p; i++) a[j * p + i] = hash2(i, j, s); LAT.set(key, a); }
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = x0 + 1 === p ? 0 : x0 + 1, y1 = y0 + 1 === p ? 0 : y0 + 1;
    const A = a[y0 * p + x0], B = a[y0 * p + x1], Cc = a[y1 * p + x0], D = a[y1 * p + x1];
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return A + (B - A) * ux + (Cc - A) * uy + (A - B - Cc + D) * ux * uy;
  }
  function fbm(x, y, s, n, oct) {
    let v = 0, a = 0.5, t = 0; oct = oct || 3;
    for (let o = 0; o < oct; o++) { v += a * vnoise(x * n / 64, y * n / 64, n, s + o * 17); t += a; a *= 0.5; n *= 2; }
    return v / t;
  }
  function mulberry(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // ---------- textures (64x64 palette indices) ----------
  const TEX = [], TID = {};
  function tex64(fn) { const d = new Uint8Array(4096); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) d[y * 64 + x] = fn(x, y) & 255; return d; }
  function addTex(name, frames) { if (!Array.isArray(frames)) frames = [frames]; TID[name] = TEX.length; TEX.push({ name, frames, d: frames[0] }); }
  function glyphInto(d, s, x0, y0, col) {
    for (let i = 0; i < s.length; i++) { const g = FONT[s[i]]; if (!g) continue; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) d[(y0 + r) * 64 + x0 + i * 6 + c] = col; }
  }
  const TG = {
    panel(ramp, seed, size) {
      size = size || 32;
      return tex64((x, y) => {
        const n = fbm(x, y, seed, 8); let s = 6 + n * 4;
        const px = x % size, py = y % size;
        if (px === 0 || py === 0) s = 2; else if (px === 1 || py === 1) s = 10; else if (px === size - 1 || py === size - 1) s = 3;
        if ((px === 4 || px === size - 5) && (py === 4 || py === size - 5)) s = 12;
        return C(ramp, s);
      });
    },
    techLights(seed) {
      const base = TG.panel(13, seed, 32);
      for (let x = 6; x < 58; x++) for (let y = 28; y < 36; y++) base[y * 64 + x] = (y === 28 || y === 35) ? C(0, 2) : ((x >> 2) & 1 ? C(9, 13) : C(0, 3));
      return base;
    },
    computer(seed) {
      return tex64((x, y) => {
        const cx = x >> 3, cy = y >> 3, px = x & 7, py = y & 7;
        if (y < 4 || y > 59) return C(13, 5 + (y & 1) * 3);
        if (cy === 3 || cy === 4) { if (px === 0) return C(0, 2); const h = hash2(cx, (y >> 1), seed); return h > 0.6 ? C(4, 13) : C(9, 3 + (h * 4 | 0)); }
        if (px === 0 || py === 0) return C(0, 2);
        const h = hash2(cx, cy, seed);
        if (px >= 2 && px <= 4 && py >= 2 && py <= 4) return h < 0.2 ? C(5, 14) : h < 0.4 ? C(7, 14) : h < 0.55 ? C(4, 14) : C(0, 4);
        return C(13, 4 + (hash2(x, y, seed) * 2 | 0));
      });
    },
    stone(ramp, seed) {
      return tex64((x, y) => {
        const by = y >> 4, bx = ((x + (by & 1) * 8) >> 4);
        const px = (x + (by & 1) * 8) & 15, py = y & 15;
        const n = fbm(x, y, seed, 8, 3), v = hash2(bx & 3, by & 3, seed);
        if (px === 0 || py === 0) return C(ramp, 2);
        if (px === 15 || py === 15) return C(ramp, 3);
        return C(ramp, 4 + v * 3 + n * 5);
      });
    },
    brick(ramp, seed) {
      return tex64((x, y) => {
        const by = y >> 3, off = (by & 1) * 8, bx = (x + off) >> 4;
        const px = (x + off) & 15, py = y & 7;
        if (py === 7 || px === 15) return C(0, 4);
        const v = hash2(bx & 3, by, seed), n = hash2(x, y, seed + 3);
        return C(ramp, 5 + v * 5 + n * 2 + (py === 0 ? 2 : 0));
      });
    },
    marble(ramp, seed) {
      return tex64((x, y) => {
        const n = fbm(x, y, seed, 4, 4);
        const v = Math.abs(Math.sin((x + y * 0.5 + n * 60) / 7));
        const tile = (x % 32 === 0 || y % 32 === 0) ? -3 : 0;
        return C(ramp, 3 + v * 6 + n * 4 + tile);
      });
    },
    hellrock(seed) {
      return tex64((x, y) => {
        const n = fbm(x, y, seed, 4, 4), m = fbm(x, y, seed + 5, 8, 2);
        if (Math.abs(m - 0.5) < 0.012) return C(6, 12 + (n * 3 | 0));
        if (Math.abs(m - 0.5) < 0.03) return C(5, 4);
        return C(14, 2 + n * 7);
      });
    },
    wood(seed) {
      return tex64((x, y) => {
        const plank = x >> 4, px = x & 15;
        if (px === 0) return C(1, 2);
        const n = fbm(x * 4, y * 0.5, seed + plank, 4, 2);
        return C(1, 5 + Math.sin(n * 20) * 1.5 + n * 4 + (px === 1 ? 2 : 0));
      });
    },
    support(seed) {
      return tex64((x, y) => {
        const n = fbm(x, y, seed, 8);
        if (x < 6 || x > 57) return C(0, 3 + (x === 5 || x === 58 ? 3 : 0));
        if (y < 6 || y > 57) { return ((x + y) >> 3) & 1 ? C(7, 11) : C(0, 2); }
        const px = x % 16; if (px === 0) return C(12, 3);
        return C(12, 5 + n * 4 + (px === 1 ? 2 : 0));
      });
    },
    step(seed) {
      return tex64((x, y) => {
        const yy = y & 15;
        if (yy < 3) return ((x >> 2) & 1) ? C(7, 12) : C(0, 2);
        const n = fbm(x, y, seed, 8);
        return C(13, 4 + n * 4 + (yy === 3 ? 4 : 0));
      });
    },
    door(keyRamp, seed) {
      const d = tex64((x, y) => {
        const n = fbm(x, y, seed, 8);
        if (x < 3 || x > 60) return C(0, 3);
        if (x === 31 || x === 32) return C(0, 2);
        const ry = y & 7;
        let s = 6 + n * 3 + (ry === 0 ? 4 : ry === 7 ? -3 : 0);
        return C(13, s);
      });
      if (keyRamp >= 0) {
        for (let y = 0; y < 64; y++) for (let x = 3; x < 61; x++) {
          if (y < 6 || y > 57) d[y * 64 + x] = ((x + y) >> 2) & 1 ? C(keyRamp, 11) : C(keyRamp, 5);
        }
        for (let y = 26; y < 38; y++) for (let x = 25; x < 39; x++) d[y * 64 + x] = (x === 25 || x === 38 || y === 26 || y === 37) ? C(0, 2) : C(keyRamp, 13);
      }
      return d;
    },
    bars(seed) {
      return tex64((x, y) => {
        const bx = x & 15;
        if (y < 4 || y > 59 || (y > 28 && y < 34)) return C(12, 6 + (y & 1) * 3);
        if (bx >= 6 && bx <= 9) return C(13, 5 + (bx === 7 ? 5 : bx === 8 ? 3 : 0));
        return C(0, 1 + (hash2(x, y, seed) * 2 | 0));
      });
    },
    switchTex(on, exit, seed) {
      const d = TG.panel(exit ? 2 : 13, seed, 64);
      for (let y = 14; y < 50; y++) for (let x = 18; x < 46; x++) {
        const edge = x === 18 || x === 45 || y === 14 || y === 49;
        d[y * 64 + x] = edge ? (exit ? ((x + y) >> 1 & 1 ? C(7, 12) : C(0, 2)) : C(0, 2)) : C(0, 3);
      }
      if (exit) glyphInto(d, 'EXIT', 21, 18, on ? C(4, 14) : C(5, 14));
      const ly = on ? 38 : 28;
      for (let y = ly; y < ly + 8; y++) for (let x = 26; x < 38; x++) d[y * 64 + x] = on ? C(4, 13 + (y === ly ? 2 : 0)) : C(5, 12 + (y === ly ? 2 : 0));
      for (let y = 30; y < 46; y++) { d[y * 64 + 31] = C(0, 8); d[y * 64 + 32] = C(0, 10); }
      return d;
    },
    tiles(ramp, seed, sz, s0) {
      sz = sz || 16; s0 = s0 == null ? 6 : s0;
      return tex64((x, y) => {
        const px = x % sz, py = y % sz;
        if (px === 0 || py === 0) return C(0, 3);
        const v = hash2((x / sz) | 0, (y / sz) | 0, seed), n = fbm(x, y, seed, 16, 2);
        return C(ramp, s0 + v * 3 + n * 3 + (px === 1 || py === 1 ? 2 : 0));
      });
    },
    grate(ramp, seed) {
      return tex64((x, y) => {
        const a = (x + y) & 7, b = (x - y + 64) & 7;
        if (a === 0 || b === 0) return C(ramp, 9);
        if (a === 1 || b === 1) return C(ramp, 5);
        return C(0, 1 + (hash2(x, y, seed) * 2 | 0));
      });
    },
    plate(ramp, seed) {
      return tex64((x, y) => {
        const n = fbm(x, y, seed, 8);
        const bx = (x + ((y >> 3) & 1) * 4) & 7, by = y & 7;
        let s = 6 + n * 3;
        if ((bx === 2 && by === 2) || (bx === 3 && by === 3)) s += 4;
        if (x % 32 === 0 || y % 32 === 0) s = 3;
        return C(ramp, s);
      });
    },
    ceilLight(seed) {
      return tex64((x, y) => {
        const px = x & 31, py = y & 31;
        if (px >= 8 && px < 24 && py >= 8 && py < 24) return (px === 8 || py === 8 || px === 23 || py === 23) ? C(0, 6) : C(15, 12 + ((px + py) & 1));
        if (px === 0 || py === 0) return C(0, 3);
        return C(0, 6 + fbm(x, y, seed, 8) * 3);
      });
    },
    dirt(ramp, seed) { return tex64((x, y) => C(ramp, 3 + fbm(x, y, seed, 8, 4) * 7 + hash2(x, y, seed) * 2)); },
    liquid(ramp, seed, frames, hot) {
      const out = [];
      for (let f = 0; f < frames; f++) {
        out.push(tex64((x, y) => {
          const ox = (x + f * 64 / frames) & 63, oy = (y + Math.round(Math.sin(f / frames * TAU) * 3) + 64) & 63;
          const n = fbm(ox, oy, seed, 4, 3), m = fbm((x - f * 64 / frames + 64) & 63, y, seed + 9, 8, 2);
          let s = 4 + n * 7 + m * 4;
          if (hot && n > 0.62) return C(7, 14);
          return C(ramp, s);
        }));
      }
      return out;
    },
    facade(seed) {
      return tex64((x, y) => {
        const wx = x & 15, wy = y & 31;
        const n = fbm(x, y, seed, 8);
        if (wx >= 3 && wx <= 12 && wy >= 6 && wy <= 24) {
          if (wx === 3 || wy === 6) return C(0, 2);
          const lit = hash2(x >> 4, y >> 5, seed) > 0.7;
          if (wx === 8 || wy === 15) return C(2, 5);
          return lit ? C(7, 11 + (n * 3 | 0)) : C(8, 1 + (n * 3 | 0));
        }
        if (wy === 28) return C(2, 11);
        return C(2, 5 + n * 4);
      });
    },
    rust(seed) {
      return tex64((x, y) => {
        const n = fbm(x, y, seed, 8, 3), m = fbm(x, y, seed + 2, 4, 2);
        const rib = (x & 7) < 2 ? 3 : 0;
        return m > 0.55 ? C(12, 3 + n * 6 + rib) : C(13, 4 + n * 4 + rib);
      });
    },
    concrete(seed) {
      return tex64((x, y) => {
        const n = fbm(x, y, seed, 8, 4), c = fbm(x, y, seed + 4, 4, 3);
        if (Math.abs(c - 0.5) < 0.012) return C(0, 2);
        if (y % 32 === 0) return C(0, 4);
        return C(0, 5 + n * 5);
      });
    }
  };
  // sky panoramas (256 x 128)
  function makeSky(kind, seed) {
    const d = new Uint8Array(256 * 128), R = mulberry(seed);
    const hills = [], hills2 = [];
    for (let x = 0; x < 256; x++) {
      hills[x] = 70 + fbm(x / 4, 0, seed, 8, 3) * 40 * Math.sin(x / 256 * TAU * 2) * 0.5 + fbm(x, 3, seed + 1, 16, 2) * 14;
      hills2[x] = 92 + fbm(x / 4, 5, seed + 7, 16, 3) * 26;
    }
    const bld = [];
    for (let x = 0; x < 256;) { const w = 6 + (R() * 14 | 0), h = 30 + R() * 50; for (let i = 0; i < w && x < 256; i++, x++) bld[x] = { h: 128 - h, w, i }; x += R() < 0.3 ? 1 : 0; }
    for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
      let c;
      if (kind === 'night') {
        c = C(13, 1 + y / 40 + fbm(x, y, seed, 8, 2) * 1.5);
        if (hash2(x, y, seed) > 0.994) c = C(15, 10 + (hash2(y, x, seed) * 5 | 0));
        if (y > hills[x]) c = C(1, 1 + (y - hills[x]) / 18 + fbm(x, y, seed + 3, 16) * 2);
        if (y > hills2[x]) c = C(0, 1 + fbm(x, y, seed + 4, 16) * 2);
      } else if (kind === 'hell') {
        c = C(5, 2 + y / 22 + fbm(x, y, seed, 4, 3) * 4);
        if (y > hills[x]) c = C(14, 1 + fbm(x, y, seed + 3, 16) * 3);
        if (y > hills2[x]) c = C(0, 1 + fbm(x, y, seed + 4, 16) * 1.5);
      } else {
        c = C(6, 2 + y / 20 + fbm(x, y, seed, 4, 3) * 3);
        if (y < 30) c = C(1, 3 + y / 10 + fbm(x, y, seed + 2, 4, 3) * 3);
        const b = bld[x];
        if (b && y > b.h) {
          c = C(0, 1 + (b.i === 0 ? 1 : 0));
          if (y > b.h + 3 && (b.i & 1) && ((y - b.h) & 3) === 1 && hash2(x, y, seed) > 0.6) c = C(7, 9);
        }
      }
      d[y * 256 + x] = c;
    }
    return d;
  }

  // ---------- sprite primitives ----------
  function Spr(w, h) { return { w, h, d: new Uint8Array(w * h), full: false }; }
  function sp(s, x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < s.w && y < s.h) s.d[y * s.w + x] = c; }
  function srect(s, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) sp(s, x + i, y + j, c); }
  function sball(s, cx, cy, rx, ry, ramp, base, spread) {
    spread = spread == null ? 4 : spread;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, q = nx * nx + ny * ny;
      if (q <= 1) sp(s, x, y, C(ramp, base + Math.round((-nx * 0.5 - ny * 0.7 + (1 - q) * 0.6) * spread)));
    }
  }
  function sline(s, x0, y0, x1, y1, c, th) {
    th = th || 1; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; srect(s, Math.round(x - th / 2), Math.round(y - th / 2), th, th, c); }
  }
  function slimb(s, x0, y0, x1, y1, th, ramp, base) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let i = 0; i <= n; i++) { const t = i / n; sball(s, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, th / 2, th / 2, ramp, base, 3); }
  }
  function soutline(s, c) {
    const o = Spr(s.w, s.h); o.d.set(s.d); o.full = s.full;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      if (s.d[y * s.w + x]) continue;
      if ((x > 0 && s.d[y * s.w + x - 1]) || (x < s.w - 1 && s.d[y * s.w + x + 1]) || (y > 0 && s.d[(y - 1) * s.w + x]) || (y < s.h - 1 && s.d[(y + 1) * s.w + x])) o.d[y * s.w + x] = c || C(0, 1);
    }
    return o;
  }
  function smirror(s) { const o = Spr(s.w, s.h); o.full = s.full; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) o.d[y * s.w + x] = s.d[y * s.w + s.w - 1 - x]; return o; }
  function stint(s, add) { const o = Spr(s.w, s.h); o.full = s.full; for (let i = 0; i < s.d.length; i++) { const v = s.d[i]; o.d[i] = v ? C(v >> 4, (v & 15) + add) : 0; } return o; }
  function ssquash(s, k, add) {
    const h2 = Math.max(2, Math.round(s.h * k)), o = Spr(s.w + 4, s.h);
    for (let y = 0; y < h2; y++) for (let x = 0; x < s.w; x++) {
      const v = s.d[Math.min(s.h - 1, Math.floor(y / h2 * s.h)) * s.w + x];
      const xx = x + 2 + Math.round((1 - k) * (x - s.w / 2) * 0.3);
      if (v) sp(o, xx, s.h - h2 + y, C(v >> 4, (v & 15) + add));
    }
    return o;
  }
  // monster frame set from a draw(frame) function: 0,1 walk, 2 windup, 3 fire
  function monsterFrames(draw, w, h) {
    const f = [];
    for (let i = 0; i < 4; i++) { const s = Spr(w, h); draw(s, i); f.push(soutline(s)); }
    const pain = stint(f[0], 3);
    return { walk: [f[0], f[1]], wind: f[2], fire: f[3], pain, die: [ssquash(f[0], 0.75, -1), ssquash(f[0], 0.45, -2), ssquash(f[0], 0.18, -3)] };
  }

  // ---------- common monsters (original designs) ----------
  // Husk trooper family: hollow-eyed station crew in salvaged armour with a glowing slit visor.
  function drawTrooper(o) {
    return function (s, f) {
      const cx = s.w / 2, legA = f === 1 ? 2 : f === 0 ? -2 : 0, bulk = o.bulk || 0;
      // legs
      slimb(s, cx - 3, 28, cx - 4 - legA * 0.5, 40 + Math.max(0, legA), 4, o.leg, 5);
      slimb(s, cx + 3, 28, cx + 4 + legA * 0.5, 40 + Math.max(0, -legA), 4, o.leg, 5);
      srect(s, cx - 7 - legA * 0.5, 41 + Math.max(0, legA), 5, 3, C(0, 3));
      srect(s, cx + 2 + legA * 0.5, 41 + Math.max(0, -legA), 5, 3, C(0, 3));
      // torso + vest
      sball(s, cx, 21, 7 + bulk, 9, o.body, 6);
      srect(s, cx - 5 - bulk, 16, 10 + bulk * 2, 9, C(o.armor, 7));
      srect(s, cx - 5 - bulk, 16, 10 + bulk * 2, 1, C(o.armor, 11));
      srect(s, cx - 1, 17, 2, 7, C(o.armor, 4));
      srect(s, cx - 6 - bulk, 27, 12 + bulk * 2, 2, C(1, 3));
      sball(s, cx - 7 - bulk, 15, 3, 2.5, o.armor, 8); sball(s, cx + 7 + bulk, 15, 3, 2.5, o.armor, 8);
      // head
      sball(s, cx, 9, 5, 5.5, o.helm, 7);
      srect(s, cx - 4, 8, 9, 2, C(o.visor, 14));
      srect(s, cx - 3, 12, 6, 2, C(0, 6));
      // arms + weapon
      if (f < 2) {
        slimb(s, cx - 8 - bulk, 16, cx - 6, 25, 3, o.body, 5);
        slimb(s, cx + 8 + bulk, 16, cx + 5, 24, 3, o.body, 5);
        sline(s, cx - 7, 27, cx + 8, 19, C(0, 4), o.gunW || 2);
        sp(s, cx + 8, 18, C(0, 7));
      } else {
        slimb(s, cx - 8 - bulk, 16, cx - 2, 22, 3, o.body, 5);
        slimb(s, cx + 8 + bulk, 16, cx + 2, 22, 3, o.body, 5);
        srect(s, cx - 2 - (o.gunW || 2), 18, 4 + (o.gunW || 2) * 2, 6, C(0, 4));
        srect(s, cx - 1, 19, 2, 3, C(0, 1));
        if (o.rotary) { sball(s, cx, 21, 5, 5, 0, 6, 4); for (let k = 0; k < 4; k++) sp(s, cx - 2 + (k & 1) * 3, 19 + (k >> 1) * 3, C(0, 1)); }
        if (f === 3) { sball(s, cx, 19, 5, 4, 7, 13, 2); sball(s, cx, 19, 2.5, 2, 15, 14, 1); }
      }
    };
  }
  function drawWretch(s, f) {
    const cx = s.w / 2, lg = f === 1 ? 2 : f === 0 ? -2 : 0;
    slimb(s, cx - 4, 30, cx - 6 - lg, 44, 4, 1, 2); slimb(s, cx + 4, 30, cx + 6 - lg, 44, 4, 1, 2);
    sball(s, cx, 24, 8, 10, 1, 2, 3);
    sball(s, cx, 16, 9, 6, 1, 3, 3);
    for (let i = 0; i < 40; i++) { const x = cx - 7 + hash2(i, 1, 9) * 14, y = 14 + hash2(i, 2, 9) * 18; if (hash2(i, 3, 9) > 0.4) sp(s, x, y, C(6, 12 + (i & 3))); }
    for (let i = -2; i <= 2; i++) sline(s, cx + i * 3, 10, cx + i * 4, 6 - (2 - Math.abs(i)), C(1, 7), 1);
    sball(s, cx, 13, 4, 3.5, 1, 3, 2);
    srect(s, cx - 3, 12, 2, 1, C(7, 15)); srect(s, cx + 1, 12, 2, 1, C(7, 15)); srect(s, cx - 1, 14, 2, 1, C(7, 15));
    if (f < 2) {
      slimb(s, cx - 9, 16, cx - 11, 33, 3, 1, 3); slimb(s, cx + 9, 16, cx + 11 - lg, 33, 3, 1, 3);
      sline(s, cx - 12, 33, cx - 13, 36, C(0, 10)); sline(s, cx + 12, 33, cx + 13, 36, C(0, 10));
    } else {
      slimb(s, cx - 9, 16, cx - 11, 32, 3, 1, 3);
      slimb(s, cx + 9, 16, cx + 10, 4, 3, 1, 3);
      sball(s, cx + 10, 3 + (f === 3 ? 0 : 1), f === 3 ? 4 : 3, f === 3 ? 3.5 : 3, 6, 12, 3);
      sball(s, cx + 10, 3, 1.5, 1.5, 15, 14, 1);
    }
  }
  function drawGnasher(s, f) {
    const cx = s.w / 2, lg = f === 1 ? 2 : f === 0 ? -2 : 0, open = f >= 2 ? 3 : 0;
    for (let i = 0; i < 4; i++) { const lx = cx - 13 + i * 8.5, d = (i & 1 ? lg : -lg); slimb(s, lx, 22, lx + d * 0.5, 30, 5, 12, 3); srect(s, lx - 3 + d * 0.5, 30, 6, 2, C(0, 3)); }
    sball(s, cx, 17, 17, 9, 12, 6);
    for (let i = 0; i < 4; i++) sball(s, cx - 10 + i * 7, 10, 5, 3, 13, 7, 3);
    sball(s, cx, 20, 10, 7 + open * 0.5, 12, 7);
    srect(s, cx - 8, 19 - open * 0.5, 16, 5 + open, C(5, 2));
    for (let i = 0; i < 8; i++) { sp(s, cx - 7 + i * 2, 19 - open * 0.5, C(0, 14)); sp(s, cx - 7 + i * 2, 23 + open * 0.5, C(0, 13)); }
    sline(s, cx - 9, 22, cx - 12, 15, C(2, 13), 2); sline(s, cx + 9, 22, cx + 12, 15, C(2, 13), 2);
    srect(s, cx - 5, 14, 2, 2, C(7, 15)); srect(s, cx + 3, 14, 2, 2, C(7, 15));
  }
  function drawWatcher(s, f) {
    const cx = s.w / 2, wig = f & 1 ? 1 : -1;
    for (let k = -1; k <= 1; k++) { let x = cx + k * 6, y = 22; for (let j = 0; j < 8; j++) { const nx = x + Math.sin(j * 0.8 + k + wig) * 1.5, ny = y + 1.2; sline(s, x, y, nx, ny, C(10, 6 - (j >> 2)), 2); x = nx; y = ny; } }
    sball(s, cx, 13, 12, 11, 13, 7);
    for (let a = 0; a < 6; a++) { const an = a / 6 * TAU + 0.3; sline(s, cx + Math.cos(an) * 6, 13 + Math.sin(an) * 6, cx + Math.cos(an) * 11, 13 + Math.sin(an) * 10, C(13, 3), 1); }
    sball(s, cx, 13, 7, 7, 0, 1, 1);
    const glow = f >= 2;
    sball(s, cx, 13, glow ? 6 : 5, glow ? 6 : 5, glow ? 15 : 9, glow ? 13 : 11, 3);
    sball(s, cx + 1, 13, 2, 2, 0, 1, 0);
    sp(s, cx - 2, 11, C(15, 15));
  }
  function drawWarden(s, f) {
    const cx = s.w / 2, lg = f === 1 ? 3 : f === 0 ? -3 : 0;
    slimb(s, cx - 7, 38, cx - 8, 57 + Math.min(0, lg) * 0, 8, 12, 4); slimb(s, cx + 7, 38, cx + 8, 57, 8, 12, 4);
    srect(s, cx - 13 + lg * 0.3, 55, 10, 5, C(0, 3)); srect(s, cx + 3 - lg * 0.3, 55, 10, 5, C(0, 3));
    for (let y = 16; y < 40; y++) { const hw = 13 - (y - 16) * 0.2; for (let x = -hw; x <= hw; x++) sp(s, cx + x, y, C(13, 5 + (y < 20 ? 4 : 0) - Math.abs(x) / hw * 2 + (hash2(x | 0, y, 3) * 2 | 0))); }
    for (let y = 18; y < 38; y += 5) sline(s, cx - 10, y, cx + 10, y, C(13, 3), 1);
    sball(s, cx, 26, 4, 4, 4, f >= 2 ? 15 : 12, 2);
    sball(s, cx - 15, 17, 6, 5, 12, 7); sball(s, cx + 15, 17, 6, 5, 12, 7);
    sball(s, cx, 11, 6, 6, 13, 6);
    srect(s, cx - 3, 10, 6, 2, C(7, 15));
    const up = f >= 2 ? -6 : 0;
    srect(s, cx - 20, 20 + up, 7, 14, C(0, 5)); srect(s, cx + 13, 20 + up, 7, 14, C(0, 5));
    srect(s, cx - 19, 33 + up, 5, 2, f === 3 ? C(4, 15) : C(0, 1)); srect(s, cx + 14, 33 + up, 5, 2, f === 3 ? C(4, 15) : C(0, 1));
    if (f === 3) { sball(s, cx - 16.5, 36 + up, 4, 3, 4, 14, 1); sball(s, cx + 16.5, 36 + up, 4, 3, 4, 14, 1); }
  }
  function drawColossus(s, f) {
    const cx = s.w / 2, lg = f === 1 ? 4 : f === 0 ? -4 : 0;
    slimb(s, cx - 14, 58, cx - 16 + lg * 0.5, 84, 12, 0, 4); slimb(s, cx + 14, 58, cx + 16 - lg * 0.5, 84, 12, 0, 4);
    srect(s, cx - 25 + lg * 0.5, 82, 18, 6, C(0, 2)); srect(s, cx + 7 - lg * 0.5, 82, 18, 6, C(0, 2));
    sball(s, cx, 40, 26, 24, 12, 6);
    for (let y = 34; y < 56; y++) for (let x = -13; x <= 13; x++) {
      if (y < 36 || y > 53 || Math.abs(x) > 11) { sp(s, cx + x, y, C(0, 3)); continue; }
      sp(s, cx + x, y, (x & 3) === 0 ? C(0, 2) : C(6, 9 + ((hash2(x, y, f) * 5) | 0)));
    }
    sball(s, cx, 16, 9, 7, 12, 7);
    for (let i = -1; i <= 1; i++) srect(s, cx + i * 5 - 1, 15, 3, 2, C(5, 15));
    sline(s, cx - 18, 18, cx - 22, 2, C(0, 4), 4); sline(s, cx + 18, 18, cx + 22, 2, C(0, 4), 4);
    const up = f >= 2 ? -3 : 0;
    for (const sd of [-1, 1]) {
      const px = cx + sd * 30;
      srect(s, px - 8, 22 + up, 16, 16, C(13, 6)); srect(s, px - 8, 22 + up, 16, 2, C(13, 10));
      for (let i = 0; i < 4; i++) { const hx = px - 5 + (i & 1) * 7, hy = 26 + up + (i >> 1) * 7; srect(s, hx, hy, 4, 4, f === 3 ? C(7, 15) : C(0, 1)); }
      slimb(s, cx + sd * 22, 30, px, 40, 7, 12, 5);
    }
  }

  // ---------- items / fx sprites ----------
  function itemSprites(extra) {
    const I = {};
    let s;
    s = Spr(10, 8); srect(s, 0, 2, 10, 6, C(1, 5)); for (let i = 0; i < 4; i++) srect(s, 1 + i * 2, 0, 1, 3, C(7, 12)); I.clip = soutline(s);
    s = Spr(18, 12); srect(s, 0, 2, 18, 10, C(3, 5)); srect(s, 0, 2, 18, 2, C(3, 9)); srect(s, 4, 6, 10, 3, C(7, 11)); I.bullets = soutline(s);
    s = Spr(12, 9); for (let i = 0; i < 4; i++) { srect(s, i * 3, 0, 2, 6, C(5, 8)); srect(s, i * 3, 6, 2, 3, C(7, 10)); } I.shells = soutline(s);
    s = Spr(18, 12); srect(s, 0, 2, 18, 10, C(5, 5)); srect(s, 0, 2, 18, 2, C(5, 9)); srect(s, 3, 6, 12, 3, C(0, 12)); I.shellbox = soutline(s);
    s = Spr(6, 20); srect(s, 1, 4, 4, 14, C(13, 7)); sball(s, 3, 3, 2, 3, 5, 9); srect(s, 0, 17, 6, 3, C(0, 5)); I.rocket = soutline(s);
    s = Spr(22, 14); srect(s, 0, 2, 22, 12, C(1, 4)); srect(s, 0, 2, 22, 2, C(1, 8)); for (let i = 0; i < 5; i++) sball(s, 3 + i * 4, 1, 1.5, 2, 5, 9); I.rocketbox = soutline(s);
    s = Spr(10, 10); srect(s, 0, 2, 10, 8, C(13, 5)); srect(s, 2, 4, 6, 4, C(9, 13)); srect(s, 3, 0, 4, 2, C(0, 8)); I.cell = soutline(s);
    s = Spr(18, 16); srect(s, 0, 3, 18, 13, C(13, 5)); srect(s, 2, 5, 14, 8, C(9, 12)); srect(s, 2, 8, 14, 2, C(15, 14)); srect(s, 6, 0, 6, 3, C(0, 8)); I.cellpack = soutline(s);
    s = Spr(12, 10); srect(s, 0, 1, 12, 9, C(0, 13)); srect(s, 5, 2, 2, 7, C(8, 10)); srect(s, 2, 4, 8, 3, C(8, 10)); I.stim = soutline(s);
    s = Spr(20, 14); srect(s, 0, 2, 20, 12, C(0, 13)); srect(s, 0, 2, 20, 2, C(0, 15)); srect(s, 8, 4, 4, 9, C(8, 10)); srect(s, 5, 7, 10, 3, C(8, 10)); I.medikit = soutline(s);
    s = Spr(8, 12); sball(s, 4, 8, 3.5, 4, 8, 11); srect(s, 3, 0, 2, 4, C(0, 10)); I.vial = soutline(s); I.vial.full = true;
    s = Spr(10, 10); for (let y = 0; y < 10; y++) { const hw = y < 5 ? 4.5 : 4.5 - (y - 5); srect(s, 5 - hw, y, hw * 2, 1, C(7, 9 + (y < 3 ? 3 : 0))); } I.shard = soutline(s); I.shard.full = true;
    const vest = ramp => { const v = Spr(22, 18); sball(v, 11, 9, 10, 9, ramp, 7); srect(v, 9, 0, 4, 6, 0); srect(v, 10, 4, 2, 13, C(ramp, 3)); sball(v, 3, 3, 3, 3, ramp, 9); sball(v, 19, 3, 3, 3, ramp, 9); return soutline(v); };
    I.armor1 = vest(3); I.armor2 = vest(8);
    s = Spr(16, 16); sball(s, 8, 8, 7.5, 7.5, 9, 10); sball(s, 6, 6, 3, 3, 15, 13); I.orb = soutline(s); I.orb.full = true;
    s = Spr(16, 16); sball(s, 8, 8, 7.5, 7.5, 7, 11); sball(s, 8, 8, 4, 4, 15, 14); I.goldorb = soutline(s); I.goldorb.full = true;
    s = Spr(14, 22); slimb(s, 7, 6, 7, 16, 9, 7, 8); sball(s, 7, 4, 4, 4, 7, 9); srect(s, 5, 3, 4, 2, C(0, 2)); slimb(s, 4, 18, 4, 21, 3, 7, 7); slimb(s, 10, 18, 10, 21, 3, 7, 7); I.radsuit = soutline(s);
    s = Spr(14, 12); srect(s, 0, 2, 14, 10, C(0, 4)); srect(s, 0, 5, 14, 3, C(5, 10)); I.berserk = soutline(s);
    s = Spr(16, 12); srect(s, 0, 0, 16, 12, C(0, 5)); srect(s, 2, 2, 12, 8, C(4, 6)); sline(s, 3, 8, 8, 4, C(4, 14)); sline(s, 8, 4, 12, 7, C(4, 14)); I.map = soutline(s); I.map.full = true;
    s = Spr(16, 16); sball(s, 8, 9, 7, 7, 1, 6); srect(s, 4, 1, 8, 4, C(1, 4)); srect(s, 5, 8, 6, 2, C(1, 3)); I.backpack = soutline(s);
    const card = ramp => { const c = Spr(10, 8); srect(c, 0, 0, 10, 8, C(ramp, 10)); srect(c, 0, 2, 10, 2, C(0, 14)); srect(c, 6, 5, 3, 2, C(ramp, 14)); const o = soutline(c); o.full = true; return o; };
    I.keyB = card(8); I.keyY = card(7); I.keyR = card(5);
    // weapon pickups (side views)
    const gun = (len, h, ramp, extra2) => { const g = Spr(len + 2, h + 6); srect(g, 0, 2, len, h, C(ramp, 6)); srect(g, 0, 2, len, 1, C(ramp, 10)); srect(g, len - 10, 2 + h, 4, 4, C(1, 5)); if (extra2) extra2(g); return soutline(g); };
    I.wShotgun = gun(30, 3, 0, g => srect(g, 6, 5, 8, 2, C(1, 7)));
    I.wChaingun = gun(28, 6, 0, g => { for (let i = 0; i < 3; i++) srect(g, 0, 3 + i * 2, 10, 1, C(0, 10)); });
    I.wRocket = gun(32, 7, 3, g => srect(g, 0, 3, 3, 5, C(0, 1)));
    I.wPlasma = gun(26, 7, 13, g => { for (let i = 0; i < 4; i++) srect(g, 6 + i * 4, 3, 2, 5, C(9, 13)); });
    I.wBig = gun(34, 10, 13, g => { sball(g, 18, 7, 4, 4, 4, 13); srect(g, 0, 4, 4, 6, C(4, 12)); });
    I.wDouble = gun(30, 4, 0, g => { srect(g, 0, 4, 22, 1, C(0, 2)); srect(g, 14, 6, 10, 2, C(1, 6)); });
    // decorations
    s = Spr(14, 18); sball(s, 7, 9, 7, 9, 12, 6); srect(s, 0, 6, 14, 3, C(7, 11)); srect(s, 0, 7, 14, 1, C(0, 2)); srect(s, 0, 0, 14, 2, C(12, 9)); I.canister = soutline(s);
    s = Spr(10, 40); srect(s, 4, 6, 2, 32, C(13, 7)); srect(s, 2, 36, 6, 4, C(0, 4)); sball(s, 5, 4, 4, 4, 15, 13); I.lamp = soutline(s); I.lamp.full = true;
    const brz = []; for (let k = 0; k < 2; k++) { s = Spr(14, 26); srect(s, 5, 12, 4, 12, C(0, 5)); srect(s, 2, 22, 10, 4, C(0, 4)); srect(s, 1, 10, 12, 3, C(0, 6)); for (let i = 0; i < 26; i++) { const x = 2 + hash2(i, k, 4) * 10, y = 2 + hash2(i, k, 5) * 9; sball(s, x, y, 2, 2, hash2(i, k, 6) > 0.5 ? 6 : 7, 12, 2); } const o = soutline(s); o.full = true; brz.push(o); } I.brazier = brz;
    s = Spr(12, 34); srect(s, 2, 0, 8, 34, C(13, 6)); srect(s, 2, 0, 1, 34, C(13, 10)); for (let y = 4; y < 30; y += 6) srect(s, 4, y, 4, 2, C(9, 14)); I.column = soutline(s);
    return I;
  }
  function fxSprites() {
    const F = {}; let s;
    const ballF = (r, ramp, base) => { const b = Spr(r * 2 + 2, r * 2 + 2); sball(b, r + 1, r + 1, r, r, ramp, base, 3); sball(b, r + 0.5, r + 0.5, r * 0.45, r * 0.45, 15, 14, 1); b.full = true; return b; };
    F.fire = [ballF(4, 6, 12), ballF(5, 6, 11)];
    F.orb = [ballF(4, 10, 12), ballF(4, 9, 12)];
    F.bolt = [ballF(4, 4, 12), ballF(5, 4, 11)];
    F.plasma = [ballF(3, 9, 13), ballF(3, 8, 13)];
    F.bigball = [ballF(9, 4, 12), ballF(10, 4, 11)];
    F.acid = [ballF(3, 4, 10), ballF(3, 3, 11)];
    F.seeker = [ballF(4, 10, 11), ballF(4, 5, 12)];
    s = Spr(8, 8); sball(s, 4, 4, 2, 3.5, 13, 9); sball(s, 4, 7, 2, 1.5, 7, 14); s.full = true; F.rocket = [s, s];
    F.boom = [];
    for (let k = 0; k < 4; k++) {
      const b = Spr(48, 48), R = mulberry(11 + k);
      for (let i = 0; i < 16; i++) {
        const a = R() * TAU, d = R() * (4 + k * 4.5), r = 4.5 + R() * (3 + k * 2.2);
        const ramp = k === 3 ? (i & 1 ? 0 : 14) : k === 2 ? (i % 3 ? 5 : 6) : (i % 3 ? 6 : 7);
        sball(b, 24 + Math.cos(a) * d, 24 + Math.sin(a) * d, r, r, ramp, k === 3 ? 4 : 11 - k, 3);
      }
      if (k < 2) sball(b, 24, 24, 6 - k * 2, 6 - k * 2, 15, 14, 1);
      b.full = k < 3; F.boom.push(b);
    }
    const puff = (r, sh) => { const p = Spr(r * 2 + 2, r * 2 + 2); sball(p, r + 1, r + 1, r, r, 0, sh, 3); return p; };
    F.puff = [puff(2, 13), puff(3, 10), puff(3, 7)];
    const spark = (ramp, r, seed) => { const p = Spr(16, 16), R = mulberry(seed); for (let i = 0; i < 9; i++) { const a = R() * TAU, d = R() * r; sp(p, 8 + Math.cos(a) * d, 8 + Math.sin(a) * d, C(ramp, 12 + (R() * 4 | 0))); } sp(p, 8, 8, C(15, 15)); p.full = true; return p; };
    F.hit = [spark(7, 3, 1), spark(6, 5, 2), spark(12, 7, 3)];
    F.tele = [spark(4, 6), spark(4, 8), spark(9, 6)];
    return F;
  }

  // ---------- first-person weapon views (original designs) ----------
  function weaponViews() {
    const V = {};
    const glove = (s, x, y, r) => {
      slimb(s, x, y + r * 0.4, x + r * 0.15, y + r * 2.2, r * 1.3, 3, 5);
      srect(s, x - r * 0.65, y + r * 0.55, r * 1.3, 2, C(13, 9));
      sball(s, x, y, r * 0.95, r * 0.72, 0, 6, 3);
      for (let i = 0; i < 4; i++) sball(s, x - r * 0.62 + i * r * 0.41, y - r * 0.45, r * 0.24, r * 0.3, 0, 8, 2);
      sball(s, x + r * 0.85, y + r * 0.05, r * 0.25, r * 0.4, 0, 7, 2);
    };
    const flash = (r, ramp) => { const f = Spr(r * 2 + 4, r * 2 + 4); for (let a = 0; a < 10; a++) { const an = a / 10 * TAU; sline(f, r + 2, r + 2, r + 2 + Math.cos(an) * r * (a & 1 ? 0.6 : 1), r + 2 + Math.sin(an) * r * (a & 1 ? 0.6 : 1), C(ramp, 13), 2); } sball(f, r + 2, r + 2, r * 0.55, r * 0.55, 15, 14, 1); f.full = true; return f; };
    let s;
    // fist
    const fist = []; s = Spr(80, 50); glove(s, 58, 34, 16); slimb(s, 66, 46, 76, 50, 12, 3, 5); fist.push(soutline(s));
    s = Spr(80, 60); glove(s, 40, 26, 20); slimb(s, 46, 40, 56, 60, 14, 3, 5); fist.push(soutline(s));
    V.fist = { img: fist, flash: null };
    // pistol
    const pis = []; for (let k = 0; k < 2; k++) { s = Spr(40, 56); srect(s, 14, 6 + k * 3, 12, 30, C(0, 5)); srect(s, 14, 6 + k * 3, 12, 2, C(0, 10)); srect(s, 18, 6 + k * 3, 4, 1, C(0, 1)); srect(s, 15, 10 + k * 3, 1, 24, C(0, 8)); glove(s, 20, 42, 12); slimb(s, 20, 50, 22, 56, 12, 3, 5); pis.push(soutline(s)); }
    V.pistol = { img: pis, flash: flash(7, 7), fy: 4 };
    // shotgun
    const sg = []; for (let k = 0; k < 3; k++) { s = Spr(56, 64); const dy = k === 1 ? 4 : 0; srect(s, 24, 4 + dy, 8, 40, C(0, 6)); srect(s, 25, 4 + dy, 2, 40, C(0, 10)); srect(s, 26, 4 + dy, 4, 2, C(0, 1)); srect(s, 21, 28 + dy + (k === 2 ? 8 : 0), 14, 12, C(1, 6)); for (let i = 0; i < 5; i++) srect(s, 21, 30 + dy + i * 2 + (k === 2 ? 8 : 0), 14, 1, C(1, 4)); srect(s, 20, 44 + dy, 16, 10, C(0, 4)); glove(s, 28, 54 + dy, 11); sg.push(soutline(s)); }
    V.shotgun = { img: sg, flash: flash(9, 6), fy: 0 };
    // double
    const db = []; for (let k = 0; k < 3; k++) { s = Spr(70, 64); const dy = k === 1 ? 5 : k === 2 ? 14 : 0; srect(s, 22, 6 + dy, 12, 36, C(0, 6)); srect(s, 36, 6 + dy, 12, 36, C(0, 6)); srect(s, 25, 6 + dy, 6, 3, C(0, 1)); srect(s, 39, 6 + dy, 6, 3, C(0, 1)); srect(s, 23, 6 + dy, 2, 36, C(0, 10)); srect(s, 37, 6 + dy, 2, 36, C(0, 10)); srect(s, 20, 40 + dy, 30, 14, C(1, 5)); srect(s, 20, 40 + dy, 30, 2, C(1, 8)); glove(s, 35, 56 + dy, 12); db.push(soutline(s)); }
    V.double = { img: db, flash: flash(13, 6), fy: 0 };
    // chaingun
    const cg = []; for (let k = 0; k < 2; k++) { s = Spr(64, 60); sball(s, 32, 40, 18, 14, 13, 6); for (let i = 0; i < 4; i++) { const ox = 32 + Math.cos((i + k * 0.5) / 4 * TAU) * 7; srect(s, ox - 2, 6, 4, 32, C(0, 5 + (i & 1) * 3)); } sball(s, 32, 8, 9, 4, 0, 4); sball(s, 32, 8, 5, 2, 0, 1, 0); srect(s, 16, 42, 32, 4, C(7, 10)); glove(s, 18, 52, 10); glove(s, 46, 52, 10); cg.push(soutline(s)); }
    V.chaingun = { img: cg, flash: flash(11, 7), fy: 0 };
    // rocket launcher
    const rl = []; for (let k = 0; k < 2; k++) { s = Spr(72, 62); const dy = k * 4; sball(s, 36, 30 + dy, 16, 30, 3, 5); sball(s, 36, 8 + dy, 12, 6, 0, 2, 2); sball(s, 36, 8 + dy, 8, 4, 0, 1, 0); srect(s, 20, 20 + dy, 32, 3, C(7, 9)); srect(s, 50, 16 + dy, 8, 10, C(0, 6)); glove(s, 34, 52 + dy, 12); rl.push(soutline(s)); }
    V.rocket = { img: rl, flash: flash(12, 6), fy: 0 };
    // plasma coil rifle
    const pl = []; for (let k = 0; k < 2; k++) { s = Spr(64, 60); srect(s, 18, 10, 28, 38, C(13, 6)); srect(s, 18, 10, 28, 2, C(13, 11)); for (let i = 0; i < 6; i++) srect(s, 20, 14 + i * 5, 24, 2, C(9, k ? 15 : 12)); srect(s, 26, 4, 12, 8, C(0, 4)); srect(s, 29, 4, 6, 3, C(9, 14)); glove(s, 32, 50, 12); const o = soutline(s); pl.push(o); }
    V.plasma = { img: pl, flash: flash(10, 9), fy: 0 };
    // big energy gun
    const bg = []; for (let k = 0; k < 2; k++) { s = Spr(90, 64); sball(s, 45, 36, 32, 22, 13, 6); srect(s, 20, 16, 50, 26, C(13, 5)); srect(s, 20, 16, 50, 2, C(13, 10)); sball(s, 45, 12, 14, 8, 0, 3, 2); sball(s, 45, 12, 9, 5, 4, k ? 15 : 12, 2); for (let i = 0; i < 3; i++) { srect(s, 24 + i * 6, 24, 3, 12, C(4, 13)); srect(s, 58 + i * 4, 24, 2, 12, C(4, 13)); } glove(s, 26, 54, 11); glove(s, 64, 54, 11); bg.push(soutline(s)); }
    V.big = { img: bg, flash: flash(16, 4), fy: 0 };
    return V;
  }
  // ---------- status-bar face: an original sealed-helmet marine whose visor shows LED eyes ----------
  function faceSprite(tier, look, mood) {
    const s = Spr(24, 30);
    sball(s, 12, 15, 11, 13.5, 3, 7);
    srect(s, 2, 9, 20, 11, C(0, 2));
    for (let x = 3; x < 21; x++) sp(s, x, 9, C(0, 1)), sp(s, x, 19, C(13, 6));
    for (let y = 10; y < 19; y++) for (let x = 3; x < 21; x++) sp(s, x, y, C(8, 1 + ((x + y) % 7 === 0 ? 1 : 0)));
    srect(s, 8, 22, 8, 1, C(0, 3)); srect(s, 8, 24, 8, 1, C(0, 3)); srect(s, 8, 26, 8, 1, C(0, 3));
    srect(s, 10, 2, 4, 2, tier >= 4 ? C(5, 13) : C(4, 12));
    const eye = mood === 'god' ? C(7, 15) : mood === 'dead' ? C(5, 13) : C(9, 14);
    const lx = 7 + look * 2, rx = 15 + look * 2;
    if (mood === 'dead') { for (const ex of [7, 15]) { sline(s, ex - 2, 12, ex + 2, 16, eye); sline(s, ex + 2, 12, ex - 2, 16, eye); } }
    else if (mood === 'hurt') { sline(s, lx - 2, 12, lx + 1, 14, eye); sline(s, lx + 1, 14, lx - 2, 16, eye); sline(s, rx + 2, 12, rx - 1, 14, eye); sline(s, rx - 1, 14, rx + 2, 16, eye); }
    else if (mood === 'angry') { sline(s, lx - 2, 12, lx + 2, 14, eye); srect(s, lx - 1, 15, 3, 1, eye); sline(s, rx + 2, 12, rx - 2, 14, eye); srect(s, rx - 1, 15, 3, 1, eye); }
    else if (mood === 'grin') { for (const ex of [lx, rx]) { sp(s, ex - 2, 15, eye); sp(s, ex - 1, 14, eye); sp(s, ex, 13, eye); sp(s, ex + 1, 14, eye); sp(s, ex + 2, 15, eye); } }
    else if (mood === 'god') { srect(s, 4, 13, 16, 3, eye); }
    else { srect(s, lx - 1, 13, 3, 3 - (tier >= 3 ? 1 : 0), eye); srect(s, rx - 1, 13, 3, 3 - (tier >= 3 ? 1 : 0), eye); }
    const R = mulberry(tier * 7 + 3);
    for (let i = 0; i < tier * 3; i++) { const x = 3 + R() * 18, y = 2 + R() * 26; if (y > 8 && y < 20) continue; sline(s, x, y, x + R() * 4 - 2, y + R() * 3, C(3, 3)); }
    if (tier >= 2) { sline(s, 16, 10, 19, 15, C(0, 9)); sline(s, 19, 15, 17, 18, C(0, 9)); }
    if (tier >= 3) { sline(s, 5, 10, 9, 17, C(0, 10)); sline(s, 9, 17, 12, 18, C(0, 9)); }
    return soutline(s);
  }

  // ===================================================================================
  //  Game content: Doom (1993) - an original episode on the moon station Nyx-4.
  // ===================================================================================
  const GAME = {
    id: 'doom', title: 'Doom', year: 1993, maker: 'id Software',
    marquee: { bg: '#1a0804', fg: '#ff3a12', accent: '#ffb020' },
    logo: 'DOOM', logoRamp: 6, logoRamp2: 14, subtitle: 'EPISODE ONE: THE NYX-4 RIFT',
    titleMon: 'colossus', titleMon2: 'wretch', levelPrefix: 'LEVEL', hiDefault: 20000, demoLevel: 0, musicBase: 82.4,
    bossDeadMsg: 'THE FOUNDRY COLOSSUS IS DESTROYED!',
    riffs: [
      [0, 0, 12, 0, 10, 0, 7, 0, 0, 0, 12, 0, 5, 6, 7, null],
      [0, null, 0, 3, 5, null, 3, 0, 7, null, 6, 5, 3, null, 0, null],
      [0, 0, 0, 12, 0, 0, 10, 0, 0, 0, 8, 0, 7, 0, 5, 3]
    ],
    tips: ['WALK INTO DOORS AND SWITCHES TO USE THEM', 'TAB, M OR ENTER SHOWS THE AUTOMAP', 'HOLD SHIFT TO RUN, Z OR A/D TO STRAFE', 'SOME WALLS HIDE SECRET ROOMS', 'X CYCLES WEAPONS - 1 TO 7 SELECT', 'HAZARD SUITS PROTECT FROM NUKAGE'],
    intro: [
      'NYX-4 DEEP STATION, OUTER RIM, 2209.', '',
      'THE MINING CONSORTIUM DRILLED A RIFT', 'UNDER THE MOON CHASING A FUEL NOBODY',
      'UNDERSTOOD. SOMETHING CLIMBED OUT.', '',
      'THE CREW ARE HUSKS NOW. THE DARK IS', 'FULL OF EMBER-EYED THINGS, AND YOUR',
      'SQUAD IS SILENT ON EVERY CHANNEL.', '',
      'YOU ARE THE LAST MARINE ON NYX-4.', 'FIGHT DOWN TO THE FOUNDRY AT THE',
      'HEART OF THE RIFT - AND SHUT IT DOWN.'
    ],
    storyAfter: {
      6: ['BEYOND THE RIFT GATE THE STATION', 'SIMPLY STOPS. STEEL TURNS TO STONE,', 'STONE TURNS TO SOMETHING THAT', 'BREATHES. THE AIR TASTES OF ASH.', '', 'SOMEWHERE BELOW, AN ENGINE THE SIZE', 'OF A CATHEDRAL IS HAMMERING OUT', 'MORE OF THEM. KEEP GOING.']
    },
    ending: [
      'THE COLOSSUS CRASHES INTO ITS OWN', 'FURNACE AND THE FOUNDRY GOES DARK.', '',
      'THE RIFT SHUDDERS, FOLDS, AND SPITS', 'YOU BACK ONTO THE COLD MOON SURFACE.', '',
      'THE RELAY ON THE HORIZON IS STILL', 'BLINKING. YOU PATCH INTO THE HOME', 'CHANNEL TO REPORT A VICTORY...', '',
      '...AND HEAR ONLY SIRENS. THE CITIES', 'ON EARTH ARE BURNING.', '',
      'TO BE CONTINUED IN DOOM II.'
    ],
    textures() {
      addTex('tech2', TG.panel(13, 51, 16)); addTex('stoneB', TG.stone(1, 52)); addTex('rustWall', TG.rust(53)); addTex('support', TG.support(54));
      addTex('marble', TG.marble(3, 55)); addTex('hellrock', TG.hellrock(56)); addTex('brick', TG.brick(14, 57)); addTex('wood', TG.wood(58));
      addTex('dirt', TG.dirt(1, 59)); addTex('greenTile', TG.tiles(3, 61, 32, 4)); addTex('redTile', TG.tiles(14, 62, 16, 4));
      addTex('concrete', TG.concrete(63)); addTex('floorBrown', TG.tiles(1, 64, 32, 5)); addTex('ashFloor', TG.dirt(14, 65));
    },
    themes: {
      base: { walls: ['tech', 'techLights', 'computer', 'tech2', 'stoneB'], floors: ['tiles', 'plate', 'grate', 'floorBrown'], ceils: ['ceilTile', 'plate'], corrWall: 'tech2', corrFloor: 'grate', corrCeil: 'ceilTile', pillar: 'support', sky: 'night', skyChance: 0.12, pools: ['nukage'], poolChance: 0.35, light: [0.6, 1], chamfer: 0.4, deco: ['lamp', 'column'], decoChance: 0.35 },
      base2: { walls: ['stoneB', 'rustWall', 'support', 'computer', 'concrete'], floors: ['dirt', 'plate', 'floorBrown', 'grate'], ceils: ['ceilTile', 'plate'], corrWall: 'rustWall', corrFloor: 'plate', corrCeil: 'ceilTile', pillar: 'support', sky: 'night', skyChance: 0.3, pools: ['nukage', 'nukage', 'acid'], poolChance: 0.45, light: [0.45, 0.9], chamfer: 0.5, deco: ['lamp', 'column'], decoChance: 0.3, fxChance: 0.25 },
      rift: { walls: ['tech', 'marble', 'hellrock', 'stoneB', 'computer'], floors: ['tiles', 'greenTile', 'dirt', 'plate'], ceils: ['ceilTile', 'plate'], corrWall: 'marble', corrFloor: 'greenTile', corrCeil: 'ceilTile', pillar: 'marble', sky: 'hell', skyChance: 0.25, pools: ['nukage', 'lava'], poolChance: 0.45, light: [0.4, 0.85], chamfer: 0.6, deco: ['lamp', 'brazier'], decoChance: 0.35, fxChance: 0.3 },
      hell: { walls: ['marble', 'hellrock', 'brick', 'wood'], floors: ['greenTile', 'redTile', 'ashFloor', 'dirt'], ceils: ['redTile', 'ashFloor'], corrWall: 'hellrock', corrFloor: 'redTile', corrCeil: 'ashFloor', pillar: 'marble', sky: 'hell', skyChance: 0.4, pools: ['lava'], poolChance: 0.5, light: [0.35, 0.8], chamfer: 0.7, deco: ['brazier'], decoChance: 0.5, fxChance: 0.3 }
    },
    monsters: {
      husk: { name: 'HUSK TROOPER', draw: drawTrooper({ leg: 3, body: 3, armor: 13, helm: 13, visor: 6 }), sw: 28, sh: 46, h: 0.88, radius: 0.3, hp: 20, speed: 2.2, ranged: { kind: 'hit', dmg: [3, 15], chance: 0.05, range: 28 }, windup: 0.35, cool: 1.2, pain: 0.75, score: 100, drop: 'clip' },
      gunner: { name: 'SCATTER HUSK', draw: drawTrooper({ leg: 12, body: 1, armor: 12, helm: 0, visor: 5, gunW: 3 }), sw: 28, sh: 46, h: 0.88, radius: 0.3, hp: 30, speed: 2.2, ranged: { kind: 'hit', dmg: [3, 15], pellets: 3, chance: 0.05, range: 22 }, windup: 0.4, cool: 1.4, pain: 0.65, score: 150, drop: 'shells' },
      wretch: { name: 'EMBER WRETCH', draw: drawWretch, sw: 30, sh: 46, h: 0.9, radius: 0.3, hp: 60, speed: 2.6, melee: [3, 24], ranged: { kind: 'proj', proj: 'fire', chance: 0.05, zf: 0.9 }, windup: 0.45, cool: 1.0, pain: 0.6, score: 200 },
      gnasher: { name: 'GNASHER', draw: drawGnasher, sw: 42, sh: 34, h: 0.8, radius: 0.45, hp: 150, speed: 3.4, melee: [4, 40], charge: true, windup: 0.25, cool: 0.8, pain: 0.55, score: 300 },
      watcher: { name: 'IRIS WATCHER', draw: drawWatcher, sw: 32, sh: 34, h: 0.8, radius: 0.42, hp: 200, speed: 2.1, fly: true, ranged: { kind: 'proj', proj: 'orb', chance: 0.045 }, windup: 0.5, cool: 1.6, pain: 0.4, score: 400 },
      warden: { name: 'IRON WARDEN', draw: drawWarden, sw: 44, sh: 62, h: 1.35, radius: 0.42, hp: 600, speed: 2.0, melee: [10, 70], ranged: { kind: 'proj', proj: 'bolt', chance: 0.05, spreadShots: 2, zf: 0.5 }, windup: 0.6, cool: 1.6, pain: 0.2, score: 1000 },
      colossus: { name: 'FOUNDRY COLOSSUS', draw: drawColossus, sw: 80, sh: 90, h: 2.7, radius: 0.9, hp: 3000, speed: 2.3, ranged: { kind: 'proj', proj: 'mrocket', chance: 0.08, range: 40, zf: 0.5 }, burst: 3, burstGap: 0.3, windup: 0.6, cool: 1.4, pain: 0.05, score: 10000, boss: true }
    },
    levels: [
      { name: 'HANGAR RELAY', seed: 1101, cols: 3, rows: 2, theme: 'base', locks: 0, dens: 0.026, mons: { husk: 6, gunner: 1 }, weapons: ['shotgun'], ammo: ['clip', 'clip', 'shells'], par: 90, secrets: 2, flat: true },
      { name: 'COOLANT WORKS', seed: 2202, cols: 3, rows: 3, theme: 'base', locks: 1, dens: 0.038, mons: { husk: 4, gunner: 3, wretch: 3 }, weapons: ['chaingun'], ammo: ['clip', 'shells', 'bullets'], par: 150, secrets: 2, lifts: 0.1 },
      { name: 'ORE REFINERY', seed: 3303, cols: 3, rows: 3, theme: 'base2', locks: 1, switchLock: true, dens: 0.042, mons: { husk: 3, gunner: 3, wretch: 4, gnasher: 1 }, ammo: ['clip', 'shells', 'bullets', 'shellbox'], par: 180, secrets: 2, lifts: 0.25 },
      { name: 'COMMAND ANNEX', seed: 4404, cols: 4, rows: 3, theme: 'base', locks: 2, dens: 0.042, mons: { husk: 2, gunner: 3, wretch: 4, gnasher: 2 }, weapons: ['launcher'], ammo: ['clip', 'shells', 'rocket', 'bullets'], par: 240, secrets: 3, lifts: 0.15 },
      { name: 'SIGNAL SPIRE', seed: 5505, cols: 4, rows: 3, theme: 'base2', locks: 2, switchLock: true, dens: 0.044, mons: { husk: 2, gunner: 3, wretch: 4, gnasher: 2, watcher: 2 }, ammo: ['shells', 'rocket', 'bullets', 'shellbox'], par: 270, secrets: 3, lifts: 0.25 },
      { name: 'BREACH LABS', seed: 6606, cols: 4, rows: 4, theme: 'base', locks: 3, dens: 0.042, mons: { husk: 1, gunner: 3, wretch: 4, gnasher: 3, watcher: 2 }, weapons: ['plasmagun'], ammo: ['shells', 'rocket', 'cell', 'bullets'], par: 300, secrets: 3, lifts: 0.2 },
      { name: 'RIFT GATE', seed: 7707, cols: 4, rows: 4, theme: 'rift', locks: 3, switchLock: true, dens: 0.045, mons: { gunner: 2, wretch: 4, gnasher: 3, watcher: 3, warden: 1 }, ammo: ['shellbox', 'rocket', 'cell', 'bullets'], par: 330, secrets: 3, lifts: 0.25 },
      { name: 'ASH CATHEDRAL', seed: 8808, cols: 4, rows: 4, theme: 'hell', locks: 3, dens: 0.046, mons: { wretch: 5, gnasher: 3, watcher: 3, warden: 2 }, weapons: ['biggun'], ammo: ['shellbox', 'rocket', 'cell', 'cellpack'], par: 360, secrets: 3, lifts: 0.25 },
      { name: 'FOUNDRY HEART', seed: 9909, cols: 3, rows: 3, slot: 17, theme: 'hell', locks: 1, dens: 0.03, mons: { wretch: 5, watcher: 3, warden: 1, gnasher: 2 }, boss: 'colossus', ammo: ['rocketbox', 'cellpack', 'shellbox', 'rocket'], extra: ['rocketbox', 'cellpack', 'medikit', 'medikit', 'orb', 'armor2'], par: 300, secrets: 2, bigRooms: 0.6, lifts: 0.15 }
    ]
  };

  // ===================================================================================
  //  Engine: cell-sector renderer (per-cell floor/ceiling heights, lighting, diagonal
  //  walls, sky), level generator, monsters, weapons, HUD, automap, attract mode.
  // ===================================================================================
  let ASSETS = null;
  function buildAssets() {
    TEX.length = 0; for (const k in TID) delete TID[k];
    addTex('door', TG.door(-1, 11)); addTex('doorB', TG.door(8, 12)); addTex('doorY', TG.door(7, 13)); addTex('doorR', TG.door(5, 14));
    addTex('bars', TG.bars(5)); addTex('swOff', TG.switchTex(false, false, 3)); addTex('swOn', TG.switchTex(true, false, 3));
    addTex('exitOff', TG.switchTex(false, true, 4)); addTex('exitOn', TG.switchTex(true, true, 4));
    addTex('step', TG.step(6)); addTex('lift', TG.support(7)); addTex('jamb', TG.support(8));
    addTex('nukage', TG.liquid(4, 21, 4, false)); addTex('lava', TG.liquid(6, 22, 4, true)); addTex('acid', TG.liquid(9, 23, 4, false));
    addTex('plate', TG.plate(13, 31)); addTex('ceilLight', TG.ceilLight(32)); addTex('grate', TG.grate(13, 33));
    addTex('tech', TG.panel(13, 41)); addTex('techLights', TG.techLights(42)); addTex('computer', TG.computer(43));
    addTex('tiles', TG.tiles(0, 44)); addTex('ceilTile', TG.tiles(0, 45, 32, 4));
    GAME.textures();
    const A = { items: itemSprites(), fx: fxSprites(), views: weaponViews(), faces: {}, mon: {}, skies: {} };
    for (const k of ['night', 'hell', 'smog']) A.skies[k] = makeSky(k, 77 + k.length);
    for (const k in GAME.monsters) { const d = GAME.monsters[k]; if (d.draw) A.mon[k] = monsterFrames(d.draw, d.sw, d.sh); }
    for (let t = 0; t < 5; t++) for (const look of [-1, 0, 1]) A.faces[t + ':' + look + ':normal'] = faceSprite(t, look, 'normal');
    for (let t = 0; t < 5; t++) for (const m of ['hurt', 'angry', 'grin']) A.faces[t + ':0:' + m] = faceSprite(t, 0, m);
    A.faces.dead = faceSprite(4, 0, 'dead'); A.faces.god = faceSprite(0, 0, 'god');
    // status bar background
    const bar = new Uint32Array(W * 32), bt = TG.panel(13, 99, 64);
    for (let y = 0; y < 32; y++) for (let x = 0; x < W; x++) bar[y * W + x] = CM[22 * 256 + bt[(y & 63) * 64 + (x & 63)]];
    const box = (x0, x1) => { for (let y = 2; y < 30; y++) for (let x = x0; x < x1; x++) { const e = y === 2 || x === x0 ? 6 : y === 29 || x === x1 - 1 ? 12 : 0; bar[y * W + x] = e ? CM[(e === 6 ? 8 : 26) * 256 + C(13, 5)] : CM[10 * 256 + C(13, 4)]; } };
    box(2, 46); box(48, 104); box(106, 144); box(146, 174); box(176, 232); box(234, 246); box(248, 318);
    A.bar = bar;
    return A;
  }

  ArcadeRegistry.register({
    id: GAME.id, title: GAME.title, year: GAME.year, maker: GAME.maker,
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move/turn \u00b7 Space: fire \u00b7 A/D (or hold Z): strafe \u00b7 1-7 / X: weapon \u00b7 E or walk into: use \u00b7 Shift: run \u00b7 Tab/M/Enter: map',
    marquee: GAME.marquee,
    create(api) {
      if (!ASSETS) ASSETS = buildAssets();
      const A = ASSETS, au = api.audio;
      const rand = Math.random;
      const rr = (a, b) => a + rand() * (b - a);
      const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
      const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
      let img = null, buf = null;
      const zb = new Float32Array(VW * VH);
      const IT = A.items;

      // ---------------- sound ----------------
      const sfx = {
        pistol() { au.noise(0.12, { vol: 0.2, freq: 2400, slideTo: 300 }); au.tone(140, 0.08, { type: 'square', vol: 0.08, slideTo: 60 }); },
        shotgun() { au.noise(0.35, { vol: 0.28, freq: 1500, slideTo: 120 }); au.tone(90, 0.2, { type: 'sawtooth', vol: 0.1, slideTo: 40 }); au.tone(600, 0.06, { type: 'square', vol: 0.05, delay: 0.42 }); au.tone(420, 0.06, { type: 'square', vol: 0.05, delay: 0.52 }); },
        double() { au.noise(0.5, { vol: 0.3, freq: 1200, slideTo: 80 }); au.tone(70, 0.3, { type: 'sawtooth', vol: 0.12, slideTo: 30 }); au.tone(500, 0.05, { type: 'square', vol: 0.05, delay: 0.6 }); au.tone(380, 0.05, { type: 'square', vol: 0.05, delay: 0.8 }); },
        chain() { au.noise(0.07, { vol: 0.16, freq: 2600, slideTo: 500 }); },
        rocket() { au.noise(0.4, { vol: 0.16, freq: 900, slideTo: 3000, type: 'bandpass' }); },
        plasma() { au.tone(1400, 0.08, { type: 'square', vol: 0.07, slideTo: 500 }); },
        bigCharge() { au.tone(200, 0.5, { type: 'sawtooth', vol: 0.1, slideTo: 1600 }); },
        big() { au.noise(0.6, { vol: 0.3, freq: 800, slideTo: 60 }); au.tone(1000, 0.4, { type: 'square', vol: 0.08, slideTo: 80 }); },
        punch() { au.noise(0.06, { vol: 0.15, freq: 600 }); },
        boom(v) { au.noise(0.7, { vol: 0.32 * (v || 1), freq: 700, slideTo: 40 }); au.tone(60, 0.4, { type: 'sine', vol: 0.15 * (v || 1), slideTo: 25 }); },
        door() { au.noise(0.55, { vol: 0.1, freq: 300, slideTo: 120 }); au.tone(70, 0.5, { type: 'sawtooth', vol: 0.05 }); },
        lift() { au.tone(55, 0.9, { type: 'sawtooth', vol: 0.06, slideTo: 70 }); au.noise(0.3, { vol: 0.06, freq: 400 }); },
        sw() { au.tone(900, 0.04, { type: 'square', vol: 0.12 }); au.tone(500, 0.06, { type: 'square', vol: 0.1, delay: 0.05 }); },
        oof() { au.tone(110, 0.15, { type: 'square', vol: 0.12, slideTo: 80 }); },
        item() { au.tone(880, 0.05, { type: 'square', vol: 0.1 }); au.tone(1320, 0.06, { type: 'square', vol: 0.08, delay: 0.05 }); },
        weapon() { au.melody([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.12]], { type: 'square', vol: 0.1 }); },
        power() { au.melody([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]], { type: 'triangle', vol: 0.14 }); },
        pain() { au.tone(220, 0.14, { type: 'square', vol: 0.12, slideTo: 120 }); },
        die() { au.tone(260, 0.6, { type: 'sawtooth', vol: 0.14, slideTo: 50 }); au.noise(0.4, { vol: 0.1, freq: 500 }); },
        secret() { au.melody([[659, 0.1], [784, 0.1], [988, 0.1], [1319, 0.25]], { type: 'triangle', vol: 0.14 }); },
        tick() { au.tone(1200, 0.02, { type: 'square', vol: 0.06 }); },
        mon(kind, d) {
          const v = clamp(1 - d / 28, 0.15, 1);
          if (kind === 'sight') { au.tone(rr(140, 220), 0.35, { type: 'sawtooth', vol: 0.09 * v, slideTo: rr(60, 120) }); au.noise(0.25, { vol: 0.06 * v, freq: 600 }); }
          else if (kind === 'pain') au.tone(rr(260, 340), 0.12, { type: 'sawtooth', vol: 0.08 * v, slideTo: 150 });
          else if (kind === 'die') { au.tone(rr(180, 240), 0.5, { type: 'sawtooth', vol: 0.1 * v, slideTo: 40 }); au.noise(0.3, { vol: 0.06 * v, freq: 400 }); }
          else if (kind === 'shoot') { au.noise(0.15, { vol: 0.14 * v, freq: 1800, slideTo: 300 }); }
          else if (kind === 'throw') { au.noise(0.3, { vol: 0.1 * v, freq: 1200, slideTo: 300, type: 'bandpass' }); }
          else if (kind === 'claw') { au.noise(0.1, { vol: 0.12 * v, freq: 3000 }); }
          else if (kind === 'step') { au.tone(50, 0.2, { type: 'sine', vol: 0.18 * v }); }
        }
      };
      for (const k of Object.keys(sfx)) { const f = sfx[k]; sfx[k] = function () { if (demo) return; return f.apply(null, arguments); }; }
      let musicT = 0, musicBar = 0;
      function music() {
        musicT -= 1 / 60; if (musicT > 0) return;
        const riff = GAME.riffs[(level + (musicBar >> 2)) % GAME.riffs.length]; musicBar++;
        const step = 0.125, base = GAME.musicBase * Math.pow(2, ((level * 5) % 12) / 12 * 0);
        let t = 0;
        for (const n of riff) { if (n !== null) au.tone(base * Math.pow(2, n / 12), step * 0.9, { type: 'triangle', vol: 0.05, delay: t }); t += step; }
        if (musicBar % 2 === 0) for (let i = 0; i < 4; i++) au.noise(0.05, { vol: 0.03, freq: 5000, type: 'highpass', delay: i * 0.5 + 0.25 });
        musicT = riff.length * step;
      }

      // ---------------- level data ----------------
      let M = null, mw = 0, mh = 0;
      let solid, diag, fl, ce, wt, lt, ft, ct, lightBase, lightNow, flag, doorAt, liftAt, swAt;
      let doors = [], lifts = [], switches = [], items = [], mons = [], projs = [], fxs = [], fxCells = [];
      let fieldG = null, fieldA = null, bfsQ = null;
      let level = 0, levelTime = 0, kills = 0, totalKills = 0, gotItems = 0, totalItems = 0, gotSecrets = 0, totalSecrets = 0;
      let exitPending = 0, bossDead = false, tick = 0, idCounter = 0;
      let mode = 'title', modeT = 0, attractPhase = 0;
      let score = 0, lives = 3, hiScore = api.getHiScore(GAME.hiDefault || 20000), nextLife = 50000;
      let coinFlash = 0, showMap = false, msg = '', msgT = 0, levelBanner = 0;
      let flashRed = 0, flashGold = 0, demo = false, botOn = false, godMode = false, testInfinite = false;
      let tallyData = null, storyLines = null, storyT = 0, storyNext = null;
      let P = null;

      function idx(x, y) { return y * mw + x; }
      function cellOf(x, y) { return (y | 0) * mw + (x | 0); }

      // ---------------- level generator ----------------
      function genLevel(Ld) {
        const R = mulberry(Ld.seed), Ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
        const th = GAME.themes[Ld.theme];
        const S = Ld.slot || 13, cols = Ld.cols, rows = Ld.rows;
        const W2 = cols * S + 2, H2 = rows * S + 2, n = W2 * H2;
        const L = {
          mw: W2, mh: H2, n, solid: new Uint8Array(n).fill(1), diag: new Uint8Array(n), fl: new Float32Array(n), ce: new Float32Array(n),
          wt: new Uint8Array(n), lt: new Uint8Array(n), ft: new Uint8Array(n), ct: new Int16Array(n), light: new Float32Array(n), lfx: new Uint8Array(n),
          flag: new Uint8Array(n), door: new Int16Array(n).fill(-1), lift: new Int16Array(n).fill(-1), sw: new Int16Array(n).fill(-1), room: new Int16Array(n).fill(-1),
          ring: new Uint8Array(n), doors: [], lifts: [], switches: [], things: [], mons: [], secrets: 0, sky: th.sky
        };
        const ID = (x, y) => y * W2 + x;
        L.wt.fill(TID[th.corrWall]); L.lt.fill(TID.step); L.ft.fill(TID[th.corrFloor]); L.ct.fill(TID[th.corrCeil]);
        // rooms in slots
        const rooms = [], slot = [];
        for (let sy = 0; sy < rows; sy++) for (let sx = 0; sx < cols; sx++) {
          const x0 = 1 + sx * S, y0 = 1 + sy * S;
          const big = R() < (Ld.bigRooms || 0.35);
          const w = big ? Ri(S - 4, S - 2) : Ri(5, S - 2), h = big ? Ri(S - 4, S - 2) : Ri(5, S - 2);
          const r = { i: rooms.length, sx, sy, x0, y0, w, h, x: x0 + 1 + Ri(0, S - 2 - w), y: y0 + 1 + Ri(0, S - 2 - h), nb: [], par: -1, depth: 0, zone: 0, floor: 0, edges: [] };
          rooms.push(r); slot[sy * cols + sx] = r;
        }
        const startRoom = pick(rooms);
        // spanning tree (random DFS)
        const edges = [];
        const seen = new Set([startRoom.i]), stack = [startRoom];
        while (stack.length) {
          const r = stack[stack.length - 1];
          const opts = [];
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = r.sx + dx, ny = r.sy + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const o = slot[ny * cols + nx]; if (!seen.has(o.i)) opts.push(o);
          }
          if (!opts.length) { stack.pop(); continue; }
          const o = pick(opts); seen.add(o.i); o.par = r.i; o.depth = r.depth + 1;
          const e = { a: r, b: o, lock: null, tree: true }; edges.push(e); r.edges.push(e); o.edges.push(e);
          stack.push(o);
        }
        let exitRoom = rooms[0];
        for (const r of rooms) if (r.depth > exitRoom.depth || (r.depth === exitRoom.depth && R() < 0.5)) exitRoom = r;
        if (Ld.boss) { exitRoom.w = S - 2; exitRoom.h = S - 2; exitRoom.x = exitRoom.x0 + 1; exitRoom.y = exitRoom.y0 + 1; }
        // main path & locks
        const path = []; for (let r = exitRoom; r.par >= 0; r = rooms[r.par]) path.unshift(edges.find(e => e.b === r));
        const lockKinds = [];
        const keys = ['b', 'y', 'r'].slice(0, Ld.locks || 0);
        for (const k of keys) lockKinds.push(k);
        if (Ld.switchLock) lockKinds.splice(Math.floor(R() * (lockKinds.length + 1)), 0, 'sw');
        while (lockKinds.length > path.length) lockKinds.pop();
        const nl = lockKinds.length;
        for (let k = 0; k < nl; k++) path[Math.floor((k + 1) * path.length / (nl + 1))].lock = lockKinds[k];
        // zones (number of locks crossed from start)
        const order = [startRoom]; startRoom.zone = 0;
        for (let i = 0; i < order.length; i++) {
          const r = order[i];
          for (const e of r.edges) if (e.a === r) { e.b.zone = r.zone + (e.lock ? 1 : 0); order.push(e.b); }
        }
        // heights
        for (const r of order) {
          r.sky = R() < th.skyChance; r.light = th.light[0] + R() * (th.light[1] - th.light[0]);
          r.wall = TID[pick(th.walls)]; r.ftex = TID[pick(th.floors)]; r.ctex = TID[pick(th.ceils)];
          r.ch = r.sky ? 3.5 : pick([1.75, 2, 2, 2.25, 2.5, 3]);
          if (r === startRoom) continue;
          const parent = rooms[r.par];
          let d = pick(Ld.flat ? [0, 0, 0.25, -0.25] : [-0.75, -0.5, -0.25, 0, 0, 0.25, 0.5, 0.75]);
          if (Ld.lifts && R() < Ld.lifts) d = (R() < 0.5 ? -1 : 1) * pick([1, 1.25, 1.5]);
          r.floor = clamp(parent.floor + d, -2, 3);
        }
        if (Ld.boss) { exitRoom.sky = true; exitRoom.ch = 4.5; exitRoom.light = 0.9; }
        startRoom.light = Math.max(startRoom.light, 0.8);
        // carve rooms
        for (const r of rooms) {
          for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
            const c = ID(x, y); L.solid[c] = 0; L.fl[c] = r.floor; L.ce[c] = r.floor + r.ch; L.ft[c] = r.ftex; L.ct[c] = r.sky ? -1 : r.ctex;
            L.light[c] = r.light; L.room[c] = r.i; L.wt[c] = r.wall; L.lt[c] = TID[th.stepTex || 'step'];
          }
          for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) { const c = ID(x, y); if (L.solid[c]) { L.wt[c] = r.wall; L.ring[c] = 1; } }
        }
        // corridors
        function corridorCells(A, B) {
          const cells = [];
          if (B.sx !== A.sx) {
            const [P1, P2] = B.sx > A.sx ? [A, B] : [B, A];
            const ya = Ri(P1.y + 1, P1.y + P1.h - 2), lo = Math.max(P2.y + 1, P1.y + 1), hi = Math.min(P2.y + P2.h - 2, P1.y + P1.h - 2);
            const al = lo <= hi && R() < 0.7;
            const yb = al ? Ri(lo, hi) : Ri(P2.y + 1, P2.y + P2.h - 2);
            const y1 = al ? yb : ya;
            const jx = P1.x0 + S - 1;
            for (let x = P1.x + P1.w; x <= jx; x++) cells.push([x, y1]);
            const dy = Math.sign(yb - y1); for (let y = y1 + dy; dy && y !== yb + dy; y += dy) cells.push([jx, y]);
            for (let x = jx + 1; x < P2.x; x++) cells.push([x, yb]);
            if (P1 !== A) cells.reverse();
          } else {
            const [P1, P2] = B.sy > A.sy ? [A, B] : [B, A];
            const lo = Math.max(P2.x + 1, P1.x + 1), hi = Math.min(P2.x + P2.w - 2, P1.x + P1.w - 2);
            const al = lo <= hi && R() < 0.7;
            const xb = al ? Ri(lo, hi) : Ri(P2.x + 1, P2.x + P2.w - 2);
            const x1 = al ? xb : Ri(P1.x + 1, P1.x + P1.w - 2);
            const jy = P1.y0 + S - 1;
            for (let y = P1.y + P1.h; y <= jy; y++) cells.push([x1, y]);
            const dx = Math.sign(xb - x1); for (let x = x1 + dx; dx && x !== xb + dx; x += dx) cells.push([x, jy]);
            for (let y = jy + 1; y < P2.y; y++) cells.push([xb, y]);
            if (P1 !== A) cells.reverse();
          }
          return cells;
        }
        function addDoor(c, key, opts) {
          const d = { cells: [c], key: key || null, bars: !!(opts && opts.bars), secret: !!(opts && opts.secret), floor: L.fl[c], top: L.ce[c], h: L.fl[c], state: 0, wait: 0, stay: !!(opts && (opts.secret || opts.bars)) };
          L.door[c] = L.doors.length; L.doors.push(d); L.ce[c] = L.fl[c];
          L.wt[c] = opts && opts.secret ? opts.tex : TID[d.bars ? 'bars' : key === 'b' ? 'doorB' : key === 'y' ? 'doorY' : key === 'r' ? 'doorR' : 'door'];
          return d;
        }
        function carveCorridor(e, force) {
          const A = e.a, B = e.b, cells = corridorCells(A, B), N = cells.length;
          const fa = A.floor, fb = B.floor, diff = fb - fa, k = Math.ceil(Math.abs(diff) / 0.25 - 1e-6);
          const useLift = k > N;
          if (!force && useLift) return false;
          const light = Math.min(A.light, B.light) * 0.82;
          const lo = Math.min(fa, fb), hi = Math.max(fa, fb);
          const ids = cells.map(([x, y]) => ID(x, y));
          ids.forEach((c, i) => {
            L.solid[c] = 0;
            let f;
            if (useLift) f = lo; else f = k ? fa + diff * Math.round(k * (i + 1) / (N + 1)) / k : fa;
            L.fl[c] = f; L.ce[c] = useLift ? hi + 1.5 : f + 1.5; L.ft[c] = TID[th.corrFloor]; L.ct[c] = TID[th.corrCeil];
            L.light[c] = light; L.wt[c] = TID[th.corrWall]; L.lt[c] = TID.step;
            const [x, y] = cells[i];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = ID(x + dx, y + dy); if (L.solid[nc] && !L.ring[nc]) L.wt[nc] = TID[th.corrWall]; }
          });
          let liftIdx = -1;
          if (useLift) {
            liftIdx = fb > fa ? N - 1 : 0;
            const c = ids[liftIdx];
            L.fl[c] = hi; L.lift[c] = L.lifts.length; L.lifts.push({ cells: [c], low: lo, high: hi, h: hi, state: 0, t: 0 });
            L.ft[c] = TID.plate; L.lt[c] = TID.lift; L.light[c] = Math.max(light, 0.6);
          }
          const wantDoor = e.lock || R() < (Ld.doors == null ? 0.45 : Ld.doors);
          if (wantDoor) {
            let di = liftIdx === 0 ? N - 1 : 0;
            if (!useLift && R() < 0.5 && N > 1) di = N - 1;
            if (di === liftIdx) di = N > 1 ? (liftIdx === 0 ? 1 : 0) : -1;
            if (di >= 0) {
              const c = ids[di], [x, y] = cells[di];
              const dk = e.lock === 'sw' ? null : e.lock;
              const d = addDoor(c, dk, { bars: e.lock === 'sw' });
              e.door = d; e.doorIdx = L.doors.length - 1;
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = ID(x + dx, y + dy); if (L.solid[nc] === 1) L.wt[nc] = TID.jamb; }
            }
          }
          e.cells = ids;
          return true;
        }
        for (const e of edges) carveCorridor(e, true);
        // extra loops inside the same zone
        for (const a of rooms) for (const [dx, dy] of [[1, 0], [0, 1]]) {
          const nx = a.sx + dx, ny = a.sy + dy; if (nx >= cols || ny >= rows) continue;
          const b = slot[ny * cols + nx];
          if (edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) continue;
          if (a.zone !== b.zone || R() > (Ld.loops || 0.3)) continue;
          const e = { a, b, lock: null, tree: false };
          if (carveCorridor(e, false)) edges.push(e);
        }
        // room decoration
        const used = new Uint8Array(n);
        const isFree = c => !L.solid[c] && !L.diag[c] && L.door[c] < 0 && L.lift[c] < 0 && !(L.flag[c] & 3);
        for (const r of rooms) {
          const special = r === startRoom;
          const set = (x, y, f) => f(ID(x, y));
          if (!special && r.w >= 5 && r.h >= 5 && R() < th.chamfer) {
            set(r.x, r.y, c => L.diag[c] = 1); set(r.x + r.w - 1, r.y, c => L.diag[c] = 2);
            set(r.x, r.y + r.h - 1, c => L.diag[c] = 3); set(r.x + r.w - 1, r.y + r.h - 1, c => L.diag[c] = 4);
          }
          let deco = 'none';
          if (!special && r.w >= 8 && r.h >= 8 && R() < 0.55) deco = 'pillars';
          else if (!special && r.w >= 7 && r.h >= 7 && R() < th.poolChance) deco = 'pool';
          else if (!special && r.w >= 7 && r.h >= 7 && R() < 0.4) deco = 'dais';
          if (r === exitRoom && Ld.boss) deco = 'pillars';
          r.deco = deco;
          if (deco === 'pillars') {
            const diamond = R() < 0.6;
            const spots = [[r.x + 2, r.y + 2], [r.x + r.w - 4, r.y + 2], [r.x + 2, r.y + r.h - 4], [r.x + r.w - 4, r.y + r.h - 4]];
            for (const [px, py] of spots) {
              if (diamond) { L.diag[ID(px, py)] = 4; L.diag[ID(px + 1, py)] = 3; L.diag[ID(px, py + 1)] = 2; L.diag[ID(px + 1, py + 1)] = 1; for (const c of [ID(px, py), ID(px + 1, py), ID(px, py + 1), ID(px + 1, py + 1)]) L.wt[c] = TID[th.pillar]; }
              else { for (const c of [ID(px, py), ID(px + 1, py), ID(px, py + 1), ID(px + 1, py + 1)]) { L.solid[c] = 1; L.wt[c] = TID[th.pillar]; } }
            }
          } else if (deco === 'pool') {
            const liq = pick(th.pools);
            for (let y = r.y + 2; y < r.y + r.h - 2; y++) for (let x = r.x + 2; x < r.x + r.w - 2; x++) {
              const c = ID(x, y); L.fl[c] = r.floor - 0.125; L.ft[c] = TID[liq]; L.flag[c] |= liq === 'lava' ? 2 : 1; L.lt[c] = TID.step; L.lfx[c] = 2;
            }
            r.pool = liq;
          } else if (deco === 'dais') {
            for (let y = r.y + 2; y < r.y + r.h - 2; y++) for (let x = r.x + 2; x < r.x + r.w - 2; x++) {
              const c = ID(x, y), inner = x > r.x + 2 && x < r.x + r.w - 3 && y > r.y + 2 && y < r.y + r.h - 3;
              L.fl[c] = r.floor + (inner ? 0.5 : 0.25); L.ft[c] = TID.plate; L.lt[c] = TID[th.stepTex || 'step'];
            }
          }
          if (!r.sky) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
            if ((x - r.x) % 3 === 1 && (y - r.y) % 3 === 1) { const c = ID(x, y); if (!L.solid[c] && !L.diag[c]) { L.ct[c] = TID.ceilLight; L.light[c] = Math.min(1, L.light[c] + 0.15); } }
          }
          if (!special && R() < (th.fxChance || 0.15)) { const fx = R() < 0.5 ? 1 : 3; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) L.lfx[ID(x, y)] = fx; }
        }
        // wall switches
        function wallSpot(r) {
          const cand = [];
          for (let x = r.x + 1; x < r.x + r.w - 1; x++) { cand.push([x, r.y - 1, x, r.y]); cand.push([x, r.y + r.h, x, r.y + r.h - 1]); }
          for (let y = r.y + 1; y < r.y + r.h - 1; y++) { cand.push([r.x - 1, y, r.x, y]); cand.push([r.x + r.w, y, r.x + r.w - 1, y]); }
          const ok = cand.filter(([x, y, ix, iy]) => {
            const c = ID(x, y); if (L.solid[c] !== 1 || L.sw[c] >= 0) return false;
            const dx = x - ix, dy = y - iy;
            for (const [ax, ay] of [[dy, dx], [-dy, -dx]]) { const nc = ID(x + ax, y + ay); if (L.solid[nc] !== 1) return false; }
            const front = ID(ix, iy); return !L.diag[front] && !(L.flag[front] & 3);
          });
          return ok.length ? pick(ok) : null;
        }
        // keys / lock switches
        const keyRoomOf = {};
        path.forEach(e => {
          if (!e.lock) return;
          const z = e.a.zone;
          let cand = rooms.filter(r => r.zone === z && r !== startRoom && !path.some(p => p.a === r || p.b === r));
          if (!cand.length) cand = rooms.filter(r => r.zone === z && r !== startRoom);
          if (!cand.length) cand = rooms.filter(r => r.zone === z);
          cand.sort((p, q) => q.depth - p.depth);
          const kr = cand[0];
          keyRoomOf[e.lock] = kr;
          if (e.lock === 'sw') {
            let spot = wallSpot(kr);
            if (!spot) for (const r of rooms) if (r.zone === z && (spot = wallSpot(r))) break;
            if (spot) { const c = ID(spot[0], spot[1]); L.sw[c] = L.switches.length; L.switches.push({ c, kind: 'door', door: e.doorIdx, on: false }); L.wt[c] = TID.swOff; }
            else if (e.door) { e.door.bars = false; L.wt[e.door.cells[0]] = TID.door; }
          } else {
            kr.keyItem = e.lock;
          }
        });
        // exit switch
        if (!Ld.boss) {
          const spot = wallSpot(exitRoom) || (() => { for (const r of rooms) { const s = r.zone === exitRoom.zone && wallSpot(r); if (s) return s; } return null; })();
          const sp2 = spot || (() => { for (const r of rooms) { const s = wallSpot(r); if (s) return s; } return null; })();
          const c = ID(sp2[0], sp2[1]); L.sw[c] = L.switches.length; L.switches.push({ c, kind: 'exit', on: false }); L.wt[c] = TID.exitOff;
        }
        // secret closets
        let secrets = 0;
        for (let tries = 0; tries < 60 && secrets < (Ld.secrets || 2); tries++) {
          const r = pick(rooms), side = Ri(0, 3);
          let dx = 0, dy = 0, x, y;
          if (side === 0) { x = Ri(r.x + 1, r.x + r.w - 2); y = r.y - 1; dy = -1; }
          else if (side === 1) { x = Ri(r.x + 1, r.x + r.w - 2); y = r.y + r.h; dy = 1; }
          else if (side === 2) { x = r.x - 1; y = Ri(r.y + 1, r.y + r.h - 2); dx = -1; }
          else { x = r.x + r.w; y = Ri(r.y + 1, r.y + r.h - 2); dx = 1; }
          const front = ID(x - dx, y - dy); if (L.diag[front] || (L.flag[front] & 3)) continue;
          // closet: 2 deep x 3 wide beyond the door, plus a margin
          let ok = true; const cl = [];
          for (let a = 0; a <= 3 && ok; a++) for (let b = -2; b <= 2 && ok; b++) {
            const cx = x + dx * a + (dx ? 0 : b), cy = y + dy * a + (dy ? 0 : b);
            if (cx < 1 || cy < 1 || cx >= W2 - 1 || cy >= H2 - 1) { ok = false; break; }
            const c = ID(cx, cy);
            if (a === 0 && b === 0) { if (L.solid[c] !== 1 || L.sw[c] >= 0) ok = false; continue; }
            if (a === 0) continue;
            if (L.solid[c] !== 1 || L.door[c] >= 0) ok = false;
            if (a >= 1 && a <= 2 && Math.abs(b) <= 1) cl.push(c);
          }
          if (!ok) continue;
          // the margin row/cols must not be adjacent to other open cells either
          for (const c of cl) { L.solid[c] = 0; L.fl[c] = r.floor; L.ce[c] = r.floor + 1.5; L.ft[c] = TID.plate; L.ct[c] = TID.ceilLight; L.light[c] = 0.75; L.lfx[c] = 3; L.flag[c] |= 4; L.wt[c] = r.wall; }
          const dc = ID(x, y); L.solid[dc] = 0; L.fl[dc] = r.floor; L.ce[dc] = r.floor + 1.5; L.ft[dc] = TID.plate; L.ct[dc] = r.sky ? r.ctex : L.ct[front]; if (L.ct[dc] < 0) L.ct[dc] = TID.ceilTile; L.light[dc] = r.light;
          addDoor(dc, null, { secret: true, tex: r.wall });
          L.things.push({ kind: pick(Ld.secretLoot || ['orb', 'armor2', 'rocketbox', 'cellpack', 'backpack', 'berserk', 'map', 'goldorb']), x: (cl[2] % W2) + 0.5, y: Math.floor(cl[2] / W2) + 0.5 });
          secrets++;
        }
        L.secrets = secrets;
        // keep doorways, switch fronts and secret fronts clear of things
        for (let c = W2; c < n - W2; c++) if (!L.solid[c] && L.room[c] < 0) for (const o of [1, -1, W2, -W2]) if (L.room[c + o] >= 0) for (const o2 of [0, 1, -1, W2, -W2, W2 + 1, W2 - 1, -W2 + 1, -W2 - 1]) used[c + o + o2] = 1;
        for (const s of L.switches) for (const o of [1, -1, W2, -W2]) used[s.c + o] = 1;
        // free cells per room
        const freeIn = (r, margin) => {
          const out = [];
          for (let y = r.y + margin; y < r.y + r.h - margin; y++) for (let x = r.x + margin; x < r.x + r.w - margin; x++) { const c = ID(x, y); if (isFree(c) && !used[c]) out.push(c); }
          return out;
        };
        const place = (r, kind, margin, isMon) => {
          let f = freeIn(r, margin == null ? 1 : margin); if (!f.length) f = freeIn(r, 0); if (!f.length) return null;
          const c = pick(f); used[c] = 1;
          const t = { kind, x: (c % W2) + 0.5 + (R() - 0.5) * 0.3, y: Math.floor(c / W2) + 0.5 + (R() - 0.5) * 0.3 };
          (isMon ? L.mons : L.things).push(t); return t;
        };
        // blocking decorations only where they cannot close a passage
        const placeDeco = (r, kind, isMon) => {
          const f = freeIn(r, 1).filter(c => [1, -1, W2, -W2, W2 + 1, W2 - 1, -W2 + 1, -W2 - 1].every(o => !L.solid[c + o] && !L.diag[c + o] && !blockers[c + o] && L.door[c + o] < 0));
          if (!f.length) return;
          const c = pick(f); used[c] = 1; blockers[c] = 1;
          (isMon ? L.mons : L.things).push({ kind, x: (c % W2) + 0.5, y: Math.floor(c / W2) + 0.5 });
        };
        const blockers = new Uint8Array(n);
        // player start
        const sc = ID(startRoom.x + (startRoom.w >> 1), startRoom.y + (startRoom.h >> 1)); used[sc] = 1;
        L.start = { x: (sc % W2) + 0.5, y: Math.floor(sc / W2) + 0.5, ang: 0 };
        const fe = startRoom.edges[0];
        if (fe && fe.cells) { const c0 = fe.cells[fe.a === startRoom ? 0 : fe.cells.length - 1]; L.start.ang = Math.atan2(Math.floor(c0 / W2) + 0.5 - L.start.y, (c0 % W2) + 0.5 - L.start.x); }
        // keys
        for (const r of rooms) if (r.keyItem) {
          const kind = r.keyItem === 'b' ? 'keyB' : r.keyItem === 'y' ? 'keyY' : 'keyR';
          const cx = r.x + (r.w >> 1), cy = r.y + (r.h >> 1), c = ID(cx, cy);
          if (isFree(c) && !used[c]) { used[c] = 1; L.things.push({ kind, x: cx + 0.5, y: cy + 0.5 }); } else place(r, kind, 1);
        }
        // weapons in early rooms
        const early = rooms.filter(r => r.zone <= 1 && r !== startRoom);
        for (const w of (Ld.weapons || [])) place(early.length ? pick(early) : startRoom, w, 1);
        // monsters
        const monW = Object.entries(Ld.mons), tot = monW.reduce((a, b) => a + b[1], 0);
        const pickMon = () => { let v = R() * tot; for (const [k, w] of monW) { v -= w; if (v <= 0) return k; } return monW[0][0]; };
        for (const r of rooms) {
          if (r === startRoom) continue;
          let cnt = Math.round(r.w * r.h * Ld.dens * (0.6 + R() * 0.8));
          if (r === exitRoom) cnt += 2;
          if (Ld.boss && r === exitRoom) { const c = ID(r.x + (r.w >> 1), r.y + (r.h >> 1)); used[c] = 1; L.mons.push({ kind: Ld.boss, x: (c % W2) + 0.5, y: Math.floor(c / W2) + 0.5 }); cnt = 2; }
          for (let i = 0; i < cnt; i++) place(r, pickMon(), 1, true);
        }
        // loot
        const ammoKinds = Ld.ammo || ['clip', 'clip', 'shells'];
        const loot = ['stim', 'stim', 'medikit', 'vial', 'vial', 'shard', 'shard'].concat(ammoKinds, ammoKinds);
        for (const r of rooms) {
          let cnt = (r.w * r.h > 50 ? 2 : 1) + (R() < 0.4 ? 1 : 0);
          if (r === startRoom) cnt = 1;
          for (let i = 0; i < cnt; i++) place(r, pick(loot), 0);
          if (r.deco === 'dais') { const c = ID(r.x + (r.w >> 1), r.y + (r.h >> 1)); if (!used[c]) { used[c] = 1; L.things.push({ kind: pick(['medikit', 'armor1', 'bullets', 'shellbox', ammoKinds[ammoKinds.length - 1]]), x: (c % W2) + 0.5, y: Math.floor(c / W2) + 0.5 }); } }
          if (r.pool === 'nukage' && R() < 0.6) place(r, 'radsuit', 0);
          if (R() < th.decoChance) for (let i = 0, m = Ri(1, 3); i < m; i++) placeDeco(r, pick(th.deco), false);
          if (R() < 0.35) placeDeco(r, 'canister', true);
        }
        place(pick(rooms), 'armor1', 1);
        if (Ld.extra) for (const k of Ld.extra) place(pick(rooms.filter(r => r !== startRoom)), k, 1);
        L.rooms = rooms; L.exitRoom = exitRoom; L.startRoom = startRoom;
        return L;
      }

      // ---------------- definitions ----------------
      const WEAP = [
        { name: 'FIST', ammo: null, use: 0, rate: 22, kind: 'melee', dmg: [2, 20], view: 'fist' },
        { name: 'PISTOL', ammo: 'b', use: 1, rate: 22, kind: 'hit', pellets: 1, spread: 0.035, dmg: [5, 15], view: 'pistol', snd: 'pistol' },
        { name: 'SHOTGUN', ammo: 's', use: 1, rate: 52, kind: 'hit', pellets: 7, spread: 0.1, dmg: [5, 15], view: 'shotgun', snd: 'shotgun' },
        { name: 'CHAINGUN', ammo: 'b', use: 1, rate: 7, kind: 'hit', pellets: 1, spread: 0.05, dmg: [5, 15], view: 'chaingun', snd: 'chain' },
        { name: 'ROCKET LAUNCHER', ammo: 'r', use: 1, rate: 34, kind: 'proj', proj: 'rocket', view: 'rocket', snd: 'rocket' },
        { name: 'PLASMA RIFLE', ammo: 'c', use: 1, rate: 5, kind: 'proj', proj: 'plasma', view: 'plasma', snd: 'plasma' },
        { name: 'BIG ENERGY GUN', ammo: 'c', use: 40, rate: 70, kind: 'proj', proj: 'bigball', view: 'big', snd: 'big', windup: 22 },
        { name: 'DOUBLE SHOTGUN', ammo: 's', use: 2, rate: 78, kind: 'hit', pellets: 20, spread: 0.2, dmg: [5, 15], view: 'double', snd: 'double' }
      ];
      const PJ = {
        fire: { speed: 6.5, dmg: [3, 24], spr: 'fire' }, orb: { speed: 5, dmg: [5, 40], spr: 'orb' }, bolt: { speed: 7.5, dmg: [8, 64], spr: 'bolt' },
        rocket: { speed: 12, dmg: [20, 160], spr: 'rocket', splash: [2, 128] }, mrocket: { speed: 10, dmg: [20, 100], spr: 'rocket', splash: [1.6, 96] },
        plasma: { speed: 15, dmg: [5, 40], spr: 'plasma' }, bigball: { speed: 14, dmg: [100, 800], spr: 'bigball', big: true },
        acid: { speed: 6, dmg: [5, 30], spr: 'acid', grav: true }, seeker: { speed: 5.5, dmg: [10, 50], spr: 'seeker', seek: true }
      };
      const ITEMDEF = {
        clip: { spr: 'clip', ammo: ['b', 10], h: 0.25 }, bullets: { spr: 'bullets', ammo: ['b', 50], h: 0.3 }, shells: { spr: 'shells', ammo: ['s', 4], h: 0.25 },
        shellbox: { spr: 'shellbox', ammo: ['s', 20], h: 0.3 }, rocket: { spr: 'rocket', ammo: ['r', 1], h: 0.45 }, rocketbox: { spr: 'rocketbox', ammo: ['r', 5], h: 0.35 },
        cell: { spr: 'cell', ammo: ['c', 20], h: 0.25 }, cellpack: { spr: 'cellpack', ammo: ['c', 100], h: 0.35 },
        stim: { spr: 'stim', health: [10, 100], h: 0.25 }, medikit: { spr: 'medikit', health: [25, 100], h: 0.32 }, vial: { spr: 'vial', health: [1, 200], h: 0.25, always: true },
        shard: { spr: 'shard', armor: [1, 200], h: 0.25, always: true }, armor1: { spr: 'armor1', armorSet: [100, 1], h: 0.4 }, armor2: { spr: 'armor2', armorSet: [200, 2], h: 0.4 },
        orb: { spr: 'orb', health: [100, 200], h: 0.35, float: true, always: true, power: true }, goldorb: { spr: 'goldorb', powerup: 'inv', h: 0.35, float: true },
        radsuit: { spr: 'radsuit', powerup: 'rad', h: 0.6 }, berserk: { spr: 'berserk', powerup: 'bers', h: 0.3 }, map: { spr: 'map', powerup: 'map', h: 0.3 },
        backpack: { spr: 'backpack', backpack: true, h: 0.35 },
        keyB: { spr: 'keyB', key: 'b', h: 0.22 }, keyY: { spr: 'keyY', key: 'y', h: 0.22 }, keyR: { spr: 'keyR', key: 'r', h: 0.22 },
        shotgun: { spr: 'wShotgun', weapon: 2, h: 0.3 }, chaingun: { spr: 'wChaingun', weapon: 3, h: 0.3 }, launcher: { spr: 'wRocket', weapon: 4, h: 0.3 },
        plasmagun: { spr: 'wPlasma', weapon: 5, h: 0.3 }, biggun: { spr: 'wBig', weapon: 6, h: 0.35 }, doublegun: { spr: 'wDouble', weapon: 7, h: 0.3 },
        lamp: { spr: 'lamp', deco: true, solid: true, h: 1.3 }, column: { spr: 'column', deco: true, solid: true, h: 1.1 }, brazier: { spr: 'brazier', deco: true, solid: true, h: 0.85, anim: true }
      };
      const CANISTER = { name: 'canister', decor: true, hp: 20, radius: 0.28, h: 0.6, score: 0 };

      // ---------------- level load ----------------
      function loadLevel(n) {
        level = n;
        const Ld = GAME.levels[n];
        M = genLevel(Ld);
        mw = M.mw; mh = M.mh;
        solid = M.solid; diag = M.diag; fl = M.fl; ce = M.ce; wt = M.wt; lt = M.lt; ft = M.ft; ct = M.ct; lightBase = M.light; flag = M.flag;
        doorAt = M.door; liftAt = M.lift; swAt = M.sw;
        lightNow = new Float32Array(M.n); lightNow.set(lightBase);
        fxCells = []; for (let i = 0; i < M.n; i++) if (M.lfx[i]) fxCells.push(i);
        doors = M.doors; lifts = M.lifts; switches = M.switches;
        fieldG = new Int16Array(M.n); fieldA = new Int16Array(M.n); bfsQ = new Int32Array(M.n);
        items = []; mons = []; projs = []; fxs = [];
        totalItems = 0; totalKills = 0; kills = 0; gotItems = 0; gotSecrets = 0; totalSecrets = M.secrets;
        for (const t of M.things) {
          const d = ITEMDEF[t.kind]; if (!d) continue;
          items.push({ kind: t.kind, d, x: t.x, y: t.y, z: fl[cellOf(t.x, t.y)], taken: false });
          if (!d.deco && !d.key && !d.weapon && (d.power || d.powerup || d.armorSet || d.backpack)) totalItems++;
        }
        for (const t of M.mons) spawnMon(t.kind, t.x, t.y, false);
        totalKills = mons.filter(m => !m.def.decor).length;
        levelTime = 0; exitPending = 0; bossDead = false; showMap = false;
        P.x = M.start.x; P.y = M.start.y; P.ang = M.start.ang; P.z = fl[cellOf(P.x, P.y)]; P.viewZ = P.z; P.vz = 0; P.vx = 0; P.vy = 0;
        P.keys = { b: 0, y: 0, r: 0 }; P.pw = { rad: 0, inv: 0, bers: 0, map: 0 }; P.lastCell = cellOf(P.x, P.y); P.dead = false;
        msg = ''; msgT = 0; levelBanner = 180;
        buildFields();
        botReset();
      }
      function spawnMon(kind, x, y, awake) {
        const def = kind === 'canister' ? CANISTER : GAME.monsters[kind]; if (!def) return null;
        const m = { id: idCounter++, kind, def, x, y, z: 0, hp: def.hp, state: awake ? 'chase' : 'idle', t: 0, cd: rr(0.5, 1.5), ang: rand() * TAU, anim: rand(), dead: false, dt: 0, fade: 1, sees: false, side: rand() < 0.5 ? 1 : -1, fired: false, shots: 0, flashT: 0, stuck: 0 };
        m.z = fl[cellOf(x, y)] + (def.fly ? 0.45 : 0);
        mons.push(m); return m;
      }
      function newPlayer() {
        return {
          x: 0, y: 0, z: 0, ang: 0, viewZ: 0, vz: 0, vx: 0, vy: 0, hp: 100, armor: 0, armorK: 0,
          ammo: { b: 50, s: 0, r: 0, c: 0 }, max: { b: 200, s: 50, r: 50, c: 300 },
          has: [true, true, false, false, false, false, false, false], weap: 1, pending: -1, wy: 0, cd: 0, flash: 0, fireAnim: 0, windup: 0, refire: 0,
          keys: { b: 0, y: 0, r: 0 }, pw: { rad: 0, inv: 0, bers: 0, map: 0 }, bob: 0, dead: false, deadT: 0, face: { mood: 'normal', t: 0, look: 0, lookT: 0 }, lastCell: 0, hurtT: 0, nukeT: 0, killer: null
        };
      }
      function resetLoadout() { const k = P.keys; Object.assign(P, newPlayer()); P.keys = k; }

      // ---------------- geometry queries ----------------
      function diagBlocks(c, cx, cy, x, y, r) {
        const t = diag[c], u = x - cx, v = y - cy;
        let sd;
        if (t === 1) sd = (u + v - 1) * 0.7071; else if (t === 4) sd = -(u + v - 1) * 0.7071;
        else if (t === 2) sd = -(u - v) * 0.7071; else sd = (u - v) * 0.7071;
        return sd < r;
      }
      let blockCell = -1;
      // returns floor height under a circle, or NaN if it may not stand there
      function areaFloor(x, y, r, z, step, height, fly) {
        const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
        let mf = -1e9, mc = 1e9, cmin = -1;
        blockCell = -1;
        for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
          if (cx < 0 || cy < 0 || cx >= mw || cy >= mh) { blockCell = -1; return NaN; }
          const c = cy * mw + cx;
          if (solid[c] === 1) { blockCell = c; return NaN; }
          if (diag[c] && diagBlocks(c, cx, cy, x, y, r)) { blockCell = c; return NaN; }
          const f = fl[c], h = ce[c];
          if (!fly && f - z > step) { blockCell = c; return NaN; }
          if (f > mf) mf = f;
          if (h < mc) { mc = h; cmin = c; }
        }
        if (mc - Math.max(mf, fly ? z : mf) < height) { blockCell = cmin; return NaN; }
        return mf;
      }
      function blockedByThing(self, x, y, r) {
        for (const m of mons) {
          if (m === self || m.dead) continue;
          const dx = m.x - x, dy = m.y - y, rr2 = r + m.def.radius;
          if (dx * dx + dy * dy < rr2 * rr2) {
            const odx = m.x - self.x, ody = m.y - self.y;
            if (odx * odx + ody * ody < dx * dx + dy * dy) continue; // moving apart
            return true;
          }
        }
        for (const it of items) {
          if (!it.d.solid) continue;
          const dx = it.x - x, dy = it.y - y; if (dx * dx + dy * dy < (r + 0.22) * (r + 0.22)) return true;
        }
        if (self !== P && !P.dead) { const dx = P.x - x, dy = P.y - y, rr2 = r + 0.25; if (dx * dx + dy * dy < rr2 * rr2) return true; }
        return false;
      }
      function los(x0, y0, z0, x1, y1, z1) {
        const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 0.2) + 1;
        for (let i = 1; i < n; i++) {
          const t = i / n, x = x0 + dx * t, y = y0 + dy * t, z = z0 + (z1 - z0) * t;
          const cx = x | 0, cy = y | 0, c = cy * mw + cx;
          if (solid[c] === 1) return false;
          if (diag[c] && diagBlocks(c, cx, cy, x, y, 0)) return false;
          if (z < fl[c] || z > ce[c]) return false;
        }
        return true;
      }
      function monPass(nc, c, fly) {
        if (solid[c] === 1 || solid[nc] === 1 || diag[c] || diag[nc]) return false;
        const di = doorAt[c];
        if (di >= 0) { const d = doors[di]; if (d.state !== 2 && (d.key || d.secret || d.bars)) return false; return fly || Math.abs(fl[c] - fl[nc]) <= 0.4; }
        if (ce[c] - fl[c] < (fly ? 0.7 : 0.9)) return false;
        if (!fly && fl[c] - fl[nc] > 0.4) return false;
        if (!fly && (flag[c] & 2) && !(flag[nc] & 2)) return false;
        return true;
      }
      function buildField(field, fly) {
        field.fill(-1);
        const s = cellOf(P.x, P.y); field[s] = 0; bfsQ[0] = s; let h = 0, t = 1;
        while (h < t) {
          const c = bfsQ[h++], d = field[c] + 1; if (d > 60) continue;
          const nb = [c + 1, c - 1, c + mw, c - mw];
          for (const nc of nb) { if (field[nc] >= 0) continue; if (!monPass(nc, c, fly)) continue; field[nc] = d; bfsQ[t++] = nc; }
        }
      }
      function buildFields() { buildField(fieldG, false); buildField(fieldA, true); }

      // ---------------- doors, lifts, switches ----------------
      function openDoor(d, quiet) {
        if (d.state === 1 || d.state === 2) { if (d.state === 2) d.wait = 4; return; }
        d.state = 1; if (!quiet) sfxAt('door', d.cells[0]);
      }
      function sfxAt(name, c) { const x = c % mw + 0.5, y = (c / mw | 0) + 0.5; if (Math.hypot(x - P.x, y - P.y) < 24 && !demoQuiet()) sfx[name](); }
      function demoQuiet() { return demo && mode !== 'demo'; }
      let oopsT = 0;
      function useCell(c, bump) {
        if (c < 0) return false;
        const di = doorAt[c];
        if (di >= 0) {
          const d = doors[di];
          if (d.state === 1 || d.state === 2) return true;
          if (d.bars) { if (!bump || oopsT <= 0) { say('THIS GATE IS OPENED BY A SWITCH'); sfx.oof(); oopsT = 1; } return true; }
          if (d.key && !P.keys[d.key]) { if (oopsT <= 0) { say('YOU NEED A ' + { b: 'BLUE', y: 'YELLOW', r: 'RED' }[d.key] + ' KEYCARD'); sfx.oof(); oopsT = 1; } return true; }
          openDoor(d); return true;
        }
        const si = swAt[c];
        if (si >= 0) {
          const s = switches[si]; if (s.on) return true;
          s.on = true; sfx.sw();
          if (s.kind === 'exit') { wt[c] = TID.exitOn; exitPending = 50; }
          else { wt[c] = TID.swOn; const d = doors[s.door]; if (d) { d.bars = false; openDoor(d); } say('A GATE HAS OPENED'); }
          return true;
        }
        const li = liftAt[c];
        if (li >= 0) { triggerLift(lifts[li]); return true; }
        return false;
      }
      function triggerLift(L) {
        if (L.state === 0) { L.state = 1; sfxAt('lift', L.cells[0]); }
      }
      function occupied(c) {
        const x = c % mw, y = c / mw | 0;
        const hit = (ox, oy, r) => ox + r > x && ox - r < x + 1 && oy + r > y && oy - r < y + 1;
        if (!P.dead && hit(P.x, P.y, 0.25)) return true;
        for (const m of mons) if (!m.dead && hit(m.x, m.y, m.def.radius)) return true;
        return false;
      }
      function updateMovers(dt) {
        for (const d of doors) {
          if (d.state === 1) { d.h += 2.4 * dt; if (d.h >= d.top) { d.h = d.top; d.state = 2; d.wait = 4; } }
          else if (d.state === 2 && !d.stay) { d.wait -= dt; if (d.wait <= 0) { d.state = 3; sfxAt('door', d.cells[0]); } }
          else if (d.state === 3) {
            if (d.cells.some(occupied)) d.state = 1;
            else { d.h -= 2.4 * dt; if (d.h <= d.floor) { d.h = d.floor; d.state = 0; } }
          }
          for (const c of d.cells) ce[c] = d.h;
        }
        for (const L of lifts) {
          if (L.state === 1) { L.h -= 1.6 * dt; if (L.h <= L.low) { L.h = L.low; L.state = 2; L.t = 3; } }
          else if (L.state === 2) { L.t -= dt; if (L.t <= 0) { L.state = 3; sfxAt('lift', L.cells[0]); } }
          else if (L.state === 3) { L.h += 1.6 * dt; if (L.h >= L.high) { L.h = L.high; L.state = 0; } }
          for (const c of L.cells) fl[c] = L.h;
        }
        // sector lighting effects
        const tm = levelTime;
        for (const c of fxCells) {
          const f = M.lfx[c], b = lightBase[c];
          if (f === 1) lightNow[c] = hash2((tm * 10) | 0, (c / 7) | 0, 5) < 0.25 ? b * 0.45 : b;
          else if (f === 2) lightNow[c] = b * (0.85 + 0.15 * Math.sin(tm * 3 + c * 0.1));
          else lightNow[c] = ((tm * 1.2) | 0) % 2 ? b * 0.4 : b;
        }
        for (const t of TEX) if (t.frames.length > 1) t.d = t.frames[((tm * 6) | 0) % t.frames.length];
      }

      // ---------------- messages / scoring ----------------
      function say(s) { msg = s; msgT = 150; }
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score >= nextLife) { nextLife += 50000; lives++; say('EXTRA LIFE!'); sfx.power(); }
      }

      // ---------------- combat ----------------
      function damagePlayer(n, src) {
        if (P.dead || godMode || P.pw.inv > 0) return;
        if (P.armor > 0) { let saved = Math.floor(n * (P.armorK === 2 ? 0.5 : 0.333)); if (saved > P.armor) saved = P.armor; P.armor -= saved; n -= saved; if (P.armor <= 0) P.armorK = 0; }
        P.hp -= n; flashRed = Math.min(1, flashRed + n / 40 + 0.15);
        P.face.mood = 'hurt'; P.face.t = 40;
        if (P.hurtT <= 0) { if (!demoQuiet()) sfx.pain(); P.hurtT = 0.4; }
        if (P.hp <= 0) { P.hp = 0; killPlayer(); }
      }
      function killPlayer() {
        if (P.dead) return;
        P.dead = true; P.deadT = 0; if (!demoQuiet()) sfx.die();
        if (mode === 'play') { mode = 'dying'; modeT = 0; }
      }
      function damageMon(m, n, byPlayer) {
        if (m.dead) return;
        m.hp -= n;
        if (m.hp <= 0) {
          m.dead = true; m.dt = 0; m.state = 'dead';
          if (m.def.decor) { explode(m.x, m.y, m.z + 0.3, 1.6, 128, null); m.gone = true; return; }
          kills++; addScore(m.def.score || 100);
          sfx.mon('die', Math.hypot(m.x - P.x, m.y - P.y));
          if (m.def.drop && rand() < 0.9) items.push({ kind: m.def.drop, d: ITEMDEF[m.def.drop], x: m.x, y: m.y, z: fl[cellOf(m.x, m.y)], taken: false, dropped: true });
          if (m.def.boss) { bossDead = true; exitPending = 200; say(GAME.bossDeadMsg); sfx.boom(1.5); for (let i = 0; i < 8; i++) fxs.push({ x: m.x + rr(-1, 1), y: m.y + rr(-1, 1), z: m.z + rr(0.3, 2.5), t: -i * 0.12, kind: 'boom' }); }
          return;
        }
        if (m.def.decor) return;
        if (m.state === 'idle') wake(m);
        if (rand() < (m.def.pain || 0.5) && m.state !== 'charge') { m.state = 'pain'; m.t = 0.22; if (rand() < 0.5) sfx.mon('pain', Math.hypot(m.x - P.x, m.y - P.y)); }
      }
      function wake(m) {
        if (m.state !== 'idle' || m.dead || m.def.decor) return;
        m.state = 'chase'; m.cd = rr(0.8, 1.8);
        sfx.mon(m.def.boss ? 'step' : 'sight', Math.hypot(m.x - P.x, m.y - P.y));
      }
      function explode(x, y, z, R, maxD, owner) {
        fxs.push({ x, y, z, t: 0, kind: 'boom' }); sfxAt('boom', cellOf(x, y));
        for (const m of mons) {
          if (m.dead || m === owner) continue;
          const d = Math.hypot(m.x - x, m.y - y); if (d > R + m.def.radius) continue;
          if (m.def.boss && owner && owner.def && owner.def.boss) continue;
          if (!los(x, y, z, m.x, m.y, m.z + m.def.h * 0.5)) continue;
          damageMon(m, Math.max(1, maxD * (1 - Math.max(0, d - m.def.radius) / R)) | 0, true);
        }
        const dp = Math.hypot(P.x - x, P.y - y);
        if (dp < R + 0.25 && los(x, y, z, P.x, P.y, P.z + 0.5)) damagePlayer(Math.max(1, maxD * (1 - Math.max(0, dp - 0.25) / R)) | 0);
      }
      function wallDist(x, y, ang, maxD, z) {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        for (let t = 0; t < maxD; t += 0.05) {
          const px = x + dx * t, py = y + dy * t, cx = px | 0, cy = py | 0, c = cy * mw + cx;
          if (cx < 0 || cy < 0 || cx >= mw || cy >= mh || solid[c] === 1 || (diag[c] && diagBlocks(c, cx, cy, px, py, 0)) || z < fl[c] || z > ce[c]) return t;
        }
        return maxD;
      }
      // pick the monster an aimed shot along `ang` would hit (horizontal autoaim like the original)
      function aimTarget(ang, maxD, slop) {
        const dx = Math.cos(ang), dy = Math.sin(ang), eye = P.z + 0.6;
        let best = null, bd = maxD;
        for (const m of mons) {
          if (m.dead) continue;
          const ox = m.x - P.x, oy = m.y - P.y, along = ox * dx + oy * dy;
          if (along <= 0 || along > bd) continue;
          const perp = Math.abs(-ox * dy + oy * dx);
          if (perp > m.def.radius + (slop || 0) * along) continue;
          if (!los(P.x, P.y, eye, m.x, m.y, m.z + m.def.h * 0.6)) continue;
          best = m; bd = along;
        }
        return best;
      }
      function hitscan(ang, dmg) {
        const eye = P.z + 0.6;
        const m = aimTarget(ang, 40, 0);
        const wd = m ? 0 : wallDist(P.x, P.y, ang, 40, eye);
        if (m) {
          damageMon(m, dmg, true);
          fxs.push({ x: m.x - Math.cos(ang) * m.def.radius, y: m.y - Math.sin(ang) * m.def.radius, z: m.z + m.def.h * 0.55, t: 0, kind: m.def.decor ? 'puff' : 'hit' });
        } else {
          const t = Math.max(0, wd - 0.05);
          fxs.push({ x: P.x + Math.cos(ang) * t, y: P.y + Math.sin(ang) * t, z: eye - 0.1, t: 0, kind: 'puff' });
        }
      }
      function fireProj(kind, x, y, z, ang, tz, owner, dist) {
        const d = PJ[kind];
        const vz = dist > 0.1 ? (tz - z) / dist * d.speed : 0;
        projs.push({ kind, d, x: x + Math.cos(ang) * 0.4, y: y + Math.sin(ang) * 0.4, z, vx: Math.cos(ang) * d.speed, vy: Math.sin(ang) * d.speed, vz, owner, life: 8, anim: 0 });
      }
      function alertMonsters() {
        const pc = cellOf(P.x, P.y);
        for (const m of mons) {
          if (m.state !== 'idle' || m.dead) continue;
          const c = cellOf(m.x, m.y), d = (m.def.fly ? fieldA : fieldG)[c];
          if (d >= 0 && d < 22) wake(m);
        }
      }
      function playerFire() {
        const w = WEAP[P.weap];
        if (w.ammo && !testInfinite) { if (P.ammo[w.ammo] < w.use) return false; P.ammo[w.ammo] -= w.use; }
        P.flash = w.kind === 'melee' ? 0 : 5; P.fireAnim = Math.min(w.rate, 18); P.face.fireT = (P.face.fireT || 0) + 1;
        if (!demoQuiet() && w.snd) sfx[w.snd]();
        if (w.kind === 'melee') {
          const m = aimTarget(P.ang, 1.2, 0.3);
          if (m) { damageMon(m, ri(w.dmg[0], w.dmg[1]) * (P.pw.bers > 0 ? 10 : 1), true); sfx.punch(); }
          return true;
        }
        if (w.kind === 'hit') {
          for (let i = 0; i < w.pellets; i++) {
            const sp2 = (w.pellets === 1 && P.refire === 0) ? 0 : w.spread;
            hitscan(P.ang + (rand() - 0.5) * 2 * sp2, ri(w.dmg[0], w.dmg[1]));
          }
        } else {
          const tgt = aimTarget(P.ang, 40, 0.07);
          const eye = P.z + 0.5, tz = tgt ? tgt.z + tgt.def.h * 0.5 : eye, dist = tgt ? Math.hypot(tgt.x - P.x, tgt.y - P.y) : 0;
          fireProj(w.proj, P.x, P.y, eye, P.ang, tz, P, dist);
        }
        alertMonsters();
        return true;
      }
      function bestWeapon() {
        const order = [5, 7, 3, 2, 1, 4, 6, 0];
        for (const i of order) { const w = WEAP[i]; if (P.has[i] && (!w.ammo || P.ammo[w.ammo] >= w.use)) return i; }
        return 0;
      }

      // ---------------- pickups ----------------
      function tryPickup(it) {
        const d = it.d;
        if (d.deco) return false;
        let ok = false, text = '';
        const NAMES = { clip: 'A CLIP', bullets: 'A BOX OF BULLETS', shells: '4 SHELLS', shellbox: 'A BOX OF SHELLS', rocket: 'A ROCKET', rocketbox: 'A CRATE OF ROCKETS', cell: 'AN ENERGY CELL', cellpack: 'A CELL PACK',
          stim: 'A STIM KIT', medikit: 'A MEDIKIT', vial: 'A HEALTH VIAL', shard: 'AN ARMOR SHARD', armor1: 'THE LIGHT ARMOR', armor2: 'THE HEAVY ARMOR', orb: 'VITAL ORB!', goldorb: 'AEGIS ORB!', radsuit: 'A HAZARD SUIT', berserk: 'RAGE KIT!',
          map: 'A STATION MAP', backpack: 'A BACKPACK', keyB: 'A BLUE KEYCARD', keyY: 'A YELLOW KEYCARD', keyR: 'A RED KEYCARD' };
        if (d.ammo) { const [k, n] = d.ammo; if (P.ammo[k] < P.max[k]) { P.ammo[k] = Math.min(P.max[k], P.ammo[k] + (it.dropped ? Math.ceil(n / 2) : n)); ok = true; } }
        else if (d.health) { const [n, cap] = d.health; if (P.hp < cap || d.always) { P.hp = Math.min(cap, P.hp + n); ok = true; } }
        else if (d.armor) { P.armor = Math.min(d.armor[1], P.armor + d.armor[0]); if (!P.armorK) P.armorK = 1; ok = true; }
        else if (d.armorSet) { if (P.armor < d.armorSet[0]) { P.armor = d.armorSet[0]; P.armorK = d.armorSet[1]; ok = true; } }
        else if (d.powerup) {
          ok = true;
          if (d.powerup === 'inv') P.pw.inv = 30; else if (d.powerup === 'rad') P.pw.rad = 30; else if (d.powerup === 'map') P.pw.map = 1;
          else if (d.powerup === 'bers') { P.pw.bers = 1; P.hp = Math.max(P.hp, 100); P.pending = 0; }
        }
        else if (d.backpack) { for (const k in P.max) P.max[k] = Math.max(P.max[k], { b: 400, s: 100, r: 100, c: 600 }[k]); P.ammo.b += 10; P.ammo.s += 4; P.ammo.r += 1; P.ammo.c += 20; ok = true; }
        else if (d.key) { if (!P.keys[d.key]) { P.keys[d.key] = 1; ok = true; } }
        else if (d.weapon != null) {
          const wi = d.weapon, w = WEAP[wi];
          const had = P.has[wi]; P.has[wi] = true;
          if (w.ammo) P.ammo[w.ammo] = Math.min(P.max[w.ammo], P.ammo[w.ammo] + ({ b: 20, s: 8, r: 2, c: 40 }[w.ammo]));
          ok = true; text = 'YOU GOT THE ' + w.name + '!';
          if (!had) { P.pending = wi; P.face.mood = 'grin'; P.face.t = 70; }
        }
        if (!ok) return false;
        it.taken = true;
        if (!it.dropped && !d.key && !d.weapon && (d.power || d.powerup || d.armorSet || d.backpack)) gotItems++;
        addScore(d.weapon != null || d.key ? 100 : 20);
        say(text || ('PICKED UP ' + (NAMES[it.kind] || 'SOMETHING') + (d.key || d.power || d.powerup ? '' : '.')));
        flashGold = 0.35;
        if (!demoQuiet()) (d.weapon != null ? sfx.weapon : (d.power || d.powerup || d.key) ? sfx.power : sfx.item)();
        return true;
      }

      // ---------------- player update ----------------
      function getControls() {
        if (botOn) return botThink();
        const k = api.key;
        const strafeMod = k('KeyZ') || k('AltLeft');
        const ctl = { fwd: 0, strafe: 0, turn: 0, fire: k('Space') || k('ControlLeft') || k('ControlRight'), use: api.pressed('KeyE'), run: k('ShiftLeft') || k('ShiftRight'), sel: -1, cycle: api.pressed('KeyX') };
        if (k('ArrowUp') || k('KeyW')) ctl.fwd += 1;
        if (k('ArrowDown') || k('KeyS')) ctl.fwd -= 1;
        const lr = (k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0);
        if (strafeMod) ctl.strafe += lr; else ctl.turn += lr;
        if (k('KeyD')) ctl.strafe += 1; if (k('KeyA')) ctl.strafe -= 1;
        for (let i = 1; i <= 7; i++) if (api.pressed('Digit' + i)) ctl.sel = i;
        return ctl;
      }
      function selectSlot(n) {
        let wi = n - 1;
        if (n === 3) { if (P.has[7] && (P.weap === 2 || !P.has[2]) && P.ammo.s >= 2) wi = 7; else if (!P.has[2] && P.has[7]) wi = 7; }
        if (n === 1 && P.weap === 0) return;
        if (wi >= 0 && P.has[wi] && wi !== P.weap) P.pending = wi;
      }
      function cycleWeapon() {
        const order = [0, 1, 2, 7, 3, 4, 5, 6];
        let i = order.indexOf(P.pending >= 0 ? P.pending : P.weap);
        for (let k = 1; k <= 8; k++) {
          const wi = order[(i + k) % 8], w = WEAP[wi];
          if (P.has[wi] && (!w.ammo || P.ammo[w.ammo] >= w.use)) { if (wi !== P.weap) P.pending = wi; return; }
        }
      }
      function updatePlayer(dt) {
        const ctl = getControls();
        if (P.dead) { P.deadT += dt; P.viewZ += (P.z - 0.45 - P.viewZ) * 0.08; return; }
        if (ctl.sel > 0) selectSlot(ctl.sel);
        if (ctl.cycle) cycleWeapon();
        const run = ctl.run;
        P.ang += ctl.turn * (run ? 3.8 : 2.7) * dt;
        const dx = Math.cos(P.ang), dy = Math.sin(P.ang);
        const spd = run ? 7.5 : 4.8;
        const tvx = (dx * ctl.fwd - dy * ctl.strafe * 0.9) * spd, tvy = (dy * ctl.fwd + dx * ctl.strafe * 0.9) * spd;
        P.vx += (tvx - P.vx) * 0.3; P.vy += (tvy - P.vy) * 0.3;
        const r = 0.25;
        let bumped = -1;
        const tryAxis = (nx, ny) => {
          const f = areaFloor(nx, ny, r, P.z, 0.38, 0.85, false);
          if (isNaN(f)) { if (blockCell >= 0) bumped = blockCell; return false; }
          if (blockedByThing(P, nx, ny, r)) return false;
          P.x = nx; P.y = ny; return true;
        };
        const mvx = P.vx * dt, mvy = P.vy * dt;
        const steps = Math.ceil(Math.max(Math.abs(mvx), Math.abs(mvy)) / 0.15) || 1;
        for (let s = 0; s < steps; s++) { tryAxis(P.x + mvx / steps, P.y); tryAxis(P.x, P.y + mvy / steps); }
        if (bumped >= 0 && ctl.fwd > 0) {
          const bx = (bumped % mw) + 0.5 - P.x, by = (bumped / mw | 0) + 0.5 - P.y;
          if (bx * dx + by * dy > 0.2) useCell(bumped, true);
        }
        if (ctl.use) { for (const t of [0.6, 1.0, 1.4]) { const c = cellOf(P.x + dx * t, P.y + dy * t); if (useCell(c, false)) break; } }
        // height
        const f = areaFloor(P.x, P.y, r, 99, 99, 0, false);
        const floorH = isNaN(f) ? P.z : f;
        if (P.z < floorH) { P.z = floorH; P.vz = 0; }
        else if (P.z > floorH) { P.vz -= 22 * dt; P.z += P.vz * dt; if (P.z <= floorH) { if (P.vz < -7 && !demoQuiet()) sfx.oof(); P.z = floorH; P.vz = 0; } }
        const moving = Math.hypot(P.vx, P.vy);
        P.bob += moving * dt * 1.6;
        const targetView = P.z;
        P.viewZ = P.viewZ < targetView ? Math.min(targetView, P.viewZ + Math.max(0.06, (targetView - P.viewZ) * 0.25)) : targetView;
        // cell events
        const pc = cellOf(P.x, P.y);
        if (pc !== P.lastCell) {
          const li = liftAt[pc]; if (li >= 0 && lifts[li].state === 0 && Math.abs(P.z - lifts[li].h) < 0.05) triggerLift(lifts[li]);
          P.lastCell = pc;
        }
        if (flag[pc] & 4) { flag[pc] &= ~4; gotSecrets++; addScore(500); say('YOU FOUND A SECRET AREA!'); if (!demoQuiet()) sfx.secret(); for (let i = 0; i < M.n; i++) if ((flag[i] & 4) && M.room[i] < 0 && Math.abs((i % mw) - (pc % mw)) < 4 && Math.abs((i / mw | 0) - (pc / mw | 0)) < 4) flag[i] &= ~4; }
        P.nukeT -= dt;
        if ((flag[pc] & 3) && P.z <= fl[pc] + 0.02 && P.nukeT <= 0) {
          P.nukeT = 0.9;
          if (P.pw.rad <= 0 || (flag[pc] & 2 && rand() < 0.2)) damagePlayer(flag[pc] & 2 ? 10 : 5);
        }
        // pickups
        for (const it of items) {
          if (it.taken || it.d.deco) continue;
          if (Math.abs(it.x - P.x) < 0.55 && Math.abs(it.y - P.y) < 0.55 && Math.abs(it.z - P.z) < 0.6) tryPickup(it);
        }
        // powerups
        for (const k of ['inv', 'rad']) if (P.pw[k] > 0) P.pw[k] -= dt;
        if (P.hurtT > 0) P.hurtT -= dt;
        // weapon state
        if (P.pending >= 0) {
          P.wy = Math.min(1, P.wy + dt * 6);
          if (P.wy >= 1) { P.weap = P.pending; P.pending = -1; }
        } else if (P.wy > 0) P.wy = Math.max(0, P.wy - dt * 6);
        if (P.cd > 0) P.cd--;
        if (P.flash > 0) P.flash--;
        if (P.fireAnim > 0) P.fireAnim--;
        const w = WEAP[P.weap];
        if (P.windup > 0) {
          P.windup--;
          if (P.windup === 0) { if (!playerFire()) P.pending = bestWeapon(); P.cd = w.rate; }
        } else if (ctl.fire && P.pending < 0 && P.wy === 0 && P.cd <= 0) {
          if (w.ammo && P.ammo[w.ammo] < w.use && !testInfinite) { const b = bestWeapon(); if (b !== P.weap) P.pending = b; }
          else if (w.windup) { P.windup = w.windup; if (!demoQuiet()) sfx.bigCharge(); }
          else { playerFire(); P.cd = w.rate; P.refire++; }
        }
        if (!ctl.fire) { P.refire = 0; P.face.fireT = 0; }
        // face
        if (P.face.t > 0) P.face.t--; else P.face.mood = 'normal';
        if (P.face.fireT > 60 && P.face.mood === 'normal') P.face.mood = 'angry';
        if (--P.face.lookT <= 0) { P.face.look = ri(-1, 1); P.face.lookT = ri(40, 120); }
      }

      // ---------------- monsters ----------------
      function canSee(m, front) {
        const dx = P.x - m.x, dy = P.y - m.y, d = Math.hypot(dx, dy);
        if (d > 40 || P.dead) return false;
        if (front && d > 2.5) { let a = Math.atan2(dy, dx) - m.ang; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > 1.75) return false; }
        return los(m.x, m.y, m.z + m.def.h * 0.8, P.x, P.y, P.z + 0.6);
      }
      function monTryMove(m, nx, ny) {
        const D = m.def;
        const f = areaFloor(nx, ny, D.radius, D.fly ? m.z : m.z, D.fly ? 99 : 0.4, D.fly ? D.h : D.h * 0.9, !!D.fly);
        if (isNaN(f)) {
          if (blockCell >= 0) { const di = doorAt[blockCell]; if (di >= 0) { const d = doors[di]; if (!d.key && !d.secret && !d.bars && d.state === 0) openDoor(d); } }
          return false;
        }
        if (!D.fly && f < m.z - 1.6) return false;
        if (!D.fly && (flag[cellOf(nx, ny)] & 2) && !(flag[cellOf(m.x, m.y)] & 2)) return false;
        if (blockedByThing(m, nx, ny, D.radius)) return false;
        m.x = nx; m.y = ny; return true;
      }
      function monMove(m, dt, speedMul) {
        const D = m.def, spd = D.speed * dt * (speedMul || 1);
        const dxp = P.x - m.x, dyp = P.y - m.y, dist = Math.hypot(dxp, dyp);
        let tx = P.x, ty = P.y;
        if (!(m.sees && dist < 6)) {
          const field = D.fly ? fieldA : fieldG, c = cellOf(m.x, m.y);
          let best = field[c] >= 0 ? field[c] : 9999, bc = -1;
          for (const o of [1, -1, mw, -mw]) { const v = field[c + o]; if (v >= 0 && v < best) { best = v; bc = c + o; } }
          if (bc >= 0) { tx = (bc % mw) + 0.5; ty = (bc / mw | 0) + 0.5; }
        } else if (dist > 1.5 && !D.melee) { const s = m.side * 0.6; tx = P.x - dyp / dist * s * 2; ty = P.y + dxp / dist * s * 2; }
        let ddx = tx - m.x, ddy = ty - m.y; const dl = Math.hypot(ddx, ddy) || 1; ddx /= dl; ddy /= dl;
        m.ang = Math.atan2(ddy, ddx);
        if (monTryMove(m, m.x + ddx * spd, m.y + ddy * spd)) { m.stuck = 0; return; }
        if (monTryMove(m, m.x + ddx * spd, m.y) || monTryMove(m, m.x, m.y + ddy * spd)) return;
        const px = -ddy * m.side, py = ddx * m.side;
        if (!monTryMove(m, m.x + px * spd, m.y + py * spd)) { m.side = -m.side; m.stuck++; }
      }
      function monAttack(m) {
        const D = m.def, dx = P.x - m.x, dy = P.y - m.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
        m.flashT = 0.15;
        if (m.melee) {
          if (dist < D.radius + 0.95) { damagePlayer(ri(D.melee[0], D.melee[1])); sfx.mon('claw', dist); }
          return;
        }
        const Rg = D.ranged;
        if (Rg.summon && rand() < Rg.summon && mons.filter(o => !o.dead && o.kind === Rg.minion).length < 8) {
          for (let i = 0; i < 2; i++) { const a = rand() * TAU; const nx = m.x + Math.cos(a) * 2, ny = m.y + Math.sin(a) * 2; if (!isNaN(areaFloor(nx, ny, 0.3, m.z + 1, 2, 0.5, false))) { const s = spawnMon(Rg.minion, nx, ny, true); if (s) { s.z = fl[cellOf(nx, ny)]; fxs.push({ x: nx, y: ny, z: s.z + 0.3, t: 0, kind: 'tele' }); totalKills++; } } }
          return;
        }
        if (Rg.kind === 'hit') {
          sfx.mon('shoot', dist);
          for (let i = 0; i < (Rg.pellets || 1); i++) if (rand() < clamp(0.85 - dist * 0.05, 0.15, 0.7) && los(m.x, m.y, m.z + D.h * 0.7, P.x, P.y, P.z + 0.5)) damagePlayer(ri(Rg.dmg[0], Rg.dmg[1]));
        } else {
          sfx.mon('throw', dist);
          const n = Rg.spreadShots || 1;
          for (let i = 0; i < n; i++) {
            const a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.12 : 0) + (rand() - 0.5) * 0.05;
            const oz = m.z + D.h * (Rg.zf || 0.65);
            fireProj(Rg.proj, m.x, m.y, oz, a, P.z + 0.45, m, dist);
          }
        }
      }
      function updateMon(m, dt) {
        const D = m.def;
        if (m.dead) { m.dt += dt; if (m.dt > 1.8) m.fade = Math.max(0, 1 - (m.dt - 1.8) / 1.4); if (m.dt > 3.2) m.gone = true; return; }
        if (D.decor) return;
        m.anim += dt * (D.speed > 0 ? 1 : 0);
        if (m.flashT > 0) m.flashT -= dt;
        // vertical
        const c = cellOf(m.x, m.y);
        if (D.fly) {
          const want = clamp(P.z + 0.35, fl[c] + 0.15, ce[c] - D.h - 0.05);
          m.z += clamp(want - m.z, -1.5 * dt, 1.5 * dt);
          const f = areaFloor(m.x, m.y, D.radius, 99, 99, 0, false); if (!isNaN(f) && m.z < f) m.z = f;
        } else {
          const f = areaFloor(m.x, m.y, D.radius, 99, 99, 0, false);
          if (!isNaN(f)) { if (m.z < f) m.z = f; else if (m.z > f) m.z = Math.max(f, m.z - 6 * dt); }
        }
        if (m.state === 'idle') { if ((tick + m.id) % 8 === 0 && canSee(m, true)) wake(m); return; }
        if (P.dead) { if (rand() < 0.02) m.ang += rr(-1, 1); return; }
        if ((tick + m.id) % 6 === 0) m.sees = canSee(m, false);
        m.cd -= dt;
        const dist = Math.hypot(P.x - m.x, P.y - m.y);
        if (m.state === 'pain') { m.t -= dt; if (m.t <= 0) m.state = 'chase'; return; }
        if (m.state === 'attack') {
          m.t -= dt; m.ang = Math.atan2(P.y - m.y, P.x - m.x);
          if (m.t <= 0) {
            monAttack(m); m.shots--;
            if (m.shots > 0 && m.sees) m.t = D.burstGap || 0.25;
            else { m.state = 'chase'; m.cd = D.cool * rr(0.6, 1.4); }
          }
          return;
        }
        if (m.state === 'charge') {
          m.t -= dt;
          const ox = m.x, oy = m.y;
          const sp2 = D.speed * 3 * dt;
          if (!monTryMove(m, m.x + Math.cos(m.ang) * sp2, m.y + Math.sin(m.ang) * sp2) || m.t <= 0) { m.state = 'chase'; m.cd = D.cool; }
          if (dist < D.radius + 0.45) { damagePlayer(ri(D.melee[0], D.melee[1]) + 5); sfx.mon('claw', 0); m.state = 'chase'; m.cd = D.cool; }
          return;
        }
        // chase
        if (m.sees && m.cd <= 0) {
          if (D.melee && dist < D.radius + 0.9) { m.state = 'attack'; m.melee = true; m.t = D.windup || 0.3; m.shots = 1; return; }
          if (D.charge && dist < 10 && dist > 2.5 && rand() < 0.05) { m.state = 'charge'; m.t = 1.3; m.ang = Math.atan2(P.y - m.y, P.x - m.x); sfx.mon('sight', dist); return; }
          if (D.ranged && dist < (D.ranged.range || 30) && rand() < (D.ranged.chance || 0.06) * 0.4 * (dist < 8 ? 1.6 : 1)) { m.state = 'attack'; m.melee = false; m.t = D.windup || 0.4; m.shots = D.burst || 1; return; }
        }
        if (D.melee && m.sees && dist < D.radius + 0.6) return;
        monMove(m, dt);
        if (D.boss && ((m.anim * 2) | 0) !== ((m.anim * 2 - dt * 2) | 0)) sfx.mon('step', dist);
      }

      // ---------------- projectiles / fx ----------------
      function updateProjs(dt) {
        for (const p of projs) {
          if (p.dead) continue;
          p.life -= dt; p.anim += dt;
          if (p.life <= 0) { p.dead = true; continue; }
          if (p.d.seek && !P.dead) {
            const a = Math.atan2(P.y - p.y, P.x - p.x), cur = Math.atan2(p.vy, p.vx);
            let da = Math.atan2(Math.sin(a - cur), Math.cos(a - cur)); da = clamp(da, -1.6 * dt, 1.6 * dt);
            const sp2 = p.d.speed; p.vx = Math.cos(cur + da) * sp2; p.vy = Math.sin(cur + da) * sp2; p.vz += clamp((P.z + 0.4 - p.z) * 2 - p.vz, -2 * dt, 2 * dt);
          }
          if (p.d.grav) p.vz -= 4 * dt;
          const n = Math.ceil(Math.hypot(p.vx, p.vy) * dt / 0.1);
          for (let i = 0; i < n && !p.dead; i++) {
            p.x += p.vx * dt / n; p.y += p.vy * dt / n; p.z += p.vz * dt / n;
            const cx = p.x | 0, cy = p.y | 0, c = cy * mw + cx;
            let hitWall = cx < 0 || cy < 0 || cx >= mw || cy >= mh || solid[c] === 1 || (diag[c] && diagBlocks(c, cx, cy, p.x, p.y, 0)) || p.z < fl[c] || p.z > ce[c];
            if (hitWall) {
              if (ct[c] < 0 && p.z > ce[c] && solid[c] !== 1) { p.dead = true; break; }
              projHit(p, null); break;
            }
            if (p.owner === P) {
              for (const m of mons) {
                if (m.dead) continue;
                if (Math.abs(m.x - p.x) < m.def.radius + 0.1 && Math.abs(m.y - p.y) < m.def.radius + 0.1 && p.z > m.z - 0.1 && p.z < m.z + m.def.h + 0.1) { projHit(p, m); break; }
              }
            } else if (!P.dead && Math.abs(P.x - p.x) < 0.35 && Math.abs(P.y - p.y) < 0.35 && p.z > P.z - 0.1 && p.z < P.z + 0.95) projHit(p, P);
          }
        }
        projs = projs.filter(p => !p.dead);
      }
      function projHit(p, target) {
        p.dead = true;
        const d = p.d, dmg = ri(d.dmg[0], d.dmg[1]);
        const bx = p.x - p.vx * 0.012, by = p.y - p.vy * 0.012;
        if (d.splash) { if (target && target !== P) damageMon(target, dmg, true); else if (target === P) damagePlayer(dmg); explode(bx, by, p.z, d.splash[0], d.splash[1], p.owner === P ? null : p.owner); return; }
        if (d.big) {
          if (target && target !== P) damageMon(target, dmg, true);
          // spray: energy tracers from the shooter across its view cone
          for (let i = 0; i < 30; i++) { const a = P.ang - 0.7 + i / 29 * 1.4; const m = aimTarget(a, 16, 0); if (m) { damageMon(m, ri(15, 60), true); fxs.push({ x: m.x, y: m.y, z: m.z + m.def.h * 0.5, t: 0, kind: 'tele' }); } }
          fxs.push({ x: bx, y: by, z: p.z, t: 0, kind: 'tele' }); sfx.boom(0.8); return;
        }
        if (target === P) damagePlayer(dmg); else if (target) damageMon(target, dmg, true);
        fxs.push({ x: bx, y: by, z: p.z, t: 0, kind: p.kind === 'plasma' ? 'tele' : 'hit' });
      }
      function updateFx(dt) { for (const f of fxs) f.t += dt; fxs = fxs.filter(f => f.t < 0.5); }

      // ---------------- bot (attract demo + self-test autopilot) ----------------
      let bot = null;
      function botReset() { bot = { path: [], goal: -1, repath: 0, lastX: 0, lastY: 0, stuckT: 0, wiggle: 0, wdir: 1, visited: new Uint8Array(M.n), aimM: null, ignore: new Map(), decoCell: (() => { const a = new Uint8Array(M.n); for (const it of items) if (it.d.solid) a[cellOf(it.x, it.y)] = 1; return a; })(), goalKind: '' }; }
      function botPass(n, c) {
        if (solid[c] === 1 || diag[c] || bot.decoCell[c]) return false;
        const di = doorAt[c];
        if (di >= 0) { const d = doors[di]; if (d.state !== 2 && d.state !== 1) { if (d.secret || d.bars) return false; if (d.key && !P.keys[d.key]) return false; } return true; }
        if (liftAt[c] >= 0 || liftAt[n] >= 0) return true;
        if (ce[c] - fl[c] < 0.9) return false;
        if (fl[c] - fl[n] > 0.38) return false;
        return true;
      }
      function botPlan() {
        const start = cellOf(P.x, P.y);
        const dist = new Int32Array(M.n).fill(-1), prev = new Int32Array(M.n).fill(-1);
        dist[start] = 0; const q = [start];
        for (let h = 0; h < q.length; h++) { const c = q[h]; for (const nc of [c + 1, c - 1, c + mw, c - mw]) { if (dist[nc] >= 0 || !botPass(c, nc)) continue; dist[nc] = dist[c] + 1; prev[nc] = c; q.push(nc); } }
        const goals = [];
        const near = c => { let b = -1; for (const nc of [c + 1, c - 1, c + mw, c - mw]) if (dist[nc] >= 0 && (b < 0 || dist[nc] < dist[b])) b = nc; return b; };
        for (const s of switches) if (!s.on) { const g = near(s.c); if (g >= 0) goals.push({ c: g, pri: s.kind === 'exit' ? 0 : 2, sw: s.c }); }
        for (const it of items) if (!it.taken && it.d.key && !P.keys[it.d.key]) { const c = cellOf(it.x, it.y); if (dist[c] >= 0) goals.push({ c, pri: 1 }); }
        for (const it of items) if (!it.taken && it.d.weapon != null && !P.has[it.d.weapon]) { const c = cellOf(it.x, it.y); if (dist[c] >= 0 && dist[c] < 25) goals.push({ c, pri: 1.5 }); }
        for (const m of mons) if (!m.dead && m.def.boss) { const c = cellOf(m.x, m.y); let g = dist[c] >= 0 ? c : near(c); if (g >= 0) goals.push({ c: g, pri: 3 }); }
        let best = null;
        for (const g of goals) if (!best || g.pri < best.pri || (g.pri === best.pri && dist[g.c] < dist[best.c])) best = g;
        if (!best) {
          let bc = -1;
          for (const c of q) if (!bot.visited[c] && (bc < 0 || dist[c] < dist[bc])) bc = c;
          if (bc < 0) { for (const m of mons) if (!m.dead && !m.def.decor) { const c = cellOf(m.x, m.y); if (dist[c] >= 0) { bc = c; break; } } }
          if (bc < 0) bc = q[(rand() * q.length) | 0];
          best = { c: bc, pri: 9 };
        }
        const path = []; for (let c = best.c; c >= 0 && c !== start; c = prev[c]) path.unshift(c);
        bot.path = path; bot.goal = best.c; bot.sw = best.sw == null ? -1 : best.sw; bot.goalKind = best.pri;
      }
      function botThink() {
        const ctl = { fwd: 0, strafe: 0, turn: 0, fire: false, use: false, run: true, sel: -1, cycle: false };
        if (P.dead) return ctl;
        const pc = cellOf(P.x, P.y);
        for (const o of [0, 1, -1, mw, -mw]) bot.visited[pc + o] = 1;
        if (--bot.repath <= 0 || !bot.path.length) { botPlan(); bot.repath = 30; }
        while (bot.path.length && bot.path[0] === pc) bot.path.shift();
        let tx, ty;
        if (bot.path.length) {
          const c = bot.path[0]; tx = (c % mw) + 0.5; ty = (c / mw | 0) + 0.5;
          if (bot.path.length > 1 && Math.hypot(tx - P.x, ty - P.y) < 0.3) { bot.path.shift(); }
        } else if (bot.sw >= 0) { tx = (bot.sw % mw) + 0.5; ty = (bot.sw / mw | 0) + 0.5; ctl.use = true; }
        else { tx = P.x + Math.cos(P.ang); ty = P.y + Math.sin(P.ang); }
        if (bot.sw >= 0 && Math.hypot((bot.sw % mw) + 0.5 - P.x, (bot.sw / mw | 0) + 0.5 - P.y) < 1.5) { bot.path = []; tx = (bot.sw % mw) + 0.5; ty = (bot.sw / mw | 0) + 0.5; }
        let want = Math.atan2(ty - P.y, tx - P.x);
        // combat
        let target = null, td = 1e9;
        if ((tick & 3) === 0 || !bot.aimM || bot.aimM.dead) {
          bot.aimM = null;
          for (const m of mons) { if (m.dead || m.def.decor) continue; const d = Math.hypot(m.x - P.x, m.y - P.y); if (d > 4 && (bot.ignore.get(m) || 0) > 480) continue; if (d < 22 && d < td && los(P.x, P.y, P.z + 0.6, m.x, m.y, m.z + m.def.h * 0.6)) { td = d; target = m; } }
          bot.aimM = target;
        }
        target = bot.aimM;
        if (target) bot.ignore.set(target, (bot.ignore.get(target) || 0) + 1);
        let moveAng = want;
        if (target) {
          const ta = Math.atan2(target.y - P.y, target.x - P.x);
          want = ta;
          const da = Math.atan2(Math.sin(ta - P.ang), Math.cos(ta - P.ang));
          const d = Math.hypot(target.x - P.x, target.y - P.y);
          if (Math.abs(da) < Math.max(0.05, Math.atan(target.def.radius * 0.8 / Math.max(0.3, d)))) ctl.fire = true;
          const pref = d < 3 ? [7, 2, 3, 5, 1, 0] : [6, 5, 4, 7, 3, 2, 1, 0];
          for (const wi of pref) { const w = WEAP[wi]; if (P.has[wi] && (!w.ammo || P.ammo[w.ammo] >= w.use)) { if (P.weap !== wi && P.pending < 0) P.pending = wi; break; } }
        }
        let da = Math.atan2(Math.sin(want - P.ang), Math.cos(want - P.ang));
        ctl.turn = clamp(da * 4, -1, 1);
        // move along path relative to facing
        const ma = moveAng - P.ang;
        if (bot.path.length || bot.sw >= 0) { ctl.fwd = Math.cos(ma) > 0.3 ? 1 : Math.cos(ma) < -0.3 ? -1 : 0; ctl.strafe = Math.sin(ma) > 0.3 ? 1 : Math.sin(ma) < -0.3 ? -1 : 0; if (!target && Math.abs(da) > 0.5) { ctl.fwd = 0; ctl.strafe = 0; } }
        if (!target && bot.path.length) { const nc = bot.path[0]; if (doorAt[nc] >= 0 || liftAt[nc] >= 0 || swAt[nc] >= 0) ctl.use = true; }
        // stuck handling
        if ((tick % 60) === 0) {
          if (Math.hypot(P.x - bot.lastX, P.y - bot.lastY) < 0.25 && (bot.path.length || bot.sw >= 0)) { bot.stuckT++; if (bot.stuckT > 1) { bot.wiggle = 25; bot.wdir = rand() < 0.5 ? 1 : -1; bot.repath = 0; } } else bot.stuckT = 0;
          bot.lastX = P.x; bot.lastY = P.y;
        }
        if (bot.wiggle > 0) { bot.wiggle--; ctl.strafe = bot.wdir; ctl.fwd = bot.wiggle > 12 ? -1 : 1; ctl.use = true; }
        if (bot.sw >= 0 && !bot.path.length) { ctl.turn = clamp(Math.atan2(Math.sin(Math.atan2(ty - P.y, tx - P.x) - P.ang), Math.cos(Math.atan2(ty - P.y, tx - P.x) - P.ang)) * 4, -1, 1); ctl.fwd = 1; ctl.strafe = 0; ctl.use = true; }
        bot.lastCtl = ctl;
        return ctl;
      }

      // ---------------- game flow ----------------
      function startGame() {
        demo = false; botOn = false; godMode = false;
        score = 0; lives = 3; nextLife = 50000; P = newPlayer();
        storyLines = GAME.intro; storyT = 0; storyNext = () => { loadLevel(0); mode = 'play'; };
        mode = 'story'; modeT = 0;
      }
      function startDemo() {
        demo = true; botOn = true; godMode = true; P = newPlayer(); P.has[2] = true; P.ammo.s = 20;
        loadLevel(GAME.demoLevel || 0); mode = 'demo'; modeT = 0;
      }
      function finishLevel() {
        const par = GAME.levels[level].par || 120;
        const tb = Math.max(0, Math.round(par - levelTime)) * 10;
        tallyData = { name: GAME.levels[level].name, k: totalKills ? Math.round(kills / totalKills * 100) : 100, i: totalItems ? Math.round(gotItems / totalItems * 100) : 100, s: totalSecrets ? Math.round(gotSecrets / totalSecrets * 100) : 100, time: levelTime, par, bonus: 1000 + tb, shown: 0, t: 0 };
        addScore(tallyData.bonus);
        if (tallyData.k === 100) addScore(1000);
        mode = 'tally'; modeT = 0;
      }
      function afterTally() {
        const L = GAME.levels;
        if (GAME.storyAfter && GAME.storyAfter[level]) { storyLines = GAME.storyAfter[level]; storyT = 0; const nx = level + 1; storyNext = () => goLevel(nx); mode = 'story'; return; }
        goLevel(level + 1);
      }
      function goLevel(n) {
        if (n >= GAME.levels.length) { storyLines = GAME.ending; storyT = 0; storyNext = () => { api.setHiScore(score); hiScore = Math.max(hiScore, score); mode = 'scores'; modeT = 0; attractPhase = 0; }; mode = 'story'; return; }
        // carry inventory, drop keys and powerups
        P.hp = Math.max(P.hp, 1);
        loadLevel(n); mode = 'play';
      }
      function playerDiedDone() {
        if (demo) { mode = 'title'; modeT = 0; return; }
        if (lives > 1) { lives--; resetLoadout(); loadLevel(level); mode = 'play'; return; }
        lives = 0;
        const cont = () => { lives = 3; resetLoadout(); loadLevel(level); mode = 'play'; score = Math.floor(score / 2); };
        const over = () => { api.setHiScore(score); hiScore = Math.max(hiScore, score); mode = 'gameover'; modeT = 0; };
        if (api.offerContinue) { mode = 'contwait'; api.offerContinue(cont, over); } else over();
      }

      // ---------------- update ----------------
      function worldTick(dt) {
        tick++; levelTime += dt;
        updateMovers(dt);
        updatePlayer(dt);
        if (tick % 15 === 0) buildFields();
        for (const m of mons) updateMon(m, dt);
        mons = mons.filter(m => !m.gone);
        updateProjs(dt);
        updateFx(dt);
        if (msgT > 0) msgT--;
        if (levelBanner > 0) levelBanner--;
        if (oopsT > 0) oopsT -= dt;
        flashRed = Math.max(0, flashRed - dt * 1.2); flashGold = Math.max(0, flashGold - dt * 1.5);
        if (exitPending > 0 && --exitPending === 0) { if (demo) { mode = 'title'; modeT = 0; } else finishLevel(); }
      }
      function update(dt) {
        modeT += dt;
        if (coinFlash > 0) coinFlash--;
        const startPressed = api.pressed('Enter') || (api.pressed('Space') && (mode === 'title' || mode === 'scores' || mode === 'demo'));
        if (mode === 'title' || mode === 'scores' || mode === 'demo') {
          if (startPressed) { if (api.useCredit()) { au.melody([[330, 0.08], [392, 0.08], [494, 0.08], [659, 0.2]], { type: 'square', vol: 0.12 }); startGame(); return; } coinFlash = 90; au.tone(80, 0.25, { type: 'square', vol: 0.2 }); }
          if (mode === 'title' && modeT > 9) startDemo();
          else if (mode === 'demo') { worldTick(dt); if (modeT > 40 || (P.dead && P.deadT > 2)) { mode = 'scores'; modeT = 0; } }
          else if (mode === 'scores' && modeT > 6) { mode = 'title'; modeT = 0; }
          return;
        }
        if (mode === 'story') {
          storyT += dt;
          if ((api.pressed('Space') || api.pressed('Enter')) && storyT > 0.6) { const total = storyLines.join('').length; if (storyT * 30 < total) storyT = 1e3; else { mode = 'wait'; storyNext(); } }
          return;
        }
        if (mode === 'play') {
          if (api.pressed('Tab') || api.pressed('KeyM') || api.pressed('Enter')) showMap = !showMap;
          worldTick(dt);
          if (!demo) music();
          return;
        }
        if (mode === 'dying') { worldTick(dt); if (P.deadT > 2.2 && (api.pressed('Space') || api.pressed('Enter') || P.deadT > 4)) playerDiedDone(); return; }
        if (mode === 'tally') {
          const td = tallyData; td.t += dt;
          const prev = td.shown; td.shown = Math.min(5, td.t / 0.7);
          if ((td.shown | 0) !== (prev | 0)) sfx.tick();
          if ((api.pressed('Space') || api.pressed('Enter')) && td.t > 0.8) { if (td.shown < 5) td.t = 99; else { mode = 'wait'; afterTally(); } }
          return;
        }
        if (mode === 'gameover') { if (modeT > 5 || ((api.pressed('Space') || api.pressed('Enter')) && modeT > 1.5)) { mode = 'title'; modeT = 0; } return; }
        if (mode === 'contwait') { if (!api.continuing) { mode = 'gameover'; modeT = 0; } return; }
      }

      // ---------------- renderer ----------------
      let px = 0, py = 0, eye = 0, dirX = 1, dirY = 0, plX = 0, plY = 1, HZ = 84;
      const skyU = new Int32Array(VW);
      function lightIdx(l, t, adj) { let v = l * 36 - t * 1.5 + adj; return (v < 2 ? 2 : v > 31 ? 31 : v) | 0; }
      function flatSpan(x, r0, r1, h, tex, light, rdx, rdy) {
        const d = TEX[tex].d, dh = eye - h;
        for (let r = r0; r < r1; r++) {
          const dy = r + 0.5 - HZ; if (dy === 0) continue;
          const t = dh * PROJ / dy;
          const wx = px + rdx * t, wy = py + rdy * t;
          let lv = light * 36 - t * 1.5; lv = (lv < 2 ? 2 : lv > 31 ? 31 : lv) | 0;
          const i = r * W + x;
          buf[i] = CM[(lv << 8) + d[((((wy * 64) | 0) & 63) << 6) + (((wx * 64) | 0) & 63)]];
          zb[i] = t;
        }
      }
      function skySpan(x, r0, r1) {
        const d = SKY, u = skyU[x];
        for (let r = r0; r < r1; r++) { const v = clamp(r + 44 - (HZ - 84), 0, 127); const i = r * W + x; buf[i] = CM[27 * 256 + d[v * 256 + u]]; zb[i] = 1e9; }
      }
      function wallSpan(x, r0, r1, anchor, t, tex, u, lv) {
        const d = TEX[tex].d, tu = ((u * 64) | 0) & 63, lb = lv << 8;
        const dv = t / PROJ * 64;
        let v = (anchor - eye + (r0 + 0.5 - HZ) * t / PROJ) * 64 + 65536;
        for (let r = r0; r < r1; r++) { const i = r * W + x; buf[i] = CM[lb + d[((v | 0) & 63) * 64 + tu]]; zb[i] = t; v += dv; }
      }
      let SKY = null;
      function castColumn(x) {
        const camX = 2 * (x + 0.5) / VW - 1;
        const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
        let mx = px | 0, my = py | 0;
        const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
        let stx, sty, sx, sy;
        if (rdx < 0) { stx = -1; sx = (px - mx) * ddx; } else { stx = 1; sx = (mx + 1 - px) * ddx; }
        if (rdy < 0) { sty = -1; sy = (py - my) * ddy; } else { sty = 1; sy = (my + 1 - py) * ddy; }
        let top = 0, bot = VH, tEnter = 0, ci = my * mw + mx;
        for (let it = 0; it < 220; it++) {
          let tExit, side;
          if (sx < sy) { tExit = sx; side = 0; } else { tExit = sy; side = 1; }
          flag[ci] |= 8;
          const cf = fl[ci], cc = ce[ci], cl = lightNow[ci];
          let tFar = tExit, dHit = false;
          const dg = diag[ci];
          if (dg) {
            const lx = px - mx, ly = py - my; let th = -1;
            if (dg === 1 || dg === 4) { const den = rdx + rdy; if (den !== 0) th = (1 - lx - ly) / den; }
            else { const den = rdx - rdy; if (den !== 0) th = -(lx - ly) / den; }
            if (th >= tEnter && th <= tExit) { tFar = th; dHit = true; }
          }
          if (tFar > 1e-4) {
            const yF = HZ + (eye - cf) * PROJ / tFar;
            let r0 = Math.ceil(yF - 0.5); if (r0 < top) r0 = top;
            if (r0 < bot) { if (cf < eye) flatSpan(x, r0, bot, cf, ft[ci], cl, rdx, rdy); bot = r0; }
            const yC = HZ + (eye - cc) * PROJ / tFar;
            let r1 = Math.ceil(yC - 0.5); if (r1 > bot) r1 = bot;
            if (r1 > top) { if (ct[ci] < 0) skySpan(x, top, r1); else if (cc > eye) flatSpan(x, top, r1, cc, ct[ci], cl, rdx, rdy); top = r1; }
            if (top >= bot) return;
          }
          if (dHit) {
            const yA = HZ + (eye - cc) * PROJ / tFar, yB = HZ + (eye - cf) * PROJ / tFar;
            const r0 = Math.max(top, Math.ceil(yA - 0.5)), r1 = Math.min(bot, Math.ceil(yB - 0.5));
            let u = (px + rdx * tFar) - mx;
            if (r1 > r0) wallSpan(x, r0, r1, cc, tFar, wt[ci], u, lightIdx(cl, tFar, 1));
            if (top < r0) fillBlack(x, top, Math.min(r0, bot)); if (r1 < bot) fillBlack(x, Math.max(r1, top), bot);
            return;
          }
          let nx = mx, ny = my;
          if (side === 0) nx += stx; else ny += sty;
          if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) { fillBlack(x, top, bot); return; }
          const ni = ny * mw + nx;
          let u = side === 0 ? py + rdy * tExit : px + rdx * tExit; u -= Math.floor(u);
          if ((side === 0 && stx < 0) || (side === 1 && sty > 0)) u = 1 - u;
          const adj = side === 0 ? -2 : 1;
          let full = solid[ni] === 1;
          if (!full && diag[ni]) {
            const ex = px + rdx * (tExit + 1e-4) - nx, ey = py + rdy * (tExit + 1e-4) - ny, t2 = diag[ni];
            full = t2 === 1 ? ex + ey < 1 : t2 === 4 ? ex + ey > 1 : t2 === 2 ? ex > ey : ex < ey;
          }
          if (full) {
            flag[ni] |= 8;
            const yA = HZ + (eye - cc) * PROJ / tExit, yB = HZ + (eye - cf) * PROJ / tExit;
            const r0 = Math.max(top, Math.ceil(yA - 0.5)), r1 = Math.min(bot, Math.ceil(yB - 0.5));
            if (r1 > r0) wallSpan(x, r0, r1, cc, tExit, wt[ni], u, lightIdx(cl, tExit, adj));
            if (top < r0) { if (ct[ci] < 0) skySpan(x, top, Math.min(r0, bot)); else fillBlack(x, top, Math.min(r0, bot)); }
            if (r1 < bot) fillBlack(x, Math.max(r1, top), bot);
            return;
          }
          const nf = fl[ni], nc = ce[ni];
          if (nc < cc && !(ct[ci] < 0 && ct[ni] < 0)) {
            const yA = HZ + (eye - cc) * PROJ / tExit, yB = HZ + (eye - nc) * PROJ / tExit;
            const r0 = Math.max(top, Math.ceil(yA - 0.5)); let r1 = Math.min(bot, Math.ceil(yB - 0.5));
            if (r1 > r0) wallSpan(x, r0, r1, nc, tExit, wt[ni], u, lightIdx(cl, tExit, adj));
            if (r1 > top) top = r1;
          }
          if (nf > cf) {
            const yA = HZ + (eye - nf) * PROJ / tExit, yB = HZ + (eye - cf) * PROJ / tExit;
            let r0 = Math.max(top, Math.ceil(yA - 0.5)); const r1 = Math.min(bot, Math.ceil(yB - 0.5));
            if (r1 > r0) wallSpan(x, r0, r1, nf, tExit, lt[ni], u, lightIdx(cl, tExit, adj));
            if (r0 < bot) bot = r0;
          }
          if (top >= bot) return;
          tEnter = tExit;
          if (side === 0) { sx += ddx; mx = nx; } else { sy += ddy; my = ny; }
          ci = ni;
        }
        fillBlack(x, top, bot);
      }
      function fillBlack(x, r0, r1) { for (let r = r0; r < r1; r++) { buf[r * W + x] = 0xff000000; zb[r * W + x] = 1e9; } }
      const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      function drawSprite(s, wx, wy, wz, wh, light, alpha) {
        const dx = wx - px, dy = wy - py;
        const depth = dx * dirX + dy * dirY; if (depth < 0.12) return;
        const lat = dx * plX + dy * plY;
        const scx = VW / 2 + lat / depth * (VW / 2);
        const hp = wh * PROJ / depth, wp = hp * s.w / s.h;
        const x0 = scx - wp / 2, yTop = HZ - (wz + wh - eye) * PROJ / depth;
        const c0 = Math.max(0, Math.ceil(x0 - 0.5)), c1 = Math.min(VW, Math.ceil(x0 + wp - 0.5));
        const r0 = Math.max(0, Math.ceil(yTop - 0.5)), r1 = Math.min(VH, Math.ceil(yTop + hp - 0.5));
        if (c0 >= c1 || r0 >= r1) return;
        const lb = s.full ? FULL : lightIdx(light, depth, 0) << 8;
        const th = alpha < 1 ? (alpha * 16) | 0 : 16;
        const sw = s.w, sh = s.h, d = s.d;
        for (let c = c0; c < c1; c++) {
          const u = ((c + 0.5 - x0) / wp * sw) | 0; if (u < 0 || u >= sw) continue;
          for (let r = r0; r < r1; r++) {
            const i = r * W + c; if (depth >= zb[i]) continue;
            const v = ((r + 0.5 - yTop) / hp * sh) | 0; if (v < 0 || v >= sh) continue;
            const p = d[v * sw + u]; if (!p) continue;
            if (th < 16 && BAYER[(r & 3) * 4 + (c & 3)] >= th) continue;
            buf[i] = CM[lb + p];
          }
        }
      }
      function monFrame(m) {
        const F = A.mon[m.kind];
        if (m.def.decor) return IT.canister;
        if (m.dead) return F.die[Math.min(2, (m.dt / 0.18) | 0)];
        if (m.state === 'pain') return F.pain;
        if (m.flashT > 0) return F.fire;
        if (m.state === 'attack') return F.wind;
        if (m.state === 'idle') return F.walk[0];
        return F.walk[((m.anim * (m.state === 'charge' ? 10 : 4)) | 0) & 1];
      }
      function renderWorld() {
        px = P.x; py = P.y;
        const bobA = P.dead ? 0 : Math.sin(P.bob * 2) * 0.025 * Math.min(1, Math.hypot(P.vx, P.vy) / 4);
        eye = P.viewZ + (P.dead ? 0.15 : 0.62) + bobA;
        dirX = Math.cos(P.ang); dirY = Math.sin(P.ang); plX = -dirY; plY = dirX;
        HZ = 84;
        SKY = A.skies[M.sky] || A.skies.night;
        for (let x = 0; x < VW; x++) { const camX = 2 * (x + 0.5) / VW - 1; const a = Math.atan2(dirY + plY * camX, dirX + plX * camX); skyU[x] = (((a / TAU) * 1024) | 0) & 255; }
        for (let x = 0; x < VW; x++) castColumn(x);
        // sprites
        const list = [];
        for (const it of items) if (!it.taken) list.push([it.x, it.y, it]);
        for (const m of mons) list.push([m.x, m.y, m]);
        for (const p of projs) list.push([p.x, p.y, p]);
        for (const f of fxs) if (f.t >= 0) list.push([f.x, f.y, f]);
        for (const e of list) { const dx = e[0] - px, dy = e[1] - py; e.push(dx * dirX + dy * dirY); }
        list.sort((a, b) => b[3] - a[3]);
        for (const [x, y, o, dep] of list) {
          if (dep < 0.12 || dep > 40) continue;
          const c = cellOf(x, y), light = lightNow[c] || 0.6;
          if (o.d && o.kind && ITEMDEF[o.kind] && o.d === ITEMDEF[o.kind]) {
            let s = IT[o.d.spr]; if (Array.isArray(s)) s = s[((levelTime * 6) | 0) % s.length];
            const flo = o.d.float ? 0.1 + Math.sin(levelTime * 3) * 0.05 : 0;
            const wh = o.d.h; drawSprite(s, x, y, o.z + flo, wh, light, 1);
          } else if (o.def) {
            const s = monFrame(o); const D = o.def;
            const hgt = o.dead ? D.h : D.h;
            drawSprite(s, x, y, o.z, hgt, o.flashT > 0 ? 1 : light, o.dead ? o.fade : 1);
          } else if (o.vx !== undefined) {
            const fr = A.fx[o.d.spr]; const s = fr[((o.anim * 10) | 0) % fr.length];
            const sz = o.d.big ? 0.5 : o.kind === 'rocket' || o.kind === 'mrocket' ? 0.22 : 0.3;
            drawSprite(s, x, y, o.z - sz / 2, sz, 1, 1);
          } else {
            const fr = A.fx[o.kind]; const k = Math.min(fr.length - 1, (o.t / 0.5 * fr.length) | 0); const s = fr[k];
            const sz = o.kind === 'boom' ? 1.1 : o.kind === 'tele' ? 0.6 : 0.2;
            drawSprite(s, x, y, o.z - sz / 2, sz, 1, 1);
          }
        }
        // weapon
        if (!P.dead) drawWeapon();
        // screen tints
        let tr = 0, tg = 0, tb = 0, ta = 0;
        if (flashRed > 0) { tr = 255; tg = 20; tb = 10; ta = Math.min(0.55, flashRed * 0.6); }
        else if (P.pw.inv > 0 && (P.pw.inv > 3 || (levelTime * 4 | 0) & 1)) { tr = 255; tg = 235; tb = 160; ta = 0.22; }
        else if (P.pw.rad > 0 && (P.pw.rad > 3 || (levelTime * 4 | 0) & 1)) { tr = 40; tg = 255; tb = 40; ta = 0.18; }
        else if (flashGold > 0) { tr = 255; tg = 210; tb = 60; ta = flashGold * 0.4; }
        if (P.dead) { tr = 180; tg = 0; tb = 0; ta = Math.min(0.6, P.deadT * 0.4); }
        if (ta > 0) {
          const ia = 1 - ta, ar = tr * ta, ag = tg * ta, ab = tb * ta;
          for (let i = 0; i < VW * VH; i++) { const v = buf[i]; buf[i] = (255 << 24 | ((((v >> 16) & 255) * ia + ab) << 16) | ((((v >> 8) & 255) * ia + ag) << 8) | ((v & 255) * ia + ar)) >>> 0; }
        }
      }
      function blit(s, x0, y0, lb, mirror) {
        x0 |= 0; y0 |= 0;
        for (let y = 0; y < s.h; y++) {
          const yy = y0 + y; if (yy < 0 || yy >= H) continue;
          for (let x = 0; x < s.w; x++) {
            const xx = x0 + x; if (xx < 0 || xx >= W) continue;
            const p = s.d[y * s.w + (mirror ? s.w - 1 - x : x)]; if (p) buf[yy * W + xx] = CM[lb + p];
          }
        }
      }
      function drawWeapon() {
        const w = WEAP[P.weap], V = A.views[w.view];
        const mv = Math.min(1, Math.hypot(P.vx, P.vy) / 4);
        const bx = Math.cos(P.bob) * 8 * mv, by = Math.abs(Math.sin(P.bob)) * 6 * mv;
        let fr = 0;
        if (P.fireAnim > 0) fr = V.img.length > 2 ? (P.fireAnim > 10 ? 1 : 2) : 1;
        if (w.kind === 'melee') fr = P.fireAnim > 8 ? 1 : 0;
        if (w.view === 'chaingun' && P.fireAnim > 0) fr = (P.fireAnim >> 1) & 1;
        if (P.windup > 0) fr = (P.windup >> 2) & 1;
        const s = V.img[Math.min(fr, V.img.length - 1)];
        const x0 = VW / 2 - s.w / 2 + bx + (w.kind === 'melee' && fr === 0 ? 50 : 0), y0 = VH - s.h + 6 + by + P.wy * 70;
        const lit = P.flash > 0 ? 31 : lightIdx(Math.max(0.55, lightNow[cellOf(P.x, P.y)]), 0, 0);
        if (P.flash > 0 && V.flash) blit(V.flash, VW / 2 - V.flash.w / 2 + bx, y0 - V.flash.h / 2 + 2 + (V.fy || 0), FULL);
        blit(s, x0, y0, lit << 8);
      }

      // ---------------- 2D drawing helpers ----------------
      function rect(x, y, w, h, c) { for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) buf[j * W + i] = c; }
      function text(s, x, y, col, sc, align, shadow) {
        sc = sc || 1; s = String(s).toUpperCase();
        const wdt = s.length * 6 * sc - sc;
        if (align === 'center') x = Math.round(x - wdt / 2); else if (align === 'right') x = x - wdt;
        if (shadow) text(s, x + sc, y + sc, 0xff000000, sc);
        for (let i = 0; i < s.length; i++) {
          const g = FONT[s[i]]; if (!g) continue;
          for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) { const X = x + (i * 6 + c) * sc, Y = y + r * sc; if (sc === 1) { if (X >= 0 && Y >= 0 && X < W && Y < H) buf[Y * W + X] = col; } else rect(X, Y, sc, sc, col); } }
        }
      }
      function mini(s, x, y, col) {
        s = String(s);
        for (let i = 0; i < s.length; i++) { const g = MINI[s[i]] != null ? MINI[s[i]] : MINIS[s[i]] ? parseInt(MINIS[s[i]], 2) : null; if (g == null) continue; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g & (1 << (14 - (r * 3 + c)))) { const X = x + i * 4 + c, Y = y + r; if (X >= 0 && X < W && Y >= 0 && Y < H) buf[Y * W + X] = col; } }
      }
      function line(x0, y0, x1, y1, col) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
        for (let i = 0; i <= n; i++) { const t = n ? i / n : 0, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t); if (x >= 0 && y >= 0 && x < VW && y < VH) buf[y * W + x] = col; }
      }
      const COL = { white: rgb32(255, 255, 255), red: rgb32(230, 40, 30), amber: rgb32(255, 170, 40), yellow: rgb32(255, 230, 70), grey: rgb32(150, 150, 150), dark: rgb32(60, 60, 60), green: rgb32(80, 240, 80), blue: rgb32(80, 120, 255), brown: rgb32(170, 120, 60), cyan: rgb32(60, 220, 230), orange: rgb32(255, 120, 20) };
      function drawStatus() {
        buf.set(A.bar, VH * W);
        const y0 = VH;
        const w = WEAP[P.weap];
        if (w.ammo) text(String(testInfinite ? 999 : P.ammo[w.ammo]), 44, y0 + 6, COL.red, 2, 'right');
        mini('AMMO', 14, y0 + 23, COL.grey);
        text(Math.max(0, P.hp) + '%', 101, y0 + 6, COL.red, 2, 'right'); mini('HEALTH', 63, y0 + 23, COL.grey);
        for (let i = 2; i <= 7; i++) { const has = i === 3 ? (P.has[2] || P.has[7]) : P.has[i - 1]; mini(String(i), 112 + ((i - 2) % 3) * 10, y0 + 6 + (((i - 2) / 3) | 0) * 8, has ? COL.yellow : COL.dark); }
        mini('ARMS', 117, y0 + 23, COL.grey);
        text(P.armor + '%', 229, y0 + 6, COL.red, 2, 'right'); mini('ARMOR', 194, y0 + 23, COL.grey);
        const kc = { b: COL.blue, y: COL.yellow, r: COL.red };
        ['b', 'y', 'r'].forEach((k, i) => { if (P.keys[k]) rect(236, y0 + 5 + i * 8, 8, 5, kc[k]); });
        const am = [['BULL', 'b'], ['SHEL', 's'], ['RCKT', 'r'], ['CELL', 'c']];
        am.forEach(([lab, k], i) => { const yy = y0 + 5 + i * 6; mini(lab, 251, yy, COL.grey); mini(String(P.ammo[k]), 287, yy, COL.amber); mini('/', 299, yy, COL.dark); mini(String(P.max[k]), 303, yy, COL.amber); });
        // face
        let face;
        const tier = P.hp >= 80 ? 0 : P.hp >= 60 ? 1 : P.hp >= 40 ? 2 : P.hp >= 20 ? 3 : 4;
        if (P.dead) face = A.faces.dead; else if (P.pw.inv > 0 || godMode && !demo) face = A.faces.god;
        else if (P.face.mood !== 'normal') face = A.faces[tier + ':0:' + P.face.mood];
        else face = A.faces[tier + ':' + P.face.look + ':normal'];
        blit(face, 148, y0 + 1, 26 << 8);
      }
      function drawAutomap() {
        rect(0, 0, VW, VH, 0xff000000);
        const sc = 5, ox = VW / 2 - P.x * sc, oy = VH / 2 - P.y * sc;
        const x0 = Math.max(0, Math.floor(P.x - VW / 2 / sc) - 1), x1 = Math.min(mw - 1, Math.ceil(P.x + VW / 2 / sc) + 1);
        const y0 = Math.max(0, Math.floor(P.y - VH / 2 / sc) - 1), y1 = Math.min(mh - 1, Math.ceil(P.y + VH / 2 / sc) + 1);
        const all = P.pw.map > 0;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const c = y * mw + x; if (solid[c] === 1) continue;
          const seen = flag[c] & 8; if (!seen && !all) continue;
          const sx = ox + x * sc, sy = oy + y * sc;
          if (diag[c]) { const t = diag[c]; line(sx + (t === 1 || t === 4 ? sc : 0), sy, sx + (t === 1 || t === 4 ? 0 : sc), sy + sc, seen ? COL.red : COL.grey); }
          if (flag[c] & 3) for (let k = 1; k < sc; k += 2) line(sx + 1, sy + k, sx + sc - 1, sy + k, rgb32(40, 90, 30));
          const edges = [[c - mw, sx, sy, sx + sc, sy], [c + mw, sx, sy + sc, sx + sc, sy + sc], [c - 1, sx, sy, sx, sy + sc], [c + 1, sx + sc, sy, sx + sc, sy + sc]];
          for (const [n, ax, ay, bx2, by2] of edges) {
            let col = 0;
            const dn = doorAt[n] >= 0 ? doors[doorAt[n]] : null;
            if (swAt[n] >= 0) col = switches[swAt[n]].kind === 'exit' ? COL.green : COL.cyan;
            else if (solid[n] === 1 || (dn && dn.secret)) col = seen ? COL.red : COL.grey;
            else if (dn && doorAt[c] < 0) col = dn.key === 'b' ? COL.blue : dn.key === 'y' ? COL.yellow : dn.key === 'r' ? COL.red : dn.bars ? COL.cyan : COL.yellow;
            else if (n > c && Math.abs(fl[n] - fl[c]) > 0.01 && liftAt[n] < 0 && liftAt[c] < 0) col = COL.brown;
            else if (n > c && (liftAt[n] >= 0) !== (liftAt[c] >= 0)) col = COL.orange;
            if (col) line(ax, ay, bx2, by2, col);
          }
        }
        const cx = VW / 2, cy = VH / 2, a = P.ang;
        const pt = (r, da) => [cx + Math.cos(a + da) * r, cy + Math.sin(a + da) * r];
        const [ax, ay] = pt(6, 0), [bx, by] = pt(5, 2.5), [cx2, cy2] = pt(5, -2.5);
        line(ax, ay, bx, by, COL.white); line(ax, ay, cx2, cy2, COL.white); line(bx, by, cx2, cy2, COL.white);
        text(GAME.levels[level].name, 4, VH - 10, COL.white, 1);
        text('KILLS ' + kills + '/' + totalKills, VW - 4, VH - 10, COL.grey, 1, 'right');
      }
      function drawHUD() {
        if (showMap && mode !== 'demo') drawAutomap();
        if (msgT > 0) text(msg, 3, 3, COL.white, 1, null, true);
        if (levelBanner > 0 && !showMap) { text(GAME.levelPrefix + ' ' + (level + 1), VW / 2, 40, COL.amber, 1, 'center', true); text(GAME.levels[level].name, VW / 2, 52, COL.red, 2, 'center', true); }
        if (!demo && !showMap) { text(String(score), VW - 3, VH - 10, COL.amber, 1, 'right', true); for (let i = 0; i < Math.min(lives, 6); i++) rect(4 + i * 7, VH - 8, 5, 5, COL.green); }
        if (demo) { text('DEMO', VW / 2, 10, COL.red, 2, 'center', true); if ((modeT * 2 | 0) & 1) text(api.credits > 0 ? 'PUSH START' : 'INSERT COIN', VW / 2, 140, COL.white, 1, 'center', true); }
        if (mode === 'dying' && P.deadT > 1.5) text(lives > 1 ? 'YOU DIED - PRESS FIRE' : 'YOU DIED', VW / 2, 70, COL.white, 1, 'center', true);
        drawStatus();
      }
      // ---------------- screens ----------------
      let titleEmbers = [];
      function drawBackdrop(t, rampA, rampB) {
        for (let y = 0; y < H; y++) { const c = CM[(4 + (y / H * 10 | 0)) * 256 + C(rampA, 4)]; for (let x = 0; x < W; x++) buf[y * W + x] = c; }
        // rolling smoke noise
        for (let y = 100; y < H; y += 2) for (let x = 0; x < W; x += 2) { const n = vnoise(x / 24 + t * 0.6, y / 16 - t * 0.9, 64, 3); if (n > 0.55) { const c = CM[Math.min(31, (n - 0.55) * 60 + (y - 100) / 8 | 0) * 256 + C(rampB, 10)]; buf[y * W + x] = c; buf[y * W + x + 1] = c; buf[(y + 1) * W + x] = c; buf[(y + 1) * W + x + 1] = c; } }
        if (titleEmbers.length < 60) titleEmbers.push({ x: rand() * W, y: H, v: rr(20, 60), s: rand() });
        for (const e of titleEmbers) { e.y -= e.v / 60; e.x += Math.sin(t * 3 + e.s * 9) * 0.3; if (e.y >= 0 && e.y < H && e.x >= 0 && e.x < W) buf[(e.y | 0) * W + (e.x | 0)] = CM[31 * 256 + C(6, 13)]; }
        titleEmbers = titleEmbers.filter(e => e.y > 0);
      }
      function bigLogo(s, cy) {
        const sc = 6, wdt = s.length * 6 * sc - sc, x0 = Math.round(W / 2 - wdt / 2);
        for (let d = 5; d >= 1; d--) text(s, x0 + d, cy + d, CM[(6 + d) * 256 + C(GAME.logoRamp2, 6)], sc);
        // gradient face
        for (let i = 0; i < s.length; i++) {
          const g = FONT[s[i]]; if (!g) continue;
          for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) {
            for (let yy = 0; yy < sc; yy++) for (let xx = 0; xx < sc; xx++) {
              const X = x0 + (i * 6 + c) * sc + xx, Y = cy + r * sc + yy;
              const shade = 15 - ((r * sc + yy) / (7 * sc) * 9 | 0) - (xx === 0 || yy === 0 ? 0 : 1);
              buf[Y * W + X] = CM[31 * 256 + C(GAME.logoRamp, shade)];
            }
          }
        }
      }
      function bigSprite(s, cx, by, sc, lv) {
        const w = Math.round(s.w * sc), h = Math.round(s.h * sc), x0 = Math.round(cx - w / 2), y0 = by - h;
        for (let y = 0; y < h; y++) { const Y = y0 + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < w; x++) { const X = x0 + x; if (X < 0 || X >= W) continue; const p = s.d[((y / sc) | 0) * s.w + ((x / sc) | 0)]; if (p) buf[Y * W + X] = CM[lv * 256 + p]; } }
      }
      function drawTitle() {
        drawBackdrop(modeT, GAME.logoRamp2, GAME.logoRamp);
        const tm = A.mon[GAME.titleMon];
        if (tm) { bigSprite(tm.walk[((modeT * 1.5) | 0) & 1], W / 2, H + 6, 1.9, 7); const sm = A.mon[GAME.titleMon2]; if (sm) { bigSprite(sm.walk[0], 52, H - 4, 1.6, 9); bigSprite(sm.walk[1], W - 52, H - 4, 1.6, 9); } }
        bigLogo(GAME.logo, 30);
        text(GAME.subtitle, W / 2, 82, COL.amber, 1, 'center', true);
        if ((modeT * 2 | 0) & 1 || coinFlash > 0) text(api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 120, coinFlash > 0 ? COL.yellow : COL.white, 2, 'center', true);
        text('HIGH SCORE ' + Math.max(hiScore, score), W / 2, 150, COL.yellow, 1, 'center', true);
        text('\u00a9 ' + GAME.year + ' ' + GAME.maker.toUpperCase(), W / 2, 178, COL.grey, 1, 'center');
        text('CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, 190, COL.white, 1, 'right');
      }
      function drawScores() {
        drawBackdrop(modeT + 5, GAME.logoRamp2, GAME.logoRamp);
        text('HALL OF HEROES', W / 2, 24, COL.red, 2, 'center', true);
        text('HIGH SCORE', W / 2, 60, COL.amber, 1, 'center', true);
        text(String(Math.max(hiScore, score)), W / 2, 74, COL.white, 2, 'center', true);
        text('LAST SCORE ' + score, W / 2, 100, COL.grey, 1, 'center');
        const tips = GAME.tips; text(tips[(modeT / 3 | 0) % tips.length], W / 2, 130, COL.cyan, 1, 'center', true);
        if ((modeT * 2 | 0) & 1) text(api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 160, COL.white, 1, 'center', true);
        text('CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, 190, COL.white, 1, 'right');
      }
      function drawStory() {
        drawBackdrop(storyT, GAME.logoRamp2, GAME.logoRamp);
        let n = Math.floor(storyT * 30);
        let y = 20;
        for (const ln of storyLines) {
          if (n <= 0) break;
          text(ln.slice(0, n), 12, y, COL.white, 1, null, true); n -= ln.length; y += 11;
        }
        if (storyT * 30 > storyLines.join('').length && ((storyT * 2) | 0) & 1) text('PRESS FIRE', W / 2, 186, COL.amber, 1, 'center');
      }
      function fmtTime(t) { t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
      function drawTally() {
        drawBackdrop(tallyData.t, GAME.logoRamp2, GAME.logoRamp);
        const td = tallyData;
        text(td.name, W / 2, 16, COL.red, 2, 'center', true); text('FINISHED', W / 2, 36, COL.white, 1, 'center', true);
        const rows = [['KILLS', td.k + '%'], ['ITEMS', td.i + '%'], ['SECRET', td.s + '%'], ['TIME', fmtTime(td.time)], ['PAR', fmtTime(td.par)]];
        rows.forEach(([a, b], i) => { if (td.shown > i) { text(a, 70, 58 + i * 18, COL.red, 2, null, true); text(b, 260, 58 + i * 18, COL.white, 2, 'right', true); } });
        if (td.shown >= 5) { text('BONUS ' + td.bonus + (td.k === 100 ? ' +1000' : ''), W / 2, 152, COL.amber, 1, 'center', true); const nx = GAME.levels[level + 1]; text(nx ? 'ENTERING ' + nx.name : 'EPISODE COMPLETE', W / 2, 168, COL.yellow, 1, 'center', true); }
        text('SCORE ' + score, W / 2, 186, COL.grey, 1, 'center');
      }
      function render(ctx) {
        if (!img) {
          img = ctx.createImageData(W, H);
          if (!img || !img.data || img.data.length < W * H * 4) img = typeof ImageData !== 'undefined' ? new ImageData(W, H) : { data: new Uint8ClampedArray(W * H * 4), width: W, height: H };
          buf = new Uint32Array(img.data.buffer);
        }
        if (mode === 'title') drawTitle();
        else if (mode === 'scores') drawScores();
        else if (mode === 'story' || mode === 'wait') { if (storyLines) drawStory(); else rect(0, 0, W, H, 0xff000000); }
        else if (mode === 'tally') drawTally();
        else if (M && P) {
          renderWorld(); drawHUD();
          if (mode === 'gameover') { text('GAME OVER', W / 2, 60, COL.red, 3, 'center', true); text('SCORE ' + score, W / 2, 100, COL.white, 1, 'center', true); }
        } else rect(0, 0, W, H, 0xff000000);
        ctx.putImageData(img, 0, 0);
      }

      // test/autopilot hooks (used by the attract demo and offline level checks)
      const testApi = {
        get mode() { return mode; }, get bot() { return bot; }, get level() { return level; }, get P() { return P; }, get mons() { return mons; }, get M() { return M; },
        start(n, opts) { opts = opts || {}; demo = false; botOn = !!opts.bot; godMode = !!opts.god; testInfinite = !!opts.inf; P = newPlayer(); if (opts.all) { P.has = P.has.map(() => true); P.ammo = { b: 200, s: 50, r: 50, c: 300 }; } score = 0; lives = 3; loadLevel(n); mode = 'play'; },
        stats() { return { kills, totalKills, gotItems, totalItems, gotSecrets, totalSecrets, time: levelTime }; },
        step(dt) { update(dt || 1 / 60); },
        assets: A, CM, afterTally, finishLevel, botPass: (a, b) => botPass(a, b)
      };
      return { update, render, destroy() { }, _test: testApi };
    }
  });

})();
