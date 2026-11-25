// Pong (Atari, 1972) \u2014 faithful-ish recreation. 1P vs CPU or 2P, first to 11.
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

  // ---------- Pong block digits (segment style, like the TTL score generator) ----------
  // segments: a top, b upper-right, c lower-right, d bottom, e lower-left, f upper-left, g middle
  const SEG = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcfgd'];
  function bigDigit(ctx, n, x, y) {
    const t = 4, w = 16, h = 28, s = SEG[n];
    ctx.fillStyle = '#fff';
    if (s.includes('a')) ctx.fillRect(x, y, w, t);
    if (s.includes('g')) ctx.fillRect(x, y + h / 2 - t / 2, w, t);
    if (s.includes('d')) ctx.fillRect(x, y + h - t, w, t);
    if (s.includes('f')) ctx.fillRect(x, y, t, h / 2 + t / 2);
    if (s.includes('b')) ctx.fillRect(x + w - t, y, t, h / 2 + t / 2);
    if (s.includes('e')) ctx.fillRect(x, y + h / 2 - t / 2, t, h / 2 + t / 2);
    if (s.includes('c')) ctx.fillRect(x + w - t, y + h / 2 - t / 2, t, h / 2 + t / 2);
  }
  function bigNumber(ctx, n, cx, y) {
    const s = String(n);
    const total = s.length * 16 + (s.length - 1) * 8;
    let x = Math.round(cx - total / 2);
    for (const ch of s) { bigDigit(ctx, +ch, x, y); x += 24; }
  }

  ArcadeRegistry.register({
    id: 'pong', title: 'Pong', year: 1972, maker: 'Atari',
    width: 256, height: 192, vector: false, pointer: true,
    controls: '1P: Arrows/Mouse \u00b7 2P: W/S vs Arrows \u00b7 Up/Down+Enter: choose mode',
    marquee: { bg: '#111', fg: '#fff', accent: '#e8c000' },
    create(api) {
      const W = 256, H = 192;
      const PW = 4, PH = 16, BALL = 4;
      const TOP = 4, BOT = H - 4;          // play field limits (top/bottom bounce)
      const LX = 16, RX = W - 16 - PW;
      const WIN = 11;
      const SPEEDS = [1.55, 2.05, 2.6];    // horizontal speeds: start, after 4 hits, after 12 hits
      const ANGLE = [-1.6, -1.1, -0.65, -0.25, 0.25, 0.65, 1.1, 1.6]; // 8 paddle segments
      const snd = {
        paddle() { api.audio.tone(491, 0.035, { type: 'square', vol: 0.22 }); },
        wall() { api.audio.tone(245, 0.03, { type: 'square', vol: 0.2 }); },
        score() { api.audio.tone(245, 0.26, { type: 'square', vol: 0.22 }); }
      };

      let state = 'title';   // title | serve | play | over
      let mode = 1;          // 1 or 2 players
      let menuSel = 0;
      let L, R, ball, scores, timer, hits, rally, bestRally, serveDir, winner, lastMouseY, mouseActive, overTimer;
      bestRally = api.getHiScore(0);
      lastMouseY = api.mouse.y; mouseActive = false;

      function resetPaddles() {
        L = { y: H / 2 - PH / 2, vy: 0, aiErr: 0 };
        R = { y: H / 2 - PH / 2, vy: 0, aiErr: 0 };
      }
      function newBall(dir) {
        hits = 0; rally = 0;
        ball = {
          x: W / 2 - BALL / 2, y: 40 + Math.random() * (H - 80),
          vx: SPEEDS[0] * dir, vy: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6), live: true
        };
      }
      function startGame(m) {
        mode = m; scores = [0, 0]; resetPaddles();
        serveDir = Math.random() < 0.5 ? -1 : 1;
        state = 'serve'; timer = 70; ball = null; winner = -1;
      }
      // attract-mode ball
      let attract = { x: 60, y: 50, vx: 1.7, vy: 1.1 };

      // coin-op: a credit is spent when the match actually begins
      let coinFlash = 0;
      function tryStart(m) {
        if (api.useCredit()) { startGame(m); return; }
        coinFlash = 90;
        api.audio.tone(70, 0.25, { type: 'square', vol: 0.25 });
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }

      function speedFor(h) { return h >= 12 ? SPEEDS[2] : h >= 4 ? SPEEDS[1] : SPEEDS[0]; }

      function movePaddleKeys(p, up, down) {
        const sp = 2.6;
        if (api.key(up)) p.y -= sp;
        if (api.key(down)) p.y += sp;
      }
      function clampP(p) {
        // the original's paddles could not quite reach the very top: keep a small gap
        if (p.y < TOP + 2) p.y = TOP + 2;
        if (p.y > BOT - PH) p.y = BOT - PH;
      }
      function cpu(p, px) {
        // CPU tracks the ball when it's coming toward it, with lag and an aiming error
        let target = H / 2 - PH / 2;
        if (ball && ball.live) {
          const coming = (px < W / 2 && ball.vx < 0) || (px > W / 2 && ball.vx > 0);
          if (coming) target = ball.y + BALL / 2 - PH / 2 + p.aiErr;
        }
        const maxSp = 1.55 + Math.min(0.9, (scores[0] + scores[1]) * 0.03);
        const d = target - p.y;
        p.y += Math.max(-maxSp, Math.min(maxSp, d * 0.18));
      }
      function collide(p, px, dirOut) {
        if (!ball.live) return;
        const bx = ball.x, by = ball.y;
        if (bx + BALL >= px && bx <= px + PW && by + BALL >= p.y && by <= p.y + PH) {
          if ((dirOut > 0 && ball.vx < 0) || (dirOut < 0 && ball.vx > 0)) {
            hits++; rally++;
            let seg = Math.floor(((by + BALL / 2) - p.y) / (PH / 8));
            seg = Math.max(0, Math.min(7, seg));
            const sp = speedFor(hits) + Math.min(0.5, rally * 0.025);
            ball.vx = sp * dirOut;
            ball.vy = ANGLE[seg] * (0.85 + sp * 0.12);
            ball.x = dirOut > 0 ? px + PW : px - BALL;
            snd.paddle();
            // CPU picks a new aiming error for its next return
            L.aiErr = (Math.random() - 0.5) * (PH + 6);
            R.aiErr = (Math.random() - 0.5) * (PH + 6);
          }
        }
      }

      function update() {
        // mouse activity detection
        if (Math.abs(api.mouse.y - lastMouseY) > 0.5) mouseActive = true;
        lastMouseY = api.mouse.y;

        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (state === 'title') {
          attract.x += attract.vx; attract.y += attract.vy;
          if (attract.x < 0 || attract.x > W - BALL) attract.vx *= -1;
          if (attract.y < TOP || attract.y > BOT - BALL) attract.vy *= -1;
          if (api.anyPressed('ArrowUp', 'ArrowDown', 'KeyW', 'KeyS')) { menuSel ^= 1; snd.wall(); }
          if (api.pressed('Digit1')) tryStart(1);
          else if (api.pressed('Digit2')) tryStart(2);
          else if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) tryStart(menuSel + 1);
          return;
        }
        if (state === 'over') {
          overTimer--;
          if (overTimer <= 0 || (overTimer < 200 && api.anyPressed('Enter', 'Space'))) state = 'title';
          return;
        }
        // paddles
        if (mode === 2) {
          movePaddleKeys(L, 'KeyW', 'KeyS');
          movePaddleKeys(R, 'ArrowUp', 'ArrowDown');
        } else {
          cpu(L, LX);
          if (api.key('ArrowUp') || api.key('ArrowDown') || api.key('KeyW') || api.key('KeyS')) {
            mouseActive = false;
            movePaddleKeys(R, 'ArrowUp', 'ArrowDown'); movePaddleKeys(R, 'KeyW', 'KeyS');
          } else if (mouseActive) {
            const t = api.mouse.y - PH / 2;
            R.y += Math.max(-4, Math.min(4, t - R.y));
          }
        }
        clampP(L); clampP(R);

        if (state === 'serve') {
          if (--timer <= 0) { newBall(serveDir); state = 'play'; }
          return;
        }
        // ball
        if (ball.live) {
          ball.x += ball.vx; ball.y += ball.vy;
          if (ball.y < TOP) { ball.y = TOP; ball.vy = Math.abs(ball.vy); snd.wall(); }
          if (ball.y > BOT - BALL) { ball.y = BOT - BALL; ball.vy = -Math.abs(ball.vy); snd.wall(); }
          collide(L, LX, 1); collide(R, RX, -1);
          if (ball.x < -BALL || ball.x > W) {
            const scorer = ball.x < 0 ? 1 : 0;
            scores[scorer]++; snd.score();
            if (rally > bestRally) { bestRally = rally; api.setHiScore(bestRally); }
            ball.live = false;
            serveDir = scorer === 0 ? 1 : -1; // serve toward the player who lost the point
            if (scores[scorer] >= WIN) {
              const gameOver = () => {
                winner = scorer; state = 'over'; overTimer = 420;
                if (mode === 1) api.audio.melody(scorer === 1 ? [[392, .12], [494, .12], [587, .12], [784, .3]] : [[392, .2], [330, .2], [262, .4]], { type: 'square', vol: 0.15, delay: 0.3 });
              };
              // Continue (1P only, when the CPU reaches 11): the player keeps their points and the CPU's score is
              // knocked back down to the player's (so 4-11 becomes 4-4; usually a fresh 0-0). Play resumes with the
              // normal serve toward the player. Best rally is untouched. A 2P match or a player win just ends.
              if (mode === 1 && scorer === 0 && api.offerContinue) {
                state = 'serve'; timer = 1e9;   // hold (frozen under the countdown anyway)
                api.offerContinue(() => { scores[0] = scores[1]; state = 'serve'; timer = 60; }, gameOver);
              } else gameOver();
            } else { state = 'serve'; timer = 60; }
          }
        }
      }

      function drawNet(ctx) {
        ctx.fillStyle = '#fff';
        for (let y = 0; y < H; y += 8) ctx.fillRect(W / 2 - 1, y + 2, 2, 4);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawNet(ctx);
        if (state === 'title') {
          bigNumber(ctx, 0, W / 2 - 64, 8); bigNumber(ctx, 0, W / 2 + 64, 8);
          ctx.fillStyle = '#fff'; ctx.fillRect(attract.x | 0, attract.y | 0, BALL, BALL);
          // title panel
          ctx.fillStyle = '#000'; ctx.fillRect(40, 54, 176, 104);
          ctx.fillStyle = '#fff'; ctx.fillRect(40, 54, 176, 1); ctx.fillRect(40, 157, 176, 1);
          ctx.fillRect(40, 54, 1, 104); ctx.fillRect(215, 54, 1, 104);
          text(ctx, 'PONG', W / 2, 62, '#fff', 4, 'center');
          const blink = (api.frame >> 4) & 1;
          text(ctx, (menuSel === 0 ? '> ' : '  ') + '1 PLAYER  VS CPU', 58, 102, menuSel === 0 && blink ? '#888' : '#fff');
          text(ctx, (menuSel === 1 ? '> ' : '  ') + '2 PLAYERS', 58, 114, menuSel === 1 && blink ? '#888' : '#fff');
          text(ctx, 'AVOID MISSING BALL', W / 2, 130, '#aaa', 1, 'center');
          text(ctx, 'FOR HIGH SCORE', W / 2, 139, '#aaa', 1, 'center');
          text(ctx, 'BEST RALLY ' + bestRally, W / 2, 148, '#fff', 1, 'center');
          text(ctx, '\u00a9 1972 ATARI', W / 2, H - 10, '#666', 1, 'center');
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 36, 163, 72, 11);
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 165, '#fff', 1, 'center'); }
          else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 165, '#fff', 1, 'center'); }
          else text(ctx, 'PUSH START', W / 2, 165, blink ? '#fff' : '#888', 1, 'center');
          text(ctx, credStr(), 4, H - 10, '#888', 1);
          return;
        }
        bigNumber(ctx, scores[0], W / 2 - 64, 8);
        bigNumber(ctx, scores[1], W / 2 + 64, 8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(LX, Math.round(L.y), PW, PH);
        ctx.fillRect(RX, Math.round(R.y), PW, PH);
        if (ball && ball.live && state === 'play') ctx.fillRect(Math.round(ball.x), Math.round(ball.y), BALL, BALL);
        if (state === 'serve' && scores[0] + scores[1] === 0 && timer > 20) {
          text(ctx, mode === 1 ? 'CPU' : 'W/S', W / 2 - 64, 44, '#888', 1, 'center');
          text(ctx, mode === 1 ? 'YOU' : 'ARROWS', W / 2 + 64, 44, '#888', 1, 'center');
        }
        if (state === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(56, 76, 144, 40);
          text(ctx, 'GAME OVER', W / 2, 82, '#fff', 2, 'center');
          let msg = mode === 1 ? (winner === 1 ? 'YOU WIN!' : 'CPU WINS') : (winner === 0 ? 'LEFT PLAYER WINS' : 'RIGHT PLAYER WINS');
          if ((api.frame >> 4) & 1) text(ctx, msg, W / 2, 102, '#fff', 1, 'center');
        }
      }
      return { update, render };
    }
  });
})();
