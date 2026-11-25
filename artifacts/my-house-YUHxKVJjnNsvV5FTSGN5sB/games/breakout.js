// Breakout (Atari, 1976) \u2014 B&W monitor with coloured cellophane overlay bands.
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
  // Breakout-style block score digits (TTL segment look)
  const SEG = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcfgd'];
  function segDigit(ctx, n, x, y, w, h, t) {
    const s = SEG[n];
    if (s.includes('a')) ctx.fillRect(x, y, w, t);
    if (s.includes('g')) ctx.fillRect(x, y + (h - t) / 2, w, t);
    if (s.includes('d')) ctx.fillRect(x, y + h - t, w, t);
    if (s.includes('f')) ctx.fillRect(x, y, t, (h + t) / 2);
    if (s.includes('b')) ctx.fillRect(x + w - t, y, t, (h + t) / 2);
    if (s.includes('e')) ctx.fillRect(x, y + (h - t) / 2, t, (h + t) / 2);
    if (s.includes('c')) ctx.fillRect(x + w - t, y + (h - t) / 2, t, (h + t) / 2);
  }
  function segNumber(ctx, n, x, y, digits) {
    let s = String(n); while (s.length < digits) s = '0' + s;
    for (let i = 0; i < s.length; i++) segDigit(ctx, +s[i], x + i * 14, y, 10, 17, 3);
  }

  ArcadeRegistry.register({
    id: 'breakout', title: 'Breakout', year: 1976, maker: 'Atari',
    width: 224, height: 256, vector: false, pointer: true,
    controls: 'Mouse / Arrows: paddle \u00b7 Space/Click: serve \u00b7 Enter: start',
    marquee: { bg: '#101010', fg: '#ff5a2a', accent: '#2ad04a' },
    create(api) {
      const W = 224, H = 256;
      const WALL = 7;                       // side wall thickness
      const TOPW = 30;                      // y of top wall's lower edge
      const COLS = 14, ROWS = 8;
      const BW = (W - WALL * 2) / COLS;     // 15
      const BH = 6, BY0 = 54;               // brick row pitch and top of wall
      const PY = 226, PH = 4, PW_FULL = 20, PW_HALF = 10;
      const BALLS = 5;
      const ROW_PTS = [7, 7, 7, 7, 4, 4, 1, 1];
      // overlay bands (cellophane): red, orange, green, yellow over brick rows; blue over paddle zone
      const BANDS = [
        [BY0, BY0 + BH * 2, '#ff3b2a'], [BY0 + BH * 2, BY0 + BH * 4, '#ff9a1a'],
        [BY0 + BH * 4, BY0 + BH * 6, '#28d44a'], [BY0 + BH * 6, BY0 + BH * 8, '#ffe830'],
        [PY - 12, PY + 14, '#3aa8ff']
      ];
      const SPEED = [1.35, 1.75, 2.15, 2.6];
      // ball direction by the 8 paddle segments (dx per unit speed), steeper at the edges
      const SEGDX = [-1.3, -0.95, -0.6, -0.3, 0.3, 0.6, 0.95, 1.3];

      let state = 'attract';  // attract | serve | play | lost | over
      let hi = api.getHiScore(0);
      let score, balls, ballNo, bricks, wall, hits, spd, reachedOrange, reachedRed, shrunk, paddleW;
      let px = W / 2 - PW_FULL / 2, ball = null, timer = 0, demo = true, lastMX = api.mouse.x, mouseActive = false;
      let blinkMsg = 0;
      let coinFlash = 0;   // coin-op: INSERT COIN flash after a start attempt with no credit

      function buildWall() {
        bricks = [];
        for (let r = 0; r < ROWS; r++) { bricks.push(new Array(COLS).fill(true)); }
        reachedOrange = reachedRed = false;
      }
      function resetGame(isDemo) {
        demo = isDemo; score = 0; ballNo = 1; wall = 1; shrunk = false; paddleW = PW_FULL;
        buildWall(); hits = 0; spd = 0; ball = null;
        state = 'serve'; timer = isDemo ? 40 : 60;
      }
      function serve() {
        hits = 0; spd = 0; shrunk = false; paddleW = PW_FULL;
        const dir = Math.random() < 0.5 ? -1 : 1;
        ball = { x: WALL + 20 + Math.random() * (W - WALL * 2 - 40), y: BY0 + BH * 8 + 18, dx: dir * 0.6, dy: 1 };
        norm(); state = 'play';
        api.audio.tone(880, 0.05, { vol: 0.12 });
      }
      function norm() {
        const s = SPEED[spd];
        const l = Math.hypot(ball.dx, ball.dy);
        ball.vx = ball.dx / l * s; ball.vy = ball.dy / l * s;
      }
      function setSpeed(level) { if (level > spd) { spd = level; norm(); } }
      resetGame(true);

      const snd = {
        brick(r) { api.audio.tone([1180, 1180, 990, 990, 780, 780, 620, 620][r], 0.05, { type: 'square', vol: 0.16 }); },
        paddle() { api.audio.tone(460, 0.04, { type: 'square', vol: 0.18 }); },
        wall() { api.audio.tone(230, 0.035, { type: 'square', vol: 0.16 }); },
        lose() { api.audio.tone(150, 0.45, { type: 'square', vol: 0.18, slideTo: 60 }); }
      };

      function bricksLeft() { let n = 0; for (const row of bricks) for (const b of row) if (b) n++; return n; }

      function stepBall() {
        // sub-step to avoid tunnelling
        const n = Math.ceil(Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) / 0.9);
        for (let i = 0; i < n; i++) {
          ball.x += ball.vx / n; ball.y += ball.vy / n;
          // side walls
          if (ball.x < WALL) { ball.x = WALL; ball.vx = Math.abs(ball.vx); ball.dx = Math.abs(ball.dx); snd.wall(); }
          if (ball.x > W - WALL - 3) { ball.x = W - WALL - 3; ball.vx = -Math.abs(ball.vx); ball.dx = -Math.abs(ball.dx); snd.wall(); }
          // top wall
          if (ball.y < TOPW) {
            ball.y = TOPW; ball.vy = Math.abs(ball.vy); ball.dy = Math.abs(ball.dy); snd.wall();
            if (reachedRed && !shrunk) { shrunk = true; paddleW = PW_HALF; }
          }
          // bricks
          const cx = ball.x + 1.5, cy = ball.y + 1.5;
          const r = Math.floor((cy - BY0) / BH), c = Math.floor((cx - WALL) / BW);
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS && bricks[r][c]) {
            // brick rect occupies BW-1 x BH-2 (gaps between bricks)
            bricks[r][c] = false;
            score += ROW_PTS[r];
            snd.brick(r);
            ball.vy = -ball.vy; ball.dy = -ball.dy;
            ball.y += ball.vy / n * 2;
            if (r <= 3 && !reachedOrange) { reachedOrange = true; setSpeed(2); }
            if (r <= 1 && !reachedRed) { reachedRed = true; setSpeed(3); }
            if (score > hi && !demo) { hi = score; }
            if (bricksLeft() === 0) {
              if (wall === 1) { wall = 2; buildWall(); api.audio.melody([[523, .08], [659, .08], [784, .08], [1047, .2]], { vol: 0.12 }); }
              else { endGame(true); return; }
            }
            break;
          }
          // paddle
          if (ball.vy > 0 && ball.y + 3 >= PY && ball.y + 3 <= PY + PH + 1 && ball.x + 3 >= px && ball.x <= px + paddleW) {
            let seg = Math.floor((ball.x + 1.5 - px) / (paddleW / 8));
            seg = Math.max(0, Math.min(7, seg));
            ball.dx = SEGDX[seg]; ball.dy = -1;
            hits++;
            if (hits === 4) spd = Math.max(spd, 1);
            if (hits === 12) spd = Math.max(spd, 2);
            norm(); ball.y = PY - 3;
            snd.paddle();
            break;
          }
          if (ball.y > H) {
            snd.lose(); state = 'lost'; timer = 90; ball = null; return;
          }
        }
      }
      function endGame(cleared) {
        state = 'over'; timer = cleared ? 360 : 300; ball = null;
        if (!demo) { if (score >= hi) { hi = score; } api.setHiScore(score); }
        if (!demo) api.audio.melody(cleared ? [[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .4]] : [[392, .2], [311, .2], [262, .5]], { vol: 0.13 });
      }

      function update() {
        if (Math.abs(api.mouse.x - lastMX) > 0.5) mouseActive = true;
        lastMX = api.mouse.x;
        const startPressed = api.anyPressed('Enter') || ((state === 'attract' || demo) && (api.pressed('Space') || api.mouse.clicked));
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (demo && startPressed) {
          if (api.useCredit()) { resetGame(false); blinkMsg = 0; coinFlash = 0; return; }
          coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.25 });
        }

        // paddle movement
        if (demo) {
          if (ball) { const t = ball.x + 1.5 - paddleW / 2 + Math.sin(api.time * 1.3) * paddleW * 0.35; px += Math.max(-3, Math.min(3, t - px)); }
        } else {
          if (api.key('ArrowLeft')) { px -= 3.2; mouseActive = false; }
          if (api.key('ArrowRight')) { px += 3.2; mouseActive = false; }
          if (mouseActive) px = api.mouse.x - paddleW / 2;
        }
        px = Math.max(WALL, Math.min(W - WALL - paddleW, px));

        if (state === 'serve') {
          timer--;
          if (demo ? timer <= 0 : (timer <= 0 && (api.anyPressed('Space', 'ArrowUp') || api.mouse.clicked || timer < -180))) serve();
        } else if (state === 'play') {
          stepBall();
        } else if (state === 'lost') {
          if (--timer <= 0) {
            if (ballNo >= BALLS) {
              if (demo) resetGame(true);
              // continue: back to ball 1 with the score and the wall exactly as left; normal serve follows
              else if (api.offerContinue) api.offerContinue(() => { ballNo = 1; state = 'serve'; timer = 30; }, () => endGame(false));
              else endGame(false);
            }
            else { ballNo++; state = 'serve'; timer = 30; }
          }
        } else if (state === 'over') {
          if (--timer <= 0 || (timer < 240 && api.anyPressed('Space'))) { resetGame(true); }
        }
      }

      function render(ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        // walls
        ctx.fillRect(0, TOPW - 6, W, 6);
        ctx.fillRect(0, TOPW - 6, WALL, H - TOPW + 6);
        ctx.fillRect(W - WALL, TOPW - 6, WALL, H - TOPW + 6);
        // scores: player 1 score left, ball number centre, high score right
        segNumber(ctx, demo ? hi : score, 18, 4, 3);
        segDigit(ctx, Math.min(9, ballNo), W / 2 - 5, 4, 10, 17, 3);
        segNumber(ctx, hi, W - 18 - 38, 4, 3);
        // bricks
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (bricks[r][c]) ctx.fillRect(Math.round(WALL + c * BW), BY0 + r * BH, Math.round(BW) - 1, BH - 2);
        }
        // paddle
        ctx.fillRect(Math.round(px), PY, paddleW, PH);
        // ball
        if (ball && ((api.frame & 1) || true)) ctx.fillRect(Math.round(ball.x), Math.round(ball.y), 3, 3);
        // texts (drawn white, coloured by the overlay like the real cabinet)
        if (demo) {
          if (coinFlash > 0 || state === 'over' || ((api.frame >> 5) % 2 === 0)) {
            ctx.fillStyle = '#000'; ctx.fillRect(48, 150, 128, 46);
            text(ctx, 'BREAKOUT', W / 2, 154, '#fff', 2, 'center');
            if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 174, '#fff', 1, 'center'); }
            else if (api.credits === 0) { if ((api.frame >> 4) & 1) text(ctx, 'INSERT COIN', W / 2, 174, '#fff', 1, 'center'); }
            else text(ctx, 'PUSH START', W / 2, 174, '#fff', 1, 'center');
            text(ctx, BALLS + ' BALLS PER GAME', W / 2, 185, '#fff', 1, 'center');
          }
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 30, 244, 60, 10);
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 246, '#fff', 1, 'center');
        } else if (state === 'serve' && timer < 0 && ((api.frame >> 4) & 1)) {
          text(ctx, 'SPACE TO SERVE', W / 2, 160, '#fff', 1, 'center');
        } else if (state === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(52, 150, 120, 30);
          text(ctx, wall === 2 && bricksLeft() === 0 ? 'CLEARED!' : 'GAME OVER', W / 2, 154, '#fff', 2, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 170, '#fff', 1, 'center');
        }
        // cellophane overlay: multiply colour bands over the B&W picture
        ctx.globalCompositeOperation = 'multiply';
        for (const [y0, y1, col] of BANDS) { ctx.fillStyle = col; ctx.fillRect(0, y0, W, y1 - y0); }
        ctx.globalCompositeOperation = 'source-over';
        // slight phosphor tint on remaining white
      }
      return { update, render };
    }
  });
})();
