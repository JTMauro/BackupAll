// Bomb Jack (Tecmo, 1984) - from-scratch recreation for the MAME32 Game Room.
// Float and jump around famous landmarks defusing 24 bombs per round; grab the lit fuses in order for the big bonus.
(function () {
  'use strict';
  const W = 224, H = 256;

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
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flip = rows => rows.map(r => r.split('').reverse().join(''));
  const pair = (rows, pal) => [sprite(rows, pal), sprite(flip(rows), pal)]; // [right, left]

  // ---------- sprites ----------
  const JP = { b: '#3060f0', w: '#f8f8f8', k: '#000', r: '#e02828', y: '#f8d020', s: '#f0c090' };
  const JACK_STAND = [
    '....bbbb....', '...bwwwwb...', '...wkwwkw...', '...wwssww...', '..rbbbbbbr..', '.rrbbbbbbrr.', 'rrrbbyybbrrr',
    'rr.bbbbbb.rr', 'r..bbbbbb..r', '...bbbbbb...', '...bb..bb...', '...bb..bb...', '..wbb..bbw..', '..ww....ww..'];
  const JACK_RUN = JACK_STAND.slice(0, 10).concat(['...bb.bb....', '..bb...bb...', '.wb.....bw..', '.w.......w..']);
  const JACK_JUMP = [
    'w..bbbb..w..', 'b.bwwwwb.b..', 'b.wkwwkw.b..', '.bwwssww.b..', '..bbbbbbb...', '.rrbbbbbbr..', 'rrrbbyybbrr.',
    'rr.bbbbbb.rr', 'r..bbbbbb..r', '...bbbbbb...', '...bb..bb...', '..bb....bb..', '..wb....bw..', '..w......w..'];
  const JACK = { stand: pair(JACK_STAND, JP), run: pair(JACK_RUN, JP), jump: pair(JACK_JUMP, JP) };
  const BOMB_ROWS = ['......y...', '.....yo...', '....dd....', '..rrrrrr..', '.rrwwrrrr.', 'rrwwrrrrrr', 'rrwrrrrrrr', 'rrrrrrrrrr', 'rrrrrrrrrd', '.rrrrrrrd.', '..rrrrdd..'];
  const BOMB = sprite(BOMB_ROWS.map((r, i) => i < 2 ? r.replace(/[yo]/g, '.') : r), { r: '#d82020', w: '#ffb0b0', d: '#801010', y: '#ff0', o: '#f80' });
  const BOMB_LIT = [
    sprite(BOMB_ROWS, { r: '#ff4040', w: '#fff', d: '#a01818', y: '#ffff80', o: '#ff8000' }),
    sprite(BOMB_ROWS.map((r, i) => i < 2 ? r.replace(/y/g, 'o').replace(/o(?=\.\.\.$)/, 'y') : r), { r: '#f8f040', w: '#fff', d: '#c08010', y: '#fff', o: '#ff4000' })
  ];
  const MUMMY = [
    '...wwwww....', '..wwwwwww...', '..wkwwkww...', '..wwwwwww...', '...wwwww....', '.wwgwwwgww..', 'ww.wwgwww.ww',
    'w..wwwwgw..w', '...wgwwww...', '...wwwgww...', '...ww..ww...', '...ww..ww...', '..www..www..', '..ww....ww..'];
  const MUMMY2 = MUMMY.slice(0, 10).concat(['...ww.ww....', '..ww...ww...', '.www....ww..', '.ww......w..']);
  const MPAL = { w: '#e8e0c8', g: '#a09070', k: '#c02020' };
  const SPR_MUMMY = [pair(MUMMY, MPAL), pair(MUMMY2, MPAL)];
  const BIRD1 = ['............', 'gg........gg', '.gg..gg..gg.', '..ggggggggo.', '...gggggwko.', '....ggggg...', '....g..g....', '...yy..yy...'];
  const BIRD2 = ['....gg......', '....ggg.....', '.....gggg...', '..ggggggggo.', '.gggggggwko.', 'gg..ggggg...', '....g..g....', '...yy..yy...'];
  const BPAL = { g: '#30c040', o: '#f8a020', w: '#fff', k: '#000', y: '#f8d020' };
  const SPR_BIRD = [pair(BIRD1, BPAL), pair(BIRD2, BPAL)];
  const SAUCER = [sprite(['.....cc.....', '....cwwc....', '..cccccccc..', 'bbbbbbbbbbbb', '.yby.yby.yb.', '..bbbbbbbb..'], { c: '#80e0ff', w: '#fff', b: '#a0a0c0', y: '#ff0' }),
    sprite(['.....cc.....', '....cwwc....', '..cccccccc..', 'bbbbbbbbbbbb', '.byb.byb.yb.', '..bbbbbbbb..'], { c: '#80e0ff', w: '#fff', b: '#a0a0c0', y: '#f40' })];
  const ORB = [sprite(['...pppp...', '.pppppppp.', '.ppwwpppp.', 'pppwppppqp', 'pppppppqqp', 'ppppppqqqp', '.ppppqqqp.', '.pppqqqpp.', '...pppp...'], { p: '#f060c0', w: '#fff', q: '#a02080' }),
    sprite(['...pppp...', '.pppppppp.', '.pppppppp.', 'pqpppppwpp', 'pqqppppppp', 'pqqqpppppp', '.pqqqpppp.', '.ppqqqppp.', '...pppp...'], { p: '#f060c0', w: '#fff', q: '#a02080' })];
  function coin(letter, bg, fg) {
    const cv = mk(11, 11), c = cv.getContext('2d');
    c.fillStyle = '#000'; c.beginPath(); c.arc(5.5, 5.5, 5.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = bg; c.beginPath(); c.arc(5.5, 5.5, 4.8, 0, Math.PI * 2); c.fill();
    if (letter) {
      const gl = FONT[letter]; c.fillStyle = fg;
      for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) if (gl[r] & (16 >> k)) c.fillRect(3 + k, 2 + r, 1, 1);
    }
    return cv;
  }
  const COIN_P = [coin('P', '#3070ff', '#fff'), coin('P', '#ff3030', '#fff'), coin('P', '#30d040', '#fff'), coin('P', '#f8d020', '#000')];
  const COIN_B = coin('B', '#f8d020', '#c02020'), COIN_E = coin('E', '#ff60c0', '#fff'), COIN_S = coin('S', '#40e0ff', '#2020a0');
  const COIN_ENEMY = [coin(null, '#f8d020'), coin(null, '#fff0a0')];

  // ---------- rounds ----------
  const FX0 = 8, FX1 = 216, FY0 = 24, FY1 = 248;    // playfield (inside the frame)
  const line = (x, y, dx, dy, n) => { const o = []; for (let i = 0; i < n; i++) o.push([x + dx * i, y + dy * i]); return o; };
  const P = (x, y, w) => ({ x, y, w, h: 6 });
  const ROUNDS = [
    { name: 'EGYPT', plat: [P(40, 82, 56), P(136, 82, 56), P(80, 142, 64), P(24, 196, 48), P(152, 196, 48)],
      bombs: [].concat(line(28, 34, 16, 0, 3), line(160, 34, 16, 0, 3), line(56, 70, 14, 0, 3), line(146, 70, 14, 0, 3),
        line(14, 100, 0, 22, 3), line(198, 100, 0, 22, 3), line(92, 130, 14, 0, 3), line(30, 236, 16, 0, 3)) },
    { name: 'GREECE', plat: [P(16, 64, 48), P(160, 64, 48), P(88, 104, 48), P(32, 160, 56), P(136, 160, 56), P(88, 208, 48)],
      bombs: [].concat(line(22, 52, 14, 0, 3), line(166, 52, 14, 0, 3), line(94, 92, 14, 0, 3), line(106, 30, 0, 18, 3),
        line(40, 148, 14, 0, 3), line(144, 148, 14, 0, 3), line(94, 196, 14, 0, 3), line(14, 236, 16, 0, 3).slice(0, 1), line(198, 236, 16, 0, 1), line(60, 236, 16, 0, 1)) },
    { name: 'BAVARIA', plat: [P(24, 96, 40), P(92, 72, 40), P(160, 96, 40), P(56, 152, 40), P(128, 152, 40), P(92, 204, 40)],
      bombs: [].concat(line(28, 84, 12, 0, 3), line(96, 60, 12, 0, 3), line(164, 84, 12, 0, 3), line(60, 140, 12, 0, 3),
        line(132, 140, 12, 0, 3), line(96, 192, 12, 0, 3), line(14, 140, 0, 24, 3), line(198, 140, 0, 24, 3)) },
    { name: 'NEW YORK', plat: [P(64, 60, 96), P(16, 112, 40), P(168, 112, 40), P(72, 160, 80), P(16, 208, 40), P(168, 208, 40)],
      bombs: [].concat(line(72, 48, 14, 0, 6), line(22, 100, 14, 0, 2), line(174, 100, 14, 0, 2), line(80, 148, 14, 0, 5),
        line(22, 196, 14, 0, 2), line(174, 196, 14, 0, 2), line(60, 214, 0, 11, 3), line(110, 88, 0, 14, 2)) },
    { name: 'JAPAN', plat: [P(48, 88, 128), P(16, 144, 48), P(160, 144, 48), P(80, 184, 64)],
      bombs: [].concat(line(56, 76, 14, 0, 8), line(14, 34, 16, 0, 3), line(166, 34, 16, 0, 3), line(20, 132, 14, 0, 2),
        line(172, 132, 14, 0, 2), line(88, 172, 14, 0, 4), line(40, 236, 0, 1, 1), line(176, 236, 0, 1, 1)) }
  ];

  // ---------- landmark backgrounds ----------
  function tri(c, pts, col) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
  function sky(c, top, bot) { const gr = c.createLinearGradient(0, FY0, 0, FY1); gr.addColorStop(0, top); gr.addColorStop(1, bot); c.fillStyle = gr; c.fillRect(FX0, FY0, FX1 - FX0, FY1 - FY0); }
  function buildBg(idx) {
    const cv = mk(W, H), c = cv.getContext('2d');
    if (idx === 0) {
      sky(c, '#102060', '#d08040');
      c.fillStyle = '#ffd060'; c.beginPath(); c.arc(170, 110, 16, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#b08040'; c.fillRect(FX0, 210, FX1 - FX0, FY1 - 210);
      tri(c, [30, 210, 90, 120, 150, 210], '#c09050'); tri(c, [90, 120, 150, 210, 110, 210], '#906030');
      tri(c, [120, 210, 165, 145, 210, 210], '#c09050'); tri(c, [165, 145, 210, 210, 180, 210], '#906030');
      tri(c, [8, 210, 30, 175, 52, 210], '#a87840');
      c.fillStyle = '#806030'; c.fillRect(60, 196, 50, 14); c.fillRect(96, 182, 18, 18); c.fillRect(100, 176, 12, 8);
      c.fillStyle = '#604020'; c.fillRect(98, 186, 4, 6);
    } else if (idx === 1) {
      sky(c, '#2050c0', '#a0d0ff');
      c.fillStyle = '#f0f0ff'; for (const [x, y] of [[40, 60], [150, 90], [90, 40]]) { c.fillRect(x, y, 30, 6); c.fillRect(x + 6, y - 4, 18, 4); }
      c.fillStyle = '#806040'; c.beginPath(); c.moveTo(FX0, FY1); c.lineTo(FX0, 200); c.quadraticCurveTo(112, 150, FX1, 200); c.lineTo(FX1, FY1); c.fill();
      c.fillStyle = '#e8e0d0'; c.fillRect(56, 168, 112, 6); tri(c, [56, 132, 112, 112, 168, 132], '#d8d0c0'); c.fillRect(56, 132, 112, 6);
      c.fillStyle = '#c8c0b0'; for (let x = 60; x < 166; x += 12) c.fillRect(x, 138, 6, 30);
    } else if (idx === 2) {
      sky(c, '#301050', '#e07090');
      c.fillStyle = '#504070'; tri(c, [FX0, 200, 60, 120, 120, 200], '#504070'); tri(c, [90, 200, 160, 110, FX1, 200], '#605080');
      tri(c, [140, 125, 160, 110, 180, 125], '#f0f0ff'); tri(c, [50, 130, 60, 120, 70, 130], '#f0f0ff');
      c.fillStyle = '#304020'; c.fillRect(FX0, 200, FX1 - FX0, FY1 - 200);
      c.fillStyle = '#e8e0f0'; c.fillRect(80, 140, 64, 60); c.fillRect(70, 120, 14, 80); c.fillRect(140, 112, 14, 88); c.fillRect(104, 100, 16, 40);
      tri(c, [68, 120, 77, 96, 86, 120], '#4060c0'); tri(c, [138, 112, 147, 84, 156, 112], '#4060c0'); tri(c, [102, 100, 112, 76, 122, 100], '#4060c0');
      c.fillStyle = '#403060'; for (const [x, y] of [[74, 130], [144, 124], [108, 110], [90, 160], [126, 160], [108, 176]]) c.fillRect(x, y, 4, 6);
    } else if (idx === 3) {
      sky(c, '#000010', '#202060');
      c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) c.fillRect(FX0 + ((i * 53) % 200), FY0 + ((i * 37) % 90), 1, 1);
      c.fillStyle = '#f0f0c0'; c.beginPath(); c.arc(60, 60, 10, 0, Math.PI * 2); c.fill();
      const bld = [[8, 160, 22], [30, 130, 20], [50, 150, 18], [68, 100, 16], [84, 140, 24], [108, 80, 14], [122, 120, 22], [144, 150, 18], [162, 110, 20], [182, 140, 18], [200, 165, 16]];
      for (const [x, y, w] of bld) {
        c.fillStyle = '#181838'; c.fillRect(x, y, w, FY1 - y);
        c.fillStyle = '#f8e070'; for (let yy = y + 4; yy < FY1 - 6; yy += 7) for (let xx = x + 3; xx < x + w - 3; xx += 5) if (((xx * 7 + yy * 13) % 5) < 2) c.fillRect(xx, yy, 2, 3);
      }
      c.fillStyle = '#181838'; c.fillRect(113, 62, 4, 18);
    } else {
      sky(c, '#4080e0', '#f0c0d0');
      tri(c, [30, 200, 112, 90, 194, 200], '#6070a0'); tri(c, [92, 115, 112, 90, 132, 115], '#ffffff');
      c.fillStyle = '#ff6080'; c.beginPath(); c.arc(170, 70, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#306030'; c.fillRect(FX0, 200, FX1 - FX0, FY1 - 200);
      for (let i = 0; i < 4; i++) {
        const y = 196 - i * 22, w = 56 - i * 10;
        c.fillStyle = '#802020'; c.fillRect(40 - w / 2 + 10, y - 12, w - 20, 12);
        tri(c, [40 - w / 2, y - 12, 40 + w / 2, y - 12, 40, y - 24], '#302020');
      }
    }
    // dim the art so the sprites read clearly
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(FX0, FY0, FX1 - FX0, FY1 - FY0);
    return cv;
  }
  let BGS = null;

  ArcadeRegistry.register({
    id: 'bombjack', title: 'Bomb Jack', year: 1984, maker: 'Tecmo',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: jump (in the air: hover) \u00b7 Up+Space or X: high jump \u00b7 Down+Space: low jump \u00b7 Enter: start',
    marquee: { bg: '#081040', fg: '#ff4040', accent: '#f8d020' },
    create(api) {
      // ---------- attract-mode demo: an autopilot plays through the same input layer ----------
      let demo = false, demoT = 0, dKeys = new Set(), dPrev = new Set();
      const A = { tone: (...a) => { if (!demo) api.audio.tone(...a); }, noise: (...a) => { if (!demo) api.audio.noise(...a); }, melody: (...a) => (demo ? 0 : api.audio.melody(...a)) };
      const key = c => (demo ? dKeys.has(c) : api.key(c));
      const pressed = c => (demo ? dKeys.has(c) && !dPrev.has(c) : api.pressed(c));
      if (!BGS) BGS = [0, 1, 2, 3, 4].map(buildBg);
      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, round = 1, coinFlash = 0;
      let jack, bombs, litIdx, litCount, enemies, spawnT, items, power, powerT, pmeter, eatChain, mult, nextB, litTotal, nextE, popups, bonusShown, sGiven;
      const R = () => ROUNDS[(round - 1) % ROUNDS.length];
      const lvl = () => Math.min(round - 1, 12);

      function addScore(n, x, y) {
        score += n; pmeter += n;
        if (!demo && score > hi) hi = score;
        if (x != null) popups.push({ x, y, s: String(n), t: 45 });
      }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; A.tone(98, .28, { type: 'square', vol: .14 }); return false;
      }
      // ---------- sounds ----------
      const sJump = () => A.tone(300, .22, { type: 'square', vol: .08, slideTo: 900 });
      const sBomb = () => A.tone(1500, .06, { type: 'square', vol: .1, slideTo: 2200 });
      const sLit = () => A.melody([[1568, .04], [2093, .04], [2637, .08]], { type: 'square', vol: .11 });
      const sPower = () => A.melody([[523, .05], [659, .05], [784, .05], [1047, .05], [784, .05], [1047, .05], [1319, .12]], { type: 'square', vol: .12 });
      const sEat = n => A.tone(600 + n * 150, .12, { type: 'square', vol: .12, slideTo: 1600 + n * 200 });
      const sItem = () => A.melody([[880, .06], [1175, .06], [1760, .12]], { type: 'triangle', vol: .16 });
      const sDie = () => A.melody([[988, .08], [932, .08], [880, .08], [831, .08], [784, .08], [740, .08], [698, .08], [659, .3]], { type: 'square', vol: .13 });
      const sTune = () => A.melody([[659, .12], [784, .12], [880, .12], [1047, .24], [880, .12], [1047, .12], [1319, .36]], { type: 'square', vol: .12 });
      const sClear = () => A.melody([[784, .1], [1047, .1], [1319, .1], [1568, .1], [1319, .1], [1568, .1], [2093, .3]], { type: 'square', vol: .12 });

      // ---------- setup ----------
      function resetJack() { jack = { x: 112, y: FY1, vx: 0, vy: 0, air: false, dir: 1, anim: 0, hov: 0 }; }
      function startRound() {
        const rd = R();
        bombs = rd.bombs.map(([x, y]) => ({ x, y, alive: true }));
        litIdx = -1; litCount = 0; items = []; power = false; powerT = 0; eatChain = 0; popups = [];
        resetJack(); resetEnemies(); state = 'ready'; T = 0; bonusShown = 0;
      }
      function resetEnemies() {
        enemies = [];
        const birds = 1 + (round > 2 ? 1 : 0);
        for (let i = 0; i < birds; i++) enemies.push(mkFlyer('bird', i ? FX1 - 16 : FX0 + 8, FY0 + 6));
        spawnT = 120;
      }
      function startGame() { score = 0; lives = 3; round = 1; mult = 1; nextB = 5000; litTotal = 0; nextE = 15; pmeter = 0; sGiven = false; startRound(); sTune(); }
      function mkFlyer(kind, x, y) {
        const a = Math.random() * Math.PI * 2, s = 1 + lvl() * 0.06;
        return { kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, anim: 0, t: 0, dir: 1 };
      }

      // ---------- physics ----------
      const plats = () => R().plat;
      function landY(x0, x1, yPrev, yNow) {
        // returns platform top if the feet crossed it this frame
        for (const p of plats()) if (x1 > p.x && x0 < p.x + p.w && yPrev <= p.y && yNow >= p.y) return p.y;
        if (yNow >= FY1) return FY1;
        return null;
      }
      function onGround(x0, x1, y) {
        if (y >= FY1) return true;
        for (const p of plats()) if (x1 > p.x && x0 < p.x + p.w && Math.abs(y - p.y) < 0.5) return true;
        return false;
      }
      function updateJack() {
        const j = jack, L = key('ArrowLeft'), Rk = key('ArrowRight'), U = key('ArrowUp'), D = key('ArrowDown');
        const jumpP = pressed('Space') || pressed('KeyX') || pressed('KeyZ');
        const sp = j.air ? 1.25 : 1.35;
        j.vx = L ? -sp : Rk ? sp : 0;
        if (L) j.dir = -1; else if (Rk) j.dir = 1;
        if (!j.air) {
          if (j.vx) j.anim++;
          if (jumpP) {
            const high = U || pressed('KeyX'), low = D;
            j.vy = high ? -6.1 : low ? -2.8 : -4.6; j.air = true; sJump(); j.hov = 0;
          }
        } else {
          if (jumpP) { if (j.vy < 0) j.vy = 0; else j.vy = 0.15; j.hov = 10; A.tone(1200, .04, { type: 'square', vol: .05 }); }
        }
        // horizontal
        j.x = Math.max(FX0 + 6, Math.min(FX1 - 6, j.x + j.vx));
        if (j.air) {
          const g = j.vy < 0 ? 0.13 : 0.045;
          const maxF = D ? 2.6 : 1.3;
          if (j.hov > 0) j.hov--; else j.vy = Math.min(maxF, j.vy + g);
          const py = j.y; j.y += j.vy;
          if (j.vy < 0) {
            // bump the head on a platform's underside or the ceiling
            const head = j.y - 14;
            if (head < FY0) { j.y = FY0 + 14; j.vy = 0.3; }
            for (const p of plats()) if (j.x + 5 > p.x && j.x - 5 < p.x + p.w && head < p.y + p.h && py - 14 >= p.y + p.h - 0.01) { j.y = p.y + p.h + 14; j.vy = 0.3; }
          } else {
            const ly = landY(j.x - 5, j.x + 5, py, j.y);
            if (ly != null) { j.y = ly; j.vy = 0; j.air = false; A.tone(200, .03, { type: 'square', vol: .05 }); }
          }
        } else if (!onGround(j.x - 5, j.x + 5, j.y)) { j.air = true; j.vy = 0.2; }
        // collect bombs
        for (let i = 0; i < bombs.length; i++) {
          const b = bombs[i]; if (!b.alive) continue;
          if (Math.abs(b.x + 5 - j.x) < 9 && Math.abs(b.y + 6 - (j.y - 7)) < 11) collectBomb(i);
        }
      }
      function nextAlive(i) {
        for (let k = 1; k <= bombs.length; k++) { const n = (i + k) % bombs.length; if (bombs[n].alive) return n; }
        return -1;
      }
      function collectBomb(i) {
        const b = bombs[i]; b.alive = false;
        if (i === litIdx) {
          litCount++; litTotal++; addScore(200 * mult, b.x + 5, b.y); sLit();
          litIdx = nextAlive(i);
          if (litTotal >= nextE) { nextE += 20; spawnItem('E'); }
        } else {
          addScore(100 * mult, b.x + 5, b.y); sBomb();
          if (litIdx === -1) litIdx = nextAlive(i);
        }
        if (!bombs.some(o => o.alive)) { state = 'clear'; T = 0; sClear(); }
      }
      function spawnItem(kind) {
        if (items.some(it => it.kind === kind)) return;
        const a = Math.random() * Math.PI * 2;
        items.push({ kind, x: 40 + Math.random() * 140, y: FY0 + 10, vx: Math.cos(a) * 0.9, vy: Math.abs(Math.sin(a)) * 0.9 + 0.3, t: 0 });
      }

      // ---------- enemies ----------
      function updateEnemies() {
        const s = 1 + lvl() * 0.07;
        if (!power && --spawnT <= 0) {
          if (enemies.length < Math.min(9, 4 + Math.floor(round / 2))) {
            const x = FX0 + 16 + Math.random() * (FX1 - FX0 - 32);
            enemies.push({ kind: 'mummy', x, y: FY0 + 14, vx: 0, vy: 0, anim: 0, t: 0, dir: 1, air: true });
          }
          spawnT = Math.max(110, 300 - lvl() * 15) + Math.random() * 120;
        }
        for (const e of enemies) {
          e.anim++;
          if (power) continue;
          if (e.kind === 'mummy') {
            if (e.air) {
              e.vy = Math.min(1.1, e.vy + 0.04); const py = e.y; e.y += e.vy;
              const ly = landY(e.x - 4, e.x + 4, py, e.y);
              if (ly != null) { e.y = ly; e.vy = 0; e.air = false; }
            } else {
              if (e.y >= FY1) {
                if (++e.t > 50) { // reaching the ground, the mummy changes into something worse
                  const kinds = ['saucer', 'orb', 'bird', 'saucer'];
                  Object.assign(e, mkFlyer(kinds[(Math.random() * kinds.length) | 0], e.x, e.y - 8));
                  A.tone(200, .3, { type: 'sawtooth', vol: .08, slideTo: 1200 });
                  continue;
                }
              }
              e.dir = jack.x > e.x ? 1 : -1;
              e.x = Math.max(FX0 + 5, Math.min(FX1 - 5, e.x + e.dir * 0.45 * s));
              if (!onGround(e.x - 4, e.x + 4, e.y)) { e.air = true; e.vy = 0; }
            }
          } else if (e.kind === 'bird' || e.kind === 'orb') {
            const acc = e.kind === 'bird' ? 0.022 : 0.03, max = (e.kind === 'bird' ? 0.85 : 1.05) * s;
            const dx = jack.x - e.x, dy = (jack.y - 7) - e.y, d = Math.hypot(dx, dy) || 1;
            e.vx += dx / d * acc; e.vy += dy / d * acc;
            const v = Math.hypot(e.vx, e.vy); if (v > max) { e.vx *= max / v; e.vy *= max / v; }
            e.x += e.vx; e.y += e.vy; e.dir = e.vx >= 0 ? 1 : -1;
          } else if (e.kind === 'saucer') {
            if (++e.t > 200) {
              e.t = 0; const dx = jack.x - e.x, dy = (jack.y - 7) - e.y, d = Math.hypot(dx, dy) || 1, sp = 1.25 * s;
              e.vx = dx / d * sp; e.vy = dy / d * sp;
            }
            e.x += e.vx; e.y += e.vy;
          }
          if (e.kind !== 'mummy') {
            if (e.x < FX0 + 6) { e.x = FX0 + 6; e.vx = Math.abs(e.vx); }
            if (e.x > FX1 - 6) { e.x = FX1 - 6; e.vx = -Math.abs(e.vx); }
            if (e.y < FY0 + 6) { e.y = FY0 + 6; e.vy = Math.abs(e.vy); }
            if (e.y > FY1 - 6) { e.y = FY1 - 6; e.vy = -Math.abs(e.vy); }
          }
        }
        // collisions
        const jx = jack.x, jy = jack.y - 7;
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          const ey = e.kind === 'mummy' ? e.y - 7 : e.y;
          if (Math.abs(e.x - jx) < 9 && Math.abs(ey - jy) < 11) {
            if (power) {
              const tbl = [100, 200, 300, 500, 800, 1200, 2000];
              const pts = tbl[Math.min(eatChain, tbl.length - 1)] * mult; eatChain++;
              enemies.splice(i, 1); addScore(pts, e.x, ey - 8); sEat(eatChain);
            } else { die(); return; }
          }
        }
      }
      function updateItems() {
        // the power ball appears whenever the power meter is full
        if (pmeter >= 3000 && !power && !items.some(it => it.kind === 'P')) { pmeter = 0; spawnItem('P'); }
        if (score >= nextB) { nextB += 10000; spawnItem('B'); }
        if (!sGiven && litTotal >= 40) { sGiven = true; spawnItem('S'); }
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i]; it.t++;
          it.x += it.vx; it.y += it.vy;
          if (it.x < FX0 + 6 || it.x > FX1 - 6) it.vx = -it.vx;
          if (it.y < FY0 + 6 || it.y > FY1 - 6) it.vy = -it.vy;
          if (it.t > 900 && it.kind !== 'P') { items.splice(i, 1); continue; }
          if (Math.abs(it.x - jack.x) < 10 && Math.abs(it.y - (jack.y - 7)) < 12) {
            items.splice(i, 1);
            if (it.kind === 'P') { power = true; powerT = Math.max(240, 480 - lvl() * 20); eatChain = 0; sPower(); }
            else if (it.kind === 'B') { mult = Math.min(5, mult + 1); popups.push({ x: it.x, y: it.y, s: 'X' + mult, t: 60 }); sItem(); }
            else if (it.kind === 'E') { lives++; popups.push({ x: it.x, y: it.y, s: '1UP', t: 60 }); sItem(); }
            else if (it.kind === 'S') { addScore(10000, it.x, it.y); sItem(); }
          }
        }
        if (power && --powerT <= 0) { power = false; }
      }
      function die() { if (state !== 'play') return; state = 'dying'; T = 0; sDie(); }

      function updatePlay() {
        updateJack(); if (state !== 'play') return;
        updateEnemies(); if (state !== 'play') return;
        updateItems();
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }
      function clearBonus() { return litCount >= 23 ? 50000 : litCount === 22 ? 30000 : litCount === 21 ? 20000 : litCount === 20 ? 10000 : 0; }

      // ---------- demo autopilot ----------
      function startDemo() {
        demo = true; demoT = 0; dKeys = new Set(); dPrev = new Set();
        startGame(); round = 1 + ((Math.random() * 5) | 0); startRound(); T = 60;
      }
      function endDemo() { demo = false; dKeys = new Set(); score = 0; state = 'title'; T = 0; }
      function demoAI() {
        const k = new Set(), j = jack;
        if (state !== 'play') return k;
        const jy = j.y - 7;
        let tgt = null, bd = 1e9;
        const consider = (x, y, w) => { const d = Math.hypot(x - j.x, y - jy) * w; if (d < bd) { bd = d; tgt = [x, y]; } };
        if (litIdx >= 0 && bombs[litIdx].alive) consider(bombs[litIdx].x + 5, bombs[litIdx].y + 6, 0.6);
        for (const b of bombs) if (b.alive) consider(b.x + 5, b.y + 6, 1);
        for (const it of items) consider(it.x, it.y, 0.4);
        if (power) for (const e of enemies) consider(e.x, e.kind === 'mummy' ? e.y - 7 : e.y, 0.3);
        if (!tgt) return k;
        const [tx, ty] = tgt;
        if (Math.abs(tx - j.x) > 3) k.add(tx < j.x ? 'ArrowLeft' : 'ArrowRight');
        const danger = !power && enemies.some(e => Math.hypot(e.x - j.x, (e.kind === 'mummy' ? e.y - 7 : e.y) - jy) < 28);
        const tap = () => { if (!dPrev.has('Space')) k.add('Space'); };
        if (!j.air) {
          if (danger || (ty < jy - 12 && Math.abs(tx - j.x) < 40)) { tap(); if (ty < jy - 60) k.add('ArrowUp'); else if (ty > jy - 30) k.add('ArrowDown'); }
        } else if (j.vy < 0 && ty > jy - 2 && ty < jy + 20 && Math.abs(tx - j.x) < 24) tap();
        else if (j.vy > 0 && ty < jy && Math.abs(tx - j.x) > 6 && (demoT % 10) === 0) tap();
        return k;
      }

      function update() {
        T++; if (coinFlash > 0) coinFlash--;
        if (demo) {
          if (api.anyPressed('Enter', 'Space')) { endDemo(); return; }
          dPrev = dKeys; dKeys = demoAI();
          if (++demoT > 2400 || state === 'clear') { endDemo(); return; }
        }
        switch (state) {
          case 'title': if (api.anyPressed('Enter', 'Space') && tryStart()) startGame(); else if (T > 720) startDemo(); break;
          case 'ready': if (T >= 140) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (T >= 150 && demo) { endDemo(); break; }
            if (T >= 150) {
              const respawn = () => { resetJack(); resetEnemies(); items = items.filter(it => it.kind !== 'P'); power = false; mult = 1; state = 'ready'; T = 60; };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              lives--;
              if (lives <= 0) { if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else respawn();
            }
            break;
          case 'clear':
            if (T === 60) { const b = clearBonus(); bonusShown = b; if (b) { addScore(b); A.melody([[1047, .1], [1319, .1], [1568, .1], [2093, .3]], { type: 'square', vol: .13, delay: .1 }); } }
            if (T >= 220) { round++; startRound(); sTune(); }
            break;
          case 'over':
            if (T >= 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawFrame(ctx) {
        ctx.drawImage(BGS[(round - 1) % BGS.length], 0, 0);
        ctx.fillStyle = '#e06018'; ctx.fillRect(FX0 - 4, FY0 - 4, FX1 - FX0 + 8, 4); ctx.fillRect(FX0 - 4, FY1, FX1 - FX0 + 8, 4);
        ctx.fillRect(FX0 - 4, FY0, 4, FY1 - FY0); ctx.fillRect(FX1, FY0, 4, FY1 - FY0);
        ctx.fillStyle = '#f8b040'; ctx.fillRect(FX0 - 4, FY0 - 4, FX1 - FX0 + 8, 1); ctx.fillRect(FX0 - 4, FY1, FX1 - FX0 + 8, 1);
        for (const p of plats()) {
          ctx.fillStyle = '#f8a020'; ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.fillStyle = '#fff070'; ctx.fillRect(p.x, p.y, p.w, 1);
          ctx.fillStyle = '#b05010'; for (let x = p.x + 2; x < p.x + p.w; x += 6) ctx.fillRect(x, p.y + 2, 3, 3);
          ctx.fillStyle = '#803010'; ctx.fillRect(p.x, p.y + p.h - 1, p.w, 1);
        }
      }
      function drawJack(ctx) {
        const j = jack, d = j.dir > 0 ? 0 : 1;
        const img = j.air ? JACK.jump[d] : (j.vx && (j.anim >> 3) & 1) ? JACK.run[d] : JACK.stand[d];
        ctx.drawImage(img, Math.round(j.x - 6), Math.round(j.y - 14));
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        if (power) {
          const flash = powerT < 90 && (powerT >> 3) & 1;
          ctx.drawImage(COIN_ENEMY[flash ? 1 : (e.anim >> 4) & 1 ? 1 : 0], x - 5, (e.kind === 'mummy' ? y - 7 : y) - 5);
          return;
        }
        if (e.kind === 'mummy') ctx.drawImage(SPR_MUMMY[e.air ? 0 : (e.anim >> 4) & 1][e.dir > 0 ? 0 : 1], x - 6, y - 14);
        else if (e.kind === 'bird') ctx.drawImage(SPR_BIRD[(e.anim >> 3) & 1][e.dir > 0 ? 0 : 1], x - 6, y - 4);
        else if (e.kind === 'saucer') ctx.drawImage(SAUCER[(e.anim >> 3) & 1], x - 6, y - 3);
        else ctx.drawImage(ORB[(e.anim >> 4) & 1], x - 5, y - 4);
      }
      function drawHud(ctx) {
        text(ctx, 'SCORE', 4, 2, '#ff4040'); text(ctx, String(score).padStart(7, ' '), 4, 11, '#fff');
        text(ctx, 'HI', 70, 2, '#ff4040'); text(ctx, String(hi).padStart(7, ' '), 70, 11, '#fff');
        if (state !== 'title') {
          // bonus multiplier and power meter
          ctx.fillStyle = '#202060'; ctx.fillRect(122, 2, 36, 18);
          text(ctx, 'X' + mult, 140, 4, mult > 1 ? '#f8d020' : '#888', 1, 'center');
          ctx.fillStyle = '#000'; ctx.fillRect(125, 13, 30, 4);
          ctx.fillStyle = power ? ((T >> 2) & 1 ? '#fff' : '#3070ff') : '#30d040'; ctx.fillRect(126, 14, Math.round(Math.min(1, power ? powerT / 480 : pmeter / 3000) * 28), 2);
          text(ctx, 'R' + round, W - 4, 2, '#f8d020', 1, 'right');
          for (let i = 0; i < Math.min(5, lives - 1); i++) ctx.drawImage(JACK.stand[0], W - 16 - i * 12, 10, 12, 14);
        }
      }
      function coinLine(ctx, y) {
        const blink = (T >> 5) & 1;
        if (api.credits === 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, y, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START BUTTON', W / 2, y, '#40e0ff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, H - 9, '#aaa', 1, 'right');
      }
      function renderTitle(ctx) {
        ctx.drawImage(BGS[(T / 300 | 0) % BGS.length], 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
        drawHud(ctx);
        text(ctx, 'BOMB', W / 2 + 2, 40, '#600000', 4, 'center'); text(ctx, 'BOMB', W / 2, 38, '#ff3030', 4, 'center');
        text(ctx, 'JACK', W / 2 + 2, 74, '#604000', 4, 'center'); text(ctx, 'JACK', W / 2, 72, '#f8d020', 4, 'center');
        const bob = Math.round(Math.sin(T / 15) * 6);
        ctx.drawImage(JACK.jump[0], W / 2 - 6, 110 + bob);
        ctx.drawImage(BOMB_LIT[(T >> 3) & 1], 40, 116); ctx.drawImage(BOMB, 174, 116);
        text(ctx, 'BOMB           100', 52, 140, '#fff'); ctx.drawImage(BOMB, 36, 137);
        text(ctx, 'FIRE BOMB      200', 52, 154, '#fff'); ctx.drawImage(BOMB_LIT[(T >> 3) & 1], 36, 151);
        ctx.drawImage(COIN_P[(T >> 3) & 3], 36, 165); text(ctx, 'POWER BALL', 52, 167, '#80c0ff');
        ctx.drawImage(COIN_B, 36, 179); text(ctx, 'BONUS UP', 52, 181, '#f8d020');
        ctx.drawImage(COIN_E, 120, 179); text(ctx, 'EXTRA', 136, 181, '#ff60c0');
        text(ctx, '23 FIRE BOMBS = 50000', W / 2, 198, '#f8a020', 1, 'center');
        coinLine(ctx, 216);
        text(ctx, '\u00a9 1984 TECMO', 4, H - 9, '#888');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        drawFrame(ctx);
        bombs.forEach((b, i) => { if (b.alive) ctx.drawImage(i === litIdx ? BOMB_LIT[(T >> 2) & 1] : BOMB, Math.round(b.x), Math.round(b.y)); });
        for (const it of items) {
          const img = it.kind === 'P' ? COIN_P[(T >> 3) & 3] : it.kind === 'B' ? COIN_B : it.kind === 'E' ? COIN_E : COIN_S;
          if (it.kind === 'P' || it.t < 780 || (T >> 2) & 1) ctx.drawImage(img, Math.round(it.x - 5), Math.round(it.y - 5));
        }
        for (const e of enemies) drawEnemy(ctx, e);
        if (state === 'dying') {
          const fallY = Math.min(FY1, jack.y + Math.max(0, T - 40) * 1.5);
          ctx.save(); ctx.translate(Math.round(jack.x), Math.round(fallY - 7)); ctx.rotate(T < 40 ? T * 0.4 : Math.PI);
          ctx.drawImage(JACK.jump[0], -6, -7); ctx.restore();
        } else drawJack(ctx);
        for (const p of popups) text(ctx, p.s, Math.round(p.x), Math.round(p.y - (45 - p.t) * 0.3), '#fff', 1, 'center');
        drawHud(ctx);
        if (state === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(62, 104, 100, 30);
          text(ctx, 'ROUND ' + round, W / 2, 108, '#f8d020', 1, 'center'); text(ctx, R().name, W / 2, 120, '#fff', 1, 'center');
        }
        if (state === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(40, 96, 144, 52);
          text(ctx, 'ROUND CLEAR', W / 2, 100, '#f8d020', 1, 'center');
          text(ctx, 'FIRE BOMBS ' + litCount, W / 2, 114, '#fff', 1, 'center');
          if (T >= 60) text(ctx, bonusShown ? 'BONUS ' + bonusShown : 'NO BONUS', W / 2, 128, bonusShown ? '#40e0ff' : '#888', 1, 'center');
        }
        if (state === 'over') { ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(52, 112, 120, 24); text(ctx, 'GAME OVER', W / 2, 117, '#ff4040', 2, 'center'); }
        if (demo) {
          ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(62, 150, 100, 26);
          text(ctx, 'DEMO PLAY', W / 2, 153, '#f8d020', 1, 'center');
          if ((T >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 165, api.credits > 0 ? '#40e0ff' : '#ff4040', 1, 'center');
        }
      }

      return { update, render, destroy() { if (!demo) api.setHiScore(score); } };
    }
  });
})();
