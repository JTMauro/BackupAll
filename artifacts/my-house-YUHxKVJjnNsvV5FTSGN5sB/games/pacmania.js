// Pac-Mania (Namco, 1987) - from-scratch recreation for the Game Room.
// A scrolling, three-quarter-view Pac-Man: the mazes are raised blocks seen at an angle, and Pac can JUMP
// over the ghosts. Four worlds (Block Town, Pac-Man's Park, Sandbox Land, Jungly Steps), seven ghosts
// including Sue, the jumping Funky and the grey Spunky, power pellets, bonus items, extra lives.
(function () {
  'use strict';
  const W = 288, H = 224;
  const TOPBAR = 14, BOTBAR = 14, VY = TOPBAR, VH = H - TOPBAR - BOTBAR;
  const TW = 16, TH = 14, WH = 6;          // tile width, tile depth, wall height (oblique projection)
  const COLS = 28;

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
    '"': [10, 10, 0, 0, 0, 0, 0], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0]
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
  // drop-shadowed text (the arcade's chunky 3D lettering)
  function text3d(ctx, s, x, y, col, side, sc, align, depth) {
    for (let d = depth || 2; d >= 1; d--) text(ctx, s, x + d, y + d, side, sc, align);
    text(ctx, s, x, y, col, sc, align);
  }

  // ---------- mazes: left halves, mirrored. '#' block, '.' pellet, 'o' power pellet, ' ' open, '-' door, 'G' ghost house ----------
  const MID = ["######.##.####", "######.##.    ", "######.##.###-", "      ....#GGG", "######.##.#GGG", "######.##.####", "######.##.    ", "######.##.####"];
  const TOPS = [
    ["##############", "#.....#......#", "#.###.#.####.#", "#o###.#.####.#", "#.............", "#.###.###.##.#", "#.###.###.##.#", "#......##....#", "######.##.####"],
    ["##############", "#............#", "#.##.#.#####.#", "#o##.#.#####.#", "#....#........", "####.####.##.#", "####.####.##.#", "####...##....#", "######.##.####"],
    ["##############", "#......##....#", "#.####.##.##.#", "#o####....##.#", "#....#.##....#", "####.#.##.####", "#......##....#", "#.####.##.##.#", "#......##....#"],
    ["##############", "#.........#...", "#.##.####.#.##", "#o##.####.#.##", "#.............", "#.##.#.######.", "#....#....##..", "####.#.##.##.#", "####...##....#"],
  ];
  const BOTS = [
    ["######.##.####", "#............#", "#.###.####.#.#", "#o###.####.#..", "#...#......#.#", "###.#.##.###.#", "#.....##.....#", "#.########.#.#", "#.########.#.#", "#.............", "##############"],
    ["######.##.####", "#............#", "#.##.#####.#.#", "#o##.......#..", "#.##.##.##.#.#", "#....##.##...#", "####.##.#####.", "#.........##..", "#.#######.##.#", "#.............", "##############"],
    ["#......##....#", "#....#....#..#", "####.#.##.#.##", "#o.....##....#", "#.###.####.#.#", "#.###.####.#..", "#............#", "#.##.######.##", "#.##.######.##", "#.............", "##############"],
    ["####...##....#", "#.............", "#.##.###.####.", "#o##...#.#...#", "#..###.#.#.#.#", "##.###.....#..", "#..........#.#", "#.####.###.#.#", "#.####.###.#.#", "#.............", "##############"],
  ];
  const THEMES = [
    { name: 'BLOCK TOWN', top: '#b9bdd0', hi: '#eceef8', lo: '#7b8098', front: '#4c5272', floor: '#14183a', floor2: '#181e44', deco: 0, pel: '#ffd0c0' },
    { name: "PAC-MAN'S PARK", top: '#3cb44e', hi: '#8ef08a', lo: '#2a8a38', front: '#1c5e28', floor: '#6a5234', floor2: '#725a3a', deco: 1, pel: '#fff4d0' },
    { name: 'SANDBOX LAND', top: '#ecc47c', hi: '#fff2c0', lo: '#c49a52', front: '#9a622e', floor: '#3a2c58', floor2: '#423262', deco: 2, pel: '#ffe0ff' },
    { name: 'JUNGLY STEPS', top: '#8c9caa', hi: '#c8d4de', lo: '#66788a', front: '#44546a', floor: '#173a1c', floor2: '#1c4422', deco: 3, pel: '#fff0b0' }
  ];
  const MAZES = TOPS.map((t, i) => t.concat(MID, BOTS[i]).map(r => r + r.split('').reverse().join('')));
  const ROWS = MAZES[0].length;
  const DOOR_Y = 11, ABOVE_Y = 10, HOUSE_Y = 12.5;
  const DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]]; // up, left, down, right
  const DIR_ANG = [-Math.PI / 2, Math.PI, Math.PI / 2, 0];

  // ghosts: colour, scatter corner, personality
  const GHOSTS = [
    { name: 'BLINKY', col: '#ff2020', sc: [25, -3], kind: 'chase' },
    { name: 'PINKY', col: '#ffa8e0', sc: [2, -3], kind: 'ambush' },
    { name: 'INKY', col: '#30e8ff', sc: [27, 30], kind: 'flank' },
    { name: 'CLYDE', col: '#ffb040', sc: [0, 30], kind: 'shy' },
    { name: 'SUE', col: '#b060ff', sc: [14, 30], kind: 'wander' },
    { name: 'FUNKY', col: '#40e040', sc: [27, 14], kind: 'jumper' },
    { name: 'SPUNKY', col: '#a8a8b0', sc: [0, 14], kind: 'spunky' }
  ];
  const ITEMS = [
    { k: 'cherry', p: 100 }, { k: 'strawberry', p: 300 }, { k: 'orange', p: 500 }, { k: 'apple', p: 700 },
    { k: 'melon', p: 1000 }, { k: 'flagship', p: 2000 }, { k: 'bell', p: 3000 }, { k: 'key', p: 5000 }
  ];

  ArcadeRegistry.register({
    id: 'pacmania', title: 'Pac-Mania', year: 1987, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space/X: jump \u00b7 Enter: start',
    marquee: { bg: '#10104a', fg: '#ffe000', accent: '#ff3070' },
    create(api) {
      const A = api.audio;
      let hi = api.getHiScore(30000);
      let state = 'title', T = 0, attractT = 0, demo = false;
      let score = 0, lives = 3, round = 1, nextExtra = 20000;
      let cells = [], pellets = 0, eaten = 0, theme = THEMES[0];
      let pac, ghosts = [], camX = 0, camY = 0, startRow = 22;
      let modeIdx = 0, modeT = 0, scatter = true, frT = 0, frMax = 0, chain = 0, freeze = 0;
      let item = null, itemsGot = [], popups = [], sparks = [], sirenT = 0, waka = 0, coinFlash = 0;
      const MODES = [7, 20, 7, 20, 5, 20, 5, 1e9].map(s => s * 60);

      // ---------- maze ----------
      function loadMaze() {
        const m = MAZES[Math.floor((round - 1) / 2) % 4];
        theme = THEMES[Math.floor((round - 1) / 2) % 4];
        cells = m.map(r => r.split(''));
        pellets = 0; eaten = 0;
        for (const row of cells) for (const ch of row) if (ch === '.' || ch === 'o') pellets++;
        startRow = 22;
        for (const r of [22, 23, 24, 21, 25, 26, 20, 19, 18, 17]) if (open(13, r) && open(14, r)) { startRow = r; break; }
        cells[startRow][13] = ' '; cells[startRow][14] = ' ';
        pellets = 0; for (const row of cells) for (const ch of row) if (ch === '.' || ch === 'o') pellets++;
      }
      function cell(c, r) { if (r < 0 || r >= ROWS) return '#'; c = ((c % COLS) + COLS) % COLS; return cells[r][c]; }
      function open(c, r) { const ch = cell(c, r); return ch !== '#' && ch !== '-' && ch !== 'G'; }
      function isWall(c, r) { if (r < 0 || r >= ROWS) return false; return cell(c, r) === '#'; }

      // ---------- parameters per round ----------
      function pacSpeed() { return 0.135 + Math.min(0.025, round * 0.0025); }
      function ghostSpeed() { return 0.118 + Math.min(0.045, (round - 1) * 0.005); }
      function frightTime() { return Math.max(90, 420 - (round - 1) * 30); }
      function ghostCount() { return round === 1 ? 4 : round <= 2 ? 5 : round <= 4 ? 6 : 7; }

      // ---------- actors ----------
      function newPac() { return { x: 13.5, y: startRow, dir: 1, want: 1, moving: true, anim: 0, z: 0, jt: 0, dead: 0 }; }
      function newGhosts() {
        const n = ghostCount(), list = [];
        const order = [0, 1, 2, 3, 4, 5, 6];
        if (round >= 3) { order[3] = 5; order[5] = 3; }   // Funky replaces Clyde as an early ghost from round 3
        const slots = [13.5, 11.5, 15.5, 12.5, 14.5, 11.5, 15.5];
        const relGap = Math.max(50, 240 - round * 20);
        for (let i = 0; i < n; i++) {
          const d = GHOSTS[order[i]];
          list.push({
            d, x: i === 0 ? 13.5 : slots[i], y: i === 0 ? ABOVE_Y : HOUSE_Y, dir: i === 0 ? 1 : (i & 1 ? 0 : 2),
            st: i === 0 ? 'active' : 'house', rel: i === 0 ? 0 : (i - 1) * relGap + 60, fr: false, z: 0, jt: 0, bob: i,
            spunkT: 120 + Math.random() * 240
          });
        }
        return list;
      }
      function resetActors() {
        pac = newPac(); ghosts = newGhosts();
        modeIdx = 0; modeT = 0; scatter = true; frT = 0; chain = 0; freeze = 0; item = null; popups = []; sparks = [];
        snapCamera();
      }
      function snapCamera() {
        const tx = pac.x * TW + TW / 2 - W / 2, ty = pac.y * TH + TH / 2 - VH / 2;
        camX = clampCamX(tx); camY = clampCamY(ty);
      }
      const clampCamX = v => Math.max(0, Math.min(COLS * TW - W, v));
      const clampCamY = v => Math.max(-WH - 4, Math.min(ROWS * TH - VH + 2, v));

      // ---------- grid movement ----------
      function moveActor(a, speed, decide) {
        let rem = speed, guard = 0;
        while (rem > 1e-6 && guard++ < 6) {
          const rx = Math.round(a.x), ry = Math.round(a.y);
          if (Math.abs(a.x - rx) < 1e-4 && Math.abs(a.y - ry) < 1e-4) {
            a.x = rx; a.y = ry;
            if (a.x < 0) a.x += COLS; else if (a.x >= COLS) a.x -= COLS;
            if (!decide(a)) { a.moving = false; return; }
            a.moving = true;
          }
          const dx = DIRS[a.dir][0], dy = DIRS[a.dir][1];
          let dist;
          if (dx > 0) dist = Math.floor(a.x + 1e-4) + 1 - a.x;
          else if (dx < 0) dist = a.x - (Math.ceil(a.x - 1e-4) - 1);
          else if (dy > 0) dist = Math.floor(a.y + 1e-4) + 1 - a.y;
          else dist = a.y - (Math.ceil(a.y - 1e-4) - 1);
          const s = Math.min(rem, dist);
          a.x += dx * s; a.y += dy * s; rem -= s;
        }
      }
      const canGo = (x, y, d) => open(x + DIRS[d][0], y + DIRS[d][1]);

      // ---------- input (player or demo AI) ----------
      function readDir() {
        if (api.key('ArrowUp')) return 0;
        if (api.key('ArrowLeft')) return 1;
        if (api.key('ArrowDown')) return 2;
        if (api.key('ArrowRight')) return 3;
        return -1;
      }
      function demoBrain() {
        // pick at intersections: prefer pellets, avoid ghosts that are not frightened
        const cx = Math.round(pac.x), cy = Math.round(pac.y);
        let best = pac.dir, bestS = -1e9;
        for (let d = 0; d < 4; d++) {
          if (!canGo(cx, cy, d)) continue;
          let s = Math.random() * 2;
          if (d === (pac.dir + 2) % 4) s -= 3;
          let x = cx, y = cy;
          for (let k = 1; k <= 6; k++) {
            x += DIRS[d][0]; y += DIRS[d][1]; if (!open(x, y)) break;
            const ch = cell(x, y); if (ch === '.' || ch === 'o') s += 6 / k;
          }
          for (const g of ghosts) {
            if (g.st !== 'active') continue;
            const dd = Math.abs(g.x - (cx + DIRS[d][0] * 2)) + Math.abs(g.y - (cy + DIRS[d][1] * 2));
            if (g.fr) s += 8 / (1 + dd); else s -= 40 / (1 + dd * dd * 0.5);
          }
          if (s > bestS) { bestS = s; best = d; }
        }
        return best;
      }
      function demoJump() {
        if (pac.jt > 0) return false;
        for (const g of ghosts) if (g.st === 'active' && !g.fr && Math.abs(g.x - pac.x) + Math.abs(g.y - pac.y) < 1.6) return true;
        return false;
      }

      function pacDecide(a) {
        if (a.jt > 0) return canGo(a.x, a.y, a.dir);         // committed while airborne
        if (a.want >= 0 && canGo(a.x, a.y, a.want)) { a.dir = a.want; return true; }
        return canGo(a.x, a.y, a.dir);
      }

      // ---------- ghosts ----------
      function ghostTarget(g) {
        const px = Math.round(pac.x), py = Math.round(pac.y);
        if (g.st === 'eyes') return [13, ABOVE_Y];
        if (scatter && g.d.kind !== 'wander') return g.d.sc;
        const pd = DIRS[pac.dir];
        switch (g.d.kind) {
          case 'chase': return [px, py];
          case 'ambush': return [px + pd[0] * 4, py + pd[1] * 4];
          case 'flank': {
            const b = ghosts[0]; const ax = px + pd[0] * 2, ay = py + pd[1] * 2;
            return [ax * 2 - Math.round(b.x), ay * 2 - Math.round(b.y)];
          }
          case 'shy': return (Math.hypot(g.x - px, g.y - py) > 8) ? [px, py] : g.d.sc;
          case 'wander': return (Math.floor(T / 300) & 1) ? [px, py] : [Math.round(Math.random() * 27), Math.round(Math.random() * 27)];
          case 'jumper': return [px - pd[0] * 2, py - pd[1] * 2];
          default: return [px + pd[0] * 2, py + pd[1] * 2];
        }
      }
      function ghostDecide(g) {
        if (g.st === 'eyes' && g.y === ABOVE_Y && (g.x === 13 || g.x === 14)) { g.st = 'enter'; return false; }
        const rev = (g.dir + 2) % 4, opts = [];
        for (let d = 0; d < 4; d++) if (d !== rev && canGo(g.x, g.y, d)) opts.push(d);
        if (!opts.length) opts.push(rev);
        if (g.fr && g.st === 'active') { g.dir = opts[(Math.random() * opts.length) | 0]; return true; }
        const t = ghostTarget(g);
        let best = opts[0], bd = 1e9;
        for (const d of opts) {
          const nx = g.x + DIRS[d][0], ny = g.y + DIRS[d][1];
          const dd = (nx - t[0]) * (nx - t[0]) + (ny - t[1]) * (ny - t[1]);
          if (dd < bd) { bd = dd; best = d; }
        }
        g.dir = best; return true;
      }
      function ghostSp(g) {
        if (g.st === 'eyes' || g.st === 'enter') return 0.3;
        if (g.st === 'house') return 0.04;
        if (g.st === 'exit') return 0.06;
        const ry = Math.round(g.y), rx = Math.round(g.x);
        if (ry === 12 && (rx <= 5 || rx >= 22)) return 0.06;
        if (g.fr) return 0.07;
        let s = ghostSpeed();
        if (g === ghosts[0] && pellets - eaten < 30) s += 0.012;
        if (g.d.kind === 'spunky') s += 0.008;
        return s;
      }
      function updateGhost(g) {
        if (g.jt > 0) { g.jt--; g.z = Math.sin(Math.PI * (1 - g.jt / 34)) * 15; if (g.jt === 0) g.z = 0; }
        const sp = ghostSp(g);
        if (g.st === 'house') {
          g.bob += 0.12; g.y = HOUSE_Y + Math.sin(g.bob) * 0.3;
          if (g.rel > 0) g.rel--; else { g.st = 'exit'; g.y = HOUSE_Y; }
          return;
        }
        if (g.st === 'exit') {
          if (Math.abs(g.x - 13.5) > 0.01) g.x += Math.sign(13.5 - g.x) * Math.min(0.06, Math.abs(13.5 - g.x));
          else { g.x = 13.5; g.y -= 0.06; if (g.y <= ABOVE_Y) { g.y = ABOVE_Y; g.st = 'active'; g.dir = Math.random() < 0.5 ? 1 : 3; } }
          return;
        }
        if (g.st === 'enter') {
          if (Math.abs(g.x - 13.5) > 0.01) g.x += Math.sign(13.5 - g.x) * Math.min(0.2, Math.abs(13.5 - g.x));
          else { g.x = 13.5; g.y += 0.2; if (g.y >= HOUSE_Y) { g.y = HOUSE_Y; g.st = 'exit'; g.fr = false; } }
          return;
        }
        moveActor(g, sp, ghostDecide);
        if (g.st === 'eyes') return;
        // jumping ghosts
        if (g.jt === 0 && !g.fr) {
          if (g.d.kind === 'jumper' && pac.jt > 26 && Math.hypot(g.x - pac.x, g.y - pac.y) < 6) g.jt = 34;
          if (g.d.kind === 'spunky' && --g.spunkT <= 0) { g.jt = 34; g.spunkT = 150 + Math.random() * 200; }
        }
      }
      function reverseAll() { for (const g of ghosts) if (g.st === 'active') g.dir = (g.dir + 2) % 4; }

      // ---------- scoring & sounds ----------
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score >= nextExtra) {
          lives++; nextExtra += nextExtra === 20000 ? 30000 : 50000;
          A.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .14]], { type: 'square', vol: .12 });
        }
        if (score > hi) hi = score;
      }
      function sndWaka() { waka ^= 1; A.tone(waka ? 260 : 400, 0.07, { type: 'triangle', vol: 0.14, slideTo: waka ? 420 : 230 }); }
      function sndJump() { A.tone(300, 0.3, { type: 'square', vol: 0.09, slideTo: 900 }); A.tone(900, 0.25, { type: 'triangle', vol: 0.06, slideTo: 300, delay: 0.3 }); }
      function sndPower() { A.melody([[523, .05], [784, .05], [1047, .05], [784, .05], [1047, .1]], { type: 'square', vol: .1 }); }
      function sndEatGhost() { A.tone(200, 0.35, { type: 'square', vol: 0.12, slideTo: 1800 }); }
      function sndDie() {
        A.tone(880, 1.2, { type: 'square', vol: 0.12, slideTo: 110 });
        A.tone(600, 1.2, { type: 'triangle', vol: 0.08, slideTo: 60, delay: 0.05 });
        A.noise(0.35, { vol: 0.1, freq: 1800, delay: 1.25 });
      }
      function jingle() {
        const q = 0.11;
        A.melody([[523, q], [659, q], [784, q], [1047, q * 2], [880, q], [784, q], [659, q * 2], [698, q], [880, q], [1047, q], [1175, q * 2], [1047, q], [988, q], [1047, q * 3]], { type: 'square', vol: 0.1 });
        A.melody([[131, q * 4], [196, q * 4], [175, q * 4], [131, q * 4]], { type: 'triangle', vol: 0.12 });
      }
      function sndItem() { A.melody([[1568, .05], [1319, .05], [1568, .05], [2093, .1]], { type: 'square', vol: .1 }); }
      function sndClear() { A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2], [1175, .08], [1568, .3]], { type: 'square', vol: .1 }); }

      // ---------- game flow ----------
      function tryStart() {
        if (!api.useCredit()) { coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); return; }
        demo = false; score = 0; lives = 3; round = 1; nextExtra = 20000; itemsGot = [];
        loadMaze(); resetActors(); state = 'ready'; T = 0; jingle();
      }
      function startDemo() {
        demo = true; round = 1 + 2 * ((Math.random() * 4) | 0); loadMaze(); resetActors(); state = 'play'; T = 0;
      }
      function toTitle() { demo = false; state = 'title'; T = 0; attractT = 0; }
      function nextRound() {
        round++; loadMaze(); resetActors(); state = 'ready'; T = 0; jingle();
      }
      function gameOver() { api.setHiScore(score); state = 'over'; T = 0; A.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: .1 }); }

      function eatAt(cx, cy) {
        const ch = cell(cx, cy);
        if (ch !== '.' && ch !== 'o') return;
        const c = ((cx % COLS) + COLS) % COLS;
        cells[cy][c] = ' '; eaten++;
        if (ch === '.') { addScore(10); sndWaka(); }
        else {
          addScore(50); sndPower(); chain = 0;
          frMax = frightTime(); frT = frMax;
          for (const g of ghosts) if (g.st !== 'eyes' && g.st !== 'enter') g.fr = true;
          reverseAll();
        }
        if (eaten === 70 || eaten === 170) {
          const it = ITEMS[Math.min(ITEMS.length - 1, round - 1 + (eaten === 170 ? 1 : 0))];
          item = { x: 13.5, y: startRow, t: 600, it };
        }
        if (eaten >= pellets) { state = 'clear'; T = 0; if (!demo) sndClear(); }
      }

      function updatePlay() {
        if (freeze > 0) { freeze--; updatePopups(); return; }
        T++;
        // mode timer (paused while frightened)
        if (frT > 0) {
          frT--;
          if (frT === 0) for (const g of ghosts) g.fr = false;
        } else if (modeIdx < MODES.length) {
          modeT++;
          if (modeT >= MODES[modeIdx]) { modeT = 0; modeIdx++; scatter = !(modeIdx & 1) ; reverseAll(); }
        }
        // input
        if (demo) {
          if (Math.abs(pac.x - Math.round(pac.x)) < 0.15 && Math.abs(pac.y - Math.round(pac.y)) < 0.15) pac.want = demoBrain();
          if (demoJump()) startJump();
        } else {
          const d = readDir(); if (d >= 0) pac.want = d;
          if (api.anyPressed('Space', 'KeyX', 'KeyZ')) startJump();
        }
        if (pac.jt === 0 && pac.want === (pac.dir + 2) % 4) { pac.dir = pac.want; pac.moving = true; }
        // jump arc
        if (pac.jt > 0) { pac.jt--; pac.z = Math.sin(Math.PI * (1 - pac.jt / 36)) * 18; if (pac.jt === 0) pac.z = 0; }
        moveActor(pac, pacSpeed() * (frT > 0 ? 1.08 : 1), pacDecide);
        if (pac.moving) pac.anim += 0.35;
        if (pac.z < 3) eatAt(Math.round(pac.x), Math.round(pac.y));
        if (state !== 'play') return;
        // bonus item
        if (item) {
          item.t--;
          if (item.t <= 0) item = null;
          else if (pac.z < 6 && Math.abs(pac.x - item.x) < 0.7 && Math.abs(pac.y - item.y) < 0.6) {
            addScore(item.it.p); popups.push({ x: item.x, y: item.y, v: item.it.p, t: 90, c: '#ff90ff' });
            if (!demo) { itemsGot.push(item.it.k); if (itemsGot.length > 7) itemsGot.shift(); }
            sndItem(); item = null;
          }
        }
        for (const g of ghosts) updateGhost(g);
        // collisions
        for (const g of ghosts) {
          if (g.st !== 'active') continue;
          let dx = Math.abs(g.x - pac.x); if (dx > COLS / 2) dx = COLS - dx;
          if (dx > 0.7 || Math.abs(g.y - pac.y) > 0.7) continue;
          if (g.fr) {
            g.st = 'eyes'; g.fr = false; g.jt = 0; g.z = 0;
            const v = Math.min(6400, 200 << chain); chain++;
            addScore(v); popups.push({ x: g.x, y: g.y, v, t: 60, c: '#40ffff' });
            freeze = 30; sndEatGhost();
            return;
          }
          if (pac.z > 6 && Math.abs(pac.z - g.z) > 7) continue;    // leapt clean over it
          state = 'dying'; T = 0; pac.dead = 0;
          if (!demo) sndDie();
          return;
        }
        // siren / fright loop
        if (!demo && --sirenT <= 0) {
          if (frT > 0) { sirenT = 14; A.tone(frT < 120 ? 300 : 200, 0.1, { type: 'sawtooth', vol: 0.035, slideTo: 500 }); }
          else if (ghosts.some(g => g.st === 'eyes')) { sirenT = 10; A.tone(1200, 0.08, { type: 'square', vol: 0.03, slideTo: 600 }); }
          else { const s = 1 - (pellets - eaten) / pellets; sirenT = 24; A.tone(420 + s * 200, 0.2, { type: 'triangle', vol: 0.05, slideTo: 620 + s * 260 }); }
        }
        updatePopups();
      }
      function startJump() {
        if (pac.jt > 0) return;
        pac.jt = 36; if (!demo) sndJump();
        // jumping from a standstill still bounces in place
      }
      function updatePopups() {
        for (const p of popups) p.t--; popups = popups.filter(p => p.t > 0);
        for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.05; s.t--; } sparks = sparks.filter(s => s.t > 0);
      }
      function updateCamera(snap) {
        const tx = clampCamX(pac.x * TW + TW / 2 - W / 2), ty = clampCamY(pac.y * TH + TH / 2 - VH / 2 - pac.z * 0.3);
        if (snap) { camX = tx; camY = ty; return; }
        camX += (tx - camX) * 0.12; camY += (ty - camY) * 0.12;
      }

      function update() {
        if (coinFlash > 0) coinFlash--;
        if (state === 'title') {
          T++; attractT++;
          if (api.anyPressed('Enter', 'Space')) { tryStart(); return; }
          if (attractT > 600) startDemo();
          return;
        }
        if (demo && api.anyPressed('Enter', 'Space')) { tryStart(); return; }
        switch (state) {
          case 'ready':
            T++; updateCamera(false);
            if (T > 150) { state = 'play'; T = 0; }
            break;
          case 'play':
            updatePlay(); updateCamera(false);
            if (demo && T > 1500) toTitle();
            break;
          case 'dying':
            T++; updatePopups();
            if (T === 80) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; sparks.push({ x: pac.x, y: pac.y, vx: Math.cos(a) * 0.12, vy: Math.sin(a) * 0.1 - 0.05, t: 30 }); }
            if (T > 130) {
              if (demo) { toTitle(); break; }
              if (lives > 1) { lives--; pac = newPac(); ghosts = newGhosts(); modeIdx = 0; modeT = 0; scatter = true; frT = 0; item = null; state = 'ready'; T = 60; }
              else {
                lives = 0; state = 'wait';
                if (api.offerContinue) api.offerContinue(() => { lives = 3; score = 0; nextExtra = 20000; pac = newPac(); ghosts = newGhosts(); frT = 0; modeIdx = 0; modeT = 0; scatter = true; state = 'ready'; T = 0; jingle(); }, gameOver);
                else gameOver();
              }
            }
            break;
          case 'clear':
            T++;
            if (T > 150) { if (demo) toTitle(); else nextRound(); }
            break;
          case 'wait': break;
          case 'over':
            T++;
            if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) toTitle();
            break;
        }
      }

      // ================= rendering =================
      function hash(c, r) { let h = (c * 73856093) ^ (r * 19349663); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
      function drawWall(ctx, c, r, sx, sy, flash) {
        const th = theme;
        const top = flash ? '#ffffff' : th.top, front = flash ? '#a0a0ff' : th.front;
        // top face, lifted by the wall height
        ctx.fillStyle = top; ctx.fillRect(sx, sy - WH, TW, TH);
        const up = isWall(c, r - 1), dn = isWall(c, r + 1), lf = isWall(c - 1, r), rt = isWall(c + 1, r);
        if (!flash) {
          ctx.fillStyle = th.hi;
          if (!up) ctx.fillRect(sx, sy - WH, TW, 1);
          if (!lf) ctx.fillRect(sx, sy - WH, 1, TH);
          ctx.fillStyle = th.lo;
          if (!rt) ctx.fillRect(sx + TW - 1, sy - WH, 1, TH);
          // surface detail
          const h = hash(c, r);
          if (th.deco === 1) { ctx.fillStyle = th.hi; ctx.fillRect(sx + 3 + ((h * 8) | 0), sy - WH + 3, 2, 2); ctx.fillStyle = th.lo; ctx.fillRect(sx + 9 - ((h * 6) | 0), sy - WH + 8, 2, 2); }
          else if (th.deco === 2) { ctx.fillStyle = th.lo; ctx.fillRect(sx + ((h * 13) | 0), sy - WH + 2 + ((h * 97) % 9 | 0), 1, 1); ctx.fillRect(sx + ((h * 7 + 6) | 0) % 15, sy - WH + 6, 1, 1); }
          else if (th.deco === 3) { ctx.fillStyle = th.lo; ctx.fillRect(sx, sy - WH + 6, TW, 1); ctx.fillRect(sx + ((r & 1) ? 4 : 11), sy - WH, 1, 6); ctx.fillRect(sx + ((r & 1) ? 11 : 4), sy - WH + 7, 1, 7); }
          else if (!up || !dn) { ctx.fillStyle = th.lo; ctx.fillRect(sx + 4, sy - WH + 4, TW - 8, TH - 8); }
        }
        if (!dn) {
          ctx.fillStyle = front; ctx.fillRect(sx, sy + TH - WH, TW, WH);
          if (!flash) {
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sx, sy + TH - 1, TW, 1);
            if (th.deco === 0) { ctx.fillStyle = ((c + r) % 3) ? '#ffe070' : '#304070'; ctx.fillRect(sx + 3, sy + TH - WH + 2, 3, 2); ctx.fillRect(sx + 10, sy + TH - WH + 2, 3, 2); }
            else if (th.deco === 1) { ctx.fillStyle = '#134a1c'; for (let i = 1; i < TW; i += 4) ctx.fillRect(sx + i, sy + TH - WH + 1 + (i & 2), 2, 2); }
            else if (th.deco === 2) { ctx.fillStyle = '#c88a48'; ctx.fillRect(sx, sy + TH - WH, TW, 1); }
            else { ctx.fillStyle = '#2a8a3a'; if (hash(r, c) < 0.4) ctx.fillRect(sx + ((hash(c, r) * 12) | 0), sy + TH - WH, 2, WH); }
          }
        }
      }
      function shadow(ctx, x, y, rx) {
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      }
      function drawPac(ctx, x, y, z, dir, anim, scale, deadT) {
        const R = 7 * (scale || 1), cx = x, cy = y - 7 - z;
        shadow(ctx, x, y, 6 - Math.min(3, z / 6));
        let open = Math.abs(Math.sin(anim)) * 0.85 + 0.05;
        let ang = DIR_ANG[dir];
        if (deadT != null) { open = Math.min(Math.PI - 0.01, 0.2 + deadT * 0.045); ang = -Math.PI / 2; }
        const g = ctx.createRadialGradient(cx - 2.5, cy - 3, 1, cx, cy, R + 1);
        g.addColorStop(0, '#ffffd8'); g.addColorStop(0.45, '#ffe600'); g.addColorStop(1, '#c08a00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, ang + open, ang - open + Math.PI * 2); ctx.closePath(); ctx.fill();
        if (deadT == null && (dir === 1 || dir === 3 || dir === 2)) {
          const ex = cx + (dir === 3 ? 1 : dir === 1 ? -1 : 0) * 1.5, ey = cy - (dir === 2 ? 1 : 4);
          ctx.fillStyle = '#201000'; ctx.fillRect(Math.round(ex - 1 + (dir === 2 ? 2 : 0)), Math.round(ey), 2, 2);
        }
      }
      function drawGhost(ctx, g, x, y) {
        const cy = y - 7 - g.z;
        if (g.st !== 'eyes' && g.st !== 'enter') {
          shadow(ctx, x, y, 6 - Math.min(3, g.z / 6));
          let body = g.d.col;
          if (g.fr) body = (frT < 120 && (frT >> 3) & 1) ? '#f0f0ff' : '#2638ff';
          const gr = ctx.createRadialGradient(x - 2, cy - 3, 1, x, cy, 9);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, body); gr.addColorStop(1, '#000000');
          ctx.fillStyle = gr; ctx.beginPath();
          ctx.arc(x, cy - 1, 7, Math.PI, 0); ctx.lineTo(x + 7, cy + 6);
          const ph = (T >> 3) & 1;
          for (let i = 0; i < 4; i++) { const bx = x + 7 - i * 3.5; ctx.lineTo(bx - 1.75, cy + (((i + ph) & 1) ? 3.5 : 5)); ctx.lineTo(bx - 3.5, cy + 6); }
          ctx.closePath(); ctx.fill();
          if (g.fr) {
            const fc = body === '#2638ff' ? '#ffc0a0' : '#ff2020';
            ctx.fillStyle = fc; ctx.fillRect(x - 3, cy - 3, 2, 2); ctx.fillRect(x + 1, cy - 3, 2, 2);
            for (let i = 0; i < 5; i++) ctx.fillRect(x - 5 + i * 2, cy + 1 + (i & 1), 2, 1);
            return;
          }
        }
        // eyes
        const d = DIRS[g.dir];
        for (const ox of [-3, 2]) {
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + ox + 0.5, cy - 2, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1830d0'; ctx.fillRect(Math.round(x + ox + d[0] * 1.2), Math.round(cy - 2.5 + d[1] * 1.4), 2, 2);
        }
      }
      function drawItem(ctx, k, x, y) {
        const c = (col, X, Y, r) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill(); };
        switch (k) {
          case 'cherry': ctx.strokeStyle = '#a06020'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 2, y - 7); ctx.lineTo(x + 3, y + 1); ctx.stroke(); c('#ff1010', x - 3, y + 1, 3); c('#ff1010', x + 3, y + 2, 3); c('#ffc0c0', x - 4, y, 1); break;
          case 'strawberry': c('#ff2020', x, y + 1, 4.5); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 1, y + 2, 1, 1); ctx.fillRect(x - 1, y + 3, 1, 1); ctx.fillStyle = '#20c020'; ctx.fillRect(x - 3, y - 4, 6, 2); break;
          case 'orange': c('#ff9a20', x, y + 1, 4.5); ctx.fillStyle = '#20c020'; ctx.fillRect(x, y - 5, 3, 2); break;
          case 'apple': c('#e01020', x, y + 1, 4.5); c('#ff8080', x - 2, y - 1, 1.2); ctx.fillStyle = '#804010'; ctx.fillRect(x, y - 5, 1, 3); break;
          case 'melon': c('#30c030', x, y + 1, 4.5); ctx.fillStyle = '#106010'; ctx.fillRect(x - 3, y - 1, 6, 1); ctx.fillRect(x - 1, y - 3, 1, 7); break;
          case 'flagship': ctx.fillStyle = '#ffe020'; ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillStyle = '#3050ff'; ctx.fillRect(x - 1, y - 4, 2, 8); ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 1, y - 5, 2, 2); break;
          case 'bell': c('#ffe020', x, y - 1, 4); ctx.fillStyle = '#ffe020'; ctx.fillRect(x - 5, y + 1, 10, 3); ctx.fillStyle = '#40c0ff'; ctx.fillRect(x - 1, y + 4, 2, 1); break;
          default: ctx.fillStyle = '#40c0ff'; ctx.fillRect(x - 3, y - 5, 6, 4); ctx.fillStyle = '#e0e0ff'; ctx.fillRect(x - 1, y - 1, 2, 7); ctx.fillRect(x + 1, y + 2, 2, 1); ctx.fillRect(x + 1, y + 4, 2, 1);
        }
      }
      function tiny(ctx, s, x, y, col) { text(ctx, s, x, y, col, 1, 'center'); }

      function drawWorld(ctx) {
        const flash = state === 'clear' && T > 30 && ((T >> 3) & 1);
        ctx.save(); ctx.beginPath(); ctx.rect(0, VY, W, VH); ctx.clip();
        ctx.fillStyle = '#000'; ctx.fillRect(0, VY, W, VH);
        const ox = Math.round(camX), oy = Math.round(camY) - VY;
        const c0 = Math.floor(ox / TW) - 1, c1 = c0 + Math.ceil(W / TW) + 2;
        const r0 = Math.max(0, Math.floor(oy / TH) - 1), r1 = Math.min(ROWS - 1, Math.floor((oy + VH + WH) / TH) + 1);
        // floor
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
          if (c < 0 || c >= COLS) { if (r === 12 && open(c, r)) { ctx.fillStyle = theme.floor; ctx.fillRect(c * TW - ox, r * TH - oy, TW, TH); } continue; }
          if (!isWall(c, r)) { ctx.fillStyle = ((c + r) & 1) ? theme.floor2 : theme.floor; ctx.fillRect(c * TW - ox, r * TH - oy, TW, TH); }
        }
        // actor list with screen positions
        const acts = [];
        const sx = x => x * TW + TW / 2 - ox, sy = y => y * TH + TH / 2 - oy;
        if (state !== 'over') {
          for (const g of ghosts) if (!(state === 'dying' && T > 40)) acts.push({ row: Math.round(g.y), f: () => drawGhost(ctx, g, sx(g.x), sy(g.y)) });
          const pr = Math.round(pac.y);
          if (state === 'dying') { if (T < 80) acts.push({ row: pr, f: () => drawPac(ctx, sx(pac.x), sy(pac.y), 0, pac.dir, 0, 1 - Math.max(0, T - 40) / 50, T < 40 ? 0 : T - 40) }); }
          else acts.push({ row: pr, f: () => drawPac(ctx, sx(pac.x), sy(pac.y), pac.z, pac.dir, pac.anim) });
        }
        acts.sort((a, b) => a.row - b.row);
        let ai = 0;
        // draw by rows, back to front
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const ch = cell(c, r);
            if (ch === '#' && c >= 0 && c < COLS) drawWall(ctx, c, r, c * TW - ox, r * TH - oy, flash);
          }
          for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
            const ch = cells[r][c], px = c * TW + TW / 2 - ox, py = r * TH + TH / 2 - oy - 2;
            if (ch === '.') { ctx.fillStyle = theme.pel; ctx.fillRect(px - 1, py - 1, 3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(px - 1, py - 1, 1, 1); }
            else if (ch === 'o') {
              if (state !== 'play' || ((T >> 3) & 1)) {
                shadow(ctx, px, py + 3, 4);
                const gr = ctx.createRadialGradient(px - 1.5, py - 4, 0.5, px, py - 2, 5);
                gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, theme.pel === '#ffd0c0' ? '#ff7050' : '#ff60c0');
                ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py - 2, 4.5, 0, Math.PI * 2); ctx.fill();
              }
            } else if (ch === '-') { ctx.fillStyle = '#ffb0d0'; ctx.fillRect(c * TW - ox, r * TH - oy + 5, TW, 2); }
          }
          if (item && Math.round(item.y) === r) { const ix = sx(item.x), iy = sy(item.y); shadow(ctx, ix, iy, 5); drawItem(ctx, item.it.k, ix, iy - 7 - Math.abs(Math.sin(T * 0.08)) * 3); }
          while (ai < acts.length && acts[ai].row <= r) acts[ai++].f();
        }
        while (ai < acts.length) acts[ai++].f();
        for (const s of sparks) { ctx.fillStyle = (s.t & 2) ? '#ffff80' : '#ffffff'; ctx.fillRect(Math.round(sx(s.x)), Math.round(sy(s.y) - 7), 2, 2); }
        for (const p of popups) tiny(ctx, String(p.v), sx(p.x), sy(p.y) - 20 - (60 - p.t) * 0.1, p.c);
        if (state === 'ready') {
          const bx = W / 2, by = VY + VH / 2;
          ctx.fillStyle = 'rgba(0,0,20,.65)'; ctx.fillRect(bx - 80, by - 26, 160, 46);
          text3d(ctx, 'ROUND ' + round, bx, by - 20, '#ffffff', '#3040c0', 1, 'center', 1);
          text3d(ctx, theme.name, bx, by - 8, '#ffd040', '#a04000', 1, 'center', 1);
          text3d(ctx, 'READY!', bx, by + 6, '#ffff00', '#806000', 1, 'center', 1);
        }
        if (state === 'clear' && T < 30) { /* pause */ }
        ctx.restore();
      }

      function drawHud(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOPBAR); ctx.fillRect(0, H - BOTBAR, W, BOTBAR);
        ctx.fillStyle = '#2030a0'; ctx.fillRect(0, TOPBAR - 1, W, 1); ctx.fillRect(0, H - BOTBAR, W, 1);
        text(ctx, '1UP', 6, 3, ((api.frame >> 4) & 1) || state !== 'play' ? '#ff4040' : '#802020');
        text(ctx, String(score).padStart(7, ' '), 28, 3, '#ffffff');
        text(ctx, 'HIGH', 112, 3, '#ff4040'); text(ctx, String(hi).padStart(7, ' '), 138, 3, '#ffffff');
        text(ctx, 'ROUND', 214, 3, '#40c0ff'); text(ctx, String(round), 248, 3, '#ffffff');
        // lives
        for (let i = 0; i < Math.min(6, lives - (state === 'play' || state === 'dying' ? 1 : 0)); i++) {
          const x = 10 + i * 14, y = H - 7;
          ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 5, Math.PI + 0.6, Math.PI - 0.6 + Math.PI * 2); ctx.closePath(); ctx.fill();
        }
        for (let i = 0; i < itemsGot.length; i++) drawItem(ctx, itemsGot[i], W - 10 - i * 14, H - 7);
        if (demo) { text(ctx, 'DEMO', W / 2, H - 11, '#ff60c0', 1, 'center'); }
      }

      function drawTitle(ctx) {
        ctx.fillStyle = '#05051a'; ctx.fillRect(0, 0, W, H);
        // receding checker floor
        for (let r = 0; r < 12; r++) {
          const y0 = 120 + r * r * 0.9 + r * 4, y1 = 120 + (r + 1) * (r + 1) * 0.9 + (r + 1) * 4;
          for (let c = -10; c < 10; c++) {
            const sc0 = 0.5 + r * 0.25;
            const x0 = W / 2 + (c * 24 - ((T * 0.5) % 48)) * sc0;
            ctx.fillStyle = ((c + r) & 1) ? '#1a1e5a' : '#101444';
            ctx.fillRect(x0, y0, 24 * sc0 + 1, y1 - y0 + 1);
          }
        }
        // logo
        const wob = Math.sin(T * 0.05) * 2;
        text3d(ctx, 'PAC-MANIA', W / 2, 26 + wob, '#ffe600', '#c03000', 4, 'center', 4);
        text(ctx, 'PAC-MANIA', W / 2 - 1, 25 + wob, '#fff8a0', 4, 'center');
        text3d(ctx, 'PAC-MANIA', W / 2, 26 + wob, '#ffe600', '#ff6000', 4, 'center', 1);
        // roll call
        const page = Math.floor(attractT / 300) & 1;
        if (!page) {
          const n = Math.min(7, Math.floor(attractT / 30));
          text(ctx, 'CHARACTER', 70, 70, '#ffffff');
          for (let i = 0; i < n; i++) {
            const g = GHOSTS[i], y = 84 + i * 14;
            drawGhost(ctx, { d: g, z: 0, st: 'active', fr: false, dir: 3 }, 80, y + 12);
            text(ctx, g.name, 96, y + 2, g.col);
          }
          if (attractT > 230) { drawPac(ctx, 210, 150, Math.abs(Math.sin(T * 0.08)) * 14, 1, T * 0.3); text(ctx, 'JUMP!', 210, 158, '#ffe600', 1, 'center'); }
        } else {
          text(ctx, '* SCORE TABLE *', W / 2, 70, '#40c0ff', 1, 'center');
          const rows = [['PELLET', '10'], ['POWER PELLET', '50'], ['GHOSTS', '200-400-800-1600...'], ['BONUS ITEM', '100-5000']];
          rows.forEach((r, i) => { text(ctx, r[0], 40, 88 + i * 14, '#ffffff'); text(ctx, r[1], W - 40, 88 + i * 14, '#ffd040', 1, 'right'); });
          text(ctx, 'EXTRA PAC AT 20000 AND 50000', W / 2, 150, '#ff9030', 1, 'center');
          text(ctx, 'THEN EVERY 50000', W / 2, 160, '#ff9030', 1, 'center');
        }
        text(ctx, 'HIGH SCORE ' + hi, W / 2, 178, '#ffffff', 1, 'center');
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 192, '#ff4040', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START BUTTON', W / 2, 192, '#ffe600', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 192, '#ffe600', 1, 'center');
        text(ctx, '\u00a9 1987 NAMCO', W / 2, 206, '#a0a0c0', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#8080a0');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); return; }
        drawWorld(ctx);
        drawHud(ctx);
        if (state === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(60, 90, W - 120, 36);
          text3d(ctx, 'GAME OVER', W / 2, 100, '#ff3030', '#600000', 2, 'center', 2);
        }
        if (demo && ((api.frame >> 5) & 1)) text3d(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, VY + 10, '#ffe600', '#804000', 1, 'center', 1);
      }

      toTitle();
      loadMaze(); pac = newPac(); ghosts = newGhosts();
      return { update, render, destroy() { } };
    }
  });
})();
