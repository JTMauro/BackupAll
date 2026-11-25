// Red Baron (Atari, 1980) \u2014 from-scratch vector recreation.
// First-person biplane dogfight in 3D wireframe over mountains: enemy biplanes, blimps and ground targets.
(function () {
  'use strict';
  const W = 640, H = 480, CX = W / 2, CY = H / 2 - 10, FOCAL = 420, NEAR = 2;
  const TAU = Math.PI * 2;

  // ---------- vector font ----------
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

  // ---------- models (local coords: +z forward, +y up, +x right) ----------
  function model(verts, edges) { return { v: verts, e: edges }; }
  const BIPLANE = (() => {
    const v = [], e = [];
    const add = p => (v.push(p), v.length - 1);
    const quad = (a, b, c, d) => { const i = [add(a), add(b), add(c), add(d)]; e.push([i[0], i[1]], [i[1], i[2]], [i[2], i[3]], [i[3], i[0]]); };
    // fuselage: tapered box
    const n0 = add([-1, -1, 6]), n1 = add([1, -1, 6]), n2 = add([1, 1, 6]), n3 = add([-1, 1, 6]);
    const t0 = add([0, -0.3, -9]), t1 = add([0, 0.6, -9]);
    e.push([n0, n1], [n1, n2], [n2, n3], [n3, n0], [n0, t0], [n1, t0], [n2, t1], [n3, t1], [t0, t1]);
    // wings
    quad([-10, 2.6, 3], [10, 2.6, 3], [10, 2.6, 0], [-10, 2.6, 0]);
    quad([-9, -1, 3], [9, -1, 3], [9, -1, 0.5], [-9, -1, 0.5]);
    // struts
    for (const sx of [-6, 6]) { const a = add([sx, -1, 1.5]), b = add([sx, 2.6, 1.5]); e.push([a, b]); }
    // tail
    quad([-3.5, 0, -7], [3.5, 0, -7], [3.5, 0, -9], [-3.5, 0, -9]);
    const f0 = add([0, 0.4, -6.5]), f1 = add([0, 3.5, -8.5]), f2 = add([0, 3.5, -9.2]);
    e.push([f0, f1], [f1, f2], [f2, t1]);
    return model(v, e);
  })();
  const BLIMP = (() => {
    const v = [], e = [], rings = 7, seg = 8, L = 34, R = 11;
    for (let i = 0; i < rings; i++) {
      const z = -L + (2 * L) * (i / (rings - 1)), r = R * Math.sqrt(Math.max(0.05, 1 - (z / (L + 1)) ** 2));
      for (let k = 0; k < seg; k++) { const a = k * TAU / seg; v.push([Math.cos(a) * r, Math.sin(a) * r, z]); }
    }
    for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) {
      const a = i * seg + k;
      e.push([a, i * seg + (k + 1) % seg]);
      if (i < rings - 1) e.push([a, a + seg]);
    }
    const nose = v.length; v.push([0, 0, L + 3]); const tail = v.length; v.push([0, 0, -L - 3]);
    for (let k = 0; k < seg; k++) { e.push([nose, (rings - 1) * seg + k]); e.push([tail, k]); }
    // gondola
    const g = v.length;
    v.push([-2, -R - 4, 6], [2, -R - 4, 6], [2, -R - 4, -6], [-2, -R - 4, -6]);
    e.push([g, g + 1], [g + 1, g + 2], [g + 2, g + 3], [g + 3, g], [g, 3 * seg + 6], [g + 2, 2 * seg + 6]);
    // fins
    const f = v.length;
    v.push([0, R + 6, -L - 2], [0, -R - 6, -L - 2], [R + 6, 0, -L - 2], [-R - 6, 0, -L - 2]);
    e.push([f, seg + 2], [f + 1, seg + 6], [f + 2, seg], [f + 3, seg + 4]);
    return model(v, e);
  })();
  const BUILDING = model(
    [[-10, 0, -10], [10, 0, -10], [10, 0, 10], [-10, 0, 10], [-10, 14, -10], [10, 14, -10], [10, 14, 10], [-10, 14, 10], [0, 24, 0]],
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7], [4, 8], [5, 8], [6, 8], [7, 8]]
  );
  const BUNKER = model(
    [[-12, 0, -8], [12, 0, -8], [12, 0, 8], [-12, 0, 8], [-8, 7, -5], [8, 7, -5], [8, 7, 5], [-8, 7, 5], [0, 7, 0], [0, 9, 9]],
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7], [8, 9]]
  );

  ArcadeRegistry.register({
    id: 'redbaron', title: 'Red Baron', year: 1980, maker: 'Atari',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: bank \u00b7 Up: dive \u00b7 Down: climb \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#04070a', fg: '#ff3030', accent: '#d8f0ff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(20000);
      let state = 'attract', stateT = 0, coinFlash = 0;
      let score = 0, lives = 3, nextExtra = 10000, kills = 0, squadron = 1;
      const me = { x: 0, y: 120, z: 0, yaw: 0, pitch: 0, roll: 0, speed: 3.6, alive: true, inv: 0 };
      let enemies = [], blimps = [], grounds = [], bullets = [], eBullets = [], debris = [], smoke = [];
      let deadT = 0, msg = '', msgT = 0, blimpT = 600, groundT = 120, gunT = 0, gunSide = 0, hitFlash = 0, cracks = [];
      // mountain range on the horizon (fixed, procedural)
      const MOUNT = [];
      (function () {
        let s = 12345; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 72; i++) MOUNT.push(i % 2 ? r() * 0.03 : 0.025 + r() * 0.11 * (i % 6 === 0 ? 1.6 : 1));
      })();

      // ---------- camera ----------
      let cy = 1, sy = 0, cp = 1, sp = 0, cr = 1, sr = 0;
      function setCam() {
        cy = Math.cos(me.yaw); sy = Math.sin(me.yaw); cp = Math.cos(me.pitch); sp = Math.sin(me.pitch); cr = Math.cos(me.roll); sr = Math.sin(me.roll);
      }
      // world-relative vector -> camera space
      function cam(dx, dy, dz) {
        const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
        const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
        return [x1 * cr - y2 * sr, x1 * sr + y2 * cr, z2];
      }
      function proj(p) { return [CX + FOCAL * p[0] / p[2], CY - FOCAL * p[1] / p[2]]; }
      function segment(ctx, a, b) {
        if (a[2] < NEAR && b[2] < NEAR) return;
        if (a[2] < NEAR) { const t = (NEAR - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]; }
        else if (b[2] < NEAR) { const t = (NEAR - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, NEAR]; }
        const p = proj(a), q = proj(b);
        if (Math.abs(p[0]) > 6000 || Math.abs(q[0]) > 6000 || Math.abs(p[1]) > 6000 || Math.abs(q[1]) > 6000) return;
        ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
      }
      // object transform: local -> world
      function toWorld(o, p) {
        const [x, y, z] = p;
        const r = o.roll || 0, pi = o.pitch || 0, ya = o.yaw || 0;
        const x1 = x * Math.cos(r) - y * Math.sin(r), y1 = x * Math.sin(r) + y * Math.cos(r);
        const y2 = y1 * Math.cos(pi) + z * Math.sin(pi), z2 = -y1 * Math.sin(pi) + z * Math.cos(pi);
        const x3 = x1 * Math.cos(ya) + z2 * Math.sin(ya), z3 = -x1 * Math.sin(ya) + z2 * Math.cos(ya);
        return [o.x + x3, o.y + y2, o.z + z3];
      }
      function drawModel(ctx, o, m, sc) {
        const dx0 = o.x - me.x, dz0 = o.z - me.z;
        if (dx0 * dx0 + dz0 * dz0 > 2200 * 2200) return;
        const P = m.v.map(p => { const w = toWorld(o, sc ? [p[0] * sc, p[1] * sc, p[2] * sc] : p); return cam(w[0] - me.x, w[1] - me.y, w[2] - me.z); });
        for (const [i, j] of m.e) segment(ctx, P[i], P[j]);
      }
      function forward(o) { return [Math.sin(o.yaw) * Math.cos(o.pitch || 0), Math.sin(o.pitch || 0), Math.cos(o.yaw) * Math.cos(o.pitch || 0)]; }

      // ---------- spawning ----------
      function ahead(dist, lat) {
        const f = [Math.sin(me.yaw), Math.cos(me.yaw)], r = [Math.cos(me.yaw), -Math.sin(me.yaw)];
        return [me.x + f[0] * dist + r[0] * lat, me.z + f[1] * dist + r[1] * lat];
      }
      function spawnEnemy() {
        const [x, z] = ahead(rnd(700, 1000), rnd(-400, 400));
        enemies.push({ x, y: Math.max(40, me.y + rnd(-50, 60)), z, yaw: me.yaw + Math.PI + rnd(-0.5, 0.5), pitch: 0, roll: 0, speed: 3.2 + Math.min(1.2, squadron * 0.12), mode: 'attack', t: 0, cool: 90, fall: false, prop: 0 });
      }
      function spawnBlimp() {
        const [x, z] = ahead(rnd(1100, 1400), rnd(-500, 500));
        blimps.push({ x, y: rnd(150, 260), z, yaw: me.yaw + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2), pitch: 0, roll: 0, hp: 3, flash: 0 });
      }
      function spawnGround() {
        const [x, z] = ahead(rnd(900, 1200), rnd(-350, 350));
        const bunker = Math.random() < 0.4;
        grounds.push({ x, y: 0, z, yaw: rnd(0, TAU), bunker, cool: 120, hp: bunker ? 2 : 1 });
      }

      function resetPlayer() {
        me.y = 140; me.pitch = 0; me.roll = 0; me.alive = true; me.inv = 120;
        enemies = []; eBullets = []; bullets = []; cracks = [];
        msg = 'SQUADRON ' + squadron; msgT = 120;
      }
      function startGame() {
        state = 'play'; stateT = 0; score = 0; lives = 3; nextExtra = 10000; kills = 0; squadron = 1;
        me.x = 0; me.z = 0; me.yaw = 0; me.speed = 3.6;
        blimps = []; grounds = []; debris = []; smoke = [];
        resetPlayer(); blimpT = 900; groundT = 200;
        A.melody([[392, .12], [392, .12], [523, .12], [659, .24], [523, .12], [659, .3]], { type: 'square', vol: .12 });
      }
      function attractInit() {
        state = 'attract'; stateT = 0; enemies = []; blimps = []; grounds = []; bullets = []; eBullets = []; debris = []; smoke = [];
        me.y = 140; me.pitch = 0; me.roll = 0; me.alive = true; me.speed = 3.6; squadron = 2; cracks = [];
        spawnEnemy(); spawnEnemy(); spawnBlimp(); spawnGround(); spawnGround();
      }
      attractInit();

      function addScore(n) {
        if (state !== 'play') return;
        score += n;
        if (score >= nextExtra) {
          nextExtra += 10000; lives = Math.min(lives + 1, 9);
          A.melody([[784, .08], [988, .08], [1175, .15]], { type: 'square', vol: .14 });
          msg = 'BONUS PLANE'; msgT = 90;
        }
      }
      function explode(o, m, n, vel) {
        const lines = m.e.slice(0, n || 40);
        for (const [i, j] of lines) {
          const a = toWorld(o, m.v[i]), b = toWorld(o, m.v[j]);
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
          debris.push({ x: mx, y: my, z: mz, ax: a[0] - mx, ay: a[1] - my, az: a[2] - mz, vx: (vel ? vel[0] : 0) + rnd(-1.2, 1.2), vy: rnd(-0.3, 1.8), vz: (vel ? vel[2] : 0) + rnd(-1.2, 1.2), t: rnd(60, 110), spin: rnd(-0.15, 0.15) });
        }
        A.noise(0.7, { freq: 900, slideTo: 60, vol: 0.4 });
      }

      // ---------- player ----------
      function updatePlayer(auto) {
        let turn = 0, climb = 0, fireHeld = false;
        if (auto) {
          // demo pilot: chase the nearest enemy
          const e = enemies[0];
          if (e) {
            const d = cam(e.x - me.x, e.y - me.y, e.z - me.z);
            turn = Math.max(-1, Math.min(1, d[0] / Math.max(40, Math.abs(d[2])) * 4));
            climb = Math.max(-1, Math.min(1, (e.y - me.y) / 80));
            fireHeld = d[2] > 0 && Math.abs(d[0]) < d[2] * 0.08 && d[2] < 500;
          }
          if (me.y < 60) climb = 1;
          if (me.y < 20) me.y = 20;
        } else if (me.alive) {
          if (api.key('ArrowLeft')) turn -= 1;
          if (api.key('ArrowRight')) turn += 1;
          if (api.key('ArrowUp')) climb -= 1;
          if (api.key('ArrowDown')) climb += 1;
          fireHeld = api.key('Space');
        }
        if (me.alive) {
          me.roll += (turn * 0.75 - me.roll) * 0.08;
          me.yaw += me.roll * 0.035;
          me.pitch += (climb * 0.45 - me.pitch) * 0.05;
          if (me.y > 420 && me.pitch > 0) me.pitch *= 0.9;
        } else {
          // spinning down
          me.roll += 0.12; me.pitch = Math.max(-0.9, me.pitch - 0.01); me.yaw += 0.02;
        }
        const f = forward(me);
        me.x += f[0] * me.speed; me.y += f[1] * me.speed; me.z += f[2] * me.speed;
        if (me.y > 450) me.y = 450;
        if (me.inv > 0) me.inv--;
        if (gunT > 0) gunT--;
        if (fireHeld && me.alive && gunT <= 0) {
          gunT = 7; gunSide ^= 1;
          const r = [Math.cos(me.yaw), 0, -Math.sin(me.yaw)];
          const off = gunSide ? 1.5 : -1.5;
          bullets.push({ x: me.x + r[0] * off, y: me.y - 1.2, z: me.z + r[2] * off, vx: f[0] * 13, vy: f[1] * 13, vz: f[2] * 13, t: 46 });
          if (!auto) A.noise(0.05, { freq: 2400, vol: 0.12 });
        }
        if (me.y < 3 && me.alive) crash();
        if (!me.alive && me.y < 3) { me.y = 3; me.speed = 0; }
      }
      function crash() {
        if (!me.alive) return;
        me.alive = false; deadT = 150; hitFlash = 20;
        cracks = [];
        for (let i = 0; i < 9; i++) { const a = rnd(0, TAU); cracks.push([CX + rnd(-30, 30), CY + rnd(-30, 30), a, rnd(80, 260)]); }
        A.noise(1.6, { freq: 600, slideTo: 40, vol: 0.5 });
        A.tone(300, 1.5, { type: 'sawtooth', vol: 0.12, slideTo: 40 });
      }

      // ---------- enemies ----------
      function steer(o, tx, ty, tz, rate) {
        const want = Math.atan2(tx - o.x, tz - o.z);
        let d = want - o.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        const t = Math.max(-rate, Math.min(rate, d));
        o.yaw += t; o.roll += (-t * 18 - o.roll) * 0.1;
        const dist = Math.hypot(tx - o.x, tz - o.z) || 1;
        o.pitch += (Math.max(-0.4, Math.min(0.4, (ty - o.y) / dist * 1.5)) - o.pitch) * 0.05;
        return d;
      }
      function updateEnemies(demo) {
        const maxE = Math.min(4, 1 + Math.floor(squadron / 2) + (squadron > 1 ? 1 : 0));
        if (!demo && state === 'play' && me.alive && msgT < 60 && enemies.filter(e => !e.fall).length < maxE && api.frame % 90 === 0) spawnEnemy();
        if (demo && enemies.length < 2) spawnEnemy();
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]; e.t++; e.prop += 0.9;
          if (e.fall) {
            e.roll += 0.15; e.pitch = Math.max(-1, e.pitch - 0.02);
            const f = forward(e); e.x += f[0] * e.speed; e.y += f[1] * e.speed - 0.5; e.z += f[2] * e.speed;
            if (e.t % 3 === 0) smoke.push({ x: e.x, y: e.y, z: e.z, t: 70 });
            if (e.y < 2) { e.y = 2; explode(e, BIPLANE, 30); enemies.splice(i, 1); }
            continue;
          }
          const dx = me.x - e.x, dy = me.y - e.y, dz = me.z - e.z, dist = Math.hypot(dx, dy, dz);
          if (e.mode === 'attack') {
            const d = steer(e, me.x, me.y, me.z, 0.018 + Math.min(0.02, squadron * 0.002));
            if (dist < 70) { e.mode = 'break'; e.t = 0; e.breakDir = Math.random() < 0.5 ? -1 : 1; }
            // fire when the player is in the gunsight
            if (--e.cool <= 0 && dist < 520 && Math.abs(d) < 0.14 && me.alive && !demo) {
              e.cool = Math.max(35, 110 - squadron * 8);
              const lead = dist / 9;
              const mf = forward(me);
              const tx = me.x + mf[0] * me.speed * lead * 0.6 - e.x, ty = me.y + mf[1] * me.speed * lead * 0.6 - e.y, tz = me.z + mf[2] * me.speed * lead * 0.6 - e.z;
              const tl = Math.hypot(tx, ty, tz) || 1, err = Math.max(0.01, 0.05 - squadron * 0.004);
              for (let k = 0; k < 3; k++) eBullets.push({ x: e.x, y: e.y, z: e.z, vx: (tx / tl + rnd(-err, err)) * 9, vy: (ty / tl + rnd(-err, err)) * 9, vz: (tz / tl + rnd(-err, err)) * 9, t: 70 + k * 4, delay: k * 5 });
              A.noise(0.25, { freq: 1600, vol: 0.1 });
            }
          } else {
            // break away, loop round and come back
            e.yaw += 0.025 * e.breakDir; e.roll += (e.breakDir * -0.8 - e.roll) * 0.1;
            e.pitch += ((e.y < 60 ? 0.3 : (e.t < 60 ? 0.25 : -0.1)) - e.pitch) * 0.05;
            if (e.t > 120 + rnd(0, 40)) e.mode = 'attack';
          }
          if (e.y < 25) e.pitch = Math.max(e.pitch, 0.3);
          const f = forward(e); e.x += f[0] * e.speed; e.y += f[1] * e.speed; e.z += f[2] * e.speed;
          if (dist > 1800) enemies.splice(i, 1);
          else if (me.alive && !demo && dist < 9 && !me.inv) { explode(e, BIPLANE, 30); enemies.splice(i, 1); crash(); }
        }
      }
      function updateWorld(demo) {
        // blimps & ground targets
        if (--blimpT <= 0) { blimpT = rnd(1200, 1800); if (blimps.length < 1) spawnBlimp(); }
        if (--groundT <= 0) { groundT = rnd(150, 260); if (grounds.length < 6) spawnGround(); }
        for (let i = blimps.length - 1; i >= 0; i--) {
          const b = blimps[i];
          const f = forward(b); b.x += f[0] * 0.6; b.z += f[2] * 0.6;
          if (b.flash > 0) b.flash--;
          if (Math.hypot(b.x - me.x, b.z - me.z) > 2000) blimps.splice(i, 1);
          else if (me.alive && !demo && !me.inv && Math.abs(b.x - me.x) < 14 && Math.abs(b.z - me.z) < 30 && Math.abs(b.y - me.y) < 14) crash();
        }
        for (let i = grounds.length - 1; i >= 0; i--) {
          const g = grounds[i];
          const d = Math.hypot(g.x - me.x, g.z - me.z);
          if (d > 1600) { grounds.splice(i, 1); continue; }
          // bunkers throw up flak
          if (g.bunker && !demo && me.alive && --g.cool <= 0 && d < 600 && squadron >= 2) {
            g.cool = Math.max(60, 160 - squadron * 10);
            const tx = me.x - g.x, ty = me.y - 9, tz = me.z - g.z, tl = Math.hypot(tx, ty, tz) || 1;
            eBullets.push({ x: g.x, y: 9, z: g.z, vx: tx / tl * 7 + rnd(-0.4, 0.4), vy: ty / tl * 7, vz: tz / tl * 7 + rnd(-0.4, 0.4), t: 110, delay: 0, flak: true });
          }
        }
        // bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.x += b.vx; b.y += b.vy; b.z += b.vz;
          let dead = --b.t <= 0 || b.y < 0;
          if (b.y < 0) smoke.push({ x: b.x, y: 1, z: b.z, t: 20 });
          for (let j = enemies.length - 1; !dead && j >= 0; j--) {
            const e = enemies[j];
            if (!e.fall && Math.hypot(e.x - b.x, e.y - b.y, e.z - b.z) < 11) {
              dead = true; e.fall = true; e.t = 0; kills++;
              addScore(1000);
              A.noise(0.4, { freq: 1200, slideTo: 200, vol: 0.3 });
              A.tone(700, 1.2, { type: 'sawtooth', vol: 0.07, slideTo: 90 });
              if (state === 'play' && kills % 6 === 0) { squadron++; msg = 'SQUADRON ' + squadron; msgT = 120; }
            }
          }
          for (let j = blimps.length - 1; !dead && j >= 0; j--) {
            const k = blimps[j];
            const lx = b.x - k.x, lz = b.z - k.z, ca = Math.cos(k.yaw), sa = Math.sin(k.yaw);
            const ax = lx * ca - lz * sa, az = lx * sa + lz * ca, ay = b.y - k.y;
            if ((ax / 13) ** 2 + (ay / 13) ** 2 + (az / 36) ** 2 < 1) {
              dead = true; k.flash = 6;
              A.tone(200, 0.08, { type: 'square', vol: 0.12 });
              if (--k.hp <= 0) { addScore(2500); explode(k, BLIMP, 60); blimps.splice(j, 1); msg = 'BLIMP 2500'; msgT = 70; }
            }
          }
          for (let j = grounds.length - 1; !dead && j >= 0; j--) {
            const g = grounds[j];
            if (Math.abs(g.x - b.x) < 13 && Math.abs(g.z - b.z) < 13 && b.y < (g.bunker ? 9 : 24)) {
              dead = true;
              if (--g.hp <= 0) { addScore(g.bunker ? 750 : 500); explode(g, g.bunker ? BUNKER : BUILDING, 20); grounds.splice(j, 1); }
            }
          }
          if (dead) bullets.splice(i, 1);
        }
        for (let i = eBullets.length - 1; i >= 0; i--) {
          const b = eBullets[i];
          if (b.delay > 0) { b.delay--; continue; }
          b.x += b.vx; b.y += b.vy; b.z += b.vz;
          if (--b.t <= 0 || b.y < 0) { eBullets.splice(i, 1); continue; }
          if (me.alive && !demo && !me.inv && Math.hypot(b.x - me.x, b.y - me.y, b.z - me.z) < 6) {
            eBullets.splice(i, 1); crash();
          }
        }
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i];
          d.x += d.vx; d.y += d.vy; d.z += d.vz; d.vy -= 0.04;
          const c = Math.cos(d.spin), s = Math.sin(d.spin), nx = d.ax * c - d.az * s; d.az = d.ax * s + d.az * c; d.ax = nx;
          if (d.y < 0) { d.y = 0; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; }
          if (--d.t <= 0) debris.splice(i, 1);
        }
        for (let i = smoke.length - 1; i >= 0; i--) { smoke[i].y += 0.15; if (--smoke[i].t <= 0) smoke.splice(i, 1); }
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        if (hitFlash > 0) hitFlash--;
        if (state === 'attract') {
          updatePlayer(true); updateEnemies(true); updateWorld(true);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 }); }
          }
          return;
        }
        if (state === 'gameover') {
          updateWorld(true);
          if (stateT > 240 || (stateT > 60 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        updatePlayer(false); updateEnemies(false); updateWorld(false);
        // engine drone
        if (me.alive && api.frame % 8 === 0) A.tone(70 + me.pitch * -30, 0.14, { type: 'sawtooth', vol: 0.05 });
        if (!me.alive && --deadT <= 0) {
          lives--;
          if (lives <= 0) {
            deadT = 1e9;
            const end = () => { state = 'gameover'; stateT = 0; if (score > hi) { hi = score; api.setHiScore(score); } };
            if (api.offerContinue) api.offerContinue(() => { lives = 3; me.speed = 3.6; resetPlayer(); }, end); else end();
          } else { me.speed = 3.6; resetPlayer(); }
        }
      }

      // ---------- drawing ----------
      function render(ctx) {
        setCam();
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowBlur = 7; ctx.shadowColor = '#9fd8ff';
        ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 1.2;
        // horizon and mountains (at infinity: rotation only)
        ctx.beginPath();
        const R = 5000;
        let prev = null;
        for (let i = 0; i <= 72; i++) {
          const a = i * TAU / 72, h = MOUNT[i % 72] * R - me.y;
          const p = cam(Math.sin(a) * R, h, Math.cos(a) * R);
          if (prev) segment(ctx, prev, p);
          prev = p;
        }
        prev = null;
        for (let i = 0; i <= 36; i++) {
          const a = i * TAU / 36;
          const p = cam(Math.sin(a) * R, -me.y, Math.cos(a) * R);
          if (prev) segment(ctx, prev, p);
          prev = p;
        }
        ctx.stroke();
        // ground: grid of markers around the plane
        ctx.beginPath(); ctx.strokeStyle = '#6f8fa8';
        const G = 60, gx0 = Math.floor(me.x / G) * G, gz0 = Math.floor(me.z / G) * G;
        for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) {
          const wx = gx0 + i * G, wz = gz0 + j * G;
          const a = cam(wx - me.x - 2, -me.y, wz - me.z), b = cam(wx - me.x + 2, -me.y, wz - me.z);
          if (a[2] > NEAR) segment(ctx, a, b);
        }
        ctx.stroke();
        // ground targets
        ctx.beginPath(); ctx.strokeStyle = '#d8f0ff';
        for (const g of grounds) drawModel(ctx, g, g.bunker ? BUNKER : BUILDING);
        ctx.stroke();
        // blimps
        for (const b of blimps) { ctx.beginPath(); ctx.strokeStyle = b.flash ? '#ffffff' : '#bfe0ff'; ctx.lineWidth = b.flash ? 2 : 1.1; drawModel(ctx, b, BLIMP); ctx.stroke(); }
        // enemy biplanes (the Baron's red)
        ctx.lineWidth = 1.3;
        for (const e of enemies) {
          ctx.beginPath(); ctx.strokeStyle = e.fall ? '#ff9090' : '#ff5050'; ctx.shadowColor = '#ff4040';
          drawModel(ctx, e, BIPLANE);
          const pa = toWorld(e, [Math.cos(e.prop) * 2.5, Math.sin(e.prop) * 2.5, 6.3]), pb = toWorld(e, [-Math.cos(e.prop) * 2.5, -Math.sin(e.prop) * 2.5, 6.3]);
          segment(ctx, cam(pa[0] - me.x, pa[1] - me.y, pa[2] - me.z), cam(pb[0] - me.x, pb[1] - me.y, pb[2] - me.z));
          ctx.stroke();
        }
        ctx.shadowColor = '#9fd8ff';
        // debris
        ctx.beginPath(); ctx.strokeStyle = '#ffd0a0';
        for (const d of debris) segment(ctx, cam(d.x + d.ax - me.x, d.y + d.ay - me.y, d.z + d.az - me.z), cam(d.x - d.ax - me.x, d.y - d.ay - me.y, d.z - d.az - me.z));
        ctx.stroke();
        // bullets and smoke as dots
        ctx.fillStyle = '#ffffff';
        for (const b of bullets) { const p = cam(b.x - me.x, b.y - me.y, b.z - me.z); if (p[2] > NEAR) { const q = proj(p); ctx.fillRect(q[0] - 1.2, q[1] - 1.2, 2.4, 2.4); } }
        ctx.fillStyle = '#ffb060';
        for (const b of eBullets) if (!b.delay) { const p = cam(b.x - me.x, b.y - me.y, b.z - me.z); if (p[2] > NEAR) { const q = proj(p), s = Math.max(1.5, Math.min(6, 300 / p[2])); ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s); } }
        ctx.fillStyle = '#8090a0';
        for (const s of smoke) { const p = cam(s.x - me.x, s.y - me.y, s.z - me.z); if (p[2] > NEAR) { const q = proj(p), z = Math.max(1, Math.min(8, 400 / p[2])); ctx.globalAlpha = s.t / 70; ctx.fillRect(q[0] - z / 2, q[1] - z / 2, z, z); } }
        ctx.globalAlpha = 1;
        // cockpit: upper wing, struts, twin guns, gunsight
        if (state !== 'gameover') {
          ctx.beginPath(); ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 1.6;
          ctx.moveTo(0, 22); ctx.lineTo(W, 22); ctx.moveTo(0, 46); ctx.lineTo(W, 46);
          ctx.moveTo(W / 2 - 40, 46); ctx.lineTo(W / 2 - 40, 22); ctx.moveTo(W / 2 + 40, 46); ctx.lineTo(W / 2 + 40, 22);
          ctx.moveTo(60, 46); ctx.lineTo(10, H); ctx.moveTo(W - 60, 46); ctx.lineTo(W - 10, H);
          ctx.moveTo(120, 46); ctx.lineTo(80, H); ctx.moveTo(W - 120, 46); ctx.lineTo(W - 80, H);
          // machine guns
          for (const s of [-1, 1]) {
            const gx = CX + s * 34;
            ctx.moveTo(gx - 6, H); ctx.lineTo(gx - 3, H - 70); ctx.lineTo(gx + 3, H - 70); ctx.lineTo(gx + 6, H);
            ctx.moveTo(gx - 3, H - 60); ctx.lineTo(gx + 3, H - 60);
            if (gunT > 4) { ctx.moveTo(gx - 6, H - 76); ctx.lineTo(gx, H - 88); ctx.lineTo(gx + 6, H - 76); }
          }
          // gunsight
          ctx.moveTo(CX + 14, CY); ctx.arc(CX, CY, 14, 0, TAU);
          ctx.moveTo(CX - 24, CY); ctx.lineTo(CX - 8, CY); ctx.moveTo(CX + 8, CY); ctx.lineTo(CX + 24, CY);
          ctx.moveTo(CX, CY - 24); ctx.lineTo(CX, CY - 8); ctx.moveTo(CX, CY + 8); ctx.lineTo(CX, CY + 24);
          ctx.stroke();
        }
        // shattered windscreen when shot down
        if (cracks.length && !me.alive) {
          ctx.beginPath(); ctx.strokeStyle = '#ffffff';
          for (const [x, y, a, l] of cracks) { ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + 10); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
          ctx.stroke();
        }
        if (hitFlash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (hitFlash / 40) + ')'; ctx.fillRect(0, 0, W, H); }
        // HUD
        ctx.beginPath(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
        vtext(ctx, String(score).padStart(6, '0'), 16, 4, 2.4);
        vtext(ctx, 'HI ' + hi, W / 2, 4, 2, 'center');
        if (state === 'play') {
          for (let i = 0; i < Math.min(lives, 8); i++) { const x = W - 30 - i * 26; ctx.moveTo(x - 9, 9); ctx.lineTo(x + 9, 9); ctx.moveTo(x - 7, 14); ctx.lineTo(x + 7, 14); ctx.moveTo(x, 6); ctx.lineTo(x, 17); ctx.moveTo(x - 3, 17); ctx.lineTo(x + 3, 17); }
          // altimeter
          vtext(ctx, 'ALT ' + Math.max(0, Math.round(me.y * 5)), 16, H - 24, 1.8);
          if (me.alive && me.y < 40 && (api.frame & 16)) vtext(ctx, 'PULL UP', CX, CY + 60, 2.6, 'center');
          if (msgT > 0) vtext(ctx, msg, CX, 140, 3.4, 'center');
          if (!me.alive && deadT < 120) vtext(ctx, lives > 1 ? 'SHOT DOWN' : 'LAST PLANE', CX, 180, 4, 'center');
        }
        if (state === 'attract') {
          const ph = Math.floor(stateT / 420) % 2;
          const prompt = api.credits > 0 ? 'PUSH START' : 'INSERT COIN';
          const blinkOn = coinFlash > 0 ? (coinFlash % 20) < 14 : (stateT % 60) < 40;
          ctx.stroke(); ctx.beginPath();
          if (ph === 0) {
            ctx.strokeStyle = '#ff5050'; ctx.lineWidth = 2.4; ctx.shadowColor = '#ff3030';
            vtext(ctx, 'RED BARON', CX, 100, 9, 'center'); ctx.stroke(); ctx.beginPath();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.shadowColor = '#9fd8ff';
            vtext(ctx, 'WORLD WAR I AIR COMBAT', CX, 170, 2.6, 'center');
          } else {
            vtext(ctx, 'SCORING', CX, 90, 4, 'center');
            vtext(ctx, 'BIPLANE      1000', CX, 150, 2.6, 'center');
            vtext(ctx, 'BLIMP        2500', CX, 180, 2.6, 'center');
            vtext(ctx, 'BUNKER        750', CX, 210, 2.6, 'center');
            vtext(ctx, 'BUILDING      500', CX, 240, 2.6, 'center');
            vtext(ctx, 'BONUS PLANE EVERY 10000', CX, 280, 2.2, 'center');
          }
          if (blinkOn) vtext(ctx, prompt, CX, 330, 3.6, 'center');
          vtext(ctx, 'CREDIT ' + String(Math.min(api.credits, 99)).padStart(2, '0'), CX, 380, 2.2, 'center');
          vtext(ctx, '\u00a9 1980 ATARI', CX, 404, 2, 'center');
        } else if (state === 'gameover') {
          vtext(ctx, 'GAME OVER', CX, 180, 6, 'center');
          vtext(ctx, 'ENEMY PLANES ' + kills, CX, 260, 2.6, 'center');
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      return { update, render };
    }
  });
})();
