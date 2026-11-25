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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '"': [10, 10, 0, 0, 0, 0, 0], '#': [10, 31, 10, 10, 31, 10, 0], '&': [12, 18, 20, 8, 21, 18, 13], '%': [24, 25, 2, 4, 8, 19, 3]
  };
  // text(ctx, s, x, y, col, scale, align: 'left'|'center'|'right')
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
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  // build a sprite canvas from string rows and a palette {char: colour}
  function spr(rows, pal) {
    const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0), cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  function flipH(cv) { const c = mk(cv.width, cv.height), x = c.getContext('2d'); x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0); return c; }
  const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => (Math.random() * n) | 0;

  // =====================================================================
  // Wizard of Wor (Midway, 1980) -- from-scratch recreation.
  // One Worrior against the Wizard's monsters in an 11x6 dungeon with side warp doors and a radar.
  // Burwors -> Garwors -> Thorwors, then the Worluk (double-score dungeon if you get him), then the Wizard.
  // =====================================================================
  const W = 320, H = 224;
  const CS = 24, COLS = 11, ROWS = 6;
  const X0 = 28, Y0 = 22, MW = COLS * CS, MH = ROWS * CS;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const KIND = {
    burwor: { pts: 100, sp: 0.55, col: '#3070ff', invis: false },
    garwor: { pts: 200, sp: 0.72, col: '#ffe020', invis: true },
    thorwor: { pts: 500, sp: 0.92, col: '#ff3030', invis: true },
    worluk: { pts: 1000, sp: 1.35, col: '#c060ff', invis: false },
    wizard: { pts: 2500, sp: 0, col: '#ff60ff', invis: false }
  };
  const ART = {
    pr: ['    YYYY    ', '   YYYYYY   ', '   YYBBBB   ', '   YYYYYY   ', '  YYYYY     ', ' YYYYYYGGGGG', ' YYYYYYY    ', '  YYYYY     ', '  YY  YY    ', '  YY  YY    ', ' YYY  YYY   '],
    pu: ['      G     ', '      G     ', '    YYGY    ', '   YYYGYY   ', '   YBBBBY   ', '  YYYYYYYY  ', ' YYYYYYYYYY ', '  YYYYYYYY  ', '   YY  YY   ', '   YY  YY   ', '  YYY  YYY  '],
    pd: ['    YYYY    ', '   YBBBBY   ', '   YYYYYY   ', '  YYYYYYYY  ', ' YYYYYGYYYY ', '  YYYYGYYY  ', '   YYYGYY   ', '   YY GYY   ', '   YY G YY  ', '  YYY G YYY ', '      G     '],
    burwor: ['        BB  ', '  B    BBBB ', ' BB   BBRBBB', ' B    BBBBBB', ' B  BBBBBB  ', ' BBBBBBBBB  ', '  BBBBBBB   ', '  BBBBBBB   ', '  B B  B B  ', '  B B  B B  ', ' BB BB BB BB'],
    garwor: ['       GGGG ', '      GGRGGG', '      GGGGGG', '      GGGG  ', '  G  GGGGG  ', ' GG GGGGGG  ', ' GGGGGGGGG  ', '  GGGGGGGG  ', '   GGGGGG   ', '   G G  G   ', '  GG GG GG  '],
    thorwor: ['  R         ', ' R R    RR  ', '    R  RRRR ', '     RRRRYR ', '   RRRRRRRR ', '  RRRRRRRR  ', ' R RRRRRR R ', 'R  R R R R R', '  R R R R   ', ' R R   R R  '],
    worluk: [' WW      WW ', 'WWWW    WWWW', 'WWWWW  WWWWW', ' WWWPPPPWWW ', '   PPYYPP   ', '   PPPPPP   ', '  P PPPP P  ', ' P  P  P  P '],
    wizard: ['     MM     ', '    MMMM    ', '   MMMMMM   ', '  MMMMMMMM  ', '    SSSS    ', '    SkSk    ', '   MMSSMM   ', '  MMMMMMMM S', ' MMMMMMMMMSS', ' MMMMMMMMM  ', 'MMMMMMMMMMM ']
  };
  const PAL = {
    Y: '#ffe020', B: '#3070ff', G: '#c0c0c0', R: '#ff3030', W: '#80c0ff', P: '#c060ff', M: '#a040e0', S: '#ffc090', k: '#000'
  };

  ArcadeRegistry.register({
    id: 'wizardofwor', title: 'Wizard of Wor', year: 1980, maker: 'Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#000818', fg: '#ffe020', accent: '#3070ff' },
    create(api) {
      const A = api.audio;
      const S = {};
      const mkS = (k, pal) => spr(ART[k], pal || PAL);
      S.pr = mkS('pr'); S.pl = flipH(S.pr); S.pu = mkS('pu'); S.pd = mkS('pd');
      for (const k of ['burwor', 'garwor', 'thorwor', 'worluk', 'wizard']) {
        const pal = Object.assign({}, PAL);
        if (k === 'garwor') pal.G = '#ffe020', pal.R = '#ff3030';
        const a = mkS(k, pal); S[k] = [a, flipH(a)];
      }
      let hi = api.getHiScore(25000);
      let state = 'title', T = 0, score = 0, lives = 3, dungeon = 1, doubleNext = false, doubleNow = false;
      let hW, vW, mons, pl, pshot, eshots, parts, pops, doorT, phase, garQuota, dT, killedCount, beatT, msg, msgT, bonusGiven = {};

      // ---------- coin-op ----------
      let lastCred = api.credits, coinFlash = 0;
      function pollCoins() { const c = api.credits; if (c > lastCred) A.tone(1800, .06, { vol: .08, slideTo: 2400 }); lastCred = c; if (coinFlash > 0) coinFlash--; }
      function tryStart() { if (api.useCredit()) { lastCred = api.credits; return true; } coinFlash = 90; A.tone(98, .28, { vol: .14 }); return false; }
      function drawCoin(ctx, y) {
        if (api.credits <= 0) { if (coinFlash > 0 ? (api.frame >> 2) & 1 : (api.frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, y, coinFlash > 0 ? '#ff3030' : '#ffd040', 1, 'center'); }
        else if ((api.frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, y, '#ffd040', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 9, '#c8c8c8');
      }
      const sfx = {
        shot() { A.tone(1800, .09, { type: 'square', vol: .08, slideTo: 300 }); },
        eshot() { A.tone(500, .12, { type: 'sawtooth', vol: .07, slideTo: 1500 }); },
        kill() { A.noise(.25, { vol: .16, freq: 3000, slideTo: 200 }); A.tone(300, .25, { type: 'square', vol: .08, slideTo: 60 }); },
        die() { A.noise(.8, { vol: .2, freq: 1500, slideTo: 60 }); A.melody([[400, .1], [300, .1], [200, .1], [100, .4]], { type: 'sawtooth', vol: .1 }); },
        beat(k) { A.tone(k ? 65 : 55, .09, { type: 'triangle', vol: .2 }); },
        appear() { A.tone(200, .3, { type: 'square', vol: .06, slideTo: 1200 }); },
        worluk() { for (let i = 0; i < 6; i++) A.tone(i & 1 ? 1200 : 900, .08, { type: 'square', vol: .06, delay: i * .08 }); },
        wizard() { A.melody([[220, .15], [233, .15], [220, .15], [196, .4]], { type: 'sawtooth', vol: .09 }); },
        door() { A.tone(150, .2, { type: 'square', vol: .08, slideTo: 80 }); },
        extra() { A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .1 }); },
        start() { A.melody([[262, .12], [330, .12], [392, .12], [523, .2], [392, .12], [523, .35]], { type: 'square', vol: .1 }); }
      };
      function say(s, t) { msg = s; msgT = t || 150; }
      function addScore(n, x, y) {
        if (doubleNow) n *= 2;
        score += n; if (x != null) pops.push({ x, y, n, t: 50 });
        if (score > hi) hi = score;
      }
      function title() {
        if (dungeon >= 8) { const k = Math.floor((dungeon - 8) / 4); return ['WORLORD', 'DOUBLE WORLORD', 'TRIPLE WORLORD', 'SUPER WORLORD'][Math.min(k, 3)]; }
        return 'WORRIOR';
      }
      function dungeonName() {
        if (dungeon === 4) return 'THE ARENA';
        if (dungeon === 13) return 'THE PIT';
        if (dungeon >= 8) return 'WORLORD DUNGEON';
        return 'DUNGEON ' + dungeon;
      }

      // ---------- maze ----------
      function genMaze() {
        hW = []; vW = [];
        for (let r = 0; r <= ROWS; r++) { hW.push([]); for (let c = 0; c < COLS; c++) hW[r].push(true); }
        for (let r = 0; r < ROWS; r++) { vW.push([]); for (let c = 0; c <= COLS; c++) vW[r].push(true); }
        if (dungeon === 13 || dungeon % 13 === 0) {
          for (let r = 1; r < ROWS; r++) for (let c = 0; c < COLS; c++) hW[r][c] = false;
          for (let r = 0; r < ROWS; r++) for (let c = 1; c < COLS; c++) vW[r][c] = false;
          return;
        }
        // carve the left half (cols 0..5) and mirror
        const HC = 6, seen = [];
        for (let r = 0; r < ROWS; r++) { seen.push([]); for (let c = 0; c < HC; c++) seen[r].push(false); }
        const openH = (r, c) => { hW[r][c] = false; hW[r][COLS - 1 - c] = false; };          // wall above cell (r,c)
        const openV = (r, c) => { vW[r][c] = false; vW[r][COLS - c] = false; };              // wall left of cell (r,c)
        const stack = [[irnd(ROWS), irnd(HC)]]; seen[stack[0][0]][stack[0][1]] = true;
        while (stack.length) {
          const [r, c] = stack[stack.length - 1];
          const nb = [];
          if (r > 0 && !seen[r - 1][c]) nb.push([r - 1, c, 0]);
          if (r < ROWS - 1 && !seen[r + 1][c]) nb.push([r + 1, c, 2]);
          if (c > 0 && !seen[r][c - 1]) nb.push([r, c - 1, 3]);
          if (c < HC - 1 && !seen[r][c + 1]) nb.push([r, c + 1, 1]);
          if (!nb.length) { stack.pop(); continue; }
          const [nr, nc, d] = nb[irnd(nb.length)];
          if (d === 0) openH(r, c); else if (d === 2) openH(r + 1, c); else if (d === 3) openV(r, c); else openV(r, c + 1);
          seen[nr][nc] = true; stack.push([nr, nc]);
        }
        // knock out dead ends so there are loops everywhere
        const extra = dungeon === 4 ? 0.55 : 0.12;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < HC; c++) {
          const ws = [];
          if (r > 0 && hW[r][c]) ws.push(() => openH(r, c));
          if (r < ROWS - 1 && hW[r + 1][c]) ws.push(() => openH(r + 1, c));
          if (c > 0 && vW[r][c]) ws.push(() => openV(r, c));
          if (c < HC - 1 && vW[r][c + 1]) ws.push(() => openV(r, c + 1));
          const walls = (hW[r][c] ? 1 : 0) + (hW[r + 1][c] ? 1 : 0) + (vW[r][c] ? 1 : 0) + (vW[r][c + 1] ? 1 : 0);
          if (walls >= 3 && ws.length) ws[irnd(ws.length)]();
          else if (Math.random() < extra && ws.length) ws[irnd(ws.length)]();
        }
        // warp corridor cells and the player's entry cell are kept open toward the inside
        vW[2][1] = false; vW[2][COLS - 1] = false;
        hW[5][COLS - 1] = hW[5][COLS - 1] && false; hW[5][0] = false;
        vW[5][COLS - 1] = false; vW[5][1] = false;
      }
      const doorOpen = () => doorT <= 0;
      function canMove(e, r, c, d) {
        if (d === 0) return r > 0 && !hW[r][c];
        if (d === 2) {
          if (r === ROWS - 1) return false;
          return !hW[r + 1][c];
        }
        if (d === 3) { if (c === 0) return r === 2 && doorOpen() && (e === pl || e.kind === 'worluk'); return !vW[r][c]; }
        if (c === COLS - 1) return r === 2 && doorOpen() && (e === pl || e.kind === 'worluk');
        return !vW[r][c + 1];
      }
      const atCenter = e => (e.x - 12) % CS === 0 && (e.y - 12) % CS === 0;
      const cellOf = e => [Math.floor(e.y / CS), Math.floor(((e.x % MW) + MW) % MW / CS)];
      function wrap(e) {
        if (e.x < 0 || e.x > MW) {
          e.x = e.x < 0 ? e.x + MW : e.x - MW;
          if (e === pl) { doorT = 420; sfx.door(); }
          return true;
        }
        return false;
      }

      // ---------- setup ----------
      function newPlayer() { return { x: (COLS - 1) * CS + 12, y: ROWS * CS + 12, dir: 0, face: 0, inBox: true, boxT: 600, acc: 0, moving: false, want: -1, dead: false, deadT: 0, hface: 1 }; }
      function freeCell() {
        for (let tries = 0; tries < 60; tries++) {
          const r = irnd(ROWS), c = irnd(COLS);
          const x = c * CS + 12, y = r * CS + 12;
          if (Math.abs(x - pl.x) + Math.abs(y - pl.y) < 96) continue;
          if (r === ROWS - 1 && c >= COLS - 2) continue;
          if (mons.some(m => m.x === x && m.y === y)) continue;
          return [x, y];
        }
        return [12, 12];
      }
      function spawn(kind) {
        const [x, y] = kind === 'worluk' || kind === 'wizard' ? freeCell() : freeCell();
        const m = { kind, x, y, dir: irnd(4), acc: 0, vis: true, visT: 60 + irnd(120), fireT: 60 + irnd(90), born: 40, hface: 1, tele: 120 };
        mons.push(m); sfx.appear();
        return m;
      }
      function startDungeon() {
        genMaze();
        mons = []; pshot = null; eshots = []; parts = []; pops = []; doorT = 0; killedCount = 0; beatT = 0; dT = 0;
        pl = newPlayer();
        doubleNow = doubleNext; doubleNext = false;
        phase = 'monsters'; garQuota = Math.min(dungeon, 6);
        for (let i = 0; i < 6; i++) spawn('burwor');
        if (dungeon >= 8) for (let i = 0; i < Math.min(dungeon - 7, 3); i++) spawn('garwor');
        if ((dungeon === 4 || dungeon === 12) && !bonusGiven[dungeon]) { bonusGiven[dungeon] = true; lives++; say('BONUS PLAYER', 180); sfx.extra(); }
        else if (dungeon === 1) say('WELCOME TO THE DUNGEONS OF WOR', 180);
        else if (doubleNow) say('DOUBLE SCORE DUNGEON', 180);
        else if (dungeon >= 8) say('WORLORD DUNGEON', 180);
        else say(dungeonName(), 120);
      }
      function startGame() {
        score = 0; lives = 3; dungeon = 1; doubleNext = false; bonusGiven = {};
        startDungeon(); state = 'ready'; T = 0; sfx.start();
      }

      // ---------- movement ----------
      function playerInput() {
        if (api.key('ArrowUp')) return 0; if (api.key('ArrowDown')) return 2;
        if (api.key('ArrowLeft')) return 3; if (api.key('ArrowRight')) return 1; return -1;
      }
      function updatePlayer() {
        const want = playerInput();
        if (pl.inBox) {
          if (--pl.boxT <= 0 || want === 0) { pl.y -= 1; pl.face = 0; pl.moving = true; if (pl.y <= (ROWS - 1) * CS + 12) { pl.y = (ROWS - 1) * CS + 12; pl.inBox = false; } }
          if (api.pressed('Space') && !pshot) fireP(0);
          return;
        }
        pl.moving = false;
        if (want !== -1) { pl.want = want; }
        for (let i = 0; i < 1; i++) {
          if (atCenter(pl)) {
            const [r, c] = cellOf(pl);
            if (want === -1) break;
            if (canMove(pl, r, c, want)) pl.dir = want;
            else { pl.face = want; if (want === 1 || want === 3) pl.hface = want === 1 ? 1 : -1; break; }
          } else {
            if (want === -1) break;
            if (want === (pl.dir + 2) % 4) pl.dir = want;
          }
          pl.x += DX[pl.dir]; pl.y += DY[pl.dir]; pl.moving = true; pl.face = pl.dir;
          if (pl.dir === 1) pl.hface = 1; else if (pl.dir === 3) pl.hface = -1;
          wrap(pl);
        }
        if (api.pressed('Space') && !pshot) fireP(pl.face);
      }
      function fireP(d) { pshot = { x: pl.x, y: pl.y, d }; sfx.shot(); }
      function monSpeed(m) {
        const k = KIND[m.kind];
        const left = mons.filter(o => o.kind !== 'worluk' && o.kind !== 'wizard').length;
        return k.sp * (1 + (dungeon - 1) * 0.05) * (1 + Math.min(dT / 3600, 1) * 0.5) * (1 + killedCount * 0.03) * (left === 1 && m.kind === 'burwor' ? 1.3 : 1);
      }
      function chooseDir(m) {
        const [r, c] = cellOf(m);
        const opts = [];
        for (let d = 0; d < 4; d++) if (canMove(m, r, c, d) && d !== (m.dir + 2) % 4) opts.push(d);
        if (!opts.length) { const back = (m.dir + 2) % 4; if (canMove(m, r, c, back)) m.dir = back; return; }
        let target = null;
        if (m.kind === 'worluk') target = [(m.goal || 0) ? MW + 30 : -30, 2 * CS + 12];
        else if (!pl.dead && !pl.inBox && Math.random() < 0.55 + Math.min(dungeon, 8) * 0.04) target = [pl.x, pl.y];
        if (target) {
          let best = opts[0], bd = 1e9;
          for (const d of opts) { const nx = m.x + DX[d] * CS, ny = m.y + DY[d] * CS; const dd = Math.abs(nx - target[0]) + Math.abs(ny - target[1]); if (dd < bd) { bd = dd; best = d; } }
          m.dir = best;
        } else m.dir = opts[irnd(opts.length)];
      }
      function lineClear(m) {
        // is the player straight ahead of the monster with no wall between?
        if (pl.dead || pl.inBox) return false;
        const [r, c] = cellOf(m), [pr, pc] = cellOf(pl);
        if (r === pr && Math.abs(m.y - pl.y) < 4) {
          const d = pc > c ? 1 : 3; if (m.dir !== d) return false;
          for (let k = Math.min(c, pc) + 1; k <= Math.max(c, pc); k++) if (vW[r][k]) return false;
          return true;
        }
        if (c === pc && Math.abs(m.x - pl.x) < 4) {
          const d = pr > r ? 2 : 0; if (m.dir !== d) return false;
          for (let k = Math.min(r, pr) + 1; k <= Math.max(r, pr); k++) if (hW[k][c]) return false;
          return true;
        }
        return false;
      }
      function updateMonsters() {
        for (const m of mons) {
          if (m.born > 0) { m.born--; continue; }
          if (m.kind === 'wizard') {
            if (--m.tele <= 0) { const [x, y] = freeCell(); m.x = x; m.y = y; m.tele = 90 + irnd(90); m.dir = irnd(4); sfx.appear(); }
            // wizard faces the player when lined up
            const [r, c] = cellOf(m), [pr, pc] = cellOf(pl);
            if (r === pr) m.dir = pc > c ? 1 : 3; else if (c === pc) m.dir = pr > r ? 2 : 0;
          } else {
            m.acc += monSpeed(m);
            while (m.acc >= 1) {
              m.acc -= 1;
              if (atCenter(m)) chooseDir(m);
              const [r, c] = cellOf(m);
              if (atCenter(m) && !canMove(m, r, c, m.dir)) break;
              m.x += DX[m.dir]; m.y += DY[m.dir];
              if (m.dir === 1) m.hface = 1; else if (m.dir === 3) m.hface = -1;
              if (m.x < 0 || m.x > MW) {
                if (m.kind === 'worluk') { m.escaped = true; break; }
                m.x = clamp(m.x, 0, MW);
              }
            }
          }
          if (KIND[m.kind].invis) { if (--m.visT <= 0) { m.vis = !m.vis; m.visT = (m.vis ? 80 : 60) + irnd(120); } } else m.vis = true;
          // shooting
          if (m.kind !== 'worluk' && --m.fireT <= 0) {
            m.fireT = 20;
            if (eshots.length < 2 && lineClear(m) && Math.random() < 0.25 + dungeon * 0.03) { eshots.push({ x: m.x, y: m.y, d: m.dir }); m.fireT = Math.max(40, 120 - dungeon * 8) + irnd(60); sfx.eshot(); }
          }
          if (!pl.dead && !pl.inBox && Math.abs(m.x - pl.x) < 13 && Math.abs(m.y - pl.y) < 13) killPlayer();
        }
        const esc = mons.find(m => m.escaped);
        if (esc) { mons = mons.filter(m => m !== esc); say('THE WORLUK HAS ESCAPED', 150); phaseAfterWorluk(false); }
      }
      // shot movement with wall checks; returns false when the shot dies
      function stepShot(s, speed) {
        for (let i = 0; i < speed; i++) {
          const ox = s.x, oy = s.y;
          s.x += DX[s.d]; s.y += DY[s.d];
          if (s.y > MH) { if (pl.inBox) continue; return false; }
          if (s.x <= 0 || s.x >= MW || s.y <= 0) return false;
          const oc = Math.floor(ox / CS), nc = Math.floor(s.x / CS), or = Math.floor(oy / CS), nr = Math.floor(s.y / CS);
          if (nc !== oc) { const r = Math.floor(s.y / CS); if (vW[r][Math.max(oc, nc)]) return false; }
          if (nr !== or && or < ROWS) { const c = Math.floor(s.x / CS); if (hW[Math.max(or, nr)][c]) return false; }
          if (s.hits && s.hits()) return false;
        }
        return true;
      }
      function updateShots() {
        if (pshot) {
          pshot.hits = () => {
            for (const m of mons) {
              if (m.born > 0) continue;
              if (Math.abs(m.x - pshot.x) < 9 && Math.abs(m.y - pshot.y) < 9) { killMonster(m); return true; }
            }
            return false;
          };
          if (!stepShot(pshot, 4)) pshot = null;
        }
        for (const s of eshots) {
          s.hits = () => !pl.dead && !pl.inBox && Math.abs(pl.x - s.x) < 7 && Math.abs(pl.y - s.y) < 7 ? (killPlayer(), true) : false;
          if (!stepShot(s, 3)) s.gone = true;
        }
        eshots = eshots.filter(s => !s.gone);
      }
      function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = Math.random() * 2; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 30 + irnd(20), col }); } }
      function killMonster(m) {
        mons = mons.filter(o => o !== m); killedCount++;
        burst(m.x, m.y, KIND[m.kind].col, 24); sfx.kill();
        addScore(KIND[m.kind].pts, m.x, m.y);
        if (m.kind === 'burwor') {
          const bLeft = mons.filter(o => o.kind === 'burwor').length;
          if (bLeft < garQuota) spawn('garwor');
        } else if (m.kind === 'garwor') spawn('thorwor');
        else if (m.kind === 'worluk') { say('DOUBLE SCORE DUNGEON NEXT', 150); doubleNext = true; phaseAfterWorluk(true); }
        else if (m.kind === 'wizard') { say('YOU HAVE DEFEATED THE WIZARD OF WOR', 180); phase = 'done'; }
        checkPhase();
      }
      function phaseAfterWorluk(killed) {
        if (dungeon >= 2 && (killed || Math.random() < 0.5)) { phase = 'wizard'; spawn('wizard').born = 60; sfx.wizard(); say('I AM THE WIZARD OF WOR!', 150); }
        else phase = 'done';
      }
      function checkPhase() {
        if (phase === 'monsters' && !mons.some(m => m.kind === 'burwor' || m.kind === 'garwor' || m.kind === 'thorwor')) {
          if (dungeon >= 2) { phase = 'worluk'; const w = spawn('worluk'); w.goal = irnd(2); sfx.worluk(); say('WORLUK!', 100); }
          else phase = 'done';
        }
      }
      function killPlayer() {
        if (pl.dead) return;
        pl.dead = true; state = 'dying'; T = 0; burst(pl.x, pl.y, '#ffe020', 40); sfx.die();
        if (phase === 'wizard') { mons = mons.filter(m => m.kind !== 'wizard'); say('THE WIZARD ESCAPES!', 150); phase = 'done'; }
      }

      // ---------- main ----------
      function gameOver() { state = 'gameover'; T = 0; api.setHiScore(score); }
      function tickParts() {
        for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.t--; }
        parts = parts.filter(p => p.t > 0);
        for (const q of pops) q.t--; pops = pops.filter(q => q.t > 0);
        if (msgT > 0) msgT--;
      }
      function update() {
        T++; pollCoins();
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            break;
          case 'ready':
            tickParts();
            if (T > 120) { state = 'play'; T = 0; }
            break;
          case 'play': {
            dT++; if (doorT > 0) doorT--;
            tickParts();
            updatePlayer(); updateMonsters();
            if (state !== 'play') break;
            updateShots();
            if (state !== 'play') break;
            if (phase === 'wizard' && dT % 1500 === 0) { mons = mons.filter(m => m.kind !== 'wizard'); say('THE WIZARD ESCAPES!', 150); phase = 'done'; }
            // heartbeat, faster as monsters fall
            const tempo = Math.max(10, 40 - killedCount * 3 - Math.floor(dT / 600) * 2);
            if (++beatT >= tempo) { beatT = 0; sfx.beat((dT / tempo) & 1); }
            if (phase === 'done') { state = 'clear'; T = 0; A.melody([[523, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: .1 }); }
            break;
          }
          case 'dying':
            tickParts(); dT++;
            if (T > 150) {
              const respawn = () => { pl = newPlayer(); eshots = []; pshot = null; state = 'ready'; T = 60; if (phase === 'done') { state = 'clear'; T = 0; } };
              if (lives > 1) { lives--; respawn(); }
              else if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, () => { lives = 0; gameOver(); });
              else { lives = 0; gameOver(); }
            }
            break;
          case 'clear':
            tickParts();
            if (T > 160) { dungeon++; startDungeon(); state = 'ready'; T = 0; }
            break;
          case 'gameover':
            tickParts();
            if (T > 260 || (T > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- drawing ----------
      function drawMaze(ctx) {
        const col = doubleNow ? ((api.frame >> 4) & 1 ? '#ff40ff' : '#3070ff') : '#3070ff';
        ctx.fillStyle = col;
        for (let r = 0; r <= ROWS; r++) for (let c = 0; c < COLS; c++) if (hW[r][c]) {
          if (r === ROWS && c === COLS - 1) continue;
          ctx.fillRect(X0 + c * CS - 1, Y0 + r * CS - 1, CS + 2, 2);
        }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS; c++) if (vW[r][c]) {
          if (r === 2 && (c === 0 || c === COLS)) continue;
          ctx.fillRect(X0 + c * CS - 1, Y0 + r * CS - 1, 2, CS + 2);
        }
        // warp doors
        const dc = doorOpen() ? '#3070ff' : '#ff3030';
        ctx.fillStyle = dc;
        for (const side of [0, 1]) {
          const x = side ? X0 + MW - 1 : X0 - 1, y = Y0 + 2 * CS;
          if (!doorOpen()) ctx.fillRect(x, y, 2, CS);
          const ox = side ? X0 + MW + 1 : X0 - 19;
          ctx.fillRect(ox, y - 1, 18, 2); ctx.fillRect(ox, y + CS - 1, 18, 2);
          if (doorOpen() && (api.frame >> 4) & 1) { ctx.fillStyle = '#80c0ff'; const ax = side ? X0 + MW + 8 : X0 - 12; ctx.fillRect(ax, y + 11, 4, 2); ctx.fillStyle = dc; }
        }
        // player box
        ctx.fillStyle = '#ffe020';
        const bx = X0 + (COLS - 1) * CS, by = Y0 + MH;
        ctx.fillRect(bx - 1, by, 2, CS); ctx.fillRect(bx + CS - 1, by, 2, CS); ctx.fillRect(bx - 1, by + CS - 1, CS + 2, 2);
        if (!pl.inBox) ctx.fillRect(bx - 1, by - 1, CS + 2, 2);
      }
      function drawEntity(ctx, img, x, y) { ctx.drawImage(img, Math.round(X0 + x - img.width / 2), Math.round(Y0 + y - img.height / 2)); }
      function drawPlayer(ctx) {
        if (pl.dead) return;
        let img = pl.face === 0 ? S.pu : pl.face === 2 ? S.pd : (pl.hface > 0 ? S.pr : S.pl);
        if (pl.face === 1) img = S.pr; else if (pl.face === 3) img = S.pl;
        drawEntity(ctx, img, pl.x, pl.y);
      }
      function drawRadar(ctx) {
        const rx = W / 2 - 33, ry = 174, cw = 6, ch = 5;
        ctx.fillStyle = '#3070ff'; ctx.fillRect(rx - 2, ry - 2, COLS * cw + 4, 1); ctx.fillRect(rx - 2, ry + ROWS * ch + 1, COLS * cw + 4, 1);
        ctx.fillRect(rx - 2, ry - 2, 1, ROWS * ch + 4); ctx.fillRect(rx + COLS * cw + 1, ry - 2, 1, ROWS * ch + 4);
        text(ctx, 'RADAR', W / 2, ry + ROWS * ch + 5, '#3070ff', 1, 'center');
        for (const m of mons) {
          if (m.kind === 'wizard' || m.born > 0 && (m.born & 4)) continue;
          const [r, c] = cellOf(m);
          ctx.fillStyle = KIND[m.kind].col; ctx.fillRect(rx + c * cw + 1, ry + r * ch + 1, 4, 3);
        }
      }
      function drawHUD(ctx) {
        text(ctx, dungeonName(), W / 2, 6, doubleNow ? '#ff60ff' : '#ffe020', 1, 'center');
        if (doubleNow) text(ctx, 'X2', W - 30, 6, '#ff60ff');
        text(ctx, 'HI', 8, 176, '#3070ff'); text(ctx, pad(hi, 6), 8, 186, '#ffffff');
        text(ctx, title(), 8, 200, '#ffe020');
        text(ctx, pad(score, 6), 220, 200, '#ffe020', 1, 'right');
        for (let i = 0; i < Math.min(lives - 1, 4); i++) ctx.drawImage(S.pr, X0 + MW + 2 + (i % 2) * 13, Y0 + MH + 2 + Math.floor(i / 2) * 12);
        if (pl && pl.inBox && state === 'play') text(ctx, String(Math.ceil(pl.boxT / 60)), X0 + (COLS - 1) * CS + 9, Y0 + MH + 8, '#ffffff');
      }
      function drawWorld(ctx) {
        drawMaze(ctx);
        for (const m of mons) {
          if (m.born > 0 && (m.born & 4)) continue;
          if (!m.vis) continue;
          const img = S[m.kind][m.hface > 0 ? 0 : 1];
          const bob = m.kind === 'worluk' ? ((api.frame >> 2) & 1) : 0;
          drawEntity(ctx, img, m.x, m.y - bob);
        }
        drawPlayer(ctx);
        if (pshot) { ctx.fillStyle = '#ffe020'; const h = pshot.d === 1 || pshot.d === 3; ctx.fillRect(X0 + pshot.x - (h ? 3 : 0), Y0 + pshot.y - (h ? 0 : 3), h ? 6 : 1, h ? 1 : 6); }
        for (const s of eshots) { ctx.fillStyle = '#ff60ff'; const h = s.d === 1 || s.d === 3; ctx.fillRect(X0 + s.x - (h ? 3 : 0), Y0 + s.y - (h ? 0 : 3), h ? 6 : 1, h ? 1 : 6); }
        for (const p of parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(X0 + p.x), Math.round(Y0 + p.y), 2, 2); }
        for (const q of pops) text(ctx, String(doubleNow ? q.n * 2 : q.n), Math.round(X0 + q.x), Math.round(Y0 + q.y - 6 - (50 - q.t) * 0.2), '#ffffff', 1, 'center');
        drawRadar(ctx); drawHUD(ctx);
        if (msgT > 0) { const w = msg.length * 6 + 8; ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - w / 2, Y0 + MH / 2 - 6, w, 13); text(ctx, msg, W / 2, Y0 + MH / 2 - 3, (api.frame >> 3) & 1 ? '#ff60ff' : '#ffe020', 1, 'center'); }
      }
      function drawTitle(ctx) {
        text(ctx, 'WIZARD', W / 2 + 2, 18, '#402080', 3, 'center'); text(ctx, 'WIZARD', W / 2, 16, '#ffe020', 3, 'center');
        text(ctx, 'OF WOR', W / 2 + 2, 44, '#402080', 3, 'center'); text(ctx, 'OF WOR', W / 2, 42, '#3070ff', 3, 'center');
        const page = Math.floor(T / 450) % 2;
        if (page === 0) {
          const list = [['burwor', 'BURWOR'], ['garwor', 'GARWOR'], ['thorwor', 'THORWOR'], ['worluk', 'WORLUK'], ['wizard', 'WIZARD OF WOR']];
          list.forEach(([k, n], i) => {
            const y = 76 + i * 18;
            ctx.drawImage(S[k][(T >> 5) & 1], 92, y - 2);
            text(ctx, n, 112, y, KIND[k].col);
            text(ctx, String(KIND[k].pts), 240, y, '#ffffff', 1, 'right');
          });
          text(ctx, 'WORLUK KILL = DOUBLE SCORE DUNGEON', W / 2, 170, '#c060ff', 1, 'center');
        } else {
          text(ctx, 'THE WIZARD OF WOR CHALLENGES YOU!', W / 2, 76, '#ff60ff', 1, 'center');
          ctx.drawImage(S.pr, 100, 96); text(ctx, 'WORRIOR', 120, 98, '#ffe020');
          text(ctx, 'GARWORS AND THORWORS TURN', W / 2, 120, '#c0c0ff', 1, 'center');
          text(ctx, 'INVISIBLE - WATCH THE RADAR!', W / 2, 130, '#c0c0ff', 1, 'center');
          text(ctx, 'SIDE DOORS WARP ACROSS THE DUNGEON', W / 2, 146, '#c0c0ff', 1, 'center');
          text(ctx, 'SURVIVE TO DUNGEON 8: WORLORD', W / 2, 162, '#ffe020', 1, 'center');
          text(ctx, 'HIGH SCORE ' + pad(hi, 6), W / 2, 178, '#40e040', 1, 'center');
        }
        text(ctx, '\u00a9 1980 MIDWAY', W / 2, 192, '#ffffff', 1, 'center');
        drawCoin(ctx, 204);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); return; }
        drawWorld(ctx);
        if (state === 'ready' && T < 60 && !msgT) { if ((T >> 3) & 1) text(ctx, 'GET READY', W / 2, Y0 + MH / 2 - 3, '#ffffff', 1, 'center'); }
        if (state === 'clear') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, Y0 + MH / 2 + 10, 120, 12); text(ctx, 'DUNGEON CLEARED', W / 2, Y0 + MH / 2 + 12, '#40ff40', 1, 'center'); }
        if (state === 'gameover') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 70, Y0 + MH / 2 - 20, 140, 40);
          text(ctx, 'GAME OVER', W / 2, Y0 + MH / 2 - 16, '#ff3030', 2, 'center');
          text(ctx, 'RANK: ' + title(), W / 2, Y0 + MH / 2 + 6, '#ffe020', 1, 'center');
        }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
