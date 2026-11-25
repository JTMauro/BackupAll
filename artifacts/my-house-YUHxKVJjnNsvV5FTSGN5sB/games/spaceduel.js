// Space Duel (Atari, 1982) \u2014 from-scratch colour-vector recreation.
// Spinning geometric shapes, shields, waves; solo play or TEAM play with two ships tethered together.
(function () {
  'use strict';
  const W = 640, H = 480;
  const TAU = Math.PI * 2;

  // ---------- vector font: 4x6 grid ----------
  const VF = {
    A: '0602204246 0343', B: '003041423303 334445360600', C: '40000646', D: '00304244360600',
    E: '40000646 0333', F: '400006 0333', G: '400006464323', H: '0006 4046 0343', I: '0040 2026 0646',
    J: '40460604', K: '0006 400346', L: '000646', M: '0600224046', N: '06004640', O: '0040460600',
    P: '0600404303', Q: '0040460600 2446', R: '0600404303 1346', S: '400003434606', T: '0040 2026',
    U: '00064640', V: '002640', W: '0006244640', X: '0046 4006', Y: '002240 2226', Z: '00400646',
    '0': '0040460600', '1': '2026', '2': '004043030646', '3': '00404606 0343', '4': '000343 4046',
    '5': '400003434606', '6': '0006464303', '7': '004046', '8': '0040460600 0343', '9': '4303004046',
    '-': '0343', '.': '2526', ':': '2122 2425', '!': '2024 2526', '/': '4006', '=': '0242 0444',
    "'": '2022', ',': '2516', '?': '0040432324 2526', '(': '30121436', ')': '10323416', '>': '004306', '<': '400346'
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
        if (st.length === 2) ctx.lineTo(x + (+st[0]) * sc + 0.5, y + (+st[1]) * sc);
      }
      x += adv;
    }
  }

  // ---------- 3D wireframe solids that spin in place ----------
  const CUBE = {
    v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    e: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
  };
  const OCTA = {
    v: [[1.3, 0, 0], [-1.3, 0, 0], [0, 1.3, 0], [0, -1.3, 0], [0, 0, 1.3], [0, 0, -1.3]],
    e: [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]]
  };
  const TETRA = {
    v: [[1.2, 1.2, 1.2], [-1.2, -1.2, 1.2], [-1.2, 1.2, -1.2], [1.2, -1.2, -1.2]],
    e: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]
  };
  // 2D spinners
  const PINWHEEL = [[[0, 0], [1, -0.3], [1, 0.3], [0, 0]], [[0, 0], [-0.3, 1], [0.3, 1], [0, 0]], [[0, 0], [-1, 0.3], [-1, -0.3], [0, 0]], [[0, 0], [0.3, -1], [-0.3, -1], [0, 0]]];
  const STAR = (() => { const p = []; for (let i = 0; i <= 10; i++) { const r = i % 2 ? 0.45 : 1.15, a = -Math.PI / 2 + i * TAU / 10; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return [p]; })();
  const TYPES = [
    { name: 'CUBE', solid: CUBE, col: '#40ff60', pts: [60, 120] },
    { name: 'DIAMOND', solid: OCTA, col: '#40e0ff', pts: [80, 160] },
    { name: 'PYRAMID', solid: TETRA, col: '#ffe040', pts: [70, 140] },
    { name: 'PINWHEEL', flat: PINWHEEL, col: '#ff50ff', pts: [90, 180] },
    { name: 'STAR', flat: STAR, col: '#ff8040', pts: [100, 200] }
  ];
  const SIZE_R = [24, 12];

  const SHIP = [[16, 0], [-10, -9], [-5, 0], [-10, 9]];

  ArcadeRegistry.register({
    id: 'spaceduel', title: 'Space Duel', year: 1982, maker: 'Atari',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up: thrust \u00b7 Space: fire \u00b7 X: shield \u00b7 Up/Down on title: 1P or TEAM \u00b7 Team gunner: A/D aim, W fire (else AI) \u00b7 Enter: start',
    marquee: { bg: '#060010', fg: '#40ff60', accent: '#ff50ff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(10000);
      let state = 'attract', stateT = 0, menu = 0, coinFlash = 0;
      let team = false;
      let shapes = [], bullets = [], eBullets = [], dots = [], debris = [], ufo = null;
      let craft = null;   // the player's craft (one ship, or two tethered)
      let score = 0, lives = 3, wave = 0, nextExtra = 10000, energy = 100;
      let respawnT = 0, waveT = 0, msgT = 0, ufoT = 0, beatT = 0, beatI = 0, p2Idle = 9999;

      function wrap(o) {
        if (o.x < 0) o.x += W; else if (o.x >= W) o.x -= W;
        if (o.y < 0) o.y += H; else if (o.y >= H) o.y -= H;
      }
      function wd(ax, ay, bx, by) {
        let dx = ax - bx, dy = ay - by;
        if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
        return [dx, dy];
      }
      function d2(a, b) { const [dx, dy] = wd(a.x, a.y, b.x, b.y); return dx * dx + dy * dy; }

      function makeShape(type, size, x, y, base) {
        const sp = (size ? rnd(1.2, 2.2) : rnd(0.6, 1.3)) * (1 + Math.min(0.8, wave * 0.06));
        const a = Math.random() * TAU;
        let vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
        if (base) { vx = vx * 0.7 + base.vx * 0.3; vy = vy * 0.7 + base.vy * 0.3; }
        return { type, size, x, y, vx, vy, rx: rnd(0, TAU), ry: rnd(0, TAU), rz: rnd(0, TAU), sx: rnd(0.02, 0.06), sy: rnd(0.02, 0.05), sz: rnd(-0.06, 0.06) };
      }
      function spawnWave() {
        wave++;
        const n = Math.min(12, 3 + wave);
        const kinds = Math.min(TYPES.length, 2 + Math.floor(wave / 2));
        for (let i = 0; i < n; i++) {
          let x, y, tries = 0;
          do { x = rnd(0, W); y = rnd(0, H); tries++; } while (craft && d2({ x, y }, craft) < 160 * 160 && tries < 30);
          shapes.push(makeShape((Math.random() * kinds) | 0, 0, x, y));
        }
        ufoT = Math.max(400, 1100 - wave * 70);
        energy = Math.min(100, energy + 30);
        msgT = 100;
      }

      // ---------- the craft ----------
      const TETHER = 64;
      function newCraft() {
        craft = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, thrust: false, alive: true, inv: 100, gunA: -Math.PI / 2, gunCool: 0, shield: false };
      }
      // positions of each ship of the craft
      function shipsOf(c) {
        if (!team) return [{ x: c.x, y: c.y, a: c.a, id: 0 }];
        const px = Math.cos(c.a + Math.PI / 2) * TETHER / 2, py = Math.sin(c.a + Math.PI / 2) * TETHER / 2;
        return [{ x: c.x - px, y: c.y - py, a: c.a, id: 0 }, { x: c.x + px, y: c.y + py, a: c.gunA, id: 1 }];
      }

      function startGame() {
        team = menu === 1;
        state = 'play'; stateT = 0; score = 0; lives = team ? 4 : 3; wave = 0; nextExtra = 10000; energy = 100;
        shapes = []; bullets = []; eBullets = []; dots = []; debris = []; ufo = null; respawnT = 0; waveT = 0; p2Idle = 9999;
        newCraft(); spawnWave();
        A.melody([[392, 0.07], [523, 0.07], [659, 0.07], [784, 0.16]], { type: 'square', vol: 0.12 });
      }
      function attractInit() {
        state = 'attract'; stateT = 0; craft = null; ufo = null; bullets = []; eBullets = []; shapes = []; wave = 3;
        for (let i = 0; i < 8; i++) shapes.push(makeShape(i % TYPES.length, i % 3 === 2 ? 1 : 0, rnd(0, W), rnd(0, H)));
      }
      attractInit();

      function addScore(n) {
        if (state !== 'play') return;
        score += n;
        if (score >= nextExtra) {
          nextExtra += 10000; lives = Math.min(lives + 1, 9);
          A.melody([[1046, 0.06], [1318, 0.06], [1568, 0.1]], { type: 'square', vol: 0.12 });
        }
      }
      function burst(x, y, n, sp, col) {
        for (let i = 0; i < n && dots.length < 360; i++) {
          const a = Math.random() * TAU, s = rnd(0.3, sp);
          dots.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(25, 55), col });
        }
      }
      function hitShape(i, byPlayer) {
        const s = shapes[i], T = TYPES[s.type];
        shapes.splice(i, 1);
        if (byPlayer) addScore(T.pts[s.size]);
        burst(s.x, s.y, s.size ? 10 : 18, 1.8, T.col);
        A.noise(s.size ? 0.25 : 0.45, { freq: s.size ? 1800 : 900, slideTo: 90, vol: 0.3 });
        A.tone(s.size ? 600 : 300, 0.15, { type: 'square', vol: 0.06, slideTo: 80 });
        if (s.size === 0) for (let k = 0; k < 2; k++) shapes.push(makeShape(s.type, 1, s.x, s.y, s));
      }
      function killCraft() {
        if (!craft || !craft.alive) return;
        craft.alive = false; craft.shield = false;
        for (const sh of shipsOf(craft)) {
          const c = Math.cos(sh.a), s = Math.sin(sh.a);
          for (let k = 0; k < SHIP.length; k++) {
            const p = SHIP[k], q = SHIP[(k + 1) % SHIP.length];
            const ax = p[0] * c - p[1] * s, ay = p[0] * s + p[1] * c, bx = q[0] * c - q[1] * s, by = q[0] * s + q[1] * c;
            debris.push({ x: sh.x + (ax + bx) / 2, y: sh.y + (ay + by) / 2, vx: craft.vx * 0.3 + rnd(-1, 1), vy: craft.vy * 0.3 + rnd(-1, 1), dx: (bx - ax) / 2, dy: (by - ay) / 2, rot: rnd(-0.08, 0.08), t: rnd(80, 130), col: sh.id ? '#ff4040' : '#40ff60' });
          }
          burst(sh.x, sh.y, 18, 1.6, '#ffffff');
        }
        A.noise(1.2, { freq: 900, slideTo: 40, vol: 0.45 });
        A.tone(400, 0.9, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
        lives--; respawnT = 150;
      }
      function gameOver() { state = 'gameover'; stateT = 0; if (score > hi) { hi = score; api.setHiScore(score); } }

      function fire(x, y, a, owner) {
        bullets.push({ x: x + Math.cos(a) * 16, y: y + Math.sin(a) * 16, vx: Math.cos(a) * 8 + craft.vx, vy: Math.sin(a) * 8 + craft.vy, t: 48, owner });
        A.tone(owner ? 900 : 1400, 0.08, { type: 'square', vol: 0.06, slideTo: 250 });
      }

      function updateCraft() {
        if (!craft) return;
        if (!craft.alive) {
          if (respawnT > 0) respawnT--;
          if (respawnT <= 0) {
            if (lives <= 0) {
              respawnT = 1e9;
              if (api.offerContinue) api.offerContinue(() => { lives = team ? 4 : 3; energy = 100; respawnT = 0; }, gameOver);
              else gameOver();
              return;
            }
            const c = { x: W / 2, y: H / 2 };
            if (shapes.every(s => d2(s, c) > 110 * 110) || respawnT < -300) { newCraft(); energy = Math.max(energy, 60); }
            else respawnT--;
          }
          return;
        }
        const c = craft;
        if (c.inv > 0) c.inv--;
        const rot = team ? 0.06 : 0.075;
        if (api.key('ArrowLeft')) c.a -= rot;
        if (api.key('ArrowRight')) c.a += rot;
        c.thrust = api.key('ArrowUp');
        if (c.thrust) {
          c.vx += Math.cos(c.a) * 0.14; c.vy += Math.sin(c.a) * 0.14;
          if (api.frame % 5 === 0) A.noise(0.08, { freq: 340, vol: 0.18 });
        }
        const sp = Math.hypot(c.vx, c.vy);
        if (sp > 5.5) { c.vx *= 5.5 / sp; c.vy *= 5.5 / sp; }
        c.vx *= 0.988; c.vy *= 0.988;
        c.x += c.vx; c.y += c.vy; wrap(c);
        c.shield = (api.key('KeyX') || api.key('ArrowDown')) && energy > 0;
        if (c.shield) { energy = Math.max(0, energy - 0.25); if (api.frame % 6 === 0) A.tone(180 + (api.frame % 12) * 10, 0.08, { type: 'triangle', vol: 0.06 }); }
        const ships = shipsOf(c);
        const mine = bullets.filter(b => b.owner === 0).length;
        if (api.pressed('Space') && mine < 4) fire(ships[0].x, ships[0].y, c.a, 0);
        if (team) {
          // the second (tethered) ship's gun: player 2 on A/D/W, otherwise the computer gunner aims for you
          const p2 = api.key('KeyA') || api.key('KeyD') || api.key('KeyW');
          p2Idle = p2 ? 0 : p2Idle + 1;
          if (c.gunCool > 0) c.gunCool--;
          const theirs = bullets.filter(b => b.owner === 1).length;
          if (p2Idle < 300) {
            if (api.key('KeyA')) c.gunA -= 0.08;
            if (api.key('KeyD')) c.gunA += 0.08;
            if (api.pressed('KeyW') && theirs < 3) fire(ships[1].x, ships[1].y, c.gunA, 1);
          } else {
            let best = null, bd = 1e12;
            const s1 = ships[1];
            for (const s of shapes) { const dd = d2(s, s1); if (dd < bd) { bd = dd; best = s; } }
            if (ufo) { const dd = d2(ufo, s1) * 0.5; if (dd < bd) { bd = dd; best = ufo; } }
            if (best) {
              const [dx, dy] = wd(best.x + best.vx * 10, best.y + best.vy * 10, s1.x, s1.y);
              const want = Math.atan2(dy, dx);
              let diff = want - c.gunA; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
              c.gunA += Math.max(-0.06, Math.min(0.06, diff));
              if (Math.abs(diff) < 0.12 && c.gunCool <= 0 && theirs < 2 && bd < 260 * 260) { fire(s1.x, s1.y, c.gunA, 1); c.gunCool = 26; }
            }
          }
        }
      }

      function updateUfo() {
        if (!ufo) {
          if (state === 'play' && wave >= 2 && craft && craft.alive && shapes.length) {
            if (--ufoT <= 0) {
              const left = Math.random() < 0.5;
              ufo = { x: left ? 0 : W - 1, y: rnd(40, H - 40), vx: left ? 1.6 : -1.6, vy: 0, fireT: 60, t: 0 };
              ufoT = Math.max(500, 1200 - wave * 60) + rnd(0, 300);
            }
          }
          return;
        }
        const u = ufo; u.t++;
        if (craft && craft.alive) {
          // the enemy fighter homes in, then fires
          const [dx, dy] = wd(craft.x, craft.y, u.x, u.y);
          const d = Math.hypot(dx, dy) || 1;
          const sp = 1.6 + Math.min(1.4, wave * 0.1);
          u.vx += (dx / d * sp - u.vx) * 0.02; u.vy += (dy / d * sp - u.vy) * 0.02;
          if (--u.fireT <= 0 && eBullets.length < 3) {
            u.fireT = Math.max(30, 70 - wave * 3);
            const a = Math.atan2(dy, dx) + rnd(-0.25, 0.25);
            eBullets.push({ x: u.x, y: u.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, t: 70 });
            A.tone(700, 0.1, { type: 'sawtooth', vol: 0.06, slideTo: 300 });
          }
        }
        if (u.t % 16 === 0) A.tone(500 + (u.t % 32) * 8, 0.1, { type: 'square', vol: 0.04 });
        u.x += u.vx; u.y += u.vy; wrap(u);
        if (u.t > 1500) ufo = null;
      }
      function killUfo(byPlayer) {
        if (!ufo) return;
        if (byPlayer) addScore(500);
        burst(ufo.x, ufo.y, 24, 2, '#ffffff');
        A.noise(0.6, { freq: 1600, slideTo: 80, vol: 0.4 });
        ufo = null;
      }

      function moveList(list) {
        for (let i = list.length - 1; i >= 0; i--) {
          const b = list[i]; b.x += b.vx; b.y += b.vy; wrap(b);
          if (--b.t <= 0) list.splice(i, 1);
        }
      }

      function collisions() {
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; let hit = false;
          for (let j = shapes.length - 1; j >= 0; j--) {
            const r = SIZE_R[shapes[j].size] + 2;
            if (d2(b, shapes[j]) < r * r) { hitShape(j, true); hit = true; break; }
          }
          if (!hit && ufo && d2(b, ufo) < 15 * 15) { killUfo(true); hit = true; }
          if (hit) bullets.splice(i, 1);
        }
        if (!craft || !craft.alive) return;
        const ships = shipsOf(craft);
        for (let i = eBullets.length - 1; i >= 0; i--) {
          const b = eBullets[i];
          for (const sh of ships) {
            if (d2(b, sh) < (craft.shield ? 20 * 20 : 9 * 9)) {
              eBullets.splice(i, 1);
              if (!craft.shield && !craft.inv) { killCraft(); return; }
              break;
            }
          }
        }
        for (const sh of ships) {
          for (let j = shapes.length - 1; j >= 0; j--) {
            const s = shapes[j];
            const r = SIZE_R[s.size] + (craft.shield ? 18 : 7);
            if (d2(sh, s) < r * r) {
              if (craft.shield) {
                // shield bounces the shape away
                const [dx, dy] = wd(s.x, s.y, sh.x, sh.y); const d = Math.hypot(dx, dy) || 1;
                s.vx = dx / d * 2.5 + craft.vx * 0.5; s.vy = dy / d * 2.5 + craft.vy * 0.5;
                s.x = sh.x + dx / d * (r + 1); s.y = sh.y + dy / d * (r + 1); wrap(s);
                energy = Math.max(0, energy - 4);
                A.tone(260, 0.06, { type: 'square', vol: 0.1, slideTo: 120 });
              } else if (!craft.inv) { hitShape(j, true); killCraft(); return; }
            }
          }
          if (ufo && d2(sh, ufo) < 22 * 22) { killUfo(true); if (!craft.shield && !craft.inv) { killCraft(); return; } }
        }
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        for (const s of shapes) { s.x += s.vx; s.y += s.vy; s.rx += s.sx; s.ry += s.sy; s.rz += s.sz; wrap(s); }
        moveList(bullets); moveList(eBullets);
        for (let i = dots.length - 1; i >= 0; i--) { const d = dots[i]; d.x += d.vx; d.y += d.vy; if (--d.t <= 0) dots.splice(i, 1); }
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i]; d.x += d.vx; d.y += d.vy;
          const c = Math.cos(d.rot), s = Math.sin(d.rot); const nx = d.dx * c - d.dy * s; d.dy = d.dx * s + d.dy * c; d.dx = nx;
          if (--d.t <= 0) debris.splice(i, 1);
        }
        if (state === 'attract') {
          if (api.anyPressed('ArrowUp', 'ArrowDown')) { menu ^= 1; A.tone(660, 0.05, { type: 'square', vol: 0.1 }); }
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 }); }
          }
          return;
        }
        if (state === 'gameover') {
          if (stateT > 220 || (stateT > 60 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (msgT > 0) msgT--;
        updateCraft();
        updateUfo();
        collisions();
        // pulsing background beat that speeds up as the wave thins out
        if (--beatT <= 0) {
          beatT = Math.max(10, 16 + shapes.length * 3);
          beatI = (beatI + 1) % 4;
          A.tone([110, 98, 87, 98][beatI], 0.08, { type: 'triangle', vol: 0.18 });
        }
        if (shapes.length === 0 && !ufo) {
          if (waveT === 0) { waveT = 140; if (craft && craft.alive) { addScore(Math.floor(energy) * 10); } }
          if (--waveT <= 0) { waveT = 0; spawnWave(); }
        }
      }

      // ---------- drawing ----------
      function drawSolid(ctx, s, x, y) {
        const T = TYPES[s.type], R = SIZE_R[s.size];
        if (T.flat) {
          const c = Math.cos(s.rz * 2), sn = Math.sin(s.rz * 2);
          for (const poly of T.flat) poly.forEach((p, i) => {
            const X = x + (p[0] * c - p[1] * sn) * R, Y = y + (p[0] * sn + p[1] * c) * R;
            if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          });
          return;
        }
        const cx = Math.cos(s.rx), sx = Math.sin(s.rx), cy = Math.cos(s.ry), sy = Math.sin(s.ry), cz = Math.cos(s.rz), sz = Math.sin(s.rz);
        const k = R * 0.72;
        const P = T.solid.v.map(([a, b, c]) => {
          let y1 = b * cx - c * sx, z1 = b * sx + c * cx;
          let x2 = a * cy + z1 * sy, z2 = -a * sy + z1 * cy;
          let x3 = x2 * cz - y1 * sz, y3 = x2 * sz + y1 * cz;
          const p = 4 / (4 + z2 * 0.6);
          return [x + x3 * k * p, y + y3 * k * p];
        });
        for (const [i, j] of T.solid.e) { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); }
      }
      function wrapDraw(o, rad, fn) {
        fn(o.x, o.y);
        const xs = [0], ys = [0];
        if (o.x < rad) xs.push(W); if (o.x > W - rad) xs.push(-W);
        if (o.y < rad) ys.push(H); if (o.y > H - rad) ys.push(-H);
        for (const dx of xs) for (const dy of ys) if (dx || dy) fn(o.x + dx, o.y + dy);
      }
      function shipPath(ctx, x, y, a, sc, flame) {
        const c = Math.cos(a), s = Math.sin(a);
        SHIP.forEach((p, i) => { const X = x + (p[0] * c - p[1] * s) * sc, Y = y + (p[0] * s + p[1] * c) * sc; if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); });
        ctx.closePath();
        if (flame) { const L = 10 + Math.random() * 7; ctx.moveTo(x - 7 * c * sc, y - 7 * s * sc); ctx.lineTo(x - L * c * sc, y - L * s * sc); }
      }
      function glowStroke(ctx, col, w) { ctx.strokeStyle = col; ctx.shadowColor = col; ctx.lineWidth = w || 1.4; ctx.stroke(); }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowBlur = 8;
        // shapes, grouped by colour
        for (let t = 0; t < TYPES.length; t++) {
          ctx.beginPath();
          for (const s of shapes) if (s.type === t) wrapDraw(s, 30, (x, y) => drawSolid(ctx, s, x, y));
          glowStroke(ctx, TYPES[t].col);
        }
        if (ufo) {
          ctx.beginPath();
          wrapDraw(ufo, 18, (x, y) => {
            ctx.moveTo(x - 14, y); ctx.lineTo(x, y - 8); ctx.lineTo(x + 14, y); ctx.lineTo(x, y + 8); ctx.closePath();
            ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y);
            const sp = api.frame * 0.2; ctx.moveTo(x + Math.cos(sp) * 6, y + Math.sin(sp) * 3); ctx.lineTo(x - Math.cos(sp) * 6, y - Math.sin(sp) * 3);
          });
          glowStroke(ctx, '#ffffff');
        }
        if (craft && craft.alive && (!craft.inv || (api.frame & 4))) {
          const ships = shipsOf(craft);
          if (team) {
            ctx.beginPath(); ctx.moveTo(ships[0].x, ships[0].y); ctx.lineTo(ships[1].x, ships[1].y);
            ctx.setLineDash && ctx.setLineDash([4, 5]); glowStroke(ctx, '#ffff80', 1); ctx.setLineDash && ctx.setLineDash([]);
          }
          ctx.beginPath(); shipPath(ctx, ships[0].x, ships[0].y, craft.a, 1, craft.thrust && (api.frame & 2)); glowStroke(ctx, '#40ff60', 1.6);
          if (team) {
            ctx.beginPath(); shipPath(ctx, ships[1].x, ships[1].y, craft.a, 1, craft.thrust && (api.frame & 2));
            ctx.moveTo(ships[1].x, ships[1].y); ctx.lineTo(ships[1].x + Math.cos(craft.gunA) * 13, ships[1].y + Math.sin(craft.gunA) * 13);
            glowStroke(ctx, '#ff4040', 1.6);
          }
          if (craft.shield) {
            ctx.beginPath();
            for (const sh of ships) { ctx.moveTo(sh.x + 19, sh.y); ctx.arc(sh.x, sh.y, 19, 0, TAU); }
            ctx.globalAlpha = (api.frame & 2) ? 1 : 0.55; glowStroke(ctx, '#80c0ff', 1.2); ctx.globalAlpha = 1;
          }
        }
        for (const d of debris) { ctx.beginPath(); const f = Math.min(1, d.t / 40); ctx.moveTo(d.x - d.dx * f, d.y - d.dy * f); ctx.lineTo(d.x + d.dx * f, d.y + d.dy * f); glowStroke(ctx, d.col); }
        for (const b of bullets) { ctx.fillStyle = b.owner ? '#ff8080' : '#a0ffa0'; ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3); }
        ctx.fillStyle = '#ffffff';
        for (const b of eBullets) ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
        for (const d of dots) { ctx.fillStyle = d.col; ctx.globalAlpha = Math.min(1, d.t / 25); ctx.fillRect(d.x - 0.9, d.y - 0.9, 1.8, 1.8); }
        ctx.globalAlpha = 1;
        // HUD
        ctx.beginPath(); vtext(ctx, String(score).padStart(2, '0'), 30, 14, 3.4); glowStroke(ctx, '#40ff60', 1.4);
        ctx.beginPath(); vtext(ctx, 'HIGH ' + hi, W / 2, 16, 2.2, 'center'); glowStroke(ctx, '#ffffff', 1.1);
        if (state === 'play') {
          ctx.beginPath();
          for (let i = 0; i < Math.min(lives, 9); i++) shipPath(ctx, 40 + i * 20, 52, -Math.PI / 2, 0.6, false);
          glowStroke(ctx, '#40ff60', 1.1);
          ctx.beginPath(); ctx.rect(W - 160, 16, 120, 8); ctx.moveTo(W - 158, 20); ctx.lineTo(W - 158 + 116 * energy / 100, 20);
          vtext(ctx, 'ENERGY', W - 100, 30, 1.6, 'center');
          glowStroke(ctx, energy < 25 && (api.frame & 8) ? '#ff4040' : '#40e0ff', 1.2);
          ctx.beginPath(); vtext(ctx, 'WAVE ' + wave, W - 100, 44, 1.6, 'center'); glowStroke(ctx, '#ffe040', 1);
        }
        ctx.beginPath();
        if (state === 'attract') {
          const ph = Math.floor(stateT / 420) % 2;
          const prompt = api.credits > 0 ? 'PUSH START' : 'INSERT COIN';
          const blinkOn = coinFlash > 0 ? (coinFlash % 20) < 14 : (stateT % 60) < 40;
          if (ph === 0) {
            vtext(ctx, 'SPACE DUEL', W / 2, 110, 9, 'center'); glowStroke(ctx, '#ff50ff', 2.4); ctx.beginPath();
            vtext(ctx, (menu === 0 ? '> ' : '  ') + '1 PLAYER    ', W / 2, 230, 3.2, 'center');
            vtext(ctx, (menu === 1 ? '> ' : '  ') + 'TEAM PLAY   ', W / 2, 270, 3.2, 'center');
            glowStroke(ctx, '#40e0ff', 1.4); ctx.beginPath();
            vtext(ctx, 'TEAM: TWO SHIPS TETHERED TOGETHER', W / 2, 310, 2, 'center');
            vtext(ctx, 'SECOND GUN: A/D/W OR COMPUTER', W / 2, 330, 2, 'center');
            glowStroke(ctx, '#ffe040', 1); ctx.beginPath();
            if (blinkOn) vtext(ctx, prompt, W / 2, 380, 4, 'center');
          } else {
            vtext(ctx, 'SCORING', W / 2, 70, 4, 'center'); glowStroke(ctx, '#ffffff', 1.4);
            TYPES.forEach((T, i) => {
              const s = { type: i, size: 0, rx: stateT * 0.03, ry: stateT * 0.02, rz: stateT * 0.025 };
              ctx.beginPath(); drawSolid(ctx, s, 200, 140 + i * 50); vtext(ctx, T.name, 250, 133 + i * 50, 2.2);
              vtext(ctx, T.pts[0] + ' / ' + T.pts[1], 470, 133 + i * 50, 2.2, 'right'); glowStroke(ctx, T.col, 1.3);
            });
            ctx.beginPath(); vtext(ctx, 'FIGHTER 500   BONUS SHIP 10000', W / 2, 395, 2.2, 'center'); glowStroke(ctx, '#ffffff', 1.1);
            ctx.beginPath(); if (blinkOn) vtext(ctx, prompt, W / 2, 75 + 340, 2.6, 'center');
          }
          vtext(ctx, 'CREDIT ' + String(Math.min(api.credits, 99)).padStart(2, '0'), W / 2, 440, 2.2, 'center');
          vtext(ctx, '\u00a9 1982 ATARI', W / 2, 460, 2, 'center');
          glowStroke(ctx, '#ffffff', 1.2);
        } else if (state === 'gameover') {
          vtext(ctx, 'GAME OVER', W / 2, 200, 5, 'center'); glowStroke(ctx, '#ff4040', 1.8);
        } else if (msgT > 0) {
          vtext(ctx, 'WAVE ' + wave, W / 2, 190, 5, 'center'); glowStroke(ctx, '#ffe040', 1.8);
        } else if (waveT > 0) {
          vtext(ctx, 'ENERGY BONUS', W / 2, 200, 3.4, 'center'); glowStroke(ctx, '#40e0ff', 1.5);
        }
        ctx.shadowBlur = 0;
      }
      return { update, render };
    }
  });
})();
