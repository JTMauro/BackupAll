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
  function mkSpr(rows, pal) { return { rows: rows, pal: pal, w: rows[0].length, h: rows.length, cv: null, cvf: null }; }
  function bakeSpr(s, flip) {
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    for (let y = 0; y < s.h; y++) {
      const row = s.rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = s.pal[row[x]]; if (!col) continue;
        g.fillStyle = col; g.fillRect(flip ? s.w - 1 - x : x, y, 1, 1);
      }
    }
    return c;
  }
  function drawSpr(ctx, s, x, y, flip) {
    let c = flip ? s.cvf : s.cv;
    if (!c) { c = bakeSpr(s, flip); if (flip) s.cvf = c; else s.cv = c; }
    ctx.drawImage(c, Math.round(x), Math.round(y));
  }
  function hit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function pad2(n, k) { return String(n).padStart(k || 2, '0'); }

  // ======================================================================
  // Wacko (Bally Midway, 1983) -- from-scratch recreation.
  // Kapt'n Krooz'r's saucer is surrounded by mixed-up monsters. Shoot a
  // monster to swap its head; once a monster is whole, blast it and then
  // its twin. Shoot a whole monster that is not the twin and two more appear.
  // ======================================================================
  const W = 256, H = 240, TOP = 16;
  const AX0 = 6, AY0 = TOP + 6, AX1 = W - 6, AY1 = H - 12;
  const SPEC = [
    { name: 'GLOOP', col: '#40e040', dark: '#107010' },
    { name: 'HORNIX', col: '#ff8a20', dark: '#904000' },
    { name: 'OGLE', col: '#c060ff', dark: '#502080' },
    { name: 'BEAKER', col: '#40d0ff', dark: '#105080' }
  ];
  const HPAL = s => ({ c: SPEC[s].col, d: SPEC[s].dark, w: '#ffffff', k: '#000000', r: '#ff2020', y: '#ffe040' });
  const HEADS = [
    ['..cc....cc..', '.cwwc..cwwc.', '.cwkc..cwkc.', 'cccccccccccc', 'cccccccccccc', 'crrrrrrrrrrc', '.cccccccccc.', '...dddddd...'],
    ['y..........y', 'yy.cccccc.yy', '.ycccccccccy', '.ccwkccwkcc.', '.cccccccccc.', '.ccwcwcwccc.', '..cccccccc..', '...dddddd...'],
    ['.....yy.....', '.....d......', '...cccccc...', '..ccwwwwcc..', '.ccwwkkwwcc.', '.cccwwwwccc.', '..cccccccc..', '...dddddd...'],
    ['...cccccc...', '..cccccccc..', '.ccwkcccwkc.', '.cccccccccc.', '..ccyyyyccc.', '...yyyyyy...', '....yyyy....', '...dddddd...']
  ];
  const BODIES = [
    [['..dccccccd..', '.cccccccccc.', 'cc.cccccc.cc', 'c..cccccc..c', '...cc..cc...', '..cc....cc..', '.cc......cc.', 'cc........cc'],
      ['..dccccccd..', '.cccccccccc.', 'cc.cccccc.cc', 'c..cccccc..c', '...cc..cc...', '...cc..cc...', '..cc....cc..', '.ccc....ccc.']],
    [['..dccccccd..', 'yccccccccccy', 'y.cccccccc.y', '..cdcdcdcd..', '..cccccccc..', '...cc..cc...', '...cc..cc...', '..yyy..yyy..'],
      ['..dccccccd..', '.ccccccccccy', 'yycccccccc.y', '..cdcdcdcd..', '..cccccccc..', '..cc....cc..', '.cc......cc.', 'yyy......yyy']],
    [['..dccccccd..', '.cccccccccc.', '.cccccccccc.', '..cccccccc..', '.c.c.cc.c.c.', 'c..c.c..c..c', '.c..c.c..c..', 'c..c...c..c.'],
      ['..dccccccd..', '.cccccccccc.', '.cccccccccc.', '..cccccccc..', '.c.c.cc.c.c.', '.c.c.c.c.c.c', 'c..c..c..c..', '.c..c...c..c']],
    [['..dccccccd..', 'cccwcccwcccc', '.cccwcccwcc.', '..cccccccc..', '....y..y....', '....y..y....', '....y..y....', '...yy..yy...'],
      ['..dccccccd..', '.cccwcccwccc', 'cccwcccwccc.', '..cccccccc..', '....y..y....', '...y....y...', '..y......y..', '.yy......yy.']]
  ];
  const HSPR = HEADS.map((rows, s) => mkSpr(rows, HPAL(s)));
  const BSPR = BODIES.map((fr, s) => fr.map(rows => mkSpr(rows, HPAL(s))));
  const SAUCER = mkSpr([
    '.....wwwww.....',
    '....wbbbbbw....',
    '...wbbwbbbbw...',
    '.ggggggggggggg.',
    'grrgggrrrgggrrg',
    '.ggggggggggggg.',
    '...yy.....yy...'
  ], { w: '#ffffff', b: '#60c0ff', g: '#c0c0c0', r: '#ff3030', y: '#ffe040' });
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

  ArcadeRegistry.register({
    id: 'wackowacko', title: 'Wacko', year: 1983, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 WASD: aim+fire \u00b7 Space: fire \u00b7 hold X+Arrows: aim only \u00b7 Enter: start',
    marquee: { bg: '#100020', fg: '#40ff40', accent: '#ff40ff' },
    create(api) {
      const au = api.audio;
      let mode = 'attract', attractT = 0, coinFlash = 0, overT = 0;
      let hi = api.getHiScore(25000);
      let score = 0, lives = 3, level = 1, nextExtra = 20000;
      let pl, mons, shots, spits, parts, pops, pending, phase, phaseT, timer, angry, fireCD;
      const stars = [];
      for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: TOP + Math.random() * (H - TOP), c: ['#446', '#668', '#88a', '#fff'][i & 3], t: Math.random() * 100 });
      let demo = [];

      const sfx = {
        shot() { au.tone(1400, 0.06, { type: 'square', vol: 0.06, slideTo: 500 }); },
        swap() { au.tone(500, 0.05, { type: 'square', vol: 0.1 }); au.tone(750, 0.06, { type: 'square', vol: 0.1, delay: 0.05 }); },
        kill() { au.noise(0.25, { vol: 0.18, freq: 2500, slideTo: 200 }); au.tone(900, 0.2, { type: 'square', vol: 0.08, slideTo: 1800 }); },
        pair() { au.melody([[784, .06], [988, .06], [1175, .06], [1568, .18]], { type: 'square', vol: 0.12 }); },
        wrong() { au.tone(150, 0.35, { type: 'sawtooth', vol: 0.14, slideTo: 70 }); },
        die() { au.noise(0.8, { vol: 0.22, freq: 1500, slideTo: 60 }); au.tone(600, 0.8, { type: 'square', vol: 0.1, slideTo: 60 }); },
        start() { au.melody([[392, .1], [523, .1], [392, .1], [659, .1], [523, .1], [784, .25]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, .08], [659, .08], [784, .08], [659, .08], [784, .08], [1047, .3]], { type: 'square', vol: 0.12 }); },
        extra() { au.melody([[1047, .06], [1319, .06], [1047, .06], [1319, .06]], { type: 'square', vol: 0.12 }); },
        step() { au.tone(70 + (angry ? 30 : 0), 0.05, { type: 'triangle', vol: 0.1 }); }
      };

      function addScore(n, x, y) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += 50000; sfx.extra(); }
        if (score > hi) hi = score;
        if (x != null) pops.push({ x: x, y: y, s: String(n), t: 50 });
      }
      function burst(x, y, col, n) {
        for (let i = 0; i < (n || 12); i++) {
          const a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * 2;
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + Math.random() * 20, c: col });
        }
      }
      function edgePos() {
        const side = Math.random() * 4 | 0;
        if (side === 0) return [AX0 + 4 + Math.random() * (AX1 - AX0 - 20), AY0 + 2];
        if (side === 1) return [AX0 + 4 + Math.random() * (AX1 - AX0 - 20), AY1 - 18];
        if (side === 2) return [AX0 + 2, AY0 + Math.random() * (AY1 - AY0 - 20)];
        return [AX1 - 14, AY0 + Math.random() * (AY1 - AY0 - 20)];
      }
      function makeMon(body, matched) {
        const [x, y] = edgePos();
        let head = body;
        if (!matched) head = (body + 1 + (Math.random() * 3 | 0)) % 4;
        return { x: x, y: y, body: body, head: head, vx: 0, vy: 0, t: Math.random() * 60 | 0, a: 0, flash: 0, spitT: 120 + Math.random() * 200, born: 30 };
      }
      function speedOf() { return (0.25 + Math.min(0.4, level * 0.04)) * (angry ? 1.8 : 1); }
      function startLevel() {
        mons = []; shots = []; spits = []; pending = -1; angry = false;
        const pairs = Math.min(7, 2 + level);
        const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        for (let i = 0; i < pairs; i++) {
          const s = order[i % 4];
          mons.push(makeMon(s, Math.random() < 0.25), makeMon(s, false));
        }
        timer = Math.max(45, 90 - level * 5) * 60;
        phase = 'intro'; phaseT = 0;
        pl.x = W / 2 - 7; pl.y = (AY0 + AY1) / 2 - 3;
        sfx.start();
      }
      function startGame() {
        mode = 'play'; score = 0; lives = 3; level = 1; nextExtra = 20000;
        pl = { x: W / 2 - 7, y: 120, aim: 6, dead: 0 };
        parts = []; pops = []; fireCD = 0;
        startLevel();
      }
      function gameOver() {
        api.setHiScore(score); mode = 'over'; overT = 0;
        au.melody([[330, .2], [311, .2], [294, .2], [262, .5]], { type: 'square', vol: 0.12 });
      }
      function tryStart() {
        if (api.useCredit()) startGame();
        else { coinFlash = 90; au.tone(80, 0.25, { type: 'square', vol: 0.2 }); }
      }
      function killPlayer() {
        if (phase !== 'play') return;
        phase = 'dead'; phaseT = 0; sfx.die();
        burst(pl.x + 7, pl.y + 3, '#ffffff', 20); burst(pl.x + 7, pl.y + 3, '#ff4040', 20);
      }
      function afterDeath() {
        lives--;
        const resume = () => {
          phase = 'intro'; phaseT = 30; shots = []; spits = [];
          pl.x = W / 2 - 7; pl.y = (AY0 + AY1) / 2 - 3;
          for (const m of mons) {
            const dx = m.x + 6 - (pl.x + 7), dy = m.y + 8 - (pl.y + 3), d = Math.hypot(dx, dy) || 1;
            if (d < 70) { m.x += dx / d * (70 - d); m.y += dy / d * (70 - d); }
            m.x = Math.max(AX0, Math.min(AX1 - 12, m.x)); m.y = Math.max(AY0, Math.min(AY1 - 16, m.y));
          }
        };
        if (lives <= 0) {
          lives = 0;
          if (api.offerContinue) api.offerContinue(() => { lives = 3; resume(); }, gameOver); else gameOver();
        } else resume();
      }
      function fire(dir) {
        if (fireCD > 0 || shots.length >= 4) return;
        fireCD = 7;
        const [dx, dy] = DIRS[dir], k = dx && dy ? 0.7071 : 1;
        shots.push({ x: pl.x + 7, y: pl.y + 3, vx: dx * k * 4.2, vy: dy * k * 4.2, t: 55 });
        sfx.shot();
      }
      function dirFrom(L, R, U, D) {
        const dx = (R ? 1 : 0) - (L ? 1 : 0), dy = (D ? 1 : 0) - (U ? 1 : 0);
        if (!dx && !dy) return -1;
        for (let i = 0; i < 8; i++) if (DIRS[i][0] === dx && DIRS[i][1] === dy) return i;
        return -1;
      }
      function shootMon(m, i) {
        const cx = m.x + 6, cy = m.y + 8;
        if (m.head !== m.body) {
          m.head = (m.head + 1) % 4; m.flash = 10; sfx.swap(); addScore(10);
          burst(cx, m.y + 3, SPEC[m.head].col, 5);
          return;
        }
        if (pending < 0 || pending === m.body) {
          mons.splice(i, 1); sfx.kill(); burst(cx, cy, SPEC[m.body].col, 18);
          if (pending < 0) {
            // only start a pair if the twin still exists
            if (mons.some(o => o.body === m.body)) pending = m.body;
            addScore(200 * Math.min(level, 5), cx, cy);
          } else {
            pending = -1; sfx.pair(); addScore(500 * Math.min(level, 5), cx, cy);
          }
          return;
        }
        // wrong monster: it scrambles and a new pair bursts out
        m.head = (m.body + 1 + (Math.random() * 3 | 0)) % 4; m.flash = 20; sfx.wrong();
        pops.push({ x: cx, y: cy, s: 'WRONG!', t: 60 });
        if (mons.length < 16) {
          const s = Math.random() * 4 | 0;
          const a = makeMon(s, false), b = makeMon(s, false);
          a.x = b.x = m.x; a.y = b.y = m.y; a.vx = -1; b.vx = 1;
          mons.push(a, b);
        }
      }

      function updateMons(chase) {
        const sp = speedOf();
        for (const m of mons) {
          m.a++; if (m.flash) m.flash--; if (m.born) m.born--;
          if (--m.t <= 0) {
            m.t = 40 + Math.random() * 60 | 0;
            let tx = m.x + 6 + (Math.random() - 0.5) * 80, ty = m.y + 8 + (Math.random() - 0.5) * 80;
            if (chase) { tx = pl.x + 7; ty = pl.y + 3; }
            const dx = tx - (m.x + 6), dy = ty - (m.y + 8), d = Math.hypot(dx, dy) || 1;
            const wob = chase ? (Math.random() < 0.65 ? 0 : 1) : 1;
            const a = Math.atan2(dy, dx) + (wob ? (Math.random() - 0.5) * 3.2 : (Math.random() - 0.5) * 0.6);
            m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
            if (d < 8) { m.vx = -m.vx; m.vy = -m.vy; }
          }
          m.x += m.vx; m.y += m.vy;
          if (m.x < AX0) { m.x = AX0; m.vx = Math.abs(m.vx); } if (m.x > AX1 - 12) { m.x = AX1 - 12; m.vx = -Math.abs(m.vx); }
          if (m.y < AY0) { m.y = AY0; m.vy = Math.abs(m.vy); } if (m.y > AY1 - 16) { m.y = AY1 - 16; m.vy = -Math.abs(m.vy); }
        }
        // keep them from piling up on each other
        for (let i = 0; i < mons.length; i++) for (let j = i + 1; j < mons.length; j++) {
          const a = mons[i], b = mons[j], dx = b.x - a.x, dy = b.y - a.y;
          if (Math.abs(dx) < 12 && Math.abs(dy) < 15) { const s = dx >= 0 ? 0.4 : -0.4; a.x -= s; b.x += s; }
        }
      }

      function update() {
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        for (const s of stars) s.t++;
        if (mode === 'attract') {
          attractT++;
          if (attractT === 1 || demo.length === 0) {
            demo = [];
            for (let i = 0; i < 6; i++) { const s = i % 4; const m = { x: 20 + i * 36, y: 150, body: s, head: (s + i) % 4, vx: 0, vy: 0, t: 0, a: 0, flash: 0, born: 0 }; demo.push(m); }
          }
          for (const m of demo) {
            m.a++;
            if (--m.t <= 0) { m.t = 50; const a = Math.random() * Math.PI * 2; m.vx = Math.cos(a) * 0.3; m.vy = Math.sin(a) * 0.3; }
            m.x = Math.max(10, Math.min(W - 22, m.x + m.vx)); m.y = Math.max(140, Math.min(176, m.y + m.vy));
            if (attractT % 90 === 0 && Math.random() < 0.3) m.head = (m.head + 1) % 4;
          }
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (mode === 'over') {
          overT++;
          if (overT > 300 || (overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; attractT = 0; }
          return;
        }
        phaseT++;
        for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vx *= 0.97; q.vy *= 0.97; q.t--; }
        parts = parts.filter(q => q.t > 0);
        for (const q of pops) { q.y -= 0.3; q.t--; }
        pops = pops.filter(q => q.t > 0);

        if (phase === 'intro') {
          updateMons(false);
          if (phaseT > 100) { phase = 'play'; phaseT = 0; }
          return;
        }
        if (phase === 'dead') {
          if (phaseT === 110) afterDeath();
          return;
        }
        if (phase === 'clear') {
          if (phaseT % 4 === 0 && timer > 0) { const s = Math.min(timer, 60); timer -= s; addScore(10); au.tone(1200, 0.02, { type: 'square', vol: 0.05 }); }
          if (phaseT > 120 && timer <= 0) { level++; startLevel(); }
          return;
        }
        // ---- play ----
        if (fireCD > 0) fireCD--;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const mdir = dirFrom(L, R, U, D);
        const adir = dirFrom(api.key('KeyA'), api.key('KeyD'), api.key('KeyW'), api.key('KeyS'));
        const lock = api.key('KeyX') || api.key('KeyZ') || api.key('ShiftLeft');
        if (lock) { if (mdir >= 0) pl.aim = mdir; }
        else if (mdir >= 0) {
          const [dx, dy] = DIRS[mdir], k = dx && dy ? 0.7071 : 1;
          pl.x = Math.max(AX0, Math.min(AX1 - 15, pl.x + dx * k * 1.6));
          pl.y = Math.max(AY0, Math.min(AY1 - 7, pl.y + dy * k * 1.6));
          if (adir < 0) pl.aim = mdir;
        }
        if (adir >= 0) { pl.aim = adir; fire(adir); }
        if (api.key('Space')) fire(pl.aim);

        timer--;
        if (timer <= 0 && !angry) { angry = true; timer = 0; au.tone(200, 0.5, { type: 'sawtooth', vol: 0.12, slideTo: 800 }); for (const m of mons) m.t = 0; }
        if (timer < 0) timer = 0;
        if (api.frame % (angry ? 10 : 18) === 0) sfx.step();
        updateMons(true);

        // monster spit (from level 3)
        if (level >= 3) for (const m of mons) {
          if (m.born) continue;
          if (--m.spitT <= 0) {
            m.spitT = Math.max(90, 260 - level * 15) + Math.random() * 120;
            const dx = pl.x + 7 - (m.x + 6), dy = pl.y + 3 - (m.y + 4), d = Math.hypot(dx, dy) || 1;
            if (d < 160) spits.push({ x: m.x + 6, y: m.y + 4, vx: dx / d * 1.3, vy: dy / d * 1.3, t: 160, c: SPEC[m.head].col });
          }
        }
        for (const s of spits) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (Math.abs(s.x - (pl.x + 7)) < 6 && Math.abs(s.y - (pl.y + 3)) < 4) killPlayer();
        }
        spits = spits.filter(s => s.t > 0 && s.x > AX0 && s.x < AX1 && s.y > AY0 && s.y < AY1);

        for (const s of shots) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (s.x < AX0 || s.x > AX1 || s.y < AY0 || s.y > AY1) s.t = 0;
          if (s.t <= 0) continue;
          for (let i = mons.length - 1; i >= 0; i--) {
            const m = mons[i];
            if (s.x > m.x - 1 && s.x < m.x + 13 && s.y > m.y - 1 && s.y < m.y + 17) { s.t = 0; shootMon(m, i); break; }
          }
          for (const p of spits) if (Math.abs(p.x - s.x) < 4 && Math.abs(p.y - s.y) < 4) { p.t = 0; s.t = 0; addScore(50); }
        }
        shots = shots.filter(s => s.t > 0);
        // a pending species with no twin left (should not happen) is released
        if (pending >= 0 && !mons.some(o => o.body === pending)) pending = -1;

        for (const m of mons) {
          if (m.born) continue;
          if (hit(pl.x + 1, pl.y + 1, 13, 5, m.x + 1, m.y + 1, 10, 14)) { killPlayer(); break; }
        }
        if (mons.length === 0) { phase = 'clear'; phaseT = 0; shots = []; spits = []; sfx.clear(); addScore(1000 * Math.min(level, 10)); }
      }

      // ---------------- drawing ----------------
      function drawMon(ctx, m) {
        const fr = (m.a >> 3) & 1;
        const x = Math.round(m.x), y = Math.round(m.y);
        if (m.born && (m.born >> 1) & 1) return;
        drawSpr(ctx, BSPR[m.body][fr], x, y + 8, m.vx < 0);
        const bob = fr ? 1 : 0;
        if (m.flash && (m.flash >> 1) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + bob, 12, 8); }
        else drawSpr(ctx, HSPR[m.head], x, y + bob, m.vx < 0);
        if (angry && m.head === m.body && (api.frame >> 3) & 1) { ctx.fillStyle = '#ff2020'; ctx.fillRect(x + 5, y - 3, 2, 2); }
        if (m.head === m.body && mode === 'play' && pending === m.body && (api.frame >> 2) & 1) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, y - 1.5, 17, 20);
        }
      }
      function drawArena(ctx) {
        ctx.fillStyle = '#08001a'; ctx.fillRect(0, TOP, W, H - TOP);
        for (const s of stars) { if (((s.t >> 5) & 3) === 0) continue; ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        ctx.fillStyle = angry && (api.frame >> 3) & 1 ? '#ff2040' : '#30a030';
        ctx.fillRect(AX0 - 3, AY0 - 3, AX1 - AX0 + 6, 2); ctx.fillRect(AX0 - 3, AY1 + 1, AX1 - AX0 + 6, 2);
        ctx.fillRect(AX0 - 3, AY0 - 3, 2, AY1 - AY0 + 6); ctx.fillRect(AX1 + 1, AY0 - 3, 2, AY1 - AY0 + 6);
        // swampy floor tufts
        ctx.fillStyle = '#183018';
        for (let i = 0; i < 24; i++) { const x = (i * 53) % (AX1 - AX0) + AX0, y = (i * 97) % (AY1 - AY0) + AY0; ctx.fillRect(x, y, 3, 1); ctx.fillRect(x + 1, y - 1, 1, 1); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        text(ctx, 'SCORE', 4, 1, '#ff40ff'); text(ctx, String(score), 4, 8, '#ffffff');
        text(ctx, 'HI', W / 2, 1, '#ff40ff', 1, 'center'); text(ctx, String(hi), W / 2, 8, '#ffffff', 1, 'center');
        for (let i = 0; i < Math.min(4, lives - 1); i++) drawSpr(ctx, SAUCER, 172 + i * 17, 5, false);
        text(ctx, 'L' + level, W - 4, 8, '#40ff40', 1, 'right');
        // timer bar
        const tmax = Math.max(45, 90 - level * 5) * 60;
        ctx.fillStyle = '#202020'; ctx.fillRect(0, H - 8, W, 8);
        ctx.fillStyle = angry ? '#ff2040' : '#40ff40'; ctx.fillRect(60, H - 6, Math.round((W - 120) * (timer / tmax)), 4);
        text(ctx, angry ? 'WACKO!' : 'TIME', 4, H - 8, angry ? '#ff2040' : '#a0a0a0');
        if (pending >= 0) { text(ctx, 'TWIN', W - 46, H - 8, '#ffffff'); drawSpr(ctx, HSPR[pending], W - 16, H - 8, false); }
      }
      function drawAttract(ctx) {
        ctx.fillStyle = '#08001a'; ctx.fillRect(0, 0, W, H);
        for (const s of stars) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        const wob = Math.sin(api.frame * 0.1) * 2;
        text(ctx, 'WACKO', W / 2 + 2, 22 + wob + 2, '#602060', 5, 'center');
        text(ctx, 'WACKO', W / 2, 22 + wob, '#40ff40', 5, 'center');
        text(ctx, 'HI ' + hi, W / 2, 4, '#ff40ff', 1, 'center');
        drawSpr(ctx, SAUCER, W / 2 - 7, 68 + Math.round(Math.sin(api.frame * 0.05) * 3), false);
        text(ctx, "KAPT'N KROOZ'R", W / 2, 80, '#ffffff', 1, 'center');
        const lines = ['SHOOT A MONSTER TO SWAP ITS HEAD', 'WHOLE MONSTERS DIE IN PAIRS:', 'KILL ONE, THEN ITS TWIN', 'SHOOT THE WRONG ONE AND', 'TWO MORE APPEAR!'];
        lines.forEach((l, i) => text(ctx, l, W / 2, 94 + i * 9, i === 1 || i === 2 ? '#ffe040' : '#c0c0ff', 1, 'center'));
        for (const m of demo) drawMon(ctx, m);
        for (let s = 0; s < 4; s++) {
          drawSpr(ctx, HSPR[s], 24 + s * 58, 186, false); drawSpr(ctx, BSPR[s][0], 24 + s * 58, 194, false);
          text(ctx, SPEC[s].name, 30 + s * 58, 205, SPEC[s].col, 1, 'center');
        }
        const blink = (api.frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 216, '#ffffff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 216, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 216, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1983 BALLY MIDWAY', W / 2, 226, '#808080', 1, 'center');
        text(ctx, 'CREDIT ' + pad2(Math.min(99, api.credits)), 4, H - 8, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { drawAttract(ctx); return; }
        drawArena(ctx);
        for (const m of mons) drawMon(ctx, m);
        for (const s of spits) { ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3); }
        for (const s of shots) { ctx.fillStyle = '#ffff60'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2); }
        if (phase !== 'dead' && !(phase === 'intro' && (phaseT >> 2) & 1 && phaseT < 60)) {
          drawSpr(ctx, SAUCER, pl.x, pl.y, false);
          const [dx, dy] = DIRS[pl.aim];
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(pl.x + 7 + dx * 11), Math.round(pl.y + 3 + dy * 8), 2, 2);
        }
        for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(q.x | 0, q.y | 0, 2, 2); }
        for (const q of pops) text(ctx, q.s, q.x, q.y | 0, q.s === 'WRONG!' ? '#ff4040' : '#ffffff', 1, 'center');
        drawHUD(ctx);
        if (phase === 'intro' && phaseT < 90) {
          text(ctx, 'LEVEL ' + level, W / 2, 96, '#ffe040', 2, 'center');
          text(ctx, (mons.length / 2 | 0) + ' PAIRS', W / 2, 118, '#ffffff', 1, 'center');
        }
        if (phase === 'clear') { text(ctx, 'ALL CLEAR!', W / 2, 100, '#40ff40', 2, 'center'); text(ctx, 'TIME BONUS', W / 2, 122, '#ffffff', 1, 'center'); }
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(48, 96, W - 96, 36);
          text(ctx, 'GAME OVER', W / 2, 106, '#ff4040', 2, 'center');
        }
      }
      return { update, render };
    }
  });
})();
