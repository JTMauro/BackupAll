// Pole Position (Namco, 1982) \u2014 pseudo-3D racer at Fuji Speedway. Segment-projection road with
// curves and hills, scanline-filled for crisp arcade pixels; qualifying lap then a 4-lap race.
(function () {
  'use strict';
  // ---------- compact 5x7 bitmap font ----------
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
    '"': [10, 10, 20, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2],
    '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // col: css colour or array of 7 per-row colours (gradient lettering)
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let r = 0; r < 7; r++) {
      ctx.fillStyle = typeof col === 'string' ? col : col[r];
      for (let i = 0; i < s.length; i++) {
        const g = FONT[s[i]]; if (!g) continue;
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
    return w;
  }
  function textS(ctx, s, x, y, col, sc, align) { // with 1px drop shadow / outline
    sc = sc || 1;
    text(ctx, s, x + 1, y + 1, '#000', sc, align);
    if (sc > 1) { text(ctx, s, x - 1, y, '#000', sc, align); text(ctx, s, x + 1, y, '#000', sc, align); text(ctx, s, x, y - 1, '#000', sc, align); text(ctx, s, x, y + sc, '#000', sc, align); }
    return text(ctx, s, x, y, col, sc, align);
  }

  // ---------- helpers ----------
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function paint(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const [c, x] = mkCanvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][i]; const col = pal[ch];
      if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
    }
    return c;
  }
  let seed = 12345;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
  function vnoise(x) { const i = Math.floor(x), f = x - i; const a = hash(i), b = hash(i + 1); const t = f * f * (3 - 2 * f); return a + (b - a) * t; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- F1 car (rear view), left half mirrored; front layer is shifted for steering frames ----------
  const CAR_REAR = [
    '........Rwwwwwwwwwwwwwww',
    '........Rrrrrrrrrrrrrrrr',
    '........Rrrwwwwwwwwwwwww',
    '........RRRRRRRRRRRRRRRR',
    '...............d.....yyy',
    '...............d....Rbbb',
    '.kkkkkkk.......d...Rrryy',
    'kGgkkkkkk.....Rrrrrrrrrr',
    'kGgkkkkkk.....Rrrrrrrrrr',
    'kGgkkkkkk....RRrrrrwwwww',
    'kGgkkkkkk...RRrrrrrwwwww',
    'kGgkkkkkk..RRrrrrrrrrrrr',
    'kGgkkkkkkRRRrrrrrrrrrrrr',
    'kGgkkkkkkRrrrrrrrrrrrrrr',
    'kGgkkkkkkRrrrrrrrrrrrrrr',
    'kGgkkkkkkRRRRRRRRRRRRRRR',
    'kGgkkkkkk.dddddddRRRRRRR',
    'kGgkkkkkk.ddddddddddddoo',
    'kGgkkkkkk..ddddddddddddo',
    'kGgkkkkkk...ddddddddsddd',
    '.kkkkkkk......dddddddddd',
    '..zzzzzzzzzzzzzzzzzzzzzz'
  ];
  const CAR_FRONT = [
    '........................', '........................', '........................',
    '.........kkkkk..........',
    '........kGgkkkk.........', '........kGgkkkk.........', '........kGgkkkk.........', '........kGgkkkk.........',
    '........kGgkkkk.........', '........kGgkkkk.........', '........kGgkkkk.........',
    '.........kkkkk..........'
  ];
  function mirror(r) { r = (r + '........................').slice(0, 24); return r + r.split('').reverse().join(''); }
  function makeCar(body, dark, accent, helmet, stripe, brake, steer) {
    const pal = { r: body, R: dark, w: accent, y: helmet, b: stripe, k: '#141414', G: '#a8a8a8', g: '#585858', d: '#34343c', s: '#c8c8c8', o: brake ? '#ff3818' : '#901808', z: 'rgba(0,0,0,0.38)' };
    const W = 56, H = CAR_REAR.length;
    const [c, x] = mkCanvas(W, H);
    const front = paint(CAR_FRONT.map(mirror), pal), rear = paint(CAR_REAR.map(mirror), pal);
    const sh = steer * 2;
    x.drawImage(front, 4 + sh, 0);
    // when steering hard the body yaws a little: shift the wing/helmet rows by one pixel
    if (Math.abs(steer) === 2) {
      x.drawImage(rear, 0, 0, 48, 7, 4 + Math.sign(steer), 0, 48, 7);
      x.drawImage(rear, 0, 7, 48, H - 7, 4, 7, 48, H - 7);
    } else x.drawImage(rear, 4, 0);
    return c;
  }

  // ---------- registration ----------
  ArcadeRegistry.register({
    id: 'poleposition', title: 'Pole Position', year: 1982, maker: 'Namco',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Up/Space: gas \u00b7 Down: brake \u00b7 Left/Right: steer \u00b7 X: gear LO/HI \u00b7 Enter: start',
    marquee: { bg: '#0a2a8a', fg: '#ffd800', accent: '#e8201c' },
    create(api) {
      const W = 256, H = 224;
      const SEG = 200, ROAD_W = 1000, CAM_H = 1000, CAM_D = 0.84, PLAYER_Z = CAM_H * CAM_D;
      const DRAW = 200, RUMBLE = 3;
      const XS = 128, CY = 80, YS = (H - CY) / (CAM_D / PLAYER_Z * CAM_H);
      const MAXV = SEG * 60;             // world units / s at top speed
      const LOW_MAX = 0.6;               // low gear top speed fraction
      const CAR_WW = 380;                // car world width
      const PHALF = CAR_WW / 2 / ROAD_W; // player half width in road units
      const LAPS = 4;
      const audio = api.audio;

      // ---------- sprites ----------
      const PLAYER = {}; // key steer|brake
      for (let s = -2; s <= 2; s++) for (const b of [0, 1]) PLAYER[s + '|' + b] = makeCar('#e81c1c', '#981010', '#f4f4f4', '#ffd820', '#2040c0', b, s);
      const RIVAL_COLS = [
        ['#2058e8', '#10309a', '#f0f0f0', '#f0f0f0', '#e02020'], ['#f8c818', '#a87808', '#202020', '#e02020', '#fff'],
        ['#18b040', '#0c6424', '#f0f0f0', '#ffd820', '#202020'], ['#f07010', '#a04008', '#202060', '#f4f4f4', '#2040c0'],
        ['#e8e8e8', '#8c8c8c', '#e02020', '#2050e0', '#ffd820'], ['#a038d8', '#601890', '#ffd820', '#f0f0f0', '#e02020'],
        ['#18c0d0', '#0c7080', '#f0f0f0', '#e02020', '#202020']
      ];
      const RIVALS = RIVAL_COLS.map(c => [-1, 0, 1].map(s => makeCar(c[0], c[1], c[2], c[3], c[4], 0, s)));

      function billboard(bg, fg, str, stripe) {
        const [c, x] = mkCanvas(60, 40);
        // posts
        x.fillStyle = '#5a5a5a'; x.fillRect(9, 24, 3, 16); x.fillRect(48, 24, 3, 16);
        x.fillStyle = '#9a9a9a'; x.fillRect(9, 24, 1, 16); x.fillRect(48, 24, 1, 16);
        // board
        x.fillStyle = '#202020'; x.fillRect(0, 0, 60, 27);
        x.fillStyle = '#f0f0f0'; x.fillRect(1, 1, 58, 25);
        x.fillStyle = bg; x.fillRect(2, 2, 56, 23);
        if (stripe) { x.fillStyle = stripe; x.fillRect(2, 19, 56, 3); x.fillRect(2, 5, 56, 1); }
        text(x, str, 30, 9, fg, 1, 'center');
        x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(2, 2, 56, 2);
        return c;
      }
      const BOARDS = [
        billboard('#e81c1c', '#fff', 'FUJI', '#ffd820'), billboard('#ffd820', '#c00000', 'POLE', '#c00000'),
        billboard('#2050d8', '#fff', 'TURBO', '#ffd820'), billboard('#f4f4f4', '#2050d8', 'NAMCO', '#e81c1c'),
        billboard('#181818', '#ffd820', 'SPEED', '#e81c1c'), billboard('#18a040', '#fff', 'GRAND', '#fff'),
        billboard('#f07010', '#fff', 'OIL', '#181818'), billboard('#f4f4f4', '#181818', 'TIRES', '#18a040')
      ];
      function chevron(dir) {
        const [c, x] = mkCanvas(24, 26);
        x.fillStyle = '#5a5a5a'; x.fillRect(11, 14, 2, 12);
        x.fillStyle = '#202020'; x.fillRect(0, 0, 24, 15);
        x.fillStyle = '#e81c1c'; x.fillRect(1, 1, 22, 13);
        x.fillStyle = '#fff';
        for (let k = 0; k < 2; k++) for (let r = 0; r < 11; r++) {
          const d = Math.abs(r - 5); const cx = 6 + k * 9 + (dir > 0 ? d : -d) - (dir > 0 ? 3 : -3);
          x.fillRect(cx, 2 + r, 3, 1);
        }
        return c;
      }
      const CHEV_R = chevron(1), CHEV_L = chevron(-1);
      function gantry() {
        const [c, x] = mkCanvas(160, 60);
        x.fillStyle = '#707070'; x.fillRect(3, 6, 6, 54); x.fillRect(151, 6, 6, 54);
        x.fillStyle = '#b0b0b0'; x.fillRect(3, 6, 2, 54); x.fillRect(151, 6, 2, 54);
        x.fillStyle = '#202020'; x.fillRect(0, 4, 160, 22);
        for (let i = 0; i < 80; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) & 1 ? '#fff' : '#111'; x.fillRect(i * 2, 4 + j * 2, 2, 2); x.fillRect(i * 2, 22 + j * 2, 2, 2); }
        x.fillStyle = '#e81c1c'; x.fillRect(0, 8, 160, 14);
        text(x, 'START', 80, 11, '#fff', 1, 'center');
        text(x, 'FUJI', 22, 11, '#ffd820', 1, 'center'); text(x, 'FUJI', 138, 11, '#ffd820', 1, 'center');
        return c;
      }
      const GANTRY = gantry();
      function grandstand() {
        const [c, x] = mkCanvas(128, 48);
        seed = 777;
        x.fillStyle = '#3a3a48'; x.fillRect(0, 0, 128, 6);
        x.fillStyle = '#6a6a80'; x.fillRect(0, 6, 128, 2);
        for (let r = 0; r < 9; r++) {
          const y = 9 + r * 4;
          x.fillStyle = r & 1 ? '#8a8a8a' : '#7a7a7a'; x.fillRect(0, y, 128, 4);
          for (let i = 1; i < 127; i += 2) {
            if (rnd() < 0.8) {
              x.fillStyle = ['#f0d0a0', '#e0b080', '#a07050', '#f0f0f0', '#e02020', '#2050e0', '#ffd820', '#18a040'][Math.floor(rnd() * 8)];
              x.fillRect(i, y, 1, 2);
              x.fillStyle = ['#202020', '#5a3a20', '#e8e8e8', '#e02020', '#2050e0'][Math.floor(rnd() * 5)]; x.fillRect(i, y + 2, 1, 1);
            }
          }
        }
        x.fillStyle = '#505060'; for (let i = 0; i < 128; i += 21) x.fillRect(i, 6, 2, 42);
        x.fillStyle = '#e8e8e8'; x.fillRect(0, 45, 128, 3);
        return c;
      }
      const STAND = grandstand();
      function tree() {
        const [c, x] = mkCanvas(20, 32);
        x.fillStyle = '#5a3818'; x.fillRect(9, 22, 3, 10);
        for (let y = 0; y < 26; y++) {
          const half = Math.min(9, 1 + y * 0.45 + (y % 6 > 3 ? -1.5 : 0));
          for (let i = -Math.floor(half); i <= half; i++) {
            const shade = i < -half * 0.3 ? '#2c8030' : i > half * 0.4 ? '#14481c' : '#1f6a28';
            x.fillStyle = (hash(y * 31 + i) < 0.15) ? '#3a9a3c' : shade; x.fillRect(10 + i, y, 1, 1);
          }
        }
        return c;
      }
      const TREE = tree();
      // explosion frames (pixel-wise flame noise)
      const EXPL = [];
      for (let f = 0; f < 10; f++) {
        const [c, x] = mkCanvas(64, 56);
        const t = f / 9;
        const R = 8 + 24 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) * (t > 0.7 ? 1 - (t - 0.7) * 1.2 : 1);
        for (let y = 0; y < 56; y++) for (let i = 0; i < 64; i++) {
          const dx = i - 32, dy = (y - 40) * 1.2;
          const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
          const jag = (vnoise(a * 3 + 10 + f * 0.7) - 0.5) * R * 0.7 + (hash(i * 7 + y * 13 + f) - 0.5) * 3;
          const rr = R + jag;
          if (d < rr && y < 54) {
            const q = d / rr; let col;
            const smoke = t > 0.45 && dy < -R * (0.9 - t * 0.8) && hash((i >> 1) * 3 + (y >> 1) * 5) < 0.4 + t * 0.6;
            if (smoke) col = vnoise(i * 0.35 + y * 0.6 + f) < 0.5 ? '#3a3030' : '#605858';
            else if (q < 0.3 - t * 0.2) col = '#fffbe0';
            else if (q < 0.55 - t * 0.15) col = '#ffe838';
            else if (q < 0.8) col = '#ff9018';
            else col = t > 0.6 ? '#802010' : '#e02810';
            x.fillStyle = col; x.fillRect(i, y, 1, 1);
          } else if (d < rr + 10 && hash(i * 11 + y * 17 + f * 3) < 0.03 * (1 - t)) {
            x.fillStyle = '#ffe838'; x.fillRect(i, y, 1, 1);
          }
        }
        EXPL.push(c);
      }
      // blimp
      const BLIMP = paint([
        '..........kkkkkkkkkkkkkkk..........',
        '......kkkkWWWWWWWWWWWWWWWkkkk.....k',
        '....kkWWWWWWWWWWWWWWWWWWWWWWWkk..kk',
        '...kWWWWWWWWWWWWWWWWWWWWWWWWWWWkkRk',
        '..kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWkRk',
        '.kWWRRRRRRRRRRRRRRRRRRRRRRRRRRWWWRk',
        'kWWWRRRRRRRRRRRRRRRRRRRRRRRRRRWWWWk',
        'kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWRk',
        '.kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWkRk',
        '..kSSSSSSSSSSSSSSSSSSSSSSSSSSSSkkRk',
        '...kkSSSSSSSSSSSSSSSSSSSSSSSSkk.kkk',
        '.....kkkkkkkkkkkkkkkkkkkkkkkkk....k',
        '..............kYYYYk...............',
        '..............kkkkkk...............'
      ], { k: '#202020', W: '#f0f0f0', S: '#a8a8b8', R: '#e81c1c', Y: '#ffd820' });

      // ---------- backdrop: sky, Mt. Fuji, far range, clouds, near treeline ----------
      const BGW = 512;
      const SKY = (() => {
        const [c, x] = mkCanvas(W, CY + 2);
        const bands = ['#1840c8', '#2050d8', '#2860e0', '#3070e8', '#3c80f0', '#4c90f4', '#60a0f8', '#78b4fc'];
        const bh = (CY + 2) / bands.length;
        for (let y = 0; y < CY + 2; y++) {
          const b = y / bh, i = Math.floor(b), f = b - i;
          for (let k = 0; k < W; k++) {
            const nb = (f > 0.75 && ((k + y) & 1)) ? Math.min(bands.length - 1, i + 1) : i;
            x.fillStyle = bands[nb]; x.fillRect(k, y, 1, 1);
          }
        }
        return c;
      })();
      const FAR = (() => {
        const BH = 64;
        const [c, x] = mkCanvas(BGW, BH);
        // clouds
        seed = 4242;
        for (let n = 0; n < 7; n++) {
          const cx = n * 73 + rnd() * 40, cy = 6 + rnd() * 14, cw = 18 + rnd() * 26;
          for (let y = -8; y < 6; y++) for (let i = -cw; i < cw; i++) {
            const px = Math.floor(cx + i), py = Math.floor(cy + y);
            const u = i / cw, v = y / 6;
            const top = -0.35 - 0.6 * (vnoise(i * 0.18 + n * 9) * (1 - u * u));
            if (v < 0.9 && v > top * 1.4 && u * u + Math.max(0, v) * 0.3 < 1 && py >= 0) {
              x.fillStyle = v > 0.45 ? '#b8d4f8' : v > 0.0 ? '#e0ecfc' : '#ffffff';
              x.fillRect(((px % BGW) + BGW) % BGW, py, 1, 1);
            }
          }
        }
        // far mountain range
        for (let i = 0; i < BGW; i++) {
          const a = i / BGW * Math.PI * 2;
          const h = 12 + 5 * Math.sin(a * 3 + 1) + 4 * Math.sin(a * 7 + 2) + 3 * vnoise(i * 0.08) + 1.5 * vnoise(i * 0.4);
          for (let y = Math.floor(BH - h); y < BH; y++) {
            const lit = y < BH - h + 2;
            x.fillStyle = lit ? '#8890c8' : ((i + y) & 1) && y < BH - h + 5 ? '#6a74b0' : '#5860a0';
            x.fillRect(i, y, 1, 1);
          }
        }
        // Mt. Fuji
        const fx = 150, peakY = 10, half = 120, flat = 7;
        for (let i = fx - half; i <= fx + half; i++) {
          const dx = Math.abs(i - fx);
          const u = Math.max(0, (dx - flat) / (half - flat));
          const top = peakY + (BH - peakY) * (1 - Math.pow(1 - u, 2.2)) + (dx < flat ? (hash(i) < 0.5 ? 1 : 0) : 0);
          const snowLine = peakY + 9 + 7 * vnoise(i * 0.35) + (Math.floor(i / 3) % 2 ? 4 * vnoise(i * 0.9) : 0) + u * 10;
          for (let y = Math.floor(top); y < BH; y++) {
            const right = i > fx;
            const ridge = (Math.abs(((i - fx) * 0.9 + (y - peakY) * 0.6) % 14) < 1) && y > snowLine + 2;
            let col;
            if (y < snowLine) col = right ? '#c8d0ec' : '#ffffff';
            else if (y < snowLine + 2 && hash(i * 3 + y) < 0.5) col = right ? '#a8b0d8' : '#e0e4f4';
            else col = ridge ? (right ? '#34488a' : '#4a62a8') : (right ? '#3e5498' : '#5670b8');
            x.fillStyle = col; x.fillRect(i, y, 1, 1);
          }
        }
        return c;
      })();
      const NEAR = (() => {
        const BH = 18;
        const [c, x] = mkCanvas(BGW, BH);
        for (let i = 0; i < BGW; i++) {
          const a = i / BGW * Math.PI * 2;
          const base = 6 + 3 * Math.sin(a * 4) + 2 * Math.sin(a * 9 + 1);
          const treeBump = 3 * Math.abs(Math.sin(i * 0.55)) * vnoise(i * 0.13) + 2 * vnoise(i * 0.6);
          const h = base + treeBump;
          for (let y = Math.floor(BH - h); y < BH; y++) {
            const d = y - (BH - h);
            x.fillStyle = d < 1 ? '#3c9a40' : (hash(i * 5 + y * 3) < 0.25 ? '#1c5c22' : (d < 4 ? '#2a7c30' : '#226c28'));
            x.fillRect(i, y, 1, 1);
          }
        }
        return c;
      })();

      // ---------- track ----------
      const segs = [];
      function lastY() { return segs.length ? segs[segs.length - 1].y2 : 0; }
      const easeIn = (a, b, p) => a + (b - a) * p * p;
      const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
      function addSeg(curve, y) {
        const n = segs.length;
        segs.push({ i: n, curve, y1: lastY(), y2: y, light: Math.floor(n / RUMBLE) % 2 === 0, sprites: [], p1: {}, p2: {}, clip: H });
      }
      function addRoad(enter, hold, leave, curve, dh) {
        const y0 = lastY(), y1 = y0 + (dh || 0) * SEG, total = enter + hold + leave;
        for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(y0, y1, n / total));
        for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(y0, y1, (enter + n) / total));
        for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(y0, y1, (enter + hold + n) / total));
      }
      const curveMarks = [];
      function curve(e, h, l, c, dh) { curveMarks.push([segs.length, e + h, c]); addRoad(e, h, l, c, dh); }
      // Fuji Speedway (as stylised by Pole Position): long main straight, sharp right at turn 1,
      // sweeping lefts and the 100R, a hairpin, esses and the long final right-hander.
      addRoad(0, 260, 0, 0, 0);
      curve(30, 50, 30, 6.0, 0);
      addRoad(0, 60, 0, 0, 12);
      curve(40, 70, 40, -3.0, 20);
      addRoad(20, 60, 20, 0, -18);
      curve(50, 150, 50, 3.6, -10);
      addRoad(0, 90, 0, 0, -26);
      curve(25, 45, 25, -6.5, 0);
      addRoad(0, 70, 0, 0, 22);
      curve(25, 35, 25, 4.2, 0);
      curve(25, 35, 25, -4.2, 0);
      curve(20, 30, 20, 3.0, 10);
      addRoad(0, 110, 0, 0, 30);
      curve(40, 130, 40, 4.6, -20);
      addRoad(0, 60, 0, 0, 0);
      addRoad(40, 110, 40, 0, -lastY() / SEG);   // back to level for the start/finish
      addRoad(0, 60, 0, 0, 0);
      const N = segs.length, TRACK = N * SEG;
      const HALF = Math.floor(N / 2);
      // scenery
      function spr(n, img, off, ww, collide) { if (n >= 0 && n < N) segs[n].sprites.push({ img, off, ww, collide: collide !== false }); }
      spr(6, GANTRY, 0, ROAD_W * 2.6, false);
      for (let n = 14; n < 200; n += 46) spr(n, STAND, -3.4, 4200, true);
      for (let n = 30; n < N - 10; n += 9) {
        const near = curveMarks.some(([s, len]) => n >= s - 25 && n < s + len);
        if (near) continue;
        const side = (n / 9) & 1 ? 1 : -1;
        if (n > 240 && hash(n) < 0.33) spr(n, TREE, side * (2.3 + hash(n + 3) * 1.5), 700, true);
        else spr(n, BOARDS[Math.floor(n / 9) % BOARDS.length], side * 1.95, 1150, true);
      }
      for (const [s, len, c] of curveMarks) {
        const side = c > 0 ? 1 : -1; // outside of the turn gets the chevrons
        for (let n = s - 20; n < s + len; n += 5) spr(n, c > 0 ? CHEV_R : CHEV_L, -side * 1.55, 520, true);
        for (let n = s - 20; n < s + len; n += 10) spr(n + 2, BOARDS[(n >> 3) % BOARDS.length], side * 2.1, 1150, true);
      }
      const PAR = TRACK / MAXV;            // seconds for a flat-out lap
      const GOOD = PAR * 1.22;             // a well-driven lap
      const QUAL_LIMIT = Math.round(GOOD * 1.3);
      const QUAL_TIMES = [1.0, 1.04, 1.08, 1.12, 1.16, 1.2, 1.25].map(k => GOOD * k);
      const QUAL_BONUS = [4000, 2000, 1400, 1000, 800, 600, 400, 200];
      const RACE_TIME = Math.round(GOOD * 1.45);
      const EXT_TIME = Math.round(GOOD * 0.75);

      // ---------- state ----------
      let hi = api.getHiScore(30000);
      let mode = 'title', demo = true, modeT = 0;
      let pos = 0, wraps = 0, px = 0, speed = 0, gear = 0, steerHold = 0, steerDir = 0, crashT = 0, braking = false;
      let score = 0, ptsAcc = 0, timeLeft = 0, lapClock = 0, lapsDone = 0, lastLap = 0, qualPos = 8, qualTime = 0;
      let bgFar = 0, bgNear = 0, shake = 0, raceGo = false, countdown = 0, rank = 8, bonusLeft = 0;
      let cars = [];
      let msg = null, blimp = null;
      let engineTick = 0, skidTick = 0, passFlash = 0;
      let coinFlash = 0;   // coin-op: INSERT COIN flash after a start attempt with no credit

      function say(t, frames, col) { msg = { t, f: frames || 150, col: col || '#ffd820' }; }
      function launchBlimp(t) { blimp = { x: W + 10, t }; }
      function voice(kind) {
        // stand-in for the famous speech: a short "announcer" chime
        if (kind === 'qualify') audio.melody([[392, .12], [523, .12], [659, .12], [784, .28]], { type: 'triangle', vol: 0.18 });
        else if (kind === 'race') audio.melody([[523, .12], [659, .12], [784, .12], [1047, .3]], { type: 'square', vol: 0.12 });
      }
      function pdist() { return wraps * TRACK + pos; }
      function segAt(z) { return segs[Math.floor(((z % TRACK) + TRACK) % TRACK / SEG) % N]; }
      function rel(d) { return ((d % TRACK) + TRACK * 1.5) % TRACK - TRACK / 2; }

      function resetDrive(startSeg) {
        pos = startSeg * SEG - PLAYER_Z; wraps = 0; px = 0; speed = 0; gear = 0; crashT = 0; steerHold = 0;
        if (pos < 0) { pos += TRACK; wraps = -1; }
      }
      function startTitle() {
        mode = 'title'; demo = true; modeT = 0; msg = null; blimp = null;
        resetDrive(20); gear = 1; speed = MAXV * 0.3;
        cars = []; for (let k = 0; k < 6; k++) cars.push(newCar(k, (60 + k * 90) * SEG, [-0.55, 0, 0.55][k % 3], 0.7 + 0.03 * k));
        raceGo = true;
      }
      function newCar(k, d, off, topFrac) {
        return { col: k % RIVALS.length, d, off, lane: off, speed: 0, top: MAXV * topFrac, prevRel: 0, steer: 0 };
      }
      function startQualify() {
        demo = false; mode = 'qual'; modeT = 0; score = 0; ptsAcc = 0;
        resetDrive(10);
        timeLeft = QUAL_LIMIT; lapClock = 0; lapsDone = 0;
        cars = [];
        for (let k = 0; k < 4; k++) { const c = newCar(k + 1, (120 + k * 320) * SEG, [-0.55, 0.55, 0, -0.55][k], 0.62 + k * 0.03); c.speed = c.top; cars.push(c); }
        raceGo = true;
        launchBlimp('PREPARE TO QUALIFY'); say('PREPARE TO QUALIFY', 200); voice('qualify');
      }
      function gridZ(k) { return (24 + (8 - k) * 4) * SEG; }
      function startRace() {
        mode = 'grid'; modeT = 0;
        resetDrive(0); pos = gridZ(qualPos) - PLAYER_Z; px = qualPos % 2 ? -0.42 : 0.42;
        cars = []; let ci = 0;
        for (let k = 1; k <= 8; k++) {
          if (k === qualPos) continue;
          const c = newCar(ci++, gridZ(k), k % 2 ? -0.42 : 0.42, 0.84 - (k - 1) * 0.025 + hash(k) * 0.02);
          cars.push(c);
        }
        raceGo = false; countdown = 0; timeLeft = RACE_TIME; lapClock = 0; lapsDone = 0;
        launchBlimp('PREPARE TO RACE'); say('PREPARE TO RACE', 170); voice('race');
      }
      startTitle();
      const DEBUG = (typeof location !== 'undefined' && (location.search.match(/[?&]debug=(\w+)/) || [])[1]) || '';
      if (DEBUG === 'race') { qualPos = 5; demo = false; score = 0; startRace(); }

      function crash() {
        if (crashT > 0) return;
        crashT = 130; shake = 20;
        audio.noise(1.4, { vol: 0.5, freq: 1800, slideTo: 80 });
        audio.tone(90, 0.8, { type: 'sawtooth', vol: 0.2, slideTo: 30 });
        audio.noise(0.4, { vol: 0.35, freq: 5000, type: 'highpass', delay: 0.05 });
      }

      // ---------- player physics ----------
      function updatePlayer(dt, inp) {
        const pseg = segAt(pos + PLAYER_Z);
        const sp = speed / MAXV;
        if (crashT > 0) {
          crashT--; speed = Math.max(0, speed - MAXV * dt * 2);
          if (crashT === 0) {
            px = 0; speed = 0; gear = 0;
            const pd = pdist() + PLAYER_Z;
            for (const c of cars) { const r = rel(c.d - pd); if (r > -SEG * 3 && r < SEG * 5) c.d += SEG * 8; }
          }
        } else {
          const dx = dt * 2.1 * Math.min(1, sp * 1.4 + 0.1);
          if (inp.left) px -= dx * (sp > 0.02 ? 1 : 0);
          if (inp.right) px += dx * (sp > 0.02 ? 1 : 0);
          px -= dx * sp * pseg.curve * 0.26;
          if (inp.gearToggle) { gear ^= 1; audio.tone(gear ? 180 : 120, 0.06, { type: 'square', vol: 0.12 }); }
          braking = inp.brake;
          let acc = 0;
          if (inp.gas) {
            if (gear === 0) acc = sp < LOW_MAX ? 0.32 * (1.1 - sp * 0.6) : -0.15;
            else acc = sp < 0.35 ? 0.05 : 0.15 * (1.2 - sp * 0.65);
          } else acc = -0.12;
          if (inp.brake) acc = -0.9;
          speed += acc * MAXV * dt;
          const off = Math.abs(px) > 1;
          if (off && speed > MAXV * 0.32) { speed -= MAXV * dt * 0.9; shake = Math.max(shake, 2); }
          speed = clamp(speed, 0, MAXV);
          px = clamp(px, -2.6, 2.6);
          // roadside objects
          if (Math.abs(px) > 1.05) {
            for (const s2 of [pseg, segs[(pseg.i + 1) % N]]) for (const s of s2.sprites) {
              if (!s.collide) continue;
              const hw = s.ww / 2 / ROAD_W * 0.8;
              if (Math.abs(px - s.off) < hw + PHALF) { crash(); break; }
            }
          }
          // skid sound in hard corners
          if (sp > 0.6 && Math.abs(pseg.curve) > 3 && (inp.left || inp.right) && ++skidTick % 7 === 0) audio.noise(0.12, { vol: 0.08, freq: 2500, type: 'bandpass' });
          if (off && speed > 0 && api.frame % 8 === 0) audio.noise(0.1, { vol: 0.12, freq: 300 });
        }
        // move & lap/checkpoint
        const oldPos = pos;
        pos += speed * dt;
        if (pos >= TRACK) { pos -= TRACK; wraps++; lineCrossed(); }
        const hz = HALF * SEG;
        if (oldPos < hz && pos >= hz) checkpoint();
        // steering animation
        const s = inp.left ? -1 : inp.right ? 1 : 0;
        if (s !== 0 && s === steerDir) steerHold++; else steerHold = 0;
        steerDir = s;
        // parallax
        bgFar += pseg.curve * sp * 0.35; bgNear += pseg.curve * sp * 0.9;
        // points for distance
        if (!demo && (mode === 'qual' || mode === 'race')) {
          ptsAcc += speed * dt / SEG;
          while (ptsAcc >= 2) { ptsAcc -= 2; score += 10; }
        }
        // engine note
        if (!demo && ++engineTick % 4 === 0 && crashT === 0) {
          const rpm = gear === 0 ? Math.min(1.1, sp / LOW_MAX) : 0.25 + sp * 0.8;
          audio.tone(55 + rpm * 150, 0.085, { type: 'sawtooth', vol: 0.045 });
          audio.tone((55 + rpm * 150) * 2.01, 0.07, { type: 'square', vol: 0.012 });
        }
      }
      function lineCrossed() {
        if (demo) return;
        if (mode === 'qual') {
          qualTime = lapClock;
          qualPos = 8; for (let k = 0; k < QUAL_TIMES.length; k++) if (qualTime <= QUAL_TIMES[k]) { qualPos = k + 1; break; }
          score += QUAL_BONUS[qualPos - 1];
          mode = 'qualres'; modeT = 0;
          audio.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.13 });
        } else if (mode === 'race') {
          lapsDone++; lastLap = lapClock; lapClock = 0;
          if (lapsDone >= LAPS) {
            mode = 'finish'; modeT = 0; bonusLeft = Math.floor(timeLeft);
            say('GOAL!', 220, '#fff');
            audio.melody([[784, .12], [784, .12], [784, .12], [1047, .5]], { type: 'square', vol: 0.15 });
          } else {
            timeLeft += EXT_TIME;
            say(lapsDone === LAPS - 1 ? 'FINAL LAP' : 'EXTENDED TIME', 150);
            audio.melody([[880, .08], [1175, .08], [1568, .16]], { type: 'square', vol: 0.12 });
          }
        }
      }
      function checkpoint() {
        if (demo || mode !== 'race') return;
        timeLeft += Math.round(EXT_TIME * 0.4);
        say('CHECKPOINT', 120, '#7ff');
        audio.melody([[1175, .07], [1568, .12]], { type: 'square', vol: 0.11 });
      }

      // ---------- rival cars ----------
      function updateCars(dt) {
        const pd = pdist() + PLAYER_Z;
        for (const c of cars) {
          if (!raceGo) continue;
          const sg = segAt(c.d);
          let target = c.top * (1 - Math.min(0.32, Math.abs(sg.curve) * 0.04));
          // look ahead for the player and other cars
          let blockSpeed = Infinity, blockOff = 0;
          const pr = rel(pd - c.d);
          if (crashT === 0 && pr > 0 && pr < SEG * 7 && Math.abs(px - c.off) < 0.5) { blockSpeed = speed; blockOff = px; }
          for (const o of cars) {
            if (o === c) continue;
            const r = rel(o.d - c.d);
            if (r > 0 && r < SEG * 6 && Math.abs(o.off - c.off) < 0.5 && o.speed < blockSpeed) { blockSpeed = o.speed; blockOff = o.off; }
          }
          if (blockSpeed < c.speed + MAXV * 0.05) {
            // pick the lane furthest from the obstacle
            const lanes = [-0.6, 0, 0.6].filter(l => Math.abs(l - blockOff) >= 0.5);
            if (lanes.length) { lanes.sort((a, b) => Math.abs(a - c.off) - Math.abs(b - c.off)); c.lane = lanes[0]; }
            if (Math.abs(c.lane - blockOff) < 0.5 || Math.abs(c.off - blockOff) < 0.42) target = Math.min(target, blockSpeed * 0.98);
          } else if (hash(Math.floor(c.d / SEG / 40) + c.col * 13) < 0.006) c.lane = [-0.6, 0, 0.6][Math.floor(hash(c.d) * 3)];
          const a = c.speed < target ? MAXV * 0.13 : MAXV * 0.6;
          c.speed += clamp(target - c.speed, -a * dt, a * dt);
          c.d += c.speed * dt;
          const doff = clamp(c.lane - c.off, -0.7 * dt, 0.7 * dt);
          c.off += doff; c.steer = doff > 0.002 ? 1 : doff < -0.002 ? -1 : 0;
          // player collisions & passing
          const r = rel(c.d - pd);
          if (!demo || true) {
            if (crashT === 0 && Math.abs(r) < SEG * 0.7 && Math.abs(c.off - px) < PHALF * 2 * 0.92) {
              if (r > 0 || speed > c.speed) crash(); else c.speed = Math.min(c.speed, speed * 0.9);
            }
          }
          if (!demo && c.prevRel > 0 && r <= 0 && r > -SEG * 4 && (mode === 'race' || mode === 'qual')) {
            score += 50; passFlash = 30; audio.noise(0.25, { vol: 0.12, freq: 900, slideTo: 300, type: 'bandpass' });
          }
          c.prevRel = r;
        }
        if (mode === 'race' || mode === 'finish') {
          rank = 1; for (const c of cars) if (c.d > pd) rank++;
        }
      }

      // ---------- demo AI driver ----------
      function aiInput() {
        const pseg = segAt(pos + PLAYER_Z);
        let ahead = 0; for (let k = 2; k < 30; k++) ahead += segs[(pseg.i + k) % N].curve;
        ahead /= 28;
        let want = clamp(ahead * 0.12, -0.5, 0.5);
        const pd = pdist() + PLAYER_Z;
        for (const c of cars) { const r = rel(c.d - pd); if (r > 0 && r < SEG * 14 && Math.abs(c.off - want) < 0.5) want = c.off > 0 ? c.off - 0.75 : c.off + 0.75; }
        const sp = speed / MAXV;
        const comp = pseg.curve * 0.26 * sp; // counter-steer the centrifugal drift
        const err = want - px + comp * 1.2;
        const fast = Math.abs(ahead) > 3.2 && sp > 0.75;
        return { left: err < -0.05, right: err > 0.05, gas: !fast, brake: Math.abs(ahead) > 4.5 && sp > 0.8, gearToggle: (gear === 0 && sp > 0.5) };
      }

      // ---------- update ----------
      function update(dt) {
        modeT++;
        if (msg && --msg.f <= 0) msg = null;
        if (blimp) { blimp.x -= 0.55; if (blimp.x < -BLIMP.width - 200) blimp = null; }
        if (shake > 0) shake--;
        if (passFlash > 0) passFlash--;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        const human = DEBUG === 'race' && mode !== 'grid' ? aiInput() : {
          left: api.key('ArrowLeft'), right: api.key('ArrowRight'),
          gas: api.key('ArrowUp') || api.key('Space'), brake: api.key('ArrowDown'),
          gearToggle: api.pressed('KeyX') || api.pressed('KeyZ')
        };
        if (mode === 'title') {
          updatePlayer(dt, aiInput()); updateCars(dt);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { coinFlash = 0; startQualify(); }
            else { coinFlash = 90; audio.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (mode === 'qual' || mode === 'race') {
          timeLeft -= dt; lapClock += dt; if (countdown < 330) countdown++;
          updatePlayer(dt, human); updateCars(dt);
          if (timeLeft <= 0) {
            timeLeft = 0;
            mode = mode === 'qual' ? 'noqual' : 'timeup'; modeT = 0;
            say(mode === 'noqual' ? 'FAILED TO QUALIFY' : 'TIME UP', 240, '#ff4040');
            audio.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: 0.14 });
          }
          return;
        }
        if (mode === 'grid') {
          // starting lights: three reds then green
          countdown = modeT;
          updatePlayer(dt, { left: human.left, right: human.right, gas: false, brake: true, gearToggle: human.gearToggle });
          const beeps = [90, 150, 210];
          if (beeps.includes(modeT)) audio.tone(440, 0.3, { type: 'square', vol: 0.18 });
          if (modeT === 270) { audio.tone(880, 0.7, { type: 'square', vol: 0.2 }); raceGo = true; mode = 'race'; lapClock = 0; }
          return;
        }
        if (mode === 'qualres') {
          speed = Math.max(0, speed - MAXV * dt * 0.25);
          updatePlayer(dt, { gas: false, brake: false, left: false, right: false });
          updateCars(dt);
          if (modeT > 300 || (modeT > 60 && api.anyPressed('Enter', 'Space'))) startRace();
          return;
        }
        if (mode === 'finish') {
          updatePlayer(dt, { gas: false, brake: modeT > 120, left: px > 0.1, right: px < -0.1 }); updateCars(dt);
          if (modeT > 60 && bonusLeft > 0 && modeT % 3 === 0) { bonusLeft--; timeLeft = bonusLeft; score += 200; audio.tone(1200, 0.03, { vol: 0.08 }); }
          if (modeT > 60 && bonusLeft <= 0 && modeT > 360) gameOver();
          return;
        }
        if (mode === 'timeup' || mode === 'noqual') {
          updatePlayer(dt, { gas: false, brake: false, left: false, right: false }); updateCars(dt);
          if (modeT > 260) {
            if (api.offerContinue) api.offerContinue(continueDrive, gameOver);
            else gameOver();
          }
          return;
        }
        if (mode === 'over') {
          speed = Math.max(0, speed - MAXV * dt * 0.3);
          updatePlayer(dt, { gas: false, brake: false }); updateCars(dt);
          if (modeT > 300 || (modeT > 90 && api.anyPressed('Enter', 'Space'))) startTitle();
        }
      }
      // Continue: fresh time on the clock, keep racing / qualifying from where the car stopped.
      function continueDrive() {
        const wasQual = mode === 'noqual';
        mode = wasQual ? 'qual' : 'race'; modeT = 0; crashT = 0; raceGo = true; countdown = 330;
        timeLeft = wasQual ? QUAL_LIMIT : RACE_TIME;
        say(wasQual ? 'PREPARE TO QUALIFY' : 'EXTENDED TIME', 150);
      }
      function gameOver() {
        mode = 'over'; modeT = 0;
        if (score > hi) { hi = score; }
        api.setHiScore(score);
      }

      // ---------- render ----------
      function project(p, wy, wz, camX, camY, camZ, xoff) {
        const cz = wz - camZ;
        p.cz = cz;
        p.scale = CAM_D / cz;
        p.sx = W / 2 + p.scale * (xoff - camX) * XS;
        p.sy = CY - p.scale * (wy - camY) * YS;
        p.sw = p.scale * ROAD_W * XS;
      }
      const COL = {
        grassL: '#48b838', grassD: '#38a02c', roadL: '#9c9c9c', roadD: '#949494',
        rumL: '#f4f4f4', rumD: '#e01c1c', line: '#f4f4f4', ground: '#38a02c'
      };
      function drawRow(ctx, y, x, w, light) {
        const L = Math.round(x - w), R = Math.round(x + w);
        const rw = Math.max(1, Math.round(w * 0.085));
        ctx.fillStyle = light ? COL.grassL : COL.grassD; ctx.fillRect(0, y, W, 1);
        ctx.fillStyle = light ? COL.rumL : COL.rumD; ctx.fillRect(L - rw, y, rw, 1); ctx.fillRect(R, y, rw, 1);
        ctx.fillStyle = light ? COL.roadL : COL.roadD; ctx.fillRect(L, y, R - L, 1);
        const lw = Math.max(1, Math.round(w * 0.022));
        ctx.fillStyle = COL.line;
        // solid edge lines
        const ew = Math.max(1, Math.round(w * 0.03)), eo = Math.round(w * 0.04);
        if (w > 6) { ctx.fillRect(L + eo, y, ew, 1); ctx.fillRect(R - eo - ew, y, ew, 1); }
        if (light && w > 4) {
          ctx.fillRect(Math.round(x - w / 3 - lw / 2), y, lw, 1);
          ctx.fillRect(Math.round(x + w / 3 - lw / 2), y, lw, 1);
        }
      }
      function drawSprite(ctx, img, ww, scale, x, y, clipY, ax) {
        const dw = ww * scale * XS;
        if (dw < 1.5 || dw > 2000) return;
        const dh = dw * img.height / img.width;
        const dx = Math.round(x + dw * (ax == null ? -0.5 : ax)), dy = Math.round(y - dh);
        const visH = Math.min(dh, clipY - dy);
        if (visH <= 0) return;
        const sh = img.height * visH / dh;
        ctx.drawImage(img, 0, 0, img.width, Math.max(0.01, sh), dx, dy, Math.max(1, Math.round(dw)), Math.round(visH));
      }

      function renderWorld(ctx) {
        const base = segAt(pos), basePct = (pos % SEG) / SEG;
        const pseg = segAt(pos + PLAYER_Z), ppct = ((pos + PLAYER_Z) % SEG) / SEG;
        const playerY = lerp(pseg.y1, pseg.y2, ppct);
        const jy = shake > 0 ? ((api.frame & 2) ? 1 : -1) * Math.min(2, shake) * 0.5 : 0;
        const camY = playerY + CAM_H + jy * 30;
        // sky + backdrop
        ctx.drawImage(SKY, 0, 0);
        const hzShift = 0;
        const fo = Math.round(((bgFar % BGW) + BGW) % BGW);
        const by = CY - 63 + hzShift;
        ctx.drawImage(FAR, -fo, by); ctx.drawImage(FAR, BGW - fo, by);
        const no = Math.round(((bgNear % BGW) + BGW) % BGW);
        const ny = CY - 17 + hzShift;
        ctx.drawImage(NEAR, -no, ny); ctx.drawImage(NEAR, BGW - no, ny);
        ctx.fillStyle = COL.ground; ctx.fillRect(0, CY + 1 + hzShift, W, H);
        // blimp in the sky
        if (blimp) {
          const bx = Math.round(blimp.x), byy = 30;
          ctx.drawImage(BLIMP, bx, byy);
          // banner towed behind
          const tw = blimp.t.length * 6 + 6;
          ctx.fillStyle = '#202020'; ctx.fillRect(bx + 35, byy + 5, 8, 1);
          ctx.fillStyle = '#f8f8f0'; ctx.fillRect(bx + 43, byy + 1, tw, 11);
          ctx.fillStyle = '#e81c1c'; ctx.fillRect(bx + 43, byy + 1, tw, 1); ctx.fillRect(bx + 43, byy + 11, tw, 1);
          text(ctx, blimp.t, bx + 46, byy + 3, '#1840c8');
        }
        // road, front to back with scanline fill
        let maxy = H, x = 0, dx = -(base.curve * basePct);
        const camX = px * ROAD_W;
        for (let n = 0; n < DRAW; n++) {
          const sg = segs[(base.i + n) % N];
          const looped = sg.i < base.i;
          const camZ = pos - (looped ? TRACK : 0);
          project(sg.p1, sg.y1, sg.i * SEG, camX, camY, camZ, x);
          project(sg.p2, sg.y2, (sg.i + 1) * SEG, camX, camY, camZ, x + dx);
          x += dx; dx += sg.curve;
          sg.clip = maxy; sg.vis = sg.p1.cz > CAM_D;
          if (sg.p1.cz <= CAM_D) continue;
          const yTop = Math.round(sg.p2.sy), yBot = Math.min(maxy, Math.round(sg.p1.sy));
          if (yTop >= yBot || yTop >= maxy) continue;
          const p1 = sg.p1, p2 = sg.p2, span = p1.sy - p2.sy;
          for (let y = Math.max(0, yTop); y < yBot; y++) {
            const t = span > 0 ? (p1.sy - (y + 0.5)) / span : 0;
            drawRow(ctx, y, p1.sx + (p2.sx - p1.sx) * t, p1.sw + (p2.sw - p1.sw) * t, sg.light);
          }
          maxy = Math.max(0, yTop);
        }
        // bucket cars by segment distance
        const buckets = [];
        for (const c of cars) {
          const r = ((c.d - pos) % TRACK + TRACK) % TRACK;
          const n = Math.floor((r + basePct * SEG) / SEG);
          if (n >= 1 && n < DRAW) (buckets[n] || (buckets[n] = [])).push(c);
        }
        // sprites and cars back to front
        for (let n = DRAW - 1; n >= 1; n--) {
          const sg = segs[(base.i + n) % N];
          if (!sg.vis) continue;
          for (const s of sg.sprites) {
            drawSprite(ctx, s.img, s.ww, sg.p1.scale, sg.p1.sx + sg.p1.scale * s.off * ROAD_W * XS, sg.p1.sy, sg.clip);
          }
          const bk = buckets[n];
          if (bk) {
            bk.sort((a, b) => ((b.d % TRACK) + TRACK) % TRACK - ((a.d % TRACK) + TRACK) % TRACK);
            for (const c of bk) {
              const t = (((c.d % TRACK) + TRACK) % TRACK % SEG) / SEG;
              const sc = lerp(sg.p1.scale, sg.p2.scale, t);
              const cx = lerp(sg.p1.sx, sg.p2.sx, t) + sc * c.off * ROAD_W * XS;
              const cy = lerp(sg.p1.sy, sg.p2.sy, t);
              if (lerp(sg.p1.cz, sg.p2.cz, t) < PLAYER_Z * 0.55) continue;
              // view angle: cars to the side of the camera show a slight yaw
              const side = (cx - W / 2) / W;
              let f = c.steer + (side > 0.25 ? 1 : side < -0.25 ? -1 : 0);
              f = clamp(f, -1, 1);
              drawSprite(ctx, RIVALS[c.col][f + 1], CAR_WW * 56 / 48, sc, cx, cy, sg.clip);
            }
          }
        }
        // player car / explosion
        const bob = speed > 0 && crashT === 0 ? ((api.frame >> 1) & 1) : 0;
        const offBump = Math.abs(px) > 1 && speed > 0 ? ((api.frame >> 2) & 1) : 0;
        if (crashT > 0) {
          const f = Math.min(EXPL.length - 1, Math.floor((130 - crashT) / 8));
          if (crashT > 50 || (api.frame & 2)) ctx.drawImage(EXPL[f], W / 2 - 32, H - 58);
          if (crashT < 60 && (api.frame & 4)) {
            const k = (0 + '|' + 0); ctx.globalAlpha = 0.5; ctx.drawImage(PLAYER[k], W / 2 - 28, H - 25); ctx.globalAlpha = 1;
          }
        } else if (mode !== 'title' || true) {
          let s = steerDir;
          if (steerHold > 14) s *= 2;
          ctx.drawImage(PLAYER[s + '|' + (braking ? 1 : 0)], W / 2 - 28, H - 25 - bob - offBump);
          // skid smoke
          if (speed > MAXV * 0.6 && Math.abs(pseg.curve) > 3 && steerDir !== 0) {
            for (let k = 0; k < 6; k++) {
              const sx = W / 2 + (k & 1 ? 18 : -22) + ((api.frame * 7 + k * 13) % 9) - 4, sy = H - 6 - ((api.frame * 3 + k * 5) % 7);
              ctx.fillStyle = k & 2 ? '#d8d8d8' : '#b0b0b0'; ctx.fillRect(sx, sy, 2, 2);
            }
          }
          // grass/dust when off road
          if (Math.abs(px) > 1 && speed > 0) {
            for (let k = 0; k < 8; k++) {
              const sx = W / 2 + (k & 1 ? 20 : -24) + ((api.frame * 5 + k * 11) % 7), sy = H - 4 - ((api.frame * 2 + k * 7) % 10);
              ctx.fillStyle = k & 2 ? '#7a5a30' : '#58c048'; ctx.fillRect(sx, sy, 2, 2);
            }
          }
        }
      }

      function fmtLap(t) {
        const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t * 100) % 100);
        return m + "'" + (s < 10 ? '0' : '') + s + '"' + (c < 10 ? '0' : '') + c;
      }
      function renderHUD(ctx) {
        const Y = '#ffd820', Wc = '#fff', Rd = '#ff5040';
        textS(ctx, 'TOP', 4, 3, Rd); textS(ctx, String(Math.max(hi, score)), 26, 3, Wc);
        textS(ctx, 'SCORE', 4, 13, Rd); textS(ctx, String(score), 38, 13, Wc);
        textS(ctx, 'TIME', W / 2, 2, Y, 1, 'center');
        const tl = Math.ceil(timeLeft);
        const tcol = tl <= 10 && (api.frame & 16) ? Rd : Y;
        textS(ctx, String(mode === 'title' ? 90 : tl), W / 2, 10, tcol, 2, 'center');
        textS(ctx, 'LAP', 166, 3, Rd); textS(ctx, fmtLap(mode === 'qualres' ? qualTime : lapClock), 186, 3, Wc);
        textS(ctx, 'SPEED', 166, 13, Rd); textS(ctx, String(Math.round(speed / MAXV * 300)) + 'KM', 202, 13, Wc);
        // gear
        textS(ctx, gear ? 'HI' : 'LO', W - 20, H - 12, gear ? Y : '#7ff');
        if (mode === 'race' || mode === 'finish') {
          textS(ctx, 'POS', 4, H - 22, Rd); textS(ctx, String(rank), 4, H - 12, Wc, 1);
          textS(ctx, 'LAP ' + Math.min(LAPS, lapsDone + 1) + '/' + LAPS, 4, 23, Y);
        }
        if (mode === 'qual') textS(ctx, 'QUALIFY', 4, 23, Y);
        if (passFlash > 0 && (passFlash & 4)) textS(ctx, '50', W / 2, H - 40, Wc, 1, 'center');
      }
      const GRAD = ['#fff8a0', '#ffe838', '#ffd020', '#ffb018', '#ff8c10', '#f06008', '#d84000'];
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,40,0.45)'; ctx.fillRect(0, 40, W, 116);
        textS(ctx, 'POLE', W / 2, 48, GRAD, 4, 'center');
        textS(ctx, 'POSITION', W / 2, 82, GRAD, 3, 'center');
        // checkered flags
        for (let fl = 0; fl < 2; fl++) {
          const fx = fl ? 214 : 22, fy = 50;
          ctx.fillStyle = '#c8c8c8'; ctx.fillRect(fx + (fl ? 18 : 0), fy, 1, 26);
          for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
            const wv = Math.round(Math.sin(api.time * 6 + i * 0.8) * 1.2);
            ctx.fillStyle = (i + j) & 1 ? '#111' : '#f4f4f4';
            ctx.fillRect(fx + (fl ? 0 : 1) + i * 3, fy + j * 3 + wv, 3, 3);
          }
        }
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 112, '#ff5040', 1, 'center'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) textS(ctx, 'INSERT COIN', W / 2, 112, '#fff', 1, 'center'); }
        else textS(ctx, 'PUSH START BUTTON', W / 2, 112, (api.frame >> 5) & 1 ? '#fff' : '#ffd820', 1, 'center');
        textS(ctx, 'UP/SPACE GAS   DOWN BRAKE', W / 2, 126, '#7ff', 1, 'center');
        textS(ctx, 'X SHIFT LO/HI   ARROWS STEER', W / 2, 136, '#7ff', 1, 'center');
        textS(ctx, '\u00a9 1982 NAMCO', W / 2, 146, '#ffd820', 1, 'center');
      }
      function renderLights(ctx) {
        const x0 = W / 2 - 34, y0 = 40;
        ctx.fillStyle = '#202020'; ctx.fillRect(x0, y0, 68, 18);
        ctx.fillStyle = '#505050'; ctx.fillRect(x0, y0, 68, 1); ctx.fillRect(x0 + 33, y0 - 12, 2, 12);
        const lit = countdown >= 270 ? 4 : countdown >= 210 ? 3 : countdown >= 150 ? 2 : countdown >= 90 ? 1 : 0;
        for (let k = 0; k < 4; k++) {
          const on = k < lit && (k < 3 ? lit < 4 : true);
          const col = k === 3 ? (lit === 4 ? '#30ff40' : '#0a3a10') : (on ? '#ff3020' : '#4a0e08');
          const cx = x0 + 5 + k * 16;
          ctx.fillStyle = col; ctx.fillRect(cx + 1, y0 + 3, 10, 12); ctx.fillRect(cx, y0 + 4, 12, 10);
          if (on || (k === 3 && lit === 4)) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(cx + 3, y0 + 5, 3, 3); }
        }
      }
      function render(ctx) {
        renderWorld(ctx);
        renderHUD(ctx);
        if (mode === 'title') renderTitle(ctx);
        if (mode === 'title' || mode === 'over') {
          textS(ctx, 'CREDIT', 4, H - 12, '#ff5040'); textS(ctx, String(Math.min(99, api.credits)).padStart(2, '0'), 46, H - 12, '#fff');
        }
        if (mode === 'grid' || (mode === 'race' && countdown < 330)) renderLights(ctx);
        if (msg && (msg.f > 30 || (msg.f & 4))) {
          const sc = msg.t.length > 12 ? 1 : 2;
          textS(ctx, msg.t, W / 2, 100, msg.col, sc, 'center');
        }
        if (mode === 'qualres') {
          ctx.fillStyle = 'rgba(0,0,40,0.6)'; ctx.fillRect(28, 64, 200, 70);
          textS(ctx, 'QUALIFYING TIME', W / 2, 70, '#7ff', 1, 'center');
          textS(ctx, fmtLap(qualTime), W / 2, 82, '#fff', 2, 'center');
          const ord = ['', '1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'][qualPos];
          textS(ctx, qualPos === 1 ? 'POLE POSITION!' : 'POSITION ' + ord, W / 2, 102, GRAD, qualPos === 1 ? 2 : 1, 'center');
          textS(ctx, 'BONUS ' + QUAL_BONUS[qualPos - 1], W / 2, 120, '#ffd820', 1, 'center');
        }
        if (mode === 'finish' && modeT > 60) {
          textS(ctx, 'FINISHED ' + ['', '1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'][rank], W / 2, 120, '#fff', 1, 'center');
          textS(ctx, 'TIME BONUS', W / 2, 132, '#ffd820', 1, 'center');
        }
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,40,0.55)'; ctx.fillRect(40, 84, 176, 46);
          textS(ctx, 'GAME OVER', W / 2, 90, GRAD, 2, 'center');
          textS(ctx, 'SCORE ' + score, W / 2, 110, '#fff', 1, 'center');
          if (score >= hi && score > 0) textS(ctx, 'NEW TOP SCORE!', W / 2, 120, '#7ff', 1, 'center');
        }
      }
      return { update, render };
    }
  });
})();
