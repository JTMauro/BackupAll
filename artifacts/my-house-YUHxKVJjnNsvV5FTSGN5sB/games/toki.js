// Toki (TAD Corporation, 1989) - from-scratch recreation for the MAME32 Game Room.
// Side-scrolling run and gun: Toki the cursed ape spits fireballs forward, upward and diagonally,
// jumps gaps and swims lakes, grabs spit power-ups (double, triple, fire), the football helmet,
// sneakers, clocks and coins against a strict time limit, and fights a giant boss at the end of each
// of five stages (jungle, lake, volcano, ice cavern, palace) to rescue Miho from the wizard.
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
  const W = 256, H = 224, TS = 16, MR = 14, LEN = 210, ARENA = 22;
  const TOKI_A = [
    '.....bbbbb......',
    '....bbbbbbb.....',
    '...bbbbffffb....',
    '...bbbfkffkf....',
    '...bbbffffff....',
    '...bbbbffmmf....',
    '....bbbbfff.....',
    '.....bbbbb......',
    '...bbbbbbbbb....',
    '..bbbbbffffbb...',
    '.bbb.bffffb.bb..',
    '.bb..bffffb..ff.',
    '.ff..bbbbbb.....',
    '.....bbbbbb.....',
    '....bbb..bbb....',
    '....bb....bb....',
    '...fff....fff...'
  ];
  const TOKI_B = TOKI_A.slice(0, 13).concat(['.....bbbbbb.....', '.....bbbbb......', '.....bb.bbb.....', '....fff..fff....']);
  const TOKI_J = TOKI_A.slice(0, 8).concat([
    '.ff.bbbbbbbb.ff.',
    '.bbbbbffffbbbb..',
    '..bb.bffffb.....',
    '.....bffffb.....',
    '.....bbbbbb.....',
    '....bbbbbbbb....',
    '...bbb....bbb...',
    '..fff......fff..',
    '................']);
  const TPAL = { b: '#7a4418', f: '#f0b880', k: '#000000', m: '#e02020' };
  const TOKI = {};
  [['A', TOKI_A], ['B', TOKI_B], ['J', TOKI_J]].forEach(([k, rows]) => { TOKI[k + 'R'] = spr(rows, TPAL); TOKI[k + 'L'] = spr(flipH(rows), TPAL); });
  const ER = {
    monkey: ['...xxxx.....', '..xxxxxx....', '..xffkfx....', '..xffffx....', '...xxmx.....', '.xxxxxxxx...', 'x.xxxxxx.x..', '..xxxxxx....', '..xx..xx....', '.xx....xx...'],
    hopper: ['..y.y.y.y...', '.yxxxxxxxy..', 'yxxwkxxwkxy.', '.xxxxxxxxx..', 'yxxyyyyyxxy.', '.xxxxxxxxx..', '..x.....x...', '.xx.....xx..'],
    bird: ['....xxx.....', '...xxwkx....', 'yyxxxxxxyy..', '.yyxxxxyy...', '..xxxxxx....', '...x..x.....'],
    thrower: ['...yyyy.....', '..yxxxxy....', '..xwkxwkx...', '..xxxxxx....', '...xmmx.....', '.yxxxxxxy...', 'y.xxxxxx.y..', '..xxxxxx....', '..xx..xx....', '.yy....yy...'],
    fish: ['....yy......', '..xxxxxx..x.', '.xwkxxxxxxx.', 'xxxxxxxxxxx.', '.xxyyyyxx.x.', '..xxxxxx....'],
    knight: ['...wwww.....', '..wwwwww....', '..wkwwkw....', '..wwwwww....', '.xxxxxxxx...', 'x.xxyyxx.x..', 'x.xxyyxx.x..', '..xxxxxx....', '..xx..xx....', '.xxx..xxx...']
  };
  const EP = {
    monkey: { x: '#5068a0', f: '#c0d0ff', k: '#000', m: '#ff4040' },
    hopper: { x: '#c02040', y: '#ffe040', w: '#ffffff', k: '#000' },
    bird: { x: '#3080e0', y: '#80d0ff', w: '#ffffff', k: '#000' },
    thrower: { x: '#40a040', y: '#a0ff60', w: '#ffffff', k: '#000', m: '#ff4040' },
    fish: { x: '#f08020', y: '#ffe080', w: '#ffffff', k: '#000' },
    knight: { x: '#8088a0', y: '#ffd040', w: '#c0c8e0', k: '#000' }
  };
  const ES = {};
  for (const k in ER) ES[k] = { R: spr(flipH(ER[k]), EP[k]), L: spr(ER[k], EP[k]) };
  const STAGES = [
    { name: 'JUNGLE', sky: ['#4080d0', '#70b0f0'], hill: '#2a6a30', hill2: '#1a4a20', top: '#40c040', dirt: '#7a4a20', dirt2: '#5a3416', plat: '#a07040', boss: 'golem', bname: 'BOLORAGOG', mix: ['monkey', 'monkey', 'hopper', 'bird', 'thrower'] },
    { name: 'LAKE', sky: ['#2050a0', '#4090d0'], hill: '#205878', hill2: '#103850', top: '#60d0a0', dirt: '#806040', dirt2: '#5a4430', plat: '#80a0a0', boss: 'bigfish', bname: 'GIANT PIRANHA', mix: ['monkey', 'bird', 'bird', 'hopper', 'thrower'] },
    { name: 'VOLCANO', sky: ['#401010', '#802010'], hill: '#3a1a10', hill2: '#200c08', top: '#c06030', dirt: '#5a3020', dirt2: '#3a1c12', plat: '#806050', boss: 'firedemon', bname: 'FIRE DEMON', mix: ['hopper', 'thrower', 'knight', 'bird', 'monkey'] },
    { name: 'ICE CAVERN', sky: ['#103050', '#306080'], hill: '#5080a0', hill2: '#305870', top: '#e0f4ff', dirt: '#80a8c8', dirt2: '#5a80a0', plat: '#b0d0e8', boss: 'icebeast', bname: 'ICE BEAST', mix: ['knight', 'hopper', 'bird', 'thrower', 'monkey'] },
    { name: 'GOLDEN PALACE', sky: ['#281040', '#503070'], hill: '#605020', hill2: '#403010', top: '#ffd040', dirt: '#a07820', dirt2: '#705010', plat: '#c0a040', boss: 'wizard', bname: 'VOOKIMEDLO', mix: ['knight', 'thrower', 'monkey', 'hopper', 'bird'] }
  ];

  ArcadeRegistry.register({
    id: 'toki', title: 'Toki', year: 1989, maker: 'TAD',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk (Up: aim up, Up+Left/Right: diagonal) \u00b7 Space: spit \u00b7 X: jump / swim \u00b7 Enter: start',
    marquee: { bg: '#1a3010', fg: '#ffd040', accent: '#e03020' },
    create(api) {
      const au = api.audio, R = Math.random;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null;
      const SFX = {
        spit() { au.tone(500, 0.06, { type: 'square', vol: 0.05, slideTo: 250 }); },
        fire() { au.noise(0.1, { vol: 0.07, freq: 1200, slideTo: 400 }); },
        jump() { au.tone(300, 0.12, { type: 'square', vol: 0.05, slideTo: 600 }); },
        swim() { au.tone(200, 0.1, { type: 'sine', vol: 0.06, slideTo: 350 }); },
        hit() { au.tone(800, 0.04, { type: 'square', vol: 0.05, slideTo: 300 }); },
        kill() { au.noise(0.18, { vol: 0.12, freq: 2000, slideTo: 200 }); au.tone(400, 0.12, { type: 'square', vol: 0.05, slideTo: 100 }); },
        coin() { au.tone(1568, 0.04, { type: 'square', vol: 0.06 }); au.tone(2093, 0.08, { type: 'square', vol: 0.06, delay: 0.04 }); },
        power() { au.melody([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.15]], { type: 'square', vol: 0.1 }); },
        helmetOff() { au.tone(1000, 0.2, { type: 'square', vol: 0.1, slideTo: 200 }); },
        die() { au.melody([[440, 0.12], [415, 0.12], [392, 0.12], [370, 0.12], [349, 0.5]], { type: 'square', vol: 0.12 }); },
        boss() { au.noise(0.6, { vol: 0.2, freq: 500, slideTo: 60 }); },
        bigBoom() { au.noise(1.4, { vol: 0.26, freq: 900, slideTo: 40 }); au.tone(80, 1.2, { type: 'sawtooth', vol: 0.12, slideTo: 25 }); },
        clear() { au.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.12], [880, 0.12], [1047, 0.4]], { type: 'square', vol: 0.12 }); },
        tick() { au.tone(1200, 0.03, { type: 'square', vol: 0.05 }); },
        extend() { au.melody([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.25]], { type: 'triangle', vol: 0.18 }); },
        start() { au.melody([[392, 0.1], [392, 0.1], [523, 0.1], [659, 0.2], [523, 0.1], [659, 0.4]], { type: 'square', vol: 0.12 }); },
        buzz() { au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
      };
      const BASS = [110, 0, 165, 0, 110, 147, 0, 165, 98, 0, 147, 0, 98, 131, 147, 165];
      function tryStart() { if (api.useCredit()) return true; coinFlash = 90; SFX.buzz(); return false; }

      // ---------- level ----------
      let map = null;
      function tile(c, r) { if (c < 0 || c >= LEN) return 1; if (r < 0 || r >= MR) return 0; return map[c][r]; }
      function genLevel(st, loop) {
        let rs = (st * 7919 + loop * 104729 + 17) | 0;
        const rr = () => { rs = (Math.imul(rs, 1103515245) + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
        map = []; for (let c = 0; c < LEN; c++) map.push(new Uint8Array(MR));
        const spawns = [], coins = [], checks = [[2 * TS, (MR - 2) * TS]];
        let gh = 2, c = 0;
        const fill = (cc, h) => { for (let r = MR - h; r < MR; r++) map[cc][r] = 1; };
        const S = STAGES[st];
        while (c < 12) fill(c++, gh);
        let lastCheck = 0;
        while (c < LEN - ARENA) {
          const r = rr();
          const groundY = (MR - gh) * TS;
          if (c - lastCheck > 45) { checks.push([c * TS + 8, groundY]); lastCheck = c; }
          if (r < 0.32) {
            const n = 5 + (rr() * 6 | 0);
            for (let i = 0; i < n && c < LEN - ARENA; i++) fill(c++, gh);
            if (rr() < 0.8) spawns.push({ x: (c - 2) * TS, y: groundY, kind: pick2(S.mix, rr) });
            if (rr() < 0.4) for (let i = 0; i < 4; i++) coins.push({ x: (c - n + 1 + i) * TS + 8, y: groundY - 40 - Math.sin(i / 3 * Math.PI) * 14 });
            if (rr() < 0.18) spawns.push({ x: (c - n + 2) * TS, y: groundY, kind: 'pot' });
          } else if (r < 0.48) {
            gh = clamp(gh + (rr() < 0.5 ? 1 : -1), 2, 5);
            for (let i = 0; i < 4 && c < LEN - ARENA; i++) fill(c++, gh);
          } else if (r < 0.62) {
            const n = 2 + (rr() * 2 | 0);
            for (let i = 0; i < n; i++) { if (st === 2) map[c][MR - 1] = 4; c++; }
            for (let i = 0; i < 3; i++) fill(c++, gh);
            if (st === 2 || st === 3) spawns.push({ x: (c - n - 3) * TS + 8, y: TS, kind: 'drop' });
          } else if (r < 0.76) {
            const n = 5;
            const py = MR - gh - 2;
            for (let i = 0; i < n; i++) { if (st === 2) map[c][MR - 1] = 4; if (i >= 1 && i <= 3) map[c][py] = 2; c++; }
            coins.push({ x: (c - 3) * TS + 8, y: py * TS - 20 });
            for (let i = 0; i < 3; i++) fill(c++, gh);
            if (rr() < 0.5) spawns.push({ x: (c - 5) * TS, y: py * TS - 40, kind: 'bird' });
          } else if (r < 0.88 && st === 1) {
            // lake: a pool to swim across
            const n = 8 + (rr() * 6 | 0);
            gh = 4; for (let i = 0; i < 2; i++) fill(c++, gh);
            for (let i = 0; i < n; i++) { map[c][MR - 1] = 1; for (let rr2 = MR - gh; rr2 < MR - 1; rr2++) map[c][rr2] = 3; c++; }
            spawns.push({ x: (c - (n >> 1)) * TS, y: (MR - 1) * TS, kind: 'fish' });
            for (let i = 0; i < 3; i++) fill(c++, gh);
          } else {
            // raised ledge with a platform staircase
            const n = 7;
            for (let i = 0; i < n; i++) { fill(c, gh); if (i >= 1 && i <= 3) map[c][MR - gh - 3] = 2; if (i >= 4) map[c][MR - gh - 5] = 2; c++; }
            spawns.push({ x: (c - 2) * TS, y: (MR - gh - 5) * TS, kind: 'thrower' });
            for (let i = 0; i < 6; i++) coins.push({ x: (c - 3) * TS + 8 + (i % 3) * 10 - 10, y: (MR - gh - 5) * TS - 14 - (i > 2 ? 10 : 0) });
            for (let i = 0; i < 2; i++) fill(c++, gh);
          }
        }
        gh = 2;
        while (c < LEN) fill(c++, gh);
        // arena walls
        for (let r = 0; r < MR; r++) map[LEN - 1][r] = 1;
        spawns.sort((a, b) => a.x - b.x);
        return { spawns, coins, checks };
      }
      function pick2(a, rr) { return a[(rr() * a.length) | 0]; }
      function solidAt(px, py) { return tile(Math.floor(px / TS), Math.floor(py / TS)) === 1; }
      function moveBody(o, hw, hh) {
        o.hitWall = 0;
        o.x += o.vx;
        const top = o.y - hh + 2, bot = o.y - 2;
        if (o.vx > 0) { const ex = o.x + hw; if (solidAt(ex, top) || solidAt(ex, bot) || solidAt(ex, (top + bot) / 2)) { o.x = Math.floor(ex / TS) * TS - hw - 0.01; o.hitWall = 1; } }
        else if (o.vx < 0) { const ex = o.x - hw; if (solidAt(ex, top) || solidAt(ex, bot) || solidAt(ex, (top + bot) / 2)) { o.x = (Math.floor(ex / TS) + 1) * TS + hw + 0.01; o.hitWall = -1; } }
        const y0 = o.y; o.y += o.vy; o.ground = false;
        if (o.vy > 0) {
          const c0 = Math.floor((o.x - hw + 1) / TS), c1 = Math.floor((o.x + hw - 1) / TS);
          for (let r = Math.floor((y0 - 0.01) / TS); r <= Math.floor(o.y / TS); r++) {
            const ty = r * TS; if (ty < y0 - 0.01 || ty > o.y) continue;
            let land = false;
            for (let cc = c0; cc <= c1; cc++) { const t = tile(cc, r); if (t === 1 || t === 2) land = true; }
            if (land) { o.y = ty; o.vy = 0; o.ground = true; break; }
          }
        } else if (o.vy < 0) {
          const head = o.y - hh;
          if (solidAt(o.x - hw + 1, head) || solidAt(o.x + hw - 1, head)) { o.y = (Math.floor(head / TS) + 1) * TS + hh; o.vy = 0; }
        }
      }
      function groundAhead(o, dir, hw) { const c = Math.floor((o.x + dir * (hw + 3)) / TS), r = Math.floor((o.y + 2) / TS); const t = tile(c, r); return t === 1 || t === 2; }
      function inWater(x, y) { return tile(Math.floor(x / TS), Math.floor(y / TS)) === 3; }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 2, nextExtra: 50000, stage: 0, loop: 0, coinsN: 0, p: null, beat: 0 };
        g.p = { x: 40, y: 0, vx: 0, vy: 0, dir: 1, ground: false, alive: true, t: 0, inv: 0, wep: null, wepT: 0, helmet: false, shoes: 0, fireT: 0, anim: 0, aimUp: 0 };
        startStage(0);
      }
      function startStage(st) {
        g.stage = st;
        const L = genLevel(st, g.loop);
        g.spawns = L.spawns; g.spawnIdx = 0; g.coins = L.coins; g.checks = L.checks; g.check = L.checks[0];
        g.en = []; g.pb = []; g.eb = []; g.items = []; g.fx = []; g.pops = []; g.boss = null; g.bossOn = false;
        g.camX = 0; g.time = 200; g.timeF = 0; g.phase = 'intro'; g.phaseT = 150; g.shake = 0;
        placePlayer(g.check);
      }
      function placePlayer(ck) {
        const p = g.p;
        p.x = ck[0]; p.y = ck[1]; p.vx = 0; p.vy = 0; p.alive = true; p.t = 0; p.inv = 120; p.ground = true;
        g.camX = clamp(p.x - 80, 0, LEN * TS - W);
      }
      function dif() { return g.stage + g.loop * 2; }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 100000; SFX.extend(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, s, c) { g.pops.push({ x, y, s: String(s), c: c || '#ffffff', t: 50 }); }
      function burst(x, y, n, cols) { for (let i = 0; i < n; i++) { const a = R() * 6.283, v = 0.5 + R() * 2.5; g.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, t: 18 + R() * 20, c: pick(cols || ['#ffe060', '#ff8020', '#ffffff']) }); } }
      function spawnEnemy(s) {
        const D = dif();
        const base = { kind: s.kind, x: s.x, y: s.y, vx: 0, vy: 0, dir: -1, t: 0, hp: 1, flash: 0, ground: false, dead: false, jt: 40 + R() * 60, ft: 60 + R() * 60, y0: s.y };
        const hp = { monkey: 1, hopper: 2, bird: 1, thrower: 2, fish: 2, knight: 4, pot: 1, drop: 99 }[s.kind] || 1;
        base.hp = hp + (s.kind !== 'pot' && s.kind !== 'drop' ? Math.floor(D / 3) : 0);
        base.sc = { monkey: 100, hopper: 200, bird: 150, thrower: 300, fish: 200, knight: 500, pot: 50, drop: 0 }[s.kind] || 100;
        if (s.kind === 'bird') { base.y0 = Math.min(s.y, 120); base.y = base.y0; }
        g.en.push(base);
      }
      function dropPower(x, y) {
        const r = R();
        const k = r < 0.22 ? 'double' : r < 0.42 ? 'triple' : r < 0.58 ? 'fire' : r < 0.72 ? 'helmet' : r < 0.84 ? 'shoes' : r < 0.94 ? 'clock' : 'fruit';
        g.items.push({ k, x, y: y - 8, vx: 0, vy: -3, t: 0, ground: false });
      }
      function killEnemy(e) {
        if (e.dead) return;
        e.dead = true; addScore(e.sc); SFX.kill(); burst(e.x, e.y - 8, 12);
        if (e.sc >= 300) pop(e.x, e.y - 20, e.sc);
        if (e.kind === 'pot') { dropPower(e.x, e.y); return; }
        const r = R();
        if (r < 0.3) g.items.push({ k: 'coin', x: e.x, y: e.y - 8, vx: 0, vy: -3, t: 0 });
        else if (r < 0.36) dropPower(e.x, e.y);
      }
      function hurtEnemy(e, d) {
        if (e.dead || e.kind === 'drop') return;
        e.hp -= d; e.flash = 4; SFX.hit();
        if (e.hp <= 0) killEnemy(e);
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 330; g.p.alive = false;
        au.melody([[392, 0.3], [349, 0.3], [330, 0.3], [262, 0.7]], { type: 'triangle', vol: 0.15 });
      }
      function lastLife() {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 2; g.score = 0; g.nextExtra = 50000; respawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function respawn() {
        const p = g.p;
        p.wep = null; p.wepT = 0; p.helmet = false; p.shoes = 0;
        g.eb = []; g.time = Math.max(g.time, 120);
        if (g.bossOn) { const cx = g.camX; placePlayer([g.camX + 40, (MR - 2) * TS]); g.camX = cx; return; }
        placePlayer(g.check);
        g.en = [];
        g.spawnIdx = 0;
        while (g.spawnIdx < g.spawns.length && g.spawns[g.spawnIdx].x < g.camX + W + 24) g.spawnIdx++;
      }
      function killPlayer(force) {
        const p = g.p;
        if (!p.alive || g.phase === 'clear' || g.phase === 'ending') return;
        if (!force) {
          if (p.inv > 0) return;
          if (p.helmet) { p.helmet = false; p.inv = 90; SFX.helmetOff(); burst(p.x, p.y - 20, 8, ['#ffd040', '#ffffff']); return; }
        }
        p.alive = false; p.t = 0; p.vy = -4; p.vx = 0; SFX.die();
      }

      function fire() {
        const p = g.p;
        if (p.fireT > 0) return;
        const up = api.key('ArrowUp'), side = api.key('ArrowLeft') || api.key('ArrowRight');
        let ang = up ? (side ? -Math.PI / 4 : -Math.PI / 2) : 0;
        if (p.dir < 0) ang = Math.PI - ang;
        const ox = p.x + (up && !side ? 2 * p.dir : 8 * p.dir), oy = p.y - (up ? 20 : 12);
        const max = p.wep ? 9 : 3;
        if (g.pb.length >= max) return;
        const mk = (a, big) => g.pb.push({ x: ox, y: oy, vx: Math.cos(a) * (big ? 4.5 : 4), vy: Math.sin(a) * (big ? 4.5 : 4), big: !!big, life: 70, pierce: !!big });
        if (p.wep === 'triple') { mk(ang); mk(ang - 0.3); mk(ang + 0.3); }
        else if (p.wep === 'double') { mk(ang); g.pb.push({ x: ox - Math.sin(ang) * 6, y: oy + Math.cos(ang) * 6, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4, life: 70 }); }
        else if (p.wep === 'fire') mk(ang, true);
        else mk(ang);
        p.fireT = p.wep === 'fire' ? 14 : 11; p.aimUp = up ? 10 : 0; p.spitT = 8;
        if (p.wep === 'fire') SFX.fire(); else SFX.spit();
      }
      function updPlayer() {
        const p = g.p;
        if (!p.alive) {
          if (g.phase === 'over') return;
          p.t++; p.y += p.vy; p.vy += 0.2;
          if (p.t === 110) { if (g.lives > 0) { g.lives--; respawn(); } else lastLife(); }
          return;
        }
        if (p.inv > 0) p.inv--; if (p.fireT > 0) p.fireT--; if (p.aimUp > 0) p.aimUp--; if (p.spitT > 0) p.spitT--;
        if (p.wepT > 0 && --p.wepT === 0) p.wep = null;
        if (p.shoes > 0) p.shoes--;
        let mv = 0;
        if (api.key('ArrowLeft')) mv -= 1; if (api.key('ArrowRight')) mv += 1;
        if (mv) p.dir = mv;
        const water = inWater(p.x, p.y - 8);
        const ice = g.stage === 3;
        const sp = water ? 1.0 : 1.5;
        if (ice && !water) { p.vx += (mv * sp - p.vx) * (p.ground ? 0.05 : 0.08); }
        else p.vx = mv * sp;
        if (water) {
          p.vy = Math.min(1.1, p.vy + 0.07);
          if (api.pressed('KeyX')) { p.vy = -2.6; SFX.swim(); }
        } else {
          p.vy = Math.min(5, p.vy + 0.25);
          if (api.pressed('KeyX') && p.ground) { p.vy = p.shoes > 0 ? -6.4 : -5.5; SFX.jump(); }
          if (!api.key('KeyX') && p.vy < -2) p.vy += 0.25;
        }
        moveBody(p, 6, 22);
        if (p.x < g.camX + 8) { p.x = g.camX + 8; if (p.vx < 0) p.vx = 0; }
        if (p.x > LEN * TS - 20) p.x = LEN * TS - 20;
        p.anim = mv && p.ground ? p.anim + 1 : 0;
        if (api.key('Space')) fire();
        // hazards
        if (p.y > H + 24) { killPlayer(true); return; }
        if (tile(Math.floor(p.x / TS), Math.floor((p.y - 2) / TS)) === 4) { burst(p.x, p.y, 16, ['#ff4000', '#ffc000']); killPlayer(true); return; }
        // checkpoints
        for (const ck of g.checks) if (p.x > ck[0] && ck[0] > g.check[0]) g.check = ck;
        // pickups
        for (const cn of g.coins) if (!cn.got && Math.abs(cn.x - p.x) < 9 && Math.abs(cn.y - (p.y - 12)) < 14) { cn.got = true; gotCoin(); }
        for (const it of g.items) {
          if (it.got || it.t < 10 || Math.abs(it.x - p.x) > 11 || Math.abs(it.y - (p.y - 10)) > 16) continue;
          it.got = true;
          if (it.k === 'coin') gotCoin();
          else if (it.k === 'double' || it.k === 'triple' || it.k === 'fire') { p.wep = it.k; p.wepT = 1200; SFX.power(); pop(it.x, it.y - 12, it.k === 'fire' ? 'FIRE BALL' : it.k.toUpperCase() + ' SPIT', '#ffff60'); }
          else if (it.k === 'helmet') { p.helmet = true; SFX.power(); pop(it.x, it.y - 12, 'HELMET', '#ffd040'); }
          else if (it.k === 'shoes') { p.shoes = 1200; SFX.power(); pop(it.x, it.y - 12, 'JUMP SHOES', '#40ffff'); }
          else if (it.k === 'clock') { g.time += 30; SFX.power(); pop(it.x, it.y - 12, 'TIME +30', '#ffffff'); }
          else { addScore(2000); SFX.coin(); pop(it.x, it.y - 12, 2000, '#ff80ff'); }
        }
        // enemies & bullets
        for (const e of g.en) {
          if (e.dead || e.kind === 'pot') continue;
          const hh = e.kind === 'drop' ? 14 : 12;
          if (Math.abs(e.x - p.x) < 11 && Math.abs((e.y - hh / 2) - (p.y - 11)) < 6 + 10) { killPlayer(); if (!p.alive) return; }
        }
        for (const b of g.eb) if (Math.abs(b.x - p.x) < 4 + (b.r || 3) && Math.abs(b.y - (p.y - 11)) < 10 + (b.r || 3)) { b.gone = true; killPlayer(); if (!p.alive) return; }
        const B = g.boss;
        if (B && !B.dead && B.vuln !== false && B.solid !== false && Math.abs(B.x - p.x) < B.w / 2 + 4 && p.y > B.y - B.h + 4 && p.y - 20 < B.y) killPlayer();
      }
      function gotCoin() {
        g.coinsN++; addScore(100); SFX.coin();
        if (g.coinsN >= 50) { g.coinsN = 0; g.lives++; SFX.extend(); pop(g.p.x, g.p.y - 30, '1UP', '#ffff40'); }
      }
      function updShots() {
        const B = g.boss;
        for (const s of g.pb) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.life <= 0 || s.x < g.camX - 8 || s.x > g.camX + W + 8 || s.y < 0 || s.y > H || (!s.big && solidAt(s.x, s.y))) { s.gone = true; continue; }
          for (const e of g.en) {
            if (e.dead) continue;
            const hh = 12;
            if (Math.abs(e.x - s.x) < 8 + (s.big ? 3 : 0) && Math.abs(e.y - hh / 2 - s.y) < 8 + (s.big ? 3 : 0)) {
              if (e.kind === 'drop') { s.gone = true; break; }
              if (s.hitSet && s.hitSet.has(e)) continue;
              hurtEnemy(e, s.big ? 2 : 1);
              if (s.pierce) { (s.hitSet = s.hitSet || new Set()).add(e); } else { s.gone = true; break; }
            }
          }
          if (!s.gone && B && !B.dead && B.vuln !== false && Math.abs(B.x - s.x) < B.w / 2 && s.y > B.y - B.h && s.y < B.y) {
            B.hp -= s.big ? 2 : 1; B.flash = 3; s.gone = true; burst(s.x, s.y, 3);
            if (B.hp <= 0) bossDie(B);
          }
        }
        g.pb = g.pb.filter(s => !s.gone);
      }
      function updEnemies() {
        const p = g.p, D = dif();
        while (g.spawnIdx < g.spawns.length && g.spawns[g.spawnIdx].x < g.camX + W + 24) spawnEnemy(g.spawns[g.spawnIdx++]);
        for (const e of g.en) {
          if (e.dead) continue;
          e.t++; if (e.flash > 0) e.flash--;
          const dx = p.x - e.x;
          switch (e.kind) {
            case 'monkey': case 'knight': {
              const near = Math.abs(dx) < 170;
              if (near && e.ground && e.t % 40 === 0) e.dir = dx > 0 ? 1 : -1;
              const sp = (e.kind === 'knight' ? 0.45 : 0.9) + D * 0.05;
              e.vx = near ? e.dir * sp : 0;
              if (e.ground && !groundAhead(e, e.dir, 6)) { e.vx = 0; if (e.kind === 'monkey' && R() < 0.02) { e.vy = -4.6; e.vx = e.dir * 1.6; } }
              if (e.kind === 'monkey' && e.ground && near && --e.jt <= 0) { e.jt = 70 + R() * 80; e.vy = -4.4; }
              if (e.kind === 'knight' && near && --e.ft <= 0 && p.alive) { e.ft = Math.max(70, 140 - D * 10) + R() * 60; g.eb.push({ x: e.x + e.dir * 8, y: e.y - 12, vx: e.dir * 2.4, vy: 0, r: 3, k: 'spear' }); }
              e.vy = Math.min(5, e.vy + 0.25);
              moveBody(e, 6, 12);
              if (e.hitWall) e.dir = -e.dir;
              break;
            }
            case 'hopper':
              e.vy = Math.min(5, e.vy + 0.22);
              if (e.ground) { e.vx = 0; if (--e.jt <= 0 && Math.abs(dx) < 200) { e.jt = 50 + R() * 40; e.vy = -4.2; e.vx = Math.sign(dx) * (1.1 + D * 0.08); e.dir = Math.sign(dx) || 1; } }
              moveBody(e, 6, 10);
              break;
            case 'bird':
              e.dir = -1;
              if (!e.swoop) {
                e.x -= 0.8 + D * 0.05; e.y = e.y0 + Math.sin(e.t * 0.05) * 10;
                if (Math.abs(dx) < 30 && p.y > e.y + 20 && e.t > 30) { e.swoop = 1; e.vx = -1; e.vy = 2.2; }
              } else {
                e.x += e.vx; e.y += e.vy; e.vy -= 0.04;
                if (e.vy < -2) e.vy = -2;
              }
              break;
            case 'thrower':
              e.dir = dx > 0 ? 1 : -1;
              e.vy = Math.min(5, e.vy + 0.25); e.vx = 0; moveBody(e, 6, 14);
              if (--e.ft <= 0 && Math.abs(dx) < 220 && p.alive) {
                e.ft = Math.max(60, 120 - D * 8) + R() * 40;
                const t = 40, vx = clamp(dx / t, -3, 3), vy = ((p.y - 12) - (e.y - 14) - 0.5 * 0.15 * t * t) / t;
                g.eb.push({ x: e.x, y: e.y - 14, vx, vy: clamp(vy, -5, 1), grav: 0.15, r: 3, k: 'rock' });
              }
              break;
            case 'fish':
              if (e.leap) { e.y += e.vy; e.vy += 0.16; e.x += e.vx; if (e.vy > 0 && e.y >= e.y0) { e.y = e.y0; e.leap = 0; } }
              else { e.x += Math.sin(e.t * 0.03) * 0.6; if (--e.jt <= 0 && Math.abs(dx) < 120) { e.jt = 80 + R() * 60; e.leap = 1; e.vy = -5.5; e.vx = clamp(dx / 70, -1.5, 1.5); e.dir = Math.sign(dx) || -1; } }
              break;
            case 'drop':
              if (!e.fall && Math.abs(dx) < 34 && p.y > e.y) { e.fall = 1; }
              if (e.fall) { e.vy += 0.25; e.y += e.vy; if (e.y > H + 20) e.dead = true; }
              break;
            case 'pot':
              e.vy = Math.min(5, e.vy + 0.25); e.vx = 0; moveBody(e, 6, 12);
              break;
          }
          if (e.x < g.camX - 48 || e.y > H + 30) e.dead = true;
        }
        g.en = g.en.filter(e => !e.dead);
      }

      // ---------- bosses ----------
      function startBoss() {
        const st = STAGES[g.stage], D = dif(), ground = (MR - 2) * TS;
        const hp = [40, 36, 46, 52, 64][g.stage] + g.loop * 20;
        const base = { kind: st.boss, hp, maxhp: hp, t: 0, flash: 0, dead: false, deadT: 0, vx: 0, vy: 0 };
        const right = g.camX + W - 40;
        if (st.boss === 'golem') Object.assign(base, { x: right, y: ground, w: 54, h: 60, dir: -1 });
        else if (st.boss === 'bigfish') Object.assign(base, { x: right, y: H + 40, w: 56, h: 32, state: 'wait', wt: 60, vuln: false, solid: false });
        else if (st.boss === 'firedemon') Object.assign(base, { x: right, y: 90, w: 40, h: 44, y0: 90 });
        else if (st.boss === 'icebeast') Object.assign(base, { x: right, y: ground, w: 50, h: 58, dir: -1 });
        else Object.assign(base, { x: right, y: 120, w: 26, h: 36, alpha: 1, tp: 0 });
        g.boss = base; g.bossOn = true; SFX.boss();
      }
      function bossDie(B) {
        B.dead = true; B.deadT = 0; g.eb = [];
        addScore(30000 + g.stage * 10000); pop(B.x, B.y - B.h - 10, 30000 + g.stage * 10000, '#ffff40'); SFX.bigBoom();
      }
      function bShoot(x, y, a, s, o) { g.eb.push(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 4 }, o || {})); }
      function aimP(x, y) { return Math.atan2(g.p.y - 12 - y, g.p.x - x); }
      function updBoss() {
        const B = g.boss; if (!B) return;
        const p = g.p, D = dif(), ground = (MR - 2) * TS, L = g.camX + 20, Rr = g.camX + W - 20;
        B.t++; if (B.flash > 0) B.flash--;
        if (B.dead) {
          B.deadT++;
          if (B.deadT % 5 === 0) burst(B.x + (R() - 0.5) * B.w, Math.min(H - 20, B.y) - R() * B.h, 10);
          if (B.deadT % 20 === 0) SFX.kill();
          if (B.deadT > 150) { g.boss = null; g.phase = 'clear'; g.phaseT = 300; g.bonus = g.time * 100; SFX.clear(); }
          return;
        }
        if (!p.alive) return;
        const rate = Math.max(0.55, 1 - D * 0.07);
        switch (B.kind) {
          case 'golem': {
            B.vy += 0.3; B.y += B.vy;
            if (B.y >= ground) { if (B.vy > 3) { g.shake = 18; SFX.boss(); } B.y = ground; B.vy = 0; }
            B.x += B.dir * 0.4; if (B.x < L + 30 || B.x > Rr - 10) B.dir = -B.dir;
            if (B.t % Math.round(110 * rate) === 0) { B.mouth = 20; const a = aimP(B.x, B.y - 36); for (let i = -1; i <= 1; i++) bShoot(B.x - 10, B.y - 36, a + i * 0.25 - 0.3, 3.4, { grav: 0.08, k: 'rock' }); }
            if (B.t % 330 === 200 && B.y >= ground) B.vy = -6.5;
            if (B.mouth > 0) B.mouth--;
            break;
          }
          case 'bigfish': {
            if (B.state === 'wait') {
              B.vuln = false; B.solid = false;
              if (--B.wt <= 0) { B.state = 'leap'; const fromRight = B.x > g.camX + W / 2; B.x = fromRight ? Rr - 20 : L + 20; B.y = H + 30; B.vx = (fromRight ? -1 : 1) * (1.6 + D * 0.08); B.vy = -7.2; B.dir = Math.sign(B.vx); SFX.swim(); }
            } else {
              B.vuln = true; B.solid = true;
              B.x += B.vx; B.y += B.vy; B.vy += 0.12;
              if (Math.abs(B.vy) < 0.4 && !B.shot) { B.shot = 1; for (let i = 0; i < 6 + D; i++) bShoot(B.x, B.y - 16, Math.PI * (0.15 + i * 0.7 / (5 + D)), 2.2, { k: 'bubble' }); }
              if (B.y > H + 30 && B.vy > 0) { B.state = 'wait'; B.wt = Math.max(30, 70 - D * 6); B.shot = 0; }
            }
            break;
          }
          case 'firedemon': {
            B.x = g.camX + W / 2 + Math.sin(B.t * 0.012) * 90; B.y = B.y0 + Math.sin(B.t * 0.031) * 30;
            if (B.t % Math.round(70 * rate) === 0) { const a = aimP(B.x, B.y - 20); for (let i = -2; i <= 2; i++) bShoot(B.x, B.y - 20, a + i * 0.2, 2.4, { k: 'fire' }); }
            if (B.t % Math.round(130 * rate) === 60) for (let i = 0; i < 2; i++) bShoot(B.x, B.y - 10, Math.PI / 2 + (i ? 0.4 : -0.4), 1.5, { grav: 0.15, k: 'fire', bounce: 3, r: 5 });
            break;
          }
          case 'icebeast': {
            B.vy += 0.3; B.y += B.vy;
            if (B.y >= ground) { if (B.vy > 3) { g.shake = 20; SFX.boss(); for (let i = 0; i < 3 + D; i++) g.en.push({ kind: 'drop', x: g.camX + 20 + R() * (W - 40), y: 20, vx: 0, vy: 0, t: 0, hp: 99, flash: 0, dead: false, fall: 1, sc: 0, dir: 1 }); } B.y = ground; B.vy = 0; }
            B.dir = p.x < B.x ? -1 : 1;
            B.x += B.dir * 0.5; B.x = clamp(B.x, L + 30, Rr - 10);
            if (B.t % Math.round(90 * rate) === 0) { const a = aimP(B.x, B.y - 50); bShoot(B.x, B.y - 50, a - 0.35, 3.6, { grav: 0.1, k: 'ice', r: 5 }); }
            if (B.t % 300 === 150 && B.y >= ground) B.vy = -7;
            break;
          }
          case 'wizard': {
            B.tp++;
            if (B.tp < 30) B.alpha = 1 - B.tp / 30;
            else if (B.tp === 30) { B.x = g.camX + 40 + R() * (W - 80); B.y = 60 + R() * 90; }
            else if (B.tp < 60) B.alpha = (B.tp - 30) / 30;
            else B.alpha = 1;
            B.vuln = B.tp >= 50;
            if (B.tp === 80 || B.tp === 140) { const n = 8 + D; for (let i = 0; i < n; i++) bShoot(B.x, B.y - 18, i * 6.283 / n + B.t, 1.8, { k: 'orb' }); }
            if (B.tp === 110) { const a = aimP(B.x, B.y - 18); for (let i = -1; i <= 1; i++) bShoot(B.x, B.y - 18, a + i * 0.15, 3, { k: 'orb' }); }
            if (B.tp > Math.round(200 * rate)) B.tp = 0;
            break;
          }
        }
      }
      function updMisc() {
        for (const f of g.fx) { f.x += f.vx; f.y += f.vy; f.vy += 0.1; f.t--; }
        g.fx = g.fx.filter(f => f.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.4; }
        g.pops = g.pops.filter(q => q.t > 0);
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy; if (b.grav) b.vy += b.grav;
          if (b.bounce && b.y > (MR - 2) * TS - 4 && b.vy > 0) { b.vy = -b.vy * 0.8; b.bounce--; }
          if (b.k === 'rock' && solidAt(b.x, b.y)) { b.gone = true; burst(b.x, b.y, 4, ['#a08060']); }
        }
        g.eb = g.eb.filter(b => !b.gone && b.x > g.camX - 20 && b.x < g.camX + W + 20 && b.y < H + 10 && b.y > -40);
        for (const it of g.items) { it.t++; it.vy = Math.min(4, it.vy + 0.2); it.vx = 0; moveBody(it, 4, 8); }
        g.items = g.items.filter(it => !it.got && it.t < 700 && it.y < H + 20);
        if (g.shake > 0) g.shake--;
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
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'ending') {
          if (--g.phaseT <= 0) { g.loop++; startStage(0); }
          return;
        }
        updPlayer(); if (g.phase === 'over') return;
        // camera
        const maxCam = LEN * TS - W;
        if (!g.bossOn) g.camX = clamp(Math.max(g.camX, g.p.x - 110), 0, maxCam);
        if (!g.bossOn && g.camX >= maxCam - 0.5 && g.phase === 'play') startBoss();
        updShots(); updEnemies(); updBoss();
        if (g.phase === 'play' && g.p.alive) {
          if (++g.timeF >= 60) { g.timeF = 0; g.time--; if (g.time <= 10 && g.time > 0) SFX.tick(); if (g.time <= 0) { g.time = 0; killPlayer(true); } }
        }
        if (g.phase === 'clear') {
          g.phaseT--;
          if (g.phaseT === 200) addScore(g.bonus);
          if (g.phaseT <= 0) { if (g.stage >= 4) { g.phase = 'ending'; g.phaseT = 480; SFX.extend(); } else startStage(g.stage + 1); }
        }
        if (g.phase === 'play' && frame % 10 === 0) {
          const n = BASS[g.beat++ % BASS.length];
          if (n) au.tone(n * (g.bossOn ? 1.12 : 1), 0.15, { type: 'triangle', vol: 0.07 });
        }
      }

      // ---------- rendering ----------
      function drawBg(ctx, S) {
        ctx.fillStyle = S.sky[0]; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = S.sky[1]; ctx.fillRect(0, 90, W, 80);
        const cam = g ? g.camX : frame;
        for (let x = 0; x < W + 32; x += 4) {
          const wx = x + Math.floor(cam * 0.25 / 4) * 4;
          const h1 = 40 + Math.sin(wx * 0.02) * 18 + Math.sin(wx * 0.053) * 10;
          ctx.fillStyle = S.hill2; ctx.fillRect(x - ((cam * 0.25) % 4), 150 - h1, 4, h1 + 80);
        }
        for (let x = 0; x < W + 32; x += 4) {
          const wx = x + Math.floor(cam * 0.5 / 4) * 4;
          const h2 = 24 + Math.sin(wx * 0.031 + 1) * 12 + (hash(Math.floor(wx / 24)) > 0.7 ? 18 : 0);
          ctx.fillStyle = S.hill; ctx.fillRect(x - ((cam * 0.5) % 4), 175 - h2, 4, h2 + 60);
        }
      }
      function drawTiles(ctx, S) {
        const c0 = Math.floor(g.camX / TS), c1 = c0 + Math.ceil(W / TS) + 1, ox = Math.round(g.camX);
        for (let c = c0; c <= c1 && c < LEN; c++) for (let r = 0; r < MR; r++) {
          const t = map[c][r]; if (!t || t === 3) continue;
          const x = c * TS - ox, y = r * TS;
          if (t === 1) {
            const topT = r === 0 || map[c][r - 1] !== 1;
            ctx.fillStyle = S.dirt; ctx.fillRect(x, y, TS, TS);
            ctx.fillStyle = S.dirt2; ctx.fillRect(x + ((c * 5 + r * 3) % 12), y + ((c * 7 + r) % 12), 3, 2); ctx.fillRect(x + ((c * 11 + r * 7) % 13), y + ((c + r * 5) % 10) + 4, 2, 2);
            if (topT) { ctx.fillStyle = S.top; ctx.fillRect(x, y, TS, 4); ctx.fillStyle = S.dirt2; ctx.fillRect(x, y + 4, TS, 1); if ((c & 1) === 0) { ctx.fillStyle = S.top; ctx.fillRect(x + 3, y - 2, 2, 2); ctx.fillRect(x + 10, y - 1, 2, 1); } }
            if (c === LEN - 1) { ctx.fillStyle = S.dirt2; ctx.fillRect(x, y, TS, TS); }
          } else if (t === 2) {
            ctx.fillStyle = S.plat; ctx.fillRect(x, y, TS, 6);
            ctx.fillStyle = S.top; ctx.fillRect(x, y, TS, 2);
            ctx.fillStyle = S.dirt2; ctx.fillRect(x, y + 5, TS, 1); ctx.fillRect(x + 7, y + 6, 2, 3);
          } else if (t === 4) {
            ctx.fillStyle = (frame >> 3) & 1 ? '#ff5010' : '#ff8020'; ctx.fillRect(x, y + 4, TS, TS - 4);
            ctx.fillStyle = '#ffe040'; ctx.fillRect(x + ((frame >> 2) + c * 5) % 14, y + 4, 3, 2);
          }
        }
      }
      function drawWater(ctx) {
        const c0 = Math.floor(g.camX / TS), c1 = c0 + Math.ceil(W / TS) + 1, ox = Math.round(g.camX);
        ctx.globalAlpha = 0.55;
        for (let c = c0; c <= c1 && c < LEN; c++) for (let r = 0; r < MR; r++) if (map[c][r] === 3) {
          const x = c * TS - ox, y = r * TS;
          ctx.fillStyle = '#2060c0'; ctx.fillRect(x, y, TS, TS);
          if (r === 0 || map[c][r - 1] !== 3) { ctx.fillStyle = '#a0e0ff'; ctx.fillRect(x, y + ((frame >> 3) + c) % 2, TS, 2); }
        }
        ctx.globalAlpha = 1;
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x - g.camX), y = Math.round(e.y);
        if (e.kind === 'pot') {
          ctx.fillStyle = '#803010'; ctx.fillRect(x - 6, y - 12, 12, 12); ctx.fillRect(x - 4, y - 14, 8, 2);
          ctx.fillStyle = '#c06030'; ctx.fillRect(x - 5, y - 11, 10, 3); ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, y - 7, 4, 3);
          return;
        }
        if (e.kind === 'drop') {
          const ice = g.stage === 3;
          ctx.fillStyle = ice ? '#c0e8ff' : '#806050';
          ctx.fillRect(x - 4, y - 14, 8, 6); ctx.fillRect(x - 3, y - 8, 6, 4); ctx.fillRect(x - 1, y - 4, 2, 4);
          ctx.fillStyle = ice ? '#ffffff' : '#a08070'; ctx.fillRect(x - 3, y - 14, 2, 6);
          return;
        }
        const S = ES[e.kind][e.dir > 0 ? 'R' : 'L'];
        let yy = y - S.height;
        if (e.kind === 'bird') yy = y - 3 + ((e.t >> 3) & 1);
        ctx.drawImage(S, x - (S.width >> 1), yy);
        if (e.flash > 0) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, yy + 1, 10, S.height - 2); ctx.globalAlpha = 1; }
      }
      function drawBoss(ctx, B) {
        const x = Math.round(B.x - g.camX), y = Math.round(B.y);
        if (B.dead && (frame & 2)) return;
        const fl = B.flash > 0;
        ctx.save();
        if (B.kind === 'wizard') ctx.globalAlpha = Math.max(0.1, B.alpha);
        switch (B.kind) {
          case 'golem': {
            const sk = fl ? '#ffffff' : '#7a6a5a', dk = '#4a3a2a', lt = '#a09080';
            ctx.fillStyle = dk; ctx.fillRect(x - 27, y - 60, 54, 52); ctx.fillRect(x - 22, y - 10, 14, 10); ctx.fillRect(x + 8, y - 10, 14, 10);
            ctx.fillStyle = sk; ctx.fillRect(x - 25, y - 58, 50, 48);
            ctx.fillStyle = lt; ctx.fillRect(x - 23, y - 56, 46, 5); ctx.fillRect(x - 18, y - 46, 6, 14);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 18, y - 44, 10, 6); ctx.fillRect(x + 2, y - 44, 10, 6);
            ctx.fillStyle = '#e02020'; ctx.fillRect(x - 15, y - 43, 4, 4); ctx.fillRect(x + 5, y - 43, 4, 4);
            ctx.fillStyle = '#200808'; ctx.fillRect(x - 16, y - 30, 28, 6 + (B.mouth > 0 ? 8 : 0));
            ctx.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 15 + i * 6, y - 30, 3, 3);
            ctx.fillStyle = sk; ctx.fillRect(x - 36, y - 40, 11, 24); ctx.fillRect(x + 25, y - 40, 11, 24);
            break;
          }
          case 'bigfish': {
            const b = fl ? '#ffffff' : '#c03040', bl = '#ff8090', dk = '#601020';
            const d = B.dir || -1;
            ctx.fillStyle = dk; ctx.fillRect(x - 28, y - 30, 56, 28);
            ctx.fillStyle = b; ctx.fillRect(x - 26, y - 28, 52, 24); ctx.fillRect(x - 20, y - 32, 40, 32);
            ctx.fillStyle = bl; ctx.fillRect(x - 20, y - 10, 40, 6);
            ctx.fillStyle = dk; ctx.fillRect(x - d * 30 - 6, y - 30, 12, 26);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x + d * 14 - 4, y - 26, 8, 8); ctx.fillStyle = '#000'; ctx.fillRect(x + d * 16 - 2, y - 24, 3, 4);
            ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) ctx.fillRect(x + d * (20 + (i & 1) * 3) - 1, y - 16 + i * 3, 3, 2);
            break;
          }
          case 'firedemon': {
            const b = fl ? '#ffffff' : '#e04010', o = '#ffb020', dk = '#601008';
            for (let i = 0; i < 6; i++) { ctx.fillStyle = (i + (frame >> 2)) & 1 ? '#ff6010' : '#ffd040'; ctx.fillRect(x - 18 + i * 6, y - 4 + ((frame + i * 3) % 6), 5, 8); }
            ctx.fillStyle = dk; ctx.fillRect(x - 20, y - 44, 40, 40);
            ctx.fillStyle = b; ctx.fillRect(x - 18, y - 42, 36, 36);
            ctx.fillStyle = o; ctx.fillRect(x - 14, y - 34, 10, 6); ctx.fillRect(x + 4, y - 34, 10, 6);
            ctx.fillStyle = '#000'; ctx.fillRect(x - 10, y - 32, 3, 3); ctx.fillRect(x + 8, y - 32, 3, 3);
            ctx.fillStyle = '#300000'; ctx.fillRect(x - 10, y - 20, 20, 6);
            ctx.fillStyle = o; ctx.fillRect(x - 24, y - 50, 6, 12); ctx.fillRect(x + 18, y - 50, 6, 12);
            break;
          }
          case 'icebeast': {
            const b = fl ? '#c0e0ff' : '#f0f8ff', dk = '#6080a0';
            ctx.fillStyle = dk; ctx.fillRect(x - 25, y - 58, 50, 52); ctx.fillRect(x - 22, y - 8, 16, 8); ctx.fillRect(x + 6, y - 8, 16, 8);
            ctx.fillStyle = b; ctx.fillRect(x - 23, y - 56, 46, 48);
            ctx.fillStyle = '#80a0c0'; ctx.fillRect(x - 16, y - 44, 32, 18);
            ctx.fillStyle = '#ff2040'; ctx.fillRect(x - 12, y - 40, 5, 5); ctx.fillRect(x + 7, y - 40, 5, 5);
            ctx.fillStyle = '#203040'; ctx.fillRect(x - 8, y - 32, 16, 5);
            ctx.fillStyle = b; ctx.fillRect(x - 34, y - 46, 11, 28); ctx.fillRect(x + 23, y - 46, 11, 28);
            break;
          }
          default: {
            const b = fl ? '#ffffff' : '#6020a0', dk = '#300850';
            ctx.fillStyle = dk; ctx.fillRect(x - 13, y - 30, 26, 30); ctx.fillRect(x - 16, y - 8, 32, 8);
            ctx.fillStyle = b; ctx.fillRect(x - 11, y - 28, 22, 28); ctx.fillRect(x - 14, y - 6, 28, 6);
            ctx.fillStyle = '#f0c090'; ctx.fillRect(x - 6, y - 36, 12, 10);
            ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 4, y - 33, 2, 2); ctx.fillRect(x + 2, y - 33, 2, 2);
            ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 5, y - 27, 10, 8);
            ctx.fillStyle = dk; ctx.fillRect(x - 8, y - 44, 16, 9); ctx.fillRect(x - 3, y - 50, 6, 6);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 12, y - 40, 2, 34); ctx.fillStyle = (frame & 4) ? '#40ffff' : '#ff40ff'; ctx.fillRect(x + 10, y - 44, 6, 6);
          }
        }
        ctx.restore();
      }
      function drawToki(ctx) {
        const p = g.p;
        const x = Math.round(p.x - g.camX), y = Math.round(p.y);
        if (!p.alive) {
          if (g.phase === 'over') return;
          ctx.save(); ctx.translate(x, y - 10); ctx.rotate(Math.PI); ctx.drawImage(TOKI.AR, -8, -9); ctx.restore();
          return;
        }
        if (p.inv > 0 && (frame & 2)) return;
        const k = !p.ground ? 'J' : (p.anim >> 3) & 1 ? 'B' : 'A';
        const S = TOKI[k + (p.dir > 0 ? 'R' : 'L')];
        ctx.drawImage(S, x - 8, y - 17 - 4);
        if (p.helmet) { ctx.fillStyle = '#e0c020'; ctx.fillRect(x - 5, y - 23, 10, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 23, 2, 4); ctx.fillStyle = '#a08010'; ctx.fillRect(x + p.dir * 4 - 1, y - 19, 4, 1); }
        if (p.spitT > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + p.dir * 7 - 1, y - 16, 3, 2); }
        if (p.shoes > 0) { ctx.fillStyle = (frame & 4) ? '#40ffff' : '#2080ff'; ctx.fillRect(x - 6, y - 2, 4, 2); ctx.fillRect(x + 2, y - 2, 4, 2); }
      }
      function drawItem(ctx, it, sx) {
        const x = Math.round(it.x - sx), y = Math.round(it.y);
        if (it.t > 560 && (frame & 4)) return;
        switch (it.k) {
          case 'coin': drawCoin(ctx, x, y - 5); break;
          case 'double': case 'triple': case 'fire':
            disc(ctx, x, y - 7, 7, '#000'); disc(ctx, x, y - 7, 6, it.k === 'fire' ? '#ff6020' : it.k === 'triple' ? '#40c0ff' : '#40ff60');
            text(ctx, it.k[0], x - 2, y - 10, '#000'); break;
          case 'helmet': ctx.fillStyle = '#e0c020'; ctx.fillRect(x - 7, y - 10, 14, 7); ctx.fillRect(x - 5, y - 12, 10, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 12, 2, 9); ctx.fillStyle = '#806010'; ctx.fillRect(x + 4, y - 4, 5, 2); break;
          case 'shoes': ctx.fillStyle = '#2080ff'; ctx.fillRect(x - 7, y - 7, 6, 5); ctx.fillRect(x + 1, y - 7, 6, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 7, y - 3, 14, 2); break;
          case 'clock': disc(ctx, x, y - 7, 7, '#ffffff'); disc(ctx, x, y - 7, 5, '#ffe060'); ctx.fillStyle = '#000'; ctx.fillRect(x, y - 11, 1, 4); ctx.fillRect(x, y - 7, 3, 1); break;
          default: disc(ctx, x, y - 6, 6, '#e02060'); ctx.fillStyle = '#40c040'; ctx.fillRect(x - 1, y - 14, 3, 3);
        }
      }
      function drawCoin(ctx, x, y) {
        const w = [5, 4, 2, 4][(frame >> 3) & 3];
        ctx.fillStyle = '#a07000'; ctx.fillRect(x - w, y - 5, w * 2, 10);
        ctx.fillStyle = '#ffd030'; ctx.fillRect(x - w + 1, y - 4, Math.max(1, w * 2 - 2), 8);
        ctx.fillStyle = '#ffffa0'; ctx.fillRect(x - w + 1, y - 4, 1, 4);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 12);
        otext(ctx, '1P', 3, 3, '#ffd040'); otext(ctx, String(g ? g.score : 0).padStart(7, ' '), 62, 3, '#ffffff', 1, 'right');
        otext(ctx, 'HI', 70, 3, '#ff4040'); otext(ctx, String(hi).padStart(7, ' '), 120, 3, '#ffffff', 1, 'right');
        if (!g) return;
        otext(ctx, 'TIME', 130, 3, '#40e0ff'); otext(ctx, String(g.time), 178, 3, g.time <= 20 && (frame & 16) ? '#ff4040' : '#ffffff', 1, 'right');
        drawCoin(ctx, 190, 6); otext(ctx, 'X' + g.coinsN, 197, 3, '#ffd030');
        otext(ctx, 'L' + g.lives, W - 3, 3, '#ffffff', 1, 'right');
        const p = g.p;
        if (p.wep) { ctx.fillStyle = '#000'; ctx.fillRect(3, H - 10, 50, 7); ctx.fillStyle = p.wep === 'fire' ? '#ff6020' : p.wep === 'triple' ? '#40c0ff' : '#40ff60'; ctx.fillRect(4, H - 9, 48 * p.wepT / 1200, 5); }
        if (g.boss && !g.boss.dead) { otext(ctx, STAGES[g.stage].bname, W - 3, H - 20, '#ff6060', 1, 'right'); ctx.fillStyle = '#300'; ctx.fillRect(W - 103, H - 10, 100, 6); ctx.fillStyle = '#ff3030'; ctx.fillRect(W - 103, H - 10, Math.max(0, 100 * g.boss.hp / g.boss.maxhp), 6); }
      }
      function drawTitle(ctx) {
        drawBg(ctx, STAGES[0]);
        ctx.fillStyle = STAGES[0].dirt; ctx.fillRect(0, 192, W, 32); ctx.fillStyle = STAGES[0].top; ctx.fillRect(0, 192, W, 4);
        const ly = 30;
        otext(ctx, 'TOKI', W / 2 + 3, ly + 3, '#301000', 6, 'center');
        const bands = [[0, 14, '#fff080'], [14, 28, '#ffc020'], [28, 42, '#e06010']];
        for (const [a, b, col] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'TOKI', W / 2, ly, col, 6, 'center'); ctx.restore(); }
        const page = Math.floor(titleT / 500) % 2;
        if (page === 0) {
          otext(ctx, 'JUJU DENSETSU', W / 2, 80, '#ffffff', 1, 'center');
          ctx.drawImage(TOKI[((frame >> 4) & 1 ? 'B' : 'A') + 'R'], W / 2 - 16, 98, 32, 34);
          otext(ctx, 'THE WIZARD VOOKIMEDLO HAS', W / 2, 140, '#ffffff', 1, 'center');
          otext(ctx, 'TURNED YOU INTO AN APE AND', W / 2, 151, '#ffffff', 1, 'center');
          otext(ctx, 'TAKEN MIHO.  SPIT BACK!', W / 2, 162, '#ffff60', 1, 'center');
        } else {
          const its = [['double', 'DOUBLE SPIT'], ['triple', 'TRIPLE SPIT'], ['fire', 'FIRE BALL'], ['helmet', 'HELMET'], ['shoes', 'JUMP SHOES'], ['clock', 'TIME +30']];
          its.forEach((q, i) => { drawItem(ctx, { k: q[0], x: 74 + (i >= 3 ? 90 : 0), y: 100 + (i % 3) * 20, t: 0 }, 0); otext(ctx, q[1], 84 + (i >= 3 ? 90 : 0) - 70 + 70, 92 + (i % 3) * 20, '#ffffff'); });
          drawCoin(ctx, 74, 162); otext(ctx, '50 COINS = 1UP', 84, 159, '#ffd030');
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) otext(ctx, 'INSERT COIN', W / 2, 178, '#ff4040', 1, 'center'); }
        else if ((frame >> 5) & 1) otext(ctx, 'PUSH START BUTTON', W / 2, 178, '#ffffff', 1, 'center');
        otext(ctx, '\u00a9 1989 TAD CORPORATION', W / 2, 200, '#ffffff', 1, 'center');
        otext(ctx, credStr(api), W / 2, 212, '#ffffa0', 1, 'center');
        drawHUD(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) { drawTitle(ctx); return; }
        const S = STAGES[g.stage];
        if (g.phase === 'ending') {
          drawBg(ctx, STAGES[4]);
          otext(ctx, 'CONGRATULATIONS !', W / 2, 60, '#ffff40', 2, 'center');
          otext(ctx, 'THE SPELL IS BROKEN', W / 2, 90, '#ffffff', 1, 'center');
          otext(ctx, 'TOKI AND MIHO ARE TOGETHER', W / 2, 104, '#ffffff', 1, 'center');
          otext(ctx, 'BUT THE JOURNEY CONTINUES...', W / 2, 130, '#80e0ff', 1, 'center');
          ctx.drawImage(TOKI.AR, W / 2 - 24, 150, 32, 34);
          ctx.fillStyle = '#f0b880'; ctx.fillRect(W / 2 + 14, 154, 10, 10); ctx.fillStyle = '#ff60a0'; ctx.fillRect(W / 2 + 12, 164, 14, 20); ctx.fillStyle = '#402010'; ctx.fillRect(W / 2 + 13, 150, 12, 5);
          drawHUD(ctx);
          return;
        }
        drawBg(ctx, S);
        ctx.save();
        if (g.shake > 0) ctx.translate(((frame >> 1) & 1) * 2 - 1, 0);
        drawTiles(ctx, S);
        for (const cn of g.coins) if (!cn.got && cn.x > g.camX - 10 && cn.x < g.camX + W + 10) drawCoin(ctx, Math.round(cn.x - g.camX), Math.round(cn.y));
        for (const it of g.items) drawItem(ctx, it, g.camX);
        if (g.boss) drawBoss(ctx, g.boss);
        for (const e of g.en) drawEnemy(ctx, e);
        drawToki(ctx);
        for (const s of g.pb) {
          const x = Math.round(s.x - g.camX), y = Math.round(s.y);
          if (s.big) { disc(ctx, x, y, 5, '#ff4010'); disc(ctx, x, y, 3, '#ffe040'); }
          else { disc(ctx, x, y, 3, '#ff8020'); disc(ctx, x, y, 1.5, '#ffff80'); }
        }
        for (const b of g.eb) {
          const x = Math.round(b.x - g.camX), y = Math.round(b.y), r = b.r || 3;
          const col = b.k === 'rock' ? '#907050' : b.k === 'fire' ? ((frame & 2) ? '#ff4010' : '#ffc020') : b.k === 'ice' ? '#c0f0ff' : b.k === 'bubble' ? '#a0e0ff' : b.k === 'spear' ? '#c0c0c0' : '#ff40ff';
          if (b.k === 'spear') { ctx.fillStyle = col; ctx.fillRect(x - 6, y - 1, 12, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + (b.vx > 0 ? 4 : -6), y - 2, 2, 4); continue; }
          disc(ctx, x, y, r, col); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 2, 2, 2);
        }
        drawWater(ctx);
        for (const f of g.fx) { ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x - g.camX), Math.round(f.y), 2, 2); }
        for (const q of g.pops) otext(ctx, q.s, Math.round(q.x - g.camX), q.y, q.c, 1, 'center');
        ctx.restore();
        if (g.phase === 'intro') {
          otext(ctx, 'STAGE ' + (g.stage + 1), W / 2, 70, '#ffffff', 2, 'center');
          otext(ctx, S.name, W / 2, 92, '#ffd040', 1, 'center');
          if (g.loop) otext(ctx, 'ROUND ' + (g.loop + 1), W / 2, 104, '#ff8080', 1, 'center');
        }
        if (g.bossOn && g.boss && g.boss.t < 120 && (frame & 8)) otext(ctx, S.bname, W / 2, 60, '#ff4040', 2, 'center');
        if (g.phase === 'clear') {
          otext(ctx, 'STAGE CLEAR', W / 2, 70, '#ffff40', 2, 'center');
          if (g.phaseT < 220) otext(ctx, 'TIME BONUS ' + g.bonus, W / 2, 96, '#ffffff', 1, 'center');
        }
        if (g.phase === 'over') otext(ctx, 'GAME OVER', W / 2, 90, '#ff4040', 2, 'center');
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ god() { if (g && g.p.alive) g.p.inv = 5; }, sum: () => g && { ph: g.phase, st: g.stage, loop: g.loop, sc: g.score, lv: g.lives, x: Math.round(g.p.x), cam: Math.round(g.camX), en: g.en.length, boss: g.boss ? g.boss.hp : null, time: g.time, wep: g.p.wep }, g: () => g, tile });
      return { update, render, destroy() { } };
    }
  });
})();
