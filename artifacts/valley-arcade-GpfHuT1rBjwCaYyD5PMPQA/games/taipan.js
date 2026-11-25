// Taipan! (Mega-Micro Computers, 1982) — faithful recreation of Art Canfil's China-trade game
// for Arcade Games Galore. Green-phosphor 40x24 terminal look, plus a harbour, a sea chart and
// pixel-art sea battles. Mechanics follow the classic Apple II / TRS-80 program.
(function () {
  // ---------------- 5x7 bitmap font (Apple II style, upper case) ----------------
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  Object.assign(FONT, {
    '$': [0x04, 0x0F, 0x14, 0x0E, 0x05, 0x1E, 0x04],
    '&': [0x0C, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0D],
    ';': [0x00, 0x0C, 0x0C, 0x00, 0x0C, 0x04, 0x08],
    '|': [4, 4, 4, 4, 4, 4, 4],
    '[': [0x0E, 8, 8, 8, 8, 8, 0x0E], ']': [0x0E, 2, 2, 2, 2, 2, 0x0E],
    '\x18': [0x04, 0x0E, 0x15, 0x04, 0x04, 0x04, 0x04],   // up arrow
    '\x19': [0x04, 0x04, 0x04, 0x04, 0x15, 0x0E, 0x04],   // down arrow
    '\x1a': [0x00, 0x04, 0x02, 0x1F, 0x02, 0x04, 0x00],   // right arrow
    '\x1b': [0x00, 0x04, 0x08, 0x1F, 0x08, 0x04, 0x00],   // left arrow
    '\x7f': [0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F]    // block cursor
  });
  // tiny 3x5 font for the sea chart labels
  const MINI = {};
  'A2575 B6565 C3443 D6556 E7464 F7464 G3455 H5575 I7227 J1115 K5565 L4447 M5775 N6555 O2552 P6564 Q2556 R6565 S3421 T7222 U5555 V5522 W5577 X5255 Y5522 Z7124'
    .split(' ').forEach(e => { MINI[e[0]] = e.slice(1).split('').map(Number); });
  // last rows (tail digits) for the 3x5 glyphs
  const MINI5 = { A: 5, B: 6, C: 3, D: 6, E: 7, F: 4, G: 3, H: 5, I: 7, J: 2, K: 5, L: 7, M: 5, N: 5, O: 2, P: 4, Q: 3, R: 5, S: 6, T: 2, U: 3, V: 2, W: 5, X: 5, Y: 2, Z: 7 };

  // ---------------- palette: P31-ish green phosphor ----------------
  const BG = '#010a04', C0 = '#d2ffe0', C1 = '#39ff7a', C2 = '#25c45a', C3 = '#178a3f', C4 = '#0e5528', C5 = '#082f17', C6 = '#04190b';

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  const glyphCache = {};
  function glyph(ch, col) {
    const k = col + ch; let g = glyphCache[k];
    if (g === undefined) {
      const bits = FONT[ch];
      if (!bits) { glyphCache[k] = null; return null; }
      const [c, x] = mk(5, 7); x.fillStyle = col;
      for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if ((bits[r] >> (4 - b)) & 1) x.fillRect(b, r, 1, 1);
      g = glyphCache[k] = c;
    }
    return g;
  }
  const vlen = s => String(s).replace(/[{}]/g, '').length;
  // text(ctx, str, x, y, colour, {scale, adv, center, right, bold, inv, ink})  — '{..}' = inverse video
  function tx(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold ? 1 : 0;
    s = String(s).toUpperCase();
    const wpx = vlen(s) * adv - (adv - (5 + bw) * sc);
    if (o.center) x = Math.round(x - wpx / 2);
    if (o.right) x = Math.round(x - wpx);
    let inv = !!o.inv;
    for (const ch of s) {
      if (ch === '{') { inv = true; continue; }
      if (ch === '}') { inv = !!o.inv; continue; }
      if (inv) { ctx.fillStyle = col; ctx.fillRect(x - sc, y - sc, adv, 9 * sc); }
      const g = glyph(ch, inv ? (o.ink || BG) : col);
      if (g) { ctx.drawImage(g, x, y, 5 * sc, 7 * sc); if (bw) ctx.drawImage(g, x + sc, y, 5 * sc, 7 * sc); }
      x += adv;
    }
  }
  function mini(ctx, s, x, y, col) {
    ctx.fillStyle = col;
    for (const ch of String(s).toUpperCase()) {
      const g = MINI[ch];
      if (g) { const rows = [g[0], g[1], g[2], g[3], MINI5[ch]]; for (let r = 0; r < 5; r++) for (let b = 0; b < 3; b++) if ((rows[r] >> (2 - b)) & 1) ctx.fillRect(x + b, y + r, 1, 1); }
      x += 4;
    }
  }
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length)); const [c, x] = mk(w, rows.length);
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function flip(src) { const [c, x] = mk(src.width, src.height); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
  function silhouette(src, col) { const [c, x] = mk(src.width, src.height); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; }
  function disc(ctx, cx, cy, r) {
    cx = Math.round(cx); cy = Math.round(cy); const R = Math.round(r);
    for (let dy = -R; dy <= R; dy++) { const q = r * r - dy * dy; if (q < 0.5) continue; const hw = Math.floor(Math.sqrt(q)); ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
  }

  // ---------------- procedural pixel-art lorcha (European hull, junk rig), bow to the LEFT ----------------
  function buildShip(w, h, o) {
    o = o || {};
    const dmg = o.dmg || 0;
    const [c, x] = mk(w, h);
    const put = (X, Y, ww, hh, col) => { x.fillStyle = col; x.fillRect(X, Y, ww, hh); };
    const L = v => Math.round(v * (w - 1)), T = v => Math.round(v * (h - 1));
    let seed = w * 7 + h * 13 + dmg * 101 + (o.seed || 0);
    const rr = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const deck = T(0.74), keel = T(0.97), x0 = L(0.03), x1 = L(0.95);
    const topAt = X => { const t = (X - x0) / (x1 - x0); return deck - Math.round(h * 0.12 * Math.pow(1 - t, 2.5) + h * 0.07 * Math.pow(t, 8)); };
    const masts = [
      { mx: 0.29, top: 0.20, sl: 0.17, sr: 0.42, st: 0.24, sb: 0.67 },
      { mx: 0.53, top: 0.02, sl: 0.42, sr: 0.71, st: 0.07, sb: 0.69 },
      { mx: 0.81, top: 0.32, sl: 0.73, sr: 0.94, st: 0.36, sb: 0.66 }
    ];
    masts.forEach((m, mi) => {
      const broken = dmg >= 2 && mi === 2;
      const mx = L(m.mx);
      if (!broken) {
        const y0 = T(m.st), y1 = T(m.sb);
        for (let Y = y0; Y <= y1; Y++) {
          const f = (Y - y0) / Math.max(1, y1 - y0);
          const R = L(m.sr - 0.02 + 0.03 * f) + Math.round(Math.sin(f * Math.PI) * w * 0.02);
          let Lx = L(m.sl + 0.05 - 0.05 * f);
          if (f < 0.18) Lx = Math.max(Lx, Math.round(R - (R - Lx) * (0.25 + f / 0.18 * 0.75)));
          put(Lx, Y, R - Lx + 1, 1, C4);
          const batten = (Y - y0) % 4 === 0 || Y === y1;
          if (batten) put(Lx, Y, R - Lx + 1, 1, (Y === y0 || Y === y1) ? C1 : C2);
          put(Lx, Y, 1, 1, C1); put(R, Y, 1, 1, C1);
          if (!batten && ((Y + Lx) & 1) === 0) put(Math.round((Lx + R) / 2), Y, 1, 1, C3);
        }
        if (dmg >= 1) { // shot holes in the sail
          for (let k = 0; k < dmg * 3; k++) {
            const hx = L(m.sl + 0.04 + rr() * (m.sr - m.sl - 0.08)), hy = T(m.st + 0.08 + rr() * (m.sb - m.st - 0.16));
            x.clearRect(hx, hy, 1 + (rr() < 0.5 ? 1 : 0), 1 + (rr() < 0.4 ? 1 : 0));
          }
          if (dmg >= 2 && mi === 1) { // torn main sail
            for (let Y = T(m.st + 0.15); Y < T(m.sb - 0.05); Y++) x.clearRect(L(m.sr - 0.06) - Math.round((Y - T(m.st)) * 0.35), Y, 2, 1);
          }
        }
        put(mx, T(m.top), 1, deck - T(m.top), C2);
        if (mi === 1) { // ensign at the main truck
          const fy = T(m.top);
          if (o.banner) { put(mx + 1, fy, 5, 4, C1); put(mx + 2, fy + 1, 3, 2, C5); }
          else { put(mx + 1, fy, 5, 1, C1); put(mx + 1, fy + 1, 3, 1, C1); put(mx + 1, fy + 2, 1, 1, C1); }
        }
      } else { put(mx, deck - T(0.12), 1, T(0.12), C2); put(mx - 1, deck - T(0.12), 3, 1, C3); }
    });
    // hull
    for (let X = x0; X <= x1; X++) {
      const t = (X - x0) / (x1 - x0), top = topAt(X);
      const rake = t < 0.24 ? Math.pow((0.24 - t) / 0.24, 1.15) : 0;
      const bot = Math.round(keel - (keel - top - 1) * rake * 0.95);
      put(X, top, 1, Math.max(1, bot - top + 1), '#0a3a1b');
      put(X, top, 1, 1, C1);
      const wale = top + Math.max(2, Math.round((bot - top) * 0.42));
      if (wale < bot) put(X, wale, 1, 1, C3);
      put(X, bot, 1, 1, C2);
      if (X === x0 || X === x1) put(X, top, 1, bot - top + 1, C1);
    }
    // stern cabin
    const cx0 = L(0.78), cx1 = L(0.93), ctop = topAt(cx1) - Math.max(2, T(0.08));
    put(cx0, ctop, cx1 - cx0 + 1, topAt(cx0) - ctop, '#0a3a1b'); put(cx0, ctop, cx1 - cx0 + 1, 1, C1); put(cx0, ctop, 1, topAt(cx0) - ctop, C2);
    for (let X = cx0 + 2; X < cx1 - 1; X += 3) put(X, ctop + 2, 1, 1, C1);
    // bowsprit + stay
    const by = topAt(x0); for (let k = 1; k <= Math.max(3, L(0.07)); k++) put(x0 - k, by - Math.floor(k / 2), 1, 1, C2);
    // gun ports
    const step = Math.max(5, L(0.11));
    for (let X = L(0.2); X < L(0.75); X += step) { const gy = topAt(X) + 2; put(X, gy, 2, 2, '#000'); put(X, gy - 1, 2, 1, C2); }
    if (dmg >= 2) { for (let k = 0; k < 4; k++) { const hx = L(0.2 + rr() * 0.6); x.clearRect(hx, topAt(hx), 2, 1 + (rr() < 0.5 ? 1 : 0)); } }
    return c;
  }

  // ---------------- small icons for the report header ----------------
  const ICONS = {
    lantern: spr(['...B...', '..AAA..', '.AABAA.', 'AABBBAA', 'AABBBAA', 'AABBBAA', '.AABAA.', '..AAA..', '...A...', '..A.A..'], { A: C2, B: C1 }),
    anchor: spr(['..AAA..', '..A.A..', '..AAA..', 'AAAAAAA', '...A...', '...A...', 'A..A..A', '.A.A.A.', '..AAA..'], { A: C1 }),
    coins: spr(['.AAAAA.', 'ABBBBBA', '.AAAAA.', 'ABBBBBA', '.AAAAA.', 'ABBBBBA', '.AAAAA.', 'ABBBBBA', '.AAAAA.'], { A: C1, B: C3 }),
    flag: spr(['AAAAAAA', 'ABBBBBA', 'AB.B.BA', 'ABBBBBA', 'AB...BA', 'AAAAAAA', 'A......', 'A......', 'A......'], { A: C1, B: C2 }),
    abacus: spr(['AAAAAAAAA', 'A.B..B..A', 'AAAAAAAAA', 'AB..B.B.A', 'A.B..B.BA', 'AB.B..B.A', 'AAAAAAAAA'], { A: C2, B: C1 })
  };

  // ---------------- game data ----------------
  const GOODS = ['Opium', 'Silk', 'Arms', 'General'];
  const GOODS_LONG = ['Opium', 'Silk', 'Arms', 'General Cargo'];
  const PORTS = ['Hong Kong', 'Shanghai', 'Nagasaki', 'Saigon', 'Manila', 'Singapore', 'Batavia'];
  const BASE = [[1000, 11, 16, 15, 14, 12, 10, 13], [100, 11, 14, 15, 16, 10, 13, 12], [10, 12, 16, 10, 11, 13, 14, 15], [1, 10, 11, 12, 13, 14, 15, 16]];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const STATUS = ['Critical', 'Poor', 'Fair', 'Good', 'Prime', 'Perfect'];
  const RATINGS = [['Ma Tsu', '50,000 and over'], ['Master Taipan', ' 8,000 to 49,999'], ['Taipan', ' 1,000 to  7,999'], ['Compradore', '   500 to    999'], ['Galley Hand', '   less than 500']];
  const DEFAULT_FIRM = 'Golden Dragon Trading';

  // ---------------- sea chart (lon/lat polygons) ----------------
  const MW = 176, MH = 208, MS = 4.4;
  const mp = (lon, lat) => [(lon - 98) * MS, (36 - lat) * MS];
  const LAND = [
    [[97, 40], [122, 40], [122.6, 37.3], [120.3, 36], [119.3, 35], [120.3, 34.2], [120.9, 32.6], [121.9, 31.7], [121.2, 30.8], [122, 30], [121.5, 28.4], [120.6, 27.3], [119.6, 26], [119, 25.2], [117.9, 24.3], [116.5, 23], [114.6, 22.4], [114, 22.2], [113.5, 22.2], [112, 21.7], [110.5, 21.2], [110.2, 20.3], [109.7, 21], [108.6, 21.6], [107.4, 21.3], [106.6, 20.4], [105.8, 19.2], [106.6, 17.6], [107.6, 16.4], [108.8, 15.2], [109.3, 13.3], [109.2, 11.6], [108.2, 10.9], [106.8, 10.3], [105.3, 8.8], [104.8, 8.6], [104.9, 10.2], [103.6, 10.6], [102.6, 12.1], [100.9, 13.4], [100, 13.3], [99.9, 12], [99.2, 10.4], [99.9, 8.6], [100.4, 7.2], [101.3, 6.8], [102.3, 6.2], [103.3, 5], [103.5, 3.8], [103.4, 2.4], [104.2, 1.5], [103.5, 1.3], [102.2, 2.2], [101.3, 2.9], [100.4, 4.6], [100.1, 6.4], [98.3, 8.2], [98.5, 10.4], [98.4, 12.9], [97.7, 15.9], [97, 17], [94, 17], [94, 40]],
    [[108.6, 19.2], [109.2, 20], [110.6, 20.1], [111.1, 19.6], [110.5, 18.6], [109.6, 18.2], [108.7, 18.5]],
    [[120.1, 23], [120.7, 24.6], [121.5, 25.3], [121.9, 25], [121.5, 23.6], [121, 22.3], [120.8, 21.9], [120.3, 22.5]],
    [[124.7, 40], [130, 40], [129.4, 37], [129.4, 35.5], [129, 35.1], [127.6, 34.6], [126.4, 34.4], [126.3, 35.2], [126.8, 36], [126.5, 37], [125, 38]],
    [[130.9, 34], [131.5, 34.6], [132.5, 35.5], [133.5, 35.5], [135.2, 35.7], [136, 36.5], [140, 36.5], [140, 34.5], [137, 34.6], [135.8, 33.5], [135.1, 34.6], [133.6, 34.4], [132.2, 33.9]],
    [[129.6, 33.4], [130.4, 33.9], [131, 33.9], [131.9, 33.3], [131.6, 32.3], [131.3, 31.4], [130.6, 31.0], [130.2, 31.4], [130.3, 32.2], [129.8, 32.6], [129.6, 33.0]],
    [[132.5, 33.4], [132.8, 34], [134.1, 34.4], [134.7, 34.1], [134.6, 33.7], [133.7, 33.4], [133, 32.8]],
    [[120.6, 18.5], [121.4, 18.6], [122.2, 18.5], [122.5, 17.3], [122.2, 16.3], [121.6, 15.8], [121.6, 14.4], [122.2, 14.1], [123.3, 13.8], [124.1, 12.6], [123.5, 12.8], [122.6, 13.4], [121.8, 13.9], [120.9, 13.8], [120.6, 14.4], [120.9, 14.7], [120.3, 14.8], [119.9, 15.7], [120.3, 16.4], [120.4, 17.7]],
    [[120.4, 13.5], [121.2, 13.4], [121.5, 12.5], [121, 12.2], [120.4, 12.6]],
    [[122, 11.9], [123, 11.6], [124.4, 12.5], [125.6, 11.3], [125.1, 10.2], [124, 9.9], [123.1, 9.2], [122.4, 9.9], [121.9, 10.6]],
    [[122, 6.9], [122.4, 8], [123.6, 8.6], [124.6, 8.9], [125.5, 9.8], [126.5, 9.2], [126.6, 7.2], [126, 6.2], [125.4, 5.6], [124.2, 6.2], [123.9, 7.5], [122.8, 7.4]],
    [[117.2, 8.3], [118.5, 9.5], [119.6, 11.3], [119.8, 10.9], [118.7, 9.3], [117.6, 8.2]],
    [[109, 1.8], [109.6, 2], [111, 2.6], [113, 3.3], [114, 4.5], [115.4, 5.4], [116.7, 7], [117.7, 6.4], [119.2, 5.2], [118.2, 4.4], [117.6, 3.4], [118, 2.3], [118.9, 1], [117.9, 0.8], [117.5, -0.5], [116.6, -1.5], [116.3, -3.8], [114.6, -4.1], [113, -3.2], [111.6, -3.4], [110.2, -2.9], [110, -1.5], [109.2, -0.4], [108.9, 0.8]],
    [[95.3, 5.6], [97.5, 5.2], [98.8, 3.6], [100.4, 2.1], [101.5, 1.6], [103.4, -0.5], [104.4, -1.5], [105.9, -3.2], [105.8, -5.8], [104.6, -5.9], [103.4, -4.8], [102.3, -4], [101, -2.3], [100.3, -0.9], [99.1, 0.4], [98.6, 1.7], [97.3, 2.8], [96.1, 4.1], [95.2, 5.1]],
    [[105.2, -1.7], [106.2, -1.6], [106.8, -3], [105.8, -2.8]],
    [[107.6, -2.6], [108.3, -2.7], [108.2, -3.3], [107.6, -3.2]],
    [[105.2, -6.8], [106.1, -5.9], [107, -5.95], [108.3, -6.3], [110.4, -6.9], [111.5, -6.6], [112.7, -6.9], [114.6, -7.7], [114.4, -8.7], [112, -8.3], [110, -8.1], [108, -7.8], [106.4, -7.4], [105.5, -6.9]],
    [[114.5, -8.1], [115.7, -8.4], [116.8, -8.3], [119, -8.2], [119, -8.9], [116.4, -8.9], [115.2, -8.8]],
    [[118.8, -2.6], [119.5, -5.5], [120.4, -5.6], [120.4, -2.8], [121.2, -2.8], [122.4, -4.8], [123.2, -4.5], [121.6, -1.9], [121.8, -0.9], [123.3, -0.9], [122.5, 0.5], [124.9, 1.6], [124.2, 0.4], [120.9, 1.3], [120.1, 0.6], [119.8, -0.2], [119.4, -1.4]]
  ];
  // sea-lane graph: 0..6 ports, then waypoints
  const NODES = [[114.2, 22.0], [121.9, 31.0], [129.6, 32.7], [107.0, 10.0], [120.6, 14.5], [104.1, 1.1], [106.8, -5.8],
    [116.5, 22.3], [119.8, 24.5], [122.6, 26.5], [113, 12], [119.4, 14.4], [105.4, 2.6], [108.7, -2.3]].map(p => mp(p[0], p[1]));
  const EDGES = [[0, 7], [7, 8], [8, 9], [9, 1], [9, 2], [1, 2], [0, 10], [0, 11], [10, 3], [10, 11], [11, 4], [10, 12], [3, 12], [12, 5], [12, 13], [13, 6]];
  const LABELS = [[77, 58, 'HONG KONG'], [68, 19, 'SHANGHAI'], [126, 21, 'NAGASAKI'], [45, 113, 'SAIGON'], [78, 92, 'MANILA'], [2, 158, 'SINGAPORE'], [22, 190, 'BATAVIA']];
  function routePts(fromPt, fromNode, to) {
    const n = NODES.length, dist = new Array(n).fill(1e9), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    dist[fromNode] = 0;
    for (let it = 0; it < n; it++) {
      let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] >= 1e9) break; done[u] = true;
      for (const [a, b] of EDGES) {
        const v = a === u ? b : b === u ? a : -1; if (v < 0) continue;
        const d = dist[u] + Math.hypot(NODES[u][0] - NODES[v][0], NODES[u][1] - NODES[v][1]);
        if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      }
    }
    const pts = []; for (let v = to; v >= 0; v = prev[v]) pts.unshift(NODES[v].slice());
    if (fromPt) pts.unshift(fromPt.slice());
    return pts;
  }
  function polyAt(pts, f) {
    let tot = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let want = Math.max(0, Math.min(1, f)) * tot;
    for (let i = 0; i < seg.length; i++) {
      if (want <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, want / seg[i]) : 1; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, Math.sign(pts[i + 1][0] - pts[i][0]) || 1]; }
      want -= seg[i];
    }
    return [pts[0][0], pts[0][1], 1];
  }
  function buildMap() {
    const [c, x] = mk(MW, MH);
    const land = new Uint8Array(MW * MH);
    for (const poly of LAND) {
      const pts = poly.map(p => mp(p[0], p[1]));
      let minY = 1e9, maxY = -1e9; for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
      for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(MH - 1, Math.ceil(maxY)); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let X = Math.max(0, Math.round(xs[k])); X <= Math.min(MW - 1, Math.round(xs[k + 1]) - 1); X++) land[y * MW + X] = 1;
      }
    }
    // graticule every 10 degrees on the sea
    for (let y = 0; y < MH; y++) for (let X = 0; X < MW; X++) {
      const i = y * MW + X;
      if (land[i]) {
        const edge = X === 0 || y === 0 || X === MW - 1 || y === MH - 1 ? false : (!land[i - 1] || !land[i + 1] || !land[i - MW] || !land[i + MW]);
        x.fillStyle = edge ? C2 : ((X + y) & 1 ? '#0b3f1d' : '#062712'); x.fillRect(X, y, 1, 1);
      }
    }
    x.fillStyle = C5;
    for (let lon = 100; lon <= 135; lon += 10) { const X = Math.round(mp(lon, 0)[0]); for (let y = 0; y < MH; y += 3) if (!land[y * MW + X]) x.fillRect(X, y, 1, 1); }
    for (let lat = 30; lat >= -10; lat -= 10) { const y = Math.round(mp(100, lat)[1]); for (let X = 0; X < MW; X += 3) if (y >= 0 && y < MH && !land[y * MW + X]) x.fillRect(X, y, 1, 1); }
    mini(x, 'CHINA', 30, 40, C3); mini(x, 'SOUTH CHINA', 56, 120, C4); mini(x, 'SEA', 76, 127, C4);
    mini(x, 'BORNEO', 106, 160, C3); mini(x, 'SUMATRA', 6, 176, C3); mini(x, 'JAVA', 72, 198, C3);
    mini(x, 'LUZON', 130, 75, C3); mini(x, 'JAPAN', 150, 4, C3); mini(x, 'FORMOSA', 125, 58, C3);
    return c;
  }

  ArcadeRegistry.register({
    id: 'taipan',
    title: 'Taipan!',
    year: 1982,
    maker: 'Mega-Micro Computers',
    width: 320, height: 240,
    vector: false,
    pointer: false,
    controls: 'Letters: menu (B S V T W Q R, Y/N, F/R/T) · ↑↓ amount, ←→ digit, A: all · Enter: OK · X: none',
    marquee: { bg: '#0b1d12', fg: '#39ff7a', accent: '#d4a017' },
    create(api) {
      const W = 320, H = 240;
      const au = api.audio;
      const DBG = (typeof window !== 'undefined' && window.__TAIPAN_TEST) || null;
      const rnd = n => (n > 0 ? Math.floor(Math.random() * n) : 0);
      const force = k => { if (DBG && DBG.force && DBG.force[k] > 0) { DBG.force[k]--; return true; } return false; };
      const chance = (n, k) => force(k) || rnd(n) === 0;

      // ---------- sprites ----------
      const SH = {
        enemy: [0, 1, 2].map(d => buildShip(48, 34, { dmg: d })),
        li: [0, 1, 2].map(d => buildShip(48, 34, { dmg: d, banner: true, seed: 3 })),
        player: [0, 1, 2].map(d => flip(buildShip(72, 50, { dmg: d, seed: 9 }))),
        small: flip(buildShip(48, 34, { seed: 5 })),
        tiny: buildShip(30, 22, { seed: 7 }),
        tinyR: flip(buildShip(26, 19, { seed: 11 }))
      };
      SH.enemyW = SH.enemy.map(s => silhouette(s, C0)); SH.liW = SH.li.map(s => silhouette(s, C0));
      const MAP = buildMap();
      const STARS = []; for (let i = 0; i < 70; i++) STARS.push([Math.floor(Math.random() * W), Math.floor(Math.random() * 110), Math.random() * 6.28, Math.random() < 0.15]);

      // ---------- sound ----------
      const sfx = {
        click() { au.tone(1900, 0.012, { type: 'square', vol: 0.05 }); },
        tick() { au.tone(2600, 0.008, { type: 'square', vol: 0.03 }); },
        bell() { au.tone(988, 0.2, { type: 'square', vol: 0.08 }); },
        alarm() { au.melody([[988, 0.09], [0, 0.04], [988, 0.09], [0, 0.04], [988, 0.09], [0, 0.04], [988, 0.2]], { type: 'square', vol: 0.07 }); },
        cannon() { au.noise(0.35, { freq: 1400, slideTo: 120, vol: 0.22 }); au.tone(110, 0.2, { type: 'sine', vol: 0.18, slideTo: 40 }); },
        boom() { au.noise(0.5, { freq: 800, slideTo: 60, vol: 0.26 }); },
        hit() { au.noise(0.7, { freq: 2600, slideTo: 90, vol: 0.34 }); au.tone(70, 0.4, { type: 'sawtooth', vol: 0.12, slideTo: 35 }); },
        sink() { au.tone(420, 1.3, { type: 'triangle', vol: 0.09, slideTo: 55 }); au.noise(1.3, { freq: 500, slideTo: 80, vol: 0.1 }); },
        cash() { au.melody([[1319, 0.05], [1760, 0.09]], { type: 'square', vol: 0.06 }); },
        coin() { au.tone(1175, 0.07, { type: 'square', vol: 0.07, slideTo: 1760 }); },
        buzz() { au.tone(98, 0.28, { type: 'square', vol: 0.14 }); au.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 }); },
        thunder() { au.noise(1.6, { freq: 380, slideTo: 40, vol: 0.32 }); },
        storm() { au.noise(3, { freq: 600, slideTo: 250, vol: 0.12 }); },
        splash() { au.noise(0.3, { freq: 3000, slideTo: 400, vol: 0.1, type: 'bandpass' }); },
        theme() { au.melody([[392, 0.16], [440, 0.16], [523, 0.16], [587, 0.32], [523, 0.16], [440, 0.16], [392, 0.48], [0, 0.1], [330, 0.16], [392, 0.16], [440, 0.32], [392, 0.16], [330, 0.16], [294, 0.48]], { type: 'triangle', vol: 0.09 }); },
        fanfare() { au.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3], [0, 0.06], [880, 0.12], [1047, 0.12], [1319, 0.5]], { type: 'square', vol: 0.08 }); },
        firework() { au.noise(0.6, { freq: 3000, slideTo: 200, vol: 0.12, delay: 0.05 }); }
      };

      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() { const c = api.credits; if (c === 0) coinOp = true; if (c > lastCred) sfx.coin(); lastCred = c; }
      function tryStart() { if (api.useCredit()) { lastCred = api.credits; return true; } coinFlash = 90; sfx.buzz(); return false; }

      // ---------- state ----------
      let hi = api.getHiScore(0);
      let mode = 'title', scr = 'title', frame = 0, titleT = 0, t = 0;
      let S = null, gen = null, cmd = null, cmdT = 0;
      const R = { head: "Comprador's Report", icon: null, lines: [], side: null, pick: null };
      let vo = null, B = null, FIN = null, RET = null;
      const fx = [];
      const addFx = f => { fx.push(f); if (fx.length > 500) { const i = fx.findIndex(q => q.k !== 'ball'); fx.splice(i < 0 ? 0 : i, 1); } };

      const months = () => (S.year - 1860) * 12 + S.month;
      const net = () => S.cash + S.bank - S.debt;
      const inUse = () => S.hkw[0] + S.hkw[1] + S.hkw[2] + S.hkw[3];
      const status = () => Math.max(0, Math.floor(100 - S.damage / S.capacity * 100));
      const statusName = () => STATUS[Math.min(5, Math.floor(status() / 20))];
      function big(n) {
        n = Math.floor(n); const a = Math.abs(n), s = n < 0 ? '-' : '';
        if (a >= 1e8) return s + Math.floor(a / 1e6) + ' Million';
        if (a >= 1e7) return s + (Math.floor(a / 1e5) / 10).toFixed(1) + ' Million';
        if (a >= 1e6) return s + (Math.floor(a / 1e4) / 100).toFixed(2) + ' Million';
        return String(n);
      }
      const commas = n => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      function wrap(text, w) {
        const out = [];
        for (const para of String(text).split('\n')) {
          let line = '';
          for (const word of para.split(' ')) {
            if (line && vlen(line) + 1 + vlen(word) > w) { out.push(line); line = word; }
            else line = line ? line + ' ' + word : word;
          }
          out.push(line);
        }
        return out;
      }
      function setPrices() { for (let i = 0; i < 4; i++) S.price[i] = Math.floor(BASE[i][S.port + 1] / 2) * (rnd(3) + 1) * BASE[i][0]; }
      function newState(firm, start) {
        S = {
          firm, cash: 0, bank: 0, debt: 0, capacity: 60, hold: 60, guns: 0, damage: 0, li: 0, bp: 10,
          hkw: [0, 0, 0, 0], cargo: [0, 0, 0, 0], price: [0, 0, 0, 0], port: 0, month: 1, year: 1860,
          ec: 20, ed: 0.5, wuWarn: 0, wuBail: 0
        };
        if (start === 1) { S.cash = 400; S.debt = 5000; S.capacity = 60; S.hold = 60; S.guns = 0; S.li = 0; S.bp = 10; }
        else { S.cash = 0; S.debt = 0; S.capacity = 60; S.hold = 10; S.guns = 5; S.li = 1; S.bp = 7; }
        setPrices();
      }

      // ---------- generator helpers ----------
      const width = () => (R.side ? 26 : 40);
      function* say(text, s, snd) { R.side = null; R.pick = null; R.lines = wrap(text, 40); if (snd) snd(); yield { t: 'msg', s: s == null ? 3 : s }; }
      function* ask(text, keys, pre) { R.side = null; R.pick = null; R.lines = (pre || []).concat(wrap(text, 40)); return yield { t: 'key', keys }; }
      function* yn(text, pre) { return (yield* ask(text + '  {Y}/{N}', ['Y', 'N'], pre)) === 'Y'; }
      function* num(text, max, side, pre) {
        R.pick = null; R.side = side || null; R.lines = (pre || []).concat(wrap(text, width()));
        const v = yield { t: 'num', max: Math.max(0, Math.floor(max)) };
        R.side = null; return v;
      }
      function priceLines() {
        const p = S.price, pad = (s, n) => (s + '                    ').slice(0, n);
        return ['Taipan, present prices per unit here are',
          '   ' + pad('Opium: ' + p[0], 18) + 'Silk: ' + p[1],
          '   ' + pad('Arms: ' + p[2], 18) + 'General: ' + p[3]];
      }
      const head = (h, icon) => { R.head = h; R.icon = icon || null; };
      const report = () => head("Comprador's Report", 'abacus');

      // ---------- main flow ----------
      function* main() {
        scr = 'name';
        let name = yield { t: 'name' };
        name = String(name || '').trim() || DEFAULT_FIRM;
        scr = 'start';
        const ch = yield { t: 'pick', n: 2, sel: 0, digits: ['Digit1', 'Digit2'] };
        newState(name, ch === 1 ? 2 : 1);
        scr = 'port'; report(); R.lines = [];
        sfx.theme();
        for (;;) {
          yield* portEvents();
          const dest = yield* trading();
          if (dest === 'retire') { yield* retire(); return; }
          const res = yield* voyage(dest);
          if (res === 'sunk') {
            const go = yield { t: 'sunk' };
            if (!go) { yield* finalStatus(false); return; }
            // refitted small ship, back in Hong Kong; money and warehouse are kept
            S.capacity = 60; S.guns = 0; S.cargo = [0, 0, 0, 0]; S.hold = 60; S.damage = 0;
            arrive(0); scr = 'port'; vo = null; B = null; report();
            yield* say("Taipan!! Elder Brother Wu's junks fished you out of the sea, and Mc Henry has refitted a small ship for you in Hong Kong.", 6, sfx.bell);
          }
        }
      }

      function* portEvents() {
        scr = 'port'; report();
        if (S.port === 0 && S.li === 0 && S.cash > 0) yield* liYuen();
        if (S.port === 0 && S.damage > 0) yield* mcHenry();
        if (S.port === 0 && S.debt >= 10000 && !S.wuWarn) {
          const braves = rnd(100) + 50; head('Elder Brother Wu', 'lantern');
          yield* say(`Elder Brother Wu has sent ${braves} braves to escort you to the Wu mansion, Taipan.`, 4, sfx.bell);
          yield* say("Elder Brother Wu reminds you of the Confucian ideal of personal worthiness, and how this applies to paying one's debts.", 5);
          yield* say('He is reminded of a fabled barbarian who came to a pitiful end after being too extravagant, and bids you pay now, Taipan.', 5);
          S.wuWarn = 1; report();
        }
        if (S.port === 0) yield* wu(false);
        if (chance(4, 'offer')) { if (rnd(2) === 0) yield* newShip(); else if (S.guns < 1000) yield* newGun(); }
        report();
        if (S.port !== 0 && S.cargo[0] > 0 && chance(18, 'seize')) {
          const fine = Math.floor((S.cash / 1.8) * Math.random()) + 1;
          S.hold += S.cargo[0]; S.cargo[0] = 0; S.cash = Math.max(0, S.cash - fine);
          yield* say(`Bad Joss!! The local authorities have seized your Opium cargo and have also fined you ${big(fine)}, Taipan!`, 5, sfx.bell);
        }
        if (inUse() > 0 && chance(50, 'theft')) {
          for (let i = 0; i < 4; i++) S.hkw[i] = Math.floor((S.hkw[i] / 1.8) * Math.random());
          yield* say('Messenger reports large theft from warehouse, Taipan.', 4, sfx.bell);
        }
        if (rnd(20) === 0) { if (S.li > 0) S.li++; if (S.li === 4) S.li = 0; }
        if (S.port !== 0 && S.li === 0 && rnd(4) !== 0) {
          head("Li Yuen's Lieutenant", 'flag');
          yield* say('Li Yuen has sent a Lieutenant, Taipan.  He says his admiral wishes to see you in Hong Kong, posthaste!', 4);
          report();
        }
        if (chance(9, 'price')) yield* goodPrices();
        if (S.cash > 25000 && chance(20, 'rob')) {
          const robbed = Math.floor((S.cash / 1.4) * Math.random());
          S.cash -= robbed;
          yield* say(`Bad Joss!! You've been beaten up and robbed of ${big(robbed)} in cash, Taipan!!`, 5, sfx.bell);
        }
      }

      function* goodPrices() {
        const i = rnd(4); let verb;
        if (rnd(2) === 0) { S.price[i] = Math.max(1, Math.floor(S.price[i] / 5)); verb = 'dropped'; }
        else { S.price[i] = S.price[i] * (rnd(5) + 5); verb = 'risen'; }
        yield* say(`Taipan!!  The price of ${GOODS_LONG[i]} has ${verb} to ${S.price[i]}!!`, 4, sfx.bell);
      }

      function* liYuen() {
        head("Li Yuen's Lieutenant", 'flag');
        const tm = months(); let i = 1.8, j = 0;
        if (tm > 12) { j = rnd(1000 * tm) + 1000 * tm; i = 1; }
        const amount = Math.floor((S.cash / i) * Math.random() + j);
        if (yield* yn(`Li Yuen asks ${big(amount)} in donation to the temple of Tin Hau, the Sea Goddess.  Will you pay?`)) {
          if (amount <= S.cash) { S.cash -= amount; S.li = 1; sfx.cash(); }
          else if (yield* yn('Taipan, you do not have enough cash!!  Do you want Elder Brother Wu to make up the difference for you?')) {
            S.debt += amount - S.cash; S.cash = 0; S.li = 1;
            head('Elder Brother Wu', 'lantern');
            yield* say('Elder Brother has given Li Yuen the difference between what he wanted and your cash on hand and added the same amount to your debt.', 5);
          } else {
            S.cash = 0;
            yield* say('Very well. Elder Brother Wu will not pay Li Yuen the difference.  I would be very wary of pirates if I were you, Taipan.', 5);
          }
        }
        report();
      }

      function* mcHenry() {
        head("Mc Henry's Shipyard", 'anchor');
        if (yield* yn('Taipan, Mc Henry from the Hong Kong Shipyards has arrived!!  He says, "I see ye\'ve a wee bit of damage to yer ship.  Will ye be wanting repairs?"')) {
          const pct = Math.floor(S.damage / S.capacity * 100), tm = months();
          const br = Math.max(1, Math.floor((60 * (tm + 3) / 4 * Math.random() + 25 * (tm + 3) / 4) * S.capacity / 50));
          const price = Math.floor(br * S.damage) + 1;
          yield* say(`"Och, 'tis a pity to be ${pct}% damaged.  We can fix yer whole ship for ${big(price)}, or make partial repairs if you wish."`, 5);
          const amt = yield* num('"How much will ye spend?"', Math.min(S.cash, price), { label: ['WHOLE', 'SHIP'], value: price });
          if (amt > 0) {
            S.cash -= amt;
            if (amt >= price) S.damage = 0; else S.damage = Math.max(0, S.damage - Math.floor(amt / br + 0.5));
            sfx.cash();
          }
        }
        report();
      }

      function* wu(fromMenu) {
        head('Elder Brother Wu', 'lantern');
        if (!fromMenu && !(yield* yn('Do you have business with Elder Brother Wu, the moneylender?'))) { report(); return; }
        const broke = S.cash === 0 && S.bank === 0 && S.guns === 0 && S.cargo.every(v => !v) && S.hkw.every(v => !v);
        if (broke) {
          const i = rnd(1500) + 500; S.wuBail++;
          const j = rnd(2000) * S.wuBail + 1500;
          if (yield* yn(`Elder Brother is aware of your plight, Taipan.  He is willing to loan you an additional ${i} if you will pay back ${j}. Are you willing, Taipan?`)) {
            S.cash += i; S.debt += j; sfx.cash();
            yield* say('Very well, Taipan.  Good joss!!', 3);
          } else yield* say('Very well, Taipan, the offer stands.', 3);
          report(); return;
        }
        if (S.debt > 0 && S.cash > 0) {
          const r = yield* num('How much do you wish to repay him?', Math.min(S.cash, S.debt), { label: ['YOU OWE'], value: S.debt });
          if (r > 0) { S.cash -= r; S.debt -= r; sfx.cash(); }
        }
        if (S.cash > 0) {
          const b = yield* num('How much do you wish to borrow?', S.cash * 2, { label: ['HE WILL', 'LEND'], value: S.cash * 2 });
          if (b > 0) { S.cash += b; S.debt += b; sfx.cash(); }
        } else {
          yield* say("He won't loan you anything without cash in hand, Taipan!", 3);
        }
        if (S.debt > 20000 && S.cash > 0 && chance(5, 'cutthroat')) {
          const n = rnd(3) + 1;
          S.cash = 0;
          yield* say(`Bad joss!! ${n} of your bodyguards have been killed by cutthroats and you have been robbed of all of your cash, Taipan!!`, 5, sfx.bell);
        }
        report();
      }

      function* newShip() {
        const tm = months();
        const amount = Math.floor(rnd(1000) * Math.floor((tm + 5) / 6) * Math.floor(S.capacity / 50)) + 1000;
        if (S.cash < amount) return;
        head("Mc Henry's Shipyard", 'anchor');
        if (yield* yn(`Do you wish to trade in your ${S.damage > 0 ? '{damaged}' : 'fine'} ship for one with 50 more capacity by paying an additional ${big(amount)}, Taipan?`)) {
          S.cash -= amount; S.hold += 50; S.capacity += 50; S.damage = 0; sfx.cash();
        }
        if (rnd(2) === 0 && S.guns < 1000) yield* newGun();
        report();
      }
      function* newGun() {
        const amount = Math.floor(rnd(1000) * Math.floor((months() + 5) / 6)) + 500;
        if (S.cash < amount || S.hold < 10) return;
        head("Mc Henry's Shipyard", 'anchor');
        if (yield* yn(`Do you wish to buy a ship's gun for ${big(amount)}, Taipan?`)) { S.cash -= amount; S.hold -= 10; S.guns++; sfx.cash(); }
        report();
      }

      function* trading() {
        for (;;) {
          scr = 'port'; report();
          const canRetire = S.port === 0 && net() >= 1000000;
          let prompt, keys;
          if (S.port === 0) {
            prompt = canRetire ? 'Shall I {B}uy, {S}ell, {V}isit bank, {T}ransfer cargo, see {W}u, {Q}uit trading, or {R}etire?'
              : 'Shall I {B}uy, {S}ell, {V}isit bank, {T}ransfer cargo, see {W}u, or {Q}uit trading?';
            keys = ['B', 'S', 'V', 'T', 'W', 'Q']; if (canRetire) keys.push('R');
          } else { prompt = 'Shall I {B}uy, {S}ell, or {Q}uit trading?'; keys = ['B', 'S', 'Q']; }
          const k = yield* ask(prompt, keys, priceLines().concat(['']));
          if (k === 'B') yield* buy();
          else if (k === 'S') yield* sell();
          else if (k === 'V') yield* bank();
          else if (k === 'T') yield* transfer();
          else if (k === 'W') yield* wu(true);
          else if (k === 'R') return 'retire';
          else if (k === 'Q') {
            if (S.hold < 0) { yield* say('Your ship would be overburdened, Taipan!', 3, sfx.bell); continue; }
            const d = yield* destination();
            if (d >= 0) return d;
          }
        }
      }
      function* buy() {
        const k = yield* ask('What do you wish me to buy, Taipan?   {O}pium, {S}ilk, {A}rms, {G}eneral   ({X}=none)', ['O', 'S', 'A', 'G', 'X'], priceLines().concat(['']));
        if (k === 'X') return;
        const i = 'OSAG'.indexOf(k);
        const afford = Math.floor(S.cash / S.price[i]);
        const amt = yield* num(`How much ${GOODS[i]} shall I buy, Taipan?`, afford, { label: ['YOU CAN', 'AFFORD'], value: afford }, [`${GOODS_LONG[i]} costs`, `${S.price[i]} per unit here.`, '']);
        if (amt > 0) { S.cash -= amt * S.price[i]; S.cargo[i] += amt; S.hold -= amt; sfx.cash(); }
      }
      function* sell() {
        const k = yield* ask('What do you wish me to sell, Taipan?   {O}pium, {S}ilk, {A}rms, {G}eneral   ({X}=none)', ['O', 'S', 'A', 'G', 'X'], priceLines().concat(['']));
        if (k === 'X') return;
        const i = 'OSAG'.indexOf(k);
        if (S.cargo[i] <= 0) { yield* say(`You have no ${GOODS[i]} aboard, Taipan.`, 2); return; }
        const amt = yield* num(`How much ${GOODS[i]} shall I sell, Taipan?`, S.cargo[i], { label: ['YOU HAVE'], value: S.cargo[i] }, [`${GOODS_LONG[i]} fetches`, `${S.price[i]} per unit here.`, '']);
        if (amt > 0) { S.cash += amt * S.price[i]; S.cargo[i] -= amt; S.hold += amt; sfx.cash(); }
      }
      function* bank() {
        head('The Bank', 'coins');
        const d = yield* num('How much will you deposit?', S.cash, { label: ['CASH'], value: S.cash });
        if (d > 0) { S.cash -= d; S.bank += d; sfx.cash(); }
        const w = yield* num('How much will you withdraw?', S.bank, { label: ['IN BANK'], value: S.bank });
        if (w > 0) { S.cash += w; S.bank -= w; sfx.cash(); }
        report();
      }
      function* transfer() {
        head('Hong Kong Warehouse', 'anchor');
        if (S.cargo.every(v => !v) && S.hkw.every(v => !v)) { yield* say('You have no cargo, Taipan.', 3); report(); return; }
        for (let i = 0; i < 4; i++) {
          if (S.cargo[i] <= 0) continue;
          const room = 10000 - inUse();
          if (room <= 0) { yield* say('Your warehouse is full, Taipan!', 2); break; }
          const a = yield* num(`How much ${GOODS[i]} shall I move to the warehouse, Taipan?`, Math.min(S.cargo[i], room), { label: ['ABOARD'], value: S.cargo[i] });
          if (a > 0) { S.cargo[i] -= a; S.hkw[i] += a; S.hold += a; sfx.click(); }
        }
        for (let i = 0; i < 4; i++) {
          if (S.hkw[i] <= 0) continue;
          const a = yield* num(`How much ${GOODS[i]} shall I move aboard ship, Taipan?`, S.hkw[i], { label: ['IN', 'WAREHOUSE'], value: S.hkw[i] });
          if (a > 0) { S.hkw[i] -= a; S.cargo[i] += a; S.hold -= a; sfx.click(); }
        }
        report();
      }
      function* destination() {
        for (;;) {
          R.side = null; R.lines = ['Taipan, do you wish me to go to:'];
          R.pick = { items: PORTS.map((p, i) => (i + 1) + ') ' + p), cols: 2 };
          const d = yield { t: 'pick', n: 7, sel: S.port === 0 ? 1 : 0, rows: 4 };
          R.pick = null;
          if (d < 0) return -1;
          if (d === S.port) { yield* say("You're already here, Taipan.", 2); continue; }
          return d;
        }
      }

      function arrive(dest) {
        S.port = dest;
        S.month++;
        if (S.month > 12) { S.month = 1; S.year++; S.ec += 10; S.ed += 0.5; }
        S.debt = Math.floor(S.debt + S.debt * 0.1);
        S.bank = Math.floor(S.bank + S.bank * 0.005);
        setPrices();
      }

      // ---------- voyage ----------
      function* sailTo(p) { vo.target = p; yield { t: 'wait', until: () => vo.p >= vo.target - 1e-6, s: 12 }; }
      function* voyage(dest) {
        vo = { from: S.port, to: dest, pts: routePts(null, S.port, dest), p0: 0, p: 0, target: 0, storm: 0, flash: 0, wake: [], sinking: 0 };
        scr = 'voyage'; R.lines = [`Bound for ${PORTS[dest]}, Taipan.`]; R.side = null;
        sfx.splash();
        yield* sailTo(0.35);
        let result = 0;
        if (chance(S.bp, 'pirates')) {
          let n = Math.min(9999, rnd(Math.floor(S.capacity / 10) + S.guns) + 1);
          yield* say(`${n} hostile ship${n > 1 ? 's' : ''} approaching, Taipan!`, 3, sfx.alarm);
          result = yield* battle(1, n);
          scr = 'voyage';
          if (result === 4) return yield* lost();
          if (result === 1) yield* booty();
          if (result === 2) yield* say("Li Yuen's fleet drove them off!", 3);
        }
        if ((result === 0 && chance(4 + 8 * S.li, 'liyuen')) || result === 2) {
          yield* say("Li Yuen's pirates, Taipan!!", 3, sfx.alarm);
          if (S.li > 0) yield* say('Good joss!! They let us be!!', 3);
          else {
            const n = Math.min(9999, rnd(Math.floor(S.capacity / 5) + S.guns) + 5);
            yield* say(`${n} ships of Li Yuen's pirate fleet, Taipan!!`, 3);
            result = yield* battle(2, n);
            scr = 'voyage';
            if (result === 4) return yield* lost();
            if (result === 1) yield* booty();
          }
        }
        yield* sailTo(0.65);
        if (chance(10, 'storm')) {
          vo.storm = 1; sfx.storm(); sfx.thunder(); vo.flash = 0.3;
          yield* say('Storm, Taipan!!', 3);
          if (chance(30, 'founder')) {
            yield* say("I think we're going down!!", 3, sfx.bell);
            if ((S.damage / S.capacity * 3) * Math.random() >= 1 || force('sinkstorm')) {
              vo.sinking = 0.001; sfx.sink();
              yield* say("We're going down, Taipan!!", 3);
              R.lines = wrap("The buggers got us, Taipan!!!  It's all over, now!!!", 40);
              return 'sunk';
            }
          }
          yield* say('We made it!!', 2);
          vo.storm = 0;
          if (rnd(3) === 0 || force('blown')) {
            const orig = dest; do { dest = rnd(7); } while (dest === orig);
            const here = polyAt(vo.pts, (vo.p - vo.p0) / (1 - vo.p0));
            let near = 0, nd = 1e9; NODES.forEach((n, i) => { const d = Math.hypot(n[0] - here[0], n[1] - here[1]); if (d < nd) { nd = d; near = i; } });
            vo.pts = routePts([here[0], here[1]], near, dest); vo.p0 = vo.p; vo.to = dest;
            yield* say(`We've been blown off course to ${PORTS[dest]}`, 3, sfx.bell);
          }
        }
        yield* sailTo(1);
        arrive(dest);
        yield* say(`Arriving at ${PORTS[dest]}...`, 1.8);
        scr = 'port'; vo = null;
        return 'ok';
      }
      function* booty() {
        const b = B ? B.booty : 0;
        S.cash += b; sfx.cash();
        yield* say(`We captured some booty.  It's worth ${big(b)}!`, 3);
      }
      function* lost() {
        scr = 'battle';
        R.lines = wrap("The buggers got us, Taipan!!!  It's all over, now!!!", 40);
        yield { t: 'wait', s: 2.5 };
        return 'sunk';
      }

      // ---------- sea battle ----------
      const SLOT_X = i => 8 + (i % 5) * 64, SLOT_WL = i => (i < 5 ? 66 : 110);
      const PX = 124, PWL = 162;
      function bstat() { B.orderTxt = ['', 'Fight', 'Run', 'Throw cargo'][B.orders]; }
      const liveSlots = () => B.slots.filter(s => s.hp > 0);
      function* spawnShips() {
        for (let i = 0; i < 10; i++) {
          if (B.n > B.onScreen && B.slots[i].hp <= 0 && !B.slots[i].vis) {
            const s = B.slots[i];
            s.max = s.hp = Math.floor(S.ec * Math.random() + 20); s.vis = 'live'; s.appear = 0; s.vt = 0; s.hit = 0; s.ph = Math.random() * 6;
            B.onScreen++; au.tone(300 + i * 30, 0.03, { type: 'square', vol: 0.03 });
            yield { t: 'wait', s: 0.07 };
          }
        }
      }
      function removeShips(k) {
        const off = B.n - B.onScreen, r1 = Math.min(k, off);
        B.n -= r1; k -= r1;
        for (let i = 9; i >= 0 && k > 0; i--) {
          const s = B.slots[i];
          if (s.hp > 0) { s.hp = 0; s.vis = 'flee'; s.vt = 0; B.onScreen--; B.n--; k--; }
        }
      }
      function shoot(x0, y0, x1, y1, dur, arc, onHit) { addFx({ k: 'ball', x0, y0, x1, y1, t: 0, d: dur, h: arc, onHit }); }
      function boom(x, y, n, big) {
        addFx({ k: 'ring', x, y, t: 0, d: big ? 0.5 : 0.3, r: big ? 14 : 8 });
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 20 + Math.random() * (big ? 70 : 45); addFx({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0, d: 0.5 + Math.random() * 0.5 }); }
        for (let i = 0; i < (big ? 4 : 2); i++) addFx({ k: 'smoke', x: x + Math.random() * 8 - 4, y, t: 0, d: 1 + Math.random(), r: 2 + Math.random() * 2 });
      }
      function* battle(id, n) {
        scr = 'battle';
        B = { id, n, s0: n, onScreen: 0, orders: 0, orderTxt: '', ok: 0, ik: 1, flash: 0, shake: 0, psink: 0, fire: 0,
          slots: Array.from({ length: 10 }, () => ({ hp: 0, max: 1, vis: null, vt: 0, appear: 0, hit: 0, ph: 0 })),
          booty: Math.floor(months() / 4) * 1000 * n + rnd(1000) + 250 };
        fx.length = 0;
        R.lines = []; R.side = null; R.pick = null;
        sfx.alarm();
        yield { t: 'wait', s: 0.6 };
        let firstPrompt = true;
        for (;;) {
          if (status() <= 0) {
            B.psink = 0.001; sfx.sink(); R.lines = ['We\'re going down, Taipan!!'];
            yield { t: 'wait', s: 2.2 };
            return 4;
          }
          if (B.n > B.onScreen) yield { t: 'wait', until: () => !B.slots.some(s => s.vis && s.vis !== 'live'), s: 2.5 };
          yield* spawnShips();
          R.lines = ['Taipan, what shall we do??', '   {F}ight, {R}un, or {T}hrow cargo'];
          const k = yield { t: 'key', keys: ['F', 'R', 'T'], timeout: (firstPrompt || !B.orders) ? 0 : 3 };
          firstPrompt = false;
          if (k) B.orders = k === 'F' ? 1 : k === 'R' ? 2 : 3;
          bstat();
          if (B.orders === 1) {
            if (S.guns > 0) {
              B.ok = 3; B.ik = 1;
              yield* say("Aye, we'll fight 'em, Taipan.", 0.9);
              R.lines = ["We're firing on 'em, Taipan!"];
              let sunk = 0;
              const gap = Math.max(0.035, Math.min(0.14, 3 / S.guns));
              for (let g = 0; g < S.guns; g++) {
                if (!liveSlots().length) {
                  if (B.n > B.onScreen) { yield { t: 'wait', until: () => !B.slots.some(s => s.vis === 'sink' || s.vis === 'flee'), s: 2.5 }; yield* spawnShips(); }
                  if (!liveSlots().length) break;
                }
                const live = liveSlots(), s = live[rnd(live.length)], i = B.slots.indexOf(s);
                s.hp -= rnd(30) + 10;
                const killed = s.hp <= 0;
                if (killed) { s.hp = 0; B.onScreen--; B.n--; sunk++; s.vis = 'doomed'; }
                const tx0 = SLOT_X(i) + 20 + rnd(10), ty0 = SLOT_WL(i) - 8 - rnd(6);
                const gx = PX + 30 + (g % 5) * 7, gy = PWL - 14;
                addFx({ k: 'flash', x: gx, y: gy, t: 0, d: 0.12 });
                if (g % 2 === 0 || S.guns < 12) sfx.cannon();
                shoot(gx, gy, tx0, ty0, 0.32, 16, () => {
                  s.hit = 0.12; boom(tx0, ty0, killed ? 14 : 6, killed);
                  if (killed) { s.vis = 'sink'; s.vt = 0; sfx.sink(); } else sfx.boom();
                });
                yield { t: 'wait', s: gap };
                if (B.n <= 0) break;
              }
              yield { t: 'wait', until: () => !fx.some(f => f.k === 'ball'), s: 1.5 };
              yield* say(sunk > 0 ? `Sunk ${sunk} of the buggers, Taipan!` : "Hit 'em, but didn't sink 'em, Taipan!", 1.6);
              if (B.n > 2 && rnd(B.s0) > (B.n * 0.6 / id)) {
                const ran = rnd(Math.max(1, Math.floor(B.n / 3 / id))) + 1;
                removeShips(ran);
                yield* say(`${ran} ran away, Taipan!`, 1.6);
              }
            } else yield* say('We have no guns, Taipan!!', 1.6, sfx.bell);
          } else if (B.orders === 2 || B.orders === 3) {
            if (B.orders === 3) {
              const c = S.cargo;
              const k2 = yield* ask('What shall I throw overboard, Taipan?  {O} {S} {A} {G} or {E}verything', ['O', 'S', 'A', 'G', 'E', 'X'],
                ['You have the following on board, Taipan:', `  Opium: ${c[0]}   Silk: ${c[1]}`, `  Arms: ${c[2]}   General: ${c[3]}`]);
              let amount = 0;
              if (k2 === 'E') { amount = c[0] + c[1] + c[2] + c[3]; S.cargo = [0, 0, 0, 0]; }
              else if (k2 !== 'X') {
                const i = 'OSAG'.indexOf(k2);
                amount = c[i] > 0 ? yield* num('How much, Taipan?', c[i]) : 0;
                S.cargo[i] -= amount;
              }
              if (amount > 0) {
                S.hold += amount; B.ok += Math.floor(amount / 10);
                for (let q = 0; q < Math.min(8, 2 + amount / 50); q++) addFx({ k: 'crate', x: PX + 6 + rnd(10), y: PWL - 16, vx: -20 - Math.random() * 30, vy: -40 - Math.random() * 20, t: 0, d: 1.4 });
                sfx.splash();
                yield* say("Let's hope we lose 'em, Taipan!", 1.4);
              } else yield* say("There's nothing there, Taipan!", 1.4);
            } else yield* say("Aye, we'll run, Taipan.", 1.0);
            B.ok += B.ik++;
            if (rnd(B.ok) > rnd(B.n) || force('escape')) {
              for (const s of B.slots) if (s.hp > 0) { s.hp = 0; s.vis = 'flee'; s.vt = 0; }
              B.onScreen = 0; B.escaped = 1;
              yield* say("We got away from 'em, Taipan!", 2.2);
              return 3;
            }
            yield* say("Couldn't lose 'em.", 1.3);
            if (B.n > 2 && rnd(5) === 0) {
              const lostN = rnd(Math.floor(B.n / 2)) + 1;
              removeShips(lostN);
              yield* say(`But we escaped from ${lostN} of 'em!`, 1.5);
            }
          }
          if (B.n > 0) {
            // the enemy fires
            R.lines = ["They're firing on us, Taipan!"];
            const live = liveSlots();
            live.forEach((s, q) => {
              const i = B.slots.indexOf(s);
              const sx = SLOT_X(i) + 14, sy = SLOT_WL(i) - 6;
              addFx({ k: 'flash', x: sx, y: sy, t: -q * 0.05, d: 0.12 });
              const miss = Math.random() < 0.35;
              shoot(sx, sy, PX + 10 + rnd(52), miss ? PWL + 4 + rnd(4) : PWL - 10 - rnd(16), 0.45, 14 + rnd(10), miss ? (x, y) => addFx({ k: 'splash', x, y: PWL + 2, t: 0, d: 0.6 }) : (x, y) => boom(x, y, 5, false));
            });
            sfx.cannon(); au.noise(0.4, { freq: 1000, slideTo: 100, vol: 0.18, delay: 0.15 });
            yield { t: 'wait', s: 0.75 };
            B.flash = 0.18; B.shake = 0.45; sfx.hit();
            let i = Math.min(B.n, 15);
            const pct = S.damage / S.capacity * 100;
            let gunHit = false;
            if (S.guns > 0 && (rnd(100) < pct || pct > 80)) { i = 1; S.guns--; S.hold += 10; gunHit = true; }
            S.damage = S.damage + (S.ed * i * id) * Math.random() + i / 2;
            yield* say(gunHit ? 'The buggers hit a gun, Taipan!!' : "We've been hit, Taipan!!", 1.6);
            if (id === 1 && (rnd(20) === 0 || force('driveoff'))) {
              for (const s of B.slots) if (s.hp > 0) { s.hp = 0; s.vis = 'flee'; s.vt = 0; }
              B.onScreen = 0;
              return 2;
            }
          }
          if (B.n <= 0) {
            yield { t: 'wait', until: () => !B.slots.some(s => s.vis === 'sink' || s.vis === 'doomed'), s: 2 };
            if (B.orders === 1) { yield* say("We got 'em all, Taipan!", 2.2, sfx.fanfare); return 1; }
            return 3;
          }
        }
      }

      // ---------- endings ----------
      function* retire() {
        scr = 'retire'; RET = { t: 0 }; fx.length = 0; sfx.fanfare();
        yield { t: 'msg', s: 8, min: 2 };
        yield* finalStatus(true);
      }
      function* finalStatus(retired) {
        const tm = months(), nw = net();
        const score = Math.floor(nw / 100 / Math.pow(tm, 1.1));
        const rating = score >= 50000 ? 0 : score >= 8000 ? 1 : score >= 1000 ? 2 : score >= 500 ? 3 : 4;
        const newHi = nw > hi;
        if (nw > 0) { api.setHiScore(nw); hi = Math.max(hi, nw); }
        FIN = { retired, nw, score, rating, newHi, years: S.year - 1860, months: S.month - 1, t: 0 };
        scr = 'final';
        yield { t: 'msg', s: 25, min: 1.5 };
      }

      // ---------- command processing ----------
      const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const ANYKEYS = ['Enter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].concat(LETTERS.map(l => 'Key' + l));
      function run(v) {
        if (!gen) return;
        let r;
        try { r = gen.next(v); } catch (e) { console.error(e); gen = null; cmd = null; toTitle(); return; }
        if (r.done) { gen = null; cmd = null; toTitle(); return; }
        cmd = r.value; cmdT = 0;
        if (cmd.t === 'num') { cmd.val = 0; const dg = String(cmd.max).length; cmd.place = Math.max(0, dg - 3); cmd.hold = 0; cmd.rep = 0; }
        if (cmd.t === 'name') cmd.buf = '';
        if (cmd.t === 'pick') cmd.sel = cmd.sel || 0;
        if (cmd.t === 'sunk') {
          if (api.offerContinue) api.offerContinue(() => run(true), () => run(false));
          else cmd.auto = true;
        }
      }
      function toTitle() { mode = 'title'; scr = 'title'; titleT = 0; gen = null; cmd = null; vo = null; B = null; fx.length = 0; }
      function startGame() { mode = 'game'; gen = main(); run(); }

      function stepCmd(dt) {
        cmdT += dt;
        const c = cmd;
        switch (c.t) {
          case 'wait':
            if ((c.until && c.until()) || (c.s && cmdT >= c.s)) run();
            break;
          case 'msg':
            if (cmdT >= c.s || (cmdT > (c.min || 0.2) && api.anyPressed.apply(null, ANYKEYS))) { if (cmdT < c.s) sfx.click(); run(); }
            break;
          case 'key':
            for (const l of c.keys) if (api.pressed('Key' + l)) { sfx.click(); run(l); return; }
            if (c.timeout && cmdT >= c.timeout) run(null);
            break;
          case 'num': {
            const dg = String(c.max).length;
            if (api.pressed('ArrowLeft')) { c.place = Math.min(dg - 1, c.place + 1); sfx.tick(); }
            if (api.pressed('ArrowRight')) { c.place = Math.max(0, c.place - 1); sfx.tick(); }
            let dir = 0;
            const up = api.key('ArrowUp'), dn = api.key('ArrowDown');
            if (api.pressed('ArrowUp')) { dir = 1; c.hold = 0; c.rep = 0.32; }
            else if (api.pressed('ArrowDown')) { dir = -1; c.hold = 0; c.rep = 0.32; }
            else if (up || dn) {
              c.hold += dt; c.rep -= dt;
              if (c.rep <= 0) { dir = up ? 1 : -1; c.rep = Math.max(0.035, 0.11 - c.hold * 0.025); }
            } else c.hold = 0;
            if (dir) {
              let step = Math.pow(10, c.place);
              if (c.hold > 1.5) step *= 10; if (c.hold > 3) step *= 10;
              const nv = Math.max(0, Math.min(c.max, c.val + dir * step));
              if (nv !== c.val) { c.val = nv; sfx.tick(); }
            }
            if (api.pressed('KeyA')) { c.val = c.max; sfx.click(); }
            if (api.pressed('Backspace') || api.pressed('Delete')) { c.val = 0; sfx.tick(); }
            if (api.pressed('Enter')) { sfx.click(); run(c.val); }
            else if (api.pressed('KeyX')) { sfx.click(); run(0); }
            break;
          }
          case 'pick': {
            const rows = c.rows || c.n;
            if (api.pressed('ArrowUp')) { c.sel = (c.sel + c.n - 1) % c.n; sfx.tick(); }
            if (api.pressed('ArrowDown')) { c.sel = (c.sel + 1) % c.n; sfx.tick(); }
            if (c.rows && api.pressed('ArrowRight')) { c.sel = Math.min(c.n - 1, c.sel + rows); sfx.tick(); }
            if (c.rows && api.pressed('ArrowLeft')) { c.sel = Math.max(0, c.sel - rows); sfx.tick(); }
            if (c.digits) c.digits.forEach((d, i) => { if (api.pressed(d)) { c.sel = i; sfx.click(); run(i); } });
            if (cmd !== c) return;
            if (api.pressed('Enter')) { sfx.click(); run(c.sel); }
            else if (c.rows && api.pressed('KeyX')) { sfx.click(); run(-1); }
            break;
          }
          case 'name': {
            for (const l of LETTERS) if (api.pressed('Key' + l) && c.buf.length < 22) { c.buf += l; sfx.click(); }
            const extra = { Space: ' ', Period: '.', Minus: '-', Comma: ',', Quote: "'" };
            for (const k in extra) if (api.pressed(k) && c.buf.length < 22 && (k !== 'Space' || c.buf.length)) { c.buf += extra[k]; sfx.click(); }
            if (api.pressed('Backspace') && c.buf.length) { c.buf = c.buf.slice(0, -1); sfx.tick(); }
            if (api.pressed('Enter') && cmdT > 0.2) { sfx.click(); run(c.buf); }
            break;
          }
          case 'sunk':
            if (c.auto && cmdT > 1) run(false);
            break;
        }
      }

      // ---------- animation ----------
      function animate(dt) {
        t += dt;
        if (vo) {
          if (vo.p < vo.target) vo.p = Math.min(vo.target, vo.p + dt * (vo.storm ? 0.09 : 0.2));
          if (vo.flash > 0) vo.flash -= dt;
          if (vo.storm && Math.random() < 0.012) { vo.flash = 0.25; sfx.thunder(); }
          if (vo.sinking) vo.sinking = Math.min(1, vo.sinking + dt * 0.4);
        }
        if (B && scr === 'battle') {
          if (B.flash > 0) B.flash -= dt; if (B.shake > 0) B.shake -= dt;
          if (B.psink) B.psink = Math.min(1, B.psink + dt * 0.45);
          for (const s of B.slots) {
            if (!s.vis) continue;
            s.vt += dt; if (s.appear < 1) s.appear = Math.min(1, s.appear + dt * 4); if (s.hit > 0) s.hit -= dt;
            if (s.vis === 'sink') {
              if (Math.random() < 0.3) addFx({ k: 'bub', x: SLOT_X(B.slots.indexOf(s)) + 8 + Math.random() * 32, y: SLOT_WL(B.slots.indexOf(s)), t: 0, d: 0.5 });
              if (s.vt > 1.5) s.vis = null;
            }
            if (s.vis === 'flee' && s.vt > 1.6) s.vis = null;
          }
          // smoke from our damaged ship
          const dmg = S.damage / S.capacity;
          if (dmg > 0.15 && Math.random() < dmg * 0.25) addFx({ k: 'smoke', x: PX + 14 + Math.random() * 44, y: PWL - 18 - Math.random() * 10, t: 0, d: 1.5, r: 1.5 + Math.random() * 2 });
        }
        for (let i = fx.length - 1; i >= 0; i--) {
          const f = fx[i]; f.t += dt;
          if (f.k === 'p' || f.k === 'crate') { if (f.t > 0) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 140 * dt; } if (f.k === 'crate' && f.y > PWL + 2) { addFx({ k: 'splash', x: f.x, y: PWL + 2, t: 0, d: 0.5 }); fx.splice(i, 1); continue; } }
          if (f.k === 'smoke') { f.y -= 10 * dt; f.x += 4 * dt; }
          if (f.k === 'bub') f.y -= 6 * dt;
          if (f.k === 'ball' && f.t >= f.d) { fx.splice(i, 1); if (f.onHit) f.onHit(f.x1, f.y1); continue; }
          if (f.k !== 'ball' && f.t >= f.d) fx.splice(i, 1);
        }
        if (RET && scr === 'retire') {
          RET.t += dt;
          if (Math.random() < 0.04) {
            const x = 30 + Math.random() * 260, y = 20 + Math.random() * 70;
            for (let k = 0; k < 28; k++) { const a = k / 28 * 6.28, v = 30 + Math.random() * 20; addFx({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, d: 1.2, fw: 1 }); }
            sfx.firework();
          }
        }
        if (FIN) FIN.t += dt;
      }

      // ---------- rendering helpers ----------
      function box(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h); }
      function hline(ctx, x, y, w, col, dash) { ctx.fillStyle = col; if (!dash) ctx.fillRect(x, y, w, 1); else for (let i = 0; i < w; i += dash * 2) ctx.fillRect(x + i, y, Math.min(dash, w - i), 1); }
      const blink = (rate) => ((frame / (rate || 16)) | 0) % 2 === 0;
      function label(ctx, s, cx, y) { tx(ctx, '{ ' + s + ' }', cx, y, C1, { center: true }); }

      function drawFx(ctx, filter) {
        for (const f of fx) {
          if (f.t < 0) continue;
          if (filter && !filter(f)) continue;
          const k = f.t / f.d;
          switch (f.k) {
            case 'ball': {
              const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * f.h;
              ctx.fillStyle = C3; const kb = Math.max(0, k - 0.06), xb = f.x0 + (f.x1 - f.x0) * kb, yb = f.y0 + (f.y1 - f.y0) * kb - Math.sin(kb * Math.PI) * f.h;
              ctx.fillRect(Math.round(xb), Math.round(yb), 1, 1);
              ctx.fillStyle = C0; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
              break;
            }
            case 'flash': ctx.fillStyle = C0; disc(ctx, f.x, f.y, 3 * (1 - k) + 1); ctx.fillStyle = C1; ctx.fillRect(Math.round(f.x) - 5, Math.round(f.y), 10, 1); break;
            case 'ring': { ctx.fillStyle = k < 0.3 ? C0 : C1; const r = 2 + f.r * k; for (let a = 0; a < 16; a++) ctx.fillRect(Math.round(f.x + Math.cos(a / 16 * 6.28) * r), Math.round(f.y + Math.sin(a / 16 * 6.28) * r * 0.8), 1, 1); if (k < 0.35) { ctx.fillStyle = C0; disc(ctx, f.x, f.y, f.r * 0.4 * (1 - k)); } break; }
            case 'p': ctx.fillStyle = f.fw ? (k < 0.5 ? C0 : k < 0.8 ? C1 : C3) : (k < 0.4 ? C1 : C3); ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); break;
            case 'smoke': { ctx.fillStyle = k < 0.5 ? C3 : C4; const r = f.r * (1 + k), R = Math.ceil(r), cx = Math.round(f.x), cy = Math.round(f.y), ph = (k > 0.5 ? 1 : 0);
              for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r && ((cx + dx + cy + dy + ph) & 1) === 0 && (k < 0.7 || ((dx + 3 * dy) & 3) === 0)) ctx.fillRect(cx + dx, cy + dy, 1, 1);
              break; }
            case 'bub': ctx.fillStyle = C2; ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1); break;
            case 'splash': { ctx.fillStyle = C0; const hgt = Math.sin(k * Math.PI) * 9; ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y - hgt), 1, Math.round(hgt)); ctx.fillRect(Math.round(f.x) + 1, Math.round(f.y - hgt * 0.7), 1, Math.round(hgt * 0.7)); ctx.fillStyle = C2; ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y), 7, 1); break; }
            case 'crate': ctx.fillStyle = C1; ctx.fillRect(Math.round(f.x), Math.round(f.y), 3, 3); ctx.fillStyle = C4; ctx.fillRect(Math.round(f.x) + 1, Math.round(f.y) + 1, 1, 1); break;
          }
        }
      }
      function waves(ctx, y0, y1, speed, dense) {
        for (let y = y0; y < y1; y += 3) {
          const depth = (y - y0) / Math.max(1, y1 - y0);
          const len = 2 + Math.round(depth * 5), gap = 10 + Math.round(depth * 12);
          const off = ((t * speed * (0.4 + depth) + y * 7.3) % gap + gap) % gap;
          ctx.fillStyle = depth < 0.3 ? C5 : depth < 0.7 ? C4 : C3;
          for (let x = -gap + off; x < W; x += gap) ctx.fillRect(Math.round(x + Math.sin(y * 0.7) * 3), y, len, 1);
          if (dense) { ctx.fillStyle = C5; for (let x = -gap + (off * 1.7) % gap; x < W; x += gap) ctx.fillRect(Math.round(x + gap / 2), y + 1, 1, 1); }
        }
      }

      // ---------- harbour scene ----------
      const RIDGE = [[0, 142], [22, 130], [46, 120], [70, 103], [92, 90], [116, 79], [128, 76], [140, 82], [156, 94], [174, 99], [194, 96], [214, 106], [240, 118], [266, 125], [292, 134], [320, 141]];
      const ridgeY = x => { for (let i = 1; i < RIDGE.length; i++) if (x <= RIDGE[i][0]) { const a = RIDGE[i - 1], b = RIDGE[i], k = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k + Math.sin(x * 0.31) * 1.2 + Math.sin(x * 0.09) * 2; } return 141; };
      const BLD = []; { let x = 4; let s = 17; while (x < 316) { s = (s * 9301 + 49297) % 233280; const w = 10 + (s % 14), hgt = 6 + (s % 11); BLD.push([x, w, hgt, s]); x += w + 1 + (s % 3); } }
      const PEAK = (() => {
        const [c, x] = mk(W, 170);
        for (let X = 0; X < W; X++) {
          const y = Math.round(ridgeY(X));
          for (let yy = y + 1; yy < 168; yy++) if (((X + yy) & 1) === 0 || yy > 150) { x.fillStyle = yy > 150 ? C6 : C5; x.fillRect(X, yy, 1, 1); }
          x.fillStyle = C3; x.fillRect(X, y, 1, 1);
        }
        // Victoria waterfront: godowns and hongs with lamp-lit windows
        for (const [bx, w, hgt, s] of BLD) {
          const top = 168 - hgt;
          x.fillStyle = '#05200e'; x.fillRect(bx, top, w, hgt);
          x.fillStyle = C3; x.fillRect(bx, top, w, 1);
          if (s % 4 === 0) { x.fillRect(bx + 1, top - 2, w - 2, 1); x.fillRect(bx + 2, top - 3, w - 4, 1); }
          for (let wy = top + 3; wy < 166; wy += 4) for (let wx = bx + 2; wx < bx + w - 1; wx += 3)
            if (((wx * 7 + wy * 13 + s) % 5) < 2) { x.fillStyle = (wx + wy) % 11 === 0 ? C3 : C1; x.fillRect(wx, wy, 1, 1); }
        }
        return c;
      })();
      function harbour(ctx, dim) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        for (const s of STARS) { const tw = Math.sin(t * 2 + s[2]) > 0.6; ctx.fillStyle = s[3] ? (tw ? C1 : C3) : (tw ? C3 : C4); ctx.fillRect(s[0], s[1], 1, 1); }
        // moon
        const MX = 296, MY = 104; ctx.fillStyle = C5; disc(ctx, MX, MY, 13); ctx.fillStyle = C2; disc(ctx, MX, MY, 9); ctx.fillStyle = C1; disc(ctx, MX - 1, MY - 1, 7);
        ctx.fillStyle = C3; ctx.fillRect(MX - 4, MY - 4, 2, 2); ctx.fillRect(MX + 2, MY + 2, 2, 1); ctx.fillRect(MX, MY - 2, 1, 1);
        ctx.drawImage(PEAK, 0, 0);
        // water
        ctx.fillStyle = BG; ctx.fillRect(0, 168, W, 72);
        hline(ctx, 0, 168, W, C3);
        waves(ctx, 171, 240, 6, false);
        for (let y = 172; y < 240; y += 2) { // moon and lamp reflections
          const wob = Math.round(Math.sin(t * 3 + y * 0.6) * (1 + (y - 170) * 0.05));
          if (((y + (t * 8 | 0)) % 5) < 3) { ctx.fillStyle = y < 200 ? C1 : C2; ctx.fillRect(293 + wob, y, 5 - (y > 210 ? 2 : 0), 1); }
        }
        for (const [x, w] of BLD) if ((x * 3) % 7 < 3) for (let y = 171; y < 186; y += 3) { ctx.fillStyle = C4; ctx.fillRect(x + (w >> 1) + Math.round(Math.sin(t * 4 + y + x) * 1.2), y, 1, 1); }
        // ships at anchor
        const bob = (ph, a) => Math.round(Math.sin(t * 1.6 + ph) * a);
        ctx.drawImage(SH.tinyR, 196, 160 + bob(1, 0.6));
        ctx.drawImage(SH.tiny, 142, 156 + bob(2, 0.6));
        ctx.drawImage(SH.small, 236, 152 + bob(3, 1));
        ctx.drawImage(SH.player[0], 18, 150 + bob(0, 1.2));
        ctx.fillStyle = BG; ctx.fillRect(18, 197, 72, 3); ctx.fillRect(236, 184, 48, 2);
        hline(ctx, 16, 197, 76, C3, 3); hline(ctx, 234, 184, 52, C4, 3);
        if (dim) { ctx.fillStyle = 'rgba(1,10,4,' + dim + ')'; ctx.fillRect(0, 0, W, H); }
      }

      // ---------- screens ----------
      function renderTitle(ctx) {
        const page = ((titleT / 600) | 0) % 2;
        const push = coinOp && api.credits > 0;
        if (page === 1 && !push) { renderHowTo(ctx); }
        else {
          harbour(ctx, 0);
          ctx.fillStyle = 'rgba(1,10,4,0.72)'; ctx.fillRect(40, 8, 240, 86);
          box(ctx, 40, 8, 240, 86, C3);
          tx(ctx, 'TAIPAN!', 162, 15, C4, { center: true, scale: 4, bold: true });
          tx(ctx, 'TAIPAN!', 160, 13, C1, { center: true, scale: 4, bold: true });
          tx(ctx, 'A GAME BASED ON THE CHINA', 160, 49, C2, { center: true });
          tx(ctx, "TRADE OF THE 1800'S", 160, 59, C2, { center: true });
          tx(ctx, 'CREATED BY ART CANFIL', 160, 72, C3, { center: true });
          tx(ctx, '(C) 1982 MEGA-MICRO COMPUTERS', 160, 82, C3, { center: true });
        }
        ctx.fillStyle = 'rgba(1,10,4,0.75)'; ctx.fillRect(56, 202, 208, 34);
        if (api.credits === 0) { if (coinFlash > 0 ? blink(4) : blink(30)) tx(ctx, 'INSERT COIN', 160, 205, coinFlash > 0 ? C0 : C1, { center: true }); }
        else if (blink(20)) tx(ctx, 'PUSH START', 160, 205, C1, { center: true });
        tx(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 160, 216, C2, { center: true });
        tx(ctx, 'BEST NET WORTH ' + big(hi), 160, 227, C3, { center: true });
      }
      function renderHowTo(ctx) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        box(ctx, 6, 4, 308, 194, C3);
        tx(ctx, '{ HONG KONG, JANUARY 1860 }', 160, 10, C1, { center: true });
        const L = ['Buy cheap and sell dear in seven', 'ports of the China Seas. Repay', 'Elder Brother Wu, pay Li Yuen for', 'protection, and fight off pirates.', 'Retire a {MILLIONAIRE} in Hong Kong.'];
        L.forEach((s, i) => tx(ctx, s, 20, 26 + i * 10, C2));
        tx(ctx, '{ CONTROLS }', 160, 82, C1, { center: true });
        const K = ['{B}UY {S}ELL {V}ISIT BANK {T}RANSFER', 'SEE {W}U  {Q}UIT TRADING  {R}ETIRE', '\x18\x19 AMOUNT  \x1b\x1a DIGIT  {A} ALL', 'ENTER OK   {X} NONE   {Y}/{N} ANSWER', 'AT SEA: {F}IGHT  {R}UN  {T}HROW CARGO'];
        K.forEach((s, i) => tx(ctx, s, 20, 98 + i * 10, C2));
        tx(ctx, '{ RATINGS }', 160, 152, C1, { center: true });
        tx(ctx, 'MA TSU  MASTER TAIPAN  TAIPAN', 160, 166, C3, { center: true });
        tx(ctx, 'COMPRADORE  GALLEY HAND', 160, 176, C3, { center: true });
        // a little junk sailing along the bottom
        ctx.drawImage(SH.small, ((t * 20) % 380) - 50, 166 + Math.round(Math.sin(t * 2) * 1));
        ctx.fillStyle = BG; ctx.fillRect(0, 198, W, 4);
      }
      function renderName(ctx) {
        harbour(ctx, 0.55);
        ctx.fillStyle = BG; ctx.fillRect(28, 50, 264, 92); box(ctx, 28, 50, 264, 92, C2); box(ctx, 30, 52, 260, 88, C4);
        tx(ctx, 'TAIPAN,', 44, 64, C1);
        tx(ctx, 'WHAT WILL YOU NAME YOUR', 44, 80, C1);
        tx(ctx, 'FIRM:', 44, 98, C1);
        const buf = cmd && cmd.t === 'name' ? cmd.buf : '';
        hline(ctx, 92, 106, 22 * 8, C4, 0);
        for (let i = 0; i < 22; i++) { ctx.fillStyle = C4; ctx.fillRect(92 + i * 8, 106, 5, 1); }
        tx(ctx, buf, 92, 98, C1);
        if (blink(16) && buf.length < 22) tx(ctx, '\x7f', 92 + buf.length * 8, 98, C1);
        tx(ctx, 'TYPE A NAME, THEN PRESS ENTER', 160, 118, C3, { center: true });
        if (!buf.length) tx(ctx, '(ENTER ALONE: ' + DEFAULT_FIRM + ')', 160, 128, C4, { center: true });
      }
      function renderStart(ctx) {
        harbour(ctx, 0.55);
        ctx.fillStyle = BG; ctx.fillRect(16, 40, 288, 126); box(ctx, 16, 40, 288, 126, C2); box(ctx, 18, 42, 284, 122, C4);
        tx(ctx, 'DO YOU WANT TO START . . .', 32, 54, C1);
        const sel = cmd && cmd.t === 'pick' ? cmd.sel : 0;
        const opts = [['1) WITH CASH (AND A DEBT)', '   $400 CASH, $5000 OWED TO WU'], ['2) WITH FIVE GUNS AND NO CASH', '   (BUT NO DEBT!)']];
        opts.forEach((o, i) => {
          const y = 76 + i * 34;
          if (i === sel) { ctx.fillStyle = C1; ctx.fillRect(28, y - 2, 264, 11); tx(ctx, o[0], 40, y, BG); tx(ctx, '\x1a', 30, y, BG); }
          else tx(ctx, o[0], 40, y, C2);
          tx(ctx, o[1], 40, y + 12, i === sel ? C2 : C4);
        });
        tx(ctx, '\x18\x19 CHOOSE   ENTER CONFIRM', 160, 150, C3, { center: true });
      }

      function renderPort(ctx) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        tx(ctx, `Firm: ${S.firm}, Hong Kong`, 160, 2, C1, { center: true });
        // left box
        box(ctx, 1, 12, 208, 111, C2); hline(ctx, 1, 66, 208, C2);
        tx(ctx, 'Hong Kong Warehouse', 8, 16, C1);
        for (let i = 0; i < 4; i++) {
          tx(ctx, GOODS[i], 16, 26 + i * 10, C2); tx(ctx, String(S.hkw[i]), 128, 26 + i * 10, C1, { right: true });
          tx(ctx, GOODS[i], 16, 80 + i * 10, C2); tx(ctx, String(S.cargo[i]), 128, 80 + i * 10, C1, { right: true });
        }
        tx(ctx, 'In use:', 144, 26, C2); tx(ctx, String(inUse()), 200, 36, C1, { right: true });
        tx(ctx, 'Vacant:', 144, 46, C2); tx(ctx, String(10000 - inUse()), 200, 56, C1, { right: true });
        if (S.hold < 0) { tx(ctx, 'Hold', 8, 70, C1); tx(ctx, '{Overload}', 48, 70, blink(10) ? C1 : C2); }
        else tx(ctx, 'Hold ' + S.hold, 8, 70, C1);
        tx(ctx, 'Guns ' + S.guns, 136, 70, C1);
        tx(ctx, 'Cash: ' + big(S.cash), 4, 126, C1);
        tx(ctx, 'Bank: ' + big(S.bank), 168, 126, C1);
        // right column
        const cx = 266;
        label(ctx, 'Date', cx, 15); tx(ctx, `15 ${MONTHS[S.month - 1]} ${S.year}`, cx, 26, C1, { center: true });
        label(ctx, 'Location', cx, 41); tx(ctx, PORTS[S.port], cx, 52, C1, { center: true });
        label(ctx, 'Debt', cx, 67); tx(ctx, big(S.debt), cx, 78, S.debt > 0 && S.debt >= 10000 && blink(24) ? C2 : C1, { center: true });
        label(ctx, 'Ship status', cx, 93);
        const st = status(), crit = st < 40;
        tx(ctx, `${statusName()}:${st}`, cx, 104, C1, { center: true, inv: crit && blink(12) });
        hline(ctx, 0, 137, W, C3, 2);
        // report area
        tx(ctx, '{ ' + R.head + ' }', 4, 142, C1);
        if (R.icon && ICONS[R.icon]) { const ic = ICONS[R.icon]; const fl = R.icon === 'lantern' && Math.random() < 0.08; ctx.globalAlpha = fl ? 0.6 : 1; ctx.drawImage(ic, 306 - ic.width, 138); if (R.icon === 'lantern') ctx.drawImage(ic, 294 - ic.width, 139); ctx.globalAlpha = 1; }
        reportText(ctx, 4, 155, 7, R.side ? 26 : 40);
        if (R.side) {
          ctx.fillStyle = BG; ctx.fillRect(216, 152, 100, 46); box(ctx, 216, 152, 100, 46, C2);
          R.side.label.forEach((s, i) => tx(ctx, s, 266, 157 + i * 10, C2, { center: true }));
          tx(ctx, big(R.side.value), 266, 157 + R.side.label.length * 10 + 4, C1, { center: true });
        }
        hint(ctx, 230);
      }
      function reportText(ctx, x, y, maxLines, w) {
        const lines = R.lines.slice(-maxLines);
        lines.forEach((s, i) => tx(ctx, s, x, y + i * 10, C1));
        const n = lines.length;
        if (!cmd) return;
        if (R.pick && cmd.t === 'pick') {
          const rows = cmd.rows || 4;
          R.pick.items.forEach((it, i) => {
            const col = Math.floor(i / rows), row = i % rows, px = x + 12 + col * 152, py = y + (n + row) * 10;
            if (i === cmd.sel) { ctx.fillStyle = C1; ctx.fillRect(px - 2, py - 1, 140, 9); tx(ctx, it, px, py, BG); }
            else tx(ctx, it, px, py, i === S.port ? C3 : C2);
          });
          return;
        }
        const lastW = n ? vlen(lines[n - 1]) : 0;
        if (cmd.t === 'key' && blink(16)) {
          if (lastW + 1 < w) tx(ctx, '\x7f', x + (lastW + 1) * 8, y + (n - 1) * 10, C1);
        }
        if (cmd.t === 'num') {
          const dg = String(cmd.max).length, s = String(cmd.val).padStart(dg, '0');
          const ly = n < maxLines ? y + n * 10 : y + (n - 1) * 10;
          const lx = n < maxLines ? x + 16 : x + (lastW + 1) * 8;
          tx(ctx, '>', lx - 12, ly, C2);
          for (let i = 0; i < dg; i++) {
            const place = dg - 1 - i, lead = place >= String(cmd.val).length && place > 0;
            const active = place === cmd.place;
            if (active) { ctx.fillStyle = blink(10) ? C1 : C2; ctx.fillRect(lx + i * 8 - 1, ly - 1, 7, 9); tx(ctx, s[i], lx + i * 8, ly, BG); }
            else tx(ctx, s[i], lx + i * 8, ly, lead ? C4 : C1);
          }
        }
      }
      function hint(ctx, y) {
        if (!cmd) return;
        let h = '';
        if (cmd.t === 'num') h = '\x18\x19 AMOUNT \x1b\x1a DIGIT A:ALL ENTER:OK X:0';
        else if (cmd.t === 'pick' && R.pick) h = '\x18\x19\x1b\x1a SELECT   ENTER:SAIL   X:STAY';
        else if (cmd.t === 'key') h = cmd.keys.length === 2 && cmd.keys[0] === 'Y' ? 'PRESS Y OR N' : 'PRESS A HIGHLIGHTED LETTER';
        else if (cmd.t === 'msg' && blink(20)) h = '                                  \x1a';
        if (h) tx(ctx, h, 4, y, C3);
      }

      function renderVoyage(ctx) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        // chart
        ctx.drawImage(MAP, 1, 1);
        box(ctx, 0, 0, MW + 2, MH + 2, C2);
        const rp = vo.p0 >= 1 ? 1 : (vo.p - vo.p0) / (1 - vo.p0);
        // planned route
        for (let f = 0; f <= 1; f += 0.012) { const q = polyAt(vo.pts, f); if (f > rp) { ctx.fillStyle = C3; ctx.fillRect(Math.round(q[0]) + 1, Math.round(q[1]) + 1, 1, 1); } }
        // wake behind the ship
        const pos = polyAt(vo.pts, rp);
        if (frame % 6 === 0) { vo.wake.push([pos[0], pos[1]]); if (vo.wake.length > 60) vo.wake.shift(); }
        vo.wake.forEach((w, i) => { ctx.fillStyle = i > vo.wake.length - 12 ? C2 : C4; ctx.fillRect(Math.round(w[0]) + 1, Math.round(w[1]) + 1, 1, 1); });
        NODES.slice(0, 7).forEach((n, i) => {
          const dest = i === vo.to;
          ctx.fillStyle = dest && blink(10) ? C0 : C1; ctx.fillRect(Math.round(n[0]), Math.round(n[1]), 3, 3);
          const [lx, ly, s] = LABELS[i];
          ctx.fillStyle = BG; ctx.fillRect(lx, ly - 1, s.length * 4 + 1, 7);
          mini(ctx, s, lx + 1, ly, dest ? C1 : C2);
        });
        // ship marker
        const mx = Math.round(pos[0]) + 1, my = Math.round(pos[1]) + 1;
        if (!vo.sinking || blink(6)) {
          ctx.fillStyle = C0; ctx.fillRect(mx - 3, my, 7, 1); ctx.fillRect(mx - 2, my + 1, 5, 1); ctx.fillStyle = C1; ctx.fillRect(mx, my - 4, 1, 4); ctx.fillRect(mx + (pos[2] > 0 ? -2 : 1), my - 3, 2, 2);
        }
        // compass
        mini(ctx, 'N', 166, 186, C3); ctx.fillStyle = C3; ctx.fillRect(167, 192, 1, 10); ctx.fillRect(163, 197, 9, 1);
        // right panel
        const RX = 182;
        tx(ctx, vo.sinking ? '{ FOUNDERING }' : '{ BOUND FOR }', 251, 4, C1, { center: true });
        tx(ctx, PORTS[vo.to], 251, 16, C1, { center: true });
        tx(ctx, `15 ${MONTHS[S.month - 1]} ${S.year}`, 251, 28, C2, { center: true });
        vignette(ctx, RX, 40, 136, 104);
        tx(ctx, 'SHIP STATUS', 251, 150, C2, { center: true });
        tx(ctx, `${statusName()}:${status()}`, 251, 160, C1, { center: true });
        tx(ctx, `GUNS ${S.guns}  HOLD ${S.hold}`, 251, 174, C2, { center: true });
        tx(ctx, 'CASH ' + big(S.cash), 251, 186, C2, { center: true });
        hline(ctx, 0, 212, W, C3, 2);
        R.lines.slice(-2).forEach((s, i) => tx(ctx, s, 4, 216 + i * 10, C1));
        if (vo.flash > 0) { ctx.fillStyle = 'rgba(210,255,224,' + (vo.flash * 1.2).toFixed(2) + ')'; ctx.fillRect(RX, 40, 136, 104); }
      }
      function vignette(ctx, x0, y0, w, h) {
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
        ctx.fillStyle = vo.storm ? '#03140a' : BG; ctx.fillRect(x0, y0, w, h);
        const hz = y0 + 52;
        if (!vo.storm) {
          for (const s of STARS) if (s[1] < 50) { ctx.fillStyle = Math.sin(t * 2 + s[2]) > 0.5 ? C2 : C4; ctx.fillRect(x0 + (s[0] % w), y0 + s[1], 1, 1); }
          ctx.fillStyle = C2; disc(ctx, x0 + w - 24, y0 + 16, 6); ctx.fillStyle = C1; disc(ctx, x0 + w - 25, y0 + 15, 4);
          for (let i = 0; i < 3; i++) { const cx = x0 + ((i * 53 - t * 5) % (w + 40) + w + 40) % (w + 40) - 20, cy = y0 + 10 + i * 9; ctx.fillStyle = C5; ctx.fillRect(Math.round(cx), cy, 22, 2); ctx.fillRect(Math.round(cx) + 4, cy - 1, 12, 1); }
        } else {
          for (let i = 0; i < 6; i++) { const cx = x0 + ((i * 31 - t * 18) % (w + 40) + w + 40) % (w + 40) - 20, cy = y0 + 4 + (i % 3) * 7; ctx.fillStyle = i % 2 ? C4 : C5; ctx.fillRect(Math.round(cx), cy, 34, 4); }
          if (vo.flash > 0.1) { ctx.fillStyle = C0; let lx = x0 + 30 + (frame * 37) % 70, ly = y0; while (ly < hz) { const nx = lx + rnd(7) - 3; ctx.fillRect(nx, ly, 1, 4); lx = nx; ly += 4; } }
        }
        ctx.fillStyle = C3; ctx.fillRect(x0, hz, w, 1);
        const amp = vo.storm ? 3 : 1;
        for (let y = hz + 2; y < y0 + h; y += 3) {
          const d = (y - hz) / (y0 + h - hz), gap = 9 + Math.round(d * 12), off = ((-t * (14 + d * 30) * (vo.storm ? 2 : 1) + y * 5) % gap + gap) % gap;
          ctx.fillStyle = d < 0.4 ? C4 : C3;
          for (let x = x0 - gap + off; x < x0 + w; x += gap) ctx.fillRect(Math.round(x), y + Math.round(Math.sin(x * 0.2 + t * 3) * amp * d), 2 + Math.round(d * 4), 1);
        }
        const sink = vo.sinking || 0;
        const bob = Math.round(Math.sin(t * (vo.storm ? 4 : 2)) * amp) + Math.round(sink * 36);
        const sx = x0 + 44, sy = hz - 20 + bob;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, hz + 12 - y0); ctx.clip();
        ctx.drawImage(SH.small, sx, sy);
        ctx.restore();
        ctx.fillStyle = vo.storm ? '#03140a' : BG; ctx.fillRect(sx - 2, hz + 12, 52, 3);
        hline(ctx, sx - 4, hz + 12, 56, C2, 2);
        if (!sink) for (let i = 0; i < 4; i++) { ctx.fillStyle = C2; ctx.fillRect(sx - 6 - i * 6 - Math.round((t * 30) % 6), hz + 11 + (i & 1), 3, 1); }
        if (vo.storm) { ctx.fillStyle = C3; for (let i = 0; i < 40; i++) { const rx = x0 + ((i * 37 + t * 160) % w), ry = y0 + ((i * 53 + t * 260) % h); ctx.fillRect(Math.round(rx), Math.round(ry), 1, 3); } }
        ctx.restore();
        box(ctx, x0 - 1, y0 - 1, w + 2, h + 2, C2);
      }

      function renderBattle(ctx) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        ctx.save();
        if (B.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 6 * B.shake / 0.45), Math.round((Math.random() - 0.5) * 4 * B.shake / 0.45));
        hline(ctx, 0, 26, W, C3);
        waves(ctx, 29, 168, 10, true);
        for (let i = 0; i < 10; i++) drawEnemy(ctx, i);
        // our ship
        const pl = SH.player[status() > 66 ? 0 : status() > 33 ? 1 : 2];
        const pb = Math.round(Math.sin(t * 1.7) * 1) + Math.round(B.psink * 50);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PWL + 2); ctx.clip();
        ctx.drawImage(pl, PX, PWL - 46 + pb);
        ctx.restore();
        ctx.fillStyle = BG; ctx.fillRect(PX - 2, PWL + 2, 76, 3); hline(ctx, PX - 6, PWL + 2, 84, C2, 3); hline(ctx, PX - 2, PWL + 4, 76, C4, 2);
        if (status() < 40 && !B.psink) for (let i = 0; i < 3; i++) { ctx.fillStyle = Math.random() < 0.5 ? C1 : C0; const fx0 = PX + 20 + i * 14, fy = PWL - 14 + pb; ctx.fillRect(fx0 + rnd(3), fy - rnd(5), 1, 3); }
        drawFx(ctx);
        ctx.restore();
        if (B.flash > 0) { ctx.fillStyle = 'rgba(210,255,224,' + Math.min(0.85, B.flash * 4).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
        // header (fight_stats)
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, 25);
        tx(ctx, `${B.n} ship${B.n === 1 ? '' : 's'} attacking, Taipan!`, 4, 3, C1);
        tx(ctx, `Your orders are to: ${B.orderTxt}`, 4, 14, C2);
        tx(ctx, 'We have', 312, 3, C2, { right: true }); tx(ctx, `${S.guns} gun${S.guns === 1 ? '' : 's'}`, 312, 14, C1, { right: true });
        if (B.n > B.onScreen) tx(ctx, '+', 312, 32, blink(12) ? C1 : C3, { right: true });
        // footer
        ctx.fillStyle = BG; ctx.fillRect(0, 169, W, 71);
        hline(ctx, 0, 169, W, C3, 2);
        const lines = R.lines.slice(-4);
        lines.forEach((s, i) => tx(ctx, s, 4, 173 + i * 10, C1));
        if (cmd && cmd.t === 'key' && blink(16) && lines.length) { const lw = vlen(lines[lines.length - 1]); if (lw < 39) tx(ctx, '\x7f', 4 + (lw + 1) * 8, 173 + (lines.length - 1) * 10, C1); }
        if (cmd && cmd.t === 'num') reportTextNumOnly(ctx, lines.length);
        hline(ctx, 0, 215, W, C4, 1);
        const st = status();
        tx(ctx, 'Current seaworthiness: ', 4, 219, C2);
        tx(ctx, `${statusName()} (${st}%)`, 4 + 23 * 8, 219, C1, { inv: st < 40 && blink(12) });
        // status bar
        ctx.fillStyle = C5; ctx.fillRect(4, 231, 312, 5); ctx.fillStyle = st < 40 ? C1 : C2; ctx.fillRect(4, 231, Math.round(312 * st / 100), 5);
        for (let i = 1; i < 10; i++) { ctx.fillStyle = BG; ctx.fillRect(4 + Math.round(312 * i / 10), 231, 1, 5); }
      }
      function reportTextNumOnly(ctx, n) {
        const dg = String(cmd.max).length, s = String(cmd.val).padStart(dg, '0');
        const ly = 173 + Math.min(3, n) * 10, lx = 20;
        tx(ctx, '>', 8, ly, C2);
        for (let i = 0; i < dg; i++) {
          const place = dg - 1 - i, active = place === cmd.place, lead = place >= String(cmd.val).length && place > 0;
          if (active) { ctx.fillStyle = blink(10) ? C1 : C2; ctx.fillRect(lx + i * 8 - 1, ly - 1, 7, 9); tx(ctx, s[i], lx + i * 8, ly, BG); }
          else tx(ctx, s[i], lx + i * 8, ly, lead ? C4 : C1);
        }
        tx(ctx, '\x18\x19 \x1b\x1a  A:ALL  ENTER', 312, ly, C3, { right: true });
      }
      function drawEnemy(ctx, i) {
        const s = B.slots[i];
        if (!s.vis) return;
        const wl = SLOT_WL(i);
        let x = SLOT_X(i) + Math.round((1 - s.appear) * 30);
        const lvl = s.vis === 'sink' || s.vis === 'doomed' ? 2 : (s.hp / s.max > 0.66 ? 0 : s.hp / s.max > 0.33 ? 1 : 2);
        const set = B.id === 2 ? (s.hit > 0 ? SH.liW : SH.li) : (s.hit > 0 ? SH.enemyW : SH.enemy);
        let dy = Math.round(Math.sin(t * 1.8 + s.ph) * 1);
        if (s.vis === 'sink') dy += Math.round(Math.min(1, s.vt / 1.4) * 36);
        if (s.vis === 'flee') x += Math.round(s.vt * s.vt * 60);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 27, W, wl + 1 - 27); ctx.clip();
        ctx.drawImage(set[lvl], x, wl - 31 + dy);
        ctx.restore();
        if (s.vis === 'sink') { ctx.fillStyle = C2; for (let k = 0; k < 4; k++) ctx.fillRect(x + 6 + k * 11 + rnd(3), wl - 1 - rnd(2), 2, 1); }
        ctx.fillStyle = BG; ctx.fillRect(x - 1, wl + 1, 50, 2);
        hline(ctx, x - 4, wl + 1, 56, C3, 3);
        // hull-health pips
        if (s.vis === 'live' && s.hp > 0) { const n = Math.max(1, Math.ceil(s.hp / s.max * 5)); for (let k = 0; k < 5; k++) { ctx.fillStyle = k < n ? C2 : C5; ctx.fillRect(x + 14 + k * 4, wl + 4, 3, 1); } }
      }

      function renderRetire(ctx) {
        harbour(ctx, 0);
        drawFx(ctx, f => f.k === 'p');
        const k = Math.min(1, RET.t / 1.2);
        const bw = Math.round(260 * k);
        ctx.fillStyle = BG; ctx.fillRect(160 - bw / 2, 96, bw, 60); box(ctx, Math.round(160 - bw / 2), 96, bw, 60, C1);
        if (k >= 1) {
          tx(ctx, "{ Y o u ' r e    a }", 160, 103, C1, { center: true });
          tx(ctx, 'MILLIONAIRE!', 162, 119, C4, { center: true, scale: 2, bold: true });
          tx(ctx, 'MILLIONAIRE!', 160, 117, blink(8) ? C1 : C0, { center: true, scale: 2, bold: true });
          tx(ctx, 'NET WORTH ' + commas(net()), 160, 140, C2, { center: true });
        }
      }
      function renderFinal(ctx) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        const F = FIN;
        tx(ctx, F.retired ? '{ YOUR FINAL STATUS: RETIRED }' : '{ YOUR FINAL STATUS: LOST AT SEA }', 160, 4, C1, { center: true });
        tx(ctx, `Firm: ${S.firm}`, 160, 18, C2, { center: true });
        tx(ctx, 'Net cash:  ' + big(F.nw), 12, 30, C1);
        tx(ctx, `Ship size: ${S.capacity} units with ${S.guns} guns`, 12, 41, C1);
        tx(ctx, `You traded for ${F.years} year${F.years === 1 ? '' : 's'} and ${F.months} month${F.months === 1 ? '' : 's'}`, 12, 52, C1);
        tx(ctx, `Your score is ${commas(F.score)}.`, 12, 63, C1);
        if (F.score < 0) { tx(ctx, 'The crew has requested that you stay', 12, 75, C2); tx(ctx, 'on shore for their safety!!', 12, 85, C2); }
        else if (F.score < 100) tx(ctx, 'Have you considered a land based job?', 12, 75, C2);
        tx(ctx, 'Your Rating:', 12, 96, C1);
        box(ctx, 28, 107, 264, 58, C2);
        RATINGS.forEach((r, i) => {
          const y = 111 + i * 10, mine = i === F.rating;
          if (mine) { ctx.fillStyle = blink(14) ? C1 : C2; ctx.fillRect(31, y - 1, 258, 9); }
          tx(ctx, r[0], 36, y, mine ? BG : C2); tx(ctx, r[1], 284, y, mine ? BG : C3, { right: true });
        });
        tx(ctx, 'NET WORTH  ' + commas(F.nw), 160, 176, C1, { center: true });
        if (F.newHi && F.nw > 0) tx(ctx, '{ NEW BEST NET WORTH! }', 160, 188, blink(10) ? C1 : C2, { center: true });
        else tx(ctx, 'BEST NET WORTH  ' + commas(hi), 160, 188, C3, { center: true });
        if (F.t > 1.5 && blink(20)) tx(ctx, 'PRESS ENTER', 160, 214, C2, { center: true });
        tx(ctx, 'GAME OVER', 160, 226, C3, { center: true });
      }

      if (DBG) { DBG.S = () => S; DBG.state = () => ({ mode, scr, cmd: cmd && cmd.t, keys: cmd && cmd.keys, lines: R.lines.slice(), head: R.head }); DBG.setS = o => Object.assign(S, o); }

      return {
        update(dt) {
          frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
          animate(dt);
          if (mode === 'title') {
            titleT++;
            if ((api.pressed('Enter') || (titleT > 30 && api.pressed('Space'))) && tryStart()) startGame();
            return;
          }
          if (cmd) stepCmd(dt);
        },
        render(ctx) {
          ctx.imageSmoothingEnabled = false;
          try {
            if (mode === 'title') renderTitle(ctx);
            else if (scr === 'name') renderName(ctx);
            else if (scr === 'start') renderStart(ctx);
            else if (scr === 'port' && S) renderPort(ctx);
            else if (scr === 'voyage' && vo) renderVoyage(ctx);
            else if (scr === 'battle' && B) renderBattle(ctx);
            else if (scr === 'retire') renderRetire(ctx);
            else if (scr === 'final' && FIN) renderFinal(ctx);
            else if (S) renderPort(ctx);
          } catch (e) { console.error(e); }
        },
        destroy() { gen = null; }
      };
    }
  });
})();
