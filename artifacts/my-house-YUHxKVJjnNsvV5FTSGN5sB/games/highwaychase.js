// Highway Chase (Data East, 1980) \u2014 from-scratch recreation: armed pursuit down a winding highway, fuel and checkpoints.
(function () {
  'use strict';
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // text(ctx, str, x, y, colour, scale, align: 'left'|'center'|'right')
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
  // Pixel sprite from strings ('.' = transparent), centred at cx,cy, rotated rot*90 degrees clockwise.
  function spr(ctx, rows, cx, cy, pal, rot, sc) {
    rot = (rot || 0) & 3; sc = sc || 1;
    const h = rows.length, w = rows[0].length;
    const ow = (rot & 1) ? h : w, oh = (rot & 1) ? w : h;
    const x0 = Math.round(cx - ow * sc / 2), y0 = Math.round(cy - oh * sc / 2);
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) {
        const ch = row[c]; if (ch === '.' || ch === ' ') continue;
        let px, py;
        if (rot === 0) { px = c; py = r; } else if (rot === 1) { px = h - 1 - r; py = c; }
        else if (rot === 2) { px = w - 1 - c; py = h - 1 - r; } else { px = r; py = w - 1 - c; }
        ctx.fillStyle = pal[ch] || '#f0f';
        ctx.fillRect(x0 + px * sc, y0 + py * sc, sc, sc);
      }
    }
  }
  function pad(n, l) { return String(n).padStart(l, '0'); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(n) { return Math.floor(Math.random() * n); }
  ArcadeRegistry.register({
    id: 'highwaychase', title: 'Highway Chase', year: 1980, maker: 'Data East',
    width: 240, height: 256, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up: accelerate \u00b7 Down: brake \u00b7 Space: machine gun \u00b7 X: oil slick \u00b7 Enter: start',
    marquee: { bg: '#102010', fg: '#ffd020', accent: '#ff3030' },
    create(api) {
      const W = 240, H = 256, PSY = 206, MAXSP = 4.6;
      const au = api.audio;
      const C = { grass: '#1c7a24', grass2: '#22902c', road: '#505058', road2: '#4a4a52', line: '#f0f0f0', yellow: '#ffd020', red: '#ff3030', white: '#ffffff', water: '#1848c0', water2: '#2858e0', cyan: '#40e0ff', grey: '#909090', orange: '#ff9020', green: '#40ff60', dirt: '#806030' };

      // ---------- sprites (facing up) ----------
      const P_CAR = [
        '...gg...',
        '...gg...',
        '.rrrrrr.',
        'krrwwrrk',
        'krwwwwrk',
        '.rrrrrr.',
        '.rryyrr.',
        '.rrrrrr.',
        'krrrrrrk',
        'krwwwwrk',
        '.rrrrrr.',
        '.oo..oo.'
      ];
      const P_PAL = { r: '#ff3030', w: '#80e0ff', k: '#202020', g: '#c0c0c0', y: '#ffd020', o: '#ff9020' };
      const SEDAN = [
        '.bbbbbb.',
        'kbbbbbbk',
        'kbwwwwbk',
        '.bbbbbb.',
        '.bbbbbb.',
        '.bbbbbb.',
        'kbbwwbbk',
        'kbbbbbbk',
        '.bbbbbb.',
        '.rr..rr.'
      ];
      const CIV_PALS = [{ b: '#3070ff', w: '#c0f0ff', k: '#202020', r: '#ff2020' }, { b: '#30c0a0', w: '#e0fff0', k: '#202020', r: '#ff2020' }, { b: '#e0e0e0', w: '#6090c0', k: '#202020', r: '#ff2020' }];
      const CHASER = [
        '.dddddd.',
        'kdyddydk',
        'kdwwwwdk',
        '.dddddd.',
        '.drrrrd.',
        '.dddddd.',
        'kddwwddk',
        'kdddddddk'.slice(0, 8),
        '.dddddd.',
        '.rr..rr.'
      ];
      const CHASER_PAL = { d: '#303040', y: '#ffff80', w: '#8080a0', k: '#000000', r: '#ff2020' };
      const TRUCK = [
        '..yyyyyy..',
        '.kyywwyyk.',
        '.kyywwyyk.',
        '..yyyyyy..',
        '..kkkkkk..',
        '.ssssssss.',
        'kssssssssk',
        'kssssssssk',
        '.ssssssss.',
        '.ssssssss.',
        '.ssssssss.',
        '.ssssssss.',
        'kssssssssk',
        'kssssssssk',
        '.ssssssss.',
        '.rr....rr.'
      ];
      const TRUCK_PAL = { y: '#ffd020', w: '#80c0ff', k: '#202020', s: '#c0c0c8', r: '#ff2020' };
      const FUEL = ['.oooo.', 'oowwoo', 'owoooo', 'owwwoo', 'owoooo', 'owoooo', 'oooooo'];
      const FUEL_PAL = { o: '#ff9020', w: '#ffffff' };
      const MINE = ['..k..', '.kyk.', 'kyryk', '.kyk.', '..k..'];
      const MINE_PAL = { k: '#202020', y: '#ffd020', r: '#ff2020' };

      // ---------- state ----------
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let seedA = 0, seedB = 0, titleD = 0;

      function stageLen() { return 11000 + g.stage * 2000; }
      function isBridge(d) { const m = ((d % 3600) + 3600) % 3600; return m > 2600 && m < 2950; }
      function bridgeF(d) {
        const m = ((d % 3600) + 3600) % 3600;
        if (m < 2450 || m > 3100) return 0;
        if (m < 2600) return (m - 2450) / 150;
        if (m > 2950) return (3100 - m) / 150;
        return 1;
      }
      function roadW(d) {
        const s = g ? g.stage : 1;
        const w = clamp(118 + 28 * Math.sin(d / 520 + seedB) - Math.min(30, s * 4) + 16 * Math.sin(d / 213 + seedA), 70, 160);
        const f = bridgeF(d);
        return f > 0 ? w + (76 - w) * f : w;
      }
      function roadC(d) {
        const s = g ? g.stage : 1;
        const amp = Math.min(60, 22 + s * 7);
        let c = 120 + amp * Math.sin(d / 400 + seedA) + 14 * Math.sin(d / 157 + seedB);
        const w = roadW(d);
        return clamp(c, w / 2 + 6, W - w / 2 - 6);
      }
      function sy(d) { return PSY - (d - g.d); }

      function newGame() {
        seedA = Math.random() * 6; seedB = Math.random() * 6;
        g = { score: 0, lives: 3, stage: 1, extra: 0, d: 0, x: 120, sp: 0, fuel: 100, oil: 3, shots: [], cars: [], items: [], slicks: [], booms: [], pops: [],
          phase: 'ready', t: 120, pstate: 'alive', pt: 0, inv: 0, spawnT: 60, chaseT: 400, msg: '', msgT: 0, stageStart: 0, distPts: 0 };
        g.x = roadC(0);
        au.melody([[392, .1], [523, .1], [659, .1], [784, .15], [659, .1], [784, .3]], { type: 'square', vol: 0.12 });
      }
      function nextStage() {
        g.stage++; g.stageStart = g.d; g.fuel = 100; g.oil = 3; g.phase = 'ready'; g.t = 90;
        g.cars = []; g.items = []; g.slicks = [];
        au.melody([[523, .08], [659, .08], [784, .08], [1047, .2]], { type: 'square', vol: 0.12 });
      }
      function addScore(n) {
        g.score = Math.max(0, g.score + n);
        const ex = Math.floor(g.score / 30000);
        if (ex > g.extra) { g.extra = ex; g.lives++; au.melody([[1047, .07], [1319, .07], [1568, .15]], { type: 'square', vol: 0.12 }); flash('BONUS CAR'); }
        if (g.score > hi) hi = g.score;
      }
      function flash(m) { g.msg = m; g.msgT = 120; }
      function pop(x, y, n, col) { g.pops.push({ x, y, n, t: 50, col: col || C.cyan }); }
      function boom(x, d, big) { g.booms.push({ x, d, t: 0, big: !!big }); }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.15 });
        return false;
      }

      // ---------- traffic ----------
      function laneX(d, lo) { return roadC(d) + lo * roadW(d); }
      function spawnTraffic() {
        const s = g.stage;
        g.spawnT--;
        if (g.spawnT <= 0) {
          g.spawnT = Math.max(25, 80 - s * 6) + irnd(40);
          const r = Math.random();
          const d = g.d + 240;
          const lo = [-0.3, -0.1, 0.1, 0.3][irnd(4)];
          if (g.cars.some(c => Math.abs(c.d - d) < 40 && Math.abs(c.lo - lo) < 0.15)) return;
          if (r < 0.62) g.cars.push({ type: 'civ', d, lo, x: laneX(d, lo), sp: rnd(1.6, 2.8), pal: irnd(3), hp: 1, w: 8, h: 10 });
          else if (r < 0.62 + Math.min(0.2, 0.08 + s * 0.03) && s >= 1) g.cars.push({ type: 'truck', d, lo, x: laneX(d, lo), sp: rnd(1.8, 2.4), hp: 3, w: 10, h: 16, mineT: 60 + irnd(60) });
          else if (Math.random() < 0.5) g.items.push({ type: 'fuel', d, x: laneX(d, lo) });
          else g.cars.push({ type: 'civ', d, lo, x: laneX(d, lo), sp: rnd(1.6, 2.8), pal: irnd(3), hp: 1, w: 8, h: 10 });
        }
        // chasers come from behind
        g.chaseT--;
        const nCh = g.cars.filter(c => c.type === 'chaser').length;
        if (g.chaseT <= 0 && nCh < Math.min(3, 1 + Math.floor(s / 2))) {
          g.chaseT = Math.max(150, 420 - s * 40) + irnd(200);
          const d = g.d - 70;
          const lo = Math.random() < 0.5 ? -0.3 : 0.3;
          g.cars.push({ type: 'chaser', d, lo, x: laneX(d, lo), sp: g.sp + 1.2, hp: 1, w: 8, h: 10, state: 'catch', t: 0, spin: 0 });
          au.tone(1200, 0.5, { type: 'square', vol: 0.06, slideTo: 800 });
          au.tone(800, 0.5, { type: 'square', vol: 0.06, slideTo: 1200, delay: 0.5 });
        }
      }
      function updateCars() {
        for (const c of g.cars) {
          if (c.type === 'civ' || c.type === 'truck') {
            c.d += c.sp;
            // gently follow lane
            const tx = laneX(c.d, c.lo);
            c.x += clamp(tx - c.x, -1, 1);
            // avoid rear-ending slower traffic: brake behind
            for (const o of g.cars) if (o !== c && o.d > c.d && o.d - c.d < 26 && Math.abs(o.x - c.x) < 10) c.sp = Math.min(c.sp, o.sp);
            if (c.type === 'truck' && sy(c.d) > 0 && sy(c.d) < PSY - 20) {
              c.mineT--;
              if (c.mineT <= 0) {
                c.mineT = Math.max(50, 140 - g.stage * 12) + irnd(60);
                g.items.push({ type: 'mine', d: c.d - 12, x: c.x });
                au.tone(200, 0.08, { type: 'square', vol: 0.06 });
              }
            }
          } else if (c.type === 'chaser') {
            if (c.spin > 0) {
              c.spin--; c.sp *= 0.96; c.d += c.sp; c.x += Math.sin(c.spin * 0.6) * 1.5;
              if (c.spin === 0) { c.dead = true; boom(c.x, c.d, true); addScore(300); pop(c.x, sy(c.d), 300); au.noise(0.5, { vol: 0.2, freq: 1200, slideTo: 100 }); }
              continue;
            }
            c.t++;
            const rel = c.d - g.d;
            if (c.state === 'catch') {
              c.sp = g.sp + 1.0 + g.stage * 0.08;
              c.x += clamp(laneX(c.d, c.lo) - c.x, -1.2, 1.2);
              if (rel > -16) c.state = Math.random() < 0.5 ? 'ram' : 'pass';
            } else if (c.state === 'ram') {
              c.sp = g.sp + (rel < 0 ? 0.4 : -0.2);
              c.x += clamp(g.x - c.x, -1.1 - g.stage * 0.08, 1.1 + g.stage * 0.08);
              if (c.t > 300) c.state = 'pass';
            } else if (c.state === 'pass') {
              c.sp = g.sp + 1.2;
              if (rel > 40) { c.state = 'block'; c.t = 0; }
              c.x += clamp(laneX(c.d, c.lo) - c.x, -1, 1);
            } else if (c.state === 'block') {
              // sit in front, weaving and brake-checking
              c.sp = Math.max(1, g.sp + (rel > 60 ? -0.5 : 0.3) - (Math.sin(c.t * 0.05) > 0.8 ? 1.2 : 0));
              c.x += clamp(g.x - c.x + Math.sin(c.t * 0.04) * 20, -1, 1);
              if (c.t > 400) { c.state = 'pass'; c.sp += 2; }
            }
            c.d += c.sp;
          }
          // keep on road
          const rc = roadC(c.d), rw = roadW(c.d);
          c.x = clamp(c.x, rc - rw / 2 + 5, rc + rw / 2 - 5);
        }
        // remove far away
        for (const c of g.cars) { const y = sy(c.d); if (y > H + 60 || y < -200) c.dead = true; }
        g.cars = g.cars.filter(c => !c.dead);
        g.items = g.items.filter(it => { const y = sy(it.d); return y < H + 20 && !it.dead; });
        g.slicks = g.slicks.filter(s => { const y = sy(s.d); return y < H + 20 && --s.t > 0; });
        // cars hitting oil slicks or mines
        for (const c of g.cars) {
          if (c.type !== 'chaser' || c.spin > 0) continue;
          for (const s of g.slicks) if (Math.abs(s.x - c.x) < 9 && Math.abs(s.d - c.d) < 9) { c.spin = 60; au.tone(600, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 150 }); }
        }
      }
      function hitCar(c) {
        if (--c.hp > 0) { au.tone(700, 0.04, { type: 'square', vol: 0.08 }); c.flash = 6; return; }
        c.dead = true; boom(c.x, c.d, c.type !== 'civ');
        au.noise(0.35, { vol: 0.22, freq: 2000, slideTo: 150 });
        if (c.type === 'civ') { addScore(-500); pop(c.x, sy(c.d), '-500', C.red); flash('DON\'T SHOOT CIVILIANS!'); au.tone(150, 0.4, { type: 'square', vol: 0.12 }); }
        else if (c.type === 'chaser') { addScore(300); pop(c.x, sy(c.d), 300); }
        else if (c.type === 'truck') { addScore(500); pop(c.x, sy(c.d), 500); }
      }

      function crash(why) {
        if (g.pstate !== 'alive' || g.inv > 0) return;
        g.pstate = 'dead'; g.pt = 120; g.sp = 0;
        boom(g.x, g.d, true); boom(g.x + 5, g.d + 4, true);
        au.noise(1.0, { vol: 0.3, freq: 2000, slideTo: 80 });
        au.tone(300, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
        if (why) flash(why);
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.t = 330;
        au.melody([[392, .2], [349, .2], [330, .2], [262, .5]], { type: 'square', vol: 0.12 });
      }
      function respawn() {
        g.pstate = 'alive'; g.inv = 150; g.sp = 0;
        g.x = roadC(g.d);
        if (g.fuel < 40) g.fuel = 40;
        g.cars = g.cars.filter(c => Math.abs(c.d - g.d) > 50);
        g.items = g.items.filter(it => it.type !== 'mine' || Math.abs(it.d - g.d) > 60);
      }

      function updateGame() {
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < 40);
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);
        if (g.msgT > 0) g.msgT--;
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 240 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase === 'wait') return;
        if (g.phase === 'ready') {
          if (--g.t <= 0) g.phase = 'play';
          return;
        }
        if (g.phase === 'check') {
          g.d += g.sp; g.sp = Math.max(1.5, g.sp * 0.98);
          if (g.t > 60 && g.fuel > 0 && (frame & 1)) { g.fuel = Math.max(0, g.fuel - 1); addScore(10 * Math.min(5, g.stage)); if ((frame & 7) === 1) au.tone(1000, 0.03, { type: 'square', vol: 0.06 }); }
          if (--g.t <= 0) nextStage();
          return;
        }
        // player
        if (g.pstate === 'alive') {
          if (g.inv > 0) g.inv--;
          if (api.key('ArrowUp')) g.sp = Math.min(MAXSP, g.sp + 0.05);
          else if (api.key('ArrowDown')) g.sp = Math.max(0, g.sp - 0.12);
          else g.sp = g.sp > 2.2 ? g.sp - 0.01 : Math.min(2.2, g.sp + 0.03);
          const steer = 1.2 + g.sp * 0.12;
          if (api.key('ArrowLeft')) g.x -= steer;
          if (api.key('ArrowRight')) g.x += steer;
          g.d += g.sp;
          g.distPts += g.sp;
          while (g.distPts >= 20) { g.distPts -= 20; addScore(5); }
          g.fuel -= g.sp * 0.0082 + 0.004;
          if (g.fuel < 20 && (frame % 40) === 0) au.tone(880, 0.08, { type: 'square', vol: 0.08 });
          if (g.fuel <= 0) { g.fuel = 0; g.inv = 0; crash('OUT OF FUEL'); }
          // engine
          if ((frame % 4) === 0) au.tone(60 + g.sp * 30, 0.06, { type: 'sawtooth', vol: 0.03 });
          // road edge
          const rc = roadC(g.d), rw = roadW(g.d);
          if (Math.abs(g.x - rc) > rw / 2 - 3) {
            if (isBridge(g.d)) { if (Math.abs(g.x - rc) > rw / 2 + 1) { g.inv = 0; crash('SPLASH!'); } else g.sp = Math.max(0, g.sp - 0.1); }
            else {
              g.sp = Math.max(0, g.sp - 0.1);
              if ((frame & 3) === 0) au.noise(0.05, { vol: 0.1, freq: 600 });
              if (Math.abs(g.x - rc) > rw / 2 + 10) { g.inv = 0; crash('OFF THE ROAD'); }
            }
          }
          // fire
          if ((api.pressed('Space') || (api.key('Space') && frame % 8 === 0)) && g.shots.length < 4) {
            g.shots.push({ x: g.x, d: g.d + 10, t: 0 });
            au.tone(1600, 0.04, { type: 'square', vol: 0.06, slideTo: 800 });
          }
          if (api.pressed('KeyX') && g.oil > 0) {
            g.oil--; g.slicks.push({ x: g.x, d: g.d - 12, t: 900 });
            au.noise(0.3, { vol: 0.12, freq: 500 });
          }
        } else if (g.pstate === 'dead') {
          if (--g.pt <= 0) {
            g.lives--;
            if (g.lives <= 0) {
              g.phase = 'wait';
              if (api.offerContinue) {
                const cg = g;
                api.offerContinue(() => { if (g === cg) { g.lives = 3; g.fuel = 100; respawn(); g.phase = 'ready'; g.t = 60; } }, () => { if (g === cg) gameOver(); });
              } else gameOver();
              return;
            }
            respawn(); g.phase = 'ready'; g.t = 60;
            return;
          }
        }
        // bullets
        for (const s of g.shots) { s.d += 7; s.t++; }
        g.shots = g.shots.filter(s => s.t < 34 && !s.dead);
        spawnTraffic();
        updateCars();
        for (const s of g.shots) {
          for (const c of g.cars) {
            if (c.dead) continue;
            if (Math.abs(s.x - c.x) < c.w / 2 + 1 && Math.abs(s.d - c.d) < c.h / 2 + 4) { s.dead = true; hitCar(c); break; }
          }
          if (s.dead) continue;
          for (const it of g.items) if (it.type === 'mine' && Math.abs(s.x - it.x) < 5 && Math.abs(s.d - it.d) < 6) { it.dead = true; s.dead = true; boom(it.x, it.d, false); addScore(50); au.noise(0.2, { vol: 0.15 }); }
        }
        g.cars = g.cars.filter(c => !c.dead);
        // player collisions
        if (g.pstate === 'alive') {
          for (const c of g.cars) {
            if (Math.abs(c.x - g.x) < (c.w + 8) / 2 - 1 && Math.abs(c.d - g.d) < (c.h + 12) / 2 - 1) {
              if (g.inv > 0) {
                // ghosted after respawn: just bounce apart
                continue;
              }
              if (c.type === 'chaser') {
                // side-swipe: both cars are knocked apart; a gang car shoved off the road is wrecked
                const dir = Math.sign(g.x - c.x) || 1;
                g.x += dir * 3; c.x -= dir * 7;
                au.tone(140, 0.08, { type: 'square', vol: 0.12 }); au.noise(0.08, { vol: 0.12, freq: 900 });
                const rc = roadC(c.d), rw = roadW(c.d);
                if (Math.abs(c.x - rc) > rw / 2 - 6) { c.dead = true; boom(c.x, c.d, true); addScore(500); pop(c.x, sy(c.d), 500); au.noise(0.5, { vol: 0.2, freq: 1200, slideTo: 100 }); }
                continue;
              }
              c.dead = true; boom(c.x, c.d, true);
              crash('CRASH!');
              break;
            }
          }
          g.cars = g.cars.filter(c => !c.dead);
          for (const it of g.items) {
            if (Math.abs(it.x - g.x) < 7 && Math.abs(it.d - g.d) < 9) {
              if (it.type === 'fuel') {
                it.dead = true; g.fuel = Math.min(100, g.fuel + 35); addScore(100); pop(it.x, sy(it.d), 'FUEL', C.orange);
                au.melody([[784, .05], [988, .05], [1319, .1]], { type: 'square', vol: 0.1 });
              } else if (it.type === 'mine' && g.inv === 0) { it.dead = true; crash('MINE!'); }
            }
          }
        }
        // checkpoint
        if (g.d - g.stageStart >= stageLen() && g.pstate === 'alive') {
          g.phase = 'check'; g.t = 240; g.cars = g.cars.filter(c => c.type !== 'chaser');
          addScore(2000 * Math.min(5, g.stage)); flash('CHECKPOINT!');
          au.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .3]], { type: 'square', vol: 0.12 });
        }
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++; titleD += 2;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        updateGame();
        if (!g) mode = 'title';
      }

      // ---------- render ----------
      function drawRoad(ctx, dOff) {
        for (let y = 0; y < H; y += 2) {
          const d = dOff + (PSY - y);
          const c = roadC(d), w = roadW(d), br = isBridge(d);
          const band = Math.floor(d / 16) & 1;
          ctx.fillStyle = br ? (band ? C.water : C.water2) : (band ? C.grass : C.grass2);
          ctx.fillRect(0, y, W, 2);
          const x0 = Math.round(c - w / 2), x1 = Math.round(c + w / 2);
          if (!br) { ctx.fillStyle = C.dirt; ctx.fillRect(x0 - 4, y, 4, 2); ctx.fillRect(x1, y, 4, 2); }
          else { ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x0 - 3, y, 3, 2); ctx.fillRect(x1, y, 3, 2); }
          ctx.fillStyle = band ? C.road : C.road2;
          ctx.fillRect(x0, y, x1 - x0, 2);
          ctx.fillStyle = C.line;
          ctx.fillRect(x0 + 1, y, 1, 2); ctx.fillRect(x1 - 2, y, 1, 2);
          if ((Math.floor(d / 12) & 1) === 0) {
            ctx.fillRect(Math.round(c - w / 6), y, 1, 2); ctx.fillRect(Math.round(c + w / 6), y, 1, 2);
            ctx.fillStyle = C.yellow; ctx.fillRect(Math.round(c), y, 1, 2);
          }
          // roadside trees
          if (!br && (Math.floor(d) % 56) < 2) {
            const k = Math.floor(d / 56);
            const tx = (k & 1) ? x0 - 16 - (k % 3) * 6 : x1 + 12 + (k % 4) * 5;
            if (tx > 4 && tx < W - 4) { ctx.fillStyle = '#0c4a14'; ctx.fillRect(tx - 5, y - 8, 10, 10); ctx.fillStyle = '#2aa83a'; ctx.fillRect(tx - 3, y - 7, 5, 4); }
          }
        }
      }
      function drawCheckLine(ctx) {
        const d = g.stageStart + stageLen(), y = Math.round(sy(d));
        if (y < -10 || y > H) return;
        const c = roadC(d), w = roadW(d);
        for (let i = 0; i < w; i += 4) { ctx.fillStyle = ((i >> 2) & 1) ? '#000' : '#fff'; ctx.fillRect(Math.round(c - w / 2 + i), y, 4, 4); ctx.fillStyle = ((i >> 2) & 1) ? '#fff' : '#000'; ctx.fillRect(Math.round(c - w / 2 + i), y + 4, 4, 4); }
        ctx.fillStyle = C.red; ctx.fillRect(Math.round(c - w / 2) - 6, y - 20, 3, 28); ctx.fillRect(Math.round(c + w / 2) + 3, y - 20, 3, 28);
        text(ctx, 'CHECK', c, y - 18, C.yellow, 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 20);
        text(ctx, '1UP', 4, 2, C.red); text(ctx, pad(g ? g.score : 0, 6), 4, 11, C.white);
        text(ctx, 'HI-SCORE', W / 2, 2, C.red, 1, 'center'); text(ctx, pad(hi, 6), W / 2, 11, C.white, 1, 'center');
        if (!g) return;
        text(ctx, 'STAGE ' + g.stage, W - 4, 2, C.yellow, 1, 'right');
        text(ctx, 'CARS ' + Math.max(0, g.lives - 1), W - 4, 11, C.white, 1, 'right');
        // bottom
        ctx.fillStyle = '#000'; ctx.fillRect(0, H - 14, W, 14);
        text(ctx, 'FUEL', 4, H - 11, C.white);
        ctx.fillStyle = '#303030'; ctx.fillRect(32, H - 10, 60, 5);
        ctx.fillStyle = g.fuel < 20 ? ((frame >> 3) & 1 ? C.red : C.yellow) : C.orange; ctx.fillRect(32, H - 10, Math.round(60 * clamp(g.fuel, 0, 100) / 100), 5);
        text(ctx, 'OIL ' + g.oil, 100, H - 11, C.cyan);
        // progress
        const prog = clamp((g.d - g.stageStart) / stageLen(), 0, 1);
        ctx.fillStyle = '#303030'; ctx.fillRect(150, H - 9, 70, 3);
        ctx.fillStyle = C.green; ctx.fillRect(150, H - 9, Math.round(70 * prog), 3);
        ctx.fillStyle = C.white; ctx.fillRect(219, H - 12, 2, 8);
        text(ctx, Math.floor(g.sp * 30) + '', W - 2, H - 11, C.white, 1, 'right');
      }
      function drawCar(ctx, c) {
        const x = c.x, y = sy(c.d);
        if (y < -20 || y > H + 20) return;
        if (c.flash > 0) c.flash--;
        let rot = 0;
        if (c.spin > 0) rot = (c.spin >> 2) & 3;
        if (c.type === 'civ') spr(ctx, SEDAN, x, y, CIV_PALS[c.pal], rot);
        else if (c.type === 'chaser') spr(ctx, CHASER, x, y, CHASER_PAL, rot);
        else if (c.type === 'truck') spr(ctx, TRUCK, x, y, c.flash > 0 ? { y: '#fff', w: '#fff', k: '#fff', s: '#fff', r: '#fff' } : TRUCK_PAL, 0);
      }
      function render(ctx) {
        ctx.fillStyle = C.grass; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawRoadTitle(ctx); drawHUD(ctx); drawTitle(ctx); return; }
        drawRoad(ctx, g.d);
        drawCheckLine(ctx);
        for (const s of g.slicks) { const y = Math.round(sy(s.d)); ctx.fillStyle = '#101018'; ctx.fillRect(Math.round(s.x) - 6, y - 4, 12, 8); ctx.fillStyle = '#303050'; ctx.fillRect(Math.round(s.x) - 3, y - 2, 4, 2); }
        for (const it of g.items) { const y = sy(it.d); if (it.type === 'fuel') spr(ctx, FUEL, it.x, y, FUEL_PAL); else spr(ctx, MINE, it.x, y, (frame >> 3) & 1 ? MINE_PAL : { k: '#202020', y: '#ffd020', r: '#ffffff' }); }
        for (const c of g.cars) drawCar(ctx, c);
        ctx.fillStyle = C.yellow;
        for (const s of g.shots) { const y = Math.round(sy(s.d)); ctx.fillRect(Math.round(s.x) - 2, y, 1, 3); ctx.fillRect(Math.round(s.x) + 1, y, 1, 3); }
        if (g.pstate === 'alive' && g.phase !== 'over' && g.phase !== 'wait' && !(g.inv > 0 && (frame >> 2) & 1)) spr(ctx, P_CAR, g.x, PSY, P_PAL);
        for (const b of g.booms) {
          const y = sy(b.d), n = b.big ? 10 : 6, r = b.t * (b.big ? 0.6 : 0.4);
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + b.t * 0.1;
            ctx.fillStyle = ['#fff', C.yellow, C.orange, C.red][(i + (b.t >> 3)) & 3];
            ctx.fillRect(Math.round(b.x + Math.cos(a) * r) - 1, Math.round(y + Math.sin(a) * r) - 1, 3, 3);
          }
          if (b.t < 8) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x) - 4, Math.round(y) - 4, 8, 8); }
        }
        for (const p of g.pops) text(ctx, p.n, p.x, p.y - (50 - p.t) * 0.4, p.col, 1, 'center');
        drawHUD(ctx);
        if (g.msgT > 0 && (g.msgT >> 3) & 1) text(ctx, g.msg, W / 2, 60, C.yellow, 1, 'center');
        if (g.phase === 'ready') { text(ctx, 'STAGE ' + g.stage, W / 2, 100, C.white, 2, 'center'); text(ctx, 'GET READY', W / 2, 120, C.yellow, 1, 'center'); }
        if (g.phase === 'check') { text(ctx, 'STAGE ' + g.stage + ' CLEAR', W / 2, 96, C.white, 1, 'center'); text(ctx, 'FUEL BONUS', W / 2, 108, C.orange, 1, 'center'); }
        if (g.phase === 'over' || g.phase === 'wait') text(ctx, 'GAME OVER', W / 2, 110, C.red, 2, 'center');
      }
      function drawRoadTitle(ctx) {
        const sv = g; g = { stage: 1, d: titleD };
        drawRoad(ctx, titleD);
        g = sv;
      }
      function drawTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(14, 30, W - 28, 196);
        text(ctx, 'HIGHWAY', W / 2 + 2, 42, '#802010', 3, 'center');
        text(ctx, 'HIGHWAY', W / 2, 40, C.yellow, 3, 'center');
        text(ctx, 'CHASE', W / 2 + 2, 68, '#802010', 3, 'center');
        text(ctx, 'CHASE', W / 2, 66, C.red, 3, 'center');
        spr(ctx, P_CAR, 50, 108, P_PAL); text(ctx, 'YOUR PURSUIT CAR', 64, 105, C.white);
        spr(ctx, CHASER, 50, 128, CHASER_PAL); text(ctx, 'GANG CAR 300/500', 64, 125, C.white);
        spr(ctx, TRUCK, 50, 150, TRUCK_PAL); text(ctx, 'MINE TRUCK   500', 64, 147, C.white);
        spr(ctx, SEDAN, 50, 172, CIV_PALS[0]); text(ctx, 'CIVILIAN    -500', 64, 169, C.red);
        spr(ctx, FUEL, 50, 190, FUEL_PAL); text(ctx, 'FUEL         100', 64, 187, C.orange);
        const blink = (titleT >> 4) & 1;
        if (api.credits === 0 || coinFlash > 0) { if (blink || (coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 204, C.red, 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 204, C.yellow, 1, 'center');
        text(ctx, '\u00a9 1980 DATA EAST', W / 2, 216, C.grey, 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 10, C.grey);
      }
      return { update, render, destroy() { } };
    }
  });
})();
