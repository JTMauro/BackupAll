// Truxton (Toaplan, 1988) - from-scratch recreation for the MAME32 Game Room.
// Vertical shooter: Super Fighter with three colour-cycling weapons (red Power Shot, green Truxton Beam,
// blue Thunder Laser), P / S / B items, the screen-filling skull Truxton bomb, ground and air forces,
// a battleship boss at the end of each of 5 stages, then the loop gets harder.
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
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 31, 10, 0], '^': [4, 14, 31, 4, 4, 4, 4]
  };
  // text(ctx, str, x, y, colour, scale, align('left'|'center'|'right'))
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
  // outlined text (shadow on all sides) for readability over busy backgrounds
  function otext(ctx, s, x, y, col, sc, align, sh) {
    sc = sc || 1; sh = sh || '#000';
    text(ctx, s, x + sc, y + sc, sh, sc, align); text(ctx, s, x - 1, y, sh, sc, align);
    text(ctx, s, x + 1, y, sh, sc, align); text(ctx, s, x, y - 1, sh, sc, align);
    text(ctx, s, x, y, col, sc, align);
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // sprite from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = mkCanvas(w, rows.length), x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  // mirror a half-sprite (left half incl. centre column) into a full symmetric one
  function mir(rows) { return rows.map(r => r + r.slice(0, r.length - 1).split('').reverse().join('')); }
  function flipV(rows) { return rows.slice().reverse(); }
  function hash(n) { n = n | 0; n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function flipH(rows) { const w = Math.max.apply(null, rows.map(r => r.length)); return rows.map(r => r.padEnd(w, '.').split('').reverse().join('')); }
  function credStr(api) { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
  function disc(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill(); }
  const W = 240, H = 320, SCROLL = 0.55, STLEN = 3300;
  const SHIP = spr([
    '.......w.......',
    '......wbw......',
    '......wbw......',
    '.....wbrbw.....',
    '.....wbrbw.....',
    '.....wbbbw.....',
    '..w..wbbbw..w..',
    '..b.wbbbbbw.b..',
    '.wbwbbbwbbbwbw.',
    'wbbbbbwdwbbbbbw',
    'wbbbbbbdbbbbbbw',
    'wbbddbbbbbddbbw',
    '.wdd.wbbbw.ddw.',
    '..d...wdw...d..',
    '......d.d......'
  ], { w: '#e8f0ff', b: '#3a70e8', r: '#ff3838', d: '#1c2a78' });
  const ZAKO = spr([
    '..g.......g..',
    '.ggg.....ggg.',
    '.gdgg...ggdg.',
    '..gggg.gggg..',
    '...ggrrrgg...',
    '....grwrg....',
    '....ggrgg....',
    '.....grg.....',
    '.....ggg.....',
    '......g......'
  ], { g: '#b0b0c0', d: '#606078', r: '#e03020', w: '#ffffff' });
  const DIVER = spr([
    '.r.........r.',
    'rrr.......rrr',
    'rorr.....rror',
    'rrrrr...rrrrr',
    '.rrrrdddrrrr.',
    '..rrdyyydrr..',
    '...rdyyydr...',
    '....dyyyd....',
    '.....ddd.....',
    '......d......'
  ], { r: '#c02860', o: '#ff90c0', d: '#501030', y: '#ffe040' });
  const SKULL = [
    '....xxxxxxxx....',
    '..xxxxxxxxxxxx..',
    '.xxxxxxxxxxxxxx.',
    '.xxxxxxxxxxxxxx.',
    'xxxxxxxxxxxxxxxx',
    'xxx...xxxx...xxx',
    'xx.....xx.....xx',
    'xx.....xx.....xx',
    'xxx...xxxx...xxx',
    'xxxxxxx..xxxxxxx',
    '.xxxxxx..xxxxxx.',
    '..xxxxxxxxxxxx..',
    '...x.x.xx.x.x...',
    '...xxxxxxxxxx...',
    '....x.x..x.x....',
    '.....xxxxxx.....'
  ];
  function drawSkull(ctx, cx, cy, s, col) {
    ctx.fillStyle = col;
    const ox = cx - 8 * s, oy = cy - 8 * s;
    for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) if (SKULL[r][c] === 'x') ctx.fillRect(Math.round(ox + c * s), Math.round(oy + r * s), Math.ceil(s), Math.ceil(s));
  }
  // stage palettes: rock, rock detail, crater, metal, metal line, liquid, liquid hi
  const PAL = [
    { name: 'PLANET SURFACE', rock: '#4c5a34', rd: '#3a4628', cr: '#2c3420', mt: '#5a6470', ml: '#3a4048', lq: '#1c3a70', lh: '#3c64b0' },
    { name: 'DESERT BASE', rock: '#8a6a3a', rd: '#6e522a', cr: '#4c381c', mt: '#707880', ml: '#484e56', lq: '#5a2a10', lh: '#a05020' },
    { name: 'ICE FIELD', rock: '#9ab4cc', rd: '#7a94b0', cr: '#5a7090', mt: '#58607a', ml: '#383e52', lq: '#203c80', lh: '#6090e0' },
    { name: 'MAGMA ZONE', rock: '#3a2a2a', rd: '#2a1c1c', cr: '#1a1010', mt: '#5a4a4a', ml: '#352828', lq: '#a02800', lh: '#ff8020' },
    { name: 'DOGURAVA FORTRESS', rock: '#3a3050', rd: '#2a2240', cr: '#1c1630', mt: '#6a6488', ml: '#3e3858', lq: '#401060', lh: '#a040e0' }
  ];
  const WCOL = ['#ff3a2a', '#30e050', '#3a8cff'], WNAME = ['POWER SHOT', 'TRUXTON BEAM', 'THUNDER LASER'];

  ArcadeRegistry.register({
    id: 'truxton', title: 'Truxton', year: 1988, maker: 'Toaplan',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: fire (hold) \u00b7 X: Truxton bomb \u00b7 Enter: start',
    marquee: { bg: '#140606', fg: '#ff3020', accent: '#40c0ff' },
    create(api) {
      const au = api.audio, R = Math.random;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null, attractD = 0;
      const SFX = {
        shot() { au.tone(1300, 0.03, { type: 'square', vol: 0.035, slideTo: 800 }); },
        beam() { au.tone(620, 0.04, { type: 'sawtooth', vol: 0.03, slideTo: 480 }); },
        laser() { au.noise(0.06, { vol: 0.05, freq: 4000, type: 'highpass' }); au.tone(2000, 0.05, { type: 'sawtooth', vol: 0.02, slideTo: 3000 }); },
        tick() { au.tone(260, 0.02, { type: 'square', vol: 0.03 }); },
        boomS() { au.noise(0.2, { vol: 0.13, freq: 1600, slideTo: 200 }); },
        boomM() { au.noise(0.4, { vol: 0.18, freq: 1200, slideTo: 100 }); au.tone(140, 0.3, { type: 'square', vol: 0.06, slideTo: 40 }); },
        boomL() { au.noise(1.0, { vol: 0.24, freq: 900, slideTo: 50 }); au.tone(90, 0.8, { type: 'sawtooth', vol: 0.12, slideTo: 25 }); },
        item() { au.melody([[880, 0.05], [1175, 0.05], [1568, 0.08]], { type: 'square', vol: 0.09 }); },
        power() { au.melody([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.14]], { type: 'square', vol: 0.11 }); },
        bomb() { au.noise(1.8, { vol: 0.26, freq: 700, slideTo: 40 }); au.tone(70, 1.5, { type: 'sawtooth', vol: 0.15, slideTo: 25 }); },
        die() { au.noise(1.0, { vol: 0.25, freq: 2600, slideTo: 80 }); au.tone(420, 0.9, { type: 'square', vol: 0.1, slideTo: 40 }); },
        extend() { au.melody([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.22]], { type: 'triangle', vol: 0.18 }); },
        warn() { au.tone(440, 0.22, { type: 'square', vol: 0.1 }); au.tone(330, 0.22, { type: 'square', vol: 0.1, delay: 0.25 }); },
        start() { au.melody([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.25]], { type: 'square', vol: 0.12 }); },
        buzz() { au.tone(98, 0.28, { type: 'square', vol: 0.14 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [784, 0.1], [1047, 0.35]], { type: 'square', vol: 0.12 }); }
      };
      const BASS = [110, 0, 110, 131, 0, 110, 147, 131, 110, 0, 110, 165, 0, 147, 131, 98];
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; SFX.buzz(); return false;
      }

      // ---------- terrain ----------
      function th(a, b, st) { return hash(a * 7919 + b * 104729 + st * 1299709); }
      function tileType(k, c, st) {
        const v = th(k >> 3, (c + ((k >> 3) & 1) * 2) >> 2, st);
        if (v < 0.5) return 0; if (v < 0.68) return 1; if (v < 0.9) return 2; return 3;
      }
      function drawGround(ctx, d, st) {
        const P = PAL[st % 5];
        const k0 = Math.floor(d / 16) - 1, k1 = Math.floor((d + H) / 16) + 1;
        for (let k = k0; k <= k1; k++) {
          const y = Math.round(H - 16 * (k + 1) + d);
          if (y > H || y < -16) continue;
          for (let c = 0; c < 15; c++) {
            const x = c * 16, t = tileType(k, c, st), hv = th(k, c, st + 50);
            if (t === 0) {
              ctx.fillStyle = P.rock; ctx.fillRect(x, y, 16, 16);
              ctx.fillStyle = P.rd;
              ctx.fillRect(x + ((hv * 13) | 0), y + ((hv * 97) % 14 | 0), 2, 2);
              ctx.fillRect(x + ((hv * 53) % 12 | 0), y + ((hv * 31) % 12 | 0), 3, 1);
              if (hv > 0.7) { ctx.fillRect(x + 3, y + 9, 5, 3); ctx.fillStyle = P.cr; ctx.fillRect(x + 4, y + 10, 3, 1); }
            } else if (t === 1) {
              ctx.fillStyle = P.rd; ctx.fillRect(x, y, 16, 16);
              if (hv > 0.35) {
                ctx.fillStyle = P.cr; ctx.fillRect(x + 4, y + 2, 8, 12); ctx.fillRect(x + 2, y + 4, 12, 8);
                ctx.fillStyle = P.rock; ctx.fillRect(x + 4, y + 12, 8, 2); ctx.fillRect(x + 12, y + 4, 2, 8);
              } else { ctx.fillStyle = P.cr; ctx.fillRect(x + 6, y + 6, 3, 3); }
            } else if (t === 2) {
              ctx.fillStyle = P.mt; ctx.fillRect(x, y, 16, 16);
              ctx.fillStyle = P.ml; ctx.fillRect(x, y + 15, 16, 1); ctx.fillRect(x + 15, y, 1, 16);
              ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x + 12, y + 2, 1, 1); ctx.fillRect(x + 2, y + 12, 1, 1); ctx.fillRect(x + 12, y + 12, 1, 1);
              if (hv > 0.82) { ctx.fillStyle = ((frame + k * 7) >> 4) & 1 ? '#ff4030' : '#601810'; ctx.fillRect(x + 6, y + 6, 3, 3); }
              else if (hv < 0.2) { ctx.fillStyle = P.ml; ctx.fillRect(x + 3, y + 5, 10, 6); ctx.fillStyle = P.mt; ctx.fillRect(x + 4, y + 7, 8, 1); }
            } else {
              ctx.fillStyle = P.lq; ctx.fillRect(x, y, 16, 16);
              ctx.fillStyle = P.lh; const o = ((frame >> 3) + c * 3 + k) & 7;
              ctx.fillRect(x + o, y + 4, 5, 1); ctx.fillRect(x + ((o + 5) & 15), y + 11, 4, 1);
            }
          }
        }
      }

      // ---------- game ----------
      function newGame() {
        g = {
          score: 0, lives: 2, stage: 1, loop: 0, nextExtra: 70000, d: 0,
          p: { x: W / 2, y: H - 40, alive: true, t: 0, inv: 120, wt: 0, wl: 0, pc: 0, spd: 1, bombs: 3, fireT: 0 },
          en: [], eb: [], pb: [], items: [], booms: [], pops: [], sparks: [], lasers: [],
          phase: 'intro', phaseT: 160, bombT: 0, waveT: 140, gndT: 200, carT: 420, boss: null, playT: 0, bonus: 0, beat: 0
        };
      }
      function diff() { return (g.stage - 1) + g.loop * 5; }
      function bspd() { return Math.min(3.4, 1.55 + diff() * 0.13); }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 70000 ? 130000 : 200000; SFX.extend(); g.pops.push({ x: g.p.x, y: g.p.y - 20, t: 90, s: '1UP', c: '#ffff40' }); }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, s) {
        g.booms.push({ x, y, t: 0, s: s || 1 });
        const n = (s || 1) * 5;
        for (let i = 0; i < n; i++) { const a = R() * 6.283, v = 0.5 + R() * 2 * (s || 1); g.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 20 + R() * 20 }); }
      }
      function shoot(x, y, a, spd, k) { g.eb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, k: k || 0 }); }
      function aim(x, y) { return Math.atan2(g.p.y - y, g.p.x - x); }
      function canFire(e) { return g.p.alive && e.y > 4 && e.y < H - 50 && Math.hypot(g.p.x - e.x, g.p.y - e.y) > 36 && g.bombT <= 0; }
      function addE(o) { o.t = 0; o.flash = 0; o.dead = false; o.delay = o.delay || 0; g.en.push(o); return o; }

      function spawnWave() {
        const D = diff(), r = R();
        if (r < 0.34) {
          const grp = { n: 5, k: 0 }, x0 = 30 + R() * (W - 60), side = R() < 0.5 ? -1 : 1;
          for (let i = 0; i < 5; i++) addE({ k: 'zako', x: x0, y: -10, vx: 0, vy: 2.2 + D * 0.08, hp: 1, r: 6, sc: 100, grp, delay: i * 12, turn: 50 + R() * 30, side, fireAt: 20 + (R() * 40 | 0) });
        } else if (r < 0.6) {
          const left = R() < 0.5, y0 = 30 + R() * 80, grp = { n: 6, k: 0 };
          for (let i = 0; i < 6; i++) addE({ k: 'swirl', x: left ? -10 : W + 10, y: y0, vx: left ? 2.2 : -2.2, vy: 0.3, hp: 1, r: 6, sc: 150, grp, delay: i * 10, rot: left ? 0.022 : -0.022, fireAt: 40 + (R() * 60 | 0) });
        } else if (r < 0.82) {
          const n = 2 + (D > 3 ? 1 : 0);
          for (let i = 0; i < n; i++) addE({ k: 'diver', x: 40 + R() * (W - 80), y: -12, vx: 0, vy: 1.6, hp: 4 + D * 0.5, r: 7, sc: 300, delay: i * 25, stopY: 50 + R() * 70, shots: 0 });
        } else if (!g.en.some(e => e.k === 'gunship') && g.playT > 500) {
          addE({ k: 'gunship', x: 50 + R() * (W - 100), y: -24, vx: 0, vy: 0.9, hp: 26 + D * 4, r: 15, sc: 2000, stopY: 60 + R() * 30, big: true });
        } else {
          const grp = { n: 4, k: 0 };
          for (let i = 0; i < 4; i++) addE({ k: 'zako', x: 20 + i * ((W - 40) / 3), y: -10 - i * 14, vx: 0, vy: 2, hp: 1, r: 6, sc: 100, grp, delay: 0, turn: 70, side: i < 2 ? 1 : -1, fireAt: 30 + i * 10 });
        }
      }
      function spawnGround() {
        const D = diff();
        if (R() < 0.55) {
          const left = R() < 0.5;
          addE({ k: 'tank', x: left ? 20 + R() * 60 : W - 20 - R() * 60, y: -10, vx: (left ? 1 : -1) * (0.2 + R() * 0.3), vy: 0, hp: 3 + D * 0.4, r: 7, sc: 300, ground: true, a: Math.PI / 2, ft: 60 + R() * 60 });
        } else {
          addE({ k: 'turret', x: 24 + R() * (W - 48), y: -12, vx: 0, vy: 0, hp: 7 + D, r: 8, sc: 500, ground: true, a: Math.PI / 2, ft: 50 + R() * 60 });
        }
      }
      function spawnCarrier() {
        const left = R() < 0.5;
        addE({ k: 'carrier', x: left ? -14 : W + 14, y: 40 + R() * 90, vx: left ? 0.9 : -0.9, vy: 0, hp: 6 + diff() * 0.5, r: 9, sc: 500 });
      }
      function spawnBoss() {
        const D = diff();
        const B = { x: W / 2, y: -70, t: 0, dead: false, deadT: 0, pat: 0, patT: 0, sa: 0 };
        g.boss = B;
        const tur = [[-72, 6], [72, 6], [-38, 24], [38, 24]];
        B.turrets = tur.map(o => addE({ k: 'bpart', boss: B, ox: o[0], oy: o[1], x: B.x + o[0], y: B.y + o[1], hp: 28 + D * 6, r: 8, sc: 3000, a: Math.PI / 2, ft: 60 + R() * 40 }));
        B.core = addE({ k: 'bpart', boss: B, core: true, ox: 0, oy: -2, x: B.x, y: B.y, hp: 150 + D * 30, r: 15, sc: 30000 });
        B.maxhp = B.core.hp;
      }
      function dropItem(k, x, y) { g.items.push({ k, x: clamp(x, 10, W - 10), y: Math.max(10, y), vx: (R() < 0.5 ? -0.5 : 0.5), vy: 0.6, t: 0, wc: (R() * 3) | 0 }); }
      function kill(e) {
        if (e.dead) return;
        e.dead = true; addScore(e.sc);
        if (e.big || e.core) { boom(e.x, e.y, 3); SFX.boomM(); } else { boom(e.x, e.y, e.ground ? 1.4 : 1); SFX.boomS(); }
        if (e.sc >= 1000) g.pops.push({ x: e.x, y: e.y, t: 60, s: String(e.sc), c: '#ffffff' });
        if (e.grp) { e.grp.k++; if (e.grp.k >= e.grp.n) dropItem('P', e.x, e.y); }
        if (e.k === 'carrier') { const r = R(); dropItem(r < 0.55 ? 'W' : r < 0.75 ? 'S' : r < 0.95 ? 'B' : '1', e.x, e.y); }
        if (e.k === 'gunship') dropItem(R() < 0.5 ? 'P' : 'B', e.x, e.y);
        if (e.core) bossDie(e.boss);
      }
      function hurt(e, d) {
        if (e.dead || e.delay > 0 || e.y < -8) return;
        if (e.core && e.boss.turrets.some(t => !t.dead)) d *= 0.35;
        if (e.k === 'bpart' && e.boss.y < 40) return;
        e.hp -= d; e.flash = 3;
        if (e.hp <= 0) kill(e); else if ((frame & 7) === 0) SFX.tick();
      }
      function bossDie(B) {
        B.dead = true; B.deadT = 0; g.eb = [];
        for (const t of B.turrets) if (!t.dead) { t.dead = true; boom(t.x, t.y, 2); }
        SFX.boomL();
      }

      function respawn() {
        const p = g.p;
        p.x = W / 2; p.y = H - 40; p.alive = true; p.inv = 150; p.t = 0;
        p.wl = 0; p.pc = 0; p.spd = 1; p.bombs = Math.max(p.bombs, 3);
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 330; g.p.alive = false;
        au.melody([[392, 0.25], [370, 0.25], [349, 0.25], [330, 0.6]], { type: 'square', vol: 0.12 });
      }
      function lastLife() {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 2; g.score = 0; g.nextExtra = 70000; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function killPlayer() {
        const p = g.p;
        if (!p.alive || p.inv > 0 || g.bombT > 0) return;
        p.alive = false; p.t = 0; boom(p.x, p.y, 3); SFX.die();
        g.lasers = [];
      }
      function fireWeapon() {
        const p = g.p;
        if (p.wt === 0) {
          if (p.fireT > 0) return; p.fireT = 6;
          const sets = [[-4, 4].map(o => [o, 0]), [[0, 0], [-4, -0.18], [4, 0.18]], [[0, 0], [-3, -0.13], [3, 0.13], [-6, -0.28], [6, 0.28]], [[0, 0], [-3, -0.1], [3, 0.1], [-5, -0.22], [5, 0.22], [-7, -0.36], [7, 0.36]]][p.wl];
          for (const s of sets) g.pb.push({ x: p.x + s[0], y: p.y - 8, vx: Math.sin(s[1]) * 7, vy: -Math.cos(s[1]) * 7, w: p.wl === 3 ? 4 : 3, h: 8, dmg: 1, k: 0 });
          SFX.shot();
        } else if (p.wt === 1) {
          if (p.fireT > 0) return; p.fireT = 3;
          const w = [5, 9, 13, 19][p.wl];
          g.pb.push({ x: p.x, y: p.y - 14, vx: 0, vy: -11, w, h: 22, dmg: 0.55 + p.wl * 0.12, k: 1 });
          if ((frame % 9) === 0) SFX.beam();
        } else {
          const n = p.wl + 1;
          const cand = g.en.filter(e => !e.dead && e.delay <= 0 && e.y > 0 && e.y < p.y - 4 && (e.k !== 'bpart' || e.boss.y >= 40));
          cand.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
          g.lasers = [];
          for (let i = 0; i < n; i++) {
            const e = cand.length ? cand[i % cand.length] : null;
            if (e && Math.hypot(e.x - p.x, e.y - p.y) < 230) { g.lasers.push({ x: e.x, y: e.y }); hurt(e, 0.13); }
            else g.lasers.push({ x: p.x + (i - (n - 1) / 2) * 14, y: -10 });
          }
          if ((frame % 7) === 0) SFX.laser();
        }
      }
      function useBomb() {
        const p = g.p;
        if (p.bombs <= 0 || g.bombT > 0) return;
        p.bombs--; g.bombT = 110; g.eb = []; SFX.bomb();
      }
      function updPlayer() {
        const p = g.p;
        if (!p.alive) {
          if (g.phase === 'over') return;
          p.t++;
          if (p.t === 110) { if (g.lives > 0) { g.lives--; respawn(); } else lastLife(); }
          return;
        }
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        const sp = (1.35 + p.spd * 0.42) * (dx && dy ? 0.7071 : 1);
        p.x = clamp(p.x + dx * sp, 8, W - 8); p.y = clamp(p.y + dy * sp, 24, H - 14);
        if (p.inv > 0) p.inv--;
        if (p.fireT > 0) p.fireT--;
        if (api.key('Space') && g.phase !== 'clear') fireWeapon(); else g.lasers = [];
        if (api.pressed('KeyX') || api.pressed('KeyZ')) useBomb();
        // items
        for (const it of g.items) {
          if (it.got || Math.abs(it.x - p.x) > 12 || Math.abs(it.y - p.y) > 12) continue;
          it.got = true;
          if (it.k === 'P') {
            if (p.wl >= 3) { addScore(5000); g.pops.push({ x: it.x, y: it.y, t: 60, s: '5000', c: '#ffff60' }); SFX.item(); }
            else if (++p.pc >= 3) { p.pc = 0; p.wl++; SFX.power(); g.pops.push({ x: it.x, y: it.y, t: 60, s: 'POWER UP', c: '#ffff60' }); }
            else SFX.item();
          } else if (it.k === 'W') {
            const c = Math.floor(it.t / 80 + it.wc) % 3;
            if (c === p.wt && p.wl < 3) { p.wl++; SFX.power(); } else SFX.item();
            p.wt = c; g.lasers = [];
            g.pops.push({ x: it.x, y: it.y, t: 60, s: WNAME[c], c: WCOL[c] });
          } else if (it.k === 'S') { p.spd = Math.min(5, p.spd + 1); SFX.item(); g.pops.push({ x: it.x, y: it.y, t: 50, s: 'SPEED UP', c: '#60ffff' }); }
          else if (it.k === 'B') { p.bombs = Math.min(7, p.bombs + 1); SFX.item(); }
          else if (it.k === '1') { g.lives++; SFX.extend(); g.pops.push({ x: it.x, y: it.y, t: 60, s: '1UP', c: '#ffff40' }); }
          addScore(200);
        }
        // collisions
        for (const b of g.eb) if (Math.abs(b.x - p.x) < 3 + (b.k ? 2 : 1.5) && Math.abs(b.y - p.y) < 4 + (b.k ? 2 : 1.5)) { killPlayer(); break; }
        if (p.alive) for (const e of g.en) {
          if (e.dead || e.ground || e.delay > 0) continue;
          if (Math.abs(e.x - p.x) < e.r + 3 && Math.abs(e.y - p.y) < e.r + 3) { killPlayer(); break; }
        }
      }
      function updShots() {
        for (const s of g.pb) {
          s.x += s.vx; s.y += s.vy;
          if (s.y < -30 || s.x < -10 || s.x > W + 10) { s.gone = true; continue; }
          for (const e of g.en) {
            if (e.dead || e.delay > 0) continue;
            if (Math.abs(e.x - s.x) < e.r + s.w / 2 && Math.abs(e.y - s.y) < e.r + s.h / 2) { hurt(e, s.dmg); s.gone = true; g.sparks.push({ x: s.x, y: s.y - 4, vx: 0, vy: -0.5, t: 5, hit: 1 }); break; }
          }
        }
        g.pb = g.pb.filter(s => !s.gone);
      }
      function updEnemies() {
        const D = diff(), bs = bspd(), p = g.p;
        for (const e of g.en) {
          if (e.dead) continue;
          if (e.delay > 0) { e.delay--; continue; }
          e.t++; if (e.flash > 0) e.flash--;
          switch (e.k) {
            case 'zako':
              if (e.t === e.turn) { e.vx = (p.x > e.x ? 1 : -1) * 1.9; e.vy = 1.2; }
              if (e.t > e.turn) { e.vy += 0.03; }
              if (e.t === e.fireAt && canFire(e) && R() < 0.5 + D * 0.08) shoot(e.x, e.y + 4, aim(e.x, e.y), bs);
              break;
            case 'swirl': {
              if (e.t < 170) { const c = Math.cos(e.rot), s = Math.sin(e.rot); const vx = e.vx * c - e.vy * s; e.vy = e.vx * s + e.vy * c; e.vx = vx; }
              if (e.t === e.fireAt && canFire(e)) shoot(e.x, e.y, aim(e.x, e.y), bs);
              break;
            }
            case 'diver':
              if (e.y >= e.stopY && e.vy > 0 && e.shots < 3) { e.vy = 0; e.ft = 20; }
              if (e.vy === 0) {
                if (--e.ft <= 0) {
                  e.shots++; e.ft = 40;
                  if (canFire(e)) { const a = aim(e.x, e.y); for (let i = -1; i <= 1; i++) shoot(e.x, e.y + 5, a + i * 0.25, bs); }
                  if (e.shots >= 3) { e.vy = 2.4; e.vx = p.x > e.x ? -0.6 : 0.6; }
                }
              }
              break;
            case 'gunship':
              if (e.y >= e.stopY && e.t < 480) { e.vy = 0; e.vx = Math.sin(e.t * 0.02) * 0.6; }
              if (e.t >= 480) { e.vy = 1.2; }
              if (e.t % Math.max(50, 90 - D * 6) === 0 && canFire(e)) {
                if ((e.t / 10) % 3 < 1) { for (let i = 0; i < 12; i++) shoot(e.x, e.y, i * Math.PI / 6 + e.t * 0.01, bs * 0.8, 1); }
                else { const a = aim(e.x, e.y); for (let i = -2; i <= 2; i++) shoot(e.x, e.y + 8, a + i * 0.18, bs, 0); }
              }
              break;
            case 'carrier':
              e.y += Math.sin(e.t * 0.05) * 0.3;
              break;
            case 'tank':
              e.y += SCROLL;
              e.a = aim(e.x, e.y);
              if (e.x < 10 || e.x > W - 10) e.vx = -e.vx;
              if (--e.ft <= 0) { e.ft = Math.max(70, 140 - D * 8) + R() * 40; if (canFire(e)) shoot(e.x + Math.cos(e.a) * 8, e.y + Math.sin(e.a) * 8, e.a, bs * 0.9); }
              break;
            case 'turret':
              e.y += SCROLL;
              e.a = aim(e.x, e.y);
              if (--e.ft <= 0) { e.ft = Math.max(60, 120 - D * 8) + R() * 30; if (canFire(e)) for (let i = -1; i <= 1; i++) shoot(e.x + Math.cos(e.a) * 9, e.y + Math.sin(e.a) * 9, e.a + i * 0.3, bs * 0.85); }
              break;
            case 'bpart': {
              const B = e.boss;
              e.x = B.x + e.ox; e.y = B.y + e.oy;
              if (!e.core) {
                e.a = aim(e.x, e.y);
                if (B.y > 40 && !B.dead && --e.ft <= 0) { e.ft = Math.max(45, 90 - D * 6) + R() * 30; if (canFire(e)) shoot(e.x + Math.cos(e.a) * 9, e.y + Math.sin(e.a) * 9, e.a, bs); }
              }
              break;
            }
          }
          if (e.k !== 'bpart') { e.x += e.vx; e.y += e.vy; }
          if (e.k !== 'bpart' && (e.y > H + 30 || e.x < -40 || e.x > W + 40 || (e.y < -60 && e.t > 60))) e.dead = true;
        }
        g.en = g.en.filter(e => !e.dead);
      }
      function updBoss() {
        const B = g.boss; if (!B) return;
        const D = diff(), bs = bspd(), core = B.core;
        B.t++;
        if (B.dead) {
          B.deadT++;
          if (B.deadT % 6 === 0) { boom(B.x + (R() - 0.5) * 180, B.y + (R() - 0.5) * 60, 1 + R() * 2); if (B.deadT % 18 === 0) SFX.boomM(); }
          if (B.deadT === 130) { boom(B.x, B.y, 6); SFX.boomL(); }
          if (B.deadT >= 150) { g.boss = null; g.phase = 'clear'; g.phaseT = 300; g.bonus = 10000 * g.stage + 50000 * g.loop; SFX.clear(); }
          return;
        }
        if (B.y < 72) B.y += 0.45; else B.x = W / 2 + Math.sin(B.t * 0.008) * 26;
        if (B.y < 60 || !g.p.alive) return;
        const enraged = B.turrets.every(t => t.dead);
        B.patT++;
        const len = 200;
        if (B.patT >= len) { B.patT = 0; B.pat = (B.pat + 1) % 3; }
        const step = enraged ? 1 : 0;
        if (B.pat === 0) {
          if (B.patT % (enraged ? 30 : 45) === 0 && B.patT < 160) { const n = 14 + Math.min(10, D * 2); for (let i = 0; i < n; i++) shoot(core.x, core.y + 6, i * 6.283 / n + B.patT * 0.05, bs * 0.8, 1); }
        } else if (B.pat === 1) {
          if (B.patT % (5 - step) === 0 && B.patT < 150) { B.sa += 0.33; shoot(core.x, core.y + 6, B.sa, bs * 0.85, 1); shoot(core.x, core.y + 6, B.sa + Math.PI, bs * 0.85, 1); }
        } else {
          if (B.patT % (enraged ? 22 : 32) === 0 && B.patT < 170) { const a = aim(core.x, core.y); for (let i = -2; i <= 2; i++) shoot(core.x, core.y + 10, a + i * 0.16, bs * 1.1, 0); }
        }
      }
      function updEBullets() {
        for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
        g.eb = g.eb.filter(b => b.x > -8 && b.x < W + 8 && b.y > -8 && b.y < H + 8);
      }
      function updMisc() {
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < 28 + b.s * 6);
        for (const s of g.sparks) { s.x += s.vx; s.y += s.vy; s.vx *= 0.94; s.vy *= 0.94; s.t--; }
        g.sparks = g.sparks.filter(s => s.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
        for (const it of g.items) {
          it.t++; it.x += it.vx; it.y += it.vy;
          if (it.x < 8 || it.x > W - 8) it.vx = -it.vx;
          if (it.t < 560) { if (it.y > H - 40) it.vy = -Math.abs(it.vy); if (it.y < 30) it.vy = Math.abs(it.vy); }
        }
        g.items = g.items.filter(it => !it.got && it.y < H + 12);
        if (g.bombT > 0) {
          g.bombT--; g.eb = [];
          if (g.bombT % 10 === 0) for (const e of g.en) if (!e.dead && e.delay <= 0 && e.y > -8 && e.y < H) hurt(e, e.k === 'bpart' ? 4 : 5);
        }
      }
      function nextStage() {
        g.stage++; if (g.stage > 5) { g.stage = 1; g.loop++; }
        g.d = 0; g.playT = 0; g.phase = 'intro'; g.phaseT = 160; g.en = []; g.eb = []; g.items = [];
        g.waveT = 140; g.gndT = 200; g.carT = 420;
      }

      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++; attractD += SCROLL;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); SFX.start(); }
          return;
        }
        updMisc();
        if (g.phase === 'over') {
          g.phaseT--; updEBullets();
          if (g.phaseT <= 0 || (g.phaseT < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        g.d += SCROLL;
        updPlayer(); if (!g || g.phase === 'over') return;
        updShots(); updEnemies(); updEBullets();
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; }
        else if (g.phase === 'play') {
          g.playT++;
          const D = diff();
          if (--g.waveT <= 0) { spawnWave(); g.waveT = Math.max(45, 105 - D * 7) + R() * 50; }
          if (--g.gndT <= 0) { spawnGround(); g.gndT = Math.max(50, 110 - D * 6) + R() * 80; }
          if (--g.carT <= 0) { spawnCarrier(); g.carT = 640 + R() * 300; }
          if (g.playT >= STLEN) { g.phase = 'warn'; g.phaseT = 240; }
        } else if (g.phase === 'warn') {
          if (g.phaseT % 48 === 0) SFX.warn();
          if (--g.phaseT <= 0) { spawnBoss(); g.phase = 'boss'; }
        } else if (g.phase === 'boss') updBoss();
        else if (g.phase === 'clear') {
          g.phaseT--;
          if (g.phaseT === 170) addScore(g.bonus);
          if (g.phaseT <= 0) nextStage();
        }
        // bass line
        if (g.phase !== 'clear' && frame % 10 === 0) {
          const n = BASS[g.beat++ % BASS.length];
          if (n) au.tone(n * (g.phase === 'boss' ? 1.06 : 1), 0.14, { type: 'triangle', vol: 0.07 });
        }
      }

      // ---------- rendering ----------
      function drawTank(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0;
        ctx.fillStyle = '#202020'; ctx.fillRect(x - 7, y - 6, 3, 13); ctx.fillRect(x + 4, y - 6, 3, 13);
        ctx.fillStyle = '#505050'; for (let i = 0; i < 13; i += 3) { ctx.fillRect(x - 7, y - 6 + ((i + (frame >> 2)) % 13), 3, 1); ctx.fillRect(x + 4, y - 6 + ((i + (frame >> 2)) % 13), 3, 1); }
        ctx.fillStyle = fl ? '#fff' : '#7a7a30'; ctx.fillRect(x - 4, y - 5, 8, 11);
        ctx.fillStyle = fl ? '#fff' : '#a0a040'; ctx.fillRect(x - 3, y - 3, 6, 6);
        ctx.fillStyle = '#303010';
        for (let i = 2; i < 10; i++) ctx.fillRect(Math.round(x + Math.cos(e.a) * i) - 1, Math.round(y + Math.sin(e.a) * i) - 1, 2, 2);
      }
      function drawTurret(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0;
        ctx.fillStyle = '#2a2a34'; ctx.fillRect(x - 9, y - 7, 18, 14); ctx.fillRect(x - 7, y - 9, 14, 18);
        ctx.fillStyle = fl ? '#fff' : '#8890a0'; ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.fillStyle = fl ? '#fff' : '#c0c8d8'; ctx.fillRect(x - 4, y - 4, 8, 8);
        ctx.fillStyle = '#ff3020'; ctx.fillRect(x - 1, y - 1, 2, 2);
        ctx.fillStyle = '#202028';
        for (let i = 3; i < 12; i++) ctx.fillRect(Math.round(x + Math.cos(e.a) * i) - 1, Math.round(y + Math.sin(e.a) * i) - 1, 3, 3);
      }
      function drawGunship(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0;
        const a = fl ? '#ffffff' : '#3a7a50', b = fl ? '#ffffff' : '#60b070', c = '#1c3a28';
        ctx.fillStyle = c; ctx.fillRect(x - 18, y - 4, 36, 10); ctx.fillRect(x - 6, y - 14, 12, 30);
        ctx.fillStyle = a; ctx.fillRect(x - 17, y - 3, 34, 8); ctx.fillRect(x - 5, y - 13, 10, 28);
        ctx.fillStyle = b; ctx.fillRect(x - 15, y - 2, 30, 2); ctx.fillRect(x - 3, y - 12, 6, 24);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillStyle = (frame >> 2) & 1 ? '#ff6020' : '#ffe080'; ctx.fillRect(x - 14, y - 7, 3, 3); ctx.fillRect(x + 11, y - 7, 3, 3);
        ctx.fillStyle = '#103020'; ctx.fillRect(x - 12, y + 5, 3, 5); ctx.fillRect(x + 9, y + 5, 3, 5); ctx.fillRect(x - 2, y + 15, 4, 3);
      }
      function drawCarrier(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0;
        ctx.fillStyle = '#503010'; ctx.fillRect(x - 11, y - 7, 22, 14);
        ctx.fillStyle = fl ? '#fff' : '#d09a30'; ctx.fillRect(x - 10, y - 6, 20, 12);
        ctx.fillStyle = fl ? '#fff' : '#ffd060'; ctx.fillRect(x - 10, y - 6, 20, 3);
        ctx.fillStyle = '#704010'; ctx.fillRect(x - 3, y - 2, 6, 6);
        ctx.fillStyle = (frame >> 3) & 1 ? '#40ff60' : '#ff4040'; ctx.fillRect(x - 1, y, 2, 2);
        ctx.fillStyle = '#806040'; ctx.fillRect(x - 14, y - 2, 3, 4); ctx.fillRect(x + 11, y - 2, 3, 4);
      }
      function drawBossHull(ctx, B) {
        const x = Math.round(B.x), y = Math.round(B.y), P = PAL[(g.stage - 1) % 5];
        const dk = '#20202a', md = B.dead && (frame & 2) ? '#a04020' : '#5a5c6c', lt = '#8a8ca0';
        ctx.fillStyle = dk;
        ctx.fillRect(x - 100, y - 10, 200, 26); ctx.fillRect(x - 60, y - 30, 120, 66); ctx.fillRect(x - 24, y + 36, 48, 14);
        ctx.fillStyle = md;
        ctx.fillRect(x - 98, y - 8, 196, 22); ctx.fillRect(x - 58, y - 28, 116, 62); ctx.fillRect(x - 22, y + 34, 44, 14);
        ctx.fillStyle = lt;
        ctx.fillRect(x - 96, y - 7, 192, 3); ctx.fillRect(x - 56, y - 27, 112, 3);
        ctx.fillStyle = P.ml;
        for (let i = -88; i <= 80; i += 16) ctx.fillRect(x + i, y + 4, 8, 6);
        for (let i = -50; i <= 42; i += 12) ctx.fillRect(x + i, y + 22, 6, 8);
        ctx.fillStyle = '#ff3020';
        if ((frame >> 3) & 1) { ctx.fillRect(x - 96, y + 10, 4, 3); ctx.fillRect(x + 92, y + 10, 4, 3); }
        ctx.fillStyle = (frame >> 1) & 1 ? '#ffa020' : '#ff4010';
        ctx.fillRect(x - 40, y - 34, 6, 5); ctx.fillRect(x + 34, y - 34, 6, 5); ctx.fillRect(x - 6, y - 34, 12, 5);
      }
      function drawPart(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0;
        if (e.core) {
          const B = e.boss, pulse = (frame >> 2) & 3;
          ctx.fillStyle = '#301018'; ctx.fillRect(x - 16, y - 12, 32, 24); ctx.fillRect(x - 12, y - 16, 24, 32);
          ctx.fillStyle = fl ? '#ffffff' : ['#c02040', '#e03050', '#ff4060', '#e03050'][pulse]; ctx.fillRect(x - 14, y - 10, 28, 20); ctx.fillRect(x - 10, y - 14, 20, 28);
          ctx.fillStyle = '#ffd0e0'; ctx.fillRect(x - 6, y - 6, 12, 12);
          ctx.fillStyle = '#802030'; ctx.fillRect(x - 3, y - 3, 6, 6);
          return;
        }
        ctx.fillStyle = '#18181e'; ctx.fillRect(x - 9, y - 9, 18, 18);
        ctx.fillStyle = fl ? '#fff' : '#9a9cb0'; ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.fillStyle = '#d0d4e8'; ctx.fillRect(x - 5, y - 5, 6, 3);
        ctx.fillStyle = '#18181e';
        for (let i = 3; i < 13; i++) ctx.fillRect(Math.round(x + Math.cos(e.a) * i) - 1, Math.round(y + Math.sin(e.a) * i) - 1, 3, 3);
      }
      function drawEnemy(ctx, e) {
        if (e.delay > 0) return;
        switch (e.k) {
          case 'zako': case 'swirl': {
            ctx.drawImage(ZAKO, Math.round(e.x - 6), Math.round(e.y - 5));
            if (e.flash) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(e.x - 3), Math.round(e.y - 2), 6, 4); }
            break;
          }
          case 'diver': ctx.drawImage(DIVER, Math.round(e.x - 6), Math.round(e.y - 5)); if (e.flash) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(e.x - 3), Math.round(e.y - 2), 6, 4); } break;
          case 'gunship': drawGunship(ctx, e); break;
          case 'carrier': drawCarrier(ctx, e); break;
          case 'tank': drawTank(ctx, e); break;
          case 'turret': drawTurret(ctx, e); break;
          case 'bpart': drawPart(ctx, e); break;
        }
      }
      function drawItem(ctx, it) {
        const x = Math.round(it.x), y = Math.round(it.y);
        if (it.t > 480 && (frame & 4)) return;
        if (it.k === 'W') {
          const c = Math.floor(it.t / 80 + it.wc) % 3;
          ctx.fillStyle = '#000'; ctx.fillRect(x - 7, y - 7, 14, 14);
          ctx.fillStyle = WCOL[c]; ctx.fillRect(x - 6, y - 6, 12, 12);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 4, 3, 3);
          text(ctx, ['P', 'T', 'L'][c], x - 2, y - 3, '#000');
          return;
        }
        const col = it.k === 'P' ? '#ff4030' : it.k === 'S' ? '#30a0ff' : it.k === 'B' ? '#ffc020' : '#40ff40';
        ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.fillStyle = (frame >> 3) & 1 ? col : '#ffffff'; ctx.fillRect(x - 5, y - 5, 10, 10);
        text(ctx, it.k, x - 2, y - 3, '#000');
      }
      function drawLaser(ctx, p) {
        for (let i = 0; i < g.lasers.length; i++) {
          const L = g.lasers[i];
          const x0 = p.x + (i - (g.lasers.length - 1) / 2) * 4, y0 = p.y - 8;
          let px = x0, py = y0;
          const segs = 8;
          for (let s = 1; s <= segs; s++) {
            const t = s / segs;
            const nx = x0 + (L.x - x0) * t + (s < segs ? (R() - 0.5) * 10 : 0), ny = y0 + (L.y - y0) * t;
            ctx.strokeStyle = '#3a6cff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
            ctx.strokeStyle = '#d8f0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
            px = nx; py = ny;
          }
          if (L.y > 0) { ctx.fillStyle = (frame & 2) ? '#ffffff' : '#80c0ff'; ctx.fillRect(L.x - 3, L.y - 3, 6, 6); }
        }
      }
      function drawBooms(ctx) {
        for (const s of g.sparks) { ctx.fillStyle = s.hit ? '#ffffa0' : s.t > 20 ? '#ffe070' : '#ff7020'; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.hit ? 2 : 1, s.hit ? 2 : 1); }
        for (const b of g.booms) {
          const life = 28 + b.s * 6, k = b.t / life, r = (5 + b.s * 7) * (0.35 + k);
          if (b.t < 3) { disc(ctx, b.x, b.y, r * 1.2, '#ffffff'); continue; }
          disc(ctx, b.x, b.y, r, k < 0.5 ? '#ff8020' : '#803018');
          disc(ctx, b.x, b.y, r * (k < 0.5 ? 0.65 : 0.5), k < 0.5 ? '#ffe060' : '#402018');
          if (k < 0.3) disc(ctx, b.x, b.y, r * 0.3, '#ffffff');
        }
      }
      function drawHUD(ctx) {
        const sc = g ? g.score : 0;
        otext(ctx, '1P', 6, 3, '#ff4040');
        otext(ctx, String(sc).padStart(7, ' '), 64, 3, '#ffffff', 1, 'right');
        otext(ctx, 'HI', 116, 3, '#ff4040');
        otext(ctx, String(hi).padStart(7, ' '), 176, 3, '#ffff60', 1, 'right');
        if (!g) return;
        for (let i = 0; i < Math.min(5, g.lives); i++) { ctx.drawImage(SHIP, 3 + i * 12, H - 13, 15, 15); }
        for (let i = 0; i < g.p.bombs; i++) drawSkull(ctx, W - 8 - i * 11, H - 7, 0.6, '#ff60a0');
        // weapon gauge
        ctx.fillStyle = '#000'; ctx.fillRect(W - 46, 2, 42, 9);
        ctx.fillStyle = WCOL[g.p.wt];
        for (let i = 0; i <= g.p.wl; i++) ctx.fillRect(W - 44 + i * 10, 4, 8, 5);
      }
      function drawTitle(ctx) {
        drawGround(ctx, attractD, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
        const page = Math.floor(titleT / 600) % 2;
        if (page === 0) {
          drawSkull(ctx, W / 2, 128, 5, '#401020');
          drawSkull(ctx, W / 2, 124, 5, (frame >> 4) & 1 ? '#c02040' : '#a01830');
          const lx = W / 2, ly = 52;
          otext(ctx, 'TRUXTON', lx + 2, ly + 2, '#400000', 4, 'center');
          const bands = [[0, 10, '#ffe060'], [10, 18, '#ff8020'], [18, 28, '#e02010']];
          for (const [y0, y1, col] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + y0, W, y1 - y0); ctx.clip(); text(ctx, 'TRUXTON', lx, ly, col, 4, 'center'); ctx.restore(); }
          otext(ctx, 'THE SUPER FIGHTER', W / 2, 88, '#80c0ff', 1, 'center');
          otext(ctx, '1ST EXTEND 70000 PTS', W / 2, 186, '#ffffff', 1, 'center');
          otext(ctx, 'EVERY 200000 PTS', W / 2, 198, '#ffffff', 1, 'center');
        } else {
          otext(ctx, '- POWER UP ITEMS -', W / 2, 40, '#ffff60', 1, 'center');
          const rows = [['W', 0, 'RED   POWER SHOT'], ['W', 1, 'GREEN TRUXTON BEAM'], ['W', 2, 'BLUE  THUNDER LASER'], ['P', 0, 'POWER UP'], ['S', 0, 'SPEED UP'], ['B', 0, 'TRUXTON BOMB']];
          rows.forEach((r, i) => {
            const y = 66 + i * 20;
            drawItem(ctx, { k: r[0], x: 40, y: y + 3, t: 0, wc: r[1] });
            otext(ctx, r[2], 60, y, r[0] === 'W' ? WCOL[r[1]] : '#ffffff');
          });
          otext(ctx, 'COLLECT 3 P TO POWER UP', W / 2, 192, '#80c0ff', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : blink) otext(ctx, 'INSERT COIN', W / 2, 232, '#ff4040', 1, 'center'); }
        else if (blink) otext(ctx, 'PUSH START BUTTON', W / 2, 232, '#ffffff', 1, 'center');
        otext(ctx, '\u00a9 TOAPLAN 1988', W / 2, 270, '#ffffff', 1, 'center');
        otext(ctx, credStr(api), W / 2, 300, '#c0c0c0', 1, 'center');
        drawHUD(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) { drawTitle(ctx); return; }
        drawGround(ctx, g.d, (g.stage - 1) % 5);
        for (const e of g.en) if (e.ground) drawEnemy(ctx, e);
        if (g.boss) drawBossHull(ctx, g.boss);
        for (const e of g.en) if (!e.ground) drawEnemy(ctx, e);
        const p = g.p;
        for (const s of g.pb) {
          if (s.k === 0) { ctx.fillStyle = '#ff9060'; ctx.fillRect(Math.round(s.x - s.w / 2), Math.round(s.y - 4), s.w, 8); ctx.fillStyle = '#ffffc0'; ctx.fillRect(Math.round(s.x - 1), Math.round(s.y - 3), 2, 6); }
          else { ctx.fillStyle = '#20c040'; ctx.fillRect(Math.round(s.x - s.w / 2), Math.round(s.y - s.h / 2), s.w, s.h); ctx.fillStyle = '#b0ffb0'; ctx.fillRect(Math.round(s.x - s.w / 4), Math.round(s.y - s.h / 2), Math.max(1, s.w / 2 | 0), s.h); }
        }
        if (p.alive && g.lasers.length) drawLaser(ctx, p);
        if (p.alive && !(p.inv > 0 && (frame & 2))) {
          ctx.drawImage(SHIP, Math.round(p.x - 7), Math.round(p.y - 8));
          ctx.fillStyle = (frame & 2) ? '#ffe040' : '#ff7020'; ctx.fillRect(Math.round(p.x - 2), Math.round(p.y + 7), 1, 3 + (frame & 1)); ctx.fillRect(Math.round(p.x + 1), Math.round(p.y + 7), 1, 3 + (frame & 1));
        }
        for (const b of g.eb) {
          if (b.k) { ctx.fillStyle = '#ff40a0'; ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 2), 5, 5); ctx.fillStyle = '#ffd0f0'; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 3, 3); }
          else { ctx.fillStyle = '#ff8020'; ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 1), 4, 3); ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 2), 2, 5); ctx.fillStyle = '#ffffa0'; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 1), 2, 2); }
        }
        drawBooms(ctx);
        for (const it of g.items) drawItem(ctx, it);
        if (g.bombT > 0) {
          const k = 1 - g.bombT / 110, s = 2 + k * 11;
          ctx.globalAlpha = Math.min(1, g.bombT / 30) * 0.85;
          drawSkull(ctx, W / 2, H / 2 - 10, s * 1.05, '#600030');
          drawSkull(ctx, W / 2, H / 2 - 10, s, (frame >> 1) & 1 ? '#ff4090' : '#c02060');
          ctx.globalAlpha = 1;
        }
        for (const q of g.pops) otext(ctx, q.s, q.x, q.y, q.c, 1, 'center');
        if (g.phase === 'intro') {
          otext(ctx, 'STAGE ' + g.stage, W / 2, 130, '#ffffff', 2, 'center');
          otext(ctx, PAL[(g.stage - 1) % 5].name, W / 2, 156, '#ffd040', 1, 'center');
          if (g.loop) otext(ctx, 'LOOP ' + (g.loop + 1), W / 2, 170, '#ff6060', 1, 'center');
        }
        if (g.phase === 'warn' && (frame >> 4) & 1) {
          ctx.fillStyle = 'rgba(200,0,0,0.25)'; ctx.fillRect(0, 120, W, 50);
          otext(ctx, 'WARNING !!', W / 2, 128, '#ff3030', 2, 'center');
          otext(ctx, 'BIG ENEMY APPROACHING', W / 2, 152, '#ffffff', 1, 'center');
        }
        if (g.phase === 'clear') {
          otext(ctx, 'STAGE ' + g.stage + ' CLEAR', W / 2, 120, '#ffffff', 2, 'center');
          if (g.phaseT < 230) otext(ctx, 'BONUS ' + g.bonus + ' PTS', W / 2, 150, '#ffff60', 1, 'center');
        }
        if (g.phase === 'over') otext(ctx, 'GAME OVER', W / 2, 140, '#ff4040', 2, 'center');
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ god() { if (g && g.p.alive) g.p.inv = 5; }, sum: () => g && { ph: g.phase, st: g.stage, loop: g.loop, sc: g.score, lv: g.lives, en: g.en.length, eb: g.eb.length, boss: g.boss ? Math.round(g.boss.core.hp) : null, wl: g.p.wl, wt: g.p.wt } });
      return { update, render, destroy() { } };
    }
  });
})();
