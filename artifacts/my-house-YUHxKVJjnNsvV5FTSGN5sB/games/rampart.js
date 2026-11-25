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
  function mkSpr(rows, pal) { return { rows: rows, pal: pal, w: rows[0].length, h: rows.length, cv: null, cvf: null }; }
  function bakeSpr(s, flip) {
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    for (let y = 0; y < s.h; y++) {
      const row = s.rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = s.pal[row[x]]; if (!col) continue;
        g.fillStyle = col; g.fillRect(flip ? s.w - 1 - x : x, y, 1, 1);
      }
    }
    return c;
  }
  function drawSpr(ctx, s, x, y, flip) {
    let c = flip ? s.cvf : s.cv;
    if (!c) { c = bakeSpr(s, flip); if (flip) s.cvf = c; else s.cv = c; }
    ctx.drawImage(c, Math.round(x), Math.round(y));
  }
  function hit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function pad2(n, k) { return String(n).padStart(k || 2, '0'); }

  // ======================================================================
  // Rampart (Atari Games, 1990) -- from-scratch recreation.
  // Pick a castle, place cannons, survive the naval bombardment, then
  // rebuild your walls with falling-block pieces before time runs out.
  // ======================================================================
  const T = 8, GW = 38, GH = 26, OY = 16, W = GW * T, H = 240;
  const WATER = 0, LAND = 1, WALL = 2, CRATER = 3;
  const PIECES = [
    [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[1, 0], [1, 1], [1, 2], [0, 2]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 1], [1, 1], [1, 0], [2, 0]],
    [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0]], [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]
  ];
  const CASTLES = [[5, 5], [15, 4], [6, 18], [16, 16], [10, 11], [21, 10]];
  const SHIPT = [
    { hp: 1, pts: 200, len: 12, rate: 1.0 },
    { hp: 2, pts: 400, len: 16, rate: 0.8 },
    { hp: 3, pts: 800, len: 20, rate: 0.7, lander: true }
  ];

  ArcadeRegistry.register({
    id: 'rampart', title: 'Rampart', year: 1990, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move cursor \u00b7 Space: place/fire \u00b7 X: rotate piece \u00b7 Enter: start',
    marquee: { bg: '#203050', fg: '#ffd040', accent: '#c02020' },
    create(api) {
      const au = api.audio;
      let mode = 'attract', attractT = 0, coinFlash = 0, overT = 0;
      let hi = api.getHiScore(50000);
      let score = 0, level = 1, round = 0;
      let map, terr, castles, cannons, ships, grunts, balls, parts, pops, phase, phaseT, timer, cur, piece, nextPiece, cannonsLeft, fleetLeft, homeIdx, fireIdx, msg, holdK, waveT;

      const sfx = {
        place() { au.tone(220, 0.06, { type: 'square', vol: 0.12 }); au.noise(0.05, { vol: 0.1, freq: 800 }); },
        bad() { au.tone(110, 0.1, { type: 'square', vol: 0.1 }); },
        rot() { au.tone(660, 0.03, { type: 'square', vol: 0.06 }); },
        fire() { au.noise(0.25, { vol: 0.22, freq: 900, slideTo: 200 }); au.tone(90, 0.2, { type: 'triangle', vol: 0.2, slideTo: 40 }); },
        efire() { au.noise(0.2, { vol: 0.12, freq: 600, slideTo: 150 }); },
        splash() { au.noise(0.25, { vol: 0.1, freq: 3000, slideTo: 600, type: 'bandpass' }); },
        boom() { au.noise(0.4, { vol: 0.2, freq: 1200, slideTo: 80 }); },
        sink() { au.tone(300, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 40 }); au.noise(0.8, { vol: 0.12, freq: 1500, slideTo: 200 }); },
        fanfare() { au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .4]], { type: 'square', vol: 0.12 }); },
        horn() { au.melody([[196, .35], [0, .05], [196, .15], [262, .5]], { type: 'sawtooth', vol: 0.1 }); },
        tick() { au.tone(1000, 0.03, { type: 'square', vol: 0.05 }); },
        lose() { au.melody([[392, .25], [370, .25], [349, .25], [294, .7]], { type: 'square', vol: 0.12 }); }
      };
      function addScore(n, x, y) {
        score += n; if (score > hi) hi = score;
        if (x != null) pops.push({ x: x, y: y, s: String(n), t: 50 });
      }
      function burst(x, y, col, n) {
        for (let i = 0; i < (n || 10); i++) {
          const a = Math.random() * Math.PI * 2, s = 0.3 + Math.random() * 1.6;
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.5, t: 20 + Math.random() * 20, c: col });
        }
      }
      const at = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH) ? WATER : map[y * GW + x];
      const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < GW && y < GH) map[y * GW + x] = v; };

      function genMap() {
        map = new Uint8Array(GW * GH);
        let c = 26;
        for (let y = 0; y < GH; y++) {
          c += Math.round((Math.random() - 0.5) * 2.2); c = Math.max(24, Math.min(29, c));
          for (let x = 0; x < GW; x++) map[y * GW + x] = x < c ? LAND : WATER;
        }
        // a couple of bays
        for (let k = 0; k < 2; k++) {
          const by = 4 + Math.random() * (GH - 8) | 0, bx = 22 + (Math.random() * 3 | 0);
          for (let y = by - 1; y <= by + 1; y++) for (let x = bx; x < GW; x++) set(x, y, WATER);
        }
        castles = CASTLES.map(([x, y], i) => ({ x: x, y: y, i: i, enc: false }));
        for (const k of castles) for (let dy = -4; dy <= 5; dy++) for (let dx = -4; dx <= 5; dx++) if (at(k.x + dx, k.y + dy) === WATER && k.x + dx < 26) set(k.x + dx, k.y + dy, LAND);
      }
      function occupied(x, y) {
        for (const k of castles) if (x >= k.x && x < k.x + 2 && y >= k.y && y < k.y + 2) return true;
        for (const c of cannons) if (x >= c.x && x < c.x + 2 && y >= c.y && y < c.y + 2) return true;
        for (const g of grunts) if (g.tx === x && g.ty === y) return true;
        return false;
      }
      function computeTerritory() {
        terr = new Uint8Array(GW * GH);
        const seen = new Uint8Array(GW * GH), stack = [];
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const i = y * GW + x;
          if ((x === 0 || y === 0 || x === GW - 1 || y === GH - 1 || map[i] === WATER) && map[i] !== WALL) { seen[i] = 1; stack.push(i); }
        }
        while (stack.length) {
          const i = stack.pop(), x = i % GW, y = (i / GW) | 0;
          const nb = [x > 0 ? i - 1 : -1, x < GW - 1 ? i + 1 : -1, y > 0 ? i - GW : -1, y < GH - 1 ? i + GW : -1];
          for (const j of nb) { if (j < 0 || seen[j] || map[j] === WALL) continue; seen[j] = 1; stack.push(j); }
        }
        let n = 0;
        for (let i = 0; i < GW * GH; i++) if (!seen[i] && map[i] !== WALL && map[i] !== WATER) { terr[i] = 1; n++; }
        for (const k of castles) k.enc = !!terr[k.y * GW + k.x] && !!terr[(k.y + 1) * GW + k.x + 1];
        for (const c of cannons) c.active = !!terr[c.y * GW + c.x];
        return n;
      }
      function ringWalls(k) {
        for (let y = k.y - 3; y <= k.y + 4; y++) for (let x = k.x - 3; x <= k.x + 4; x++) {
          if (x === k.x - 3 || x === k.x + 4 || y === k.y - 3 || y === k.y + 4) {
            if (at(x, y) !== WATER && !occupied(x, y)) set(x, y, WALL);
          }
        }
      }

      function newPiece() { const p = PIECES[Math.random() * (round <= 1 ? 6 : PIECES.length) | 0]; return p.map(a => a.slice()); }
      function rotate(p) {
        const r = p.map(([x, y]) => [-y, x]);
        const mx = Math.min(...r.map(a => a[0])), my = Math.min(...r.map(a => a[1]));
        return r.map(([x, y]) => [x - mx, y - my]);
      }
      function pieceOK(p, cx, cy) {
        for (const [dx, dy] of p) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= GW || y >= GH) return false;
          if (at(x, y) !== LAND || occupied(x, y)) return false;
        }
        return true;
      }
      function clampCur(w, h) { cur.tx = Math.max(0, Math.min(GW - w, cur.tx)); cur.ty = Math.max(0, Math.min(GH - h, cur.ty)); }
      function rep(code) {
        if (api.pressed(code)) { holdK[code] = 0; return true; }
        if (api.key(code)) { holdK[code] = (holdK[code] || 0) + 1; return holdK[code] > 12 && holdK[code] % 4 === 0; }
        holdK[code] = 0; return false;
      }
      function moveTileCursor() {
        if (rep('ArrowLeft')) cur.tx--; if (rep('ArrowRight')) cur.tx++;
        if (rep('ArrowUp')) cur.ty--; if (rep('ArrowDown')) cur.ty++;
      }

      // ---------------- phases ----------------
      function setPhase(p, t) { phase = p; phaseT = 0; timer = t || 0; }
      function startGame() {
        mode = 'play'; score = 0; level = 1; round = 0;
        cannons = []; ships = []; grunts = []; balls = []; parts = []; pops = []; holdK = {};
        genMap(); computeTerritory();
        homeIdx = 4; cur = { tx: 10, ty: 10, x: 0, y: 0 };
        fleetLeft = 6; waveT = 0;
        setPhase('pick', 10 * 60); sfx.fanfare();
      }
      function gameOver() {
        api.setHiScore(score); mode = 'over'; overT = 0;
      }
      function tryStart() {
        if (api.useCredit()) startGame();
        else { coinFlash = 90; au.tone(80, 0.25, { type: 'square', vol: 0.2 }); }
      }
      function beginCannons(n) {
        cannonsLeft = n;
        const k = castles[homeIdx];
        cur.tx = k.x - 1; cur.ty = k.y + 2; clampCur(2, 2);
        setPhase('cannons', 12 * 60);
      }
      function cannonOK(x, y) {
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const tx = x + dx, ty = y + dy;
          if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) return false;
          if (map[ty * GW + tx] !== LAND || !terr[ty * GW + tx] || occupied(tx, ty)) return false;
        }
        return true;
      }
      function beginBattle() {
        round++;
        const k = castles[homeIdx];
        cur.x = (k.x + 1) * T + 40; cur.y = OY + (k.y + 1) * T;
        const n = Math.min(fleetLeft, 1 + level + (round > 1 ? 0 : 1));
        for (let i = 0; i < n; i++) spawnShip();
        fleetLeft -= n;
        balls = [];
        fireIdx = 0;
        setPhase('ready', 0);
        sfx.horn();
      }
      function spawnShip() {
        const r = Math.random();
        const type = level >= 3 && r < 0.25 ? 2 : (level >= 2 && r < 0.6) || r < 0.25 ? 1 : 0;
        let y = 2 + Math.random() * (GH - 4);
        const s = { type: type, hp: SHIPT[type].hp, x: W + 10 + Math.random() * 40, y: OY + y * T, tx: 0, ty: 0, cd: 120 + Math.random() * 120, sink: 0, ang: Math.PI, unloaded: false, flash: 0 };
        pickShipTarget(s);
        ships.push(s);
      }
      function waterAtPx(x, y) { const tx = Math.floor(x / T), ty = Math.floor((y - OY) / T); if (tx >= GW) return ty >= 0 && ty < GH; return at(tx, ty) === WATER && tx >= 0 && ty >= 0 && ty < GH; }
      function pickShipTarget(s) {
        for (let k = 0; k < 40; k++) {
          const tx = 20 + (Math.random() * (GW - 21) | 0), ty = 1 + (Math.random() * (GH - 2) | 0);
          if (at(tx, ty) !== WATER) continue;
          let near = false;
          for (let d = 1; d <= 4 && !near; d++) if (at(tx - d, ty) === LAND || at(tx - d, ty) === WALL) near = true;
          if (!near && k < 30) continue;
          s.tx = tx * T + T / 2; s.ty = OY + ty * T + T / 2; return;
        }
        s.tx = W - 20; s.ty = s.y;
      }
      function beginBuild() {
        piece = newPiece(); nextPiece = newPiece();
        const k = castles[homeIdx];
        cur.tx = k.x; cur.ty = k.y - 4; clampCur(3, 3);
        setPhase('build', Math.max(15, 25 - level) * 60);
      }
      function endBuild() {
        const n = computeTerritory();
        // grunts trapped inside walls are crushed
        for (const g of grunts) if (terr[g.ty * GW + g.tx]) { g.dead = true; addScore(100); burst(g.tx * T + 4, OY + g.ty * T + 4, '#c02020', 8); }
        grunts = grunts.filter(g => !g.dead);
        // craters cool off
        for (let i = 0; i < GW * GH; i++) if (map[i] === CRATER) map[i] = LAND;
        const enc = castles.filter(k => k.enc);
        if (!enc.length) { setPhase('lost', 0); sfx.lose(); return; }
        if (!castles[homeIdx].enc) homeIdx = enc[0].i;
        let bonus = n * 5;
        for (const k of enc) bonus += k.i === homeIdx ? 1000 : 500;
        addScore(bonus);
        msg = 'TERRITORY BONUS ' + bonus;
        setPhase('tally', 0);
      }

      function fireCannon() {
        const ready = cannons.filter(c => c.active && !c.loaded);
        if (!ready.length) { sfx.bad(); return; }
        // fire cannons in rotation, like the arcade
        ready.sort((a, b) => a.order - b.order);
        let c = ready.find(c => c.order > fireIdx) || ready[0];
        fireIdx = c.order;
        const sx = (c.x + 1) * T, sy = OY + (c.y + 1) * T;
        const d = Math.hypot(cur.x - sx, cur.y - sy);
        balls.push({ sx: sx, sy: sy, tx: cur.x, ty: cur.y, t: 0, dur: Math.max(18, d / 2.6), mine: true, c: c });
        c.loaded = true; c.recoil = 8;
        sfx.fire();
      }
      function impact(b) {
        const tx = Math.floor(b.tx / T), ty = Math.floor((b.ty - OY) / T);
        if (b.mine) {
          b.c.loaded = false;
          let hitShip = false;
          for (const s of ships) {
            if (s.sink) continue;
            if (Math.abs(s.x - b.tx) < SHIPT[s.type].len / 2 + 3 && Math.abs(s.y - b.ty) < 7) {
              hitShip = true; s.hp--; s.flash = 10; sfx.boom(); burst(b.tx, b.ty, '#ffa020', 10);
              if (s.hp <= 0) { s.sink = 1; sfx.sink(); addScore(SHIPT[s.type].pts, s.x, s.y - 10); }
            }
          }
          for (const g of grunts) if (Math.abs(g.tx * T + 4 - b.tx) < 7 && Math.abs(OY + g.ty * T + 4 - b.ty) < 7) { g.dead = true; addScore(50, b.tx, b.ty - 8); burst(b.tx, b.ty, '#c02020', 8); }
          grunts = grunts.filter(g => !g.dead);
          if (hitShip) return;
        }
        if (!b.mine && god) return;
        const v = at(tx, ty);
        if (v === WATER) { sfx.splash(); for (let i = 0; i < 6; i++) parts.push({ x: b.tx, y: b.ty, vx: (Math.random() - 0.5), vy: -1 - Math.random(), t: 20, c: '#c0e0ff' }); return; }
        sfx.boom(); burst(b.tx, b.ty, '#ffa020', 8);
        if (v === WALL) { set(tx, ty, LAND); burst(b.tx, b.ty, '#909090', 8); return; }
        for (const c of cannons) {
          if (tx >= c.x && tx < c.x + 2 && ty >= c.y && ty < c.y + 2) {
            if (!b.mine) { c.hp--; c.flash = 10; if (c.hp <= 0) { c.dead = true; burst((c.x + 1) * T, OY + (c.y + 1) * T, '#404040', 16); } }
            return;
          }
        }
        if (v === LAND && !occupied(tx, ty)) set(tx, ty, CRATER);
      }

      function updateShips() {
        for (const s of ships) {
          if (s.flash) s.flash--;
          if (s.sink) { s.sink++; continue; }
          const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
          const sp = 0.25 + level * 0.03;
          if (d > 2) {
            const nx = s.x + dx / d * sp, ny = s.y + dy / d * sp;
            if (waterAtPx(nx - 6, ny) && waterAtPx(nx + 6, ny) && waterAtPx(nx, ny - 3) && waterAtPx(nx, ny + 3)) { s.x = nx; s.y = ny; s.ang = Math.atan2(dy, dx); }
            else pickShipTarget(s);
          } else if (Math.random() < 0.005) pickShipTarget(s);
          // landing craft unload grunts on the shore
          if (SHIPT[s.type].lander && !s.unloaded) {
            const tx = Math.floor(s.x / T), ty = Math.floor((s.y - OY) / T);
            for (const [ox, oy] of [[-2, 0], [-3, 0], [-2, 1], [-2, -1]]) {
              const gx = tx + ox, gy = ty + oy;
              if (at(gx, gy) === LAND && !occupied(gx, gy) && !terr[gy * GW + gx]) {
                grunts.push({ tx: gx, ty: gy, t: 0 }); s.unloaded = true;
                if (at(gx - 1, gy) === LAND && !occupied(gx - 1, gy)) grunts.push({ tx: gx - 1, ty: gy, t: 20 });
                break;
              }
            }
          }
          if (--s.cd <= 0) {
            s.cd = (150 + Math.random() * 150) * SHIPT[s.type].rate * Math.max(0.45, 1 - level * 0.08);
            // aim at a nearby wall or cannon
            const targets = [];
            const sx = Math.floor(s.x / T), sy = Math.floor((s.y - OY) / T);
            for (let y = Math.max(0, sy - 12); y < Math.min(GH, sy + 12); y++) for (let x = Math.max(0, sx - 18); x < Math.min(GW, sx); x++) if (map[y * GW + x] === WALL) targets.push([x, y]);
            for (const c of cannons) if (Math.abs(c.x - sx) < 20 && Math.abs(c.y - sy) < 14) targets.push([c.x, c.y], [c.x + 1, c.y + 1]);
            if (targets.length) {
              const [x, y] = targets[Math.random() * targets.length | 0];
              const err = Math.random() < 0.3 ? 1 : 0;
              const ex = (x + (err ? (Math.random() < 0.5 ? -1 : 1) : 0)) * T + 4, ey = OY + y * T + 4;
              const d2 = Math.hypot(ex - s.x, ey - s.y);
              balls.push({ sx: s.x, sy: s.y, tx: ex, ty: ey, t: 0, dur: Math.max(20, d2 / 2.2), mine: false });
              sfx.efire();
            }
          }
        }
        ships = ships.filter(s => s.sink < 90);
      }
      function updateGrunts() {
        for (const g of grunts) {
          if (++g.t < 45) continue;
          g.t = 0;
          // walk toward the nearest castle, never through walls or water
          let best = null, bd = 1e9;
          for (const k of castles) { const d = Math.abs(k.x - g.tx) + Math.abs(k.y - g.ty); if (d < bd) { bd = d; best = k; } }
          if (!best || bd <= 2) continue;
          const opts = [[Math.sign(best.x - g.tx), 0], [0, Math.sign(best.y - g.ty)]].filter(([a, b]) => a || b);
          if (Math.random() < 0.3) opts.reverse();
          for (const [ax, ay] of opts) {
            const nx = g.tx + ax, ny = g.ty + ay;
            if (at(nx, ny) === LAND || at(nx, ny) === CRATER) { if (!occupied(nx, ny)) { g.tx = nx; g.ty = ny; break; } }
          }
        }
      }

      function update() {
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (mode === 'attract') {
          attractT++;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (mode === 'over') {
          overT++;
          if (overT > 300 || (overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; attractT = 0; }
          return;
        }
        phaseT++;
        for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.05; q.t--; }
        parts = parts.filter(q => q.t > 0);
        for (const q of pops) { q.y -= 0.4; q.t--; }
        pops = pops.filter(q => q.t > 0);
        for (const c of cannons) { if (c.recoil) c.recoil--; if (c.flash) c.flash--; }

        if (phase === 'pick') {
          if (api.anyPressed('ArrowRight', 'ArrowDown')) { homeIdx = (homeIdx + 1) % castles.length; sfx.rot(); }
          if (api.anyPressed('ArrowLeft', 'ArrowUp')) { homeIdx = (homeIdx + castles.length - 1) % castles.length; sfx.rot(); }
          timer--;
          if ((phaseT > 20 && api.anyPressed('Space', 'KeyX')) || timer <= 0) {
            ringWalls(castles[homeIdx]); computeTerritory(); sfx.place();
            beginCannons(3);
          }
          return;
        }
        if (phase === 'cannons') {
          moveTileCursor(); clampCur(2, 2);
          timer--;
          if (api.pressed('Space')) {
            if (cannonOK(cur.tx, cur.ty)) {
              cannons.push({ x: cur.tx, y: cur.ty, hp: 3, active: true, loaded: false, order: cannons.length ? Math.max(...cannons.map(c => c.order)) + 1 : 1, recoil: 0, flash: 0 });
              cannonsLeft--; sfx.place();
            } else sfx.bad();
          }
          if (cannonsLeft <= 0 || timer <= 0) beginBattle();
          return;
        }
        if (phase === 'ready') {
          if (phaseT > 100) setPhase('battle', (12 + Math.min(6, level)) * 60);
          return;
        }
        if (phase === 'battle') {
          const sp = 2.4;
          if (api.key('ArrowLeft')) cur.x -= sp; if (api.key('ArrowRight')) cur.x += sp;
          if (api.key('ArrowUp')) cur.y -= sp; if (api.key('ArrowDown')) cur.y += sp;
          cur.x = Math.max(2, Math.min(W - 2, cur.x)); cur.y = Math.max(OY + 2, Math.min(OY + GH * T - 2, cur.y));
          if (api.pressed('Space') || api.pressed('KeyX')) fireCannon();
          timer--;
          if (timer > 0 && timer <= 180 && timer % 60 === 0) sfx.tick();
          updateShips(); updateGrunts();
          for (const b of balls) { b.t++; if (b.t >= b.dur) { b.done = true; impact(b); } }
          balls = balls.filter(b => !b.done);
          cannons = cannons.filter(c => !c.dead);
          if (fleetLeft > 0 && ships.filter(s => !s.sink).length < 2 && phaseT % 300 === 299) { spawnShip(); fleetLeft--; }
          const alive = ships.filter(s => !s.sink).length;
          if (timer <= 0 || (alive === 0 && fleetLeft === 0 && phaseT > 30)) {
            for (const c of cannons) c.loaded = false;
            balls = [];
            if (alive === 0 && fleetLeft === 0) {
              const bonus = 5000 * level; addScore(bonus); msg = 'FLEET DESTROYED! BONUS ' + bonus; sfx.fanfare();
              level++; fleetLeft = 4 + level * 2;
              setPhase('victory', 0);
            } else { setPhase('ceasefire', 0); }
          }
          return;
        }
        if (phase === 'ceasefire' || phase === 'victory') {
          for (const s of ships) if (s.sink) s.sink++;
          ships = ships.filter(s => s.sink < 90);
          if (phaseT > (phase === 'victory' ? 200 : 80)) beginBuild();
          return;
        }
        if (phase === 'build') {
          moveTileCursor();
          const pw = Math.max(...piece.map(a => a[0])) + 1, ph = Math.max(...piece.map(a => a[1])) + 1;
          clampCur(pw, ph);
          if (api.pressed('KeyX') || api.pressed('KeyZ')) { piece = rotate(piece); sfx.rot(); const w2 = Math.max(...piece.map(a => a[0])) + 1, h2 = Math.max(...piece.map(a => a[1])) + 1; clampCur(w2, h2); }
          if (api.pressed('Space')) {
            if (pieceOK(piece, cur.tx, cur.ty)) {
              for (const [dx, dy] of piece) set(cur.tx + dx, cur.ty + dy, WALL);
              sfx.place(); piece = nextPiece; nextPiece = newPiece();
              computeTerritory();
            } else sfx.bad();
          }
          timer--;
          if (timer > 0 && timer <= 300 && timer % 60 === 0) sfx.tick();
          if (timer <= 0) endBuild();
          return;
        }
        if (phase === 'tally') {
          if (phaseT > 150) {
            const enc = castles.filter(k => k.enc).length;
            beginCannons(Math.min(6, 1 + enc));
          }
          return;
        }
        if (phase === 'lost') {
          if (phaseT === 150) {
            const cont = () => {
              // continue: rebuild a fresh ring around the home castle
              for (const g of grunts) if (Math.abs(g.tx - castles[homeIdx].x) < 5 && Math.abs(g.ty - castles[homeIdx].y) < 5) g.dead = true;
              grunts = grunts.filter(g => !g.dead);
              ringWalls(castles[homeIdx]); computeTerritory();
              beginCannons(3);
            };
            if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver();
          }
        }
      }

      // ---------------- drawing ----------------
      function drawMap(ctx) {
        const wv = api.frame >> 4;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const v = map[y * GW + x], px = x * T, py = OY + y * T;
          if (v === WATER) {
            ctx.fillStyle = '#1838a0'; ctx.fillRect(px, py, T, T);
            if (((x + y * 3 + wv) % 7) === 0) { ctx.fillStyle = '#4070e0'; ctx.fillRect(px + 1, py + 3, 4, 1); }
          } else if (terr[y * GW + x]) {
            ctx.fillStyle = (x + y) & 1 ? '#6a7aa8' : '#7484b4'; ctx.fillRect(px, py, T, T);
          } else {
            ctx.fillStyle = (x + y) & 1 ? '#3a8a2a' : '#409230'; ctx.fillRect(px, py, T, T);
          }
          if (v === WALL) {
            ctx.fillStyle = '#8a8a8a'; ctx.fillRect(px, py, T, T);
            ctx.fillStyle = '#c0c0c0'; ctx.fillRect(px, py, T, 2); ctx.fillRect(px, py, 2, T);
            ctx.fillStyle = '#505050'; ctx.fillRect(px, py + T - 1, T, 1); ctx.fillRect(px + T - 1, py, 1, T);
            ctx.fillStyle = '#6a6a6a'; ctx.fillRect(px + 3, py + 4, 3, 1);
          } else if (v === CRATER) {
            ctx.fillStyle = '#3a2410'; ctx.fillRect(px + 1, py + 1, T - 2, T - 2);
            ctx.fillStyle = (api.frame >> 2) & 1 ? '#ff6020' : '#ffc040'; ctx.fillRect(px + 3, py + 2 + ((api.frame >> 3) & 1), 2, 3);
          }
        }
        // coast foam
        ctx.fillStyle = '#e0f0ff';
        for (let y = 0; y < GH; y++) for (let x = 1; x < GW; x++) if (map[y * GW + x] === WATER && map[y * GW + x - 1] !== WATER && ((y + wv) & 1)) ctx.fillRect(x * T, OY + y * T + 2, 1, 4);
      }
      function drawCastle(ctx, k, home) {
        const px = k.x * T, py = OY + k.y * T;
        ctx.fillStyle = '#b0a080'; ctx.fillRect(px, py + 3, 16, 13);
        ctx.fillStyle = '#d8c8a0'; ctx.fillRect(px, py + 3, 16, 2);
        ctx.fillStyle = '#8a7a5a'; for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 4, py + 1, 2, 2);
        ctx.fillStyle = '#d8c8a0'; ctx.fillRect(px, py, 4, 6); ctx.fillRect(px + 12, py, 4, 6);
        ctx.fillStyle = '#302010'; ctx.fillRect(px + 6, py + 10, 4, 6);
        ctx.fillStyle = '#000'; ctx.fillRect(px + 2, py + 7, 1, 2); ctx.fillRect(px + 13, py + 7, 1, 2);
        ctx.fillStyle = '#505050'; ctx.fillRect(px + 7, py - 6, 1, 7);
        ctx.fillStyle = home ? '#ffd040' : k.enc ? '#3060ff' : '#808080';
        const f = (api.frame >> 3) & 1; ctx.fillRect(px + 8, py - 6, 5 - f, 3);
      }
      function drawCannon(ctx, c) {
        const px = c.x * T, py = OY + c.y * T, r = c.recoil ? 1 : 0;
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(px + 1, py + 9, 14, 6);
        ctx.fillStyle = '#7a5a2a'; ctx.fillRect(px + 2, py + 10, 3, 3); ctx.fillRect(px + 11, py + 10, 3, 3);
        ctx.fillStyle = c.flash && (c.flash >> 1) & 1 ? '#ffffff' : c.active ? '#303038' : '#707070';
        ctx.beginPath(); ctx.arc(px + 8, py + 8 + r, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(px + 10, py + 5 + r, 6, 3);
        ctx.fillStyle = '#9090a0'; ctx.fillRect(px + 6, py + 5 + r, 2, 2);
        if (c.active && !c.loaded && phase === 'battle') { ctx.fillStyle = '#ffd040'; ctx.fillRect(px + 7, py + 1, 2, 2); }
        for (let i = 0; i < c.hp; i++) { ctx.fillStyle = '#40ff40'; ctx.fillRect(px + 2 + i * 4, py + 15, 3, 1); }
      }
      function drawShip(ctx, s) {
        const L = SHIPT[s.type].len, x = Math.round(s.x), y = Math.round(s.y + (s.sink ? s.sink / 12 : 0));
        if (s.sink && (s.sink >> 2) & 1) return;
        ctx.save(); ctx.translate(x, y);
        if (Math.cos(s.ang) > 0) ctx.scale(-1, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(L / 2 - 1, 2, 4 + ((api.frame >> 3) & 1) * 2, 1);
        ctx.fillStyle = s.flash && (s.flash >> 1) & 1 ? '#ffffff' : '#6a3a14'; ctx.fillRect(-L / 2, -1, L, 4); ctx.fillRect(-L / 2 - 2, -2, 3, 3);
        ctx.fillStyle = '#3a1a04'; ctx.fillRect(-L / 2 + 1, 2, L - 2, 1);
        const masts = s.type + 1;
        for (let m = 0; m < masts; m++) {
          const mx = -L / 2 + 4 + m * (L - 6) / Math.max(1, masts - 0.5);
          ctx.fillStyle = '#3a2a10'; ctx.fillRect(mx, -10, 1, 9);
          ctx.fillStyle = s.type === 2 ? '#e04040' : '#f0f0e0'; ctx.fillRect(mx - 3, -9, 6, 5);
        }
        ctx.restore();
        if (!s.sink && s.hp > 1) for (let i = 0; i < s.hp; i++) { ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 4 + i * 3, y + 5, 2, 1); }
      }
      function drawGrunt(ctx, g) {
        const px = g.tx * T, py = OY + g.ty * T, f = (api.frame >> 3) & 1;
        ctx.fillStyle = '#c02020'; ctx.fillRect(px + 2, py + 2, 4, 4);
        ctx.fillStyle = '#ffd0a0'; ctx.fillRect(px + 3, py, 2, 2);
        ctx.fillStyle = '#202020'; ctx.fillRect(px + 2 + f, py + 6, 1, 2); ctx.fillRect(px + 5 - f, py + 6, 1, 2);
      }
      function drawBall(ctx, b) {
        const k = b.t / b.dur, x = b.sx + (b.tx - b.sx) * k, y = b.sy + (b.ty - b.sy) * k;
        const hgt = Math.sin(k * Math.PI) * Math.min(60, b.dur * 0.9);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 2);
        ctx.fillStyle = b.mine ? '#202020' : '#600000'; ctx.fillRect(Math.round(x) - 2, Math.round(y - hgt) - 2, 4, 4);
        ctx.fillStyle = b.mine ? '#a0a0a0' : '#ff8080'; ctx.fillRect(Math.round(x) - 1, Math.round(y - hgt) - 2, 1, 1);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, OY); ctx.fillRect(0, OY + GH * T, W, H - OY - GH * T);
        text(ctx, 'SCORE ' + score, 4, 4, '#ffffff');
        text(ctx, 'HI ' + hi, W / 2, 4, '#ffd040', 1, 'center');
        text(ctx, 'LEVEL ' + level, W - 4, 4, '#40c0ff', 1, 'right');
        const by = OY + GH * T + 4;
        const secs = Math.ceil(timer / 60);
        let label = '';
        if (phase === 'pick') label = 'SELECT YOUR HOME CASTLE';
        else if (phase === 'cannons') label = 'PLACE CANNONS: ' + cannonsLeft + '  TIME ' + secs;
        else if (phase === 'battle') label = 'BATTLE!  TIME ' + secs + '  SHIPS ' + (ships.filter(s => !s.sink).length + fleetLeft);
        else if (phase === 'build') label = 'REBUILD YOUR WALLS  TIME ' + secs;
        else if (phase === 'ready') label = 'PREPARE FOR BATTLE';
        else if (phase === 'ceasefire') label = 'CEASE FIRE';
        text(ctx, label, W / 2, by, phase === 'build' && secs <= 5 && (api.frame >> 3) & 1 ? '#ff4040' : '#ffffff', 1, 'center');
      }
      function drawPlay(ctx) {
        drawMap(ctx);
        for (let i = 0; i < castles.length; i++) drawCastle(ctx, castles[i], i === homeIdx && phase !== 'pick');
        for (const c of cannons) drawCannon(ctx, c);
        for (const g of grunts) drawGrunt(ctx, g);
        for (const s of ships) drawShip(ctx, s);
        for (const b of balls) drawBall(ctx, b);
        for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(q.x | 0, q.y | 0, 2, 2); }
        for (const q of pops) text(ctx, q.s, q.x | 0, q.y | 0, '#ffffff', 1, 'center');
        const blink = (api.frame >> 3) & 1;
        if (phase === 'pick') {
          const k = castles[homeIdx];
          ctx.strokeStyle = blink ? '#ffff40' : '#ffffff'; ctx.lineWidth = 1;
          ctx.strokeRect((k.x - 3) * T + 0.5, OY + (k.y - 3) * T + 0.5, 8 * T - 1, 8 * T - 1);
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 100, OY + 4, 200, 22);
          text(ctx, 'CHOOSE A CASTLE', W / 2, OY + 7, '#ffd040', 1, 'center');
          text(ctx, 'ARROWS + SPACE', W / 2, OY + 16, '#ffffff', 1, 'center');
        } else if (phase === 'cannons') {
          const ok = cannonOK(cur.tx, cur.ty);
          ctx.fillStyle = ok ? 'rgba(255,255,255,0.45)' : 'rgba(255,40,40,0.45)';
          ctx.fillRect(cur.tx * T, OY + cur.ty * T, 16, 16);
          if (blink) { ctx.strokeStyle = '#ffffff'; ctx.strokeRect(cur.tx * T + 0.5, OY + cur.ty * T + 0.5, 15, 15); }
        } else if (phase === 'build') {
          const ok = pieceOK(piece, cur.tx, cur.ty);
          for (const [dx, dy] of piece) {
            const px = (cur.tx + dx) * T, py = OY + (cur.ty + dy) * T;
            ctx.fillStyle = ok ? (blink ? '#e0e0e0' : '#b0b0b0') : (blink ? '#ff4040' : '#a02020');
            ctx.fillRect(px, py, T, T);
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px + T - 1, py, 1, T); ctx.fillRect(px, py + T - 1, T, 1);
          }
          // next piece preview
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W - 44, OY + 2, 42, 40);
          text(ctx, 'NEXT', W - 23, OY + 4, '#ffffff', 1, 'center');
          for (const [dx, dy] of nextPiece) { ctx.fillStyle = '#c0c0c0'; ctx.fillRect(W - 38 + dx * 6, OY + 14 + dy * 6, 5, 5); }
        } else if (phase === 'battle') {
          const x = Math.round(cur.x), y = Math.round(cur.y);
          ctx.fillStyle = blink ? '#ffff40' : '#ffffff';
          ctx.fillRect(x - 6, y, 4, 1); ctx.fillRect(x + 3, y, 4, 1); ctx.fillRect(x, y - 6, 1, 4); ctx.fillRect(x, y + 3, 1, 4);
          ctx.strokeStyle = ctx.fillStyle; ctx.strokeRect(x - 3.5, y - 3.5, 8, 8);
        }
        if (phase === 'ready') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 100, W, 30); text(ctx, 'PREPARE FOR BATTLE!', W / 2, 108, '#ff4040', 2, 'center'); }
        if (phase === 'ceasefire' && phaseT < 70) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 100, W, 30); text(ctx, 'CEASE FIRE!', W / 2, 108, '#ffffff', 2, 'center'); }
        if (phase === 'victory') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 96, W, 36); text(ctx, 'VICTORY!', W / 2, 100, '#ffd040', 2, 'center'); text(ctx, msg, W / 2, 120, '#ffffff', 1, 'center'); }
        if (phase === 'tally') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 96, W, 36); text(ctx, 'CASTLES HELD: ' + castles.filter(k => k.enc).length, W / 2, 102, '#ffd040', 1, 'center'); text(ctx, msg, W / 2, 116, '#ffffff', 1, 'center'); }
        if (phase === 'lost') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 96, W, 36); text(ctx, 'NO CASTLE ENCLOSED!', W / 2, 102, '#ff4040', 2, 'center'); text(ctx, 'YOUR KINGDOM HAS FALLEN', W / 2, 120, '#ffffff', 1, 'center'); }
        drawHUD(ctx);
      }
      function drawAttract(ctx) {
        ctx.fillStyle = '#102040'; ctx.fillRect(0, 0, W, H);
        // seaside castle scene
        ctx.fillStyle = '#1838a0'; ctx.fillRect(0, 150, W, 90);
        ctx.fillStyle = '#3a8a2a'; ctx.beginPath(); ctx.moveTo(0, 140); ctx.lineTo(180, 140); ctx.lineTo(220, 240); ctx.lineTo(0, 240); ctx.fill();
        for (let i = 0; i < 9; i++) { ctx.fillStyle = '#8a8a8a'; ctx.fillRect(20 + i * 14, 128, 12, 12); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(20 + i * 14, 128, 12, 2); }
        drawCastle(ctx, { x: 7, y: (112 - OY) / T, enc: true }, true);
        const sx = W - ((attractT * 0.4) % (W + 60)) + 30;
        drawShip(ctx, { type: 2, x: Math.max(230, sx), y: 180, ang: Math.PI, sink: 0, hp: 3, flash: 0 });
        drawShip(ctx, { type: 0, x: Math.max(250, sx + 40), y: 205, ang: Math.PI, sink: 0, hp: 1, flash: 0 });
        text(ctx, 'RAMPART', W / 2 + 3, 23, '#602010', 5, 'center');
        text(ctx, 'RAMPART', W / 2, 20, '#ffd040', 5, 'center');
        text(ctx, 'BUILD - FIRE - REPAIR', W / 2, 62, '#ffffff', 1, 'center');
        text(ctx, 'ENCLOSE A CASTLE WITH WALLS EACH ROUND', W / 2, 78, '#c0d0ff', 1, 'center');
        text(ctx, 'OR YOUR KINGDOM FALLS', W / 2, 88, '#c0d0ff', 1, 'center');
        text(ctx, 'HI ' + hi, W / 2, 4, '#ffd040', 1, 'center');
        const blink = (api.frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 104, '#ffffff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 104, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 104, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1990 ATARI GAMES', W / 2, 226, '#c0c0c0', 1, 'center');
        text(ctx, 'CREDIT ' + pad2(Math.min(99, api.credits)), 4, H - 9, '#c0c0c0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { drawAttract(ctx); return; }
        drawPlay(ctx);
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(W / 2 - 80, 140, 160, 30);
          text(ctx, 'GAME OVER', W / 2, 148, '#ff4040', 2, 'center');
        }
      }
      let god = false;
      if (api.debugHook) api.debugHook({ st: () => ({ mode, phase, phaseT, timer, level, round, score, cur, piece, map, terr, castles, cannons, ships, grunts, balls, fleetLeft, homeIdx, fireIdx, GW, GH, T, OY, W }), god: v => { god = v !== false; } });
      return { update, render };
    }
  });
})();
