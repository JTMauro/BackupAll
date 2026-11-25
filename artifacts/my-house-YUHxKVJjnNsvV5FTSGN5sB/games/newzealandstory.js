// The NewZealand Story (Taito, 1988) - from-scratch recreation. Tiki the kiwi shoots arrows through maze-like levels,
// rides balloons, swims (watch the air), and frees caged kiwi friends. Bosses guard the end of each world.
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
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
  }
  function spr(rows, pal, flip) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(flip ? w - 1 - i : i, y, 1, 1); } } });
    return c;
  }
  const pair = (rows, pal) => [spr(rows, pal, false), spr(rows, pal, true)];

  const W = 256, H = 224, TS = 16, HUD = 16, VH = H - HUD;
  const AIR = 0, WALL = 1, WATER = 2, SPUP = 3, SPDN = 4;

  // ---------- level designs (rect ops + objects) ----------
  // P start, C cage, e walker, b bat, r balloon rider, B free balloon, w fish, f fruit, L laser, O bombs
  const LEVELS = [
    {
      name: 'AUCKLAND ZOO', w: 48, h: 26, pal: 0, ops: [
        ['#', 1, 18, 16, 7], ['#', 8, 16, 2, 2], ['^', 12, 17, 2, 1], ['~', 17, 19, 14, 6], ['#', 28, 18, 3, 1], ['#', 31, 16, 2, 9],
        ['#', 33, 20, 14, 5], ['#', 34, 18, 4, 1], ['#', 39, 16, 4, 1], ['#', 34, 14, 4, 1], ['#', 39, 12, 4, 1], ['#', 34, 10, 4, 1], ['#', 39, 8, 4, 1],
        ['#', 8, 6, 30, 1], ['#', 2, 6, 4, 1], ['v', 22, 1, 7, 1]],
      objs: [['P', 2, 17], ['C', 3, 5], ['e', 5, 17], ['e', 15, 17], ['e', 36, 19], ['e', 44, 19], ['e', 25, 5], ['e', 33, 5], ['b', 20, 3], ['b', 40, 4],
      ['w', 22, 22], ['w', 27, 21], ['B', 45, 19], ['f', 25, 23], ['f', 45, 2], ['L', 15, 5], ['f', 11, 15]]
    },
    {
      name: 'WAITOMO CAVES', w: 48, h: 26, pal: 1, ops: [
        ['#', 1, 6, 10, 1], ['~', 1, 12, 30, 13], ['#', 8, 18, 3, 7], ['#', 18, 8, 2, 12], ['#', 24, 20, 3, 5], ['^', 12, 24, 5, 1],
        ['#', 31, 10, 1, 15], ['#', 32, 16, 15, 9], ['#', 33, 14, 3, 1], ['#', 37, 12, 3, 1], ['#', 33, 10, 3, 1], ['#', 37, 8, 3, 1], ['#', 40, 6, 6, 1]],
      objs: [['P', 2, 5], ['C', 43, 5], ['w', 5, 21], ['w', 14, 16], ['w', 27, 15], ['w', 22, 22], ['e', 36, 15], ['e', 43, 15], ['r', 25, 4], ['b', 44, 10],
      ['f', 6, 23], ['f', 22, 13], ['O', 28, 23], ['f', 45, 14], ['B', 13, 9]]
    },
    {
      name: 'MOUNT COOK', w: 48, h: 30, pal: 2, ops: [
        ['^', 10, 28, 2, 1], ['^', 22, 28, 2, 1], ['#', 1, 24, 40, 1], ['v', 14, 25, 5, 1],
        ['#', 44, 27, 3, 1], ['#', 41, 25, 2, 1], ['#', 44, 23, 3, 1], ['#', 41, 21, 2, 1],
        ['#', 10, 20, 30, 1], ['#', 10, 14, 30, 1], ['v', 20, 15, 4, 1], ['#', 7, 22, 2, 1],
        ['#', 7, 18, 2, 1], ['#', 3, 16, 3, 1], ['#', 7, 14, 2, 1], ['#', 3, 12, 3, 1], ['#', 7, 10, 2, 1], ['#', 3, 8, 3, 1],
        ['#', 7, 6, 40, 1], ['v', 20, 1, 7, 1]],
      objs: [['P', 2, 28], ['C', 44, 5], ['e', 15, 28], ['e', 30, 28], ['B', 17, 27], ['B', 33, 27], ['e', 20, 19], ['e', 32, 19], ['b', 25, 17],
      ['r', 30, 10], ['B', 13, 19], ['e', 15, 5], ['e', 28, 5], ['e', 38, 5], ['b', 33, 3], ['f', 45, 26], ['f', 2, 7], ['L', 36, 19], ['O', 12, 5], ['f', 44, 12]]
    },
    {
      name: 'BOSS', boss: true, w: 32, h: 16, pal: 3, ops: [['#', 4, 11, 5, 1], ['#', 23, 11, 5, 1], ['#', 13, 8, 6, 1]],
      objs: [['P', 3, 14], ['f', 6, 10], ['f', 25, 10]]
    }
  ];
  const PALS = [
    { sky: ['#60c0ff', '#c0f0ff'], wall: '#d07830', hi: '#f8b060', lo: '#803810', water: 'rgba(30,90,255,0.45)' },
    { sky: ['#102040', '#305080'], wall: '#507890', hi: '#90c0d8', lo: '#203848', water: 'rgba(20,120,200,0.5)' },
    { sky: ['#a0d0ff', '#ffffff'], wall: '#9090b0', hi: '#e0e0ff', lo: '#505070', water: 'rgba(60,140,255,0.45)' },
    { sky: ['#301040', '#804060'], wall: '#806050', hi: '#c0a080', lo: '#402018', water: 'rgba(30,90,255,0.45)' }
  ];

  // ---------- sprites ----------
  const KPAL = { y: '#f8d020', o: '#d09010', k: '#000000', w: '#ffffff', b: '#f08020', l: '#e06010', r: '#a05010' };
  const KIWI = {
    a: ['....yyyy....', '..yyyyyyyy..', '.yyyyyywky..', '.yyyyyykkyb.', 'yyyyyyyyyybbbb', 'yyyyyyyyyy..b.', 'oyyyyyyyyy....', 'oyyyyyyyyy....', '.oyyyyyyy.....', '..ooyyyo......', '...l..l.......', '...l..l.......', '..ll.ll.......'],
    b: ['....yyyy....', '..yyyyyyyy..', '.yyyyyywky..', '.yyyyyykkyb.', 'yyyyyyyyyybbbb', 'yyyyyyyyyy..b.', 'oyyyyyyyyy....', 'oyyyyyyyyy....', '.oyyyyyyy.....', '..ooyyyo......', '....ll........', '...l..l.......', '..ll...ll.....']
  };
  const SP_KIWI = { a: pair(KIWI.a, KPAL), b: pair(KIWI.b, KPAL) };
  const SP_FRIEND = pair(KIWI.a, { y: '#d0b080', o: '#a08050', k: '#000', w: '#fff', b: '#f0a040', l: '#a06030', r: '#a05010' });

  ArcadeRegistry.register({
    id: 'newzealandstory', title: 'The NewZealand Story', year: 1988, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk / swim / steer balloon \u00b7 Space: shoot arrow \u00b7 X: jump, swim up, leave balloon \u00b7 Enter: start',
    marquee: { bg: '#3080e0', fg: '#f8d020', accent: '#f08020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let MW = 48, MH = 26, tiles = new Uint8Array(MW * MH);
      let tileCache = null;

      // ---------- map ----------
      function buildLevel(def, mirror) {
        MW = def.w; MH = def.h; tiles = new Uint8Array(MW * MH);
        const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < MW && y < MH) tiles[y * MW + x] = t; };
        for (let x = 0; x < MW; x++) { set(x, 0, WALL); set(x, MH - 1, WALL); }
        for (let y = 0; y < MH; y++) { set(0, y, WALL); set(MW - 1, y, WALL); }
        const mx = (x, w) => mirror ? MW - x - w : x;
        for (const o of def.ops) {
          const t = o[0] === '#' ? WALL : o[0] === '~' ? WATER : o[0] === '^' ? SPUP : SPDN;
          const x0 = mx(o[1], o[3]);
          for (let y = o[2]; y < o[2] + o[4]; y++) for (let x = x0; x < x0 + o[3]; x++) set(x, y, t);
        }
        return def.objs.map(o => ({ k: o[0], x: mirror ? MW - 1 - o[1] : o[1], y: o[2] }));
      }
      const tAt = (x, y) => { const c = Math.floor(x / TS), r = Math.floor(y / TS); if (c < 0 || r < 0 || c >= MW || r >= MH) return WALL; return tiles[r * MW + c]; };
      const solidPt = (x, y) => tAt(x, y) === WALL;
      const waterPt = (x, y) => tAt(x, y) === WATER;
      function spikeHit(x0, y0, x1, y1) {
        for (let y = y0; y <= y1; y += 4) for (let x = x0; x <= x1; x += 4) {
          const t = tAt(x, y);
          if (t === SPUP && (y % TS) >= 7) return true;
          if (t === SPDN && (y % TS) <= 8) return true;
        }
        return false;
      }
      function phys(e, hw, hh) {
        e.hitWall = false;
        let nx = e.x + e.vx;
        if (e.vx) {
          const edge = nx + Math.sign(e.vx) * hw;
          let hit = false;
          for (let yy = e.y - hh + 1; yy < e.y; yy += 6) if (solidPt(edge, yy)) hit = true;
          if (solidPt(edge, e.y - 1)) hit = true;
          if (hit) { nx = e.vx > 0 ? Math.floor(edge / TS) * TS - hw - 0.01 : (Math.floor(edge / TS) + 1) * TS + hw + 0.01; e.hitWall = true; }
        }
        e.x = nx;
        let ny = e.y + e.vy;
        e.onGround = false;
        if (e.vy > 0) { for (const xx of [e.x - hw + 1, e.x + hw - 1]) if (solidPt(xx, ny)) { ny = Math.floor(ny / TS) * TS; e.vy = 0; e.onGround = true; break; } }
        else if (e.vy < 0) { for (const xx of [e.x - hw + 1, e.x + hw - 1]) if (solidPt(xx, ny - hh)) { ny = (Math.floor((ny - hh) / TS) + 1) * TS + hh; e.vy = 0; e.hitCeil = true; break; } }
        e.y = ny;
      }
      function makeTileCache(pal) {
        const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d');
        x.fillStyle = pal.wall; x.fillRect(0, 0, 16, 16);
        x.fillStyle = pal.lo; x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(5, 0, 1, 7); x.fillRect(12, 8, 1, 7);
        x.fillStyle = pal.hi; x.fillRect(0, 0, 5, 1); x.fillRect(6, 0, 10, 1); x.fillRect(0, 8, 12, 1); x.fillRect(13, 8, 3, 1);
        const top = document.createElement('canvas'); top.width = 16; top.height = 16; const t = top.getContext('2d');
        t.drawImage(c, 0, 0); t.fillStyle = '#40c040'; t.fillRect(0, 0, 16, 3); t.fillStyle = '#80f060'; t.fillRect(0, 0, 16, 1); t.fillStyle = '#208020'; for (let i = 1; i < 16; i += 4) t.fillRect(i, 3, 2, 1);
        return { wall: c, top };
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, nextLife: 50000 };
        startStage();
      }
      function startStage() {
        const def = LEVELS[g.stage % LEVELS.length];
        const loop = Math.floor(g.stage / LEVELS.length);
        g.def = def; g.loop = loop; g.pal = PALS[def.pal];
        tileCache = makeTileCache(g.pal);
        const objs = buildLevel(def, loop % 2 === 1);
        g.enemies = []; g.arrows = []; g.eshots = []; g.items = []; g.balloons = []; g.parts = []; g.pops = [];
        g.cage = null; g.boss = null; g.devil = null;
        for (const o of objs) {
          const wx = o.x * TS + 8, wy = (o.y + 1) * TS;
          if (o.k === 'P') { g.start = { x: wx, y: wy }; }
          else if (o.k === 'C') g.cage = { x: wx, y: wy, open: false };
          else if (o.k === 'B') g.balloons.push(mkBalloon(wx, wy - 26, null));
          else if ('fLO'.includes(o.k)) g.items.push({ x: wx, y: wy, kind: o.k === 'f' ? 'fruit' : o.k === 'L' ? 'laser' : 'bomb', fi: (o.x + o.y) % 4, t: 0 });
          else spawnEnemy(o.k, wx, wy);
        }
        g.p = mkPlayer(g.start.x, g.start.y);
        g.timer = 0; g.phase = 'ready'; g.phaseT = 150; g.spawnT = 600;
        if (def.boss) { g.boss = { x: (MW - 8) * TS, y: 5 * TS, t: 0, hp: 36 + loop * 12, maxhp: 36 + loop * 12, cd: 120, flash: 0, dead: 0 }; }
        au.melody([[523, .1], [587, .1], [659, .1], [784, .2], [659, .1], [784, .1], [880, .1], [1047, .3]], { type: 'square', vol: .1 });
      }
      function mkPlayer(x, y) { return { x, y, vx: 0, vy: 0, face: 0, onGround: false, walk: 0, inv: 90, dead: 0, air: 600, inWater: false, ride: null, cd: 0, weapon: null, wT: 0 }; }
      function mkBalloon(x, y, rider) { return { x, y, vx: 0, vy: 0, rider, t: Math.random() * 100, col: ['#ff4040', '#40a0ff', '#ff40c0', '#40e040'][(Math.random() * 4) | 0], dead: 0 }; }
      function spawnEnemy(k, x, y) {
        const sp = 1 + g.loop * 0.25 + (g.stage % LEVELS.length) * 0.05;
        if (k === 'e') g.enemies.push({ kind: 'walker', x, y, vx: 0, vy: 0, face: Math.random() < .5 ? 1 : 0, sp: 0.5 * sp, cd: 90 + Math.random() * 90, t: 0, w: 12, h: 14, pts: 200, dead: 0 });
        else if (k === 'b') g.enemies.push({ kind: 'bat', x, y: y - 8, by: y - 8, vx: 0, vy: 0, face: 1, sp: 0.6 * sp, t: Math.random() * 100, w: 12, h: 8, pts: 300, dead: 0 });
        else if (k === 'w') g.enemies.push({ kind: 'fish', x, y: y - 6, vx: 0, vy: 0, face: 1, sp: 0.7 * sp, t: 0, w: 14, h: 8, pts: 200, dead: 0 });
        else if (k === 'r') { const b = mkBalloon(x, y - 26, 'enemy'); g.balloons.push(b); g.enemies.push({ kind: 'rider', x, y: y - 4, bal: b, vx: 0, vy: 0, face: 1, sp: 0.4 * sp, t: 0, cd: 120, w: 12, h: 12, pts: 500, dead: 0 }); }
      }
      function addScore(n, x, y) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 50000; au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .16]], { type: 'square', vol: .12 }); }
        if (g.score > hi) hi = g.score;
        if (x != null) g.pops.push({ x, y, s: String(n), t: 50 });
      }
      function puff(x, y, col, n) { for (let i = 0; i < (n || 8); i++) g.parts.push({ x, y, vx: (Math.random() - .5) * 2.5, vy: (Math.random() - .5) * 2.5, t: 20 + Math.random() * 10, col }); }

      function killPlayer() {
        const p = g.p; if (p.dead || p.inv > 0) return;
        p.dead = 1; g.phase = 'dying'; g.phaseT = 110; p.vy = -3.5; p.vx = 0;
        if (p.ride) { p.ride.rider = null; p.ride = null; }
        au.melody([[784, .08], [659, .08], [523, .08], [392, .08], [262, .3]], { type: 'square', vol: .12 });
      }
      function respawn() {
        g.lives--;
        if (g.lives <= 0) { lastLife(); return; }
        doRespawn();
      }
      function doRespawn() {
        const old = g.p;
        g.p = mkPlayer(g.start.x, g.start.y);
        g.p.inv = 120;
        if (old.safe) { g.p.x = old.safe.x; g.p.y = old.safe.y; }
        g.eshots = []; g.devil = null; g.timer = Math.min(g.timer, 60 * 60);
        for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - g.p.x, e.y - g.p.y) < 60) { e.x += (e.x < g.p.x ? -80 : 80); }
        g.phase = 'play';
      }
      function lastLife() {
        g.phase = 'wait';
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 3; g.score = 0; doRespawn(); } }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 320;
        au.melody([[523, .2], [494, .2], [440, .2], [392, .2], [349, .6]], { type: 'triangle', vol: .16 });
      }

      // ---------- player ----------
      function updatePlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.cd > 0) p.cd--;
        if (p.wT > 0 && --p.wT <= 0) p.weapon = null;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const jumpP = api.pressed('KeyX') || api.pressed('KeyZ'), jumpH = api.key('KeyX') || api.key('KeyZ');
        if (L) p.face = 1; if (R) p.face = 0;
        p.inWater = waterPt(p.x, p.y - 6);
        const headWet = waterPt(p.x, p.y - 12);
        if (p.ride) {
          const b = p.ride;
          b.vx += (R ? 0.08 : 0) - (L ? 0.08 : 0); b.vx *= 0.94;
          b.vy += (D ? 0.06 : 0) - (U ? 0.08 : 0) - 0.006; b.vy *= 0.94;
          b.vx = Math.max(-1.3, Math.min(1.3, b.vx)); b.vy = Math.max(-1.1, Math.min(1.1, b.vy));
          moveBalloon(b);
          p.x = b.x; p.y = b.y + 24; p.vx = 0; p.vy = 0;
          if (spikeHit(b.x - 7, b.y - 12, b.x + 7, b.y + 24)) { popBalloon(b); }
          if (jumpP && p.ride) { p.ride.rider = null; p.ride = null; p.vy = -1; p.inv = Math.max(p.inv, 10); }
        } else if (p.inWater) {
          p.vx = (R ? 1 : 0) - (L ? 1 : 0);
          if (U || jumpH) p.vy -= 0.2; else if (D) p.vy += 0.12; else p.vy += 0.03;
          p.vy = Math.max(-1.5, Math.min(1.2, p.vy));
          if (!headWet && jumpP) { p.vy = -4.4; au.tone(400, .1, { type: 'square', vol: .08, slideTo: 700 }); }
          if ((frame & 7) === 0 && headWet) g.parts.push({ x: p.x + (p.face ? -6 : 6), y: p.y - 12, vx: 0, vy: -.6, t: 30, col: '#c0e0ff', bub: true });
          phys(p, 5, 13);
          if ((frame % 20) === 0 && headWet) au.tone(900 + Math.random() * 300, .03, { type: 'sine', vol: .04 });
        } else {
          p.vx = (R ? 1.25 : 0) - (L ? 1.25 : 0);
          if (p.vx && p.onGround) p.walk++;
          if (jumpP && (p.onGround || waterPt(p.x, p.y + 2))) { p.vy = -4.6; au.tone(500, .08, { type: 'square', vol: .07, slideTo: 900 }); }
          if (!jumpH && p.vy < -1.5) p.vy += 0.25; // short hop when released
          p.vy = Math.min(5, p.vy + 0.25);
          phys(p, 5, 13);
          // board a balloon
          for (const b of g.balloons) {
            if (b.rider || b.dead) continue;
            if (Math.abs(b.x - p.x) < 10 && p.y > b.y + 6 && p.y < b.y + 34 && (!p.onGround || U)) {
              b.rider = 'player'; p.ride = b; au.melody([[660, .05], [880, .08]], { type: 'square', vol: .08 }); break;
            }
          }
        }
        // air meter
        if (headWet && !p.ride) {
          p.air--;
          if (p.air === 180 || p.air === 120 || p.air === 60) au.tone(1600, .1, { type: 'square', vol: .1 });
          if (p.air <= 0) { killPlayer(); return; }
        } else p.air = Math.min(600, p.air + 6);
        // shooting
        if (api.pressed('Space') && p.cd <= 0) shoot();
        // hazards
        if (spikeHit(p.x - 4, p.y - 12, p.x + 4, p.y - 1)) { killPlayer(); return; }
        if (p.onGround && !p.inWater && !p.ride) p.safe = { x: p.x, y: p.y };
        // cage
        const c = g.cage;
        if (c && !c.open && Math.abs(p.x - c.x) < 14 && Math.abs(p.y - c.y) < 18) freeKiwi();
      }
      function moveBalloon(b) {
        const save = { x: b.x, y: b.y + 24 };
        const e = { x: b.x, y: b.y + 24, vx: b.vx, vy: b.vy };
        phys(e, 7, 36);
        if (e.hitWall) b.vx = -b.vx * 0.3;
        if (e.vy === 0 && b.vy !== 0) b.vy = 0;
        b.x = e.x; b.y = e.y - 24;
        void save;
      }
      function popBalloon(b) {
        b.dead = 1; puff(b.x, b.y - 4, b.col, 12);
        au.noise(.15, { vol: .18, freq: 3000, slideTo: 500 });
        if (g.p.ride === b) { g.p.ride = null; g.p.vy = 0; }
        for (const e of g.enemies) if (e.bal === b && !e.dead) { e.dead = 1; addScore(e.pts, e.x, e.y - 10); }
      }
      function shoot() {
        const p = g.p, f = p.face ? -1 : 1;
        const sx = p.x + f * 8, sy = (p.ride ? p.y - 8 : p.y - 8);
        if (p.inWater && waterPt(p.x, p.y - 12)) {
          if (g.arrows.length >= 2) return;
          p.cd = 14; g.arrows.push({ x: sx, y: sy, vx: f * 2.2, vy: 0, life: 22, kind: 'bubble' });
          au.tone(300, .08, { type: 'sine', vol: .08, slideTo: 600 }); return;
        }
        if (p.weapon === 'bomb') {
          if (g.arrows.length >= 2) return;
          p.cd = 22; g.arrows.push({ x: sx, y: sy - 2, vx: f * 2.2, vy: -2.5, life: 120, kind: 'bomb' });
          au.tone(300, .1, { type: 'triangle', vol: .1 }); return;
        }
        if (p.weapon === 'laser') {
          if (g.arrows.length >= 3) return;
          p.cd = 8; g.arrows.push({ x: sx, y: sy, vx: f * 5, vy: 0, life: 50, kind: 'laser', hit: new Set() });
          au.tone(1800, .06, { type: 'square', vol: .07, slideTo: 900 }); return;
        }
        if (g.arrows.length >= 2) return;
        p.cd = 12; g.arrows.push({ x: sx, y: sy, vx: f * 3.2, vy: 0, life: 50, kind: 'arrow' });
        au.tone(1200, .05, { type: 'square', vol: .07, slideTo: 500 });
      }
      function freeKiwi() {
        const c = g.cage; c.open = true;
        g.phase = 'clear'; g.phaseT = 270;
        const tb = Math.max(0, 180 - Math.floor(g.timer / 60)) * 50;
        g.bonus = 5000 + Math.floor(tb / 100) * 100;
        addScore(g.bonus);
        au.melody([[784, .1], [988, .1], [1175, .1], [1568, .2], [1175, .1], [1568, .4]], { type: 'square', vol: .12 });
      }

      // ---------- enemies ----------
      function hitEnemy(e) {
        if (e.dead) return;
        e.dead = 1; addScore(e.pts, e.x, e.y - 12);
        puff(e.x, e.y - e.h / 2, '#ffffff', 8);
        au.noise(.12, { vol: .12, freq: 2500, slideTo: 400 });
        if (e.bal) { e.bal.rider = null; }
        if (Math.random() < 0.35) g.items.push({ x: e.x, y: e.y, kind: Math.random() < 0.12 ? (Math.random() < .5 ? 'laser' : 'bomb') : 'fruit', fi: (Math.random() * 4) | 0, t: 0, vy: -2, fall: true });
      }
      function updateEnemies() {
        const p = g.p;
        for (const e of g.enemies) {
          if (e.dead) { e.dead++; continue; }
          e.t++;
          const dx = p.x - e.x, dy = p.y - e.y;
          if (e.kind === 'walker') {
            const f = e.face ? -1 : 1;
            e.vx = f * e.sp;
            const aheadX = e.x + f * 8;
            if (!solidPt(aheadX, e.y + 2) || tAt(aheadX, e.y - 2) === SPUP || waterPt(aheadX, e.y - 4)) { e.face ^= 1; e.vx = 0; }
            e.vy = Math.min(4, e.vy + 0.25);
            phys(e, 5, 13);
            if (e.hitWall) e.face ^= 1;
            if (--e.cd <= 0) {
              e.cd = Math.max(60, 150 - g.loop * 20) + Math.random() * 90;
              if (Math.abs(dy) < 14 && Math.abs(dx) < 150 && Math.sign(dx) === f && !p.dead) {
                g.eshots.push({ x: e.x + f * 8, y: e.y - 8, vx: f * 1.8, vy: 0, life: 100, kind: 'spear' });
                au.tone(600, .05, { type: 'square', vol: .05, slideTo: 300 });
              }
            }
          } else if (e.kind === 'bat') {
            e.face = dx < 0 ? 1 : 0;
            if (Math.abs(dx) < 180 && Math.abs(dy) < 140) { e.x += Math.sign(dx) * e.sp; e.by += Math.sign(dy - 6) * e.sp * 0.4; }
            e.y = e.by + Math.sin(e.t * .08) * 10;
            if (solidPt(e.x, e.y)) { e.x -= Math.sign(dx) * e.sp; e.by -= Math.sign(dy - 6) * e.sp * 0.4; }
          } else if (e.kind === 'fish') {
            const f = e.face ? -1 : 1;
            const nx = e.x + f * e.sp;
            if (!waterPt(nx + f * 7, e.y) || solidPt(nx + f * 7, e.y)) e.face ^= 1; else e.x = nx;
            e.y += Math.sin(e.t * .05) * .3;
            if (Math.abs(dx) < 80 && p.inWater && waterPt(e.x, e.y + Math.sign(dy) * 8)) e.y += Math.sign(dy) * .3;
          } else if (e.kind === 'rider') {
            const b = e.bal;
            if (!b || b.dead) { e.dead = 1; continue; }
            b.vx += Math.sign(dx) * 0.02; b.vy += Math.sign(dy - 30) * 0.015;
            b.vx = Math.max(-e.sp, Math.min(e.sp, b.vx)) * 0.99; b.vy = Math.max(-e.sp, Math.min(e.sp, b.vy)) * 0.99;
            moveBalloon(b);
            e.x = b.x; e.y = b.y + 22; e.face = dx < 0 ? 1 : 0;
            if (--e.cd <= 0 && Math.abs(dx) < 140 && Math.abs(dy) < 120) {
              e.cd = Math.max(70, 160 - g.loop * 20);
              const a = Math.atan2(dy - 6, dx);
              g.eshots.push({ x: e.x, y: e.y - 6, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, life: 140, kind: 'ball' });
              au.tone(400, .06, { type: 'square', vol: .05 });
            }
          }
          if (!p.dead && Math.abs(dx) < (e.w / 2 + 4) && e.y - e.h < p.y - 2 && e.y > p.y - 12) killPlayer();
          // rider's balloon can be bumped by the player in a balloon
        }
        g.enemies = g.enemies.filter(e => e.dead < 30);
        // periodic reinforcements from the screen edge
        if (--g.spawnT <= 0) {
          g.spawnT = Math.max(300, 700 - g.loop * 100);
          if (g.enemies.filter(e => !e.dead).length < 8 && !g.def.boss) {
            const sx = g.camX + (Math.random() < .5 ? -10 : W + 10), sy = g.camY + 30 + Math.random() * 100;
            if (!solidPt(sx, sy)) g.enemies.push({ kind: 'bat', x: sx, y: sy, by: sy, vx: 0, vy: 0, face: 1, sp: 0.6 + g.loop * .15, t: 0, w: 12, h: 8, pts: 300, dead: 0 });
          }
        }
        // the devil comes for slow kiwis
        g.timer++;
        if (g.timer === 60 * 100) { au.melody([[1200, .1], [0, .05], [1200, .1], [0, .05], [1200, .1]], { type: 'square', vol: .1 }); }
        if (g.timer > 60 * 120 && !g.devil && !g.def.boss) { g.devil = { x: g.camX - 20, y: g.camY + 40, t: 0 }; au.melody([[220, .15], [208, .15], [196, .15], [185, .4]], { type: 'sawtooth', vol: .12 }); }
        if (g.devil) {
          const d = g.devil; d.t++;
          const ddx = p.x - d.x, ddy = p.y - 8 - d.y, dd = Math.hypot(ddx, ddy) || 1;
          const sp = 0.7 + Math.min(0.6, d.t / 3000);
          d.x += ddx / dd * sp; d.y += ddy / dd * sp;
          if (dd < 10 && !p.dead) killPlayer();
        }
      }
      function updateBoss() {
        const b = g.boss; if (!b) return;
        if (b.dead) { b.dead++; if (b.dead % 6 === 0 && b.dead < 90) { puff(b.x + (Math.random() - .5) * 50, b.y + (Math.random() - .5) * 30, '#ffff80', 10); au.noise(.2, { vol: .15, freq: 1200 }); } return; }
        b.t++; if (b.flash > 0) b.flash--;
        const cx = MW * TS / 2, sp = 1 + g.loop * .25;
        b.x = cx + Math.sin(b.t * 0.011 * sp) * (MW * TS / 2 - 60);
        b.y = 5 * TS + Math.sin(b.t * 0.023 * sp) * 40;
        const p = g.p;
        if (--b.cd <= 0) {
          b.cd = Math.max(50, 110 - g.loop * 15);
          const a = Math.atan2(p.y - 8 - b.y, p.x - b.x);
          for (let k = -1; k <= 1; k++) g.eshots.push({ x: b.x - 20, y: b.y + 6, vx: Math.cos(a + k * .25) * 1.7, vy: Math.sin(a + k * .25) * 1.7, life: 200, kind: 'ice' });
          au.tone(200, .2, { type: 'sawtooth', vol: .1, slideTo: 100 });
        }
        if (!p.dead && Math.abs(p.x - b.x) < 30 && Math.abs(p.y - 8 - b.y) < 20) killPlayer();
      }
      function hitBoss(dmg) {
        const b = g.boss; if (!b || b.dead) return;
        b.hp -= dmg; b.flash = 6;
        au.tone(150, .06, { type: 'square', vol: .1 });
        if (b.hp <= 0) {
          b.dead = 1; addScore(20000, b.x, b.y - 30);
          g.cage = { x: 16 * TS, y: 8 * TS, open: false };
          au.melody([[392, .1], [523, .1], [659, .1], [784, .3]], { type: 'square', vol: .14, delay: .2 });
        }
      }
      function updateShots() {
        const p = g.p;
        for (const a of g.arrows) {
          if (a.kind === 'bomb') a.vy += 0.15;
          a.x += a.vx; a.y += a.vy; a.life--;
          if (solidPt(a.x, a.y)) { a.life = 0; if (a.kind === 'bomb') explode(a.x, a.y); continue; }
          if (a.kind === 'arrow' && waterPt(a.x, a.y)) a.life = Math.min(a.life, 3);
          for (const e of g.enemies) {
            if (e.dead) continue;
            const hb = e.kind === 'rider' ? { x: e.x - 6, y: e.y - 14, w: 12, h: 14 } : { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
            if (a.x > hb.x - 2 && a.x < hb.x + hb.w + 2 && a.y > hb.y - 2 && a.y < hb.y + hb.h + 2) {
              if (a.kind === 'laser') { if (a.hit.has(e)) continue; a.hit.add(e); hitEnemy(e); }
              else { if (a.kind === 'bomb') explode(a.x, a.y); else hitEnemy(e); a.life = 0; break; }
            }
          }
          // pop enemy-ridden balloons with a shot to the envelope
          for (const b of g.balloons) if (!b.dead && b.rider === 'enemy' && Math.abs(a.x - b.x) < 8 && Math.abs(a.y - (b.y - 4)) < 9 && a.life > 0) { popBalloon(b); a.life = 0; }
          const B = g.boss;
          if (B && !B.dead && a.life > 0 && Math.abs(a.x - B.x) < 32 && Math.abs(a.y - B.y) < 22) { hitBoss(a.kind === 'bomb' ? 3 : a.kind === 'laser' ? 2 : 1); if (a.kind === 'bomb') explode(a.x, a.y); a.life = 0; }
        }
        g.arrows = g.arrows.filter(a => a.life > 0);
        for (const s of g.eshots) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (solidPt(s.x, s.y)) s.life = 0;
          if (!p.dead && p.inv <= 0) {
            if (Math.abs(s.x - p.x) < 6 && s.y > p.y - 13 && s.y < p.y) { s.life = 0; killPlayer(); }
            else if (p.ride && Math.abs(s.x - p.ride.x) < 8 && Math.abs(s.y - (p.ride.y - 4)) < 9) { s.life = 0; popBalloon(p.ride); }
          }
        }
        g.eshots = g.eshots.filter(s => s.life > 0);
        for (const it of g.items) {
          it.t++;
          if (it.fall) { it.vy = Math.min(3, it.vy + .15); it.y += it.vy; if (solidPt(it.x, it.y)) { it.y = Math.floor(it.y / TS) * TS; it.fall = false; } if (it.y > MH * TS) it.got = true; }
          if (!p.dead && Math.abs(it.x - p.x) < 10 && it.y > p.y - 16 && it.y < p.y + 10) {
            it.got = true;
            if (it.kind === 'fruit') { addScore([500, 700, 1000, 2000][it.fi], it.x, it.y - 12); au.melody([[1319, .04], [1760, .06]], { type: 'square', vol: .08 }); }
            else { p.weapon = it.kind; p.wT = 1200; addScore(1000, it.x, it.y - 12); au.melody([[523, .05], [784, .05], [1047, .1]], { type: 'square', vol: .1 }); }
          }
        }
        g.items = g.items.filter(i => !i.got);
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; if (!q.bub) q.vy += .08; else if (!waterPt(q.x, q.y)) q.t = 0; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= .4; }
        g.pops = g.pops.filter(q => q.t > 0);
        for (const b of g.balloons) { b.t++; if (!b.rider && !b.dead) { b.y += Math.sin(b.t * .05) * .15; } }
        g.balloons = g.balloons.filter(b => !b.dead);
      }
      function explode(x, y) {
        puff(x, y, '#ffd040', 16); au.noise(.3, { vol: .18, freq: 1200, slideTo: 100 });
        for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - e.h / 2 - y) < 26) hitEnemy(e);
      }
      function updateCamera() {
        const p = g.p;
        const tx = Math.max(0, Math.min(MW * TS - W, p.x - W / 2)), ty = Math.max(0, Math.min(MH * TS - VH, p.y - VH / 2 - 8));
        g.camX += (tx - g.camX) * 0.2; g.camY += (ty - g.camY) * 0.2;
      }

      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); g.camX = 0; g.camY = 0; snapCam(); }
            else { coinFlash = 90; au.tone(90, .3, { type: 'square', vol: .15 }); }
          }
          return;
        }
        if (g.phase === 'ready') { snapCam(); if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') { updatePlayer(); if (g.phase === 'play') { updateEnemies(); updateBoss(); updateShots(); } updateCamera(); return; }
        if (g.phase === 'dying') { const p = g.p; p.vy += .2; p.y += p.vy; updateShots(); updateBoss(); if (--g.phaseT <= 0) respawn(); return; }
        if (g.phase === 'clear') { updateShots(); if (--g.phaseT <= 0) { g.stage++; startStage(); snapCam(); } return; }
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } }
      }
      function snapCam() {
        const p = g.p;
        g.camX = Math.max(0, Math.min(MW * TS - W, p.x - W / 2)); g.camY = Math.max(0, Math.min(MH * TS - VH, p.y - VH / 2 - 8));
      }

      // ---------- render ----------
      function drawKiwi(ctx, x, y, face, walk, set) {
        const s = set || SP_KIWI;
        const im = (walk >> 3) & 1 ? s.b[face] : s.a[face];
        ctx.drawImage(im, Math.round(x - 7), Math.round(y - 13));
      }
      function drawBow(ctx, x, y, face) {
        const f = face ? -1 : 1;
        ctx.fillStyle = '#a05010';
        ctx.fillRect(Math.round(x + f * 6), Math.round(y - 12), 1, 2); ctx.fillRect(Math.round(x + f * 7), Math.round(y - 10), 1, 5); ctx.fillRect(Math.round(x + f * 6), Math.round(y - 5), 1, 2);
        ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x + f * 5), Math.round(y - 11), 1, 9);
      }
      function drawBalloon(ctx, b, sx, sy) {
        const x = Math.round(sx), y = Math.round(sy);
        ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(x, y - 4, 8, 10, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 4, y - 10, 2, 4);
        ctx.fillStyle = '#a07040'; ctx.fillRect(x - 1, y + 6, 2, 2);
        ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x - 5, y + 13); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 5, y + 13); ctx.stroke();
        ctx.fillStyle = '#c08040'; ctx.fillRect(x - 6, y + 13, 12, 2);
      }
      function drawEnemy(ctx, e, ox, oy) {
        const x = Math.round(e.x - ox), y = Math.round(e.y - oy);
        if (e.dead) { if (e.dead & 2) return; }
        const f = e.face ? -1 : 1;
        if (e.kind === 'walker') {
          // a bear soldier with a spear
          ctx.fillStyle = '#8a5020'; ctx.fillRect(x - 5, y - 12, 10, 9); ctx.fillRect(x - 4, y - 15, 8, 4);
          ctx.fillRect(x - 5, y - 16, 2, 2); ctx.fillRect(x + 3, y - 16, 2, 2);
          ctx.fillStyle = '#d0a070'; ctx.fillRect(x + f * 2 - 1, y - 13, 3, 2); ctx.fillRect(x - 2, y - 9, 4, 4);
          ctx.fillStyle = '#000'; ctx.fillRect(x + f * 1, y - 14, 1, 1);
          const st = (e.t >> 3) & 1;
          ctx.fillStyle = '#5a3010'; ctx.fillRect(x - 4 + st, y - 3, 3, 3); ctx.fillRect(x + 1 - st, y - 3, 3, 3);
          ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x + (f > 0 ? 5 : -12), y - 9, 7, 1); ctx.fillStyle = '#806040'; ctx.fillRect(x - f * 4, y - 9, f * 9, 1);
        } else if (e.kind === 'bat') {
          const up = (e.t >> 2) & 1;
          ctx.fillStyle = '#404060'; ctx.fillRect(x - 3, y - 6, 6, 5);
          ctx.fillStyle = '#6060a0';
          if (up) { ctx.fillRect(x - 9, y - 9, 6, 2); ctx.fillRect(x + 3, y - 9, 6, 2); } else { ctx.fillRect(x - 9, y - 3, 6, 2); ctx.fillRect(x + 3, y - 3, 6, 2); }
          ctx.fillStyle = '#ffff00'; ctx.fillRect(x - 2, y - 5, 1, 1); ctx.fillRect(x + 1, y - 5, 1, 1);
        } else if (e.kind === 'fish') {
          ctx.fillStyle = '#ff6080'; ctx.fillRect(x - 6, y - 4, 10, 6); ctx.fillRect(x - f * 8 - (f > 0 ? 0 : -1), y - 6 + ((e.t >> 3) & 1), 3, 10);
          ctx.fillStyle = '#fff'; ctx.fillRect(x + f * 2, y - 3, 2, 2); ctx.fillStyle = '#000'; ctx.fillRect(x + f * 2 + (f > 0 ? 1 : 0), y - 2, 1, 1);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, y - 6, 4, 2);
        } else if (e.kind === 'rider') {
          // a cat-like rider in the basket
          ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 4, y - 12, 8, 7); ctx.fillRect(x - 4, y - 14, 2, 2); ctx.fillRect(x + 2, y - 14, 2, 2);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 10, 1, 1); ctx.fillRect(x + 1, y - 10, 1, 1);
          ctx.fillStyle = '#ff8080'; ctx.fillRect(x - 1, y - 8, 2, 1);
        }
      }
      function drawBoss(ctx, b, ox, oy) {
        if (b.dead > 90) return;
        const x = Math.round(b.x - ox), y = Math.round(b.y - oy);
        const fl = b.flash > 0;
        // a big frost whale
        ctx.fillStyle = fl ? '#ffffff' : '#4070c0';
        ctx.beginPath(); ctx.ellipse(x, y, 34, 22, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = fl ? '#ffffff' : '#c0e0ff'; ctx.beginPath(); ctx.ellipse(x - 4, y + 10, 26, 10, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = fl ? '#fff' : '#305090';
        ctx.beginPath(); ctx.moveTo(x + 30, y - 4); ctx.lineTo(x + 48, y - 18 + Math.sin(b.t * .1) * 6); ctx.lineTo(x + 48, y + 8 + Math.sin(b.t * .1) * 6); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 22, y - 10, 7, 7); ctx.fillStyle = '#000'; ctx.fillRect(x - 21, y - 8, 3, 4);
        ctx.fillStyle = '#802020'; ctx.fillRect(x - 32, y + 4, 14, 3);
        ctx.fillStyle = '#e0f0ff'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 8 + k * 6, y - 26 - ((b.t >> 2) + k) % 6, 2, 4);
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const pal = g.pal;
        const gr = ctx.createLinearGradient(0, HUD, 0, H); gr.addColorStop(0, pal.sky[0]); gr.addColorStop(1, pal.sky[1]);
        ctx.fillStyle = gr; ctx.fillRect(0, HUD, W, VH);
        const ox = Math.round(g.camX), oy = Math.round(g.camY) - HUD;
        // clouds / backdrop
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        for (let i = 0; i < 6; i++) { const cx = ((i * 97 - ox * .3) % (W + 80) + W + 80) % (W + 80) - 40, cy = HUD + 20 + (i * 37) % 120; ctx.fillRect(cx, cy, 30, 6); ctx.fillRect(cx + 6, cy - 4, 16, 4); }
        // tiles
        const c0 = Math.floor(ox / TS), r0 = Math.floor((oy + HUD) / TS);
        for (let r = r0; r <= r0 + 14; r++) for (let c = c0; c <= c0 + 16; c++) {
          if (r < 0 || c < 0 || r >= MH || c >= MW) continue;
          const t = tiles[r * MW + c]; const x = c * TS - ox, y = r * TS - oy;
          if (t === WALL) ctx.drawImage(r > 0 && tiles[(r - 1) * MW + c] !== WALL ? tileCache.top : tileCache.wall, x, y);
          else if (t === SPUP || t === SPDN) {
            ctx.fillStyle = '#e0e0f0';
            for (let k = 0; k < 4; k++) {
              for (let j = 0; j < 8; j++) { const wdt = Math.max(1, Math.round((j + 1) / 2)); if (t === SPUP) ctx.fillRect(x + k * 4 + 2 - wdt / 2, y + 8 + j, wdt, 1); else ctx.fillRect(x + k * 4 + 2 - wdt / 2, y + 7 - j, wdt, 1); }
            }
          }
        }
        // cage
        if (g.cage) drawCage(ctx, g.cage, ox, oy);
        for (const it of g.items) drawItem(ctx, it, it.x - ox, it.y - oy);
        for (const b of g.balloons) drawBalloon(ctx, b, b.x - ox, b.y - oy);
        for (const e of g.enemies) drawEnemy(ctx, e, ox, oy);
        if (g.boss) drawBoss(ctx, g.boss, ox, oy);
        const p = g.p;
        if (g.phase !== 'wait' && g.phase !== 'over' && !(p.inv > 0 && (frame & 2) && !p.dead)) {
          if (p.dead) { ctx.save(); ctx.translate(Math.round(p.x - ox), Math.round(p.y - oy - 6)); ctx.scale(1, -1); ctx.drawImage(SP_KIWI.a[p.face], -7, -7); ctx.restore(); }
          else { drawKiwi(ctx, p.x - ox, p.y - oy, p.face, p.walk, null); drawBow(ctx, p.x - ox, p.y - oy, p.face); }
        }
        for (const a of g.arrows) {
          const x = Math.round(a.x - ox), y = Math.round(a.y - oy);
          if (a.kind === 'arrow') { ctx.fillStyle = '#806030'; ctx.fillRect(x - 5, y, 10, 1); ctx.fillStyle = '#fff'; ctx.fillRect(a.vx > 0 ? x + 4 : x - 6, y - 1, 2, 3); ctx.fillStyle = '#ff4040'; ctx.fillRect(a.vx > 0 ? x - 6 : x + 4, y - 1, 2, 3); }
          else if (a.kind === 'laser') { ctx.fillStyle = (frame & 2) ? '#40ffff' : '#ffffff'; ctx.fillRect(x - 8, y, 16, 2); }
          else if (a.kind === 'bomb') { ctx.fillStyle = '#202020'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.3); ctx.fill(); ctx.fillStyle = (frame & 2) ? '#ff4000' : '#ffff00'; ctx.fillRect(x, y - 5, 1, 2); }
          else { ctx.strokeStyle = '#e0f0ff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.3); ctx.stroke(); }
        }
        for (const s of g.eshots) {
          const x = Math.round(s.x - ox), y = Math.round(s.y - oy);
          if (s.kind === 'spear') { ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 5, y, 10, 1); ctx.fillStyle = '#806040'; ctx.fillRect(s.vx > 0 ? x - 5 : x, y, 5, 1); }
          else if (s.kind === 'ice') { ctx.fillStyle = (frame & 4) ? '#c0f0ff' : '#ffffff'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#60a0ff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
          else { ctx.fillStyle = (frame & 2) ? '#ff4040' : '#ffff40'; ctx.fillRect(x - 2, y - 2, 4, 4); }
        }
        if (g.devil) {
          const d = g.devil, x = Math.round(d.x - ox), y = Math.round(d.y - oy);
          ctx.globalAlpha = .85; ctx.fillStyle = '#d02020'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.3); ctx.fill();
          ctx.fillRect(x - 8, y - 12, 3, 6); ctx.fillRect(x + 5, y - 12, 3, 6);
          ctx.fillStyle = '#ffff00'; ctx.fillRect(x - 4, y - 3, 2, 2); ctx.fillRect(x + 2, y - 3, 2, 2);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y + 3, 6, 1);
          ctx.globalAlpha = 1;
        }
        // water overlay
        for (let r = r0; r <= r0 + 14; r++) for (let c = c0; c <= c0 + 16; c++) {
          if (r < 0 || c < 0 || r >= MH || c >= MW) continue;
          if (tiles[r * MW + c] !== WATER) continue;
          const x = c * TS - ox, y = r * TS - oy;
          ctx.fillStyle = pal.water; ctx.fillRect(x, y, 16, 16);
          if (r > 0 && tiles[(r - 1) * MW + c] === AIR) { ctx.fillStyle = '#c0e8ff'; for (let k = 0; k < 16; k += 2) ctx.fillRect(x + k, y + Math.round(Math.sin((frame + k + c * 16) * .12) * 1.2), 2, 1); }
        }
        for (const q of g.parts) { ctx.fillStyle = q.col; if (q.bub) { ctx.strokeStyle = q.col; ctx.strokeRect(Math.round(q.x - ox) - 1.5, Math.round(q.y - oy) - 1.5, 3, 3); } else ctx.fillRect(Math.round(q.x - ox), Math.round(q.y - oy), 2, 2); }
        for (const q of g.pops) text(ctx, q.s, q.x - ox, q.y - oy, '#ffffff', 1, 'center');
        drawHUD(ctx);
        // air meter
        if (p.air < 600 && !p.dead) {
          const x = Math.round(p.x - ox) - 10, y = Math.round(p.y - oy) - 24;
          ctx.fillStyle = '#000'; ctx.fillRect(x, y, 22, 4); ctx.fillStyle = p.air < 180 ? ((frame & 4) ? '#ff2020' : '#ffff00') : '#40c0ff'; ctx.fillRect(x + 1, y + 1, Math.ceil(20 * p.air / 600), 2);
          text(ctx, 'AIR', x - 20, y - 2, '#ffffff', 1);
        }
        if (g.phase === 'ready') { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(40, 84, W - 80, 40); text(ctx, 'ROUND ' + (1 + Math.floor(g.stage / LEVELS.length)) + '-' + (1 + g.stage % LEVELS.length), W / 2, 90, '#f8d020', 2, 'center'); text(ctx, g.def.boss ? 'BEWARE THE GUARDIAN!' : g.def.name, W / 2, 110, '#ffffff', 1, 'center'); }
        if (g.phase === 'clear') { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(30, 84, W - 60, 44); text(ctx, 'KIWI FREED!', W / 2, 90, '#f8d020', 2, 'center'); text(ctx, 'BONUS ' + g.bonus, W / 2, 112, '#ffffff', 1, 'center'); }
        if (g.timer > 60 * 100 && g.timer < 60 * 120 && g.phase === 'play' && !g.def.boss && (frame >> 4) & 1) text(ctx, 'HURRY UP!', W / 2, 40, '#ff4040', 2, 'center');
        if (g.phase === 'over') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(50, 96, W - 100, 30); text(ctx, 'GAME OVER', W / 2, 104, '#ff4040', 2, 'center'); }
      }
      function drawCage(ctx, c, ox, oy) {
        const x = Math.round(c.x - ox), y = Math.round(c.y - oy);
        if (!c.open || g.phase === 'clear') {
          const hop = c.open ? Math.abs(Math.sin(frame * .15)) * 10 : 0;
          ctx.drawImage(SP_FRIEND[(frame >> 5) & 1], x - 7, y - 14 - hop);
          if (c.open) { for (let k = 0; k < 3; k++) { const a = frame * .05 + k * 2.1; ctx.fillStyle = '#ff60a0'; ctx.fillRect(x + Math.cos(a) * 14, y - 20 + Math.sin(a) * 8, 3, 3); } }
        }
        if (!c.open) {
          ctx.fillStyle = '#a0a0b0';
          for (let k = -8; k <= 8; k += 4) ctx.fillRect(x + k, y - 22, 1, 22);
          ctx.fillStyle = '#c0c0d0'; ctx.fillRect(x - 9, y - 23, 19, 2); ctx.fillRect(x - 9, y - 1, 19, 1);
          ctx.fillRect(x, y - 27, 1, 4);
          if ((frame >> 4) & 1) text(ctx, 'HELP!', x, y - 36, '#ffffff', 1, 'center');
        }
      }
      function drawItem(ctx, it, x, y) {
        x = Math.round(x); y = Math.round(y) - ((frame >> 4) & 1);
        if (it.kind === 'fruit') {
          const cols = [['#ff2020', '#40a020'], ['#ffa020', '#40a020'], ['#a040ff', '#40a020'], ['#60ff40', '#806020']][it.fi];
          ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x, y - 5, 4, 0, 6.3); ctx.fill();
          ctx.fillStyle = cols[1]; ctx.fillRect(x, y - 11, 1, 3); ctx.fillRect(x + 1, y - 11, 2, 1);
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 2, y - 7, 1, 2);
        } else if (it.kind === 'laser') {
          ctx.fillStyle = '#2040c0'; ctx.fillRect(x - 6, y - 10, 12, 10); text(ctx, 'L', x - 2, y - 9, '#40ffff', 1);
        } else {
          ctx.fillStyle = '#802020'; ctx.fillRect(x - 6, y - 10, 12, 10); text(ctx, 'B', x - 2, y - 9, '#ffff40', 1);
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUD);
        text(ctx, '1UP', 4, 0, '#f8d020', 1); text(ctx, String(g.score).padStart(7, '0'), 4, 8, '#ffffff', 1);
        text(ctx, 'HI', 92, 0, '#f08020', 1); text(ctx, String(hi).padStart(7, '0'), 92, 8, '#ffffff', 1);
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) ctx.drawImage(SP_KIWI.a[0], 0, 0, 14, 13, 150 + i * 13, 2, 10, 10);
        if (g.p.weapon) text(ctx, g.p.weapon === 'laser' ? 'LASER' : 'BOMB', W - 4, 0, '#40ffff', 1, 'right');
        if (g.boss && !g.boss.dead) { ctx.fillStyle = '#400000'; ctx.fillRect(W - 54, 10, 50, 4); ctx.fillStyle = '#ff4040'; ctx.fillRect(W - 53, 11, Math.ceil(48 * g.boss.hp / g.boss.maxhp), 2); }
      }
      function renderTitle(ctx) {
        const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2070e0'); gr.addColorStop(1, '#a0e0ff');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#30a030'; ctx.fillRect(0, 180, W, 44); ctx.fillStyle = '#60e040'; ctx.fillRect(0, 180, W, 2);
        text(ctx, 'THE', W / 2, 18, '#ffffff', 2, 'center');
        text(ctx, 'NEWZEALAND', W / 2 + 2, 38, '#803000', 3, 'center'); text(ctx, 'NEWZEALAND', W / 2, 36, '#f8d020', 3, 'center');
        text(ctx, 'STORY', W / 2 + 2, 64, '#803000', 3, 'center'); text(ctx, 'STORY', W / 2, 62, '#f08020', 3, 'center');
        // Tiki and a balloon
        const bx = 60 + Math.sin(titleT * .02) * 20, by = 110 + Math.sin(titleT * .05) * 6;
        drawBalloon(ctx, { col: '#ff4040' }, bx, by); drawKiwi(ctx, bx, by + 24, 0, 0, null);
        const kx = (titleT * 0.6) % (W + 40) - 20;
        drawKiwi(ctx, kx, 180, 0, titleT, null); drawBow(ctx, kx, 180, 0);
        const page = Math.floor(titleT / 420) % 2;
        if (page === 0) {
          text(ctx, 'RESCUE YOUR KIWI FRIENDS', W / 2, 96, '#ffffff', 1, 'center');
          text(ctx, 'FROM THE LEOPARD SEAL!', W / 2, 108, '#ffffff', 1, 'center');
          text(ctx, 'WATCH YOUR AIR UNDERWATER', W / 2 + 30, 128, '#c0f0ff', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2 + 30, 104, '#f08020', 1, 'center'); text(ctx, String(hi), W / 2 + 30, 116, '#ffffff', 1, 'center');
          text(ctx, 'EXTRA KIWI EVERY 50000', W / 2 + 30, 132, '#ffffff', 1, 'center');
        }
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 152, '#ff4040', 1, 'center'); }
        else if ((titleT >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 152, '#ffff40', 1, 'center');
        text(ctx, credStr(), W / 2, 196, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1988 TAITO', W / 2, 210, '#e0ffe0', 1, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
