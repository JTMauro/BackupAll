// Rip Off (Cinematronics, 1980) - from-scratch vector recreation.
// Guard the fuel canisters in the middle of the field from waves of pirate tanks that try to tow them
// off the edge of the screen. The game ends when the last canister is gone.
// 1P, 1P with a CPU wingman, or 2P co-op (arrows vs WASD).
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

  // ---------- shapes (facing +x) ----------
  const TANK = [[[10, 0], [-8, -8], [-4, 0], [-8, 8], [10, 0]], [[-2, -3], [-2, 3]], [[3, -1.5], [3, 1.5]]];
  const FLAME = [[-6, -2], [-12, 0], [-6, 2]];
  // eight pirate hull styles; a new style rolls in as the waves advance
  const PIRATES = [
    [[[9, 0], [-7, -7], [-7, 7], [9, 0]], [[-7, 0], [2, 0]]],
    [[[9, -3], [9, 3], [-7, 7], [-7, -7], [9, -3]], [[-3, -5], [-3, 5]]],
    [[[10, 0], [0, -7], [-8, -7], [-4, 0], [-8, 7], [0, 7], [10, 0]]],
    [[[9, 0], [2, -6], [-8, -6], [-8, 6], [2, 6], [9, 0]], [[2, -6], [2, 6]]],
    [[[10, 0], [-6, -9], [-2, 0], [-6, 9], [10, 0]], [[-2, 0], [-9, 0]]],
    [[[8, -2], [8, 2], [0, 8], [-8, 4], [-8, -4], [0, -8], [8, -2]]],
    [[[10, 0], [-8, -4], [-8, 4], [10, 0]], [[-2, -2], [-6, -8]], [[-2, 2], [-6, 8]]],
    [[[10, 0], [4, -4], [-8, -8], [-4, 0], [-8, 8], [4, 4], [10, 0]], [[4, -4], [4, 4]]]
  ];
  const CAN = [[0, -7], [6.5, 4.5], [-6.5, 4.5]];
  const PCOL = ['#f2f6ff', '#9dffb8', '#7fd0ff'];
  const PIRATE_COL = '#ff9a6a';

  ArcadeRegistry.register({
    id: 'ripoff', title: 'Rip Off', year: 1980, maker: 'Cinematronics',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up: thrust \u00b7 Down: brake \u00b7 Space: fire \u00b7 P2: A/D, W, S fire \u00b7 Up/Down+Enter: mode',
    marquee: { bg: '#020604', fg: '#e8fff0', accent: '#ff9a6a' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(0);
      let state = 'attract', stateT = 0, sel = 0, mode = 0; // mode 0 = 1P, 1 = 1P + wingman, 2 = 2P
      let players = [], pirates = [], cans = [], shots = [], debris = [], wave = 0, waveT = 0, msgT = 0;
      let coinFlash = 0, overT = 0, pirateLeft = 0;
      const prev = [{}, {}];

      function resetCans() {
        cans = [];
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2, r = i % 2 ? 34 : 22;
          cans.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r * 0.85, carrier: null, a: 0 });
        }
      }
      function makePlayer(i, ai) {
        return {
          i, ai, x: CX + (i === 0 ? -90 : 90), y: CY + 70, vx: 0, vy: 0, a: -Math.PI / 2,
          alive: true, respawn: 0, score: 0, thrust: false, cool: 0, target: null
        };
      }
      function pirateValue() { return 10 * (1 + Math.floor((wave - 1) / 2)); }
      function spawnWave() {
        wave++;
        const n = Math.min(6, 2 + Math.floor((wave - 1) / 2));
        pirates = [];
        for (let k = 0; k < n; k++) {
          const side = (k + wave) % 4;
          let x, y;
          if (side === 0) { x = -12; y = rnd(40, H - 40); }
          else if (side === 1) { x = W + 12; y = rnd(40, H - 40); }
          else if (side === 2) { x = rnd(40, W - 40); y = -12; }
          else { x = rnd(40, W - 40); y = H + 12; }
          pirates.push({
            x, y, a: Math.atan2(CY - y, CX - x), sp: Math.min(2.3, 0.95 + wave * 0.07) * rnd(0.9, 1.1),
            turn: Math.min(0.07, 0.03 + wave * 0.003), can: null, target: null, alive: true, delay: k * 50,
            hunter: wave >= 2 && Math.random() < Math.min(0.45, 0.1 + wave * 0.04) ? rnd(200, 420) : 0,
            fireT: rnd(80, 200), style: (wave - 1 + Math.floor(k / 2)) % PIRATES.length, wob: rnd(0, 6)
          });
        }
        pirateLeft = n;
        msgT = 90;
        A.melody([[330, .06], [440, .06], [554, .1]], { type: 'square', vol: .1 });
      }
      function startGame(m) {
        mode = m; state = 'play'; stateT = 0; wave = 0; waveT = 0;
        resetCans(); shots = []; debris = [];
        players = [makePlayer(0, false)];
        if (m === 1) players.push(makePlayer(1, true));
        if (m === 2) players.push(makePlayer(1, false));
        spawnWave();
      }
      function tryStart(m) {
        if (api.useCredit()) startGame(m);
        else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.22 }); }
      }
      function attractInit() {
        state = 'attract'; stateT = 0; wave = 0; resetCans(); shots = []; debris = [];
        players = [makePlayer(0, true), makePlayer(1, true)];
        spawnWave();
      }

      // ---------- helpers ----------
      function burst(x, y, col, n) {
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2, v = rnd(0.5, 2.5);
          debris.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: rnd(3, 8), rot: rnd(-0.2, 0.2), a: rnd(0, 6), t: rnd(30, 60), c: col });
        }
      }
      function boom(big) {
        if (state === 'attract') return;
        A.noise(big ? 0.9 : 0.5, { freq: big ? 1200 : 2200, slideTo: 80, vol: big ? 0.4 : 0.3 });
      }
      function freeCans() { return cans.filter(c => !c.carrier && !c.claim); }
      function killPirate(p, by) {
        if (!p.alive) return;
        p.alive = false; pirateLeft--;
        if (p.can) { p.can.carrier = null; p.can = null; }
        if (p.target) { p.target.claim = null; p.target = null; }
        burst(p.x, p.y, PIRATE_COL, 14); boom(false);
        if (by && state === 'play') {
          by.score += pirateValue();
          if (!by.ai || mode !== 1) if (by.score > hi) { hi = by.score; api.setHiScore(hi); }
        }
      }
      function killPlayer(pl) {
        if (!pl.alive) return;
        pl.alive = false; pl.respawn = 130; burst(pl.x, pl.y, PCOL[pl.ai ? 2 : pl.i], 18); boom(true);
      }

      // ---------- players ----------
      function edge(i, k, on) { const r = on && !prev[i][k]; prev[i][k] = on; return r; }
      function humanCtl(pl) {
        if (pl.i === 0) {
          const two = mode === 2;
          return {
            l: api.key('ArrowLeft') || (!two && api.key('KeyA')), r: api.key('ArrowRight') || (!two && api.key('KeyD')),
            t: api.key('ArrowUp') || (!two && api.key('KeyW')), b: api.key('ArrowDown'),
            f: edge(0, 'f', api.key('Space') || api.key('KeyX') || (!two && api.key('KeyS')))
          };
        }
        return { l: api.key('KeyA'), r: api.key('KeyD'), t: api.key('KeyW'), b: false, f: edge(1, 'f', api.key('KeyS') || api.key('ShiftLeft') || api.key('KeyQ')) };
      }
      function aiCtl(pl) {
        const c = { l: false, r: false, t: false, b: false, f: false };
        // choose a target: pirates towing canisters first, then the nearest pirate
        let best = null, bs = 1e9;
        for (const p of pirates) {
          if (!p.alive || p.delay > 0) continue;
          const d = Math.hypot(p.x - pl.x, p.y - pl.y) - (p.can ? 220 : 0);
          if (d < bs) { bs = d; best = p; }
        }
        let desired, dist = 0;
        if (best) {
          const dx = best.x - pl.x, dy = best.y - pl.y; dist = Math.hypot(dx, dy);
          const t = dist / 6;
          const pvx = Math.cos(best.a) * best.sp, pvy = Math.sin(best.a) * best.sp;
          desired = Math.atan2(dy + pvy * t, dx + pvx * t);
          const diff = angDiff(desired, pl.a);
          if (Math.abs(diff) < 0.12 && dist < 300) c.f = Math.random() < 0.3;
          if (dist > 170 && Math.abs(diff) < 0.5) c.t = true;
          if (dist < 60) c.b = true;
        } else {
          const gx = CX + (pl.i ? 70 : -70) - pl.x, gy = CY + 60 - pl.y; dist = Math.hypot(gx, gy);
          desired = dist > 20 ? Math.atan2(gy, gx) : -Math.PI / 2;
          if (dist > 30 && Math.abs(angDiff(desired, pl.a)) < 0.4) c.t = true;
          if (dist < 30) c.b = true;
        }
        const diff = angDiff(desired, pl.a);
        if (diff > 0.05) c.r = true; else if (diff < -0.05) c.l = true;
        return c;
      }
      function stepPlayer(pl) {
        if (!pl.alive) {
          if (--pl.respawn <= 0) {
            const sx = CX + (pl.i ? 90 : -90), sy = CY + 70;
            const clear = pirates.every(p => !p.alive || Math.hypot(p.x - sx, p.y - sy) > 70);
            if (clear) { Object.assign(pl, { x: sx, y: sy, vx: 0, vy: 0, a: -Math.PI / 2, alive: true }); }
          }
          return;
        }
        const c = pl.ai ? aiCtl(pl) : humanCtl(pl);
        if (pl.cool > 0) pl.cool--;
        if (c.l) pl.a -= 0.065;
        if (c.r) pl.a += 0.065;
        pl.thrust = c.t;
        if (c.t) {
          pl.vx += Math.cos(pl.a) * 0.11; pl.vy += Math.sin(pl.a) * 0.11;
          if (!pl.ai && api.frame % 8 === 0 && state === 'play') A.noise(0.07, { freq: 220, vol: 0.12 });
        }
        const fr = c.b ? 0.9 : 0.975;
        pl.vx *= fr; pl.vy *= fr;
        const sp = Math.hypot(pl.vx, pl.vy);
        if (sp > 3.4) { pl.vx *= 3.4 / sp; pl.vy *= 3.4 / sp; }
        pl.x += pl.vx; pl.y += pl.vy;
        if (pl.x < 0) pl.x += W; else if (pl.x >= W) pl.x -= W;
        if (pl.y < 0) pl.y += H; else if (pl.y >= H) pl.y -= H;
        if (c.f && pl.cool <= 0 && shots.filter(s => s.owner === pl).length < 2) {
          const cs = Math.cos(pl.a), sn = Math.sin(pl.a);
          shots.push({ owner: pl, x: pl.x + cs * 11, y: pl.y + sn * 11, vx: cs * 6.2 + pl.vx * 0.5, vy: sn * 6.2 + pl.vy * 0.5, t: 48, enemy: false });
          pl.cool = 7;
          if (state === 'play') A.tone(pl.i ? 760 : 620, 0.09, { type: 'square', vol: 0.11, slideTo: 180 });
        }
      }

      // ---------- pirates ----------
      function nearestExit(p) {
        const opts = [[-30, p.y, p.x], [W + 30, p.y, W - p.x], [p.x, -30, p.y], [p.x, H + 30, H - p.y]];
        opts.sort((a, b) => a[2] - b[2]);
        return opts[0];
      }
      function stepPirate(p) {
        if (!p.alive) return;
        if (p.delay > 0) { p.delay--; return; }
        let tx, ty, speed = p.sp;
        const live = players.filter(q => q.alive);
        if (p.can) {
          const ex = nearestExit(p); tx = ex[0]; ty = ex[1]; speed = p.sp * 0.78;
        } else {
          if (p.hunter > 0) p.hunter--;
          if (p.target && (p.target.carrier || p.target.claim !== p)) p.target = null;
          if (!p.target && p.hunter <= 0) {
            let best = null, bd = 1e9;
            for (const c of freeCans()) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
            if (best) { p.target = best; best.claim = p; }
          }
          if (p.target) { tx = p.target.x; ty = p.target.y; }
          else if (live.length) {
            let q = live[0];
            for (const o of live) if (Math.hypot(o.x - p.x, o.y - p.y) < Math.hypot(q.x - p.x, q.y - p.y)) q = o;
            tx = q.x; ty = q.y; speed = p.sp * 1.1;
          } else { tx = CX + Math.cos(p.wob) * 150; ty = CY + Math.sin(p.wob) * 120; p.wob += 0.005; }
        }
        // weave a little, like the original's pirates
        const desired = Math.atan2(ty - p.y, tx - p.x) + Math.sin((api.frame + p.wob * 50) * 0.03) * 0.25;
        const diff = angDiff(desired, p.a);
        p.a += Math.max(-p.turn, Math.min(p.turn, diff));
        const go = Math.abs(diff) < 1.2 ? speed : speed * 0.3;
        p.x += Math.cos(p.a) * go; p.y += Math.sin(p.a) * go;
        // keep apart
        for (const o of pirates) {
          if (o === p || !o.alive || o.delay > 0) continue;
          const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
          if (d < 18 && d > 0.01) { p.x += dx / d * 0.6; p.y += dy / d * 0.6; }
        }
        if (p.target && !p.can && Math.hypot(p.target.x - p.x, p.target.y - p.y) < 11) {
          p.can = p.target; p.can.carrier = p; p.can.claim = null; p.target = null;
          if (state === 'play') A.tone(180, 0.18, { type: 'sawtooth', vol: 0.12, slideTo: 90 });
        }
        if (p.can) {
          p.can.x = p.x - Math.cos(p.a) * 15; p.can.y = p.y - Math.sin(p.a) * 15; p.can.a = p.a;
          if (p.x < -24 || p.x > W + 24 || p.y < -24 || p.y > H + 24) {
            // escaped with a canister: it is gone for good
            const ci = cans.indexOf(p.can); if (ci >= 0) cans.splice(ci, 1); p.can = null; p.alive = false; pirateLeft--;
            if (state === 'play') A.melody([[220, .1], [165, .1], [110, .2]], { type: 'square', vol: .14 });
          }
        }
        // later waves fire back
        if (wave >= 3 && live.length && --p.fireT <= 0) {
          p.fireT = rnd(Math.max(50, 150 - wave * 8), Math.max(90, 260 - wave * 10));
          const q = live[(Math.random() * live.length) | 0];
          const ang = Math.atan2(q.y - p.y, q.x - p.x);
          if (Math.abs(angDiff(ang, p.a)) < 0.9 && Math.hypot(q.x - p.x, q.y - p.y) < 320) {
            shots.push({ owner: p, x: p.x + Math.cos(p.a) * 10, y: p.y + Math.sin(p.a) * 10, vx: Math.cos(ang) * 4.2, vy: Math.sin(ang) * 4.2, t: 70, enemy: true });
            if (state === 'play') A.tone(300, 0.08, { type: 'sawtooth', vol: 0.08, slideTo: 120 });
          }
        }
        // ramming
        for (const q of players) {
          if (q.alive && Math.hypot(q.x - p.x, q.y - p.y) < 14) { killPlayer(q); killPirate(p, null); }
        }
      }

      function stepShots() {
        for (let k = shots.length - 1; k >= 0; k--) {
          const s = shots[k];
          s.x += s.vx; s.y += s.vy; s.t--;
          let dead = s.t <= 0 || s.x < -5 || s.x > W + 5 || s.y < -5 || s.y > H + 5;
          if (!dead && !s.enemy) for (const p of pirates) {
            if (p.alive && p.delay <= 0 && Math.hypot(p.x - s.x, p.y - s.y) < 11) { killPirate(p, s.owner); dead = true; break; }
          }
          if (!dead && s.enemy) for (const q of players) {
            if (q.alive && Math.hypot(q.x - s.x, q.y - s.y) < 9) { killPlayer(q); dead = true; break; }
          }
          if (dead) shots.splice(k, 1);
        }
      }
      function stepDebris() {
        for (let k = debris.length - 1; k >= 0; k--) { const d = debris[k]; d.x += d.vx; d.y += d.vy; d.vx *= 0.97; d.vy *= 0.97; d.a += d.rot; if (--d.t <= 0) debris.splice(k, 1); }
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        stepDebris();
        if (state === 'over') {
          overT++;
          if (overT > 300 || (overT > 90 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (state === 'hold') return;
        for (const pl of players) stepPlayer(pl);
        for (const p of pirates) stepPirate(p);
        stepShots();
        if (state === 'attract') {
          if (cans.length === 0 || stateT > 60 * 60) attractInit();
          if (api.anyPressed('ArrowUp')) { sel = (sel + 2) % 3; A.tone(440, 0.04, { vol: 0.1 }); }
          if (api.anyPressed('ArrowDown')) { sel = (sel + 1) % 3; A.tone(440, 0.04, { vol: 0.1 }); }
          if (api.pressed('Digit1')) tryStart(0);
          else if (api.pressed('Digit2')) tryStart(2);
          else if (api.anyPressed('Enter', 'Space')) tryStart(sel);
        }
        if (cans.length === 0 && state === 'play') {
          state = 'hold';
          const over = () => { state = 'over'; overT = 0; A.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: .14 }); };
          if (api.offerContinue) api.offerContinue(() => { state = 'play'; resetCans(); for (const p of pirates) { p.target = null; p.can = null; } msgT = 90; }, over);
          else over();
          return;
        }
        if (pirateLeft <= 0) {
          if (waveT === 0) waveT = 100;
          if (--waveT <= 0) { waveT = 0; shots = shots.filter(s => !s.enemy); spawnWave(); }
        }
      }

      // ---------- drawing ----------
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.5;
        // canisters
        ctx.strokeStyle = '#ffe36a'; ctx.beginPath();
        for (const c of cans) { poly(ctx, CAN, c.x, c.y, c.a, 1, true); poly(ctx, [[0, -2.5], [2, 1.5], [-2, 1.5]], c.x, c.y, c.a, 1, true); }
        ctx.stroke();
        // tow lines
        ctx.strokeStyle = '#806a40'; ctx.lineWidth = 1; ctx.beginPath();
        for (const p of pirates) if (p.alive && p.can) { ctx.moveTo(p.x - Math.cos(p.a) * 6, p.y - Math.sin(p.a) * 6); ctx.lineTo(p.can.x, p.can.y); }
        ctx.stroke();
        ctx.lineWidth = 1.5;
        // pirates
        ctx.strokeStyle = PIRATE_COL; ctx.beginPath();
        for (const p of pirates) if (p.alive && p.delay <= 0) for (const seg of PIRATES[p.style]) poly(ctx, seg, p.x, p.y, p.a, 1, false);
        ctx.stroke();
        // players
        for (const pl of players) {
          if (!pl.alive) continue;
          ctx.strokeStyle = PCOL[pl.ai && state !== 'attract' ? 2 : pl.i]; ctx.beginPath();
          for (const seg of TANK) poly(ctx, seg, pl.x, pl.y, pl.a, 1, false);
          if (pl.thrust && (api.frame & 2)) poly(ctx, FLAME, pl.x, pl.y, pl.a, 1, false);
          ctx.stroke();
        }
        // shots
        for (const s of shots) { ctx.fillStyle = s.enemy ? PIRATE_COL : '#fff'; ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); }
        // debris
        ctx.lineWidth = 1.2;
        for (const d of debris) {
          ctx.globalAlpha = Math.min(1, d.t / 25); ctx.strokeStyle = d.c; ctx.beginPath();
          ctx.moveTo(d.x - Math.cos(d.a) * d.l / 2, d.y - Math.sin(d.a) * d.l / 2); ctx.lineTo(d.x + Math.cos(d.a) * d.l / 2, d.y + Math.sin(d.a) * d.l / 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.lineWidth = 1.6;
        if (state !== 'attract') {
          ctx.strokeStyle = PCOL[0]; ctx.beginPath(); vtext(ctx, String(players[0].score), 24, 14, 3.4, 'left'); ctx.stroke();
          if (players[1]) { ctx.strokeStyle = PCOL[players[1].ai ? 2 : 1]; ctx.beginPath(); vtext(ctx, String(players[1].score), W - 24, 14, 3.4, 'right'); ctx.stroke(); }
          ctx.strokeStyle = '#bbc'; ctx.lineWidth = 1.2; ctx.beginPath();
          vtext(ctx, 'HIGH ' + hi, W / 2, 14, 1.8, 'center');
          vtext(ctx, 'WAVE ' + wave + '   ' + pirateValue() + ' PTS', W / 2, 32, 1.5, 'center');
          if (players[1] && players[1].ai) vtext(ctx, 'WINGMAN', W - 24, 40, 1.5, 'right');
          ctx.stroke();
          if (msgT > 0 && state === 'play') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.beginPath(); vtext(ctx, 'WAVE ' + wave, W / 2, 120, 4, 'center'); ctx.stroke(); }
        }
        if (state === 'attract') {
          ctx.strokeStyle = '#e8fff0'; ctx.lineWidth = 2.6; ctx.beginPath();
          vtext(ctx, 'RIP OFF', W / 2, 60, 9, 'center'); ctx.stroke();
          ctx.lineWidth = 1.5; ctx.beginPath();
          const opts = ['1 PLAYER', '1 PLAYER + WINGMAN', '2 PLAYERS CO-OP'];
          for (let i = 0; i < 3; i++) vtext(ctx, (sel === i ? '> ' : '  ') + opts[i].padEnd(19, ' '), W / 2, 330 + i * 20, 2.4, 'center');
          vtext(ctx, 'HIGH SCORE ' + hi, W / 2, 124, 2, 'center');
          ctx.stroke();
          const blink = (stateT >> 5) & 1;
          ctx.beginPath(); ctx.strokeStyle = '#ffe36a';
          if (coinFlash > 0) { if ((coinFlash >> 3) & 1) vtext(ctx, 'INSERT COIN', W / 2, 400, 3, 'center'); }
          else if (api.credits > 0) { if (blink) vtext(ctx, 'PUSH START', W / 2, 400, 3, 'center'); }
          else if (blink) vtext(ctx, 'INSERT COIN', W / 2, 400, 3, 'center');
          ctx.stroke();
          ctx.beginPath(); ctx.strokeStyle = '#99a';
          vtext(ctx, 'DEFEND THE FUEL CANISTERS', W / 2, 150, 1.8, 'center');
          vtext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 20, H - 22, 1.8, 'left');
          vtext(ctx, '(C) 1980 CINEMATRONICS', W - 20, H - 22, 1.8, 'right');
          ctx.stroke();
        }
        if (state === 'over' || state === 'hold') {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
          vtext(ctx, 'GAME OVER', W / 2, 180, 5, 'center');
          ctx.lineWidth = 1.4; vtext(ctx, 'ALL FUEL LOST ON WAVE ' + wave, W / 2, 230, 2.2, 'center');
          ctx.stroke();
        }
      }
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
