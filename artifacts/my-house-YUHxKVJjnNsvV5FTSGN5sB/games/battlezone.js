// Battlezone (Atari, 1980) -- first-person wireframe tank combat, vector recreation
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

  // ---------- Wireframe models: x right, y up, z forward ----------
  function box(x0, x1, y0, y1, z0, z1, v, e) {
    const b = v.length;
    v.push([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]);
    e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b], [b + 4, b + 5], [b + 5, b + 6], [b + 6, b + 7], [b + 7, b + 4],
      [b, b + 4], [b + 1, b + 5], [b + 2, b + 6], [b + 3, b + 7]);
  }
  function loop(pts, v, e, close) {
    const b = v.length;
    for (const p of pts) v.push(p);
    for (let i = 0; i < pts.length - 1; i++) e.push([b + i, b + i + 1]);
    if (close) e.push([b + pts.length - 1, b]);
    return b;
  }
  function frustum(bot, top, v, e) {   // two quads (4 pts each) joined
    const a = loop(bot, v, e, true), b = loop(top, v, e, true);
    for (let i = 0; i < 4; i++) e.push([a + i, b + i]);
  }
  const M = {};
  (function () {
    // standard tank
    let v = [], e = [];
    frustum([[-12, 0, -17], [12, 0, -17], [12, 0, 19], [-12, 0, 19]], [[-14, 7, -21], [14, 7, -21], [14, 7, 25], [-14, 7, 25]], v, e);
    frustum([[-14, 7, -21], [14, 7, -21], [14, 7, 25], [-14, 7, 25]].map(p => p), [[-9, 10, -15], [9, 10, -15], [9, 10, 12], [-9, 10, 12]], v, e);
    frustum([[-7, 10, -11], [7, 10, -11], [7, 10, 5], [-7, 10, 5]], [[-5, 16, -9], [5, 16, -9], [5, 16, 2], [-5, 16, 2]], v, e);
    box(-1.2, 1.2, 12, 14, 4, 34, v, e);
    loop([[0, 16, -7], [0, 22, -7]], v, e, false);
    M.tank = { v, e, r: 22 };
    // supertank: low and wedge-shaped, long gun
    v = []; e = [];
    frustum([[-11, 0, -20], [11, 0, -20], [11, 0, 20], [-11, 0, 20]], [[-13, 6, -23], [13, 6, -23], [5, 6, 32], [-5, 6, 32]], v, e);
    frustum([[-13, 6, -23], [13, 6, -23], [5, 6, 32], [-5, 6, 32]], [[-7, 11, -16], [7, 11, -16], [3, 11, 8], [-3, 11, 8]], v, e);
    box(-1, 1, 9, 11, 6, 42, v, e);
    M.superTank = { v, e, r: 22 };
    // guided missile
    v = []; e = [];
    const sec = z => [[-4, 2, z], [4, 2, z], [4, 9, z], [-4, 9, z]];
    frustum(sec(-22), sec(10), v, e);
    const nose = v.length; v.push([0, 5.5, 30]);
    for (let i = 0; i < 4; i++) e.push([nose, v.length - 4 + i]);
    loop([[-4, 9, -22], [-10, 16, -26], [-4, 9, -12]], v, e, false);
    loop([[4, 9, -22], [10, 16, -26], [4, 9, -12]], v, e, false);
    loop([[0, 9, -20], [0, 18, -26], [0, 9, -12]], v, e, false);
    M.missile = { v, e, r: 16 };
    // saucer
    v = []; e = [];
    const ring = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ring.push([Math.cos(a) * 20, 12, Math.sin(a) * 20]); }
    const rb = loop(ring, v, e, true);
    const top = v.length; v.push([0, 22, 0]); const bot = v.length; v.push([0, 6, 0]);
    for (let i = 0; i < 10; i++) { e.push([rb + i, top]); if (i % 2 === 0) e.push([rb + i, bot]); }
    M.saucer = { v, e, r: 24 };
    // shell
    v = []; e = [];
    loop([[0, 2, 0], [2, 0, 0], [0, -2, 0], [-2, 0, 0]], v, e, true);
    const t2 = v.length; v.push([0, 0, 5], [0, 0, -5]);
    for (let i = 0; i < 4; i++) { e.push([i, t2]); e.push([i, t2 + 1]); }
    M.shell = { v, e, r: 3 };
    // obstacles
    v = []; e = []; box(-22, 22, 0, 44, -22, 22, v, e); M.cube = { v, e, r: 30 };
    v = []; e = []; box(-14, 14, 0, 64, -14, 14, v, e); M.tall = { v, e, r: 22 };
    v = []; e = []; box(-32, 32, 0, 22, -16, 16, v, e); M.slab = { v, e, r: 34 };
    v = []; e = [];
    const pb = loop([[-28, 0, -28], [28, 0, -28], [28, 0, 28], [-28, 0, 28]], v, e, true);
    const apex = v.length; v.push([0, 52, 0]);
    for (let i = 0; i < 4; i++) e.push([pb + i, apex]);
    M.pyramid = { v, e, r: 32 };
  })();

  ArcadeRegistry.register({
    id: 'battlezone', title: 'Battlezone', year: 1980, maker: 'Atari',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Up/Down: treads forward/back \u00b7 Left/Right: turn \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#020a02', fg: '#4dff4d', accent: '#ff3b3b' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const WS = 4096;
      const wrapD = d => { d = ((d % WS) + WS * 1.5) % WS; return d - WS / 2; };
      const wrapP = p => ((p % WS) + WS) % WS;
      const wrapA = a => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
      const CX = 320, HZ = 268, F = 560, NEAR = 3, CAMH = 12, FAR = 2000;
      const VX0 = 8, VY0 = 104, VX1 = W - 8, VY1 = H - 8;
      const HALF_FOV = Math.atan((CX - VX0) / F);
      const GREEN = '#52ff5a', RED = '#ff4040';

      let hi = api.getHiScore(15000);
      let state = 'attract', stateT = 0, page = 0;
      let px = 0, pz = 0, pa = 0;
      let score = 0, lives = 3, nextBonus = 15000, bonusGiven = 0;
      let obstacles = [], enemy = null, saucer = null, pShell = null, eShells = [], debris = [], sparks = [];
      let spawnT = 0, saucerT = 0, dead = false, deadT = 0, cracks = [], shake = 0;
      let blockedT = 0, engineT = 0, kills = 0, radarA = 0, pingT = 0;
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      let lava = [];

      // ---------- horizon: mountains + volcano + moon ----------
      const HOR = [];
      (function () {
        const N = 72;
        let h = 18;
        for (let i = 0; i < N; i++) {
          const a = i / N * Math.PI * 2;
          h = Math.max(4, Math.min(52, h + rnd(-14, 14)));
          if (i % 9 === 4) h = rnd(30, 58);
          HOR.push([a, h]);
        }
      })();
      const VOLC = 1.0;
      // volcano: replace the profile near VOLC with a cone and crater
      for (const p of HOR) if (Math.abs(wrapA(p[0] - VOLC)) < 0.2) p[1] = 8;
      HOR.push([VOLC - 0.17, 10], [VOLC - 0.05, 72], [VOLC - 0.02, 66], [VOLC + 0.02, 66], [VOLC + 0.05, 72], [VOLC + 0.17, 10]);
      HOR.sort((a, b) => a[0] - b[0]);
      const MOON = 3.5;

      function makeField() {
        obstacles = [];
        const kinds = ['cube', 'cube', 'pyramid', 'pyramid', 'tall', 'slab'];
        let tries = 0;
        while (obstacles.length < 44 && tries++ < 2000) {
          const x = rnd(0, WS), z = rnd(0, WS);
          if (Math.hypot(wrapD(x), wrapD(z)) < 160) continue;
          if (obstacles.some(o => Math.hypot(wrapD(o.x - x), wrapD(o.z - z)) < 260)) continue;
          const k = kinds[(Math.random() * kinds.length) | 0];
          obstacles.push({ x, z, k, yaw: rnd(0, Math.PI), r: M[k].r });
        }
      }
      function blockedAt(x, z, rad) {
        for (const o of obstacles) {
          const dx = wrapD(o.x - x), dz = wrapD(o.z - z);
          if (dx * dx + dz * dz < (o.r + rad) * (o.r + rad)) return o;
        }
        return null;
      }

      // ---------- spawning ----------
      function spawnEnemy(atStart) {
        let type = 'tank';
        const r = Math.random();
        if (score >= 10000 && r < 0.3) type = 'missile';
        else if (score >= 3000 && r < Math.min(0.55, 0.15 + score / 60000)) type = 'super';
        if (state === 'attract') type = Math.random() < 0.3 ? 'super' : 'tank';
        let x, z, tries = 0;
        do {
          const ang = pa + (atStart ? rnd(-0.4, 0.4) : rnd(-Math.PI, Math.PI));
          const d = type === 'missile' ? rnd(1100, 1300) : rnd(650, 1100);
          x = wrapP(px + Math.sin(ang) * d); z = wrapP(pz + Math.cos(ang) * d);
        } while (blockedAt(x, z, 30) && tries++ < 30);
        const toP = Math.atan2(wrapD(px - x), wrapD(pz - z));
        const lvl = Math.min(1, score / 50000);
        enemy = {
          type, x, z, a: toP + rnd(-1.2, 1.2), y: 0, t: 0,
          speed: type === 'super' ? 2.5 + lvl : type === 'missile' ? 5.2 + lvl * 1.5 : 1.3 + lvl * 0.9,
          turn: type === 'super' ? 0.03 : 0.016 + lvl * 0.01,
          fireT: 120 + rnd(0, 80), mode: 'hunt', modeT: 60, wanderA: rnd(0, 6.28), avoidT: 0, avoidA: 0, radar: 0
        };
        if (state !== 'attract') {
          if (type === 'missile') A.tone(1400, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 500 });
          else A.melody([[1050, 0.06], [0, 0.04], [1050, 0.06]], { type: 'square', vol: 0.08 });
        }
      }
      function spawnSaucer() {
        const ang = rnd(0, Math.PI * 2), d = rnd(350, 800);
        saucer = { x: wrapP(px + Math.sin(ang) * d), z: wrapP(pz + Math.cos(ang) * d), a: rnd(0, 6.28), spin: 0, t: 0, life: 900 + rnd(0, 500), vx: 0, vz: 0, hop: 0 };
      }

      // ---------- flow ----------
      function resetPlayfield() {
        enemy = null; saucer = null; pShell = null; eShells = []; debris = []; sparks = [];
        spawnT = 90; saucerT = 1200 + rnd(0, 900);
      }
      function startGame() {
        state = 'play'; stateT = 0; score = 0; lives = 3; bonusGiven = 0; kills = 0;
        px = rnd(0, WS); pz = rnd(0, WS); pa = 0;
        while (blockedAt(px, pz, 50)) { px = rnd(0, WS); pz = rnd(0, WS); }
        dead = false; resetPlayfield();
        A.melody([[262, 0.12], [330, 0.12], [392, 0.12], [523, 0.3]], { type: 'square', vol: 0.12 });
      }
      function attractInit() {
        state = 'attract'; stateT = 0; page = 0; dead = false; cracks = [];
        resetPlayfield(); spawnT = 30;
      }
      function gameOver() {
        state = 'gameover'; stateT = 0;
        if (score > hi) { hi = score; api.setHiScore(hi); }
      }
      function addScore(n) {
        score += n;
        const bonus = [15000, 100000];
        while (bonusGiven < bonus.length && score >= bonus[bonusGiven]) {
          bonusGiven++; lives++;
          A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: 0.12 });
        }
        if (score > hi) { hi = score; api.setHiScore(hi); }
      }
      function killPlayer() {
        if (dead) return;
        dead = true; deadT = 170; shake = 30;
        cracks = [];
        const cx = rnd(200, 440), cy = rnd(200, 360);
        for (let i = 0; i < 11; i++) {
          const ang = i / 11 * Math.PI * 2 + rnd(-0.2, 0.2);
          const pts = [[cx, cy]]; let x = cx, y = cy;
          const n = 4 + ((Math.random() * 3) | 0);
          for (let k = 0; k < n; k++) {
            const step = rnd(30, 90), a2 = ang + rnd(-0.45, 0.45);
            x += Math.cos(a2) * step; y += Math.sin(a2) * step; pts.push([x, y]);
          }
          cracks.push(pts);
        }
        A.noise(1.6, { freq: 2600, slideTo: 60, vol: 0.5 });
        A.noise(0.8, { freq: 400, vol: 0.35, delay: 0.05 });
        A.tone(90, 1.2, { type: 'sawtooth', vol: 0.15, slideTo: 30 });
      }
      function explodeModel(m, x, z, y, yaw, vel) {
        const c = Math.cos(yaw), s = Math.sin(yaw);
        for (const [i, j] of m.e) {
          if (Math.random() < 0.35) continue;
          const a = m.v[i], b = m.v[j];
          const ax = a[0] * c + a[2] * s, az = -a[0] * s + a[2] * c, bx = b[0] * c + b[2] * s, bz = -b[0] * s + b[2] * c;
          const mx = (ax + bx) / 2, my = (a[1] + b[1]) / 2 + y, mz = (az + bz) / 2;
          debris.push({ x: x + mx, y: my, z: z + mz, dx: (bx - ax) / 2, dy: (b[1] - a[1]) / 2, dz: (bz - az) / 2,
            vx: mx * 0.06 + rnd(-1, 1) * vel, vy: rnd(1, 4) * vel, vz: mz * 0.06 + rnd(-1, 1) * vel, spin: rnd(-0.2, 0.2), t: rnd(90, 160) });
        }
        for (let i = 0; i < 14; i++) sparks.push({ x, y: 8 + y, z, vx: rnd(-3, 3), vy: rnd(1, 5), vz: rnd(-3, 3), t: rnd(20, 50) });
      }
      function killEnemy(e, pts) {
        const m = e.type === 'super' ? M.superTank : e.type === 'missile' ? M.missile : M.tank;
        explodeModel(m, e.x, e.z, e.y, e.a, 1);
        if (state !== 'play') return;
        addScore(pts);
        A.noise(1.0, { freq: 1800, slideTo: 70, vol: 0.4 });
        A.tone(140, 0.6, { type: 'square', vol: 0.12, slideTo: 40 });
        kills++;
      }

      // ---------- per-frame logic ----------
      function moveTank(e, fwd) {
        const nx = wrapP(e.x + Math.sin(e.a) * fwd), nz = wrapP(e.z + Math.cos(e.a) * fwd);
        if (blockedAt(nx, nz, 18)) return false;
        if (Math.hypot(wrapD(px - nx), wrapD(pz - nz)) < 44) return false;
        e.x = nx; e.z = nz; return true;
      }
      function updateEnemy() {
        const e = enemy; if (!e) return;
        e.t++; e.radar += 0.12;
        const dx = wrapD(px - e.x), dz = wrapD(pz - e.z), dist = Math.hypot(dx, dz);
        const toP = Math.atan2(dx, dz);
        if (e.type === 'missile') {
          // zig-zags in, then straight at you; hops over obstacles
          const weave = dist > 260 ? Math.sin(e.t * 0.07) * 0.75 : 0;
          const want = toP + weave;
          e.a += Math.max(-0.08, Math.min(0.08, wrapA(want - e.a)));
          e.x = wrapP(e.x + Math.sin(e.a) * e.speed); e.z = wrapP(e.z + Math.cos(e.a) * e.speed);
          const over = blockedAt(e.x, e.z, 40);
          e.y += ((over ? 66 : 2) - e.y) * 0.15;
          if (e.t % 20 === 0 && state === 'play') A.tone(500 + Math.max(0, 1200 - dist), 0.08, { type: 'square', vol: 0.05 });
          if (dist < 20 && e.y < 30) {
            if (state === 'play') { killPlayer(); explodeModel(M.missile, e.x, e.z, e.y, e.a, 1); enemy = null; spawnT = 200; }
            else { enemy = null; spawnT = 60; }
          }
          if (dist > 2200) { enemy = null; spawnT = 60; }
          return;
        }
        if (e.avoidT > 0) e.avoidT--;
        if (--e.modeT <= 0) {
          const aggr = e.type === 'super' ? 0.95 : Math.min(0.9, 0.55 + score / 80000);
          e.mode = (Math.random() < aggr || state === 'attract' && Math.random() < 0.3) ? 'hunt' : 'wander';
          e.modeT = e.mode === 'hunt' ? 200 + rnd(0, 200) : 100 + rnd(0, 120);
          e.wanderA = toP + rnd(-1.6, 1.6);
        }
        let want = e.mode === 'hunt' ? toP : e.wanderA;
        if (e.avoidT > 0) want = e.avoidA;
        const diff = wrapA(want - e.a);
        e.a += Math.max(-e.turn, Math.min(e.turn, diff));
        const close = e.mode === 'hunt' && dist < (e.type === 'super' ? 90 : 160);
        if (Math.abs(diff) < 0.6 && !close) {
          if (!moveTank(e, e.speed)) { e.avoidT = 50 + rnd(0, 40); e.avoidA = e.a + (Math.random() < 0.5 ? 1.4 : -1.4); }
        }
        if (dist > 2400) { e.a = toP; e.mode = 'hunt'; }
        // firing
        if (e.fireT > 0) e.fireT--;
        const aimErr = Math.abs(wrapA(toP - e.a));
        if (state === 'play' && !dead && e.fireT <= 0 && eShells.length === 0 && aimErr < 0.05 && dist < 1200) {
          const lvl = Math.min(1, score / 40000);
          eShells.push({ x: wrapP(e.x + Math.sin(e.a) * 34), z: wrapP(e.z + Math.cos(e.a) * 34), a: e.a, t: 170, sp: 7 + lvl * 3 + (e.type === 'super' ? 2 : 0) });
          e.fireT = (e.type === 'super' ? 70 : 140) - lvl * 50 + rnd(0, 60);
          A.noise(0.3, { freq: 900, vol: 0.18 }); A.tone(300, 0.2, { type: 'square', vol: 0.08, slideTo: 120 });
        }
      }
      function updateSaucer() {
        if (!saucer) {
          if (state === 'play' && score >= 2000 && --saucerT <= 0) { spawnSaucer(); saucerT = 1500 + rnd(0, 1200); }
          return;
        }
        const s = saucer;
        s.t++; s.spin += 0.09; s.life--;
        if (s.t % 90 === 1) { const a = rnd(0, 6.28), sp = rnd(0.8, 2.2); s.vx = Math.sin(a) * sp; s.vz = Math.cos(a) * sp; }
        s.x = wrapP(s.x + s.vx); s.z = wrapP(s.z + s.vz);
        s.hop = 8 + Math.sin(s.t * 0.05) * 6;
        if (state === 'play' && s.t % 24 === 0) A.tone(s.t % 48 ? 600 : 760, 0.18, { type: 'sine', vol: 0.05, slideTo: s.t % 48 ? 760 : 600 });
        if (s.life <= 0) saucer = null;
      }
      function updateShells() {
        if (pShell) {
          const s = pShell;
          for (let k = 0; k < 2 && pShell; k++) {
            s.x = wrapP(s.x + Math.sin(s.a) * 7); s.z = wrapP(s.z + Math.cos(s.a) * 7);
            if (blockedAt(s.x, s.z, 0)) { puff(s.x, s.z); pShell = null; if (state === 'play') A.noise(0.12, { freq: 1200, vol: 0.12 }); break; }
            const e = enemy;
            if (e) {
              const r = e.type === 'missile' ? 18 : 24;
              if (Math.hypot(wrapD(e.x - s.x), wrapD(e.z - s.z)) < r && e.y < 34) {
                killEnemy(e, e.type === 'super' ? 3000 : e.type === 'missile' ? 2000 : 1000);
                enemy = null; pShell = null; spawnT = 140 + rnd(0, 120);
                break;
              }
            }
            if (saucer && Math.hypot(wrapD(saucer.x - s.x), wrapD(saucer.z - s.z)) < 26) {
              explodeModel(M.saucer, saucer.x, saucer.z, saucer.hop, saucer.spin, 0.8);
              if (state === 'play') addScore(5000);
              A.melody([[1200, .05], [900, .05], [1400, .05], [700, .2]], { type: 'square', vol: 0.12 });
              A.noise(0.7, { freq: 2200, slideTo: 200, vol: 0.3 });
              saucer = null; pShell = null; break;
            }
          }
          if (pShell && --pShell.t <= 0) pShell = null;
        }
        for (let i = eShells.length - 1; i >= 0; i--) {
          const s = eShells[i];
          s.x = wrapP(s.x + Math.sin(s.a) * s.sp); s.z = wrapP(s.z + Math.cos(s.a) * s.sp);
          let gone = false;
          if (blockedAt(s.x, s.z, 0)) { puff(s.x, s.z); gone = true; }
          else if (Math.hypot(wrapD(px - s.x), wrapD(pz - s.z)) < 17 && state === 'play') { killPlayer(); gone = true; }
          if (gone || --s.t <= 0) eShells.splice(i, 1);
        }
      }
      function puff(x, z) {
        for (let i = 0; i < 8; i++) sparks.push({ x, y: 8, z, vx: rnd(-1.5, 1.5), vy: rnd(0.5, 3), vz: rnd(-1.5, 1.5), t: rnd(12, 26) });
      }
      function updateParticles() {
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i];
          d.vy -= 0.12; d.x += d.vx; d.y += d.vy; d.z += d.vz;
          if (d.y < 0) { d.y = 0; d.vy *= -0.35; d.vx *= 0.6; d.vz *= 0.6; d.spin *= 0.5; }
          const c = Math.cos(d.spin), s = Math.sin(d.spin), nx = d.dx * c - d.dz * s; d.dz = d.dx * s + d.dz * c; d.dx = nx;
          const ny = d.dy * c - d.dz * s * 0.3; d.dy = ny;
          if (--d.t <= 0) debris.splice(i, 1);
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i]; p.vy -= 0.15; p.x += p.vx; p.y += p.vy; p.z += p.vz;
          if (p.y < 0 || --p.t <= 0) sparks.splice(i, 1);
        }
        // volcano
        if (Math.random() < 0.18) lava.push({ a: VOLC + rnd(-0.015, 0.015), h: 70, va: rnd(-0.0016, 0.0016), vh: rnd(1.2, 3.2), t: 80 });
        for (let i = lava.length - 1; i >= 0; i--) {
          const l = lava[i]; l.a += l.va; l.h += l.vh; l.vh -= 0.07;
          if (l.h < 20 || --l.t <= 0) lava.splice(i, 1);
        }
      }
      function updatePlayer() {
        if (dead) return;
        let fwd = 0;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        if (U) fwd = 2.3; else if (D) fwd = -1.6;
        let turn = 0;
        if (L) turn -= 1; if (R) turn += 1;
        if (D && turn) turn = -turn;          // reversing with one tread: the nose swings the other way, like the real sticks
        pa = wrapA(pa + turn * (fwd ? 0.016 : 0.022));
        if (fwd) {
          const nx = wrapP(px + Math.sin(pa) * fwd), nz = wrapP(pz + Math.cos(pa) * fwd);
          const enemyBlock = enemy && enemy.type !== 'missile' && Math.hypot(wrapD(enemy.x - nx), wrapD(enemy.z - nz)) < 40;
          if (blockedAt(nx, nz, 16) || enemyBlock) {
            if (blockedT <= 0) A.tone(80, 0.15, { type: 'square', vol: 0.12 });
            blockedT = 30;
          } else { px = nx; pz = nz; }
        }
        if (blockedT > 0) blockedT--;
        if (--engineT <= 0) {
          engineT = fwd || turn ? 5 : 9;
          A.tone(fwd || turn ? 64 : 46, 0.11, { type: 'sawtooth', vol: fwd || turn ? 0.06 : 0.035 });
        }
        if (api.pressed('Space') && !pShell) {
          pShell = { x: wrapP(px + Math.sin(pa) * 14), z: wrapP(pz + Math.cos(pa) * 14), a: pa, t: 70 };
          A.noise(0.35, { freq: 1600, slideTo: 200, vol: 0.28 });
          A.tone(220, 0.25, { type: 'square', vol: 0.08, slideTo: 60 });
        }
      }
      function attractDrive() {
        // demo: the gunner swings toward the enemy and fires
        if (enemy) {
          const toE = Math.atan2(wrapD(enemy.x - px), wrapD(enemy.z - pz));
          const d = wrapA(toE - pa);
          pa = wrapA(pa + Math.max(-0.014, Math.min(0.014, d)));
          if (Math.abs(d) < 0.03 && !pShell && stateT % 40 === 0) pShell = { x: wrapP(px + Math.sin(pa) * 14), z: wrapP(pz + Math.cos(pa) * 14), a: pa, t: 70 };
        } else pa = wrapA(pa + 0.004);
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        if (shake > 0) shake--;
        radarA += 0.07;
        updateParticles();
        const cr = api.credits;
        if (state === 'attract') {
          if (lastCredits === 0 && cr > 0) { coinHold = 150; page = 0; stateT = 1; }
          lastCredits = cr;
          if (stateT % 540 === 0) page = (page + 1) % 2;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); return; }
            coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 });
          }
          attractDrive();
          if (!enemy && --spawnT <= 0) spawnEnemy(true);
          updateEnemy(); updateShells();
          return;
        }
        lastCredits = cr;
        if (state === 'gameover') {
          if (stateT > 300 || (stateT > 90 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (state === 'hold') return;
        if (dead) {
          if (--deadT <= 0) {
            lives--;
            if (lives <= 0) {
              state = 'hold';
              const resume = () => { state = 'play'; dead = false; cracks = []; resetPlayfield(); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; resume(); }, gameOver);
              else gameOver();
            } else { dead = false; cracks = []; resetPlayfield(); }
          }
          updateShells();
          return;
        }
        updatePlayer();
        if (!enemy && --spawnT <= 0) spawnEnemy(stateT < 200);
        updateEnemy();
        updateSaucer();
        updateShells();
        if (enemy && enemy.type !== 'missile') {
          const d = Math.hypot(wrapD(enemy.x - px), wrapD(enemy.z - pz));
          if (d < 1500 && --pingT <= 0) { pingT = 90; A.tone(1180, 0.05, { type: 'sine', vol: 0.05 }); }
        }
      }

      // ---------- 3D drawing ----------
      let ca = 1, sa = 0;
      function view(rx, ry, rz) { return [rx * ca - rz * sa, ry - CAMH, rx * sa + rz * ca]; }
      function seg(ctx, a, b) {
        let [ax, ay, az] = a, [bx, by, bz] = b;
        if (az < NEAR && bz < NEAR) return;
        if (az < NEAR) { const t = (NEAR - az) / (bz - az); ax += (bx - ax) * t; ay += (by - ay) * t; az = NEAR; }
        else if (bz < NEAR) { const t = (NEAR - bz) / (az - bz); bx += (ax - bx) * t; by += (ay - by) * t; bz = NEAR; }
        ctx.moveTo(CX + ax * F / az, HZ - ay * F / az);
        ctx.lineTo(CX + bx * F / bz, HZ - by * F / bz);
      }
      function drawModel(ctx, m, x, z, y, yaw, sc) {
        const dx = wrapD(x - px), dz = wrapD(z - pz);
        const dist = Math.hypot(dx, dz);
        if (dist > FAR) return;
        const vz = dx * sa + dz * ca;
        if (vz < -m.r * 2) return;
        const c = Math.cos(yaw), s = Math.sin(yaw), k = sc || 1;
        const P = m.v.map(p => view(dx + (p[0] * c + p[2] * s) * k, y + p[1] * k, dz + (-p[0] * s + p[2] * c) * k));
        for (const [i, j] of m.e) seg(ctx, P[i], P[j]);
      }
      function horizonX(ang) { const d = wrapA(ang - pa); if (Math.abs(d) > 1.3) return null; return CX + Math.tan(d) * F; }
      function drawHorizon(ctx) {
        ctx.beginPath();
        ctx.moveTo(VX0, HZ); ctx.lineTo(VX1, HZ);
        let prev = null;
        for (let i = 0; i <= HOR.length; i++) {
          const p = HOR[i % HOR.length];
          const x = horizonX(p[0]);
          if (x == null) { prev = null; continue; }
          const y = HZ - p[1];
          if (prev) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, y); }
          prev = [x, y];
        }
        ctx.stroke();
        // moon (crescent)
        const mx = horizonX(MOON);
        if (mx != null) {
          ctx.beginPath(); ctx.arc(mx, HZ - 150, 16, -Math.PI * 0.6, Math.PI * 0.6, false);
          ctx.arc(mx - 9, HZ - 150, 14, Math.PI * 0.45, -Math.PI * 0.45, true); ctx.stroke();
        }
        // lava
        ctx.beginPath();
        for (const l of lava) {
          const x = horizonX(l.a); if (x == null) continue;
          const y = HZ - l.h;
          ctx.moveTo(x, y); ctx.lineTo(x + l.va * F * 2, y + l.vh * 2);
        }
        ctx.stroke();
      }
      function drawWorld(ctx) {
        ca = Math.cos(pa); sa = Math.sin(pa);
        ctx.strokeStyle = GREEN; ctx.lineWidth = 1.3;
        drawHorizon(ctx);
        ctx.beginPath();
        for (const o of obstacles) drawModel(ctx, M[o.k], o.x, o.z, 0, o.yaw);
        if (enemy) {
          const m = enemy.type === 'super' ? M.superTank : enemy.type === 'missile' ? M.missile : M.tank;
          drawModel(ctx, m, enemy.x, enemy.z, enemy.y, enemy.a);
          if (enemy.type === 'tank') {
            // spinning radar dish
            const r = enemy.radar, c = Math.cos(enemy.a), s = Math.sin(enemy.a);
            const bx = 0 * c + -7 * s, bz = -0 * s + -7 * c;
            const dx = wrapD(enemy.x - px), dz = wrapD(enemy.z - pz);
            const e1 = [Math.cos(r) * 5, Math.sin(r) * 5];
            seg(ctx, view(dx + bx - e1[0], 22, dz + bz - e1[1]), view(dx + bx + e1[0], 22, dz + bz + e1[1]));
            seg(ctx, view(dx + bx - e1[0], 22, dz + bz - e1[1]), view(dx + bx, 24, dz + bz));
            seg(ctx, view(dx + bx + e1[0], 22, dz + bz + e1[1]), view(dx + bx, 24, dz + bz));
          }
        }
        if (saucer) drawModel(ctx, M.saucer, saucer.x, saucer.z, saucer.hop, saucer.spin);
        if (pShell) drawModel(ctx, M.shell, pShell.x, pShell.z, 8, pShell.a, 1.4);
        for (const s of eShells) drawModel(ctx, M.shell, s.x, s.z, 9, s.a, 1.4);
        for (const d of debris) {
          const dx = wrapD(d.x - px), dz = wrapD(d.z - pz);
          seg(ctx, view(dx - d.dx, d.y - d.dy, dz - d.dz), view(dx + d.dx, d.y + d.dy, dz + d.dz));
        }
        for (const p of sparks) {
          const dx = wrapD(p.x - px), dz = wrapD(p.z - pz);
          seg(ctx, view(dx, p.y, dz), view(dx - p.vx, p.y - p.vy, dz - p.vz));
        }
        ctx.stroke();
      }
      function enemyRel() {
        if (!enemy) return null;
        const dx = wrapD(enemy.x - px), dz = wrapD(enemy.z - pz);
        return { d: Math.hypot(dx, dz), a: wrapA(Math.atan2(dx, dz) - pa) };
      }
      function drawReticle(ctx, onTarget) {
        ctx.beginPath(); ctx.strokeStyle = GREEN; ctx.lineWidth = 1.4;
        const y = HZ - 6;
        if (onTarget) {
          ctx.moveTo(CX, y - 70); ctx.lineTo(CX, y - 30); ctx.moveTo(CX - 14, y - 30); ctx.lineTo(CX - 6, y - 22); ctx.moveTo(CX + 14, y - 30); ctx.lineTo(CX + 6, y - 22);
          ctx.moveTo(CX, y + 70); ctx.lineTo(CX, y + 30); ctx.moveTo(CX - 14, y + 30); ctx.lineTo(CX - 6, y + 22); ctx.moveTo(CX + 14, y + 30); ctx.lineTo(CX + 6, y + 22);
        } else {
          ctx.moveTo(CX, y - 70); ctx.lineTo(CX, y - 22); ctx.moveTo(CX - 14, y - 22); ctx.lineTo(CX + 14, y - 22);
          ctx.moveTo(CX - 14, y - 22); ctx.lineTo(CX - 14, y - 14); ctx.moveTo(CX + 14, y - 22); ctx.lineTo(CX + 14, y - 14);
          ctx.moveTo(CX, y + 70); ctx.lineTo(CX, y + 22); ctx.moveTo(CX - 14, y + 22); ctx.lineTo(CX + 14, y + 22);
          ctx.moveTo(CX - 14, y + 22); ctx.lineTo(CX - 14, y + 14); ctx.moveTo(CX + 14, y + 22); ctx.lineTo(CX + 14, y + 14);
        }
        ctx.stroke();
      }
      function drawFrame(ctx) {
        // periscope frame
        ctx.beginPath(); ctx.strokeStyle = GREEN; ctx.lineWidth = 1.6;
        const c = 18;
        ctx.moveTo(VX0 + c, VY0); ctx.lineTo(VX1 - c, VY0); ctx.lineTo(VX1, VY0 + c); ctx.lineTo(VX1, VY1 - c); ctx.lineTo(VX1 - c, VY1);
        ctx.lineTo(VX0 + c, VY1); ctx.lineTo(VX0, VY1 - c); ctx.lineTo(VX0, VY0 + c); ctx.closePath();
        ctx.moveTo(CX - 40, VY0); ctx.lineTo(CX - 30, VY0 + 6); ctx.lineTo(CX + 30, VY0 + 6); ctx.lineTo(CX + 40, VY0);
        ctx.stroke();
      }
      function drawRadar(ctx) {
        const rx = CX, ry = 52, R = 42, RANGE = 1600;
        ctx.beginPath(); ctx.strokeStyle = RED; ctx.lineWidth = 1.3;
        ctx.arc(rx, ry, R, 0, Math.PI * 2);
        ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(-HALF_FOV) * R, ry - Math.cos(-HALF_FOV) * R);
        ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(HALF_FOV) * R, ry - Math.cos(HALF_FOV) * R);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.moveTo(rx + Math.cos(a) * (R - 4), ry + Math.sin(a) * (R - 4)); ctx.lineTo(rx + Math.cos(a) * R, ry + Math.sin(a) * R); }
        ctx.stroke();
        ctx.beginPath(); ctx.globalAlpha = 0.7;
        ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(radarA) * R, ry - Math.cos(radarA) * R);
        ctx.stroke(); ctx.globalAlpha = 1;
        const er = enemyRel();
        if (er && er.d < RANGE) {
          const swept = wrapA(radarA - er.a);
          const glow = swept > 0 && swept < 2.5 ? 1 - swept / 2.5 : 0.15;
          ctx.globalAlpha = Math.max(0.15, glow);
          ctx.fillStyle = RED;
          const r = er.d / RANGE * R;
          ctx.fillRect(rx + Math.sin(er.a) * r - 2, ry - Math.cos(er.a) * r - 2, 4, 4);
          ctx.globalAlpha = 1;
        }
      }
      function drawHud(ctx) {
        drawRadar(ctx);
        ctx.beginPath(); ctx.strokeStyle = RED; ctx.lineWidth = 1.3;
        vtext(ctx, 'SCORE  ' + score, W - 20, 14, 2.2, 'right');
        vtext(ctx, 'HIGH SCORE  ' + hi, W - 20, 36, 1.7, 'right');
        // remaining tanks
        for (let i = 0; i < Math.min(6, lives - (state === 'play' ? 1 : 0)); i++) {
          const x = W - 30 - i * 28, y = 66;
          ctx.moveTo(x - 10, y + 8); ctx.lineTo(x + 10, y + 8); ctx.lineTo(x + 12, y + 3); ctx.lineTo(x - 12, y + 3); ctx.closePath();
          ctx.moveTo(x - 6, y + 3); ctx.lineTo(x - 4, y - 2); ctx.lineTo(x + 4, y - 2); ctx.lineTo(x + 6, y + 3);
          ctx.moveTo(x + 2, y); ctx.lineTo(x + 13, y);
        }
        const er = enemyRel();
        if (state === 'play' && !dead && er) {
          const blink = (api.frame >> 4) & 1;
          if (er.d < 1600) vtext(ctx, 'ENEMY IN RANGE', 20, 14, 2.2);
          if (Math.abs(er.a) > HALF_FOV && blink) {
            const where = Math.abs(er.a) > 2.3 ? 'REAR' : er.a < 0 ? 'LEFT' : 'RIGHT';
            vtext(ctx, 'ENEMY TO ' + where, 20, 36, 2.2);
          }
        }
        if (blockedT > 0 && state === 'play') { vtext(ctx, 'MOTION BLOCKED', 20, 60, 1.8); vtext(ctx, 'BY OBJECT', 20, 76, 1.8); }
        ctx.stroke();
      }
      function prompt() { return api.credits > 0 ? 'PUSH START' : 'INSERT COIN'; }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowBlur = 6; ctx.shadowColor = '#3cff4a';
        ctx.save();
        if (shake > 0) ctx.translate(rnd(-1, 1) * shake * 0.25, rnd(-1, 1) * shake * 0.25);
        ctx.beginPath(); ctx.rect(VX0, VY0, VX1 - VX0, VY1 - VY0); ctx.clip();
        drawWorld(ctx);
        const er = enemyRel();
        const onTarget = er && er.d < 1400 && Math.abs(er.a) < Math.atan(20 / Math.max(1, er.d)) + 0.01 && enemy.y < 34;
        if (state !== 'attract' && !dead) drawReticle(ctx, onTarget);
        if (dead) {
          ctx.beginPath(); ctx.strokeStyle = '#d8ffd8'; ctx.lineWidth = 1.6;
          const grow = Math.min(1, (170 - deadT) / 25);
          for (const c of cracks) {
            const n = Math.max(2, Math.ceil(c.length * grow));
            ctx.moveTo(c[0][0], c[0][1]);
            for (let i = 1; i < n; i++) ctx.lineTo(c[i][0], c[i][1]);
          }
          ctx.stroke();
        }
        ctx.restore();
        drawFrame(ctx);
        ctx.shadowColor = '#ff5050';
        drawHud(ctx);
        ctx.shadowColor = '#3cff4a';
        if (state === 'attract') {
          const blinkOn = coinHold > 0 || (coinFlash > 0 ? (coinFlash % 20) < 12 : (stateT % 60) < 40);
          ctx.beginPath(); ctx.strokeStyle = GREEN;
          if (page === 0) {
            ctx.lineWidth = 2.6; vtext(ctx, 'BATTLEZONE', CX, 150, 9, 'center'); ctx.stroke();
            ctx.beginPath(); ctx.lineWidth = 1.4;
            if (blinkOn) vtext(ctx, prompt(), CX, 360, 3.4, 'center');
            vtext(ctx, 'BONUS TANK AT 15000 AND 100000', CX, 400, 2, 'center');
          } else {
            ctx.lineWidth = 1.4;
            vtext(ctx, 'SCORE', CX, 140, 3.4, 'center');
            vtext(ctx, 'TANK           1000', CX, 300, 2.2, 'center');
            vtext(ctx, 'SUPERTANK      3000', CX, 322, 2.2, 'center');
            vtext(ctx, 'MISSILE        2000', CX, 344, 2.2, 'center');
            vtext(ctx, 'SAUCER         5000', CX, 366, 2.2, 'center');
            if (blinkOn) vtext(ctx, prompt(), CX, 410, 3, 'center');
          }
          vtext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 24, H - 30, 1.8);
          vtext(ctx, '1980 ATARI', W - 24, H - 30, 1.8, 'right');
          ctx.stroke();
        } else if (state === 'gameover') {
          ctx.beginPath(); ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
          vtext(ctx, 'GAME OVER', CX, 170, 6, 'center');
          if (score >= hi && score > 0) { ctx.lineWidth = 1.4; vtext(ctx, 'GREAT SCORE', CX, 230, 3, 'center'); }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      makeField();
      px = 2048; pz = 2048;
      while (blockedAt(px, pz, 50)) px += 60;
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
