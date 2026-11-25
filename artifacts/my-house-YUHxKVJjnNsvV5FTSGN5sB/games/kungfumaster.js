// Kung-Fu Master (Irem, 1984) - Thomas fights up five temple floors of grippers, knife throwers, tom-toms and bosses to rescue Sylvia from Mr. X.
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
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  // draw a sprite canvas with its feet at (x, y), optionally mirrored
  function drawSpr(ctx, cv, x, y, flip) {
    const w = cv.width, h = cv.height, dx = Math.round(x - w / 2), dy = Math.round(y - h);
    if (flip) { ctx.save(); ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(cv, 0, 0); ctx.restore(); }
    else ctx.drawImage(cv, dx, dy);
  }
  const pad = (n, l) => String(n).padStart(l, '0');

  // ---------- fighter poses: [x, y, w, h, colourKey] facing right, feet at (0,0) ----------
  // keys: h hair, s skin, g gi/clothes, b belt, f feet, a arm (gi), w weapon hand
  const HEAD = [[-3, -32, 6, 2, 'h'], [-3, -30, 6, 6, 's'], [1, -28, 1, 1, 'e']];
  const TORSO = [[-4, -24, 8, 10, 'g'], [-4, -14, 8, 2, 'b']];
  const POSES = {
    stand: HEAD.concat(TORSO, [[-4, -12, 3, 11, 'g'], [1, -12, 3, 11, 'g'], [-5, -1, 4, 1, 'f'], [1, -1, 4, 1, 'f'],
      [-6, -23, 2, 7, 'a'], [4, -23, 2, 7, 'a'], [-6, -16, 2, 2, 's'], [4, -16, 2, 2, 's']]),
    walk1: HEAD.concat(TORSO, [[-6, -12, 3, 11, 'g'], [3, -12, 3, 11, 'g'], [-7, -1, 4, 1, 'f'], [3, -1, 4, 1, 'f'],
      [-6, -23, 2, 7, 'a'], [4, -23, 2, 7, 'a'], [-6, -16, 2, 2, 's'], [5, -17, 2, 2, 's']]),
    walk2: HEAD.concat(TORSO, [[-3, -12, 3, 11, 'g'], [0, -12, 3, 11, 'g'], [-3, -1, 4, 1, 'f'], [0, -1, 4, 1, 'f'],
      [-5, -23, 2, 7, 'a'], [3, -23, 2, 7, 'a'], [-5, -16, 2, 2, 's'], [3, -16, 2, 2, 's']]),
    punch: HEAD.concat(TORSO, [[-5, -12, 3, 11, 'g'], [2, -12, 3, 11, 'g'], [-6, -1, 4, 1, 'f'], [2, -1, 4, 1, 'f'],
      [-6, -22, 2, 6, 'a'], [4, -23, 11, 3, 'a'], [15, -24, 3, 4, 's']]),
    kick: [[-5, -32, 6, 2, 'h'], [-5, -30, 6, 6, 's'], [-1, -28, 1, 1, 'e'], [-6, -24, 8, 10, 'g'], [-6, -14, 8, 2, 'b'],
      [-5, -12, 3, 11, 'g'], [-6, -1, 4, 1, 'f'], [0, -18, 15, 3, 'g'], [15, -19, 4, 4, 'f'],
      [-8, -23, 2, 6, 'a'], [2, -24, 2, 6, 'a']],
    crouch: [[-3, -21, 6, 2, 'h'], [-3, -19, 6, 6, 's'], [1, -17, 1, 1, 'e'], [-4, -13, 8, 7, 'g'], [-4, -7, 8, 2, 'b'],
      [-6, -5, 5, 5, 'g'], [1, -5, 5, 5, 'g'], [-7, -1, 4, 1, 'f'], [3, -1, 4, 1, 'f'], [4, -12, 2, 6, 'a'], [-6, -12, 2, 6, 'a']],
    cpunch: [[-3, -21, 6, 2, 'h'], [-3, -19, 6, 6, 's'], [1, -17, 1, 1, 'e'], [-4, -13, 8, 7, 'g'], [-4, -7, 8, 2, 'b'],
      [-6, -5, 5, 5, 'g'], [1, -5, 5, 5, 'g'], [-7, -1, 4, 1, 'f'], [3, -1, 4, 1, 'f'], [4, -12, 11, 3, 'a'], [15, -13, 3, 4, 's'], [-6, -12, 2, 6, 'a']],
    ckick: [[-4, -19, 6, 2, 'h'], [-4, -17, 6, 6, 's'], [0, -15, 1, 1, 'e'], [-5, -11, 8, 6, 'g'], [-5, -5, 8, 2, 'b'],
      [-7, -4, 5, 4, 'g'], [-8, -1, 4, 1, 'f'], [1, -4, 15, 3, 'g'], [16, -5, 4, 4, 'f'], [-7, -10, 2, 5, 'a'], [2, -10, 2, 5, 'a']],
    jump: HEAD.concat(TORSO, [[-5, -12, 10, 4, 'g'], [-3, -9, 6, 4, 'g'], [-4, -5, 4, 1, 'f'], [1, -5, 4, 1, 'f'],
      [-6, -23, 2, 6, 'a'], [4, -26, 2, 6, 'a'], [4, -28, 2, 2, 's']]),
    jkick: HEAD.concat(TORSO, [[-5, -12, 4, 6, 'g'], [-6, -7, 4, 1, 'f'], [0, -14, 15, 3, 'g'], [15, -15, 4, 4, 'f'],
      [-7, -23, 2, 6, 'a'], [4, -23, 2, 6, 'a']]),
    jpunch: HEAD.concat(TORSO, [[-5, -12, 10, 4, 'g'], [-3, -9, 6, 4, 'g'], [-4, -5, 4, 1, 'f'], [1, -5, 4, 1, 'f'],
      [-6, -22, 2, 6, 'a'], [4, -23, 11, 3, 'a'], [15, -24, 3, 4, 's']]),
    hit: [[-7, -31, 6, 2, 'h'], [-7, -29, 6, 6, 's'], [-6, -23, 8, 10, 'g'], [-6, -13, 8, 2, 'b'], [-5, -11, 3, 10, 'g'], [1, -11, 3, 10, 'g'],
      [-6, -1, 4, 1, 'f'], [1, -1, 4, 1, 'f'], [-9, -24, 2, 7, 'a'], [2, -24, 2, 7, 'a'], [-9, -26, 2, 2, 's'], [2, -26, 2, 2, 's']],
    held: HEAD.concat(TORSO, [[-4, -12, 3, 11, 'g'], [1, -12, 3, 11, 'g'], [-5, -1, 4, 1, 'f'], [1, -1, 4, 1, 'f'],
      [-7, -28, 2, 7, 'a'], [5, -28, 2, 7, 'a'], [-7, -30, 2, 2, 's'], [5, -30, 2, 2, 's']]),
    grab: HEAD.concat(TORSO, [[-5, -12, 3, 11, 'g'], [2, -12, 3, 11, 'g'], [-6, -1, 4, 1, 'f'], [2, -1, 4, 1, 'f'],
      [3, -23, 7, 2, 'a'], [3, -19, 7, 2, 'a'], [10, -23, 2, 2, 's'], [10, -19, 2, 2, 's']]),
    throwHi: HEAD.concat(TORSO, [[-5, -12, 3, 11, 'g'], [2, -12, 3, 11, 'g'], [-6, -1, 4, 1, 'f'], [2, -1, 4, 1, 'f'],
      [-8, -30, 2, 8, 'a'], [-8, -33, 2, 3, 's'], [4, -23, 2, 7, 'a']]),
    throwLo: [[-3, -21, 6, 2, 'h'], [-3, -19, 6, 6, 's'], [1, -17, 1, 1, 'e'], [-4, -13, 8, 7, 'g'], [-4, -7, 8, 2, 'b'],
      [-6, -5, 5, 5, 'g'], [1, -5, 5, 5, 'g'], [-7, -1, 4, 1, 'f'], [3, -1, 4, 1, 'f'], [-9, -12, 6, 2, 'a'], [-10, -13, 2, 3, 's']],
    block: HEAD.concat(TORSO, [[-5, -12, 3, 11, 'g'], [2, -12, 3, 11, 'g'], [-6, -1, 4, 1, 'f'], [2, -1, 4, 1, 'f'],
      [4, -26, 2, 12, 'a'], [5, -27, 2, 2, 's'], [2, -22, 4, 2, 'a']])
  };

  ArcadeRegistry.register({
    id: 'kungfumaster', title: 'Kung-Fu Master', year: 1984, maker: 'Irem',
    width: 256, height: 240, vector: false, pointer: false,
    controls: 'Arrows: walk \u00b7 Up: jump \u00b7 Down: crouch \u00b7 Space: punch \u00b7 X: kick \u00b7 Left/Right fast: shake off \u00b7 Enter: start',
    marquee: { bg: '#200808', fg: '#ffcc30', accent: '#e02020' },
    create(api) {
      const W = 256, H = 240, A = api.audio;
      const GROUND = 204, FL = 1536, TOP = 48;
      const rnd = n => Math.floor(Math.random() * n);
      const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
      const FLOOR_BG = ['#3a2050', '#1e3458', '#4a2a20', '#203c30', '#3a1830'];
      const BOSS_NAMES = ['STICK FIGHTER', 'BOOMERANG FIGHTER', 'GIANT', 'BLACK MAGICIAN', 'MR. X'];
      const BOSS_TYPES = ['stick', 'boomer', 'giant', 'magic', 'mrx'];
      const PL_COL = { h: '#202020', s: '#ffc890', e: '#000', g: '#f4f4f4', a: '#f4f4f4', b: '#202020', f: '#c08040' };
      const GRIP_COL = { h: '#202020', s: '#ffc890', e: '#000', g: '#8040c0', a: '#8040c0', b: '#ffd040', f: '#402060' };
      const KNIFE_COL = { h: '#602010', s: '#e0a070', e: '#000', g: '#b04020', a: '#b04020', b: '#202020', f: '#301008' };
      const TOM_COL = { h: '#202020', s: '#ffc890', e: '#000', g: '#30a040', a: '#30a040', b: '#ffffff', f: '#103010' };
      const BOSS_COL = [
        { h: '#202020', s: '#ffc890', e: '#000', g: '#2060d0', a: '#2060d0', b: '#ffd040', f: '#102040' },
        { h: '#a02020', s: '#ffc890', e: '#000', g: '#e0c020', a: '#e0c020', b: '#a02020', f: '#403000' },
        { h: '#202020', s: '#d09060', e: '#000', g: '#806040', a: '#d09060', b: '#202020', f: '#301808' },
        { h: '#000000', s: '#c0c0c0', e: '#ff0000', g: '#181818', a: '#181818', b: '#8020a0', f: '#000' },
        { h: '#f0f0f0', s: '#ffc890', e: '#000', g: '#202020', a: '#202020', b: '#e02020', f: '#000' }
      ];

      let hi = api.getHiScore(50000);
      let state = 'title', T = 0, score = 0, lives = 3, floor = 1, loop = 0, nextExtra = 50000;
      let p = null, enemies = [], shots = [], hazards = [], parts = [], popups = [], boss = null, bossActive = false;
      let camX = 0, timer = 2000, spawnT = 0, hazardT = 0, tally = 0, gameOverT = 0, coinFlash = 0, lastCred = api.credits;
      let musicT = 0, musicI = 0;
      const fdir = () => (floor % 2 ? -1 : 1);
      const bossX = () => (fdir() < 0 ? 84 : FL - 84);
      const startX = () => (fdir() < 0 ? FL - 50 : 50);

      // ---------- sound ----------
      const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
      const THEME = [69, 0, 72, 74, 76, 0, 74, 72, 69, 0, 67, 69, 72, 0, 0, 0, 69, 0, 72, 74, 76, 79, 76, 74, 72, 0, 74, 72, 69, 0, 0, 0];
      function music() {
        if (++musicT < 9) return;
        musicT = 0;
        const n = THEME[musicI % THEME.length];
        if (n) A.tone(NOTE(n), 0.13, { type: 'square', vol: 0.04 });
        if (musicI % 4 === 0) A.tone(NOTE(musicI % 16 < 8 ? 45 : 43), 0.3, { type: 'triangle', vol: 0.08 });
        musicI++;
      }
      const sfx = {
        swish() { A.noise(0.05, { vol: 0.08, freq: 3000, type: 'highpass' }); },
        hit() { A.noise(0.08, { vol: 0.22, freq: 1200 }); A.tone(160, 0.08, { type: 'square', vol: 0.12, slideTo: 60 }); },
        yell() { A.tone(520, 0.12, { type: 'sawtooth', vol: 0.08, slideTo: 760 }); },
        hurt() { A.tone(300, 0.15, { type: 'square', vol: 0.12, slideTo: 120 }); },
        grab() { A.tone(120, 0.05, { type: 'square', vol: 0.08 }); },
        knife() { A.tone(2000, 0.06, { type: 'triangle', vol: 0.06, slideTo: 1200 }); },
        boom() { A.noise(0.4, { vol: 0.25, freq: 900, slideTo: 100 }); },
        block() { A.tone(1600, 0.05, { type: 'square', vol: 0.1 }); },
        death() { A.melody([[440, 0.15], [415, 0.15], [392, 0.15], [370, 0.15], [349, 0.5]], { type: 'square', vol: 0.12 }); },
        stage() { A.melody([[440, 0.1], [523, 0.1], [587, 0.1], [659, 0.3], [587, 0.1], [659, 0.4]], { type: 'square', vol: 0.12 }); },
        clear() { A.melody([[659, 0.1], [784, 0.1], [880, 0.1], [1047, 0.3], [0, 0.05], [880, 0.1], [1047, 0.4]], { type: 'square', vol: 0.12 }); },
        tick() { A.tone(1800, 0.02, { type: 'square', vol: 0.05 }); },
        laugh() { for (let i = 0; i < 4; i++) A.tone(300 - i * 20, 0.1, { type: 'sawtooth', vol: 0.08, delay: i * 0.14, slideTo: 200 - i * 20 }); },
        extra() { A.melody([[1047, 0.08], [1319, 0.08], [1568, 0.16]], { type: 'square', vol: 0.12 }); }
      };

      function addScore(n, x, y) {
        score += n; if (score > hi) hi = score;
        if (x != null) popups.push({ x, y, t: 50, txt: String(n) });
        if (score >= nextExtra) { lives++; nextExtra += 50000; sfx.extra(); }
      }

      // ---------- drawing figures ----------
      function drawFig(ctx, pose, x, y, face, col, sc, alpha) {
        const P = POSES[pose] || POSES.stand; sc = sc || 1;
        if (alpha != null) { ctx.save(); ctx.globalAlpha = alpha; }
        for (const [px, py, w, h, k] of P) {
          ctx.fillStyle = col[k] || '#f0f';
          const rx = face < 0 ? -px - w : px;
          ctx.fillRect(Math.round(x + rx * sc), Math.round(y + py * sc), Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
        }
        if (alpha != null) ctx.restore();
      }
      function drawFallen(ctx, x, y, face, col, sc, t) {
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(-face * Math.min(Math.PI / 2, t * 0.15));
        drawFig(ctx, 'hit', 0, 0, face, col, sc); ctx.restore();
      }

      // ---------- player ----------
      function newPlayer() {
        return { x: startX(), y: GROUND, vy: 0, vx: 0, air: false, face: fdir(), atk: null, crouch: false, energy: 48, inv: 0, hitT: 0, shake: 0, lastShake: 0, anim: 0, airAtk: false };
      }
      const ATK = {
        punch: { dur: 13, a0: 3, a1: 8, reach: [5, 21], hy: [-27, -17] },
        kick: { dur: 17, a0: 4, a1: 11, reach: [5, 25], hy: [-24, -15] },
        cpunch: { dur: 13, a0: 3, a1: 8, reach: [5, 20], hy: [-16, -8] },
        ckick: { dur: 17, a0: 4, a1: 11, reach: [5, 25], hy: [-8, 0] },
        jkick: { dur: 24, a0: 2, a1: 20, reach: [4, 23], hy: [-18, -8] },
        jpunch: { dur: 18, a0: 2, a1: 12, reach: [4, 20], hy: [-27, -17] }
      };
      function playerBox() {
        if (p.crouch || (p.atk && (p.atk.kind === 'cpunch' || p.atk.kind === 'ckick'))) return [p.y - 19, p.y];
        return [p.y - 31, p.y];
      }
      function held() { return enemies.some(e => e.mode === 'grab'); }
      function hurtPlayer(dmg, from) {
        if (p.inv > 0 || state !== 'play') return false;
        p.energy -= dmg; p.inv = 40; p.hitT = 10; sfx.hurt();
        if (from != null && !held()) p.x += sign(p.x - from) * 5;
        if (p.energy <= 0) { p.energy = 0; killPlayer(); }
        return true;
      }
      function startAtk(kind) { p.atk = { kind, t: 0, hits: [] }; sfx.swish(); if (Math.random() < 0.3) sfx.yell(); }
      function updatePlayer() {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight');
        const dir = L && !R ? -1 : R && !L ? 1 : 0;
        if (p.inv > 0) p.inv--;
        if (p.hitT > 0) { p.hitT--; return; }
        if (held()) {
          p.crouch = false; p.atk = null;
          const pd = api.pressed('ArrowLeft') ? -1 : api.pressed('ArrowRight') ? 1 : 0;
          if (pd && pd !== p.lastShake) { p.shake++; p.lastShake = pd; }
          if (p.shake >= 6) {
            p.shake = 0;
            for (const e of enemies) if (e.mode === 'grab') { e.mode = 'die'; e.t = 0; e.vy = -3; e.face = sign(e.x - p.x) || 1; }
            A.tone(800, 0.1, { type: 'square', vol: 0.1, slideTo: 1600 });
          }
          return;
        }
        p.shake = 0;
        if (p.air) {
          p.x += p.vx; p.vy += 0.3; p.y += p.vy;
          if (!p.atk && !p.airAtk) {
            if (api.pressed('KeyX')) { startAtk('jkick'); p.airAtk = true; }
            else if (api.pressed('Space')) { startAtk('jpunch'); p.airAtk = true; }
          }
          if (p.atk && ++p.atk.t > ATK[p.atk.kind].dur) p.atk = null;
          if (p.y >= GROUND) { p.y = GROUND; p.air = false; p.vy = 0; p.atk = null; }
        } else if (p.atk) {
          if (++p.atk.t > ATK[p.atk.kind].dur) p.atk = null;
        } else {
          p.crouch = api.key('ArrowDown');
          if (dir) p.face = dir;
          if (api.pressed('Space')) startAtk(p.crouch ? 'cpunch' : 'punch');
          else if (api.pressed('KeyX')) startAtk(p.crouch ? 'ckick' : 'kick');
          else if (api.pressed('ArrowUp') || (api.key('ArrowUp') && !p.crouch)) { p.air = true; p.vy = -5.3; p.vx = dir * 1.3; p.airAtk = false; p.crouch = false; A.tone(400, 0.08, { type: 'triangle', vol: 0.06, slideTo: 700 }); }
          else if (dir && !p.crouch) { p.x += dir * 1.25; p.anim++; }
        }
        // limits: floor ends and the boss
        const lo = 20, hiX = FL - 20;
        p.x = Math.max(lo, Math.min(hiX, p.x));
        if (boss && boss.mode !== 'dead' && boss.mode !== 'vanish') {
          const d = p.x - boss.x;
          if (Math.abs(d) < 14 * boss.sc && !p.air) p.x = boss.x + (sign(d) || -fdir()) * 14 * boss.sc;
        }
        // floor exit (stairs) after the boss is beaten
        if (boss && boss.mode === 'dead' && boss.t > 40 && ((fdir() < 0 && p.x <= 40) || (fdir() > 0 && p.x >= FL - 40))) floorClear();
        // attack resolution
        if (p.atk) {
          const a = ATK[p.atk.kind];
          if (p.atk.t >= a.a0 && p.atk.t <= a.a1) {
            const x0 = p.x + p.face * a.reach[0], x1 = p.x + p.face * a.reach[1];
            const rx0 = Math.min(x0, x1), rx1 = Math.max(x0, x1), ry0 = p.y + a.hy[0], ry1 = p.y + a.hy[1];
            hitTargets(rx0, rx1, ry0, ry1, p.atk);
          }
        }
        const tc = Math.max(0, Math.min(FL - W, p.x - W / 2 + fdir() * 24));
        camX += (tc - camX) * 0.1;
      }
      function overlap(a0, a1, b0, b1) { return a0 <= b1 && b0 <= a1; }
      function hitTargets(x0, x1, y0, y1, atk) {
        const low = atk.kind === 'cpunch' || atk.kind === 'ckick';
        const kickish = atk.kind.indexOf('kick') >= 0;
        for (const e of enemies) {
          if (e.mode === 'die' || e.mode === 'grab' || atk.hits.includes(e)) continue;
          const hb = e.h;
          if (!overlap(x0, x1, e.x - 5, e.x + 5) || !overlap(y0, y1, GROUND - hb - (e.hop || 0), GROUND - (e.hop || 0))) continue;
          atk.hits.push(e); sfx.hit();
          if (e.type === 'knife' && e.hp > 1) { e.hp--; e.stun = 30; e.x += p.face * 10; e.wind = 0; continue; }
          e.mode = 'die'; e.t = 0; e.vy = -2.5; e.face = -p.face;
          const pts = e.type === 'grip' ? (kickish ? 100 : 200) : e.type === 'tom' ? (kickish ? 300 : 500) : 500;
          addScore(pts, e.x, GROUND - 40);
        }
        for (const z of hazards) {
          if (z.dead || atk.hits.includes(z)) continue;
          const zb = hazardBox(z); if (!zb) continue;
          if (!overlap(x0, x1, zb[0], zb[1]) || !overlap(y0, y1, zb[2], zb[3])) continue;
          atk.hits.push(z); z.dead = true; sfx.hit();
          const pts = z.kind === 'snake' ? 100 : z.kind === 'dragon' ? 2000 : z.kind === 'ball' ? 1500 : 300;
          addScore(pts, z.x, GROUND - 46);
          burst(z.x, zb[2] + 3, z.kind === 'ball' ? 14 : 6);
        }
        if (boss && (boss.mode !== 'dead' && boss.mode !== 'vanish' && boss.mode !== 'intro') && boss.inv === 0 && !atk.hits.includes(boss)) {
          const sc = boss.sc;
          if (overlap(x0, x1, boss.x - 6 * sc, boss.x + 6 * sc) && overlap(y0, y1, GROUND - 31 * sc, GROUND) && !(low && boss.type === 'magic' && boss.float)) {
            atk.hits.push(boss);
            if (boss.type === 'mrx' && boss.mode !== 'strike' && Math.random() < 0.3) { boss.mode = 'block'; boss.t = 0; sfx.block(); return; }
            boss.hp -= boss.type === 'giant' || boss.type === 'mrx' ? 3 : 4; boss.inv = 20; sfx.hit();
            if (!(boss.type === 'giant' && boss.mode === 'strike')) { boss.x += p.face * 6; boss.mode = 'hurt'; boss.t = 0; boss.strike = null; boss.cd = 0; }
            addScore(kickish ? 100 : 200);
            if (boss.hp <= 0) { boss.hp = 0; boss.mode = 'dead'; boss.t = 0; addScore(2000 * floor * (loop + 1), boss.x, GROUND - 60); sfx.boom(); shots = []; }
          }
        }
      }
      function burst(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, t: 30 + rnd(20), c: ['#ff3030', '#ffd040', '#40c0ff', '#ffffff', '#40ff60'][rnd(5)] }); }

      // ---------- enemies ----------
      function spawnEnemy() {
        const n = 1 + (Math.random() < 0.3 + floor * 0.06 + loop * 0.1 ? 1 : 0);
        for (let i = 0; i < n; i++) spawnOne(i);
      }
      function spawnOne(i) {
        const cap = Math.min(8, 4 + Math.floor(floor / 2) + loop);
        if (enemies.filter(e => e.mode !== 'die').length >= cap) return;
        const ahead = i ? -fdir() : Math.random() < 0.55 ? fdir() : -fdir();
        let x = ahead > 0 ? camX + W + 16 : camX - 16;
        if (x < 10 || x > FL - 10) x = ahead > 0 ? camX - 16 : camX + W + 16;
        if (x < 10 || x > FL - 10) return;
        if (Math.abs(x - bossX()) < 150) return;
        let type = 'grip';
        const r = Math.random();
        if (floor !== 2 && r < 0.17 + floor * 0.03 && !enemies.some(o => o.type === 'knife' && o.mode !== 'die')) type = 'knife';
        else if ((floor === 3 || floor === 5 || loop > 0) && r < 0.4) type = 'tom';
        const e = { type, x, face: sign(p.x - x) || 1, mode: 'walk', t: 0, h: type === 'tom' ? 15 : 30, sp: (type === 'tom' ? 1.2 : 0.9) + Math.random() * 0.35 + loop * 0.15, hp: type === 'knife' ? 2 : 1, stun: 0, wind: 0, cd: 40, hop: 0, anim: rnd(20) };
        enemies.push(e);
      }
      function updateEnemies() {
        for (const e of enemies) {
          e.anim++;
          if (e.mode === 'die') { e.t++; e.x += e.face * -1.5; e.vy += 0.25; continue; }
          if (e.mode === 'grab') {
            e.x = p.x + e.side * (e.type === 'tom' ? 5 : 8);
            if (++e.t % (e.type === 'tom' ? 8 : 12) === 0) { p.energy -= 1; sfx.grab(); if (p.energy <= 0) { p.energy = 0; killPlayer(); } }
            continue;
          }
          if (e.stun > 0) { e.stun--; continue; }
          const dx = p.x - e.x;
          e.face = sign(dx) || e.face;
          if (e.type === 'knife') {
            if (e.wind > 0) {
              if (--e.wind === 0) {
                shots.push({ kind: 'knife', x: e.x + e.face * 8, y: e.low ? GROUND - 6 : GROUND - 25, vx: e.face * (2.4 + loop * 0.3), life: 200 });
                sfx.knife(); e.cd = 50 + rnd(50);
              }
              continue;
            }
            if (Math.abs(dx) > 70) e.x += e.face * e.sp;
            else if (Math.abs(dx) < 40) e.x -= e.face * e.sp * 0.6;
            if (--e.cd <= 0 && Math.abs(dx) < 130) { e.wind = 22; e.low = Math.random() < 0.5; }
            continue;
          }
          if (e.type === 'tom') e.hop = Math.abs(Math.sin(e.anim * 0.18)) * 10;
          if (Math.abs(dx) < 9 && !p.air && state === 'play' && p.hitT === 0) {
            e.mode = 'grab'; e.side = -e.face; e.t = 0; e.hop = 0; continue;
          }
          e.x += e.face * e.sp;
        }
        enemies = enemies.filter(e => !(e.mode === 'die' && e.t > 70) && e.x > camX - 200 && e.x < camX + W + 200);
      }

      // ---------- floor 2 hazards (pots / dragons / confetti balls) ----------
      function hazardBox(z) {
        if (z.state === 'fall') return [z.x - 4, z.x + 4, z.y - 8, z.y];
        if (z.kind === 'snake') return [z.x - 6, z.x + 6, GROUND - 5, GROUND];
        if (z.kind === 'dragon') return [z.x - 6, z.x + 6, GROUND - 36, GROUND - 20];
        if (z.kind === 'ball') return [z.x - 5, z.x + 5, GROUND - 32, GROUND - 22];
        return null;
      }
      function dropHazard() {
        if (bossActive) return;
        const x = p.x + fdir() * (30 + rnd(70));
        if (x < 30 || x > FL - 30) return;
        const r = Math.random();
        hazards.push({ kind: r < 0.5 ? 'snake' : r < 0.75 ? 'dragon' : 'ball', x, y: TOP + 4, state: 'fall', t: 0, dead: false, face: 1 });
      }
      function updateHazards() {
        for (const z of hazards) {
          if (z.dead) continue;
          z.t++;
          if (z.state === 'fall') {
            z.y += 2;
            if (z.y >= (z.kind === 'ball' ? GROUND - 22 : GROUND)) { z.state = 'live'; z.t = 0; if (z.kind === 'snake') { burst(z.x, GROUND - 3, 5); A.noise(0.1, { vol: 0.15, freq: 2500 }); } }
            continue;
          }
          const dx = p.x - z.x;
          if (z.kind === 'snake') {
            z.face = sign(dx) || 1; z.x += z.face * 1.0;
            if (Math.abs(dx) < 6 && p.y > GROUND - 6) { z.dead = true; hurtPlayer(4, z.x); }
            if (z.t > 600) z.dead = true;
          } else if (z.kind === 'dragon') {
            z.face = sign(dx) || 1;
            if (z.t > 50 && z.t < 90 && Math.abs(dx) < 46 && sign(dx) === z.face) {
              const [b0] = playerBox();
              if (b0 <= GROUND - 26 && !p.air) hurtPlayer(6, z.x);
            }
            if (z.t === 50) A.noise(0.6, { vol: 0.14, freq: 1500, slideTo: 300 });
            if (z.t > 140) { z.dead = true; burst(z.x, GROUND - 28, 4); }
          } else if (z.kind === 'ball') {
            if (z.t > 100) {
              z.dead = true; burst(z.x, GROUND - 27, 22); sfx.boom();
              if (Math.abs(dx) < 30) hurtPlayer(8, z.x);
            }
          }
        }
        hazards = hazards.filter(z => !z.dead);
      }

      // ---------- shots (knives, boomerangs, fireballs) ----------
      function updateShots() {
        const [b0, b1] = playerBox();
        for (const s of shots) {
          s.life--;
          if (s.kind === 'boomer') {
            s.vx -= s.dir * 0.06; s.x += s.vx;
            if (boss && s.life < 150 && Math.abs(s.x - boss.x) < 6) s.life = 0;
          } else s.x += s.vx;
          if (Math.abs(s.x - p.x) < 5 && s.y >= b0 && s.y <= b1) {
            if (hurtPlayer(s.kind === 'fire' ? 6 : s.kind === 'boomer' ? 6 : 8, s.x - s.vx * 4)) s.life = 0;
          }
        }
        shots = shots.filter(s => s.life > 0 && s.x > camX - 40 && s.x < camX + W + 40);
      }

      // ---------- bosses ----------
      function makeBoss() {
        const ti = (floor - 1) % 5, type = BOSS_TYPES[ti];
        return { type, ti, x: bossX(), face: -fdir(), hp: 48, mode: 'intro', t: 0, inv: 0, sc: type === 'giant' ? 1.4 : 1, strike: null, cd: 60, float: false, anim: 0 };
      }
      function bossSpeed() { return ({ stick: 0.8, boomer: 0.9, giant: 0.55, magic: 0.8, mrx: 1.3 })[boss.type] + loop * 0.15; }
      function updateBoss() {
        const b = boss; b.t++; b.anim++;
        if (b.inv > 0) b.inv--;
        if (b.mode === 'dead') return;
        if (b.mode === 'intro') { if (b.t > 50) { b.mode = 'idle'; b.t = 0; sfx.laugh(); } return; }
        const dx = p.x - b.x, adx = Math.abs(dx);
        if (b.mode !== 'strike' && b.mode !== 'vanish') b.face = sign(dx) || b.face;
        if (b.mode === 'hurt') { if (b.t > 7) { b.mode = 'idle'; b.t = 0; } return; }
        if (b.mode === 'block') { if (b.t > 16) { b.mode = 'idle'; b.t = 0; b.cd = 0; } return; }
        if (b.mode === 'vanish') {
          if (b.t === 30) { b.x = Math.max(40, Math.min(FL - 40, p.x + (Math.random() < 0.5 ? -1 : 1) * (40 + rnd(30)))); }
          if (b.t > 50) { b.mode = 'idle'; b.t = 0; b.cd = 20; }
          return;
        }
        if (b.mode === 'strike') {
          const s = b.strike; s.t++;
          if (s.t >= s.wind && s.t < s.wind + 7) {
            const [b0, b1] = playerBox();
            const x0 = b.x + b.face * 4, x1 = b.x + b.face * s.reach;
            const hy = s.low ? [GROUND - 8, GROUND] : [GROUND - 31 * b.sc, GROUND - 21];
            if (overlap(Math.min(x0, x1), Math.max(x0, x1), p.x - 5, p.x + 5) && overlap(hy[0], hy[1], b0 + (p.air ? 0 : 0), b1)) {
              const okJump = s.low && p.air && p.y < GROUND - 8;
              if (!okJump) hurtPlayer(s.dmg, b.x);
            }
          }
          if (s.t > s.wind + 18) { b.mode = 'idle'; b.t = 0; b.strike = null; }
          return;
        }
        if (b.cd > 0) b.cd--;
        const sp = bossSpeed();
        switch (b.type) {
          case 'stick': case 'giant': case 'mrx': {
            const reach = b.type === 'stick' ? 36 : b.type === 'giant' ? 32 : 28;
            if (adx > reach - 4) b.x += b.face * sp;
            else if (b.cd <= 0) {
              b.mode = 'strike'; b.t = 0;
              b.strike = { t: 0, wind: b.type === 'mrx' ? 8 - Math.min(4, loop) : b.type === 'giant' ? 18 : 14, reach, low: Math.random() < (b.type === 'giant' ? 0.25 : 0.45), dmg: b.type === 'giant' ? 10 : b.type === 'mrx' ? 8 : 6 };
              b.cd = (b.type === 'mrx' ? 10 : b.type === 'giant' ? 30 : 18) + rnd(20) - loop * 3;
              sfx.swish();
            }
            break;
          }
          case 'boomer': {
            if (adx < 24 && b.cd <= 0) { b.mode = 'strike'; b.t = 0; b.strike = { t: 0, wind: 10, reach: 26, low: Math.random() < 0.5, dmg: 6 }; b.cd = 40; break; }
            if (adx > 100) b.x += b.face * sp; else if (adx < 60) b.x -= b.face * sp * 0.7;
            if (b.cd <= 0 && !shots.some(s => s.kind === 'boomer')) {
              const low = Math.random() < 0.5;
              shots.push({ kind: 'boomer', x: b.x + b.face * 8, y: low ? GROUND - 6 : GROUND - 25, vx: b.face * 3.2, dir: b.face, life: 200 });
              b.cd = 70 + rnd(40); sfx.knife();
            }
            break;
          }
          case 'magic': {
            b.float = (b.anim >> 6) & 1 ? true : false;
            if (b.cd <= 0) {
              if (Math.random() < 0.35) { b.mode = 'vanish'; b.t = 0; A.tone(1200, 0.4, { type: 'sine', vol: 0.1, slideTo: 200 }); break; }
              const low = Math.random() < 0.5;
              shots.push({ kind: 'fire', x: b.x + b.face * 8, y: low ? GROUND - 6 : GROUND - 25, vx: b.face * (2 + loop * 0.3), life: 220 });
              b.cd = 60 + rnd(40); A.noise(0.2, { vol: 0.12, freq: 2000 });
            }
            if (adx < 30 && b.cd < 30) { b.mode = 'strike'; b.t = 0; b.strike = { t: 0, wind: 12, reach: 28, low: Math.random() < 0.5, dmg: 6 }; b.cd = 50; }
            else if (adx > 80) b.x += b.face * sp;
            break;
          }
        }
        b.x = Math.max(30, Math.min(FL - 30, b.x));
      }

      // ---------- flow ----------
      function startFloor() {
        enemies = []; shots = []; hazards = []; parts = []; popups = [];
        boss = null; bossActive = false; timer = 2000; spawnT = 90; hazardT = 120;
        p = newPlayer(); camX = Math.max(0, Math.min(FL - W, p.x - W / 2));
        state = 'ready'; T = 0; sfx.stage();
      }
      function newGame() { score = 0; lives = 3; floor = 1; loop = 0; nextExtra = 50000; startFloor(); }
      function killPlayer() {
        if (state !== 'play') return;
        state = 'dying'; T = 0; sfx.death();
        for (const e of enemies) if (e.mode === 'grab') { e.mode = 'walk'; e.stun = 60; }
      }
      function floorClear() { state = 'clear'; T = 0; tally = 0; sfx.clear(); }
      function updatePlay() {
        if (T % 4 === 0) { timer--; if (timer <= 0) { timer = 0; killPlayer(); return; } }
        if (timer < 300 && T % 30 === 0) sfx.tick();
        updatePlayer();
        if (state !== 'play') return;
        if (!bossActive && Math.abs(p.x - bossX()) < 190) { bossActive = true; boss = makeBoss(); enemies = enemies.filter(e => e.mode === 'die'); }
        if (!bossActive) {
          if (--spawnT <= 0) { spawnEnemy(); spawnT = (floor === 2 ? 80 : Math.max(24, 40 - floor * 3)) + rnd(40) - loop * 5; }
          if (floor === 2 && --hazardT <= 0) { dropHazard(); hazardT = 110 + rnd(90); }
        }
        updateEnemies();
        updateHazards();
        updateShots();
        if (boss) updateBoss();
        music();
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); return false;
      }
      function update() {
        T++;
        if (api.credits > lastCred) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        for (const q of popups) q.t--;
        popups = popups.filter(q => q.t > 0);
        for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.15; q.t--; }
        parts = parts.filter(q => q.t > 0);
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) newGame();
            break;
          case 'ready': if (T > 120) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (T > 130) {
              lives--;
              const over = () => { state = 'gameover'; gameOverT = 0; api.setHiScore(score); };
              if (lives <= 0) {
                if (api.offerContinue) api.offerContinue(() => { lives = 3; startFloor(); }, over);
                else over();
              } else startFloor();
            }
            break;
          case 'clear':
            if (T > 40 && timer > 0) {
              const d = Math.min(timer, 20); timer -= d; addScore(d * 5); if (T % 3 === 0) sfx.tick();
            } else if (T > 40 && tally === 0) { tally = T; }
            if (tally && T > tally + 60) {
              if (floor % 5 === 0) { state = 'rescue'; T = 0; sfx.clear(); }
              else { floor++; startFloor(); }
            }
            break;
          case 'rescue':
            if (T > 360 || (T > 120 && api.anyPressed('Enter', 'Space'))) { loop++; floor = 1; startFloor(); }
            break;
          case 'gameover':
            gameOverT++;
            if (gameOverT > 240 || (gameOverT > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawTemple(ctx) {
        const ox = -Math.round(camX), bg = FLOOR_BG[(floor - 1) % 5];
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = bg; ctx.fillRect(0, TOP, W, GROUND - TOP);
        // frieze
        ctx.fillStyle = '#8a1a10'; ctx.fillRect(0, TOP, W, 14);
        ctx.fillStyle = '#e0b030';
        for (let x = (ox % 16) - 16; x < W; x += 16) { ctx.fillRect(x, TOP + 3, 8, 2); ctx.fillRect(x + 6, TOP + 5, 2, 4); ctx.fillRect(x + 6, TOP + 9, 8, 2); }
        ctx.fillStyle = '#5a0a08'; ctx.fillRect(0, TOP + 14, W, 2);
        // lattice panels & pillars
        for (let px = Math.floor(camX / 64) * 64 - 64; px < camX + W + 64; px += 64) {
          const x = px + ox;
          if (px % 128 === 0) {
            ctx.fillStyle = '#c03020'; ctx.fillRect(x, TOP + 16, 10, GROUND - TOP - 16);
            ctx.fillStyle = '#e05030'; ctx.fillRect(x + 2, TOP + 16, 2, GROUND - TOP - 16);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, TOP + 16, 14, 3); ctx.fillRect(x - 2, GROUND - 6, 14, 6);
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 12, TOP + 40, 40, 56);
            ctx.fillStyle = 'rgba(255,230,180,0.25)';
            for (let i = 0; i < 5; i++) ctx.fillRect(x + 12 + i * 10, TOP + 40, 1, 56);
            for (let j = 0; j < 5; j++) ctx.fillRect(x + 12, TOP + 40 + j * 14, 40, 1);
            // lantern
            ctx.fillStyle = '#601010'; ctx.fillRect(x + 31, TOP + 16, 1, 8);
            ctx.fillStyle = '#ff5030'; ctx.fillRect(x + 27, TOP + 24, 9, 10);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 27, TOP + 24, 9, 1); ctx.fillRect(x + 27, TOP + 33, 9, 1);
          }
        }
        // stairs at the far end
        const sx = (fdir() < 0 ? 0 : FL) + ox;
        ctx.fillStyle = '#6a3a18';
        for (let i = 0; i < 8; i++) {
          const w = 44 - i * 5;
          if (fdir() < 0) ctx.fillRect(sx, GROUND - (i + 1) * 12, w, 12); else ctx.fillRect(sx - w, GROUND - (i + 1) * 12, w, 12);
        }
        ctx.fillStyle = '#a06030';
        for (let i = 0; i < 8; i++) { const w = 44 - i * 5; if (fdir() < 0) ctx.fillRect(sx, GROUND - (i + 1) * 12, w, 2); else ctx.fillRect(sx - w, GROUND - (i + 1) * 12, w, 2); }
        // floor
        ctx.fillStyle = '#7a4a20'; ctx.fillRect(0, GROUND, W, 20);
        ctx.fillStyle = '#5a3010';
        for (let x = (ox % 24) - 24; x < W; x += 24) ctx.fillRect(x, GROUND + 2, 1, 18);
        ctx.fillRect(0, GROUND + 10, W, 1);
        ctx.fillStyle = '#c08040'; ctx.fillRect(0, GROUND, W, 2);
      }
      function drawHazards(ctx, ox) {
        for (const z of hazards) {
          const x = Math.round(z.x + ox);
          if (z.state === 'fall') {
            if (z.kind === 'snake') { ctx.fillStyle = '#c08040'; ctx.fillRect(x - 4, Math.round(z.y) - 8, 8, 8); ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 4, Math.round(z.y) - 6, 8, 1); }
            else { ctx.fillStyle = z.kind === 'dragon' ? '#40c040' : '#ff40c0'; ctx.beginPath(); ctx.arc(x, Math.round(z.y) - 4, 4, 0, Math.PI * 2); ctx.fill(); }
            continue;
          }
          if (z.kind === 'snake') {
            const w = (z.t >> 3) & 1;
            ctx.fillStyle = '#30d030'; ctx.fillRect(x - 6, GROUND - 3 - w, 4, 3); ctx.fillRect(x - 2, GROUND - 3 + w - 1, 4, 3); ctx.fillRect(x + 2, GROUND - 4, 3, 3);
            ctx.fillStyle = '#ff2020'; ctx.fillRect(x + (z.face > 0 ? 5 : -7), GROUND - 3, 2, 1);
          } else if (z.kind === 'dragon') {
            const y = GROUND - 28 + Math.round(Math.sin(z.t * 0.1) * 2);
            ctx.fillStyle = '#20b040'; ctx.fillRect(x - 5, y - 6, 10, 12); ctx.fillRect(x + (z.face > 0 ? 3 : -7), y - 8, 4, 4);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x + (z.face > 0 ? 4 : -6), y - 7, 1, 1);
            ctx.fillStyle = '#108020'; ctx.fillRect(x - 3, y + 6, 6, 8);
            if (z.t > 50 && z.t < 90) {
              for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#ffd040' : '#ff4020'; ctx.fillRect(x + z.face * (8 + i * 6), y - 6 + ((i + (T >> 2)) % 3) - 1, 6, 4); }
            }
          } else if (z.kind === 'ball') {
            const y = GROUND - 27;
            ctx.fillStyle = (T >> 2) & 1 ? '#ff40c0' : '#ffd040';
            ctx.beginPath(); ctx.arc(x, y, 5 + (z.t > 70 ? (T >> 1) & 1 : 0), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 3, 2, 2);
          }
        }
      }
      function drawShots(ctx, ox) {
        for (const s of shots) {
          const x = Math.round(s.x + ox), y = Math.round(s.y);
          if (s.kind === 'knife') { ctx.fillStyle = '#e0e0f0'; ctx.fillRect(x - 4, y, 7, 1); ctx.fillStyle = '#804020'; ctx.fillRect(s.vx > 0 ? x - 5 : x + 3, y - 1, 2, 3); }
          else if (s.kind === 'boomer') {
            ctx.fillStyle = '#ffd040'; const f = (T >> 2) & 1;
            if (f) { ctx.fillRect(x - 4, y - 1, 8, 2); ctx.fillRect(x - 1, y - 4, 2, 4); } else { ctx.fillRect(x - 1, y - 4, 2, 8); ctx.fillRect(x - 4, y - 1, 4, 2); }
          } else { ctx.fillStyle = (T >> 1) & 1 ? '#ff6020' : '#ffd040'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      function enemyPose(e) {
        if (e.mode === 'grab') return 'grab';
        if (e.type === 'knife') { if (e.stun > 0) return 'hit'; if (e.wind > 0) return e.low ? 'throwLo' : 'throwHi'; }
        return (e.anim >> 3) & 1 ? 'walk1' : 'walk2';
      }
      function drawEnemies(ctx, ox) {
        for (const e of enemies) {
          const col = e.type === 'grip' ? GRIP_COL : e.type === 'knife' ? KNIFE_COL : TOM_COL, sc = e.type === 'tom' ? 0.55 : 1;
          const x = e.x + ox;
          if (e.mode === 'die') { drawFallen(ctx, x, GROUND + e.t * (e.t * 0.02), e.face, col, sc, e.t); continue; }
          drawFig(ctx, enemyPose(e), x, GROUND - (e.hop || 0), e.face, col, sc);
          if (e.type === 'knife' && e.wind > 0) { ctx.fillStyle = '#e0e0f0'; ctx.fillRect(Math.round(x - e.face * 9), e.low ? GROUND - 14 : GROUND - 36, 1, 4); }
        }
      }
      function drawBoss(ctx, ox) {
        const b = boss, col = BOSS_COL[b.ti], x = b.x + ox;
        if (b.mode === 'dead') { drawFallen(ctx, x, GROUND, b.face, col, b.sc, b.t); return; }
        if (b.mode === 'vanish') { if (b.t < 30) drawFig(ctx, 'stand', x, GROUND, b.face, col, b.sc, 1 - b.t / 30); else drawFig(ctx, 'stand', x, GROUND, b.face, col, b.sc, (b.t - 30) / 20); return; }
        if (b.inv > 0 && (T >> 1) & 1) return;
        let pose = (b.anim >> 4) & 1 ? 'walk1' : 'stand';
        if (b.mode === 'hurt') pose = 'hit';
        else if (b.mode === 'block') pose = 'block';
        else if (b.mode === 'strike') {
          const s = b.strike, active = s.t >= s.wind;
          if (b.type === 'stick' || b.type === 'magic') pose = active ? (s.low ? 'cpunch' : 'punch') : (s.low ? 'throwLo' : 'throwHi');
          else pose = active ? (s.low ? 'ckick' : (b.type === 'giant' ? 'punch' : 'kick')) : (s.low ? 'crouch' : 'stand');
        }
        const fy = b.type === 'magic' && b.float ? GROUND - 4 : GROUND;
        drawFig(ctx, pose, x, fy, b.face, col, b.sc);
        if (b.type === 'stick') {
          ctx.fillStyle = '#c08040';
          if (b.mode === 'strike' && b.strike.t >= b.strike.wind) { const y = b.strike.low ? GROUND - 5 : GROUND - 24; ctx.fillRect(Math.round(x + (b.face > 0 ? 14 : -36)), y, 22, 2); }
          else ctx.fillRect(Math.round(x + b.face * 6), GROUND - 40, 2, 32);
        }
        if (b.type === 'magic') { ctx.fillStyle = '#8020a0'; ctx.fillRect(Math.round(x - 6), fy - 34, 12, 3); ctx.fillRect(Math.round(x - 2), fy - 38, 4, 4); }
      }
      function bar(ctx, x, y, v, col) {
        ctx.fillStyle = '#300'; ctx.fillRect(x, y, 96, 5);
        ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(v * 2), 5);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        text(ctx, '1-' + pad(score, 6), 4, 3, '#fff');
        text(ctx, 'TOP-' + pad(hi, 6), 252, 3, '#ff4040', 1, 'right');
        text(ctx, 'TIME ' + pad(Math.max(0, timer), 4), 4, 14, timer < 300 && (T >> 3) & 1 ? '#ff4040' : '#ffd040');
        // floor map
        for (let i = 0; i < 5; i++) {
          const fx = 112 + i * 28, cur = i + 1 === floor;
          text(ctx, (i + 1) + 'F', fx, 14, cur ? ((T >> 4) & 1 ? '#ffffff' : '#ffd040') : i + 1 < floor ? '#606060' : '#c0c0c0');
          if (i < 4) { ctx.fillStyle = '#804020'; ctx.fillRect(fx + 13, 17, 10, 1); }
        }
        text(ctx, 'PLAYER', 4, 25, '#ffd040'); bar(ctx, 48, 26, p ? p.energy : 48, '#ffb030');
        text(ctx, 'ENEMY', 4, 35, '#ff4040'); bar(ctx, 48, 36, boss ? boss.hp : 48, '#ff4040');
        if (loop > 0) text(ctx, 'LOOP ' + (loop + 1), 252, 25, '#40c0ff', 1, 'right');
        for (let i = 0; i < Math.min(6, lives - 1); i++) drawFig(ctx, 'stand', 10 + i * 12, H - 2, 1, PL_COL, 0.4);
        if (boss && bossActive && boss.mode !== 'dead') text(ctx, BOSS_NAMES[boss.ti], 252, 35, '#ffffff', 1, 'right');
      }
      function playerPose() {
        if (state === 'dying') return 'hit';
        if (held()) return 'held';
        if (p.hitT > 0) return 'hit';
        if (p.air) return p.atk ? (p.atk.kind === 'jkick' ? 'jkick' : 'jpunch') : 'jump';
        if (p.atk) {
          const a = ATK[p.atk.kind], act = p.atk.t >= a.a0 - 1 && p.atk.t <= a.a1 + 2;
          if (!act) return p.atk.kind[0] === 'c' ? 'crouch' : 'stand';
          return p.atk.kind;
        }
        if (p.crouch) return 'crouch';
        const moving = (api.key('ArrowLeft') || api.key('ArrowRight'));
        return moving ? ((p.anim >> 3) & 1 ? 'walk1' : 'walk2') : 'stand';
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        text(ctx, '1-' + pad(score, 6), 4, 3, '#fff'); text(ctx, 'TOP-' + pad(hi, 6), 252, 3, '#ff4040', 1, 'right');
        // pagoda
        ctx.fillStyle = '#601810';
        for (let i = 0; i < 5; i++) {
          const w = 120 - i * 18, y = 200 - i * 26;
          ctx.fillStyle = '#7a2a18'; ctx.fillRect(128 - w / 2 + 8, y - 20, w - 16, 20);
          ctx.fillStyle = '#ffd040'; for (let j = 0; j < 4; j++) ctx.fillRect(128 - w / 2 + 14 + j * ((w - 28) / 3), y - 15, 4, 8);
          ctx.fillStyle = '#c03020'; ctx.beginPath(); ctx.moveTo(128 - w / 2 - 4, y - 18); ctx.lineTo(128, y - 30); ctx.lineTo(128 + w / 2 + 4, y - 18); ctx.closePath(); ctx.fill();
        }
        text(ctx, 'KUNG-FU', W / 2 + 2, 30, '#600000', 4, 'center'); text(ctx, 'KUNG-FU', W / 2, 28, '#ffcc30', 4, 'center');
        text(ctx, 'MASTER', W / 2 + 2, 64, '#600000', 3, 'center'); text(ctx, 'MASTER', W / 2, 62, '#ff4030', 3, 'center');
        const pose = ['stand', 'punch', 'stand', 'kick', 'crouch', 'ckick'][(T >> 4) % 6];
        drawFig(ctx, pose, 70, 214, 1, PL_COL, 1);
        drawFig(ctx, (T >> 4) % 6 === 1 || (T >> 4) % 6 === 3 ? 'hit' : 'walk1', 98, 214, -1, GRIP_COL, 1);
        ctx.fillStyle = '#7a4a20'; ctx.fillRect(0, 214, W, 4);
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (T >> 2) & 1 : (T >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 98, coinFlash ? '#ff4040' : '#fff', 1, 'center'); }
        else if ((T >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 98, '#fff', 1, 'center');
        text(ctx, 'RESCUE SYLVIA FROM MR. X', W / 2, 86, '#40c0ff', 1, 'center');
        text(ctx, '\u00a9 1984 IREM CORP.', W / 2, 224, '#c0c0c0', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, 232, '#fff');
      }
      function render(ctx) {
        if (state === 'title') { drawTitle(ctx); return; }
        drawTemple(ctx);
        const ox = -Math.round(camX);
        drawHazards(ctx, ox);
        if (boss) drawBoss(ctx, ox);
        drawEnemies(ctx, ox);
        if (p && !(p.inv > 0 && (T >> 1) & 1 && state === 'play')) {
          if (state === 'dying') drawFallen(ctx, p.x + ox, GROUND, p.face, PL_COL, 1, T);
          else drawFig(ctx, playerPose(), p.x + ox, p.y, p.face, PL_COL, 1);
        }
        drawShots(ctx, ox);
        for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x + ox), Math.round(q.y), 2, 2); }
        for (const q of popups) text(ctx, q.txt, Math.round(q.x + ox), Math.round(q.y - (50 - q.t) * 0.3), '#fff', 1, 'center');
        drawHUD(ctx);
        if (state === 'ready') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, 110, 80, 14); text(ctx, floor + ' FLOOR', W / 2, 114, '#ffd040', 1, 'center'); }
        if (held() && state === 'play' && (T >> 3) & 1) text(ctx, 'SHAKE! <  >', p.x + ox, 120, '#ff4040', 1, 'center');
        if (state === 'clear') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 104, 120, 24); text(ctx, 'FLOOR CLEAR', W / 2, 108, '#ffd040', 1, 'center'); text(ctx, 'TIME BONUS', W / 2, 118, '#fff', 1, 'center'); }
        if (state === 'rescue') {
          ctx.fillStyle = '#000'; ctx.fillRect(16, 90, W - 32, 50);
          text(ctx, 'THOMAS RESCUED SYLVIA!', W / 2, 98, '#ffd040', 1, 'center');
          text(ctx, 'BUT THE DEVIL\'S GANG', W / 2, 112, '#fff', 1, 'center');
          text(ctx, 'STRIKES AGAIN...', W / 2, 124, '#fff', 1, 'center');
        }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, 110, 80, 14); text(ctx, 'GAME OVER', W / 2, 114, '#ff4040', 1, 'center'); }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
