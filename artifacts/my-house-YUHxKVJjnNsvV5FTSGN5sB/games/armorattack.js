// Armor Attack (Cinematronics, 1980) - from-scratch vector recreation.
// Drive an armed jeep through the streets of a walled city. Tanks roll in along the streets from the
// edges, swing their turrets and fire; a helicopter gunship sweeps in over the rooftops now and then.
// Buildings block jeeps, tanks and shells - but not the helicopter.
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
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

  // ---------- city: streets on a grid of lanes, buildings in the blocks ----------
  const LX = [40, 168, 320, 472, 600], LY = [70, 184, 300, 420];
  const SW = 24; // half street width
  const BUILDINGS = [];
  (function buildCity() {
    const P = ['FVHF', 'HQLV', 'FHVF'];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
      const x0 = LX[i] + SW, x1 = LX[i + 1] - SW, y0 = LY[j] + SW, y1 = LY[j + 1] - SW;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, g = 9;
      const add = (a, b, c, d) => BUILDINGS.push({ x0: a, y0: b, x1: c, y1: d });
      switch (P[j][i]) {
        case 'F': add(x0, y0, x1, y1); break;
        case 'V': add(x0, y0, mx - g, y1); add(mx + g, y0, x1, y1); break;
        case 'H': add(x0, y0, x1, my - g); add(x0, my + g, x1, y1); break;
        case 'Q': add(x0, y0, mx - g, my - g); add(mx + g, y0, x1, my - g); add(x0, my + g, mx - g, y1); add(mx + g, my + g, x1, y1); break;
        case 'L': add(x0, y0, mx - g, y1); add(mx - g, my + g, x1, y1); add(mx + g, y0, x1, my - 2 * g); break;
      }
    }
    // the city wall fragments along the top and bottom edge
    BUILDINGS.push({ x0: 64, y0: 30, x1: 144, y1: 46 }, { x0: 344, y0: 30, x1: 448, y1: 46 }, { x0: 192, y0: 444, x1: 296, y1: 462 }, { x0: 496, y0: 444, x1: 576, y1: 462 });
  })();
  const TOP = 24; // HUD band
  function inBuilding(x, y, r) {
    for (const b of BUILDINGS) if (x > b.x0 - r && x < b.x1 + r && y > b.y0 - r && y < b.y1 + r) return b;
    return null;
  }
  // segment vs. any building (Liang-Barsky)
  function segBlocked(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    for (const b of BUILDINGS) {
      let t0 = 0, t1 = 1, ok = true;
      const p = [-dx, dx, -dy, dy], q = [x0 - b.x0, b.x1 - x0, y0 - b.y0, b.y1 - y0];
      for (let k = 0; k < 4; k++) {
        if (p[k] === 0) { if (q[k] < 0) { ok = false; break; } }
        else { const t = q[k] / p[k]; if (p[k] < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; } else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; } }
      }
      if (ok && t0 <= t1) return true;
    }
    return false;
  }

  // ---------- shapes (facing +x) ----------
  const JEEP = [[[9, -5], [9, 5], [-9, 5], [-9, -5], [9, -5]], [[3, -5], [3, 5]], [[-3, -4], [-3, 4]], [[3, 0], [13, 0]],
    [[6, -7], [9, -7]], [[6, 7], [9, 7]], [[-8, -7], [-5, -7]], [[-8, 7], [-5, 7]]];
  const HULL = [[[14, -10], [14, 10], [-14, 10], [-14, -10], [14, -10]], [[14, -7], [-14, -7]], [[14, 7], [-14, 7]],
    [[16, -9], [14, -10]], [[16, 9], [14, 10]]];
  const TURRET = [[[6, -5], [6, 5], [-6, 5], [-6, -5], [6, -5]], [[6, -1.5], [20, -1.5], [20, 1.5], [6, 1.5]]];
  const HELI = [[[10, 0], [4, -5], [-6, -4], [-8, 0], [-6, 4], [4, 5], [10, 0]], [[-8, 0], [-24, 0]], [[-24, -4], [-24, 4]], [[6, -2], [6, 2]]];

  ArcadeRegistry.register({
    id: 'armorattack', title: 'Armor Attack', year: 1980, maker: 'Cinematronics',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up: drive \u00b7 Down: reverse \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#020a04', fg: '#7dff8a', accent: '#ffe36a' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(1500);
      let state = 'attract', T = 0, score = 0, lives = 5, nextBonus = 1000, coinFlash = 0, level = 1, kills = 0;
      let jeep, tanks = [], shots = [], debris = [], heli = null, heliT = 0, spawnT = 0, msg = '', msgT = 0;
      let firePrev = false;

      // ---------- jeep ----------
      function newJeep() { return { x: LX[2], y: LY[3], a: -Math.PI / 2, v: 0, alive: true, respawn: 0, inv: 120, cool: 0, ai: state === 'attract' }; }
      function jeepCtl() {
        if (jeep.ai) return aiCtl();
        const f = api.key('Space') || api.key('KeyX');
        const c = { l: api.key('ArrowLeft'), r: api.key('ArrowRight'), t: api.key('ArrowUp'), b: api.key('ArrowDown'), f: f && !firePrev };
        firePrev = f; return c;
      }
      function aiCtl() {
        const c = { l: false, r: false, t: false, b: false, f: false };
        let best = null, bd = 1e9;
        for (const t of tanks) if (t.alive && t.inField) { const d = Math.hypot(t.x - jeep.x, t.y - jeep.y); if (d < bd) { bd = d; best = t; } }
        if (heli && heli.alive && Math.hypot(heli.x - jeep.x, heli.y - jeep.y) < bd) best = heli;
        if (best) {
          const want = Math.atan2(best.y - jeep.y, best.x - jeep.x), d = angDiff(want, jeep.a);
          if (d > 0.06) c.r = true; else if (d < -0.06) c.l = true;
          if (Math.abs(d) < 0.15 && !segBlocked(jeep.x, jeep.y, best.x, best.y)) c.f = Math.random() < 0.15;
          if (bd > 180 && Math.abs(d) < 0.3 && !inBuilding(jeep.x + Math.cos(jeep.a) * 22, jeep.y + Math.sin(jeep.a) * 22, 8)) c.t = true;
          if (bd < 90) c.b = true;
        }
        return c;
      }
      function stepJeep() {
        if (!jeep.alive) {
          if (--jeep.respawn <= 0) {
            if (state === 'attract') { jeep = newJeep(); return; }
            if (lives > 0) { jeep = newJeep(); shots = shots.filter(s => !s.enemy); }
          }
          return;
        }
        if (jeep.inv > 0) jeep.inv--;
        if (jeep.cool > 0) jeep.cool--;
        const c = jeepCtl();
        if (c.l) jeep.a -= 0.06;
        if (c.r) jeep.a += 0.06;
        if (c.t) jeep.v = Math.min(2.4, jeep.v + 0.09);
        else if (c.b) jeep.v = Math.max(-1.3, jeep.v - 0.09);
        else jeep.v *= 0.92;
        const nx = jeep.x + Math.cos(jeep.a) * jeep.v, ny = jeep.y + Math.sin(jeep.a) * jeep.v;
        let moved = false;
        if (!inBuilding(nx, jeep.y, 8) && nx > 10 && nx < W - 10) { jeep.x = nx; moved = true; }
        if (!inBuilding(jeep.x, ny, 8) && ny > TOP + 10 && ny < H - 10) { jeep.y = ny; moved = true; }
        if (!moved) jeep.v *= 0.5;
        if (state === 'play' && (c.t || c.b) && api.frame % 10 === 0) A.noise(0.08, { freq: 300, vol: 0.06 });
        if (c.f && jeep.cool <= 0 && shots.filter(s => !s.enemy).length < 2) {
          const cs = Math.cos(jeep.a), sn = Math.sin(jeep.a);
          shots.push({ x: jeep.x + cs * 14, y: jeep.y + sn * 14, vx: cs * 7, vy: sn * 7, t: 70, enemy: false });
          jeep.cool = 10;
          if (state === 'play') A.tone(900, 0.08, { type: 'square', vol: 0.1, slideTo: 300 });
        }
      }
      function killJeep() {
        if (!jeep.alive || jeep.inv > 0) return;
        jeep.alive = false; jeep.respawn = 150;
        burst(jeep.x, jeep.y, '#ffffff', 22);
        if (state !== 'play') return;
        A.noise(1.0, { freq: 1500, slideTo: 60, vol: 0.35 });
        A.tone(200, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
        lives--;
        if (lives <= 0) {
          state = 'hold';
          const over = () => { state = 'over'; T = 0; api.setHiScore(score); A.melody([[330, .25], [262, .25], [196, .25], [131, .6]], { type: 'square', vol: .12 }); };
          setTimeout0(() => {
            if (api.offerContinue) api.offerContinue(() => { lives = 3; state = 'play'; jeep = newJeep(); shots = []; }, over);
            else over();
          }, 120);
        }
      }
      // simple frame-based delay
      let pending = null;
      function setTimeout0(f, frames) { pending = { f, t: frames }; }

      // ---------- tanks ----------
      function tankSpeed() { return Math.min(1.25, 0.55 + level * 0.07); }
      function maxTanks() { return Math.min(4, 2 + Math.floor((level - 1) / 2)); }
      function spawnTank() {
        // enter from one of the edges along a lane
        const side = (Math.random() * 4) | 0;
        let x, y, ix, iy;
        if (side === 0) { iy = (Math.random() * LY.length) | 0; ix = 0; x = -30; y = LY[iy]; }
        else if (side === 1) { iy = (Math.random() * LY.length) | 0; ix = LX.length - 1; x = W + 30; y = LY[iy]; }
        else if (side === 2) { ix = 1 + ((Math.random() * 3) | 0); iy = 0; x = LX[ix]; y = TOP - 30; }
        else { ix = 1 + ((Math.random() * 3) | 0); iy = LY.length - 1; x = LX[ix]; y = H + 30; }
        if (jeep && jeep.alive && Math.hypot(LX[ix] - jeep.x, LY[iy] - jeep.y) < 140) return false;
        if (tanks.some(t => t.alive && Math.hypot(t.x - LX[ix], t.y - LY[iy]) < 60)) return false;
        const a = Math.atan2(LY[iy] - y, LX[ix] - x);
        tanks.push({ x, y, a, ta: a, tix: ix, tiy: iy, pix: -1, piy: -1, alive: true, inField: false, wait: 0, fire: rnd(80, 160), hits: 0 });
        return true;
      }
      function chooseNext(t) {
        const opts = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = t.tix + dx, ny = t.tiy + dy;
          if (nx < 0 || ny < 0 || nx >= LX.length || ny >= LY.length) continue;
          if (nx === t.pix && ny === t.piy) continue;
          opts.push([nx, ny]);
        }
        if (!opts.length) opts.push([t.pix, t.piy]);
        let pick = opts[(Math.random() * opts.length) | 0];
        const target = jeep && jeep.alive ? jeep : { x: W / 2, y: H / 2 };
        if (Math.random() < 0.65) {
          let bd = 1e9;
          for (const o of opts) { const d = Math.hypot(LX[o[0]] - target.x, LY[o[1]] - target.y); if (d < bd) { bd = d; pick = o; } }
        }
        t.pix = t.tix; t.piy = t.tiy; t.tix = pick[0]; t.tiy = pick[1];
      }
      function stepTank(t) {
        if (!t.alive) return;
        const tx = LX[t.tix], ty = LY[t.tiy];
        const dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy);
        if (d < 0.8) { t.x = tx; t.y = ty; t.inField = true; chooseNext(t); return; }
        const want = Math.atan2(dy, dx), diff = angDiff(want, t.a);
        if (Math.abs(diff) > 0.03) t.a += Math.sign(diff) * Math.min(Math.abs(diff), 0.035);
        else {
          t.a = want;
          // wait behind another tank instead of driving through it
          let blocked = false;
          for (const o of tanks) if (o !== t && o.alive && Math.hypot(o.x - t.x, o.y - t.y) < 44) {
            const ox = o.x - t.x, oy = o.y - t.y;
            if (ox * Math.cos(t.a) + oy * Math.sin(t.a) > 0) blocked = true;
          }
          if (jeep.alive && Math.hypot(jeep.x - t.x, jeep.y - t.y) < 24) { killJeep(); blocked = true; }
          if (blocked) {
            if (++t.wait > 70) { const px = t.pix, py = t.piy; if (px >= 0) { t.pix = t.tix; t.piy = t.tiy; t.tix = px; t.tiy = py; } t.wait = 0; }
          } else {
            t.wait = 0; const s = Math.min(d, tankSpeed());
            t.x += Math.cos(t.a) * s; t.y += Math.sin(t.a) * s;
          }
        }
        // turret tracks the jeep
        const aim = jeep.alive ? Math.atan2(jeep.y - t.y, jeep.x - t.x) : t.a;
        const td = angDiff(aim, t.ta);
        t.ta += Math.sign(td) * Math.min(Math.abs(td), 0.02 + level * 0.003);
        if (--t.fire <= 0 && t.inField) {
          t.fire = rnd(Math.max(45, 130 - level * 10), Math.max(90, 220 - level * 12));
          if (jeep.alive && Math.abs(td) < 0.12 && !segBlocked(t.x, t.y, jeep.x, jeep.y) && state !== 'hold') {
            const c = Math.cos(t.ta), s = Math.sin(t.ta), sp = Math.min(5, 3.2 + level * 0.18);
            shots.push({ x: t.x + c * 22, y: t.y + s * 22, vx: c * sp, vy: s * sp, t: 160, enemy: true });
            if (state === 'play') { A.noise(0.25, { freq: 600, slideTo: 100, vol: 0.18 }); A.tone(110, 0.2, { type: 'square', vol: 0.08, slideTo: 50 }); }
          }
        }
      }
      function killTank(t) {
        t.alive = false; burst(t.x, t.y, '#ffe36a', 18);
        debris.push({ x: t.x, y: t.y, vx: rnd(-1, 1), vy: rnd(-1, 1), l: 14, rot: 0.15, a: t.ta, t: 50, c: '#ffffff' });
        if (state === 'play') {
          addScore(20); kills++;
          if (kills % 8 === 0) { level++; msg = 'LEVEL ' + level; msgT = 120; }
          A.noise(0.8, { freq: 1800, slideTo: 80, vol: 0.3 });
        }
      }

      // ---------- helicopter ----------
      function spawnHeli() {
        const fromLeft = Math.random() < 0.5;
        heli = { x: fromLeft ? -40 : W + 40, y: rnd(TOP + 60, H - 80), a: fromLeft ? 0 : Math.PI, alive: true, life: 900 + level * 60, fire: 120, rot: 0, ph: rnd(0, 6) };
      }
      function stepHeli() {
        if (!heli) { if (--heliT <= 0 && state !== 'hold') { spawnHeli(); heliT = rnd(1100, 1800) - level * 60; } return; }
        const h = heli; h.rot += 0.5; h.life--;
        let tx, ty;
        if (h.life > 0 && jeep.alive) { tx = jeep.x + Math.cos(T * 0.012 + h.ph) * 140; ty = jeep.y + Math.sin(T * 0.017 + h.ph) * 100; }
        else { tx = h.x < W / 2 ? -100 : W + 100; ty = h.y; }
        const want = Math.atan2(ty - h.y, tx - h.x), d = angDiff(want, h.a);
        h.a += Math.sign(d) * Math.min(Math.abs(d), 0.04);
        const sp = 1.4 + Math.min(1, level * 0.1);
        h.x += Math.cos(h.a) * sp; h.y += Math.sin(h.a) * sp;
        h.y = Math.max(TOP + 16, Math.min(H - 16, h.y));
        if (h.life <= 0 && (h.x < -60 || h.x > W + 60)) { heli = null; return; }
        if (--h.fire <= 0 && jeep.alive && h.x > 0 && h.x < W) {
          h.fire = rnd(70, 140) - level * 3;
          const a = Math.atan2(jeep.y - h.y, jeep.x - h.x), sp2 = 3.6;
          shots.push({ x: h.x, y: h.y, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2, t: 140, enemy: true, air: true });
          if (state === 'play') A.tone(1400, 0.06, { type: 'square', vol: 0.06, slideTo: 600 });
        }
        if (state === 'play' && T % 9 === 0) A.noise(0.05, { freq: 160, vol: 0.07 });
        if (jeep.alive && Math.hypot(h.x - jeep.x, h.y - jeep.y) < 16) killJeep();
      }

      // ---------- shots, debris ----------
      function burst(x, y, col, n) {
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2, v = rnd(0.4, 2.6);
          debris.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: rnd(3, 9), rot: rnd(-0.2, 0.2), a: rnd(0, 6), t: rnd(30, 70), c: col });
        }
      }
      function stepShots() {
        for (let k = shots.length - 1; k >= 0; k--) {
          const s = shots[k];
          s.x += s.vx; s.y += s.vy; s.t--;
          let dead = s.t <= 0 || s.x < -5 || s.x > W + 5 || s.y < TOP || s.y > H + 5;
          if (!dead && !s.air && inBuilding(s.x, s.y, 0)) { dead = true; burst(s.x - s.vx, s.y - s.vy, '#7dff8a', 3); }
          if (!dead && !s.enemy) {
            for (const t of tanks) if (t.alive && Math.hypot(t.x - s.x, t.y - s.y) < 15) { killTank(t); dead = true; break; }
            if (!dead && heli && heli.alive && Math.hypot(heli.x - s.x, heli.y - s.y) < 14) {
              dead = true; burst(heli.x, heli.y, '#ff9a6a', 26); heli = null; heliT = rnd(900, 1500);
              if (state === 'play') { addScore(50); A.noise(1.0, { freq: 2500, slideTo: 60, vol: 0.32 }); msg = 'HELICOPTER 50'; msgT = 80; }
            }
          }
          if (!dead && s.enemy && jeep.alive && Math.hypot(jeep.x - s.x, jeep.y - s.y) < 9) { killJeep(); dead = jeep.inv <= 0 || !jeep.alive; }
          if (dead) shots.splice(k, 1);
        }
      }
      function stepDebris() {
        for (let k = debris.length - 1; k >= 0; k--) { const d = debris[k]; d.x += d.vx; d.y += d.vy; d.vx *= 0.96; d.vy *= 0.96; d.a += d.rot; if (--d.t <= 0) debris.splice(k, 1); }
      }
      function addScore(n) {
        score += n;
        if (score >= nextBonus) { nextBonus += 1000; lives++; msg = 'BONUS JEEP'; msgT = 100; A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .12 }); }
        if (score > hi) hi = score;
      }

      // ---------- flow ----------
      function resetField() { tanks = []; shots = []; debris = []; heli = null; heliT = rnd(900, 1400); spawnT = 60; }
      function attractInit() { state = 'attract'; T = 0; level = 2; resetField(); jeep = newJeep(); jeep.ai = true; }
      function startGame() {
        state = 'play'; T = 0; score = 0; lives = 5; nextBonus = 1000; level = 1; kills = 0;
        resetField(); jeep = newJeep(); jeep.ai = false; firePrev = true; msg = 'READY'; msgT = 100;
        A.melody([[392, .1], [392, .1], [523, .1], [392, .1], [659, .25], [523, .3]], { type: 'square', vol: .12 });
      }
      function tryStart() {
        if (api.useCredit()) startGame();
        else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.2 }); }
      }

      function update() {
        T++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        stepDebris();
        if (pending && --pending.t <= 0) { const f = pending.f; pending = null; f(); }
        if (state === 'over') { if (T > 300 || (T > 90 && api.anyPressed('Enter', 'Space'))) attractInit(); return; }
        if (state === 'attract') {
          if (api.anyPressed('Enter', 'Space')) { tryStart(); return; }
          if (T > 60 * 50) attractInit();
        }
        stepJeep();
        if (--spawnT <= 0) {
          spawnT = 30;
          const live = tanks.filter(t => t.alive).length;
          if (live < maxTanks()) { if (spawnTank()) spawnT = Math.max(60, 200 - level * 15); }
        }
        tanks = tanks.filter(t => t.alive || false);
        for (const t of tanks) stepTank(t);
        stepHeli();
        stepShots();
      }

      // ---------- drawing ----------
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // buildings: green overlay fill with bright outline (the cabinet's colour overlay)
        ctx.fillStyle = 'rgba(40,140,60,0.22)';
        for (const b of BUILDINGS) ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        ctx.strokeStyle = '#5fe07a'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (const b of BUILDINGS) {
          ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
          // roof detail
          if (b.x1 - b.x0 > 40 && b.y1 - b.y0 > 30) { ctx.moveTo(b.x0 + 6, b.y0 + 6); ctx.lineTo(b.x1 - 6, b.y0 + 6); ctx.lineTo(b.x1 - 6, b.y1 - 6); }
        }
        ctx.stroke();
        // street centre dashes
        ctx.strokeStyle = 'rgba(120,140,130,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
        for (const y of LY) for (let x = 8; x < W; x += 28) { if (!inBuilding(x, y, 0) && !inBuilding(x + 10, y, 0)) { ctx.moveTo(x, y); ctx.lineTo(x + 10, y); } }
        for (const x of LX) for (let y = TOP + 8; y < H; y += 28) { if (!inBuilding(x, y, 0) && !inBuilding(x, y + 10, 0)) { ctx.moveTo(x, y); ctx.lineTo(x, y + 10); } }
        ctx.stroke();
        // tanks
        ctx.lineWidth = 1.6;
        for (const t of tanks) {
          if (!t.alive) continue;
          ctx.strokeStyle = '#d8e8ff'; ctx.beginPath();
          for (const seg of HULL) poly(ctx, seg, t.x, t.y, t.a, 1, false);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.beginPath();
          for (const seg of TURRET) poly(ctx, seg, t.x, t.y, t.ta, 1, false);
          ctx.stroke();
        }
        // jeep
        if (jeep.alive && !(jeep.inv > 0 && (T & 4))) {
          ctx.strokeStyle = '#ffe36a'; ctx.lineWidth = 1.7; ctx.beginPath();
          for (const seg of JEEP) poly(ctx, seg, jeep.x, jeep.y, jeep.a, 1, false);
          ctx.stroke();
        }
        // helicopter (above everything)
        if (heli) {
          ctx.strokeStyle = '#ff9a6a'; ctx.lineWidth = 1.7; ctx.beginPath();
          for (const seg of HELI) poly(ctx, seg, heli.x, heli.y, heli.a, 1, false);
          const r = heli.rot;
          ctx.moveTo(heli.x + Math.cos(r) * 18, heli.y + Math.sin(r) * 18); ctx.lineTo(heli.x - Math.cos(r) * 18, heli.y - Math.sin(r) * 18);
          ctx.moveTo(heli.x + Math.cos(r + 1.57) * 18, heli.y + Math.sin(r + 1.57) * 18); ctx.lineTo(heli.x - Math.cos(r + 1.57) * 18, heli.y - Math.sin(r + 1.57) * 18);
          ctx.stroke();
        }
        // shots
        for (const s of shots) { ctx.fillStyle = s.enemy ? '#ff8080' : '#ffffff'; ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); }
        // debris
        ctx.lineWidth = 1.2;
        for (const d of debris) {
          ctx.globalAlpha = Math.min(1, d.t / 25); ctx.strokeStyle = d.c; ctx.beginPath();
          ctx.moveTo(d.x - Math.cos(d.a) * d.l / 2, d.y - Math.sin(d.a) * d.l / 2); ctx.lineTo(d.x + Math.cos(d.a) * d.l / 2, d.y + Math.sin(d.a) * d.l / 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // HUD
        ctx.strokeStyle = '#e8fff0'; ctx.lineWidth = 1.5; ctx.beginPath();
        if (state !== 'attract') {
          vtext(ctx, String(score), 20, 6, 2.4, 'left');
          vtext(ctx, 'HIGH ' + hi, W / 2, 6, 1.8, 'center');
          ctx.stroke();
          ctx.strokeStyle = '#ffe36a'; ctx.beginPath();
          for (let i = 0; i < Math.min(8, lives - (jeep.alive ? 1 : 0)); i++) poly(ctx, JEEP[0], W - 20 - i * 22, 13, -Math.PI / 2, 0.7, false);
          ctx.stroke();
          if (msgT > 0 && state === 'play') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); vtext(ctx, msg, W / 2, 236, 3.4, 'center'); ctx.stroke(); }
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.82)';
          ctx.fillRect(W / 2 - 250, 104, 500, 96); ctx.fillRect(W / 2 - 170, 320, 340, 50); ctx.fillRect(W / 2 - 110, 392, 220, 34);
          ctx.lineWidth = 2.6; ctx.beginPath(); ctx.strokeStyle = '#7dff8a';
          vtext(ctx, 'ARMOR ATTACK', W / 2, 120, 7, 'center'); ctx.stroke();
          ctx.lineWidth = 1.5; ctx.strokeStyle = '#e8fff0'; ctx.beginPath();
          vtext(ctx, 'HIGH SCORE ' + hi, W / 2, 180, 2, 'center');
          vtext(ctx, 'TANK 20   HELICOPTER 50', W / 2, 330, 2, 'center');
          vtext(ctx, 'BONUS JEEP EVERY 1000', W / 2, 352, 2, 'center');
          vtext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 20, H - 16, 1.6, 'left');
          vtext(ctx, '(C) 1980 CINEMATRONICS', W - 20, H - 16, 1.6, 'right');
          ctx.stroke();
          const blink = (T >> 5) & 1;
          ctx.beginPath(); ctx.strokeStyle = '#ffe36a';
          if (coinFlash > 0) { if ((coinFlash >> 3) & 1) vtext(ctx, 'INSERT COIN', W / 2, 400, 3, 'center'); }
          else if (api.credits > 0) { if (blink) vtext(ctx, 'PUSH START', W / 2, 400, 3, 'center'); }
          else if (blink) vtext(ctx, 'INSERT COIN', W / 2, 400, 3, 'center');
          ctx.stroke();
        }
        if (state === 'over' || state === 'hold') {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
          vtext(ctx, 'GAME OVER', W / 2, 200, 5, 'center'); ctx.stroke();
        }
      }
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
