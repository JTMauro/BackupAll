// SubRoc-3D (Sega, 1982) -- from-scratch recreation. Periscope-view shooter: ships, planes, saucers and
// sub-launched missiles at many depths, torpedoes along the sea and anti-air missiles into the sky,
// day / dusk / night cycle and a mothership at the end of every round. The original's stereo viewer is
// stood in for by layered parallax, depth fog, water shadows and depth-scaled sprites.
(function () {
  'use strict';
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
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;

  ArcadeRegistry.register({
    id: 'subroc3d', title: 'SubRoc-3D', year: 1982, maker: 'Sega',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Left/Right: turn periscope \u00b7 Up/Down: raise/lower sight \u00b7 Space: torpedo \u00b7 X: anti-air missile \u00b7 Enter: start',
    marquee: { bg: '#03102a', fg: '#40e0ff', accent: '#ff5a2a' },
    create(api) {
      const W = 256, H = 224;
      const VX0 = 6, VY0 = 18, VX1 = 250, VY1 = 180;
      const CX = 128, HZ = 98, F = 250, EYE = 0.25;
      const ARC = 1.45, PANMAX = 0.95, EMAX = 0.28, EMIN = -0.01;
      const TORP_SP = 8.5, AA_SP = 17, MAXD = 26;

      // ---- palettes for the time-of-day cycle: day -> dusk -> night -> (dawn) day ----
      const PAL = [
        { top: [38, 104, 206], hz: [176, 216, 248], seaH: [64, 128, 176], seaB: [8, 40, 92], fog: [176, 210, 236], light: 1, star: 0 },
        { top: [56, 34, 104], hz: [252, 146, 74], seaH: [128, 76, 84], seaB: [18, 18, 52], fog: [226, 140, 96], light: 0.8, star: 0.25 },
        { top: [2, 4, 20], hz: [22, 32, 76], seaH: [16, 28, 60], seaB: [0, 4, 16], fog: [26, 36, 72], light: 0.55, star: 1 }
      ];
      let pal = PAL[0];
      function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
      function setPal(ph) {
        const i = Math.floor(ph) % 3, j = (i + 1) % 3, t = ph - Math.floor(ph);
        const A = PAL[i], B = PAL[j];
        pal = { top: mix(A.top, B.top, t), hz: mix(A.hz, B.hz, t), seaH: mix(A.seaH, B.seaH, t), seaB: mix(A.seaB, B.seaB, t),
          fog: mix(A.fog, B.fog, t), light: lerp(A.light, B.light, t), star: lerp(A.star, B.star, t) };
      }
      const rgb = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
      let fogF = 0;
      function shade(r, g, b) {
        const l = pal.light, f = fogF, q = pal.fog;
        return 'rgb(' + ((r * l * (1 - f) + q[0] * f) | 0) + ',' + ((g * l * (1 - f) + q[1] * f) | 0) + ',' + ((b * l * (1 - f) + q[2] * f) | 0) + ')';
      }
      function glow(r, g, b) {
        const f = fogF * 0.6, q = pal.fog;
        return 'rgb(' + ((r * (1 - f) + q[0] * f) | 0) + ',' + ((g * (1 - f) + q[1] * f) | 0) + ',' + ((b * (1 - f) + q[2] * f) | 0) + ')';
      }

      // ---- scenery (fixed in world bearing) ----
      const stars = [], cloudsFar = [], cloudsNear = [], hills = [];
      for (let i = 0; i < 70; i++) stars.push({ a: rnd(-2.2, 2.2), y: rnd(VY0, HZ - 8), b: rnd(0.4, 1) });
      for (let i = 0; i < 9; i++) cloudsFar.push({ a: rnd(-2.2, 2.2), y: rnd(HZ - 62, HZ - 22), w: rnd(18, 44), h: rnd(4, 8) });
      for (let i = 0; i < 6; i++) cloudsNear.push({ a: rnd(-2.6, 2.6), y: rnd(VY0 + 4, HZ - 50), w: rnd(40, 80), h: rnd(8, 14) });
      for (let i = 0; i < 7; i++) hills.push({ a: rnd(-2.2, 2.2), w: rnd(14, 46), h: rnd(3, 11) });

      // ---- game state ----
      let state = 'attract', stateT = 0, attractT = 0, coinFlash = 0;
      let score = 0, hi = api.getHiScore(20000), lives = 3, round = 1, kills = 0, quota = 12, nextExtra = 30000;
      let viewA = 0, elev = 0.1, ents = [], eshots = [], pshots = [], parts = [], boss = null, bossDone = false;
      let spawnT = 0, shotCD = 0, coolT = 0, coolA = 0, shake = 0, flash = 0, crack = 0, pingT = 0, msg = '', msgT = 0;
      let bonus = 0, demo = true, t = 0, warnT = 0;

      function phaseNow() {
        if (state === 'attract') return (attractT / 1500) % 3;
        return (round - 1) % 3 + 0.9 * Math.min(1, kills / quota);
      }
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score >= nextExtra) {
          lives++; nextExtra += nextExtra === 30000 ? 50000 : 80000;
          api.audio.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .14 });
          say('EXTRA SUB!');
        }
        if (score > hi) { hi = score; }
      }
      function say(s) { msg = s; msgT = 120; }

      // ---------- spawning ----------
      function spawnShip() {
        const side = Math.random() < 0.5 ? -1 : 1;
        const kind = Math.random() < 0.25 + round * 0.05 ? 2 : Math.random() < 0.5 ? 1 : 0;
        const d = rnd(7, 18);
        ents.push({ type: 'ship', kind, a: side * ARC, d, alt: 0, va: -side * rnd(0.7, 1.3) * (1 + round * 0.06), vd: 0, dir: -side,
          hw: kind === 2 ? 0.75 : kind === 1 ? 0.55 : 0.62, hh: 0.3, hp: kind === 2 ? 2 : 1, pts: [100, 150, 300][kind],
          fireT: rnd(1.5, 3.5), air: false, t: 0 });
      }
      function spawnPlane() {
        const side = Math.random() < 0.5 ? -1 : 1, d = rnd(7, 16);
        ents.push({ type: 'plane', a: side * (ARC + 0.05), d, alt: Math.min(rnd(1.3, 2.8), EYE + 0.24 * d), va: -side * rnd(3, 4.5) * (1 + round * 0.05),
          vd: rnd(-0.4, 0.2), dir: -side, hw: 0.4, hh: 0.14, hp: 1, pts: 200, fireT: rnd(0.8, 2.5), air: true, t: 0 });
      }
      function spawnSaucer(a, d, alt) {
        const dd = d || 20;
        ents.push({ type: 'saucer', a: a == null ? rnd(-1.2, 1.2) : a, d: dd, alt: alt || Math.min(rnd(0.9, 2.2), EYE + 0.24 * 8),
          va: 0, vd: 0, hw: 0.32, hh: 0.14, hp: 1, pts: 500, fireT: rnd(1.5, 3), air: true, t: 0,
          tx: rnd(-1.1, 1.1), td: rnd(6, 11), retarget: 0, life: rnd(9, 13) });
      }
      function spawnMissile() {
        const a = clamp(viewA + rnd(-1, 1), -1.25, 1.25);
        ents.push({ type: 'missile', a, d: rnd(12, 17), alt: -0.3, va: 0, vd: 0, hw: 0.16, hh: 0.12, hp: 1, pts: 300, air: true,
          phase: 0, t: 0, fireT: 99, wob: rnd(0, 6) });
        splash(a, ents[ents.length - 1].d, 10);
        if (!demo) api.audio.noise(0.5, { vol: 0.08, freq: 900, slideTo: 300 });
      }
      function spawnBoss() {
        boss = { type: 'boss', a: clamp(viewA + rnd(-0.4, 0.4), -0.9, 0.9), d: 26, alt: 2.5, va: 0, vd: 0, hw: 1.7, hh: 0.36,
          hp: 10 + round * 2, maxhp: 10 + round * 2, pts: Math.min(10000, 5000 + (round - 1) * 1000), air: true, t: 0,
          fireT: 2.5, spawnT: 4, base: 0, hitF: 0 };
        boss.base = boss.a;
        ents.push(boss);
        say('MOTHERSHIP APPROACHING');
        api.audio.melody([[220, .18], [330, .18], [220, .18], [330, .18], [220, .18], [330, .3]], { type: 'sawtooth', vol: .12 });
      }
      function spawn() {
        const cap = Math.min(7, 3 + (round >> 1));
        if (ents.length >= cap) return;
        const r = Math.random() * 100;
        if (r < 34) spawnShip();
        else if (r < 58) spawnPlane();
        else if (r < 78) spawnSaucer();
        else spawnMissile();
      }

      // ---------- effects ----------
      function burst(a, d, alt, n, cols, spd, life) {
        for (let i = 0; i < n; i++) {
          parts.push({ a, d, alt, va: rnd(-1, 1) * spd, vd: rnd(-1, 1) * spd, valt: rnd(-0.4, 1.4) * spd, g: 2.2,
            life: rnd(0.5, 1) * life, max: life, col: cols[i % cols.length], sz: rnd(0.05, 0.14) });
        }
      }
      function splash(a, d, n) {
        for (let i = 0; i < n; i++) parts.push({ a, d, alt: 0, va: rnd(-0.4, 0.4), vd: rnd(-0.3, 0.3), valt: rnd(1, 2.6), g: 4,
          life: rnd(0.5, 0.9), max: 0.9, col: [230, 240, 255], sz: rnd(0.05, 0.1), water: true });
      }
      function explode(e) {
        const big = e.type === 'boss' ? 3 : 1;
        burst(e.a, e.d, Math.max(0.05, e.alt + (e.type === 'ship' ? 0.15 : 0)), 26 * big, [[255, 240, 120], [255, 150, 40], [230, 60, 20], [90, 90, 90]], 1.2 * big, 1.2);
        parts.push({ a: e.a, d: e.d, alt: e.alt + 0.1, va: 0, vd: 0, valt: 0, g: 0, life: 0.35, max: 0.35, col: [255, 255, 220], sz: 0.6 * big, flash: true });
        if (e.alt < 0.6) splash(e.a, e.d, 12 * big);
        if (!demo) {
          api.audio.noise(0.6 * big, { vol: 0.22, freq: 1600, slideTo: 80 });
          api.audio.tone(140, 0.4, { type: 'square', vol: 0.1, slideTo: 40 });
        }
      }

      // ---------- player fire ----------
      function fire(kind) {
        if (kind === 'torp') {
          if (coolT > 0 || pshots.filter(s => s.kind === 'torp').length >= 2) return;
          coolT = 16;
          pshots.push({ kind, a: viewA, e: 0, s: 0.6, prev: 0.6 });
          api.audio.noise(0.35, { vol: 0.14, freq: 700, slideTo: 150 });
          api.audio.tone(320, 0.25, { type: 'triangle', vol: 0.12, slideTo: 90 });
        } else {
          if (coolA > 0 || pshots.filter(s => s.kind === 'aa').length >= 3) return;
          coolA = 10;
          pshots.push({ kind, a: viewA, e: elev, s: 0.5, prev: 0.5 });
          api.audio.tone(500, 0.22, { type: 'square', vol: 0.1, slideTo: 1800 });
        }
      }
      function shotHits(sh, o) {
        const d = o.d;
        if (sh.s < d - 0.5 || sh.prev > d + 0.6) return false;
        if (Math.abs(o.a - sh.a) * d > o.hw + 0.12) return false;
        if (sh.kind === 'aa') {
          if (o.type === 'ship') return false;
          const oe = (o.alt - EYE) / d;
          return Math.abs(oe - sh.e) * d <= o.hh + 0.16;
        }
        return o.alt <= o.hh + 0.4 && o.type !== 'boss';
      }
      function enemyFire(e, kind) {
        if (demo && Math.random() < 0.5) return;
        const hitP = Math.min(0.65, 0.2 + round * 0.05);
        const off = Math.random() < hitP ? 0 : (Math.random() < 0.5 ? -1 : 1) * rnd(0.5, 1.4);
        const sp = kind === 'laser' ? 7 + round * 0.4 : kind === 'bomb' ? 4 + round * 0.3 : 5 + round * 0.35;
        eshots.push({ kind, a0: e.a, a: e.a, d0: e.d, d: e.d, alt0: e.alt + (e.type === 'ship' ? 0.2 : 0), alt: e.alt, off,
          f: 0, T: e.d / sp, hw: 0.14, hh: 0.14, type: 'eshot' });
        shotCD = Math.max(0.35, 1.2 - round * 0.08);
        if (!demo) {
          if (kind === 'laser') api.audio.tone(1400, 0.15, { type: 'sawtooth', vol: 0.06, slideTo: 500 });
          else api.audio.noise(0.15, { vol: 0.06, freq: 1200 });
        }
      }

      function playerHit() {
        if (demo || state !== 'play') return;
        state = 'hit'; stateT = 130; shake = 30; flash = 12; crack = 1;
        api.audio.noise(1.2, { vol: 0.28, freq: 2500, slideTo: 60 });
        api.audio.tone(90, 1, { type: 'sawtooth', vol: 0.14, slideTo: 30 });
      }

      // ---------- world update ----------
      function updateWorld(dt) {
        t += dt;
        if (shotCD > 0) shotCD -= dt;
        for (let i = ents.length - 1; i >= 0; i--) {
          const e = ents[i]; e.t += dt;
          if (e.dying) {
            e.dying -= dt; e.alt -= dt * 0.25; e.a += e.va / e.d * dt * 0.3;
            if (Math.random() < 0.3) burst(e.a + rnd(-0.03, 0.03), e.d, 0.1, 1, [[80, 80, 80], [255, 140, 40]], 0.4, 0.8);
            if (e.dying <= 0) ents.splice(i, 1);
            continue;
          }
          if (e.type === 'ship') {
            e.a += e.va / e.d * dt;
          } else if (e.type === 'plane') {
            e.a += e.va / e.d * dt; e.d = clamp(e.d + e.vd * dt, 5, 20);
          } else if (e.type === 'saucer') {
            e.life -= dt;
            if (e.life > 0) {
              e.retarget -= dt;
              if (e.retarget <= 0) { e.retarget = rnd(1, 2.2); e.tx = clamp(e.a + rnd(-0.6, 0.6), -1.2, 1.2); e.td = rnd(5, 12); }
              e.a += clamp(e.tx - e.a, -0.5 * dt, 0.5 * dt);
              e.d += clamp(e.td - e.d, -5 * dt, 5 * dt);
              e.alt = clamp(e.alt + Math.sin(e.t * 3) * dt * 0.6, 0.7, EYE + 0.24 * e.d);
            } else { e.alt += dt * 2; e.d += dt * 6; if (e.d > 28) { ents.splice(i, 1); continue; } }
          } else if (e.type === 'missile') {
            if (e.phase === 0) { e.alt += dt * 0.9; if (e.alt >= 0.45) { e.phase = 1; if (!demo) api.audio.tone(900, 0.4, { type: 'sawtooth', vol: 0.06, slideTo: 300 }); } }
            else {
              e.d -= (2.3 + round * 0.25) * dt;
              e.a += Math.sin(e.t * 2 + e.wob) * 0.04 * dt;
              e.alt = 0.45 + Math.sin(e.t * 3) * 0.06;
              if (e.d < 0.7) {
                ents.splice(i, 1);
                if (demo) { splash(e.a, 1.5, 8); continue; }
                playerHit(); continue;
              }
            }
          } else if (e.type === 'boss') {
            e.hitF = Math.max(0, e.hitF - dt);
            if (e.d > 13) e.d -= dt * 2.5;
            e.a = e.base + Math.sin(e.t * 0.45) * 0.55;
            e.spawnT -= dt;
            if (e.spawnT <= 0 && ents.length < 6) { e.spawnT = Math.max(2.5, 6 - round * 0.4); spawnSaucer(e.a, e.d - 1, e.alt - 0.5); }
            if (e.t > 4 && Math.random() < dt * 0.2) e.base = clamp(e.base + rnd(-0.5, 0.5), -0.95, 0.95);
          }
          if (Math.abs(e.a) > ARC + 0.15) { ents.splice(i, 1); continue; }
          // fire
          if (e.fireT != null && e.type !== 'missile') {
            e.fireT -= dt;
            if (e.fireT <= 0 && Math.abs(e.a) < 1.3 && e.d > 3) {
              if (shotCD <= 0 && state !== 'hit') {
                if (e.type === 'boss') {
                  for (let k = 0; k < 3; k++) { enemyFire({ a: e.a + (k - 1) * 0.12, d: e.d, alt: e.alt - 0.2, type: 'boss' }, 'laser'); }
                  e.fireT = Math.max(1.4, 3 - round * 0.15);
                } else {
                  enemyFire(e, e.type === 'ship' ? 'shell' : e.type === 'plane' ? 'bomb' : 'laser');
                  e.fireT = rnd(2.5, 5) / (1 + round * 0.1);
                }
              } else e.fireT = 0.3;
            }
          }
        }
        // enemy shots
        for (let i = eshots.length - 1; i >= 0; i--) {
          const s = eshots[i];
          s.f += dt / s.T;
          const f = Math.min(1, s.f);
          s.d = lerp(s.d0, 0.35, f);
          s.a = s.a0 + Math.atan2(s.off * f, s.d);
          if (s.kind === 'shell') s.alt = lerp(s.alt0, 0.1, f) + Math.sin(f * Math.PI) * 0.9;
          else if (s.kind === 'bomb') s.alt = lerp(s.alt0, 0.05, f * f);
          else s.alt = lerp(s.alt0, EYE, f);
          if (s.f >= 1) {
            eshots.splice(i, 1);
            if (Math.abs(s.off) < 0.01) playerHit();
            else { splash(s.a, 1.2, 8); if (!demo) api.audio.noise(0.3, { vol: 0.12, freq: 900 }); }
          }
        }
        // player shots
        for (let i = pshots.length - 1; i >= 0; i--) {
          const s = pshots[i];
          s.prev = s.s; s.s += (s.kind === 'torp' ? TORP_SP : AA_SP) * dt;
          let hit = false;
          for (let j = ents.length - 1; j >= 0 && !hit; j--) {
            const e = ents[j];
            if (e.dying || !shotHits(s, e)) continue;
            hit = true;
            e.hp--;
            if (e.type === 'boss') e.hitF = 0.15;
            if (e.hp <= 0) {
              explode(e); addScore(e.pts);
              popup(e);
              if (e.type === 'ship') { e.dying = 1.6; }
              else ents.splice(j, 1);
              if (e === boss) { boss = null; bossDone = true; for (const o of ents) if (o.type === 'saucer') { explode(o); } ents = ents.filter(o => o.type === 'ship'); eshots = []; }
              else if (!demo && !boss && !bossDone) kills++;
            } else {
              burst(e.a, e.d, e.alt, 8, [[255, 255, 160], [255, 120, 40]], 0.6, 0.5);
              if (!demo) api.audio.tone(300, 0.1, { type: 'square', vol: 0.12 });
            }
          }
          for (let j = eshots.length - 1; j >= 0 && !hit; j--) {
            const e = eshots[j];
            if (shotHits(s, e)) { hit = true; eshots.splice(j, 1); burst(e.a, e.d, e.alt, 8, [[255, 220, 120], [200, 200, 200]], 0.5, 0.5); addScore(50); if (!demo) api.audio.noise(0.2, { vol: 0.12, freq: 2500 }); }
          }
          if (hit) { pshots.splice(i, 1); continue; }
          if (s.s > MAXD) { pshots.splice(i, 1); if (s.kind === 'torp') splash(s.a, s.s, 4); }
        }
        // particles
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.life -= dt;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          p.a += p.va / Math.max(1, p.d) * dt; p.d = Math.max(0.6, p.d + p.vd * dt);
          p.valt -= p.g * dt; p.alt += p.valt * dt;
          if (p.alt < 0 && !p.flash) { p.alt = 0; p.valt = 0; p.va *= 0.8; if (!p.water) p.life = Math.min(p.life, 0.2); }
        }
        if (parts.length > 500) parts.splice(0, parts.length - 500);
      }
      const popups = [];
      function popup(e) { if (!demo) popups.push({ a: e.a, d: e.d, alt: e.alt + 0.3, s: String(e.pts), life: 1.2 }); }

      // ---------- flow ----------
      function newGame() {
        demo = false; score = 0; lives = 3; round = 1; nextExtra = 30000;
        newRound();
        api.audio.melody([[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .35]], { type: 'square', vol: .13 });
      }
      function newRound() {
        kills = 0; quota = Math.min(28, 9 + round * 3);
        ents = []; eshots = []; pshots = []; parts = []; boss = null; bossDone = false;
        viewA = 0; elev = 0.1; spawnT = 2; crack = 0;
        state = 'ready'; stateT = 160;
      }
      function tryStart() {
        if (api.useCredit()) { newGame(); return; }
        coinFlash = 90; api.audio.tone(80, 0.25, { type: 'square', vol: 0.2 });
      }
      function endLife() {
        lives--;
        eshots = []; pshots = [];
        ents = ents.filter(e => e.type !== 'missile');
        crack = 0;
        if (lives > 0) { state = 'ready'; stateT = 110; return; }
        const over = () => { state = 'over'; stateT = 330; api.setHiScore(score); api.audio.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'triangle', vol: .16 }); };
        if (api.offerContinue) {
          state = 'wait';
          api.offerContinue(() => { lives = 3; state = 'ready'; stateT = 110; }, over);
        } else over();
      }

      function controls(dt) {
        const pan = 0.9 * dt;
        if (api.key('ArrowLeft') || api.key('KeyA')) viewA -= pan;
        if (api.key('ArrowRight') || api.key('KeyD')) viewA += pan;
        if (api.key('ArrowUp') || api.key('KeyW')) elev += 0.22 * dt;
        if (api.key('ArrowDown') || api.key('KeyS')) elev -= 0.22 * dt;
        viewA = clamp(viewA, -PANMAX, PANMAX); elev = clamp(elev, EMIN, EMAX);
        if (coolT > 0) coolT--; if (coolA > 0) coolA--;
        if (api.pressed('Space') || (api.key('Space') && coolT <= 0)) fire('torp');
        if (api.pressed('KeyX') || api.pressed('KeyZ') || (api.key('KeyX') && coolA <= 0)) fire('aa');
      }

      function update(dt) {
        dt = 1 / 60;
        if (coinFlash > 0) coinFlash--;
        if (shake > 0) shake--; if (flash > 0) flash--;
        if (msgT > 0) msgT--;
        for (let i = popups.length - 1; i >= 0; i--) { popups[i].life -= dt; popups[i].alt += dt * 0.3; if (popups[i].life <= 0) popups.splice(i, 1); }
        if (state === 'attract') {
          attractT++;
          demo = true;
          viewA = Math.sin(attractT / 300) * 0.6; elev = 0.08 + Math.sin(attractT / 170) * 0.06;
          spawnT -= dt; if (spawnT <= 0) { spawnT = rnd(1, 2.2); round = 2; spawn(); round = 1; }
          if (attractT % 40 === 0) { fire(Math.random() < 0.5 ? 'torp' : 'aa'); }
          coolT = Math.max(0, coolT - 1); coolA = Math.max(0, coolA - 1);
          updateWorld(dt);
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (state === 'wait') return;
        if (state === 'over') {
          stateT--; updateWorld(dt);
          if (stateT <= 0 || (stateT < 220 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; attractT = 0; ents = []; eshots = []; pshots = []; }
          return;
        }
        pingT -= dt;
        if (pingT <= 0) { pingT = 3.2; api.audio.tone(1350, 0.7, { type: 'sine', vol: 0.045 }); api.audio.tone(1350, 0.5, { type: 'sine', vol: 0.02, delay: 0.35 }); }
        if (state === 'ready') {
          stateT--; controls(dt); updateWorld(dt);
          if (stateT <= 0) { state = 'play'; }
          return;
        }
        if (state === 'hit') {
          stateT--; updateWorld(dt);
          if (stateT <= 0) endLife();
          return;
        }
        if (state === 'clear') {
          stateT--; updateWorld(dt);
          if (stateT === 150) { addScore(bonus); api.audio.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .25]], { type: 'square', vol: .14 }); }
          if (stateT <= 0) { round++; newRound(); }
          return;
        }
        // play
        controls(dt);
        if (!boss && !bossDone) {
          spawnT -= dt;
          if (spawnT <= 0) { spawnT = Math.max(0.7, rnd(1.6, 2.8) - round * 0.12); spawn(); }
          if (kills >= quota) spawnBoss();
        }
        updateWorld(dt);
        if (bossDone && state === 'play') {
          bossDone = false; boss = null;
          state = 'clear'; stateT = 260; bonus = 1000 * round;
          ents = ents.filter(e => e.dying);
        }
        warnT++;
        const threat = ents.some(e => e.type === 'missile' && e.phase === 1 && e.d < 7) || eshots.some(s => s.off === 0 && s.f > 0.6);
        if (threat && warnT % 20 === 0) api.audio.tone(1800, 0.06, { type: 'square', vol: 0.07 });
      }

      // ---------- rendering ----------
      function proj(a, d, alt) {
        const sc = F / d;
        return { sx: CX + (a - viewA) * F, sy: HZ + (EYE - alt) * sc, sc };
      }
      function fogFor(d) { fogF = clamp((d - 3) / 24, 0, 0.8); }

      function drawSky(ctx, ph) {
        const g = ctx.createLinearGradient(0, VY0, 0, HZ);
        g.addColorStop(0, rgb(pal.top)); g.addColorStop(1, rgb(pal.hz));
        ctx.fillStyle = g; ctx.fillRect(VX0, VY0, VX1 - VX0, HZ - VY0);
        if (pal.star > 0.05) {
          for (const s of stars) {
            const x = CX + (s.a - viewA * 0.92) * F;
            if (x < VX0 || x > VX1) continue;
            const tw = (Math.sin(t * 3 + s.a * 40) + 1) * 0.5;
            const v = (150 + 105 * s.b * tw) * pal.star | 0;
            ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + Math.min(255, v + 20) + ')';
            ctx.fillRect(x | 0, s.y | 0, 1, 1);
          }
        }
        const p = ph % 3;
        if (p < 1.2) { // sun sinks through the day into dusk
          const sy = HZ - 70 + 72 * (p / 1.2), sx = CX + (0.5 - viewA * 0.95) * F;
          const r = 7 + p * 4;
          ctx.fillStyle = p < 0.6 ? '#fff6c0' : '#ffb050';
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,230,160,0.25)'; ctx.beginPath(); ctx.arc(sx, sy, r + 4, 0, Math.PI * 2); ctx.fill();
        }
        if (p > 1.35) { // moon rises through the night
          const k = Math.min(1, (p - 1.35) / 0.9), sy = HZ - 8 - 60 * k, sx = CX + (-0.45 - viewA * 0.95) * F;
          ctx.fillStyle = '#e8ecff'; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = rgb(pal.top); ctx.beginPath(); ctx.arc(sx + 3, sy - 2, 6, 0, Math.PI * 2); ctx.fill();
        }
        // far clouds (layer 1)
        const cl = mix(pal.hz, [255, 255, 255], 0.35 * pal.light);
        ctx.fillStyle = 'rgba(' + (cl[0] | 0) + ',' + (cl[1] | 0) + ',' + (cl[2] | 0) + ',0.75)';
        for (const c of cloudsFar) {
          const x = CX + (c.a - viewA * 0.94) * F + Math.sin(t * 0.05 + c.a) * 6;
          if (x + c.w < VX0 || x - c.w > VX1) continue;
          ctx.fillRect(x - c.w / 2, c.y, c.w, c.h);
          ctx.fillRect(x - c.w / 3, c.y - c.h / 2, c.w * 0.6, c.h / 2);
        }
        // horizon islands (at infinity)
        const hc = mix(pal.fog, [20, 40, 40], 0.45);
        ctx.fillStyle = rgb(hc);
        for (const hl of hills) {
          const x = CX + (hl.a - viewA * 0.97) * F;
          if (x + hl.w < VX0 || x - hl.w > VX1) continue;
          ctx.beginPath(); ctx.moveTo(x - hl.w, HZ); ctx.lineTo(x - hl.w * 0.3, HZ - hl.h); ctx.lineTo(x + hl.w * 0.2, HZ - hl.h * 0.8); ctx.lineTo(x + hl.w, HZ); ctx.fill();
        }
      }
      function drawSea(ctx) {
        const g = ctx.createLinearGradient(0, HZ, 0, VY1);
        g.addColorStop(0, rgb(pal.seaH)); g.addColorStop(1, rgb(pal.seaB));
        ctx.fillStyle = g; ctx.fillRect(VX0, HZ, VX1 - VX0, VY1 - HZ);
        ctx.fillStyle = rgb(mix(pal.hz, [255, 255, 255], 0.3)); ctx.fillRect(VX0, HZ, VX1 - VX0, 1);
        // wave rows: nearer rows scroll more (parallax) and have longer crests
        const wc = mix(pal.seaH, [255, 255, 255], 0.35 + 0.2 * pal.light);
        for (let k = 0; k < 18; k++) {
          const d = 26 / Math.pow(1.21, k);
          const y = Math.round(HZ + EYE * F / d);
          if (y >= VY1) break;
          const sc = F / d;
          const spacing = Math.max(5, 2.2 * sc), len = Math.max(1, 0.7 * sc);
          const par = 1 + 0.35 / d;
          const off = ((-viewA * F * par + Math.sin(t * 0.7 + k) * 0.25 * sc + k * 37) % spacing + spacing) % spacing;
          const a = clamp(0.25 + 0.6 * (1 - d / 26), 0, 0.85);
          ctx.fillStyle = 'rgba(' + (wc[0] | 0) + ',' + (wc[1] | 0) + ',' + (wc[2] | 0) + ',' + a.toFixed(2) + ')';
          for (let x = VX0 - spacing + off; x < VX1; x += spacing) ctx.fillRect(x | 0, y, len | 0 || 1, sc > 30 ? 2 : 1);
        }
        // sun / moon glitter column
        const ph = phaseNow() % 3;
        if (ph < 1.2 || ph > 1.6) {
          const sx = CX + ((ph < 1.2 ? 0.5 : -0.45) - viewA * 0.95) * F;
          ctx.fillStyle = ph < 1.2 ? 'rgba(255,230,160,0.35)' : 'rgba(220,230,255,0.25)';
          for (let y = HZ + 2; y < VY1; y += 3) {
            const w = 2 + (y - HZ) * 0.15, jit = Math.sin(y * 1.7 + t * 4) * w;
            ctx.fillRect(sx - w / 2 + jit, y, w * 0.6, 1);
          }
        }
      }

      function drawShadow(ctx, e) {
        if (e.alt < 0.3) return;
        const p = proj(e.a, e.d, 0);
        if (p.sy > VY1) return;
        const w = e.hw * p.sc * 0.9;
        ctx.fillStyle = 'rgba(0,0,0,' + clamp(0.35 - e.alt * 0.06, 0.08, 0.3).toFixed(2) + ')';
        ctx.fillRect(p.sx - w, p.sy - 1, w * 2, Math.max(1, p.sc * 0.04));
      }
      function drawShip(ctx, e, p) {
        const s = p.sc, L = e.hw * s, h = 0.13 * s;
        if (L < 2) { ctx.fillStyle = shade(70, 76, 86); ctx.fillRect(p.sx - 1, p.sy - 1, 3, 1); return; }
        ctx.save(); ctx.translate(p.sx, p.sy); ctx.scale(e.dir, 1);
        if (!e.dying) { ctx.fillStyle = glow(230, 240, 255); ctx.fillRect(-L * 1.7, -1, L * 0.8, Math.max(1, h * 0.25)); ctx.fillRect(L * 0.9, -1, L * 0.25, Math.max(1, h * 0.2)); }
        const hullC = e.kind === 0 ? [140, 70, 50] : [96, 104, 116], topC = e.kind === 0 ? [200, 196, 180] : [150, 158, 168];
        ctx.fillStyle = shade(hullC[0], hullC[1], hullC[2]);
        ctx.beginPath(); ctx.moveTo(-L, -h); ctx.lineTo(L * 1.05, -h * 1.35); ctx.lineTo(L * 0.8, 0); ctx.lineTo(-L * 0.95, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = shade(40, 40, 46); ctx.fillRect(-L * 0.95, -h * 0.25, L * 1.8, Math.max(1, h * 0.2));
        ctx.fillStyle = shade(topC[0], topC[1], topC[2]);
        if (e.kind === 0) { // freighter: aft bridge, cargo, cranes
          ctx.fillRect(-L * 0.85, -h * 2.4, L * 0.35, h * 1.4);
          ctx.fillStyle = shade(180, 120, 40); ctx.fillRect(-L * 0.4, -h * 1.7, L * 0.45, h * 0.7); ctx.fillStyle = shade(60, 120, 160); ctx.fillRect(L * 0.1, -h * 1.7, L * 0.45, h * 0.7);
          ctx.fillStyle = shade(60, 60, 60); ctx.fillRect(-L * 0.05, -h * 3, Math.max(1, s * 0.02), h * 2); ctx.fillRect(L * 0.62, -h * 3, Math.max(1, s * 0.02), h * 2);
        } else {
          ctx.fillRect(-L * 0.35, -h * 2.1, L * 0.7, h * 1.1);
          ctx.fillRect(-L * 0.05, -h * 3, L * 0.3, h * 0.9);
          ctx.fillStyle = shade(50, 50, 56); ctx.fillRect(-L * 0.25, -h * 2.9, L * 0.14, h * 0.9);
          ctx.fillRect(L * 0.1, -h * 4.4, Math.max(1, s * 0.015), h * 1.5);
          ctx.fillStyle = shade(110, 116, 126);
          ctx.fillRect(L * 0.45, -h * 1.75, L * 0.18, h * 0.5); ctx.fillRect(L * 0.6, -h * 1.6, L * 0.25, Math.max(1, h * 0.15));
          if (e.kind === 2) { ctx.fillRect(-L * 0.7, -h * 1.75, L * 0.18, h * 0.5); ctx.fillRect(-L * 0.95, -h * 1.6, L * 0.25, Math.max(1, h * 0.15)); }
        }
        if (pal.light < 0.8) { ctx.fillStyle = (t * 2 | 0) & 1 ? '#ff4030' : '#ffffa0'; ctx.fillRect(L * 0.1, -h * 4.5, 1, 1); ctx.fillStyle = '#ffe080'; ctx.fillRect(-L * 0.2, -h * 1.8, 1, 1); ctx.fillRect(L * 0.05, -h * 1.8, 1, 1); }
        ctx.restore();
      }
      function drawPlane(ctx, e, p) {
        const s = p.sc, L = e.hw * s, h = 0.07 * s;
        if (L < 2) { ctx.fillStyle = shade(60, 70, 60); ctx.fillRect(p.sx - 1, p.sy, 3, 1); return; }
        ctx.save(); ctx.translate(p.sx, p.sy); ctx.scale(e.dir, 1);
        ctx.fillStyle = shade(84, 104, 76);
        ctx.fillRect(-L, -h, L * 2, h * 2);
        ctx.beginPath(); ctx.moveTo(L, -h); ctx.lineTo(L * 1.25, 0); ctx.lineTo(L, h); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-L * 0.75, -h); ctx.lineTo(-L * 1.05, -h * 4); ctx.lineTo(-L * 0.9, -h * 4); ctx.lineTo(-L * 0.45, -h); ctx.fill();
        ctx.fillStyle = shade(60, 80, 56);
        ctx.beginPath(); ctx.moveTo(L * 0.25, 0); ctx.lineTo(-L * 0.3, h * 4.5); ctx.lineTo(-L * 0.5, h * 4.5); ctx.lineTo(-L * 0.15, 0); ctx.fill();
        ctx.fillStyle = glow(140, 200, 255); ctx.fillRect(L * 0.45, -h * 1.6, L * 0.3, h * 0.8);
        ctx.fillStyle = (t * 3 | 0) & 1 ? glow(255, 50, 40) : glow(60, 255, 80); ctx.fillRect(-L * 0.4, h * 4, 1, 1);
        ctx.restore();
      }
      function drawSaucer(ctx, e, p) {
        const s = p.sc, L = e.hw * s, h = 0.09 * s;
        if (L < 2) { ctx.fillStyle = glow(200, 255, 255); ctx.fillRect(p.sx - 1, p.sy, 2, 1); return; }
        ctx.fillStyle = shade(170, 176, 190);
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy, L, h, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shade(110, 116, 130); ctx.fillRect(p.sx - L * 0.8, p.sy, L * 1.6, Math.max(1, h * 0.5));
        ctx.fillStyle = glow(120, 240, 255);
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy - h * 0.8, L * 0.4, h * 1.1, 0, Math.PI, 0); ctx.fill();
        for (let k = 0; k < 6; k++) {
          const ang = t * 4 + k * Math.PI / 3, cx = Math.cos(ang);
          if (Math.sin(ang) < 0) continue;
          ctx.fillStyle = k & 1 ? glow(255, 80, 60) : glow(255, 240, 80);
          ctx.fillRect(p.sx + cx * L * 0.8 - 1, p.sy, Math.max(1, s * 0.03), Math.max(1, s * 0.03));
        }
      }
      function drawMissile(ctx, e, p) {
        const s = p.sc, r = Math.max(1.5, 0.11 * s);
        if (e.phase === 0) {
          ctx.fillStyle = shade(200, 200, 210); ctx.fillRect(p.sx - r * 0.4, p.sy - r * 2, r * 0.8, r * 3);
          ctx.fillStyle = glow(255, 160, 40); ctx.fillRect(p.sx - r * 0.3, p.sy + r, r * 0.6, r * 1.2);
          return;
        }
        ctx.fillStyle = 'rgba(255,140,40,0.45)'; ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 1.9 + Math.sin(t * 30) * r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shade(70, 74, 84);
        ctx.fillRect(p.sx - r * 1.6, p.sy - r * 0.12, r * 3.2, Math.max(1, r * 0.24)); ctx.fillRect(p.sx - r * 0.12, p.sy - r * 1.6, Math.max(1, r * 0.24), r * 3.2);
        ctx.fillStyle = shade(220, 222, 228); ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = glow(220, 40, 40); ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 0.45, 0, Math.PI * 2); ctx.fill();
      }
      function drawBoss(ctx, e, p) {
        const s = p.sc, L = e.hw * s, h = 0.22 * s;
        const hitc = e.hitF > 0;
        ctx.fillStyle = hitc ? '#ffffff' : shade(120, 110, 150);
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy, L, h, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hitc ? '#ffd0d0' : shade(80, 70, 110);
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy + h * 0.35, L * 0.85, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shade(170, 160, 200);
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy - h * 0.6, L * 0.45, h * 0.8, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = glow(255, 60, 200); ctx.fillRect(p.sx - L * 0.3, p.sy - h * 1.1, L * 0.6, Math.max(1, h * 0.25));
        for (let k = 0; k < 14; k++) {
          const ang = t * 2.2 + k * Math.PI / 7, cx = Math.cos(ang);
          if (Math.sin(ang) < 0) continue;
          ctx.fillStyle = (k + (t * 6 | 0)) % 3 === 0 ? glow(255, 255, 120) : glow(80, 255, 255);
          ctx.fillRect(p.sx + cx * L * 0.92 - 1, p.sy - 1, Math.max(2, s * 0.05), Math.max(2, s * 0.05));
        }
        const pul = 0.5 + 0.5 * Math.sin(t * 8);
        ctx.fillStyle = 'rgba(255,' + (80 + 120 * pul | 0) + ',40,0.9)';
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy + h * 0.8, L * 0.18, h * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        // tractor glow below
        ctx.fillStyle = 'rgba(160,255,255,0.08)';
        ctx.beginPath(); ctx.moveTo(p.sx - L * 0.15, p.sy + h); ctx.lineTo(p.sx + L * 0.15, p.sy + h); ctx.lineTo(p.sx + L * 0.5, HZ + 3); ctx.lineTo(p.sx - L * 0.5, HZ + 3); ctx.fill();
      }
      function drawEShot(ctx, e, p) {
        const r = Math.max(1, 0.09 * p.sc);
        if (e.kind === 'laser') {
          ctx.fillStyle = 'rgba(80,255,255,0.4)'; ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#e0ffff'; ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
        } else if (e.kind === 'bomb') {
          ctx.fillStyle = shade(40, 40, 40); ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,120,40,0.6)'; ctx.fillRect(p.sx - r * 0.3, p.sy - r * 0.3, r * 0.6, r * 0.6);
        } else {
          ctx.fillStyle = 'rgba(255,170,40,0.45)'; ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 1.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      function drawPShot(ctx, s) {
        if (s.kind === 'torp') {
          const a = proj(s.a, s.s, 0), b = proj(s.a, Math.max(0.6, s.s - 1.6), 0);
          ctx.strokeStyle = 'rgba(235,245,255,0.75)'; ctx.lineWidth = Math.max(1, a.sc * 0.06);
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, Math.min(VY1 + 10, b.sy)); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(a.sx - 1, a.sy - 1, 2, 2);
        } else {
          const alt = EYE + s.e * s.s, a = proj(s.a, s.s, alt), b = proj(s.a, Math.max(0.5, s.s - 1.5), EYE + s.e * Math.max(0.5, s.s - 1.5));
          ctx.strokeStyle = 'rgba(255,220,120,0.6)'; ctx.lineWidth = Math.max(1, a.sc * 0.03);
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
          const r = Math.max(1, a.sc * 0.05);
          ctx.fillStyle = '#ffff80'; ctx.fillRect(a.sx - r, a.sy - r, r * 2, r * 2);
        }
      }

      function drawWorld(ctx) {
        const ph = phaseNow(); setPal(ph);
        drawSky(ctx, ph); drawSea(ctx);
        const list = [];
        for (const e of ents) list.push({ d: e.d, o: e, k: 0 });
        for (const e of eshots) list.push({ d: e.d, o: e, k: 1 });
        for (const s of pshots) list.push({ d: s.s, o: s, k: 2 });
        for (const p of parts) list.push({ d: p.d, o: p, k: 3 });
        list.sort((a, b) => b.d - a.d);
        for (const it of list) {
          const o = it.o;
          if (it.k === 2) { drawPShot(ctx, o); continue; }
          const p = proj(o.a, o.d, o.alt);
          if (p.sx < VX0 - 80 || p.sx > VX1 + 80) continue;
          fogFor(o.d);
          if (it.k === 3) {
            const life = o.life / o.max;
            if (o.flash) { ctx.fillStyle = 'rgba(255,255,220,' + (life * 0.8).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p.sx, p.sy, o.sz * p.sc * (1.4 - life), 0, Math.PI * 2); ctx.fill(); continue; }
            const z = Math.max(1, o.sz * p.sc);
            ctx.fillStyle = o.water ? glow(o.col[0], o.col[1], o.col[2]) : glow(o.col[0] * (0.5 + life * 0.5), o.col[1] * life, o.col[2] * life);
            ctx.fillRect(p.sx - z / 2, p.sy - z / 2, z, z);
            continue;
          }
          if (it.k === 1) { drawEShot(ctx, o, p); continue; }
          drawShadow(ctx, o);
          if (o.type === 'ship') drawShip(ctx, o, p);
          else if (o.type === 'plane') drawPlane(ctx, o, p);
          else if (o.type === 'saucer') drawSaucer(ctx, o, p);
          else if (o.type === 'missile') drawMissile(ctx, o, p);
          else if (o.type === 'boss') drawBoss(ctx, o, p);
        }
        for (const pu of popups) {
          const p = proj(pu.a, pu.d, pu.alt);
          text(ctx, pu.s, p.sx, p.sy - 10, pu.life > 0.4 || (api.frame & 2) ? '#ffffff' : '#ffe060', 1, 'center');
        }
        // near clouds / spray (front layer, exaggerated parallax)
        ctx.fillStyle = 'rgba(255,255,255,' + (0.07 + 0.08 * pal.light).toFixed(2) + ')';
        for (const c of cloudsNear) {
          const x = CX + (c.a - viewA * 1.35) * F + t * 3 % 40;
          if (x + c.w < VX0 || x - c.w > VX1) continue;
          ctx.fillRect(x - c.w / 2, c.y, c.w, c.h); ctx.fillRect(x - c.w / 4, c.y - c.h * 0.6, c.w / 2, c.h * 0.6);
        }
        // spray on the periscope glass at the bottom
        ctx.fillStyle = 'rgba(200,230,255,0.12)';
        for (let i = 0; i < 6; i++) { const x = VX0 + ((i * 47 + t * 20 - viewA * F * 1.6) % (VX1 - VX0) + (VX1 - VX0)) % (VX1 - VX0); ctx.fillRect(x, VY1 - 6 - (i % 3) * 3, 10, 2); }
      }

      function drawCrosshair(ctx) {
        const y = Math.round(HZ - elev * F);
        const col = '#80ff80';
        ctx.fillStyle = col;
        ctx.fillRect(CX - 14, y, 9, 1); ctx.fillRect(CX + 6, y, 9, 1);
        ctx.fillRect(CX, y - 12, 1, 8); ctx.fillRect(CX, y + 5, 1, 8);
        ctx.fillRect(CX - 14, y - 4, 1, 9); ctx.fillRect(CX + 14, y - 4, 1, 9);
        // torpedo marker on the horizon
        ctx.fillStyle = '#ffd040'; ctx.fillRect(CX - 3, HZ + 3, 7, 1); ctx.fillRect(CX, HZ + 1, 1, 5);
        // range finder: what's under the sight
        let best = null;
        for (const e of ents) {
          if (e.dying) continue;
          if (Math.abs(e.a - viewA) * e.d > e.hw + 0.15) continue;
          const onAA = Math.abs((e.alt - EYE) / e.d - elev) * e.d < e.hh + 0.2;
          const onT = e.alt < 0.6;
          if ((onAA || onT) && (!best || e.d < best.d)) best = e;
        }
        if (best) { text(ctx, 'RNG ' + String(Math.round(best.d * 100)).padStart(4, '0'), CX + 20, y + 4, '#a0ffa0'); }
        // tick ladder on the left edge for elevation
        ctx.fillStyle = 'rgba(160,255,160,0.5)';
        for (let e = 0; e <= EMAX + 0.001; e += 0.04) ctx.fillRect(VX0 + 3, Math.round(HZ - e * F), e === 0 ? 6 : 3, 1);
        ctx.fillStyle = '#c0ffc0'; ctx.fillRect(VX0 + 2, y - 1, 8, 3);
      }

      function drawFrame(ctx) {
        ctx.fillStyle = '#05070c';
        ctx.fillRect(0, 0, W, VY0); ctx.fillRect(0, VY1, W, H - VY1); ctx.fillRect(0, 0, VX0, H); ctx.fillRect(VX1, 0, W - VX1, H);
        const r = 14;
        const corner = (x, y, cx, cy, a0, a1) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(cx, cy, r, a0, a1, true); ctx.closePath(); ctx.fill(); };
        corner(VX0, VY0, VX0 + r, VY0 + r, -Math.PI / 2, -Math.PI);
        corner(VX1, VY0, VX1 - r, VY0 + r, 0, -Math.PI / 2);
        corner(VX0, VY1, VX0 + r, VY1 - r, Math.PI, Math.PI / 2);
        corner(VX1, VY1, VX1 - r, VY1 - r, Math.PI / 2, 0);
        ctx.strokeStyle = '#2a3a4c'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(VX0 + r, VY0 - 0.5); ctx.lineTo(VX1 - r, VY0 - 0.5); ctx.moveTo(VX0 + r, VY1 + 0.5); ctx.lineTo(VX1 - r, VY1 + 0.5); ctx.stroke();
        // compass tape
        ctx.fillStyle = '#0c1824'; ctx.fillRect(40, 2, 176, 13);
        for (let dg = -90; dg <= 90; dg += 5) {
          const x = Math.round(CX + (dg / 57.2958 - viewA) * F * 0.5);
          if (x < 42 || x > 214) continue;
          ctx.fillStyle = dg % 30 === 0 ? '#60c0ff' : '#2f6080';
          ctx.fillRect(x, 10, 1, dg % 15 === 0 ? 4 : 2);
          if (dg % 30 === 0 && x > 50 && x < 206) text(ctx, String((dg + 360) % 360).padStart(3, '0'), x, 3, '#60c0ff', 1, 'center');
        }
        ctx.fillStyle = '#ffd040'; ctx.fillRect(CX - 1, 1, 3, 2);
        text(ctx, '1UP', 4, 4, '#ff5040'); text(ctx, 'HI', 236, 4, '#ff5040');
        // HUD
        text(ctx, 'SCORE', 8, 186, '#ff5040'); text(ctx, String(score).padStart(7, '0'), 8, 196, '#ffffff');
        text(ctx, 'HI', 8, 207, '#ff5040'); text(ctx, String(Math.max(hi, score)).padStart(7, '0'), 8, 215, '#ffe060');
        text(ctx, 'ROUND ' + round, 248, 186, '#60c0ff', 1, 'right');
        for (let i = 0; i < Math.min(5, lives - (state === 'attract' ? 0 : 1)); i++) drawSubIcon(ctx, 236 - i * 14, 198);
        // quota
        const qf = boss ? 1 : Math.min(1, kills / quota);
        ctx.fillStyle = '#122030'; ctx.fillRect(194, 208, 54, 5);
        ctx.fillStyle = boss ? ((api.frame >> 3) & 1 ? '#ff4040' : '#ff9020') : '#40e0a0'; ctx.fillRect(194, 208, Math.round(54 * qf), 5);
        text(ctx, boss ? 'BOSS' : 'TGT', 192, 215, '#88a', 1, 'right');
        // ready lamps
        const tr = pshots.filter(s => s.kind === 'torp').length < 2 && coolT <= 0, ar = pshots.filter(s => s.kind === 'aa').length < 3 && coolA <= 0;
        text(ctx, 'TORP', 64, 186, tr ? '#ffd040' : '#554'); text(ctx, 'AAM', 64, 196, ar ? '#ffff80' : '#554');
        // radar
        const rx = 128, ry = 221, rr = 36;
        ctx.fillStyle = '#04140c'; ctx.beginPath(); ctx.arc(rx, ry, rr, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#1c5a30'; ctx.beginPath(); ctx.arc(rx, ry, rr, Math.PI, 0); ctx.arc(rx, ry, rr / 2, 0, Math.PI, true); ctx.stroke();
        ctx.strokeStyle = '#2a8a48';
        const half = (VX1 - VX0) / 2 / F;
        ctx.beginPath();
        ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(viewA - half) * rr, ry - Math.cos(viewA - half) * rr);
        ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(viewA + half) * rr, ry - Math.cos(viewA + half) * rr); ctx.stroke();
        const sweep = (t * 2) % Math.PI - Math.PI / 2;
        ctx.strokeStyle = 'rgba(80,255,120,0.35)'; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(sweep) * rr, ry - Math.cos(sweep) * rr); ctx.stroke();
        for (const e of ents) {
          if (e.dying) continue;
          const r = Math.min(1, e.d / 22) * (rr - 2);
          ctx.fillStyle = e.type === 'boss' ? '#ff40ff' : e.type === 'missile' ? ((api.frame >> 2) & 1 ? '#ff3030' : '#ffff40') : e.air ? '#ffe060' : '#60ff90';
          ctx.fillRect(Math.round(rx + Math.sin(e.a) * r) - 1, Math.round(ry - Math.cos(e.a) * r) - 1, e.type === 'boss' ? 3 : 2, 2);
        }
      }
      function drawSubIcon(ctx, x, y) {
        ctx.fillStyle = '#60c0ff';
        ctx.fillRect(x, y + 3, 11, 3); ctx.fillRect(x + 4, y, 3, 3); ctx.fillRect(x + 11, y + 4, 1, 1); ctx.fillRect(x - 1, y + 2, 1, 5);
      }

      function drawWarnings(ctx) {
        const blink = (api.frame >> 3) & 1;
        let left = false, right = false, near = false;
        for (const e of ents) {
          if (e.type !== 'missile' || e.phase !== 1) continue;
          const x = CX + (e.a - viewA) * F;
          if (x < VX0) left = true; else if (x > VX1) right = true;
          if (e.d < 7) near = true;
        }
        if (boss) { const x = CX + (boss.a - viewA) * F; if (x < VX0) left = true; else if (x > VX1) right = true; }
        if (blink) {
          if (left) { ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.moveTo(VX0 + 4, HZ); ctx.lineTo(VX0 + 12, HZ - 6); ctx.lineTo(VX0 + 12, HZ + 6); ctx.fill(); }
          if (right) { ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.moveTo(VX1 - 4, HZ); ctx.lineTo(VX1 - 12, HZ - 6); ctx.lineTo(VX1 - 12, HZ + 6); ctx.fill(); }
          if (near) text(ctx, 'MISSILE ALERT', CX, VY1 - 14, '#ff4040', 1, 'center');
        }
        if (boss) {
          ctx.fillStyle = '#300'; ctx.fillRect(78, 22, 100, 4);
          ctx.fillStyle = '#ff40c0'; ctx.fillRect(78, 22, Math.round(100 * boss.hp / boss.maxhp), 4);
        }
      }

      function drawTitle(ctx) {
        const blink = (api.frame >> 4) & 1;
        const page = Math.floor(attractT / 420) % 2;
        ctx.fillStyle = 'rgba(0,0,10,0.55)'; ctx.fillRect(VX0, VY0, VX1 - VX0, VY1 - VY0);
        if (page === 0) {
          // layered 3D logo: stacked offset copies, back to front
          for (let k = 6; k >= 0; k--) {
            const c = k === 0 ? '#ffe060' : 'rgb(' + (200 - k * 24) + ',' + (40 + k * 6) + ',' + (30 + k * 18) + ')';
            text(ctx, 'SUBROC', CX + k * 0.7, 34 + k, c, 4, 'center');
          }
          for (let k = 4; k >= 0; k--) text(ctx, '-3D', CX + 54 + k * 0.7, 70 + k, k === 0 ? '#40e0ff' : 'rgb(20,' + (60 + k * 20) + ',' + (120 + k * 20) + ')', 3, 'center');
          text(ctx, 'DIVE DEEP. AIM HIGH.', CX, 104, '#a0d8ff', 1, 'center');
          text(ctx, 'SPACE: TORPEDO   X: MISSILE', CX, 118, '#ffffff', 1, 'center');
          text(ctx, 'ARROWS: PERISCOPE + SIGHT', CX, 128, '#ffffff', 1, 'center');
          text(ctx, 'HI SCORE ' + String(hi).padStart(7, '0'), CX, 144, '#ffe060', 1, 'center');
        } else {
          text(ctx, '- SCORE ADVANCE TABLE -', CX, 30, '#ffe060', 1, 'center');
          const rows = [['ship', 'FREIGHTER', 100], ['ship2', 'DESTROYER', 150], ['ship3', 'CRUISER', 300], ['plane', 'BOMBER', 200], ['missile', 'SUB MISSILE', 300], ['saucer', 'SAUCER', 500], ['boss', 'MOTHERSHIP', 5000]];
          setPal(0); fogF = 0;
          rows.forEach((r, i) => {
            const y = 50 + i * 17;
            const o = { a: 0, d: 6, alt: 0, hw: 0.5, hh: 0.2, dir: 1, kind: 0, phase: 1, t: 0, hitF: 0 };
            const p = { sx: 74, sy: y + 6, sc: 30 };
            if (r[0].indexOf('ship') === 0) { o.kind = r[0] === 'ship' ? 0 : r[0] === 'ship2' ? 1 : 2; o.hw = 0.5; drawShip(ctx, o, { sx: 74, sy: y + 9, sc: 30 }); }
            else if (r[0] === 'plane') { o.hw = 0.4; drawPlane(ctx, o, p); }
            else if (r[0] === 'saucer') { o.hw = 0.32; drawSaucer(ctx, o, { sx: 74, sy: y + 5, sc: 34 }); }
            else if (r[0] === 'missile') { drawMissile(ctx, o, { sx: 74, sy: y + 4, sc: 34 }); }
            else { o.hw = 0.9; drawBoss(ctx, o, { sx: 74, sy: y + 4, sc: 22 }); }
            text(ctx, r[1], 100, y + 2, '#ffffff');
            text(ctx, String(r[2]), 210, y + 2, '#ffe060', 1, 'right');
          });
          text(ctx, 'EXTRA SUB AT 30000', CX, 168, '#60c0ff', 1, 'center');
        }
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', CX, 156, '#ff6060', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', CX, 156, '#ff6060', 1, 'center'); }
        else if (page === 0) text(ctx, 'PUSH START', CX, 158, blink ? '#ffffff' : '#808080', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 160, 196, '#888');
        text(ctx, '\u00a9 1982 SEGA', 160, 207, '#666');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.save();
        if (shake > 0) ctx.translate(Math.round(rnd(-3, 3)), Math.round(rnd(-3, 3)));
        ctx.save();
        ctx.beginPath(); ctx.rect(VX0, VY0, VX1 - VX0, VY1 - VY0); ctx.clip();
        drawWorld(ctx);
        if (state !== 'attract' && state !== 'over') { drawCrosshair(ctx); drawWarnings(ctx); }
        if (crack > 0) {
          ctx.strokeStyle = 'rgba(220,240,255,0.8)'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let k = 0; k < 9; k++) {
            const ang = k * 0.7 + 0.3; let x = CX + 10, y = HZ + 20; ctx.moveTo(x, y);
            for (let s = 0; s < 4; s++) { x += Math.cos(ang + s * 0.3) * 22; y += Math.sin(ang + s * 0.3) * 18; ctx.lineTo(x, y); }
          }
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,40,20,' + (0.1 + 0.1 * Math.sin(api.frame * 0.4)).toFixed(2) + ')'; ctx.fillRect(VX0, VY0, VX1 - VX0, VY1 - VY0);
        }
        if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flash / 12).toFixed(2) + ')'; ctx.fillRect(VX0, VY0, VX1 - VX0, VY1 - VY0); }
        if (state === 'attract') drawTitle(ctx);
        if (state === 'ready') {
          const tod = ['DAY', 'DUSK', 'NIGHT'][(round - 1) % 3];
          text(ctx, 'ROUND ' + round, CX, 56, '#ffe060', 2, 'center');
          text(ctx, tod + ' PATROL', CX, 76, '#a0d8ff', 1, 'center');
          text(ctx, 'DESTROY ' + quota + ' TARGETS', CX, 88, '#ffffff', 1, 'center');
        }
        if (state === 'clear') {
          text(ctx, 'MOTHERSHIP DESTROYED', CX, 50, '#ff80ff', 1, 'center');
          text(ctx, 'ROUND ' + round + ' CLEAR', CX, 64, '#ffe060', 2, 'center');
          if (stateT < 210) text(ctx, 'BONUS ' + bonus, CX, 88, '#ffffff', 1, 'center');
        }
        if (state === 'hit' && stateT < 90) text(ctx, 'SUB HIT!', CX, 60, (api.frame >> 3) & 1 ? '#ff4040' : '#ffffff', 2, 'center');
        if (state === 'over') { text(ctx, 'GAME OVER', CX, 70, '#ff4040', 2, 'center'); }
        if (msgT > 0 && state === 'play') text(ctx, msg, CX, 32, (msgT >> 3) & 1 ? '#ffe060' : '#ff8040', 1, 'center');
        ctx.restore();
        drawFrame(ctx);
        ctx.restore();
      }

      return {
        update, render,
        debug() { return { state, round, kills, quota, score, lives, viewA, elev, boss: !!boss, ents: ents.filter(e => !e.dying).map(e => ({ type: e.type, a: e.a, d: e.d, alt: e.alt, va: e.va || 0, phase: e.phase })), eshots: eshots.map(s => ({ a: s.a, d: s.d, alt: s.alt, off: s.off })) }; },
        destroy() { }
      };
    }
  });
})();
