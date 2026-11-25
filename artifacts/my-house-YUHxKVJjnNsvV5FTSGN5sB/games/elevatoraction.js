// Elevator Action (Taito, 1983) - a spy descends a high-rise by elevator and escalator, stealing documents from red doors.
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

  // ---------- sprites (12 wide, feet at bottom) ----------
  const TOP_PLAYER = [
    '....HHHH....',
    '...HHHHHH...',
    '...HSSSS....',
    '...SSSkS....',
    '....SSSS....',
    '.....SS.....',
    '...CCWWCC...',
    '..CCCWCCCC..',
    '..CCCWCCSGGG',
    '..CCCWCC....',
    '..SCCCCC....',
    '...CCCCC....'
  ];
  const TOP_AGENT = [
    '....HHHH....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '...SkkkS....',
    '....SSSS....',
    '.....SS.....',
    '...CCWWCC...',
    '..CCCWCCCC..',
    '..CCCRCCSGGG',
    '..CCCRCC....',
    '..SCCCCC....',
    '...CCCCC....'
  ];
  const LEGS = [[
    '...PPPPP....',
    '...PP.PP....',
    '...PP.PP....',
    '...PP.PP....',
    '...PP.PP....',
    '...PP.PP....',
    '...PP.PP....',
    '...PP.PP....',
    '..kkk.kkk...'
  ], [
    '...PPPPP....',
    '...PP.PP....',
    '..PP...PP...',
    '..PP...PP...',
    '.PP.....PP..',
    '.PP.....PP..',
    'PP.......PP.',
    'PP.......PP.',
    'kk.......kkk'
  ], [
    '...PPPPP....',
    '...PPPPP....',
    '....PPP.....',
    '....PPP.....',
    '...PP.PP....',
    '...PP.PP....',
    '..PP...PP...',
    '..PP...PP...',
    '.kkk...kkk..'
  ]];
  const DUCK_LEGS = ['..PPPPPPP...', '.PPPP.PPP...', 'kkk...kkk...'];
  const JUMP_LEGS = ['...PPPPPP...', '..PPPPPPP...', '..PP...PP...', '..kk...kk...'];

  ArcadeRegistry.register({
    id: 'elevatoraction', title: 'Elevator Action', year: 1983, maker: 'Taito',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Arrows: walk / ride / Down: duck \u00b7 Up at red door: enter \u00b7 Space: shoot \u00b7 X: jump \u00b7 Enter: start',
    marquee: { bg: '#101030', fg: '#ff3030', accent: '#40a0ff' },
    create(api) {
      const W = 256, H = 224, A = api.audio;
      const FH = 32, NF = 24, BX0 = 20, BX1 = 236, SW = 9;
      const COLS = [56, 100, 156, 200];
      const FY = k => 64 + k * FH;
      const BASE = NF; // basement floor index with the getaway car
      const rnd = n => Math.floor(Math.random() * n);
      const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;

      function buildSet(top, pal) {
        const mk = rows => sprite(rows, pal);
        return {
          stand: mk(top.concat(LEGS[0])), walk: [mk(top.concat(LEGS[1])), mk(top.concat(LEGS[2]))],
          duck: mk(top.slice(0, 10).concat(DUCK_LEGS)), jump: mk(top.concat(JUMP_LEGS))
        };
      }
      const PSET = buildSet(TOP_PLAYER, { H: '#ffd040', S: '#ffc890', k: '#000', C: '#e8e8f0', W: '#d02020', P: '#3050d0', G: '#a0a0b0' });
      const ASET = buildSet(TOP_AGENT, { H: '#181820', S: '#ffc890', k: '#000', C: '#26262e', W: '#ffffff', R: '#c02020', P: '#26262e', G: '#a0a0b0' });

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, level = 1, nextExtra = 10000;
      let shafts = [], blueDoors = [], reds = [], lamps = [], escs = [], agents = [], bullets = [], popups = [], sparks = [];
      let p = null, camY = 0, dark = 0, levelT = 0, spawnT = 0, alarm = false, msgT = 0, msg = '', carX = 0, gameOverT = 0;
      let coinFlash = 0, lastCred = api.credits, titleScroll = 0;

      // ---------- sound ----------
      const sfx = {
        shot() { A.tone(1400, 0.06, { type: 'square', vol: 0.12, slideTo: 300 }); A.noise(0.04, { vol: 0.1, freq: 3000 }); },
        eshot() { A.tone(900, 0.07, { type: 'square', vol: 0.09, slideTo: 200 }); },
        hit() { A.noise(0.15, { vol: 0.2, freq: 1200, slideTo: 200 }); A.tone(300, 0.15, { type: 'square', vol: 0.1, slideTo: 80 }); },
        kick() { A.tone(200, 0.08, { type: 'square', vol: 0.15, slideTo: 80 }); A.noise(0.06, { vol: 0.15, freq: 800 }); },
        jump() { A.tone(300, 0.12, { type: 'square', vol: 0.07, slideTo: 700 }); },
        doc() { A.melody([[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.15]], { type: 'square', vol: 0.12 }); },
        lamp() { A.noise(0.4, { vol: 0.2, freq: 5000, slideTo: 300 }); A.tone(1800, 0.3, { type: 'triangle', vol: 0.1, slideTo: 100 }); },
        ding() { A.tone(1320, 0.25, { type: 'triangle', vol: 0.1 }); },
        crush() { A.noise(0.3, { vol: 0.25, freq: 600 }); },
        death() { A.melody([[523, 0.12], [494, 0.12], [466, 0.12], [440, 0.12], [415, 0.12], [392, 0.4]], { type: 'square', vol: 0.12 }); },
        start() { A.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.2], [659, 0.1], [784, 0.35]], { type: 'square', vol: 0.12 }); },
        clear() { A.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.15], [0, 0.05], [784, 0.1], [1047, 0.4]], { type: 'square', vol: 0.12 }); A.noise(1.5, { vol: 0.06, freq: 400, delay: 0.3 }); },
        alarm() { for (let i = 0; i < 4; i++) A.tone(880, 0.15, { type: 'square', vol: 0.08, delay: i * 0.3, slideTo: 660 }); },
        step() { A.tone(80, 0.03, { type: 'triangle', vol: 0.06 }); },
        extra() { A.melody([[1047, 0.08], [1319, 0.08], [1568, 0.16]], { type: 'square', vol: 0.12 }); },
        deny() { A.tone(150, 0.3, { type: 'square', vol: 0.12 }); }
      };
      // ---------- helpers ----------
      function addScore(n, x, y) {
        score += n; if (score > hi) hi = score;
        if (x != null) popups.push({ x, y, t: 50, txt: String(n) });
        if (score >= nextExtra) { lives++; nextExtra += 20000; sfx.extra(); }
      }
      function floorOf(y) { const k = Math.round((y - 64) / FH); return k >= 0 && k <= NF && Math.abs(FY(k) - y) < 1.5 ? k : -1; }
      function shaftAt(x, k, margin) {
        for (const s of shafts) if (k >= s.top && k <= s.bot && Math.abs(x - s.x) < SW - (margin || 0)) return s;
        return null;
      }
      const carAt = (s, k) => s.target == null && Math.abs(s.c - k) < 0.05;
      function escTop(k, x) { return escs.find(e => e.k === k && Math.abs(x - e.xt) < 5); }
      function escBot(k, x) { return escs.find(e => e.k + 1 === k && Math.abs(x - e.xb) < 5); }

      // ---------- level ----------
      function mkShaft(x, top, bot) { return { x, top, bot, c: top + rnd(bot - top + 1), dir: 1, target: null, wait: rnd(60), ctrl: false }; }
      function freeX(k, list, avoid) {
        for (let tries = 0; tries < 60; tries++) {
          const x = 34 + rnd(188);
          if (shafts.some(s => k >= s.top && k <= s.bot && Math.abs(x - s.x) < SW + 14)) continue;
          if (list.some(d => d.k === k && Math.abs(d.x - x) < 24)) continue;
          if (avoid && avoid.some(d => d.k === k && Math.abs(d.x - x) < 24)) continue;
          if (escs.some(e => (e.k === k && Math.abs(e.xt - x) < 16) || (e.k + 1 === k && Math.abs(e.xb - x) < 16))) continue;
          return x;
        }
        return -1;
      }
      function genLevel() {
        shafts = []; blueDoors = []; reds = []; lamps = []; escs = []; agents = []; bullets = []; popups = []; sparks = [];
        let k = 0, prev = -1;
        while (k < 19) {
          let col; do { col = rnd(4); } while (col === prev);
          let bot = Math.min(19, k + 3 + rnd(4));
          if (19 - bot < 3) bot = 19;
          const s = mkShaft(COLS[col], k, bot);
          if (k === 0) s.c = 0;
          shafts.push(s); prev = col; k = bot;
        }
        for (let i = 0; i < 4; i++) {
          const col = rnd(4), top = 2 + rnd(13), bot = top + 2 + rnd(3);
          if (bot > 18) continue;
          if (shafts.some(s => s.x === COLS[col] && !(bot < s.top - 1 || top > s.bot + 1))) continue;
          shafts.push(mkShaft(COLS[col], top, bot));
        }
        for (let f = 19; f < NF; f++) escs.push(f % 2 ? { k: f, xt: 44, xb: 76 } : { k: f, xt: 212, xb: 180 });
        const nRed = Math.min(9, 4 + level);
        const floors = [];
        for (let f = 1; f <= 18; f++) floors.push(f);
        for (let i = floors.length - 1; i > 0; i--) { const j = rnd(i + 1); [floors[i], floors[j]] = [floors[j], floors[i]]; }
        for (const f of floors.slice(0, nRed)) { const x = freeX(f, reds); if (x > 0) reds.push({ k: f, x, red: true }); }
        for (let f = 1; f < NF; f++) for (let i = 0; i < 2; i++) { const x = freeX(f, blueDoors, reds); if (x > 0) blueDoors.push({ k: f, x, open: 0 }); }
        for (let f = 1; f <= NF; f++) lamps.push({ k: f, x: 40 + rnd(176), alive: true, fall: -1 });
        levelT = 0; spawnT = 120; alarm = false; dark = 0;
      }
      function newPlayer() {
        return { x: -8, y: FY(0) - 40, k: -1, mode: 'intro', face: 1, jump: 0, jvx: 0, duck: false, anim: 0, sh: null, vy: 0, esc: null, et: 0, edown: true, cd: 0, door: null, dt: 0 };
      }
      function newGame() {
        score = 0; lives = 3; level = 1; nextExtra = 10000;
        startLevel();
      }
      function startLevel() { genLevel(); p = newPlayer(); camY = 0; state = 'play'; T = 0; sfx.start(); }

      // ---------- player ----------
      function jumpH() { return p.jump > 0 ? Math.sin(Math.PI * p.jump / 30) * 15 : 0; }
      function enterCar(s) { p.mode = 'car'; p.sh = s; p.x = s.x; s.ctrl = true; p.carLock = true; p.jump = 0; p.k = Math.round(s.c); p.y = FY(p.k); sfx.ding(); }
      function leaveToFloor(k, x, dir) { p.mode = 'walk'; p.k = k; p.y = FY(k); p.x = x; p.face = dir; p.sh = null; p.vy = 0; }
      function checkShaftEntry() {
        const s = shaftAt(p.x, p.k, 3);
        if (!s) return;
        if (carAt(s, p.k)) { enterCar(s); return; }
        if (p.k < s.bot) { p.mode = 'shaft'; p.sh = s; p.x = s.x; p.vy = 0; p.k = -1; }
      }
      function fire() {
        if (p.cd > 0 || bullets.filter(b => b.own === 'p').length >= 2) return;
        let fy = p.y;
        if (p.mode === 'car' && p.sh.target != null) return;
        const y = p.y - (p.duck ? 6 : 13) - jumpH();
        bullets.push({ x: p.x + p.face * 7, y, fy, dir: p.face, own: 'p', dist: 0 });
        p.cd = 12; sfx.shot();
      }
      function updatePlayer() {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const dir = L && !R ? -1 : R && !L ? 1 : 0;
        if (p.cd > 0) p.cd--;
        switch (p.mode) {
          case 'intro': {
            p.x += 0.8; p.y = FY(0) - 40 + Math.min(40, (p.x + 8) * 1.05);
            if (p.y >= FY(0)) { p.y = FY(0); p.k = 0; p.mode = 'walk'; }
            break;
          }
          case 'walk': {
            if (p.jump > 0) {
              p.jump++; p.x = Math.max(BX0 + 6, Math.min(BX1 - 6, p.x + p.jvx));
              if (p.jump >= 30) { p.jump = 0; checkShaftEntry(); }
              if (api.pressed('Space')) fire();
              break;
            }
            const et = escTop(p.k, p.x), eb = escBot(p.k, p.x);
            if (D && et) { p.mode = 'esc'; p.esc = et; p.et = 0; p.edown = true; p.duck = false; break; }
            if (U && eb) { p.mode = 'esc'; p.esc = eb; p.et = 0; p.edown = false; break; }
            if (U && api.pressed('ArrowUp')) {
              const d = reds.find(r => r.red && r.k === p.k && Math.abs(r.x - p.x) < 7);
              if (d) { p.mode = 'door'; p.door = d; p.dt = 0; p.x = d.x; break; }
            }
            p.duck = D;
            if (api.pressed('KeyX') && !p.duck) { p.jump = 1; p.jvx = dir * 1.1; if (dir) p.face = dir; sfx.jump(); break; }
            if (api.pressed('Space')) fire();
            if (dir && !p.duck) {
              p.face = dir;
              p.x = Math.max(BX0 + 6, Math.min(BX1 - 6, p.x + dir * 1.1));
              p.anim++; if ((p.anim & 15) === 0) sfx.step();
              checkShaftEntry();
            }
            if (p.mode === 'walk') {
              // crushed at the bottom of a shaft
              const s = shaftAt(p.x, p.k, 2);
              if (s && p.k === s.bot && FY(s.c) > p.y - 20 && FY(s.c) < p.y - 1) { killPlayer('crush'); return; }
              if (p.k === BASE && p.x >= 196) reachCar();
            }
            break;
          }
          case 'car': {
            const s = p.sh;
            p.duck = false;
            if (!dir) p.carLock = false;
            if (s.target == null) {
              p.k = Math.round(s.c);
              if (U && s.c > s.top) s.target = s.c - 1;
              else if (D && s.c < s.bot) s.target = s.c + 1;
              else if (dir && !p.carLock) {
                s.ctrl = false; s.wait = 90;
                leaveToFloor(Math.round(s.c), s.x + dir * (SW + 5), dir);
                break;
              }
              if (api.pressed('Space')) { p.face = dir || p.face; fire(); }
            } else p.k = -1;
            p.y = FY(s.c);
            break;
          }
          case 'shaft': {
            const s = p.sh, roof = FY(s.c) - FH;
            const carBelow = roof >= p.y - 2.5;
            const ground = carBelow ? roof : FY(s.bot);
            if (p.y < ground - 0.01) { p.vy = Math.min(4, p.vy + 0.25); p.y = Math.min(ground, p.y + p.vy); }
            else { p.y = ground; p.vy = 0; }
            if (!carBelow && FY(s.c) > p.y - 20) { killPlayer('crush'); return; }
            if (carBelow && p.vy === 0 && s.c < s.top + 0.85) { killPlayer('crush'); return; }
            if (dir && p.vy === 0) {
              for (let k = s.top; k <= s.bot; k++) if (Math.abs(p.y - FY(k)) < 2.5) { leaveToFloor(k, s.x + dir * (SW + 5), dir); break; }
            }
            break;
          }
          case 'esc': {
            const e = p.esc; p.et++;
            const t = Math.min(1, p.et / 50), u = p.edown ? t : 1 - t;
            p.x = e.xt + (e.xb - e.xt) * u; p.y = FY(e.k) + FH * u; p.anim++;
            if (t >= 1) { p.mode = 'walk'; p.k = e.k + (p.edown ? 1 : 0); p.y = FY(p.k); p.x += (p.edown ? sign(e.xb - e.xt) : sign(e.xt - e.xb)) * 6; p.face = p.edown ? sign(e.xb - e.xt) : sign(e.xt - e.xb); }
            break;
          }
          case 'door': {
            p.dt++;
            if (p.dt === 40) { p.door.red = false; addScore(500, p.door.x, p.y - 30); sfx.doc(); }
            if (p.dt >= 60) { p.mode = 'walk'; p.door = null; }
            break;
          }
        }
        const cam = Math.max(0, Math.min(FY(NF) + 14 - H, p.y - 124));
        camY += (cam - camY) * 0.12;
      }
      function reachCar() {
        const left = reds.filter(r => r.red);
        if (left.length) {
          left.sort((a, b) => a.k - b.k);
          const d = left[0];
          msg = 'GET ALL SECRET DOCUMENTS!'; msgT = 150; sfx.deny();
          leaveToFloor(d.k, d.x, -1);
          agents = []; bullets = [];
          camY = Math.max(0, p.y - 124);
          return;
        }
        state = 'escape'; T = 0; carX = 214; sfx.clear();
      }
      function killPlayer(kind) {
        if (state !== 'play') return;
        state = 'dying'; T = 0; p.deathKind = kind; p.jump = 0;
        if (kind === 'crush') sfx.crush();
        sfx.death();
      }
      function respawn() {
        let k = Math.max(0, Math.min(NF, Math.round((p.y - 64) / FH)));
        if (p.mode === 'car' && p.sh) k = Math.round(p.sh.c);
        let x = p.x, best = null;
        for (let d = 0; d < 200 && best == null; d += 4) for (const c of [x - d, x + d]) {
          if (c < BX0 + 8 || c > BX1 - 8) continue;
          if (shafts.some(s => k >= s.top && k <= s.bot && Math.abs(c - s.x) < SW + 6)) continue;
          best = c; break;
        }
        for (const s of shafts) { s.ctrl = false; }
        p = newPlayer(); p.mode = 'walk'; p.k = k; p.y = FY(k); p.x = best == null ? 30 : best;
        agents = []; bullets = []; dark = 0; spawnT = 150;
        state = 'play'; T = 0; p.inv = 90;
      }

      // ---------- shafts / cars ----------
      function updateShafts() {
        for (const s of shafts) {
          const prevC = s.c;
          if (s.target != null) {
            const d = s.target - s.c, st = s.ctrl ? 0.06 : 0.04;
            if (Math.abs(d) <= st) { s.c = s.target; s.target = null; s.wait = s.ctrl ? 0 : 50; }
            else s.c += sign(d) * st;
          } else if (!s.ctrl) {
            if (s.wait > 0) s.wait--;
            else {
              let n = s.c + s.dir;
              if (n < s.top || n > s.bot) { s.dir = -s.dir; n = s.c + s.dir; }
              s.target = n;
            }
          }
          // agents standing at the shaft bottom get crushed
          if (s.c > prevC) for (const a of agents) {
            if (a.mode === 'dead' || a.k !== s.bot || Math.abs(a.x - s.x) >= SW) continue;
            if (FY(s.c) > FY(a.k) - 20 && FY(s.c) < FY(a.k) - 1) { a.mode = 'dead'; a.t = 0; addScore(300, a.x, FY(a.k) - 30); sfx.crush(); }
          }
        }
      }

      // ---------- agents ----------
      function maxAgents() { return Math.min(6, 2 + Math.floor(level / 2) + (alarm ? 1 : 0)); }
      function spawnAgent() {
        if (p.k < 0 || p.mode === 'door' || p.mode === 'intro') return;
        const alive = agents.filter(a => a.mode !== 'dead').length;
        if (alive >= maxAgents()) return;
        const ok = d => d.open === 0 && Math.abs(d.x - p.x) > 40 && FY(d.k) - camY > 30 && FY(d.k) - camY < H + 10;
        let cands = blueDoors.filter(d => d.k === p.k && ok(d));
        if (!cands.length || Math.random() < 0.15) cands = cands.concat(blueDoors.filter(d => Math.abs(d.k - p.k) === 1 && ok(d)));
        if (!cands.length) return;
        const d = cands[rnd(cands.length)];
        d.open = 50;
        agents.push({ x: d.x, k: d.k, dir: sign(p.x - d.x) || 1, mode: 'emerge', t: 0, cd: 50 + rnd(40), duck: 0, act: null, anim: 0, wander: 0 });
      }
      function agentSpeed() { return Math.min(1.1, 0.55 + level * 0.06) * (alarm ? 1.2 : 1); }
      function agentBlocked(a, nx) {
        if (nx < BX0 + 6 || nx > BX1 - 6) return true;
        const s = shaftAt(nx, a.k, 0);
        if (!s) return false;
        if (a.k === s.bot && s.c < a.k - 0.7) return false;
        return true;
      }
      function updateAgents() {
        const pk = p.mode === 'walk' ? p.k : (p.mode === 'car' && p.sh.target == null ? Math.round(p.sh.c) : -1);
        for (const a of agents) {
          a.anim++;
          if (a.mode === 'dead') { a.t++; continue; }
          if (a.mode === 'emerge') { if (++a.t > 30) a.mode = 'walk'; continue; }
          if (a.cd > 0) a.cd--;
          if (a.duck > 0) { a.duck--; continue; }
          // dodge incoming bullets
          for (const b of bullets) if (b.own === 'p' && b.fy === FY(a.k) && sign(a.x - b.x) === b.dir && Math.abs(a.x - b.x) < 36 && !b.seen) {
            b.seen = true;
            if (Math.random() < Math.min(0.45, 0.08 + level * 0.05) && b.y < FY(a.k) - 10) { a.duck = 26; a.act = null; }
          }
          if (a.duck > 0) continue;
          if (a.act) {
            a.act.t++;
            if (a.act.t === 16 && !dark) {
              const y = FY(a.k) - (a.act.low ? 6 : 13);
              bullets.push({ x: a.x + a.dir * 7, y, fy: FY(a.k), dir: a.dir, own: 'e', dist: 0 }); sfx.eshot();
            }
            if (a.act.t > 30) a.act = null;
            continue;
          }
          const sp = agentSpeed();
          if (pk === a.k && state === 'play') {
            const dx = p.x - a.x;
            a.dir = sign(dx) || a.dir;
            if (a.cd <= 0 && Math.abs(dx) < 150 && Math.abs(dx) > 14 && !dark && p.mode !== 'door') {
              a.act = { low: Math.random() < 0.45, t: 0 };
              a.cd = Math.max(35, 110 - level * 8) + rnd(70);
              continue;
            }
            if (Math.abs(dx) > 36) {
              const nx = a.x + a.dir * sp;
              if (!agentBlocked(a, nx)) a.x = nx;
            }
          } else {
            if (a.wander-- <= 0) { a.wander = 60 + rnd(120); if (Math.random() < 0.4) a.dir = -a.dir; }
            const nx = a.x + a.dir * sp * 0.7;
            if (agentBlocked(a, nx)) a.dir = -a.dir; else a.x = nx;
          }
        }
        agents = agents.filter(a => !(a.mode === 'dead' && a.t > 60) && Math.abs(a.k - (p.k >= 0 ? p.k : a.k)) < 6);
      }
      function agentBox(a) { const low = a.duck > 0 || (a.act && a.act.low); return [FY(a.k) - (low ? 11 : 19), FY(a.k)]; }

      // ---------- bullets ----------
      function updateBullets() {
        for (const b of bullets) {
          b.x += b.dir * (b.own === 'p' ? 4 : 2.3); b.dist += 4;
          if (b.x < BX0 || b.x > BX1 || b.dist > 260) { b.dead = true; continue; }
          if (b.own === 'p') {
            for (const a of agents) {
              if (a.mode !== 'walk' || FY(a.k) !== b.fy || Math.abs(a.x - b.x) > 5) continue;
              const [t0, t1] = agentBox(a);
              if (b.y >= t0 && b.y <= t1) { a.mode = 'dead'; a.t = 0; b.dead = true; addScore(100, a.x, b.fy - 30); sfx.hit(); break; }
            }
            if (!b.dead) for (const l of lamps) {
              if (!l.alive || FY(l.k) !== b.fy || Math.abs(l.x - b.x) > 5) continue;
              if (b.y <= FY(l.k) - 18) { l.alive = false; l.fall = FY(l.k) - 22; b.dead = true; dark = 100; sfx.lamp(); break; }
            }
          } else if (state === 'play' && !(p.inv > 0)) {
            const pf = p.mode === 'walk' ? FY(p.k) : p.mode === 'car' && p.sh.target == null ? FY(Math.round(p.sh.c)) : null;
            if (pf === b.fy && Math.abs(p.x - b.x) < 4) {
              const jh = jumpH(), top = p.y - jh - (p.duck ? 11 : 19), bot = p.y - jh;
              if (b.y >= top && b.y <= bot) { b.dead = true; killPlayer('shot'); }
            }
          }
        }
        bullets = bullets.filter(b => !b.dead);
      }
      function updateLamps() {
        for (const l of lamps) {
          if (l.fall < 0) continue;
          l.fall += 3;
          if (l.fall >= FY(l.k) - 4) {
            for (const a of agents) if (a.mode !== 'dead' && a.mode !== 'emerge' && a.k === l.k && Math.abs(a.x - l.x) < 12) { a.mode = 'dead'; a.t = 0; addScore(150, a.x, FY(a.k) - 30); }
            for (let i = 0; i < 8; i++) sparks.push({ x: l.x, y: FY(l.k) - 3, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5, t: 30 });
            l.fall = -1; A.noise(0.15, { vol: 0.2, freq: 6000 });
          }
        }
        for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.t--; }
        sparks = sparks.filter(s => s.t > 0);
      }

      function updatePlay() {
        levelT++;
        if (!alarm && levelT > 60 * 100) { alarm = true; sfx.alarm(); msg = 'ALARM!'; msgT = 120; }
        if (p.inv > 0) p.inv--;
        updateShafts();
        updatePlayer();
        if (state !== 'play') return;
        // jump kick
        if (p.mode === 'walk' && p.jump > 4) for (const a of agents) {
          if (a.mode === 'walk' && a.k === p.k && Math.abs(a.x - p.x) < 10) { a.mode = 'dead'; a.t = 0; addScore(150, a.x, p.y - 30); sfx.kick(); }
        }
        updateAgents();
        updateBullets();
        updateLamps();
        if (dark > 0) dark--;
        for (const d of blueDoors) if (d.open > 0) d.open--;
        if (--spawnT <= 0) { spawnAgent(); spawnT = Math.max(40, (alarm ? 60 : 130) - level * 8) + rnd(60); }
      }

      // ---------- main update ----------
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; sfx.deny(); return false;
      }
      function update() {
        T++;
        if (api.credits > lastCred) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (msgT > 0) msgT--;
        for (const q of popups) q.t--;
        popups = popups.filter(q => q.t > 0);
        switch (state) {
          case 'title':
            titleScroll += 0.4;
            if (api.anyPressed('Enter', 'Space') && tryStart()) newGame();
            break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (p.deathKind !== 'crush') p.y += 0;
            updateShafts(); updateBullets();
            if (T > 110) {
              lives--;
              const over = () => { state = 'gameover'; gameOverT = 0; api.setHiScore(score); };
              if (lives <= 0) {
                if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over);
                else over();
              } else respawn();
            }
            break;
          case 'escape':
            if (T > 40) carX += Math.min(3, (T - 40) * 0.06);
            if (T === 60) { const b = 1000 * level; addScore(b); popups.push({ x: 128, y: FY(BASE) - 50, t: 120, txt: 'BONUS ' + b }); }
            if (T > 200) { level++; startLevel(); }
            break;
          case 'gameover':
            gameOverT++;
            if (gameOverT > 240 || (gameOverT > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- drawing ----------
      function sy(y) { return Math.round(y - camY); }
      function drawChar(ctx, set, o, x, y, opts) {
        const flip = o.face < 0;
        let spr = set.stand;
        if (opts.duck) spr = set.duck;
        else if (opts.jump) spr = set.jump;
        else if (opts.walk) spr = set.walk[(o.anim >> 3) & 1];
        drawSpr(ctx, spr, x, y, flip);
      }
      function drawSky(ctx) {
        ctx.fillStyle = '#05051a'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#8080c0';
        for (let i = 0; i < 40; i++) { const x = (i * 71) % W, y = ((i * 53) % 300) - camY * 0.2; if (y > 0 && y < H) ctx.fillRect(x, Math.round(y), 1, 1); }
        ctx.fillStyle = '#ffffc0'; ctx.beginPath(); ctx.arc(210, Math.round(30 - camY * 0.2), 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#05051a'; ctx.beginPath(); ctx.arc(205, Math.round(27 - camY * 0.2), 8, 0, Math.PI * 2); ctx.fill();
        // neighbouring buildings (parallax)
        const by = 90 - camY * 0.5;
        ctx.fillStyle = '#12122e'; ctx.fillRect(0, Math.round(by), 20, H + 400); ctx.fillRect(236, Math.round(by + 30), 20, H + 400);
        ctx.fillStyle = '#e0c040';
        for (let i = 0; i < 30; i++) {
          const wy = Math.round(by + 10 + i * 18);
          if (wy < -4 || wy > H) continue;
          if ((i * 7) % 3) ctx.fillRect(5, wy, 4, 5);
          if ((i * 5) % 4 === 1) ctx.fillRect(244, wy + 30, 4, 5);
        }
      }
      function drawBuilding(ctx) {
        // roof furniture
        const ry = sy(FY(0));
        ctx.fillStyle = '#404060'; ctx.fillRect(170, ry - 26, 26, 22); ctx.fillRect(174, ry - 4, 3, 4); ctx.fillRect(189, ry - 4, 3, 4);
        ctx.fillStyle = '#606088'; ctx.fillRect(170, ry - 28, 26, 3);
        ctx.fillStyle = '#808090'; ctx.fillRect(110, ry - 34, 1, 34); ctx.fillRect(106, ry - 34, 9, 1);
        if ((T >> 4) & 1) { ctx.fillStyle = '#ff2020'; ctx.fillRect(109, ry - 37, 3, 3); }
        // zip line
        ctx.strokeStyle = '#a0a0a0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, ry - 42); ctx.lineTo(40, ry - 2); ctx.stroke();
        for (let k = 1; k <= NF; k++) {
          const y0 = sy(FY(k - 1) + 4), y1 = sy(FY(k));
          if (y1 < 0 || y0 > H) continue;
          ctx.fillStyle = k > 18 ? '#7a7a98' : '#a4a4d0'; ctx.fillRect(BX0, y0, BX1 - BX0, y1 - y0);
          ctx.fillStyle = k > 18 ? '#6a6a88' : '#9494c0'; ctx.fillRect(BX0, y1 - 6, BX1 - BX0, 6);
          text(ctx, k === NF ? 'B' : String(NF - k), BX0 + 2, y0 + 2, '#5a5a90');
        }
        // shafts
        for (const s of shafts) {
          const y0 = sy(FY(s.top - 1) + 4), y1 = sy(FY(s.bot));
          if (y1 < 0 || y0 > H) continue;
          ctx.fillStyle = '#181828'; ctx.fillRect(s.x - SW, y0, SW * 2, y1 - y0);
          ctx.fillStyle = '#303048'; ctx.fillRect(s.x - SW, y0, 1, y1 - y0); ctx.fillRect(s.x + SW - 1, y0, 1, y1 - y0);
        }
        // slabs
        for (let k = 0; k <= NF; k++) {
          const y = sy(FY(k)); if (y < -6 || y > H) continue;
          ctx.fillStyle = k === 0 ? '#505070' : '#30305a';
          ctx.fillRect(k === 0 ? BX0 - 4 : BX0, y, (k === 0 ? 8 : 0) + BX1 - BX0, 4);
          for (const s of shafts) if (k >= s.top && k < s.bot) { ctx.fillStyle = '#181828'; ctx.fillRect(s.x - SW, y, SW * 2, 4); }
        }
        // outer walls
        const top = sy(FY(0)) + 4;
        ctx.fillStyle = '#5a3a3a'; ctx.fillRect(BX0 - 4, Math.max(0, top), 4, H); ctx.fillRect(BX1, Math.max(0, top), 4, H);
        // escalators
        for (const e of escs) {
          const ya = sy(FY(e.k)), yb = sy(FY(e.k + 1));
          if (yb < 0 || ya > H) continue;
          ctx.fillStyle = '#707080';
          ctx.beginPath(); ctx.moveTo(e.xt - 6, ya); ctx.lineTo(e.xt + 6, ya); ctx.lineTo(e.xb + 6, yb); ctx.lineTo(e.xb - 6, yb); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#c0c0d0';
          for (let i = 1; i < 8; i++) { const u = ((i + (T >> 3) * (e.k % 2 ? 1 : 1)) % 8) / 8, x = e.xt + (e.xb - e.xt) * u, y = ya + (yb - ya) * u; ctx.fillRect(Math.round(x - 5), Math.round(y), 10, 1); }
          ctx.fillStyle = '#303030'; ctx.fillRect(Math.round(Math.min(e.xt, e.xb)) - 7, ya - 12, 1, 12);
        }
        // doors
        for (const d of blueDoors) {
          const y = sy(FY(d.k)); if (y < 0 || y > H + 26) continue;
          ctx.fillStyle = '#1a1a50'; ctx.fillRect(d.x - 8, y - 25, 16, 25);
          ctx.fillStyle = d.open > 0 ? '#000' : '#2c4cc8'; ctx.fillRect(d.x - 7, y - 24, 14, 24);
          if (!d.open) { ctx.fillStyle = '#ffd040'; ctx.fillRect(d.x + 3, y - 12, 2, 2); }
        }
        for (const d of reds) {
          const y = sy(FY(d.k)); if (y < 0 || y > H + 26) continue;
          ctx.fillStyle = '#501010'; ctx.fillRect(d.x - 8, y - 25, 16, 25);
          const open = p && p.mode === 'door' && p.door === d;
          ctx.fillStyle = open ? '#000' : d.red ? ((T >> 4) & 1 ? '#ff3030' : '#e02020') : '#6a6a8a';
          ctx.fillRect(d.x - 7, y - 24, 14, 24);
          if (!open) { ctx.fillStyle = '#ffd040'; ctx.fillRect(d.x + 3, y - 12, 2, 2); }
        }
        // lamps
        for (const l of lamps) {
          const cy = sy(FY(l.k) - 28);
          if (cy < -10 || cy > H) continue;
          if (l.alive) {
            ctx.fillStyle = '#202020'; ctx.fillRect(l.x, cy, 1, 4);
            ctx.fillStyle = '#ffe080'; ctx.fillRect(l.x - 3, cy + 4, 7, 2); ctx.fillRect(l.x - 4, cy + 6, 9, 2);
            ctx.fillStyle = 'rgba(255,240,160,0.10)';
            ctx.beginPath(); ctx.moveTo(l.x - 4, cy + 8); ctx.lineTo(l.x + 5, cy + 8); ctx.lineTo(l.x + 18, cy + 28); ctx.lineTo(l.x - 17, cy + 28); ctx.closePath(); ctx.fill();
          } else if (l.fall >= 0) {
            ctx.fillStyle = '#ffe080'; ctx.fillRect(l.x - 4, sy(l.fall), 9, 3);
          } else { ctx.fillStyle = '#202020'; ctx.fillRect(l.x, cy, 1, 3); }
        }
        // basement getaway car
        const gy = sy(FY(BASE));
        if (gy > 0 && gy < H + 30) {
          const cx = Math.round(state === 'escape' ? carX : 214);
          ctx.fillStyle = '#e02020'; ctx.fillRect(cx - 18, gy - 12, 36, 8); ctx.fillRect(cx - 10, gy - 18, 20, 6);
          ctx.fillStyle = '#80c0ff'; ctx.fillRect(cx - 8, gy - 17, 7, 4); ctx.fillRect(cx + 1, gy - 17, 7, 4);
          ctx.fillStyle = '#000'; ctx.fillRect(cx - 14, gy - 5, 6, 5); ctx.fillRect(cx + 8, gy - 5, 6, 5);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(cx + 16, gy - 11, 2, 2);
          if (state !== 'escape') text(ctx, 'EXIT', 196, gy - 44, (T >> 4) & 1 ? '#ffd040' : '#ff3030');
          ctx.fillStyle = '#202030'; ctx.fillRect(BX1 - 2, gy - 28, 6, 28);
        }
      }
      function drawCars(ctx, behind) {
        for (const s of shafts) {
          const y1 = sy(FY(s.c)), y0 = y1 - 28;
          if (y1 < 0 || y0 > H) continue;
          if (behind) {
            ctx.fillStyle = '#606070'; ctx.fillRect(s.x, sy(FY(s.top - 1) + 4), 1, Math.max(0, y0 - sy(FY(s.top - 1) + 4)));
            ctx.fillStyle = '#c8c8d8'; ctx.fillRect(s.x - SW + 1, y0, SW * 2 - 2, 28);
            ctx.fillStyle = '#e8e8f0'; ctx.fillRect(s.x - SW + 3, y0 + 3, SW * 2 - 6, 22);
            ctx.fillStyle = '#ffffa0'; ctx.fillRect(s.x - 2, y0 + 1, 4, 1);
          } else {
            ctx.fillStyle = '#8888a0'; ctx.fillRect(s.x - SW + 1, y0, SW * 2 - 2, 2); ctx.fillRect(s.x - SW + 1, y0, 2, 28); ctx.fillRect(s.x + SW - 3, y0, 2, 28);
            ctx.fillRect(s.x - SW + 1, y1 - 2, SW * 2 - 2, 2);
          }
        }
      }
      function drawAgents(ctx) {
        for (const a of agents) {
          const y = sy(FY(a.k)); if (y < -4 || y > H + 24) continue;
          if (a.mode === 'emerge') { if (a.t > 10) { ctx.save(); ctx.globalAlpha = a.t / 30; drawSpr(ctx, ASET.stand, a.x, y, a.dir < 0); ctx.restore(); } continue; }
          if (a.mode === 'dead') {
            ctx.save(); ctx.translate(Math.round(a.x), y - 4); ctx.rotate(-a.dir * Math.min(Math.PI / 2, a.t * 0.12)); drawSpr(ctx, ASET.stand, 0, 4, a.dir < 0); ctx.restore();
            continue;
          }
          const o = { face: a.dir, anim: a.anim };
          drawChar(ctx, ASET, o, a.x, y, { duck: a.duck > 0 || (a.act && a.act.low), walk: !a.act });
          if (a.act && a.act.t >= 14 && a.act.t < 20) { ctx.fillStyle = '#ffff80'; ctx.fillRect(Math.round(a.x + a.dir * 9), y - (a.act.low ? 7 : 14), 2, 2); }
        }
      }
      function drawPlayer(ctx) {
        if (!p || p.mode === 'door') return;
        if (p.inv > 0 && (T >> 2) & 1) return;
        const y = sy(p.y);
        if (state === 'dying') {
          if (p.deathKind === 'crush') { ctx.save(); ctx.translate(Math.round(p.x), y); ctx.scale(1, Math.max(0.2, 1 - T * 0.05)); drawSpr(ctx, PSET.stand, 0, 0, p.face < 0); ctx.restore(); return; }
          ctx.save(); ctx.translate(Math.round(p.x), y - 4); ctx.rotate(-p.face * Math.min(Math.PI / 2, T * 0.1)); drawSpr(ctx, PSET.stand, 0, 4, p.face < 0); ctx.restore();
          return;
        }
        const jh = Math.round(jumpH());
        drawChar(ctx, PSET, p, p.x, y - jh, { duck: p.duck, jump: p.jump > 0, walk: (p.mode === 'walk' && (api.key('ArrowLeft') || api.key('ArrowRight'))) || p.mode === 'esc' || p.mode === 'intro' });
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 12);
        text(ctx, '1UP', 4, 3, '#ff3030'); text(ctx, pad(score, 6), 26, 3, '#fff');
        text(ctx, 'HI', 92, 3, '#ff3030'); text(ctx, pad(hi, 6), 106, 3, '#fff');
        const left = reds.filter(r => r.red).length;
        ctx.fillStyle = '#e02020'; ctx.fillRect(176, 3, 5, 7); text(ctx, 'X' + left, 184, 3, '#ffd040');
        text(ctx, 'L' + level, 230, 3, '#40a0ff');
        for (let i = 0; i < Math.min(5, lives - 1); i++) { ctx.fillStyle = '#ffd040'; ctx.fillRect(4 + i * 8, H - 9, 5, 3); ctx.fillStyle = '#ffc890'; ctx.fillRect(4 + i * 8, H - 6, 5, 3); }
        if (alarm && (T >> 4) & 1) text(ctx, 'ALARM', W - 34, H - 9, '#ff3030');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#05051a'; ctx.fillRect(0, 0, W, H);
        // building silhouette with lit windows
        ctx.fillStyle = '#1c1c40'; ctx.fillRect(68, 100, 120, 124);
        for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) {
          const lit = ((r * 7 + c * 3 + (T >> 5)) % 5) !== 0;
          ctx.fillStyle = lit ? '#e0c040' : '#303050'; ctx.fillRect(76 + c * 18, 108 + r * 14, 8, 8);
        }
        ctx.fillStyle = '#c8c8d8'; const ey = 108 + Math.round((Math.sin(T * 0.02) + 1) * 45); ctx.fillRect(124, ey, 10, 14);
        text(ctx, 'HI-SCORE', W / 2, 16, '#ff3030', 1, 'center'); text(ctx, pad(hi, 6), W / 2, 26, '#fff', 1, 'center');
        text(ctx, 'ELEVATOR', W / 2 + 2, 44, '#600000', 3, 'center'); text(ctx, 'ELEVATOR', W / 2, 42, '#ff3030', 3, 'center');
        text(ctx, 'ACTION', W / 2 + 2, 70, '#002060', 3, 'center'); text(ctx, 'ACTION', W / 2, 68, '#40a0ff', 3, 'center');
        drawSpr(ctx, PSET.walk[(T >> 3) & 1], 30 + ((T * 0.6) % 200), 220, false);
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (T >> 2) & 1 : (T >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 186, coinFlash ? '#ff3030' : '#fff', 1, 'center'); }
        else if ((T >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 186, '#fff', 1, 'center');
        text(ctx, '\u00a9 1983 TAITO', W / 2, 198, '#c0c0c0', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, 3, '#fff');
        text(ctx, 'COLLECT THE RED DOOR DOCUMENTS', W / 2, 88, '#ffd040', 1, 'center');
      }
      function render(ctx) {
        if (state === 'title') { drawTitle(ctx); return; }
        drawSky(ctx);
        drawBuilding(ctx);
        drawCars(ctx, true);
        if (p && p.mode === 'car') drawPlayer(ctx);
        drawCars(ctx, false);
        drawAgents(ctx);
        if (dark > 0) { ctx.fillStyle = 'rgba(0,0,0,0.86)'; ctx.fillRect(BX0, 0, BX1 - BX0, H); }
        if (!p || p.mode !== 'car') drawPlayer(ctx);
        for (const b of bullets) { ctx.fillStyle = b.own === 'p' ? '#ffff60' : '#ffffff'; ctx.fillRect(Math.round(b.x) - 1, sy(b.y), 3, 1); }
        for (const s of sparks) { ctx.fillStyle = '#ffe080'; ctx.fillRect(Math.round(s.x), sy(s.y), 1, 1); }
        for (const q of popups) text(ctx, q.txt, Math.round(q.x), sy(q.y - (50 - q.t) * 0.3), '#fff', 1, 'center');
        drawHUD(ctx);
        if (msgT > 0) { ctx.fillStyle = '#000'; ctx.fillRect(10, 100, W - 20, 13); text(ctx, msg, W / 2, 103, (T >> 3) & 1 ? '#ff3030' : '#ffd040', 1, 'center'); }
        if (state === 'play' && levelT < 120) { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 100, 100, 13); text(ctx, 'BUILDING ' + level, W / 2, 103, '#ffd040', 1, 'center'); }
        if (state === 'escape' && T > 60) { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 90, 120, 13); text(ctx, 'MISSION COMPLETE', W / 2, 93, '#40ff60', 1, 'center'); }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, 100, 80, 13); text(ctx, 'GAME OVER', W / 2, 103, '#ff3030', 1, 'center'); }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
