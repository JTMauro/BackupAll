// Asteroids Deluxe (Atari, 1981) \u2014 from-scratch vector recreation.
// Shields instead of hyperspace, the Death Star that breaks into homing wanderers, and killer saucers.
(function () {
  'use strict';
  const W = 640, H = 480;
  const TAU = Math.PI * 2;

  // ---------- vector font: 4x6 grid, strokes are runs of "xy" digit pairs ----------
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

  // ---------- shapes ----------
  // Deluxe rocks are chunkier, more faceted than the 1979 ones
  const ROCKS = [
    [[-4, -1], [-3, -3], [-1, -4], [1, -3], [3, -4], [4, -2], [3, 0], [4, 2], [2, 4], [0, 3], [-2, 4], [-4, 2]],
    [[-4, -2], [-2, -4], [1, -4], [2, -3], [4, -3], [4, 0], [3, 1], [4, 3], [1, 4], [-1, 3], [-3, 4], [-4, 1], [-3, 0]],
    [[-3, -4], [0, -3], [3, -4], [4, -1], [3, 1], [4, 3], [2, 4], [-1, 4], [-4, 3], [-3, 0], [-4, -2]],
    [[-4, 0], [-3, -3], [-1, -3], [0, -4], [3, -3], [4, -1], [4, 2], [2, 3], [1, 4], [-2, 4], [-3, 2]]
  ];
  const ROCK_SCALE = [8.5, 4.3, 2.2], ROCK_R = [31, 16, 8], ROCK_PTS = [20, 50, 100];
  const SHIP = [[[12, 0], [-9, -8]], [[12, 0], [-9, 8]], [[-6, -6], [-6, 6]]];
  const FLAME = [[-6, -3], [-14, 0], [-6, 3]];
  const SAUCER = [
    [[-11, 0], [11, 0]], [[-11, 0], [-5, -4], [5, -4], [11, 0], [5, 5], [-5, 5], [-11, 0]],
    [[-5, -4], [-2, -8], [2, -8], [5, -4]]
  ];
  // wanderer triangle (one sixth of the death star), pointing out from the hex centre along +x
  const TRI = [[0, 0], [10, -6], [10, 6]];

  ArcadeRegistry.register({
    id: 'asteroidsdeluxe', title: 'Asteroids Deluxe', year: 1981, maker: 'Atari',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up: thrust \u00b7 Space: fire \u00b7 X: shields \u00b7 Enter: start',
    marquee: { bg: '#020818', fg: '#9fd4ff', accent: '#ffffff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(10000);
      let state = 'attract', stateT = 0;
      let rocks = [], bullets = [], sBullets = [], dots = [], debris = [], saucer = null;
      let stars = [];          // death star parts: {kind:'hex'|'pair'|'tri', x,y,vx,vy,a,spin}
      let ship = null, score = 0, lives = 3, wave = 0, nextExtra = 10000;
      let shield = 0, shieldOn = false, shieldSnd = 0;
      let thumpT = 0, thumpFlip = false, waveTime = 0, saucerTimer = 0, respawnT = 0, waveT = 0, starTimer = 0;
      let msgT = 0, coinFlash = 0;

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
      function dist2(a, b) { const [dx, dy] = wd(a.x, a.y, b.x, b.y); return dx * dx + dy * dy; }

      function makeRock(size, x, y, base) {
        const sp = [rnd(0.6, 1.3), rnd(1.0, 2.0), rnd(1.5, 2.9)][size] * (1 + Math.min(0.5, wave * 0.04));
        const a = Math.random() * TAU;
        let vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
        if (base) { vx = vx * 0.6 + base.vx * 0.4; vy = vy * 0.6 + base.vy * 0.4; }
        return { x, y, vx, vy, size, shape: (Math.random() * 4) | 0, flip: Math.random() < 0.5 ? -1 : 1, a: 0, spin: rnd(-0.02, 0.02) };
      }
      function edgePos() {
        if (Math.random() < 0.5) return [Math.random() < 0.5 ? 0 : W - 1, rnd(0, H)];
        return [rnd(0, W), Math.random() < 0.5 ? 0 : H - 1];
      }
      function spawnWave() {
        wave++;
        const n = Math.min(12, 4 + (wave - 1) * 2);
        for (let i = 0; i < n; i++) { const [x, y] = edgePos(); rocks.push(makeRock(0, x, y)); }
        waveTime = 0; thumpT = 0;
        saucerTimer = Math.max(400, 1100 - wave * 80) + rnd(0, 240);
        starTimer = Math.max(500, 1300 - wave * 70) + rnd(0, 300);
        if (wave > 1) shield = Math.min(100, shield + 25);   // shields recharge a little between waves
      }
      function newShip() {
        ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, thrust: false, alive: true, inv: 90 };
      }
      function startGame() {
        state = 'play'; stateT = 0; score = 0; lives = 3; wave = 0; nextExtra = 10000; shield = 100;
        rocks = []; bullets = []; sBullets = []; dots = []; debris = []; saucer = null; stars = [];
        newShip(); spawnWave(); msgT = 120; respawnT = 0; waveT = 0;
        A.melody([[440, 0.08], [660, 0.08], [880, 0.14]], { type: 'square', vol: 0.12 });
      }
      function attractInit() {
        state = 'attract'; stateT = 0; rocks = []; bullets = []; sBullets = []; saucer = null; ship = null; stars = [];
        for (let i = 0; i < 7; i++) rocks.push(makeRock(i % 3, rnd(0, W), rnd(0, H)));
        stars.push({ kind: 'hex', x: W * 0.7, y: H * 0.3, vx: 0.6, vy: 0.3, a: 0, spin: 0.012 });
      }
      attractInit();

      function addScore(n) {
        if (state !== 'play') return;
        score += n;
        if (score >= nextExtra) {
          nextExtra += 10000; lives = Math.min(lives + 1, 10);
          for (let i = 0; i < 6; i++) A.tone(1046, 0.05, { type: 'square', vol: 0.1, delay: i * 0.11 });
        }
      }
      function burst(x, y, n, sp) {
        for (let i = 0; i < n && dots.length < 300; i++) {
          const a = Math.random() * TAU, s = rnd(0.3, sp);
          dots.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(25, 55) });
        }
      }
      function explodeRock(i, byPlayer) {
        const r = rocks[i];
        rocks.splice(i, 1);
        if (byPlayer) addScore(ROCK_PTS[r.size]);
        burst(r.x, r.y, 10 + (2 - r.size) * 4, 1.6);
        A.noise([0.55, 0.35, 0.22][r.size], { freq: [600, 1000, 1700][r.size], slideTo: 70, vol: 0.32 });
        if (r.size < 2 && rocks.length < 40) {
          // Deluxe: a large rock breaks into three medium chunks at higher waves
          const n = r.size === 0 && wave >= 3 ? 3 : 2;
          for (let k = 0; k < n; k++) rocks.push(makeRock(r.size + 1, r.x, r.y, r));
        }
      }
      // death star parts
      function hitStar(i, byPlayer) {
        const s = stars[i];
        stars.splice(i, 1);
        burst(s.x, s.y, 14, 1.6);
        A.noise(0.4, { freq: 1400, slideTo: 100, vol: 0.32 });
        A.tone(220, 0.25, { type: 'sawtooth', vol: 0.08, slideTo: 60 });
        if (s.kind === 'hex') {
          if (byPlayer) addScore(50);
          for (let k = 0; k < 3; k++) {
            const a = s.a + k * TAU / 3 + Math.PI / 6;
            stars.push({ kind: 'pair', x: s.x + Math.cos(a) * 8, y: s.y + Math.sin(a) * 8, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, a: a, spin: 0.05 });
          }
        } else if (s.kind === 'pair') {
          if (byPlayer) addScore(100);
          for (let k = 0; k < 2; k++) {
            const a = s.a + (k ? 0.6 : -0.6);
            stars.push({ kind: 'tri', x: s.x + Math.cos(a) * 6, y: s.y + Math.sin(a) * 6, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, a: a, spin: 0.09 });
          }
        } else if (byPlayer) addScore(200);
      }
      const STAR_R = { hex: 20, pair: 12, tri: 8 };
      const STAR_SPEED = { hex: 0.9, pair: 1.7, tri: 2.6 };

      function killShip() {
        if (!ship || !ship.alive) return;
        ship.alive = false; shieldOn = false;
        const c = Math.cos(ship.a), s = Math.sin(ship.a);
        for (const seg of SHIP) {
          const p = seg.map(([x, y]) => [x * c - y * s, x * s + y * c]);
          const mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2;
          debris.push({
            x: ship.x + mx, y: ship.y + my, vx: ship.vx * 0.3 + mx * 0.06 + rnd(-0.4, 0.4), vy: ship.vy * 0.3 + my * 0.06 + rnd(-0.4, 0.4),
            dx: (p[1][0] - p[0][0]) / 2, dy: (p[1][1] - p[0][1]) / 2, rot: rnd(-0.06, 0.06), t: rnd(80, 130)
          });
        }
        burst(ship.x, ship.y, 20, 1.5);
        A.noise(1.2, { freq: 1000, slideTo: 50, vol: 0.45 });
        lives--; respawnT = 150;
      }
      function killSaucer(byPlayer) {
        if (!saucer) return;
        if (byPlayer) addScore(saucer.small ? 1000 : 200);
        burst(saucer.x, saucer.y, 22, 1.8);
        A.noise(0.6, { freq: 1500, slideTo: 80, vol: 0.4 });
        saucer = null;
      }

      function gameOver() {
        state = 'gameover'; stateT = 0;
        if (score > hi) { hi = score; api.setHiScore(score); }
      }

      function updateShip() {
        if (!ship) return;
        if (!ship.alive) {
          if (respawnT > 0) respawnT--;
          if (respawnT <= 0) {
            if (lives <= 0) {
              if (api.offerContinue) api.offerContinue(() => { lives = 3; shield = 100; respawnT = 0; msgT = 0; }, gameOver);
              else gameOver();
              respawnT = 1e9;
              return;
            }
            const centre = { x: W / 2, y: H / 2 };
            const clear = rocks.every(r => dist2(r, centre) > 100 * 100) && stars.every(s => dist2(s, centre) > 100 * 100) && !saucer;
            if (clear || respawnT < -400) { newShip(); shield = Math.max(shield, 60); }
            else respawnT--;
          }
          return;
        }
        if (ship.inv > 0) ship.inv--;
        if (api.key('ArrowLeft')) ship.a -= 0.075;
        if (api.key('ArrowRight')) ship.a += 0.075;
        ship.thrust = api.key('ArrowUp');
        if (ship.thrust) {
          ship.vx += Math.cos(ship.a) * 0.15; ship.vy += Math.sin(ship.a) * 0.15;
          if (api.frame % 5 === 0) A.noise(0.09, { freq: 300, vol: 0.2 });
        }
        const sp = Math.hypot(ship.vx, ship.vy);
        if (sp > 6) { ship.vx *= 6 / sp; ship.vy *= 6 / sp; }
        ship.vx *= 0.985; ship.vy *= 0.985;      // Deluxe has noticeably more drag
        ship.x += ship.vx; ship.y += ship.vy; wrap(ship);
        // shields
        shieldOn = (api.key('KeyX') || api.key('KeyZ') || api.key('ArrowDown')) && shield > 0;
        if (shieldOn) {
          shield = Math.max(0, shield - 0.22);
          if (--shieldSnd <= 0) { shieldSnd = 8; A.tone(140 + (api.frame % 16) * 6, 0.12, { type: 'sawtooth', vol: 0.05 }); }
        }
        if (api.pressed('Space') && bullets.length < 4) {
          const c = Math.cos(ship.a), s = Math.sin(ship.a);
          bullets.push({ x: ship.x + c * 12, y: ship.y + s * 12, vx: ship.vx + c * 8, vy: ship.vy + s * 8, t: 50 });
          A.tone(1700, 0.08, { type: 'square', vol: 0.07, slideTo: 300 });
        }
      }

      function updateSaucer() {
        if (!saucer) {
          if (state === 'play' && ship && ship.alive) {
            saucerTimer--;
            if (saucerTimer <= 0 && rocks.length + stars.length > 0) {
              // killer saucers: the small one shows up early and aims well
              const pSmall = score < 2000 ? 0.15 : Math.min(1, 0.35 + score / 30000);
              const small = Math.random() < pSmall;
              const left = Math.random() < 0.5;
              saucer = { small, x: left ? 0 : W - 1, y: rnd(40, H - 40), vx: (left ? 1 : -1) * (small ? 2.5 : 1.7), vy: 0, turnT: 50, fireT: 40, sirT: 0, life: 0 };
              saucerTimer = Math.max(360, 900 - wave * 60) + rnd(0, 300);
            }
          }
          return;
        }
        const s = saucer;
        s.life++;
        s.x += s.vx; s.y += s.vy;
        if (s.y < 0) s.y += H; else if (s.y >= H) s.y -= H;
        if (s.x < -20 || s.x > W + 20) { saucer = null; return; }
        if (--s.turnT <= 0) {
          s.turnT = 40 + rnd(0, 60);
          // killer saucers dodge toward the ship's row
          if (s.small && ship && ship.alive && Math.random() < 0.6) s.vy = Math.sign(wd(ship.x, ship.y, s.x, s.y)[1]) * Math.abs(s.vx) * 0.7;
          else s.vy = [-1, 0, 1][(Math.random() * 3) | 0] * Math.abs(s.vx);
        }
        if (--s.sirT <= 0) { s.sirT = 12; A.tone(s.small ? 1300 : 860, 0.11, { type: 'square', vol: 0.05, slideTo: s.small ? 1700 : 1050 }); }
        if (--s.fireT <= 0 && sBullets.length < 3) {
          s.fireT = s.small ? 34 : 52;
          let a = Math.random() * TAU;
          if (ship && ship.alive && (s.small || Math.random() < 0.3)) {
            const [dx, dy] = wd(ship.x, ship.y, s.x, s.y);
            const err = s.small ? Math.max(0.02, 0.3 - score / 80000) : 0.5;
            a = Math.atan2(dy, dx) + rnd(-err, err);
          }
          sBullets.push({ x: s.x, y: s.y, vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5, t: 60 });
          A.tone(1100, 0.08, { type: 'square', vol: 0.06, slideTo: 400 });
        }
      }

      function updateStars() {
        if (state === 'play' && ship && ship.alive && !stars.length && rocks.length > 0) {
          if (--starTimer <= 0) {
            const [x, y] = edgePos();
            const a = Math.random() * TAU;
            stars.push({ kind: 'hex', x, y, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.9, a: 0, spin: 0.012 });
            starTimer = Math.max(600, 1400 - wave * 60) + rnd(0, 400);
            A.tone(90, 0.5, { type: 'sawtooth', vol: 0.1, slideTo: 180 });
          }
        }
        for (const s of stars) {
          s.a += s.spin;
          if (s.kind !== 'hex' && ship && ship.alive && state === 'play') {
            // homing: steer toward the ship
            const [dx, dy] = wd(ship.x, ship.y, s.x, s.y);
            const d = Math.hypot(dx, dy) || 1, sp = STAR_SPEED[s.kind] * (1 + Math.min(0.6, wave * 0.05));
            const turn = s.kind === 'tri' ? 0.06 : 0.035;
            s.vx += (dx / d * sp - s.vx) * turn; s.vy += (dy / d * sp - s.vy) * turn;
          }
          s.x += s.vx; s.y += s.vy; wrap(s);
        }
      }

      function moveList(list) {
        for (let i = list.length - 1; i >= 0; i--) {
          const b = list[i]; b.x += b.vx; b.y += b.vy; wrap(b);
          if (--b.t <= 0) list.splice(i, 1);
        }
      }

      function bounceOff(o, rad) {
        // shield contact: push the ship and the object apart, exchanging some momentum
        const [dx, dy] = wd(ship.x, ship.y, o.x, o.y);
        const d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
        const overlap = rad - d;
        if (overlap > 0) { ship.x += nx * overlap; ship.y += ny * overlap; wrap(ship); }
        const rel = (ship.vx - o.vx) * nx + (ship.vy - o.vy) * ny;
        if (rel < 0) {
          ship.vx -= rel * nx * 1.2; ship.vy -= rel * ny * 1.2;
          o.vx += rel * nx * 0.4; o.vy += rel * ny * 0.4;
        }
        shield = Math.max(0, shield - 3);
        A.tone(320, 0.06, { type: 'square', vol: 0.12, slideTo: 160 });
      }

      function collisions() {
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; let hit = false;
          for (let j = rocks.length - 1; j >= 0; j--) {
            const r = ROCK_R[rocks[j].size];
            if (dist2(b, rocks[j]) < r * r) { explodeRock(j, true); hit = true; break; }
          }
          if (!hit) for (let j = stars.length - 1; j >= 0; j--) {
            const r = STAR_R[stars[j].kind];
            if (dist2(b, stars[j]) < r * r) { hitStar(j, true); hit = true; break; }
          }
          if (!hit && saucer) {
            const r = saucer.small ? 9 : 16;
            if (dist2(b, saucer) < r * r) { killSaucer(true); hit = true; }
          }
          if (hit) bullets.splice(i, 1);
        }
        for (let i = sBullets.length - 1; i >= 0; i--) {
          const b = sBullets[i]; let hit = false;
          for (let j = rocks.length - 1; j >= 0; j--) {
            const r = ROCK_R[rocks[j].size];
            if (dist2(b, rocks[j]) < r * r) { explodeRock(j, false); hit = true; break; }
          }
          if (!hit && ship && ship.alive && dist2(b, ship) < (shieldOn ? 20 * 20 : 10 * 10)) {
            if (!shieldOn && !ship.inv) killShip();
            hit = true;
          }
          if (hit) sBullets.splice(i, 1);
        }
        if (ship && ship.alive) {
          const sr = shieldOn ? 20 : 8;
          for (let j = rocks.length - 1; j >= 0; j--) {
            const r = ROCK_R[rocks[j].size] + sr;
            if (dist2(ship, rocks[j]) < r * r) {
              if (shieldOn) bounceOff(rocks[j], r);
              else if (!ship.inv) { explodeRock(j, true); killShip(); }
              break;
            }
          }
          for (let j = stars.length - 1; ship.alive && j >= 0; j--) {
            const r = STAR_R[stars[j].kind] + sr;
            if (dist2(ship, stars[j]) < r * r) {
              if (shieldOn) bounceOff(stars[j], r);
              else if (!ship.inv) { hitStar(j, true); killShip(); }
              break;
            }
          }
          if (ship.alive && saucer) {
            const r = (saucer.small ? 9 : 16) + sr;
            if (dist2(ship, saucer) < r * r) { killSaucer(true); if (!shieldOn && !ship.inv) killShip(); }
          }
        }
        if (saucer) {
          for (let j = rocks.length - 1; j >= 0; j--) {
            const r = ROCK_R[rocks[j].size] + (saucer.small ? 7 : 13);
            if (dist2(saucer, rocks[j]) < r * r) { explodeRock(j, false); killSaucer(false); break; }
          }
        }
      }

      function update() {
        stateT++;
        for (const r of rocks) { r.x += r.vx; r.y += r.vy; r.a += r.spin; wrap(r); }
        moveList(bullets); moveList(sBullets);
        for (let i = dots.length - 1; i >= 0; i--) { const d = dots[i]; d.x += d.vx; d.y += d.vy; if (--d.t <= 0) dots.splice(i, 1); }
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i]; d.x += d.vx; d.y += d.vy;
          const c = Math.cos(d.rot), s = Math.sin(d.rot); const nx = d.dx * c - d.dy * s; d.dy = d.dx * s + d.dy * c; d.dx = nx;
          if (--d.t <= 0) debris.splice(i, 1);
        }
        if (coinFlash > 0) coinFlash--;
        if (state === 'attract') {
          updateStars();
          if (rocks.length < 4) rocks.push(makeRock(0, 0, rnd(0, H)));
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
        updateShip();
        updateSaucer();
        updateStars();
        collisions();
        waveTime++;
        if (rocks.length > 0 && ship) {
          const interval = Math.max(12, 58 - Math.floor(waveTime / 80) * 3);
          if (--thumpT <= 0) {
            thumpT = interval; thumpFlip = !thumpFlip;
            A.tone(thumpFlip ? 66 : 58, 0.11, { type: 'square', vol: 0.3 });
          }
        }
        if (rocks.length === 0 && stars.length === 0) {
          if (waveT === 0) waveT = 150;
          if (--waveT <= 0) { waveT = 0; spawnWave(); }
        }
      }

      // ---------- drawing ----------
      function polyAt(ctx, pts, x, y, sc, a, closed, flip) {
        const c = Math.cos(a), s = Math.sin(a);
        for (let i = 0; i < pts.length; i++) {
          const px = pts[i][0] * sc * (flip || 1), py = pts[i][1] * sc;
          const X = x + px * c - py * s, Y = y + px * s + py * c;
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        if (closed) { const px = pts[0][0] * sc * (flip || 1), py = pts[0][1] * sc; ctx.lineTo(x + px * c - py * s, y + px * s + py * c); }
      }
      function wrapDraw(o, rad, fn) {
        fn(o.x, o.y);
        const xs = [0], ys = [0];
        if (o.x < rad) xs.push(W); if (o.x > W - rad) xs.push(-W);
        if (o.y < rad) ys.push(H); if (o.y > H - rad) ys.push(-H);
        for (const dx of xs) for (const dy of ys) if (dx || dy) fn(o.x + dx, o.y + dy);
      }
      function drawShipShape(ctx, x, y, a, sc, flame) {
        for (const seg of SHIP) polyAt(ctx, seg, x, y, sc, a, false);
        if (flame) polyAt(ctx, FLAME, x, y, sc, a, false);
      }
      function drawTri(ctx, x, y, a) { polyAt(ctx, TRI, x, y, 1, a, true); }
      function drawStar(ctx, s, x, y) {
        if (s.kind === 'hex') {
          // six triangles meeting at the centre, forming a hexagon
          for (let k = 0; k < 6; k++) drawTri(ctx, x, y, s.a + k * TAU / 6);
          polyAt(ctx, [[0, 0], [11, 0]], x, y, 1, s.a + TAU / 12, false);
        } else if (s.kind === 'pair') {
          drawTri(ctx, x, y, s.a - TAU / 12); drawTri(ctx, x, y, s.a + TAU / 12);
        } else {
          polyAt(ctx, TRI, x - Math.cos(s.a) * 5, y - Math.sin(s.a) * 5, 1, s.a, true);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowBlur = 8; ctx.shadowColor = '#4aa8ff';
        ctx.strokeStyle = '#a8d8ff'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (const r of rocks) wrapDraw(r, 36, (x, y) => polyAt(ctx, ROCKS[r.shape], x, y, ROCK_SCALE[r.size], r.a, true, r.flip));
        ctx.stroke();
        ctx.strokeStyle = '#d0f0ff'; ctx.beginPath();
        for (const s of stars) wrapDraw(s, 24, (x, y) => drawStar(ctx, s, x, y));
        ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.beginPath();
        if (ship && ship.alive && (!ship.inv || (api.frame & 4))) {
          const fl = ship.thrust && (api.frame & 2);
          wrapDraw(ship, 16, (x, y) => drawShipShape(ctx, x, y, ship.a, 1.1, fl));
        }
        if (saucer) wrapDraw(saucer, 18, (x, y) => { for (const seg of SAUCER) polyAt(ctx, seg, x, y, saucer.small ? 0.8 : 1.5, 0, false); });
        for (const d of debris) { const f = Math.min(1, d.t / 40); ctx.moveTo(d.x - d.dx * f, d.y - d.dy * f); ctx.lineTo(d.x + d.dx * f, d.y + d.dy * f); }
        ctx.stroke();
        if (ship && ship.alive && shieldOn) {
          // the shield: a flickering octagon around the ship
          ctx.strokeStyle = '#7fe0ff'; ctx.globalAlpha = 0.6 + 0.4 * ((api.frame >> 1) & 1); ctx.beginPath();
          const pts = []; for (let k = 0; k < 8; k++) pts.push([Math.cos(k * TAU / 8) * 19, Math.sin(k * TAU / 8) * 19]);
          wrapDraw(ship, 22, (x, y) => polyAt(ctx, pts, x, y, 1, api.frame * 0.05, true));
          ctx.stroke(); ctx.globalAlpha = 1;
        }
        // HUD
        ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 1.5; ctx.beginPath();
        vtext(ctx, score < 10 ? '0' + score : String(score), 150, 16, 4, 'right');
        ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 1.1;
        vtext(ctx, String(hi), W / 2, 18, 2.4, 'center');
        if (state === 'play') {
          for (let i = 0; i < Math.min(lives, 10); i++) drawShipShape(ctx, 82 + i * 15, 54, -Math.PI / 2, 0.7, false);
        }
        ctx.stroke();
        if (state === 'play') {
          // shield energy bar
          ctx.strokeStyle = shield < 25 && (api.frame & 8) ? '#ff8080' : '#7fe0ff';
          ctx.lineWidth = 1.2; ctx.beginPath();
          ctx.rect(W - 170, 20, 120, 8);
          ctx.moveTo(W - 168, 24); ctx.lineTo(W - 168 + 116 * shield / 100, 24);
          vtext(ctx, 'SHIELDS', W - 110, 34, 1.6, 'center');
          ctx.stroke();
        }
        ctx.strokeStyle = '#e8f4ff'; ctx.beginPath(); ctx.lineWidth = 1.4;
        if (state === 'attract') {
          const ph = Math.floor(stateT / 360) % 2;
          const prompt = api.credits > 0 ? 'PUSH START' : 'INSERT COIN';
          const blinkOn = coinFlash > 0 ? (coinFlash % 20) < 14 : (stateT % 60) < 40;
          if (ph === 0) {
            ctx.lineWidth = 2.2;
            vtext(ctx, 'ASTEROIDS', W / 2, 120, 9, 'center');
            vtext(ctx, 'DELUXE', W / 2, 190, 6, 'center');
            ctx.stroke(); ctx.beginPath(); ctx.lineWidth = 1.3;
            if (blinkOn) vtext(ctx, prompt, W / 2, 290, 4, 'center');
            vtext(ctx, 'SHIELDS REPLACE HYPERSPACE', W / 2, 350, 2.4, 'center');
            vtext(ctx, '1 COIN 1 PLAY', W / 2, 400, 3, 'center');
          } else {
            vtext(ctx, 'HIGH SCORE', W / 2, 90, 4, 'center');
            vtext(ctx, String(hi), W / 2, 125, 4, 'center');
            vtext(ctx, 'LARGE 20  MEDIUM 50  SMALL 100', W / 2, 190, 2.5, 'center');
            vtext(ctx, 'DEATH STAR 50  PAIR 100  WANDERER 200', W / 2, 225, 2.5, 'center');
            vtext(ctx, 'SAUCER 200  KILLER SAUCER 1000', W / 2, 260, 2.5, 'center');
            vtext(ctx, 'BONUS SHIP EVERY 10000', W / 2, 295, 2.5, 'center');
            if (blinkOn) vtext(ctx, prompt, W / 2, 350, 4, 'center');
          }
          vtext(ctx, 'CREDIT ' + String(Math.min(api.credits, 99)).padStart(2, '0'), W / 2, 432, 2.4, 'center');
          vtext(ctx, '\u00a9 1981 ATARI', W / 2, 456, 2.2, 'center');
        } else if (state === 'gameover') {
          vtext(ctx, 'GAME OVER', W / 2, 200, 5, 'center');
        } else if (msgT > 0) {
          vtext(ctx, 'PLAYER 1', W / 2, 150, 4, 'center');
        } else if (waveT > 0 && waveT < 140) {
          vtext(ctx, 'WAVE ' + (wave + 1), W / 2, 200, 4, 'center');
        }
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (const b of bullets) ctx.fillRect(b.x - 1.3, b.y - 1.3, 2.6, 2.6);
        ctx.fillStyle = '#ffd0a0';
        for (const b of sBullets) ctx.fillRect(b.x - 1.3, b.y - 1.3, 2.6, 2.6);
        ctx.fillStyle = '#c0e4ff';
        for (const d of dots) { ctx.globalAlpha = Math.min(1, d.t / 25); ctx.fillRect(d.x - 0.8, d.y - 0.8, 1.6, 1.6); }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }
      return { update, render };
    }
  });
})();
