// Omega Race (Midway, 1981) - from-scratch vector recreation.
// Your ship circles a walled rectangular arena around the central score box, bouncing off the walls.
// Droid ships patrol the lane and lay photon mines, droids promote into Command Ships that fire and lay
// vapor mines, and Command Ships left alive too long turn into spinning Death Ships.
(function () {
  'use strict';
  const W = 640, H = 480;

  // ---------- stroke font: 4x6 grid, each glyph = strokes of "xy" digit pairs ----------
  const VF = {
    A: '0602204246 0343', B: '0006 003041423303 3344453606', C: '40000646', D: '0006 003041453606',
    E: '40000646 0333', F: '400006 0333', G: '40000646 4643 2343', H: '0006 4046 0343', I: '0040 2026 0646',
    J: '4045361605', K: '0006 400346', L: '000646', M: '0600224046', N: '06004640', O: '0040460600',
    P: '0600404303', Q: '0040460600 2446', R: '0600404303 1346', S: '400003434606', T: '0040 2026',
    U: '00064640', V: '002640', W: '0006244640', X: '0046 4006', Y: '002240 2226', Z: '00400646',
    '0': '0040460600 4006', '1': '112026 1636', '2': '004043030646', '3': '00404606 1343', '4': '000343 4046',
    '5': '400003434606', '6': '400006464303', '7': '004026', '8': '0040460600 0343', '9': '4303004046',
    '-': '0343', '.': '2526', ':': '2122 2425', '!': '2024 2526', '/': '4006', '=': '0242 0444', "'": '2022',
    ',': '2516', '?': '0040432324 2526', '(': '30121436', ')': '10323416', '>': '004306', '<': '400346', '+': '2125 0343'
  };
  function vtext(ctx, str, x, y, sc, align) {
    str = String(str).toUpperCase();
    const adv = 6 * sc, w = str.length * adv - 2 * sc;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    for (const ch of str) {
      const g = VF[ch];
      if (g) for (const st of g.split(' ')) {
        for (let i = 0; i < st.length; i += 2) {
          const px = x + (+st[i]) * sc, py = y + (+st[i + 1]) * sc;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (st.length === 2) ctx.lineTo(x + (+st[0]) * sc + 0.6, y + (+st[1]) * sc);
      }
      x += adv;
    }
  }
  function poly(ctx, pts, x, y, a, sc, closed) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < pts.length; i++) {
      const px = pts[i][0] * sc, py = pts[i][1] * sc;
      const X = x + px * c - py * s, Y = y + px * s + py * c;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    if (closed) { const px = pts[0][0] * sc, py = pts[0][1] * sc; ctx.lineTo(x + px * c - py * s, y + px * s + py * c); }
  }
  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  // arena
  const X0 = 8, Y0 = 8, X1 = W - 8, Y1 = H - 8;
  const BX0 = 214, BY0 = 178, BX1 = 426, BY1 = 302;
  const CX = W / 2, CY = H / 2;
  // outer wall segments (each lights up when bounced on)
  const SEGS = [];
  (function () {
    const nx = 4, ny = 3;
    for (let i = 0; i < nx; i++) {
      SEGS.push({ x0: X0 + (X1 - X0) * i / nx, y0: Y0, x1: X0 + (X1 - X0) * (i + 1) / nx, y1: Y0, f: 0 });
      SEGS.push({ x0: X0 + (X1 - X0) * i / nx, y0: Y1, x1: X0 + (X1 - X0) * (i + 1) / nx, y1: Y1, f: 0 });
    }
    for (let i = 0; i < ny; i++) {
      SEGS.push({ x0: X0, y0: Y0 + (Y1 - Y0) * i / ny, x1: X0, y1: Y0 + (Y1 - Y0) * (i + 1) / ny, f: 0 });
      SEGS.push({ x0: X1, y0: Y0 + (Y1 - Y0) * i / ny, x1: X1, y1: Y0 + (Y1 - Y0) * (i + 1) / ny, f: 0 });
    }
  })();

  const SHIP = [[12, 0], [-8, -7], [-4, 0], [-8, 7]];
  const FLAME = [[-5, -3], [-12, 0], [-5, 3]];
  const DROID = [[[0, -7], [7, 0], [0, 7], [-7, 0], [0, -7]], [[-3, -3], [3, 3]], [[3, -3], [-3, 3]]];
  const COMMAND = [[[10, 0], [4, -7], [-4, -7], [-10, 0], [-4, 7], [4, 7], [10, 0]], [[-10, 0], [10, 0]], [[0, -7], [0, 7]]];
  const DEATH = [[[0, -10], [3, -3], [10, 0], [3, 3], [0, 10], [-3, 3], [-10, 0], [-3, -3], [0, -10]]];
  const VAPOR = [[[0, -8], [0, 8]], [[-8, 0], [8, 0]], [[-6, -6], [6, 6]], [[6, -6], [-6, 6]]];
  const PTS = { droid: 1000, command: 1500, death: 2500, photon: 350, vapor: 500 };
  const COL = { droid: '#ff5050', command: '#ffd040', death: '#ff60ff', photon: '#ff9090', vapor: '#ffd890' };

  ArcadeRegistry.register({
    id: 'omegarace', title: 'Omega Race', year: 1981, maker: 'Midway',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up or X: thrust \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#020210', fg: '#e8e8ff', accent: '#ff4040' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(10000);
      let state = 'attract', stateT = 0, coinFlash = 0, overT = 0;
      let ship = null, shots = [], eshots = [], foes = [], mines = [], debris = [];
      let score = 0, lives = 3, level = 0, nextExtra = 40000, promoteT = 0, waveT = 0, msgT = 0, respawnT = 0, humT = 0;

      function newShip() {
        ship = { x: CX - 40, y: (Y1 + BY1) / 2, vx: 0, vy: 0, a: 0, alive: true, thrust: false, cool: 0, inv: 90 };
      }
      function spawnWave() {
        level++;
        foes = []; mines = []; eshots = [];
        const n = Math.min(10, 4 + level);
        // the droids start in a column formation on the right side of the arena and circle as a pack
        for (let i = 0; i < n; i++) {
          const col = i % 2, row = Math.floor(i / 2);
          foes.push(makeFoe('droid', X1 - 40 - col * 26, BY0 + 10 + row * 24 - (n > 8 ? 20 : 0)));
        }
        promoteT = Math.max(120, 330 - level * 25);
        msgT = 100;
      }
      function makeFoe(kind, x, y) {
        return { kind, x, y, vx: 0, vy: 0, a: rnd(0, 6), age: 0, cool: rnd(60, 160), mineT: rnd(120, 300) };
      }
      function startGame() {
        score = 0; lives = 3; level = 0; nextExtra = 40000; shots = []; debris = [];
        state = 'play'; stateT = 0; newShip(); spawnWave();
        A.melody([[392, .1], [523, .1], [659, .1], [784, .1], [1047, .25]], { type: 'square', vol: .13 });
      }
      function tryStart() {
        if (api.useCredit()) startGame();
        else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.22 }); }
      }
      function attractInit() {
        state = 'attract'; stateT = 0; level = 0; ship = null; shots = []; spawnWave();
      }
      function addScore(n) {
        if (state !== 'play') return;
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += nextExtra === 40000 ? 110000 : 150000; A.melody([[880, .08], [1175, .08], [1760, .16]], { type: 'square', vol: .14 }); }
        if (score > hi) { hi = score; api.setHiScore(hi); }
      }
      function burst(x, y, col, n) {
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2, v = rnd(0.5, 3);
          debris.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: rnd(3, 9), a: rnd(0, 6), r: rnd(-0.3, 0.3), t: rnd(25, 60), c: col });
        }
      }

      // ---------- arena physics ----------
      function bounceArena(o, r, damp, lightUp) {
        let hit = false;
        if (o.x < X0 + r) { o.x = X0 + r; o.vx = Math.abs(o.vx) * damp; hit = true; if (lightUp) light(X0, o.y); }
        if (o.x > X1 - r) { o.x = X1 - r; o.vx = -Math.abs(o.vx) * damp; hit = true; if (lightUp) light(X1, o.y); }
        if (o.y < Y0 + r) { o.y = Y0 + r; o.vy = Math.abs(o.vy) * damp; hit = true; if (lightUp) light(o.x, Y0); }
        if (o.y > Y1 - r) { o.y = Y1 - r; o.vy = -Math.abs(o.vy) * damp; hit = true; if (lightUp) light(o.x, Y1); }
        // the central box
        const qx = Math.max(BX0, Math.min(BX1, o.x)), qy = Math.max(BY0, Math.min(BY1, o.y));
        const dx = o.x - qx, dy = o.y - qy, d = Math.hypot(dx, dy);
        if (d < r) {
          let nx, ny;
          if (d > 0.001) { nx = dx / d; ny = dy / d; }
          else {
            const l = o.x - BX0, rr = BX1 - o.x, t = o.y - BY0, b = BY1 - o.y, m = Math.min(l, rr, t, b);
            nx = m === l ? -1 : m === rr ? 1 : 0; ny = m === t ? -1 : m === b ? 1 : 0;
            if (nx && ny) ny = 0;
          }
          o.x = qx + nx * r; o.y = qy + ny * r;
          const vn = o.vx * nx + o.vy * ny;
          if (vn < 0) { o.vx -= (1 + damp) * vn * nx; o.vy -= (1 + damp) * vn * ny; }
          hit = true;
        }
        return hit;
      }
      function light(x, y) {
        let best = null, bd = 1e9;
        for (const s of SEGS) {
          const mx = (s.x0 + s.x1) / 2, my = (s.y0 + s.y1) / 2;
          const onLine = (s.x0 === s.x1 && Math.abs(s.x0 - x) < 1) || (s.y0 === s.y1 && Math.abs(s.y0 - y) < 1);
          if (!onLine) continue;
          const d = Math.hypot(mx - x, my - y);
          if (d < bd) { bd = d; best = s; }
        }
        if (best) best.f = 14;
      }
      function inBox(x, y, pad) { return x > BX0 - pad && x < BX1 + pad && y > BY0 - pad && y < BY1 + pad; }
      function outside(x, y) { return x < X0 || x > X1 || y < Y0 || y > Y1; }
      // counter-clockwise lane flow around the box
      function flow(x, y) {
        const nx = (x - CX) / (X1 - X0), ny = (y - CY) / (Y1 - Y0);
        let fx, fy, lane;
        if (Math.abs(ny) > Math.abs(nx)) {
          if (ny < 0) { fx = -1; fy = 0; lane = (Y0 + BY0) / 2; fy = (lane - y) * 0.02; }
          else { fx = 1; fy = 0; lane = (Y1 + BY1) / 2; fy = (lane - y) * 0.02; }
        } else {
          if (nx < 0) { fy = 1; lane = (X0 + BX0) / 2; fx = (lane - x) * 0.02; }
          else { fy = -1; lane = (X1 + BX1) / 2; fx = (lane - x) * 0.02; }
        }
        return [fx, fy];
      }

      // ---------- ship ----------
      function killShip() {
        if (!ship || !ship.alive) return;
        ship.alive = false; burst(ship.x, ship.y, '#c8e8ff', 26);
        A.noise(1.2, { freq: 1400, slideTo: 50, vol: 0.45 });
        lives--; respawnT = 150;
      }
      function stepShip() {
        if (!ship) return;
        if (!ship.alive) {
          if (--respawnT <= 0) {
            if (lives <= 0) {
              const over = () => { state = 'over'; overT = 0; ship = null; };
              state = 'hold';
              if (api.offerContinue) api.offerContinue(() => { lives = 3; state = 'play'; respawnT = 1; }, over);
              else over();
              return;
            }
            const sx = CX - 40, sy = (Y1 + BY1) / 2;
            const clear = foes.every(f => Math.hypot(f.x - sx, f.y - sy) > 90) && mines.every(m => Math.hypot(m.x - sx, m.y - sy) > 24);
            if (clear) newShip(); else respawnT = 10;
          }
          return;
        }
        if (ship.inv > 0) ship.inv--;
        if (ship.cool > 0) ship.cool--;
        if (api.key('ArrowLeft')) ship.a -= 0.075;
        if (api.key('ArrowRight')) ship.a += 0.075;
        ship.thrust = api.key('ArrowUp') || api.key('KeyX');
        if (ship.thrust) {
          ship.vx += Math.cos(ship.a) * 0.12; ship.vy += Math.sin(ship.a) * 0.12;
          if (api.frame % 6 === 0) A.noise(0.07, { freq: 320, vol: 0.13 });
        }
        ship.vx *= 0.993; ship.vy *= 0.993;
        const sp = Math.hypot(ship.vx, ship.vy);
        if (sp > 5.5) { ship.vx *= 5.5 / sp; ship.vy *= 5.5 / sp; }
        ship.x += ship.vx; ship.y += ship.vy;
        if (bounceArena(ship, 9, 0.8, true) && sp > 0.6) A.tone(140 + sp * 30, 0.08, { type: 'triangle', vol: 0.18, slideTo: 90 });
        if (api.pressed('Space') && ship.cool <= 0 && shots.length < 6) {
          const c = Math.cos(ship.a), s = Math.sin(ship.a);
          shots.push({ x: ship.x + c * 12, y: ship.y + s * 12, vx: c * 7.5 + ship.vx * 0.3, vy: s * 7.5 + ship.vy * 0.3, t: 70 });
          ship.cool = 5;
          A.tone(1300, 0.07, { type: 'square', vol: 0.1, slideTo: 500 });
        }
      }

      // ---------- foes ----------
      function stepFoes() {
        const target = ship && ship.alive ? ship : null;
        const sp0 = Math.min(2.2, 0.75 + level * 0.12);
        for (const f of foes) {
          f.age++;
          const [fx, fy] = flow(f.x, f.y);
          if (f.kind === 'droid') {
            f.vx += (fx * sp0 - f.vx) * 0.06; f.vy += (fy * sp0 - f.vy) * 0.06;
            f.a += 0.03;
            if (--f.mineT <= 0) {
              f.mineT = rnd(Math.max(140, 420 - level * 30), Math.max(260, 640 - level * 30));
              if (mines.length < 10 + level * 2 && !inBox(f.x, f.y, 14)) {
                mines.push({ kind: 'photon', x: f.x, y: f.y, t: 0 });
                if (state === 'play') A.tone(1800, 0.05, { type: 'sine', vol: 0.06 });
              }
            }
          } else if (f.kind === 'command') {
            const sp = sp0 * 1.6;
            let tx = fx * sp, ty = fy * sp;
            if (target) { const dx = target.x - f.x, dy = target.y - f.y, d = Math.hypot(dx, dy) || 1; tx += dx / d * 0.7; ty += dy / d * 0.7; }
            f.vx += (tx - f.vx) * 0.05; f.vy += (ty - f.vy) * 0.05;
            f.a = Math.atan2(f.vy, f.vx);
            if (target && --f.cool <= 0) {
              f.cool = rnd(Math.max(45, 120 - level * 8), Math.max(90, 200 - level * 10));
              const a = Math.atan2(target.y - f.y, target.x - f.x) + rnd(-0.12, 0.12);
              eshots.push({ x: f.x, y: f.y, vx: Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6, t: 110 });
              if (state === 'play') A.tone(500, 0.1, { type: 'sawtooth', vol: 0.09, slideTo: 200 });
            }
            if (--f.mineT <= 0) {
              f.mineT = rnd(220, 420);
              if (mines.length < 10 + level * 2 && !inBox(f.x, f.y, 16)) mines.push({ kind: 'vapor', x: f.x, y: f.y, t: 0 });
            }
            if (f.age > Math.max(420, 900 - level * 50)) {
              f.kind = 'death'; f.age = 0;
              if (state === 'play') A.tone(200, 0.5, { type: 'sawtooth', vol: 0.14, slideTo: 1200 });
            }
          } else {
            // death ship: spins and hunts the player directly, ricocheting off the walls
            const sp = Math.min(3.6, 2.2 + level * 0.12);
            let tx = fx, ty = fy;
            if (target) { const dx = target.x - f.x, dy = target.y - f.y, d = Math.hypot(dx, dy) || 1; tx = dx / d; ty = dy / d; }
            f.vx += (tx * sp - f.vx) * 0.04; f.vy += (ty * sp - f.vy) * 0.04;
            f.a += 0.25;
          }
          f.x += f.vx; f.y += f.vy;
          bounceArena(f, 9, 1, false);
          if (target && target.inv <= 0 && Math.hypot(target.x - f.x, target.y - f.y) < (f.kind === 'droid' ? 15 : 16)) killShip();
        }
        // promote a droid to a command ship from time to time
        if (--promoteT <= 0) {
          promoteT = rnd(Math.max(150, 420 - level * 25), Math.max(260, 600 - level * 30));
          const droids = foes.filter(f => f.kind === 'droid');
          if (droids.length) {
            const f = droids[(Math.random() * droids.length) | 0];
            f.kind = 'command'; f.age = 0; f.cool = 90; f.mineT = rnd(120, 240);
            if (state === 'play') A.melody([[600, .05], [900, .05], [600, .05], [900, .05]], { type: 'square', vol: .09 });
          }
        }
        // the last droid always promotes, so a wave never stalls
        if (foes.length && foes.every(f => f.kind === 'droid') && foes.length <= 1 && promoteT > 60) promoteT = 60;
        // the droid pack's march hum
        if (state === 'play' && foes.length && --humT <= 0) {
          humT = Math.max(12, 40 - level * 2 - (10 - foes.length) * 2);
          A.tone(foes.some(f => f.kind === 'death') ? 98 : 73, 0.07, { type: 'square', vol: 0.11 });
        }
        for (const m of mines) {
          m.t++;
          if (ship && ship.alive && ship.inv <= 0 && Math.hypot(ship.x - m.x, ship.y - m.y) < (m.kind === 'vapor' ? 12 : 8)) killShip();
        }
      }
      function stepShots() {
        for (let k = shots.length - 1; k >= 0; k--) {
          const s = shots[k];
          s.x += s.vx; s.y += s.vy; s.t--;
          let dead = s.t <= 0 || outside(s.x, s.y) || inBox(s.x, s.y, 0);
          if (!dead) for (let j = foes.length - 1; j >= 0; j--) {
            const f = foes[j];
            if (Math.hypot(f.x - s.x, f.y - s.y) < 11) {
              addScore(PTS[f.kind]); burst(f.x, f.y, COL[f.kind], 14);
              A.noise(0.4, { freq: 2600, slideTo: 200, vol: 0.28 });
              foes.splice(j, 1); dead = true; break;
            }
          }
          if (!dead) for (let j = mines.length - 1; j >= 0; j--) {
            const m = mines[j];
            if (Math.hypot(m.x - s.x, m.y - s.y) < (m.kind === 'vapor' ? 10 : 6)) {
              addScore(PTS[m.kind]); burst(m.x, m.y, COL[m.kind], 6);
              A.tone(900, 0.1, { type: 'square', vol: 0.1, slideTo: 300 });
              mines.splice(j, 1); dead = true; break;
            }
          }
          if (dead) shots.splice(k, 1);
        }
        for (let k = eshots.length - 1; k >= 0; k--) {
          const s = eshots[k];
          s.x += s.vx; s.y += s.vy; s.t--;
          let dead = s.t <= 0 || outside(s.x, s.y) || inBox(s.x, s.y, 0);
          if (!dead && ship && ship.alive && ship.inv <= 0 && Math.hypot(ship.x - s.x, ship.y - s.y) < 8) { killShip(); dead = true; }
          if (dead) eshots.splice(k, 1);
        }
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        for (const s of SEGS) if (s.f > 0) s.f--;
        for (let k = debris.length - 1; k >= 0; k--) { const d = debris[k]; d.x += d.vx; d.y += d.vy; d.vx *= 0.97; d.vy *= 0.97; d.a += d.r; if (--d.t <= 0) debris.splice(k, 1); }
        if (state === 'hold') return;
        if (state === 'over') {
          overT++;
          stepFoes();
          if (overT > 300 || (overT > 90 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (state === 'attract') {
          stepFoes();
          if (foes.length === 0 || stateT % 1800 === 0) { level = 0; spawnWave(); }
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        stepShip();
        if (state !== 'play') return;
        stepFoes(); stepShots();
        if (foes.length === 0) {
          if (waveT === 0) { waveT = 120; mines = []; eshots = []; A.melody([[523, .08], [659, .08], [784, .08], [1047, .2]], { type: 'square', vol: .12 }); }
          if (--waveT <= 0) { waveT = 0; spawnWave(); if (ship && ship.alive) { ship.inv = 60; } }
        }
      }

      // ---------- drawing ----------
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // outer wall: dotted, with segments flashing solid when struck
        ctx.fillStyle = '#5a6a90';
        for (let x = X0; x <= X1; x += 8) { ctx.fillRect(x - 1, Y0 - 1, 2, 2); ctx.fillRect(x - 1, Y1 - 1, 2, 2); }
        for (let y = Y0; y <= Y1; y += 8) { ctx.fillRect(X0 - 1, y - 1, 2, 2); ctx.fillRect(X1 - 1, y - 1, 2, 2); }
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath();
        for (const s of SEGS) if (s.f > 0) { ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); }
        ctx.stroke();
        // central box
        ctx.strokeStyle = '#b8c8ff'; ctx.lineWidth = 1.6; ctx.strokeRect(BX0, BY0, BX1 - BX0, BY1 - BY0);
        ctx.beginPath(); ctx.lineWidth = 1.4;
        if (state === 'attract') {
          vtext(ctx, 'HIGH SCORE', CX, BY0 + 18, 2.2, 'center');
          vtext(ctx, String(hi), CX, BY0 + 40, 3, 'center');
          vtext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), CX, BY1 - 26, 1.8, 'center');
        } else {
          vtext(ctx, 'SCORE', CX - 90, BY0 + 14, 1.8, 'left');
          vtext(ctx, String(score), CX + 90, BY0 + 14, 2.4, 'right');
          vtext(ctx, 'HIGH', CX - 90, BY0 + 42, 1.8, 'left');
          vtext(ctx, String(hi), CX + 90, BY0 + 42, 1.8, 'right');
          vtext(ctx, 'LEVEL ' + level, CX - 90, BY0 + 66, 1.6, 'left');
          for (let i = 0; i < Math.min(lives - (ship && ship.alive ? 1 : 0), 8); i++) poly(ctx, SHIP, CX - 80 + i * 22, BY1 - 20, -Math.PI / 2, 0.8, true);
        }
        ctx.stroke();
        // mines
        for (const m of mines) {
          if (m.kind === 'photon') { ctx.fillStyle = COL.photon; const s = 2 + (((m.t >> 3) & 1) ? 1 : 0); ctx.fillRect(m.x - s / 2, m.y - s / 2, s, s); }
          else { ctx.strokeStyle = COL.vapor; ctx.lineWidth = 1.2; ctx.beginPath(); for (const seg of VAPOR) poly(ctx, seg, m.x, m.y, m.t * 0.05, 0.9, false); ctx.stroke(); }
        }
        // foes
        ctx.lineWidth = 1.5;
        for (const f of foes) {
          ctx.strokeStyle = COL[f.kind]; ctx.beginPath();
          const shape = f.kind === 'droid' ? DROID : f.kind === 'command' ? COMMAND : DEATH;
          for (const seg of shape) poly(ctx, seg, f.x, f.y, f.kind === 'droid' ? 0 : f.a, 1, false);
          ctx.stroke();
        }
        // ship
        if (ship && ship.alive && (ship.inv <= 0 || (api.frame & 4))) {
          ctx.strokeStyle = '#e0f0ff'; ctx.lineWidth = 1.6; ctx.beginPath();
          poly(ctx, SHIP, ship.x, ship.y, ship.a, 1, true);
          if (ship.thrust && (api.frame & 2)) poly(ctx, FLAME, ship.x, ship.y, ship.a, 1, false);
          ctx.stroke();
        }
        ctx.fillStyle = '#ffffff';
        for (const s of shots) ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
        ctx.fillStyle = '#ffd040';
        for (const s of eshots) ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
        ctx.lineWidth = 1.2;
        for (const d of debris) {
          ctx.globalAlpha = Math.min(1, d.t / 25); ctx.strokeStyle = d.c; ctx.beginPath();
          ctx.moveTo(d.x - Math.cos(d.a) * d.l / 2, d.y - Math.sin(d.a) * d.l / 2); ctx.lineTo(d.x + Math.cos(d.a) * d.l / 2, d.y + Math.sin(d.a) * d.l / 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (state === 'attract') {
          const page = Math.floor(stateT / 360) % 2;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.6; ctx.beginPath();
          vtext(ctx, 'OMEGA RACE', CX, 60, 8, 'center'); ctx.stroke();
          ctx.lineWidth = 1.4; ctx.beginPath();
          if (page === 1) {
            vtext(ctx, 'DROID SHIP     1000', CX, 352, 1.8, 'center');
            vtext(ctx, 'COMMAND SHIP   1500', CX, 370, 1.8, 'center');
            vtext(ctx, 'DEATH SHIP     2500', CX, 388, 1.8, 'center');
            vtext(ctx, 'PHOTON MINE     350', CX, 406, 1.8, 'center');
            vtext(ctx, 'VAPOR MINE      500', CX, 424, 1.8, 'center');
          } else {
            vtext(ctx, 'BONUS SHIP AT 40000 AND 150000', CX, 360, 1.8, 'center');
            vtext(ctx, '(C) 1981 MIDWAY', CX, 430, 1.8, 'center');
          }
          ctx.stroke();
          ctx.strokeStyle = '#ff6060'; ctx.lineWidth = 1.8; ctx.beginPath();
          const blink = (stateT >> 5) & 1;
          if (coinFlash > 0) { if ((coinFlash >> 3) & 1) vtext(ctx, 'INSERT COIN', CX, BY0 + 66, 2.4, 'center'); }
          else if (api.credits > 0) { if (blink) vtext(ctx, 'PUSH START', CX, BY0 + 66, 2.4, 'center'); }
          else if (blink) vtext(ctx, 'INSERT COIN', CX, BY0 + 66, 2.4, 'center');
          ctx.stroke();
        }
        if (state === 'play' && msgT > 0) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath();
          vtext(ctx, 'LEVEL ' + level, CX, 60, 3.6, 'center'); ctx.stroke();
        }
        if (state === 'over' || state === 'hold') {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath();
          vtext(ctx, 'GAME OVER', CX, 70, 5, 'center'); ctx.stroke();
        }
      }
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
