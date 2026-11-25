// Rampage (Bally Midway, 1986) - from-scratch recreation: climb, punch and eat your way across America.
(function () {
  'use strict';
  // ---------- 5x7 bitmap font ----------
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

  const W = 256, H = 240, GY = 214, CELL = 16;
  const CITIES = ['PEORIA, ILLINOIS', 'CHICAGO, ILLINOIS', 'GARY, INDIANA', 'MILWAUKEE, WISCONSIN', 'MADISON, WISCONSIN', 'DETROIT, MICHIGAN',
    'TOLEDO, OHIO', 'CLEVELAND, OHIO', 'PITTSBURGH, PENNSYLVANIA', 'BUFFALO, NEW YORK', 'NEW YORK, NEW YORK', 'PHILADELPHIA, PA',
    'BALTIMORE, MARYLAND', 'WASHINGTON, D.C.', 'RICHMOND, VIRGINIA', 'ATLANTA, GEORGIA', 'MIAMI, FLORIDA', 'NEW ORLEANS, LOUISIANA',
    'HOUSTON, TEXAS', 'DALLAS, TEXAS', 'DENVER, COLORADO', 'LAS VEGAS, NEVADA', 'LOS ANGELES, CALIFORNIA', 'SAN FRANCISCO, CALIFORNIA'];
  const MONS = [
    { id: 'george', name: 'GEORGE', body: '#6a3a1a', dark: '#40200c', belly: '#b07848', face: '#d09a70', eye: '#ffffff' },
    { id: 'lizzie', name: 'LIZZIE', body: '#3a9a30', dark: '#1e5a18', belly: '#d8d040', face: '#50b040', eye: '#ffe040' },
    { id: 'ralph', name: 'RALPH', body: '#8a8478', dark: '#4a463e', belly: '#d8d0c0', face: '#a8a294', eye: '#ffffff' }
  ];
  const BCOLS = [['#a85838', '#7a3a20'], ['#7888a0', '#4a5870'], ['#c8b890', '#8a7a58'], ['#6a8a5a', '#3e5a34'], ['#a07898', '#6a4a64'], ['#b8a070', '#7a6438']];
  const SKIES = [['#58a0e8', '#a8d0f0'], ['#f0a050', '#f8d090'], ['#283870', '#7050a0'], ['#081030', '#203060']];

  ArcadeRegistry.register({
    id: 'rampage', title: 'Rampage', year: 1986, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk / climb \u00b7 Space: punch \u00b7 X: jump \u00b7 Down+Space on a roof: punch down \u00b7 Enter: start',
    marquee: { bg: '#101010', fg: '#f0d020', accent: '#e02020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits, sel = 0, selT = 0;
      let g = null;
      let seed = 1;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        punch() { au.noise(0.07, { vol: 0.14, freq: 1200 }); au.tone(140, 0.06, { type: 'square', vol: 0.08, slideTo: 70 }); },
        smash() { au.noise(0.18, { vol: 0.16, freq: 4000, slideTo: 800 }); },
        roar() { au.tone(110, 0.5, { type: 'sawtooth', vol: 0.12, slideTo: 70 }); au.noise(0.5, { vol: 0.08, freq: 600 }); },
        eat() { au.melody([[200, .06], [150, .06], [200, .06], [150, .06]], { type: 'square', vol: 0.09 }); },
        scream() { au.tone(1400, 0.25, { type: 'triangle', vol: 0.08, slideTo: 1900 }); },
        shot() { au.tone(1600, 0.03, { type: 'square', vol: 0.04, slideTo: 600 }); },
        boom() { au.noise(0.5, { vol: 0.2, freq: 2000, slideTo: 80 }); },
        collapse() { au.noise(1.6, { vol: 0.22, freq: 900, slideTo: 60 }); au.tone(80, 1.6, { type: 'sawtooth', vol: 0.08, slideTo: 30 }); },
        hurt() { au.tone(300, 0.08, { type: 'square', vol: 0.08, slideTo: 150 }); },
        zap() { au.tone(2000, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 300 }); },
        good() { au.melody([[523, .08], [659, .08], [784, .08], [1047, .2]], { type: 'square', vol: 0.1 }); },
        day() {
          au.melody([[196, .12], [196, .12], [233, .12], [262, .24], [196, .12], [175, .12], [196, .36]], { type: 'square', vol: 0.09 });
          au.melody([[98, .24], [98, .24], [87, .24], [98, .48]], { type: 'triangle', vol: 0.12 });
        }
      };

      // ---------- day setup ----------
      function newGame(mon) {
        g = { mon, score: 0, lives: 3, day: 1, nextLife: 100000 };
        startDay();
      }
      function startDay() {
        seed = g.day * 7717 + 3;
        const n = 2 + (rnd() * 3 | 0) - (g.day === 1 ? 0 : 0);
        const cols = [], widths = [];
        for (let i = 0; i < n; i++) { const c = n === 4 ? 3 : 3 + (rnd() * (n === 3 ? 2 : 3) | 0); cols.push(c); widths.push(c * CELL); }
        const total = widths.reduce((a, b) => a + b, 0), gap = (W - total) / (n + 1);
        g.bs = [];
        let x = gap;
        for (let i = 0; i < n; i++) {
          const floors = 6 + (rnd() * Math.min(6, 2 + g.day) | 0);
          const cells = [];
          for (let r = 0; r < floors; r++) { const row = []; for (let c = 0; c < cols[i]; c++) row.push({ hp: 2, occ: null, t: 0, lit: rnd() < 0.5 }); cells.push(row); }
          const bc = BCOLS[(g.day + i * 2) % BCOLS.length];
          g.bs.push({ x: Math.round(x), w: widths[i], cols: cols[i], floors, cells, sink: 0, collapsing: false, gone: false, dmg: 0, col: bc[0], dark: bc[1], shake: 0, sign: i === 0 && g.day % 2 ? 'HOTEL' : i === 1 ? 'BANK' : '' });
          x += widths[i] + gap;
        }
        g.m = { x: 16, y: GY, vx: 0, vy: 0, face: 1, st: 'drop', b: null, side: 0, punchT: 0, eatT: 0, hurtT: 0, shockT: 0, anim: 0, health: 100, inv: 0 };
        g.m.y = -20; g.m.vy = 0; g.m.x = 30;
        g.ens = []; g.shots = []; g.fx = []; g.pops = []; g.debris = [];
        g.dayT = 0; g.solT = 120; g.heliT = g.day >= 2 ? 500 : 1500; g.tankT = g.day >= 3 ? 900 : 99999; g.carT = 200; g.occT = 60;
        g.phase = 'intro'; g.phaseT = 150; g.dayDmg = 0;
        g.city = CITIES[Math.floor((g.day - 1) / 2) % CITIES.length];
        g.sky = SKIES[(g.day - 1) % 4];
        snd.day();
      }
      function addScore(n, x, y) {
        g.score += n; g.dayDmg += n;
        if (x != null) g.pops.push({ x, y, s: String(n), t: 45 });
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 100000; snd.good(); }
      }
      const bTop = b => GY - b.floors * CELL + b.sink;
      const cellY = (b, r) => GY - (r + 1) * CELL + b.sink;
      function hurt(n) {
        const m = g.m;
        if (m.inv > 0 || m.st === 'dead' || m.st === 'drop') return;
        m.health -= n; m.hurtT = 12; m.inv = 8; snd.hurt();
        if (m.health <= 0) die();
      }
      function die() {
        const m = g.m;
        m.health = 0; m.st = 'dead'; m.deadT = 0; m.b = null; snd.roar();
      }

      // ---------- monster ----------
      function nearEdge(x, y) {
        for (const b of g.bs) {
          if (b.gone || b.collapsing) continue;
          if (y < bTop(b) + 8) continue;
          if (Math.abs(x - b.x) < 9) return { b, side: -1 };
          if (Math.abs(x - (b.x + b.w)) < 9) return { b, side: 1 };
        }
        return null;
      }
      function startClimb(b, side, y) {
        const m = g.m;
        m.st = 'climb'; m.b = b; m.side = side; m.x = side < 0 ? b.x : b.x + b.w; m.face = -side; m.vy = 0;
        m.y = Math.max(bTop(b) + 20, Math.min(GY - 2, y)); m.lastSink = b.sink;
      }
      function punch() {
        const m = g.m;
        m.punchT = 12; snd.punch();
        const down = api.key('ArrowDown');
        let fx = m.x + m.face * 16, fy = m.y - (m.st === 'walk' ? 10 : 20);
        if (m.st === 'roof' && down) { fx = m.x + m.face * 4; fy = m.y + 6; }
        // building cell
        let hitB = null, row = -1, col = -1;
        if (m.st === 'climb') { hitB = m.b; col = m.side < 0 ? 0 : hitB.cols - 1; row = Math.floor((GY + hitB.sink - fy) / CELL); }
        else if (m.st === 'roof') { hitB = m.b; col = Math.floor((fx - hitB.x) / CELL); row = down ? hitB.floors - 1 : -1; if (!down) hitB = null; }
        else if (m.st === 'walk') {
          for (const b of g.bs) if (!b.gone && !b.collapsing && fx >= b.x && fx < b.x + b.w) { hitB = b; col = Math.floor((fx - b.x) / CELL); row = Math.floor((GY + b.sink - fy) / CELL); }
        }
        let hitSomething = false;
        if (hitB && row >= 0 && row < hitB.floors && col >= 0 && col < hitB.cols) {
          // aim for the topmost intact cell if this one is already a hole and we are punching down
          let c = hitB.cells[row][col];
          if (m.st === 'roof') { let r = row; while (r > 0 && hitB.cells[r][col].hp <= 0) r--; row = r; c = hitB.cells[r][col]; }
          if (c.hp > 0 || c.occ) { hitCell(hitB, row, col); hitSomething = true; }
        }
        // enemies within reach
        for (const e of g.ens) {
          if (e.dead) continue;
          const ex = e.x, ey = e.y - (e.h || 8) / 2;
          if (Math.abs(ex - fx) < (e.type === 'heli' ? 18 : 12) && Math.abs(ey - fy) < (e.type === 'heli' ? 14 : 16)) {
            hitEnemy(e); hitSomething = true; break;
          }
        }
        if (hitSomething) au.tone(90, 0.08, { type: 'square', vol: 0.1 });
      }
      function hitCell(b, row, col) {
        const c = b.cells[row][col], cx = b.x + col * CELL + 8, cy = cellY(b, row) + 8;
        if (c.occ) {
          const o = c.occ; c.occ = null;
          switch (o) {
            case 'person': startEat(10, 500, cx, cy, 'person'); snd.scream(); break;
            case 'soldier': startEat(8, 300, cx, cy, 'soldier'); break;
            case 'food': startEat(12, 100, cx, cy, 'food'); break;
            case 'milk': startEat(10, 100, cx, cy, 'milk'); break;
            case 'money': addScore(1000, cx, cy); snd.good(); break;
            case 'tv': addScore(500, cx, cy); snd.smash(); break;
            case 'plant': addScore(100, cx, cy); break;
            case 'lamp': g.m.shockT = 40; hurt(8); snd.zap(); break;
            case 'tnt': hurt(10); boom(cx, cy); break;
          }
        }
        if (c.hp > 0) {
          c.hp--; snd.smash();
          for (let k = 0; k < 4; k++) g.debris.push({ x: cx, y: cy, vx: (rnd() - 0.5) * 3, vy: -rnd() * 2, t: 40, col: b.col });
          if (c.hp === 0) { b.dmg++; addScore(50, null); checkCollapse(b); }
        }
      }
      function startEat(hp, pts, x, y, what) {
        const m = g.m;
        m.eatT = 40; m.eating = what; m.health = Math.min(100, m.health + hp); addScore(pts, x, y); snd.eat();
      }
      function checkCollapse(b) {
        const total = b.floors * b.cols;
        // a building comes down once enough of it is smashed, or a whole edge column is gone
        let edgeL = 0, edgeR = 0;
        for (let r = 0; r < b.floors; r++) { if (b.cells[r][0].hp <= 0) edgeL++; if (b.cells[r][b.cols - 1].hp <= 0) edgeR++; }
        if (b.dmg >= Math.ceil(total * 0.4) || edgeL >= Math.ceil(b.floors * 0.75) || edgeR >= Math.ceil(b.floors * 0.75)) {
          b.collapsing = true; b.shake = 0; snd.collapse();
          addScore(100 * total, b.x + b.w / 2, bTop(b) + 10);
          for (const r of b.cells) for (const c of r) c.occ = null;
          const m = g.m;
          if (m.b === b && (m.st === 'climb' || m.st === 'roof')) { m.st = 'fall'; m.b = null; m.vy = 0; m.vx = 0; m.fallHurt = 6; }
        }
      }
      function hitEnemy(e) {
        switch (e.type) {
          case 'soldier': e.dead = true; startEat(6, 300, e.x, e.y - 8, 'soldier'); break;
          case 'heli': e.dead = true; boom(e.x, e.y); addScore(500, e.x, e.y); g.debris.push({ x: e.x, y: e.y, vx: e.vx * 0.5, vy: 0, t: 120, col: '#404040', big: true }); break;
          case 'tank': e.hp--; boom(e.x, e.y - 6); if (e.hp <= 0) { e.dead = true; addScore(500, e.x, e.y - 10); } break;
          case 'car': e.dead = true; boom(e.x, e.y - 4); addScore(250, e.x, e.y - 10); g.debris.push({ x: e.x, y: GY - 4, vx: 0, vy: 0, t: 200, col: e.col, wreck: true }); break;
        }
      }
      function boom(x, y) { snd.boom(); g.fx.push({ x, y, t: 0 }); }

      function updMonster() {
        const m = g.m;
        m.anim++;
        if (m.inv > 0) m.inv--;
        if (m.hurtT > 0) m.hurtT--;
        if (m.punchT > 0) m.punchT--;
        const L = api.key('ArrowLeft'), Rt = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        if (m.st === 'dead') {
          m.deadT++;
          if (m.deadT > 50) m.x -= 0.8;
          if (m.deadT > 200) {
            g.lives--;
            if (g.lives <= 0) { lastLife(); return; }
            respawn();
          }
          return;
        }
        if (m.st === 'drop') { // falling in from the sky at the start of a day
          m.vy += 0.25; m.y += m.vy;
          if (m.y >= GY) { m.y = GY; m.st = 'walk'; m.vy = 0; snd.punch(); }
          return;
        }
        if (m.eatT > 0) { m.eatT--; return; }
        if (m.shockT > 0) { m.shockT--; return; }
        const punchP = api.pressed('Space') && m.punchT <= 0;
        if (m.st === 'walk') {
          let dx = 0;
          if (L) dx = -1; else if (Rt) dx = 1;
          if (dx) { m.face = dx; if (m.punchT <= 0) m.x += dx * 1.1; }
          m.x = Math.max(10, Math.min(W - 10, m.x));
          if (U) { const e = nearEdge(m.x, m.y); if (e) startClimb(e.b, e.side, m.y); }
          if (api.pressed('KeyX')) { m.st = 'fall'; m.vy = -4.6; m.vx = dx * 1.2; m.fallHurt = 0; }
          if (punchP) punch();
        } else if (m.st === 'climb') {
          const b = m.b;
          if (!b || b.collapsing || b.gone) { m.st = 'fall'; m.vy = 0; m.vx = 0; m.fallHurt = 0; return; }
          m.x = m.side < 0 ? b.x : b.x + b.w;
          m.y += b.sink - (m.lastSink || b.sink); m.lastSink = b.sink;
          if (U && m.punchT <= 0) { m.y -= 0.9; }
          if (D && m.punchT <= 0) m.y += 1.1;
          const top = bTop(b);
          if (m.y < top + 14) {
            if (U) { m.st = 'roof'; m.y = top; m.x = m.side < 0 ? b.x + 8 : b.x + b.w - 8; }
            else m.y = top + 14;
          }
          if (m.y >= GY) { m.y = GY; m.st = 'walk'; m.b = null; }
          // let go by pushing away from the building
          if ((m.side < 0 && L) || (m.side > 0 && Rt)) { m.st = 'fall'; m.vy = -1.5; m.vx = m.side * 1.4; m.b = null; m.fallHurt = 0; m.face = m.side; }
          if (api.pressed('KeyX')) { m.st = 'fall'; m.vy = -3.5; m.vx = m.side * 1.6; m.b = null; m.fallHurt = 0; m.face = m.side; }
          if (punchP && m.st === 'climb') { m.face = -m.side; punch(); }
        } else if (m.st === 'roof') {
          const b = m.b;
          if (!b || b.collapsing || b.gone) { m.st = 'fall'; m.vy = 0; m.vx = 0; m.fallHurt = 0; return; }
          m.y = bTop(b);
          let dx = 0; if (L) dx = -1; else if (Rt) dx = 1;
          if (dx) { m.face = dx; if (m.punchT <= 0) m.x += dx * 1.1; }
          if (D && !punchP) {
            if (m.x < b.x + 10) startClimb(b, -1, m.y + 20);
            else if (m.x > b.x + b.w - 10) startClimb(b, 1, m.y + 20);
          }
          if (m.st === 'roof' && (m.x < b.x - 2 || m.x > b.x + b.w + 2)) { m.st = 'fall'; m.vy = 0; m.vx = dx * 1.1; m.b = null; m.fallHurt = 0; }
          if (m.st === 'roof' && api.pressed('KeyX')) { m.st = 'fall'; m.vy = -4.2; m.vx = dx * 1.3; m.b = null; m.fallHurt = 0; }
          if (punchP && m.st === 'roof') punch();
        } else if (m.st === 'fall') {
          m.vy += 0.22; m.y += m.vy; m.x += m.vx;
          m.x = Math.max(10, Math.min(W - 10, m.x));
          if (L) m.face = -1; if (Rt) m.face = 1;
          if (U || m.vy > 0) {
            const e = nearEdge(m.x, m.y);
            if (e && (U || m.vy > 3)) { startClimb(e.b, e.side, m.y); m.lastSink = e.b.sink; return; }
          }
          // land on roofs
          if (m.vy > 0) for (const b of g.bs) {
            if (b.gone || b.collapsing) continue;
            const top = bTop(b);
            if (m.x > b.x + 2 && m.x < b.x + b.w - 2 && m.y >= top && m.y - m.vy <= top + 1) { m.y = top; m.st = 'roof'; m.b = b; m.vy = 0; break; }
          }
          if (punchP) punch();
          if (m.y >= GY) { m.y = GY; m.st = 'walk'; m.vx = 0; if (m.fallHurt) { const n = m.fallHurt; m.fallHurt = 0; hurt(n); } snd.punch(); }
        }
      }
      function respawn() {
        const m = g.m;
        Object.assign(m, { x: 30 + rnd() * 196, y: -20, vy: 0, vx: 0, st: 'drop', b: null, health: 100, inv: 120, eatT: 0, shockT: 0 });
        g.shots = [];
      }
      function lastLife() {
        g.m.st = 'gone';
        const cg = g;
        const end = () => { if (g === cg) gameOver(); };
        if (!api.offerContinue) { end(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, end);
      }
      function gameOver() {
        api.setHiScore(g.score); hi = Math.max(hi, g.score);
        mode = 'over'; g.overT = 0;
        au.melody([[262, .25], [247, .25], [233, .25], [220, .6]], { type: 'square', vol: 0.09 });
      }

      // ---------- enemies ----------
      function spawn() {
        const d = g.day, m = g.m;
        g.dayT++;
        const ramp = Math.min(1, g.dayT / 3600);
        if (--g.solT <= 0) {
          g.solT = Math.max(60, 260 - d * 12 - ramp * 80) + rnd() * 60;
          if (g.ens.filter(e => e.type === 'soldier').length < 3 + (d >> 1)) {
            const fromL = rnd() < 0.5;
            g.ens.push({ type: 'soldier', x: fromL ? -6 : W + 6, y: GY + 6, vx: fromL ? 0.6 : -0.6, tx: 20 + rnd() * (W - 40), t: 0, shots: 3 + (rnd() * 3 | 0), cd: 40, h: 12 });
          }
        }
        if (--g.heliT <= 0) {
          g.heliT = Math.max(300, 900 - d * 40 - ramp * 200) + rnd() * 200;
          if (g.ens.filter(e => e.type === 'heli').length < 1 + (d >= 4 ? 1 : 0)) {
            const fromL = rnd() < 0.5;
            g.ens.push({ type: 'heli', x: fromL ? -20 : W + 20, y: 40 + rnd() * 60, vx: fromL ? 1 : -1, vy: 0, t: 0, cd: 80, h: 10, life: 700 });
          }
        }
        if (--g.tankT <= 0) {
          g.tankT = Math.max(500, 1100 - d * 30) + rnd() * 300;
          if (!g.ens.some(e => e.type === 'tank')) {
            const fromL = rnd() < 0.5;
            g.ens.push({ type: 'tank', x: fromL ? -20 : W + 20, y: GY + 10, vx: fromL ? 0.5 : -0.5, tx: fromL ? 30 + rnd() * 40 : W - 30 - rnd() * 40, t: 0, cd: 60, hp: 2, h: 12, shots: 4 });
          }
        }
        if (--g.carT <= 0) {
          g.carT = 200 + rnd() * 300;
          const fromL = rnd() < 0.5;
          g.ens.push({ type: 'car', x: fromL ? -16 : W + 16, y: GY + 18, vx: (fromL ? 1 : -1) * (1.2 + rnd()), col: ['#e0d020', '#2050d0', '#d02020', '#e0e0e0'][rnd() * 4 | 0], police: rnd() < 0.25, h: 10 });
        }
        // window occupants
        if (--g.occT <= 0) {
          g.occT = Math.max(25, 70 - d * 3);
          const bs = g.bs.filter(b => !b.gone && !b.collapsing);
          if (bs.length) {
            const b = bs[rnd() * bs.length | 0], r = rnd() * b.floors | 0, c = rnd() * b.cols | 0, cell = b.cells[r][c];
            if (cell.hp > 0 && !cell.occ) {
              const tbl = ['person', 'person', 'person', 'soldier', 'soldier', 'food', 'milk', 'money', 'tv', 'plant', 'lamp', 'lamp', 'tnt'];
              cell.occ = tbl[rnd() * tbl.length | 0]; cell.t = 300 + (rnd() * 300 | 0); cell.cd = 60;
              if (cell.occ === 'soldier' && d < 2 && rnd() < 0.5) cell.occ = 'person';
            }
          }
        }
        for (const b of g.bs) for (let r = 0; r < b.floors; r++) for (let c = 0; c < b.cols; c++) {
          const cell = b.cells[r][c]; if (!cell.occ) continue;
          if (--cell.t <= 0) { cell.occ = null; continue; }
          if (cell.occ === 'soldier' && m.st !== 'dead' && m.st !== 'drop' && m.st !== 'gone') {
            const cx = b.x + c * CELL + 8, cy = cellY(b, r) + 8;
            if (--cell.cd <= 0 && Math.abs(m.y - 16 - cy) < 60 && Math.abs(m.x - cx) < 120) { cell.cd = 90 + rnd() * 40; fireAt(cx, cy, 2.2, 3); }
          }
        }
      }
      function fireAt(x, y, sp, dmg, big) {
        const m = g.m, tx = m.x, ty = m.y - 16, l = Math.hypot(tx - x, ty - y) || 1;
        g.shots.push({ x, y, vx: (tx - x) / l * sp, vy: (ty - y) / l * sp, dmg, big }); snd.shot();
      }
      function updEnemies() {
        const m = g.m, alive = m.st !== 'dead' && m.st !== 'drop' && m.st !== 'gone';
        for (const e of g.ens) {
          e.t = (e.t || 0) + 1;
          switch (e.type) {
            case 'soldier':
              if (Math.abs(e.x - e.tx) > 1 && e.shots > 0) e.x += e.vx;
              else if (e.shots > 0) {
                e.face = m.x > e.x ? 1 : -1;
                if (--e.cd <= 0 && alive) { e.cd = 70; e.shots--; fireAt(e.x + e.face * 4, e.y - 12, 2.4, 3); }
              } else { e.x += e.vx * 2; if (e.x < -20 || e.x > W + 20) e.dead = true; }
              // a monster on the ground squashes soldiers it walks over
              if (alive && m.st === 'walk' && Math.abs(m.x - e.x) < 8 && m.punchT <= 0 && rnd() < 0.02) { }
              break;
            case 'heli': {
              e.life--;
              const tx = e.life > 0 ? Math.max(20, Math.min(W - 20, m.x + (e.x < m.x ? -60 : 60))) : (e.vx > 0 ? W + 60 : -60);
              const ty = e.life > 0 ? Math.max(30, Math.min(150, m.y - 50)) : e.y;
              e.x += Math.max(-1.2, Math.min(1.2, (tx - e.x) * 0.03));
              e.y += Math.max(-0.8, Math.min(0.8, (ty - e.y) * 0.03));
              e.face = m.x > e.x ? 1 : -1;
              if (e.life > 0 && --e.cd <= 0 && alive) { e.cd = 80; fireAt(e.x + e.face * 10, e.y + 2, 2.6, 4); }
              if (e.life < -200) e.dead = true;
              break;
            }
            case 'tank':
              if (Math.abs(e.x - e.tx) > 1 && e.shots > 0) e.x += e.vx;
              else if (e.shots > 0) { if (--e.cd <= 0 && alive) { e.cd = 110; e.shots--; fireAt(e.x + (m.x > e.x ? 10 : -10), e.y - 14, 2.0, 8, true); } }
              else { e.x -= e.vx; if (e.x < -30 || e.x > W + 30) e.dead = true; }
              e.face = m.x > e.x ? 1 : -1;
              break;
            case 'car': e.x += e.vx; if (e.x < -30 || e.x > W + 30) e.dead = true; break;
          }
        }
        g.ens = g.ens.filter(e => !e.dead);
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy;
          if (s.x < -10 || s.x > W + 10 || s.y < -10 || s.y > H) s.dead = true;
          if (alive && Math.abs(s.x - m.x) < 11 && s.y > m.y - 30 && s.y < m.y) { s.dead = true; hurt(s.dmg); if (s.big) boom(s.x, s.y); }
        }
        g.shots = g.shots.filter(s => !s.dead);
      }
      function updWorld() {
        for (const b of g.bs) {
          if (b.collapsing && !b.gone) {
            b.sink += 0.7; b.shake = (b.shake + 1) % 4;
            if (frame % 3 === 0) for (let k = 0; k < 2; k++) g.debris.push({ x: b.x + rnd() * b.w, y: GY - 2, vx: (rnd() - 0.5) * 1.5, vy: -rnd() * 1.5, t: 50, col: '#c8c0b0', dust: true });
            if (b.sink >= b.floors * CELL) { b.gone = true; }
          }
        }
        for (const d of g.debris) { d.t--; if (!d.wreck) { d.x += d.vx; d.y += d.vy; d.vy += d.dust ? -0.02 : 0.15; if (!d.dust && d.y > GY + 4) { d.y = GY + 4; d.vx = 0; d.vy = 0; } } }
        g.debris = g.debris.filter(d => d.t > 0);
        for (const f of g.fx) f.t++; g.fx = g.fx.filter(f => f.t < 24);
        for (const q of g.pops) { q.t--; q.y -= 0.4; } g.pops = g.pops.filter(q => q.t > 0);
      }
      function updPlay() {
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; updMonster(); updWorld(); return; }
        if (g.phase === 'clear') {
          updWorld();
          if (--g.phaseT <= 0) { g.day++; startDay(); }
          return;
        }
        if (g.m.st === 'gone') return;
        updMonster();
        if (mode !== 'play') return;
        spawn();
        updEnemies();
        updWorld();
        if (g.bs.every(b => b.gone) && g.m.st !== 'dead') {
          g.phase = 'clear'; g.phaseT = 240; g.bonus = 1000 * g.day;
          addScore(g.bonus); snd.good();
          g.ens = g.ens.filter(e => e.type === 'car'); g.shots = [];
        }
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'select'; selT = 0; snd.roar(); }
          return;
        }
        if (mode === 'select') {
          selT++;
          if (api.pressed('ArrowLeft')) { sel = (sel + 2) % 3; snd.punch(); }
          if (api.pressed('ArrowRight')) { sel = (sel + 1) % 3; snd.punch(); }
          if ((selT > 20 && api.anyPressed('Enter', 'Space')) || selT > 900) { newGame(MONS[sel]); mode = 'play'; }
          return;
        }
        if (mode === 'play') { updPlay(); return; }
        if (mode === 'over') { if (++g.overT > 300 || (g.overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; } }
      }

      // ---------- drawing ----------
      function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
      function drawMonster(ctx, mon, x, y, pose, face, t, flash) {
        const P = flash ? { body: '#ffffff', dark: '#ffffff', belly: '#ffffff', face: '#ffffff', eye: '#ff0000' } : mon;
        const r = (dx, dy, w, h, c) => R(ctx, face > 0 ? x + dx : x - dx - w, y + dy, w, h, c);
        const walk = pose === 'walk' ? ((t >> 3) & 1) : 0;
        const lizard = mon.id === 'lizzie', wolf = mon.id === 'ralph';
        // tail
        if (lizard) { r(-16, -14, 6, 4, P.body); r(-20, -11, 5, 3, P.body); }
        // legs
        if (pose === 'jump') { r(-9, -14, 7, 7, P.body); r(2, -14, 7, 7, P.body); r(-10, -8, 8, 2, P.dark); r(2, -8, 8, 2, P.dark); }
        else if (pose === 'climb') { const a = (t >> 3) & 1; r(-8, -10 - a * 3, 6, 10, P.body); r(3, -10 - (1 - a) * 3, 6, 10, P.body); r(-9, -2 - a * 3, 8, 2, P.dark); r(3, -2 - (1 - a) * 3, 8, 2, P.dark); }
        else { r(-8, -11 + walk, 6, 11 - walk, P.body); r(3, -11 + (1 - walk), 6, 11 - (1 - walk), P.body); r(-9, -2, 8, 2, P.dark); r(3, -2, 8, 2, P.dark); }
        // torso
        r(-10, -26, 20, 16, P.body);
        r(-6, -24, 12, 12, P.belly);
        if (lizard) for (let k = 0; k < 4; k++) r(-12, -28 + k * 5, 2, 3, P.dark);
        // head
        r(-6, -35, 13, 10, P.body);
        if (wolf) { r(-5, -38, 3, 4, P.body); r(3, -38, 3, 4, P.body); r(6, -31, 6, 5, P.face); r(11, -31, 2, 2, '#000'); }
        else if (lizard) { r(5, -33, 8, 6, P.face); r(10, -28, 3, 1, '#fff'); }
        else { r(1, -33, 8, 7, P.face); r(3, -28, 5, 1, P.dark); }
        r(3, -33, 3, 3, P.eye); r(5, -32, 1, 1, '#000');
        if (pose === 'eat') { r(4, -28, 6, 3, '#600'); }
        // arms
        if (pose === 'punch') { r(-13, -25, 4, 12, P.body); r(8, -24, 14, 5, P.body); r(21, -26, 6, 8, P.dark); }
        else if (pose === 'punchdown') { r(-13, -25, 4, 12, P.body); r(6, -22, 5, 22, P.body); r(5, 0, 7, 6, P.dark); }
        else if (pose === 'climb') { const a = (t >> 3) & 1; r(-12, -40 + a * 6, 4, 16, P.body); r(9, -40 + (1 - a) * 6, 4, 16, P.body); r(-13, -42 + a * 6, 6, 4, P.dark); r(8, -42 + (1 - a) * 6, 6, 4, P.dark); }
        else if (pose === 'eat') { r(-13, -25, 4, 12, P.body); r(7, -30, 4, 8, P.body); r(6, -34, 8, 6, '#f0c090'); r(8, -36, 4, 3, '#e02020'); }
        else if (pose === 'jump' || pose === 'fall') { r(-14, -36, 4, 12, P.body); r(10, -36, 4, 12, P.body); }
        else if (pose === 'shock') { const a = t & 2; r(-15, -36 + a, 4, 14, P.body); r(11, -36 - a, 4, 14, P.body); }
        else { r(-13, -25, 4, 13 + walk, P.body); r(9, -25, 4, 13 - walk, P.body); }
      }
      function drawHuman(ctx, x, y, face, t) {
        const r = (dx, dy, w, h, c) => R(ctx, face > 0 ? x + dx : x - dx - w, y + dy, w, h, c);
        const w = (t >> 3) & 1;
        r(-2, -14, 4, 4, '#f0b080'); r(-2, -10, 4, 5, '#f0b080'); r(-2, -5, 1, 5 - w, '#f0b080'); r(1, -5, 1, 4 + w, '#f0b080');
        r(-3, -7, 6, 2, '#ffffff'); r(2, -9, 2, 3, '#f0b080');
      }
      function drawBuilding(ctx, b) {
        if (b.gone) {
          // rubble pile
          for (let i = 0; i < b.w; i += 4) R(ctx, b.x + i, GY - 3 - ((i * 7) % 5), 4, 5, (i >> 2) & 1 ? b.dark : '#807868');
          return;
        }
        const sx = b.collapsing ? (b.shake < 2 ? -1 : 1) : 0;
        const top = bTop(b);
        const night = (g.day - 1) % 4 === 3;
        R(ctx, b.x + sx, top, b.w, GY - top, b.col);
        R(ctx, b.x + sx - 2, top - 3, b.w + 4, 3, b.dark);
        R(ctx, b.x + sx + b.w - 2, top, 2, GY - top, b.dark);
        for (let r = 0; r < b.floors; r++) for (let c = 0; c < b.cols; c++) {
          const cell = b.cells[r][c], x = b.x + sx + c * CELL, y = cellY(b, r);
          if (y > GY) continue;
          if (cell.hp <= 0) {
            R(ctx, x + 1, y + 1, CELL - 2, CELL - 2, '#140c08');
            R(ctx, x + 3, y, 3, 2, b.col); R(ctx, x + 10, y + 13, 4, 3, b.col); R(ctx, x, y + 6, 2, 3, b.col);
            continue;
          }
          const lit = night ? cell.lit : false;
          R(ctx, x + 3, y + 3, 10, 11, '#303030');
          R(ctx, x + 4, y + 4, 8, 9, lit ? '#f0e090' : '#5080b0');
          R(ctx, x + 4, y + 4, 3, 3, lit ? '#fff8c0' : '#90b8e0');
          if (cell.occ) drawOcc(ctx, cell.occ, x + 8, y + 13, cell);
          R(ctx, x + 4, y + 8, 8, 1, '#303030');
          if (cell.hp === 1) { R(ctx, x + 5, y + 5, 1, 3, '#000'); R(ctx, x + 6, y + 8, 1, 2, '#000'); R(ctx, x + 9, y + 9, 2, 1, '#000'); R(ctx, x + 2, y + 1, 1, 3, b.dark); }
        }
        if (b.sign && !b.collapsing) { R(ctx, b.x + b.w / 2 - 16, top - 12, 32, 9, '#202020'); text(ctx, b.sign, b.x + b.w / 2, top - 11, (frame >> 4) & 1 ? '#ff4040' : '#ff8080', 1, 'center'); }
      }
      function drawOcc(ctx, o, x, y, cell) {
        switch (o) {
          case 'person': { const w = (frame >> 4) & 1; R(ctx, x - 2, y - 8, 4, 4, '#f0b080'); R(ctx, x - 3, y - 4, 6, 4, '#e02040'); R(ctx, x - 3 - w, y - 7, 1, 3, '#f0b080'); R(ctx, x + 2 + w, y - 7, 1, 3, '#f0b080'); R(ctx, x - 2, y - 9, 4, 1, '#402010'); break; }
          case 'soldier': R(ctx, x - 2, y - 8, 4, 4, '#f0b080'); R(ctx, x - 3, y - 9, 6, 2, '#305020'); R(ctx, x - 3, y - 4, 6, 4, '#406030'); R(ctx, x + 1, y - 5, 5, 1, '#202020'); break;
          case 'food': R(ctx, x - 4, y - 3, 8, 2, '#e0e0e0'); R(ctx, x - 3, y - 7, 6, 4, '#b06020'); R(ctx, x + 2, y - 8, 2, 2, '#f0f0e0'); break;
          case 'milk': R(ctx, x - 2, y - 8, 4, 7, '#f0f0f0'); R(ctx, x - 2, y - 9, 4, 1, '#2040c0'); break;
          case 'money': R(ctx, x - 3, y - 7, 6, 6, '#30a030'); text(ctx, '$', x - 2, y - 7, '#f0f0a0'); break;
          case 'tv': R(ctx, x - 4, y - 8, 8, 7, '#404040'); R(ctx, x - 3, y - 7, 5, 5, (frame >> 2) & 1 ? '#a0c0ff' : '#e0e0ff'); break;
          case 'plant': R(ctx, x - 2, y - 3, 4, 3, '#a05020'); R(ctx, x - 3, y - 8, 6, 5, '#30a030'); break;
          case 'lamp': R(ctx, x - 3, y - 9, 6, 4, '#f0e040'); R(ctx, x, y - 5, 1, 4, '#808080'); if ((frame >> 2) & 1) R(ctx, x - 4, y - 10, 8, 1, '#ffffff'); break;
          case 'tnt': R(ctx, x - 3, y - 7, 6, 6, '#d02020'); R(ctx, x - 1, y - 9, 1, 2, '#808080'); if (frame & 2) R(ctx, x - 1, y - 10, 1, 1, '#ffd040'); break;
        }
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        switch (e.type) {
          case 'soldier': {
            const w = Math.abs(e.x - e.tx) > 1 ? (e.t >> 3) & 1 : 0, f = e.face || (e.vx > 0 ? 1 : -1);
            R(ctx, x - 2, y - 14, 4, 3, '#f0b080'); R(ctx, x - 3, y - 15, 6, 2, '#305020');
            R(ctx, x - 3, y - 11, 6, 6, '#406030'); R(ctx, x - 3, y - 5, 2, 5 - w, '#305020'); R(ctx, x + 1, y - 5, 2, 4 + w, '#305020');
            R(ctx, f > 0 ? x + 1 : x - 7, y - 10, 6, 1, '#202020'); R(ctx, f > 0 ? x + 1 : x - 3, y - 11, 2, 3, '#406030');
            break;
          }
          case 'heli': {
            const f = e.face || 1, r = (dx, dy, w, h, c) => R(ctx, f > 0 ? x + dx : x - dx - w, y + dy, w, h, c);
            r(-8, -5, 16, 9, '#506850'); r(2, -4, 6, 5, '#a0d0f0'); r(-20, -3, 13, 3, '#506850'); r(-22, -6, 2, 6, '#506850');
            r(-8, 4, 16, 1, '#303030'); r(-6, 3, 1, 2, '#303030'); r(4, 3, 1, 2, '#303030');
            const s = (frame >> 1) & 1; r(s ? -14 : -4, -8, s ? 28 : 8, 1, '#202020'); r(-1, -7, 2, 2, '#202020');
            break;
          }
          case 'tank': {
            const f = e.face || 1, r = (dx, dy, w, h, c) => R(ctx, f > 0 ? x + dx : x - dx - w, y + dy, w, h, c);
            r(-12, -6, 24, 6, '#303828'); for (let k = 0; k < 5; k++) r(-11 + k * 5, -5, 3, 3, '#606850');
            r(-10, -11, 20, 5, '#4a5a38'); r(-5, -15, 10, 4, '#4a5a38'); r(4, -14, 12, 2, '#3a4a2a');
            break;
          }
          case 'car': {
            const f = e.vx > 0 ? 1 : -1, r = (dx, dy, w, h, c) => R(ctx, f > 0 ? x + dx : x - dx - w, y + dy, w, h, c);
            r(-10, -7, 20, 5, e.police ? '#202020' : e.col); r(-5, -11, 10, 4, e.police ? '#f0f0f0' : e.col); r(-4, -10, 3, 3, '#a0d0f0'); r(1, -10, 3, 3, '#a0d0f0');
            r(-8, -3, 4, 3, '#101010'); r(4, -3, 4, 3, '#101010'); r(9, -6, 1, 2, '#ffff80');
            if (e.police) { r(-1, -13, 2, 2, (frame >> 3) & 1 ? '#ff2020' : '#2040ff'); }
            break;
          }
        }
      }
      function drawScene(ctx) {
        // sky
        const sk = g.sky;
        R(ctx, 0, 0, W, H, sk[0]);
        for (let i = 0; i < 6; i++) R(ctx, 0, 110 + i * 16, W, 16, i % 2 ? sk[1] : sk[0]);
        R(ctx, 0, 150, W, 70, sk[1]);
        // skyline silhouette
        for (let i = 0; i < 14; i++) { const h = 30 + ((i * 53 + g.day * 17) % 50); R(ctx, i * 19 - 4, GY - h, 18, h, (g.day - 1) % 4 >= 2 ? '#101830' : '#7090b0'); }
        for (const b of g.bs) drawBuilding(ctx, b);
        // street
        R(ctx, 0, GY, W, 6, '#a0a0a0'); R(ctx, 0, GY + 6, W, H - GY - 6, '#404048');
        for (let x = 0; x < W; x += 32) R(ctx, x + 6, GY + 16, 14, 2, '#e0d040');
        for (const d of g.debris) {
          if (d.wreck) { R(ctx, d.x - 9, d.y - 4, 18, 4, '#303030'); R(ctx, d.x - 6, d.y - 6, 10, 2, d.col); continue; }
          if (d.big) { R(ctx, d.x - 6, d.y - 3, 12, 6, '#404040'); if (frame & 2) R(ctx, d.x - 2, d.y - 6, 4, 3, '#ff8020'); continue; }
          R(ctx, d.x, d.y, d.dust ? 3 : 2, d.dust ? 3 : 2, d.col);
        }
        for (const e of g.ens) if (e.type !== 'heli') drawEnemy(ctx, e);
        // monster
        const m = g.m;
        if (m.st === 'dead') drawHuman(ctx, m.x, m.y, -1, m.deadT);
        else if (m.st !== 'gone' && !(m.inv > 20 && (frame & 4))) {
          let pose = 'stand';
          if (m.st === 'drop') pose = 'jump';
          else if (m.eatT > 0) pose = 'eat';
          else if (m.shockT > 0) pose = 'shock';
          else if (m.punchT > 4) pose = m.st === 'roof' && api.key('ArrowDown') ? 'punchdown' : 'punch';
          else if (m.st === 'climb') pose = 'climb';
          else if (m.st === 'fall') pose = 'fall';
          else if ((m.st === 'walk' || m.st === 'roof') && (api.key('ArrowLeft') || api.key('ArrowRight'))) pose = 'walk';
          const t = m.st === 'climb' ? Math.floor(m.y / 2) : m.anim;
          drawMonster(ctx, g.mon, m.x, m.y, pose, m.face, t, m.hurtT > 0 && (frame & 2));
          if (m.shockT > 0 && (frame & 2)) for (let k = 0; k < 6; k++) R(ctx, m.x - 14 + k * 5, m.y - 40 + ((k * 7 + frame) % 30), 2, 2, '#ffff80');
        }
        for (const e of g.ens) if (e.type === 'heli') drawEnemy(ctx, e);
        for (const s of g.shots) R(ctx, s.x - 1, s.y - 1, s.big ? 4 : 2, s.big ? 4 : 2, s.big ? '#ff8020' : '#ffff60');
        for (const f of g.fx) {
          const r = f.t * 0.8;
          for (let k = 0; k < 10; k++) { const a = k * 0.628; R(ctx, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 3, 3, f.t < 8 ? '#ffffa0' : f.t < 16 ? '#ff8020' : '#606060'); }
        }
        for (const q of g.pops) text(ctx, q.s, q.x, q.y, '#ffffff', 1, 'center');
      }
      function drawHud(ctx) {
        R(ctx, 0, 0, W, 20, '#000');
        text(ctx, g.mon.name, 4, 2, g.mon.belly, 1);
        text(ctx, String(g.score), 4, 11, '#ffffff', 1);
        R(ctx, 64, 3, 82, 6, '#404040'); R(ctx, 65, 4, Math.max(0, g.m.health) * 0.8, 4, g.m.health < 25 ? ((frame >> 3) & 1 ? '#ff2020' : '#ffff00') : '#20d020');
        text(ctx, 'DAMAGE', 64, 11, '#a0a0a0', 1);
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) { R(ctx, 108 + i * 8, 12, 6, 6, g.mon.body); R(ctx, 110 + i * 8, 13, 3, 2, g.mon.face); }
        text(ctx, 'DAY ' + g.day, W - 4, 2, '#f0d020', 1, 'right');
        text(ctx, 'HI ' + Math.max(hi, g.score), W - 4, 11, '#a0a0a0', 1, 'right');
      }
      function drawTitle(ctx) {
        R(ctx, 0, 0, W, H, '#101018');
        for (let i = 0; i < 14; i++) { const h = 40 + ((i * 53) % 60); R(ctx, i * 19 - 4, 200 - h, 18, h, '#1a2038'); for (let y = 200 - h + 4; y < 196; y += 8) for (let x = 0; x < 3; x++) if (((i * 7 + y + x * 3) % 5) === 0) R(ctx, i * 19 - 1 + x * 5, y, 2, 3, '#f0e090'); }
        R(ctx, 0, 200, W, 40, '#303038');
        const t = 'RAMPAGE';
        for (let i = 0; i < t.length; i++) {
          const sh = (titleT % 120 < 10) ? ((titleT + i) & 1) * 2 - 1 : 0;
          text(ctx, t[i], 26 + i * 30 + 3, 24 + 3, '#600000', 5);
          text(ctx, t[i], 26 + i * 30 + sh, 24, '#f0d020', 5);
          text(ctx, t[i], 26 + i * 30 + sh, 24, i % 2 ? '#f0d020' : '#ff8020', 5);
        }
        const page = (titleT / 420 | 0) % 2;
        MONS.forEach((mon, i) => {
          const x = 52 + i * 76, pose = ((frame >> 5) + i) % 3 === 0 ? 'punch' : 'stand';
          drawMonster(ctx, mon, x, 198, pose, i === 2 ? -1 : 1, frame, false);
          text(ctx, mon.name, x, 204, mon.belly, 1, 'center');
        });
        if (page === 0) {
          text(ctx, 'THREE MONSTERS ON THE LOOSE', W / 2, 74, '#ffffff', 1, 'center');
          text(ctx, 'PUNCH BUILDINGS UNTIL THEY FALL', W / 2, 86, '#c0c0c0', 1, 'center');
          text(ctx, 'EAT PEOPLE FOR HEALTH', W / 2, 98, '#c0c0c0', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2, 74, '#ffffff', 1, 'center');
          text(ctx, String(hi), W / 2, 86, '#f0d020', 2, 'center');
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 122, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 122, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 122, blink ? '#ffffff' : '#888888', 1, 'center');
        text(ctx, credStr(), 4, 230, '#888888', 1);
        text(ctx, '\u00a9 1986 BALLY MIDWAY', W - 4, 230, '#888888', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        if (mode === 'select') {
          R(ctx, 0, 0, W, H, '#101018');
          text(ctx, 'CHOOSE YOUR MONSTER', W / 2, 30, '#f0d020', 1, 'center');
          MONS.forEach((mon, i) => {
            const x = 52 + i * 76;
            if (i === sel) { R(ctx, x - 30, 70, 60, 90, '#303050'); }
            drawMonster(ctx, mon, x, 140, i === sel && (frame & 16) ? 'punch' : 'stand', 1, frame, false);
            text(ctx, mon.name, x, 148, i === sel ? mon.belly : '#606060', 1, 'center');
          });
          text(ctx, 'LEFT/RIGHT  THEN SPACE', W / 2, 190, '#ffffff', 1, 'center');
          return;
        }
        drawScene(ctx);
        drawHud(ctx);
        if (g.phase === 'intro') {
          R(ctx, 16, 60, W - 32, 40, 'rgba(0,0,0,.7)');
          text(ctx, 'DAY ' + g.day, W / 2, 66, '#f0d020', 2, 'center');
          text(ctx, g.city, W / 2, 86, '#ffffff', 1, 'center');
        }
        if (g.phase === 'clear') {
          R(ctx, 16, 60, W - 32, 50, 'rgba(0,0,0,.7)');
          text(ctx, 'CITY DESTROYED!', W / 2, 66, '#f0d020', 2, 'center');
          text(ctx, 'DAY ' + g.day + ' BONUS ' + g.bonus, W / 2, 88, '#ffffff', 1, 'center');
          text(ctx, 'DAMAGE TODAY ' + g.dayDmg, W / 2, 98, '#c0c0c0', 1, 'center');
        }
        if (mode === 'over') {
          R(ctx, 40, 80, 176, 50, 'rgba(0,0,0,.75)');
          text(ctx, 'GAME OVER', W / 2, 90, '#ff4040', 2, 'center');
          text(ctx, 'SCORE ' + g.score, W / 2, 112, '#ffffff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
