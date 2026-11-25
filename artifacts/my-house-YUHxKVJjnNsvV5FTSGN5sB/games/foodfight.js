// Food Fight (General Computer Corp. / Atari, 1983) \u2014 from-scratch recreation.
// Charley Chuck races across the room to eat the melting ice cream cone while the chefs chase him.
// Grab food from the piles and throw it; close calls earn an INSTANT REPLAY.
(function () {
  'use strict';
  const W = 256, H = 240;
  // ---------- 5x7 bitmap font ----------
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '>': [8, 4, 2, 1, 2, 4, 8]
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

  // ---------- data ----------
  const TOP = 22, BOT = 232, LEFT = 6, RIGHT = 250;
  const FOODS = [
    { name: 'PEAS', col: '#3ccf3c', speed: 3.4, spread: 3 },
    { name: 'TOMATO', col: '#ff3a2a', speed: 3.0 },
    { name: 'PIE', col: '#e8c27a', speed: 2.8 },
    { name: 'BANANA', col: '#ffe23a', speed: 3.0 },
    { name: 'WATERMELON', col: '#2f9b3a', speed: 2.3, pierce: true }
  ];
  const CHEFS = [
    { name: 'OSCAR', apron: '#e04848' }, { name: 'ANGELO', apron: '#4878f0' },
    { name: 'ZORBA', apron: '#40c060' }, { name: 'JACQUES', apron: '#e0a020' }
  ];
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

  ArcadeRegistry.register({
    id: 'foodfight', title: 'Food Fight', year: 1983, maker: 'General Computer / Atari',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: run (8-way) \u00b7 Space: throw food \u00b7 Enter: start',
    marquee: { bg: '#fff2d0', fg: '#e0302a', accent: '#2f9b3a' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const irnd = n => (Math.random() * n) | 0;
      let hi = api.getHiScore(20000);
      let state = 'attract', stateT = 0, coinFlash = 0;
      let score = 0, lives = 3, level = 1, nextExtra = 20000;
      let charley, chefs, shots, piles, holes, cone, splats;
      let history = [], replay = null, replayI = 0, closeCall = 0;
      let msg = '', msgT = 0, deathT = 0, clearT = 0, bonus = 0;

      // ---------- level setup ----------
      function buildLevel() {
        holes = [];
        const hx = [70, 120, 170, 210];
        for (let i = 0; i < 4; i++) holes.push({ x: hx[i] + irnd(14) - 7, y: i % 2 ? rnd(50, 100) : rnd(150, 210), open: 0 });
        piles = [];
        const nP = 5;
        for (let i = 0; i < nP; i++) {
          let x, y, ok, tries = 0;
          do {
            x = rnd(40, 200); y = rnd(TOP + 18, BOT - 10); ok = true; tries++;
            for (const p of piles) if (Math.hypot(p.x - x, p.y - y) < 34) ok = false;
            for (const h of holes) if (Math.hypot(h.x - x, h.y - y) < 22) ok = false;
          } while (!ok && tries < 60);
          piles.push({ x, y, type: i % FOODS.length, n: 3 + irnd(4) });
        }
        cone = { x: 234, y: rnd(TOP + 30, BOT - 20), melt: 0, rate: 1 / (60 * Math.max(16, 26 - level)) };
        charley = { x: 16, y: (TOP + BOT) / 2, dir: 0, walk: 0, carry: -1, alive: true, eat: 0 };
        shots = []; splats = []; history = []; closeCall = 0;
        const n = Math.min(4, 1 + Math.ceil(level / 2));
        chefs = [];
        for (let i = 0; i < n; i++) chefs.push(newChef(i, 40 + i * 70));
      }
      function newChef(i, delay) {
        return { id: i, x: 0, y: 0, st: 'wait', t: delay, hole: null, carry: -1, cool: 60, dir: 4, walk: 0, wob: rnd(0, 6) };
      }
      function startGame() {
        state = 'play'; score = 0; lives = 3; level = 1; nextExtra = 20000;
        buildLevel(); msg = 'LEVEL 1'; msgT = 90; stateT = 0;
        A.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .25]], { type: 'square', vol: .12 });
      }
      function attractInit() { state = 'attract'; stateT = 0; level = 2; buildLevel(); }
      attractInit();

      function addScore(n) {
        if (state === 'attract' || state === 'gameover') return;
        score += n;
        if (score >= nextExtra) {
          lives++; nextExtra += nextExtra < 40000 ? 20000 : 40000;
          A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .14 });
        }
      }

      // ---------- chefs ----------
      function chefSpeed() { return Math.min(1.25, 0.62 + level * 0.06); }
      function updateChef(c, demo) {
        c.wob += 0.05;
        if (c.st === 'wait') {
          if (--c.t <= 0) {
            // pick a manhole away from Charley to pop out of
            const cand = holes.filter(h => Math.hypot(h.x - charley.x, h.y - charley.y) > 50);
            c.hole = (cand.length ? cand : holes)[irnd((cand.length ? cand : holes).length)];
            c.x = c.hole.x; c.y = c.hole.y; c.st = 'emerge'; c.t = 40; c.hole.open = 50;
            if (!demo) A.tone(180, 0.3, { type: 'square', vol: 0.06, slideTo: 420 });
          }
          return;
        }
        if (c.st === 'emerge') { if (--c.t <= 0) { c.st = 'chase'; c.cool = 50 + irnd(40); } return; }
        if (c.st === 'hit') {
          if (--c.t <= 0) { c.st = 'wait'; c.t = 120 + irnd(120) - level * 6; c.carry = -1; }
          return;
        }
        // chase
        const sp = chefSpeed() * (demo ? 0.8 : 1);
        let tx = charley.x, ty = charley.y;
        // a chef without food detours to the nearest pile when it is handy
        if (c.carry < 0) {
          let best = null, bd = 70;
          for (const p of piles) if (p.n > 0) { const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = p; } }
          if (best) { tx = best.x; ty = best.y; }
        }
        let dx = tx - c.x, dy = ty - c.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d; dy /= d;
        // a little weave so they don't all stack
        dx += Math.sin(c.wob + c.id * 2) * 0.35; dy += Math.cos(c.wob * 1.3 + c.id) * 0.35;
        for (const o of chefs) if (o !== c && o.st === 'chase') {
          const ex = c.x - o.x, ey = c.y - o.y, ed = Math.hypot(ex, ey);
          if (ed < 14 && ed > 0) { dx += ex / ed * 0.8; dy += ey / ed * 0.8; }
        }
        const n = Math.hypot(dx, dy) || 1;
        c.x += dx / n * sp; c.y += dy / n * sp;
        c.x = Math.max(LEFT + 4, Math.min(RIGHT - 4, c.x)); c.y = Math.max(TOP + 8, Math.min(BOT, c.y));
        c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 4) : (dy > 0 ? 2 : 6);
        c.walk += sp;
        if (c.carry < 0) {
          for (const p of piles) if (p.n > 0 && Math.hypot(p.x - c.x, p.y - c.y) < 8) { p.n--; c.carry = p.type; break; }
        } else if (charley.alive && --c.cool <= 0) {
          // throw when lined up with Charley (8 directions) and near enough
          const ex = charley.x - c.x, ey = charley.y - c.y, ed = Math.hypot(ex, ey);
          const lined = Math.abs(ex) < 8 || Math.abs(ey) < 8 || Math.abs(Math.abs(ex) - Math.abs(ey)) < 10;
          if (ed < 130 && ed > 16 && lined) {
            const F = FOODS[c.carry];
            const v = F.speed * (0.75 + Math.min(0.25, level * 0.03));
            shots.push({ x: c.x, y: c.y - 8, vx: ex / ed * v, vy: ey / ed * v, type: c.carry, foe: true, t: 0, hit: [] });
            c.carry = -1; c.cool = Math.max(30, 90 - level * 6);
            if (!demo) A.noise(0.12, { freq: 900, vol: 0.12 });
          } else c.cool = 6;
        }
      }
      function hitChef(c, byPlayer) {
        c.st = 'hit'; c.t = 50;
        splats.push({ x: c.x, y: c.y - 8, t: 40, col: '#ffffff' });
        if (byPlayer) { addScore(100); A.tone(880, 0.06, { type: 'square', vol: 0.12 }); A.noise(0.18, { freq: 700, vol: 0.15 }); }
      }

      // ---------- Charley ----------
      function killCharley(how) {
        if (!charley.alive) return;
        charley.alive = false; charley.how = how; deathT = 140;
        A.melody([[392, .12], [370, .12], [349, .12], [330, .12], [262, .4]], { type: 'square', vol: .14 });
      }
      function updateCharley() {
        const c = charley;
        if (!c.alive) return;
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx--; if (api.key('ArrowRight')) dx++;
        if (api.key('ArrowUp')) dy--; if (api.key('ArrowDown')) dy++;
        if (dx || dy) {
          const sp = 1.3 / (dx && dy ? Math.SQRT2 : 1);
          c.x += dx * sp; c.y += dy * sp; c.walk += 1.3;
          c.dir = DIRS.findIndex(d => d[0] === dx && d[1] === dy);
          c.x = Math.max(LEFT + 4, Math.min(RIGHT - 4, c.x)); c.y = Math.max(TOP + 8, Math.min(BOT, c.y));
        }
        if (c.carry < 0) {
          for (const p of piles) if (p.n > 0 && Math.hypot(p.x - c.x, p.y - c.y) < 9) {
            p.n--; c.carry = p.type; A.tone(1200, 0.04, { type: 'square', vol: 0.1 }); break;
          }
        }
        if (api.pressed('Space') && c.carry >= 0) {
          const F = FOODS[c.carry], [ux, uy] = DIRS[c.dir], un = Math.hypot(ux, uy);
          const n = F.spread || 1;
          for (let k = 0; k < n; k++) {
            const a = Math.atan2(uy, ux) + (k - (n - 1) / 2) * 0.18;
            shots.push({ x: c.x + ux / un * 6, y: c.y - 8 + uy / un * 6, vx: Math.cos(a) * F.speed, vy: Math.sin(a) * F.speed, type: c.carry, foe: false, t: 0, hit: [] });
          }
          c.carry = -1;
          A.tone(500, 0.1, { type: 'square', vol: 0.1, slideTo: 200 });
        }
        // falling into an open manhole
        for (const h of holes) if (h.open > 0 && Math.hypot(h.x - c.x, h.y - c.y) < 6) { killCharley('hole'); return; }
        // caught by a chef
        for (const ch of chefs) if (ch.st === 'chase' && Math.hypot(ch.x - c.x, ch.y - c.y) < 9) { killCharley('caught'); return; }
        // reached the cone!
        if (Math.hypot(cone.x - c.x, cone.y - c.y) < 10) eatCone();
      }
      function eatCone() {
        const c = charley;
        c.eat = 1; state = 'eat'; stateT = 0;
        bonus = 1000 + Math.round((1 - cone.melt) * 30) * 50;
        // a close call? (a chef or flying food right on Charley's heels)
        let near = 999;
        for (const ch of chefs) if (ch.st === 'chase') near = Math.min(near, Math.hypot(ch.x - c.x, ch.y - c.y));
        for (const s of shots) if (s.foe) near = Math.min(near, Math.hypot(s.x - c.x, s.y + 8 - c.y));
        closeCall = (near < 28 || cone.melt > 0.85) ? 1 : 0;
        A.melody([[784, .08], [659, .08], [784, .08], [1047, .08], [1319, .08], [1568, .25]], { type: 'square', vol: .14 });
      }

      // ---------- shots ----------
      function updateShots(demo) {
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.x += s.vx; s.y += s.vy; s.t++;
          let dead = s.x < 0 || s.x > W || s.y < TOP - 6 || s.y > H;
          if (!dead && !s.foe) {
            for (const c of chefs) if (c.st === 'chase' && !s.hit.includes(c) && Math.abs(c.x - s.x) < 7 && Math.abs(c.y - 8 - s.y) < 10) {
              hitChef(c, !demo); s.hit.push(c);
              if (!FOODS[s.type].pierce) { dead = true; break; }
            }
          }
          if (!dead && s.foe && charley.alive && Math.abs(charley.x - s.x) < 5 && Math.abs(charley.y - 8 - s.y) < 8) {
            if (!demo) killCharley('splat');
            dead = true;
          }
          // flying food collides with the other side's flying food
          if (!dead) for (const o of shots) {
            if (!o.dead && o.foe !== s.foe && Math.abs(o.x - s.x) < 5 && Math.abs(o.y - s.y) < 5) {
              o.dead = true; dead = true;
              if (!demo) { addScore(50); A.tone(1400, 0.05, { type: 'square', vol: 0.1 }); }
              break;
            }
          }
          if (dead) s.dead = true;
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          if (s.dead) { splats.push({ x: s.x, y: s.y, t: 30, col: FOODS[s.type].col }); shots.splice(i, 1); }
        }
        for (let i = splats.length - 1; i >= 0; i--) if (--splats[i].t <= 0) splats.splice(i, 1);
        for (const h of holes) if (h.open > 0) h.open--;
      }

      // ---------- instant replay ----------
      function snapshot() {
        history.push({
          ch: { x: charley.x, y: charley.y, dir: charley.dir, walk: charley.walk, carry: charley.carry, alive: charley.alive },
          chefs: chefs.map(c => ({ id: c.id, x: c.x, y: c.y, st: c.st, t: c.t, dir: c.dir, walk: c.walk, carry: c.carry })),
          shots: shots.map(s => ({ x: s.x, y: s.y, type: s.type, t: s.t })),
          holes: holes.map(h => h.open), piles: piles.map(p => p.n), melt: cone.melt
        });
        if (history.length > 240) history.shift();
      }

      function demoUpdate() {
        // Charley wanders toward the cone, dodging, in the attract demo
        const c = charley;
        if (c.alive) {
          const t = stateT * 0.03;
          let dx = cone.x - c.x, dy = (cone.y - c.y) + Math.sin(t) * 40;
          const n = Math.hypot(dx, dy) || 1;
          c.x += dx / n * 1.0; c.y += dy / n * 1.0; c.walk += 1;
          c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 4) : (dy > 0 ? 2 : 6);
          c.y = Math.max(TOP + 8, Math.min(BOT, c.y));
          if (c.carry < 0) for (const p of piles) if (p.n > 0 && Math.hypot(p.x - c.x, p.y - c.y) < 9) { p.n--; c.carry = p.type; }
          if (c.carry >= 0 && stateT % 50 === 0) {
            const tgt = chefs.find(ch => ch.st === 'chase');
            if (tgt) { const ex = tgt.x - c.x, ey = tgt.y - c.y, ed = Math.hypot(ex, ey) || 1; shots.push({ x: c.x, y: c.y - 8, vx: ex / ed * 3, vy: ey / ed * 3, type: c.carry, foe: false, t: 0, hit: [] }); c.carry = -1; }
          }
          if (Math.hypot(cone.x - c.x, cone.y - c.y) < 10) buildLevel();
        }
        for (const ch of chefs) updateChef(ch, true);
        for (const ch of chefs) if (ch.st === 'chase' && Math.hypot(ch.x - c.x, ch.y - c.y) < 9) hitChef(ch, false);
        updateShots(true);
        cone.melt = Math.min(0.95, cone.melt + cone.rate);
      }

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        if (state === 'attract') {
          demoUpdate();
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; A.tone(70, .25, { type: 'square', vol: .25 }); }
          }
          return;
        }
        if (state === 'gameover') {
          if (stateT > 240 || (stateT > 60 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (state === 'eat') {
          // Charley gobbles the cone
          if (stateT === 70) addScore(bonus);
          if (stateT > 130) {
            if (closeCall && history.length > 30) { state = 'replay'; replayI = 0; stateT = 0; A.melody([[659, .08], [0, .04], [659, .08], [880, .2]], { type: 'square', vol: .12 }); }
            else { state = 'clear'; stateT = 0; }
          }
          return;
        }
        if (state === 'replay') {
          replayI++;
          if (replayI >= history.length || api.pressed('Enter')) { state = 'clear'; stateT = 0; }
          return;
        }
        if (state === 'clear') {
          if (stateT > 80) { level++; buildLevel(); state = 'play'; stateT = 0; msg = 'LEVEL ' + level; msgT = 90; }
          return;
        }
        // play
        if (!charley.alive) {
          for (const h of holes) if (h.open > 0) h.open--;
          if (--deathT <= 0) {
            lives--;
            if (lives <= 0) {
              const end = () => { state = 'gameover'; stateT = 0; if (score > hi) { hi = score; api.setHiScore(score); } };
              deathT = 1e9;
              if (api.offerContinue) api.offerContinue(() => { lives = 3; buildLevel(); msg = 'LEVEL ' + level; msgT = 90; }, end);
              else end();
            } else { buildLevel(); msg = 'LEVEL ' + level; msgT = 90; }
          }
          return;
        }
        if (msgT > 40) return;   // brief pause before the chefs come out
        updateCharley();
        if (state !== 'play') return;
        for (const c of chefs) updateChef(c, false);
        updateShots(false);
        if (!charley.alive) return;
        cone.melt += cone.rate;
        if (cone.melt >= 1) { cone.melt = 1; killCharley('melt'); }
        // dripping tick
        if (api.frame % 40 === 0) A.tone(1500 - cone.melt * 900, 0.03, { type: 'sine', vol: 0.06 });
        snapshot();
      }

      // ---------- drawing ----------
      function r(ctx, col, x, y, w, h) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
      function drawCharley(ctx, x, y, dir, walk, carry, eat) {
        x = Math.round(x); y = Math.round(y);
        const step = (walk >> 2) & 1;
        // legs
        r(ctx, '#2848c8', x - 3, y - 4, 2, 4 - step); r(ctx, '#2848c8', x + 1, y - 4, 2, 3 + step);
        r(ctx, '#603010', x - 4, y - 1 + (step ? -1 : 0), 3, 1); r(ctx, '#603010', x + 1, y - 1, 3, 1);
        // body (striped shirt)
        r(ctx, '#f04040', x - 4, y - 9, 8, 5); r(ctx, '#ffffff', x - 4, y - 7, 8, 1);
        // arms
        const flip = dir >= 3 && dir <= 5 ? -1 : 1;
        r(ctx, '#f8c090', x + 4 * flip - (flip < 0 ? 1 : 0), y - 8, 1, 3); r(ctx, '#f8c090', x - 5 * flip - (flip < 0 ? 0 : 0), y - 8, 1, 3);
        // big round head
        r(ctx, '#f8c090', x - 4, y - 16, 8, 7); r(ctx, '#f8c090', x - 3, y - 17, 6, 1);
        // green cap with bill toward facing
        r(ctx, '#20a040', x - 4, y - 18, 8, 3); r(ctx, '#20a040', x + (flip > 0 ? 3 : -6), y - 16, 3, 1);
        // face
        if (dir !== 6 && dir !== 5 && dir !== 7) {
          r(ctx, '#000', x - 2 + flip, y - 14, 1, 2); r(ctx, '#000', x + 1 + flip, y - 14, 1, 2);
          if (eat) r(ctx, '#c02020', x - 1 + flip, y - 11, 3, 2 + ((api.frame >> 3) & 1));
          else r(ctx, '#c04040', x - 1 + flip, y - 11, 3, 1);
        }
        if (carry >= 0) drawFood(ctx, carry, x + 5 * flip, y - 12, 1);
      }
      function drawChef(ctx, c, idx) {
        const x = Math.round(c.x), y = Math.round(c.y);
        const K = CHEFS[idx % 4];
        let rise = 1;
        if (c.st === 'emerge') rise = 1 - c.t / 40;
        if (c.st === 'hit') rise = Math.max(0, c.t / 50);
        const hgt = Math.round(22 * rise);
        if (hgt <= 0) return;
        ctx.save(); ctx.beginPath(); ctx.rect(x - 8, y - hgt, 16, hgt + 1); ctx.clip();
        const step = (c.walk >> 2) & 1;
        r(ctx, '#202020', x - 3, y - 4, 2, 4 - step); r(ctx, '#202020', x + 1, y - 4, 2, 3 + step);
        r(ctx, '#f0f0f0', x - 5, y - 12, 10, 8);          // jacket
        r(ctx, K.apron, x - 3, y - 9, 6, 6);              // apron
        r(ctx, '#d0d0d0', x - 1, y - 12, 1, 3);           // buttons line
        r(ctx, '#f0f0f0', x - 7, y - 11, 2, 4); r(ctx, '#f0f0f0', x + 5, y - 11, 2, 4); // arms
        r(ctx, '#e8a878', x - 4, y - 18, 8, 6);           // face
        r(ctx, '#000', x - 2, y - 16, 1, 1); r(ctx, '#000', x + 1, y - 16, 1, 1);
        r(ctx, '#301808', x - 3, y - 14, 6, 1);           // mustache
        r(ctx, '#ffffff', x - 4, y - 21, 8, 3);           // tall chef hat
        r(ctx, '#ffffff', x - 5, y - 23, 10, 3);
        r(ctx, '#dddddd', x - 4, y - 19, 8, 1);
        if (c.carry >= 0) drawFood(ctx, c.carry, x + 7, y - 13, 1);
        ctx.restore();
        if (c.st === 'hit') {
          // food all over the chef's face
          r(ctx, '#ff5050', x - 4, y - Math.round(18 * rise), 8, 3);
        }
      }
      function drawFood(ctx, t, x, y, small) {
        x = Math.round(x); y = Math.round(y);
        const F = FOODS[t];
        if (t === 0) { for (const [a, b] of [[-2, 0], [1, -1], [0, 2], [2, 1]]) r(ctx, F.col, x + a, y + b, 2, 2); return; }
        if (t === 1) { r(ctx, F.col, x - 2, y - 2, 5, 5); r(ctx, F.col, x - 3, y - 1, 7, 3); r(ctx, '#2a8a2a', x, y - 3, 1, 1); return; }
        if (t === 2) { r(ctx, '#a06830', x - 3, y, 7, 2); r(ctx, F.col, x - 3, y - 2, 7, 2); r(ctx, '#fff8e0', x - 2, y - 3, 5, 1); return; }
        if (t === 3) { r(ctx, F.col, x - 3, y, 2, 1); r(ctx, F.col, x - 2, y + 1, 5, 1); r(ctx, F.col, x + 2, y - 1, 2, 2); r(ctx, '#604010', x + 4, y - 2, 1, 1); return; }
        // watermelon slice
        r(ctx, '#2f9b3a', x - 4, y + 1, 9, 1); r(ctx, '#ff4060', x - 3, y - 2, 7, 3); r(ctx, '#ff4060', x - 1, y - 3, 3, 1);
        r(ctx, '#000', x - 1, y - 1, 1, 1); r(ctx, '#000', x + 2, y - 1, 1, 1);
      }
      function drawPile(ctx, p, n) {
        if (n <= 0) { r(ctx, 'rgba(0,0,0,.12)', p.x - 7, p.y - 1, 14, 3); return; }
        r(ctx, 'rgba(0,0,0,.18)', p.x - 9, p.y - 1, 18, 4);
        const pos = [[0, 0], [-5, 0], [5, 0], [-2, -4], [3, -4], [0, -8]];
        for (let i = 0; i < Math.min(n, 6); i++) drawFood(ctx, p.type, p.x + pos[i][0], p.y - 2 + pos[i][1]);
      }
      function drawHole(ctx, h, open) {
        const x = Math.round(h.x), y = Math.round(h.y);
        r(ctx, '#505058', x - 8, y - 3, 16, 6); r(ctx, '#505058', x - 6, y - 4, 12, 8);
        if (open > 0) { r(ctx, '#000', x - 6, y - 2, 12, 4); r(ctx, '#000', x - 4, y - 3, 8, 6); }
        else { r(ctx, '#80808a', x - 6, y - 2, 12, 4); r(ctx, '#6a6a74', x - 4, y - 1, 8, 1); r(ctx, '#6a6a74', x - 4, y + 1, 8, 1); }
      }
      function drawCone(ctx, melt) {
        const x = Math.round(cone.x), y = Math.round(cone.y);
        // puddle grows as it melts
        const pw = 6 + Math.round(melt * 18);
        r(ctx, '#f8c8d8', x - pw / 2, y + 1, pw, 3);
        // cone (waffle)
        for (let i = 0; i < 9; i++) r(ctx, i % 2 ? '#c8883a' : '#e0a050', x - 4 + Math.floor(i / 2.2), y - 9 + i, 9 - Math.floor(i / 1.1), 1);
        // scoops shrinking
        const s = Math.max(0, 1 - melt);
        const sh = Math.round(10 * s);
        if (sh > 0) {
          r(ctx, '#ffb0c8', x - 5, y - 9 - sh, 10, sh); r(ctx, '#ffb0c8', x - 4, y - 10 - sh, 8, 1);
          if (sh > 5) { r(ctx, '#fff4e0', x - 4, y - 9 - sh - 5, 8, 5); r(ctx, '#c02040', x, y - 9 - sh - 7, 2, 2); }
          r(ctx, '#ffffff', x - 3, y - 8 - sh, 2, 1);
        }
        // drips
        if (melt > 0.15) r(ctx, '#ffb0c8', x - 5, y - 9, 1, 2 + ((api.frame >> 4) % 3));
        if (melt > 0.4) r(ctx, '#ffb0c8', x + 4, y - 9, 1, 1 + ((api.frame >> 3) % 4));
      }
      function drawFloor(ctx) {
        r(ctx, '#e8d8a8', 0, 0, W, H);
        ctx.fillStyle = '#d8c490';
        for (let y = TOP; y < BOT + 8; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < W; x += 32) ctx.fillRect(x, y, 16, 16);
        r(ctx, '#7a3a20', 0, TOP - 4, W, 4); r(ctx, '#7a3a20', 0, BOT + 6, W, 2);
        r(ctx, '#7a3a20', 0, TOP - 4, 3, BOT - TOP + 12); r(ctx, '#7a3a20', W - 3, TOP - 4, 3, BOT - TOP + 12);
        // kitchen door on the left
        r(ctx, '#a05a30', 0, (TOP + BOT) / 2 - 18, 4, 28);
      }
      function drawScene(ctx, sc) {
        drawFloor(ctx);
        holes.forEach((h, i) => drawHole(ctx, h, sc.holes[i]));
        piles.forEach((p, i) => drawPile(ctx, p, sc.piles[i]));
        // y-sorted actors
        const actors = [];
        actors.push({ y: cone.y, f: () => drawCone(ctx, sc.melt) });
        sc.chefs.forEach(c => { if (c.st !== 'wait') actors.push({ y: c.y, f: () => drawChef(ctx, c, c.id) }); });
        if (sc.ch.alive || state === 'replay') actors.push({ y: sc.ch.y, f: () => drawCharley(ctx, sc.ch.x, sc.ch.y, sc.ch.dir, sc.ch.walk, sc.ch.carry, charley.eat && state === 'eat') });
        actors.sort((a, b) => a.y - b.y).forEach(a => a.f());
        for (const s of sc.shots) {
          drawFood(ctx, s.type, s.x, s.y - Math.sin(Math.min(1, s.t / 40) * Math.PI) * 0);
          r(ctx, 'rgba(0,0,0,.2)', s.x - 2, s.y + 7, 4, 1);
        }
      }
      function liveScene() {
        return { ch: charley, chefs, shots, holes: holes.map(h => h.open), piles: piles.map(p => p.n), melt: cone.melt };
      }
      function hud(ctx) {
        r(ctx, '#000', 0, 0, W, TOP - 4);
        text(ctx, '1UP', 6, 2, '#ff5040'); text(ctx, String(score).padStart(6, '0'), 6, 10, '#fff');
        text(ctx, 'HIGH SCORE', W / 2, 2, '#ff5040', 1, 'center'); text(ctx, String(hi).padStart(6, '0'), W / 2, 10, '#fff', 1, 'center');
        if (state !== 'attract') {
          text(ctx, 'LEVEL ' + level, W - 6, 2, '#ffe060', 1, 'right');
          for (let i = 0; i < Math.min(lives - 1, 6); i++) { r(ctx, '#20a040', W - 12 - i * 9, 11, 6, 2); r(ctx, '#f8c090', W - 12 - i * 9, 13, 6, 4); }
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'replay') {
          const sc = history[Math.min(history.length - 1, replayI)];
          drawScene(ctx, { ch: sc.ch, chefs: sc.chefs, shots: sc.shots, holes: sc.holes, piles: sc.piles, melt: sc.melt });
          hud(ctx);
          r(ctx, 'rgba(0,0,0,.55)', 0, 30, W, 22);
          if ((stateT >> 4) & 1 || stateT < 10) text(ctx, 'INSTANT REPLAY', W / 2, 34, '#ffe040', 2, 'center');
          // VCR-style scan bar
          r(ctx, 'rgba(255,255,255,.15)', 0, (stateT * 3) % H, W, 2);
          return;
        }
        drawScene(ctx, liveScene());
        hud(ctx);
        if (state === 'attract') {
          r(ctx, 'rgba(0,0,0,.6)', 20, 40, W - 40, 150);
          const ph = Math.floor(stateT / 400) % 2;
          if (ph === 0) {
            text(ctx, 'FOOD', W / 2 + 1, 51, '#601010', 4, 'center'); text(ctx, 'FOOD', W / 2, 50, '#ff4030', 4, 'center');
            text(ctx, 'FIGHT', W / 2 + 1, 83, '#103010', 4, 'center'); text(ctx, 'FIGHT', W / 2, 82, '#40d040', 4, 'center');
            text(ctx, 'GET TO THE ICE CREAM', W / 2, 122, '#ffffff', 1, 'center');
            text(ctx, 'BEFORE IT MELTS!', W / 2, 132, '#ffffff', 1, 'center');
          } else {
            text(ctx, 'MEET THE CHEFS', W / 2, 48, '#ffe040', 1, 'center');
            CHEFS.forEach((K, i) => {
              drawChef(ctx, { x: 60, y: 82 + i * 26, st: 'chase', walk: stateT, carry: -1 }, i);
              text(ctx, K.name, 76, 72 + i * 26, K.apron);
            });
            text(ctx, 'CHEF 100', 150, 80, '#ffffff'); text(ctx, 'FOOD HIT 50', 150, 100, '#ffffff');
            text(ctx, 'CONE 1000+', 150, 120, '#ffffff'); text(ctx, 'BONUS AT', 150, 140, '#ffffff'); text(ctx, '20000', 150, 150, '#ffffff');
          }
          const prompt = api.credits > 0 ? 'PUSH START' : 'INSERT COIN';
          if (coinFlash > 0 ? (coinFlash >> 3) & 1 : (stateT >> 5) & 1) text(ctx, prompt, W / 2, 164, '#ffe040', 1, 'center');
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 178, '#aaaaaa', 1, 'center');
          text(ctx, '\u00a9 1983 GCC/ATARI', W / 2, 226, '#7a3a20', 1, 'center');
          return;
        }
        if (msgT > 0) { r(ctx, 'rgba(0,0,0,.5)', W / 2 - 50, 100, 100, 20); text(ctx, msg, W / 2, 106, '#ffffff', 1, 'center'); }
        if (state === 'eat' && stateT > 40) {
          r(ctx, 'rgba(0,0,0,.5)', W / 2 - 60, 96, 120, 30);
          text(ctx, 'YUM!', W / 2, 100, '#ffb0c8', 1, 'center');
          text(ctx, 'CONE BONUS ' + bonus, W / 2, 112, '#ffffff', 1, 'center');
        }
        if (state === 'clear') { r(ctx, 'rgba(0,0,0,.5)', W / 2 - 60, 100, 120, 20); text(ctx, 'LEVEL CLEARED', W / 2, 106, '#ffe040', 1, 'center'); }
        if (state === 'play' && !charley.alive) {
          const how = charley.how;
          const x = Math.round(charley.x), y = Math.round(charley.y);
          if (how === 'hole') { if (deathT > 100) drawCharley(ctx, x, y + (140 - deathT) / 3, charley.dir, 0, -1); }
          else {
            drawCharley(ctx, x, y, 2, 0, -1);
            r(ctx, how === 'melt' ? '#ffb0c8' : '#ff3a2a', x - 5, y - 17, 10, 6);
            r(ctx, how === 'melt' ? '#ffb0c8' : '#ff3a2a', x - 3, y - 11, 2, 3);
          }
          const m = how === 'melt' ? 'THE CONE MELTED!' : how === 'hole' ? 'DOWN THE MANHOLE!' : how === 'caught' ? 'CAUGHT BY A CHEF!' : 'SPLAT!';
          r(ctx, 'rgba(0,0,0,.5)', W / 2 - 60, 100, 120, 20); text(ctx, m, W / 2, 106, '#ffffff', 1, 'center');
        }
        if (state === 'gameover') { r(ctx, 'rgba(0,0,0,.6)', W / 2 - 50, 96, 100, 26); text(ctx, 'GAME OVER', W / 2, 102, '#ff4030', 1, 'center'); }
        for (const s of splats) { r(ctx, s.col, s.x - 3, s.y - 1, 6, 2); r(ctx, s.col, s.x - 1, s.y - 3, 2, 6); if (s.t > 20) { r(ctx, s.col, s.x - 5, s.y - 4, 1, 1); r(ctx, s.col, s.x + 4, s.y + 3, 1, 1); } }
      }
      return { update, render };
    }
  });
})();
