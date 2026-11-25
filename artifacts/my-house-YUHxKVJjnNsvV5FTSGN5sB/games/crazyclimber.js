// Crazy Climber (Nichibutsu, 1980) - scale four skyscrapers hand over hand: closing windows, flowerpots, girders, King Kong and the rooftop helicopter.
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

  ArcadeRegistry.register({
    id: 'crazyclimber', title: 'Crazy Climber', year: 1980, maker: 'Nichibutsu',
    width: 224, height: 256, vector: false, pointer: false,
    controls: 'Up/Down: move hands (climb) \u00b7 Left/Right: shift column \u00b7 Enter: start',
    marquee: { bg: '#101848', fg: '#ffd040', accent: '#ff4040' },
    create(api) {
      const W = 224, H = 256, A = api.audio;
      const CW = 24, RH = 20, MAXC = 8;
      const rnd = n => Math.floor(Math.random() * n);
      const BUILDINGS = [
        { rows: 56, cols: 7, col: '#d8c8a0', dark: '#a89870', set: [] },
        { rows: 68, cols: 8, col: '#a0c8a0', dark: '#709870', set: [[36, 1, 6]] },
        { rows: 80, cols: 8, col: '#a8b8e0', dark: '#7888b0', set: [[28, 0, 5], [56, 1, 4]] },
        { rows: 92, cols: 8, col: '#e0a8b0', dark: '#b07880', set: [[30, 1, 7], [60, 2, 5]] }
      ];

      let hi = api.getHiScore(30000);
      let state = 'title', T = 0, score = 0, lives = 3, bnum = 0, loop = 0, nextExtra = 30000;
      let B = null, win = [], cl = null, camH = 0, objs = [], kong = null, bird = null, balloon = null, heli = null, popups = [];
      let bonus = 0, maxH = 0, gameOverT = 0, coinFlash = 0, lastCred = api.credits, kongT = 0, balloonT = 0, girderT = 0, birdT = 0;
      let musicT = 0, musicI = 0;

      // ---------- sound ----------
      const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
      const THEME = [72, 74, 76, 77, 79, 0, 79, 0, 81, 79, 77, 76, 74, 0, 72, 0, 74, 76, 77, 79, 81, 0, 81, 0, 83, 81, 79, 77, 76, 0, 0, 0];
      function music() {
        if (++musicT < 11) return;
        musicT = 0;
        const n = THEME[musicI % THEME.length];
        if (n) A.tone(NOTE(n), 0.15, { type: 'square', vol: 0.035 });
        if (musicI % 2 === 0) A.tone(NOTE([48, 55, 53, 55][(musicI >> 3) & 3]), 0.16, { type: 'triangle', vol: 0.07 });
        musicI++;
      }
      const sfx = {
        step(h) { A.tone(h ? 520 : 440, 0.04, { type: 'square', vol: 0.06 }); },
        bump() { A.tone(110, 0.06, { type: 'square', vol: 0.1 }); },
        shut() { A.noise(0.08, { vol: 0.16, freq: 1500 }); A.tone(180, 0.06, { type: 'square', vol: 0.08 }); },
        whistle() { A.tone(1800, 0.5, { type: 'sine', vol: 0.06, slideTo: 600 }); },
        bonk() { A.noise(0.12, { vol: 0.2, freq: 900 }); A.tone(300, 0.15, { type: 'square', vol: 0.1, slideTo: 150 }); },
        fall() { A.tone(900, 1.4, { type: 'square', vol: 0.1, slideTo: 80 }); A.noise(0.3, { vol: 0.2, freq: 400, delay: 1.4 }); },
        roar() { A.noise(0.7, { vol: 0.2, freq: 300, slideTo: 120 }); A.tone(90, 0.7, { type: 'sawtooth', vol: 0.12, slideTo: 60 }); },
        punch() { A.noise(0.2, { vol: 0.25, freq: 500 }); },
        warn() { A.tone(1000, 0.08, { type: 'square', vol: 0.07 }); },
        heli() { A.noise(0.1, { vol: 0.08, freq: 250 }); },
        balloon() { A.melody([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.2]], { type: 'triangle', vol: 0.12 }); },
        clear() { A.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2], [988, 0.1], [1047, 0.1], [1175, 0.1], [1319, 0.4]], { type: 'square', vol: 0.12 }); },
        start() { A.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.24], [659, 0.12], [784, 0.36]], { type: 'square', vol: 0.12 }); },
        extra() { A.melody([[1047, 0.08], [1319, 0.08], [1568, 0.16]], { type: 'square', vol: 0.12 }); }
      };
      function addScore(n, x, y) {
        score += n; if (score > hi) hi = score;
        if (x != null) popups.push({ x, y, t: 50, txt: String(n) });
        if (score >= nextExtra) { lives++; nextExtra += 50000; sfx.extra(); }
      }

      // ---------- building geometry ----------
      const x0 = () => Math.round((W - B.cols * CW) / 2);
      function colRange(r) {
        let lo = 0, hiC = B.cols - 1;
        for (const [from, a, b] of B.set) if (r >= from) { lo = a; hiC = b; }
        return [lo, hiC];
      }
      const inRange = (c, r) => { const [a, b] = colRange(r); return c >= a && c <= b && r >= 0 && r < B.rows; };
      const W_ = (c, r) => win[r * MAXC + c];
      function isClosed(c, r) {
        if (r < 0 || r >= B.rows) return false;
        const w = W_(c, r);
        return w.s === 3 || (w.s === 2 && w.t < 8) || (w.s === 4 && w.t > 4);
      }
      const gripRow = h => Math.floor(h / 2) + 1;
      // can a hand take hold at row r of column c? (the roof ledge counts)
      const canGrip = (c, r) => r === B.rows ? inRange(c, B.rows - 1) : inRange(c, r) && !isClosed(c, r);
      const bodyRow = h => Math.floor(h / 2);
      const colX = c => x0() + c * CW + CW / 2;
      const sy = r => Math.round(H - 20 - (r - camH) * RH);

      function genBuilding() {
        B = BUILDINGS[bnum % 4];
        win = [];
        const closedP = Math.min(0.4, 0.12 + bnum * 0.05 + loop * 0.06);
        for (let r = 0; r < B.rows; r++) for (let c = 0; c < MAXC; c++) {
          const closed = r > 3 && Math.random() < closedP;
          win.push({ s: closed ? 3 : 0, t: closed ? 200 + rnd(400) : 0, thrower: 0 });
        }
        objs = []; kong = null; bird = null; balloon = null; heli = null; popups = [];
        bonus = 4000 + (bnum % 4) * 1000 + loop * 2000;
        kongT = 600 + rnd(400); balloonT = 1500 + rnd(900); girderT = 300; birdT = 400 + rnd(300);
        cl = { c: Math.floor(B.cols / 2), h: 0, step: null, lat: null, hand: 0, stun: 0, lx: 0 };
        maxH = 0; camH = 0;
        state = 'ready'; T = 0; sfx.start();
      }
      function newGame() { score = 0; lives = 3; bnum = 0; loop = 0; nextExtra = 30000; genBuilding(); }
      const diff = () => (bnum % 4) + loop * 2;

      // ---------- climber ----------
      const moving = () => !!(cl.step || cl.lat);
      function climberRow() { return cl.h / 2 + (cl.step && cl.step.t >= 8 ? cl.step.dir * (cl.step.t - 8) / 16 : 0); }
      function climberX() { return colX(cl.c) + (cl.lat ? (cl.lat.to - cl.c) * CW * cl.lat.t / 12 : 0); }
      function updateClimber() {
        const U = api.key('ArrowUp'), D = api.key('ArrowDown'), L = api.key('ArrowLeft'), R = api.key('ArrowRight');
        if (cl.stun > 0) { cl.stun--; return; }
        if (cl.step) {
          const s = cl.step; s.t++;
          if (s.t === 8 && s.dir > 0 && !canGrip(cl.c, gripRow(cl.h + 1))) { cl.step = null; sfx.bump(); return; }
          if (s.t >= 16) {
            cl.h += s.dir; cl.step = null; cl.hand ^= 1; sfx.step(cl.hand);
            if (cl.h > maxH) { maxH = cl.h; addScore(10); }
          }
          return;
        }
        if (cl.lat) {
          if (++cl.lat.t >= 12) { cl.c = cl.lat.to; cl.lat = null; sfx.step(1); }
          return;
        }
        const top = (B.rows - 1) * 2;
        if (U) {
          const g = gripRow(cl.h + 1);
          if (cl.h < top && canGrip(cl.c, g)) cl.step = { dir: 1, t: 0 };
          else if ((T & 15) === 0) sfx.bump();
        } else if (D) {
          if (cl.h > 0) cl.step = { dir: -1, t: 0 };
        } else if (L || R) {
          const to = cl.c + (L ? -1 : 1), br = bodyRow(cl.h), g = gripRow(cl.h);
          if (inRange(to, br) && inRange(to, g) && !isClosed(to, g)) cl.lat = { to, t: 0 };
          else if ((T & 15) === 0) sfx.bump();
        }
      }
      function knockOff(reason) {
        if (state !== 'play') return;
        state = 'falling'; T = 0; cl.fallReason = reason; cl.fallY = 0; cl.step = null; cl.lat = null; sfx.fall();
      }
      function hitByObject(o) {
        if (balloon && balloon.lift) return;
        if (o.heavy || moving()) { knockOff(o.kind); return; }
        cl.stun = 40; sfx.bonk(); popups.push({ x: climberX(), y: sy(climberRow() + 2), t: 40, txt: 'OUCH!' });
      }

      // ---------- windows ----------
      function updateWindows() {
        const cr = bodyRow(cl.h);
        const rate = 0.025 + diff() * 0.008;
        if (Math.random() < rate) {
          const r = cr + rnd(9) - 1;
          const [a, b] = colRange(r);
          const c = Math.random() < 0.5 ? Math.max(a, Math.min(b, cl.c + rnd(3) - 1)) : a + rnd(b - a + 1);
          if (r >= 2 && r < B.rows) {
            const w = W_(c, r);
            if (w.s === 0 && !w.thrower) { w.s = 1; w.t = 40; }
            else if (w.s === 3 && w.t > 60) w.t = 30;
          }
        }
        const lo = Math.max(0, cr - 4), hiR = Math.min(B.rows - 1, cr + 14);
        for (let r = lo; r <= hiR; r++) for (let c = 0; c < B.cols; c++) {
          const w = W_(c, r);
          if (w.thrower > 0) {
            if (--w.thrower === 0) {
              objs.push({ kind: Math.random() < 0.5 ? 'pot' : 'bucket', c, r: r + 0.2, vy: 0.1 + diff() * 0.01, heavy: false });
              sfx.whistle();
            }
          }
          if (w.s === 0) continue;
          w.t--;
          if (w.s === 1 && w.t <= 0) {
            w.s = 2; w.t = 12; sfx.shut();
            if (c === cl.c && r === gripRow(cl.h) && !cl.lat) {
              if (moving()) knockOff('window');
              else if (cl.h > 0) { cl.h--; cl.stun = 20; sfx.bonk(); }
            }
          } else if (w.s === 2 && w.t <= 0) { w.s = 3; w.t = 180 + rnd(300) - diff() * 10; }
          else if (w.s === 3 && w.t <= 0) { w.s = 4; w.t = 12; }
          else if (w.s === 4 && w.t <= 0) { w.s = 0; w.t = 0; }
        }
      }
      // residents throwing flowerpots from open windows above the climber
      function maybeThrow() {
        const rate = 0.0045 + diff() * 0.003;
        if (T < 240 || Math.random() >= rate || objs.filter(o => o.kind === 'pot' || o.kind === 'bucket').length >= 1 + (diff() >> 1)) return;
        const cr = bodyRow(cl.h), r = cr + 4 + rnd(4);
        if (r >= B.rows) return;
        const [a, b] = colRange(r);
        const c = Math.max(a, Math.min(b, cl.c + (Math.random() < 0.6 ? 0 : rnd(3) - 1)));
        const w = W_(c, r);
        if (w.s === 0 && !w.thrower) { w.thrower = 50; }
      }

      // ---------- hazards ----------
      function updateHazards() {
        const cr = bodyRow(cl.h), cx = climberX(), crow = climberRow();
        // falling objects
        for (const o of objs) {
          if (o.warn > 0) { o.warn--; if ((o.warn & 7) === 0) sfx.warn(); continue; }
          o.r -= o.vy;
          const ox = o.kind === 'girder' ? colX(o.c) + CW / 2 : colX(o.c);
          const halfW = o.kind === 'girder' ? CW : 8;
          if (state === 'play' && Math.abs(ox - cx) < halfW && o.r < crow + 1.6 && o.r > crow - 0.2 && !o.done) { o.done = true; hitByObject(o); }
          if (o.r < cr - 6) o.done = true;
        }
        objs = objs.filter(o => !o.done && o.r > cr - 6);
        // girders (building 3+)
        if (bnum % 4 >= 2 || loop > 0) {
          if (--girderT <= 0) {
            girderT = Math.max(180, 420 - diff() * 30) + rnd(200);
            const r = cr + 9;
            const [a, b] = colRange(Math.min(B.rows - 1, r));
            const c = Math.max(a, Math.min(b - 1, cl.c - rnd(2)));
            objs.push({ kind: 'girder', c, r, vy: 0.16 + diff() * 0.01, heavy: true, warn: 50 });
          }
        }
        // bird with droppings
        if (--birdT <= 0 && !bird) { bird = { x: Math.random() < 0.5 ? -16 : W + 16, t: 0, dropped: false }; bird.vx = bird.x < 0 ? 1.1 : -1.1; birdT = 500 + rnd(500) - diff() * 30; }
        if (bird) {
          bird.x += bird.vx; bird.t++;
          if (!bird.dropped && Math.abs(bird.x - cx) < 3) { bird.dropped = true; objs.push({ kind: 'egg', c: cl.c, r: cr + 8, vy: 0.14, heavy: false }); }
          if (bird.x < -30 || bird.x > W + 30) bird = null;
        }
        // King Kong (buildings 2 and 4)
        if ((bnum % 4 === 1 || bnum % 4 === 3 || loop > 0) && !kong && --kongT <= 0) {
          const [a, b] = colRange(Math.min(B.rows - 1, cr + 3));
          kong = { side: cl.c - a < b - cl.c ? -1 : 1, r: cr + 3, t: 0, cols: [] };
          kong.cols = kong.side < 0 ? [a, a + 1] : [b - 1, b];
          kongT = 900 + rnd(600) - diff() * 40;
        }
        if (kong) {
          kong.t++;
          if (kong.t === 50) sfx.roar();
          if (kong.t === 90 || kong.t === 170) sfx.punch();
          const punching = (kong.t >= 90 && kong.t < 110) || (kong.t >= 170 && kong.t < 190);
          if (punching && state === 'play' && !(balloon && balloon.lift) && kong.cols.includes(cl.c) && crow > kong.r - 3.5 && crow < kong.r + 1) knockOff('kong');
          if (kong.t > 240 || kong.r < cr - 6) kong = null;
        }
        // lucky balloon
        if (!balloon && --balloonT <= 0) {
          const r = cr + 9; const [a, b] = colRange(Math.min(B.rows - 1, r));
          balloon = { c: a + rnd(b - a + 1), r, t: 0 };
          balloonT = 2000 + rnd(1000);
        }
        if (balloon) {
          if (balloon.lift) {
            balloon.t++;
            if (balloon.t % 6 === 0 && cl.h < (B.rows - 1) * 2 - 2) { cl.h++; if (cl.h > maxH) { maxH = cl.h; addScore(10); } }
            balloon.r = climberRow() + 2;
            if (balloon.t > 100 || cl.h >= (B.rows - 1) * 2 - 2) {
              // make sure the climber has somewhere to hold on
              for (let r = bodyRow(cl.h) - 1; r <= bodyRow(cl.h) + 2; r++) if (r >= 0 && r < B.rows) { const w = W_(cl.c, r); w.s = 0; w.t = 0; }
              balloon = null; cl.stun = 0;
            }
          } else {
            balloon.r -= 0.05; balloon.t++;
            if (state === 'play' && Math.abs(colX(balloon.c) - cx) < 10 && Math.abs(balloon.r - (crow + 1.8)) < 0.8) {
              balloon.lift = true; balloon.t = 0; cl.step = null; cl.lat = null; cl.c = balloon.c; addScore(1000, cx, sy(crow + 3)); sfx.balloon();
            } else if (balloon.r < cr - 6) balloon = null;
          }
        }
      }

      function updatePlay() {
        if (T % 20 === 0 && bonus > 0) bonus -= 10;
        const liftLock = balloon && balloon.lift;
        if (!liftLock) updateClimber();
        updateWindows();
        maybeThrow();
        updateHazards();
        const target = climberRow() - 3.5;
        camH += (Math.max(-1, target) - camH) * 0.1;
        if (cl.h >= (B.rows - 1) * 2 && state === 'play') { state = 'heli'; T = 0; heli = { y: -30, grab: false }; sfx.clear(); }
        music();
      }
      function respawn() {
        objs = []; kong = null; bird = null;
        const cr = bodyRow(cl.h);
        for (let r = cr - 1; r <= cr + 3; r++) if (r >= 0 && r < B.rows) for (let c = 0; c < B.cols; c++) { const w = W_(c, r); w.s = 0; w.t = 0; w.thrower = 0; }
        cl.stun = 0; cl.step = null; cl.lat = null;
        state = 'ready'; T = 60;
      }

      // ---------- main update ----------
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
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) newGame();
            break;
          case 'ready':
            camH += (Math.max(-1, climberRow() - 3.5) - camH) * 0.2;
            if (T > 150) { state = 'play'; T = 0; }
            break;
          case 'play': updatePlay(); break;
          case 'falling':
            cl.fallY += Math.min(6, T * 0.15);
            if (T > 120) {
              lives--;
              const over = () => { state = 'gameover'; gameOverT = 0; api.setHiScore(score); };
              if (lives <= 0) {
                if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over);
                else over();
              } else respawn();
            }
            break;
          case 'heli':
            if (T % 8 === 0) sfx.heli();
            if (!heli.grab) { heli.y = Math.min(sy(B.rows) - 40, heli.y + 1.5); if (heli.y >= sy(B.rows) - 40) { heli.grab = true; heli.gt = 0; } }
            else {
              heli.gt++;
              if (heli.gt === 30) { addScore(bonus, W / 2, 120); popups.push({ x: W / 2, y: 132, t: 120, txt: 'BONUS' }); }
              if (heli.gt > 60) heli.y -= 1.5;
              if (heli.gt > 200) { bnum++; if (bnum % 4 === 0) loop++; genBuilding(); }
            }
            break;
          case 'gameover':
            gameOverT++;
            if (gameOverT > 240 || (gameOverT > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawResident(ctx, x, y, withPot) {
        ctx.fillStyle = '#ffc890'; ctx.fillRect(x + 6, y + 3, 8, 8);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 7, y + 6, 2, 1); ctx.fillRect(x + 11, y + 6, 2, 1); ctx.fillRect(x + 8, y + 9, 4, 1);
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x + 5, y + 11, 10, 3);
        if (withPot) { ctx.fillStyle = '#c05020'; ctx.fillRect(x + 7, y - 1, 6, 4); ctx.fillStyle = '#30c040'; ctx.fillRect(x + 8, y - 3, 4, 2); }
      }
      function drawBuilding(ctx) {
        const bx = x0();
        const rTop = Math.min(B.rows - 1, Math.floor(camH) + 14), rBot = Math.max(0, Math.floor(camH) - 1);
        for (let r = rBot; r <= rTop; r++) {
          const [a, b] = colRange(r), y = sy(r + 1);
          ctx.fillStyle = B.col; ctx.fillRect(bx + a * CW - 4, y, (b - a + 1) * CW + 8, RH);
          ctx.fillStyle = B.dark; ctx.fillRect(bx + a * CW - 4, y + RH - 2, (b - a + 1) * CW + 8, 2);
          // setback ledge
          if (r + 1 < B.rows) { const [na, nb] = colRange(r + 1); if (na !== a || nb !== b) { ctx.fillStyle = '#606060'; ctx.fillRect(bx + a * CW - 6, y - 2, (b - a + 1) * CW + 12, 3); } }
          for (let c = a; c <= b; c++) {
            const wx = bx + c * CW + 4, wy = y + 3, w = W_(c, r);
            ctx.fillStyle = B.dark; ctx.fillRect(wx - 1, wy - 1, 18, 16);
            ctx.fillStyle = '#18204a'; ctx.fillRect(wx, wy, 16, 14);
            ctx.fillStyle = '#3a4a8a'; ctx.fillRect(wx + 1, wy + 1, 3, 2);
            let shut = 0;
            if (w.s === 1) drawResident(ctx, wx - 2, wy, false);
            if (w.thrower > 0 && w.s === 0) drawResident(ctx, wx - 2, wy, true);
            if (w.s === 2) shut = 1 - w.t / 12; else if (w.s === 3) shut = 1; else if (w.s === 4) shut = w.t / 12;
            if (shut > 0) {
              const sh = Math.round(14 * shut);
              ctx.fillStyle = '#e8e0c8'; ctx.fillRect(wx, wy, 16, sh);
              ctx.fillStyle = '#a09880'; for (let i = 2; i < sh; i += 3) ctx.fillRect(wx, wy + i, 16, 1);
            }
            ctx.fillStyle = '#ffffff'; ctx.fillRect(wx - 1, wy + 14, 18, 1);
          }
          if ((r % 10) === 0 && r > 0) text(ctx, String(r), bx + a * CW - 3 - String(r).length * 6, y + 6, '#ffffff');
        }
        // roof & helipad
        const ry = sy(B.rows);
        if (ry > -20) {
          const [a, b] = colRange(B.rows - 1);
          ctx.fillStyle = '#505050'; ctx.fillRect(bx + a * CW - 8, ry - 4, (b - a + 1) * CW + 16, 4);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(bx + ((a + b + 1) / 2) * CW - 8, ry - 6, 16, 2);
          text(ctx, 'H', bx + ((a + b + 1) / 2) * CW - 2, ry - 14, '#ffd040');
        }
        // street
        const gy = sy(0);
        if (gy < H + 10) {
          ctx.fillStyle = '#404048'; ctx.fillRect(0, gy, W, H - gy + 10);
          ctx.fillStyle = '#ffffff'; for (let x = 4; x < W; x += 24) ctx.fillRect(x, gy + 10, 12, 2);
          ctx.fillStyle = '#806040'; ctx.fillRect(bx + 3 * CW + 2, gy - 18, 20, 18);
        }
      }
      function drawClimber(ctx) {
        let x = Math.round(climberX()), y = sy(climberRow());
        if (state === 'falling') y += Math.round(cl.fallY);
        const shake = cl.stun > 0 ? ((T >> 1) & 1) * 2 - 1 : 0;
        x += shake;
        const s = cl.step, ph = s ? s.t : 0;
        // which hand is reaching: hand 0 = left, 1 = right
        let lh = -22, rh = -22;
        if (s && s.dir > 0) {
          const reach = ph < 8 ? ph / 8 : 1 - (ph - 8) / 8;
          if (cl.hand === 0) lh -= Math.round(reach * 10); else rh -= Math.round(reach * 10);
        } else if (s && s.dir < 0) {
          const reach = ph < 8 ? ph / 8 : 1 - (ph - 8) / 8;
          if (cl.hand === 0) lh += Math.round(reach * 8); else rh += Math.round(reach * 8);
        }
        if (state === 'falling') { lh = -26 + ((T >> 2) & 1) * 4; rh = -26 + ((T >> 2) & 3) * 2; }
        const body = '#3050ff', skin = '#ffc890', hair = '#202020', pants = '#ff4040';
        // arms
        ctx.fillStyle = body;
        ctx.fillRect(x - 7, y + lh + 2, 3, -lh - 13); ctx.fillRect(x + 4, y + rh + 2, 3, -rh - 13);
        ctx.fillStyle = skin; ctx.fillRect(x - 8, y + lh, 4, 3); ctx.fillRect(x + 4, y + rh, 4, 3);
        // head (seen from behind)
        ctx.fillStyle = hair; ctx.fillRect(x - 3, y - 22, 6, 6);
        ctx.fillStyle = skin; ctx.fillRect(x - 3, y - 17, 6, 1);
        // torso
        ctx.fillStyle = body; ctx.fillRect(x - 5, y - 16, 10, 9);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 16, 2, 9);
        // legs
        const lstep = s ? (cl.hand ? 1 : -1) * Math.round((ph < 8 ? ph : 16 - ph) / 3) : 0;
        ctx.fillStyle = pants; ctx.fillRect(x - 5, y - 7, 4, 8 + lstep); ctx.fillRect(x + 1, y - 7, 4, 8 - lstep);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y + 1 + lstep, 5, 2); ctx.fillRect(x + 1, y + 1 - lstep, 5, 2);
        if (cl.stun > 0) { ctx.fillStyle = '#ffd040'; for (let i = 0; i < 3; i++) { const a = T * 0.2 + i * 2.1; ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y - 25 + Math.sin(a) * 2), 2, 2); } }
      }
      function drawObjs(ctx) {
        for (const o of objs) {
          if (o.done) continue;
          if (o.warn > 0) {
            if ((o.warn >> 2) & 1) { const x = colX(o.c) + CW / 2; ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 10, 22, 20, 3); ctx.beginPath(); ctx.moveTo(x - 6, 27); ctx.lineTo(x + 6, 27); ctx.lineTo(x, 34); ctx.closePath(); ctx.fill(); }
            continue;
          }
          const y = sy(o.r);
          if (o.kind === 'girder') {
            const x = colX(o.c) - 10;
            ctx.fillStyle = '#c03020'; ctx.fillRect(x, y - 6, CW + 20, 6);
            ctx.fillStyle = '#601810'; for (let i = 0; i < CW + 20; i += 6) ctx.fillRect(x + i, y - 5, 3, 4);
          } else if (o.kind === 'egg') {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(colX(o.c) - 2, y - 5, 4, 5);
          } else if (o.kind === 'pot') {
            const x = colX(o.c);
            ctx.fillStyle = '#c05020'; ctx.fillRect(x - 4, y - 6, 8, 6); ctx.fillRect(x - 5, y - 7, 10, 2);
            ctx.fillStyle = '#30c040'; ctx.fillRect(x - 3, y - 10, 2, 3); ctx.fillRect(x + 1, y - 11, 2, 4);
            ctx.fillStyle = '#ff3060'; ctx.fillRect(x + 1, y - 12, 2, 2);
          } else {
            const x = colX(o.c);
            ctx.fillStyle = '#8090a0'; ctx.fillRect(x - 4, y - 7, 8, 7);
            ctx.fillStyle = '#c0d0e0'; ctx.fillRect(x - 4, y - 7, 8, 1); ctx.fillRect(x - 3, y - 10, 6, 1);
          }
        }
      }
      function drawKong(ctx) {
        if (!kong) return;
        const bx = x0();
        const edge = kong.side < 0 ? bx + kong.cols[0] * CW - 4 : bx + (kong.cols[1] + 1) * CW + 4;
        const enter = Math.min(1, kong.t / 40), leave = kong.t > 210 ? (kong.t - 210) / 30 : 0;
        const off = (1 - enter + leave) * 40;
        const x = Math.round(edge - kong.side * 6 + kong.side * off), y = sy(kong.r);
        const d = -kong.side; // direction facing into the building
        const fur = '#6a3a18', face = '#c08860';
        ctx.fillStyle = fur;
        ctx.fillRect(x - 16, y - 36, 32, 34);
        ctx.fillRect(x - 10, y - 46, 20, 12);
        ctx.fillStyle = face; ctx.fillRect(x - 7, y - 42, 14, 8); ctx.fillRect(x - 8, y - 26, 16, 12);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 40, 3, 2); ctx.fillRect(x + 2, y - 40, 3, 2);
        const roar = kong.t > 50 && kong.t < 80;
        ctx.fillStyle = roar ? '#c00000' : '#000'; ctx.fillRect(x - 3, y - 36, 6, roar ? 3 : 1);
        // arms: one grips the building, one punches
        const punching = (kong.t >= 90 && kong.t < 110) || (kong.t >= 170 && kong.t < 190);
        ctx.fillStyle = fur;
        ctx.fillRect(d > 0 ? x + 12 : x - 26, y - 34, 14, 7);
        if (punching) { ctx.fillRect(d > 0 ? x + 10 : x - 46, y - 18, 36, 8); ctx.fillStyle = face; ctx.fillRect(d > 0 ? x + 44 : x - 50, y - 19, 8, 10); }
        else { ctx.fillRect(d > 0 ? x + 8 : x - 18, y - 22, 10, 16); }
      }
      function drawSky(ctx) {
        ctx.fillStyle = '#101848'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1c2860';
        for (let i = 0; i < 6; i++) { const bh = 60 + ((i * 37) % 70), y = Math.round(H - 20 - bh + camH * 6); ctx.fillRect(i * 40 - 4, y, 30, bh + 400); }
        ctx.fillStyle = '#c0c8ff';
        for (let i = 0; i < 30; i++) { const y = ((i * 41 + Math.round(camH * 3)) % H); ctx.fillRect((i * 67) % W, y, 1, 1); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 20);
        text(ctx, '1UP', 4, 2, '#ff4040'); text(ctx, pad(score, 6), 4, 11, '#fff');
        text(ctx, 'HI-SCORE', 80, 2, '#ff4040'); text(ctx, pad(hi, 6), 86, 11, '#fff');
        text(ctx, 'BONUS', 170, 2, '#ffd040'); text(ctx, pad(Math.max(0, bonus), 5), 170, 11, '#fff');
        ctx.fillStyle = '#000'; ctx.fillRect(0, H - 10, W, 10);
        for (let i = 0; i < Math.min(6, lives - 1); i++) { ctx.fillStyle = '#3050ff'; ctx.fillRect(4 + i * 9, H - 8, 6, 4); ctx.fillStyle = '#202020'; ctx.fillRect(5 + i * 9, H - 10, 4, 3); ctx.fillStyle = '#ff4040'; ctx.fillRect(4 + i * 9, H - 4, 6, 3); }
        text(ctx, 'BLDG ' + (bnum + 1), W - 4, H - 8, '#40c0ff', 1, 'right');
        if (B) {
          const pct = Math.min(1, cl.h / ((B.rows - 1) * 2));
          ctx.fillStyle = '#303060'; ctx.fillRect(W - 6, 26, 3, 100);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(W - 7, 26 + Math.round((1 - pct) * 96), 5, 4);
        }
      }
      function drawHeli(ctx) {
        if (!heli) return;
        const x = W / 2, y = Math.round(heli.y);
        ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x - 14, y - 8, 28, 12); ctx.fillRect(x + 14, y - 5, 20, 4); ctx.fillRect(x + 32, y - 9, 3, 8);
        ctx.fillStyle = '#40a0ff'; ctx.fillRect(x - 12, y - 6, 9, 6);
        ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 14, y + 1, 28, 2);
        ctx.fillStyle = '#808080'; ctx.fillRect(x - 1, y - 12, 2, 4); const bl = (T >> 1) & 1 ? 24 : 12; ctx.fillRect(x - bl, y - 13, bl * 2, 1);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 10, y + 6, 20, 1);
        if (heli.grab) {
          ctx.fillStyle = '#c0a060'; ctx.fillRect(x - 1, y + 7, 1, 16);
          ctx.fillStyle = '#3050ff'; ctx.fillRect(x - 4, y + 23, 8, 9); ctx.fillStyle = '#202020'; ctx.fillRect(x - 3, y + 17, 6, 6); ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 4, y + 32, 8, 7);
        }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#101848'; ctx.fillRect(0, 0, W, H);
        text(ctx, '1UP', 4, 2, '#ff4040'); text(ctx, pad(score, 6), 4, 11, '#fff');
        text(ctx, 'HI-SCORE', 80, 2, '#ff4040'); text(ctx, pad(hi, 6), 86, 11, '#fff');
        // building
        ctx.fillStyle = '#d8c8a0'; ctx.fillRect(52, 110, 120, 146);
        for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
          const closed = ((r * 3 + c * 5 + (T >> 5)) % 7) === 0;
          ctx.fillStyle = closed ? '#e8e0c8' : '#18204a'; ctx.fillRect(58 + c * 23, 116 + r * 20, 16, 14);
        }
        const cy = 236 - ((T >> 1) % 120);
        ctx.fillStyle = '#3050ff'; ctx.fillRect(104, cy - 16, 10, 9); ctx.fillStyle = '#202020'; ctx.fillRect(106, cy - 22, 6, 6); ctx.fillStyle = '#ff4040'; ctx.fillRect(104, cy - 7, 10, 8);
        ctx.fillStyle = '#ffc890'; ctx.fillRect(100 + ((T >> 3) & 1) * 0, cy - 30 + ((T >> 3) & 1) * 6, 4, 3); ctx.fillRect(114, cy - 24 - ((T >> 3) & 1) * 6, 4, 3);
        text(ctx, 'CRAZY', W / 2 + 2, 30, '#802000', 4, 'center'); text(ctx, 'CRAZY', W / 2, 28, '#ffd040', 4, 'center');
        text(ctx, 'CLIMBER', W / 2 + 2, 62, '#800000', 3, 'center'); text(ctx, 'CLIMBER', W / 2, 60, '#ff4040', 3, 'center');
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (T >> 2) & 1 : (T >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 90, coinFlash ? '#ff4040' : '#fff', 1, 'center'); }
        else if ((T >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 90, '#fff', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, H - 22, W, 22);
        text(ctx, '\u00a9 1980 NICHIBUTSU', W / 2, H - 20, '#c0c0c0', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 9, '#fff');
      }
      function render(ctx) {
        if (state === 'title') { drawTitle(ctx); return; }
        drawSky(ctx);
        drawBuilding(ctx);
        if (balloon) {
          const bx = colX(balloon.c), by = sy(balloon.r);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, 1, 10);
          ctx.fillStyle = '#ff40a0'; ctx.beginPath(); ctx.arc(bx, by - 6, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffd0e8'; ctx.fillRect(bx - 4, by - 10, 2, 2);
        }
        if (state !== 'heli' || !heli.grab) drawClimber(ctx);
        drawObjs(ctx);
        drawKong(ctx);
        if (bird) {
          const x = Math.round(bird.x), y = 36 + Math.round(Math.sin(bird.t * 0.1) * 3), f = (bird.t >> 3) & 1;
          ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 4, y, 8, 4); ctx.fillRect(x + (bird.vx > 0 ? 4 : -7), y - 1, 3, 3);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x + (bird.vx > 0 ? 7 : -9), y, 2, 1);
          ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 8, y + (f ? -4 : 3), 16, 2);
        }
        drawHeli(ctx);
        for (const q of popups) text(ctx, q.txt, Math.round(q.x), Math.round(q.y - (50 - q.t) * 0.3), '#fff', 1, 'center');
        drawHUD(ctx);
        if (state === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 100, 100, 24);
          text(ctx, 'BUILDING ' + (bnum + 1), W / 2, 104, '#ffd040', 1, 'center');
          text(ctx, 'READY', W / 2, 115, '#fff', 1, 'center');
        }
        if (state === 'heli' && heli.grab) { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 140, 120, 13); text(ctx, 'NICE CLIMBING!', W / 2, 143, (T >> 3) & 1 ? '#ffd040' : '#ff4040', 1, 'center'); }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, 110, 80, 13); text(ctx, 'GAME OVER', W / 2, 113, '#ff4040', 1, 'center'); }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
