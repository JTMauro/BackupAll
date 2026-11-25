// Shadow Warrior (3D Realms, 1997) - an original take on the 1997 PC shooter: own sector engine, own hero (Kai Mori),
// own demons, maps, art and sound. All graphics procedural, all sound synthesized.
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

  const SW_LEVELS = [
    {"name": "VEXCORP LOBBY", "map": ["FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "FFFF================================FFFF", "FFFF=----T----T-------i--T----T----XFFFF", "FFFF=-------g----m----------g---i--=FFFF", "FFFF================K===============FFFF", "FFFF========```````````````=4g4444m=FFFF", "FFFF==rdddd=```````````````=444v444=FFFF", "FFFF==dgddd=```````````````I4444444=FFFF", "FFFF==ddddu=````````g``````=44444g4=FFFF", "FFFF====DL==```````````````=4444444=FFFF", "FFFF=``````````3333333333``````````=FFFF", "FFFF=`m````````3````````3``````````=FFFF", "F..k=``````````3``````g`3````````A`=FFFF", "FE..=`````B``````g`````````````````=FFFF", "F.$.CB``````````````q``````````n```=FFFF", "F...=``g```````````````````````````=FFFF", "F.*.=```````n`````````````g``B`````=FFFF", "FFFF=V````````````````````````````V=FFFF", "FFFF====WWWWWWWWWWWDDWWWWWWWWWWW====FFFF", "F::::::::::::::::::::::::::::::::::::::F", "F:::::q:::::g::!:::::::::!:::::::m:::::F", "F:::::::::::::::::::@:::::::g::::::::::F", "F::::::::::::::::::::::::::::::::::::::F", "F,,,h,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,F", "F,,,,,,,,,J,,,,,,,,,,,,,,,,,,,,,,,,g,,,F", "F,,,,,,,,,,,,,,,,,,,P,,,,,,,,,J,,,,,,,,F", "F,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,F", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"], "sky": "city", "ang": 270, "amb": 1.0, "fog": 0.045, "legend": {"`": {"f": 0, "c": 3, "ft": "stone", "ct": "office"}, "4": {"f": 1.0, "c": 3, "ft": "carpet", "ct": "office"}, "3": {"f": 0.75, "c": 3, "ft": "lacquer", "st": "lacquer", "ct": "office"}, ",": {"f": 0, "c": 8, "sky": 1, "ft": "asphalt", "st": "concrete"}, ":": {"f": 0.1, "c": 8, "sky": 1, "ft": "sidewalk", "st": "concrete"}, "d": {"f": 0, "c": 1.4, "dark": 1, "l": 0.15, "lon": 1, "ft": "carpet", "ct": "office"}, "W": {"s": 2, "f": 0, "c": 3}, ".": {"f": 0, "c": 1.4, "ft": "concrete", "ct": "office"}}}, {"name": "ROOFTOP RUN", "map": ["FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "F0NNNN0000,,,,22NNNNN22,,,444NNNN44444444F", "F0000000g0,,,,222222222,,,4444444i4444n44F", "F00P000000,,,,22222x222I,,44444444%%%%%44F", "F000000000////22B222222,,,44g44444%55m%44F", "F000000000////222222222,,,444444Z4%5r5%44F", "F00000B000,,,,2g22222@2,,,44444444%g55%44F", "F000000000,,,,222222222,,,44444444%%D%%44F", "F000000000I,,,222222222///44444g444444444F", "F000000g00,,,,222n22222///4444444444444g4F", "F0q0000000,,,,2222e2222,,,4m44i4444444444F", "F000000000,,,,222222222,,,444444444444444F", "F,,,,I,,,,,,,,,,,,,,,,,,h,,,,,//,,,,,,,,,F", "F,,,,,,,,,,,h,,,,,,,,,,,,,,,,,//,,,,,,h,,F", "F,,,,,,,,,,,,,,,,,h,,,,,,,,,,,//,,,,,,,,,F", "F,,,,,,,,,,,,,I,,,,,,,,,,,,,,,//,,,,,,,,,F", "F1111111111111111111111,,,222222222222222F", "F1111111111111111111111,,,2222222222g2222F", "F1111111q11111111111e11,,I22g222222222222F", "F1111111111111111111111,,,2222222%%%%%%%2F", "F1111g11111J11111111111///2222222%---g-%2F", "F1111111111111111111111///222i222%--g--%2F", "F11111111111111g1111111,,,2222222K-----X2F", "F1111111111111111111111,,,2222222%-u---%2F", "F11E1111111111111111111,J,22222n2%-----%2F", "F111111111$M11111111111,,,2m22222%%%%%%%2F", "F1111111111111111111111,,,22222222222B222F", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"], "sky": "city", "ang": 0, "amb": 1.0, "fog": 0.035, "legend": {"0": {"f": 0, "c": 8, "sky": 1, "ft": "rooftile", "st": "facade"}, "1": {"f": 0.25, "c": 8, "sky": 1, "ft": "rooftile", "st": "facade"}, "2": {"f": 0.5, "c": 8, "sky": 1, "ft": "rooftile", "st": "facade"}, "4": {"f": 1.0, "c": 8, "sky": 1, "ft": "rooftile", "st": "facade"}, "5": {"f": 1.0, "c": 2.4, "ft": "floor", "ct": "ceil"}, ",": {"f": -3, "c": 8, "sky": 1, "ft": "asphalt", "st": "facade"}, "-": {"f": 0.5, "c": 1.9, "ft": "carpet", "ct": "office"}, "/": {"ramp": 1, "ft": "planks"}, "I": {"lift": 1, "ft": "lift", "wt": "facade"}}}, {"name": "MOUNTAIN ROAD", "map": ["RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR", "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR", "R::::::,,,,,,,,,,^,,K,,,,,,,,,,,,,,B,,,,,,RR", "R::!:::,,n,,,,,,n,,,K,,,,,,,i,,,,,,,,,,,,,RR", "X::::m:,,,,,,,,,,,,,K,,s,,,,,,,,,n,,,,,,,,RR", "R::::::,,,,,g,,,,,,,K,,,,i,,,,,,,,,,,,,,,,RR", "R::!:::,^,,,,,,,,,,,K,,,,,,,,,m,,,,,,,,,,,RR", "R::::::RRRRR~~~RRRRRRRRRRRRRRRRRRRRRR,,,,,RR", "RRRRRRRRRRRR~~~RRRRRRRRRRRRRRRRRRRRRR,g,,,RR", "RRRRRRRRRRRR~~~RRRRRRRRRRRRRRRRR,,M,R,,,,,RR", "RRRRRRRRRRRR~~~RRRRRRRRRRRRRRRRR,$,,S,,,,,RR", "RRRRRRRRRRRR~~~RRRRRRRRRRRRRRRRR*,,,R,,,,,RR", "RRRRRRRRRRRR~~~888888888g88888lRRRRRR,,,n,RR", "RRRRRRRRRRRR~~~8888g88888%%%%%8RRRRRR,,,,,RR", "RRRRRRRRRRRR~~~8888888888%.r.%8RRRRRR,,,,,RR", "RRRRRRRRRRRR~~~88@8888888D..m%8RRRRRR,,,e,RR", "RRRRRRRRRRRR~~~8888888888%%%%%8RRRRRR,,,,,RR", "RRRRRRRRRRRR~~~8o8888g888888888RRRRRR,h,,,RR", "RRRRRRRRRRRR~~~88888888888888g8RRRRRR,,,,,RR", "RRRRRRRRRRRR~~~RRRRRRR//RRRRRRRRRRRRR,,,,,RR", "RRRRRRRRRRRR~~~RRRRRRR//RRRRRRRRRRRRR,,B,,RR", "RRRRRRRRRRRR~~~RRRRRRR//RRRRRRRRRRRRR,,,,,RR", "RRRRRRRRRRRR~~~RRRRRRR//RRRRRRRRRRRRR,,h,,RR", "RRRRRRRRRRRR~~~RRRRRRR//RRRRRRRRRRRRR,,,,,RR", "R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,RR", "R,,,,,,,,m,,,,,,,,h,,,,,,,,,,,h,,,,,,,,,,,RR", "R,,,P,z,,,,,h,,,,,,,,,,,,,,B,,,,,,,g,,,,,,RR", "R,,,,,,,,,,,,,,,,,,,,,,,h,,,,,,,,,,,,,,,,,RR", "R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,RR", "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR"], "sky": "dusk", "ang": 0, "amb": 1.0, "fog": 0.03, "legend": {",": {"f": 0, "c": 8, "sky": 1, "ft": "gravel", "st": "rock"}, ":": {"f": 0.1, "c": 8, "sky": 1, "ft": "stone", "st": "rock"}, "8": {"f": 1.0, "c": 8, "sky": 1, "ft": "grass", "st": "rock"}, "~": {"f": -0.3, "c": 8, "sky": 1, "ft": "water", "water": 1, "st": "rock"}, "/": {"ramp": 1, "ft": "gravel"}, ".": {"f": 1.0, "c": 2.4, "ft": "floor"}, "%": {"s": 1, "wt": "woodwall", "h": 2.4}, "R": {"s": 1, "wt": "rock", "h": 3.5}}}, {"name": "TEMPLE OF FALLING LEAVES", "map": ["####################X###################", "#.....##::::::::33333333::::::::########", "#.E.M.##::;;;;;;22222222;;;;;;::########", "#.....##::;;w;;;11111111;;;w;;::########", "#..$..##::;;;;;;;;;;;;;;;;;;;;::########", "#.....##:!;;;;;;;;n;;;;;;m;;;;!:########", "#*....##::::::::::::::::::::::::########", "#S##################Y###################", "#______#````````````````````````#______#", "#_m____#`k````n``````````n````m`#__n___#", "#____n_#```|``````e`````````|```#+_____#", "#______#````````````````````````#______#", "#++D+++G```````|````````|```````Q____y_#", "#______#````````````w```````````#______#", "#______#````````````````````````#+_____#", "#__n___D```|````````````````|```#______#", "#____t_#``n``````````````````i``#__n__m#", "#v_____#````````````````````````#______#", "#########++++++++++DD++++++++++#########", "#;;;;;;;;;;;;;;;;;;::;;;;;;;;;;;;;;;;;;#", "#;;;;;;;;;;;;;;;;!;::;!;;;;;;;;;;;;;;;;#", "#;;;^;;;~~--~~;;;;;::;;;i;;;;;;;;;;^;;;#", "#;;;;;h;~~--~~;i;;;::;;;;;;^;;;;;;;;;;;#", "#;;;;;;;~~--~~;;;;;::;;;;;;;;;;h;;;;;;;#", "#;;;;;;;~~--~~;;;;;::;;;;;;;;;;;;;;;;;;#", "#;;;;;::::::::::::::::::::::::::::;;m;;#", "#;;;;;::::::::::::::::::::::::::::;;;;;#", "#;;;;;!;;;;;;;;;;!;::;!;;;;;;;;;;!;;;;;#", "#;q;;;;;;;;;;;n;;;;::;;;;;;;;;;;;;;;;;;#", "#;;;;;;;;;;;;;;;^;;::;;^;;n;;;;;;;;;;;;#", "#;;;^;;;;;;;;;;;;;;::;;;;;;;;;;;;;;^;;;#", "#;;;;;;;;;;;;;;;;;;:P;;;;;;;;x;;;;;;;;;#", "#;;;;;;;;;;;;;;;;;;::;;;;;;;;;;;;;;;;;;#", "########################################"], "sky": "dusk", "ang": 270, "amb": 1.0, "fog": 0.04, "legend": {"`": {"f": 0, "c": 2.6, "ft": "floor", "ct": "ceil"}, "1": {"f": 0.25, "c": 8, "sky": 1, "ft": "stone", "st": "stone"}, "2": {"f": 0.5, "c": 8, "sky": 1, "ft": "stone", "st": "stone"}, "3": {"f": 0.75, "c": 8, "sky": 1, "ft": "stone", "st": "stone"}, "-": {"f": 0, "c": 8, "sky": 1, "ft": "planks", "st": "woodwall"}, "_": {"f": 0, "c": 1.4, "ft": "tatami", "ct": "ceil"}, ".": {"f": 0, "c": 1.4, "ft": "tatami", "ct": "ceil"}, "+": {"s": 2, "f": 0, "c": 1.4, "paper": 1}, "S": {"door": "s", "wt": "plaster"}}}, {"name": "NIGHT MARKET", "map": ["FFFFFFFFFFFFFFFFFFFFXFFFFFFFFFFFFFFFFFFFFF", "FFFFFFFFFFFFFF::FFKKKKKKFF::FFFFFFFFFFFFFF", "FF============::,,,,,,,,,,::============FF", "FF=V.........=::,,!,,,,!,,::=.l.....n..=FF", "FF=..g.......W::,Z,,,,,,Z,::D.....g....=FF", "FF=..........D::,,,,g,,,,,::=..........=FF", "FF=.......n..W::,,,,,,,,,,::=........o.=FF", "FF=.q........=::,,!,,,,!,,::============FF", "FF============::,Z,,,,,,Z,::FFFFFFFFFFFFFF", "FFFFFFFFFFFFFF::,,,,,,h,,,::F,,,,,,,,,,mFF", "FF============:m,,,,,,,,,,::F,,h,%%%,h,,FF", "FF=dddddddddd=::,,!,,,,!,,::F,,,,%%%,,,,FF", "FF=dbdddddgdd=::,Z,,,,,,Z,::U,,,,%%%,,,,FF", "FF=ddddddddddD::,,,,,w,,,,::F,,,,%%%n,,,FF", "FF=dddddvdddd=::g,,,,,,,,,::F,B,,%%%,,r,FF", "FF=dddnddddddL::,,,,,,,,,,::F,,,,,,,,,,,FF", "FF=mddddddddd=::,,,,,,,,,n::FFFFFFFFFFFFFF", "FF============::,,,,,,,,,,::FFFFFFFFFFFFFF", "FFFFFFFFFFFFFF~~~~~----~~~~~FFFFFFFFFFFFFF", "FFFFFFFFFFFFFF~~~~~----~~~~~FFFFFFFFFFFFFF", "FFFFFFFFFFFFFF::,,,,,,,,,,u:FFFFFFFFFFFFFF", "FF============::,,,,,i,,,,::============FF", "FF=.V........=::,,!,,,,!,,::=..i.....V.=FF", "FF=.......m..W::,Z,,,,,,Z,::W..........=FF", "FF=..........D::g,,,,,,,,,::D....g.....=FF", "FF=....g.....W::,,!,,,,!,,::W..........=FF", "FF=..e.......=::,Z,,,,,,Zh::=.......m..=FF", "FF============:q,,,,P,,,,,::============FF", "FFFFFFFFFFFFFF::,,,,,,,,,,::FFFFFFFFFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"], "sky": "city", "ang": 270, "amb": 1.0, "fog": 0.04, "legend": {",": {"f": 0, "c": 8, "sky": 1, "ft": "asphalt", "st": "concrete"}, ":": {"f": 0.1, "c": 8, "sky": 1, "ft": "sidewalk", "st": "concrete"}, "~": {"f": -0.3, "c": 8, "sky": 1, "ft": "water", "water": 1, "st": "concrete"}, "-": {"f": 0, "c": 8, "sky": 1, "ft": "planks", "st": "woodwall"}, ".": {"f": 0, "c": 1.6, "ft": "floor", "ct": "ceil"}, "W": {"s": 2, "f": 0, "c": 1.6}, "d": {"f": 0, "c": 1.6, "dark": 1, "l": 0.15, "lon": 1, "ft": "tatami"}}}, {"name": "WATERFALL CAVES", "map": ["RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR", "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR", "RR:::::::::RRRRRRRRRRRRRRRRRRRRRRRRRRRRR", "RR::::*::::RRRRRRRRRRRRRRR444444444444RR", "RR::$::::::RRRRRRRRRRRRRRR44w444444i44RR", "RR:::::::::RRRRRRRRRRRRRRR444444444444RR", "RR::::::E::RRRRRRRRRRRRRRR4444b4444444RR", "RR:M:::::::RRRRRRRRRRRRRRR444444444444RR", "RR:::::::::RRRRRRRRRRRRRRR4444444n4444RR", "RRRRR::RRRRRRRRRRRRRRRRRRR4k44444444o4RR", "RRRRRCCRRRRRRRRRRRRRRRRRRR444444444444RR", "RRRRRB:RRRRRRRRRRRRRRRRRRRRRRRRRRRIRRRRR", "RRRRR:::::::I000:e::::~~~~::::::::::::RR", "RRRRR:B::h::0000::::i:~~~~::m:::::::m:RR", "RRRRR:::::::----::::::~~~~::::::::::::RR", "RRRRR:::::::----::::::~~~~:w::::::s:::RR", "RRRRR:::::::0000::h:::~~~~::::::::::::RR", "RRRRR:::::::000I::::::~~~~::::::::::::RR", "RRRRR::::RRRRRRRR::RRRRRRRRRRRRRRRRRRRRR", "RRRRR::::RRRRRRRR::RRRRRRRRRRRRRRRRRRRRR", "RRRRR::n:RRRRRRRR::RRRRRRRRRRRRRRRRRRRRR", "RRRRR::::RRRRRRRR::RRRRRRRRRRRRRRRRRRRRR", "RRRRR::::RRRRRRRR::RRRRRRRRRRRRRRRRRRRRR", "RRRRR::::RRRRRRRR::RRRRRRRRRRRRRRRRRRRRR", "RRRRR::::RRRRRRRRUURRRRRRRRRRRRRRRRRRRRR", "RRRRR::::RRR::::::::~~~~~~~::::RRRRRRRRR", "R::::::::::R::::::::~~~~~~~::i:R.......R", "R:::::m::::R::w:::::~~~~~~~::::R...n...R", "R::P:::::::R:::::::::::::::::::D.......X", "R:::::::q::R:::::::::::::g::n::R.......R", "R::::::::::R:m:::::::::::::::::R....m..R", "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR"], "sky": "dusk", "ang": 0, "amb": 0.85, "fog": 0.07, "legend": {":": {"f": 0, "c": 2.2, "ft": "cavefl", "ct": "rock", "st": "rock"}, "0": {"f": -1.5, "c": 2.2, "ft": "water", "water": 1, "ct": "rock", "st": "rock"}, "-": {"f": 0, "c": 2.2, "ft": "planks", "ct": "rock", "st": "woodwall"}, "~": {"f": -0.3, "c": 2.2, "ft": "water", "water": 1, "ct": "rock", "st": "rock"}, "4": {"f": 1.0, "c": 2.8, "ft": "mossy", "ct": "rock", "st": "rock"}, ".": {"f": 0, "c": 1.6, "ft": "floor", "ct": "ceil"}, "C": {"s": 1, "wt": "crack", "crack": 1, "under": ":"}}}, {"name": "VEXCORP TOWER", "map": ["==========================================", "==========================================", "==========---------A-=----------==========", "==========--r---TT---=----g-----==========", "==========--------g--=---TT-----X=========", "==========---n-------=-w-----n--==========", "==========-----------=----------==========", "===============D=========Y================", "==========----------------------=--------=", "==========--g---------m------g--=-g------=", "==========----------------------=------i-=", "==========----TT-----------TT---=--------=", "==========----------------------=--------=", "=-----m--=-------WWWWWWWW-------=----4444=", "=--------=-B-----W------W-------=----4@44=", "=--P-----D------nW-g-c--Ww------K---I44b4=", "=--------=---e---W------W-----B-=----4444=", "=-u------=-------WWWDWWWW-------=----4444=", "==========----------------------=--------=", "==.......=----TT-----------TT---=---s----=", "==.E...p.S----------------------=--------=", "==..$....=--g----------------n--=o------m=", "==....*..=----------------------=--------=", "==.......===========U=====================", "============-------------------===========", "============--g---w----------s-===========", "============-TTT---------TTT---===========", "============------------n---y--===========", "============m--------l---------===========", "=========================================="], "sky": "city", "ang": 0, "amb": 1.0, "fog": 0.05, "legend": {"-": {"f": 0, "c": 1.8, "ft": "carpet", "ct": "office"}, "4": {"f": 1.0, "c": 2.6, "ft": "grate", "ct": "office"}, "W": {"s": 2, "f": 0, "c": 1.8}, ".": {"f": 0, "c": 1.4, "ft": "concrete", "ct": "office"}, "S": {"door": "s", "wt": "office"}}}, {"name": "THE EMBER GATE", "map": ["&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "&&&4444````````````````````````4444&&&", "&&&4o44````````````````````````44c4&&&", "&&&44o4```````n````````n```````4M44&&&", "&&&4444````````````````````````4444&&&", "&&&`/````````````````````````````/`&&&", "&&&`/```\"\"\"\"\"\"\"\"\"````\"\"\"\"\"\"\"\"\"```/`&&&", "&&&`````\"````````````````````\"`````&&&", "&&&`````\"````````````````````\"`````&&&", "&&&`````\"````````````````````\"`````&&&", "&&&`````\"```T`````O``````T```\"`````&&&", "&&&`````\"````````````````````\"`````&&&", "&&&````````````````````````````````&&&", "&&&````````````````````````````````&&&", "&&&````````````````````````````````&&&", "&&&`````\"````````````````````\"`````&&&", "&&&`````\"```T````````````T```\"`````&&&", "&&&`````\"````````````````````\"`````&&&", "&&&`````\"````````````````````\"`````&&&", "&&&`````\"````````````````````\"`````&&&", "&&&`/```\"\"\"\"\"\"\"\"\"````\"\"\"\"\"\"\"\"\"```/`&&&", "&&&`/````````````````````````````/`&&&", "&&&4444```i````````````````i```4444&&&", "&&&4444````````````````````````4o44&&&", "&&&4m44````````````````````````44A4&&&", "&&&4444````````````````````````4444&&&", "&&&&&&&&&&&&&&&&&&DD&&&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&maaaac&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&aaaaaa&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&oaaaao&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&aaaaaa&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&aaPaaa&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&akaMaa&&&&&&&&&&&&&&&&", "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"], "sky": "ember", "ang": 270, "amb": 1.0, "fog": 0.03, "boss": true, "mood": "bossLoop", "legend": {"`": {"f": 0, "c": 8, "sky": 1, "ft": "ashfloor", "st": "obsidian"}, "4": {"f": 1.0, "c": 8, "sky": 1, "ft": "obsidian", "st": "obsidian"}, "/": {"ramp": 1, "ft": "ashfloor"}, "\"": {"f": -0.2, "c": 8, "sky": 1, "ft": "lava", "hurt": 1, "st": "obsidian"}, "&": {"s": 1, "wt": "obsidian", "h": 3.5}}}];
  // =====================================================================
  //  "Shadow Warrior" (3D Realms, 1997) - our own take: KAI MORI, a
  //  freelance shadow operative, versus VexCorp and its summoned demons.
  //  Original hero, enemies, art and maps.
  // =====================================================================
  function GAMEDEF() {
    const BLK = rgb(14, 12, 16), WHT = rgb(255, 255, 255);
    function buildTextures(A) {
      const R = mkRng(1997);
      { const p = Pix(64, 64, rgb(226, 220, 204)); pnoise(p, R, .08); prect(p, 0, 0, 64, 5, rgb(70, 44, 30)); prect(p, 0, 59, 64, 5, rgb(70, 44, 30)); prect(p, 0, 0, 4, 64, rgb(84, 54, 36)); prect(p, 60, 0, 4, 64, rgb(84, 54, 36)); prect(p, 0, 30, 64, 3, rgb(84, 54, 36)); A.tex('plaster', p); }
      { const p = Pix(64, 64); for (let x = 0; x < 64; x += 8) { const c = rgb(96 + R() * 20, 60 + R() * 12, 36); prect(p, x, 0, 8, 64, c); prect(p, x + 7, 0, 1, 64, rgb(50, 30, 18)); for (let k = 0; k < 6; k++) prect(p, x + 2, R() * 64, 1, 4, scl(c, .8)); } A.tex('woodwall', p); }
      { const p = Pix(64, 64); for (let y = 0; y < 64; y += 8) { const c = rgb(150 + R() * 25, 104 + R() * 16, 62); prect(p, 0, y, 64, 8, c); prect(p, 0, y + 7, 64, 1, rgb(90, 60, 34)); prect(p, (R() * 64) | 0, y, 1, 8, rgb(90, 60, 34)); } pnoise(p, R, .1); A.tex('floor', p); }
      { const p = Pix(64, 64, rgb(196, 186, 120)); for (let y = 0; y < 64; y += 2) prect(p, 0, y, 64, 1, rgb(180, 170, 104)); prect(p, 0, 0, 64, 3, rgb(40, 60, 40)); prect(p, 0, 31, 64, 2, rgb(40, 60, 40)); pnoise(p, R, .06); A.tex('tatami', p); }
      { const p = Pix(64, 64, rgb(64, 42, 30)); for (let x = 0; x < 64; x += 16) prect(p, x, 0, 2, 64, rgb(40, 26, 18)); for (let y = 0; y < 64; y += 16) prect(p, 0, y, 64, 2, rgb(40, 26, 18)); pnoise(p, R, .1); A.tex('ceil', p); }
      A.tex('stone', texBricks(rgb(128, 126, 120), rgb(80, 78, 74), 21, 12, R, .2));
      { const p = texNoise(rgb(110, 112, 104), R, .25, 25, rgb(70, 110, 60)); A.tex('mossy', p); }
      A.tex('gravel', texNoise(rgb(120, 114, 100), R, .6));
      A.tex('grass', texNoise(rgb(70, 116, 52), R, .5, 20, rgb(96, 140, 60)));
      { const p = Pix(64, 64, rgb(176, 28, 30)); prect(p, 0, 0, 64, 6, rgb(220, 180, 60)); prect(p, 0, 58, 64, 6, rgb(220, 180, 60)); for (let x = 4; x < 64; x += 16) prect(p, x, 6, 2, 52, rgb(140, 20, 22)); pnoise(p, R, .08); A.tex('lacquer', p); }
      { const p = Pix(64, 64, rgb(150, 170, 90)); for (let x = 0; x < 64; x += 10) { prect(p, x, 0, 9, 64, rgb(130 + R() * 30, 160, 70)); for (let y = 8 + R() * 8; y < 64; y += 18) prect(p, x, y, 9, 2, rgb(90, 110, 50)); prect(p, x + 9, 0, 1, 64, rgb(70, 90, 40)); } A.tex('bamboo', p); }
      { const p = texNoise(rgb(128, 128, 124), R, .18); prect(p, 0, 31, 64, 2, rgb(92, 92, 90)); A.tex('concrete', p); }
      { const p = Pix(64, 64, rgb(70, 80, 96)); for (let y = 0; y < 64; y += 32) prect(p, 0, y, 64, 1, rgb(40, 46, 56)); for (let x = 0; x < 64; x += 16) prect(p, x, 0, 1, 64, rgb(50, 56, 68)); prect(p, 0, 44, 64, 3, rgb(120, 130, 150)); pnoise(p, R, .06); A.tex('office', p); }
      { const p = Pix(64, 64, rgb(40, 44, 62)); pnoise(p, R, .15); for (let y = 6; y < 64; y += 16) for (let x = 4; x < 64; x += 15) { const lit = R() < 0.5; prect(p, x, y, 9, 8, lit ? rgb(150, 220, 255) : rgb(20, 24, 40)); prect(p, x, y + 8, 9, 1, rgb(80, 84, 100)); } A.tex('facade', p); }
      { const p = Pix(64, 64, rgb(16, 10, 24)); ptext(p, '24H', 14, 8, rgb(255, 70, 90)); ptext(p, '24H', 15, 8, rgb(255, 70, 90)); prect(p, 6, 22, 52, 1, rgb(80, 255, 220)); ptext(p, 'OPEN', 10, 30, rgb(255, 220, 80)); prect(p, 6, 44, 52, 1, rgb(80, 255, 220)); ptext(p, 'TEA', 14, 50, rgb(150, 255, 120)); A.tex('neon', p, true); }
      { const p = Pix(64, 64, rgb(30, 32, 38)); prect(p, 0, 0, 64, 4, rgb(60, 64, 76)); ppoly(p, [12, 14, 22, 14, 32, 40, 42, 14, 52, 14, 36, 54, 28, 54], rgb(220, 30, 40)); ptext(p, 'VEX', 23, 56, rgb(200, 200, 210)); A.tex('vexlogo', p); }
      { const p = Pix(64, 64, rgb(26, 30, 34)); for (let y = 2; y < 64; y += 10) for (let x = 2; x < 64; x += 10) { prect(p, x, y, 8, 6, rgb(20, 40, 60)); pset(p, x + 2, y + 2, R() < .5 ? rgb(80, 220, 255) : rgb(255, 80, 120)); } prect(p, 8, 20, 22, 14, rgb(10, 30, 50)); for (let y = 22; y < 33; y += 2) prect(p, 10, y, 4 + R() * 16, 1, rgb(120, 255, 200)); A.tex('tech', p); }
      { const p = Pix(64, 64, rgb(24, 20, 26)); for (let k = 0; k < 14; k++) { let x = R() * 64, y = R() * 64; for (let s = 0; s < 18; s++) { x += R() * 4 - 2; y += R() * 4 - 2; pset(p, x, y, rgb(255, 110 + R() * 60, 30)); } } pnoise(p, R, .3); A.tex('obsidian', p); }
      { const p = Pix(64, 64, rgb(36, 28, 32)); for (let k = 0; k < 20; k++) pell(p, R() * 64, R() * 64, 4 + R() * 6, 3 + R() * 4, rgb(50 + R() * 20, 36, 40)); for (let k = 0; k < 8; k++) pline(p, R() * 64, R() * 64, R() * 64, R() * 64, rgb(200, 80, 20)); A.tex('ashfloor', p); }
      { const p = Pix(64, 64, rgb(230, 80, 10)); for (let k = 0; k < 30; k++) pell(p, R() * 64, R() * 64, 2 + R() * 5, 2 + R() * 4, R() < .5 ? rgb(255, 200, 40) : rgb(180, 30, 0)); A.tex('lava', p, true, 0.4); }
      { const p = Pix(64, 64, rgb(40, 100, 140)); for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x++) pset(p, x, y + Math.sin(x / 64 * 6.283 * 2) * 2 + 3, rgb(110, 180, 220)); A.tex('water', p, false, 1); }
      A.tex('rock', texNoise(rgb(100, 92, 84), R, .5, 30, rgb(70, 64, 58)));
      A.tex('cavefl', texNoise(rgb(84, 78, 70), R, .45, 20, rgb(64, 60, 54)));
      A.tex('asphalt', texNoise(rgb(52, 52, 56), R, .35, 6, rgb(40, 40, 44)));
      { const p = texNoise(rgb(150, 148, 140), R, .15); prect(p, 0, 31, 64, 2, rgb(100, 98, 94)); prect(p, 31, 0, 2, 64, rgb(100, 98, 94)); A.tex('sidewalk', p); }
      { const p = Pix(64, 64, rgb(70, 74, 92)); for (let y = 0; y < 64; y += 4) for (let x = (y & 4); x < 64; x += 8) prect(p, x, y, 4, 4, rgb(80, 84, 104)); A.tex('carpet', p); }
      { const p = Pix(64, 64, rgb(40, 40, 46)); prect(p, 6, 6, 52, 52, rgb(24, 24, 28)); pell(p, 32, 28, 16, 16, rgb(200, 30, 30)); pell(p, 32, 28, 10, 10, rgb(255, 120, 60)); ptext(p, 'EXIT', 21, 48, rgb(255, 230, 200)); A.tex('exit', p, true); }
      { const p = texNoise(rgb(128, 128, 122), R, .2); prect(p, 26, 22, 12, 20, rgb(220, 220, 210)); prect(p, 30, 26, 4, 7, rgb(60, 60, 60)); prect(p, 30, 26, 4, 3, rgb(240, 200, 60)); A.tex('switch', p); }
      { const p = Pix(64, 64, rgb(60, 40, 28)); pell(p, 32, 32, 26, 26, rgb(200, 160, 60)); pell(p, 32, 32, 20, 20, rgb(170, 130, 40)); pell(p, 32, 32, 8, 8, rgb(220, 190, 90)); prect(p, 28, 0, 8, 8, rgb(40, 26, 18)); A.tex('gong', p); }
      { const p = Pix(64, 64, rgb(40, 140, 60)); prect(p, 4, 4, 40, 56, rgb(230, 240, 230)); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { prect(p, 7 + c * 9, 7 + r * 13, 6, 10, [rgb(90, 160, 60), rgb(200, 160, 60), rgb(60, 140, 200), rgb(200, 60, 60)][(r + c) % 4]); prect(p, 7 + c * 9, 7 + r * 13, 6, 2, rgb(200, 200, 200)); } prect(p, 48, 10, 10, 6, rgb(30, 30, 30)); prect(p, 48, 22, 10, 14, rgb(20, 20, 20)); ptext(p, 'TEA', 46, 44, WHT); A.tex('vend', p, true); }
      { const p = texNoise(rgb(120, 118, 112), R, .2); let x = 10, y = 0; for (let s = 0; s < 70; s++) { x += R() * 3 - 1; y += 1; pset(p, x, y, rgb(40, 40, 40)); if (R() < .15) pline(p, x, y, x + R() * 20 - 10, y + R() * 10, rgb(50, 50, 50)); } A.tex('crack', p); }
      { const p = Pix(64, 64, rgb(80, 52, 32)); prect(p, 3, 3, 58, 58, rgb(110, 72, 44)); prect(p, 30, 3, 4, 58, rgb(70, 46, 28)); for (let y = 10; y < 60; y += 12) prect(p, 3, y, 58, 2, rgb(80, 52, 32)); pell(p, 26, 32, 2, 2, rgb(220, 190, 80)); pell(p, 38, 32, 2, 2, rgb(220, 190, 80)); A.tex('door', p); }
      for (const [n, c] of [['doorr', rgb(220, 30, 30)], ['doorb', rgb(40, 90, 240)], ['doory', rgb(240, 200, 40)]]) { const p = Pix(64, 64, rgb(80, 52, 32)); prect(p, 3, 3, 58, 58, rgb(100, 66, 40)); pell(p, 32, 32, 14, 14, c); pell(p, 32, 32, 8, 8, rgb(30, 20, 14)); pell(p, 32, 32, 4, 4, c); A.tex(n, p); }
      { const p = Pix(64, 64, rgb(90, 92, 96)); prect(p, 0, 0, 64, 6, rgb(230, 190, 20)); prect(p, 0, 58, 64, 6, rgb(230, 190, 20)); for (let x = 0; x < 64; x += 12) { prect(p, x, 0, 6, 6, BLK); prect(p, x + 6, 58, 6, 6, BLK); } A.tex('lift', p); }
      { const p = Pix(64, 64, rgb(40, 34, 30)); for (let y = 0; y < 64; y += 8) for (let x = ((y >> 3) & 1) * 8; x < 64; x += 16) pell(p, x + 8, y + 8, 8, 6, rgb(60, 56, 54)); A.tex('rooftile', p); }
      { const p = Pix(64, 64, rgb(60, 62, 66)); for (let y = 0; y < 64; y += 4) prect(p, 0, y, 64, 1, rgb(30, 32, 34)); for (let x = 0; x < 64; x += 4) prect(p, x, 0, 1, 64, rgb(36, 38, 40)); A.tex('grate', p); }
      { const p = Pix(64, 64, rgb(120, 80, 50)); for (let y = 0; y < 64; y += 12) { prect(p, 0, y, 64, 10, rgb(136 + R() * 20, 92, 56)); prect(p, 0, y + 10, 64, 2, rgb(60, 40, 24)); } A.tex('planks', p); }
    }
    function sky(w, h, top, bot, R, mountains, extra) {
      const p = Pix(w, h);
      for (let y = 0; y < h; y++) { const c = mix(top, bot, Math.min(1, y / (h * 0.72))); for (let x = 0; x < w; x++) p.d[y * w + x] = c; }
      for (let k = 0; k < 90; k++) pset(p, R() * w, R() * h * 0.5, mix(WHT, top, R() * 0.6));
      if (extra) extra(p);
      if (mountains) {
        let hgt = 30; for (let x = 0; x < w; x++) { hgt += (R() - .5) * 4; hgt = Math.max(12, Math.min(48, hgt)); for (let y = 104 - hgt; y < h; y++) pset(p, x, y, y < 104 - hgt + 3 ? scl(mountains, 1.4) : mountains); }
        let h2 = 14; for (let x = 0; x < w; x++) { h2 += (R() - .5) * 3; h2 = Math.max(4, Math.min(26, h2)); for (let y = 104 - h2; y < h; y++) pset(p, x, y, scl(mountains, .6)); }
      }
      return p;
    }
    // ---------------- sprites ----------------
    function guard(fr) {
      const p = Pix(40, 54), suit = rgb(70, 74, 84), suitd = rgb(44, 46, 54), hel = rgb(40, 42, 50), vis = rgb(200, 40, 50), sk = rgb(200, 160, 120);
      if (fr === 5) { pell(p, 20, 49, 17, 4, suitd); pell(p, 6, 47, 5, 4, hel); prect(p, 28, 49, 9, 3, rgb(30, 30, 30)); poutline(p, BLK); return p; }
      const l = fr === 0 ? -3 : fr === 1 ? 3 : 0, ln = fr === 4 ? 5 : 0;
      prect(p, 14 + l, 36, 5, 15, suitd); prect(p, 22 - l, 36, 5, 15, suitd); prect(p, 13 + l, 50, 7, 3, BLK); prect(p, 21 - l, 50, 7, 3, BLK);
      prect(p, 11 + ln / 2, 18, 18, 19, suit); ppoly(p, [17 + ln / 2, 18, 23 + ln / 2, 18, 20 + ln / 2, 26], rgb(230, 230, 230)); prect(p, 19 + ln / 2, 19, 2, 7, rgb(160, 20, 30));
      pell(p, 20 + ln, 10 + ln / 2, 7, 8, hel); prect(p, 14 + ln, 10 + ln / 2, 12, 4, fr === 3 ? WHT : vis); prect(p, 15 + ln, 15 + ln / 2, 10, 3, sk);
      prect(p, 7, 19, 4, 12, suit); prect(p, 29, 20, 4, 6, suit); prect(p, 28, 24, 11, 4, rgb(30, 30, 34)); prect(p, 31, 27, 3, 5, rgb(30, 30, 34));
      if (fr === 2) pell(p, 38, 25, 3, 3, rgb(255, 230, 140));
      poutline(p, BLK); return p;
    }
    function ninja(fr) {
      const p = Pix(40, 54), c = rgb(56, 34, 70), cd = rgb(34, 20, 44), sc = rgb(200, 30, 40);
      if (fr === 5) { pell(p, 20, 49, 17, 4, cd); pell(p, 6, 47, 5, 4, c); prect(p, 12, 47, 10, 2, sc); poutline(p, BLK); return p; }
      const l = fr === 0 ? -3 : fr === 1 ? 3 : 0, ln = fr === 4 ? 5 : 0;
      prect(p, 14 + l, 34, 5, 16, cd); prect(p, 22 - l, 34, 5, 16, cd); prect(p, 13 + l, 49, 6, 3, BLK); prect(p, 21 - l, 49, 6, 3, BLK);
      ppoly(p, [11 + ln, 18, 29 + ln, 18, 31, 38, 9, 38], c); prect(p, 11, 30, 18, 2, sc);
      pell(p, 20 + ln, 11, 7, 8, c); prect(p, 14 + ln, 9, 12, 3, cd); pell(p, 17 + ln, 10, 1.5, 1, fr === 3 ? WHT : rgb(230, 255, 255)); pell(p, 23 + ln, 10, 1.5, 1, fr === 3 ? WHT : rgb(230, 255, 255));
      pline(p, 14 + ln, 17, 6, 22 + (fr & 1) * 3, sc, 2);
      if (fr === 2) { prect(p, 29, 14, 4, 8, c); ppoly(p, [36, 8, 38, 12, 42, 13, 38, 14, 36, 18, 35, 14, 31, 13, 35, 12], rgb(220, 220, 230)); }
      else { prect(p, 29, 20, 4, 10, c); prect(p, 7, 20, 4, 10, c); }
      poutline(p, BLK); return p;
    }
    function imp(fr) {
      const p = Pix(30, 30), f1 = rgb(255, 140, 30), f2 = rgb(255, 220, 80), f3 = rgb(200, 50, 10);
      if (fr === 5) { pell(p, 15, 27, 10, 3, rgb(80, 40, 30)); return p; }
      const w = (fr & 1) ? 4 : 0;
      ppoly(p, [2, 8 + w, 10, 14, 4, 20 - w], f3); ppoly(p, [28, 8 + w, 20, 14, 26, 20 - w], f3);
      ppoly(p, [15, 0, 22, 12, 22, 22, 15, 28, 8, 22, 8, 12], f1); pell(p, 15, 17, 5, 7, f2);
      pell(p, 12, 14, 2, 2, BLK); pell(p, 18, 14, 2, 2, BLK); pset(p, 12, 13, WHT); pset(p, 18, 13, WHT);
      if (fr === 2) pell(p, 15, 21, 4, 3, WHT);
      if (fr === 3) pell(p, 15, 15, 6, 6, WHT);
      return p;
    }
    function hound(fr) {
      const p = Pix(48, 30), b = rgb(70, 70, 78), bd = rgb(44, 44, 52);
      if (fr === 5) { pell(p, 24, 26, 20, 4, bd); poutline(p, BLK); return p; }
      const l = fr === 0 ? 3 : fr === 1 ? -3 : 0;
      prect(p, 12 + l, 18, 4, 11, bd); prect(p, 20 - l, 18, 4, 11, bd); prect(p, 30 + l, 18, 4, 11, bd); prect(p, 37 - l, 18, 4, 11, bd);
      pell(p, 26, 15, 16, 7, b); for (let k = 0; k < 6; k++) pell(p, 14 + k * 5, 9 + (k & 1), 3, 3, rgb(110, 110, 120));
      pell(p, 9, 12, 8, 6, b); ppoly(p, [2, 12, 6, 6, 8, 12], bd); pell(p, 6, 11, 2, 1.5, rgb(255, 40, 30)); pell(p, 11, 11, 2, 1.5, rgb(255, 40, 30));
      if (fr === 2) { ppoly(p, [0, 14, 8, 15, 0, 19], rgb(240, 240, 230)); }
      pline(p, 42, 13, 47, 6 + (fr & 1) * 3, b, 2);
      poutline(p, BLK); return p;
    }
    function sentinel(fr) {
      const p = Pix(60, 80), s = rgb(130, 128, 118), sd = rgb(90, 88, 82), gl = rgb(255, 140, 40);
      if (fr === 5) { for (let k = 0; k < 7; k++) pell(p, 8 + k * 7, 74 - (k & 1) * 3, 6, 5, k & 1 ? s : sd); poutline(p, BLK); return p; }
      const l = fr === 0 ? -3 : fr === 1 ? 3 : 0, ln = fr === 4 ? 5 : 0;
      prect(p, 16 + l, 54, 11, 22, sd); prect(p, 33 - l, 54, 11, 22, sd); prect(p, 14 + l, 74, 15, 6, sd); prect(p, 31 - l, 74, 15, 6, sd);
      prect(p, 12 + ln / 2, 24, 36, 32, s); prect(p, 12, 24, 36, 4, sd); pline(p, 20, 30, 28, 48, gl); pline(p, 28, 48, 38, 40, gl); pline(p, 38, 30, 34, 52, gl);
      prect(p, 22 + ln, 6 + ln, 16, 18, s); ppoly(p, [18 + ln, 8 + ln, 30 + ln, 0, 42 + ln, 8 + ln], sd); prect(p, 25 + ln, 13 + ln, 4, 3, fr === 3 ? WHT : gl); prect(p, 31 + ln, 13 + ln, 4, 3, fr === 3 ? WHT : gl);
      prect(p, 2, 26, 10, 26, sd); prect(p, 48, 26, 10, 26, sd); pell(p, 7, 54, 6, 5, s); pell(p, 53, 54, 6, 5, s);
      if (fr === 2) { pell(p, 53, 54, 7, 7, gl); pell(p, 7, 54, 7, 7, gl); }
      poutline(p, BLK); return p;
    }
    function wraith(fr) {
      const p = Pix(40, 56), g = rgb(170, 200, 230), gd = rgb(110, 140, 180);
      if (fr === 5) { pell(p, 20, 52, 14, 3, gd); pell(p, 30, 50, 3, 3, rgb(255, 220, 100)); return p; }
      const sw = (fr & 1) ? 2 : -2;
      ppoly(p, [20, 2, 32, 12, 34 + sw, 50, 28, 46, 24, 54, 18, 46, 12, 52, 6 - sw, 44, 8, 12], g); ppoly(p, [20, 6, 28, 14, 20, 20, 12, 14], gd);
      pell(p, 17, 13, 2, 2, BLK); pell(p, 23, 13, 2, 2, BLK);
      pline(p, 30, 24, 34, 30, gd, 2); prect(p, 31, 30, 6, 8, rgb(60, 40, 30)); pell(p, 34, 34, 2.5, 3, fr === 2 ? WHT : rgb(255, 220, 100));
      if (fr === 3) pell(p, 20, 20, 8, 10, WHT);
      return p;
    }
    function colossus(fr) {
      const p = Pix(110, 120), o = rgb(40, 34, 44), od = rgb(24, 20, 28), mg = rgb(255, 120, 20), mg2 = rgb(255, 220, 90);
      if (fr === 5) { for (let k = 0; k < 9; k++) pell(p, 10 + k * 11, 112 - (k & 1) * 4, 10, 7, k & 1 ? o : od); for (let k = 0; k < 5; k++) pell(p, 18 + k * 18, 110, 3, 2, mg); poutline(p, BLK); return p; }
      const l = fr === 0 ? -4 : fr === 1 ? 4 : 0;
      prect(p, 30 + l, 84, 18, 34, od); prect(p, 62 - l, 84, 18, 34, od); prect(p, 26 + l, 112, 26, 8, o); prect(p, 58 - l, 112, 26, 8, o);
      ppoly(p, [20, 30, 90, 30, 82, 88, 28, 88], o); pell(p, 55, 56, 14, 14, fr === 3 ? WHT : mg); pell(p, 55, 56, 8, 8, mg2);
      for (let k = 0; k < 6; k++) pline(p, 30 + k * 9, 34, 26 + k * 10, 84, k & 1 ? mg : od);
      prect(p, 42, 8, 26, 24, o); for (let k = 0; k < 5; k++) ppoly(p, [42 + k * 6, 8, 45 + k * 6, 0, 48 + k * 6, 8], od); prect(p, 46, 18, 7, 4, mg2); prect(p, 57, 18, 7, 4, mg2);
      const up = fr === 2 ? -12 : 0;
      ppoly(p, [20, 32, 6, 40 + up, 2, 72 + up, 14, 74 + up, 26, 46], od); prect(p, 0, 70 + up, 16, 12, o); pell(p, 8, 82 + up, 5, 3, fr === 2 ? mg2 : BLK);
      ppoly(p, [90, 32, 104, 40 + up, 108, 72 + up, 96, 74 + up, 84, 46], od); prect(p, 94, 70 + up, 16, 12, o); pell(p, 102, 82 + up, 5, 3, fr === 2 ? mg2 : BLK);
      poutline(p, BLK); return p;
    }
    function frames(A, name, fn, ppu, full) { const n = ['w0', 'w1', 'atk', 'pain', 'die', 'dead']; for (let f = 0; f < 6; f++) A.spr(name + '_' + n[f], fn(f), ppu, full); }
    function item(w, h, fn) { const p = Pix(w, h); fn(p); poutline(p, BLK); return p; }
    function buildSprites(A) {
      frames(A, 'gu', guard); frames(A, 'nj', ninja); frames(A, 'im', imp, 64, true); frames(A, 'hd', hound); frames(A, 'st', sentinel); frames(A, 'wr', wraith); frames(A, 'co', colossus, 46);
      const star = (p, cx, cy, r, c) => { ppoly(p, [cx, cy - r, cx + r * .3, cy - r * .3, cx + r, cy, cx + r * .3, cy + r * .3, cx, cy + r, cx - r * .3, cy + r * .3, cx - r, cy, cx - r * .3, cy - r * .3], c); pell(p, cx, cy, r * .2, r * .2, BLK); };
      A.spr('medkit', item(18, 14, p => { prect(p, 0, 2, 18, 12, rgb(240, 240, 240)); prect(p, 7, 4, 4, 8, rgb(40, 160, 80)); prect(p, 5, 6, 8, 4, rgb(40, 160, 80)); prect(p, 6, 0, 6, 2, rgb(120, 120, 120)); }));
      A.spr('tonic', item(10, 14, p => { prect(p, 2, 4, 6, 10, rgb(120, 200, 120)); prect(p, 3, 0, 4, 4, rgb(150, 110, 60)); prect(p, 2, 7, 6, 3, rgb(240, 240, 220)); }));
      A.spr('bigmed', item(22, 22, p => { pell(p, 11, 11, 10, 10, rgb(80, 220, 160)); prect(p, 9, 4, 4, 14, WHT); prect(p, 4, 9, 14, 4, WHT); }), 64, true);
      A.spr('teacan', item(8, 12, p => { prect(p, 0, 0, 8, 12, rgb(40, 140, 60)); prect(p, 0, 4, 8, 3, rgb(230, 240, 220)); prect(p, 0, 0, 8, 1, rgb(190, 190, 190)); }));
      A.spr('armor', item(22, 20, p => { ppoly(p, [2, 2, 8, 0, 14, 0, 20, 2, 19, 19, 3, 19], rgb(40, 40, 50)); prect(p, 6, 6, 10, 8, rgb(70, 70, 84)); prect(p, 3, 10, 16, 2, rgb(180, 30, 40)); }));
      A.spr('stars', item(16, 12, p => { star(p, 5, 6, 5, rgb(200, 200, 210)); star(p, 11, 6, 5, rgb(170, 170, 180)); }));
      A.spr('shells', item(18, 10, p => { prect(p, 0, 0, 18, 10, rgb(40, 60, 140)); for (let k = 0; k < 4; k++) prect(p, 2 + k * 4, 2, 3, 6, rgb(240, 200, 60)); }));
      A.spr('clip', item(10, 14, p => { prect(p, 2, 0, 6, 14, rgb(60, 60, 66)); prect(p, 3, 1, 4, 2, rgb(230, 190, 60)); }));
      A.spr('rockets', item(20, 12, p => { for (let k = 0; k < 2; k++) { prect(p, 0, 2 + k * 5, 16, 3, rgb(120, 120, 90)); prect(p, 16, 2 + k * 5, 4, 3, rgb(230, 60, 40)); } }));
      A.spr('sticky', item(12, 12, p => { pell(p, 6, 7, 6, 5, rgb(90, 200, 90)); pell(p, 6, 7, 3, 2, rgb(160, 255, 160)); prect(p, 5, 0, 2, 3, rgb(220, 50, 50)); }));
      A.spr('charm', item(10, 18, p => { prect(p, 0, 0, 10, 18, rgb(240, 230, 190)); pline(p, 5, 2, 3, 8, rgb(60, 120, 255), 2); pline(p, 3, 8, 7, 9, rgb(60, 120, 255), 2); pline(p, 7, 9, 4, 16, rgb(60, 120, 255), 2); }), 64, true);
      A.spr('w_riot', item(36, 10, p => { prect(p, 0, 3, 24, 3, rgb(60, 60, 70)); prect(p, 22, 2, 14, 6, rgb(40, 40, 46)); prect(p, 8, 6, 8, 3, rgb(70, 70, 76)); }));
      A.spr('w_uzi', item(22, 16, p => { prect(p, 0, 2, 18, 6, rgb(50, 50, 56)); prect(p, 8, 8, 4, 8, rgb(40, 40, 44)); prect(p, 14, 6, 4, 6, rgb(50, 50, 56)); }));
      A.spr('w_launch', item(40, 14, p => { prect(p, 0, 2, 34, 10, rgb(80, 80, 60)); prect(p, 0, 1, 4, 12, rgb(50, 50, 40)); prect(p, 20, 10, 6, 4, rgb(40, 40, 40)); }));
      A.spr('key_r', item(14, 16, p => { pell(p, 7, 5, 6, 5, rgb(230, 40, 40)); prect(p, 6, 9, 3, 7, rgb(230, 40, 40)); prect(p, 8, 12, 4, 2, rgb(230, 40, 40)); pell(p, 7, 5, 2, 2, BLK); }), 64, true);
      A.spr('key_b', item(14, 16, p => { pell(p, 7, 5, 6, 5, rgb(50, 100, 250)); prect(p, 6, 9, 3, 7, rgb(50, 100, 250)); prect(p, 8, 12, 4, 2, rgb(50, 100, 250)); pell(p, 7, 5, 2, 2, BLK); }), 64, true);
      A.spr('key_y', item(14, 16, p => { pell(p, 7, 5, 6, 5, rgb(250, 210, 40)); prect(p, 6, 9, 3, 7, rgb(250, 210, 40)); prect(p, 8, 12, 4, 2, rgb(250, 210, 40)); pell(p, 7, 5, 2, 2, BLK); }), 64, true);
      A.spr('focus', item(16, 16, p => { pell(p, 8, 8, 8, 8, rgb(200, 60, 220)); pell(p, 8, 8, 4, 4, rgb(255, 200, 255)); }), 64, true);
      A.spr('oneup', item(16, 16, p => { pell(p, 8, 8, 8, 8, rgb(255, 210, 40)); ptext(p, '1', 5, 4, rgb(120, 60, 0)); }), 64, true);
      A.spr('barrel', item(20, 28, p => { prect(p, 1, 1, 18, 27, rgb(60, 110, 60)); prect(p, 1, 6, 18, 2, rgb(30, 70, 30)); prect(p, 1, 20, 18, 2, rgb(30, 70, 30)); ppoly(p, [10, 9, 14, 16, 10, 19, 6, 16], rgb(255, 220, 40)); prect(p, 3, 1, 3, 27, rgb(100, 150, 90)); }));
      A.spr('lantern', item(16, 40, p => { prect(p, 2, 34, 12, 6, rgb(110, 108, 100)); prect(p, 6, 20, 4, 14, rgb(120, 118, 110)); prect(p, 1, 10, 14, 10, rgb(130, 128, 120)); prect(p, 4, 12, 8, 6, rgb(255, 200, 90)); ppoly(p, [0, 10, 8, 2, 16, 10], rgb(100, 98, 92)); }));
      A.spr('lantern_b', item(16, 40, p => { prect(p, 2, 34, 12, 6, rgb(110, 108, 100)); prect(p, 6, 26, 4, 8, rgb(120, 118, 110)); }));
      A.spr('tree', item(48, 96, p => { prect(p, 21, 50, 7, 46, rgb(90, 60, 40)); pline(p, 24, 60, 10, 44, rgb(90, 60, 40), 3); pline(p, 24, 56, 38, 40, rgb(90, 60, 40), 3); const R = mkRng(5); for (let k = 0; k < 40; k++) pell(p, 6 + R() * 36, 8 + R() * 44, 4 + R() * 4, 3 + R() * 3, R() < .5 ? rgb(250, 180, 210) : rgb(230, 140, 180)); }));
      A.spr('crate', item(26, 26, p => { prect(p, 0, 0, 26, 26, rgb(150, 110, 60)); prect(p, 2, 2, 22, 22, rgb(176, 130, 76)); pline(p, 2, 2, 23, 23, rgb(120, 84, 40), 2); pline(p, 23, 2, 2, 23, rgb(120, 84, 40), 2); }));
      A.spr('car', item(64, 34, p => { ppoly(p, [0, 16, 12, 14, 18, 4, 44, 4, 52, 14, 64, 16, 64, 28, 0, 28], rgb(200, 200, 205)); prect(p, 20, 7, 10, 7, rgb(60, 80, 100)); prect(p, 33, 7, 10, 7, rgb(60, 80, 100)); pell(p, 13, 28, 6, 6, BLK); pell(p, 51, 28, 6, 6, BLK); prect(p, 0, 18, 4, 3, rgb(255, 240, 160)); prect(p, 60, 18, 4, 3, rgb(230, 40, 30)); }));
      A.spr('car_b', item(64, 30, p => { ppoly(p, [0, 16, 12, 14, 18, 8, 44, 8, 52, 14, 64, 16, 64, 26, 0, 26], rgb(50, 46, 44)); pell(p, 13, 25, 6, 5, BLK); pell(p, 51, 25, 6, 5, BLK); }));
      A.spr('turret', item(40, 40, p => { prect(p, 14, 26, 12, 14, rgb(60, 64, 60)); prect(p, 6, 36, 28, 4, rgb(50, 54, 50)); prect(p, 4, 12, 32, 16, rgb(80, 90, 76)); prect(p, 10, 4, 6, 10, rgb(40, 40, 40)); prect(p, 24, 4, 6, 10, rgb(40, 40, 40)); prect(p, 8, 16, 24, 3, rgb(230, 190, 30)); }));
      A.spr('cart', item(64, 44, p => { ppoly(p, [2, 20, 10, 10, 54, 10, 62, 20, 62, 36, 2, 36], rgb(80, 96, 70)); prect(p, 18, 2, 28, 12, rgb(60, 74, 54)); prect(p, 28, 4, 30, 4, rgb(40, 40, 40)); for (let k = 0; k < 4; k++) pell(p, 9 + k * 15, 37, 6, 6, BLK); prect(p, 4, 22, 56, 3, rgb(230, 190, 30)); }));
      A.spr('estar', item(10, 10, p => star(p, 5, 5, 5, rgb(220, 220, 230))), 64, true);
      A.spr('pstar', item(10, 10, p => star(p, 5, 5, 5, rgb(240, 240, 255))), 64, true);
      A.spr('pstar2', item(10, 10, p => { ppoly(p, [5, 0, 10, 5, 5, 10, 0, 5], rgb(240, 240, 255)); pell(p, 5, 5, 1, 1, BLK); }), 64, true);
      A.spr('rocket', item(14, 6, p => { prect(p, 2, 1, 9, 4, rgb(200, 200, 200)); prect(p, 11, 1, 3, 4, rgb(230, 50, 30)); prect(p, 0, 0, 3, 6, rgb(100, 100, 100)); }), 64, true);
      A.spr('fireball', item(10, 10, p => { pell(p, 5, 5, 5, 5, rgb(255, 140, 30)); pell(p, 5, 5, 2.5, 2.5, rgb(255, 250, 180)); }), 64, true);
      A.spr('bluefire', item(10, 10, p => { pell(p, 5, 5, 5, 5, rgb(80, 160, 255)); pell(p, 5, 5, 2.5, 2.5, rgb(220, 240, 255)); }), 64, true);
      A.spr('boulder', item(14, 14, p => { pell(p, 7, 7, 7, 7, rgb(120, 110, 100)); pell(p, 5, 5, 3, 2, rgb(160, 150, 140)); pell(p, 8, 9, 2, 2, rgb(255, 140, 40)); }));
      // first-person views: dark tactical gloves
      const GL = rgb(36, 36, 42), GLH = rgb(70, 70, 82), WR = rgb(150, 30, 36), SL = rgb(30, 30, 36);
      const hand = (p, x, y) => { prect(p, x - 13, y + 8, 26, 30, SL); prect(p, x - 13, y + 8, 26, 4, WR); pell(p, x, y + 2, 13, 11, GL); for (let k = 0; k < 4; k++) { pell(p, x - 8 + k * 5.5, y - 7, 3, 5, k & 1 ? GL : GLH); } pell(p, x + 11, y - 2, 4, 6, GLH); };
      { const mk = f => { const p = Pix(150, 90); if (!f) { ppoly(p, [96, 4, 102, 2, 84, 58, 78, 58], rgb(220, 225, 235)); pline(p, 99, 4, 82, 56, WHT); prect(p, 70, 56, 22, 5, rgb(200, 170, 60)); ppoly(p, [74, 60, 84, 60, 80, 90, 70, 90], rgb(40, 30, 36)); for (let y = 64; y < 90; y += 5) pline(p, 72, y, 82, y + 2, rgb(180, 30, 40)); hand(p, 80, 74); } else { ppoly(p, [0, 30, 120, 52, 120, 58, 0, 40], rgb(230, 235, 245)); pline(p, 0, 31, 120, 53, WHT); for (let k = 0; k < 12; k++) pset(p, 10 + k * 9, 36 + k * 1.8, rgb(180, 220, 255)); prect(p, 118, 50, 6, 12, rgb(200, 170, 60)); ppoly(p, [122, 52, 150, 60, 150, 70, 122, 62], rgb(40, 30, 36)); hand(p, 134, 70); } poutline(p, BLK); return p; }; A.spr('v_katana', mk(0)); A.spr('v_katana_f', mk(1)); }
      { const mk = f => { const p = Pix(100, 80); const y = f ? 20 : 36; star(p, 44, y, 9, rgb(200, 200, 210)); star(p, 56, y - 4, 9, rgb(220, 220, 230)); star(p, 66, y + 2, 9, rgb(180, 180, 190)); hand(p, 56, y + 22); prect(p, 42, y + 34, 28, 40, SL); poutline(p, BLK); return p; }; A.spr('v_star', mk(0)); A.spr('v_star_f', mk(1)); }
      { const mk = f => { const p = Pix(100, 70); if (f) { pell(p, 50, 6, 14, 8, rgb(255, 230, 120)); pell(p, 50, 6, 7, 4, WHT); } prect(p, 44, 10, 12, 40, rgb(60, 60, 70)); prect(p, 46, 10, 3, 40, rgb(110, 110, 120)); prect(p, 40, 30, 20, 8, rgb(40, 40, 46)); prect(p, 38, 46, 24, 24, rgb(50, 50, 56)); hand(p, 36, 56); hand(p, 64, 60); poutline(p, BLK); return p; }; A.spr('v_riot', mk(0)); A.spr('v_riot_f', mk(1)); }
      { const mk = f => { const p = Pix(110, 70); for (const cx of [30, 80]) { if (f) pell(p, cx + (cx < 50 ? 2 : -2), 14, 8, 6, rgb(255, 230, 120)); prect(p, cx - 6, 20, 12, 26, rgb(50, 50, 56)); prect(p, cx - 4, 18, 8, 4, rgb(30, 30, 34)); prect(p, cx - 3, 36, 6, 14, rgb(40, 40, 44)); hand(p, cx, 56); } poutline(p, BLK); return p; }; A.spr('v_uzi', mk(0)); A.spr('v_uzi_f', mk(1)); }
      { const mk = f => { const p = Pix(110, 70); if (f) pell(p, 64, 12, 16, 10, rgb(255, 200, 100)); prect(p, 52, 12, 26, 44, rgb(84, 84, 66)); prect(p, 50, 10, 30, 6, rgb(56, 56, 44)); pell(p, 65, 13, 10, 3, BLK); prect(p, 46, 50, 36, 20, rgb(60, 60, 50)); hand(p, 60, 60); poutline(p, BLK); return p; }; A.spr('v_launch', mk(0)); A.spr('v_launch_f', mk(1)); }
      { const mk = f => { const p = Pix(90, 76); const y = f ? 16 : 30; pell(p, 52, y, 10, 8, rgb(90, 200, 90)); pell(p, 50, y - 2, 4, 3, rgb(170, 255, 170)); prect(p, 51, y - 12, 2, 6, rgb(220, 50, 50)); hand(p, 52, y + 18); prect(p, 40, y + 30, 26, 40, SL); poutline(p, BLK); return p; }; A.spr('v_sticky', mk(0)); A.spr('v_sticky_f', mk(1)); }
      { const mk = f => { const p = Pix(90, 80); prect(p, 44, 20, 16, 30, rgb(240, 230, 190)); pline(p, 53, 24, 48, 34, rgb(60, 120, 255), 2); pline(p, 48, 34, 56, 36, rgb(60, 120, 255), 2); pline(p, 56, 36, 50, 46, rgb(60, 120, 255), 2); if (f) { for (let k = 0; k < 12; k++) pline(p, 52, 18, 52 + Math.cos(k) * 20, 18 - Math.abs(Math.sin(k)) * 18, rgb(160, 200, 255)); } hand(p, 52, 54); prect(p, 40, 66, 26, 14, SL); poutline(p, BLK); return p; }; A.spr('v_charm', mk(0)); A.spr('v_charm_f', mk(1)); }
      { const mk = f => { const p = Pix(160, 60); if (f) { pell(p, 62, 6, 9, 6, rgb(255, 230, 140)); pell(p, 98, 6, 9, 6, rgb(255, 230, 140)); } prect(p, 56, 8, 10, 30, rgb(50, 50, 54)); prect(p, 94, 8, 10, 30, rgb(50, 50, 54)); ppoly(p, [20, 60, 30, 30, 130, 30, 140, 60], rgb(80, 90, 76)); prect(p, 30, 30, 100, 4, rgb(230, 190, 30)); prect(p, 72, 40, 16, 12, rgb(40, 40, 40)); hand(p, 40, 52); hand(p, 120, 52); poutline(p, BLK); return p; }; A.spr('v_turret', mk(0)); A.spr('v_turret_f', mk(1)); }
      { const mk = f => { const p = Pix(320, 60); if (f) pell(p, 160, 6, 14, 8, rgb(255, 220, 120)); prect(p, 152, 8, 16, 30, rgb(60, 70, 54)); ppoly(p, [0, 60, 0, 36, 60, 26, 260, 26, 320, 36, 320, 60], rgb(70, 84, 62)); prect(p, 60, 26, 200, 3, rgb(230, 190, 30)); prect(p, 100, 36, 30, 14, rgb(20, 30, 20)); prect(p, 104, 40, 22, 2, rgb(80, 255, 120)); prect(p, 190, 36, 30, 14, rgb(20, 30, 20)); pell(p, 205, 43, 5, 5, rgb(255, 80, 60)); hand(p, 70, 50); hand(p, 250, 50); poutline(p, BLK); return p; }; A.spr('v_cart', mk(0)); A.spr('v_cart_f', mk(1)); }
    }
    const FN = n => ({ walk: [n + '_w0', n + '_w1'], atk: n + '_atk', pain: n + '_pain', die: n + '_die', dead: n + '_dead' });
    const bleep = (f1, f2, d, t) => au => au.tone(f1, d, { type: t || 'square', vol: .12, slideTo: f2 });
    const swish = au => au.noise(.16, { vol: .14, freq: 3500, slideTo: 900, type: 'bandpass' });
    return {
      year: 1997, maker: '3D REALMS', heroName: 'KAI MORI', heroShort: 'KAI', livesLabel: 'KAI', tagline: 'ONE BLADE. ONE CITY. ZERO PATIENCE FOR DEMONS.',
      bossName: 'THE OBSIDIAN COLOSSUS', hiDefault: 30000, jetpack: false, focusShort: 'FOCUS',
      keyNames: { r: 'RED KEY', b: 'BLUE KEY', y: 'GOLD KEY' },
      remoteMsg: 'THIS GATE IS OPENED BY A GONG OR SWITCH', remoteOpenMsg: 'A GATE RUMBLES OPEN', remoteNone: 'A FINE TONE. NOTHING ELSE.',
      remoteSnd: au => { au.tone(110, 2.2, { type: 'sine', vol: .25 }); au.tone(165, 1.8, { type: 'sine', vol: .12 }); au.tone(233, 1.4, { type: 'triangle', vol: .06 }); },
      focusEnd: 'FOCUS FADES', vendItem: 'teacan', vendEmpty: 'SOLD OUT', mineSpr: 'sticky', mineMsg: '', bossFirst: 'THE COLOSSUS STILL GUARDS THE GATE!',
      hud: { bg: '#2a2026', panel: '#161014', hi: '#5a4650', lo: '#0c080a', label: '#b8a0a8', num: '#ff5040', off: '#3a2c32', quip: '#ffe0a0', cross: 'rgba(255,80,60,0.8)' },
      dmgScale: n => 1 + n * 0.04,
      build(A) {
        buildTextures(A); buildSprites(A);
        const R = mkRng(97);
        A.sky('dusk', sky(256, 128, rgb(40, 20, 70), rgb(250, 130, 70), R, rgb(50, 36, 64), p => { pell(p, 180, 40, 12, 12, rgb(255, 240, 200)); }));
        A.sky('city', sky(256, 128, rgb(6, 8, 30), rgb(60, 30, 90), R, 0, p => { let x = 0; while (x < 256) { const bw = 6 + R() * 14 | 0, bh = 14 + R() * 34 | 0, y0 = 104 - bh; prect(p, x, y0, bw, 128 - y0, rgb(12, 12, 26)); for (let yy = y0 + 3; yy < 102; yy += 4) for (let xx = x + 2; xx < x + bw - 1; xx += 3) if (R() < 0.3) pset(p, xx, yy, R() < .5 ? rgb(150, 220, 255) : rgb(255, 120, 200)); x += bw; } pell(p, 60, 30, 9, 9, rgb(240, 240, 220)); }));
        A.sky('ember', sky(256, 128, rgb(30, 0, 0), rgb(240, 80, 10), R, rgb(30, 10, 10), p => { for (let k = 0; k < 6; k++) pell(p, R() * 256, 20 + R() * 30, 20, 5, rgb(90, 20, 10)); pell(p, 128, 36, 16, 16, rgb(255, 60, 20)); }));
        A.sky('default', sky(256, 128, rgb(40, 20, 70), rgb(250, 130, 70), R, rgb(50, 36, 64)));
      },
      story: [
        { head: 'NEW KAGEMORI, 1997', lines: ['KAI MORI USED TO GUARD THE VEXCORP', 'TOWER. GOOD PAY. TERRIBLE BOSS.', '', 'THEN CEO MAXIMILIAN VEX OPENED THE', 'EMBER GATE AND SUMMONED A DEMON ARMY', "FOR A LITTLE 'HOSTILE TAKEOVER'.", '', 'KAI QUIT. LOUDLY.'] },
        { head: 'THE MISSION', lines: ['FIGHT THROUGH VEXCORP SECURITY, THE', 'MOUNTAIN TEMPLES AND THE NIGHT CITY,', 'THEN SEAL THE EMBER GATE FOR GOOD.', '', 'WALK INTO DOORS, GONGS AND SWITCHES.', 'WALK INTO A TURRET OR A CART TO USE IT', '- PRESS X TO HOP OFF AGAIN.'] }
      ],
      ending: ['THE OBSIDIAN COLOSSUS CRUMBLES TO ASH', 'AND THE EMBER GATE SLAMS SHUT.', '', 'VEXCORP STOCK DROPS NINETY-EIGHT', 'PERCENT. THE CHERRY TREES BLOOM.', 'THE CITY SLEEPS SOUNDLY AGAIN.', '', 'KAI: "CONSIDER THIS MY TWO WEEKS NOTICE."', '', 'THANKS FOR PLAYING!'],
      controlsText: ['HOW TO PLAY', 'ARROWS MOVE/TURN   A/D STRAFE', 'SPACE FIRE   X / 1-7 SWITCH WEAPON', 'Z JUMP   TAB/M AUTOMAP', 'BUMP DOORS, GONGS AND SWITCHES', 'WALK INTO TURRETS & CARTS - X EXITS'],
      logo(ctx, t, text, textS) {
        const y = 22 + Math.sin(t * 2) * 2;
        textS(ctx, 'SHADOW', 160, y, '#e8e8f0', 4, 'center'); textS(ctx, 'WARRIOR', 160, y + 32, '#e02828', 4, 'center');
        ctx.fillStyle = '#e02828'; ctx.fillRect(30, y + 64, 260, 2);
      },
      backdrop(ctx, t, W, H) {
        ctx.fillStyle = '#1a0c18'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffe8d0'; ctx.fillRect(250, 20, 20, 20);
        ctx.fillStyle = '#2a1626'; for (let x = 0; x < W; x += 4) ctx.fillRect(x, H - 50 - Math.abs(((x * 3) % 60) - 30), 4, 80);
        for (let k = 0; k < 30; k++) { ctx.fillStyle = '#ffb0d0'; ctx.fillRect((k * 53 + t * 20) % W, (k * 37 + t * 14 * (k % 3 + 1)) % H, 2, 2); }
      },
      quips: {
        start: ['SHADOWS ARE MY OFFICE.', 'LET US MAKE THIS QUICK. I HAVE DINNER PLANS.', 'VEXCORP, YOU HAVE MAIL. IT IS ME.', 'QUIET FEET. LOUD RESULTS.'],
        kill: ['SHARP WORK, IF I SAY SO MYSELF.', 'YOU SHOULD HAVE READ THE FINE PRINT.', 'DISMISSED.', 'TOO SLOW.', 'BACK TO THE SHADOWS WITH YOU.', 'A CUT ABOVE THE REST.', 'MIND YOUR MANNERS.'],
        multi: ['A BUSY AFTERNOON!', 'ONE, TWO, THREE. PERFECT FORM.', 'NOW THAT IS TEAMWORK. MINE.'],
        secret: ['HIDDEN PATHS FOR HIDDEN FOLK.', 'THE OLD SCROLLS MENTIONED THIS.', 'NICE. VERY NICE.'],
        weapon: ['NEW TOY. SAME STEADY HANDS.', 'NOW WE ARE BALANCED.', 'THIS WILL DO NICELY.'],
        vend: ['HYDRATION IS A DISCIPLINE.', 'COLD TEA. PERFECT.'],
        glass: ['I WILL SEND A CARD.', 'OOPS. VERY QUIETLY OOPS.'],
        exit: ['ON TO THE NEXT CHAPTER.', 'CLEAN EXIT.', 'THAT WAS THE WARM-UP.'],
        health: ['BREATHE IN. BREATHE OUT.', 'BETTER.'],
        focus: ['FOCUS.', 'EVERYTHING SLOWS DOWN.']
      },
      music: {
        start: [[440, .12], [523, .12], [587, .12], [659, .24], [587, .12], [880, .3]],
        clear: [[587, .1], [659, .1], [784, .1], [880, .2], [784, .1], [988, .4]],
        win: [[440, .15], [523, .15], [659, .15], [880, .3], [784, .15], [880, .15], [988, .15], [1175, .5]],
        coin: [[880, .05], [1320, .1]],
        loop: [147, 0, 147, 175, 0, 196, 0, 220, 147, 0, 147, 175, 0, 262, 220, 0, 131, 0, 131, 147, 0, 175, 0, 196, 110, 0, 131, 147, 175, 0, 147, 0],
        bossLoop: [73, 73, 0, 78, 73, 73, 0, 98, 73, 73, 0, 110, 104, 98, 87, 0],
        tempo: 0.16, vol: 0.045, wave: 'triangle', hat: true
      },
      ammoMax: { stars: 120, shells: 50, bullets: 300, rockets: 30, sticky: 20, charges: 40 },
      startAmmo: { stars: 40 }, startCur: 1,
      weapons: [
        { name: 'KATANA', short: 'KATANA', kind: 'melee', dmg: 48, range: 1.2, arc: 0.75, multi: true, cd: 0.42, anim: 0.22, view: 'v_katana', start: true, noAuto: true, snd: swish, sHit: au => au.tone(1800, .06, { type: 'square', vol: .1, slideTo: 900 }) },
        { name: 'SHURIKEN', short: 'STARS', kind: 'proj', proj: 'star', fan: [-0.07, 0, 0.07], ammo: 'stars', use: 1, cd: .32, anim: .14, view: 'v_star', start: true, snd: au => au.noise(.1, { vol: .1, freq: 5000, slideTo: 2000, type: 'highpass' }) },
        { name: 'RIOT GUN', short: 'RIOT', kind: 'hitscan', ammo: 'shells', dmg: 8, pellets: 8, spread: .15, cd: .8, anim: .2, view: 'v_riot', kick: 6, snd: au => { au.noise(.25, { vol: .25, freq: 1800, slideTo: 300 }); au.tone(90, .15, { type: 'square', vol: .15 }); } },
        { name: 'TWIN UZIS', short: 'UZI', kind: 'hitscan', ammo: 'bullets', dmg: 7, pellets: 1, spread: .08, cd: .055, anim: .05, view: 'v_uzi', kick: 2, snd: au => { au.noise(.05, { vol: .14, freq: 3000 }); au.tone(260, .03, { type: 'square', vol: .06 }); } },
        { name: 'ROCKET LAUNCHER', short: 'ROCKET', kind: 'proj', proj: 'rocket', ammo: 'rockets', cd: .8, anim: .2, view: 'v_launch', kick: 6, snd: au => { au.noise(.4, { vol: .2, freq: 1200, slideTo: 200 }); au.tone(300, .3, { type: 'sawtooth', vol: .08, slideTo: 80 }); } },
        { name: 'STICKY BOMBS', short: 'STICKY', kind: 'proj', proj: 'sticky', ammo: 'sticky', cd: .6, anim: .2, view: 'v_sticky', loft: 1.0, noAuto: true, snd: au => au.noise(.1, { vol: .08, freq: 700 }) },
        { name: 'STORM CHARM', short: 'STORM', kind: 'chain', ammo: 'charges', dmg: 42, range: 14, cd: .7, anim: .25, view: 'v_charm', snd: au => { au.noise(.35, { vol: .2, freq: 6000, slideTo: 800, type: 'bandpass' }); au.tone(1200, .2, { type: 'sawtooth', vol: .06, slideTo: 200 }); } }
      ],
      projs: {
        star: { spr: 'pstar', spin: ['pstar', 'pstar2'], speed: 13, dmg: 13, r: .06, full: true, puff: rgb(220, 220, 230), sHit: au => au.tone(2400, .03, { type: 'square', vol: .06 }) },
        rocket: { spr: 'rocket', speed: 11, splash: 1.7, sdmg: 110, dmg: 0, life: 4, trail: rgb(150, 150, 150), full: true },
        sticky: { spr: 'sticky', speed: 7, grav: 6, sticky: true, fuse: 1.4, splash: 1.9, sdmg: 120, life: 6, sStick: au => au.tone(300, .05, { type: 'sine', vol: .1, slideTo: 150 }) },
        shell: { spr: 'rocket', speed: 12, splash: 1.5, sdmg: 90, dmg: 0, life: 3, trail: rgb(130, 130, 130), full: true },
        estar: { spr: 'estar', spin: ['estar', 'pstar2'], speed: 8, dmg: 7, full: true },
        fireball: { spr: 'fireball', speed: 6, dmg: 9, full: true, puff: rgb(255, 160, 40) },
        bluefire: { spr: 'bluefire', speed: 6.5, dmg: 12, full: true, puff: rgb(140, 190, 255) },
        boulder: { spr: 'boulder', speed: 6, dmg: 0, splash: 1.2, sdmg: 28, life: 5 },
        magma: { spr: 'fireball', speed: 6.5, dmg: 11, scale: 1.8, full: true, puff: rgb(255, 160, 40) }
      },
      enemies: {
        guard: { frames: FN('gu'), hp: 35, speed: 1.6, r: .24, h: .84, score: 150, sight: 14, pain: .5, keep: 3, atk: { kind: 'hit', dmg: 4, n: 3, range: 12, cd: 1.6, wind: .35, snd: au => { for (let k = 0; k < 3; k++) au.noise(.05, { vol: .1, freq: 2500, delay: k * .07 }); } }, drop: 'clip', dropP: .45, bits: rgb(200, 200, 200), sSight: bleep(400, 300, .15), sDie: bleep(300, 100, .4, 'sawtooth') },
        ninja: { frames: FN('nj'), hp: 40, speed: 2.4, r: .24, h: .84, score: 250, sight: 14, pain: .35, keep: 2.2, strafe: 1.0, atk: { kind: 'proj', proj: 'estar', n: 3, spread: .1, range: 11, cd: 1.5, wind: .3, snd: au => au.noise(.1, { vol: .08, freq: 5000, type: 'highpass' }) }, drop: 'stars', dropP: .5, bits: rgb(140, 80, 170), sSight: bleep(700, 400, .12, 'sawtooth'), sDie: bleep(500, 120, .4, 'sawtooth') },
        imp: { frames: FN('im'), hp: 25, speed: 2.3, r: .2, h: .45, fly: true, full: true, score: 180, sight: 13, pain: .5, keep: 2.5, atk: { kind: 'proj', proj: 'fireball', range: 11, cd: 1.4, wind: .3 }, bits: rgb(255, 160, 40), sSight: bleep(1200, 1600, .1, 'sawtooth'), sDie: au => au.noise(.3, { vol: .12, freq: 3000, slideTo: 300 }) },
        hound: { frames: FN('hd'), hp: 32, speed: 3.4, r: .28, h: .45, score: 160, sight: 12, pain: .3, keep: .3, strafe: .2, atk: { kind: 'melee', range: .8, dmg: 9, cd: .75, wind: .2, snd: au => au.noise(.12, { vol: .12, freq: 600 }) }, bits: rgb(90, 90, 100), sSight: au => { au.tone(150, .2, { type: 'sawtooth', vol: .12, slideTo: 300 }); }, sDie: bleep(300, 80, .4, 'sawtooth') },
        sentinel: { frames: FN('st'), hp: 220, speed: 1.0, r: .36, h: 1.24, score: 700, sight: 15, pain: .1, keep: 3.5, atk: { kind: 'proj', proj: 'boulder', range: 13, cd: 2.2, wind: .55, n: 2, spread: .15 }, drop: 'rockets', dropP: .5, bits: rgb(140, 136, 126), sSight: bleep(90, 60, .5, 'sawtooth'), sDie: au => au.noise(.8, { vol: .25, freq: 600, slideTo: 60 }) },
        wraith: { frames: FN('wr'), hp: 70, speed: 1.4, r: .26, h: .86, fly: true, score: 350, sight: 14, pain: .3, keep: 3, atk: { kind: 'proj', proj: 'bluefire', range: 12, cd: 1.6, wind: .4, n: 2, spread: .12 }, bits: rgb(170, 200, 230), sSight: bleep(300, 200, .6, 'sine'), sDie: bleep(600, 1200, .5, 'sine') },
        colossus: { frames: FN('co'), hp: 2600, speed: 0.9, r: .8, h: 2.55, boss: true, score: 20000, sight: 30, keep: 5, mz: .5, bits: rgb(255, 140, 40), noShrink: true,
          atks: [{ kind: 'proj', proj: 'magma', range: 30, cd: 1.4, wind: .5, n: 5, spread: .15, snd: bleep(120, 400, .3, 'sawtooth') }, { kind: 'proj', proj: 'boulder', range: 30, cd: 1.6, wind: .6, n: 3, spread: .25 }, { kind: 'summon', range: 30, cd: 1.6, wind: .8, n: 2, what: ['imp', 'hound', 'ninja'], snd: bleep(80, 300, .6, 'sine') }, { kind: 'proj', proj: 'fireball', range: 30, cd: 1.0, wind: .3, n: 6, spread: .12 }],
          sSight: au => au.melody([[98, .3], [92, .3], [82, .6]], { type: 'sawtooth', vol: .15 }), sDie: au => au.noise(1.5, { vol: .3, freq: 800, slideTo: 40 }) }
      },
      items: {
        medkit: { spr: 'medkit', hp: 25, msg: 'MEDKIT +25', quip: 'health' },
        tonic: { spr: 'tonic', hp: 10, msg: 'HERBAL TONIC +10' },
        bigmed: { spr: 'bigmed', hp: 50, max: 200, msg: 'GRAND MEDKIT! +50', full: true, score: 200 },
        teacan: { spr: 'teacan', hp: 10, msg: 'COLD TEA +10', bob: false },
        armor: { spr: 'armor', armor: 100, msg: 'KEVLAR VEST' },
        stars: { spr: 'stars', ammo: { stars: 20 }, msg: 'SHURIKEN' },
        shells: { spr: 'shells', ammo: { shells: 10 }, msg: 'RIOT SHELLS' },
        clip: { spr: 'clip', ammo: { bullets: 40 }, msg: 'UZI CLIP' },
        rockets: { spr: 'rockets', ammo: { rockets: 5 }, msg: 'ROCKETS' },
        sticky: { spr: 'sticky', ammo: { sticky: 4 }, weapon: 5, msg: 'STICKY BOMBS - THEY STICK, THEN THEY POP' },
        charges: { spr: 'charm', ammo: { charges: 8 }, weapon: 6, msg: 'STORM CHARM - CHAIN LIGHTNING', full: true },
        riot: { spr: 'w_riot', weapon: 2, ammo: { shells: 12 }, msg: 'RIOT GUN!', score: 100 },
        uzi: { spr: 'w_uzi', weapon: 3, ammo: { bullets: 80 }, msg: 'TWIN UZIS!', score: 100 },
        launcher: { spr: 'w_launch', weapon: 4, ammo: { rockets: 6 }, msg: 'ROCKET LAUNCHER!', score: 100 },
        keyr: { spr: 'key_r', key: 'r', full: true }, keyb: { spr: 'key_b', key: 'b', full: true }, keyy: { spr: 'key_y', key: 'y', full: true },
        focus: { spr: 'focus', focus: 20, msg: 'FOCUS CHARM! DOUBLE DAMAGE', full: true, quip: 'focus', snd: au => au.melody([[600, .06], [900, .06], [1200, .12]], { type: 'sine', vol: .14 }) },
        oneup: { spr: 'oneup', life: 1, msg: 'EXTRA LIFE!', full: true, score: 500 }
      },
      decos: {
        barrel: { spr: 'barrel', r: .2, solid: true, hp: 12, explode: [1.8, 90], hz: .25 },
        lantern: { spr: 'lantern', broke: 'lantern_b', r: .14, solid: true, hp: 6, shards: rgb(130, 128, 120), hz: .3 },
        tree: { spr: 'tree', r: .2, solid: true },
        crate: { spr: 'crate', r: .2, solid: true, hp: 15, shards: rgb(170, 125, 70), drop: 'tonic' },
        car: { spr: 'car', broke: 'car_b', r: .45, solid: true, hp: 70, explode: [2.0, 100], hz: .25, score: 100 },
        turret: { spr: 'turret', r: .3, solid: true, mount: 'turret', view: 'v_turret', cd: .09, dmg: 16, mountMsg: 'TURRET! FIRE AWAY - PRESS X TO HOP OFF', snd: au => { au.noise(.06, { vol: .16, freq: 2000 }); au.tone(150, .05, { type: 'square', vol: .1 }); } },
        cart: { spr: 'cart', r: .42, solid: true, mount: 'cart', view: 'v_cart', cd: .7, proj: 'shell', vhp: 250, mountMsg: 'ARMORED CART! DRIVE AND FIRE - PRESS X TO HOP OFF', snd: au => { au.noise(.3, { vol: .22, freq: 900, slideTo: 150 }); au.tone(80, .2, { type: 'square', vol: .12 }); } }
      },
      ents: {
        g: { t: 'enemy', k: 'guard' }, n: { t: 'enemy', k: 'ninja' }, i: { t: 'enemy', k: 'imp' }, h: { t: 'enemy', k: 'hound' }, s: { t: 'enemy', k: 'sentinel' }, w: { t: 'enemy', k: 'wraith' }, O: { t: 'enemy', k: 'colossus' },
        m: { t: 'item', k: 'medkit' }, t: { t: 'item', k: 'tonic' }, M: { t: 'item', k: 'bigmed' }, A: { t: 'item', k: 'armor' }, E: { t: 'item', k: 'focus' }, '*': { t: 'item', k: 'oneup' },
        r: { t: 'item', k: 'keyr' }, b: { t: 'item', k: 'keyb' }, y: { t: 'item', k: 'keyy' },
        x: { t: 'item', k: 'riot' }, v: { t: 'item', k: 'uzi' }, l: { t: 'item', k: 'launcher' }, k: { t: 'item', k: 'sticky' }, p: { t: 'item', k: 'charges' },
        e: { t: 'item', k: 'shells' }, u: { t: 'item', k: 'clip' }, o: { t: 'item', k: 'rockets' }, q: { t: 'item', k: 'stars' }, c: { t: 'item', k: 'charges' },
        B: { t: 'deco', k: 'barrel' }, '!': { t: 'deco', k: 'lantern' }, '^': { t: 'deco', k: 'tree' }, Z: { t: 'deco', k: 'crate' }, J: { t: 'deco', k: 'car' }, '@': { t: 'deco', k: 'turret' }, z: { t: 'deco', k: 'cart' }
      },
      legend: {
        '#': { s: 1, wt: 'plaster', h: 2.2 }, '|': { s: 1, wt: 'lacquer', h: 2.2 }, H: { s: 1, wt: 'woodwall', h: 2.2 }, '%': { s: 1, wt: 'concrete', h: 3 }, '=': { s: 1, wt: 'office', h: 3 }, '&': { s: 1, wt: 'obsidian' },
        R: { s: 1, wt: 'rock' }, T: { s: 1, wt: 'tech' }, N: { s: 1, wt: 'neon' }, F: { s: 1, wt: 'facade', h: 99 }, '+': { s: 2, f: 0, c: 1.4, paper: 1, wt: 'woodwall' }, W: { s: 2, f: 0, c: 1.4, wt: 'office' },
        C: { s: 1, wt: 'crack', crack: 1 }, X: { s: 1, wt: 'exit', exit: 1 }, V: { s: 1, wt: 'vend', vend: 1 }, L: { s: 1, wt: 'switch', sw: 'light' }, G: { s: 1, wt: 'gong', sw: 'remote' },
        D: { door: 'n', wt: 'door' }, Q: { door: 't', wt: 'lacquer' }, S: { door: 's' }, K: { door: 'r', wt: 'doorr' }, U: { door: 'b', wt: 'doorb' }, Y: { door: 'y', wt: 'doory' },
        I: { lift: 1, ft: 'lift', wt: 'lift' }, '/': { ramp: 1, ft: 'planks' },
        '.': { f: 0, c: 1.4 }, _: { f: 0, c: 1.4, ft: 'tatami' }, '-': { f: 0, c: 1.4, ft: 'carpet', ct: 'office' }, '`': { f: 0, c: 3, ft: 'floor' },
        ',': { f: 0, c: 8, sky: 1, ft: 'gravel', st: 'stone' }, ':': { f: .1, c: 8, sky: 1, ft: 'stone', st: 'stone' }, ';': { f: .05, c: 8, sky: 1, ft: 'grass', st: 'mossy' },
        '~': { f: -.3, c: 8, sky: 1, ft: 'water', water: 1, st: 'mossy' }, '"': { f: -.15, c: 8, sky: 1, ft: 'lava', hurt: 1, st: 'obsidian' }, a: { f: 0, c: 2.5, ft: 'ashfloor', ct: 'obsidian' },
        d: { f: 0, c: 1.4, dark: 1, l: .15, lon: 1 }, '0': { f: -.5, c: 1.4 },
        '1': { f: .25, c: 1.7 }, '2': { f: .5, c: 1.9 }, '3': { f: .75, c: 2.1 }, '4': { f: 1.0, c: 2.4 }, '5': { f: 1.25, c: 2.6 }, '6': { f: 1.5, c: 2.8 },
        '7': { f: .5, c: 8, sky: 1, ft: 'stone', st: 'stone' }, '8': { f: 1.0, c: 8, sky: 1, ft: 'stone', st: 'stone' }, '9': { f: 1.5, c: 8, sky: 1, ft: 'stone', st: 'stone' }
      },
      levels: SW_LEVELS
    };
  }

  ArcadeRegistry.register({
    id: 'shadowwarrior', title: 'Shadow Warrior', year: 1997, maker: '3D Realms',
    width: 320, height: 200, vector: false, pointer: false,
    controls: 'Arrows: move/turn \u00b7 A/D: strafe \u00b7 Space: fire \u00b7 X or 1-7: weapon (X: exit vehicle) \u00b7 Z: jump \u00b7 Tab/M: map \u00b7 Enter: start',
    marquee: { bg: '#0a0a12', fg: '#e02828', accent: '#e8e8f0' },
    create(api) { return makeGame(api, GAMEDEF()); }
  });
})();
