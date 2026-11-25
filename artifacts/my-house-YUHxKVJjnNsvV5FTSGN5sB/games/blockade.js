// Blockade (Gremlin, 1976) \u2014 the original two-player "snake" game. 1P vs CPU ladder or 2P head-to-head.
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
  // big "block letters": each font pixel is a little bevelled block, like the Blockade cabinet artwork
  function blockText(ctx, s, cx, y, cell, col) {
    s = String(s).toUpperCase();
    const w = s.length * 6 * cell - cell;
    const x0 = Math.round(cx - w / 2);
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) {
        const x = x0 + (i * 6 + c) * cell, yy = y + r * cell;
        ctx.fillStyle = col; ctx.fillRect(x, yy, cell - 1, cell - 1);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 2, yy + 2, cell - 5, cell - 5);
        ctx.fillStyle = col; ctx.fillRect(x + 3, yy + 3, cell - 7, cell - 7);
      }
    }
  }

  const W = 256, H = 224, CELL = 8;
  const COLS = 32, ROWS = 28;
  const TOPR = 3;                 // first field row (rows 0..2: score + top wall at row 2)
  const X0 = 1, X1 = 30, Y0 = TOPR, Y1 = 26; // inner playfield (inclusive)
  const WIN = 6;
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up right down left
  const FG = '#f4fff4', DIM = '#8a9a8a';

  ArcadeRegistry.register({
    id: 'blockade', title: 'Blockade', year: 1976, maker: 'Gremlin',
    width: W, height: H, vector: false, pointer: false,
    controls: '1P: Arrows/WASD vs CPU \u00b7 2P: WASD vs Arrows \u00b7 Up/Down+Enter: choose mode',
    marquee: { bg: '#050805', fg: '#f4fff4', accent: '#46ff6a' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(1000);
      let mode = 'title';       // title | demo | game
      let menuSel = 0, titleT = 0, frame = 0, coinFlash = 0;
      let g = null;             // match/game state

      // ---------- grid ----------
      // 0 empty, 1 = P1 trail, 2 = P2 trail
      let grid = new Uint8Array(COLS * ROWS);
      const idx = (x, y) => y * COLS + x;
      const inside = (x, y) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1;
      const free = (x, y) => inside(x, y) && grid[idx(x, y)] === 0;

      // ---------- sound ----------
      const sfx = {
        step(p) { au.tone(p === 0 ? 196 : 262, 0.028, { type: 'square', vol: 0.05 }); },
        crash() { au.noise(0.6, { vol: 0.24, freq: 2400, slideTo: 120 }); au.tone(300, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); },
        turn() { au.tone(880, 0.015, { type: 'square', vol: 0.03 }); },
        win() { au.melody([[392, .1], [523, .1], [659, .1], [784, .25]], { type: 'square', vol: 0.12 }); },
        lose() { au.melody([[392, .18], [330, .18], [262, .18], [196, .4]], { type: 'square', vol: 0.12 }); },
        coin() { au.tone(1320, 0.06, { type: 'square', vol: 0.08, slideTo: 1980 }); },
        nocoin() { au.tone(80, 0.25, { type: 'square', vol: 0.2 }); },
        menu() { au.tone(660, 0.03, { type: 'square', vol: 0.1 }); }
      };

      // ---------- players ----------
      function mkPlayer(n, x, y, d, cpu) {
        return { n, x, y, d, q: [], cpu: !!cpu, alive: true, skill: 0.6, len: 1, crashed: false };
      }
      function resetRound() {
        grid.fill(0);
        const a = mkPlayer(0, 5, Y1 - 3, 0, g.cpu[0]);
        const b = mkPlayer(1, X1 - 4, Y0 + 3, 2, g.cpu[1]);
        a.skill = g.skill[0]; b.skill = g.skill[1];
        g.p = [a, b];
        grid[idx(a.x, a.y)] = 1; grid[idx(b.x, b.y)] = 2;
        g.phase = 'ready'; g.t = 80; g.stepT = 0; g.crashInfo = null; g.steps = 0;
      }
      function newMatch(kind) {
        // kind: '1p', '2p', 'demo'
        const lvl = g ? g.match : 1;
        g = g || {};
        g.kind = kind;
        g.pts = [0, 0];
        g.cpu = kind === '2p' ? [false, false] : kind === '1p' ? [false, true] : [true, true];
        const sk = Math.min(0.97, 0.55 + (lvl - 1) * 0.09);
        g.skill = kind === 'demo' ? [0.85, 0.85] : [0.8, sk];
        g.period = Math.max(3, 9 - Math.floor((lvl - 1) * 0.8));   // frames per step
        resetRound();
      }
      function startGame(kind) {
        g = { match: 1, score: 0, kind };
        newMatch(kind);
        mode = kind === 'demo' ? 'demo' : 'game';
      }

      // ---------- input ----------
      function pushDir(p, d) {
        const last = p.q.length ? p.q[p.q.length - 1] : p.d;
        if (d === last || (d + 2) % 4 === last) return;
        if (p.q.length < 3) { p.q.push(d); sfx.turn(); }
      }
      function readKeys() {
        const sets = g.kind === '2p'
          ? [[0, ['KeyW', 'KeyD', 'KeyS', 'KeyA']], [1, ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']]]
          : [[0, ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']], [0, ['KeyW', 'KeyD', 'KeyS', 'KeyA']]];
        for (const [pi, keys] of sets) {
          const p = g.p[pi]; if (p.cpu) continue;
          for (let d = 0; d < 4; d++) if (api.pressed(keys[d])) pushDir(p, d);
        }
      }

      // ---------- CPU ----------
      const seen = new Uint8Array(COLS * ROWS), stack = new Int16Array(COLS * ROWS * 2);
      function flood(sx, sy, limit, blockX, blockY) {
        seen.fill(0);
        let sp = 0, n = 0;
        stack[sp++] = sx; stack[sp++] = sy; seen[idx(sx, sy)] = 1;
        if (blockX >= 0) seen[idx(blockX, blockY)] = 1;
        while (sp > 0 && n < limit) {
          const y = stack[--sp], x = stack[--sp]; n++;
          for (let d = 0; d < 4; d++) {
            const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
            if (!free(nx, ny)) continue;
            const k = idx(nx, ny); if (seen[k]) continue;
            seen[k] = 1; stack[sp++] = nx; stack[sp++] = ny;
          }
        }
        return n;
      }
      function cpuThink(p, o) {
        const opts = [];
        for (let d = 0; d < 4; d++) {
          if ((d + 2) % 4 === p.d) continue;
          const nx = p.x + DIRS[d][0], ny = p.y + DIRS[d][1];
          if (!free(nx, ny)) { opts.push({ d, s: -1e6 }); continue; }
          // dumb CPUs sometimes skip the look-ahead
          let s = 0;
          if (Math.random() < p.skill) {
            const area = flood(nx, ny, 400, o.alive ? o.x + DIRS[o.d][0] : -1, o.alive ? o.y + DIRS[o.d][1] : -1);
            s += Math.min(area, 400) * 2;
          } else s += 100;
          // avoid stepping next to the opponent's head (head-on risk)
          const ox = o.x + DIRS[o.d][0], oy = o.y + DIRS[o.d][1];
          if (nx === ox && ny === oy) s -= 300;
          else if (Math.abs(nx - o.x) + Math.abs(ny - o.y) === 1) s -= 40;
          // aggression: cut toward the cell in front of the opponent
          const dist = Math.abs(nx - (o.x + DIRS[o.d][0] * 3)) + Math.abs(ny - (o.y + DIRS[o.d][1] * 3));
          s -= dist * p.skill * 1.2;
          if (d === p.d) s += 6;                     // prefer going straight
          s += (Math.random() - 0.5) * (1 - p.skill) * 60;
          // walls ahead in the long run
          let free2 = 0; for (let k = 1; k <= 4; k++) if (free(p.x + DIRS[d][0] * k, p.y + DIRS[d][1] * k)) free2++; else break;
          s += free2 * 2;
          opts.push({ d, s });
        }
        opts.sort((a, b) => b.s - a.s);
        // occasionally keep going straight even if a turn would be smarter (low skill)
        if (Math.random() > p.skill + 0.25 && free(p.x + DIRS[p.d][0], p.y + DIRS[p.d][1])) return;
        p.d = opts[0].d;
      }

      // ---------- simulation ----------
      function step() {
        const [a, b] = g.p;
        for (const p of g.p) {
          if (p.cpu) cpuThink(p, p === a ? b : a);
          else if (p.q.length) p.d = p.q.shift();
        }
        const na = [a.x + DIRS[a.d][0], a.y + DIRS[a.d][1]];
        const nb = [b.x + DIRS[b.d][0], b.y + DIRS[b.d][1]];
        let ca = !free(na[0], na[1]), cb = !free(nb[0], nb[1]);
        if (na[0] === nb[0] && na[1] === nb[1]) { ca = cb = true; }
        if (ca || cb) {
          g.crashInfo = { a: ca, b: cb, ax: na[0], ay: na[1], bx: nb[0], by: nb[1] };
          a.crashed = ca; b.crashed = cb;
          // move the survivor one more step for the look
          if (!cb) { b.x = nb[0]; b.y = nb[1]; grid[idx(b.x, b.y)] = 2; }
          if (!ca) { a.x = na[0]; a.y = na[1]; grid[idx(a.x, a.y)] = 1; }
          g.phase = 'crash'; g.t = 110; sfx.crash();
          if (ca && !cb) award(1); else if (cb && !ca) award(0);
          return;
        }
        a.x = na[0]; a.y = na[1]; grid[idx(a.x, a.y)] = 1; a.len++;
        b.x = nb[0]; b.y = nb[1]; grid[idx(b.x, b.y)] = 2; b.len++;
        g.steps++;
        if (mode === 'game') sfx.step(g.steps & 1);
      }
      function award(pi) {
        g.pts[pi]++;
        if (g.kind === '1p' && pi === 0) addScore(100 * g.match + Math.floor(g.steps / 2));
      }
      function addScore(n) {
        g.score += n;
        if (g.score > hi) { hi = g.score; }
      }

      function afterCrash() {
        if (g.pts[0] >= WIN || g.pts[1] >= WIN) {
          if (g.kind === 'demo') { mode = 'title'; titleT = 0; return; }
          g.phase = 'matchover'; g.t = 260;
          g.winner = g.pts[0] >= WIN ? 0 : 1;
          if (g.kind === '1p' && g.winner === 1) sfx.lose(); else sfx.win();
          if (g.kind === '1p' && g.winner === 0) addScore(1000 * g.match);
          return;
        }
        resetRound();
      }
      function endMatch() {
        if (g.kind === '2p') { mode = 'title'; titleT = 0; return; }
        if (g.winner === 0) {          // player beat the CPU: next, faster, smarter CPU
          g.match++; newMatch('1p'); return;
        }
        const over = () => { api.setHiScore(g.score); g.phase = 'gameover'; g.t = 300; };
        if (api.offerContinue) {
          g.phase = 'hold';
          api.offerContinue(() => { newMatch('1p'); }, over);
        } else over();
      }

      function tryStart(kind) {
        if (api.useCredit()) { startGame(kind); return; }
        coinFlash = 90; sfx.nocoin();
      }

      let lastCred = api.credits;
      function update() {
        frame++;
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('ArrowUp', 'ArrowDown', 'KeyW', 'KeyS')) { menuSel ^= 1; sfx.menu(); }
          if (api.pressed('Digit1')) tryStart('1p');
          else if (api.pressed('Digit2')) tryStart('2p');
          else if (api.anyPressed('Enter', 'Space')) tryStart(menuSel ? '2p' : '1p');
          else if (titleT > 600) { startGame('demo'); }
          return;
        }
        if (mode === 'demo') {
          if (api.anyPressed('Enter', 'Space')) { mode = 'title'; titleT = 0; return; }
          if (g.steps > 900) { mode = 'title'; titleT = 0; return; }
        } else readKeys();
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'run'; return; }
        if (g.phase === 'run') {
          if (++g.stepT >= g.period) { g.stepT = 0; step(); }
          return;
        }
        if (g.phase === 'crash') { if (--g.t <= 0) afterCrash(); return; }
        if (g.phase === 'matchover') {
          if (--g.t <= 0 || (g.t < 180 && api.anyPressed('Enter', 'Space'))) endMatch();
          return;
        }
        if (g.phase === 'gameover') {
          if (--g.t <= 0 || (g.t < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
        }
      }

      // ---------- drawing ----------
      function wallCell(ctx, x, y) {
        const px = x * CELL, py = y * CELL;
        ctx.fillStyle = FG; ctx.fillRect(px, py, CELL, CELL);
        ctx.fillStyle = '#000'; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = FG; ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
      }
      function drawBorder(ctx) {
        for (let x = 0; x < COLS; x++) { wallCell(ctx, x, TOPR - 1); wallCell(ctx, x, Y1 + 1); }
        for (let y = TOPR; y <= Y1; y++) { wallCell(ctx, 0, y); wallCell(ctx, COLS - 1, y); }
      }
      // P1 trail: solid block; P2 trail: hollow block with centre dot (the two characters of the original)
      function trailCell(ctx, x, y, who) {
        const px = x * CELL, py = y * CELL;
        if (who === 1) {
          ctx.fillStyle = FG; ctx.fillRect(px + 1, py + 1, 6, 6);
          ctx.fillStyle = '#000'; ctx.fillRect(px + 3, py + 3, 2, 2);
        } else {
          ctx.fillStyle = FG;
          ctx.fillRect(px + 1, py + 1, 6, 1); ctx.fillRect(px + 1, py + 6, 6, 1);
          ctx.fillRect(px + 1, py + 1, 1, 6); ctx.fillRect(px + 6, py + 1, 1, 6);
          ctx.fillRect(px + 3, py + 3, 2, 2);
        }
      }
      // arrow-shaped head pointing in its direction
      const ARROW = [[0, 0, 0, 1, 1, 0, 0, 0], [0, 0, 1, 1, 1, 1, 0, 0], [0, 1, 1, 1, 1, 1, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 1, 0, 0], [0, 0, 1, 1, 1, 1, 0, 0], [0, 0, 1, 1, 1, 1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]];
      function headCell(ctx, x, y, d, col) {
        const px = x * CELL, py = y * CELL;
        ctx.fillStyle = '#000'; ctx.fillRect(px, py, CELL, CELL);
        ctx.fillStyle = col;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          if (!ARROW[r][c]) continue;
          let X, Y;
          if (d === 0) { X = c; Y = r; } else if (d === 2) { X = c; Y = 7 - r; }
          else if (d === 1) { X = 7 - r; Y = c; } else { X = r; Y = c; }
          ctx.fillRect(px + X, py + Y, 1, 1);
        }
      }
      function drawField(ctx) {
        for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
          const v = grid[idx(x, y)]; if (v) trailCell(ctx, x, y, v);
        }
        for (const p of g.p) {
          const blink = p.crashed && ((frame >> 3) & 1);
          headCell(ctx, p.x, p.y, p.d, blink ? '#000' : FG);
          if (blink) trailCell(ctx, p.x, p.y, p.n + 1);
        }
        if (g.phase === 'crash' && g.crashInfo) {
          const ci = g.crashInfo, t = 110 - g.t;
          const spots = []; if (ci.a) spots.push([ci.ax, ci.ay]); if (ci.b) spots.push([ci.bx, ci.by]);
          for (const [sx, sy] of spots) {
            const cx = sx * CELL + 4, cy = sy * CELL + 4, r = Math.min(14, 2 + t * 0.4);
            ctx.fillStyle = (t >> 2) & 1 ? FG : '#000';
            for (let k = 0; k < 8; k++) {
              const an = k * Math.PI / 4;
              ctx.fillRect(Math.round(cx + Math.cos(an) * r) - 1, Math.round(cy + Math.sin(an) * r) - 1, 2, 2);
              ctx.fillRect(Math.round(cx + Math.cos(an) * r * 0.5), Math.round(cy + Math.sin(an) * r * 0.5), 1, 1);
            }
            if (t < 30) { ctx.fillStyle = FG; ctx.fillRect(sx * CELL, sy * CELL, CELL, CELL); }
          }
        }
      }
      function drawScores(ctx) {
        const p0 = g.kind === '1p' ? 'YOU' : g.kind === 'demo' ? 'CPU 1' : 'PLAYER 1';
        const p1 = g.kind === '1p' ? 'CPU' : g.kind === 'demo' ? 'CPU 2' : 'PLAYER 2';
        // little trail icons next to each name so you know which pattern is yours
        trailCell(ctx, 1, 0, 1); headCell(ctx, 2, 0, 1, FG);
        text(ctx, p0, 28, 1, FG);
        text(ctx, String(g.pts[0]), 28, 10, FG, 1);
        trailCell(ctx, 29, 0, 2); headCell(ctx, 30, 0, 3, FG);
        text(ctx, p1, 228, 1, FG, 1, 'right');
        text(ctx, String(g.pts[1]), 228, 10, FG, 1, 'right');
        if (g.kind === '1p') {
          text(ctx, 'MATCH ' + g.match, W / 2, 1, DIM, 1, 'center');
          text(ctx, String(g.score).padStart(6, '0'), W / 2 - 34, 10, FG, 1, 'center');
          text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2 + 28, 10, DIM, 1, 'center');
        } else text(ctx, 'FIRST TO ' + WIN, W / 2, 5, DIM, 1, 'center');
        // tally marks under the numbers
        for (let i = 0; i < WIN; i++) {
          ctx.fillStyle = i < g.pts[0] ? FG : '#333'; ctx.fillRect(40 + i * 5, 11, 3, 5);
          ctx.fillStyle = i < g.pts[1] ? FG : '#333'; ctx.fillRect(213 - i * 5, 11, 3, 5);
        }
      }
      function banner(ctx, s1, s2) {
        const w = Math.max(s1.length, s2 ? s2.length : 0) * 6 + 20;
        ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - w / 2, 92, w, s2 ? 34 : 22);
        ctx.fillStyle = FG; ctx.fillRect(W / 2 - w / 2, 92, w, 1); ctx.fillRect(W / 2 - w / 2, (s2 ? 125 : 113), w, 1);
        text(ctx, s1, W / 2, 99, FG, 1, 'center');
        if (s2) text(ctx, s2, W / 2, 112, DIM, 1, 'center');
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }

      function drawTitle(ctx) {
        drawBorder(ctx);
        // decorative snakes crawling around the inside of the border
        const per = (X1 - X0 + 1) * 2 + (Y1 - Y0 + 1) * 2 - 4;
        const posAt = k => {
          k = ((k % per) + per) % per;
          const w = X1 - X0, h = Y1 - Y0;
          if (k < w) return [X0 + k, Y0];
          k -= w; if (k < h) return [X1, Y0 + k];
          k -= h; if (k < w) return [X1 - k, Y1];
          k -= w; return [X0, Y1 - k];
        };
        const t = Math.floor(titleT / 4);
        for (let i = 0; i < 18; i++) { const [x, y] = posAt(t - i); trailCell(ctx, x, y, 1); }
        for (let i = 0; i < 18; i++) { const [x, y] = posAt(t + per / 2 - i); trailCell(ctx, x, y, 2); }
        blockText(ctx, 'BLOCKADE', W / 2, 40, 5, FG);
        const blink = (frame >> 4) & 1;
        text(ctx, (menuSel === 0 ? '> ' : '  ') + '1 PLAYER  VS CPU', 64, 98, menuSel === 0 && blink ? DIM : FG);
        text(ctx, (menuSel === 1 ? '> ' : '  ') + '2 PLAYERS', 64, 110, menuSel === 1 && blink ? DIM : FG);
        text(ctx, 'BLOCK YOUR OPPONENT!', W / 2, 128, DIM, 1, 'center');
        text(ctx, 'FIRST TO ' + WIN + ' POINTS WINS', W / 2, 138, DIM, 1, 'center');
        text(ctx, 'HI SCORE ' + String(hi).padStart(6, '0'), W / 2, 152, FG, 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 168, FG, 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 168, FG, 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 168, blink ? FG : DIM, 1, 'center');
        text(ctx, '\u00a9 1976 GREMLIN', W / 2, 186, DIM, 1, 'center');
        text(ctx, credStr(), 10, 6, DIM);
        text(ctx, '1P WASD/ARROWS  2P WASD+ARROWS', W / 2, 198, '#556655', 1, 'center');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawBorder(ctx);
        drawField(ctx);
        drawScores(ctx);
        if (mode === 'demo') {
          if ((frame >> 5) & 1) text(ctx, 'DEMO - PUSH START', W / 2, 202, DIM, 1, 'center');
          return;
        }
        if (g.phase === 'ready' && (frame >> 3) & 1) {
          if (g.pts[0] + g.pts[1] === 0) banner(ctx, g.kind === '1p' ? 'MATCH ' + g.match : 'GET READY', g.kind === '1p' ? 'YOU: SOLID   CPU: HOLLOW' : 'P1 WASD   P2 ARROWS');
          else banner(ctx, 'READY');
        }
        if (g.phase === 'matchover') {
          let s1, s2;
          if (g.kind === '1p') { s1 = g.winner === 0 ? 'YOU WIN THE MATCH!' : 'CPU WINS THE MATCH'; s2 = g.winner === 0 ? 'BONUS ' + 1000 * g.match + '  NEXT CPU IS FASTER' : 'SCORE ' + g.score; }
          else { s1 = 'PLAYER ' + (g.winner + 1) + ' WINS!'; s2 = g.pts[0] + ' - ' + g.pts[1]; }
          banner(ctx, s1, s2);
        }
        if (g.phase === 'gameover') banner(ctx, 'GAME OVER', 'SCORE ' + g.score);
      }

      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
