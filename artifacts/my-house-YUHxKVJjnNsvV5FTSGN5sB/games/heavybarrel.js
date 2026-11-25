// Heavy Barrel (Data East, 1987) \u2014 top-down vertical-scrolling run-and-gun recreation
(function () {
  'use strict';
  const W = 240, H = 256, TS = 16, COLS = 15;

  // ---------- 5x7 bitmap font ----------
  const FONT = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E', '4': '02060A121F0202',
    '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808', '8': '0E11110E11110E', '9': '0E11110F01020C',
    A: '0E1111111F1111', B: '1E11111E11111E', C: '0E11101010110E', D: '1C12111111121C', E: '1F10101E10101F',
    F: '1F10101E101010', G: '0E11101711110F', H: '1111111F111111', I: '0E04040404040E', J: '0702020202120C',
    K: '11121418141211', L: '1010101010101F', M: '111B1515111111', N: '11111915131111', O: '0E11111111110E',
    P: '1E11111E101010', Q: '0E11111115120D', R: '1E11111E141211', S: '0F10100E01011E', T: '1F040404040404',
    U: '1111111111110E', V: '11111111110A04', W: '1111111515150A', X: '11110A040A1111', Y: '1111110A040404',
    Z: '1F01020408101F', '-': '0000001F000000', '.': '00000000000C0C', ':': '000C0C000C0C00', '!': '04040404040004',
    '/': '01010204081010', '=': '00001F001F0000', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '?': '0E110102040004', 'x': '0000110A040A11', '>': '08040201020408', '<': '02040810080402', '+': '0004041F040400', "'": '04040800000000'
  };
  function textW(s, sc) { return String(s).length * 6 * (sc || 1) - (sc || 1); }
  function drawText(ctx, s, x, y, col, sc, align) {
    s = String(s).toUpperCase(); sc = sc || 1;
    if (align === 'center') x = Math.round(x - textW(s, sc) / 2); else if (align === 'right') x = Math.round(x - textW(s, sc));
    for (const ch of s) {
      const g = FONT[ch];
      if (g) {
        for (let r = 0; r < 7; r++) {
          const bits = parseInt(g.substr(r * 2, 2), 16);
          ctx.fillStyle = typeof col === 'function' ? col(r) : col;
          for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + c * sc, y + r * sc, sc, sc);
        }
      }
      x += 6 * sc;
    }
  }
  function shText(ctx, s, x, y, col, sc, align) {
    drawText(ctx, s, x + 1, y + 1, '#000000', sc, align);
    drawText(ctx, s, x, y, col, sc, align);
  }

  // ---------- pixel helpers ----------
  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  function rampC(r, v, x, y) {
    let i = Math.round(v * (r.length - 1) + (dith(x, y) - 0.5) * 0.85);
    if (i < 0) i = 0; if (i >= r.length) i = r.length - 1; return r[i];
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function PX(w, h) { return { w, h, d: new Array(w * h).fill(null) }; }
  function pset(p, x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.d[y * p.w + x] = c; }
  function pget(p, x, y) { return (x >= 0 && y >= 0 && x < p.w && y < p.h) ? p.d[y * p.w + x] : null; }
  function prect(p, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pset(p, x + i, y + j, c); }
  function pball(p, cx, cy, rx, ry, r, opt) {
    const lx = -0.45, ly = -0.6, lz = 0.66;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) continue;
      if (opt && opt.rough && d > 0.6 && hash(x, y, opt.seed || 3) < opt.rough * (d - 0.6) / 0.4) continue;
      if (opt && opt.clip && !opt.clip(x, y)) continue;
      const nz = Math.sqrt(1 - d), l = nx * lx + ny * ly + nz * lz;
      pset(p, x, y, rampC(r, clamp((l + 0.25) / 1.2 + (opt && opt.bias || 0), 0, 1), x, y));
    }
  }
  function pbox(p, x, y, w, h, r, noise) {
    const n = r.length;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let c;
      if (j === 0) c = r[n - 1]; else if (i === 0) c = r[n - 2]; else if (j === h - 1) c = r[0]; else if (i === w - 1) c = r[1];
      else c = rampC(r, 0.62 - 0.25 * j / h + (noise ? (hash(x + i, y + j, 7) - 0.5) * noise : 0), x + i, y + j);
      pset(p, x + i, y + j, c);
    }
  }
  function pline(p, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let k = 0; k < 400; k++) {
      pset(p, x0, y0, c); if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  function poutline(p, c) {
    const add = [];
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      if (p.d[y * p.w + x]) continue;
      const a = pget(p, x - 1, y), b = pget(p, x + 1, y), d = pget(p, x, y - 1), e = pget(p, x, y + 1);
      if ((a && a !== c) || (b && b !== c) || (d && d !== c) || (e && e !== c)) add.push(y * p.w + x);
    }
    for (const i of add) p.d[i] = c;
    return p;
  }
  function fromStr(rows, pal, w) {
    const h = rows.length; w = w || Math.max.apply(null, rows.map(r => r.length));
    const p = PX(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][i]; if (!ch || ch === '.' || ch === ' ') continue;
      const c = pal[ch]; if (c) p.d[j * w + i] = c;
    }
    return p;
  }
  function mapPX(p, fn) { const q = PX(p.w, p.h); for (let i = 0; i < p.d.length; i++) q.d[i] = p.d[i] ? fn(p.d[i], i % p.w, (i / p.w) | 0) : null; return q; }
  const ccache = {};
  function rgb(c) { let v = ccache[c]; if (!v) v = ccache[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; return v; }
  function hex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function mix(c, d, t) { const a = rgb(c), b = rgb(d); return hex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); }
  function toCanvas(p, flip, sil) {
    const cv = document.createElement('canvas'); cv.width = p.w; cv.height = p.h;
    const g = cv.getContext('2d'); const id = g.createImageData(p.w, p.h); const D = id.data;
    const sc = sil ? rgb(sil) : null;
    for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) {
      const c = p.d[j * p.w + (flip ? p.w - 1 - i : i)]; if (!c) continue;
      const o = (j * p.w + i) * 4, v = sc || rgb(c);
      D[o] = v[0]; D[o + 1] = v[1]; D[o + 2] = v[2]; D[o + 3] = 255;
    }
    g.putImageData(id, 0, 0); return cv;
  }

  // ---------- colour ramps ----------
  const R_GRASS = ['#1f5418', '#2b6a20', '#387e28', '#469230', '#5aa83a'];
  const R_DIRT = ['#5a3a1c', '#704a26', '#885c30', '#a0703e', '#b88a52'];
  const R_SAND = ['#b49450', '#c6a662', '#d6b874', '#e4ca8a', '#f0dca6'];
  const R_ROAD = ['#2a2a30', '#36363c', '#424248', '#4e4e56', '#5c5c64'];
  const R_CONC = ['#585854', '#6c6c66', '#80807a', '#94948c', '#aaaaa0'];
  const R_WALL = ['#38322c', '#504840', '#6a6056', '#857a6e', '#a29686'];
  const R_WOOD = ['#3a220c', '#563416', '#724820', '#8e5e2c', '#ac783e'];
  const R_LEAF = ['#0a260c', '#123e16', '#1c5a20', '#2a782a', '#43963a', '#6cb84e'];
  const R_BAG = ['#4a3a1e', '#766234', '#a28a54', '#c8ae78', '#e4d0a0'];
  const R_STEEL = ['#1c2028', '#343a48', '#525a6c', '#7a8496', '#b0bccc', '#e4ecf8'];
  const R_BRASS = ['#4a2406', '#7a420e', '#b06e18', '#e09c2c', '#ffd060', '#fff0b0'];
  const R_OLIVE = ['#22281a', '#3a4426', '#566236', '#76844a', '#a2ae72'];
  const R_TREAD = ['#121212', '#262626', '#3c3c3c', '#585858'];
  const R_BLUE = ['#161c2c', '#28344e', '#3e5072', '#5e7498', '#90a8c8', '#c8d8ec'];
  const R_DESERT = ['#2e2414', '#4e3e22', '#74603a', '#9c8656', '#c6b07c'];
  const R_HELI = ['#141c14', '#22341e', '#344e2c', '#4c6c3e', '#72945a', '#a6c488'];
  const R_GLASS = ['#0c1a34', '#1a3a6a', '#2c66a4', '#58a4dc', '#a8dcf6', '#eefcff'];
  const R_RED = ['#300808', '#601010', '#a01c18', '#e03a28', '#ff8a60', '#ffd8b0'];
  const R_GUNMETAL = ['#101216', '#22262e', '#3a404c', '#5a6272', '#8a94a6'];

  // ---------- characters (16-wide design grid) ----------
  const HEAD = {
    F: ['......KKKK......', '.....KHHHHK.....', '....KHHHHHHK....', '....KhhhhhhK....', '....KSSSSSSK....', '....KSKSSKSK....', '.....KSssSK.....'],
    B: ['......KKKK......', '.....KHHHHK.....', '....KHHHHHHK....', '....KhhhhhhK....', '....KHHHHHHK....', '....KHHHHHHK....', '.....KssssK.....'],
    S: ['......KKKK......', '.....KHHHHK.....', '....KHHHHHHK....', '....KhhhhhhK....', '....KHHSSKSK....', '....KHSSSSSSK...', '.....KSssSK.....']
  };
  const TORSO = {
    F: ['...KKUUUUUUKK...', '..KSUUUuuUUUSK..', '..KSUuUUUUuUSK..', '..KSKUUUUUUKSK..', '..KSKuUUUUuKSK..', '..KsKYYYYYYKsK..', '....KPPPPPPK....'],
    S: ['.....KUUUUK.....', '....KUUuUUUK....', '....KUUUUUuK....', '....KUSSSSSSS...', '....KuUUUUK.....', '....KYYYYYK.....', '....KPPPPPK.....']
  };
  const LEGS = {
    V: [
      ['....KPPPPPPK....', '....KPPKKPPK....', '....KPpKKPpK....', '....KPpKKPpK....', '....KPpKKPpK....', '....KBBKKBBK....', '...KBBBKKBBBK...', '...KKKK..KKKK...'],
      ['....KPPPPPPK....', '....KPPKKPPK....', '....KBBKKPpK....', '...KBBBKKPpK....', '...KKKK.KPpK....', '........KPpK....', '........KBBK....', '.......KBBBK....'],
      ['....KPPPPPPK....', '....KPPKKPPK....', '....KPpKKBBK....', '....KPpKKBBBK...', '....KPpK.KKKK...', '....KPpK........', '....KBBK........', '....KBBBK.......']
    ],
    S: [
      ['.....KPPPPK.....', '.....KPPpPK.....', '.....KPPpPK.....', '.....KPpKPK.....', '.....KPpKPK.....', '.....KBBKBBK....', '.....KBBBKBBK...', '.....KKKKKKKK...'],
      ['.....KPPPPK.....', '....KPPPpPPK....', '...KPPK.KPPK....', '..KPpK...KPpK...', '..KPpK....KPpK..', '.KBBK.....KBBK..', '.KBBBK....KBBBK.', '.KKKKK....KKKKK.'],
      ['.....KPPPPK.....', '.....KPPpPK.....', '....KPPKPPK.....', '....KPpKPpK.....', '....KPpKKPpK....', '....KBBK.KBBK...', '....KBBBKKBBBK..', '....KKKKK.KKKKK.']
    ]
  };
  // gun: [x0, y0, dx, dy, len, thickX, thickY]
  const DIRCFG = [
    { head: 'B', torso: 'F', legs: 'V', gun: [12, 12, 0, -1, 11, 1, 0] },
    { head: 'B', torso: 'F', legs: 'S', gun: [10, 11, 1, -1, 6, 1, 0] },
    { head: 'S', torso: 'S', legs: 'S', gun: [6, 11, 1, 0, 10, 0, 1] },
    { head: 'F', torso: 'F', legs: 'S', gun: [10, 10, 1, 1, 6, 1, 0] },
    { head: 'F', torso: 'F', legs: 'V', gun: [12, 9, 0, 1, 11, 1, 0] }
  ];
  const DEAD = [
    '...........KKKK.....',
    '....KKK...KHHHHK....',
    '...KBBPKKKKhhhhhK...',
    '..KBBPPPPUUUSSSSSK..',
    '..KBBPPppUUuUSKSSK..',
    '...KKPPPpUUUUSSSK...',
    '.....KKKKKUUUKKK....',
    '........KSSSK.......',
    '.........KKK........'
  ];
  const BASEPAL = { K: '#0c0c10', S: '#f0b07c', s: '#b87048', B: '#4a3220', Y: '#d8b840', G: '#98a2b2', g: '#454c5a', L: '#f0f6ff', O: '#ffb428', o: '#9a520c' };
  const PALS = {
    player: Object.assign({}, BASEPAL, { band: 1, H: '#2c1a0e', h: '#e42424', U: '#4e8c34', u: '#2e5c20', P: '#3464ae', p: '#1e3c72' }),
    sol: Object.assign({}, BASEPAL, { H: '#6e7c46', h: '#424c28', U: '#b4a472', u: '#7e7048', P: '#8e7e54', p: '#62563a', Y: '#5a4424', G: '#6e7680', g: '#33363e' }),
    gren: Object.assign({}, BASEPAL, { H: '#8a8e98', h: '#4c505a', U: '#5c6e94', u: '#384664', P: '#4a5470', p: '#2e344a', Y: '#a08040', G: '#6e7680', g: '#33363e' })
  };

  const DV = [[0, -1], [0.7071, -0.7071], [1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071]];
  function dir8(dx, dy) { const a = Math.atan2(dx, -dy); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }

  function buildAssets() {
    const S = {};
    // characters
    function charPX(d5, frame, pal, hb) {
      const cfg = DIRCFG[d5];
      const grid = []; for (let y = 0; y < 30; y++) grid.push(new Array(26).fill('.'));
      const put = (rows, oy) => rows.forEach((row, j) => { for (let i = 0; i < 16; i++) { const ch = row[i]; if (ch && ch !== '.') grid[oy + j + 4][i + 5] = ch; } });
      put(TORSO[cfg.torso], 7);
      put(LEGS[cfg.legs][[0, 1, 0, 2][frame]], 13);
      put(HEAD[cfg.head], 0);
      const p = fromStr(grid.map(r => r.join('')), pal, 26);
      // volume shading: light from the left, shade on the right edge of each form
      const shadeSet = new Set(['U', 'P', 'H', 'S', 'h', 'B'].map(k => pal[k]));
      const q = p.d.slice();
      for (let y = 0; y < p.h; y++) for (let x = 1; x < p.w - 1; x++) {
        const i = y * p.w + x, c = q[i]; if (!shadeSet.has(c)) continue;
        const r = q[i + 1], l = q[i - 1], up = q[i - p.w];
        const eR = !r || r === pal.K, eL = !l || l === pal.K, eU = !up || up === pal.K;
        if (eR && !eL) p.d[i] = mix(c, '#000000', 0.3); else if ((eL && !eR) || (eU && !eR)) p.d[i] = mix(c, '#ffffff', 0.22);
      }
      if (pal.band && cfg.torso === 'F') {
        for (let k = 0; k < 5; k++) { pset(p, 10 + k, 12 + k, pal.Y); pset(p, 11 + k, 12 + k, k & 1 ? pal.o : pal.O); }
      }
      let [x0, y0, dx, dy, len, ox, oy] = cfg.gun; x0 += 5; y0 += 4;
      if (hb) len += 3;
      for (let i = 0; i <= len; i++) {
        const x = x0 + dx * i, y = y0 + dy * i;
        if (hb) {
          const ring = (i % 3 === 0 && i > 2);
          pset(p, x - ox, y - oy, ring ? pal.o : pal.Y);
          pset(p, x, y, ring ? pal.o : pal.O);
          pset(p, x + ox, y + oy, pal.o);
          if (i < 3) { pset(p, x, y, '#5a6272'); pset(p, x + ox, y + oy, '#3a404c'); }
        } else {
          pset(p, x, y, i < 2 ? pal.B : pal.G); pset(p, x + ox, y + oy, i < 2 ? pal.B : pal.g);
        }
      }
      const tx = x0 + dx * len, ty = y0 + dy * len;
      if (hb) { pset(p, tx + dx, ty + dy, '#ffffff'); pset(p, tx + dx + ox, ty + dy + oy, '#fff0b0'); pset(p, tx + dx - ox, ty + dy - oy, '#fff0b0'); }
      else pset(p, tx, ty, pal.L);
      return poutline(p, pal.K);
    }
    function charSet(pal, hb) {
      const set = [];
      for (let d = 0; d < 8; d++) {
        set.push([]);
        for (let f = 0; f < 4; f++) {
          const m = d > 4 ? 8 - d : d;
          set[d].push(toCanvas(charPX(m, f, pal, hb), d > 4));
        }
      }
      return set;
    }
    S.ch = {};
    for (const k in PALS) {
      const pal = PALS[k];
      S.ch[k] = {
        n: charSet(pal, false),
        dead: toCanvas(poutline(fromStr(DEAD, pal), pal.K)),
        white: toCanvas(charPX(4, 0, pal, false), false, '#ffffff')
      };
    }
    S.ch.player.hb = charSet(PALS.player, true);

    // muzzle offsets
    S.mz = [[], []];
    for (let hbI = 0; hbI < 2; hbI++) for (let d = 0; d < 8; d++) {
      const m = d > 4 ? 8 - d : d; const [x0, y0, dx, dy, len, ox, oy] = DIRCFG[m].gun;
      const L = len + (hbI ? 3 : 0) + 2;
      let mx = x0 + 5 + dx * L + ox * 0.5 - 13 + 0.5, my = y0 + 4 + dy * L + oy * 0.5 - 16 + 0.5;
      if (d > 4) mx = -mx;
      S.mz[hbI].push([mx, my]);
    }

    // ---- tiles ----
    function tile(fn) { const p = PX(16, 16); fn(p); return toCanvas(p); }
    S.tile = {};
    S.tile.g = [0, 1, 2, 3].map(v => tile(p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const lf = (Math.sin((x + v * 5) * Math.PI / 8) + Math.cos((y + v * 3) * Math.PI / 8)) * 0.07;
        pset(p, x, y, rampC(R_GRASS, 0.48 + (hash(x, y, v * 31 + 1) - 0.5) * 0.4 + lf, x, y));
      }
      const rr = mulberry32(v * 977 + 5);
      for (let k = 0; k < 8; k++) {
        const bx = (rr() * 16) | 0, by = (rr() * 13) | 0;
        pset(p, bx, by, '#86cc58'); pset(p, bx, by + 1, R_GRASS[4]); pset(p, (bx + 15) % 16, by + 1, '#78bc4c');
        pset(p, bx, by + 2, R_GRASS[0]); pset(p, (bx + 15) % 16, by + 2, R_GRASS[1]);
      }
      if (v === 3) { pset(p, 4, 5, '#f8e860'); pset(p, 5, 5, '#ffffff'); pset(p, 11, 11, '#f070a0'); pset(p, 12, 11, '#ffd0e0'); pset(p, 4, 6, R_GRASS[0]); pset(p, 11, 12, R_GRASS[0]); }
    }));
    S.tile.d = [0, 1, 2, 3].map(v => tile(p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const lf = Math.sin((x + y * 0.5 + v * 4) * Math.PI / 8) * 0.06;
        pset(p, x, y, rampC(R_DIRT, 0.5 + (hash(x, y, v * 17 + 9) - 0.5) * 0.45 + lf, x, y));
      }
      const rr = mulberry32(v * 331 + 2);
      for (let k = 0; k < 3; k++) {
        const bx = 1 + (rr() * 13) | 0, by = 1 + (rr() * 13) | 0;
        pset(p, bx, by, '#c8b8a0'); pset(p, bx + 1, by, '#a89880'); pset(p, bx, by + 1, '#887860'); pset(p, bx + 1, by + 1, '#5a4a32');
      }
      for (let k = 0; k < 2; k++) { const y = (rr() * 16) | 0; for (let x = 0; x < 16; x++) if (hash(x, y, v) < 0.4) pset(p, x, y, R_DIRT[1]); }
    }));
    S.tile.s = [0, 1, 2, 3].map(v => tile(p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const rip = ((x * 2 + y * 4 + Math.round(Math.sin(y * Math.PI / 4 + v) * 2) + 64) % 16);
        let val = 0.55 + (hash(x, y, v * 7 + 3) - 0.5) * 0.3;
        if (rip < 2) val -= 0.28; else if (rip < 4) val += 0.15;
        pset(p, x, y, rampC(R_SAND, val, x, y));
      }
      const rr = mulberry32(v * 101 + 4);
      for (let k = 0; k < 3; k++) pset(p, (rr() * 16) | 0, (rr() * 16) | 0, '#8a7040');
    }));
    S.tile.r = [0, 1, 2, 3].map(v => tile(p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) pset(p, x, y, rampC(R_ROAD, 0.5 + (hash(x, y, v * 13 + 7) - 0.5) * 0.55, x, y));
      if (v === 2) { let x = 3, y = 4; for (let k = 0; k < 9; k++) { pset(p, x, y, '#1c1c20'); x += (hash(k, v, 1) < 0.5 ? 1 : 0); y += 1; } }
      if (v === 3) { for (let k = 0; k < 6; k++) pset(p, 9 + (k % 3), 9 + ((k / 3) | 0), '#1e1e22'); }
    }));
    S.tile.c = [0, 1, 2, 3].map(v => tile(p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        let val = 0.58 + (hash(x, y, v * 23 + 5) - 0.5) * 0.25;
        if (x === 0 || y === 0) val = 0.18; else if (x === 1 || y === 1) val = 0.85;
        pset(p, x, y, rampC(R_CONC, val, x, y));
      }
      if (v === 1) { let x = 5, y = 2; for (let k = 0; k < 10; k++) { pset(p, x, y, R_CONC[0]); x += hash(k, 5, 2) < 0.5 ? 1 : -1; y++; x = clamp(x, 2, 14); } }
      if (v === 2) { for (let y = 3; y < 15; y++) for (let x = 3; x < 15; x++) { const d = Math.hypot(x - 9, (y - 8) * 1.2) + (hash(x, y, 9) - 0.5) * 2; if (d < 4) pset(p, x, y, rampC(R_CONC, 0.32 + d * 0.04, x, y)); } }
      if (v === 3) { pset(p, 4, 4, R_CONC[1]); pset(p, 11, 4, R_CONC[1]); pset(p, 4, 11, R_CONC[1]); pset(p, 11, 11, R_CONC[1]); }
    }));
    S.tile.W = [0, 1, 2, 3].map(v => tile(p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const row = y >> 2, bx = ((x + (row & 1) * 4) & 7), by = y & 3;
        let val;
        if (by === 3 || bx === 7) val = 0.0; else if (by === 0) val = 0.92; else if (bx === 0) val = 0.75; else val = 0.5 + (hash(x, y, v + 40) - 0.5) * 0.3 + (hash((x + (row & 1) * 4) >> 3, row, v + 41) - 0.5) * 0.25;
        pset(p, x, y, rampC(R_WALL, val, x, y));
      }
    }));
    S.tile.b = [0, 1, 2, 3].map(v => tile(p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const py = y & 3; let val;
        if (py === 3) val = 0.0; else if (py === 0) val = 0.85; else val = 0.5 + (hash(x >> 2, y, v + 70) - 0.5) * 0.25 + (hash(x, y, v + 71) - 0.5) * 0.18;
        pset(p, x, y, rampC(R_WOOD, val, x, y));
      }
      for (let y = 1; y < 16; y += 4) { pset(p, 2, y, '#d8d0c0'); pset(p, 13, y, '#d8d0c0'); }
    }));
    // water: 4 animation frames, seamless
    S.water = [0, 1, 2, 3].map(f => tile(p => {
      const R = ['#103a78', '#184c94', '#2260b0', '#3678c8', '#5c9ee2', '#a8d4ff'];
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const w1 = Math.sin((x + f * 4) * Math.PI / 8 + Math.sin(y * Math.PI / 8) * 1.2);
        const w2 = Math.sin((y * 2 - f * 4 + x) * Math.PI / 8);
        let val = 0.42 + w1 * 0.12 + w2 * 0.1;
        const crest = ((x + y * 2 + f * 4 + Math.round(Math.sin(y * Math.PI / 4) * 2)) % 16 + 16) % 16;
        if (crest === 0) val = 0.82; else if (crest === 1) val = 0.66;
        pset(p, x, y, rampC(R, val, x, y));
      }
      const rr = mulberry32(f * 55 + 1);
      for (let k = 0; k < 2; k++) { const x = (rr() * 15) | 0, y = (rr() * 16) | 0; pset(p, x, y, '#e8f6ff'); pset(p, x + 1, y, '#a8d4ff'); }
    }));
    // sandbags overlay
    S.bags = (() => {
      const p = PX(18, 18);
      const C = [[4, 5], [9, 5], [14, 5], [2, 11], [7, 11], [12, 11], [16.5, 11]];
      for (const [x, y] of C) pball(p, x, y, 3.1, 2.7, R_BAG);
      for (const [x, y] of C) { pset(p, x - 1, y - 1, '#f4e6c0'); pset(p, x + 1, y + 1, R_BAG[1]); }
      poutline(p, '#2a2010');
      return toCanvas(p);
    })();
    // canopy (jungle trees) and palms
    S.canopy = [0, 1, 2, 3].map(v => {
      const p = PX(30, 30), rr = mulberry32(v * 131 + 7);
      const balls = [[15, 15, 9.5]];
      for (let k = 0; k < 6; k++) { const a = rr() * Math.PI * 2, d = 5 + rr() * 3; balls.push([15 + Math.cos(a) * d, 15 + Math.sin(a) * d, 5 + rr() * 2.5]); }
      balls.sort((a, b) => (a[1] + a[0]) - (b[1] + b[0]));
      balls.forEach((b, i) => pball(p, b[0], b[1], b[2], b[2] * 0.95, R_LEAF, { rough: 0.9, seed: v * 10 + i, bias: i === 0 ? -0.05 : 0 }));
      for (let k = 0; k < 26; k++) { const x = (rr() * 30) | 0, y = (rr() * 30) | 0; const c = pget(p, x, y); if (c && c !== R_LEAF[0]) { pset(p, x, y, c === R_LEAF[5] || c === R_LEAF[4] ? '#9ad468' : R_LEAF[1]); } }
      return toCanvas(poutline(p, '#06180a'));
    });
    S.palm = [0, 1].map(v => {
      const p = PX(30, 30), rr = mulberry32(v * 71 + 3); const N = 7;
      for (let k = 0; k < N; k++) {
        const a = k * Math.PI * 2 / N + rr() * 0.4 + v, len = 11 + rr() * 3;
        for (let t = 0; t < len; t += 0.5) {
          const cx = 15 + Math.cos(a) * t, cy = 15 + Math.sin(a) * t + t * t * 0.025;
          const w = 2.6 * (1 - t / len) + 0.6;
          for (let o = -w; o <= w; o += 0.5) {
            const x = cx - Math.sin(a) * o, y = cy + Math.cos(a) * o;
            if (Math.abs(o) > w - 0.9 && (Math.floor(t) & 1)) continue;
            const val = 0.75 - Math.abs(o) / w * 0.5 - (o > 0 ? 0.15 : 0) - t / len * 0.15;
            pset(p, x, y, rampC(R_LEAF, val, Math.floor(x), Math.floor(y)));
          }
        }
      }
      pball(p, 15, 15, 2.6, 2.6, ['#3a200c', '#6a4018', '#9a6428', '#c08a40']);
      return toCanvas(poutline(p, '#06180a'));
    });
    // decor
    S.bush = [0, 1].map(v => { const p = PX(14, 12); pball(p, 4.5, 7, 3.8, 3.4, R_LEAF, { rough: 0.6, seed: v }); pball(p, 9.5, 7, 3.8, 3.4, R_LEAF, { rough: 0.6, seed: v + 2 }); pball(p, 7, 4.5, 3.8, 3.4, R_LEAF, { rough: 0.6, seed: v + 4 }); return toCanvas(poutline(p, '#06180a')); });
    S.rock = [0, 1].map(v => { const p = PX(12, 10); pball(p, 6, 5.5, 4.8 - v, 3.6 - v * 0.5, ['#3a3632', '#5a5650', '#7a766e', '#9e9a90', '#c8c4b8']); return toCanvas(poutline(p, '#1a1814')); });
    S.drum = [['#3a0c08', '#6a1810', '#a02a1c', '#d04a30', '#f08a60'], ['#0c1c3a', '#16306a', '#24509c', '#3a74c8', '#7aa8e8']].map(r => {
      const p = PX(13, 13);
      for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
        const dx = x + 0.5 - 6.5, dy = y + 0.5 - 6.5, d = Math.hypot(dx, dy); if (d > 6) continue;
        let v;
        if (d > 5) v = (dx + dy) < 0 ? 0.95 : 0.25; else if (d > 4.2) v = (dx + dy) < 0 ? 0.3 : 0.7; else if (d > 2.6 && d < 3.3) v = 0.3; else v = 0.55 + (hash(x, y, 4) - 0.5) * 0.15;
        pset(p, x, y, rampC(r, v, x, y));
      }
      pset(p, 4, 4, '#d0d0d0'); pset(p, 5, 4, '#808080'); pset(p, 4, 5, '#606060'); pset(p, 5, 5, '#303030');
      return toCanvas(poutline(p, '#100808'));
    });
    S.scorch = [0, 1].map(v => {
      const p = PX(26, 18);
      for (let y = 0; y < 18; y++) for (let x = 0; x < 26; x++) {
        const d = Math.hypot((x - 13) / 12, (y - 9) / 8) + (hash(x, y, v + 90) - 0.5) * 0.35;
        if (d < 0.55) pset(p, x, y, hash(x, y, v + 91) < 0.3 ? '#3a2a1a' : '#1a1410');
        else if (d < 0.85 && hash(x, y, v + 92) < 0.6) pset(p, x, y, '#2e2418');
        else if (d < 1 && hash(x, y, v + 93) < 0.25) pset(p, x, y, '#3a3024');
      }
      return toCanvas(p);
    });

    // ---- bullets & projectiles ----
    S.pbul = toCanvas(fromStr(['.YY.', 'YWWY', 'YWWY', '.YY.'], { Y: '#ffb020', W: '#fffce0' }));
    S.ebul = [toCanvas(fromStr(['.RR.', 'RWWR', 'RWWR', '.RR.'], { R: '#ff3060', W: '#ffffff' })), toCanvas(fromStr(['.PP.', 'PWWP', 'PWWP', '.PP.'], { P: '#ffa0c0', W: '#ffffff' }))];
    S.shell = (() => { const p = PX(7, 7); pball(p, 3.5, 3.5, 3, 3, ['#401000', '#902800', '#e06000', '#ffb040', '#fff0c0']); return toCanvas(poutline(p, '#100400')); })();
    S.gren = [0, 1].map(f => { const p = PX(7, 8); pball(p, 3.5, 4.5, 2.8, 3.2, ['#142a10', '#244a1c', '#3a6e2a', '#5c9644', '#9cd07a']); pset(p, 3 + f, 1, '#a0a0a8'); pset(p, 3, 2, '#606068'); return toCanvas(poutline(p, '#0a0a0a')); });
    S.rocket = [];
    for (let d = 0; d < 8; d++) {
      const p = PX(14, 14), [dx, dy] = DV[d], px = -dy, py = dx;
      for (let i = -4; i <= 4; i++) {
        const x = 7 + dx * i, y = 7 + dy * i;
        const c = i >= 3 ? '#e83a28' : i >= 2 ? '#ff8a60' : '#c8ccd4';
        pset(p, x, y, c); pset(p, x + px * 0.8, y + py * 0.8, i >= 3 ? '#a01c18' : '#7a808c');
      }
      for (const s of [-1, 1]) { pset(p, 7 - dx * 4 + px * s * 1.6, 7 - dy * 4 + py * s * 1.6, '#5a6070'); pset(p, 7 - dx * 3 + px * s * 1.6, 7 - dy * 3 + py * s * 1.6, '#5a6070'); }
      S.rocket.push(toCanvas(poutline(p, '#101010')));
    }
    S.flash = [0, 1].map(f => toCanvas(fromStr(f ? ['...Y...', '.Y.W.Y.', '..WWW..', 'YWWWWWY', '..WWW..', '.Y.W.Y.', '...Y...'] : ['.......', '..Y.Y..', '.YWWWY.', '..WWW..', '.YWWWY.', '..Y.Y..', '.......'], { Y: '#ffc030', W: '#ffffff' })));
    // flame-thrower puffs: 10 age steps x 2 variants, ragged edges
    S.flame = [0, 1].map(v => {
      const out = [];
      for (let a = 0; a < 10; a++) {
        const t = a / 9, R = 2.5 + t * 6, sz = 20, p = PX(sz, sz), c = sz / 2;
        for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
          const dx = x + 0.5 - c, dy = y + 0.5 - c, ang = Math.atan2(dy, dx);
          const rr = R * (1 + 0.25 * Math.sin(ang * 5 + v * 2 + a) + (hash(x, y, v * 10 + a) - 0.5) * 0.35);
          const d = Math.hypot(dx, dy) / rr; if (d > 1) continue;
          const heat = (1 - d) * (1.25 - t * 0.9) + (dith(x, y) - 0.5) * 0.25;
          let col;
          if (heat > 0.85) col = '#ffffff'; else if (heat > 0.65) col = '#fff6a0'; else if (heat > 0.45) col = '#ffd030';
          else if (heat > 0.28) col = '#ff8a18'; else if (heat > 0.12) col = '#e03c10'; else col = t > 0.6 ? '#4a3a34' : '#a02010';
          if (t > 0.7 && hash(x >> 1, y >> 1, a + v) < (t - 0.7) * 2) continue;
          pset(p, x, y, col);
        }
        out.push(toCanvas(p));
      }
      return out;
    });
    // Heavy Barrel orbs
    S.orb = [0, 1, 2, 3].map(f => {
      const p = PX(20, 20);
      for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
        const dx = x + 0.5 - 10, dy = y + 0.5 - 10, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        if (d < 2.6 + (f & 1) * 0.6) pset(p, x, y, '#ffffff');
        else if (d < 4.4) pset(p, x, y, dith(x, y) < 0.8 ? '#d8faff' : '#ffffff');
        else if (d < 6) pset(p, x, y, dith(x, y) < 0.7 ? '#40d8ff' : '#d8faff');
        else if (d < 7.4) { if (dith(x + f, y) < 0.75) pset(p, x, y, '#2a64ff'); }
        else if (d < 9.6) { const s = ((a / Math.PI * 4 + f * 0.5) % 1 + 1) % 1; if (s < 0.35 && d < 9.6 - s * 4) pset(p, x, y, s < 0.15 ? '#ff80ff' : '#a040ff'); }
      }
      return toCanvas(p);
    });
    // explosions
    function buildEx(R, N, seed) {
      const out = [];
      for (let f = 0; f < N; f++) {
        const t = f / (N - 1), r = R * (0.32 + 0.68 * Math.sqrt(t)), p = PX(R * 2 + 2, R * 2 + 2), c = R + 1;
        for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
          const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
          const wob = 1 + 0.2 * (Math.sin(a * 5 + seed + f * 0.7) * 0.5 + Math.sin(a * 9 + seed * 2) * 0.5);
          const rr = r * wob; if (d > rr) continue;
          const q = d / rr;
          if (t > 0.5 && hash(x >> 1, y >> 1, seed * 13 + f * 7) < (t - 0.5) * 1.7) continue;
          const heat = (1 - q) * 1.3 * (1 - t * 0.85) + (dith(x, y) - 0.5) * 0.2 + (hash(x, y, seed + f) - 0.5) * 0.12;
          let col;
          if (heat > 0.86) col = '#ffffff'; else if (heat > 0.68) col = '#fff4a0'; else if (heat > 0.5) col = '#ffcc30';
          else if (heat > 0.36) col = '#ff8a18'; else if (heat > 0.22) col = '#e03c10'; else if (heat > 0.1) col = '#962010';
          else col = t > 0.3 ? (q > 0.8 ? '#3a3230' : '#5e5652') : '#7a1a08';
          pset(p, x, y, col);
        }
        out.push(toCanvas(p));
      }
      return out;
    }
    S.ex = [buildEx(9, 7, 1), buildEx(16, 9, 2), buildEx(26, 11, 3)];

    // ---- items ----
    S.key = toCanvas(poutline(fromStr([
      '.YYYY.......',
      'YWyyYY......',
      'YyKKyYYYYYYY',
      'YyKKyWWWWWWY',
      'YYyyYYyyYyYy',
      '.YYYY..Yy.Y.'
    ], { Y: '#e8b020', y: '#a06a10', W: '#fff4a0', K: '#000000' }), '#000000'));
    // crate
    function crate(open) {
      const p = PX(18, 18);
      for (let y = 1; y < 17; y++) for (let x = 1; x < 17; x++) {
        const py = (y - 1) % 4;
        let v = py === 0 ? 0.82 : py === 3 ? 0.1 : 0.5 + (hash(x >> 2, y, 3) - 0.5) * 0.25 + (hash(x, y, 4) - 0.5) * 0.15;
        pset(p, x, y, rampC(R_WOOD, v, x, y));
      }
      for (const bx of [3, 13]) for (let y = 1; y < 17; y++) { pset(p, bx, y, R_STEEL[3]); pset(p, bx + 1, y, R_STEEL[1]); if (y % 5 === 2) pset(p, bx, y, R_STEEL[5]); }
      for (const [cx, cy] of [[1, 1], [15, 1], [1, 15], [15, 15]]) { prect(p, cx, cy, 2, 2, R_STEEL[2]); pset(p, cx, cy, R_STEEL[4]); }
      if (open) {
        for (let y = 4; y < 15; y++) for (let x = 3; x < 15; x++) pset(p, x, y, y < 6 ? '#1a0e04' : (hash(x, y, 5) < 0.2 ? '#2a1a0a' : '#120a04'));
        for (let x = 2; x < 16; x++) { pset(p, x, 2, R_WOOD[4]); pset(p, x, 3, R_WOOD[2]); }
      } else {
        prect(p, 7, 8, 4, 5, '#c08a18'); prect(p, 7, 8, 4, 1, '#ffe070'); pset(p, 7, 9, '#ffd040'); pset(p, 10, 12, '#805010');
        pset(p, 8, 6, '#9aa0aa'); pset(p, 9, 6, '#9aa0aa'); pset(p, 7, 7, '#9aa0aa'); pset(p, 10, 7, '#9aa0aa');
        pset(p, 8, 10, '#000000'); pset(p, 9, 10, '#000000'); pset(p, 8, 11, '#000000');
      }
      return toCanvas(poutline(p, '#140a02'));
    }
    S.crate = crate(false); S.crateOpen = crate(true);
    // weapon pictograms
    const IPAL = { G: '#b8c2d2', g: '#4a5262', B: '#8a5a2a', R: '#e83a28', O: '#ff8a18', Y: '#ffe060', W: '#ffffff', C: '#40d8ff' };
    const PICT = {
      mg: ['..........g.', 'BBGGGGGGGGGW', 'BBBGGgGgggg.', 'B..gg.g.....', '....g.......', '............'],
      flame: ['....gg...O..', 'GGGGGGGG.OY.', 'gGGGGGGGOYWY', '.g..RR..OYY.', '....RR...O..', '............'],
      '3way': ['.........C.W', 'GGGGGG..CW..', 'gGGGGGWWWWWW', '.g.gg...CW..', '.........C.W', '............'],
      rocket: ['............', '.gGGGGGGGRRW', 'gGGGGGGGGRRR', '.gGGGGGGGRRW', '...gg.......', '............'],
      gold: ['............', '..YYYYYYYY..', '.YWWYYYYYYY.', 'YYYYYYYYYYYB', '.BBBBBBBBBB.', '............']
    };
    S.pict = {};
    for (const k in PICT) S.pict[k] = toCanvas(poutline(fromStr(PICT[k], IPAL), '#000000'));
    // plates (item backgrounds)
    S.plate = {};
    const PLC = { mg: '#e03030', flame: '#ff8a18', '3way': '#3a90ff', rocket: '#40c040', gold: '#ffd040', piece: '#ffd040' };
    for (const k in PLC) S.plate[k] = [0, 1].map(f => {
      const p = PX(18, 14);
      for (let y = 0; y < 14; y++) for (let x = 0; x < 18; x++) {
        const edge = x === 0 || y === 0 || x === 17 || y === 13, corner = (x === 0 || x === 17) && (y === 0 || y === 13);
        if (corner) continue;
        pset(p, x, y, edge ? (f ? '#ffffff' : PLC[k]) : (y < 2 ? '#2a2a3a' : '#121220'));
      }
      return toCanvas(p);
    });

    // ---- Heavy Barrel gun (48x12) assembled from 6 pieces ----
    S.hbPX = (() => {
      const p = PX(50, 14);
      // stock
      for (let x = 1; x <= 10; x++) { const top = x < 3 ? 3 : 4, bot = x < 4 ? 11 : 10 - (x > 7 ? 1 : 0); for (let y = top; y <= bot; y++) pset(p, x, y, rampC(R_BRASS, y === top ? 0.95 : y === bot ? 0.1 : 0.55 - (y - top) * 0.04, x, y)); }
      for (let y = 3; y <= 11; y++) { pset(p, 1, y, R_GUNMETAL[1]); pset(p, 2, y, R_GUNMETAL[3]); }
      // grip & trigger
      pbox(p, 11, 5, 6, 4, R_GUNMETAL);
      for (let y = 8; y <= 12; y++) for (let x = 0; x < 3; x++) pset(p, 13 + x + Math.floor((y - 8) / 2), y, rampC(R_WOOD, 0.7 - x * 0.25, x, y));
      pset(p, 18, 9, R_GUNMETAL[3]); pset(p, 19, 10, R_GUNMETAL[3]); pset(p, 18, 10, R_GUNMETAL[1]);
      // receiver
      pbox(p, 16, 2, 13, 8, R_STEEL);
      for (let x = 18; x <= 26; x++) { pset(p, x, 1, x % 2 ? R_STEEL[4] : R_STEEL[2]); pset(p, x, 6, R_STEEL[0]); }
      pset(p, 19, 4, '#ff3030'); pset(p, 21, 4, '#30ff60'); pset(p, 23, 4, '#ffd040'); pset(p, 25, 8, R_STEEL[5]); pset(p, 17, 8, R_STEEL[5]);
      // drum magazine
      pball(p, 26, 9, 4.5, 4.2, R_BRASS);
      for (let a = 0; a < 30; a++) pset(p, 26 + Math.cos(a / 30 * 6.283) * 2.4, 9 + Math.sin(a / 30 * 6.283) * 2.3, R_BRASS[2]);
      pset(p, 26, 9, R_GUNMETAL[0]); pset(p, 25, 8, R_BRASS[5]);
      // barrel shroud
      pbox(p, 30, 3, 12, 5, R_STEEL);
      for (let x = 31; x < 41; x += 2) { pset(p, x, 5, R_STEEL[0]); pset(p, x, 4, R_STEEL[1]); }
      for (let x = 30; x < 43; x++) { pset(p, x, 8, R_GUNMETAL[2]); pset(p, x, 9, R_GUNMETAL[0]); }
      // muzzle brake
      for (let x = 42; x <= 48; x++) for (let y = 1; y <= 10; y++) {
        if (x < 44 && (y < 2 || y > 9)) continue;
        pset(p, x, y, rampC(R_BRASS, (y < 3 ? 0.9 : y > 8 ? 0.15 : 0.55) - (x - 42) * 0.03, x, y));
      }
      for (let y = 3; y <= 8; y++) { pset(p, 45, y, R_BRASS[0]); pset(p, 47, y, R_BRASS[0]); }
      return poutline(p, '#000000');
    })();
    S.hb = toCanvas(S.hbPX); S.hbSil = toCanvas(mapPX(S.hbPX, c => c === '#000000' ? '#000000' : mix(mix(c, '#606070', 0.7), '#000000', 0.45)));
    S.hbSlice = i => [i === 0 ? 0 : 1 + i * 8, i === 0 || i === 5 ? 9 : 8];

    // ---- vehicles ----
    function buildTank(hull, frame, w, h) {
      w = w || 30; h = h || 34;
      const p = PX(w + 2, h + 2);
      const tw = Math.round(w * 0.24);
      for (const sx of [1, w + 1 - tw]) for (let y = 1; y <= h; y++) for (let x = sx; x < sx + tw; x++) {
        const k = (y + frame * 2) % 4; let v = k === 0 ? 0.1 : k === 1 ? 0.85 : 0.45;
        if (x === sx || x === sx + tw - 1) v = 0.0;
        pset(p, x, y, rampC(R_TREAD, v, x, y));
      }
      const hx = tw - 1, hw = w + 2 - tw * 2, hy = 3, hh = h - 4;
      pbox(p, hx, hy, hw + 2, hh, hull, 0.15);
      for (let y = hy + 2; y < hy + 8; y += 2) for (let x = hx + 4; x < hx + hw - 2; x++) pset(p, x, y, hull[0]);
      for (let x = hx + 1; x < hx + hw + 1; x++) { pset(p, x, hy + hh - 4, hull[1]); pset(p, x, hy + hh - 3, hull[1]); }
      for (let y = hy + 1; y < hy + hh - 1; y += 4) { pset(p, hx + 1, y, hull[hull.length - 1]); pset(p, hx + hw, y, hull[2]); }
      pbox(p, hx + 2, hy + 10, 4, 5, R_GUNMETAL);
      pset(p, hx + hw - 3, hy + hh - 7, '#e8e8e0'); pset(p, hx + hw - 4, hy + hh - 6, '#e8e8e0'); pset(p, hx + hw - 2, hy + hh - 6, '#e8e8e0'); pset(p, hx + hw - 3, hy + hh - 5, '#e8e8e0'); pset(p, hx + hw - 3, hy + hh - 6, '#e02020');
      return poutline(p, '#0a0a08');
    }
    function buildTurret(hull, ang, r, len, twin) {
      const sz = Math.ceil((len + 3) * 2 + 2), p = PX(sz, sz), c = sz / 2;
      const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
      const offs = twin ? [-1.6, 1.6] : [0];
      for (const o of offs) for (let i = r - 2; i <= len; i += 0.5) {
        for (let w = -1.2; w <= 1.2; w += 0.5) {
          const x = c + dx * i + px * (w + o), y = c + dy * i + py * (w + o);
          const v = w < -0.5 ? 0.85 : w > 0.5 ? 0.2 : 0.55;
          pset(p, x, y, rampC(R_GUNMETAL, i > len - 2 ? v - 0.3 : v, Math.floor(x), Math.floor(y)));
        }
      }
      pball(p, c, c, r, r, hull);
      pball(p, c - r * 0.3, c - r * 0.3, r * 0.35, r * 0.35, hull, { bias: 0.15 });
      pset(p, c - r * 0.3 - 1, c - r * 0.3 - 1, '#f0f0e0');
      return toCanvas(poutline(p, '#0a0a08'));
    }
    S.tank = [0, 1].map(f => toCanvas(buildTank(R_OLIVE, f)));
    S.tankPX = buildTank(R_OLIVE, 0);
    S.wreck = toCanvas(mapPX(S.tankPX, (c, x, y) => mix(c, hash(x, y, 77) < 0.3 ? '#000000' : '#1c140c', 0.72)));
    S.tturret = []; for (let a = 0; a < 16; a++) S.tturret.push(buildTurret(R_OLIVE, a / 16 * Math.PI * 2 - Math.PI / 2, 6.5, 14, false));
    S.gun = []; for (let a = 0; a < 16; a++) S.gun.push(buildTurret(R_STEEL, a / 16 * Math.PI * 2 - Math.PI / 2, 5, 12, true));
    // emplacement base: sandbag ring on concrete pad
    S.empl = (() => {
      const p = PX(34, 34);
      pball(p, 17, 17, 13, 13, R_CONC, { bias: -0.1 });
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; pball(p, 17 + Math.cos(a) * 12.5, 17 + Math.sin(a) * 12.5, 3.6, 3.0, R_BAG); }
      for (let y = 0; y < 34; y++) for (let x = 0; x < 34; x++) if (Math.hypot(x + 0.5 - 17, y + 0.5 - 17) < 8.5) pset(p, x, y, rampC(R_CONC, 0.25 + (hash(x, y, 8) - 0.5) * 0.2, x, y));
      return toCanvas(poutline(p, '#14100a'));
    })();
    S.bunker = (() => {
      const p = PX(44, 34);
      pball(p, 22, 17, 19, 14, R_CONC, { clip: (x, y) => y < 26 });
      for (let x = 4; x < 40; x++) for (let y = 26; y < 30; y++) pset(p, x, y, rampC(R_CONC, 0.2 - (y - 26) * 0.04, x, y));
      for (let x = 9; x < 35; x++) { pset(p, x, 20, '#000000'); pset(p, x, 21, '#000000'); pset(p, x, 19, R_CONC[0]); pset(p, x, 22, R_CONC[3]); }
      for (let k = 0; k < 7; k++) { const x = 6 + k * 5.3; pball(p, x, 30, 3, 2.4, R_BAG); }
      for (let k = 0; k < 18; k++) { const x = 10 + hash(k, 1, 4) * 24, y = 6 + hash(k, 2, 4) * 10; pset(p, x, y, hash(k, 3, 4) < 0.5 ? '#4a5a2a' : '#5e6e34'); pset(p, x + 1, y, '#3a4a22'); }
      pset(p, 30, 4, '#202020'); pset(p, 30, 3, '#202020'); pset(p, 30, 2, '#202020'); pset(p, 30, 1, '#ff3030');
      return poutline(p, '#100e0a');
    })();
    S.bunkerC = toCanvas(S.bunker);
    S.rubble = (() => {
      const p = PX(44, 34);
      for (let y = 0; y < 34; y++) for (let x = 0; x < 44; x++) {
        const d = Math.hypot((x - 22) / 20, (y - 18) / 14) + (hash(x, y, 50) - 0.5) * 0.3; if (d > 1) continue;
        const h = hash(x >> 2, y >> 2, 51);
        pset(p, x, y, d < 0.5 && hash(x, y, 52) < 0.5 ? '#1a1612' : rampC(R_CONC, h * 0.6 + (hash(x, y, 53) - 0.5) * 0.2, x, y));
      }
      for (let k = 0; k < 8; k++) { const x = 6 + hash(k, 1, 54) * 32, y = 6 + hash(k, 2, 54) * 22; pline(p, x, y, x + 3, y - 2, '#3a3a3a'); }
      return toCanvas(p);
    })();
    // helicopter
    S.heliPX = (() => {
      const p = PX(38, 56);
      // tapered tail boom
      for (let y = 3; y < 26; y++) { const w = 1 + Math.floor((y - 3) / 9); for (let x = -w; x <= w; x++) pset(p, 19 + x, y, rampC(R_HELI, x < 0 ? 0.8 : x > 0 ? 0.25 : 0.55, 19 + x, y)); }
      // stabiliser + fin
      for (let x = 12; x <= 26; x++) { pset(p, x, 9, R_HELI[4]); pset(p, x, 10, R_HELI[2]); pset(p, x, 11, R_HELI[0]); }
      for (const x of [12, 26]) for (let y = 7; y <= 12; y++) pset(p, x, y, R_HELI[y < 9 ? 4 : 1]);
      prect(p, 22, 3, 2, 3, R_GUNMETAL[2]);
      // fuselage
      pball(p, 19, 36, 7.5, 14, R_HELI);
      pball(p, 19, 29, 5.5, 5, R_HELI, { bias: 0.1 });
      // camo blotches
      for (let k = 0; k < 9; k++) {
        const cx = 14 + hash(k, 1, 20) * 10, cy = 26 + hash(k, 2, 20) * 18;
        for (let y = -1; y <= 1; y++) for (let x = -2; x <= 1; x++) { const c = pget(p, cx + x, cy + y); if (c && hash(x, y + k, 21) < 0.75) pset(p, cx + x, cy + y, mix(c, '#3a2a14', 0.45)); }
      }
      // exhausts
      for (const ex of [15, 23]) { pset(p, ex, 27, '#0a0a0a'); pset(p, ex, 28, '#0a0a0a'); pset(p, ex, 29, '#3a3a3a'); }
      // stub wings with rocket pods
      for (let x = 4; x <= 34; x++) { pset(p, x, 33, R_GUNMETAL[4]); pset(p, x, 34, R_GUNMETAL[3]); pset(p, x, 35, R_GUNMETAL[1]); }
      for (const px of [6, 32]) {
        pball(p, px, 35, 2.6, 6, R_GUNMETAL, { bias: 0.1 });
        pset(p, px - 1, 40, '#ff3a28'); pset(p, px + 1, 40, '#ff3a28'); pset(p, px, 41, '#ff8a60');
      }
      // tandem canopy
      pball(p, 19, 41, 4.6, 4, R_GLASS);
      pball(p, 19, 47, 4, 3.6, R_GLASS);
      for (let x = 15; x <= 23; x++) pset(p, x, 44, R_HELI[0]);
      pset(p, 17, 39, '#ffffff'); pset(p, 17, 46, '#ffffff');
      // chin gun
      pball(p, 19, 51.5, 2, 1.6, R_GUNMETAL); pset(p, 19, 53, R_GUNMETAL[1]); pset(p, 19, 54, R_GUNMETAL[3]);
      // markings
      pset(p, 14, 36, '#e02020'); pset(p, 15, 36, '#ffffff'); pset(p, 24, 36, '#e02020'); pset(p, 23, 36, '#ffffff');
      return poutline(p, '#060806');
    })();
    S.heli = toCanvas(S.heliPX); S.heliSh = toCanvas(S.heliPX, false, '#000000');

    // ---- bosses ----
    S.bossTank = [R_BLUE, R_DESERT].map(hull => [0, 1].map(f => {
      const p = PX(94, 68), hi = hull[hull.length - 1];
      // treads
      for (const sx of [1, 71]) for (let y = 2; y <= 65; y++) for (let x = sx; x < sx + 22; x++) {
        const k = (y + f * 2) % 4; let v = k === 0 ? 0.05 : k === 1 ? 0.9 : 0.45;
        if (x === sx || x === sx + 21) v = 0; else if ((x - sx) % 7 === 0) v -= 0.25;
        pset(p, x, y, rampC(R_TREAD, v, x, y));
      }
      // road wheels peeking through
      for (const sx of [1, 71]) for (let y = 8; y < 64; y += 11) pball(p, sx + 11, y, 3.5, 3.5, R_GUNMETAL);
      // side skirts
      for (const sx of [18, 70]) { pbox(p, sx, 6, 6, 56, hull, 0.1); for (let y = 10; y < 60; y += 8) pset(p, sx + 2, y, hi); }
      // hull
      pbox(p, 22, 3, 50, 60, hull, 0.12);
      // engine deck: grilles + exhausts
      for (let y = 6; y < 17; y += 2) for (let x = 27; x < 67; x++) pset(p, x, y, (x % 10 < 8) ? hull[0] : hull[2]);
      for (const ex of [29, 65]) { pball(p, ex, 4, 3, 3, R_GUNMETAL, { bias: -0.2 }); pset(p, ex, 4, '#000000'); pset(p, ex - 1, 4, '#000000'); }
      // armour plate seams and rivets
      for (let x = 23; x < 71; x++) { pset(p, x, 19, hull[0]); pset(p, x, 20, hi); pset(p, x, 47, hull[0]); pset(p, x, 48, hi); }
      for (let x = 25; x < 70; x += 5) { pset(p, x, 22, hi); pset(p, x, 45, hi); pset(p, x, 51, hi); }
      // main turret housing (chamfered)
      const cx0 = 31, cy0 = 21, cw = 32, ch = 25;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const cut = 5; if (x + y < cut || (cw - 1 - x) + y < cut || x + (ch - 1 - y) < cut || (cw - 1 - x) + (ch - 1 - y) < cut) continue;
        let v = 0.55 - y / ch * 0.2 + (hash(x, y, 31) - 0.5) * 0.1;
        if (y < 2 || x + y < cut + 2) v = 0.95; else if (x < 2) v = 0.8; else if (y > ch - 3) v = 0.1; else if (x > cw - 3) v = 0.2;
        pset(p, cx0 + x, cy0 + y, rampC(hull, v, cx0 + x, cy0 + y));
      }
      pball(p, 47, 31, 9, 7, hull, { bias: 0.08 });
      pball(p, 41, 27, 3, 3, R_GUNMETAL); pset(p, 40, 26, '#e0e8f0');
      for (let x = 50; x < 57; x++) { pset(p, x, 26, '#000000'); pset(p, x, 27, '#30c0ff'); }
      prect(p, 39, 42, 16, 4, R_GUNMETAL[1]); prect(p, 39, 42, 16, 1, R_GUNMETAL[3]);
      // hazard stripes on the glacis
      for (let x = 24; x < 70; x++) for (let y = 56; y < 61; y++) pset(p, x, y, ((x + y) >> 2) & 1 ? '#ffcc20' : '#181818');
      for (let x = 24; x < 70; x++) { pset(p, x, 55, hi); pset(p, x, 61, hull[0]); }
      // insignia
      for (const [ix, iy] of [[27, 33], [66, 33]]) { pball(p, ix, iy, 3, 3, R_RED); pset(p, ix, iy, '#ffffff'); }
      poutline(p, '#06060a');
      return toCanvas(p);
    }));
    S.bossTurret = []; for (let a = 0; a < 16; a++) S.bossTurret.push(buildTurret(['#141820', '#262e3a', '#3c4858', '#5a6a80', '#8aa0b8'], a / 16 * Math.PI * 2 - Math.PI / 2, 8, 16, false));
    S.gunship = (() => {
      const p = PX(84, 92);
      pbox(p, 39, 2, 7, 36, R_GUNMETAL);
      prect(p, 31, 4, 22, 3, R_GUNMETAL[3]); prect(p, 31, 6, 22, 1, R_GUNMETAL[1]);
      pbox(p, 6, 46, 72, 6, R_GUNMETAL);
      pball(p, 42, 52, 17, 30, ['#141418', '#24242c', '#383844', '#505062', '#727288', '#a8a8bc']);
      pball(p, 42, 70, 10, 9, R_GLASS, { clip: (x, y) => y >= 66 });
      for (let x = 33; x <= 51; x++) pset(p, x, 66, '#141418');
      for (let y = 36; y < 46; y++) { pset(p, 34, y, '#e02020'); pset(p, 35, y, '#e02020'); pset(p, 49, y, '#e02020'); pset(p, 50, y, '#e02020'); }
      return toCanvas(poutline(p, '#040406'));
    })();
    S.pod = (() => {
      const p = PX(16, 24); pball(p, 8, 11, 5.5, 10.5, R_GUNMETAL, { bias: 0.08 });
      for (let x = 2; x < 14; x++) { if (pget(p, x, 6)) pset(p, x, 6, '#c02018'); if (pget(p, x, 7)) pset(p, x, 7, '#801010'); }
      for (const [x, y] of [[6, 18], [10, 18], [8, 20], [6, 15], [10, 15]]) { pset(p, x, y, '#000000'); pset(p, x, y + 1, '#ff5a30'); }
      return toCanvas(poutline(p, '#080202'));
    })();
    S.fortress = (() => {
      const p = PX(240, 96);
      for (let y = 0; y < 78; y++) for (let x = 0; x < 240; x++) {
        const row = y >> 3, bx = (x + (row & 1) * 8) & 15, by = y & 7; let v;
        if (by === 7 || bx === 15) v = 0.0; else if (by === 0) v = 0.9; else if (bx === 0) v = 0.72; else v = 0.5 + (hash(x, y, 60) - 0.5) * 0.25 + (hash((x + (row & 1) * 8) >> 4, row, 61) - 0.5) * 0.3;
        if (y >= 62) v *= 0.55;
        pset(p, x, y, rampC(R_WALL, v, x, y));
      }
      for (let x = 0; x < 240; x++) { pset(p, x, 62, R_WALL[4]); for (let y = 78; y < 84; y++) pset(p, x, y, '#1a1612'); }
      // gate block
      for (let y = 4; y < 84; y++) for (let x = 84; x < 156; x++) {
        let v = 0.5 + (x < 120 ? -0.05 : 0.05) + (hash(x, y, 62) - 0.5) * 0.08;
        if (x === 84 || y === 4) v = 0.95; if (x === 155) v = 0.1; if (x === 119 || x === 120) v = 0.0;
        if ((y - 4) % 12 === 0) v = 0.85; if ((y - 4) % 12 === 11) v = 0.15;
        pset(p, x, y, rampC(R_STEEL, v, x, y));
        if (y > 72) pset(p, x, y, ((x + y) >> 2) & 1 ? '#ffcc20' : '#181818');
      }
      for (let y = 8; y < 72; y += 12) for (const x of [88, 151, 116, 123]) pset(p, x, y, R_STEEL[5]);
      // eye socket
      pball(p, 120, 40, 15, 15, R_GUNMETAL, { bias: -0.2 });
      // turret platforms
      for (const cx of [40, 200]) { pball(p, cx, 56, 15, 13, R_CONC); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; pball(p, cx + Math.cos(a) * 14, 56 + Math.sin(a) * 12, 3.2, 2.6, R_BAG); } }
      // crenellations
      for (let x = 0; x < 240; x += 16) { if (x >= 80 && x < 160) continue; pbox(p, x + 2, 0, 10, 6, R_WALL); }
      return toCanvas(poutline(p, '#060504'));
    })();
    S.eye = [0, 1, 2].map(f => { const p = PX(24, 24); pball(p, 12, 12, 10, 10, R_RED, { bias: f * 0.12 }); pball(p, 12, 12, 4, 4, ['#200000', '#500000', '#ff4000', '#ffe080', '#ffffff'], { bias: f * 0.1 }); return toCanvas(poutline(p, '#000000')); });
    // life icon (player head)
    S.life = toCanvas(poutline(fromStr(HEAD.F.map(r => r.slice(3, 13)), PALS.player), '#0c0c10'));
    return S;
  }

  // ---------- stage generation ----------
  const STAGES = [
    { name: 'JUNGLE', ground: 'g', boss: 'tank' },
    { name: 'RIVER', ground: 'g', boss: 'gunship' },
    { name: 'OUTPOST', ground: 's', boss: 'tank2' },
    { name: 'ENEMY BASE', ground: 'c', boss: 'fortress' }
  ];
  const ARENA = 16;
  function genStage(si, loopN) {
    const R = 128, rnd = mulberry32(1000 + si * 7919 + loopN * 104729), ri = n => (rnd() * n) | 0;
    const G0 = STAGES[si].ground;
    const m = []; for (let r = 0; r < R; r++) m.push(new Array(COLS).fill(G0));
    const pathAt = new Array(R);
    let path = 7, lw = 2, rw = 2, wl = 3;
    for (let r = R - 1; r >= 0; r--) {
      const row = m[r], inArena = r < ARENA, start = r > R - 10;
      if (!inArena && !start && r % 3 === 0) path = clamp(path + ri(3) - 1, si === 1 ? 7 : si >= 2 ? 4 : 4, si >= 2 ? 10 : 10);
      if (inArena) path += Math.sign(7 - path) * (r % 2);
      if (r % 4 === 0) { lw = clamp(lw + ri(3) - 1, 1, 3); rw = clamp(rw + ri(3) - 1, 1, 3); wl = clamp(wl + ri(3) - 1, 2, 4); }
      pathAt[r] = path;
      if (si === 0) {
        for (let c = 0; c < COLS; c++) if (c < lw || c >= COLS - rw) row[c] = 't';
        for (let c = path - 1; c <= path + 1; c++) row[c] = 'd';
        if (!inArena && !start && rnd() < 0.1) { const c = 2 + ri(11); if (Math.abs(c - path) > 2) row[c] = 't'; }
        if (inArena) for (let c = 2; c < 13; c++) row[c] = (c > 3 && c < 11 && r > 1) ? 'd' : 'g';
      } else if (si === 1) {
        for (let c = 0; c < wl; c++) row[c] = 'w';
        row[wl] = 's'; if ((r >> 2) & 1) row[wl + 1] = 's';
        if (rw > 1) row[14] = 't';
        for (let c = path - 1; c <= path + 1; c++) row[c] = 'd';
        if (!inArena && !start && rnd() < 0.07) { const c = wl + 2 + ri(13 - wl - 2); if (Math.abs(c - path) > 2 && row[c] === 'g') row[c] = 't'; }
      } else if (si === 2) {
        for (let c = path - 2; c <= path + 1; c++) row[c] = 'r';
        if (!inArena && rnd() < 0.08) { const c = rnd() < 0.5 ? 0 : 14; row[c] = 't'; }
      } else {
        row[0] = 'W'; row[14] = 'W';
        for (let c = path - 2; c <= path + 1; c++) row[c] = 'r';
      }
    }
    // horizontal features: rivers / walls / sandbag lines
    let k = 0;
    for (let r = R - 24; r > ARENA + 6; r -= 15 + ri(8), k++) {
      const p = pathAt[r];
      const gapL = p - (si >= 2 ? 3 : 2), gapR = p + 2;
      if (k % 2 === 0) {
        if (si <= 1) {
          for (let rr = r - 2; rr <= r; rr++) for (let c = 0; c < COLS; c++) m[rr][c] = (c >= gapL && c <= gapR) ? 'b' : 'w';
        } else {
          for (let rr = r - 1; rr <= r; rr++) for (let c = 0; c < COLS; c++) if (c < gapL || c > gapR) m[rr][c] = 'W';
        }
      } else {
        const left = rnd() < 0.5; const len = 3 + ri(2);
        const c0 = left ? Math.max(si === 1 ? wl + 1 : 1, gapL - len - 1) : gapR + 2;
        for (let c = c0; c < c0 + len && c < 14; c++) if (m[r][c] !== 'w' && m[r][c] !== 'W' && (c < gapL || c > gapR)) m[r][c] = 'S';
        if (si === 3 && rnd() < 0.7) { const c = left ? 11 : 2; if (c < gapL || c > gapR) { m[r - 4][c] = 'W'; m[r - 4][c + 1] = 'W'; m[r - 5][c] = 'W'; m[r - 5][c + 1] = 'W'; } }
      }
    }
    const used = new Set();
    const walk = t => t === 'g' || t === 'd' || t === 's' || t === 'r' || t === 'c';
    function clear(r, c, w, h) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const rr = r + j, cc = c + i; if (rr < 0 || rr >= R || cc < 0 || cc >= COLS || !walk(m[rr][cc]) || used.has(rr * 20 + cc)) return false; } return true; }
    function mark(r, c, w, h) { for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) used.add((r + j) * 20 + c + i); }
    function spot(r0, r1, w, h, near) {
      for (let t = 0; t < 60; t++) {
        const r = r0 + ri(Math.max(1, r1 - r0));
        const c = near != null ? pathAt[clamp(r, 0, R - 1)] + ri(near * 2 + 1) - near : 1 + ri(COLS - 1 - w);
        if (clear(r, c, w, h)) { mark(r, c, w, h); return { x: c * 16 + w * 8, y: r * 16 + h * 8 }; }
      }
      return null;
    }
    const placed = [];
    const CR = [['mg', 'piece', 'flame', 'piece', '3way', 'piece', 'gold'], ['rocket', 'piece', 'mg', 'piece', '3way', 'gold', 'piece'],
      ['flame', 'piece', 'rocket', 'piece', 'mg', 'piece', 'gold'], ['3way', 'piece', 'rocket', 'piece', 'flame', 'piece', 'gold']][si];
    const crates = [];
    for (let i = 0; i < 7; i++) {
      const band = Math.round(R - 16 - i * (R - 16 - ARENA - 6) / 7);
      const s = spot(band - 8, band, 1, 1, 3) || spot(band - 12, band, 1, 1, null);
      if (s) crates.push({ x: s.x, y: s.y, open: false, content: CR[i], hint: 0 });
    }
    const N = [[2, 3, 2], [2, 4, 2], [4, 4, 2], [3, 6, 3]][si]; // tanks, turrets, bunkers
    for (let i = 0; i < N[0] + loopN; i++) { const s = spot(ARENA + 8 + (i * 90 / (N[0] + loopN) | 0), ARENA + 20 + ((i + 1) * 90 / (N[0] + loopN) | 0), 2, 2, 1); if (s) placed.push({ kind: 'tank', x: s.x, y: s.y }); }
    for (let i = 0; i < N[1]; i++) { const s = spot(ARENA + 4, R - 18, 2, 2, null); if (s) placed.push({ kind: 'turret', x: s.x, y: s.y }); }
    for (let i = 0; i < N[2]; i++) { const s = spot(ARENA + 4, R - 22, 3, 2, null); if (s) placed.push({ kind: 'bunker', x: s.x, y: s.y }); }
    const helis = [];
    const nh = [1, 3, 2, 2][si];
    for (let i = 0; i < nh; i++) helis.push((ARENA + 12 + (i + 0.5) * (R - ARENA - 30) / nh) * 16 | 0);
    return { map: m, rows: R, crates, placed, helis, si };
  }

  ArcadeRegistry.register({
    id: 'heavybarrel', title: 'Heavy Barrel', year: 1987, maker: 'Data East',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move/aim \u00b7 Space: fire \u00b7 X: grenade \u00b7 Enter: start',
    marquee: { bg: '#1b1b1b', fg: '#ffcc00', accent: '#c62828' },
    create(api) {
      const A = api.audio;
      const SP = buildAssets();
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;

      // ---------- map rendering ----------
      function renderMap(st) {
        const m = st.map, R = st.rows, si = st.si, G0 = STAGES[si].ground;
        const cv = document.createElement('canvas'); cv.width = W; cv.height = R * 16;
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        const T = (r, c) => (r < 0 || r >= R || c < 0 || c >= COLS) ? null : m[r][c];
        const isW = t => t === 'w';
        const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
        for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
          const t = m[r][c]; if (t === 'w') continue;
          let base = t; if (t === 't' || t === 'S') base = G0;
          const v = (hash(c, r, si) * 4) | 0;
          g.drawImage(SP.tile[base][base === 'g' ? (hash(c, r, 5) < 0.12 ? 3 : v % 3) : v], c * 16, r * 16);
        }
        // grass fringe over dirt/sand/road edges
        const low = t => t === 'd' || t === 's' || t === 'r' || t === 'c' || t === 'b';
        for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
          const t = m[r][c]; if (!low(t) || t === 'b') continue;
          const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
          sides.forEach(([dc, dr], si2) => {
            const n = T(r + dr, c + dc); if (n !== 'g' && !(n === 't' && G0 === 'g')) return;
            for (let i = 0; i < 16; i++) {
              const depth = 1 + Math.floor(hash(i + c * 16, r * 4 + si2, 11) * hash(i >> 1, r + c, 12) * 4);
              for (let d = 0; d < depth; d++) {
                const x = dc === 0 ? c * 16 + i : (dc < 0 ? c * 16 + d : c * 16 + 15 - d);
                const y = dr === 0 ? r * 16 + i : (dr < 0 ? r * 16 + d : r * 16 + 15 - d);
                px(x, y, d === depth - 1 ? R_GRASS[1] : (hash(x, y, 13) < 0.3 ? R_GRASS[4] : R_GRASS[2]));
              }
            }
          });
        }
        // road centre dashes
        if (si >= 2) for (let r = 0; r < R; r++) {
          let c0 = -1; for (let c = 0; c < COLS; c++) if (m[r][c] === 'r') { c0 = c; break; }
          if (c0 < 0 || m[r][c0 + 3] !== 'r') continue;
          if ((r & 1) === 0) { g.fillStyle = '#d8c040'; g.fillRect(c0 * 16 + 31, r * 16 + 2, 2, 10); g.fillStyle = '#8a7a28'; g.fillRect(c0 * 16 + 31, r * 16 + 12, 2, 1); }
          g.fillStyle = '#c8c8c0'; g.fillRect(c0 * 16 + 1, r * 16, 1, 16); g.fillRect(c0 * 16 + 62, r * 16, 1, 16);
        }
        // wet shoreline on land next to water
        for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
          const t = m[r][c]; if (isW(t) || t === 'b') continue;
          const wet = t === 's' ? ['#9a8048', '#b49a5e'] : ['#3a2c18', '#5a4426'];
          if (isW(T(r + 1, c))) { g.fillStyle = wet[0]; g.fillRect(c * 16, r * 16 + 14, 16, 2); g.fillStyle = wet[1]; for (let i = 0; i < 16; i++) if (hash(i, r, c) < 0.5) g.fillRect(c * 16 + i, r * 16 + 13, 1, 1); }
          if (isW(T(r - 1, c))) { g.fillStyle = wet[1]; g.fillRect(c * 16, r * 16, 16, 1); }
          if (isW(T(r, c + 1))) { g.fillStyle = wet[0]; g.fillRect(c * 16 + 15, r * 16, 1, 16); }
          if (isW(T(r, c - 1))) { g.fillStyle = wet[0]; g.fillRect(c * 16, r * 16, 1, 16); }
        }
        // bridge rails
        for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) if (m[r][c] === 'b') {
          for (const [dc, x] of [[-1, 0], [1, 14]]) if (isW(T(r, c + dc))) {
            g.fillStyle = R_WOOD[0]; g.fillRect(c * 16 + x, r * 16, 2, 16);
            g.fillStyle = R_WOOD[4]; g.fillRect(c * 16 + x, r * 16, 1, 16);
            for (let y = 2; y < 16; y += 6) { g.fillStyle = R_WOOD[3]; g.fillRect(c * 16 + x - (dc < 0 ? 0 : 1), r * 16 + y, 3, 2); }
          }
        }
        // walls: front faces + cast shadows
        for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) if (m[r][c] === 'W') {
          const below = T(r + 1, c);
          if (below !== 'W') {
            for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) {
              let v = y === 10 ? 0.95 : 0.3 - (y - 10) * 0.04 + (((x + (r & 1) * 3) % 6) === 0 ? -0.2 : 0) + (hash(x, y + r, c) - 0.5) * 0.1;
              g.fillStyle = rampC(R_WALL, v, x, y); g.fillRect(c * 16 + x, r * 16 + y, 1, 1);
            }
            if (below) { g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(c * 16, r * 16 + 16, 16, 4); }
          }
          if (T(r, c + 1) && T(r, c + 1) !== 'W') { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(c * 16 + 16, r * 16 + 2, 3, 16); }
        }
        // decor
        const dr = mulberry32(si * 31 + 9);
        for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) {
          const t = m[r][c]; if (dr() > 0.07) continue;
          const x = c * 16 + 2 + ((dr() * 4) | 0), y = r * 16 + 2 + ((dr() * 4) | 0);
          if (t === 'g') g.drawImage(SP.bush[(dr() * 2) | 0], x, y);
          else if (t === 's' || t === 'd') g.drawImage(SP.rock[(dr() * 2) | 0], x, y);
          else if (t === 'c' && dr() < 0.6) { g.drawImage(SP.drum[(dr() * 2) | 0], x, y); if (dr() < 0.5) g.drawImage(SP.drum[0], x + 7, y + 3); }
        }
        // sandbags
        for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) if (m[r][c] === 'S') {
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(c * 16 + 2, r * 16 + 14, 16, 3);
          g.drawImage(SP.bags, c * 16 - 1, r * 16 - 1);
        }
        // trees: shadows then canopies
        const trees = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < COLS; c++) if (m[r][c] === 't') trees.push([r, c]);
        g.fillStyle = 'rgba(0,0,0,0.32)';
        for (const [r, c] of trees) { const cx = c * 16 + 12, cy = r * 16 + 12; for (let y = -8; y <= 8; y++) { const w = Math.round(Math.sqrt(1 - (y / 9) * (y / 9)) * 11); g.fillRect(cx - w, cy + y, w * 2, 1); } }
        for (const [r, c] of trees) {
          const palm = si >= 1;
          const spr = palm ? SP.palm[(hash(c, r, 3) * 2) | 0] : SP.canopy[(hash(c, r, 2) * 4) | 0];
          g.drawImage(spr, c * 16 - 7 + ((hash(c, r, 6) * 3) | 0) - 1, r * 16 - 7 + ((hash(c, r, 7) * 3) | 0) - 1);
        }
        return cv;
      }
      function drawMapView(ctx, md, cy, fr) {
        cy = Math.round(cy);
        const r0 = Math.max(0, Math.floor(cy / 16)), r1 = Math.min(md.rows - 1, Math.floor((cy + H) / 16));
        const wf = SP.water[(fr >> 4) & 3], m = md.map;
        for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) {
          if (m[r][c] !== 'w') continue;
          const sx = c * 16, sy = r * 16 - cy;
          ctx.drawImage(wf, sx, sy);
          const nb = [r > 0 ? m[r - 1][c] : 'w', r < md.rows - 1 ? m[r + 1][c] : 'w', c > 0 ? m[r][c - 1] : 'w', c < COLS - 1 ? m[r][c + 1] : 'w'];
          for (let s = 0; s < 4; s++) {
            const n = nb[s]; if (n === 'w') continue;
            if (n === 'b') { ctx.fillStyle = 'rgba(0,0,20,0.35)'; if (s === 2) ctx.fillRect(sx, sy, 3, 16); if (s === 3) ctx.fillRect(sx + 13, sy, 3, 16); continue; }
            for (let i = 0; i < 16; i++) {
              const h = hash(i + c * 16, r * 4 + s, fr >> 4);
              if (h > 0.62) continue;
              const x = s === 2 ? sx : s === 3 ? sx + 15 : sx + i, y = s === 0 ? sy : s === 1 ? sy + 15 : sy + i;
              ctx.fillStyle = h < 0.35 ? '#e4f4ff' : '#8cc4f4'; ctx.fillRect(x, y, 1, 1);
              if (h < 0.18) { ctx.fillStyle = '#8cc4f4'; ctx.fillRect(x + (s === 2 ? 1 : s === 3 ? -1 : 0), y + (s === 0 ? 1 : s === 1 ? -1 : 0), 1, 1); }
            }
          }
        }
        ctx.drawImage(md.canvas, 0, cy, W, H, 0, 0, W, H);
      }
      function makeMD(si, loopN) { const st = genStage(si, loopN); st.canvas = renderMap(st); return st; }

      // ---------- sound ----------
      let sndCD = {};
      function can(k, n) { if ((sndCD[k] || 0) > api.frame) return false; sndCD[k] = api.frame + n; return true; }
      const SFX = {
        shot() { if (!can('shot', 3)) return; A.noise(0.07, { vol: 0.13, freq: 3200, type: 'highpass' }); A.tone(820, 0.06, { type: 'square', vol: 0.05, slideTo: 300 }); },
        mg() { if (!can('shot', 3)) return; A.noise(0.05, { vol: 0.12, freq: 2400, type: 'bandpass' }); A.tone(500, 0.04, { type: 'square', vol: 0.05, slideTo: 200 }); },
        flame() { if (!can('flame', 5)) return; A.noise(0.14, { vol: 0.1, freq: 900, slideTo: 300 }); },
        rocket() { A.tone(180, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 900 }); A.noise(0.25, { vol: 0.1, freq: 1800, slideTo: 300 }); },
        hb() { if (!can('hb', 5)) return; A.tone(150, 0.2, { type: 'sawtooth', vol: 0.13, slideTo: 50 }); A.noise(0.18, { vol: 0.16, freq: 1400, slideTo: 150 }); A.tone(1600, 0.1, { type: 'square', vol: 0.035, slideTo: 3000 }); },
        toss() { A.tone(420, 0.2, { type: 'triangle', vol: 0.1, slideTo: 900 }); },
        boom() { if (!can('boom', 4)) return; A.noise(0.5, { vol: 0.32, freq: 1500, slideTo: 60 }); A.tone(95, 0.35, { type: 'sine', vol: 0.25, slideTo: 30 }); },
        bigBoom() { if (!can('big', 8)) return; A.noise(1.1, { vol: 0.45, freq: 1100, slideTo: 40 }); A.tone(70, 0.9, { type: 'sine', vol: 0.35, slideTo: 20 }); A.noise(0.6, { vol: 0.2, freq: 3500, slideTo: 200, delay: 0.12 }); },
        die() { if (!can('die', 6)) return; A.tone(rnd(700, 1000), 0.22, { type: 'sawtooth', vol: 0.06, slideTo: 220 }); },
        pdie() { A.melody([[523, 0.08], [440, 0.08], [349, 0.08], [262, 0.08], [196, 0.35]], { type: 'square', vol: 0.12 }); A.noise(0.4, { vol: 0.2, freq: 900, slideTo: 100 }); },
        key() { A.melody([[1047, 0.05], [1319, 0.05], [1568, 0.1]], { type: 'square', vol: 0.08 }); },
        open() { A.tone(180, 0.06, { type: 'square', vol: 0.1 }); A.tone(240, 0.12, { type: 'square', vol: 0.1, delay: 0.07 }); A.noise(0.08, { vol: 0.12, freq: 2500, delay: 0.02 }); },
        nokey() { if (!can('nokey', 30)) return; A.tone(150, 0.12, { type: 'square', vol: 0.08 }); },
        item() { A.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.14]], { type: 'square', vol: 0.09 }); },
        piece() { A.melody([[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.07], [1319, 0.18]], { type: 'square', vol: 0.1 }); },
        assemble() {
          A.melody([[392, 0.12], [392, 0.06], [523, 0.12], [659, 0.12], [784, 0.3], [659, 0.12], [784, 0.6]], { type: 'square', vol: 0.12 });
          A.melody([[196, 0.12], [196, 0.06], [262, 0.12], [330, 0.12], [392, 0.3], [330, 0.12], [392, 0.6]], { type: 'triangle', vol: 0.16 });
        },
        hit() { if (!can('hit', 4)) return; A.tone(1500, 0.04, { type: 'square', vol: 0.04, slideTo: 900 }); },
        eshot() { if (!can('eshot', 6)) return; A.tone(1100, 0.06, { type: 'square', vol: 0.035, slideTo: 500 }); },
        cannon() { if (!can('cannon', 6)) return; A.noise(0.3, { vol: 0.22, freq: 700, slideTo: 90 }); A.tone(110, 0.22, { type: 'square', vol: 0.1, slideTo: 45 }); },
        buzz() { A.tone(70, 0.28, { type: 'square', vol: 0.3 }); A.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 }); },
        siren() { for (let i = 0; i < 3; i++) { A.tone(500, 0.3, { type: 'square', vol: 0.07, slideTo: 1000, delay: i * 0.6 }); A.tone(1000, 0.3, { type: 'square', vol: 0.07, slideTo: 500, delay: i * 0.6 + 0.3 }); } },
        start() { A.melody([[392, 0.1], [392, 0.1], [392, 0.1], [523, 0.3], [0, 0.05], [494, 0.1], [523, 0.1], [587, 0.1], [659, 0.4]], { type: 'square', vol: 0.1 }); A.melody([[98, 0.3], [131, 0.3], [147, 0.3], [165, 0.5]], { type: 'triangle', vol: 0.18 }); },
        extra() { A.melody([[1319, 0.08], [1568, 0.08], [2093, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.08 }); },
        clear() { A.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.24], [784, 0.12], [1047, 0.5]], { type: 'square', vol: 0.11 }); A.melody([[131, 0.36], [196, 0.36], [262, 0.74]], { type: 'triangle', vol: 0.18 }); },
        over() { A.melody([[392, 0.25], [370, 0.25], [349, 0.25], [330, 0.6]], { type: 'triangle', vol: 0.18 }); }
      };
      const MARCH = [[110, 0.14], [0, 0.06], [110, 0.1], [110, 0.1], [131, 0.2], [110, 0.2], [147, 0.2], [131, 0.2], [110, 0.14], [0, 0.06], [110, 0.1], [110, 0.1], [165, 0.2], [147, 0.2], [131, 0.2], [123, 0.2]];

      // ---------- state ----------
      let hi = api.getHiScore(50000);
      let state = 'title', stT = 0, coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      const titleMD = makeMD(0, 0);
      let titleCam = titleMD.rows * 16 - H;
      let MD = null, camY = 0, stageNo = 0, loopN = 0;
      let P = null, score = 0, lives = 3, nextExtra = 50000, keys = 0, pieces = 0, hbT = 0, weapon = 'normal', ammo = 0;
      let pb = [], eb = [], grens = [], egrens = [], foes = [], crates = [], items = [], fx = [], parts = [], decals = [], pops = [];
      let god = false, helis = [], boss = null, bossDone = false, warnT = 0, introT = 0, clearT = 0, shake = 0, flashT = 0, spawnT = 120, killsNoKey = 0, assembleT = 0, nokeyT = 0;

      function inView(y, m) { m = m || 0; return y > camY - m && y < camY + H + m; }
      function tileAt(x, y) {
        const r = Math.floor(y / 16), c = Math.floor(x / 16);
        if (c < 0 || c >= COLS) return 'W';
        if (r < 0 || r >= MD.rows) return 'g';
        return MD.map[r][c];
      }
      const solidT = t => t === 'w' || t === 'W' || t === 't' || t === 'S';
      const bulletStop = t => t === 'W';
      function blockedAt(x, y, isPlayer) {
        if (solidT(tileAt(x - 4, y + 3)) || solidT(tileAt(x + 4, y + 3)) || solidT(tileAt(x - 4, y + 9)) || solidT(tileAt(x + 4, y + 9))) return true;
        for (const f of foes) {
          if (f.dead || !(f.kind === 'tank' || f.kind === 'turret' || f.kind === 'bunker')) continue;
          const dx = x - f.x, dy = y + 6 - f.y; if (dx * dx + dy * dy < (f.r + 4) * (f.r + 4)) return true;
        }
        if (isPlayer && boss && !boss.dying) {
          if (boss.type === 'fortress' && y < 100) return true;
          if (boss.type === 'tank' || boss.type === 'tank2') if (Math.abs(x - boss.x) < 48 && Math.abs(y - boss.y) < 38) return true;
        }
        return false;
      }
      function tryMove(e, dx, dy, isPlayer) {
        let moved = false;
        if (dx && !blockedAt(e.x + dx, e.y, isPlayer)) { e.x += dx; moved = true; }
        if (dy && !blockedAt(e.x, e.y + dy, isPlayer)) { e.y += dy; moved = true; }
        if (!moved && isPlayer && dy && !dx) { // corner slide
          for (const s of [-1, 1]) if (!blockedAt(e.x + s * 6, e.y + dy, true)) { if (!blockedAt(e.x + s, e.y, true)) e.x += s * 0.8; break; }
        }
        return moved;
      }

      // ---------- game flow ----------
      function startGame() {
        state = 'play'; stT = 0; score = 0; lives = 3; nextExtra = 50000; keys = 0; pieces = 0; hbT = 0; weapon = 'normal'; ammo = 0; loopN = 0;
        loadStage(0); SFX.start();
      }
      function loadStage(n) {
        stageNo = n; MD = makeMD(n, loopN);
        camY = MD.rows * 16 - H;
        P = { x: 120, y: camY + H - 30, dir: 0, frame: 0, walk: 0, cd: 0, gcd: 0, inv: 120, dead: false, dt: 0, flashT: 0 };
        let tries = 0; while (blockedAt(P.x, P.y, true) && tries++ < 14) P.x += (tries & 1 ? 1 : -1) * tries * 8;
        pb = []; eb = []; grens = []; egrens = []; items = []; fx = []; parts = []; decals = []; pops = [];
        foes = MD.placed.map(o => makeFoe(o.kind, o.x, o.y));
        crates = MD.crates.map(c => Object.assign({}, c));
        helis = MD.helis.slice();
        boss = null; bossDone = false; warnT = 0; introT = 200; clearT = 0; spawnT = 150; state = 'play';
      }
      function makeFoe(kind, x, y) {
        const f = { kind, x, y, hp: 1, r: 6, t: 0, anim: ri(60), dir: 4, frame: 0, flash: 0, dead: false, cd: rnd(60, 140), id: Math.random() };
        if (kind === 'tank') { f.hp = 14 + loopN * 4; f.r = 14; f.ang = 8; f.st = 'idle'; f.vx = 0; f.tf = 0; f.pts = 1500; }
        if (kind === 'turret') { f.hp = 9 + loopN * 3; f.r = 12; f.ang = 8; f.pts = 500; f.burst = 0; }
        if (kind === 'bunker') { f.hp = 18 + loopN * 4; f.r = 18; f.pts = 1000; f.spawnT = rnd(120, 240); }
        if (kind === 'sol' || kind === 'gren') { f.hp = 1; f.r = 6; f.st = 'move'; f.sp = 0.55 + stageNo * 0.05 + loopN * 0.08; f.pts = kind === 'gren' ? 200 : 100; pickTarget(f); }
        if (kind === 'heli') { f.hp = 26 + loopN * 6; f.r = 13; f.air = true; f.sx = x; f.sy = -40; f.st = 'in'; f.t = 0; f.pts = 2000; f.vx = 0; }
        return f;
      }
      function pickTarget(f) {
        const rush = Math.random() < 0.25;
        f.tx = clamp((P ? P.x : 120) + rnd(-80, 80), 16, 224);
        f.ty = rush && P ? P.y : clamp((P ? P.y : camY + 200) - rnd(30, 130), camY + 12, camY + H - 24);
        f.st = 'move'; f.t = rnd(60, 150) | 0;
      }
      function addScore(n, x, y) {
        score += n;
        if (x != null && pops.length < 20) pops.push({ x, y, s: String(n), t: 50 });
        while (score >= nextExtra) { lives = Math.min(9, lives + 1); nextExtra += nextExtra === 50000 ? 100000 : 100000; SFX.extra(); }
        if (score > hi) hi = score;
      }
      // Continue: lives restored on the same stage; score, keys, Heavy Barrel pieces and the weapon in hand are kept.
      let lostKit = null;
      function continueGame() {
        lives = 3;
        P.dead = false; P.inv = 150; P.dt = 0; eb.length = 0;
        if (lostKit && lostKit.weapon !== 'normal') { weapon = lostKit.weapon; ammo = lostKit.ammo; }
      }
      function gameOver() { state = 'over'; stT = 0; api.setHiScore(hi); SFX.over(); }
      function toTitle() { state = 'title'; stT = 0; titleCam = titleMD.rows * 16 - H; lastCredits = api.credits; }

      // ---------- effects ----------
      function boom(x, y, size, air) {
        if (fx.length < 70) fx.push({ k: 'ex', x, y, s: size, f: 0, spd: size === 2 ? 0.34 : 0.4 });
        const n = [6, 12, 22][size];
        for (let i = 0; i < n && parts.length < 400; i++) {
          const a = Math.random() * 6.283, s = rnd(0.6, 2.2) * (size + 1) * 0.7;
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.5, t: rnd(14, 34) | 0, c: ['#ffe060', '#ff9020', '#e03c10', '#5a4a3a', '#2a2420'][ri(5)], g: 0.06, sz: Math.random() < 0.3 ? 2 : 1 });
        }
        if (size >= 1 && !air) addDecal(SP.scorch[ri(2)], x, y + 3);
        if (size === 2) { shake = Math.max(shake, 14); SFX.bigBoom(); } else if (size === 1) { shake = Math.max(shake, 5); SFX.boom(); } else SFX.boom();
      }
      function addDecal(img, x, y) { decals.push({ img, x, y }); if (decals.length > 40) decals.shift(); }
      function sparks(x, y, n, col) { for (let i = 0; i < n && parts.length < 400; i++) { const a = Math.random() * 6.283, s = rnd(0.5, 2); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(6, 14) | 0, c: col || (Math.random() < 0.5 ? '#ffffff' : '#ffe060'), g: 0, sz: 1 }); } }

      // ---------- player weapons ----------
      function muzzle() { const m = SP.mz[hbT > 0 ? 1 : 0][P.dir]; return [P.x + m[0], P.y + m[1]]; }
      function addPB(o) { if (pb.length < 160) pb.push(o); }
      function fire() {
        const [dx, dy] = DV[P.dir], [mx, my] = muzzle(), ang = Math.atan2(dy, dx);
        P.flashT = 3;
        if (hbT > 0) {
          for (let k = -2; k <= 2; k++) { const a = ang + k * 0.2; addPB({ k: 'o', x: mx, y: my, vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5, t: 0, life: 48, dmg: 0.5 }); }
          P.cd = 8; shake = Math.max(shake, 3); SFX.hb();
          for (let i = 0; i < 6; i++) parts.push({ x: mx, y: my, vx: Math.cos(ang + rnd(-0.8, 0.8)) * rnd(1, 3), vy: Math.sin(ang + rnd(-0.8, 0.8)) * rnd(1, 3), t: 10, c: ['#ffffff', '#40d8ff', '#a040ff'][ri(3)], g: 0, sz: 2 });
          return;
        }
        switch (weapon) {
          case 'mg': { const a = ang + rnd(-0.06, 0.06); addPB({ k: 'b', x: mx, y: my, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, t: 0, life: 50, dmg: 1 }); P.cd = 4; SFX.mg(); break; }
          case '3way': for (const o of [-0.26, 0, 0.26]) addPB({ k: 'b', x: mx, y: my, vx: Math.cos(ang + o) * 5, vy: Math.sin(ang + o) * 5, t: 0, life: 50, dmg: 1 }); P.cd = 10; SFX.shot(); break;
          case 'flame': { const a = ang + rnd(-0.12, 0.12), s = rnd(2.8, 3.4); addPB({ k: 'f', x: mx, y: my, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 26, dmg: 0.16, id: ri(2) }); P.cd = 2; P.flashT = 0; SFX.flame(); break; }
          case 'rocket': addPB({ k: 'r', x: mx, y: my, vx: dx * 1.5, vy: dy * 1.5, ax: dx * 0.25, ay: dy * 0.25, d: P.dir, t: 0, life: 70, dmg: 4 }); P.cd = 18; SFX.rocket(); break;
          default: addPB({ k: 'b', x: mx, y: my, vx: dx * 5, vy: dy * 5, t: 0, life: 50, dmg: 1 }); P.cd = 9; SFX.shot();
        }
        if (weapon !== 'normal') { ammo--; if (ammo <= 0) weapon = 'normal'; }
      }
      function throwGrenade() {
        const [dx, dy] = DV[P.dir];
        if (grens.length > 6) return;
        grens.push({ x0: P.x, y0: P.y, tx: P.x + dx * 72, ty: P.y + dy * 72, t: 0, T: 34, pl: true });
        P.gcd = 26; SFX.toss();
      }

      // ---------- damage ----------
      function hurtFoe(f, dmg, splash) {
        if (f.dead) return;
        f.hp -= dmg; f.flash = 4;
        if (f.hp <= 0) killFoe(f, splash);
        else if (f.kind !== 'sol' && f.kind !== 'gren') SFX.hit();
      }
      function killFoe(f) {
        f.dead = true;
        addScore(f.pts, f.x, f.y - 10);
        if (f.kind === 'sol' || f.kind === 'gren') {
          if (fx.length < 70) fx.push({ k: 'die', x: f.x, y: f.y, pal: f.kind, t: 0, vx: rnd(-0.6, 0.6), vy: -0.8 });
          SFX.die();
          killsNoKey++;
          if (killsNoKey >= 6 || Math.random() < 0.12) { killsNoKey = 0; items.push({ type: 'key', x: f.x, y: f.y, t: 0, delay: 10 }); }
        } else if (f.kind === 'tank') { boom(f.x, f.y, 2); addDecal(SP.wreck, f.x - 16, f.y - 18); killsNoKey += 3; if (Math.random() < 0.6) { killsNoKey = 0; items.push({ type: 'key', x: f.x, y: f.y + 18, t: 0, delay: 10 }); } }
        else if (f.kind === 'turret') { boom(f.x, f.y, 1); addDecal(SP.scorch[0], f.x - 13, f.y - 9); }
        else if (f.kind === 'bunker') { boom(f.x, f.y, 2); addDecal(SP.rubble, f.x - 22, f.y - 17); items.push({ type: 'key', x: f.x, y: f.y + 14, t: 0, delay: 10 }); }
        else if (f.kind === 'heli') { boom(f.x, f.y, 2, true); for (let i = 0; i < 3; i++) fx.push({ k: 'ex', x: f.x + rnd(-14, 14), y: f.y + rnd(-14, 14), s: 1, f: -i * 3, spd: 0.4 }); }
      }
      function hurtPlayer() {
        if (!P || P.dead || P.inv > 0 || god || state !== 'play') return;
        lostKit = { weapon, ammo };
        P.dead = true; P.dt = 0; hbT = 0; weapon = 'normal'; SFX.pdie(); flashT = 4;
      }
      function splash(x, y, r, dmg, hitsAir) {
        for (const f of foes) {
          if (f.dead || (f.air && !hitsAir)) continue;
          const dx = f.x - x, dy = f.y - y, rr = r + f.r;
          if (dx * dx + dy * dy < rr * rr) hurtFoe(f, dmg, true);
        }
        if (boss && !boss.dying && (!boss.air || hitsAir)) for (const pt of boss.parts) {
          if (pt.dead) continue; const dx = boss.x + pt.dx - x, dy = boss.y + pt.dy - y, rr = r + pt.r;
          if (dx * dx + dy * dy < rr * rr) hurtPart(pt, dmg * 0.7);
        }
      }
      function enemyShot(x, y, tx, ty, spd, kind) {
        if (eb.length > 120) return;
        const a = Math.atan2(ty - y, tx - x);
        spd = spd || (1.45 + stageNo * 0.12 + loopN * 0.2);
        eb.push({ k: kind || 'b', x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, t: 0, life: kind === 'shell' ? Math.hypot(tx - x, ty - y) / spd : 400, d: dir8(Math.cos(a), Math.sin(a)) });
      }

      // ---------- update ----------
      function updPlayer() {
        if (P.dead) {
          P.dt++;
          if (P.dt === 110) {
            lives--;
            if (lives <= 0) {
              if (api.offerContinue) api.offerContinue(continueGame, gameOver);
              else gameOver();
              return;
            }
            P.dead = false; P.inv = 150; P.dt = 0;
          }
          return;
        }
        const mx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const my = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        if (mx || my) {
          P.dir = dir8(mx, my);
          const sp = (mx && my) ? 0.82 : 1.15;
          tryMove(P, mx * sp, my * sp, true);
          P.walk++;
          P.frame = ((P.walk / 7) | 0) & 3;
        } else P.frame = 0;
        P.x = clamp(P.x, 8, 232);
        P.y = clamp(P.y, camY + 18, camY + H - 30);
        if (P.cd > 0) P.cd--; if (P.gcd > 0) P.gcd--; if (P.inv > 0) P.inv--; if (P.flashT > 0) P.flashT--;
        if (api.key('Space') && P.cd <= 0) fire();
        if (api.anyPressed('KeyX', 'KeyZ') && P.gcd <= 0) throwGrenade();
        if (hbT > 0) { hbT--; if (hbT === 0) A.tone(400, 0.4, { type: 'square', vol: 0.08, slideTo: 100 }); }
      }
      function updCamera() {
        if (boss) return;
        const ty = P.y - 118;
        if (ty < camY) camY = Math.max(0, ty);
        if (camY <= 0 && !boss && !bossDone) spawnBoss();
      }
      function spawner() {
        if (P.dead || introT > 150) return;
        // helicopters
        if (boss) helis = [];
        if (helis.length && camY + H * 0.5 < helis[0]) { helis.shift(); if (!foes.some(f => f.kind === 'heli')) foes.push(makeFoe('heli', rnd(60, 180), 0)); }
        if (--spawnT > 0) return;
        let n = 0; for (const f of foes) if (!f.dead && (f.kind === 'sol' || f.kind === 'gren')) n++;
        const max = boss ? 4 : 6 + stageNo + loopN;
        spawnT = Math.max(28, 90 - stageNo * 10 - loopN * 12) + ri(40) + (boss ? 60 : 0);
        if (n >= max) return;
        const grp = 1 + ri(Math.min(3, 1 + stageNo));
        for (let g = 0; g < grp; g++) {
          for (let tries = 0; tries < 8; tries++) {
            let x, y;
            const side = Math.random();
            if (side < 0.7 || boss) { x = rnd(16, 224); y = camY - 8; }
            else { x = side < 0.85 ? 10 : 230; y = camY + rnd(16, 150); }
            if (boss && boss.type === 'fortress') { x = 120 + rnd(-40, 40); y = 92; }
            if (blockedAt(x, y, false)) continue;
            foes.push(makeFoe(Math.random() < 0.15 + stageNo * 0.06 ? 'gren' : 'sol', x, y));
            break;
          }
        }
      }
      function updFoes() {
        for (const f of foes) {
          if (f.dead) continue;
          if (f.flash > 0) f.flash--;
          f.anim++;
          const vis = inView(f.y, 8);
          switch (f.kind) {
            case 'sol': case 'gren': {
              f.t--;
              if (f.st === 'move') {
                const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
                if (d < 2 || f.t <= 0) { f.st = 'aim'; f.t = 44; }
                else {
                  const vx = dx / d * f.sp, vy = dy / d * f.sp;
                  f.dir = dir8(vx, vy);
                  const ok = tryMove(f, vx, vy, false);
                  if (!ok) { f.st = 'aim'; f.t = 30; }
                  f.frame = ((f.anim / 8) | 0) & 3;
                }
              } else {
                f.frame = 0;
                if (!P.dead) f.dir = dir8(P.x - f.x, P.y - f.y);
                if (f.t === 18 && vis && !P.dead && f.y < P.y + 60 && Math.random() < 0.8) {
                  const m = SP.mz[0][f.dir];
                  if (f.kind === 'gren') { if (egrens.length < 10) { egrens.push({ x0: f.x, y0: f.y, tx: P.x + rnd(-10, 10), ty: P.y + rnd(-10, 10), t: 0, T: 50 }); SFX.toss(); } }
                  else { enemyShot(f.x + m[0], f.y + m[1], P.x, P.y); SFX.eshot(); }
                }
                if (f.t <= 0) pickTarget(f);
              }
              if (f.y > camY + H + 30 || f.y < camY - 80) f.dead = true;
              break;
            }
            case 'tank': {
              if (f.st === 'idle') { if (f.y > camY - 20) f.st = 'roll'; break; }
              if (f.st === 'roll') {
                if (!solidT(tileAt(f.x, f.y + 18)) && f.y < camY + 80 + (f.id * 60)) { f.y += 0.35; f.tf += 0.35; }
                else { f.st = 'patrol'; f.vx = Math.random() < 0.5 ? -0.3 : 0.3; }
              } else if (f.st === 'patrol') {
                const nx = f.x + f.vx;
                if (nx < 24 || nx > 216 || solidT(tileAt(nx + Math.sign(f.vx) * 16, f.y)) || Math.abs(nx - P.x) < 6) f.vx = -f.vx; else { f.x = nx; f.tf += 0.3; }
              }
              const want = Math.round((Math.atan2(P.y - f.y, P.x - f.x) + Math.PI / 2) / (Math.PI / 8));
              const wa = ((want % 16) + 16) % 16;
              if (f.anim % 8 === 0 && f.ang !== wa) { const d = ((wa - f.ang + 24) % 16) - 8; f.ang = (f.ang + Math.sign(d) + 16) % 16; }
              if (vis && --f.cd <= 0 && !P.dead) {
                f.cd = rnd(100, 150) - stageNo * 8;
                const a = f.ang / 16 * Math.PI * 2 - Math.PI / 2, mx = f.x + Math.cos(a) * 16, my = f.y + Math.sin(a) * 16;
                const dist = clamp(Math.hypot(P.x - mx, P.y - my), 30, 160);
                enemyShot(mx, my, mx + Math.cos(a) * dist, my + Math.sin(a) * dist, 2, 'shell');
                SFX.cannon(); sparks(mx, my, 5, '#ffe060');
              }
              if (f.y > camY + H + 40) f.dead = true;
              break;
            }
            case 'turret': {
              if (!vis) break;
              const want = Math.round((Math.atan2(P.y - f.y, P.x - f.x) + Math.PI / 2) / (Math.PI / 8));
              const wa = ((want % 16) + 16) % 16;
              if (f.anim % 6 === 0 && f.ang !== wa) { const d = ((wa - f.ang + 24) % 16) - 8; f.ang = (f.ang + Math.sign(d) + 16) % 16; }
              if (--f.cd <= 0 && !P.dead && f.y > camY + 8) { f.burst = 3; f.cd = rnd(110, 160) - stageNo * 10; }
              if (f.burst > 0 && f.anim % 8 === 0) {
                f.burst--;
                const a = f.ang / 16 * Math.PI * 2 - Math.PI / 2;
                enemyShot(f.x + Math.cos(a) * 13, f.y + Math.sin(a) * 13, f.x + Math.cos(a) * 100, f.y + Math.sin(a) * 100);
                SFX.eshot();
              }
              break;
            }
            case 'bunker': {
              if (!vis) break;
              if (--f.cd <= 0 && !P.dead && f.y > camY + 10) {
                f.cd = rnd(120, 170) - stageNo * 10; f.firing = 12;
                for (const o of [-0.3, 0, 0.3]) { const a = Math.atan2(P.y - f.y, P.x - f.x) + o; enemyShot(f.x, f.y + 4, f.x + Math.cos(a) * 50, f.y + 4 + Math.sin(a) * 50); }
                SFX.eshot();
              }
              if (f.firing > 0) f.firing--;
              if (--f.spawnT <= 0 && f.y > camY + 20 && f.y < camY + H - 40) {
                f.spawnT = rnd(200, 300);
                let n = 0; for (const g of foes) if (!g.dead && g.kind === 'sol') n++;
                if (n < 10) { const s = makeFoe('sol', f.x + rnd(-8, 8), f.y + 22); if (!blockedAt(s.x, s.y, false)) foes.push(s); }
              }
              break;
            }
            case 'heli': {
              f.t++;
              if (f.st === 'in') { f.sy += 1.1; if (f.sy >= 56) f.st = 'hover'; }
              else if (f.st === 'hover') {
                f.vx += (P.x > f.sx ? 0.02 : -0.02); f.vx = clamp(f.vx, -0.9, 0.9); f.sx = clamp(f.sx + f.vx, 24, 216);
                f.sy = 56 + Math.sin(f.t * 0.03) * 8;
                if (--f.cd <= 0 && !P.dead) { f.cd = rnd(70, 110) - stageNo * 6; f.burst = 3; }
                if (f.burst > 0 && f.t % 7 === 0) { f.burst--; enemyShot(f.x + (f.burst & 1 ? -12 : 12), f.y + 6, P.x, P.y, 1.8); SFX.eshot(); }
                if (f.t > 720) f.st = 'out';
              } else { f.sy -= 1.3; if (f.sy < -60) f.dead = true; }
              f.x = f.sx; f.y = camY + f.sy;
              break;
            }
          }
        }
        foes = foes.filter(f => !f.dead);
      }
      function updPB() {
        for (const b of pb) {
          b.t++;
          if (b.k === 'r') { b.vx += b.ax; b.vy += b.ay; const s = Math.hypot(b.vx, b.vy); if (s > 7) { b.vx *= 7 / s; b.vy *= 7 / s; } if (b.t % 2 === 0 && parts.length < 400) parts.push({ x: b.x - b.vx, y: b.y - b.vy, vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), t: 12, c: Math.random() < 0.5 ? '#c8c8c8' : '#ffa030', g: 0, sz: 1 }); }
          if (b.k === 'f') { b.vx *= 0.965; b.vy *= 0.965; }
          b.x += b.vx; b.y += b.vy;
          if (b.t > b.life || b.x < -10 || b.x > W + 10 || b.y < camY - 10 || b.y > camY + H + 10) { b.dead = true; if (b.k === 'r' && b.t > b.life) { boom(b.x, b.y, 1); splash(b.x, b.y, 18, 3, false); } continue; }
          if ((b.k === 'b' || b.k === 'r') && (bulletStop(tileAt(b.x, b.y)))) { b.dead = true; if (b.k === 'r') { boom(b.x, b.y, 1); splash(b.x, b.y, 18, 3, false); } else sparks(b.x, b.y, 3); continue; }
          const pierce = b.k === 'o' || b.k === 'f';
          const br = b.k === 'o' ? 9 : b.k === 'f' ? 4 + b.t * 0.25 : 3;
          for (const f of foes) {
            if (f.dead) continue;
            if (f.kind === 'heli' && f.st === 'in' && f.sy < 10) continue;
            const dx = f.x - b.x, dy = f.y - b.y, rr = f.r + br;
            if (dx * dx + dy * dy < rr * rr) {
              if (pierce) { hurtFoe(f, (f.kind === 'sol' || f.kind === 'gren') ? 1 : b.dmg); }
              else { b.dead = true; if (b.k === 'r') { boom(b.x, b.y, 1); splash(b.x, b.y, 18, 3, true); hurtFoe(f, b.dmg); } else { hurtFoe(f, b.dmg); sparks(b.x, b.y, 2); } break; }
            }
          }
          if (b.dead) continue;
          if (boss && !boss.dying && boss.y > -20) {
            for (const pt of boss.parts) {
              if (pt.dead) continue;
              const dx = boss.x + pt.dx - b.x, dy = boss.y + pt.dy - b.y, rr = pt.r + br;
              if (dx * dx + dy * dy < rr * rr) {
                if (pierce) hurtPart(pt, b.dmg * 0.6);
                else { b.dead = true; hurtPart(pt, b.dmg); if (b.k === 'r') boom(b.x, b.y, 1); else sparks(b.x, b.y, 3); break; }
              }
            }
            if (!b.dead && !pierce && Math.abs(b.x - boss.x) < boss.w / 2 && b.y > boss.y - boss.h / 2 && b.y < boss.y + boss.h / 2) { b.dead = true; sparks(b.x, b.y, 3, '#c0c8d8'); SFX.hit(); if (b.k === 'r') boom(b.x, b.y, 1); }
          }
          if (b.k === 'o') for (const e of eb) { const dx = e.x - b.x, dy = e.y - b.y; if (dx * dx + dy * dy < 140) e.dead = true; }
        }
        pb = pb.filter(b => !b.dead);
      }
      function updEB() {
        for (const e of eb) {
          e.t++; e.x += e.vx; e.y += e.vy;
          if (e.k === 'm' && e.t < 50 && !P.dead) { const a = Math.atan2(P.y - e.y, P.x - e.x), ca = Math.atan2(e.vy, e.vx); let d = a - ca; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; const na = ca + clamp(d, -0.04, 0.04), s = Math.hypot(e.vx, e.vy); e.vx = Math.cos(na) * s; e.vy = Math.sin(na) * s; e.d = dir8(e.vx, e.vy); if (e.t % 2 === 0 && parts.length < 400) parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, t: 10, c: '#b0b0b0', g: 0, sz: 1 }); }
          if (e.k === 'shell' || e.k === 'm') {
            if (e.t >= e.life || (e.k === 'm' && Math.hypot(P.x - e.x, P.y - e.y) < 8)) { e.dead = true; boom(e.x, e.y, 0); if (Math.hypot(P.x - e.x, P.y - e.y) < 14) hurtPlayer(); continue; }
          } else if (bulletStop(tileAt(e.x, e.y)) || tileAt(e.x, e.y) === 'S' && e.t > 10) { e.dead = true; continue; }
          if (e.x < -8 || e.x > W + 8 || e.y < camY - 20 || e.y > camY + H + 8 || e.t > 500) { e.dead = true; continue; }
          if (!P.dead && Math.abs(e.x - P.x) < 4.5 && e.y > P.y - 8 && e.y < P.y + 8) { e.dead = true; hurtPlayer(); }
        }
        eb = eb.filter(e => !e.dead);
      }
      function updGrenades() {
        for (const g of grens) {
          g.t++;
          if (g.t >= g.T) {
            g.dead = true;
            const x = g.tx, y = g.ty;
            boom(x, y, 1); splash(x, y, 22, 6, false);
          }
        }
        grens = grens.filter(g => !g.dead);
        for (const g of egrens) {
          g.t++;
          if (g.t >= g.T) { g.dead = true; boom(g.tx, g.ty, 0); if (Math.hypot(P.x - g.tx, P.y - g.ty) < 15) hurtPlayer(); }
        }
        egrens = egrens.filter(g => !g.dead);
      }
      function updItems() {
        for (const it of items) {
          it.t++;
          if (it.type === 'key' && it.t > 600) { it.dead = true; continue; }
          if (it.y > camY + H + 20) { it.dead = true; continue; }
          if (P.dead || it.t < it.delay) continue;
          if (Math.abs(P.x - it.x) < 10 && Math.abs(P.y + 4 - it.y) < 12) {
            it.dead = true;
            switch (it.type) {
              case 'key': keys = Math.min(9, keys + 1); addScore(200); SFX.key(); break;
              case 'mg': weapon = 'mg'; ammo = 300; addScore(500, it.x, it.y - 8); SFX.item(); break;
              case 'flame': weapon = 'flame'; ammo = 260; addScore(500, it.x, it.y - 8); SFX.item(); break;
              case '3way': weapon = '3way'; ammo = 160; addScore(500, it.x, it.y - 8); SFX.item(); break;
              case 'rocket': weapon = 'rocket'; ammo = 60; addScore(500, it.x, it.y - 8); SFX.item(); break;
              case 'gold': addScore(5000, it.x, it.y - 8); SFX.item(); break;
              case 'piece':
                pieces = Math.min(6, pieces + 1); addScore(1000, it.x, it.y - 8);
                if (pieces >= 6) assemble(); else SFX.piece();
                break;
            }
          }
        }
        items = items.filter(i => !i.dead);
        if (nokeyT > 0) nokeyT--;
        for (const c of crates) {
          if (c.open || P.dead) continue;
          if (Math.abs(P.x - c.x) < 11 && Math.abs(P.y + 5 - c.y) < 12) {
            if (keys > 0) {
              keys--; c.open = true; SFX.open(); addScore(300);
              items.push({ type: c.content, x: c.x, y: c.y - 2, t: 0, delay: 25, pop: 1 });
              sparks(c.x, c.y, 10, '#ffe060');
            } else { nokeyT = 40; SFX.nokey(); }
          }
        }
      }
      function assemble() { pieces = 0; hbT = 1200; assembleT = 150; flashT = 6; SFX.assemble(); }
      function updFx() {
        for (const e of fx) {
          if (e.k === 'ex') { e.f += e.spd; if (e.f >= SP.ex[e.s].length) e.dead = true; }
          else if (e.k === 'die') { e.t++; if (e.t < 10) { e.x += e.vx; e.y += e.vy; e.vy += 0.15; } if (e.t > 70) e.dead = true; }
        }
        fx = fx.filter(e => !e.dead);
        for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.96; p.vy *= 0.96; if (--p.t <= 0) p.dead = true; }
        parts = parts.filter(p => !p.dead);
        for (const p of pops) { p.y -= 0.4; if (--p.t <= 0) p.dead = true; }
        pops = pops.filter(p => !p.dead);
        if (shake > 0) shake--; if (flashT > 0) flashT--; if (assembleT > 0) assembleT--;
      }

      // ---------- bosses ----------
      function spawnBoss() {
        const type = STAGES[stageNo].boss, k = 1 + loopN * 0.4;
        const B = { type, t: 0, vx: 0.5, dying: 0, parts: [], air: false };
        if (type === 'tank' || type === 'tank2') {
          Object.assign(B, { x: 120, y: -50, w: 92, h: 66, ty: 50, tf: 0 });
          B.parts = [{ name: 'tl', dx: -27, dy: 18, r: 10, hp: 30 * k, ang: 8, cd: 90 }, { name: 'tr', dx: 27, dy: 18, r: 10, hp: 30 * k, ang: 8, cd: 130 }, { name: 'core', dx: 0, dy: -2, r: 14, hp: 70 * k, cd: 160, recoil: 0 }];
        } else if (type === 'gunship') {
          Object.assign(B, { x: 120, y: -70, w: 72, h: 80, ty: 62, air: true });
          B.parts = [{ name: 'pl', dx: -30, dy: 4, r: 9, hp: 30 * k, cd: 100 }, { name: 'pr', dx: 30, dy: 4, r: 9, hp: 30 * k, cd: 150 }, { name: 'core', dx: 0, dy: 10, r: 14, hp: 80 * k, cd: 80 }];
        } else {
          Object.assign(B, { x: 120, y: 42, w: 240, h: 84, ty: 42 });
          B.parts = [{ name: 'tl', dx: -80, dy: 14, r: 11, hp: 30 * k, ang: 8, cd: 60 }, { name: 'tr', dx: 80, dy: 14, r: 11, hp: 30 * k, ang: 8, cd: 90 }, { name: 'core', dx: 0, dy: -2, r: 13, hp: 90 * k, cd: 140 }];
        }
        for (const pt of B.parts) pt.max = pt.hp;
        boss = B; warnT = 170; SFX.siren();
      }
      function hurtPart(pt, dmg) {
        if (pt.dead || !boss || boss.dying || warnT > 60) return;
        pt.hp -= dmg; pt.flash = 3;
        if (pt.hp <= 0) {
          pt.dead = true; boom(boss.x + pt.dx, boss.y + pt.dy, pt.name === 'core' ? 2 : 1, boss.air);
          addScore(pt.name === 'core' ? 10000 : 2000, boss.x + pt.dx, boss.y + pt.dy - 10);
          if (pt.name === 'core') { boss.dying = 1; eb = []; egrens = []; for (const f of foes) if (!f.dead && f.kind !== 'heli') { f.hp = 0; killFoe(f); } }
        } else SFX.hit();
      }
      function updBoss() {
        if (!boss) return;
        const B = boss; B.t++;
        if (warnT > 0) warnT--;
        if (B.dying) {
          B.dying++;
          if (B.dying % 7 === 0 && B.dying < 140) fx.push({ k: 'ex', x: B.x + rnd(-B.w / 2, B.w / 2) * 0.8, y: B.y + rnd(-B.h / 2, B.h / 2) * 0.8, s: ri(2) + 1, f: 0, spd: 0.4 }), SFX.boom();
          if (B.dying === 140) { boom(B.x, B.y, 2, B.air); flashT = 10; if (B.type !== 'fortress') addDecal(B.type === 'gunship' ? SP.scorch[1] : SP.wreck, B.x - 16, B.y - 16); }
          if (B.dying === 150) { bossDone = true; state = 'clear'; clearT = 0; SFX.clear(); if (B.type !== 'fortress') boss = null; else B.dead = true; }
          return;
        }
        const live = B.parts.filter(p => !p.dead);
        if (B.type === 'tank' || B.type === 'tank2') {
          if (B.y < B.ty) { B.y += 0.5; B.tf += 0.5; return; }
          const nx = B.x + B.vx; if (nx < 64 || nx > 176) B.vx = -B.vx; else { B.x = nx; B.tf += Math.abs(B.vx); }
          B.y = B.ty + Math.max(0, Math.sin(B.t * 0.01)) * 24; B.vx = Math.sign(B.vx) * (0.4 + (3 - live.length) * 0.25);
        } else if (B.type === 'gunship') {
          if (B.y < B.ty) { B.y += 0.7; return; }
          B.x = 120 + Math.sin(B.t * 0.012) * 70; B.y = B.ty + Math.sin(B.t * 0.023) * 14;
        }
        if (warnT > 60) return;
        for (const pt of live) {
          pt.flash = Math.max(0, (pt.flash || 0) - 1);
          const px = B.x + pt.dx, py = B.y + pt.dy;
          if (pt.ang != null) {
            const want = Math.round((Math.atan2(P.y - py, P.x - px) + Math.PI / 2) / (Math.PI / 8)), wa = ((want % 16) + 16) % 16;
            if (B.t % 5 === 0 && pt.ang !== wa) { const d = ((wa - pt.ang + 24) % 16) - 8; pt.ang = (pt.ang + Math.sign(d) + 16) % 16; }
          }
          if (pt.recoil > 0) pt.recoil--;
          if (--pt.cd > 0 || P.dead) continue;
          const harder = 1 + (B.parts.length - live.length) * 0.25 + loopN * 0.2;
          if (pt.name === 'core') {
            if (B.type === 'gunship') {
              pt.cd = 70 / harder;
              if ((B.t >> 6) % 3 === 2) { for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283 + B.t * 0.1; enemyShot(px, py, px + Math.cos(a) * 10, py + Math.sin(a) * 10, 1.4); } }
              else for (const o of [-0.25, 0, 0.25]) { const a = Math.atan2(P.y - py, P.x - px) + o; enemyShot(px, py + 8, px + Math.cos(a) * 10, py + 8 + Math.sin(a) * 10, 1.9); }
              SFX.eshot();
            } else if (B.type === 'fortress') {
              pt.cd = 120 / harder;
              for (let k = -3; k <= 3; k++) { const a = Math.atan2(P.y - py, P.x - px) + k * 0.2; enemyShot(px, py + 10, px + Math.cos(a) * 10, py + 10 + Math.sin(a) * 10, 1.6); }
              SFX.cannon();
            } else {
              pt.cd = 150 / harder; pt.recoil = 12;
              for (const o of [-6, 6]) { const tx = P.x + o * 4 + rnd(-10, 10), ty = P.y + rnd(-10, 10); enemyShot(px + o, py + 34, tx, ty, 2.2, 'shell'); }
              for (let k = -2; k <= 2; k++) { const a = Math.PI / 2 + k * 0.32; enemyShot(px, py + 30, px + Math.cos(a) * 10, py + 30 + Math.sin(a) * 10, 1.5); }
              SFX.cannon(); shake = Math.max(shake, 4);
            }
          } else if (pt.name === 'pl' || pt.name === 'pr') {
            pt.cd = 110 / harder;
            enemyShot(px, py + 10, P.x, P.y, 1.6, 'm'); eb[eb.length - 1] && (eb[eb.length - 1].life = 400);
            SFX.rocket();
          } else {
            pt.cd = (B.type === 'fortress' ? 55 : 70) / harder;
            const a = pt.ang / 16 * Math.PI * 2 - Math.PI / 2;
            enemyShot(px + Math.cos(a) * 16, py + Math.sin(a) * 16, px + Math.cos(a) * 100, py + Math.sin(a) * 100, 1.8);
            SFX.eshot();
          }
        }
        if (B.type === 'fortress' && B.t % 160 === 0) {
          let n = 0; for (const f of foes) if (!f.dead && f.kind === 'sol') n++;
          if (n < 6) for (const o of [-24, 24]) foes.push(makeFoe('sol', 120 + o, 92));
        }
      }

      // ---------- main update ----------
      function update() {
        stT++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        const cr = api.credits;
        if (state === 'title') {
          titleCam -= 0.35; if (titleCam < 0) titleCam = titleMD.rows * 16 - H;
          if (lastCredits === 0 && cr > 0) { stT = 0; coinHold = 150; coinFlash = 0; }
          lastCredits = cr;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); }
            else { coinFlash = 150; stT = 0; SFX.buzz(); }
          }
          return;
        }
        lastCredits = cr;
        if (state === 'over') {
          updFx();
          if (stT > 300 || (stT > 90 && api.anyPressed('Enter', 'Space'))) toTitle();
          return;
        }
        if (introT > 0) introT--;
        if (state === 'play' && api.frame % 192 === 0 && !boss) A.melody(MARCH, { type: 'triangle', vol: 0.07 });
        updPlayer();
        if (state !== 'play' && state !== 'clear') return;
        updCamera();
        if (state === 'play') spawner();
        updFoes(); updBoss(); updPB(); updEB(); updGrenades(); updItems(); updFx();
        if (state === 'clear') {
          clearT++;
          if (clearT === 200) addScore(5000 * (stageNo + 1));
          if (clearT > 400) {
            const n = (stageNo + 1) % STAGES.length; if (n === 0) loopN++;
            const keep = { weapon, ammo, keys, pieces, hbT };
            loadStage(n); weapon = keep.weapon; ammo = keep.ammo; keys = keep.keys; pieces = keep.pieces; hbT = keep.hbT;
            SFX.start();
          }
        }
      }

      // ---------- render ----------
      function shadow(ctx, x, y, w) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(x - w / 2), Math.round(y), w, 2); ctx.fillRect(Math.round(x - w / 2 + 1), Math.round(y - 1), w - 2, 4); }
      function drawChar(ctx, set, f, x, y) { ctx.drawImage(set[f.dir][f.frame], Math.round(x - 13), Math.round(y - 16)); }
      function lighten(ctx, img, x, y) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75; ctx.drawImage(img, x, y); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      function drawWorld(ctx) {
        const cy = Math.round(camY);
        drawMapView(ctx, MD, cy, api.frame);
        for (const d of decals) if (d.y > cy - 50 && d.y < cy + H + 10) ctx.drawImage(d.img, Math.round(d.x), Math.round(d.y) - cy);
        if (boss && boss.type === 'fortress') drawBoss(ctx, cy);
        // crates
        for (const c of crates) {
          if (c.y < cy - 20 || c.y > cy + H + 20) continue;
          ctx.drawImage(c.open ? SP.crateOpen : SP.crate, c.x - 9, c.y - 9 - cy);
        }
        // items
        for (const it of items) {
          if (it.type === 'key' && it.t > 480 && (api.frame & 4)) continue;
          const bob = Math.round(Math.sin(it.t * 0.12) * 1.5) - (it.pop && it.t < 20 ? Math.round(Math.sin(it.t / 20 * Math.PI) * 10) : 0);
          const x = Math.round(it.x), y = Math.round(it.y) - cy + bob;
          if (it.type === 'key') { shadow(ctx, x, y + 6 - bob, 10); ctx.drawImage(SP.key, x - 6, y - 3); if ((it.t >> 3) % 4 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y - 3, 1, 1); } continue; }
          ctx.drawImage(SP.plate[it.type][(it.t >> 3) & 1], x - 9, y - 7);
          if (it.type === 'piece') {
            const idx = Math.min(5, pieces);
            const [sx, sw] = SP.hbSlice(idx);
            ctx.drawImage(SP.hb, sx, 0, sw, 14, x - (sw >> 1), y - 7, sw, 14);
          } else ctx.drawImage(SP.pict[it.type], x - 7, y - 4);
        }
        // ground foes
        for (const f of foes) {
          if (f.kind === 'heli' || f.y < cy - 40 || f.y > cy + H + 40) continue;
          const sy = Math.round(f.y) - cy, sx = Math.round(f.x);
          if (f.kind === 'turret') {
            ctx.drawImage(SP.empl, sx - 17, sy - 17);
            const g = SP.gun[f.ang]; ctx.drawImage(g, sx - (g.width >> 1), sy - (g.height >> 1));
            if (f.flash > 0) lighten(ctx, g, sx - (g.width >> 1), sy - (g.height >> 1));
          } else if (f.kind === 'bunker') {
            ctx.drawImage(SP.bunkerC, sx - 22, sy - 17);
            if (f.firing > 0 && (f.firing & 2)) { ctx.fillStyle = '#ffd040'; ctx.fillRect(sx - 10, sy + 3, 20, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 4, sy + 3, 8, 1); }
            if (f.flash > 0) lighten(ctx, SP.bunkerC, sx - 22, sy - 17);
          } else if (f.kind === 'tank') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sx - 13, sy + 15, 30, 4);
            const body = SP.tank[((f.tf / 2) | 0) & 1]; ctx.drawImage(body, sx - 16, sy - 18);
            const t = SP.tturret[f.ang]; ctx.drawImage(t, sx - (t.width >> 1), sy - (t.height >> 1));
            if (f.flash > 0) { lighten(ctx, body, sx - 16, sy - 18); }
          }
        }
        if (boss && boss.type !== 'fortress' && !boss.air) drawBoss(ctx, cy);
        // corpses
        for (const e of fx) {
          if (e.k !== 'die') continue;
          const ch = SP.ch[e.pal], x = Math.round(e.x), y = Math.round(e.y) - cy;
          if (e.t < 10) ctx.drawImage(ch.white, x - 13, y - 16);
          else if (e.t < 50 || (e.t & 4)) ctx.drawImage(ch.dead, x - 10, y - 2);
        }
        // soldiers
        for (const f of foes) {
          if (f.kind !== 'sol' && f.kind !== 'gren') continue;
          const y = f.y - cy;
          if (y < -30 || y > H + 30) continue;
          shadow(ctx, f.x, y + 9, 10);
          drawChar(ctx, SP.ch[f.kind].n, f, f.x, y);
        }
        // player
        if (P && state !== 'over') {
          const y = P.y - cy;
          if (P.dead) {
            if (P.dt < 12) ctx.drawImage(SP.ch.player.white, Math.round(P.x - 13), Math.round(y - 16));
            else if (P.dt < 90 || (P.dt & 4)) ctx.drawImage(SP.ch.player.dead, Math.round(P.x - 10), Math.round(y - 2));
          } else if (!(P.inv > 0 && (api.frame & 4))) {
            shadow(ctx, P.x, y + 9, 10);
            drawChar(ctx, hbT > 0 ? SP.ch.player.hb : SP.ch.player.n, P, P.x, y);
            if (P.flashT > 0) { const [mx, my] = muzzle(); const fl = SP.flash[P.flashT & 1]; ctx.drawImage(fl, Math.round(mx - 3), Math.round(my - cy - 3)); }
            if (hbT > 0 && (api.frame & 2)) { const [mx, my] = muzzle(); ctx.fillStyle = '#a0f0ff'; ctx.fillRect(Math.round(mx) - 1, Math.round(my - cy) - 1, 3, 3); }
          }
        }
        // grenades (arc)
        for (const g of grens.concat(egrens)) {
          const t = g.t / g.T, x = g.x0 + (g.tx - g.x0) * t, y = g.y0 + (g.ty - g.y0) * t - cy, h = Math.sin(t * Math.PI) * (g.pl ? 22 : 30);
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(Math.round(x - 2), Math.round(y + 2), 4, 2);
          ctx.drawImage(SP.gren[(g.t >> 2) & 1], Math.round(x - 3), Math.round(y - h - 4));
        }
        // player shots
        for (const b of pb) {
          const x = Math.round(b.x), y = Math.round(b.y) - cy;
          if (b.k === 'b') ctx.drawImage(SP.pbul, x - 2, y - 2);
          else if (b.k === 'r') ctx.drawImage(SP.rocket[b.d], x - 7, y - 7);
          else if (b.k === 'o') { const o = SP.orb[(b.t >> 1) & 3]; ctx.drawImage(o, x - 10, y - 10); }
          else if (b.k === 'f') {
            const fr = SP.flame[(b.id || 0) & 1][Math.min(9, Math.floor(b.t / b.life * 10))];
            ctx.drawImage(fr, x - 10, y - 10);
          }
        }
        // ground explosions
        for (const e of fx) if (e.k === 'ex' && e.f >= 0) { const fr = SP.ex[e.s][Math.floor(e.f)]; if (fr) ctx.drawImage(fr, Math.round(e.x - fr.width / 2), Math.round(e.y - cy - fr.height / 2)); }
        // enemy shots
        for (const e of eb) {
          const x = Math.round(e.x), y = Math.round(e.y) - cy;
          if (e.k === 'shell') ctx.drawImage(SP.shell, x - 3, y - 3);
          else if (e.k === 'm') ctx.drawImage(SP.rocket[e.d], x - 7, y - 7);
          else ctx.drawImage(SP.ebul[(api.frame >> 2) & 1], x - 2, y - 2);
        }
        // helicopters (air layer)
        for (const f of foes) {
          if (f.kind !== 'heli') continue;
          const x = Math.round(f.x), y = Math.round(f.y) - cy;
          ctx.globalAlpha = 0.3; ctx.drawImage(SP.heliSh, x - 19 + 14, y - 30 + 30); ctx.globalAlpha = 1;
          ctx.drawImage(SP.heli, x - 19, y - 30);
          if (f.flash > 0) lighten(ctx, SP.heli, x - 19, y - 30);
          drawRotor(ctx, x, y + 1, 25, f.t * 0.7);
          drawRotorSmall(ctx, x + 4, y - 26, 4, f.t);
        }
        if (boss && boss.air) drawBoss(ctx, cy);
        for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y) - cy, p.sz, p.sz); }
        for (const p of pops) shText(ctx, p.s, Math.round(p.x), Math.round(p.y) - cy, '#ffffff', 1, 'center');
      }
      function drawRotor(ctx, x, y, R, a) {
        ctx.fillStyle = 'rgba(190,200,210,0.10)';
        for (let j = -R; j <= R; j++) { const w = Math.round(Math.sqrt(R * R - j * j)); ctx.fillRect(x - w, y + j, w * 2, 1); }
        for (let k = 0; k < 2; k++) {
          const ang = a + k * Math.PI / 2;
          for (let s = -1; s <= 1; s += 2) {
            const ang2 = ang - 0.22 * s;
            ctx.fillStyle = 'rgba(210,220,230,0.25)';
            for (let i = 6; i < R; i += 1) ctx.fillRect(Math.round(x + Math.cos(ang2) * i * s), Math.round(y + Math.sin(ang2) * i * s), 1, 1);
            for (let i = 3; i < R; i++) {
              const px = Math.round(x + Math.cos(ang) * i * s), py = Math.round(y + Math.sin(ang) * i * s);
              ctx.fillStyle = '#0c0c0e'; ctx.fillRect(px - 1, py - 1, 3, 3);
            }
            for (let i = 3; i < R; i++) {
              const px = Math.round(x + Math.cos(ang) * i * s), py = Math.round(y + Math.sin(ang) * i * s);
              ctx.fillStyle = i > R - 3 ? '#ffd040' : '#5c6470'; ctx.fillRect(px, py, 1, 1);
            }
          }
        }
        ctx.fillStyle = '#101010'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = '#9aa2ae'; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      function drawRotorSmall(ctx, x, y, R, t) {
        ctx.fillStyle = '#c0c4cc';
        if ((t >> 1) & 1) ctx.fillRect(x - R + 2, y, R * 2 - 4, 1); else ctx.fillRect(x + 2, y - R + 2, 1, R * 2 - 4);
      }
      function drawBoss(ctx, cy) {
        const B = boss; if (!B) return;
        const x = Math.round(B.x), y = Math.round(B.y) - cy;
        const shk = B.dying ? ri(3) - 1 : 0;
        const pt = n => B.parts.find(p => p.name === n);
        if (B.type === 'tank' || B.type === 'tank2') {
          const img = SP.bossTank[B.type === 'tank' ? 0 : 1][((B.tf / 2) | 0) & 1];
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 44, y + 32, 96, 5);
          ctx.drawImage(img, x - 47 + shk, y - 34);
          const core = pt('core');
          // twin cannons with recoil
          const rc = core.recoil > 0 ? Math.round(core.recoil / 3) : 0;
          for (const o of [-7, 3]) {
            ctx.fillStyle = '#0a0a0e'; ctx.fillRect(x + o - 1, y + 11 - rc, 6, 26);
            ctx.fillStyle = '#5a6272'; ctx.fillRect(x + o, y + 12 - rc, 4, 24);
            ctx.fillStyle = '#8a94a6'; ctx.fillRect(x + o, y + 12 - rc, 1, 24);
            ctx.fillStyle = '#22262e'; ctx.fillRect(x + o + 3, y + 12 - rc, 1, 24);
            ctx.fillStyle = '#0a0a0e'; ctx.fillRect(x + o - 2, y + 30 - rc, 8, 7);
            ctx.fillStyle = '#3a404c'; ctx.fillRect(x + o - 1, y + 31 - rc, 6, 5);
            ctx.fillStyle = '#6a7282'; ctx.fillRect(x + o - 1, y + 31 - rc, 6, 1);
            ctx.fillStyle = '#000000'; ctx.fillRect(x + o + 1, y + 35 - rc, 2, 1);
          }
          if (!core.dead && core.flash > 0) lighten(ctx, img, x - 47, y - 34);
          if (core.dead) { ctx.drawImage(SP.scorch[0], x - 13, y - 15); }
          for (const n of ['tl', 'tr']) {
            const p = pt(n); const px = x + p.dx, py = y + p.dy;
            if (p.dead) { ctx.drawImage(SP.scorch[1], px - 13, py - 9); continue; }
            const t = SP.bossTurret[p.ang]; ctx.drawImage(t, px - (t.width >> 1), py - (t.height >> 1));
            if (p.flash > 0) lighten(ctx, t, px - (t.width >> 1), py - (t.height >> 1));
          }
        } else if (B.type === 'gunship') {
          ctx.globalAlpha = 0.3; ctx.drawImage(SP.gunship, x - 42 + 20, y - 46 + 50); ctx.globalAlpha = 1;
          ctx.drawImage(SP.gunship, x - 42 + shk, y - 46);
          const core = pt('core'); if (core.flash > 0) lighten(ctx, SP.gunship, x - 42, y - 46);
          for (const n of ['pl', 'pr']) { const p = pt(n); if (p.dead) continue; ctx.drawImage(SP.pod, x + p.dx - 8, y + p.dy - 11); if (p.flash > 0) lighten(ctx, SP.pod, x + p.dx - 8, y + p.dy - 11); }
          drawRotor(ctx, x, y - 4, 42, B.t * 0.6);
          drawRotorSmall(ctx, x, y - 41, 9, B.t);
        } else {
          ctx.drawImage(SP.fortress, 0, y - 42);
          const core = pt('core');
          if (!core.dead) { const e = SP.eye[(B.t >> 3) % 3]; ctx.drawImage(e, x - 12, y - 2 - 12); if (core.flash > 0) lighten(ctx, e, x - 12, y - 14); }
          else ctx.drawImage(SP.scorch[0], x - 13, y - 11);
          for (const n of ['tl', 'tr']) {
            const p = pt(n), px = x + p.dx, py = y + p.dy;
            if (p.dead) { ctx.drawImage(SP.scorch[1], px - 13, py - 9); continue; }
            const t = SP.bossTurret[p.ang]; ctx.drawImage(t, px - (t.width >> 1), py - (t.height >> 1));
            if (p.flash > 0) lighten(ctx, t, px - (t.width >> 1), py - (t.height >> 1));
          }
        }
        // boss health bar
        if (!B.dying && warnT < 60) {
          let hp = 0, mx = 0; for (const p of B.parts) { hp += Math.max(0, p.hp); mx += p.max; }
          ctx.fillStyle = '#000000'; ctx.fillRect(59, 13, 122, 5);
          ctx.fillStyle = '#5a1010'; ctx.fillRect(60, 14, 120, 3);
          ctx.fillStyle = '#ff3a28'; ctx.fillRect(60, 14, Math.round(120 * hp / mx), 3);
          ctx.fillStyle = '#ffb090'; ctx.fillRect(60, 14, Math.round(120 * hp / mx), 1);
        }
      }
      function drawHUD(ctx) {
        shText(ctx, '1UP', 6, 3, '#ff4040');
        shText(ctx, String(score), 78, 3, '#ffffff', 1, 'right');
        shText(ctx, 'HI', 98, 3, '#ffcc00');
        shText(ctx, String(hi), 166, 3, '#ffffff', 1, 'right');
        shText(ctx, 'STAGE ' + (stageNo + 1), 234, 3, '#80d0ff', 1, 'right');
        // bottom panel
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 240, W, 16);
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 240, W, 1);
        for (let i = 0; i < Math.min(lives - 1, 4); i++) ctx.drawImage(SP.life, 3 + i * 11, 245);
        ctx.drawImage(SP.key, 50, 245);
        drawText(ctx, 'x' + keys, 64, 245, '#ffe060');
        if (hbT > 0) {
          const cols = ['#ffffff', '#40d8ff', '#a040ff', '#ffcc00'];
          drawText(ctx, 'HEAVY BARREL', 82, 243, cols[(api.frame >> 2) & 3]);
          ctx.fillStyle = '#202040'; ctx.fillRect(82, 251, 70, 3);
          ctx.fillStyle = hbT < 240 && (api.frame & 8) ? '#ff4040' : '#40d8ff'; ctx.fillRect(82, 251, Math.round(70 * hbT / 1200), 3);
        } else {
          const NAMES = { normal: 'GUN', mg: 'MACHINE GUN', flame: 'FLAME', '3way': '3-WAY', rocket: 'ROCKET' };
          drawText(ctx, NAMES[weapon], 82, 243, weapon === 'normal' ? '#a0a0a0' : '#ffffff');
          if (weapon !== 'normal') { ctx.fillStyle = '#303030'; ctx.fillRect(82, 251, 60, 3); ctx.fillStyle = '#ffa020'; const mxA = { mg: 300, flame: 260, '3way': 160, rocket: 60 }[weapon]; ctx.fillRect(82, 251, Math.round(60 * ammo / mxA), 3); }
        }
        // Heavy Barrel pieces
        ctx.drawImage(SP.hbSil, 188, 241);
        const n = hbT > 0 ? 6 : pieces;
        for (let i = 0; i < n; i++) { const [sx, sw] = SP.hbSlice(i); ctx.drawImage(SP.hb, sx, 0, sw, 14, 188 + sx, 241, sw, 14); }
      }
      function drawLogo(ctx, y) {
        const steel = r => ['#ffffff', '#e8eef8', '#c0cce0', '#8898b8', '#ffd040', '#ff9a20', '#d04010'][r];
        for (const [line, ly] of [['HEAVY', y], ['BARREL', y + 34]]) {
          for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 2], [3, 3], [1, 3], [3, 1]]) drawText(ctx, line, W / 2 + ox, ly + oy, ox > 1 || oy > 1 ? '#7a0a0a' : '#000000', 4, 'center');
          drawText(ctx, line, W / 2, ly, steel, 4, 'center');
        }
      }
      function renderTitle(ctx) {
        drawMapView(ctx, titleMD, titleCam, api.frame);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        shText(ctx, '1UP', 6, 3, '#ff4040'); shText(ctx, String(score), 78, 3, '#ffffff', 1, 'right');
        shText(ctx, 'HI', 98, 3, '#ffcc00'); shText(ctx, String(hi), 166, 3, '#ffffff', 1, 'right');
        const page = coinHold > 0 || coinFlash > 0 ? 0 : Math.floor(stT / 540) % 2;
        if (page === 0) {
          drawLogo(ctx, 26);
          const gy = 102, glow = (api.frame >> 3) & 1;
          ctx.globalAlpha = 0.5; ctx.drawImage(SP.hbSil, 0, 0, 50, 14, 49, gy + 4, 150, 42); ctx.globalAlpha = 1;
          if (glow) { ctx.fillStyle = '#ffffff'; ctx.fillRect(190, gy + 6, 2, 2); ctx.fillRect(186, gy + 7, 10, 1); ctx.fillRect(190, gy + 3, 1, 8); }
          ctx.drawImage(SP.hb, 0, 0, 50, 14, 45, gy, 150, 42);
          const cr = api.credits;
          if (cr > 0) { if (coinHold > 0 || ((api.frame >> 5) & 1)) shText(ctx, 'PUSH START', W / 2, 168, '#ffffff', 1, 'center'); }
          else if (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : ((api.frame >> 5) & 1)) shText(ctx, 'INSERT COIN', W / 2, 168, coinFlash > 0 ? '#ff4040' : '#ffffff', 1, 'center');
          shText(ctx, 'SPACE FIRE   X GRENADE', W / 2, 186, '#80d0ff', 1, 'center');
          shText(ctx, '(C) 1987 DATA EAST', W / 2, 212, '#ffcc00', 1, 'center');
        } else {
          shText(ctx, 'HOW TO GET THE', W / 2, 22, '#ffcc00', 1, 'center');
          shText(ctx, 'HEAVY BARREL', W / 2, 32, '#ffffff', 2, 'center');
          ctx.drawImage(SP.key, 30, 60); shText(ctx, 'ENEMIES DROP KEYS', 50, 60, '#ffffff');
          ctx.drawImage(SP.crate, 28, 78); shText(ctx, 'KEYS OPEN CRATES', 50, 82, '#ffffff');
          const ws = [['mg', 'MACHINE GUN'], ['flame', 'FLAME'], ['3way', '3-WAY'], ['rocket', 'ROCKET']];
          ws.forEach(([k, n], i) => { const x = 24 + (i % 2) * 104, y = 106 + ((i / 2) | 0) * 20; ctx.drawImage(SP.plate[k][(api.frame >> 4) & 1], x, y); ctx.drawImage(SP.pict[k], x + 2, y + 3); shText(ctx, n, x + 22, y + 4, '#ffcc80'); });
          shText(ctx, 'FIND 6 PIECES', W / 2, 152, '#ffffff', 1, 'center');
          const lit = Math.min(6, ((stT % 540) / 50) | 0);
          ctx.drawImage(SP.hbSil, 0, 0, 50, 14, 45, 166, 150, 42);
          for (let i = 0; i < lit; i++) { const [sx, sw] = SP.hbSlice(i); ctx.drawImage(SP.hb, sx, 0, sw, 14, 45 + sx * 3, 166, sw * 3, 42); }
          if (lit >= 6 && (api.frame & 8)) shText(ctx, 'SUPER WEAPON!', W / 2, 214, '#40d8ff', 1, 'center');
        }
        shText(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 240, '#ffffff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        ctx.save();
        if (shake > 0) ctx.translate(ri(3) - 1, ri(3) - 1);
        drawWorld(ctx);
        ctx.restore();
        if (flashT > 0 && (flashT & 1)) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(0, 0, W, H); }
        drawHUD(ctx);
        if (introT > 0 && state === 'play') {
          shText(ctx, 'STAGE ' + (stageNo + 1), W / 2, 92, '#ffcc00', 2, 'center');
          shText(ctx, STAGES[stageNo].name, W / 2, 112, '#ffffff', 1, 'center');
        }
        if (warnT > 0 && (warnT & 16)) { shText(ctx, 'WARNING', W / 2, 100, '#ff3030', 3, 'center'); }
        if (assembleT > 0) {
          const s = assembleT > 120 ? (150 - assembleT) / 30 : 1;
          ctx.globalAlpha = 0.55; ctx.fillStyle = '#000020'; ctx.fillRect(0, 74, W, 70); ctx.globalAlpha = 1;
          const w = Math.round(150 * s), h = Math.round(42 * s);
          ctx.drawImage(SP.hb, 0, 0, 50, 14, W / 2 - w / 2, 82, w, h);
          if (api.frame & 4) shText(ctx, 'HEAVY BARREL', W / 2, 128, '#40d8ff', 1, 'center'); else shText(ctx, 'HEAVY BARREL', W / 2, 128, '#ffffff', 1, 'center');
        }
        if (nokeyT > 0 && (api.frame & 8)) shText(ctx, 'NEED A KEY', W / 2, 226, '#ffe060', 1, 'center');
        if (state === 'clear' && clearT > 60) {
          shText(ctx, 'STAGE ' + (stageNo + 1) + ' CLEAR', W / 2, 96, '#ffcc00', 2, 'center');
          if (clearT > 200) shText(ctx, 'BONUS ' + 5000 * (stageNo + 1), W / 2, 120, '#ffffff', 1, 'center');
        }
        if (state === 'over') shText(ctx, 'GAME OVER', W / 2, 110, '#ff3030', 2, 'center');
      }
      function debug(cmd) {
        if (state === 'title') startGame();
        if (cmd === 'hb') { introT = 0; pieces = 5; items.push({ type: 'piece', x: P.x, y: P.y - 20, t: 0, delay: 0 }); }
        if (cmd === 'boss') { camY = 0; P.y = 200; introT = 0; }
        if (cmd === 'stage') { loadStage((stageNo + 1) % 4); }
        if (cmd === 'inv') god = true;
        if (cmd.startsWith('w:')) { weapon = cmd.slice(2); ammo = 150; }
        if (cmd === 'keys') keys = 5;
        if (cmd === 'die') { god = false; P.inv = 0; hurtPlayer(); }
      }
      return { update, render, _debug: debug };
    }
  });
})();
