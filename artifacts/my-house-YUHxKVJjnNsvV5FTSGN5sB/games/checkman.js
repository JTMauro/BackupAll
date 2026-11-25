// Checkman (Zilec-Zenitone, 1982) \u2014 from-scratch recreation: push the checker tiles into the board pattern, squash the bugs.
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
  // Pixel sprite from strings ('.' = transparent), centred at cx,cy, rotated rot*90 degrees clockwise.
  function spr(ctx, rows, cx, cy, pal, rot, sc) {
    rot = (rot || 0) & 3; sc = sc || 1;
    const h = rows.length, w = rows[0].length;
    const ow = (rot & 1) ? h : w, oh = (rot & 1) ? w : h;
    const x0 = Math.round(cx - ow * sc / 2), y0 = Math.round(cy - oh * sc / 2);
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) {
        const ch = row[c]; if (ch === '.' || ch === ' ') continue;
        let px, py;
        if (rot === 0) { px = c; py = r; } else if (rot === 1) { px = h - 1 - r; py = c; }
        else if (rot === 2) { px = w - 1 - c; py = h - 1 - r; } else { px = r; py = w - 1 - c; }
        ctx.fillStyle = pal[ch] || '#f0f';
        ctx.fillRect(x0 + px * sc, y0 + py * sc, sc, sc);
      }
    }
  }
  function pad(n, l) { return String(n).padStart(l, '0'); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(n) { return Math.floor(Math.random() * n); }
  ArcadeRegistry.register({
    id: 'checkman', title: 'Checkman', year: 1982, maker: 'Zilec-Zenitone',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Arrows: walk / push tile \u00b7 Space: kick tile (slides) \u00b7 X: pull tile \u00b7 Enter: start',
    marquee: { bg: '#100010', fg: '#ff3040', accent: '#ffffff' },
    create(api) {
      const W = 256, H = 224, COLS = 15, ROWS = 11, CS = 16, OX = 8, OY = 36;
      const au = api.audio;
      const C = { red: '#ff3040', dred: '#901020', white: '#f0f0f0', grey: '#9090a0', yellow: '#ffe040', cyan: '#40e0ff', green: '#40ff60', floor: '#10102c', floor2: '#16163a', wall: '#3050c0', wallHi: '#7090ff', orange: '#ff9020' };
      const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const KEYS = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];

      // ---------- sprites ----------
      const MAN = [
        [
          '....hhhh....',
          '...hhhhhh...',
          '...ssssss...',
          '...sesses...',
          '....ssss....',
          '..rrrrrrrr..',
          '.srrwrrwrrs.',
          '.s.rrrrrr.s.',
          '...bbbbbb...',
          '...bb..bb...',
          '...bb..bb...',
          '..kkk..kkk..'
        ],
        [
          '....hhhh....',
          '...hhhhhh...',
          '...ssssss...',
          '...sesses...',
          '....ssss....',
          '..rrrrrrrr..',
          '.srrwrrwrrs.',
          '.s.rrrrrr.s.',
          '...bbbbbb...',
          '..bb....bb..',
          '.bb......bb.',
          '.kk......kk.'
        ]
      ];
      const MAN_PAL = { h: '#ffe040', s: '#ffc090', e: '#000000', r: '#ff3040', w: '#ffffff', b: '#3060ff', k: '#804020' };
      const BUG = [
        [
          '...g....g...',
          '....g..g....',
          '..gggggggg..',
          '.gwwggggwwg.',
          '.gwkggggwkg.',
          'gggggggggggg',
          'gggyggggyggg',
          '.gggggggggg.',
          '..gggggggg..',
          '.g..g..g..g.',
          'g..g....g..g'
        ],
        [
          '..g......g..',
          '...g....g...',
          '..gggggggg..',
          '.gwwggggwwg.',
          '.gkwggggkwg.',
          'gggggggggggg',
          'ggyggggggygg',
          '.gggggggggg.',
          '..gggggggg..',
          '..g..gg..g..',
          '.g..g..g..g.'
        ]
      ];
      const BUG_PALS = [{ g: '#40ff60', w: '#fff', k: '#000', y: '#ffe040' }, { g: '#ff60ff', w: '#fff', k: '#000', y: '#40e0ff' }, { g: '#ff9020', w: '#fff', k: '#000', y: '#fff' }];
      const SQUASH = ['g.g.gg.g.g..', '.gggggggggg.', 'gggggggggggg'];

      // ---------- state ----------
      let hi = api.getHiScore(10000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;

      function cellX(c) { return OX + c * CS; }
      function cellY(r) { return OY + r * CS; }
      function inB(c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS; }
      const PILLARS = [[2, 2], [12, 2], [2, 8], [12, 8], [2, 5], [12, 5], [5, 1], [9, 1], [5, 9], [9, 9]];
      const START = [7, 10];
      const SPAWNS = [[0, 0], [14, 0], [0, 10], [14, 10]];
      function boardSize(stage) {
        const S = [[3, 3], [4, 3], [4, 4], [5, 4], [5, 5]];
        return S[Math.min(S.length - 1, stage - 1)];
      }
      function isWall(c, r) { return g.walls[r * COLS + c] === 1; }
      function tileAt(c, r) { for (const t of g.tiles) if (t.c === c && t.r === r) return t; return null; }
      function markAt(c, r) { for (const m of g.marks) if (m.c === c && m.r === r) return m; return null; }
      function enemyAt(c, r) { for (const e of g.bugs) if (e.alive && e.c === c && e.r === r) return e; return null; }

      function buildStage() {
        g.walls = new Array(COLS * ROWS).fill(0);
        const nP = Math.min(PILLARS.length, 4 + g.stage * 2);
        for (let i = 0; i < nP; i++) { const p = PILLARS[i]; g.walls[p[1] * COLS + p[0]] = 1; }
        const [bw, bh] = boardSize(g.stage);
        const c0 = 7 - Math.floor(bw / 2), r0 = 5 - Math.floor(bh / 2);
        g.marks = [];
        let nRed = 0, nWhite = 0;
        for (let r = 0; r < bh; r++) for (let c = 0; c < bw; c++) {
          const col = (r + c) & 1;
          g.marks.push({ c: c0 + c, r: r0 + r, col });
          if (col) nWhite++; else nRed++;
        }
        g.board = { c0, r0, bw, bh };
        // tiles: one spare of each colour; random cells off the board, off the outer edge, away from start/spawns
        g.tiles = [];
        const free = [];
        for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
          if (isWall(c, r) || markAt(c, r)) continue;
          if (Math.abs(c - START[0]) + Math.abs(r - START[1]) < 2) continue;
          // keep a one-cell walkway around the board so tiles can be pushed in from every side
          if (c >= c0 - 1 && c <= c0 + bw && r >= r0 - 1 && r <= r0 + bh) continue;
          free.push([c, r]);
        }
        for (let i = free.length - 1; i > 0; i--) { const j = irnd(i + 1); const t = free[i]; free[i] = free[j]; free[j] = t; }
        const want = [];
        for (let i = 0; i < nRed + 1; i++) want.push(0);
        for (let i = 0; i < nWhite + 1; i++) want.push(1);
        // don't place two tiles adjacent where possible (reduces jams)
        let fi = 0;
        for (const col of want) {
          let placed = false;
          for (let tries = 0; tries < free.length && !placed; tries++) {
            const p = free[(fi + tries) % free.length];
            if (tileAt(p[0], p[1])) continue;
            const adj = DIRS.some(d => tileAt(p[0] + d[0], p[1] + d[1]));
            if (adj && tries < free.length - 1) continue;
            g.tiles.push(newTile(p[0], p[1], col)); placed = true; fi = (fi + tries + 1) % free.length;
          }
        }
        g.time = 3000; g.hurry = false; g.timeT = 0;
      }
      function newTile(c, r, col) { return { c, r, col, x: cellX(c), y: cellY(r), locked: false, slide: -1, kickChain: 0, flash: 0 }; }
      function resetActors() {
        let sc = START[0], sr = START[1];
        if (g.tiles && tileAt(sc, sr)) {
          let bd = 1e9;
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            if (isWall(c, r) || tileAt(c, r)) continue;
            const d = Math.abs(c - START[0]) + Math.abs(r - START[1]);
            if (d < bd) { bd = d; sc = c; sr = r; }
          }
        }
        g.player = { c: sc, r: sr, x: cellX(sc), y: cellY(sr), dir: 0, moving: false, step: 0, pullT: 0 };
        g.bugs = [];
        const n = Math.min(5, 2 + Math.floor((g.stage - 1) / 2));
        for (let i = 0; i < n; i++) spawnBug(i, 150 + i * 150);
        g.inv = 120;
      }
      function spawnBug(i, delay) {
        const s = SPAWNS[i % SPAWNS.length];
        const b = { c: s[0], r: s[1], x: cellX(s[0]), y: cellY(s[1]), dir: 2, alive: false, wait: delay, kind: i % 3, squash: 0, idx: i };
        g.bugs[i] = b;
      }
      function newGame() {
        g = { score: 0, lives: 4, stage: 1, extra: false, phase: 'ready', t: 120, pops: [], deathT: 0 };
        buildStage(); resetActors();
        au.melody([[523, .1], [523, .1], [784, .1], [659, .1], [784, .2], [1047, .3]], { type: 'square', vol: 0.12 });
      }
      function nextStage() {
        g.stage++; buildStage(); resetActors(); g.phase = 'ready'; g.t = 120;
        au.melody([[659, .08], [784, .08], [1047, .2]], { type: 'square', vol: 0.12 });
      }
      function addScore(n) {
        g.score += n;
        if (!g.extra && g.score >= 20000) { g.extra = true; g.lives++; au.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .15]], { type: 'square', vol: 0.1 }); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, n, col) { g.pops.push({ x, y, n, t: 60, col: col || C.cyan }); }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.15 });
        return false;
      }

      // ---------- tiles ----------
      function freeForTile(c, r, ignoreBugs) {
        if (!inB(c, r) || isWall(c, r) || tileAt(c, r)) return false;
        if (g.player.c === c && g.player.r === r) return false;
        if (!ignoreBugs && enemyAt(c, r)) return false;
        return true;
      }
      function checkLock(t) {
        const m = markAt(t.c, t.r);
        if (m && m.col === t.col && !t.locked) {
          t.locked = true; t.flash = 30;
          addScore(100); pop(t.x + 8, t.y, 100, C.yellow);
          au.melody([[1047, .05], [1568, .1]], { type: 'square', vol: 0.12 });
          fillEnclosed();
          if (g.tiles.filter(x => x.locked).length >= g.marks.length || g.marks.every(mm => { const tt = tileAt(mm.c, mm.r); return tt && tt.locked; })) stageClear();
        }
      }
      // Anti-softlock: a mark boxed in on all four sides by locked tiles/walls can never be reached,
      // so it is filled automatically (same 100 points) instead of leaving the board unwinnable.
      function fillEnclosed() {
        for (const mm of g.marks) {
          if (tileAt(mm.c, mm.r)) continue;
          const shut = DIRS.every(d => { const c = mm.c + d[0], r = mm.r + d[1]; if (!inB(c, r) || isWall(c, r)) return true; const tt = tileAt(c, r); return !!(tt && tt.locked); });
          if (!shut) continue;
          const nt = newTile(mm.c, mm.r, mm.col); nt.locked = true; nt.flash = 40;
          g.tiles.push(nt);
          addScore(100); pop(nt.x + 8, nt.y, 100, C.yellow);
        }
      }
      function stageClear() {
        g.phase = 'clear'; g.t = 210;
        g.bonus = g.time;
        au.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .08], [1319, .3]], { type: 'square', vol: 0.12 });
      }
      function moveTiles() {
        for (const t of g.tiles) {
          if (t.flash > 0) t.flash--;
          const tx = cellX(t.c), ty = cellY(t.r);
          if (t.slide >= 0) {
            const sp = 4;
            t.x += Math.sign(tx - t.x) * Math.min(sp, Math.abs(tx - t.x));
            t.y += Math.sign(ty - t.y) * Math.min(sp, Math.abs(ty - t.y));
            if (t.x === tx && t.y === ty) {
              const d = DIRS[t.slide], nc = t.c + d[0], nr = t.r + d[1];
              if (freeForTile(nc, nr, true)) {
                t.c = nc; t.r = nr;
                const e = enemyAt(nc, nr);
                if (e) squash(e, t);
                au.tone(180 + t.kickChain * 40, 0.03, { type: 'square', vol: 0.05 });
              } else {
                t.slide = -1;
                au.tone(120, 0.06, { type: 'square', vol: 0.1 });
                checkLock(t);
              }
            }
            // bugs walking into the moving tile's path get crushed too
            for (const e of g.bugs) if (e.alive && Math.abs(e.x - t.x) < 10 && Math.abs(e.y - t.y) < 10) squash(e, t);
          } else if (t.x !== tx || t.y !== ty) {
            t.x += Math.sign(tx - t.x) * Math.min(2, Math.abs(tx - t.x));
            t.y += Math.sign(ty - t.y) * Math.min(2, Math.abs(ty - t.y));
            if (t.x === tx && t.y === ty) checkLock(t);
          }
        }
      }
      function squash(e, t) {
        if (!e.alive) return;
        e.alive = false; e.squash = 40;
        const pts = 200 * Math.pow(2, Math.min(4, t.kickChain));
        t.kickChain++;
        addScore(pts); pop(e.x + 8, e.y, pts, C.green);
        au.noise(0.2, { vol: 0.2, freq: 1500, slideTo: 200 });
        au.tone(800, 0.2, { type: 'square', vol: 0.08, slideTo: 100 });
        e.wait = 360;
      }

      // ---------- player ----------
      function updatePlayer() {
        const p = g.player;
        const tx = cellX(p.c), ty = cellY(p.r);
        if (p.x !== tx || p.y !== ty) {
          const sp = 2;
          p.x += Math.sign(tx - p.x) * Math.min(sp, Math.abs(tx - p.x));
          p.y += Math.sign(ty - p.y) * Math.min(sp, Math.abs(ty - p.y));
          p.step++;
          if ((p.step & 7) === 0) au.tone(p.step & 8 ? 300 : 260, 0.02, { type: 'square', vol: 0.04 });
          return;
        }
        // kick
        if (api.pressed('Space')) {
          const d = DIRS[p.dir], t = tileAt(p.c + d[0], p.r + d[1]);
          if (t && !t.locked && t.slide < 0 && t.x === cellX(t.c) && t.y === cellY(t.r)) {
            const nc = t.c + d[0], nr = t.r + d[1];
            if (freeForTile(nc, nr, true)) {
              t.slide = p.dir; t.kickChain = 0;
              au.tone(500, 0.08, { type: 'square', vol: 0.12, slideTo: 200 });
              return;
            }
          }
          au.tone(150, 0.04, { type: 'square', vol: 0.06 });
        }
        // pull
        if (api.pressed('KeyX')) {
          const d = DIRS[p.dir], t = tileAt(p.c + d[0], p.r + d[1]);
          const bc = p.c - d[0], br = p.r - d[1];
          if (t && !t.locked && t.slide < 0 && inB(bc, br) && !isWall(bc, br) && !tileAt(bc, br) && !enemyAt(bc, br)) {
            t.c = p.c; t.r = p.r; p.c = bc; p.r = br;
            au.tone(260, 0.1, { type: 'triangle', vol: 0.1, slideTo: 400 });
            return;
          }
        }
        for (let i = 0; i < 4; i++) {
          if (!api.key(KEYS[i])) continue;
          p.dir = i;
          const d = DIRS[i], nc = p.c + d[0], nr = p.r + d[1];
          if (!inB(nc, nr) || isWall(nc, nr)) return;
          const t = tileAt(nc, nr);
          if (t) {
            if (t.locked || t.slide >= 0 || t.x !== cellX(t.c) || t.y !== cellY(t.r)) return;
            const bc = nc + d[0], br = nr + d[1];
            if (!freeForTile(bc, br, false)) return;
            t.c = bc; t.r = br;
            au.tone(200, 0.05, { type: 'square', vol: 0.07 });
          }
          p.c = nc; p.r = nr;
          return;
        }
      }

      // ---------- bugs ----------
      function bugFree(c, r) { return inB(c, r) && !isWall(c, r) && !tileAt(c, r); }
      function bfsDir(sc, sr, tc, tr) {
        const prev = new Int16Array(COLS * ROWS).fill(-1);
        const q = [sr * COLS + sc]; prev[q[0]] = q[0];
        let found = false;
        for (let qi = 0; qi < q.length; qi++) {
          const cur = q[qi], c = cur % COLS, r = (cur / COLS) | 0;
          if (c === tc && r === tr) { found = true; break; }
          for (let i = 0; i < 4; i++) {
            const nc = c + DIRS[i][0], nr = r + DIRS[i][1];
            if (!bugFree(nc, nr)) continue;
            const ni = nr * COLS + nc;
            if (prev[ni] >= 0) continue;
            prev[ni] = cur; q.push(ni);
          }
        }
        if (!found) return -1;
        let cur = tr * COLS + tc, start = sr * COLS + sc;
        if (cur === start) return -1;
        while (prev[cur] !== start) cur = prev[cur];
        const c = cur % COLS, r = (cur / COLS) | 0;
        for (let i = 0; i < 4; i++) if (sc + DIRS[i][0] === c && sr + DIRS[i][1] === r) return i;
        return -1;
      }
      // bugs start well below the player's walking speed (2) and speed up gently each stage
      function bugSpeed() { return Math.min(1.5, 0.6 + g.stage * 0.08 + (g.hurry ? 0.3 : 0)); }
      function updateBugs() {
        const p = g.player;
        for (let i = 0; i < g.bugs.length; i++) {
          const e = g.bugs[i];
          if (!e.alive) {
            if (e.squash > 0) { e.squash--; continue; }
            if (--e.wait <= 0) {
              // respawn at the spawn corner farthest from the player
              let best = SPAWNS[0], bd = -1;
              for (const s of SPAWNS) { const d = Math.abs(s[0] - p.c) + Math.abs(s[1] - p.r); if (d > bd && bugFree(s[0], s[1])) { bd = d; best = s; } }
              if (bd < 0) { e.wait = 30; continue; }
              e.c = best[0]; e.r = best[1]; e.x = cellX(e.c); e.y = cellY(e.r); e.alive = true; e.squash = 0;
              au.tone(120, 0.25, { type: 'sawtooth', vol: 0.06, slideTo: 600 });
            }
            continue;
          }
          const tx = cellX(e.c), ty = cellY(e.r);
          if (e.x !== tx || e.y !== ty) {
            const sp = bugSpeed();
            e.x += Math.sign(tx - e.x) * Math.min(sp, Math.abs(tx - e.x));
            e.y += Math.sign(ty - e.y) * Math.min(sp, Math.abs(ty - e.y));
            continue;
          }
          // choose next cell
          const smart = Math.min(0.85, 0.2 + g.stage * 0.07 + (g.hurry ? 0.2 : 0));
          let d = -1;
          if (Math.random() < smart) d = bfsDir(e.c, e.r, p.c, p.r);
          if (d < 0 || Math.random() < 0.1) {
            const opts = [];
            for (let k = 0; k < 4; k++) {
              const nc = e.c + DIRS[k][0], nr = e.r + DIRS[k][1];
              if (bugFree(nc, nr) && !enemyAt(nc, nr) && k !== ((e.dir + 2) & 3)) opts.push(k);
            }
            if (!opts.length) for (let k = 0; k < 4; k++) { const nc = e.c + DIRS[k][0], nr = e.r + DIRS[k][1]; if (bugFree(nc, nr)) opts.push(k); }
            if (opts.length) d = opts.indexOf(e.dir) >= 0 && Math.random() < 0.6 ? e.dir : opts[irnd(opts.length)];
          }
          if (d >= 0) {
            const nc = e.c + DIRS[d][0], nr = e.r + DIRS[d][1];
            if (bugFree(nc, nr) && !enemyAt(nc, nr)) { e.c = nc; e.r = nr; e.dir = d; }
          }
        }
      }

      function playerDie() {
        g.phase = 'dying'; g.t = 120;
        au.melody([[784, .08], [740, .08], [698, .08], [659, .08], [622, .08], [587, .08], [554, .08], [523, .3]], { type: 'square', vol: 0.12 });
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.t = 300;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.12 });
      }

      function updateGame() {
        for (const pp of g.pops) pp.t--;
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; return; }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 200 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase === 'wait') return;
        if (g.phase === 'dying') {
          if (--g.t <= 0) {
            g.lives--;
            if (g.lives <= 0) {
              g.phase = 'wait';
              if (api.offerContinue) {
                const cg = g;
                api.offerContinue(() => { if (g === cg) { g.lives = 4; resetActors(); g.phase = 'ready'; g.t = 90; } }, () => { if (g === cg) gameOver(); });
              } else gameOver();
              return;
            }
            resetActors(); g.phase = 'ready'; g.t = 90;
          }
          return;
        }
        if (g.phase === 'clear') {
          moveTiles();
          if (g.t > 60 && g.bonus > 0 && (frame & 1)) { const d = Math.min(g.bonus, 50); g.bonus -= d; addScore(d); if ((frame & 7) === 1) au.tone(1200, 0.03, { type: 'square', vol: 0.06 }); }
          if (--g.t <= 0) { addScore(g.bonus); g.bonus = 0; nextStage(); }
          return;
        }
        // timer
        if (++g.timeT >= 30) {
          g.timeT = 0;
          if (g.time > 0) { g.time -= 10; if (g.time <= 0) { g.time = 0; g.hurry = true; au.melody([[880, .08], [0, .04], [880, .08], [0, .04], [880, .08]], { type: 'square', vol: 0.12 }); } }
        }
        updatePlayer();
        moveTiles();
        if (g.phase !== 'play') return;
        updateBugs();
        if ((frame % (g.hurry ? 20 : 32)) === 0) au.tone(g.hurry ? 110 : 82, 0.06, { type: 'triangle', vol: 0.06 });
        const p = g.player;
        if (g.inv > 0) { g.inv--; return; }
        for (const e of g.bugs) {
          if (e.alive && Math.abs(e.x - p.x) < 8 && Math.abs(e.y - p.y) < 8) { playerDie(); return; }
        }
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        updateGame();
        if (!g) mode = 'title';
      }

      // ---------- render ----------
      function drawTile(ctx, x, y, col, locked, flash) {
        x = Math.round(x); y = Math.round(y);
        const base = col ? C.white : C.red, dark = col ? '#8a8aa0' : C.dred, light = col ? '#ffffff' : '#ff9098';
        ctx.fillStyle = flash > 0 && (flash >> 2) & 1 ? C.yellow : dark; ctx.fillRect(x + 1, y + 1, 14, 14);
        ctx.fillStyle = base; ctx.fillRect(x + 2, y + 2, 11, 11);
        ctx.fillStyle = light; ctx.fillRect(x + 2, y + 2, 11, 1); ctx.fillRect(x + 2, y + 2, 1, 11);
        // little check pattern in the middle
        ctx.fillStyle = dark;
        ctx.fillRect(x + 5, y + 5, 3, 3); ctx.fillRect(x + 8, y + 8, 3, 3);
        if (locked) {
          ctx.fillStyle = C.green;
          ctx.fillRect(x + 4, y + 8, 2, 2); ctx.fillRect(x + 6, y + 10, 2, 2); ctx.fillRect(x + 8, y + 8, 2, 2); ctx.fillRect(x + 10, y + 6, 2, 2); ctx.fillRect(x + 11, y + 4, 2, 2);
        }
      }
      function drawField(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(OX - 3, OY - 3, COLS * CS + 6, ROWS * CS + 6);
        ctx.fillStyle = C.wall; ctx.fillRect(OX - 3, OY - 3, COLS * CS + 6, 2); ctx.fillRect(OX - 3, OY + ROWS * CS + 1, COLS * CS + 6, 2);
        ctx.fillRect(OX - 3, OY - 3, 2, ROWS * CS + 6); ctx.fillRect(OX + COLS * CS + 1, OY - 3, 2, ROWS * CS + 6);
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = (r + c) & 1 ? C.floor : C.floor2;
          ctx.fillRect(cellX(c), cellY(r), CS, CS);
          if (isWall(c, r)) {
            ctx.fillStyle = C.wall; ctx.fillRect(cellX(c) + 1, cellY(r) + 1, 14, 14);
            ctx.fillStyle = C.wallHi; ctx.fillRect(cellX(c) + 1, cellY(r) + 1, 14, 2); ctx.fillRect(cellX(c) + 1, cellY(r) + 1, 2, 14);
            ctx.fillStyle = '#182860'; ctx.fillRect(cellX(c) + 5, cellY(r) + 5, 6, 6);
          }
        }
        // board marks
        const b = g.board;
        ctx.fillStyle = (g.phase === 'clear' && (frame >> 3) & 1) ? C.yellow : C.cyan;
        const bx = cellX(b.c0) - 2, by = cellY(b.r0) - 2;
        ctx.fillRect(bx, by, b.bw * CS + 4, 1); ctx.fillRect(bx, by + b.bh * CS + 3, b.bw * CS + 4, 1);
        ctx.fillRect(bx, by, 1, b.bh * CS + 4); ctx.fillRect(bx + b.bw * CS + 3, by, 1, b.bh * CS + 4);
        for (const m of g.marks) {
          const x = cellX(m.c), y = cellY(m.r);
          ctx.fillStyle = m.col ? '#505068' : '#501020'; ctx.fillRect(x + 1, y + 1, 14, 14);
          ctx.fillStyle = m.col ? '#c0c0d0' : C.red;
          ctx.fillRect(x + 2, y + 2, 12, 1); ctx.fillRect(x + 2, y + 13, 12, 1); ctx.fillRect(x + 2, y + 2, 1, 12); ctx.fillRect(x + 13, y + 2, 1, 12);
          ctx.fillRect(x + 7, y + 7, 2, 2);
        }
      }
      function drawHUD(ctx) {
        text(ctx, '1UP', 8, 4, C.red);
        text(ctx, pad(g ? g.score : 0, 6), 8, 13, C.white);
        text(ctx, 'HI-SCORE', W / 2, 4, C.red, 1, 'center');
        text(ctx, pad(hi, 6), W / 2, 13, C.white, 1, 'center');
        if (!g) return;
        text(ctx, 'STAGE ' + g.stage, W - 8, 4, C.yellow, 1, 'right');
        text(ctx, 'TIME ' + pad(g.time, 4), W - 8, 13, g.hurry ? ((frame >> 3) & 1 ? C.red : C.white) : C.cyan, 1, 'right');
        text(ctx, 'MEN ' + Math.max(0, g.lives - 1), 8, H - 8, C.yellow);
        const left = g.marks.filter(m => { const t = tileAt(m.c, m.r); return !(t && t.locked); }).length;
        text(ctx, 'LEFT ' + left, W - 8, H - 8, C.white, 1, 'right');
      }
      function drawMan(ctx, p, dead) {
        const f = (p.x !== cellX(p.c) || p.y !== cellY(p.r)) ? ((p.step >> 2) & 1) : 0;
        const cx = p.x + 8, cy = p.y + 8;
        if (dead) {
          const k = 120 - g.t;
          spr(ctx, MAN[0], cx, cy, k > 40 && (k >> 2) & 1 ? { h: '#fff', s: '#fff', e: '#fff', r: '#fff', w: '#fff', b: '#fff', k: '#fff' } : MAN_PAL, (k >> 3) & 3);
          return;
        }
        if (g.inv > 0 && g.phase === 'play' && (frame >> 2) & 1) return;
        spr(ctx, MAN[f], cx, cy, MAN_PAL, 0);
        // facing marker
        const d = DIRS[p.dir];
        ctx.fillStyle = C.yellow; ctx.fillRect(Math.round(cx + d[0] * 7) - 1, Math.round(cy + d[1] * 7) - 1, 2, 2);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawHUD(ctx);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawField(ctx);
        for (const t of g.tiles) drawTile(ctx, t.x, t.y, t.col, t.locked, t.flash);
        for (const e of g.bugs) {
          if (e.alive) spr(ctx, BUG[(frame >> 3) & 1], e.x + 8, e.y + 8, BUG_PALS[e.kind], 0);
          else if (e.squash > 0) spr(ctx, SQUASH, e.x + 8, e.y + 13, BUG_PALS[e.kind], 0);
          else if (e.wait < 60 && (frame >> 2) & 1) { const s = SPAWNS[e.idx % SPAWNS.length]; ctx.fillStyle = C.orange; ctx.fillRect(cellX(s[0]) + 6, cellY(s[1]) + 6, 4, 4); }
        }
        if (g.phase !== 'over' && g.phase !== 'wait') drawMan(ctx, g.player, g.phase === 'dying');
        for (const pp of g.pops) text(ctx, pp.n, pp.x, pp.y - (60 - pp.t) * 0.3, pp.col, 1, 'center');
        if (g.phase === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 14 + OY, 100, 22);
          text(ctx, 'STAGE ' + g.stage, W / 2, 17 + OY, C.yellow, 1, 'center');
          text(ctx, 'READY!', W / 2, 27 + OY, (frame >> 3) & 1 ? C.white : C.cyan, 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 14 + OY, 120, 22);
          text(ctx, 'CHECK! BOARD COMPLETE', W / 2, 17 + OY, C.green, 1, 'center');
          text(ctx, 'TIME BONUS ' + g.bonus, W / 2, 27 + OY, C.white, 1, 'center');
        }
        if (g.hurry && g.phase === 'play' && (frame >> 4) & 1) text(ctx, 'HURRY UP!', W / 2, 24, C.red, 1, 'center');
        if (g.phase === 'over' || g.phase === 'wait') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 100, 120, 24);
          text(ctx, 'GAME OVER', W / 2, 105, C.red, 2, 'center');
        }
      }
      function drawTitle(ctx) {
        // checkered logo
        const word = 'CHECKMAN';
        const sc = 3, w = word.length * 6 * sc - sc, x0 = Math.round(W / 2 - w / 2), y0 = 34;
        for (let i = 0; i < word.length; i++) {
          const gl = FONT[word[i]];
          for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r] & (16 >> c)) {
            ctx.fillStyle = ((r + c + i + (titleT >> 4)) & 1) ? C.red : C.white;
            ctx.fillRect(x0 + (i * 6 + c) * sc, y0 + r * sc, sc, sc);
          }
        }
        spr(ctx, MAN[(titleT >> 3) & 1], 54, 86, MAN_PAL);
        drawTile(ctx, 66, 78, 0, false, 0);
        drawTile(ctx, 84, 78, 1, false, 0);
        text(ctx, 'PUSH THE TILES ONTO', 110, 76, C.white);
        text(ctx, 'THE CHECKERBOARD', 110, 86, C.white);
        const mx = 40, my = 104;
        for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) drawTile(ctx, mx + c * 16, my + r * 16, (r + c) & 1, (titleT >> 5) % 6 > r * 3 + c, 0);
        text(ctx, 'RED ON RED', 110, 106, C.red);
        text(ctx, 'WHITE ON WHITE', 110, 116, C.white);
        text(ctx, '100 PTS EACH', 110, 126, C.yellow);
        spr(ctx, BUG[(titleT >> 3) & 1], 54, 152, BUG_PALS[0]);
        spr(ctx, BUG[(titleT >> 3) & 1], 74, 152, BUG_PALS[1]);
        text(ctx, 'KICK A TILE INTO BUGS', 96, 144, C.green);
        text(ctx, '200 400 800 1600 3200', 96, 154, C.cyan);
        text(ctx, 'SPACE KICK   X PULL', W / 2, 172, C.grey, 1, 'center');
        const blink = (titleT >> 4) & 1;
        if (api.credits === 0 || coinFlash > 0) { if (blink || (coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 188, C.red, 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 188, C.yellow, 1, 'center');
        text(ctx, '\u00a9 1982 ZILEC-ZENITONE', W / 2, 202, C.grey, 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 8, H - 9, C.grey);
      }
      return { update, render, destroy() { } };
    }
  });
})();
