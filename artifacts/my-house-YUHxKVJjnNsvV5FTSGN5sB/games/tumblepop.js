// Tumblepop (Data East, 1991) - from-scratch recreation for the MAME32 Game Room.
// Single-screen platform action: vacuum up the monsters, then hurl them as a rolling ball that bowls over the rest.
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
  function textS(ctx, s, x, y, col, sc, align) { text(ctx, s, x + (sc || 1), y + (sc || 1), '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  function R(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const W = 320, H = 240, GRAV = 0.22, GROUND = 232, WORD = 'TUMBLEPOP';
  const CITIES = [
    { name: 'TOKYO', sky: ['#200a40', '#802060'], plat: '#e04888', hi: '#ffa0c8', lo: '#801848', lm: 'tower' },
    { name: 'PARIS', sky: ['#081838', '#305898'], plat: '#40a0e0', hi: '#b0e8ff', lo: '#184070', lm: 'eiffel' },
    { name: 'EGYPT', sky: ['#401808', '#e08030'], plat: '#e0b040', hi: '#fff0a0', lo: '#806010', lm: 'pyramid' },
    { name: 'NEW YORK', sky: ['#080818', '#283868'], plat: '#50c050', hi: '#b0ffb0', lo: '#186018', lm: 'city' },
    { name: 'THE MOON', sky: ['#000000', '#101030'], plat: '#a0a0b8', hi: '#ffffff', lo: '#505068', lm: 'moon' }
  ];
  // platform layouts: [col0, col1, row] in 8px tiles (one-way platforms); ground is always present
  const LAYOUTS = [
    [[1, 14, 24], [25, 38, 24], [10, 29, 19], [1, 12, 14], [27, 38, 14], [8, 31, 9]],
    [[5, 34, 24], [1, 10, 19], [29, 38, 19], [12, 27, 14], [1, 8, 9], [31, 38, 9], [14, 25, 6]],
    [[1, 8, 24], [14, 25, 24], [31, 38, 24], [6, 33, 19], [1, 10, 14], [16, 23, 14], [29, 38, 14], [6, 33, 9]],
    [[1, 10, 24], [8, 18, 20], [16, 26, 16], [24, 34, 12], [30, 38, 8], [28, 38, 24], [1, 10, 12]],
    [[3, 17, 24], [22, 36, 24], [1, 6, 19], [11, 28, 19], [33, 38, 19], [3, 17, 14], [22, 36, 14], [11, 28, 9]],
    [[1, 16, 24], [23, 38, 24], [8, 31, 19], [1, 16, 14], [23, 38, 14], [8, 31, 9], [1, 6, 7], [33, 38, 7]],
    [[4, 12, 24], [16, 23, 22], [27, 35, 24], [1, 10, 18], [29, 38, 18], [13, 26, 15], [4, 12, 11], [27, 35, 11], [15, 24, 7]],
    [[1, 38, 24], [6, 33, 19], [1, 12, 14], [27, 38, 14], [13, 26, 10]]
  ];
  const BOSS_LAYOUT = [[1, 11, 22], [28, 38, 22], [13, 26, 17], [1, 8, 12], [31, 38, 12]];
  const FRUIT = [
    { v: 100, c: '#e02020', s: '#40c040' }, { v: 200, c: '#ffe040', s: '#40a020' }, { v: 300, c: '#ff9020', s: '#30a030' },
    { v: 500, c: '#a040e0', s: '#40c040' }, { v: 1000, c: '#40e0ff', s: '#ffffff' }, { v: 2000, c: '#ffd700', s: '#fff8a0' }
  ];
  const ETYPES = {
    blob: { w: 1, spd: 0.55, col: '#40c040', dk: '#207020' },
    hopper: { w: 1, spd: 0.7, col: '#ff8020', dk: '#a04010' },
    bat: { w: 0.8, spd: 0.9, col: '#a050e0', dk: '#602090' },
    shooter: { w: 1.2, spd: 0.5, col: '#3080ff', dk: '#1840a0' },
    brute: { w: 2.2, spd: 0.8, col: '#e03030', dk: '#801818' }
  };

  ArcadeRegistry.register({
    id: 'tumblepop', title: 'Tumblepop', year: 1991, maker: 'Data East',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Up or X: jump (Down+X: drop) \u00b7 hold Space: vacuum \u00b7 tap Space: throw \u00b7 Enter: start',
    marquee: { bg: '#200a40', fg: '#ff60b0', accent: '#40e0ff' },
    create(api) {
      const A = api.audio;
      const sfx = {
        jump: () => A.tone(300, 0.12, { type: 'square', vol: 0.08, slideTo: 620 }),
        suck: () => A.noise(0.08, { vol: 0.05, freq: 1800, type: 'bandpass' }),
        grab: () => A.melody([[880, 0.04], [1320, 0.06]], { type: 'square', vol: 0.1 }),
        throw: () => { A.tone(500, 0.18, { type: 'sawtooth', vol: 0.1, slideTo: 140 }); A.noise(0.12, { vol: 0.08, freq: 1500 }); },
        hit: n => A.tone(440 * Math.pow(1.122, Math.min(12, n)), 0.1, { type: 'square', vol: 0.12, slideTo: 880 * Math.pow(1.122, Math.min(12, n)) }),
        bounce: () => A.tone(160, 0.06, { type: 'triangle', vol: 0.12 }),
        smash: () => A.noise(0.25, { vol: 0.18, freq: 2500, slideTo: 300 }),
        item: () => A.tone(1320, 0.06, { type: 'square', vol: 0.09, slideTo: 1760 }),
        letter: () => A.melody([[1047, 0.05], [1319, 0.05], [1568, 0.05], [2093, 0.1]], { type: 'square', vol: 0.1 }),
        die: () => A.melody([[784, 0.08], [659, 0.08], [523, 0.08], [392, 0.08], [262, 0.3]], { type: 'square', vol: 0.13 }),
        clear: () => A.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [784, 0.08], [1047, 0.3]], { type: 'square', vol: 0.13 }),
        hurry: () => A.melody([[988, 0.06], [0, 0.04], [988, 0.06], [0, 0.04], [988, 0.06]], { type: 'square', vol: 0.12 }),
        bossHit: () => { A.noise(0.15, { vol: 0.2, freq: 900 }); A.tone(120, 0.15, { type: 'square', vol: 0.12, slideTo: 60 }); },
        boom: () => { A.noise(0.6, { vol: 0.26, freq: 1200, slideTo: 80 }); A.tone(90, 0.5, { type: 'sine', vol: 0.2, slideTo: 30 }); },
        oneup: () => A.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.16]], { type: 'square', vol: 0.12 }),
        over: () => A.melody([[392, 0.2], [370, 0.2], [349, 0.2], [330, 0.5]], { type: 'triangle', vol: 0.15 }),
        coin: () => A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }),
        shot: () => A.tone(700, 0.06, { type: 'square', vol: 0.06, slideTo: 350 })
      };
      let hi = api.getHiScore(100000);
      let mode = 'attract', T = 0, atT = 0, coinFlash = 0, lastCred = api.credits;
      let score = 0, lives = 3, stage = 0, loop = 0, nextExtend = 100000, letters = 0, killN = 0;
      let P = null, ens = [], balls = [], items = [], shots = [], fx = [], plats = [], ghost = null, boss = null, letterB = null;
      let phase = 'intro', phaseT = 0, stageT = 0, hurry = false, musT = 0, musI = 0, pendingSpawns = [];

      const city = () => CITIES[Math.floor(stage / 5) % 5];
      const isBoss = () => stage % 5 === 4;
      const diff = () => stage + loop * 25;
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function addScore(n, x, y, show) {
        score += n; if (score > hi) hi = score;
        if (show) fx.push({ k: 'txt', s: String(n), x, y, t: 50, c: '#fff' });
        while (score >= nextExtend) { nextExtend += 200000; lives++; sfx.oneup(); fx.push({ k: 'txt', s: '1UP', x: P ? P.x : W / 2, y: P ? P.y - 30 : 100, t: 80, c: '#40ff40' }); }
      }
      // ---------- physics ----------
      function platAt(x, y) { for (const p of plats) if (x >= p.x0 - 2 && x <= p.x1 + 2 && p.y === y) return p; return null; }
      function fall(b) {
        if (b.onG) { if (platAt(b.x, b.y)) return false; b.onG = false; b.vy = 0; }
        const py = b.y; b.vy = Math.min(5, b.vy + GRAV); b.y += b.vy;
        if (b.vy > 0) for (const p of plats) {
          if (b.x < p.x0 - 2 || b.x > p.x1 + 2) continue;
          if (b.drop && p.y === b.drop) continue;
          if (py <= p.y && b.y >= p.y) { b.y = p.y; b.vy = 0; b.onG = true; b.drop = 0; return true; }
        }
        if (b.y > GROUND) { b.y = GROUND; b.vy = 0; b.onG = true; b.drop = 0; return true; }
        return false;
      }
      // ---------- setup ----------
      function newGame() { score = 0; lives = 3; stage = 0; loop = 0; nextExtend = 100000; letters = 0; killN = 0; mode = 'game'; startStage(); }
      function mkPlayer() { return { x: 40, y: GROUND, vx: 0, vy: 0, onG: true, drop: 0, face: 1, pack: [], inv: 120, dead: false, dT: 0, anim: 0, suck: false, pressT: 99, was: false, throwT: 0 }; }
      function startStage() {
        const lay = isBoss() ? BOSS_LAYOUT : LAYOUTS[(stage - Math.floor(stage / 5)) % LAYOUTS.length];
        plats = [{ x0: 8, x1: 312, y: GROUND }];
        for (const [c0, c1, r] of lay) plats.push({ x0: c0 * 8, x1: (c1 + 1) * 8, y: r * 8 });
        P = mkPlayer(); ens = []; balls = []; items = []; shots = []; fx = []; ghost = null; boss = null; letterB = null;
        stageT = 0; hurry = false; phase = (stage % 5 === 0 && stage > 0) || (stage === 0) ? 'map' : 'intro'; phaseT = 0;
        pendingSpawns = [];
        const d = diff();
        if (isBoss()) {
          boss = { x: 240, y: 110, vx: -0.8 - loop * 0.2, vy: 0.6, hp: 10 + Math.floor(stage / 5) * 3 + loop * 6, max: 0, t: 0, flash: 0, fireT: 120, spawnT: 60, kind: Math.floor(stage / 5) % 5 };
          boss.max = boss.hp;
          for (let i = 0; i < 2; i++) pendingSpawns.push({ k: 'blob', delay: 60 + i * 50 });
        } else {
          const n = Math.min(10, 5 + Math.floor(d / 3));
          const pool = ['blob', 'blob', 'hopper'];
          if (d >= 2) pool.push('bat');
          if (d >= 4) pool.push('shooter');
          if (d >= 7) pool.push('brute');
          if (d >= 12) pool.push('shooter', 'brute', 'bat');
          for (let i = 0; i < n; i++) pendingSpawns.push({ k: pool[Math.floor(hash(stage * 31 + i * 7 + loop) * pool.length)], delay: 30 + i * 22 });
        }
      }
      function spawnEnemy(k, x, y) {
        const t = ETYPES[k], spot = plats[1 + Math.floor(Math.random() * (plats.length - 1))] || plats[0];
        if (x == null) { x = clamp(spot.x0 + 8 + Math.random() * (spot.x1 - spot.x0 - 16), 16, 304); y = 20; }
        if (Math.abs(x - P.x) < 30 && y > 100) x = x < 160 ? x + 60 : x - 60;
        const e = { k, x, y, vx: 0, vy: 0, onG: false, drop: 0, dir: Math.random() < 0.5 ? -1 : 1, spd: t.spd * (1 + Math.min(0.8, diff() * 0.04)), w: t.w, sp: 0, inBeam: false, t: 0, cool: 60 + Math.random() * 120, willDrop: Math.random() < 0.5, stop: 0, enter: 30 };
        if (k === 'bat') { e.vx = e.dir * 0.9; e.vy = 0.6; e.y = 40 + Math.random() * 60; }
        ens.push(e);
        fx.push({ k: 'puff', x, y: e.y - 6, t: 16 });
      }
      function killPlayer() {
        if (P.dead || P.inv > 0) return;
        P.dead = true; P.dT = 0; P.vy = -4; P.pack = []; sfx.die();
      }
      function spawnItem(x, y, tier) {
        items.push({ x, y: y - 6, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random(), onG: false, drop: 0, f: Math.min(FRUIT.length - 1, tier), t: 480 });
      }
      // ---------- player ----------
      function throwBall() {
        const n = P.pack.length;
        balls.push({ x: P.x + P.face * 10, y: P.y, vx: P.face * 3.4, vy: 0, onG: P.onG, drop: 0, n, types: P.pack.slice(), bnc: 0, kills: 0, rot: 0, r: 5 + Math.min(n, 6) * 1.5, life: 900 });
        P.pack = []; P.throwT = 14; sfx.throw();
      }
      function updPlayer() {
        P.anim++;
        if (P.dead) {
          P.dT++; P.vy += 0.2; P.y += P.vy;
          if (P.dT === 110) {
            lives--;
            if (lives > 0) { const keep = P; P = mkPlayer(); P.face = keep.face; ghost = null; stageT = Math.min(stageT, 30 * 60); hurry = false; }
            else {
              api.setHiScore(score);
              const over = () => { mode = 'over'; T = 0; sfx.over(); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; P = mkPlayer(); ghost = null; hurry = false; stageT = 0; }, over); else over();
            }
          }
          return;
        }
        if (P.inv > 0) P.inv--;
        if (P.throwT > 0) P.throwT--;
        const L = api.key('ArrowLeft'), Rr = api.key('ArrowRight'), D = api.key('ArrowDown'), sp = api.key('Space');
        if (api.pressed('Space')) P.pressT = 0;
        if (sp) P.pressT++;
        if (P.was && !sp && P.pressT < 12 && P.pack.length) throwBall();
        P.was = sp;
        P.suck = sp && P.throwT <= 0;
        const spd = P.suck ? 0.5 : 1.5;
        if (L) { P.x -= spd; if (!P.suck) P.face = -1; } else if (Rr) { P.x += spd; if (!P.suck) P.face = 1; }
        P.x = clamp(P.x, 14, 306);
        P.moving = L || Rr;
        if ((api.pressed('KeyX') || api.pressed('ArrowUp')) && P.onG) {
          if (D && P.y < GROUND && api.pressed('KeyX')) { P.drop = P.y; P.onG = false; P.vy = 0.5; }
          else { P.vy = -5; P.onG = false; sfx.jump(); }
        }
        fall(P);
        if (P.suck) {
          if (T % 6 === 0) sfx.suck();
          const nx = P.x + P.face * 8, cy = P.y - 8;
          for (const e of ens) {
            if (e.enter > 0) continue;
            const dx = (e.x - nx) * P.face, ey = e.y - 7;
            if (dx > -4 && dx < 68 && Math.abs(ey - cy) < 7 + dx * 0.18) {
              if (P.pack.length >= 6) { e.sp = Math.max(e.sp, 0.3); e.inBeam = true; continue; }
              e.inBeam = true;
              e.sp += 0.03 / e.w * (1 + (68 - dx) / 68);
              e.x -= P.face * 0.5; e.y += (cy + 7 - e.y) * 0.04;
              if (e.sp >= 1 || dx < 6) { e.gone = true; P.pack.push(e.k); sfx.grab(); fx.push({ k: 'puff', x: e.x, y: e.y - 6, t: 10 }); }
            }
          }
          for (const it of items) {
            const dx = (it.x - nx) * P.face;
            if (dx > -4 && dx < 72 && Math.abs(it.y - 4 - cy) < 10 + dx * 0.2) { it.x -= P.face * 2.2; it.y += (cy + 4 - it.y) * 0.15; it.onG = false; it.vy = 0; it.sucked = true; }
          }
          if (letterB) {
            const dx = (letterB.x - nx) * P.face;
            if (dx > -4 && dx < 72 && Math.abs(letterB.y - cy) < 12 + dx * 0.2) { letterB.x -= P.face * 2; letterB.y += (cy - letterB.y) * 0.12; }
          }
        }
        // collect
        for (const it of items) if (!it.got && Math.abs(it.x - P.x) < 11 && Math.abs(it.y - 4 - (P.y - 8)) < 12) {
          it.got = true; const v = FRUIT[it.f].v; addScore(v, it.x, it.y - 10, true); sfx.item();
        }
        if (letterB && Math.abs(letterB.x - P.x) < 12 && Math.abs(letterB.y - (P.y - 8)) < 14) {
          letters |= 1 << letterB.i; sfx.letter();
          fx.push({ k: 'txt', s: WORD[letterB.i], x: letterB.x, y: letterB.y - 10, t: 50, c: '#ffe040' });
          letterB = null;
          if (letters === 511) { letters = 0; lives++; addScore(50000, P.x, P.y - 30, true); sfx.oneup(); fx.push({ k: 'banner', s: 'TUMBLEPOP! 1UP', t: 150 }); }
        }
      }
      // ---------- enemies ----------
      function updEnemy(e) {
        e.t++;
        if (e.enter > 0) { e.enter--; if (e.k !== 'bat') fall(e); return; }
        if (e.sp > 0) {
          if (!e.inBeam) e.sp = Math.max(0, e.sp - 0.012);
          e.inBeam = false;
          if (e.sp > 0.15) { if (e.k !== 'bat') fall(e); return; }
        }
        const spd = e.spd * (hurry ? 1.6 : 1);
        if (e.k === 'bat') {
          e.x += e.vx * spd; e.y += e.vy * spd + Math.sin(e.t * 0.08) * 0.4;
          if (e.x < 16 || e.x > 304) { e.vx = -e.vx; e.x = clamp(e.x, 16, 304); }
          if (e.y < 36 || e.y > 228) { e.vy = -e.vy; e.y = clamp(e.y, 36, 228); }
          if (Math.random() < 0.004) e.vy = (P.y - 8 > e.y ? 1 : -1) * (0.4 + Math.random() * 0.5);
        } else {
          if (e.stop > 0) e.stop--;
          else if (e.onG) {
            if (Math.abs(e.y - P.y) < 4 && !P.dead && Math.random() < 0.01) e.dir = P.x > e.x ? 1 : -1;
            e.x += e.dir * spd;
            if (e.x < 14 || e.x > 306) { e.dir = -e.dir; e.x = clamp(e.x, 14, 306); }
            else if (e.y < GROUND && !platAt(e.x + e.dir * 5, e.y)) {
              if (!e.willDrop) e.dir = -e.dir;
            }
            if (e.k === 'hopper' && Math.random() < 0.012 + diff() * 0.0006) { e.vy = -5; e.onG = false; e.vx = e.dir * spd; }
            if (e.k === 'brute' && Math.random() < 0.004) { e.vy = -4.2; e.onG = false; e.vx = e.dir * spd * 1.3; }
            if (e.k === 'shooter' && --e.cool <= 0 && Math.abs(e.y - P.y) < 6 && !P.dead) {
              e.dir = P.x > e.x ? 1 : -1; e.stop = 24; e.cool = Math.max(60, 170 - diff() * 6) + Math.random() * 60;
              shots.push({ x: e.x + e.dir * 8, y: e.y - 8, vx: e.dir * 2.2, vy: 0, t: 200 }); sfx.shot();
            }
          } else if (e.vx) { e.x = clamp(e.x + e.vx, 14, 306); }
          const was = e.onG;
          if (fall(e) && !was) { e.willDrop = Math.random() < 0.45; e.vx = 0; }
        }
        if (!P.dead && P.inv <= 0 && e.sp < 0.15 && Math.abs(e.x - P.x) < 10 && Math.abs((e.y - 7) - (P.y - 8)) < 12) killPlayer();
      }
      function updBoss() {
        const b = boss; b.t++;
        if (b.flash > 0) b.flash--;
        if (b.dying) { b.dying++; if (b.dying % 6 === 0) { fx.push({ k: 'boom', x: b.x + (Math.random() - 0.5) * 40, y: b.y + (Math.random() - 0.5) * 40, t: 20 }); sfx.smash(); } if (b.dying > 120) { boss = null; stageClear(); } return; }
        const sp = 1 + (b.max - b.hp) / b.max * 0.8;
        b.x += b.vx * sp; b.y += b.vy * sp;
        if (b.x < 40 || b.x > 280) { b.vx = -b.vx; b.x = clamp(b.x, 40, 280); }
        if (b.y < 60 || b.y > 212) { b.vy = -b.vy; b.y = clamp(b.y, 60, 212); }
        if (--b.fireT <= 0) {
          b.fireT = Math.max(50, 130 - loop * 20 - (b.max - b.hp) * 4);
          const ang = Math.atan2(P.y - 8 - b.y, P.x - b.x);
          const nshots = b.kind >= 2 ? 3 : 1;
          for (let i = 0; i < nshots; i++) { const a = ang + (i - (nshots - 1) / 2) * 0.3; shots.push({ x: b.x, y: b.y, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8, t: 300, big: 1 }); }
          sfx.shot();
        }
        if (--b.spawnT <= 0) {
          b.spawnT = 200;
          if (ens.length < 4) spawnEnemy(Math.random() < 0.7 ? 'blob' : 'hopper', clamp(b.x, 30, 290), b.y);
        }
        if (!P.dead && P.inv <= 0 && Math.abs(b.x - P.x) < 22 && Math.abs(b.y - (P.y - 8)) < 24) killPlayer();
      }
      // ---------- balls ----------
      function smashBall(b) {
        b.dead = true; sfx.smash();
        for (let i = 0; i < 10; i++) fx.push({ k: 'star', x: b.x, y: b.y - b.r, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4, t: 30 + Math.random() * 20 });
        for (let i = 0; i < b.n; i++) spawnItem(b.x, b.y, Math.min(5, Math.floor(b.n / 2) + (i === 0 ? b.kills : 0) / 2 | 0));
      }
      function updBalls() {
        for (const b of balls) {
          if (b.dead) continue;
          b.life--; b.rot += b.vx * 0.15;
          b.x += b.vx;
          if (b.x < 8 + b.r || b.x > 312 - b.r) { b.vx = -b.vx; b.x = clamp(b.x, 8 + b.r, 312 - b.r); b.bnc++; sfx.bounce(); if (b.bnc >= 3) { smashBall(b); continue; } }
          const was = b.onG;
          if (fall(b) && !was) sfx.bounce();
          if (b.life <= 0) { smashBall(b); continue; }
          for (const e of ens) {
            if (e.gone || e.enter > 0) continue;
            if (Math.abs(e.x - b.x) < b.r + 7 && Math.abs((e.y - 7) - (b.y - b.r)) < b.r + 8) {
              e.gone = true; b.kills++; killN++;
              const pts = 100 * Math.pow(2, Math.min(6, b.kills - 1 + Math.floor(b.n / 2)));
              addScore(pts, e.x, e.y - 16, true); sfx.hit(b.kills + b.n);
              spawnItem(e.x, e.y, Math.min(5, b.kills - 1));
              fx.push({ k: 'puff', x: e.x, y: e.y - 6, t: 14 });
              if (killN % 4 === 0 && !letterB && letters !== 511) {
                let i = 0; while (letters & (1 << i)) i++;
                letterB = { i, x: e.x, y: e.y - 20, vx: (Math.random() < 0.5 ? -1 : 1) * 0.8, vy: -0.7, t: 720 };
              }
            }
          }
          if (boss && !boss.dying && Math.abs(boss.x - b.x) < 22 + b.r && Math.abs(boss.y - (b.y - b.r)) < 22 + b.r) {
            boss.hp -= Math.max(1, b.n); boss.flash = 16; sfx.bossHit(); addScore(500 * b.n, boss.x, boss.y - 30, true);
            smashBall(b);
            if (boss.hp <= 0) { boss.dying = 1; sfx.boom(); addScore(20000 * (Math.floor(stage / 5) + 1), boss.x, boss.y, true); ens.forEach(e => { e.gone = true; spawnItem(e.x, e.y, 4); }); shots = []; }
          }
        }
        balls = balls.filter(b => !b.dead);
      }
      function stageClear() {
        if (phase !== 'play') return;
        phase = 'clear'; phaseT = 0; sfx.clear();
        const sec = Math.floor(stageT / 60);
        const bonus = Math.max(0, 40 - sec) * 500;
        if (bonus) { addScore(bonus); fx.push({ k: 'banner', s: 'TIME BONUS ' + bonus, t: 170 }); }
        ghost = null; shots = [];
      }
      function music() {
        if (--musT > 0) return;
        musT = hurry ? 7 : 10;
        const mel = [659, 0, 784, 659, 523, 0, 587, 659, 698, 0, 659, 587, 523, 0, 392, 0, 440, 523, 659, 0, 587, 523, 494, 0, 523, 0, 659, 784, 1047, 0, 0, 0];
        const bass = [131, 196, 165, 196, 175, 220, 196, 247];
        const m = mel[musI % 32];
        if (m) A.tone(m, 0.09, { type: 'square', vol: 0.03 });
        if (musI % 2 === 0) A.tone(bass[(musI >> 2) % 8], 0.12, { type: 'triangle', vol: 0.08 });
        musI++;
      }
      // ---------- main update ----------
      function updGame() {
        T++;
        for (const f of fx) { f.t--; if (f.k === 'star') { f.x += f.vx; f.y += f.vy; f.vy += 0.15; } if (f.k === 'txt') f.y -= 0.4; }
        fx = fx.filter(f => f.t > 0);
        if (phase === 'map') { phaseT++; if (phaseT > 170 || (phaseT > 40 && api.anyPressed('Enter', 'Space'))) { phase = 'intro'; phaseT = 0; } return; }
        if (phase === 'intro') { phaseT++; if (phaseT > 90) phase = 'play'; return; }
        if (phase === 'clear') {
          phaseT++;
          updPlayerLite();
          updItems();
          if (phaseT > 200) {
            stage++;
            if (stage >= 25) { phase = 'ending'; phaseT = 0; return; }
            startStage();
          }
          return;
        }
        if (phase === 'ending') { phaseT++; if (phaseT > 600 || (phaseT > 200 && api.anyPressed('Enter'))) { loop++; stage = 0; startStage(); } return; }
        // play
        stageT++;
        music();
        for (const s of pendingSpawns) if (--s.delay === 0) spawnEnemy(s.k);
        pendingSpawns = pendingSpawns.filter(s => s.delay > 0);
        if (!isBoss()) {
          if (stageT === 45 * 60) { hurry = true; sfx.hurry(); fx.push({ k: 'banner', s: 'HURRY UP!', t: 120 }); }
          if (stageT === 60 * 60 && !ghost) ghost = { x: P.x < 160 ? 300 : 20, y: 30, t: 0 };
        }
        updPlayer();
        for (const e of ens) updEnemy(e);
        ens = ens.filter(e => !e.gone);
        if (boss) updBoss();
        updBalls();
        updItems();
        for (const s of shots) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (s.x < 8 || s.x > 312 || s.y < 16 || s.y > H) s.t = 0;
          if (!P.dead && P.inv <= 0 && Math.abs(s.x - P.x) < 6 + (s.big ? 2 : 0) && Math.abs(s.y - (P.y - 8)) < 9) { s.t = 0; killPlayer(); }
        }
        shots = shots.filter(s => s.t > 0);
        if (letterB) {
          letterB.t--; letterB.x += letterB.vx; letterB.y += letterB.vy;
          if (letterB.x < 16 || letterB.x > 304) letterB.vx = -letterB.vx;
          if (letterB.y < 30 || letterB.y > 224) letterB.vy = -letterB.vy;
          if (letterB.t <= 0) letterB = null;
        }
        if (ghost) {
          ghost.t++;
          const gs = 0.55 + Math.min(1, ghost.t / 1200);
          const a = Math.atan2(P.y - 10 - ghost.y, P.x - ghost.x);
          ghost.x += Math.cos(a) * gs; ghost.y += Math.sin(a) * gs;
          if (!P.dead && P.inv <= 0 && Math.hypot(ghost.x - P.x, ghost.y - (P.y - 10)) < 12) killPlayer();
        }
        if (!isBoss() && !pendingSpawns.length && !ens.length && !P.dead) stageClear();
      }
      function updPlayerLite() {
        // during stage clear the player can still walk around to collect fruit
        if (P.dead) return;
        const L = api.key('ArrowLeft'), Rr = api.key('ArrowRight');
        if (L) { P.x -= 1.5; P.face = -1; } else if (Rr) { P.x += 1.5; P.face = 1; }
        P.x = clamp(P.x, 14, 306); P.moving = L || Rr; P.anim++; P.suck = false;
        if ((api.pressed('KeyX') || api.pressed('ArrowUp')) && P.onG) { P.vy = -5; P.onG = false; }
        fall(P);
        for (const it of items) if (!it.got && Math.abs(it.x - P.x) < 11 && Math.abs(it.y - 4 - (P.y - 8)) < 12) { it.got = true; addScore(FRUIT[it.f].v, it.x, it.y - 10, true); sfx.item(); }
      }
      function updItems() {
        for (const it of items) {
          it.t--;
          if (it.sucked) { it.sucked = false; continue; }
          if (!it.onG) { it.x = clamp(it.x + it.vx, 12, 308); }
          fall(it);
          if (it.onG) it.vx = 0;
        }
        items = items.filter(it => !it.got && it.t > 0);
      }
      function update() {
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          T++; atT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCred = api.credits; newGame(); A.melody([[523, 0.06], [784, 0.06], [1047, 0.12]], { type: 'square', vol: 0.12 }); }
            else { coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        if (mode === 'over') { T++; if (T > 300 || (T > 90 && api.anyPressed('Enter'))) { mode = 'attract'; atT = 0; } return; }
        updGame();
      }
      // ---------- drawing ----------
      function drawBg(ctx, c) {
        const g = ctx.createLinearGradient(0, 16, 0, H);
        g.addColorStop(0, c.sky[0]); g.addColorStop(1, c.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 16, W, H - 16);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 40; i++) if ((i + (T >> 5)) % 7) ctx.fillRect(Math.floor(hash(i) * W), 18 + Math.floor(hash(i + 50) * 100), 1, 1);
        const sil = 'rgba(0,0,0,0.35)';
        ctx.fillStyle = sil;
        if (c.lm === 'tower') {
          ctx.fillRect(150, 70, 20, 162); ctx.fillRect(142, 110, 36, 6); ctx.fillRect(146, 150, 28, 5); ctx.fillRect(158, 40, 4, 30);
          for (let i = 0; i < 6; i++) ctx.fillRect(10 + i * 50, 170 - (i % 3) * 20, 34, 70);
        } else if (c.lm === 'eiffel') {
          for (let y = 40; y < 232; y += 2) { const w = 4 + Math.pow((y - 40) / 192, 2) * 90; ctx.fillRect(160 - w / 2, y, w, 2); }
          ctx.fillStyle = c.sky[1]; ctx.beginPath(); ctx.arc(160, 232, 28, Math.PI, 0); ctx.fill();
        } else if (c.lm === 'pyramid') {
          ctx.beginPath(); ctx.moveTo(40, 232); ctx.lineTo(130, 110); ctx.lineTo(220, 232); ctx.fill();
          ctx.beginPath(); ctx.moveTo(170, 232); ctx.lineTo(240, 140); ctx.lineTo(310, 232); ctx.fill();
          ctx.fillStyle = 'rgba(255,240,180,0.6)'; ctx.beginPath(); ctx.arc(270, 60, 16, 0, 7); ctx.fill();
        } else if (c.lm === 'city') {
          for (let i = 0; i < 12; i++) {
            const h = 60 + hash(i * 3) * 110, x = i * 28;
            ctx.fillStyle = sil; ctx.fillRect(x, 232 - h, 24, h);
            ctx.fillStyle = 'rgba(255,230,120,0.35)';
            for (let y = 240 - h; y < 226; y += 8) for (let k = 0; k < 3; k++) if (hash(i * 31 + y + k) < 0.4) ctx.fillRect(x + 3 + k * 7, y, 3, 4);
          }
        } else {
          ctx.fillStyle = '#3060c0'; ctx.beginPath(); ctx.arc(250, 60, 22, 0, 7); ctx.fill();
          ctx.fillStyle = '#40a040'; ctx.fillRect(240, 52, 10, 8); ctx.fillRect(254, 64, 8, 6);
          ctx.fillStyle = 'rgba(160,160,180,0.25)';
          for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(hash(i + 3) * W, 200 + hash(i + 9) * 30, 20, 6, 0, 0, 7); ctx.fill(); }
        }
      }
      function drawPlats(ctx, c) {
        for (const p of plats) {
          const h = p.y === GROUND ? 8 : 8;
          for (let x = p.x0; x < p.x1; x += 8) {
            R(ctx, c.plat, x, p.y, 8, h); R(ctx, c.hi, x, p.y, 8, 2); R(ctx, c.lo, x, p.y + h - 2, 8, 2);
            R(ctx, c.lo, x + 7, p.y + 2, 1, h - 4); R(ctx, c.hi, x + 2, p.y + 3, 2, 2);
          }
        }
        for (let y = 16; y < H; y += 8) { R(ctx, c.lo, 0, y, 8, 8); R(ctx, c.plat, 1, y + 1, 6, 6); R(ctx, c.lo, 312, y, 8, 8); R(ctx, c.plat, 313, y + 1, 6, 6); }
      }
      function drawKid(ctx, x, y, f, fr, suck, packN) {
        x = Math.round(x); y = Math.round(y);
        const X = (dx, w) => f > 0 ? x + dx : x - dx - w;
        const step = (fr >> 3) & 1;
        // vacuum tank
        R(ctx, '#505868', X(-9, 6), y - 15, 6, 10); R(ctx, '#a8b0c0', X(-8, 2), y - 14, 2, 8); R(ctx, '#ffd030', X(-9, 6), y - 11, 6, 1);
        // legs
        R(ctx, '#283890', X(-3, 3), y - 5, 3, 4 - step); R(ctx, '#283890', X(1, 3), y - 5, 3, 3 + step);
        R(ctx, '#802010', X(-4, 4), y - 2 + (step ? -1 : 0), 4, 2); R(ctx, '#802010', X(1, 4), y - 2, 4, 2);
        // body
        R(ctx, '#f0e020', X(-4, 8), y - 11, 8, 6); R(ctx, '#3048c0', X(-3, 6), y - 9, 6, 4);
        // head
        R(ctx, '#f8c090', X(-3, 7), y - 17, 7, 6); R(ctx, '#000', X(2, 1), y - 15, 1, 2);
        R(ctx, '#e02828', X(-4, 8), y - 19, 8, 3); R(ctx, '#e02828', X(3, 4), y - 17, 4, 1);
        // hose & nozzle
        R(ctx, '#707888', X(-3, 2), y - 9, 2, 1); R(ctx, '#90a0b0', X(3, 6), y - 9, 6, 2);
        R(ctx, suck && (fr & 2) ? '#80ffff' : '#d0e0f0', X(9, 2), y - 10, 2, 4);
        // arm
        R(ctx, '#f8c090', X(2, 3), y - 8, 3, 2);
        // stacked captures above pack
        for (let i = 0; i < packN; i++) { R(ctx, '#fff', X(-9, 6), y - 22 - i * 5, 6, 4); R(ctx, ['#40c040', '#ff8020', '#a050e0', '#3080ff', '#e03030'][i % 5], X(-8, 4), y - 21 - i * 5, 4, 2); }
      }
      function drawEnemy(ctx, e) {
        const t = ETYPES[e.k];
        let x = Math.round(e.x), y = Math.round(e.y);
        if (e.sp > 0.15) x += ((T >> 1) & 1) ? 1 : -1;
        if (e.enter > 0 && (e.enter & 2)) return;
        const col = e.sp > 0.15 ? ((T >> 2) & 1 ? '#ffffff' : t.col) : (hurry ? ((T >> 3) & 1 ? '#ff4040' : t.col) : t.col);
        const fr = (e.t >> 3) & 1, f = e.dir || 1;
        if (e.k === 'bat') {
          R(ctx, col, x - 5, y - 12, 10, 8);
          const wy = fr ? -16 : -8;
          R(ctx, t.dk, x - 13, y + wy + 2, 8, 3); R(ctx, t.dk, x + 5, y + wy + 2, 8, 3);
          R(ctx, t.dk, x - 9, y - 10, 4, 3); R(ctx, t.dk, x + 5, y - 10, 4, 3);
          R(ctx, '#fff', x - 4, y - 10, 3, 3); R(ctx, '#fff', x + 1, y - 10, 3, 3); R(ctx, '#000', x - 3, y - 9, 1, 1); R(ctx, '#000', x + 2, y - 9, 1, 1);
          R(ctx, '#fff', x - 2, y - 6, 1, 2); R(ctx, '#fff', x + 1, y - 6, 1, 2);
          return;
        }
        const big = e.k === 'brute' ? 1 : 0, w = 12 + big * 4, h = 12 + big * 4;
        R(ctx, t.dk, x - w / 2, y - h, w, h);
        R(ctx, col, x - w / 2 + 1, y - h - 1, w - 2, h);
        R(ctx, col, x - w / 2 - 1 + 1, y - h + 2, w, h - 4);
        // feet
        R(ctx, t.dk, x - w / 2 + (fr ? 0 : 2), y - 2, 4, 2); R(ctx, t.dk, x + w / 2 - 4 - (fr ? 0 : 2), y - 2, 4, 2);
        // eyes
        const ex = x + f * 2;
        R(ctx, '#fff', ex - 4, y - h + 2, 4, 4); R(ctx, '#fff', ex + 1, y - h + 2, 4, 4);
        R(ctx, '#000', ex - 3 + (f > 0 ? 1 : 0), y - h + 3, 2, 2); R(ctx, '#000', ex + 2 + (f > 0 ? 1 : 0), y - h + 3, 2, 2);
        if (e.k === 'hopper') { R(ctx, t.dk, x - 1, y - h - 5, 2, 4); R(ctx, '#ffe040', x - 2, y - h - 7, 4, 3); }
        if (e.k === 'shooter') { R(ctx, '#202020', x + f * 5 - (f < 0 ? 5 : 0), y - 7, 5, 3); R(ctx, '#ffe040', x - 6, y - h - 3, 12, 2); }
        if (e.k === 'brute') { R(ctx, '#fff', x - 6, y - 5, 2, 3); R(ctx, '#fff', x + 4, y - 5, 2, 3); R(ctx, t.dk, x - 9, y - h - 3, 3, 4); R(ctx, t.dk, x + 6, y - h - 3, 3, 4); }
        else R(ctx, '#000', ex - 2, y - h + 8, 5, 1);
        if (e.sp > 0.15) { R(ctx, '#ffe040', x - 2, y - h - 6, 4, 2); }
      }
      function drawBoss(ctx, b) {
        if (b.dying && (b.dying & 4)) return;
        const x = Math.round(b.x), y = Math.round(b.y), fl = b.flash && (b.flash & 2);
        const cols = [['#e04888', '#801848'], ['#4080ff', '#183078'], ['#e0a020', '#805000'], ['#40c040', '#106010'], ['#c0c0d0', '#606070']][b.kind];
        const c = fl ? '#ffffff' : cols[0], d = fl ? '#ffffff' : cols[1];
        ctx.fillStyle = d; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x - 1, y - 1, 20, 0, 7); ctx.fill();
        // horns / crown
        R(ctx, d, x - 18, y - 26, 6, 10); R(ctx, d, x + 12, y - 26, 6, 10); R(ctx, '#ffe040', x - 8, y - 26, 16, 5);
        R(ctx, '#ffe040', x - 8, y - 30, 3, 4); R(ctx, '#ffe040', x - 2, y - 32, 4, 6); R(ctx, '#ffe040', x + 5, y - 30, 3, 4);
        const look = Math.sign(P.x - b.x);
        R(ctx, '#fff', x - 12, y - 10, 9, 9); R(ctx, '#fff', x + 3, y - 10, 9, 9);
        R(ctx, '#000', x - 9 + look * 2, y - 7, 4, 5); R(ctx, '#000', x + 6 + look * 2, y - 7, 4, 5);
        R(ctx, '#300', x - 10, y + 5, 20, 7); R(ctx, '#fff', x - 8, y + 5, 3, 3); R(ctx, '#fff', x + 5, y + 5, 3, 3);
        R(ctx, '#e02020', x - 5, y + 9, 10, 3);
        // hp bar
        R(ctx, '#000', 100, 20, 120, 6); R(ctx, '#ff3030', 101, 21, Math.max(0, 118 * b.hp / b.max), 4);
      }
      function drawFruit(ctx, x, y, f) {
        const F = FRUIT[f]; x = Math.round(x); y = Math.round(y);
        if (f === 4) { R(ctx, F.c, x - 4, y - 8, 8, 6); R(ctx, F.s, x - 2, y - 7, 2, 2); R(ctx, F.c, x - 2, y - 10, 4, 2); R(ctx, F.c, x - 2, y - 2, 4, 2); return; }
        if (f === 5) { R(ctx, F.c, x - 5, y - 9, 10, 8); R(ctx, F.s, x - 3, y - 7, 6, 4); R(ctx, F.c, x - 1, y - 6, 2, 2); return; }
        R(ctx, F.c, x - 4, y - 7, 8, 7); R(ctx, F.c, x - 3, y - 8, 6, 9);
        R(ctx, '#fff', x - 2, y - 6, 2, 2); R(ctx, F.s, x, y - 11, 2, 3); R(ctx, F.s, x + 1, y - 11, 3, 1);
      }
      function drawBall(ctx, b) {
        const x = Math.round(b.x), y = Math.round(b.y - b.r), r = b.r;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        const cols = ['#40c040', '#ff8020', '#a050e0', '#3080ff', '#e03030'];
        for (let i = 0; i < Math.min(6, b.n + 2); i++) {
          const a = b.rot + i * 2.1;
          R(ctx, cols[i % 5], x + Math.cos(a) * r * 0.55 - 2, y + Math.sin(a) * r * 0.55 - 2, 4, 4);
        }
        ctx.strokeStyle = '#80c0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
      }
      function drawHud(ctx) {
        R(ctx, '#000', 0, 0, W, 16);
        text(ctx, '1UP', 8, 1, '#ff4040'); text(ctx, String(score).padStart(7, ' '), 8, 8, '#fff');
        text(ctx, 'HI', 130, 1, '#ff4040'); text(ctx, String(hi), 130, 8, '#fff');
        for (let i = 0; i < WORD.length; i++) text(ctx, WORD[i], 212 + i * 6, 1, letters & (1 << i) ? '#ffe040' : '#404050');
        for (let i = 0; i < Math.min(5, lives - 1); i++) { R(ctx, '#e02828', 212 + i * 9, 9, 6, 3); R(ctx, '#f8c090', 213 + i * 9, 12, 4, 3); }
        text(ctx, (Math.floor(stage / 5) + 1) + '-' + (stage % 5 + 1), W - 4, 9, '#80c0ff', 1, 'right');
      }
      function renderGame(ctx) {
        const c = city();
        if (phase === 'map') { renderMap(ctx); drawHud(ctx); return; }
        if (phase === 'ending') {
          R(ctx, '#000', 0, 0, W, H);
          textS(ctx, 'CONGRATULATIONS!', W / 2, 60, '#ffe040', 2, 'center');
          text(ctx, 'THE MONSTERS HAVE BEEN', W / 2, 100, '#fff', 1, 'center');
          text(ctx, 'VACUUMED FROM THE WORLD.', W / 2, 112, '#fff', 1, 'center');
          text(ctx, 'BUT THEY ARE COMING BACK...', W / 2, 140, '#ff8080', 1, 'center');
          drawKid(ctx, W / 2, 190, 1, T, false, 3);
          drawHud(ctx); return;
        }
        drawBg(ctx, c); drawPlats(ctx, c);
        for (const it of items) if (it.t > 90 || (it.t & 4)) drawFruit(ctx, it.x, it.y, it.f);
        for (const e of ens) drawEnemy(ctx, e);
        if (boss) drawBoss(ctx, boss);
        for (const b of balls) drawBall(ctx, b);
        // vacuum beam
        if (P.suck && !P.dead) {
          const nx = P.x + P.face * 11, cy = P.y - 8;
          for (let i = 0; i < 7; i++) {
            const d = ((T * 3 + i * 10) % 64), ww = 3 + d * 0.18;
            ctx.fillStyle = i % 2 ? 'rgba(160,255,255,0.55)' : 'rgba(255,255,255,0.45)';
            ctx.fillRect(Math.round(nx + P.face * (64 - d) - 1), Math.round(cy - ww), 2, Math.round(ww * 2));
          }
        }
        if (!P.dead) { if (!(P.inv > 0 && (P.inv & 4))) drawKid(ctx, P.x, P.y, P.face, P.moving ? P.anim : 0, P.suck, P.pack.length); }
        else { ctx.save(); ctx.translate(Math.round(P.x), Math.round(P.y - 8)); ctx.rotate(P.dT * 0.3); drawKid(ctx, 0, 8, P.face, 0, false, 0); ctx.restore(); }
        for (const s of shots) { R(ctx, s.big ? '#ff60ff' : '#ffe040', s.x - 3, s.y - 3, 6, 6); R(ctx, '#fff', s.x - 1, s.y - 1, 2, 2); }
        if (letterB) {
          const lx = Math.round(letterB.x), ly = Math.round(letterB.y);
          if (letterB.t > 120 || (letterB.t & 4)) {
            ctx.fillStyle = 'rgba(120,200,255,0.6)'; ctx.beginPath(); ctx.arc(lx, ly, 9, 0, 7); ctx.fill();
            R(ctx, '#fff', lx - 5, ly - 6, 2, 2);
            text(ctx, WORD[letterB.i], lx - 2, ly - 3, '#ffe040');
          }
        }
        if (ghost) {
          const gx = Math.round(ghost.x), gy = Math.round(ghost.y), wob = (T >> 3) & 1;
          ctx.fillStyle = (T >> 2) & 1 ? '#ffffff' : '#c0e0ff';
          ctx.beginPath(); ctx.arc(gx, gy - 2, 9, Math.PI, 0); ctx.fill(); ctx.fillRect(gx - 9, gy - 2, 18, 9);
          for (let i = 0; i < 4; i++) R(ctx, '#000', gx - 9 + i * 5 + wob * 2, gy + 6, 2, 2);
          R(ctx, '#000', gx - 5, gy - 5, 3, 4); R(ctx, '#000', gx + 2, gy - 5, 3, 4); R(ctx, '#e02020', gx - 3, gy + 1, 6, 2);
        }
        for (const f of fx) {
          if (f.k === 'puff') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; const r = (16 - f.t) * 0.8 + 2; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill(); }
          else if (f.k === 'star') R(ctx, (f.t & 2) ? '#ffe040' : '#fff', f.x - 1, f.y - 1, 3, 3);
          else if (f.k === 'boom') { ctx.fillStyle = (f.t & 2) ? '#ffe040' : '#ff6020'; ctx.beginPath(); ctx.arc(f.x, f.y, 4 + (20 - f.t), 0, 7); ctx.fill(); }
          else if (f.k === 'txt') textS(ctx, f.s, f.x, f.y, f.c, 1, 'center');
          else if (f.k === 'banner') textS(ctx, f.s, W / 2, 96, (T >> 3) & 1 ? '#ffe040' : '#ff60b0', 2, 'center');
        }
        if (phase === 'intro') {
          textS(ctx, c.name, W / 2, 90, '#fff', 2, 'center');
          textS(ctx, isBoss() ? 'BOSS STAGE' : 'STAGE ' + (stage % 5 + 1), W / 2, 116, '#ffe040', 2, 'center');
          if (phaseT > 50) textS(ctx, 'READY!', W / 2, 140, '#40ff40', 1, 'center');
        }
        if (phase === 'clear' && phaseT < 160) textS(ctx, isBoss() ? 'BOSS DEFEATED!' : 'STAGE CLEAR!', W / 2, 70, '#40ffff', 2, 'center');
        drawHud(ctx);
      }
      function renderMap(ctx) {
        R(ctx, '#082048', 0, 0, W, H);
        ctx.fillStyle = '#208040';
        const land = [[30, 60, 60, 40], [70, 90, 40, 50], [140, 50, 70, 50], [150, 110, 40, 60], [220, 60, 70, 45], [250, 140, 40, 30]];
        for (const [x, y, w, h] of land) { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); ctx.fill(); }
        const pts = [[250, 80], [160, 70], [170, 130], [90, 80], [280, 30]];
        const ci = Math.floor(stage / 5) % 5;
        ctx.strokeStyle = '#ffe040'; ctx.setLineDash && ctx.setLineDash([3, 3]); ctx.beginPath();
        for (let i = 0; i <= ci; i++) { const [x, y] = pts[i]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        ctx.setLineDash && ctx.setLineDash([]);
        for (let i = 0; i < 5; i++) {
          const [x, y] = pts[i];
          R(ctx, i < ci ? '#808080' : i === ci ? ((T >> 3) & 1 ? '#ff4040' : '#ffe040') : '#ffffff', x - 3, y - 3, 6, 6);
          text(ctx, CITIES[i].name, x, y + 6, i === ci ? '#ffe040' : '#c0c0c0', 1, 'center');
        }
        textS(ctx, 'NEXT: ' + CITIES[ci].name, W / 2, 190, '#fff', 2, 'center');
        if (loop) text(ctx, 'ROUND ' + (loop + 1), W / 2, 214, '#ff8080', 1, 'center');
      }
      function renderAttract(ctx) {
        const page = Math.floor(atT / 540) % 3, t = atT % 540;
        R(ctx, '#200a40', 0, 0, W, H);
        for (let i = 0; i < 50; i++) R(ctx, '#ffffff', hash(i) * W, (hash(i + 7) * H + atT * (0.2 + hash(i) * 0.5)) % H, 1, 1);
        if (page === 0) {
          const cols = ['#ff4080', '#ffa020', '#ffe040', '#40e040', '#40c0ff', '#8060ff', '#ff60ff', '#ff4080', '#ffa020'];
          for (let i = 0; i < WORD.length; i++) {
            const by = Math.round(40 + Math.abs(Math.sin(atT * 0.06 + i * 0.6)) * -12);
            textS(ctx, WORD[i], 46 + i * 28, by, cols[i], 4);
          }
          R(ctx, '#e04888', 40, 176, 240, 8); R(ctx, '#ffa0c8', 40, 176, 240, 2);
          const ph = Math.floor(t / 90) % 4;
          const kx = 90 + (ph === 3 ? (t % 90) : 0);
          drawKid(ctx, kx, 176, 1, t, ph === 1, ph >= 2 ? 2 : 0);
          if (ph <= 1) { const ex = 150 - (ph === 1 ? (t % 90) * 0.5 : 0); drawEnemy(ctx, { k: 'blob', x: ex, y: 176, t, dir: -1, sp: ph === 1 ? 0.5 : 0, enter: 0 }); }
          if (ph === 1) for (let i = 0; i < 6; i++) { const d = ((t * 3 + i * 10) % 50); R(ctx, '#a0ffff', kx + 11 + 50 - d, 168 - (2 + d * 0.15), 2, Math.round(4 + d * 0.3)); }
          if (ph === 3) drawBall(ctx, { x: 120 + (t % 90) * 2.5, y: 176, r: 8, n: 2, rot: t * 0.3 });
          text(ctx, '\u00a9 1991 DATA EAST', W / 2, 222, '#c0c0c0', 1, 'center');
        } else if (page === 1) {
          textS(ctx, 'HOW TO PLAY', W / 2, 26, '#ffe040', 2, 'center');
          const lines = ['HOLD SPACE TO VACUUM MONSTERS', 'INTO YOUR PACK (UP TO 6).', '', 'TAP SPACE TO THROW THEM AS A', 'ROLLING BALL - IT BOWLS OVER', 'EVERY MONSTER IN ITS PATH!', '', 'BIGGER BALLS AND CHAINS SCORE MORE.', 'COLLECT T-U-M-B-L-E-P-O-P', 'FOR AN EXTRA LIFE.', '', 'X OR UP: JUMP   DOWN+X: DROP'];
          lines.forEach((l, i) => { if (t > i * 10) text(ctx, l, W / 2, 56 + i * 11, i < 6 ? '#fff' : '#80c0ff', 1, 'center'); });
        } else {
          textS(ctx, 'BEST PLAYERS', W / 2, 30, '#ffe040', 2, 'center');
          const rows = [['DEC', Math.max(hi, 100000)], ['TUM', 80000], ['POP', 60000], ['GHO', 40000], ['VAC', 20000]].sort((a, b) => b[1] - a[1]);
          rows.forEach((r, i) => { text(ctx, (i + 1) + '.', 90, 70 + i * 18, '#40a0ff'); text(ctx, r[0], 116, 70 + i * 18, '#fff'); text(ctx, String(r[1]), 230, 70 + i * 18, '#fff', 1, 'right'); });
          for (let i = 0; i < 5; i++) drawFruit(ctx, 110 + i * 24, 190, i);
        }
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 200, '#fff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) textS(ctx, 'PUSH START', W / 2, 200, '#ffe040', 1, 'center'); }
        else if (blink) textS(ctx, 'INSERT COIN', W / 2, 200, '#fff', 1, 'center');
        text(ctx, credStr(), W - 4, H - 9, '#aaa', 1, 'right');
        text(ctx, 'HI ' + hi, 4, H - 9, '#aaa');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { renderAttract(ctx); return; }
        renderGame(ctx);
        if (mode === 'over') { R(ctx, 'rgba(0,0,0,0.5)', 0, 90, W, 50); textS(ctx, 'GAME OVER', W / 2, 106, '#ff4040', 3, 'center'); }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
