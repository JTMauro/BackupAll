// Super Breakout (Atari, 1978) - from-scratch recreation: Double, Cavity and Progressive games.
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

  // ---------- Super Breakout ----------
  ArcadeRegistry.register({
    id: 'superbreakout', title: 'Super Breakout', year: 1978, maker: 'Atari',
    width: 224, height: 256, vector: false, pointer: true,
    controls: 'Mouse / Left-Right: paddle \u00b7 Space/Click: serve \u00b7 Up/Down: select game \u00b7 Enter: start',
    marquee: { bg: '#0a0a16', fg: '#ffb020', accent: '#3cc8ff' },
    create(api) {
      const W = 224, H = 256;
      const WALL = 7, TOPY = 22, COLS = 14, CW = 15, RH = 6, R = 1.5;
      const PY = 238, PY2 = 222, PH = 3, PW_FULL = 22;
      const MODES = ['DOUBLE', 'CAVITY', 'PROGRESSIVE'];
      const MODE_INFO = [
        ['TWO PADDLES - TWO BALLS', 'SCORE DOUBLES WHILE', 'BOTH BALLS ARE IN PLAY'],
        ['TWO BALLS TRAPPED IN', 'CAVITIES. FREE THEM TO', 'MULTIPLY YOUR SCORE'],
        ['THE WALLS KEEP', 'MARCHING DOWN', 'TOWARD YOUR PADDLE']
      ];
      const SPEED = [1.45, 1.8, 2.15, 2.5, 2.85];
      const SEGDX = [-1.4, -1.0, -0.62, -0.28, 0.28, 0.62, 1.0, 1.4];
      const BALLS = 3, BONUS_AT = 1000;
      const PCOL = ['#ff4a3a', '#ff9a20', '#34d45a', '#ffe23a'];   // red, orange, green, yellow
      const PTS = [7, 5, 3, 1];

      let hi = api.getHiScore(0);
      let state = 'attract';      // attract | serve | play | lost | clear | over
      let demo = true, mode = 0, menuSel = 0;
      let score = 0, lives = BALLS, bonusGiven = false, wallNo = 1;
      let grid = [], rows = 8, topY = 44, cavs = [], balls = [];
      let px = W / 2, pw = PW_FULL, shrunk = false, hits = 0, spdLvl = 0, timer = 0;
      let descT = 0, descEvery = 420, insertK = -1, playT = 0;
      let coinFlash = 0, lastMX = api.mouse.x, mouseActive = false, demoT = 0, flashT = 0;

      const snd = {
        brick(band) { api.audio.tone([1240, 1040, 820, 640][band], 0.05, { type: 'square', vol: 0.15 }); },
        paddle() { api.audio.tone(470, 0.04, { type: 'square', vol: 0.17 }); },
        wall() { api.audio.tone(235, 0.03, { type: 'square', vol: 0.13 }); },
        cavity() { api.audio.tone(330, 0.03, { type: 'triangle', vol: 0.06 }); },
        free() { api.audio.melody([[660, .05], [880, .05], [1320, .09]], { type: 'square', vol: 0.14 }); },
        lose() { api.audio.tone(160, 0.5, { type: 'sawtooth', vol: 0.16, slideTo: 50 }); },
        bonus() { api.audio.melody([[784, .07], [988, .07], [1175, .07], [1568, .18]], { type: 'square', vol: 0.14 }); },
        drop() { api.audio.tone(110, 0.08, { type: 'square', vol: 0.12 }); }
      };

      // ---------- wall construction ----------
      function rowFilled(k) { return (((k % 8) + 8) % 8) < 4; }
      function buildWall() {
        grid = []; cavs = [];
        if (mode === 2) {
          rows = 28; topY = 24; insertK = -1;
          for (let r = 0; r < rows; r++) grid.push(new Array(COLS).fill(r < 12 && rowFilled(r) ? 1 : 0));
          descEvery = Math.max(200, 420 - (wallNo - 1) * 40); descT = descEvery;
        } else {
          rows = 8; topY = 44;
          for (let r = 0; r < rows; r++) grid.push(new Array(COLS).fill(1));
          if (mode === 1) {
            cavs = [{ c0: 2, c1: 4, r0: 2, r1: 5 }, { c0: 9, c1: 11, r0: 2, r1: 5 }];
            for (const cv of cavs) {
              for (let r = cv.r0; r <= cv.r1; r++) for (let c = cv.c0; c <= cv.c1; c++) grid[r][c] = 0;
            }
          }
        }
      }
      function addTrappedBalls() {
        balls = balls.filter(b => !b.trapped);
        for (let i = 0; i < cavs.length; i++) {
          const cv = cavs[i];
          balls.push({
            x: WALL + (cv.c0 + 1.5) * CW, y: topY + (cv.r0 + 2) * RH,
            vx: i ? -0.85 : 0.85, vy: 0.75, trapped: true
          });
        }
      }
      function band(r) { return mode === 2 ? 3 - Math.min(3, Math.floor(r / 7)) : Math.min(3, r >> 1); }
      function bricksLeft() { let n = 0; for (const row of grid) for (const b of row) if (b) n++; return n; }
      function cellAt(x, y) {
        const c = Math.floor((x - WALL) / CW), r = Math.floor((y - topY) / RH);
        if (c < 0 || c >= COLS || r < 0 || r >= rows) return null;
        return grid[r][c] ? [r, c] : null;
      }
      function inCavity(b) {
        const c = Math.floor((b.x - WALL) / CW), r = Math.floor((b.y - topY) / RH);
        for (const cv of cavs) if (c >= cv.c0 && c <= cv.c1 && r >= cv.r0 && r <= cv.r1) return true;
        return false;
      }
      function freeCount() { let n = 0; for (const b of balls) if (!b.trapped) n++; return n; }
      function mult() {
        const n = freeCount();
        if (mode === 0) return n >= 2 ? 2 : 1;
        if (mode === 1) return Math.max(1, n);
        return 1;
      }
      function upperActive() { return mode !== 2 && freeCount() >= 2; }

      // ---------- game flow ----------
      function resetGame(isDemo, m) {
        demo = isDemo; mode = m; score = 0; lives = BALLS; bonusGiven = false; wallNo = 1;
        balls = []; buildWall(); if (mode === 1) addTrappedBalls();
        pw = PW_FULL; shrunk = false; playT = 0;
        state = 'serve'; timer = isDemo ? 40 : 70; demoT = 0;
      }
      function speedNorm(b) {
        const s = SPEED[spdLvl], l = Math.hypot(b.vx, b.vy) || 1;
        b.vx = b.vx / l * s; b.vy = b.vy / l * s;
        if (Math.abs(b.vy) < s * 0.35) { b.vy = Math.sign(b.vy || 1) * s * 0.35; const l2 = Math.hypot(b.vx, b.vy); b.vx = b.vx / l2 * s; b.vy = b.vy / l2 * s; }
      }
      function newBall(x) {
        const b = { x, y: mode === 2 ? 120 : topY + rows * RH + 22, vx: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5), vy: 1, trapped: false };
        speedNorm(b); return b;
      }
      function serve() {
        hits = 0; spdLvl = Math.min(1, wallNo - 1); pw = PW_FULL; shrunk = false;
        if (mode === 0) { balls.push(newBall(60 + Math.random() * 30)); balls.push(newBall(W - 60 - Math.random() * 30)); }
        else balls.push(newBall(40 + Math.random() * (W - 80)));
        state = 'play';
        api.audio.tone(880, 0.05, { vol: 0.1 });
      }
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score > hi) hi = score;
        if (!bonusGiven && score >= BONUS_AT) { bonusGiven = true; lives++; snd.bonus(); flashT = 120; }
      }
      function endGame() {
        state = 'over'; timer = 300; balls = [];
        if (!demo) { api.setHiScore(score); api.audio.melody([[392, .2], [311, .2], [262, .5]], { vol: 0.13, type: 'square' }); }
      }
      function setSpd(n) {
        if (n > spdLvl) { spdLvl = Math.min(SPEED.length - 1, n); for (const b of balls) if (!b.trapped) speedNorm(b); }
      }

      function hitBrick(h, b) {
        if (b.trapped) { snd.cavity(); return; }
        const [r, c] = h;
        grid[r][c] = 0;
        const bd = band(r);
        addScore(PTS[bd] * mult());
        snd.brick(bd);
        if (mode !== 2) {
          if (r <= 3) setSpd(2);
          if (r <= 1) setSpd(3);
        } else if (bd === 0) setSpd(3);
      }
      function paddleHit(b, py) {
        let seg = Math.floor((b.x - (px - pw / 2)) / (pw / 8));
        seg = Math.max(0, Math.min(7, seg));
        b.vx = SEGDX[seg]; b.vy = -1;
        hits++;
        if (hits === 4) setSpd(1);
        if (hits === 12) setSpd(2);
        if (mode === 2 && hits === 24) setSpd(3);
        speedNorm(b); b.y = py - R - 0.1;
        snd.paddle();
      }
      function stepBall(b) {
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) / 0.9));
        for (let i = 0; i < n; i++) {
          // horizontal
          const ox = b.x; b.x += b.vx / n;
          let h = cellAt(b.x + Math.sign(b.vx) * R, b.y);
          if (h) { b.x = ox; b.vx = -b.vx; hitBrick(h, b); }
          if (b.x < WALL + R) { b.x = WALL + R; b.vx = Math.abs(b.vx); if (!b.trapped) snd.wall(); }
          if (b.x > W - WALL - R) { b.x = W - WALL - R; b.vx = -Math.abs(b.vx); if (!b.trapped) snd.wall(); }
          // vertical
          const oy = b.y; b.y += b.vy / n;
          h = cellAt(b.x, b.y + Math.sign(b.vy) * R);
          if (h) { b.y = oy; b.vy = -b.vy; hitBrick(h, b); }
          if (b.y < TOPY + R) {
            b.y = TOPY + R; b.vy = Math.abs(b.vy);
            if (!b.trapped) { snd.wall(); if (!shrunk && mode !== 2) { shrunk = true; pw = PW_FULL / 2; } }
          }
          if (b.trapped) {
            if (!inCavity(b) && !cellAt(b.x, b.y)) { b.trapped = false; speedNorm(b); snd.free(); }
            continue;
          }
          // paddles (only on the way down)
          if (b.vy > 0) {
            const pys = upperActive() ? [PY2, PY] : [PY];
            for (const py of pys) {
              if (oy + R <= py + 0.5 && b.y + R >= py && b.x >= px - pw / 2 - R && b.x <= px + pw / 2 + R) { paddleHit(b, py); break; }
            }
          }
        }
      }

      function descend() {
        grid.pop();
        grid.unshift(new Array(COLS).fill(rowFilled(insertK) ? 1 : 0));
        insertK--;
        snd.drop();
        // a ball swallowed by the moving wall breaks the brick it is in
        for (const b of balls) { const h = cellAt(b.x, b.y); if (h) hitBrick(h, b); }
      }

      function demoAI() {
        let tgt = null;
        for (const b of balls) if (!b.trapped && b.vy > 0 && (!tgt || b.y > tgt.y)) tgt = b;
        if (!tgt) for (const b of balls) if (!b.trapped && (!tgt || b.y > tgt.y)) tgt = b;
        const t = tgt ? tgt.x + Math.sin(api.time * 1.7) * pw * 0.3 : W / 2;
        px += Math.max(-3.2, Math.min(3.2, t - px));
      }

      function tryStart() {
        if (api.useCredit()) { resetGame(false, menuSel); coinFlash = 0; return; }
        coinFlash = 100; api.audio.tone(70, 0.25, { type: 'square', vol: 0.22 });
      }

      resetGame(true, 0);

      function update() {
        if (Math.abs(api.mouse.x - lastMX) > 0.5) mouseActive = true;
        lastMX = api.mouse.x;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (flashT > 0) flashT--;

        if (demo) {
          if (api.anyPressed('ArrowUp', 'ArrowLeft')) { menuSel = (menuSel + 2) % 3; snd.wall(); }
          if (api.anyPressed('ArrowDown', 'ArrowRight')) { menuSel = (menuSel + 1) % 3; snd.wall(); }
          if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) { tryStart(); if (!demo) return; }
          demoT++;
          if (demoT > 60 * 40 && state === 'play') { resetGame(true, (mode + 1) % 3); return; }
          demoAI();
        } else {
          if (api.key('ArrowLeft')) { px -= 3.4; mouseActive = false; }
          if (api.key('ArrowRight')) { px += 3.4; mouseActive = false; }
          if (mouseActive) px = api.mouse.x;
        }
        px = Math.max(WALL + pw / 2, Math.min(W - WALL - pw / 2, px));

        // trapped balls keep bouncing in their cavities whatever the state
        if (state !== 'play' && state !== 'over') for (const b of balls) if (b.trapped) stepBall(b);

        if (state === 'serve') {
          timer--;
          const go = demo ? timer <= 0 : (timer <= 0 && (api.anyPressed('Space', 'ArrowUp') || api.mouse.clicked || timer < -200));
          if (go) serve();
        } else if (state === 'play') {
          playT++;
          for (const b of balls.slice()) stepBall(b);
          balls = balls.filter(b => b.y < H + 4);
          if (mode === 2) {
            if (--descT <= 0) { descT = descEvery; descEvery = Math.max(110, descEvery - 8); descend(); }
          } else if (bricksLeft() === 0) {
            state = 'clear'; timer = 100; balls = [];
            if (!demo) api.audio.melody([[523, .08], [659, .08], [784, .08], [1047, .25]], { vol: 0.13, type: 'square' });
            return;
          }
          if (freeCount() === 0) {
            snd.lose(); state = 'lost'; timer = 80;
          }
        } else if (state === 'lost') {
          if (--timer <= 0) {
            lives--;
            if (lives <= 0) {
              if (demo) { resetGame(true, (mode + 1) % 3); return; }
              if (api.offerContinue) {
                lives = 0; state = 'serve'; timer = 1e9;
                api.offerContinue(() => { lives = BALLS; state = 'serve'; timer = 40; }, endGame);
              } else endGame();
            } else { state = 'serve'; timer = 40; }
          }
        } else if (state === 'clear') {
          if (--timer <= 0) {
            wallNo++; buildWall(); if (mode === 1) addTrappedBalls();
            state = 'serve'; timer = demo ? 30 : 50;
          }
        } else if (state === 'over') {
          if (--timer <= 0 || (timer < 220 && api.anyPressed('Enter', 'Space'))) resetGame(true, menuSel);
        }
      }

      // ---------- drawing ----------
      function pad2(n) { return String(Math.min(99, n)).padStart(2, '0'); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        // walls
        ctx.fillStyle = '#9aa0b8';
        ctx.fillRect(0, TOPY - 4, W, 4);
        ctx.fillRect(0, TOPY - 4, WALL, H - TOPY + 4);
        ctx.fillRect(W - WALL, TOPY - 4, WALL, H - TOPY + 4);
        // HUD
        text(ctx, String(demo ? 0 : score).padStart(4, '0'), 10, 6, '#fff', 1);
        text(ctx, 'HI ' + String(hi).padStart(4, '0'), W - 10, 6, '#fff', 1, 'right');
        text(ctx, MODES[mode], W / 2, 6, '#ffb020', 1, 'center');
        // bricks
        for (let r = 0; r < rows; r++) {
          const bd = band(r); ctx.fillStyle = PCOL[bd];
          const row = grid[r];
          for (let c = 0; c < COLS; c++) if (row[c]) ctx.fillRect(WALL + c * CW + 1, topY + r * RH, CW - 1, RH - 1);
        }
        // cavity outlines (faint) so the trapped balls read as caged
        if (mode === 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          for (const cv of cavs) ctx.fillRect(WALL + cv.c0 * CW, topY + cv.r0 * RH, (cv.c1 - cv.c0 + 1) * CW, (cv.r1 - cv.r0 + 1) * RH);
        }
        // progressive: danger line
        if (mode === 2) { ctx.fillStyle = '#331818'; ctx.fillRect(WALL, topY + rows * RH, W - WALL * 2, 1); }
        // paddles
        ctx.fillStyle = '#3cc8ff';
        if (state !== 'over') {
          ctx.fillRect(Math.round(px - pw / 2), PY, pw, PH);
          if (upperActive() || (mode === 0 && state === 'serve')) ctx.fillRect(Math.round(px - pw / 2), PY2, pw, PH);
        }
        // balls
        for (const b of balls) {
          ctx.fillStyle = b.trapped ? '#ffd0a0' : '#fff';
          ctx.fillRect(Math.round(b.x - R), Math.round(b.y - R), 3, 3);
        }
        // remaining balls + multiplier
        if (!demo) {
          ctx.fillStyle = '#fff';
          for (let i = 0; i < Math.min(8, lives - (state === 'play' ? 1 : 0)); i++) ctx.fillRect(10 + i * 5, 248, 3, 3);
          const m = mult();
          if (state === 'play' && m > 1) text(ctx, 'X' + m, W - 10, 246, '#ffe23a', 1, 'right');
          if (flashT > 0 && (flashT >> 3) & 1) text(ctx, 'BONUS BALL', W / 2, 150, '#ffe23a', 1, 'center');
        }
        if (state === 'serve' && !demo && timer < 0 && ((api.frame >> 4) & 1)) text(ctx, 'PRESS SPACE TO SERVE', W / 2, 170, '#fff', 1, 'center');
        if (state === 'clear' && !demo) text(ctx, 'WALL CLEARED', W / 2, 160, '#fff', 1, 'center');
        if (state === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(48, 140, 128, 36);
          text(ctx, 'GAME OVER', W / 2, 146, '#fff', 2, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 164, '#ffb020', 1, 'center');
        }
        if (demo) drawTitle(ctx);
      }
      function drawTitle(ctx) {
        const blink = (api.frame >> 4) & 1;
        ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(20, 104, 184, 124);
        ctx.fillStyle = '#ffb020'; ctx.fillRect(20, 104, 184, 1); ctx.fillRect(20, 227, 184, 1);
        text(ctx, 'SUPER', W / 2, 110, '#ffb020', 2, 'center');
        text(ctx, 'BREAKOUT', W / 2, 127, '#ff4a3a', 2, 'center');
        for (let i = 0; i < 3; i++) {
          const sel = i === menuSel;
          text(ctx, (sel ? '> ' : '  ') + MODES[i] + (sel ? ' <' : '  '), W / 2, 148 + i * 10, sel ? (blink ? '#fff' : '#3cc8ff') : '#8890a0', 1, 'center');
        }
        const info = MODE_INFO[menuSel];
        for (let i = 0; i < 3; i++) text(ctx, info[i], W / 2, 182 + i * 8, '#aab', 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 212, '#fff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 212, '#fff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 212, blink ? '#fff' : '#ffe23a', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 244, W, 12);
        text(ctx, 'CREDIT ' + pad2(api.credits), 10, 246, '#aaa', 1);
        text(ctx, '\u00a9 1978 ATARI', W - 10, 246, '#777', 1, 'right');
        text(ctx, 'BONUS BALL AT ' + BONUS_AT, W / 2, 94, '#777', 1, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
