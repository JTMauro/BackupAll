// Death Race (Exidy, 1976) \u2014 written from scratch for the MAME32 Game Room. A cartoon chase: run down the gremlins and they vanish into grave crosses.
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
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function makeSpr(rows, pal) {
    const runs = []; let w = 0;
    rows.forEach((r, y) => {
      w = Math.max(w, r.length);
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (!pal[ch]) { x++; continue; }
        let e = x + 1; while (e < r.length && r[e] === ch) e++;
        runs.push({ x, y, n: e - x, c: pal[ch], k: ch }); x = e;
      }
    });
    return { w, h: rows.length, runs };
  }
  function drawSpr(ctx, s, cx, cy, o) {
    o = o || {};
    const x0 = Math.round(cx - s.w / 2), y0 = Math.round(cy - s.h / 2);
    for (const r of s.runs) {
      ctx.fillStyle = o.col || (o.pal && o.pal[r.k]) || r.c;
      const xx = o.flip ? s.w - r.x - r.n : r.x;
      ctx.fillRect(x0 + xx, y0 + r.y, r.n, 1);
    }
  }

  const W = 256, H = 224, AX0 = 6, AX1 = W - 6, AY0 = 24, AY1 = H - 6;
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0;
  const TAU = Math.PI * 2, DIRS = 16;
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  // base car sprite pointing up; rotated into 16 crisp pixel sprites
  const CAR_ROWS = [
    '..BBBBB..',
    '.BBBBBBB.',
    'TTBBBBBTT',
    'TTBCCCBTT',
    '.BCCCCCB.',
    '.BBBBBBB.',
    '.BBWWWBB.',
    '.BBWWWBB.',
    '.BBBBBBB.',
    'TTBBBBBTT',
    'TTBBBBBTT',
    '.BBBBBBB.',
    '..RBBBR..'];
  function buildCar(pal) {
    const h = CAR_ROWS.length, w = CAR_ROWS[0].length, out = [];
    for (let d = 0; d < DIRS; d++) {
      const a = d * TAU / DIRS, ca = Math.cos(a), sa = Math.sin(a), px = [];
      for (let oy = -8; oy <= 8; oy++) for (let ox = -8; ox <= 8; ox++) {
        const bx = ox * ca + oy * sa, by = -ox * sa + oy * ca;
        const ix = Math.floor(bx + w / 2), iy = Math.floor(by + h / 2);
        if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
        const ch = CAR_ROWS[iy][ix];
        if (pal[ch]) px.push(ox, oy, pal[ch]);
      }
      out.push(px);
    }
    return out;
  }
  const CAR_P = buildCar({ B: '#ffffff', T: '#808080', C: '#40a0ff', W: '#c0c0c0', R: '#ff3030' });
  const CAR_C = buildCar({ B: '#ffd020', T: '#808080', C: '#ff4040', W: '#c09010', R: '#ff3030' });
  function drawCar(ctx, spr, x, y, ang, col) {
    let d = Math.round(((ang % TAU) + TAU) % TAU / TAU * DIRS) % DIRS;
    const s = spr[d], x0 = Math.round(x), y0 = Math.round(y);
    for (let i = 0; i < s.length; i += 3) { ctx.fillStyle = col || s[i + 2]; ctx.fillRect(x0 + s[i], y0 + s[i + 1], 1, 1); }
  }
  const GREM = [
    makeSpr(['.GGG.', 'GWGWG', '.GGG.', 'GGGGG', '..G..', '.G.G.', 'G...G'], { G: '#60ff60', W: '#000000' }),
    makeSpr(['.GGG.', 'GWGWG', '.GGG.', 'GGGGG', '..G..', '.GG..', '..GG.'], { G: '#60ff60', W: '#000000' }),
    makeSpr(['G.G.G', 'GGGGG', '.WGW.', '.GGG.', '..G..', '.G.G.', 'G...G'], { G: '#60ff60', W: '#ff2020' })];
  const CROSS = makeSpr(['..W..', '.WWW.', 'WWWWW', '.WWW.', '..W..', '..W..', '..W..', '.MMM.'], { W: '#ffffff', M: '#806040' });

  ArcadeRegistry.register({
    id: 'deathrace', title: 'Death Race', year: 1976, maker: 'Exidy',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up or Space: gas \u00b7 Down or X: reverse \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#ffffff', accent: '#ff3030' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(25);
      let mode = 'title', T = 0, coinFlash = 0, g = null, page = 0;
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        scream() { au.tone(1500, 0.45, { type: 'sawtooth', vol: 0.09, slideTo: 260 }); au.tone(1900, 0.3, { type: 'square', vol: 0.05, slideTo: 700, delay: 0.05 }); },
        poof() { au.noise(0.2, { vol: 0.1, freq: 3000, slideTo: 800 }); au.tone(392, 0.3, { type: 'triangle', vol: 0.1, delay: 0.25 }); },
        crash() { au.noise(0.35, { vol: 0.2, freq: 900, slideTo: 60 }); },
        bump() { au.tone(110, 0.08, { type: 'square', vol: 0.12 }); },
        engine(sp) { au.tone(48 + Math.abs(sp) * 50, 0.09, { type: 'square', vol: 0.035 }); },
        tick() { au.tone(1320, 0.04, { type: 'square', vol: 0.08 }); },
        round() { au.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.1], [659, 0.1], [784, 0.3]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[196, 0.12], [262, 0.12], [330, 0.12], [392, 0.3]], { type: 'square', vol: 0.1 }); },
        over() { au.melody([[330, 0.25], [311, 0.25], [294, 0.25], [262, 0.6]], { type: 'square', vol: 0.11 }); }
      };

      function newCar(x, y, ang, ai, spr) { return { x, y, ang, sp: 0, ai, spr, stun: 0, stuck: 0, rev: 0, score: 0, target: null }; }
      function newGame(demo) {
        g = { demo, round: 1, total: 0, phase: 'ready', phaseT: 0, fx: [], crosses: [], grems: [], msg: '', msgT: 0 };
        g.cars = [newCar(60, H - 40, 0, demo, CAR_P), newCar(W - 60, AY0 + 30, Math.PI, true, CAR_C)];
        startRound(1);
      }
      function startRound(n) {
        g.round = n; g.time = 60 * 60; g.quota = Math.min(40, 10 + (n - 1) * 3);
        g.crosses = []; g.grems = []; g.fx = [];
        g.cars[0].x = 60; g.cars[0].y = H - 40; g.cars[0].ang = 0; g.cars[0].sp = 0; g.cars[0].score = 0;
        g.cars[1].x = W - 60; g.cars[1].y = AY0 + 30; g.cars[1].ang = Math.PI; g.cars[1].sp = 0; g.cars[1].score = 0;
        g.gremN = Math.min(11, 5 + n);
        g.gremSp = Math.min(0.95, 0.38 + n * 0.06);
        g.cpuMax = Math.min(2.1, 1.25 + n * 0.08);
        // a few old graves to start with on later rounds
        for (let i = 0; i < Math.min(14, (n - 1) * 3); i++) {
          const p = freeSpot(40); if (p) g.crosses.push({ x: p.x, y: p.y, rise: 0 });
        }
        for (let i = 0; i < g.gremN; i++) spawnGrem(true);
        g.phase = 'ready'; g.phaseT = 0;
      }
      function freeSpot(minCar) {
        for (let tries = 0; tries < 40; tries++) {
          const x = AX0 + 12 + rnd(AX1 - AX0 - 24), y = AY0 + 12 + rnd(AY1 - AY0 - 24);
          if (g.cars.some(c => Math.hypot(c.x - x, c.y - y) < minCar)) continue;
          if (g.crosses.some(c => Math.hypot(c.x - x, c.y - y) < 12)) continue;
          return { x, y };
        }
        return null;
      }
      function spawnGrem(now) {
        const p = freeSpot(56); if (!p) return;
        g.grems.push({ x: p.x, y: p.y, dx: 0, dy: 0, t: 0, flee: 0, pop: now ? 0 : 30, anim: irnd(20) });
      }

      // ---------- cars ----------
      function carInput(c, i) {
        if (!c.ai) {
          return {
            l: api.key('ArrowLeft'), r: api.key('ArrowRight'),
            gas: api.key('ArrowUp') || api.key('Space'), rev: api.key('ArrowDown') || api.key('KeyX')
          };
        }
        // AI: chase the nearest gremlin, dodge graves, back out when stuck
        const inp = { l: false, r: false, gas: false, rev: false };
        if (c.rev > 0) { c.rev--; inp.rev = true; inp.l = c.rev & 32 ? true : false; inp.r = !inp.l; return inp; }
        let best = null, bd = 1e9;
        for (const gr of g.grems) {
          if (gr.pop > 0) continue;
          const fx = Math.sin(c.ang), fy = -Math.cos(c.ang);
          const d = Math.hypot(gr.x - c.x, gr.y - c.y) - ((gr.x - c.x) * fx + (gr.y - c.y) * fy) * 0.4;
          if (d < bd) { bd = d; best = gr; }
        }
        let tx = W / 2, ty = (AY0 + AY1) / 2;
        if (best) { tx = best.x; ty = best.y; }
        let want = Math.atan2(tx - c.x, -(ty - c.y));
        // avoid graves ahead
        for (const k of g.crosses) {
          const dx = k.x - c.x, dy = k.y - c.y, dist = Math.hypot(dx, dy);
          if (dist < 26 && dist > 0) {
            const a = Math.atan2(dx, -dy), off = angDiff(c.ang, a);
            if (Math.abs(off) < 0.6) want = c.ang + (off > 0 ? -1.2 : 1.2);
          }
        }
        const d = angDiff(c.ang, want);
        inp.l = d < -0.12; inp.r = d > 0.12;
        inp.gas = Math.abs(d) < 2.2 || Math.random() < 0.3;
        if (Math.abs(c.sp) < 0.3) { if (++c.stuck > 50) { c.stuck = 0; c.rev = 40; } } else c.stuck = 0;
        return inp;
      }
      function updateCar(c, i) {
        const inp = carInput(c, i);
        if (c.stun > 0) { c.stun--; c.ang += 0.25 * Math.sign(c.sp || 1) * (c.stun > 10 ? 1 : 0); c.sp *= 0.9; }
        else {
          const turn = 0.045 + Math.min(0.03, Math.abs(c.sp) * 0.015);
          if (inp.l) c.ang -= turn * (c.sp < -0.05 ? -1 : 1);
          if (inp.r) c.ang += turn * (c.sp < -0.05 ? -1 : 1);
          const max = i === 0 && !c.ai ? Math.min(2.5, 2.0 + g.round * 0.04) : (i === 0 ? 1.8 : g.cpuMax);
          if (inp.gas) c.sp = Math.min(max, c.sp + 0.06);
          else if (inp.rev) c.sp = Math.max(-1.1, c.sp - 0.06);
          else c.sp *= 0.97;
        }
        const nx = c.x + Math.sin(c.ang) * c.sp, ny = c.y - Math.cos(c.ang) * c.sp;
        c.x = nx; c.y = ny;
        // walls
        let hitWall = false;
        if (c.x < AX0 + 6) { c.x = AX0 + 6; hitWall = true; }
        if (c.x > AX1 - 6) { c.x = AX1 - 6; hitWall = true; }
        if (c.y < AY0 + 6) { c.y = AY0 + 6; hitWall = true; }
        if (c.y > AY1 - 6) { c.y = AY1 - 6; hitWall = true; }
        if (hitWall && Math.abs(c.sp) > 0.5) { c.sp *= -0.35; if (i === 0 && !g.demo) snd.bump(); }
        // graves
        for (const k of g.crosses) {
          const dx = c.x - k.x, dy = c.y - (k.y + 1), dist = Math.hypot(dx, dy);
          if (dist < 8) {
            const push = (8 - dist) / (dist || 1);
            c.x += dx * push; c.y += dy * push;
            if (Math.abs(c.sp) > 0.7) { c.stun = 24; if (i === 0 && !g.demo) snd.crash(); g.fx.push({ t: 'crash', x: c.x, y: c.y, life: 20 }); }
            c.sp *= -0.3;
          }
        }
        // gremlins
        for (const gr of g.grems) {
          if (gr.pop > 0 || gr.dead) continue;
          if (Math.hypot(gr.x - c.x, gr.y - c.y) < 8 && Math.abs(c.sp) > 0.35) {
            gr.dead = true; c.score++;
            if (i === 0 && !g.demo) { g.total++; if (g.total > hi) hi = g.total; }
            if (!g.demo || i === 0) snd.scream();
            g.fx.push({ t: 'vanish', x: gr.x, y: gr.y, life: 36, who: i });
          }
        }
      }
      function carsCollide() {
        const a = g.cars[0], b = g.cars[1];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 11 && d > 0) {
          const push = (11 - d) / 2 / d;
          a.x += dx * push; a.y += dy * push; b.x -= dx * push; b.y -= dy * push;
          const s = a.sp; a.sp = b.sp * 0.5 - 0.3; b.sp = s * 0.5 - 0.3;
          if (!g.demo) snd.bump();
        }
      }

      // ---------- gremlins ----------
      function updateGrem(gr) {
        gr.anim++;
        if (gr.pop > 0) { gr.pop--; return; }
        let fleeing = false;
        for (const c of g.cars) {
          const dx = gr.x - c.x, dy = gr.y - c.y, d = Math.hypot(dx, dy);
          if (d < 46 && d > 0) {
            // run sideways away from the car's path
            const fx = Math.sin(c.ang), fy = -Math.cos(c.ang);
            let sx = -fy, sy = fx;
            if (dx * sx + dy * sy < 0) { sx = -sx; sy = -sy; }
            gr.dx = (sx * 0.7 + dx / d * 0.6); gr.dy = (sy * 0.7 + dy / d * 0.6);
            const m = Math.hypot(gr.dx, gr.dy) || 1; gr.dx /= m; gr.dy /= m;
            fleeing = true;
          }
        }
        gr.flee = fleeing ? 20 : Math.max(0, gr.flee - 1);
        if (!fleeing && --gr.t <= 0) {
          gr.t = 40 + irnd(80);
          const a = rnd(TAU); gr.dx = Math.cos(a); gr.dy = Math.sin(a);
          if (Math.random() < 0.2) { gr.dx = 0; gr.dy = 0; }
        }
        const sp = g.gremSp * (gr.flee ? 1.6 : 1);
        let nx = gr.x + gr.dx * sp, ny = gr.y + gr.dy * sp;
        if (nx < AX0 + 5 || nx > AX1 - 5) { gr.dx = -gr.dx; nx = gr.x; }
        if (ny < AY0 + 6 || ny > AY1 - 6) { gr.dy = -gr.dy; ny = gr.y; }
        if (g.crosses.some(k => Math.hypot(k.x - nx, k.y - ny) < 6)) { gr.t = 0; gr.dx = -gr.dx; gr.dy = -gr.dy; return; }
        gr.x = nx; gr.y = ny;
      }

      function updateGame() {
        g.phaseT++;
        if (g.msgT > 0) g.msgT--;
        if (g.phase === 'ready') { if (g.phaseT > 110) g.phase = 'play'; return; }
        if (g.phase === 'over') { if (g.phaseT > 260 || (g.phaseT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; page = 0; T = 0; } return; }
        if (g.phase === 'wait') return;
        if (g.phase === 'roundclear') {
          if (g.phaseT > 200) startRound(g.round + 1);
          return;
        }
        // play
        g.cars.forEach(updateCar);
        carsCollide();
        g.grems.forEach(updateGrem);
        g.grems = g.grems.filter(gr => !gr.dead);
        if (g.grems.length < g.gremN && T % 40 === 0) spawnGrem(false);
        for (const f of g.fx) {
          f.life--;
          if (f.t === 'vanish' && f.life === 12) {
            g.crosses.push({ x: f.x, y: f.y, rise: 8 });
            if (g.crosses.length > 44) g.crosses.shift();
            if (!g.demo && f.who === 0) snd.poof();
          }
        }
        g.fx = g.fx.filter(f => f.life > 0);
        for (const k of g.crosses) if (k.rise > 0 && T % 2 === 0) k.rise--;
        if (!g.demo && T % 6 === 0) snd.engine(g.cars[0].sp);
        g.time--;
        if (!g.demo && g.time > 0 && g.time <= 600 && g.time % 60 === 0) snd.tick();
        if (g.time <= 0) {
          g.time = 0;
          if (g.demo) { mode = 'title'; page = 0; T = 0; return; }
          if (g.cars[0].score >= g.quota) {
            g.phase = 'roundclear'; g.phaseT = 0; snd.round();
          } else {
            g.phase = 'wait'; g.phaseT = 0;
            const gameOver = () => { g.phase = 'over'; g.phaseT = 0; api.setHiScore(g.total); snd.over(); };
            if (api.offerContinue) api.offerContinue(() => { g.total -= g.cars[0].score; startRound(g.round); }, gameOver);
            else gameOver();
          }
        }
      }

      function tryStart() {
        if (api.useCredit()) { newGame(false); mode = 'game'; snd.start(); return; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
      }
      function update() {
        T++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.pressed('Enter') || api.pressed('Space')) { tryStart(); return; }
          if (page === 1) { updateGame(); if (mode === 'title' && page === 1 && T > 1200) { page = 0; T = 0; } }
          else if (T > 480) { page = 1; T = 0; newGame(true); g.time = 20 * 60; g.phase = 'play'; }
          return;
        }
        updateGame();
      }

      // ---------- rendering ----------
      function drawArena(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(AX0 - 3, AY0 - 3, AX1 - AX0 + 6, 2); ctx.fillRect(AX0 - 3, AY1 + 1, AX1 - AX0 + 6, 2);
        ctx.fillRect(AX0 - 3, AY0 - 3, 2, AY1 - AY0 + 6); ctx.fillRect(AX1 + 1, AY0 - 3, 2, AY1 - AY0 + 6);
        // scattered dirt specks
        ctx.fillStyle = '#202020';
        for (let i = 0; i < 40; i++) ctx.fillRect(AX0 + (i * 73) % (AX1 - AX0), AY0 + (i * 41) % (AY1 - AY0), 2, 1);
      }
      function drawHud(ctx) {
        const p = g && !g.demo ? g.cars[0].score : 0, c = g ? g.cars[1].score : 0;
        text(ctx, 'YOU', 8, 3, '#ffffff'); text(ctx, String(p).padStart(2, '0'), 8, 12, '#ffffff', 1);
        text(ctx, 'CPU', W - 8, 3, '#ffd020', 1, 'right'); text(ctx, String(c).padStart(2, '0'), W - 8, 12, '#ffd020', 1, 'right');
        if (g) {
          const s = Math.ceil(g.time / 60);
          text(ctx, 'TIME', W / 2 - 4, 3, '#ff6060', 1, 'right');
          text(ctx, String(s).padStart(2, '0'), W / 2 + 4, 3, s <= 10 && (T >> 3) & 1 ? '#ff2020' : '#ffffff', 1);
          if (!g.demo) text(ctx, 'GOAL ' + g.quota + '  RND ' + g.round, W / 2, 12, '#60ff60', 1, 'center');
          else text(ctx, 'HI ' + hi, W / 2, 12, '#60ff60', 1, 'center');
          if (!g.demo) text(ctx, 'TOTAL ' + g.total, 40, 12, '#aaaaaa');
        } else text(ctx, 'HI ' + hi, W / 2, 7, '#60ff60', 1, 'center');
      }
      function drawGame(ctx) {
        drawArena(ctx);
        for (const k of g.crosses) drawSpr(ctx, CROSS, k.x, k.y + k.rise, {});
        for (const gr of g.grems) {
          if (gr.pop > 0) {
            if (gr.pop & 4) { ctx.fillStyle = '#60ff60'; ctx.fillRect(gr.x - 1, gr.y + 3 - (30 - gr.pop) / 6, 3, 2); }
            continue;
          }
          const fr = gr.flee ? 2 : (gr.dx || gr.dy) ? ((gr.anim >> 3) & 1) : 0;
          drawSpr(ctx, GREM[fr], gr.x, gr.y, { flip: gr.dx < 0 });
        }
        for (const f of g.fx) {
          if (f.t === 'vanish') {
            const k = 36 - f.life;
            if (f.life > 12) {
              // gremlin spins away into a puff of stars
              ctx.fillStyle = (f.life >> 1) & 1 ? '#ffffff' : '#60ff60';
              for (let i = 0; i < 6; i++) {
                const a = i * TAU / 6 + k * 0.2, r = k * 0.6;
                ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), 2, 2);
              }
              if (f.life > 26) drawSpr(ctx, GREM[2], f.x, f.y - k, { col: '#ffffff' });
            } else text(ctx, '+1', f.x, f.y - 14 - k / 4, f.who === 0 ? '#ffffff' : '#ffd020', 1, 'center');
          } else if (f.t === 'crash') {
            ctx.fillStyle = f.life & 2 ? '#ff4040' : '#ffd020';
            for (let i = 0; i < 5; i++) ctx.fillRect(f.x - 6 + ((i * 7 + f.life) % 12), f.y - 6 + ((i * 5 + f.life * 3) % 12), 2, 2);
          }
        }
        g.cars.forEach((c, i) => {
          if (c.stun > 0 && (c.stun & 2)) drawCar(ctx, c.spr, c.x, c.y, c.ang, '#ff4040');
          else drawCar(ctx, c.spr, c.x, c.y, c.ang);
        });
        drawHud(ctx);
        if (g.phase === 'ready' && !g.demo) {
          box(ctx, 66, 86, 124, 40);
          text(ctx, 'ROUND ' + g.round, W / 2, 92, '#ffffff', 2, 'center');
          text(ctx, 'GOAL ' + g.quota + ' GREMLINS', W / 2, 112, '#60ff60', 1, 'center');
        }
        if (g.phase === 'roundclear') {
          box(ctx, 50, 86, 156, 40);
          text(ctx, 'EXTENDED PLAY', W / 2, 92, '#ffd020', 2, 'center');
          text(ctx, 'YOU GOT ' + g.cars[0].score + ' GREMLINS', W / 2, 112, '#ffffff', 1, 'center');
        }
        if (g.phase === 'over') { box(ctx, 60, 90, 136, 30); text(ctx, 'GAME OVER', W / 2, 98, '#ff4040', 2, 'center'); }
        if (g.demo) { box(ctx, W / 2 - 46, 100, 92, 24); text(ctx, 'DEMO', W / 2, 103, '#ffffff', 1, 'center'); drawCoin(ctx, 114); }
      }
      function box(ctx, x, y, w, h) { ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h); }
      function drawCoin(ctx, y) {
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, y, '#ffffff', 1, 'center');
      }
      function drawTitle(ctx) {
        drawArena(ctx);
        g = null;
        drawHud(ctx);
        text(ctx, 'DEATH', W / 2, 36, '#ffffff', 4, 'center');
        text(ctx, 'RACE', W / 2, 68, '#ff3030', 4, 'center');
        // a little parade: car chasing a gremlin across the screen
        const px = ((T * 1.1) % (W + 60)) - 30;
        drawCar(ctx, CAR_P, px - 22, 116, Math.PI / 2);
        drawSpr(ctx, GREM[2], px + 4, 116, {});
        for (let i = 0; i < 5; i++) drawSpr(ctx, CROSS, 40 + i * 44, 136, {});
        text(ctx, 'RUN DOWN THE GREMLINS', W / 2, 152, '#60ff60', 1, 'center');
        text(ctx, 'BEFORE THE OTHER CAR DOES', W / 2, 162, '#60ff60', 1, 'center');
        text(ctx, 'DODGE THE GRAVE CROSSES', W / 2, 172, '#aaaaaa', 1, 'center');
        drawCoin(ctx, 188);
        text(ctx, credStr(), 10, H - 16, '#aaaaaa');
        text(ctx, '\u00a9 1976 EXIDY', W - 10, H - 16, '#aaaaaa', 1, 'right');
      }
      function render(ctx) {
        if (mode === 'title' && page === 0) { drawTitle(ctx); return; }
        drawGame(ctx);
      }
      return { update, render, destroy() { if (g && !g.demo) api.setHiScore(g.total); } };
    }
  });
})();
