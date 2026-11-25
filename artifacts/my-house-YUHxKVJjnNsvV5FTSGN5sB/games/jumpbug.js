// Jump Bug (Hoei/Rock-Ola, 1981) \u2014 from-scratch recreation: a bouncing bug car through city, pyramids, sea and caves.
(function () {
  'use strict';
  const FONT_HEX = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E',
    '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
    '8': '0E11110E11110E', '9': '0E11110F01020C', 'A': '0E11111F111111', 'B': '1E11111E11111E',
    'C': '0E11101010110E', 'D': '1C12111111121C', 'E': '1F10101E10101F', 'F': '1F10101E101010',
    'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E04040404040E', 'J': '0702020202120C',
    'K': '11121418141211', 'L': '1010101010101F', 'M': '111B1515111111', 'N': '11111915131111',
    'O': '0E11111111110E', 'P': '1E11111E101010', 'Q': '0E11111115120D', 'R': '1E11111E141211',
    'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E', 'V': '11111111110A04',
    'W': '1111111515150A', 'X': '11110A040A1111', 'Y': '1111110A040404', 'Z': '1F01020408101F',
    ' ': '00000000000000', '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C',
    ':': '000C0C000C0C00', '/': '00010204081000', '"': '0A0A0000000000', "'": '04040000000000',
    '?': '0E110102040004', '@': '0E11171517100E', '#': '0A0A1F0A1F0A0A', '\u00a9': '0E11171417110E',
    '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408', '=': '00001F001F0000',
    '>': '08040201020408', '<': '02040810080402', '&': '0C12140815120D', '*': '0004150E150400',
    '+': '0004041F040400', '%': '18190204081303'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // text(ctx, str, x, y, colour, {scale, adv, center, right, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold === false ? 1 : 2;
    s = String(s).toUpperCase();
    const w = s.length * adv - (adv - (4 + bw) * sc);
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, bw * sc - (bw - 1) * (sc - 1), sc); }
    }
  }
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; if (g) for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, cy - 2 + r, 1, 1); } x += 4; }
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // sprite from rows of chars; pal maps char -> colour ('.' or unmapped = transparent)
  function sprite(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flipRows = rows => rows.map(r => r.split('').reverse().join(''));
  const vflipRows = rows => rows.slice().reverse();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => Math.floor(Math.random() * n);
  const pick = a => a[irnd(a.length)];
  const pad = (n, l) => String(n).padStart(l, '0');
  // coin-op helper: start with a credit or flash INSERT COIN
  function makeCoin(api) {
    let flash = 0, last = api.credits;
    return {
      tick() {
        if (flash > 0) flash = api.credits > 0 ? 0 : flash - 1;
        if (api.credits > last) api.audio.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        last = api.credits;
      },
      tryStart() {
        if (api.useCredit()) { last = api.credits; return true; }
        flash = 90; api.audio.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      },
      // draws PUSH START / INSERT COIN centred at cx,y and CREDIT nn at cx2,y2
      draw(ctx, cx, y, col, frame) {
        const blink = (frame >> 4) & 1;
        if (flash > 0) { if ((flash >> 2) & 1) text(ctx, 'INSERT COIN', cx, y, '#ff4040', { center: true }); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', cx, y, col, { center: true }); }
        else if (blink) text(ctx, 'PUSH START', cx, y, col, { center: true });
      },
      credit(ctx, x, y, col) { text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), x, y, col); }
    };
  }
  // looping background tune (frame-driven)
  function makeMusic(api) {
    let notes = null, opts = null, len = 0, t = 0, on = false;
    return {
      play(n, o) { notes = n; opts = o || {}; len = n.reduce((s, x) => s + x[1], 0); t = 0; on = true; api.audio.melody(notes, opts); },
      stop() { on = false; },
      tick() { if (!on) return; t += 1 / 60; if (t >= len) { t -= len; api.audio.melody(notes, opts); } },
      get on() { return on; }
    };
  }
  // particle bursts
  function burst(list, x, y, cols, n, sp) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (sp || 1.5) * (0.3 + Math.random()); list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + irnd(20), c: pick(cols) }); }
  }
  function stepParts(list) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; if (--p.t <= 0) list.splice(i, 1); } }
  function drawParts(ctx, list, ox) { ox = ox || 0; for (const p of list) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - ox), Math.round(p.y), p.t > 10 ? 2 : 1, p.t > 10 ? 2 : 1); } }
  // ===================== Jump Bug =====================
  const W = 224, H = 256, CELL = 8, GROUND = 236, HUDH = 20;
  const SEC = 44;                                        // cells per section
  const THEMES = ['city', 'pyramid', 'sea', 'cave'];
  const TH = {
    city: { sky: '#000830', name: 'CITY' },
    pyramid: { sky: '#200828', name: 'PYRAMIDS' },
    sea: { sky: '#002058', name: 'UNDER THE SEA' },
    cave: { sky: '#100800', name: 'CAVE' }
  };
  const CAR = ['....rrrrrr......', '...rccrrccr.....', '..rccc.rcccr....', '.rrrrrrrrrrrr...', 'rrrrrrrrrrrrrrr.', 'rrwrrrrrrrrrrryy', 'rrrrrrrrrrrrrrrr', '.rrrrrrrrrrrrrr.', '..kkk......kkk..', '.kkwkk....kkwkk.', '..kkk......kkk..'];
  const ART = {
    saucer: ['.....gggg.....', '...gwwwwwwg...', '.gggggggggggg.', 'gyggyggyggyggg', '.gggggggggggg.', '...rr....rr...'],
    saucer2: ['.....gggg.....', '...gwwwwwwg...', '.gggggggggggg.', 'ggyggyggyggygg', '.gggggggggggg.', '....rr..rr....'],
    bird: ['w..........w', 'ww........ww', '.www....www.', '..wwwyywww..', '...wwwwww...', '....wrrw....', '.....ww.....'],
    bird2: ['............', '............', '..........w.', 'wwwwwyywwwww', '.wwwwwwwwww.', '....wrrw....', '.....ww.....'],
    fish: ['....oo......', '..oooooo..o.', '.oowooooo.oo', 'ookoooooooo.', '.oooooooo.oo', '..oooooo..o.', '....oo......'],
    fish2: ['....oo......', '..oooooo....', '.oowoooooooo', 'ookoooooooo.', '.oooooooooo.', '..oooooo....', '....oo......'],
    bat: ['p..........p', 'pp..pppp..pp', 'ppppprrppppp', '.pp.pppp.pp.', '....p..p....'],
    bat2: ['....pppp....', '...pprrpp...', '.pppppppppp.', 'pp..pppp..pp', 'p...p..p...p'],
    bag: ['...yy...', '..y..y..', '...yy...', '.yyyyyy.', 'yyykyyyy', 'yykkkyyy', 'yyykyyyy', '.yyyyyy.'],
    gem: ['..cccc..', '.cwcccc.', 'cccccccc', '.cccccc.', '..cccc..', '...cc...'],
    bomb: ['.r.', 'kkk', 'kkk', '.k.'],
    flag: ['wrrrrrr', 'wrrrrr.', 'wrrrr..', 'wrrrrr.', 'wrrrrrr', 'w......', 'w......', 'w......', 'w......', 'w......', 'w......', 'w......', 'w......', 'w......', 'w......', 'w......']
  };
  const PAL = { r: '#e02020', c: '#60e0ff', w: '#ffffff', y: '#ffe040', k: '#202020', g: '#40e060', o: '#ff9030', p: '#c050ff' };
  const PTS = { saucer: 300, bird: 200, fish: 150, bat: 100 };

  ArcadeRegistry.register({
    id: 'jumpbug', title: 'Jump Bug', year: 1981, maker: 'Hoei/Rock-Ola',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: drive \u00b7 Up/X: big jump \u00b7 Down: small hop \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#000830', fg: '#ff3030', accent: '#ffe040' },
    create(api) {
      const A = api.audio, coin = makeCoin(api), music = makeMusic(api);
      const SP = {}; for (const k in ART) SP[k] = sprite(ART[k], PAL);
      SP.carR = sprite(CAR, PAL); SP.carL = sprite(flipRows(CAR), PAL);
      SP.fishR = sprite(flipRows(ART.fish), PAL); SP.fish2R = sprite(flipRows(ART.fish2), PAL);
      const stars = []; for (let i = 0; i < 50; i++) stars.push([irnd(W), HUDH + irnd(120), pick(['#ffffff', '#8080ff', '#ffe040'])]);

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, stage = 1, nextExtra = 10000;
      let world = [], ents = [], items = [], shots = [], bombs = [], parts = [], popups = [], camX = 0, car, goalX = 0, demo = false;

      // ---------------- world generation ----------------
      function genStage() {
        world = []; ents = []; items = [];
        // first few cells: flat street start
        for (let i = 0; i < 12; i++) world.push({ top: GROUND, ceil: 0, th: 'city', bld: 0 });
        const nSec = 4 + Math.min(2, stage >> 1);
        for (let s = 0; s < nSec; s++) {
          const th = THEMES[(s + stage - 1) % 4];
          const start = world.length;
          let i = 0;
          while (i < SEC) {
            if (th === 'city') {
              const w = 3 + irnd(4), h = 24 + irnd(44 + Math.min(8, stage * 2)), gap = 1 + irnd(2), seed = irnd(1000);
              for (let k = 0; k < w && i < SEC; k++, i++) world.push({ top: GROUND - h, ceil: 0, th, bld: 1 + (seed % 3), seed: seed + k });
              if (Math.random() < 0.7) items.push({ k: 'bag', x: (world.length - Math.ceil(w / 2)) * CELL, y: GROUND - h - 10, v: 100 * Math.min(5, stage) });
              for (let k = 0; k < gap && i < SEC; k++, i++) world.push({ top: GROUND, ceil: 0, th, bld: 0 });
            } else if (th === 'pyramid') {
              const half = 3 + irnd(4), step = 10 + irnd(6);
              for (let k = 0; k < half * 2 + 1 && i < SEC; k++, i++) world.push({ top: GROUND - (half - Math.abs(k - half) + 1) * step, ceil: 0, th, bld: 0 });
              items.push({ k: Math.random() < 0.3 ? 'gem' : 'bag', x: (world.length - half - 1) * CELL, y: GROUND - (half + 1) * step - 10, v: 0 });
              const pit = Math.random() < 0.35 + stage * 0.05;
              for (let k = 0; k < 2 && i < SEC; k++, i++) world.push({ top: pit ? 999 : GROUND, ceil: 0, th, bld: 0 });
            } else if (th === 'sea') {
              const h = 4 + irnd(60), w = 2 + irnd(4);
              for (let k = 0; k < w && i < SEC; k++, i++) world.push({ top: GROUND - h - (k % 2) * 4, ceil: 0, th, bld: 0, weed: Math.random() < 0.3 });
              if (Math.random() < 0.4) items.push({ k: 'gem', x: (world.length - 1) * CELL, y: GROUND - h - 12, v: 0 });
            } else {
              const h = 4 + irnd(40), w = 2 + irnd(4), c = HUDH + 20 + irnd(60 + Math.min(30, stage * 5));
              for (let k = 0; k < w && i < SEC; k++, i++) world.push({ top: GROUND - h, ceil: c + (k % 2) * 6, th, bld: 0 });
              if (Math.random() < 0.3 + stage * 0.04) for (let k = 0; k < 2 && i < SEC; k++, i++) world.push({ top: 999, ceil: c, th, bld: 0 });
              if (Math.random() < 0.3) items.push({ k: 'bag', x: (world.length - 1) * CELL, y: GROUND - h - 12, v: 0 });
            }
          }
          // enemies for this section
          const n = 3 + Math.min(6, stage + s);
          for (let e = 0; e < n; e++) {
            const ex = (start + 6 + Math.floor((SEC - 8) * (e + Math.random() * 0.6) / n)) * CELL;
            const type = th === 'city' ? 'saucer' : th === 'pyramid' ? 'bird' : th === 'sea' ? 'fish' : 'bat';
            ents.push({ type, x: ex, y: 0, on: false, T: 0, cd: 60 + irnd(60), base: 0 });
          }
        }
        // finish street with flag
        for (let i = 0; i < 20; i++) world.push({ top: GROUND, ceil: 0, th: 'city', bld: 0 });
        goalX = (world.length - 12) * CELL;
        items.forEach(it => { if (!it.v) it.v = it.k === 'gem' ? 500 : 200; });
      }
      const cellAt = x => world[clamp(Math.floor(x / CELL), 0, world.length - 1)];
      function groundUnder(x0, x1) { let g = 999; for (let x = Math.floor(x0 / CELL); x <= Math.floor(x1 / CELL); x++) { const c = world[clamp(x, 0, world.length - 1)]; g = Math.min(g, c.top); } return g; }
      function ceilOver(x0, x1) { let g = 0; for (let x = Math.floor(x0 / CELL); x <= Math.floor(x1 / CELL); x++) { const c = world[clamp(x, 0, world.length - 1)]; g = Math.max(g, c.ceil); } return g; }

      function newCar(x) { while (x < world.length * CELL - 40 && (cellAt(x).top >= 999 || cellAt(x + 15).top >= 999 || cellAt(x - 8).top >= 999)) x += CELL; car = { x, y: 60, vx: 0, vy: 0, face: 1, squash: 0, dead: 0, inv: 90 }; }
      function startGame() {
        score = 0; lives = 3; stage = 1; nextExtra = 10000; startStage();
      }
      function startStage() {
        genStage(); camX = 0; newCar(40); shots = []; bombs = []; parts = []; popups = [];
        state = 'ready'; T = 0;
        A.melody([[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .3]], { type: 'square', vol: 0.1 });
      }
      function addScore(v) {
        if (demo) return;
        score += v; if (score > hi) hi = score;
        if (score >= nextExtra) { lives++; nextExtra += 20000; A.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.12 }); }
      }
      const BASSLINE = [[131, .15], [0, .15], [196, .15], [0, .15], [165, .15], [0, .15], [196, .15], [0, .15], [147, .15], [0, .15], [220, .15], [0, .15], [175, .15], [0, .15], [220, .15], [196, .15]];

      // ---------------- car physics ----------------
      function water() { return cellAt(car.x + 8).th === 'sea'; }
      function updateCar() {
        const c = car;
        let ax = 0, big = false, small = false, fire = false;
        if (demo) { ax = 1; big = T % 200 < 60; fire = T % 25 === 0; }
        else {
          if (api.key('ArrowLeft')) ax = -1; if (api.key('ArrowRight')) ax = 1;
          big = api.key('ArrowUp') || api.key('KeyX'); small = api.key('ArrowDown');
          fire = api.pressed('Space') || api.pressed('KeyZ');
        }
        if (ax) { c.vx += ax * 0.08; c.face = ax; } else c.vx *= 0.97;
        const maxv = water() ? 1.1 : 1.7;
        c.vx = clamp(c.vx, -maxv, maxv);
        // horizontal move with wall check
        const nx = c.x + c.vx;
        const lead = c.vx > 0 ? nx + 15 : nx;
        const cl = cellAt(lead);
        if (cl.top < c.y + 10 - 3) { c.vx = 0; } else c.x = nx;
        if (c.x < camX + 2) { c.x = camX + 2; c.vx = Math.max(0, c.vx); }
        // vertical
        const g = water() ? 0.09 : 0.18;
        c.vy += g; if (water()) c.vy = Math.min(c.vy, 1.6);
        c.y += c.vy;
        const gr = groundUnder(c.x + 2, c.x + 13);
        if (c.vy > 0 && c.y + 10 >= gr && c.y + 10 - c.vy <= gr + 4) {
          c.y = gr - 10;
          const bv = big ? 5.6 : small ? 2.6 : 4.2;
          c.vy = -bv * (water() ? 0.75 : 1); c.squash = 6;
          A.tone(big ? 180 : 240, 0.12, { type: 'square', vol: 0.07, slideTo: big ? 520 : 400 });
        }
        const ce = ceilOver(c.x + 2, c.x + 13);
        if (ce && c.y < ce) { c.y = ce; c.vy = Math.abs(c.vy) * 0.5 + 0.5; A.tone(120, 0.06, { type: 'square', vol: 0.06 }); }
        if (c.squash > 0) c.squash--;
        if (c.inv > 0) c.inv--;
        if (fire && shots.length < 2) { shots.push({ x: c.x + (c.face > 0 ? 16 : -2), y: c.y + 5, vx: c.face * 4 + c.vx, t: 0 }); A.tone(1300, 0.06, { type: 'square', vol: 0.07, slideTo: 600 }); }
        if (c.y > H + 10) killCar();
        // camera
        camX = Math.max(camX, Math.min(c.x - 80, world.length * CELL - W));
      }
      function killCar() {
        if (car.dead || demo) { if (demo) { car.y = 40; car.vy = 0; } return; }
        car.dead = 1; state = 'dying'; T = 0;
        burst(parts, car.x + 8, Math.min(car.y + 5, H - 10), ['#e02020', '#ffffff', '#ffe040', '#60e0ff'], 26, 2);
        A.noise(0.8, { vol: 0.25, freq: 2000, slideTo: 80 }); music.stop();
        A.melody([[523, .12], [494, .12], [466, .12], [440, .12], [415, .3]], { type: 'square', vol: 0.1, delay: 0.5 });
      }
      const hitCar = (x, y, w, h) => car.inv <= 0 && x < car.x + 14 && x + w > car.x + 2 && y < car.y + 10 && y + h > car.y + 1;

      // ---------------- enemies ----------------
      function updEnts() {
        const sp = 1 + Math.min(0.8, (stage - 1) * 0.12);
        for (const e of ents) {
          if (e.dead) continue;
          if (!e.on) {
            if (e.x < camX + W + 10) {
              e.on = true;
              if (e.type === 'saucer') { e.y = HUDH + 20 + irnd(50); e.base = e.y; }
              if (e.type === 'bird') { e.y = HUDH + 20 + irnd(80); e.vx = -1.2 * sp; e.vy = 0; }
              if (e.type === 'fish') { e.y = 120 + irnd(90); e.base = e.y; e.vx = -0.8 * sp; }
              if (e.type === 'bat') { const c = cellAt(e.x); e.y = Math.max(c.ceil + 10, 70); e.vx = -0.6; e.vy = 0; }
            } else continue;
          }
          e.T++;
          if (e.type === 'saucer') {
            e.x += -0.5 * sp + Math.sin(e.T / 40) * 0.8; e.y = e.base + Math.sin(e.T / 17) * 8;
            if (--e.cd <= 0 && Math.abs(e.x + 7 - car.x - 8) < 40 && state === 'play') { bombs.push({ x: e.x + 6, y: e.y + 6, vy: 0.5 }); e.cd = Math.max(40, 120 - stage * 10); A.tone(800, 0.3, { type: 'triangle', vol: 0.05, slideTo: 200 }); }
          } else if (e.type === 'bird') {
            if (e.T > 30 && e.T < 140) { e.vy += clamp((car.y - e.y) * 0.002, -0.06, 0.06); e.vy = clamp(e.vy, -1.5, 1.5); }
            e.x += e.vx; e.y += e.vy;
          } else if (e.type === 'fish') {
            e.x += e.vx; e.y = e.base + Math.sin(e.T / 20) * 10;
          } else if (e.type === 'bat') {
            const dx = car.x - e.x, dy = car.y - e.y;
            e.vx += clamp(dx * 0.001, -0.05, 0.05) + rnd(-0.08, 0.08); e.vy += clamp(dy * 0.002, -0.06, 0.06) + rnd(-0.15, 0.15);
            e.vx = clamp(e.vx, -1.4 * sp, 1.2); e.vy = clamp(e.vy, -1.2, 1.2);
            e.x += e.vx; e.y += e.vy;
            const c = cellAt(e.x + 6); if (e.y < c.ceil + 2) { e.y = c.ceil + 2; e.vy = Math.abs(e.vy); }
          }
          if (e.x < camX - 40 || e.y > H + 20 || e.y < -20) e.dead = true;
          if (state === 'play' && !e.dead && hitCar(e.x + 1, e.y + 1, 10, 5)) { e.dead = true; burst(parts, e.x + 6, e.y + 3, ['#ffffff'], 8); killCar(); }
        }
        ents = ents.filter(e => !e.dead);
        for (let i = bombs.length - 1; i >= 0; i--) {
          const b = bombs[i]; b.vy = Math.min(2.5, b.vy + 0.05); b.y += b.vy;
          if (b.y >= groundUnder(b.x, b.x + 2) - 3 || b.y > H) { bombs.splice(i, 1); burst(parts, b.x + 1, b.y, ['#ff9030', '#ffe040'], 6, 1); A.noise(0.15, { vol: 0.08, freq: 1500 }); continue; }
          if (state === 'play' && hitCar(b.x, b.y, 3, 4)) { bombs.splice(i, 1); killCar(); }
        }
      }
      function updShots() {
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; s.x += s.vx; s.t++;
          const c = cellAt(s.x);
          let gone = s.t > 50 || s.y >= c.top || (c.ceil && s.y <= c.ceil);
          if (!gone) for (const e of ents) {
            if (!e.on || e.dead) continue;
            if (s.x >= e.x - 2 && s.x <= e.x + 14 && s.y >= e.y - 2 && s.y <= e.y + 8) {
              e.dead = true; gone = true; addScore(PTS[e.type]); popups.push({ x: e.x + 6, y: e.y, v: PTS[e.type], t: 50 });
              burst(parts, e.x + 6, e.y + 3, ['#ffffff', '#ffe040', '#ff9030'], 12); A.noise(0.25, { vol: 0.15, freq: 3000, slideTo: 300 });
              break;
            }
          }
          if (!gone) for (let j = bombs.length - 1; j >= 0; j--) { const b = bombs[j]; if (Math.abs(s.x - b.x) < 5 && Math.abs(s.y - b.y) < 5) { bombs.splice(j, 1); gone = true; addScore(50); break; } }
          if (gone) shots.splice(i, 1);
        }
      }
      function updItems() {
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          if (it.x - 2 < car.x + 14 && it.x + 10 > car.x && it.y - 2 < car.y + 10 && it.y + 10 > car.y) {
            items.splice(i, 1); addScore(it.v); popups.push({ x: it.x + 4, y: it.y, v: it.v, t: 60 });
            A.melody([[1047, .05], [1319, .05], [1568, .08]], { type: 'square', vol: 0.1 });
          }
        }
      }

      function update() {
        coin.tick(); T++;
        stepParts(parts);
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        if (state === 'title') {
          if (api.anyPressed('Enter', 'Space')) { if (coin.tryStart()) { demo = false; startGame(); } }
          else if (T > 700) { demo = true; stage = 1 + irnd(3); startStage(); state = 'play'; T = 0; }
          return;
        }
        if (demo) {
          if (api.anyPressed('Enter', 'Space') || T > 1300) { demo = false; state = 'title'; T = 0; return; }
          updateCar(); updEnts(); updShots(); return;
        }
        music.tick();
        if (state === 'ready') { if (T > 120) { state = 'play'; T = 0; music.play(BASSLINE, { type: 'triangle', vol: 0.09 }); } return; }
        if (state === 'play') {
          updateCar(); if (state !== 'play') return;
          updEnts(); updShots(); updItems();
          if (car.x >= goalX) {
            state = 'clear'; T = 0; music.stop();
            A.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .1], [1319, .4]], { type: 'square', vol: 0.1 });
          }
          return;
        }
        if (state === 'clear') {
          if (T === 60) addScore(1000 * stage);
          car.vy += 0.18; car.y += car.vy; if (car.y + 10 >= GROUND) { car.y = GROUND - 10; car.vy = -3; }
          car.x += 0.8;
          if (T > 240) { stage++; startStage(); }
          return;
        }
        if (state === 'dying') {
          updEnts(); updShots();
          if (T === 120) {
            lives--;
            if (lives > 0) { newCar(camX + 40); bombs = []; state = 'ready'; T = 60; }
            else {
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              state = 'hold';
              if (api.offerContinue) api.offerContinue(() => { lives = 3; newCar(camX + 40); bombs = []; state = 'ready'; T = 60; }, over); else over();
            }
          }
          return;
        }
        if (state === 'over') { if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; } }
      }

      // ---------------- drawing ----------------
      function drawWorld(ctx) {
        const ox = Math.floor(camX);
        const c0 = Math.floor(ox / CELL), c1 = c0 + Math.ceil(W / CELL) + 1;
        // sky by the theme in view centre
        const thC = cellAt(ox + W / 2).th;
        ctx.fillStyle = TH[thC].sky; ctx.fillRect(0, HUDH, W, H - HUDH);
        if (thC === 'city' || thC === 'pyramid') {
          for (const s of stars) { ctx.fillStyle = s[2]; ctx.fillRect((s[0] - ox * 0.2 % W + W) % W, s[1], 1, 1); }
          ctx.fillStyle = thC === 'city' ? '#ffffc0' : '#ffb060'; ctx.beginPath(); ctx.arc(180 - (ox * 0.05) % 40, 50, 10, 0, Math.PI * 2); ctx.fill();
        } else if (thC === 'sea') {
          ctx.fillStyle = '#4080ff'; ctx.fillRect(0, HUDH + 6, W, 2);
          ctx.fillStyle = '#80c0ff'; for (let i = 0; i < 12; i++) { const bx = (i * 37 - ox * 0.5 + 2000) % W, by = H - ((api.frame * 0.6 + i * 53) % (H - 40)); ctx.fillRect(bx, by, 2, 2); }
        }
        for (let c = c0; c <= c1 && c < world.length; c++) {
          const cl = world[c]; const x = c * CELL - ox;
          if (cl.ceil) {
            ctx.fillStyle = '#6a4020'; ctx.fillRect(x, HUDH, CELL, cl.ceil - HUDH);
            ctx.fillStyle = '#a06830'; ctx.fillRect(x, cl.ceil - 2, CELL, 2);
            if (c % 3 === 0) { ctx.fillStyle = '#6a4020'; ctx.fillRect(x + 2, cl.ceil, 4, 4); ctx.fillRect(x + 3, cl.ceil + 4, 2, 4); }
          }
          if (cl.top >= H) continue;
          const t = cl.top;
          if (cl.th === 'city') {
            if (cl.bld) {
              const cols = ['#405080', '#604878', '#386060'][cl.bld - 1];
              ctx.fillStyle = cols; ctx.fillRect(x, t, CELL, H - t);
              ctx.fillStyle = '#8090c0'; ctx.fillRect(x, t, CELL, 2);
              for (let y = t + 6; y < GROUND - 4; y += 8) { const lit = ((cl.seed * 7 + y) % 5) < 2; ctx.fillStyle = lit ? '#ffe880' : '#202838'; ctx.fillRect(x + 2, y, 4, 4); }
            } else {
              ctx.fillStyle = '#505050'; ctx.fillRect(x, t, CELL, H - t);
              ctx.fillStyle = '#ffffff'; if (c % 2) ctx.fillRect(x + 1, t + 8, 5, 1);
            }
          } else if (cl.th === 'pyramid') {
            ctx.fillStyle = '#c89040'; ctx.fillRect(x, t, CELL, H - t);
            ctx.fillStyle = '#e8b860'; ctx.fillRect(x, t, CELL, 2);
            ctx.fillStyle = '#906020'; for (let y = t + 5; y < H; y += 6) ctx.fillRect(x + ((y / 6 | 0) % 2) * 4, y, 4, 1);
          } else if (cl.th === 'sea') {
            ctx.fillStyle = '#806040'; ctx.fillRect(x, t, CELL, H - t);
            ctx.fillStyle = '#a08060'; ctx.fillRect(x, t, CELL, 2);
            if (cl.weed) { ctx.fillStyle = '#20c060'; const s = Math.round(Math.sin(api.frame / 15 + c) * 2); ctx.fillRect(x + 3 + s, t - 10, 2, 5); ctx.fillRect(x + 3, t - 5, 2, 5); }
          } else {
            ctx.fillStyle = '#5a3818'; ctx.fillRect(x, t, CELL, H - t);
            ctx.fillStyle = '#8a5828'; ctx.fillRect(x, t, CELL, 2);
          }
        }
        // goal flag
        const fx = goalX - ox; if (fx > -10 && fx < W) ctx.drawImage(SP.flag, fx, GROUND - 16);
      }
      function drawCar(ctx, x, y) {
        const s = car.face > 0 ? SP.carR : SP.carL;
        if (car.inv > 0 && (car.inv >> 2) & 1) return;
        if (car.squash > 0) ctx.drawImage(s, Math.round(x - 1), Math.round(y + 3), 18, 8);
        else if (car.vy < -2) ctx.drawImage(s, Math.round(x + 1), Math.round(y - 2), 14, 13);
        else ctx.drawImage(s, Math.round(x), Math.round(y));
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUDH);
        text(ctx, '1UP', 8, 1, '#ff3030'); text(ctx, pad(score, 6), 8, 10, '#ffffff');
        text(ctx, 'HI-SCORE', 112, 1, '#ff3030', { center: true }); text(ctx, pad(hi, 6), 112, 10, '#ffffff', { center: true });
        if (state !== 'title') {
          text(ctx, 'ST' + stage, W - 8, 1, '#ffe040', { right: true });
          for (let i = 0; i < Math.min(5, lives - 1); i++) ctx.drawImage(SP.carR, W - 20 - i * 12, 11, 10, 7);
          // progress bar
          const p = clamp(car ? car.x / goalX : 0, 0, 1); ctx.fillStyle = '#303060'; ctx.fillRect(170, 19, 50, 1); ctx.fillStyle = '#ffe040'; ctx.fillRect(170, 19, Math.round(50 * p), 1);
        }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = '#000830'; ctx.fillRect(0, 0, W, H);
        for (const s of stars) { ctx.fillStyle = s[2]; ctx.fillRect(s[0], s[1] + 20, 1, 1); }
        drawHUD(ctx);
        text(ctx, 'JUMP', 112, 34, '#ff3030', { center: true, scale: 3 });
        text(ctx, 'BUG', 112, 60, '#ffe040', { center: true, scale: 3 });
        // bouncing bug demo
        const by = 128 - Math.abs(Math.sin(T / 22)) * 30;
        ctx.drawImage(SP.carR, 104, Math.round(by));
        ctx.fillStyle = '#405080'; ctx.fillRect(84, 140, 56, 4);
        text(ctx, '- SCORE TABLE -', 112, 154, '#ffffff', { center: true });
        const rows = [['saucer', 300], ['bird', 200], ['fish', 150], ['bat', 100]];
        rows.forEach((r, i) => { ctx.drawImage(SP[r[0]], 54, 168 + i * 12); text(ctx, r[1] + ' PTS', 80, 168 + i * 12, '#ffe040'); });
        ctx.drawImage(SP.bag, 150, 168); text(ctx, '200', 164, 168, '#ffe040'); ctx.drawImage(SP.gem, 150, 182); text(ctx, '500', 164, 182, '#60e0ff');
        coin.draw(ctx, 112, 222, '#ffffff', api.frame);
        text(ctx, '\u00a9 1981 HOEI/ROCK-OLA', 112, 236, '#8080ff', { center: true, adv: 7 });
        coin.credit(ctx, 4, 247, '#808080');
      }
      function render(ctx) {
        if (state === 'title') { renderTitle(ctx); return; }
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawWorld(ctx);
        const ox = Math.floor(camX);
        for (const it of items) { const x = it.x - ox; if (x > -10 && x < W) ctx.drawImage(SP[it.k], Math.round(x), Math.round(it.y + Math.sin(api.frame / 10 + it.x) * 1.5)); }
        for (const e of ents) {
          if (!e.on || e.dead) continue;
          const f = (e.T >> 3) & 1, x = Math.round(e.x - ox), y = Math.round(e.y);
          let s = SP[e.type + (f ? '2' : '')] || SP[e.type];
          if (e.type === 'fish' && e.vx > 0) s = f ? SP.fish2R : SP.fishR;
          ctx.drawImage(s, x, y);
        }
        for (const b of bombs) ctx.drawImage(SP.bomb, Math.round(b.x - ox), Math.round(b.y));
        ctx.fillStyle = '#ffffff'; for (const s of shots) ctx.fillRect(Math.round(s.x - ox), Math.round(s.y), 3, 2);
        if (car && state !== 'dying' && state !== 'hold' && state !== 'over') drawCar(ctx, car.x - ox, car.y);
        drawParts(ctx, parts, ox);
        for (const p of popups) tinyNum(ctx, p.v, p.x - ox, Math.round(p.y - (60 - p.t) * 0.2), '#ffffff');
        drawHUD(ctx);
        if (state === 'ready') { text(ctx, 'STAGE ' + stage, 112, 90, '#ffe040', { center: true, scale: 2 }); text(ctx, TH[cellAt(car.x + 300).th].name, 112, 112, '#ffffff', { center: true }); }
        if (state === 'clear') { text(ctx, 'STAGE CLEAR', 112, 90, '#ffe040', { center: true }); if (T > 60) text(ctx, 'BONUS ' + 1000 * stage, 112, 106, '#ffffff', { center: true }); }
        if (state === 'over' || state === 'hold') text(ctx, 'GAME OVER', 112, 100, '#ff3030', { center: true, scale: 2 });
        if (demo) { text(ctx, 'DEMO PLAY', 112, 60, '#ffe040', { center: true }); coin.draw(ctx, 112, 74, '#ffffff', api.frame); }
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, lives, stage, x: car && Math.round(car.x), goal: goalX, ents: ents.length }), car: () => car, ents: () => ents, ground: (a, b) => groundUnder(a, b), cell: x => cellAt(x), bombs: () => bombs });
      return { update, render, destroy() { music.stop(); } };
    }
  });
})();
