// Asteroids (Atari, 1979) — vector recreation
(function () {
  'use strict';
  const W = 640, H = 480;

  // ---------- Vector font: 4x6 grid, strokes are runs of "xy" digit pairs ----------
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

  // ---------- Shapes (traced in the spirit of the ROM vector tables) ----------
  const ROCKS = [
    [[-4, -2], [-2, -4], [0, -3], [2, -4], [4, -2], [3, 0], [4, 2], [1, 4], [-2, 4], [-4, 2]],
    [[-4, -2], [-2, -4], [0, -2], [2, -4], [4, -2], [2, -1], [4, 1], [2, 4], [-1, 3], [-2, 4], [-4, 2], [-3, 0]],
    [[-4, -2], [-1, -2], [-2, -4], [1, -4], [4, -2], [4, -1], [1, 0], [4, 2], [2, 4], [1, 3], [-2, 4], [-4, 1]],
    [[-4, -1], [-3, -4], [1, -4], [4, -2], [4, 1], [1, 4], [-2, 4], [-1, 1], [-4, 1]]
  ];
  const ROCK_SCALE = [8, 4, 2], ROCK_R = [29, 15, 8], ROCK_PTS = [20, 50, 100];
  // ship facing +x
  const SHIP = [[[11, 0], [-9, -7]], [[11, 0], [-9, 7]], [[-6, -5], [-6, 5]]];
  const FLAME = [[-6, -3], [-13, 0], [-6, 3]];
  const SAUCER = [
    [[-10, 0], [10, 0]], [[-10, 0], [-4, -4], [4, -4], [10, 0], [4, 4], [-4, 4], [-10, 0]],
    [[-4, -4], [-2, -8], [2, -8], [4, -4]]
  ];

  ArcadeRegistry.register({
    id: 'asteroids', title: 'Asteroids', year: 1979, maker: 'Atari',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate · Up: thrust · Space: fire · X: hyperspace · Enter: start',
    marquee: { bg: '#05060f', fg: '#e8f0ff', accent: '#4f7cff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(0);
      let state = 'attract', stateT = 0;
      let rocks = [], bullets = [], sBullets = [], dots = [], debris = [], saucer = null;
      let ship = null, score = 0, lives = 3, wave = 0, nextExtra = 10000;
      let thumpT = 0, thumpFlip = false, waveTime = 0, saucerTimer = 0, respawnT = 0, waveT = 0;
      let msgT = 0;
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;

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
        const sp = [rnd(0.5, 1.2), rnd(0.9, 1.8), rnd(1.3, 2.6)][size];
        const a = Math.random() * Math.PI * 2;
        let vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
        if (base) { vx = vx * 0.6 + base.vx * 0.4; vy = vy * 0.6 + base.vy * 0.4; }
        return { x, y, vx, vy, size, shape: (Math.random() * 4) | 0, flip: Math.random() < 0.5 ? -1 : 1 };
      }
      function spawnWave() {
        wave++;
        const n = Math.min(11, 2 + wave * 2);
        for (let i = 0; i < n; i++) {
          let x, y;
          if (Math.random() < 0.5) { x = Math.random() < 0.5 ? 0 : W - 1; y = rnd(0, H); }
          else { y = Math.random() < 0.5 ? 0 : H - 1; x = rnd(0, W); }
          rocks.push(makeRock(0, x, y));
        }
        waveTime = 0; thumpT = 0;
        saucerTimer = Math.max(420, 1200 - wave * 90) + rnd(0, 240);
      }
      function newShip() {
        ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, thrust: false, hyper: 0, alive: true };
      }
      function startGame() {
        state = 'play'; stateT = 0; score = 0; lives = 3; wave = 0; nextExtra = 10000;
        rocks = []; bullets = []; sBullets = []; dots = []; debris = []; saucer = null;
        newShip(); spawnWave(); msgT = 120; respawnT = 0;
        A.tone(880, 0.08, { type: 'square', vol: 0.12 });
      }
      function attractInit() {
        state = 'attract'; stateT = 0; rocks = []; bullets = []; sBullets = []; saucer = null; ship = null;
        for (let i = 0; i < 7; i++) rocks.push(makeRock(i % 3, rnd(0, W), rnd(0, H)));
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
          const a = Math.random() * Math.PI * 2, s = rnd(0.3, sp);
          dots.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(25, 55) });
        }
      }
      function explodeRock(i, byPlayer) {
        const r = rocks[i];
        rocks.splice(i, 1);
        if (byPlayer) addScore(ROCK_PTS[r.size]);
        burst(r.x, r.y, 10 + (2 - r.size) * 4, 1.6);
        A.noise([0.55, 0.35, 0.22][r.size], { freq: [700, 1100, 1800][r.size], slideTo: 80, vol: 0.35 });
        if (r.size < 2 && rocks.length < 40) {
          rocks.push(makeRock(r.size + 1, r.x, r.y, r));
          rocks.push(makeRock(r.size + 1, r.x, r.y, r));
        }
      }
      function killShip() {
        if (!ship || !ship.alive) return;
        ship.alive = false;
        const c = Math.cos(ship.a), s = Math.sin(ship.a);
        for (const seg of SHIP) {
          const p = seg.map(([x, y]) => [x * c - y * s, x * s + y * c]);
          const mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2;
          debris.push({
            x: ship.x + mx, y: ship.y + my, vx: ship.vx * 0.3 + mx * 0.06 + rnd(-0.4, 0.4), vy: ship.vy * 0.3 + my * 0.06 + rnd(-0.4, 0.4),
            dx: (p[1][0] - p[0][0]) / 2, dy: (p[1][1] - p[0][1]) / 2, rot: rnd(-0.06, 0.06), t: rnd(80, 130)
          });
        }
        burst(ship.x, ship.y, 18, 1.4);
        A.noise(1.1, { freq: 1200, slideTo: 60, vol: 0.45 });
        lives--; respawnT = 150;
      }
      function killSaucer(byPlayer) {
        if (!saucer) return;
        if (byPlayer) addScore(saucer.small ? 1000 : 200);
        burst(saucer.x, saucer.y, 22, 1.8);
        A.noise(0.6, { freq: 1500, slideTo: 80, vol: 0.4 });
        saucer = null;
      }

      function updateShip() {
        if (!ship) return;
        if (!ship.alive) {
          if (respawnT > 0) respawnT--;
          if (respawnT <= 0) {
            if (lives <= 0) {
              const gameOver = () => { state = 'gameover'; stateT = 0; if (score > hi) { hi = score; api.setHiScore(score); } };
              // continue: 3 fresh ships on the same wave, score kept; the normal respawn (wait for a clear centre) follows
              if (api.offerContinue) api.offerContinue(() => { lives = 3; respawnT = 0; msgT = 0; }, gameOver);
              else gameOver();
              return;
            }
            const clear = rocks.every(r => dist2(r, { x: W / 2, y: H / 2 }) > 110 * 110) && !saucer;
            if (clear) newShip();
          }
          return;
        }
        if (ship.hyper > 0) {
          ship.hyper--;
          if (ship.hyper === 0) {
            const bad = Math.random() < 0.08 + Math.min(0.2, rocks.length * 0.006);
            if (bad) killShip();
          }
          return;
        }
        if (api.key('ArrowLeft')) ship.a -= 0.073;
        if (api.key('ArrowRight')) ship.a += 0.073;
        ship.thrust = api.key('ArrowUp');
        if (ship.thrust) {
          ship.vx += Math.cos(ship.a) * 0.13; ship.vy += Math.sin(ship.a) * 0.13;
          if (api.frame % 5 === 0) A.noise(0.09, { freq: 260, vol: 0.22 });
        }
        const sp = Math.hypot(ship.vx, ship.vy);
        if (sp > 6.2) { ship.vx *= 6.2 / sp; ship.vy *= 6.2 / sp; }
        ship.vx *= 0.9915; ship.vy *= 0.9915;
        ship.x += ship.vx; ship.y += ship.vy; wrap(ship);
        if (api.pressed('Space') && bullets.length < 4) {
          const c = Math.cos(ship.a), s = Math.sin(ship.a);
          bullets.push({ x: ship.x + c * 11, y: ship.y + s * 11, vx: ship.vx + c * 7.5, vy: ship.vy + s * 7.5, t: 52 });
          A.tone(1500, 0.09, { type: 'square', vol: 0.07, slideTo: 260 });
        }
        if (api.pressed('KeyX') || api.pressed('KeyZ')) {
          ship.hyper = 40; ship.x = rnd(40, W - 40); ship.y = rnd(40, H - 40); ship.vx = ship.vy = 0;
          A.tone(300, 0.25, { type: 'sawtooth', vol: 0.08, slideTo: 1200 });
        }
      }

      function updateSaucer() {
        if (!saucer) {
          if (state === 'play' && ship) {
            saucerTimer--;
            if (saucerTimer <= 0 && rocks.length > 0) {
              const pSmall = score < 3000 ? 0 : Math.min(1, 0.25 + (score - 3000) / 35000);
              const small = score >= 40000 || Math.random() < pSmall;
              const left = Math.random() < 0.5;
              saucer = { small, x: left ? 0 : W - 1, y: rnd(40, H - 40), vx: (left ? 1 : -1) * (small ? 2.4 : 1.7), vy: 0, turnT: 60, fireT: 40, sirT: 0 };
              saucerTimer = Math.max(360, 900 - wave * 60) + rnd(0, 300);
            }
          }
          return;
        }
        const s = saucer;
        s.x += s.vx; s.y += s.vy;
        if (s.y < 0) s.y += H; else if (s.y >= H) s.y -= H;
        if (s.x < -20 || s.x > W + 20) { saucer = null; return; }
        if (--s.turnT <= 0) { s.turnT = 60 + rnd(0, 60); s.vy = [-1, 0, 1][(Math.random() * 3) | 0] * Math.abs(s.vx); }
        if (--s.sirT <= 0) { s.sirT = 14; A.tone(s.small ? 1250 : 820, 0.13, { type: 'square', vol: 0.05, slideTo: s.small ? 1600 : 1000 }); }
        if (--s.fireT <= 0 && sBullets.length < 2) {
          s.fireT = s.small ? 38 : 55;
          let a = Math.random() * Math.PI * 2;
          if (s.small && ship && ship.alive) {
            const [dx, dy] = wd(ship.x, ship.y, s.x, s.y);
            const err = Math.max(0.03, 0.45 - score / 90000);
            a = Math.atan2(dy, dx) + rnd(-err, err);
          }
          sBullets.push({ x: s.x, y: s.y, vx: Math.cos(a) * 5.5, vy: Math.sin(a) * 5.5, t: 60 });
          A.tone(1100, 0.08, { type: 'square', vol: 0.06, slideTo: 400 });
        }
      }

      function moveList(list) {
        for (let i = list.length - 1; i >= 0; i--) {
          const b = list[i]; b.x += b.vx; b.y += b.vy; wrap(b);
          if (--b.t <= 0) list.splice(i, 1);
        }
      }

      function collisions() {
        // player bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; let hit = false;
          for (let j = rocks.length - 1; j >= 0; j--) {
            const r = ROCK_R[rocks[j].size];
            if (dist2(b, rocks[j]) < r * r) { explodeRock(j, true); hit = true; break; }
          }
          if (!hit && saucer) {
            const r = saucer.small ? 8 : 15;
            if (dist2(b, saucer) < r * r) { killSaucer(true); hit = true; }
          }
          if (hit) bullets.splice(i, 1);
        }
        // saucer bullets
        for (let i = sBullets.length - 1; i >= 0; i--) {
          const b = sBullets[i]; let hit = false;
          for (let j = rocks.length - 1; j >= 0; j--) {
            const r = ROCK_R[rocks[j].size];
            if (dist2(b, rocks[j]) < r * r) { explodeRock(j, false); hit = true; break; }
          }
          if (!hit && ship && ship.alive && !ship.hyper && dist2(b, ship) < 10 * 10) { killShip(); hit = true; }
          if (hit) sBullets.splice(i, 1);
        }
        // ship vs rocks/saucer
        if (ship && ship.alive && !ship.hyper) {
          for (let j = rocks.length - 1; j >= 0; j--) {
            const r = ROCK_R[rocks[j].size] + 7;
            if (dist2(ship, rocks[j]) < r * r) { explodeRock(j, true); killShip(); break; }
          }
          if (ship.alive && saucer) {
            const r = (saucer.small ? 8 : 15) + 7;
            if (dist2(ship, saucer) < r * r) { killSaucer(true); killShip(); }
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
        for (const r of rocks) { r.x += r.vx; r.y += r.vy; wrap(r); }
        moveList(bullets); moveList(sBullets);
        for (let i = dots.length - 1; i >= 0; i--) { const d = dots[i]; d.x += d.vx; d.y += d.vy; if (--d.t <= 0) dots.splice(i, 1); }
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i]; d.x += d.vx; d.y += d.vy;
          const c = Math.cos(d.rot), s = Math.sin(d.rot); const nx = d.dx * c - d.dy * s; d.dy = d.dx * s + d.dy * c; d.dx = nx;
          if (--d.t <= 0) debris.splice(i, 1);
        }
        const cr = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        if (state === 'attract') {
          if (rocks.length < 4) rocks.push(makeRock(0, 0, rnd(0, H)));
          if (lastCredits === 0 && cr > 0) { stateT = 0; coinHold = 150; coinFlash = 0; }   // coin in: jump to the PUSH START page
          lastCredits = cr;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); }
            else { coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 }); A.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 }); }
          }
          return;
        }
        lastCredits = cr;
        if (state === 'gameover') {
          if (stateT > 200 || (stateT > 60 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (msgT > 0) msgT--;
        updateShip();
        if (state !== 'play') return;
        updateSaucer();
        collisions();
        // the heartbeat
        waveTime++;
        if (rocks.length > 0 && ship) {
          const interval = Math.max(14, 62 - Math.floor(waveTime / 90) * 3);
          if (--thumpT <= 0) {
            thumpT = interval; thumpFlip = !thumpFlip;
            A.tone(thumpFlip ? 62 : 55, 0.11, { type: 'square', vol: 0.32 });
            A.tone(thumpFlip ? 124 : 110, 0.07, { type: 'triangle', vol: 0.2 });
          }
        }
        if (rocks.length === 0) {
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
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowBlur = 7; ctx.shadowColor = '#8fb8ff';
        ctx.strokeStyle = '#dfe9ff'; ctx.lineWidth = 1.3;
        // rocks
        ctx.beginPath();
        for (const r of rocks) wrapDraw(r, 34, (x, y) => polyAt(ctx, ROCKS[r.shape], x, y, ROCK_SCALE[r.size], 0, true, r.flip));
        ctx.stroke();
        // ship
        ctx.strokeStyle = '#ffffff'; ctx.beginPath();
        if (ship && ship.alive && !ship.hyper) {
          const fl = ship.thrust && (api.frame & 2);
          wrapDraw(ship, 14, (x, y) => drawShipShape(ctx, x, y, ship.a, 1.15, fl));
        }
        if (saucer) wrapDraw(saucer, 16, (x, y) => { for (const seg of SAUCER) polyAt(ctx, seg, x, y, saucer.small ? 0.75 : 1.5, 0, false); });
        for (const d of debris) { const f = Math.min(1, d.t / 40); ctx.moveTo(d.x - d.dx * f, d.y - d.dy * f); ctx.lineTo(d.x + d.dx * f, d.y + d.dy * f); }
        ctx.stroke();
        // HUD
        ctx.beginPath(); ctx.strokeStyle = '#e8eeff'; ctx.lineWidth = 1.5;
        const sstr = state === 'attract' ? (score ? String(score) : '00') : (score < 10 ? '0' + score : String(score));
        vtext(ctx, sstr, 150, 18, 4, 'right');
        ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 1.1;
        vtext(ctx, hi < 10 ? '0' + hi : String(hi), W / 2, 20, 2.4, 'center');
        if (state === 'play') for (let i = 0; i < Math.min(lives, 10); i++) drawShipShape(ctx, 100 + i * 15 - 30 + 12, 58, -Math.PI / 2, 0.7, false);
        ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 1.4;
        if (state === 'attract') {
          const ph = Math.floor(stateT / 300) % 2;
          const cr = api.credits;
          const prompt = cr > 0 ? 'PUSH START' : 'INSERT COIN';
          const blinkOn = coinHold > 0 || (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : (stateT % 60) < 40);
          if (ph === 0) {
            ctx.lineWidth = 2.2; vtext(ctx, 'ASTEROIDS', W / 2, 150, 9, 'center'); ctx.stroke(); ctx.beginPath(); ctx.lineWidth = 1.3;
            if (blinkOn) vtext(ctx, prompt, W / 2, 270, 4, 'center');
            vtext(ctx, '1 COIN 1 PLAY', W / 2, 400, 3, 'center');
          } else {
            vtext(ctx, 'HIGH SCORES', W / 2, 120, 4, 'center');
            vtext(ctx, ' 1.  ' + String(hi).padStart(5, ' ') + ' AAA', W / 2, 170, 3, 'center');
            vtext(ctx, 'LARGE ROCK  20   MEDIUM  50', W / 2, 230, 2.5, 'center');
            vtext(ctx, 'SMALL ROCK 100   SAUCER 200/1000', W / 2, 260, 2.5, 'center');
            vtext(ctx, 'BONUS SHIP EVERY 10000', W / 2, 300, 2.5, 'center');
            if (blinkOn) vtext(ctx, prompt, W / 2, 360, 4, 'center');
          }
          if (cr > 0) vtext(ctx, 'CREDITS ' + Math.min(cr, 99), W / 2, 430, 2.4, 'center');
          vtext(ctx, '1979', W / 2, 455, 2.2, 'center');
        } else if (state === 'gameover') {
          vtext(ctx, 'GAME OVER', W / 2, 200, 5, 'center');
        } else if (msgT > 0) {
          vtext(ctx, 'PLAYER 1', W / 2, 150, 4, 'center');
        }
        ctx.stroke();
        // bullets & dots
        ctx.fillStyle = '#ffffff';
        for (const b of bullets) ctx.fillRect(b.x - 1.2, b.y - 1.2, 2.4, 2.4);
        for (const b of sBullets) ctx.fillRect(b.x - 1.2, b.y - 1.2, 2.4, 2.4);
        for (const d of dots) { ctx.globalAlpha = Math.min(1, d.t / 25); ctx.fillRect(d.x - 0.8, d.y - 0.8, 1.6, 1.6); }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }
      return { update, render };
    }
  });
})();
