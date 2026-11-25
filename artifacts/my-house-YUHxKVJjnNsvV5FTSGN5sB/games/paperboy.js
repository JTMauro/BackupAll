// Paperboy (Atari Games, 1985) - from-scratch recreation: deliver the Daily Sun Monday to Sunday.
(function () {
  'use strict';
  // ---------- 5x7 bitmap font ----------
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

  // ---------- constants ----------
  const W = 256, H = 240;
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const NH = 20;                    // houses on the route
  const LOT = 100;                  // lot length along the street
  const HX0 = -130, HX1 = -54;      // house body (front face at HX1, facing the street)
  const HH = 34, RH = 16;           // wall height, roof height
  const LAWN0 = -54, LAWN1 = -6, WALK1 = 10, CURB1 = 12, ST1 = 100;
  const MINX = -48, MAXX = 94;
  const ROUTES = [
    { name: 'EASY STREET', mult: 1, dens: 0, col: '#40e040' },
    { name: 'MIDDLE ROAD', mult: 2, dens: 1, col: '#ffd040' },
    { name: 'HARD WAY', mult: 3, dens: 2, col: '#ff4040' }
  ];
  const SUBCOL = [['#f0e8c8', '#b04030'], ['#c0d8f0', '#305890'], ['#f4c8c0', '#804020'], ['#d0f0c0', '#406030'], ['#f0e090', '#705030']];
  const HEADLINES = [
    'PAPERBOY STARTS ROUTE', 'DOG BITES MAILMAN', 'BREAKDANCE CRAZE SWEEPS TOWN', 'WINDOW SALES SOAR',
    'TRAFFIC JAMS AT CROSSWALK', 'TORNADO WARNING ISSUED', 'GRIM REAPER SPOTTED'
  ];

  ArcadeRegistry.register({
    id: 'paperboy', title: 'Paperboy', year: 1985, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up: pedal faster \u00b7 Down: brake \u00b7 Space: throw paper \u00b7 Enter: start',
    marquee: { bg: '#123a8a', fg: '#ffffff', accent: '#e82020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits, sel = 0, selT = 0;
      let g = null, cam = 0;
      let seed = 1;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');

      const snd = {
        toss() { au.noise(0.08, { vol: 0.08, freq: 3000, slideTo: 900, type: 'bandpass' }); },
        mail() { au.tone(1568, 0.08, { type: 'square', vol: 0.12 }); au.tone(2093, 0.14, { type: 'square', vol: 0.1, delay: 0.07 }); },
        porch() { au.tone(880, 0.06, { type: 'square', vol: 0.1 }); au.tone(1175, 0.1, { type: 'square', vol: 0.08, delay: 0.05 }); },
        glass() { au.noise(0.35, { vol: 0.18, freq: 7000, slideTo: 2500, type: 'highpass' }); au.tone(2400, 0.2, { type: 'triangle', vol: 0.06, slideTo: 1200 }); },
        thud() { au.noise(0.06, { vol: 0.1, freq: 600 }); },
        crash() { au.noise(0.6, { vol: 0.22, freq: 2500, slideTo: 100 }); au.tone(600, 0.6, { type: 'sawtooth', vol: 0.1, slideTo: 60 }); },
        bark() { au.tone(420, 0.06, { type: 'square', vol: 0.12, slideTo: 300 }); au.tone(440, 0.07, { type: 'square', vol: 0.1, slideTo: 280, delay: 0.12 }); },
        horn() { au.tone(330, 0.25, { type: 'sawtooth', vol: 0.07 }); au.tone(415, 0.25, { type: 'sawtooth', vol: 0.05 }); },
        pick() { au.melody([[784, 0.04], [988, 0.04], [1319, 0.08]], { type: 'square', vol: 0.1 }); },
        jump() { au.tone(300, 0.25, { type: 'square', vol: 0.08, slideTo: 900 }); },
        hit() { au.tone(220, 0.1, { type: 'square', vol: 0.12, slideTo: 110 }); },
        theme() {
          au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .36], [0, .12],
          [698, .12], [659, .12], [587, .12], [523, .36]], { type: 'square', vol: 0.09 });
          au.melody([[131, .24], [196, .24], [131, .24], [196, .24], [175, .24], [196, .24], [131, .48]], { type: 'triangle', vol: 0.12 });
        },
        good() { au.melody([[523, .08], [659, .08], [784, .08], [1047, .24]], { type: 'square', vol: 0.1 }); },
        bad() { au.melody([[392, .18], [370, .18], [349, .18], [330, .5]], { type: 'square', vol: 0.09 }); }
      };

      // ---------- world / projection ----------
      function proj(x, z, h) { const dz = z - cam; return [52 + x * 0.5 + dz * 0.8, 170 + x * 0.55 - dz * 0.45 - (h || 0)]; }
      function poly(ctx, pts, col) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath(); ctx.fill();
      }
      function gquad(ctx, x0, z0, x1, z1, col, h) { poly(ctx, [proj(x0, z0, h), proj(x1, z0, h), proj(x1, z1, h), proj(x0, z1, h)], col); }
      function wquad(ctx, x, z0, z1, h0, h1, col) { poly(ctx, [proj(x, z0, h0), proj(x, z1, h0), proj(x, z1, h1), proj(x, z0, h1)], col); }
      function zquad(ctx, z, x0, x1, h0, h1, col) { poly(ctx, [proj(x0, z, h0), proj(x1, z, h0), proj(x1, z, h1), proj(x0, z, h1)], col); }
      function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

      function newGame(route, demo) {
        g = {
          score: 0, lives: 3, day: 0, route, demo: !!demo, nextLife: 50000,
          subs: [], over: false
        };
        // 10 of 20 houses start as subscribers
        const idx = []; for (let i = 0; i < NH; i++) { idx.push(i); g.subs.push(false); }
        for (let i = idx.length - 1; i > 0; i--) { const j = rnd() * (i + 1) | 0; [idx[i], idx[j]] = [idx[j], idx[i]]; }
        for (let i = 0; i < 10; i++) g.subs[idx[i]] = true;
        startDay();
      }
      function startDay() {
        seed = (g.day + 1) * 7919 + g.route.dens * 131 + (g.demo ? 5 : 0);
        g.p = { x: 4, z: 0, speed: 1.5, h: 0, vh: 0, crash: 0, inv: 60, anim: 0, throwT: 0 };
        g.papers = 10; g.flying = []; g.fx = []; g.pops = []; g.objs = []; g.houses = []; g.crossings = [];
        g.carT = 120; g.inCourse = false; g.courseScore = 0; g.courseDone = false; g.phase = 'ride'; g.phaseT = 0;
        g.dayScore = 0; g.reaperT = 600;
        const f = g.day + g.route.dens * 2;
        let z = 140;
        for (let i = 0; i < NH; i++) {
          if (i > 0 && i % 5 === 0) { g.crossings.push({ z0: z, z1: z + 70, spawned: false }); z += 70; }
          const sub = g.subs[i];
          const hs = {
            i, z, sub, col: SUBCOL[i % SUBCOL.length], delivered: false, damaged: false, win: [false, false, false],
            mb: { x: -10, z: z + 22, down: false }, lawnPapers: []
          };
          g.houses.push(hs);
          // per-lot obstacles
          if (rnd() < 0.35) g.objs.push(mk('hedge', -34, z + 2, { rx: 20, rz: 3, ht: 8 }));
          if (!sub && rnd() < 0.3) g.objs.push(mk('tomb', -28 - rnd() * 14, z + 30 + rnd() * 40, { rx: 4, rz: 3, ht: 10, target: 100 }));
          if (rnd() < 0.25) g.objs.push(mk('hydrant', 3, z + 40 + rnd() * 40, { rx: 3, rz: 3, ht: 8 }));
          if (rnd() < 0.22) g.objs.push(mk('can', 7, z + 10 + rnd() * 70, { rx: 3, rz: 3, ht: 9, target: 50 }));
          if (rnd() < 0.18 + f * 0.02) g.objs.push(mk('grate', 18, z + rnd() * 90, { rx: 4, rz: 5, ht: 1 }));
          if (rnd() < 0.10 + f * 0.04) g.objs.push(mk('dog', -30, z + 50, { rx: 3, rz: 4, ht: 8, target: 100 }));
          if (rnd() < 0.05 + f * 0.03) g.objs.push(mk('mower', -40, z + 40, { rx: 5, rz: 5, ht: 12, target: 150, vx: 0.4 }));
          if (rnd() < 0.04 + f * 0.03) g.objs.push(mk('dancer', 2, z + 50, { rx: 5, rz: 5, ht: 16, target: 150 }));
          if (rnd() < 0.04 + f * 0.03) g.objs.push(mk('skater', 2, z + 90, { rx: 4, rz: 5, ht: 16, target: 250 }));
          if (rnd() < 0.03 + f * 0.03) g.objs.push(mk('tire', -40, z + 60, { rx: 4, rz: 4, ht: 10 }));
          if (i % 4 === 2) g.objs.push(mk('bundle', -20 + rnd() * 50, z + 60, { rx: 6, rz: 6, ht: 0 }));
          z += LOT;
        }
        g.streetEnd = z + 40;
        // training course
        const c0 = g.streetEnd + 80;
        g.courseStart = c0; g.courseEnd = c0 + 900;
        for (let k = 0; k < 7; k++) {
          const zz = c0 + 60 + k * 120;
          g.objs.push(mk('target', -14, zz, { rx: 4, rz: 4, ht: 22, target: 250 }));
          if (k % 2 === 0) g.objs.push(mk('ramp', 10 + rnd() * 50, zz + 40, { rx: 14, rz: 6, ht: 0 }));
          else g.objs.push(mk('barrel', 6 + rnd() * 70, zz + 40, { rx: 5, rz: 5, ht: 10 }));
          if (rnd() < 0.5 + f * 0.05) g.objs.push(mk('cone', 6 + rnd() * 80, zz + 90, { rx: 3, rz: 3, ht: 6 }));
          if (k === 3 || k === 6) g.objs.push(mk('water', 20 + rnd() * 40, zz + 70, { rx: 12, rz: 8, ht: 0 }));
        }
        g.dens = f;
      }
      function mk(type, x, z, o) {
        return Object.assign({ type, x, z, vx: 0, vz: 0, rx: 4, rz: 4, ht: 8, t: 0, st: 0, dead: false, target: 0 }, o || {});
      }
      function addScore(n, x, z, h) {
        n *= g.route.mult;
        if (!g.demo) { g.score += n; g.dayScore += n; }
        if (x != null) g.pops.push({ x, z, h: (h || 0) + 10, t: 50, s: String(n) });
        if (!g.demo && g.score >= g.nextLife) { g.lives++; g.nextLife += 50000; snd.good(); }
      }
      function houseAt(z) { for (const h of g.houses) if (z >= h.z && z < h.z + LOT) return h; return null; }

      // ---------- input (player or demo AI) ----------
      function readInput() {
        if (!g.demo) return { l: api.key('ArrowLeft'), r: api.key('ArrowRight'), u: api.key('ArrowUp'), d: api.key('ArrowDown'), t: api.pressed('Space') };
        const p = g.p, inp = { l: false, r: false, u: false, d: false, t: false };
        let tx = 32;
        for (const o of g.objs) {
          if (o.dead || o.type === 'bundle' || o.type === 'ramp' || o.type === 'water') continue;
          const dz = o.z - p.z;
          if (dz > -4 && dz < 46 && Math.abs(o.x - p.x) < o.rx + 10) tx = o.x > p.x ? o.x - o.rx - 14 : o.x + o.rx + 14;
        }
        tx = Math.max(-2, Math.min(90, tx));
        if (p.x < tx - 2) inp.r = true; else if (p.x > tx + 2) inp.l = true;
        const hs = houseAt(p.z + 60);
        if (hs && hs.sub && !hs.delivered && p.throwT <= 0 && g.papers > 0) inp.t = true;
        return inp;
      }

      // ---------- update ----------
      function crash() {
        const p = g.p; if (p.crash || p.inv > 0) return;
        p.crash = 90; snd.crash();
        g.fx.push({ type: 'spill', x: p.x, z: p.z, t: 0 });
      }
      function endCourse(finished) {
        if (g.phase !== 'ride') return;
        g.phase = 'courseEnd'; g.phaseT = 150;
        if (finished) { addScore(1000, g.p.x, g.p.z, 20); snd.good(); g.courseDone = true; }
        else snd.bad();
      }
      function updPlay() {
        const p = g.p;
        g.phaseT++;
        if (g.phase === 'courseEnd') {
          p.speed = Math.max(0, p.speed - 0.03); p.z += p.speed;
          if (--g.phaseT <= 0) { if (g.demo) { mode = 'title'; titleT = 0; } else toSummary(); }
          updFx(); return;
        }
        if (g.phase === 'wait') return;
        const inp = readInput();
        if (p.crash > 0) {
          p.crash--;
          if (p.crash === 0) {
            if (g.demo) { mode = 'title'; titleT = 0; return; }
            if (g.inCourse) { endCourse(false); return; }
            g.lives--;
            if (g.lives <= 0) { lastLife(); return; }
            respawn();
          }
          updFx(); return;
        }
        if (p.inv > 0) p.inv--;
        // speed
        const tgt = inp.u ? 2.7 : inp.d ? 0.6 : 1.5;
        p.speed += Math.max(-0.05, Math.min(0.04, tgt - p.speed));
        p.z += p.speed;
        p.anim += p.speed;
        const steer = 1.2;
        if (inp.l) p.x -= steer; if (inp.r) p.x += steer;
        p.lean = inp.l ? -1 : inp.r ? 1 : 0;
        p.x = Math.max(g.inCourse ? -6 : MINX, Math.min(MAXX, p.x));
        // airborne
        if (p.h > 0 || p.vh > 0) {
          p.h += p.vh; p.vh -= 0.13;
          if (p.h <= 0) { p.h = 0; p.vh = 0; addScore(100, p.x, p.z, 10); snd.thud(); }
        }
        // throw
        if (p.throwT > 0) p.throwT--;
        if (inp.t && p.throwT <= 0 && g.papers > 0) {
          g.papers--; p.throwT = 12; snd.toss();
          g.flying.push({ x: p.x - 4, z: p.z + 4, h: 12 + p.h, vx: -2.6, vz: p.speed * 0.7 + 0.5, vh: 1.5, spin: 0 });
        }
        // course boundaries
        if (!g.inCourse && p.z > g.streetEnd) {
          g.inCourse = true; g.objs = g.objs.filter(o => o.z > g.streetEnd - 50 || o.type === 'hedge');
          au.melody([[659, .1], [784, .1], [988, .1], [1319, .2]], { type: 'square', vol: 0.1 });
          g.pops.push({ x: 30, z: p.z + 80, h: 30, t: 120, s: 'TRAINING COURSE' });
        }
        if (g.inCourse && p.z > g.courseEnd) { endCourse(true); return; }
        // traffic
        if (!g.inCourse) {
          if (--g.carT <= 0) {
            g.carT = Math.max(50, 200 - g.dens * 18) + rnd() * 120;
            const oncoming = rnd() < 0.6;
            g.objs.push(mk('car', oncoming ? 62 + rnd() * 22 : 34 + rnd() * 10, p.z + (oncoming ? 320 : -80), {
              rx: 9, rz: 15, ht: 20, vz: oncoming ? -(1.0 + rnd() * 0.6) : 2.9 + rnd() * 0.4, col: ['#d02020', '#2040d0', '#e0d020', '#20a040', '#e0e0e0'][rnd() * 5 | 0]
            }));
            if (rnd() < 0.5) snd.horn();
          }
          for (const c of g.crossings) {
            if (!c.spawned && c.z0 - p.z < 160 && c.z0 - p.z > 0 && rnd() < 0.02 + g.dens * 0.01) {
              c.spawned = true;
              const dir = rnd() < 0.5 ? 1 : -1;
              g.objs.push(mk('xcar', dir > 0 ? -220 : 260, (c.z0 + c.z1) / 2, { rx: 15, rz: 9, ht: 20, vx: dir * 2.4, col: '#c040c0' }));
            }
          }
          if (g.day === 6 && --g.reaperT <= 0) { g.reaperT = 500; g.objs.push(mk('reaper', p.x, p.z - 60, { rx: 5, rz: 5, ht: 24 })); }
          if (g.day >= 5 && rnd() < 0.002 * (g.day - 3)) g.objs.push(mk('tornado', 120, p.z + 200, { rx: 7, rz: 7, ht: 40, vx: -0.8 }));
        }
        updObjs();
        updPapers();
        updFx();
        // pass houses: mark the ones we can no longer reach
      }
      function respawn() {
        const p = g.p;
        p.x = 4; p.speed = 1.2; p.h = 0; p.vh = 0; p.inv = 120;
        g.objs = g.objs.filter(o => !(['car', 'xcar', 'dog', 'skater', 'tire', 'reaper', 'tornado'].includes(o.type) && o.z > p.z - 60 && o.z < p.z + 140));
        g.flying = [];
      }
      function updObjs() {
        const p = g.p;
        for (const o of g.objs) {
          if (o.dead) continue;
          const dz = o.z - p.z;
          if (dz < -150) { o.dead = true; continue; }
          if (dz > 330 && o.type !== 'car') continue;
          o.t++;
          switch (o.type) {
            case 'car': o.z += o.vz; if (o.z < p.z - 200 || o.z > p.z + 600) o.dead = true; break;
            case 'xcar': o.x += o.vx; if (Math.abs(o.x) > 300) o.dead = true; break;
            case 'dog':
              if (o.st === 0 && dz < 90) { o.st = 1; o.t = 0; snd.bark(); }
              if (o.st === 1) {
                o.x += Math.sign(p.x - o.x) * Math.min(1.4, Math.abs(p.x - o.x));
                o.z += Math.max(-1, Math.min(p.speed + 0.25, (p.z - o.z) * 0.1 + p.speed * 0.6));
                o.x = Math.max(-50, o.x);
                if (o.t > 220) o.st = 2;
                if (o.t % 50 === 0) snd.bark();
              }
              break;
            case 'mower': o.x += o.vx; if (o.x > -10 || o.x < -48) o.vx = -o.vx; break;
            case 'skater': if (dz < 200) o.z -= 1.0; break;
            case 'tire': if (dz < 120) { o.x += 1.3; if (o.x > 110) o.dead = true; } break;
            case 'reaper': o.x += Math.sign(p.x - o.x) * 0.8; o.z += Math.max(-1, Math.min(p.speed + 0.3, (p.z - o.z) * 0.05 + p.speed)); if (o.t > 600) o.dead = true; break;
            case 'tornado': o.x += o.vx; o.z += Math.sin(o.t * 0.05) * 0.6; if (o.x < -60) o.dead = true; break;
            case 'stun': break;
          }
          // collisions with the player
          if (o.st === 9) continue; // knocked out
          if (Math.abs(o.x - p.x) < o.rx + 3 && Math.abs(o.z - p.z) < o.rz + 4) {
            if (o.type === 'bundle') { o.dead = true; g.papers = 10; addScore(250, o.x, o.z, 4); snd.pick(); continue; }
            if (o.type === 'ramp') { if (p.h <= 0) { p.vh = 2.0 + p.speed * 0.45; p.h = 0.1; snd.jump(); } continue; }
            if (o.type === 'water') { if (p.h <= 0) { p.speed = Math.min(p.speed, 0.7); } continue; }
            if (o.type === 'tomb' || o.type === 'target') { if (p.h < o.ht) crash(); continue; }
            if (p.h < o.ht) crash();
          }
        }
        g.objs = g.objs.filter(o => !o.dead);
      }
      function updPapers() {
        for (const pp of g.flying) {
          pp.x += pp.vx; pp.z += pp.vz; pp.h += pp.vh; pp.vh -= 0.09; pp.spin++;
          if (pp.done) continue;
          const hs = houseAt(pp.z);
          // mailbox
          if (hs && !hs.mb.down && Math.abs(pp.x - hs.mb.x) < 5 && Math.abs(pp.z - hs.mb.z) < 7 && pp.h < 18) {
            pp.done = true;
            if (hs.sub) {
              if (!hs.delivered) { hs.delivered = true; addScore(250, hs.mb.x, hs.mb.z, 16); snd.mail(); } else snd.thud();
            } else { hs.mb.down = true; addScore(100, hs.mb.x, hs.mb.z, 16); snd.hit(); }
            continue;
          }
          // objects
          for (const o of g.objs) {
            if (!o.target || o.st === 9 || o.dead) continue;
            if (Math.abs(o.x - pp.x) < o.rx + 3 && Math.abs(o.z - pp.z) < o.rz + 4 && pp.h < o.ht + 4) {
              pp.done = true; o.st = 9; o.t = 0; addScore(o.target, o.x, o.z, o.ht); snd.hit();
              if (o.type === 'dog') snd.bark();
              break;
            }
          }
          if (pp.done) continue;
          // house wall
          if (hs && pp.x <= HX1 && pp.z > hs.z + 12 && pp.z < hs.z + 84) {
            pp.done = true; pp.x = HX1 + 1;
            const rel = pp.z - hs.z;
            const wi = rel > 18 && rel < 34 ? 0 : rel > 62 && rel < 78 ? 1 : -1;
            if (wi >= 0 && pp.h > 7 && pp.h < 26) {
              if (!hs.win[wi]) {
                hs.win[wi] = true; snd.glass();
                g.fx.push({ type: 'shards', x: HX1, z: pp.z, h: pp.h, t: 0 });
                if (hs.sub) { hs.damaged = true; g.pops.push({ x: HX1, z: pp.z, h: 30, t: 60, s: 'OOPS!' }); }
                else addScore(100, HX1, pp.z, 26);
              } else snd.thud();
            } else if (rel > 40 && rel < 56) {
              if (hs.sub && !hs.delivered) { hs.delivered = true; addScore(100, HX1, pp.z, 10); snd.porch(); } else snd.thud();
              hs.lawnPapers.push({ x: HX1 + 3, z: pp.z });
            } else { snd.thud(); hs.lawnPapers.push({ x: HX1 + 3, z: pp.z }); }
            continue;
          }
          if (pp.h <= 0) {
            pp.done = true;
            if (hs && pp.x >= LAWN0 && pp.x <= LAWN1) {
              if (hs.sub && !hs.delivered) { hs.delivered = true; addScore(50, pp.x, pp.z, 6); snd.porch(); }
              if (hs.lawnPapers.length < 6) hs.lawnPapers.push({ x: pp.x, z: pp.z });
            } else g.fx.push({ type: 'paper', x: pp.x, z: pp.z, t: 0 });
          }
        }
        g.flying = g.flying.filter(pp => !pp.done && pp.z < cam + 400);
      }
      function updFx() {
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.type === 'paper' ? 400 : 60));
        for (const q of g.pops) { q.t--; q.h += 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
      }
      function toSummary() {
        mode = 'summary'; g.sumT = 0;
        g.lost = 0; g.kept = 0; g.gained = -1;
        let perfect = true;
        for (const hs of g.houses) {
          if (!hs.sub) continue;
          if (hs.delivered && !hs.damaged) g.kept++; else { g.subs[hs.i] = false; g.lost++; perfect = false; }
        }
        g.perfect = perfect && g.kept > 0;
        if (g.perfect) {
          const non = g.houses.filter(h => !h.sub);
          if (non.length) { const pick = non[rnd() * non.length | 0]; g.subs[pick.i] = true; g.gained = pick.i; }
          addScore(g.kept * 250);
        }
        g.subCount = g.subs.filter(Boolean).length;
        if (g.perfect) snd.good(); else if (g.subCount === 0) snd.bad(); else au.melody([[523, .1], [440, .1], [523, .2]], { type: 'square', vol: 0.08 });
      }
      function updSummary() {
        g.sumT++;
        if (g.sumT > 90 && (api.anyPressed('Enter', 'Space') || g.sumT > 480)) {
          if (g.subCount === 0) { g.fired = true; gameOver(); return; }
          if (g.day >= 6) { g.won = true; addScore(10000 * 1); gameOver(); return; }
          g.day++; startDay(); mode = 'dayintro'; g.introT = 0; snd.theme();
        }
      }
      function gameOver() {
        if (!g.demo) { api.setHiScore(g.score); hi = Math.max(hi, g.score); }
        mode = 'over'; g.overT = 0;
        if (!g.won) snd.bad(); else au.melody([[523, .12], [659, .12], [784, .12], [1047, .12], [784, .12], [1047, .4]], { type: 'square', vol: 0.1 });
      }
      function lastLife() {
        g.phase = 'wait';
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) { g.lives = 3; g.phase = 'ride'; respawn(); } }, () => { if (g === cg) gameOver(); });
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title' || mode === 'demo') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'select'; sel = 0; selT = 0; return; }
          if (mode === 'title' && titleT > 420) { newGame(ROUTES[1], true); g.day = (frame >> 6) % 7; startDay(); mode = 'demo'; titleT = 0; cam = g.p.z; }
          if (mode === 'demo') { updPlay(); cam += (g.p.z - cam) * 0.3; if (titleT > 1500 && mode === 'demo') { mode = 'title'; titleT = 0; } }
          return;
        }
        if (mode === 'select') {
          selT++;
          if (api.pressed('ArrowUp')) { sel = (sel + 2) % 3; snd.hit(); }
          if (api.pressed('ArrowDown')) { sel = (sel + 1) % 3; snd.hit(); }
          if ((selT > 15 && api.anyPressed('Enter', 'Space')) || selT > 900) {
            seed = (Date.now() & 0xffff) + 1;
            newGame(ROUTES[sel], false); mode = 'dayintro'; g.introT = 0; snd.theme();
          }
          return;
        }
        if (mode === 'dayintro') { if (++g.introT > 200 || (g.introT > 40 && api.anyPressed('Enter', 'Space'))) { mode = 'play'; cam = g.p.z; } return; }
        if (mode === 'play') { updPlay(); cam += (g.p.z - cam) * 0.3; return; }
        if (mode === 'summary') { updSummary(); return; }
        if (mode === 'over') { if (++g.overT > 360 || (g.overT > 90 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; } }
      }

      // ---------- drawing ----------
      function drawGround(ctx) {
        const z0 = cam - 120, z1 = cam + 360;
        ctx.fillStyle = '#1c6a1c'; ctx.fillRect(0, 0, W, H);
        const sEnd = g.streetEnd;
        const za = z0, zb = Math.min(z1, sEnd);
        if (zb > za) {
          gquad(ctx, -260, za, LAWN1, zb, '#2a8a2a');
          gquad(ctx, LAWN1, za, WALK1, zb, '#b8b8a8');
          gquad(ctx, WALK1, za, CURB1, zb, '#e8e8e0');
          gquad(ctx, CURB1, za, ST1, zb, '#54545e');
          gquad(ctx, ST1, za, ST1 + 3, zb, '#e8e8e0');
          gquad(ctx, ST1 + 3, za, ST1 + 18, zb, '#b8b8a8');
          gquad(ctx, ST1 + 18, za, 300, zb, '#2a8a2a');
          // lane dashes
          for (let z = Math.floor(za / 40) * 40; z < zb; z += 40) gquad(ctx, 55, z, 57, z + 20, '#e8d040');
          // sidewalk joints
          for (let z = Math.floor(za / 16) * 16; z < zb; z += 16) gquad(ctx, LAWN1, z, WALK1, z + 1, '#98988a');
          // houses' driveways and walks
          for (const hs of g.houses) {
            if (hs.z + LOT < za || hs.z > zb) continue;
            gquad(ctx, HX1, hs.z + 86, LAWN1, hs.z + 98, '#a0a098');
            gquad(ctx, HX1, hs.z + 44, LAWN1, hs.z + 52, '#c8b090');
            gquad(ctx, WALK1, hs.z + 86, CURB1, hs.z + 98, '#a0a098');
          }
          // intersections
          for (const c of g.crossings) {
            if (c.z1 < za || c.z0 > zb) continue;
            gquad(ctx, -260, c.z0, 300, c.z1, '#54545e');
            for (let x = -200; x < 280; x += 30) gquad(ctx, x, c.z0 + 34, x + 15, c.z0 + 36, '#e8d040');
            for (let x = 14; x < 98; x += 8) { gquad(ctx, x, c.z0 + 2, x + 4, c.z0 + 10, '#e8e8e0'); gquad(ctx, x, c.z1 - 10, x + 4, c.z1 - 2, '#e8e8e0'); }
          }
        }
        // the end of the street and the training course
        if (z1 > sEnd) {
          gquad(ctx, -260, Math.max(z0, sEnd), 300, Math.min(z1, g.courseStart), '#2a8a2a');
          gquad(ctx, -2, Math.max(z0, sEnd), 98, Math.min(z1, g.courseStart), '#54545e');
          if (z1 > g.courseStart) {
            const ca = Math.max(z0, g.courseStart), cb = Math.min(z1, g.courseEnd + 60);
            gquad(ctx, -260, ca, -8, cb, '#5a9a3a');
            gquad(ctx, -8, ca, 100, cb, '#b08040');
            gquad(ctx, 100, ca, 300, cb, '#5a9a3a');
            for (let z = Math.floor(ca / 30) * 30; z < cb; z += 30) { gquad(ctx, -10, z, -8, z + 15, '#e8e8e8'); gquad(ctx, 100, z, 102, z + 15, '#e8e8e8'); }
            if (g.courseStart > z0) for (let x = -8; x < 100; x += 8) gquad(ctx, x, g.courseStart, x + 4, g.courseStart + 6, '#fff');
            if (g.courseEnd < z1) for (let x = -8; x < 100; x += 8) { gquad(ctx, x, g.courseEnd, x + 4, g.courseEnd + 5, ((x >> 3) & 1) ? '#000' : '#fff'); gquad(ctx, x + 4, g.courseEnd + 5, x + 8, g.courseEnd + 10, ((x >> 3) & 1) ? '#000' : '#fff'); }
          }
        }
      }
      function drawHouse(ctx, hs) {
        const z0 = hs.z + 12, z1 = hs.z + 84, xm = (HX0 + HX1) / 2;
        const wall = hs.sub ? hs.col[0] : '#3a3a44', roof = hs.sub ? hs.col[1] : '#1e1e24';
        const shade = hs.sub ? '#9a9080' : '#2a2a30';
        // back roof slope
        poly(ctx, [proj(HX0, z0, HH), proj(HX0, z1, HH), proj(xm, z1, HH + RH), proj(xm, z0, HH + RH)], roof);
        // front and near walls
        wquad(ctx, HX1, z0, z1, 0, HH, wall);
        zquad(ctx, z0, HX0, HX1, 0, HH, shade);
        // windows
        for (let w = 0; w < 2; w++) {
          const wz = w === 0 ? 20 : 64;
          wquad(ctx, HX1 + 0.2, hs.z + wz, hs.z + wz + 12, 9, 24, '#202838');
          if (hs.win[w]) {
            wquad(ctx, HX1 + 0.3, hs.z + wz + 1, hs.z + wz + 11, 10, 23, '#000');
            const a = proj(HX1, hs.z + wz + 3, 20), b = proj(HX1, hs.z + wz + 8, 12);
            R(ctx, a[0], a[1], 2, 2, '#c0e0ff'); R(ctx, b[0], b[1], 1, 3, '#c0e0ff');
          } else {
            wquad(ctx, HX1 + 0.3, hs.z + wz + 1, hs.z + wz + 11, 10, 23, hs.sub ? '#80c0f0' : '#506070');
            wquad(ctx, HX1 + 0.4, hs.z + wz + 5.5, hs.z + wz + 6.5, 10, 23, '#202838');
          }
        }
        // door + step
        wquad(ctx, HX1 + 0.2, hs.z + 42, hs.z + 54, 0, 22, hs.sub ? '#6a3010' : '#181818');
        R(ctx, ...proj(HX1, hs.z + 51, 10), 1, 1, '#ffd040');
        gquad(ctx, HX1, hs.z + 40, HX1 + 6, hs.z + 56, '#8a8070', 0);
        // front roof slope and gable
        poly(ctx, [proj(HX1, z0, HH), proj(HX1, z1, HH), proj(xm, z1, HH + RH), proj(xm, z0, HH + RH)], roof);
        poly(ctx, [proj(HX0, z0, HH), proj(HX1, z0, HH), proj(xm, z0, HH + RH)], shade);
        // address number on subscribers' homes
        if (hs.sub) { const a = proj(HX1, hs.z + 36, 28); text(ctx, String(hs.i + 1), a[0] - 2, a[1], '#000', 1); }
      }
      function drawBike(ctx, x, y, frameN, lean, col) {
        // forward on screen is up-right; a little diagonal bike + rider
        const wob = (frameN >> 3) & 1;
        R(ctx, x + 3, y - 6, 4, 4, '#111'); R(ctx, x + 4, y - 5, 2, 2, '#888');   // front wheel (up-right)
        R(ctx, x - 5, y - 1, 4, 4, '#111'); R(ctx, x - 4, y, 2, 2, '#888');       // rear wheel
        R(ctx, x - 2, y - 4, 6, 2, '#c02020'); R(ctx, x + 3, y - 8, 2, 4, '#888');
        R(ctx, x - 3 + lean, y - 14, 5, 7, col);
        R(ctx, x - 1 + lean, y - 7, 2, 3 + wob, '#2040a0'); R(ctx, x - 3 + lean, y - 7, 2, 4 - wob, '#2040a0');
        R(ctx, x - 3 + lean, y - 19, 4, 5, '#f0b080');
        R(ctx, x - 3 + lean, y - 20, 4, 2, '#d02020'); R(ctx, x + 1 + lean, y - 19, 2, 1, '#d02020');
        R(ctx, x - 4 + lean, y - 12, 2, 4, '#f0f0f0');          // bag of papers (left side)
      }
      function drawObj(ctx, o) {
        const [x, y] = proj(o.x, o.z, 0);
        const t = o.t, ko = o.st === 9;
        switch (o.type) {
          case 'hedge': {
            gquad(ctx, o.x - o.rx, o.z - 2, o.x + o.rx, o.z + 2, '#0e4a0e', 0);
            poly(ctx, [proj(o.x - o.rx, o.z - 2, 8), proj(o.x + o.rx, o.z - 2, 8), proj(o.x + o.rx, o.z + 2, 8), proj(o.x - o.rx, o.z + 2, 8)], '#1a6a1a');
            zquad(ctx, o.z - 2, o.x - o.rx, o.x + o.rx, 0, 8, '#145a14');
            break;
          }
          case 'tomb': if (ko) { R(ctx, x - 4, y - 2, 8, 3, '#888'); break; } R(ctx, x - 3, y - 10, 7, 10, '#a0a0a8'); R(ctx, x - 2, y - 11, 5, 1, '#a0a0a8'); R(ctx, x - 1, y - 8, 3, 1, '#555'); R(ctx, x, y - 9, 1, 4, '#555'); break;
          case 'hydrant': R(ctx, x - 2, y - 8, 5, 8, '#e02020'); R(ctx, x - 3, y - 5, 7, 2, '#e02020'); R(ctx, x - 1, y - 9, 3, 1, '#ffd040'); break;
          case 'can': if (ko) { R(ctx, x - 5, y - 3, 9, 4, '#707880'); R(ctx, x + 4, y - 2, 3, 3, '#a0a8b0'); break; } R(ctx, x - 3, y - 9, 7, 9, '#808890'); R(ctx, x - 4, y - 10, 9, 2, '#a0a8b0'); break;
          case 'grate': gquad(ctx, o.x - 4, o.z - 5, o.x + 4, o.z + 5, '#202020', 0); for (let k = -3; k <= 3; k += 2) gquad(ctx, o.x - 4, o.z + k, o.x + 4, o.z + k + 0.6, '#808080', 0); break;
          case 'dog': {
            const run = o.st === 1 ? (t >> 2) & 1 : 0;
            if (ko) { R(ctx, x - 5, y - 3, 9, 3, '#7a4a20'); text(ctx, '*', x - 3, y - 12, '#ffd040'); break; }
            R(ctx, x - 5, y - 6, 9, 4, '#7a4a20'); R(ctx, x - 7, y - 9, 4, 4, '#7a4a20'); R(ctx, x - 7, y - 8, 1, 1, '#000');
            R(ctx, x - 4, y - 2, 1, 2 + run, '#5a3410'); R(ctx, x + 2, y - 2, 1, 3 - run, '#5a3410'); R(ctx, x + 4, y - 8, 1, 3, '#7a4a20');
            break;
          }
          case 'mower':
            R(ctx, x - 4, y - 4, 8, 4, '#d03020'); R(ctx, x - 2, y - 16, 4, 6, '#40a0d0'); R(ctx, x - 2, y - 20, 4, 4, '#f0b080');
            R(ctx, x - 2, y - 10, 1, 6, '#203070'); R(ctx, x + 1, y - 10, 1, 6, '#203070'); R(ctx, x - 6, y - 8, 4, 1, '#888');
            if (ko) text(ctx, '*', x - 2, y - 28, '#ffd040');
            break;
          case 'dancer': {
            const fr = ko ? 0 : (t >> 3) & 3;
            if (fr === 0 || fr === 2) { R(ctx, x - 2, y - 15, 5, 7, '#f0f020'); R(ctx, x - 2, y - 19, 4, 4, '#8a5030'); R(ctx, x - 2, y - 8, 2, 8, '#202020'); R(ctx, x + 1, y - 8, 2, 8, '#202020'); R(ctx, fr ? x + 3 : x - 5, y - 15, 3, 2, '#8a5030'); }
            else { R(ctx, x - 6, y - 6, 12, 4, '#f0f020'); R(ctx, x - 8, y - 6, 3, 3, '#8a5030'); R(ctx, x + 2, y - 10, 2, 5, '#202020'); R(ctx, x + 4, y - 12, 2, 5, '#202020'); }
            R(ctx, x + 6, y - 6, 6, 5, '#404040'); R(ctx, x + 7, y - 5, 1, 1, '#c0c0c0'); R(ctx, x + 10, y - 5, 1, 1, '#c0c0c0');
            break;
          }
          case 'skater':
            if (ko) { R(ctx, x - 6, y - 3, 10, 3, '#e04080'); R(ctx, x + 4, y - 1, 6, 1, '#804010'); break; }
            R(ctx, x - 4, y - 1, 9, 1, '#804010'); R(ctx, x - 3, y, 1, 1, '#000'); R(ctx, x + 3, y, 1, 1, '#000');
            R(ctx, x - 1, y - 8, 3, 7, '#202080'); R(ctx, x - 2, y - 14, 5, 6, '#e04080'); R(ctx, x - 1, y - 18, 4, 4, '#f0b080'); R(ctx, x - 4, y - 13, 2, 1, '#f0b080'); R(ctx, x + 3, y - 13, 2, 1, '#f0b080');
            break;
          case 'tire': { const s = (t >> 2) & 1; R(ctx, x - 4, y - 9, 8, 9, '#181818'); R(ctx, x - 2, y - 7, 4, 5, s ? '#606060' : '#404040'); break; }
          case 'bundle': R(ctx, x - 5, y - 5, 10, 5, '#f0f0e8'); R(ctx, x - 5, y - 3, 10, 1, '#c02020'); R(ctx, x - 1, y - 5, 1, 5, '#c02020'); if ((frame >> 4) & 1) text(ctx, 'NEWS', x - 11, y - 14, '#fff'); break;
          case 'car': case 'xcar': {
            const side = o.type === 'xcar';
            const L = side ? 14 : 8, Wd = side ? 7 : 13;
            gquad(ctx, o.x - (side ? L : Wd - 4), o.z - (side ? Wd - 2 : L + 6), o.x + (side ? L : Wd - 4), o.z + (side ? Wd - 2 : L + 6), 'rgba(0,0,0,.35)', 0);
            // body box
            const bx0 = o.x - (side ? 15 : 8), bx1 = o.x + (side ? 15 : 8), bz0 = o.z - (side ? 8 : 14), bz1 = o.z + (side ? 8 : 14);
            wquad(ctx, bx1, bz0, bz1, 2, 10, o.col);
            zquad(ctx, bz0, bx0, bx1, 2, 10, o.col);
            gquad(ctx, bx0, bz0, bx1, bz1, o.col, 10);
            // cabin
            const cx0 = side ? o.x - 7 : bx0 + 1, cx1 = side ? o.x + 6 : bx1 - 1, cz0 = side ? bz0 + 1 : o.z - 6, cz1 = side ? bz1 - 1 : o.z + 6;
            wquad(ctx, cx1, cz0, cz1, 10, 17, '#70a0d0'); zquad(ctx, cz0, cx0, cx1, 10, 17, '#5080b0'); gquad(ctx, cx0, cz0, cx1, cz1, o.col, 17);
            const w0 = proj(bx1, bz0 + 3, 0), w1 = proj(bx1, bz1 - 4, 0);
            R(ctx, w0[0] - 1, w0[1] - 3, 3, 3, '#111'); R(ctx, w1[0] - 1, w1[1] - 3, 3, 3, '#111');
            break;
          }
          case 'reaper': {
            const fl = Math.sin(t * 0.1) * 2;
            R(ctx, x - 4, y - 24 + fl, 8, 18, '#101018'); R(ctx, x - 2, y - 22 + fl, 4, 4, '#e8e8d8'); R(ctx, x - 1, y - 21 + fl, 1, 1, '#000'); R(ctx, x + 1, y - 21 + fl, 1, 1, '#000');
            R(ctx, x + 5, y - 30 + fl, 1, 24, '#806040'); R(ctx, x - 1, y - 30 + fl, 7, 2, '#c0c0c0');
            break;
          }
          case 'tornado': for (let k = 0; k < 10; k++) { const w = 3 + k * 1.4; R(ctx, x - w + Math.sin(t * 0.3 + k) * 3, y - k * 4 - 4, w * 2, 3, k & 1 ? '#a0a0b0' : '#707080'); } break;
          case 'target':
            R(ctx, x, y - 12, 1, 12, '#806040');
            if (ko) { R(ctx, x - 5, y - 2, 10, 2, '#e02020'); break; }
            R(ctx, x - 5, y - 22, 11, 11, '#f0f0f0'); R(ctx, x - 3, y - 20, 7, 7, '#e02020'); R(ctx, x - 1, y - 18, 3, 3, '#f0f0f0');
            break;
          case 'ramp': {
            poly(ctx, [proj(o.x - o.rx, o.z - o.rz, 0), proj(o.x + o.rx, o.z - o.rz, 0), proj(o.x + o.rx, o.z + o.rz, 8), proj(o.x - o.rx, o.z + o.rz, 8)], '#c8a060');
            wquad(ctx, o.x + o.rx, o.z - o.rz, o.z + o.rz, 0, 0.1, '#806030');
            break;
          }
          case 'barrel': R(ctx, x - 4, y - 10, 8, 10, '#3070c0'); R(ctx, x - 4, y - 7, 8, 1, '#204070'); R(ctx, x - 4, y - 3, 8, 1, '#204070'); R(ctx, x - 3, y - 11, 6, 1, '#5090e0'); break;
          case 'cone': R(ctx, x - 3, y - 1, 7, 1, '#e06010'); R(ctx, x - 2, y - 4, 5, 3, '#ff8020'); R(ctx, x - 1, y - 7, 3, 3, '#ff8020'); R(ctx, x - 2, y - 4, 5, 1, '#fff'); break;
          case 'water': gquad(ctx, o.x - o.rx, o.z - o.rz, o.x + o.rx, o.z + o.rz, '#3060c0', 0); gquad(ctx, o.x - o.rx + 3, o.z - 2, o.x + o.rx - 5, o.z + 1, '#80b0f0', 0); break;
        }
      }
      function drawMailbox(ctx, hs) {
        const mb = hs.mb, [x, y] = proj(mb.x, mb.z, 0);
        const col = hs.sub ? hs.col[1] : '#303038';
        if (mb.down) { R(ctx, x - 6, y - 2, 10, 3, col); R(ctx, x - 6, y, 8, 1, '#806040'); return; }
        R(ctx, x, y - 10, 1, 10, '#806040');
        R(ctx, x - 3, y - 15, 7, 5, col); R(ctx, x - 3, y - 15, 7, 1, '#ffffff40');
        if (hs.sub) R(ctx, x + 4, y - 16, 1, 4, '#e02020');
      }
      function drawWorld(ctx) {
        drawGround(ctx);
        // houses back to front
        const hsList = g.houses.filter(hs => hs.z < cam + 330 && hs.z + LOT > cam - 140);
        for (let i = hsList.length - 1; i >= 0; i--) drawHouse(ctx, hsList[i]);
        // papers lying on lawns
        for (const hs of hsList) for (const lp of hs.lawnPapers) { const a = proj(lp.x, lp.z, 0); R(ctx, a[0] - 2, a[1] - 1, 4, 2, '#f0f0e8'); }
        for (const f of g.fx) if (f.type === 'paper') { const a = proj(f.x, f.z, 0); R(ctx, a[0] - 2, a[1] - 1, 4, 2, '#f0f0e8'); }
        // depth-sorted sprites
        const list = [];
        for (const hs of hsList) list.push({ k: proj(hs.mb.x, hs.mb.z, 0)[1], f: () => drawMailbox(ctx, hs) });
        for (const o of g.objs) {
          if (o.z > cam + 330 || o.z < cam - 140) continue;
          const flat = o.type === 'grate' || o.type === 'water' || o.type === 'ramp';
          list.push({ k: flat ? -999 : proj(o.x, o.z, 0)[1], f: () => drawObj(ctx, o) });
        }
        const p = g.p;
        list.push({
          k: proj(p.x, p.z, 0)[1] + 0.5, f: () => {
            const [x, y] = proj(p.x, p.z, 0);
            if (p.h > 0) R(ctx, x - 5, y - 1, 9, 2, 'rgba(0,0,0,.4)');
            if (p.crash) {
              const c = 90 - p.crash;
              const yy = y - p.h - Math.max(0, 14 - Math.abs(c - 14));
              R(ctx, x - 9, y - 4, 4, 4, '#111'); R(ctx, x + 3, y - 2, 4, 4, '#111'); R(ctx, x - 6, y - 3, 10, 1, '#c02020');
              R(ctx, x - 4 + c * 0.2, yy - 6, 8, 4, '#f0f0f0'); R(ctx, x + 4 + c * 0.2, yy - 8, 4, 4, '#f0b080'); R(ctx, x + 4 + c * 0.2, yy - 9, 4, 1, '#d02020');
              if ((c >> 3) & 1) text(ctx, '*', x + 2, yy - 18, '#ffd040');
              return;
            }
            if (p.inv > 0 && (p.inv >> 2) & 1) return;
            drawBike(ctx, x, y - p.h, p.anim | 0, p.lean || 0, '#f0f0f0');
          }
        });
        for (const pp of g.flying) list.push({
          k: proj(pp.x, pp.z, 0)[1], f: () => {
            const [x, y] = proj(pp.x, pp.z, 0); R(ctx, x - 1, y, 3, 1, 'rgba(0,0,0,.35)');
            const s = (pp.spin >> 2) & 1, yy = y - pp.h;
            R(ctx, x - (s ? 1 : 3), yy - (s ? 3 : 1), s ? 3 : 6, s ? 6 : 3, '#f4f4ec');
          }
        });
        list.sort((a, b) => a.k - b.k);
        for (const it of list) it.f();
        for (const f of g.fx) if (f.type === 'shards') {
          const a = proj(f.x, f.z, f.h);
          for (let k = 0; k < 5; k++) R(ctx, a[0] + k * f.t * 0.25, a[1] + f.t * f.t * 0.02 + k * 2, 1, 1, '#c0e0ff');
        }
        for (const q of g.pops) { const a = proj(q.x, q.z, q.h); text(ctx, q.s, a[0], a[1], (q.t >> 2) & 1 ? '#ffffff' : '#ffd040', 1, 'center'); }
      }
      function drawHud(ctx) {
        R(ctx, 0, 0, W, 18, '#000');
        text(ctx, String(g.score).padStart(7, ' '), 2, 2, '#ffffff', 1);
        text(ctx, 'HI ' + Math.max(hi, g.score), 2, 10, '#a0a0a0', 1);
        text(ctx, DAYS[g.day], W / 2, 2, '#ffd040', 1, 'center');
        text(ctx, g.route.name, W / 2, 10, g.route.col, 1, 'center');
        for (let i = 0; i < 10; i++) R(ctx, W - 4 - i * 5, 3, 4, 3, i < g.papers ? '#f0f0e8' : '#303030');
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) { R(ctx, W - 6 - i * 8, 10, 4, 5, '#f0f0f0'); R(ctx, W - 6 - i * 8, 9, 4, 1, '#d02020'); }
        if (g.inCourse) text(ctx, 'TRAINING', W - 2, 22, '#ffd040', 1, 'right');
      }
      function drawNewspaper(ctx, y0, title, line1, line2) {
        R(ctx, 24, y0, 208, 150, '#e8e4d4');
        R(ctx, 24, y0 + 30, 208, 1, '#000'); R(ctx, 24, y0 + 32, 208, 1, '#000');
        text(ctx, 'THE DAILY SUN', W / 2, y0 + 8, '#000', 2, 'center');
        text(ctx, title, W / 2, y0 + 40, '#000', 1, 'center');
        text(ctx, line1, W / 2, y0 + 56, '#802020', 1, 'center');
        if (line2) text(ctx, line2, W / 2, y0 + 70, '#202060', 1, 'center');
        for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) R(ctx, 34 + c * 64, y0 + 88 + r * 9, 56 - ((r * 7 + c * 3) % 5) * 6, 3, '#9a968a');
      }
      function drawSummary(ctx) {
        ctx.fillStyle = '#102050'; ctx.fillRect(0, 0, W, H);
        text(ctx, DAYS[g.day] + ' DELIVERY REPORT', W / 2, 10, '#ffd040', 1, 'center');
        // street map
        for (let i = 0; i < NH; i++) {
          const hs = g.houses[i], c = i % 10, r = i / 10 | 0;
          const x = 18 + c * 23, y = 32 + r * 40;
          const show = g.sumT > i * 4;
          let col = '#404048', lab = '';
          if (hs.sub) { if (hs.delivered && !hs.damaged) { col = '#30c030'; lab = 'OK'; } else { col = '#d02020'; lab = 'X'; } }
          if (i === g.gained && g.sumT > 90) { col = (frame >> 3) & 1 ? '#ffd040' : '#30c030'; lab = 'NEW'; }
          if (!show) continue;
          R(ctx, x, y + 6, 18, 14, col); poly(ctx, [[x - 2, y + 7], [x + 9, y - 1], [x + 20, y + 7]], '#202020');
          R(ctx, x + 7, y + 13, 4, 7, '#101010');
          text(ctx, lab, x + 9, y + 23, '#ffffff', 1, 'center');
        }
        if (g.sumT > 90) {
          text(ctx, 'SUBSCRIBERS KEPT  ' + g.kept, 30, 128, '#30c030', 1);
          text(ctx, 'SUBSCRIBERS LOST  ' + g.lost, 30, 140, '#ff6060', 1);
          if (g.perfect) { text(ctx, 'PERFECT DELIVERY!', W / 2, 160, (frame >> 3) & 1 ? '#ffd040' : '#ffffff', 1, 'center'); text(ctx, 'BONUS ' + g.kept * 250 * g.route.mult + '  +1 SUBSCRIBER', W / 2, 172, '#ffffff', 1, 'center'); }
          text(ctx, 'TOTAL SUBSCRIBERS ' + g.subCount, W / 2, 190, '#80c0ff', 1, 'center');
          if (g.subCount === 0) text(ctx, "YOU'RE FIRED!", W / 2, 206, '#ff4040', 2, 'center');
          else text(ctx, 'SCORE ' + g.score, W / 2, 210, '#ffffff', 1, 'center');
          if ((frame >> 4) & 1) text(ctx, 'PRESS SPACE', W / 2, 228, '#808080', 1, 'center');
        }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#123a8a'; ctx.fillRect(0, 0, W, H);
        // sky / skyline
        for (let i = 0; i < 12; i++) { const hgt = 20 + ((i * 37) % 30); R(ctx, i * 22, 120 - hgt, 20, hgt, '#0c2a68'); }
        R(ctx, 0, 120, W, 120, '#2a8a2a'); R(ctx, 0, 150, W, 40, '#54545e'); for (let x = (-frame) % 40; x < W; x += 40) R(ctx, x, 169, 20, 2, '#e8d040');
        // title
        const t = 'PAPERBOY';
        for (let i = 0; i < t.length; i++) {
          const yy = 30 + Math.round(Math.sin(frame * 0.08 + i * 0.7) * 3);
          text(ctx, t[i], 36 + i * 24, yy + 2, '#000', 4); text(ctx, t[i], 34 + i * 24, yy, i % 2 ? '#ffffff' : '#ffd040', 4);
        }
        text(ctx, 'THE DAILY SUN DELIVERY ROUTE', W / 2, 70, '#ffffff', 1, 'center');
        drawBike(ctx, 60 + ((frame * 0.7) % 180), 165, frame, 0, '#f0f0f0');
        const page = (titleT >> 8) & 1;
        if (page === 0) {
          text(ctx, 'MAILBOX    250', W / 2, 90, '#ffd040', 1, 'center');
          text(ctx, 'DOORSTEP   100', W / 2, 100, '#ffd040', 1, 'center');
          text(ctx, 'NON-SUB WINDOW 100', W / 2, 110, '#ff8080', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2, 90, '#ffffff', 1, 'center');
          text(ctx, String(hi), W / 2, 102, '#ffd040', 2, 'center');
        }
        R(ctx, 0, 190, W, 50, '#000');
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 198, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 198, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 198, blink ? '#ffffff' : '#888888', 1, 'center');
        text(ctx, 'EXTRA BIKE EVERY 50000', W / 2, 212, '#80c0ff', 1, 'center');
        text(ctx, credStr(), 4, 230, '#888888', 1);
        text(ctx, '\u00a9 1985 ATARI GAMES', W - 4, 230, '#888888', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        if (mode === 'select') {
          ctx.fillStyle = '#123a8a'; ctx.fillRect(0, 0, W, H);
          text(ctx, 'CHOOSE YOUR ROUTE', W / 2, 40, '#ffffff', 2, 'center');
          ROUTES.forEach((r, i) => {
            const y = 90 + i * 34;
            if (i === sel) R(ctx, 40, y - 6, 176, 22, '#000');
            text(ctx, r.name, W / 2, y, i === sel ? r.col : '#8090b0', 1, 'center');
            text(ctx, 'POINTS X' + r.mult, W / 2, y + 9, i === sel ? '#ffffff' : '#506080', 1, 'center');
          });
          text(ctx, 'UP/DOWN THEN SPACE', W / 2, 200, '#ffd040', 1, 'center');
          return;
        }
        if (mode === 'summary') { drawSummary(ctx); return; }
        if (mode === 'dayintro') {
          ctx.fillStyle = '#123a8a'; ctx.fillRect(0, 0, W, H);
          const y0 = Math.max(40, 240 - g.introT * 4);
          drawNewspaper(ctx, y0, DAYS[g.day] + ' EDITION', HEADLINES[g.day], 'SUBSCRIBERS: ' + g.subs.filter(Boolean).length);
          if (y0 === 40) text(ctx, 'DELIVER TO THE BRIGHT HOUSES', W / 2, 206, '#ffffff', 1, 'center');
          if (y0 === 40) text(ctx, 'BREAK WINDOWS OF THE DARK ONES', W / 2, 218, '#ff8080', 1, 'center');
          return;
        }
        // play / demo / over
        drawWorld(ctx);
        drawHud(ctx);
        if (mode === 'demo') {
          R(ctx, 60, 96, 136, 30, 'rgba(0,0,0,.6)');
          text(ctx, 'PAPERBOY', W / 2, 100, '#ffd040', 2, 'center');
          if ((frame >> 4) & 1) text(ctx, api.credits ? 'PUSH START' : 'INSERT COIN', W / 2, 117, '#ffffff', 1, 'center');
        }
        if (g.phase === 'courseEnd') text(ctx, g.courseDone ? 'COURSE COMPLETE!' : 'WIPE OUT!', W / 2, 60, '#ffd040', 2, 'center');
        if (mode === 'play' && g.p.z < 40) text(ctx, DAYS[g.day], W / 2, 70, '#ffffff', 2, 'center');
        if (mode === 'over') {
          R(ctx, 40, 80, 176, 60, 'rgba(0,0,0,.75)');
          if (g.won) { text(ctx, 'PAPERBOY', W / 2, 88, '#ffd040', 2, 'center'); text(ctx, 'OF THE YEAR!', W / 2, 108, '#ffffff', 2, 'center'); }
          else { text(ctx, g.fired ? "YOU'RE FIRED" : 'GAME OVER', W / 2, 96, '#ff4040', 2, 'center'); }
          text(ctx, 'SCORE ' + g.score, W / 2, 128, '#ffffff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
