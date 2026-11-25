// Sky Shark (Toaplan, 1987) \u2014 from-scratch recreation of the vertical biplane shooter
// (released in Japan/Europe as "Flying Shark"). Procedural pixel art, synthesized sound.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], 'x': [0, 0, 17, 10, 4, 10, 17]
  };
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1; s = String(s);
    if (!o.keep) s = s.toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = x - w;
    if (o.shadow) { const c0 = col; text(ctx, s, x + sc, y + sc, o.shadow, { scale: sc, keep: true }); col = c0; }
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function rotRows(rows, a, N) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const c = (N - 1) / 2, cx = (w - 1) / 2, cy = (h - 1) / 2, cs = Math.cos(-a), sn = Math.sin(-a), out = [];
    for (let y = 0; y < N; y++) {
      let s = '';
      for (let x = 0; x < N; x++) {
        const dx = x - c, dy = y - c;
        const sx = Math.round(cx + dx * cs - dy * sn), sy = Math.round(cy + dx * sn + dy * cs);
        s += (sy >= 0 && sy < h && sx >= 0 && sx < w) ? (rows[sy][sx] || '.') : '.';
      }
      out.push(s);
    }
    return out;
  }
  const NDIR = 16;
  function rotSet(rows, pal, N) { const a = []; for (let i = 0; i < NDIR; i++) a.push(spr(rotRows(rows, i * 2 * Math.PI / NDIR, N), pal)); return a; }
  function flipV(rows) { return rows.slice().reverse(); }
  function rng(seed) { let s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function disc(ctx, cx, cy, r, col) {
    ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
  }
  function line(ctx, x0, y0, ang, len, col, th) {
    ctx.fillStyle = col; th = th || 2;
    for (let i = 0; i <= len; i++) ctx.fillRect(Math.round(x0 + Math.cos(ang) * i - th / 2), Math.round(y0 + Math.sin(ang) * i - th / 2), th, th);
  }

  const W = 224, H = 320, CH = 320;

  // ---------- sprites (all aircraft drawn facing UP) ----------
  const ART = {
    player: [
      '.......kk.......',
      '......kYYk......',
      '.......YY.......',
      'WWWWWWWYYWWWWWWW',
      'WRRWBBBYYBBBWRRW',
      'B.s....YY....s.B',
      'WWWWWWWYYWWWWWWW',
      'BRRBBBBYYBBBBRRB',
      '......BCCB......',
      '.......YY.......',
      '.......YY.......',
      '.......YY.......',
      '....WWWYYWWW....',
      '....BBBBBBBB....',
      '.......BB.......'],
    fighter: [
      '......k......',
      '.....kOk.....',
      '.....GOG.....',
      'GGGGGGOGGGGGG',
      'gGGYGGOGGYGGg',
      '.gggGGCGGggg.',
      '.....GOG.....',
      '.....GOG.....',
      '......G......',
      '....GGGGG....',
      '.....ggg.....'],
    bomber: [
      '...........NN...........',
      '..........NCCN..........',
      '....kk....GGGG....kk....',
      '...EEEE...GGGG...EEEE...',
      'GGGEEEEGGGGGGGGGGEEEEGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGG',
      'gYgggggggggGGgggggggggYg',
      '.ggggggggggGGgggggggggg.',
      '..........GGGG..........',
      '..........GGGG..........',
      '...........GG...........',
      '...........GG...........',
      '...........GG...........',
      '.......GGGGGGGGGG.......',
      '.......gggggggggg.......'],
    shotP: ['.Y.', 'YWY', 'YWY', 'OYO', '.O.']
  };
  const PAL = {
    player: { W: '#e8f0ff', B: '#3a68d8', Y: '#f0c040', R: '#e02828', C: '#60e8ff', k: '#404040', s: '#a0a0a0' },
    fighter: { G: '#4f7a3a', g: '#2f4f22', O: '#c8c890', Y: '#ffd040', C: '#80e0ff', k: '#303030' },
    red: { G: '#d83020', g: '#801810', O: '#ffe0a0', Y: '#ffffff', C: '#80e0ff', k: '#303030' },
    bomber: { G: '#6a7a4a', g: '#3e4a2a', N: '#9aa070', C: '#80e0ff', E: '#2a2a2a', Y: '#ffd040', k: '#555' }
  };
  const SHADOW = { W: '#000', B: '#000', Y: '#000', R: '#000', C: '#000', G: '#000', g: '#000', O: '#000', N: '#000', E: '#000', k: '#000', s: '#000' };
  const SP = {
    player: spr(ART.player, PAL.player), playerSh: spr(ART.player, SHADOW),
    fighter: rotSet(ART.fighter, PAL.fighter, 15), red: rotSet(ART.fighter, PAL.red, 15), fighterSh: rotSet(ART.fighter, SHADOW, 15),
    bomber: spr(flipV(ART.bomber), PAL.bomber), bomberSh: spr(flipV(ART.bomber), SHADOW),
    shot: spr(ART.shotP, { Y: '#ffe040', W: '#ffffff', O: '#ff7020' }),
    life: spr(['...Y...', 'WWWYWWW', '...Y...', 'WWWYWWW', '...Y...', '..WYW..'], { W: '#e8f0ff', Y: '#f0c040' }),
    bombIcon: spr(['.RR.', 'RRRR', 'RWRR', 'RRRR', '.RR.', '.kk.', 'k..k'], { R: '#d83020', W: '#ffffff', k: '#888' }),
    star: [spr(['....Y....', '...YYY...', 'YYYYWYYYY', '.YYWWWYY.', '..YYWYY..', '..YY.YY..', '.YY...YY.'], { Y: '#ffd800', W: '#ffffff' }),
      spr(['....O....', '...OOO...', 'OOOOYOOOO', '.OOYYYOO.', '..OOYOO..', '..OO.OO..', '.OO...OO.'], { O: '#ff9000', Y: '#ffe060' })]
  };

  // ---------- stages ----------
  // land: textures for each 640-unit section; water(px, wy) -> true if sea/river
  function riverAt(px, wy, every, off) {
    const m = ((wy - off) % every + every) % every;
    const c = every / 2 + 10 * Math.sin(px / 28 + wy / 900);
    return Math.abs(m - c) < 15;
  }
  const STAGES = [
    { name: 'JUNGLE', land: ['jungle', 'jungle', 'field', 'jungle', 'field', 'jungle', 'base', 'base'], len: 4200,
      water: (px, wy) => riverAt(px, wy, 1100, 300), boss: 'tank' },
    { name: 'COASTLINE', land: ['jungle', 'field', 'jungle', 'base', 'jungle', 'field', 'jungle', 'jungle'], len: 4600,
      water: (px, wy) => px > 112 + 150 * Math.sin(wy / 1300 - 0.6) + 18 * Math.sin(wy / 97) + 10 * Math.sin(wy / 41 + px / 60) || wy > 4300, boss: 'battleship' },
    { name: 'DESERT', land: ['desert', 'desert', 'base', 'desert', 'desert', 'base', 'desert', 'base'], len: 4800,
      water: (px, wy) => (wy % 1700 > 1500) && Math.abs(px - 70 - 30 * Math.sin(wy / 60)) < 36, boss: 'bomber' },
    { name: 'HARBOR', land: ['city', 'base', 'field', 'city', 'base', 'base', 'city', 'base'], len: 5000,
      water: (px, wy) => px < 60 + 40 * Math.sin(wy / 700) + 8 * Math.sin(wy / 53) || wy > 4600, boss: 'dreadnought' },
    { name: 'FORTRESS', land: ['city', 'city', 'base', 'desert', 'city', 'base', 'base', 'base'], len: 5200,
      water: (px, wy) => riverAt(px, wy, 1300, 650), boss: 'fortress' }
  ];
  const LANDPAL = {
    jungle: ['#2f6b1f', '#356f22', '#2a6019'], field: ['#7a9a3a', '#93a347', '#6b8530', '#a09a50'],
    desert: ['#c8a060', '#d0aa6a', '#bf9656'], base: ['#8a8a80', '#848478', '#90907f'], city: ['#6e6a62', '#77736a', '#625e57']
  };

  // ---------- music (original) ----------
  const MEL = [69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 72, 74, 76, 0, 0, 0, 69, 0, 72, 0, 77, 0, 76, 74, 72, 0, 71, 0, 69, 0, 0, 0,
    72, 0, 76, 0, 79, 0, 77, 76, 74, 0, 76, 77, 79, 0, 0, 0, 81, 0, 79, 77, 76, 0, 74, 72, 71, 0, 72, 71, 69, 0, 0, 0];
  const BAS = [45, 45, 52, 52, 45, 45, 52, 52, 41, 41, 48, 48, 43, 43, 52, 52, 48, 48, 55, 55, 43, 43, 50, 50, 41, 41, 48, 48, 40, 40, 45, 45];
  const BMEL = [57, 0, 57, 60, 0, 57, 63, 0, 62, 0, 60, 0, 58, 0, 57, 0, 57, 0, 57, 60, 0, 57, 64, 0, 63, 0, 62, 0, 60, 0, 59, 0];
  const BBAS = [33, 33, 33, 33, 34, 34, 34, 34, 33, 33, 33, 33, 32, 32, 32, 32];
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

  ArcadeRegistry.register({
    id: 'skyshark', title: 'Sky Shark', year: 1987, maker: 'Toaplan',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: fire (hold) \u00b7 X: bomb \u00b7 Enter: start',
    marquee: { bg: '#0b2a12', fg: '#f0c040', accent: '#e02828' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', titleT = 0, frame = 0;
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }

      const sfx = {
        shot() { au.tone(1200, 0.04, { type: 'square', vol: 0.03, slideTo: 800 }); },
        hit() { au.tone(1800, 0.02, { type: 'square', vol: 0.03 }); },
        boomS() { au.noise(0.25, { freq: 3000, slideTo: 300, vol: 0.14 }); },
        boomM() { au.noise(0.5, { freq: 1800, slideTo: 120, vol: 0.2 }); au.tone(160, 0.3, { type: 'sawtooth', slideTo: 40, vol: 0.06 }); },
        boomL() { au.noise(1.4, { freq: 1500, slideTo: 50, vol: 0.28 }); au.tone(110, 1.0, { type: 'sawtooth', slideTo: 30, vol: 0.1 }); },
        bomb() { au.noise(1.8, { freq: 900, slideTo: 40, vol: 0.3 }); au.tone(80, 1.5, { type: 'triangle', slideTo: 30, vol: 0.2 }); },
        item() { au.melody([[880, .05], [1175, .05], [1568, .08]], { type: 'square', vol: 0.08 }); },
        star() { au.tone(1568, 0.05, { type: 'square', vol: 0.06 }); au.tone(2093, 0.08, { type: 'square', vol: 0.06, delay: 0.05 }); },
        die() { au.noise(1.2, { freq: 2500, slideTo: 60, vol: 0.3 }); au.tone(440, 1.0, { type: 'sawtooth', slideTo: 40, vol: 0.08 }); },
        warn() { for (let i = 0; i < 4; i++) au.tone(i & 1 ? 660 : 880, 0.18, { type: 'square', vol: 0.07, delay: i * 0.22 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.08 }); },
        behind() { au.tone(300, 0.5, { type: 'sawtooth', slideTo: 900, vol: 0.05 }); }
      };

      // ---------- terrain chunks ----------
      const chunks = new Map();
      let curStageIdx = 0, attractScroll = 0;
      function landKind(st, wy) { return st.land[Math.max(0, Math.floor(wy / 640)) % st.land.length]; }
      function isWater(px, wy) { const st = STAGES[curStageIdx]; return wy >= 0 && st.water(px, wy); }
      function makeChunk(k) {
        const st = STAGES[curStageIdx];
        const c = document.createElement('canvas'); c.width = W; c.height = CH;
        const x = c.getContext('2d');
        const R = rng(curStageIdx * 7919 + k * 104729 + 17);
        const wet = [];
        for (let py = 0; py < CH; py += 4) {
          const row = [];
          for (let px = 0; px < W; px += 4) {
            const wy = (k + 1) * CH - py;
            const w = isWater(px + 2, wy);
            row.push(w);
            let col;
            if (w) col = ((px * 7 + wy * 3) >> 4) % 5 === 0 ? '#2358a8' : '#1d4f9a';
            else { const pal = LANDPAL[landKind(st, wy)]; col = pal[(((px >> 4) * 31 + (wy >> 4) * 17) ^ (wy >> 6)) % pal.length]; }
            x.fillStyle = col; x.fillRect(px, py, 4, 4);
          }
          wet.push(row);
        }
        // shoreline sand
        for (let r = 0; r < wet.length; r++) for (let q = 0; q < wet[r].length; q++) {
          if (wet[r][q]) continue;
          const n = (wet[r - 1] && wet[r - 1][q]) || (wet[r + 1] && wet[r + 1][q]) || wet[r][q - 1] || wet[r][q + 1];
          if (n) { x.fillStyle = '#d8c080'; x.fillRect(q * 4, r * 4, 4, 4); }
        }
        const landAt = (px, py) => { const r = wet[py >> 2], q = px >> 2; return r && q >= 0 && q < r.length && !r[q]; };
        // details
        for (let i = 0; i < 260; i++) {
          const px = Math.floor(R() * W), py = Math.floor(R() * CH), wy = (k + 1) * CH - py;
          if (!landAt(px, py)) {
            if (i % 3 === 0) { x.fillStyle = '#5a8ad0'; x.fillRect(px, py, 3 + Math.floor(R() * 4), 1); }
            continue;
          }
          const kind = landKind(st, wy);
          if (kind === 'jungle') {
            const r = 3 + Math.floor(R() * 4);
            disc(x, px, py, r + 1, '#1c4612'); disc(x, px - 1, py - 1, r, '#2b6a1d'); disc(x, px - 2, py - 2, Math.max(1, r - 2), '#4a8f2c');
          } else if (kind === 'field') {
            if (i % 4 === 0) { x.fillStyle = '#5c7426'; x.fillRect(px, py, 24 + Math.floor(R() * 20), 2); }
            else if (i % 7 === 0) { disc(x, px, py, 3, '#2f5a1c'); disc(x, px - 1, py - 1, 2, '#4f8a2c'); }
          } else if (kind === 'desert') {
            if (i % 3 === 0) { x.fillStyle = '#a88040'; x.fillRect(px, py, 10 + Math.floor(R() * 14), 1); x.fillStyle = '#e0c088'; x.fillRect(px + 2, py - 1, 8, 1); }
            else if (i % 11 === 0) { disc(x, px, py, 2, '#7a6040'); }
          } else if (kind === 'base') {
            if (i % 9 === 0) {
              const bw = 18 + Math.floor(R() * 14), bh = 12 + Math.floor(R() * 8);
              x.fillStyle = '#4a4a40'; x.fillRect(px + 2, py + 2, bw, bh);
              x.fillStyle = '#6e6c5a'; x.fillRect(px, py, bw, bh);
              x.fillStyle = '#5a584a'; for (let s = 2; s < bh; s += 3) x.fillRect(px, py + s, bw, 1);
            } else if (i % 4 === 0) { x.fillStyle = '#76766c'; x.fillRect(px, py, 30, 1); x.fillRect(px, py, 1, 20); }
          } else if (kind === 'city') {
            if (i % 5 === 0) {
              const bw = 8 + Math.floor(R() * 14), bh = 8 + Math.floor(R() * 12);
              x.fillStyle = '#3a3630'; x.fillRect(px + 2, py + 2, bw, bh);
              x.fillStyle = i % 2 ? '#8a5040' : '#7a7468'; x.fillRect(px, py, bw, bh);
              x.fillStyle = '#4a4038'; x.fillRect(px + 2, py + 2, bw - 4, 1);
            } else if (i % 7 === 0) { disc(x, px, py, 4, '#3e3a34'); disc(x, px, py, 2, '#2a2622'); }
          }
        }
        // roads
        const kind0 = landKind(st, k * CH + 160);
        if (kind0 !== 'jungle' || k % 2 === 0) {
          const ry = 40 + Math.floor(R() * 220);
          for (let px = 0; px < W; px += 2) if (landAt(px, ry)) { x.fillStyle = kind0 === 'base' || kind0 === 'city' ? '#4c4c48' : '#8a6a3a'; x.fillRect(px, ry, 2, 6); if (kind0 === 'base' && (px & 8)) { x.fillStyle = '#d8d8c0'; x.fillRect(px, ry + 2, 2, 1); } }
        }
        if (kind0 === 'base' && k % 3 === 1) {
          // runway
          const rx = 60 + Math.floor(R() * 90);
          x.fillStyle = '#3e3e3a'; x.fillRect(rx, 0, 28, CH);
          x.fillStyle = '#e8e8d8'; for (let py = 6; py < CH; py += 24) x.fillRect(rx + 13, py, 2, 12);
        }
        return c;
      }
      function chunk(k) {
        let c = chunks.get(k);
        if (!c) { c = makeChunk(k); chunks.set(k, c); for (const key of chunks.keys()) if (key < k - 2 || key > k + 3) chunks.delete(key); }
        return c;
      }
      function drawTerrain(ctx, scroll) {
        const k0 = Math.floor(scroll / CH);
        for (let k = k0; k <= k0 + 2; k++) {
          const sy = Math.round(H - ((k + 1) * CH - scroll));
          if (sy > H || sy + CH < 0) continue;
          if (k < 0) { ctx.fillStyle = '#2f6b1f'; ctx.fillRect(0, sy, W, CH); continue; }
          ctx.drawImage(chunk(k), 0, sy);
        }
      }

      // ---------- game state ----------
      let g = null;
      function newGame() {
        g = {
          score: 0, lives: 2, nextExtra: 50000, stage: 0, loop: 0, stars: 0,
          p: { x: 112, y: 280, dead: 0, inv: 120, lv: 1, bombs: 3, cool: 0, bank: 0 },
          shots: [], ebul: [], ents: [], items: [], fx: [], decals: [], pops: [],
          bomb: null, flash: 0, shake: 0
        };
        startStage(0);
      }
      function startStage(idx) {
        g.stage = idx; curStageIdx = idx % STAGES.length; chunks.clear();
        g.scroll = 0; g.speed = 0.6; g.phase = 'intro'; g.phaseT = 170;
        g.ents = []; g.ebul = []; g.items = []; g.decals = []; g.boss = null; g.redCount = 0;
        g.events = buildEvents(); g.ei = 0; g.stageStars = 0; g.tally = 0;
        const p = g.p; p.x = 112; p.y = 280; p.inv = 120;
        au.melody([[523, .1], [659, .1], [784, .1], [1047, .25], [784, .1], [1047, .35]], { type: 'square', vol: 0.07 });
      }
      function diff() { return 1 + g.stage * 0.12 + g.loop * 0.45; }

      function buildEvents() {
        const st = STAGES[curStageIdx], R = rng(1000 + g.stage * 77);
        const ev = [];
        let d = 140;
        const len = st.len;
        const pats = ['dive', 'line', 'swoop', 'hover', 'dive', 'cross'];
        while (d < len - 150) {
          const r = R();
          if (r < 0.34) ev.push({ d, k: 'air', pat: pats[Math.floor(R() * pats.length)], side: R() < 0.5 ? -1 : 1, x: 30 + R() * 164 });
          else if (r < 0.74) { const n = 1 + Math.floor(R() * 3); for (let i = 0; i < n; i++) ev.push({ d: d + i * 14, k: 'ground', x: 20 + R() * 184, r: R() }); }
          else if (r < 0.84 && d > 500) ev.push({ d, k: 'bomber', x: 40 + R() * 144 });
          else if (r < 0.92 && d > 700) ev.push({ d, k: 'behind', x: 40 + R() * 144 });
          else ev.push({ d, k: 'air', pat: 'dive', side: 1, x: 40 + R() * 144 });
          d += 44 + R() * 60 - Math.min(20, g.loop * 8 + g.stage * 2);
        }
        for (let rd = 450; rd < len - 200; rd += 900) ev.push({ d: rd, k: 'red', side: (rd / 900 | 0) % 2 ? 1 : -1 });
        ev.sort((a, b) => a.d - b.d);
        return ev;
      }

      // ---------- entities ----------
      const DEF = {
        fighter: { hp: 1, w: 12, h: 12, pts: 100, air: true },
        red: { hp: 1, w: 12, h: 12, pts: 200, air: true },
        bomber: { hp: 14, w: 24, h: 15, pts: 1500, air: true },
        tank: { hp: 3, w: 12, h: 14, pts: 300 },
        gun: { hp: 5, w: 14, h: 14, pts: 400 },
        house: { hp: 3, w: 16, h: 14, pts: 100 },
        boat: { hp: 8, w: 12, h: 30, pts: 600 },
        destroyer: { hp: 22, w: 16, h: 50, pts: 2000 }
      };
      function addEnt(t, x, y, o) {
        const d = DEF[t];
        const e = Object.assign({ t, x, y, hp: d.hp, w: d.w, h: d.h, pts: d.pts, air: !!d.air, ang: Math.PI / 2, spd: 1.5, age: 0, cool: 60 + Math.random() * 80, flash: 0, prog: null, pi: 0, pt: 0, tur: Math.PI / 2 }, o || {});
        g.ents.push(e); return e;
      }
      // flight programs: [frames, turn rad/frame, speed, fire?]
      function prog(name, side) {
        const s = side;
        switch (name) {
          case 'dive': return [[50, 0, 2.2], [1, 0, 2.2, 1], [50, 0.035 * s, 2.4], [400, 0, 2.8]];
          case 'line': return [[70, 0, 2.0], [1, 0, 2, 1], [400, 0, 2.0]];
          case 'swoop': return [[30, 0, 2.4], [80, 0.04 * s, 2.4], [1, 0, 2.4, 1], [60, 0.03 * s, 2.4], [400, 0, 2.8]];
          case 'hover': return [[45, 0, 1.8], [40, 0, 0.3], [1, 0, 0, 2], [40, 0, 0.1], [400, -0.0, -1.8]];
          case 'cross': return [[160, 0.006 * s, 1.8, 0], [1, 0, 1.8, 1], [400, 0.006 * s, 1.8]];
          case 'behind': return [[80, 0, 3.4], [1, 0, 3.4, 1], [400, 0, 3.0]];
        }
        return [[600, 0, 2]];
      }
      function spawnAir(pat, side, x0, red) {
        const t = red ? 'red' : 'fighter';
        const n = pat === 'hover' ? 3 : 5;
        for (let i = 0; i < n; i++) {
          let x, y, ang, delay = i * 10;
          if (pat === 'dive') { x = x0 + (i - 2) * 14 * side; y = -10 - i * 14; ang = Math.PI / 2; delay = 0; }
          else if (pat === 'line') { x = side > 0 ? -10 - i * 14 : W + 10 + i * 14; y = -10 - i * 10; ang = side > 0 ? Math.PI * 0.32 : Math.PI * 0.68; delay = 0; }
          else if (pat === 'swoop') { x = side > 0 ? -12 : W + 12; y = 50 + (i % 2) * 6; ang = side > 0 ? 0.25 : Math.PI - 0.25; }
          else if (pat === 'hover') { x = 56 + i * 56; y = -12; ang = Math.PI / 2; delay = i * 6; }
          else { x = side > 0 ? -12 : W + 12; y = 30 + i * 18; ang = side > 0 ? 0.35 : Math.PI - 0.35; delay = i * 8; }
          const e = addEnt(t, x, y, { ang, prog: prog(pat, side), delay, red: !!red });
          if (pat === 'hover') e.hp = 2;
        }
        if (red) g.redCount = 5;
      }
      function spawnGround(ev) {
        const wy = g.scroll + H + 16;
        const water = isWater(ev.x, wy);
        const y = -18;
        if (water) {
          if (!isWater(ev.x, wy + 30) || !isWater(ev.x, wy - 30)) return;
          if ((g.stage % 5 >= 1 || g.loop) && ev.r < 0.3) addEnt('destroyer', ev.x, y - 20, { vy: -0.2, ground: true });
          else addEnt('boat', ev.x, y, { vy: -0.35 + ev.r * 0.2, ground: true });
        } else {
          const kind = landKind(STAGES[curStageIdx], wy);
          const r = ev.r;
          if (r < 0.45) {
            const dir = r < 0.15 ? 0 : r < 0.3 ? Math.PI : -Math.PI / 2;
            addEnt('tank', ev.x, y, { mv: dir, ground: true });
          } else if (r < 0.75 || kind === 'base') addEnt('gun', ev.x, y, { ground: true });
          else addEnt('house', ev.x, y, { ground: true, roof: kind === 'desert' ? '#b07848' : kind === 'city' ? '#7a3a30' : '#8a5a2a' });
        }
      }
      function runEvents() {
        while (g.ei < g.events.length && g.events[g.ei].d <= g.scroll) {
          const ev = g.events[g.ei++];
          if (ev.k === 'air') spawnAir(ev.pat, ev.side, ev.x, false);
          else if (ev.k === 'red') spawnAir(ev.side > 0 ? 'swoop' : 'line', ev.side, 112, true);
          else if (ev.k === 'ground') spawnGround(ev);
          else if (ev.k === 'bomber') addEnt('bomber', ev.x, -14, { ang: Math.PI / 2, spd: 0.55 });
          else if (ev.k === 'behind') {
            sfx.behind();
            for (let i = 0; i < 3; i++) addEnt('fighter', ev.x + (i - 1) * 24, H + 14 + i * 12, { ang: -Math.PI / 2, prog: prog('behind', 1), behind: true });
          }
        }
      }

      // ---------- bosses ----------
      function spawnBoss() {
        const kind = STAGES[curStageIdx].boss;
        const b = { kind, x: 112, y: -90, ty: 80, hp: 0, max: 0, parts: [], age: 0, flash: 0, air: false, dir: 1 };
        const P = (dx, dy, hp, kind2) => b.parts.push({ dx, dy, hp: Math.round(hp * (1 + g.loop * 0.4)), max: hp, k: kind2 || 'turret', cool: 60 + Math.random() * 60, tur: Math.PI / 2, dead: false });
        if (kind === 'tank') { b.w = 76; b.h = 96; b.hp = 70; P(-22, -20, 14); P(22, -20, 14); P(-22, 24, 14); P(22, 24, 14); P(0, 0, 24, 'cannon'); }
        else if (kind === 'battleship') { b.w = 56; b.h = 170; b.ty = 110; b.hp = 90; P(0, -55, 18); P(0, -30, 18, 'cannon'); P(0, 40, 18, 'cannon'); P(-16, 5, 10); P(16, 5, 10); P(0, 65, 14); }
        else if (kind === 'bomber') { b.w = 150; b.h = 70; b.ty = 70; b.hp = 80; b.air = true; P(-48, 2, 16, 'engine'); P(-24, 0, 16, 'engine'); P(24, 0, 16, 'engine'); P(48, 2, 16, 'engine'); P(0, 22, 20); }
        else if (kind === 'dreadnought') { b.w = 64; b.h = 190; b.ty = 115; b.hp = 120; P(0, -70, 20, 'cannon'); P(0, -45, 20, 'cannon'); P(0, 50, 20, 'cannon'); P(-20, -5, 12); P(20, -5, 12); P(-20, 20, 12); P(20, 20, 12); }
        else { b.w = 180; b.h = 90; b.ty = 72; b.hp = 150; b.air = true; P(-62, 4, 20, 'engine'); P(-34, 0, 20, 'engine'); P(34, 0, 20, 'engine'); P(62, 4, 20, 'engine'); P(-14, 26, 18); P(14, 26, 18); P(0, -10, 26, 'cannon'); }
        b.hp = Math.round(b.hp * (1 + g.loop * 0.4)); b.max = b.hp;
        g.boss = b; sfx.warn();
      }
      function bossCoreOpen(b) { return b.parts.every(p => p.dead); }
      function updateBoss() {
        const b = g.boss; if (!b) return;
        b.age++; if (b.flash) b.flash--;
        if (b.y < b.ty) b.y += 0.6;
        else { b.x += b.dir * (b.air ? 0.45 : 0.25); if (b.x > 112 + (b.air ? 30 : 50) || b.x < 112 - (b.air ? 30 : 50)) b.dir = -b.dir; if (b.air) b.y = b.ty + Math.sin(b.age / 70) * 12; }
        if (b.y < 20) return;
        const p = g.p, df = diff();
        for (const pt of b.parts) {
          if (pt.dead) continue;
          const px = b.x + pt.dx, py = b.y + pt.dy;
          pt.tur = Math.atan2(p.y - py, p.x - px);
          if (--pt.cool <= 0 && !p.dead) {
            if (pt.k === 'cannon') { for (let i = -2; i <= 2; i++) eshot(px, py, pt.tur + i * 0.2, 1.4 + 0.2 * df); pt.cool = 110 / df + Math.random() * 40; }
            else if (pt.k === 'engine') { eshot(px, py + 6, Math.PI / 2 + (Math.random() - 0.5) * 0.6, 1.5 + 0.2 * df); pt.cool = 40 / df + Math.random() * 30; }
            else { for (let i = 0; i < 3; i++) eshot(px, py, pt.tur, 1.6 + 0.25 * df + i * 0.35); pt.cool = 90 / df + Math.random() * 40; }
          }
        }
        if (bossCoreOpen(b)) {
          if (b.age % Math.max(18, Math.round(48 / df)) === 0) { const n = 10, o = b.age / 50; for (let i = 0; i < n; i++) eshot(b.x, b.y, o + i * Math.PI * 2 / n, 1.3 + 0.15 * df); }
          if (b.age % 90 === 45) for (let i = -1; i <= 1; i++) eshot(b.x, b.y, Math.atan2(p.y - b.y, p.x - b.x) + i * 0.15, 2.2);
        }
      }
      function hitBoss(x, y, dmg) {
        const b = g.boss; if (!b || b.y < 10) return false;
        for (const pt of b.parts) {
          if (pt.dead) continue;
          if (Math.abs(x - (b.x + pt.dx)) < 9 && Math.abs(y - (b.y + pt.dy)) < 9) {
            pt.hp -= dmg; pt.flash = 4; sfx.hit();
            if (pt.hp <= 0) { pt.dead = true; boom(b.x + pt.dx, b.y + pt.dy, 2); addScore(1000); pop(b.x + pt.dx, b.y + pt.dy, '1000'); }
            return true;
          }
        }
        if (Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2) {
          if (bossCoreOpen(b)) { b.hp -= dmg; b.flash = 3; sfx.hit(); if (b.hp <= 0) killBoss(); }
          else spark(x, y);
          return true;
        }
        return false;
      }
      function killBoss() {
        const b = g.boss;
        const pts = 10000 + g.stage * 5000;
        addScore(pts); pop(b.x, b.y, String(pts));
        for (let i = 0; i < 14; i++) g.fx.push({ k: 'boom', x: b.x + (Math.random() - 0.5) * b.w, y: b.y + (Math.random() - 0.5) * b.h, t: -i * 6, sz: 3, gr: !b.air });
        sfx.boomL(); g.shake = 60; g.flash = 10;
        if (!b.air) g.decals.push({ x: b.x, y: b.y, r: 30 });
        g.boss = null; g.ebul = [];
        g.phase = 'clear'; g.phaseT = 420; g.tally = 0;
        g.items.push({ k: 'star', x: b.x - 20, y: b.y, vx: -0.5, vy: 0.6, t: 0 }, { k: 'star', x: b.x + 20, y: b.y, vx: 0.5, vy: 0.6, t: 0 });
      }

      // ---------- helpers ----------
      function addScore(n) {
        g.score += n;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 50000 ? 100000 : 150000; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, txt) { if (g.pops.length < 12) g.pops.push({ x, y, txt, t: 60 }); }
      function boom(x, y, sz, gr) { g.fx.push({ k: 'boom', x, y, t: 0, sz: sz || 1, gr: !!gr }); }
      function spark(x, y) { g.fx.push({ k: 'spark', x, y, t: 0 }); }
      function eshot(x, y, ang, spd) {
        if (g.ebul.length > 90) return;
        if (x < -4 || x > W + 4 || y < -4 || y > H) return;
        g.ebul.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, t: 0 });
      }
      function aim(x, y) { return Math.atan2(g.p.y - y, g.p.x - x); }
      function killEnt(e, byBomb) {
        e.dead = true; addScore(e.pts);
        if (e.pts >= 300) pop(e.x, e.y, String(e.pts));
        if (e.air) { boom(e.x, e.y, e.t === 'bomber' ? 2 : 1); e.t === 'bomber' ? sfx.boomM() : sfx.boomS(); }
        else { boom(e.x, e.y, e.t === 'destroyer' ? 3 : 2, true); g.decals.push({ x: e.x, y: e.y, r: e.t === 'destroyer' ? 14 : 8, water: e.t === 'boat' || e.t === 'destroyer' }); sfx.boomM(); }
        if (e.t === 'house') g.items.push({ k: 'star', x: e.x, y: e.y, vx: 0, vy: 0, t: 0, ground: true });
        if ((e.t === 'gun' || e.t === 'tank') && Math.random() < 0.25) g.items.push({ k: 'star', x: e.x, y: e.y, vx: 0, vy: 0, t: 0, ground: true });
        if (e.t === 'destroyer' || (e.t === 'bomber' && Math.random() < 0.6)) g.items.push({ k: Math.random() < 0.65 ? 'S' : 'B', x: e.x, y: e.y, vx: 0.6, vy: 0.4, t: 0 });
        if (e.red) {
          g.redCount--;
          if (g.redCount <= 0) {
            g.redkills = (g.redkills || 0) + 1;
            const k = g.redkills % 7 === 0 ? '1UP' : (g.p.lv < 4 && g.redkills % 3 !== 0 ? 'S' : 'B');
            g.items.push({ k, x: e.x, y: e.y, vx: 0.6, vy: 0.4, t: 0 });
          }
        }
      }

      // ---------- player ----------
      function fire() {
        const p = g.p;
        const add = (dx, ang) => g.shots.push({ x: p.x + dx, y: p.y - 8, vx: Math.cos(ang) * 7, vy: Math.sin(ang) * 7 });
        const up = -Math.PI / 2;
        if (p.lv === 1) { add(-3, up); add(3, up); }
        else if (p.lv === 2) { add(-6, up); add(-2, up); add(2, up); add(6, up); }
        else if (p.lv === 3) { add(-4, up); add(4, up); add(-6, up - 0.14); add(6, up + 0.14); add(0, up); }
        else { add(-4, up); add(4, up); add(0, up); add(-6, up - 0.12); add(6, up + 0.12); add(-8, up - 0.26); add(8, up + 0.26); }
        sfx.shot();
      }
      function dropBomb() {
        const p = g.p;
        if (g.bomb || p.bombs <= 0 || p.dead) return;
        p.bombs--; g.bomb = { x: p.x, y: p.y - 10, t: 0 };
        au.tone(900, 0.4, { type: 'sine', slideTo: 200, vol: 0.08 });
      }
      function updateBomb() {
        const b = g.bomb; if (!b) return;
        b.t++;
        if (b.t < 28) b.y -= 2.2;
        if (b.t === 28) {
          sfx.bomb(); g.flash = 8; g.shake = 30;
          for (const e of g.ents) if (!e.dead && e.y > -10 && e.y < H + 10) { e.hp -= 30; if (e.hp <= 0) killEnt(e, true); }
          if (g.boss) for (const pt of g.boss.parts) if (!pt.dead) { pt.hp -= 12; if (pt.hp <= 0) { pt.dead = true; boom(g.boss.x + pt.dx, g.boss.y + pt.dy, 2); addScore(1000); } }
          if (g.boss && bossCoreOpen(g.boss)) { g.boss.hp -= 15; if (g.boss.hp <= 0) killBoss(); }
        }
        if (b.t >= 28) g.ebul = [];
        if (b.t > 90) g.bomb = null;
      }
      function killPlayer() {
        const p = g.p;
        if (p.dead || p.inv > 0 || (g.bomb && g.bomb.t >= 28)) return;
        p.dead = 1; sfx.die(); boom(p.x, p.y, 3); g.shake = 20;
        for (let i = 0; i < 3; i++) g.fx.push({ k: 'boom', x: p.x + (Math.random() - 0.5) * 20, y: p.y + (Math.random() - 0.5) * 20, t: -8 - i * 8, sz: 2 });
      }
      function respawn() {
        const p = g.p;
        p.dead = 0; p.inv = 150; p.x = 112; p.y = 280; p.bombs = 3; p.lv = Math.max(1, p.lv - 1);
      }
      function lastLife() {
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) { g.lives = 2; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300; g.p.dead = 999;
        au.melody([[523, .2], [494, .2], [440, .2], [392, .2], [349, .4], [330, .6]], { type: 'triangle', vol: 0.12 });
      }

      function updatePlayer() {
        const p = g.p;
        if (p.dead) {
          if (g.phase === 'over') return;
          p.dead++;
          if (p.dead === 120) {
            if (g.lives <= 0) { p.dead = 119.5; lastLife(); }
            else { g.lives--; respawn(); }
          }
          return;
        }
        if (p.inv > 0) p.inv--;
        if (g.phase === 'clear') {
          // auto-fly: center, then climb away
          const t = 420 - g.phaseT;
          if (t < 120) { p.x += (112 - p.x) * 0.04; p.y += (240 - p.y) * 0.04; }
          else if (t > 300) p.y -= (t - 300) * 0.06;
          p.bank = 0; return;
        }
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        const sp = dx && dy ? 1.45 : 1.9;
        p.x = Math.max(9, Math.min(W - 9, p.x + dx * sp)); p.y = Math.max(20, Math.min(H - 14, p.y + dy * sp));
        p.bank = dx;
        if (p.cool > 0) p.cool--;
        if (api.key('Space') && p.cool <= 0 && g.phase !== 'over') { fire(); p.cool = 6; }
        if (api.pressed('KeyX') || api.pressed('KeyZ')) dropBomb();
      }

      function updateEnts() {
        const p = g.p, df = diff();
        for (const e of g.ents) {
          if (e.dead) continue;
          e.age++; if (e.flash) e.flash--;
          if (e.delay > 0) { e.delay--; continue; }
          if (e.ground) e.y += g.speed;
          switch (e.t) {
            case 'fighter': case 'red': {
              const s = e.prog[e.pi];
              if (s) {
                if (s[2] !== undefined) e.spd = s[2];
                e.ang += s[1];
                if (s[3] && !p.dead && e.y < p.y - 30) {
                  if (s[3] === 2) for (let i = -1; i <= 1; i++) eshot(e.x, e.y, aim(e.x, e.y) + i * 0.25, 1.6 + 0.2 * df);
                  else if (Math.random() < 0.55 + 0.1 * df) eshot(e.x, e.y, aim(e.x, e.y), 1.8 + 0.25 * df);
                }
                if (++e.pt >= s[0]) { e.pi++; e.pt = 0; }
              }
              if (e.prog === null) break;
              const cur = e.prog[e.pi];
              if (cur && cur[2] < 0) { e.y += cur[2]; } else { e.x += Math.cos(e.ang) * e.spd; e.y += Math.sin(e.ang) * e.spd; }
              if (e.behind && e.age === 70 && !p.dead) eshot(e.x, e.y, aim(e.x, e.y), 2);
              break;
            }
            case 'bomber':
              e.y += e.spd; e.x += Math.sin(e.age / 80) * 0.3;
              if (--e.cool <= 0 && e.y > 10 && e.y < p.y - 40 && !p.dead) { for (let i = -1; i <= 1; i++) eshot(e.x, e.y + 6, aim(e.x, e.y) + i * 0.3, 1.5 + 0.2 * df); e.cool = 90 / df + Math.random() * 40; }
              break;
            case 'tank':
              if (e.mv !== undefined && e.age > 40) { e.x += Math.cos(e.mv) * 0.35; e.y += Math.sin(e.mv) * 0.35; if (e.x < 8 || e.x > W - 8 || isWater(e.x + Math.cos(e.mv) * 10, g.scroll + H - e.y - Math.sin(e.mv) * 10)) e.mv += Math.PI; }
              groundFire(e, 120, 1, df);
              break;
            case 'gun': groundFire(e, 140, g.stage > 1 || g.loop ? 3 : 2, df); break;
            case 'boat': e.y += e.vy; groundFire(e, 110, 2, df); break;
            case 'destroyer':
              e.y += e.vy; e.tur2 = aim(e.x, e.y + 14);
              groundFire(e, 90, 3, df);
              if (e.age % 150 === 75 && e.y > 0 && e.y < p.y - 50) for (let i = -2; i <= 2; i++) eshot(e.x, e.y + 14, e.tur2 + i * 0.22, 1.4 + 0.2 * df);
              break;
            case 'house': break;
          }
          const m = e.air ? 40 : 30;
          if (e.age > 60 && (e.y > H + m || e.y < -m - 30 || e.x < -m || e.x > W + m)) e.dead = 'gone';
          if (e.ground && e.y > H + 40) e.dead = 'gone';
        }
        g.ents = g.ents.filter(e => !e.dead);
      }
      function groundFire(e, rate, burst, df) {
        const p = g.p;
        e.tur = aim(e.x, e.y);
        if (--e.cool <= 0) {
          e.cool = rate / df + Math.random() * 60;
          if (e.y < 8 || e.y > H - 20 || p.dead || Math.hypot(p.x - e.x, p.y - e.y) < 48) return;
          for (let i = 0; i < burst; i++) setTimeoutShot(e, i * 8, df);
        }
      }
      const pending = [];
      function setTimeoutShot(e, delay, df) { pending.push({ e, t: delay, spd: 1.5 + 0.22 * df }); }
      function runPending() {
        for (let i = pending.length - 1; i >= 0; i--) {
          const q = pending[i];
          if (--q.t <= 0) { pending.splice(i, 1); if (!q.e.dead && !g.p.dead) eshot(q.e.x + Math.cos(q.e.tur) * 8, q.e.y + Math.sin(q.e.tur) * 8, aim(q.e.x, q.e.y), q.spd); }
        }
      }

      function collide() {
        const p = g.p;
        // player shots
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy;
          if (s.y < -10) { s.dead = true; continue; }
          for (const e of g.ents) {
            if (e.dead || e.delay > 0) continue;
            if (Math.abs(s.x - e.x) < e.w / 2 + 2 && Math.abs(s.y - e.y) < e.h / 2 + 3) {
              s.dead = true; e.hp--; e.flash = 3;
              if (e.hp <= 0) killEnt(e); else sfx.hit();
              break;
            }
          }
          if (!s.dead && g.boss && hitBoss(s.x, s.y, 1)) s.dead = true;
        }
        g.shots = g.shots.filter(s => !s.dead);
        // enemy bullets
        for (const b of g.ebul) {
          b.x += b.vx; b.y += b.vy; b.t++;
          if (b.x < -6 || b.x > W + 6 || b.y < -6 || b.y > H + 6) { b.dead = true; continue; }
          if (!p.dead && Math.abs(b.x - p.x) < 3 && Math.abs(b.y - p.y) < 4) { b.dead = true; killPlayer(); }
        }
        g.ebul = g.ebul.filter(b => !b.dead);
        // planes vs player
        if (!p.dead) for (const e of g.ents) {
          if (!e.air || e.dead || e.delay > 0) continue;
          if (Math.abs(e.x - p.x) < e.w / 2 + 3 && Math.abs(e.y - p.y) < e.h / 2 + 3) { if (p.inv <= 0) { killPlayer(); if (e.t !== 'bomber') killEnt(e); } }
        }
        if (!p.dead && g.boss && g.boss.air && Math.abs(g.boss.x - p.x) < g.boss.w / 2 - 10 && Math.abs(g.boss.y - p.y) < 14) killPlayer();
        // items
        for (const it of g.items) {
          it.t++;
          if (it.ground) it.y += g.speed;
          else {
            it.x += it.vx; it.y += it.vy;
            if (it.x < 8 || it.x > W - 8) it.vx = -it.vx;
            if (it.y > H - 30 && it.vy > 0) it.vy = -it.vy; if (it.y < 30 && it.vy < 0) it.vy = -it.vy;
            if (it.t > 900) it.vy = Math.abs(it.vy) + 0.5;
          }
          if (it.y > H + 10) { it.dead = true; continue; }
          if (!p.dead && Math.abs(it.x - p.x) < 12 && Math.abs(it.y - p.y) < 12) {
            it.dead = true;
            if (it.k === 'star') { g.stars++; g.stageStars++; addScore(500); sfx.star(); }
            else if (it.k === 'S') { if (p.lv < 4) p.lv++; else { addScore(5000); pop(it.x, it.y, '5000'); } sfx.item(); }
            else if (it.k === 'B') { p.bombs = Math.min(9, p.bombs + 1); sfx.item(); }
            else { g.lives++; sfx.extra(); }
          }
        }
        g.items = g.items.filter(i => !i.dead);
      }

      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        music();
        if (mode === 'title') {
          titleT++; attractScroll += 0.6;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (g.shake > 0) g.shake--; if (g.flash > 0) g.flash--;
        for (const f of g.fx) { f.t++; if (f.gr) f.y += g.speed; }
        g.fx = g.fx.filter(f => f.t < (f.k === 'spark' ? 8 : 36 + f.sz * 6));
        for (const d of g.decals) d.y += g.speed;
        g.decals = g.decals.filter(d => d.y < H + 40);
        for (const pp of g.pops) { pp.t--; pp.y -= 0.3; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; curStageIdx = 0; chunks.clear(); } return; }
        g.scroll += g.speed;
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; }
        else if (g.phase === 'play') {
          runEvents();
          if (g.scroll >= STAGES[curStageIdx].len) { g.phase = 'boss'; spawnBoss(); }
        } else if (g.phase === 'boss') {
          g.speed = Math.max(0.2, g.speed - 0.005);
          // a few escorts during the boss fight
          if (g.boss && g.boss.y >= g.boss.ty - 1 && (frame % Math.max(200, 420 - g.loop * 80)) === 0) spawnAir('dive', Math.random() < 0.5 ? 1 : -1, 30 + Math.random() * 164, false);
          updateBoss();
        } else if (g.phase === 'clear') {
          g.phaseT--;
          g.speed = Math.min(0.6, g.speed + 0.004);
          const t = 420 - g.phaseT;
          if (t === 150) { g.tally = g.stageStars * 1000 + g.p.bombs * 1000; addScore(g.tally); au.melody([[784, .08], [988, .08], [1175, .08], [1568, .25]], { type: 'square', vol: 0.08 }); }
          if (g.phaseT <= 0) {
            let n = g.stage + 1;
            if (n % STAGES.length === 0) g.loop++;
            startStage(n);
          }
        }
        updatePlayer(); runPending(); updateBomb(); updateEnts(); collide();
      }

      // ---------- music ----------
      let mstep = 0;
      function music() {
        if (mode !== 'game' || !g || g.phase === 'over' || g.p.dead) return;
        if (frame % 8) return;
        const boss = g.phase === 'boss';
        if (boss) {
          const n = BMEL[mstep % BMEL.length]; if (n) au.tone(mtof(n + 12), 0.1, { type: 'square', vol: 0.025 });
          if (mstep % 2 === 0) au.tone(mtof(BBAS[(mstep >> 1) % BBAS.length]), 0.14, { type: 'triangle', vol: 0.08 });
        } else {
          const n = MEL[mstep % MEL.length]; if (n) au.tone(mtof(n), 0.12, { type: 'square', vol: 0.025 });
          if (mstep % 2 === 0) au.tone(mtof(BAS[(mstep >> 1) % BAS.length]), 0.14, { type: 'triangle', vol: 0.08 });
          if (mstep % 4 === 2) au.noise(0.03, { freq: 6000, type: 'highpass', vol: 0.03 });
        }
        mstep++;
      }

      // ---------- rendering ----------
      function rotIdx(a) { return ((Math.round((a + Math.PI / 2) / (2 * Math.PI) * NDIR) % NDIR) + NDIR) % NDIR; }
      function drawTank(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        const horiz = e.mv === 0 || e.mv === Math.PI;
        const bw = horiz ? 14 : 11, bh = horiz ? 11 : 14;
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - bw / 2 + 2, y - bh / 2 + 2, bw, bh);
        ctx.fillStyle = '#2e2e26'; if (horiz) { ctx.fillRect(x - 7, y - 6, 14, 3); ctx.fillRect(x - 7, y + 3, 14, 3); } else { ctx.fillRect(x - 6, y - 7, 3, 14); ctx.fillRect(x + 3, y - 7, 3, 14); }
        ctx.fillStyle = e.flash ? '#fff' : '#7a7048'; ctx.fillRect(x - (horiz ? 6 : 3), y - (horiz ? 3 : 6), horiz ? 12 : 6, horiz ? 6 : 12);
        line(ctx, x, y, e.tur, 8, '#2a2a20', 2);
        disc(ctx, x, y, 3, e.flash ? '#fff' : '#5a5434');
        ctx.fillStyle = '#9a9060'; ctx.fillRect(x - 1, y - 2, 2, 1);
      }
      function drawGun(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        disc(ctx, x + 1, y + 1, 8, 'rgba(0,0,0,.35)');
        disc(ctx, x, y, 7, '#5e5c52'); disc(ctx, x, y, 5, e.flash ? '#fff' : '#8e8a78');
        line(ctx, x, y, e.tur, 9, '#2a2a26', 2);
        disc(ctx, x, y, 2, '#3e3c34');
      }
      function drawHouse(ctx, e) {
        const x = Math.round(e.x - 8), y = Math.round(e.y - 7);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 3, y + 3, 16, 14);
        ctx.fillStyle = e.flash ? '#fff' : e.roof; ctx.fillRect(x, y, 16, 14);
        ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x, y + 6, 16, 2);
        ctx.fillStyle = '#c8b090'; ctx.fillRect(x + 2, y + 2, 12, 1);
      }
      function drawShip(ctx, x, y, w, h, flash, turrets) {
        x = Math.round(x); y = Math.round(y);
        ctx.fillStyle = '#e8f0ff';
        ctx.fillRect(x - 2, y + h / 2, 4, 6 + (frame >> 2) % 3);           // wake
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - w / 2 - 2, y + h / 2 - 6, 2, 8); ctx.fillRect(x + w / 2, y + h / 2 - 6, 2, 8);
        const hull = flash ? '#fff' : '#6a7280';
        ctx.fillStyle = '#3a4048';
        for (let i = 0; i < h; i++) { const t = i / h; const hw = Math.round(w / 2 * (t < 0.25 ? 0.3 + t * 2.8 : t > 0.85 ? 1 - (t - 0.85) * 2.5 : 1)); ctx.fillRect(x - hw, y - h / 2 + i, hw * 2, 1); }
        ctx.fillStyle = hull;
        for (let i = 1; i < h - 1; i++) { const t = i / h; const hw = Math.round(w / 2 * (t < 0.25 ? 0.3 + t * 2.8 : t > 0.85 ? 1 - (t - 0.85) * 2.5 : 1)) - 1; if (hw > 0) ctx.fillRect(x - hw, y - h / 2 + i, hw * 2, 1); }
        ctx.fillStyle = '#8a8268'; ctx.fillRect(x - w / 4, y - h / 6, w / 2, h / 3);
        ctx.fillStyle = '#4a4a44'; ctx.fillRect(x - 2, y - 2, 4, 5);
        for (const t of turrets) { disc(ctx, x, y + t.dy, 3, '#4e5058'); line(ctx, x, y + t.dy, t.a, 6, '#2a2a2e', 2); }
      }
      function drawBossBody(ctx, b) {
        const x = Math.round(b.x), y = Math.round(b.y), fl = b.flash > 0;
        if (b.kind === 'tank') {
          ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 36, y - 44, 80, 98);
          ctx.fillStyle = '#2a2a24'; ctx.fillRect(x - 40, y - 48, 16, 96); ctx.fillRect(x + 24, y - 48, 16, 96);
          ctx.fillStyle = '#4a4a3e'; for (let i = 0; i < 96; i += 6) { const o = (i + (frame >> 1)) % 96; ctx.fillRect(x - 40, y - 48 + o, 16, 2); ctx.fillRect(x + 24, y - 48 + o, 16, 2); }
          ctx.fillStyle = fl ? '#fff' : '#6e6844'; ctx.fillRect(x - 26, y - 44, 52, 88);
          ctx.fillStyle = '#8a8458'; ctx.fillRect(x - 24, y - 42, 48, 4); ctx.fillStyle = '#4e4a30'; ctx.fillRect(x - 24, y + 38, 48, 4);
        } else if (b.kind === 'battleship' || b.kind === 'dreadnought') {
          drawShip(ctx, x, y, b.w, b.h, fl, []);
          ctx.fillStyle = '#5a5a50'; ctx.fillRect(x - 8, y - 20, 16, 40);
          ctx.fillStyle = '#3a3a34'; ctx.fillRect(x - 4, y - 12, 8, 8); ctx.fillRect(x - 4, y + 4, 8, 8);
          if (b.age % 6 < 3) { disc(ctx, x + 2, y - 16 - (b.age % 30) / 3, 3, 'rgba(80,80,80,.6)'); }
        } else {
          const big = b.kind === 'fortress';
          const span = b.w, cy = y;
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - span / 2 + 14, cy + 30, span, 12);
          ctx.fillStyle = fl ? '#fff' : (big ? '#5a5e6a' : '#6a7a4a');
          ctx.fillRect(x - span / 2, cy - 6, span, 14);                      // wing
          ctx.fillRect(x - 10, cy - b.h / 2, 20, b.h);                         // fuselage
          ctx.fillRect(x - 34, cy + b.h / 2 - 14, 68, 8);                       // tailplane
          ctx.fillStyle = big ? '#3a3e48' : '#3e4a2a';
          ctx.fillRect(x - span / 2, cy + 6, span, 2); ctx.fillRect(x - 10, cy - b.h / 2, 3, b.h);
          ctx.fillStyle = '#80e0ff'; ctx.fillRect(x - 5, cy - b.h / 2 + 4, 10, 6);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x - span / 2 + 4, cy - 2, 8, 6); ctx.fillRect(x + span / 2 - 12, cy - 2, 8, 6);
        }
        for (const pt of b.parts) {
          const px = x + pt.dx, py = y + pt.dy;
          if (pt.dead) { disc(ctx, px, py, 5, '#2a2018'); disc(ctx, px, py, 2, (frame >> 2) & 1 ? '#ff6020' : '#802010'); continue; }
          const hit = pt.flash > 0 && pt.flash--;
          if (pt.k === 'engine') {
            disc(ctx, px, py, 7, hit ? '#fff' : '#3a3a34'); ctx.fillStyle = '#9a9a90'; ctx.fillRect(px - 7, py - 8 - ((frame >> 1) & 1) * 1, 14, 2);
            disc(ctx, px, py, 3, '#c0b080');
          } else {
            disc(ctx, px, py, pt.k === 'cannon' ? 8 : 6, hit ? '#fff' : '#4e5048');
            disc(ctx, px, py, pt.k === 'cannon' ? 5 : 4, hit ? '#fff' : '#7a7c70');
            line(ctx, px, py, pt.tur, pt.k === 'cannon' ? 12 : 9, '#222', pt.k === 'cannon' ? 3 : 2);
          }
        }
      }
      function drawBoom(ctx, f) {
        if (f.t < 0) return;
        if (f.k === 'spark') { ctx.fillStyle = f.t & 2 ? '#fff' : '#ffe040'; ctx.fillRect(f.x - 1, f.y - 1, 3, 3); return; }
        const life = 36 + f.sz * 6, t = f.t / life, R = (5 + f.sz * 6) * Math.min(1, t * 3);
        if (t < 0.6) {
          disc(ctx, f.x, f.y, R, t < 0.15 ? '#ffffff' : t < 0.35 ? '#ffd040' : '#ff6a20');
          if (t > 0.15) disc(ctx, f.x, f.y, R * 0.6, t < 0.35 ? '#ffffff' : '#ffd040');
        } else {
          disc(ctx, f.x, f.y - (t - 0.6) * 10, R * (1.1 - t * 0.5), 'rgba(70,60,50,' + (1 - t).toFixed(2) + ')');
        }
      }
      function drawPlayer(ctx) {
        const p = g.p;
        if (p.dead) return;
        if (p.inv > 0 && (p.inv >> 2) & 1) return;
        ctx.globalAlpha = 0.35; ctx.drawImage(SP.playerSh, Math.round(p.x - 8 + 10), Math.round(p.y - 7 + 16)); ctx.globalAlpha = 1;
        ctx.drawImage(SP.player, Math.round(p.x - 8), Math.round(p.y - 7));
        ctx.fillStyle = (frame & 2) ? '#ddd' : '#555'; ctx.fillRect(Math.round(p.x - 4), Math.round(p.y - 7), 8, 1);
      }
      function drawItem(ctx, it) {
        const x = Math.round(it.x), y = Math.round(it.y);
        if (it.k === 'star') { ctx.drawImage(SP.star[(frame >> 3) & 1], x - 4, y - 3); return; }
        const col = it.k === 'S' ? '#e02828' : it.k === 'B' ? '#2860e0' : '#20a040';
        ctx.fillStyle = '#000'; ctx.fillRect(x - 7, y - 6, 15, 13);
        ctx.fillStyle = (frame >> 3) & 1 ? '#fff' : col; ctx.fillRect(x - 6, y - 5, 13, 11);
        ctx.fillStyle = (frame >> 3) & 1 ? col : '#fff'; ctx.fillRect(x - 5, y - 4, 11, 9);
        text(ctx, it.k === '1UP' ? '1' : it.k, x - 2, y - 3, (frame >> 3) & 1 ? '#fff' : col);
      }
      function drawHUD(ctx) {
        const sc = g ? g.score : 0;
        text(ctx, '1UP', 8, 3, '#ff4040'); text(ctx, String(sc).padStart(7, ' '), 32, 3, '#ffffff');
        text(ctx, 'HI', 120, 3, '#ffd040'); text(ctx, String(hi).padStart(7, ' '), 136, 3, '#ffffff');
        if (!g || mode === 'title') return;
        for (let i = 0; i < Math.min(6, g.lives); i++) ctx.drawImage(SP.life, 4 + i * 9, H - 9);
        for (let i = 0; i < Math.min(9, g.p.bombs); i++) ctx.drawImage(SP.bombIcon, W - 8 - i * 6, H - 9);
      }
      function drawTitle(ctx) {
        drawTerrain(ctx, attractScroll);
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
        // logo
        const ly = 50;
        text(ctx, 'SKY', 112, ly, '#e02828', { scale: 4, center: true, shadow: '#300' });
        text(ctx, 'SHARK', 112, ly + 34, '#f0c040', { scale: 4, center: true, shadow: '#320' });
        // little shark teeth under logo
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++) { ctx.fillRect(54 + i * 13, ly + 68, 7, 2); ctx.fillRect(56 + i * 13, ly + 70, 3, 2); }
        const page = (titleT / 420 | 0) % 2;
        if (page === 0) {
          ctx.drawImage(SP.player, 104, 140);
          text(ctx, 'BONUS STARS X 1000', 112, 170, '#ffd040', { center: true });
          ctx.drawImage(SP.star[(frame >> 3) & 1], 26, 169);
          drawItem(ctx, { k: 'S', x: 40, y: 192 }); text(ctx, 'SHOT POWER UP', 56, 189, '#fff');
          drawItem(ctx, { k: 'B', x: 40, y: 210 }); text(ctx, 'EXTRA BOMB', 56, 207, '#fff');
          text(ctx, 'EXTEND 50000 / 150000', 112, 228, '#60e8ff', { center: true });
        } else {
          text(ctx, '- SCORE TABLE -', 112, 140, '#60e8ff', { center: true });
          const rows = [[SP.fighter[8], '100'], [SP.red[8], '200'], [null, '300', 'TANK'], [null, '600', 'GUNBOAT'], [SP.bomber, '1500']];
          rows.forEach((r, i) => {
            const y = 158 + i * 16;
            if (r[0]) ctx.drawImage(r[0], 60 - (r[0].width >> 1), y - 4); else text(ctx, r[2], 72, y, '#c8c890', { right: true });
            text(ctx, r[1] + ' PTS', 100, y, '#fff');
          });
        }
        if (api.credits === 0 && coinOp) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', 112, 256, '#ff4040', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', 112, 256, '#ffffff', { center: true });
        text(ctx, '\u00a9 1987 TOAPLAN', 112, 280, '#ffffff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 112, 304, '#c0c0c0', { center: true });
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        ctx.save();
        if (g.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
        drawTerrain(ctx, g.scroll);
        for (const d of g.decals) { disc(ctx, d.x, d.y, d.r, d.water ? '#16407e' : '#3a2e20'); disc(ctx, d.x - 1, d.y - 1, Math.max(2, d.r - 3), d.water ? '#2a5aa0' : '#2a2016'); }
        // ground units
        for (const e of g.ents) {
          if (e.air || e.delay > 0) continue;
          if (e.t === 'tank') drawTank(ctx, e);
          else if (e.t === 'gun') drawGun(ctx, e);
          else if (e.t === 'house') drawHouse(ctx, e);
          else if (e.t === 'boat') drawShip(ctx, e.x, e.y, e.w, e.h, e.flash > 0, [{ dy: -8, a: e.tur }]);
          else if (e.t === 'destroyer') drawShip(ctx, e.x, e.y, e.w, e.h, e.flash > 0, [{ dy: -14, a: e.tur }, { dy: 14, a: e.tur2 || e.tur }]);
        }
        if (g.boss && !g.boss.air) drawBossBody(ctx, g.boss);
        for (const f of g.fx) if (f.gr) drawBoom(ctx, f);
        for (const it of g.items) if (it.ground) drawItem(ctx, it);
        // air shadows
        ctx.globalAlpha = 0.33;
        for (const e of g.ents) {
          if (!e.air || e.delay > 0) continue;
          if (e.t === 'bomber') ctx.drawImage(SP.bomberSh, Math.round(e.x - 12 + 14), Math.round(e.y - 7 + 22));
          else ctx.drawImage(SP.fighterSh[rotIdx(e.ang)], Math.round(e.x - 7 + 10), Math.round(e.y - 7 + 16));
        }
        ctx.globalAlpha = 1;
        for (const e of g.ents) {
          if (!e.air || e.delay > 0) continue;
          if (e.t === 'bomber') { ctx.drawImage(SP.bomber, Math.round(e.x - 12), Math.round(e.y - 7)); if (e.flash) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(e.x - 3), Math.round(e.y - 3), 6, 6); } ctx.fillStyle = (frame & 2) ? '#bbb' : '#444'; ctx.fillRect(Math.round(e.x - 10), Math.round(e.y + 4), 4, 1); ctx.fillRect(Math.round(e.x + 6), Math.round(e.y + 4), 4, 1); }
          else ctx.drawImage((e.t === 'red' ? SP.red : SP.fighter)[rotIdx(e.ang)], Math.round(e.x - 7), Math.round(e.y - 7));
        }
        if (g.boss && g.boss.air) drawBossBody(ctx, g.boss);
        for (const it of g.items) if (!it.ground) drawItem(ctx, it);
        drawPlayer(ctx);
        for (const s of g.shots) ctx.drawImage(SP.shot, Math.round(s.x - 1), Math.round(s.y - 2));
        if (g.bomb) {
          const b = g.bomb;
          if (b.t < 28) { disc(ctx, b.x, b.y, 3, '#d83020'); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 1, 1); }
          else {
            const t = (b.t - 28) / 62, R = 20 + t * 170;
            ctx.globalAlpha = Math.max(0, 0.75 - t * 0.7);
            disc(ctx, b.x, b.y, R, '#ff6a20'); disc(ctx, b.x, b.y, R * 0.75, '#ffd040'); disc(ctx, b.x, b.y, R * 0.45, '#ffffff');
            ctx.globalAlpha = 1;
          }
        }
        for (const f of g.fx) if (!f.gr) drawBoom(ctx, f);
        for (const b of g.ebul) {
          const x = Math.round(b.x), y = Math.round(b.y);
          ctx.fillStyle = '#ff3000'; ctx.fillRect(x - 2, y - 1, 4, 2); ctx.fillRect(x - 1, y - 2, 2, 4);
          ctx.fillStyle = (b.t >> 2) & 1 ? '#ffff80' : '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2);
        }
        for (const pp of g.pops) text(ctx, pp.txt, pp.x, Math.round(pp.y), '#ffffff', { center: true });
        ctx.restore();
        if (g.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (g.flash / 12).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
        // boss bar
        if (g.boss && g.boss.y > 0) {
          const b = g.boss, open = bossCoreOpen(b);
          const tot = open ? b.hp / b.max : b.parts.reduce((s, p) => s + (p.dead ? 0 : Math.max(0, p.hp) / p.max), 0) / b.parts.length;
          ctx.fillStyle = '#000'; ctx.fillRect(40, 13, 144, 5); ctx.fillStyle = open ? '#ff3030' : '#ffd040'; ctx.fillRect(41, 14, Math.round(142 * Math.max(0, tot)), 3);
        }
        // messages
        const msgY = 140;
        if (g.phase === 'intro') {
          text(ctx, 'STAGE ' + (g.stage + 1), 112, msgY, '#ffffff', { center: true, scale: 2, shadow: '#000' });
          text(ctx, STAGES[curStageIdx].name, 112, msgY + 22, '#ffd040', { center: true, shadow: '#000' });
          if (g.loop) text(ctx, 'ROUND ' + (g.loop + 1), 112, msgY + 36, '#ff6060', { center: true, shadow: '#000' });
        }
        if (g.phase === 'boss' && g.boss && g.boss.age < 150 && (frame >> 3) & 1) text(ctx, 'WARNING!', 112, msgY, '#ff3030', { center: true, scale: 2, shadow: '#000' });
        if (g.phase === 'clear') {
          const t = 420 - g.phaseT;
          if (t > 40) text(ctx, 'STAGE CLEAR', 112, 110, '#ffffff', { center: true, scale: 2, shadow: '#000' });
          if (t > 150) {
            ctx.drawImage(SP.star[0], 52, 147); text(ctx, 'x ' + g.stageStars + ' x 1000', 66, 148, '#ffd040', { keep: true, shadow: '#000' });
            ctx.drawImage(SP.bombIcon, 54, 163); text(ctx, 'x ' + g.p.bombs + ' x 1000', 66, 164, '#ffffff', { keep: true, shadow: '#000' });
            text(ctx, 'BONUS ' + g.tally, 112, 184, '#60e8ff', { center: true, shadow: '#000' });
          }
        }
        if (g.phase === 'over') text(ctx, 'GAME OVER', 112, msgY, '#ffffff', { center: true, scale: 2, shadow: '#000' });
        drawHUD(ctx);
      }

      if (api.debugHook) api.debugHook({
        g: () => g, mode: () => mode,
        sum: () => g && { phase: g.phase, stage: g.stage, loop: g.loop, scroll: Math.round(g.scroll), lives: g.lives, score: g.score, ents: g.ents.length, bul: g.ebul.length, lv: g.p.lv, bombs: g.p.bombs, boss: g.boss && { hp: g.boss.hp, parts: g.boss.parts.filter(p => !p.dead).length } }
      });
      return { update, render, destroy() { chunks.clear(); } };
    }
  });
})();
