// Strider (Capcom, 1989) -- from-scratch recreation for the MAME32 Game Room.
// Run, somersault, cling to walls, hang from ceilings and slash with the cypher.
(function () {
  'use strict';
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
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
  const mirror = rows => rows.map(r => r.split('').reverse().join(''));
  function pair(rows, pal) { return [spr(rows, pal), spr(mirror(rows), pal)]; }

  // ---------- Hiryu (faces right) ----------
  const TOP = [
    '.....KKKK.....', '....KKKKKK....', '....KSSSSK....', '....KSSKS.....', '.....SSSS.....', '..RRRRRRRR....',
    '.RR.bBBBBb....', '.R..BBBBBBSS..', '....BBBBBB.G..', '....BBBBBB....', '....YYYYYY....', '....BBBBBB....'];
  const STAND = TOP.concat(['....BB..BB....', '....BB..BB....', '....BB..BB....', '....BB..BB....', '...BB....BB...', '...BB....BB...', '...KK....KK...', '..KKK....KKK..']);
  const RUN1 = TOP.concat(['....BBBBBB....', '...BBB..BBB...', '..BBB....BBB..', '.BBB......BB..', '.BB........BB.', 'KK.........KK.', 'K...........KK', '..............']);
  const RUN2 = TOP.concat(['....BBBBBB....', '.....BBBB.....', '.....BBBB.....', '....BBBBB.....', '....BB.BB.....', '....BB..BB....', '....KK..BB....', '....KKK.KK....']);
  const CROUCH = ['.....KKKK.....', '....KKKKKK....', '....KSSSSK....', '....KSSKS.....', '..RRRSSSSRR...', '.RR.bBBBBbSS..', '.R..BBBBBB.G..', '....YYYYYY....', '...BBBBBBBB...', '..BBBB..BBBB..', '..KKK....KKK..', '..KKK....KKK..'];
  const FLIP = ['....BBBBB.....', '...BBBBBBB....', '..BBYYBBBBB...', '.BBBYKKKKBBB..', '.BBYKKKKKKBB..', '.BBYKSSSSKBB..', '.BBYKSSSSKBB..', '.BBBKKSSKKBB..', '..BBRRRRRBB...', '...RRBBBBR....', '..RR.BBBB.....', '.RR...........'];
  const HANG = ['....S....S....', '....S....S....', '....BB..BB....', '....BKKKKB....', '....KKKKKK....', '....KSSSSK....', '....KSSKS.....', '.....SSSS.....', '..RRRRRRRR....', '.RR.bBBBBb....', '.R..BBBBBB....', '....BBBBBB....', '....YYYYYY....', '....BBBBBB....', '....BB..BB....', '....BB..BB....', '....BB..BB....', '....BB..BB....', '....BB..BB....', '....KK..KK....'];
  const CLING = ['.....KKKK..S..', '....KKKKKKBS..', '....KSSSSKB...', '....KSSKSB....', '.....SSSSB....', '..RRRRRRRR....', '.RR.bBBBBb....', '.R..BBBBBBB...', '....BBBBBB.SS.', '....BBBBBB....', '....YYYYYY....', '....BBBBBB....', '....BB..BBB...', '....BB...BBB..', '....BB....BB..', '....BB....KK..', '....BB........', '...BB.........', '...KK.........', '..KKK.........'];
  const SLIDE = ['.....................', '..........KKKK.......', '.........KKKKKK......', '.....RRRRKSSSSK......', '....RRBBBBBSSKS......', '..BBBBBBBBBBBSSS.G...', '.BBBBBBBYYBBBB.......', 'BBB......YBBBBBB.....', 'KK.........BBBBBBBKK.', 'K..............BBBKKK'];
  const HPAL = { K: '#181820', S: '#f0b088', R: '#e82020', B: '#2848c8', b: '#5880ff', Y: '#ffd040', G: '#b0b0b8' };
  // ---------- enemies ----------
  const SOLD_TOP = ['...MMMMM....', '..MMMMMMM...', '..MSSSSSM...', '...SSKSK....', '...SSSSS....', '..GGGGGG....', '.GGGGGGGWWWW', '.GSGGGGGW...', '.S.GGGGG....', '...GGGGG....', '...KKKKK....'];
  const SOLD1 = SOLD_TOP.concat(['...GG.GG....', '...GG.GG....', '..GG...GG...', '..GG...GG...', '..KK...KK...', '.KKK...KKK..']);
  const SOLD2 = SOLD_TOP.concat(['...GG.GG....', '....GGG.....', '....GGG.....', '...GG.GG....', '...KK.KK....', '..KKK.KKK...']);
  const DOG1 = ['..............GG..', '.............GGGG.', '.............GRGGW', 'G...GGGGGGGGGGGG..', '.GGGGGGGGGGGGGG...', '..GGHHHHHHHHGG....', '..GGGGGGGGGGG.....', '..G.G.....G.G.....', '.G...G...G...G....', '.K...K...K...K....'];
  const DOG2 = DOG1.slice(0, 7).concat(['...GG.....GG......', '...G.G....G.G.....', '...K.K....K.K.....']);
  const DRONE = ['......RRRR......', '....GGGGGGGG....', '..GGWWGGGGWWGG..', 'GGGGGGGGGGGGGGGG', '.HHHHHHHHHHHHHH.', '...GGGGGGGGGG...', '.....Y....Y.....'];
  const KICK1 = ['....KKKK....', '...KKKKKK...', '...KSSSSK...', '....SSKS....', '....SSSS....', '...RRRRRR...', '..RRRRRRRS..', '..SRRRRRR...', '....RRRR....', '....RRRR....', '...SS..SS...', '...SS..SS...', '...SS..SS...', '...SS..SS...', '..KK...KK...', '..KK...KK...'];
  const KICK2 = ['....KKKK....', '...KKKKKK...', '...KSSSSK...', '....SSKS....', '....SSSS....', '...RRRRRR...', '..RRRRRRRS..', '..SRRRRRR...', '....RRRR....', '....RRRRSSSS', '...SS....SSK', '...SS.......', '...SS.......', '...SS.......', '..KK........', '..KK........'];

  const W = 384, H = 224, T = 16, ROWS = 14;

  ArcadeRegistry.register({
    id: 'strider', title: 'Strider', year: 1989, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: run / climb / crouch \u00b7 Space: cypher slash \u00b7 X: jump (Down+X: slide; jump into walls and ceilings to cling) \u00b7 Enter: start',
    marquee: { bg: '#0a0a30', fg: '#ff3030', accent: '#40c0ff' },
    create(api) {
      const au = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => Math.random() * n | 0;
      const snd = {
        slash() { au.noise(0.09, { vol: 0.12, freq: 5000, slideTo: 1200, type: 'bandpass' }); au.tone(1800, 0.06, { type: 'sawtooth', vol: 0.04, slideTo: 3000 }); },
        jump() { au.tone(300, 0.1, { type: 'triangle', vol: 0.1, slideTo: 600 }); },
        land() { au.noise(0.03, { vol: 0.05, freq: 600 }); },
        hit() { au.tone(220, 0.12, { type: 'square', vol: 0.12, slideTo: 80 }); },
        kill() { au.noise(0.2, { vol: 0.16, freq: 1600, slideTo: 200 }); au.tone(600, 0.15, { type: 'square', vol: 0.06, slideTo: 100 }); },
        shot() { au.tone(1000, 0.05, { type: 'square', vol: 0.05, slideTo: 400 }); },
        hurt() { au.tone(160, 0.25, { type: 'sawtooth', vol: 0.15, slideTo: 60 }); },
        item() { au.melody([[784, .05], [988, .05], [1319, .05], [1568, .12]], { type: 'square', vol: 0.12 }); },
        boom() { au.noise(0.5, { vol: 0.22, freq: 900, slideTo: 50 }); },
        die() { au.melody([[659, .1], [622, .1], [587, .1], [554, .1], [523, .1], [392, .5]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .25], [988, .1], [1047, .5]], { type: 'square', vol: 0.12 }); },
        grab() { au.tone(1200, 0.03, { type: 'square', vol: 0.06 }); }
      };
      // stage intro fanfare (an original heroic motif)
      const FANFARE = [[392, .12], [523, .12], [587, .12], [659, .36], [587, .12], [659, .12], [784, .48]];

      const SP = {
        stand: pair(STAND, HPAL), run1: pair(RUN1, HPAL), run2: pair(RUN2, HPAL), crouch: pair(CROUCH, HPAL), flip: pair(FLIP, HPAL),
        hang: pair(HANG, HPAL), cling: pair(CLING, HPAL), slide: pair(SLIDE, HPAL)
      };
      const SPAL = [{ M: '#6a4a2a', S: '#e8a878', K: '#202018', G: '#6a7a50', W: '#404040' }, { M: '#e8e8e8', S: '#e8a878', K: '#202018', G: '#8aa0b8', W: '#404040' }, { M: '#303030', S: '#e8a878', K: '#101010', G: '#505868', W: '#c0c0c0' }];
      const ES = {
        sold: SPAL.map(p => [pair(SOLD1, p), pair(SOLD2, p)]),
        dog: [pair(DOG1, { G: '#9098a8', R: '#ff2020', W: '#ffffff', H: '#506070', K: '#202020' }), pair(DOG2, { G: '#9098a8', R: '#ff2020', W: '#ffffff', H: '#506070', K: '#202020' })],
        drone: spr(DRONE, { R: '#ff3030', G: '#a0a8b8', W: '#40e0ff', H: '#505868', Y: '#ffd040' }),
        kick: [pair(KICK1, { K: '#202020', S: '#f0b088', R: '#d02060' }), pair(KICK2, { K: '#202020', S: '#f0b088', R: '#d02060' })]
      };

      const THEMES = [
        { name: 'KAZAKH', sky: ['#100820', '#281038', '#502048', '#903050', '#d06040'], far: '#1a0c24', tile: '#7a6a5a', tile2: '#5a4a3a', top: '#a89070', win: '#ffd060', boss: 'serpent', bname: 'OUROBOROS', len: 230, sp: 0 },
        { name: 'SIBERIA', sky: ['#5878a8', '#7898c0', '#98b8d8', '#b8d0e8', '#d8e8f8'], far: '#8898b8', tile: '#5878a0', tile2: '#384868', top: '#f8f8ff', win: '#a0e0ff', boss: 'gorilla', bname: 'MECHA PON', len: 250, sp: 1 },
        { name: 'AERIAL BATTLESHIP', sky: ['#000010', '#080828', '#101840', '#182858', '#203870'], far: '#283048', tile: '#707888', tile2: '#484e5c', top: '#b0b8c8', win: '#ff4040', boss: 'master', bname: 'GRAND MASTER', len: 270, sp: 2 }
      ];

      let hi = api.getHiScore(30000), mode = 'title', titleT = 0, frame = 0, coinFlash = 0;
      let g = null;

      function tryStart() {
        if (api.useCredit()) { newGame(); return; }
        coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.15 });
      }
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, loop: 0, nextExtra: 50000, maxhp: 3 };
        mode = 'game'; startStage();
      }
      function th() { return THEMES[g.stage]; }
      function diff() { return g.stage + g.loop * 3; }
      function addScore(n, x, y) {
        g.score += n;
        if (x != null) g.pops.push({ x, y, t: 45, s: String(n) });
        if (g.score > hi) hi = g.score;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 100000; snd.item(); }
      }

      // ---------- level generation ----------
      function genLevel() {
        const len = th().len + g.loop * 20;
        const cols = len + 26;
        const map = new Uint8Array(cols * ROWS);
        const spawns = [];
        const set = (x, y) => { if (x >= 0 && x < cols && y >= 0 && y < ROWS) map[x * ROWS + y] = 1; };
        const ground = (x, h) => { for (let y = ROWS - h; y < ROWS; y++) set(x, y); };
        let x = 0, h = 3;
        for (; x < 14; x++) ground(x, h);
        const d = diff();
        let lastKind = '';
        while (x < len) {
          const r = Math.random();
          let kind = r < 0.22 ? 'flat' : r < 0.38 ? 'step' : r < 0.52 ? 'pit' : r < 0.66 ? 'tower' : r < 0.8 ? 'overhang' : r < 0.9 ? 'plats' : 'hall';
          if (kind === lastKind && kind !== 'flat') kind = 'flat';
          lastKind = kind;
          if (kind === 'flat' || kind === 'step') {
            if (kind === 'step') h = Math.max(2, Math.min(6, h + (Math.random() < 0.5 ? -1 : 1) * (1 + ri(2))));
            const n = 6 + ri(7);
            for (let i = 0; i < n; i++) ground(x + i, h);
            const k = Math.random();
            if (k < 0.55) spawns.push({ x: (x + 2 + ri(n - 3)) * T, y: (ROWS - h) * T, k: 'sold' });
            else if (k < 0.75) spawns.push({ x: (x + n - 1) * T, y: (ROWS - h) * T, k: 'dog' });
            else if (k < 0.88 && d >= 1) spawns.push({ x: (x + n - 2) * T, y: (ROWS - h) * T, k: 'kick' });
            if (Math.random() < 0.2) spawns.push({ x: (x + (n >> 1)) * T + 8, y: (ROWS - h - 3) * T, k: 'capsule' });
            x += n;
          } else if (kind === 'pit') {
            const n = 2 + ri(3);
            x += n;
            for (let i = 0; i < 5; i++) ground(x + i, h);
            x += 5;
          } else if (kind === 'tower') {
            const th2 = Math.min(ROWS - 3, h + 4 + ri(3));
            for (let i = 0; i < 2; i++) ground(x + i, h);
            x += 2;
            const n = 3 + ri(3);
            for (let i = 0; i < n; i++) ground(x + i, th2);
            spawns.push({ x: (x + n - 1) * T, y: (ROWS - th2) * T, k: Math.random() < 0.5 ? 'turret' : 'sold' });
            if (Math.random() < 0.3) spawns.push({ x: (x + 1) * T + 8, y: (ROWS - th2 - 2) * T, k: 'capsule' });
            x += n;
          } else if (kind === 'overhang') {
            // a pit too wide to jump, spanned by a slab Hiryu must hang from
            const n = 6 + ri(3);
            for (let i = 0; i < 2; i++) ground(x + i, h);
            const r0 = ROWS - h, cr = r0 - 5;
            for (let i = 0; i < n + 4; i++) set(x + i, cr);
            x += 2 + n;
            for (let i = 0; i < 5; i++) ground(x + i, h);
            if (Math.random() < 0.5) spawns.push({ x: (x - n + (n >> 1)) * T, y: (cr + 1) * T + 30, k: 'drone' });
            x += 5;
          } else if (kind === 'plats') {
            const n = 7 + ri(3);
            const r0 = ROWS - h;
            const p1 = x + 2, p2 = x + 2 + ((n - 2) >> 1) + 1;
            set(p1, r0 - 1); set(p1 + 1, r0 - 1); set(p2, r0 - 2); set(p2 + 1, r0 - 2);
            x += n;
            for (let i = 0; i < 5; i++) ground(x + i, h);
            x += 5;
          } else {
            // low hall: a ceiling to run under / hang from, with soldiers inside
            const n = 8 + ri(5);
            const r0 = ROWS - h, cr = Math.max(1, r0 - 5);
            for (let i = 0; i < n; i++) { ground(x + i, h); set(x + i, cr); }
            spawns.push({ x: (x + n - 2) * T, y: r0 * T, k: 'sold' });
            if (d >= 1) spawns.push({ x: (x + n - 4) * T, y: r0 * T, k: 'sold' });
            x += n;
          }
        }
        // run-up and boss arena
        for (let i = 0; i < 4; i++) ground(x + i, h);
        x += 4;
        g.arena = x;
        for (; x < cols; x++) ground(x, 2);
        for (let y = 0; y < ROWS; y++) set(cols - 1, y);
        g.map = map; g.cols = cols; g.spawns = spawns.sort((a, b) => a.x - b.x); g.spawnI = 0;
      }
      function solid(tx, ty) {
        if (tx < 0 || tx >= g.cols) return true;
        if (ty < 0 || ty >= ROWS) return false;
        return g.map[tx * ROWS + ty] === 1;
      }
      function boxHits(x, y, w, h) {
        const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 1) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 1) / T);
        for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) if (solid(tx, ty)) return true;
        return false;
      }
      // generic body: o.x centre, o.y feet; returns {wall, ceil, ground}
      function moveBody(o, w, h) {
        const res = { wall: 0, ceil: false, land: false };
        const hw = w / 2;
        let nx = o.x + o.vx;
        if (boxHits(nx - hw, o.y - h, w, h)) {
          if (o.vx > 0) nx = Math.floor((nx + hw) / T) * T - hw - 0.01; else if (o.vx < 0) nx = (Math.floor((nx - hw) / T) + 1) * T + hw + 0.01;
          if (boxHits(nx - hw, o.y - h, w, h)) nx = o.x;
          res.wall = Math.sign(o.vx) || 1; o.vx = 0;
        }
        o.x = nx;
        let ny = o.y + o.vy;
        if (boxHits(o.x - hw, ny - h, w, h)) {
          if (o.vy > 0) { ny = Math.floor(ny / T) * T; res.land = true; }
          else if (o.vy < 0) { ny = (Math.floor((ny - h) / T) + 1) * T + h; res.ceil = true; }
          if (boxHits(o.x - hw, ny - h, w, h)) ny = o.y;
          o.vy = 0;
        }
        o.y = ny;
        return res;
      }
      const onGround = (o, w) => boxHits(o.x - w / 2, o.y, w, 1);

      // ---------- stage ----------
      function startStage() {
        genLevel();
        g.p = { x: 40, y: (ROWS - 3) * T, vx: 0, vy: 0, face: 1, st: 'air', hp: g.maxhp, inv: 0, slash: 0, slashId: 0, anim: 0, grabCD: 0, safeX: 40, safeY: (ROWS - 3) * T, ph: 20, opts: [], ext: 0, t: 0 };
        g.cx = 0; g.en = []; g.eb = []; g.pshots = []; g.items = []; g.fx = []; g.pops = [];
        g.boss = null; g.time = 200 * 60; g.phase = 'intro'; g.phaseT = 160; g.droneT = 400; g.locked = false;
        au.melody(FANFARE, { type: 'square', vol: 0.11 });
      }

      // ---------- player ----------
      function hurt(dmg) {
        const p = g.p;
        if (p.inv > 0 || p.st === 'dead' || g.phase !== 'play') return;
        p.hp -= dmg || 1; snd.hurt();
        if (p.hp <= 0) { die(); return; }
        p.inv = 100; p.st = 'hurt'; p.vx = -p.face * 1.8; p.vy = -2.6; p.t = 0; p.slash = 0;
      }
      function die() {
        const p = g.p;
        p.st = 'dead'; p.t = 0; p.vy = -3; p.vx = -p.face * 1; p.hp = 0;
        g.phase = 'dying'; g.phaseT = 150; snd.die();
      }
      function respawn() {
        const p = g.p;
        p.x = p.safeX; p.y = p.safeY; p.vx = 0;
        if (g.locked) { p.x = g.arena * T + 48; p.y = (ROWS - 2) * T; } p.vy = 0; p.st = 'air'; p.hp = g.maxhp; p.inv = 150; p.slash = 0; p.opts = []; p.ext = 0;
        g.eb = []; g.time = Math.max(g.time, 120 * 60);
        g.en = g.en.filter(e => Math.abs(e.x - p.x) > 120 || e.k === 'boss');
        g.phase = 'play';
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .6]], { type: 'square', vol: 0.12 });
      }
      function slashBox() {
        const p = g.p;
        const reach = p.ext > 0 ? 50 : 32;
        const cyO = p.st === 'crouch' ? -8 : p.st === 'hang' ? -6 : -12;
        const x0 = p.face > 0 ? p.x : p.x - reach;
        return { x: x0, y: p.y + cyO - 18, w: reach, h: 32 };
      }
      function slashActive() { return g.p.slash > 3 && g.p.slash <= 12; }
      function updPlayer() {
        const p = g.p;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const jumpP = api.pressed('KeyX'), slashP = api.pressed('Space');
        if (p.inv > 0) p.inv--;
        if (p.grabCD > 0) p.grabCD--;
        if (p.ext > 0) p.ext--;
        if (p.slash > 0) p.slash--;
        p.t++;
        const dir = (R ? 1 : 0) - (L ? 1 : 0);
        if (slashP && p.slash <= 6 && p.st !== 'slide' && p.st !== 'hurt' && p.st !== 'dead') { p.slash = 14; p.slashId++; snd.slash(); }
        switch (p.st) {
          case 'ground':
          case 'crouch': {
            if (D && !(p.slash > 0 && p.st === 'ground')) {
              if (jumpP) { p.st = 'slide'; p.t = 0; p.vx = p.face * 3.6; p.ph = 12; snd.land(); break; }
              p.st = 'crouch'; p.ph = 12; p.vx = 0; if (dir) p.face = dir;
            } else {
              if (p.st === 'crouch' && !boxHits(p.x - 5, p.y - 20, 10, 20)) { p.st = 'ground'; p.ph = 20; }
              if (p.st === 'ground') {
                if (dir) p.face = dir;
                p.vx = p.slash > 0 ? 0 : dir * 2.1;
                if (dir && p.slash <= 0) p.anim++;
              }
            }
            if (jumpP && p.st !== 'slide' && !boxHits(p.x - 5, p.y - 22, 10, 22)) { p.st = 'air'; p.ph = 20; p.vy = -5.4; p.flip = dir !== 0; snd.jump(); moveBody(p, 10, 20); break; }
            p.vy = 0.5;
            const r = moveBody(p, 10, p.ph);
            if (!r.land && !onGround(p, 10)) { if (p.st === 'crouch' || p.st === 'ground') { p.st = 'air'; p.ph = 20; p.flip = false; } }
            else if (p.st !== 'air') { p.vy = 0; recordSafe(); }
            break;
          }
          case 'slide': {
            p.vy = 0.5;
            const r = moveBody(p, 10, 12);
            p.vx = p.face * Math.max(1, 3.6 - p.t * 0.08);
            if (!onGround(p, 10)) { p.st = 'air'; p.ph = 20; p.flip = false; break; }
            if (p.t > 26 || r.wall) {
              if (!boxHits(p.x - 5, p.y - 20, 10, 20)) { p.st = 'ground'; p.ph = 20; }
              else { p.st = 'crouch'; }
            }
            break;
          }
          case 'air':
          case 'hurt': {
            if (p.st === 'air') {
              if (dir) { p.vx += (dir * 2.1 - p.vx) * 0.25; p.face = dir; } else p.vx *= 0.96;
            }
            p.vy = Math.min(6, p.vy + 0.28);
            const r = moveBody(p, 10, p.ph);
            if (r.land) { p.st = D ? 'crouch' : 'ground'; p.ph = D ? 12 : 20; p.flip = false; snd.land(); break; }
            if (p.st === 'air' && p.grabCD <= 0) {
              if (r.ceil) { p.st = 'hang'; p.vy = 0; p.vx = 0; p.flip = false; snd.grab(); break; }
              if (r.wall && dir === r.wall && p.y < ROWS * T) {
                // only cling if there is wall alongside the body
                if (boxHits(p.x - 5 + r.wall * 2, p.y - 16, 10, 8)) { p.st = 'wall'; p.wdir = r.wall; p.face = r.wall; p.vy = 0; p.vx = 0; p.flip = false; snd.grab(); break; }
              }
            }
            if (p.st === 'hurt' && p.t > 30) p.st = 'air';
            break;
          }
          case 'wall': {
            const wd = p.wdir;
            p.vx = 0;
            if (jumpP) { p.st = 'air'; p.vx = -wd * 2.4; p.vy = -4.8; p.face = -wd; p.flip = true; p.grabCD = 10; snd.jump(); break; }
            if (U && p.y > 40) { p.vy = -1.4; p.anim++; } else if (D) { p.vy = 1.6; p.anim++; } else p.vy = 0;
            const r = moveBody(p, 10, 20);
            // reached the top of the wall: vault over
            if (!boxHits(p.x - 5 + wd * 3, p.y - 20, 10, 6)) { p.st = 'air'; p.vy = -3.6; p.vx = wd * 1.8; p.flip = true; p.grabCD = 8; break; }
            if (r.land || onGround(p, 10)) { if (D) { p.st = 'ground'; p.ph = 20; break; } }
            if (!boxHits(p.x - 5 + wd * 3, p.y - 14, 10, 12)) { p.st = 'air'; p.grabCD = 10; }
            if (r.ceil) p.vy = 0;
            break;
          }
          case 'hang': {
            if (D) { p.st = 'air'; p.vy = 0.5; p.grabCD = 14; break; }
            p.vx = dir * 1.4; if (dir) { p.face = dir; p.anim++; }
            p.vy = 0;
            moveBody(p, 10, 20);
            if (!boxHits(p.x - 3, p.y - 21, 6, 1)) { p.st = 'air'; p.grabCD = 10; }
            break;
          }
          case 'dead': {
            p.vy += 0.25; p.x += p.vx; p.y += p.vy;
            return;
          }
        }
        // camera
        const tx = p.x - W * 0.4;
        if (!g.locked) {
          g.cx += (tx - g.cx) * 0.12;
          g.cx = Math.max(0, Math.min(g.cols * T - W, g.cx));
          if (g.arena && p.x > g.arena * T + 40) { g.locked = true; }
        } else {
          const target = g.arena * T + 8;
          g.cx += Math.sign(target - g.cx) * Math.min(3, Math.abs(target - g.cx));
          if (p.x < g.cx + 6) { p.x = g.cx + 6; }
          if (Math.abs(g.cx - target) < 1 && !g.boss) spawnBoss();
        }
        if (p.x < g.cx + 5) p.x = g.cx + 5;
        if (p.y < 22) { p.y = 22; if (p.vy < 0) p.vy = 0; }
        if (p.y > H + 30 && p.st !== 'dead') { p.hp = 0; die(); }
        // options
        for (const o of p.opts) {
          o.a += 0.06; o.t--;
          o.x = p.x + Math.cos(o.a) * 22; o.y = p.y - 12 + Math.sin(o.a) * 16;
          if (--o.cd <= 0) {
            const tgt = nearestEnemy(o.x, o.y, 180);
            if (tgt) { const a = Math.atan2(tgt.y - tgt.h / 2 - o.y, tgt.x - o.x); g.pshots.push({ x: o.x, y: o.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, t: 50 }); o.cd = 24; }
            else o.cd = 6;
          }
        }
        p.opts = p.opts.filter(o => o.t > 0);
      }
      function recordSafe() {
        const p = g.p;
        if (p.st !== 'ground') return;
        // safe if solid ground under both sides of a 3-tile span
        const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
        if (solid(tx - 1, ty) && solid(tx, ty) && solid(tx + 1, ty) && !g.locked) { p.safeX = tx * T + 8; p.safeY = ty * T; }
      }
      function nearestEnemy(x, y, r) {
        let best = null, bd = r;
        for (const e of g.en) { if (e.k === 'capsule' || e.dead) continue; const d = Math.hypot(e.x - x, e.y - e.h / 2 - y); if (d < bd) { bd = d; best = e; } }
        if (!best && g.boss && g.boss.hp > 0) { const b = g.boss; const d = Math.hypot(b.x - x, b.y - y); if (d < r * 1.5) best = { x: b.x, y: b.y + 8, h: 16 }; }
        return best;
      }

      // ---------- enemies ----------
      function spawnFrom(s) {
        const base = { x: s.x, y: s.y, vx: 0, vy: 0, t: 0, hp: 1, hitId: -1, face: -1, anim: 0 };
        switch (s.k) {
          case 'sold': return Object.assign(base, { k: 'sold', w: 10, h: 17, pal: th().sp, cd: 60 + ri(60) });
          case 'dog': return Object.assign(base, { k: 'dog', w: 16, h: 10, cd: 0 });
          case 'kick': return Object.assign(base, { k: 'kick', w: 10, h: 16, cd: 40, hp: 2 });
          case 'turret': return Object.assign(base, { k: 'turret', w: 14, h: 12, cd: 80, hp: 3 });
          case 'capsule': return Object.assign(base, { k: 'capsule', w: 12, h: 12, y0: s.y });
          case 'drone': return Object.assign(base, { k: 'drone', w: 14, h: 8, y0: s.y, cd: 90 });
        }
        return null;
      }
      function enemyShot(x, y, tx, ty, sp, k) {
        const a = Math.atan2(ty - y, tx - x);
        g.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, k: k || 'b', t: 0 });
      }
      function bsp() { return Math.min(3.2, 2 + diff() * 0.15); }
      function updEnemy(e) {
        const p = g.p;
        e.t++;
        const dx = p.x - e.x;
        switch (e.k) {
          case 'sold':
            e.face = dx > 0 ? 1 : -1;
            if (Math.abs(dx) > 120) { e.vx = e.face * 0.7; e.anim++; }
            else { e.vx = 0; if (--e.cd <= 0) { e.cd = Math.max(40, 90 - diff() * 8) + ri(40); e.shoot = 10; enemyShot(e.x + e.face * 8, e.y - 11, e.x + e.face * 100, p.y - 12 + rnd(-6, 6), bsp(), 'b'); snd.shot(); } }
            if (e.shoot) e.shoot--;
            e.vy = Math.min(6, e.vy + 0.3);
            {
              // stop at ledges
              const ahead = e.x + e.face * 8;
              if (e.vx && !solid(Math.floor(ahead / T), Math.floor((e.y + 2) / T))) e.vx = 0;
              moveBody(e, e.w, e.h);
            }
            break;
          case 'dog':
            if (e.t === 1) e.face = dx > 0 ? 1 : -1;
            if (onGround(e, e.w)) {
              e.vx = e.face * (2.4 + diff() * 0.1); e.anim++;
              if (Math.abs(dx) < 70 && Math.sign(dx) === e.face && e.cd <= 0) { e.vy = -4.2; e.cd = 80; }
              const ahead = e.x + e.face * 10;
              if (!solid(Math.floor(ahead / T), Math.floor((e.y + 2) / T))) e.vy = -4;
            }
            if (e.cd > 0) e.cd--;
            e.vy = Math.min(6, e.vy + 0.28);
            { const r = moveBody(e, e.w, e.h); if (r.wall) e.face *= -1; }
            if (e.x < g.cx - 40 && e.face < 0) e.dead = true;
            break;
          case 'kick':
            e.face = dx > 0 ? 1 : -1;
            if (onGround(e, e.w)) {
              e.vx = 0; e.jump = false;
              if (--e.cd <= 0 && Math.abs(dx) < 150) { e.vy = -5; e.vx = Math.max(-3, Math.min(3, dx / 30)); e.jump = true; e.cd = 70 + ri(40); }
            }
            e.vy = Math.min(6, e.vy + 0.28);
            moveBody(e, e.w, e.h);
            break;
          case 'turret':
            e.face = dx > 0 ? 1 : -1;
            if (--e.cd <= 0 && Math.abs(dx) < 260) {
              e.cd = Math.max(60, 110 - diff() * 10);
              for (let i = -1; i <= 1; i++) { const a = Math.atan2(p.y - 12 - (e.y - 8), dx) + i * 0.25; g.eb.push({ x: e.x, y: e.y - 8, vx: Math.cos(a) * bsp(), vy: Math.sin(a) * bsp(), k: 'b', t: 0 }); }
              snd.shot();
            }
            break;
          case 'capsule':
            e.y = e.y0 + Math.sin(e.t * 0.06) * 3;
            break;
          case 'drone':
            e.face = dx > 0 ? 1 : -1;
            e.vx += Math.sign(dx) * 0.05; e.vx = Math.max(-1.6, Math.min(1.6, e.vx));
            e.x += e.vx; e.y = e.y0 + Math.sin(e.t * 0.05) * 18;
            if (--e.cd <= 0) { e.cd = Math.max(60, 120 - diff() * 10); enemyShot(e.x, e.y, p.x, p.y - 10, bsp() * 0.8, 'e'); snd.shot(); }
            break;
        }
        if (e.y > H + 40) e.dead = true;
        if (e.x < g.cx - 120 || e.x > g.cx + W + 200) e.dead = true;
        // contact damage
        if (e.k !== 'capsule' && overlap(e.x - e.w / 2, e.y - e.h, e.w, e.h, p.x - 4, p.y - p.ph, 8, p.ph)) {
          if (p.st === 'slide' && e.k !== 'turret') hitEnemy(e, 2);
          else hurt(1);
        }
      }
      function overlap(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
      function hitEnemy(e, dmg) {
        if (e.dead) return;
        e.hp -= dmg || 1; e.flash = 6;
        if (e.hp > 0) { snd.hit(); return; }
        e.dead = true;
        if (e.k === 'capsule') { dropItem(e.x, e.y - 6); g.fx.push({ k: 'spark', x: e.x, y: e.y - 6, t: 0 }); snd.hit(); return; }
        const pts = { sold: 100, dog: 200, kick: 300, turret: 500, drone: 300 }[e.k] || 100;
        addScore(pts, e.x, e.y - e.h - 6);
        g.fx.push({ k: 'boom', x: e.x, y: e.y - e.h / 2, t: 0 });
        snd.kill();
      }
      function dropItem(x, y) {
        const r = Math.random();
        const k = r < 0.3 ? 'hp' : r < 0.45 ? 'maxhp' : r < 0.65 ? 'opt' : r < 0.8 ? 'ext' : r < 0.95 ? 'pts' : 'oneup';
        g.items.push({ k, x, y, vy: -2, t: 0 });
      }
      function takeItem(it) {
        const p = g.p;
        switch (it.k) {
          case 'hp': p.hp = Math.min(g.maxhp, p.hp + 1); break;
          case 'maxhp': if (g.maxhp < 5) g.maxhp++; p.hp = g.maxhp; break;
          case 'opt': if (p.opts.length < 2) p.opts.push({ a: p.opts.length * Math.PI, t: 60 * 25, cd: 10, x: p.x, y: p.y }); else addScore(2000, it.x, it.y); break;
          case 'ext': p.ext = 60 * 20; break;
          case 'pts': addScore(5000, it.x, it.y); break;
          case 'oneup': g.lives++; break;
        }
        snd.item();
      }

      // ---------- bosses ----------
      function spawnBoss() {
        const k = th().boss, ax = g.arena * T + 8;
        const hp = { serpent: 28, gorilla: 34, master: 40 }[k] + g.loop * 10;
        const b = { k, hp, max: hp, t: 0, flash: 0, hitId: -1, x: ax + W - 60, y: 100, vx: 0, vy: 0, st: 'enter', trail: [], face: -1 };
        if (k === 'serpent') { b.x = ax + W + 40; b.y = 60; b.ph = 0; }
        if (k === 'gorilla') { b.x = ax + W + 30; b.y = (ROWS - 2) * T; }
        if (k === 'master') { b.x = ax + W / 2 + 80; b.y = 110; b.vis = 0; }
        g.boss = b;
        au.melody([[196, .15], [185, .15], [196, .15], [233, .3], [196, .4]], { type: 'sawtooth', vol: 0.1 });
      }
      function bossBoxes(b) {
        if (b.k === 'serpent') {
          const out = [{ x: b.x - 10, y: b.y - 10, w: 20, h: 20, head: true }];
          for (let i = 1; i <= 12; i++) { const s = b.trail[i * 7]; if (s) out.push({ x: s.x - 7, y: s.y - 7, w: 14, h: 14, head: false }); }
          return out;
        }
        if (b.k === 'gorilla') return [{ x: b.x - 20, y: b.y - 44, w: 40, h: 44, head: true }];
        return b.vis > 0.5 ? [{ x: b.x - 10, y: b.y - 14, w: 20, h: 28, head: true }] : [];
      }
      function updBoss() {
        const b = g.boss, p = g.p, ax = g.arena * T + 8;
        b.t++; if (b.flash) b.flash--;
        if (b.st === 'dead') {
          if (b.t % 6 === 0) { g.fx.push({ k: 'boom', x: b.x + rnd(-24, 24), y: b.y + rnd(-24, 10), t: 0 }); if (b.t % 18 === 0) snd.boom(); }
          if (b.t === 120) { g.phase = 'clear'; g.phaseT = 300; g.bonus = Math.floor(g.time / 60) * 100; addScore(g.bonus); snd.clear(); }
          return;
        }
        const s = bsp();
        if (b.k === 'serpent') {
          // figure-eight flight; the whole body is dangerous, only the head takes damage
          b.ph += 0.018 + Math.min(0.012, diff() * 0.002);
          const tx = ax + W / 2 + Math.sin(b.ph) * 150, ty = 96 + Math.sin(b.ph * 2) * 56;
          if (b.st === 'enter') { b.x += (tx - b.x) * 0.03; b.y += (ty - b.y) * 0.03; if (b.t > 120) b.st = 'fight'; }
          else { b.x = tx; b.y = ty; }
          b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 100) b.trail.pop();
          if (b.st === 'fight' && b.t % 110 === 0) { for (let i = -1; i <= 1; i++) { const a = Math.atan2(p.y - 12 - b.y, p.x - b.x) + i * 0.3; g.eb.push({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, k: 'f', t: 0 }); } snd.shot(); }
        } else if (b.k === 'gorilla') {
          const gy = (ROWS - 2) * T;
          b.face = p.x > b.x ? 1 : -1;
          if (b.st === 'enter') { b.x -= 1; if (b.x < ax + W - 70) { b.st = 'walk'; b.t = 0; } }
          else if (b.st === 'walk') {
            b.x += b.face * (0.7 + g.loop * 0.2);
            if (b.t > 90) { b.st = Math.random() < 0.5 ? 'jump' : 'punch'; b.t = 0; if (b.st === 'jump') { b.vy = -6; b.vx = Math.max(-2.5, Math.min(2.5, (p.x - b.x) / 45)); } }
          } else if (b.st === 'jump') {
            b.vy += 0.22; b.x += b.vx; b.y += b.vy;
            if (b.y >= gy) {
              b.y = gy; b.st = 'walk'; b.t = 0; snd.boom();
              g.eb.push({ x: b.x - 20, y: gy - 6, vx: -2.6, vy: 0, k: 'wave', t: 0 }); g.eb.push({ x: b.x + 20, y: gy - 6, vx: 2.6, vy: 0, k: 'wave', t: 0 });
            }
          } else if (b.st === 'punch') {
            if (b.t < 30) { /* wind up */ } else if (b.t < 50) b.x += b.face * 4; else if (b.t > 70) { b.st = 'walk'; b.t = 0; }
            if (b.t === 30) enemyShot(b.x, b.y - 30, p.x, p.y - 12, s, 'f');
          }
          b.x = Math.max(ax + 24, Math.min(ax + W - 24, b.x));
        } else {
          // Grand Master: teleports, rings of energy, aimed lightning
          const cyc = b.t % 150;
          if (b.st === 'enter') { b.vis = Math.min(1, b.vis + 0.02); if (b.vis >= 1) { b.st = 'fight'; b.t = 0; } }
          else {
            if (cyc < 20) b.vis = Math.max(0, 1 - cyc / 20);
            else if (cyc === 20) { b.x = ax + 40 + Math.random() * (W - 80); b.y = 100 + Math.random() * 40; }
            else if (cyc < 40) b.vis = (cyc - 20) / 20;
            else b.vis = 1;
            if (cyc === 55) { const n = 10 + g.loop * 2; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.eb.push({ x: b.x, y: b.y, vx: Math.cos(a) * s * 0.7, vy: Math.sin(a) * s * 0.7, k: 'f', t: 0 }); } snd.shot(); }
            if (cyc === 95 || cyc === 105 || cyc === 115) { enemyShot(b.x, b.y, p.x, p.y - 10, s + 0.6, 'e'); snd.shot(); }
            if (cyc === 130 && g.en.length < 3) { g.en.push(spawnFrom({ k: 'drone', x: ax + (Math.random() < 0.5 ? 10 : W - 10), y: 50 })); }
            b.y += Math.sin(b.t * 0.08) * 0.4;
          }
        }
        // contact damage + being slashed
        const boxes = bossBoxes(b);
        for (const bx of boxes) {
          if (overlap(bx.x, bx.y, bx.w, bx.h, p.x - 4, p.y - p.ph, 8, p.ph)) hurt(1);
        }
        if (slashActive() && b.hitId !== p.slashId && b.st !== 'enter') {
          const sb = slashBox();
          for (const bx of boxes) if (overlap(bx.x, bx.y, bx.w, bx.h, sb.x, sb.y, sb.w, sb.h)) {
            b.hitId = p.slashId;
            if (bx.head) damageBoss(2); else { g.fx.push({ k: 'spark', x: bx.x + bx.w / 2, y: bx.y + bx.h / 2, t: 0 }); snd.land(); }
            break;
          }
        }
      }
      function damageBoss(n) {
        const b = g.boss;
        if (b.st === 'dead') return;
        b.hp -= n; b.flash = 8; snd.hit();
        if (b.hp <= 0) { b.hp = 0; b.st = 'dead'; b.t = 0; addScore(10000 * (g.stage + 1), b.x, b.y - 30); g.eb = []; g.en.forEach(e => { if (e.k !== 'capsule') e.dead = true; }); }
      }

      // ---------- main update ----------
      function updGame() {
        if (g.phase === 'over') {
          if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
          return;
        }
        if (g.phase === 'cont') return;
        g.pops = g.pops.filter(pp => (pp.t--, pp.y -= 0.4, pp.t > 0));
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 24);
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'clear') {
          if (--g.phaseT <= 0) { g.stage++; if (g.stage >= THEMES.length) { g.stage = 0; g.loop++; } startStage(); }
          return;
        }
        if (g.phase === 'dying') {
          updPlayer();
          if (--g.phaseT <= 0) {
            g.lives--;
            if (g.lives <= 0) {
              if (api.offerContinue) { g.phase = 'cont'; const cg = g; api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, () => { if (g === cg) gameOver(); }); }
              else gameOver();
            } else respawn();
          }
          return;
        }
        if (!g.boss || g.boss.st !== 'dead') { if (--g.time <= 0) { g.time = 0; g.p.hp = 0; die(); return; } }
        updPlayer();
        if (g.phase !== 'play') return;
        const p = g.p;
        // spawn level enemies as they scroll into view
        while (g.spawnI < g.spawns.length && g.spawns[g.spawnI].x < g.cx + W + 24) {
          const s = g.spawns[g.spawnI++];
          if (s.x > g.cx - 16) { const e = spawnFrom(s); if (e) g.en.push(e); }
        }
        if (!g.locked && --g.droneT <= 0) {
          g.droneT = Math.max(240, 520 - diff() * 50) + ri(200);
          g.en.push(spawnFrom({ k: Math.random() < 0.6 ? 'drone' : 'dog', x: g.cx + W + 10, y: Math.random() < 0.6 ? 40 + ri(50) : -10 }));
          const e = g.en[g.en.length - 1]; if (e.k === 'dog') e.face = -1;
        }
        for (const e of g.en) if (!e.dead) updEnemy(e);
        // slash
        if (slashActive()) {
          const sb = slashBox();
          for (const e of g.en) if (!e.dead && e.hitId !== p.slashId && overlap(e.x - e.w / 2, e.y - e.h, e.w, e.h, sb.x, sb.y, sb.w, sb.h)) { e.hitId = p.slashId; hitEnemy(e, 1); }
          for (const b of g.eb) if (b.k !== 'wave' && overlap(b.x - 3, b.y - 3, 6, 6, sb.x, sb.y, sb.w, sb.h)) { b.dead = true; g.fx.push({ k: 'spark', x: b.x, y: b.y, t: 0 }); }
        }
        g.en = g.en.filter(e => !e.dead);
        if (g.boss) updBoss();
        // option shots
        for (const s of g.pshots) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (s.t <= 0) { s.dead = true; continue; }
          for (const e of g.en) if (!e.dead && overlap(e.x - e.w / 2, e.y - e.h, e.w, e.h, s.x - 2, s.y - 2, 4, 4)) { s.dead = true; hitEnemy(e, 1); break; }
          if (!s.dead && g.boss && g.boss.st !== 'enter') for (const bx of bossBoxes(g.boss)) if (bx.head && overlap(bx.x, bx.y, bx.w, bx.h, s.x - 2, s.y - 2, 4, 4)) { s.dead = true; if ((frame & 1) === 0) damageBoss(1); break; }
        }
        g.pshots = g.pshots.filter(s => !s.dead);
        g.en = g.en.filter(e => !e.dead);
        // enemy bullets
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy; b.t++;
          if (b.k !== 'wave' && boxHits(b.x - 1, b.y - 1, 2, 2)) { b.dead = true; continue; }
          if (b.x < g.cx - 20 || b.x > g.cx + W + 20 || b.y < -20 || b.y > H + 20 || b.t > 400) { b.dead = true; continue; }
          const hh = b.k === 'wave' ? 10 : 3;
          if (overlap(b.x - 3, b.y - hh, 6, hh * 2, p.x - 4, p.y - p.ph + 2, 8, p.ph - 2)) { b.dead = true; hurt(1); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        // items
        for (const it of g.items) {
          it.t++; it.vy = Math.min(3, it.vy + 0.15);
          const o = { x: it.x, y: it.y, vx: 0, vy: it.vy }; moveBody(o, 10, 10); it.y = o.y; it.vy = o.vy;
          if (overlap(it.x - 6, it.y - 12, 12, 12, p.x - 6, p.y - p.ph, 12, p.ph)) { it.dead = true; takeItem(it); }
          if (it.t > 600 || it.y > H + 20) it.dead = true;
        }
        g.items = g.items.filter(it => !it.dead);
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        updGame();
      }

      // ---------- rendering ----------
      function drawSky(ctx, t, cx) {
        const sky = t.sky;
        for (let i = 0; i < sky.length; i++) { ctx.fillStyle = sky[i]; ctx.fillRect(0, Math.floor(i * H / sky.length), W, Math.ceil(H / sky.length) + 1); }
        // far silhouettes (parallax 0.25)
        const off = -Math.floor(cx * 0.25) % 128;
        ctx.fillStyle = t.far;
        for (let x = off - 128; x < W + 128; x += 128) {
          const kx = Math.floor((x - off) / 128);
          if (t.sp === 0) {
            // onion-domed skyline
            ctx.fillRect(x, 120, 40, 104); ctx.fillRect(x + 8, 100, 24, 20); ctx.fillRect(x + 12, 92, 16, 8); ctx.fillRect(x + 18, 80, 4, 12);
            ctx.fillRect(x + 50, 140, 30, 84); ctx.fillRect(x + 56, 126, 18, 14); ctx.fillRect(x + 63, 116, 4, 10);
            ctx.fillRect(x + 88, 110, 26, 114); ctx.fillRect(x + 94, 98, 14, 12); ctx.fillRect(x + 99, 88, 4, 10);
          } else if (t.sp === 1) {
            ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(x + 50, 90 + (kx & 1) * 20); ctx.lineTo(x + 100, 160); ctx.lineTo(x + 128, 140); ctx.lineTo(x + 128, 224); ctx.lineTo(x, 224); ctx.fill();
            ctx.fillStyle = '#f0f4ff'; ctx.fillRect(x + 44, 96 + (kx & 1) * 20, 12, 6); ctx.fillStyle = t.far;
          } else {
            ctx.fillRect(x, 150, 128, 6); ctx.fillRect(x + 20, 140, 60, 10); ctx.fillRect(x + 40, 130, 14, 10);
          }
        }
        if (t.sp === 1) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { const sx = (i * 97 + frame * (1 + (i & 1))) % W, sy = (i * 53 + frame * (1.5 + (i % 3) * 0.5)) % H; ctx.fillRect(sx, sy, 1 + (i & 1), 1 + (i & 1)); } }
        if (t.sp === 2) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 30; i++) ctx.fillRect((i * 131 - Math.floor(cx * 0.1)) % W + (i * 131 - Math.floor(cx * 0.1) < 0 ? W : 0), (i * 37) % 120, 1, 1); }
      }
      function drawTiles(ctx) {
        const t = th();
        const cx = Math.floor(g.cx);
        const x0 = Math.floor(cx / T), x1 = x0 + Math.ceil(W / T) + 1;
        for (let tx = x0; tx <= x1; tx++) {
          for (let ty = 0; ty < ROWS; ty++) {
            if (!solid(tx, ty) || tx >= g.cols) continue;
            const sx = tx * T - cx, sy = ty * T;
            const topFace = !solid(tx, ty - 1);
            ctx.fillStyle = t.tile; ctx.fillRect(sx, sy, T, T);
            ctx.fillStyle = t.tile2; ctx.fillRect(sx, sy + T - 2, T, 2); ctx.fillRect(sx + T - 2, sy, 2, T);
            if (t.sp === 0) { if (((tx * 7 + ty * 3) % 5) === 0 && !topFace) { ctx.fillStyle = ((tx + ty + (frame >> 6)) % 7) ? t.win : '#302010'; ctx.fillRect(sx + 4, sy + 4, 6, 7); } }
            else if (t.sp === 2) { ctx.fillStyle = t.tile2; ctx.fillRect(sx + 3, sy + 3, 2, 2); ctx.fillRect(sx + 11, sy + 11, 2, 2); if (((tx + ty) % 9) === 0) { ctx.fillStyle = (frame >> 4) & 1 ? t.win : '#601010'; ctx.fillRect(sx + 6, sy + 6, 4, 4); } }
            else { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(sx + 2, sy + 5, 8, 1); ctx.fillRect(sx + 6, sy + 11, 7, 1); }
            if (topFace) { ctx.fillStyle = t.top; ctx.fillRect(sx, sy, T, t.sp === 1 ? 4 : 2); }
            if (!solid(tx, ty + 1) && ty < ROWS - 1) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx, sy + T - 3, T, 3); }
          }
        }
      }
      function drawPlayer(ctx) {
        const p = g.p, cx = Math.floor(g.cx);
        if (p.inv > 0 && (p.inv & 4) && p.st !== 'dead') return;
        const fi = p.face > 0 ? 0 : 1;
        const x = Math.round(p.x - cx), y = Math.round(p.y);
        let img;
        switch (p.st) {
          case 'crouch': img = SP.crouch[fi]; ctx.drawImage(img, x - 7, y - 12); break;
          case 'slide': img = SP.slide[fi]; ctx.drawImage(img, x - 11, y - 10); break;
          case 'hang': img = SP.hang[fi]; ctx.drawImage(img, x - 7 + (((p.anim >> 3) & 1) ? 1 : 0), y - 20); break;
          case 'wall': img = SP.cling[fi]; ctx.drawImage(img, x - 7 + p.wdir * 2, y - 20 - (((p.anim >> 3) & 1) ? 1 : 0)); break;
          case 'air':
            if (p.flip && p.slash <= 0) {
              ctx.save(); ctx.translate(x, y - 10); ctx.rotate((frame * 0.45) * p.face); ctx.drawImage(SP.flip[fi], -7, -6); ctx.restore();
            } else ctx.drawImage(SP.run1[fi], x - 7, y - 20);
            break;
          case 'hurt': case 'dead':
            ctx.save(); ctx.translate(x, y - 10); ctx.rotate(-p.face * (p.st === 'dead' ? Math.min(1.57, p.t * 0.05) : 0.4)); ctx.drawImage(SP.stand[fi], -7, -10); ctx.restore();
            break;
          default:
            img = Math.abs(p.vx) > 0.1 ? ((p.anim >> 3) & 1 ? SP.run2[fi] : SP.run1[fi]) : SP.stand[fi];
            ctx.drawImage(img, x - 7, y - 20);
        }
        // cypher arc
        if (p.slash > 0 && p.st !== 'dead') {
          const k = 1 - (p.slash - 1) / 14;
          const reach = p.ext > 0 ? 48 : 30;
          const ox = x + p.face * 4, oy = y + (p.st === 'crouch' ? -8 : p.st === 'hang' ? -6 : -12);
          const a0 = -1.7, a1 = 1.1, cur = a0 + (a1 - a0) * Math.min(1, k * 1.6);
          for (let a = a0; a <= cur; a += 0.07) {
            const fade = (cur - a) < 0.5;
            for (let r = reach * 0.45; r <= reach; r += 2) {
              ctx.fillStyle = r > reach - 3 ? '#ffffff' : fade ? '#80f0ff' : '#2080ff';
              ctx.fillRect(Math.round(ox + Math.cos(a) * r * p.face), Math.round(oy + Math.sin(a) * r * 0.8), 2, 2);
            }
          }
        }
        for (const o of p.opts) {
          const ox = Math.round(o.x - cx), oy = Math.round(o.y);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(ox - 3, oy - 2, 6, 4); ctx.fillStyle = '#ff6020'; ctx.fillRect(ox - 1, oy - 3, 2, 6);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(ox + (frame & 2 ? 1 : -2), oy - 1, 1, 1);
        }
      }
      function drawEnemy(ctx, e) {
        const cx = Math.floor(g.cx), x = Math.round(e.x - cx), y = Math.round(e.y);
        const fi = e.face > 0 ? 0 : 1;
        switch (e.k) {
          case 'sold': {
            const set = ES.sold[e.pal][(e.anim >> 3) & 1];
            ctx.drawImage(set[fi], x - 6, y - 17);
            if (e.shoot > 6) { ctx.fillStyle = '#ffff80'; ctx.fillRect(x + e.face * 8 - 1, y - 12, 3, 3); }
            break;
          }
          case 'dog': ctx.drawImage(ES.dog[(e.anim >> 2) & 1][fi], x - 9, y - 10); break;
          case 'kick': ctx.drawImage(ES.kick[e.jump ? 1 : 0][fi], x - 6, y - 16); break;
          case 'turret':
            ctx.fillStyle = '#505868'; ctx.fillRect(x - 7, y - 10, 14, 10);
            ctx.fillStyle = '#8890a0'; ctx.fillRect(x - 5, y - 13, 10, 4);
            ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 2, y - 8, 4, 3);
            ctx.fillStyle = '#c0c8d0'; ctx.fillRect(e.face > 0 ? x + 4 : x - 12, y - 12, 8, 2);
            break;
          case 'capsule':
            ctx.fillStyle = '#e0e0f0'; ctx.fillRect(x - 6, y - 12, 12, 12);
            ctx.fillStyle = (frame >> 3) & 1 ? '#ff3040' : '#ffd040'; ctx.fillRect(x - 4, y - 10, 8, 8);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 9, 2, 2);
            break;
          case 'drone': ctx.drawImage(ES.drone, x - 8, y - 6); break;
        }
        if (e.flash) { e.flash--; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - e.w / 2, y - e.h, e.w, e.h); }
      }
      function drawBoss(ctx) {
        const b = g.boss; if (!b) return;
        const cx = Math.floor(g.cx);
        const fl = b.flash && (b.flash & 2);
        if (b.k === 'serpent') {
          for (let i = 12; i >= 1; i--) {
            const s = b.trail[i * 7]; if (!s) continue;
            const x = Math.round(s.x - cx), y = Math.round(s.y);
            ctx.fillStyle = '#802020'; ctx.fillRect(x - 8, y - 8, 16, 16);
            ctx.fillStyle = i & 1 ? '#c04030' : '#d8a020'; ctx.fillRect(x - 6, y - 6, 12, 12);
            ctx.fillStyle = '#ffe080'; ctx.fillRect(x - 2, y - 7, 4, 3);
          }
          const x = Math.round(b.x - cx), y = Math.round(b.y);
          ctx.fillStyle = fl ? '#ffffff' : '#a02020'; ctx.fillRect(x - 12, y - 11, 24, 22);
          ctx.fillStyle = fl ? '#ffffff' : '#e0b020'; ctx.fillRect(x - 10, y - 9, 20, 18);
          ctx.fillStyle = '#202020'; ctx.fillRect(x - 6, y - 4, 12, 3);
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 6, y - 4, 3, 3); ctx.fillRect(x + 3, y - 4, 3, 3);
          ctx.fillStyle = '#f0f0f0'; for (let i = -8; i <= 6; i += 4) ctx.fillRect(x + i, y + 6, 2, 4);
        } else if (b.k === 'gorilla') {
          const x = Math.round(b.x - cx), y = Math.round(b.y);
          const c1 = fl ? '#ffffff' : '#606878', c2 = fl ? '#ffffff' : '#9098a8', c3 = '#ff3020';
          ctx.fillStyle = c1; ctx.fillRect(x - 18, y - 40, 36, 30); // torso
          ctx.fillStyle = c2; ctx.fillRect(x - 14, y - 36, 28, 10);
          ctx.fillStyle = c1; ctx.fillRect(x - 9, y - 50, 18, 12); // head
          ctx.fillStyle = c3; ctx.fillRect(x - 6 + b.face * 2, y - 46, 4, 3); ctx.fillRect(x + 2 + b.face * 2, y - 46, 4, 3);
          const punch = b.st === 'punch' && b.t >= 30 && b.t < 60;
          ctx.fillStyle = c2; // arms
          ctx.fillRect(x - 26, y - 38, 8, 30); ctx.fillRect(x + 18, y - 38, 8, 30);
          if (punch) { ctx.fillRect(b.face > 0 ? x + 18 : x - 44, y - 34, 26, 10); }
          ctx.fillStyle = c1; ctx.fillRect(x - 16, y - 10, 12, 10); ctx.fillRect(x + 4, y - 10, 12, 10);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 4, y - 30, 8, 8);
        } else {
          if (b.vis <= 0.05) return;
          const x = Math.round(b.x - cx), y = Math.round(b.y);
          ctx.globalAlpha = Math.max(0.1, b.vis);
          ctx.fillStyle = fl ? '#ffffff' : '#601080'; ctx.fillRect(x - 12, y - 4, 24, 20); ctx.fillRect(x - 16, y + 8, 32, 10);
          ctx.fillStyle = fl ? '#ffffff' : '#a040e0'; ctx.fillRect(x - 8, y - 4, 16, 18);
          ctx.fillStyle = '#f0c8a0'; ctx.fillRect(x - 5, y - 14, 10, 10);
          ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 6, y - 16, 12, 3); ctx.fillRect(x - 4, y - 6, 8, 4);
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 3, y - 11, 2, 2); ctx.fillRect(x + 1, y - 11, 2, 2);
          ctx.fillStyle = (frame >> 2) & 1 ? '#40e0ff' : '#ffffff'; ctx.fillRect(x - 1, y + 2, 3, 3);
          ctx.globalAlpha = 1;
        }
      }
      function drawItems(ctx) {
        const cx = Math.floor(g.cx);
        const L = { hp: ['H', '#ff4040'], maxhp: ['E', '#ff40ff'], opt: ['A', '#ffd040'], ext: ['C', '#40e0ff'], pts: ['$', '#40ff60'], oneup: ['1', '#ffffff'] };
        for (const it of g.items) {
          if (it.t > 480 && (frame & 4)) continue;
          const x = Math.round(it.x - cx), y = Math.round(it.y);
          const [ch, col] = L[it.k];
          ctx.fillStyle = '#101020'; ctx.fillRect(x - 6, y - 12, 12, 12);
          ctx.fillStyle = col; ctx.fillRect(x - 5, y - 11, 10, 1); ctx.fillRect(x - 5, y - 2, 10, 1);
          text(ctx, ch === '$' ? 'P' : ch, x - 2, y - 10, col);
        }
      }
      function drawShots(ctx) {
        const cx = Math.floor(g.cx);
        for (const s of g.pshots || []) { ctx.fillStyle = '#ffff80'; ctx.fillRect(Math.round(s.x - cx) - 1, Math.round(s.y) - 1, 3, 3); }
        for (const b of g.eb) {
          const x = Math.round(b.x - cx), y = Math.round(b.y);
          if (b.k === 'wave') { ctx.fillStyle = (frame & 2) ? '#ffffff' : '#ffd040'; ctx.fillRect(x - 3, y - 10, 6, 16); ctx.fillStyle = '#ff8020'; ctx.fillRect(x - 2, y - 6, 4, 12); }
          else if (b.k === 'f') { ctx.fillStyle = (frame & 2) ? '#ff8020' : '#ffff40'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
          else if (b.k === 'e') { ctx.fillStyle = (frame & 2) ? '#40e0ff' : '#ffffff'; ctx.fillRect(x - 2, y - 2, 5, 5); }
          else { ctx.fillStyle = '#ffffa0'; ctx.fillRect(x - 2, y - 1, 4, 2); }
        }
        for (const f of g.fx) {
          const x = Math.round(f.x - cx), y = Math.round(f.y);
          if (f.k === 'boom') {
            const r = 3 + f.t * 0.7;
            ctx.fillStyle = f.t < 6 ? '#ffffff' : f.t < 14 ? '#ffd040' : '#e04010';
            ctx.fillRect(x - r, y - r / 2, r * 2, r); ctx.fillRect(x - r / 2, y - r, r, r * 2);
          } else {
            ctx.fillStyle = (f.t & 2) ? '#ffffff' : '#80f0ff';
            for (let i = 0; i < 4; i++) { const a = i * 1.57 + f.t * 0.2, r = f.t * 0.8; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2); }
          }
        }
        for (const pp of g.pops) text(ctx, pp.s, Math.round(pp.x - cx), Math.round(pp.y), '#ffffff', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 12);
        text(ctx, '1P', 4, 3, '#40c0ff'); text(ctx, String(g ? g.score : 0).padStart(7, ' '), 22, 3, '#ffffff');
        text(ctx, 'HI', 120, 3, '#ff4040'); text(ctx, String(hi).padStart(7, ' '), 136, 3, '#ffffff');
        if (mode !== 'game' || !g) return;
        const secs = Math.ceil(g.time / 60);
        text(ctx, 'TIME ' + secs, 236, 3, secs < 30 && (frame & 16) ? '#ff4040' : '#ffd040');
        for (let i = 0; i < g.maxhp; i++) { ctx.fillStyle = i < g.p.hp ? '#ff3030' : '#402020'; ctx.fillRect(310 + i * 9, 3, 7, 7); }
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) ctx.drawImage(SP.stand[0], 4 + i * 12, H - 22, 10, 16);
      }
      function drawTitle(ctx) {
        drawSky(ctx, THEMES[0], titleT * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
        const page = Math.floor(titleT / 480) % 2;
        if (page === 0) {
          text(ctx, 'STRIDER', W / 2 + 3, 43, '#400000', 6, 'center');
          text(ctx, 'STRIDER', W / 2, 40, '#ff3030', 6, 'center');
          text(ctx, 'STRIDER', W / 2, 40 - 1, (frame >> 3) & 1 ? '#ff3030' : '#ff5040', 6, 'center');
          ctx.drawImage(SP.stand[0], W / 2 - 21, 96, 42, 60);
          // a cypher sweep beside him
          ctx.fillStyle = '#80f0ff';
          for (let a = -1.6; a < 0.9; a += 0.05) ctx.fillRect(Math.round(W / 2 + 14 + Math.cos(a) * 48), Math.round(126 + Math.sin(a) * 38), 3, 3);
          text(ctx, 'HI-SCORE ' + hi, W / 2, 168, '#ffffff', 1, 'center');
        } else {
          text(ctx, '- HOW TO PLAY -', W / 2, 30, '#ffd040', 1, 'center');
          const lines = ['SPACE: SLASH WITH THE CYPHER', 'X: JUMP / SOMERSAULT', 'JUMP INTO A WALL TO CLING, UP/DOWN TO CLIMB', 'JUMP INTO A CEILING TO HANG, DOWN TO DROP', 'DOWN + X: SLIDE UNDER BULLETS', 'SLASH CAPSULES FOR POWER-UPS', '', 'H HEAL  E HEALTH UP  A OPTION', 'C LONG CYPHER  P BONUS  1 EXTRA LIFE'];
          lines.forEach((l, i) => text(ctx, l, W / 2, 50 + i * 12, i >= 7 ? '#80f0ff' : '#ffffff', 1, 'center'));
          text(ctx, 'EXTEND EVERY 50000 PTS', W / 2, 168, '#ffd040', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, 186, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 186, '#40ffff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#ffffff');
        text(ctx, '\u00a9 1989 CAPCOM', W - 4, H - 10, '#c0c0c0', 1, 'right');
      }
      function render(ctx) {
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawSky(ctx, th(), g.cx);
        drawTiles(ctx);
        for (const e of g.en) drawEnemy(ctx, e);
        drawBoss(ctx);
        drawItems(ctx);
        drawPlayer(ctx);
        drawShots(ctx);
        if (g.boss && g.boss.st !== 'dead') {
          text(ctx, th().bname, W / 2, 16, '#ffd040', 1, 'center');
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 80, 25, 160, 5);
          ctx.fillStyle = '#e03020'; ctx.fillRect(W / 2 - 79, 26, Math.round(158 * g.boss.hp / g.boss.max), 3);
        }
        drawHUD(ctx);
        if (g.phase === 'intro') {
          text(ctx, 'STAGE ' + (g.stage + 1), W / 2, 70, '#ffffff', 2, 'center');
          text(ctx, th().name, W / 2, 92, '#ffd040', 1, 'center');
          if (g.loop) text(ctx, 'LOOP ' + (g.loop + 1), W / 2, 106, '#ff8080', 1, 'center');
        }
        if (g.phase === 'clear') {
          text(ctx, 'STAGE CLEAR', W / 2, 70, '#ffffff', 2, 'center');
          text(ctx, 'TIME BONUS ' + g.bonus, W / 2, 96, '#ffd040', 1, 'center');
        }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 96, '#ff4040', 2, 'center');
      }
      if (api.debugHook) api.debugHook({ inv: () => { if (g && g.p && g.p.st !== 'dead') g.p.inv = Math.max(g.p.inv, 2); }, map: () => g, sum: () => g && { mode, ph: g.phase, st: g.stage, loop: g.loop, lives: g.lives, sc: g.score, x: g.p.x | 0, y: g.p.y | 0, pst: g.p.st, arena: g.arena * T, en: g.en.length, boss: g.boss && g.boss.hp } });
      return { update, render, destroy() { } };
    }
  });
})();
