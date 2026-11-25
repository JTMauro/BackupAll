// Borderline (Sega, 1981) \u2014 from-scratch recreation: drive a tank across the border, through rivers and turrets, and destroy the enemy HQ.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // text(ctx, str, x, y, colour, scale, align: 'left'|'center'|'right')
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
  // Pixel sprite from strings ('.' = transparent), centred at cx,cy, rotated rot*90 degrees clockwise.
  function spr(ctx, rows, cx, cy, pal, rot, sc) {
    rot = (rot || 0) & 3; sc = sc || 1;
    const h = rows.length, w = rows[0].length;
    const ow = (rot & 1) ? h : w, oh = (rot & 1) ? w : h;
    const x0 = Math.round(cx - ow * sc / 2), y0 = Math.round(cy - oh * sc / 2);
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) {
        const ch = row[c]; if (ch === '.' || ch === ' ') continue;
        let px, py;
        if (rot === 0) { px = c; py = r; } else if (rot === 1) { px = h - 1 - r; py = c; }
        else if (rot === 2) { px = w - 1 - c; py = h - 1 - r; } else { px = r; py = w - 1 - c; }
        ctx.fillStyle = pal[ch] || '#f0f';
        ctx.fillRect(x0 + px * sc, y0 + py * sc, sc, sc);
      }
    }
  }
  function pad(n, l) { return String(n).padStart(l, '0'); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(n) { return Math.floor(Math.random() * n); }
  ArcadeRegistry.register({
    id: 'borderline', title: 'Borderline', year: 1981, maker: 'Sega',
    width: 224, height: 256, vector: false, pointer: false,
    controls: 'Arrows: drive (4 ways) \u00b7 Space: fire cannon \u00b7 Enter: start',
    marquee: { bg: '#0a2008', fg: '#ffe040', accent: '#ff3030' },
    create(api) {
      const W = 224, H = 256, TS = 16, COLS = 14, TOPY = 16, VIEW = H - TOPY;
      const au = api.audio;
      const T = { GRASS: 0, ROAD: 1, BUSH: 2, ROCK: 3, WATER: 4, BRIDGE: 5, WALL: 6, HQ: 7, RUBBLE: 8 };
      const C = { grass: '#2a8a2a', grass2: '#268226', road: '#a08850', road2: '#988048', bush: '#105a18', bushHi: '#3ab040', rock: '#808080', rockHi: '#c0c0c0', rockLo: '#505050', water: '#2050d0', water2: '#3868f0', wall: '#b03018', wallHi: '#e06040', white: '#ffffff', yellow: '#ffe040', red: '#ff3030', cyan: '#40e0ff', grey: '#909090', orange: '#ff9020', black: '#000' };
      const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const KEYS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];

      // ---------- sprites (facing up) ----------
      const TANK = [
        '.....gg.....',
        '.....gg.....',
        'ttt..gg..ttt',
        'tLtbbggbbtLt',
        'tttbbbbbbttt',
        'tLtbhhhhbtLt',
        'tttbhbbhbttt',
        'tLtbhhhhbtLt',
        'tttbbbbbbttt',
        'tLtbbbbbbtLt',
        'ttt......ttt',
        'tLt......tLt'
      ];
      const P_PAL = { g: '#e0e0e0', t: '#606060', L: '#202020', b: '#ffe040', h: '#c09000' };
      const E_PAL = { g: '#e0e0e0', t: '#606060', L: '#202020', b: '#e03030', h: '#901010' };
      const E_PAL2 = { g: '#e0e0e0', t: '#606060', L: '#202020', b: '#c040ff', h: '#7010a0' };
      const SOLDIER = [
        ['..hh..', '..ss..', '.gggg.', 'g.gg.g', '..gg..', '.g..g.', '.g..g.'],
        ['..hh..', '..ss..', '.gggg.', '.ggggg', '..gg..', '..gg..', '.g..g.']
      ];
      const SOLDIER_PAL = { h: '#406020', s: '#ffc090', g: '#c04040' };

      // ---------- state ----------
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;

      function tileAt(c, r) {
        if (c < 0 || c >= COLS) return T.ROCK;
        if (r < 0) return T.ROCK;
        if (r >= g.rows) return T.ROCK;
        return g.map[r * COLS + c];
      }
      function setTile(c, r, v) { if (c >= 0 && c < COLS && r >= 0 && r < g.rows) g.map[r * COLS + c] = v; }
      function solidForTank(t) { return t === T.BUSH || t === T.ROCK || t === T.WATER || t === T.WALL || t === T.HQ; }
      function solidForShot(t) { return t === T.BUSH || t === T.ROCK || t === T.WALL || t === T.HQ; }

      // ---------- level generation ----------
      function buildLevel() {
        const L = g.level;
        const rows = 70 + Math.min(5, L) * 12;
        g.rows = rows;
        g.map = new Array(rows * COLS).fill(T.GRASS);
        g.roadCol = new Array(rows).fill(7);
        // winding road from the bottom to the fortress
        let c = 6 + irnd(2);
        for (let r = rows - 1; r >= 0; r--) {
          g.roadCol[r] = c;
          setTile(c, r, T.ROAD);
          if (r < rows - 4 && r > 8 && Math.random() < 0.28) {
            const nc = clamp(c + (Math.random() < 0.5 ? -1 : 1) * (1 + irnd(2)), 1, COLS - 2);
            for (let x = Math.min(c, nc); x <= Math.max(c, nc); x++) setTile(x, r, T.ROAD);
            c = nc;
          }
        }
        // scenery: bush clumps and rocks (never on the road)
        const nClumps = Math.floor(rows * 0.9);
        for (let i = 0; i < nClumps; i++) {
          const r0 = 8 + irnd(rows - 14), c0 = irnd(COLS);
          const kind = Math.random() < 0.7 ? T.BUSH : T.ROCK;
          const n = 1 + irnd(4);
          for (let k = 0; k < n; k++) {
            const cc = c0 + irnd(3) - 1, rr = r0 + irnd(3) - 1;
            if (tileAt(cc, rr) === T.GRASS && rr < rows - 4) setTile(cc, rr, kind);
          }
        }
        // rivers with a bridge on the road (and sometimes a second one)
        g.rivers = [];
        for (let r = rows - 18; r > 20; r -= 16 + irnd(8)) {
          for (let x = 0; x < COLS; x++) { setTile(x, r, T.WATER); setTile(x, r - 1, T.WATER); }
          const bc = g.roadCol[r];
          setTile(bc, r, T.BRIDGE); setTile(bc, r - 1, T.BRIDGE);
          // the road column may differ one row up
          const bc2 = g.roadCol[r - 1];
          if (bc2 !== bc) { setTile(bc2, r, T.BRIDGE); setTile(bc2, r - 1, T.BRIDGE); for (let x = Math.min(bc, bc2); x <= Math.max(bc, bc2); x++) { setTile(x, r, T.BRIDGE); setTile(x, r - 1, T.BRIDGE); } }
          if (Math.random() < 0.6) { const ex = (bc + 4 + irnd(6)) % COLS; setTile(ex, r, T.BRIDGE); setTile(ex, r - 1, T.BRIDGE); }
          g.rivers.push(r);
        }
        // the border: a wall line with a gate on the road
        g.borderRow = 16;
        for (let x = 0; x < COLS; x++) setTile(x, g.borderRow, T.WALL);
        const gc = g.roadCol[g.borderRow];
        setTile(gc, g.borderRow, T.ROAD);
        // fortress: wall ring around the HQ with a gate
        for (let x = 2; x < COLS - 2; x++) { setTile(x, 2, T.WALL); setTile(x, 8, T.WALL); }
        for (let r = 2; r <= 8; r++) { setTile(2, r, T.WALL); setTile(COLS - 3, r, T.WALL); }
        for (let r = 3; r <= 7; r++) for (let x = 3; x < COLS - 3; x++) setTile(x, r, T.GRASS);
        for (let r = 0; r < 2; r++) for (let x = 0; x < COLS; x++) setTile(x, r, T.ROCK);
        const fgc = clamp(g.roadCol[8], 3, COLS - 4);
        setTile(fgc, 8, T.ROAD);
        for (let r = 8; r <= 12; r++) { const rc = g.roadCol[r]; for (let x = Math.min(rc, fgc); x <= Math.max(rc, fgc); x++) setTile(x, 9, T.ROAD); setTile(rc, r, T.ROAD); }
        g.hq = { c: 6, r: 3, w: 2, h: 2, hp: 10 + L * 2, flash: 0, spawnT: 300 };
        for (let r = 3; r < 5; r++) for (let x = 6; x < 8; x++) setTile(x, r, T.HQ);
        // enemies
        g.enemies = [];
        const passable = (x, r) => { const t = tileAt(x, r); return t === T.GRASS || t === T.ROAD; };
        for (let r = rows - 14; r > 9; r -= Math.max(4, 8 - L)) {
          // tank
          for (let tries = 0; tries < 10; tries++) {
            const x = irnd(COLS);
            if (passable(x, r)) { g.enemies.push(makeTank(x, r, Math.random() < Math.min(0.5, L * 0.1) ? 2 : 1)); break; }
          }
          // soldiers
          if (Math.random() < 0.6) for (let tries = 0; tries < 10; tries++) { const x = irnd(COLS), rr = r - 2; if (passable(x, rr)) { g.enemies.push(makeSoldier(x, rr)); break; } }
        }
        // turrets guarding bridges, the border gate and the fortress
        const placeTurret = (r, nearCol) => {
          for (const dx of [2, -2, 3, -3, 1, -1]) {
            const x = nearCol + dx;
            if (x >= 0 && x < COLS && tileAt(x, r) === T.GRASS) { setTile(x, r, T.GRASS); g.enemies.push(makeTurret(x, r)); return; }
          }
        };
        for (const r of g.rivers) placeTurret(r - 3, g.roadCol[r - 3]);
        placeTurret(g.borderRow + 2, gc);
        placeTurret(g.borderRow - 2, gc);
        g.enemies.push(makeTurret(4, 6)); g.enemies.push(makeTurret(COLS - 5, 6));
        if (L >= 2) placeTurret(g.borderRow + 6, g.roadCol[g.borderRow + 6]);
      }
      function makeTank(c, r, kind) { return { type: 'tank', kind, x: c * TS + 8, y: r * TS + 8, dir: 2, tx: c, ty: r, moving: false, fireT: 60 + irnd(120), hp: kind === 2 ? 2 : 1, flash: 0 }; }
      function makeSoldier(c, r) { return { type: 'soldier', x: c * TS + 8, y: r * TS + 8, dir: irnd(4), t: 0, hp: 1 }; }
      function makeTurret(c, r) { return { type: 'turret', x: c * TS + 8, y: r * TS + 8, ang: Math.PI / 2, fireT: 60 + irnd(90), hp: 3, flash: 0 }; }

      function newGame() {
        g = { score: 0, lives: 3, level: 1, extra: 0, shots: [], ebul: [], booms: [], pops: [], phase: 'ready', t: 120 };
        buildLevel(); placePlayer(g.rows - 2);
        au.melody([[392, .12], [392, .06], [523, .12], [523, .06], [659, .12], [784, .3]], { type: 'square', vol: 0.12 });
      }
      function placePlayer(row) {
        row = clamp(row, 10, g.rows - 2);
        // find the nearest open road tile at or below that row
        let r = row;
        while (r < g.rows - 1 && solidForTank(tileAt(g.roadCol[r], r))) r++;
        g.p = { x: g.roadCol[r] * TS + 8, y: r * TS + 8, dir: 0, alive: true, deadT: 0, inv: 120, tread: 0 };
        g.camY = clamp(g.p.y - VIEW + 48, 0, g.rows * TS - VIEW);
        g.ebul = []; g.shots = [];
        // clear enemies sitting right on the player
        for (const e of g.enemies) if (e.type !== 'turret' && Math.abs(e.x - g.p.x) < 40 && Math.abs(e.y - g.p.y) < 40) e.dead = true;
        g.enemies = g.enemies.filter(e => !e.dead);
      }
      function nextLevel() {
        g.level++; g.shots = []; g.ebul = []; g.booms = [];
        buildLevel(); placePlayer(g.rows - 2); g.phase = 'ready'; g.t = 120;
        au.melody([[523, .08], [659, .08], [784, .08], [1047, .2]], { type: 'square', vol: 0.12 });
      }
      function addScore(n) {
        g.score += n;
        const ex = Math.floor(g.score / 20000);
        if (ex > g.extra) { g.extra = ex; g.lives++; au.melody([[1047, .07], [1319, .07], [1568, .15]], { type: 'square', vol: 0.12 }); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, n, col) { g.pops.push({ x, y, n, t: 50, col: col || C.white }); }
      function boom(x, y, big) { g.booms.push({ x, y, t: 0, big: !!big }); }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.15 });
        return false;
      }

      // ---------- movement & collision ----------
      function boxFree(x, y, hw) {
        const c0 = Math.floor((x - hw) / TS), c1 = Math.floor((x + hw - 1) / TS);
        const r0 = Math.floor((y - hw) / TS), r1 = Math.floor((y + hw - 1) / TS);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidForTank(tileAt(c, r))) return false;
        return true;
      }
      function movePlayer() {
        const p = g.p;
        let d = -1;
        for (let i = 0; i < 4; i++) if (api.key(KEYS[i])) { d = i; break; }
        if (d < 0) return;
        p.dir = d;
        const sp = 1.1, hw = 6;
        const dx = DIRS[d][0] * sp, dy = DIRS[d][1] * sp;
        if (boxFree(p.x + dx, p.y + dy, hw)) {
          p.x += dx; p.y += dy; p.tread++;
        } else {
          // corner assist: slide toward the centre of the lane
          if (dx !== 0) {
            const cy = Math.floor(p.y / TS) * TS + 8, off = cy - p.y;
            if (Math.abs(off) <= 7 && off !== 0 && boxFree(p.x + Math.sign(dx) * 2, cy, hw)) p.y += Math.sign(off) * Math.min(1, Math.abs(off));
          } else {
            const cx = Math.floor(p.x / TS) * TS + 8, off = cx - p.x;
            if (Math.abs(off) <= 7 && off !== 0 && boxFree(cx, p.y + Math.sign(dy) * 2, hw)) p.x += Math.sign(off) * Math.min(1, Math.abs(off));
          }
          // also try the neighbouring lane centres (approaching a gap from slightly off)
          if (dx === 0) {
            for (const s of [-1, 1]) {
              const cx = (Math.floor(p.x / TS) + s) * TS + 8;
              if (Math.abs(cx - p.x) <= 7 && boxFree(cx, p.y + Math.sign(dy) * 2, hw) && boxFree(p.x + s, p.y, hw)) { p.x += s; break; }
            }
          } else {
            for (const s of [-1, 1]) {
              const cy = (Math.floor(p.y / TS) + s) * TS + 8;
              if (Math.abs(cy - p.y) <= 7 && boxFree(p.x + Math.sign(dx) * 2, cy, hw) && boxFree(p.x, p.y + s, hw)) { p.y += s; break; }
            }
          }
        }
        p.x = clamp(p.x, 6, W - 6);
        // can't drive back below the screen
        p.y = Math.min(p.y, g.camY + VIEW - 8);
        if ((p.tread & 7) === 0) au.tone(70, 0.04, { type: 'square', vol: 0.04 });
      }
      function shotHitsTile(s) {
        const c = Math.floor(s.x / TS), r = Math.floor(s.y / TS), t = tileAt(c, r);
        if (!solidForShot(t)) return false;
        if (t === T.BUSH) {
          if (s.player) {
            const key = r * COLS + c;
            g.bushHp = g.bushHp || {};
            g.bushHp[key] = (g.bushHp[key] || 0) + 1;
            if (g.bushHp[key] >= 2) { setTile(c, r, T.RUBBLE); addScore(10); boom(c * TS + 8, r * TS + 8, false); au.noise(0.15, { vol: 0.12, freq: 1200 }); }
            else au.tone(300, 0.03, { type: 'square', vol: 0.06 });
          }
        } else if (t === T.HQ && s.player) {
          const h = g.hq;
          h.hp--; h.flash = 8;
          au.tone(200, 0.08, { type: 'square', vol: 0.12 });
          if (h.hp <= 0) destroyHQ();
        } else if (s.player) au.tone(160, 0.03, { type: 'square', vol: 0.05 });
        return true;
      }
      function destroyHQ() {
        const h = g.hq;
        for (let r = h.r; r < h.r + h.h; r++) for (let c = h.c; c < h.c + h.w; c++) setTile(c, r, T.RUBBLE);
        for (let i = 0; i < 8; i++) boom(h.c * TS + rnd(0, 32), h.r * TS + rnd(0, 32), true);
        const bonus = 5000 * Math.min(4, g.level);
        addScore(bonus); pop(h.c * TS + 16, h.r * TS, bonus, C.yellow);
        au.noise(1.5, { vol: 0.35, freq: 2500, slideTo: 60 });
        au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .1], [1319, .4]], { type: 'square', vol: 0.12, delay: 0.6 });
        g.phase = 'clear'; g.t = 240;
        for (const e of g.enemies) if (e.y < g.borderRow * TS) { e.dead = true; boom(e.x, e.y, false); }
        g.enemies = g.enemies.filter(e => !e.dead);
      }

      // ---------- enemies ----------
      function onScreen(e, m) { return e.y > g.camY - (m || 16) && e.y < g.camY + VIEW + (m || 16); }
      function enemyFire(x, y, vx, vy) {
        g.ebul.push({ x, y, vx, vy, t: 0 });
        au.tone(500, 0.06, { type: 'square', vol: 0.05, slideTo: 250 });
      }
      function tankPassable(c, r) {
        const t = tileAt(c, r);
        if (solidForTank(t)) return false;
        for (const o of g.enemies) if (o.type === 'tank' && !o.dead && o.tx === c && o.ty === r) return false;
        return true;
      }
      function updateTank(e) {
        const p = g.p;
        const sp = (e.kind === 2 ? 0.8 : 0.6) + Math.min(0.4, g.level * 0.06);
        const tx = e.tx * TS + 8, ty = e.ty * TS + 8;
        if (e.x !== tx || e.y !== ty) {
          e.x += Math.sign(tx - e.x) * Math.min(sp, Math.abs(tx - e.x));
          e.y += Math.sign(ty - e.y) * Math.min(sp, Math.abs(ty - e.y));
        } else {
          const c = e.tx, r = e.ty;
          const opts = [];
          for (let i = 0; i < 4; i++) if (tankPassable(c + DIRS[i][0], r + DIRS[i][1])) opts.push(i);
          if (opts.length) {
            let d;
            const dxp = p.x - e.x, dyp = p.y - e.y;
            const pref = Math.abs(dxp) > Math.abs(dyp) ? (dxp > 0 ? 1 : 3) : (dyp > 0 ? 2 : 0);
            const smart = Math.min(0.7, 0.35 + g.level * 0.07);
            if (p.alive && Math.random() < smart && opts.includes(pref)) d = pref;
            else if (opts.includes(e.dir) && Math.random() < 0.6) d = e.dir;
            else d = opts[irnd(opts.length)];
            e.dir = d; e.tx = c + DIRS[d][0]; e.ty = r + DIRS[d][1];
          }
        }
        // fire when lined up
        e.fireT--;
        if (e.fireT <= 0 && p.alive) {
          const dx = p.x - e.x, dy = p.y - e.y;
          let fd = -1;
          if (Math.abs(dx) < 8 && Math.abs(dy) < 150) fd = dy < 0 ? 0 : 2;
          else if (Math.abs(dy) < 8 && Math.abs(dx) < 150) fd = dx > 0 ? 1 : 3;
          if (fd >= 0) {
            e.dir = fd;
            const bs = 2 + Math.min(1, g.level * 0.15);
            enemyFire(e.x + DIRS[fd][0] * 8, e.y + DIRS[fd][1] * 8, DIRS[fd][0] * bs, DIRS[fd][1] * bs);
            e.fireT = Math.max(50, 120 - g.level * 10) + irnd(60);
          } else e.fireT = 10;
        }
      }
      function updateSoldier(e) {
        e.t++;
        if ((e.t % 40) === 0 || !boxFree(e.x + DIRS[e.dir][0] * 4, e.y + DIRS[e.dir][1] * 4, 3)) e.dir = irnd(4);
        const nx = e.x + DIRS[e.dir][0] * 0.5, ny = e.y + DIRS[e.dir][1] * 0.5;
        if (boxFree(nx, ny, 3)) { e.x = clamp(nx, 4, W - 4); e.y = ny; }
        if ((e.t % 150) === 75 && g.p.alive && Math.random() < 0.4) {
          const dx = g.p.x - e.x, dy = g.p.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
          if (d < 120) enemyFire(e.x, e.y, dx / d * 1.4, dy / d * 1.4);
        }
      }
      function updateTurret(e) {
        const p = g.p;
        const want = Math.atan2(p.y - e.y, p.x - e.x);
        let da = want - e.ang;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        e.ang += clamp(da, -0.03, 0.03);
        e.fireT--;
        if (e.fireT <= 0 && p.alive) {
          // fire in one of 8 directions closest to the barrel
          const a8 = Math.round(e.ang / (Math.PI / 4)) * (Math.PI / 4);
          const bs = 1.6 + Math.min(1, g.level * 0.15);
          enemyFire(e.x + Math.cos(a8) * 8, e.y + Math.sin(a8) * 8, Math.cos(a8) * bs, Math.sin(a8) * bs);
          e.fireT = Math.max(60, 150 - g.level * 12) + irnd(60);
        }
      }
      function killEnemy(e) {
        e.dead = true;
        const pts = e.type === 'tank' ? (e.kind === 2 ? 400 : 200) : e.type === 'turret' ? 300 : 100;
        addScore(pts); pop(e.x, e.y - 6, pts, C.cyan);
        boom(e.x, e.y, e.type !== 'soldier');
        au.noise(e.type === 'soldier' ? 0.15 : 0.4, { vol: 0.2, freq: 2200, slideTo: 150 });
        if (e.type === 'soldier') au.tone(1200, 0.1, { type: 'square', vol: 0.06, slideTo: 600 });
      }
      function playerDie() {
        const p = g.p;
        if (!p.alive || p.inv > 0) return;
        p.alive = false; p.deadT = 120;
        boom(p.x, p.y, true); boom(p.x + 5, p.y - 4, true);
        au.noise(1.0, { vol: 0.3, freq: 2000, slideTo: 60 });
        au.tone(300, 0.9, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.t = 330;
        au.melody([[392, .2], [349, .2], [330, .2], [262, .5]], { type: 'square', vol: 0.12 });
      }

      function updateGame() {
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 40 : 24));
        for (const pp of g.pops) pp.t--;
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.hq.flash > 0) g.hq.flash--;
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 240 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase === 'wait') return;
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; return; }
        if (g.phase === 'clear') {
          if ((g.t % 20) === 0 && g.t > 120) boom(g.hq.c * TS + rnd(0, 32), g.hq.r * TS + rnd(0, 32), true);
          if (--g.t <= 0) nextLevel();
          return;
        }
        const p = g.p;
        if (p.alive) {
          if (p.inv > 0) p.inv--;
          movePlayer();
          if (api.pressed('Space') && g.shots.length < 2) {
            const d = DIRS[p.dir];
            g.shots.push({ x: p.x + d[0] * 8, y: p.y + d[1] * 8, vx: d[0] * 4, vy: d[1] * 4, t: 0, player: true });
            au.tone(220, 0.1, { type: 'square', vol: 0.12, slideTo: 80 });
            au.noise(0.08, { vol: 0.1, freq: 3000 });
          }
          // scroll: keep the tank in the lower part of the screen, never scroll back
          const want = p.y - VIEW * 0.62;
          if (want < g.camY) g.camY = Math.max(0, g.camY - Math.min(1.5, g.camY - want));
        } else {
          if (--p.deadT <= 0) {
            g.lives--;
            if (g.lives <= 0) {
              g.phase = 'wait';
              if (api.offerContinue) {
                const cg = g;
                api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, () => { if (g === cg) gameOver(); });
              } else gameOver();
              return;
            }
            respawn();
            return;
          }
        }
        // player shots
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy; s.t++;
          if (s.t > 40 || s.x < 0 || s.x > W || s.y < g.camY - 4 || s.y > g.camY + VIEW) { s.dead = true; continue; }
          if (shotHitsTile(s)) { s.dead = true; continue; }
          for (const e of g.enemies) {
            if (e.dead) continue;
            const r = e.type === 'soldier' ? 4 : 7;
            if (Math.abs(s.x - e.x) < r && Math.abs(s.y - e.y) < r) {
              s.dead = true;
              if (--e.hp <= 0) killEnemy(e); else { e.flash = 8; au.tone(600, 0.04, { type: 'square', vol: 0.08 }); }
              break;
            }
          }
        }
        g.shots = g.shots.filter(s => !s.dead);
        // enemies
        for (const e of g.enemies) {
          if (e.dead || !onScreen(e, 24)) continue;
          if (e.flash > 0) e.flash--;
          if (e.type === 'tank') updateTank(e);
          else if (e.type === 'soldier') updateSoldier(e);
          else if (e.type === 'turret') updateTurret(e);
        }
        // HQ sends out tanks when the player is near
        const h = g.hq;
        if (h.hp > 0 && p.alive && p.y < (g.borderRow + 6) * TS) {
          if (--h.spawnT <= 0) {
            h.spawnT = Math.max(160, 360 - g.level * 30);
            if (g.enemies.filter(e => e.type === 'tank' && e.y < 10 * TS).length < 2 && tankPassable(h.c, h.r + 2)) {
              const t = makeTank(h.c, h.r + 2, g.level >= 3 ? 2 : 1); g.enemies.push(t);
              au.tone(120, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 300 });
            }
          }
        }
        // enemy bullets
        for (const b of g.ebul) {
          b.x += b.vx; b.y += b.vy; b.t++;
          if (b.t > 140 || b.x < 0 || b.x > W || b.y < g.camY - 8 || b.y > g.camY + VIEW + 8) { b.dead = true; continue; }
          if (shotHitsTile(b)) { b.dead = true; continue; }
          if (p.alive && Math.abs(b.x - p.x) < 5 && Math.abs(b.y - p.y) < 5) { b.dead = true; playerDie(); }
        }
        // shots cancel each other
        for (const s of g.shots) for (const b of g.ebul) if (!b.dead && Math.abs(s.x - b.x) < 4 && Math.abs(s.y - b.y) < 4) { b.dead = true; s.dead = true; addScore(10); }
        g.shots = g.shots.filter(s => !s.dead);
        g.ebul = g.ebul.filter(b => !b.dead);
        // contact
        if (p.alive) {
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (e.type === 'soldier') { if (Math.abs(e.x - p.x) < 8 && Math.abs(e.y - p.y) < 8) killEnemy(e); }
            else if (Math.abs(e.x - p.x) < 11 && Math.abs(e.y - p.y) < 11 && p.inv === 0) { if (e.type === 'tank') killEnemy(e); playerDie(); break; }
          }
        }
        g.enemies = g.enemies.filter(e => !e.dead && e.y < g.camY + VIEW + 120);
      }
      function respawn() {
        const row = Math.floor((g.camY + VIEW - 24) / TS);
        placePlayer(row);
        g.phase = 'ready'; g.t = 60;
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        updateGame();
        if (!g) mode = 'title';
      }

      // ---------- render ----------
      function drawTile(ctx, t, x, y, c, r) {
        const alt = (c + r) & 1;
        if (t === T.GRASS || t === T.RUBBLE) {
          ctx.fillStyle = alt ? C.grass : C.grass2; ctx.fillRect(x, y, TS, TS);
          ctx.fillStyle = '#3aa03a';
          if (((c * 7 + r * 13) % 5) === 0) { ctx.fillRect(x + 4, y + 6, 1, 2); ctx.fillRect(x + 10, y + 11, 1, 2); }
          if (t === T.RUBBLE) { ctx.fillStyle = '#5a4a30'; ctx.fillRect(x + 3, y + 4, 4, 3); ctx.fillRect(x + 9, y + 9, 5, 3); ctx.fillRect(x + 6, y + 11, 2, 2); }
        } else if (t === T.ROAD) {
          ctx.fillStyle = alt ? C.road : C.road2; ctx.fillRect(x, y, TS, TS);
          ctx.fillStyle = '#806838'; ctx.fillRect(x + 3, y + ((r * 5) % 12), 2, 1); ctx.fillRect(x + 11, y + ((r * 7 + 6) % 12), 2, 1);
        } else if (t === T.BUSH) {
          ctx.fillStyle = C.grass; ctx.fillRect(x, y, TS, TS);
          ctx.fillStyle = C.bush; ctx.fillRect(x + 1, y + 2, 14, 13); ctx.fillRect(x + 3, y + 1, 10, 15);
          ctx.fillStyle = C.bushHi; ctx.fillRect(x + 4, y + 3, 3, 3); ctx.fillRect(x + 9, y + 6, 3, 3); ctx.fillRect(x + 5, y + 10, 3, 2);
        } else if (t === T.ROCK) {
          ctx.fillStyle = C.grass2; ctx.fillRect(x, y, TS, TS);
          ctx.fillStyle = C.rockLo; ctx.fillRect(x + 1, y + 2, 14, 13);
          ctx.fillStyle = C.rock; ctx.fillRect(x + 2, y + 2, 11, 10);
          ctx.fillStyle = C.rockHi; ctx.fillRect(x + 3, y + 3, 5, 2);
        } else if (t === T.WATER) {
          ctx.fillStyle = C.water; ctx.fillRect(x, y, TS, TS);
          ctx.fillStyle = C.water2; const o = ((frame >> 3) + c * 3 + r) % 12;
          ctx.fillRect(x + o, y + 4, 4, 1); ctx.fillRect(x + ((o + 6) % 12), y + 11, 4, 1);
        } else if (t === T.BRIDGE) {
          ctx.fillStyle = C.water; ctx.fillRect(x, y, TS, TS);
          ctx.fillStyle = '#8a6030'; ctx.fillRect(x, y, TS, TS);
          ctx.fillStyle = '#5a3a18'; for (let i = 0; i < TS; i += 4) ctx.fillRect(x, y + i, TS, 1);
          const lw = tileAt(c - 1, r) === T.WATER, rw = tileAt(c + 1, r) === T.WATER;
          ctx.fillStyle = '#c0a060'; if (lw) ctx.fillRect(x, y, 2, TS); if (rw) ctx.fillRect(x + 14, y, 2, TS);
        } else if (t === T.WALL) {
          ctx.fillStyle = C.wall; ctx.fillRect(x, y, TS, TS);
          ctx.fillStyle = C.wallHi; ctx.fillRect(x, y, TS, 1); ctx.fillRect(x, y + 8, TS, 1);
          ctx.fillStyle = '#601808'; ctx.fillRect(x + 7, y + 1, 1, 7); ctx.fillRect(x + 3, y + 9, 1, 7); ctx.fillRect(x + 11, y + 9, 1, 7);
        } else if (t === T.HQ) {
          ctx.fillStyle = C.grass; ctx.fillRect(x, y, TS, TS);
        }
      }
      function drawHQ(ctx, sy0) {
        const h = g.hq;
        if (tileAt(h.c, h.r) !== T.HQ) return;
        const x = h.c * TS, y = h.r * TS - sy0;
        const fl = h.flash > 0 && (h.flash & 2);
        ctx.fillStyle = fl ? '#fff' : '#606070'; ctx.fillRect(x, y, 32, 32);
        ctx.fillStyle = fl ? '#fff' : '#9090a0'; ctx.fillRect(x + 2, y + 2, 28, 28);
        ctx.fillStyle = '#303040'; ctx.fillRect(x + 6, y + 6, 20, 20);
        ctx.fillStyle = (frame >> 3) & 1 ? C.red : C.yellow; ctx.fillRect(x + 12, y + 12, 8, 8);
        ctx.fillStyle = C.white; ctx.fillRect(x + 15, y - 10, 1, 12);
        ctx.fillStyle = C.red; ctx.fillRect(x + 16, y - 10, 8, 5);
        // hp pips
        for (let i = 0; i < h.hp; i++) { ctx.fillStyle = C.yellow; ctx.fillRect(x + (i % 16) * 2, y + 34 + Math.floor(i / 16) * 2, 1, 1); }
      }
      function drawEnemy(ctx, e, sy0) {
        const x = e.x, y = e.y - sy0;
        if (e.type === 'tank') spr(ctx, TANK, x, y, e.flash > 0 && (e.flash & 2) ? P_PAL : (e.kind === 2 ? E_PAL2 : E_PAL), e.dir);
        else if (e.type === 'soldier') spr(ctx, SOLDIER[(frame >> 3) & 1], x, y, SOLDIER_PAL, 0);
        else if (e.type === 'turret') {
          ctx.fillStyle = '#404048'; ctx.fillRect(Math.round(x) - 7, Math.round(y) - 7, 14, 14);
          ctx.fillStyle = e.flash > 0 ? '#fff' : '#a0a0b0'; ctx.fillRect(Math.round(x) - 5, Math.round(y) - 5, 10, 10);
          ctx.fillStyle = '#e03030'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
          ctx.fillStyle = '#202020';
          for (let i = 2; i < 10; i++) ctx.fillRect(Math.round(x + Math.cos(e.ang) * i) - 1, Math.round(y + Math.sin(e.ang) * i) - 1, 2, 2);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        const sy0 = Math.round(g.camY) - TOPY;
        ctx.save(); ctx.beginPath(); ctx.rect(0, TOPY, W, VIEW); ctx.clip();
        const r0 = Math.floor(g.camY / TS), r1 = Math.min(g.rows - 1, r0 + Math.ceil(VIEW / TS) + 1);
        for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) drawTile(ctx, tileAt(c, r), c * TS, r * TS - sy0, c, r);
        drawHQ(ctx, sy0);
        for (const e of g.enemies) if (onScreen(e, 16)) drawEnemy(ctx, e, sy0);
        const p = g.p;
        if (p.alive && g.phase !== 'over' && g.phase !== 'wait' && !(p.inv > 0 && (frame >> 2) & 1)) spr(ctx, TANK, p.x, p.y - sy0, P_PAL, p.dir);
        ctx.fillStyle = C.white;
        for (const s of g.shots) ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y - sy0) - 1, 3, 3);
        for (const b of g.ebul) { ctx.fillStyle = (frame >> 1) & 1 ? C.red : C.yellow; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y - sy0) - 1, 3, 3); }
        for (const b of g.booms) {
          const n = b.big ? 10 : 6, rr = b.t * (b.big ? 0.5 : 0.4);
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + b.t * 0.08;
            ctx.fillStyle = ['#fff', C.yellow, C.orange, C.red][(i + (b.t >> 3)) & 3];
            ctx.fillRect(Math.round(b.x + Math.cos(a) * rr) - 1, Math.round(b.y - sy0 + Math.sin(a) * rr) - 1, 3, 3);
          }
          if (b.t < 6) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x) - 4, Math.round(b.y - sy0) - 4, 8, 8); }
        }
        for (const pp of g.pops) text(ctx, pp.n, pp.x, pp.y - sy0 - (50 - pp.t) * 0.3, pp.col, 1, 'center');
        ctx.restore();
        // HUD
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOPY);
        text(ctx, '1UP ' + pad(g.score, 6), 2, 4, C.white);
        text(ctx, 'HI ' + pad(hi, 6), 96, 4, C.red);
        text(ctx, 'L' + g.level, 170, 4, C.yellow);
        for (let i = 0; i < Math.min(3, g.lives - 1); i++) { ctx.fillStyle = C.yellow; ctx.fillRect(194 + i * 9, 5, 6, 6); ctx.fillStyle = '#c09000'; ctx.fillRect(196 + i * 9, 3, 2, 3); }
        // progress to the HQ on the right edge
        const prog = 1 - clamp(g.p.y / (g.rows * TS), 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W - 4, TOPY + 4, 3, 60);
        ctx.fillStyle = C.red; ctx.fillRect(W - 4, TOPY + 4, 3, 2);
        ctx.fillStyle = C.yellow; ctx.fillRect(W - 4, TOPY + 4 + Math.round((1 - prog) * 58), 3, 2);
        if (g.phase === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 100, W - 80, 34);
          text(ctx, 'LEVEL ' + g.level, W / 2, 106, C.yellow, 1, 'center');
          text(ctx, 'CROSS THE BORDER!', W / 2, 120, C.white, 1, 'center');
        }
        if (g.phase === 'clear') { text(ctx, 'HEADQUARTERS DESTROYED', W / 2, 120, C.yellow, 1, 'center'); }
        if (g.phase === 'over' || g.phase === 'wait') { ctx.fillStyle = '#000'; ctx.fillRect(50, 112, W - 100, 22); text(ctx, 'GAME OVER', W / 2, 116, C.red, 2, 'center'); }
      }
      function drawTitle(ctx) {
        // scrolling backdrop strip of terrain
        const t = titleT;
        for (let r = 0; r < 17; r++) for (let c = 0; c < COLS; c++) {
          const wr = r - Math.floor(t / 16);
          const k = ((c * 31 + wr * 17) % 11 + 11) % 11;
          const tt = c === 6 || c === 7 ? T.ROAD : (k === 0 ? T.BUSH : k === 1 ? T.ROCK : T.GRASS);
          ctx.fillStyle = tt === T.ROAD ? C.road : tt === T.BUSH ? C.bush : tt === T.ROCK ? C.rock : ((c + wr) & 1 ? C.grass : C.grass2);
          ctx.fillRect(c * TS, r * TS + (t % 16) - 16, TS, TS);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(12, 24, W - 24, 208);
        text(ctx, 'BORDER', W / 2 + 2, 36, '#601010', 3, 'center');
        text(ctx, 'BORDER', W / 2, 34, C.yellow, 3, 'center');
        text(ctx, 'LINE', W / 2 + 2, 60, '#601010', 3, 'center');
        text(ctx, 'LINE', W / 2, 58, C.red, 3, 'center');
        spr(ctx, TANK, 46, 98, E_PAL, 2); text(ctx, 'TANK       200', 64, 95, C.white);
        spr(ctx, TANK, 46, 118, E_PAL2, 2); text(ctx, 'HEAVY TANK 400', 64, 115, C.white);
        ctx.fillStyle = '#a0a0b0'; ctx.fillRect(40, 132, 12, 12); ctx.fillStyle = '#e03030'; ctx.fillRect(44, 136, 4, 4);
        text(ctx, 'GUN POST   300', 64, 135, C.white);
        spr(ctx, SOLDIER[(t >> 3) & 1], 46, 158, SOLDIER_PAL); text(ctx, 'SOLDIER    100', 64, 155, C.white);
        text(ctx, 'DESTROY THE ENEMY HQ', W / 2, 176, C.cyan, 1, 'center');
        text(ctx, 'FOR 5000 X LEVEL', W / 2, 186, C.cyan, 1, 'center');
        const blink = (t >> 4) & 1;
        if (api.credits === 0 || coinFlash > 0) { if (blink || (coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 202, C.red, 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 202, C.yellow, 1, 'center');
        text(ctx, '\u00a9 1981 SEGA', W / 2, 216, C.grey, 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOPY);
        text(ctx, 'HI ' + pad(hi, 6), W / 2, 4, C.red, 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 10, C.grey);
      }
      return { update, render, destroy() { } };
    }
  });
})();
