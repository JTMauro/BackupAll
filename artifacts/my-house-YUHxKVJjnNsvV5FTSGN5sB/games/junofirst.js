// Juno First (Konami, 1983) \u2014 from-scratch recreation for the MAME32 Game Room.
// Perspective grid shooter: thrust forward and back over the scrolling grid, blast alien waves before the
// timer runs out, shoot the carrier to free the astronaut (catch him for a score bonus), one time warp per life.
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
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const W = 224, H = 256, HY = 52, BY = 256, F0 = 36, WL = 2048, PZ = 16;
  const kd = d => F0 / (d + F0);
  const sy = d => HY + (BY - HY) * kd(d);
  const sx = (x, d) => W / 2 + x * 140 * kd(d);
  function wrapD(d) { d = ((d % WL) + WL) % WL; return d > WL / 2 ? d - WL : d; }

  // 8-wide pixel sprites
  const SPR = {
    saucer: { rows: ['..YYYY..', '.YRRRRY.', 'YYYYYYYY', '.Y.YY.Y.'], pal: { Y: '#ffd040', R: '#ff3030' } },
    saucer2: { rows: ['..YYYY..', '.YRRRRY.', 'YYYYYYYY', 'Y..YY..Y'], pal: { Y: '#ffd040', R: '#ff3030' } },
    layer: { rows: ['.MMMMMM.', 'MMWMMWMM', 'MMMMMMMM', 'M.M..M.M'], pal: { M: '#ff60d0', W: '#ffffff' } },
    layer2: { rows: ['.MMMMMM.', 'MMWMMWMM', 'MMMMMMMM', '.M.MM.M.'], pal: { M: '#ff60d0', W: '#ffffff' } },
    shooter: { rows: ['G......G', 'GG.GG.GG', '.GGCCGG.', '..G..G..'], pal: { G: '#40ff60', C: '#40c0ff' } },
    shooter2: { rows: ['.G....G.', 'GG.GG.GG', '.GGCCGG.', '.G....G.'], pal: { G: '#40ff60', C: '#40c0ff' } },
    diver: { rows: ['C......C', '.CC..CC.', '..CRRC..', '...CC...'], pal: { C: '#40e0ff', R: '#ff4040' } },
    carrier: { rows: ['...WW...', '.BBBBBB.', 'BWBWBWBW', '.BBBBBB.'], pal: { W: '#ffffff', B: '#4060ff' } },
    egg: { rows: ['..OO..', '.OWOO.', 'OOOOOO', '.OOOO.'], pal: { O: '#ff9020', W: '#ffe0a0' } },
    astro: { rows: ['..W..', '.WWW.', 'W.W.W', '.W.W.', '.W.W.'], pal: { W: '#ffffff' } }
  };
  const SHIP = ['.......W.......', '......WWW......', '......WBW......', '.....WWBWW.....', '..R..WWWWW..R..', '.RR.WWWWWWW.RR.', 'RRWWWWWRWWWWWRR', 'WWWW.WRRRW.WWWW', 'WW...WR.RW...WW', '.....R...R.....'];
  const SHIP_PAL = { W: '#e0e8ff', B: '#40a0ff', R: '#ff4020' };
  const GRIDCOL = ['#3050ff', '#ff40a0', '#40ff80', '#ffa020', '#a040ff', '#40e0ff'];

  ArcadeRegistry.register({
    id: 'junofirst', title: 'Juno First', year: 1983, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up/Down: thrust forward/back \u00b7 Left/Right: move \u00b7 Space: fire \u00b7 X: time warp \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#40e0ff', accent: '#ff40a0' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(25000);
      let mode = 'title', mt = 0, frame = 0, coinFlash = 0, overT = 0;
      let g = null;
      const stars = [];
      for (let i = 0; i < 50; i++) stars.push({ x: Math.random() * 400, y: 22 + Math.random() * (HY - 24), c: ['#fff', '#8af', '#fa8', '#ff8'][i % 4], tw: Math.random() * 60 | 0 });

      const snd = {
        fire() { au.tone(1800, 0.06, { type: 'square', vol: 0.05, slideTo: 500 }); },
        boom() { au.noise(0.25, { vol: 0.15, freq: 2000, slideTo: 150 }); au.tone(300, 0.15, { type: 'square', vol: 0.05, slideTo: 60 }); },
        die() { au.noise(1.2, { vol: 0.25, freq: 3000, slideTo: 50 }); au.tone(900, 1.0, { type: 'sawtooth', vol: 0.08, slideTo: 40 }); },
        warp() { au.tone(80, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 2400 }); au.noise(0.6, { vol: 0.08, freq: 500, slideTo: 6000, type: 'bandpass' }); },
        astro() { au.melody([[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.07], [1976, 0.2]], { type: 'square', vol: 0.12 }); },
        release() { au.tone(600, 0.3, { type: 'triangle', vol: 0.12, slideTo: 1200 }); },
        egg() { au.tone(220, 0.08, { type: 'triangle', vol: 0.07, slideTo: 160 }); },
        hatch() { au.tone(160, 0.2, { type: 'square', vol: 0.07, slideTo: 500 }); },
        eshot() { au.tone(700, 0.06, { type: 'triangle', vol: 0.05, slideTo: 1100 }); },
        alarm() { au.tone(1200, 0.08, { type: 'square', vol: 0.08 }); },
        wave() { au.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]], { type: 'square', vol: 0.12 }); },
        extra() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [1319, 0.3]], { type: 'triangle', vol: 0.15 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); return false;
      }
      function addScore(n) {
        g.score += n; if (g.score > hi) hi = g.score;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 30000; snd.extra(); }
      }

      // ---------------- game ----------------
      function newGame() {
        g = { score: 0, lives: 3, nextExtra: 10000, wave: 0, parts: [], pops: [] };
        startWave();
      }
      function startWave() {
        g.wave++;
        g.camZ = 0; g.vz = 0; g.px = 0;
        g.shots = []; g.eb = []; g.en = []; g.eggs = []; g.astro = null; g.carrierT = 900;
        g.timer = 60 * 75; g.timerMax = g.timer;
        g.bonusMul = 1; g.bonusT = 0;
        const n = 14 + Math.min(16, g.wave * 2);
        const mix = [['saucer', 1], ['layer', g.wave >= 2 ? 0.5 : 0.2], ['shooter', g.wave >= 2 ? 0.5 : 0], ['diver', g.wave >= 3 ? 0.5 : 0]];
        const tot = mix.reduce((a, m) => a + m[1], 0);
        for (let i = 0; i < n; i++) {
          let r = Math.random() * tot, type = 'saucer';
          for (const m of mix) { r -= m[1]; if (r <= 0) { type = m[0]; break; } }
          spawnAlien(type, (Math.random() * 1.6 - 0.8), 140 + i * 60 + Math.random() * 40);
        }
        g.phase = 'intro'; g.phaseT = 120; g.warps = 1;
        g.p = { dead: false, deadT: 0, inv: 0 };
        g.grid = GRIDCOL[(g.wave - 1) % GRIDCOL.length];
        snd.wave();
      }
      function spawnAlien(type, x, z) {
        const sp = 1 + Math.min(1.2, (g.wave - 1) * 0.12);
        g.en.push({ type, x, z: ((z % WL) + WL) % WL, vx: (Math.random() < 0.5 ? -1 : 1) * 0.008 * sp, vz: 0, t: Math.random() * 100 | 0, st: 'roam', sp, pref: 30 + Math.random() * 70, fireT: 120 + Math.random() * 120, eggT: 240 + Math.random() * 200 });
      }
      function remaining() { return g.en.filter(e => e.type !== 'carrier').length + g.eggs.length; }
      function playerZ() { return g.camZ + PZ + g.vz * 4; }

      function killPlayer(why) {
        const p = g.p; if (p.dead || p.inv > 0) return;
        p.dead = true; p.deadT = 140; snd.die();
        const x = sx(g.px, PZ), y = sy(PZ);
        for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, s = Math.random() * 2.5; g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 40 + Math.random() * 40, c: ['#fff', '#ff4020', '#ffd040', '#40a0ff'][i % 4] }); }
        if (why) g.why = why;
      }
      function afterDeath() {
        g.lives--;
        const respawn = () => {
          g.p = { dead: false, deadT: 0, inv: 150 }; g.vz = 0; g.px = 0; g.eb = []; g.warps = 1; g.why = null;
          const pz = playerZ();
          for (const e of g.en) { const d = wrapD(e.z - pz); if (d > -40 && d < 60) e.z += 120; }
          for (const e of g.eggs) { const d = wrapD(e.z - pz); if (d > -20 && d < 30) e.z += 60; }
          if (g.timer <= 0) g.timer = g.timerMax;
        };
        if (g.lives <= 0) {
          g.phase = 'wait';
          const cg = g;
          const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 300; au.melody([[392, 0.2], [330, 0.2], [262, 0.2], [196, 0.6]], { type: 'square', vol: 0.12 }); };
          if (api.offerContinue) api.offerContinue(() => { if (g !== cg) return; g.lives = 3; g.score = 0; g.nextExtra = 10000; g.phase = 'play'; respawn(); }, end);
          else end();
        } else respawn();
      }
      function boomAt(x, y, n, cols) {
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 0.3 + Math.random() * 1.8; g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + Math.random() * 20, c: cols[i % cols.length] }); }
      }
      function killAlien(e) {
        e.dead = true;
        const base = { saucer: 100, layer: 150, shooter: 200, diver: 250, carrier: 1000 }[e.type];
        const pts = base * g.bonusMul * (1 + Math.floor((g.wave - 1) / 4));
        addScore(pts);
        const d = wrapD(e.z - g.camZ);
        const x = sx(e.x, d), y = sy(d);
        boomAt(x, y, 14, ['#fff', '#ffd040', '#ff6020']);
        g.pops.push({ x, y: y - 8, s: String(pts), t: 40 });
        snd.boom();
        if (e.type === 'carrier') { g.astro = { x: e.x, z: e.z, t: 0, h: 18 }; snd.release(); }
      }

      function updPlay() {
        const p = g.p;
        if (g.bonusT > 0 && --g.bonusT === 0) g.bonusMul = 1;
        // timer
        if (!p.dead) {
          g.timer--;
          if (g.timer < 60 * 10 && g.timer % 30 === 0) snd.alarm();
          if (g.timer <= 0) { p.inv = 0; killPlayer('TIME OUT'); }
        }
        // controls
        if (!p.dead) {
          if (api.key('ArrowUp')) g.vz = Math.min(1.9, g.vz + 0.06);
          else if (api.key('ArrowDown')) g.vz = Math.max(-1.4, g.vz - 0.06);
          else g.vz *= 0.97;
          if (api.key('ArrowLeft')) g.px -= 0.022;
          if (api.key('ArrowRight')) g.px += 0.022;
          g.px = clamp(g.px, -0.85, 0.85);
          if ((api.pressed('Space') || (api.key('Space') && frame % 8 === 0)) && g.shots.length < 4) {
            g.shots.push({ x: g.px, z: playerZ() + 2, life: 46 }); snd.fire();
          }
          if (api.pressed('KeyX') && g.warps > 0) {
            g.warps--; g.camZ += 300 + Math.random() * 400; g.warpFx = 40; snd.warp();
            const pz = playerZ();
            for (const e of g.en) { const d = wrapD(e.z - pz); if (d > -30 && d < 50) e.z += 90; }
            g.eb = [];
          }
          if (p.inv > 0) p.inv--;
        } else {
          g.vz *= 0.95;
          if (--p.deadT <= 0) { afterDeath(); return; }
        }
        g.camZ = ((g.camZ + g.vz) % WL + WL) % WL;
        const pz = playerZ();
        // shots
        for (const s of g.shots) {
          const z0 = s.z; s.z += 4.2 + Math.max(0, g.vz); s.life--;
          for (const e of g.en) {
            if (e.dead) continue;
            const d0 = wrapD(e.z - z0), d1 = wrapD(e.z - s.z);
            if (d0 >= -2 && d1 <= 2 && Math.abs(e.x - s.x) < (e.type === 'carrier' ? 0.1 : 0.07)) { killAlien(e); s.dead = true; break; }
          }
          if (!s.dead) for (const eg of g.eggs) {
            if (eg.dead) continue;
            const d0 = wrapD(eg.z - z0), d1 = wrapD(eg.z - s.z);
            if (d0 >= -2 && d1 <= 2 && Math.abs(eg.x - s.x) < 0.06) {
              eg.dead = true; s.dead = true; addScore(50 * g.bonusMul); snd.boom();
              const d = wrapD(eg.z - g.camZ); boomAt(sx(eg.x, d), sy(d), 8, ['#ff9020', '#ffe0a0']); break;
            }
          }
          if (s.life <= 0) s.dead = true;
        }
        g.shots = g.shots.filter(s => !s.dead);
        // aliens
        const waveSp = 1 + Math.min(1.2, (g.wave - 1) * 0.12);
        for (const e of g.en) {
          if (e.dead) continue;
          e.t++;
          const d = wrapD(e.z - pz);
          // keep the swarm near the player
          if (d > 160) e.z -= 0.9 * waveSp;
          else if (d < -40) e.z += d < -120 ? 2.6 : 1.6;
          switch (e.type) {
            case 'saucer':
              if (e.st === 'roam') {
                e.x += e.vx; if (Math.abs(e.x) > 0.8) { e.vx = -e.vx; e.x = clamp(e.x, -0.8, 0.8); }
                e.z += clamp(e.pref - d, -0.4, 0.4) * 0.6 * e.sp;
                if (e.t % 300 === 150 && Math.random() < 0.4 + g.wave * 0.05 && d > 0 && d < 120) e.st = 'dive';
              } else if (e.st === 'dive') {
                e.x += clamp(g.px - e.x, -0.012, 0.012) * e.sp;
                e.z -= 0.9 * e.sp;
                if (d < -20) { e.st = 'roam'; e.pref = 40 + Math.random() * 80; }
              }
              break;
            case 'layer':
              e.x += e.vx; if (Math.abs(e.x) > 0.8) { e.vx = -e.vx; e.x = clamp(e.x, -0.8, 0.8); }
              e.z += Math.sin(e.t * 0.02) * 0.5 + clamp(e.pref - d, -0.3, 0.3) * 0.4;
              if (--e.eggT <= 0 && d > 10 && d < 150) { e.eggT = Math.max(200, 420 - g.wave * 20) + Math.random() * 200; g.eggs.push({ x: e.x, z: e.z, t: 0 }); snd.egg(); }
              break;
            case 'shooter':
              e.x += e.vx * 0.7; if (Math.abs(e.x) > 0.8) { e.vx = -e.vx; e.x = clamp(e.x, -0.8, 0.8); }
              e.z += clamp(60 + Math.sin(e.t * 0.01) * 30 - d, -0.5, 0.5) * 0.5;
              if (--e.fireT <= 0 && d > 15 && d < 130 && !p.dead) {
                e.fireT = Math.max(60, 160 - g.wave * 10) + Math.random() * 80;
                const dx = g.px - e.x, dist = Math.max(10, d);
                const spd = 1.3 + g.wave * 0.06;
                g.eb.push({ x: e.x, z: e.z, vx: dx / dist * spd, vz: -spd, life: 200 }); snd.eshot();
              }
              break;
            case 'diver':
              if (e.st === 'roam') {
                e.x += e.vx * 1.5; if (Math.abs(e.x) > 0.8) { e.vx = -e.vx; e.x = clamp(e.x, -0.8, 0.8); }
                e.z += clamp(e.pref + 30 - d, -0.6, 0.6) * 0.6;
                if (e.t % 160 === 80 && d > 0 && d < 130) { e.st = 'dive'; e.tx = g.px; }
              } else if (e.st === 'dive') {
                e.x += clamp(e.tx - e.x, -0.02, 0.02);
                e.z -= 1.8 * e.sp;
                if (d < -25) { e.st = 'back'; }
              } else { e.z += 2.2; if (d > 60) e.st = 'roam'; }
              break;
            case 'carrier':
              e.x += e.vx; e.z += clamp(70 - d, -0.6, 0.6) * 0.5;
              if (Math.abs(e.x) > 1.3) e.dead = true;
              break;
          }
          e.z = ((e.z % WL) + WL) % WL;
          // collision with player
          const dd = wrapD(e.z - pz);
          if (!p.dead && p.inv <= 0 && Math.abs(dd) < 3 && Math.abs(e.x - g.px) < 0.08) { killAlien(e); killPlayer(); }
        }
        g.en = g.en.filter(e => !e.dead);
        // eggs hatch
        for (const eg of g.eggs) {
          eg.t++;
          if (eg.t > 420 && !eg.dead) { eg.dead = true; snd.hatch(); spawnAlien('saucer', eg.x, eg.z); }
          const dd = wrapD(eg.z - pz);
          if (!eg.dead && !p.dead && p.inv <= 0 && Math.abs(dd) < 2.5 && Math.abs(eg.x - g.px) < 0.06) { eg.dead = true; killPlayer(); }
        }
        g.eggs = g.eggs.filter(e => !e.dead);
        // enemy bullets
        for (const b of g.eb) {
          b.x += b.vx; b.z += b.vz; b.life--;
          const dd = wrapD(b.z - pz);
          if (!p.dead && p.inv <= 0 && Math.abs(dd) < 2.5 && Math.abs(b.x - g.px) < 0.05) { b.dead = true; killPlayer(); }
          if (b.life <= 0 || dd < -30) b.dead = true;
        }
        g.eb = g.eb.filter(b => !b.dead);
        // carrier & astronaut
        if (!g.astro && !g.en.some(e => e.type === 'carrier') && --g.carrierT <= 0) {
          g.carrierT = 1200 + Math.random() * 600;
          const side = Math.random() < 0.5 ? -1 : 1;
          g.en.push({ type: 'carrier', x: side * 1.25, z: pz + 70, vx: -side * 0.007, vz: 0, t: 0, st: 'roam' });
        }
        if (g.astro) {
          const a = g.astro; a.t++;
          if (a.h > 0) a.h = Math.max(0, a.h - 0.3);
          a.z -= 0.15;
          const dd = wrapD(a.z - pz);
          if (!p.dead && Math.abs(dd) < 4 && Math.abs(a.x - g.px) < 0.1 && a.h < 6) {
            g.astro = null; addScore(1000); g.bonusMul = Math.min(5, g.bonusMul + 1); g.bonusT = 60 * 12; snd.astro();
            g.pops.push({ x: sx(g.px, PZ), y: sy(PZ) - 20, s: 'BONUS X' + g.bonusMul, t: 70 });
          } else if (a.t > 60 * 15 || dd < -30) g.astro = null;
        }
        // wave clear
        if (!p.dead && remaining() === 0) {
          const bonus = Math.floor(g.timer / 60) * 20;
          addScore(bonus); g.clearBonus = bonus;
          g.phase = 'clear'; g.phaseT = 180; snd.clear();
        }
      }

      function update() {
        frame++; mt++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (mode === 'over') {
          if (--overT <= 0 || (overT < 200 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; }
          return;
        }
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.4; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.warpFx > 0) g.warpFx--;
        if (g.phase === 'wait') return;
        if (g.phase === 'intro') {
          g.camZ += 1.2;
          if (--g.phaseT <= 0) g.phase = 'play';
          return;
        }
        if (g.phase === 'clear') {
          g.vz = 1.9; g.camZ += g.vz;
          if (--g.phaseT <= 0) startWave();
          return;
        }
        updPlay();
      }

      // ---------------- drawing ----------------
      function drawSpr(ctx, name, cx, cy, size) {
        const s = SPR[name];
        const w = s.rows[0].length, c = Math.max(1, Math.round(size / w));
        if (size < 3) { ctx.fillStyle = s.pal[Object.keys(s.pal)[0]]; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2); return; }
        const x0 = Math.round(cx - w * c / 2), y0 = Math.round(cy - s.rows.length * c);
        for (let r = 0; r < s.rows.length; r++) {
          const row = s.rows[r];
          for (let i = 0; i < w; i++) { const col = s.pal[row[i]]; if (col) { ctx.fillStyle = col; ctx.fillRect(x0 + i * c, y0 + r * c, c, c); } }
        }
      }
      function drawGround(ctx, camZ, col) {
        // sky
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HY);
        const shift = (g ? g.px * 30 : 0);
        for (const s of stars) {
          if (((frame + s.tw) % 60) < 8) continue;
          const x = ((s.x - shift) % W + W) % W;
          ctx.fillStyle = s.c; ctx.fillRect(x | 0, s.y | 0, 1, 1);
        }
        // planet ground
        ctx.fillStyle = '#060818'; ctx.fillRect(0, HY, W, H - HY);
        ctx.fillStyle = col; ctx.fillRect(0, HY, W, 1);
        // horizontal grid lines
        const step = 16;
        const first = Math.ceil((camZ - 6) / step) * step;
        for (let z = first; z < camZ + 400; z += step) {
          const d = z - camZ, y = Math.round(sy(d));
          if (y < HY + 1 || y > H) continue;
          ctx.globalAlpha = clamp(kd(d) * 1.6, 0.25, 1);
          ctx.fillStyle = col; ctx.fillRect(0, y, W, 1);
        }
        ctx.globalAlpha = 1;
        // converging lines
        ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = -2; x <= 2.001; x += 0.25) {
          ctx.moveTo(sx(x, -8), sy(-8)); ctx.lineTo(sx(x, 600), sy(600));
        }
        ctx.stroke();
      }
      function renderGame(ctx) {
        const camZ = g.camZ;
        drawGround(ctx, camZ, g.grid);
        // collect drawables sorted far to near
        const items = [];
        for (const e of g.en) { const d = wrapD(e.z - camZ); if (d > -6 && d < 400) items.push({ d, e }); }
        for (const eg of g.eggs) { const d = wrapD(eg.z - camZ); if (d > -6 && d < 400) items.push({ d, egg: eg }); }
        if (g.astro) { const d = wrapD(g.astro.z - camZ); if (d > -6 && d < 400) items.push({ d, astro: g.astro }); }
        items.sort((a, b) => b.d - a.d);
        for (const it of items) {
          const k = kd(it.d), x = sx((it.e || it.egg || it.astro).x, it.d), y = sy(it.d);
          if (it.e) {
            const e = it.e, size = 22 * k;
            const alt = (e.t >> 3) & 1;
            const name = e.type === 'carrier' ? 'carrier' : e.type + (alt ? '2' : '');
            const hover = e.type === 'carrier' ? 10 * k : 4 * k + Math.sin(e.t * 0.1) * 2 * k;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(Math.round(x - size / 3), Math.round(y - 1), Math.max(1, Math.round(size * 2 / 3)), 1);
            drawSpr(ctx, SPR[name] ? name : e.type, x, y - hover, e.type === 'carrier' ? size * 1.3 : size);
          } else if (it.egg) {
            const pulse = it.egg.t > 300 && (frame & 4);
            drawSpr(ctx, 'egg', x, y, 14 * k * (pulse ? 1.2 : 1));
          } else {
            drawSpr(ctx, 'astro', x, y - it.astro.h * k, 12 * k);
            if ((frame >> 3) & 1) text(ctx, 'HELP', Math.round(x), Math.round(y - it.astro.h * k - 18 * k - 8), '#fff', 1, 'center');
          }
        }
        // shots
        for (const s of g.shots) {
          const d = wrapD(s.z - camZ); if (d < -4) continue;
          const x = sx(s.x, d), y = sy(d), k = kd(d), len = Math.max(2, 10 * k);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - (k > 0.5 ? 1 : 0), Math.round(y - len), k > 0.5 ? 2 : 1, Math.round(len));
          ctx.fillStyle = '#40e0ff'; ctx.fillRect(Math.round(x) - 1, Math.round(y - len - 1), 2, 1);
        }
        for (const b of g.eb) {
          const d = wrapD(b.z - camZ); if (d < -6 || d > 400) continue;
          const x = sx(b.x, d), y = sy(d), s = Math.max(2, Math.round(5 * kd(d)));
          ctx.fillStyle = (frame >> 1) & 1 ? '#ff4040' : '#ffff60'; ctx.fillRect(Math.round(x - s / 2), Math.round(y - s - 2), s, s);
        }
        // player
        const p = g.p;
        if (!p.dead && !(p.inv > 0 && (frame & 2))) {
          const d = PZ + g.vz * 4, x = Math.round(sx(g.px, d)), y = Math.round(sy(d));
          for (let r = 0; r < SHIP.length; r++) for (let i = 0; i < SHIP[r].length; i++) {
            const c = SHIP_PAL[SHIP[r][i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x - 7 + i, y - 14 + r, 1, 1); }
          }
          if (g.vz > 0.2) { ctx.fillStyle = frame & 2 ? '#ffd040' : '#ff6020'; ctx.fillRect(x - 5, y - 4, 2, 2 + (frame & 1)); ctx.fillRect(x + 4, y - 4, 2, 2 + (frame & 1)); }
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 6, y + 2, 13, 2);
        }
        for (const q of g.parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }
        for (const q of g.pops) text(ctx, q.s, Math.round(q.x), Math.round(q.y), '#ffffff', 1, 'center');
        if (g.warpFx > 0) {
          ctx.globalAlpha = g.warpFx / 40;
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 30; i++) { const x = (i * 53 + frame * 7) % W; ctx.fillRect(x, HY, 1, H - HY); }
          ctx.globalAlpha = 1;
          text(ctx, 'TIME WARP', W / 2, 120, '#ff40ff', 2, 'center');
        }
        drawHUD(ctx);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 20);
        text(ctx, 'SCORE', 4, 1, '#ff4040'); text(ctx, String(g.score).padStart(6, '0'), 4, 10, '#fff');
        text(ctx, 'HI-SCORE', W / 2, 1, '#ff4040', 1, 'center'); text(ctx, String(hi).padStart(6, '0'), W / 2, 10, '#fff', 1, 'center');
        text(ctx, 'WAVE ' + g.wave, W - 4, 1, '#40e0ff', 1, 'right');
        text(ctx, 'LEFT ' + remaining(), W - 4, 10, '#ffd040', 1, 'right');
        // timer bar
        const f = clamp(g.timer / g.timerMax, 0, 1);
        ctx.fillStyle = '#202040'; ctx.fillRect(4, 22, W - 8, 4);
        ctx.fillStyle = f < 0.15 ? ((frame >> 3) & 1 ? '#ff2020' : '#ffff40') : f < 0.4 ? '#ffd040' : '#40ff60';
        ctx.fillRect(4, 22, Math.round((W - 8) * f), 4);
        // lives
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) { ctx.fillStyle = '#e0e8ff'; ctx.fillRect(6 + i * 9, 30, 5, 4); ctx.fillRect(8 + i * 9, 28, 1, 2); ctx.fillStyle = '#ff4020'; ctx.fillRect(5 + i * 9, 33, 7, 1); }
        if (g.warps > 0) text(ctx, 'WARP', W - 4, 29, '#ff40ff', 1, 'right');
        if (g.bonusMul > 1) text(ctx, 'BONUS X' + g.bonusMul, W / 2, 30, (frame >> 3) & 1 ? '#ffffff' : '#40e0ff', 1, 'center');
        // radar: alien depth markers
        ctx.fillStyle = '#101028'; ctx.fillRect(W - 8, 40, 4, H - 60);
        const pz = playerZ();
        for (const e of g.en) {
          const d = wrapD(e.z - pz); if (d < -200 || d > 400) continue;
          const y = Math.round(40 + (H - 60) * (1 - (d + 200) / 600));
          ctx.fillStyle = e.type === 'carrier' ? '#ffffff' : '#ffd040'; ctx.fillRect(W - 8, y, 4, 1);
        }
        ctx.fillStyle = '#40ff60'; ctx.fillRect(W - 9, Math.round(40 + (H - 60) * (1 - 200 / 600)), 6, 1);
      }
      function renderTitle(ctx) {
        drawGround(ctx, mt * 1.2, GRIDCOL[(mt >> 8) % GRIDCOL.length]);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(10, 56, W - 20, 150);
        text(ctx, 'JUNO', W / 2 + 2, 64, '#003060', 4, 'center'); text(ctx, 'JUNO', W / 2, 62, '#40e0ff', 4, 'center');
        text(ctx, 'FIRST', W / 2 + 2, 96, '#600030', 4, 'center'); text(ctx, 'FIRST', W / 2, 94, '#ff40a0', 4, 'center');
        const page = Math.floor(mt / 400) % 2;
        if (page === 0) {
          text(ctx, 'HI-SCORE ' + hi, W / 2, 134, '#fff', 1, 'center');
          text(ctx, 'DESTROY EVERY ALIEN', W / 2, 150, '#ffd040', 1, 'center');
          text(ctx, 'BEFORE TIME RUNS OUT', W / 2, 160, '#ffd040', 1, 'center');
        } else {
          const rows = [['saucer', '100'], ['layer', '150'], ['shooter', '200'], ['diver', '250'], ['carrier', '1000']];
          rows.forEach((r, i) => { drawSpr(ctx, r[0], 70, 140 + i * 13, r[0] === 'carrier' ? 20 : 16); text(ctx, r[1] + ' PTS', 90, 134 + i * 13, '#fff'); });
          drawSpr(ctx, 'astro', 160, 154, 10); text(ctx, 'RESCUE', 172, 140, '#ffffff'); text(ctx, 'BONUS', 172, 150, '#40e0ff');
        }
        const blink = (mt >> 4) & 1;
        if (coinFlash > 0 ? (coinFlash >> 2) & 1 : api.credits === 0 && blink) text(ctx, 'INSERT COIN', W / 2, 212, '#fff', 1, 'center');
        else if (api.credits > 0 && blink) text(ctx, 'PUSH START', W / 2, 212, '#fff', 1, 'center');
        text(ctx, '\u00a9 1983 KONAMI', W / 2, 228, '#ff5050', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, H - 12, 90, 12);
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#aaa');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        renderGame(ctx);
        if (g.phase === 'intro') { text(ctx, 'WAVE ' + g.wave, W / 2, 110, '#ffffff', 2, 'center'); text(ctx, 'GET READY', W / 2, 132, (frame >> 3) & 1 ? '#ffd040' : '#ff40a0', 1, 'center'); }
        if (g.phase === 'clear') { text(ctx, 'WAVE CLEAR', W / 2, 110, '#40ff60', 2, 'center'); text(ctx, 'TIME BONUS ' + g.clearBonus, W / 2, 132, '#fff', 1, 'center'); }
        if (g.p.dead && g.why) text(ctx, g.why, W / 2, 110, '#ff4040', 2, 'center');
        if (mode === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 110, 100, 24);
          text(ctx, 'GAME OVER', W / 2, 118, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
