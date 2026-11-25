// Comanche: Maximum Overkill (NovaLogic, 1992) -- arcade-friendly original take on the voxel attack-helicopter sim.
// Own voxel-space renderer over procedurally generated height/colour maps, cockpit HUD, guided missiles, missions.
(function () {
  'use strict';
  const W = 320, H = 200, VH = 140, HW = W / 2;
  const MS = 512, MM = 511;
  const FOCAL = 200, TAN = HW / FOCAL;
  const DT = 1 / 60, DRAW = 420;

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
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 31, 10, 0]
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
        for (let c = 0; c < 5; c++) {
          if (!(bits & (16 >> c))) continue;
          let e = c; while (e + 1 < 5 && (bits & (16 >> (e + 1)))) e++;
          ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, (e - c + 1) * sc, sc); c = e;
        }
      }
    }
  }

  // ---------- helpers ----------
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const pack = (r, g, b) => ((255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
  const css = c => 'rgb(' + (c & 255) + ',' + ((c >>> 8) & 255) + ',' + ((c >>> 16) & 255) + ')';
  function mixc(c, f, t) { // t 0..256
    const u = 256 - t;
    return ((255 << 24) | ((((c >>> 16) & 255) * u + ((f >>> 16) & 255) * t) >> 8) << 16 |
      ((((c >>> 8) & 255) * u + ((f >>> 8) & 255) * t) >> 8) << 8 | (((c & 255) * u + (f & 255) * t) >> 8)) >>> 0;
  }
  function nv(c) { // night-vision tint
    const l = ((c & 255) * 0.3 + ((c >>> 8) & 255) * 0.59 + ((c >>> 16) & 255) * 0.11);
    return pack(l * 0.22, l * 0.95 + 14, l * 0.28);
  }
  const wd = d => d - Math.round(d / MS) * MS;
  const wrap = v => ((v % MS) + MS) % MS;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ---------- terrain themes ----------
  const THEMES = {
    green: {
      sky0: [52, 96, 168], sky1: [176, 200, 220], fog: [168, 188, 200], water: [44, 86, 132], maxH: 100, wl: 15, exp: 1.45, rivers: 2,
      col(h, t, s, n, f) {
        if (h < this.wl + 1.5) return [176 + n * 20, 164 + n * 16, 112];
        let c;
        if (t < 0.36) c = [62 + f * 34 + n * 18, 118 + f * 26 + n * 20, 40 + f * 10];
        else if (t < 0.6) c = [44 + n * 14, 92 + n * 18, 34];
        else if (t < 0.82) c = [112 + n * 20, 104 + n * 18, 90];
        else c = [214, 214, 210];
        if (s > 3.2 && t > 0.2) c = [c[0] * 0.5 + 60, c[1] * 0.5 + 54, c[2] * 0.5 + 48];
        return c;
      }
    },
    desert: {
      sky0: [70, 120, 190], sky1: [222, 206, 176], fog: [214, 196, 164], water: [50, 110, 140], maxH: 110, wl: 12, exp: 1.9, rivers: 1,
      col(h, t, s, n, f) {
        if (h < this.wl + 1.2) return [150 + n * 20, 140, 90];
        let c;
        if (t < 0.3) c = [206 + n * 20, 172 + n * 18 + f * 8, 112 + n * 10];
        else if (t < 0.55) c = [192 + n * 18, 140 + n * 14, 86];
        else c = [156 + n * 20, 98 + n * 12, 66];
        if (s > 3) c = [c[0] * 0.75, c[1] * 0.6, c[2] * 0.55];
        return c;
      }
    },
    arctic: {
      sky0: [90, 110, 150], sky1: [206, 214, 226], fog: [210, 216, 226], water: [120, 156, 186], maxH: 105, wl: 14, exp: 1.35, rivers: 2,
      col(h, t, s, n, f) {
        let c = t < 0.5 ? [220 + n * 20, 226 + n * 18, 236] : [200 + n * 20, 206 + n * 20, 222];
        if (s > 2.4) c = [92 + n * 30, 96 + n * 30, 110 + n * 20];
        else if (f > 0.75 && t < 0.4) c = [70, 96, 78];
        return c;
      }
    },
    night: {
      sky0: [6, 14, 8], sky1: [24, 60, 30], fog: [20, 52, 26], water: [30, 60, 80], maxH: 100, wl: 15, exp: 1.5, rivers: 2, nv: true,
      col(h, t, s, n, f) { return THEMES.green.col(h, t, s, n, f); }
    }
  };

  // ---------- sprites ----------
  const PAL = {
    G: [104, 116, 60], g: [70, 80, 40], L: [140, 152, 86], k: [24, 24, 20], t: [52, 52, 48], T: [90, 90, 84],
    s: [150, 150, 140], S: [190, 190, 178], w: [236, 236, 230], r: [210, 50, 40], y: [240, 200, 60], b: [70, 140, 200],
    c: [168, 160, 146], C: [120, 114, 104], o: [200, 120, 50], d: [90, 70, 50]
  };
  const ART = {
    tank: ['.....LLLLLL.....', '....LGGGGGGL....', '....GGGkkGGG....', '..LLGGGGGGGGLL..', '.LGGGGGGGGGGGGL.',
      'GGGGGGGGGGGGGGGG', 'gggggggggggggggg', 'tTtTtTtTtTtTtTtT', '.tttttttttttttt.'],
    truck: ['....SSSSSSSSSS', '....SssssssssS', 'GGG.SssssssssS', 'GbbGSssssssssS', 'GGGGSSSSSSSSSS', 'gggggggggggggg', '.kk.....kk.kk.'],
    sam: ['..w..........w..', '..ww........ww..', '...wr......rw...', '....wr....rw....', '.....ws..sw.....', '......ssss......',
      '.....GGGGGG.....', '...GGGGGGGGGG...', '..GGGGGGGGGGGG..', '..gggggggggggg..', '..tTtTtTtTtTtT..', '...tttttttttt...'],
    aaa: ['.k........k.', '..k......k..', '...k....k...', '....kssk....', '...GGGGGG...', '..GGGGGGGG..', '.GGGGGGGGGG.', '.gggggggggg.', 'tttttttttttt'],
    heli: ['...........kk...........', '.......GGGGGGGGGG.......', '.....GGbbbbGGGGGGGGGGGGG', '....GGbbbbbGGGGGGGGG..GG',
      '....GGGGGGGGGGGGGG....gG', '.....gggggggggggg.......', '......k........k........', '....kkkkkkkkkkkkkk......'],
    bldg: ['cccccccccccccccc', 'CCCCCCCCCCCCCCCC', 'SSSSSSSSSSSSSSSS', 'SkkSSkkSSkkSSkkS', 'SkkSSkkSSkkSSkkS', 'SSSSSSSSSSSSSSSS',
      'SkkSSkkSSkkSSkkS', 'SkkSSkkSSkkSSkkS', 'SSSSSSSSSSSSSSSS', 'SSSSSSdddSSSSSSS', 'SSSSSSdddSSSSSSS', 'ssssssdddsssssss'],
    radar: ['..SSSSSSSSSSSS..', '.SwwwwwwwwwwwwS.', 'SwSSSSSSSSSSSSwS', '.SSSSSSkSSSSSSS.', '...SSSSkSSSSS...', '.......k........',
      '.......s........', '......sss.......', '.....sssss......', '....CCCCCCC.....', '....CCCCCCC.....', '....ccccccc.....'],
    fuel: ['..SSSSSS....SSSSSS..', '.SwwwwwwS..SwwwwwwS.', 'SSSSSSSSSSSSSSSSSSSS', 'SrrrrrrSSSSSSrrrrrrS', 'SSSSSSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSSSSSS', 'ssssssssssssssssssss', '.k.k.k.k..k.k.k.k.k.'],
    bunker: ['......cccccccc......', '...ccccCCCCCCcccc...', '.ccCCCCCCCCCCCCCCcc.', 'cCCCCkkkkkkkkkkCCCCc', 'CCCCCkkkkkkkkkkCCCCC',
      'CCCCCCCCCCCCCCCCCCCC', 'CCCCCCCCCCCCCCCCCCCC', 'cccccccccccccccccccc'],
    tree: ['...g...', '..gGg..', '.gGGGg.', '.gGGGg.', 'gGGGGGg', '...d...']
  };
  function makeSprite(rows) {
    const h = rows.length, w = rows[0].length;
    const d = new Uint32Array(w * h), n = new Uint32Array(w * h), wr = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = PAL[rows[y][x]]; if (!c) continue;
      const p = pack(c[0], c[1], c[2]); d[y * w + x] = p; n[y * w + x] = nv(p);
      const q = ((x * 7 + y * 13) % 5) / 5;
      const wc = pack(28 + q * 24, 26 + q * 20, 24 + q * 16); wr[y * w + x] = wc;
    }
    const wn = new Uint32Array(w * h); for (let i = 0; i < w * h; i++) if (wr[i]) wn[i] = nv(wr[i]);
    return { w, h, d, n, wr, wn };
  }
  const SPR = {}; for (const k in ART) SPR[k] = makeSprite(ART[k]);

  // ---------- unit types ----------
  const TYPES = {
    tank: { hp: 6, size: 7, score: 500, name: 'TANK', fire: 'shell', range: 270, rate: 2.6 },
    truck: { hp: 3, size: 6, score: 250, name: 'TRUCK' },
    sam: { hp: 5, size: 8, score: 750, name: 'SAM SITE', fire: 'sam', range: 400, rate: 7 },
    aaa: { hp: 4, size: 6, score: 400, name: 'AAA GUN', fire: 'flak', range: 230, rate: 1.6 },
    heli: { hp: 5, size: 13, score: 1000, name: 'HELO', fire: 'rkt', range: 280, rate: 3.0, air: true },
    bldg: { hp: 9, size: 12, score: 300, name: 'BARRACKS' },
    radar: { hp: 6, size: 10, score: 1000, name: 'RADAR' },
    fuel: { hp: 4, size: 12, score: 600, name: 'FUEL DEPOT' },
    bunker: { hp: 24, size: 16, score: 2500, name: 'COMMAND' }
  };
  const WPN = [
    { name: 'CHAIN GUN', s: 'GUN', max: 600, rate: 6 },
    { name: 'ROCKETS', s: 'RKT', max: 38, rate: 9 },
    { name: 'HELLFIRE', s: 'HF', max: 8, rate: 36 },
    { name: 'AIR-AIR', s: 'AAM', max: 4, rate: 36 }
  ];

  // ---------- missions (bearings: degrees clockwise from north, distance in map units from base) ----------
  const MISSIONS = [
    {
      name: 'IRON VALLEY', theme: 'green', seed: 1101,
      text: ['AN ARMOR COLUMN IS DUG IN', 'IN THE NORTH VALLEY.', 'DESTROY ALL FIVE TANKS', 'AND RETURN TO THE FARP.'],
      g: [{ t: 'tank', n: 3, d: 200, b: 8, sp: 20, obj: 1 }, { t: 'tank', n: 2, d: 300, b: -25, sp: 16, obj: 1 }, { t: 'truck', n: 3, d: 230, b: -12, sp: 14 },
        { t: 'aaa', n: 1, d: 240, b: 20, sp: 4 }, { t: 'tank', n: 2, d: 150, b: 60, sp: 20 }]
    },
    {
      name: 'RIVER RUN', theme: 'green', seed: 2207,
      text: ['A SUPPLY CONVOY IS RACING', 'FOR THE RIVER FORD.', 'STOP IT BEFORE TWO TRUCKS', 'REACH THE FAR BANK.'],
      g: [{ t: 'truck', n: 6, d: 250, b: 50, sp: 0, obj: 1, conv: [300, 125] }, { t: 'tank', n: 2, d: 270, b: 56, sp: 0, conv: [300, 125] },
        { t: 'sam', n: 1, d: 260, b: 100, sp: 6 }, { t: 'aaa', n: 2, d: 200, b: 85, sp: 20 }, { t: 'tank', n: 2, d: 180, b: 30, sp: 20 }]
    },
    {
      name: 'SAM ALLEY', theme: 'desert', seed: 3313,
      text: ['THREE SAM BATTERIES AND A', 'SEARCH RADAR GUARD THE', 'CANYONS. FLY LOW, USE THE', 'RIDGES, KNOCK THEM OUT.'],
      g: [{ t: 'sam', n: 1, d: 200, b: -40, sp: 4, obj: 1 }, { t: 'sam', n: 1, d: 260, b: 20, sp: 4, obj: 1 }, { t: 'sam', n: 1, d: 300, b: 70, sp: 4, obj: 1 },
        { t: 'radar', n: 1, d: 330, b: 15, sp: 4, obj: 1 }, { t: 'tank', n: 4, d: 180, b: 10, sp: 40 }, { t: 'aaa', n: 3, d: 260, b: 30, sp: 40 }]
    },
    {
      name: 'DUST DEVILS', theme: 'desert', seed: 4421,
      text: ['ENEMY GUNSHIPS ARE ESCORTING', 'A TANK COMPANY ACROSS THE', 'DUNES. CLEAR THE SKY, THEN', 'DESTROY THE ARMOR.'],
      g: [{ t: 'heli', n: 4, d: 220, b: -20, sp: 50, obj: 1 }, { t: 'tank', n: 4, d: 310, b: -10, sp: 24, obj: 1 }, { t: 'sam', n: 1, d: 300, b: 15, sp: 4 },
        { t: 'aaa', n: 2, d: 280, b: -20, sp: 30 }]
    },
    {
      name: 'WHITE SHADOW', theme: 'arctic', seed: 5531,
      text: ['THE ENEMY FUEL DEPOT IN THE', 'GLACIER PASS FEEDS THEIR', 'WHOLE FRONT. DESTROY THE', 'TANKS AND THE BARRACKS.'],
      g: [{ t: 'fuel', n: 3, d: 320, b: 40, sp: 18, obj: 1 }, { t: 'bldg', n: 2, d: 335, b: 30, sp: 16, obj: 1 }, { t: 'sam', n: 2, d: 260, b: 45, sp: 40 },
        { t: 'aaa', n: 3, d: 300, b: 35, sp: 24 }, { t: 'tank', n: 4, d: 200, b: 30, sp: 40 }, { t: 'heli', n: 2, d: 240, b: 0, sp: 40 }]
    },
    {
      name: 'NIGHT HAMMER', theme: 'night', seed: 6649,
      text: ['UNDER NIGHT VISION, STRIKE', 'THE ENEMY COMMAND BUNKER', 'AND ITS RADAR. EXPECT', 'HEAVY RESISTANCE.'],
      g: [{ t: 'bunker', n: 1, d: 340, b: -20, sp: 0, obj: 1 }, { t: 'radar', n: 1, d: 320, b: -8, sp: 4, obj: 1 }, { t: 'sam', n: 3, d: 270, b: -20, sp: 50 },
        { t: 'aaa', n: 4, d: 320, b: -18, sp: 26 }, { t: 'tank', n: 5, d: 200, b: -25, sp: 50 }, { t: 'heli', n: 3, d: 250, b: 10, sp: 40 }]
    }
  ];

  ArcadeRegistry.register({
    id: 'comanche', title: 'Comanche: Maximum Overkill', year: 1992, maker: 'NovaLogic',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: turn/speed \u00b7 A/Z or hold X+Up/Down: climb/dive \u00b7 Space: fire \u00b7 X: weapon (flare when missile inbound) \u00b7 1-4: weapon \u00b7 T: target \u00b7 F: flare \u00b7 P: pause \u00b7 Enter: start',
    marquee: { bg: '#0d1a10', fg: '#9fe870', accent: '#e8c040' },
    create(api) {
      const au = api.audio;
      const hmap = new Float32Array(MS * MS), cmap = new Uint32Array(MS * MS);
      const zbuf = new Float32Array(W * VH), ybuf = new Int32Array(W);
      let img = null, buf = null, mapImg = null, mapFor = -1;
      let theme = THEMES.green, fogC = 0, waterLevel = 15;
      const base = { x: 256, y: 400 };
      const cam = { x: 0, y: 0, h: 0, a: 0, fx: 1, fy: 0, rx: 0, ry: 1, hor: 56, rk: 0 };

      // ---------- terrain generation ----------
      function hash2(x, y, s) {
        let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + s) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      }
      function genTerrain(seed, th) {
        const R = rng(seed);
        hmap.fill(0);
        let amp = 1;
        for (let cells = 4; cells <= 128; cells *= 2) {
          const g = new Float32Array(cells * cells);
          for (let i = 0; i < g.length; i++) g[i] = R();
          const step = MS / cells;
          for (let y = 0; y < MS; y++) {
            const gy = y / step, iy = gy | 0; let fy = gy - iy; fy = fy * fy * (3 - 2 * fy);
            const r0 = (iy % cells) * cells, r1 = ((iy + 1) % cells) * cells;
            for (let x = 0; x < MS; x++) {
              const gx = x / step, ix = gx | 0; let fx = gx - ix; fx = fx * fx * (3 - 2 * fx);
              const c0 = ix % cells, c1 = (ix + 1) % cells;
              const a = g[r0 + c0] + (g[r0 + c1] - g[r0 + c0]) * fx;
              const b = g[r1 + c0] + (g[r1 + c1] - g[r1 + c0]) * fx;
              hmap[y * MS + x] += (a + (b - a) * fy) * amp;
            }
          }
          amp *= cells < 16 ? 0.6 : 0.42;
        }
        let mn = 1e9, mx = -1e9;
        for (let i = 0; i < hmap.length; i++) { const v = hmap[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
        for (let i = 0; i < hmap.length; i++) hmap[i] = Math.pow((hmap[i] - mn) / (mx - mn), th.exp) * th.maxH;
        const wl = th.wl; waterLevel = wl;
        // rivers carve meandering valleys (periodic, so the wrapped world stays seamless)
        for (let r = 0; r < th.rivers; r++) {
          const p1 = R() * 6.283, p2 = R() * 6.283, c0 = R() * MS, k1 = 1 + (R() * 2 | 0), k2 = 3 + (R() * 3 | 0);
          for (let v = 0; v < MS; v++) {
            const cx = c0 + 48 * Math.sin(6.283 * v * k1 / MS + p1) + 20 * Math.sin(6.283 * v * k2 / MS + p2);
            for (let u = 0; u < MS; u++) {
              const d = Math.abs(wd(u - cx)); if (d > 36) continue;
              const i = r === 0 ? v * MS + u : u * MS + v;
              const bed = wl - 4, t = smooth(5, 36, d);
              const nh = bed + (hmap[i] - bed) * t;
              if (nh < hmap[i]) hmap[i] = nh;
            }
          }
        }
        // flatten the FARP
        const bh = Math.max(wl + 6, hmap[base.y * MS + base.x]);
        for (let dy = -32; dy <= 32; dy++) for (let dx = -32; dx <= 32; dx++) {
          const d = Math.hypot(dx, dy); if (d > 32) continue;
          const i = ((base.y + dy) & MM) * MS + ((base.x + dx) & MM);
          const t = smooth(14, 32, d); hmap[i] = bh + (hmap[i] - bh) * t;
        }
        // colours with slope shading
        const wc = th.water;
        const tmp = new Float32Array(hmap);
        for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) {
          const i = y * MS + x, h = tmp[i];
          const n = hash2(x, y, seed) - 0.5;
          if (h < wl) {
            const rip = hash2(x >> 1, y, seed + 7) * 0.12 + (wl - h) * 0.02;
            let c = pack(wc[0] * (0.92 + rip), wc[1] * (0.92 + rip), wc[2] * (0.95 + rip));
            if (th.nv) c = nv(c);
            cmap[i] = c; hmap[i] = wl; continue;
          }
          const hl = tmp[((y - 1) & MM) * MS + ((x - 1) & MM)];
          const s = Math.abs(tmp[y * MS + ((x + 1) & MM)] - tmp[y * MS + ((x - 1) & MM)]) + Math.abs(tmp[((y + 1) & MM) * MS + x] - tmp[((y - 1) & MM) * MS + x]);
          const f = hash2(x >> 4, y >> 4, seed + 3);
          const c = th.col(h, h / th.maxH, s, n, f);
          const sh = clamp(1 + (hl - h) * 0.075, 0.55, 1.4);
          let p = pack(c[0] * sh, c[1] * sh, c[2] * sh);
          if (th.nv) p = nv(p);
          cmap[i] = p;
        }
        // FARP pad with an H marking
        for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
          const i = ((base.y + dy) & MM) * MS + ((base.x + dx) & MM);
          const edge = Math.abs(dx) === 9 || Math.abs(dy) === 9;
          const hm = (Math.abs(dx) <= 4 && Math.abs(dy) <= 5) && (Math.abs(dx) >= 3 || Math.abs(dy) <= 0);
          let p = edge ? pack(220, 200, 60) : hm ? pack(236, 236, 236) : pack(96 + ((dx + dy) & 1) * 6, 98, 96);
          if (th.nv) p = nv(p);
          cmap[i] = p;
        }
        const fc = th.fog; fogC = pack(fc[0], fc[1], fc[2]);
        theme = th;
      }
      function hAt(x, y) { return hmap[((((y + 4096) | 0) & MM) * MS) + (((x + 4096) | 0) & MM)]; }
      function ground(x, y) {
        x += 4096; y += 4096;
        const ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy;
        const x0 = ix & MM, x1 = (ix + 1) & MM, y0 = (iy & MM) * MS, y1 = ((iy + 1) & MM) * MS;
        const a = hmap[y0 + x0] + (hmap[y0 + x1] - hmap[y0 + x0]) * fx;
        const b = hmap[y1 + x0] + (hmap[y1 + x1] - hmap[y1 + x0]) * fx;
        return a + (b - a) * fy;
      }
      function los(ax, ay, az, bx, by, bz) {
        const dx = wd(bx - ax), dy = wd(by - ay), dz = bz - az;
        const n = Math.min(90, Math.max(4, Math.hypot(dx, dy) / 3 | 0));
        for (let i = 1; i < n; i++) { const t = i / n; if (hAt(ax + dx * t, ay + dy * t) > az + dz * t + 0.4) return false; }
        return true;
      }

      // ---------- game state ----------
      let mode = 'attract', modeT = 0, page = 0, coinFlash = 0, paused = false;
      let score = 0, hi = api.getHiScore(50000), lives = 3, mi = 0, loop = 0, nextLife = 30000, diff = 1;
      let ents = [], shots = [], eshots = [], parts = [], flares = [];
      let P = null, tgt = null, lockT = 0, msg = '', msgT = 0, objDone = false, missionT = 0, escaped = 0;
      let flash = 0, shake = 0, warnT = 0, xHeld = 0, xUsed = false, rotorT = 0, landT = 0, rearmMsg = 0;
      let doneInfo = null, kills = 0;
      const demo = { a: 0.3, x: 200, y: 300, h: 60 };

      function say(s, t) { msg = s; msgT = t || 150; }
      function newPlayer() {
        P = {
          x: base.x + 0.5, y: base.y + 0.5, alt: 0, a: -Math.PI / 2, spd: 0, vs: 0, turn: 0, pv: 0, armor: 100, fuel: 100,
          ammo: WPN.map(w => w.max), wpn: 0, cool: 0, flares: 12, dead: false, spin: 0, fallT: 0
        };
        P.alt = ground(P.x, P.y) + 2.2;
        tgt = null; lockT = 0;
      }
      function polar(d, b) { const r = b * Math.PI / 180; return [wrap(base.x + Math.sin(r) * d), wrap(base.y - Math.cos(r) * d)]; }
      function landSpot(x, y, R) {
        for (let k = 0; k < 40; k++) {
          if (ground(x, y) > waterLevel + 1.5) return [x, y];
          const a = R() * 6.283, r = 6 + k * 3; x = wrap(x + Math.cos(a) * r); y = wrap(y + Math.sin(a) * r);
        }
        return [x, y];
      }
      function spawn(t, x, y, o) {
        const d = TYPES[t];
        const e = {
          t, d, x, y, z: 0, hp: d.hp * (t === 'bunker' ? 1 : 1), alive: true, obj: !!o.obj, hx: x, hy: y, a: 0, spd: 0, vx: 0, vy: 0,
          cool: 2 + Math.random() * 4, lock: 0, los: false, losT: (Math.random() * 20) | 0, wx: x, wy: y, wT: 0, conv: o.conv || null,
          deadT: 0, smokeT: 0, air: !!d.air, rot: Math.random() * 6
        };
        e.z = ground(x, y) + (e.air ? 18 : 0);
        ents.push(e); return e;
      }
      function loadMission() {
        const m = MISSIONS[mi];
        diff = 1 + loop * 0.35;
        genTerrain(m.seed + loop * 977, THEMES[m.theme]);
        mapFor = -1;
        ents = []; shots = []; eshots = []; parts = []; flares = [];
        const R = rng(m.seed + 5);
        for (const g of m.g) {
          const n = g.n + (loop > 0 && !g.obj && g.t !== 'truck' ? loop : 0);
          const [cx, cy] = polar(g.d, g.b);
          const dest = g.conv ? polar(g.conv[0], g.conv[1]) : null;
          for (let k = 0; k < n; k++) {
            let x, y;
            if (dest) {
              const ddx = wd(dest[0] - cx), ddy = wd(dest[1] - cy), dl = Math.hypot(ddx, ddy) || 1;
              x = wrap(cx - ddx / dl * k * 10); y = wrap(cy - ddy / dl * k * 10);
            } else { const a = R() * 6.283, r = g.sp * Math.sqrt(R()); x = wrap(cx + Math.cos(a) * r); y = wrap(cy + Math.sin(a) * r); }
            if (!TYPES[g.t].air && !dest) [x, y] = landSpot(x, y, R);
            const e = spawn(g.t, x, y, g);
            if (dest) e.conv = [dest[0], dest[1]];
          }
        }
        // scenery trees (non-targets) for depth cues
        for (let k = 0; k < 90; k++) {
          const x = R() * MS, y = R() * MS, gh = ground(x, y);
          if (gh > waterLevel + 2 && gh < theme.maxH * 0.55 && Math.hypot(wd(x - base.x), wd(y - base.y)) > 24)
            ents.push({ t: 'tree', tree: true, x, y, z: gh, alive: true, d: { size: 5 } });
        }
        newPlayer(); objDone = false; missionT = 0; escaped = 0; kills = 0;
      }
      function objLeft() { let n = 0; for (const e of ents) if (e.obj && e.alive) n++; return n; }
      function objTotal() { let n = 0; for (const e of ents) if (e.obj) n++; return n; }
      function addScore(n) {
        score += n;
        if (score >= nextLife) { nextLife += 30000; lives++; say('EXTRA AIRFRAME', 120); au.melody([[660, .08], [880, .08], [1320, .16]], { type: 'square', vol: .12 }); }
        if (score > hi) hi = score;
      }
      function startGame() {
        score = 0; lives = 3; mi = 0; loop = 0; nextLife = 30000;
        loadMission(); mode = 'brief'; modeT = 0;
        au.melody([[392, .1], [523, .1], [659, .1], [784, .25]], { type: 'square', vol: .12 });
      }

      // ---------- effects ----------
      function puff(x, y, z, kind, size, life, vz) { parts.push({ x, y, z, kind, size, life, max: life, vz: vz || 0, vx: 0, vy: 0 }); }
      function boom(x, y, z, big) {
        puff(x, y, z + 1, 'fire', big ? 9 : 4, big ? 0.7 : 0.45, 2);
        for (let i = 0; i < (big ? 8 : 3); i++) {
          const p = { x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4, z: z + 1 + Math.random() * 3, kind: 'smoke', size: big ? 5 : 3, life: 1.6 + Math.random(), max: 2.6, vz: 3 + Math.random() * 4, vx: 0, vy: 0 };
          parts.push(p);
        }
        for (let i = 0; i < (big ? 10 : 4); i++) {
          const a = Math.random() * 6.283, s = 8 + Math.random() * 14;
          parts.push({ x, y, z: z + 1, kind: 'spark', size: 0.6, life: 0.6 + Math.random() * 0.5, max: 1.1, vz: 10 + Math.random() * 14, vx: Math.cos(a) * s, vy: Math.sin(a) * s });
        }
        au.noise(big ? 0.9 : 0.35, { freq: big ? 900 : 1600, slideTo: 60, vol: big ? 0.24 : 0.14 });
        if (big) shake = Math.max(shake, 6 * Math.max(0, 1 - Math.hypot(wd(x - P.x), wd(y - P.y)) / 160));
      }
      function damage(e, n) {
        if (!e.alive || e.tree) return;
        e.hp -= n;
        if (e.hp <= 0) {
          e.alive = false; e.deadT = 0; kills++;
          addScore(e.d.score);
          boom(e.x, e.y, e.z, true);
          if (e === tgt) { tgt = null; lockT = 0; }
          if (e.obj) {
            const left = objLeft();
            if (left > 0) say(e.d.name + ' DESTROYED  ' + left + ' TO GO', 150);
          }
        } else puff(e.x, e.y, e.z + e.d.size * 0.4, 'spark2', 1.2, 0.2, 0);
      }

      // ---------- targeting ----------
      function relInfo(e) {
        const dx = wd(e.x - P.x), dy = wd(e.y - P.y), d = Math.hypot(dx, dy);
        const fx = Math.cos(P.a), fy = Math.sin(P.a);
        const ang = Math.acos(clamp((dx * fx + dy * fy) / (d || 1), -1, 1));
        return { dx, dy, d, ang };
      }
      function tz(e) { return e.z + e.d.size * 0.35; }
      function validTarget(e, cone) {
        if (!e || !e.alive || e.tree) return false;
        const r = relInfo(e);
        if (r.d > 480 || r.ang > cone) return false;
        return los(P.x, P.y, P.alt, e.x, e.y, tz(e));
      }
      function candidates(cone) {
        const out = [];
        for (const e of ents) { if (!e.alive || e.tree) continue; const r = relInfo(e); if (r.d < 480 && r.ang < cone) out.push([r.ang + r.d / 2000 - (e.obj ? 0.05 : 0), e]); }
        out.sort((a, b) => a[0] - b[0]);
        return out.map(o => o[1]).filter(e => los(P.x, P.y, P.alt, e.x, e.y, tz(e)));
      }
      function updateTargeting() {
        if (api.frame % 6 !== 0 && tgt) {
          if (tgt.alive) { const r = relInfo(tgt); if (r.ang < 0.55) lockT++; else lockT = 0; }
          return;
        }
        if (tgt && !validTarget(tgt, 0.75)) { tgt = null; lockT = 0; }
        if (!tgt) { const c = candidates(0.5); if (c.length) { tgt = c[0]; lockT = 0; } }
        if (tgt) { const r = relInfo(tgt); if (r.ang < 0.55) lockT += 6; else lockT = 0; }
      }
      function cycleTarget() {
        const c = candidates(0.75); if (!c.length) return;
        const i = c.indexOf(tgt); tgt = c[(i + 1) % c.length]; lockT = 0;
        au.tone(900, 0.04, { type: 'square', vol: 0.08 });
      }
      const locked = () => tgt && tgt.alive && lockT >= 45 && relInfo(tgt).d < 270;

      // ---------- weapons ----------
      function aimDir(spd) {
        const mz = P.alt - 1.2;
        if (tgt && tgt.alive) {
          const r = relInfo(tgt);
          if (r.ang < 0.35) {
            const tt = r.d / spd;
            const tx = r.dx + (tgt.vx || 0) * tt, ty = r.dy + (tgt.vy || 0) * tt, tzz = tz(tgt) - mz;
            const l = Math.hypot(tx, ty, tzz) || 1; return [tx / l, ty / l, tzz / l];
          }
        }
        const fx = Math.cos(P.a), fy = Math.sin(P.a), dz = -0.07 - P.pv * 0.006;
        const l = Math.hypot(1, dz); return [fx / l, fy / l, dz / l];
      }
      function fire() {
        const w = P.wpn;
        if (P.cool > 0) return;
        if (P.ammo[w] <= 0) { P.cool = 20; au.tone(150, 0.05, { type: 'square', vol: 0.08 }); say(WPN[w].name + ' EMPTY', 60); return; }
        const mz = P.alt - 1.2;
        if (w === 0) {
          const [dx, dy, dz] = aimDir(320);
          const sp = 0.012;
          const vx = (dx + (Math.random() - 0.5) * sp) * 320, vy = (dy + (Math.random() - 0.5) * sp) * 320, vz = (dz + (Math.random() - 0.5) * sp) * 320;
          shots.push({ k: 'gun', x: P.x, y: P.y, z: mz, vx, vy, vz, life: 1.4, dmg: 1, splash: 0 });
          P.ammo[0]--; P.cool = WPN[0].rate;
          au.noise(0.05, { freq: 2600, vol: 0.09, type: 'bandpass' }); au.tone(80, 0.04, { type: 'square', vol: 0.06 });
        } else if (w === 1) {
          const [dx, dy, dz] = aimDir(190), side = (P.ammo[1] & 1) ? 1.5 : -1.5;
          shots.push({ k: 'rkt', x: P.x - Math.sin(P.a) * side, y: P.y + Math.cos(P.a) * side, z: mz, vx: dx * 190, vy: dy * 190, vz: dz * 190, life: 2.6, dmg: 3, splash: 8 });
          P.ammo[1]--; P.cool = WPN[1].rate;
          au.noise(0.3, { freq: 1800, slideTo: 300, vol: 0.12 });
        } else {
          const air = w === 3;
          if (!locked() || (air && !tgt.air)) { P.cool = 15; say(air ? 'AAM NEEDS AIR LOCK' : 'NO LOCK', 50); au.tone(220, 0.08, { type: 'square', vol: 0.08 }); return; }
          const fx = Math.cos(P.a), fy = Math.sin(P.a), sp = air ? 150 : 115;
          shots.push({ k: 'msl', x: P.x, y: P.y, z: mz - 0.5, vx: fx * sp * 0.6, vy: fy * sp * 0.6, vz: 6, sp, turn: air ? 4 : 2.8, life: 7, dmg: air ? 8 : 14, splash: 6, tgt });
          P.ammo[w]--; P.cool = WPN[w].rate;
          au.tone(260, 0.6, { type: 'sawtooth', slideTo: 70, vol: 0.09 }); au.noise(0.5, { freq: 1200, vol: 0.1 });
        }
      }
      function dropFlares() {
        if (P.flares <= 0) { say('NO FLARES', 50); return; }
        P.flares--;
        for (let i = 0; i < 2; i++) {
          const f = { x: P.x, y: P.y, z: P.alt - 1, vx: -Math.cos(P.a) * 10 + (i ? 8 : -8) * -Math.sin(P.a), vy: -Math.sin(P.a) * 10 + (i ? 8 : -8) * Math.cos(P.a), vz: 4, life: 2.5 };
          flares.push(f);
        }
        for (const s of eshots) if (s.k === 'sam' && !s.decoy && Math.random() < 0.8 / Math.sqrt(diff)) s.decoy = flares[flares.length - 1];
        au.noise(0.2, { freq: 3000, vol: 0.1, type: 'highpass' });
      }

      function segHit(s, nx, ny, nz, e, r) {
        // closest approach of segment (s -> s+n) to entity centre
        const cx = wd(e.x - s.x), cy = wd(e.y - s.y), cz = tz(e) - s.z;
        const l2 = nx * nx + ny * ny + nz * nz || 1;
        const t = clamp((cx * nx + cy * ny + cz * nz) / l2, 0, 1);
        const ex = cx - nx * t, ey = cy - ny * t, ez = cz - nz * t;
        return ex * ex + ey * ey + ez * ez < r * r;
      }
      function explodeAt(s) {
        if (s.splash) {
          for (const e of ents) {
            if (!e.alive || e.tree) continue;
            const d = Math.hypot(wd(e.x - s.x), wd(e.y - s.y), tz(e) - s.z);
            if (d < s.splash) damage(e, s.dmg * 0.5);
          }
          boom(s.x, s.y, s.z, false);
        } else puff(s.x, s.y, s.z, 'dust', 1.6, 0.4, 2);
      }
      function updShots() {
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          if (s.k === 'msl') {
            const t = s.tgt;
            if (t && t.alive) {
              const dx = wd(t.x - s.x), dy = wd(t.y - s.y), dz = tz(t) - s.z, l = Math.hypot(dx, dy, dz) || 1;
              const k = Math.min(1, s.turn * DT);
              s.vx += (dx / l * s.sp - s.vx) * k; s.vy += (dy / l * s.sp - s.vy) * k; s.vz += (dz / l * s.sp - s.vz) * k;
            }
            const v = Math.hypot(s.vx, s.vy, s.vz) || 1, ns = Math.min(s.sp, v + 120 * DT);
            s.vx *= ns / v; s.vy *= ns / v; s.vz *= ns / v;
            if ((api.frame & 1) === 0) puff(s.x, s.y, s.z, 'trail', 0.9, 0.7, 0.5);
          } else if (s.k === 'rkt' && (api.frame & 1) === 0) puff(s.x, s.y, s.z, 'trail', 0.7, 0.4, 0.3);
          const nx = s.vx * DT, ny = s.vy * DT, nz = s.vz * DT;
          let hit = null;
          for (const e of ents) {
            if (!e.alive || e.tree) continue;
            const r = e.d.size * 0.55 + (s.k === 'gun' ? 0.6 : 1);
            if (segHit(s, nx, ny, nz, e, r)) { hit = e; break; }
          }
          s.x = wrap(s.x + nx); s.y = wrap(s.y + ny); s.z += nz; s.life -= DT;
          if (hit) {
            damage(hit, s.dmg);
            if (s.splash) explodeAt(s); else if (Math.random() < 0.5) puff(s.x, s.y, s.z, 'spark2', 1, 0.15, 0);
            shots.splice(i, 1); continue;
          }
          if (s.z < hAt(s.x, s.y)) { explodeAt(s); shots.splice(i, 1); continue; }
          if (s.life <= 0) { if (s.k === 'msl') boom(s.x, s.y, s.z, false); shots.splice(i, 1); }
        }
      }

      // ---------- enemies ----------
      function hurtPlayer(n, why) {
        if (P.dead) return;
        P.armor -= n; flash = 10; shake = Math.max(shake, 3 + n * 0.15);
        au.noise(0.25, { freq: 2200, slideTo: 300, vol: 0.2 });
        if (P.armor <= 0) { P.armor = 0; killPlayer(why || 'SHOT DOWN'); }
        else if (P.armor < 30 && n > 0) say('ARMOR CRITICAL', 90);
      }
      function enemyFire(e, dist) {
        const d = e.d, sx = e.x, sy = e.y, sz = tz(e) + 1;
        const acc = 1 / diff;
        if (d.fire === 'shell') {
          const sp = 150, tt = dist / sp;
          const lead = 0.5 + Math.random() * 0.5;
          const tx = wd(P.x + Math.cos(P.a) * P.spd * tt * lead - sx), ty = wd(P.y + Math.sin(P.a) * P.spd * tt * lead - sy), tzz = P.alt - sz;
          const spread = (0.025 + Math.abs(P.spd) * 0.0009) * acc;
          const l = Math.hypot(tx, ty, tzz);
          eshots.push({ k: 'shell', x: sx, y: sy, z: sz, vx: (tx / l + (Math.random() - 0.5) * spread) * sp, vy: (ty / l + (Math.random() - 0.5) * spread) * sp, vz: (tzz / l + (Math.random() - 0.5) * spread) * sp, life: 3, dmg: 8 });
          au.noise(0.2, { freq: 500, vol: 0.08 * Math.max(0.3, 1 - dist / 300) });
        } else if (d.fire === 'flak') {
          for (let k = 0; k < 4; k++) {
            const sp = 200, tx = wd(P.x - sx), ty = wd(P.y - sy), tzz = P.alt - sz, l = Math.hypot(tx, ty, tzz), spread = 0.07 * acc;
            eshots.push({ k: 'flak', x: sx, y: sy, z: sz, vx: (tx / l + (Math.random() - 0.5) * spread) * sp, vy: (ty / l + (Math.random() - 0.5) * spread) * sp, vz: (tzz / l + (Math.random() - 0.5) * spread) * sp, life: 1.4, dmg: 2, delay: k * 5 });
          }
        } else if (d.fire === 'sam') {
          eshots.push({ k: 'sam', x: sx, y: sy, z: sz + 2, vx: 0, vy: 0, vz: 40, life: 9, dmg: 30, sp: 95 + loop * 8, turn: 1.7 + loop * 0.2, decoy: null });
          say('MISSILE LAUNCH!', 90);
          au.tone(1400, 0.15, { type: 'square', vol: 0.12 }); au.tone(1400, 0.15, { type: 'square', vol: 0.12, delay: 0.2 });
        } else if (d.fire === 'rkt') {
          for (let k = 0; k < 3; k++) {
            const sp = 170, tx = wd(P.x - sx), ty = wd(P.y - sy), tzz = P.alt - sz, l = Math.hypot(tx, ty, tzz), spread = 0.05 * acc;
            eshots.push({ k: 'rkt', x: sx, y: sy, z: sz, vx: (tx / l + (Math.random() - 0.5) * spread) * sp, vy: (ty / l + (Math.random() - 0.5) * spread) * sp, vz: (tzz / l + (Math.random() - 0.5) * spread) * sp, life: 2.2, dmg: 6, delay: k * 8 });
          }
          au.noise(0.3, { freq: 1500, slideTo: 400, vol: 0.08 });
        }
      }
      function updEnemies() {
        for (const e of ents) {
          if (e.tree) continue;
          if (!e.alive) {
            e.deadT += DT;
            if (e.air && e.z > ground(e.x, e.y) + 0.5) { e.z -= 30 * DT; e.rot += 0.3; if (e.z <= ground(e.x, e.y) + 0.5) boom(e.x, e.y, e.z, true); }
            if (e.deadT < 20 && (e.smokeT -= DT) <= 0) { e.smokeT = 0.25; puff(e.x, e.y, e.z + 2, 'smoke', 2.5, 2.2, 5); }
            continue;
          }
          const ox = e.x, oy = e.y;
          const dx = wd(P.x - e.x), dy = wd(P.y - e.y), dist = Math.hypot(dx, dy);
          // line of sight, staggered
          if (--e.losT <= 0) { e.losT = 12; e.los = !P.dead && dist < 520 && los(e.x, e.y, tz(e) + 1, P.x, P.y, P.alt); }
          if (e.conv) {
            const cx = wd(e.conv[0] - e.x), cy = wd(e.conv[1] - e.y), cd = Math.hypot(cx, cy);
            if (e.cool > -100 && missionT > 2) {
              if (cd < 4) {
                if (e.obj) { e.alive = false; e.escaped = true; escaped++; say('TRUCK ESCAPED (' + escaped + ')', 120); au.tone(200, 0.3, { type: 'square', vol: 0.12 }); }
                e.conv = null; continue;
              }
              const sp = (e.t === 'truck' ? 5.2 : 4.6) * (0.9 + loop * 0.1);
              e.x = wrap(e.x + cx / cd * sp * DT); e.y = wrap(e.y + cy / cd * sp * DT);
            }
          } else if (e.t === 'tank' || e.t === 'truck') {
            e.wT -= DT;
            if (e.wT <= 0) { e.wT = 6 + Math.random() * 8; const a = Math.random() * 6.283; e.wx = wrap(e.hx + Math.cos(a) * 18); e.wy = wrap(e.hy + Math.sin(a) * 18); }
            const wx = wd(e.wx - e.x), wy = wd(e.wy - e.y), wdd = Math.hypot(wx, wy);
            if (wdd > 1.5) {
              const nx = wrap(e.x + wx / wdd * 2.5 * DT), ny = wrap(e.y + wy / wdd * 2.5 * DT);
              if (ground(nx, ny) > waterLevel + 0.8) { e.x = nx; e.y = ny; } else e.wT = 0;
            }
          } else if (e.air) {
            // gunship: patrol, then close to stand-off range and face the player
            let gx, gy, sp = 22 + loop * 3;
            if (!P.dead && dist < 380 && (e.los || dist < 200)) {
              const want = 140;
              const k = dist > want ? 1 : -0.6;
              gx = e.x + dx / (dist || 1) * k * 50; gy = e.y + dy / (dist || 1) * k * 50;
              gx += -dy / (dist || 1) * 20 * Math.sin(api.time * 0.7 + e.rot);
              gy += dx / (dist || 1) * 20 * Math.sin(api.time * 0.7 + e.rot);
            } else {
              e.rot += DT * 0.25;
              gx = e.hx + Math.cos(e.rot) * 40; gy = e.hy + Math.sin(e.rot) * 40; sp = 16;
            }
            const mx = wd(gx - e.x), my = wd(gy - e.y), md = Math.hypot(mx, my);
            if (md > 1) { e.x = wrap(e.x + mx / md * Math.min(sp, md * 2) * DT); e.y = wrap(e.y + my / md * Math.min(sp, md * 2) * DT); }
            const want = Math.max(ground(e.x, e.y), ground(e.x + mx / (md || 1) * 15, e.y + my / (md || 1) * 15)) + 14;
            e.z += clamp(want - e.z, -12 * DT, 16 * DT);
          }
          e.vx = wd(e.x - ox) / DT; e.vy = wd(e.y - oy) / DT;
          if (!e.air) e.z = ground(e.x, e.y);
          // firing
          const d = e.d;
          if (!d.fire || P.dead || mode !== 'play') continue;
          e.cool -= DT;
          const rng0 = d.range * (d.fire === 'sam' ? 1 : 1);
          if (d.fire === 'sam') {
            if (e.los && dist < rng0) { e.lock += DT; if ((api.frame % 30) === 0) au.tone(1100, 0.05, { type: 'square', vol: 0.06 }); } else e.lock = Math.max(0, e.lock - DT * 2);
            if (e.lock > 1.6 / Math.sqrt(diff) && e.cool <= 0) { enemyFire(e, dist); e.cool = d.rate / diff; e.lock = 0; }
          } else if (e.los && dist < rng0 && e.cool <= 0) {
            enemyFire(e, dist); e.cool = (d.rate + Math.random() * 1.5) / diff;
          }
        }
      }
      function updEShots() {
        let missile = false;
        for (let i = eshots.length - 1; i >= 0; i--) {
          const s = eshots[i];
          if (s.delay > 0) { s.delay--; continue; }
          if (s.k === 'sam') {
            let tx, ty, tzz;
            if (s.decoy && s.decoy.life > 0) { tx = wd(s.decoy.x - s.x); ty = wd(s.decoy.y - s.y); tzz = s.decoy.z - s.z; }
            else if (s.decoy) { s.decoy = null; s.lost = true; tx = s.vx; ty = s.vy; tzz = s.vz; }
            else if (s.lost) { tx = s.vx; ty = s.vy; tzz = s.vz; }
            else { tx = wd(P.x - s.x); ty = wd(P.y - s.y); tzz = P.alt - s.z; missile = missile || Math.hypot(tx, ty) < 450; }
            const l = Math.hypot(tx, ty, tzz) || 1, k = Math.min(1, s.turn * DT);
            s.vx += (tx / l * s.sp - s.vx) * k; s.vy += (ty / l * s.sp - s.vy) * k; s.vz += (tzz / l * s.sp - s.vz) * k;
            const v = Math.hypot(s.vx, s.vy, s.vz) || 1; s.vx *= s.sp / v; s.vy *= s.sp / v; s.vz *= s.sp / v;
            if ((api.frame & 1) === 0) puff(s.x, s.y, s.z, 'trail', 1, 0.9, 0.4);
          } else if (s.k === 'rkt' && (api.frame & 3) === 0) puff(s.x, s.y, s.z, 'trail', 0.6, 0.4, 0.3);
          const nx = s.vx * DT, ny = s.vy * DT, nz = s.vz * DT;
          const px = wd(P.x - s.x), py = wd(P.y - s.y), pz = P.alt - s.z;
          const l2 = nx * nx + ny * ny + nz * nz || 1, t = clamp((px * nx + py * ny + pz * nz) / l2, 0, 1);
          const ex = px - nx * t, ey = py - ny * t, ez = pz - nz * t;
          const hitR = s.k === 'sam' ? 4 : 3;
          if (!P.dead && ex * ex + ey * ey + ez * ez < hitR * hitR) {
            hurtPlayer(s.dmg, s.k === 'sam' ? 'MISSILE HIT' : 'SHOT DOWN');
            if (s.k === 'sam') boom(P.x + Math.cos(P.a) * 4, P.y + Math.sin(P.a) * 4, P.alt, false);
            eshots.splice(i, 1); continue;
          }
          s.x = wrap(s.x + nx); s.y = wrap(s.y + ny); s.z += nz; s.life -= DT;
          if (s.z < hAt(s.x, s.y)) { if (s.k === 'sam' || s.k === 'shell') boom(s.x, s.y, s.z, false); else puff(s.x, s.y, s.z, 'dust', 1.4, 0.4, 2); eshots.splice(i, 1); continue; }
          if (s.life <= 0) { if (s.k === 'flak' || s.k === 'sam') puff(s.x, s.y, s.z, 'flak', 2.5, 0.6, 0); eshots.splice(i, 1); }
        }
        return missile;
      }
      function updParts() {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.life -= DT;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          p.z += p.vz * DT; p.x = wrap(p.x + p.vx * DT); p.y = wrap(p.y + p.vy * DT);
          if (p.kind === 'spark') { p.vz -= 30 * DT; if (p.z < hAt(p.x, p.y)) p.life = 0; }
          if (p.kind === 'smoke') { p.size += DT * 1.6; p.vz *= 0.99; }
          if (p.kind === 'fire') p.size += DT * 6;
        }
        if (parts.length > 400) parts.splice(0, parts.length - 400);
        for (let i = flares.length - 1; i >= 0; i--) {
          const f = flares[i]; f.life -= DT; f.x = wrap(f.x + f.vx * DT); f.y = wrap(f.y + f.vy * DT); f.vz -= 9 * DT; f.z += f.vz * DT;
          if (f.life <= 0) flares.splice(i, 1);
        }
      }

      // ---------- player ----------
      function killPlayer(why) {
        if (P.dead) return;
        P.dead = true; P.fallT = 0; P.why = why; mode = 'dying'; modeT = 0;
        say(why, 200);
        au.noise(1.2, { freq: 1200, slideTo: 80, vol: 0.25 });
        tgt = null;
      }
      function updPlayer() {
        const xmod = api.key('KeyX');
        if (xmod) xHeld++; else {
          if (xHeld > 0 && xHeld < 18 && !xUsed) {
            const inbound = eshots.some(s => s.k === 'sam' && !s.decoy && !s.lost);
            if (inbound) dropFlares(); else { P.wpn = (P.wpn + 1) % 4; au.tone(700, 0.04, { type: 'square', vol: 0.08 }); }
          }
          xHeld = 0; xUsed = false;
        }
        const up = api.key('ArrowUp'), dn = api.key('ArrowDown');
        let climb = api.key('KeyA') || api.key('KeyQ') || api.key('PageUp') || (xmod && up);
        let dive = api.key('KeyZ') || api.key('PageDown') || (xmod && dn);
        if (xmod && (up || dn)) xUsed = true;
        const fuelOut = P.fuel <= 0;
        if (fuelOut) { climb = false; dive = true; }
        // forward speed: cyclic forward/back, holds when released
        const maxSp = 34;
        let pvT = 0;
        if (!xmod) {
          if (up) { P.spd += 20 * DT; pvT = -14; }
          if (dn) { P.spd -= 26 * DT; pvT = 10; }
        }
        P.spd = clamp(P.spd, -10, maxSp);
        P.pv += (pvT + P.vs * 0.18 - P.pv) * 0.08;
        const tIn = (api.key('ArrowLeft') ? -1 : 0) + (api.key('ArrowRight') ? 1 : 0);
        P.turn += (tIn * 1.25 - P.turn) * 0.1;
        P.a += P.turn * DT;
        const vsT = climb ? 24 : dive ? -24 : 0;
        P.vs += (vsT - P.vs) * 0.09;
        P.alt += P.vs * DT;
        if (P.alt > 170) { P.alt = 170; P.vs = 0; }
        P.x = wrap(P.x + Math.cos(P.a) * P.spd * DT);
        P.y = wrap(P.y + Math.sin(P.a) * P.spd * DT);
        const g = ground(P.x, P.y) + 2.2;
        if (P.alt < g) {
          const imp = (g - P.alt) / DT + Math.max(0, -P.vs);
          P.alt = g;
          if (imp > 16) {
            hurtPlayer(Math.min(60, (imp - 16) * 0.9), 'TERRAIN IMPACT');
            P.spd *= 0.4; P.vs = 6; au.noise(0.3, { freq: 400, vol: 0.2 });
          } else if (P.vs < 0) P.vs = 0;
          if (fuelOut && !P.dead) killPlayer('FUEL EXHAUSTED');
        }
        // fuel
        P.fuel -= DT * (0.28 + Math.abs(P.spd) * 0.004 + Math.max(0, P.vs) * 0.003);
        if (P.fuel < 0) P.fuel = 0;
        if (P.fuel < 15 && P.fuel > 0 && api.frame % 240 === 0) say('BINGO FUEL - RETURN TO FARP', 120);
        // weapons
        for (let i = 0; i < 4; i++) if (api.pressed('Digit' + (i + 1))) { P.wpn = i; au.tone(700, 0.04, { type: 'square', vol: 0.08 }); }
        if (api.anyPressed('KeyT', 'KeyC', 'Tab')) cycleTarget();
        if (api.pressed('KeyF')) dropFlares();
        if (P.cool > 0) P.cool--;
        if (api.key('Space')) fire();
        updateTargeting();
        if (locked() && lockT < 51) au.tone(1500, 0.06, { type: 'sine', vol: 0.1 });
        // FARP: rearm / refuel / repair when settled on the pad
        const bd = Math.hypot(wd(P.x - base.x), wd(P.y - base.y)), agl = P.alt - ground(P.x, P.y);
        if (bd < 13 && agl < 4.5 && Math.abs(P.spd) < 6) {
          landT++;
          if (objDone) { missionComplete(); return; }
          if (landT % 6 === 0) {
            let any = false;
            if (P.fuel < 100) { P.fuel = Math.min(100, P.fuel + 2); any = true; }
            if (P.armor < 100) { P.armor = Math.min(100, P.armor + 1); any = true; }
            for (let i = 0; i < 4; i++) if (P.ammo[i] < WPN[i].max) { P.ammo[i] = Math.min(WPN[i].max, P.ammo[i] + Math.ceil(WPN[i].max / 40)); any = true; }
            if (P.flares < 12) { P.flares++; any = true; }
            if (any && landT > 30) rearmMsg = 20;
          }
        } else landT = 0;
        // rotor sound
        if (++rotorT >= 8) { rotorT = 0; au.noise(0.07, { freq: 140 + Math.abs(P.spd) * 3 + Math.max(0, P.vs) * 4, vol: 0.05 }); }
      }
      function missionComplete() {
        const tb = Math.max(0, Math.round(600 - missionT) * 10);
        const bonus = Math.round(P.armor) * 20 + Math.round(P.fuel) * 10 + tb + 5000;
        doneInfo = { name: MISSIONS[mi].name, armor: Math.round(P.armor) * 20, fuel: Math.round(P.fuel) * 10, time: tb, total: bonus };
        addScore(bonus);
        mode = 'done'; modeT = 0;
        au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .35]], { type: 'square', vol: .12 });
      }
      function loseLife(reload) {
        lives--;
        const go = () => {
          if (reload) { loadMission(); mode = 'brief'; modeT = 0; }
          else { newPlayer(); eshots = []; mode = 'play'; modeT = 0; say('NEW AIRFRAME - GOOD HUNTING', 120); }
        };
        if (lives > 0) { go(); return; }
        const end = () => { mode = 'over'; modeT = 0; api.setHiScore(score); au.melody([[392, .25], [330, .25], [262, .5]], { type: 'square', vol: .12 }); };
        if (api.offerContinue) { mode = 'cont'; api.offerContinue(() => { lives = 3; go(); }, end); }
        else end();
      }

      // ---------- update ----------
      function tryStart() {
        if (api.useCredit()) { startGame(); return; }
        coinFlash = 90; au.tone(70, 0.25, { type: 'square', vol: 0.2 });
      }
      function update() {
        modeT += DT;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        if (flash > 0) flash--;
        shake *= 0.9;
        if (mode === 'attract') {
          demo.a += DT * 0.12; demo.x = wrap(demo.x + Math.cos(demo.a) * 22 * DT); demo.y = wrap(demo.y + Math.sin(demo.a) * 22 * DT);
          let ah = 0; for (let k = 0; k < 6; k++) ah = Math.max(ah, ground(demo.x + Math.cos(demo.a) * k * 12, demo.y + Math.sin(demo.a) * k * 12));
          demo.h += (ah + 22 - demo.h) * 0.03;
          if (modeT > 8) { modeT = 0; page = (page + 1) % 3; }
          if (api.anyPressed('Enter', 'Space')) tryStart();
          updParts();
          return;
        }
        if (mode === 'brief') {
          if (modeT > 0.6 && api.anyPressed('Enter', 'Space')) { mode = 'play'; modeT = 0; say('LIFT OFF - FOLLOW THE WAYPOINT', 150); }
          return;
        }
        if (mode === 'over') { if (modeT > 5 || (modeT > 1.5 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; modeT = 0; page = 2; } return; }
        if (mode === 'cont') return;
        if (mode === 'done') {
          if (modeT > 6 || (modeT > 1.5 && api.anyPressed('Enter', 'Space'))) {
            mi++;
            if (mi >= MISSIONS.length) { mi = 0; loop++; }
            loadMission(); mode = 'brief'; modeT = 0;
          }
          return;
        }
        if (mode === 'failed') { if (modeT > 4) loseLife(true); return; }
        if (api.pressed('KeyP')) paused = !paused;
        if (paused) return;
        if (mode === 'dying') {
          P.fallT += DT; P.spin += DT * 5; P.a += DT * 3; P.alt -= DT * (8 + P.fallT * 12);
          if ((api.frame & 3) === 0) puff(P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3, P.alt - 2, 'smoke', 2, 1.5, 3);
          const g = ground(P.x, P.y) + 1;
          if (P.alt <= g && !P.crashed) { P.alt = g; P.crashed = true; boom(P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3, g, true); flash = 20; }
          if (P.crashed) P.alt = g;
          updEnemies(); updShots(); updEShots(); updParts();
          if (modeT > 4) loseLife(false);
          return;
        }
        // play
        missionT += DT;
        updPlayer();
        if (mode !== 'play') return;
        updEnemies(); updShots();
        const missile = updEShots(); updParts();
        if (missile) { if (++warnT % 16 === 0) au.tone(warnT % 32 ? 880 : 660, 0.1, { type: 'square', vol: 0.1 }); } else warnT = 0;
        if (rearmMsg > 0) rearmMsg--;
        if (!objDone && escaped >= 2) { mode = 'failed'; modeT = 0; say('CONVOY ESCAPED - MISSION FAILED', 240); au.melody([[330, .2], [262, .2], [196, .4]], { type: 'square', vol: .12 }); return; }
        if (!objDone && objLeft() === 0) {
          objDone = true; say('OBJECTIVES COMPLETE - RETURN TO FARP', 220);
          au.melody([[784, .1], [988, .1], [1175, .2]], { type: 'square', vol: .12 });
        }
      }

      // ---------- rendering: voxel terrain ----------
      function setCam(x, y, h, a, hor, rk) {
        cam.x = x; cam.y = y; cam.h = h; cam.a = a; cam.fx = Math.cos(a); cam.fy = Math.sin(a); cam.rx = -Math.sin(a); cam.ry = Math.cos(a);
        cam.hor = hor; cam.rk = rk;
      }
      function drawTerrain() {
        const s0 = theme.sky0, s1 = theme.sky1, hor = cam.hor;
        for (let y = 0; y < VH; y++) {
          let c;
          if (y >= hor) c = fogC;
          else { const t = clamp((hor - y) / (VH * 0.9), 0, 1); c = pack(s1[0] + (s0[0] - s1[0]) * t, s1[1] + (s0[1] - s1[1]) * t, s1[2] + (s0[2] - s1[2]) * t); }
          buf.fill(c, y * W, y * W + W);
        }
        zbuf.fill(1e9); ybuf.fill(VH);
        const cx = cam.x + 4096, cy = cam.y + 4096, fx = cam.fx, fy = cam.fy, rx = cam.rx * TAN, ry = cam.ry * TAN, camH = cam.h, rk = cam.rk;
        let z = 1, dz = 0.5;
        const fogStart = DRAW * 0.4, fogLen = DRAW - fogStart;
        while (z < DRAW) {
          let px = cx + z * (fx - rx), py = cy + z * (fy - ry);
          const ddx = 2 * z * rx / W, ddy = 2 * z * ry / W, inv = FOCAL / z;
          const ft = z > fogStart ? ((z - fogStart) / fogLen * 256) | 0 : 0;
          let base0 = hor - HW * rk;
          for (let i = 0; i < W; i++) {
            const idx = ((py | 0) & MM) * MS + ((px | 0) & MM);
            let sy = ((camH - hmap[idx]) * inv + base0) | 0;
            if (sy < 0) sy = 0;
            const yb = ybuf[i];
            if (sy < yb) {
              const col = ft ? mixc(cmap[idx], fogC, ft) : cmap[idx];
              for (let y = sy, p = sy * W + i; y < yb; y++, p += W) { buf[p] = col; zbuf[p] = z; }
              ybuf[i] = sy;
            }
            px += ddx; py += ddy; base0 += rk;
          }
          z += dz; dz += 0.011;
        }
      }
      const PJ = { sx: 0, sy: 0, zf: 0 };
      function project(ex, ey, ez) {
        const dx = wd(ex - cam.x), dy = wd(ey - cam.y);
        const zf = dx * cam.fx + dy * cam.fy;
        if (zf < 1.5 || zf > DRAW) return null;
        const lat = dx * cam.rx + dy * cam.ry;
        PJ.sx = HW + lat / zf * FOCAL;
        PJ.sy = cam.hor + (cam.h - ez) / zf * FOCAL + (PJ.sx - HW) * cam.rk;
        PJ.zf = zf;
        return PJ;
      }
      function blit(s, data, cx, by, dw, zf) {
        dw = Math.min(900, Math.max(1, Math.round(dw)));
        const dh = Math.max(1, Math.round(dw * s.h / s.w));
        const x0 = Math.round(cx - dw / 2), y0 = Math.round(by - dh), zt = zf - 3;
        const ft = zf > DRAW * 0.4 ? ((zf - DRAW * 0.4) / (DRAW * 0.6) * 256) | 0 : 0;
        for (let yy = Math.max(0, -y0); yy < dh; yy++) {
          const py = y0 + yy; if (py >= VH) break;
          const srow = ((yy * s.h / dh) | 0) * s.w;
          for (let xx = Math.max(0, -x0); xx < dw; xx++) {
            const px = x0 + xx; if (px >= W) break;
            let c = data[srow + ((xx * s.w / dw) | 0)]; if (!c) continue;
            const p = py * W + px;
            if (zt < zbuf[p]) { if (ft) c = mixc(c, fogC, ft); buf[p] = c; }
          }
        }
      }
      function disc(cx, cy, r, c, zf) {
        if (theme.nv) c = nv(c);
        const ri = Math.max(0.6, r), x0 = Math.max(0, Math.floor(cx - ri)), x1 = Math.min(W - 1, Math.ceil(cx + ri));
        const y0 = Math.max(0, Math.floor(cy - ri)), y1 = Math.min(VH - 1, Math.ceil(cy + ri)), r2 = ri * ri;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy > r2) continue;
          const p = y * W + x; if (zf - 1 < zbuf[p]) buf[p] = c;
        }
      }
      function hline(x0, x1, y, c, zf) {
        y = Math.round(y); if (y < 0 || y >= VH) return;
        if (theme.nv) c = nv(c);
        for (let x = Math.max(0, Math.round(x0)); x <= Math.min(W - 1, Math.round(x1)); x++) { const p = y * W + x; if (zf - 2 < zbuf[p]) buf[p] = c; }
      }
      const C_FIRE = [pack(255, 240, 160), pack(255, 180, 60), pack(230, 90, 30)];
      function drawObjects() {
        const list = [];
        for (const e of ents) {
          const sz = e.d.size;
          const p = project(e.x, e.y, e.z); if (!p) continue;
          const dw = sz * FOCAL / p.zf;
          if (dw < 0.5) continue;
          list.push({ zf: p.zf, sx: p.sx, sy: p.sy, dw, e });
        }
        for (const q of parts) {
          const p = project(q.x, q.y, q.z); if (!p || p.zf < (q.kind === 'trail' ? 8 : 3)) continue;
          list.push({ zf: p.zf, sx: p.sx, sy: p.sy, dw: Math.min(36, q.size * FOCAL / p.zf), q });
        }
        for (const s of shots) { const p = project(s.x, s.y, s.z); if (p) list.push({ zf: p.zf, sx: p.sx, sy: p.sy, s, c: s.k === 'gun' ? pack(255, 240, 120) : pack(255, 255, 230) }); }
        for (const s of eshots) { if (s.delay > 0) continue; const p = project(s.x, s.y, s.z); if (p) list.push({ zf: p.zf, sx: p.sx, sy: p.sy, s, c: s.k === 'sam' ? pack(255, 255, 255) : pack(255, 120, 60) }); }
        for (const f of flares) { const p = project(f.x, f.y, f.z); if (p) list.push({ zf: p.zf, sx: p.sx, sy: p.sy, s: f, c: pack(255, 250, 200), big: 1 }); }
        list.sort((a, b) => b.zf - a.zf);
        const nvOn = theme.nv;
        for (const o of list) {
          if (o.e) {
            const e = o.e;
            if (e.tree) { blit(SPR.tree, nvOn ? SPR.tree.n : SPR.tree.d, o.sx, o.sy + 1, o.dw, o.zf); continue; }
            const s = SPR[e.t];
            const data = e.alive ? (nvOn ? s.n : s.d) : (nvOn ? s.wn : s.wr);
            if (e.escaped) continue;
            blit(s, data, o.sx, o.sy + Math.max(1, o.dw * 0.08), o.dw, o.zf);
            if (e.air && e.alive) {
              const ry = o.sy - o.dw * s.h / s.w - 1, half = o.dw * (0.55 + 0.1 * Math.sin(api.time * 40));
              hline(o.sx - half, o.sx + half, ry, (api.frame & 1) ? pack(40, 40, 36) : pack(110, 110, 100), o.zf);
            }
          } else if (o.q) {
            const q = o.q, t = q.life / q.max;
            let c;
            if (q.kind === 'fire') c = C_FIRE[Math.min(2, (3 - t * 3) | 0)];
            else if (q.kind === 'smoke') { const g = 40 + (1 - t) * 60; c = pack(g, g, g * 0.95); }
            else if (q.kind === 'trail') { const g = 170 + t * 60; c = pack(g, g, g); }
            else if (q.kind === 'dust') c = pack(150, 130, 100);
            else if (q.kind === 'flak') c = pack(50, 46, 44);
            else c = pack(255, 210, 90);
            disc(o.sx, o.sy, Math.max(0.6, o.dw), c, o.zf);
          } else {
            const r = o.big ? Math.max(1.2, 3 * FOCAL / o.zf / 4) : Math.max(0.7, 1.4 * FOCAL / o.zf / 4);
            disc(o.sx, o.sy, r, o.c, o.zf);
          }
        }
      }

      // ---------- rendering: HUD / panel ----------
      const HUD = '#7dff86', HUDD = '#2f9a3c';
      function hudBracket(ctx, x, y, r, col, solid) {
        ctx.fillStyle = col;
        const l = Math.max(3, r * 0.6);
        if (solid) { ctx.fillRect(x - r, y - r, r * 2, 1); ctx.fillRect(x - r, y + r, r * 2 + 1, 1); ctx.fillRect(x - r, y - r, 1, r * 2); ctx.fillRect(x + r, y - r, 1, r * 2); return; }
        ctx.fillRect(x - r, y - r, l, 1); ctx.fillRect(x - r, y - r, 1, l); ctx.fillRect(x + r - l + 1, y - r, l, 1); ctx.fillRect(x + r, y - r, 1, l);
        ctx.fillRect(x - r, y + r, l, 1); ctx.fillRect(x - r, y + r - l + 1, 1, l); ctx.fillRect(x + r - l + 1, y + r, l, 1); ctx.fillRect(x + r, y + r - l + 1, 1, l);
      }
      function heading(a) { return ((a * 180 / Math.PI + 90) % 360 + 360) % 360; }
      function wpPos() {
        if (objDone) return [base.x, base.y, 'FARP'];
        let best = null, bd = 1e9;
        for (const e of ents) { if (!e.obj || !e.alive) continue; const d = Math.hypot(wd(e.x - P.x), wd(e.y - P.y)); if (d < bd) { bd = d; best = e; } }
        return best ? [best.x, best.y, 'TGT'] : [base.x, base.y, 'FARP'];
      }
      function drawHUD(ctx) {
        // heading tape
        const hd = heading(P.a);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(90, 1, 140, 16);
        for (let d = Math.floor((hd - 30) / 5) * 5; d <= hd + 30; d += 5) {
          const x = Math.round(HW + (d - hd) * 2.2); if (x < 92 || x > 228) continue;
          const dd = ((d % 360) + 360) % 360;
          ctx.fillStyle = HUD; ctx.fillRect(x, 10, 1, dd % 15 === 0 ? 5 : 2);
          if (dd % 45 === 0) { const lb = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][dd / 45]; text(ctx, lb, x, 2, HUD, 1, 'center'); }
        }
        ctx.fillStyle = HUD; ctx.fillRect(HW, 15, 1, 3);
        const [wx, wy, wl] = wpPos();
        const wb = ((Math.atan2(wd(wy - P.y), wd(wx - P.x)) * 180 / Math.PI + 90) % 360 + 360) % 360;
        let rel = wb - hd; if (rel > 180) rel -= 360; if (rel < -180) rel += 360;
        const wxp = Math.round(HW + clamp(rel, -30, 30) * 2.2);
        ctx.fillStyle = '#40e0ff'; ctx.fillRect(wxp - 2, 17, 5, 1); ctx.fillRect(wxp - 1, 18, 3, 1); ctx.fillRect(wxp, 19, 1, 1);
        // gun reticle
        const ry = 62;
        ctx.fillStyle = HUD;
        ctx.fillRect(HW - 9, ry, 6, 1); ctx.fillRect(HW + 4, ry, 6, 1); ctx.fillRect(HW, ry - 9, 1, 6); ctx.fillRect(HW, ry + 4, 1, 6); ctx.fillRect(HW, ry, 1, 1);
        // speed and radar altitude
        const kts = Math.round(P.spd * 5), agl = Math.max(0, Math.round((P.alt - ground(P.x, P.y)) * 3));
        text(ctx, 'KTS', 8, 46, HUDD); text(ctx, String(kts), 8, 56, HUD, 1);
        text(ctx, 'ALT', 290, 46, HUDD); text(ctx, String(agl), 312, 56, HUD, 1, 'right');
        ctx.fillStyle = HUDD; ctx.fillRect(306, 68, 2, 50);
        ctx.fillStyle = HUD; const ab = Math.min(50, agl / 6); ctx.fillRect(304, 118 - ab, 6, 1);
        const vsb = clamp(P.vs * 0.8, -20, 20); ctx.fillRect(14, 92 - Math.max(0, vsb), 2, Math.abs(vsb) + 1);
        ctx.fillStyle = HUDD; ctx.fillRect(10, 92, 10, 1);
        // waypoint marker in the world
        const wp = project(wx, wy, ground(wx, wy) + 14);
        if (wp && wp.sx > 0 && wp.sx < W && wp.sy > 20 && wp.sy < VH) {
          ctx.fillStyle = '#40e0ff';
          const x = Math.round(wp.sx), y = Math.round(wp.sy);
          ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7);
          text(ctx, wl, x, y - 12, '#40e0ff', 1, 'center');
        }
        // target designation
        if (tgt && tgt.alive) {
          const p = project(tgt.x, tgt.y, tz(tgt));
          const lk = locked();
          if (p && p.sx > -10 && p.sx < W + 10 && p.sy > -10 && p.sy < VH + 10) {
            const r = Math.max(5, Math.min(30, tgt.d.size * 0.7 * FOCAL / p.zf));
            const col = lk ? ((api.frame >> 2) & 1 ? '#ff5050' : '#ffd040') : HUD;
            hudBracket(ctx, Math.round(p.sx), Math.round(p.sy), Math.round(r), col, lk);
            if (lk) text(ctx, 'LOCK', Math.round(p.sx), Math.round(p.sy + r + 3), col, 1, 'center');
            else { ctx.fillStyle = HUD; ctx.fillRect(Math.round(p.sx - r), Math.round(p.sy + r + 3), Math.round(2 * r * Math.min(1, lockT / 45)), 1); }
          }
        }
        // warnings / messages
        if (warnT > 0 && (api.frame >> 3) & 1) text(ctx, 'MISSILE', HW, 30, '#ff4040', 2, 'center');
        else if (ents.some(e => e.alive && e.t === 'sam' && e.lock > 0.3) && (api.frame >> 4) & 1) text(ctx, 'SAM RADAR', HW, 30, '#ffb040', 1, 'center');
        const agl0 = P.alt - ground(P.x, P.y);
        if (P.spd > 15 && ground(P.x + Math.cos(P.a) * 14, P.y + Math.sin(P.a) * 14) + 2 > P.alt && agl0 < 20 && (api.frame >> 3) & 1) text(ctx, 'PULL UP', HW, 80, '#ff4040', 1, 'center');
        if (P.fuel < 15 && (api.frame >> 5) & 1) text(ctx, 'LOW FUEL', HW, 92, '#ffb040', 1, 'center');
        if (rearmMsg > 0) text(ctx, 'FARP: REARM REFUEL REPAIR', HW, 104, '#40e0ff', 1, 'center');
        if (msgT > 0) text(ctx, msg, HW, 122, msgT > 30 || (msgT >> 2) & 1 ? '#ffffff' : '#888', 1, 'center');
        if (paused) text(ctx, 'PAUSED', HW, 70, '#fff', 2, 'center');
      }
      function bar(ctx, x, y, w, v, col) {
        ctx.fillStyle = '#0b2210'; ctx.fillRect(x, y, w, 5);
        ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * clamp(v, 0, 1)), 5);
      }
      function drawPanel(ctx) {
        ctx.fillStyle = '#2a2d29'; ctx.fillRect(0, VH, W, H - VH);
        ctx.fillStyle = '#4a4e47'; ctx.fillRect(0, VH, W, 2);
        ctx.fillStyle = '#151714'; ctx.fillRect(0, VH + 2, W, 1);
        for (const x of [2, 78, 240, 316]) { ctx.fillStyle = '#60645c'; ctx.fillRect(x, VH + 6, 2, 2); ctx.fillRect(x, H - 6, 2, 2); }
        // left MFD: tactical radar
        ctx.fillStyle = '#050c06'; ctx.fillRect(6, VH + 4, 70, H - VH - 7);
        const rcx = 41, rcy = VH + 31, rr = 25, rng0 = 420, k = rr / rng0;
        ctx.fillStyle = '#123a18';
        for (let a = 0; a < 32; a++) { const t = a / 32 * 6.283; ctx.fillRect(Math.round(rcx + Math.cos(t) * rr), Math.round(rcy + Math.sin(t) * rr), 1, 1); ctx.fillRect(Math.round(rcx + Math.cos(t) * rr / 2), Math.round(rcy + Math.sin(t) * rr / 2), 1, 1); }
        const fx = Math.cos(P.a), fy = Math.sin(P.a), rxv = -fy, ryv = fx;
        const dot = (x, y, col, s) => {
          const dx = wd(x - P.x), dy = wd(y - P.y), lat = dx * rxv + dy * ryv, fw = dx * fx + dy * fy;
          let px = lat * k, py = -fw * k; const l = Math.hypot(px, py);
          if (l > rr) { px *= rr / l; py *= rr / l; if ((api.frame >> 3) & 1) return; }
          ctx.fillStyle = col; ctx.fillRect(Math.round(rcx + px - (s >> 1)), Math.round(rcy + py - (s >> 1)), s, s);
        };
        dot(base.x, base.y, '#40e0ff', 3);
        for (const e of ents) {
          if (!e.alive || e.tree) continue;
          if (e.obj && (api.frame >> 4) & 1) dot(e.x, e.y, '#ffffff', 2);
          else dot(e.x, e.y, e.air ? '#ffd040' : '#ff4a3a', 2);
        }
        for (const s of eshots) if (s.k === 'sam') dot(s.x, s.y, '#ffffff', 1);
        ctx.fillStyle = HUD; ctx.fillRect(rcx, rcy - 1, 1, 3); ctx.fillRect(rcx - 1, rcy, 3, 1);
        text(ctx, 'TSD', 9, VH + 6, HUDD);
        // centre: weapons + target info
        ctx.fillStyle = '#050c06'; ctx.fillRect(82, VH + 4, 156, H - VH - 7);
        for (let i = 0; i < 4; i++) {
          const y = VH + 7 + i * 9, sel = i === P.wpn;
          if (sel) { ctx.fillStyle = '#1f5a27'; ctx.fillRect(84, y - 1, 74, 9); }
          text(ctx, (i + 1) + ' ' + WPN[i].s, 86, y, sel ? '#ffffff' : HUDD);
          text(ctx, String(P.ammo[i]), 156, y, sel ? '#ffffff' : HUD, 1, 'right');
        }
        text(ctx, 'FLR ' + P.flares, 86, VH + 44, HUD);
        let tl = 'NO TARGET', tc = HUDD;
        if (tgt && tgt.alive) {
          const r = relInfo(tgt); tl = tgt.d.name; tc = locked() ? '#ffd040' : HUD;
          text(ctx, Math.round(r.d * 5) + 'M', 234, VH + 16, HUD, 1, 'right');
          text(ctx, locked() ? 'LOCKED' : 'TRACK', 234, VH + 25, tc, 1, 'right');
        }
        text(ctx, tl, 234, VH + 7, tc, 1, 'right');
        const ol = objLeft(), ot = objTotal();
        text(ctx, objDone ? 'RTB FARP' : 'OBJ ' + (ot - ol) + '/' + ot, 234, VH + 44, objDone ? '#40e0ff' : '#ffd040', 1, 'right');
        text(ctx, 'M' + (mi + 1) + (loop ? '+' + loop : ''), 234, VH + 35, HUDD, 1, 'right');
        // right MFD
        ctx.fillStyle = '#050c06'; ctx.fillRect(244, VH + 4, 70, H - VH - 7);
        text(ctx, 'ARM', 247, VH + 7, HUDD); bar(ctx, 268, VH + 8, 42, P.armor / 100, P.armor < 30 ? '#ff4040' : HUD);
        text(ctx, 'FUEL', 247, VH + 16, HUDD); bar(ctx, 274, VH + 17, 36, P.fuel / 100, P.fuel < 15 ? '#ffb040' : HUD);
        text(ctx, String(score).padStart(7, '0'), 311, VH + 27, '#ffffff', 1, 'right');
        text(ctx, 'HI ' + String(hi).padStart(7, '0'), 311, VH + 36, HUDD, 1, 'right');
        for (let i = 0; i < Math.min(6, lives - 1); i++) { const x = 248 + i * 10; ctx.fillStyle = HUD; ctx.fillRect(x, VH + 49, 7, 2); ctx.fillRect(x + 2, VH + 47, 1, 2); ctx.fillRect(x - 1, VH + 46, 9, 1); ctx.fillRect(x + 6, VH + 50, 3, 1); }
      }
      function drawMap(ctx, x0, y0, sz) {
        if (!mapImg) mapImg = ctx.createImageData(sz, sz);
        if (mapFor !== mi * 100 + loop) {
          mapFor = mi * 100 + loop;
          const m32 = new Uint32Array(mapImg.data.buffer), sc = 300 / sz;
          for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
            const wx = base.x - 150 + x * sc, wy = base.y - 250 + y * sc;
            m32[y * sz + x] = cmap[((((wy + 4096) | 0) & MM) * MS) + (((wx + 4096) | 0) & MM)];
          }
        }
        ctx.putImageData(mapImg, x0, y0);
        const sc = sz / 300;
        const pt = (x, y, col, s) => {
          const px = x0 + (wd(x - base.x) + 150) * sc, py = y0 + (wd(y - base.y) + 250) * sc;
          if (px < x0 || py < y0 || px > x0 + sz || py > y0 + sz) return;
          ctx.fillStyle = col; ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
        };
        pt(base.x, base.y, '#40e0ff', 4);
        for (const e of ents) if (e.alive && !e.tree) pt(e.x, e.y, e.obj ? ((api.frame >> 3) & 1 ? '#fff' : '#ff3030') : '#c02020', e.obj ? 3 : 2);
        for (const e of ents) if (e.alive && e.conv && e.obj) pt(e.conv[0], e.conv[1], '#ffd040', 3);
        ctx.strokeStyle = '#7dff86'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 0.5, y0 - 0.5, sz + 1, sz + 1);
      }

      function render(ctx) {
        if (!img) { img = ctx.createImageData(W, VH); buf = new Uint32Array(img.data.buffer); }
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract' || mode === 'over') {
          setCam(demo.x, demo.y, demo.h, demo.a, VH * 0.42, Math.sin(api.time * 0.4) * 0.05);
          drawTerrain(); drawObjects();
          ctx.putImageData(img, 0, 30);
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 30); ctx.fillRect(0, 30 + VH, W, H - 30 - VH);
          text(ctx, 'HI ' + String(hi).padStart(7, '0'), HW, 4, '#ffd040', 1, 'center');
          text(ctx, 'SCORE ' + String(score).padStart(7, '0'), 6, 4, '#ccc');
          if (mode === 'over') {
            text(ctx, 'GAME OVER', HW, 80, '#ff4040', 3, 'center');
          } else if (page === 0) {
            text(ctx, 'COMANCHE', HW + 2, 52, '#000', 4, 'center');
            text(ctx, 'COMANCHE', HW, 50, '#9fe870', 4, 'center');
            text(ctx, 'MAXIMUM OVERKILL', HW, 86, '#e8c040', 2, 'center');
            text(ctx, 'VOXEL ATTACK HELICOPTER COMBAT', HW, 112, '#ffffff', 1, 'center');
          } else if (page === 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(30, 40, 260, 120);
            const L = ['ARROWS  TURN / SPEED', 'A,Z OR X+UP/DN  CLIMB / DIVE', 'SPACE   FIRE WEAPON', 'X       NEXT WEAPON', '        (FLARES IF MISSILE)', '1-4  WEAPON   T  TARGET', 'HIDE BEHIND HILLS, POP UP,', 'LOCK ON AND STRIKE!'];
            L.forEach((s, i) => text(ctx, s, 40, 48 + i * 13, i < 6 ? '#9fe870' : '#ffd040'));
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(60, 40, 200, 120);
            text(ctx, 'MISSIONS', HW, 48, '#e8c040', 2, 'center');
            MISSIONS.forEach((m, i) => text(ctx, (i + 1) + '  ' + m.name, 90, 72 + i * 13, '#9fe870'));
          }
          const blink = (api.frame >> 4) & 1;
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', HW, 176, '#fff', 1, 'center'); }
          else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', HW, 176, '#fff', 1, 'center'); }
          else text(ctx, 'PUSH START', HW, 176, blink ? '#fff' : '#888', 1, 'center');
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 6, 190, '#888');
          text(ctx, '\u00a9 1992 NOVALOGIC', 314, 190, '#666', 1, 'right');
          return;
        }
        if (mode === 'brief') {
          ctx.fillStyle = '#071008'; ctx.fillRect(0, 0, W, H);
          const m = MISSIONS[mi];
          text(ctx, 'MISSION ' + (mi + 1) + (loop ? '  (TOUR ' + (loop + 1) + ')' : ''), 8, 8, '#e8c040');
          text(ctx, m.name, 8, 20, '#ffffff', 2);
          drawMap(ctx, 8, 44, 120);
          m.text.forEach((s, i) => text(ctx, s, 136, 48 + i * 11, '#9fe870'));
          const ol = objTotal();
          text(ctx, 'OBJECTIVES: ' + ol, 136, 102, '#ffd040');
          text(ctx, 'TERRAIN: ' + m.theme.toUpperCase(), 136, 114, '#9fe870');
          text(ctx, 'LIVES ' + lives + '   SCORE ' + score, 136, 126, '#ccc');
          text(ctx, 'BLUE = FARP   WHITE = TARGET', 136, 150, '#7ab');
          if ((api.frame >> 4) & 1) text(ctx, 'PRESS START TO LAUNCH', HW, 182, '#fff', 1, 'center');
          return;
        }
        // cockpit view
        const sh = shake > 0.3 ? (Math.random() - 0.5) * shake : 0;
        const rk = -P.turn * 0.09 + (P.dead ? Math.sin(P.spin) * 0.3 : 0);
        if (P.dead) setCam(wrap(P.x - Math.cos(P.a) * 14), wrap(P.y - Math.sin(P.a) * 14), Math.max(P.alt + 3, ground(P.x, P.y) + 14), P.a, VH * 0.42 + 26 + sh, rk);
        else setCam(P.x, P.y, P.alt, P.a, VH * 0.42 + P.pv + sh, rk);
        drawTerrain(); drawObjects();
        ctx.putImageData(img, 0, 0);
        if (flash > 0) { ctx.fillStyle = 'rgba(255,40,20,' + (flash / 30) + ')'; ctx.fillRect(0, 0, W, VH); }
        // canopy frame
        ctx.fillStyle = '#1d201c'; ctx.fillRect(0, 0, W, 1); ctx.fillRect(0, VH - 2, W, 2);
        if (!P.dead) drawHUD(ctx);
        else { text(ctx, P.why || 'SHOT DOWN', HW, 50, '#ff4040', 2, 'center'); }
        drawPanel(ctx);
        if (mode === 'done' && doneInfo) {
          ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(40, 20, 240, 110);
          text(ctx, 'MISSION COMPLETE', HW, 28, '#9fe870', 2, 'center');
          text(ctx, doneInfo.name, HW, 48, '#fff', 1, 'center');
          text(ctx, 'MISSION BONUS     5000', 60, 64, '#ccc');
          text(ctx, 'ARMOR BONUS  ' + String(doneInfo.armor).padStart(8, ' '), 60, 75, '#ccc');
          text(ctx, 'FUEL BONUS   ' + String(doneInfo.fuel).padStart(8, ' '), 60, 86, '#ccc');
          text(ctx, 'TIME BONUS   ' + String(doneInfo.time).padStart(8, ' '), 60, 97, '#ccc');
          text(ctx, 'TOTAL        ' + String(doneInfo.total).padStart(8, ' '), 60, 112, '#ffd040');
        }
        if (mode === 'failed') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 50, 240, 40); text(ctx, 'MISSION FAILED', HW, 64, '#ff4040', 2, 'center'); }
      }

      genTerrain(MISSIONS[0].seed, THEMES.green);
      newPlayer();
      return {
        update, render, destroy() { },
        _dbg: () => ({ mode, P, ents, mi, loop, score, lives, objDone, tgt, locked: locked(), ground, los, eshots, base, escaped })
      };
    }
  });
})();
