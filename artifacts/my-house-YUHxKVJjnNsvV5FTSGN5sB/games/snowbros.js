// Snow Bros. (Toaplan, 1990) - from-scratch recreation for the MAME32 Game Room.
// Single-screen platformer: Nick throws snow until a monster is packed into a snowball, then kicks it to
// roll down the floors and flatten everything in its path (chain points, items, money rain), potions
// (red speed, blue power, yellow range, green balloon), S-N-O-W letters, the pumpkin ghost if you dawdle,
// and a giant boss every 10th floor who can only be hurt by rolling snowballs.
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
  const W = 256, H = 224, T = 8, COLS = 32, ROWS = 28, FLOORY = 208;
  // platform layouts: [row, c0, c1] (8px tiles); bottom floor + side walls are implicit
  const LAYOUTS = [
    [[21, 5, 26], [16, 1, 11], [16, 20, 30], [11, 7, 24], [6, 1, 9], [6, 22, 30]],
    [[21, 1, 9], [21, 22, 30], [16, 8, 23], [11, 1, 12], [11, 19, 30], [6, 10, 21]],
    [[21, 1, 13], [21, 18, 30], [16, 6, 25], [11, 1, 8], [11, 12, 19], [11, 23, 30], [6, 6, 25]],
    [[21, 4, 12], [21, 19, 27], [16, 1, 30], [11, 4, 12], [11, 19, 27], [6, 1, 30]],
    [[22, 1, 7], [22, 24, 30], [18, 8, 23], [14, 1, 7], [14, 24, 30], [10, 8, 23], [6, 1, 30]],
    [[21, 1, 20], [16, 11, 30], [11, 1, 20], [6, 11, 30]],
    [[21, 1, 6], [21, 12, 19], [21, 25, 30], [16, 4, 27], [11, 1, 6], [11, 12, 19], [11, 25, 30], [6, 4, 27]],
    [[21, 9, 22], [17, 1, 8], [17, 23, 30], [13, 9, 22], [9, 1, 8], [9, 23, 30], [5, 9, 22]],
    [[21, 1, 11], [21, 20, 30], [17, 8, 23], [13, 1, 11], [13, 20, 30], [9, 8, 23], [5, 1, 11], [5, 20, 30]]
  ];
  const BOSSLAYOUT = [[19, 1, 9], [13, 1, 13], [7, 1, 9]];
  const NICK_ROWS = [
    '.....bbbbbb.....',
    '....bbbbbbbb....',
    '...bbbbbbbbbb...',
    '...wwwwwwwwww...',
    '..wwwwwkwwwkww..',
    '..wwwwwkwwwkww..',
    '..wwwwwwwwwrrr..',
    '...wwwwwwwwww...',
    '....rrrrrrrr....',
    '...wwwwwwwwwww..',
    '..wwwwwwbwwwwww.',
    '..wwwwwwwwwwwww.',
    '..wwwwwwbwwwwww.',
    '...wwwwwwwwwww..',
    '....bbb...bbb...',
    '...bbbb...bbbb..'
  ];
  const NICK_ROWS2 = NICK_ROWS.slice(0, 14).concat(['....bbb..bbb....', '...bbbb..bbbb...']);
  const NICKPAL = { b: '#2050e0', w: '#ffffff', k: '#000000', r: '#ff3030' };
  const DEMON = [
    '..w........w..',
    '..ww......ww..',
    '...xxxxxxxx...',
    '..xxxxxxxxxx..',
    '.xxwwxxxxwwxx.',
    '.xxwkxxxxwkxx.',
    '.xxxxxxxxxxxx.',
    '.xxyyyyyyyyxx.',
    '..xxxxxxxxxx..',
    '.xxxxxxxxxxxx.',
    'xx.xxxxxxxx.xx',
    '...xx....xx...',
    '..xxx....xxx..'
  ];
  const DEMON2 = DEMON.slice(0, 11).concat(['..xx......xx..', '.xxx......xxx.']);
  const FROG = [
    '..ww......ww..',
    '.wkkw....wkkw.',
    '.wkkwxxxxwkkw.',
    '..xxxxxxxxxx..',
    '.xxxxxxxxxxxx.',
    'xxxxxxxxxxxxxx',
    'xyyyyyyyyyyyyx',
    '.xyyyyyyyyyyx.',
    '..xxxxxxxxxx..',
    '.xxx.xxxx.xxx.',
    'xxx........xxx',
    'xx..........xx'
  ];
  const BAT = [
    'x............x',
    'xx....xx....xx',
    'xxx..xxxx..xxx',
    'xxxxxwxxwxxxxx',
    '.xxxxkxxkxxxx.',
    '..xxxxxxxxxx..',
    '...xxyyyyxx...',
    '....xxxxxx....',
    '.....x..x.....'
  ];
  const EKINDS = {
    demon: { rows: [DEMON, DEMON2], pal: { x: '#e02828', w: '#ffffff', k: '#000', y: '#ffe040' }, spd: 0.7, sc: 1 },
    frog: { rows: [FROG, FROG], pal: { x: '#30b040', w: '#ffffff', k: '#000', y: '#e0f080' }, spd: 0.5, sc: 2 },
    ape: { rows: [DEMON, DEMON2], pal: { x: '#d08020', w: '#ffffff', k: '#000', y: '#ffd0a0' }, spd: 1.1, sc: 2 },
    bat: { rows: [BAT, BAT.map((r, i) => i < 3 ? '..............' : r)], pal: { x: '#9040d0', w: '#ffffff', k: '#000', y: '#ff80c0' }, spd: 0.8, sc: 3 }
  };
  const ESPR = {};
  for (const k in EKINDS) { const d = EKINDS[k]; ESPR[k] = { R: d.rows.map(r => spr(r, d.pal)), L: d.rows.map(r => spr(flipH(r), d.pal)) }; }
  const NICK = { R: [spr(NICK_ROWS, NICKPAL), spr(NICK_ROWS2, NICKPAL)], L: [spr(flipH(NICK_ROWS), NICKPAL), spr(flipH(NICK_ROWS2), NICKPAL)] };
  const FOODS = [['#ff6040', 500], ['#ffd040', 700], ['#60e060', 1000], ['#ff60ff', 2000], ['#40c0ff', 3000]];
  const POTC = { red: '#ff3030', blue: '#3070ff', yellow: '#ffe020', green: '#30d040' };
  const BGS = [['#103878', '#1a4c98'], ['#481860', '#602880'], ['#105040', '#186a58'], ['#603010', '#804820'], ['#202060', '#303090']];

  ArcadeRegistry.register({
    id: 'snowbros', title: 'Snow Bros.', year: 1990, maker: 'Toaplan',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk \u00b7 Space: throw snow / kick snowball \u00b7 X or Up: jump (Down+X: drop) \u00b7 Enter: start',
    marquee: { bg: '#0a2a70', fg: '#ffffff', accent: '#ff4040' },
    create(api) {
      const au = api.audio, R = Math.random;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null;
      const SFX = {
        throw() { au.tone(1200, 0.05, { type: 'triangle', vol: 0.06, slideTo: 1800 }); },
        hit() { au.tone(700, 0.04, { type: 'square', vol: 0.05, slideTo: 400 }); },
        packed() { au.tone(400, 0.12, { type: 'square', vol: 0.08, slideTo: 900 }); },
        kick() { au.tone(220, 0.12, { type: 'square', vol: 0.12, slideTo: 110 }); au.noise(0.1, { vol: 0.08, freq: 1500 }); },
        roll() { au.tone(150, 0.05, { type: 'triangle', vol: 0.05 }); },
        squash(n) { au.tone(500 + n * 120, 0.1, { type: 'square', vol: 0.1, slideTo: 1200 + n * 200 }); },
        burst() { au.noise(0.25, { vol: 0.14, freq: 2500, slideTo: 300 }); },
        jump() { au.tone(400, 0.12, { type: 'square', vol: 0.05, slideTo: 800 }); },
        item() { au.melody([[1047, 0.05], [1319, 0.05], [1568, 0.08]], { type: 'square', vol: 0.08 }); },
        potion() { au.melody([[523, 0.06], [784, 0.06], [1047, 0.06], [1568, 0.15]], { type: 'square', vol: 0.1 }); },
        die() { au.melody([[784, 0.1], [740, 0.1], [698, 0.1], [659, 0.1], [523, 0.4]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [988, 0.1], [1047, 0.35]], { type: 'square', vol: 0.11 }); },
        money() { au.tone(2000, 0.05, { type: 'square', vol: 0.05, slideTo: 2600 }); },
        ghost() { au.tone(200, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 100 }); },
        boss() { au.noise(0.5, { vol: 0.2, freq: 400, slideTo: 60 }); },
        extend() { au.melody([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.25]], { type: 'triangle', vol: 0.18 }); },
        start() { au.melody([[659, 0.1], [784, 0.1], [880, 0.1], [784, 0.1], [1047, 0.3]], { type: 'square', vol: 0.12 }); },
        buzz() { au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
      };
      const TUNE = [659, 0, 784, 0, 880, 784, 659, 0, 587, 0, 659, 0, 523, 0, 0, 0, 659, 0, 784, 0, 880, 988, 1047, 0, 988, 0, 880, 0, 784, 0, 0, 0];
      const TBASS = [131, 196, 131, 196, 147, 220, 147, 220, 110, 165, 110, 165, 98, 147, 196, 147];
      function tryStart() { if (api.useCredit()) return true; coinFlash = 90; SFX.buzz(); return false; }

      // ---------- tile map ----------
      let map = null;
      function buildMap(layout) {
        map = [];
        for (let r = 0; r < ROWS; r++) { map.push(new Uint8Array(COLS)); }
        for (let r = 0; r < ROWS; r++) { map[r][0] = 1; map[r][COLS - 1] = 1; }
        for (let c = 0; c < COLS; c++) { map[26][c] = 1; map[27][c] = 1; }
        for (const [r, c0, c1] of layout) for (let c = c0; c <= c1; c++) map[r][c] = 2;
      }
      function tileAt(c, r) { if (r < 0 || r >= ROWS) return 0; if (c < 0 || c >= COLS) return 1; return map[r][c]; }
      // returns landing y if moving from y0 to y1 (feet) crosses a tile top
      function landY(x, hw, y0, y1, dropRow) {
        if (y1 <= y0) return null;
        const c0 = Math.floor((x - hw + 1) / T), c1 = Math.floor((x + hw - 1) / T);
        const r0 = Math.floor(y0 / T), r1 = Math.floor(y1 / T);
        for (let r = Math.max(0, r0); r <= r1; r++) {
          const ty = r * T;
          if (ty < y0 || ty > y1) continue;
          if (r === dropRow) continue;
          for (let c = c0; c <= c1; c++) if (tileAt(c, r)) return ty;
        }
        return null;
      }
      function onGround(x, hw, y) {
        if (y % T !== 0) return false;
        const r = y / T, c0 = Math.floor((x - hw + 1) / T), c1 = Math.floor((x + hw - 1) / T);
        for (let c = c0; c <= c1; c++) if (tileAt(c, r)) return true;
        return false;
      }
      // generic body physics; returns true if landed this frame
      function physics(o, hw) {
        o.vy = Math.min(4.5, o.vy + 0.22);
        const y0 = o.y, y1 = o.y + o.vy;
        const ly = o.vy > 0 ? landY(o.x, hw, y0, y1, o.dropRow) : null;
        if (ly !== null) { o.y = ly; o.vy = 0; o.ground = true; o.dropRow = -1; }
        else { o.y = y1; o.ground = false; }
        if (o.y > FLOORY) { o.y = FLOORY; o.vy = 0; o.ground = true; }
        if (o.dropRow >= 0 && o.y > o.dropRow * T + 2) o.dropRow = -1;
        return o.ground;
      }
      function wallClamp(o, hw) {
        let hit = 0;
        if (o.x < T + hw) { o.x = T + hw; hit = -1; }
        if (o.x > W - T - hw) { o.x = W - T - hw; hit = 1; }
        return hit;
      }
      function edgeAhead(o, hw, dir) {
        const c = Math.floor((o.x + dir * (hw + 2)) / T), r = o.y / T;
        return !tileAt(c, r);
      }

      // ---------- game ----------
      function newGame() {
        g = {
          score: 0, lives: 2, floor: 0, nextExtra: 100000, letters: { S: 0, N: 0, O: 0, W: 0 },
          p: null, en: [], shots: [], items: [], fx: [], pops: [], eb: [], boss: null, ghost: null,
          phase: 'intro', phaseT: 120, floorT: 0, shake: 0, beat: 0
        };
        g.p = mkPlayer();
        nextFloor();
      }
      function mkPlayer() { return { x: 40, y: FLOORY, vx: 0, vy: 0, dir: 1, ground: true, alive: true, t: 0, inv: 120, spd: 0, pow: 0, rng: 0, balloon: 0, throwT: 0, dropRow: -1, anim: 0 }; }
      function isBossFloor(n) { return n % 10 === 0; }
      function nextFloor() {
        g.floor++;
        const bf = isBossFloor(g.floor);
        buildMap(bf ? BOSSLAYOUT : LAYOUTS[(g.floor - 1) % 10 % LAYOUTS.length]);
        g.en = []; g.shots = []; g.eb = []; g.items = []; g.fx = []; g.ghost = null; g.boss = null;
        g.phase = 'intro'; g.phaseT = 120; g.floorT = 0;
        const p = g.p; p.x = 40; p.y = FLOORY; p.vx = 0; p.vy = 0; p.dir = 1; p.inv = 60; p.balloon = 0;
        const lp = Math.floor((g.floor - 1) / 10);
        if (bf) {
          g.boss = { x: W - 48, y: FLOORY, vy: 0, hp: 5 + lp * 2, maxhp: 5 + lp * 2, t: 0, flash: 0, ground: true, dead: false, deadT: 0, jumpT: 200, spawnT: 120, dropRow: -1 };
          return;
        }
        const n = Math.min(8, 4 + Math.floor((g.floor - 1) / 3) % 4 + lp);
        const kinds = ['demon'];
        if (g.floor % 10 >= 3 || lp) kinds.push('frog');
        if (g.floor % 10 >= 5 || lp) kinds.push('ape');
        if (g.floor % 10 >= 7 || lp) kinds.push('bat');
        const spots = [];
        for (let r = 0; r < 24; r++) for (let c = 2; c < COLS - 2; c++) if (map[r][c] === 2 && map[r][c - 1] === 2 && map[r][c + 1] === 2) spots.push([c, r]);
        spots.sort((a, b) => a[1] - b[1]);
        const top = spots.filter(s => s[1] <= spots[0][1] + 10);
        for (let i = 0; i < n; i++) {
          const s = top.length ? top[(i * 7 + g.floor * 3) % top.length] : [16, 26];
          addEnemy(pick(kinds), s[0] * T + 4, s[1] * T - 40 - i * 6, i * 20);
        }
      }
      function addEnemy(kind, x, y, delay) {
        const lp = Math.floor((g.floor - 1) / 10);
        g.en.push({ kind, x, y, vx: 0, vy: 0, dir: R() < 0.5 ? -1 : 1, ground: false, snow: 0, melt: 0, ball: false, ballT: 0, roll: 0, bounces: 0, kills: 0, t: 0, delay: delay || 0, dead: false, dropRow: -1, jumpT: 60 + R() * 120, fireT: 120 + R() * 120, spd: EKINDS[kind].spd * (1 + lp * 0.2) * (0.9 + R() * 0.2), angry: 0, flyY: y, ph: R() * 6 });
      }
      function lp() { return Math.floor((g.floor - 1) / 10); }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 200000; SFX.extend(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, s, c) { g.pops.push({ x, y, s: String(s), c: c || '#ffffff', t: 60 }); }
      function burst(x, y, n, col) { for (let i = 0; i < n; i++) { const a = R() * 6.283, v = 0.5 + R() * 2; g.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, t: 20 + R() * 20, c: col || '#ffffff' }); } }
      function dropItem(x, y) {
        const r = R();
        let it;
        if (r < 0.16) it = { k: 'potion', c: pick(['red', 'red', 'blue', 'yellow', 'yellow', 'green']) };
        else if (r < 0.24) { const need = 'SNOW'.split('').filter(l => !g.letters[l]); it = { k: 'letter', c: need.length ? pick(need) : pick('SNOW'.split('')) }; }
        else { const f = FOODS[Math.min(FOODS.length - 1, (R() * (2 + lp() + g.floor / 10)) | 0)]; it = { k: 'food', c: f[0], v: f[1] }; }
        it.x = clamp(x, 16, W - 16); it.y = y; it.vy = -2.5; it.t = 0; it.dropRow = -1;
        g.items.push(it);
      }
      function moneyRain() {
        for (let i = 0; i < 14; i++) g.items.push({ k: 'money', x: 16 + R() * (W - 32), y: -10 - R() * 120, vy: 0, t: 0, dropRow: -1, float: true });
        pop(W / 2, 90, 'BONUS!', '#ffff40'); SFX.potion();
      }

      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 330; g.p.alive = false;
        au.melody([[523, 0.2], [392, 0.2], [330, 0.2], [262, 0.5]], { type: 'square', vol: 0.12 });
      }
      function lastLife() {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 2; g.score = 0; g.nextExtra = 100000; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function respawn() { const o = g.p; const n = mkPlayer(); Object.assign(o, n); }
      function killPlayer() {
        const p = g.p;
        if (!p.alive || p.inv > 0 || p.balloon > 0 || g.phase === 'clear') return;
        p.alive = false; p.t = 0; p.vy = -4; SFX.die();
      }

      function updPlayer() {
        const p = g.p;
        if (!p.alive) {
          if (g.phase === 'over') return;
          p.t++; p.y += p.vy; p.vy += 0.2;
          if (p.t === 120) { if (g.lives > 0) { g.lives--; respawn(); } else lastLife(); }
          return;
        }
        if (p.inv > 0) p.inv--;
        if (p.throwT > 0) p.throwT--;
        const sp = 1.25 + p.spd * 0.45;
        let mv = 0;
        if (api.key('ArrowLeft')) mv -= 1; if (api.key('ArrowRight')) mv += 1;
        if (mv) p.dir = mv;
        if (p.balloon > 0) {
          p.balloon--;
          let my = 0; if (api.key('ArrowUp')) my -= 1; if (api.key('ArrowDown')) my += 1;
          p.x += mv * 1.6; p.y = clamp(p.y + my * 1.6, 30, FLOORY); wallClamp(p, 7);
          for (const e of g.en) if (!e.dead && e.delay <= 0 && Math.abs(e.x - p.x) < 14 && Math.abs(e.y - p.y) < 14) { killEnemy(e, 1000, null); }
          if (p.balloon === 0) { p.vy = 0; p.inv = 60; }
          return;
        }
        // pushing a resting snowball
        let push = null;
        for (const e of g.en) if (e.ball && !e.roll && !e.dead && Math.abs(e.y - p.y) < 8 && Math.abs(e.x - p.x) < 16 && Math.sign(e.x - p.x) === mv) push = e;
        if (push) { push.x += mv * 0.6; if (wallClamp(push, 9)) { } p.x = push.x - mv * 16; }
        else p.x += mv * sp;
        wallClamp(p, 6);
        p.anim = mv && p.ground ? p.anim + 1 : 0;
        const jump = api.pressed('KeyX') || api.pressed('ArrowUp');
        if (jump && p.ground) {
          if (api.key('ArrowDown') && p.y < FLOORY) { p.dropRow = p.y / T; p.ground = false; p.vy = 0.5; }
          else { p.vy = -4.9; p.ground = false; SFX.jump(); }
        }
        physics(p, 6);
        if (api.pressed('Space')) {
          // kick an adjacent snowball, else throw snow
          let kicked = false;
          for (const e of g.en) {
            if (!e.ball || e.roll || e.dead) continue;
            const dx = e.x - p.x;
            if (Math.abs(e.y - p.y) < 10 && Math.abs(dx) < 20 && (Math.sign(dx) === p.dir || Math.abs(dx) < 4)) { kick(e, p.dir); kicked = true; break; }
          }
          if (!kicked && g.shots.length < 2 + p.pow && p.throwT <= 0) {
            g.shots.push({ x: p.x + p.dir * 8, y: p.y - 10, vx: p.dir * 3.2, vy: -0.6, life: 16 + p.rng * 10, big: p.pow > 0 });
            p.throwT = 10; SFX.throw();
          }
        }
        // items
        for (const it of g.items) {
          if (it.got || it.t < 15 || Math.abs(it.x - p.x) > 10 || Math.abs(it.y - p.y) > 14) continue;
          it.got = true;
          if (it.k === 'food') { addScore(it.v); pop(it.x, it.y - 10, it.v, '#ffff80'); SFX.item(); }
          else if (it.k === 'money') { addScore(1000); pop(it.x, it.y - 10, 1000, '#80ff80'); SFX.money(); }
          else if (it.k === 'letter') {
            g.letters[it.c] = 1; SFX.item(); addScore(500);
            if ('SNOW'.split('').every(l => g.letters[l])) { g.lives++; SFX.extend(); pop(W / 2, 80, 'SNOW! 1UP', '#ffff40'); g.letters = { S: 0, N: 0, O: 0, W: 0 }; }
          } else {
            SFX.potion(); addScore(100);
            if (it.c === 'red') { p.spd = Math.min(2, p.spd + 1); pop(it.x, it.y - 10, 'SPEED UP', POTC.red); }
            else if (it.c === 'blue') { p.pow = 1; pop(it.x, it.y - 10, 'POWER UP', POTC.blue); }
            else if (it.c === 'yellow') { p.rng = Math.min(2, p.rng + 1); pop(it.x, it.y - 10, 'RANGE UP', '#ffe020'); }
            else { p.balloon = 600; pop(it.x, it.y - 10, 'BALLOON!', POTC.green); }
          }
        }
        // touching enemies / fire
        for (const e of g.en) {
          if (e.dead || e.delay > 0 || e.ball || e.snow > 0) continue;
          if (Math.abs(e.x - p.x) < 11 && Math.abs((e.y - 7) - (p.y - 7)) < 12) { killPlayer(); return; }
        }
        for (const b of g.eb) if (Math.abs(b.x - p.x) < 7 && Math.abs(b.y - (p.y - 7)) < 8) { b.gone = true; killPlayer(); return; }
        if (g.ghost && Math.abs(g.ghost.x - p.x) < 11 && Math.abs(g.ghost.y - (p.y - 8)) < 11) killPlayer();
        const B = g.boss;
        if (B && !B.dead && Math.abs(B.x - p.x) < 24 && p.y > B.y - 46 && p.y - 14 < B.y) killPlayer();
      }
      function kick(e, dir) {
        e.roll = dir; e.bounces = 0; e.kills = 0; e.vx = 0; SFX.kick(); addScore(10);
      }
      function killEnemy(e, pts, ball) {
        if (e.dead) return;
        e.dead = true; addScore(pts); pop(e.x, e.y - 18, pts, '#ffffff'); burst(e.x, e.y - 8, 10, EKINDS[e.kind].pal.x);
        dropItem(e.x, e.y - 8);
        if (ball && g.en.every(o => o.dead || o === ball) && ball.kills >= 2) moneyRain();
      }
      function updShots() {
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.life <= 0) { s.vy += 0.25; s.vx *= 0.9; }
          if (s.x < T || s.x > W - T || s.y > FLOORY || (s.life <= 0 && landY(s.x, 1, s.y - s.vy, s.y, -1) !== null)) { s.gone = true; burst(s.x, s.y, 3); continue; }
          for (const e of g.en) {
            if (e.dead || e.delay > 0) continue;
            if (Math.abs(e.x - s.x) < 9 && Math.abs((e.y - 7) - s.y) < 9) {
              s.gone = true; burst(s.x, s.y, 4);
              if (e.roll) break;
              if (e.ball) { e.ballT = Math.max(0, e.ballT - 60); e.x += Math.sign(s.vx) * 2; break; }
              e.snow += s.big ? 2 : 1; e.melt = 0; addScore(10); SFX.hit();
              if (e.snow >= 4) { e.snow = 4; e.ball = true; e.ballT = 0; e.vx = 0; SFX.packed(); }
              break;
            }
          }
          if (!s.gone && g.boss && !g.boss.dead && Math.abs(g.boss.x - s.x) < 22 && s.y > g.boss.y - 44 && s.y < g.boss.y) { s.gone = true; burst(s.x, s.y, 3); }
        }
        g.shots = g.shots.filter(s => !s.gone);
      }
      function updEnemies() {
        const p = g.p;
        for (const e of g.en) {
          if (e.dead) continue;
          if (e.delay > 0) { e.delay--; continue; }
          e.t++;
          if (e.roll) {
            e.x += e.roll * 3.6;
            const hit = wallClamp(e, 9);
            if (hit) { e.roll = -hit; e.bounces++; SFX.roll(); if (e.bounces >= 4) { e.dead = true; burst(e.x, e.y - 9, 18); SFX.burst(); addScore(500); dropItem(e.x, e.y - 8); if (g.en.every(o => o.dead) && e.kills >= 2) moneyRain(); continue; } }
            physics(e, 6);
            for (const o of g.en) {
              if (o === e || o.dead || o.delay > 0 || o.roll) continue;
              if (Math.abs(o.x - e.x) < 16 && Math.abs(o.y - e.y) < 14) {
                if (o.ball) { kick(o, e.roll); o.x += e.roll * 4; continue; }
                e.kills++;
                const pts = Math.min(8000, 500 * Math.pow(2, e.kills - 1));
                SFX.squash(e.kills); killEnemy(o, pts, e);
              }
            }
            const B = g.boss;
            if (B && !B.dead && Math.abs(B.x - e.x) < 28 && e.y > B.y - 48 && e.y - 16 < B.y) {
              B.hp--; B.flash = 30; e.dead = true; burst(e.x, e.y - 9, 20); SFX.boss(); addScore(1000);
              if (B.hp <= 0) { B.dead = true; B.deadT = 0; addScore(50000 * (lp() + 1)); pop(B.x, B.y - 60, 50000 * (lp() + 1), '#ffff40'); }
            }
            continue;
          }
          if (e.ball) {
            physics(e, 6);
            e.ballT++;
            if (e.ballT > 420) { e.ball = false; e.snow = 0; e.angry++; e.spd *= 1.15; e.vy = -3; burst(e.x, e.y - 8, 12); }
            continue;
          }
          if (e.snow > 0) {
            if (++e.melt > 150) { e.melt = 90; e.snow--; }
            physics(e, 6);
            continue;
          }
          // normal AI
          const K = e.kind;
          if (K === 'bat') {
            e.x += e.dir * e.spd;
            e.flyY += Math.sign(p.y - 20 - e.flyY) * 0.25;
            e.y = clamp(e.flyY + Math.sin(e.t * 0.06 + e.ph) * 12, 30, FLOORY);
            if (wallClamp(e, 7)) e.dir = -e.dir;
            if (e.t % 180 === 0) e.dir = p.x > e.x ? 1 : -1;
            continue;
          }
          if (e.ground) {
            e.x += e.dir * e.spd * (K === 'frog' ? ((e.t >> 4) & 1) : 1);
            if (wallClamp(e, 7)) e.dir = -e.dir;
            if (edgeAhead(e, 6, e.dir) && e.y < FLOORY) { if (R() < 0.5) e.dir = -e.dir; }
            if (--e.jumpT <= 0) {
              e.jumpT = (K === 'ape' ? 60 : 110) + R() * 120;
              if (p.y < e.y - 10 && R() < 0.75) { e.vy = K === 'ape' ? -5.2 : -4.9; }
              else if (p.y > e.y + 10 && e.y < FLOORY && R() < 0.5) { e.dropRow = e.y / T; e.vy = 0.5; }
              else if (R() < 0.3) e.vy = -3;
              if (R() < 0.5) e.dir = p.x > e.x ? 1 : -1;
            }
            if (K === 'frog' && --e.fireT <= 0) {
              e.fireT = Math.max(90, 200 - lp() * 30) + R() * 100;
              if (Math.abs(p.y - e.y) < 30 && p.alive) { e.dir = p.x > e.x ? 1 : -1; g.eb.push({ x: e.x + e.dir * 8, y: e.y - 7, vx: e.dir * 1.8, t: 0 }); }
            }
          } else { e.x += e.dir * e.spd * 0.6; wallClamp(e, 7); }
          physics(e, 6);
          wallClamp(e, 7);
        }
        g.en = g.en.filter(e => !e.dead);
      }
      function updBoss() {
        const B = g.boss; if (!B) return;
        B.t++; if (B.flash > 0) B.flash--;
        if (B.dead) {
          B.deadT++;
          if (B.deadT % 6 === 0) { burst(B.x + (R() - 0.5) * 40, B.y - R() * 48, 8, pick(['#ffffff', '#40ff40', '#ffff40'])); SFX.burst(); }
          if (B.deadT === 1) for (const e of g.en) killEnemy(e, 1000, null);
          if (B.deadT > 120) { g.boss = null; for (let i = 0; i < 6; i++) dropItem(60 + i * 30, 100); }
          return;
        }
        if (B.vy !== 0 || !B.ground) {
          B.vy += 0.2; B.y += B.vy;
          if (B.y >= FLOORY) { B.y = FLOORY; B.vy = 0; B.ground = true; g.shake = 20; SFX.boss(); if (g.p.ground && g.p.alive && g.p.balloon <= 0) g.p.vy = -2; }
        }
        if (--B.jumpT <= 0 && B.ground) { B.jumpT = 220 - Math.min(100, lp() * 30) + R() * 80; B.vy = -5.5; B.ground = false; }
        if (--B.spawnT <= 0) {
          B.spawnT = Math.max(110, 200 - lp() * 30);
          if (g.en.length < 5) {
            addEnemy(lp() ? pick(['demon', 'ape']) : 'demon', B.x - 24, B.y - 30, 0);
            const e = g.en[g.en.length - 1]; e.vy = -3; e.dir = -1;
          }
          if (lp() > 0 || B.hp < B.maxhp / 2) for (let i = 0; i < 3; i++) g.eb.push({ x: B.x - 20, y: B.y - 30 + i * 8, vx: -1.6 - i * 0.3, t: 0 });
        }
      }
      function updMisc() {
        for (const f of g.fx) { f.x += f.vx; f.y += f.vy; f.vy += 0.12; f.t--; }
        g.fx = g.fx.filter(f => f.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.4; }
        g.pops = g.pops.filter(q => q.t > 0);
        for (const b of g.eb) { b.x += b.vx; b.t++; }
        g.eb = g.eb.filter(b => !b.gone && b.x > T && b.x < W - T);
        for (const it of g.items) {
          it.t++;
          if (it.float) { it.y += 1.5; if (it.y >= FLOORY) it.y = FLOORY; else { const ly = landY(it.x, 3, it.y - 1, it.y, -1); if (ly !== null && it.y > 20 && R() < 0.3) it.float = false; } it.x += Math.sin(it.t * 0.1) * 0.5; }
          else physics(it, 3);
        }
        g.items = g.items.filter(it => !it.got && it.t < 600);
        if (g.shake > 0) g.shake--;
      }
      function updGhost() {
        if (isBossFloor(g.floor)) return;
        if (!g.ghost && g.floorT === 2700) { g.ghost = { x: W / 2, y: -10 }; SFX.ghost(); }
        const G = g.ghost; if (!G || !g.p.alive) return;
        const dx = g.p.x - G.x, dy = g.p.y - 8 - G.y, d = Math.hypot(dx, dy) || 1, s = 0.55 + lp() * 0.1;
        G.x += dx / d * s; G.y += dy / d * s;
      }

      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); SFX.start(); }
          return;
        }
        updMisc();
        if (g.phase === 'over') {
          if (--g.phaseT <= 0 || (g.phaseT < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; updEnemies(); return; }
        g.floorT++;
        updPlayer(); if (g.phase === 'over') return;
        updShots(); updEnemies(); updBoss(); updGhost();
        if (g.phase === 'play') {
          const done = isBossFloor(g.floor) ? !g.boss : !g.en.length;
          if (done) { g.phase = 'clear'; g.phaseT = g.items.some(it => it.k === 'money') ? 360 : 240; g.ghost = null; SFX.clear(); g.eb = []; }
        } else if (g.phase === 'clear') {
          if (--g.phaseT <= 0) nextFloor();
        }
        if (frame % 9 === 0 && g.phase === 'play') {
          const i = g.beat++;
          const n = TUNE[i % TUNE.length];
          if (n) au.tone(n, 0.12, { type: 'square', vol: 0.03 });
          if (i % 2 === 0) au.tone(TBASS[(i >> 1) % TBASS.length], 0.14, { type: 'triangle', vol: 0.06 });
        }
      }

      // ---------- rendering ----------
      function drawMap(ctx) {
        const bg = BGS[Math.floor((g.floor - 1) / 10) % BGS.length];
        ctx.fillStyle = bg[0]; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = bg[1];
        for (let y = 24; y < FLOORY; y += 32) for (let x = ((y >> 5) & 1) * 32; x < W; x += 64) { ctx.fillRect(x + 8, y, 24, 16); ctx.fillRect(x + 12, y - 4, 16, 24); }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const t = map[r][c]; if (!t) continue;
          const x = c * T, y = r * T;
          if (t === 1) {
            ctx.fillStyle = '#5a4a8a'; ctx.fillRect(x, y, T, T);
            ctx.fillStyle = '#7a6aaa'; ctx.fillRect(x, y, T - 1, 1); ctx.fillRect(x, y, 1, T - 1);
            ctx.fillStyle = '#3a2a5a'; ctx.fillRect(x + T - 1, y, 1, T); ctx.fillRect(x, y + T - 1, T, 1);
          } else {
            ctx.fillStyle = '#4060c0'; ctx.fillRect(x, y, T, T);
            ctx.fillStyle = '#2a3a80'; ctx.fillRect(x, y + T - 1, T, 1); ctx.fillRect(x + ((r & 1) ? 0 : 4), y + 4, 1, 3);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, T, 3);
            ctx.fillStyle = '#c0e0ff'; ctx.fillRect(x, y + 3, T, 1);
            if ((c * 7 + r) % 3 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y + 3, 2, 2); }
          }
        }
        // snow on the bottom floor
        ctx.fillStyle = '#ffffff'; ctx.fillRect(T, FLOORY, W - 2 * T, 2);
      }
      function drawEnemy(ctx, e) {
        if (e.delay > 0) return;
        const x = Math.round(e.x), y = Math.round(e.y);
        if (e.ball) {
          const shakeX = e.ballT > 360 ? ((frame >> 1) & 1) * 2 - 1 : 0;
          const rot = e.roll ? (frame >> 2) & 3 : 0;
          disc(ctx, x + shakeX, y - 9, 10, '#a0b8e0');
          disc(ctx, x + shakeX, y - 9, 9, '#ffffff');
          ctx.fillStyle = '#d0e0ff';
          const a = rot * 1.57;
          ctx.fillRect(Math.round(x + shakeX + Math.cos(a) * 5) - 2, Math.round(y - 9 + Math.sin(a) * 5) - 2, 4, 4);
          if (!e.roll) { ctx.fillStyle = EKINDS[e.kind].pal.x; ctx.fillRect(x - 5, y - 2, 3, 2); ctx.fillRect(x + 2, y - 2, 3, 2); }
          return;
        }
        const S = ESPR[e.kind][e.dir > 0 ? 'R' : 'L'][(e.t >> 3) & 1];
        ctx.drawImage(S, x - 7, y - S.height);
        if (e.snow > 0) {
          const hgt = Math.round(S.height * e.snow / 4) + 1;
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 8, y - hgt, 16, hgt);
          ctx.fillStyle = '#c0d8ff'; ctx.fillRect(x - 8, y - hgt, 16, 1); ctx.fillRect(x - 8, y - 1, 16, 1);
          ctx.fillStyle = '#e0f0ff'; ctx.fillRect(x - 6, y - hgt + 2, 3, Math.max(1, hgt - 4));
        }
      }
      function drawBoss(ctx, B) {
        const x = Math.round(B.x), y = Math.round(B.y) + (B.dead ? Math.min(40, B.deadT >> 1) : 0);
        if (B.dead && (frame & 2)) return;
        const fl = B.flash > 0 && (frame & 2);
        const body = fl ? '#ffffff' : '#30a040', dk = '#185820', lt = '#60e070';
        ctx.fillStyle = dk; ctx.fillRect(x - 24, y - 48, 48, 48);
        ctx.fillStyle = body; ctx.fillRect(x - 22, y - 46, 44, 40); ctx.fillRect(x - 26, y - 30, 52, 18);
        ctx.fillStyle = lt; ctx.fillRect(x - 20, y - 44, 40, 4);
        // horns
        ctx.fillStyle = '#fff0c0'; ctx.fillRect(x - 20, y - 56, 5, 10); ctx.fillRect(x + 15, y - 56, 5, 10); ctx.fillRect(x - 22, y - 60, 3, 5); ctx.fillRect(x + 19, y - 60, 3, 5);
        // eyes, mouth
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 16, y - 38, 10, 8); ctx.fillRect(x + 4, y - 38, 10, 8);
        ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 13 - ((frame >> 5) & 1) * 2, y - 36, 4, 4); ctx.fillRect(x + 6 - ((frame >> 5) & 1) * 2, y - 36, 4, 4);
        ctx.fillStyle = '#400000'; ctx.fillRect(x - 14, y - 24, 24, 8 + (B.spawnT < 20 ? 4 : 0));
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 13 + i * 6, y - 24, 3, 3);
        // feet / arms
        ctx.fillStyle = dk; ctx.fillRect(x - 22, y - 6, 14, 6); ctx.fillRect(x + 8, y - 6, 14, 6);
        ctx.fillStyle = body; ctx.fillRect(x - 34, y - 28, 10, 8); ctx.fillRect(x + 24, y - 28, 10, 8);
      }
      function drawItem(ctx, it) {
        const x = Math.round(it.x), y = Math.round(it.y);
        if (it.t > 480 && (frame & 4)) return;
        if (it.k === 'food') {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y - 6, 10, 6);
          ctx.fillStyle = it.c; ctx.fillRect(x - 5, y - 9, 10, 4);
          ctx.fillStyle = '#202020'; ctx.fillRect(x - 5, y - 4, 10, 2);
        } else if (it.k === 'money') {
          ctx.fillStyle = '#208030'; ctx.fillRect(x - 6, y - 6, 12, 6);
          ctx.fillStyle = '#80ff90'; ctx.fillRect(x - 5, y - 5, 10, 4); ctx.fillStyle = '#208030'; ctx.fillRect(x - 1, y - 5, 2, 4);
        } else if (it.k === 'letter') {
          disc(ctx, x, y - 6, 6, '#ff40a0');
          text(ctx, it.c, x - 2, y - 9, '#ffffff');
        } else {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 12, 2, 3);
          ctx.fillStyle = POTC[it.c]; ctx.fillRect(x - 4, y - 9, 8, 9); ctx.fillRect(x - 3, y - 10, 6, 1);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 7, 2, 3);
        }
      }
      function drawPlayer(ctx, p) {
        if (!p.alive) {
          if (g.phase === 'over') return;
          const S = NICK.R[0];
          ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y - 8)); ctx.rotate(p.t * 0.2); ctx.drawImage(S, -8, -8); ctx.restore();
          return;
        }
        if (p.inv > 0 && (frame & 2) && p.balloon <= 0) return;
        const S = NICK[p.dir > 0 ? 'R' : 'L'][(p.anim >> 3) & 1];
        const x = Math.round(p.x - 8), y = Math.round(p.y - 16);
        if (p.balloon > 0) {
          disc(ctx, p.x, p.y - 9, 13, (p.balloon < 120 && (frame & 4)) ? '#ffffff' : '#60e070');
          disc(ctx, p.x - 4, p.y - 13, 3, '#d0ffd0');
          ctx.drawImage(S, x, y - 1);
          return;
        }
        ctx.drawImage(S, x, y);
        if (p.throwT > 6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.x + p.dir * 7) - 2, y + 7, 4, 3); }
        if (p.spd > 0) { ctx.fillStyle = POTC.red; ctx.fillRect(x + 6, y + 1, 4, 1); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, 15);
        text(ctx, '1P', 4, 4, '#40a0ff'); text(ctx, String(g ? g.score : 0).padStart(7, ' '), 66, 4, '#ffffff', 1, 'right');
        text(ctx, 'HI', 100, 4, '#ff4040'); text(ctx, String(hi).padStart(7, ' '), 160, 4, '#ffffff', 1, 'right');
        if (!g) return;
        text(ctx, 'FLOOR ' + g.floor, W - 4, 4, '#ffff40', 1, 'right');
        for (let i = 0; i < Math.min(5, g.lives); i++) ctx.drawImage(NICK.R[0], 2 + i * 10, H - 10, 8, 8);
        'SNOW'.split('').forEach((l, i) => { disc(ctx, 74 + i * 11, H - 6, 5, g.letters[l] ? '#ff40a0' : '#402040'); text(ctx, l, 72 + i * 11, H - 9, g.letters[l] ? '#ffffff' : '#806080'); });
        const p = g.p;
        let px = 130;
        if (p.spd) { ctx.fillStyle = POTC.red; ctx.fillRect(px, H - 9, 5, 6); px += 8; }
        if (p.pow) { ctx.fillStyle = POTC.blue; ctx.fillRect(px, H - 9, 5, 6); px += 8; }
        if (p.rng) { ctx.fillStyle = POTC.yellow; ctx.fillRect(px, H - 9, 5, 6); px += 8; }
        if (g.boss && !g.boss.dead) { text(ctx, 'BOSS', 170, H - 9, '#ff6060'); for (let i = 0; i < g.boss.hp; i++) { ctx.fillStyle = '#ff3030'; ctx.fillRect(196 + i * 6, H - 9, 4, 6); } }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#103878'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 60; i++) { const x = (i * 37 + frame * (0.3 + (i % 3) * 0.2)) % W, y = (i * 53 + frame * (0.5 + (i % 4) * 0.25)) % H; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
        const ly = 34;
        otext(ctx, 'SNOW BROS.', W / 2 + 2, ly + 2, '#002050', 3, 'center');
        const bands = [[0, 8, '#ffffff'], [8, 14, '#c0e0ff'], [14, 22, '#60a0ff']];
        for (const [a, b, col] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'SNOW BROS.', W / 2, ly, col, 3, 'center'); ctx.restore(); }
        otext(ctx, 'NICK & TOM', W / 2, 64, '#ffd040', 1, 'center');
        const page = Math.floor(titleT / 500) % 2;
        if (page === 0) {
          ctx.drawImage(NICK.R[(frame >> 4) & 1], 60, 92, 32, 32);
          ctx.drawImage(ESPR.demon.L[(frame >> 3) & 1], 150, 96, 28, 26);
          disc(ctx, 118, 112, 10, '#ffffff');
          otext(ctx, 'COVER MONSTERS WITH SNOW', W / 2, 136, '#ffffff', 1, 'center');
          otext(ctx, 'KICK THE SNOWBALL TO', W / 2, 148, '#ffffff', 1, 'center');
          otext(ctx, 'CRUSH THEM ALL!', W / 2, 160, '#ffff40', 1, 'center');
        } else {
          const ps = [['red', 'SPEED UP'], ['blue', 'SNOW POWER UP'], ['yellow', 'RANGE UP'], ['green', 'BALLOON']];
          ps.forEach((q, i) => { drawItem(ctx, { k: 'potion', c: q[0], x: 70, y: 100 + i * 16, t: 0 }); otext(ctx, q[1], 84, 92 + i * 16, POTC[q[0]]); });
          otext(ctx, 'COLLECT S-N-O-W FOR 1UP', W / 2, 166, '#ff80c0', 1, 'center');
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) otext(ctx, 'INSERT COIN', W / 2, 182, '#ff4040', 1, 'center'); }
        else if ((frame >> 5) & 1) otext(ctx, 'PUSH START BUTTON', W / 2, 182, '#ffffff', 1, 'center');
        otext(ctx, '\u00a9 TOAPLAN 1990', W / 2, 198, '#ffffff', 1, 'center');
        otext(ctx, credStr(api), W / 2, 212, '#c0c0c0', 1, 'center');
        drawHUD(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) { drawTitle(ctx); return; }
        ctx.save();
        if (g.shake > 0) ctx.translate(0, ((frame >> 1) & 1) * 2 - 1);
        drawMap(ctx);
        for (const it of g.items) drawItem(ctx, it);
        if (g.boss) drawBoss(ctx, g.boss);
        for (const e of g.en) drawEnemy(ctx, e);
        for (const s of g.shots) { const r = s.big ? 4 : 3; disc(ctx, s.x, s.y, r, '#ffffff'); ctx.fillStyle = '#a0c0ff'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) + r - 2, 2, 1); }
        for (const b of g.eb) { disc(ctx, b.x, b.y, 3 + ((b.t >> 2) & 1), '#ff6020'); disc(ctx, b.x, b.y, 2, '#ffe060'); }
        drawPlayer(ctx, g.p);
        if (g.ghost) {
          const G = g.ghost, x = Math.round(G.x), y = Math.round(G.y);
          disc(ctx, x, y, 9, '#ff8020'); ctx.fillStyle = '#c05010'; ctx.fillRect(x - 1, y - 9, 2, 18);
          ctx.fillStyle = '#208020'; ctx.fillRect(x - 1, y - 12, 3, 4);
          ctx.fillStyle = (frame & 8) ? '#ffff40' : '#000'; ctx.fillRect(x - 5, y - 3, 3, 3); ctx.fillRect(x + 2, y - 3, 3, 3); ctx.fillRect(x - 4, y + 3, 8, 2);
        }
        for (const f of g.fx) { ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
        for (const q of g.pops) otext(ctx, q.s, q.x, q.y, q.c, 1, 'center');
        ctx.restore();
        if (g.phase === 'intro') {
          otext(ctx, 'FLOOR ' + g.floor, W / 2, 90, '#ffffff', 2, 'center');
          if (isBossFloor(g.floor)) otext(ctx, 'BOSS FLOOR !', W / 2, 112, '#ff4040', 1, 'center');
        }
        if (g.phase === 'clear' && g.phaseT < 200) otext(ctx, 'FLOOR CLEAR !', W / 2, 90, '#ffff40', 2, 'center');
        if (g.ghost && g.floorT < 2820 && (frame & 8)) otext(ctx, 'HURRY UP !', W / 2, 100, '#ff8020', 2, 'center');
        if (g.phase === 'over') otext(ctx, 'GAME OVER', W / 2, 100, '#ff4040', 2, 'center');
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ god() { if (g && g.p.alive) g.p.inv = 5; }, sum: () => g && { ph: g.phase, fl: g.floor, sc: g.score, lv: g.lives, en: g.en.length, balls: g.en.filter(e => e.ball).length, boss: g.boss ? g.boss.hp : null, items: g.items.length, ghost: !!g.ghost }, g: () => g });
      return { update, render, destroy() { } };
    }
  });
})();
