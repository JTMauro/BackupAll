// Out Run (Sega, 1986) \u2014 from-scratch recreation. Pseudo-3D road with curves, hills and scaled roadside
// sprites. Drive a red convertible through five stages; at the end of each stage the road forks and you choose
// the left or right route across a 15-stage pyramid to one of five goals. Checkpoints extend the timer, LOW/HIGH
// gearbox, traffic to weave through, and a radio tune chosen at the start (original synthesized melodies).
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
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5);

  // ---------- pre-rendered roadside sprites (pixel art drawn with rects) ----------
  function spr(w, h, draw) { const [c, x] = mkCanvas(w, h); draw((px, py, pw, ph, col) => { x.fillStyle = col; x.fillRect(px, py, pw, ph); }); return c; }
  const SPR = {
    palm: spr(28, 56, r => { r(13, 16, 3, 40, '#8a5a2a'); r(14, 16, 1, 40, '#b07a40'); for (let i = 0; i < 6; i++) r(13, 18 + i * 6, 3, 1, '#5a3a1a');
      r(2, 10, 12, 3, '#2a9a30'); r(15, 10, 12, 3, '#2a9a30'); r(0, 13, 4, 4, '#1a7a20'); r(24, 13, 4, 4, '#1a7a20'); r(6, 6, 16, 4, '#38b838'); r(10, 3, 8, 3, '#38b838'); r(4, 12, 6, 2, '#38b838'); r(18, 12, 6, 2, '#38b838'); r(12, 14, 4, 3, '#704010'); }),
    tree: spr(28, 34, r => { r(12, 22, 4, 12, '#6a4020'); r(4, 6, 20, 16, '#2a8a2a'); r(1, 10, 26, 10, '#2a8a2a'); r(7, 2, 14, 6, '#38a838'); r(6, 8, 6, 4, '#48c048'); r(18, 16, 6, 4, '#1a6a1a'); }),
    autumn: spr(28, 34, r => { r(12, 22, 4, 12, '#6a4020'); r(4, 6, 20, 16, '#e07020'); r(1, 10, 26, 10, '#e07020'); r(7, 2, 14, 6, '#f0a030'); r(6, 8, 6, 4, '#ffc040'); r(18, 16, 6, 4, '#b04010'); }),
    pine: spr(18, 40, r => { r(8, 32, 3, 8, '#5a3a1a'); for (let i = 0; i < 4; i++) r(8 - i * 2 - 1, 4 + i * 7, 4 + i * 4 + 2, 8, '#1a6a3a'); r(8, 0, 2, 6, '#1a6a3a'); }),
    snowpine: spr(18, 40, r => { r(8, 32, 3, 8, '#5a3a1a'); for (let i = 0; i < 4; i++) { r(8 - i * 2 - 1, 4 + i * 7, 4 + i * 4 + 2, 8, '#1a5a3a'); r(8 - i * 2 - 1, 4 + i * 7, 4 + i * 4 + 2, 2, '#ffffff'); } r(8, 0, 2, 6, '#fff'); }),
    rock: spr(36, 22, r => { r(4, 6, 28, 16, '#8a6a50'); r(0, 12, 36, 10, '#8a6a50'); r(8, 2, 16, 6, '#a08060'); r(6, 8, 10, 4, '#b89878'); r(20, 14, 12, 8, '#604838'); }),
    redrock: spr(36, 40, r => { r(6, 4, 24, 36, '#b04828'); r(2, 16, 32, 24, '#b04828'); r(10, 0, 12, 6, '#d06838'); r(8, 6, 8, 20, '#d06838'); r(24, 20, 8, 20, '#802818'); }),
    cactus: spr(16, 30, r => { r(6, 2, 4, 28, '#2a8a3a'); r(7, 2, 1, 28, '#48b858'); r(1, 10, 3, 10, '#2a8a3a'); r(1, 18, 5, 3, '#2a8a3a'); r(12, 6, 3, 10, '#2a8a3a'); r(10, 14, 5, 3, '#2a8a3a'); }),
    column: spr(14, 44, r => { r(1, 0, 12, 4, '#e8e0d0'); r(3, 4, 8, 36, '#d8d0c0'); r(4, 4, 2, 36, '#f0e8e0'); r(9, 4, 1, 36, '#a8a090'); r(0, 40, 14, 4, '#c8c0b0'); }),
    house: spr(40, 40, r => { r(4, 14, 32, 26, '#f0e0c0'); r(0, 10, 40, 6, '#c04030'); r(6, 4, 28, 8, '#c04030'); r(10, 20, 6, 8, '#4080c0'); r(24, 20, 6, 8, '#4080c0'); r(17, 28, 6, 12, '#704020'); }),
    windmill: spr(32, 48, r => { r(11, 16, 10, 32, '#e8e8e8'); r(10, 12, 12, 6, '#c03030'); r(15, 2, 2, 28, '#704020'); r(2, 15, 28, 2, '#704020'); r(15, 2, 6, 12, '#f0f0f0'); r(2, 17, 12, 6, '#f0f0f0'); }),
    vine: spr(20, 14, r => { r(0, 10, 20, 4, '#6a4020'); r(1, 2, 18, 9, '#3a8a2a'); r(3, 5, 3, 3, '#8040a0'); r(12, 4, 3, 3, '#8040a0'); r(8, 7, 3, 3, '#8040a0'); }),
    bush: spr(24, 12, r => { r(2, 2, 20, 10, '#2a7a2a'); r(0, 6, 24, 6, '#2a7a2a'); r(6, 0, 10, 4, '#3a9a3a'); }),
    board: spr(40, 34, r => { r(4, 18, 3, 16, '#606060'); r(33, 18, 3, 16, '#606060'); r(0, 0, 40, 20, '#f0f0f0'); r(1, 1, 38, 18, '#1040c0'); r(3, 4, 34, 3, '#ffe040'); r(3, 9, 22, 3, '#ffffff'); r(3, 14, 28, 2, '#ff4040'); }),
    lamp: spr(10, 44, r => { r(4, 4, 2, 40, '#808080'); r(0, 2, 10, 3, '#a0a0a0'); r(1, 5, 4, 2, '#ffffa0'); })
  };
  // traffic (rear views)
  function carSprite(body, dark) {
    return spr(32, 18, r => { r(4, 2, 24, 7, body); r(7, 0, 18, 3, dark); r(9, 1, 14, 2, '#80c0e0'); r(1, 8, 30, 7, body); r(2, 9, 4, 2, '#ff2020'); r(26, 9, 4, 2, '#ff2020'); r(10, 11, 12, 2, '#e0e0e0'); r(1, 14, 30, 1, dark); r(3, 15, 6, 3, '#101010'); r(23, 15, 6, 3, '#101010'); });
  }
  const TRAFFIC = [
    { img: carSprite('#3060e0', '#183080'), ww: 520 }, { img: carSprite('#f0d020', '#a08010'), ww: 520 },
    { img: carSprite('#30b040', '#187020'), ww: 520 }, { img: carSprite('#e0e0e0', '#808080'), ww: 520 },
    { img: spr(30, 32, r => { r(1, 0, 28, 24, '#d0d0d0'); r(2, 1, 26, 22, '#e8e8e8'); r(4, 6, 22, 4, '#3060c0'); r(0, 24, 30, 4, '#404040'); r(2, 25, 4, 2, '#ff2020'); r(24, 25, 4, 2, '#ff2020'); r(3, 28, 7, 4, '#101010'); r(20, 28, 7, 4, '#101010'); }), ww: 640 },
    { img: spr(30, 26, r => { r(2, 2, 26, 16, '#e06020'); r(4, 0, 22, 4, '#a04010'); r(6, 4, 18, 5, '#80c0e0'); r(0, 16, 30, 5, '#e06020'); r(2, 17, 4, 2, '#ff2020'); r(24, 17, 4, 2, '#ff2020'); r(3, 21, 7, 5, '#101010'); r(20, 21, 7, 5, '#101010'); }), ww: 560 }
  ];
  // the player's red convertible, rear view, 3 steering frames
  function playerCar(steer) {
    const [c, x] = mkCanvas(72, 36);
    const r = (px, py, pw, ph, col) => { x.fillStyle = col; x.fillRect(px, py, pw, ph); };
    const s = steer * 2;
    r(22 + s, 3, 9, 8, '#f0c040'); r(24 + s, 2, 6, 3, '#f8d860'); r(21 + s, 7, 2, 7, '#f0c040');      // blonde passenger
    r(41 + s, 2, 8, 8, '#603010'); r(42 + s, 9, 6, 3, '#ffc890');                                    // driver
    r(18 + s, 10, 36, 4, '#202020');
    r(6, 12, 60, 10, '#e01818'); r(10 + s, 9, 52, 4, '#e01818'); r(4, 17, 64, 8, '#d01010');
    r(8, 13, 56, 2, '#ff6060');
    r(7, 18, 10, 4, '#ff3030'); r(55, 18, 10, 4, '#ff3030'); r(8, 19, 8, 2, '#ffd0a0'); r(56, 19, 8, 2, '#ffd0a0');
    r(20, 19, 32, 5, '#202020'); r(22, 20, 28, 1, '#606060'); r(22, 22, 28, 1, '#606060');
    r(4, 25, 64, 3, '#901010');
    r(2 - s, 24, 13, 12, '#101010'); r(57 - s, 24, 13, 12, '#101010'); r(4 - s, 26, 3, 8, '#404040'); r(65 - s, 26, 3, 8, '#404040');
    r(28, 26, 6, 2, '#a0a0a0'); r(38, 26, 6, 2, '#a0a0a0');
    return c;
  }
  const PCAR = [playerCar(-1), playerCar(0), playerCar(1)];

  // ---------- stages (pyramid of 15) ----------
  const STAGES = [
    { n: 'COCONUT BEACH', sky: ['#2080ff', '#a0d8ff'], bg: '#1060c0', bg2: '#f0e0a0', g1: '#e8d8a0', g2: '#d8c890', r1: '#ff3030', r2: '#f0f0f0', road: '#707078', road2: '#68686f', sc: ['palm', 'palm', 'bush', 'board'], sea: true },
    { n: 'GATEWAY', sky: ['#3088f0', '#b0d8f0'], bg: '#607088', bg2: '#8898a8', g1: '#40a040', g2: '#389838', r1: '#f0f0f0', r2: '#303030', road: '#686870', road2: '#606068', sc: ['tree', 'rock', 'lamp', 'board'] },
    { n: "DEVIL'S CANYON", sky: ['#e07040', '#f8c890'], bg: '#a04020', bg2: '#c06030', g1: '#c08050', g2: '#b07040', r1: '#f0f0f0', r2: '#c02020', road: '#706060', road2: '#685858', sc: ['redrock', 'redrock', 'cactus', 'rock'] },
    { n: 'DESOLATION HILL', sky: ['#5090d0', '#d0e0e8'], bg: '#808070', bg2: '#a0a088', g1: '#a8a060', g2: '#989050', r1: '#f0f0f0', r2: '#303030', road: '#707070', road2: '#686868', sc: ['rock', 'bush', 'cactus', 'tree'] },
    { n: 'ALPINE', sky: ['#4090ff', '#d0f0ff'], bg: '#e8f0ff', bg2: '#8090b0', g1: '#e8f0f8', g2: '#d8e0f0', r1: '#ff3030', r2: '#f0f0f0', road: '#686878', road2: '#606070', sc: ['snowpine', 'snowpine', 'pine', 'rock'] },
    { n: 'CLOUDY MOUNTAIN', sky: ['#90a0b0', '#d8dce0'], bg: '#606878', bg2: '#808898', g1: '#507850', g2: '#487048', r1: '#f0f0f0', r2: '#404040', road: '#606068', road2: '#585860', sc: ['pine', 'rock', 'pine', 'lamp'] },
    { n: 'WILDERNESS', sky: ['#4890e8', '#e0e8c0'], bg: '#a08040', bg2: '#c0a060', g1: '#c0a050', g2: '#b09040', r1: '#f0f0f0', r2: '#c02020', road: '#787068', road2: '#706860', sc: ['cactus', 'rock', 'bush', 'redrock'] },
    { n: 'OLD CAPITAL', sky: ['#3890f8', '#c0e0ff'], bg: '#8070a0', bg2: '#a090b0', g1: '#50a050', g2: '#489848', r1: '#ffd040', r2: '#303030', road: '#707070', road2: '#686868', sc: ['column', 'column', 'house', 'tree'] },
    { n: 'AUTUMN FOREST', sky: ['#5098f0', '#f0e0c0'], bg: '#a05020', bg2: '#c07030', g1: '#90a040', g2: '#809038', r1: '#f0f0f0', r2: '#c02020', road: '#706860', road2: '#686058', sc: ['autumn', 'autumn', 'tree', 'house'] },
    { n: 'SEASIDE TOWN', sky: ['#2088ff', '#a8e0ff'], bg: '#1060c0', bg2: '#e0e0e0', g1: '#d8d0b0', g2: '#c8c0a0', r1: '#ff3030', r2: '#f0f0f0', road: '#707078', road2: '#68686f', sc: ['house', 'palm', 'lamp', 'house'], sea: true },
    { n: 'VINEYARD', sky: ['#3898ff', '#e0f0ff'], bg: '#5a8a40', bg2: '#80a050', g1: '#70a040', g2: '#689838', r1: '#f0f0f0', r2: '#30a030', road: '#707070', road2: '#686868', sc: ['vine', 'vine', 'windmill', 'house'], goal: 'A' },
    { n: 'DEATH VALLEY', sky: ['#f08040', '#ffe0a0'], bg: '#c06030', bg2: '#d08040', g1: '#d0a060', g2: '#c09050', r1: '#f0f0f0', r2: '#c02020', road: '#786860', road2: '#706058', sc: ['cactus', 'redrock', 'rock', 'cactus'], goal: 'B' },
    { n: 'DESERT', sky: ['#40a0ff', '#fff0c0'], bg: '#e0c080', bg2: '#f0d090', g1: '#f0d898', g2: '#e8d090', r1: '#ff8030', r2: '#f0f0f0', road: '#787070', road2: '#706868', sc: ['cactus', 'cactus', 'rock', 'palm'], goal: 'C' },
    { n: 'ALPS', sky: ['#3080ff', '#e0f0ff'], bg: '#f0f8ff', bg2: '#a0b0d0', g1: '#60a060', g2: '#589858', r1: '#ff3030', r2: '#f0f0f0', road: '#686870', road2: '#606068', sc: ['snowpine', 'pine', 'house', 'windmill'], goal: 'D' },
    { n: 'LAKESIDE', sky: ['#2890ff', '#c8f0ff'], bg: '#2070d0', bg2: '#60a0e0', g1: '#50b050', g2: '#48a848', r1: '#f0f0f0', r2: '#3060e0', road: '#707078', road2: '#68686f', sc: ['tree', 'pine', 'house', 'bush'], goal: 'E', sea: true }
  ];
  const sid = (L, b) => L * (L + 1) / 2 + b;

  ArcadeRegistry.register({
    id: 'outrun', title: 'Out Run', year: 1986, maker: 'Sega',
    width: 320, height: 224, vector: false, pointer: false,
    controls: 'Up/Space: accelerate \u00b7 Down: brake \u00b7 Left/Right: steer (and pick the fork) \u00b7 X: LOW/HIGH gear \u00b7 Enter: start',
    marquee: { bg: '#1060c0', fg: '#ffffff', accent: '#ff3030' },
    create(api) {
      const W = 320, H = 224, SEG = 200, ROADW = 2000, CAMH = 1000, DRAW = 150, FOV = 100;
      const DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
      const PZ = CAMH * DEPTH;                 // player distance in front of the camera
      const MAXV = SEG * 0.62;                 // units/frame at 293 km/h
      const STAGE_SEGS = 1150, FORK_SEGS = 170, SEPMAX = 3.2;
      const audio = api.audio;
      let hi = api.getHiScore(10000000);
      let mode = 'title', modeT = 0, coinFlash = 0, demo = true;
      let segs = [], cars = [], pos = 0, px = 0, speed = 0, gear = 0, score = 0, timeLeft = 0, lapT = 0;
      let L = 0, B = 0, route = [], forkSide = 0, decided = false, cur = null, nxt = null;
      let crash = null, shake = 0, msg = null, tune = 0, bgmT = 0, steerVis = 0, skid = 0, engT = 0, ext = 0, bonusTally = 0, cpPassed = null;

      // ---------- music (three original radio tunes) ----------
      const TUNES = [
        { name: 'SUNSET BREEZE', freq: '88.3', mel: [[659, .2], [784, .2], [880, .4], [784, .2], [659, .2], [587, .4], [523, .2], [587, .2], [659, .2], [784, .2], [659, .8],
          [587, .2], [659, .2], [698, .4], [659, .2], [587, .2], [523, .4], [494, .2], [523, .2], [587, .2], [659, .2], [523, .8]],
          bass: [[131, .4], [196, .4], [131, .4], [196, .4], [175, .4], [262, .4], [175, .4], [262, .4], [147, .4], [220, .4], [147, .4], [220, .4], [196, .4], [247, .4], [131, .8]] },
        { name: 'SURF SIGNAL', freq: '93.7', mel: [[784, .15], [784, .15], [988, .3], [880, .15], [784, .15], [659, .3], [784, .15], [880, .15], [988, .15], [1175, .15], [988, .6],
          [880, .15], [880, .15], [1047, .3], [988, .15], [880, .15], [784, .3], [659, .15], [740, .15], [784, .15], [880, .15], [784, .6]],
          bass: [[196, .3], [294, .3], [196, .3], [294, .3], [165, .3], [247, .3], [165, .3], [247, .3], [147, .3], [220, .3], [147, .3], [220, .3], [196, .3], [294, .3], [196, .6]] },
        { name: 'STARLIGHT CRUISE', freq: '101.5', mel: [[523, .25], [659, .25], [784, .25], [1047, .25], [988, .5], [784, .25], [880, .25], [784, .5], [659, .5],
          [587, .25], [698, .25], [880, .25], [1047, .25], [988, .5], [880, .25], [784, .25], [659, 1.0]],
          bass: [[131, .5], [165, .5], [196, .5], [165, .5], [147, .5], [175, .5], [220, .5], [196, .5], [131, 1.0]] }
      ];
      function playTune(i) {
        const t = TUNES[i];
        const l1 = audio.melody(t.mel, { type: 'square', vol: 0.045 });
        audio.melody(t.bass, { type: 'triangle', vol: 0.09 });
        return l1;
      }

      // ---------- track building ----------
      function lastY() { return segs.length ? segs[segs.length - 1].p2y : 0; }
      function addSeg(curve, y, st, extra) {
        const n = segs.length;
        const s = { i: n, curve, p1y: lastY(), p2y: y, sprites: [], st, fork: 0, cx: 0, gate: null };
        if (extra) Object.assign(s, extra);
        segs.push(s);
        return s;
      }
      function addRoad(enter, hold, leave, curve, hill, st, extra) {
        const sy = lastY(), ey = sy + hill * SEG, total = enter + hold + leave;
        for (let n = 0; n < enter; n++) addSeg(easeIO(0, curve, n / enter), easeIO(sy, ey, n / total), st, extra);
        for (let n = 0; n < hold; n++) addSeg(curve, easeIO(sy, ey, (enter + n) / total), st, extra);
        for (let n = 0; n < leave; n++) addSeg(easeIO(curve, 0, n / leave), easeIO(sy, ey, (enter + hold + n) / total), st, extra);
      }
      // builds one stage (plus its fork, or the goal) and appends it; returns its segment indices
      function buildStage(lv, br, cx) {
        const info = { first: segs.length, end: 0, forkStart: 1e9, forkEnd: 1e9, goal: 1e9 };
        const st = sid(lv, br);
        const th = STAGES[st];
        let s = (st * 9301 + 49297) % 233280; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
        const start = segs.length;
        const ex = { cx };
        addRoad(10, 30, 10, 0, 0, st, ex);
        const first = start;
        segs[first + 4].gate = lv === 0 ? 'START' : 'CHECKPOINT';
        while (segs.length - start < STAGE_SEGS) {
          const len = [15, 25, 40, 50][Math.floor(R() * 4)];
          const curve = R() < 0.25 ? 0 : (R() < 0.5 ? -1 : 1) * [2, 3, 4, 6][Math.floor(R() * (2 + Math.min(2, lv)))];
          const hill = R() < 0.35 ? 0 : (R() - 0.5) * (40 + lv * 12);
          addRoad(len, len, len, curve, Math.round(hill), st, ex);
        }
        addRoad(20, 20, 20, 0, -lastY() / SEG * 0.5, st, ex);
        // roadside scenery
        for (let n = start + 8; n < segs.length; n += 1 + Math.floor(R() * 3)) {
          const type = th.sc[Math.floor(R() * th.sc.length)];
          const side = R() < 0.5 ? -1 : 1;
          segs[n].sprites.push({ img: SPR[type], off: side * (1.25 + R() * 1.6), ww: type === 'board' || type === 'house' ? 900 : type === 'bush' || type === 'vine' ? 500 : 700 });
          if (R() < 0.35) segs[n].sprites.push({ img: SPR[th.sc[0]], off: -side * (1.3 + R() * 2), ww: 700 });
        }
        const end = segs.length;
        if (lv < 4) {
          // the fork: two roads drift apart; a sign in the middle
          const fs = segs.length;
          addRoad(0, FORK_SEGS, 0, 0, 0, st, ex);
          for (let k = 0; k < FORK_SEGS; k++) { const t = k / FORK_SEGS; segs[fs + k].fork = SEPMAX * (t < 0.15 ? 0 : easeIO(0, 1, (t - 0.15) / 0.85)); segs[fs + k].sprites = []; }
          segs[fs + 6].gate = 'FORK';
          for (let k = 74; k < FORK_SEGS; k += 6) segs[fs + k].sprites.push({ img: SPR[th.sc[0]], off: 0, ww: 650, mid: true });
          info.forkStart = fs; info.forkEnd = segs.length;
        } else {
          addRoad(10, 60, 10, 0, 0, st, ex);
          segs[end + 6].gate = 'GOAL';
          info.goal = end + 6;
          addRoad(0, 200, 0, 0, 0, st, ex);
        }
        info.end = end;
        return info;
      }
      function spawnTraffic(fromSeg, toSeg, lv) {
        let s = fromSeg * 17 + lv; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
        const n = Math.floor((toSeg - fromSeg) / (34 - lv * 3));
        for (let k = 0; k < n; k++) {
          const z = (fromSeg + 60 + R() * (toSeg - fromSeg - 80)) * SEG;
          const lane = [-0.66, -0.22, 0.22, 0.66][Math.floor(R() * 4)];
          cars.push({ z, x: lane, lane, v: MAXV * (0.28 + R() * 0.25), t: TRAFFIC[Math.floor(R() * TRAFFIC.length)], wob: R() * 6 });
        }
      }
      function segAt(z) { return segs[clamp(Math.floor(z / SEG), 0, segs.length - 1)]; }

      // ---------- game flow ----------
      function resetDrive() {
        segs = []; cars = []; pos = 0; px = 0; speed = 0; gear = 0; crash = null; L = 0; B = 0; route = [0]; decided = false; forkSide = 0;
        cur = buildStage(0, 0, 0); nxt = null;
        spawnTraffic(0, cur.end, 0);
      }
      function startTitle() { mode = 'title'; modeT = 0; demo = true; resetDrive(); speed = MAXV * 0.5; gear = 1; }
      function startRadio() { mode = 'radio'; modeT = 0; demo = false; resetDrive(); score = 0; bgmT = 0; }
      function startRace() {
        mode = 'count'; modeT = 0; timeLeft = 80; lapT = 0; score = 0; speed = 0; gear = 0; cpPassed = null;
        bgmT = 0;
      }
      function say(t, f, col) { msg = { t, f: f || 120, col: col || '#ffe040' }; }

      function doCrash(kind) {
        if (crash) return;
        crash = { kind, t: 0, dur: kind === 'flip' ? 150 : 80, spd: speed };
        shake = kind === 'flip' ? 24 : 10;
        if (kind === 'flip') { audio.noise(1.0, { vol: 0.4, freq: 1500, slideTo: 80 }); audio.tone(120, 0.6, { type: 'sawtooth', vol: 0.15, slideTo: 40 }); }
        else { audio.noise(0.4, { vol: 0.3, freq: 3000, slideTo: 400 }); audio.tone(300, 0.3, { type: 'square', vol: 0.1, slideTo: 100 }); }
      }

      // ---------- driving ----------
      function aiInput() {
        const sg = segAt(pos + PZ);
        const ahead = segAt(pos + PZ + SEG * 12);
        let target = -ahead.curve * 0.08;
        if (sg.fork > 0.4 && !decided) target = (route.length & 1 ? 1 : -1) * sg.fork;
        else if (sg.fork > 0.4) target = forkSide * sg.fork;
        for (const c of cars) { const dz = c.z - (pos + PZ); if (dz > 0 && dz < SEG * 14 && Math.abs(c.x - target) < 0.35) target += c.x > px ? -0.4 : 0.4; }
        return { left: px > target + 0.06, right: px < target - 0.06, gas: true, brake: false, shift: (gear === 0 && speed > MAXV * 0.6) || (gear === 1 && speed < MAXV * 0.3) };
      }
      function roadOffsets(sg) {
        if (sg.fork <= 0) return [0];
        if (!decided) return [-sg.fork, sg.fork];
        return [forkSide * sg.fork, -forkSide * sg.fork];
      }
      function updateDrive(inp) {
        const sp = speed / MAXV;
        const sg = segAt(pos + PZ);
        if (crash) {
          crash.t++;
          speed = Math.max(0, speed - MAXV * (crash.kind === 'flip' ? 0.02 : 0.012));
          if (crash.kind === 'flip') { speed = Math.max(0, crash.spd * (1 - crash.t / 60)); }
          pos += speed;
          if (crash.t >= crash.dur) {
            if (crash.kind === 'flip') { const offs = roadOffsets(sg); let best = offs[0]; for (const o of offs) if (Math.abs(o - px) < Math.abs(best - px)) best = o; px = best; speed = 0; }
            crash = null;
          }
        } else {
          // gearbox: LOW pulls hard up to 190 km/h, HIGH is slow off the line but tops out at 293
          if (inp.shift) { gear ^= 1; audio.tone(gear ? 180 : 260, 0.08, { type: 'square', vol: 0.1 }); }
          let acc = 0;
          if (inp.gas) {
            if (gear === 0) acc = sp < 0.65 ? MAXV * 0.0075 : -MAXV * 0.002;
            else acc = sp < 0.35 ? MAXV * 0.0018 : MAXV * 0.0045 * (1.05 - sp);
          } else acc = -MAXV * 0.0025;
          if (inp.brake) acc = -MAXV * 0.012;
          speed = clamp(speed + acc, 0, MAXV);
          const dx = 0.032 * (0.3 + sp);
          if (inp.left) px -= dx * (sp > 0.02 ? 1 : 0); else if (inp.right) px += dx * (sp > 0.02 ? 1 : 0);
          steerVis = inp.left ? -1 : inp.right ? 1 : 0;
          px -= dx * sp * sg.curve * 0.21;                       // centrifugal drift
          // off-road?
          const offs = roadOffsets(sg);
          let near = 99; for (const o of offs) near = Math.min(near, Math.abs(px - o));
          if (near > 1.05) { if (speed > MAXV * 0.35) speed -= MAXV * 0.012; if (api.frame % 6 === 0) shake = 2; }
          px = clamp(px, -4.5 - (sg.fork || 0), 4.5 + (sg.fork || 0));
          if (Math.abs(sg.curve) > 3 && sp > 0.75 && (inp.left || inp.right)) { skid++; if (skid % 10 === 1) audio.noise(0.15, { vol: 0.08, freq: 3000, type: 'highpass' }); } else skid = 0;
          pos += speed;
          // scenery collision when off-road
          if (near > 1.0) {
            const cs = segAt(pos + PZ);
            for (const s of cs.sprites) {
              const so = s.mid ? 0 : s.off;
              const w = s.ww / ROADW * 0.5;
              if (Math.abs(px - so) < w + 0.12) { doCrash('flip'); break; }
            }
          }
          // traffic collision
          for (const c of cars) {
            const dz = c.z - (pos + PZ);
            if (dz > -SEG * 0.3 && dz < SEG * 0.6 && Math.abs(c.x - px) < 0.32 && speed > c.v) { doCrash('spin'); speed = c.v * 0.5; c.z += SEG; break; }
          }
          if (!demo) score += Math.round(sp * 293) * 3;
        }
        // the fork: decide the route, then re-centre on the chosen road
        const ci = Math.floor((pos + PZ) / SEG);
        if (L < 4 && !decided && ci >= cur.forkStart + FORK_SEGS * 0.45) {
          decided = true; forkSide = px < 0 ? -1 : 1;
          const nb = B + (forkSide > 0 ? 1 : 0);
          nxt = buildStage(L + 1, nb, forkSide * SEPMAX);
          spawnTraffic(nxt.first, nxt.end, L + 1);
          route.push(nb);
          if (!demo) say(forkSide < 0 ? 'LEFT ROUTE' : 'RIGHT ROUTE', 90, '#fff');
          audio.tone(880, 0.08, { type: 'square', vol: 0.08 });
        }
        if (decided && ci >= cur.forkEnd) {
          // drop the old stage, recentre everything on the chosen branch
          const keep = 12, cut = cur.forkEnd - keep;
          segs = segs.slice(cut); segs.forEach((s, i) => { s.i = i; s.cx = i < keep ? -forkSide * SEPMAX : 0; });
          pos -= cut * SEG; px -= forkSide * SEPMAX;
          cars = cars.filter(c => c.z / SEG >= cut).map(c => (c.z -= cut * SEG, c));
          L++; B = route[route.length - 1]; decided = false;
          cur = { first: nxt.first - cut, end: nxt.end - cut, forkStart: nxt.forkStart - cut, forkEnd: nxt.forkEnd - cut, goal: nxt.goal - cut };
          nxt = null;
        }
        // checkpoint gates extend the timer
        const gs = segAt(pos + PZ);
        if (gs.gate === 'CHECKPOINT' && cpPassed !== gs && !demo) {
          cpPassed = gs;
          ext = Math.max(50, 68 - L * 4); timeLeft += ext;
          say('EXTENDED PLAY', 150, '#ffe040');
          audio.melody([[784, .1], [988, .1], [1175, .1], [1568, .3]], { type: 'square', vol: 0.12 });
        }
        // traffic
        for (const c of cars) {
          c.z += c.v; c.wob += 0.01;
          const cs = segAt(c.z);
          const offs = roadOffsets(cs);
          const base = offs.length > 1 ? offs.reduce((a, o) => Math.abs(o - c.x) < Math.abs(a - c.x) ? o : a, offs[0]) : 0;
          const tgt = base + c.lane + Math.sin(c.wob) * 0.05;
          c.x += clamp(tgt - c.x, -0.01, 0.01);
        }
        if (demo) { // keep the attract drive going forever
          if (L >= 4 && pos > (cur.goal - 200) * SEG) resetDrive();
          for (const c of cars) if (c.z < pos - SEG * 20) c.z += SEG * 300;
        }
        // engine note
        if (!demo && ++engT % 6 === 0) audio.tone(50 + sp * 160 + (gear ? 0 : 30), 0.11, { type: 'sawtooth', vol: 0.025 });
      }

      // ---------- update ----------
      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (msg && --msg.f <= 0) msg = null;
        if (shake > 0) shake--;
        const human = { left: api.key('ArrowLeft'), right: api.key('ArrowRight'), gas: api.key('ArrowUp') || api.key('Space'), brake: api.key('ArrowDown'), shift: api.pressed('KeyX') || api.pressed('KeyZ') };
        if (mode === 'title') {
          updateDrive(aiInput());
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { coinFlash = 0; startRadio(); }
            else { coinFlash = 90; audio.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (mode === 'radio') {
          if (api.pressed('ArrowLeft')) { tune = (tune + 2) % 3; bgmT = 0; audio.noise(0.08, { vol: 0.08, freq: 4000 }); }
          if (api.pressed('ArrowRight')) { tune = (tune + 1) % 3; bgmT = 0; audio.noise(0.08, { vol: 0.08, freq: 4000 }); }
          if (--bgmT <= 0) bgmT = Math.round(playTune(tune) * 60);
          if ((modeT > 20 && api.anyPressed('Enter', 'Space', 'ArrowUp', 'KeyX')) || modeT > 600) startRace();
          return;
        }
        if (mode === 'count') {
          if (modeT === 1 || modeT === 60 || modeT === 120) audio.tone(440, 0.25, { type: 'square', vol: 0.15 });
          if (modeT === 180) { audio.tone(880, 0.6, { type: 'square', vol: 0.18 }); mode = 'drive'; modeT = 0; }
          if (--bgmT <= 0) bgmT = Math.round(playTune(tune) * 60);
          return;
        }
        if (mode === 'drive') {
          if (--bgmT <= 0) bgmT = Math.round(playTune(tune) * 60);
          timeLeft -= 1 / 60; lapT += 1 / 60;
          updateDrive(human);
          if (L === 4 && pos + PZ >= cur.goal * SEG) { mode = 'goal'; modeT = 0; bonusTally = Math.floor(timeLeft); audio.melody([[523, .15], [659, .15], [784, .15], [1047, .3], [988, .15], [1047, .5]], { type: 'square', vol: 0.14 }); return; }
          if (timeLeft <= 0) { timeLeft = 0; mode = 'timeup'; modeT = 0; say('TIME UP', 200, '#ff4040'); audio.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: 0.14 }); }
          return;
        }
        if (mode === 'timeup') {
          updateDrive({ gas: false, brake: false, left: false, right: false });
          speed = Math.max(0, speed - MAXV * 0.004);
          if (modeT > 220) {
            if (api.offerContinue) api.offerContinue(() => { mode = 'drive'; modeT = 0; timeLeft = 60; say('CONTINUE', 90); }, gameOver);
            else gameOver();
          }
          return;
        }
        if (mode === 'goal') {
          updateDrive({ gas: false, brake: modeT > 40, left: px > 0.05, right: px < -0.05 });
          if (modeT > 90 && bonusTally > 0 && modeT % 3 === 0) { bonusTally--; score += 1000000 / 10; audio.tone(1500, 0.03, { vol: 0.07 }); }
          if (modeT > 600 || (modeT > 240 && bonusTally <= 0 && api.anyPressed('Enter', 'Space'))) gameOver();
          return;
        }
        if (mode === 'over') {
          updateDrive({ gas: false, brake: true, left: false, right: false });
          if (modeT > 300 || (modeT > 90 && api.anyPressed('Enter', 'Space'))) startTitle();
        }
      }
      function gameOver() {
        if (score > hi) { hi = score; }
        api.setHiScore(hi);
        mode = 'over'; modeT = 0;
      }

      // ---------- rendering ----------
      function project(x, y, z, camX, camY) {
        const cz = z - pos;
        const sc = DEPTH / cz;
        return { x: W / 2 + sc * (x - camX) * W / 2, y: H / 2 - sc * (y - camY) * H / 2, w: sc * ROADW * W / 2, sc, cz };
      }
      function quad(ctx, x1, y1, w1, x2, y2, w2, col) {
        ctx.fillStyle = col; ctx.beginPath();
        const yb = Math.round(y1) + 1, yt = Math.round(y2);
        ctx.moveTo(Math.round(x1 - w1), yb); ctx.lineTo(Math.round(x2 - w2), yt);
        ctx.lineTo(Math.round(x2 + w2), yt); ctx.lineTo(Math.round(x1 + w1), yb);
        ctx.closePath(); ctx.fill();
      }
      function drawBackground(ctx, th, curveAcc, yOff) {
        const g = ctx.createLinearGradient(0, 0, 0, H / 2 + 10);
        g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // clouds
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 6; i++) { const cx = ((i * 83 - curveAcc * 0.4) % 400 + 400) % 400 - 40; ctx.fillRect(Math.round(cx), 20 + (i % 3) * 14, 36, 6); ctx.fillRect(Math.round(cx) + 8, 16 + (i % 3) * 14, 18, 4); }
        const hz = Math.round(H / 2 + 6 + yOff);
        // distant mountains / sea
        ctx.fillStyle = th.bg2;
        for (let x = 0; x < W; x += 4) { const wx = x + curveAcc * 0.6; const h = 18 + Math.sin(wx * 0.017) * 10 + Math.sin(wx * 0.051) * 5; ctx.fillRect(x, hz - h, 4, h + 2); }
        ctx.fillStyle = th.bg;
        if (th.sea) ctx.fillRect(0, hz - 6, W, 8);
        else for (let x = 0; x < W; x += 4) { const wx = x + curveAcc * 1.0; const h = 10 + Math.sin(wx * 0.03 + 1) * 7; ctx.fillRect(x, hz - h, 4, h + 2); }

      }
      function renderRoad(ctx) {
        const baseI = Math.floor(pos / SEG);
        const base = segs[clamp(baseI, 0, segs.length - 1)];
        const bp = (pos % SEG) / SEG;
        const ps = segAt(pos + PZ);
        const pp = ((pos + PZ) % SEG) / SEG;
        const playerY = lerp(ps.p1y, ps.p2y, pp);
        const camY = playerY + CAMH;
        const camXw = px * ROADW;
        const th = STAGES[ps.st];
        drawBackground(ctx, th, bgScroll, 0);
        let x = 0, dx = -(base.curve * bp);
        let maxy = H;
        const list = [];
        for (let n = 0; n < DRAW; n++) {
          const i = baseI + n; if (i >= segs.length) break;
          if (i < 0) continue;
          const s = segs[i];
          const z1 = i * SEG, z2 = (i + 1) * SEG;
          if (z1 - pos < 1) { x += dx; dx += s.curve; continue; }
          const cxw = s.cx * ROADW;
          const p1 = project(x + cxw, s.p1y, z1, camXw, camY);
          const p2 = project(x + dx + cxw, s.p2y, z2, camXw, camY);
          x += dx; dx += s.curve;
          s.clip = maxy; s.scr = p1;
          list.push(s);
          if (p2.y >= maxy || p2.y >= p1.y) continue;
          const sth = STAGES[s.st];
          const alt = (i >> 2) & 1;
          const top = Math.max(0, Math.round(p2.y)), bot = Math.min(H, Math.round(p1.y) + 1);
          ctx.fillStyle = alt ? sth.g1 : sth.g2; ctx.fillRect(0, top, W, bot - top);
          const offs = s.fork > 0 ? (decided ? [forkSide * s.fork, -forkSide * s.fork] : [-s.fork, s.fork]) : [0];
          for (const o of offs) {
            const ox1 = p1.x + o * p1.w, ox2 = p2.x + o * p2.w;
            quad(ctx, ox1, p1.y, p1.w * 1.12, ox2, p2.y, p2.w * 1.12, alt ? sth.r1 : sth.r2);
            quad(ctx, ox1, p1.y, p1.w, ox2, p2.y, p2.w, alt ? sth.road : sth.road2);
            if (alt) for (const l of [-0.5, 0, 0.5]) quad(ctx, ox1 + l * p1.w, p1.y, p1.w * 0.018, ox2 + l * p2.w, p2.y, p2.w * 0.018, '#f0f0f0');
          }
          maxy = p2.y;
        }
        // sprites, cars and gates from far to near
        for (let k = list.length - 1; k >= 0; k--) {
          const s = list[k], p = s.scr;
          if (p.cz < 1) continue;
          const offs = s.fork > 0 ? (decided ? [forkSide * s.fork, -forkSide * s.fork] : [-s.fork, s.fork]) : [0];
          for (const sp of s.sprites) {
            const so = sp.mid ? (offs.length > 1 ? (offs[0] + offs[1]) / 2 : 0) : sp.off;
            drawScaled(ctx, sp.img, p.x + so * p.w, p.y, sp.ww * p.sc * W / 2, s.clip);
          }
          if (s.gate) drawGate(ctx, s, p, offs);
          for (const c of cars) {
            if (Math.floor(c.z / SEG) !== s.i) continue;
            drawScaled(ctx, c.t.img, p.x + c.x * p.w, p.y, c.t.ww * p.sc * W / 2, s.clip);
          }
        }

      }
      let bgScroll = 0;
      function drawScaled(ctx, img, cx, by, w, clip) {
        if (w < 1) return;
        const h = w * img.height / img.width;
        const x = cx - w / 2, y = by - h;
        if (y >= clip || x > W || x + w < 0) return;
        const visH = Math.min(h, clip - y);
        const srcH = img.height * visH / h;
        if (srcH < 0.5) return;
        ctx.drawImage(img, 0, 0, img.width, srcH, Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(visH)));
      }
      function drawGate(ctx, s, p, offs) {
        const g = s.gate;
        if (g === 'FORK') {
          // a route sign between the two roads
          const w = 0.9 * p.w, h = w * 0.45, cx = p.x, y = p.y - w * 0.9;
          if (y > s.clip) return;
          ctx.fillStyle = '#20a040'; ctx.fillRect(Math.round(cx - w / 2), Math.round(y), Math.round(w), Math.round(h));
          ctx.fillStyle = '#fff';
          ctx.fillRect(Math.round(cx - w * 0.4), Math.round(y + h * 0.4), Math.round(w * 0.25), Math.max(1, Math.round(h * 0.2)));
          ctx.fillRect(Math.round(cx + w * 0.15), Math.round(y + h * 0.4), Math.round(w * 0.25), Math.max(1, Math.round(h * 0.2)));
          ctx.fillStyle = '#606060'; ctx.fillRect(Math.round(cx - 1), Math.round(y + h), Math.max(1, Math.round(w * 0.04)), Math.round(w * 0.9 - h));
          return;
        }
        const left = p.x - p.w * 1.2, right = p.x + p.w * 1.2, pw = Math.max(1, p.w * 0.06);
        const top = p.y - p.w * 0.95, bh = p.w * 0.22;
        if (top > s.clip) return;
        const col = g === 'GOAL' ? '#e02020' : g === 'START' ? '#2040e0' : '#f0f0f0';
        ctx.fillStyle = '#808080'; ctx.fillRect(Math.round(left), Math.round(top), Math.round(pw), Math.round(Math.min(s.clip, p.y) - top)); ctx.fillRect(Math.round(right - pw), Math.round(top), Math.round(pw), Math.round(Math.min(s.clip, p.y) - top));
        ctx.fillStyle = col; ctx.fillRect(Math.round(left), Math.round(top), Math.round(right - left), Math.round(bh));
        const sc = Math.max(1, Math.floor(bh / 9));
        if (bh > 6) text(ctx, g, p.x, Math.round(top + (bh - 7 * sc) / 2), g === 'CHECKPOINT' ? '#e02020' : '#fff', sc, 'center');
      }
      function drawPlayer(ctx) {
        let fr = 1 + steerVis;
        const bounce = speed > 1 ? ((api.frame >> 1) & 1) * (speed > MAXV * 0.5 ? 1 : 0) : 0;
        const x = W / 2 - 36, y = H - 46 - bounce;
        if (crash) {
          ctx.save();
          if (crash.kind === 'spin') {
            const a = crash.t * 0.35;
            fr = [0, 1, 2, 1][Math.floor(a) & 3];
            ctx.drawImage(PCAR[fr], x + Math.sin(a) * 6, y);
          } else {
            const t = crash.t, air = t < 60 ? Math.sin(t / 60 * Math.PI) * 40 : 0;
            ctx.translate(W / 2, y + 18 - air);
            ctx.rotate(t < 60 ? t * 0.105 : 0);
            ctx.drawImage(PCAR[1], -36, -18);
            ctx.restore(); ctx.save();
            if (t < 90) { ctx.fillStyle = '#f0c040'; ctx.fillRect(W / 2 - 30 - t * 0.6, y - 10 - Math.sin(Math.min(1, t / 90) * Math.PI) * 50, 6, 6); ctx.fillStyle = '#603010'; ctx.fillRect(W / 2 + 26 + t * 0.6, y - 10 - Math.sin(Math.min(1, t / 90) * Math.PI) * 44, 6, 6); }
          }
          ctx.restore();
          return;
        }
        ctx.drawImage(PCAR[fr], x, y);
        if (skid > 4 && (api.frame & 2)) { ctx.fillStyle = 'rgba(220,220,220,0.7)'; ctx.fillRect(x, y + 32, 14, 4); ctx.fillRect(x + 58, y + 32, 14, 4); }
      }
      function drawMap(ctx, x0, y0) {
        for (let lv = 0; lv < 5; lv++) for (let b = 0; b <= lv; b++) {
          const x = x0 + (b - lv / 2) * 10, y = y0 + lv * 7;
          const on = route[lv] === b && lv <= L;
          const cur = lv === L && route[lv] === b;
          ctx.fillStyle = cur ? ((api.frame & 16) ? '#ffe040' : '#ff4040') : on ? '#ff4040' : '#405060';
          ctx.fillRect(Math.round(x) - 2, y, 5, 4);
        }
      }
      function drawHUD(ctx) {
        const kmh = Math.round(speed / MAXV * 293);
        textS(ctx, 'TIME', 6, 4, '#ffe040');
        const tl = Math.ceil(timeLeft);
        textS(ctx, String(Math.max(0, tl)), 6, 13, tl <= 10 && (api.frame & 16) ? '#ff3030' : '#ffe040', 2);
        textS(ctx, 'SCORE', 100, 4, '#7ff'); textS(ctx, String(score), 136, 4, '#fff');
        textS(ctx, 'LAP', 228, 4, '#7ff');
        const m = Math.floor(lapT / 60), s = Math.floor(lapT % 60), cs = Math.floor((lapT * 100) % 100);
        textS(ctx, m + "'" + String(s).padStart(2, '0') + '"' + String(cs).padStart(2, '0'), 250, 4, '#fff');
        textS(ctx, 'STAGE ' + (L + 1), 100, 14, '#fff');
        // speedometer + tachometer
        textS(ctx, String(kmh).padStart(3, ' '), 10, H - 18, '#fff', 2);
        textS(ctx, 'KM/H', 48, H - 12, '#ff8040');
        const bars = Math.round(kmh / 293 * 20);
        for (let i = 0; i < 20; i++) { ctx.fillStyle = i < bars ? (i < 12 ? '#40ff40' : i < 17 ? '#ffe040' : '#ff3030') : '#203020'; ctx.fillRect(10 + i * 4, H - 26, 3, 6); }
        textS(ctx, gear ? 'HIGH' : 'LOW', 84, H - 12, gear ? '#ff4040' : '#40c0ff');
        drawMap(ctx, W - 28, H - 40);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const ps = segAt(pos + PZ);
        bgScroll += ps.curve * speed / MAXV * 0.9;
        ctx.save();
        if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * shake * 0.5), Math.round((Math.random() - 0.5) * shake * 0.3));
        renderRoad(ctx);
        if (mode !== 'radio') drawPlayer(ctx);
        ctx.restore();
        if (mode === 'title') { renderTitle(ctx); return; }
        if (mode === 'radio') { renderRadio(ctx); return; }
        drawHUD(ctx);
        if (mode === 'count') {
          const n = 3 - Math.floor(modeT / 60);
          textS(ctx, n > 0 ? String(n) : 'GO!', W / 2, 70, n > 0 ? '#fff' : '#40ff40', 4, 'center');
          textS(ctx, 'RADIO: ' + TUNES[tune].name, W / 2, 110, '#7ff', 1, 'center');
        }
        if (msg && (msg.f > 30 || (msg.f & 4))) textS(ctx, msg.t, W / 2, 60, msg.col, msg.t.length > 12 ? 1 : 2, 'center');
        if (ps.fork > 0.2 && !decided && mode === 'drive') {
          const blink = api.frame & 16;
          if (blink) { textS(ctx, '<', 40, 100, '#ffe040', 3); textS(ctx, '>', W - 56, 100, '#ffe040', 3); }
          textS(ctx, 'CHOOSE YOUR ROUTE', W / 2, 44, '#fff', 1, 'center');
        }
        if (mode === 'goal') {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(40, 54, 240, 92);
          const th = STAGES[sid(4, B)];
          textS(ctx, 'GOAL ' + th.goal, W / 2, 62, '#ffe040', 3, 'center');
          textS(ctx, th.n, W / 2, 90, '#fff', 1, 'center');
          textS(ctx, 'CONGRATULATIONS!', W / 2, 104, '#ff8080', 1, 'center');
          textS(ctx, 'TIME BONUS ' + bonusTally, W / 2, 120, '#7ff', 1, 'center');
          drawMap(ctx, W / 2, 128 - 36 + 50);
        }
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(60, 80, 200, 50);
          textS(ctx, 'GAME OVER', W / 2, 88, '#ff4040', 2, 'center');
          textS(ctx, 'SCORE ' + score, W / 2, 110, '#fff', 1, 'center');
        }
      }
      function renderTitle(ctx) {
        const GR = ['#fff8a0', '#ffe838', '#ffd020', '#ffb018', '#ff8c10', '#f06008', '#d84000'];
        ctx.fillStyle = 'rgba(0,20,80,0.45)'; ctx.fillRect(0, 30, W, 96);
        textS(ctx, 'OUT RUN', W / 2, 40, GR, 5, 'center');
        textS(ctx, 'CHOOSE YOUR ROUTE  -  5 GOALS', W / 2, 84, '#fff', 1, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 100, '#ff5040', 1, 'center'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) textS(ctx, 'INSERT COIN', W / 2, 100, '#fff', 1, 'center'); }
        else textS(ctx, 'PUSH START BUTTON', W / 2, 100, (api.frame >> 5) & 1 ? '#fff' : '#ffe040', 1, 'center');
        textS(ctx, 'TOP SCORE ' + hi, W / 2, 112, '#7ff', 1, 'center');
        textS(ctx, '\u00a9 1986 SEGA', W / 2, H - 22, '#fff', 1, 'center');
        textS(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#fff');
      }
      function renderRadio(ctx) {
        // dashboard close-up with the radio
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#c01010'; ctx.fillRect(0, 120, W, 104);
        ctx.fillStyle = '#202020'; ctx.fillRect(20, 132, 280, 84);
        ctx.fillStyle = '#383838'; ctx.fillRect(28, 140, 264, 68);
        ctx.fillStyle = '#102010'; ctx.fillRect(60, 148, 200, 30);
        // frequency dial
        for (let i = 0; i < 25; i++) { ctx.fillStyle = '#40a040'; ctx.fillRect(66 + i * 8, 170, 1, i % 5 ? 3 : 6); }
        const nx = 90 + tune * 70 + Math.sin(modeT * 0.2) * 1;
        ctx.fillStyle = '#ff3030'; ctx.fillRect(Math.round(nx), 150, 2, 26);
        text(ctx, TUNES[tune].freq + ' FM', 160, 152, '#80ff80', 1, 'center');
        text(ctx, TUNES[tune].name, 160, 161, '#c0ffc0', 1, 'center');
        // three preset buttons
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i === tune ? '#ffe040' : '#808080'; ctx.fillRect(84 + i * 56, 186, 40, 12); text(ctx, String(i + 1), 104 + i * 56, 189, '#000', 1, 'center'); }
        // driver's hand on the dial
        ctx.fillStyle = '#ffc890'; ctx.fillRect(Math.round(nx) + 20, 196, 18, 20); ctx.fillRect(Math.round(nx) + 16, 192, 8, 8);
        textS(ctx, 'SELECT MUSIC BY LEFT / RIGHT', W / 2, 40, '#fff', 1, 'center');
        textS(ctx, 'PRESS START OR ACCEL TO GO', W / 2, 54, '#ffe040', 1, 'center');
        textS(ctx, String(Math.max(0, 10 - Math.floor(modeT / 60))), W / 2, 74, '#ff4040', 3, 'center');
      }
      startTitle();
      return { update, render, destroy() { api.setHiScore(hi); } };
    }
  });
})();
