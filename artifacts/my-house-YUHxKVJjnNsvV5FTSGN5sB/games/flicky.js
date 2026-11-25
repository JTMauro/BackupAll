// Flicky (Sega, 1984) \u2014 from-scratch recreation. Guide the bluebird Flicky around wrapping two-screen rooms,
// gather the Chirps into a following chain and lead them home through the EXIT door. Nyannyan the cats and
// Choro the iguana scatter the chain; throw cups and pots to knock them away. Bonus catch rounds every 4th round.
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
    '"': [10, 10, 20, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2],
    '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // col: css colour or array of 7 per-row colours (gradient lettering)
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let r = 0; r < 7; r++) {
      ctx.fillStyle = typeof col === 'string' ? col : col[r];
      for (let i = 0; i < s.length; i++) {
        const g = FONT[s[i]]; if (!g) continue;
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
    return w;
  }
  function textS(ctx, s, x, y, col, sc, align) { // with 1px drop shadow / outline
    sc = sc || 1;
    text(ctx, s, x + 1, y + 1, '#000', sc, align);
    if (sc > 1) { text(ctx, s, x - 1, y, '#000', sc, align); text(ctx, s, x + 1, y, '#000', sc, align); text(ctx, s, x, y - 1, '#000', sc, align); text(ctx, s, x, y + sc, '#000', sc, align); }
    return text(ctx, s, x, y, col, sc, align);
  }

  // ---------- helpers ----------
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function paint(rows, pal) {
    const h = rows.length; let w = 0; for (const r of rows) w = Math.max(w, r.length);
    const [c, x] = mkCanvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
      const col = pal[rows[j][i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
    }
    return c;
  }
  function mirror(rows) { let w = 0; for (const r of rows) w = Math.max(w, r.length); return rows.map(r => r.padEnd(w, '.').split('').reverse().join('')); }
  function sprite(rows, pal) { return { r: paint(rows, pal), l: paint(mirror(rows), pal), w: rows[0].length, h: rows.length }; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---------- pixel art ----------
  const PAL = {
    b: '#2f78ff', d: '#0c2c9c', w: '#ffffff', k: '#000000', o: '#ff9a10', y: '#ffe030', Y: '#e0a000',
    c: '#ff8418', C: '#b04000', p: '#ff8cb0', g: '#3cd040', G: '#107818', r: '#e02020', s: '#c0c0c0', n: '#8a4a18', N: '#5a2a08', B: '#60c0ff'
  };
  const FLICKY = [
    ['....dddd....', '...dbbbbd...', '..dbbbbwwd..', '..dbbbbwkd..', '.dbbbbbwwdoo', '.dbbbbbbbdoo', 'dbbbbbbbbd..',
      'dbbbdbbbbd..', 'dbbddbbbd...', '.dbbbbbd....', '..ddddd.....', '..o...o.....'],
    ['....dddd....', '...dbbbbd...', '..dbbbbwwd..', '..dbbbbwkd..', '.dbbbbbwwdoo', '.dbbbbbbbdoo', 'dbbbbbbbbd..',
      'dbbbbdbbbd..', 'dbbbddbbd...', '.dbbbbbd....', '..ddddd.....', '...o.o......'],
    ['....dddd....', '...dbbbbd...', '..dbbbbwwd..', 'dddbbbbwkd..', 'dbbdbbbwwdoo', '.dbbbbbbbdoo', '.dbbbbbbbd..',
      '.dbbbbbbbd..', '.dbbbbbbd...', '..dbbbbd....', '...dddd.....', '..o....o....']
  ].map(r => sprite(r, PAL));
  const CHIRP = [
    ['..yyy..', '.yyyky.', '.yyyyyo', 'yyyyyy.', 'Yyyyyy.', '.YyyY..', '.o..o..'],
    ['..yyy..', '.yyyky.', '.yyyyyo', 'yyyyyy.', 'Yyyyyy.', '.YyyY..', '..oo...']
  ].map(r => sprite(r, PAL));
  const CAT = [
    ['........C..C', '........cccc', '.......cwkcw', 'c......ccccp', 'c..cccccccc.', '.ccCcCcCccc.', '..ccCcCcCcc.', '..cccccccc..', '..c.c..c.c..', '.cc.c.cc.c..'],
    ['........C..C', '........cccc', '.......cwkcw', '.c.....ccccp', '.c.cccccccc.', '..cCcCcCccc.', '..ccCcCcCcc.', '..cccccccc..', '...cc..cc...', '..cc..cc....']
  ].map(r => sprite(r, PAL));
  const CATSTUN = sprite(['..C..C......', '..cccc......', '.cwkwkc.....', '..cppc......', '.cccccccc...', 'ccCcCcCccc..', '.cccccccc...', 'c.c..c.c....'], PAL);
  const IGUANA = [
    ['...........gg...', '..........ggkgg.', 'G....ggggggggggg', '.GgggGgGgGggggg.', '..gggggggggggg..', '...g.g....g.g...'],
    ['...........gg...', '..........ggkgg.', '.G...ggggggggggg', 'G.gggGgGgGggggg.', '..gggggggggggg..', '..g...g..g...g..']
  ].map(r => sprite(r, PAL));
  const ITEMS = [
    sprite(['.wwww.', 'wBBBBww', 'wwwwww.w', 'wwwwwww.', '.wwww..', '..ww...'], PAL),        // cup
    sprite(['.gGg..', 'GgGgG.', 'nnnnnn', '.nNnn.', '.nnNn.', '..nn..'], PAL),             // flower pot
    sprite(['..ss..', '..ss..', '.rrrr.', '.rwwr.', '.rrrr.', '.rrrr.'], PAL),              // bottle
    sprite(['.kkkk.', 'kssssk', 'kkkkkk', 'kswswk', 'kswswk', 'kkkkkk'], PAL)              // phone
  ];

  ArcadeRegistry.register({
    id: 'flicky', title: 'Flicky', year: 1984, maker: 'Sega',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: jump \u00b7 X: throw item \u00b7 Down: drop through floor \u00b7 Enter: start',
    marquee: { bg: '#081860', fg: '#40a0ff', accent: '#ffe030' },
    create(api) {
      const W = 256, H = 224, TOP = 16, WW = 512, COLS = 64, ROWS = 26;
      const LAND = [5, 10, 15, 20, 25], FLOOR = 25;
      const audio = api.audio;
      const THEMES = [
        { wall: '#183878', stripe: '#1e4490', brick: '#e07820', brickD: '#904010', hi: '#ffc070' },
        { wall: '#5a1858', stripe: '#6c2068', brick: '#30a0e0', brickD: '#105890', hi: '#a0e0ff' },
        { wall: '#184a28', stripe: '#1e5a30', brick: '#e0c030', brickD: '#907010', hi: '#fff0a0' },
        { wall: '#602818', stripe: '#70321e', brick: '#a0a0b8', brickD: '#585870', hi: '#ffffff' }
      ];
      let hi = api.getHiScore(10000);
      let mode = 'title', modeT = 0, score = 0, lives = 0, round = 1, nextExtra = 30000, coinFlash = 0, titlePage = 0;
      let plat = [], door = null, hatches = [], chirps = [], chain = [], cats = [], items = [], thrown = [], pops = [], trail = [];
      let fl = null, roundT = 0, bonusTally = 0, bgmT = 0, bonus = null, invuln = 0, clearInfo = null;

      const wrap = x => ((x % WW) + WW) % WW;
      const wd = d => ((d % WW) + WW * 1.5) % WW - WW / 2;   // shortest wrapped delta
      function solidAt(x, row) { const r = plat[row]; return !!(r && r[((Math.floor(x / 8)) % COLS + COLS) % COLS]); }
      const rowY = row => TOP + row * 8;
      function addScore(n) {
        score += n;
        while (score >= nextExtra) { lives++; nextExtra += nextExtra === 30000 ? 70000 : 100000; audio.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .12]], { type: 'square', vol: 0.12 }); }
        if (score > hi) hi = score;
      }
      function pop(x, y, t, col) { pops.push({ x, y, t: String(t), f: 60, col: col || '#fff' }); }

      // ---------- sound ----------
      const sfx = {
        jump() { audio.tone(520, 0.12, { type: 'square', vol: 0.09, slideTo: 1040 }); },
        pick() { audio.tone(1568, 0.05, { type: 'square', vol: 0.1 }); audio.tone(2093, 0.06, { type: 'square', vol: 0.1, delay: 0.05 }); },
        item() { audio.tone(800, 0.06, { type: 'triangle', vol: 0.15 }); },
        thrw() { audio.tone(900, 0.15, { type: 'square', vol: 0.08, slideTo: 300 }); },
        hit() { audio.noise(0.15, { vol: 0.2, freq: 3000 }); audio.tone(300, 0.3, { type: 'square', vol: 0.1, slideTo: 1200 }); },
        scatter() { for (let i = 0; i < 4; i++) audio.tone(1800 - i * 200, 0.05, { type: 'square', vol: 0.08, delay: i * 0.04 }); },
        die() { audio.melody([[784, .1], [740, .1], [698, .1], [659, .1], [622, .1], [587, .1], [554, .1], [523, .3]], { type: 'square', vol: 0.12 }); },
        deliver(n) { for (let i = 0; i < n; i++) audio.tone(523 * Math.pow(2, i / 6), 0.08, { type: 'square', vol: 0.1, delay: i * 0.08 }); },
        clear() { audio.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.13 }); },
        start() { audio.melody([[392, .12], [523, .12], [659, .12], [784, .12], [659, .12], [784, .3]], { type: 'square', vol: 0.12 }); }
      };
      // an original, bouncy 2-bar loop
      const BGM = [[659, .15], [784, .15], [880, .15], [784, .15], [659, .15], [587, .15], [523, .3], [587, .15], [659, .15], [784, .15], [659, .15], [587, .3], [0, .3],
        [523, .15], [587, .15], [659, .15], [587, .15], [523, .15], [494, .15], [440, .3], [494, .15], [523, .15], [587, .15], [494, .15], [523, .45]];
      const BASS = [[131, .3], [196, .3], [131, .3], [196, .3], [147, .3], [220, .3], [147, .3], [220, .3], [110, .3], [165, .3], [110, .3], [165, .3], [98, .3], [147, .3], [131, .6]];

      // ---------- round generation ----------
      function genRound(r) {
        let s = (r * 7919 + 1013) % 2147483647; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
        plat = []; for (let i = 0; i < ROWS; i++) plat.push(new Uint8Array(COLS));
        plat[FLOOR].fill(1);
        for (const row of LAND) {
          if (row === FLOOR) continue;
          let c = Math.floor(R() * 6);
          while (c < COLS) {
            const len = 5 + Math.floor(R() * 10);
            for (let k = 0; k < len && c + k < COLS; k++) plat[row][c + k] = 1;
            c += len + 3 + Math.floor(R() * 5);
          }
        }
        const force = (row, col, rad) => { for (let k = -rad; k <= rad; k++) plat[row][((col + k) % COLS + COLS) % COLS] = 1; };
        const dRow = [FLOOR, 20, 15, 10][r % 4], dCol = 8 + Math.floor(R() * 48);
        force(dRow, dCol, 3);
        door = { x: dCol * 8 + 4, y: rowY(dRow), row: dRow };
        hatches = [];
        const nh = r >= 5 ? 3 : 2;
        for (let i = 0; i < nh; i++) {
          const row = [10, 5, 15][i % 3];
          const col = ((dCol + 20 + i * Math.floor(64 / nh)) + Math.floor(R() * 8)) % COLS;
          force(row, col, 2);
          hatches.push({ x: col * 8 + 4, y: rowY(row) });
        }
        // chirps in clusters, away from the door
        chirps = []; chain = [];
        const total = r < 3 ? 8 : 10;
        let guard = 0;
        while (chirps.length < total && guard++ < 500) {
          const row = LAND[Math.floor(R() * LAND.length)], col = Math.floor(R() * COLS);
          if (!plat[row][col]) continue;
          if (Math.abs(wd(col * 8 - door.x)) < 96) continue;
          const n = Math.min(total - chirps.length, 2 + Math.floor(R() * 3));
          for (let k = 0; k < n; k++) {
            const cx = col * 8 + 4 + k * 9;
            if (!solidAt(cx, row)) break;
            chirps.push({ x: wrap(cx), y: rowY(row), vx: 0, vy: 0, ground: true, state: 'idle', t: Math.floor(R() * 60), face: R() < 0.5 ? 1 : -1, ign: -1 });
          }
        }
        items = []; guard = 0;
        const ni = 5 + Math.min(3, r >> 2);
        while (items.length < ni && guard++ < 400) {
          const row = LAND[Math.floor(R() * 4)], col = Math.floor(R() * COLS);
          if (!plat[row][col]) continue;
          items.push({ x: col * 8 + 4, y: rowY(row), kind: Math.floor(R() * ITEMS.length) });
        }
      }
      function catSpeed() { return Math.min(1.55, 0.72 + 0.06 * (round - 1)); }
      function spawnEnemies() {
        cats = [];
        const nc = Math.min(6, 2 + Math.floor((round - 1) / 2));
        for (let i = 0; i < nc; i++) cats.push({ kind: 'cat', x: 0, y: 0, vx: 0, vy: 0, ground: false, state: 'hatch', t: 90 + i * 110, h: i % hatches.length, face: 1, ign: -1, dirT: 0 });
        const ni = round >= 4 ? (round >= 9 ? 2 : 1) : 0;
        for (let i = 0; i < ni; i++) cats.push({ kind: 'iguana', x: 0, y: 0, vx: 0, vy: 0, ground: false, state: 'hatch', t: 240 + i * 300, h: (i + 1) % hatches.length, face: -1, ign: -1, dirT: 0 });
      }
      function placeFlicky() {
        fl = { x: wrap(door.x + 18), y: door.y, vx: 0, vy: 0, ground: true, face: 1, item: -1, anim: 0, ign: -1, dieT: 0 };
        trail = []; invuln = 90; thrown = [];
      }
      function startRound() {
        genRound(round); spawnEnemies(); placeFlicky();
        mode = 'ready'; modeT = 0; roundT = 0; pops = [];
        sfx.start();
      }
      function startGame() {
        score = 0; lives = 2; round = 1; nextExtra = 30000;
        startRound();
      }
      function gameOver() {
        mode = 'over'; modeT = 0; api.setHiScore(hi);
      }

      // ---------- physics shared by Flicky, chirps and enemies ----------
      function fall(e, g, maxV) {
        const py = e.y;
        e.vy = Math.min(maxV, e.vy + g); e.y += e.vy;
        if (e.vy > 0) {
          for (const row of LAND) {
            const t = rowY(row);
            if (row !== e.ign && py <= t && e.y >= t && (solidAt(e.x - 3, row) || solidAt(e.x + 3, row))) {
              e.y = t; e.vy = 0; e.ground = true; e.ign = -1; return true;
            }
          }
        }
        if (e.y > rowY(FLOOR)) { e.y = rowY(FLOOR); e.vy = 0; e.ground = true; e.ign = -1; return true; }
        if (e.y < TOP + 10) { e.y = TOP + 10; if (e.vy < 0) e.vy = 0; }
        return false;
      }
      function curRow(e) { return Math.round((e.y - TOP) / 8); }
      function checkGround(e) {
        const row = curRow(e);
        if (!(solidAt(e.x - 3, row) || solidAt(e.x + 3, row))) { e.ground = false; e.vy = 0; }
      }

      // ---------- player ----------
      function updateFlicky() {
        const L = api.key('ArrowLeft'), Rt = api.key('ArrowRight');
        if (L && !Rt) { fl.vx -= 0.13; fl.face = -1; } else if (Rt && !L) { fl.vx += 0.13; fl.face = 1; }
        else { fl.vx *= 0.9; if (Math.abs(fl.vx) < 0.05) fl.vx = 0; }
        fl.vx = clamp(fl.vx, -1.9, 1.9);
        const ox = fl.x, oy = fl.y;
        fl.x = wrap(fl.x + fl.vx);
        if (fl.ground) {
          if (api.pressed('Space') || api.pressed('ArrowUp')) { fl.vy = -4.9; fl.ground = false; sfx.jump(); }
          else if (api.pressed('ArrowDown') && curRow(fl) !== FLOOR) { fl.ign = curRow(fl); fl.ground = false; fl.vy = 0.5; }
          else checkGround(fl);
        }
        if (!fl.ground) {
          if (fl.vy < -1.8 && !api.key('Space') && !api.key('ArrowUp')) fl.vy = -1.8;
          fall(fl, 0.22, 5);
        }
        if (Math.abs(fl.x - ox) > 0.01 || Math.abs(fl.y - oy) > 0.01) {
          fl.anim += Math.abs(fl.vx) * 0.12 + 0.05;
          trail.unshift({ x: fl.x, y: fl.y }); if (trail.length > 240) trail.pop();
        }
        // pick up items
        if (fl.item < 0) for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (Math.abs(wd(it.x - fl.x)) < 8 && Math.abs(it.y - fl.y) < 8) { fl.item = it.kind; items.splice(i, 1); sfx.item(); break; }
        }
        if (fl.item >= 0 && (api.pressed('KeyX') || api.pressed('KeyZ'))) {
          thrown.push({ x: fl.x, y: fl.y - 9, vx: fl.face * 4.4 + fl.vx * 0.5, vy: -0.8, kind: fl.item, t: 0, combo: 0 });
          fl.item = -1; sfx.thrw();
        }
        // collect chirps
        for (const c of chirps) {
          if (c.state === 'chain' || c.state === 'home') continue;
          if (Math.abs(wd(c.x - fl.x)) < 10 && Math.abs(c.y - fl.y) < 12) { c.state = 'chain'; chain.push(c); sfx.pick(); }
        }
        // deliver
        if (chain.length && Math.abs(wd(fl.x - door.x)) < 9 && Math.abs(fl.y - door.y) < 6) {
          const n = chain.length; let pts = 0;
          for (let k = 1; k <= n; k++) pts += 100 * k;
          for (const c of chain) c.state = 'home';
          chain = []; addScore(pts); pop(door.x, door.y - 34, pts, '#ffe030'); sfx.deliver(n);
          if (chirps.every(c => c.state === 'home')) roundClear();
        }
      }
      function chainPos(i) {
        const k = Math.min(trail.length - 1, (i + 1) * 10);
        if (k < 0) return { x: fl.x, y: fl.y };
        return trail[k];
      }
      function scatterFrom(i) {
        if (i >= chain.length) return;
        const lost = chain.splice(i);
        for (const c of lost) {
          const p = chainPos(i); c.x = p.x; c.y = p.y;
          c.state = 'run'; c.t = 100 + Math.floor(Math.random() * 60);
          c.face = Math.random() < 0.5 ? -1 : 1; c.vx = c.face * (0.8 + Math.random() * 0.6); c.vy = -2.5 - Math.random() * 1.5; c.ground = false;
        }
        sfx.scatter();
      }
      function killFlicky() {
        if (mode !== 'play') return;
        mode = 'die'; modeT = 0; fl.dieT = 0;
        if (chain.length) {
          for (let i = 0; i < chain.length; i++) { const p = chainPos(i); chain[i].x = p.x; chain[i].y = p.y; }
          scatterFrom(0);
        }
        sfx.die();
      }
      function roundClear() {
        mode = 'clear'; modeT = 0;
        const s = roundT / 60;
        const tb = s < 20 ? 50000 : s < 30 ? 30000 : s < 40 ? 20000 : s < 50 ? 10000 : s < 60 ? 5000 : 0;
        clearInfo = { secs: Math.floor(s), bonus: tb }; bonusTally = tb;
        sfx.clear();
      }

      // ---------- chirps ----------
      function updateChirps() {
        for (const c of chirps) {
          if (c.state === 'home' || c.state === 'chain') continue;
          if (c.state === 'run') {
            if (c.ground) {
              c.x = wrap(c.x + c.vx);
              const row = curRow(c);
              if (!(solidAt(c.x - 3, row) || solidAt(c.x + 3, row))) { if (Math.random() < 0.5) { c.ground = false; c.vy = 0; } else { c.vx = -c.vx; c.face = -c.face; c.x = wrap(c.x + c.vx * 2); } }
              if (Math.random() < 0.02) { c.vy = -2.6; c.ground = false; }
            } else { c.x = wrap(c.x + c.vx); fall(c, 0.18, 4); }
            if (--c.t <= 0 && c.ground) { c.state = 'idle'; c.t = 1; }
          } else {
            // idle chicks hop on the spot and turn to look at Flicky
            c.t++;
            if (!c.ground) fall(c, 0.18, 4);
            else if (c.t % 50 === 0 && Math.random() < 0.5) { c.vy = -1.4; c.ground = false; }
            if (fl) c.face = wd(fl.x - c.x) > 0 ? 1 : -1;
          }
        }
      }

      // ---------- enemies ----------
      function updateEnemies() {
        const sp = catSpeed();
        for (const e of cats) {
          e.t--;
          if (e.state === 'hatch') {
            if (e.t <= 0) {
              const h = hatches[e.h]; e.x = h.x; e.y = h.y; e.ground = true; e.state = 'walk';
              e.face = wd(fl.x - e.x) > 0 ? 1 : -1; e.dirT = 30;
              audio.tone(220, 0.1, { type: 'sawtooth', vol: 0.06, slideTo: 330 });
            }
            continue;
          }
          if (e.state === 'stun') {
            e.x = wrap(e.x + e.vx); e.vy += 0.18; e.y += e.vy;
            if (e.y > H + 20 || e.t <= 0) { e.state = 'hatch'; e.t = 180 + Math.floor(Math.random() * 120); e.vx = 0; e.vy = 0; }
            continue;
          }
          const igu = e.kind === 'iguana';
          const v = igu ? sp * 0.6 : sp;
          if (e.ground) {
            const dx = wd(fl.x - e.x), dy = fl.y - e.y;
            if (--e.dirT <= 0) {
              e.dirT = igu ? 120 : 24 + Math.floor(Math.random() * 30);
              if (!igu) {
                if (Math.abs(dy) < 12 || Math.random() < 0.55) e.face = dx > 0 ? 1 : -1;
                else if (Math.random() < 0.25) e.face = -e.face;
              } else if (Math.random() < 0.3) e.face = dx > 0 ? 1 : -1;
            }
            e.x = wrap(e.x + e.face * v);
            const row = curRow(e);
            const ahead = solidAt(e.x + e.face * 5, row);
            if (!ahead) {
              if (igu) { if (Math.random() < 0.6) e.face = -e.face; else { e.ground = false; e.vy = 0; } }
              else if (Math.abs(dy) < 12 && Math.random() < 0.7) { e.vy = -3.6; e.ground = false; }    // leap the gap
              else if (dy < -12 && Math.random() < 0.5) e.face = -e.face;
            }
            if (e.ground && !igu && dy < -16 && Math.abs(dx) < 90 && Math.random() < 0.012 + 0.002 * round) { e.vy = -4.7; e.ground = false; }
            if (e.ground && !igu && dy > 16 && row !== FLOOR && Math.abs(dx) < 60 && Math.random() < 0.01) { e.ign = row; e.ground = false; e.vy = 0.5; }
            if (e.ground) checkGround(e);
          } else {
            e.x = wrap(e.x + e.face * v * 0.9);
            fall(e, igu ? 0.2 : 0.21, 4.5);
          }
          // collisions
          if (mode === 'play') {
            const hx = igu ? 10 : 8;
            if (invuln <= 0 && Math.abs(wd(e.x - fl.x)) < hx && Math.abs(e.y - fl.y) < 10) { killFlicky(); return; }
            for (let i = 0; i < chain.length; i++) {
              const p = chainPos(i);
              if (Math.abs(wd(e.x - p.x)) < hx - 1 && Math.abs(e.y - p.y) < 8) { scatterFrom(i); break; }
            }
          }
        }
      }
      function updateThrown() {
        for (let i = thrown.length - 1; i >= 0; i--) {
          const t = thrown[i];
          t.x = wrap(t.x + t.vx); t.vy += 0.05; t.y += t.vy; t.t++;
          let gone = t.t > 60 || t.y > rowY(FLOOR);
          for (const e of cats) {
            if (e.state === 'hatch' || e.state === 'stun') continue;
            if (Math.abs(wd(e.x - t.x)) < 9 && Math.abs(e.y - 5 - t.y) < 9) {
              e.state = 'stun'; e.t = 160; e.vx = Math.sign(t.vx) * 2.4; e.vy = -3.2; e.ground = false;
              const pts = 200 * Math.pow(2, Math.min(4, t.combo)); t.combo++;
              addScore(pts); pop(e.x, e.y - 14, pts, '#7ff'); sfx.hit();
            }
          }
          if (gone) thrown.splice(i, 1);
        }
      }

      // ---------- bonus round: catch the chirps flung from the seesaws ----------
      function startBonus() {
        mode = 'bonus'; modeT = 0;
        bonus = { x: 128, vx: 0, face: 1, flung: 0, caught: 0, birds: [], next: 90, done: false };
        audio.melody([[784, .1], [988, .1], [1175, .1], [1568, .25]], { type: 'square', vol: 0.12 });
      }
      function updateBonus() {
        const b = bonus;
        const L = api.key('ArrowLeft'), Rt = api.key('ArrowRight');
        if (L && !Rt) { b.vx -= 0.25; b.face = -1; } else if (Rt && !L) { b.vx += 0.25; b.face = 1; } else b.vx *= 0.82;
        b.vx = clamp(b.vx, -2.6, 2.6); b.x = clamp(b.x + b.vx, 14, W - 14);
        if (b.flung < 20 && --b.next <= 0) {
          const side = b.flung & 1, x0 = side ? W - 26 : 26;
          const tx = 40 + Math.random() * (W - 80);
          const vy = -(4.2 + Math.random() * 1.6), g = 0.09;
          const tFlight = (-vy + Math.sqrt(vy * vy + 2 * g * 10)) / g;
          b.birds.push({ x: x0, y: 196, vx: (tx - x0) / tFlight, vy, g, alive: true });
          b.flung++; b.next = Math.max(28, 70 - round * 2);
          audio.tone(300, 0.12, { type: 'square', vol: 0.08, slideTo: 900 });
        }
        for (const c of b.birds) {
          if (!c.alive) continue;
          c.x += c.vx; c.vy += c.g; c.y += c.vy;
          if (c.vy > 0 && Math.abs(c.x - (b.x + b.face * 4)) < 11 && Math.abs(c.y - 178) < 8) {
            c.alive = false; b.caught++; addScore(500); pop(c.x, 160, 500, '#ffe030'); sfx.pick();
          } else if (c.y > 206) { c.alive = false; audio.tone(200, 0.08, { type: 'square', vol: 0.06 }); }
        }
        if (b.flung >= 20 && b.birds.every(c => !c.alive) && !b.done) {
          b.done = true; b.doneT = 0;
          if (b.caught === 20) { addScore(10000); pop(W / 2, 120, 'PERFECT 10000', '#ffe030'); }
          sfx.clear();
        }
        if (b.done && ++b.doneT > 180) { round++; startRound(); }
      }

      // ---------- main update ----------
      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].y -= 0.3; if (--pops[i].f <= 0) pops.splice(i, 1); }
        if (mode === 'title') {
          if (modeT % 480 === 0) titlePage = (titlePage + 1) % 3;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { coinFlash = 0; startGame(); }
            else { coinFlash = 90; audio.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (mode === 'over') { if (modeT > 360 || (modeT > 90 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; modeT = 0; titlePage = 0; } return; }
        if (mode === 'ready') { if (modeT > 120) { mode = 'play'; modeT = 0; bgmT = 0; } updateChirps(); return; }
        if (mode === 'bonus') { updateBonus(); return; }
        if (mode === 'clear') {
          if (modeT > 60 && bonusTally > 0 && modeT % 2 === 0) { const d = Math.min(bonusTally, 1000); bonusTally -= d; addScore(d); audio.tone(1500, 0.03, { vol: 0.06 }); }
          if (modeT > 240 && bonusTally <= 0) {
            if (round % 4 === 3) startBonus(); else { round++; startRound(); }
          }
          return;
        }
        if (mode === 'die') {
          fl.dieT++;
          updateChirps();
          if (modeT === 150) {
            if (lives > 0) { lives--; respawn(); }
            else {
              const end = () => gameOver();
              if (api.offerContinue) api.offerContinue(() => { lives = 2; respawn(); }, end); else end();
            }
          }
          return;
        }
        if (mode === 'play') {
          roundT++; if (invuln > 0) invuln--;
          if (--bgmT <= 0) {
            const len = audio.melody(BGM, { type: 'square', vol: 0.045 });
            audio.melody(BASS, { type: 'triangle', vol: 0.08 });
            bgmT = Math.round(len * 60) + 20;
          }
          updateFlicky();
          if (mode !== 'play') return;
          updateChirps(); updateThrown(); updateEnemies();
        }
      }
      function respawn() {
        placeFlicky();
        for (const e of cats) { e.state = 'hatch'; e.t = 80 + Math.floor(Math.random() * 200); }
        mode = 'ready'; modeT = 40;
      }

      // ---------- rendering ----------
      function sx(x) { return Math.round(wd(x - fl.x) + 128); }
      function drawSpr(ctx, spr, x, y, face) {
        const im = face < 0 ? spr.l : spr.r;
        ctx.drawImage(im, Math.round(x - spr.w / 2), Math.round(y - spr.h));
      }
      function drawRoom(ctx) {
        const th = THEMES[(round - 1) % THEMES.length];
        const cam = fl.x - 128;
        ctx.fillStyle = th.wall; ctx.fillRect(0, TOP, W, H - TOP);
        ctx.fillStyle = th.stripe;
        const off = ((cam % 16) + 16) % 16;
        for (let x = -off; x < W; x += 16) ctx.fillRect(Math.round(x), TOP, 6, H - TOP);
        // windows with curtains
        for (let k = 0; k < 4; k++) {
          const wx = sx(k * 128 + 64), wy = TOP + 18 + (k & 1) * 80;
          if (wx < -40 || wx > W + 40) continue;
          ctx.fillStyle = '#d8d8f0'; ctx.fillRect(wx - 18, wy - 2, 36, 32);
          ctx.fillStyle = (round % 3 === 0) ? '#101848' : '#78c8ff'; ctx.fillRect(wx - 16, wy, 32, 28);
          ctx.fillStyle = '#d8d8f0'; ctx.fillRect(wx - 1, wy, 2, 28); ctx.fillRect(wx - 16, wy + 13, 32, 2);
          ctx.fillStyle = '#e04060'; ctx.fillRect(wx - 20, wy - 4, 8, 34); ctx.fillRect(wx + 12, wy - 4, 8, 34);
          ctx.fillStyle = '#ff7090'; ctx.fillRect(wx - 20, wy - 4, 2, 34); ctx.fillRect(wx + 12, wy - 4, 2, 34);
        }
        // platforms
        const c0 = Math.floor(cam / 8);
        const px0 = -(((cam % 8) + 8) % 8);
        for (const row of LAND) {
          const y = rowY(row);
          for (let i = 0; i <= 33; i++) {
            const col = ((c0 + i) % COLS + COLS) % COLS;
            if (!plat[row][col]) continue;
            const x = Math.round(px0 + i * 8);
            ctx.fillStyle = th.brick; ctx.fillRect(x, y, 8, 8);
            ctx.fillStyle = th.hi; ctx.fillRect(x, y, 8, 1);
            ctx.fillStyle = th.brickD; ctx.fillRect(x, y + 4, 8, 1); ctx.fillRect(x + ((col & 1) ? 2 : 6), y + 1, 1, 3); ctx.fillRect(x + ((col & 1) ? 6 : 2), y + 5, 1, 3); ctx.fillRect(x, y + 7, 8, 1);
          }
        }
        // hatches
        for (const h of hatches) {
          const x = sx(h.x); if (x < -20 || x > W + 20) continue;
          ctx.fillStyle = '#3a2410'; ctx.fillRect(x - 9, h.y - 14, 18, 14);
          ctx.fillStyle = '#b07838'; ctx.fillRect(x - 10, h.y - 16, 20, 3); ctx.fillRect(x - 10, h.y - 14, 2, 14); ctx.fillRect(x + 8, h.y - 14, 2, 14);
          ctx.fillStyle = '#ffe030'; ctx.fillRect(x - 4, h.y - 9, 2, 2); ctx.fillRect(x + 2, h.y - 9, 2, 2);
        }
        // exit door
        const dx = sx(door.x);
        if (dx > -30 && dx < W + 30) {
          ctx.fillStyle = '#c02818'; ctx.fillRect(dx - 11, door.y - 30, 22, 30);
          ctx.fillStyle = '#601008'; ctx.fillRect(dx - 8, door.y - 26, 16, 26);
          ctx.fillStyle = '#ffd000'; ctx.fillRect(dx + 4, door.y - 13, 2, 2);
          ctx.fillStyle = '#000'; ctx.fillRect(dx - 13, door.y - 42, 26, 10);
          text(ctx, 'EXIT', dx, door.y - 41, (api.frame >> 3) & 1 ? '#ffe030' : '#ff4040', 1, 'center');
        }
      }
      function drawEntities(ctx) {
        for (const it of items) { const x = sx(it.x); if (x > -10 && x < W + 10) drawSpr(ctx, ITEMS[it.kind], x, it.y, 1); }
        for (const c of chirps) {
          if (c.state === 'home' || c.state === 'chain') continue;
          const x = sx(c.x); if (x < -10 || x > W + 10) continue;
          drawSpr(ctx, CHIRP[(api.frame >> 3) & 1], x, c.y, c.face);
        }
        for (let i = chain.length - 1; i >= 0; i--) {
          const p = chainPos(i), x = sx(p.x);
          const hop = ((api.frame + i * 5) >> 2) & 1;
          drawSpr(ctx, CHIRP[hop], x, p.y - hop, fl.face);
        }
        for (const e of cats) {
          if (e.state === 'hatch') {
            if (e.t < 40 && (e.t & 4)) { const h = hatches[e.h], x = sx(h.x); ctx.fillStyle = '#ff8418'; ctx.fillRect(x - 5, h.y - 12, 3, 3); ctx.fillRect(x + 2, h.y - 12, 3, 3); }
            continue;
          }
          const x = sx(e.x); if (x < -20 || x > W + 20) continue;
          if (e.state === 'stun') { drawSpr(ctx, CATSTUN, x, e.y, (api.frame >> 2) & 1 ? 1 : -1); continue; }
          if (e.kind === 'iguana') drawSpr(ctx, IGUANA[(api.frame >> 4) & 1], x, e.y, e.face);
          else drawSpr(ctx, CAT[e.ground ? (api.frame >> 3) & 1 : 1], x, e.y, e.face);
        }
        for (const t of thrown) drawSpr(ctx, ITEMS[t.kind], sx(t.x), t.y + 3, (t.t >> 2) & 1 ? 1 : -1);
        // Flicky
        if (mode === 'die') {
          const fr = (fl.dieT >> 3) % 4;
          const face = fr < 2 ? 1 : -1;
          const y = fl.y - Math.max(0, 30 - Math.abs(fl.dieT - 30)) * 0.6;
          drawSpr(ctx, FLICKY[2], 128, y, face);
          if (fl.dieT > 40) for (let k = 0; k < 3; k++) { const a = fl.dieT * 0.15 + k * 2.1; ctx.fillStyle = '#ffe030'; ctx.fillRect(128 + Math.cos(a) * 9, y - 16 + Math.sin(a) * 3, 2, 2); }
        } else if (!(invuln > 0 && (invuln & 4) && mode === 'play')) {
          const fr = fl.ground ? (Math.abs(fl.vx) > 0.2 ? Math.floor(fl.anim) & 1 : 0) : 2;
          drawSpr(ctx, FLICKY[fr], 128, fl.y, fl.face);
          if (fl.item >= 0) drawSpr(ctx, ITEMS[fl.item], 128 + fl.face * 2, fl.y - 11, 1);
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        text(ctx, '1UP', 4, 1, '#ff4040'); text(ctx, String(score).padStart(6, '0'), 4, 8, '#fff');
        text(ctx, 'HI', 80, 1, '#ff4040'); text(ctx, String(hi).padStart(6, '0'), 80, 8, '#fff');
        text(ctx, 'ROUND', 152, 1, '#40a0ff'); text(ctx, String(round), 152, 8, '#fff');
        for (let i = 0; i < Math.min(5, lives); i++) ctx.drawImage(FLICKY[0].r, 0, 0, 12, 12, 196 + i * 11, 2, 10, 10);
        if (mode === 'play' || mode === 'die' || mode === 'ready') {
          const left = chirps.filter(c => c.state !== 'home').length;
          ctx.drawImage(CHIRP[0].r, 247 - 18, 7);
          text(ctx, String(left), W - 2, 8, '#ffe030', 1, 'right');
        }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = '#081860'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#0c2480'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, 0, 6, H);
        const cols = ['#ff4040', '#ff9a10', '#ffe030', '#3cd040', '#40a0ff', '#ff60c0'];
        const word = 'FLICKY';
        for (let i = 0; i < 6; i++) {
          const yb = Math.round(Math.sin(api.time * 4 + i * 0.7) * 3);
          textS(ctx, word[i], 50 + i * 28, 26 + yb, cols[i], 4);
        }
        if (titlePage === 0) {
          // Flicky leading a chain of chirps across the screen
          const t = (modeT * 1.2) % (W + 160) - 40;
          drawSpr(ctx, FLICKY[(modeT >> 3) & 1], t, 100, 1);
          for (let i = 0; i < 6; i++) drawSpr(ctx, CHIRP[((modeT >> 3) + i) & 1], t - 14 - i * 11, 100 - (((modeT >> 2) + i) & 1), 1);
          drawSpr(ctx, CAT[(modeT >> 3) & 1], t - 110, 100, 1);
          text(ctx, 'LEAD THE CHIRPS TO THE EXIT!', W / 2, 114, '#fff', 1, 'center');
        } else if (titlePage === 1) {
          text(ctx, '- SCORE TABLE -', W / 2, 70, '#ffe030', 1, 'center');
          drawSpr(ctx, CHIRP[0], 60, 92, 1); text(ctx, 'CHIRPS  100 200 300 ...', 74, 85, '#fff');
          drawSpr(ctx, CAT[0], 60, 108, 1); text(ctx, 'NYANNYAN  200 400 800', 74, 101, '#fff');
          drawSpr(ctx, IGUANA[0], 60, 122, 1); text(ctx, 'CHORO     200 400 800', 74, 116, '#fff');
          drawSpr(ctx, ITEMS[0], 60, 136, 1); text(ctx, 'THROW ITEMS AT THEM!', 74, 130, '#7ff');
        } else {
          text(ctx, '- TIME BONUS -', W / 2, 70, '#ffe030', 1, 'center');
          const tb = [['00-19 SEC', 50000], ['20-29 SEC', 30000], ['30-39 SEC', 20000], ['40-49 SEC', 10000], ['50-59 SEC', 5000]];
          tb.forEach((r, i) => { text(ctx, r[0], 60, 84 + i * 11, '#fff'); text(ctx, String(r[1]), 196, 84 + i * 11, '#7ff', 1, 'right'); });
        }
        text(ctx, 'HI SCORE ' + hi, W / 2, 150, '#ff4040', 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 166, '#ff5040', 1, 'center'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) textS(ctx, 'INSERT COIN', W / 2, 166, '#fff', 1, 'center'); }
        else textS(ctx, 'PUSH START BUTTON', W / 2, 166, (api.frame >> 5) & 1 ? '#fff' : '#ffe030', 1, 'center');
        text(ctx, '1ST BONUS 30000  NEXT EVERY 100000', W / 2, 182, '#40a0ff', 1, 'center');
        text(ctx, '\u00a9 1984 SEGA', W / 2, 198, '#fff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#aaa');
      }
      function renderBonus(ctx) {
        const b = bonus;
        ctx.fillStyle = '#103070'; ctx.fillRect(0, TOP, W, H - TOP);
        ctx.fillStyle = '#ffe8a0'; for (let i = 0; i < 30; i++) ctx.fillRect((i * 71) % W, TOP + (i * 37) % 120, 1, 1);
        ctx.fillStyle = '#e07820'; ctx.fillRect(0, 200, W, 24); ctx.fillStyle = '#ffc070'; ctx.fillRect(0, 200, W, 1);
        // seesaws
        for (const x0 of [26, W - 26]) {
          ctx.fillStyle = '#a05010'; ctx.fillRect(x0 - 3, 192, 6, 8);
          const tilt = (api.frame >> 4) & 1 ? 2 : -2;
          ctx.fillStyle = '#ffc070'; for (let i = -12; i <= 12; i += 2) ctx.fillRect(x0 + i, 191 + Math.round(i / 12 * tilt), 2, 2);
        }
        for (const c of b.birds) if (c.alive) drawSpr(ctx, CHIRP[(api.frame >> 3) & 1], c.x, c.y + 3, c.vx > 0 ? 1 : -1);
        // Flicky with net
        drawSpr(ctx, FLICKY[Math.abs(b.vx) > 0.3 ? (api.frame >> 3) & 1 : 0], b.x, 200, b.face);
        const nx = b.x + b.face * 4;
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(Math.round(b.x + b.face * 2), 182, 1, 12);
        ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(nx - 9), 176, 18, 1); ctx.fillRect(Math.round(nx - 9), 176, 1, 6); ctx.fillRect(Math.round(nx + 8), 176, 1, 6); ctx.fillRect(Math.round(nx - 8), 182, 16, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let i = -7; i < 8; i += 3) ctx.fillRect(Math.round(nx + i), 177, 1, 5);
        textS(ctx, 'BONUS STAGE', W / 2, 24, '#ffe030', 2, 'center');
        text(ctx, 'CATCH ' + b.caught + ' / 20', W / 2, 44, '#fff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        if (mode === 'bonus') renderBonus(ctx);
        else if (mode === 'over' && !fl) { /* nothing */ }
        else { drawRoom(ctx); drawEntities(ctx); }
        for (const p of pops) {
          const x = mode === 'bonus' ? p.x : sx(p.x);
          textS(ctx, p.t, x, Math.round(p.y), p.col, 1, 'center');
        }
        drawHUD(ctx);
        if (mode === 'ready' && modeT < 110) {
          textS(ctx, 'ROUND ' + round, W / 2, 80, '#ffe030', 2, 'center');
          if (modeT < 60 || (modeT & 8)) textS(ctx, 'READY!', W / 2, 100, '#fff', 1, 'center');
        }
        if (mode === 'clear') {
          ctx.fillStyle = 'rgba(0,0,40,0.7)'; ctx.fillRect(36, 70, 184, 64);
          textS(ctx, 'ROUND CLEAR!', W / 2, 78, '#ffe030', 2, 'center');
          text(ctx, 'TIME ' + clearInfo.secs + ' SEC', W / 2, 100, '#fff', 1, 'center');
          text(ctx, 'BONUS ' + clearInfo.bonus, W / 2, 114, clearInfo.bonus ? '#7ff' : '#888', 1, 'center');
        }
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,40,0.7)'; ctx.fillRect(48, 84, 160, 44);
          textS(ctx, 'GAME OVER', W / 2, 92, '#ff4040', 2, 'center');
          text(ctx, 'SCORE ' + score, W / 2, 114, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { api.setHiScore(hi); } };
    }
  });
})();
