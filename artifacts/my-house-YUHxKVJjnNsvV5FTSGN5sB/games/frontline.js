// Front Line (Taito, 1982) - from-scratch recreation. Fight up the map on foot or in a captured tank, then grenade the enemy fort.
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
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function tileCanvas(fn) { const c = document.createElement('canvas'); c.width = 16; c.height = 16; fn(c.getContext('2d')); return c; }

  const W = 224, H = 256, TS = 16, COLS = 14, ROWS = 196;
  const HUDH = 16;
  const T_GRASS = 0, T_DIRT = 1, T_TREE = 2, T_ROCK = 3, T_SAND = 4, T_WALL = 5, T_BUNK = 6, T_WATER = 7;
  const SOLID = [false, false, true, true, true, true, true, true];
  const BLOCKS_SHOT = [false, false, true, true, true, true, true, false];
  const D8 = [[0, -1], [0.7071, -0.7071], [1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071]];

  // ---------- tiles ----------
  function rndT(seed) { let s = seed; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); }
  const TILES = [];
  function grassTile(seed, base, dots) {
    return tileCanvas(x => { const r = rndT(seed); x.fillStyle = base; x.fillRect(0, 0, 16, 16); for (let i = 0; i < 14; i++) { x.fillStyle = dots[i % dots.length]; x.fillRect((r() * 16) | 0, (r() * 16) | 0, 1, 1 + (r() * 2 | 0)); } });
  }
  TILES[T_GRASS] = [grassTile(3, '#3c8a28', ['#2c6a1c', '#58a838']), grassTile(9, '#3c8a28', ['#2c6a1c', '#68b040', '#c8c040'])];
  TILES[T_DIRT] = [grassTile(5, '#a07840', ['#806030', '#c09858']), grassTile(11, '#a07840', ['#806030', '#b08850'])];
  TILES[T_TREE] = [tileCanvas(x => {
    x.drawImage(TILES[T_GRASS][0], 0, 0);
    x.fillStyle = '#1e4a14'; x.beginPath(); x.arc(8, 8, 7.5, 0, 6.3); x.fill();
    x.fillStyle = '#2e6a1e'; x.beginPath(); x.arc(7, 7, 5.5, 0, 6.3); x.fill();
    x.fillStyle = '#4a9030'; x.fillRect(4, 4, 3, 2); x.fillRect(9, 6, 2, 2); x.fillRect(6, 9, 2, 2);
  })];
  TILES[T_ROCK] = [tileCanvas(x => {
    x.drawImage(TILES[T_GRASS][1], 0, 0);
    x.fillStyle = '#585858'; x.fillRect(2, 3, 12, 11); x.fillRect(1, 5, 14, 7);
    x.fillStyle = '#8a8a8a'; x.fillRect(3, 4, 7, 4); x.fillStyle = '#b0b0b0'; x.fillRect(4, 4, 3, 2);
    x.fillStyle = '#383838'; x.fillRect(3, 12, 11, 2);
  })];
  TILES[T_SAND] = [tileCanvas(x => {
    x.drawImage(TILES[T_DIRT][0], 0, 0);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const ox = c * 6 - (r & 1) * 3, oy = 2 + r * 4;
      x.fillStyle = '#6a5428'; x.fillRect(ox, oy, 6, 4); x.fillStyle = '#d8c080'; x.fillRect(ox + 1, oy, 4, 3); x.fillStyle = '#b8a060'; x.fillRect(ox + 1, oy + 2, 4, 1);
    }
  })];
  TILES[T_WALL] = [tileCanvas(x => {
    x.fillStyle = '#707078'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#505058';
    for (let r = 0; r < 4; r++) { x.fillRect(0, r * 4 + 3, 16, 1); for (let c = 0; c < 3; c++) x.fillRect(((r & 1) * 4 + c * 8) % 16, r * 4, 1, 3); }
    x.fillStyle = '#9898a0'; x.fillRect(1, 0, 6, 1); x.fillRect(9, 4, 5, 1);
  })];
  TILES[T_BUNK] = TILES[T_WALL];
  TILES[T_WATER] = [tileCanvas(x => { x.fillStyle = '#2040a0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#4070d0'; x.fillRect(2, 4, 6, 1); x.fillRect(9, 10, 5, 1); }),
  tileCanvas(x => { x.fillStyle = '#2040a0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#4070d0'; x.fillRect(5, 3, 6, 1); x.fillRect(1, 11, 5, 1); })];

  // ---------- sprites (soldier frames, facing up, rotated via mirror for side) ----------
  const SOLD = {
    a: ['..hh..', '.hhhh.', '.ssss.', 'bbbbbb', 'bbbbbb', '.bbbb.', '.kbbk.', '.k..k.', '.k..k.', '.f..f.'],
    b: ['..hh..', '.hhhh.', '.ssss.', 'bbbbbb', 'bbbbbb', '.bbbb.', '.kbbk.', '.k..k.', 'k....k', 'f....f'],
    dead: ['......', 'h..b..', 'hhbbbb', 'sbbbbk', '.bbbkk', '....f.']
  };
  function soldierSet(h, b, k) {
    const pal = { h, s: '#f0b080', b, k, f: '#302010' };
    return { a: spr(SOLD.a, pal), b: spr(SOLD.b, pal), dead: spr(SOLD.dead, pal) };
  }
  const SP_PLAYER = soldierSet('#4060e0', '#3a78d0', '#204890');
  const SP_ENEMY = soldierSet('#a0a0a0', '#c04030', '#802018');
  const SP_ENEMY2 = soldierSet('#606060', '#c0a030', '#806010');

  ArcadeRegistry.register({
    id: 'frontline', title: 'Front Line', year: 1982, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move/aim \u00b7 Space: fire (cannon in tank) \u00b7 X: grenade / exit tank \u00b7 Walk into an empty tank to drive it \u00b7 Enter: start',
    marquee: { bg: '#203010', fg: '#f0e060', accent: '#e03020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null, titleMap = false;
      let map = new Uint8Array(COLS * ROWS), vari = new Uint8Array(COLS * ROWS);

      // ---------- map ----------
      function genMap(level) {
        const r = rndT(1234 + level * 777);
        map.fill(T_GRASS);
        for (let i = 0; i < vari.length; i++) vari[i] = (r() * 2) | 0;
        const set = (c, rr, t) => { if (c >= 0 && c < COLS && rr >= 0 && rr < ROWS) map[rr * COLS + c] = t; };
        // fort
        for (let c = 0; c < COLS; c++) { set(c, 0, T_DIRT); set(c, 1, T_DIRT); set(c, 2, T_DIRT); set(c, 3, T_WALL); set(c, 4, T_WALL); }
        set(6, 4, T_BUNK); set(7, 4, T_BUNK); set(6, 3, T_BUNK); set(7, 3, T_BUNK);
        for (let rr = 5; rr < ROWS - 8; rr++) {
          const zone = rr < 90 ? 'tank' : 'inf';
          // features
          if (zone === 'inf') {
            if (rr % 11 === 0 && rr < ROWS - 12) { // sandbag line with gaps
              const gap = 2 + (r() * 9) | 0;
              for (let c = 1; c < COLS - 1; c++) if (c < gap || c > gap + 2) if (r() < 0.8) set(c, rr, T_SAND);
            }
            for (let c = 0; c < COLS; c++) if (r() < 0.07) set(c, rr, r() < .7 ? T_TREE : T_ROCK);
          } else {
            for (let c = 0; c < COLS; c++) if (r() < 0.045) set(c, rr, r() < .5 ? T_TREE : T_ROCK);
            if (rr % 23 === 0 && rr > 12) { // river with bridge
              const br = 3 + (r() * 7) | 0;
              for (let c = 0; c < COLS; c++) set(c, rr, (c === br || c === br + 1 || c === br + 2) ? T_DIRT : T_WATER);
              continue;
            }
            if (rr % 17 === 5) { const s = (r() * 10) | 0; for (let c = s; c < s + 3; c++) set(c, rr, T_SAND); }
          }
          // trees along edges
          if (r() < 0.5) set(0, rr, T_TREE); if (r() < 0.5) set(COLS - 1, rr, T_TREE);
        }
        // guaranteed lane (2 tiles wide) from start to fort
        let lc = 6;
        for (let rr = ROWS - 1; rr >= 5; rr--) {
          if (rr % 3 === 0) lc = Math.max(1, Math.min(COLS - 4, lc + ((r() * 3) | 0) - 1));
          for (let c = lc; c < lc + 3; c++) { const t = map[rr * COLS + c]; if (t !== T_DIRT) set(c, rr, (t === T_WATER) ? T_DIRT : T_DIRT); }
          // also clear to neighbour so lane stays connected after shift
          if (map[rr * COLS + lc - 1] === T_WATER) set(lc - 1, rr, T_DIRT);
        }
        // approach to fort cleared
        for (let rr = 5; rr < 8; rr++) for (let c = 1; c < COLS - 1; c++) set(c, rr, rr === 5 ? T_DIRT : T_GRASS);
        for (let rr = ROWS - 8; rr < ROWS; rr++) for (let c = 0; c < COLS; c++) set(c, rr, (c >= 5 && c <= 8) ? T_DIRT : T_GRASS);
      }
      const tileAt = (x, y) => { const c = Math.floor(x / TS), rr = Math.floor(y / TS); if (c < 0 || c >= COLS) return T_TREE; if (rr < 0) return T_WALL; if (rr >= ROWS) return T_GRASS; return map[rr * COLS + c]; };
      function solidAt(x, y) { return SOLID[tileAt(x, y)]; }
      function boxFree(x, y, hw, hh) { return !solidAt(x - hw, y - hh) && !solidAt(x + hw, y - hh) && !solidAt(x - hw, y + hh) && !solidAt(x + hw, y + hh); }
      function moveEnt(e, dx, dy, hw, hh) {
        let moved = false;
        if (dx && boxFree(e.x + dx, e.y, hw, hh)) { e.x += dx; moved = true; }
        if (dy && boxFree(e.x, e.y + dy, hw, hh)) { e.y += dy; moved = true; }
        return moved;
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, level: 1, nextLife: 10000 };
        startLevel();
      }
      function startLevel() {
        genMap(g.level);
        const startY = (ROWS - 3) * TS;
        g.camY = ROWS * TS - H + HUDH;
        g.p = { x: W / 2, y: startY, face: 0, walk: 0, inv: 0, dead: 0, tank: null, fireCd: 0, gCd: 0 };
        g.enemies = []; g.shots = []; g.eshots = []; g.grenades = []; g.booms = []; g.pops = []; g.tanks = [];
        g.bunker = { x: 7 * TS, y: 4 * TS + 8, hp: 1, cd: 120, dead: 0 };
        g.phase = 'ready'; g.phaseT = 150; g.spawnT = 60; g.etankT = 200;
        // parked tanks for the player
        placeTank((ROWS - 30) * TS, 'light'); placeTank(120 * TS, 'heavy'); placeTank(60 * TS, 'light'); placeTank(30 * TS, 'heavy');
        au.melody([[392, .12], [392, .06], [523, .12], [523, .06], [659, .12], [784, .3], [659, .12], [784, .4]], { type: 'square', vol: .12 });
      }
      function placeTank(y, kind) {
        for (let tries = 0; tries < 60; tries++) {
          const x = 24 + Math.random() * (W - 48);
          if (boxFree(x, y, 8, 8)) { g.tanks.push(mkTank(x, y, kind, false)); return; }
          y -= 4;
        }
      }
      function mkTank(x, y, kind, enemy) {
        return { x, y, kind, enemy, face: enemy ? 4 : 0, hp: kind === 'heavy' ? 3 : 2, maxhp: kind === 'heavy' ? 3 : 2, occupied: false, cd: 60, smoke: 0, tread: 0, ai: 0, dead: false, burn: 0 };
      }
      function addScore(n, x, y) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += g.nextLife < 30000 ? 20000 : 30000; au.melody([[1047, .08], [1319, .08], [1568, .16]], { type: 'square', vol: .14 }); }
        if (g.score > hi) hi = g.score;
        if (x != null) g.pops.push({ x, y, s: String(n), t: 50 });
      }
      function boom(x, y, big) {
        g.booms.push({ x, y, t: 0, big: !!big });
        au.noise(big ? .6 : .3, { vol: big ? .25 : .18, freq: big ? 1200 : 2000, slideTo: 80 });
      }
      function readDir() {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const dx = (R ? 1 : 0) - (L ? 1 : 0), dy = (D ? 1 : 0) - (U ? 1 : 0);
        if (!dx && !dy) return -1;
        const a = Math.atan2(dx, -dy);
        return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
      }
      function aimDir(dx, dy) { const a = Math.atan2(dx, -dy); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }

      function killPlayer() {
        const p = g.p; if (p.dead || p.inv > 0) return;
        p.dead = 1; g.phase = 'dying'; g.phaseT = 120;
        if (p.tank) { const t = p.tank; t.occupied = false; t.dead = true; boom(t.x, t.y, true); p.x = t.x; p.y = t.y; p.tank = null; }
        au.melody([[523, .08], [392, .08], [311, .08], [262, .3]], { type: 'square', vol: .14 });
      }
      function respawn() {
        const p = g.p;
        g.lives--;
        if (g.lives <= 0) { lastLife(); return; }
        doRespawn();
      }
      function doRespawn() {
        const p = g.p;
        p.dead = 0; p.inv = 150; p.tank = null; p.face = 0;
        p.y = Math.min(p.y + 24, g.camY + H - HUDH - 12);
        let ok = false;
        for (let dy = 0; dy < 80 && !ok; dy += 8) for (let x = 16; x < W - 16; x += 8) { const xx = (W / 2 + ((x / 8) & 1 ? x / 2 : -x / 2)); if (boxFree(xx, p.y - dy, 4, 5)) { p.x = xx; p.y -= dy; ok = true; break; } }
        g.eshots = []; g.grenades = g.grenades.filter(gr => !gr.enemy);
        for (const e of g.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < 50) e.dead = 1;
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
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .25], [370, .25], [349, .25], [330, .6]], { type: 'triangle', vol: .18 });
      }

      // ---------- spawning ----------
      function spawnInfantry() {
        const lvl = g.level;
        const cap = Math.min(10, 4 + lvl);
        if (g.enemies.filter(e => !e.dead).length >= cap) return;
        const fromSide = Math.random() < 0.25;
        let x, y;
        if (fromSide) { x = Math.random() < .5 ? 20 : W - 20; y = g.camY + 20 + Math.random() * 100; }
        else { x = 16 + Math.random() * (W - 32); y = g.camY - 6; }
        if (y < 6 * TS) return;
        if (!boxFree(x, y, 3, 4)) return;
        const gren = Math.random() < 0.15 + lvl * 0.04;
        g.enemies.push({ x, y, vx: 0, vy: 0, t: 0, walk: 0, face: 4, dead: 0, cd: 60 + Math.random() * 80, gren, tx: x, ty: y + 40, retarget: 0 });
      }
      function spawnEnemyTank() {
        if (g.tanks.filter(t => t.enemy && !t.dead).length >= Math.min(3, 1 + Math.floor(g.level / 2) + 1)) return;
        const y = g.camY - 10;
        if (y < 7 * TS) return;
        for (let i = 0; i < 10; i++) {
          const x = 24 + Math.random() * (W - 48);
          if (boxFree(x, y, 7, 7)) { const t = mkTank(x, y, Math.random() < 0.3 + g.level * 0.1 ? 'heavy' : 'light', true); t.occupied = true; g.tanks.push(t); return; }
        }
      }

      // ---------- player ----------
      function updatePlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.fireCd > 0) p.fireCd--; if (p.gCd > 0) p.gCd--;
        const d = readDir();
        if (p.tank) {
          const t = p.tank;
          if (d >= 0) {
            t.face = d; const sp = t.kind === 'heavy' ? 0.85 : 1.1;
            if (moveEnt(t, D8[d][0] * sp, D8[d][1] * sp, 7, 7)) t.tread++;
          }
          p.x = t.x; p.y = t.y;
          if (api.pressed('Space') && p.fireCd <= 0 && g.shots.filter(s => s.shell).length < 2) {
            p.fireCd = t.kind === 'heavy' ? 30 : 20;
            g.shots.push({ x: t.x + D8[t.face][0] * 10, y: t.y + D8[t.face][1] * 10, vx: D8[t.face][0] * 3.2, vy: D8[t.face][1] * 3.2, life: t.kind === 'heavy' ? 50 : 40, shell: true });
            au.noise(.15, { vol: .2, freq: 900, slideTo: 200 }); au.tone(120, .12, { type: 'square', vol: .1, slideTo: 60 });
          }
          if (api.pressed('KeyX')) exitTank();
          if (t.smoke > 0) { t.smoke--; if (t.smoke <= 0) { killPlayer(); } }
        } else {
          let sp = 0.9;
          if (d >= 0) { p.face = d; if (moveEnt(p, D8[d][0] * sp, D8[d][1] * sp, 3, 4)) p.walk++; }
          if (api.pressed('Space') && p.fireCd <= 0 && g.shots.filter(s => !s.shell).length < 3) {
            p.fireCd = 8;
            g.shots.push({ x: p.x + D8[p.face][0] * 5, y: p.y - 2 + D8[p.face][1] * 5, vx: D8[p.face][0] * 3, vy: D8[p.face][1] * 3, life: 34, shell: false });
            au.tone(1500, .04, { type: 'square', vol: .1, slideTo: 600 });
          }
          if (api.pressed('KeyX') && p.gCd <= 0 && g.grenades.filter(q => !q.enemy).length < 1) {
            p.gCd = 30; throwGrenade(p.x, p.y, p.face, 64, false);
          }
          // board a tank
          for (const t of g.tanks) {
            if (t.enemy || t.dead || t.occupied || t.burn) continue;
            if (Math.abs(t.x - p.x) < 9 && Math.abs(t.y - p.y) < 9) {
              t.occupied = true; p.tank = t; p.x = t.x; p.y = t.y; t.face = p.face;
              au.melody([[220, .06], [330, .06], [440, .1]], { type: 'square', vol: .12 });
              break;
            }
          }
        }
        // camera follows the player upward only
        const topLimit = 0;
        const wantCam = p.y - 150;
        if (wantCam < g.camY) g.camY = Math.max(topLimit, wantCam);
        const bottom = g.camY + H - HUDH - 8;
        if (p.tank) { if (p.tank.y > bottom - 4) p.tank.y = bottom - 4; p.x = p.tank.x; p.y = p.tank.y; }
        else if (p.y > bottom) p.y = bottom;
      }
      function exitTank() {
        const p = g.p, t = p.tank;
        const spots = [[-14, 0], [14, 0], [0, 14], [0, -14], [-12, 12], [12, 12]];
        for (const s of spots) if (boxFree(t.x + s[0], t.y + s[1], 3, 4)) {
          p.x = t.x + s[0]; p.y = t.y + s[1]; p.tank = null; t.occupied = false; p.inv = 30;
          au.melody([[440, .06], [330, .06], [220, .1]], { type: 'square', vol: .12 });
          if (t.smoke > 0) { t.burn = t.smoke; t.smoke = 0; }
          return;
        }
      }
      function throwGrenade(x, y, face, dist, enemy, tx, ty) {
        let vx, vy, T = 36;
        if (tx != null) { vx = (tx - x) / T; vy = (ty - y) / T; }
        else { vx = D8[face][0] * dist / T; vy = D8[face][1] * dist / T; }
        g.grenades.push({ x, y, vx, vy, t: 0, T, enemy });
        au.tone(700, .2, { type: 'triangle', vol: .08, slideTo: 300 });
      }
      function explodeAt(x, y, r, byEnemy, tankDmg) {
        boom(x, y, r > 14);
        const p = g.p;
        if (byEnemy) {
          if (p.tank) { if (Math.hypot(p.tank.x - x, p.tank.y - y) < r + 6) damageTank(p.tank, 1); }
          else if (Math.hypot(p.x - x, p.y - y) < r) killPlayer();
        }
        if (!byEnemy || true) {
          for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < r) { e.dead = 1; if (!byEnemy) addScore(200, e.x, e.y - 8); }
          for (const t of g.tanks) if (!t.dead && t.enemy && !byEnemy && Math.hypot(t.x - x, t.y - y) < r + 6) damageTank(t, tankDmg || 1);
        }
        // shells and grenades destroy sandbags
        const c = Math.floor(x / TS), rr = Math.floor(y / TS);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const cc = c + dx, r2 = rr + dy;
          if (cc < 0 || cc >= COLS || r2 < 0 || r2 >= ROWS) continue;
          const cx = cc * TS + 8, cy = r2 * TS + 8;
          if (map[r2 * COLS + cc] === T_SAND && Math.hypot(cx - x, cy - y) < r + 6) map[r2 * COLS + cc] = T_DIRT;
        }
        // bunker
        const b = g.bunker;
        if (!byEnemy && !b.dead && !p.tank && Math.abs(x - b.x) < 16 && Math.abs(y - b.y) < 16 && r >= 12) destroyBunker();
      }
      function damageTank(t, n) {
        if (t.dead) return;
        t.hp -= n;
        au.tone(200, .15, { type: 'square', vol: .12, slideTo: 90 });
        if (t.enemy) {
          if (t.hp <= 0) { t.dead = true; boom(t.x, t.y, true); addScore(t.kind === 'heavy' ? 2000 : 1000, t.x, t.y - 10); }
        } else {
          if (t.hp <= 0) { t.dead = true; boom(t.x, t.y, true); if (g.p.tank === t) killPlayer(); }
          else if (t.hp === 1 && g.p.tank === t && !t.smoke) { t.smoke = 240; au.melody([[880, .08], [0, .05], [880, .08], [0, .05], [880, .08]], { type: 'square', vol: .12 }); }
        }
      }
      function destroyBunker() {
        const b = g.bunker; b.dead = 1;
        boom(b.x, b.y, true); boom(b.x - 10, b.y - 6, true); boom(b.x + 10, b.y - 4, true);
        addScore(10000, b.x, b.y - 16);
        g.phase = 'clear'; g.phaseT = 300;
        au.melody([[523, .12], [659, .12], [784, .12], [1047, .24], [784, .12], [1047, .5]], { type: 'square', vol: .14, delay: .4 });
      }

      // ---------- enemies ----------
      function updateEnemies() {
        const p = g.p, lvl = g.level;
        const espd = 0.45 + lvl * 0.05;
        for (const e of g.enemies) {
          if (e.dead) { e.dead++; continue; }
          e.t++;
          if (--e.retarget <= 0) {
            e.retarget = 60 + Math.random() * 90;
            const r = Math.random();
            if (r < 0.4) { e.tx = p.x + (Math.random() - .5) * 80; e.ty = p.y - 30 - Math.random() * 60; }
            else if (r < 0.7) { e.tx = e.x; e.ty = e.y; } // crouch & shoot
            else { e.tx = e.x + (Math.random() - .5) * 60; e.ty = e.y + 20 + Math.random() * 40; }
          }
          const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
          if (d > 2) { const vx = dx / d * espd, vy = dy / d * espd; if (moveEnt(e, vx, vy, 3, 4)) { e.walk++; e.face = aimDir(vx, vy); } else e.retarget = 0; }
          else e.face = aimDir(p.x - e.x, p.y - e.y);
          if (--e.cd <= 0 && e.y > g.camY && e.y < g.camY + H - HUDH) {
            e.cd = Math.max(40, 140 - lvl * 12) + Math.random() * 80;
            const pd = Math.hypot(p.x - e.x, p.y - e.y);
            if (e.gren && pd < 110) { throwGrenade(e.x, e.y, 0, 0, true, p.x + (Math.random() - .5) * 16, p.y + (Math.random() - .5) * 16); }
            else if (pd < 160) {
              const a = Math.atan2(p.y - e.y, p.x - e.x) + (Math.random() - .5) * 0.25;
              const s = 1.3 + lvl * 0.1;
              e.face = aimDir(Math.cos(a), Math.sin(a));
              g.eshots.push({ x: e.x, y: e.y - 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 120 });
              au.tone(900, .04, { type: 'square', vol: .06, slideTo: 500 });
            }
          }
          // touch kills
          if (!p.tank && !p.dead && Math.abs(e.x - p.x) < 6 && Math.abs(e.y - p.y) < 8) killPlayer();
          if (p.tank && Math.abs(e.x - p.x) < 10 && Math.abs(e.y - p.y) < 10) { e.dead = 1; addScore(100, e.x, e.y - 8); au.noise(.1, { vol: .1, freq: 600 }); }
          if (e.y > g.camY + H + 20 || e.y < g.camY - 60) e.gone = true;
        }
        g.enemies = g.enemies.filter(e => !e.gone && e.dead < 60);
        // enemy tanks
        for (const t of g.tanks) {
          if (!t.enemy || t.dead) continue;
          t.ai--;
          const dx = p.x - t.x, dy = p.y - t.y;
          if (t.ai <= 0) {
            t.ai = 40 + Math.random() * 60;
            const r = Math.random();
            if (r < 0.5) t.mv = aimDir(Math.sign(dx) * (Math.abs(dx) > 12 ? 1 : 0), dy > 40 ? 1 : 0.0001);
            else if (r < 0.75) t.mv = -1;
            else t.mv = Math.random() < .5 ? 2 : 6;
          }
          if (t.mv >= 0) { t.face = t.mv; const sp = t.kind === 'heavy' ? 0.5 : 0.7; if (moveEnt(t, D8[t.mv][0] * sp, D8[t.mv][1] * sp, 7, 7)) t.tread++; else t.ai = 0; }
          else t.face = aimDir(dx, dy);
          if (--t.cd <= 0 && t.y > g.camY) {
            t.cd = Math.max(50, 130 - g.level * 10) + Math.random() * 60;
            const f = aimDir(dx, dy); t.face = f;
            g.eshots.push({ x: t.x + D8[f][0] * 10, y: t.y + D8[f][1] * 10, vx: D8[f][0] * 2, vy: D8[f][1] * 2, life: 90, shell: true });
            au.noise(.15, { vol: .14, freq: 700, slideTo: 150 });
          }
          // crush player on foot
          if (!p.tank && !p.dead && Math.abs(t.x - p.x) < 10 && Math.abs(t.y - p.y) < 11) killPlayer();
          if (p.tank && !p.dead && Math.abs(t.x - p.x) < 15 && Math.abs(t.y - p.y) < 15) { damageTank(t, 1); damageTank(p.tank, 1); const k = Math.sign(t.x - p.x) || 1; moveEnt(t, k * 4, -4, 7, 7); }
          if (t.y > g.camY + H + 30) t.dead = true;
        }
        // abandoned burning tank
        for (const t of g.tanks) if (t.burn > 0 && --t.burn <= 0) { t.dead = true; boom(t.x, t.y, true); if (!g.p.tank && Math.hypot(g.p.x - t.x, g.p.y - t.y) < 16) killPlayer(); }
        g.tanks = g.tanks.filter(t => !t.dead || t === g.p.tank);
        // bunker gun
        const b = g.bunker;
        if (!b.dead && b.y > g.camY - 20) {
          if (--b.cd <= 0) {
            b.cd = Math.max(40, 100 - g.level * 8);
            const a = Math.atan2(p.y - b.y, p.x - b.x);
            g.eshots.push({ x: b.x, y: b.y + 8, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, life: 140, shell: true });
            au.noise(.12, { vol: .12, freq: 800 });
          }
        }
      }
      function updateShots() {
        const p = g.p;
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (BLOCKS_SHOT[tileAt(s.x, s.y)]) { s.life = 0; if (s.shell) explodeAt(s.x, s.y, 10, false, 1); continue; }
          if (s.life <= 0) { if (s.shell) explodeAt(s.x, s.y, 10, false, 1); continue; }
          for (const e of g.enemies) if (!e.dead && Math.abs(e.x - s.x) < 4 && Math.abs(e.y - s.y) < 6) { e.dead = 1; s.life = 0; addScore(100, e.x, e.y - 8); au.noise(.1, { vol: .12, freq: 1500 }); au.tone(300, .12, { type: 'square', vol: .08, slideTo: 100 }); if (s.shell) explodeAt(s.x, s.y, 10, false, 1); break; }
          if (s.life <= 0) continue;
          for (const t of g.tanks) if (t.enemy && !t.dead && Math.abs(t.x - s.x) < 9 && Math.abs(t.y - s.y) < 9) {
            s.life = 0;
            if (s.shell) explodeAt(s.x, s.y, 10, false, 1); else { au.tone(1800, .03, { type: 'square', vol: .06 }); g.booms.push({ x: s.x, y: s.y, t: 18, big: false }); }
            break;
          }
        }
        g.shots = g.shots.filter(s => s.life > 0);
        for (const s of g.eshots) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (BLOCKS_SHOT[tileAt(s.x, s.y)] && tileAt(s.x, s.y) !== T_BUNK) { s.life = 0; if (s.shell) boom(s.x, s.y, false); continue; }
          if (p.dead) continue;
          if (p.tank) { if (Math.abs(p.x - s.x) < 9 && Math.abs(p.y - s.y) < 9) { s.life = 0; if (s.shell) { damageTank(p.tank, 1); boom(s.x, s.y, false); } else au.tone(1800, .03, { type: 'square', vol: .06 }); } }
          else if (Math.abs(p.x - s.x) < 3.5 && Math.abs(p.y - s.y) < 5) { s.life = 0; killPlayer(); }
        }
        g.eshots = g.eshots.filter(s => s.life > 0 && s.y > g.camY - 20 && s.y < g.camY + H + 20);
        for (const q of g.grenades) {
          q.t++; q.x += q.vx; q.y += q.vy;
          if (q.t >= q.T) { q.done = true; explodeAt(q.x, q.y, 16, q.enemy, 2); }
        }
        g.grenades = g.grenades.filter(q => !q.done);
      }

      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(90, .3, { type: 'square', vol: .15 }); }
          }
          return;
        }
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 40 : 22));
        for (const pp of g.pops) { pp.t--; pp.y -= .4; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.phase === 'ready') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') {
          updatePlayer();
          if (g.phase !== 'play') return;
          if (--g.spawnT <= 0) { g.spawnT = Math.max(25, 90 - g.level * 8) + Math.random() * 40; if (g.camY / TS > 8) spawnInfantry(); }
          if (g.camY / TS < 92 && --g.etankT <= 0) { g.etankT = Math.max(160, 420 - g.level * 40) + Math.random() * 200; spawnEnemyTank(); }
          updateEnemies(); updateShots();
          return;
        }
        if (g.phase === 'dying') { updateShots(); if (--g.phaseT <= 0) respawn(); return; }
        if (g.phase === 'clear') {
          updateShots();
          if (--g.phaseT <= 0) { g.level++; startLevel(); }
          return;
        }
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } }
      }

      // ---------- render ----------
      function drawMap(ctx, camY) {
        const r0 = Math.floor(camY / TS), off = -(camY - r0 * TS);
        for (let i = 0; i < 18; i++) {
          const rr = r0 + i; if (rr < 0 || rr >= ROWS) continue;
          const y = Math.round(off + i * TS);
          for (let c = 0; c < COLS; c++) {
            const t = map[rr * COLS + c], set = TILES[t];
            const v = t === T_WATER ? ((frame >> 4) + c + rr) & 1 : vari[rr * COLS + c] % set.length;
            ctx.drawImage(set[v], c * TS, y);
          }
        }
      }
      function drawSoldier(ctx, s, set, x, y, face, walk, dead) {
        x = Math.round(x); y = Math.round(y);
        if (dead) { ctx.drawImage(set.dead, x - 3, y - 2); return; }
        const im = ((walk >> 3) & 1) ? set.b : set.a;
        ctx.drawImage(im, x - 3, y - 5);
        // rifle
        ctx.fillStyle = '#202020';
        const gx = x + D8[face][0] * 3, gy = y - 1 + D8[face][1] * 3;
        ctx.fillRect(Math.round(gx), Math.round(gy), 1, 1); ctx.fillRect(Math.round(gx + D8[face][0] * 2), Math.round(gy + D8[face][1] * 2), 1, 1); ctx.fillRect(Math.round(gx + D8[face][0] * 4), Math.round(gy + D8[face][1] * 4), 1, 1);
      }
      function drawTank(ctx, t, x, y) {
        x = Math.round(x); y = Math.round(y);
        const body = t.enemy ? (t.kind === 'heavy' ? '#605050' : '#806848') : (t.kind === 'heavy' ? '#3a5a8a' : '#4a7a50');
        const dark = t.enemy ? '#302820' : '#203028';
        const horiz = (t.face === 2 || t.face === 6);
        ctx.fillStyle = dark;
        const tr = (t.tread >> 2) & 1;
        if (horiz) { ctx.fillRect(x - 8, y - 8, 16, 4); ctx.fillRect(x - 8, y + 4, 16, 4); ctx.fillStyle = '#909090'; for (let i = tr; i < 16; i += 2) { ctx.fillRect(x - 8 + i, y - 7, 1, 2); ctx.fillRect(x - 8 + i, y + 5, 1, 2); } }
        else { ctx.fillRect(x - 8, y - 8, 4, 16); ctx.fillRect(x + 4, y - 8, 4, 16); ctx.fillStyle = '#909090'; for (let i = tr; i < 16; i += 2) { ctx.fillRect(x - 7, y - 8 + i, 2, 1); ctx.fillRect(x + 5, y - 8 + i, 2, 1); } }
        ctx.fillStyle = body; ctx.fillRect(x - 5, y - 6, 10, 12); if (horiz) ctx.fillRect(x - 7, y - 4, 14, 8);
        ctx.fillStyle = '#000'; ctx.globalAlpha = .25; ctx.fillRect(x - 5, y + 3, 10, 3); ctx.globalAlpha = 1;
        // barrel
        ctx.fillStyle = '#202020';
        const len = t.kind === 'heavy' ? 11 : 9;
        for (let i = 3; i <= len; i++) ctx.fillRect(Math.round(x + D8[t.face][0] * i) - (t.kind === 'heavy' ? 1 : 0), Math.round(y + D8[t.face][1] * i) - (t.kind === 'heavy' ? 1 : 0), t.kind === 'heavy' ? 2 : 1, t.kind === 'heavy' ? 2 : 1);
        ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - 2, y - 3, 2, 2);
        if (t.enemy) { ctx.fillStyle = '#e02020'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        else if (!t.occupied && !t.burn && (frame >> 4) & 1) { text(ctx, t.kind === 'heavy' ? 'H' : 'L', x - 2, y - 18, '#ffff60', 1); }
        if ((t.smoke > 0 || t.burn > 0 || t.hp === 1 && !t.enemy) && !t.dead) {
          for (let i = 0; i < 3; i++) { const a = (frame * 0.5 + i * 7) % 20; ctx.fillStyle = i & 1 ? 'rgba(80,80,80,.7)' : 'rgba(140,140,140,.6)'; ctx.fillRect(x - 2 + Math.sin(frame * .1 + i) * 3, y - 6 - a, 4, 4); }
        }
      }
      function drawBunker(ctx, b, y) {
        const x = b.x;
        if (b.dead) {
          ctx.fillStyle = '#302020'; ctx.fillRect(x - 16, y - 14, 32, 22);
          ctx.fillStyle = (frame >> 3) & 1 ? '#ff6020' : '#ffc020'; ctx.fillRect(x - 6, y - 10, 4, 6); ctx.fillRect(x + 4, y - 6, 3, 5);
          return;
        }
        ctx.fillStyle = '#505060'; ctx.fillRect(x - 16, y - 16, 32, 24);
        ctx.fillStyle = '#8888a0'; ctx.fillRect(x - 16, y - 16, 32, 3); ctx.fillRect(x - 14, y - 12, 28, 2);
        ctx.fillStyle = '#383840'; ctx.fillRect(x - 16, y + 4, 32, 4);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 8, y - 2, 16, 5);
        ctx.fillStyle = (frame >> 3) & 1 ? '#ff3020' : '#801010'; ctx.fillRect(x - 1, y - 1, 2, 3);
        // flag
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x + 10, y - 30, 1, 16);
        ctx.fillStyle = '#e02020'; ctx.fillRect(x + 11, y - 30, 8, 5); ctx.fillStyle = '#ffff40'; ctx.fillRect(x + 14, y - 29, 2, 2);
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const camY = Math.round(g.camY) - HUDH;
        drawMap(ctx, camY);
        const sy = y => y - camY;
        drawBunker(ctx, g.bunker, sy(g.bunker.y));
        for (const t of g.tanks) if (!t.dead || t === g.p.tank) drawTank(ctx, t, t.x, sy(t.y));
        for (const e of g.enemies) drawSoldier(ctx, e, e.gren ? SP_ENEMY2 : SP_ENEMY, e.x, sy(e.y), e.face, e.walk, e.dead);
        const p = g.p;
        if (!p.tank && g.phase !== 'wait' && g.phase !== 'over') {
          if (!(p.inv > 0 && (frame & 2))) drawSoldier(ctx, p, SP_PLAYER, p.x, sy(p.y), p.face, p.walk, p.dead);
        }
        for (const s of g.shots) { ctx.fillStyle = s.shell ? '#ffff80' : '#ffffff'; ctx.fillRect(Math.round(s.x) - (s.shell ? 1 : 0), Math.round(sy(s.y)) - (s.shell ? 1 : 0), s.shell ? 3 : 2, s.shell ? 3 : 2); }
        for (const s of g.eshots) { ctx.fillStyle = s.shell ? '#ff8040' : ((frame & 2) ? '#ff4040' : '#ffff40'); ctx.fillRect(Math.round(s.x) - 1, Math.round(sy(s.y)) - 1, s.shell ? 3 : 2, s.shell ? 3 : 2); }
        for (const q of g.grenades) {
          const h = Math.sin(q.t / q.T * Math.PI) * 22;
          ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(Math.round(q.x) - 1, Math.round(sy(q.y)), 3, 2);
          ctx.fillStyle = q.enemy ? '#c0a030' : '#204020'; ctx.fillRect(Math.round(q.x) - 1, Math.round(sy(q.y) - h) - 1, 3, 3);
          ctx.fillStyle = '#a0a0a0'; ctx.fillRect(Math.round(q.x), Math.round(sy(q.y) - h) - 2, 1, 1);
        }
        for (const b of g.booms) {
          const T = b.big ? 40 : 22, k = b.t / T, r = (b.big ? 16 : 9) * Math.sin(Math.min(1, k * 1.6) * Math.PI / 2);
          const x = b.x, y = sy(b.y);
          ctx.fillStyle = k < .3 ? '#ffffff' : k < .6 ? '#ffd040' : '#ff6020';
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill();
          if (k > .4) { ctx.fillStyle = 'rgba(60,40,30,.7)'; ctx.beginPath(); ctx.arc(x, y - (k - .4) * 10, r * .7, 0, 6.3); ctx.fill(); }
        }
        for (const pp of g.pops) text(ctx, pp.s, pp.x, sy(pp.y), '#ffffff', 1, 'center');
        // HUD
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUDH);
        text(ctx, '1UP', 6, 1, '#ff4040', 1); text(ctx, String(g.score).padStart(6, '0'), 6, 8, '#fff', 1);
        text(ctx, 'HI-SCORE', W / 2, 1, '#ff4040', 1, 'center'); text(ctx, String(hi).padStart(6, '0'), W / 2, 8, '#fff', 1, 'center');
        text(ctx, 'AREA ' + g.level, W - 6, 1, '#60c0ff', 1, 'right');
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) drawSoldier(ctx, null, SP_PLAYER, W - 10 - i * 9, 10, 0, 0, 0);
        // progress bar
        const prog = 1 - (g.camY / (ROWS * TS - H));
        ctx.fillStyle = '#303030'; ctx.fillRect(2, HUDH + 2, 2, H - HUDH - 6);
        ctx.fillStyle = '#ffd040'; const ph = Math.round((H - HUDH - 6) * Math.max(0, Math.min(1, prog))); ctx.fillRect(2, H - 4 - ph, 2, ph);
        if (p.tank && p.tank.smoke > 0 && (frame >> 3) & 1) text(ctx, 'ESCAPE! PRESS X', W / 2, 120, '#ff4040', 1, 'center');
        if (g.phase === 'play' && g.camY < 7 * TS && !p.tank && (frame >> 4) & 1) text(ctx, 'GRENADE THE FORT!', W / 2, H - 20, '#ffff40', 1, 'center');
        if (g.phase === 'play' && g.camY < 7 * TS && p.tank && (frame >> 4) & 1) text(ctx, 'LEAVE THE TANK!', W / 2, H - 20, '#ffff40', 1, 'center');
        if (g.phase === 'ready') { text(ctx, 'AREA ' + g.level, W / 2, 100, '#ffffff', 2, 'center'); text(ctx, 'ADVANCE TO THE ENEMY FORT', W / 2, 124, '#ffd040', 1, 'center'); }
        if (g.phase === 'clear') { text(ctx, 'MISSION', W / 2, 100, '#ffff40', 2, 'center'); text(ctx, 'COMPLETE!', W / 2, 120, '#ffff40', 2, 'center'); text(ctx, 'BONUS 10000', W / 2, 146, '#ffffff', 1, 'center'); }
        if (g.phase === 'over') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(40, 110, W - 80, 30); text(ctx, 'GAME OVER', W / 2, 118, '#ff4040', 2, 'center'); }
      }
      function renderTitle(ctx) {
        // scrolling battlefield backdrop
        if (!titleMap) { genMap(1); titleMap = true; }
        const camY = (ROWS * TS - H) - (titleT * 0.4) % (ROWS * TS - H - 100);
        drawMap(ctx, camY);
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'FRONT', W / 2 + 2, 42, '#402000', 4, 'center'); text(ctx, 'FRONT', W / 2, 40, '#f0e060', 4, 'center');
        text(ctx, 'LINE', W / 2 + 2, 76, '#402000', 4, 'center'); text(ctx, 'LINE', W / 2, 74, '#e03020', 4, 'center');
        const page = Math.floor(titleT / 400) % 2;
        if (page === 0) {
          text(ctx, 'SOLDIER ......... 100', W / 2, 120, '#ffffff', 1, 'center');
          text(ctx, 'GRENADE KILL .... 200', W / 2, 132, '#ffffff', 1, 'center');
          text(ctx, 'LIGHT TANK ..... 1000', W / 2, 144, '#ffffff', 1, 'center');
          text(ctx, 'HEAVY TANK ..... 2000', W / 2, 156, '#ffffff', 1, 'center');
          text(ctx, 'ENEMY FORT .... 10000', W / 2, 168, '#ffff40', 1, 'center');
        } else {
          text(ctx, 'HI-SCORE', W / 2, 124, '#ff4040', 1, 'center'); text(ctx, String(hi), W / 2, 136, '#ffffff', 2, 'center');
          text(ctx, 'CAPTURE TANKS - X TO EXIT', W / 2, 160, '#60c0ff', 1, 'center');
          text(ctx, 'EXTRA MAN 10000 30000 +30000', W / 2, 172, '#80ff80', 1, 'center');
        }
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 200, '#ff4040', 1, 'center'); }
        else if ((titleT >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 200, '#40ffff', 1, 'center');
        text(ctx, credStr(), W / 2, 216, '#aaaaaa', 1, 'center');
        text(ctx, '\u00a9 1982 TAITO', W / 2, 236, '#888888', 1, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
