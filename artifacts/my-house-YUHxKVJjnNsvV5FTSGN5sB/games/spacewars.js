// Space Wars (Cinematronics, 1977) - from-scratch vector recreation.
// Two ships (the needle and the wedge) duel around a gravity star. Limited fuel and torpedoes, hyperspace.
// 1P vs CPU (ladder of ever-sharper CPU pilots) or 2P head to head (WASD vs arrows), first to N kills.
(function () {
  'use strict';
  const W = 640, H = 480, CX = W / 2, CY = H / 2;

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
  function wdx(d, span) { if (d > span / 2) d -= span; else if (d < -span / 2) d += span; return d; }

  // ---------- shapes (facing +x) ----------
  const NEEDLE = [[16, 0], [-6, -2.5], [-12, -2.5], [-12, 2.5], [-6, 2.5]];
  const NEEDLE_FINS = [[[-6, -2.5], [-12, -6], [-12, -2.5]], [[-6, 2.5], [-12, 6], [-12, 2.5]]];
  const WEDGE = [[12, 0], [-9, -9], [-5, 0], [-9, 9]];
  const WEDGE_IN = [[[4, 0], [-5, -4]], [[4, 0], [-5, 4]]];
  const FLAME_N = [[-12, -1.5], [-19, 0], [-12, 1.5]];
  const FLAME_W = [[-5, -2.5], [-13, 0], [-5, 2.5]];

  const TSPEED = 4.6, TLIFE = 100, ROT = 0.068, THRUST = 0.055, VMAX = 5.2, G = 330;
  const FUEL_MAX = 100, TORPS_MAX = 24, SUN_R = 13;
  const COLORS = ['#9fe8ff', '#ffe08a'];

  ArcadeRegistry.register({
    id: 'spacewars', title: 'Space Wars', year: 1977, maker: 'Cinematronics',
    width: W, height: H, vector: true, pointer: false,
    controls: '1P: Left/Right rotate \u00b7 Up thrust \u00b7 Space fire \u00b7 X/Down hyperspace \u00b7 2P: WASD (S fire, Q hyper) vs Arrows \u00b7 Up/Down+Enter: mode',
    marquee: { bg: '#00040c', fg: '#b8ecff', accent: '#ffe08a' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(0);
      let state = 'attract', stateT = 0, sel = 0, mode = 1;
      let ships = [], torps = [], parts = [], sc = [0, 0], roundT = 0, level = 1, total = 0;
      let timeLeft = 0, msg = '', msgT = 0, coinFlash = 0, overT = 0, winner = -1;
      const stars = [];
      for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, b: Math.random() });
      const prevKeys = [{}, {}];

      function makeShip(i) {
        return {
          i, x: i === 0 ? 110 : W - 110, y: i === 0 ? 110 : H - 110, vx: i === 0 ? 0.6 : -0.6, vy: i === 0 ? -0.35 : 0.35,
          a: i === 0 ? 0 : Math.PI, alive: true, hyp: 0, hypRisk: 0.06, fuel: FUEL_MAX, torps: TORPS_MAX,
          cool: 0, thrust: false, burst: 0
        };
      }
      function newRound() {
        ships = [makeShip(0), makeShip(1)]; torps = []; roundT = 0;
      }
      function skill() {
        // the CPU pilot sharpens with each level won
        const l = state === 'attract' ? 3 : level;
        return {
          turn: Math.min(1, 0.55 + l * 0.08), tol: Math.max(0.07, 0.24 - l * 0.025), fire: Math.min(0.5, 0.05 + l * 0.05),
          noise: Math.max(0.02, 0.3 - l * 0.045), hyp: Math.min(0.06, 0.005 + l * 0.007), dodge: Math.min(0.9, 0.2 + l * 0.12)
        };
      }
      function startGame(m) {
        mode = m; sc = [0, 0]; level = 1; total = 0; state = 'play'; stateT = 0;
        timeLeft = m === 2 ? 60 * 180 : 0;
        newRound(); msg = m === 1 ? 'LEVEL 1' : 'NEEDLE VS WEDGE'; msgT = 120;
        A.melody([[262, .08], [392, .08], [523, .16]], { type: 'square', vol: .14 });
      }
      function tryStart(m) {
        if (api.useCredit()) startGame(m);
        else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.22 }); }
      }

      // ---------- controls ----------
      function edge(i, name, on) { const p = prevKeys[i]; const r = on && !p[name]; p[name] = on; return r; }
      function humanCtl(i, set) {
        let c;
        if (set === 'wasd') c = { l: api.key('KeyA'), r: api.key('KeyD'), t: api.key('KeyW'), f: api.key('KeyS') || api.key('ShiftLeft'), h: api.key('KeyQ') || api.key('KeyE') };
        else if (set === 'arrows') c = { l: api.key('ArrowLeft'), r: api.key('ArrowRight'), t: api.key('ArrowUp'), f: api.key('Space') || api.key('Enter'), h: api.key('KeyX') || api.key('ArrowDown') || api.key('KeyZ') };
        else c = {
          l: api.key('ArrowLeft') || api.key('KeyA'), r: api.key('ArrowRight') || api.key('KeyD'), t: api.key('ArrowUp') || api.key('KeyW'),
          f: api.key('Space') || api.key('KeyS'), h: api.key('KeyX') || api.key('ArrowDown') || api.key('KeyZ') || api.key('KeyQ')
        };
        c.f = edge(i, 'f', c.f); c.h = edge(i, 'h', c.h);
        return c;
      }
      function aiCtl(s, o, sk) {
        const c = { l: false, r: false, t: false, f: false, h: false };
        if (!s.alive || s.hyp) return c;
        const dx = CX - s.x, dy = CY - s.y, d = Math.hypot(dx, dy) || 1;
        const vin = (s.vx * dx + s.vy * dy) / d;
        const tToSun = vin > 0.05 ? (d - 30) / vin : 1e9;
        let desired = null, danger = false;
        if (d < 80 || tToSun < 55) {
          danger = true;
          // swing round onto a tangent heading, a little outward, and burn
          const cross = s.vx * dy - s.vy * dx;
          const base = Math.atan2(-dy, -dx);
          desired = base + (cross > 0 ? -1 : 1) * 1.0;
          if (s.fuel > 0) c.t = Math.abs(angDiff(desired, s.a)) < 0.9;
        } else if (o.alive && !o.hyp) {
          const rx = wdx(o.x - s.x, W), ry = wdx(o.y - s.y, H), dist = Math.hypot(rx, ry);
          const t = dist / TSPEED;
          const px = rx + (o.vx - s.vx) * t, py = ry + (o.vy - s.vy) * t;
          desired = Math.atan2(py, px) + s.aimNoise;
          if (Math.random() < 0.02) s.aimNoise = rnd(-sk.noise, sk.noise);
          const sp = Math.hypot(s.vx, s.vy);
          if (s.burst > 0) { s.burst--; c.t = s.fuel > 15; }
          else if (sp < 0.5 && s.fuel > 35 && Math.random() < 0.012) s.burst = 18;
          const diff = angDiff(desired, s.a);
          if (Math.abs(diff) < sk.tol && dist < 400 && s.torps > 0 && Math.random() < sk.fire) c.f = true;
        } else {
          desired = Math.atan2(dy, dx) + Math.PI / 2;
        }
        if (desired !== null) {
          const diff = angDiff(desired, s.a);
          if (diff > 0.04) c.r = true; else if (diff < -0.04) c.l = true;
        }
        // dodge incoming torpedoes
        if (!danger) for (const tp of torps) {
          if (tp.owner === s.i) continue;
          const rx = wdx(s.x - tp.x, W), ry = wdx(s.y - tp.y, H), dd = Math.hypot(rx, ry);
          if (dd < 70 && (rx * tp.vx + ry * tp.vy) > 0) {
            const rvx = tp.vx - s.vx, rvy = tp.vy - s.vy, rv2 = rvx * rvx + rvy * rvy || 1;
            const tt = (rx * rvx + ry * rvy) / rv2;
            const mx = rx - rvx * tt, my = ry - rvy * tt;
            if (Math.hypot(mx, my) < 12) {
              if (Math.random() < sk.hyp) c.h = true;
              else if (Math.random() < sk.dodge && s.fuel > 5) c.t = true;
            }
          }
        }
        return c;
      }

      // ---------- simulation ----------
      function explode(s) {
        if (!s.alive) return;
        s.alive = false;
        for (let k = 0; k < 26; k++) {
          const a = Math.random() * Math.PI * 2, v = rnd(0.4, 2.8);
          parts.push({ x: s.x, y: s.y, vx: Math.cos(a) * v + s.vx * 0.5, vy: Math.sin(a) * v + s.vy * 0.5, t: rnd(30, 70), c: COLORS[s.i], seg: Math.random() < 0.4 });
        }
        A.noise(1.0, { freq: 1600, slideTo: 60, vol: 0.4 });
        A.tone(120, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 30 });
        if (!roundT) roundT = 150;
      }
      function stepShip(s, c, turnScale) {
        if (!s.alive) return;
        if (s.cool > 0) s.cool--;
        if (s.hyp > 0) {
          s.hyp--;
          if (s.hyp === 0) {
            let tries = 0;
            do { s.x = rnd(30, W - 30); s.y = rnd(30, H - 30); tries++; } while (Math.hypot(s.x - CX, s.y - CY) < 90 && tries < 20);
            s.vx *= 0.5; s.vy *= 0.5;
            A.tone(200, 0.25, { type: 'sine', vol: 0.14, slideTo: 1200 });
            if (Math.random() < s.hypRisk) explode(s);
            s.hypRisk = Math.min(0.75, s.hypRisk + 0.12);
          }
          return;
        }
        if (c.l) s.a -= ROT * turnScale;
        if (c.r) s.a += ROT * turnScale;
        s.thrust = c.t && s.fuel > 0;
        if (s.thrust) {
          s.vx += Math.cos(s.a) * THRUST; s.vy += Math.sin(s.a) * THRUST;
          s.fuel = Math.max(0, s.fuel - 0.22);
          if (api.frame % 6 === s.i * 3 && state !== 'attract') A.noise(0.08, { freq: 300, vol: 0.12 });
        }
        // gravity of the star
        const dx = CX - s.x, dy = CY - s.y, d2 = Math.max(400, dx * dx + dy * dy), d = Math.sqrt(d2);
        const g = G / d2;
        s.vx += dx / d * g; s.vy += dy / d * g;
        const sp = Math.hypot(s.vx, s.vy);
        if (sp > VMAX) { s.vx *= VMAX / sp; s.vy *= VMAX / sp; }
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x += W; else if (s.x >= W) s.x -= W;
        if (s.y < 0) s.y += H; else if (s.y >= H) s.y -= H;
        if (Math.hypot(s.x - CX, s.y - CY) < SUN_R) { explode(s); return; }
        if (c.f && s.torps > 0 && s.cool <= 0 && torps.filter(t => t.owner === s.i).length < 5) {
          const cs = Math.cos(s.a), sn = Math.sin(s.a);
          torps.push({ owner: s.i, x: s.x + cs * 15, y: s.y + sn * 15, vx: s.vx + cs * TSPEED, vy: s.vy + sn * TSPEED, t: TLIFE });
          s.torps--; s.cool = 8;
          if (state !== 'attract') A.tone(s.i ? 1100 : 900, 0.12, { type: 'square', vol: 0.1, slideTo: 260 });
        }
        if (c.h) {
          s.hyp = 50; s.thrust = false;
          if (state !== 'attract') A.tone(1400, 0.3, { type: 'sine', vol: 0.13, slideTo: 150 });
        }
      }
      function sim(ctls, turnScales) {
        for (let i = 0; i < 2; i++) stepShip(ships[i], ctls[i], turnScales[i]);
        for (let k = torps.length - 1; k >= 0; k--) {
          const t = torps[k];
          t.x += t.vx; t.y += t.vy; t.t--;
          if (t.x < 0) t.x += W; else if (t.x >= W) t.x -= W;
          if (t.y < 0) t.y += H; else if (t.y >= H) t.y -= H;
          let dead = t.t <= 0 || Math.hypot(t.x - CX, t.y - CY) < SUN_R;
          if (!dead) for (const s of ships) {
            if (!s.alive || s.hyp) continue;
            if (s.i === t.owner && t.t > TLIFE - 25) continue;
            if (Math.hypot(wdx(s.x - t.x, W), wdx(s.y - t.y, H)) < (s.i === 1 ? 10 : 9)) { explode(s); dead = true; break; }
          }
          if (!dead) for (let j = 0; j < torps.length; j++) {
            const u = torps[j];
            if (u === t || u.owner === t.owner || u.t <= 0) continue;
            if (Math.abs(u.x - t.x) < 4 && Math.abs(u.y - t.y) < 4) { u.t = 0; dead = true; spark(t.x, t.y); break; }
          }
          if (dead) torps.splice(k, 1);
        }
        const a = ships[0], b = ships[1];
        if (a.alive && b.alive && !a.hyp && !b.hyp && Math.hypot(wdx(a.x - b.x, W), wdx(a.y - b.y, H)) < 15) { explode(a); explode(b); }
      }
      function spark(x, y) {
        for (let k = 0; k < 6; k++) { const an = Math.random() * 6.28; parts.push({ x, y, vx: Math.cos(an) * 1.2, vy: Math.sin(an) * 1.2, t: 18, c: '#fff' }); }
        if (state !== 'attract') A.tone(1800, 0.05, { type: 'square', vol: 0.08 });
      }
      function stepParts() {
        for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99; if (--p.t <= 0) parts.splice(k, 1); }
      }
      function attractInit() { state = 'attract'; stateT = 0; newRound(); for (const s of ships) s.aimNoise = 0; }

      function endRound() {
        const alive = ships.filter(s => s.alive);
        let scorer = -1;
        if (alive.length === 1) scorer = alive[0].i;
        if (state === 'attract') { newRound(); return; }
        if (scorer >= 0) {
          sc[scorer]++;
          if (mode === 1 && scorer === 1) {
            total += 100 * level;
            if (total > hi) { hi = total; api.setHiScore(hi); }
          }
          A.melody([[523, .07], [659, .07]], { type: 'square', vol: .1 });
        }
        if (mode === 1) {
          const need = 5;
          if (sc[1] >= need) {
            level++; total += 500 * (level - 1);
            if (total > hi) { hi = total; api.setHiScore(hi); }
            sc = [0, 0]; msg = 'LEVEL ' + level; msgT = 150;
            A.melody([[392, .1], [523, .1], [659, .1], [784, .25]], { type: 'square', vol: .14 });
          } else if (sc[0] >= need) {
            const over = () => { state = 'over'; overT = 0; winner = 0; };
            state = 'hold';
            if (api.offerContinue) api.offerContinue(() => { sc = [0, 0]; state = 'play'; newRound(); msg = 'LEVEL ' + level; msgT = 120; }, over);
            else over();
            return;
          }
        } else {
          if (sc[0] >= 10 || sc[1] >= 10) { state = 'over'; overT = 0; winner = sc[0] > sc[1] ? 0 : 1; A.melody([[392, .15], [494, .15], [587, .15], [784, .4]], { type: 'square', vol: .14 }); return; }
        }
        newRound();
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        stepParts();
        if (state === 'attract') {
          const sk = skill();
          for (const s of ships) if (s.aimNoise === undefined) s.aimNoise = 0;
          sim([aiCtl(ships[0], ships[1], sk), aiCtl(ships[1], ships[0], sk)], [0.9, 0.9]);
          if (roundT > 0 && --roundT === 0) endRound();
          if (api.anyPressed('ArrowUp', 'ArrowDown', 'KeyW')) { sel ^= 1; A.tone(440, 0.04, { vol: 0.1 }); }
          if (api.pressed('Digit1')) tryStart(1);
          else if (api.pressed('Digit2')) tryStart(2);
          else if (api.anyPressed('Enter', 'Space')) tryStart(sel + 1);
          return;
        }
        if (state === 'hold') return;
        if (state === 'over') {
          overT++;
          if (overT > 300 || (overT > 90 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        // play
        let c0, c1, t0 = 1, t1 = 1;
        if (mode === 1) {
          const sk = skill();
          if (ships[0].aimNoise === undefined) ships[0].aimNoise = 0;
          c0 = aiCtl(ships[0], ships[1], sk); t0 = sk.turn;
          c1 = humanCtl(1, 'both');
        } else {
          c0 = humanCtl(0, 'wasd'); c1 = humanCtl(1, 'arrows');
        }
        sim([c0, c1], [t0, t1]);
        if (roundT > 0 && --roundT === 0) endRound();
        if (mode === 2 && state === 'play' && timeLeft > 0) {
          timeLeft--;
          if (timeLeft > 0 && timeLeft <= 600 && timeLeft % 60 === 0) A.tone(880, 0.06, { vol: 0.12 });
          if (timeLeft === 0) {
            state = 'over'; overT = 0; winner = sc[0] === sc[1] ? -1 : (sc[0] > sc[1] ? 0 : 1);
            A.melody([[784, .2], [523, .2], [392, .4]], { type: 'square', vol: .14 });
          }
        }
      }

      // ---------- drawing ----------
      function drawShip(ctx, s, x, y) {
        ctx.strokeStyle = COLORS[s.i]; ctx.beginPath();
        if (s.i === 0) {
          poly(ctx, NEEDLE, x, y, s.a, 1, true);
          for (const f of NEEDLE_FINS) poly(ctx, f, x, y, s.a, 1, false);
          if (s.thrust && (api.frame & 2)) poly(ctx, FLAME_N, x, y, s.a, 1, false);
        } else {
          poly(ctx, WEDGE, x, y, s.a, 1, true);
          for (const f of WEDGE_IN) poly(ctx, f, x, y, s.a, 1, false);
          if (s.thrust && (api.frame & 2)) poly(ctx, FLAME_W, x, y, s.a, 1, false);
        }
        ctx.stroke();
      }
      function drawWrapped(ctx, s) {
        drawShip(ctx, s, s.x, s.y);
        const r = 18;
        if (s.x < r) drawShip(ctx, s, s.x + W, s.y); else if (s.x > W - r) drawShip(ctx, s, s.x - W, s.y);
        if (s.y < r) drawShip(ctx, s, s.x, s.y + H); else if (s.y > H - r) drawShip(ctx, s, s.x, s.y - H);
      }
      function drawSun(ctx) {
        ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 1.4; ctx.beginPath();
        const n = 9, rot = api.frame * 0.13;
        for (let k = 0; k < n; k++) {
          const a = rot + k * Math.PI / n * 2 + Math.random() * 0.4;
          const l = 6 + Math.random() * 9;
          ctx.moveTo(CX - Math.cos(a) * l, CY - Math.sin(a) * l); ctx.lineTo(CX + Math.cos(a) * l, CY + Math.sin(a) * l);
        }
        ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(CX - 2, CY - 2, 4, 4);
      }
      function gauge(ctx, x, y, s, alignRight) {
        // fuel bar and torpedo ticks under each score
        const fw = 60 * (s.fuel / FUEL_MAX);
        ctx.beginPath();
        if (alignRight) { ctx.moveTo(x - fw, y); ctx.lineTo(x, y); } else { ctx.moveTo(x, y); ctx.lineTo(x + fw, y); }
        for (let k = 0; k < s.torps; k++) {
          const tx = alignRight ? x - k * 2.5 : x + k * 2.5;
          ctx.moveTo(tx, y + 6); ctx.lineTo(tx, y + 10);
        }
        ctx.stroke();
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const st of stars) { ctx.fillStyle = st.b > 0.7 ? '#9aa' : '#456'; ctx.fillRect(st.x, st.y, 1.4, 1.4); }
        drawSun(ctx);
        ctx.lineWidth = 1.5;
        for (const s of ships) if (s.alive && !s.hyp) drawWrapped(ctx, s);
        for (const s of ships) if (s.alive && s.hyp > 0 && (api.frame & 4)) {
          ctx.fillStyle = COLORS[s.i]; ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
        }
        for (const t of torps) {
          ctx.fillStyle = COLORS[t.owner];
          ctx.fillRect(t.x - 1.5, t.y - 1.5, 3, 3);
        }
        for (const p of parts) {
          ctx.globalAlpha = Math.min(1, p.t / 30);
          if (p.seg) { ctx.strokeStyle = p.c; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); ctx.stroke(); }
          else { ctx.fillStyle = p.c; ctx.fillRect(p.x - 1, p.y - 1, 2, 2); }
        }
        ctx.globalAlpha = 1;
        // HUD
        ctx.lineWidth = 1.6;
        if (state !== 'attract') {
          ctx.strokeStyle = COLORS[0]; ctx.beginPath(); vtext(ctx, String(sc[0]), 30, 16, 4, 'left'); ctx.stroke();
          ctx.strokeStyle = COLORS[1]; ctx.beginPath(); vtext(ctx, String(sc[1]), W - 30, 16, 4, 'right'); ctx.stroke();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = COLORS[0]; gauge(ctx, 30, 48, ships[0], false);
          ctx.strokeStyle = COLORS[1]; gauge(ctx, W - 30, 48, ships[1], true);
          ctx.strokeStyle = '#ccd'; ctx.beginPath();
          if (mode === 1) {
            vtext(ctx, 'CPU', 30, 64, 1.8, 'left'); vtext(ctx, 'YOU', W - 30, 64, 1.8, 'right');
            vtext(ctx, 'SCORE ' + total, W / 2, 14, 2.2, 'center');
            vtext(ctx, 'LEVEL ' + level + '   HIGH ' + hi, W / 2, 34, 1.6, 'center');
          } else {
            const secs = Math.ceil(timeLeft / 60);
            vtext(ctx, Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'), W / 2, 14, 2.6, 'center');
          }
          ctx.stroke();
          if (msgT > 0 && state === 'play') { ctx.strokeStyle = '#fff'; ctx.beginPath(); vtext(ctx, msg, W / 2, 140, 3.4, 'center'); ctx.stroke(); }
        }
        if (state === 'attract') {
          ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 2.4; ctx.beginPath();
          vtext(ctx, 'SPACE WARS', W / 2, 70, 8, 'center'); ctx.stroke();
          ctx.lineWidth = 1.5; ctx.beginPath();
          const blink = (stateT >> 5) & 1;
          vtext(ctx, (sel === 0 ? '> ' : '  ') + '1 PLAYER VS CPU  ', W / 2, 330, 2.6, 'center');
          vtext(ctx, (sel === 1 ? '> ' : '  ') + '2 PLAYERS        ', W / 2, 352, 2.6, 'center');
          vtext(ctx, 'HIGH SCORE ' + hi, W / 2, 124, 2, 'center');
          ctx.stroke();
          ctx.beginPath(); ctx.strokeStyle = '#ffe08a';
          if (coinFlash > 0) { if ((coinFlash >> 3) & 1) vtext(ctx, 'INSERT COIN', W / 2, 390, 3, 'center'); }
          else if (api.credits > 0) { if (blink) vtext(ctx, 'PUSH START', W / 2, 390, 3, 'center'); }
          else if (blink) vtext(ctx, 'INSERT COIN', W / 2, 390, 3, 'center');
          ctx.stroke();
          ctx.beginPath(); ctx.strokeStyle = '#99a';
          vtext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 20, H - 22, 1.8, 'left');
          vtext(ctx, '(C) 1977 CINEMATRONICS', W - 20, H - 22, 1.8, 'right');
          vtext(ctx, 'BEWARE THE STAR - LIMITED FUEL AND TORPEDOES', W / 2, 430, 1.6, 'center');
          ctx.stroke();
        }
        if (state === 'over') {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
          vtext(ctx, 'GAME OVER', W / 2, 160, 5, 'center');
          let m;
          if (mode === 1) m = 'FINAL SCORE ' + total;
          else m = winner < 0 ? 'DRAW' : (winner === 0 ? 'NEEDLE WINS' : 'WEDGE WINS');
          ctx.lineWidth = 1.5; vtext(ctx, m, W / 2, 210, 3, 'center');
          ctx.stroke();
        }
      }
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
