// Arkanoid (Taito, 1986) \u2014 Vaus, 32 rounds of bricks, power-up capsules, drifting enemies and the final DOH round.
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
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  const W = 224, H = 256;
  const FX0 = 8, FX1 = 216, FY0 = 24;          // inner playfield
  const BW = 16, BH = 8, NC = 13, NR = 18;
  const VY = 232, VH = 8;
  const DEG = Math.PI / 180;

  // ---------- bricks ----------
  const BRICK = {
    w: { col: '#f0f0f0', pts: 50 }, o: { col: '#ff8c00', pts: 60 }, c: { col: '#00e0ff', pts: 70 }, g: { col: '#10e010', pts: 80 },
    r: { col: '#f02020', pts: 90 }, b: { col: '#1060ff', pts: 100 }, p: { col: '#ff30ff', pts: 110 }, y: { col: '#ffe800', pts: 120 },
    s: { col: '#a8a8b8', pts: 50 }, G: { col: '#d8a020', pts: 0 }
  };
  const COLORS8 = 'wocgrbpy';
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  const BRICK_IMG = {};
  for (const k in BRICK) {
    const c = mkCanvas(BW, BH), x = c.getContext('2d'), col = BRICK[k].col;
    x.fillStyle = shade(col, -0.55); x.fillRect(0, 0, BW, BH);
    x.fillStyle = col; x.fillRect(0, 0, BW - 1, BH - 1);
    x.fillStyle = shade(col, 0.6); x.fillRect(0, 0, BW - 1, 1); x.fillRect(0, 0, 1, BH - 1);
    x.fillStyle = shade(col, -0.25); x.fillRect(1, BH - 2, BW - 2, 1); x.fillRect(BW - 2, 1, 1, BH - 2);
    if (k === 's' || k === 'G') { x.fillStyle = shade(col, 0.35); x.fillRect(2, 2, BW - 5, 1); }
    BRICK_IMG[k] = c;
  }

  // ---------- round layouts (13 columns; first string is placed at grid row 2 unless padded) ----------
  const rep = (s, n) => { const a = []; for (let i = 0; i < n; i++) a.push(s); return a; };
  const HAND = [
    // 1
    ['', '', 'sssssssssssss', 'rrrrrrrrrrrrr', 'yyyyyyyyyyyyy', 'bbbbbbbbbbbbb', 'ppppppppppppp', 'ggggggggggggg'],
    // 2: staircase
    ['w', 'wo', 'woc', 'wocg', 'wocgr', 'wocgrb', 'wocgrbp', 'wocgrbpy', 'wocgrbpyw', 'wocgrbpywo', 'wocgrbpywoc', 'wocgrbpywocg', 'ssssssssssssr'],
    // 3: gold shelves
    ['', 'ggggggggggggg', '', 'wwwGGGGGGGGGG', '', 'rrrrrrrrrrrrr', '', 'GGGGGGGGGGwww', '', 'ppppppppppppp', '', 'bbbGGGGGGGGGG', '', 'ccccccccccccc', '', 'GGGGGGGGGGccc'],
    // 4: columns
    (() => { const a = ['']; for (let r = 0; r < 13; r++) { let s = ''; for (let c = 0; c < 13; c++) s += (c === 0 || c === 6 || c === 12) ? '.' : COLORS8[(c + r) % 8]; a.push(s); } return a; })(),
    // 5: invader
    ['', '', '..y.......y..', '...y.....y...', '..sssssssss..', '.ss.sssss.ss.', 'sssssssssssss', 's.sssssssss.s', 's.s.......s.s', '...pp...pp...'],
    // 6: diamond
    ['', '......w......', '.....wow.....', '....wocow....', '...wocgcow...', '..wocgrgcow..', '.wocgrbrgcow.', 'wocgrbpbrgcow', '.wocgrbrgcow.', '..wocgrgcow..', '...wocgcow...', '....wocow....', '.....wow.....', '......w......'],
    // 7: chequerboard inside a gold frame
    ['', 'GGGGG...GGGGG', 'G.r.r.r.r.r.G', 'Gb.b.b.b.b.bG', 'G.y.y.y.y.y.G', 'Gg.g.g.g.g.gG', 'G.p.p.p.p.p.G', 'Gc.c.c.c.c.cG', 'G.o.o.o.o.o.G', 'G...........G'],
    // 8: gold cups
    ['', '', 'G.G...G...G.G', 'GrG.GbGbG.GrG', 'GrG.GbGbG.GrG', 'GGG.GGGGG.GGG', '', 'y.y.y.y.y.y.y', '.p.p.p.p.p.p.', 'g.g.g.g.g.g.g'],
    // 9: zigzag
    ['', 'rr.........rr', '.rr.......rr.', '..rr.....rr..', '...rr...rr...', '....rr.rr....', '.....rrr.....', 'bb...sss...bb', '.bb.......bb.', '..bb.....bb..', '...bb...bb...', '....bb.bb....', '.....bbb.....'],
    // 10: pyramid with silver cap
    ['', '', '......s......', '.....sss.....', '....syyys....', '...sgggggs...', '..scccccccs..', '.sbbbbbbbbbs.', 'sppppppppppps', 'wwwwwwwwwwwww'],
    // 11: twin towers
    ['', 'G.ggg...ggg.G', 'G.grg...grg.G', 'G.ggg...ggg.G', 'G.byb...byb.G', 'G.byb...byb.G', 'G.byb...byb.G', 'G.sss...sss.G', 'G.ppp...ppp.G', 'G.ppp.w.ppp.G', 'G.....w.....G', '......w......'],
    // 12: heart
    ['', '', '..rr.....rr..', '.rrrr...rrrr.', 'rrpprr.rrpprr', 'rpppprrrpppprr', 'rpppppppppppr', '.rpppppppppr.', '..rpppppppr..', '...rpppppr...', '....rpppr....', '.....rpr.....', '......r......'],
    // 13: concentric boxes
    ['', 'sssssssssssss', 's...........s', 's.bbbbbbbbb.s', 's.b.......b.s', 's.b.yyyyy.b.s', 's.b.y.r.y.b.s', 's.b.yyyyy.b.s', 's.b.......b.s', 's.bbbbbbbbb.s', 's...........s', 'sssss...sssss'],
    // 14: dense field
    ['', 'ocgrbpywocgrb', 'cgrbpywocgrbp', 'grbpywocgrbpy', 'ssssss.ssssss', 'rbpywocgrbpyw', 'bpywocgrbpywo', 'pywocgrbpywoc', 'sssss...sssss', 'ywocgrbpywocg', 'wocgrbpywocgr'],
    // 15: cross
    ['', '.....yyy.....', '.....yGy.....', '.....yyy.....', '.....sss.....', 'bbbbsrrrsbbbb', 'bGbbsrrrsbbGb', 'bbbbsrrrsbbbb', '.....sss.....', '.....yyy.....', '.....yGy.....', '.....yyy.....'],
    // 16: ARK
    ['', '', '.ccc.rrr.g..g', 'c..c.r..r.g.g', 'c..c.r..r.gg.', 'cccc.rrr..g..', 'c..c.r.r..gg.', 'c..c.r..r.g.g', 'c..c.r..r.g..g', '', 'sssssssssssss', 'wwwwwwwwwwwww']
  ];
  function genLayout(n) {
    let seed = n * 7919 + 13;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const style = n % 4, rows = 9 + Math.floor(rnd() * 5);
    const silverP = Math.min(0.28, 0.05 + n * 0.006), goldP = n > 20 ? 0.06 : 0;
    const out = [''];
    for (let r = 0; r < rows; r++) {
      const half = [];
      for (let c = 0; c < 7; c++) {
        let ch = '.';
        if (style === 0) { if (rnd() < 0.7) ch = COLORS8[(r + n) % 8]; }
        else if (style === 1) { const ring = Math.min(r, rows - 1 - r, c); ch = ring % 2 === 0 ? COLORS8[(ring + n) % 8] : (rnd() < 0.25 ? '.' : COLORS8[(ring + 3) % 8]); }
        else if (style === 2) { ch = (r * 3 + c * 5 + n) % 7 === 0 ? '.' : COLORS8[(r + c + n) % 8]; }
        else { ch = (c === 0 || r === 0) ? 's' : COLORS8[(r * 2 + n) % 8]; if (c === 3 && r === 0) ch = '.'; }
        if (ch !== '.' && ch !== 's' && rnd() < silverP) ch = 's';
        if (ch !== '.' && rnd() < goldP && r > 0 && (r % 3 === 1)) ch = 'G';
        half.push(ch);
      }
      // mirror (column 6 is the centre)
      const full = half.slice(0, 6).concat([half[6]]).concat(half.slice(0, 6).reverse());
      out.push(full.join(''));
    }
    if (style === 3) out.push('.' + 's'.repeat(5) + '...' + 's'.repeat(4));
    return out;
  }
  const LAYOUTS = HAND.slice();
  for (let n = 17; n <= 32; n++) LAYOUTS.push(genLayout(n));
  const DOH_ROUND = LAYOUTS.length + 1;   // 33

  // ---------- capsules ----------
  const CAPS = {
    S: { col: '#ff9020', w: 18 }, C: { col: '#30d040', w: 16 }, L: { col: '#ff3030', w: 16 }, E: { col: '#3060ff', w: 16 },
    D: { col: '#20d8ff', w: 16 }, B: { col: '#ff50ff', w: 4 }, P: { col: '#a0a0b0', w: 5 }
  };
  const CAP_KEYS = Object.keys(CAPS);
  const CAP_TOTAL = CAP_KEYS.reduce((a, k) => a + CAPS[k].w, 0);

  // ---------- backgrounds (4 patterns like the arcade's) ----------
  const BG_DEFS = [
    { a: '#001880', b: '#0030b0', c: '#000c50', kind: 'hex' },
    { a: '#005010', b: '#008020', c: '#002808', kind: 'circuit' },
    { a: '#000840', b: '#203090', c: '#000420', kind: 'tile' },
    { a: '#700010', b: '#a02030', c: '#380008', kind: 'scale' }
  ];
  const BG_IMG = BG_DEFS.map(d => {
    const c = mkCanvas(FX1 - FX0, H - FY0), x = c.getContext('2d');
    x.fillStyle = d.c; x.fillRect(0, 0, c.width, c.height);
    for (let ty = 0; ty < c.height; ty += 16) for (let tx = 0; tx < c.width; tx += 16) {
      if (d.kind === 'hex') {
        const ox = ((ty >> 4) & 1) * 8;
        x.fillStyle = d.a; x.fillRect(tx + ox + 2, ty + 2, 12, 12);
        x.fillStyle = d.b; x.fillRect(tx + ox + 4, ty + 2, 8, 2); x.fillRect(tx + ox + 2, ty + 4, 2, 8);
        x.fillStyle = d.c; x.fillRect(tx + ox + 6, ty + 6, 4, 4);
      } else if (d.kind === 'circuit') {
        x.fillStyle = d.a; x.fillRect(tx, ty + 7, 16, 2); x.fillRect(tx + 7, ty, 2, 16);
        x.fillStyle = d.b; x.fillRect(tx + 5, ty + 5, 6, 6);
        x.fillStyle = d.c; x.fillRect(tx + 7, ty + 7, 2, 2);
        if (((tx + ty) >> 4) % 3 === 0) { x.fillStyle = d.a; x.fillRect(tx + 1, ty + 1, 3, 3); }
      } else if (d.kind === 'tile') {
        x.fillStyle = d.a; x.fillRect(tx + 1, ty + 1, 14, 14);
        x.fillStyle = d.b; x.fillRect(tx + 1, ty + 1, 14, 1); x.fillRect(tx + 1, ty + 1, 1, 14);
        x.fillStyle = d.c; x.fillRect(tx + 4, ty + 4, 8, 8);
        x.fillStyle = d.b; x.fillRect(tx + 6, ty + 6, 4, 4);
      } else {
        const ox = ((ty >> 4) & 1) * 8;
        x.fillStyle = d.a;
        for (let i = 0; i < 8; i++) x.fillRect(tx + ox + 8 - i, ty + i * 2, i * 2, 2);
        x.fillStyle = d.b; x.fillRect(tx + ox + 6, ty + 2, 4, 2);
      }
    }
    return c;
  });
  const DOH_BG = (() => {
    const c = mkCanvas(FX1 - FX0, H - FY0), x = c.getContext('2d');
    x.fillStyle = '#000010'; x.fillRect(0, 0, c.width, c.height);
    let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 120; i++) { x.fillStyle = ['#303060', '#6060a0', '#a0a0ff', '#ffffff'][Math.floor(r() * 4)]; x.fillRect(Math.floor(r() * c.width), Math.floor(r() * c.height), 1, 1); }
    return c;
  })();

  ArcadeRegistry.register({
    id: 'arkanoid', title: 'Arkanoid', year: 1986, maker: 'Taito',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Mouse or Left/Right: move Vaus \u00b7 Click/Space: launch, laser \u00b7 Enter: start',
    marquee: { bg: '#000020', fg: '#c0c8ff', accent: '#ff3030' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let lastMX = api.mouse.x, mouseActive = false;

      const sfx = {
        vaus() { au.tone(392, 0.05, { type: 'square', vol: 0.14 }); },
        brick() { au.tone(784, 0.045, { type: 'square', vol: 0.12 }); },
        metal() { au.tone(1568, 0.09, { type: 'triangle', vol: 0.14 }); au.tone(2349, 0.06, { type: 'square', vol: 0.05 }); },
        wall() { au.tone(523, 0.03, { type: 'square', vol: 0.06 }); },
        cap() { au.melody([[523, .05], [784, .05], [1047, .08]], { type: 'square', vol: 0.12 }); },
        laser() { au.tone(1400, 0.08, { type: 'sawtooth', vol: 0.07, slideTo: 300 }); },
        enemy() { au.noise(0.2, { vol: 0.15, freq: 3000, slideTo: 400 }); },
        die() { au.melody([[784, .08], [740, .08], [698, .08], [659, .08], [622, .08], [587, .1], [523, .3]], { type: 'square', vol: 0.12 }); au.noise(0.8, { vol: 0.18, freq: 1500, slideTo: 80, delay: 0.1 }); },
        start() { au.melody([[392, .12], [0, .04], [392, .08], [523, .12], [659, .12], [784, .12], [659, .08], [784, .3]], { type: 'square', vol: 0.11 }); },
        extra() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .14]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .3]], { type: 'square', vol: 0.11 }); },
        doh() { au.tone(110, 0.18, { type: 'sawtooth', vol: 0.15, slideTo: 70 }); au.tone(1800, 0.06, { type: 'square', vol: 0.06 }); },
        coin() { au.tone(1320, 0.06, { type: 'square', vol: 0.08, slideTo: 1980 }); },
        nocoin() { au.tone(98, 0.28, { type: 'square', vol: 0.16 }); }
      };

      // ---------- game setup ----------
      function newGame(demo) {
        g = { score: 0, lives: 3, round: 1, demo: !!demo, nextExtra: 20000, phase: 'intro', t: 0, demoT: 0 };
        loadRound();
      }
      function loadRound() {
        g.bricks = []; g.left = 0;
        for (let r = 0; r < NR; r++) g.bricks.push(new Array(NC).fill(null));
        g.doh = null;
        if (g.round === DOH_ROUND) {
          g.doh = { x: 80, y: 52, w: 64, h: 92, hp: 16, flash: 0, mouth: 0, fireT: 200, dead: 0 };
        } else {
          const L = LAYOUTS[(g.round - 1) % LAYOUTS.length];
          for (let i = 0; i < L.length && i + 1 < NR; i++) {
            const row = L[i];
            for (let c = 0; c < NC && c < row.length; c++) {
              const ch = row[c]; if (!BRICK[ch]) continue;
              const hp = ch === 's' ? 2 + Math.floor((g.round - 1) / 8) : ch === 'G' ? 1e9 : 1;
              g.bricks[i + 1][c] = { t: ch, hp, sh: 0 };
              if (ch !== 'G') g.left++;
            }
          }
        }
        g.caps = []; g.lasers = []; g.enemies = []; g.fx = []; g.shots = []; g.pops = [];
        g.gates = [{ x: 44, open: 0 }, { x: 156, open: 0 }];
        g.enemyT = 360; g.warp = false;
        resetVaus();
        g.phase = 'intro'; g.t = 150;
        if (!g.demo) sfx.start();
      }
      function resetVaus() {
        g.vaus = { x: (FX0 + FX1) / 2 - 16, w: 32, tw: 32, mode: 'normal', glow: 0 };
        g.baseSpeed = Math.min(2.6, 1.9 + g.round * 0.025);
        g.speed = g.baseSpeed; g.maxSpeed = Math.min(4.6, 3.3 + g.round * 0.04);
        g.hits = 0; g.speedT = 0; g.ceiling = false;
        g.balls = [{ x: g.vaus.x + 16, y: VY - 2, vx: 0, vy: 0, stuck: true, off: 0, hold: 150 }];
        g.caps = []; g.lasers = []; g.shots = [];
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score > hi) hi = g.score;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 20000 ? 40000 : 60000; sfx.extra(); }
      }

      // ---------- helpers ----------
      function setDir(b, ang) { b.vx = Math.cos(ang) * g.speed; b.vy = Math.sin(ang) * g.speed; }
      function normalize(b) {
        const m = Math.hypot(b.vx, b.vy) || 1;
        b.vx = b.vx / m * g.speed; b.vy = b.vy / m * g.speed;
        // never too flat
        if (Math.abs(b.vy) < g.speed * 0.3) { b.vy = Math.sign(b.vy || -1) * g.speed * 0.3; b.vx = Math.sign(b.vx || 1) * Math.sqrt(g.speed * g.speed - b.vy * b.vy); }
      }
      function speedUp(d) { g.speed = Math.min(g.maxSpeed, g.speed + d); for (const b of g.balls) if (!b.stuck) normalize(b); }
      function brickAt(px, py) {
        if (px < FX0 || px >= FX1 || py < FY0) return null;
        const c = Math.floor((px - FX0) / BW), r = Math.floor((py - FY0) / BH);
        if (r < 0 || r >= NR || c < 0 || c >= NC) return null;
        return g.bricks[r][c] ? [r, c] : null;
      }
      function ballBrick(b) {
        return brickAt(b.x - 2, b.y - 2) || brickAt(b.x + 1.9, b.y - 2) || brickAt(b.x - 2, b.y + 1.9) || brickAt(b.x + 1.9, b.y + 1.9);
      }
      function hitBrick(r, c, byLaser) {
        const br = g.bricks[r][c]; if (!br) return;
        if (br.t === 'G') { br.sh = 12; sfx.metal(); return; }
        br.hp--;
        if (br.hp > 0) { br.sh = 12; sfx.metal(); return; }
        g.bricks[r][c] = null; g.left--;
        sfx.brick();
        addScore(br.t === 's' ? 50 * g.round : BRICK[br.t].pts);
        g.hits++;
        if (g.hits % 10 === 0) speedUp(0.08);
        const bx = FX0 + c * BW, by = FY0 + r * BH;
        g.fx.push({ x: bx, y: by, t: 0, kind: 'brick', col: BRICK[br.t].col });
        // capsule
        if (!g.caps.length && g.balls.length === 1 && br.t !== 's' && Math.random() < 0.16) {
          let k = Math.random() * CAP_TOTAL, key = 'S';
          for (const kk of CAP_KEYS) { k -= CAPS[kk].w; if (k <= 0) { key = kk; break; } }
          if (key === 'P' && g.lives >= 6) key = 'E';
          g.caps.push({ x: bx, y: by, k: key, t: 0 });
        }
        if (g.left <= 0) roundClear();
      }
      function roundClear() {
        if (g.phase !== 'play') return;
        g.phase = 'clear'; g.t = 120; sfx.clear();
      }
      function vausLeft() { return g.vaus.x; }
      function vausCenter() { return g.vaus.x + g.vaus.w / 2; }

      // ---------- player ----------
      function moveVaus() {
        const v = g.vaus;
        // smooth width change for Enlarge
        if (v.w !== v.tw) { const d = Math.sign(v.tw - v.w); v.w += d * 2; v.x -= d; }
        if (g.demo) {
          // demo AI: follow the lowest descending ball
          let tgt = g.balls[0]; for (const b of g.balls) if (b.vy > 0 && b.y > tgt.y) tgt = b;
          const aim = tgt.x - v.w / 2 + Math.sin(frame * 0.05) * (v.w * 0.3);
          v.x += Math.max(-4, Math.min(4, aim - v.x));
        } else {
          if (Math.abs(api.mouse.x - lastMX) > 0.5) mouseActive = true;
          lastMX = api.mouse.x;
          let k = 0;
          if (api.key('ArrowLeft')) k -= 1;
          if (api.key('ArrowRight')) k += 1;
          if (k) { mouseActive = false; v.x += k * 3.4; }
          else if (mouseActive) v.x += Math.max(-8, Math.min(8, api.mouse.x - v.w / 2 - v.x));
        }
        const maxX = g.warp ? FX1 - v.w + 12 : FX1 - v.w;
        v.x = Math.max(FX0, Math.min(maxX, v.x));
        if (g.warp && v.x + v.w > FX1 + 2 && g.phase === 'play') {
          g.phase = 'warp'; g.t = 70; addScore(10000); sfx.clear();
        }
      }
      function fireButton() {
        if (g.demo) return false;
        return api.pressed('Space') || api.pressed('KeyX') || api.pressed('ArrowUp') || api.mouse.clicked;
      }

      // ---------- balls ----------
      function launch(b) {
        b.stuck = false;
        const rel = (b.x - vausCenter()) / (g.vaus.w / 2);
        setDir(b, (-90 + Math.max(-1, Math.min(1, rel)) * 45 + (rel === 0 ? 20 : 0)) * DEG);
        if (Math.abs(b.vx) < 0.3) setDir(b, -65 * DEG);
        sfx.vaus();
      }
      function updateBalls() {
        const v = g.vaus;
        for (let i = g.balls.length - 1; i >= 0; i--) {
          const b = g.balls[i];
          if (b.stuck) {
            b.x = v.x + b.off; b.y = VY - 2;
            if (--b.hold <= 0 || fireButton() || (g.demo && b.hold < 100)) launch(b);
            continue;
          }
          const n = Math.ceil(g.speed);
          for (let s = 0; s < n && !b.dead; s++) {
            // X axis
            b.x += b.vx / n;
            if (b.x - 2 < FX0) { b.x = FX0 + 2; b.vx = Math.abs(b.vx); sfx.wall(); }
            if (b.x + 2 > FX1) { b.x = FX1 - 2; b.vx = -Math.abs(b.vx); sfx.wall(); }
            let hit = ballBrick(b);
            if (hit) { b.x -= b.vx / n; b.vx = -b.vx; hitBrick(hit[0], hit[1]); }
            else if (g.doh && dohHit(b)) { b.x -= b.vx / n; b.vx = -b.vx; damageDoh(); }
            // Y axis
            b.y += b.vy / n;
            if (b.y - 2 < FY0) {
              b.y = FY0 + 2; b.vy = Math.abs(b.vy); sfx.wall();
              if (!g.ceiling) { g.ceiling = true; speedUp(0.35); }
            }
            hit = ballBrick(b);
            if (hit) { b.y -= b.vy / n; b.vy = -b.vy; hitBrick(hit[0], hit[1]); }
            else if (g.doh && dohHit(b)) { b.y -= b.vy / n; b.vy = -b.vy; damageDoh(); }
            // Vaus
            if (b.vy > 0 && b.y + 2 >= VY && b.y + 2 <= VY + 5 && b.x + 2 >= v.x && b.x - 2 <= v.x + v.w && (g.phase === 'play')) {
              const rel = (b.x - vausCenter()) / (v.w / 2 + 2);
              const seg = Math.max(-4, Math.min(3, Math.floor(rel * 4)));   // 8 segments
              const ang = [-150, -135, -120, -105, -75, -60, -45, -30][seg + 4];
              setDir(b, ang * DEG);
              b.y = VY - 2;
              sfx.vaus();
              if (v.mode === 'catch' && !g.demo) { b.stuck = true; b.off = b.x - v.x; b.hold = 180; break; }
            }
            // enemies
            for (const e of g.enemies) {
              if (e.dead) continue;
              if (Math.abs(e.x - b.x) < 8 && Math.abs(e.y - b.y) < 8) { killEnemy(e); b.vy = -b.vy; break; }
            }
          }
          if (b.y > H + 6) g.balls.splice(i, 1);
        }
        if (!g.balls.length && g.phase === 'play') loseLife();
      }

      // ---------- DOH ----------
      function dohHit(b) {
        const d = g.doh; if (d.dead) return false;
        return b.x + 2 > d.x && b.x - 2 < d.x + d.w && b.y + 2 > d.y && b.y - 2 < d.y + d.h;
      }
      function damageDoh() {
        const d = g.doh;
        if (d.flash > 0) return;
        d.hp--; d.flash = 20; sfx.doh();
        addScore(1000);
        if (d.hp <= 0) { d.dead = 1; g.shots = []; g.phase = 'dohdie'; g.t = 200; }
      }
      function updateDoh() {
        const d = g.doh; if (!d || d.dead) return;
        if (d.flash > 0) d.flash--;
        if (d.mouth > 0) {
          d.mouth--;
          if (d.mouth === 30 || d.mouth === 20 || d.mouth === 10) {
            const sx = d.x + d.w / 2, sy = d.y + 74;
            const ang = Math.atan2(VY - sy, vausCenter() - sx) + (d.mouth - 20) * 0.012;
            const sp = 1.5 + (16 - d.hp) * 0.04;
            g.shots.push({ x: sx, y: sy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0 });
            au.tone(220, 0.1, { type: 'sawtooth', vol: 0.08, slideTo: 110 });
          }
        } else if (--d.fireT <= 0) { d.mouth = 50; d.fireT = 150 + Math.floor(Math.random() * 90) - (16 - d.hp) * 4; }
        for (let i = g.shots.length - 1; i >= 0; i--) {
          const s = g.shots[i]; s.x += s.vx; s.y += s.vy; s.t++;
          if (s.y > H + 8 || s.x < FX0 - 8 || s.x > FX1 + 8) { g.shots.splice(i, 1); continue; }
          const v = g.vaus;
          if (s.y > VY - 2 && s.y < VY + VH + 2 && s.x > v.x && s.x < v.x + v.w && g.phase === 'play') { g.shots.splice(i, 1); loseLife(); return; }
        }
      }

      // ---------- capsules ----------
      function applyCap(k) {
        const v = g.vaus;
        addScore(1000); sfx.cap();
        // power-ups replace each other
        if (k !== 'D' && k !== 'P' && k !== 'S') { if (v.mode === 'catch') for (const b of g.balls) if (b.stuck) launch(b); v.mode = 'normal'; v.tw = 32; }
        switch (k) {
          case 'S': g.speed = g.baseSpeed; for (const b of g.balls) if (!b.stuck) normalize(b); g.hits = 0; g.speedT = 0; break;
          case 'C': v.mode = 'catch'; break;
          case 'L': v.mode = 'laser'; break;
          case 'E': v.tw = 48; v.mode = 'expand'; break;
          case 'D': {
            const src = g.balls.find(b => !b.stuck) || g.balls[0];
            if (src.stuck) launch(src);
            const a = Math.atan2(src.vy, src.vx);
            for (const da of [-0.5, 0.5]) { const nb = { x: src.x, y: src.y, vx: 0, vy: 0, stuck: false, off: 0, hold: 0 }; setDir(nb, a + da); normalize(nb); g.balls.push(nb); }
            break;
          }
          case 'B': g.warp = true; break;
          case 'P': g.lives++; sfx.extra(); break;
        }
      }
      function updateCaps() {
        const v = g.vaus;
        for (let i = g.caps.length - 1; i >= 0; i--) {
          const c = g.caps[i]; c.y += 1.1; c.t++;
          if (c.y + 7 >= VY && c.y <= VY + VH && c.x + 16 > v.x && c.x < v.x + v.w) { g.caps.splice(i, 1); applyCap(c.k); continue; }
          if (c.y > H) g.caps.splice(i, 1);
        }
      }
      function updateLasers() {
        const v = g.vaus;
        if (v.mode === 'laser' && fireButton() && g.lasers.length < 4) {
          g.lasers.push({ x: v.x + 3, y: VY - 4 }, { x: v.x + v.w - 4, y: VY - 4 }); sfx.laser();
        }
        for (let i = g.lasers.length - 1; i >= 0; i--) {
          const l = g.lasers[i]; l.y -= 6;
          let gone = l.y < FY0;
          const h = brickAt(l.x, l.y) || brickAt(l.x + 1, l.y);
          if (h) { hitBrick(h[0], h[1], true); gone = true; }
          if (g.doh && !g.doh.dead && l.x > g.doh.x && l.x < g.doh.x + g.doh.w && l.y < g.doh.y + g.doh.h && l.y > g.doh.y) { gone = true; }
          for (const e of g.enemies) if (!e.dead && Math.abs(e.x - l.x) < 7 && Math.abs(e.y - l.y) < 7) { killEnemy(e); gone = true; }
          if (gone) g.lasers.splice(i, 1);
        }
      }

      // ---------- enemies ----------
      function enemyBlocked(x, y) {
        return brickAt(x - 6, y - 6) || brickAt(x + 6, y - 6) || brickAt(x - 6, y + 6) || brickAt(x + 6, y + 6);
      }
      function updateEnemies() {
        if (g.doh) return;
        for (const gt of g.gates) if (gt.open > 0) gt.open--;
        if (--g.enemyT <= 0 && g.enemies.filter(e => !e.dead).length < 3) {
          g.enemyT = Math.max(200, 520 - g.round * 8) + Math.floor(Math.random() * 200);
          const gt = g.gates[Math.random() < 0.5 ? 0 : 1];
          gt.open = 60;
          g.enemies.push({ x: gt.x + 12, y: FY0 - 4, t: 0, kind: (g.round - 1) % 4, ph: Math.random() * 6.28, dir: Math.random() < 0.5 ? -1 : 1, dead: 0, wait: 30 });
        }
        const v = g.vaus;
        for (let i = g.enemies.length - 1; i >= 0; i--) {
          const e = g.enemies[i];
          if (e.dead) { if (++e.dead > 24) g.enemies.splice(i, 1); continue; }
          e.t++;
          if (e.wait > 0) { e.wait--; e.y += 0.4; continue; }
          let dx, dy;
          if (e.y < 150) { dx = Math.sin(e.t * 0.03 + e.ph) * 0.7 + e.dir * 0.2; dy = 0.45; }
          else { dx = Math.cos(e.t * 0.04 + e.ph) * 1.0; dy = Math.sin(e.t * 0.04 + e.ph) * 0.6 + 0.12; }
          const nx = e.x + dx, ny = e.y + dy;
          if (!enemyBlocked(nx, ny)) { e.x = nx; e.y = ny; }
          else if (!enemyBlocked(e.x + e.dir * 0.8, e.y)) e.x += e.dir * 0.8;
          else { e.dir = -e.dir; if (!enemyBlocked(e.x, e.y + 0.5)) e.y += 0.5; }
          if (e.x < FX0 + 7) { e.x = FX0 + 7; e.dir = 1; }
          if (e.x > FX1 - 7) { e.x = FX1 - 7; e.dir = -1; }
          if (e.y > VY - 8 && e.y < VY + 12 && e.x + 6 > v.x && e.x - 6 < v.x + v.w) { killEnemy(e); continue; }
          if (e.y > H + 10) g.enemies.splice(i, 1);
        }
      }
      function killEnemy(e) {
        if (e.dead) return;
        e.dead = 1; addScore(100); sfx.enemy();
      }

      // ---------- flow ----------
      function loseLife() {
        if (g.phase !== 'play') return;
        g.phase = 'dying'; g.t = 110; g.balls = []; g.shots = [];
        if (!g.demo) sfx.die();
        g.fx.push({ x: vausCenter(), y: VY + 4, t: 0, kind: 'vaus' });
      }
      function afterDeath() {
        if (g.demo) { mode = 'title'; titleT = 0; return; }
        if (g.lives <= 1) {
          const cg = g;
          const over = () => { if (g !== cg) return; api.setHiScore(g.score); g.phase = 'over'; g.t = 360; };
          if (api.offerContinue) {
            g.phase = 'hold';
            api.offerContinue(() => { if (g !== cg) return; g.lives = 3; resetVaus(); g.phase = 'intro'; g.t = 120; sfx.start(); }, over);
          } else over();
          return;
        }
        g.lives--; resetVaus(); g.phase = 'intro'; g.t = 120;
        sfx.start();
      }
      function nextRound() {
        g.round++;
        if (g.round > DOH_ROUND) { g.round = DOH_ROUND; }
        loadRound();
      }

      let lastCred = api.credits;
      function update() {
        frame++;
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) {
            if (api.useCredit()) { newGame(false); mode = 'game'; }
            else { coinFlash = 90; sfx.nocoin(); }
          } else if (titleT > 600) { newGame(true); g.round = 1 + Math.floor(Math.random() * 6); loadRound(); mode = 'demo'; }
          return;
        }
        if (mode === 'demo') {
          if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) { mode = 'title'; titleT = 0; return; }
          if (++g.demoT > 1500) { mode = 'title'; titleT = 0; return; }
        }
        stepGame();
      }
      function stepGame() {
        for (const row of g.bricks) for (const b of row) if (b && b.sh > 0) b.sh--;
        for (let i = g.fx.length - 1; i >= 0; i--) if (++g.fx[i].t > (g.fx[i].kind === 'vaus' ? 80 : 14)) g.fx.splice(i, 1);
        switch (g.phase) {
          case 'intro':
            moveVaus();
            for (const b of g.balls) { b.x = g.vaus.x + b.off + 16; b.y = VY - 2; }
            if (--g.t <= 0) { g.phase = 'play'; for (const b of g.balls) { b.off = b.x - g.vaus.x; b.hold = 150; } }
            break;
          case 'play':
            moveVaus();
            if (g.phase !== 'play') break;
            updateLasers(); updateBalls(); updateCaps(); updateEnemies();
            if (g.doh) updateDoh();
            if (++g.speedT % 900 === 0) speedUp(0.12);
            break;
          case 'dying':
            if (--g.t <= 0) afterDeath();
            break;
          case 'clear':
            if (--g.t <= 0) nextRound();
            break;
          case 'warp':
            g.vaus.x += 0.8;
            if (--g.t <= 0) nextRound();
            break;
          case 'dohdie':
            if (g.t % 8 === 0) { g.fx.push({ x: g.doh.x + Math.random() * g.doh.w, y: g.doh.y + Math.random() * g.doh.h, t: 0, kind: 'boom' }); au.noise(0.15, { vol: 0.12, freq: 1200 }); }
            if (--g.t <= 0) { g.phase = 'ending'; g.t = 900; addScore(0); au.melody([[523, .2], [659, .2], [784, .2], [1047, .4], [988, .2], [1047, .6]], { type: 'triangle', vol: 0.14 }); }
            break;
          case 'ending':
            if (--g.t <= 0 || (g.t < 700 && api.anyPressed('Enter', 'Space'))) {
              if (g.demo) { mode = 'title'; titleT = 0; break; }
              api.setHiScore(g.score);
              // the adventure starts again from round 1, faster
              g.round = 0; g.loop = (g.loop || 0) + 1; nextRound();
            }
            break;
          case 'over':
            if (--g.t <= 0 || (g.t < 260 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }

      // ---------- drawing ----------
      function drawWalls(ctx) {
        // metallic pipes
        const pipe = ['#304050', '#8090a8', '#c8d0e0', '#f0f4ff', '#a0a8c0', '#606878', '#404858', '#202830'];
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = pipe[i];
          ctx.fillRect(i, FY0 - 8, 1, H - FY0 + 8);
          ctx.fillRect(FX1 + 7 - i, FY0 - 8, 1, H - FY0 + 8);
          ctx.fillRect(0, FY0 - 8 + i, W, 1);
        }
        // joints
        ctx.fillStyle = '#e04040';
        for (let y = FY0 + 20; y < H; y += 48) { ctx.fillRect(0, y, 8, 3); ctx.fillRect(FX1, y, 8, 3); }
        for (const x of [24, 100, 120, 196]) ctx.fillRect(x, FY0 - 8, 3, 8);
        // gates
        if (g) for (const gt of g.gates) {
          const o = Math.min(1, (gt.open > 0 ? Math.min(gt.open, 60 - gt.open + 1) : 0) / 12);
          ctx.fillStyle = '#101820'; ctx.fillRect(gt.x, FY0 - 8, 24, 8);
          ctx.fillStyle = '#90a0b8';
          const sw = Math.round(12 * (1 - o));
          ctx.fillRect(gt.x, FY0 - 7, sw, 6); ctx.fillRect(gt.x + 24 - sw, FY0 - 7, sw, 6);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(gt.x, FY0 - 7, sw, 1); ctx.fillRect(gt.x + 24 - sw, FY0 - 7, sw, 1);
        }
        // warp gate
        if (g && g.warp) {
          ctx.fillStyle = '#000'; ctx.fillRect(FX1, VY - 10, 8, 26);
          ctx.fillStyle = (frame >> 2) & 1 ? '#ff50ff' : '#ffffff';
          for (let i = 0; i < 3; i++) ctx.fillRect(FX1 + 1 + ((frame >> 1) + i * 3) % 7, VY - 8 + i * 8, 1, 6);
        }
      }
      function drawBricks(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) if (g.bricks[r][c]) ctx.fillRect(FX0 + c * BW + 4, FY0 + r * BH + 4, BW, BH);
        for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
          const b = g.bricks[r][c]; if (!b) continue;
          const x = FX0 + c * BW, y = FY0 + r * BH;
          ctx.drawImage(BRICK_IMG[b.t], x, y);
          if (b.sh > 0) { // shine sweep across metal bricks
            const p = 12 - b.sh;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + p, y + 1, 2, BH - 2);
            ctx.fillRect(x + p + 3, y + 2, 1, BH - 4);
          }
        }
      }
      function drawVaus(ctx, x, y, w, mode, alpha) {
        const body = ['#505868', '#d8e0e8', '#ffffff', '#c8d0d8', '#a0a8b8', '#8890a0', '#687080', '#384050'];
        const cap = mode === 'laser' ? ['#400000', '#ff5050', '#ffa0a0', '#ff2020', '#e01010', '#b01010', '#800808', '#400404']
          : ['#601010', '#ff6060', '#ffb0b0', '#ff3030', '#e02020', '#c01010', '#901010', '#500808'];
        x = Math.round(x);
        for (let r = 0; r < VH; r++) {
          const inset = (r === 0 || r === VH - 1) ? 1 : 0;
          ctx.fillStyle = cap[r]; ctx.fillRect(x + inset, y + r, 7 - inset, 1); ctx.fillRect(x + w - 7, y + r, 7 - inset, 1);
          ctx.fillStyle = body[r]; ctx.fillRect(x + 8, y + r, w - 16, 1);
        }
        ctx.fillStyle = '#2050ff'; ctx.fillRect(x + 7, y + 1, 1, VH - 2); ctx.fillRect(x + w - 8, y + 1, 1, VH - 2);
        if (mode === 'laser') {
          ctx.fillStyle = '#202020'; ctx.fillRect(x + 2, y - 3, 3, 3); ctx.fillRect(x + w - 5, y - 3, 3, 3);
          ctx.fillStyle = (frame >> 2) & 1 ? '#ffff60' : '#ff8020'; ctx.fillRect(x + 3, y - 3, 1, 1); ctx.fillRect(x + w - 4, y - 3, 1, 1);
        }
        if (mode === 'catch') { ctx.fillStyle = (frame >> 3) & 1 ? '#40ff60' : '#20a030'; ctx.fillRect(x + 8, y, w - 16, 1); }
      }
      function drawBall(ctx, b) {
        const x = Math.round(b.x - 2), y = Math.round(b.y - 2);
        ctx.fillStyle = '#909090'; ctx.fillRect(x, y + 1, 5, 2); ctx.fillRect(x + 1, y, 3, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y, 3, 3); ctx.fillRect(x, y + 1, 4, 1);
      }
      function drawCap(ctx, c) {
        const x = Math.round(c.x), y = Math.round(c.y), col = CAPS[c.k].col;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 3, y + 3, 16, 7);
        ctx.fillStyle = shade(col, -0.5); ctx.fillRect(x + 1, y, 14, 7); ctx.fillRect(x, y + 1, 16, 5);
        ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, 14, 5);
        ctx.fillStyle = shade(col, 0.5); ctx.fillRect(x + 2, y + 1, 12, 1);
        // the letter rolls as the capsule tumbles
        const roll = (c.t >> 3) % 4;
        if (roll !== 3) {
          const gl = FONT[c.k], oy = roll === 0 ? 0 : roll === 1 ? -1 : 1;
          ctx.fillStyle = roll === 1 ? '#ffffa0' : '#ffff00';
          for (let r = 0; r < 7; r++) for (let cc = 0; cc < 5; cc++) {
            if (!(gl[r] & (16 >> cc))) continue;
            const yy = y + 1 + Math.round(r * 5 / 7) + oy; if (yy < y + 1 || yy > y + 5) continue;
            ctx.fillRect(x + 6 + cc, yy, 1, 1);
          }
        }
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), t = e.t;
        if (e.dead) {
          const r = e.dead / 2;
          ctx.fillStyle = e.dead & 2 ? '#ffffff' : '#ffd040';
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2); }
          return;
        }
        if (e.kind === 0) {           // spinning cone
          const w = Math.round(6 * Math.abs(Math.cos(t * 0.08))) + 1;
          for (let i = 0; i < 12; i++) {
            const hw = Math.max(1, Math.round((i + 1) / 2));
            ctx.fillStyle = i < 3 ? '#ffffff' : i < 7 ? '#40a0ff' : '#2040c0';
            ctx.fillRect(x - hw, y - 6 + i, hw * 2, 1);
          }
          ctx.fillStyle = '#ffe040'; ctx.fillRect(x - w, y + 5, w * 2, 2);
        } else if (e.kind === 1) {    // pyramid
          const f = (t >> 3) % 4;
          for (let i = 0; i < 11; i++) {
            const hw = Math.round(i * 0.6) + 1;
            ctx.fillStyle = '#20a020'; ctx.fillRect(x - hw, y - 5 + i, hw * 2, 1);
            ctx.fillStyle = '#80ff80'; ctx.fillRect(x - hw + Math.round(hw * 2 * f / 4), y - 5 + i, Math.max(1, Math.round(hw / 2)), 1);
          }
        } else if (e.kind === 2) {    // molecule
          const cols = ['#ff3030', '#3060ff', '#ffffff'];
          for (let k = 0; k < 3; k++) {
            const a = t * 0.09 + k * 2.094;
            const bx = x + Math.round(Math.cos(a) * 3.5), by = y + Math.round(Math.sin(a) * 3.5);
            ctx.fillStyle = shade(cols[k], -0.4); ctx.fillRect(bx - 3, by - 2, 6, 5); ctx.fillRect(bx - 2, by - 3, 4, 7);
            ctx.fillStyle = cols[k]; ctx.fillRect(bx - 2, by - 2, 4, 4);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 1, by - 2, 1, 1);
          }
        } else {                      // tumbling cube
          const a = t * 0.06, s = 5;
          const pts = [];
          for (let k = 0; k < 4; k++) pts.push([x + Math.round(Math.cos(a + k * Math.PI / 2) * s), y + Math.round(Math.sin(a + k * Math.PI / 2) * s * 0.6) - 2]);
          ctx.fillStyle = '#c03000'; ctx.fillRect(x - 5, y - 2, 10, 8);
          ctx.fillStyle = '#ff8040'; ctx.fillRect(x - 5, y - 5, 10, 4);
          ctx.fillStyle = '#ffd0a0';
          for (const [px, py] of pts) ctx.fillRect(px, py, 2, 2);
          ctx.fillStyle = '#601000'; ctx.fillRect(x - 1, y - 1, 2, 7);
        }
      }
      function drawDoh(ctx) {
        const d = g.doh; if (!d) return;
        if (d.dead && g.phase !== 'dohdie') return;
        const x = d.x, y = d.y, w = d.w, h = d.h;
        const flash = d.flash > 0 && (d.flash >> 1) & 1;
        const base = flash ? '#ffffff' : '#6070a0', dark = flash ? '#c0c0ff' : '#303860', lite = flash ? '#ffffff' : '#a0b0e0';
        const crumble = d.dead ? (200 - g.t) / 200 : 0;
        ctx.save();
        if (crumble) { ctx.beginPath(); ctx.rect(x - 4, y + h * crumble, w + 8, h); ctx.clip(); }
        // head block with moai profile
        ctx.fillStyle = dark; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = base; ctx.fillRect(x + 4, y + 2, w - 8, h - 6);
        ctx.fillStyle = lite; ctx.fillRect(x + 4, y + 2, w - 8, 3); ctx.fillRect(x + 4, y + 2, 3, h - 8);
        // brow
        ctx.fillStyle = dark; ctx.fillRect(x + 8, y + 22, w - 16, 6);
        ctx.fillStyle = lite; ctx.fillRect(x + 8, y + 22, w - 16, 1);
        // eyes
        const eyeCol = d.flash > 0 ? '#ff2020' : (d.mouth > 0 ? '#ffff40' : '#40e0ff');
        ctx.fillStyle = '#101020'; ctx.fillRect(x + 12, y + 30, 14, 8); ctx.fillRect(x + w - 26, y + 30, 14, 8);
        ctx.fillStyle = eyeCol; ctx.fillRect(x + 16, y + 32, 6, 4); ctx.fillRect(x + w - 22, y + 32, 6, 4);
        // nose
        ctx.fillStyle = dark; ctx.fillRect(x + w / 2 - 5, y + 30, 10, 26);
        ctx.fillStyle = lite; ctx.fillRect(x + w / 2 - 5, y + 30, 2, 26);
        ctx.fillStyle = dark; ctx.fillRect(x + w / 2 - 9, y + 54, 18, 5);
        // mouth
        const open = d.mouth > 0 ? Math.min(10, Math.min(d.mouth, 50 - d.mouth)) : 0;
        ctx.fillStyle = '#101020'; ctx.fillRect(x + 18, y + 68, w - 36, 3 + open);
        ctx.fillStyle = lite; ctx.fillRect(x + 18, y + 67, w - 36, 1);
        if (open > 2) { ctx.fillStyle = '#ff4020'; ctx.fillRect(x + 22, y + 70, w - 44, open - 1); }
        // chin & cheeks
        ctx.fillStyle = dark; ctx.fillRect(x + 6, y + 60, 6, 20); ctx.fillRect(x + w - 12, y + 60, 6, 20);
        ctx.fillRect(x + 14, y + h - 10, w - 28, 4);
        ctx.restore();
      }
      function drawShot(ctx, s) {
        const a = s.t * 0.3, x = Math.round(s.x), y = Math.round(s.y);
        ctx.fillStyle = '#ff8040';
        for (let k = 0; k < 3; k++) { const aa = a + k * 2.094; ctx.fillRect(x + Math.round(Math.cos(aa) * 3) - 1, y + Math.round(Math.sin(aa) * 3) - 1, 2, 2); }
        ctx.fillStyle = '#ffff80'; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      function drawFx(ctx) {
        for (const f of g.fx) {
          if (f.kind === 'brick') {
            if (f.t < 6) { ctx.fillStyle = f.t & 1 ? '#ffffff' : f.col; ctx.fillRect(f.x + f.t, f.y + f.t / 2, BW - f.t * 2, BH - f.t); }
          } else if (f.kind === 'boom') {
            const r = f.t; ctx.fillStyle = f.t & 2 ? '#ffffff' : '#ff8020';
            for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), 2, 2); }
          } else if (f.kind === 'vaus') {
            const t = f.t;
            if (t < 24) {
              // Vaus shatters: pieces fly apart
              for (let k = 0; k < 10; k++) {
                const a = -Math.PI + k * Math.PI / 9;
                ctx.fillStyle = k & 1 ? '#ff3030' : '#c0c8d8';
                ctx.fillRect(Math.round(f.x + Math.cos(a) * t * 1.4) - 2, Math.round(f.y + Math.sin(a) * t * 0.9) - 1, 4, 3);
              }
            } else if (t < 70) {
              const r = (t - 24) * 0.6;
              ctx.fillStyle = t & 4 ? '#ffffff' : '#40c0ff';
              for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), 1, 1); }
            }
          }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, FY0 - 8);
        text(ctx, '1UP', 30, 0, (frame >> 4) & 1 || mode !== 'game' ? '#ff2020' : '#000');
        text(ctx, String(g ? g.score : 0).padStart(6, ' '), 52, 8, '#ffffff', 1, 'right');
        text(ctx, 'HIGH SCORE', 136, 0, '#ff2020', 1, 'center');
        text(ctx, String(hi), 136, 8, '#ffffff', 1, 'center');
      }
      function drawField(ctx) {
        ctx.drawImage(g.doh ? DOH_BG : BG_IMG[(g.round - 1) % 4], FX0, FY0);
        drawBricks(ctx);
        drawDoh(ctx);
        for (const e of g.enemies) drawEnemy(ctx, e);
        for (const c of g.caps) drawCap(ctx, c);
        ctx.fillStyle = '#ffff60';
        for (const l of g.lasers) { ctx.fillRect(Math.round(l.x), Math.round(l.y), 1, 5); ctx.fillStyle = '#ff8020'; ctx.fillRect(Math.round(l.x), Math.round(l.y) + 3, 1, 2); ctx.fillStyle = '#ffff60'; }
        for (const s of g.shots) drawShot(ctx, s);
        const v = g.vaus;
        if (g.phase === 'intro' && g.t > 90) {
          // Vaus materialises
          const k = (150 - g.t) / 60;
          ctx.globalAlpha = Math.max(0.2, Math.min(1, k));
          drawVaus(ctx, v.x, VY, v.w, v.mode);
          ctx.globalAlpha = 1;
        } else if (g.phase !== 'dying' && g.phase !== 'hold' && g.phase !== 'over' && g.phase !== 'ending') {
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, FX1 + (g.warp ? 8 : 0), H); ctx.clip();
          drawVaus(ctx, v.x, VY, v.w, v.mode);
          ctx.restore();
        }
        if (g.phase === 'intro' || g.phase === 'play') for (const b of g.balls) drawBall(ctx, b);
        drawFx(ctx);
        drawWalls(ctx);
        // lives & round
        for (let i = 0; i < Math.min(8, g.lives - 1); i++) {
          const x = FX0 + 2 + i * 18;
          ctx.fillStyle = '#ff3030'; ctx.fillRect(x, 250, 3, 4); ctx.fillRect(x + 13, 250, 3, 4);
          ctx.fillStyle = '#c0c8d8'; ctx.fillRect(x + 3, 250, 10, 4);
        }
        text(ctx, 'ROUND ' + g.round, FX1 - 2, 248, '#ffffff', 1, 'right');
      }
      function drawLogo(ctx, y) {
        const bands = [[0, 4, '#ffffff'], [4, 9, '#c0d0ff'], [9, 14, '#6080ff'], [14, 21, '#3040c0']];
        text(ctx, 'ARKANOID', W / 2 + 2, y + 2, '#800000', 3, 'center');
        text(ctx, 'ARKANOID', W / 2 + 1, y + 1, '#ff2020', 3, 'center');
        for (const [a, b, c] of bands) {
          ctx.save(); ctx.beginPath(); ctx.rect(0, y + a, W, b - a); ctx.clip();
          text(ctx, 'ARKANOID', W / 2, y, c, 3, 'center');
          ctx.restore();
        }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        // starfield
        for (let i = 0; i < 60; i++) {
          const sx = (i * 97 + (titleT >> 1) * (1 + (i & 1))) % W, sy = (i * 53) % H;
          ctx.fillStyle = i % 3 ? '#404080' : '#ffffff'; ctx.fillRect(sx, sy, 1, 1);
        }
        drawHUD(ctx);
        drawLogo(ctx, 40);
        // story crawl
        const lines = ['THE ERA AND TIME OF', 'THIS STORY IS UNKNOWN.', '', 'THE MOTHERSHIP ARKANOID', 'WAS DESTROYED. A SPACECRAFT', 'VAUS SCRAMBLED AWAY FROM IT,', 'BUT ONLY TO BE TRAPPED IN', 'THE VOID BY DOH...'];
        const shown = Math.floor(titleT / 6);
        let cc = 0;
        lines.forEach((ln, i) => {
          const n = Math.max(0, Math.min(ln.length, shown - cc)); cc += ln.length;
          text(ctx, ln.slice(0, n), W / 2, 78 + i * 10, '#c0c8ff', 1, 'center');
        });
        drawVaus(ctx, W / 2 - 16, 170, 32, 'normal');
        const bx = W / 2 + Math.sin(titleT * 0.05) * 30, by = 160 - Math.abs(Math.sin(titleT * 0.08)) * 26;
        drawBall(ctx, { x: bx, y: by });
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 192, '#ff4040', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 192, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 192, '#ffff60', 1, 'center');
        text(ctx, '1ST BONUS 20000 PTS', W / 2, 206, '#ffffff', 1, 'center');
        text(ctx, 'EVERY 60000 PTS', W / 2, 216, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1986 TAITO CORP', W / 2, 232, '#ff2020', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 8, 246, '#a0a0a0', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawField(ctx);
        drawHUD(ctx);
        if (mode === 'demo') {
          if ((frame >> 5) & 1) text(ctx, 'DEMO PLAY', W / 2, 180, '#ffffff', 1, 'center', '#000');
          return;
        }
        if (g.phase === 'intro') {
          text(ctx, g.doh ? 'FINAL ROUND' : 'ROUND ' + g.round, W / 2, 176, '#ffffff', 1, 'center', '#000');
          if (g.t < 90) text(ctx, 'READY', W / 2, 190, '#ff4040', 1, 'center', '#000');
          if (g.doh && g.t > 60) text(ctx, 'DEFEAT DOH!', W / 2, 162, '#ffff60', 1, 'center', '#000');
        }
        if (g.phase === 'clear' && (frame >> 3) & 1) text(ctx, 'ROUND CLEAR', W / 2, 180, '#ffff60', 1, 'center', '#000');
        if (g.phase === 'warp') text(ctx, 'BREAK! 10000', W / 2, 180, '#ff50ff', 1, 'center', '#000');
        if (g.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(FX0, 120, FX1 - FX0, 40);
          text(ctx, 'GAME OVER', W / 2, 128, '#ff4040', 2, 'center');
          text(ctx, 'SCORE ' + g.score, W / 2, 148, '#ffffff', 1, 'center');
        }
        if (g.phase === 'ending') {
          ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(FX0, 40, FX1 - FX0, 160);
          const lines = ['DIMENSION-CONTROLLING', 'FORT DOH HAS NOW BEEN', 'DEMOLISHED, AND TIME', 'STARTED FLOWING REVERSELY.', '', 'VAUS MANAGED TO ESCAPE', 'FROM THE DISTORTED SPACE.', '', 'BUT THE REAL VOYAGE OF', 'ARKANOID IN THE GALAXY', 'HAS ONLY STARTED...'];
          const shown = Math.floor((900 - g.t) / 4); let cc = 0;
          lines.forEach((ln, i) => { const n = Math.max(0, Math.min(ln.length, shown - cc)); cc += ln.length; text(ctx, ln.slice(0, n), W / 2, 50 + i * 12, '#c0c8ff', 1, 'center'); });
          if (g.t < 300) text(ctx, 'CONGRATULATIONS!', W / 2, 186, (frame >> 3) & 1 ? '#ffff60' : '#ff8040', 1, 'center');
        }
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode, start: () => { newGame(false); mode = 'game'; }, hit: (r, c) => hitBrick(r, c), doh: () => damageDoh(), cap: k => applyCap(k), lose: () => loseLife() });
      return { update, render, destroy() { } };
    }
  });
})();
