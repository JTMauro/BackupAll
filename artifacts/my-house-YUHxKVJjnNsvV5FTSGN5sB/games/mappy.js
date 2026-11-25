// Mappy (Namco, 1983) - police mouse vs. the Meowkies and Goro: trampolines, doors, microwave doors, stolen goods, bonus balloon round.
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
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  // draw a sprite canvas with its feet at (x, y), optionally mirrored
  function drawSpr(ctx, cv, x, y, flip) {
    const w = cv.width, h = cv.height, dx = Math.round(x - w / 2), dy = Math.round(y - h);
    if (flip) { ctx.save(); ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(cv, 0, 0); ctx.restore(); }
    else ctx.drawImage(cv, dx, dy);
  }
  const pad = (n, l) => String(n).padStart(l, '0');

  // ---------- sprites ----------
  const PAL = {
    B: '#2a5cff', b: '#1838a8', Y: '#ffd200', W: '#ffffff', G: '#b8b8d0', P: '#ff8090', k: '#000000',
    M: '#ff6ec4', m: '#b83088', O: '#ff7a1a', o: '#a83c08', R: '#e02020', w: '#ffe0c0'
  };
  const MAPPY_ART = [[
    '....BBBB....',
    '...BBYBBB...',
    '..BBBBBBBBB.',
    '.GG.WWWWW...',
    'GGGGWWkWWW..',
    'GGGGWWWWWWWP',
    '.GGWWWWWWW..',
    '...WWWWWW...',
    '..BBBBBBB...',
    '.WBBBYBBBW..',
    '.WBBBBBBBW..',
    '..BBBBBBB...',
    '..BB...BB...',
    '..BB...BB...',
    '.kkk...kkk..'
  ], [
    '....BBBB....',
    '...BBYBBB...',
    '..BBBBBBBBB.',
    '.GG.WWWWW...',
    'GGGGWWkWWW..',
    'GGGGWWWWWWWP',
    '.GGWWWWWWW..',
    '...WWWWWW...',
    '..BBBBBBB...',
    '..BBBYBBBW..',
    '.WBBBBBBBW..',
    '.W.BBBBBB...',
    '...BB.BB....',
    '...BBBB.....',
    '..kkkkkk....'
  ]];
  const MAPPY_FRONT = [
    'GG..BBBB..GG',
    'GGGBBYYBBGGG',
    'GGBBBBBBBBGG',
    '.G.WWWWWW.G.',
    '...WkWWkW...',
    '...WWPPWW...',
    'W...WWWW...W',
    'WB.BBBBBB.BW',
    '.BBBBYBBBBB.',
    '...BBBBBB...',
    '...BBBBBB...',
    '...BB..BB...',
    '...BB..BB...',
    '..kkk..kkk..'
  ];
  const CAT_ART = [[
    '...X...X....',
    '...XX.XX....',
    '...XXXXX....',
    '..XXWXWXX...',
    '..XXkXkXX...',
    '..XWWPWWX...',
    '...XWWWX....',
    '...XXXXX...X',
    '..XXXXXXX.X.',
    '.X.XXXXX.X..',
    '...XXXXXXX..',
    '...XX.XX....',
    '...XX.XX....',
    '..kkk.kkk...'
  ], [
    '...X...X....',
    '...XX.XX....',
    '...XXXXX....',
    '..XXWXWXX...',
    '..XXkXkXX...',
    '..XWWPWWX...',
    '...XWWWX....',
    'X..XXXXX....',
    '.X.XXXXXX...',
    '..XXXXXX.X..',
    '...XXXXX..X.',
    '....XXX.....',
    '...XX.XX....',
    '..kkk..kkk..'
  ]];
  const GORO_ART = [[
    '...X.....X....',
    '...XX...XX....',
    '...XXXXXXX....',
    '..XXXXXXXXX...',
    '.WXXWWXWWXXW..',
    'W.XXkWXWkXX.W.',
    '.WXWWWPWWWXW..',
    '..XXWWWWWXX...',
    '...XXXXXXX...X',
    '..XXXXXXXXX.X.',
    '.XXXXXXXXXXXX.',
    '.XXXXYYYXXXX..',
    '..XXXXXXXXX...',
    '...XXX.XXX....',
    '...XXX.XXX....',
    '..kkkk.kkkk...'
  ], [
    '...X.....X....',
    '...XX...XX....',
    '...XXXXXXX....',
    '..XXXXXXXXX...',
    '.WXXWWXWWXXW..',
    'W.XXkWXWkXX.W.',
    '.WXWWWPWWWXW..',
    '..XXWWWWWXX...',
    'X..XXXXXXX....',
    '.X.XXXXXXXX...',
    '..XXXXXXXXXXX.',
    '..XXXYYYXXXXX.',
    '...XXXXXXXX...',
    '....XXXXXX....',
    '...XXX..XXX...',
    '..kkkk..kkkk..'
  ]];

  ArcadeRegistry.register({
    id: 'mappy', title: 'Mappy', year: 1983, maker: 'Namco',
    width: 288, height: 224, vector: false, pointer: false,
    controls: 'Arrows: run / hop off trampoline \u00b7 Space or X: open/close door \u00b7 Enter: start',
    marquee: { bg: '#1a0a5a', fg: '#ff9ad0', accent: '#3a7bff' },
    create(api) {
      const W = 288, H = 224, MW = 576, A = api.audio;
      const FY = [204, 174, 144, 114, 84, 54];
      const TRAMP_Y = 216, APEX = 46;
      const SHAFTS = [64, 176, 288, 400, 512], SHW = 12;
      const SEGS = [[8, 52], [76, 164], [188, 276], [300, 388], [412, 500], [524, 568]];
      const ITEM_VAL = [100, 200, 300, 400, 500];
      const TRAMP_COL = ['#30e040', '#3a7bff', '#ffd200', '#ff3030'];

      const SPR = {
        mappy: MAPPY_ART.map(a => sprite(a, PAL)), mappyF: sprite(MAPPY_FRONT, PAL),
        cat: CAT_ART.map(a => sprite(a, { ...PAL, X: PAL.M })),
        catStun: CAT_ART.map(a => sprite(a, { ...PAL, X: '#9090ff' })),
        goro: GORO_ART.map(a => sprite(a, { ...PAL, X: PAL.O })),
        goroStun: GORO_ART.map(a => sprite(a, { ...PAL, X: '#9090ff' }))
      };

      let hi = api.getHiScore(20000);
      let state = 'title', T = 0, score = 0, lives = 3, round = 1, nextExtra = 20000;
      let m = null, cats = [], doors = [], items = [], waves = [], popups = [], balloons = [], tramp = [0, 0, 0, 0, 0];
      let roundT = 0, hurry = false, pairMult = 2, lastType = -1, bonusRound = false, camX = 0, deathKind = '';
      let musicT = 0, musicI = 0, bonusTime = 0, perfect = false, gameOverT = 0;
      let coinFlash = 0, lastCred = api.credits;
      let demo = { x: -20, phase: 0 };

      // ---------- sound ----------
      const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
      const THEME = [76, 79, 84, 79, 81, 79, 76, 72, 74, 77, 81, 77, 79, 76, 74, 0, 76, 79, 84, 79, 81, 84, 88, 84, 86, 84, 81, 77, 79, 0, 72, 0];
      const BASS = [48, 55, 48, 55, 53, 57, 53, 57, 55, 59, 55, 59, 48, 55, 48, 43];
      const BONUS_THEME = [72, 76, 79, 76, 72, 76, 79, 84, 81, 77, 74, 77, 79, 76, 72, 0];
      function music() {
        if (state !== 'play') return;
        const tempo = bonusRound ? 8 : hurry ? 7 : 10;
        if (++musicT < tempo) return;
        musicT = 0;
        const mel = bonusRound ? BONUS_THEME : THEME;
        const n = mel[musicI % mel.length];
        if (n) A.tone(NOTE(n), tempo / 60 * 0.9, { type: 'square', vol: 0.045 });
        if (musicI % 2 === 0) { const b = BASS[(musicI >> 1) % BASS.length]; A.tone(NOTE(b), tempo / 30 * 0.8, { type: 'triangle', vol: 0.09 }); }
        musicI++;
      }
      const sfx = {
        bounce(n) { A.tone(260 + n * 90, 0.09, { type: 'square', vol: 0.12, slideTo: 520 + n * 160 }); },
        hop() { A.tone(700, 0.05, { type: 'square', vol: 0.1, slideTo: 400 }); },
        door() { A.noise(0.08, { vol: 0.18, freq: 900 }); A.tone(140, 0.06, { type: 'square', vol: 0.1 }); },
        stun() { A.tone(900, 0.15, { type: 'square', vol: 0.12, slideTo: 200 }); },
        wave() { A.tone(200, 0.6, { type: 'sawtooth', vol: 0.1, slideTo: 1600 }); A.noise(0.5, { vol: 0.08, freq: 3000, slideTo: 400 }); },
        item(p) { A.melody([[880, 0.05], [1175, 0.05], [1568, 0.08]].map(([f, d]) => [f * (p ? 1.26 : 1), d]), { type: 'square', vol: 0.12 }); },
        bonus() { A.melody([[1047, 0.06], [1319, 0.06], [1568, 0.06], [2093, 0.14]], { type: 'square', vol: 0.12 }); },
        pop() { A.noise(0.06, { vol: 0.2, freq: 4000 }); A.tone(1200, 0.05, { type: 'square', vol: 0.08 }); },
        death() { A.melody([[784, 0.1], [740, 0.1], [698, 0.1], [659, 0.1], [622, 0.1], [587, 0.15], [0, 0.1], [392, 0.1], [262, 0.3]], { type: 'square', vol: 0.13 }); },
        breakT() { A.tone(400, 0.5, { type: 'square', vol: 0.13, slideTo: 60 }); A.noise(0.2, { vol: 0.15, freq: 1500 }); },
        clear() { A.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2], [0, 0.05], [988, 0.1], [1047, 0.3]], { type: 'square', vol: 0.12 }); },
        start() { A.melody([[659, 0.12], [784, 0.12], [1047, 0.12], [784, 0.12], [880, 0.12], [1047, 0.12], [1319, 0.36]], { type: 'square', vol: 0.12 }); },
        hurry() { A.melody([[1319, 0.07], [0, 0.03], [1319, 0.07], [0, 0.03], [1319, 0.07], [1568, 0.2]], { type: 'square', vol: 0.12 }); },
        extra() { A.melody([[1047, 0.08], [1568, 0.08], [1047, 0.08], [1568, 0.16]], { type: 'square', vol: 0.14 }); }
      };

      // ---------- helpers ----------
      const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
      const rnd = n => Math.floor(Math.random() * n);
      function gapAt(x) { for (let i = 0; i < SHAFTS.length; i++) if (Math.abs(x - SHAFTS[i]) < SHW - 4) return i; return -1; }
      function segOf(x) { for (let i = 0; i < SEGS.length; i++) if (x >= SEGS[i][0] - 4 && x <= SEGS[i][1] + 4) return i; return -1; }
      function doorBlock(f, x, nx, dir) {
        for (const d of doors) if (d.f === f && !d.open && sign(d.x - x) === dir && Math.abs(d.x - nx) < 6) return d;
        return null;
      }
      function addScore(n, x, y) {
        score += n;
        if (x != null) popups.push({ x, y, t: 60, txt: String(n) });
        if (score >= nextExtra) { lives++; nextExtra += nextExtra === 20000 ? 50000 : 70000; sfx.extra(); }
        if (score > hi) hi = score;
      }
      function catSpeed(c) {
        let s = Math.min(1.2, 0.68 + round * 0.04);
        if (c.type === 'goro') s *= 0.85;
        if (hurry) s *= 1.35;
        return s;
      }

      // ---------- round setup ----------
      function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
      function genRound() {
        bonusRound = round % 4 === 3;
        doors = []; items = []; waves = []; popups = []; balloons = [];
        tramp = SHAFTS.map(() => 0); roundT = 0; hurry = false; pairMult = 2; lastType = -1; perfect = false;
        if (bonusRound) { genBonus(); return; }
        const pDoor = Math.min(0.75, 0.45 + round * 0.03);
        for (let f = 0; f < 6; f++) for (let s = 1; s <= 4; s++) {
          if (Math.random() >= pDoor) continue;
          const [a, b] = SEGS[s];
          const x = Math.round(a + 22 + Math.random() * (b - a - 44));
          if (f === 0 && Math.abs(x - 100) < 26) continue;
          doors.push({ f, x, open: false, dir: 1, power: false, swing: 0 });
        }
        const nPow = round < 5 ? 2 : 3;
        shuffle(doors.slice()).slice(0, nPow).forEach(d => { d.power = true; });
        const slots = [];
        for (let f = 0; f < 6; f++) for (let s = 0; s < 6; s++) if (!(f === 0 && s === 1)) slots.push([f, s]);
        shuffle(slots);
        for (let i = 0; i < 10; i++) {
          const [f, s] = slots[i], [a, b] = SEGS[s];
          let x = (a + b) >> 1;
          for (let k = 0; k < 30; k++) {
            const cx = Math.round(a + 10 + Math.random() * (b - a - 20));
            if (doors.every(d => d.f !== f || Math.abs(d.x - cx) >= 16)) { x = cx; break; }
          }
          doors = doors.filter(d => d.f !== f || Math.abs(d.x - x) >= 12);
          items.push({ f, x, type: i >> 1, got: false });
        }
      }
      function genBonus() {
        bonusTime = 60 * 25;
        for (let s = 0; s < 5; s++) {
          const fs = shuffle([1, 2, 3, 4, 5]).slice(0, 2);
          for (const f of fs) balloons.push({ x: SHAFTS[s], y: FY[f] - 18, big: false, got: false, c: rnd(4) });
        }
        for (let f = 1; f < 6; f += 2) for (const s of [0, 5]) balloons.push({ x: (SEGS[s][0] + SEGS[s][1]) >> 1, y: FY[f] - 10, big: false, got: false, c: rnd(4), floor: f });
        balloons.push({ x: 232, y: FY[5] - 12, big: true, got: false, c: 0, floor: 5 });
      }
      function resetActors() {
        m = { x: 100, y: FY[0], f: 0, mode: 'walk', s: -1, vy: 0, face: 1, anim: 0, skipF: -1, lastF: 0, inv: 0 };
        tramp = SHAFTS.map(() => 0); waves = []; camX = 0;
        cats = [];
        if (bonusRound) return;
        const n = Math.min(5, 2 + Math.floor((round - 1) / 3));
        cats.push(makeCat('goro', 30));
        for (let i = 0; i < n; i++) cats.push(makeCat('meow', 90 + i * 70));
        if (hurry) cats.push(makeCat('meow', 400));
      }
      function makeCat(type, delay) {
        return { type, x: 288, y: 28, f: -1, mode: 'enter', delay, vy: 1, dir: rnd(2) ? 1 : -1, s: 2, skipF: -1, bounces: 0, wait: 0, stun: 0, goal: null, anim: rnd(20), wander: 0, hideItem: null, lastF: -1 };
      }
      function newGame() {
        score = 0; lives = 3; round = 1; nextExtra = 20000;
        genRound(); resetActors(); state = 'ready'; T = 0; sfx.start();
      }

      // ---------- Mappy ----------
      function enterShaft(o, s, dirDown) {
        o.mode = 'air'; o.s = s; o.x = SHAFTS[s]; o.vy = dirDown ? 1 : -1; o.skipF = o.f; o.lastF = o.f; o.f = -1; o.bounces = 0;
      }
      function exitShaft(o, f, dir) {
        o.mode = 'walk'; o.f = f; o.y = FY[f]; o.x = SHAFTS[o.s] + dir * 15; o.face = dir; o.dir = dir; o.s = -1; o.lastF = f;
      }
      // moves an airborne actor; returns {landed, cross:[floors crossed]}
      function airStep(o, speed) {
        const py = o.y;
        o.y += o.vy * speed;
        if (o.vy < 0 && o.y <= APEX) { o.y = APEX; o.vy = 1; }
        const res = { landed: false, cross: [] };
        if (o.vy > 0 && o.y >= TRAMP_Y) { o.y = TRAMP_Y; o.vy = -1; res.landed = true; }
        if (o.skipF >= 0 && Math.abs(o.y - FY[o.skipF]) > 5) o.skipF = -1;
        for (let f = 0; f < 6; f++) {
          if (f === o.skipF) continue;
          const fy = FY[f];
          if ((py < fy && o.y >= fy) || (py > fy && o.y <= fy)) res.cross.push(f);
        }
        return res;
      }
      function updateMappy() {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight');
        const want = L && !R ? -1 : R && !L ? 1 : 0;
        if (m.inv > 0) m.inv--;
        if (m.mode === 'walk') {
          if (want) {
            m.face = want;
            const nx = m.x + want * 1.3;
            const d = doors.length ? doorBlock(m.f, m.x, nx, want) : null;
            if (!d && nx > 12 && nx < MW - 12) { m.x = nx; m.anim++; }
            const g = gapAt(m.x);
            if (g >= 0) { enterShaft(m, g, true); sfx.hop(); }
          }
          if (api.anyPressed('Space', 'KeyX')) useDoor();
        } else {
          const r = airStep(m, 1.5);
          if (r.landed) {
            tramp[m.s]++;
            if (tramp[m.s] >= 4) { killMappy('tramp'); return; }
            sfx.bounce(tramp[m.s]);
          }
          if (want) for (const f of r.cross) { exitShaft(m, f, want); tramp = SHAFTS.map(() => 0); sfx.hop(); break; }
        }
        if (m.mode === 'walk') m.lastF = m.f;
        const tx = Math.max(0, Math.min(MW - W, m.x - W / 2));
        camX += (tx - camX) * 0.2;
        if (Math.abs(tx - camX) < 0.5) camX = tx;
      }
      function useDoor() {
        let best = null, bd = 99;
        for (const d of doors) {
          if (d.f !== m.f) continue;
          const dx = d.x - m.x;
          if (Math.abs(dx) <= 15 && dx * m.face >= -3 && Math.abs(dx) < bd) { best = d; bd = Math.abs(dx); }
        }
        if (!best) return;
        const d = best;
        if (d.open) { d.open = false; sfx.door(); return; }
        d.open = true; d.dir = m.face; d.swing = 12; sfx.door();
        if (d.power) {
          d.power = false;
          waves.push({ f: d.f, x: d.x, dir: m.face, n: 0, t: 0 });
          sfx.wave();
        } else {
          let hit = 0;
          for (const c of cats) {
            if (c.f !== d.f || (c.mode !== 'walk')) continue;
            const rel = (c.x - d.x) * m.face;
            if (rel >= -2 && rel <= 30) { c.mode = 'stun'; c.stun = Math.max(120, 260 - round * 8); hit++; }
          }
          if (hit) sfx.stun();
        }
      }
      function killMappy(kind) {
        if (state !== 'play') return;
        deathKind = kind; state = 'dying'; T = 0; sfx.death();
        if (kind === 'tramp') sfx.breakT();
      }

      // ---------- cats ----------
      function targetFloor() { return m.mode === 'walk' ? m.f : m.lastF; }
      function updateCat(c) {
        c.anim++;
        if (c.mode === 'enter') {
          if (--c.delay > 0) return;
          c.mode = 'air'; c.x = 288; c.y = 28; c.vy = 1; c.s = 2; c.skipF = -1; c.bounces = 0; c.f = -1;
          return;
        }
        if (c.mode === 'wave' || c.mode === 'gone') return;
        if (c.mode === 'stun') { if (--c.stun <= 0) c.mode = 'walk'; return; }
        if (c.mode === 'hide') {
          if (--c.stun <= 0 || c.hideItem.got) { c.mode = 'walk'; c.hideItem = null; }
          return;
        }
        const sp = catSpeed(c);
        if (c.mode === 'air') {
          const r = airStep(c, 1.5);
          if (r.landed) c.bounces++;
          const tf = targetFloor();
          for (const f of r.cross) {
            let ex = 0;
            if (f === tf && (c.y < 30 || c.bounces > 0 || c.vy > 0)) {
              ex = m.mode === 'walk' ? (m.x < c.x ? -1 : 1) : (rnd(2) ? 1 : -1);
              if (Math.random() < 0.12) ex = 0;
            } else if (c.bounces >= 2 && Math.random() < 0.18) ex = rnd(2) ? 1 : -1;
            if (c.bounces >= 5) ex = ex || (rnd(2) ? 1 : -1);
            if (ex) { exitShaft(c, f, ex); c.goal = null; c.wander = 40; break; }
          }
          return;
        }
        // walking
        const tf = targetFloor();
        let dir = c.dir;
        if (c.wander > 0) c.wander--;
        else if (c.f === tf && m.mode === 'walk' && state === 'play') dir = sign(m.x - c.x) || c.dir;
        else {
          if (c.goal == null) {
            const s = segOf(c.x), opts = [];
            if (s > 0) opts.push(SHAFTS[s - 1]);
            if (s >= 0 && s < 5) opts.push(SHAFTS[s]);
            c.goal = opts.length === 2 ? (Math.random() < 0.6 ? (Math.abs(opts[0] - m.x) < Math.abs(opts[1] - m.x) ? opts[0] : opts[1]) : opts[rnd(2)]) : (opts[0] || 288);
          }
          dir = sign(c.goal - c.x) || c.dir;
        }
        if (c.wander === 0 && Math.random() < 0.003) { c.wander = 50 + rnd(60); dir = -dir; }
        c.dir = dir;
        const nx = c.x + dir * sp;
        const d = doorBlock(c.f, c.x, nx, dir);
        if (d) {
          if (++c.wait > 45) {
            c.wait = 0;
            if (d.power || Math.random() < 0.35) { c.dir = -dir; c.wander = 60; c.goal = null; }
            else { d.open = true; d.dir = dir; d.swing = 12; sfx.door(); }
          }
          return;
        }
        c.wait = 0;
        if (nx < 12 || nx > MW - 12) { c.dir = -dir; c.goal = null; return; }
        c.x = nx;
        if (c.type === 'goro' && c.wander === 0) {
          for (const it of items) if (!it.got && it.f === c.f && Math.abs(it.x - c.x) < 1 && Math.random() < 0.5 && !cats.some(o => o.hideItem === it)) {
            c.mode = 'hide'; c.hideItem = it; c.stun = 180 + rnd(180); c.x = it.x; return;
          }
        }
        const g = gapAt(c.x);
        if (g >= 0) { enterShaft(c, g, true); c.goal = null; }
      }
      function updateWaves() {
        for (const w of waves) {
          w.x += w.dir * 2.4; w.t++;
          for (const c of cats) {
            if (c.f !== w.f || (c.mode !== 'walk' && c.mode !== 'stun')) continue;
            if (Math.abs(c.x - w.x) < 10) {
              c.mode = 'wave'; c.waveRef = w;
              const pts = c.type === 'goro' ? 1000 * (w.n + 1) : 200 << w.n;
              w.n++; addScore(pts, c.x, FY[w.f] - 20); A.tone(600 + w.n * 200, 0.1, { type: 'square', vol: 0.12 });
            }
          }
          for (const c of cats) if (c.mode === 'wave' && c.waveRef === w) c.x = w.x;
        }
        for (const w of waves) if (w.x < -20 || w.x > MW + 20) {
          let i = 0;
          for (const c of cats) if (c.waveRef === w) { c.waveRef = null; c.mode = 'enter'; c.delay = 120 + (i++) * 60; c.f = -1; }
        }
        waves = waves.filter(w => w.x >= -20 && w.x <= MW + 20);
      }

      function updatePlay() {
        roundT++;
        if (!bonusRound && !hurry && roundT === 60 * 50) {
          hurry = true; sfx.hurry(); cats.push(makeCat('meow', 30));
          popups.push({ x: m.x, y: 60, t: 120, txt: 'HURRY!' });
        }
        updateMappy();
        if (state !== 'play') return;
        for (const d of doors) if (d.swing > 0) d.swing--;
        for (const c of cats) updateCat(c);
        updateWaves();
        // item pickup
        if (m.mode === 'walk') {
          for (const it of items) {
            if (it.got || it.f !== m.f || Math.abs(it.x - m.x) > 7) continue;
            it.got = true;
            let pts = ITEM_VAL[it.type], pair = false;
            if (lastType === it.type) { pts *= pairMult; pairMult++; lastType = -1; pair = true; }
            else lastType = it.type;
            addScore(pts, it.x, FY[it.f] - 18); sfx.item(pair);
            const goro = cats.find(c => c.hideItem === it);
            if (goro) { goro.hideItem = null; goro.mode = 'enter'; goro.delay = 150; goro.f = -1; addScore(1000, it.x, FY[it.f] - 30); sfx.bonus(); }
          }
          // cat collision
          if (m.inv === 0) for (const c of cats) {
            if (c.mode === 'walk' && c.f === m.f && Math.abs(c.x - m.x) < 9) { killMappy('cat'); return; }
          }
        }
        if (bonusRound) {
          bonusTime--;
          for (const b of balloons) {
            if (b.got) continue;
            const hit = b.floor != null
              ? (m.mode === 'walk' && m.f === b.floor && Math.abs(b.x - m.x) < 9)
              : (m.mode === 'air' && Math.abs(b.x - m.x) < 8 && Math.abs(m.y - 8 - b.y) < 12);
            if (hit) { b.got = true; addScore(b.big ? 2000 : 200, b.x, b.y - 8); sfx.pop(); }
          }
          if (balloons.every(b => b.got)) { perfect = true; addScore(5000); sfx.bonus(); state = 'clear'; T = 0; sfx.clear(); }
          else if (bonusTime <= 0) { state = 'clear'; T = 0; sfx.clear(); }
        } else if (items.every(it => it.got)) { state = 'clear'; T = 0; sfx.clear(); }
      }

      // ---------- main update ----------
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 });
        return false;
      }
      function update() {
        T++;
        if (api.credits > lastCred) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        for (const p of popups) p.t--;
        popups = popups.filter(p => p.t > 0);
        switch (state) {
          case 'title':
            demo.x += 1.1; if (demo.x > W + 120) { demo.x = -20; demo.phase ^= 1; }
            if (api.anyPressed('Enter', 'Space') && tryStart()) newGame();
            break;
          case 'ready':
            if (T > 130) { state = 'play'; T = 0; musicI = 0; }
            break;
          case 'play': updatePlay(); music(); break;
          case 'dying':
            if (T > 150) {
              lives--;
              const respawn = () => { resetActors(); state = 'ready'; T = 0; };
              const over = () => { state = 'gameover'; gameOverT = 0; api.setHiScore(score); };
              if (lives <= 0) {
                if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over);
                else over();
              } else respawn();
            }
            break;
          case 'clear':
            if (T > 170) { round++; genRound(); resetActors(); state = 'ready'; T = 0; sfx.start(); }
            break;
          case 'gameover':
            gameOverT++;
            if (gameOverT > 240 || (gameOverT > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- drawing ----------
      function drawItem(ctx, type, x, y, flash) {
        x = Math.round(x); y = Math.round(y);
        if (flash) { ctx.fillStyle = (T >> 3) & 1 ? '#ffffff' : '#ffd200'; ctx.fillRect(x - 7, y - 13, 14, 13); return; }
        switch (type) {
          case 0: // radio
            ctx.fillStyle = '#e02020'; ctx.fillRect(x - 6, y - 9, 12, 9);
            ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 5, y - 7, 5, 5);
            ctx.fillStyle = '#000'; ctx.fillRect(x - 4, y - 6, 3, 3);
            ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y - 7, 4, 1); ctx.fillRect(x + 1, y - 5, 4, 1); ctx.fillRect(x + 1, y - 3, 4, 1);
            ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x + 3, y - 13, 1, 4); ctx.fillRect(x - 6, y - 10, 12, 1);
            break;
          case 1: // television
            ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x - 7, y - 11, 14, 11);
            ctx.fillStyle = '#40c0ff'; ctx.fillRect(x - 5, y - 9, 8, 7);
            ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 8, 2, 1);
            ctx.fillStyle = '#ffd200'; ctx.fillRect(x + 4, y - 9, 2, 2); ctx.fillRect(x + 4, y - 5, 2, 2);
            ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 3, y - 14, 1, 3); ctx.fillRect(x + 2, y - 14, 1, 3);
            break;
          case 2: // personal computer
            ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x - 6, y - 13, 12, 9);
            ctx.fillStyle = '#103080'; ctx.fillRect(x - 4, y - 11, 8, 5);
            ctx.fillStyle = '#30ff60'; ctx.fillRect(x - 3, y - 10, 4, 1); ctx.fillRect(x - 3, y - 8, 6, 1);
            ctx.fillStyle = '#c8c0a8'; ctx.fillRect(x - 7, y - 3, 14, 3);
            ctx.fillStyle = '#606060'; ctx.fillRect(x - 6, y - 2, 12, 1);
            break;
          case 3: // painting
            ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 6, y - 14, 12, 14);
            ctx.fillStyle = '#305020'; ctx.fillRect(x - 4, y - 12, 8, 10);
            ctx.fillStyle = '#f0c090'; ctx.fillRect(x - 2, y - 11, 4, 4);
            ctx.fillStyle = '#402010'; ctx.fillRect(x - 3, y - 12, 6, 1); ctx.fillRect(x - 3, y - 11, 1, 5); ctx.fillRect(x + 2, y - 11, 1, 5);
            ctx.fillRect(x - 3, y - 6, 6, 4);
            break;
          default: // safe
            ctx.fillStyle = '#7080a0'; ctx.fillRect(x - 6, y - 12, 12, 12);
            ctx.fillStyle = '#a0b0d0'; ctx.fillRect(x - 5, y - 11, 10, 1); ctx.fillRect(x - 6, y - 12, 1, 12);
            ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 2, y - 8, 4, 4);
            ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 7, 2, 2);
            ctx.fillStyle = '#404860'; ctx.fillRect(x + 3, y - 9, 1, 6);
        }
      }
      const BAL_COL = ['#ff3a3a', '#3a8aff', '#ffd200', '#3ae060'];
      function drawBalloon(ctx, b, ox) {
        const x = Math.round(b.x + ox), y = Math.round(b.y), r = b.big ? 9 : 5;
        ctx.fillStyle = '#fff'; ctx.fillRect(x, y + r, 1, b.big ? 4 : 6);
        ctx.fillStyle = b.big ? PAL.O : BAL_COL[b.c];
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - r + 2, y - r + 2, 2, 2);
        if (b.big) {
          ctx.fillStyle = '#fff'; ctx.fillRect(x - 5, y - 2, 4, 3); ctx.fillRect(x + 1, y - 2, 4, 3);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 1, 1, 2); ctx.fillRect(x + 2, y - 1, 1, 2);
          ctx.fillStyle = PAL.O; ctx.fillRect(x - 6, y - 10, 3, 3); ctx.fillRect(x + 3, y - 10, 3, 3);
        }
      }
      function drawDoor(ctx, d, ox) {
        const x = Math.round(d.x + ox), y = FY[d.f];
        if (x < -20 || x > W + 20) return;
        if (!d.open) {
          let col = '#e8a848';
          if (d.power) col = ['#ff3a3a', '#ffffff', '#ffd200', '#3a8aff'][(T >> 2) & 3];
          ctx.fillStyle = '#5a2a08'; ctx.fillRect(x - 3, y - 25, 7, 25);
          ctx.fillStyle = col; ctx.fillRect(x - 2, y - 24, 5, 24);
          if (d.power) { ctx.fillStyle = '#000'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 1 + (i & 1), y - 21 + i * 5, 3, 1); }
          ctx.fillStyle = '#ffd200'; ctx.fillRect(x + 1, y - 13, 2, 2);
        } else {
          const dir = d.dir, wdt = 11 - Math.floor(d.swing / 2);
          ctx.fillStyle = '#5a2a08'; ctx.fillRect(x - 1, y - 25, 2, 25);
          ctx.fillStyle = '#c08838';
          ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x + dir * wdt, y - 28); ctx.lineTo(x + dir * wdt, y + 2); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffd200'; ctx.fillRect(x + dir * (wdt - 3), y - 14, 2, 2);
        }
      }
      function drawWave(ctx, w, ox) {
        const x = Math.round(w.x + ox), y = FY[w.f] - 12;
        const cols = ['#ff3030', '#ffd200', '#30e040', '#3a8aff', '#ff6ec4'];
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = cols[(i + (w.t >> 2)) % 5]; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x - w.dir * i * 4, y, 13 - i, w.dir > 0 ? -1.2 : Math.PI - 1.2 + 0.0, w.dir > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke();
        }
      }
      function drawMansion(ctx, ox) {
        ctx.fillStyle = '#0a0628'; ctx.fillRect(0, 0, W, H);
        // stars
        ctx.fillStyle = '#6060a0';
        for (let i = 0; i < 24; i++) { const sx = ((i * 97 + 13) % MW) + ox * 0.5; ctx.fillRect(((sx % W) + W) % W, (i * 37) % 22 + 12, 1, 1); }
        // walls
        ctx.fillStyle = '#2e1a7a'; ctx.fillRect(ox + 4, 30, MW - 8, 186);
        ctx.fillStyle = '#3a2490';
        for (let x = 8; x < MW - 8; x += 16) ctx.fillRect(ox + x, 30, 6, 186);
        // roof (gables)
        ctx.fillStyle = '#c03018';
        for (let g = 0; g < 4; g++) {
          const gx = ox + 8 + g * 140;
          ctx.beginPath(); ctx.moveTo(gx - 4, 34); ctx.lineTo(gx + 70, 14); ctx.lineTo(gx + 144, 34); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#e85a30'; ctx.fillRect(ox + 2, 32, MW - 4, 4);
        ctx.fillStyle = '#000'; ctx.fillRect(ox + 288 - 10, 30, 20, 8);
        // shafts
        for (let i = 0; i < SHAFTS.length; i++) {
          const sx = SHAFTS[i] + ox;
          if (sx < -20 || sx > W + 20) continue;
          ctx.fillStyle = '#160a48'; ctx.fillRect(sx - SHW, 36, SHW * 2, 184);
          // trampoline
          const ty = TRAMP_Y + 1;
          ctx.fillStyle = '#808080'; ctx.fillRect(sx - SHW, ty, 2, 6); ctx.fillRect(sx + SHW - 2, ty, 2, 6);
          if (tramp[i] < 4) {
            const sag = (m && m.s === i && m.mode === 'air' && m.y > TRAMP_Y - 4) ? 2 : 0;
            ctx.fillStyle = TRAMP_COL[tramp[i]]; ctx.fillRect(sx - SHW + 2, ty + sag, SHW * 2 - 4, 2);
          } else {
            ctx.fillStyle = '#ff3030'; ctx.fillRect(sx - SHW + 2, ty + 3, 5, 2); ctx.fillRect(sx + SHW - 7, ty + 3, 5, 2);
          }
        }
        // floors
        for (let f = 0; f < 6; f++) {
          for (const [a, b] of SEGS) {
            const x0 = a + ox; if (x0 > W || b + ox < 0) continue;
            ctx.fillStyle = '#ff9a40'; ctx.fillRect(x0, FY[f], b - a, 2);
            ctx.fillStyle = '#b04818'; ctx.fillRect(x0, FY[f] + 2, b - a, 3);
            if (f > 0) { ctx.fillStyle = '#ffd890'; for (let x = a + 10; x < b - 6; x += 30) ctx.fillRect(x + ox, FY[f] + 8, 4, 2); }
          }
        }
        // ground
        ctx.fillStyle = '#3a1808'; ctx.fillRect(0, 210, W, 14);
        ctx.fillStyle = '#5a2a10';
        for (let x = -((camX | 0) % 8); x < W; x += 8) ctx.fillRect(x, 212, 6, 2);
        for (const sx of SHAFTS) { ctx.fillStyle = '#160a48'; ctx.fillRect(sx + ox - SHW, 209, SHW * 2, 8); }
        ctx.fillStyle = '#ff9a40'; ctx.fillRect(ox + 2, 30, 3, 180); ctx.fillRect(ox + MW - 5, 30, 3, 180);
      }
      function drawActor(ctx, o, ox) {
        if (o.mode === 'enter' || o.mode === 'gone' || o.mode === 'hide') return;
        const x = o.x + ox; if (x < -16 || x > W + 16) return;
        const goro = o.type === 'goro';
        const set = o.mode === 'stun' ? (goro ? SPR.goroStun : SPR.catStun) : (goro ? SPR.goro : SPR.cat);
        const fr = o.mode === 'walk' ? (o.anim >> 3) & 1 : 0;
        if (o.mode === 'stun') {
          drawSpr(ctx, set[0], x, o.y, o.dir < 0);
          ctx.fillStyle = '#ffd200';
          for (let i = 0; i < 3; i++) { const a = T * 0.15 + i * 2.1; ctx.fillRect(Math.round(x + Math.cos(a) * 6), Math.round(o.y - 18 + Math.sin(a) * 2), 2, 2); }
          return;
        }
        if (o.mode === 'wave') { ctx.save(); ctx.globalAlpha = 0.7; drawSpr(ctx, set[(T >> 2) & 1], x, FY[o.f] - 4 - Math.abs(Math.sin(T * 0.3)) * 4, (T >> 3) & 1); ctx.restore(); return; }
        drawSpr(ctx, set[fr], x, o.y, o.dir < 0);
      }
      function drawMappy(ctx, ox) {
        const x = m.x + ox;
        if (state === 'dying') {
          if (deathKind === 'tramp') { drawSpr(ctx, SPR.mappyF, x, Math.min(H + 20, m.y + T * 1.2), false); return; }
          const spin = T < 70 ? (T >> 2) & 3 : 0;
          if (T < 70) drawSpr(ctx, spin < 2 ? SPR.mappy[0] : SPR.mappyF, x, m.y, spin === 1);
          else {
            ctx.save(); ctx.translate(Math.round(x), Math.round(m.y - 3)); ctx.rotate(Math.PI / 2); drawSpr(ctx, SPR.mappyF, 0, 6, false); ctx.restore();
            ctx.strokeStyle = '#ffd200'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(m.y - 14 - (T - 70) * 0.2), 5, 2, 0, 0, Math.PI * 2); ctx.stroke();
          }
          return;
        }
        if (m.mode === 'air') drawSpr(ctx, SPR.mappyF, x, m.y, false);
        else drawSpr(ctx, SPR.mappy[(m.anim >> 3) & 1], x, m.y, m.face < 0);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 11);
        text(ctx, '1UP', 6, 2, (T >> 4) & 1 || state !== 'play' ? '#ff4040' : '#000');
        text(ctx, pad(score, 6), 30, 2, '#fff');
        text(ctx, 'HI', 110, 2, '#ff4040'); text(ctx, pad(hi, 6), 126, 2, '#fff');
        text(ctx, 'ROUND ' + round, 212, 2, '#3ad0ff');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 215, 60, 9);
        for (let i = 0; i < Math.min(5, lives - 1); i++) ctx.drawImage(SPR.mappyF, 4 + i * 13, 211, 12, 14);
        if (hurry && state === 'play' && ((T >> 4) & 1)) text(ctx, 'HURRY', W - 40, 215, '#ff4040');
        if (bonusRound && state === 'play') text(ctx, 'TIME ' + Math.ceil(bonusTime / 60), W - 60, 215, '#ffd200');
      }
      function drawWorld(ctx) {
        const ox = -Math.round(camX);
        drawMansion(ctx, ox);
        for (const d of doors) drawDoor(ctx, d, ox);
        for (const it of items) {
          if (it.got) continue;
          const hidden = cats.some(c => c.hideItem === it);
          drawItem(ctx, it.type, it.x + ox, FY[it.f], hidden && ((T >> 3) & 1));
          if (hidden) drawItem(ctx, it.type, it.x + ox, FY[it.f] - ((T >> 2) & 1), false);
        }
        for (const b of balloons) if (!b.got) drawBalloon(ctx, b, ox);
        for (const c of cats) drawActor(ctx, c, ox);
        drawMappy(ctx, ox);
        for (const w of waves) drawWave(ctx, w, ox);
        for (const p of popups) text(ctx, p.txt, Math.round(p.x + ox), Math.round(p.y - (60 - p.t) * 0.2), p.txt === 'HURRY!' ? '#ff4040' : '#fff', 1, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#0a0628'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#2e1a7a'; ctx.fillRect(0, 150, W, 50);
        ctx.fillStyle = '#ff9a40'; ctx.fillRect(0, 186, W, 2); ctx.fillStyle = '#b04818'; ctx.fillRect(0, 188, W, 3);
        text(ctx, '1UP', 6, 2, '#ff4040'); text(ctx, pad(score, 6), 30, 2, '#fff');
        text(ctx, 'HI-SCORE', 110, 2, '#ff4040'); text(ctx, pad(hi, 6), 166, 2, '#fff');
        text(ctx, 'MAPPY', W / 2 + 3, 25, '#1838a8', 6, 'center');
        text(ctx, 'MAPPY', W / 2, 22, (T >> 3) % 6 === 0 ? '#ffffff' : '#ff6ec4', 6, 'center');
        // score table
        const names = ['RADIO', 'TV', 'COMPUTER', 'PAINTING', 'SAFE'];
        for (let i = 0; i < 5; i++) {
          drawItem(ctx, i, 76, 82 + i * 13);
          text(ctx, names[i], 92, 72 + i * 13, '#ffd200');
          text(ctx, ITEM_VAL[i] + ' PTS', 200, 72 + i * 13, '#fff', 1, 'right');
        }
        text(ctx, 'PAIRS SCORE DOUBLE', W / 2, 140, '#3ad0ff', 1, 'center');
        // chase
        const dx = demo.x;
        if (demo.phase === 0) {
          drawSpr(ctx, SPR.mappy[(T >> 3) & 1], dx, 186, false);
          drawSpr(ctx, SPR.cat[(T >> 3) & 1], dx - 30, 186, false);
          drawSpr(ctx, SPR.cat[((T >> 3) + 1) & 1], dx - 50, 186, false);
          drawSpr(ctx, SPR.goro[(T >> 3) & 1], dx - 76, 186, false);
        } else {
          drawSpr(ctx, SPR.mappyF, W - dx, 186 - Math.abs(Math.sin(T * 0.08)) * 24, false);
          drawSpr(ctx, SPR.catStun[0], W - dx + 40, 186, false);
          drawSpr(ctx, SPR.catStun[0], W - dx + 58, 186, true);
        }
        text(ctx, '\u00a9 1983 NAMCO LTD.', W / 2, 196, '#ff9ad0', 1, 'center');
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (T >> 2) & 1 : (T >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 160, coinFlash ? '#ff4040' : '#fff', 1, 'center'); }
        else if ((T >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 160, '#fff', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 6, 214, '#fff');
      }
      function render(ctx) {
        if (state === 'title') { drawTitle(ctx); return; }
        drawWorld(ctx);
        drawHUD(ctx);
        if (state === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 96, 100, 26);
          text(ctx, bonusRound ? 'BONUS ROUND' : 'ROUND ' + round, W / 2, 100, '#ffd200', 1, 'center');
          text(ctx, bonusRound ? 'POP THE BALLOONS' : 'READY', W / 2, 111, '#fff', 1, 'center');
        }
        if (state === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 96, 120, 16);
          text(ctx, perfect ? 'PERFECT! 5000' : bonusRound ? 'TIME UP' : 'ROUND CLEAR', W / 2, 101, (T >> 3) & 1 ? '#ffd200' : '#ff6ec4', 1, 'center');
        }
        if (state === 'gameover') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, 96, 80, 16);
          text(ctx, 'GAME OVER', W / 2, 101, '#ff4040', 1, 'center');
        }
      }

      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
