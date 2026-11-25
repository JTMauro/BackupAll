// Circus (Exidy, 1977) - from-scratch recreation for the Game Room.
// Two acrobat clowns and a teeterboard: catch the falling clown on the raised end of the board to fling
// his partner up into three scrolling rows of balloons. Pop a whole row for a bonus and it comes back,
// faster. Miss the board (or land on your partner) and the clown goes splat.
(function () {
  'use strict';
  const W = 256, H = 240;

  // ---------- 5x7 font ----------
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
    '=': [0, 0, 31, 0, 31, 0, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], "'": [4, 4, 8, 0, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
  }

  // ---------- pixel art ----------
  // clown, 9x14: 'h' hat, 'f' face, 'n' nose, 'b' body, 'w' white ruff/gloves, 'l' legs/shoes
  const CLOWN_FLY = [
    'w.......w', 'w...h...w', '.w.hhh.w.', '..wfffw..', '...fnf...', '...fff...', '..wwwww..', '.bbbbbbb.', '..bbbbb..', '..bbbbb..', '..b...b..', '..l...l..', '.ll...ll.', '.........'];
  const CLOWN_FALL = [
    '....h....', '...hhh...', '...fff...', '...fnf...', '...fff...', '.wwwwwww.', 'w.bbbbb.w', '..bbbbb..', '..bbbbb..', '..bb.bb..', '..b...b..', '.b.....b.', 'l.......l', '.........'];
  const CLOWN_SIT = [
    '.........', '.........', '....h....', '...hhh...', '...fff...', '...fnf...', '...fff...', '..wwwww..', '.wbbbbbw.', '..bbbbb..', '..bbbbbb.', '..bb..bbl', '..l......', '.........'];
  const CLOWN_SPLAT = ['.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '..h...w..', 'w.hfnf.bw', 'bbbbbbbbb', 'lbbbbbbbl', '.........'];
  const CPAL = { h: '#ff3a3a', f: '#ffd8b0', n: '#ff2020', b: '#3a7aff', w: '#ffffff', l: '#ffd040' };
  const BALLOON = ['..####..', '.######.', '##w#####', '#w######', '########', '########', '.######.', '..####..', '...##...', '....s...', '...s....', '....s...'];

  const ROWS = [{ y: 34, pts: 30, col: '#3a8aff', hi: '#a8d0ff', dir: 1, bonus: 500 }, { y: 50, pts: 20, col: '#3ae070', hi: '#b0ffc8', dir: -1, bonus: 300 }, { y: 66, pts: 10, col: '#ffd040', hi: '#fff0b0', dir: 1, bonus: 100 }];
  const NB = 16, BW = 16;            // balloons per row, spacing (they wrap around the screen)
  const LEFT = 8, RIGHT = W - 8, CEIL = 28, BOARD_Y = 218, GROUND = 226;
  const PLANK = 36;                  // teeterboard length
  const G = 0.115;

  ArcadeRegistry.register({
    id: 'circus', title: 'Circus', year: 1977, maker: 'Exidy',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Left/Right or Mouse: move teeterboard \u00b7 Space/Click: flip board \u00b7 Enter: start',
    marquee: { bg: '#100010', fg: '#ff3a3a', accent: '#ffd040' },
    create(api) {
      const A = api.audio;
      function mk(art, pal, flip) {
        const h = art.length, w = art[0].length, c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d');
        for (let r = 0; r < h; r++) for (let i = 0; i < w; i++) { const ch = art[r][flip ? w - 1 - i : i]; if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, r, 1, 1); } }
        return c;
      }
      const SPR = {
        fly: mk(CLOWN_FLY, CPAL), fall: mk(CLOWN_FALL, CPAL), sitL: mk(CLOWN_SIT, CPAL), sitR: mk(CLOWN_SIT, CPAL, true), splat: mk(CLOWN_SPLAT, CPAL),
        fly2: mk(CLOWN_FLY, Object.assign({}, CPAL, { b: '#ff8a20', h: '#3ae070' })), fall2: mk(CLOWN_FALL, Object.assign({}, CPAL, { b: '#ff8a20', h: '#3ae070' })),
        sitL2: mk(CLOWN_SIT, Object.assign({}, CPAL, { b: '#ff8a20', h: '#3ae070' })), sitR2: mk(CLOWN_SIT, Object.assign({}, CPAL, { b: '#ff8a20', h: '#3ae070' }), true)
      };
      const BAL = ROWS.map(r => mk(BALLOON, { '#': r.col, w: r.hi, s: '#c0c0c0' }));

      let hi = api.getHiScore(5000);
      let state = 'attract', T = 0, score = 0, lives = 5, nextExtra = 10000, coinFlash = 0, round = 1;
      let rows = [], board, flyer, sitter, splat = null, pops = [], msgs = [], prevFlip = false, lastMouseX = -1, mouseCtl = false, aiFlipT = 0;

      function resetRows() {
        rows = ROWS.map((r, i) => ({ off: i * 5, alive: new Array(NB).fill(true), sp: 0.35 + i * 0.05, refills: 0 }));
      }
      function rowSpeed(i) { const r = rows[i]; return (0.35 + i * 0.08 + r.refills * 0.12 + (round - 1) * 0.05) * ROWS[i].dir; }
      function newTurn() {
        // the sitting clown waits on the low end; the other one leaps from the side platform
        board = { x: W / 2, tilt: -1 };   // tilt -1: left end down (sitter on the left)
        sitter = { col: 0 }; flyer = { x: 20, y: 96, vx: 1.15, vy: -1.6, col: 1, state: 'fly' };
        splat = null;
      }
      function startGame() {
        state = 'play'; T = 0; score = 0; lives = 5; nextExtra = 10000; round = 1;
        resetRows(); newTurn(); prevFlip = true;
        A.melody([[523, .1], [659, .1], [784, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: .1 });
      }
      function tryStart() { if (api.useCredit()) startGame(); else { coinFlash = 90; A.tone(80, 0.25, { type: 'square', vol: 0.2 }); } }
      function attract() { state = 'attract'; T = 0; resetRows(); newTurn(); }
      function addScore(n) {
        if (state !== 'play') return;
        score += n; if (score > hi) hi = score;
        if (score >= nextExtra) { nextExtra += 10000; lives++; msgs.push({ s: 'EXTRA CLOWN', x: W / 2, y: 120, t: 120, c: '#ffd040' }); A.melody([[784, .08], [1047, .08], [1319, .08], [1568, .2]], { type: 'square', vol: .1 }); }
      }

      function boardEnds() {
        // returns the x-range of the low and the high end
        const half = PLANK / 2;
        return { left: [board.x - half, board.x], right: [board.x, board.x + half] };
      }
      function flip() {
        board.tilt = -board.tilt;
        if (state === 'play') A.tone(300, 0.06, { type: 'square', vol: 0.08, slideTo: 200 });
      }

      function balloonX(i, k) { const r = rows[i]; let x = (k * BW + r.off) % (NB * BW); if (x < 0) x += NB * BW; return x; }

      function update() {
        T++;
        if (coinFlash > 0) coinFlash--;
        if (state === 'over') { if (T > 300 || (T > 60 && api.anyPressed('Enter', 'Space'))) attract(); return; }
        if (state === 'hold') return;
        if (state === 'attract' && (api.anyPressed('Enter', 'Space') || api.mouse.clicked)) { tryStart(); return; }
        // balloons scroll
        for (let i = 0; i < rows.length; i++) rows[i].off += rowSpeed(i);
        for (const p of pops) p.t--; pops = pops.filter(p => p.t > 0);
        for (const m of msgs) m.t--; msgs = msgs.filter(m => m.t > 0);

        // board control
        if (state === 'play') {
          if (api.key('ArrowLeft')) { board.x -= 3; mouseCtl = false; }
          if (api.key('ArrowRight')) { board.x += 3; mouseCtl = false; }
          const mx = api.mouse.x;
          if (mx !== lastMouseX) { if (lastMouseX >= 0) mouseCtl = true; lastMouseX = mx; }
          if (mouseCtl) board.x += Math.max(-4, Math.min(4, mx - board.x));
          const f = api.key('Space') || api.key('KeyX') || api.key('ArrowUp');
          if ((f && !prevFlip) || api.mouse.clicked) flip();
          prevFlip = f;
        } else if (flyer && flyer.state === 'fly') {
          // demo: get the high end under the falling clown
          const tf = flyer.vy > 0 ? (BOARD_Y - flyer.y) / Math.max(0.5, flyer.vy) : 40;
          let px = flyer.x + flyer.vx * Math.min(tf, 60);
          if (px < LEFT) px = 2 * LEFT - px; if (px > RIGHT) px = 2 * RIGHT - px;
          const want = px + (board.tilt < 0 ? -PLANK / 4 : PLANK / 4);
          board.x += Math.max(-3, Math.min(3, want - board.x));
        }
        board.x = Math.max(LEFT + PLANK / 2, Math.min(RIGHT - PLANK / 2, board.x));

        if (splat) {
          splat.t++;
          if (splat.t > 100) {
            if (state === 'attract') { newTurn(); return; }
            lives--;
            if (lives <= 0) {
              state = 'hold';
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); A.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: .1 }); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; state = 'play'; newTurn(); }, over); else over();
            } else newTurn();
          }
          return;
        }
        // flying clown physics
        const f = flyer;
        f.vy += G; if (f.vy > 7.5) f.vy = 7.5;
        f.x += f.vx; f.y += f.vy;
        if (f.x < LEFT + 4) { f.x = LEFT + 4; f.vx = Math.abs(f.vx); if (state === 'play') A.tone(180, 0.04, { vol: 0.08 }); }
        if (f.x > RIGHT - 4) { f.x = RIGHT - 4; f.vx = -Math.abs(f.vx); if (state === 'play') A.tone(180, 0.04, { vol: 0.08 }); }
        if (f.y < CEIL + 6) { f.y = CEIL + 6; f.vy = Math.abs(f.vy) * 0.6; }
        // balloons: clown's head pops whatever it touches
        for (let i = 0; i < rows.length; i++) {
          const ry = ROWS[i].y;
          if (f.y - 7 > ry + 9 || f.y + 6 < ry) continue;
          for (let k = 0; k < NB; k++) {
            if (!rows[i].alive[k]) continue;
            const bx = balloonX(i, k);
            for (const sx of [bx, bx - NB * BW]) {
              if (Math.abs(sx + 4 - f.x) < 7) {
                rows[i].alive[k] = false; addScore(ROWS[i].pts);
                pops.push({ x: sx + 4, y: ry + 4, t: 14, c: ROWS[i].col });
                if (state === 'play') A.tone(1300 - i * 250 + Math.random() * 80, 0.05, { type: 'square', vol: 0.1, slideTo: 2400 });
                if (f.vy < 0) f.vy *= 0.94; else f.vy = Math.max(f.vy, 0.5);
              }
            }
          }
          if (rows[i].alive.every(a => !a)) {
            addScore(ROWS[i].bonus);
            msgs.push({ s: 'BONUS ' + ROWS[i].bonus, x: W / 2, y: ROWS[i].y + 2, t: 90, c: ROWS[i].hi });
            rows[i].alive.fill(true); rows[i].refills++;
            if (rows.every(r => r.refills > 0) && rows.reduce((a, r) => a + r.refills, 0) >= 3 * round) round++;
            if (state === 'play') A.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .12]], { type: 'square', vol: .1 });
          }
        }
        // landing on the teeterboard
        if (f.vy > 0 && f.y >= BOARD_Y - 8 && f.y - f.vy < BOARD_Y - 6) {
          const e = boardEnds();
          const highEnd = board.tilt < 0 ? e.right : e.left, lowEnd = board.tilt < 0 ? e.left : e.right;
          if (f.x >= highEnd[0] - 3 && f.x <= highEnd[1] + 3) {
            // the board swings down and catapults the partner
            const off = (f.x - (highEnd[0] + highEnd[1]) / 2) / (PLANK / 4);   // -1..1 along the end
            const launchX = (lowEnd[0] + lowEnd[1]) / 2;
            const speed = Math.max(5.9, Math.min(7.0, f.vy * 0.98 + 0.35));
            const away = board.tilt < 0 ? -1 : 1; // the partner sits on the low end; it springs away from the centre
            board.tilt = -board.tilt;
            const nf = { x: launchX, y: BOARD_Y - 10, vx: away * (0.5 + Math.abs(off) * 0.4) + f.vx * 0.35 + (Math.random() - 0.5) * 0.4, vy: -speed, col: sitter.col, state: 'fly' };
            nf.vx *= 1 + Math.min(0.8, (round - 1) * 0.08);
            const vmax = Math.min(3.4, 2.4 + (round - 1) * 0.1);
            if (Math.abs(nf.vx) > vmax) nf.vx = Math.sign(nf.vx) * vmax;
            sitter = { col: f.col };
            flyer = nf;
            if (state === 'play') { A.tone(220, 0.12, { type: 'square', vol: 0.12, slideTo: 660 }); A.noise(0.06, { vol: 0.08, freq: 3000 }); }
            return;
          }
          if (f.x >= lowEnd[0] - 3 && f.x <= lowEnd[1] + 3) {
            // landed on his partner's head
            splatAt(f.x, 'OUCH!');
            return;
          }
        }
        if (f.y >= GROUND) splatAt(f.x, null);
      }
      function splatAt(x, word) {
        splat = { x, t: 0, word };
        flyer.state = 'dead';
        if (state === 'play') { A.noise(0.5, { freq: 700, slideTo: 80, vol: 0.3 }); A.tone(400, 0.5, { type: 'sawtooth', vol: 0.12, slideTo: 60 }); }
      }

      // ---------- drawing ----------
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        // big top: striped valance and side poles
        for (let x = 0; x < W; x += 16) {
          ctx.fillStyle = (x >> 4) & 1 ? '#c01818' : '#f0f0f0';
          ctx.fillRect(x, 14, 16, 8);
          ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x + 16, 22); ctx.lineTo(x + 8, 27); ctx.closePath(); ctx.fill();
        }
        for (let y = 28; y < GROUND; y += 8) {
          ctx.fillStyle = (y >> 3) & 1 ? '#c01818' : '#f0f0f0';
          ctx.fillRect(0, y, LEFT, 8); ctx.fillRect(RIGHT, y, W - RIGHT, 8);
        }
        // the side platform
        ctx.fillStyle = '#8a5a2a'; ctx.fillRect(LEFT, 104, 20, 3); ctx.fillStyle = '#c08040'; ctx.fillRect(LEFT, 104, 20, 1);
        // floor
        ctx.fillStyle = '#5a2a10'; ctx.fillRect(LEFT, GROUND + 2, RIGHT - LEFT, H - GROUND - 2);
        ctx.fillStyle = '#8a4a20'; for (let x = LEFT; x < RIGHT; x += 12) ctx.fillRect(x, GROUND + 2, 6, 1);
        // balloons
        for (let i = 0; i < rows.length; i++) {
          for (let k = 0; k < NB; k++) {
            if (!rows[i].alive[k]) continue;
            const bx = Math.round(balloonX(i, k));
            const bob = ((T >> 4) + k) & 1;
            for (const sx of [bx, bx - NB * BW]) if (sx > LEFT - 8 && sx < RIGHT) ctx.drawImage(BAL[i], sx, ROWS[i].y + bob);
          }
        }
        // clip balloons under the poles
        for (let y = 28; y < 90; y += 8) { ctx.fillStyle = (y >> 3) & 1 ? '#c01818' : '#f0f0f0'; ctx.fillRect(0, y, LEFT, 8); ctx.fillRect(RIGHT, y, W - RIGHT, 8); }
        for (const p of pops) {
          ctx.fillStyle = p.c; const r = 14 - p.t;
          for (let a = 0; a < 8; a++) ctx.fillRect(Math.round(p.x + Math.cos(a * 0.785) * r) - 1, Math.round(p.y + Math.sin(a * 0.785) * r) - 1, 2, 2);
        }
        // teeterboard
        const bx = Math.round(board.x), t = board.tilt;
        ctx.fillStyle = '#c08040';
        for (let i = -PLANK / 2; i < PLANK / 2; i++) {
          const yy = Math.round(BOARD_Y + 2 + (i / (PLANK / 2)) * 4 * t);
          ctx.fillRect(bx + i, yy, 1, 3);
        }
        ctx.fillStyle = '#a0a0b0'; ctx.fillRect(bx - 3, BOARD_Y + 4, 6, GROUND - BOARD_Y - 2); ctx.fillRect(bx - 6, GROUND, 12, 2);
        // sitting clown on the low end
        if (!(splat && splat.word)) {
          const lowX = t < 0 ? bx - PLANK / 2 + 2 : bx + PLANK / 2 - 11;
          const s = sitter.col ? (t < 0 ? SPR.sitL2 : SPR.sitR2) : (t < 0 ? SPR.sitL : SPR.sitR);
          ctx.drawImage(s, lowX, BOARD_Y + 7 - 14);
        }
        // flying clown
        if (flyer && flyer.state === 'fly') {
          const s = flyer.vy < 0 ? (flyer.col ? SPR.fly2 : SPR.fly) : (flyer.col ? SPR.fall2 : SPR.fall);
          ctx.drawImage(s, Math.round(flyer.x - 4), Math.round(flyer.y - 7));
        }
        if (splat) {
          ctx.drawImage(SPR.splat, Math.round(splat.x - 4), splat.word ? BOARD_Y - 8 : GROUND - 12);
          if (splat.t < 60 && (splat.t >> 2) & 1) text(ctx, splat.word || 'SPLAT!', splat.x, (splat.word ? BOARD_Y : GROUND) - 26, '#ffffff', 1, 'center');
          if (splat.word) { const s2 = sitter.col ? SPR.splat : SPR.splat; ctx.drawImage(s2, t < 0 ? bx - PLANK / 2 + 2 : bx + PLANK / 2 - 11, BOARD_Y - 6); }
        }
        for (const m of msgs) text(ctx, m.s, m.x, m.y, m.c, 1, 'center');
        // HUD
        text(ctx, 'SCORE', 4, 3, '#ffd040'); text(ctx, String(score).padStart(5, '0'), 38, 3, '#ffffff');
        text(ctx, 'HIGH', 100, 3, '#ffd040'); text(ctx, String(hi).padStart(5, '0'), 128, 3, '#ffffff');
        if (state !== 'attract') {
          text(ctx, 'CLOWNS', 186, 3, '#ffd040'); text(ctx, String(Math.max(0, lives)), 228, 3, '#ffffff');
        }
        if (state === 'attract') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(40, 108, W - 80, 76);
          text(ctx, 'CIRCUS', W / 2 + 2, 116, '#801010', 4, 'center');
          text(ctx, 'CIRCUS', W / 2, 114, '#ff3a3a', 4, 'center');
          text(ctx, '30   20   10 PTS', W / 2, 148, '#ffffff', 1, 'center');
          ctx.fillStyle = ROWS[0].col; ctx.fillRect(W / 2 - 50, 148, 4, 7); ctx.fillStyle = ROWS[1].col; ctx.fillRect(W / 2 - 20, 148, 4, 7); ctx.fillStyle = ROWS[2].col; ctx.fillRect(W / 2 + 10, 148, 4, 7);
          const blink = (T >> 4) & 1;
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 162, '#ff3a3a', 1, 'center'); }
          else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 162, '#ffd040', 1, 'center'); }
          else if (blink) text(ctx, 'INSERT COIN', W / 2, 162, '#ffd040', 1, 'center');
          text(ctx, '\u00a9 1977 EXIDY', W / 2, 174, '#a0a0a0', 1, 'center');
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 186, 3, '#a0a0a0');
        }
        if (state === 'over' || state === 'hold') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(56, 112, W - 112, 30);
          text(ctx, 'GAME OVER', W / 2, 120, '#ff3a3a', 2, 'center');
        }
      }
      attract();
      return { update, render, destroy() { } };
    }
  });
})();
