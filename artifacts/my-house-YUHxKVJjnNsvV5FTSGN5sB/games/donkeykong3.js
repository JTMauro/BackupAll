// Donkey Kong 3 (Nintendo, 1983) \u2014 from-scratch recreation for the Game Room.
// Stanley the bugman sprays Donkey Kong up the vines and protects the greenhouse flowers from the bees.
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
    '.': [0, 0, 0, 0, 0, 12, 12], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4],
    '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0], '=': [0, 0, 31, 0, 31, 0, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14]
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
  function mk(rows, pal, sc) {
    sc = sc || 1;
    const h = rows.length, w = rows.reduce((a, r) => Math.max(a, r.length), 0);
    const c = document.createElement('canvas'); c.width = w * sc; c.height = h * sc;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i]; if (ch === '.' || !pal[ch]) continue;
      x.fillStyle = pal[ch]; x.fillRect(i * sc, j * sc, sc, sc);
    }
    return c;
  }
  function blit(ctx, img, x, y, fx) {
    x = Math.round(x); y = Math.round(y);
    if (!fx) { ctx.drawImage(img, x, y); return; }
    ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
  }

  const DK_ROWS = [
    'HH......................HH',
    'BB......................BB',
    'BBB....................BBB',
    '.BBB.......BBBB.......BBB.',
    '..BBB....BBBBBBBB....BBB..',
    '...BBB..BBffffffBB..BBB...',
    '....BBBBBfEKffKEfBBBBBB...',
    '.....BBBBffffffffBBBB.....',
    '......BBffMMMMMMffBB......',
    '......BBBfMWWWWMfBBB......',
    '.....BBBBBffffffBBBBB.....',
    '....BBBBBBBTTTTBBBBBBB....',
    '....BBBBBBTTTTTTBBBBBB....',
    '....BBBBBBTTTTTTBBBBBB....',
    '....BBBBBBBTTTTBBBBBBB....',
    '.....BBBBBBBBBBBBBBBB.....',
    '.....BBBBBB....BBBBBB.....',
    '....BBBBBB......BBBBBB....',
    '....BBBBB........BBBBB....',
    '...ffffff........ffffff...',
    '...fffff..........fffff...'
  ];
  const DK_ROWS2 = DK_ROWS.slice(0, 16).concat([
    '.....BBBBBB....BBBBBB.....',
    '.....BBBBB......BBBBB.....',
    '....BBBBB........BBBBB....',
    '....fffff........fffff....',
    '...ffffff........ffffff...'
  ]);
  const STAN_ROWS = [
    '.....CC.......',
    '.....CC.......',
    '....RRRRR.....',
    '...RRRRRRR....',
    '...KSSSSK.....',
    '...SSKSSS.....',
    '....SSSS......',
    '..WWWWWWW.....',
    '.WWWBBBWWW....',
    'SSWWBBBWWSS...',
    'SS.BBBBBB.SS..',
    '...BBBBBB.....',
    '...BBBBBB.....',
    '...BBB.BBB....',
    '...BB...BB....',
    '..KKK...KKK...'
  ];
  const STAN_WALK = STAN_ROWS.slice(0, 13).concat(['...BBBBBB.....', '....BBBB......', '...KKKKK......']);
  const BEE_A = ['..WW.WW...', '.WWWWWWW..', '..YKYKY...', '.YKYKYKYE.', 'YKYKYKYKYE', '.YKYKYKY..', '..K...K...'];
  const BEE_B = ['..........', '.WW...WW..', '.WYKYKYW..', '.YKYKYKYE.', 'YKYKYKYKYE', '.YKYKYKY..', '...K...K..'];

  ArcadeRegistry.register({
    id: 'donkeykong3', title: 'Donkey Kong 3', year: 1983, maker: 'Nintendo',
    width: 224, height: 256, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Up: jump to platform \u00b7 Down: drop \u00b7 Space (hold): bug spray \u00b7 Enter: start',
    marquee: { bg: '#00102a', fg: '#ffd000', accent: '#ff3070' },
    create(api) {
      const W = 224, H = 256, FLOOR = 236;
      const au = api.audio;
      const dkPal = { H: '#ffd0a0', B: '#a04010', f: '#ffb878', E: '#fff', K: '#000', M: '#401000', W: '#fff', T: '#ffd0a0' };
      const dkPalHit = { H: '#fff', B: '#ffffff', f: '#ffe0ff', E: '#f00', K: '#000', M: '#f00', W: '#fff', T: '#ffffff' };
      const SP = {
        dk: mk(DK_ROWS, dkPal, 2), dk2: mk(DK_ROWS2, dkPal, 2), dkHit: mk(DK_ROWS, dkPalHit, 2),
        stan: mk(STAN_ROWS, { C: '#c0c0d0', R: '#2040e0', K: '#402000', S: '#ffb878', W: '#f8f8f8', B: '#3070f0' }),
        stanW: mk(STAN_WALK, { C: '#c0c0d0', R: '#2040e0', K: '#402000', S: '#ffb878', W: '#f8f8f8', B: '#3070f0' }),
        stanS: mk(STAN_ROWS, { C: '#ff60ff', R: '#e02040', K: '#402000', S: '#ffb878', W: '#ffe040', B: '#e04040' }),
        buzz: [mk(BEE_A, { W: '#d0e8ff', Y: '#ffd000', K: '#402000', E: '#ff2000' }), mk(BEE_B, { W: '#d0e8ff', Y: '#ffd000', K: '#402000', E: '#ff2000' })],
        spy: [mk(BEE_A, { W: '#d0e8ff', Y: '#40a0ff', K: '#001060', E: '#ffff00' }), mk(BEE_B, { W: '#d0e8ff', Y: '#40a0ff', K: '#001060', E: '#ffff00' })],
        queen: [mk(BEE_A, { W: '#ffd0ff', Y: '#e040ff', K: '#300040', E: '#ffff00' }, 2), mk(BEE_B, { W: '#ffd0ff', Y: '#e040ff', K: '#300040', E: '#ffff00' }, 2)]
      };
      const snd = {
        spray() { au.noise(0.05, { vol: 0.05, freq: 5000, type: 'highpass' }); },
        hitDK() { au.tone(110, 0.06, { type: 'square', vol: 0.12, slideTo: 90 }); },
        bee() { au.tone(1500, 0.08, { type: 'square', vol: 0.1, slideTo: 300 }); au.noise(0.08, { vol: 0.08, freq: 3000 }); },
        steal() { au.melody([[440, 0.08], [415, 0.08], [392, 0.08], [370, 0.2]], { type: 'triangle', vol: 0.15 }); },
        roar() { au.noise(0.5, { vol: 0.2, freq: 300, slideTo: 100 }); au.tone(80, 0.5, { type: 'sawtooth', vol: 0.12, slideTo: 50 }); },
        can() { au.melody([[523, 0.06], [659, 0.06], [784, 0.06], [1046, 0.06], [1319, 0.15]], { type: 'square', vol: 0.12 }); },
        jump() { au.tone(300, 0.1, { type: 'square', vol: 0.08, slideTo: 600 }); },
        die() { au.melody([[880, 0.1], [831, 0.1], [784, 0.1], [740, 0.1], [698, 0.1], [440, 0.12], [220, 0.35]], { type: 'square', vol: 0.13 }); },
        start() { au.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.15], [659, 0.1], [784, 0.3]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.1], [988, 0.1], [1046, 0.1], [1319, 0.4]], { type: 'square', vol: 0.13 }); },
        pop() { au.tone(700, 0.05, { type: 'square', vol: 0.1 }); },
        buzz() { au.tone(180, 0.12, { type: 'sawtooth', vol: 0.03 }); },
        extra() { au.melody([[1319, 0.08], [1568, 0.08], [2093, 0.16]], { type: 'square', vol: 0.1 }); }
      };

      // ---- geometry ----
      const PLATS = [
        { x0: 0, x1: W, y: FLOOR, floor: true },
        { x0: 8, x1: 80, y: 196 }, { x0: 144, x1: 216, y: 196 },
        { x0: 64, x1: 160, y: 156 }
      ];
      const HIVES = [{ x: 18, y: 44 }, { x: 206, y: 44 }];
      const VINE_L = 24, VINE_R = 200;
      const DK_X = 112, DK_TOP0 = 46, DK_LIMIT = 154;
      const FLOWER_X = [20, 60, 112, 164, 204];

      const S = { mode: 'title', t: 0, score: 0, hi: api.getHiScore(10000), lives: 3, stage: 0, extra: false, bonus: 0 };
      let st, dk, bees, parts, stings, nuts, cats, flowers, pops, can, beeT, nutT, catT, superT, coinFlash = 0, bonusTick = 0;
      function loop() { return Math.floor(S.stage / 3); }
      function kind() { return S.stage % 3; }
      function addScore(n, x, y) {
        S.score += n;
        if (!S.extra && S.score >= 20000) { S.extra = true; S.lives++; snd.extra(); }
        if (S.score > S.hi) S.hi = S.score;
        if (x != null) pops.push({ x, y, s: String(n), t: 45 });
      }
      function resetActors() {
        st = { x: 112, y: FLOOR, vy: 0, ground: PLATS[0], dir: 1, anim: 0, dead: false, dt: 0, drop: null, sprayT: 0, inv: 90 };
        dk = { y: DK_TOP0, hit: 0, lunge: 0, anim: 0, out: false };
        bees = []; parts = []; stings = []; nuts = []; cats = []; pops = [];
        beeT = 90; nutT = 360; catT = 400; superT = 0;
        if (can && can.st !== 'hang') can = null;
      }
      function startStage() {
        flowers = FLOWER_X.map(x => ({ x, y: FLOOR - 2, st: 'ok', vy: 0 }));
        can = { x: DK_X, y: 26, st: 'hang', t: 0, vy: 0 };
        resetActors();
        S.bonus = Math.min(8000, 5000 + loop() * 1000); bonusTick = 0;
        S.mode = 'intro'; S.t = 0; snd.start();
      }
      function startGame() { S.score = 0; S.lives = 3; S.stage = 0; S.extra = false; startStage(); }
      function gameOver() { api.setHiScore(S.score); S.hi = Math.max(S.hi, api.getHiScore(0)); S.mode = 'gameover'; S.t = 0; }

      // ---- bees ----
      function spawnBee() {
        const k = kind(), lp = loop();
        let type = 'buzz';
        const r = Math.random();
        if (k >= 1 && r < 0.35) type = 'spy';
        if (k === 2 && r > 0.82) type = 'queen';
        if (lp > 0 && r < 0.5 && type === 'buzz') type = 'spy';
        const h = HIVES[Math.random() < 0.5 ? 0 : 1];
        bees.push({
          type, x: h.x, y: h.y, vx: 0, vy: 1, st: 'fly', tx: 30 + Math.random() * 164, ty: 60 + Math.random() * 70,
          t: 50 + Math.random() * 110, hp: type === 'queen' ? 4 : 1, flower: null, anim: Math.random() * 10 | 0,
          sp: (type === 'queen' ? 0.8 : type === 'spy' ? 1.35 : 1.1) * (1 + lp * 0.15 + S.stage * 0.02), shotT: 120
        });
      }
      function steer(b, tx, ty, sp, k) {
        const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
        b.vx += (dx / d * sp - b.vx) * k; b.vy += (dy / d * sp - b.vy) * k;
        return d;
      }
      function updBee(b) {
        b.anim++;
        const wob = Math.sin(b.anim * 0.15) * 0.25;
        if (b.st === 'fly') {
          const d = steer(b, b.tx, b.ty, b.sp, 0.06);
          if (d < 8) { b.tx = 16 + Math.random() * 192; b.ty = 50 + Math.random() * 90; }
          if (--b.t <= 0) {
            if (b.type === 'buzz') {
              const free = flowers.filter(f => f.st === 'ok' && !bees.some(o => o.target === f));
              if (free.length) { b.target = free[Math.random() * free.length | 0]; b.st = 'dive'; }
              else b.t = 120;
            } else { b.st = 'swoop'; b.tx = st.x + (Math.random() - 0.5) * 30; b.ty = Math.min(FLOOR - 10, st.y - 12); }
          }
          if (b.type !== 'buzz' && --b.shotT <= 0) {
            b.shotT = Math.max(50, (b.type === 'queen' ? 90 : 150) - S.stage * 4);
            const n = b.type === 'queen' ? 3 : 1;
            for (let i = 0; i < n; i++) stings.push({ x: b.x, y: b.y + 4, vx: (i - (n - 1) / 2) * 0.5 + (st.x - b.x) * 0.004, vy: 1.3 + loop() * 0.2 });
          }
        } else if (b.st === 'dive') {
          const f = b.target;
          if (!f || f.st !== 'ok') { b.st = 'fly'; b.t = 60; b.target = null; }
          else if (steer(b, f.x, f.y - 8, b.sp * 1.1, 0.08) < 4) {
            f.st = 'taken'; b.flower = f; b.target = null; b.st = 'carry'; snd.steal();
            const h = HIVES[b.x < W / 2 ? 0 : 1]; b.tx = h.x; b.ty = -20;
          }
        } else if (b.st === 'carry') {
          steer(b, b.tx, b.ty, b.sp * 0.8, 0.05);
          if (b.flower) { b.flower.x = b.x; b.flower.y = b.y + 9; }
          if (b.y < -10) { if (b.flower) b.flower.st = 'gone'; b.dead = true; }
        } else if (b.st === 'swoop') {
          const d = steer(b, b.tx, b.ty, b.sp * 1.4, 0.07);
          if (d < 10 || b.y > FLOOR - 14) { b.st = 'fly'; b.tx = 16 + Math.random() * 192; b.ty = 50 + Math.random() * 50; b.t = 140 + Math.random() * 120; }
        }
        b.x += b.vx; b.y += b.vy + wob;
        b.x = Math.max(4, Math.min(W - 4, b.x));
      }
      function killBee(b) {
        b.dead = true;
        const pts = b.type === 'queen' ? 800 : b.type === 'spy' ? 200 : 100;
        addScore(pts, b.x, b.y - 8); snd.bee();
        if (b.flower) { b.flower.st = 'falling'; b.flower.vy = 0; b.flower = null; }
      }

      // ---- player ----
      function updStan() {
        const s = st;
        s.anim++;
        if (s.inv > 0) s.inv--;
        if (s.dead) { s.dt++; return; }
        const sp = superT > 0 ? 1.6 : 1.3;
        if (api.key('ArrowLeft')) { s.x -= sp; s.dir = -1; }
        if (api.key('ArrowRight')) { s.x += sp; s.dir = 1; }
        s.x = Math.max(7, Math.min(W - 7, s.x));
        if (s.ground) {
          if (api.pressed('ArrowUp')) { s.vy = -4.45; s.ground = null; snd.jump(); }
          else if (api.pressed('ArrowDown') && !s.ground.floor) { s.drop = s.ground; s.ground = null; s.vy = 0.5; }
          else if (!s.ground.floor && (s.x < s.ground.x0 - 2 || s.x > s.ground.x1 + 2)) { s.ground = null; s.vy = 0; }
        }
        if (!s.ground) {
          s.vy = Math.min(4, s.vy + 0.2);
          const ny = s.y + s.vy;
          if (s.vy > 0) {
            for (const p of PLATS) {
              if (p === s.drop) continue;
              if (s.y <= p.y && ny >= p.y && s.x >= p.x0 - 2 && s.x <= p.x1 + 2) { s.y = p.y; s.vy = 0; s.ground = p; s.drop = null; break; }
            }
          }
          if (!s.ground) s.y = ny;
          if (s.drop && s.y > s.drop.y + 6) s.drop = null;
        }
        // spray
        if (s.sprayT > 0) s.sprayT--;
        if (api.key('Space') && s.sprayT <= 0 && (superT > 0 || parts.length < 7)) {
          const sup = superT > 0;
          s.sprayT = sup ? 3 : 5;
          const n = sup ? 3 : 1;
          for (let i = 0; i < n; i++) {
            parts.push({
              x: s.x + 2 + (i - (n - 1) / 2) * 4, y: s.y - 22, vx: (i - (n - 1) / 2) * 0.35 + (Math.random() - 0.5) * 0.3,
              vy: sup ? -4.2 : -3.2, life: sup ? 40 : 37, push: sup ? 2 : 0.6, r: 2
            });
          }
          if ((s.anim & 3) === 0) snd.spray();
        }
      }
      function killStan() {
        if (st.dead || st.inv > 0) return;
        st.dead = true; st.dt = 0; S.mode = 'dying'; S.t = 0; snd.die();
      }

      // ---- update play ----
      function updatePlay() {
        updStan();
        const lp = loop();
        if (superT > 0) superT--;
        // bonus timer
        if (++bonusTick >= 120) { bonusTick = 0; S.bonus = Math.max(0, S.bonus - 100); }
        // DK descends
        dk.anim++;
        if (dk.hit > 0) dk.hit--;
        let rate = 0.03 + S.stage * 0.004 + lp * 0.01;
        if (S.bonus === 0) rate *= 2;
        if (dk.lunge > 0) { dk.lunge--; rate += 0.6; }
        else if (dk.hit === 0 && Math.random() < 0.002 + S.stage * 0.0004) { dk.lunge = 16; snd.roar(); }
        dk.y += rate;
        if (dk.y < 4) { dk.y = 4; stageClear(); return; }
        if (dk.y + 40 >= DK_LIMIT) { dk.y = DK_LIMIT - 40; killStan(); return; }
        // super spray can
        if (can) {
          can.t++;
          if (can.st === 'hang' && dk.y < 32) { can.st = 'fall'; can.vy = 0; can.x = DK_X - 30; snd.can(); }
          else if (can.st === 'fall') {
            can.vy = Math.min(3, can.vy + 0.12); can.y += can.vy;
            for (const p of PLATS) if (can.y - can.vy <= p.y && can.y >= p.y && can.x >= p.x0 && can.x <= p.x1) { can.y = p.y; can.st = 'ground'; can.t = 0; }
          } else if (can.st === 'ground' && can.t > 600) can = null;
          if (can && can.st !== 'hang' && Math.abs(can.x - st.x) < 10 && Math.abs(can.y - 6 - (st.y - 10)) < 14 && !st.dead) {
            superT = 600; can = null; addScore(500, st.x, st.y - 30); snd.can();
          }
        }
        // spawns
        if (--beeT <= 0) {
          beeT = Math.max(45, 150 - S.stage * 6 - lp * 20);
          if (bees.length < 3 + Math.min(4, S.stage + lp)) spawnBee();
        }
        if (--nutT <= 0) {
          nutT = Math.max(150, (kind() ? 330 : 420) - S.stage * 15);
          const side = Math.random() < 0.5 ? -1 : 1;
          nuts.push({ x: DK_X + side * 22, y: dk.y + 26, vx: (st.x - DK_X) * 0.006, vy: 0.6 });
        }
        if ((kind() === 1 || lp > 0) && --catT <= 0) {
          catT = Math.max(300, 700 - S.stage * 20);
          const side = Math.random() < 0.5 ? 0 : 1;
          if (!cats.some(c => c.side === side)) cats.push({ side, x: side ? VINE_R : VINE_L, y: 20, st: 'down', t: 0 });
        }
        if (bees.length && (api.frame % 50) === 0) snd.buzz();
        for (const b of bees) updBee(b);
        // spray particles
        for (const p of parts) {
          p.x += p.vx; p.y += p.vy; p.vy *= 0.985; p.life--; p.r = Math.min(5, p.r + 0.08);
          if (p.life <= 0) { p.dead = true; continue; }
          if (Math.abs(p.x - DK_X) < 24 && p.y > dk.y + 4 && p.y < dk.y + 42) {
            p.dead = true; dk.y -= p.push; dk.hit = 6; dk.lunge = 0;
            if ((api.frame & 7) === 0) { snd.hitDK(); addScore(10); }
            continue;
          }
          for (const b of bees) {
            if (b.dead) continue;
            const r = b.type === 'queen' ? 12 : 7;
            if (Math.abs(p.x - b.x) < r && Math.abs(p.y - b.y) < r) {
              p.dead = true; b.hp -= superT > 0 ? 4 : 1;
              if (b.hp <= 0) killBee(b); else { snd.pop(); b.vy -= 1; }
              break;
            }
          }
          if (p.dead) continue;
          for (const n of nuts) if (!n.dead && Math.abs(p.x - n.x) < 6 && Math.abs(p.y - n.y) < 6) { p.dead = true; if (superT > 0) { n.dead = true; addScore(50, n.x, n.y); snd.pop(); } }
          for (const c of cats) if (!c.dead && Math.abs(p.x - c.x) < 7 && p.y > c.y - 4 && p.y < c.y + 18) { c.dead = true; p.dead = true; addScore(100, c.x, c.y); snd.bee(); }
          for (const s of stings) if (!s.dead && Math.abs(p.x - s.x) < 4 && Math.abs(p.y - s.y) < 5) { s.dead = true; p.dead = true; }
        }
        for (const s of stings) { s.x += s.vx; s.y += s.vy; if (s.y > FLOOR) s.dead = true; }
        for (const n of nuts) {
          n.vy = Math.min(2.6, n.vy + 0.05); n.x += n.vx; n.y += n.vy;
          if (n.y > FLOOR - 3) n.dead = true;
        }
        for (const c of cats) {
          c.t++;
          if (c.st === 'down') {
            c.y += 0.32 + lp * 0.08;
            if (c.y > FLOOR - 26) {
              const f = flowers[c.side ? 4 : 0];
              if (f.st === 'ok') { c.st = 'eat'; c.t = 0; } else c.st = 'up';
            }
          } else if (c.st === 'eat') {
            if (c.t > 110) { const f = flowers[c.side ? 4 : 0]; if (f.st === 'ok') { f.st = 'gone'; snd.steal(); } c.st = 'up'; }
          } else { c.y -= 0.5; if (c.y < 10) c.dead = true; }
        }
        for (const f of flowers) {
          if (f.st === 'falling') {
            f.vy = Math.min(2, f.vy + 0.08); f.y += f.vy;
            const home = FLOWER_X[flowers.indexOf(f)];
            f.x += (home - f.x) * 0.05;
            if (f.y >= FLOOR - 2) { f.y = FLOOR - 2; f.x = home; f.st = 'ok'; }
          }
        }
        // collisions with Stanley
        if (!st.dead) {
          const sy = st.y - 10;
          const near = (x, y, rx, ry) => Math.abs(x - st.x) < rx && Math.abs(y - sy) < ry;
          for (const b of bees) if (!b.dead && near(b.x, b.y, b.type === 'queen' ? 12 : 7, b.type === 'queen' ? 14 : 10)) { if (superT > 0) killBee(b); else killStan(); }
          for (const s of stings) if (!s.dead && near(s.x, s.y, 4, 9)) killStan();
          for (const n of nuts) if (!n.dead && near(n.x, n.y, 6, 10)) killStan();
          for (const c of cats) if (!c.dead && near(c.x, c.y + 8, 7, 16)) killStan();
          if (Math.abs(st.x - DK_X) < 20 && st.y - 22 < dk.y + 40) killStan();
        }
        bees = bees.filter(b => !b.dead); parts = parts.filter(p => !p.dead); stings = stings.filter(s => !s.dead);
        nuts = nuts.filter(n => !n.dead); cats = cats.filter(c => !c.dead);
      }
      function stageClear() {
        S.mode = 'clear'; S.t = 0; snd.clear();
        dk.out = true;
        for (const b of bees) if (b.flower) { b.flower.st = 'falling'; b.flower.vy = 0; }
        bees = []; stings = []; nuts = []; cats = []; parts = [];
      }

      function update() {
        S.t++;
        if (coinFlash > 0) coinFlash--;
        if (pops) { for (const p of pops) p.t--; pops = pops.filter(p => p.t > 0); }
        if (S.mode === 'title') {
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; au.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (S.mode === 'gameover') { if (S.t > 240 || (S.t > 60 && api.anyPressed('Enter'))) { S.mode = 'title'; S.t = 0; } return; }
        if (S.mode === 'intro') { if (S.t > 140) { S.mode = 'play'; S.t = 0; } return; }
        if (S.mode === 'clear') {
          dk.y -= 0.7; dk.anim++;
          for (const f of flowers) if (f.st === 'falling') { f.y = FLOOR - 2; f.x = FLOWER_X[flowers.indexOf(f)]; f.st = 'ok'; }
          if (S.t === 90) { addScore(S.bonus); }
          if (S.t === 130) { const n = flowers.filter(f => f.st === 'ok').length; if (n) addScore(n * 300); }
          if (S.t > 230) { S.stage++; startStage(); }
          return;
        }
        if (S.mode === 'dying') {
          st.dt++;
          if (S.t > 150) {
            S.lives--;
            for (const b of bees) if (b.flower) { b.flower.st = 'falling'; b.flower.vy = 0; }
            if (S.lives <= 0) {
              S.mode = 'wait';
              const cont = () => { S.lives = 3; resetActors(); S.mode = 'intro'; S.t = 60; };
              if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver();
            } else { resetActors(); for (const f of flowers) if (f.st === 'falling' || f.st === 'taken') { f.st = 'ok'; f.x = FLOWER_X[flowers.indexOf(f)]; f.y = FLOOR - 2; } S.mode = 'intro'; S.t = 60; }
          }
          return;
        }
        if (S.mode === 'wait') return;
        updatePlay();
      }

      // ---- render ----
      function drawBackground(ctx) {
        const k = kind();
        const bg = ['#001428', '#140820', '#081a10'][k];
        ctx.fillStyle = bg; ctx.fillRect(0, 16, W, H - 16);
        // greenhouse panes
        ctx.fillStyle = ['#0a3050', '#2a1440', '#14402a'][k];
        for (let x = 0; x < W; x += 28) ctx.fillRect(x, 24, 1, FLOOR - 24);
        for (let y = 24; y < FLOOR; y += 36) ctx.fillRect(0, y, W, 1);
        // roof frame
        ctx.fillStyle = '#6080a0'; ctx.fillRect(0, 20, W, 3);
        // hives
        for (const h of HIVES) {
          ctx.fillStyle = '#c08020';
          for (let i = 0; i < 4; i++) { const w = 10 + i * 3 - (i === 3 ? 6 : 0); ctx.fillRect(h.x - w / 2, h.y - 14 + i * 5, w, 4); }
          ctx.fillStyle = '#ffd060';
          for (let i = 0; i < 4; i++) ctx.fillRect(h.x - 4 + i * 2, h.y - 13 + i * 5, 6, 1);
          ctx.fillStyle = '#301000'; ctx.fillRect(h.x - 2, h.y + 2, 4, 3);
        }
        // vines
        const vine = (x, y0, y1) => {
          for (let y = y0; y < y1; y += 2) {
            const o = Math.round(Math.sin(y * 0.2) * 1.5);
            ctx.fillStyle = '#20a020'; ctx.fillRect(x + o, y, 2, 2);
            if (y % 12 === 0) { ctx.fillStyle = '#60e040'; ctx.fillRect(x + o + (y % 24 ? 2 : -3), y, 3, 2); }
          }
        };
        vine(VINE_L, 24, FLOOR - 20); vine(VINE_R, 24, FLOOR - 20);
        vine(DK_X - 22, 23, Math.max(30, dk.y + 2)); vine(DK_X + 20, 23, Math.max(30, dk.y + 2));
        vine(DK_X - 22, dk.y + 2, DK_LIMIT - 4); vine(DK_X + 20, dk.y + 2, DK_LIMIT - 4);
        // platforms
        for (const p of PLATS) {
          if (p.floor) {
            ctx.fillStyle = '#20a020'; ctx.fillRect(0, FLOOR, W, 3);
            ctx.fillStyle = '#704010'; ctx.fillRect(0, FLOOR + 3, W, H - FLOOR - 3);
            ctx.fillStyle = '#4a2808'; for (let x = 0; x < W; x += 8) ctx.fillRect(x + ((x >> 3) & 1) * 3, FLOOR + 8, 3, 2);
            continue;
          }
          for (let x = p.x0; x < p.x1; x += 8) {
            ctx.fillStyle = '#e0a040'; ctx.fillRect(x, p.y, 8, 4);
            ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x, p.y, 8, 1);
            ctx.fillStyle = '#804010'; ctx.fillRect(x + 7, p.y, 1, 4);
          }
          ctx.fillStyle = '#804010'; ctx.fillRect(p.x0 + 4, p.y + 4, 2, 6); ctx.fillRect(p.x1 - 6, p.y + 4, 2, 6);
        }
      }
      function drawFlower(ctx, f, i) {
        const home = FLOWER_X[i];
        // pot
        ctx.fillStyle = '#c05020'; ctx.fillRect(home - 5, FLOOR - 6, 10, 6);
        ctx.fillStyle = '#ff8040'; ctx.fillRect(home - 6, FLOOR - 7, 12, 2);
        if (f.st === 'gone') return;
        const x = f.st === 'ok' ? home : f.x, y = f.st === 'ok' ? FLOOR - 2 : f.y;
        ctx.fillStyle = '#30c030'; ctx.fillRect(x, y - 16, 1, 11); ctx.fillRect(x - 3, y - 10, 3, 2); ctx.fillRect(x + 1, y - 8, 3, 2);
        const col = ['#ff3070', '#ffd000', '#ff80ff', '#40c0ff', '#ff8000'][i];
        ctx.fillStyle = col;
        ctx.fillRect(x - 3, y - 21, 7, 3); ctx.fillRect(x - 1, y - 23, 3, 7);
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y - 20, 1, 1);
      }
      function drawDK(ctx) {
        const img = dk.hit > 0 && (dk.hit & 2) ? SP.dkHit : ((dk.anim >> 4) & 1 ? SP.dk2 : SP.dk);
        const sway = dk.lunge > 0 ? ((dk.lunge >> 1) & 1) * 2 - 1 : 0;
        blit(ctx, img, DK_X - 26 + sway, dk.y - 2);
      }
      function drawStan(ctx) {
        const s = st;
        if (s.inv > 0 && (s.inv >> 2) & 1) return;
        if (s.dead) {
          const r = s.dt < 60 ? (s.dt >> 3) & 3 : 0;
          ctx.save(); ctx.translate(s.x, s.y - 8); ctx.rotate(r * Math.PI / 2);
          ctx.drawImage(SP.stan, -7, -8); ctx.restore();
          return;
        }
        const moving = api.key('ArrowLeft') || api.key('ArrowRight');
        const img = superT > 0 && (superT > 120 || (superT >> 3) & 1) ? SP.stanS : (moving && (s.anim >> 3) & 1 ? SP.stanW : SP.stan);
        blit(ctx, img, s.x - 7, s.y - 16, s.dir < 0);
        // spray pump pointing up
        ctx.fillStyle = superT > 0 ? '#ff40ff' : '#c0c0d0';
        ctx.fillRect(s.x + 1, s.y - 22, 3, 8);
        ctx.fillStyle = '#606070'; ctx.fillRect(s.x + 2, s.y - 25, 1, 3);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 16);
        text(ctx, '1UP', 16, 1, '#ff3030'); text(ctx, String(S.score).padStart(6, '0'), 8, 9, '#fff');
        text(ctx, 'HI-SCORE', 112, 1, '#ff3030', 1, 'center'); text(ctx, String(S.hi).padStart(6, '0'), 112, 9, '#fff', 1, 'center');
        if (S.mode !== 'title') {
          ctx.fillStyle = '#2040e0'; ctx.fillRect(172, 0, 46, 16);
          text(ctx, 'BONUS', 195, 1, '#ffd000', 1, 'center'); text(ctx, String(S.bonus), 195, 9, '#fff', 1, 'center');
          for (let i = 0; i < Math.min(5, S.lives - 1); i++) { ctx.fillStyle = '#3070f0'; ctx.fillRect(4 + i * 7, H - 9, 5, 7); ctx.fillStyle = '#ffb878'; ctx.fillRect(4 + i * 7, H - 11, 5, 3); }
          text(ctx, 'L=' + String(S.stage + 1).padStart(2, '0'), W - 4, H - 9, '#40e0ff', 1, 'right');
        }
      }
      function drawField(ctx) {
        drawBackground(ctx);
        flowers.forEach((f, i) => drawFlower(ctx, f, i));
        if (can) {
          const x = can.x, y = can.st === 'hang' ? can.y : can.y - 10;
          if (can.st === 'hang') { ctx.fillStyle = '#20a020'; ctx.fillRect(x, 20, 1, y - 20); }
          if (can.st !== 'ground' || can.t < 480 || (can.t >> 3) & 1) {
            ctx.fillStyle = '#3060ff'; ctx.fillRect(x - 4, y, 9, 11);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y + 3, 9, 1); text(ctx, 'S', x - 2, y + 4, '#ffd000');
            ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 1, y - 3, 3, 3);
          }
        }
        if (!(S.mode === 'clear' && dk.y < -50)) drawDK(ctx);
        for (const c of cats) {
          for (let i = 0; i < 5; i++) {
            const yy = c.y + i * 4, xx = c.x + Math.round(Math.sin((c.t + i * 8) * 0.2) * 1.5);
            ctx.fillStyle = i === 4 ? '#ff4040' : (i & 1 ? '#40e040' : '#20a020'); ctx.fillRect(xx - 3, yy, 6, 4);
            ctx.fillStyle = '#c0ff80'; ctx.fillRect(xx - 3, yy, 2, 1);
          }
          ctx.fillStyle = '#fff'; ctx.fillRect(c.x - 2, c.y + 17, 1, 1); ctx.fillRect(c.x + 1, c.y + 17, 1, 1);
        }
        for (const n of nuts) {
          ctx.fillStyle = '#804020'; ctx.beginPath(); ctx.arc(n.x, n.y, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#c08040'; ctx.fillRect(n.x - 2, n.y - 2, 2, 1);
        }
        for (const s of stings) { ctx.fillStyle = (api.frame & 2) ? '#fff' : '#ffd000'; ctx.fillRect(s.x - 1, s.y - 2, 2, 4); }
        for (const b of bees) {
          const set = SP[b.type], img = set[(b.anim >> 2) & 1];
          blit(ctx, img, b.x - img.width / 2, b.y - img.height / 2, b.vx < 0);
        }
        for (const p of parts) {
          ctx.fillStyle = superT > 0 ? ((p.life & 2) ? '#ff80ff' : '#ffffff') : ((p.life & 2) ? '#c0ffe0' : '#ffffff');
          const r = p.r | 0;
          ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r);
        }
        if (st) drawStan(ctx);
        for (const p of pops) text(ctx, p.s, p.x, p.y - (45 - p.t) * 0.3, '#fff', 1, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#001428'; ctx.fillRect(0, 16, W, H - 16);
        const big = (s, y, col) => { text(ctx, s, W / 2 + 2, y + 2, '#600020', 3, 'center'); text(ctx, s, W / 2, y, col, 3, 'center'); };
        big('DONKEY', 30, '#ffd000'); big('KONG', 56, '#ffd000'); big('3', 82, '#ff3070');
        blit(ctx, (S.t >> 4) & 1 ? SP.dk2 : SP.dk, W / 2 - 26, 108);
        ctx.fillStyle = '#20a020'; ctx.fillRect(W / 2 - 23, 104, 2, 46); ctx.fillRect(W / 2 + 21, 104, 2, 46);
        blit(ctx, SP.buzz[(S.t >> 2) & 1], 34, 166); text(ctx, '100', 52, 166, '#fff');
        blit(ctx, SP.spy[(S.t >> 2) & 1], 34, 178); text(ctx, '200', 52, 178, '#fff');
        blit(ctx, SP.queen[(S.t >> 2) & 1], 112, 166); text(ctx, '800', 136, 170, '#fff');
        text(ctx, 'SPRAY DK UP THE VINES!', W / 2, 194, '#80ffc0', 1, 'center');
        const blink = (S.t % 60) < 40;
        if (coinFlash > 0) { if ((coinFlash >> 3) & 1) text(ctx, 'INSERT COIN', W / 2, 210, '#ff4040', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 210, '#40e8ff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 210, '#40e8ff', 1, 'center');
        text(ctx, '\u00a9 1983 NINTENDO', W / 2, 226, '#fff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 242, '#aaa', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (S.mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawField(ctx);
        drawHUD(ctx);
        if (S.mode === 'intro') {
          ctx.fillStyle = '#000'; ctx.fillRect(52, 100, 120, 30);
          text(ctx, 'LEVEL ' + (S.stage + 1), W / 2, 106, '#fff', 1, 'center');
          text(ctx, ['GREENHOUSE', 'CATERPILLARS', 'QUEEN BEES'][kind()], W / 2, 118, '#ffd000', 1, 'center');
        }
        if (S.mode === 'clear' && S.t > 80) {
          ctx.fillStyle = '#000'; ctx.fillRect(40, 100, 144, 32);
          text(ctx, 'BONUS ' + S.bonus, W / 2, 106, '#ffd000', 1, 'center');
          if (S.t > 130) text(ctx, 'FLOWERS x' + flowers.filter(f => f.st === 'ok').length + ' x300', W / 2, 118, '#ff80ff', 1, 'center');
        }
        if (S.mode === 'gameover') {
          ctx.fillStyle = '#000'; ctx.fillRect(56, 110, 112, 26);
          text(ctx, 'GAME OVER', W / 2, 116, '#fff', 2, 'center');
        }
      }
      // initial placeholders so the title can render
      flowers = FLOWER_X.map(x => ({ x, y: FLOOR - 2, st: 'ok', vy: 0 })); can = null; resetActors();
      return { update, render, destroy() { } };
    }
  });
})();
