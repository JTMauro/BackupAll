// Lunar Lander (Atari, 1979) \u2014 vector recreation
// Rotate, throttle and set the lander down on a lit pad. Fuel is the only resource: each credit buys fuel.
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
    "'": '2022', ',': '2516', '?': '0040432324 2526', '(': '30121436', ')': '10323416', '>': '004306', '<': '400346',
    '+': '0343 2125'
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

  // ---------- Lander shape (local units, y down, feet at y = +8) ----------
  const LANDER = [
    [[-4, -9], [4, -9], [6, -6.5], [6, -3.5], [4, -1], [-4, -1], [-6, -3.5], [-6, -6.5], [-4, -9]], // ascent cabin
    [[-1.6, -6.5], [1.6, -6.5], [1.6, -4], [-1.6, -4], [-1.6, -6.5]],                                 // window
    [[-7, -1], [7, -1], [7, 3], [-7, 3], [-7, -1]],                                                   // descent stage
    [[-5, 3], [-9, 8]], [[5, 3], [9, 8]], [[-7, 1], [-9, 8]], [[7, 1], [9, 8]],                       // legs
    [[-10.5, 8], [-7.5, 8]], [[7.5, 8], [10.5, 8]],                                                   // feet
    [[-2, 3], [-3.2, 5.5], [3.2, 5.5], [2, 3]]                                                        // nozzle
  ];
  const HITPTS = [[-9, 8], [9, 8], [-6, -5], [6, -5], [0, -9], [-7, 3], [7, 3]];
  const LS = 1.15;              // lander scale in world units
  const FOOT = 8 * LS;

  ArcadeRegistry.register({
    id: 'lunarlander', title: 'Lunar Lander', year: 1979, maker: 'Atari',
    width: W, height: H, vector: true, pointer: false,
    controls: 'Left/Right: rotate \u00b7 Up/Space: thrust \u00b7 Down: cut throttle \u00b7 X: abort \u00b7 Enter: start (Left/Right on title: mission)',
    marquee: { bg: '#04060a', fg: '#f2f6ff', accent: '#8fb8ff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
      const WW = 2560;                      // world width (wraps)
      const mod = v => ((v % WW) + WW) % WW;
      const wdelta = v => { v = mod(v); return v >= WW / 2 ? v - WW : v; };
      const THRUST = 0.03, ROT = Math.PI / 80;
      const FUEL_PER_CREDIT = 1000;
      const MODES = [
        { name: 'CADET', g: 0.0082, vx: 0.55, use: 0.42, rough: 0.8 },
        { name: 'PRIME', g: 0.0100, vx: 0.85, use: 0.5, rough: 1.0 },
        { name: 'COMMAND', g: 0.0120, vx: 1.15, use: 0.58, rough: 1.25 }
      ];
      const PAD_W = { 2: 74, 3: 54, 4: 42, 5: 32 };

      let hi = api.getHiScore(0);
      let state = 'attract', stateT = 0, mode = 1, page = 0;
      let terrain = [], pads = [];
      let L = null, demo = true;
      let score = 0, fuel = 0, round = 0, timeF = 0;
      let result = null, resultT = 0, outMsgT = 0, lowT = 0;
      let debris = [], dust = [];
      let zoom = 1, camX = 0, camY = 0;
      let coinFlash = 0, lastCredits = api.credits, coinHold = 0;
      let soundT = 0;

      // ---------- terrain ----------
      function genTerrain(roundN) {
        terrain = []; pads = [];
        const md = MODES[mode];
        const mults = [2, 2, 3, 4, 5];
        for (let i = mults.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = mults[i]; mults[i] = mults[j]; mults[j] = t; }
        const nP = mults.length, padXs = [];
        for (let i = 0; i < nP; i++) padXs.push(Math.floor((i + 0.25 + Math.random() * 0.45) * WW / nP));
        const rough = md.rough * (1 + Math.min(0.8, (roundN - 1) * 0.08));
        let x = 0, y = rnd(330, 420), pi = 0;
        terrain.push({ x: 0, y, pad: 0 });
        while (x < WW - 50) {
          if (pi < nP && x >= padXs[pi]) {
            const m = mults[pi], w = PAD_W[m];
            pi++;
            if (x + 14 + w > WW - 50) continue;
            const ny = clamp(y + rnd(-24, 24), m >= 4 ? 230 : 280, 440);
            x += 14; terrain.push({ x, y: ny, pad: m });
            pads.push({ x0: x, x1: x + w, y: ny, m });
            x += w; terrain.push({ x, y: ny, pad: 0 });
            y = ny;
            continue;
          }
          const step = rnd(10, 30);
          let dy;
          if (Math.random() < 0.14) dy = rnd(-95, 95) * rough;
          else dy = rnd(-30, 30) * rough;
          // steep walls next to the high-value pads
          const near = pads.length && x - pads[pads.length - 1].x1 < 20 && pads[pads.length - 1].m >= 4;
          if (near) dy = -Math.abs(dy) - 20;
          x += step; y = clamp(y + dy, 150, 462);
          terrain.push({ x, y, pad: 0 });
        }
        terrain.push({ x: WW, y: terrain[0].y, pad: 0 });
      }
      function terrainAt(wx) {
        const x = mod(wx);
        let lo = 0, hiI = terrain.length - 1;
        while (hiI - lo > 1) { const m = (lo + hiI) >> 1; if (terrain[m].x <= x) lo = m; else hiI = m; }
        const a = terrain[lo], b = terrain[lo + 1] || a;
        const f = b.x > a.x ? (x - a.x) / (b.x - a.x) : 0;
        return { y: a.y + (b.y - a.y) * f, i: lo };
      }
      function padUnder(xl, xr) {
        for (const p of pads) {
          const dl = wdelta(xl - p.x0), dr = wdelta(xr - p.x0);
          if (dl >= -0.5 && dr <= p.x1 - p.x0 + 0.5) return p;
        }
        return null;
      }

      // ---------- lander ----------
      function newLander() {
        const md = MODES[mode];
        const dir = Math.random() < 0.5 ? -1 : 1;
        const sp = md.vx + Math.min(0.6, (round - 1) * 0.06);
        L = { x: rnd(0, WW), y: 46, vx: dir * sp, vy: rnd(0, 0.15), a: -dir * Math.PI / 2, thr: 0, dead: false, landed: false, flame: 0 };
        zoom = 1; camX = mod(L.x - W / 2); camY = 0;
      }
      function local(px, py) {
        const c = Math.cos(L.a), s = Math.sin(L.a);
        return { x: L.x + (px * c - py * s) * LS, y: L.y + (px * s + py * c) * LS };
      }
      function stepLander(ctrl) {
        const md = MODES[mode];
        if (ctrl.abort) {
          const d = -L.a; L.a += clamp(d, -ROT * 1.5, ROT * 1.5);
        } else L.a += ctrl.rot * ROT;
        L.a = clamp(L.a, -Math.PI / 2, Math.PI / 2);
        let want = ctrl.abort ? 1 : ctrl.thr;
        if (!demo && fuel <= 0) want = 0;
        const d = want - L.thr;
        L.thr += clamp(d, -0.09, 0.05);
        if (L.thr < 0.02 && want === 0) L.thr = 0;
        if (L.thr > 0 && !demo) {
          fuel -= L.thr * md.use * (ctrl.abort ? 1.5 : 1);
          if (fuel <= 0) { fuel = 0; L.thr = 0; outMsgT = 180; A.tone(220, 0.4, { type: 'square', vol: 0.12, slideTo: 110 }); }
        }
        const acc = L.thr * THRUST;
        L.vx += Math.sin(L.a) * acc;
        L.vy += md.g - Math.cos(L.a) * acc;
        L.x = mod(L.x + L.vx); L.y += L.vy;
        if (L.y < -500) { L.y = -500; if (L.vy < 0) L.vy = 0; }
        L.flame = L.thr;
        // dust kicked up near the ground
        if (L.thr > 0.25) {
          const g = terrainAt(L.x).y, alt = g - L.y;
          if (alt < 70 && Math.random() < L.thr) {
            const s = Math.random() < 0.5 ? -1 : 1;
            dust.push({ x: L.x + rnd(-4, 4), y: g - 1, vx: s * rnd(0.6, 1.8) * (1 - alt / 80), vy: -rnd(0.1, 0.6), t: 30 });
          }
        }
        // contact
        let hit = false;
        for (const p of HITPTS) {
          const q = local(p[0], p[1]);
          if (q.y >= terrainAt(q.x).y) { hit = true; break; }
        }
        if (hit) touchdown();
      }
      function touchdown() {
        const lf = local(-9, 8), rf = local(9, 8);
        const pad = padUnder(Math.min(lf.x, rf.x), Math.max(lf.x, rf.x)) || padUnder(L.x - 1, L.x + 1);
        const vxs = Math.abs(L.vx * 40), vys = L.vy * 40, ang = Math.abs(L.a) * 180 / Math.PI;
        let kind;
        if (pad && ang <= 12 && vys <= 10 && vxs <= 8) kind = 'good';
        else if (pad && ang <= 24 && vys <= 22 && vxs <= 16) kind = 'hard';
        else kind = 'crash';
        const m = pad ? pad.m : 1;
        if (kind !== 'crash') {
          L.landed = true; L.y = pad.y - FOOT; L.vx = L.vy = 0; L.thr = 0; L.a = kind === 'good' ? 0 : L.a * 0.5;
        } else {
          L.dead = true; explode();
        }
        result = { kind, m, pts: 0, fuelDelta: 0 };
        if (!demo) {
          if (kind === 'good') { result.pts = 50 * m; result.fuelDelta = 50; fuel += 50; }
          else if (kind === 'hard') result.pts = 15 * m;
          else { result.pts = pad ? 5 * m : 0; result.fuelDelta = -Math.min(fuel, 200); fuel = Math.max(0, fuel - 200); }
          score += result.pts;
          if (score > hi) { hi = score; api.setHiScore(hi); }
        }
        resultT = 240; L.thr = 0;
        if (!demo) {
          if (kind === 'good') A.melody([[523, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: demo ? 0.06 : 0.14 });
          else if (kind === 'hard') { A.noise(0.3, { freq: 600, vol: demo ? 0.08 : 0.2 }); A.tone(330, 0.3, { type: 'square', vol: 0.1, slideTo: 260, delay: 0.25 }); }
        }
      }
      function explode() {
        if (!demo) {
          A.noise(1.4, { freq: 1400, slideTo: 50, vol: 0.45 });
          A.noise(0.5, { freq: 300, vol: 0.27, delay: 0.1 });
        }
        for (const seg of LANDER) {
          for (let i = 0; i < seg.length - 1; i++) {
            const a = local(seg[i][0], seg[i][1]), b = local(seg[i + 1][0], seg[i + 1][1]);
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            debris.push({ x: mx, y: my, dx: (b.x - a.x) / 2, dy: (b.y - a.y) / 2, vx: L.vx * 0.3 + rnd(-1.6, 1.6), vy: -rnd(0.5, 2.6), rot: rnd(-0.2, 0.2), t: rnd(120, 220) });
          }
        }
        for (let i = 0; i < 26; i++) dust.push({ x: L.x, y: L.y, vx: rnd(-2.5, 2.5), vy: -rnd(0.2, 3), t: rnd(30, 70) });
      }

      // ---------- demo autopilot ----------
      function autoCtrl() {
        const md = MODES[mode];
        let best = null, bd = 1e9;
        for (const p of pads) {
          const d = wdelta((p.x0 + p.x1) / 2 - L.x);
          const sc = Math.abs(d) - p.m * 40;
          if (sc < bd) { bd = sc; best = { p, d }; }
        }
        if (!best) return { rot: 0, thr: 0 };
        const dx = best.d, h = best.p.y - (L.y + FOOT);
        const dvx = clamp(dx * 0.006, -1.3, 1.3);
        let dvy;
        if (Math.abs(dx) > 14) dvy = h > 150 ? 0.45 : (h > 70 ? 0.05 : -0.35);
        else dvy = clamp(h * 0.0065, 0.1, 1.1);
        const ax = (dvx - L.vx) * 0.06, ay = (dvy - L.vy) * 0.06;
        const tu = md.g - ay;
        let ta = Math.atan2(ax, Math.max(0.0005, tu));
        ta = clamp(ta, h < 25 ? -0.08 : -1.1, h < 25 ? 0.08 : 1.1);
        const T = Math.hypot(ax, Math.max(0, tu)) / THRUST;
        return { rot: clamp((ta - L.a) / ROT, -1, 1), thr: clamp(T, 0, 1) };
      }

      // ---------- flow ----------
      function newRound() {
        round++;
        genTerrain(round);
        newLander();
        result = null; resultT = 0; debris = []; dust = [];
      }
      function attractInit() {
        state = 'attract'; stateT = 0; demo = true; round = 1; page = 0;
        genTerrain(1); newLander(); result = null; debris = []; dust = [];
      }
      function startGame() {
        demo = false; state = 'play'; stateT = 0;
        score = 0; fuel = FUEL_PER_CREDIT; round = 0; timeF = 0; outMsgT = 0;
        newRound();
        A.melody([[392, .08], [523, .08], [659, .14]], { type: 'square', vol: 0.12 });
      }
      function gameOver() {
        state = 'gameover'; stateT = 0;
        if (score > hi) { hi = score; api.setHiScore(hi); }
      }
      function endOfFuel() {
        if (api.offerContinue) {
          state = 'hold';
          api.offerContinue(() => { state = 'play'; fuel += FUEL_PER_CREDIT; newRound(); }, gameOver);
        } else gameOver();
      }

      function updateCamera() {
        if (!L) return;
        const g = terrainAt(L.x).y, alt = g - (L.y + FOOT);
        if (zoom === 1 && alt < 80 && !L.dead) zoom = 2.5;
        else if (zoom > 1 && (alt > 110 || L.dead && resultT < 200)) zoom = 1;
        if (zoom === 1) {
          const sx = wdelta(L.x - camX);
          if (sx < 170) camX = mod(L.x - 170);
          else if (sx > W - 170) camX = mod(L.x - (W - 170));
          camY = 0;
        } else {
          camX = mod(L.x - W / 2 / zoom); camY = L.y - 230 / zoom;
        }
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        // particles
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i];
          d.vy += MODES[mode].g * 4; d.x += d.vx; d.y += d.vy;
          const c = Math.cos(d.rot), s = Math.sin(d.rot), nx = d.dx * c - d.dy * s; d.dy = d.dx * s + d.dy * c; d.dx = nx;
          const g = terrainAt(d.x).y;
          if (d.y > g) { d.y = g; d.vy *= -0.3; d.vx *= 0.5; d.rot *= 0.5; }
          if (--d.t <= 0) debris.splice(i, 1);
        }
        for (let i = dust.length - 1; i >= 0; i--) {
          const d = dust[i]; d.x += d.vx; d.y += d.vy; d.vy += 0.03;
          if (--d.t <= 0) dust.splice(i, 1);
        }
        const cr = api.credits;
        if (state === 'attract') {
          if (lastCredits === 0 && cr > 0) { coinHold = 150; page = 0; stateT = 0; }
          lastCredits = cr;
          if (stateT % 600 === 0 && stateT > 0) page = (page + 1) % 2;
          if (api.anyPressed('ArrowLeft', 'ArrowUp')) { mode = (mode + 2) % 3; page = 0; stateT = 1; A.tone(660, 0.05, { vol: 0.1 }); }
          if (api.anyPressed('ArrowRight', 'ArrowDown')) { mode = (mode + 1) % 3; page = 0; stateT = 1; A.tone(660, 0.05, { vol: 0.1 }); }
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; startGame(); return; }
            coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 });
          }
          // the demo flight
          if (resultT > 0) { if (--resultT <= 0) { round = 1; genTerrain(1); newLander(); result = null; } }
          else if (L && !L.dead && !L.landed) stepLander(autoCtrl());
          updateCamera();
          return;
        }
        lastCredits = cr;
        if (state === 'gameover') {
          if (stateT > 300 || (stateT > 90 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (state === 'hold') return;
        // play
        if (outMsgT > 0) outMsgT--;
        if (resultT > 0) {
          resultT--;
          if (resultT <= 0) {
            if (fuel <= 0) endOfFuel(); else newRound();
          }
          updateCamera();
          return;
        }
        timeF++;
        const ctrl = {
          rot: (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0),
          thr: (api.key('ArrowUp') || api.key('Space')) ? 1 : 0,
          abort: api.key('KeyX') || api.key('KeyZ')
        };
        if (api.key('ArrowDown')) { ctrl.thr = 0; L.thr = Math.max(0, L.thr - 0.08); }
        stepLander(ctrl);
        updateCamera();
        // engine roar
        if (L.thr > 0.04 && --soundT <= 0) {
          soundT = 4;
          A.noise(0.1, { freq: 160 + L.thr * 420, vol: 0.05 + L.thr * 0.13 });
        }
        if (fuel > 0 && fuel < 150) {
          if (--lowT <= 0) { lowT = 45; A.tone(880, 0.08, { type: 'square', vol: 0.08 }); }
        }
      }

      // ---------- drawing ----------
      function toScreen(wx, wy) { return [wdelta(wx - camX) * zoom, (wy - camY) * zoom]; }
      function drawTerrain(ctx) {
        ctx.beginPath();
        const vw = W / zoom;
        for (let k = -1; k <= 1; k++) {
          let pen = false;
          for (let i = 0; i < terrain.length - 1; i++) {
            const a = terrain[i], b = terrain[i + 1];
            const x0 = a.x + k * WW - camX, x1 = b.x + k * WW - camX;
            if (x1 < -2 || x0 > vw + 2) { pen = false; continue; }
            const ax = x0 * zoom, ay = (a.y - camY) * zoom, bx = x1 * zoom, by = (b.y - camY) * zoom;
            if (!pen) { ctx.moveTo(ax, ay); pen = true; }
            ctx.lineTo(bx, by);
          }
        }
        ctx.stroke();
        // pads: bright, with multiplier labels
        ctx.beginPath(); ctx.lineWidth = 2.6 * Math.min(1.6, zoom * 0.7);
        const labels = [];
        for (const p of pads) {
          for (let k = -1; k <= 1; k++) {
            const x0 = p.x0 + k * WW - camX, x1 = p.x1 + k * WW - camX;
            if (x1 < -2 || x0 > vw + 2) continue;
            const y = (p.y - camY) * zoom;
            ctx.moveTo(x0 * zoom, y); ctx.lineTo(x1 * zoom, y);
            labels.push([(x0 + x1) / 2 * zoom, y + 6 * zoom, p.m]);
          }
        }
        ctx.stroke();
        ctx.beginPath(); ctx.lineWidth = 1.1;
        const blink = !L || L.landed || ((api.frame >> 4) & 1) || zoom > 1;
        for (const [x, y, m] of labels) if (blink && y < H - 4) vtext(ctx, m + 'X', x, Math.min(y, H - 14), 1.6 * Math.min(1.6, zoom * 0.75), 'center');
        ctx.stroke();
      }
      function drawLander(ctx) {
        if (!L || L.dead) return;
        const [sx, sy] = toScreen(L.x, L.y);
        const sc = LS * zoom, c = Math.cos(L.a), s = Math.sin(L.a);
        const P = (px, py) => [sx + (px * c - py * s) * sc, sy + (px * s + py * c) * sc];
        ctx.beginPath(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = zoom > 1 ? 1.8 : 1.3;
        for (const seg of LANDER) {
          for (let i = 0; i < seg.length; i++) { const [x, y] = P(seg[i][0], seg[i][1]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        }
        ctx.stroke();
        if (L.flame > 0.03) {
          const len = 4 + L.flame * 14 * (0.75 + Math.random() * 0.5);
          ctx.beginPath(); ctx.strokeStyle = '#cfe0ff';
          let p = P(-2.4, 5.5); ctx.moveTo(p[0], p[1]);
          p = P(rnd(-1, 1), 5.5 + len); ctx.lineTo(p[0], p[1]);
          p = P(2.4, 5.5); ctx.lineTo(p[0], p[1]);
          ctx.stroke();
        }
        // off the top of the screen: altitude marker
        if (sy < -4) {
          ctx.beginPath(); ctx.moveTo(sx - 5, 10); ctx.lineTo(sx, 3); ctx.lineTo(sx + 5, 10); ctx.stroke();
        }
      }
      function arrow(ctx, x, y, dx, dy) {
        const tx = x + dx * 6, ty = y + dy * 6, px = -dy * 3, py = dx * 3;
        ctx.moveTo(x - dx * 6, y - dy * 6); ctx.lineTo(tx, ty);
        ctx.moveTo(tx - dx * 4 + px, ty - dy * 4 + py); ctx.lineTo(tx, ty); ctx.lineTo(tx - dx * 4 - px, ty - dy * 4 - py);
      }
      function pad4(n) { return String(Math.max(0, Math.floor(n))).padStart(4, '0'); }
      function drawHud(ctx) {
        ctx.beginPath(); ctx.strokeStyle = '#e8eeff'; ctx.lineWidth = 1.2;
        const t = Math.floor(timeF / 60);
        const sc = 1.9;
        vtext(ctx, 'SCORE', 24, 16, sc); vtext(ctx, pad4(demo ? 0 : score), 120, 16, sc);
        vtext(ctx, 'TIME', 24, 34, sc); vtext(ctx, Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), 120, 34, sc);
        const fuelShow = demo ? 0 : fuel;
        if (demo || fuel >= 150 || (api.frame >> 3) & 1) { vtext(ctx, 'FUEL', 24, 52, sc); vtext(ctx, pad4(fuelShow), 120, 52, sc); }
        if (L) {
          const g = terrainAt(L.x).y;
          const alt = Math.max(0, (g - L.y - FOOT) * 2);
          const hs = Math.abs(L.vx * 40), vs = Math.abs(L.vy * 40);
          vtext(ctx, 'ALTITUDE', 360, 16, sc); vtext(ctx, pad4(alt), 590, 16, sc, 'right');
          vtext(ctx, 'HORIZONTAL SPEED', 300, 34, sc); vtext(ctx, pad4(hs), 590, 34, sc, 'right');
          vtext(ctx, 'VERTICAL SPEED', 300, 52, sc); vtext(ctx, pad4(vs), 590, 52, sc, 'right');
          if (hs >= 1) arrow(ctx, 610, 39, L.vx > 0 ? 1 : -1, 0);
          if (vs >= 1) arrow(ctx, 610, 57, 0, L.vy > 0 ? 1 : -1);
        }
        ctx.stroke();
      }
      function drawResult(ctx) {
        if (!result) return;
        ctx.beginPath(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#ffffff';
        const y = 104, sc = 2.6;
        if (result.kind === 'good') {
          vtext(ctx, 'CONGRATULATIONS', W / 2, y, sc, 'center');
          vtext(ctx, 'THAT WAS A GREAT LANDING', W / 2, y + 22, sc, 'center');
          if (!demo) vtext(ctx, '50 FUEL UNITS AWARDED', W / 2, y + 44, 2, 'center');
        } else if (result.kind === 'hard') {
          vtext(ctx, 'YOU LANDED HARD', W / 2, y, sc, 'center');
          vtext(ctx, 'COMMUNICATIONS SYSTEM DAMAGED', W / 2, y + 22, 2, 'center');
        } else {
          vtext(ctx, 'YOU JUST DESTROYED A', W / 2, y, sc, 'center');
          vtext(ctx, '100 MEGABUCK LANDER', W / 2, y + 22, sc, 'center');
          if (!demo && result.fuelDelta < 0) vtext(ctx, 'AUXILIARY FUEL TANKS DESTROYED', W / 2, y + 44, 2, 'center');
        }
        if (!demo) vtext(ctx, result.pts + ' POINTS', W / 2, y + 66, 2.2, 'center');
        ctx.stroke();
      }
      function prompt() { return api.credits > 0 ? 'PUSH START' : 'INSERT COIN'; }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowBlur = 6; ctx.shadowColor = '#8fb8ff';
        ctx.strokeStyle = '#c8d6f0'; ctx.lineWidth = zoom > 1 ? 1.6 : 1.2;
        if (terrain.length) drawTerrain(ctx);
        drawLander(ctx);
        // debris
        ctx.beginPath(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.3;
        for (const d of debris) {
          const [x, y] = toScreen(d.x, d.y);
          ctx.moveTo(x - d.dx * zoom, y - d.dy * zoom); ctx.lineTo(x + d.dx * zoom, y + d.dy * zoom);
        }
        ctx.stroke();
        ctx.fillStyle = '#dde8ff';
        for (const d of dust) { const [x, y] = toScreen(d.x, d.y); ctx.globalAlpha = Math.min(1, d.t / 20); ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6); }
        ctx.globalAlpha = 1;
        drawHud(ctx);
        if (state === 'play' || state === 'hold') {
          drawResult(ctx);
          ctx.beginPath(); ctx.lineWidth = 1.3;
          if (outMsgT > 0 && (outMsgT >> 3) & 1) vtext(ctx, 'OUT OF FUEL', W / 2, 160, 3, 'center');
          else if (fuel > 0 && fuel < 150 && !result && (api.frame >> 4) & 1) vtext(ctx, 'FUEL LOW', W / 2, 80, 2.4, 'center');
          if (timeF < 150 && !result && (timeF >> 4) % 2 === 0) vtext(ctx, MODES[mode].name + ' MISSION', W / 2, 160, 3, 'center');
          ctx.stroke();
        } else if (state === 'attract') {
          drawResult(ctx);
          ctx.beginPath(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#ffffff';
          const blinkOn = coinHold > 0 || (coinFlash > 0 ? (coinFlash % 20) < 12 : (stateT % 60) < 40);
          if (page === 0) {
            vtext(ctx, 'LUNAR LANDER', W / 2, 190, 7, 'center'); ctx.stroke();
            ctx.beginPath(); ctx.lineWidth = 1.3;
            for (let i = 0; i < 3; i++) {
              const x = W / 2 + (i - 1) * 150;
              vtext(ctx, MODES[i].name, x, 250, 2.4, 'center');
              if (i === mode) { ctx.moveTo(x - 50, 264); ctx.lineTo(x + 50, 264); vtext(ctx, '>', x - 62, 250, 2.4, 'center'); vtext(ctx, '<', x + 62, 250, 2.4, 'center'); }
            }
            vtext(ctx, 'LEFT/RIGHT SELECTS MISSION', W / 2, 280, 1.8, 'center');
            if (blinkOn) vtext(ctx, prompt(), W / 2, 312, 3.4, 'center');
            vtext(ctx, '1 COIN BUYS ' + FUEL_PER_CREDIT + ' FUEL UNITS', W / 2, 350, 2, 'center');
          } else {
            vtext(ctx, 'LANDING SCORES', W / 2, 160, 3.4, 'center');
            vtext(ctx, 'GOOD LANDING  50 X PAD   +50 FUEL', W / 2, 200, 2, 'center');
            vtext(ctx, 'HARD LANDING  15 X PAD', W / 2, 222, 2, 'center');
            vtext(ctx, 'CRASH ON PAD   5 X PAD   -200 FUEL', W / 2, 244, 2, 'center');
            vtext(ctx, 'LAND SLOWLY, LEVEL AND ON A PAD', W / 2, 274, 2, 'center');
            vtext(ctx, 'HIGH SCORE ' + hi, W / 2, 304, 2.4, 'center');
            if (blinkOn) vtext(ctx, prompt(), W / 2, 336, 3.4, 'center');
          }
          vtext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 24, H - 22, 1.8);
          vtext(ctx, '1979 ATARI', W - 24, H - 22, 1.8, 'right');
          ctx.stroke();
        } else if (state === 'gameover') {
          ctx.beginPath(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#ffffff';
          vtext(ctx, 'GAME OVER', W / 2, 150, 5, 'center');
          vtext(ctx, 'FINAL SCORE ' + score, W / 2, 200, 2.6, 'center');
          if (score >= hi && score > 0) vtext(ctx, 'NEW HIGH SCORE', W / 2, 230, 2.4, 'center');
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
      attractInit();
      return { update, render, destroy() { } };
    }
  });
})();
