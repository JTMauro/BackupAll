// Duke Nukem 3D (3D Realms, 1996) - an original take on the 1996 PC shooter: own sector engine, own hero (Max Bravado),
// own aliens, maps, art and sound. All graphics procedural, all sound synthesized.
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
    '%': [24, 25, 2, 4, 8, 19, 3], '"': [10, 10, 0, 0, 0, 0, 0], '&': [12, 18, 20, 8, 21, 18, 13], '#': [10, 31, 10, 10, 31, 10, 0]
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
  function textS(ctx, s, x, y, col, sc, align) { text(ctx, s, x + (sc || 1), y + (sc || 1), '#000', sc, align); text(ctx, s, x, y, col, sc, align); }

  // ---------- procedural pixel-art helpers (no DOM) ----------
  function rgb(r, g, b) { return ((255 << 24) | ((b < 0 ? 0 : b > 255 ? 255 : b | 0) << 16) | ((g < 0 ? 0 : g > 255 ? 255 : g | 0) << 8) | (r < 0 ? 0 : r > 255 ? 255 : r | 0)) >>> 0; }
  function cR(c) { return c & 255; } function cG(c) { return (c >> 8) & 255; } function cB(c) { return (c >> 16) & 255; }
  function mix(a, b, t) { return rgb(cR(a) + (cR(b) - cR(a)) * t, cG(a) + (cG(b) - cG(a)) * t, cB(a) + (cB(b) - cB(a)) * t); }
  function scl(c, k) { return rgb(cR(c) * k, cG(c) * k, cB(c) * k); }
  function hex(h) { const n = parseInt(h.slice(1), 16); return rgb(n >> 16, (n >> 8) & 255, n & 255); }
  function css(c) { return 'rgb(' + cR(c) + ',' + cG(c) + ',' + cB(c) + ')'; }
  function mkRng(seed) {
    return function () { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function Pix(w, h, c) { const d = new Uint32Array(w * h); if (c) d.fill(c); return { w, h, d }; }
  function pset(p, x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.d[y * p.w + x] = c; }
  function pget(p, x, y) { x = ((x % p.w) + p.w) % p.w; y = ((y % p.h) + p.h) % p.h; return p.d[y * p.w + x]; }
  function prect(p, x, y, w, h, c) { for (let j = y | 0; j < (y + h) | 0; j++) for (let i = x | 0; i < (x + w) | 0; i++) pset(p, i, j, c); }
  function pell(p, cx, cy, rx, ry, c) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const a = (i + 0.5 - cx) / rx, b = (j + 0.5 - cy) / ry; if (a * a + b * b <= 1) pset(p, i, j, c);
    }
  }
  function pline(p, x0, y0, x1, y1, c, th) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; if (th > 1) prect(p, x - th / 2, y - th / 2, th, th, c); else pset(p, x, y, c); }
  }
  function ppoly(p, pts, c) {
    let y0 = 1e9, y1 = -1e9; for (let k = 0; k < pts.length; k += 2) { y0 = Math.min(y0, pts[k + 1]); y1 = Math.max(y1, pts[k + 1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const xs = []; const yc = y + 0.5;
      for (let k = 0; k < pts.length; k += 2) {
        const ax = pts[k], ay = pts[k + 1], bx = pts[(k + 2) % pts.length], by = pts[(k + 3) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) pset(p, x, y, c);
    }
  }
  function pnoise(p, rng, amt) { for (let i = 0; i < p.d.length; i++) { const c = p.d[i]; if (c >>> 24) p.d[i] = scl(c, 1 + (rng() - 0.5) * amt); } }
  function poutline(p, c) {
    const o = p.d.slice();
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      if (o[y * p.w + x]) continue;
      if ((x > 0 && o[y * p.w + x - 1]) || (x < p.w - 1 && o[y * p.w + x + 1]) || (y > 0 && o[(y - 1) * p.w + x]) || (y < p.h - 1 && o[(y + 1) * p.w + x])) p.d[y * p.w + x] = c;
    }
  }
  function pshadeY(p, top, bot) { for (let y = 0; y < p.h; y++) { const k = top + (bot - top) * y / (p.h - 1); for (let x = 0; x < p.w; x++) { const c = p.d[y * p.w + x]; if (c >>> 24) p.d[y * p.w + x] = scl(c, k); } } }
  function pflip(p) { const q = Pix(p.w, p.h); for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) q.d[y * p.w + x] = p.d[y * p.w + p.w - 1 - x]; return q; }
  function pcopy(p) { return { w: p.w, h: p.h, d: p.d.slice() }; }
  // bricks / panels helpers for 64x64 textures
  function texBricks(base, mortar, bw, bh, rng, jit) {
    const p = Pix(64, 64, mortar);
    for (let row = 0; row < 64 / bh; row++) {
      const off = (row & 1) ? bw / 2 : 0;
      for (let col = -1; col < 64 / bw + 1; col++) {
        const c = scl(base, 1 + (rng() - 0.5) * (jit || 0.25));
        prect(p, col * bw + off + 1, row * bh + 1, bw - 1, bh - 1, c);
      }
    }
    pnoise(p, rng, 0.12); return p;
  }
  function texNoise(base, rng, amt, spots, spotCol) {
    const p = Pix(64, 64, base); pnoise(p, rng, amt);
    for (let k = 0; k < (spots || 0); k++) pell(p, rng() * 64, rng() * 64, 1 + rng() * 3, 1 + rng() * 2, scl(spotCol || base, 0.8 + rng() * 0.3));
    return p;
  }
  function ptext(p, s, x, y, c) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) { const g = FONT[s[i]]; if (!g) continue; for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) if (g[r] & (16 >> k)) pset(p, x + i * 6 + k, y + r, c); }
  }

  // =====================================================================
  //  Sector-grid "build-style" engine: every map cell is a little sector
  //  with its own floor / ceiling height (floors may slope), light level,
  //  textures and tags. Columns are cast front-to-back with an open
  //  window (top/bottom clip) like a portal renderer, plus a z-buffer for
  //  billboards and see-through glass.
  // =====================================================================
  function makeGame(api, G) {
    const W = 320, H = 200, VW = 320, VH = 168;
    const HOR = 84, K = 0.72, PROJ = (VW / 2) / K, NSH = 16;
    const EYE = 0.56, PHT = 0.7, PR = 0.22, STEP = 0.33, GRAV = 11;
    const au = api.audio;
    const TAU = Math.PI * 2;
    const rnd = Math.random;
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function pick(a) { return a[(rnd() * a.length) | 0]; }
    function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

    // ---------- assets ----------
    const TEX = [], TN = {}, SPR = {}, SKY = {};
    function shadeTables(d, full) {
      const out = [];
      for (let s = 0; s < NSH; s++) {
        if (full && s > 0) { out.push(out[0]); continue; }
        const k = full ? 1 : Math.max(0.03, Math.pow((s + 1) / NSH, 1.2));
        const a = new Uint32Array(d.length);
        for (let i = 0; i < d.length; i++) {
          const c = d[i]; const al = c >>> 24; if (!al) continue;
          a[i] = ((255 << 24) | (((c >> 16 & 255) * k) << 16) | (((c >> 8 & 255) * k) << 8) | ((c & 255) * k)) >>> 0;
        }
        out.push(a);
      }
      return out;
    }
    const art = {
      tex(name, p, full, anim) { TN[name] = TEX.length; TEX.push({ sh: shadeTables(p.d, full), anim: anim || 0 }); },
      spr(name, p, ppu, full) { SPR[name] = { w: p.w, h: p.h, ppu: ppu || 64, sh: shadeTables(p.d, full) }; },
      sky(name, p) { SKY[name] = p; }
    };
    G.build(art);
    function T(name) { const t = TN[name]; if (t == null) throw new Error('no tex ' + name); return t; }
    const WEAP = G.weapons;

    // ---------- framebuffer ----------
    let img = null, FB = null;
    const ZB = new Float32Array(VW * VH);
    const skyU = new Int32Array(VW);

    // ---------- map ----------
    const F_WATER = 1, F_HURT = 2, F_SECRET = 4, F_EXIT = 8, F_VEND = 16, F_LSW = 32, F_CRACK = 64, F_DOOR = 128, F_LIFT = 256, F_PAPER = 512, F_REMOTE = 1024, F_DARK = 2048;
    let MW = 1, MH = 1, S, FL, CE, SX, SY, FT, CT, WT, LT, SK, FG, VND, SEEN;
    let doors = [], lifts = [], doorAt, liftAt, cracks = {}, darkLo = 0.2, darkHi = 1, lightsOn = false;
    let level = null, levelIdx = 0, fogK = 0.06, skyP = null;
    let enemies = [], items = [], decos = [], projs = [], parts = [], mines = [], panes = [];
    let killsTotal = 0, kills = 0, secretsTotal = 0, secretsFound = 0, levelTime = 0;
    let startX = 0, startY = 0, startA = 0;
    let uid = 1;

    function idx(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= MW || y >= MH) return -1; return y * MW + x; }
    function floorAt(i, x, y) {
      const sx = SX[i], sy = SY[i]; if (sx === 0 && sy === 0) return FL[i];
      const mx = i % MW, my = (i / MW) | 0;
      return FL[i] + sx * (clamp(x, mx, mx + 1) - mx - 0.5) + sy * (clamp(y, my, my + 1) - my - 0.5);
    }

    function loadLevel(n) {
      const L = G.levels[n]; level = L; levelIdx = n;
      const rows = L.map; MH = rows.length; MW = 0; for (const r of rows) MW = Math.max(MW, r.length);
      const N = MW * MH;
      S = new Uint8Array(N); FL = new Float32Array(N); CE = new Float32Array(N); SX = new Float32Array(N); SY = new Float32Array(N);
      FT = new Uint8Array(N); CT = new Uint8Array(N); WT = new Uint8Array(N); LT = new Float32Array(N); SK = new Uint8Array(N);
      FG = new Uint16Array(N); VND = new Uint8Array(N); SEEN = new Uint8Array(N); doorAt = new Int16Array(N).fill(-1); liftAt = new Int16Array(N).fill(-1);
      doors = []; lifts = []; cracks = {}; enemies = []; items = []; decos = []; projs = []; parts = []; mines = []; boss = null;
      kills = 0; killsTotal = 0; secretsFound = 0; secretsTotal = 0; levelTime = 0; lightsOn = false;
      fogK = L.fog || 0.07; skyP = SKY[L.sky || 'default'] || SKY[Object.keys(SKY)[0]];
      const leg = Object.assign({}, G.legend, L.legend || {});
      const base = L.base || '.';
      const ch = (x, y) => (y >= 0 && y < MH && x >= 0 && x < rows[y].length) ? rows[y][x] : '#';
      const isEnt = c => c === 'P' || c === '$' || !!G.ents[c];
      const specs = new Array(N);
      const okUnder = c => { const s = leg[c]; return s && !s.s && !s.door && !s.lift && !s.ramp && !isEnt(c); };
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        let c = ch(x, y);
        if (isEnt(c)) {
          const cnt = {}; let u = null, best = 0;
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const q = ch(x + dx, y + dy); if (okUnder(q)) { cnt[q] = (cnt[q] || 0) + 1; if (cnt[q] > best) { best = cnt[q]; u = q; } } }
          if (!u) for (const [dx, dy] of [[-1, -1], [1, 1], [1, -1], [-1, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]) { const q = ch(x + dx, y + dy); if (okUnder(q)) { u = q; break; } }
          c = u || base;
        }
        let sp = leg[c]; if (!sp) sp = leg['#'];
        specs[y * MW + x] = sp;
      }
      // apply specs
      for (let i = 0; i < N; i++) {
        const sp = specs[i];
        S[i] = sp.s || 0; FL[i] = sp.f || 0; CE[i] = sp.c != null ? sp.c : (sp.s ? (sp.h != null ? sp.h : 99) : 1.3);
        FT[i] = T(sp.ft || 'floor'); CT[i] = T(sp.ct || 'ceil'); WT[i] = sp.wt ? T(sp.wt) : 255;
        LT[i] = sp.l != null ? sp.l : (L.amb || 1); SK[i] = sp.sky ? 1 : 0;
        let f = 0;
        if (sp.water) f |= F_WATER; if (sp.hurt) f |= F_HURT; if (sp.exit) f |= F_EXIT; if (sp.vend) { f |= F_VEND; VND[i] = 2; }
        if (sp.sw === 'light') f |= F_LSW; if (sp.sw === 'remote') f |= F_REMOTE; if (sp.crack) f |= F_CRACK; if (sp.paper) f |= F_PAPER;
        if (sp.dark) { f |= F_DARK; darkLo = sp.l != null ? sp.l : 0.2; darkHi = sp.lon || 1; }
        FG[i] = f;
        if (sp.crack) { const u = leg[sp.under || base]; cracks[i] = u; }
      }
      // default side textures from neighbouring solid walls
      for (let i = 0; i < N; i++) if (WT[i] === 255) {
        const x = i % MW, y = (i / MW) | 0; let t = -1;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const j = idx(x + dx, y + dy); if (j >= 0 && S[j] === 1 && WT[j] !== 255 && !(FG[j] & (F_EXIT | F_VEND | F_LSW | F_REMOTE))) { t = WT[j]; break; } }
        WT[i] = t >= 0 ? t : (specs[i].st ? T(specs[i].st) : FT[i]);
      }
      const openN = (x, y, pred) => { const r = []; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const j = idx(x + dx, y + dy); if (j >= 0 && !S[j] && (!pred || pred(j))) r.push(j); } return r; };
      // doors: group same-char runs
      const done = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const sp = specs[i];
        if ((sp.door || sp.lift) && !done[i]) {
          const grp = [], st = [i]; done[i] = 1;
          while (st.length) {
            const j = st.pop(); grp.push(j);
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const k = idx(j % MW + dx, ((j / MW) | 0) + dy); if (k >= 0 && !done[k] && specs[k] === sp) { done[k] = 1; st.push(k); } }
          }
          const nb = [];
          for (const j of grp) for (const k of openN(j % MW, (j / MW) | 0, k => !specs[k].door && !specs[k].lift)) nb.push(k);
          if (sp.door) {
            let f = -1e9, c = 1e9;
            for (const k of nb) { f = Math.max(f, FL[k]); c = Math.min(c, SK[k] ? FL[k] + 1.6 : CE[k]); }
            if (!nb.length) { f = 0; c = 1.2; }
            const d = { cells: grp, kind: sp.door, lo: f, hi: Math.min(c, f + 1.6), pos: 0, st: 0, t: 0 };
            for (const j of grp) { FL[j] = f; CE[j] = f; doorAt[j] = doors.length; FG[j] |= F_DOOR; SK[j] = 0; }
            doors.push(d);
          } else {
            let lo = 1e9, hi = -1e9, c = -1e9, sky = 0;
            for (const k of nb) { lo = Math.min(lo, FL[k]); hi = Math.max(hi, FL[k]); c = Math.max(c, CE[k]); if (SK[k]) sky = 1; }
            if (!nb.length) { lo = 0; hi = 1; c = 2.5; }
            const lf = { cells: grp, lo, hi, pos: lo, tgt: lo, st: 0, t: 0, occ: false };
            for (const j of grp) { FL[j] = lo; CE[j] = Math.max(c, hi + 1.3); SK[j] = sky; liftAt[j] = lifts.length; FG[j] |= F_LIFT; }
            lifts.push(lf);
          }
        }
      }
      // ramps: runs of ramp cells interpolate between their end neighbours
      for (let i = 0; i < N; i++) if (specs[i].ramp && SX[i] === 0 && SY[i] === 0) {
        const x = i % MW, y = (i / MW) | 0;
        for (const ax of [0, 1]) {
          let a = 0, b = 0;
          while (specs[idx(x - (ax ? 0 : a + 1), y - (ax ? a + 1 : 0))] && specs[idx(x - (ax ? 0 : a + 1), y - (ax ? a + 1 : 0))].ramp) a++;
          while (specs[idx(x + (ax ? 0 : b + 1), y + (ax ? b + 1 : 0))] && specs[idx(x + (ax ? 0 : b + 1), y + (ax ? b + 1 : 0))].ramp) b++;
          const e0 = idx(x - (ax ? 0 : a + 1), y - (ax ? a + 1 : 0)), e1 = idx(x + (ax ? 0 : b + 1), y + (ax ? b + 1 : 0));
          if (e0 < 0 || e1 < 0 || S[e0] || S[e1] || Math.abs(FL[e0] - FL[e1]) < 0.01) continue;
          const len = a + b + 1, s = (FL[e1] - FL[e0]) / len;
          for (let k = 0; k < len; k++) {
            const j = idx(x - (ax ? 0 : a) + (ax ? 0 : k), y - (ax ? a : 0) + (ax ? k : 0));
            FL[j] = FL[e0] + s * (k + 0.5); if (ax) SY[j] = s; else SX[j] = s;
            const sk = SK[e0] && SK[e1];
            SK[j] = sk ? 1 : 0; CE[j] = sk ? Math.max(CE[e0], CE[e1]) : Math.max(CE[e0], CE[e1], FL[j] + 1.4);
            if (!sk) CT[j] = SK[e0] ? CT[e1] : CT[e0];
          }
          break;
        }
      }
      // entities
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const c = ch(x, y), i = y * MW + x, px = x + 0.5, py = y + 0.5;
        if (c === 'P') { startX = px; startY = py; startA = (L.ang || 0) * Math.PI / 180; continue; }
        if (c === '$') { FG[i] |= F_SECRET; secretsTotal++; continue; }
        const e = G.ents[c]; if (!e) continue;
        if (e.t === 'enemy') spawnEnemy(e.k, px, py);
        else if (e.t === 'item') items.push({ k: e.k, def: G.items[e.k], x: px, y: py, z: FL[i], bob: rnd() * 6 });
        else if (e.t === 'deco') spawnDeco(e.k, px, py);
      }
      flowT = 0; flowW = null; flowF = null;
    }
    function spawnEnemy(k, x, y) {
      const D = G.enemies[k]; const i = idx(x, y);
      const e = { id: uid++, k, def: D, x, y, z: FL[i] + (D.fly ? 0.5 : 0), hp: D.hp, awake: false, see: false, atkCd: 1 + rnd(), atkT: 0, painT: 0, animT: rnd(), dead: false, dieT: 0, frozen: 0, shrunk: 0, strafe: rnd() < 0.5 ? -1 : 1, stT: 0, phase: 0, flash: 0 };
      enemies.push(e); if (!D.noCount) killsTotal++;
      if (D.boss) boss = e;
      return e;
    }
    function spawnDeco(k, x, y) {
      const D = G.decos[k]; const i = idx(x, y);
      const d = { k, def: D, x, y, z: FL[i], hp: D.hp || 0, broken: false, t: 0, ang: 0, vhp: D.vhp || 0 };
      decos.push(d); return d;
    }

    // ---------- collision ----------
    const PB = { f: 0, c: 0, block: -1, water: false };
    function probe(x, y, r, z, h, step, fly) {
      const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
      let fm = -1e9, cm = 1e9, wat = false;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) { PB.block = -1; return false; }
        const i = cy * MW + cx;
        if (S[i]) { PB.block = i; return false; }
        const f = floorAt(i, x, y), c = CE[i];
        if (fly ? f > z + 0.02 : f - z > step) { PB.block = i; return false; }
        if (c - Math.max(f, z) < h) { PB.block = i; return false; }
        if (f > fm) fm = f; if (c < cm) cm = c;
        if (FG[i] & F_WATER) wat = true;
      }
      PB.f = fm; PB.c = cm; PB.water = wat; PB.block = -1; return true;
    }
    function sampleFC(x, y, r) {
      const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
      let fm = -1e9, cm = 1e9;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) continue;
        const i = cy * MW + cx; if (S[i]) continue;
        const f = floorAt(i, x, y); if (f > fm) fm = f; if (CE[i] < cm) cm = CE[i];
        if (FG[i] & F_WATER) PB.water = true;
      }
      if (fm === -1e9) { const i = idx(x, y); fm = i >= 0 ? FL[i] : 0; cm = i >= 0 ? CE[i] : 9; }
      PB.f = fm; PB.c = cm;
    }
    function moveBody(b, dx, dy, r, h, step, fly) {
      let bl = -2;
      if (dx && probe(b.x + dx, b.y, r, b.z, h, step, fly)) b.x += dx; else if (dx) bl = PB.block;
      if (dy && probe(b.x, b.y + dy, r, b.z, h, step, fly)) b.y += dy; else if (dy && bl === -2) bl = PB.block;
      return bl;
    }
    function los(x0, y0, z0, x1, y1, z1) {
      const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, n = Math.ceil(Math.hypot(dx, dy) / 0.1);
      for (let k = 1; k < n; k++) {
        const t = k / n, x = x0 + dx * t, y = y0 + dy * t, i = idx(x, y);
        if (i < 0 || S[i]) return false;
        const z = z0 + dz * t; if (z < floorAt(i, x, y) || z > CE[i]) return false;
      }
      return true;
    }
    // horizontal trace for bullets: returns distance and what stopped it
    const TR = { d: 0, i: -1, glass: false };
    function trace(x, y, z, dx, dy, maxd) {
      for (let d = 0.05; d < maxd; d += 0.05) {
        const px = x + dx * d, py = y + dy * d, i = idx(px, py);
        if (i < 0 || S[i] || z < floorAt(i, px, py) || z > CE[i]) { TR.d = d; TR.i = i; TR.glass = i >= 0 && S[i] === 2; return TR; }
      }
      TR.d = maxd; TR.i = -1; TR.glass = false; return TR;
    }

    // ---------- state ----------
    let mode = 'attract', modeT = 0, attractA = 0;
    let pl = null, score = 0, lives = 3, nextLife = 30000, hiScore = api.getHiScore(G.hiDefault || 25000);
    let snap = null, coinFlash = 0, msg = '', msgT = 0, quip = '', quipT = 0, banner = '', bannerT = 0;
    let flashR = 0, flashG = 0, flashW = 0, shake = 0, animT = 0, god = false, infAmmo = false;
    let boss = null, bossT = 0, mapOn = false, flowW = null, flowF = null, flowT = 0, frameN = 0;
    let dmgLog = 0, musicT = 0, musicStep = 0, multiKill = 0, multiT = 0, lastQuipT = 0, storyPage = 0;

    function newPlayer() {
      const ammo = {}; for (const k in G.ammoMax) ammo[k] = 0; Object.assign(ammo, G.startAmmo);
      return {
        x: 0, y: 0, z: 0, vz: 0, vx: 0, vy: 0, ang: 0, hp: 100, armor: 0, viewZ: EYE, bob: 0, bobA: 0, turnV: 0,
        has: WEAP.map((w, i) => !!w.start), ammo, cur: G.startCur || 1, want: -1, swT: 0, fireCd: 0, wanim: 0,
        keys: { r: 0, b: 0, y: 0 }, jet: 0, boost: 0, focus: 0, mount: null, dead: false, deadT: 0, bumpT: 0, hurtT: 0, splashT: 0, onGround: true, pipes: 0, jetSnd: 0
      };
    }
    function takeSnap() { snap = { has: pl.has.slice(), ammo: Object.assign({}, pl.ammo), cur: pl.cur, armor: pl.armor, hp: Math.max(pl.hp, 100), score, jet: pl.jet }; }
    function restoreSnap() { pl.has = snap.has.slice(); pl.ammo = Object.assign({}, snap.ammo); pl.cur = snap.cur; pl.armor = snap.armor; pl.hp = snap.hp; pl.jet = snap.jet; }
    function placePlayer() {
      pl.x = startX; pl.y = startY; pl.ang = startA; pl.z = FL[idx(startX, startY)]; pl.vz = 0; pl.vx = pl.vy = 0; pl.viewZ = EYE;
      pl.keys = { r: 0, b: 0, y: 0 }; pl.dead = false; pl.deadT = 0; pl.mount = null; pl.boost = 0; pl.focus = 0; pl.want = -1; pl.swT = 0; pl.pipes = 0;
    }
    function startLevel(n, fresh) {
      loadLevel(n); placePlayer();
      if (fresh) takeSnap(); else { restoreSnap(); score = snap.score; }
      mode = 'play'; modeT = 0; banner = level.name; bannerT = 3.2;
      say(pick(G.quips.start), 2.5);
      au.melody(G.music.start, { type: 'square', vol: 0.12 });
      musicStep = 0; musicT = 1.5;
    }
    function newGame() {
      pl = newPlayer(); score = 0; lives = 3; nextLife = 30000;
      mode = 'story'; modeT = 0; storyPage = 0;
    }

    // ---------- messages & sound ----------
    function say(s, t) { if (!s) return; quip = s; quipT = t || 2.6; lastQuipT = 0; au.tone(520, 0.04, { type: 'square', vol: 0.06 }); au.tone(660, 0.04, { type: 'square', vol: 0.06, delay: 0.05 }); }
    function note(s) { msg = s; msgT = 2.5; }
    function addScore(n) {
      score += n;
      while (score >= nextLife) { nextLife += 30000; lives++; note('EXTRA LIFE!'); au.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .14 }); }
    }
    const SND = {
      pick() { au.tone(880, .05, { type: 'square', vol: .12 }); au.tone(1320, .08, { type: 'square', vol: .12, delay: .05 }); },
      key() { au.melody([[660, .06], [880, .06], [1100, .06], [1320, .12]], { type: 'triangle', vol: .18 }); },
      door() { au.noise(.45, { vol: .14, freq: 300, slideTo: 120 }); au.tone(70, .4, { type: 'sawtooth', vol: .06 }); },
      boom() { au.noise(.7, { vol: .3, freq: 900, slideTo: 60 }); au.tone(60, .5, { type: 'sine', vol: .25, slideTo: 30 }); },
      glass() { au.noise(.3, { vol: .2, freq: 6000, type: 'highpass' }); for (let k = 0; k < 4; k++) au.tone(2200 + rnd() * 2000, .08, { type: 'sine', vol: .06, delay: k * .04 }); },
      hurt() { au.tone(180, .15, { type: 'square', vol: .16, slideTo: 90 }); },
      click() { au.tone(1500, .02, { type: 'square', vol: .1 }); },
      deny() { au.tone(140, .18, { type: 'square', vol: .14 }); au.tone(110, .18, { type: 'square', vol: .14, delay: .1 }); },
      secret() { au.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .2]], { type: 'triangle', vol: .16 }); },
      lift() { au.tone(90, .6, { type: 'sawtooth', vol: .06, slideTo: 140 }); },
      splash() { au.noise(.25, { vol: .1, freq: 1500, slideTo: 400 }); },
      squish() { au.tone(300, .12, { type: 'sine', vol: .2, slideTo: 60 }); au.noise(.1, { vol: .1, freq: 800 }); },
      shatter() { au.noise(.35, { vol: .2, freq: 5000, type: 'bandpass' }); au.tone(1800, .2, { type: 'sine', vol: .08, slideTo: 3000 }); }
    };

    // ---------- doors, lifts, switches ----------
    function bodyIn(cells) {
      for (const j of cells) {
        const x = j % MW, y = (j / MW) | 0;
        if (pl && !pl.dead && pl.x + PR > x && pl.x - PR < x + 1 && pl.y + PR > y && pl.y - PR < y + 1) return true;
        for (const e of enemies) if (!e.dead && e.x + e.def.r > x && e.x - e.def.r < x + 1 && e.y + e.def.r > y && e.y - e.def.r < y + 1) return true;
      }
      return false;
    }
    function useDoor(d, byPlayer) {
      if (!byPlayer && d.kind !== 'n') return false;
      if (d.st === 1 || d.st === 2) { if (d.st === 2) d.t = 3.5; return true; }
      if (d.kind === 'r' || d.kind === 'b' || d.kind === 'y') {
        if (!byPlayer) return false;
        if (!pl.keys[d.kind]) { note('YOU NEED THE ' + G.keyNames[d.kind] + ' TO OPEN THIS'); SND.deny(); return false; }
      }
      if (d.kind === 't' && byPlayer) { note(G.remoteMsg || 'THIS DOOR IS OPENED ELSEWHERE'); SND.deny(); return false; }
      d.st = 1; SND.door(); return true;
    }
    function updDoors(dt) {
      for (const d of doors) {
        if (d.st === 1) { d.pos += dt * 1.6; if (d.pos >= 1) { d.pos = 1; d.st = 2; d.t = 3.5; } }
        else if (d.st === 2) { if (d.kind === 's' || d.kind === 't') continue; d.t -= dt; if (d.t <= 0) { d.st = 3; SND.door(); } }
        else if (d.st === 3) { if (bodyIn(d.cells)) { d.st = 1; } else { d.pos -= dt * 1.4; if (d.pos <= 0) { d.pos = 0; d.st = 0; } } }
        const c = d.lo + (d.hi - d.lo) * d.pos;
        for (const j of d.cells) CE[j] = c;
      }
    }
    function updLifts(dt) {
      for (const L of lifts) {
        const occ = !pl.dead && L.cells.indexOf(idx(pl.x, pl.y)) >= 0;
        if (occ && !L.occ && L.st === 0) { L.st = 1; L.t = 0.5; L.tgt = Math.abs(L.pos - L.lo) < 0.05 ? L.hi : L.lo; }
        L.occ = occ;
        if (L.st === 1) { L.t -= dt; if (L.t <= 0) { L.st = 2; SND.lift(); } }
        else if (L.st === 2) {
          const sp = 1.3 * dt;
          if (Math.abs(L.tgt - L.pos) <= sp) { L.pos = L.tgt; L.st = 0; } else L.pos += Math.sign(L.tgt - L.pos) * sp;
          for (const j of L.cells) FL[j] = L.pos;
        }
      }
    }
    function callLift(L) {
      if (L.st !== 0) return;
      const want = Math.abs(pl.z - L.lo) < Math.abs(pl.z - L.hi) ? L.lo : L.hi;
      if (Math.abs(L.pos - want) > 0.05) { L.tgt = want; L.st = 2; SND.lift(); }
    }
    function toggleLights() {
      lightsOn = !lightsOn;
      for (let i = 0; i < LT.length; i++) if (FG[i] & F_DARK) LT[i] = lightsOn ? darkHi : darkLo;
      SND.click(); note(lightsOn ? 'LIGHTS ON' : 'LIGHTS OFF');
    }
    function remoteOpen() {
      let any = false;
      for (const d of doors) if (d.kind === 't' && d.st === 0) { d.st = 1; any = true; }
      if (any) { SND.door(); note(G.remoteOpenMsg || 'SOMETHING OPENED NEARBY'); }
      return any;
    }
    function bump(i, byPlayer) {
      if (i < 0) return;
      if (!byPlayer) { if (doorAt[i] >= 0) useDoor(doors[doorAt[i]], false); return; }
      if (pl.bumpT > 0) return; pl.bumpT = 0.4;
      const f = FG[i];
      if (doorAt[i] >= 0) { useDoor(doors[doorAt[i]], true); return; }
      if (liftAt[i] >= 0) { callLift(lifts[liftAt[i]]); return; }
      if (f & F_EXIT) { levelDone(); return; }
      if (f & F_LSW) { toggleLights(); return; }
      if (f & F_REMOTE) { if (G.remoteSnd) G.remoteSnd(au); else SND.click(); if (!remoteOpen()) note(G.remoteNone || 'NOTHING HAPPENS'); return; }
      if (f & F_VEND) {
        if (VND[i] > 0) {
          VND[i]--; const x = i % MW + 0.5, y = ((i / MW) | 0) + 0.5;
          const dx = pl.x - x, dy = pl.y - y, d = Math.hypot(dx, dy) || 1;
          items.push({ k: G.vendItem, def: G.items[G.vendItem], x: x + dx / d * 0.75, y: y + dy / d * 0.75, z: pl.z, bob: 0 });
          au.tone(220, .08, { type: 'square', vol: .12 }); au.tone(160, .12, { type: 'square', vol: .12, delay: .1 }); au.noise(.08, { vol: .1, freq: 900, delay: .25 });
          if (rnd() < 0.5) say(pick(G.quips.vend));
        } else { note(G.vendEmpty || 'SOLD OUT'); SND.deny(); }
      }
    }
    function breakGlass(i) {
      if (i < 0 || S[i] !== 2) return;
      S[i] = 0; const x = i % MW, y = (i / MW) | 0;
      const paper = FG[i] & F_PAPER;
      for (let k = 0; k < 18; k++) part(x + rnd(), y + rnd(), FL[i] + rnd() * (Math.min(CE[i], FL[i] + 1.5) - FL[i]), (rnd() - .5) * 2, (rnd() - .5) * 2, rnd(), paper ? rgb(230, 220, 190) : rgb(170, 220, 240), 0.9, 0.035, 8);
      if (paper) au.noise(.25, { vol: .15, freq: 2500, type: 'bandpass' }); else SND.glass();
      addScore(10);
      if (rnd() < 0.25 && G.quips.glass) say(pick(G.quips.glass));
    }
    function openCrack(i) {
      if (!(FG[i] & F_CRACK) || !S[i]) return;
      const u = cracks[i]; S[i] = 0; FG[i] &= ~F_CRACK; FL[i] = u.f || 0; CE[i] = u.c != null ? u.c : 1.3; FT[i] = T(u.ft || 'floor'); CT[i] = T(u.ct || 'ceil'); SK[i] = u.sky ? 1 : 0; LT[i] = u.l != null ? u.l : 1;
      for (let k = 0; k < 16; k++) part(i % MW + rnd(), ((i / MW) | 0) + rnd(), rnd() * 1.2, (rnd() - .5) * 2, (rnd() - .5) * 2, rnd() * 2, rgb(120, 110, 100), 1.2, 0.05, 10);
      note('THE WALL CRUMBLES!');
    }

    // ---------- particles ----------
    function part(x, y, z, vx, vy, vz, col, life, sz, g, full) {
      if (parts.length > 500) return;
      parts.push({ x, y, z, vx, vy, vz, col, life, max: life, sz: sz || 0.03, g: g == null ? 6 : g, full: !!full });
    }
    function puff(x, y, z, col, n) { for (let k = 0; k < (n || 5); k++) part(x, y, z, (rnd() - .5) * .8, (rnd() - .5) * .8, rnd() * .8, col, .35 + rnd() * .2, .025, 3); }
    function updParts(dt) {
      for (const p of parts) {
        p.life -= dt; p.vz -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const i = idx(p.x, p.y);
        if (i >= 0 && !S[i]) { const f = floorAt(i, p.x, p.y); if (p.z < f) { p.z = f; p.vz *= -0.3; p.vx *= .6; p.vy *= .6; } }
      }
      parts = parts.filter(p => p.life > 0);
    }

    // ---------- combat ----------
    function hurtPlayer(n, src) {
      if (pl.dead || mode !== 'play') return;
      n *= (G.dmgScale ? G.dmgScale(levelIdx) : 1);
      dmgLog += n; if (god) return;
      if (pl.mount && pl.mount.def.mount === 'cart') {
        pl.mount.vhp -= n; flashR = Math.min(0.6, flashR + 0.2); au.noise(.1, { vol: .12, freq: 1200 });
        if (pl.mount.vhp <= 0) { const m = pl.mount; dismount(); m.broken = true; explode(m.x, m.y, m.z + 0.3, 1.5, 40, false); }
        return;
      }
      if (pl.armor > 0) { const a = Math.min(pl.armor, Math.ceil(n * 0.6)); pl.armor -= a; n -= a * 0.75; }
      pl.hp -= Math.max(1, Math.round(n)); flashR = Math.min(0.7, flashR + 0.25 + n / 60);
      if (pl.hurtT <= 0) { SND.hurt(); pl.hurtT = 0.3; }
      if (pl.hp <= 0) { pl.hp = 0; killPlayer(); }
    }
    function killPlayer() {
      if (pl.mount) dismount();
      pl.dead = true; pl.deadT = 0;
      au.melody([[392, .15], [330, .15], [262, .15], [196, .4]], { type: 'square', vol: .16 });
    }
    function damageEnemy(e, n, kind) {
      if (e.dead) return;
      if (e.frozen > 0) { shatter(e); return; }
      if (kind === 'shrink') { if (!e.def.boss && !e.def.noShrink) { e.shrunk = 7; e.atkT = 0; au.tone(300, .4, { type: 'sine', vol: .14, slideTo: 1600 }); } else e.hp -= 10; return; }
      if (pl.focus > 0) n *= 2;
      if (pl.boost > 0 && kind === 'melee') n *= 2.5;
      e.hp -= n; e.flash = 0.08;
      if (!e.awake) wake(e);
      if (e.hp <= 0) {
        if (kind === 'freeze' && !e.def.boss) { e.frozen = 6; e.hp = 1; e.atkT = 0; au.tone(900, .3, { type: 'sine', vol: .12, slideTo: 300 }); return; }
        killEnemy(e, kind);
      } else if (rnd() < (e.def.pain || 0.3) && !e.def.boss) { e.painT = 0.22; e.atkT = 0; if (e.def.sPain) e.def.sPain(au); }
    }
    function shatter(e) {
      for (let k = 0; k < 20; k++) part(e.x, e.y, e.z + rnd() * e.def.h, (rnd() - .5) * 3, (rnd() - .5) * 3, rnd() * 2, rgb(180, 230, 255), .9, .04, 8);
      SND.shatter(); killEnemy(e, 'shatter'); e.dieT = 9;
    }
    function killEnemy(e, kind) {
      e.dead = true; e.dieT = 0; e.atkT = 0;
      if (!e.def.noCount && !e.summoned) kills++;
      addScore(e.def.score || 100);
      if (e.def.sDie) e.def.sDie(au); else au.tone(400, .3, { type: 'sawtooth', vol: .12, slideTo: 80 });
      for (let k = 0; k < 8; k++) part(e.x, e.y, e.z + e.def.h * .6, (rnd() - .5) * 2, (rnd() - .5) * 2, rnd() * 2, e.def.bits || rgb(120, 200, 80), .6, .03, 6);
      if (e.def.drop && rnd() < (e.def.dropP || 0.4)) items.push({ k: e.def.drop, def: G.items[e.def.drop], x: e.x, y: e.y, z: FL[idx(e.x, e.y)], bob: 0 });
      if (e.def.boss) { bossT = 3.2; }
      if (e.def.fly) e.fall = true;
      multiKill++; multiT = 1.2;
      if (multiKill === 3) say(pick(G.quips.multi)); else if (lastQuipT > 6 && rnd() < 0.3) say(pick(G.quips.kill));
    }
    function wake(e) {
      if (e.awake) return; e.awake = true;
      if (e.def.sSight && rnd() < 0.7) e.def.sSight(au);
    }
    function hearNoise(x, y, r) { for (const e of enemies) if (!e.dead && !e.awake && Math.hypot(e.x - x, e.y - y) < r) wake(e); }
    function damageDeco(d, n) {
      const D = d.def; if (d.broken || !D.hp) return;
      d.hp -= n; if (d.hp > 0) return;
      d.broken = true; d.t = 0;
      addScore(D.score || 0);
      if (D.explode) explode(d.x, d.y, d.z + 0.3, D.explode[0], D.explode[1], true);
      if (D.spray) { d.t = D.spray; au.noise(.6, { vol: .15, freq: 2500 }); if (G.quips.hydrant) say(pick(G.quips.hydrant)); }
      if (D.shards) { for (let k = 0; k < 10; k++) part(d.x, d.y, d.z + rnd() * 0.6, (rnd() - .5) * 2, (rnd() - .5) * 2, rnd() * 2, D.shards, .8, .035, 8); au.noise(.2, { vol: .14, freq: 1800 }); }
      if (D.drop) items.push({ k: D.drop, def: G.items[D.drop], x: d.x, y: d.y, z: d.z, bob: 0 });
      if (!D.broke && !D.spray) d.gone = true;
    }
    function explode(x, y, z, rad, dmg, byPlayer) {
      SND.boom(); flashW = Math.max(flashW, 0.35); shake = Math.max(shake, 0.4);
      for (let k = 0; k < 26; k++) {
        const c = k % 3 === 0 ? rgb(255, 240, 120) : k % 3 === 1 ? rgb(255, 140, 30) : rgb(220, 60, 20);
        part(x, y, z, (rnd() - .5) * 4, (rnd() - .5) * 4, (rnd() - .2) * 3, c, .45 + rnd() * .3, .05 + rnd() * .04, 2, true);
      }
      for (let k = 0; k < 8; k++) part(x, y, z, (rnd() - .5) * 1, (rnd() - .5) * 1, rnd() * 1.2, rgb(90, 90, 90), 1 + rnd() * .5, .08, -0.4);
      for (const e of enemies) {
        if (e.dead) continue; const d = Math.hypot(e.x - x, e.y - y, (e.z + e.def.h / 2) - z);
        if (d < rad + e.def.r && (d < 0.8 || los(x, y, z, e.x, e.y, e.z + e.def.h * .6))) damageEnemy(e, dmg * Math.max(0.3, 1 - d / (rad + e.def.r)), 'blast');
      }
      if (!pl.dead) {
        const d = Math.hypot(pl.x - x, pl.y - y, pl.z + 0.4 - z);
        if (d < rad && (d < 0.8 || los(x, y, z, pl.x, pl.y, pl.z + EYE))) hurtPlayer(dmg * (byPlayer ? 0.45 : 0.8) * Math.max(0.25, 1 - d / rad));
      }
      for (const dc of decos) { if (!dc.broken && dc.def.hp && Math.hypot(dc.x - x, dc.y - y) < rad + 0.3) damageDeco(dc, dmg); }
      const r = Math.ceil(rad);
      for (let yy = Math.floor(y) - r; yy <= Math.floor(y) + r; yy++) for (let xx = Math.floor(x) - r; xx <= Math.floor(x) + r; xx++) {
        const i = idx(xx, yy); if (i < 0) continue;
        const d = Math.hypot(xx + .5 - x, yy + .5 - y);
        if (S[i] === 2 && d < rad + 0.5) breakGlass(i);
        if ((FG[i] & F_CRACK) && d < rad + 0.6) openCrack(i);
      }
      for (const m of mines) if (!m.boom && Math.hypot(m.x - x, m.y - y) < rad) { m.boom = true; m.fuse = 0.15; }
      for (const p of projs) if (p.def.det && !p.dead && Math.hypot(p.x - x, p.y - y) < rad) { p.fuse = Math.min(p.fuse || 9, 0.15); p.armed = true; }
      hearNoise(x, y, 12);
    }

    // target list for hitscan / auto-aim
    function targets() {
      const t = [];
      for (const e of enemies) if (!e.dead) t.push({ e, x: e.x, y: e.y, z: e.z + e.def.h * (e.shrunk > 0 ? 0.15 : 0.55), r: e.def.r * (e.shrunk > 0 ? 0.5 : 1) + 0.04 });
      for (const d of decos) if (!d.broken && d.def.hp) t.push({ d, x: d.x, y: d.y, z: d.z + (d.def.hz || 0.3), r: d.def.r || 0.2 });
      return t;
    }
    function hitscan(a, dmg, range, kind, col) {
      const ez = pl.z + EYE - 0.08, dx = Math.cos(a), dy = Math.sin(a);
      const tr = trace(pl.x, pl.y, ez, dx, dy, range || 30); const wd = tr.d, glassI = tr.glass ? tr.i : -1;
      let best = null, bd = range || 30;
      for (const t of targets()) {
        const rx = t.x - pl.x, ry = t.y - pl.y, along = rx * dx + ry * dy;
        if (along <= 0 || along > bd) continue;
        const lat = Math.abs(rx * dy - ry * dx); if (lat > t.r) continue;
        if (!los(pl.x, pl.y, ez, t.x, t.y, t.z)) continue;
        best = t; bd = along;
      }
      if (best) {
        if (best.e) { damageEnemy(best.e, dmg, kind); puff(best.x - dx * .1, best.y - dy * .1, best.z, best.e.def.bits || rgb(255, 220, 120), 3); }
        else damageDeco(best.d, dmg);
        return best;
      }
      if (glassI >= 0) breakGlass(glassI);
      else puff(pl.x + dx * (wd - .05), pl.y + dy * (wd - .05), ez, col || rgb(200, 200, 160), 4);
      return null;
    }
    function aimZ(a, sp, z0) {
      let best = null, bd = 30;
      for (const t of targets()) {
        if (!t.e) continue;
        const rx = t.x - pl.x, ry = t.y - pl.y, d = Math.hypot(rx, ry); if (d > bd) continue;
        if (Math.abs(angDiff(Math.atan2(ry, rx), a)) > 0.16 + t.r / d) continue;
        if (!los(pl.x, pl.y, z0, t.x, t.y, t.z)) continue; best = t; bd = d;
      }
      return best ? (best.z - z0) / (bd / sp) : 0;
    }
    function spawnProj(key, x, y, z, a, vz, owner) {
      const D = G.projs[key];
      projs.push({ def: D, x, y, z, vx: Math.cos(a) * D.speed, vy: Math.sin(a) * D.speed, vz: vz || 0, owner, life: D.life || 4, fuse: D.fuse || 0, stuck: false, tgt: null, ox: 0, oy: 0, oz: 0, dead: false, armed: false, t: 0, ang: a });
    }
    function updProjs(dt) {
      for (const p of projs) {
        if (p.dead) continue;
        const D = p.def; p.t += dt;
        if (!D.det) p.life -= dt;
        if (p.stuck) {
          if (p.tgt) { if (p.tgt.dead) { p.tgt = null; } else { p.x = p.tgt.x + p.ox; p.y = p.tgt.y + p.oy; p.z = p.tgt.z + p.oz; } }
          if (D.fuse) { p.fuse -= dt; if (p.fuse <= 0) projBoom(p); }
          else if (p.armed) { p.fuse -= dt; if (p.fuse <= 0) projBoom(p); }
          continue;
        }
        if (p.armed) { p.fuse -= dt; if (p.fuse <= 0) { projBoom(p); continue; } }
        if (p.life <= 0) { if (D.splash) projBoom(p); else p.dead = true; continue; }
        if (D.trail && (frameN & 1)) part(p.x, p.y, p.z, 0, 0, .2, D.trail, .4, .04, -0.3);
        p.vz -= (D.grav || 0) * dt;
        const n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy, p.vz) * dt / 0.08));
        for (let s = 0; s < n && !p.dead && !p.stuck; s++) {
          const nx = p.x + p.vx * dt / n, ny = p.y + p.vy * dt / n, nz = p.z + p.vz * dt / n;
          const i = idx(nx, ny);
          let hitW = i < 0 || S[i];
          if (!hitW) { const f = floorAt(i, nx, ny); if (nz < f) { if (D.bounce) { p.z = f; p.vz = -p.vz * D.bounce; p.vx *= 0.7; p.vy *= 0.7; if (Math.abs(p.vz) < 0.4) { p.vz = 0; } continue; } hitW = true; } else if (nz > CE[i] && !SK[i]) { if (D.bounce) { p.vz = -Math.abs(p.vz) * 0.5; continue; } hitW = true; } }
          if (hitW) {
            if (i >= 0 && S[i] === 2) { breakGlass(i); if (!D.pierceGlass) { impact(p, null); } continue; }
            if (D.bounce) {
              if (idx(nx, p.y) < 0 || S[idx(nx, p.y)]) p.vx = -p.vx * D.bounce; else p.vy = -p.vy * D.bounce;
              if (D.sBounce) D.sBounce(au); continue;
            }
            if (D.sticky) { p.stuck = true; p.fuse = D.fuse || 1.5; if (D.sStick) D.sStick(au); continue; }
            impact(p, null); continue;
          }
          p.x = nx; p.y = ny; p.z = nz;
          // hit bodies
          if (p.owner === 'p') {
            if (D.det) continue;
            for (const e of enemies) {
              if (e.dead) continue; const r = e.def.r * (e.shrunk > 0 ? .5 : 1) + (D.r || 0.05);
              const eh = e.def.h * (e.shrunk > 0 ? .35 : 1) * (e.def.scale || 1) / (e.def.scale || 1);
              if (Math.abs(e.x - p.x) < r && Math.abs(e.y - p.y) < r && p.z > e.z - 0.05 && p.z < e.z + eh + 0.05) {
                if (D.sticky) { p.stuck = true; p.tgt = e; p.ox = p.x - e.x; p.oy = p.y - e.y; p.oz = p.z - e.z; p.fuse = D.fuse || 1.5; if (D.sStick) D.sStick(au); break; }
                impact(p, e); break;
              }
            }
            if (!p.dead && !p.stuck) for (const d of decos) {
              if (d.broken || !d.def.hp) continue;
              if (Math.abs(d.x - p.x) < (d.def.r || .2) + .05 && Math.abs(d.y - p.y) < (d.def.r || .2) + .05 && p.z < d.z + (d.def.ht || .6)) { if (D.splash) impact(p, null); else { damageDeco(d, D.dmg); p.dead = true; } break; }
            }
          } else if (!pl.dead) {
            if (Math.abs(pl.x - p.x) < PR + (D.r || .06) && Math.abs(pl.y - p.y) < PR + (D.r || .06) && p.z > pl.z - .05 && p.z < pl.z + PHT + .05) impact(p, 'player');
          }
        }
        if (D.det && !p.armed && Math.abs(p.vx) + Math.abs(p.vy) < 0.05 && p.vz === 0) { p.vx = p.vy = 0; }
      }
      projs = projs.filter(p => !p.dead);
    }
    function impact(p, who) {
      const D = p.def;
      if (D.splash) { projBoom(p); if (who && who !== 'player' && D.dmg) damageEnemy(who, D.dmg, D.kind); return; }
      p.dead = true;
      if (who === 'player') { hurtPlayer(D.dmg); }
      else if (who) { damageEnemy(who, D.dmg, D.kind); }
      puff(p.x, p.y, p.z, D.puff || rgb(255, 200, 100), 5);
      if (D.sHit) D.sHit(au);
    }
    function projBoom(p) {
      if (p.dead) return; p.dead = true;
      explode(p.x, p.y, Math.max(p.z, floorAt(Math.max(0, idx(p.x, p.y)), p.x, p.y) + 0.1), p.def.splash, p.def.sdmg || 80, p.owner === 'p');
    }

    // ---------- weapons ----------
    function hasAmmo(i) { const w = WEAP[i]; return !w.ammo || infAmmo || pl.ammo[w.ammo] >= (w.use || 1) || (w.kind === 'pipe' && pl.pipes > 0); }
    function selectWeapon(i) {
      if (i < 0 || i >= WEAP.length || !pl.has[i] || !hasAmmo(i) || i === pl.cur) return false;
      pl.want = i; pl.swT = 0.3; au.tone(300, .04, { type: 'square', vol: .08 }); return true;
    }
    function bestWeapon() { for (let i = WEAP.length - 1; i >= 0; i--) if (pl.has[i] && hasAmmo(i) && !WEAP[i].noAuto) return i; return 0; }
    function cycleWeapon() { for (let k = 1; k <= WEAP.length; k++) { const i = ((pl.want >= 0 ? pl.want : pl.cur) + k) % WEAP.length; if (pl.has[i] && hasAmmo(i)) { pl.want = i; pl.swT = 0.3; au.tone(300, .04, { type: 'square', vol: .08 }); return; } } }
    function fire(fresh) {
      if (pl.mount) { fireMount(); return; }
      if (pl.fireCd > 0 || pl.swT > 0) return;
      const w = WEAP[pl.cur];
      if ((w.kind === 'pipe' || w.kind === 'mine') && !fresh) return;
      if (w.kind === 'pipe' && pl.pipes > 0) {
        for (const p of projs) if (p.def.det && p.owner === 'p' && !p.armed) { p.armed = true; p.fuse = 0.05; }
        pl.pipes = 0; pl.fireCd = 0.4; pl.wanim = 0.2; SND.click();
        if (!hasAmmo(pl.cur)) { const b = bestWeapon(); if (b !== pl.cur) selectWeapon(b); }
        return;
      }
      if (!hasAmmo(pl.cur)) { SND.click(); pl.fireCd = 0.3; const b = bestWeapon(); if (b !== pl.cur) selectWeapon(b); return; }
      if (w.ammo && !infAmmo) pl.ammo[w.ammo] -= (w.use || 1);
      pl.fireCd = w.cd; pl.wanim = w.anim || 0.12;
      if (w.snd) w.snd(au);
      const ez = pl.z + EYE - 0.12;
      const a = pl.ang;
      if (w.kind === 'melee') {
        let hit = false;
        for (const t of targets()) {
          const rx = t.x - pl.x, ry = t.y - pl.y, d = Math.hypot(rx, ry);
          if (d > w.range + t.r || Math.abs(angDiff(Math.atan2(ry, rx), a)) > (w.arc || 0.5)) continue;
          if (Math.abs(t.z - (pl.z + 0.4)) > 0.9) continue;
          if (t.e) damageEnemy(t.e, w.dmg, 'melee'); else damageDeco(t.d, w.dmg); hit = true;
          if (!w.multi) break;
        }
        if (!hit) { const tr = trace(pl.x, pl.y, ez, Math.cos(a), Math.sin(a), w.range); if (tr.d < w.range && tr.glass) breakGlass(tr.i); if (tr.d < w.range && tr.i >= 0 && (FG[tr.i] & F_PAPER)) breakGlass(tr.i); }
        if (hit && w.sHit) w.sHit(au);
        hearNoise(pl.x, pl.y, 3);
      } else if (w.kind === 'hitscan') {
        for (let k = 0; k < (w.pellets || 1); k++) hitscan(a + (rnd() - .5) * (w.spread || 0.02), w.dmg, w.range, w.dkind);
        flashW = Math.max(flashW, 0.06); hearNoise(pl.x, pl.y, 10);
      } else if (w.kind === 'proj') {
        const P = G.projs[w.proj]; const vz = P.grav ? (w.loft || 1.2) : aimZ(a, P.speed, ez);
        const fan = w.fan || [0];
        for (const o of fan) spawnProj(w.proj, pl.x + Math.cos(a) * 0.2, pl.y + Math.sin(a) * 0.2, ez, a + o, vz, 'p');
        hearNoise(pl.x, pl.y, 8);
      } else if (w.kind === 'pipe') {
        spawnProj(w.proj, pl.x + Math.cos(a) * 0.2, pl.y + Math.sin(a) * 0.2, ez, a, 1.8, 'p'); pl.pipes++;
      } else if (w.kind === 'mine') {
        const tr = trace(pl.x, pl.y, pl.z + 0.3, Math.cos(a), Math.sin(a), 1.4);
        if (tr.d >= 1.4 || tr.glass) { note(G.mineMsg || 'GET CLOSER TO A WALL'); if (!infAmmo) pl.ammo[w.ammo] += (w.use || 1); pl.fireCd = .3; return; }
        const mx = pl.x + Math.cos(a) * (tr.d - 0.06), my = pl.y + Math.sin(a) * (tr.d - 0.06);
        const back = trace(mx, my, pl.z + 0.3, -Math.cos(a), -Math.sin(a), 12);
        mines.push({ x: mx, y: my, z: pl.z + 0.3, ex: mx - Math.cos(a) * back.d, ey: my - Math.sin(a) * back.d, arm: 1.2, boom: false, fuse: 0 });
        note(G.mineSet || 'TRIPMINE ARMED');
      } else if (w.kind === 'chain') {
        const first = hitscan(a, w.dmg, w.range, 'zap', rgb(160, 200, 255));
        const fx = pl.x + Math.cos(a) * 0.3, fy = pl.y + Math.sin(a) * 0.3;
        let last = first ? { x: first.x, y: first.y, z: first.z } : null;
        zap(fx, fy, ez, last ? last.x : pl.x + Math.cos(a) * 6, last ? last.y : pl.y + Math.sin(a) * 6, last ? last.z : ez);
        if (first && first.e) {
          const hitSet = new Set([first.e]);
          for (let k = 0; k < 2; k++) {
            let nb = null, nd = 3.5;
            for (const e of enemies) if (!e.dead && !hitSet.has(e)) { const d = Math.hypot(e.x - last.x, e.y - last.y); if (d < nd && los(last.x, last.y, last.z, e.x, e.y, e.z + e.def.h / 2)) { nd = d; nb = e; } }
            if (!nb) break; hitSet.add(nb);
            zap(last.x, last.y, last.z, nb.x, nb.y, nb.z + nb.def.h / 2); last = { x: nb.x, y: nb.y, z: nb.z + nb.def.h / 2 };
            damageEnemy(nb, w.dmg * 0.7, 'zap');
          }
        }
        flashW = Math.max(flashW, 0.15); hearNoise(pl.x, pl.y, 10);
      }
      if (w.ammo && !hasAmmo(pl.cur) && w.kind !== 'pipe') { const b = bestWeapon(); if (b !== pl.cur) selectWeapon(b); }
    }
    function zap(x0, y0, z0, x1, y1, z1) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.15);
      for (let k = 0; k <= n; k++) { const t = k / n; part(x0 + (x1 - x0) * t + (rnd() - .5) * .08, y0 + (y1 - y0) * t + (rnd() - .5) * .08, z0 + (z1 - z0) * t + (rnd() - .5) * .08, 0, 0, 0, k & 1 ? rgb(200, 230, 255) : rgb(120, 160, 255), .15, .025, 0, true); }
    }
    // mounted turret / vehicle
    function mount(d) {
      if (pl.mount || d.broken) return;
      pl.mount = d; pl.prevX = pl.x; pl.prevY = pl.y;
      if (d.def.mount === 'turret') { pl.x = d.x; pl.y = d.y; }
      else { pl.x = d.x; pl.y = d.y; pl.ang = d.ang || pl.ang; }
      note(d.def.mountMsg || 'MOUNTED - PRESS X TO GET OFF'); au.tone(200, .1, { type: 'square', vol: .12 }); au.tone(300, .1, { type: 'square', vol: .12, delay: .1 });
      pl.fireCd = 0.3;
    }
    function dismount() {
      const d = pl.mount; if (!d) return; pl.mount = null;
      d.x = pl.x; d.y = pl.y; d.ang = pl.ang;
      for (const off of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
        const a = pl.ang + off, nx = d.x + Math.cos(a) * 0.75, ny = d.y + Math.sin(a) * 0.75;
        if (probe(nx, ny, PR, pl.z + 0.2, PHT, STEP, false)) { pl.x = nx; pl.y = ny; break; }
      }
      au.tone(300, .08, { type: 'square', vol: .1 });
    }
    function fireMount() {
      const d = pl.mount, M = d.def;
      if (pl.fireCd > 0) return;
      pl.fireCd = M.cd; pl.wanim = 0.1;
      if (M.snd) M.snd(au);
      if (M.mount === 'turret') { hitscan(pl.ang + (rnd() - .5) * 0.04, M.dmg, 30, 'bullet'); flashW = Math.max(flashW, .08); }
      else { const ez = pl.z + EYE - 0.1; spawnProj(M.proj, pl.x + Math.cos(pl.ang) * .5, pl.y + Math.sin(pl.ang) * .5, ez, pl.ang, aimZ(pl.ang, G.projs[M.proj].speed, ez), 'p'); }
      hearNoise(pl.x, pl.y, 10);
    }

    // ---------- player update ----------
    function updPlayer(dt) {
      const k = api.key;
      pl.bumpT -= dt; pl.fireCd -= dt; pl.wanim -= dt; pl.hurtT -= dt; pl.splashT -= dt;
      if (pl.boost > 0) { pl.boost -= dt; if (pl.boost <= 0) note(G.boostEnd || 'BOOST WORE OFF'); }
      if (pl.focus > 0) { pl.focus -= dt; if (pl.focus <= 0) note(G.focusEnd || 'POWER FADES'); }
      // turning (accelerating for precision)
      const tl = k('ArrowLeft'), tr = k('ArrowRight');
      if (tl || tr) pl.turnV = Math.min(1, pl.turnV + dt * 4); else pl.turnV = 0;
      const ts = (1.3 + 1.7 * pl.turnV) * (pl.mount && pl.mount.def.mount === 'cart' ? 0.8 : 1);
      if (tl) pl.ang -= ts * dt; if (tr) pl.ang += ts * dt;
      // weapon select
      if (!pl.mount) {
        for (let n = 1; n <= 9; n++) if (api.pressed('Digit' + n)) selectWeapon(n - 1);
        if (api.pressed('KeyX')) cycleWeapon();
        if (pl.swT > 0) { pl.swT -= dt; if (pl.swT <= 0.15 && pl.want >= 0) { pl.cur = pl.want; pl.want = -1; } }
      } else if (api.pressed('KeyX')) dismount();
      if (api.key('Space')) fire(api.pressed('Space'));
      // movement
      let f = 0, s = 0;
      if (k('ArrowUp') || k('KeyW')) f += 1; if (k('ArrowDown') || k('KeyS')) f -= 1;
      if (k('KeyA') || k('KeyQ')) s -= 1; if (k('KeyD') || k('KeyE')) s += 1;
      const cart = pl.mount && pl.mount.def.mount === 'cart';
      if (pl.mount && !cart) f = s = 0;
      const ca = Math.cos(pl.ang), sa = Math.sin(pl.ang);
      let sp = cart ? 5.2 : 3.5; if (pl.boost > 0) sp *= 1.55; if (PB.water && pl.onGround && !cart) sp *= 0.6;
      if (cart) s = 0;
      const tvx = (ca * f - sa * s) * sp, tvy = (sa * f + ca * s) * sp;
      const acc = Math.min(1, dt * (cart ? 3 : 10));
      pl.vx += (tvx - pl.vx) * acc; pl.vy += (tvy - pl.vy) * acc;
      const r = cart ? 0.36 : PR, stp = cart ? 0.2 : STEP;
      const ox = pl.x, oy = pl.y;
      const bl = moveBody(pl, pl.vx * dt, pl.vy * dt, r, PHT, stp, false);
      if (bl !== -2 && (f || s)) bump(bl, true);
      // enemies block the player
      for (const e of enemies) {
        if (e.dead || e.shrunk > 0 || (e.def.fly && Math.abs(e.z - pl.z) > 0.7)) continue;
        const rr = r + e.def.r * 0.8, dx = pl.x - e.x, dy = pl.y - e.y;
        if (dx * dx + dy * dy < rr * rr && (ox - e.x) * (ox - e.x) + (oy - e.y) * (oy - e.y) > dx * dx + dy * dy) { pl.x = ox; pl.y = oy; break; }
      }
      // solid decos
      for (const d of decos) {
        if (d.gone || !d.def.solid || d === pl.mount) continue;
        if (d.broken && !d.def.broke) continue;
        const dx = pl.x - d.x, dy = pl.y - d.y, rr = r + (d.def.r || 0.2);
        if (Math.abs(dx) < rr && Math.abs(dy) < rr && Math.abs(d.z - pl.z) < 0.8 && Math.max(Math.abs(ox - d.x), Math.abs(oy - d.y)) >= Math.max(Math.abs(dx), Math.abs(dy)) - 1e-6) {
          pl.x = ox; pl.y = oy; pl.vx *= 0.3; pl.vy *= 0.3;
          if (d.def.mount && !d.broken && f > 0 && !pl.mount) mount(d);
        }
      }
      // cart runs over enemies
      if (cart) {
        const spd = Math.hypot(pl.vx, pl.vy);
        for (const e of enemies) if (!e.dead && !e.def.boss && spd > 2 && Math.hypot(e.x - pl.x, e.y - pl.y) < 0.55 + e.def.r) { damageEnemy(e, 200 * dt * spd, 'crush'); }
        pl.mount.x = pl.x; pl.mount.y = pl.y; pl.mount.ang = pl.ang;
      }
      // vertical
      PB.water = false; sampleFC(pl.x, pl.y, r - 0.02);
      const fl = PB.f, ce = PB.c;
      const jump = k('KeyZ') && !pl.mount;
      if (pl.z <= fl + 0.001 && pl.vz <= 0) {
        if (!pl.onGround && pl.vz < -4) au.tone(90, .06, { type: 'square', vol: .1 });
        pl.z = fl; pl.vz = 0; pl.onGround = true;
        if (jump) { pl.vz = 3.7; pl.onGround = false; au.tone(240, .06, { type: 'square', vol: .06, slideTo: 360 }); }
      } else {
        pl.onGround = false;
        if (jump && pl.jet > 0 && G.jetpack) {
          pl.vz = Math.min(2.4, pl.vz + 26 * dt); pl.jet = Math.max(0, pl.jet - dt * 5);
          if ((pl.jetSnd -= dt) <= 0) { pl.jetSnd = 0.12; au.noise(.14, { vol: .08, freq: 900 }); }
          part(pl.x - ca * .1, pl.y - sa * .1, pl.z - .05, (rnd() - .5) * .4, (rnd() - .5) * .4, -1, rgb(255, 180, 60), .3, .03, 0, true);
        } else pl.vz -= GRAV * dt;
        pl.z += pl.vz * dt;
        if (pl.z < fl) { pl.z = fl; pl.vz = 0; }
      }
      if (pl.z + PHT > ce) { pl.z = Math.max(fl, ce - PHT); if (pl.vz > 0) pl.vz = 0; }
      // view height & bob
      const moving = Math.hypot(pl.vx, pl.vy);
      if (pl.onGround && moving > 0.5) pl.bobA += dt * moving * 2.6;
      pl.bob = Math.sin(pl.bobA) * Math.min(1, moving / 3) * (cart ? 0.2 : 1);
      pl.viewZ += (EYE - pl.viewZ) * Math.min(1, dt * 12);
      // cell effects
      const ci = idx(pl.x, pl.y);
      if (ci >= 0) {
        SEEN[ci] = 1;
        if (FG[ci] & F_SECRET) { FG[ci] &= ~F_SECRET; secretsFound++; note('YOU FOUND A SECRET AREA!'); SND.secret(); addScore(1000); say(pick(G.quips.secret)); }
        if ((FG[ci] & F_HURT) && pl.z < FL[ci] + 0.05 && pl.hurtT <= 0) { hurtPlayer(level.hurt || 5); pl.hurtT = 0.5; }
        if ((FG[ci] & F_WATER) && pl.onGround && moving > 1 && pl.splashT <= 0) { pl.splashT = 0.45; SND.splash(); }
      }
      // pickups
      for (const it of items) {
        if (it.taken) continue;
        if (Math.abs(it.x - pl.x) < 0.5 && Math.abs(it.y - pl.y) < 0.5 && Math.abs(it.z - pl.z) < 0.7) takeItem(it);
      }
      items = items.filter(i => !i.taken);
      // squish shrunk enemies
      for (const e of enemies) if (!e.dead && e.shrunk > 0 && Math.hypot(e.x - pl.x, e.y - pl.y) < 0.4) { SND.squish(); for (let q = 0; q < 8; q++) part(e.x, e.y, e.z + .05, (rnd() - .5) * 2, (rnd() - .5) * 2, rnd() * 1.5, e.def.bits || rgb(120, 200, 80), .5, .03, 6); killEnemy(e, 'squish'); e.dieT = 9; if (rnd() < .6) say(pick(G.quips.squish || G.quips.kill)); }
      // walk into frozen enemies shatters them
      for (const e of enemies) if (!e.dead && e.frozen > 0 && Math.hypot(e.x - pl.x, e.y - pl.y) < 0.5 && f > 0) shatter(e);
    }
    function takeItem(it) {
      const D = it.def; let ok = false, m = D.msg;
      if (D.hp) { const mx = D.max || 100; if (pl.hp < mx) { pl.hp = Math.min(mx, pl.hp + D.hp); ok = true; } }
      if (D.armor) { if (pl.armor < 100) { pl.armor = Math.min(100, pl.armor + D.armor); ok = true; } }
      if (D.weapon != null) { if (!pl.has[D.weapon]) { pl.has[D.weapon] = true; ok = true; if (pl.cur < D.weapon || !WEAP[pl.cur].ammo || true) selectWeapon(D.weapon); } }
      if (D.ammo) for (const a in D.ammo) { if (pl.ammo[a] < G.ammoMax[a]) { pl.ammo[a] = Math.min(G.ammoMax[a], pl.ammo[a] + D.ammo[a]); ok = true; } }
      if (D.key) { if (!pl.keys[D.key]) { pl.keys[D.key] = 1; ok = true; m = 'YOU GOT THE ' + G.keyNames[D.key] + '!'; } }
      if (D.jet) { if (pl.jet < 100) { pl.jet = 100; ok = true; } }
      if (D.boost) { pl.boost = D.boost; ok = true; }
      if (D.focus) { pl.focus = D.focus; ok = true; }
      if (D.life) { lives++; ok = true; }
      if (!ok) return;
      it.taken = true; if (D.score) addScore(D.score); else addScore(25);
      note(m || 'PICKED UP'); flashG = 0.25;
      if (D.key) SND.key(); else if (D.snd) D.snd(au); else SND.pick();
      if (D.quip && rnd() < 0.7) say(pick(G.quips[D.quip]));
      if (D.weapon != null && rnd() < 0.5) say(pick(G.quips.weapon));
    }

    // ---------- enemies ----------
    function buildFlow(fly) {
      const N = MW * MH, dist = new Int16Array(N).fill(-1); const q = new Int32Array(N);
      const s = idx(pl.x, pl.y); if (s < 0) return dist;
      let h = 0, t = 0; q[t++] = s; dist[s] = 0;
      while (h < t) {
        const b = q[h++], bx = b % MW, by = (b / MW) | 0;
        for (let k = 0; k < 4; k++) {
          const ax = bx + (k === 0 ? -1 : k === 1 ? 1 : 0), ay = by + (k === 2 ? -1 : k === 3 ? 1 : 0);
          if (ax < 0 || ay < 0 || ax >= MW || ay >= MH) continue;
          const a = ay * MW + ax; if (dist[a] >= 0 || S[a]) continue;
          const da = doorAt[a], db = doorAt[b];
          const closedA = da >= 0 && doors[da].kind !== 'n' && doors[da].st === 0;
          const closedB = db >= 0 && doors[db].kind !== 'n' && doors[db].st === 0;
          if (closedA || closedB) continue;
          if (!fly && da < 0 && db < 0 && FL[b] - FL[a] > 0.36) continue;
          if (da < 0 && CE[a] - FL[a] < (fly ? 0.45 : 0.6)) continue;
          dist[a] = dist[b] + 1; q[t++] = a;
        }
      }
      return dist;
    }
    function updEnemies(dt) {
      if ((flowT -= dt) <= 0 && !pl.dead) { flowT = 0.4; flowW = buildFlow(false); flowF = buildFlow(true); }
      const alive = enemies.filter(e => !e.dead).length;
      for (const e of enemies) {
        const D = e.def;
        e.flash -= dt;
        if (e.dead) {
          e.dieT += dt;
          if (e.fall) { const f = FL[Math.max(0, idx(e.x, e.y))]; e.z = Math.max(f, e.z - dt * 3); }
          if (e.dieT > 2.4) e.gone = true; continue;
        }
        if (e.frozen > 0) { e.frozen -= dt; if (e.frozen <= 0) e.hp = Math.max(5, D.hp * 0.3); continue; }
        if (e.shrunk > 0) { e.shrunk -= dt; }
        e.animT += dt; e.atkCd -= dt; e.painT -= dt;
        const dx = pl.x - e.x, dy = pl.y - e.y, dist = Math.hypot(dx, dy);
        if (!e.awake) {
          if ((frameN + e.id) % 10 === 0 && !pl.dead && dist < (D.sight || 14) && los(e.x, e.y, e.z + D.h * 0.85, pl.x, pl.y, pl.z + EYE)) wake(e);
          if (D.fly) e.z += Math.sin(animT * 2 + e.id) * 0.002;
          continue;
        }
        if ((frameN + e.id) % 6 === 0) e.see = !pl.dead && los(e.x, e.y, e.z + D.h * 0.85, pl.x, pl.y, pl.z + EYE - 0.1);
        if (e.painT > 0) continue;
        if (e.atkT > 0) {
          e.atkT -= dt;
          if (e.atkT <= 0 && e.shrunk <= 0) enemyAttack(e, dist, alive);
          continue;
        }
        const A = D.boss ? D.atks[e.phase % D.atks.length] : D.atk;
        if (e.shrunk <= 0 && e.atkCd <= 0 && !pl.dead && dist < A.range && (e.see || A.kind === 'summon')) {
          e.atkT = A.wind || 0.35; e.atkCd = (A.cd || 1.5) * (0.7 + rnd() * 0.6) / (1 + levelIdx * 0.04);
          if (A.sWind) A.sWind(au);
          continue;
        }
        // movement
        let tx = e.x, ty = e.y, sp = (D.speed || 1.5) * (e.shrunk > 0 ? 0.5 : 1);
        const keep = D.keep || 0.7;
        if (e.shrunk > 0) { tx = e.x - dx; ty = e.y - dy; }
        else if (e.see && dist > keep) {
          e.stT -= dt; if (e.stT <= 0) { e.stT = 0.6 + rnd() * 1.2; e.strafe = rnd() < 0.5 ? -1 : 1; if (rnd() < 0.3) e.strafe = 0; }
          const st = D.strafe == null ? 0.6 : D.strafe;
          tx = e.x + dx / dist + (-dy / dist) * e.strafe * st; ty = e.y + dy / dist + (dx / dist) * e.strafe * st;
        } else if (!e.see) {
          const fld = D.fly ? flowF : flowW; const ci = idx(e.x, e.y);
          if (fld && ci >= 0) {
            let bd = fld[ci] < 0 ? 9999 : fld[ci], bi = -1; const cx = ci % MW, cy = (ci / MW) | 0;
            for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const j = idx(cx + ox, cy + oy); if (j >= 0 && fld[j] >= 0 && fld[j] < bd) { bd = fld[j]; bi = j; } }
            if (bi >= 0) { tx = bi % MW + 0.5; ty = ((bi / MW) | 0) + 0.5; }
          }
        }
        const mx = tx - e.x, my = ty - e.y, ml = Math.hypot(mx, my);
        if (ml > 0.01) {
          const vx = mx / ml * sp * dt, vy = my / ml * sp * dt;
          const bl = moveBody(e, vx, vy, D.r, D.fly ? 0.3 : D.h * 0.9, 0.36, !!D.fly);
          if (bl >= 0) bump(bl, false);
        }
        // separation
        for (const o of enemies) {
          if (o === e || o.dead) continue;
          const ox = e.x - o.x, oy = e.y - o.y, d = Math.hypot(ox, oy), rr = D.r + o.def.r;
          if (d < rr && d > 0.001) { const push = (rr - d) * 0.3; moveBody(e, ox / d * push, oy / d * push, D.r, D.fly ? 0.3 : D.h * 0.9, 0.36, !!D.fly); }
        }
        // vertical
        const ci = idx(e.x, e.y);
        if (ci >= 0) {
          sampleFC(e.x, e.y, D.r - 0.02); const f = PB.f, c = PB.c;
          if (D.fly) {
            const want = clamp(pl.z + 0.45 + Math.sin(animT * 1.7 + e.id) * 0.15, f + 0.1, c - D.h - 0.05);
            e.z += clamp(want - e.z, -dt * 1.2, dt * 1.2);
          } else { if (e.z > f) e.z = Math.max(f, e.z - dt * 4); else e.z = f; }
        }
      }
      enemies = enemies.filter(e => !e.gone);
    }
    function enemyAttack(e, dist, alive) {
      const D = e.def, A = D.boss ? D.atks[e.phase++ % D.atks.length] : D.atk;
      if (pl.dead) return;
      const sx = e.x, sy = e.y, sz = e.z + D.h * (D.mz || 0.65);
      const a = Math.atan2(pl.y - sy, pl.x - sx);
      if (A.snd) A.snd(au);
      if (A.kind === 'proj') {
        const P = G.projs[A.proj];
        const n = A.n || 1, spread = A.spread || 0.12;
        for (let k = 0; k < n; k++) {
          const o = n === 1 ? (rnd() - .5) * 0.06 : (k - (n - 1) / 2) * spread;
          const vz = P.grav ? 1.5 : ((pl.z + EYE - 0.15) - sz) / (dist / P.speed);
          spawnProj(A.proj, sx + Math.cos(a) * D.r, sy + Math.sin(a) * D.r, sz, a + o, vz, 'e');
        }
      } else if (A.kind === 'hit') {
        const n = A.n || 1;
        for (let k = 0; k < n; k++) {
          const ch = clamp(1.05 - dist / 13, 0.2, 0.8) * (Math.hypot(pl.vx, pl.vy) > 2 ? 0.7 : 1);
          if (rnd() < ch) hurtPlayer(A.dmg); else puff(pl.x + (rnd() - .5), pl.y + (rnd() - .5), pl.z + rnd() * .6, rgb(200, 200, 160), 2);
        }
      } else if (A.kind === 'melee') {
        if (dist < A.range + 0.2) hurtPlayer(A.dmg);
      } else if (A.kind === 'summon') {
        if (alive < 9) for (let k = 0; k < (A.n || 2); k++) {
          const ang = rnd() * TAU, nx = e.x + Math.cos(ang) * 1.6, ny = e.y + Math.sin(ang) * 1.6;
          if (probe(nx, ny, 0.3, FL[Math.max(0, idx(nx, ny))], 0.8, 0.5, false)) { const m = spawnEnemy(pick(A.what), nx, ny); m.awake = true; if (!m.def.noCount) killsTotal--; m.summoned = true; for (let q = 0; q < 10; q++) part(nx, ny, .3, (rnd() - .5) * 2, (rnd() - .5) * 2, rnd() * 2, rgb(200, 120, 255), .6, .04, 2, true); }
        }
      }
    }

    // ---------- world update ----------
    function updMines(dt) {
      for (const m of mines) {
        if (m.boom) { m.fuse -= dt; if (m.fuse <= 0) { m.gone = true; explode(m.x, m.y, m.z, 2.2, 130, true); } continue; }
        if (m.arm > 0) { m.arm -= dt; continue; }
        const sx = m.ex - m.x, sy = m.ey - m.y, L2 = sx * sx + sy * sy || 1;
        for (const e of enemies) {
          if (e.dead) continue;
          const t = clamp(((e.x - m.x) * sx + (e.y - m.y) * sy) / L2, 0, 1), px = m.x + sx * t, py = m.y + sy * t;
          if (Math.hypot(e.x - px, e.y - py) < e.def.r + 0.05 && m.z > e.z - 0.1 && m.z < e.z + e.def.h + 0.1) { m.boom = true; m.fuse = 0.05; au.tone(1200, .1, { type: 'square', vol: .15 }); break; }
        }
      }
      mines = mines.filter(m => !m.gone);
    }
    function updDecos(dt) {
      for (const d of decos) {
        if (d.def.spray && d.broken && d.t > 0) {
          d.t -= dt;
          for (let k = 0; k < 2; k++) part(d.x + (rnd() - .5) * .1, d.y + (rnd() - .5) * .1, d.z + .3, (rnd() - .5) * 1.2, (rnd() - .5) * 1.2, 3 + rnd() * 1.5, rnd() < .5 ? rgb(150, 200, 255) : rgb(220, 240, 255), .9, .03, 7);
          if (Math.hypot(pl.x - d.x, pl.y - d.y) < 0.7 && (frameN % 30 === 0) && pl.hp < 100) { pl.hp = Math.min(100, pl.hp + 1); }
        }
      }
      decos = decos.filter(d => !d.gone);
    }
    function updWorld(dt) {
      frameN++; animT += dt;
      updDoors(dt); updLifts(dt); updEnemies(dt); updProjs(dt); updMines(dt); updDecos(dt); updParts(dt);
      if (flashR > 0) flashR -= dt * 1.2; if (flashG > 0) flashG -= dt; if (flashW > 0) flashW -= dt * 1.5; if (shake > 0) shake -= dt;
      if (msgT > 0) msgT -= dt; if (quipT > 0) quipT -= dt; if (bannerT > 0) bannerT -= dt; lastQuipT += dt;
      if (multiT > 0) { multiT -= dt; if (multiT <= 0) multiKill = 0; }
      if (bossT > 0) {
        bossT -= dt;
        if (boss && (frameN % 9 === 0)) explode(boss.x + (rnd() - .5) * 1.4, boss.y + (rnd() - .5) * 1.4, boss.z + rnd() * boss.def.h * 1.5, 0.5, 0, true);
        if (bossT <= 0) { boss = null; victory(); }
      }
    }
    function levelDone() {
      if (mode !== 'play') return;
      if (level.boss && boss && !boss.dead) { note(G.bossFirst || 'FINISH THE BOSS FIRST!'); return; }
      mode = 'tally'; modeT = 0;
      const t = Math.floor(levelTime);
      addScore(Math.max(0, 5000 - t * 20) + (killsTotal ? Math.round(kills / killsTotal * 3000) : 0) + secretsFound * 500);
      au.melody(G.music.clear, { type: 'square', vol: .13 });
      say(pick(G.quips.exit), 4);
    }
    function victory() {
      mode = 'victory'; modeT = 0; addScore(25000);
      au.melody(G.music.win, { type: 'square', vol: .14 });
      if (score > hiScore) { hiScore = score; api.setHiScore(score); }
    }
    function playerDeathDone() {
      lives--;
      if (lives > 0) { startLevel(levelIdx, false); return; }
      const over = () => { mode = 'over'; modeT = 0; if (score > hiScore) { hiScore = score; api.setHiScore(score); } };
      if (api.offerContinue) {
        mode = 'wait';
        api.offerContinue(() => { lives = 3; score = 0; snap.score = 0; nextLife = 30000; startLevel(levelIdx, false); }, over);
      } else over();
    }

    // ---------- music: simple low-volume bass loop ----------
    function updMusic(dt) {
      const M = G.music; if (!M.loop) return;
      musicT -= dt; if (musicT > 0) return;
      const seq = (level && level.boss && boss) ? (M.bossLoop || M.loop) : (level && level.mood && M[level.mood]) || M.loop;
      const n = seq[musicStep % seq.length]; musicStep++;
      musicT = M.tempo || 0.2;
      if (n) au.tone(n, (M.tempo || 0.2) * 0.9, { type: M.wave || 'triangle', vol: M.vol || 0.05 });
      if (M.hat && musicStep % 2 === 0) au.noise(.03, { vol: .025, freq: 7000, type: 'highpass' });
    }

    // ---------- main update ----------
    function tryStart() {
      if (api.useCredit()) { newGame(); au.melody(G.music.coin || [[523, .06], [784, .1]], { type: 'square', vol: .12 }); return true; }
      coinFlash = 90; au.tone(70, 0.25, { type: 'square', vol: 0.2 }); return false;
    }
    function update(dt) {
      modeT += dt;
      if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
      if (mode === 'attract') {
        attractA += dt * 0.25;
        if (!level) { loadLevel(0); pl = newPlayer(); placePlayer(); }
        if (api.anyPressed('Enter', 'Space')) tryStart();
        return;
      }
      if (mode === 'story') {
        if (modeT > 0.5 && api.anyPressed('Enter', 'Space', 'KeyX')) { storyPage++; modeT = 0; au.tone(440, .05, { type: 'square', vol: .1 }); }
        if (modeT > 9) { storyPage++; modeT = 0; }
        if (storyPage >= G.story.length) startLevel(0, true);
        return;
      }
      if (mode === 'play') {
        if (api.pressed('Tab') || api.pressed('KeyM')) mapOn = !mapOn;
        if (pl.dead) { pl.deadT += dt; pl.viewZ = Math.max(0.1, pl.viewZ - dt * 0.8); if (pl.deadT > 2.4) playerDeathDone(); }
        else updPlayer(dt);
        if (mode === 'play') updWorld(dt);
        updMusic(dt);
        return;
      }
      if (mode === 'wait') return;
      if (mode === 'tally') {
        if (modeT > 1.2 && api.anyPressed('Enter', 'Space', 'KeyX')) {
          if (levelIdx + 1 < G.levels.length) startLevel(levelIdx + 1, true);
          else victory();
        }
        return;
      }
      if (mode === 'victory') { if (modeT > 4 && api.anyPressed('Enter', 'Space') || modeT > 22) { mode = 'attract'; modeT = 0; level = null; } return; }
      if (mode === 'over') { if (modeT > 5 || (modeT > 1.5 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; modeT = 0; level = null; } return; }
    }

    // =================== RENDERING ===================
    let cx = 0, cy = 0, eye = 0, cdx = 1, cdy = 0, cpx = 0, cpy = K, invDet = 1, RDX = 0, RDY = 0, flash = 0, animOff = 0;
    function shadeOf(d, lit) { const s = (lit * (1 - d * fogK) * 15 + flash) | 0; return s < 0 ? 0 : s > 15 ? 15 : s; }
    function flat(x, ya, yb, yF, yN, iF, iN, ti, lit) {
      const Tx = TEX[ti]; const di = (iN - iF) / (yN - yF); let off = ya * VW + x;
      const an = Tx.anim ? animOff * Tx.anim : 0;
      for (let y = ya; y <= yb; y++, off += VW) {
        const inv = iF + (y + 0.5 - yF) * di; const d = inv > 1e-4 ? 1 / inv : 1e4;
        const wx = cx + RDX * d + an, wy = cy + RDY * d;
        let s = (lit * (1 - d * fogK) * 15 + flash) | 0; s = s < 0 ? 0 : s > 15 ? 15 : s;
        FB[off] = Tx.sh[s][((((wy * 64) | 0) & 63) << 6) | (((wx * 64) | 0) & 63)]; ZB[off] = d;
      }
    }
    function wall(x, ya, yb, d, u, ti, lit, anchor) {
      const Tx = TEX[ti], arr = Tx.sh[shadeOf(d, lit)]; const tu = ((u * 64) | 0) & 63;
      const dz = d / PROJ; let z = eye - (ya + 0.5 - HOR) * dz; let off = ya * VW + x;
      const an = Tx.anim ? animOff * Tx.anim : 0;
      for (let y = ya; y <= yb; y++, off += VW, z -= dz) { FB[off] = arr[((((anchor - z + an) * 64) | 0) & 63) << 6 | tu]; ZB[off] = d; }
    }
    function skyCol(x, ya, yb) {
      const sp = skyP, u = skyU[x]; let off = ya * VW + x;
      for (let y = ya; y <= yb; y++, off += VW) { let v = (y - HOR + 92) | 0; v = v < 0 ? 0 : v >= sp.h ? sp.h - 1 : v; FB[off] = sp.d[v * sp.w + u]; ZB[off] = 1e4; }
    }
    function column(x) {
      const camX = 2 * (x + 0.5) / VW - 1;
      const rdx = cdx + cpx * camX, rdy = cdy + cpy * camX; RDX = rdx; RDY = rdy;
      let mx = Math.floor(cx), my = Math.floor(cy);
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      let stx, sty, sdx, sdy;
      if (rdx < 0) { stx = -1; sdx = (cx - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - cx) * ddx; }
      if (rdy < 0) { sty = -1; sdy = (cy - my) * ddy; } else { sty = 1; sdy = (my + 1 - cy) * ddy; }
      let ytop = 0, ybot = VH - 1, dn = 0.04, ci = my * MW + mx;
      if (mx < 0 || my < 0 || mx >= MW || my >= MH) return;
      for (let it = 0; it < 120; it++) {
        let df, side;
        if (sdx < sdy) { df = sdx; side = 0; } else { df = sdy; side = 1; }
        const lit = LT[ci];
        if (df > dn + 1e-4) {
          let fN, fF;
          if (SX[ci] === 0 && SY[ci] === 0) fN = fF = FL[ci];
          else { fN = floorAt(ci, cx + rdx * dn, cy + rdy * dn); fF = floorAt(ci, cx + rdx * df, cy + rdy * df); }
          const c = CE[ci];
          // ceiling
          if (SK[ci] || c > eye) {
            const ycF = HOR + (eye - c) * PROJ / df;
            const y1 = Math.min(ybot, Math.ceil(ycF) - 1);
            if (y1 >= ytop) {
              if (SK[ci]) skyCol(x, ytop, y1); else flat(x, ytop, y1, ycF, HOR + (eye - c) * PROJ / dn, 1 / df, 1 / dn, CT[ci], lit);
              ytop = y1 + 1;
            }
          }
          // floor
          if (fF < eye) {
            const yfF = HOR + (eye - fF) * PROJ / df;
            const y0 = Math.max(ytop, Math.ceil(yfF));
            if (y0 <= ybot) { flat(x, y0, ybot, yfF, HOR + (eye - fN) * PROJ / dn, 1 / df, 1 / dn, FT[ci], lit); ybot = y0 - 1; }
          }
          if (ytop > ybot) return;
        }
        // step to next cell
        if (side === 0) { sdx += ddx; mx += stx; } else { sdy += ddy; my += sty; }
        const hx = cx + rdx * df, hy = cy + rdy * df;
        const u = side === 0 ? (stx > 0 ? hy - Math.floor(hy) : 1 - (hy - Math.floor(hy))) : (sty < 0 ? hx - Math.floor(hx) : 1 - (hx - Math.floor(hx)));
        const out = mx < 0 || my < 0 || mx >= MW || my >= MH;
        const ni = out ? -1 : my * MW + mx;
        const ldf = df < 0.04 ? 0.04 : df;
        const cF = CE[ci], fFb = floorAt(ci, hx, hy);
        if (out || S[ni] === 1) {
          const wl = lit * (side ? 0.82 : 1);
          let top = cF; if (SK[ci]) top = !out && CE[ni] < 90 ? CE[ni] : cF;
          const yT = HOR + (eye - top) * PROJ / ldf;
          const y0 = Math.max(ytop, Math.ceil(yT));
          if (SK[ci] && y0 > ytop) skyCol(x, ytop, Math.min(ybot, y0 - 1));
          if (y0 <= ybot) wall(x, y0, ybot, ldf, u, out ? WT[ci] : WT[ni], wl, fFb);
          return;
        }
        if (S[ni] === 2) {
          const gt = HOR + (eye - Math.min(CE[ni], FL[ni] + 3)) * PROJ / ldf, gb = HOR + (eye - FL[ni]) * PROJ / ldf;
          const a = Math.max(ytop, Math.ceil(gt)), b = Math.min(ybot, Math.ceil(gb) - 1);
          if (a <= b && panes.length < 2000) panes.push(x, a, b, ldf, (FG[ni] & F_PAPER) ? 1 : 0, u);
        }
        const nl = LT[ni] * (side ? 0.82 : 1);
        const nf = floorAt(ni, hx, hy);
        if (nf > fFb && fFb < eye + 50) {
          const yN = HOR + (eye - nf) * PROJ / ldf;
          const y0 = Math.max(ytop, Math.ceil(yN));
          if (y0 <= ybot) { wall(x, y0, ybot, ldf, u, WT[ni], Math.max(nl, lit * 0.9), nf); ybot = y0 - 1; }
        }
        const nc = CE[ni];
        if (nc < cF && !(SK[ci] && SK[ni])) {
          const yC = HOR + (eye - nc) * PROJ / ldf;
          const y1 = Math.min(ybot, Math.ceil(yC) - 1);
          if (y1 >= ytop) {
            wall(x, ytop, y1, ldf, u, WT[ni], Math.max(nl, lit * 0.9), nc); ytop = y1 + 1;
          }
        }
        if (ytop > ybot) return;
        dn = df; ci = ni;
        if (df > 40) break;
      }
      for (let y = ytop; y <= ybot; y++) { FB[y * VW + x] = 0xff000000; ZB[y * VW + x] = 1e4; }
    }
    function billboard(sp, wx, wy, wz, scale, lit, md, fade) {
      if (!sp) return;
      const dx = wx - cx, dy = wy - cy;
      const ty = invDet * (-cpy * dx + cpx * dy); if (ty < 0.1) return;
      const tx = invDet * (cdy * dx - cdx * dy);
      const sxc = VW / 2 * (1 + tx / ty), k = PROJ / ty;
      const ww = sp.w / sp.ppu * scale * k, hh = sp.h / sp.ppu * scale * k;
      const xL = sxc - ww / 2, yB = HOR + (eye - wz) * k, yT = yB - hh;
      if (xL + ww < 0 || xL >= VW || yB < 0 || yT >= VH) return;
      const arr = sp.sh[shadeOf(ty, lit)];
      const x0 = Math.max(0, Math.ceil(xL - 0.5)), x1 = Math.min(VW - 1, Math.floor(xL + ww - 0.5));
      const y0 = Math.max(0, Math.ceil(yT - 0.5)), y1 = Math.min(VH - 1, Math.floor(yB - 0.5));
      const fu = sp.w / ww, fv = sp.h / hh, zt = ty - 0.12;
      for (let X = x0; X <= x1; X++) {
        const tu = ((X + 0.5 - xL) * fu) | 0; if (tu < 0 || tu >= sp.w) continue;
        let off = y0 * VW + X;
        for (let Y = y0; Y <= y1; Y++, off += VW) {
          if (ZB[off] < zt) continue;
          const tv = ((Y + 0.5 - yT) * fv) | 0; if (tv < 0 || tv >= sp.h) continue;
          let c = arr[tv * sp.w + tu]; if (!c) continue;
          if (fade > 0 && ((X * 3 + Y * 5) & 7) < fade * 8) continue;
          if (md === 1) c = (0xff000000 | (((c & 0xfefefe) >>> 1) + 0x907050)) >>> 0;
          else if (md === 2) c = (0xff000000 | (((c & 0xfefefe) >>> 1) + 0x7f7f7f)) >>> 0;
          FB[off] = c; ZB[off] = ty;
        }
      }
    }
    function dot(wx, wy, wz, sz, col, lit) {
      const dx = wx - cx, dy = wy - cy;
      const ty = invDet * (-cpy * dx + cpx * dy); if (ty < 0.1) return;
      const tx = invDet * (cdy * dx - cdx * dy);
      const sx = VW / 2 * (1 + tx / ty), k = PROJ / ty, sy = HOR + (eye - wz) * k;
      const r = Math.min(5, Math.max(0.5, sz * k));
      const x0 = Math.max(0, Math.round(sx - r)), x1 = Math.min(VW - 1, Math.round(sx + r) - 1 + (r < 1 ? 1 : 0));
      const y0 = Math.max(0, Math.round(sy - r)), y1 = Math.min(VH - 1, Math.round(sy + r) - 1 + (r < 1 ? 1 : 0));
      const c = lit >= 0 ? scl(col, clamp(lit * (1 - ty * fogK), 0.08, 1)) : col;
      for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) { const o = Y * VW + X; if (ZB[o] > ty - 0.05) { FB[o] = c; ZB[o] = ty; } }
    }
    function drawPanes() {
      for (let k = 0; k < panes.length; k += 6) {
        const x = panes[k], a = panes[k + 1], b = panes[k + 2], d = panes[k + 3], paper = panes[k + 4], u = panes[k + 5];
        const hl = (u * 7 + x * 0.0) % 1 < 0.12;
        for (let y = a; y <= b; y++) {
          const o = y * VW + x; if (ZB[o] < d) continue;
          const c = FB[o];
          if (paper) { FB[o] = ((u * 4) % 1 < 0.09 || (((eye - (y + 0.5 - HOR) * d / PROJ) * 3 + 9) % 1) < 0.07) ? 0xff1c2c3c : (0xff000000 | ((((c & 0xfcfcfc) >>> 2) + 0x9cc4d8) & 0xffffff)) >>> 0; }
          else FB[o] = hl ? (0xff000000 | (((c & 0xfefefe) >>> 1) + 0x707060)) >>> 0 : (0xff000000 | (((c & 0xfefefe) >>> 1) + 0x483820)) >>> 0;
          ZB[o] = d;
        }
      }
    }
    function drawWorld(px, py, pz, ang, ctx) {
      if (!img) { img = ctx.createImageData(VW, VH); FB = new Uint32Array(img.data.buffer); }
      cx = px; cy = py; eye = pz; cdx = Math.cos(ang); cdy = Math.sin(ang); cpx = -cdy * K; cpy = cdx * K;
      invDet = 1 / (cpx * cdy - cdx * cpy);
      animOff = animT * 0.25;
      flash = flashW * 10;
      const sw = skyP ? skyP.w : 1;
      for (let x = 0; x < VW; x++) { const a = ang + Math.atan((2 * (x + .5) / VW - 1) * K); let u = Math.floor(a / TAU * sw * 2) % sw; if (u < 0) u += sw; skyU[x] = u; }
      panes.length = 0;
      const ci = idx(px, py);
      if (ci < 0 || S[ci] === 1) { FB.fill(0xff000000); ZB.fill(1e4); }
      else for (let x = 0; x < VW; x++) column(x);
      // sprites
      for (const it of items) {
        const D = it.def; const sp = SPR[D.spr]; const i = idx(it.x, it.y);
        billboard(sp, it.x, it.y, it.z + 0.04 + Math.sin(animT * 3 + it.bob) * 0.03 * (D.bob === false ? 0 : 1), D.scale || 1, D.full ? 2 : LT[Math.max(0, i)], 0, 0);
      }
      for (const d of decos) {
        if (d === pl.mount && d.def.mount === 'cart' && mode !== 'attract') continue;
        if (d === pl.mount && d.def.mount === 'turret') continue;
        const D = d.def; let s = d.broken && D.broke ? D.broke : D.spr;
        if (D.anim && !d.broken) s = D.anim[((animT * 4) | 0) % D.anim.length];
        billboard(SPR[s], d.x, d.y, d.z, D.scale || 1, D.full ? 2 : LT[Math.max(0, idx(d.x, d.y))], 0, 0);
      }
      for (const e of enemies) {
        const D = e.def, fr = D.frames; let s;
        if (e.dead) s = e.dieT < 0.3 ? fr.die : fr.dead;
        else if (e.frozen > 0 || e.painT > 0) s = fr.pain || fr.walk[0];
        else if (e.atkT > 0) s = fr.atk;
        else s = e.awake ? fr.walk[((e.animT * (D.animRate || 4)) | 0) % fr.walk.length] : (fr.idle || fr.walk[0]);
        const sc = (D.scale || 1) * (e.shrunk > 0 ? 0.35 : 1);
        const fade = e.dead ? clamp((e.dieT - 1.2) / 1.2, 0, 1) : 0;
        const bobz = D.fly && !e.dead ? Math.sin(animT * 3 + e.id) * 0.04 : 0;
        billboard(SPR[s], e.x, e.y, e.z + bobz, sc, D.full ? 2 : Math.max(0.3, LT[Math.max(0, idx(e.x, e.y))]), e.frozen > 0 ? 1 : (e.flash > 0 ? 2 : 0), fade);
      }
      for (const p of projs) {
        const D = p.def; const i = idx(p.x, p.y);
        if (D.spr) { let s = D.spr; if (D.spin) s = D.spin[((p.t * 16) | 0) % D.spin.length]; billboard(SPR[s], p.x, p.y, p.z - (SPR[s] ? SPR[s].h / SPR[s].ppu * (D.scale || 1) / 2 : 0), D.scale || 1, D.full ? 2 : LT[Math.max(0, i)], 0, 0); }
        else dot(p.x, p.y, p.z, D.size || 0.05, D.col || rgb(255, 255, 160), -1);
        if (p.armed && D.det && (frameN & 4)) dot(p.x, p.y, p.z + .1, .03, rgb(255, 40, 40), -1);
      }
      for (const m of mines) {
        billboard(SPR[G.mineSpr], m.x, m.y, m.z - 0.06, 1, 2, 0, 0);
        if (m.arm <= 0 && !m.boom) {
          const n = Math.ceil(Math.hypot(m.ex - m.x, m.ey - m.y) / 0.12);
          for (let k = 1; k < n; k++) dot(m.x + (m.ex - m.x) * k / n, m.y + (m.ey - m.y) * k / n, m.z, 0.012, rgb(255, 30, 30), -1);
        }
      }
      for (const p of parts) dot(p.x, p.y, p.z, p.sz, p.col, p.full ? -1 : Math.max(0.4, LT[Math.max(0, idx(p.x, p.y))]));
      drawPanes();
    }
    function drawWeapon() {
      const lit = clamp(LT[Math.max(0, idx(pl.x, pl.y))] + flashW, 0.35, 1.2);
      let name, ox = 0, oy = 0;
      if (pl.mount) { name = pl.wanim > 0 ? pl.mount.def.view + '_f' : pl.mount.def.view; oy = pl.wanim > 0 ? 2 : 0; }
      else {
        const w = WEAP[pl.cur]; name = pl.wanim > 0 && SPR[w.view + '_f'] ? w.view + '_f' : w.view;
        if (w.kind === 'pipe' && pl.pipes > 0 && SPR[G.detView]) name = G.detView;
        ox = Math.cos(pl.bobA) * 5 * Math.abs(pl.bob); oy = Math.abs(Math.sin(pl.bobA)) * 4 * Math.abs(pl.bob) + (pl.wanim > 0 ? (w.kick || 2) : 0);
        if (pl.swT > 0) oy += (pl.swT > 0.15 ? (0.3 - pl.swT) : pl.swT) * 260;
      }
      const sp = SPR[name]; if (!sp) return;
      const arr = sp.sh[clamp((lit * 15) | 0, 0, 15)];
      const x0 = ((VW - sp.w) / 2 + (sp.ox || 0) + ox) | 0, y0 = (VH - sp.h + oy + 1) | 0;
      for (let y = 0; y < sp.h; y++) { const Y = y0 + y; if (Y < 0 || Y >= VH) continue; for (let x = 0; x < sp.w; x++) { const X = x0 + x; if (X < 0 || X >= VW) continue; const c = arr[y * sp.w + x]; if (c) FB[Y * VW + X] = c; } }
    }

    // ---------- HUD ----------
    const HC = G.hud;
    function drawHUD(ctx) {
      ctx.fillStyle = HC.bg; ctx.fillRect(0, VH, W, H - VH);
      ctx.fillStyle = HC.hi; ctx.fillRect(0, VH, W, 1);
      ctx.fillStyle = HC.lo; ctx.fillRect(0, H - 1, W, 1);
      const box = (x, w, label) => { ctx.fillStyle = HC.panel; ctx.fillRect(x, VH + 3, w, 26); ctx.fillStyle = HC.lo; ctx.fillRect(x, VH + 3, w, 1); ctx.fillStyle = HC.hi; ctx.fillRect(x, VH + 28, w, 1); text(ctx, label, x + 2, VH + 4, HC.label, 1); };
      box(2, 44, 'HEALTH'); text(ctx, String(Math.max(0, Math.ceil(pl.hp))).padStart(3, ' '), 6, VH + 13, pl.hp > 25 ? HC.num : '#ff4040', 2);
      box(48, 44, 'ARMOR'); text(ctx, String(Math.ceil(pl.armor)).padStart(3, ' '), 52, VH + 13, HC.num, 2);
      box(94, 56, pl.mount ? (pl.mount.def.mount === 'cart' ? 'VEHICLE' : 'TURRET') : WEAP[pl.cur].short);
      if (pl.mount) text(ctx, pl.mount.def.mount === 'cart' ? String(Math.max(0, Math.ceil(pl.mount.vhp))) : '---', 98, VH + 13, HC.num, 2);
      else { const w = WEAP[pl.cur]; text(ctx, w.ammo ? String(pl.ammo[w.ammo]).padStart(3, ' ') : '---', 98, VH + 13, HC.num, 2); }
      // weapon slots
      ctx.fillStyle = HC.panel; ctx.fillRect(152, VH + 3, 60, 26);
      for (let i = 0; i < WEAP.length; i++) {
        const x = 155 + (i % 5) * 11, y = VH + 6 + ((i / 5) | 0) * 11;
        const col = !pl.has[i] ? HC.off : i === pl.cur ? '#ffffff' : hasAmmo(i) ? HC.num : HC.label;
        text(ctx, String(i + 1), x, y, col, 1);
        if (i === pl.cur && !pl.mount) { ctx.fillStyle = HC.num; ctx.fillRect(x - 1, y + 8, 7, 1); }
      }
      // keys
      ctx.fillStyle = HC.panel; ctx.fillRect(214, VH + 3, 14, 26);
      const kc = { r: '#ff2020', b: '#3070ff', y: '#ffe020' };
      ['r', 'b', 'y'].forEach((k, n) => { ctx.fillStyle = pl.keys[k] ? kc[k] : '#202020'; ctx.fillRect(217, VH + 6 + n * 8, 8, 6); });
      // inventory
      ctx.fillStyle = HC.panel; ctx.fillRect(230, VH + 3, 36, 26);
      let iy = VH + 5;
      if (G.jetpack && pl.jet > 0) { text(ctx, 'JET', 232, iy, HC.label, 1); ctx.fillStyle = '#ff9020'; ctx.fillRect(252, iy + 1, Math.ceil(pl.jet / 100 * 12), 5); iy += 8; }
      if (pl.boost > 0) { text(ctx, G.boostShort || 'NRG', 232, iy, '#40ff60', 1); text(ctx, String(Math.ceil(pl.boost)), 264, iy, '#40ff60', 1, 'right'); iy += 8; }
      if (pl.focus > 0) { text(ctx, G.focusShort || 'PWR', 232, iy, '#ff60ff', 1); text(ctx, String(Math.ceil(pl.focus)), 264, iy, '#ff60ff', 1, 'right'); iy += 8; }
      if (iy === VH + 5) text(ctx, 'L' + (levelIdx + 1), 248, VH + 12, HC.label, 1, 'center');
      // score & lives
      ctx.fillStyle = HC.panel; ctx.fillRect(268, VH + 3, 50, 26);
      text(ctx, String(score).padStart(7, '0'), 315, VH + 6, HC.num, 1, 'right');
      text(ctx, G.livesLabel + ' ' + lives, 315, VH + 18, HC.label, 1, 'right');
      // top messages
      if (msgT > 0) textS(ctx, msg, 3, 3, '#ffffff', 1);
      if (quipT > 0) { textS(ctx, G.heroShort + ': "' + quip + '"', 160, 14, HC.quip, 1, 'center'); }
      if (bannerT > 0) { textS(ctx, 'LEVEL ' + (levelIdx + 1), 160, 50, HC.num, 1, 'center'); textS(ctx, banner, 160, 60, '#ffffff', 2, 'center'); }
      if (boss && !boss.dead && boss.awake) {
        ctx.fillStyle = '#000'; ctx.fillRect(80, 26, 160, 6); ctx.fillStyle = '#d02020'; ctx.fillRect(81, 27, Math.max(0, 158 * boss.hp / boss.def.hp), 4);
        textS(ctx, G.bossName, 160, 34, '#ff8080', 1, 'center');
      }
      // crosshair
      if (!pl.dead) { ctx.fillStyle = HC.cross; ctx.fillRect(159, 82, 2, 1); ctx.fillRect(159, 85, 2, 1); ctx.fillRect(157, 83, 1, 2); ctx.fillRect(162, 83, 1, 2); }
    }
    function drawMap(ctx) {
      const sc = Math.max(2, Math.min(Math.floor(300 / MW), Math.floor(150 / MH)));
      const ox = ((W - MW * sc) / 2) | 0, oy = ((VH - MH * sc) / 2) | 0;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(ox - 2, oy - 2, MW * sc + 4, MH * sc + 4);
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const i = y * MW + x; if (!SEEN[i] && !nearSeen(x, y)) continue;
        let c = null;
        if (S[i] === 1) c = (FG[i] & F_EXIT) ? '#ff40ff' : '#8a8a8a';
        else if (S[i] === 2) c = '#60c0ff';
        else if (doorAt[i] >= 0) { const k = doors[doorAt[i]].kind; c = k === 'r' ? '#ff3030' : k === 'b' ? '#3060ff' : k === 'y' ? '#ffe030' : k === 's' ? '#8a8a8a' : '#c08040'; }
        else if (liftAt[i] >= 0) c = '#40c040';
        else c = FL[i] > 0.3 ? '#3a3a50' : '#222230';
        ctx.fillStyle = c; ctx.fillRect(ox + x * sc, oy + y * sc, sc, sc);
      }
      ctx.fillStyle = '#ffff40'; ctx.fillRect(ox + pl.x * sc - 1, oy + pl.y * sc - 1, 3, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(ox + (pl.x + Math.cos(pl.ang) * 0.8) * sc, oy + (pl.y + Math.sin(pl.ang) * 0.8) * sc, 1, 1);
      text(ctx, 'MAP', ox, oy - 1 - 8 < 0 ? oy + 2 : oy - 9, '#fff', 1);
    }
    function nearSeen(x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = idx(x + dx, y + dy); if (j >= 0 && SEEN[j]) return true; } return false; }

    function render(ctx) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (mode === 'attract') { renderAttract(ctx); return; }
      if (mode === 'story') { renderStory(ctx); return; }
      if (mode === 'victory') { renderText(ctx, G.ending, '#ffe060', 'MISSION ACCOMPLISHED'); text(ctx, 'FINAL SCORE ' + score, 160, 178, '#fff', 1, 'center'); return; }
      if (mode === 'over') { renderGame(ctx); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, VH); textS(ctx, 'GAME OVER', 160, 70, '#ff3030', 3, 'center'); text(ctx, 'SCORE ' + score, 160, 100, '#fff', 1, 'center'); return; }
      renderGame(ctx);
      if (mode === 'tally') renderTally(ctx);
    }
    function renderGame(ctx) {
      const sh = shake > 0 ? (rnd() - .5) * shake * 0.3 : 0;
      drawWorld(pl.x, pl.y, pl.z + pl.viewZ + pl.bob * 0.025 + sh * 0.1, pl.ang + sh * 0.05, ctx);
      if (!pl.dead) drawWeapon();
      ctx.putImageData(img, 0, 0);
      if (flashR > 0) { ctx.fillStyle = 'rgba(255,0,0,' + Math.min(0.55, flashR) + ')'; ctx.fillRect(0, 0, W, VH); }
      if (flashG > 0) { ctx.fillStyle = 'rgba(255,220,80,' + Math.min(0.3, flashG) + ')'; ctx.fillRect(0, 0, W, VH); }
      if (pl.dead) { ctx.fillStyle = 'rgba(160,0,0,' + Math.min(0.5, pl.deadT * 0.3) + ')'; ctx.fillRect(0, 0, W, VH); }
      const ci = idx(pl.x, pl.y);
      if (ci >= 0 && (FG[ci] & F_WATER) && pl.z + pl.viewZ < FL[ci] + 0.3) { ctx.fillStyle = 'rgba(30,80,200,0.25)'; ctx.fillRect(0, 0, W, VH); }
      if (pl.boost > 0) { ctx.fillStyle = 'rgba(60,255,90,0.07)'; ctx.fillRect(0, 0, W, VH); }
      if (mapOn) drawMap(ctx);
      drawHUD(ctx);
      if (pl.dead && pl.deadT > 1) textS(ctx, lives > 1 ? 'TRY AGAIN!' : 'LAST LIFE LOST', 160, 70, '#ffffff', 2, 'center');
    }
    function renderTally(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(20, 24, 280, 130);
      ctx.fillStyle = HC.num; ctx.fillRect(20, 24, 280, 1); ctx.fillRect(20, 153, 280, 1);
      textS(ctx, 'LEVEL COMPLETE', 160, 32, HC.num, 2, 'center');
      text(ctx, level.name, 160, 52, '#ffffff', 1, 'center');
      const rows = [['KILLS', kills + ' / ' + killsTotal + '  ' + (killsTotal ? Math.round(kills / killsTotal * 100) : 100) + '%'], ['SECRETS', secretsFound + ' / ' + secretsTotal], ['TIME', Math.floor(levelTime / 60) + ':' + String(Math.floor(levelTime % 60)).padStart(2, '0')], ['SCORE', String(score)]];
      rows.forEach((r, n) => { if (modeT > 0.3 * (n + 1)) { text(ctx, r[0], 70, 70 + n * 14, HC.label, 1); text(ctx, r[1], 250, 70 + n * 14, '#ffffff', 1, 'right'); } });
      if (modeT > 1.2 && ((modeT * 3) | 0) % 2 === 0) text(ctx, 'PRESS FIRE TO CONTINUE', 160, 140, HC.quip, 1, 'center');
    }
    function renderText(ctx, lines, col, head) {
      G.backdrop(ctx, animT, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(10, 20, 300, 150);
      if (head) textS(ctx, head, 160, 28, col, 2, 'center');
      lines.forEach((l, n) => text(ctx, l, 160, 52 + n * 11, '#e0e0e0', 1, 'center'));
    }
    function renderStory(ctx) {
      animT += 1 / 60;
      const p = G.story[Math.min(storyPage, G.story.length - 1)];
      renderText(ctx, p.lines, HC.num, p.head);
      if (((modeT * 3) | 0) % 2 === 0) text(ctx, 'PRESS FIRE', 160, 176, HC.quip, 1, 'center');
    }
    function renderAttract(ctx) {
      animT += 1 / 60;
      if (level) {
        const a = startA + Math.sin(attractA) * 1.2 + attractA * 0.3;
        drawWorld(startX, startY, FL[idx(startX, startY)] + EYE, a, ctx);
        ctx.putImageData(img, 0, 0);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
      G.logo(ctx, animT, text, textS);
      const page = ((modeT / 6) | 0) % 3;
      if (page === 0) {
        text(ctx, G.tagline, 160, 96, '#ffffff', 1, 'center');
        text(ctx, 'STARRING ' + G.heroName, 160, 110, HC.quip, 1, 'center');
      } else if (page === 1) {
        G.controlsText.forEach((l, n) => text(ctx, l, 160, 88 + n * 10, n ? '#d0d0d0' : HC.num, 1, 'center'));
      } else {
        text(ctx, 'HIGH SCORE', 160, 96, HC.num, 1, 'center'); text(ctx, String(hiScore).padStart(7, '0'), 160, 108, '#ffffff', 2, 'center');
      }
      const blink = ((modeT * 2) | 0) % 2 === 0;
      if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', 160, 156, '#ffffff', 1, 'center'); }
      else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', 160, 156, '#ffffff', 1, 'center'); }
      else if (blink) textS(ctx, 'PUSH START', 160, 156, HC.num, 1, 'center');
      text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, 190, '#aaaaaa', 1);
      text(ctx, '\u00a9 ' + G.year + ' ' + G.maker, 316, 190, '#888888', 1, 'right');
    }

    return {
      update, render, destroy() { },
      _dbg: {
        get mode() { return mode; }, set mode(v) { mode = v; }, get pl() { return pl; }, get level() { return levelIdx; },
        get grid() { return { MW, MH, S, FL, CE, FG, doorAt, liftAt, doors, lifts }; }, get enemies() { return enemies; }, get items() { return items; }, get decos() { return decos; },
        get boss() { return boss; }, set god(v) { god = v; }, set infAmmo(v) { infAmmo = v; }, start(n) { pl = newPlayer(); lives = 3; score = 0; startLevel(n, true); },
        get kills() { return [kills, killsTotal, secretsFound, secretsTotal]; }, get time() { return levelTime; }, get lives() { return lives; }, give(i) { pl.has[i] = true; }, select(i) { pl.cur = i; }, idx, floorAt, los, get dmg() { return dmgLog; }, get startPos() { return [startX, startY]; }
      }
    };
  }

  const DUKE_LEVELS = [
    {"name": "ROOFTOP DROP", "map": ["FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "F777777777:,,,,,,,,:FFFFFFFFFFFFFFFF", "F7P777B777:,,,,,,,,|%%%%%%%%%%%%%%%%", "F7777777i7|,,,,,,,,:Ws____V%.////00N", "F77A777777:,,m,,,,,:W______%./v//0e%", "F7777n7777:,,,,,t,,:W__t___%.////00X", "F77777h777:,,,,,,,,:%______K.////t0%", "F777777777:,,,,,,,,|D______K.////00N", "FFFFFFFFFF:,,,v,,,,:D______%.////00N", "F%%%%%%%%F|,,,,,,,,:%____t_%i////t0N", "Fs...s..VF:,,,,,,,,:W_h____%.////00%", "F.t......F:,,,m,,,,:%%%%%%%%%%%%%%%%", "F........FH,,,,,,,,:FFFFFFFFFFFFFFFF", "F...i....D:,,,,t,,,:FFFFFFFFFFFFFFFF", "F%%%%%..%F:,,,,,,,,HFFFFFFFFFFFFFFFF", "FdddL...hF:,,,,,,B,:FFFFFFFFFFFFFFFF", "Fdrd%..t.F:,,,,,,,,:FFFFFFFFFFFFFFFF", "FdqdD.k..F|,,m,,,,,:FFFFFFFFFFFFFFFF", "Fedd%..B.F:,,,,,t,,:FFFFFFFFFFFFFFFF", "F%%%%%%C%F:,k,,,,,,|FFFFFFFFFFFFFFFF", "F%%%%$E*%F:,,,,,,,,:FFFFFFFFFFFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"], "sky": "city", "ang": 0, "amb": 1.0, "fog": 0.05, "legend": {"0": {"f": -0.5, "c": 1.3, "ft": "carpet"}, "/": {"ramp": 1, "ft": "carpet"}}}, {"name": "NEON STRIP", "map": ["FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "FNNNNNNNNNNNN%%%%%%%%%%%%%%%%%%%%%%%%%%F", "FNhddddddddVN%i77777J7777v7%44444444444F", "FNtdddddddddN%777B7777t77b7U44444444t44F", "FNdTdTdTdTddN%77777t7777777%44t44444444F", "FNdTdTdTdTddN%%//%%%%%%%%%%%44444444444F", "FNddddddddddN%%//%%%%%.$M.%%444NNNNN444F", "FNddtdidddkdN%%//%%%%%..ol%%44444444444F", "FNddddddddddN%%//%%%%%C%%%%%444444A4444X", "FNdTdTdTdTddN%,,,,,,,B,,,,,%44s44444444F", "FNdTdTdTdTddN%,,,,,,,t,,,,,%44444t44444F", "FNddddddkdddN%,,,,m,,,,,,,,%44444444444F", "FNedddtdddpdN%,,,,,,,,,m,,,%4h4444444j4F", "FNddddddddddN%B,,,,,k,,,,t,%44444444444F", "FNNNNNDNLNNNN%,,,,,,,,,,,,,%WWWWWWWWWWWF", "F:::|::::::H:::|::::::::::|:::::::|::::F", "F,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,F", "F,,,,,,,,,,,,,,,,,,,t,,,,,,,,,,,,,,m,,,F", "F,,,,,,,,m,,,,,,,,,,,,,,,,,,,,,,v,,,,,,F", "F,P,,,,,,,,,,,,,,,,,,,,,,,,,,m,,,,,,,,,F", "F,,,,,,,,,,,t,,,,,,,,,,,,,,t,,,,,,,,k,,F", "F,,,,,,,,,,,,,,,,k,,,,,,,,,,,,,,,e,,,,,F", "F::::::|::::::::::|::::::::::|H::::::|:F", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"], "sky": "dusk", "ang": 0, "amb": 1.0, "fog": 0.04, "legend": {"4": {"f": 1.0, "c": 2.4, "ft": "carpet"}, "W": {"s": 2, "f": 1.0, "c": 2.4}, "/": {"ramp": 1, "ft": "asphalt"}}}, {"name": "SUBWAY SIEGE", "map": ["%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%|:::::::|%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%,P,,,t,,,%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%,,,,,,,m,%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%,,,,,,,,,%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%%%1111%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%%%2222%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%%%3333%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%4444444444%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%44e4444t44%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%4t4444444444444444444444t44e444444v44%%", "%4444z444444444t444444444444444t444444%%", "%44444444k444444444444B444444444444444%%", "%444WWWW444%000000===D======000k0000//%%", "%44k4444444%00h000=--------=00000y00//%%", "%4444444i44%000000======Y===00i000k000%%", "%V444444444%4444444444444444B444444444%%", "%4444t44444%4444t44444t4444444444g4444%%", "%4h44444444%4444444h444444444444444444%%", "%444444444V%%S%%%%%%%%%%%%%%%LD%%%%%%%%%", "%4444444444%44444%%%%%%%%%dddddddddddd%%", "%%%%%%%%%%%%4$4x4%%%%%%%%%ddddddddtddd%%", "%%%%%%%%%%%%44A44%%%%%%%%%ddtdddddddddX%", "%%%%%%%%%%%%c4444%%%%%%%%%dddddddddddd%%", "%%%%%%%%%%%%%%%%%%%%%%%%%%doddddddddhd%%", "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%"], "sky": "city", "ang": 90, "amb": 0.9, "fog": 0.07, "legend": {"1": {"f": -0.25, "c": 1.3, "ft": "concrete"}, "2": {"f": -0.5, "c": 1.3, "ft": "concrete"}, "3": {"f": -0.75, "c": 1.3, "ft": "concrete"}, "4": {"f": -1.0, "c": 0.8, "ft": "floor"}, "0": {"f": -1.5, "c": 0.8, "ft": "rail", "wt": "concrete"}, "-": {"f": -1.0, "c": 0.5, "ft": "grate", "ct": "metal"}, "W": {"s": 2, "f": -1.0, "c": 0.8}, "/": {"ramp": 1, "ft": "concrete"}, "d": {"f": -1.0, "c": 0.8, "dark": 1, "l": 0.15, "lon": 1}}}, {"name": "WATER WORKS", "map": ["========================================", "============================M$*=========", "============================666=========", "=======4444t444v4444i44444444r4=========", "=======44444444444444444t444444=========", "=======.I....................I.=========", "=======...~~~~~~~~~~~~~~~~~~...=========", "=======...~~~~~~~~~~~~~~~~~~...=========", "=======..t~~~~~~~~~~~~~~j~~~...=......o=", "=======...~~~~~~~~~~~~~~~~~~t..=.t.....=", "=__h__=...~~~~~k~~~~~~~~~~~~...=..TTT..=", "=_____=...~~~~~~~o...~~~~~~~...=.......=", "=_P___D...~~~~~~~.n..~~~~~~~...K...g.b.=", "=_____=...~~~~~~~..B.~~~~~~~...=.......=", "=___i_=...~~~~~~~...l~~~~~~~...=..TTT..=", "=======...~~~~~~~~~~~~~~~~~~...=.A...t.=", "=======...~~~~~~~~~~~~k~~~~~...=.......=", "=======...~~~j~~~~~~~~~~~~~~.h.=========", "=======...~~~~~~~~~~~~~~~~~~...=========", "=======...~~~~~~~~~~~~~~~~~~...=========", "=======.t.................e....=========", "=======\"\"\"\"\"\"\"\"\"\"\"..\"\"\"\"\"\"\"\"\"\"\"=========", "=======.....B..................=========", "==================U=====================", "============..........t...==============", "============..t...........X=============", "============............h.==============", "========================================"], "sky": "city", "ang": 0, "amb": 0.95, "fog": 0.06, "legend": {".": {"f": 0, "c": 2.6, "ft": "grate", "ct": "metal"}, "~": {"f": -0.3, "c": 2.6, "ft": "water", "water": 1, "ct": "metal"}, "4": {"f": 1.0, "c": 2.6, "ft": "grate", "ct": "metal"}, "6": {"f": 1.5, "c": 2.6, "ft": "grate", "ct": "metal"}, "_": {"f": 0, "c": 1.3, "ft": "floor"}, "\"": {"f": -0.15, "c": 2.6, "ft": "slime", "hurt": 1, "ct": "metal"}}}, {"name": "MALL MAYHEM", "map": ["%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", "%%%44444%4444444444444t4444444444%444444%%", "%%%4y444D44444t444444444444444i44%444x44%%", "%%%444t4%44e4444444B4444444v44444D4k4444%%", "%%%c4444%444444444444444444444444%4444M4%%", "%%%%%%%%%```//WWWWWWWWWWWWWW//```%%%%%%%%%", "%%%%%%%%%```//``````````````//```%%%%%%%%%", "%%V.....%```//``````````````//```%......%%", "%%....t.W```````````v````````````W.t....%%", "%%..f...D`s````t```````````````s`D...A..%%", "%%......W`````````````````t``````W......%%", "%%.u....%````````````````````````%....i.%%", "%%%%%%%%%`````````~~~~~~`````````%%%%%%%%%", "%%%%%%%%%`````````~~~~~~`````````%%%%%%%%%", "%%dddddd%`````````~~TT~~`````````%......%%", "%%dhddddL`````````~~~~~~`````````%.g....%%", "%%dddded%`````````~~~~~~`````````%......%%", "%%ddddddD```t````````````````````Y..h..X%%", "%%dkdddd%````````````````````t```%......%%", "%%dddkdd%`s`````j``````````````s`%...t..%%", "%%ddBddd%````````````````k```````%......%%", "%%%%C%%%%```````````h````````````%%%%%%%%%", "%%....*%%``````s``````````s``````%%%%%%%%%", "%%.$.E.%%````````````````````````%%%%%%%%%", "%%p....%%%%%%%%%%%``````%%%%%%%%%%%%%%%%%%", "%%%%%%%%%%%%%%%%%%``P```%%%%%%%%%%%%%%%%%%", "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%"], "sky": "city", "ang": 270, "amb": 1.0, "fog": 0.04, "legend": {"`": {"f": 0, "c": 3.0, "ft": "marble", "ct": "ceil"}, "4": {"f": 1.0, "c": 3.0, "ft": "marble", "ct": "ceil"}, "/": {"ramp": 1, "ft": "grate"}, "W": {"s": 2, "f": 0, "c": 1.5}, "~": {"f": -0.3, "c": 3, "ft": "water", "water": 1, "wt": "marble"}, "d": {"f": 0, "c": 1.3, "dark": 1, "l": 0.12, "lon": 1, "ft": "wood"}}}, {"name": "SPACEPORT", "map": ["============================================", "============================================", "=,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,$M,=", "=,,,,,,,,,,,,,,,,,,k,,,,,,,,,,,,,,,,,,,,9*,=", "=================,,,,,,,,,,,,,,,,,,,,=======", "==..............=,,,,,,,,,,,,,,,,,,,,=444o==", "==.h..........z.=,,,B:::::::::::::B,,=4h44==", "==..............=,,,:::::::/:::::::,,=4444==", "==...========t..=,,,::t::::/:::::::,,=4444==", "==B..=--TXT-=...=,,,:::::::/::::t::,,=TT44==", "==..t=------=...=,,,::::7777777::::,,=4444==", "==...=------=...=,,,::::77777v7::::,,=44b4==", "==...=-t----=...=,,,::::77r7777::::,,=4444==", "==.P.=------=...D,,,::::7777J77::::,,K..I4==", "==...=----g-=...D,,,::::7777777::::,,=4444==", "==...=------=...=,,,::::7o77777::::,,=t44t==", "==...=------=t..=,,,::::7777777::::,,=4444==", "==...===UU===...=,,,:::::::/:::::::,,=TT44==", "==..k...//......=,,,::g::::/:::::v:,,=4444==", "==......//...n..=,,,:::::::/:::::::,,=t444==", "==.e..........n.=,,,B:::::::::::::B,,=44A4==", "==..............=,,,,,,,,,,,,,,,,,,,,=4444==", "=================,,,,,,,,,,,,,,,,,,,,=======", "=,,,,,,,,,,,,,,,,,t,,,,,,,,,,,,,,,,k,,,,,,,=", "=,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=", "=,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=", "============================================", "============================================"], "sky": "space", "ang": 0, "amb": 1.0, "fog": 0.035, "legend": {".": {"f": 0, "c": 1.8, "ft": "grate", "ct": "metal"}, "-": {"f": 0.5, "c": 1.6, "ft": "metal", "ct": "tech"}, "/": {"ramp": 1, "ft": "grate"}, "4": {"f": 1.0, "c": 2.4, "ft": "grate", "ct": "metal"}, ",": {"f": 0, "c": 9, "sky": 1, "ft": "asphalt"}, ":": {"f": 0.1, "c": 9, "sky": 1, "ft": "lift"}, "7": {"f": 0.6, "c": 9, "sky": 1, "ft": "metal"}, "9": {"f": 2.0, "c": 9, "sky": 1, "ft": "metal"}}}, {"name": "HIVE SHIP", "map": ["&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&aaaZaaaavaaa&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&ataaaaaaaara&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&aaaaaavaaaaa&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&oaaaaaaaaaaa&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&D&&&&&&&&&&&&&&&&&&&&", "&&&&&&&&aaap&aaaaaaaaaaaaaa&&&&&&&&&&&&&", "&&&&&&&&a$aa&aZaaaajaaaaaZa&&&&&&&&&&&&&", "&&&&&&&&aaJaCaaaaaaaaaaaaaa&&&&&&&&&&&&&", "&&&&&&&&*aaa&Baa\"\"\"aa\"\"\"aaa&&&&&&&&&&&&&", "&&&&&&&&&&&&&aaa\"\"\"aa\"\"\"aaa&aaaaay&&&&&&", "&&&&&&&&&&&&&aaa\"\"\"ca\"\"\"taa&ajaaaa&ataa&", "&aaahaa&&&&&&aat\"\"\"aa\"\"\"aaa&aa\"\"aa&aaaa&", "&aPaaaaaaaaaaaaaaaaaaaaaaaaUaa\"\"aaYaaaaX", "&aaaaaaaaaaaaaaaaaaaaaaaaaa&aa\"\"ao&aaaa&", "&aaaaia&&&&&&aaa\"\"\"aa\"\"\"aka&aa\"\"aa&aata&", "&&&&&&&&&&&&&aaa\"\"\"ag\"\"\"aaa&aaaata&aaah&", "&&&&&&&&&&&&&aka\"\"\"au\"\"\"aaa&kaaaaa&&&&&&", "&&&&&&&&&&&&&aaa\"\"\"aa\"\"\"aaa&&&&&&&&&&&&&", "&&&&&&&&&&&&&aaaaaaaajaaaaa&&&&&&&&&&&&&", "&&&&&&&&&&&&&aZaaaaaaaaaaZa&&&&&&&&&&&&&", "&&&&&&&&&&&&&aaaaaaaaaaaaaa&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&&K&&&&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&aaaaaaaaaaga&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&aaaataaaaaaa&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&abaaaaaaataa&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&aaaaaaaMaaaa&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"], "sky": "space", "ang": 0, "amb": 0.9, "fog": 0.07, "legend": {"C": {"s": 1, "wt": "crack", "crack": 1, "under": "a"}, "\"": {"f": -0.15, "c": 1.6, "ft": "slime", "hurt": 1, "ct": "alienf"}}}, {"name": "OVERLORD'S THRONE", "map": ["&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "&&&44444````````````````````44444&&&", "&&&4o444````````````````````444c4&&&", "&&&444o4````v```````````v```44M44&&&", "&&&44444````````````````````44444&&&", "&&&``/````````````````````````/``&&&", "&&&``/``T`````````O````````T``/``&&&", "&&&``````````````````````````````&&&", "&&&``````````````````````````````&&&", "&&&```````\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"```````&&&", "&&&``````````````````````````````&&&", "&&&``````````````````````````````&&&", "&&&``````````````TT``````````````&&&", "&&&``````````````````````````````&&&", "&&&``````````````````````````````&&&", "&&&```````\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"```````&&&", "&&&``````````````````````````````&&&", "&&&``````````````````````````````&&&", "&&&``/``T``````````````````T``/``&&&", "&&&``/````````````````````````/``&&&", "&&&44444``t``````````````t``44444&&&", "&&&44444````````````````````4o444&&&", "&&&4h444````````````````````444A4&&&", "&&&44444````````````````````44444&&&", "&&&&&&&&&&&&&&&&&DD&&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&aaaa&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&haau&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&aaaa&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&oaao&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&aPaa&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&aaMa&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"], "sky": "space", "ang": 270, "amb": 1.0, "fog": 0.03, "boss": true, "mood": "bossLoop", "legend": {"`": {"f": 0, "c": 4.0, "ft": "alienf", "ct": "alien"}, "4": {"f": 1.0, "c": 4.0, "ft": "metal", "ct": "alien"}, "/": {"ramp": 1, "ft": "metal"}, "\"": {"f": -0.15, "c": 4, "ft": "slime", "hurt": 1, "ct": "alien"}}}];
  // =====================================================================
  //  "Duke Nukem 3D" (3D Realms, 1996) - our own take: MAX BRAVADO vs
  //  the Grex invasion of Neo Angeles. Original hero, aliens, art, maps.
  // =====================================================================
  function GAMEDEF() {
    const BLK = rgb(16, 16, 20), WHT = rgb(255, 255, 255);
    // ---------------- textures ----------------
    function buildTextures(A) {
      const R = mkRng(1996);
      A.tex('brick', texBricks(rgb(150, 62, 46), rgb(96, 90, 84), 16, 8, R));
      { const p = texNoise(rgb(128, 128, 122), R, .2); prect(p, 0, 31, 64, 2, rgb(92, 92, 90)); prect(p, 31, 0, 2, 32, rgb(92, 92, 90)); prect(p, 0, 0, 64, 1, rgb(150, 150, 146)); A.tex('concrete', p); }
      { const p = Pix(64, 64, rgb(96, 104, 116)); for (let y = 0; y < 64; y += 16) prect(p, 0, y, 64, 1, rgb(60, 66, 74)); for (let y = 0; y < 64; y += 16) for (let x = 4; x < 64; x += 12) pset(p, x, y + 3, rgb(170, 176, 190)); prect(p, 0, 15, 64, 1, rgb(140, 148, 160)); pnoise(p, R, .08); A.tex('metal', p); }
      { const p = Pix(64, 64, rgb(56, 58, 76)); pnoise(p, R, .15); for (let y = 6; y < 64; y += 16) for (let x = 4; x < 64; x += 15) { const lit = R() < 0.45; prect(p, x, y, 9, 8, lit ? rgb(255, 214, 110) : rgb(26, 30, 46)); prect(p, x, y + 8, 9, 1, rgb(90, 94, 110)); if (lit) prect(p, x + 4, y, 1, 8, rgb(200, 160, 80)); } A.tex('facade', p); }
      { const p = Pix(64, 64, rgb(40, 20, 60)); pnoise(p, R, .2); for (let k = 0; k < 7; k++) { const x0 = R() * 64, y0 = R() * 64; let x = x0, y = y0; for (let s = 0; s < 40; s++) { x += R() * 4 - 2; y += R() * 3; pset(p, x, y, rgb(60, 220, 190)); pset(p, x + 1, y, rgb(30, 140, 130)); } } for (let k = 0; k < 9; k++) pell(p, R() * 64, R() * 64, 3, 3, rgb(90, 40, 120)); A.tex('alien', p); }
      { const p = Pix(64, 64, rgb(26, 30, 34)); for (let y = 2; y < 64; y += 10) for (let x = 2; x < 64; x += 10) { prect(p, x, y, 8, 6, rgb(20, 60, 40)); pset(p, x + 2, y + 2, R() < .5 ? rgb(60, 255, 90) : rgb(255, 80, 60)); prect(p, x + 1, y + 7, 6, 1, rgb(50, 54, 60)); } prect(p, 8, 20, 22, 14, rgb(10, 40, 70)); for (let y = 22; y < 33; y += 2) prect(p, 10, y, 4 + R() * 16, 1, rgb(80, 200, 255)); A.tex('tech', p); }
      { const p = Pix(64, 64, rgb(20, 12, 30)); ptext(p, 'EAT', 14, 8, rgb(255, 60, 200)); ptext(p, 'EAT', 15, 8, rgb(255, 60, 200)); prect(p, 6, 22, 52, 1, rgb(80, 220, 255)); prect(p, 6, 44, 52, 1, rgb(80, 220, 255)); ptext(p, 'OPEN', 10, 30, rgb(255, 230, 60)); pline(p, 6, 52, 58, 58, rgb(255, 60, 200)); A.tex('neon', p, true); }
      { const p = Pix(64, 64, rgb(60, 60, 64)); prect(p, 8, 8, 48, 48, rgb(30, 30, 32)); prect(p, 10, 10, 44, 18, rgb(150, 20, 20)); ptext(p, 'EXIT', 21, 15, rgb(255, 240, 220)); pell(p, 32, 42, 9, 9, rgb(230, 30, 30)); pell(p, 30, 40, 4, 4, rgb(255, 140, 140)); A.tex('exit', p, true); }
      { const p = texNoise(rgb(128, 128, 122), R, .2); prect(p, 26, 22, 12, 20, rgb(220, 220, 210)); prect(p, 30, 26, 4, 7, rgb(60, 60, 60)); prect(p, 30, 26, 4, 3, rgb(240, 200, 60)); A.tex('switch', p); }
      { const p = Pix(64, 64, rgb(200, 30, 40)); prect(p, 4, 4, 40, 56, rgb(240, 240, 250)); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { prect(p, 7 + c * 9, 7 + r * 13, 6, 10, [rgb(230, 40, 40), rgb(60, 160, 230), rgb(250, 200, 40), rgb(80, 200, 80)][(r + c) % 4]); prect(p, 7 + c * 9, 7 + r * 13, 6, 2, rgb(200, 200, 200)); } prect(p, 48, 10, 10, 6, rgb(30, 30, 30)); prect(p, 48, 22, 10, 14, rgb(20, 20, 20)); ptext(p, 'FIZ', 46, 44, WHT); prect(p, 4, 58, 56, 2, rgb(120, 10, 20)); A.tex('vend', p, true); }
      { const p = texNoise(rgb(120, 120, 114), R, .2); let x = 10, y = 0; for (let s = 0; s < 70; s++) { x += R() * 3 - 1; y += 1; pset(p, x, y, rgb(40, 40, 40)); if (R() < .15) pline(p, x, y, x + R() * 20 - 10, y + R() * 10, rgb(50, 50, 50)); } ptext(p, '!', 44, 40, rgb(70, 70, 70)); A.tex('crack', p); }
      { const p = Pix(64, 64, rgb(110, 112, 118)); prect(p, 2, 2, 60, 60, rgb(90, 92, 98)); for (let y = 24; y < 40; y += 4) { for (let x = 0; x < 64; x += 8) prect(p, x + ((y / 4) & 1) * 4, y, 4, 4, rgb(230, 190, 20)); } prect(p, 30, 2, 4, 20, rgb(70, 72, 78)); prect(p, 30, 42, 4, 20, rgb(70, 72, 78)); pnoise(p, R, .06); A.tex('door', p); }
      for (const [n, c] of [['doorr', rgb(220, 30, 30)], ['doorb', rgb(40, 90, 240)], ['doory', rgb(240, 210, 30)]]) { const p = Pix(64, 64, rgb(100, 100, 106)); prect(p, 3, 3, 58, 58, rgb(80, 82, 88)); prect(p, 3, 26, 58, 12, c); prect(p, 26, 3, 12, 58, c); prect(p, 29, 29, 6, 6, rgb(20, 20, 20)); pnoise(p, R, .06); A.tex(n, p); }
      { const p = Pix(64, 64, rgb(150, 150, 150)); for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) prect(p, x, y, 16, 16, ((x + y) / 16) & 1 ? rgb(170, 170, 168) : rgb(120, 120, 124)); pnoise(p, R, .08); A.tex('floor', p); }
      { const p = Pix(64, 64, rgb(200, 198, 190)); for (let y = 0; y < 64; y += 32) prect(p, 0, y, 64, 1, rgb(150, 150, 146)); for (let x = 0; x < 64; x += 32) prect(p, x, 0, 1, 64, rgb(150, 150, 146)); pnoise(p, R, .1); prect(p, 22, 22, 20, 20, rgb(255, 252, 230)); prect(p, 22, 22, 20, 1, rgb(180, 180, 170)); A.tex('ceil', p); }
      A.tex('asphalt', texNoise(rgb(52, 52, 56), R, .35, 6, rgb(40, 40, 44)));
      { const p = texNoise(rgb(150, 148, 140), R, .15); prect(p, 0, 31, 64, 2, rgb(100, 98, 94)); prect(p, 31, 0, 2, 64, rgb(100, 98, 94)); A.tex('sidewalk', p); }
      A.tex('grass', texNoise(rgb(60, 120, 50), R, .5, 20, rgb(80, 150, 60)));
      { const p = Pix(64, 64, rgb(150, 30, 40)); for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) { pset(p, x + 4, y + 4, rgb(230, 190, 60)); pset(p, x, y, rgb(110, 20, 30)); } pnoise(p, R, .12); A.tex('carpet', p); }
      { const p = Pix(64, 64); for (let y = 0; y < 64; y += 8) { const c = rgb(140 + R() * 30, 90 + R() * 20, 50); prect(p, 0, y, 64, 8, c); prect(p, 0, y + 7, 64, 1, rgb(80, 50, 30)); prect(p, (R() * 64) | 0, y, 1, 8, rgb(80, 50, 30)); } pnoise(p, R, .15); A.tex('wood', p); }
      { const p = Pix(64, 64, rgb(225, 225, 232)); for (let k = 0; k < 6; k++) { let x = R() * 64, y = 0; for (let s = 0; s < 64; s++) { x += R() * 2 - 1; pset(p, x, y++, rgb(170, 170, 185)); } } prect(p, 0, 0, 64, 1, rgb(180, 180, 190)); prect(p, 0, 0, 1, 64, rgb(180, 180, 190)); A.tex('marble', p); }
      { const p = Pix(64, 64, rgb(40, 90, 170)); for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x++) pset(p, x, y + Math.sin(x / 64 * 6.283 * 2) * 2 + 3, rgb(100, 160, 230)); A.tex('water', p, false, 1); }
      { const p = Pix(64, 64, rgb(60, 170, 30)); for (let k = 0; k < 30; k++) pell(p, R() * 64, R() * 64, 1 + R() * 3, 1 + R() * 3, rgb(150, 240, 60)); A.tex('slime', p, true, 0.6); }
      { const p = Pix(64, 64, rgb(70, 50, 90)); for (let k = 0; k < 20; k++) pell(p, R() * 64, R() * 64, 3 + R() * 5, 2 + R() * 4, rgb(90 + R() * 30, 60, 120)); for (let k = 0; k < 30; k++) pset(p, R() * 64, R() * 64, rgb(80, 240, 200)); A.tex('alienf', p); }
      { const p = Pix(64, 64, rgb(60, 62, 66)); for (let y = 0; y < 64; y += 4) prect(p, 0, y, 64, 1, rgb(30, 32, 34)); for (let x = 0; x < 64; x += 4) prect(p, x, 0, 1, 64, rgb(36, 38, 40)); A.tex('grate', p); }
      A.tex('roof', texNoise(rgb(70, 66, 64), R, .5, 30, rgb(110, 100, 90)));
      A.tex('rock', texNoise(rgb(110, 90, 70), R, .45, 30, rgb(80, 64, 50)));
      { const p = Pix(64, 64, rgb(90, 92, 96)); prect(p, 0, 0, 64, 6, rgb(230, 190, 20)); prect(p, 0, 58, 64, 6, rgb(230, 190, 20)); for (let x = 0; x < 64; x += 12) { prect(p, x, 0, 6, 6, BLK); prect(p, x + 6, 58, 6, 6, BLK); } pnoise(p, R, .08); A.tex('lift', p); }
      { const p = Pix(64, 64, rgb(140, 100, 50)); prect(p, 2, 2, 60, 60, rgb(170, 125, 70)); pline(p, 2, 2, 62, 62, rgb(120, 85, 40), 3); pline(p, 62, 2, 2, 62, rgb(120, 85, 40), 3); pnoise(p, R, .12); A.tex('crate', p); }
      { const p = Pix(64, 64, rgb(30, 30, 36)); for (let y = 0; y < 64; y += 8) prect(p, 0, y, 64, 1, rgb(60, 60, 70)); pnoise(p, R, .2); A.tex('rail', p); }
      { const p = Pix(64, 64, rgb(240, 240, 235)); for (let y = 0; y < 64; y += 8) prect(p, 0, y, 64, 1, rgb(180, 190, 200)); for (let x = 0; x < 64; x += 8) prect(p, x, 0, 1, 64, rgb(180, 190, 200)); A.tex('tilew', p); }
      { const p = Pix(64, 64, rgb(20, 20, 26)); for (let k = 0; k < 40; k++) pset(p, R() * 64, R() * 64, rgb(200, 200, 255)); prect(p, 0, 28, 64, 8, rgb(255, 120, 30)); A.tex('screen', p, true); }
    }
    function sky(w, h, top, bot, R, skyline, extra) {
      const p = Pix(w, h);
      for (let y = 0; y < h; y++) { const c = mix(top, bot, Math.min(1, y / (h * 0.72))); for (let x = 0; x < w; x++) p.d[y * w + x] = c; }
      for (let k = 0; k < 120; k++) pset(p, R() * w, R() * h * 0.55, mix(rgb(255, 255, 255), top, R() * 0.6));
      if (extra) extra(p);
      if (skyline) {
        let x = 0; while (x < w) {
          const bw = 6 + R() * 14 | 0, bh = 14 + R() * 30 | 0, y0 = 104 - bh;
          prect(p, x, y0, bw, h - y0, skyline); for (let yy = y0 + 3; yy < 102; yy += 4) for (let xx = x + 2; xx < x + bw - 1; xx += 3) if (R() < 0.3) pset(p, xx, yy, rgb(255, 210, 120));
          x += bw;
        }
      }
      return p;
    }
    // ---------------- sprites ----------------
    function trooper(fr) {
      const p = Pix(40, 52), sk = rgb(110, 205, 90), skd = rgb(70, 150, 60), ar = rgb(130, 70, 170), ard = rgb(80, 44, 110), mt = rgb(176, 176, 186);
      if (fr === 5) { pell(p, 20, 47, 16, 4, ard); pell(p, 7, 45, 6, 5, sk); pell(p, 5, 44, 1.5, 1.5, BLK); prect(p, 30, 47, 8, 3, mt); poutline(p, BLK); return p; }
      const ln = fr === 4 ? 5 : 0, l = fr === 0 ? -3 : fr === 1 ? 3 : 0;
      prect(p, 14 + l, 36, 5, 13, ard); prect(p, 22 - l, 36, 5, 13, ard);
      prect(p, 13 + l, 48, 7, 3, rgb(50, 50, 60)); prect(p, 21 - l, 48, 7, 3, rgb(50, 50, 60));
      pell(p, 20 + ln / 2, 30, 10, 9, ar); prect(p, 12, 25, 16, 2, rgb(170, 110, 210)); prect(p, 11, 35, 18, 2, rgb(220, 190, 60));
      pell(p, 20 + ln, 14 + ln / 2, 11, 12, sk); pell(p, 20 + ln, 19 + ln / 2, 9, 6, skd); pell(p, 20 + ln, 14 + ln / 2, 9, 9, sk);
      if (fr === 3 || fr === 4) { pline(p, 13 + ln, 13, 18 + ln, 14, BLK, 2); pline(p, 22 + ln, 14, 27 + ln, 13, BLK, 2); }
      else { pell(p, 15 + ln, 13, 3, 4, BLK); pell(p, 25 + ln, 13, 3, 4, BLK); pset(p, 14 + ln, 11, WHT); pset(p, 24 + ln, 11, WHT); }
      pline(p, 20 + ln, 3, 20 + ln, 0, skd); pell(p, 20 + ln, 1, 2, 2, rgb(255, 230, 60));
      prect(p, 8, 26, 4, 9, sk); prect(p, 28, 26, 4, 6, sk); prect(p, 27, 29, 12, 4, mt); prect(p, 37, 29, 3, 4, rgb(60, 255, 120));
      if (fr === 2) { pell(p, 38, 31, 3, 4, rgb(180, 255, 160)); }
      poutline(p, BLK); return p;
    }
    function drone(fr) {
      const p = Pix(36, 26), m = rgb(150, 155, 170), md = rgb(90, 94, 110);
      if (fr === 5) { pell(p, 18, 22, 15, 3, md); pell(p, 14, 19, 5, 3, m); poutline(p, BLK); return p; }
      pell(p, 18, 15, 17, 5, m); pell(p, 18, 17, 17, 3, md); pell(p, 18, 10, 8, 6, rgb(120, 200, 230)); pell(p, 16, 8, 3, 2, rgb(220, 250, 255));
      pline(p, 18, 4, 18, 0, md); pset(p, 18, 0, fr & 1 ? rgb(255, 60, 60) : rgb(255, 240, 80));
      for (let k = 0; k < 5; k++) pset(p, 5 + k * 6.5, 15, ((k + fr) & 1) ? rgb(255, 220, 40) : rgb(60, 255, 120));
      pell(p, 18, 20, 4, 3, fr === 2 ? rgb(255, 255, 200) : rgb(230, 30, 30));
      if (fr === 4) pline(p, 4, 6, 32, 22, rgb(60, 60, 60), 2);
      poutline(p, BLK); return p;
    }
    function skitter(fr) {
      const p = Pix(44, 26), b = rgb(230, 130, 40), bd = rgb(160, 80, 20);
      if (fr === 5) { pell(p, 22, 22, 16, 4, bd); for (let k = 0; k < 6; k++) pline(p, 8 + k * 6, 21, 6 + k * 7, 25, BLK); poutline(p, BLK); return p; }
      for (let k = 0; k < 3; k++) { const o = ((k + fr) & 1) ? 3 : -3; pline(p, 16 + k * 6, 16, 8 + k * 6 + o, 25, BLK, 2); pline(p, 22 + k * 4, 16, 30 + k * 5 - o, 25, BLK, 2); }
      pell(p, 24, 14, 15, 8, b); pell(p, 24, 11, 12, 4, rgb(255, 180, 80));
      for (let k = 0; k < 4; k++) prect(p, 14 + k * 6, 9, 2, 10, bd);
      pell(p, 9, 15, 7, 6, bd); pell(p, 6, 12, 2, 2, rgb(255, 255, 80)); pell(p, 11, 12, 2, 2, rgb(255, 255, 80));
      const op = fr === 2 ? 4 : 1; pline(p, 4, 17, 0, 17 - op, rgb(240, 240, 220), 2); pline(p, 4, 19, 0, 19 + op, rgb(240, 240, 220), 2);
      poutline(p, BLK); return p;
    }
    function brute(fr) {
      const p = Pix(60, 76), s = rgb(110, 130, 160), sd = rgb(70, 84, 110), pl = rgb(60, 60, 70);
      if (fr === 5) { pell(p, 30, 70, 27, 6, sd); pell(p, 12, 66, 9, 7, s); pell(p, 46, 68, 10, 5, pl); poutline(p, BLK); return p; }
      const l = fr === 0 ? -4 : fr === 1 ? 4 : 0, ln = fr === 4 ? 6 : 0;
      prect(p, 16 + l, 52, 10, 20, sd); prect(p, 34 - l, 52, 10, 20, sd); prect(p, 14 + l, 70, 14, 6, pl); prect(p, 32 - l, 70, 14, 6, pl);
      pell(p, 30 + ln / 2, 38, 20, 18, s); prect(p, 14, 40, 32, 4, pl); pell(p, 30, 32, 12, 8, rgb(140, 160, 190));
      pell(p, 30 + ln, 16 + ln, 9, 9, s); prect(p, 24 + ln, 14 + ln, 12, 3, rgb(255, 80, 40));
      pell(p, 8, 40, 7, 14, sd); pell(p, 52, 40, 7, 14, sd); prect(p, 3, 50, 10, 8, pl); prect(p, 47, 50, 10, 8, pl);
      prect(p, 40, 8, 16, 12, pl); for (let k = 0; k < 3; k++) pell(p, 44 + k * 4.5, 10, 1.5, 1.5, fr === 2 ? rgb(255, 200, 60) : BLK);
      if (fr === 2) pell(p, 48, 6, 6, 4, rgb(255, 220, 120));
      poutline(p, BLK); return p;
    }
    function jelly(fr) {
      const p = Pix(36, 46), j = rgb(240, 120, 200), jd = rgb(180, 70, 160);
      if (fr === 5) { pell(p, 18, 42, 14, 4, jd); poutline(p, BLK); return p; }
      for (let k = 0; k < 6; k++) { const x = 6 + k * 5, w = Math.sin((fr + k) * 1.3) * 3; pline(p, x, 22, x + w, 44, k & 1 ? jd : j, 2); }
      pell(p, 18, 14, 16, 13, j); pell(p, 18, 20, 16, 5, jd); pell(p, 18, 12, 6, 6, fr === 2 ? rgb(255, 255, 220) : rgb(255, 230, 120)); pell(p, 13, 8, 4, 3, rgb(255, 200, 240));
      if (fr === 3) pell(p, 18, 12, 6, 6, WHT);
      poutline(p, rgb(90, 20, 80)); return p;
    }
    function overlord(fr) {
      const p = Pix(100, 110), m = rgb(70, 70, 86), md = rgb(44, 44, 56), b = rgb(240, 150, 190);
      if (fr === 5) { pell(p, 50, 100, 46, 9, md); pell(p, 30, 94, 12, 6, m); pell(p, 70, 96, 14, 5, rgb(90, 40, 60)); poutline(p, BLK); return p; }
      pell(p, 50, 86, 40, 12, m); pell(p, 50, 90, 40, 8, md); for (let k = 0; k < 5; k++) pell(p, 18 + k * 16, 98, 4, 3, fr & 1 ? rgb(255, 160, 40) : rgb(255, 230, 120));
      prect(p, 30, 56, 40, 30, md); prect(p, 34, 60, 32, 4, rgb(200, 40, 60)); prect(p, 34, 70, 32, 2, rgb(80, 220, 255));
      pell(p, 50, 34, 26, 26, rgb(150, 210, 240)); pell(p, 50, 38, 21, 18, b); for (let k = 0; k < 8; k++) pline(p, 34 + k * 4, 26 + (k & 1) * 4, 36 + k * 4, 48, rgb(200, 100, 150));
      pell(p, 42, 44, 4, 5, fr === 3 ? WHT : rgb(255, 250, 120)); pell(p, 58, 44, 4, 5, fr === 3 ? WHT : rgb(255, 250, 120)); pell(p, 42, 45, 2, 2, BLK); pell(p, 58, 45, 2, 2, BLK);
      pell(p, 40, 22, 6, 4, rgb(255, 220, 240));
      const up = fr === 2 ? -10 : (fr & 1) * 3;
      pline(p, 30, 66, 10, 54 + up, m, 5); pline(p, 10, 54 + up, 6, 40 + up, m, 4); pline(p, 6, 40 + up, 0, 34 + up, rgb(200, 200, 210), 2); pline(p, 6, 40 + up, 12, 34 + up, rgb(200, 200, 210), 2);
      pline(p, 70, 66, 90, 54 + up, m, 5); pline(p, 90, 54 + up, 94, 40 + up, m, 4); pline(p, 94, 40 + up, 99, 34 + up, rgb(200, 200, 210), 2); pline(p, 94, 40 + up, 88, 34 + up, rgb(200, 200, 210), 2);
      if (fr === 2) { pell(p, 4, 34, 6, 6, rgb(200, 255, 120)); pell(p, 96, 34, 6, 6, rgb(200, 255, 120)); }
      poutline(p, BLK); return p;
    }
    function frames(A, name, fn, ppu) {
      const n = ['w0', 'w1', 'atk', 'pain', 'die', 'dead'];
      for (let f = 0; f < 6; f++) A.spr(name + '_' + n[f], fn(f), ppu);
      return { walk: [name + '_w0', name + '_w1'], atk: name + '_atk', pain: name + '_pain', die: name + '_die', dead: name + '_dead' };
    }
    function item(w, h, fn) { const p = Pix(w, h); fn(p); poutline(p, BLK); return p; }
    function buildSprites(A) {
      frames(A, 'tr', trooper); frames(A, 'dr', drone); frames(A, 'sk', skitter);
      frames(A, 'br', brute); frames(A, 'je', jelly); frames(A, 'ov', overlord, 46);
      A.spr('medkit', item(18, 14, p => { prect(p, 0, 2, 18, 12, rgb(240, 240, 240)); prect(p, 7, 4, 4, 8, rgb(40, 180, 60)); prect(p, 5, 6, 8, 4, rgb(40, 180, 60)); prect(p, 6, 0, 6, 2, rgb(120, 120, 120)); }));
      A.spr('megamed', item(22, 22, p => { pell(p, 11, 11, 10, 10, rgb(60, 200, 255)); prect(p, 9, 4, 4, 14, WHT); prect(p, 4, 9, 14, 4, WHT); }), 64, true);
      A.spr('soda', item(8, 12, p => { prect(p, 0, 0, 8, 12, rgb(220, 30, 40)); prect(p, 0, 4, 8, 3, WHT); prect(p, 0, 0, 8, 1, rgb(190, 190, 190)); }));
      A.spr('armor', item(22, 20, p => { ppoly(p, [2, 2, 8, 0, 14, 0, 20, 2, 19, 19, 3, 19], rgb(70, 90, 60)); prect(p, 6, 6, 10, 8, rgb(100, 120, 80)); prect(p, 3, 10, 16, 2, rgb(50, 60, 40)); }));
      A.spr('clip', item(10, 12, p => { prect(p, 1, 0, 8, 12, rgb(70, 70, 76)); prect(p, 2, 1, 6, 2, rgb(230, 190, 60)); }));
      A.spr('shells', item(18, 10, p => { prect(p, 0, 0, 18, 10, rgb(200, 60, 30)); for (let k = 0; k < 4; k++) prect(p, 2 + k * 4, 2, 3, 6, rgb(240, 200, 60)); }));
      A.spr('rockets', item(20, 12, p => { for (let k = 0; k < 2; k++) { prect(p, 0, 2 + k * 5, 16, 3, rgb(90, 110, 80)); prect(p, 16, 2 + k * 5, 4, 3, rgb(230, 60, 40)); } }));
      A.spr('pipebomb', item(10, 12, p => { prect(p, 2, 2, 6, 10, rgb(120, 120, 120)); prect(p, 2, 0, 6, 3, rgb(200, 40, 40)); prect(p, 3, 4, 1, 6, rgb(170, 170, 170)); }));
      A.spr('crystal', item(12, 14, p => { ppoly(p, [6, 0, 12, 6, 6, 14, 0, 6], rgb(80, 255, 120)); pline(p, 6, 1, 6, 12, rgb(200, 255, 210)); }), 64, true);
      A.spr('icecan', item(10, 14, p => { prect(p, 0, 2, 10, 12, rgb(80, 160, 230)); prect(p, 3, 0, 4, 3, rgb(200, 200, 210)); prect(p, 2, 6, 6, 3, WHT); }));
      A.spr('mine', item(12, 10, p => { prect(p, 0, 2, 12, 8, rgb(60, 70, 60)); pell(p, 6, 5, 2, 2, rgb(255, 40, 40)); prect(p, 0, 0, 12, 2, rgb(110, 120, 110)); }));
      A.spr('w_shotgun', item(36, 10, p => { prect(p, 0, 3, 24, 2, rgb(80, 80, 90)); prect(p, 0, 5, 22, 2, rgb(60, 60, 70)); prect(p, 22, 2, 14, 6, rgb(130, 80, 40)); prect(p, 8, 6, 8, 3, rgb(120, 70, 30)); }));
      A.spr('w_chain', item(36, 14, p => { for (let k = 0; k < 3; k++) prect(p, 0, 3 + k * 3, 22, 2, rgb(90, 90, 100)); prect(p, 20, 1, 16, 12, rgb(60, 60, 66)); prect(p, 24, 10, 4, 4, rgb(40, 40, 40)); }));
      A.spr('w_launch', item(40, 14, p => { prect(p, 0, 2, 34, 10, rgb(70, 90, 60)); prect(p, 0, 1, 4, 12, rgb(50, 60, 40)); prect(p, 20, 10, 6, 4, rgb(40, 40, 40)); prect(p, 30, 0, 6, 3, rgb(200, 40, 40)); }));
      A.spr('w_shrink', item(30, 16, p => { prect(p, 4, 4, 22, 8, rgb(170, 170, 190)); ppoly(p, [0, 6, 6, 2, 6, 14, 0, 10], rgb(80, 255, 120)); prect(p, 18, 10, 5, 6, rgb(60, 60, 70)); }));
      A.spr('w_freeze', item(30, 16, p => { prect(p, 2, 5, 24, 6, rgb(170, 190, 220)); pell(p, 18, 4, 5, 4, rgb(80, 160, 240)); pell(p, 24, 4, 4, 4, rgb(80, 160, 240)); prect(p, 0, 6, 3, 4, rgb(220, 240, 255)); }));
      A.spr('key_r', item(12, 16, p => { prect(p, 0, 0, 12, 16, rgb(230, 30, 30)); prect(p, 2, 2, 8, 5, WHT); prect(p, 3, 10, 6, 1, rgb(255, 200, 200)); }), 64, true);
      A.spr('key_b', item(12, 16, p => { prect(p, 0, 0, 12, 16, rgb(40, 90, 250)); prect(p, 2, 2, 8, 5, WHT); prect(p, 3, 10, 6, 1, rgb(200, 200, 255)); }), 64, true);
      A.spr('key_y', item(12, 16, p => { prect(p, 0, 0, 12, 16, rgb(250, 220, 30)); prect(p, 2, 2, 8, 5, WHT); prect(p, 3, 10, 6, 1, rgb(255, 255, 200)); }), 64, true);
      A.spr('jetpack', item(20, 22, p => { prect(p, 2, 2, 7, 16, rgb(160, 160, 170)); prect(p, 11, 2, 7, 16, rgb(160, 160, 170)); prect(p, 2, 0, 16, 3, rgb(200, 40, 40)); prect(p, 3, 18, 5, 4, rgb(60, 60, 60)); prect(p, 12, 18, 5, 4, rgb(60, 60, 60)); }));
      A.spr('energy', item(10, 16, p => { prect(p, 0, 2, 10, 14, rgb(40, 40, 50)); prect(p, 0, 6, 10, 5, rgb(60, 255, 80)); prect(p, 2, 0, 6, 2, rgb(200, 200, 200)); pline(p, 3, 7, 7, 10, BLK); }));
      A.spr('oneup', item(16, 16, p => { pell(p, 8, 8, 8, 8, rgb(255, 210, 40)); ptext(p, '1', 5, 4, rgb(120, 60, 0)); }), 64, true);
      A.spr('barrel', item(20, 28, p => { prect(p, 1, 1, 18, 27, rgb(200, 40, 30)); prect(p, 1, 6, 18, 2, rgb(140, 20, 20)); prect(p, 1, 20, 18, 2, rgb(140, 20, 20)); ppoly(p, [10, 9, 14, 16, 10, 19, 6, 16], rgb(255, 220, 40)); prect(p, 3, 1, 3, 27, rgb(240, 90, 70)); }));
      A.spr('hydrant', item(16, 24, p => { prect(p, 4, 4, 8, 20, rgb(220, 30, 30)); pell(p, 8, 4, 5, 4, rgb(240, 60, 50)); prect(p, 0, 9, 16, 4, rgb(200, 25, 25)); prect(p, 3, 22, 10, 2, rgb(150, 20, 20)); prect(p, 6, 5, 2, 15, rgb(255, 120, 110)); }));
      A.spr('hydrant_b', item(16, 24, p => { prect(p, 4, 12, 8, 12, rgb(220, 30, 30)); prect(p, 0, 12, 16, 3, rgb(200, 25, 25)); prect(p, 3, 22, 10, 2, rgb(150, 20, 20)); }));
      A.spr('lamp', item(14, 110, p => { prect(p, 5, 10, 4, 100, rgb(60, 66, 70)); prect(p, 3, 104, 8, 6, rgb(50, 54, 58)); prect(p, 0, 4, 14, 8, rgb(70, 74, 80)); prect(p, 1, 10, 12, 3, rgb(255, 250, 200)); }));
      A.spr('car', item(64, 34, p => { ppoly(p, [0, 16, 12, 14, 18, 4, 44, 4, 52, 14, 64, 16, 64, 28, 0, 28], rgb(60, 110, 200)); prect(p, 20, 7, 10, 7, rgb(170, 220, 250)); prect(p, 33, 7, 10, 7, rgb(170, 220, 250)); pell(p, 13, 28, 6, 6, rgb(20, 20, 20)); pell(p, 51, 28, 6, 6, rgb(20, 20, 20)); pell(p, 13, 28, 2, 2, rgb(160, 160, 160)); pell(p, 51, 28, 2, 2, rgb(160, 160, 160)); prect(p, 0, 18, 4, 3, rgb(255, 240, 160)); prect(p, 60, 18, 4, 3, rgb(230, 40, 30)); }));
      A.spr('car_b', item(64, 30, p => { ppoly(p, [0, 16, 12, 14, 18, 8, 44, 8, 52, 14, 64, 16, 64, 26, 0, 26], rgb(50, 46, 44)); pell(p, 13, 25, 6, 5, rgb(20, 20, 20)); pell(p, 51, 25, 6, 5, rgb(20, 20, 20)); }));
      A.spr('plant', item(20, 32, p => { prect(p, 5, 22, 10, 10, rgb(170, 90, 50)); for (let k = 0; k < 9; k++) pell(p, 4 + (k % 3) * 6, 6 + ((k / 3) | 0) * 6, 5, 4, k & 1 ? rgb(50, 150, 50) : rgb(70, 180, 60)); }));
      A.spr('crate', item(26, 26, p => { prect(p, 0, 0, 26, 26, rgb(170, 125, 70)); prect(p, 2, 2, 22, 22, rgb(190, 145, 85)); pline(p, 2, 2, 23, 23, rgb(130, 90, 45), 2); pline(p, 23, 2, 2, 23, rgb(130, 90, 45), 2); }));
      A.spr('pod', item(24, 26, p => { pell(p, 12, 15, 11, 11, rgb(120, 60, 150)); pell(p, 12, 13, 7, 7, rgb(170, 100, 200)); pell(p, 12, 12, 3, 3, rgb(120, 255, 200)); }));
      A.spr('rocket', item(14, 6, p => { prect(p, 2, 1, 9, 4, rgb(200, 200, 200)); prect(p, 11, 1, 3, 4, rgb(230, 50, 30)); prect(p, 0, 0, 3, 6, rgb(100, 100, 100)); }), 64);
      A.spr('flame', item(8, 8, p => { pell(p, 4, 4, 4, 4, rgb(255, 160, 40)); pell(p, 4, 4, 2, 2, rgb(255, 250, 180)); }), 64, true);
      // first-person weapons (gloved hands)
      const GL = rgb(50, 50, 56), GLH = rgb(90, 90, 100), MT = rgb(150, 150, 160), MTD = rgb(90, 90, 100);
      const LE = rgb(120, 78, 44), LED = rgb(84, 52, 28), LEH = rgb(160, 110, 66), SL = rgb(70, 80, 60);
      const hand = (p, x, y) => { prect(p, x - 13, y + 8, 26, 30, SL); prect(p, x - 13, y + 8, 4, 30, rgb(90, 100, 76)); pell(p, x, y + 2, 13, 11, LE); for (let k = 0; k < 4; k++) { pell(p, x - 8 + k * 5.5, y - 7, 3, 5, k & 1 ? LE : LEH); pset(p, x - 8 + k * 5.5, y - 9, LEH); } prect(p, x - 13, y + 6, 26, 3, LED); pell(p, x + 11, y - 2, 4, 6, LEH); };
      { const mk = f => { const p = Pix(110, 64); if (f) { ppoly(p, [70, 64, 90, 10, 110, 4, 108, 30, 96, 64], rgb(60, 50, 40)); pell(p, 100, 14, 14, 12, rgb(40, 32, 26)); prect(p, 88, 10, 22, 6, rgb(80, 70, 60)); } else { ppoly(p, [80, 64, 92, 40, 106, 38, 104, 64], rgb(60, 50, 40)); } poutline(p, BLK); return p; }; A.spr('v_boot', mk(0)); A.spr('v_boot_f', mk(1)); }
      { const mk = f => { const p = Pix(90, 76); if (f) { pell(p, 50, 9, 13, 9, rgb(255, 240, 150)); pell(p, 50, 9, 6, 4, WHT); } ppoly(p, [40, 16, 60, 16, 64, 50, 36, 50], MTD); prect(p, 43, 14, 14, 30, MT); prect(p, 46, 16, 3, 26, rgb(210, 210, 220)); pell(p, 50, 15, 6, 3, BLK); for (let k = 0; k < 3; k++) prect(p, 42, 22 + k * 7, 16, 2, rgb(60, 220, 120)); prect(p, 36, 44, 28, 10, rgb(70, 70, 80)); hand(p, 50, 58); poutline(p, BLK); return p; }; A.spr('v_pistol', mk(0)); A.spr('v_pistol_f', mk(1)); }
      { const mk = f => { const p = Pix(100, 70); if (f) { pell(p, 50, 6, 14, 8, rgb(255, 230, 120)); pell(p, 50, 6, 7, 4, WHT); } prect(p, 42, 10, 7, 40, MTD); prect(p, 51, 10, 7, 40, MTD); prect(p, 43, 10, 3, 40, MT); prect(p, 52, 10, 3, 40, MT); prect(p, 38, 34, 24, 10, rgb(130, 80, 40)); prect(p, 36, 48, 28, 22, rgb(110, 66, 30)); hand(p, 34, 56); hand(p, 66, 60); poutline(p, BLK); return p; }; A.spr('v_shotgun', mk(0)); A.spr('v_shotgun_f', mk(1)); }
      { const mk = f => { const p = Pix(100, 66); if (f) { pell(p, 50, 6, 16, 9, rgb(255, 230, 120)); pell(p, 50, 6, 8, 5, WHT); } for (let k = 0; k < 3; k++) { prect(p, 40 + k * 7, 8 + (f ? 2 : 0), 6, 36, k === 1 ? MT : MTD); prect(p, 41 + k * 7, 8, 2, 36, rgb(200, 200, 210)); } prect(p, 34, 36, 32, 16, rgb(70, 70, 76)); prect(p, 30, 50, 40, 16, rgb(56, 56, 62)); hand(p, 30, 56); hand(p, 70, 58); poutline(p, BLK); return p; }; A.spr('v_chain', mk(0)); A.spr('v_chain_f', mk(1)); }
      { const mk = f => { const p = Pix(110, 70); if (f) { pell(p, 64, 12, 16, 10, rgb(255, 200, 100)); } prect(p, 52, 12, 26, 44, rgb(70, 92, 62)); prect(p, 50, 10, 30, 6, rgb(50, 64, 44)); pell(p, 65, 13, 10, 3, BLK); prect(p, 80, 30, 10, 8, rgb(200, 40, 40)); prect(p, 46, 50, 36, 20, rgb(56, 70, 50)); hand(p, 60, 60); poutline(p, BLK); return p; }; A.spr('v_launch', mk(0)); A.spr('v_launch_f', mk(1)); }
      { const mk = f => { const p = Pix(90, 70); const y = f ? 10 : 24; prect(p, 46, y, 12, 26, rgb(120, 120, 120)); prect(p, 46, y - 6, 12, 7, rgb(200, 40, 40)); prect(p, 48, y + 4, 2, 18, rgb(180, 180, 180)); hand(p, 52, y + 30); prect(p, 40, y + 40, 26, 40, GL); poutline(p, BLK); return p; }; A.spr('v_pipe', mk(0)); A.spr('v_pipe_f', mk(1)); }
      { const p = Pix(90, 70); prect(p, 42, 22, 16, 30, rgb(60, 60, 60)); prect(p, 45, 26, 10, 6, rgb(255, 40, 40)); prect(p, 48, 14, 3, 9, MT); hand(p, 50, 52); prect(p, 38, 60, 26, 10, GL); poutline(p, BLK); A.spr('v_det', p); }
      { const mk = f => { const p = Pix(100, 70); if (f) pell(p, 50, 10, 12, 10, rgb(140, 255, 160)); prect(p, 38, 20, 24, 34, rgb(170, 170, 190)); ppoly(p, [44, 22, 50, 6, 56, 22], rgb(80, 255, 120)); prect(p, 40, 30, 20, 4, rgb(80, 255, 120)); prect(p, 34, 50, 32, 20, rgb(120, 120, 140)); hand(p, 36, 58); hand(p, 64, 58); poutline(p, BLK); return p; }; A.spr('v_shrink', mk(0)); A.spr('v_shrink_f', mk(1)); }
      { const mk = f => { const p = Pix(100, 70); if (f) pell(p, 50, 8, 14, 9, rgb(200, 240, 255)); prect(p, 44, 12, 12, 40, rgb(180, 200, 230)); pell(p, 36, 40, 9, 14, rgb(70, 150, 240)); pell(p, 64, 40, 9, 14, rgb(70, 150, 240)); prect(p, 34, 50, 32, 20, rgb(120, 130, 150)); hand(p, 40, 60); hand(p, 62, 60); poutline(p, BLK); return p; }; A.spr('v_freeze', mk(0)); A.spr('v_freeze_f', mk(1)); }
      { const mk = f => { const p = Pix(90, 70); const y = f ? 14 : 22; prect(p, 38, y, 24, 16, rgb(60, 70, 60)); prect(p, 38, y, 24, 3, rgb(110, 120, 110)); pell(p, 50, y + 8, 3, 3, rgb(255, 40, 40)); hand(p, 50, y + 30); prect(p, 38, y + 40, 26, 30, GL); poutline(p, BLK); return p; }; A.spr('v_mine', mk(0)); A.spr('v_mine_f', mk(1)); }
    }
    const FN = n => ({ walk: [n + '_w0', n + '_w1'], atk: n + '_atk', pain: n + '_pain', die: n + '_die', dead: n + '_dead' });
    const FR = { trooper: FN('tr'), drone: FN('dr'), skitter: FN('sk'), brute: FN('br'), jelly: FN('je'), overlord: FN('ov') };
    const bleep = (f1, f2, d, t) => au => au.tone(f1, d, { type: t || 'square', vol: .12, slideTo: f2 });
    return {
      year: 1996, maker: '3D REALMS', heroName: 'MAX BRAVADO', heroShort: 'MAX', livesLabel: 'MAX', tagline: 'THE GREX HAVE LANDED. MAX IS ANNOYED.',
      bossName: 'OVERLORD ZORBAX', hiDefault: 30000, jetpack: true, boostShort: 'NRG',
      keyNames: { r: 'RED KEYCARD', b: 'BLUE KEYCARD', y: 'YELLOW KEYCARD' },
      remoteMsg: 'THIS DOOR IS CONTROLLED BY A SWITCH', remoteOpenMsg: 'A DOOR OPENED SOMEWHERE', remoteNone: 'CLICK. NOTHING ELSE HAPPENS.',
      boostEnd: 'THE ENERGY DRINK WORE OFF', vendItem: 'soda', vendEmpty: 'SOLD OUT. TYPICAL.', mineSpr: 'mine', detView: 'v_det',
      bossFirst: 'THE OVERLORD IS STILL IN CHARGE HERE!',
      hud: { bg: '#3a3f4a', panel: '#22262e', hi: '#6a7080', lo: '#14161a', label: '#9aa4b8', num: '#ffc830', off: '#3a3f4a', quip: '#7fe0ff', cross: 'rgba(255,220,80,0.8)' },
      dmgScale: n => 1 + n * 0.04,
      build(A) {
        buildTextures(A); buildSprites(A);
        const R = mkRng(77);
        A.sky('city', sky(256, 128, rgb(8, 8, 40), rgb(90, 40, 110), R, rgb(14, 14, 30), p => { pell(p, 200, 30, 10, 10, rgb(240, 240, 220)); pell(p, 204, 27, 9, 9, rgb(8, 8, 40)); for (let k = 0; k < 3; k++) { pell(p, 40 + k * 70, 40 + k * 9, 14, 4, rgb(130, 140, 160)); pell(p, 40 + k * 70, 37 + k * 9, 6, 3, rgb(160, 255, 200)); } }));
        A.sky('dusk', sky(256, 128, rgb(60, 20, 70), rgb(250, 120, 50), R, rgb(30, 16, 30), p => { pell(p, 120, 70, 16, 16, rgb(255, 210, 120)); }));
        A.sky('space', sky(256, 128, rgb(0, 0, 8), rgb(20, 0, 40), R, 0, p => { pell(p, 70, 60, 28, 28, rgb(40, 90, 200)); pell(p, 64, 54, 12, 8, rgb(60, 170, 80)); pell(p, 78, 68, 9, 6, rgb(60, 170, 80)); for (let k = 0; k < 200; k++) pset(p, R() * 256, R() * 128, rgb(200, 200, 255)); pell(p, 190, 40, 40, 14, rgb(80, 30, 90)); }));
        A.sky('default', sky(256, 128, rgb(8, 8, 40), rgb(90, 40, 110), R, rgb(14, 14, 30)));
      },
      story: [
        { head: 'NEO ANGELES, 1996', lines: ['MAX BRAVADO - RETIRED STUNT PILOT,', 'PART-TIME HERO, FULL-TIME SHOW-OFF -', 'WAS ENJOYING A QUIET VACATION.', '', 'THEN THE GREX ARMADA PARKED ITS SAUCERS', 'OVER THE CITY, SWIPED THE POWER GRID,', 'THE PIZZA SUPPLY AND - WORST OF ALL -', "MAX'S FAVORITE PARKING SPOT."] },
        { head: 'THE MISSION', lines: ['OVERLORD ZORBAX PLANS TO SHRINK THE', 'WHOLE PLANET TO FIT IN HIS TROPHY CASE.', '', 'FIGHT ACROSS THE CITY, FIND KEYCARDS,', 'HIT THE EXIT SWITCH ON EACH LEVEL,', 'AND KICK THE GREX BACK TO ORBIT.', '', 'TIP: WALK INTO DOORS, SWITCHES AND', 'MACHINES TO USE THEM.'] }
      ],
      ending: ['THE OVERLORD\'S HOVER-THRONE SPUTTERS,', 'SPINS, AND SPLASHES INTO THE BAY.', '', 'THE GREX ARMADA RETREATS IN A HURRY.', 'POWER IS BACK. PIZZA IS BACK.', 'MAX GETS HIS PARKING SPOT BACK.', '', 'MAX: "NEXT TIME, BRING A PERMIT."', '', 'THANKS FOR PLAYING!'],
      controlsText: ['HOW TO PLAY', 'ARROWS MOVE/TURN   A/D STRAFE', 'SPACE FIRE   X / 1-9 SWITCH WEAPON', 'Z JUMP  (HOLD Z IN AIR = JETPACK)', 'BUMP DOORS, SWITCHES & MACHINES', 'TAB/M AUTOMAP'],
      logo(ctx, t, text, textS) {
        const y = 22 + Math.sin(t * 2) * 2;
        textS(ctx, 'DUKE NUKEM', 160, y, '#ff3020', 4, 'center'); textS(ctx, '3D', 160, y + 34, '#ffd020', 4, 'center');
        ctx.fillStyle = '#ffd020'; ctx.fillRect(40, y + 66, 240, 2);
      },
      backdrop(ctx, t, W, H) {
        ctx.fillStyle = '#0a0a24'; ctx.fillRect(0, 0, W, H);
        for (let k = 0; k < 60; k++) { ctx.fillStyle = k % 3 ? '#555' : '#aaa'; ctx.fillRect((k * 97) % W, (k * 61 + t * 6 * (k % 4 + 1)) % H, 1, 1); }
        ctx.fillStyle = '#16162a'; for (let x = 0; x < W; x += 14) ctx.fillRect(x, H - 40 - ((x * 7) % 30), 12, 60);
      },
      quips: {
        start: ['TIME TO TAKE OUT THE TRASH.', 'WHO PARKED A SAUCER ON MY STREET?', 'ALRIGHT, WHO ORDERED THE HERO?', 'THIS CITY NEEDS A SPRING CLEANING.', 'VACATION IS OFFICIALLY OVER.'],
        kill: ['NEXT!', 'AND STAY DOWN.', 'WELCOME TO EARTH. CHECKOUT IS NOW.', 'TOO SLOW, SPACE CADET.', 'SHOULD HAVE STAYED IN ORBIT.', 'NO REFUNDS.', 'THAT ONE WAS FOR MY PARKING SPOT.'],
        multi: ['THREE FOR THE PRICE OF ONE!', 'NOW THAT IS A COMBO!', 'WHO WANTS SECONDS?'],
        secret: ['HELLO, WHAT HAVE WE HERE?', 'SNEAKY. I LIKE IT.', 'EVERY CITY HAS ITS SECRETS.'],
        weapon: ['OH YEAH, NOW WE ARE TALKING.', 'SHINY!', 'THIS ONE IS GOING ON MY MANTEL.'],
        vend: ['MMM, FIZZY.', 'BREAKFAST OF HEROES.', 'EXACT CHANGE, TOO.'],
        glass: ['OOPS. PUT IT ON MY TAB.', 'I WILL PAY FOR THAT. PROBABLY.'],
        hydrant: ['FREE CAR WASH!', 'REFRESHING!'],
        exit: ['ANOTHER DAY, ANOTHER SAUCER.', 'PIECE OF CAKE. LEMON CAKE.', 'ON TO THE NEXT ONE.', 'TOO EASY.'],
        squish: ['SQUISHY!', 'LITTLE GUY, BIG MISTAKE.', 'MIND THE GAP. OH, TOO LATE.'],
        boost: ['WHOA, I CAN HEAR COLORS!', 'MAXIMUM BRAVADO!'],
        health: ['AH, MUCH BETTER.', 'GOOD AS NEW.']
      },
      music: {
        start: [[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .3]],
        clear: [[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .4]],
        win: [[523, .15], [659, .15], [784, .15], [1047, .3], [988, .15], [1047, .15], [1175, .15], [1319, .5]],
        coin: [[660, .05], [990, .1]],
        loop: [110, 0, 110, 131, 0, 147, 110, 0, 98, 0, 98, 110, 0, 131, 98, 0, 87, 0, 87, 98, 0, 110, 131, 147, 82, 0, 82, 98, 0, 110, 98, 0],
        bossLoop: [82, 82, 0, 87, 82, 82, 0, 98, 82, 82, 0, 110, 104, 98, 87, 0],
        tempo: 0.15, vol: 0.045, wave: 'triangle', hat: true
      },
      ammoMax: { bullets: 200, shells: 50, rockets: 30, pipes: 20, crystals: 40, ice: 120, mines: 10 },
      startAmmo: { bullets: 60 }, startCur: 1,
      weapons: [
        { name: 'MIGHTY BOOT', short: 'BOOT', kind: 'melee', dmg: 16, range: 0.95, arc: 0.6, cd: 0.42, anim: 0.25, view: 'v_boot', start: true, noAuto: true, snd: au => au.noise(.08, { vol: .12, freq: 500 }), sHit: au => au.tone(120, .1, { type: 'square', vol: .2, slideTo: 60 }) },
        { name: 'BLASTER', short: 'BLAST', kind: 'hitscan', ammo: 'bullets', dmg: 10, spread: .02, cd: .24, view: 'v_pistol', start: true, kick: 3, snd: au => { au.tone(880, .07, { type: 'square', vol: .14, slideTo: 200 }); au.noise(.05, { vol: .1, freq: 3000 }); } },
        { name: 'SHOTGUN', short: 'SHOTGN', kind: 'hitscan', ammo: 'shells', dmg: 8, pellets: 7, spread: .14, cd: .85, anim: .2, view: 'v_shotgun', kick: 6, snd: au => { au.noise(.25, { vol: .25, freq: 1800, slideTo: 300 }); au.tone(90, .15, { type: 'square', vol: .15 }); au.noise(.06, { vol: .1, freq: 900, delay: .45 }); au.noise(.06, { vol: .1, freq: 1200, delay: .55 }); } },
        { name: 'CHAINGUN', short: 'CHAIN', kind: 'hitscan', ammo: 'bullets', dmg: 9, spread: .06, cd: .085, anim: .06, view: 'v_chain', kick: 3, snd: au => { au.noise(.06, { vol: .16, freq: 2500 }); au.tone(200, .04, { type: 'square', vol: .08 }); } },
        { name: 'ROCKET LAUNCHER', short: 'ROCKET', kind: 'proj', proj: 'rocket', ammo: 'rockets', cd: .8, anim: .2, view: 'v_launch', kick: 6, snd: au => { au.noise(.4, { vol: .2, freq: 1200, slideTo: 200 }); au.tone(300, .3, { type: 'sawtooth', vol: .08, slideTo: 80 }); } },
        { name: 'PIPE BOMB', short: 'PIPE', kind: 'pipe', proj: 'pipe', ammo: 'pipes', cd: .5, anim: .2, view: 'v_pipe', noAuto: true, snd: au => au.noise(.1, { vol: .08, freq: 600 }) },
        { name: 'SHRINK RAY', short: 'SHRINK', kind: 'proj', proj: 'shrink', ammo: 'crystals', cd: .6, anim: .15, view: 'v_shrink', snd: au => au.tone(1400, .25, { type: 'sine', vol: .12, slideTo: 300 }) },
        { name: 'FREEZE RAY', short: 'FREEZE', kind: 'proj', proj: 'freeze', ammo: 'ice', cd: .12, anim: .08, view: 'v_freeze', snd: au => au.noise(.1, { vol: .1, freq: 5000, type: 'highpass' }) },
        { name: 'LASER TRIPMINE', short: 'MINE', kind: 'mine', ammo: 'mines', cd: .6, anim: .2, view: 'v_mine', noAuto: true, snd: au => au.tone(1000, .05, { type: 'square', vol: .1 }) }
      ],
      projs: {
        rocket: { spr: 'rocket', speed: 11, splash: 1.7, sdmg: 110, dmg: 0, life: 4, trail: rgb(150, 150, 150), full: true },
        pipe: { spr: 'pipebomb', speed: 5, grav: 9, bounce: .45, det: true, splash: 2.1, sdmg: 140, life: 99, sBounce: au => au.tone(500, .03, { type: 'square', vol: .06 }) },
        shrink: { speed: 10, dmg: 0, kind: 'shrink', col: rgb(120, 255, 140), size: .06, puff: rgb(120, 255, 140) },
        freeze: { speed: 11, dmg: 9, kind: 'freeze', col: rgb(190, 230, 255), size: .045, puff: rgb(220, 240, 255) },
        plasma: { speed: 6.5, dmg: 7, col: rgb(120, 255, 90), size: .05, puff: rgb(120, 255, 90) },
        zap: { speed: 5.5, dmg: 11, col: rgb(255, 140, 240), size: .07, puff: rgb(255, 140, 240) },
        erocket: { spr: 'rocket', speed: 6.5, splash: 1.3, sdmg: 32, dmg: 0, life: 5, trail: rgb(150, 150, 150), full: true },
        laser: { speed: 9, dmg: 6, col: rgb(255, 60, 60), size: .035 },
        bossorb: { spr: 'flame', speed: 6, dmg: 10, scale: 1.6, full: true, puff: rgb(255, 160, 40) }
      },
      enemies: {
        trooper: { frames: FR.trooper, hp: 30, speed: 1.6, r: .24, h: .8, score: 150, sight: 13, pain: .5, keep: 2.5, atk: { kind: 'proj', proj: 'plasma', range: 11, cd: 1.7, wind: .35 }, drop: 'clip', dropP: .35, bits: rgb(120, 220, 90), sSight: bleep(300, 600, .15), sDie: bleep(600, 120, .35, 'sawtooth') },
        drone: { frames: FR.drone, hp: 22, speed: 2.1, r: .26, h: .4, fly: true, score: 200, sight: 14, pain: .6, keep: 3, atk: { kind: 'proj', proj: 'laser', range: 12, cd: 1.1, wind: .25, n: 2, spread: .08 }, bits: rgb(200, 200, 220), sSight: bleep(900, 1200, .1), sDie: au => { au.noise(.3, { vol: .15, freq: 2000, slideTo: 200 }); } },
        skitter: { frames: FR.skitter, hp: 18, speed: 3.0, r: .26, h: .4, score: 120, sight: 10, pain: .3, keep: .3, strafe: .3, atk: { kind: 'melee', range: .75, dmg: 8, cd: .7, wind: .2 }, bits: rgb(240, 150, 40), sSight: bleep(1500, 900, .08, 'sawtooth'), sDie: bleep(800, 200, .2) },
        brute: { frames: FR.brute, hp: 160, speed: 1.2, r: .34, h: 1.18, score: 600, sight: 15, pain: .15, keep: 3.5, atk: { kind: 'proj', proj: 'erocket', range: 13, cd: 2.2, wind: .5, n: 2, spread: .1 }, drop: 'rockets', dropP: .5, bits: rgb(140, 160, 190), sSight: bleep(120, 70, .4, 'sawtooth'), sDie: bleep(160, 40, .6, 'sawtooth') },
        jelly: { frames: FR.jelly, hp: 60, speed: 1.3, r: .26, h: .68, fly: true, score: 300, sight: 13, pain: .4, keep: 3, atk: { kind: 'proj', proj: 'zap', range: 11, cd: 1.6, wind: .4, n: 3, spread: .14 }, bits: rgb(255, 140, 220), sSight: bleep(500, 800, .3, 'sine'), sDie: bleep(800, 300, .4, 'sine') },
        overlord: { frames: FR.overlord, hp: 2200, speed: 1.0, r: .7, h: 2.3, scale: 1, boss: true, score: 20000, sight: 30, keep: 5, mz: .45, bits: rgb(255, 160, 200), noShrink: true,
          atks: [{ kind: 'proj', proj: 'bossorb', range: 30, cd: 1.4, wind: .5, n: 5, spread: .16, snd: bleep(200, 600, .3, 'sawtooth') }, { kind: 'proj', proj: 'erocket', range: 30, cd: 1.6, wind: .5, n: 2, spread: .3 }, { kind: 'summon', range: 30, cd: 1.5, wind: .8, n: 2, what: ['trooper', 'drone', 'skitter'], snd: bleep(100, 400, .6, 'sine') }, { kind: 'proj', proj: 'plasma', range: 30, cd: 1.0, wind: .3, n: 5, spread: .12 }],
          sSight: au => au.melody([[110, .3], [104, .3], [98, .6]], { type: 'sawtooth', vol: .15 }), sDie: au => au.noise(1.5, { vol: .3, freq: 800, slideTo: 40 }) }
      },
      items: {
        medkit: { spr: 'medkit', hp: 25, msg: 'MEDKIT +25', quip: 'health' },
        megamed: { spr: 'megamed', hp: 50, max: 200, msg: 'MEGA MEDKIT! +50', full: true, score: 200 },
        soda: { spr: 'soda', hp: 10, msg: 'ICE-COLD FIZZ POP +10', bob: false },
        armor: { spr: 'armor', armor: 100, msg: 'ARMOR VEST' },
        clip: { spr: 'clip', ammo: { bullets: 24 }, msg: 'BLASTER CHARGES' },
        shells: { spr: 'shells', ammo: { shells: 10 }, msg: 'SHOTGUN SHELLS' },
        rockets: { spr: 'rockets', ammo: { rockets: 5 }, msg: 'ROCKETS' },
        pipes: { spr: 'pipebomb', ammo: { pipes: 4 }, weapon: 5, msg: 'PIPE BOMBS - FIRE TO THROW, FIRE AGAIN TO DETONATE' },
        crystals: { spr: 'crystal', ammo: { crystals: 10 }, msg: 'SHRINK CRYSTALS', full: true },
        ice: { spr: 'icecan', ammo: { ice: 40 }, msg: 'FREEZE CANISTER' },
        mines: { spr: 'mine', ammo: { mines: 3 }, weapon: 8, msg: 'LASER TRIPMINES - PLACE NEAR A WALL' },
        shotgun: { spr: 'w_shotgun', weapon: 2, ammo: { shells: 12 }, msg: 'SHOTGUN!', score: 100 },
        chaingun: { spr: 'w_chain', weapon: 3, ammo: { bullets: 60 }, msg: 'CHAINGUN!', score: 100 },
        launcher: { spr: 'w_launch', weapon: 4, ammo: { rockets: 6 }, msg: 'ROCKET LAUNCHER!', score: 100 },
        shrinker: { spr: 'w_shrink', weapon: 6, ammo: { crystals: 12 }, msg: 'SHRINK RAY! SHRINK THEM, THEN STOMP THEM', score: 100 },
        freezer: { spr: 'w_freeze', weapon: 7, ammo: { ice: 60 }, msg: 'FREEZE RAY! FREEZE THEM, THEN SHATTER THEM', score: 100 },
        keyr: { spr: 'key_r', key: 'r', full: true }, keyb: { spr: 'key_b', key: 'b', full: true }, keyy: { spr: 'key_y', key: 'y', full: true },
        jetpack: { spr: 'jetpack', jet: 1, msg: 'JETPACK! HOLD Z IN THE AIR TO FLY', score: 200 },
        energy: { spr: 'energy', boost: 20, msg: 'ENERGY DRINK! SUPER SPEED AND KICK', quip: 'boost', snd: au => au.melody([[400, .05], [600, .05], [800, .05], [1200, .1]], { type: 'square', vol: .12 }) },
        oneup: { spr: 'oneup', life: 1, msg: 'EXTRA LIFE!', full: true, score: 500 }
      },
      decos: {
        barrel: { spr: 'barrel', r: .2, solid: true, hp: 12, explode: [1.8, 90], hz: .25 },
        hydrant: { spr: 'hydrant', broke: 'hydrant_b', r: .14, solid: true, hp: 1, spray: 9, hz: .2 },
        lamp: { spr: 'lamp', r: .1, solid: true },
        car: { spr: 'car', broke: 'car_b', r: .45, solid: true, hp: 70, explode: [2.0, 100], hz: .25, score: 100 },
        plant: { spr: 'plant', r: .15, solid: true, hp: 5, shards: rgb(70, 170, 60) },
        crate: { spr: 'crate', r: .2, solid: true, hp: 15, shards: rgb(170, 125, 70), drop: 'clip' },
        pod: { spr: 'pod', r: .18, solid: true, hp: 10, shards: rgb(170, 100, 200), drop: 'medkit', score: 50 }
      },
      ents: {
        t: { t: 'enemy', k: 'trooper' }, v: { t: 'enemy', k: 'drone' }, k: { t: 'enemy', k: 'skitter' }, g: { t: 'enemy', k: 'brute' }, j: { t: 'enemy', k: 'jelly' }, O: { t: 'enemy', k: 'overlord' },
        h: { t: 'item', k: 'medkit' }, M: { t: 'item', k: 'megamed' }, A: { t: 'item', k: 'armor' }, i: { t: 'item', k: 'clip' }, e: { t: 'item', k: 'shells' }, o: { t: 'item', k: 'rockets' },
        p: { t: 'item', k: 'pipes' }, c: { t: 'item', k: 'crystals' }, u: { t: 'item', k: 'ice' }, '^': { t: 'item', k: 'mines' },
        q: { t: 'item', k: 'shotgun' }, z: { t: 'item', k: 'chaingun' }, l: { t: 'item', k: 'launcher' }, x: { t: 'item', k: 'shrinker' }, f: { t: 'item', k: 'freezer' },
        r: { t: 'item', k: 'keyr' }, b: { t: 'item', k: 'keyb' }, y: { t: 'item', k: 'keyy' }, J: { t: 'item', k: 'jetpack' }, E: { t: 'item', k: 'energy' }, '*': { t: 'item', k: 'oneup' },
        B: { t: 'deco', k: 'barrel' }, H: { t: 'deco', k: 'hydrant' }, '|': { t: 'deco', k: 'lamp' }, m: { t: 'deco', k: 'car' }, s: { t: 'deco', k: 'plant' }, n: { t: 'deco', k: 'crate' }, Z: { t: 'deco', k: 'pod' }
      },
      legend: {
        '#': { s: 1, wt: 'brick', h: 3 }, '%': { s: 1, wt: 'concrete', h: 3 }, '=': { s: 1, wt: 'metal', h: 2.6 }, '&': { s: 1, wt: 'alien' }, R: { s: 1, wt: 'rock' }, T: { s: 1, wt: 'tech' },
        N: { s: 1, wt: 'neon' }, F: { s: 1, wt: 'facade', h: 99 }, W: { s: 2, f: 0, c: 1.3, wt: 'concrete' }, C: { s: 1, wt: 'crack', crack: 1 },
        X: { s: 1, wt: 'exit', exit: 1 }, V: { s: 1, wt: 'vend', vend: 1 }, L: { s: 1, wt: 'switch', sw: 'light' }, G: { s: 1, wt: 'switch', sw: 'remote' },
        D: { door: 'n', wt: 'door' }, Q: { door: 't', wt: 'door' }, S: { door: 's' }, K: { door: 'r', wt: 'doorr' }, U: { door: 'b', wt: 'doorb' }, Y: { door: 'y', wt: 'doory' },
        I: { lift: 1, ft: 'lift', wt: 'lift' }, '/': { ramp: 1, ft: 'floor' },
        '.': { f: 0, c: 1.3 }, ',': { f: 0, c: 8, sky: 1, ft: 'asphalt' }, ':': { f: .12, c: 8, sky: 1, ft: 'sidewalk' }, ';': { f: .08, c: 8, sky: 1, ft: 'grass' },
        '~': { f: -.45, c: 1.6, ft: 'water', water: 1, wt: 'tilew' }, '_': { f: 0, c: 1.3, ft: 'carpet' }, '-': { f: 0, c: 1.25, ft: 'wood' }, '`': { f: 0, c: 3, ft: 'marble' },
        '"': { f: -.15, c: 1.5, ft: 'slime', hurt: 1, wt: 'rock' }, d: { f: 0, c: 1.3, dark: 1, l: .18, lon: 1 }, a: { f: 0, c: 1.6, ft: 'alienf', ct: 'alienf' }, '0': { f: -.5, c: 1.3 },
        '1': { f: .25, c: 1.6 }, '2': { f: .5, c: 1.8 }, '3': { f: .75, c: 2.0 }, '4': { f: 1.0, c: 2.3 }, '5': { f: 1.25, c: 2.6 }, '6': { f: 1.5, c: 2.8 },
        '7': { f: 1.0, c: 8, sky: 1, ft: 'roof' }, '8': { f: 1.5, c: 8, sky: 1, ft: 'roof' }, '9': { f: 2.0, c: 8, sky: 1, ft: 'roof' },
      },
      levels: DUKE_LEVELS
    };
  }

  ArcadeRegistry.register({
    id: 'duke3d', title: 'Duke Nukem 3D', year: 1996, maker: '3D Realms',
    width: 320, height: 200, vector: false, pointer: false,
    controls: 'Arrows: move/turn \u00b7 A/D: strafe \u00b7 Space: fire \u00b7 X or 1-9: weapon \u00b7 Z: jump/jetpack \u00b7 Tab/M: map \u00b7 Enter: start',
    marquee: { bg: '#14080a', fg: '#ff3020', accent: '#ffd020' },
    create(api) { return makeGame(api, GAMEDEF()); }
  });
})();
