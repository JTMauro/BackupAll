// Xybots (Atari Games, 1987) \u2014 from-scratch recreation: third-person maze shooter with shop between levels.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 10, 31, 10], '$': [4, 15, 20, 14, 5, 30, 4]
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
  // text with a 1px dark drop shadow
  function stext(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function flipH(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');

  // ======================= XYBOTS =======================
  const W = 336, H = 240, VH = 168, NC = 168, CW = 2, HOR = 72, EYE = 0.6, K = VH * 0.9;
  const TAU = Math.PI * 2;

  // ---------- sprites ----------
  const PAL = {
    k: '#000', w: '#fff', g: '#9aa4b8', G: '#5a6478', d: '#30384a', b: '#3a7cff', B: '#1c3c9a', o: '#ff9a20', O: '#b85a00',
    r: '#ff3030', R: '#901010', y: '#ffe040', Y: '#c09000', c: '#40f0ff', C: '#108090', s: '#f0c090', p: '#c050ff', P: '#602080',
    l: '#60ff60', L: '#108020', m: '#ff60c0'
  };
  const WHITE = {}; for (const k in PAL) WHITE[k] = '#ffffff';
  const ART = {
    hero: [[
      '.......oooooo.......',
      '......oOOOOOOo......',
      '......oOccccOo......',
      '......oOOOOOOo......',
      '.......oooooo.......',
      '...bbbbbBBBBbbbbb...',
      '..bbBBbbbbbbbbBBbb..',
      '..bBggbbbbbbbbggBb..',
      '.bbBggbbBBBBbbggBbb.',
      '.bBBbbbbBooBbbbbBBb.',
      'gbB.bbbbBooBbbbb.Bbg',
      'gGB.bbbbbbbbbbbb.BGg',
      'gG..BbbbbbbbbbbB..Gg',
      'gG..BBbbbbbbbbBB..Gg',
      'oo...ooooooooooo..oo',
      'ss...OOOOOOOOOOO..ss',
      '.....bbbbb.bbbbb....',
      '.....bbBbb.bbBbb....',
      '.....bbBbb.bbBbb....',
      '.....bbBb...bBbb....',
      '.....bbbb...bbbb....',
      '.....gggg...gggg....',
      '.....GGGG...GGGG....',
      '....ddddd...ddddd...'
    ], [
      '.......oooooo.......',
      '......oOOOOOOo......',
      '......oOccccOo......',
      '......oOOOOOOo......',
      '.......oooooo.......',
      '...bbbbbBBBBbbbbb...',
      '..bbBBbbbbbbbbBBbb..',
      '..bBggbbbbbbbbggBb..',
      '.bbBggbbBBBBbbggBbb.',
      '.bBBbbbbBooBbbbbBBb.',
      'gbB.bbbbBooBbbbb.Bbg',
      'gGB.bbbbbbbbbbbb.BGg',
      'gG..BbbbbbbbbbbB..Gg',
      'gG..BBbbbbbbbbBB..Gg',
      'oo...ooooooooooo..oo',
      'ss...OOOOOOOOOOO..ss',
      '.....bbbbb.bbbbb....',
      '.....bbBbb..bBbb....',
      '......bBbb..bBbb....',
      '......bbb...bbbb....',
      '......ggg...bbbb....',
      '......GGG...gggg....',
      '.....dddd...GGGG....',
      '...........ddddd....'
    ]],
    walker: [[
      '.....rrrrrr.....',
      '....rRRRRRRr....',
      '....rRyyyyRr....',
      '....rRRRRRRr....',
      '.....rrrrrr.....',
      '......gggg......',
      '..ggggGGGGgggg..',
      '.gGGGgggggggGGg.',
      'gGdgGgrRRrgGgdGg',
      'gGdgGgRyyRgGgdGg',
      'gGdgGgrRRrgGgdGg',
      'gGd.GggggggG.dGg',
      'rR..GGGGGGGG..Rr',
      'rR...gggggg...Rr',
      '.....gG..Gg.....',
      '.....gG..Gg.....',
      '.....gG..Gg.....',
      '....ggG..Ggg....',
      '....dddd.dddd...',
      '...ddddd.ddddd..'
    ], [
      '.....rrrrrr.....',
      '....rRRRRRRr....',
      '....rRyyyyRr....',
      '....rRRRRRRr....',
      '.....rrrrrr.....',
      '......gggg......',
      '..ggggGGGGgggg..',
      '.gGGGgggggggGGg.',
      'gGdgGgrRRrgGgdGg',
      'gGdgGgRyyRgGgdGg',
      'gGdgGgrRRrgGgdGg',
      'gGd.GggggggG.dGg',
      'rR..GGGGGGGG..Rr',
      'rR...gggggg...Rr',
      '.....gG...Gg....',
      '....gG....Gg....',
      '....gG.....Gg...',
      '...ggG.....Ggg..',
      '...dddd...dddd..',
      '..ddddd...ddddd.'
    ]],
    roller: [[
      '....cccccccc....',
      '..ccCCCCCCCCcc..',
      '.cCCwwCCCCCCCCc.',
      'cCCwwCCyyyyCCCCc',
      'cCCCCCyrrrryCCCc',
      'cCCCCCyrRRryCCCc',
      'cCCCCCyrrrryCCCc',
      '.cCCCCCyyyyCCCc.',
      '..ddddddddddddd.',
      '.dGgGgGgGgGgGgd.',
      'dGgGgGgGgGgGgGgd',
      '.ddddddddddddd..'
    ], [
      '....cccccccc....',
      '..ccCCCCCCCCcc..',
      '.cCCwwCCCCCCCCc.',
      'cCCwwCCyyyyCCCCc',
      'cCCCCCyrrrryCCCc',
      'cCCCCCyrRRryCCCc',
      'cCCCCCyrrrryCCCc',
      '.cCCCCCyyyyCCCc.',
      '..ddddddddddddd.',
      '.dgGgGgGgGgGgGd.',
      'dgGgGgGgGgGgGgGd',
      '.ddddddddddddd..'
    ]],
    heavy: [[
      '........pppppppp........',
      '......ppPPPPPPPPpp......',
      '.....pPPyyyyyyyyPPp.....',
      '.....pPPyrrrrrryPPp.....',
      '.....pPPyyyyyyyyPPp.....',
      '......ppPPPPPPPPpp......',
      '...gggggggggggggggggg...',
      '..gGGGGGGGGGGGGGGGGGGg..',
      '.gGddgggpppppppgggddGg..',
      'gGGddgggpPPPPPpgggddGGg.',
      'gGGddgggpPmmmPpgggddGGg.',
      'gGGddgggpPPPPPpgggddGGg.',
      'gGGddgggpppppppgggddGGg.',
      'rRR.gGGGGGGGGGGGGGGg.RRr',
      'rRR.gggggggggggggggg.RRr',
      'rRR..GGGGGGGGGGGGGG..RRr',
      'yyy...gggg....gggg...yyy',
      '......gGGg....gGGg......',
      '......gGGg....gGGg......',
      '......gGGg....gGGg......',
      '.....ggGGgg..ggGGgg.....',
      '....ddddddd..ddddddd....',
      '...dddddddd..dddddddd...'
    ]],
    master: [[
      '..........yyyyyyyyyyyy..........',
      '........yyYYYYYYYYYYYYyy........',
      '.......yYYrrrrrrrrrrrrYYy.......',
      '......yYYrRRRRRRRRRRRRrYYy......',
      '......yYYrRwwRRRRRRwwRrYYy......',
      '......yYYrRwwRRRRRRwwRrYYy......',
      '......yYYrRRRRRRRRRRRRrYYy......',
      '.......yYYrrrrrrrrrrrrYYy.......',
      '........yyYYYYYYYYYYYYyy........',
      '...gggggggggggggggggggggggggg...',
      '..gGGGGGGGGGGGGGGGGGGGGGGGGGGg..',
      '.gGGddggggggggyyyyggggggggddGGg.',
      'gGGGddgggggggyrrrrygggggggddGGGg',
      'gGGGddgggggggyrmmrygggggggddGGGg',
      'gGGGddgggggggyrrrrygggggggddGGGg',
      'gGGGddggggggggyyyyggggggggddGGGg',
      'rRRR.gGGGGGGGGGGGGGGGGGGGGg.RRRr',
      'rRRR.gggggggggggggggggggggg.RRRr',
      'rRRR..GGGGGGGGGGGGGGGGGGGG..RRRr',
      'yyyy...gggggg......gggggg...yyyy',
      'yyyy...gGGGGg......gGGGGg...yyyy',
      '.......gGGGGg......gGGGGg.......',
      '.......gGGGGg......gGGGGg.......',
      '.......gGGGGg......gGGGGg.......',
      '......ggGGGGgg....ggGGGGgg......',
      '.....dddddddddd..dddddddddd.....',
      '....ddddddddddd..ddddddddddd....'
    ]],
    coin: [[
      '..yyyy..',
      '.yYYYYy.',
      'yYyyyyYy',
      'yYyYYyYy',
      'yYyYYyYy',
      'yYyyyyYy',
      '.yYYYYy.',
      '..yyyy..'
    ]],
    cell: [[
      '..gggg..',
      '.gGGGGg.',
      '.lLLLLl.',
      '.llllll.',
      '.lLwwLl.',
      '.lLwwLl.',
      '.lLLLLl.',
      '.llllll.',
      '.lLLLLl.',
      '.gGGGGg.',
      '..gggg..'
    ]],
    key: [[
      '.yyy......',
      'yY.Yyyyyyy',
      'yY.YyYYyYy',
      '.yyy...y.y'
    ]]
  };
  const SPR = {}, SPRW = {};
  for (const k in ART) { SPR[k] = ART[k].map(f => spr(f, PAL)); SPRW[k] = ART[k].map(f => spr(f, WHITE)); }

  // wall colour tables: type -> side -> shade index
  const WALLRGB = [[70, 110, 190], [70, 110, 190], [80, 100, 170], [60, 150, 110], [170, 70, 80], [230, 150, 30]];
  const NSH = 24;
  const WCOL = WALLRGB.map(c => [0, 1].map(side => {
    const a = [];
    for (let i = 0; i < NSH; i++) {
      const f = (1 - i / NSH) * (side ? 0.72 : 1);
      a.push('rgb(' + (c[0] * f | 0) + ',' + (c[1] * f | 0) + ',' + (c[2] * f | 0) + ')');
    }
    return a;
  }));

  // ---------- maze generation ----------
  function makeMaze(n, level) {
    const mw = n * 2 + 1, mh = n * 2 + 1;
    const m = new Uint8Array(mw * mh).fill(1);
    const vis = new Uint8Array(n * n);
    const stack = [[0, 0]]; vis[0] = 1; m[1 * mw + 1] = 0;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && !vis[ny * n + nx]) nb.push([nx, ny, dx, dy]);
      }
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = pick(nb);
      vis[ny * n + nx] = 1;
      m[(cy * 2 + 1 + dy) * mw + cx * 2 + 1 + dx] = 0;
      m[(ny * 2 + 1) * mw + nx * 2 + 1] = 0;
      stack.push([nx, ny]);
    }
    // extra loops; some become locked doors
    const loops = Math.floor(n * 1.5);
    let doors = 0;
    for (let i = 0; i < loops * 4 && i < 400; i++) {
      const x = irand(1, mw - 2), y = irand(1, mh - 2);
      if (m[y * mw + x] !== 1) continue;
      const horiz = m[y * mw + x - 1] === 0 && m[y * mw + x + 1] === 0 && m[(y - 1) * mw + x] === 1 && m[(y + 1) * mw + x] === 1;
      const vert = m[(y - 1) * mw + x] === 0 && m[(y + 1) * mw + x] === 0 && m[y * mw + x - 1] === 1 && m[y * mw + x + 1] === 1;
      if (!horiz && !vert) continue;
      if (doors < 2 + (level >> 1) && Math.random() < 0.4) { m[y * mw + x] = 2; doors++; } else m[y * mw + x] = 0;
    }
    // wall variety
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (m[y * mw + x] === 1) {
      const h = (x * 7 + y * 13 + level * 3) % 11;
      m[y * mw + x] = h === 0 ? 3 : h === 5 ? 4 : 1;
    }
    return { m, mw, mh, doors };
  }
  function bfs(map, sx, sy) {
    const { m, mw, mh } = map;
    const d = new Int16Array(mw * mh).fill(-1);
    const q = [sy * mw + sx]; d[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % mw, y = (i / mw) | 0;
      for (const j of [i - 1, i + 1, i - mw, i + mw]) {
        if (j < 0 || j >= mw * mh) continue;
        if (d[j] >= 0 || m[j] !== 0) continue;
        d[j] = d[i] + 1; q.push(j);
      }
    }
    return d;
  }

  ArcadeRegistry.register({
    id: 'xybots', title: 'Xybots', year: 1987, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up/Down: walk \u00b7 Left/Right: strafe \u00b7 Space: fire \u00b7 X: turn right \u00b7 Z: turn left \u00b7 Enter: start',
    marquee: { bg: '#0a0a24', fg: '#ff9a20', accent: '#40f0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', modeT = 0, coinFlash = 0, frame = 0;
      const zbuf = new Float32Array(NC);
      let G = null;          // current game
      let demo = null;       // attract-mode world

      const snd = {
        fire() { au.tone(1400, 0.08, { type: 'square', vol: 0.09, slideTo: 500 }); },
        hit() { au.noise(0.06, { vol: 0.12, freq: 3000 }); },
        boom() { au.noise(0.35, { vol: 0.22, freq: 1500, slideTo: 100 }); au.tone(120, 0.3, { type: 'sawtooth', vol: 0.1, slideTo: 40 }); },
        coin() { au.tone(1320, 0.05, { type: 'square', vol: 0.1 }); au.tone(1760, 0.08, { type: 'square', vol: 0.1, delay: 0.05 }); },
        cell() { au.melody([[523, .05], [659, .05], [784, .05], [1047, .1]], { type: 'triangle', vol: 0.15 }); },
        key() { au.melody([[880, .05], [1175, .1]], { type: 'square', vol: 0.1 }); },
        door() { au.noise(0.25, { vol: 0.12, freq: 800, slideTo: 200 }); au.tone(220, 0.2, { type: 'square', vol: 0.08, slideTo: 440 }); },
        ouch() { au.tone(180, 0.12, { type: 'sawtooth', vol: 0.15, slideTo: 90 }); },
        efire() { au.tone(600, 0.1, { type: 'sawtooth', vol: 0.06, slideTo: 200 }); },
        exit() { au.melody([[392, .08], [523, .08], [659, .08], [784, .08], [1047, .25]], { type: 'square', vol: 0.12 }); },
        turn() { au.tone(300, 0.04, { type: 'triangle', vol: 0.06 }); },
        low() { au.tone(440, 0.08, { type: 'square', vol: 0.1 }); au.tone(330, 0.08, { type: 'square', vol: 0.1, delay: 0.1 }); }
      };

      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.14 });
        return false;
      }

      // ---------- world helpers ----------
      function tile(map, x, y) {
        if (x < 0 || y < 0 || x >= map.mw || y >= map.mh) return 1;
        return map.m[y * map.mw + x];
      }
      function solid(map, x, y) { return tile(map, Math.floor(x), Math.floor(y)) !== 0; }
      function los(map, x0, y0, x1, y1) {
        const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 0.2);
        for (let i = 1; i < n; i++) if (solid(map, x0 + dx * i / n, y0 + dy * i / n)) return false;
        return true;
      }

      function newGame() {
        G = { score: 0, level: 0, energy: 100, coins: 0, keys: 0, power: 1, speedLv: 0, shield: 0, maxShots: 2,
          dead: 0, overT: 0, msg: '', msgT: 0, extraAt: 50000, lowWarn: 0 };
        startLevel(1);
      }
      function startLevel(n) {
        G.level = n;
        const size = Math.min(12, 5 + n);
        const map = makeMaze(size, n);
        G.map = map;
        G.px = 1.5; G.py = 1.5;
        G.ang = map.m[1 * map.mw + 2] === 0 ? 0 : Math.PI / 2; G.tang = G.ang;
        G.turnLeft = 0;
        G.shots = []; G.eshots = []; G.enemies = []; G.items = []; G.booms = [];
        G.fireCool = 0; G.walkT = 0; G.hurt = 0;
        G.distT = 0;
        G.dist = bfs(map, 1, 1);
        // floor cells sorted by distance from start
        const cells = [];
        for (let y = 1; y < map.mh; y += 2) for (let x = 1; x < map.mw; x += 2) {
          const d = G.dist[y * map.mw + x];
          if (d >= 0) cells.push({ x, y, d });
        }
        cells.sort((a, b) => b.d - a.d);
        const ex = cells[0];
        G.exit = { x: ex.x + 0.5, y: ex.y + 0.5 };
        const free = cells.slice(1).filter(c => c.d > 4);
        for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = free[i]; free[i] = free[j]; free[j] = t; }
        let fi = 0;
        const take = () => free[(fi++) % free.length];
        const nEn = Math.min(26, 4 + n * 2);
        for (let i = 0; i < nEn; i++) {
          const c = take();
          const r = Math.random();
          const type = n >= 3 && r < 0.12 + n * 0.015 ? 'heavy' : r < 0.55 ? 'walker' : 'roller';
          spawnEnemy(type, c.x, c.y);
        }
        if (n % 5 === 0) spawnEnemy('master', ex.x, ex.y);
        const nCoins = 8 + n;
        for (let i = 0; i < nCoins; i++) { const c = take(); G.items.push({ kind: 'coin', x: c.x + 0.5, y: c.y + 0.5 }); }
        for (let i = 0; i < 3; i++) { const c = take(); G.items.push({ kind: 'cell', x: c.x + 0.5, y: c.y + 0.5 }); }
        for (let i = 0; i < map.doors; i++) { const c = take(); G.items.push({ kind: 'key', x: c.x + 0.5, y: c.y + 0.5 }); }
        G.phase = 'intro'; G.phaseT = 120;
        G.levelT = 0;
        au.melody([[262, .1], [330, .1], [392, .1], [523, .2], [392, .1], [523, .3]], { type: 'square', vol: 0.1 });
      }
      const ETYPES = {
        walker: { hp: 3, sp: 0.022, pts: 200, shoot: 110, dmg: 6, rad: 0.32, hgt: 0.62 },
        roller: { hp: 2, sp: 0.042, pts: 150, shoot: 0, dmg: 0, rad: 0.3, hgt: 0.34 },
        heavy: { hp: 8, sp: 0.016, pts: 500, shoot: 80, dmg: 9, rad: 0.38, hgt: 0.8 },
        master: { hp: 40, sp: 0.014, pts: 5000, shoot: 50, dmg: 8, rad: 0.45, hgt: 1.0 }
      };
      function spawnEnemy(type, cx, cy) {
        const t = ETYPES[type];
        G.enemies.push({ type, x: cx + 0.5, y: cy + 0.5, tx: cx, ty: cy, hp: t.hp, cool: 60 + irand(0, 120), flash: 0, anim: Math.random() * 10, last: -1 });
      }
      function addScore(n) {
        G.score += n;
        if (G.score >= G.extraAt) { G.extraAt += 50000; G.energy = Math.min(100, G.energy + 50); G.msg = 'BONUS ENERGY'; G.msgT = 120; snd.cell(); }
        if (G.score > hi) hi = G.score;
      }

      // ---------- player ----------
      function tryMove(nx, ny) {
        const r = 0.24, map = G.map;
        // X axis
        const tx = nx + (nx > G.px ? r : -r);
        const tA = tile(map, Math.floor(tx), Math.floor(G.py - r)), tB = tile(map, Math.floor(tx), Math.floor(G.py + r));
        if (tA === 0 && tB === 0) G.px = nx; else openDoor(Math.floor(tx), Math.floor(G.py));
        const ty = ny + (ny > G.py ? r : -r);
        const tC = tile(map, Math.floor(G.px - r), Math.floor(ty)), tD = tile(map, Math.floor(G.px + r), Math.floor(ty));
        if (tC === 0 && tD === 0) G.py = ny; else openDoor(Math.floor(G.px), Math.floor(ty));
      }
      function openDoor(x, y) {
        if (tile(G.map, x, y) !== 2) return;
        if (G.keys > 0) { G.keys--; G.map.m[y * G.map.mw + x] = 0; snd.door(); G.msg = 'DOOR OPENED'; G.msgT = 60; G.dist = bfs(G.map, Math.floor(G.px), Math.floor(G.py)); }
        else if (G.msgT <= 0) { G.msg = 'NEED A KEY'; G.msgT = 60; }
      }
      function updatePlayer() {
        // turning: 90 degree twists like the original's rotating stick
        if (Math.abs(G.tang - G.ang) < 0.001) {
          if (api.pressed('KeyX')) { G.tang = G.ang + Math.PI / 2; snd.turn(); }
          else if (api.pressed('KeyZ')) { G.tang = G.ang - Math.PI / 2; snd.turn(); }
        }
        if (G.tang !== G.ang) {
          const st = Math.PI / 2 / 9, d = G.tang - G.ang;
          if (Math.abs(d) <= st) G.ang = G.tang; else G.ang += Math.sign(d) * st;
        }
        const dx = Math.cos(G.ang), dy = Math.sin(G.ang);
        const sp = 0.05 + G.speedLv * 0.012;
        let mx = 0, my = 0;
        if (api.key('ArrowUp')) { mx += dx; my += dy; }
        if (api.key('ArrowDown')) { mx -= dx * 0.7; my -= dy * 0.7; }
        if (api.key('ArrowRight')) { mx += -dy * 0.8; my += dx * 0.8; }
        if (api.key('ArrowLeft')) { mx -= -dy * 0.8; my -= dx * 0.8; }
        if (mx || my) { tryMove(G.px + mx * sp, G.py + my * sp); G.walkT++; }
        // firing
        if (G.fireCool > 0) G.fireCool--;
        if (api.key('Space') && G.fireCool <= 0 && G.shots.length < G.maxShots + G.power) {
          G.shots.push({ x: G.px + dx * 0.3, y: G.py + dy * 0.3, vx: dx * 0.2, vy: dy * 0.2, life: 60 });
          G.fireCool = 9; snd.fire(); G.muzzle = 4;
        }
        if (G.muzzle > 0) G.muzzle--;
        // energy drains over time, like the original's ticking energy meter
        G.energy -= 0.009;
        if (G.energy < 25 && (frame % 60) === 0) snd.low();
        // pickups
        for (let i = G.items.length - 1; i >= 0; i--) {
          const it = G.items[i];
          if (Math.hypot(it.x - G.px, it.y - G.py) < 0.45) {
            G.items.splice(i, 1);
            if (it.kind === 'coin') { G.coins++; addScore(100); snd.coin(); }
            else if (it.kind === 'cell') { G.energy = Math.min(100, G.energy + 30); addScore(250); snd.cell(); G.msg = 'ENERGY +30'; G.msgT = 60; }
            else if (it.kind === 'key') { G.keys++; addScore(300); snd.key(); G.msg = 'GOT A KEY'; G.msgT = 60; }
          }
        }
        // exit pad
        if (Math.hypot(G.exit.x - G.px, G.exit.y - G.py) < 0.4) {
          if (G.enemies.some(e => e.type === 'master')) { if (G.msgT <= 0) { G.msg = 'DESTROY THE MASTER XYBOT'; G.msgT = 90; } }
          else levelClear();
        }
      }
      function levelClear() {
        G.phase = 'clear'; G.phaseT = 180;
        G.bonus = Math.floor(G.energy) * 20 + G.level * 1000;
        addScore(G.bonus);
        snd.exit();
      }
      function hurt(n) {
        if (G.phase !== 'play') return;
        G.energy -= G.shield > 0 ? n * 0.5 : n;
        G.hurt = 10; snd.ouch();
      }

      // ---------- enemies ----------
      function updateEnemies() {
        const map = G.map, mw = map.mw;
        if (--G.distT <= 0) { G.distT = 20; G.dist = bfs(map, Math.floor(G.px), Math.floor(G.py)); }
        const diff = 1 + Math.min(1.2, G.level * 0.07);
        for (const e of G.enemies) {
          const T = ETYPES[e.type];
          e.anim += 0.15; if (e.flash > 0) e.flash--;
          const gx = e.tx + 0.5, gy = e.ty + 0.5;
          const ddx = gx - e.x, ddy = gy - e.y, dl = Math.hypot(ddx, ddy);
          const sp = T.sp * diff;
          if (dl > sp) { e.x += ddx / dl * sp; e.y += ddy / dl * sp; }
          else {
            e.x = gx; e.y = gy;
            const here = e.ty * mw + e.tx;
            const dHere = G.dist[here];
            const opts = [];
            for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = e.tx + ox, ny = e.ty + oy;
              if (tile(map, nx, ny) !== 0) continue;
              opts.push({ nx, ny, d: G.dist[ny * mw + nx], back: ny * mw + nx === e.last });
            }
            let ch = null;
            if (dHere >= 0 && dHere < 14) {
              if (dHere >= 1) { for (const o of opts) if (o.d >= 0 && o.d < dHere && (!ch || o.d < ch.d)) ch = o; }
            } else if (opts.length) {
              const fwd = opts.filter(o => !o.back);
              ch = pick(fwd.length ? fwd : opts);
            }
            if (ch) { e.last = here; e.tx = ch.nx; e.ty = ch.ny; }
          }
          // contact
          const pd = Math.hypot(e.x - G.px, e.y - G.py);
          if (pd < T.rad + 0.25) {
            hurt(e.type === 'roller' ? 0.6 : 0.3);
            const ux = (G.px - e.x) / (pd || 1), uy = (G.py - e.y) / (pd || 1);
            tryMove(G.px + ux * 0.04, G.py + uy * 0.04);
          }
          // shooting
          if (T.shoot && --e.cool <= 0) {
            e.cool = Math.max(30, T.shoot / diff) + irand(0, 40);
            if (pd < 9 && los(map, e.x, e.y, G.px, G.py)) {
              const n = e.type === 'master' ? 3 : 1;
              for (let k = 0; k < n; k++) {
                const a = Math.atan2(G.py - e.y, G.px - e.x) + (k - (n - 1) / 2) * 0.25;
                G.eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 0.075, vy: Math.sin(a) * 0.075, dmg: T.dmg, life: 160 });
              }
              snd.efire();
            }
          }
        }
        // shots
        for (let i = G.shots.length - 1; i >= 0; i--) {
          const s = G.shots[i];
          s.x += s.vx; s.y += s.vy; s.life--;
          let gone = s.life <= 0 || solid(map, s.x, s.y);
          if (!gone) for (const e of G.enemies) {
            if (e.hp > 0 && Math.hypot(e.x - s.x, e.y - s.y) < ETYPES[e.type].rad + 0.08) {
              e.hp -= G.power; e.flash = 6; gone = true; snd.hit();
              if (e.hp <= 0) { addScore(ETYPES[e.type].pts); G.booms.push({ x: e.x, y: e.y, t: 0, big: e.type === 'master' || e.type === 'heavy' }); snd.boom();
                if (Math.random() < 0.3 || e.type !== 'roller') G.items.push({ kind: Math.random() < 0.8 ? 'coin' : 'cell', x: e.x, y: e.y }); }
              break;
            }
          }
          if (gone) { if (solid(map, s.x, s.y)) G.booms.push({ x: s.x - s.vx, y: s.y - s.vy, t: 8, small: true }); G.shots.splice(i, 1); }
        }
        G.enemies = G.enemies.filter(e => e.hp > 0);
        for (let i = G.eshots.length - 1; i >= 0; i--) {
          const s = G.eshots[i];
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.life <= 0 || solid(map, s.x, s.y)) { G.eshots.splice(i, 1); continue; }
          if (Math.hypot(s.x - G.px, s.y - G.py) < 0.3) { hurt(s.dmg); G.eshots.splice(i, 1); }
        }
        for (const b of G.booms) b.t++;
        G.booms = G.booms.filter(b => b.t < 30);
      }

      // ---------- shop ----------
      const SHOP = [
        { name: 'ENERGY +40', cost: 3, ok: () => G.energy < 100, buy: () => { G.energy = Math.min(100, G.energy + 40); } },
        { name: 'POWER SHOT', cost: 8, ok: () => G.power < 3, buy: () => { G.power++; } },
        { name: 'SHIELD', cost: 6, ok: () => G.shield < 1, buy: () => { G.shield = 1; } },
        { name: 'SPEED BOOTS', cost: 5, ok: () => G.speedLv < 2, buy: () => { G.speedLv++; } },
        { name: 'EXTRA SHOT', cost: 4, ok: () => G.maxShots < 4, buy: () => { G.maxShots++; } },
        { name: 'KEY', cost: 2, ok: () => G.keys < 9, buy: () => { G.keys++; } },
        { name: 'DONE', cost: 0, ok: () => true, buy: null }
      ];
      function updateShop() {
        G.shopT++;
        if (api.pressed('ArrowUp')) { G.shopSel = (G.shopSel + SHOP.length - 1) % SHOP.length; snd.turn(); }
        if (api.pressed('ArrowDown')) { G.shopSel = (G.shopSel + 1) % SHOP.length; snd.turn(); }
        const it = SHOP[G.shopSel];
        let leave = api.pressed('Enter') || G.shopT > 60 * 25;
        if (api.pressed('Space') && G.shopT > 20) {
          if (!it.buy) leave = true;
          else if (G.coins >= it.cost && it.ok()) { G.coins -= it.cost; it.buy(); snd.coin(); }
          else au.tone(110, 0.15, { type: 'square', vol: 0.12 });
        }
        if (leave) startLevel(G.level + 1);
      }

      // ---------- attract demo world ----------
      function newDemo() {
        const map = makeMaze(7, 2);
        demo = { map, x: 1.5, y: 1.5, ang: 0, tang: 0, cx: 1, cy: 1, dir: 0, t: 0, items: [] };
        for (let i = 0; i < 10; i++) {
          const x = irand(0, 6) * 2 + 1, y = irand(0, 6) * 2 + 1;
          demo.items.push({ kind: i < 4 ? 'walker' : i < 6 ? 'roller' : 'coin', x: x + 0.5, y: y + 0.5 });
        }
      }
      function updateDemo() {
        const d = demo, DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        if (d.tang !== d.ang) {
          const st = Math.PI / 2 / 14, k = d.tang - d.ang;
          if (Math.abs(k) <= st) d.ang = d.tang; else d.ang += Math.sign(k) * st;
          return;
        }
        const gx = d.cx + 0.5, gy = d.cy + 0.5;
        const dl = Math.hypot(gx - d.x, gy - d.y);
        if (dl > 0.03) { d.x += (gx - d.x) / dl * 0.03; d.y += (gy - d.y) / dl * 0.03; return; }
        d.x = gx; d.y = gy;
        // right-hand rule
        for (const turn of [1, 0, -1, 2]) {
          const nd = (d.dir + turn + 4) % 4, [ox, oy] = DIRS[nd];
          if (tile(d.map, d.cx + ox, d.cy + oy) === 0) {
            if (turn !== 0) { d.tang = d.ang + turn * Math.PI / 2; }
            d.dir = nd; d.cx += ox; d.cy += oy; break;
          }
        }
      }

      // ---------- main update ----------
      function update() {
        frame++; modeT++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (!demo || modeT % 1800 === 0) newDemo();
          updateDemo();
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; modeT = 0; newGame(); }
          return;
        }
        if (G.msgT > 0) G.msgT--;
        if (G.hurt > 0) G.hurt--;
        if (G.phase === 'intro') { if (--G.phaseT <= 0) G.phase = 'play'; return; }
        if (G.phase === 'shop') { updateShop(); return; }
        if (G.phase === 'clear') {
          if (--G.phaseT <= 0) { G.phase = 'shop'; G.shopSel = 0; G.shopT = 0; G.shield = 0; }
          return;
        }
        if (G.phase === 'dying') {
          G.phaseT--;
          for (const b of G.booms) b.t++;
          if (G.phaseT === 60) {
            if (api.offerContinue) {
              api.offerContinue(() => { G.energy = 100; G.phase = 'play'; G.eshots = []; G.msg = 'ENERGY RESTORED'; G.msgT = 90; }, gameOver);
            } else gameOver();
          }
          return;
        }
        if (G.phase === 'over') {
          if (--G.phaseT <= 0 || (G.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; modeT = 0; }
          return;
        }
        G.levelT++;
        updatePlayer();
        updateEnemies();
        if (G.energy <= 0 && G.phase === 'play') {
          G.energy = 0; G.phase = 'dying'; G.phaseT = 120;
          G.booms.push({ x: G.px, y: G.py, t: 0, big: true });
          snd.boom(); au.melody([[392, .15], [330, .15], [262, .15], [196, .4]], { type: 'square', vol: 0.12, delay: 0.2 });
        }
      }
      function gameOver() {
        api.setHiScore(G.score);
        G.phase = 'over'; G.phaseT = 420;
        au.melody([[330, .2], [294, .2], [262, .2], [196, .5]], { type: 'triangle', vol: 0.15 });
      }

      // ---------- 3D rendering ----------
      function drawView(ctx, map, px, py, ang, sprites, camBack) {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        // camera behind the hero, pulled in if a wall is close behind
        let cb = camBack;
        for (let s = 0.05; s <= camBack; s += 0.05) if (solid(map, px - dx * s, py - dy * s)) { cb = Math.max(0.05, s - 0.12); break; }
        const cx = px - dx * cb, cy = py - dy * cb;
        const plx = -dy * 0.7, ply = dx * 0.7;
        // ceiling and floor
        ctx.fillStyle = '#0a0c22'; ctx.fillRect(0, 0, W, HOR);
        ctx.fillStyle = '#141838'; ctx.fillRect(0, HOR - 16, W, 16);
        ctx.fillStyle = '#3c3c4c'; ctx.fillRect(0, HOR, W, VH - HOR);
        // receding floor seams give a sense of motion
        const fp = cx * dx + cy * dy;
        const fr = fp - Math.floor(fp);
        ctx.fillStyle = '#2c2c3a';
        for (let k = 0; k < 14; k++) {
          const d = k + 1 - fr; if (d < 0.2) continue;
          const y = HOR + EYE * K / d; if (y > VH) continue;
          ctx.fillRect(0, y | 0, W, 1);
        }
        ctx.fillStyle = '#4a4a5c'; ctx.fillRect(0, VH - 8, W, 8);
        // walls
        for (let c = 0; c < NC; c++) {
          const camX = 2 * (c + 0.5) / NC - 1;
          const rdx = dx + plx * camX, rdy = dy + ply * camX;
          let mx = Math.floor(cx), my = Math.floor(cy);
          const ddx = rdx === 0 ? 1e9 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e9 : Math.abs(1 / rdy);
          let stx, sty, sdx, sdy;
          if (rdx < 0) { stx = -1; sdx = (cx - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - cx) * ddx; }
          if (rdy < 0) { sty = -1; sdy = (cy - my) * ddy; } else { sty = 1; sdy = (my + 1 - cy) * ddy; }
          let side = 0, t = 0, guard = 0;
          while (guard++ < 64) {
            if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
            t = tile(map, mx, my); if (t !== 0) break;
          }
          const perp = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
          zbuf[c] = perp;
          let wx = side === 0 ? cy + perp * rdy : cx + perp * rdx; wx -= Math.floor(wx);
          const lh = K / perp;
          const top = HOR - lh * (1 - EYE), bot = HOR + lh * EYE;
          const y0 = Math.max(0, top | 0), y1 = Math.min(VH, Math.ceil(bot));
          const sh = Math.min(NSH - 1, Math.floor(perp * 2.2));
          const type = t === 2 ? 5 : t;
          const cols = WCOL[type][side];
          const x = c * CW;
          ctx.fillStyle = (wx < 0.05 || wx > 0.95) ? cols[Math.min(NSH - 1, sh + 8)] : cols[sh];
          ctx.fillRect(x, y0, CW, y1 - y0);
          // tech-panel trim bands
          const band = Math.max(1, lh * 0.06);
          ctx.fillStyle = cols[Math.min(NSH - 1, sh + 5)];
          ctx.fillRect(x, Math.max(0, top + lh * 0.18), CW, band);
          ctx.fillRect(x, Math.max(0, top + lh * 0.72), CW, band);
          if (type === 5 && ((wx * 6) | 0) % 2 === 0) { ctx.fillStyle = '#301800'; ctx.fillRect(x, Math.max(0, top + lh * 0.3), CW, lh * 0.4); }
          if (type === 3 && wx > 0.3 && wx < 0.7) { ctx.fillStyle = (frame >> 4) & 1 ? '#a0ffa0' : '#307030'; ctx.fillRect(x, Math.max(0, top + lh * 0.4), CW, Math.max(1, lh * 0.08)); }
        }
        // sprites: project, sort far to near, clip against the z-buffer per column
        const inv = 1 / (plx * dy - dx * ply);
        const list = [];
        for (const s of sprites) {
          const rx = s.x - cx, ry = s.y - cy;
          const tx = inv * (dy * rx - dx * ry);
          const ty = inv * (-ply * rx + plx * ry);
          if (ty < 0.15) continue;
          list.push({ s, tx, ty });
        }
        list.sort((a, b) => b.ty - a.ty);
        for (const it of list) {
          const s = it.s, ty = it.ty;
          const sx = (W / 2) * (1 + it.tx / ty);
          const lh = K / ty;
          const floorY = HOR + lh * EYE;
          if (s.draw) { s.draw(ctx, sx, floorY, lh, ty); continue; }
          const img = s.img;
          const h = lh * s.h, w = h * img.width / img.height;
          const x0 = sx - w / 2, y0 = floorY - h - lh * (s.lift || 0);
          const c0 = Math.max(0, Math.floor(x0 / CW)), c1 = Math.min(NC - 1, Math.floor((x0 + w) / CW));
          for (let c = c0; c <= c1; c++) {
            if (ty >= zbuf[c]) continue;
            const scx = c * CW;
            const u = Math.floor((scx + CW / 2 - x0) / w * img.width);
            if (u < 0 || u >= img.width) continue;
            ctx.drawImage(img, u, 0, 1, img.height, scx, y0, CW, h);
          }
        }
        return { dx, dy, cx, cy };
      }
      function boomSprite(b) {
        return {
          x: b.x, y: b.y, draw(ctx, sx, fy, lh, ty) {
            const c = Math.floor(sx / CW); if (c >= 0 && c < NC && ty > zbuf[c] + 0.3) return;
            const r = lh * (b.small ? 0.05 + b.t * 0.004 : (b.big ? 0.12 : 0.07) + b.t * 0.012), cyy = fy - lh * 0.35;
            const cols = ['#fff', '#ffe040', '#ff9a20', '#ff3030', '#802010'];
            ctx.fillStyle = cols[Math.min(4, b.t >> 3)];
            ctx.beginPath(); ctx.arc(sx, cyy, Math.max(1, r), 0, TAU); ctx.fill();
            if (b.t < 16) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, cyy, Math.max(1, r * 0.5), 0, TAU); ctx.fill(); }
          }
        };
      }
      function shotSprite(s, col, col2) {
        return {
          x: s.x, y: s.y, draw(ctx, sx, fy, lh, ty) {
            const c = Math.floor(sx / CW); if (c >= 0 && c < NC && ty > zbuf[c]) return;
            const r = Math.max(1.5, lh * 0.05), cyy = fy - lh * 0.42;
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sx, cyy, r * 1.6, 0, TAU); ctx.fill();
            ctx.fillStyle = col2; ctx.beginPath(); ctx.arc(sx, cyy, r * 0.8, 0, TAU); ctx.fill();
          }
        };
      }
      function exitSprite(ex, locked) {
        return {
          x: ex.x, y: ex.y, draw(ctx, sx, fy, lh, ty) {
            const w = lh * 0.7, h = lh * 0.95;
            const c0 = Math.max(0, Math.floor((sx - w / 2) / CW)), c1 = Math.min(NC - 1, Math.floor((sx + w / 2) / CW));
            for (let c = c0; c <= c1; c++) {
              if (ty >= zbuf[c]) continue;
              const u = (c * CW - (sx - w / 2)) / w;
              const ph = (frame * 0.2 + u * 6);
              ctx.fillStyle = locked ? ((Math.sin(ph) > 0) ? '#ff3030' : '#801010') : ((Math.sin(ph) > 0) ? '#40f0ff' : '#ffffff');
              for (let k = 0; k < 6; k++) {
                const yy = fy - h + ((frame * 2 + k * h / 6) % h);
                ctx.fillRect(c * CW, yy, CW, Math.max(1, lh * 0.02));
              }
              ctx.fillStyle = locked ? '#601010' : '#106080';
              ctx.fillRect(c * CW, fy - lh * 0.04, CW, lh * 0.04);
              ctx.fillRect(c * CW, fy - h, CW, lh * 0.04);
            }
          }
        };
      }
      const EH = { walker: 0.6, roller: 0.32, heavy: 0.78, master: 1.0 };
      function enemySprite(e) {
        const f = (e.anim | 0) & 1, arr = e.flash > 0 ? SPRW[e.type] : SPR[e.type];
        return { x: e.x, y: e.y, img: arr[f % arr.length], h: EH[e.type] };
      }
      function itemSprite(it) {
        const b = Math.sin(frame * 0.1 + it.x * 3) * 0.03;
        if (it.kind === 'coin') return { x: it.x, y: it.y, img: SPR.coin[0], h: 0.13, lift: 0.1 + b };
        if (it.kind === 'cell') return { x: it.x, y: it.y, img: SPR.cell[0], h: 0.2, lift: 0.08 + b };
        return { x: it.x, y: it.y, img: SPR.key[0], h: 0.06, lift: 0.15 + b };
      }

      // ---------- HUD ----------
      function drawMap(ctx, map, px, py, ang, x0, y0, sz, enemies, exit, items) {
        const sc = Math.max(1, Math.floor(sz / Math.max(map.mw, map.mh)));
        const ox = x0 + ((sz - map.mw * sc) >> 1), oy = y0 + ((sz - map.mh * sc) >> 1);
        ctx.fillStyle = '#000'; ctx.fillRect(x0 - 2, y0 - 2, sz + 4, sz + 4);
        ctx.fillStyle = '#304060'; ctx.fillRect(x0 - 2, y0 - 2, sz + 4, 1); ctx.fillRect(x0 - 2, y0 + sz + 1, sz + 4, 1);
        for (let y = 0; y < map.mh; y++) for (let x = 0; x < map.mw; x++) {
          const t = map.m[y * map.mw + x];
          if (t === 0) continue;
          ctx.fillStyle = t === 2 ? '#e09020' : t === 3 ? '#3c8a64' : t === 4 ? '#8a3c44' : '#3c5a9a';
          ctx.fillRect(ox + x * sc, oy + y * sc, sc, sc);
        }
        if (items) for (const it of items) {
          ctx.fillStyle = it.kind === 'coin' ? '#c09000' : it.kind === 'cell' ? '#40c040' : '#ffff80';
          ctx.fillRect(ox + Math.floor(it.x * sc) - 0.5, oy + Math.floor(it.y * sc) - 0.5, 1, 1);
        }
        if (exit && (frame >> 3) & 1) { ctx.fillStyle = '#40f0ff'; ctx.fillRect(ox + exit.x * sc - 1.5, oy + exit.y * sc - 1.5, 3, 3); }
        if (enemies) for (const e of enemies) { ctx.fillStyle = e.type === 'master' ? '#ff60c0' : '#ff3030'; ctx.fillRect(ox + e.x * sc - 1, oy + e.y * sc - 1, 2, 2); }
        const ppx = ox + px * sc, ppy = oy + py * sc;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(ppx - 1.5, ppy - 1.5, 3, 3);
        ctx.fillStyle = '#ffe040'; ctx.fillRect(ppx + Math.cos(ang) * 3 - 1, ppy + Math.sin(ang) * 3 - 1, 2, 2);
      }
      function drawPanel(ctx) {
        ctx.fillStyle = '#10142c'; ctx.fillRect(0, VH, W, H - VH);
        ctx.fillStyle = '#4060a0'; ctx.fillRect(0, VH, W, 2);
        drawMap(ctx, G.map, G.px, G.py, G.ang, 6, VH + 6, 60, G.enemies, G.exit, G.items);
        const x = 80, y = VH + 6;
        text(ctx, 'MAJOR ROCK HARDY', x, y, '#ff9a20');
        text(ctx, 'SCORE', x, y + 11, '#40f0ff'); text(ctx, pad(G.score, 7), x + 36, y + 11, '#fff');
        text(ctx, 'ENERGY', x, y + 22, '#40f0ff');
        ctx.fillStyle = '#000'; ctx.fillRect(x + 38, y + 21, 102, 9);
        const ef = clamp(G.energy, 0, 100);
        ctx.fillStyle = ef < 25 ? ((frame >> 3) & 1 ? '#ff3030' : '#801010') : ef < 50 ? '#ffe040' : '#40e060';
        ctx.fillRect(x + 39, y + 22, ef, 7);
        text(ctx, 'COINS', x, y + 34, '#ffe040'); text(ctx, pad(G.coins, 2), x + 36, y + 34, '#fff');
        text(ctx, 'KEYS', x + 62, y + 34, '#ffe040'); text(ctx, String(G.keys), x + 92, y + 34, '#fff');
        text(ctx, 'LEVEL ' + G.level, x, y + 46, '#ff9a20');
        text(ctx, 'XYBOTS ' + G.enemies.length, x + 62, y + 46, '#ff3030');
        // power-ups column
        const px = 236;
        text(ctx, 'HI', px, y, '#40f0ff'); text(ctx, pad(hi, 7), px + 16, y, '#fff');
        text(ctx, 'POWER ' + G.power, px, y + 14, G.power > 1 ? '#ff9a20' : '#606880');
        text(ctx, 'SPEED ' + G.speedLv, px, y + 25, G.speedLv ? '#ff9a20' : '#606880');
        text(ctx, 'SHOTS ' + (G.maxShots + G.power), px, y + 36, '#606880');
        text(ctx, 'SHIELD', px, y + 47, G.shield ? '#40f0ff' : '#606880');
      }

      // ---------- render ----------
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const sprites = [];
        sprites.push(exitSprite(G.exit, G.enemies.some(e => e.type === 'master')));
        for (const it of G.items) sprites.push(itemSprite(it));
        for (const e of G.enemies) sprites.push(enemySprite(e));
        for (const s of G.shots) sprites.push(shotSprite(s, '#ff9a20', '#ffffa0'));
        for (const s of G.eshots) sprites.push(shotSprite(s, '#ff2060', '#ffffff'));
        for (const b of G.booms) sprites.push(boomSprite(b));
        drawView(ctx, G.map, G.px, G.py, G.ang, sprites, 1.1);
        // the hero, seen from behind
        if (G.phase !== 'dying' && G.phase !== 'over') {
          const walking = api.key('ArrowUp') || api.key('ArrowDown') || api.key('ArrowLeft') || api.key('ArrowRight');
          const f = walking ? (G.walkT >> 3) & 1 : 0;
          const img = SPR.hero[f];
          if (!(G.hurt > 0 && (frame & 2))) ctx.drawImage(img, W / 2 - img.width, VH - 4 - img.height * 2, img.width * 2, img.height * 2);
          if (G.muzzle > 0) { ctx.fillStyle = '#ffffa0'; ctx.fillRect(W / 2 + 14, VH - 50, 6, 6); ctx.fillStyle = '#ff9a20'; ctx.fillRect(W / 2 + 15, VH - 54, 4, 4); }
          if (G.shield > 0 && (frame & 4)) { ctx.strokeStyle = '#40f0ff'; ctx.strokeRect(W / 2 - 24, VH - 54, 48, 50); }
        }
        if (G.hurt > 0) { ctx.fillStyle = 'rgba(255,0,0,0.25)'; ctx.fillRect(0, 0, W, VH); }
        drawPanel(ctx);
        if (G.msgT > 0) stext(ctx, G.msg, W / 2, 14, '#ffe040', 1, 'center');
        if (G.phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,20,0.6)'; ctx.fillRect(40, 40, W - 80, 64);
          stext(ctx, 'LEVEL ' + G.level, W / 2, 50, '#ff9a20', 2, 'center');
          stext(ctx, G.level % 5 === 0 ? 'MASTER XYBOT AHEAD!' : 'FIND THE EXIT', W / 2, 74, '#40f0ff', 1, 'center');
          stext(ctx, 'KEYS OPEN ORANGE DOORS', W / 2, 88, '#fff', 1, 'center');
        }
        if (G.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,20,0.7)'; ctx.fillRect(30, 36, W - 60, 80);
          stext(ctx, 'LEVEL ' + G.level + ' COMPLETE', W / 2, 46, '#40f0ff', 2, 'center');
          stext(ctx, 'ENERGY BONUS ' + Math.floor(G.energy) * 20, W / 2, 74, '#fff', 1, 'center');
          stext(ctx, 'LEVEL BONUS  ' + G.level * 1000, W / 2, 86, '#fff', 1, 'center');
          stext(ctx, 'TOTAL ' + G.bonus, W / 2, 100, '#ffe040', 1, 'center');
        }
        if (G.phase === 'shop') renderShop(ctx);
        if (G.phase === 'dying') { ctx.fillStyle = 'rgba(255,255,255,' + clamp((G.phaseT - 90) / 30, 0, 0.6) + ')'; ctx.fillRect(0, 0, W, VH); }
        if (G.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 50, W, 50);
          stext(ctx, 'GAME OVER', W / 2, 62, '#ff3030', 3, 'center');
        }
      }
      function renderShop(ctx) {
        ctx.fillStyle = '#060818'; ctx.fillRect(0, 0, W, VH);
        ctx.strokeStyle = '#4060a0'; ctx.strokeRect(20.5, 8.5, W - 41, VH - 17);
        stext(ctx, 'XYBOT SUPPLY SHOP', W / 2, 16, '#ff9a20', 2, 'center');
        text(ctx, 'COINS ' + G.coins, W / 2, 36, '#ffe040', 1, 'center');
        SHOP.forEach((it, i) => {
          const y = 50 + i * 12, sel = i === G.shopSel;
          const can = !it.buy || (G.coins >= it.cost && it.ok());
          if (sel) { ctx.fillStyle = '#203060'; ctx.fillRect(60, y - 2, W - 120, 11); }
          text(ctx, (sel ? '> ' : '  ') + it.name, 70, y, can ? (sel ? '#fff' : '#a0b0d0') : '#505870');
          if (it.buy) text(ctx, it.cost + ' COINS', W - 70, y, can ? '#ffe040' : '#505870', 1, 'right');
        });
        text(ctx, 'UP/DOWN SELECT  SPACE BUY  ENTER EXIT', W / 2, VH - 22, '#40f0ff', 1, 'center');
      }
      function renderTitle(ctx) {
        if (demo) {
          const sp = demo.items.map(it => it.kind === 'coin' ? { x: it.x, y: it.y, img: SPR.coin[0], h: 0.13, lift: 0.1 } : { x: it.x, y: it.y, img: SPR[it.kind][(frame >> 4) & 1], h: EH[it.kind] });
          drawView(ctx, demo.map, demo.x, demo.y, demo.ang, sp, 0.6);
          ctx.fillStyle = '#10142c'; ctx.fillRect(0, VH, W, H - VH);
          drawMap(ctx, demo.map, demo.x, demo.y, demo.ang, 6, VH + 6, 60, null, null, null);
        }
        ctx.fillStyle = 'rgba(0,0,10,0.55)'; ctx.fillRect(0, 10, W, 120);
        // chrome logo
        const t = 'XYBOTS';
        for (let i = 0; i < t.length; i++) {
          const x = W / 2 - t.length * 21 + i * 42 + 2;
          const wob = Math.sin(frame * 0.06 + i * 0.7) * 2;
          text(ctx, t[i], x + 3, 23 + wob, '#401000', 6);
          text(ctx, t[i], x, 20 + wob, '#ff9a20', 6);
          ctx.fillStyle = 'rgba(255,255,160,0.5)'; ctx.fillRect(x, 20 + wob, 30, 6);
        }
        const page = Math.floor(modeT / 360) % 3;
        if (page === 0) {
          stext(ctx, 'MAJOR ROCK HARDY VS THE XYBOTS', W / 2, 72, '#40f0ff', 1, 'center');
          stext(ctx, 'SHOOT XYBOTS  GRAB COINS AND ENERGY', W / 2, 86, '#fff', 1, 'center');
          stext(ctx, 'REACH THE EXIT  SPEND COINS IN THE SHOP', W / 2, 98, '#fff', 1, 'center');
        } else if (page === 1) {
          stext(ctx, 'HIGH SCORE', W / 2, 72, '#40f0ff', 1, 'center');
          stext(ctx, pad(hi, 7), W / 2, 86, '#ffe040', 2, 'center');
        } else {
          stext(ctx, 'X / Z TWIST TO TURN 90 DEGREES', W / 2, 72, '#40f0ff', 1, 'center');
          stext(ctx, 'LEFT RIGHT STRAFE   SPACE FIRE', W / 2, 86, '#fff', 1, 'center');
          stext(ctx, 'ENERGY DRAINS OVER TIME', W / 2, 98, '#fff', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) stext(ctx, 'INSERT COIN', W / 2, 114, '#fff', 1, 'center'); }
        else if (blink) stext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 114, '#ffe040', 1, 'center');
        text(ctx, '\u00a9 1987 ATARI GAMES', 236, VH + 40, '#8090b0', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 236, VH + 56, '#fff', 1, 'center');
        text(ctx, 'HI ' + pad(hi, 7), 236, VH + 14, '#40f0ff', 1, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
