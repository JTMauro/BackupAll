// Millipede (Atari, 1982) - from-scratch raster recreation for the Game Room.
// The Centipede sequel: an archer in a mushroom field against the millipede, spiders, earwigs, inchworms,
// bees, beetles, dragonflies and mosquitoes, with DDT bombs to set off.
(function () {
  'use strict';
  const W = 240, H = 256, CELL = 8, COLS = 30, ROWS = 32, PZ = 24, BOT = 31;

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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        ctx.fillStyle = typeof col === 'function' ? col(r, i) : col;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }

  // ---------- palettes (cycle every wave like the arcade) ----------
  const PALS = [
    { cap: '#ff8000', stem: '#00c000', head: '#ff2020', body: '#ffe000', legs: '#00c000', player: '#ffe000', poison: '#ff00ff' },
    { cap: '#ff40ff', stem: '#4080ff', head: '#ffffff', body: '#40ff40', legs: '#ff40ff', player: '#40ffff', poison: '#ffff00' },
    { cap: '#40c0ff', stem: '#ff4040', head: '#ffe000', body: '#ff40ff', legs: '#40c0ff', player: '#ff8080', poison: '#00ff00' },
    { cap: '#ffe000', stem: '#ff40ff', head: '#40ff40', body: '#40c0ff', legs: '#ffe000', player: '#ffffff', poison: '#ff4040' },
    { cap: '#ff4040', stem: '#ffe000', head: '#40ffff', body: '#ff8000', legs: '#ff4040', player: '#40ff40', poison: '#4040ff' },
    { cap: '#40ff40', stem: '#40c0ff', head: '#ff40ff', body: '#ffffff', legs: '#40ff40', player: '#ff40ff', poison: '#ff8000' }
  ];
  const ART = {
    mush3: ['..CCCC..', '.CCCCCC.', 'CCCCCCCC', 'CCcCCcCC', '.CCCCCC.', '...SS...', '...SS...', '..SSSS..'],
    mush2: ['..CCCC..', '.CCCCCC.', 'CCCCCCCC', 'CCcCCcCC', '.CCCCCC.', '...SS...', '........', '........'],
    mush1: ['..CCCC..', '.CCCCCC.', 'CCCCCCCC', '........', '........', '........', '........', '........'],
    flower: ['.C.C.C..', 'CcCcCcC.', '.CCcCC..', 'CcCcCcC.', '.C.S.C..', '...S....', '..SSS...', '...S....'],
    head0: ['.LLLLL..', 'LHHHHHL.', 'HWHHHWH.', 'HHHHHHHL', 'HHHHHHHL', 'HWHHHWH.', 'LHHHHHL.', '.LLLLL..'],
    head1: ['L.LLL.L.', '.HHHHH..', 'HWHHHWHL', 'HHHHHHH.', 'HHHHHHH.', 'HWHHHWHL', '.HHHHH..', 'L.LLL.L.'],
    body0: ['.L...L..', '..BBB...', '.BBBBB..', 'LBBBBBL.', 'LBBBBBL.', '.BBBBB..', '..BBB...', '.L...L..'],
    body1: ['L.....L.', '..BBB...', '.BBBBBL.', '.BBBBB..', '.BBBBB..', '.BBBBBL.', '..BBB...', 'L.....L.'],
    player: ['...P...', '..PPP..', '.PWPWP.', '.PPPPP.', 'PP.P.PP', '..PPP..', '.P...P.'],
    spider0: ['M.......M', '.M.WWW.M.', '..MWRWM..', 'MMWWWWWMM', '..MWWWM..', '.M.....M.', 'M.......M'],
    spider1: ['.M.....M.', 'M..WWW..M', '.MMWRWMM.', '..WWWWW..', 'MMMWWWMMM', 'M.......M', '.........'],
    earwig: ['O.......O', '.O.....O.', '..OOOOO..', 'YOOYOOYOO', '..OOOOO..', '.O.....O.', 'O.......O'],
    inch0: ['.........', '.........', '..GGGGGG.', 'GGGGGGGWG', '.........'],
    inch1: ['.........', '...GG....', '..G..GGG.', 'GG.....WG', '.........'],
    bee0: ['.WW.WW.', 'W..W..W', '.YKYKY.', 'YKYKYKY', '.YKYKY.', '...Y...', '...K...'],
    bee1: ['.......', '.WW.WW.', '.YKYKY.', 'YKYKYKY', '.YKYKY.', '...Y...', '...K...'],
    beetle0: ['..BBBBB..', '.BbBBBbB.', 'KBBBWBBBK', '.BbBBBbB.', 'K.BBBBB.K', '.K.....K.'],
    beetle1: ['..BBBBB..', '.BbBBBbB.', 'KBBBWBBBK', '.BbBBBbB.', '.KBBBBBK.', 'K.......K'],
    dragon0: ['WW.....WW', '.WW...WW.', '..WWGWW..', '....G....', '....G....', '....G....', '....R....'],
    dragon1: ['.........', 'WWWW.WWWW', '...WGW...', '....G....', '....G....', '....G....', '....R....'],
    mosq0: ['.W...W.', '..W.W..', 'W..R..W', '.WRRRW.', '...R...', '..R.R..', '.R...R.'],
    mosq1: ['W.....W', '.W...W.', '...R...', 'WWRRRWW', '...R...', '..R.R..', '.R...R.']
  };
  const FIX = { W: '#ffffff', R: '#ff2020', M: '#ff40ff', O: '#ff9020', Y: '#ffe000', G: '#40ff40', K: '#202020', B: '#4060ff', b: '#80a0ff' };
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, map, flip) {
    const h = rows.length, w = rows[0].length, c = canvas(w, h), x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][flip ? w - 1 - i : i]; if (ch === '.') continue;
      x.fillStyle = map[ch] || FIX[ch] || '#ffffff'; x.fillRect(i, j, 1, 1);
    }
    return { c, w, h };
  }

  ArcadeRegistry.register({
    id: 'millipede', title: 'Millipede', year: 1982, maker: 'Atari',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Mouse (trackball) or Arrows: move \u00b7 Click / Space: fire (hold for auto-fire) \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#ff8000', accent: '#40ff40' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;
      // per-palette sprite cache
      const cache = {};
      function sp(name, pi, flip) {
        const key = name + pi + (flip ? 'L' : '');
        if (!cache[key]) {
          const P = PALS[pi];
          const map = { C: P.cap, c: '#000000', S: P.stem, H: P.head, B: P.body, L: P.legs, P: P.player, W: '#ffffff' };
          if (name === 'pmush3' || name === 'pmush2' || name === 'pmush1') { map.C = P.poison; }
          if (name === 'flower') { map.C = P.cap; map.c = P.poison; }
          if (['spider0', 'spider1', 'earwig', 'inch0', 'inch1', 'bee0', 'bee1', 'beetle0', 'beetle1', 'dragon0', 'dragon1', 'mosq0', 'mosq1'].includes(name)) { delete map.B; delete map.W; }
          const src = ART[name] || ART[name.slice(1)];
          cache[key] = sprite(src, map, flip);
        }
        return cache[key];
      }

      let hi = api.getHiScore(15000);
      let state = 'attract', stT = 0, coinFlash = 0;
      let score = 0, lives = 3, wave = 1, nextExtra = 15000, pal = 0;
      let mush = new Array(COLS * ROWS).fill(null);   // {hp, poison, flower}
      let ddts = [], segs = [], foes = [], parts = [], popups = [], clouds = [];
      let player, arrow = null, deadT = 0, restoreQ = [], restoreT = 0, sideT = 0, slowT = 0, swarm = null, waveMsgT = 0;
      let spiderT = 0, earwigT = 0, inchT = 0, beeT = 0, beetleT = 0, flyT = 0;
      let mouseMode = false, lastMX = -1, lastMY = -1;
      let demoSegs = [];

      const MI = (c, r) => r * COLS + c;
      const mAt = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS) ? null : mush[MI(c, r)];
      const ddtAt = (c, r) => ddts.find(d => d.r === r && (d.c === c || d.c + 1 === c));
      function seedField() {
        mush.fill(null);
        for (let k = 0; k < 52; k++) {
          const c = ri(COLS), r = 1 + ri(BOT - 2);
          if (!mush[MI(c, r)]) mush[MI(c, r)] = { hp: 3, poison: false, flower: false };
        }
        ddts = [];
        while (ddts.length < 4) addDDT();
      }
      function addDDT() {
        for (let k = 0; k < 30; k++) {
          const c = ri(COLS - 1), r = 2 + ri(PZ - 6);
          if (mAt(c, r) || mAt(c + 1, r) || ddtAt(c, r) || ddtAt(c + 1, r)) continue;
          ddts.push({ c, r }); return;
        }
      }
      function plantMush(c, r) {
        if (c < 0 || c >= COLS || r < 1 || r > BOT) return;
        if (mush[MI(c, r)] || ddtAt(c, r)) return;
        if (player && Math.abs(player.x - (c * CELL + 4)) < 7 && Math.abs(player.y - (r * CELL + 4)) < 7) return;
        mush[MI(c, r)] = { hp: 3, poison: false, flower: false };
      }

      // ---------- millipede ----------
      function newSeg(x, y, dir, speed, leader) { return { x, y, dir, vdir: 1, mode: 'h', ty: y, speed, poison: false, leader, dead: false }; }
      function spawnMillipede() {
        segs = [];
        const extra = Math.min(6, wave - 1), body = 12 - extra, speed = wave >= 3 && (wave % 2 === 1) ? 2 : 1;
        let lead = null;
        for (let k = 0; k < body; k++) { const s = newSeg((15 - k) * CELL, 1 * CELL, 1, speed, lead); segs.push(s); lead = s; }
        for (let k = 0; k < extra; k++) {
          const c = 2 + ri(COLS - 4), s = newSeg(c * CELL, (1 + ri(3)) * CELL, Math.random() < 0.5 ? -1 : 1, Math.random() < 0.5 ? 1 : 2, null);
          segs.push(s);
        }
        sideT = 600;
        A.melody([[196, .06], [247, .06], [294, .06], [392, .1]], { type: 'square', vol: 0.08 });
      }
      function blockedCell(c, r) { return c < 0 || c >= COLS || !!mAt(c, r) || !!ddtAt(c, r); }
      function stepSeg(s) {
        for (let n = 0; n < s.speed; n++) {
          if (s.mode === 'v') {
            s.y += s.y < s.ty ? 1 : -1;
            if (s.y === s.ty) {
              const row = s.y / CELL;
              if (s.poison && row < BOT) { s.ty = s.y + CELL; continue; }
              if (s.poison) { s.poison = false; s.vdir = -1; }
              s.mode = 'h'; s.dir = -s.dir;
            }
            continue;
          }
          if (s.x % CELL === 0) {
            const c = s.x / CELL, r = s.y / CELL, nc = c + s.dir;
            const m = mAt(nc, r);
            if (nc < -1 || nc > COLS || (nc >= 0 && nc < COLS && blockedCell(nc, r)) || ((nc < 0 || nc >= COLS) && c >= 0 && c < COLS)) {
              if (m && m.poison && r < BOT) s.poison = true;
              if (s.vdir > 0 && r + 1 > BOT) s.vdir = -1;
              else if (s.vdir < 0 && r - 1 < PZ) s.vdir = 1;
              s.mode = 'v'; s.ty = s.y + s.vdir * CELL;
              if (s.poison) s.ty = s.y + CELL;
              continue;
            }
          }
          s.x += s.dir;
        }
      }
      function killSeg(i) {
        const s = segs[i];
        for (const o of segs) if (o.leader === s) o.leader = null;
        const isHead = !s.leader;
        const pts = isHead ? 100 : 10; addScore(pts);
        burst(s.x + 4, s.y + 4, 10, [PALS[pal].head, PALS[pal].body, '#ffffff']);
        plantMush(Math.round(s.x / CELL), Math.round(s.y / CELL));
        segs.splice(i, 1);
        A.noise(0.12, { freq: 3000, vol: 0.18 }); A.tone(isHead ? 880 : 440, 0.08, { type: 'square', vol: 0.08, slideTo: 200 });
        return pts;
      }

      // ---------- foes ----------
      function spawnFoe(t, opts) {
        const f = Object.assign({ t, x: 0, y: 0, vx: 0, vy: 0, tt: 0, hp: 1 }, opts || {});
        if (t === 'spider') { const left = Math.random() < 0.5; f.x = left ? -8 : W; f.y = rnd(PZ * CELL - 16, BOT * CELL); f.vx = (left ? 1 : -1) * (0.9 + Math.min(1, wave * 0.1)); f.vy = Math.random() < 0.5 ? -1.4 : 1.4; }
        if (t === 'earwig') { const left = Math.random() < 0.5; f.x = left ? -8 : W; f.y = (4 + ri(PZ - 8)) * CELL; f.vx = left ? 0.7 : -0.7; }
        if (t === 'inch') { const left = Math.random() < 0.5; f.x = left ? -8 : W; f.y = (3 + ri(PZ - 6)) * CELL; f.vx = left ? 0.4 : -0.4; }
        if (t === 'bee') { f.x = ri(COLS) * CELL; f.y = 0; f.vy = 1.4 + Math.min(1.2, wave * 0.1); f.hp = 2; }
        if (t === 'beetle') { const left = Math.random() < 0.5; f.x = left ? -8 : W; f.y = BOT * CELL; f.vx = left ? 0.8 : -0.8; f.phase = 0; f.dir0 = f.vx; }
        if (t === 'dragon') { f.x = rnd(16, W - 16); f.y = 0; f.vy = 0.9; f.vx = Math.random() < 0.5 ? 1.2 : -1.2; }
        if (t === 'mosq') { f.x = rnd(0, W - 8); f.y = 0; f.vy = 1.3; f.vx = Math.random() < 0.5 ? 1.3 : -1.3; }
        foes.push(f); return f;
      }
      const FOE_BOX = { spider: [9, 7], earwig: [9, 7], inch: [9, 5], bee: [7, 7], beetle: [9, 6], dragon: [9, 7], mosq: [7, 7] };
      const FOE_PTS = { earwig: 1000, inch: 100, bee: 200, beetle: 300, dragon: 500, mosq: 400 };

      function burst(x, y, n, cols) {
        for (let k = 0; k < n && parts.length < 400; k++) { const a = rnd(0, 6.28), s = rnd(0.4, 2); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: cols[ri(cols.length)], t: rnd(12, 30) }); }
      }
      function popup(x, y, s) { if (popups.length < 8) popups.push({ x, y, s: String(s), t: 50 }); }
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { nextExtra += 15000; lives = Math.min(8, lives + 1); A.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .12]], { type: 'square', vol: 0.1 }); }
        if (score > hi) hi = score;
      }
      function shiftField(dir) {
        // dir +1: the field creeps down a row (new wave); -1: up a row (beetle shot)
        const nm = new Array(COLS * ROWS).fill(null);
        for (let r = 1; r <= BOT; r++) for (let c = 0; c < COLS; c++) {
          const nr = r + dir; if (nr < 1 || nr > BOT) continue;
          nm[MI(c, nr)] = mush[MI(c, r)];
        }
        mush = nm;
        ddts = ddts.map(d => ({ c: d.c, r: d.r + dir })).filter(d => d.r >= 1 && d.r < PZ);
        if (player) { const c = Math.floor(player.x / CELL), r = Math.floor(player.y / CELL); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const cc = c + i, rr = r + j; if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && Math.abs(cc * 8 + 4 - player.x) < 8 && Math.abs(rr * 8 + 4 - player.y) < 8) mush[MI(cc, rr)] = null; } }
      }

      function newPlayer() { player = { x: W / 2, y: (BOT - 1) * CELL + 4, alive: true }; arrow = null; }
      function startGame() {
        state = 'play'; stT = 0; score = 0; lives = 3; wave = 1; nextExtra = 15000; pal = 0;
        foes = []; parts = []; popups = []; clouds = []; swarm = null; slowT = 0;
        seedField(); newPlayer(); spawnMillipede(); resetTimers(); waveMsgT = 90;
        mouseMode = false; lastMX = api.mouse.x; lastMY = api.mouse.y;
      }
      function resetTimers() { spiderT = 240; earwigT = 900; inchT = 700; beeT = 400; beetleT = 1200; flyT = 800; }
      function nextWave() {
        wave++; pal = (pal + 1) % PALS.length; shiftField(1);
        while (ddts.length < 4) addDDT();
        if (wave % 3 === 1 && wave > 1 && !swarm) {
          const kinds = ['bee', 'dragon', 'mosq'];
          swarm = { t: kinds[Math.floor(wave / 3) % 3], left: 12 + Math.min(8, wave), next: 30, pts: 200 };
          waveMsgT = 120; foes = foes.filter(f => f.t === 'spider');
          return;
        }
        spawnMillipede(); waveMsgT = 90;
      }
      function killPlayer() {
        if (!player.alive) return;
        player.alive = false; deadT = 100; arrow = null;
        burst(player.x, player.y, 50, ['#ffffff', PALS[pal].player, '#ff2020', '#ffe000']);
        A.noise(0.8, { freq: 2000, slideTo: 60, vol: 0.35 });
        A.melody([[784, .08], [659, .08], [523, .08], [392, .08], [262, .2]], { type: 'square', vol: 0.12 });
        // queue up the damaged/poisoned mushrooms for restoration
        restoreQ = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const m = mush[MI(c, r)]; if (m && !m.flower && (m.hp < 3 || m.poison)) restoreQ.push([c, r]); }
        restoreT = 0;
      }

      // ---------- update ----------
      function movePlayer() {
        const m = api.mouse;
        if (m.x !== lastMX || m.y !== lastMY) { if (lastMX >= 0) mouseMode = true; lastMX = m.x; lastMY = m.y; }
        if (api.key('ArrowLeft') || api.key('ArrowRight') || api.key('ArrowUp') || api.key('ArrowDown')) mouseMode = false;
        let mx = 0, my = 0;
        if (mouseMode) {
          const tx = Math.max(3, Math.min(W - 4, m.x)), ty = Math.max(PZ * CELL + 3, Math.min(H - 4, m.y));
          mx = Math.max(-3.2, Math.min(3.2, tx - player.x)); my = Math.max(-3.2, Math.min(3.2, ty - player.y));
        } else {
          if (api.key('ArrowLeft')) mx -= 2; if (api.key('ArrowRight')) mx += 2;
          if (api.key('ArrowUp')) my -= 2; if (api.key('ArrowDown')) my += 2;
        }
        const hit = (x, y) => {
          if (x < 3 || x > W - 4 || y < PZ * CELL + 3 || y > H - 4) return true;
          for (const [ox, oy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
            const c = Math.floor((x + ox) / CELL), r = Math.floor((y + oy) / CELL);
            if (mAt(c, r)) return true;
          }
          return false;
        };
        if (mx && !hit(player.x + mx, player.y)) player.x += mx;
        else if (mx) { const s = Math.sign(mx); for (let k = 0; k < Math.abs(mx) && !hit(player.x + s, player.y); k++) player.x += s; }
        if (my && !hit(player.x, player.y + my)) player.y += my;
        else if (my) { const s = Math.sign(my); for (let k = 0; k < Math.abs(my) && !hit(player.x, player.y + s); k++) player.y += s; }
        const fire = api.key('Space') || (mouseMode && m.down) || api.key('KeyX');
        if (fire && !arrow) { arrow = { x: Math.round(player.x), y: player.y - 4 }; A.tone(1200, 0.04, { type: 'square', vol: 0.04, slideTo: 2400 }); }
      }
      function arrowHits() {
        // arrow travels 8px/frame: sweep it 2px at a time
        for (let k = 0; k < 4 && arrow; k++) {
          arrow.y -= 2;
          if (arrow.y < 8) { arrow = null; return; }
          const ax = arrow.x, ay = arrow.y, c = Math.floor(ax / CELL), r = Math.floor(ay / CELL);
          // segments
          for (let i = segs.length - 1; i >= 0; i--) {
            const s = segs[i];
            if (ax >= s.x && ax < s.x + 8 && ay >= s.y && ay < s.y + 8) {
              const pts = killSeg(i); popup(s.x + 4, s.y, pts); arrow = null; return;
            }
          }
          // foes
          for (let i = foes.length - 1; i >= 0; i--) {
            const f = foes[i], [bw, bh] = FOE_BOX[f.t];
            if (ax >= f.x && ax < f.x + bw && ay >= f.y && ay < f.y + bh) { hitFoe(i, 1); arrow = null; return; }
          }
          // DDT
          const d = ddtAt(c, r);
          if (d) { ddts.splice(ddts.indexOf(d), 1); explodeDDT(d.c * CELL + 8, d.r * CELL + 4); arrow = null; return; }
          const m = mAt(c, r);
          if (m) {
            if (m.flower) { arrow = null; A.tone(300, 0.03, { type: 'square', vol: 0.04 }); return; }
            m.hp--; A.tone(180 + m.hp * 60, 0.03, { type: 'square', vol: 0.05 });
            if (m.hp <= 0) { mush[MI(c, r)] = null; addScore(m.poison ? 5 : 1); burst(c * 8 + 4, r * 8 + 4, 5, [PALS[pal].cap, PALS[pal].stem]); }
            arrow = null; return;
          }
        }
      }
      function hitFoe(i, mult) {
        const f = foes[i];
        if (f.t === 'bee' && f.hp > 1 && mult === 1) { f.hp--; f.vy *= 2; A.tone(1500, 0.05, { type: 'square', vol: 0.06 }); return; }
        let pts;
        if (f.t === 'spider') { const d = Math.abs(player.y - f.y); pts = d < 16 ? 900 : d < 32 ? 600 : 300; }
        else pts = FOE_PTS[f.t];
        if (f.swarm) { pts = swarm ? swarm.pts : 200; if (swarm) swarm.pts = Math.min(1000, swarm.pts + 100); }
        pts *= mult; addScore(pts); popup(f.x + 4, f.y, pts);
        burst(f.x + 4, f.y + 3, 16, ['#ffffff', '#ff40ff', '#ffe000', '#40ff40']);
        foes.splice(i, 1);
        A.noise(0.2, { freq: 2500, slideTo: 300, vol: 0.2 }); A.tone(600, 0.15, { type: 'square', vol: 0.08, slideTo: 1500 });
        if (f.t === 'inch') { slowT = 300; A.tone(200, 0.6, { type: 'triangle', vol: 0.12, slideTo: 100 }); }
        if (f.t === 'beetle') { shiftField(-1); A.tone(300, 0.3, { type: 'square', vol: 0.08, slideTo: 600 }); }
      }
      function explodeDDT(x, y) {
        clouds.push({ x, y, t: 50, R: 22 });
        A.noise(0.9, { freq: 1200, slideTo: 100, vol: 0.4 });
        addScore(800); popup(x, y - 6, 800);
        for (let i = segs.length - 1; i >= 0; i--) { const s = segs[i]; if (Math.hypot(s.x + 4 - x, s.y + 4 - y) < 22) { const p = killSeg(i); addScore(p * 2); } }
        for (let i = foes.length - 1; i >= 0; i--) { const f = foes[i]; if (Math.hypot(f.x + 4 - x, f.y + 3 - y) < 22) hitFoe(i, 3); }
      }
      function playerTouch(x, y, w, h) {
        return player.alive && player.x + 3 > x && player.x - 3 < x + w && player.y + 3 > y && player.y - 3 < y + h;
      }
      function updFoes() {
        for (let i = foes.length - 1; i >= 0; i--) {
          const f = foes[i]; f.tt++;
          const c = Math.floor((f.x + 4) / CELL), r = Math.floor((f.y + 3) / CELL);
          if (f.t === 'spider') {
            f.x += f.vx; f.y += f.vy;
            if (f.y < PZ * CELL - 24 || f.y > BOT * CELL) { f.vy = -f.vy; f.y = Math.max(PZ * CELL - 24, Math.min(BOT * CELL, f.y)); }
            if (Math.random() < 0.02) f.vy = (Math.random() < 0.5 ? -1 : 1) * rnd(0.8, 2);
            if (Math.random() < 0.04 && mAt(c, r) && !mAt(c, r).flower) mush[MI(c, r)] = null;   // it eats mushrooms
            if (f.tt % 14 === 0) A.tone(f.tt % 28 ? 300 : 360, 0.05, { type: 'square', vol: 0.03 });
            if (f.x < -12 || f.x > W + 4) { foes.splice(i, 1); continue; }
          } else if (f.t === 'earwig') {
            f.x += f.vx;
            const m = mAt(c, r); if (m && !m.flower && !m.poison) { m.poison = true; }
            if (f.tt % 20 === 0) A.tone(150, 0.06, { type: 'sawtooth', vol: 0.03 });
            if (f.x < -12 || f.x > W + 4) { foes.splice(i, 1); continue; }
          } else if (f.t === 'inch') {
            if ((f.tt >> 4) & 1) f.x += f.vx * 2;
            if (f.x < -12 || f.x > W + 4) { foes.splice(i, 1); continue; }
          } else if (f.t === 'bee') {
            f.y += f.vy;
            if (f.y < (PZ + 4) * CELL && Math.random() < 0.06 + wave * 0.005) plantMush(c, r);
            if (f.tt % 6 === 0) A.tone(900 - f.y * 2, 0.05, { type: 'square', vol: 0.03 });
            if (f.y > H) { foes.splice(i, 1); continue; }
          } else if (f.t === 'beetle') {
            // crawls along the bottom, scurries up through the player area and back down; flowers in its wake
            f.phase++;
            if (f.phase < 60) f.x += f.dir0;
            else if (f.phase < 120) { f.y -= 0.6; f.x += f.dir0 * 0.3; }
            else if (f.phase < 200) f.x += f.dir0;
            else if (f.phase < 260) { f.y += 0.6; f.x += f.dir0 * 0.3; }
            else f.x += f.dir0;
            f.y = Math.min(BOT * CELL, Math.max(PZ * CELL - 8, f.y));
            const m = mAt(c, r); if (m && !m.flower) { m.flower = true; m.poison = false; m.hp = 3; }
            if (f.x < -12 || f.x > W + 4) { foes.splice(i, 1); continue; }
          } else if (f.t === 'dragon') {
            f.y += f.vy; f.x += f.vx;
            if (f.x < 0 || f.x > W - 9) f.vx = -f.vx;
            if (f.tt % 30 === 0) f.vx = -f.vx;
            if (Math.random() < 0.04) plantMush(c, r);
            if (f.y > H) { foes.splice(i, 1); continue; }
          } else if (f.t === 'mosq') {
            f.y += f.vy; f.x += f.vx;
            if (f.x < 0 || f.x > W - 7) f.vx = -f.vx;
            if (f.y > H) { foes.splice(i, 1); continue; }
          }
          const [bw, bh] = FOE_BOX[f.t];
          if (f.t !== 'inch' && playerTouch(f.x, f.y, bw, bh)) { killPlayer(); return; }
        }
      }
      function updPlay() {
        if (waveMsgT > 0) waveMsgT--;
        if (!player.alive) {
          // restore mushrooms one by one, then respawn
          if (restoreQ.length) {
            if (++restoreT % 4 === 0) {
              const [c, r] = restoreQ.shift(), m = mush[MI(c, r)];
              if (m) { m.hp = 3; m.poison = false; addScore(5); A.tone(1400, 0.04, { type: 'square', vol: 0.06 }); }
            }
            return;
          }
          if (--deadT <= 0) {
            const resume = () => {
              newPlayer(); foes = []; clouds = [];
              if (!swarm) spawnMillipede();
              resetTimers();
            };
            if (lives <= 1) {
              lives = 0;
              const over = () => { state = 'gameover'; stT = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; resume(); }, over); else over();
              return;
            }
            lives--; resume();
          }
          return;
        }
        movePlayer(); arrowHits();
        const slow = slowT > 0 && (api.frame & 1);
        if (slowT > 0) slowT--;
        if (!slow) {
          for (const s of segs) stepSeg(s);
          updFoes(); if (!player.alive) return;
        }
        for (const s of segs) if (playerTouch(s.x, s.y, 8, 8)) { killPlayer(); return; }
        // clouds
        for (let i = clouds.length - 1; i >= 0; i--) {
          const cl = clouds[i];
          if (cl.t > 10 && player.alive && Math.hypot(player.x - cl.x, player.y - cl.y) < cl.R - 4) { killPlayer(); return; }
          if (--cl.t <= 0) clouds.splice(i, 1);
        }
        // heads join from the side while the millipede is in the player area
        if (segs.some(s => s.y >= PZ * CELL) && --sideT <= 0) {
          sideT = Math.max(150, 420 - wave * 20);
          const left = Math.random() < 0.5, s = newSeg(left ? -CELL : COLS * CELL, (PZ + ri(BOT - PZ)) * CELL, left ? 1 : -1, 1, null);
          s.vdir = -1; segs.push(s);
        }
        // enemy timers
        if (!swarm) {
          if (--spiderT <= 0) { spiderT = Math.max(200, 500 - wave * 25) + ri(200); if (!foes.some(f => f.t === 'spider')) { spawnFoe('spider'); } }
          if (--earwigT <= 0) { earwigT = 900 + ri(600); if (!foes.some(f => f.t === 'earwig')) spawnFoe('earwig'); }
          if (--inchT <= 0) { inchT = 1000 + ri(800); if (!foes.some(f => f.t === 'inch')) spawnFoe('inch'); }
          if (--beeT <= 0) {
            beeT = 200 + ri(200);
            let n = 0; for (let r = PZ; r <= BOT; r++) for (let c = 0; c < COLS; c++) if (mush[MI(c, r)]) n++;
            if (n < 5 + Math.min(5, wave) && !foes.some(f => f.t === 'bee')) spawnFoe('bee');
          }
          if (wave >= 2 && --beetleT <= 0) { beetleT = 1100 + ri(700); if (!foes.some(f => f.t === 'beetle')) spawnFoe('beetle'); }
          if (wave >= 3 && --flyT <= 0) { flyT = 700 + ri(600); spawnFoe(Math.random() < 0.5 ? 'dragon' : 'mosq'); }
          if (!segs.length) nextWave();
        } else {
          if (swarm.left > 0 && --swarm.next <= 0) { swarm.next = 22 + ri(20); swarm.left--; spawnFoe(swarm.t, { swarm: true }); }
          if (--spiderT <= 0) { spiderT = 600; if (!foes.some(f => f.t === 'spider')) spawnFoe('spider'); }
          if (swarm.left <= 0 && !foes.some(f => f.swarm)) { swarm = null; spawnMillipede(); waveMsgT = 90; }
        }
        while (ddts.length < 2) addDDT();
      }
      function updMisc() {
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; if (--p.t <= 0) parts.splice(i, 1); }
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }
      function update() {
        stT++; if (coinFlash > 0) coinFlash--;
        if (state === 'attract') {
          if (!demoSegs.length || stT % 1500 === 1) { seedField(); demoSegs = []; let lead = null; for (let k = 0; k < 12; k++) { const s = newSeg((15 - k) * CELL, CELL, 1, 1, lead); demoSegs.push(s); lead = s; } }
          for (const s of demoSegs) stepSeg(s);
          const start = api.anyPressed('Enter', 'Space') || (api.mouse.clicked && stT > 30);
          if (start) {
            if (api.useCredit()) { demoSegs = []; startGame(); }
            else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.2 }); }
          }
          return;
        }
        if (state === 'gameover') {
          updMisc();
          if (stT > 240 || (stT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; stT = 0; demoSegs = []; }
          return;
        }
        updPlay(); updMisc();
        // ambient millipede march
        if (state === 'play' && segs.length && api.frame % 16 === 0 && player.alive) A.tone(api.frame % 32 ? 110 : 130, 0.05, { type: 'triangle', vol: 0.04 });
      }

      // ---------- render ----------
      function drawField(ctx) {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const m = mush[MI(c, r)]; if (!m) continue;
          const name = m.flower ? 'flower' : (m.poison ? 'pmush' : 'mush') + Math.max(1, m.hp);
          ctx.drawImage(sp(name, pal).c, c * CELL, r * CELL);
        }
        for (const d of ddts) {
          const x = d.c * CELL, y = d.r * CELL;
          ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x, y, 16, 8);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 1, 14, 1);
          ctx.fillStyle = '#202020';
          // tiny "DDT" lettering
          ctx.fillRect(x + 2, y + 3, 1, 3); ctx.fillRect(x + 3, y + 3, 1, 1); ctx.fillRect(x + 3, y + 5, 1, 1); ctx.fillRect(x + 4, y + 4, 1, 1);
          ctx.fillRect(x + 6, y + 3, 1, 3); ctx.fillRect(x + 7, y + 3, 1, 1); ctx.fillRect(x + 7, y + 5, 1, 1); ctx.fillRect(x + 8, y + 4, 1, 1);
          ctx.fillRect(x + 10, y + 3, 3, 1); ctx.fillRect(x + 11, y + 4, 1, 2);
        }
      }
      function drawSegs(ctx, list) {
        for (const s of list) {
          const head = !s.leader, f = ((s.x + s.y) >> 2) & 1, flip = s.dir < 0;
          ctx.drawImage(sp((head ? 'head' : 'body') + f, pal, flip).c, Math.round(s.x), Math.round(s.y));
        }
      }
      function drawFoes(ctx) {
        for (const f of foes) {
          const a = (f.tt >> 3) & 1;
          const name = f.t === 'spider' ? 'spider' + a : f.t === 'earwig' ? 'earwig' : f.t === 'inch' ? 'inch' + ((f.tt >> 4) & 1) : f.t === 'bee' ? 'bee' + ((f.tt >> 1) & 1) : f.t === 'beetle' ? 'beetle' + a : f.t === 'dragon' ? 'dragon' + ((f.tt >> 2) & 1) : 'mosq' + ((f.tt >> 2) & 1);
          ctx.drawImage(sp(name, pal, f.vx < 0).c, Math.round(f.x), Math.round(f.y));
          if (f.t === 'bee' && f.hp === 1 && (api.frame & 2)) { ctx.fillStyle = '#ff2020'; ctx.fillRect(Math.round(f.x) + 3, Math.round(f.y) - 1, 1, 1); }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 8);
        text(ctx, String(score), 2, 0, PALS[pal].cap);
        text(ctx, String(hi), W / 2, 0, '#ffffff', 1, 'center');
        for (let i = 0; i < Math.min(6, lives - (player && player.alive ? 1 : 0)); i++) ctx.drawImage(sp('player', pal).c, W - 9 - i * 9, 0);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'attract') {
          drawField(ctx); drawSegs(ctx, demoSegs);
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(16, 40, W - 32, 150);
          const cols = ['#ff8000', '#ffa000', '#ffc000', '#ffe000', '#c0ff40', '#40ff40', '#00c000'];
          text(ctx, 'MILLIPEDE', W / 2 + 1, 50, '#402000', 3, 'center');
          text(ctx, 'MILLIPEDE', W / 2, 49, r => cols[r], 3, 'center');
          const page = Math.floor(stT / 420) % 2;
          if (page === 0) {
            if (api.credits > 0) text(ctx, 'PUSH START', W / 2, 90, (api.frame & 32) ? '#ffffff' : '#40ff40', 1, 'center');
            else if (coinFlash > 0 ? (coinFlash & 8) : (stT % 60) < 40) text(ctx, 'INSERT COIN', W / 2, 90, coinFlash > 0 ? '#ff2020' : '#ffffff', 1, 'center');
            text(ctx, 'HIGH SCORE ' + hi, W / 2, 108, '#ffe000', 1, 'center');
            text(ctx, 'BONUS EVERY 15000', W / 2, 126, '#40c0ff', 1, 'center');
            text(ctx, 'SHOOT DDT TO GAS', W / 2, 144, '#ffffff', 1, 'center');
            text(ctx, 'EVERYTHING NEARBY', W / 2, 154, '#ffffff', 1, 'center');
            text(ctx, '\u00a9 1982 ATARI', W / 2, 176, '#a0a0a0', 1, 'center');
          } else {
            const rows = [['head0', 'HEAD', 100], ['spider0', 'SPIDER', '300-900'], ['earwig', 'EARWIG', 1000], ['bee0', 'BEE', 200], ['beetle0', 'BEETLE', 300], ['inch0', 'INCHWORM', 100], ['dragon0', 'DRAGONFLY', 500], ['mosq0', 'MOSQUITO', 400]];
            rows.forEach(([k, n, p], i) => {
              const y = 82 + i * 13;
              ctx.drawImage(sp(k, 0).c, 40, y);
              text(ctx, n, 60, y, '#ffffff'); text(ctx, String(p), 204, y, '#ffe000', 1, 'right');
            });
          }
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 244, '#ffffff', 1, 'center');
          drawHUD(ctx);
          return;
        }
        drawField(ctx);
        drawSegs(ctx, segs);
        drawFoes(ctx);
        for (const cl of clouds) {
          for (let k = 0; k < 40; k++) {
            const a = k * 2.4 + cl.t * 0.05, rr = (k % 7) / 7 * cl.R;
            ctx.fillStyle = ['#ffffff', '#c0c0c0', '#ffe000', '#a0ffa0'][k & 3];
            ctx.fillRect(Math.round(cl.x + Math.cos(a) * rr), Math.round(cl.y + Math.sin(a) * rr * 0.8), 2, 2);
          }
        }
        if (player && player.alive) {
          ctx.drawImage(sp('player', pal).c, Math.round(player.x - 3), Math.round(player.y - 3));
        }
        if (arrow) { ctx.fillStyle = '#ffffff'; ctx.fillRect(arrow.x, arrow.y, 1, 6); ctx.fillStyle = PALS[pal].player; ctx.fillRect(arrow.x, arrow.y + 5, 1, 2); }
        for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        for (const p of popups) text(ctx, p.s, p.x, p.y - (50 - p.t) / 4, '#ffffff', 1, 'center');
        if (slowT > 0 && (api.frame & 16)) text(ctx, 'SLOW', W - 4, 10, '#40ff40', 1, 'right');
        drawHUD(ctx);
        if (waveMsgT > 0) {
          if (swarm) text(ctx, 'ATTACK WAVE', W / 2, 100, '#ffffff', 1, 'center');
          else text(ctx, 'WAVE ' + wave, W / 2, 100, PALS[pal].cap, 1, 'center');
        }
        if (state === 'gameover') text(ctx, 'GAME OVER', W / 2, 120, '#ff2020', 2, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
