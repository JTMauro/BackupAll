// Halley's Comet (Taito, 1986) \u2014 from-scratch recreation: vertical shooter defending the planets from comet fragments.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 10, 31, 10], '$': [4, 15, 20, 14, 5, 30, 4]
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
  // text with a 1px dark drop shadow
  function stext(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function flipH(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');

  // ======================= HALLEY'S COMET =======================
  const W = 224, H = 256, TOP = 16;
  const TAU = Math.PI * 2;
  const STAGES = [
    { name: 'PLUTO', col: '#a09080', ring: null },
    { name: 'NEPTUNE', col: '#3050d0', ring: null },
    { name: 'URANUS', col: '#60c0c8', ring: '#a0e0e0' },
    { name: 'SATURN', col: '#d0b070', ring: '#f0e0a0' },
    { name: 'JUPITER', col: '#c08050', ring: null },
    { name: 'MARS', col: '#c04020', ring: null },
    { name: 'EARTH', col: '#3070e0', ring: null }
  ];
  const SHIP = [
    '.......ww.......',
    '.......cc.......',
    '......wccw......',
    '......wbbw......',
    '.....wwbbww.....',
    '.....wbbbbw.....',
    '..r..wbwwbw..r..',
    '..w.wwbwwbww.w..',
    '..wwwbbbbbbwww..',
    '.wwbbbwwwwbbbww.',
    'wwbbbwwbbwwbbbww',
    'wbbww.wbbw.wwbbw',
    'ww....wrrw....ww',
    '.......yy.......',
    '.......y........'
  ];
  const ALIEN = {
    saucer: [[
      '.....gggg.....',
      '...gGcccGg....',
      '..gGcwwccGg...',
      'ggggggggggggg.',
      'gGrGGrGGrGGrg.',
      '.gggggggggggg.',
      '...g.....g....'
    ], [
      '.....gggg.....',
      '...gGcccGg....',
      '..gGcwwccGg...',
      'ggggggggggggg.',
      'gGGrGGrGGrGGg.',
      '.gggggggggggg.',
      '....g...g.....'
    ]],
    diver: [[
      '.p........p.',
      '.pp......pp.',
      '.ppp.yy.ppp.',
      '..ppPyyPpp..',
      '...pPPPPp...',
      '...PwPPwP...',
      '....PPPP....',
      '.....PP.....'
    ], [
      'p..........p',
      'pp........pp',
      '.ppp.yy.ppp.',
      '..ppPyyPpp..',
      '...pPPPPp...',
      '...PwPPwP...',
      '....PPPP....',
      '.....PP.....'
    ]],
    carrier: [[
      '...rrrrrrrr...',
      '..rRRRRRRRRr..',
      '.rRRwwRRwwRRr.',
      'rrrrrrrrrrrrrr',
      'rRyRRyRRyRRyRr',
      '.rrrrrrrrrrrr.'
    ]]
  };
  const APAL = { g: '#40c040', G: '#208020', c: '#80e0ff', w: '#fff', r: '#ff3030', R: '#a01010', p: '#c060ff', P: '#7030a0', y: '#ffe040' };
  const SHIP_IMG = spr(SHIP, { w: '#e0e0f0', b: '#3060ff', c: '#80e0ff', r: '#ff3030', y: '#ffe040' });
  const AL = {}; for (const k in ALIEN) AL[k] = ALIEN[k].map(f => spr(f, APAL));
  // procedural rock images (lumpy discs with craters)
  function makeRock(r, seed, hot) {
    const c = document.createElement('canvas'); const s = r * 2 + 2; c.width = s; c.height = s;
    const x = c.getContext('2d');
    let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const bumps = []; for (let i = 0; i < 9; i++) bumps.push(0.8 + rnd() * 0.25);
    const craters = []; for (let i = 0; i < Math.max(1, r / 4); i++) craters.push([rnd() * 2 - 1, rnd() * 2 - 1, 0.15 + rnd() * 0.2]);
    for (let py = 0; py < s; py++) for (let px = 0; px < s; px++) {
      const dx = px - r - 0.5, dy = py - r - 0.5, d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx), k = (a / TAU + 1) * 9, i0 = Math.floor(k) % 9, f = k - Math.floor(k);
      const rr = r * (bumps[i0] * (1 - f) + bumps[(i0 + 1) % 9] * f);
      if (d > rr) continue;
      let shade = 0.55 + 0.45 * (-(dx + dy) / (rr * 1.6));
      for (const cr of craters) { const cd = Math.hypot(dx / r - cr[0] * 0.6, dy / r - cr[1] * 0.6); if (cd < cr[2]) shade -= cd < cr[2] * 0.7 ? 0.25 : -0.15; }
      shade = clamp(shade, 0.2, 1.1);
      const base = hot ? [255, 150, 60] : [170, 150, 130];
      x.fillStyle = 'rgb(' + (base[0] * shade | 0) + ',' + (base[1] * shade | 0) + ',' + (base[2] * shade | 0) + ')';
      x.fillRect(px, py, 1, 1);
    }
    return c;
  }
  const ROCK = { L: [], M: [], S: [] };
  for (let i = 0; i < 3; i++) { ROCK.L.push(makeRock(12, 11 + i * 7)); ROCK.M.push(makeRock(7, 31 + i * 5)); ROCK.S.push(makeRock(4, 51 + i * 3)); }
  const NUCLEUS = makeRock(40, 977, false);
  const ROCKDEF = { L: { r: 11, hp: 4, pts: 50, dmg: 6, split: 'M' }, M: { r: 6, hp: 2, pts: 100, dmg: 3, split: 'S' }, S: { r: 3.5, hp: 1, pts: 150, dmg: 1, split: null } };

  ArcadeRegistry.register({
    id: 'halleyscomet', title: "Halley's Comet", year: 1986, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space / X: fire \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#80e0ff', accent: '#ff8030' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', modeT = 0, frame = 0, coinFlash = 0;
      let G = null;
      const stars = [];
      for (let i = 0; i < 80; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.3 + Math.random() * 1.6, c: pick(['#fff', '#a0c0ff', '#ffe0a0', '#808080']) });
      const snd = {
        shot() { au.tone(1600, 0.05, { type: 'square', vol: 0.05, slideTo: 800 }); },
        hit() { au.noise(0.04, { vol: 0.08, freq: 3500 }); },
        crack() { au.noise(0.15, { vol: 0.14, freq: 1500, slideTo: 300 }); },
        boom() { au.noise(0.5, { vol: 0.22, freq: 1200, slideTo: 80 }); au.tone(160, 0.4, { type: 'sawtooth', vol: 0.1, slideTo: 40 }); },
        alien() { au.tone(900, 0.1, { type: 'square', vol: 0.08, slideTo: 300 }); },
        impact() { au.tone(70, 0.25, { type: 'sawtooth', vol: 0.15, slideTo: 40 }); au.noise(0.2, { vol: 0.1, freq: 400 }); },
        power() { au.melody([[659, .05], [784, .05], [988, .05], [1319, .1]], { type: 'square', vol: 0.12 }); },
        warn() { au.melody([[880, .1], [0, .05], [880, .1], [0, .05], [880, .1]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [988, .1], [1047, .4]], { type: 'square', vol: 0.13 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .15]], { type: 'triangle', vol: 0.15 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.14 });
        return false;
      }

      function newGame() {
        G = { score: 0, lives: 2, stage: 0, loop: 0, damage: 0, power: 1, speed: 0, barrier: 0, extraAt: 20000, msg: '', msgT: 0 };
        startStage();
      }
      function startStage() {
        G.P = { x: W / 2, y: H - 30, dead: false, deadT: 0, inv: 120 };
        G.shots = []; G.rocks = []; G.aliens = []; G.ebul = []; G.items = []; G.fx = []; G.boss = null;
        G.t = 0; G.len = 60 * (45 + G.stage * 3); G.phase = 'intro'; G.phaseT = 150; G.fireCool = 0;
        G.waveT = 120;
      }
      const diff = () => 1 + G.stage * 0.12 + G.loop * 0.5;
      function addScore(n) {
        G.score += n; if (G.score > hi) hi = G.score;
        if (G.score >= G.extraAt) { G.lives++; G.extraAt += 60000; snd.extra(); G.msg = '1UP'; G.msgT = 90; }
      }
      function spawnRock(size, x, y, vx, vy) {
        const d = ROCKDEF[size];
        G.rocks.push({ size, x, y, vx, vy, hp: d.hp, r: d.r, img: irand(0, 2), rot: 0, flash: 0 });
      }
      function spawnWave() {
        const d = diff(), r = Math.random();
        if (r < 0.45) {
          // a shower of comet fragments
          const n = irand(2, 3 + Math.floor(G.stage / 2));
          for (let i = 0; i < n; i++) {
            const size = Math.random() < 0.35 ? 'L' : Math.random() < 0.6 ? 'M' : 'S';
            spawnRock(size, rand(16, W - 16), TOP - 20 - i * 26, rand(-0.4, 0.4), rand(0.5, 0.9) * Math.min(2, d));
          }
          G.waveT = Math.round(rand(70, 120) / d);
        } else if (r < 0.7) {
          // saucer squadron sweeping across
          const side = Math.random() < 0.5 ? -1 : 1, n = irand(4, 6), y0 = rand(40, 90);
          for (let i = 0; i < n; i++) G.aliens.push({ type: 'saucer', x: side < 0 ? -12 - i * 20 : W + 12 + i * 20, y: y0, vx: -side * 1.3 * Math.min(1.8, d), t: i * 8, hp: 1, y0, fireT: irand(40, 140) });
          G.waveT = Math.round(rand(110, 160) / d);
        } else if (r < 0.92) {
          // divers peel off from the top toward the ship
          const n = irand(3, 5);
          for (let i = 0; i < n; i++) G.aliens.push({ type: 'diver', x: rand(20, W - 20), y: TOP - 10 - i * 30, vx: 0, vy: 1.2 * Math.min(1.8, d), t: 0, hp: 1, fireT: irand(30, 90), dive: false });
          G.waveT = Math.round(rand(100, 150) / d);
        } else {
          const side = Math.random() < 0.5 ? -1 : 1;
          G.aliens.push({ type: 'carrier', x: side < 0 ? -16 : W + 16, y: rand(40, 70), vx: -side * 0.8, t: 0, hp: 3, fireT: 999 });
          G.waveT = 60;
        }
      }
      function spawnBoss() {
        const hp = 50 + G.stage * 10 + G.loop * 30;
        G.boss = { x: W / 2, y: -50, r: 40, hp, max: hp, flash: 0, t: 0, vx: 0.3, cores: [], dead: false, deadT: 0 };
        snd.warn(); G.msg = "HALLEY'S COMET APPROACHING"; G.msgT = 180;
      }

      // ---------- update ----------
      function updatePlayer() {
        const P = G.P;
        if (P.inv > 0) P.inv--;
        const sp = 1.8 + G.speed * 0.5;
        let mx = 0, my = 0;
        if (api.key('ArrowLeft')) mx--; if (api.key('ArrowRight')) mx++;
        if (api.key('ArrowUp')) my--; if (api.key('ArrowDown')) my++;
        P.x = clamp(P.x + mx * sp, 8, W - 8); P.y = clamp(P.y + my * sp, H * 0.45, H - 12);
        if (G.fireCool > 0) G.fireCool--;
        if ((api.key('Space') || api.key('KeyX')) && G.fireCool <= 0 && G.shots.length < 6 + G.power * 3) {
          G.fireCool = 7;
          const add = (dx, vx) => G.shots.push({ x: P.x + dx, y: P.y - 10, vx, vy: -6 });
          if (G.power === 1) add(0, 0);
          else if (G.power === 2) { add(-4, 0); add(4, 0); }
          else if (G.power === 3) { add(0, 0); add(-4, -1.2); add(4, 1.2); }
          else { add(-4, 0); add(4, 0); add(-6, -1.5); add(6, 1.5); }
          snd.shot();
        }
      }
      function killPlayer() {
        const P = G.P;
        if (P.dead || P.inv > 0 || G.phase !== 'play') return;
        if (G.barrier > 0) { G.barrier--; P.inv = 60; snd.crack(); G.fx.push({ k: 'ring', x: P.x, y: P.y, t: 0 }); return; }
        P.dead = true; P.deadT = 0; G.fx.push({ k: 'boom', x: P.x, y: P.y, t: 0, big: true }); snd.boom();
        G.power = Math.max(1, G.power - 1); G.speed = 0;
      }
      function planetHit(n) {
        G.damage = Math.min(100, G.damage + n); G.shake = 10; snd.impact();
      }
      function update() {
        frame++; modeT++;
        if (coinFlash > 0) coinFlash--;
        for (const s of stars) { s.y += s.s * (mode === 'title' ? 1 : 1.2); if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; modeT = 0; newGame(); }
          return;
        }
        if (G.msgT > 0) G.msgT--;
        if (G.shake > 0) G.shake--;
        for (const f of G.fx) f.t++;
        G.fx = G.fx.filter(f => f.t < (f.k === 'boom' ? (f.big ? 50 : 24) : f.k === 'pop' ? 40 : 20));
        if (G.phase === 'intro') { if (--G.phaseT <= 0) G.phase = 'play'; updatePlayer(); G.shots.forEach(s => { s.y += s.vy; }); return; }
        if (G.phase === 'clear') {
          if (--G.phaseT <= 0) { G.stage++; if (G.stage >= STAGES.length) { G.stage = 0; G.loop++; } startStage(); }
          return;
        }
        if (G.phase === 'over') {
          if (--G.phaseT <= 0 || (G.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; modeT = 0; }
          return;
        }
        if (G.phase === 'destroyed') {
          if (--G.phaseT === 60) lastChance(() => { G.damage = 30; G.phase = 'play'; G.rocks = []; G.ebul = []; });
          return;
        }
        const P = G.P;
        G.t++;
        if (P.dead) {
          P.deadT++;
          if (P.deadT === 90) {
            if (G.lives > 0) { G.lives--; Object.assign(P, { dead: false, x: W / 2, y: H - 30, inv: 150 }); }
            else lastChance(() => { G.lives = 2; Object.assign(P, { dead: false, x: W / 2, y: H - 30, inv: 150 }); });
          }
        } else updatePlayer();
        // waves, then the comet nucleus
        if (!G.boss) {
          if (G.t < G.len) { if (--G.waveT <= 0) spawnWave(); }
          else if (!G.rocks.length && !G.aliens.length) spawnBoss();
        }
        const d = diff();
        // shots
        for (const s of G.shots) { s.x += s.vx; s.y += s.vy; }
        G.shots = G.shots.filter(s => s.y > -10 && !s.hit);
        // rocks
        for (const r of G.rocks) {
          r.x += r.vx; r.y += r.vy; r.rot += 0.02; if (r.flash > 0) r.flash--;
          if (r.x < r.r || r.x > W - r.r) r.vx = -r.vx;
          for (const s of G.shots) {
            if (s.hit || r.dead) continue;
            if (Math.abs(s.x - r.x) < r.r + 2 && Math.abs(s.y - r.y) < r.r + 4) {
              s.hit = true; r.hp--; r.flash = 3; snd.hit();
              if (r.hp <= 0) breakRock(r);
            }
          }
          if (!r.dead && !P.dead && Math.hypot(P.x - r.x, P.y - r.y) < r.r + 5) { killPlayer(); if (!r.dead) breakRock(r); }
          if (!r.dead && r.y > H + r.r) { r.dead = true; planetHit(ROCKDEF[r.size].dmg); G.fx.push({ k: 'flash', x: r.x, y: H - 4, t: 0 }); }
        }
        G.rocks = G.rocks.filter(r => !r.dead);
        // aliens
        for (const a of G.aliens) {
          a.t++;
          if (a.type === 'saucer') { a.x += a.vx; a.y = a.y0 + Math.sin(a.t * 0.06) * 18; if ((a.vx > 0 && a.x > W + 30) || (a.vx < 0 && a.x < -30)) a.gone = true; }
          else if (a.type === 'diver') {
            if (!a.dive && a.y > 60 + (a.x % 40)) { a.dive = true; const ang = Math.atan2(P.y - a.y, P.x - a.x); a.vx = Math.cos(ang) * 2 * Math.min(1.6, d); a.vy = Math.max(1, Math.sin(ang) * 2 * Math.min(1.6, d)); }
            a.x += a.vx; a.y += a.vy; if (a.y > H + 20 || a.x < -20 || a.x > W + 20) a.gone = true;
          } else { a.x += a.vx; a.y += Math.sin(a.t * 0.05) * 0.3; if ((a.vx > 0 && a.x > W + 30) || (a.vx < 0 && a.x < -30)) a.gone = true; }
          if (--a.fireT <= 0 && a.y > TOP && a.y < H * 0.6 && !P.dead) {
            a.fireT = Math.round(rand(80, 160) / d);
            const ang = Math.atan2(P.y - a.y, P.x - a.x);
            G.ebul.push({ x: a.x, y: a.y, vx: Math.cos(ang) * 1.8, vy: Math.sin(ang) * 1.8 });
          }
          for (const s of G.shots) {
            if (s.hit || a.dead) continue;
            if (Math.abs(s.x - a.x) < 8 && Math.abs(s.y - a.y) < 6) {
              s.hit = true; a.hp--;
              if (a.hp <= 0) {
                a.dead = true; snd.alien(); G.fx.push({ k: 'boom', x: a.x, y: a.y, t: 0 });
                const pts = a.type === 'carrier' ? 1000 : a.type === 'diver' ? 300 : 200;
                addScore(pts); G.fx.push({ k: 'pop', x: a.x, y: a.y, t: 0, s: String(pts) });
                if (a.type === 'carrier') G.items.push({ kind: pick(['P', 'P', 'B', 'S']), x: a.x, y: a.y, t: 0 });
              } else snd.hit();
            }
          }
          if (!a.dead && !P.dead && Math.abs(P.x - a.x) < 9 && Math.abs(P.y - a.y) < 8) { a.dead = true; killPlayer(); }
        }
        G.aliens = G.aliens.filter(a => !a.dead && !a.gone);
        for (const b of G.ebul) {
          b.x += b.vx; b.y += b.vy;
          if (!P.dead && Math.abs(b.x - P.x) < 4 && Math.abs(b.y - P.y) < 5) { b.dead = true; killPlayer(); }
        }
        G.ebul = G.ebul.filter(b => !b.dead && b.y < H + 4 && b.y > -4 && b.x > -4 && b.x < W + 4);
        for (const it of G.items) {
          it.t++; it.y += 0.7;
          if (!P.dead && Math.abs(it.x - P.x) < 10 && Math.abs(it.y - P.y) < 10) {
            it.got = true; snd.power(); addScore(500);
            if (it.kind === 'P') { G.power = Math.min(4, G.power + 1); G.msg = 'POWER UP'; }
            else if (it.kind === 'B') { G.barrier = 3; G.msg = 'BARRIER'; }
            else { G.speed = Math.min(2, G.speed + 1); G.msg = 'SPEED UP'; }
            G.msgT = 60;
          }
        }
        G.items = G.items.filter(it => !it.got && it.y < H + 10);
        updateBoss();
        if (G.damage >= 100 && G.phase === 'play') {
          G.phase = 'destroyed'; G.phaseT = 150; snd.boom();
          au.melody([[330, .25], [311, .25], [294, .25], [277, .6]], { type: 'triangle', vol: 0.16, delay: 0.3 });
        }
      }
      function breakRock(r) {
        r.dead = true;
        const d = ROCKDEF[r.size];
        addScore(d.pts); snd.crack();
        G.fx.push({ k: 'boom', x: r.x, y: r.y, t: 0, big: r.size === 'L' });
        if (d.split) for (const s of [-1, 1]) spawnRock(d.split, r.x + s * r.r * 0.5, r.y, r.vx + s * rand(0.4, 0.9), Math.max(0.5, r.vy * 0.9));
      }
      function updateBoss() {
        const B = G.boss; if (!B) return;
        B.t++; if (B.flash > 0) B.flash--;
        if (B.dead) {
          B.deadT++;
          if (B.deadT % 6 === 0) G.fx.push({ k: 'boom', x: B.x + rand(-35, 35), y: B.y + rand(-35, 35), t: 0, big: Math.random() < 0.4 });
          if (B.deadT % 18 === 0) snd.boom();
          if (B.deadT === 150) {
            G.boss = null; G.phase = 'clear'; G.phaseT = 300;
            G.bonus = (100 - G.damage) * 200 + 10000 * (G.stage + 1);
            addScore(G.bonus);
            G.damage = Math.max(0, G.damage - 20);
            snd.clear();
          }
          return;
        }
        // the nucleus drifts down; if it reaches the planet it does massive damage
        const d = diff();
        B.y += B.y < 70 ? 0.6 : 0.05 * d;
        B.x += B.vx; if (B.x < 50 || B.x > W - 50) B.vx = -B.vx;
        if (B.t % Math.max(30, Math.round(80 / d)) === 0) {
          const size = Math.random() < 0.3 ? 'M' : 'S';
          spawnRock(size, B.x + rand(-30, 30), B.y + 30, rand(-0.8, 0.8), rand(1, 1.6));
        }
        if (B.t % Math.max(40, Math.round(110 / d)) === 0 && !G.P.dead) {
          for (let k = -2; k <= 2; k++) {
            const a = Math.PI / 2 + k * 0.3;
            G.ebul.push({ x: B.x, y: B.y + 30, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 });
          }
        }
        for (const s of G.shots) {
          if (s.hit) continue;
          if (Math.hypot(s.x - B.x, s.y - B.y) < B.r) {
            s.hit = true; B.hp--; B.flash = 3; snd.hit();
            G.fx.push({ k: 'spark', x: s.x, y: s.y, t: 0 });
            if (B.hp <= 0) { B.dead = true; B.deadT = 0; addScore(20000 + G.stage * 5000); G.rocks.forEach(r => { r.dead = true; G.fx.push({ k: 'boom', x: r.x, y: r.y, t: 0 }); }); G.ebul = []; }
          }
        }
        if (!G.P.dead && Math.hypot(G.P.x - B.x, G.P.y - B.y) < B.r + 4) killPlayer();
        if (B.y > H - 20) { planetHit(40); B.y = 60; G.msg = 'DIRECT HIT!'; G.msgT = 90; }
      }
      function lastChance(onCont) {
        if (api.offerContinue) api.offerContinue(onCont, gameOver); else gameOver();
      }
      function gameOver() {
        api.setHiScore(G.score);
        G.phase = 'over'; G.phaseT = 420;
        au.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: 0.12 });
      }

      // ---------- drawing ----------
      function drawStars(ctx) {
        for (const s of stars) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, s.s > 1.4 ? 2 : 1, 1); }
      }
      function drawPlanet(ctx, st, prog) {
        // the planet you are defending rises at the bottom as the comet nears
        const S = STAGES[st];
        const R = 260, cy = H + R - 10 - prog * 22;
        ctx.fillStyle = S.col;
        ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, TAU); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, TAU); ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 4; i++) { ctx.fillRect(0, cy - R + 8 + i * 9, W, 3); }
        ctx.restore();
        if (S.ring) { ctx.strokeStyle = S.ring; ctx.beginPath(); ctx.ellipse(W / 2, cy - R + 4, W * 0.7, 10, 0, Math.PI, TAU); ctx.stroke(); }
        if (G && G.damage > 0) {
          ctx.fillStyle = 'rgba(255,80,0,' + Math.min(0.6, G.damage / 120) + ')';
          ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, TAU); ctx.fill();
        }
      }
      function drawRock(ctx, r) {
        const imgs = ROCK[r.size], img = imgs[r.img];
        // comet fragments trail a faint glowing tail
        ctx.fillStyle = 'rgba(160,220,255,0.25)';
        ctx.fillRect(Math.round(r.x - r.r * 0.5), Math.round(r.y - r.r * 3), Math.round(r.r), Math.round(r.r * 2.2));
        ctx.save(); ctx.translate(Math.round(r.x), Math.round(r.y)); ctx.rotate(r.rot);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
        if (r.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.fill(); }
      }
      function drawBoss(ctx, B) {
        // tail streaming upward away from the sun
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = 'rgba(140,220,255,' + (0.28 - i * 0.018) + ')';
          const w = 60 + i * 8 + Math.sin(frame * 0.1 + i) * 4;
          ctx.fillRect(Math.round(B.x - w / 2), Math.round(B.y - 40 - i * 10), Math.round(w), 10);
        }
        ctx.fillStyle = 'rgba(200,240,255,0.25)'; ctx.beginPath(); ctx.arc(B.x, B.y, B.r + 6 + Math.sin(frame * 0.2) * 2, 0, TAU); ctx.fill();
        ctx.drawImage(NUCLEUS, Math.round(B.x - NUCLEUS.width / 2), Math.round(B.y - NUCLEUS.height / 2));
        // glowing core eye
        ctx.fillStyle = (frame & 8) ? '#ff6020' : '#ffe040';
        ctx.beginPath(); ctx.arc(B.x, B.y + 6, 7 + Math.sin(frame * 0.15) * 2, 0, TAU); ctx.fill();
        if (B.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, TAU); ctx.fill(); }
      }
      function drawFX(ctx, f) {
        if (f.k === 'boom') {
          const L = f.big ? 50 : 24, r = (f.big ? 16 : 8) * Math.sin(Math.min(1, f.t / L) * Math.PI) + 2;
          ctx.fillStyle = f.t < L * 0.2 ? '#fff' : f.t < L * 0.5 ? '#ffe040' : f.t < L * 0.8 ? '#ff8020' : '#802010';
          ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.fill();
          for (let i = 0; i < 6; i++) { const a = i * 1.047 + f.t * 0.05; ctx.fillRect(Math.round(f.x + Math.cos(a) * f.t * 0.8), Math.round(f.y + Math.sin(a) * f.t * 0.8), 2, 2); }
        } else if (f.k === 'pop') { text(ctx, f.s, Math.round(f.x), Math.round(f.y - f.t * 0.4), (frame & 4) ? '#fff' : '#80e0ff', 1, 'center'); }
        else if (f.k === 'spark') { ctx.fillStyle = '#fff'; ctx.fillRect(f.x - 1, f.y - 1, 3, 3); }
        else if (f.k === 'ring') { ctx.strokeStyle = '#80e0ff'; ctx.beginPath(); ctx.arc(f.x, f.y, 8 + f.t, 0, TAU); ctx.stroke(); }
        else if (f.k === 'flash') { ctx.fillStyle = 'rgba(255,160,40,' + (1 - f.t / 20) + ')'; ctx.fillRect(f.x - 10 - f.t, H - 20, 20 + f.t * 2, 20); }
      }
      function render(ctx) {
        ctx.fillStyle = '#000010'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        ctx.save();
        if (G.shake > 0) ctx.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)));
        drawStars(ctx);
        drawPlanet(ctx, G.stage, G.boss ? 1 : Math.min(1, G.t / G.len));
        if (G.boss) drawBoss(ctx, G.boss);
        for (const r of G.rocks) drawRock(ctx, r);
        for (const a of G.aliens) {
          const arr = AL[a.type], img = arr[(a.t >> 3) % arr.length];
          if (a.type === 'carrier' && (frame & 4)) ctx.globalAlpha = 0.7;
          ctx.drawImage(img, Math.round(a.x - img.width / 2), Math.round(a.y - img.height / 2));
          ctx.globalAlpha = 1;
        }
        for (const it of G.items) {
          ctx.fillStyle = it.kind === 'P' ? '#ff3030' : it.kind === 'B' ? '#3060ff' : '#30c030';
          ctx.fillRect(Math.round(it.x - 6), Math.round(it.y - 6), 12, 12);
          ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(it.x - 6), Math.round(it.y - 6), 12, 1);
          text(ctx, it.kind, Math.round(it.x - 2), Math.round(it.y - 3), (frame & 8) ? '#fff' : '#ffe040');
        }
        const P = G.P;
        if (!P.dead && G.phase !== 'over' && !(P.inv > 0 && (frame & 2))) {
          ctx.drawImage(SHIP_IMG, Math.round(P.x - 8), Math.round(P.y - 8));
          ctx.fillStyle = (frame & 2) ? '#ffe040' : '#ff8020'; ctx.fillRect(Math.round(P.x - 1), Math.round(P.y + 7), 2, 2 + (frame & 3));
          if (G.barrier > 0) { ctx.strokeStyle = (frame & 4) ? '#80e0ff' : '#3060ff'; ctx.beginPath(); ctx.arc(P.x, P.y, 12, 0, TAU); ctx.stroke(); }
        }
        for (const s of G.shots) { ctx.fillStyle = '#ffffa0'; ctx.fillRect(Math.round(s.x - 1), Math.round(s.y - 4), 2, 7); ctx.fillStyle = '#ff8020'; ctx.fillRect(Math.round(s.x - 1), Math.round(s.y + 2), 2, 2); }
        for (const b of G.ebul) { ctx.fillStyle = (frame & 4) ? '#ff40ff' : '#fff'; ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 2), 4, 4); }
        for (const f of G.fx) drawFX(ctx, f);
        ctx.restore();
        // HUD
        ctx.fillStyle = 'rgba(0,0,16,0.8)'; ctx.fillRect(0, 0, W, TOP);
        text(ctx, '1UP', 4, 1, '#ff4040'); text(ctx, pad(G.score, 7), 4, 8, '#fff');
        text(ctx, 'HI', 84, 1, '#ff4040'); text(ctx, pad(hi, 7), 84, 8, '#fff');
        text(ctx, 'DAMAGE', 160, 1, '#80e0ff');
        text(ctx, pad(G.damage, 2) + '%', 172, 8, G.damage >= 70 ? ((frame & 8) ? '#ff3030' : '#fff') : '#fff');
        // distance gauge on the right edge
        const prog = G.boss ? 1 : Math.min(1, G.t / G.len);
        ctx.fillStyle = '#202040'; ctx.fillRect(W - 5, TOP + 4, 3, 100);
        ctx.fillStyle = '#80e0ff'; ctx.fillRect(W - 5, TOP + 4 + 100 * (1 - prog), 3, 100 * prog);
        ctx.fillStyle = '#ffe040'; ctx.fillRect(W - 6, TOP + 2, 5, 2);
        for (let i = 0; i < Math.min(6, G.lives); i++) ctx.drawImage(SHIP_IMG, 2 + i * 10, H - 10, 8, 8);
        text(ctx, STAGES[G.stage].name, W - 4, H - 9, '#a0a0c0', 1, 'right');
        if (G.boss && !G.boss.dead) { ctx.fillStyle = '#400'; ctx.fillRect(50, TOP + 3, 124, 4); ctx.fillStyle = '#ff6020'; ctx.fillRect(50, TOP + 3, 124 * G.boss.hp / G.boss.max, 4); }
        if (G.msgT > 0 && (frame & 8)) stext(ctx, G.msg, W / 2, 70, '#ffe040', 1, 'center');
        if (G.phase === 'intro') {
          stext(ctx, 'STAGE ' + (G.stage + 1 + G.loop * STAGES.length), W / 2, 90, '#fff', 2, 'center');
          stext(ctx, 'DEFEND ' + STAGES[G.stage].name, W / 2, 114, '#80e0ff', 1, 'center');
          stext(ctx, 'STOP THE COMET FRAGMENTS', W / 2, 128, '#ffe040', 1, 'center');
        }
        if (G.phase === 'clear') {
          stext(ctx, 'COMET DESTROYED', W / 2, 90, '#80e0ff', 1, 'center');
          stext(ctx, 'STAGE CLEAR', W / 2, 106, '#fff', 2, 'center');
          stext(ctx, 'BONUS ' + G.bonus, W / 2, 130, '#ffe040', 1, 'center');
        }
        if (G.phase === 'destroyed') { ctx.fillStyle = 'rgba(255,80,0,0.3)'; ctx.fillRect(0, 0, W, H); stext(ctx, STAGES[G.stage].name + ' DESTROYED', W / 2, 110, '#fff', 1, 'center'); }
        if (G.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 100, W, 40);
          stext(ctx, 'GAME OVER', W / 2, 110, '#ff3030', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        drawStars(ctx);
        // the comet streaking across the title
        const cx = 160 - (modeT * 0.2) % 260, cy = 60 + Math.sin(modeT * 0.01) * 5;
        for (let i = 0; i < 20; i++) { ctx.fillStyle = 'rgba(140,220,255,' + (0.3 - i * 0.014) + ')'; ctx.fillRect(Math.round(cx + 6 + i * 6), Math.round(cy - 4 - i * 0.6), 7, 8 + i * 1.2); }
        ctx.drawImage(ROCK.L[0], Math.round(cx - 12), Math.round(cy - 12));
        stext(ctx, "HALLEY'S", W / 2, 96, '#80e0ff', 3, 'center');
        stext(ctx, 'COMET', W / 2, 122, '#ff8030', 4, 'center');
        const page = Math.floor(modeT / 360) % 2;
        if (page === 0) {
          text(ctx, 'SHOOT THE FRAGMENTS', W / 2, 162, '#fff', 1, 'center');
          text(ctx, 'BEFORE THEY HIT THE PLANET', W / 2, 172, '#fff', 1, 'center');
          text(ctx, 'L 50  M 100  S 150  UFO 200+', W / 2, 186, '#a0a0c0', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2, 162, '#ff4040', 1, 'center');
          text(ctx, pad(hi, 7), W / 2, 174, '#fff', 1, 'center');
          text(ctx, 'SHOOT RED CARRIERS FOR POWER', W / 2, 188, '#a0a0c0', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) stext(ctx, 'INSERT COIN', W / 2, 206, '#fff', 1, 'center'); }
        else if (blink) stext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 206, '#ffe040', 1, 'center');
        text(ctx, '\u00a9 1986 TAITO', W / 2, 228, '#80e0ff', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), W / 2, 242, '#fff', 1, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
