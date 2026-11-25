// Darius (Taito, 1986) - from-scratch recreation for the MAME32 Game Room.
// Horizontal shooter on a single screen width: the Silver Hawk with missiles (-> laser -> wave),
// air-to-ground bombs and the Arm shield, powered by red / green / blue orbs; mechanical sea-creature
// battleships guard the end of each zone, and after every boss the cave splits so you choose the
// upper or lower zone on the A-to-Z branching map, 7 zones per journey.
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
  const W = 288, H = 224, TOP = 14, BOT = H - 12, ZLEN = 2600;
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const ROWSZ = [1, 2, 3, 4, 5, 6, 5], ROWST = [0, 1, 3, 6, 10, 15, 21];
  const HAWK = spr([
    '....aa..................',
    '...abba.................',
    '..abbbba................',
    '.abbbbbbaaaaaaa.........',
    'aabbbbbbbbbbbbbaaaa.....',
    'abbbbbbbbbbbccbbbbbaaa..',
    'aabbbbbbbbbbbcwcbbbbbbaa',
    '.abbbbbbbbbbbbbbbbbbbaa.',
    'aabbddddddddddbbbaaa....',
    '.abba...................',
    '..aa....................'
  ], { a: '#38485a', b: '#c8d0dc', c: '#3070ff', w: '#e0f0ff', d: '#6a7890' });
  const FISHLET = [
    '...aaa...',
    '.aabbba.a',
    'awbbbbbab',
    'abbbbbbbb',
    '.aabbba.a',
    '...aaa...'
  ];
  const BSHAPES = {
    fish: [
      '.............aaaaa..........aa.....',
      '...........aabbbbba........abba....',
      '.........aabbdbdbdbba.....abbba....',
      '.......aabbbbbbbbbbbbaaaaabbbba....',
      '.....aabccbbbbbbbbbbbbbbbbbbbbbaa..',
      '....abbcwwcbbdbbdbbdbbdbbbbbbbbbbaa',
      '...abbbbccbbbdbbdbbdbbdbbbbbbbbbbbb',
      '..arrbbbbbbbbbbbbbbbbbbbbbbbbbbbbba',
      '.arrrrbbbbbbbbbbbbbbbbbbbbbbbbbbbaa',
      '..arrbbbbbbbeeeeeeeeeeeeeebbbbbbba.',
      '...abbbbbbeeeeeeeeeeeeeeeeebbbbba..',
      '....aabbbbbbaaaaaaaaaaaabbbbbbbbaa.',
      '......aabba..........abbba..abba...',
      '........aa............aa.....aa....'
    ],
    crab: [
      'aaaa......................',
      'abbba.....................',
      '.abbba..........aaaaaa....',
      'aabbbbaa......aabbbbbbaa..',
      'abbbbbbba...aabbbbbbbbbba.',
      '.aabbbbbbaaabbbcwbbcwbbbba',
      '...aaabbbbbbbbbccbbccbbbba',
      '......aarrrrbbbbdbbdbbbbba',
      '......aarrrrbbbbdbbdbbbbba',
      '...aaabbbbbbbbbbeeeeebbbba',
      '.aabbbbbbaaabbbbeeeeebbba.',
      'abbbbbbba...aabbbbbbbbaa..',
      'aabbbbaa......aaaaaaaa....',
      '.abbba......a.a.a.a.a.....',
      'abbba......a.a.a.a.a......',
      'aaaa......................'
    ],
    squid: [
      '..........aaaaaa......',
      '.......aaabbbbbbaa....',
      '.....aabbbbbbbbbbba...',
      '....abbbbbbbbbbbbbbaa.',
      '...abcwcbbbbbbbbbbbbba',
      '..abbcccbbdbbdbbdbbbba',
      '.arrbbbbbbdbbdbbdbbba.',
      'arrrrbbbbbbbbbbbbbba..',
      '.arrbbbbbbbbbbbbbba...',
      '..aaabbbbbbbbbbbaa....',
      '.aeeaaeeaaeeaaeeaa....',
      'aeea.aeea.aeea.aeea...',
      'ea..ea..ea..ea..ea....',
      'a...a...a...a...a.....'
    ],
    whale: [
      '..................aaaaaaaa......................',
      '..............aaaabbbbbbbbaaaa..................',
      '...........aaabbbbbbbbbbbbbbbbaaa...........aaa.',
      '.........aabbbbbbbdbbbbbdbbbbbbbbaa.......aabba.',
      '.......aabbbbbbbbbdbbbbbdbbbbbbbbbbaa...aabbba..',
      '.....aabbbccbbbbbbdbbbbbdbbbbbbbbbbbbaaabbbba...',
      '....abbbbcwwcbbbbbbbbbbbbbbbbbbbbbbbbbbbbbba....',
      '...abbbbbbccbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbba...',
      '..abbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbba..',
      '.arrrrrrrrbbbbbbbbbbbbbbbbbbbbbbbbbbbbbaaabbbbaa',
      'arrrrrrrrrrrbbbbbbbbbbbbbbbbbbbbbbbbbaa...aabbba',
      '.arrrrrrrrbbeeeeeeeeeeeeeeeeeeeeebbbaa......aaa.',
      '..abbbbbbbeeeeeeeeeeeeeeeeeeeeeeebbaa...........',
      '...aabbbbbbeeeeeeeeeeeeeeeeeeeeebbaa............',
      '.....aaabbbbbbbbbbbbbbbbbbbbbbbbaa..............',
      '........aaaaabbbbbbbbbbbbbaaaaaa................',
      '.............aaaaaaaaaaaaa......................'
    ]
  };
  const BOSSES = [
    { name: 'KING FOSSIL', shape: 'fish', pal: { a: '#202830', b: '#7a8ca0', c: '#ffd040', w: '#ffffff', d: '#4a5a6c', e: '#b0a080', r: '#ff3030' } },
    { name: 'DUAL SHEARS', shape: 'crab', pal: { a: '#301010', b: '#c04830', c: '#ffff60', w: '#ffffff', d: '#802818', e: '#e09060', r: '#ff40c0' } },
    { name: 'OCTOPUS', shape: 'squid', pal: { a: '#200c30', b: '#9050c0', c: '#40ff80', w: '#ffffff', d: '#603090', e: '#c080f0', r: '#ff4040' } },
    { name: 'FATTY GLUTTON', shape: 'fish', pal: { a: '#302008', b: '#c09030', c: '#40c0ff', w: '#ffffff', d: '#806018', e: '#f0d080', r: '#ff3060' } },
    { name: 'STRONG SHELL', shape: 'crab', pal: { a: '#082010', b: '#40a060', c: '#ff8040', w: '#ffffff', d: '#206838', e: '#a0e0a0', r: '#ff3030' } },
    { name: 'ELECTRIC FAN', shape: 'squid', pal: { a: '#081828', b: '#3080c0', c: '#ffff40', w: '#ffffff', d: '#185080', e: '#80d0ff', r: '#ff6020' } }
  ];
  const FINAL = { name: 'GREAT THING', shape: 'whale', pal: { a: '#101828', b: '#405880', c: '#ff4040', w: '#ffffff', d: '#283a5a', e: '#8098c0', r: '#ff2050' } };
  function bossSprite(bd) {
    if (!bd.img) {
      const rows = BSHAPES[bd.shape];
      bd.img = spr(rows, bd.pal);
      bd.wimg = spr(rows.map(r => r.replace(/[^.]/g, 'x')), { x: '#ffffff' });
      let x0 = 99, y0 = 99, x1 = 0, y1 = 0;
      rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) if (r[i] === 'r') { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
      bd.weak = { x0, y0, x1: x1 + 1, y1: y1 + 1 };
      bd.w = Math.max.apply(null, rows.map(r => r.length)); bd.h = rows.length;
    }
    return bd;
  }
  const ORBC = { R: '#ff3030', G: '#30e040', B: '#3080ff', S: '#ffffff' };
  function vn(x, seed) { const i = Math.floor(x), f = x - i, a = hash(i * 131 + seed * 7919), b = hash((i + 1) * 131 + seed * 7919), s = f * f * (3 - 2 * f); return a + (b - a) * s; }

  ArcadeRegistry.register({
    id: 'darius', title: 'Darius', year: 1986, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: missile + bomb (hold) \u00b7 X: missile only \u00b7 Enter: start',
    marquee: { bg: '#000818', fg: '#40c0ff', accent: '#ff3040' },
    create(api) {
      const au = api.audio, R = Math.random;
      let hi = api.getHiScore(100000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null, attractX = 0;
      const stars = [];
      for (let i = 0; i < 70; i++) stars.push({ x: R() * W, y: TOP + R() * (BOT - TOP), z: 0.2 + R() * 0.8 });
      const SFX = {
        missile() { au.tone(900, 0.05, { type: 'square', vol: 0.04, slideTo: 500 }); },
        laser() { au.tone(1800, 0.06, { type: 'sawtooth', vol: 0.03, slideTo: 1200 }); },
        wave() { au.tone(400, 0.09, { type: 'sine', vol: 0.06, slideTo: 900 }); },
        bomb() { au.tone(300, 0.08, { type: 'triangle', vol: 0.05, slideTo: 150 }); },
        boomS() { au.noise(0.2, { vol: 0.12, freq: 1800, slideTo: 200 }); },
        boomM() { au.noise(0.45, { vol: 0.18, freq: 1200, slideTo: 90 }); },
        boomL() { au.noise(1.2, { vol: 0.25, freq: 800, slideTo: 40 }); au.tone(80, 1, { type: 'sawtooth', vol: 0.12, slideTo: 25 }); },
        tink() { au.tone(2400, 0.02, { type: 'square', vol: 0.025 }); },
        orb() { au.melody([[660, 0.05], [990, 0.05], [1320, 0.1]], { type: 'square', vol: 0.1 }); },
        up() { au.melody([[523, 0.06], [784, 0.06], [1047, 0.06], [1568, 0.15]], { type: 'square', vol: 0.11 }); },
        arm() { au.tone(200, 0.15, { type: 'sine', vol: 0.15, slideTo: 800 }); },
        armHit() { au.tone(1200, 0.12, { type: 'square', vol: 0.1, slideTo: 300 }); },
        die() { au.noise(1.1, { vol: 0.25, freq: 2500, slideTo: 60 }); au.tone(500, 1, { type: 'sawtooth', vol: 0.1, slideTo: 30 }); },
        siren() { au.tone(600, 0.35, { type: 'sawtooth', vol: 0.09, slideTo: 900 }); au.tone(900, 0.35, { type: 'sawtooth', vol: 0.09, slideTo: 600, delay: 0.38 }); },
        extend() { au.melody([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.25]], { type: 'triangle', vol: 0.18 }); },
        start() { au.melody([[262, 0.12], [392, 0.12], [523, 0.12], [494, 0.12], [392, 0.12], [523, 0.35]], { type: 'square', vol: 0.12 }); },
        buzz() { au.tone(98, 0.28, { type: 'square', vol: 0.14 }); },
        clear() { au.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.2], [659, 0.1], [784, 0.4]], { type: 'triangle', vol: 0.16 }); }
      };
      const BASS = [98, 0, 98, 147, 0, 131, 0, 117, 98, 0, 98, 175, 0, 156, 147, 0];
      function tryStart() { if (api.useCredit()) return true; coinFlash = 90; SFX.buzz(); return false; }

      // ---------- zones & terrain ----------
      function zoneIdx(row, col) { return ROWST[row] + col; }
      function zoneLetter(row, col) { return LETTERS[zoneIdx(row, col)]; }
      function zseed() { return g ? zoneIdx(g.row, g.col) + g.loop * 31 : 3; }
      function zhue(zi) { return (zi * 53 + 190) % 360; }
      function amp() { return g ? g.amp : 0.6; }
      function topAt(wx) { return TOP + 3 + amp() * 46 * vn(wx / 64, zseed()); }
      function botAt(wx) { return BOT - 3 - amp() * 46 * vn(wx / 64, zseed() + 17); }
      function islandH(wx) { if (!g || !g.island) return 0; return clamp((wx - g.island.wx0) * 0.3, 0, 22); }
      const MID = (TOP + BOT) / 2;

      function newGame() {
        g = {
          score: 0, lives: 2, nextExtra: 100000, row: 0, col: 0, loop: 0, path: [[0, 0]],
          p: { x: 50, y: MID, alive: true, t: 0, inv: 120, ml: 0, mc: 0, bl: 0, bc: 0, arm: 0, armF: 0, fireT: 0 },
          en: [], eb: [], pb: [], orbs: [], booms: [], sparks: [], pops: [],
          sx: 0, spd: 0.7, amp: 0.6, phase: 'intro', phaseT: 170, playT: 0, waveT: 120, gndT: 240,
          boss: null, island: null, choice: null, beat: 0, dark: 0
        };
        setZoneAmp();
      }
      function setZoneAmp() { const zi = zoneIdx(g.row, g.col); g.ampT = [0.65, 1, 0.3][zi % 3]; g.amp = g.ampT; }
      function dif() { return g.row + g.loop * 3; }
      function bspd() { return Math.min(3.2, 1.4 + dif() * 0.14); }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 100000 ? 200000 : 300000; SFX.extend(); }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, s) {
        g.booms.push({ x, y, t: 0, s: s || 1 });
        for (let i = 0; i < 4 * (s || 1); i++) { const a = R() * 6.283, v = 0.4 + R() * 1.8 * (s || 1); g.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 16 + R() * 18 }); }
      }
      function shoot(x, y, a, s, k) { g.eb.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, k: k || 0 }); }
      function aim(x, y) { return Math.atan2(g.p.y - y, g.p.x - x); }
      function canFire(e) { return g.p.alive && e.x < W - 4 && e.x > 4 && Math.hypot(g.p.x - e.x, g.p.y - e.y) > 40; }
      function addE(o) { o.t = 0; o.flash = 0; o.dead = false; o.delay = o.delay || 0; g.en.push(o); return o; }

      function spawnWave() {
        const D = dif(), r = R();
        const orb = R() < 0.45 ? pick(['R', 'R', 'G', 'G', 'B']) : null;
        if (r < 0.4) {
          const n = 6, y0 = 50 + R() * (H - 100), ph = R() * 6, grp = { n, k: 0, orb };
          for (let i = 0; i < n; i++) addE({ k: 'fish', x: W + 12, y: y0, y0, ph, vx: -(1.5 + D * 0.08), hp: 1, r: 5, sc: 100, delay: i * 14, grp, orbC: orb && i === n - 1 ? orb : null });
        } else if (r < 0.58) {
          for (let i = 0; i < 3; i++) addE({ k: 'spin', x: W + 10, y: 40 + R() * (H - 80), vx: -1.1, vy: 0, hp: 2, r: 6, sc: 200, delay: i * 30, orbC: orb && i === 2 ? orb : null });
        } else if (r < 0.75) {
          addE({ k: 'shooter', x: W + 14, y: 40 + R() * (H - 80), vx: -1.4, vy: 0, hp: 3 + D * 0.5, r: 8, sc: 300, stopX: W - 50 - R() * 60, shots: 0, ft: 30, orbC: orb });
        } else if (r < 0.88) {
          for (let i = 0; i < 2 + (D > 2 ? 1 : 0); i++) addE({ k: 'mine', x: W + 10 + i * 30, y: 40 + R() * (H - 80), vx: -0.6, hp: 4, r: 7, sc: 300, ph: R() * 6 });
        } else if (D >= 1) {
          const y = g.p.y;
          for (let i = 0; i < 3; i++) addE({ k: 'rush', x: -14, y: clamp(y + (i - 1) * 18, 30, H - 30), vx: 0, hp: 1, r: 6, sc: 200, delay: 40 + i * 6, warnT: 40 });
        } else {
          const grp = { n: 5, k: 0, orb: 'R' };
          for (let i = 0; i < 5; i++) addE({ k: 'fish', x: W + 12, y: MID, y0: MID, ph: i, vx: -1.5, hp: 1, r: 5, sc: 100, delay: i * 12, grp, orbC: i === 4 ? 'R' : null, amp: 50 });
        }
      }
      function spawnGround() {
        const wx = g.sx + W + 12, ceil = R() < 0.4;
        if (R() < 0.75) addE({ k: 'turret', wx, ceil, x: W + 12, y: 0, hp: 3 + dif() * 0.4, r: 7, sc: 500, ground: true, ft: 60 + R() * 60, a: Math.PI });
        else addE({ k: 'hatch', wx, ceil, x: W + 12, y: 0, hp: 6 + dif(), r: 8, sc: 800, ground: true, ft: 50 });
      }
      function spawnBoss() {
        const bd = bossSprite(g.row >= 6 ? FINAL : BOSSES[(g.row + g.col) % BOSSES.length]);
        const S = 3, bw = bd.w * S, bh = bd.h * S;
        const hp = 130 + dif() * 35 + (bd === FINAL ? 120 : 0);
        g.boss = { bd, S, bw, bh, x: W + 10, y: MID - bh / 2, t: 0, hp, maxhp: hp, flash: 0, dead: false, deadT: 0, pat: 0, patT: 0, lunge: 0, homeX: W - bw - 12, sa: 0 };
      }
      function dropOrb(c, x, y) { g.orbs.push({ c, x, y, t: 0 }); }
      function kill(e) {
        if (e.dead) return;
        e.dead = true; addScore(e.sc); boom(e.x, e.y, e.k === 'hatch' ? 2 : 1); SFX.boomS();
        if (e.orbC) dropOrb(e.orbC, e.x, e.y);
        if (e.grp) { e.grp.k++; if (e.grp.k >= e.grp.n && !e.orbC) { addScore(1000); g.pops.push({ x: e.x, y: e.y, t: 50, s: '1000' }); } }
        if (e.k === 'mine' && dif() >= 2) for (let i = 0; i < 8; i++) shoot(e.x, e.y, i * Math.PI / 4, bspd() * 0.7, 1);
        if (e.k === 'hatch' && R() < 0.3) dropOrb('S', e.x, e.y);
      }
      function hurt(e, d) {
        if (e.dead || e.delay > 0 || e.x > W) return;
        e.hp -= d; e.flash = 3; if (e.hp <= 0) kill(e);
      }
      function hurtBoss(B, d, x, y) {
        if (B.dead || B.x > W - 30) return false;
        const w = B.bd.weak, S = B.S;
        const lx = (x - B.x) / S, ly = (y - B.y) / S;
        const inWeak = lx >= w.x0 - 1.5 && lx <= w.x1 + 1.5 && ly >= w.y0 - 1.5 && ly <= w.y1 + 1.5;
        B.hp -= inWeak ? d : d * 0.12; B.flash = 3;
        if (!inWeak && (frame & 3) === 0) SFX.tink();
        if (B.hp <= 0) { B.dead = true; B.deadT = 0; g.eb = []; addScore(B.bd === FINAL ? 100000 : 30000 + dif() * 10000); SFX.boomL(); }
        return true;
      }
      function inBoss(B, x, y, shrink) {
        if (!B || B.dead) return false;
        return x > B.x + B.bw * shrink && x < B.x + B.bw * (1 - shrink) && y > B.y + B.bh * shrink && y < B.y + B.bh * (1 - shrink);
      }

      function respawn() {
        const p = g.p;
        p.x = 50; p.y = MID; p.alive = true; p.inv = 150; p.t = 0;
        p.ml = Math.max(0, p.ml - 1); p.bl = Math.max(0, p.bl - 1); p.mc = 0; p.bc = 0; p.arm = 0;
        if (g.island && g.choice) p.y = g.choice === 'up' ? MID - 50 : MID + 50;
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 330; g.p.alive = false;
        au.melody([[330, 0.3], [311, 0.3], [294, 0.3], [262, 0.7]], { type: 'triangle', vol: 0.15 });
      }
      function lastLife() {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 2; g.score = 0; g.nextExtra = 100000; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function hitPlayer() {
        const p = g.p;
        if (!p.alive || p.inv > 0) return;
        if (p.arm > 0) { p.arm--; p.armF = 20; p.inv = 40; SFX.armHit(); return; }
        p.alive = false; p.t = 0; boom(p.x, p.y, 3); SFX.die();
      }
      function fire(bombs) {
        const p = g.p;
        if (p.fireT > 0) return;
        const ml = p.ml;
        const mCount = g.pb.filter(s => s.k !== 'b').length;
        if (ml < 2) {
          if (mCount < (ml ? 6 : 3)) {
            const ys = ml ? [-3, 3] : [0];
            for (const o of ys) g.pb.push({ x: p.x + 12, y: p.y + o, vx: 6, vy: 0, w: 8, h: 3, dmg: 1, k: 'm' });
            SFX.missile(); p.fireT = 7;
          }
        } else if (ml < 4) {
          if (mCount < 8) {
            const ys = ml === 3 ? [-4, 4] : [0];
            for (const o of ys) g.pb.push({ x: p.x + 16, y: p.y + o, vx: 9, vy: 0, w: 22, h: 2, dmg: 0.9, k: 'l', pierce: true });
            SFX.laser(); p.fireT = 6;
          }
        } else {
          if (mCount < 6) {
            g.pb.push({ x: p.x + 14, y: p.y, vx: 6.5, vy: 0, w: 6, h: ml === 5 ? 34 : 22, dmg: ml === 5 ? 1.6 : 1.2, k: 'w', pierce: true, hitset: new Set() });
            SFX.wave(); p.fireT = 8;
          }
        }
        if (bombs) {
          const bl = p.bl, bCount = g.pb.filter(s => s.k === 'b').length;
          const dirs = bl === 0 ? [1] : bl === 3 ? [1, -1, 1.6, -1.6] : [1, -1];
          if (bCount < dirs.length) {
            for (const d of dirs) g.pb.push({ x: p.x + 4 + (Math.abs(d) > 1 ? 6 : 0), y: p.y + Math.sign(d) * 4, vx: bl >= 2 ? 2.8 : 2.2, vy: d * 0.4, ay: Math.sign(d) * (bl >= 2 ? 0.16 : 0.12), w: 5, h: 5, dmg: bl >= 2 ? 2.5 : 2, k: 'b' });
            SFX.bomb();
          }
        }
      }
      function updPlayer() {
        const p = g.p;
        if (!p.alive) {
          if (g.phase === 'over') return;
          if (++p.t === 100) { if (g.lives > 0) { g.lives--; respawn(); } else lastLife(); }
          return;
        }
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        const sp = 1.9 * (dx && dy ? 0.7071 : 1);
        p.x = clamp(p.x + dx * sp, 12, W - 14); p.y = p.y + dy * sp;
        // terrain keeps the hawk inside the cave
        const wx = g.sx + p.x;
        const tp = Math.max(topAt(wx - 8), topAt(wx + 8)) + 6, bt = Math.min(botAt(wx - 8), botAt(wx + 8)) - 6;
        p.y = clamp(p.y, tp, bt);
        const ih = Math.max(islandH(wx - 10), islandH(wx + 12));
        if (ih > 0) {
          if (!g.choice) { g.choice = p.y < MID ? 'up' : 'down'; SFX.orb(); }
          if (g.choice === 'up') p.y = Math.min(p.y, MID - ih - 7); else p.y = Math.max(p.y, MID + ih + 7);
        }
        if (p.inv > 0) p.inv--; if (p.armF > 0) p.armF--;
        if (p.fireT > 0) p.fireT--;
        if (g.phase !== 'map' && g.phase !== 'ending') {
          if (api.key('Space')) fire(true); else if (api.key('KeyX')) fire(false);
        }
        for (const o of g.orbs) {
          if (o.got || Math.abs(o.x - p.x) > 12 || Math.abs(o.y - p.y) > 11) continue;
          o.got = true; addScore(500);
          if (o.c === 'R') { if (p.ml >= 5) addScore(5000); else if (++p.mc >= 3) { p.mc = 0; p.ml++; SFX.up(); g.pops.push({ x: o.x, y: o.y, t: 60, s: ['MISSILE', 'TWIN MISSILE', 'LASER', 'TWIN LASER', 'WAVE', 'BIG WAVE'][p.ml] }); continue; } SFX.orb(); }
          else if (o.c === 'G') { if (p.bl >= 3) addScore(5000); else if (++p.bc >= 3) { p.bc = 0; p.bl++; SFX.up(); g.pops.push({ x: o.x, y: o.y, t: 60, s: ['BOMB', 'TWIN BOMB', 'POWER BOMB', 'MULTI BOMB'][p.bl] }); continue; } SFX.orb(); }
          else if (o.c === 'B') { p.arm = Math.min(9, p.arm + 3); SFX.arm(); g.pops.push({ x: o.x, y: o.y, t: 50, s: 'ARM' }); }
          else { for (const e of g.en) if (!e.dead && e.x < W && e.delay <= 0) kill(e); g.eb = []; SFX.boomL(); g.dark = 20; }
        }
        for (const b of g.eb) if (Math.abs(b.x - p.x) < (b.k ? 5 : 4) && Math.abs(b.y - p.y) < (b.k ? 4 : 3)) { b.gone = true; hitPlayer(); break; }
        if (p.alive) for (const e of g.en) {
          if (e.dead || e.delay > 0 || e.ground) continue;
          if (Math.abs(e.x - p.x) < e.r + 6 && Math.abs(e.y - p.y) < e.r + 3) { hitPlayer(); if (e.k !== 'mine') hurt(e, 3); break; }
        }
        if (p.alive && inBoss(g.boss, p.x, p.y, 0.14)) hitPlayer();
      }
      function updShots() {
        const B = g.boss;
        for (const s of g.pb) {
          s.x += s.vx; s.y += s.vy;
          if (s.k === 'b') { s.vy += s.ay; s.vy = clamp(s.vy, -3.5, 3.5); }
          if (s.x > W + 20 || s.y < TOP - 10 || s.y > BOT + 10) { s.gone = true; continue; }
          const wx = g.sx + s.x;
          if (s.k !== 'w' && (s.y < topAt(wx) || s.y > botAt(wx) || (islandH(wx) > 0 && Math.abs(s.y - MID) < islandH(wx)))) {
            s.gone = true; if (s.k === 'b') { boom(s.x, s.y, 1); blast(s.x, s.y, 14); } continue;
          }
          for (const e of g.en) {
            if (e.dead || e.delay > 0) continue;
            if (Math.abs(e.x - s.x) < e.r + s.w / 2 && Math.abs(e.y - s.y) < e.r + s.h / 2) {
              if (s.k === 'w') { if (s.hitset.has(e)) continue; s.hitset.add(e); }
              hurt(e, s.dmg);
              if (s.k === 'b') { boom(s.x, s.y, 1); blast(s.x, s.y, 12); }
              if (!s.pierce || e.hp > 0) { s.gone = true; break; }
            }
          }
          if (!s.gone && B && !B.dead && inBoss(B, s.x + s.w / 2, s.y, 0.05)) {
            if (s.k === 'w') { if (!s.hitB || frame - s.hitB > 6) { s.hitB = frame; hurtBoss(B, s.dmg * 0.8, s.x + s.w / 2, s.y); } }
            else { hurtBoss(B, s.dmg, s.x + s.w / 2, s.y); s.gone = true; g.sparks.push({ x: s.x + s.w / 2, y: s.y, vx: -1, vy: 0, t: 5, hit: 1 }); }
          }
        }
        g.pb = g.pb.filter(s => !s.gone);
      }
      function blast(x, y, r) { for (const e of g.en) if (!e.dead && e.delay <= 0 && Math.hypot(e.x - x, e.y - y) < r + e.r) hurt(e, 1); }
      function updEnemies() {
        const D = dif(), bs = bspd(), p = g.p;
        for (const e of g.en) {
          if (e.dead) continue;
          if (e.delay > 0) { e.delay--; continue; }
          e.t++; if (e.flash > 0) e.flash--;
          switch (e.k) {
            case 'fish':
              e.x += e.vx; e.y = e.y0 + Math.sin(e.t * 0.06 + e.ph) * (e.amp || 28);
              if (e.t === 60 && canFire(e) && R() < 0.25 + D * 0.08) shoot(e.x, e.y, aim(e.x, e.y), bs);
              break;
            case 'spin': {
              const a = aim(e.x, e.y);
              e.vy += Math.sin(a) * 0.04; e.vy = clamp(e.vy, -1.2, 1.2);
              e.x += e.vx; e.y += e.vy;
              break;
            }
            case 'shooter':
              if (e.x > e.stopX || e.shots >= 3) e.x += e.shots >= 3 ? -2.2 : e.vx;
              else if (--e.ft <= 0) { e.ft = 35; e.shots++; if (canFire(e)) { const a = aim(e.x, e.y); for (let i = -1; i <= 1; i++) shoot(e.x - 6, e.y, a + i * 0.2, bs); } }
              e.y += (p.y - e.y) * 0.01;
              break;
            case 'mine':
              e.x += e.vx; e.y += Math.sin(e.t * 0.04 + e.ph) * 0.5;
              break;
            case 'rush':
              if (e.warnT > 0) { e.warnT--; e.x = -14; break; }
              e.x += 4.2;
              break;
            case 'turret': case 'hatch': {
              e.x = e.wx - g.sx;
              e.y = e.ceil ? topAt(e.wx) + 4 : botAt(e.wx) - 4;
              if (e.k === 'turret') {
                e.a = aim(e.x, e.y);
                if (--e.ft <= 0) { e.ft = Math.max(60, 120 - D * 8) + R() * 40; if (canFire(e) && e.x > 30) shoot(e.x, e.y, e.a, bs * 0.9); }
              } else if (--e.ft <= 0 && e.x < W - 10 && e.x > 40) {
                e.ft = 90; addE({ k: 'fish', x: e.x, y: e.y, y0: e.y + (e.ceil ? 40 : -40), ph: e.ceil ? -1.5 : 1.5, vx: -1.3, hp: 1, r: 5, sc: 100, amp: 20 });
              }
              break;
            }
          }
          if (e.x < -30 && e.k !== 'rush' || e.x > W + 40 || e.y < -30 || e.y > H + 30) e.dead = true;
        }
        g.en = g.en.filter(e => !e.dead);
      }
      function updBoss() {
        const B = g.boss; if (!B) return;
        const D = dif(), bs = bspd(), p = g.p, bd = B.bd, S = B.S;
        B.t++; if (B.flash > 0) B.flash--;
        if (B.dead) {
          B.deadT++;
          if (B.deadT % 5 === 0) { boom(B.x + R() * B.bw, B.y + R() * B.bh, 1 + R() * 2); if (B.deadT % 15 === 0) SFX.boomM(); }
          B.y += 0.3;
          if (B.deadT >= 150) { boom(B.x + B.bw / 2, B.y + B.bh / 2, 5); g.boss = null; startBranch(); }
          return;
        }
        const wx = B.x + bd.weak.x0 * S, wy = B.y + (bd.weak.y0 + bd.weak.y1) / 2 * S;
        // movement
        if (B.x > B.homeX && !B.lunge) B.x -= 1;
        else {
          B.patT++;
          const ty = clamp(p.y - B.bh / 2, TOP + 4, BOT - B.bh - 4);
          if (!B.lunge) B.y += clamp(ty - B.y, -0.6 - D * 0.05, 0.6 + D * 0.05);
          if (!B.lunge && B.patT % 600 === 599) { B.lunge = 3; B.lt = 50; }
          if (B.lunge === 3) { B.flash = (frame & 4) ? 2 : 0; if (--B.lt <= 0) B.lunge = 1; }
          if (B.lunge === 1) { B.x -= 2.4 + D * 0.1; if (B.x < 20) B.lunge = 2; }
          else if (B.lunge === 2) { B.x += 1.6; if (B.x >= B.homeX) { B.x = B.homeX; B.lunge = 0; } }
        }
        if ((B.x > B.homeX && !B.lunge) || !p.alive) return;
        const pt = B.patT % 300, shape = bd.shape;
        const rate = Math.max(0.6, 1 - D * 0.06);
        if (shape === 'fish') {
          if (pt % Math.round(50 * rate) === 0) { const a = aim(wx, wy); for (let i = -2; i <= 2; i++) shoot(wx, wy, a + i * 0.2, bs); }
          if (pt === 150) for (let i = 0; i < 4; i++) addE({ k: 'fish', x: B.x + B.bw / 2, y: B.y + B.bh / 2, y0: B.y + B.bh / 2 + (i - 1.5) * 20, ph: i, vx: -2, hp: 1, r: 5, sc: 100, amp: 14 });
        } else if (shape === 'crab') {
          if (pt % Math.round(36 * rate) === 0) { for (const cy of [B.y + 2 * S, B.y + 13 * S]) shoot(B.x + 2 * S, cy, aim(B.x, cy), bs * 1.1, 1); }
          if (pt > 160 && pt < 240 && pt % 6 === 0) { B.sa += 0.4; shoot(wx, wy, Math.PI + Math.sin(B.sa) * 0.9, bs * 0.9); }
        } else if (shape === 'squid') {
          if (pt % Math.round(70 * rate) === 0) { const n = 14 + Math.min(8, D * 2); for (let i = 0; i < n; i++) shoot(wx, wy, i * 6.283 / n + pt, bs * 0.75, 1); }
          if (pt > 100 && pt < 200 && pt % 4 === 0) { B.sa += 0.35; shoot(B.x + 8 * S, B.y + B.bh - 4, B.sa, bs * 0.8); }
        } else {
          if (pt % Math.round(40 * rate) === 0) { const a = aim(wx, wy); for (let i = -3; i <= 3; i++) shoot(wx, wy, a + i * 0.16, bs); }
          if (pt % Math.round(90 * rate) === 45) { for (let i = 0; i < 20; i++) shoot(B.x + B.bw / 2, B.y + 4, i * Math.PI / 10, bs * 0.7, 1); }
          if (pt === 200) for (let i = 0; i < 6; i++) addE({ k: 'fish', x: B.x + B.bw * 0.6, y: B.y + B.bh, y0: B.y + B.bh / 2 + (i - 2.5) * 18, ph: i, vx: -2.2, hp: 1, r: 5, sc: 100, amp: 10 });
        }
      }
      function startBranch() {
        SFX.clear();
        if (g.row >= 6) { g.phase = 'ending'; g.phaseT = 420; return; }
        g.phase = 'branch'; g.phaseT = 0; g.choice = null;
        g.island = { wx0: g.sx + W + 30 };
      }
      function branchTargets() {
        const r = g.row, c = g.col;
        if (r < 5) return [[r + 1, c], [r + 1, c + 1]];
        return [[6, Math.max(0, c - 1)], [6, Math.min(4, c)]];
      }
      function enterZone(row, col) {
        g.row = row; g.col = col; g.path.push([row, col]);
        g.phase = 'map'; g.phaseT = 200; g.island = null; g.choice = null;
        g.en = []; g.eb = []; g.orbs = [];
      }
      function updMisc() {
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < 26 + b.s * 6);
        for (const s of g.sparks) { s.x += s.vx - (s.hit ? 0 : 0.3); s.y += s.vy; s.vx *= 0.95; s.vy *= 0.95; s.t--; }
        g.sparks = g.sparks.filter(s => s.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
        for (const o of g.orbs) { o.t++; o.x -= 0.5; o.y += Math.sin(o.t * 0.08) * 0.3; }
        g.orbs = g.orbs.filter(o => !o.got && o.x > -10);
        for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
        g.eb = g.eb.filter(b => !b.gone && b.x > -8 && b.x < W + 8 && b.y > TOP - 8 && b.y < H + 8);
        if (g.dark > 0) g.dark--;
      }

      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        for (const s of stars) { s.x -= s.z * (g ? g.spd : 0.7) * 0.6; if (s.x < 0) { s.x += W; s.y = TOP + R() * (BOT - TOP); } }
        if (mode === 'title') {
          titleT++; attractX += 0.7;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); SFX.start(); }
          return;
        }
        updMisc();
        if (g.phase === 'over') {
          if (--g.phaseT <= 0 || (g.phaseT < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase === 'map') {
          if (--g.phaseT <= 0) { g.phase = 'intro'; g.phaseT = 150; g.playT = 0; g.waveT = 100; g.gndT = 200; g.spd = 0.7; g.sx = 0; setZoneAmp(); }
          return;
        }
        g.amp += (g.ampT - g.amp) * 0.01;
        g.sx += g.spd;
        updPlayer(); if (g.phase === 'over') return;
        updShots(); updEnemies();
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; }
        else if (g.phase === 'play') {
          g.playT++;
          const D = dif();
          if (--g.waveT <= 0) { spawnWave(); g.waveT = Math.max(55, 120 - D * 8) + R() * 50; }
          if (g.amp > 0.4 && --g.gndT <= 0) { spawnGround(); g.gndT = Math.max(70, 150 - D * 8) + R() * 90; }
          if (g.playT >= ZLEN) { g.phase = 'warn'; g.phaseT = 300; g.ampT = 0.22; }
        } else if (g.phase === 'warn') {
          if (g.phaseT % 60 === 0) SFX.siren();
          if (--g.phaseT <= 0) { spawnBoss(); g.phase = 'boss'; }
        } else if (g.phase === 'boss') updBoss();
        else if (g.phase === 'branch') {
          g.phaseT++;
          g.spd = Math.min(2.2, g.spd + 0.02);
          if (!g.choice && g.sx + 50 > g.island.wx0 + 20) g.choice = g.p.y < MID ? 'up' : 'down';
          if (g.choice && g.phaseT > 60 && g.sx + g.p.x > g.island.wx0 + 260) {
            const t = branchTargets()[g.choice === 'up' ? 0 : 1];
            enterZone(t[0], t[1]);
          }
        } else if (g.phase === 'ending') {
          if (--g.phaseT <= 0) { g.loop++; g.row = 0; g.col = 0; g.path = [[0, 0]]; addScore(500000); g.phase = 'map'; g.phaseT = 200; g.en = []; g.eb = []; }
        }
        if ((g.phase === 'play' || g.phase === 'boss' || g.phase === 'warn') && frame % 11 === 0) {
          const n = BASS[g.beat++ % BASS.length];
          if (n) au.tone(n * (g.phase === 'boss' ? 1.19 : 1), 0.16, { type: 'triangle', vol: 0.07 });
        }
      }

      // ---------- rendering ----------
      function drawTerrain(ctx, sx, zi, withIsland) {
        const h = zhue(zi);
        const c1 = 'hsl(' + h + ',35%,22%)', c2 = 'hsl(' + h + ',45%,38%)', c3 = 'hsl(' + h + ',55%,58%)', c0 = 'hsl(' + h + ',30%,14%)';
        for (let x = 0; x < W; x += 2) {
          const wx = sx + x, t = Math.round(topAt(wx)), b = Math.round(botAt(wx));
          const stripe = (Math.floor((wx) / 6) & 1);
          ctx.fillStyle = stripe ? c1 : c0; ctx.fillRect(x, TOP, 2, t - TOP); ctx.fillRect(x, b, 2, BOT - b);
          ctx.fillStyle = c2; ctx.fillRect(x, t - 4, 2, 3); ctx.fillRect(x, b + 1, 2, 3);
          ctx.fillStyle = c3; ctx.fillRect(x, t - 1, 2, 1); ctx.fillRect(x, b, 2, 1);
          if (hash(Math.floor(wx / 2) * 17 + zi) > 0.93) { ctx.fillStyle = c2; ctx.fillRect(x, t - 10, 2, 3); ctx.fillRect(x, b + 7, 2, 3); }
          if (withIsland) {
            const ih = Math.round(islandH(wx));
            if (ih > 0) { ctx.fillStyle = stripe ? c1 : c0; ctx.fillRect(x, MID - ih, 2, ih * 2); ctx.fillStyle = c3; ctx.fillRect(x, MID - ih, 2, 1); ctx.fillRect(x, MID + ih - 1, 2, 1); }
          }
        }
      }
      function drawBg(ctx, zi) {
        const h = (zhue(zi) + 160) % 360;
        ctx.fillStyle = 'hsl(' + h + ',60%,5%)'; ctx.fillRect(0, TOP, W, BOT - TOP);
        ctx.fillStyle = 'hsl(' + h + ',50%,10%)';
        for (let i = 0; i < 6; i++) { const y = TOP + 20 + i * 30, o = ((frame * 0.2 + i * 40) % 80) | 0; for (let x = -o; x < W; x += 80) ctx.fillRect(x, y + Math.sin((x + frame) * 0.02) * 3, 40, 2); }
        for (const s of stars) { ctx.fillStyle = s.z > 0.7 ? '#c0e0ff' : s.z > 0.4 ? '#6080a0' : '#304060'; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.z > 0.7 ? 2 : 1, 1); }
      }
      function drawFish(ctx, e, col) {
        const x = Math.round(e.x - 4), y = Math.round(e.y - 3);
        for (let r = 0; r < FISHLET.length; r++) for (let c = 0; c < 9; c++) {
          const ch = FISHLET[r][c]; if (ch === '.') continue;
          ctx.fillStyle = e.flash ? '#fff' : ch === 'a' ? '#203040' : ch === 'w' ? '#ffffff' : col;
          ctx.fillRect(x + c, y + r, 1, 1);
        }
      }
      function drawEnemy(ctx, e) {
        if (e.delay > 0) return;
        const x = Math.round(e.x), y = Math.round(e.y);
        const oc = e.orbC ? ((frame >> 2) & 1 ? ORBC[e.orbC] : '#ffffff') : null;
        switch (e.k) {
          case 'fish': drawFish(ctx, e, oc || '#e0a040'); break;
          case 'spin': {
            const a = frame * 0.2;
            ctx.fillStyle = '#202830'; ctx.fillRect(x - 6, y - 6, 12, 12);
            ctx.fillStyle = e.flash ? '#fff' : oc || '#a0b0c0'; ctx.fillRect(x - 5, y - 5, 10, 10);
            ctx.fillStyle = '#ff4040';
            for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x + Math.cos(a + i * 1.57) * 4) - 1, Math.round(y + Math.sin(a + i * 1.57) * 4) - 1, 2, 2);
            break;
          }
          case 'shooter':
            ctx.fillStyle = '#201828'; ctx.fillRect(x - 10, y - 5, 20, 10); ctx.fillRect(x - 4, y - 8, 12, 16);
            ctx.fillStyle = e.flash ? '#fff' : oc || '#b04080'; ctx.fillRect(x - 9, y - 4, 18, 8); ctx.fillRect(x - 3, y - 7, 10, 14);
            ctx.fillStyle = '#ffe060'; ctx.fillRect(x - 8, y - 1, 4, 2);
            ctx.fillStyle = '#ff8040'; ctx.fillRect(x + 9, y - 2, 2 + (frame & 1) * 2, 4);
            break;
          case 'mine':
            ctx.fillStyle = '#301008'; ctx.fillRect(x - 6, y - 4, 12, 8); ctx.fillRect(x - 4, y - 6, 8, 12);
            ctx.fillStyle = e.flash ? '#fff' : '#a04020'; ctx.fillRect(x - 5, y - 3, 10, 6); ctx.fillRect(x - 3, y - 5, 6, 10);
            ctx.fillStyle = (frame >> 3) & 1 ? '#ffff40' : '#ff4000'; ctx.fillRect(x - 1, y - 1, 2, 2);
            ctx.fillStyle = '#806050'; ctx.fillRect(x - 8, y, 2, 1); ctx.fillRect(x + 6, y, 2, 1); ctx.fillRect(x, y - 8, 1, 2); ctx.fillRect(x, y + 6, 1, 2);
            break;
          case 'rush':
            if (e.warnT > 0) { if ((frame >> 2) & 1) { ctx.fillStyle = '#ff3030'; ctx.fillRect(2, y - 1, 6, 3); ctx.fillRect(8, y - 3, 2, 7); } break; }
            ctx.fillStyle = '#103040'; ctx.fillRect(x - 8, y - 3, 16, 6);
            ctx.fillStyle = e.flash ? '#fff' : '#40c0d0'; ctx.fillRect(x - 7, y - 2, 14, 4); ctx.fillRect(x + 4, y - 1, 5, 2);
            ctx.fillStyle = '#ffa020'; ctx.fillRect(x - 10, y - 1, 3, 2);
            break;
          case 'turret': {
            const s = e.ceil ? -1 : 1;
            ctx.fillStyle = '#202020'; ctx.fillRect(x - 7, e.ceil ? y - 8 : y - 2, 14, 10);
            ctx.fillStyle = e.flash ? '#fff' : '#808890'; ctx.fillRect(x - 6, e.ceil ? y - 8 : y - 1, 12, 8);
            ctx.fillStyle = '#c0c8d0'; ctx.fillRect(x - 4, y - 3 * s - 1, 8, 3);
            ctx.fillStyle = '#202020';
            for (let i = 2; i < 10; i++) ctx.fillRect(Math.round(x + Math.cos(e.a) * i) - 1, Math.round(y - 2 * s + Math.sin(e.a) * i) - 1, 2, 2);
            break;
          }
          case 'hatch':
            ctx.fillStyle = '#181818'; ctx.fillRect(x - 10, e.ceil ? y - 8 : y - 4, 20, 12);
            ctx.fillStyle = e.flash ? '#fff' : '#606a40'; ctx.fillRect(x - 9, e.ceil ? y - 8 : y - 3, 18, 10);
            ctx.fillStyle = (frame >> 4) & 1 ? '#ff6020' : '#802000'; ctx.fillRect(x - 5, e.ceil ? y - 3 : y - 1, 10, 3);
            break;
        }
      }
      function drawBoss(ctx, B) {
        const bd = B.bd, x = Math.round(B.x), y = Math.round(B.y);
        ctx.drawImage(bd.img, x, y, B.bw, B.bh);
        if (B.flash > 0 || (B.dead && (frame & 4))) { ctx.globalAlpha = 0.6; ctx.drawImage(bd.wimg, x, y, B.bw, B.bh); ctx.globalAlpha = 1; }
        const w = bd.weak, S = B.S;
        if (!B.dead && (frame >> 3) & 1) { ctx.fillStyle = '#ffff80'; ctx.fillRect(x + w.x0 * S + S, y + w.y0 * S + S, Math.max(S, (w.x1 - w.x0 - 2) * S), Math.max(S, (w.y1 - w.y0 - 2) * S)); }
      }
      function drawHawk(ctx, p) {
        if (!p.alive || (p.inv > 0 && p.armF <= 0 && (frame & 2))) return;
        const x = Math.round(p.x - 12), y = Math.round(p.y - 5);
        ctx.drawImage(HAWK, x, y);
        ctx.fillStyle = (frame & 2) ? '#ffe040' : '#ff6020'; ctx.fillRect(x - 3 - (frame & 1), y + 5, 3 + (frame & 1), 2);
        if (p.arm > 0) {
          const col = p.armF > 0 && (frame & 2) ? '#ffffff' : p.arm > 6 ? '#40a0ff' : p.arm > 3 ? '#ffc030' : '#c0c8d0';
          ctx.strokeStyle = col; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 17, 10, 0, 0, Math.PI * 2); ctx.stroke();
          if (p.arm > 3) { ctx.beginPath(); ctx.ellipse(p.x, p.y, 15, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
        }
      }
      function drawShots(ctx) {
        for (const s of g.pb) {
          const x = Math.round(s.x), y = Math.round(s.y);
          if (s.k === 'm') { ctx.fillStyle = '#d0d8e0'; ctx.fillRect(x - 4, y - 1, 7, 3); ctx.fillStyle = '#ff6030'; ctx.fillRect(x + 3, y - 1, 2, 3); ctx.fillStyle = '#ffc040'; ctx.fillRect(x - 6, y, 2, 1); }
          else if (s.k === 'l') { ctx.fillStyle = '#40ffff'; ctx.fillRect(x - 11, y - 1, 22, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 9, y - 1, 18, 1); }
          else if (s.k === 'w') {
            const hh = s.h / 2;
            ctx.fillStyle = '#4060ff'; for (let i = -hh; i < hh; i++) { const bend = Math.round((i * i) / (hh * hh) * -4); ctx.fillRect(x + bend - 1, y + i, 3, 1); }
            ctx.fillStyle = '#c0d0ff'; for (let i = -hh + 2; i < hh - 2; i++) { const bend = Math.round((i * i) / (hh * hh) * -4); ctx.fillRect(x + bend, y + i, 1, 1); }
          } else { ctx.fillStyle = '#30d040'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = '#c0ffc0'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        }
      }
      function drawOrb(ctx, o) {
        const x = Math.round(o.x), y = Math.round(o.y), c = ORBC[o.c];
        disc(ctx, x, y, 6 + ((frame >> 3) & 1), '#000');
        disc(ctx, x, y, 5 + ((frame >> 3) & 1), o.c === 'S' ? ['#ff4040', '#40ff40', '#4080ff', '#ffff40'][(frame >> 2) & 3] : c);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 3, 2, 2);
      }
      function drawBooms(ctx) {
        for (const s of g.sparks) { ctx.fillStyle = s.hit ? '#ffffa0' : s.t > 18 ? '#ffe070' : '#ff7020'; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.hit ? 2 : 1, s.hit ? 2 : 1); }
        for (const b of g.booms) {
          const life = 26 + b.s * 6, k = b.t / life, r = (4 + b.s * 6) * (0.35 + k);
          if (b.t < 3) { disc(ctx, b.x, b.y, r * 1.2, '#ffffff'); continue; }
          disc(ctx, b.x, b.y, r, k < 0.5 ? '#ff9030' : '#603020');
          disc(ctx, b.x, b.y, r * 0.6, k < 0.5 ? '#ffffa0' : '#301810');
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP); ctx.fillRect(0, BOT, W, H - BOT);
        text(ctx, '1P', 4, 4, '#40c0ff');
        text(ctx, String(g ? g.score : 0).padStart(8, ' '), 72, 4, '#ffffff', 1, 'right');
        text(ctx, 'HI', 100, 4, '#ff4040');
        text(ctx, String(hi).padStart(8, ' '), 166, 4, '#ffffff', 1, 'right');
        if (!g) return;
        text(ctx, 'ZONE', 200, 4, '#ffd040');
        text(ctx, zoneLetter(g.row, g.col), 230, 4, '#ffffff', 1);
        if (g.loop) text(ctx, 'L' + (g.loop + 1), 246, 4, '#ff8080');
        text(ctx, 'X' + g.lives, 268, 4, '#c0c8d0');
        const p = g.p, y = BOT + 3;
        // power gauges
        text(ctx, 'M', 4, y, ORBC.R); for (let i = 0; i < 6; i++) { ctx.fillStyle = i <= p.ml ? ORBC.R : '#301010'; ctx.fillRect(12 + i * 7, y + 1, 5, 5); }
        text(ctx, 'B', 62, y, ORBC.G); for (let i = 0; i < 4; i++) { ctx.fillStyle = i <= p.bl ? ORBC.G : '#103010'; ctx.fillRect(70 + i * 7, y + 1, 5, 5); }
        text(ctx, 'A', 106, y, ORBC.B); for (let i = 0; i < 9; i++) { ctx.fillStyle = i < p.arm ? ORBC.B : '#101830'; ctx.fillRect(114 + i * 5, y + 1, 4, 5); }
        if (g.boss && !g.boss.dead) {
          text(ctx, 'BOSS', 170, y, '#ff6060');
          ctx.fillStyle = '#300'; ctx.fillRect(196, y + 1, 88, 5);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(196, y + 1, Math.max(0, 88 * g.boss.hp / g.boss.maxhp), 5);
        }
      }
      function drawMap(ctx, highlightRow) {
        const cx = W / 2, y0 = 36;
        text(ctx, 'ZONE MAP', cx, y0 - 16, '#ffd040', 1, 'center');
        for (let r = 0; r < 7; r++) for (let c = 0; c < ROWSZ[r]; c++) {
          const x = cx + (c - (ROWSZ[r] - 1) / 2) * 26, y = y0 + r * 22;
          const onPath = g && g.path.some(q => q[0] === r && q[1] === c);
          const cur = g && g.row === r && g.col === c;
          ctx.fillStyle = cur ? ((frame >> 3) & 1 ? '#ffff40' : '#ff8000') : onPath ? '#3080ff' : '#202838';
          ctx.fillRect(x - 9, y - 2, 18, 13);
          text(ctx, LETTERS[ROWST[r] + c], x, y + 1, cur ? '#000' : '#ffffff', 1, 'center');
          if (r < 6) { ctx.fillStyle = '#405070'; ctx.fillRect(x - 6, y + 12, 1, 6); ctx.fillRect(x + 6, y + 12, 1, 6); }
        }
      }
      function drawTitle(ctx) {
        drawBg(ctx, 0);
        const ox = attractX;
        const savedG = g; g = null;
        for (let x = 0; x < W; x += 2) {
          const wx = ox + x, t = TOP + 3 + 0.5 * 46 * vn(wx / 64, 3), b = BOT - 3 - 0.5 * 46 * vn(wx / 64, 20);
          ctx.fillStyle = '#10283a'; ctx.fillRect(x, TOP, 2, t - TOP); ctx.fillRect(x, b, 2, BOT - b);
          ctx.fillStyle = '#3a80a0'; ctx.fillRect(x, t - 1, 2, 1); ctx.fillRect(x, b, 2, 1);
        }
        g = savedG;
        const page = Math.floor(titleT / 540) % 2;
        if (page === 0) {
          const ly = 40;
          otext(ctx, 'DARIUS', W / 2 + 2, ly + 2, '#001030', 5, 'center');
          const bands = [[0, 12, '#c0f0ff'], [12, 24, '#40a0ff'], [24, 35, '#2050c0']];
          for (const [a, b, col] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'DARIUS', W / 2, ly, col, 5, 'center'); ctx.restore(); }
          ctx.drawImage(HAWK, W / 2 - 24, 92, 48, 22);
          otext(ctx, 'SILVER HAWK  vs  BELSER ARMY', W / 2, 124, '#ffd040', 1, 'center');
          otext(ctx, 'RED ORB  - MISSILE', W / 2 - 54, 140, ORBC.R);
          otext(ctx, 'GREEN ORB- BOMB', W / 2 - 54, 151, ORBC.G);
          otext(ctx, 'BLUE ORB - ARM', W / 2 - 54, 162, ORBC.B);
        } else {
          g = { path: [[0, 0]], row: -1, col: -1 };
          drawMap(ctx);
          g = savedG;
          otext(ctx, 'CHOOSE YOUR ROUTE: 26 ZONES', W / 2, 188, '#80c0ff', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : blink) otext(ctx, 'INSERT COIN', W / 2, 176, '#ff4040', 1, 'center'); }
        else if (blink && page === 0) otext(ctx, 'PUSH START BUTTON', W / 2, 176, '#ffffff', 1, 'center');
        otext(ctx, '\u00a9 TAITO 1986', W / 2, 198, '#c0c0c0', 1, 'center');
        drawHUD(ctx);
        text(ctx, credStr(api), W - 4, BOT + 3, '#c0c0c0', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) { drawTitle(ctx); return; }
        const zi = zoneIdx(g.row, g.col);
        if (g.phase === 'map') {
          drawBg(ctx, zi); drawMap(ctx);
          otext(ctx, 'ZONE ' + zoneLetter(g.row, g.col), W / 2, 196, '#ffffff', 1, 'center');
          drawHUD(ctx); return;
        }
        drawBg(ctx, zi);
        drawTerrain(ctx, g.sx, zi, true);
        for (const e of g.en) if (e.ground) drawEnemy(ctx, e);
        if (g.boss) drawBoss(ctx, g.boss);
        for (const e of g.en) if (!e.ground) drawEnemy(ctx, e);
        drawShots(ctx);
        drawHawk(ctx, g.p);
        for (const b of g.eb) {
          const x = Math.round(b.x), y = Math.round(b.y);
          if (b.k) { ctx.fillStyle = '#ff40ff'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 3, 3); }
          else { ctx.fillStyle = (frame & 2) ? '#ffff40' : '#ff8000'; ctx.fillRect(x - 2, y - 1, 4, 3); ctx.fillRect(x - 1, y - 2, 2, 5); }
        }
        drawBooms(ctx);
        for (const o of g.orbs) drawOrb(ctx, o);
        for (const q of g.pops) otext(ctx, q.s, q.x, q.y, '#ffffff', 1, 'center');
        if (g.dark > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (g.dark / 30) + ')'; ctx.fillRect(0, TOP, W, BOT - TOP); }
        if (g.phase === 'intro') {
          otext(ctx, 'ZONE ' + zoneLetter(g.row, g.col), W / 2, 90, '#ffffff', 2, 'center');
          if (g.loop) otext(ctx, 'LOOP ' + (g.loop + 1), W / 2, 112, '#ff8080', 1, 'center');
        }
        if (g.phase === 'warn') {
          const bd = g.row >= 6 ? FINAL : BOSSES[(g.row + g.col) % BOSSES.length];
          if ((frame >> 4) & 1) otext(ctx, 'WARNING !!', W / 2, 64, '#ff3030', 2, 'center');
          otext(ctx, 'A HUGE BATTLESHIP', W / 2, 92, '#ffffff', 1, 'center');
          otext(ctx, bd.name, W / 2, 106, '#ffd040', 2, 'center');
          otext(ctx, 'IS APPROACHING FAST', W / 2, 126, '#ffffff', 1, 'center');
        }
        if (g.phase === 'branch') {
          const tg = branchTargets();
          const bl = (frame >> 3) & 1;
          otext(ctx, 'ZONE ' + zoneLetter(tg[0][0], tg[0][1]), W - 70, MID - 40, g.choice === 'up' || (!g.choice && bl) ? '#ffff40' : '#808080');
          otext(ctx, 'ZONE ' + zoneLetter(tg[1][0], tg[1][1]), W - 70, MID + 34, g.choice === 'down' || (!g.choice && !bl) ? '#ffff40' : '#808080');
          if (!g.choice) otext(ctx, 'CHOOSE A ROUTE', W / 2, MID - 4, '#ffffff', 1, 'center');
        }
        if (g.phase === 'ending') {
          otext(ctx, 'CONGRATULATIONS !', W / 2, 70, '#ffff40', 2, 'center');
          otext(ctx, 'THE BELSER ARMY IS DEFEATED', W / 2, 100, '#ffffff', 1, 'center');
          otext(ctx, 'BONUS 500000', W / 2, 120, '#80ffff', 1, 'center');
        }
        if (g.phase === 'over') otext(ctx, 'GAME OVER', W / 2, 100, '#ff4040', 2, 'center');
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ god() { if (g && g.p.alive) g.p.inv = 5; }, sum: () => g && { ph: g.phase, z: g.row + ':' + g.col + zoneLetter(g.row, g.col), loop: g.loop, sc: g.score, lv: g.lives, en: g.en.length, eb: g.eb.length, boss: g.boss ? Math.round(g.boss.hp) : null, ml: g.p.ml, bl: g.p.bl, arm: g.p.arm, ch: g.choice } });
      return { update, render, destroy() { } };
    }
  });
})();
