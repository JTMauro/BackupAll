// Canyon Bomber (Atari, 1977) \u2014 written from scratch for the MAME32 Game Room. Bomb the numbered rocks out of the canyon before the blimp does.
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
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function makeSpr(rows, pal) {
    const runs = []; let w = 0;
    rows.forEach((r, y) => {
      w = Math.max(w, r.length);
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (!pal[ch]) { x++; continue; }
        let e = x + 1; while (e < r.length && r[e] === ch) e++;
        runs.push({ x, y, n: e - x, c: pal[ch], k: ch }); x = e;
      }
    });
    return { w, h: rows.length, runs };
  }
  function drawSpr(ctx, s, cx, cy, o) {
    o = o || {};
    const x0 = Math.round(cx - s.w / 2), y0 = Math.round(cy - s.h / 2);
    for (const r of s.runs) {
      ctx.fillStyle = o.col || (o.pal && o.pal[r.k]) || r.c;
      const xx = o.flip ? s.w - r.x - r.n : r.x;
      ctx.fillRect(x0 + xx, y0 + r.y, r.n, 1);
    }
  }

  const W = 256, H = 224, CW = 8, CH = 7, COLS = 32, ROWS = 18, CY = 92, SKY0 = 30, SKY1 = 76;
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216; }
  const ROCKCOL = [null, '#e0e0e0', '#ffd040', '#ff9030', '#ff4848'];
  const ROCKDARK = [null, '#909090', '#a07810', '#a04810', '#981818'];
  // 3x5 digits drawn inside the rocks
  const TINY = { 1: [2, 6, 2, 2, 7], 2: [6, 1, 2, 4, 7], 3: [6, 1, 2, 1, 6], 4: [5, 5, 7, 1, 1] };
  function tiny(ctx, d, x, y, col) {
    const g = TINY[d]; if (!g) return; ctx.fillStyle = col;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r] & (4 >> c)) ctx.fillRect(x + c, y + r, 1, 1);
  }
  const PLANE = makeSpr([
    'RR..............',
    'RRR.......CC....',
    '.RRWWWWWWWWWWWW.',
    '.WWWWWWWWWWWWWWW',
    '....GGGGGGGG....',
    '.....G....G.....'], { R: '#ff4040', W: '#ffffff', C: '#60d0ff', G: '#b0b0b0' });
  const BLIMP = makeSpr([
    '......BBBBBBBB......',
    '...BBBBBBBBBBBBBB.TT',
    '..BBBWWBBWWBBWWBBBTT',
    '.BBBBBBBBBBBBBBBBBBT',
    '..BBBBBBBBBBBBBBBBTT',
    '...BBBBBBBBBBBBBB.TT',
    '......BBBBBBBB......',
    '........GGGG........'], { B: '#40c0ff', W: '#ffffff', T: '#2070c0', G: '#c0c0c0' });
  const BOMBS = makeSpr(['.W.', 'WWW', 'WWW', 'WWW', '.W.', 'W.W'], { W: '#ffffff' });

  ArcadeRegistry.register({
    id: 'canyonbomber', title: 'Canyon Bomber', year: 1977, maker: 'Atari',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Space: drop bomb \u00b7 Enter: start',
    marquee: { bg: '#1a0c04', fg: '#ff9030', accent: '#40c0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(1500);
      let mode = 'title', T = 0, coinFlash = 0, g = null, attractPage = 0;
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        drop() { au.tone(1400, 0.9, { type: 'square', vol: 0.05, slideTo: 300 }); },
        hit(v) { au.noise(0.12, { vol: 0.16, freq: 900 + v * 300, slideTo: 200 }); au.tone(220 + v * 60, 0.05, { type: 'square', vol: 0.08 }); },
        boom() { au.noise(0.35, { vol: 0.18, freq: 1200, slideTo: 80 }); },
        miss() { au.tone(180, 0.35, { type: 'sawtooth', vol: 0.14, slideTo: 90 }); },
        clear() { au.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [784, 0.08], [1047, 0.2]], { type: 'square', vol: 0.1 }); },
        life() { au.melody([[880, 0.06], [1175, 0.06], [1760, 0.12]], { type: 'square', vol: 0.1 }); },
        over() { au.melody([[392, 0.2], [330, 0.2], [262, 0.2], [196, 0.5]], { type: 'square', vol: 0.12 }); },
        start() { au.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]], { type: 'square', vol: 0.1 }); }
      };

      // ---------- canyon ----------
      function rockValue(r) { return 1 + Math.min(3, Math.floor(r * 4 / ROWS)); }
      function buildCanyon(n) {
        const r = rng(n * 977 + 31);
        const grid = new Int8Array(COLS * ROWS);
        const floor = [];
        const shape = 1.3 + (n % 3) * 0.45;
        for (let c = 0; c < COLS; c++) {
          const d = Math.abs(c + 0.5 - COLS / 2) / (COLS / 2 - 2);
          let depth = d >= 1 ? 0 : ROWS * (1 - Math.pow(d, shape)) + (r() * 3 - 1.5);
          if (c < 2 || c >= COLS - 2) depth = 0;
          floor.push(Math.max(0, Math.min(ROWS, Math.round(depth))));
        }
        for (let c = 1; c < COLS; c++) if (floor[c] - floor[c - 1] > 3) floor[c] = floor[c - 1] + 3;
        for (let c = COLS - 2; c >= 0; c--) if (floor[c] - floor[c + 1] > 3) floor[c] = floor[c + 1] + 3;
        let count = 0;
        for (let c = 0; c < COLS; c++) for (let rr = 0; rr < ROWS; rr++) {
          if (rr < floor[c]) { grid[rr * COLS + c] = rockValue(rr); count++; } else grid[rr * COLS + c] = -1;
        }
        return { grid, count };
      }
      const cell = (c, r) => (c < 0 || c >= COLS || r >= ROWS) ? -1 : r < 0 ? 0 : g.grid[r * COLS + c];

      function newGame(demo) {
        g = { demo, score: [0, 0], misses: 3, canyon: 0, nextLife: 1000, fx: [], phase: 'ready', phaseT: 0, msg: null, msgT: 0, idle: 0, settleT: 0 };
        startCanyon(0);
      }
      function startCanyon(n) {
        g.canyon = n;
        const cy = buildCanyon(n);
        g.grid = cy.grid; g.rocks = cy.count; g.start = cy.count;
        const sp = Math.min(1.75, 0.85 + n * 0.12);
        g.craft = [
          { kind: 'plane', x: -20, y: 40, dir: 1, sp, ai: g.demo, think: 0, skill: 0.5 },
          { kind: 'blimp', x: W + 20, y: 60, dir: -1, sp: sp * 0.75, ai: true, think: 0, skill: Math.min(0.85, 0.35 + n * 0.08) }
        ];
        g.bombs = [null, null];
        g.phase = 'ready'; g.phaseT = 0; g.idle = 0; g.fx.length = 0;
      }

      // Step one bomb pixel-by-pixel. Returns 'rock' | 'end' | null. dry = trajectory test only.
      function stepBomb(b, dry) {
        b.vy = Math.min(2.4, b.vy + 0.045);
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy))));
        for (let i = 0; i < n; i++) {
          b.x += b.vx / n; b.y += b.vy / n;
          if (b.x < 0 || b.x >= W) return 'end';
          if (b.y < CY) continue;
          const c = Math.floor(b.x / CW), r = Math.floor((b.y - CY) / CH);
          if (r >= ROWS) return 'end';
          const v = cell(c, r);
          if (v === -1) return 'end';
          if (v > 0) {
            if (dry) return 'rock';
            g.grid[r * COLS + c] = 0; g.rocks--; b.hits++; b.vx = 0; b.pierce--;
            b.x = c * CW + CW / 2;
            const who = b.owner;
            g.score[who] += v; g.idle = 0;
            if (who === 0 && !g.demo) checkLife();
            snd.hit(v);
            for (let k = 0; k < 6; k++) g.fx.push({ t: 'deb', x: c * CW + 4, y: CY + r * CH + 3, vx: rnd(2) - 1, vy: -rnd(1.6) - 0.3, life: 30 + irnd(20), col: ROCKCOL[v] });
            g.fx.push({ t: 'num', x: c * CW + 4, y: CY + r * CH - 2, v, life: 40, col: who === 0 ? '#ffffff' : '#60d0ff' });
            if (b.pierce <= 0) return 'rock-end';
            return 'rock';
          }
        }
        return null;
      }
      function trace(x, y, vx) {
        const b = { x, y, vx, vy: 0 };
        for (let i = 0; i < 400; i++) { const res = stepBomb(b, true); if (res === 'rock') return true; if (res === 'end') return false; }
        return false;
      }
      function dropBomb(i) {
        const c = g.craft[i];
        if (g.bombs[i] || c.x < 4 || c.x > W - 4) return false;
        g.bombs[i] = { owner: i, x: c.x, y: c.y + 5, vx: c.dir * c.sp * 0.95, vy: 0, hits: 0, pierce: 3 };
        if (i === 0 || !g.demo) snd.drop();
        return true;
      }
      function checkLife() {
        if (g.score[0] >= g.nextLife) {
          g.nextLife += 2000; if (g.misses < 6) { g.misses++; snd.life(); g.msg = 'EXTRA BOMB!'; g.msgT = 90; }
        }
        if (g.score[0] > hi) hi = g.score[0];
      }
      function onMiss(i) {
        if (i !== 0 || g.demo) return;
        g.misses--; snd.miss(); g.msg = 'MISS!'; g.msgT = 70;
        if (g.misses <= 0) {
          g.phase = 'dead'; g.phaseT = 0;
          const gameOver = () => { g.phase = 'over'; g.phaseT = 0; api.setHiScore(g.score[0]); snd.over(); };
          if (api.offerContinue) api.offerContinue(() => { g.misses = 3; g.phase = 'play'; g.msg = 'CONTINUE'; g.msgT = 60; }, gameOver);
          else gameOver();
        }
      }
      function settle() {
        for (let r = ROWS - 2; r >= 0; r--) for (let c = 0; c < COLS; c++) {
          const v = g.grid[r * COLS + c];
          if (v > 0 && g.grid[(r + 1) * COLS + c] === 0) { g.grid[(r + 1) * COLS + c] = v; g.grid[r * COLS + c] = 0; }
        }
      }

      function updateCraft(i) {
        const c = g.craft[i];
        c.x += c.dir * c.sp;
        if ((c.dir > 0 && c.x > W + 20) || (c.dir < 0 && c.x < -20)) {
          c.x = c.dir > 0 ? -20 : W + 20;
          c.y = SKY0 + irnd(SKY1 - SKY0);
          if (Math.abs(c.y - g.craft[1 - i].y) < 10) c.y = c.y > (SKY0 + SKY1) / 2 ? c.y - 14 : c.y + 14;
        }
        if (c.ai && g.phase === 'play' && !g.bombs[i] && --c.think <= 0) {
          c.think = 6 + irnd(10);
          if (c.x > 6 && c.x < W - 6 && trace(c.x, c.y + 5, c.dir * c.sp * 0.95) && Math.random() < c.skill) dropBomb(i);
          else if (Math.random() < 0.004) dropBomb(i);
        }
      }

      function updateGame() {
        g.phaseT++;
        if (g.msgT > 0) g.msgT--;
        if (g.phase === 'over') { if (g.phaseT > 240 || (g.phaseT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; T = 0; attractPage = 0; } return; }
        if (g.phase === 'dead') return;
        if (g.phase === 'ready') {
          g.craft.forEach((c, i) => { c.x += c.dir * c.sp; });
          if (g.phaseT > 100) g.phase = 'play';
          return;
        }
        if (g.phase === 'clear') {
          if (g.phaseT % 3 === 0) settle();
          if (g.phaseT > 180) startCanyon(g.canyon + 1);
          return;
        }
        // play
        if (!g.demo && api.anyPressed('Space', 'KeyX', 'ArrowDown')) dropBomb(0);
        for (let i = 0; i < 2; i++) {
          updateCraft(i);
          const b = g.bombs[i];
          if (b) {
            const res = stepBomb(b, false);
            if (res === 'end' || res === 'rock-end') {
              g.fx.push({ t: 'boom', x: b.x, y: Math.min(b.y, CY + ROWS * CH), life: 16 });
              if (res === 'end' && b.hits === 0) onMiss(i); else if (i === 0 || !g.demo) snd.boom();
              g.bombs[i] = null;
            }
          }
        }
        if (++g.settleT >= 3) { g.settleT = 0; settle(); }
        g.idle++;
        if (g.phase === 'play' && (g.rocks <= 0 || (g.rocks <= Math.max(6, g.start * 0.06) && g.idle > 900) || g.idle > 1800)) {
          g.phase = 'clear'; g.phaseT = 0; g.bombs = [null, null];
          const bonus = 50 * (g.canyon + 1);
          if (!g.demo) { g.score[0] += bonus; checkLife(); }
          g.msg = 'CANYON CLEARED  BONUS ' + bonus; g.msgT = 170;
          if (!g.demo) snd.clear();
        }
        for (const f of g.fx) {
          f.life--;
          if (f.t === 'deb') { f.x += f.vx; f.y += f.vy; f.vy += 0.08; }
          if (f.t === 'num') f.y -= 0.3;
        }
        g.fx = g.fx.filter(f => f.life > 0);
      }

      function tryStart() {
        if (api.useCredit()) { newGame(false); mode = 'game'; snd.start(); return; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
      }
      function update() {
        T++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.pressed('Enter') || api.pressed('Space')) { tryStart(); return; }
          if (attractPage === 1) {
            if (!g) newGame(true);
            updateGame();
            if (T > 1200 || g.phase === 'clear') { attractPage = 0; T = 0; g = null; }
          } else if (T > 420) { attractPage = 1; T = 0; newGame(true); }
          return;
        }
        updateGame();
      }

      // ---------- rendering ----------
      function drawCanyon(ctx) {
        // ground band behind the canyon
        ctx.fillStyle = '#7a3e18'; ctx.fillRect(0, CY, W, H - CY);
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const v = g.grid[r * COLS + c], x = c * CW, y = CY + r * CH;
          if (v === -1) {
            if (cell(c, r - 1) !== -1 && r > 0) { ctx.fillStyle = '#c06a28'; ctx.fillRect(x, y, CW, 2); }
            if (((c * 7 + r * 13) % 5) === 0) { ctx.fillStyle = '#5c2c10'; ctx.fillRect(x + 2, y + 3, 3, 1); }
            continue;
          }
          ctx.fillStyle = '#1c0e06'; ctx.fillRect(x, y, CW, CH);
          if (v > 0) {
            ctx.fillStyle = ROCKDARK[v]; ctx.fillRect(x + 1, y + 1, 7, 6);
            ctx.fillStyle = ROCKCOL[v]; ctx.fillRect(x + 1, y, 6, 6); ctx.fillRect(x, y + 1, 8, 4);
            tiny(ctx, v, x + 3, y + 1, '#000');
          }
        }
        // rim
        ctx.fillStyle = '#d88a40'; ctx.fillRect(0, CY - 2, 2 * CW, 2); ctx.fillRect(W - 2 * CW, CY - 2, 2 * CW, 2);
        ctx.fillStyle = '#7a3e18'; ctx.fillRect(0, CY + ROWS * CH, W, H - CY - ROWS * CH);
      }
      function drawSky(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#060818'; ctx.fillRect(0, 20, W, CY - 20);
        for (let i = 0; i < 24; i++) {
          const x = (i * 97 + 13) % W, y = 22 + (i * 53) % (CY - 30);
          ctx.fillStyle = ((T + i * 9) >> 5) & 1 ? '#555' : '#999'; ctx.fillRect(x, y, 1, 1);
        }
        // distant mesas
        ctx.fillStyle = '#2a1408';
        ctx.fillRect(18, CY - 10, 40, 10); ctx.fillRect(26, CY - 16, 22, 6); ctx.fillRect(190, CY - 8, 50, 8); ctx.fillRect(204, CY - 13, 20, 5);
      }
      function drawCraft(ctx, c) {
        if (c.kind === 'plane') drawSpr(ctx, PLANE, c.x, c.y, { flip: c.dir < 0 });
        else drawSpr(ctx, BLIMP, c.x, c.y, { flip: c.dir > 0 });
      }
      function drawHud(ctx) {
        const p1 = g && !g.demo ? g.score[0] : 0, p2 = g ? g.score[1] : 0;
        text(ctx, g && g.demo ? 'PLANE' : '1UP', 8, 2, '#ff6060');
        text(ctx, String(p1).padStart(5, '0'), 8, 11, '#fff');
        text(ctx, 'HI-SCORE', W / 2, 2, '#ffd040', 1, 'center');
        text(ctx, String(Math.max(hi, p1)).padStart(5, '0'), W / 2, 11, '#fff', 1, 'center');
        text(ctx, 'BLIMP', W - 8, 2, '#40c0ff', 1, 'right');
        text(ctx, String(p2).padStart(5, '0'), W - 8, 11, '#fff', 1, 'right');
      }
      function render(ctx) {
        drawSky(ctx);
        if (mode === 'title' && attractPage === 0) { drawTitle(ctx); return; }
        drawCanyon(ctx);
        for (const c of g.craft) drawCraft(ctx, c);
        for (const b of g.bombs) if (b) drawSpr(ctx, BOMBS, b.x, b.y, { col: b.owner === 0 ? '#ffffff' : '#80e0ff' });
        for (const f of g.fx) {
          if (f.t === 'deb') { ctx.fillStyle = f.col; ctx.fillRect(f.x | 0, f.y | 0, 2, 2); }
          else if (f.t === 'num') text(ctx, String(f.v), f.x, f.y | 0, f.col, 1, 'center');
          else if (f.t === 'boom') {
            const r = 16 - f.life;
            ctx.fillStyle = f.life & 2 ? '#ffffff' : '#ffd040';
            ctx.fillRect(f.x - r / 2, f.y - 1, r, 2); ctx.fillRect(f.x - 1, f.y - r / 2, 2, r);
            ctx.fillRect(f.x - r / 3, f.y - r / 3, 2, 2); ctx.fillRect(f.x + r / 3, f.y - r / 3, 2, 2);
          }
        }
        drawHud(ctx);
        // misses left
        if (!g.demo) {
          for (let i = 0; i < g.misses; i++) drawSpr(ctx, BOMBS, 44 + i * 6 + 6, 14, { col: '#ff6060' });
          text(ctx, 'CANYON ' + (g.canyon + 1), W / 2, H - 8, '#d88a40', 1, 'center');
        }
        if (g.phase === 'ready' && !g.demo) text(ctx, 'CANYON ' + (g.canyon + 1) + '  READY', W / 2, 60, '#ffffff', 1, 'center');
        if (g.msgT > 0 && g.msg && ((g.msgT >> 3) & 1 || g.msg !== 'MISS!')) text(ctx, g.msg, W / 2, 80, g.msg === 'MISS!' ? '#ff4040' : '#ffd040', g.msg.length < 12 ? 2 : 1, 'center');
        if (g.phase === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(60, 50, 136, 30); text(ctx, 'GAME OVER', W / 2, 58, '#ff4040', 2, 'center'); }
        if (g.demo) {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 40, 100, 22);
          text(ctx, 'DEMO PLAY', W / 2, 42, '#ffffff', 1, 'center');
          drawCoin(ctx, 52);
        }
      }
      function drawCoin(ctx, y) {
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, y, '#ffffff', 1, 'center');
      }
      function drawTitle(ctx) {

        drawHud(ctx);
        ctx.fillStyle = '#7a3e18'; ctx.fillRect(0, CY + 70, W, H - CY - 70);
        text(ctx, 'CANYON', W / 2, 30, '#ff9030', 3, 'center');
        text(ctx, 'BOMBER', W / 2, 56, '#ffd040', 3, 'center');
        const px = ((T * 1.2) % (W + 40)) - 20;
        drawSpr(ctx, PLANE, px, 90, {});
        drawSpr(ctx, BLIMP, W - px, 104, { flip: false });
        text(ctx, 'ROCK VALUES', W / 2, 120, '#ffffff', 1, 'center');
        for (let v = 1; v <= 4; v++) {
          const x = 48 + (v - 1) * 44, y = 132;
          ctx.fillStyle = ROCKCOL[v]; ctx.fillRect(x + 1, y, 6, 6); ctx.fillRect(x, y + 1, 8, 4);
          tiny(ctx, v, x + 3, y + 1, '#000');
          text(ctx, '= ' + v, x + 11, y, ROCKCOL[v]);
        }
        text(ctx, 'DEEPER ROCKS SCORE MORE', W / 2, 146, '#d88a40', 1, 'center');
        text(ctx, 'A BOMB THAT HITS NO ROCK IS A MISS', W / 2, 157, '#d88a40', 1, 'center');
        text(ctx, '3 MISSES AND THE GAME IS OVER', W / 2, 168, '#d88a40', 1, 'center');
        drawCoin(ctx, 186);
        text(ctx, credStr(), 4, H - 9, '#aaaaaa');
        text(ctx, '\u00a9 1977 ATARI', W - 4, H - 9, '#aaaaaa', 1, 'right');
      }
      return { update, render, destroy() { if (g && !g.demo) api.setHiScore(g.score[0]); } };
    }
  });
})();
