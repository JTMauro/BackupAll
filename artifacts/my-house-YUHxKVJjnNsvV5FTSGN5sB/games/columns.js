// Columns (Sega, 1990) - from-scratch recreation for the MAME32 Game Room.
// Falling columns of three jewels: cycle them, line up 3+ of a colour in any direction, chain reactions, magic jewel.
(function () {
  'use strict';
  const W = 320, H = 224;

  // ---------- 5x7 bitmap font ----------
  const FONT_HEX = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E',
    '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
    '8': '0E11110E11110E', '9': '0E11110F01020C', 'A': '0E11111F111111', 'B': '1E11111E11111E',
    'C': '0E11101010110E', 'D': '1C12111111121C', 'E': '1F10101E10101F', 'F': '1F10101E101010',
    'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E04040404040E', 'J': '0702020202120C',
    'K': '11121418141211', 'L': '1010101010101F', 'M': '111B1515111111', 'N': '11111915131111',
    'O': '0E11111111110E', 'P': '1E11111E101010', 'Q': '0E11111115120D', 'R': '1E11111E141211',
    'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E', 'V': '11111111110A04',
    'W': '1111111515150A', 'X': '11110A040A1111', 'Y': '1111110A040404', 'Z': '1F01020408101F',
    ' ': '00000000000000', '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C',
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '=': '00001F001F0000', '>': '08040201020408', '<': '02040810080402', '*': '0004150E150400',
    '+': '0004041F040400', 'x': '00110A040A1100'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k], a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function txt(ctx, s, x, y, col, sc) {
    sc = sc || 1; ctx.fillStyle = col; s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
  }
  const tw = (s, sc) => (String(s).length * 6 - 1) * (sc || 1);
  const txtC = (ctx, s, cx, y, col, sc) => txt(ctx, s, Math.round(cx - tw(s, sc) / 2), y, col, sc);
  const txtR = (ctx, s, rx, y, col, sc) => txt(ctx, s, rx - tw(s, sc), y, col, sc);
  function txtS(ctx, s, cx, y, col, sc) { txtC(ctx, s, cx + (sc || 1), y + (sc || 1), '#000', sc); txtC(ctx, s, cx, y, col, sc); }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ---------- jewels ----------
  const COLS = 6, ROWS = 13, CS = 16, WX = 112, WY = 8;
  const JEWEL = [null,
    { name: 'red', base: [232, 24, 40], shape: 'circle' },
    { name: 'orange', base: [255, 140, 0], shape: 'square' },
    { name: 'yellow', base: [250, 225, 30], shape: 'tri' },
    { name: 'green', base: [30, 200, 60], shape: 'diamond' },
    { name: 'blue', base: [40, 110, 255], shape: 'hex' },
    { name: 'purple', base: [190, 60, 240], shape: 'oct' }];
  function inShape(shape, dx, dy, k) {
    dx /= k; dy /= k;
    switch (shape) {
      case 'circle': return dx * dx + dy * dy <= 7.2 * 7.2;
      case 'square': return Math.abs(dx) <= 6.6 && Math.abs(dy) <= 6.6 && Math.abs(dx) + Math.abs(dy) <= 11.5;
      case 'tri': return dy >= -7 && dy <= 6.5 && Math.abs(dx) <= (dy + 7.5) * 0.56;
      case 'diamond': return Math.abs(dx) + Math.abs(dy) <= 7.8;
      case 'hex': return Math.abs(dy) <= 6.8 && Math.abs(dx) + Math.abs(dy) * 0.5 <= 7.6;
      default: return Math.abs(dx) <= 7 && Math.abs(dy) <= 7 && Math.abs(dx) + Math.abs(dy) <= 10;
    }
  }
  const rgb = (a, m, add) => 'rgb(' + a.map(v => Math.max(0, Math.min(255, Math.round(v * m + (add || 0))))).join(',') + ')';
  function jewelSprite(j, white) {
    const cv = mkCanvas(CS, CS), c = cv.getContext('2d'), sh = j.shape, b = white ? [235, 235, 255] : j.base;
    for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
      const dx = x - 7.5, dy = y - 7.5;
      if (!inShape(sh, dx, dy, 1)) continue;
      let col;
      const edge = !inShape(sh, dx, dy, 0.86);
      const inner = inShape(sh, dx + 0.8, dy + 0.8, 0.5);
      const lit = -dx - dy;
      if (edge) col = lit > 2 ? rgb(b, 1.0, 40) : rgb(b, 0.45);
      else if (inner) col = lit > 0 ? rgb(b, 1.0, 90) : rgb(b, 1.0, 30);
      else col = lit > 0 ? rgb(b, 0.95) : rgb(b, 0.7);
      c.fillStyle = col; c.fillRect(x, y, 1, 1);
    }
    c.fillStyle = '#fff'; c.fillRect(5, 4, 2, 1); c.fillRect(4, 5, 1, 2);
    return cv;
  }
  const JSPR = [null], JWHITE = [null];
  for (let i = 1; i <= 6; i++) { JSPR.push(jewelSprite(JEWEL[i])); JWHITE.push(jewelSprite(JEWEL[i], true)); }
  const N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, B5: 987.8, C6: 1046.5 };

  // ---------- board helpers (pure) ----------
  function findMatches(g) {
    const m = []; for (let r = 0; r < ROWS; r++) m.push(new Array(COLS).fill(false));
    let n = 0;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = g[r][c]; if (!v) continue;
      for (const [dc, dr] of dirs) {
        const pc = c - dc, pr = r - dr;
        if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS && g[pr][pc] === v) continue; // not run start
        let len = 1;
        while (true) { const nc = c + dc * len, nr = r + dr * len; if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || g[nr][nc] !== v) break; len++; }
        if (len >= 3) for (let k = 0; k < len; k++) { const rr = r + dr * k, cc = c + dc * k; if (!m[rr][cc]) { m[rr][cc] = true; n++; } }
      }
    }
    return { m, n };
  }
  function collapse(g) {
    for (let c = 0; c < COLS; c++) {
      let w = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) if (g[r][c]) { const v = g[r][c]; g[r][c] = 0; g[w][c] = v; w--; }
    }
  }
  const colTop = (g, c) => { for (let r = 0; r < ROWS; r++) if (g[r][c]) return r; return ROWS; };

  ArcadeRegistry.register({
    id: 'columns', title: 'Columns', year: 1990, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: move \u00b7 Down: drop \u00b7 Space/Up: cycle jewels \u00b7 X: cycle back \u00b7 Enter: start',
    marquee: { bg: '#10062a', fg: '#ffd040', accent: '#e8202c' },
    create(api) {
      const A = api.audio;
      let state = 'title', T = 0, hi = api.getHiScore(30000);
      let grid = [], piece = null, next = null, score = 0, level = 0, jewels = 0, chain = 0, flashT = 0, marked = null;
      let lockT = 0, dasT = 0, pieces = 0, sinceMagic = 0, demo = false, popups = [], parts = [], levelT = 0, overT = 0;
      let resolve = null, plan = null, aiT = 0, lastCred = api.credits, coinFlash = 0, maxChain = 0, rotLog = 0;
      const titleJewels = [];

      function newGrid() { grid = []; for (let r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0)); }
      const rc = () => 1 + Math.floor(Math.random() * 6);
      function makePiece() {
        sinceMagic++;
        if (pieces > 12 && sinceMagic > 30 && Math.random() < 0.08) { sinceMagic = 0; return { j: [7, 7, 7], magic: true }; }
        return { j: [rc(), rc(), rc()], magic: false };
      }
      const fpr = () => [42, 36, 30, 25, 21, 18, 15, 12, 10, 8, 7, 6, 5, 4, 3, 3, 2][Math.min(level, 16)];
      function pollCoins() { const c = api.credits; if (c > lastCred) A.tone(1800, 0.06, { vol: 0.08, slideTo: 2400 }); lastCred = c; }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; A.tone(98, 0.28, { vol: 0.14 }); return false;
      }

      function startGame(isDemo) {
        demo = isDemo; newGrid(); score = 0; level = 0; jewels = 0; pieces = 0; sinceMagic = 0; popups = []; parts = []; maxChain = 0;
        next = makePiece(); spawn(); state = 'play'; T = 0; levelT = isDemo ? 0 : 90;
        if (isDemo) { for (let r = 9; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (Math.random() < 0.7) grid[r][c] = rc(); collapse(grid); clearInitialMatches(); }
        else A.melody([[N.E5, .1], [N.G5, .1], [N.C6, .1], [N.G5, .1], [N.E5, .1], [N.C6, .3]], { type: 'square', vol: 0.1 });
      }
      function clearInitialMatches() { for (let k = 0; k < 20; k++) { const f = findMatches(grid); if (!f.n) break; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (f.m[r][c]) grid[r][c] = rc(); } }
      function spawn() {
        piece = next; piece.c = 2; piece.r = 0; piece.sub = 0; next = makePiece(); pieces++; lockT = 0; resolve = null; chain = 0;
        if (grid[0][2]) { gameOver(); return; }
        if (demo) { plan = aiPlan(piece); aiT = 0; rotLog = 0; }
      }
      function canFit(c, r) {
        if (c < 0 || c >= COLS) return false;
        for (let k = 0; k < 3; k++) { const rr = r - k; if (rr >= ROWS) return false; if (rr >= 0 && grid[rr][c]) return false; }
        return true;
      }
      function cycle(dir) {
        if (piece.magic) return;
        const j = piece.j;
        if (dir > 0) piece.j = [j[2], j[0], j[1]]; else piece.j = [j[1], j[2], j[0]];
        if (!demo) A.tone(900, 0.04, { type: 'square', vol: 0.08 });
      }
      function move(d) {
        if (canFit(piece.c + d, piece.r)) { piece.c += d; if (!demo) A.tone(300, 0.03, { type: 'triangle', vol: 0.12 }); if (canFit(piece.c, piece.r + 1)) lockT = 0; }
      }
      function lock() {
        const p = piece; piece = null;
        A.noise(0.06, { vol: 0.12, freq: 900 }); A.tone(120, 0.06, { type: 'triangle', vol: 0.16 });
        if (p.magic) {
          const below = p.r + 1 < ROWS ? grid[p.r + 1][p.c] : 0;
          const m = []; for (let r = 0; r < ROWS; r++) m.push(new Array(COLS).fill(false));
          let n = 0;
          if (below) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === below) { m[r][c] = true; n++; }
          for (let k = 0; k < 3; k++) sparkle(WX + p.c * CS + 8, WY + (p.r - k) * CS + 8, 6);
          A.melody([[N.C5, .05], [N.E5, .05], [N.G5, .05], [N.C6, .05], [N.E5, .05], [N.G5, .05], [N.C6, .12]], { type: 'square', vol: 0.1 });
          if (n) { marked = m; resolve = { phase: 'flash', t: 0, n, magic: true }; }
          else resolve = { phase: 'check', t: 0 };
          return;
        }
        let out = false;
        for (let k = 0; k < 3; k++) { const rr = p.r - k; if (rr >= 0) grid[rr][p.c] = p.j[2 - k]; else out = true; }
        if (out) {
          const f = findMatches(grid);
          if (!f.n) { gameOver(); return; }
        }
        resolve = { phase: 'check', t: 0 };
      }
      function sparkle(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 0.5 + Math.random() * 1.8; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, t: 30 + Math.random() * 20, c: ['#fff', '#ffe060', '#80e0ff'][i % 3] }); } }
      function stepResolve() {
        const R = resolve; R.t++;
        if (R.phase === 'check') {
          const f = findMatches(grid);
          if (f.n) { marked = f.m; chain++; maxChain = Math.max(maxChain, chain); R.phase = 'flash'; R.t = 0; R.n = f.n; R.magic = false;
            const base = [N.C5, N.D5, N.E5, N.F5, N.G5, N.A5, N.B5, N.C6][Math.min(chain - 1, 7)];
            A.tone(base, 0.12, { type: 'square', vol: 0.12 }); A.tone(base * 1.5, 0.18, { type: 'square', vol: 0.09, delay: 0.08 });
          } else {
            marked = null;
            if (state === 'play') spawn();
          }
        } else if (R.phase === 'flash') {
          if (R.t >= 34) {
            let sx = 0, sy = 0;
            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (marked[r][c]) { grid[r][c] = 0; sx += c; sy += r; sparkle(WX + c * CS + 8, WY + r * CS + 8, 3); }
            const n = R.n, ch = Math.max(1, chain);
            const pts = n * 30 * (level + 1) * ch + (n > 3 ? (n - 3) * 50 * (level + 1) : 0);
            addScore(pts); jewels += n;
            popups.push({ x: WX + (sx / n) * CS + 8, y: WY + (sy / n) * CS + 4, v: pts, t: 60, chain: ch });
            A.noise(0.18, { vol: 0.1, freq: 4000, slideTo: 800, type: 'bandpass' });
            marked = null; collapse(grid); R.phase = 'fall'; R.t = 0;
            const newLevel = Math.floor(jewels / 35);
            if (newLevel > level && !demo) { level = newLevel; levelT = 120; A.melody([[N.G4, .08], [N.C5, .08], [N.E5, .08], [N.G5, .08], [N.C6, .25]], { type: 'square', vol: 0.12 }); }
            else if (newLevel > level) level = newLevel;
          }
        } else if (R.phase === 'fall') {
          if (R.t >= 10) { R.phase = 'check'; R.t = 0; }
        }
      }
      function addScore(n) { if (demo) return; score += n; if (score > hi) hi = score; }
      function gameOver() {
        piece = null; resolve = null;
        if (demo) { state = 'title'; T = 0; return; }
        A.melody([[N.G4, .2], [N.E4, .2], [N.C4, .2], [196, .5]], { type: 'triangle', vol: 0.2 });
        const end = () => { state = 'over'; overT = 0; api.setHiScore(score); };
        if (api.offerContinue) api.offerContinue(() => {
          for (let r = 0; r < 8; r++) for (let c = 0; c < COLS; c++) grid[r][c] = 0;
          collapse(grid); state = 'play'; spawn();
        }, end); else end();
      }

      // ---------- AI for the demo ----------
      function simulate(g0, c, js) {
        const g = g0.map(r => r.slice()); const top = colTop(g, c);
        if (top < 3) return -1e6;
        for (let k = 0; k < 3; k++) g[top - 1 - k][c] = js[2 - k];
        let total = 0, ch = 0;
        while (true) { const f = findMatches(g); if (!f.n) break; ch++; total += f.n * ch; for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) if (f.m[r][cc]) g[r][cc] = 0; collapse(g); }
        let hmax = 0, adj = 0;
        for (let cc = 0; cc < COLS; cc++) hmax = Math.max(hmax, ROWS - colTop(g, cc));
        for (let k = 0; k < 3; k++) { const r = top - 1 - k, v = js[2 - k]; for (const [dc, dr] of [[-1, 0], [1, 0], [-1, 1], [1, 1], [-1, -1], [1, -1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && g0[rr][cc] === v) adj++; } }
        return total * 40 + adj * 3 - hmax * 6 + Math.random() * 2;
      }
      function aiPlan(p) {
        if (p.magic) { let best = 0, bc = 2; for (let c = 0; c < COLS; c++) { const t = colTop(grid, c); if (t < ROWS && t >= 3) { const v = grid[t][c]; let n = 0; for (const row of grid) for (const x of row) if (x === v) n++; if (n > best) { best = n; bc = c; } } } return { c: bc, rot: 0 }; }
        let best = -1e9, plan = { c: 2, rot: 0 };
        for (let rot = 0; rot < 3; rot++) {
          let j = p.j.slice(); for (let k = 0; k < rot; k++) j = [j[2], j[0], j[1]];
          for (let c = 0; c < COLS; c++) {
            const lo = Math.min(c, 2), hi2 = Math.max(c, 2); let blocked = false;
            for (let cc = lo; cc <= hi2; cc++) if (colTop(grid, cc) < 3) blocked = true;
            if (blocked) continue;
            const s = simulate(grid, c, j); if (s > best) { best = s; plan = { c, rot }; }
          }
        }
        return plan;
      }

      // ---------- play step ----------
      function stepPlay() {
        if (levelT > 0) levelT--;
        for (const p of popups) { p.t--; p.y -= 0.3; } popups = popups.filter(p => p.t > 0);
        if (resolve) { stepResolve(); return; }
        if (!piece) return;
        let left, right, down, rotA, rotB, lp, rp;
        if (demo) {
          aiT++;
          left = right = lp = rp = rotA = rotB = false; down = false;
          if (aiT > 10 && aiT % 7 === 0) {
            if (rotLog < plan.rot) { rotA = true; rotLog++; }
            else if (piece.c < plan.c) rp = true; else if (piece.c > plan.c) lp = true;
          }
          if (rotLog >= plan.rot && piece.c === plan.c && aiT > 20) down = true;
        } else {
          left = api.key('ArrowLeft'); right = api.key('ArrowRight'); down = api.key('ArrowDown');
          lp = api.pressed('ArrowLeft'); rp = api.pressed('ArrowRight');
          rotA = api.anyPressed('Space', 'ArrowUp'); rotB = api.anyPressed('KeyX', 'KeyZ');
        }
        if (rotA) cycle(1); if (rotB) cycle(-1);
        if (lp) { move(-1); dasT = 0; } else if (rp) { move(1); dasT = 0; }
        else if (left || right) { dasT++; if (dasT > 12 && dasT % 4 === 0) move(left ? -1 : 1); }
        const speed = down ? 0.5 : 1 / fpr();
        if (canFit(piece.c, piece.r + 1)) {
          piece.sub += speed; lockT = 0;
          while (piece.sub >= 1) {
            if (canFit(piece.c, piece.r + 1)) { piece.r++; piece.sub -= 1; if (down) addScore(1); }
            else { piece.sub = 0; break; }
          }
        } else {
          piece.sub = 0; lockT++;
          if (lockT >= (down ? 4 : 24)) lock();
        }
      }

      function update() {
        T++; pollCoins(); if (coinFlash > 0) coinFlash--;
        for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.t--; } parts = parts.filter(p => p.t > 0);
        if (state === 'title') {
          if (T % 9 === 0) titleJewels.push({ x: Math.random() * W, y: -16, v: 0.6 + Math.random() * 1.2, k: rc() });
          for (const j of titleJewels) j.y += j.v;
          while (titleJewels.length && titleJewels[0].y > H + 16) titleJewels.shift();
          if (api.anyPressed('Enter', 'Space')) { if (tryStart()) startGame(false); }
          else if (T > 600) startGame(true);
        } else if (state === 'play') {
          if (demo) {
            if (api.anyPressed('Enter', 'Space')) { state = 'title'; T = 0; if (tryStart()) startGame(false); return; }
            if (T > 1800) { state = 'title'; T = 0; return; }
          }
          stepPlay();
        } else if (state === 'over') {
          overT++;
          if (overT > 300 || (overT > 90 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; }
        }
      }

      // ---------- render ----------
      const BGS = [['#1a0838', '#3a1068'], ['#081838', '#103a78'], ['#082a18', '#106040'], ['#381008', '#783018'], ['#282808', '#606010'], ['#082830', '#106878'], ['#300828', '#701060']];
      function drawPillar(ctx, x, y, w, h, col) {
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, '#6a6a80'); g.addColorStop(0.35, col); g.addColorStop(1, '#40404c');
        ctx.fillStyle = g; ctx.fillRect(x, y + 8, w, h - 16);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 3; i < w - 2; i += 4) ctx.fillRect(x + i, y + 8, 1, h - 16);
        ctx.fillStyle = col; ctx.fillRect(x - 3, y, w + 6, 4); ctx.fillRect(x - 1, y + 4, w + 2, 4); ctx.fillRect(x - 3, y + h - 4, w + 6, 4); ctx.fillRect(x - 1, y + h - 8, w + 2, 4);
        ctx.fillStyle = '#40404c'; ctx.fillRect(x - 3, y + 3, w + 6, 1); ctx.fillRect(x - 3, y + h - 1, w + 6, 1);
      }
      function drawBG(ctx) {
        const b = BGS[demo ? 0 : level % BGS.length];
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, b[0]); g.addColorStop(1, b[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // distant temple pillars
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 6; i++) { const x = 6 + i * 54; ctx.fillRect(x, 30, 14, 180); ctx.fillRect(x - 3, 26, 20, 4); ctx.fillRect(x - 3, 208, 20, 4); }
        ctx.fillRect(0, 22, W, 4);
        // stars
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 30; i++) { const x = (i * 97) % W, y = (i * 53) % 200; if (((T >> 4) + i) % 5) ctx.fillRect(x, y, 1, 1); }
      }
      function drawWell(ctx) {
        ctx.fillStyle = '#05030c'; ctx.fillRect(WX, WY, COLS * CS, ROWS * CS);
        ctx.fillStyle = '#100c22';
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if ((c + r) & 1) ctx.fillRect(WX + c * CS, WY + r * CS, CS, CS);
        drawPillar(ctx, WX - 12, WY - 4, 12, ROWS * CS + 8, '#b8b8d0');
        drawPillar(ctx, WX + COLS * CS, WY - 4, 12, ROWS * CS + 8, '#b8b8d0');
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const v = grid[r][c]; if (!v) continue;
          let spr = JSPR[v];
          if (marked && marked[r][c] && ((resolve.t >> 2) & 1)) spr = JWHITE[v];
          ctx.drawImage(spr, WX + c * CS, WY + r * CS);
          if (state === 'over' && r >= ROWS - Math.floor(overT / 6)) { ctx.fillStyle = 'rgba(80,80,90,0.7)'; ctx.fillRect(WX + c * CS, WY + r * CS, CS, CS); }
        }
        if (piece) {
          const off = canFit(piece.c, piece.r + 1) ? piece.sub : 0;
          ctx.save(); ctx.beginPath(); ctx.rect(WX, WY, COLS * CS, ROWS * CS); ctx.clip();
          for (let k = 0; k < 3; k++) {
            const y = WY + (piece.r - k + off) * CS, x = WX + piece.c * CS, v = piece.j[2 - k];
            if (v === 7) drawMagic(ctx, x, y, k); else ctx.drawImage(JSPR[v], x, Math.round(y));
          }
          ctx.restore();
        }
      }
      function drawMagic(ctx, x, y, k) {
        const v = 1 + (((T >> 2) + k) % 6); ctx.drawImage(JSPR[v], x, Math.round(y));
        if ((T >> 1) & 1) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + 6, Math.round(y) + 2, 4, 12); ctx.fillRect(x + 2, Math.round(y) + 6, 12, 4); }
      }
      function panel(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#d0a040'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.strokeStyle = '#6a4a10'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
      }
      function drawHUD(ctx) {
        panel(ctx, 8, 30, 88, 34); txt(ctx, 'SCORE', 14, 36, '#ffd040'); txtR(ctx, String(score), 90, 50, '#fff');
        panel(ctx, 8, 70, 88, 34); txt(ctx, 'LEVEL', 14, 76, '#ffd040'); txtR(ctx, String(level), 90, 90, '#fff');
        panel(ctx, 8, 110, 88, 34); txt(ctx, 'JEWELS', 14, 116, '#ffd040'); txtR(ctx, String(jewels), 90, 130, '#fff');
        panel(ctx, 8, 150, 88, 34); txt(ctx, 'HI SCORE', 14, 156, '#ffd040'); txtR(ctx, String(hi), 90, 170, '#fff');
        panel(ctx, 236, 30, 56, 70); txt(ctx, 'NEXT', 252, 36, '#ffd040');
        if (next) for (let k = 0; k < 3; k++) { const v = next.j[k]; if (v === 7) drawMagic(ctx, 256, 48 + k * CS, k); else ctx.drawImage(JSPR[v], 256, 48 + k * CS); }
        panel(ctx, 236, 110, 76, 50); txt(ctx, 'SPEED', 244, 116, '#ffd040');
        for (let i = 0; i < 10; i++) { ctx.fillStyle = i <= Math.min(9, level) ? ['#40ff60', '#40ff60', '#a0ff40', '#e0ff40', '#ffe040', '#ffb040', '#ff8040', '#ff5040', '#ff3040', '#ff1040'][i] : '#202028'; ctx.fillRect(244 + i * 6, 130, 5, 22 - 0); }
        if (demo) { txtS(ctx, 'DEMONSTRATION', 160, 100, '#ffd040'); if ((T >> 5) & 1) txtS(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 160, 116, '#fff'); }
        txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 236, 212, '#c0c0d0');
        if (maxChain > 1 && !demo) txt(ctx, 'BEST CHAIN ' + maxChain, 236, 172, '#80e0ff');
      }
      function drawLogo(ctx, cx, y, sc) {
        const s = 'COLUMNS'; const w = tw(s, sc); let x = cx - w / 2;
        for (let i = 0; i < s.length; i++) {
          const col = rgb(JEWEL[1 + (i % 6)].base, 1);
          txt(ctx, s[i], x + sc, y + sc, '#000', sc); txt(ctx, s[i], x, y, col, sc);
          x += 6 * sc;
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') {
          drawBG(ctx);
          for (const j of titleJewels) { ctx.globalAlpha = 0.35; ctx.drawImage(JSPR[j.k], Math.round(j.x), Math.round(j.y)); }
          ctx.globalAlpha = 1;
          drawPillar(ctx, 30, 20, 20, 190, '#c8c8e0'); drawPillar(ctx, W - 50, 20, 20, 190, '#c8c8e0');
          drawLogo(ctx, W / 2, 30, 6);
          for (let i = 0; i < 6; i++) ctx.drawImage(JSPR[1 + i], W / 2 - 3 * 20 + i * 20 + 2, 86 + Math.round(Math.sin(T / 15 + i) * 3));
          txtC(ctx, 'HI SCORE  ' + hi, W / 2, 116, '#ffd040');
          txtC(ctx, 'LINE UP 3 OR MORE JEWELS', W / 2, 134, '#c0c0ff');
          txtC(ctx, 'ACROSS, DOWN OR DIAGONALLY', W / 2, 144, '#c0c0ff');
          if (api.credits > 0) { if ((T >> 5) & 1) txtC(ctx, 'PUSH START BUTTON', W / 2, 166, '#ffffff'); }
          else if (coinFlash > 0 ? ((T >> 2) & 1) : ((T >> 5) & 1)) txtC(ctx, 'INSERT COIN', W / 2, 166, coinFlash > 0 ? '#ff4040' : '#ffffff');
          txtC(ctx, '\u00a9 1990 SEGA', W / 2, 190, '#a0a0b0');
          txtC(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 206, '#a0a0b0');
          return;
        }
        drawBG(ctx); drawWell(ctx); drawHUD(ctx);
        for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.t > 20 ? 2 : 1, p.t > 20 ? 2 : 1); }
        for (const p of popups) { txtS(ctx, String(p.v), p.x, Math.round(p.y), '#fff'); if (p.chain > 1) txtS(ctx, p.chain + ' CHAIN', p.x, Math.round(p.y) - 10, '#ffd040'); }
        if (levelT > 0 && !demo && ((levelT >> 3) & 1)) txtS(ctx, level === 0 ? 'START!' : 'LEVEL UP!', WX + COLS * CS / 2, 90, '#ffd040', 2);
        if (state === 'over') { panel(ctx, WX + 4, 92, COLS * CS - 8, 30); txtC(ctx, 'GAME OVER', WX + COLS * CS / 2, 103, '#ff4040'); }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
