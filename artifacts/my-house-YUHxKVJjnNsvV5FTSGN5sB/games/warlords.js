// Warlords (Atari, 1980) - from-scratch recreation: four castles, shields that catch the fireball, last warlord standing.
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

  // ---------- Warlords ----------
  const W = 320, H = 240;
  const CELL = 8, N = 10;             // castle grid: N x N cells of CELL px from each corner
  const RIN = 5.6, ROUT = 8.7;        // brick ring (in cells, measured from the corner)
  const KING_R = 28;                  // fireball this close to a corner kills the warlord
  const RS = 78;                      // radius of the shield track
  const SHALF = 0.15;                 // shield half-width (radians)
  const PHI_MIN = 0.1, PHI_MAX = Math.PI / 2 - 0.1;
  const BR = 2.5;                     // fireball radius
  const COLORS = ['#ff4848', '#48e060', '#48a8ff', '#ffd040'];
  const DARK = ['#7a1c1c', '#1c6a2a', '#1c4a80', '#806010'];
  const NAMES = ['RED', 'GREEN', 'BLUE', 'GOLD'];
  const CORNERS = [
    { ox: 0, oy: 0, sx: 1, sy: 1 }, { ox: W, oy: 0, sx: -1, sy: 1 },
    { ox: 0, oy: H, sx: 1, sy: -1 }, { ox: W, oy: H, sx: -1, sy: -1 }
  ];
  const PLAYER = 2;                   // the human defends the lower-left castle

  // 12x10 dragon frames ('.' clear, 'k' body, 'r' wing, 'y' eye/fire)
  const DRAGON = [[
    'r..........r',
    'rr........rr',
    'rrr.kkkk.rrr',
    '.rrkkkkkkrr.',
    '..kkykkykk..',
    '...kkkkkk...',
    '....kyyk....',
    '....kkkk....',
    '.....kk.....',
    '.....k......'
  ], [
    '............',
    '............',
    '....kkkk....',
    'rrrkkkkkkrrr',
    'rrkkykkykkrr',
    'r..kkkkkk..r',
    '....kyyk....',
    '....kkkk....',
    '.....kk.....',
    '......k.....'
  ]];
  const KING = [
    '.y.y.y.',
    '.yyyyy.',
    '..sss..',
    '..s.s..',
    '.ccccc.',
    'ccccccc',
    '.ccccc.',
    '.c...c.'
  ];

  ArcadeRegistry.register({
    id: 'warlords', title: 'Warlords', year: 1980, maker: 'Atari',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Mouse or Left/Right (Up/Down): move shield \u00b7 Hold Space/X/Click: catch fireball, release to throw \u00b7 Enter: start',
    marquee: { bg: '#10081a', fg: '#ff9a20', accent: '#48a8ff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(5000);
      let state = 'attract';      // attract | dragon | play | roundend | over
      let demo = true, stateT = 0, attractT = 0;
      let castles = [], ball = null, dragon = null, parts = [];
      let score = 0, lives = 3, round = 1, roundT = 0, nextBonus = 10000, winner = -1, endMsg = '';
      let coinFlash = 0, lastMX = api.mouse.x, lastMY = api.mouse.y, mouseActive = false;

      // ---------- geometry helpers ----------
      function toLocal(k, x, y) { const c = CORNERS[k]; return [(x - c.ox) * c.sx, (y - c.oy) * c.sy]; }
      function toGlobal(k, lx, ly) { const c = CORNERS[k]; return [c.ox + lx * c.sx, c.oy + ly * c.sy]; }
      function shieldPos(k, phi, r) { return toGlobal(k, Math.cos(phi) * (r || RS), Math.sin(phi) * (r || RS)); }

      function buildCastle(k) {
        const b = [];
        for (let i = 0; i < N; i++) {
          b.push([]);
          for (let j = 0; j < N; j++) {
            const d = Math.hypot(i + 0.5, j + 0.5);
            b[i].push(d >= RIN && d <= ROUT ? 1 : 0);
          }
        }
        return {
          k, b, alive: true, phi: Math.PI / 4, aiErr: 0, aiSpeed: 0.03, hold: 0, deadT: 0,
          catchChance: 0.15, cpu: k !== PLAYER || demo
        };
      }
      function brickCount(c) { let n = 0; for (const col of c.b) for (const v of col) n += v; return n; }
      function brickAt(x, y) {
        for (const c of castles) {
          const [lx, ly] = toLocal(c.k, x, y);
          if (lx < 0 || ly < 0) continue;
          const i = Math.floor(lx / CELL), j = Math.floor(ly / CELL);
          if (i < N && j < N && c.b[i][j]) return [c, i, j];
        }
        return null;
      }
      function aliveList() { return castles.filter(c => c.alive); }

      // ---------- sounds ----------
      const snd = {
        brick() { A.noise(0.06, { vol: 0.16, freq: 900 }); A.tone(140, 0.05, { type: 'square', vol: 0.08 }); },
        shield() { A.tone(620, 0.05, { type: 'square', vol: 0.14 }); },
        wall() { A.tone(200, 0.03, { type: 'triangle', vol: 0.1 }); },
        catchIt() { A.tone(900, 0.06, { type: 'sine', vol: 0.12, slideTo: 1200 }); },
        throwIt() { A.tone(400, 0.12, { type: 'sawtooth', vol: 0.12, slideTo: 1200 }); },
        king() { A.noise(0.8, { vol: 0.28, freq: 1800, slideTo: 80 }); A.tone(300, 0.7, { type: 'square', vol: 0.12, slideTo: 40 }); },
        dragon() { A.tone(90, 0.5, { type: 'sawtooth', vol: 0.13, slideTo: 300 }); A.noise(0.5, { vol: 0.15, freq: 600, slideTo: 3000 }); },
        win() { A.melody([[392, .12], [523, .12], [659, .12], [784, .12], [659, .1], [784, .35]], { type: 'square', vol: 0.15 }); },
        lose() { A.melody([[392, .25], [370, .25], [349, .25], [294, .6]], { type: 'triangle', vol: 0.18 }); },
        bonus() { A.melody([[880, .08], [1175, .08], [1760, .2]], { type: 'square', vol: 0.14 }); }
      };

      // ---------- flow ----------
      function newRound() {
        castles = [];
        for (let k = 0; k < 4; k++) {
          const c = buildCastle(k);
          const lvl = demo ? 2 : round;
          c.aiSpeed = Math.min(0.075, 0.03 + lvl * 0.006);
          c.errAmt = Math.max(0.3, 0.75 - lvl * 0.06);
          c.react = 120 + lvl * 18;
          c.catchChance = Math.min(0.5, 0.12 + lvl * 0.05);
          castles.push(c);
        }
        ball = null; parts = []; roundT = 0; winner = -1;
        dragon = { x: W / 2, y: H / 2, t: 0, fade: 0, vx: 0, vy: 0 };
        state = 'dragon'; stateT = 0;
        snd.dragon();
      }
      function startGame(isDemo) {
        demo = isDemo; score = 0; lives = 3; round = 1; nextBonus = 10000;
        newRound();
      }
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score > hi) hi = score;
        if (score >= nextBonus) { nextBonus += 10000; lives++; snd.bonus(); }
      }
      function ballSpeed() { return Math.min(4, 1.8 + (demo ? 2 : round) * 0.14 + roundT / 60 * 0.03); }
      function launchFromDragon() {
        const targets = aliveList();
        const t = targets[Math.floor(Math.random() * targets.length)];
        const [tx, ty] = toGlobal(t.k, 30, 30);
        let a = Math.atan2(ty - dragon.y, tx - dragon.x) + rnd(-0.35, 0.35);
        const s = ballSpeed();
        ball = { x: dragon.x, y: dragon.y + 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, owner: -1, held: -1, trail: [] };
        fixAngle();
        snd.throwIt();
      }
      function fixAngle() {
        // never let the fireball run (almost) parallel to an edge
        const s = Math.hypot(ball.vx, ball.vy) || 1, m = s * 0.28;
        if (Math.abs(ball.vx) < m) ball.vx = (ball.vx < 0 ? -1 : 1) * m;
        if (Math.abs(ball.vy) < m) ball.vy = (ball.vy < 0 ? -1 : 1) * m;
        const s2 = Math.hypot(ball.vx, ball.vy); ball.vx *= s / s2; ball.vy *= s / s2;
      }
      function setSpeed(s) { const l = Math.hypot(ball.vx, ball.vy) || 1; ball.vx *= s / l; ball.vy *= s / l; }

      function explode(x, y, col, n) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, s = rnd(0.3, 2.2);
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(20, 50), col });
        }
      }
      function killKing(c) {
        c.alive = false; c.deadT = 0;
        const [kx, ky] = toGlobal(c.k, 14, 14);
        explode(kx, ky, COLORS[c.k], 40);
        // the castle crumbles
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (c.b[i][j] && Math.random() < 0.55) {
          c.b[i][j] = 0;
          const [x, y] = toGlobal(c.k, i * CELL + 4, j * CELL + 4);
          if (Math.random() < 0.3) explode(x, y, DARK[c.k], 2);
        }
        if (ball && ball.owner === PLAYER && c.k !== PLAYER) addScore(500);
        snd.king();
        if (ball && ball.held === c.k) ball.held = -1;
        checkRoundEnd();
      }
      function checkRoundEnd() {
        const al = aliveList();
        const playerDead = !demo && !castles[PLAYER].alive;
        if (al.length <= 1 || playerDead) {
          winner = al.length === 1 ? al[0].k : -1;
          if (playerDead) winner = al.length === 1 ? al[0].k : -1;
          endRound(playerDead);
        }
      }
      function endRound(playerDead) {
        state = 'roundend'; stateT = 0;
        if (demo) { endMsg = winner >= 0 ? NAMES[winner] + ' WINS' : 'DRAW'; return; }
        if (playerDead) { endMsg = 'YOUR CASTLE HAS FALLEN'; snd.lose(); lives--; }
        else if (winner === PLAYER) { endMsg = 'YOU WIN THE ROUND'; addScore(1000 + 500 * round); snd.win(); }
        else { endMsg = winner >= 0 ? NAMES[winner] + ' WINS THE ROUND' : 'NO WINNER'; snd.lose(); lives--; }
      }
      function timeUp() {
        // when time runs out, the living warlord with the most bricks takes the round
        let best = null, bestN = -1;
        for (const c of aliveList()) { const n = brickCount(c); if (n > bestN) { bestN = n; best = c; } }
        winner = best ? best.k : -1;
        for (const c of aliveList()) if (c !== best) { c.alive = false; }
        endRound(false);
      }

      // ---------- shields ----------
      function shieldInput(c) {
        if (c.cpu) return cpuShield(c);
        const sp = 0.055;
        let moved = false;
        if (api.key('ArrowLeft') || api.key('ArrowUp')) { c.phi += sp; moved = true; }
        if (api.key('ArrowRight') || api.key('ArrowDown')) { c.phi -= sp; moved = true; }
        if (moved) mouseActive = false;
        else if (mouseActive) {
          const [lx, ly] = toLocal(c.k, api.mouse.x, api.mouse.y);
          const t = Math.atan2(Math.max(0, ly), Math.max(0.01, lx));
          c.phi += Math.max(-0.12, Math.min(0.12, t - c.phi));
        }
        c.phi = Math.max(PHI_MIN, Math.min(PHI_MAX, c.phi));
      }
      function cpuShield(c) {
        let target = Math.PI / 4;
        if (ball && ball.held !== c.k) {
          const [lx, ly] = toLocal(c.k, ball.x, ball.y);
          if (Math.hypot(lx, ly) > c.react) { target = c.phi + (Math.PI / 4 - c.phi) * 0.02; }
          else {
          const lvx = ball.vx * CORNERS[c.k].sx, lvy = ball.vy * CORNERS[c.k].sy;
          // ray / circle intersection with the shield track
          const bq = lx * lvx + ly * lvy, aq = lvx * lvx + lvy * lvy, cq = lx * lx + ly * ly - RS * RS;
          const disc = bq * bq - aq * cq;
          let found = false;
          if (disc >= 0 && aq > 0) {
            const t = (-bq - Math.sqrt(disc)) / aq;
            if (t > 0 && t < 400) {
              const ix = lx + lvx * t, iy = ly + lvy * t;
              if (ix > -10 && iy > -10) { target = Math.atan2(Math.max(0, iy), Math.max(0, ix)); found = true; }
            }
          }
          if (!found && lx > 0 && ly > 0) target = Math.atan2(ly, lx);
          target += c.aiErr;
          }
        }
        if (ball && ball.held === c.k) {
          // aim the throw at another living warlord
          if (c.aimPhi == null) {
            const others = aliveList().filter(o => o !== c);
            const o = others[Math.floor(Math.random() * others.length)] || c;
            const [tx, ty] = toGlobal(o.k, 15, 15);
            const [lx, ly] = toLocal(c.k, tx, ty);
            c.aimPhi = Math.atan2(ly, lx) + rnd(-0.15, 0.15);
          }
          target = c.aimPhi;
        }
        const d = Math.max(-c.aiSpeed, Math.min(c.aiSpeed, target - c.phi));
        c.phi = Math.max(PHI_MIN, Math.min(PHI_MAX, c.phi + d));
      }
      function catchHeld(c) {
        if (c.cpu) return c.hold > 0;
        return api.key('Space') || api.key('KeyX') || api.mouse.down;
      }
      function shieldCollide(c) {
        if (!c.alive || ball.held >= 0) return;
        const [lx, ly] = toLocal(c.k, ball.x, ball.y);
        const d = Math.hypot(lx, ly);
        if (Math.abs(d - RS) > BR + 2) return;
        const lvx = ball.vx * CORNERS[c.k].sx, lvy = ball.vy * CORNERS[c.k].sy;
        if (lx * lvx + ly * lvy >= 0) return;        // only when heading for the castle
        const pb = Math.atan2(ly, lx), off = pb - c.phi;
        if (Math.abs(off) > SHALF + BR / RS) return;
        ball.owner = c.k;
        for (const o of castles) if (o.cpu) o.aiErr = rnd(-1, 1) * o.errAmt;
        if (c.cpu) c.aimPhi = null;
        const wantsCatch = c.cpu ? Math.random() < c.catchChance : catchHeld(c);
        if (wantsCatch) {
          ball.held = c.k; ball.holdT = 0;
          if (c.cpu) c.hold = Math.floor(rnd(25, 70));
          snd.catchIt();
          return;
        }
        // deflect: outward, steered by where it struck the shield
        const out = c.phi + Math.max(-1, Math.min(1, off / SHALF)) * 0.55;
        const s = Math.min(4, Math.hypot(ball.vx, ball.vy) * 1.02);
        const [gx, gy] = [Math.cos(out) * CORNERS[c.k].sx, Math.sin(out) * CORNERS[c.k].sy];
        ball.vx = gx * s; ball.vy = gy * s; fixAngle();
        const [px, py] = toGlobal(c.k, Math.cos(pb) * (RS + BR + 2.5), Math.sin(pb) * (RS + BR + 2.5));
        ball.x = px; ball.y = py;
        snd.shield();
      }
      function throwBall(c) {
        const s = Math.max(ballSpeed(), Math.hypot(ball.vx, ball.vy)) * 1.08;
        const out = c.phi;
        ball.vx = Math.cos(out) * CORNERS[c.k].sx * s; ball.vy = Math.sin(out) * CORNERS[c.k].sy * s;
        ball.held = -1; fixAngle(); c.aimPhi = null;
        snd.throwIt();
      }

      // ---------- fireball ----------
      function stepBall() {
        if (ball.held >= 0) {
          const c = castles[ball.held];
          const [x, y] = shieldPos(c.k, c.phi, RS + BR + 3);
          ball.x = x; ball.y = y; ball.holdT++;
          if (c.cpu) { if (--c.hold <= 0) throwBall(c); }
          else if (!catchHeld(c) || ball.holdT > 150) throwBall(c);
          return;
        }
        // speed creeps up through the round
        const target = ballSpeed(), cur = Math.hypot(ball.vx, ball.vy);
        if (cur < target) setSpeed(cur + 0.002);
        ball.trail.push([ball.x, ball.y]); if (ball.trail.length > 6) ball.trail.shift();
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) / 1.0));
        for (let i = 0; i < n && state === 'play'; i++) {
          const ox = ball.x; ball.x += ball.vx / n;
          let h = brickAt(ball.x + Math.sign(ball.vx) * BR, ball.y);
          if (h) { ball.x = ox; ball.vx = -ball.vx; breakBrick(h); }
          if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx); snd.wall(); }
          if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -Math.abs(ball.vx); snd.wall(); }
          const oy = ball.y; ball.y += ball.vy / n;
          h = brickAt(ball.x, ball.y + Math.sign(ball.vy) * BR);
          if (h) { ball.y = oy; ball.vy = -ball.vy; breakBrick(h); }
          if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy); snd.wall(); }
          if (ball.y > H - BR) { ball.y = H - BR; ball.vy = -Math.abs(ball.vy); snd.wall(); }
          for (const c of castles) {
            shieldCollide(c);
            if (ball.held >= 0) return;
            if (!c.alive) continue;
            const [lx, ly] = toLocal(c.k, ball.x, ball.y);
            if (lx >= -BR && ly >= -BR && Math.hypot(lx, ly) < KING_R) {
              killKing(c);
              // bounce back out of the ruined courtyard
              const cn = CORNERS[c.k]; ball.vx = Math.abs(ball.vx) * cn.sx; ball.vy = Math.abs(ball.vy) * cn.sy;
              return;
            }
          }
        }
      }
      function breakBrick(h) {
        const [c, i, j] = h;
        c.b[i][j] = 0;
        const [x, y] = toGlobal(c.k, i * CELL + 4, j * CELL + 4);
        explode(x, y, COLORS[c.k], 4);
        if (ball.owner === PLAYER && c.k !== PLAYER) addScore(25);
        snd.brick();
      }

      function tryStart() {
        if (api.useCredit()) { startGame(false); coinFlash = 0; return true; }
        coinFlash = 100; A.tone(70, 0.25, { type: 'square', vol: 0.22 });
        return false;
      }

      startGame(true);

      function update() {
        stateT++;
        if (Math.abs(api.mouse.x - lastMX) + Math.abs(api.mouse.y - lastMY) > 0.5) mouseActive = true;
        lastMX = api.mouse.x; lastMY = api.mouse.y;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96;
          if (--p.t <= 0) parts.splice(i, 1);
        }
        if (demo) {
          attractT++;
          if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) { if (tryStart()) return; }
        }
        for (const c of castles) if (c.alive) shieldInput(c); else c.deadT++;

        if (state === 'dragon') {
          dragon.t++;
          dragon.fade = Math.min(1, dragon.t / 40);
          dragon.x = W / 2 + Math.sin(dragon.t * 0.05) * 30;
          dragon.y = H / 2 + Math.sin(dragon.t * 0.1) * 8 - 6;
          if (dragon.t === 100) { launchFromDragon(); state = 'play'; dragon.vx = rnd(-1, 1); dragon.vy = -1.5; }
        } else if (state === 'play') {
          roundT++;
          if (dragon) { dragon.x += dragon.vx; dragon.y += dragon.vy; dragon.t++; if (dragon.y < -20) dragon = null; }
          if (ball) stepBall();
          if (state === 'play' && roundT > 60 * 100) timeUp();
        } else if (state === 'roundend') {
          if (stateT > 180) {
            if (demo) { if (attractT > 60 * 60) { attractT = 0; } startGame(true); return; }
            if (lives <= 0) {
              const over = () => { state = 'over'; stateT = 0; api.setHiScore(score); };
              if (api.offerContinue) {
                state = 'over'; stateT = -1e9;
                api.offerContinue(() => { lives = 3; round++; newRound(); }, over);
              } else over();
            } else { round++; newRound(); }
          }
        } else if (state === 'over') {
          if (stateT > 240 || (stateT > 60 && api.anyPressed('Enter', 'Space'))) { startGame(true); }
        }
      }

      // ---------- drawing ----------
      function sprite(ctx, rows, x, y, pal, flipX) {
        const w = rows[0].length;
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          for (let c = 0; c < w; c++) {
            const ch = row[flipX ? w - 1 - c : c];
            if (ch === '.') continue;
            ctx.fillStyle = pal[ch]; ctx.fillRect(x + c, y + r, 1, 1);
          }
        }
      }
      function drawCastle(ctx, c) {
        const col = c.alive ? COLORS[c.k] : '#555', dk = c.alive ? DARK[c.k] : '#2a2a2a';
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          if (!c.b[i][j]) continue;
          const [x0, y0] = toGlobal(c.k, i * CELL, j * CELL), [x1, y1] = toGlobal(c.k, (i + 1) * CELL, (j + 1) * CELL);
          const x = Math.min(x0, x1), y = Math.min(y0, y1);
          ctx.fillStyle = dk; ctx.fillRect(x, y, CELL, CELL);
          ctx.fillStyle = col; ctx.fillRect(x, y, CELL - 1, CELL - 1);
          ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, CELL - 1, 1);
        }
        // the warlord
        const [kx, ky] = toGlobal(c.k, 14, 14);
        if (c.alive) {
          const bob = (api.frame >> 4) & 1;
          sprite(ctx, KING, Math.round(kx - 3), Math.round(ky - 4 - bob), { y: '#ffd040', s: '#ffc8a0', c: COLORS[c.k] }, false);
        } else {
          ctx.fillStyle = '#444'; ctx.fillRect(kx - 4, ky + 1, 9, 3);
          ctx.fillStyle = '#777'; ctx.fillRect(kx - 2, ky - 2, 5, 3);
        }
        // shield
        if (c.alive) {
          ctx.fillStyle = COLORS[c.k];
          for (let s = -4; s <= 4; s++) {
            const a = c.phi + s / 4 * SHALF;
            const [x, y] = shieldPos(c.k, a, RS);
            ctx.fillRect(Math.round(x - 2), Math.round(y - 2), 4, 4);
          }
          ctx.fillStyle = '#fff';
          const [x, y] = shieldPos(c.k, c.phi, RS); ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 2, 2);
        }
      }
      function drawBall(ctx) {
        if (!ball) return;
        for (let i = 0; i < ball.trail.length; i++) {
          const [x, y] = ball.trail[i];
          ctx.fillStyle = i < 3 ? 'rgba(255,80,0,0.35)' : 'rgba(255,160,0,0.55)';
          ctx.fillRect(Math.round(x - 1.5), Math.round(y - 1.5), 3, 3);
        }
        const f = api.frame & 3;
        ctx.fillStyle = f < 2 ? '#ff6a00' : '#ffb000';
        ctx.fillRect(Math.round(ball.x - 3), Math.round(ball.y - 2), 6, 4);
        ctx.fillRect(Math.round(ball.x - 2), Math.round(ball.y - 3), 4, 6);
        ctx.fillStyle = '#fff6a0'; ctx.fillRect(Math.round(ball.x - 1), Math.round(ball.y - 1), 2, 2);
      }
      function render(ctx) {
        ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
        // flagstone floor
        ctx.fillStyle = '#120c1e';
        for (let y = 0; y < H; y += 16) for (let x = ((y >> 4) & 1) * 8; x < W; x += 16) ctx.fillRect(x, y, 15, 15);
        for (const c of castles) drawCastle(ctx, c);
        // dragon
        if (dragon) {
          ctx.globalAlpha = dragon.fade;
          const fr = (dragon.t >> 3) & 1;
          const pal = { k: '#3a3a4a', r: '#a02020', y: '#ffd040' };
          // drawn at 2x
          const rows = DRAGON[fr];
          for (let r = 0; r < rows.length; r++) for (let cc = 0; cc < 12; cc++) {
            const ch = rows[r][cc]; if (ch === '.') continue;
            ctx.fillStyle = pal[ch]; ctx.fillRect(Math.round(dragon.x - 12 + cc * 2), Math.round(dragon.y - 10 + r * 2), 2, 2);
          }
          ctx.globalAlpha = 1;
          if (state === 'dragon' && dragon.t > 80 && (dragon.t & 2)) { ctx.fillStyle = '#ffb000'; ctx.fillRect(dragon.x - 2, dragon.y + 8, 4, 4); }
        }
        drawBall(ctx);
        for (const p of parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
        // HUD
        if (!demo) {
          text(ctx, String(score).padStart(6, '0'), W / 2, 3, '#fff', 1, 'center');
          text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2, 12, '#888', 1, 'center');
          text(ctx, 'ROUND ' + round, W / 2, H - 10, '#ff9a20', 1, 'center');
          for (let i = 0; i < Math.min(6, lives); i++) {
            ctx.fillStyle = '#ffd040'; ctx.fillRect(W / 2 - 40 + i * 6, H - 20, 4, 2); ctx.fillRect(W / 2 - 40 + i * 6, H - 22, 1, 2);
            ctx.fillRect(W / 2 - 38 + i * 6, H - 22, 1, 2); ctx.fillRect(W / 2 - 37 + i * 6, H - 22, 1, 2);
          }
          if (state === 'play' && roundT > 60 * 80) {
            const left = Math.ceil((60 * 100 - roundT) / 60);
            text(ctx, 'TIME ' + left, W / 2, 24, (api.frame >> 3) & 1 ? '#ff4848' : '#fff', 1, 'center');
          }
          if (state === 'dragon') {
            text(ctx, 'ROUND ' + round, W / 2, 84, '#fff', 2, 'center');
            if (round === 1) text(ctx, 'YOU ARE THE BLUE WARLORD', W / 2, 150, '#48a8ff', 1, 'center');
            if (round === 1) text(ctx, 'HOLD SPACE TO CATCH', W / 2, 160, '#aaa', 1, 'center');
          }
        }
        if (state === 'roundend' && !demo) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(40, 100, 240, 36);
          text(ctx, endMsg, W / 2, 106, winner === PLAYER ? '#ffd040' : '#ff4848', 1, 'center');
          text(ctx, lives > 0 ? 'CASTLES LEFT ' + lives : 'LAST CASTLE LOST', W / 2, 122, '#fff', 1, 'center');
        }
        if (state === 'over' && !demo) {
          ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(70, 96, 180, 44);
          text(ctx, 'GAME OVER', W / 2, 102, '#ff4848', 2, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 124, '#fff', 1, 'center');
        }
        if (demo) drawTitle(ctx);
      }
      function drawTitle(ctx) {
        const blink = (api.frame >> 4) & 1;
        const page = Math.floor(attractT / 420) % 2;
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(66, 70, 188, 104);
        ctx.fillStyle = '#ff9a20'; ctx.fillRect(66, 70, 188, 1); ctx.fillRect(66, 173, 188, 1);
        text(ctx, 'WARLORDS', W / 2, 76, '#ff9a20', 3, 'center');
        if (page === 0) {
          text(ctx, 'DEFEND YOUR CASTLE', W / 2, 104, '#fff', 1, 'center');
          text(ctx, 'LAST WARLORD STANDING', W / 2, 114, '#fff', 1, 'center');
          text(ctx, 'WINS THE ROUND', W / 2, 124, '#fff', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE ' + hi, W / 2, 104, '#ffd040', 1, 'center');
          text(ctx, 'BRICK 25  WARLORD 500', W / 2, 116, '#aaa', 1, 'center');
          text(ctx, 'ROUND WON 1000+', W / 2, 126, '#aaa', 1, 'center');
        }
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 144, '#fff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 144, '#fff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 144, blink ? '#fff' : '#48a8ff', 1, 'center');
        text(ctx, '1 PLAYER VS 3 WARLORDS', W / 2, 158, '#888', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, H - 10, '#aaa', 1, 'center');
        text(ctx, '\u00a9 1980 ATARI', W / 2, 3, '#777', 1, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
