// Star Castle (Cinematronics, 1980) -- vector recreation
// Break through three rotating energy rings and destroy the cannon at the centre, dodging its homing mines
// and the fireball it launches whenever the rings are breached.
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

  const TAU = Math.PI * 2;
  const NSEG = 12, SEG_A = TAU / NSEG;
  const RING_R = [92, 72, 52];
  const RING_COL = ['#ffe23a', '#ff9a2a', '#ff3b3b'];
  const RING_PTS = [10, 20, 30];
  const SHIP = [[12, 0], [-8, -8], [-4, 0], [-8, 8], [12, 0]];
  const CANNON = [[18, 0], [-9, -11], [-4, 0], [-9, 11], [18, 0]];

  ArcadeRegistry.register({
    id: 'starcastle', title: 'Star Castle', year: 1980, maker: 'Cinematronics',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up or X: thrust \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#07020a', fg: '#ffe23a', accent: '#ff3b3b' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const CX = W / 2, CY = H / 2;
      const normA = a => ((a % TAU) + TAU) % TAU;
      const wrapA = a => { a = normA(a + Math.PI); return a - Math.PI; };

      let hi = api.getHiScore(0);
      let state = 'attract', stateT = 0, page = 0;
      let rings = [], ringRot = [0, 0, 0], cannon = { a: 0, fireT: 0, flash: 0 };
      let ship = null, bullets = [], mines = [], fireball = null, debris = [], dots = [];
      let score = 0, lives = 3, level = 1, nextExtra = 10000;
      let respawnT = 0, castleT = 0, flashT = 0, mineT = 0, droneT = 0, msgT = 0;
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      const STARS = [];
      for (let i = 0; i < 70; i++) STARS.push([Math.random() * W, Math.random() * H, Math.random()]);

      function fullRing() { const r = []; for (let i = 0; i < NSEG; i++) r.push(2); return r; }
      function newCastle() {
        rings = [fullRing(), fullRing(), fullRing()];
        cannon.fireT = 120; mines = []; fireball = null; mineT = 90;
      }
      function speeds() {
        const k = 1 + Math.min(1.5, (level - 1) * 0.15);
        return [0.011 * k, -0.015 * k, 0.02 * k];
      }
      function segAt(ri, ang) { return Math.floor(normA(ang - ringRot[ri]) / SEG_A) % NSEG; }
      function newShip() {
        ship = { x: 64, y: CY, vx: 0, vy: 0, a: 0, thrust: false, alive: true, inv: 90 };
      }

      // ---------- flow ----------
      function startGame() {
        state = 'play'; stateT = 0; score = 0; lives = 3; level = 1; nextExtra = 10000;
        bullets = []; debris = []; dots = []; newCastle(); newShip(); msgT = 120;
        A.melody([[330, .1], [392, .1], [494, .1], [659, .25]], { type: 'square', vol: 0.12 });
      }
      function attractInit() {
        state = 'attract'; stateT = 0; page = 0; ship = null; bullets = []; debris = []; newCastle();
      }
      function gameOver() {
        state = 'gameover'; stateT = 0;
        if (score > hi) { hi = score; api.setHiScore(hi); }
      }
      function addScore(n) {
        if (state !== 'play') return;
        score += n;
        while (score >= nextExtra) { nextExtra += 10000; lives++; A.melody([[880, .07], [1175, .07], [1760, .15]], { type: 'square', vol: 0.12 }); }
        if (score > hi) { hi = score; api.setHiScore(hi); }
      }
      function burst(x, y, n, sp, col) {
        for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(0.3, sp); dots.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(20, 50), col }); }
      }
      function killShip() {
        if (!ship || !ship.alive) return;
        ship.alive = false;
        const c = Math.cos(ship.a), s = Math.sin(ship.a);
        for (let i = 0; i < SHIP.length - 1; i++) {
          const a = SHIP[i], b = SHIP[i + 1];
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          debris.push({ x: ship.x + mx * c - my * s, y: ship.y + mx * s + my * c, dx: (b[0] - a[0]) / 2, dy: (b[1] - a[1]) / 2, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), rot: rnd(-0.15, 0.15), t: rnd(60, 100) });
        }
        burst(ship.x, ship.y, 24, 2.5, '#9ff');
        A.noise(1.2, { freq: 1500, slideTo: 60, vol: 0.45 });
        lives--; respawnT = 150;
      }
      function destroyCannon() {
        burst(CX, CY, 80, 5, '#fff');
        for (let r = 0; r < 3; r++) for (let i = 0; i < NSEG; i++) if (rings[r][i]) {
          const a0 = ringRot[r] + i * SEG_A, R = RING_R[r];
          debris.push({ x: CX + Math.cos(a0 + SEG_A / 2) * R, y: CY + Math.sin(a0 + SEG_A / 2) * R, dx: -Math.sin(a0 + SEG_A / 2) * R * 0.25, dy: Math.cos(a0 + SEG_A / 2) * R * 0.25, vx: Math.cos(a0) * rnd(1, 3), vy: Math.sin(a0) * rnd(1, 3), rot: rnd(-0.1, 0.1), t: rnd(60, 110), col: RING_COL[r] });
        }
        rings = [[], [], []]; mines = []; fireball = null;
        flashT = 40; castleT = 200;
        addScore(2000 + (level - 1) * 500);
        A.noise(2.5, { freq: 3000, slideTo: 40, vol: 0.55 });
        A.tone(60, 2.2, { type: 'sawtooth', vol: 0.2, slideTo: 25 });
      }

      // ---------- per-frame logic ----------
      function updateShip() {
        if (!ship) return;
        if (!ship.alive) {
          if (respawnT > 0) respawnT--;
          if (respawnT <= 0) {
            if (lives <= 0) {
              state = 'hold';
              if (api.offerContinue) api.offerContinue(() => { state = 'play'; lives = 3; newShip(); mines = []; fireball = null; }, gameOver);
              else gameOver();
              return;
            }
            mines = []; fireball = null; mineT = 120; newShip();
          }
          return;
        }
        if (ship.inv > 0) ship.inv--;
        if (api.key('ArrowLeft')) ship.a -= 0.075;
        if (api.key('ArrowRight')) ship.a += 0.075;
        ship.thrust = api.key('ArrowUp') || api.key('KeyX');
        if (ship.thrust) {
          ship.vx += Math.cos(ship.a) * 0.14; ship.vy += Math.sin(ship.a) * 0.14;
          if (api.frame % 5 === 0) A.noise(0.08, { freq: 300, vol: 0.14 });
        }
        const sp = Math.hypot(ship.vx, ship.vy);
        if (sp > 5) { ship.vx *= 5 / sp; ship.vy *= 5 / sp; }
        ship.vx *= 0.988; ship.vy *= 0.988;
        ship.x += ship.vx; ship.y += ship.vy;
        if (ship.x < 0) ship.x += W; else if (ship.x >= W) ship.x -= W;
        if (ship.y < 0) ship.y += H; else if (ship.y >= H) ship.y -= H;
        // rings act as a force field: bounce off any live segment
        const dx = ship.x - CX, dy = ship.y - CY, d = Math.hypot(dx, dy) || 1;
        const ang = Math.atan2(dy, dx);
        for (let r = 0; r < 3; r++) {
          const R = RING_R[r];
          if (Math.abs(d - R) < 9 && rings[r][segAt(r, ang)]) {
            const nx = dx / d, ny = dy / d, side = d > R ? 1 : -1;
            const vr = ship.vx * nx + ship.vy * ny;
            if (vr * side < 0) { ship.vx -= 1.8 * vr * nx; ship.vy -= 1.8 * vr * ny; }
            ship.x = CX + nx * (R + side * 9.5); ship.y = CY + ny * (R + side * 9.5);
            A.tone(180, 0.06, { type: 'square', vol: 0.1 });
            break;
          }
        }
        if (Math.hypot(ship.x - CX, ship.y - CY) < 20) killShip();
        if (api.pressed('Space') && bullets.length < 2) {
          const c = Math.cos(ship.a), s = Math.sin(ship.a);
          bullets.push({ x: ship.x + c * 12, y: ship.y + s * 12, vx: ship.vx * 0.5 + c * 7, vy: ship.vy * 0.5 + s * 7, t: 55 });
          A.tone(1300, 0.07, { type: 'square', vol: 0.07, slideTo: 500 });
        }
      }
      function updateBullets() {
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          const r0 = Math.hypot(b.x - CX, b.y - CY);
          b.x += b.vx; b.y += b.vy;
          if (b.x < 0) b.x += W; else if (b.x >= W) b.x -= W;
          if (b.y < 0) b.y += H; else if (b.y >= H) b.y -= H;
          const r1 = Math.hypot(b.x - CX, b.y - CY);
          let hit = false;
          if (castleT <= 0 && Math.abs(r1 - r0) < 20) {
            const ang = Math.atan2(b.y - CY, b.x - CX);
            for (let r = 0; r < 3 && !hit; r++) {
              const R = RING_R[r];
              if ((r0 - R) * (r1 - R) <= 0) {
                const si = segAt(r, ang);
                if (rings[r][si] > 0) {
                  rings[r][si]--; hit = true;
                  if (rings[r][si] === 0) {
                    addScore(RING_PTS[r]);
                    burst(b.x, b.y, 8, 1.5, RING_COL[r]);
                    A.tone(700 + r * 250, 0.1, { type: 'square', vol: 0.12, slideTo: 200 });
                  } else A.tone(400 + r * 150, 0.05, { type: 'triangle', vol: 0.12 });
                }
              }
            }
            if (!hit && r1 < 14) { hit = true; destroyCannon(); }
          }
          if (hit || --b.t <= 0) bullets.splice(i, 1);
        }
        // ring regeneration: lose the whole outer ring and the others move out, a new inner ring forms
        if (castleT <= 0 && rings[0].length && rings[0].every(v => v === 0)) {
          rings = [rings[1], rings[2], fullRing()];
          ringRot = [ringRot[1], ringRot[2], ringRot[0]];
          addScore(100 * level);
          A.melody([[200, .08], [300, .08], [450, .08], [675, .15]], { type: 'sawtooth', vol: 0.1 });
        }
      }
      function clearShot(ang) {
        for (let r = 0; r < 3; r++) for (const off of [-0.07, 0, 0.07]) if (rings[r][segAt(r, ang + off)]) return false;
        return true;
      }
      function updateCannon() {
        if (castleT > 0) return;
        const target = ship && ship.alive ? Math.atan2(ship.y - CY, ship.x - CX) : cannon.a + 0.02;
        const rate = 0.022 + Math.min(0.04, level * 0.004);
        const d = wrapA(target - cannon.a);
        cannon.a = wrapA(cannon.a + Math.max(-rate, Math.min(rate, d)));
        if (cannon.flash > 0) cannon.flash--;
        if (cannon.fireT > 0) cannon.fireT--;
        if (state === 'play' && ship && ship.alive && !fireball && cannon.fireT <= 0 && Math.abs(d) < 0.08 && clearShot(cannon.a)) {
          const sp = 6.5 + Math.min(3, level * 0.35);
          fireball = { x: CX + Math.cos(cannon.a) * 18, y: CY + Math.sin(cannon.a) * 18, vx: Math.cos(cannon.a) * sp, vy: Math.sin(cannon.a) * sp, t: 0 };
          cannon.fireT = Math.max(40, 100 - level * 8); cannon.flash = 12;
          A.noise(0.8, { freq: 900, slideTo: 3000, vol: 0.3 });
          A.tone(110, 0.7, { type: 'sawtooth', vol: 0.14, slideTo: 440 });
        }
        if (fireball) {
          fireball.x += fireball.vx; fireball.y += fireball.vy; fireball.t++;
          if (fireball.x < -30 || fireball.x > W + 30 || fireball.y < -30 || fireball.y > H + 30) fireball = null;
          else if (ship && ship.alive && ship.inv <= 0 && Math.hypot(ship.x - fireball.x, ship.y - fireball.y) < 14) { killShip(); fireball = null; }
        }
      }
      function updateMines() {
        if (castleT > 0) return;
        const maxMines = level < 2 ? 2 : 3;
        if (state === 'play' && ship && ship.alive && mines.length < maxMines && --mineT <= 0) {
          const r = 2, a = ringRot[r] + rnd(0, TAU);
          mines.push({ r: RING_R[r], a, ri: r, orbit: 60 + rnd(0, 90), x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 720 + rnd(0, 300) });
          mineT = Math.max(45, 130 - level * 12);
          A.tone(1600, 0.12, { type: 'square', vol: 0.06, slideTo: 2400 });
        }
        const msp = 1.75 + Math.min(1.6, level * 0.2);
        for (let i = mines.length - 1; i >= 0; i--) {
          const m = mines[i]; m.t++;
          if (m.orbit > 0) {
            // ride round the rings first, working outward
            m.orbit--; m.a += 0.03 * (m.ri === 1 ? -1 : 1);
            if (m.orbit % 40 === 0 && m.ri > 0) { m.ri--; m.r = RING_R[m.ri]; }
            m.x = CX + Math.cos(m.a) * m.r; m.y = CY + Math.sin(m.a) * m.r;
            if (m.orbit === 0) { m.vx = Math.cos(m.a) * msp; m.vy = Math.sin(m.a) * msp; }
          } else if (ship && ship.alive) {
            let dx = ship.x - m.x, dy = ship.y - m.y;
            if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
            if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
            const d = Math.hypot(dx, dy) || 1;
            m.vx += dx / d * 0.07; m.vy += dy / d * 0.07;
            const s = Math.hypot(m.vx, m.vy); if (s > msp) { m.vx *= msp / s; m.vy *= msp / s; }
            m.x += m.vx; m.y += m.vy;
            if (m.x < 0) m.x += W; else if (m.x >= W) m.x -= W;
            if (m.y < 0) m.y += H; else if (m.y >= H) m.y -= H;
            if (ship.inv <= 0 && d < 10) { killShip(); mines.splice(i, 1); continue; }
          } else { m.x += m.vx; m.y += m.vy; }
          if (m.t > m.life) { burst(m.x, m.y, 5, 1, '#fc4'); mines.splice(i, 1); }
        }
      }
      function updateFx() {
        for (let i = dots.length - 1; i >= 0; i--) { const d = dots[i]; d.x += d.vx; d.y += d.vy; d.vx *= 0.98; d.vy *= 0.98; if (--d.t <= 0) dots.splice(i, 1); }
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i]; d.x += d.vx; d.y += d.vy;
          const c = Math.cos(d.rot), s = Math.sin(d.rot), nx = d.dx * c - d.dy * s; d.dy = d.dx * s + d.dy * c; d.dx = nx;
          if (--d.t <= 0) debris.splice(i, 1);
        }
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        if (flashT > 0) flashT--;
        if (msgT > 0) msgT--;
        const sp = speeds();
        for (let r = 0; r < 3; r++) ringRot[r] = normA(ringRot[r] + sp[r]);
        updateFx();
        const cr = api.credits;
        if (state === 'attract') {
          if (lastCredits === 0 && cr > 0) { coinHold = 150; page = 0; stateT = 1; }
          lastCredits = cr;
          if (stateT % 540 === 0) page = (page + 1) % 2;
          cannon.a = wrapA(cannon.a + 0.015);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); return; }
            coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 });
          }
          return;
        }
        lastCredits = cr;
        if (state === 'gameover') {
          if (stateT > 300 || (stateT > 90 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (state === 'hold') return;
        if (castleT > 0) {
          castleT--;
          if (castleT === 0) { level++; newCastle(); msgT = 120; A.melody([[262, .1], [330, .1], [392, .1], [523, .1], [659, .2]], { type: 'square', vol: 0.12 }); }
        }
        updateShip();
        if (state !== 'play') return;
        updateBullets();
        updateCannon();
        updateMines();
        // the castle's drone rises as its rings are broken down
        if (castleT <= 0 && --droneT <= 0) {
          let lost = 0; for (const r of rings) for (const v of r) if (!v) lost++;
          droneT = 26;
          A.tone(55 + lost * 3, 0.24, { type: 'sawtooth', vol: 0.05 });
        }
      }

      // ---------- drawing ----------
      function poly(ctx, pts, x, y, a, sc) {
        const c = Math.cos(a), s = Math.sin(a);
        for (let i = 0; i < pts.length; i++) {
          const X = x + (pts[i][0] * c - pts[i][1] * s) * sc, Y = y + (pts[i][0] * s + pts[i][1] * c) * sc;
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
      }
      function drawRings(ctx) {
        for (let r = 0; r < 3; r++) {
          const R = RING_R[r];
          for (const hp of [2, 1]) {
            ctx.beginPath(); ctx.strokeStyle = RING_COL[r]; ctx.lineWidth = hp === 2 ? 2.2 : 1;
            ctx.globalAlpha = hp === 2 ? 1 : 0.6;
            for (let i = 0; i < NSEG; i++) {
              if (rings[r][i] !== hp) continue;
              const a0 = ringRot[r] + i * SEG_A + 0.03, a1 = ringRot[r] + (i + 1) * SEG_A - 0.03;
              ctx.moveTo(CX + Math.cos(a0) * R, CY + Math.sin(a0) * R);
              ctx.lineTo(CX + Math.cos(a1) * R, CY + Math.sin(a1) * R);
            }
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      function render(ctx) {
        ctx.fillStyle = flashT > 0 && (flashT >> 2) & 1 ? '#3a3020' : '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // backdrop stars
        for (const s of STARS) { ctx.fillStyle = s[2] > 0.8 ? '#8899cc' : '#334466'; ctx.fillRect(s[0], s[1], 1.5, 1.5); }
        ctx.shadowBlur = 7; ctx.shadowColor = '#ffb040';
        if (castleT <= 0 || state === 'attract') {
          drawRings(ctx);
          ctx.beginPath(); ctx.strokeStyle = cannon.flash > 0 ? '#ffff80' : '#ffffff'; ctx.lineWidth = 1.6;
          poly(ctx, CANNON, CX, CY, cannon.a, 1);
          ctx.stroke();
        }
        // mines: crossed sparkle
        ctx.beginPath(); ctx.strokeStyle = '#ffcc40'; ctx.lineWidth = 1.3;
        for (const m of mines) {
          const s = 4 + Math.sin(m.t * 0.4) * 1.5, k = m.t * 0.2;
          for (let j = 0; j < 2; j++) {
            const a = k + j * Math.PI / 2;
            ctx.moveTo(m.x - Math.cos(a) * s, m.y - Math.sin(a) * s); ctx.lineTo(m.x + Math.cos(a) * s, m.y + Math.sin(a) * s);
          }
        }
        ctx.stroke();
        if (fireball) {
          ctx.beginPath(); ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 1.6;
          const r = 8 + Math.sin(fireball.t * 0.6) * 3;
          for (let j = 0; j < 8; j++) {
            const a = j * Math.PI / 4 + fireball.t * 0.3, rr = j % 2 ? r : r * 0.5;
            ctx.moveTo(fireball.x, fireball.y); ctx.lineTo(fireball.x + Math.cos(a) * rr, fireball.y + Math.sin(a) * rr);
          }
          ctx.stroke();
        }
        // ship
        ctx.shadowColor = '#80e0ff';
        if (ship && ship.alive && (ship.inv <= 0 || (ship.inv >> 2) & 1)) {
          ctx.beginPath(); ctx.strokeStyle = '#c8f4ff'; ctx.lineWidth = 1.5;
          poly(ctx, SHIP, ship.x, ship.y, ship.a, 1);
          if (ship.thrust && api.frame & 2) poly(ctx, [[-5, -3], [-13, 0], [-5, 3]], ship.x, ship.y, ship.a, 1);
          ctx.stroke();
        }
        ctx.fillStyle = '#ffffff';
        for (const b of bullets) ctx.fillRect(b.x - 1.4, b.y - 1.4, 2.8, 2.8);
        ctx.beginPath(); ctx.lineWidth = 1.3;
        for (const d of debris) {
          ctx.strokeStyle = d.col || '#c8f4ff';
          ctx.moveTo(d.x - d.dx, d.y - d.dy); ctx.lineTo(d.x + d.dx, d.y + d.dy);
        }
        ctx.stroke();
        for (const d of dots) { ctx.fillStyle = d.col; ctx.globalAlpha = Math.min(1, d.t / 20); ctx.fillRect(d.x - 1, d.y - 1, 2, 2); }
        ctx.globalAlpha = 1;
        // HUD
        ctx.shadowColor = '#ffb040';
        ctx.beginPath(); ctx.strokeStyle = '#ffe23a'; ctx.lineWidth = 1.4;
        vtext(ctx, String(score).padStart(2, '0'), 30, 16, 3.2);
        vtext(ctx, 'HI ' + hi, W - 30, 16, 2.2, 'right');
        if (state === 'play' || state === 'hold') {
          for (let i = 0; i < Math.min(lives - (ship && ship.alive ? 1 : 0), 8); i++) poly(ctx, SHIP, 40 + i * 22, 50, -Math.PI / 2, 0.7);
        }
        ctx.stroke();
        ctx.beginPath(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        if (state === 'attract') {
          const blinkOn = coinHold > 0 || (coinFlash > 0 ? (coinFlash % 20) < 12 : (stateT % 60) < 40);
          const pr = api.credits > 0 ? 'PUSH START' : 'INSERT COIN';
          if (page === 0) {
            ctx.lineWidth = 2.4; vtext(ctx, 'STAR CASTLE', CX, 60, 7, 'center'); ctx.stroke(); ctx.beginPath(); ctx.lineWidth = 1.4;
            if (blinkOn) vtext(ctx, pr, CX, 370, 3.4, 'center');
            vtext(ctx, 'BONUS SHIP EVERY 10000', CX, 410, 2, 'center');
          } else {
            vtext(ctx, 'SCORING', CX, 50, 3.4, 'center');
            vtext(ctx, 'OUTER RING  10', CX, 360, 2.2, 'center');
            vtext(ctx, 'MIDDLE RING 20', CX, 382, 2.2, 'center');
            vtext(ctx, 'INNER RING  30', CX, 404, 2.2, 'center');
            vtext(ctx, 'CANNON    2000+', CX, 426, 2.2, 'center');
          }
          vtext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 24, H - 22, 1.8);
          vtext(ctx, '1980 CINEMATRONICS', W - 24, H - 22, 1.8, 'right');
        } else if (state === 'gameover') {
          vtext(ctx, 'GAME OVER', CX, 140, 5, 'center');
        } else {
          if (msgT > 0) vtext(ctx, 'CASTLE ' + level, CX, 140, 3, 'center');
          if (castleT > 0 && castleT < 170) vtext(ctx, 'CASTLE DESTROYED', CX, 230, 3.4, 'center');
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
