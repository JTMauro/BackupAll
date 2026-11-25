// Raid on Bungeling Bay (Broderbund / Hudson Soft, 1984) \u2014 top-down helicopter raid over an archipelago.
// Destroy all six Bungeling factories before their war machine (and the battleship) sinks your carrier.
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
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '%': [24, 25, 2, 4, 8, 19, 3]
  };
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
  function textS(ctx, s, x, y, col, sc, align) { sc = sc || 1; text(ctx, s, x + 1, y + 1, '#000', sc, align); if (sc > 1) { text(ctx, s, x - 1, y, '#000', sc, align); text(ctx, s, x, y - 1, '#000', sc, align); text(ctx, s, x + 1, y, '#000', sc, align); } return text(ctx, s, x, y, col, sc, align); }

  // ---------- helpers ----------
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function paint(rows, pal) {
    const h = rows.length, w = Math.max(...rows.map(r => r.length));
    const [c, x] = mkCanvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) { const col = pal[rows[j][i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
    return c;
  }
  function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
  function hash2(x, y) { return hash(x * 157.31 + y * 311.97); }
  function vnoise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  let seedV = 1;
  function rnd() { seedV = (seedV * 1103515245 + 12345) & 0x7fffffff; return seedV / 0x7fffffff; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const TAU = Math.PI * 2;
  function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  // rotate a sprite (facing east) into n pixel-exact frames
  function rotFrames(src, n) {
    const sw = src.width, sh = src.height;
    const sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
    const S = Math.ceil(Math.hypot(sw, sh)) + 2;
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU, c = Math.cos(a), s = Math.sin(a);
      const [cv, cx] = mkCanvas(S, S);
      const img = cx.createImageData(S, S), d = img.data;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - S / 2, dy = y + 0.5 - S / 2;
        const sx = Math.floor(c * dx + s * dy + sw / 2), sy = Math.floor(-s * dx + c * dy + sh / 2);
        if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;
        const si = (sy * sw + sx) * 4, di = (y * S + x) * 4;
        d[di] = sd[si]; d[di + 1] = sd[si + 1]; d[di + 2] = sd[si + 2]; d[di + 3] = sd[si + 3];
      }
      cx.putImageData(img, 0, 0);
      out.push(cv);
    }
    return out;
  }
  function silhouette(c, col) {
    const [s, x] = mkCanvas(c.width, c.height);
    x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    return s;
  }
  function explosionFrames(size, n) {
    const out = [];
    for (let f = 0; f < n; f++) {
      const [c, x] = mkCanvas(size, size);
      const t = f / (n - 1), R = size * 0.47 * Math.sin(Math.min(1, t * 1.8) * Math.PI / 2) * (t > 0.6 ? 1 - (t - 0.6) * 1.3 : 1);
      for (let y = 0; y < size; y++) for (let i = 0; i < size; i++) {
        const dx = i - size / 2 + 0.5, dy = y - size / 2 + 0.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const rr = R * (0.75 + 0.5 * vnoise2(a * 2.5 + 7, f * 0.8)) + (hash2(i + f * 31, y) - 0.5) * 2;
        if (d < rr) {
          const q = d / rr; let col;
          if (t > 0.5 && hash2((i >> 1) + f, (y >> 1)) < (t - 0.4) * 1.2) col = hash2(i, y + f) < 0.5 ? '#383030' : '#5c5454';
          else col = q < 0.35 - t * 0.25 ? '#fffbe0' : q < 0.6 - t * 0.2 ? '#ffe040' : q < 0.85 ? '#ff8818' : '#d82808';
          x.fillStyle = col; x.fillRect(i, y, 1, 1);
        } else if (d < rr + 4 && hash2(i * 3 + f, y * 7) < 0.05 * (1 - t)) { x.fillStyle = '#ffe040'; x.fillRect(i, y, 1, 1); }
      }
      out.push(c);
    }
    return out;
  }

  ArcadeRegistry.register({
    id: 'raidonbungelingbay', title: 'Raid on Bungeling Bay', year: 1984, maker: 'Broderbund',
    width: 256, height: 240, vector: false, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up: thrust \u00b7 Down: reverse \u00b7 Space: gun \u00b7 X: bomb \u00b7 land on carrier to repair',
    marquee: { bg: '#10307a', fg: '#ffffff', accent: '#e82828' },
    create(api) {
      const W = 256, H = 240, VY = 17, VH = H - VY;
      const WM = 1280;                 // world size (wraps)
      const NF = 32;                   // rotation frames
      const audio = api.audio;
      const wrapd = d => { d %= WM; if (d >= WM / 2) d -= WM; if (d < -WM / 2) d += WM; return d; };
      const wrap = v => ((v % WM) + WM) % WM;
      const fidx = a => ((Math.round(a / TAU * NF) % NF) + NF) % NF;

      // ---------- sprites ----------
      const HELI_SRC = paint([
        '.........................',
        '...........ddddddddd.....',
        '............d.....d......',
        '.ss.........OOOOOO.......',
        '.s.........OllllooOOO....',
        '.s...hh...OllloooooooO...',
        '.s..hhhhhOOlooooooooooOGG',
        '.sTTTTTTTOoooookoooooOGGG',
        '.s..hhhhhOOmooooooooooOGG',
        '.s...hh...OmmmoooooooO...',
        '.s.........OmmmmooOOO....',
        '.ss.........OOOOOO.......',
        '............d.....d......',
        '...........ddddddddd.....',
        '.........................'
      ], { O: '#2a3038', o: '#d4d8dc', l: '#ffffff', m: '#9aa2aa', G: '#38c0f0', T: '#b4b8bc', h: '#8c9094', s: '#5c6064', d: '#3a3e42', k: '#181818' });
      const HELI = rotFrames(HELI_SRC, NF), HELI_SH = HELI.map(c => silhouette(c, 'rgba(0,0,30,0.38)'));
      const JET_SRC = (() => {
        const top = ['....W..........', '....WW.........', '....WwW........', 'T...WwwW.......', 'TT..WrwwW......', '.TFFFFFFFFFF...'];
        const mid = 'TTFffffffffCCF.';
        return paint([...top, mid, ...top.slice().reverse()], { W: '#283040', w: '#5c6c84', r: '#e02828', T: '#384050', F: '#283040', f: '#8c9cb0', C: '#30d0f0' });
      })();
      const JET = rotFrames(JET_SRC, NF), JET_SH = JET.map(c => silhouette(c, 'rgba(0,0,30,0.35)'));
      const BOMBER_SRC = (() => {
        const top = ['.........WWW...........', '.........WwW...........', '.........WwW...........', '.........WwWE..........', '.........WwWEE.........',
          '.........WwWE..........', 'TT.......WwW...........', 'TTT......WrWE..........', '.TT......WwWEE.........', '..FFFFFFFFFFFFFFFFFFF..'];
        return paint([...top, 'TTFffffffffffffffffCCF.', ...top.slice().reverse()], { W: '#203018', w: '#4c6438', r: '#e02828', E: '#202020', T: '#304028', F: '#203018', f: '#6c8450', C: '#30d0f0' });
      })();
      const BOMBER = rotFrames(BOMBER_SRC, NF), BOMBER_SH = BOMBER.map(c => silhouette(c, 'rgba(0,0,30,0.35)'));
      // battleship (procedural pixel art, facing east)
      function shipArt(len, wid, turrets, pal) {
        const [c, x] = mkCanvas(len, wid);
        const mid = (wid - 1) / 2;
        for (let i = 0; i < len; i++) {
          const u = i / (len - 1);
          let hw = u > 0.72 ? mid * Math.sqrt(Math.max(0, (1 - u) / 0.28)) : u < 0.06 ? mid * (0.75 + u * 4) : mid;
          for (let j = 0; j < wid; j++) {
            const d = Math.abs(j - mid);
            if (d <= hw + 0.2) {
              x.fillStyle = d > hw - 1 ? pal.edge : (j < mid ? pal.deckL : pal.deck);
              x.fillRect(i, j, 1, 1);
            }
          }
        }
        return [c, x];
      }
      const BSHIP_SRC = (() => {
        const [c, x] = shipArt(64, 15, 3, { edge: '#2c3034', deck: '#7c8088', deckL: '#8c9098' });
        // planking lines
        x.fillStyle = '#6c7078'; for (let i = 6; i < 50; i += 4) x.fillRect(i, 4, 1, 7);
        const turret = (tx, dir) => {
          x.fillStyle = '#2c3034'; x.fillRect(tx - 3, 4, 7, 7);
          x.fillStyle = '#a8acb4'; x.fillRect(tx - 2, 5, 5, 5); x.fillStyle = '#c8ccd4'; x.fillRect(tx - 2, 5, 2, 2);
          x.fillStyle = '#202428'; x.fillRect(dir > 0 ? tx + 3 : tx - 9, 6, 7, 1); x.fillRect(dir > 0 ? tx + 3 : tx - 9, 8, 7, 1);
        };
        // superstructure + funnel
        x.fillStyle = '#2c3034'; x.fillRect(25, 3, 16, 9);
        x.fillStyle = '#b8bcc4'; x.fillRect(26, 4, 14, 7); x.fillStyle = '#d8dce4'; x.fillRect(26, 4, 14, 2);
        x.fillStyle = '#202428'; x.fillRect(30, 5, 5, 5); x.fillStyle = '#585c64'; x.fillRect(31, 6, 3, 3);
        x.fillStyle = '#e02828'; x.fillRect(37, 6, 2, 3);
        turret(48, 1); turret(14, -1); turret(56, 1);
        return c;
      })();
      const BSHIP = rotFrames(BSHIP_SRC, NF);
      const BOAT_SRC = (() => {
        const [c, x] = shipArt(16, 7, 0, { edge: '#283038', deck: '#8890a0', deckL: '#a0a8b8' });
        x.fillStyle = '#d8dce4'; x.fillRect(5, 2, 4, 3); x.fillStyle = '#202428'; x.fillRect(11, 3, 3, 1); x.fillStyle = '#e02828'; x.fillRect(6, 3, 1, 1);
        return c;
      })();
      const BOAT = rotFrames(BOAT_SRC, NF);
      const CARRIER = (() => {
        const [c, x] = shipArt(104, 29, 0, { edge: '#24282c', deck: '#5a5e66', deckL: '#5e626a' });
        // hull side shading (starboard) and deck edge lines
        for (let i = 0; i < 104; i++) for (let j = 0; j < 29; j++) {
          const p = x.getImageData(i, j, 1, 1).data; if (!p[3]) continue;
          const q = j + 1 < 29 ? x.getImageData(i, j + 1, 1, 1).data[3] : 0;
          const q2 = j + 2 < 29 ? x.getImageData(i, j + 2, 1, 1).data[3] : 0;
          if (q && !q2 && p[0] > 60) { x.fillStyle = '#3c4048'; x.fillRect(i, j, 1, 1); }
        }
        x.fillStyle = '#e8e8e8';
        for (let i = 6; i < 82; i += 1) { x.fillRect(i, 3, 1, 1); x.fillRect(i, 25, 1, 1); }
        // centreline & angled landing deck
        for (let i = 8; i < 86; i += 7) x.fillRect(i, 14, 4, 1);
        for (let i = 8; i < 52; i += 6) x.fillRect(i, 9 - Math.floor((i - 8) / 12), 3, 1);
        // elevators
        x.fillStyle = '#4a4e56'; x.fillRect(60, 5, 10, 7); x.fillRect(14, 18, 10, 6);
        x.fillStyle = '#3e424a'; x.fillRect(60, 11, 10, 1); x.fillRect(14, 23, 10, 1);
        // helipad
        x.fillStyle = '#ffd820';
        for (let a = 0; a < 40; a++) { const t = a / 40 * TAU; x.fillRect(Math.round(38 + Math.cos(t) * 7), Math.round(14 + Math.sin(t) * 7), 1, 1); }
        x.fillStyle = '#ffffff'; x.fillRect(35, 11, 1, 7); x.fillRect(40, 11, 1, 7); x.fillRect(36, 14, 4, 1);
        // island superstructure on the starboard edge
        x.fillStyle = '#1c2024'; x.fillRect(60, 18, 20, 9);
        x.fillStyle = '#9ca0a8'; x.fillRect(61, 19, 18, 7);
        x.fillStyle = '#c8ccd4'; x.fillRect(61, 19, 18, 2);
        x.fillStyle = '#5c6068'; x.fillRect(66, 21, 6, 4);
        x.fillStyle = '#202428'; x.fillRect(67, 22, 4, 2);
        x.fillStyle = '#30c0f0'; x.fillRect(62, 22, 3, 1); x.fillRect(74, 22, 3, 1);
        x.fillStyle = '#e02828'; x.fillRect(77, 20, 1, 1);
        // parked jets on the bow
        x.drawImage(JET_SRC, 86, 3); x.drawImage(JET_SRC, 74, 3);
        return c;
      })();
      const EXP_S = explosionFrames(16, 8), EXP_L = explosionFrames(36, 10);
      const FACT = {
        hall: (() => {
          const [c, x] = mkCanvas(26, 18);
          x.fillStyle = '#2a2a34'; x.fillRect(0, 0, 26, 18);
          for (let i = 1; i < 25; i++) { x.fillStyle = i % 3 === 0 ? '#6e6e80' : i % 3 === 1 ? '#a4a4b4' : '#8c8c9c'; x.fillRect(i, 1, 1, 16); }
          x.fillStyle = '#c8c8d8'; x.fillRect(1, 1, 24, 1);
          x.fillStyle = '#c02020'; x.fillRect(10, 6, 6, 6); x.fillStyle = '#ffd820'; x.fillRect(12, 8, 2, 2);
          x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(1, 15, 24, 2);
          return c;
        })(),
        stack: paint(['..kkkk..', '.kbbbbk.', 'kbkkkkbk', 'kbk..kbk', 'kbk..kbk', 'kbkkkkbk', '.kbbbbk.', '..kkkk..'], { k: '#2a1a14', b: '#a05a3c', '.': null }),
        tank: paint(['...kkkk...', '.kkwwwwkk.', '.kwWWwwwk.', 'kwWWwwwwgk', 'kwWwwwwwgk', 'kwwwwwwggk', 'kwwwwwgggk', '.kwwwgggk.', '.kkggggkk.', '...kkkk...'], { k: '#30343c', W: '#ffffff', w: '#d0d4dc', g: '#9ca0a8' }),
        rubble: paint(['..d.kk.d...', '.dkkbkkkd..', 'dkbkkkgkkd.', '.kkgkkbkkkd', 'dkkkbkkkgk.', '.kgkkkkbkkd', 'dkkkbkgkkk.', '.dkkkkkkd..', '..d.dkd.d..'], { k: '#2a2018', b: '#5a3a28', g: '#6a6a6a', d: '#4a3a2a' })
      };
      const AA_BASE = paint(['...ttttt...', '..tTtTtTt..', '.tT.....Tt.', 'tT..kkk..Tt', 'tt.kgggk.tt', 'tT.kgGgk.Tt', 'tt.kgggk.tt', 'tT..kkk..Tt', '.tT.....Tt.', '..tTtTtTt..', '...ttttt...'], { t: '#b09060', T: '#806440', k: '#202020', g: '#585c60', G: '#9ca0a4' });
      const CRATER = paint(['..ddd..', '.dkkkd.', 'dkkbkkd', 'dkbkkkd', 'dkkkbkd', '.dkkkd.', '..ddd..'], { k: '#2a2018', b: '#4a3828', d: '#5a4a38' });
      const TREE = paint(['.gGg.', 'gGGgg', 'gGggd', 'ggggd', '.ddd.'], { g: '#1e7a2a', G: '#3ca040', d: '#145a1e' });

      // ---------- world generation ----------
      const C = 640;
      const carrier = { x: 640, y: 690, hp: 10, sinkT: 0 };
      const facPos = []; for (let i = 0; i < 6; i++) { const a = (30 + i * 60) * Math.PI / 180; facPos.push([Math.round(C + 400 * Math.cos(a)), Math.round(C + 400 * Math.sin(a))]); }
      const yard = [1100, 640];
      const blobs = [];
      seedV = 9157;
      for (const [fx, fy] of facPos) {
        blobs.push([fx, fy, 78]);
        for (let k = 0; k < 4; k++) { const a = rnd() * TAU, d = 40 + rnd() * 25; blobs.push([fx + Math.cos(a) * d, fy + Math.sin(a) * d, 32 + rnd() * 18]); }
      }
      blobs.push([yard[0] + 20, yard[1], 52], [yard[0] + 30, yard[1] - 40, 34], [yard[0] + 35, yard[1] + 40, 34]);
      const islets = [];
      for (let k = 0; k < 40 && islets.length < 14; k++) {
        const x = 60 + rnd() * (WM - 120), y = 60 + rnd() * (WM - 120), r = 12 + rnd() * 14;
        if (Math.hypot(x - carrier.x, y - carrier.y) < 170) continue;
        { const ax = yard[0] - 40, ay = yard[1], bx = carrier.x + 70, by = carrier.y - 30, L2 = (bx - ax) ** 2 + (by - ay) ** 2;
          const t = clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2, 0, 1);
          if (Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)) < r + 50) continue; }
        if (blobs.some(b => Math.hypot(b[0] - x, b[1] - y) < b[2] + r + 30)) continue;
        islets.push([x, y, r]); blobs.push([x, y, r]);
      }
      const field = new Float32Array(WM * WM).fill(-99);
      for (const [bx, by, r] of blobs) {
        const m = r + 36;
        for (let y = Math.floor(by - m); y <= by + m; y++) for (let x = Math.floor(bx - m); x <= bx + m; x++) {
          const v = r - Math.hypot(x - bx, y - by), i = wrap(y) * WM + wrap(x);
          if (v > field[i]) field[i] = v;
        }
      }
      const mask = new Uint8Array(WM * WM); // 0 sea, 1 shallow, 2 land
      const MAP = (() => {
        const [c, x] = mkCanvas(WM, WM);
        const img = x.createImageData(WM, WM), d = img.data;
        const put = (i, hex) => { d[i * 4] = parseInt(hex.slice(1, 3), 16); d[i * 4 + 1] = parseInt(hex.slice(3, 5), 16); d[i * 4 + 2] = parseInt(hex.slice(5, 7), 16); d[i * 4 + 3] = 255; };
        const cache = {}; const P = h => cache[h] || (cache[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
        const set = (i, h) => { const p = P(h); d[i * 4] = p[0]; d[i * 4 + 1] = p[1]; d[i * 4 + 2] = p[2]; d[i * 4 + 3] = 255; };
        for (let y = 0; y < WM; y++) for (let xx = 0; xx < WM; xx++) {
          const i = y * WM + xx;
          let f = field[i];
          if (f > -40) f += (vnoise2(xx / 14, y / 14) - 0.5) * 18 + (vnoise2(xx / 5, y / 5) - 0.5) * 5;
          let col;
          if (f > 0) {
            mask[i] = 2;
            if (f < 3) col = (xx + y) & 1 ? '#f0dca0' : '#e4cc88';
            else if (f < 5) col = hash2(xx, y) < 0.5 ? '#c8b070' : '#8cb850';
            else { const n = vnoise2(xx / 7, y / 7); col = n < 0.33 ? '#2e8a36' : n < 0.66 ? '#38983c' : ((xx ^ y) & 3) === 0 ? '#48a848' : '#3c9c40'; }
          } else if (f > -2.2) { mask[i] = 1; col = hash2(xx, y) < 0.6 ? '#f4fcff' : '#b8e0f8'; }
          else if (f > -9) { mask[i] = 1; col = f > -5 ? '#58a8e8' : ((xx + y) & 1 ? '#58a8e8' : '#3c88dc'); }
          else if (f > -18) { col = f > -13 ? '#3c88dc' : ((xx + y) & 1 ? '#3c88dc' : '#2c68c8'); }
          else col = '#2458c0';
          set(i, col);
        }
        x.putImageData(img, 0, 0);
        // concrete pads, roads and docks
        const road = (x0, y0, x1, y1) => {
          const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
          for (let t = 0; t < len; t++) {
            const px = x0 + ux * t, py = y0 + uy * t;
            x.fillStyle = '#5c5c58'; x.fillRect(Math.round(px - 3), Math.round(py - 3), 7, 7);
          }
          for (let t = 0; t < len; t++) {
            const px = x0 + ux * t, py = y0 + uy * t;
            x.fillStyle = '#8c8c86'; x.fillRect(Math.round(px - 2), Math.round(py - 2), 5, 5);
          }
          for (let t = 0; t < len; t += 6) { x.fillStyle = '#e8e8d8'; x.fillRect(Math.round(x0 + ux * t), Math.round(y0 + uy * t), 2, 2); }
        };
        for (const [fx, fy] of facPos) {
          // road to the shore facing the bay
          const a = Math.atan2(C - fy, C - fx);
          let t = 30; while (t < 200 && mask[wrap(Math.round(fy + Math.sin(a) * t)) * WM + wrap(Math.round(fx + Math.cos(a) * t))] === 2) t++;
          road(fx, fy, fx + Math.cos(a) * (t + 10), fy + Math.sin(a) * (t + 10));
          const ex = fx + Math.cos(a) * (t + 10), ey = fy + Math.sin(a) * (t + 10);
          x.fillStyle = '#4a3a2a'; x.fillRect(Math.round(ex - 6), Math.round(ey - 6), 12, 12);
          x.fillStyle = '#8a6a48'; x.fillRect(Math.round(ex - 5), Math.round(ey - 5), 10, 10);
          x.fillStyle = '#6a5038'; for (let k = -5; k < 5; k += 2) x.fillRect(Math.round(ex - 5), Math.round(ey + k), 10, 1);
          // pad
          x.fillStyle = '#4c4c50'; x.fillRect(fx - 32, fy - 24, 64, 48);
          x.fillStyle = '#9a9a94'; x.fillRect(fx - 31, fy - 23, 62, 46);
          x.fillStyle = '#8a8a84'; for (let k = -31; k < 31; k += 8) x.fillRect(fx + k, fy - 23, 1, 46);
          x.fillStyle = '#ffd820'; for (let k = -30; k < 30; k += 4) { x.fillRect(fx + k, fy - 23, 2, 1); x.fillRect(fx + k, fy + 22, 2, 1); }
        }
        // shipyard dock
        x.fillStyle = '#4c4c50'; x.fillRect(yard[0] - 70, yard[1] - 16, 80, 32);
        x.fillStyle = '#9a9a94'; x.fillRect(yard[0] - 69, yard[1] - 15, 78, 4); x.fillRect(yard[0] - 69, yard[1] + 11, 78, 4);
        x.fillStyle = '#1c3c90'; x.fillRect(yard[0] - 69, yard[1] - 11, 74, 22);
        x.fillStyle = '#ffd820'; for (let k = -68; k < 8; k += 5) { x.fillRect(yard[0] + k, yard[1] - 12, 2, 1); x.fillRect(yard[0] + k, yard[1] + 11, 2, 1); }
        // trees
        seedV = 31337;
        for (let k = 0; k < 2600; k++) {
          const tx = Math.floor(rnd() * WM), ty = Math.floor(rnd() * WM);
          const i = ty * WM + tx;
          if (field[i] < 14) continue;
          if (facPos.some(([fx, fy]) => Math.abs(tx - fx) < 40 && Math.abs(ty - fy) < 32)) continue;
          if (Math.abs(tx - yard[0] + 30) < 50 && Math.abs(ty - yard[1]) < 24) continue;
          const px = x.getImageData(tx + 2, ty + 2, 1, 1).data;
          if (px[0] > 120 && px[1] > 120 && px[2] > 110) continue; // concrete/road
          x.drawImage(TREE, tx, ty);
        }
        return c;
      })();
      // radar base
      const RAD = 44;
      const RADAR = (() => {
        const [c, x] = mkCanvas(RAD, RAD);
        x.fillStyle = '#081830'; x.fillRect(0, 0, RAD, RAD);
        const s = WM / RAD;
        for (let y = 0; y < RAD; y++) for (let i = 0; i < RAD; i++) {
          let land = 0;
          for (let k = 0; k < 4; k++) if (mask[Math.floor((y + (k >> 1) * 0.5 + 0.25) * s) * WM + Math.floor((i + (k & 1) * 0.5 + 0.25) * s)] === 2) land++;
          if (land >= 2) { x.fillStyle = '#2c8a36'; x.fillRect(i, y, 1, 1); }
        }
        return c;
      })();
      const DBG = (typeof location !== 'undefined' && (location.search.match(/[?&]debug=(\w+)/) || [])[1]) || '';
      const isLand = (x, y) => mask[wrap(Math.round(y)) * WM + wrap(Math.round(x))] === 2;

      // ---------- game state ----------
      let hi = api.getHiScore(20000);
      let mode = 'title', modeT = 0, score = 0, lives = 3, tech = 0, msgs = [];
      let heli, factories, aas, boats, fighters = [], bombers = [], bullets = [], ebullets = [], bombs = [], fx = [], smoke = [], splashes = [], ship;
      let fighterT = 0, bomberT = 0, camX = C, camY = C, nextLife = 0;
      let titleCam = 0;
      let coinFlash = 0;   // coin-op: INSERT COIN flash after a start attempt with no credit

      function factoryBlocks() {
        return [
          { dx: -13, dy: -9, w: 26, h: 18, type: 'hall', hp: 2, max: 2, rb: 0 },
          { dx: -27, dy: -19, w: 8, h: 8, type: 'stack', hp: 1, max: 1, rb: 0 },
          { dx: 19, dy: -19, w: 8, h: 8, type: 'stack', hp: 1, max: 1, rb: 0 },
          { dx: -28, dy: 9, w: 10, h: 10, type: 'tank', hp: 1, max: 1, rb: 0 },
          { dx: 18, dy: 9, w: 10, h: 10, type: 'tank', hp: 1, max: 1, rb: 0 }
        ];
      }
      function newGame() {
        score = 0; lives = 3; tech = 0; msgs = []; nextLife = 30000;
        factories = facPos.map(([x, y], i) => ({ x, y, blocks: factoryBlocks(), alive: true, i }));
        aas = [];
        seedV = 4711;
        for (const f of factories) {
          for (let k = 0; k < 4; k++) {
            for (let tries = 0; tries < 30; tries++) {
              const a = rnd() * TAU, d = 44 + rnd() * 34, x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d;
              if (isLand(x, y) && isLand(x + 6, y + 6) && isLand(x - 6, y - 6) && !aas.some(g => Math.hypot(g.x - x, g.y - y) < 22)) { aas.push({ x, y, hp: 3, cd: 60 + rnd() * 120, a: 0, dead: false, rb: 0, f }); break; }
            }
          }
        }
        for (const [dx, dy] of [[0, -38], [10, 40], [50, 0]]) aas.push({ x: yard[0] + dx, y: yard[1] + dy, hp: 3, cd: 90, a: 0, dead: false, rb: 0, f: null });
        boats = [];
        for (let k = 0; k < 6; k++) {
          const f = facPos[k];
          boats.push({ cx: f[0], cy: f[1], r: 125 + (k % 2) * 10, ang: rnd() * TAU, dir: k % 2 ? 1 : -1, hp: 2, cd: 120, x: 0, y: 0, a: 0, dead: false, rb: 0 });
        }
        fighters = []; bombers = []; bullets = []; ebullets = []; bombs = []; fx = []; smoke = []; splashes = [];
        ship = { state: 'build', prog: 0, hp: 12, x: yard[0] - 32, y: yard[1], a: Math.PI, cd: 120, msgd: 0 };
        carrier.hp = 10; carrier.sinkT = 0;
        fighterT = 600; bomberT = 60 * 50;
        spawnHeli(true);
        mode = 'play'; modeT = 0;
        const dbg = (typeof location !== 'undefined' && (location.search.match(/[?&]debug=(\w+)/) || [])[1]) || '';
        if (dbg === 'bomb') { heli.landed = false; heli.air = true; heli.alt = 16; heli.x = facPos[0][0]; heli.y = facPos[0][1] - 4; camX = heli.x; camY = heli.y; heli.bombs = 99; }
        if (dbg === 'fac') { heli.landed = false; heli.air = true; heli.alt = 16; heli.x = facPos[0][0] - 60; heli.y = facPos[0][1] - 60; camX = heli.x; camY = heli.y; }
        if (dbg === 'ship') { ship.prog = 0.97; heli.landed = false; heli.air = true; heli.alt = 16; heli.x = yard[0] - 120; heli.y = yard[1] - 30; camX = heli.x; camY = heli.y; }
        say('DESTROY THE 6 FACTORIES', 240);
        audio.melody([[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .35]], { type: 'square', vol: 0.12 });
      }
      function spawnHeli() {
        heli = { x: carrier.x - 12, y: carrier.y, a: -Math.PI / 2, vx: 0, vy: 0, alt: 0, dmg: 0, landed: true, dead: false, deadT: 0, cd: 0, bombs: 9, rot: 0, lowT: 0 };
        camX = heli.x; camY = heli.y;
      }
      function say(t, f, col) { msgs.push({ t, f: f || 180, col: col || '#fff' }); if (msgs.length > 3) msgs.shift(); }
      function addScore(n) {
        score += n;
        if (score >= nextLife) { nextLife += 30000; lives++; say('EXTRA HELICOPTER', 150, '#7f7'); audio.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { vol: 0.12 }); }
      }
      function boom(x, y, big, air) {
        fx.push({ x, y, t: 0, big, air }); if (fx.length > 50) fx.shift();
        if (big) { audio.noise(0.8, { vol: 0.4, freq: 1400, slideTo: 60 }); audio.tone(80, 0.5, { type: 'sawtooth', vol: 0.15, slideTo: 30 }); }
        else audio.noise(0.3, { vol: 0.25, freq: 2200, slideTo: 200 });
      }
      function puff(x, y, col, vy) { smoke.push({ x, y, t: 0, col, vy: vy || -0.15, vx: 0.12 }); if (smoke.length > 140) smoke.shift(); }

      // ---------- update ----------
      function updateHeli() {
        const h = heli;
        if (h.dead) {
          h.deadT++;
          h.a += 0.25; h.alt = Math.max(0, h.alt - 0.25); h.x += h.vx * 0.5; h.y += h.vy * 0.5;
          if (h.deadT % 6 === 0) puff(h.x, h.y, '#404040', -0.3);
          if (h.alt <= 0 && !h.boomed) { h.boomed = true; boom(h.x, h.y, true, false); }
          if (h.deadT > 150) {
            lives--;
            if (lives <= 0) { endGame('ALL HELICOPTERS LOST'); return; }
            spawnHeli();
          }
          return;
        }
        const up = api.key('ArrowUp'), down = api.key('ArrowDown');
        if (h.landed) {
          // repair & reload on the carrier deck
          if (h.dmg > 0 && api.frame % 3 === 0) { h.dmg = Math.max(0, h.dmg - 1); if (api.frame % 12 === 0) audio.tone(660 + (100 - h.dmg) * 4, 0.04, { vol: 0.06 }); }
          if (h.bombs < 9 && api.frame % 20 === 0) { h.bombs++; audio.tone(1200, 0.05, { vol: 0.08 }); }
          if (api.key('ArrowLeft')) h.a -= 0.05; if (api.key('ArrowRight')) h.a += 0.05;
          if (up) { h.landed = false; audio.tone(200, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 400 }); }
          h.x = clamp(h.x, carrier.x - 40, carrier.x + 40);
          return;
        }
        if (h.alt < 16 && h.lowT === 0) h.alt = Math.min(16, h.alt + 0.25);
        if (h.alt >= 16) h.air = true;
        if (api.key('ArrowLeft')) h.a -= 0.06;
        if (api.key('ArrowRight')) h.a += 0.06;
        const c = Math.cos(h.a), s = Math.sin(h.a);
        if (up) { h.vx += c * 0.06; h.vy += s * 0.06; }
        if (down) { h.vx -= c * 0.04; h.vy -= s * 0.04; }
        h.vx *= 0.975; h.vy *= 0.975;
        // forward speed cap 1.8, reverse cap 0.8
        const fwd = h.vx * c + h.vy * s, side = -h.vx * s + h.vy * c;
        const f2 = clamp(fwd, -0.8, 1.8), s2 = side * 0.96;
        h.vx = f2 * c - s2 * s; h.vy = f2 * s + s2 * c;
        h.x = wrap(h.x + h.vx); h.y = wrap(h.y + h.vy);
        // landing: hover slowly over the deck
        const onDeck = Math.abs(wrapd(h.x - carrier.x)) < 44 && Math.abs(wrapd(h.y - carrier.y)) < 9 && carrier.hp > 0;
        if (h.air && onDeck && Math.hypot(h.vx, h.vy) < 0.45 && !up) { h.lowT++; if (h.lowT > 30) h.alt = Math.max(0, h.alt - 0.4); if (h.alt <= 0) { h.landed = true; h.air = false; h.lowT = 0; h.vx = h.vy = 0; say('REPAIR AND RELOAD', 100, '#7ff'); audio.melody([[523, .08], [659, .08], [784, .15]], { vol: 0.1 }); } }
        else h.lowT = 0;
        // weapons
        if (h.cd > 0) h.cd--;
        if (api.key('Space') && h.cd === 0) {
          h.cd = 7;
          for (const sd of [-1, 1]) bullets.push({ x: h.x + c * 9 - s * 3 * sd, y: h.y + s * 9 + c * 3 * sd, vx: c * 4.2 + h.vx, vy: s * 4.2 + h.vy, t: 36 });
          if (bullets.length > 40) bullets.splice(0, bullets.length - 40);
          audio.tone(900, 0.04, { type: 'square', vol: 0.07, slideTo: 300 });
        }
        if ((api.pressed('KeyX') || api.pressed('KeyZ') || (DBG === 'bomb' && api.frame % 50 === 0)) && h.bombs > 0) {
          h.bombs--;
          bombs.push({ x: h.x, y: h.y, vx: h.vx * 0.6, vy: h.vy * 0.6, alt: h.alt, a: h.a });
          audio.tone(700, 0.5, { type: 'triangle', vol: 0.1, slideTo: 150 });
        }
        // rotor wash on water
        if (api.frame % 4 === 0 && !isLand(h.x, h.y) && Math.hypot(h.vx, h.vy) > 0.3) splashes.push({ x: h.x - h.vx * 8, y: h.y - h.vy * 8, t: 0, small: true });
        if (h.dmg >= 100) killHeli();
      }
      function hurtHeli(n) {
        if (heli.dead || heli.landed) return;
        heli.dmg += n; audio.noise(0.12, { vol: 0.2, freq: 3000 });
        if (heli.dmg >= 100) killHeli();
        else if (heli.dmg >= 70 && heli.dmg - n < 70) say('DAMAGE CRITICAL - RETURN TO CARRIER', 200, '#f44');
      }
      function killHeli() { if (heli.dead) return; heli.dead = true; heli.deadT = 0; heli.boomed = false; boom(heli.x, heli.y, true, true); say('HELICOPTER DOWN', 140, '#f44'); }

      function updateBombs() {
        for (let i = bombs.length - 1; i >= 0; i--) {
          const b = bombs[i];
          b.x = wrap(b.x + b.vx); b.y = wrap(b.y + b.vy); b.vx *= 0.98; b.vy *= 0.98; b.alt -= 0.45;
          if (b.alt > 0) continue;
          bombs.splice(i, 1);
          let hit = false;
          // factories
          for (const f of factories) {
            if (!f.alive) continue;
            for (const bl of f.blocks) {
              if (bl.hp <= 0) continue;
              const rx = wrapd(b.x - (f.x + bl.dx)), ry = wrapd(b.y - (f.y + bl.dy));
              if (rx > -7 && rx < bl.w + 7 && ry > -7 && ry < bl.h + 7) {
                bl.hp--; hit = true;
                if (bl.hp <= 0) { bl.rb = 60 * 30; addScore(200); boom(f.x + bl.dx + bl.w / 2, f.y + bl.dy + bl.h / 2, true, false); }
                if (f.blocks.every(q => q.hp <= 0)) {
                  f.alive = false; addScore(2000);
                  const left = factories.filter(q => q.alive).length;
                  say(left ? 'FACTORY DESTROYED - ' + left + ' LEFT' : 'ALL FACTORIES DESTROYED!', 220, '#ffd820');
                  audio.melody([[523, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.13, delay: 0.3 });
                  if (!left) { win(); }
                }
              }
            }
          }
          for (const g of aas) if (!g.dead && Math.hypot(wrapd(b.x - g.x), wrapd(b.y - g.y)) < 11) { g.hp = 0; killAA(g); hit = true; }
          for (const bt of boats) if (!bt.dead && Math.hypot(wrapd(b.x - bt.x), wrapd(b.y - bt.y)) < 10) { bt.hp = 0; killBoat(bt); hit = true; }
          if (ship.state !== 'sunk' && Math.hypot(wrapd(b.x - ship.x), wrapd(b.y - ship.y)) < 22) { hitShip(3); hit = true; }
          if (hit || isLand(b.x, b.y)) { boom(b.x, b.y, false, false); }
          else { splashes.push({ x: b.x, y: b.y, t: 0 }); audio.noise(0.35, { vol: 0.2, freq: 900, slideTo: 200 }); }
        }
        if (splashes.length > 40) splashes.splice(0, splashes.length - 40);
      }
      function killAA(g) { g.dead = true; g.rb = 60 * 40; addScore(100); boom(g.x, g.y, false, false); }
      function killBoat(b) { b.dead = true; b.rb = 60 * 35; addScore(200); boom(b.x, b.y, false, false); }
      function hitShip(n) {
        ship.hp -= n; audio.noise(0.15, { vol: 0.2, freq: 2500 });
        if (ship.hp <= 0) {
          boom(ship.x, ship.y, true, false); boom(ship.x + 14, ship.y + 4, true, false); boom(ship.x - 14, ship.y - 3, true, false);
          addScore(ship.state === 'sail' ? 5000 : 2000);
          say('BATTLESHIP DESTROYED!', 200, '#ffd820');
          ship.state = 'build'; ship.prog = 0; ship.hp = 12; ship.x = yard[0] - 32; ship.y = yard[1]; ship.a = Math.PI; ship.msgd = 0;
        }
      }
      function updateBullets() {
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.x = wrap(b.x + b.vx); b.y = wrap(b.y + b.vy);
          let gone = --b.t <= 0;
          for (const f of fighters) if (!gone && Math.hypot(wrapd(b.x - f.x), wrapd(b.y - f.y)) < 7) { f.hp--; gone = true; if (f.hp <= 0) { f.dead = true; addScore(300); boom(f.x, f.y, false, true); } }
          for (const f of bombers) if (!gone && Math.hypot(wrapd(b.x - f.x), wrapd(b.y - f.y)) < 10) { f.hp--; gone = true; audio.tone(1500, 0.03, { vol: 0.08 }); if (f.hp <= 0) { f.dead = true; addScore(500); boom(f.x, f.y, true, true); } }
          if (!gone && b.t < 26) {
            for (const g of aas) if (!g.dead && Math.hypot(wrapd(b.x - g.x), wrapd(b.y - g.y)) < 5) { g.hp--; gone = true; if (g.hp <= 0) killAA(g); }
            for (const bt of boats) if (!gone && !bt.dead && Math.hypot(wrapd(b.x - bt.x), wrapd(b.y - bt.y)) < 6) { bt.hp--; gone = true; if (bt.hp <= 0) killBoat(bt); }
            if (!gone && ship.state !== 'sunk' && Math.hypot(wrapd(b.x - ship.x), wrapd(b.y - ship.y)) < 16) { gone = true; if (api.frame % 3 === 0) hitShip(0.25); }
          }
          if (gone) bullets.splice(i, 1);
        }
        for (let i = ebullets.length - 1; i >= 0; i--) {
          const b = ebullets[i];
          b.x = wrap(b.x + b.vx); b.y = wrap(b.y + b.vy);
          let gone = --b.t <= 0;
          if (!heli.dead && !heli.landed && Math.hypot(wrapd(b.x - heli.x), wrapd(b.y - heli.y)) < 6) { hurtHeli(b.dmg); gone = true; }
          if (gone) ebullets.splice(i, 1);
        }
        if (ebullets.length > 80) ebullets.splice(0, ebullets.length - 80);
      }
      function fireAt(x, y, sp, dmg, spread) {
        const dx = wrapd(heli.x - x), dy = wrapd(heli.y - y), d = Math.hypot(dx, dy) || 1;
        const lead = d / sp * 0.6;
        const a = Math.atan2(dy + heli.vy * lead, dx + heli.vx * lead) + (spread || 0);
        ebullets.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 90, dmg });
      }
      function heliTargetable() { return !heli.dead && !heli.landed; }
      function updateEnemies() {
        const alive = factories.filter(f => f.alive).length;
        tech += alive / 6 / 60 / 40; // Bungeling war production
        // factory rebuilding & smoke
        for (const f of factories) {
          if (!f.alive) { if (api.frame % 20 === f.i) puff(f.x + (hash(api.frame) - 0.5) * 30, f.y + (hash(api.frame + 1) - 0.5) * 20, '#3a3a3a', -0.2); continue; }
          for (const bl of f.blocks) {
            if (bl.hp <= 0) { if (--bl.rb <= 0) { bl.hp = bl.max; say('FACTORY REBUILT', 90, '#f84'); } else if (api.frame % 15 === 0) puff(f.x + bl.dx + bl.w / 2, f.y + bl.dy + bl.h / 2, '#484848'); }
            else if (bl.type === 'stack' && api.frame % 10 === 0) puff(f.x + bl.dx + 4, f.y + bl.dy + 3, hash(api.frame + bl.dx) < 0.5 ? '#c8c8c8' : '#a0a0a0');
          }
        }
        // AA guns
        const fireEvery = Math.max(50, 150 - tech * 14);
        for (const g of aas) {
          if (g.dead) { if (g.f && g.f.alive && --g.rb <= 0) { g.dead = false; g.hp = 3; } continue; }
          const dx = wrapd(heli.x - g.x), dy = wrapd(heli.y - g.y), d = Math.hypot(dx, dy);
          g.a += clamp(angDiff(g.a, Math.atan2(dy, dx)), -0.06, 0.06);
          if (heliTargetable() && d < 120 && --g.cd <= 0) { g.cd = fireEvery * (0.7 + hash(api.frame + g.x) * 0.6); fireAt(g.x, g.y, 1.7, 5); audio.tone(240, 0.08, { type: 'square', vol: 0.06, slideTo: 120 }); }
        }
        // patrol boats
        for (const b of boats) {
          if (b.dead) { if (--b.rb <= 0) b.dead = false, b.hp = 2; continue; }
          b.ang += b.dir * 0.0032;
          const nx = b.cx + Math.cos(b.ang) * b.r, ny = b.cy + Math.sin(b.ang) * b.r;
          b.a = Math.atan2(ny - b.y, nx - b.x); b.x = nx; b.y = ny;
          if (api.frame % 5 === 0) splashes.push({ x: b.x - Math.cos(b.a) * 8, y: b.y - Math.sin(b.a) * 8, t: 0, small: true });
          const d = Math.hypot(wrapd(heli.x - b.x), wrapd(heli.y - b.y));
          if (heliTargetable() && d < 100 && --b.cd <= 0) { b.cd = Math.max(60, 150 - tech * 12); fireAt(b.x, b.y, 1.9, 7); audio.tone(300, 0.06, { vol: 0.06 }); }
        }
        // fighters: scramble from the factories' airfields toward the helicopter
        if (heliTargetable() && --fighterT <= 0) {
          const maxF = Math.min(5, 1 + Math.floor(tech / 1.2));
          fighterT = Math.max(150, 600 - tech * 70);
          if (fighters.length < maxF && alive > 0) {
            const a = hash(api.frame) * TAU;
            fighters.push({ x: wrap(heli.x + Math.cos(a) * 190), y: wrap(heli.y + Math.sin(a) * 190), a: a + Math.PI, hp: 1 + (tech > 4 ? 1 : 0), cd: 60, life: 60 * 22, dead: false });
            audio.tone(1400, 0.6, { type: 'sawtooth', vol: 0.05, slideTo: 500 });
          }
        }
        for (const f of fighters) {
          if (--f.life <= 0) { f.dead = true; continue; }
          const dx = wrapd(heli.x - f.x), dy = wrapd(heli.y - f.y), d = Math.hypot(dx, dy);
          const want = f.life < 120 ? f.a : Math.atan2(dy, dx);
          if (d > 40 || !heliTargetable()) f.a += clamp(angDiff(f.a, want), -0.035, 0.035);
          const sp = 2.2 + Math.min(0.8, tech * 0.1);
          f.x = wrap(f.x + Math.cos(f.a) * sp); f.y = wrap(f.y + Math.sin(f.a) * sp);
          if (heliTargetable() && d < 130 && Math.abs(angDiff(f.a, Math.atan2(dy, dx))) < 0.35 && --f.cd <= 0) {
            f.cd = Math.max(25, 60 - tech * 5);
            ebullets.push({ x: f.x, y: f.y, vx: Math.cos(f.a) * 3.6, vy: Math.sin(f.a) * 3.6, t: 50, dmg: 8 });
            audio.tone(1100, 0.05, { vol: 0.05, slideTo: 500 });
          }
          if (heliTargetable() && d < 9) { f.dead = true; boom(f.x, f.y, false, true); hurtHeli(30); }
        }
        fighters = fighters.filter(f => !f.dead);
        // bomber raids on the carrier
        if (--bomberT <= 0 && carrier.hp > 0) {
          bomberT = Math.max(60 * 25, 60 * 60 - tech * 300);
          if (alive > 0 && bombers.length < 2) {
            const f = factories.filter(q => q.alive)[Math.floor(hash(api.frame) * alive)];
            bombers.push({ x: f.x, y: f.y, a: Math.atan2(carrier.y - f.y, carrier.x - f.x), hp: 4 + Math.floor(tech / 2), dead: false, dropped: false });
            say('CARRIER UNDER ATTACK!', 200, '#f44');
            audio.melody([[880, .15], [660, .15], [880, .15], [660, .15]], { type: 'square', vol: 0.12 });
          }
        }
        for (const b of bombers) {
          const tx = b.dropped ? b.x + Math.cos(b.a) * 50 : carrier.x, ty = b.dropped ? b.y + Math.sin(b.a) * 50 : carrier.y;
          b.a += clamp(angDiff(b.a, Math.atan2(wrapd(ty - b.y), wrapd(tx - b.x))), -0.02, 0.02);
          b.x = wrap(b.x + Math.cos(b.a) * 0.9); b.y = wrap(b.y + Math.sin(b.a) * 0.9);
          if (!b.dropped && Math.hypot(wrapd(carrier.x - b.x), wrapd(carrier.y - b.y)) < 12) {
            b.dropped = true; carrier.hp -= 2; boom(carrier.x + (hash(api.frame) - 0.5) * 50, carrier.y, true, false);
            say('CARRIER HIT!', 150, '#f44');
            b.leave = 600;
          }
          if (b.dropped && --b.leave <= 0) b.dead = true;
          if (heliTargetable() && Math.hypot(wrapd(heli.x - b.x), wrapd(heli.y - b.y)) < 12) { b.hp = 0; b.dead = true; boom(b.x, b.y, true, true); hurtHeli(40); }
        }
        bombers = bombers.filter(b => !b.dead);
        // battleship construction and voyage
        if (ship.state === 'build') {
          if (alive > 0) ship.prog += 1 / (60 * 150);
          ship.hp = Math.max(ship.hp, 12 + Math.floor(ship.prog * 14 + tech * 2));
          if (ship.prog > 0.5 && ship.msgd === 0) { ship.msgd = 1; say('BATTLESHIP UNDER CONSTRUCTION', 200, '#fa4'); }
          if (ship.prog >= 1) { ship.state = 'sail'; say('BATTLESHIP LAUNCHED!', 240, '#f44'); audio.melody([[220, .3], [196, .3], [175, .6]], { type: 'sawtooth', vol: 0.12 }); }
        } else if (ship.state === 'sail') {
          const dx = wrapd(carrier.x + 70 - ship.x), dy = wrapd(carrier.y - 30 - ship.y), d = Math.hypot(dx, dy);
          ship.a += clamp(angDiff(ship.a, Math.atan2(dy, dx)), -0.01, 0.01);
          if (d > 6) { ship.x = wrap(ship.x + Math.cos(ship.a) * 0.3); ship.y = wrap(ship.y + Math.sin(ship.a) * 0.3); if (api.frame % 6 === 0) splashes.push({ x: ship.x - Math.cos(ship.a) * 30, y: ship.y - Math.sin(ship.a) * 30, t: 0, small: true }); }
          if (heliTargetable() && Math.hypot(wrapd(heli.x - ship.x), wrapd(heli.y - ship.y)) < 130 && --ship.cd <= 0) {
            ship.cd = Math.max(35, 70 - tech * 4);
            for (const sp of [-0.15, 0, 0.15]) fireAt(ship.x, ship.y, 1.8, 10, sp);
            audio.noise(0.15, { vol: 0.15, freq: 600 });
          }
          if (d < 60 && api.frame % 150 === 0 && carrier.hp > 0) { carrier.hp--; boom(carrier.x + (hash(api.frame) - 0.5) * 60, carrier.y + (hash(api.frame + 3) - 0.5) * 10, true, false); say('BATTLESHIP SHELLING CARRIER!', 120, '#f44'); }
        }
        if (carrier.hp <= 0 && carrier.sinkT === 0) {
          carrier.sinkT = 1; say('CARRIER SUNK', 240, '#f44');
          for (let k = 0; k < 4; k++) boom(carrier.x - 36 + k * 24, carrier.y, true, false);
          if (heli.landed) killHeli();
        }
        if (carrier.sinkT > 0) { carrier.sinkT++; if (carrier.sinkT > 240 && mode === 'play') endGame('YOUR CARRIER WAS SUNK'); }
      }
      let endReason = '', bonus = 0;
      // Continue: offered once per ending; on a coin the helicopters come back (and a sunk carrier is
      // refloated and repaired), destroyed factories stay destroyed and the score is kept.
      function endGame(why) {
        if (api.offerContinue) api.offerContinue(continueRaid, () => gameOver(why));
        else gameOver(why);
      }
      function continueRaid() {
        lives = 3;
        if (carrier.hp <= 0 || carrier.sinkT > 0) {
          carrier.hp = 10; carrier.sinkT = 0; bombers = [];
          // the battleship that sank her limps back to the yard
          if (ship.state === 'sail') { ship.state = 'build'; ship.prog = 0.5; ship.x = yard[0] - 32; ship.y = yard[1]; ship.a = Math.PI; ship.msgd = 1; }
        }
        if (heli.dead || heli.landed) spawnHeli();
        ebullets = [];
        say('CONTINUE - CARRIER READY', 180, '#7f7');
      }
      function gameOver(why) {
        mode = 'over'; modeT = 0; endReason = why;
        api.setHiScore(score); if (score > hi) hi = score;
        audio.melody([[392, .25], [370, .25], [349, .25], [330, .6]], { type: 'square', vol: 0.13 });
      }
      function win() {
        mode = 'win'; modeT = 0;
        bonus = lives * 5000 + Math.max(0, carrier.hp) * 1000;
        score += bonus; api.setHiScore(score); if (score > hi) hi = score;
        audio.melody([[523, .12], [659, .12], [784, .12], [1047, .24], [784, .12], [1047, .5]], { type: 'square', vol: 0.14, delay: 0.6 });
      }

      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        for (const m of msgs) m.f--; msgs = msgs.filter(m => m.f > 0);
        for (const e of fx) e.t++; fx = fx.filter(e => e.t < (e.big ? 50 : 32));
        for (const s of smoke) { s.t++; s.x += s.vx; s.y += s.vy; } smoke = smoke.filter(s => s.t < 70);
        for (const s of splashes) s.t++; splashes = splashes.filter(s => s.t < (s.small ? 24 : 30));
        if (mode === 'title') {
          titleCam += 0.004;
          camX = wrap(C + Math.cos(titleCam) * 330); camY = wrap(C + Math.sin(titleCam * 1.3) * 300);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { coinFlash = 0; newGame(); }
            else { coinFlash = 90; audio.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (mode === 'play') {
          updateHeli();
          if (mode !== 'play') return;
          updateBombs(); updateBullets(); updateEnemies();
          // camera with look-ahead
          const tx = heli.x + heli.vx * 22, ty = heli.y + heli.vy * 22;
          camX = wrap(camX + wrapd(tx - camX) * 0.1); camY = wrap(camY + wrapd(ty - camY) * 0.1);
          // rotor sound
          if (!heli.dead && api.frame % 6 === 0) audio.tone(heli.landed ? 55 : 70, 0.05, { type: 'triangle', vol: heli.landed ? 0.03 : 0.06 });
          return;
        }
        if (mode === 'over' || mode === 'win') {
          if (modeT > (mode === 'win' ? 480 : 300) || (modeT > 90 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; modeT = 0; msgs = []; }
        }
      }

      // ---------- render ----------
      let ox = 0, oy = 0; // world->screen offset
      const sx = x => Math.round(wrapd(x - camX) + W / 2);
      const sy = y => Math.round(wrapd(y - camY) + VY + VH / 2);
      const onScreen = (x, y, m) => { const a = wrapd(x - camX), b = wrapd(y - camY); return a > -W / 2 - m && a < W / 2 + m && b > -VH / 2 - m && b < VH / 2 + m; };
      function drawMap(ctx) {
        const L = wrap(Math.round(camX) - W / 2), T = wrap(Math.round(camY) - VH / 2);
        for (const ax of [0, WM]) for (const ay of [0, WM]) {
          const dx = ax - L, dy = ay - T + VY;
          if (dx > W || dx + WM < 0 || dy > H || dy + WM < VY) continue;
          ctx.drawImage(MAP, dx, dy);
        }
        // shimmering waves
        const t = api.frame;
        for (let k = 0; k < 90; k++) {
          const wx = wrap(Math.floor(L + hash(k * 3.1) * W + t * 0.1 * (k & 1 ? 1 : -1))), wy = wrap(Math.floor(T + hash(k * 7.7) * VH));
          if (mask[wy * WM + wx] !== 0) continue;
          const ph = (t + k * 13) % 120; if (ph > 40) continue;
          const len = ph < 20 ? 1 + (ph >> 3) : 4 - ((ph - 20) >> 3);
          ctx.fillStyle = ph < 10 || ph > 30 ? '#3c78d4' : '#6aa8f0';
          ctx.fillRect(sx(wx), sy(wy), Math.max(1, len), 1);
        }
      }
      function drawRot(ctx, frames, x, y, a, dy) { const f = frames[fidx(a)]; ctx.drawImage(f, sx(x) - (f.width >> 1), sy(y) - (f.height >> 1) - (dy || 0)); }
      function drawExp(ctx, e) {
        const fr = e.big ? EXP_L : EXP_S, n = fr.length, f = Math.min(n - 1, Math.floor(e.t / (e.big ? 5 : 4)));
        const img = fr[f]; ctx.drawImage(img, sx(e.x) - (img.width >> 1), sy(e.y) - (img.height >> 1));
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.beginPath(); ctx.rect(0, VY, W, VH); ctx.clip();
        drawMap(ctx);
        if (mode !== 'title' && factories) {
          // splashes & wakes
          for (const s of splashes) {
            if (!onScreen(s.x, s.y, 12)) continue;
            const r = s.small ? 1 + s.t / 8 : 2 + s.t / 4;
            ctx.fillStyle = s.t < 12 ? '#ffffff' : '#a8d4f8';
            for (let k = 0; k < (s.small ? 4 : 10); k++) { const a = k / (s.small ? 4 : 10) * TAU + s.t * 0.05; ctx.fillRect(sx(s.x + Math.cos(a) * r), sy(s.y + Math.sin(a) * r), 1, 1); }
          }
          // carrier
          if (onScreen(carrier.x, carrier.y, 60)) {
            if (carrier.sinkT > 0) { ctx.globalAlpha = Math.max(0, 1 - carrier.sinkT / 240); }
            ctx.drawImage(CARRIER, sx(carrier.x) - 50, sy(carrier.y) - 13);
            ctx.globalAlpha = 1;
          }
          // shipyard & battleship
          if (ship.state === 'build') {
            if (onScreen(ship.x, ship.y, 60)) {
              const img = BSHIP[fidx(ship.a)], w = Math.max(4, Math.round(img.width * ship.prog));
              const x0 = sx(ship.x) - (img.width >> 1), y0 = sy(ship.y) - (img.height >> 1);
              ctx.drawImage(img, img.width - w, 0, w, img.height, x0 + img.width - w, y0, w, img.height);
              // scaffolding & cranes
              ctx.fillStyle = '#c8a040';
              for (let k = 0; k < 4; k++) { const cx = x0 + 12 + k * 14; ctx.fillRect(cx, y0 + 18, 1, 14); ctx.fillRect(cx, y0 + 18, 1, 1); }
              const cr = Math.sin(api.frame * 0.02) * 10;
              ctx.fillStyle = '#ffd820'; ctx.fillRect(x0 + 20, y0 + 10, 1, 24); ctx.fillRect(x0 + 20 + Math.round(cr), y0 + 10, 1, 1);
              ctx.fillRect(Math.min(x0 + 20, x0 + 20 + Math.round(cr)), y0 + 10, Math.abs(Math.round(cr)) + 1, 1);
            }
          } else if (onScreen(ship.x, ship.y, 60)) drawRot(ctx, BSHIP, ship.x, ship.y, ship.a);
          // factories
          for (const f of factories) {
            if (!onScreen(f.x, f.y, 50)) continue;
            for (const bl of f.blocks) {
              const x = sx(f.x + bl.dx), y = sy(f.y + bl.dy);
              if (bl.hp > 0) {
                const img = FACT[bl.type];
                ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 2, y + 2, bl.w, bl.h);
                ctx.drawImage(img, x, y);
                if (bl.hp < bl.max && (api.frame & 8)) { ctx.fillStyle = '#ff8818'; ctx.fillRect(x + 4, y + 4, 2, 2); }
              } else { for (let ry = 0; ry < bl.h - 4; ry += 7) for (let rx = 0; rx < bl.w - 4; rx += 9) ctx.drawImage(FACT.rubble, x + rx - 1, y + ry - 1); }
            }
            if (!f.alive && (api.frame & 16)) { ctx.fillStyle = '#ff6818'; ctx.fillRect(sx(f.x) - 3, sy(f.y), 2, 2); ctx.fillRect(sx(f.x) + 8, sy(f.y) - 6, 2, 2); }
          }
          // AA guns
          for (const g of aas) {
            if (!onScreen(g.x, g.y, 10)) continue;
            const x = sx(g.x), y = sy(g.y);
            if (g.dead) { ctx.drawImage(CRATER, x - 3, y - 3); continue; }
            ctx.drawImage(AA_BASE, x - 5, y - 5);
            ctx.fillStyle = '#202020';
            for (let k = 2; k < 7; k++) ctx.fillRect(Math.round(x + Math.cos(g.a) * k), Math.round(y + Math.sin(g.a) * k), 1, 1);
          }
          // boats
          for (const b of boats) if (!b.dead && onScreen(b.x, b.y, 14)) drawRot(ctx, BOAT, b.x, b.y, b.a);
          // ground explosions
          for (const e of fx) if (!e.air && onScreen(e.x, e.y, 20)) drawExp(ctx, e);
          // smoke
          for (const s of smoke) {
            if (!onScreen(s.x, s.y, 4)) continue;
            const r = 1 + Math.floor(s.t / 20);
            ctx.globalAlpha = Math.max(0, 1 - s.t / 70); ctx.fillStyle = s.col; ctx.fillRect(sx(s.x) - r, sy(s.y) - r, r * 2, r * 2); ctx.globalAlpha = 1;
          }
          // shadows of aircraft
          const shOff = a => [Math.round(a * 0.55), Math.round(a * 0.8)];
          const H_ALT = heli.alt;
          if (!heli.dead || heli.alt > 0) { const [ox2, oy2] = shOff(H_ALT); const f = HELI_SH[fidx(heli.a)]; ctx.drawImage(f, sx(heli.x) - (f.width >> 1) + ox2, sy(heli.y) - (f.height >> 1) + oy2); }
          for (const f of fighters) { const img = JET_SH[fidx(f.a)]; ctx.drawImage(img, sx(f.x) - (img.width >> 1) + 14, sy(f.y) - (img.height >> 1) + 20); }
          for (const b of bombers) { const img = BOMBER_SH[fidx(b.a)]; ctx.drawImage(img, sx(b.x) - (img.width >> 1) + 16, sy(b.y) - (img.height >> 1) + 22); }
          // bombs
          for (const b of bombs) {
            const x = sx(b.x), y = sy(b.y), [ox2, oy2] = shOff(b.alt);
            ctx.fillStyle = 'rgba(0,0,30,0.4)'; ctx.fillRect(x + ox2 - 1, y + oy2 - 1, 2, 2);
            const s = b.alt > 8 ? 2 : 1;
            ctx.fillStyle = '#202020'; ctx.fillRect(x - s, y - s, s * 2 + 1, s * 2 + 1);
            ctx.fillStyle = '#ffd820'; ctx.fillRect(x - s, y - s, 1, 1);
          }
          // aircraft
          for (const b of bombers) drawRot(ctx, BOMBER, b.x, b.y, b.a);
          for (const f of fighters) drawRot(ctx, JET, f.x, f.y, f.a);
          if (!(heli.dead && heli.boomed)) {
            const lift = Math.round(heli.alt * 0.15);
            drawRot(ctx, HELI, heli.x, heli.y, heli.a, lift);
            // main rotor: two blades spinning + faint disc
            const hx = sx(heli.x + Math.cos(heli.a) * 2), hy = sy(heli.y + Math.sin(heli.a) * 2) - lift;
            const spin = heli.landed && !api.key('ArrowUp') ? api.frame * 0.25 : api.frame * 0.9;
            ctx.fillStyle = 'rgba(220,224,230,0.18)';
            for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; ctx.fillRect(Math.round(hx + Math.cos(a) * 11), Math.round(hy + Math.sin(a) * 11), 1, 1); }
            for (const off of [0, Math.PI / 2]) {
              const a = spin + off, c = Math.cos(a), s = Math.sin(a);
              for (let k = -12; k <= 12; k++) { ctx.fillStyle = Math.abs(k) > 9 ? 'rgba(30,30,34,0.3)' : 'rgba(30,30,34,0.5)'; ctx.fillRect(Math.round(hx + c * k), Math.round(hy + s * k), 1, 1); }
            }
            ctx.fillStyle = '#181818'; ctx.fillRect(hx - 1, hy - 1, 2, 2);
          }
          // bullets
          ctx.fillStyle = '#fff8a0';
          for (const b of bullets) { ctx.fillRect(sx(b.x), sy(b.y), 2, 2); }
          for (const b of ebullets) { ctx.fillStyle = (api.frame & 2) ? '#ff4020' : '#ffe040'; ctx.fillRect(sx(b.x) - 1, sy(b.y) - 1, 3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(sx(b.x), sy(b.y), 1, 1); }
          for (const e of fx) if (e.air && onScreen(e.x, e.y, 20)) drawExp(ctx, e);
        }
        ctx.restore();
        if (mode === 'title') return renderTitle(ctx);
        renderHUD(ctx);
        if (mode === 'over' || mode === 'win') {
          ctx.fillStyle = 'rgba(0,0,30,0.7)'; ctx.fillRect(20, 80, 216, 76);
          if (mode === 'win') {
            textS(ctx, 'MISSION', W / 2, 88, '#ffd820', 2, 'center'); textS(ctx, 'ACCOMPLISHED', W / 2, 106, '#ffd820', 2, 'center');
            textS(ctx, 'BONUS ' + bonus, W / 2, 128, '#fff', 1, 'center'); textS(ctx, 'SCORE ' + score, W / 2, 140, '#fff', 1, 'center');
          } else {
            textS(ctx, 'GAME OVER', W / 2, 92, '#f44', 2, 'center');
            textS(ctx, endReason, W / 2, 116, '#fff', 1, 'center');
            textS(ctx, 'SCORE ' + score, W / 2, 130, '#ffd820', 1, 'center');
            textS(ctx, 'FACTORIES LEFT ' + factories.filter(f => f.alive).length, W / 2, 142, '#7ff', 1, 'center');
          }
        }
      }
      function renderHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, VY);
        ctx.fillStyle = '#2050c0'; ctx.fillRect(0, VY - 1, W, 1);
        text(ctx, 'SCORE', 2, 1, '#7ff'); text(ctx, String(score).padStart(6, '0'), 34, 1, '#fff');
        text(ctx, 'HI', 82, 1, '#7ff'); text(ctx, String(Math.max(hi, score)).padStart(6, '0'), 96, 1, '#fff');
        // lives
        for (let k = 0; k < Math.min(4, lives - (heli.dead ? 0 : 1)); k++) { const ic = HELI[24]; ctx.drawImage(ic, 7, 3, 18, 26, 148 + k * 9, 0, 6, 8); }
        // factories remaining
        const left = factories.filter(f => f.alive).length;
        text(ctx, 'FACT', 214, 1, '#fa4'); text(ctx, String(left), 242, 1, '#fff');
        // damage bar
        text(ctx, 'DMG', 2, 9, '#f66');
        ctx.fillStyle = '#303030'; ctx.fillRect(22, 9, 52, 6);
        const dm = Math.min(100, heli.dmg);
        ctx.fillStyle = dm > 70 ? ((api.frame & 8) ? '#ff2020' : '#901010') : dm > 40 ? '#ffb020' : '#30d040';
        ctx.fillRect(23, 10, Math.round(dm / 2), 4);
        // bombs
        text(ctx, 'BOMB', 82, 9, '#ffd820');
        for (let k = 0; k < Math.min(9, heli.bombs); k++) { ctx.fillStyle = '#d8d8d8'; ctx.fillRect(108 + k * 4, 10, 2, 5); ctx.fillStyle = '#ffd820'; ctx.fillRect(108 + k * 4, 10, 2, 1); }
        // carrier health
        text(ctx, 'CV', 148, 9, '#7ff');
        for (let k = 0; k < 10; k++) { ctx.fillStyle = k < carrier.hp ? '#7ff' : '#203040'; ctx.fillRect(162 + k * 3, 10, 2, 5); }
        // battleship status
        if (ship.state === 'build') { text(ctx, 'SHIP', 196, 9, '#f84'); text(ctx, Math.floor(ship.prog * 100) + '%', 224, 9, '#fff'); }
        else if (api.frame & 16) text(ctx, 'SHIP!', 214, 9, '#f44');
        // radar
        const rx = W - RAD - 4, ry = H - RAD - 4;
        ctx.fillStyle = '#90a0b0'; ctx.fillRect(rx - 2, ry - 2, RAD + 4, RAD + 4);
        ctx.fillStyle = '#000'; ctx.fillRect(rx - 1, ry - 1, RAD + 2, RAD + 2);
        ctx.drawImage(RADAR, rx, ry);
        const rs = RAD / WM;
        ctx.fillStyle = carrier.hp > 0 ? '#ffffff' : '#555'; ctx.fillRect(rx + Math.round(carrier.x * rs) - 2, ry + Math.round(carrier.y * rs), 4, 1);
        for (const f of factories) if (f.alive) { ctx.fillStyle = '#ff3030'; ctx.fillRect(rx + Math.round(f.x * rs) - 1, ry + Math.round(f.y * rs) - 1, 2, 2); }
        if (ship.state === 'sail' || (api.frame & 32)) { ctx.fillStyle = ship.state === 'sail' ? '#ff8000' : '#a05000'; ctx.fillRect(rx + Math.round(ship.x * rs) - 1, ry + Math.round(ship.y * rs), 3, 1); }
        for (const b of bombers) { ctx.fillStyle = '#ffd820'; ctx.fillRect(rx + Math.round(b.x * rs), ry + Math.round(b.y * rs), 1, 1); }
        if (api.frame & 8) { ctx.fillStyle = '#7ff'; ctx.fillRect(rx + Math.round(heli.x * rs) - 1, ry + Math.round(heli.y * rs) - 1, 2, 2); }
        // messages
        let my = 24;
        for (const m of msgs) { if (m.f > 40 || (m.f & 4)) textS(ctx, m.t, W / 2, my, m.col, 1, 'center'); my += 10; }
        if (heli.landed && !heli.dead && mode === 'play' && (api.frame & 32)) textS(ctx, 'UP TO TAKE OFF', W / 2, H - 20, '#fff', 1, 'center');
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,10,40,0.55)'; ctx.fillRect(0, 0, W, H);
        const G = ['#ffffff', '#e0f0ff', '#b0d8ff', '#80c0ff', '#58a0f0', '#3880e0', '#2060c8'];
        textS(ctx, 'RAID ON', W / 2, 22, '#ffd820', 2, 'center');
        textS(ctx, 'BUNGELING', W / 2, 42, G, 3, 'center');
        textS(ctx, 'BAY', W / 2, 68, G, 3, 'center');
        // big helicopter emblem
        ctx.drawImage(HELI[NF - 4], W / 2 - 32, 100 + Math.round(Math.sin(api.time * 2) * 2), 64, 64);
        textS(ctx, 'DESTROY THE SIX FACTORIES', W / 2, 168, '#fff', 1, 'center');
        textS(ctx, 'BEFORE THE BATTLESHIP SAILS', W / 2, 178, '#fff', 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 196, '#f44', 1, 'center'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) textS(ctx, 'INSERT COIN', W / 2, 196, '#ffd820', 1, 'center'); }
        else textS(ctx, 'PRESS START', W / 2, 196, (api.frame >> 5) & 1 ? '#ffd820' : '#fff', 1, 'center');
        textS(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, 6, '#fff', 1, 'right');
        textS(ctx, 'HI SCORE ' + hi, W / 2, 210, '#7ff', 1, 'center');
        textS(ctx, '\u00a9 1984 BRODERBUND', W / 2, 226, '#888', 1, 'center');
      }
      return { update, render };
    }
  });
})();
