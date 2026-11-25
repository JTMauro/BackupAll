// Crystal Castles (Atari, 1983) - from-scratch recreation: Bentley Bear, isometric castles, gems, Gem Eaters, Nasty Trees, Berthilda.
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

  // ---------- Crystal Castles ----------
  const W = 256, H = 240;
  const N = 14;                 // castle maps are N x N cells
  const OX = 128, OY = 58;      // screen position of cell (0,0)'s top corner
  const D = 6, WH = 12;         // floor slab thickness, wall block height
  // ' ' void, '.' floor with gem, '#' wall block, 'S' start pad
  const MAPS = [
    ['  ..........  ',
      ' ............ ',
      '..##......##..',
      '..##......##..',
      '....######....',
      '....#....#....',
      '....#....#....',
      '....#....#....',
      '....#....#....',
      '....##..##....',
      '..##......##..',
      '..##......##..',
      ' ............ ',
      '  ....S.....  '],
    ['     ....     ',
      '     ....     ',
      '     .##.     ',
      '     .##.     ',
      '..............',
      '..##......##..',
      '..............',
      '..............',
      '..##......##..',
      '..............',
      '     .##.     ',
      '     .##.     ',
      '     ....     ',
      '     ..S.     '],
    ['..............',
      '.############.',
      '.#..........#.',
      '.#.   ..   .#.',
      '.#. ###### .#.',
      '... #....# ...',
      '.#. #....# .#.',
      '.#. #....# .#.',
      '... #....# ...',
      '.#. ##..## .#.',
      '.#.   ..   .#.',
      '.#..........#.',
      '.#####..#####.',
      '......S.......'],
    ['....          ',
      '......        ',
      '..##....      ',
      '..##......    ',
      '   .....##... ',
      '     ...##....',
      '   ...........',
      '  .....  .....',
      ' ...##.   ....',
      '....##.    ...',
      '........  ....',
      ' ..........#..',
      '   .......##. ',
      '     ..S...   '],
    ['....  ..  ....',
      '.##.  ..  .##.',
      '.##........##.',
      '....  ..  ....',
      '  .   ..   .  ',
      '  ....##....  ',
      '......##......',
      '......##......',
      '  ....##....  ',
      '  .   ..   .  ',
      '....  ..  ....',
      '.##........##.',
      '.##.  ..  .##.',
      '....  .S  ....'],
    ['..............',
      '.#.##.##.##.#.',
      '..............',
      '.##.#.##.#.##.',
      '..............',
      '.#.##....##.#.',
      '...#..##..#...',
      '...#..##..#...',
      '.#.##....##.#.',
      '..............',
      '.##.#.##.#.##.',
      '..............',
      '.#.##.##.#.##.',
      '......S.......']
  ];
  const PALS = [
    { top: '#3c64d8', l: '#1e3480', r: '#2a48a8', wt: '#d8b070', wl: '#7a5a2a', wr: '#a07838', gem: ['#ff4040', '#ff9090'] },
    { top: '#2aa860', l: '#145a30', r: '#1c7a42', wt: '#c8c8d8', wl: '#5a5a70', wr: '#8080a0', gem: ['#ffe040', '#fff0a0'] },
    { top: '#a040c0', l: '#501c60', r: '#702a88', wt: '#e09050', wl: '#783a18', wr: '#a85a28', gem: ['#40e0ff', '#b0f4ff'] },
    { top: '#c06030', l: '#602a10', r: '#884018', wt: '#a0d0ff', wl: '#40608a', wr: '#6088b8', gem: ['#60ff60', '#c0ffc0'] }
  ];
  // pixel art: each string row, '.' transparent
  const SPR = {
    bear0: ['..b...b..', '.bbb.bbb.', '.bbbbbbb.', 'bbkbbbkbb', 'bbbbnbbbb', '.bbbbbbb.', '..ttttt..', '.bbtttbb.', '.bbbbbbb.', '..bb.bb..', '.bb...bb.'],
    bear1: ['..b...b..', '.bbb.bbb.', '.bbbbbbb.', 'bbkbbbkbb', 'bbbbnbbbb', '.bbbbbbb.', '..ttttt..', '.bbtttbb.', '.bbbbbbb.', '..bb.bb..', '..bb.bb..'],
    hat: ['...h...', '..hhh..', '..hyh..', '.hhhhh.', 'hhhhhhh'],
    eater0: ['..gggg....', '.gggggg...', 'ggkgggggg.', 'gggggggggg', '.g.g.g.g..'],
    eater1: ['..gggg....', '.gggggg...', 'ggkgggggg.', 'gggggggggg', 'g.g.g.g.g.'],
    tree0: ['..gggg..', '.gggggg.', 'gggkgkgg', 'gggggggg', '.gggggg.', '..bbbb..', '..b..b..', '.bb..b..'],
    tree1: ['..gggg..', '.gggggg.', 'gggkgkgg', 'gggggggg', '.gggggg.', '..bbbb..', '..b..b..', '..b..bb.'],
    witch: ['....k....', '...kkk...', '..kkkkk..', 'kkkkkkkkk', '...ggg...', '...gkg...', '..ppppp..', '.ppppppp.', 'ppppppppp', '.pp.p.pp.'],
    pot: ['..yyy..', '.ooooo.', 'ooooooo', 'ooyyyoo', 'ooooooo', '.ooooo.']
  };
  const SPAL = {
    b: '#a8642a', k: '#000000', n: '#301808', t: '#f0c890', h: '#3060ff', y: '#ffe040', g: '#30c040', p: '#a030c0', o: '#e08a20'
  };

  ArcadeRegistry.register({
    id: 'crystalcastles', title: 'Crystal Castles', year: 1983, maker: 'Atari',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move Bentley (diagonals follow the walkways) \u00b7 Space: jump \u00b7 Enter: start',
    marquee: { bg: '#08061a', fg: '#ff60c0', accent: '#40e0ff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(30000);
      let state = 'attract';   // attract | intro | play | dying | clear | over
      let stateT = 0, attractT = 0;
      let score = 0, lives = 3, castle = 0, nextExtra = 30000;
      let cells = [], gems = [], gemsLeft = 0, startCell = [6, 13];
      let bear = null, enemies = [], bees = null, witch = null, hat = null, pot = null;
      let hatT = 0, beeT = 0, distMap = null, distT = 0, pops = [], msg = '', msgT = 0, warpUsed = false;
      let coinFlash = 0;

      const snd = {
        gem() { A.tone(1568 + (gemsLeft % 4) * 110, 0.03, { type: 'square', vol: 0.06 }); },
        jump() { A.tone(300, 0.25, { type: 'square', vol: 0.1, slideTo: 900 }); },
        land() { A.tone(200, 0.05, { type: 'triangle', vol: 0.1 }); },
        eat() { A.tone(140, 0.08, { type: 'square', vol: 0.08 }); },
        kill() { A.melody([[880, .04], [660, .04], [440, .04], [1320, .1]], { type: 'square', vol: 0.12 }); },
        hat() { A.melody([[523, .06], [659, .06], [784, .06], [1046, .06], [1318, .15]], { type: 'square', vol: 0.13 }); },
        pot() { A.melody([[784, .05], [988, .05], [1175, .1]], { type: 'triangle', vol: 0.16 }); },
        bees() { A.noise(0.6, { vol: 0.1, freq: 2400, type: 'bandpass' }); },
        die() { A.melody([[988, .1], [880, .1], [784, .1], [698, .1], [659, .1], [587, .1], [523, .3]], { type: 'square', vol: 0.13 }); },
        clear() { A.melody([[523, .08], [659, .08], [784, .08], [1046, .08], [784, .08], [1046, .08], [1318, .3]], { type: 'square', vol: 0.13 }); },
        intro() { A.melody([[392, .1], [523, .1], [659, .1], [523, .1], [659, .1], [784, .3]], { type: 'triangle', vol: 0.18 }); },
        witch() { A.tone(600, 0.5, { type: 'sawtooth', vol: 0.08, slideTo: 1400 }); },
        extra() { A.melody([[1318, .06], [1568, .06], [2093, .15]], { type: 'square', vol: 0.14 }); },
        warp() { A.tone(100, 1.2, { type: 'sine', vol: 0.18, slideTo: 3000 }); }
      };

      // ---------- castle setup ----------
      function level() { return Math.floor(castle / 4) + 1; }
      function pal() { return PALS[Math.floor(castle / 4) % PALS.length]; }
      function walk(i, j) { return i >= 0 && j >= 0 && i < N && j < N && cells[j][i] === 1; }
      function buildCastle() {
        const m = MAPS[castle % MAPS.length], mirror = Math.floor(castle / MAPS.length) % 2 === 1;
        cells = []; gems = [];
        for (let j = 0; j < N; j++) {
          cells.push([]); gems.push([]);
          for (let i = 0; i < N; i++) {
            const ch = m[j][mirror ? N - 1 - i : i];
            cells[j].push(ch === '#' ? 2 : ch === ' ' ? 0 : 1);
            gems[j].push(ch === '.' ? 1 : 0);
            if (ch === 'S') startCell = [i, j];
          }
        }
        // anything not reachable from the start pad becomes empty space
        const d = bfs(startCell[0], startCell[1]);
        gemsLeft = 0;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          if (cells[j][i] === 1 && d[j * N + i] < 0) { cells[j][i] = 0; gems[j][i] = 0; }
          gemsLeft += gems[j][i];
        }
      }
      function bfs(si, sj) {
        const d = new Int16Array(N * N).fill(-1);
        if (!walk(si, sj)) return d;
        const q = [si + sj * N]; d[q[0]] = 0;
        for (let h = 0; h < q.length; h++) {
          const c = q[h], i = c % N, j = (c / N) | 0;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = i + di, nj = j + dj;
            if (walk(ni, nj) && d[ni + nj * N] < 0) { d[ni + nj * N] = d[c] + 1; q.push(ni + nj * N); }
          }
        }
        return d;
      }
      function farCells(minD) {
        const d = bfs(startCell[0], startCell[1]), out = [];
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (d[j * N + i] >= minD) out.push([i, j, d[j * N + i]]);
        if (!out.length) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (d[j * N + i] >= 1) out.push([i, j, d[j * N + i]]);
        out.sort((a, b) => b[2] - a[2]);
        return out;
      }
      function pickFar(minD) { const f = farCells(minD); return f[Math.floor(Math.random() * Math.min(f.length, 12))] || startCell; }

      function newBear() { return { x: startCell[0] + 0.5, y: startCell[1] + 0.5, jumpT: 0, flip: false, anim: 0, alive: true, deadT: 0 }; }
      function spawnEnemies() {
        enemies = [];
        const lv = level(), k = castle;
        const nTrees = Math.min(4, 1 + Math.floor(k / 3)), nEaters = Math.min(4, 1 + Math.floor((k + 1) / 3));
        for (let i = 0; i < nTrees; i++) addEnemy('tree', 0.03 + Math.min(0.03, k * 0.003), 60 + i * 120);
        for (let i = 0; i < nEaters; i++) addEnemy('eater', 0.032 + Math.min(0.025, lv * 0.004), 30 + i * 90);
      }
      function addEnemy(type, speed, delay) {
        const c = pickFar(6);
        enemies.push({ type, cx: c[0], cy: c[1], nx: c[0], ny: c[1], p: 0, speed, eatT: 0, wait: delay, alive: true, respawnT: 0, anim: 0 });
      }
      function startCastle() {
        buildCastle();
        bear = newBear(); spawnEnemies();
        bees = null; witch = null; hat = null; pot = null; hatT = 0; pops = [];
        beeT = Math.max(900, 2100 - castle * 60);
        const kk = castle % 4;
        if (kk === 1 || kk === 3) { const c = pickFar(5); hat = { x: c[0] + 0.5, y: c[1] + 0.5 }; }
        if (kk === 2) { const c = pickFar(4); pot = { x: c[0] + 0.5, y: c[1] + 0.5 }; }
        if (kk === 3) witch = { x: -2, y: -2, wait: 200, alive: true, speed: 0.022 + level() * 0.002 };
        distMap = null; distT = 0;
        state = 'intro'; stateT = 0;
        snd.intro();
      }
      function startGame() {
        score = 0; lives = 3; castle = 0; nextExtra = 30000; warpUsed = false;
        startCastle();
      }
      function addScore(n, x, y) {
        score += n; if (score > hi) hi = score;
        if (score >= nextExtra) { nextExtra += 50000; lives++; snd.extra(); msg = 'EXTRA BENTLEY'; msgT = 120; }
        if (x != null) pops.push({ x, y, t: 50, s: String(n) });
      }

      // ---------- Bentley ----------
      function free(x, y) {
        const r = 0.28;
        return walk(Math.floor(x - r), Math.floor(y - r)) && walk(Math.floor(x + r), Math.floor(y - r)) &&
          walk(Math.floor(x - r), Math.floor(y + r)) && walk(Math.floor(x + r), Math.floor(y + r));
      }
      function moveBear() {
        let sx = 0, sy = 0;
        if (api.key('ArrowLeft')) sx--; if (api.key('ArrowRight')) sx++;
        if (api.key('ArrowUp')) sy--; if (api.key('ArrowDown')) sy++;
        // screen directions -> grid axes (a diagonal key pair follows a walkway exactly)
        let gx = sx + sy, gy = sy - sx;
        const l = Math.hypot(gx, gy);
        if (l > 0) {
          const sp = 0.068 + Math.min(0.02, castle * 0.0015);
          gx = gx / l * sp; gy = gy / l * sp;
          let mx = false, my = false;
          if (gx && free(bear.x + gx, bear.y)) { bear.x += gx; mx = true; }
          if (gy && free(bear.x, bear.y + gy)) { bear.y += gy; my = true; }
          // corner assist: slide toward the centre of the lane to slip into openings
          if (gx && !mx) assist('y', Math.sign(gx), sp);
          if (gy && !my) assist('x', Math.sign(gy), sp);
          // keep to the middle of the walkway when following it
          if (gx && !gy) { const c = Math.floor(bear.y) + 0.5, ny = bear.y + Math.max(-sp * 0.5, Math.min(sp * 0.5, c - bear.y)); if (free(bear.x, ny)) bear.y = ny; }
          if (gy && !gx) { const c = Math.floor(bear.x) + 0.5, nx = bear.x + Math.max(-sp * 0.5, Math.min(sp * 0.5, c - bear.x)); if (free(nx, bear.y)) bear.x = nx; }
          bear.anim += 0.2;
          const screenDx = gx - gy;
          if (Math.abs(screenDx) > 0.001) bear.flip = screenDx < 0;
        }
        if (bear.jumpT > 0) { bear.jumpT--; if (bear.jumpT === 0) snd.land(); }
        else if (api.pressed('Space')) {
          bear.jumpT = 34; snd.jump();
          // the secret warp: jump on the start pad of the very first castle
          if (castle === 0 && !warpUsed && Math.floor(bear.x) === startCell[0] && Math.floor(bear.y) === startCell[1] && stateT < 240) {
            warpUsed = true; snd.warp(); msg = 'WARP TO LEVEL 3'; msgT = 150;
            castle = 8; addScore(0); startCastle(); return;
          }
        }
      }
      function assist(axis, dirSign, sp) {
        // moving along the other axis is blocked: if the lane next door (through the cell centre) is open, line up with it
        const ci = Math.floor(bear.x), cj = Math.floor(bear.y);
        if (axis === 'y') {
          if (walk(ci + dirSign, cj)) { const c = cj + 0.5; bear.y += Math.max(-sp, Math.min(sp, c - bear.y)); }
        } else {
          if (walk(ci, cj + dirSign)) { const c = ci + 0.5; bear.x += Math.max(-sp, Math.min(sp, c - bear.x)); }
        }
      }
      function collectStuff() {
        if (bear.jumpT > 0) return;
        const i = Math.floor(bear.x), j = Math.floor(bear.y);
        if (gems[j] && gems[j][i] && Math.hypot(bear.x - i - 0.5, bear.y - j - 0.5) < 0.45) {
          gems[j][i] = 0; gemsLeft--;
          addScore(10 * level());
          snd.gem();
          if (gemsLeft === 0) {
            const b = 1000 + 1000 * level();
            addScore(b, bear.x, bear.y); msg = 'LAST GEM BONUS ' + b; msgT = 150;
          }
        }
        if (hat && Math.hypot(bear.x - hat.x, bear.y - hat.y) < 0.5) {
          hat = null; hatT = 60 * 9; snd.hat(); msg = 'MAGIC HAT'; msgT = 90;
        }
        if (pot && Math.hypot(bear.x - pot.x, bear.y - pot.y) < 0.5) {
          addScore(1500, pot.x, pot.y); pot = null; snd.pot();
          beeT = Math.min(beeT, 60);           // the bees come for their honey
        }
      }

      // ---------- enemies ----------
      function epos(e) { return [e.cx + 0.5 + (e.nx - e.cx) * e.p, e.cy + 0.5 + (e.ny - e.cy) * e.p]; }
      function neighbors(i, j) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).filter(([a, b]) => walk(a, b)); }
      function nearestGemStep(e) {
        // BFS from the eater to the closest gem; return the first step on the way
        const start = e.cx + e.cy * N, prev = new Int16Array(N * N).fill(-1), q = [start];
        prev[start] = start;
        for (let h = 0; h < q.length; h++) {
          const c = q[h], i = c % N, j = (c / N) | 0;
          if (c !== start && gems[j][i] && !enemies.some(o => o !== e && o.type === 'eater' && o.nx === i && o.ny === j)) {
            let s = c; while (prev[s] !== start) s = prev[s];
            return [s % N, (s / N) | 0];
          }
          for (const [ni, nj] of neighbors(i, j)) { const n = ni + nj * N; if (prev[n] < 0) { prev[n] = c; q.push(n); } }
        }
        return null;
      }
      function chooseNext(e) {
        const nb = neighbors(e.cx, e.cy);
        if (!nb.length) return [e.cx, e.cy];
        if (e.type === 'eater') {
          const s = Math.random() < 0.85 ? nearestGemStep(e) : null;
          if (s) return s;
        } else if (distMap && Math.random() < 0.8) {
          let best = null, bd = 1e9;
          for (const [a, b] of nb) { const d = distMap[a + b * N]; if (d >= 0 && d < bd) { bd = d; best = [a, b]; } }
          if (best) return best;
        }
        const back = nb.length > 1 ? nb.filter(([a, b]) => !(a === e.pcx && b === e.pcy)) : nb;
        return back[Math.floor(Math.random() * back.length)];
      }
      function updateEnemies() {
        if (--distT <= 0) { distT = 12; distMap = bear && bear.alive ? bfs(Math.floor(bear.x), Math.floor(bear.y)) : null; }
        for (const e of enemies) {
          e.anim++;
          if (!e.alive) {
            if (--e.respawnT <= 0) { const c = pickFar(6); e.cx = e.nx = c[0]; e.cy = e.ny = c[1]; e.p = 0; e.alive = true; e.wait = 30; }
            continue;
          }
          if (e.wait > 0) { e.wait--; continue; }
          if (e.eatT > 0) {
            if (--e.eatT === 0 && gems[e.cy][e.cx]) {
              gems[e.cy][e.cx] = 0; gemsLeft--; snd.eat();
            }
            continue;
          }
          e.p += e.speed;
          if (e.p >= 1) {
            e.pcx = e.cx; e.pcy = e.cy;
            e.cx = e.nx; e.cy = e.ny; e.p = 0;
            if (e.type === 'eater' && gems[e.cy][e.cx]) { e.eatT = 40; continue; }
            const n = chooseNext(e); e.nx = n[0]; e.ny = n[1];
          }
        }
      }
      function updateFlyers() {
        // the bee swarm
        if (!bees) {
          if (--beeT <= 0 && castle >= 1) {
            const c = Math.random() < 0.5 ? [-1, rnd(0, N)] : [rnd(0, N), -1];
            bees = { x: c[0], y: c[1], life: 60 * 14, speed: 0.024 + Math.min(0.02, castle * 0.0012), t: 0 };
            snd.bees();
          }
        } else {
          bees.t++;
          const tx = bees.life > 0 ? bear.x : -4, ty = bees.life > 0 ? bear.y : -4;
          const dx = tx - bees.x, dy = ty - bees.y, d = Math.hypot(dx, dy) || 1;
          bees.x += dx / d * bees.speed; bees.y += dy / d * bees.speed;
          if (bees.t % 50 === 0) A.noise(0.25, { vol: 0.05, freq: 2600, type: 'bandpass' });
          if (--bees.life < 0 && d < 0.5) { bees = null; beeT = Math.max(900, 1800 - castle * 50); }
        }
        // Berthilda the witch
        if (witch && witch.alive) {
          if (witch.wait > 0) { if (--witch.wait === 0) snd.witch(); }
          else {
            const dx = bear.x - witch.x, dy = bear.y - witch.y, d = Math.hypot(dx, dy) || 1;
            const wob = Math.sin(api.frame * 0.05) * 0.01;
            witch.x += dx / d * witch.speed + wob; witch.y += dy / d * witch.speed - wob;
          }
        }
      }
      function hitTests() {
        const inv = hatT > 0;
        for (const e of enemies) {
          if (!e.alive || e.wait > 0) continue;
          const [x, y] = epos(e);
          if (Math.hypot(x - bear.x, y - bear.y) > 0.55) continue;
          if (e.type === 'eater' && e.eatT > 0 && bear.jumpT === 0) {
            e.alive = false; e.respawnT = 360; addScore(500, x, y); snd.kill(); continue;
          }
          if (bear.jumpT > 0) continue;               // they pass under a jumping bear
          if (inv) { e.alive = false; e.respawnT = 400; addScore(e.type === 'tree' ? 300 : 500, x, y); snd.kill(); continue; }
          die(); return;
        }
        if (bees && Math.hypot(bees.x - bear.x, bees.y - bear.y) < 0.6) {
          if (inv) { addScore(1000, bees.x, bees.y); bees = null; beeT = 1500; snd.kill(); }
          else { die(); return; }
        }
        if (witch && witch.alive && witch.wait <= 0 && Math.hypot(witch.x - bear.x, witch.y - bear.y) < 0.6) {
          if (inv) { const b = 2000 + 1000 * level(); addScore(b, witch.x, witch.y); witch.alive = false; snd.kill(); msg = 'BERTHILDA BONUS ' + b; msgT = 120; }
          else { die(); return; }
        }
      }
      function die() {
        bear.alive = false; state = 'dying'; stateT = 0; lives--; snd.die();
      }

      function tryStart() {
        if (api.useCredit()) { startGame(); return true; }
        coinFlash = 120; A.tone(70, 0.28, { type: 'square', vol: 0.25 });
        return false;
      }

      // attract mode: castle with roaming enemies, no Bentley
      function attractInit() {
        castle = Math.floor(Math.random() * 6); buildCastle(); bear = newBear(); bear.alive = false; spawnEnemies();
        for (const e of enemies) e.wait = 0;
        bees = null; witch = null; hat = null; pot = null; pops = [];
        state = 'attract'; stateT = 0; attractT = 0;
      }
      attractInit();

      function update() {
        stateT++;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        for (let i = pops.length - 1; i >= 0; i--) if (--pops[i].t <= 0) pops.splice(i, 1);
        if (state === 'attract') {
          attractT++;
          updateEnemies();
          if (gemsLeft < 20 || attractT > 60 * 30) { const k = attractT; attractInit(); attractT = k > 60 * 30 ? 0 : k; }
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (state === 'over') {
          if (stateT > 240 || (stateT > 60 && api.anyPressed('Enter', 'Space'))) attractInit();
          return;
        }
        if (state === 'intro') { if (stateT > 120) { state = 'play'; stateT = 0; } return; }
        if (state === 'clear') {
          if (stateT > 150) { castle++; startCastle(); }
          return;
        }
        if (state === 'dying') {
          if (stateT > 130) {
            if (lives <= 0) {
              const over = () => { state = 'over'; stateT = 0; api.setHiScore(score); };
              if (api.offerContinue) { state = 'over'; stateT = -1e9; api.offerContinue(() => { lives = 3; respawn(); }, over); }
              else over();
            } else respawn();
          }
          return;
        }
        // play
        if (hatT > 0) hatT--;
        moveBear();
        if (state !== 'play') return;
        collectStuff();
        updateEnemies();
        updateFlyers();
        hitTests();
        if (state === 'play' && gemsLeft <= 0) {
          state = 'clear'; stateT = 0; snd.clear();
          if (!msgT) { msg = 'CASTLE CLEARED'; msgT = 140; }
        }
      }
      function respawn() {
        bear = newBear(); state = 'play'; stateT = 0; hatT = 0;
        // enemies go back to their corners
        for (const e of enemies) { const c = pickFar(6); e.cx = e.nx = c[0]; e.cy = e.ny = c[1]; e.p = 0; e.eatT = 0; e.wait = 60; e.alive = true; }
        if (bees) { bees = null; beeT = 600; }
        if (witch && witch.alive) { witch.x = -2; witch.y = -2; witch.wait = 150; }
      }

      // ---------- drawing ----------
      function proj(gx, gy) { return [OX + (gx - gy) * 8, OY + (gx + gy) * 4]; }
      function diamond(ctx, X, Y, col) {
        ctx.fillStyle = col;
        for (let r = 0; r < 8; r++) { const w = r < 4 ? r * 2 + 2 : (7 - r) * 2 + 2; ctx.fillRect(X - w, Y + r, w * 2, 1); }
      }
      function leftFace(ctx, X, Y, h, col) { ctx.fillStyle = col; for (let c = 0; c < 8; c += 2) ctx.fillRect(X - 8 + c, Y + 4 + (c >> 1), 2, h + 1); }
      function rightFace(ctx, X, Y, h, col) { ctx.fillStyle = col; for (let c = 0; c < 8; c += 2) ctx.fillRect(X + c, Y + 7 - (c >> 1), 2, h + 1); }
      function sprite(ctx, rows, x, y, flip, palOverride) {
        const w = rows[0].length;
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          for (let c = 0; c < w; c++) {
            const ch = row[flip ? w - 1 - c : c];
            if (ch === '.') continue;
            ctx.fillStyle = (palOverride && palOverride[ch]) || SPAL[ch]; ctx.fillRect(x + c, y + r, 1, 1);
          }
        }
      }
      function drawFloors(ctx) {
        const P = pal();
        for (let s = 0; s <= 2 * (N - 1); s++) {
          for (let i = Math.max(0, s - N + 1); i <= Math.min(N - 1, s); i++) {
            const j = s - i;
            if (cells[j][i] !== 1) continue;
            const [X, Y] = proj(i, j);
            diamond(ctx, X, Y, P.top);
            if (!(j + 1 < N && cells[j + 1][i])) leftFace(ctx, X, Y, D, P.l);
            if (!(i + 1 < N && cells[j][i + 1])) rightFace(ctx, X, Y, D, P.r);
          }
        }
        // gems
        const blink = api.frame >> 3;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          if (!gems[j][i]) continue;
          const [X, Y] = proj(i + 0.5, j + 0.5);
          const sp = ((i * 7 + j * 3 + blink) % 11) === 0;
          ctx.fillStyle = sp ? '#ffffff' : P.gem[0];
          ctx.fillRect(X - 1, Y - 2, 2, 1); ctx.fillRect(X - 2, Y - 1, 4, 1); ctx.fillRect(X - 1, Y, 2, 1);
          ctx.fillStyle = P.gem[1]; ctx.fillRect(X - 1, Y - 1, 1, 1);
        }
      }
      function drawWall(ctx, i, j) {
        const P = pal();
        const [X, Y0] = proj(i, j), Y = Y0 - WH;
        leftFace(ctx, X, Y, WH + D, P.wl);
        rightFace(ctx, X, Y, WH + D, P.wr);
        diamond(ctx, X, Y, P.wt);
        // brick courses
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let k = 5; k < WH + D; k += 5) { for (let c = 0; c < 8; c += 2) { ctx.fillRect(X - 8 + c, Y + 4 + (c >> 1) + k, 2, 1); ctx.fillRect(X + c, Y + 7 - (c >> 1) + k, 2, 1); } }
        // battlements
        ctx.fillStyle = P.wt; ctx.fillRect(X - 2, Y - 2, 4, 2);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        // star field behind the castle
        ctx.fillStyle = '#334';
        for (let k = 0; k < 40; k++) { const x = (k * 97) % W, y = (k * 57 + 13) % H; if (((k + (api.frame >> 5)) % 7) !== 0) ctx.fillRect(x, y, 1, 1); }
        drawFloors(ctx);
        // depth-sorted walls and sprites
        const list = [];
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (cells[j][i] === 2) list.push({ k: i + j + 1.6, f: () => drawWall(ctx, i, j) });
        if (hat) list.push({ k: hat.x + hat.y, f: () => { const [X, Y] = proj(hat.x, hat.y); sprite(ctx, SPR.hat, X - 3, Y - 6 - ((api.frame >> 4) & 1)); } });
        if (pot) list.push({ k: pot.x + pot.y, f: () => { const [X, Y] = proj(pot.x, pot.y); sprite(ctx, SPR.pot, X - 3, Y - 6); } });
        for (const e of enemies) {
          if (!e.alive || (e.wait > 0 && state !== 'attract' && (e.wait & 4))) continue;
          const [x, y] = epos(e);
          list.push({
            k: x + y, f: () => {
              const [X, Y] = proj(x, y), fr = (e.anim >> 3) & 1;
              if (e.type === 'tree') sprite(ctx, fr ? SPR.tree1 : SPR.tree0, X - 4, Y - 8, (e.nx - e.cx) - (e.ny - e.cy) < 0);
              else {
                const eating = e.eatT > 0;
                sprite(ctx, (eating ? (api.frame >> 2) & 1 : fr) ? SPR.eater1 : SPR.eater0, X - 5, Y - 4, (e.nx - e.cx) - (e.ny - e.cy) < 0, eating ? { g: '#90ff60' } : null);
              }
            }
          });
        }
        if (bear && (bear.alive || state === 'dying')) {
          list.push({
            k: bear.x + bear.y, f: () => {
              const [X, Y] = proj(bear.x, bear.y);
              const jt = bear.jumpT, hgt = jt > 0 ? Math.round(Math.sin((34 - jt) / 34 * Math.PI) * 10) : 0;
              if (hgt > 0) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(X - 3, Y - 1, 6, 2); }
              if (!bear.alive) {
                // death: spin and fade to grey
                const t = stateT, flip = ((t >> 3) & 1) === 1;
                const grey = { b: t > 60 ? '#606060' : '#a8642a', t: t > 60 ? '#909090' : '#f0c890' };
                if (t < 110 || (t & 4)) sprite(ctx, SPR.bear0, X - 4, Y - 10 - Math.max(0, 6 - Math.abs(t - 30) / 5), flip, grey);
                return;
              }
              const fr = (bear.anim | 0) & 1;
              sprite(ctx, fr ? SPR.bear1 : SPR.bear0, X - 4, Y - 10 - hgt, bear.flip, hatT > 0 && hatT < 120 && (hatT & 4) ? { b: '#ffffff' } : null);
              if (hatT > 0 && (hatT > 120 || (hatT & 8))) sprite(ctx, SPR.hat, X - 3, Y - 15 - hgt);
            }
          });
        }
        if (witch && witch.alive && witch.wait <= 0) list.push({ k: witch.x + witch.y + 3, f: () => { const [X, Y] = proj(witch.x, witch.y); sprite(ctx, SPR.witch, X - 4, Y - 16 + Math.round(Math.sin(api.frame * 0.1) * 2), witch.x > bear.x); ctx.fillStyle = '#7a4a1a'; ctx.fillRect(X - 7, Y - 8, 14, 1); } });
        if (bees) list.push({
          k: bees.x + bees.y + 3, f: () => {
            const [X, Y] = proj(bees.x, bees.y);
            for (let b = 0; b < 9; b++) {
              const a = b * 0.7 + api.frame * (0.15 + b * 0.01), r = 3 + (b % 3) * 2;
              const bx = Math.round(X + Math.cos(a) * r), by = Math.round(Y - 10 + Math.sin(a * 1.3) * r * 0.7);
              ctx.fillStyle = '#ffe040'; ctx.fillRect(bx, by, 2, 1); ctx.fillStyle = '#000'; ctx.fillRect(bx + 1, by, 1, 1);
              ctx.fillStyle = '#ffffff'; if ((api.frame + b) & 2) ctx.fillRect(bx, by - 1, 1, 1);
            }
          }
        });
        list.sort((a, b) => a.k - b.k);
        for (const it of list) it.f();
        for (const p of pops) { const [X, Y] = proj(p.x, p.y); text(ctx, p.s, X, Y - 22 - (50 - p.t) / 4, '#ffffff', 1, 'center'); }
        // HUD
        if (state !== 'attract') {
          text(ctx, String(score).padStart(6, '0'), 6, 4, '#ffffff', 1);
          text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2, 4, '#ff60c0', 1, 'center');
          text(ctx, 'LEVEL ' + level(), W - 6, 4, '#40e0ff', 1, 'right');
          for (let i = 0; i < Math.min(6, lives - (state === 'dying' ? 0 : 1)); i++) sprite(ctx, SPR.bear0, 6 + i * 12, H - 14, false);
          text(ctx, 'GEMS ' + gemsLeft, W - 6, H - 11, '#aaa', 1, 'right');
          if (hatT > 0) text(ctx, 'HAT ' + Math.ceil(hatT / 60), W / 2, H - 11, '#3060ff', 1, 'center');
        }
        if (state === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 196, 176, 26);
          text(ctx, 'LEVEL ' + level() + '   CASTLE ' + (castle % 4 + 1), W / 2, 200, '#ffffff', 1, 'center');
          text(ctx, castle % 4 === 3 ? 'BEWARE BERTHILDA' : 'COLLECT ALL THE GEMS', W / 2, 211, castle % 4 === 3 ? '#c050ff' : '#ffe040', 1, 'center');
        }
        if (msgT > 0 && state !== 'intro') text(ctx, msg, W / 2, 206, (msgT >> 3) & 1 ? '#ffffff' : '#ffe040', 1, 'center');
        if (state === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(48, 96, 160, 40);
          text(ctx, 'GAME OVER', W / 2, 102, '#ff4040', 2, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 122, '#ffffff', 1, 'center');
        }
        if (state === 'attract') drawTitle(ctx);
      }
      function drawTitle(ctx) {
        const page = Math.floor(attractT / 420) % 2;
        const blink = coinFlash > 0 ? (coinFlash >> 2) & 1 : (stateT >> 4) & 1;
        const cols = ['#ff4040', '#ffa040', '#ffe040', '#40ff60', '#40e0ff', '#a060ff', '#ff60c0'];
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(14, 8, 228, 44);
        const t1 = 'CRYSTAL', t2 = 'CASTLES';
        for (let k = 0; k < 7; k++) {
          text(ctx, t1[k], W / 2 - 72 + k * 24 + 6, 12, cols[(k + (api.frame >> 3)) % 7], 2, 'center');
          text(ctx, t2[k], W / 2 - 72 + k * 24 + 6, 32, cols[(k + 3 + (api.frame >> 3)) % 7], 2, 'center');
        }
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(24, 168, 208, 66);
        if (page === 0) {
          text(ctx, 'HELP BENTLEY BEAR COLLECT', W / 2, 172, '#ffffff', 1, 'center');
          text(ctx, 'THE GEMS IN EVERY CASTLE', W / 2, 181, '#ffffff', 1, 'center');
          text(ctx, 'HIGH SCORE ' + hi, W / 2, 194, '#ff60c0', 1, 'center');
        } else {
          sprite(ctx, SPR.eater0, 34, 172); text(ctx, '500 WHILE EATING', 50, 172, '#30c040', 1);
          sprite(ctx, SPR.hat, 36, 182); text(ctx, 'HAT: STOMP ANYTHING', 50, 182, '#3060ff', 1);
          sprite(ctx, SPR.pot, 36, 192); text(ctx, 'HONEY 1500 - BEES!', 50, 193, '#e08a20', 1);
        }
        if (blink) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 208, '#ffe040', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 30, 222, '#aaa', 1);
        text(ctx, '\u00a9 1983 ATARI', W - 30, 222, '#777', 1, 'right');
      }
      return { update, render, destroy() { } };
    }
  });
})();
