// Tetris (Atari Games, 1988) \u2014 arcade-style recreation: Russian-themed backdrops, difficulty select, demo play.
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
  function text(ctx, s, x, y, col, sc, align, shadow) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    if (shadow) text(ctx, s, x + sc, y + sc, shadow, sc);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }

  const W = 320, H = 240;
  const CW = 10, BW = 10, BH = 20;      // cell size, board size
  const BX = 110, BY = 20;              // board origin
  // ---------- pieces ----------
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
  };
  const NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  function rotCW(m) { const n = m.length, o = []; for (let y = 0; y < n; y++) { o.push([]); for (let x = 0; x < n; x++) o[y].push(m[n - 1 - x][y]); } return o; }
  const ROTS = NAMES.map(nm => { const r = [SHAPES[nm]]; for (let i = 0; i < 3; i++) r.push(rotCW(r[i])); return r.map(m => { const c = []; m.forEach((row, y) => row.forEach((v, x) => { if (v) c.push([x, y]); })); return c; }); });
  // per-level palettes: each piece gets its own colour, palettes cycle as levels rise (like the arcade)
  const PALS = [
    ['#e83030', '#2858f0', '#e8b820', '#30c040', '#c040d0', '#e87020', '#20b8d8'],
    ['#20b8d8', '#e8b820', '#c040d0', '#e83030', '#30c040', '#2858f0', '#e87020'],
    ['#ff6080', '#80e040', '#4090ff', '#ffd040', '#40e0c0', '#ff8040', '#b080ff'],
    ['#d0d0d0', '#e04040', '#4060e0', '#e0c040', '#40c060', '#a050e0', '#e08040'],
    ['#ff9020', '#20a0ff', '#ff4060', '#60e060', '#f0e040', '#c060ff', '#40e0e0'],
    ['#b0e040', '#ff5050', '#5080ff', '#ffb040', '#e060c0', '#40d0a0', '#e0e0e0']
  ];
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  const shadeCache = {};
  function cols(hex) { return shadeCache[hex] || (shadeCache[hex] = [hex, shade(hex, 0.55), shade(hex, -0.45), shade(hex, 0.25)]); }
  function block(ctx, x, y, hex, sz) {
    sz = sz || CW;
    const c = cols(hex);
    ctx.fillStyle = c[2]; ctx.fillRect(x, y, sz, sz);
    ctx.fillStyle = c[0]; ctx.fillRect(x, y, sz - 1, sz - 1);
    ctx.fillStyle = c[1]; ctx.fillRect(x, y, sz - 1, 1); ctx.fillRect(x, y, 1, sz - 1);
    ctx.fillStyle = c[3]; ctx.fillRect(x + 2, y + 2, sz - 5, sz - 5);
    ctx.fillStyle = c[0]; ctx.fillRect(x + 3, y + 3, sz - 6, sz - 6);
    ctx.fillStyle = c[1]; ctx.fillRect(x + 2, y + 2, 1, 1);
  }

  // gravity: frames per row for each level (0-based)
  const GRAV = [53, 49, 45, 41, 37, 33, 28, 22, 17, 12, 10, 9, 8, 7, 6, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 1];
  const DIFFS = [
    { name: 'BEGINNER', lvl: 0, bonus: 0, garbage: 0 },
    { name: 'INTERMEDIATE', lvl: 4, bonus: 2000, garbage: 0 },
    { name: 'PRO', lvl: 8, bonus: 6000, garbage: 4 },
    { name: 'EXPERT', lvl: 12, bonus: 12000, garbage: 7 }
  ];
  const LINEPTS = [0, 100, 300, 700, 1500];

  // ---------- Korobeiniki (traditional) ----------
  const N = { A3: 220, E3: 164.8, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, G4: 392, GS4: 415.3 };
  const KORO = [
    ['E5', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['C5', 1], ['B4', 1], ['A4', 2], ['A4', 1], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
    ['B4', 3], ['C5', 1], ['D5', 2], ['E5', 2], ['C5', 2], ['A4', 2], ['A4', 2], [0, 2],
    [0, 1], ['D5', 2], ['F5', 1], ['A5', 2], ['G5', 1], ['F5', 1], ['E5', 3], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
    ['B4', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['E5', 2], ['C5', 2], ['A4', 2], ['A4', 2], [0, 2]
  ];
  const KORO_B = [ // slow middle section
    ['E5', 4], ['C5', 4], ['D5', 4], ['B4', 4], ['C5', 4], ['A4', 4], ['GS4', 4], ['B4', 4],
    ['E5', 4], ['C5', 4], ['D5', 4], ['B4', 4], ['C5', 2], ['E5', 2], ['A5', 4], ['GS4', 8]
  ];

  ArcadeRegistry.register({
    id: 'atetris', title: 'Tetris', year: 1988, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: move \u00b7 Down: drop \u00b7 Space/Up: rotate \u00b7 X: rotate back \u00b7 Enter: start',
    marquee: { bg: '#10002a', fg: '#ff3030', accent: '#ffd040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title';   // title | select | game | demo
      let frame = 0, titleT = 0, coinFlash = 0, selT = 0, selIdx = 0;
      let g = null;
      let musicT = 0, musicPart = 0;

      const sfx = {
        move() { au.tone(330, 0.02, { type: 'square', vol: 0.05 }); },
        rot() { au.tone(560, 0.04, { type: 'square', vol: 0.07, slideTo: 760 }); },
        land() { au.noise(0.05, { vol: 0.12, freq: 900 }); au.tone(110, 0.05, { type: 'triangle', vol: 0.12 }); },
        line(n) {
          if (n >= 4) { au.melody([[523, .06], [659, .06], [784, .06], [1047, .06], [1319, .2]], { type: 'square', vol: 0.12 }); au.noise(0.4, { vol: 0.12, freq: 4000, slideTo: 300 }); }
          else au.tone(400 + n * 120, 0.18, { type: 'square', vol: 0.12, slideTo: 1200 + n * 200 });
        },
        level() { au.melody([[784, .08], [988, .08], [1175, .08], [1568, .25]], { type: 'square', vol: 0.12 }); },
        over() { au.melody([[440, .2], [415, .2], [392, .2], [370, .2], [330, .6]], { type: 'sawtooth', vol: 0.1 }); },
        coin() { au.tone(1320, 0.06, { type: 'square', vol: 0.08, slideTo: 1980 }); },
        nocoin() { au.tone(98, 0.28, { type: 'square', vol: 0.16 }); },
        menu() { au.tone(880, 0.03, { type: 'square', vol: 0.08 }); }
      };
      function music() {
        if (mode !== 'game' || !g || g.phase === 'over' || g.phase === 'topout' || api.continuing) return;
        if (--musicT > 0) return;
        const tempo = Math.max(0.085, 0.15 - g.level * 0.004);  // seconds per eighth
        const seq = musicPart === 2 ? KORO_B : KORO;
        const notes = seq.map(([n, d]) => [n ? N[n] : 0, d * tempo]);
        const dur = au.melody(notes, { type: 'square', vol: 0.045 }) || notes.reduce((a, b) => a + b[1], 0);
        // simple bass: root on every beat
        const bass = []; const roots = musicPart === 2 ? ['A3', 'E3'] : ['A3', 'E3', 'A3', 'E3'];
        let t = 0, i = 0; while (t < dur - 0.01) { bass.push([N[roots[(i >> 2) % roots.length]] / 2, tempo * 2]); t += tempo * 2; i++; }
        au.melody(bass, { type: 'triangle', vol: 0.07 });
        musicT = Math.round(dur * 60);
        musicPart = (musicPart + 1) % 3;
      }

      // ---------- board ----------
      function newBoard() { const b = []; for (let y = 0; y < BH; y++) b.push(new Array(BW).fill(0)); return b; }
      function fits(board, t, r, px, py) {
        for (const [x, y] of ROTS[t][r]) {
          const X = px + x, Y = py + y;
          if (X < 0 || X >= BW || Y >= BH) return false;
          if (Y >= 0 && board[Y][X]) return false;
        }
        return true;
      }
      // 7-piece bag-ish randomiser with a reroll on repeats (arcade feel: rarely the same twice)
      function rndPiece(last) { let t = Math.floor(Math.random() * 7); if (t === last) t = Math.floor(Math.random() * 7); return t; }

      function newGame(diff, demo) {
        const d = DIFFS[diff];
        g = {
          board: newBoard(), score: 0, lines: 0, level: d.lvl, startLevel: d.lvl, diff, demo: !!demo,
          next: rndPiece(-1), cur: null, stats: [0, 0, 0, 0, 0, 0, 0], phase: 'play', t: 0,
          fall: 0, lock: 0, das: 0, dasDir: 0, clearing: null, flash: 0, msg: null, msgT: 0,
          pieces: 0, ai: null, bonusPending: d.bonus, levelLines: 0
        };
        for (let i = 0; i < d.garbage; i++) addGarbageRow(g.board, BH - 1 - i);
        spawn();
        musicT = 30; musicPart = 0;
      }
      function addGarbageRow(board, y) {
        const hole = Math.floor(Math.random() * BW);
        for (let x = 0; x < BW; x++) board[y][x] = x === hole || Math.random() < 0.18 ? 0 : 1 + Math.floor(Math.random() * 7);
      }
      function spawn() {
        const t = g.next; g.next = rndPiece(t);
        g.cur = { t, r: 0, x: t === 1 ? 4 : 3, y: t === 0 ? -1 : 0 };
        g.stats[t]++; g.pieces++;
        g.fall = 0; g.lock = 0; g.ai = null;
        if (!fits(g.board, t, 0, g.cur.x, g.cur.y)) {
          // top out
          g.phase = 'topout'; g.t = 0; sfx.over();
        }
      }
      function gravityFrames() {
        const l = Math.min(g.level, GRAV.length - 1);
        return GRAV[l];
      }
      function tryMove(dx, dy) {
        const c = g.cur;
        if (fits(g.board, c.t, c.r, c.x + dx, c.y + dy)) { c.x += dx; c.y += dy; return true; }
        return false;
      }
      function tryRot(dir) {
        const c = g.cur, nr = (c.r + dir + 4) % 4;
        if (c.t === 1) return false;
        const kicks = c.t === 0 ? [0, -1, 1, -2, 2] : [0, -1, 1];
        for (const k of kicks) if (fits(g.board, c.t, nr, c.x + k, c.y)) { c.x += k; c.r = nr; return true; }
        if (fits(g.board, c.t, nr, c.x, c.y - 1)) { c.y--; c.r = nr; return true; }
        return false;
      }
      function lockPiece() {
        const c = g.cur;
        let above = false;
        for (const [x, y] of ROTS[c.t][c.r]) {
          const Y = c.y + y;
          if (Y < 0) { above = true; continue; }
          g.board[Y][c.x + x] = c.t + 1;
        }
        g.cur = null; sfx.land();
        if (above) { g.phase = 'topout'; g.t = 0; sfx.over(); return; }
        const full = [];
        for (let y = 0; y < BH; y++) if (g.board[y].every(v => v)) full.push(y);
        if (full.length) {
          g.clearing = full; g.phase = 'clear'; g.t = 0; sfx.line(full.length);
          if (full.length === 4) g.flash = 12;
        } else { g.phase = 'are'; g.t = 0; }
      }
      function finishClear() {
        const n = g.clearing.length;
        for (const y of g.clearing) { g.board.splice(y, 1); g.board.unshift(new Array(BW).fill(0)); }
        g.clearing = null;
        addScore(LINEPTS[n] * (g.level + 1));
        if (n === 4) { g.msg = 'TETRIS!'; g.msgT = 90; }
        if (g.board.every(r => r.every(v => !v))) { addScore(5000 * (g.level + 1)); g.msg = 'CLEAR BOARD BONUS'; g.msgT = 120; }
        g.lines += n; g.levelLines += n;
        if (g.levelLines >= 10) {
          g.levelLines -= 10; g.level++;
          sfx.level();
          if (g.bonusPending && g.level >= g.startLevel + 1) { addScore(g.bonusPending); g.msg = 'START BONUS ' + g.bonusPending; g.msgT = 120; g.bonusPending = 0; }
          else if (!g.msgT) { g.msg = 'LEVEL ' + (g.level + 1); g.msgT = 90; }
          // from level 15 on, the floor starts pushing up a garbage row every level
          if (g.level >= 15) { g.board.shift(); g.board.push(new Array(BW).fill(0)); addGarbageRow(g.board, BH - 1); }
        }
        g.phase = 'are'; g.t = 0;
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n; if (g.score > hi) hi = g.score;
      }

      // ---------- demo AI ----------
      function evalBoard(b) {
        let agg = 0, holes = 0, bump = 0, prev = -1, lines = 0;
        for (let y = 0; y < BH; y++) if (b[y].every(v => v)) lines++;
        for (let x = 0; x < BW; x++) {
          let h = 0, seen = false;
          for (let y = 0; y < BH; y++) {
            if (b[y][x]) { if (!seen) { h = BH - y; seen = true; } }
            else if (seen) holes++;
          }
          agg += h; if (prev >= 0) bump += Math.abs(h - prev); prev = h;
        }
        return -0.51 * agg + 0.76 * lines - 0.36 * holes * 2 - 0.18 * bump;
      }
      function planAI() {
        const c = g.cur; let best = null;
        for (let r = 0; r < (c.t === 1 ? 1 : 4); r++) for (let x = -2; x < BW; x++) {
          if (!fits(g.board, c.t, r, x, c.y)) continue;
          let y = c.y; while (fits(g.board, c.t, r, x, y + 1)) y++;
          const b = g.board.map(row => row.slice());
          let ok = true;
          for (const [px, py] of ROTS[c.t][r]) { if (y + py < 0) { ok = false; break; } b[y + py][x + px] = 1; }
          if (!ok) continue;
          const s = evalBoard(b) + Math.random() * 0.2;
          if (!best || s > best.s) best = { r, x, s };
        }
        g.ai = best || { r: c.r, x: c.x };
      }

      // ---------- update ----------
      function playInput() {
        const c = g.cur; if (!c) return { drop: false };
        let left, right, drop, rot = 0;
        if (g.demo) {
          if (!g.ai) planAI();
          left = right = drop = false;
          if ((frame & 3) === 0) {
            if (c.r !== g.ai.r) rot = 1;
            else if (c.x > g.ai.x) left = true;
            else if (c.x < g.ai.x) right = true;
          }
          drop = c.r === g.ai.r && c.x === g.ai.x;
          if (rot && !tryRot(1)) g.ai.r = c.r;
          if (left) tryMove(-1, 0); if (right) tryMove(1, 0);
          return { drop };
        }
        if (api.anyPressed('Space', 'ArrowUp')) { if (tryRot(1)) sfx.rot(); }
        if (api.anyPressed('KeyX', 'KeyZ')) { if (tryRot(-1)) sfx.rot(); }
        const dir = api.key('ArrowLeft') ? -1 : api.key('ArrowRight') ? 1 : 0;
        if (dir !== g.dasDir) { g.dasDir = dir; g.das = 0; if (dir && tryMove(dir, 0)) sfx.move(); }
        else if (dir) { g.das++; if (g.das >= 14 && (g.das - 14) % 3 === 0 && tryMove(dir, 0)) sfx.move(); }
        return { drop: api.key('ArrowDown') };
      }
      function updateGame() {
        if (g.msgT > 0) g.msgT--;
        if (g.flash > 0) g.flash--;
        if (g.phase === 'play') {
          const inp = playInput();
          const c = g.cur; if (!c) return;
          const gf = gravityFrames();
          let rows = 0;
          if (inp.drop) { g.fall += Math.max(gf, 30) ; if (g.fall >= 30) { rows = 1; g.fall = 0; } if (g.demo) rows = 1; }
          else if (++g.fall >= gf) { g.fall = 0; rows = gf <= 1 ? 2 : 1; }
          for (let i = 0; i < rows; i++) {
            if (tryMove(0, 1)) { if (inp.drop) addScore(1); g.lock = 0; }
            else break;
          }
          if (!fits(g.board, c.t, c.r, c.x, c.y + 1)) {
            g.lock++;
            if (g.lock > (inp.drop ? 4 : Math.max(12, 30 - g.level))) lockPiece();
          }
        } else if (g.phase === 'clear') {
          if (++g.t >= 24) finishClear();
        } else if (g.phase === 'are') {
          if (++g.t >= 8) { g.phase = 'play'; spawn(); }
        } else if (g.phase === 'topout') {
          g.t++;
          if (g.t <= BH * 4 && g.t % 4 === 0) {
            const y = BH - g.t / 4;
            for (let x = 0; x < BW; x++) if (g.board[y][x]) g.board[y][x] = 8;
          }
          if (g.t === BH * 4 + 30) {
            if (g.demo) { mode = 'title'; titleT = 0; return; }
            const over = () => { api.setHiScore(g.score); g.phase = 'over'; g.t = 0; };
            if (api.offerContinue) {
              api.offerContinue(() => {
                // continue: fresh board, keep score and level
                g.board = newBoard(); g.phase = 'are'; g.t = 0; g.msg = 'CONTINUE'; g.msgT = 90; musicT = 20;
              }, over);
            } else over();
          }
        } else if (g.phase === 'over') {
          g.t++;
          if (g.t > 420 || (g.t > 90 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; }
        }
      }

      let lastCred = api.credits;
      function update() {
        frame++;
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'select'; selT = 600; selIdx = 0; sfx.menu(); }
            else { coinFlash = 90; sfx.nocoin(); }
          } else if (titleT > 480) { newGame(1, true); mode = 'demo'; }
          return;
        }
        if (mode === 'select') {
          if (api.anyPressed('ArrowUp', 'ArrowLeft')) { selIdx = (selIdx + 3) % 4; sfx.menu(); }
          if (api.anyPressed('ArrowDown', 'ArrowRight')) { selIdx = (selIdx + 1) % 4; sfx.menu(); }
          if (--selT <= 0 || api.anyPressed('Enter', 'Space')) { newGame(selIdx, false); mode = 'game'; sfx.level(); }
          return;
        }
        if (mode === 'demo') {
          if (api.anyPressed('Enter', 'Space')) { mode = 'title'; titleT = 0; return; }
          if (g.pieces > 140 && g.phase === 'play') { mode = 'title'; titleT = 0; return; }
          updateGame();
          return;
        }
        updateGame();
        music();
      }

      // ---------- backgrounds ----------
      const SCENES = [
        { sky: ['#0a0830', '#201060', '#502080'], dome: '#d03030', wall: '#e0d0a0', ground: '#203020' },
        { sky: ['#000818', '#002850', '#0a6080'], dome: '#30b0d0', wall: '#d0d0e0', ground: '#102030' },
        { sky: ['#200010', '#600020', '#c04020'], dome: '#e0b020', wall: '#f0e0c0', ground: '#301010' },
        { sky: ['#001008', '#003020', '#108040'], dome: '#40e080', wall: '#e0e0c0', ground: '#002010' },
        { sky: ['#100020', '#300850', '#7030a0'], dome: '#e060e0', wall: '#f0d0f0', ground: '#200020' },
        { sky: ['#080808', '#202030', '#505070'], dome: '#f0f0f0', wall: '#c0c0d0', ground: '#101018' }
      ];
      const bgCache = {};
      function bgFor(level) {
        const k = level % SCENES.length;
        if (bgCache[k]) return bgCache[k];
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d'); const s = SCENES[k];
        for (let y = 0; y < H; y++) { x.fillStyle = s.sky[Math.min(2, Math.floor(y / (H / 3)))]; x.fillRect(0, y, W, 1); }
        // dithered band edges
        for (let b = 1; b < 3; b++) { const y0 = Math.floor(b * H / 3); x.fillStyle = s.sky[b]; for (let i = 0; i < W; i += 2) x.fillRect(i + ((y0 >> 1) & 1), y0 - 2, 1, 1); }
        let seed = 17 + k * 101; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        for (let i = 0; i < 70; i++) { x.fillStyle = rnd() < 0.3 ? '#ffffa0' : '#ffffff'; x.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 120), 1, 1); }
        // ground
        x.fillStyle = s.ground; x.fillRect(0, 200, W, 40);
        // cathedral skyline left & right of the well (onion domes on drums)
        const domes = (cx, base, scale, col) => {
          x.fillStyle = s.wall; x.fillRect(cx - 6 * scale, base - 22 * scale, 12 * scale, 22 * scale);
          x.fillStyle = shade(s.wall, -0.35);
          for (let i = 0; i < 3; i++) x.fillRect(cx - 4 * scale + i * 3 * scale, base - 16 * scale, Math.max(1, scale), 6 * scale);
          x.fillStyle = col; x.beginPath();
          x.moveTo(cx, base - 42 * scale);
          x.quadraticCurveTo(cx + 2 * scale, base - 34 * scale, cx + 9 * scale, base - 28 * scale);
          x.quadraticCurveTo(cx + 9 * scale, base - 21 * scale, cx, base - 21 * scale);
          x.quadraticCurveTo(cx - 9 * scale, base - 21 * scale, cx - 9 * scale, base - 28 * scale);
          x.quadraticCurveTo(cx - 2 * scale, base - 34 * scale, cx, base - 42 * scale);
          x.fill();
          // stripes on the dome
          x.fillStyle = shade(col, 0.5);
          for (let i = -1; i <= 1; i++) x.fillRect(cx + i * 4 * scale, base - 30 * scale, Math.max(1, scale), 7 * scale);
          x.fillStyle = '#ffe080'; x.fillRect(cx, base - 48 * scale, 1, 6 * scale); x.fillRect(cx - 2, base - 46 * scale, 5, 1);
        };
        const sideScene = (x0, x1) => {
          x.fillStyle = shade(s.wall, -0.2); x.fillRect(x0, 180, x1 - x0, 22);
          x.fillStyle = shade(s.wall, -0.5); for (let i = x0; i < x1; i += 6) x.fillRect(i, 176, 3, 4);
          const mid = (x0 + x1) / 2;
          domes(mid, 182, 2, s.dome);
          domes(mid - 30, 186, 1, shade(s.dome, 0.2));
          domes(mid + 30, 186, 1, shade(s.dome, -0.2));
          domes(mid - 18, 184, 1.5, '#30a050');
          domes(mid + 18, 184, 1.5, '#3060d0');
        };
        sideScene(4, 104); sideScene(216, 316);
        bgCache[k] = c; return c;
      }

      // ---------- drawing ----------
      function drawPiece(ctx, t, r, px, py, ox, oy, pal, sz) {
        sz = sz || CW;
        for (const [x, y] of ROTS[t][r]) { const Y = py + y; if (Y < 0) continue; block(ctx, ox + (px + x) * sz, oy + Y * sz, pal[t], sz); }
      }
      function panel(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#c0a040'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
        ctx.fillStyle = '#604010'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
      }
      function drawWell(ctx, pal) {
        // brick frame
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(BX - 6, BY - 6, BW * CW + 12, BH * CW + 12);
        ctx.fillStyle = '#8a6040';
        for (let y = BY - 6; y < BY + BH * CW + 6; y += 4) {
          const off = ((y - BY) >> 2) & 1 ? 0 : 4;
          for (let x = BX - 6 + off; x < BX + BW * CW + 6; x += 8) ctx.fillRect(x, y, 7, 3);
        }
        ctx.fillStyle = '#000'; ctx.fillRect(BX, BY, BW * CW, BH * CW);
        // faint grid
        ctx.fillStyle = '#0c0c18';
        for (let x = 1; x < BW; x++) ctx.fillRect(BX + x * CW, BY, 1, BH * CW);
        for (let y = 1; y < BH; y++) ctx.fillRect(BX, BY + y * CW, BW * CW, 1);
        for (let y = 0; y < BH; y++) {
          const clearing = g.clearing && g.clearing.includes(y);
          for (let x = 0; x < BW; x++) {
            const v = g.board[y][x]; if (!v) continue;
            if (clearing) {
              const t = g.t;
              if (Math.abs(x - 4.5) < t / 2.4) continue;   // wipe from the centre outward
              ctx.fillStyle = (t >> 2) & 1 ? '#ffffff' : '#ffff80'; ctx.fillRect(BX + x * CW, BY + y * CW, CW, CW);
            } else block(ctx, BX + x * CW, BY + y * CW, v === 8 ? '#808080' : pal[v - 1]);
          }
        }
        if (g.cur && g.phase === 'play') {
          const c = g.cur;
          // landing shadow (dim outline)
          let gy = c.y; while (fits(g.board, c.t, c.r, c.x, gy + 1)) gy++;
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          for (const [x, y] of ROTS[c.t][c.r]) if (gy + y >= 0) ctx.fillRect(BX + (c.x + x) * CW + 1, BY + (gy + y) * CW + 1, CW - 2, CW - 2);
          drawPiece(ctx, c.t, c.r, c.x, c.y, BX, BY, pal);
        }
        if (g.flash > 0 && (g.flash & 2)) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(BX, BY, BW * CW, BH * CW); }
      }
      function drawHUD(ctx, pal) {
        // left: score / stats
        panel(ctx, 6, 8, 96, 60);
        text(ctx, g.demo ? 'DEMO' : 'SCORE', 54, 13, '#ffd040', 1, 'center', '#402000');
        text(ctx, String(g.score), 54, 25, '#ffffff', 2, 'center', '#202040');
        text(ctx, 'HIGH SCORE', 54, 44, '#ff6060', 1, 'center', '#300000');
        text(ctx, String(hi), 54, 55, '#ffffff', 1, 'center');
        panel(ctx, 6, 74, 96, 118);
        text(ctx, 'STATISTICS', 54, 78, '#80e0ff', 1, 'center', '#002030');
        for (let i = 0; i < 7; i++) {
          drawPiece(ctx, i, 0, 0, 0, 14, 90 + i * 14 - (i === 0 ? 4 : 0), pal, 5);
          text(ctx, String(g.stats[i]).padStart(3, '0'), 90, 91 + i * 14, '#ffffff', 1, 'right');
        }
        // right: next, lines, level
        panel(ctx, 218, 8, 96, 56);
        text(ctx, 'NEXT', 266, 13, '#ffd040', 1, 'center', '#402000');
        const nt = g.next, cells = ROTS[nt][0];
        let minx = 9, maxx = 0, miny = 9, maxy = 0;
        for (const [x, y] of cells) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
        const pw = (maxx - minx + 1) * CW, ph = (maxy - miny + 1) * CW;
        const ox = Math.round(266 - pw / 2) - minx * CW, oy = Math.round(42 - ph / 2) - miny * CW;
        for (const [x, y] of cells) block(ctx, ox + x * CW, oy + y * CW, pal[nt]);
        panel(ctx, 218, 70, 96, 64);
        text(ctx, 'LINES', 266, 75, '#80ff80', 1, 'center', '#002000');
        text(ctx, String(g.lines), 266, 86, '#ffffff', 2, 'center');
        text(ctx, 'LEVEL', 266, 106, '#80ff80', 1, 'center', '#002000');
        text(ctx, String(g.level + 1), 266, 117, '#ffffff', 2, 'center');
        panel(ctx, 218, 140, 96, 30);
        text(ctx, DIFFS[g.diff].name, 266, 145, '#ffa040', 1, 'center');
        text(ctx, 'TO GO ' + (10 - g.levelLines), 266, 157, '#c0c0c0', 1, 'center');
        if (g.bonusPending) { panel(ctx, 218, 176, 96, 22); text(ctx, 'BONUS ' + g.bonusPending, 266, 184, '#ffff60', 1, 'center'); }
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 266, 228, '#a0a0a0', 1, 'center');
      }
      function drawLogo(ctx, cx, y, sz) {
        // TETRIS spelt out in falling-block letters
        const letters = 'TETRIS';
        const lc = ['#e83030', '#e87020', '#e8b820', '#30c040', '#20b8d8', '#c040d0'];
        const w = letters.length * 6 * sz - sz;
        const x0 = cx - w / 2;
        for (let i = 0; i < letters.length; i++) {
          const gl = FONT[letters[i]];
          for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r] & (16 >> c)) {
            const drop = Math.max(0, 200 - titleT * 3 - i * 20 + r * 4);
            block(ctx, x0 + (i * 6 + c) * sz, y + r * sz - drop, lc[i], sz);
          }
        }
      }
      function drawTitle(ctx) {
        ctx.drawImage(bgFor(Math.floor(titleT / 240)), 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
        drawLogo(ctx, W / 2, 34, 8);
        text(ctx, '\u00a9 1988 ATARI GAMES', W / 2, 108, '#ffffff', 1, 'center', '#000');
        text(ctx, 'ORIGINAL CONCEPT BY ALEXEY PAJITNOV', W / 2, 120, '#c0c0ff', 1, 'center', '#000');
        panel(ctx, 70, 136, 180, 58);
        text(ctx, 'HIGH SCORE', W / 2, 142, '#ff6060', 1, 'center');
        text(ctx, String(hi), W / 2, 154, '#ffffff', 2, 'center');
        text(ctx, '1 LINE 100  2 LINES 300', W / 2, 172, '#ffd040', 1, 'center');
        text(ctx, '3 LINES 700  TETRIS 1500', W / 2, 182, '#ffd040', 1, 'center');
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 204, '#ff4040', 2, 'center', '#000'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 204, '#ff4040', 2, 'center', '#000'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 204, '#ffff60', 2, 'center', '#000');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 228, '#a0a0a0', 1, 'center');
      }
      function drawSelect(ctx) {
        ctx.drawImage(bgFor(selIdx), 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'CHOOSE YOUR STARTING LEVEL', W / 2, 24, '#ffd040', 1, 'center', '#000');
        for (let i = 0; i < 4; i++) {
          const d = DIFFS[i], y = 50 + i * 36, sel = i === selIdx;
          panel(ctx, 50, y, 220, 30);
          if (sel) { ctx.fillStyle = (frame >> 3) & 1 ? '#603000' : '#401800'; ctx.fillRect(51, y + 1, 218, 28); }
          text(ctx, d.name, 60, y + 6, sel ? '#ffff60' : '#c0c0c0', 1);
          text(ctx, 'LEVEL ' + (d.lvl + 1), 60, y + 17, '#80c0ff', 1);
          text(ctx, d.bonus ? 'BONUS ' + d.bonus : 'NO BONUS', 260, y + 6, '#80ff80', 1, 'right');
          if (d.garbage) text(ctx, d.garbage + ' JUNK ROWS', 260, y + 17, '#ff8080', 1, 'right');
          if (sel) text(ctx, '>', 42, y + 11, '#ffff60', 1);
        }
        text(ctx, 'TIME ' + Math.ceil(selT / 60), W / 2, 200, '#ffffff', 1, 'center');
        text(ctx, 'UP/DOWN TO CHOOSE, START TO PLAY', W / 2, 214, '#a0a0a0', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        if (mode === 'select') { drawSelect(ctx); return; }
        ctx.drawImage(bgFor(g.level), 0, 0);
        const pal = PALS[Math.floor(g.level / 2) % PALS.length];
        drawWell(ctx, pal);
        drawHUD(ctx, pal);
        if (g.msgT > 0 && g.msg) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(BX, 96, BW * CW, 22);
          text(ctx, g.msg, BX + BW * CW / 2, 103, (frame >> 2) & 1 ? '#ffff60' : '#ff8040', 1, 'center');
        }
        if (mode === 'demo' && (frame >> 5) & 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(BX, 60, BW * CW, 30);
          text(ctx, 'DEMO', BX + 50, 64, '#ffffff', 1, 'center');
          text(ctx, api.credits ? 'PUSH START' : 'INSERT COIN', BX + 50, 78, '#ffff60', 1, 'center');
        }
        if (g.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(BX - 4, 80, BW * CW + 8, 60);
          text(ctx, 'GAME', BX + 50, 88, '#ff4040', 2, 'center', '#400000');
          text(ctx, 'OVER', BX + 50, 106, '#ff4040', 2, 'center', '#400000');
          text(ctx, 'SCORE ' + g.score, BX + 50, 126, '#ffffff', 1, 'center');
        }
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
