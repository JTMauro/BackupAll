// Gun.Smoke (Capcom, 1985) -- from-scratch recreation for the MAME32 Game Room.
// Vertically scrolling western: walk up the street, shoot ahead / diagonally, collect bounties.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '$': [4, 15, 20, 14, 5, 30, 4]
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
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  const mirror = rows => rows.map(r => r.split('').reverse().join(''));

  // ---------- pixel art ----------
  const P_A = [
    '....hhhh....', '..hhHHHHhh..', '.hHHHHHHHHh.', '..hhhhhhhh..', '...SSSSSS...', '....RRRR....',
    '..BBBBBBBB..', '.SBBBBBBBBS.', '.SBBBBBBBBS.', 'GG.BBBBBB.GG', '...WWWWWW...', '...LLL.LL...',
    '...LL..LL...', '...LL...LL..', '..KK....KK..', '..KK........'];
  const P_B = P_A.slice(0, 11).concat(['...LL.LLL...', '...LL..LL...', '..LL...LL...', '..KK....KK..', '........KK..']);
  const E_A = [
    '....hhhh....', '..hhHHHHhh..', '.hHHHHHHHHh.', '..hhhhhhhh..', '...SSSSSS...', '...SeSSeS...', '...RRRRRR...',
    '..CCCCCCCC..', '.SCCCCCCCCS.', '.SCCWCCWCCS.', 'GG.CCCCCC.GG', '...WWWWWW...', '...LL..LL...',
    '...LL..LL...', '..LL....LL..', '..KK....KK..'];
  const E_B = E_A.slice(0, 12).concat(['...LL..LL...', '..LL...LL...', '..LL...LL...', '..KK.....KK.']);
  const FALL = [
    '......hhhh......', '..LL.CCCCCC.hHHh', 'KKLLWCCCCCCSSHHh', 'KKLLWCCCCCCSSHHh', '..LL.CCCCCC.hHHh', '......SS..hhhh..'];
  const HORSE_A = [
    '....D..D....', '....MMMM....', '....MWMM....', '....MMMM....', '....MMMM....', '...DMMMMD...', '...MMMMMM...',
    '.L.MMMMMM.L.', '.LMMMMMMMML.', '..MMMMMMMM..', '..MMMMMMMM..', '..MMMMMMMM..', '..MMMMMMMM..', '.LMMMMMMMML.',
    '.L.MMMMMM.L.', '...MMMMMM...', '....MMMM....', '.....DD.....', '.....DD.....', '......D.....'];
  const HORSE_B = HORSE_A.map((r, i) => (i === 7 || i === 14) ? '...MMMMMM...' : (i === 8 || i === 13) ? '..MMMMMMMM..' : r)
    .map((r, i) => i === 6 ? '.L.MMMMMM.L.' : i === 15 ? '.L.MMMMMM.L.' : r);
  const HSIDE_A = [
    '..................DD', '................DMMD', '...............MMMWM', 'D.............MMMM..', 'DD.MMMMMMMMMMMMMM...',
    '.DMMMMMMMMMMMMMM....', '..MMMMMMMMMMMMM.....', '..MMMMMMMMMMMM......', '..L.L......L.L......', '..L..L....L...L.....',
    '.L....L..L.....L....', '.K....K..K.....K....'];
  const HSIDE_B = HSIDE_A.slice(0, 8).concat(['...LL......LL.......', '...L.L.....L.L......', '...L..L....L..L.....', '...K..K....K..K.....']);
  const ITEM = {
    boots: ['..KKKK....', '..KKKK....', '..KYYK....', '..KKKK....', '..KKKK....', '..KKKKKK..', '.KKKKKKKK.', '.KKKKKKKKK', '.YYYYYYYYY'],
    rifle: ['........GG', '.......GG.', '......GG..', '.....GG...', '....GG....', '...WWG....', '..WWW.....', '.WWW......', 'WWW.......'],
    bullet: ['.Y..Y..Y..', 'YYYYYYYYY.', 'YYYYYYYYY.', 'CCCCCCCCC.', 'CCCCCCCCC.', 'CCCCCCCCC.', 'CCCCCCCCC.', 'CCCCCCCCC.', 'KKKKKKKKK.'],
    horse: ['..D..D....', '..MMMM....', '.MMMMMM...', '.MWMMMMMM.', 'MMMMMMMMMM', 'MMM.MMMMMM', 'MM...MMMMM', '.....MMMMM', '......MMMM'],
    bag: ['...KK.....', '....K.....', '..YYYYY...', '.YYYWYYY..', 'YYYWYYYYY.', 'YYYYWYYYY.', 'YYYWYYYYY.', '.YYYYYYY..', '..YYYYY...'],
    oneup: ['....R.....', '...RRR....', 'RRRRYRRRR.', '.RRYYYRR..', '..RYYYR...', '.RRRYRRR..', '.RR...RR..', 'RR.....RR.', '..........'],
    pow: ['.WWWWWWW..', 'WWWWWWWWW.', 'WKKWWWKKW.', 'WKKWWWKKW.', 'WWWWKWWWW.', '.WWWWWWW..', '..W.W.W...', '..WWWWW...', '...........']
  };
  const IPAL = { K: '#a05020', Y: '#ffd040', G: '#c0c0c8', W: '#f0f0f0', C: '#d08030', M: '#a06030', D: '#502810', R: '#ff3030' };

  const W = 224, H = 256, SL = 44, SR = 180;

  ArcadeRegistry.register({
    id: 'gunsmoke', title: 'Gun.Smoke', year: 1985, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk \u00b7 Space: shoot ahead \u00b7 X: shoot both diagonals (Space+X: 3-way) \u00b7 Z: shoot left \u00b7 Enter: start',
    marquee: { bg: '#3a1c08', fg: '#ffd890', accent: '#e03020' },
    create(api) {
      const au = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => Math.random() * n | 0;
      const snd = {
        shot() { au.noise(0.05, { vol: 0.1, freq: 2600, type: 'highpass' }); au.tone(1400, 0.03, { type: 'square', vol: 0.04, slideTo: 600 }); },
        eshot() { au.tone(700, 0.07, { type: 'square', vol: 0.05, slideTo: 300 }); },
        thud() { au.noise(0.04, { vol: 0.08, freq: 500 }); },
        kill() { au.tone(420, 0.18, { type: 'sawtooth', vol: 0.1, slideTo: 90 }); au.noise(0.08, { vol: 0.1, freq: 1500 }); },
        item() { au.melody([[880, .05], [1175, .05], [1568, .1]], { type: 'square', vol: 0.12 }); },
        boom() { au.noise(0.45, { vol: 0.22, freq: 900, slideTo: 60 }); },
        die() { au.melody([[523, .12], [494, .12], [466, .12], [440, .12], [349, .5]], { type: 'triangle', vol: 0.2 }); },
        wanted() { au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .4]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .45]], { type: 'square', vol: 0.13 }); },
        oneup() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .14]], { type: 'square', vol: 0.12 }); },
        neigh() { au.tone(900, 0.3, { type: 'sawtooth', vol: 0.07, slideTo: 1400 }); au.tone(1200, 0.25, { type: 'sawtooth', vol: 0.05, delay: 0.25, slideTo: 600 }); }
      };
      // stage march (bars of a simple western tune, played at the stage intro)
      const TUNE = [[392, .15], [392, .15], [523, .3], [494, .15], [440, .15], [392, .3], [330, .15], [392, .15], [440, .3], [392, .6]];

      // ---------- sprites ----------
      const PPAL = { h: '#a08040', H: '#e8d090', S: '#f0b080', R: '#e02020', B: '#3868e8', W: '#704020', L: '#283c90', K: '#3a2010', G: '#b8b8c0' };
      const SPR = { pA: spr(P_A, PPAL), pB: spr(P_B, PPAL), pFall: spr(FALL, Object.assign({}, PPAL, { C: '#3868e8' })) };
      const EPALS = [
        { h: '#181818', H: '#383838', S: '#e8a070', e: '#000', R: '#ffd040', C: '#30a040', W: '#503010', L: '#604020', K: '#201008', G: '#a0a0a8' },
        { h: '#601010', H: '#a02020', S: '#e8a070', e: '#000', R: '#ffffff', C: '#e8e8e8', W: '#202020', L: '#303060', K: '#201008', G: '#a0a0a8' },
        { h: '#404040', H: '#707070', S: '#e8a070', e: '#000', R: '#30a0ff', C: '#e08020', W: '#402008', L: '#504030', K: '#201008', G: '#a0a0a8' },
        { h: '#301040', H: '#7030a0', S: '#e8a070', e: '#000', R: '#ff3030', C: '#a040e0', W: '#202020', L: '#202040', K: '#000000', G: '#e0e0e0' },
        { h: '#102030', H: '#205080', S: '#c88860', e: '#000', R: '#ffff00', C: '#205060', W: '#000', L: '#102030', K: '#000', G: '#ffffff' }
      ];
      const ES = EPALS.map(p => ({ a: spr(E_A, p), b: spr(E_B, p), fall: spr(FALL, p) }));
      const HPAL = { M: '#9a5a28', D: '#3c1c08', W: '#ffffff', L: '#5a3010', K: '#201008' };
      const HPAL2 = { M: '#e8e0d0', D: '#806040', W: '#a08060', L: '#a09080', K: '#201008' };
      const HS = { a: spr(HORSE_A, HPAL), b: spr(HORSE_B, HPAL), sa: spr(HSIDE_A, HPAL2), sb: spr(HSIDE_B, HPAL2), saL: spr(mirror(HSIDE_A), HPAL2), sbL: spr(mirror(HSIDE_B), HPAL2) };
      const IS = {}; for (const k in ITEM) IS[k] = spr(ITEM[k], IPAL);
      const BOSSPAL = [EPALS[1], EPALS[2], EPALS[4], EPALS[3]];
      const BS = BOSSPAL.map(p => ({ a: spr(E_A, p), b: spr(E_B, p), fall: spr(FALL, p) }));

      // ---------- stages ----------
      const STAGES = [
        { name: 'BANDIT CUTTER', bounty: 10000, boss: 'cutter', len: 2300, g1: '#c8a060', g2: '#b48c4c', roof: ['#8a4a28', '#6a5040', '#9a6a3a'], wall: '#d8b080' },
        { name: 'FAT MAN', bounty: 20000, boss: 'fat', len: 2500, g1: '#b89868', g2: '#a08054', roof: ['#5a6a7a', '#7a4a3a', '#6a6a50'], wall: '#c8b8a0' },
        { name: 'THE NINJA', bounty: 30000, boss: 'ninja', len: 2700, g1: '#9a9a60', g2: '#86864c', roof: ['#4a6a3a', '#7a5a2a', '#5a4a3a'], wall: '#b0a880' },
        { name: 'DEVIL GUNMAN', bounty: 50000, boss: 'gunman', len: 2900, g1: '#c09070', g2: '#a87858', roof: ['#6a2a2a', '#4a4a5a', '#7a5a4a'], wall: '#c8a090' }
      ];

      let hi = api.getHiScore(50000), mode = 'title', titleT = 0, frame = 0, coinFlash = 0;
      let g = null;

      function tryStart() {
        if (api.useCredit()) { newGame(); return; }
        coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.15 });
      }
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, loop: 0, nextExtra: 30000, bldg: new Map() };
        g.p = { x: 112, y: 0, boots: 0, rifle: 0, rate: 0, horse: 0, inv: 0, cd: 0, walk: 0 };
        mode = 'game'; startStage(true);
      }
      function diff() { return g.stage + g.loop * 4; }
      function st() { return STAGES[g.stage]; }
      function startStage(first) {
        g.cy = 0; g.genY = -20; g.dist = 0;
        g.p.x = 112; g.p.y = 210; g.p.inv = 90;
        g.en = []; g.pb = []; g.eb = []; g.obs = []; g.items = []; g.fx = []; g.dyn = []; g.pops = [];
        g.boss = null; g.spawnT = 120; g.phase = 'intro'; g.phaseT = first ? 200 : 150; g.bldg = new Map();
        au.melody(TUNE, { type: 'square', vol: 0.1 });
      }
      function addScore(n, x, y) {
        g.score += n;
        if (x != null) g.pops.push({ x, y, t: 40, s: String(n) });
        if (g.score > hi) hi = g.score;
        while (g.score >= g.nextExtra) { g.lives++; snd.oneup(); g.nextExtra += g.nextExtra < 100000 ? 70000 : 100000; }
      }

      // ---------- town generation ----------
      const SEG = 56;
      function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
      function bldg(side, k) {
        const key = side * 100000 + k;
        let b = g.bldg.get(key);
        if (!b) {
          const r = hash(k * 2 + side + g.stage * 977 + 13);
          const type = r < 0.16 ? 'alley' : r < 0.4 ? 'saloon' : r < 0.7 ? 'store' : 'house';
          b = { type, roof: Math.floor(hash(k * 7 + side * 3 + 5) * 3), wins: type === 'alley' ? [] : (r * 100 % 1 < 0.5 ? [14, 36] : [24]) };
          g.bldg.set(key, b);
        }
        return b;
      }
      function windowsInView() {
        const out = [];
        const k0 = Math.floor(g.cy / SEG), k1 = Math.floor((g.cy + 140) / SEG);
        for (let k = k0; k <= k1; k++) for (let side = 0; side < 2; side++) {
          const b = bldg(side, k);
          for (const o of b.wins) {
            const wy = k * SEG + o + 5;
            if (wy > g.cy + 16 && wy < g.cy + 140) out.push({ x: side ? 187 : 33, y: wy, side });
          }
        }
        return out;
      }
      function genObstacles() {
        const end = -st().len - 40;
        while (g.genY > g.cy - 60 && g.genY > end) {
          g.genY -= rnd(56, 110) * (1 - Math.min(0.3, diff() * 0.03));
          const n = Math.random() < 0.3 ? 2 : 1;
          const used = [];
          for (let i = 0; i < n; i++) {
            const r = Math.random();
            const o = r < 0.55 ? { k: 'barrel', w: 10, h: 12, hp: 3 } : r < 0.85 ? { k: 'crate', w: 14, h: 12, hp: 6 } : { k: 'trough', w: 26, h: 10, hp: 1e9 };
            let x = 0, ok = false;
            for (let tries = 0; tries < 8 && !ok; tries++) {
              x = rnd(SL + 6, SR - 6 - o.w); ok = used.every(u => Math.abs(u - x) > 44);
            }
            if (!ok) continue;
            used.push(x);
            o.x = x; o.y = g.genY; o.flash = 0;
            o.item = o.k === 'barrel' ? Math.random() < 0.5 : o.k === 'crate' ? Math.random() < 0.8 : false;
            g.obs.push(o);
          }
        }
      }
      function obAt(x, y, r) {
        for (const o of g.obs) if (x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h) return o;
        return null;
      }

      // ---------- player ----------
      function speed() { return g.p.horse > 0 ? 1.9 : 1.15 + g.p.boots * 0.28; }
      function fire(dirs) {
        const p = g.p;
        const maxB = 6 + p.rate * 2;
        if (g.pb.length >= maxB) return;
        const life = 20 + p.rifle * 8;
        const sp = 4.2;
        for (const d of dirs) {
          if (d === 0) { g.pb.push({ x: p.x - 3, y: p.y - 10, vx: 0, vy: -sp, life }); g.pb.push({ x: p.x + 3, y: p.y - 10, vx: 0, vy: -sp, life }); }
          else g.pb.push({ x: p.x + d * 5, y: p.y - 9, vx: d * sp * 0.72, vy: -sp * 0.72, life });
        }
        p.cd = 9 - p.rate * 2;
        snd.shot();
      }
      function updPlayer() {
        const p = g.p;
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx--; if (api.key('ArrowRight')) dx++;
        if (api.key('ArrowUp')) dy--; if (api.key('ArrowDown')) dy++;
        const s = speed() * (dx && dy ? 0.75 : 1);
        if (dx || dy) p.walk++;
        // move with obstacle collision (axis separated)
        const r = 5;
        const nx = Math.max(SL - 6, Math.min(SR + 6, p.x + dx * s));
        if (!obAt(nx, p.y + 2, r)) p.x = nx;
        const ny = Math.max(g.cy + 60, Math.min(g.cy + H - 18, p.y + dy * s));
        if (!obAt(p.x, ny + 2, r)) p.y = ny;
        // scroll push: the bottom edge drags the player up the screen; an obstacle can crush him off it
        if (p.y > g.cy + H - 18) {
          p.y = g.cy + H - 18;
          const o = obAt(p.x, p.y + 2, r);
          if (o) {
            // shove sideways out of the obstacle if possible, else the player is pushed off the bottom
            const left = o.x - r - 0.5, right = o.x + o.w + r + 0.5;
            const tx = (p.x - left < right - p.x) ? left : right;
            if (tx > SL - 6 && tx < SR + 6 && Math.abs(tx - p.x) < 3) p.x = tx;
            else p.y = o.y + o.h + r - 1;
          }
          if (p.y > g.cy + H - 8) { killPlayer(); return; }
        }
        if (p.cd > 0) p.cd--;
        const a = api.key('Space'), b = api.key('KeyX'), z = api.key('KeyZ');
        if (p.cd <= 0 && (a || b || z)) {
          const dirs = [];
          if (a) dirs.push(0);
          if (b) { dirs.push(-1); dirs.push(1); } else if (z) dirs.push(-1);
          fire(dirs);
        }
        if (p.inv > 0) p.inv--;
      }
      function hurtPlayer() {
        const p = g.p;
        if (p.inv > 0 || g.phase === 'dying') return;
        if (p.horse > 0) {
          p.horse--; p.inv = 70; snd.neigh();
          if (p.horse === 0) g.fx.push({ k: 'horseoff', x: p.x, y: p.y, t: 0, vx: Math.random() < 0.5 ? -1.6 : 1.6 });
          return;
        }
        killPlayer();
      }
      function killPlayer() {
        if (g.phase === 'dying') return;
        g.phase = 'dying'; g.phaseT = 150; g.p.inv = 0; snd.die();
      }
      function respawn() {
        const p = g.p;
        p.boots = Math.max(0, p.boots - 1); p.rifle = Math.max(0, p.rifle - 1); p.rate = Math.max(0, p.rate - 1); p.horse = 0;
        p.inv = 150; p.x = 112; p.y = g.cy + 200;
        // clear the street ahead of the respawn point
        g.obs = g.obs.filter(o => !(o.y > g.cy + 160 && o.x < 130 && o.x + o.w > 94));
        g.eb = []; g.dyn = [];
        g.en = g.en.filter(e => e.k === 'sniper' ? false : e.y < g.cy + 100);
        g.phase = g.boss ? 'boss' : 'play';
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.12 });
      }

      // ---------- enemies ----------
      function aimShot(x, y, sp, off) {
        const a = Math.atan2(g.p.y - y, g.p.x - x) + (off || 0);
        g.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, k: 'b' });
      }
      function bulletSpeed() { return Math.min(2.6, 1.35 + diff() * 0.12); }
      function spawnEnemy() {
        const d = diff();
        const r = Math.random();
        const max = 5 + Math.min(5, d);
        if (g.en.length >= max) return;
        if (r < 0.42) {
          const side = Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0;
          const e = { k: 'bandit', hp: 1, pal: ri(3), sp: rnd(0.55, 0.85) + d * 0.04, shots: 2 + ri(3), st: 'move', t: 0, anim: 0 };
          if (side) { e.x = side < 0 ? -8 : W + 8; e.y = g.cy + rnd(30, 110); }
          else { e.x = rnd(SL + 10, SR - 10); e.y = g.cy - 14; }
          e.tx = rnd(SL + 10, SR - 10); e.ty = rnd(24, 120);
          g.en.push(e);
        } else if (r < 0.6) {
          const ws = windowsInView().filter(w => !g.en.some(e => e.k === 'sniper' && e.win.x === w.x && Math.abs(e.win.y - w.y) < 2));
          if (ws.length) { const w = ws[ri(ws.length)]; g.en.push({ k: 'sniper', win: w, x: w.x, y: w.y, t: 0, hp: 1, pal: ri(3) }); }
        } else if (r < 0.75) {
          g.en.push({ k: 'knifer', x: rnd(SL + 10, SR - 10), y: g.cy - 14, hp: 1, pal: 1, t: 0, thrown: false, vy: 1.5 + d * 0.08, anim: 0 });
        } else if (r < 0.88 && d >= 1) {
          g.en.push({ k: 'dyna', x: rnd(SL + 10, SR - 10), y: g.cy - 14, hp: 2, pal: 2, st: 'move', t: 0, tx: rnd(SL + 10, SR - 10), ty: rnd(24, 70), sp: 0.6, throws: 2, anim: 0 });
        } else if (r < 0.95 || d < 1) {
          // a pack of three bandits marching down
          const x0 = rnd(SL + 30, SR - 30);
          for (let i = 0; i < 3; i++) g.en.push({ k: 'bandit', hp: 1, pal: 0, sp: 0.7, shots: 1, st: 'move', t: 0, anim: 0, x: x0 + (i - 1) * 18, y: g.cy - 14 - i * 6, tx: x0 + (i - 1) * 18, ty: 60 + i * 10 });
        } else {
          const dir = Math.random() < 0.5 ? 1 : -1;
          g.en.push({ k: 'rider', x: dir > 0 ? -20 : W + 20, y: g.cy + rnd(30, 90), vx: dir * (1.6 + d * 0.1), hp: 2, pal: 3, t: 0, fired: 0, anim: 0 });
        }
      }
      function moveTo(e, tx, ty, sp) {
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d < sp) { e.x = tx; e.y = ty; return true; }
        e.x += dx / d * sp; e.y += dy / d * sp; e.anim++;
        return false;
      }
      function throwDyn(x, y, tx, ty) { g.dyn.push({ x, y, sx: x, sy: y, tx, ty, t: 0, dur: 55 }); }
      function updEnemy(e) {
        e.t++;
        const sy = e.y - g.cy;
        switch (e.k) {
          case 'bandit':
            if (e.st === 'move') { if (moveTo(e, e.tx, g.cy + e.ty, e.sp)) { e.st = 'aim'; e.t = 0; e.wait = 25 + ri(35); } }
            else if (e.st === 'aim') {
              if (e.t >= e.wait) {
                aimShot(e.x, e.y + 4, bulletSpeed()); snd.eshot(); e.shots--;
                if (e.shots > 0) { e.st = 'move'; e.tx = rnd(SL + 10, SR - 10); e.ty = rnd(20, 120); }
                else { e.st = 'leave'; e.tx = e.x < 112 ? -20 : W + 20; }
              }
            } else { moveTo(e, e.tx, e.y + 0.6, e.sp + 0.3); if (e.x < -16 || e.x > W + 16) e.dead = true; }
            break;
          case 'knifer':
            e.y += e.vy; e.anim++;
            e.x += Math.sign(g.p.x - e.x) * 0.5;
            if (!e.thrown && sy > 50) {
              e.thrown = true;
              for (let i = -1; i <= 1; i++) { const a = Math.atan2(g.p.y - e.y, g.p.x - e.x) + i * 0.3; g.eb.push({ x: e.x, y: e.y, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, k: 'knife' }); }
              snd.eshot();
            }
            break;
          case 'dyna':
            if (e.st === 'move') { if (moveTo(e, e.tx, g.cy + e.ty, e.sp)) { e.st = 'aim'; e.t = 0; } }
            else if (e.st === 'aim') {
              if (e.t === 40) { throwDyn(e.x, e.y, g.p.x + rnd(-10, 10), g.p.y + rnd(-10, 10)); e.throws--; }
              if (e.t > 90) { if (e.throws > 0) { e.st = 'move'; e.tx = rnd(SL + 10, SR - 10); e.ty = rnd(20, 80); } else { e.st = 'leave'; e.tx = e.x < 112 ? -20 : W + 20; } }
            } else { moveTo(e, e.tx, e.y, 0.9); if (e.x < -16 || e.x > W + 16) e.dead = true; }
            break;
          case 'sniper':
            if (e.t === 52) { aimShot(e.x, e.y, bulletSpeed()); snd.eshot(); }
            if (e.t > 96) e.dead = true;
            break;
          case 'rider':
            e.x += e.vx; e.anim++;
            if ((e.fired === 0 && Math.abs(e.x - 112) < 50) || (e.fired === 1 && Math.abs(e.x - 112) < 10)) { aimShot(e.x, e.y + 4, bulletSpeed() + 0.4); snd.eshot(); e.fired++; }
            if (e.x < -30 || e.x > W + 30) e.dead = true;
            break;
        }
        if (e.y > g.cy + H + 20) e.dead = true;
        // contact
        if ((e.k === 'knifer' || e.k === 'rider' || e.k === 'bandit') && Math.abs(e.x - g.p.x) < (e.k === 'rider' ? 12 : 8) && Math.abs(e.y - g.p.y) < 10) hurtPlayer();
      }
      function hittable(e) { return e.k !== 'sniper' || (e.t > 16 && e.t < 84); }
      function ebox(e) { return e.k === 'rider' ? { w: 11, h: 9 } : e.k === 'sniper' ? { w: 5, h: 5 } : { w: 6, h: 8 }; }
      function killEnemy(e) {
        e.dead = true;
        const pts = { bandit: 200, knifer: 400, dyna: 500, sniper: 300, rider: 800 }[e.k] || 100;
        addScore(pts, e.x, e.y - 8);
        g.fx.push({ k: 'fall', x: e.x, y: e.y, t: 0, pal: e.pal, boss: false });
        snd.kill();
        if (e.k === 'rider' && Math.random() < 0.5) dropItem(e.x, e.y);
      }
      function dropItem(x, y) {
        const r = Math.random();
        const k = r < 0.2 ? 'boots' : r < 0.4 ? 'rifle' : r < 0.58 ? 'bullet' : r < 0.7 ? 'horse' : r < 0.9 ? 'bag' : r < 0.96 ? 'pow' : 'oneup';
        g.items.push({ k, x, y, t: 0 });
      }
      function takeItem(it) {
        const p = g.p;
        switch (it.k) {
          case 'boots': if (p.boots < 3) p.boots++; else addScore(1000, it.x, it.y); break;
          case 'rifle': if (p.rifle < 3) p.rifle++; else addScore(1000, it.x, it.y); break;
          case 'bullet': if (p.rate < 3) p.rate++; else addScore(1000, it.x, it.y); break;
          case 'horse': p.horse = 3; snd.neigh(); break;
          case 'bag': addScore(2000, it.x, it.y); break;
          case 'oneup': g.lives++; snd.oneup(); return;
          case 'pow':
            for (const e of g.en) if (hittable(e)) killEnemy(e);
            g.eb = []; snd.boom(); break;
        }
        snd.item();
      }

      // ---------- boss ----------
      function spawnBoss() {
        const k = st().boss;
        const hp = [26, 34, 30, 44][g.stage] + g.loop * 12;
        g.boss = { k, x: 112, y: g.cy - 20, hp, max: hp, t: 0, st: 'enter', flash: 0, vx: 1, burst: 0, vis: true, anim: 0 };
      }
      function updBoss() {
        const b = g.boss;
        b.t++; if (b.flash) b.flash--;
        if (b.st === 'enter') { b.y += 0.7; b.anim++; if (b.y >= g.cy + 52) { b.st = 'fight'; b.t = 0; } return; }
        if (b.st === 'dead') {
          if (b.t % 8 === 0) g.fx.push({ k: 'boom', x: b.x + rnd(-10, 10), y: b.y + rnd(-12, 12), t: 0 });
          if (b.t === 90) { g.phase = 'clear'; g.phaseT = 260; addScore(st().bounty * (g.loop + 1)); snd.clear(); }
          return;
        }
        const bs = bulletSpeed();
        const cyl = g.cy;
        switch (b.k) {
          case 'cutter':
            b.x += b.vx * (1.1 + g.loop * 0.2); b.anim++;
            if (b.x < SL + 14 || b.x > SR - 14) b.vx *= -1;
            if (b.t % 50 === 0) {
              const n = (b.t % 150 === 0) ? 5 : 3;
              for (let i = 0; i < n; i++) { const a = Math.atan2(g.p.y - b.y, g.p.x - b.x) + (i - (n - 1) / 2) * 0.25; g.eb.push({ x: b.x, y: b.y + 6, vx: Math.cos(a) * (bs + 0.3), vy: Math.sin(a) * (bs + 0.3), k: 'knife' }); }
              snd.eshot();
            }
            break;
          case 'fat':
            if (b.st === 'charge') {
              b.y += 2.2; b.anim++;
              if (b.y > cyl + 170) b.st = 'back';
            } else if (b.st === 'back') {
              b.y -= 1; b.anim++; if (b.y <= cyl + 52) { b.y = cyl + 52; b.st = 'fight'; b.t = 1; }
            } else {
              b.x += Math.sign(g.p.x - b.x) * 0.45; b.anim++;
              if (b.t % 70 === 0) { throwDyn(b.x - 6, b.y, g.p.x - 12, g.p.y); throwDyn(b.x + 6, b.y, g.p.x + 12, g.p.y); }
              if (b.t % 45 === 20) { aimShot(b.x, b.y + 6, bs); snd.eshot(); }
              if (b.t % 330 === 0) b.st = 'charge';
            }
            if (Math.abs(b.x - g.p.x) < 12 && Math.abs(b.y - g.p.y) < 16) hurtPlayer();
            break;
          case 'ninja': {
            const cyc = b.t % 110;
            if (cyc === 0) { b.vis = false; g.fx.push({ k: 'smoke', x: b.x, y: b.y, t: 0 }); }
            if (cyc === 22) { b.x = rnd(SL + 16, SR - 16); b.y = cyl + rnd(36, 110); b.vis = true; g.fx.push({ k: 'smoke', x: b.x, y: b.y, t: 0 }); }
            if (cyc === 40) { const n = 8 + g.loop * 2; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + b.t; g.eb.push({ x: b.x, y: b.y, vx: Math.cos(a) * bs * 0.85, vy: Math.sin(a) * bs * 0.85, k: 'star' }); } snd.eshot(); }
            if (cyc === 75 || cyc === 90) { aimShot(b.x, b.y, bs + 0.4); snd.eshot(); }
            break;
          }
          case 'gunman':
            b.x += b.vx * 1.6; b.anim++;
            if (b.x < SL + 14 || b.x > SR - 14) b.vx *= -1;
            if (b.t % 95 === 0) b.burst = 5;
            if (b.burst > 0 && b.t % 6 === 0) { aimShot(b.x, b.y + 6, bs + 0.6); snd.eshot(); b.burst--; }
            if (b.t % 360 === 180) for (let i = 0; i < 2; i++) g.en.push({ k: 'bandit', hp: 1, pal: 0, sp: 0.8, shots: 2, st: 'move', t: 0, anim: 0, x: i ? -8 : W + 8, y: cyl + 40, tx: rnd(SL + 10, SR - 10), ty: rnd(40, 110) });
            break;
        }
        b.y = Math.max(cyl + 20, b.y);
      }
      function hitBoss(b) {
        if (!b.vis || b.st !== 'fight' && b.st !== 'charge' && b.st !== 'back') return false;
        b.hp--; b.flash = 6; snd.thud();
        if (b.hp <= 0) { b.st = 'dead'; b.t = 0; addScore(5000, b.x, b.y - 20); snd.boom(); g.eb = []; g.en.forEach(e => { if (hittable(e)) killEnemy(e); }); }
        return true;
      }

      // ---------- main update ----------
      function updGame() {
        if (g.phase === 'over') {
          g.phaseT--;
          if (g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
          return;
        }
        if (g.phase === 'cont') return;
        // pops / fx always run
        g.pops = g.pops.filter(pp => (pp.t--, pp.y -= 0.3, pp.t > 0));
        for (const f of g.fx) { f.t++; if (f.k === 'horseoff') { f.x += f.vx; f.y += 0.8; } }
        g.fx = g.fx.filter(f => f.t < (f.k === 'fall' ? 50 : f.k === 'horseoff' ? 90 : 24));

        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'dying') {
          if (--g.phaseT <= 0) {
            g.lives--;
            if (g.lives <= 0) {
              if (api.offerContinue) {
                g.phase = 'cont'; const cg = g;
                api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, () => { if (g === cg) gameOver(); });
              } else gameOver();
            } else respawn();
          }
          return;
        }
        if (g.phase === 'clear') {
          if (--g.phaseT <= 0) {
            g.stage++; if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; }
            startStage(false);
          }
          return;
        }
        if (g.phase === 'wanted') {
          if (--g.phaseT <= 0) { g.phase = 'boss'; spawnBoss(); }
          // stragglers still act
        }
        // scroll
        if (g.phase === 'play') {
          const spd = 0.42 + Math.min(0.2, diff() * 0.03);
          g.cy -= spd; g.dist += spd;
          genObstacles();
          if (--g.spawnT <= 0) { spawnEnemy(); g.spawnT = Math.max(28, 82 - diff() * 7) + ri(40); }
          if (g.dist >= st().len) { g.phase = 'wanted'; g.phaseT = 170; snd.wanted(); }
        } else if (g.phase === 'boss' && g.boss && g.boss.st !== 'dead') {
          if (--g.spawnT <= 0) { if (g.en.length < 2 + Math.min(3, diff() >> 1)) spawnEnemy(); g.spawnT = 150 - Math.min(80, diff() * 10); }
        }
        if (g.phase !== 'wanted') updPlayer();
        if (g.phase === 'dying') return;
        const p = g.p;
        // player bullets
        for (const b of g.pb) {
          b.x += b.vx; b.y += b.vy; b.life--;
          if (b.life <= 0 || b.y < g.cy - 8 || b.x < 0 || b.x > W) { b.dead = true; continue; }
          const o = obAt(b.x, b.y, 1);
          if (o) {
            b.dead = true; o.flash = 4; snd.thud();
            if (--o.hp <= 0) {
              o.dead = true; addScore(o.k === 'barrel' ? 100 : 200, o.x + o.w / 2, o.y);
              g.fx.push({ k: 'boom', x: o.x + o.w / 2, y: o.y + o.h / 2, t: 0 });
              if (o.item) dropItem(o.x + o.w / 2, o.y + o.h / 2);
            }
            continue;
          }
          for (const e of g.en) {
            if (e.dead || !hittable(e)) continue;
            const bx = ebox(e);
            if (Math.abs(b.x - e.x) < bx.w && Math.abs(b.y - e.y) < bx.h) {
              b.dead = true; if (--e.hp <= 0) killEnemy(e); else snd.thud(); break;
            }
          }
          if (!b.dead && g.boss && Math.abs(b.x - g.boss.x) < 11 && Math.abs(b.y - g.boss.y) < 15) { if (hitBoss(g.boss)) b.dead = true; }
        }
        g.pb = g.pb.filter(b => !b.dead);
        g.obs = g.obs.filter(o => !o.dead && o.y < g.cy + H + 20);
        for (const o of g.obs) if (o.flash) o.flash--;
        // enemies
        for (const e of g.en) if (!e.dead) updEnemy(e);
        g.en = g.en.filter(e => !e.dead);
        if (g.boss) updBoss();
        // enemy bullets
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy;
          if (b.x < -6 || b.x > W + 6 || b.y < g.cy - 10 || b.y > g.cy + H + 6) { b.dead = true; continue; }
          if (obAt(b.x, b.y, 1)) { b.dead = true; continue; }
          if (Math.abs(b.x - p.x) < 4 && Math.abs(b.y - p.y) < 6) { b.dead = true; hurtPlayer(); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        // dynamite
        for (const d of g.dyn) {
          d.t++;
          const k = d.t / d.dur;
          d.x = d.sx + (d.tx - d.sx) * k; d.y = d.sy + (d.ty - d.sy) * k;
          if (d.t >= d.dur) {
            d.dead = true; g.fx.push({ k: 'blast', x: d.x, y: d.y, t: 0 }); snd.boom();
            if (Math.hypot(d.x - p.x, d.y - p.y) < 16) hurtPlayer();
          }
        }
        g.dyn = g.dyn.filter(d => !d.dead);
        // items
        for (const it of g.items) {
          it.t++;
          if (Math.abs(it.x - p.x) < 10 && Math.abs(it.y - p.y) < 12) { it.dead = true; takeItem(it); }
          if (it.y > g.cy + H + 10 || it.t > 900) it.dead = true;
        }
        g.items = g.items.filter(it => !it.dead);
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        updGame();
      }

      // ---------- rendering ----------
      function drawTown(ctx) {
        const s = st();
        ctx.fillStyle = s.g1; ctx.fillRect(0, 0, W, H);
        // wheel ruts and pebbles in the street
        const y0 = Math.floor(g.cy / 8) * 8;
        for (let y = y0; y < g.cy + H; y += 8) {
          const sy = Math.round(y - g.cy);
          const h1 = hash((y | 0) * 31 + 7);
          ctx.fillStyle = s.g2;
          ctx.fillRect(84, sy, 3, 8); ctx.fillRect(138, sy, 3, 8);
          ctx.fillRect(SL + 6 + Math.floor(h1 * 120), sy + 3, 2, 1);
          ctx.fillRect(SL + 12 + Math.floor(hash(y * 17 + 3) * 110), sy + 6, 1, 1);
        }
        // buildings
        const k0 = Math.floor(g.cy / SEG), k1 = Math.floor((g.cy + H) / SEG);
        for (let k = k0; k <= k1; k++) {
          const top = Math.round(k * SEG - g.cy);
          for (let side = 0; side < 2; side++) {
            const b = bldg(side, k);
            const bx = side ? SR + 8 : 0, wx = side ? SR + 2 : SL - 12, bwx = side ? SR : SL - 6;
            // boardwalk
            ctx.fillStyle = '#8a5a30'; ctx.fillRect(bwx, top, 6, SEG);
            ctx.fillStyle = '#6a4020'; for (let y = 0; y < SEG; y += 4) ctx.fillRect(bwx, top + y, 6, 1);
            if (b.type === 'alley') {
              ctx.fillStyle = s.g2; ctx.fillRect(side ? SR + 2 : 0, top, SL - 6, SEG);
              // cactus + fence
              ctx.fillStyle = '#3a8a3a'; const cx = side ? 204 : 16;
              ctx.fillRect(cx, top + 18, 4, 20); ctx.fillRect(cx - 5, top + 22, 3, 8); ctx.fillRect(cx - 5, top + 28, 5, 2); ctx.fillRect(cx + 5, top + 20, 3, 8); ctx.fillRect(cx + 4, top + 26, 4, 2);
              ctx.fillStyle = '#6a4020'; ctx.fillRect(side ? SR + 3 : 0, top + 2, SL - 8, 2); ctx.fillRect(side ? SR + 3 : 0, top + 50, SL - 8, 2);
              continue;
            }
            // roof
            ctx.fillStyle = s.roof[b.roof]; ctx.fillRect(bx, top + 1, SL - 8, SEG - 2);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            for (let y = 3; y < SEG - 2; y += 4) ctx.fillRect(bx, top + y, SL - 8, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, top + 1, SL - 8, 1);
            // false front facing the street
            ctx.fillStyle = s.wall; ctx.fillRect(wx, top + 1, 6, SEG - 2);
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(side ? wx : wx + 5, top + 1, 1, SEG - 2);
            if (b.type === 'saloon') {
              ctx.fillStyle = '#c03020'; ctx.fillRect(side ? bx + 4 : bx + 8, top + 20, 20, 14);
              text(ctx, 'BAR', side ? bx + 6 : bx + 10, top + 24, '#ffe080');
            } else if (b.type === 'store') {
              ctx.fillStyle = '#e8e0c0'; ctx.fillRect(side ? bx + 6 : bx + 8, top + 22, 18, 10);
              ctx.fillStyle = '#304080'; ctx.fillRect(side ? bx + 8 : bx + 10, top + 24, 14, 1); ctx.fillRect(side ? bx + 8 : bx + 10, top + 28, 10, 1);
            }
            for (const o of b.wins) { ctx.fillStyle = '#1a0c04'; ctx.fillRect(wx - (side ? 1 : -1) * 0 + (side ? 2 : -2), top + o, 6, 11); }
          }
        }
      }
      function dc(ctx, img, x, y) { ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - g.cy - img.height / 2)); }
      function drawObs(ctx) {
        for (const o of g.obs) {
          const x = Math.round(o.x), y = Math.round(o.y - g.cy);
          if (y > H || y + o.h < 0) continue;
          if (o.k === 'barrel') {
            ctx.fillStyle = o.flash ? '#fff' : '#8a4a20'; ctx.fillRect(x + 1, y, o.w - 2, o.h); ctx.fillRect(x, y + 2, o.w, o.h - 4);
            ctx.fillStyle = '#3a2010'; ctx.fillRect(x, y + 3, o.w, 1); ctx.fillRect(x, y + o.h - 4, o.w, 1);
            ctx.fillStyle = '#b06a30'; ctx.fillRect(x + 2, y + 1, 2, o.h - 2);
          } else if (o.k === 'crate') {
            ctx.fillStyle = o.flash ? '#fff' : '#b08040'; ctx.fillRect(x, y, o.w, o.h);
            ctx.fillStyle = '#5a3a18'; ctx.fillRect(x, y, o.w, 1); ctx.fillRect(x, y + o.h - 1, o.w, 1); ctx.fillRect(x, y, 1, o.h); ctx.fillRect(x + o.w - 1, y, 1, o.h);
            for (let i = 0; i < o.w - 2; i++) ctx.fillRect(x + 1 + i, y + 1 + Math.floor(i * (o.h - 2) / (o.w - 2)), 1, 1);
          } else {
            ctx.fillStyle = '#5a3a18'; ctx.fillRect(x, y, o.w, o.h);
            ctx.fillStyle = '#3070c0'; ctx.fillRect(x + 2, y + 2, o.w - 4, o.h - 4);
            ctx.fillStyle = '#80b0ff'; ctx.fillRect(x + 4, y + 3, 6, 1);
          }
        }
      }
      function drawMan(ctx, set, x, y, anim, flash) {
        const img = (anim >> 3) & 1 ? set.b : set.a;
        dc(ctx, img, x, y);
        if (flash) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(Math.round(x - 6), Math.round(y - g.cy - 8), 12, 16); }
      }
      function drawEnemy(ctx, e) {
        const set = ES[e.pal];
        if (e.k === 'sniper') {
          const w = e.win, rise = e.t < 16 ? e.t / 16 : e.t > 84 ? Math.max(0, (96 - e.t) / 12) : 1;
          const wy = Math.round(w.y - g.cy - 5), wx = w.side ? SR + 4 : SL - 14;
          ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, 6, 11); ctx.clip();
          ctx.drawImage(set.a, wx - 3, wy + 11 - Math.round(rise * 11));
          ctx.restore();
          if (e.t > 40 && e.t < 52 && (e.t & 2)) { ctx.fillStyle = '#ffff80'; ctx.fillRect(wx + 2, wy + 9, 2, 2); }
          return;
        }
        if (e.k === 'rider') {
          const img = e.vx > 0 ? ((e.anim >> 3) & 1 ? HS.sb : HS.sa) : ((e.anim >> 3) & 1 ? HS.sbL : HS.saL);
          dc(ctx, img, e.x, e.y + 4);
          ctx.save(); ctx.beginPath(); ctx.rect(Math.round(e.x - 6), Math.round(e.y - g.cy - 14), 12, 12); ctx.clip();
          ctx.drawImage(set.a, Math.round(e.x - 6), Math.round(e.y - g.cy - 14)); ctx.restore();
          return;
        }
        drawMan(ctx, set, e.x, e.y, e.anim || 0, false);
        if (e.k === 'dyna' && e.st === 'aim' && e.t < 40) { ctx.fillStyle = '#e02020'; ctx.fillRect(Math.round(e.x + 5), Math.round(e.y - g.cy - 10), 2, 6); ctx.fillStyle = (frame & 2) ? '#ffff00' : '#ff8000'; ctx.fillRect(Math.round(e.x + 5), Math.round(e.y - g.cy - 12), 2, 2); }
      }
      function drawBoss(ctx) {
        const b = g.boss; if (!b) return;
        const set = BS[g.stage];
        const x = Math.round(b.x - 12), y = Math.round(b.y - g.cy - 16);
        if (b.st === 'dead') { ctx.drawImage(set.fall, x - 4, y + 12, 32, 12); return; }
        if (!b.vis) return;
        ctx.drawImage((b.anim >> 4) & 1 ? set.b : set.a, x, y, 24, 32);
        if (b.flash) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x, y, 24, 32); }
        if (b.k === 'fat') { ctx.fillStyle = '#e08020'; ctx.fillRect(x + 2, y + 16, 20, 6); }
        if (b.k === 'ninja') { ctx.fillStyle = '#102030'; ctx.fillRect(x + 4, y + 8, 16, 4); }
      }
      function drawPlayer(ctx) {
        const p = g.p;
        if (g.phase === 'dying') {
          const t = 150 - g.phaseT;
          if (t < 20) dc(ctx, SPR.pA, p.x, p.y);
          else dc(ctx, SPR.pFall, p.x, p.y + 4);
          return;
        }
        if (p.inv > 0 && (p.inv & 4) && p.horse === 0) return;
        if (p.horse > 0) {
          dc(ctx, (p.walk >> 3) & 1 ? HS.b : HS.a, p.x, p.y + 2);
          ctx.save(); ctx.beginPath(); ctx.rect(0, Math.round(p.y - g.cy - 14), W, 11); ctx.clip();
          dc(ctx, SPR.pA, p.x, p.y - 6); ctx.restore();
          if (p.inv > 0 && (p.inv & 4)) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(Math.round(p.x - 6), Math.round(p.y - g.cy - 14), 12, 26); }
          return;
        }
        dc(ctx, (p.walk >> 3) & 1 ? SPR.pB : SPR.pA, p.x, p.y);
      }
      function drawShots(ctx) {
        ctx.fillStyle = '#ffffa0';
        for (const b of g.pb) ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - g.cy - 2), 2, 4);
        for (const b of g.eb) {
          const x = Math.round(b.x), y = Math.round(b.y - g.cy);
          if (b.k === 'knife') { ctx.fillStyle = '#e0e0f0'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#806040'; ctx.fillRect(x, y, 1, 1); }
          else if (b.k === 'star') { ctx.fillStyle = (frame & 4) ? '#ffffff' : '#a0a0c0'; ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5); }
          else { ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#ff4020'; ctx.fillRect(x, y, 1, 1); }
        }
        for (const d of g.dyn) {
          const k = d.t / d.dur, arc = Math.sin(k * Math.PI) * 26;
          const x = Math.round(d.x), y = Math.round(d.y - g.cy - arc);
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 2, Math.round(d.y - g.cy), 4, 2);
          ctx.fillStyle = '#e02020'; ctx.fillRect(x - 1, y - 3, 3, 6);
          ctx.fillStyle = (frame & 2) ? '#ffff00' : '#ff8000'; ctx.fillRect(x, y - 5, 1, 2);
        }
      }
      function drawFx(ctx) {
        for (const f of g.fx) {
          const x = Math.round(f.x), y = Math.round(f.y - g.cy);
          if (f.k === 'fall') { if (f.t < 40 || (f.t & 2)) dc(ctx, (f.boss ? BS[0] : ES[f.pal]).fall, f.x, f.y + 4); }
          else if (f.k === 'boom' || f.k === 'blast') {
            const r = f.k === 'blast' ? 4 + f.t * 0.7 : 2 + f.t * 0.4;
            ctx.fillStyle = f.t < 8 ? '#ffffff' : f.t < 16 ? '#ffd040' : '#e04010';
            ctx.fillRect(x - r, y - r / 2, r * 2, r); ctx.fillRect(x - r / 2, y - r, r, r * 2);
          } else if (f.k === 'smoke') {
            ctx.fillStyle = 'rgba(220,220,220,' + (1 - f.t / 24) + ')';
            const r = 4 + f.t * 0.5; ctx.fillRect(x - r, y - r, r * 2, r * 2);
          } else if (f.k === 'horseoff') dc(ctx, (f.t >> 3) & 1 ? HS.b : HS.a, f.x, f.y);
        }
        for (const pp of g.pops) text(ctx, pp.s, pp.x, Math.round(pp.y - g.cy), '#ffffff', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 18);
        text(ctx, '1P', 6, 2, '#ff4040');
        text(ctx, String(g ? g.score : 0), 70, 10, '#ffffff', 1, 'right');
        text(ctx, 'HI-SCORE', 112, 2, '#ff4040', 1, 'center');
        text(ctx, String(hi), 136, 10, '#ffffff', 1, 'right');
        if (!g || mode !== 'game') return;
        text(ctx, 'STAGE ' + (g.stage + 1), W - 4, 2, '#ffd040', 1, 'right');
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H - 12, W, 12);
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) ctx.drawImage(SPR.pA, 4 + i * 12, H - 13, 8, 11);
        const ic = [['boots', g.p.boots], ['rifle', g.p.rifle], ['bullet', g.p.rate]];
        let x = 80;
        for (const [k, n] of ic) { ctx.drawImage(IS[k], x, H - 11); for (let i = 0; i < 3; i++) { ctx.fillStyle = i < n ? '#ffd040' : '#503820'; ctx.fillRect(x + 12, H - 10 + i * 3, 4, 2); } x += 22; }
        if (g.p.horse > 0) { ctx.drawImage(IS.horse, x + 4, H - 11); text(ctx, 'X' + g.p.horse, x + 16, H - 10, '#fff'); }
      }
      function drawPoster(ctx, idx, x, y, scale) {
        const s = STAGES[idx];
        ctx.fillStyle = '#e8d8a8'; ctx.fillRect(x, y, 96, 120);
        ctx.fillStyle = '#c8b080'; ctx.fillRect(x, y, 96, 2); ctx.fillRect(x, y + 118, 96, 2); ctx.fillRect(x, y, 2, 120); ctx.fillRect(x + 94, y, 2, 120);
        text(ctx, 'WANTED', x + 48, y + 6, '#401808', 2, 'center');
        ctx.fillStyle = '#b8a070'; ctx.fillRect(x + 24, y + 26, 48, 48);
        ctx.drawImage(BS[idx].a, x + 30, y + 28, 36, 48);
        text(ctx, s.name, x + 48, y + 80, '#401808', 1, 'center');
        text(ctx, 'REWARD', x + 48, y + 92, '#802010', 1, 'center');
        text(ctx, '$' + s.bounty * (g ? g.loop + 1 : 1), x + 48, y + 104, '#802010', 1, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#2a1408'; ctx.fillRect(0, 0, W, H);
        // sunset bands
        const bands = ['#ff8030', '#ff6028', '#e04020', '#a02818', '#601810'];
        bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, 40 + i * 10, W, 10); });
        ctx.fillStyle = '#ffd060'; ctx.fillRect(92, 64, 40, 20); ctx.fillRect(98, 60, 28, 4);
        ctx.fillStyle = '#2a1408'; ctx.fillRect(0, 86, W, 4);
        // town silhouette
        ctx.fillStyle = '#1a0a04';
        [[0, 70, 30], [30, 62, 24], [60, 74, 20], [140, 66, 26], [166, 58, 30], [196, 72, 28]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 90 - y));
        const page = Math.floor(titleT / 420) % 2;
        if (page === 0) {
          text(ctx, 'GUN.SMOKE', W / 2 + 2, 104, '#401808', 3, 'center');
          text(ctx, 'GUN.SMOKE', W / 2, 102, '#ffd890', 3, 'center');
          text(ctx, 'THE WILD WEST BOUNTY HUNTER', W / 2, 130, '#ffb060', 1, 'center');
          ctx.drawImage(SPR.pA, W / 2 - 12, 146, 24, 32);
          text(ctx, 'EXTEND 30000 / 100000 PTS', W / 2, 188, '#c0c0c0', 1, 'center');
          text(ctx, 'HI-SCORE ' + hi, W / 2, 200, '#ffffff', 1, 'center');
        } else {
          text(ctx, '- MOST WANTED -', W / 2, 100, '#ffd890', 1, 'center');
          const k = Math.floor(titleT / 105) % 4;
          drawPoster(ctx, k, W / 2 - 48, 112, 1);
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, 220, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 220, '#40ffff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#ffffff');
        text(ctx, '\u00a9 1985 CAPCOM', W - 4, H - 10, '#c0a080', 1, 'right');
      }
      function render(ctx) {
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawTown(ctx);
        drawObs(ctx);
        for (const it of g.items) if (it.t < 700 || (frame & 4)) dc(ctx, IS[it.k], it.x, it.y);
        for (const e of g.en) drawEnemy(ctx, e);
        drawBoss(ctx);
        drawPlayer(ctx);
        drawShots(ctx);
        drawFx(ctx);
        if (g.boss && g.boss.st !== 'dead') {
          ctx.fillStyle = '#000'; ctx.fillRect(40, 20, 144, 5);
          ctx.fillStyle = '#e03020'; ctx.fillRect(41, 21, Math.round(142 * g.boss.hp / g.boss.max), 3);
        }
        drawHUD(ctx);
        if (g.phase === 'intro') {
          text(ctx, 'STAGE ' + (g.stage + 1), W / 2, 100, '#ffffff', 2, 'center');
          text(ctx, 'READY', W / 2, 124, (frame >> 3) & 1 ? '#ffd040' : '#ff6020', 1, 'center');
        }
        if (g.phase === 'wanted') drawPoster(ctx, g.stage, W / 2 - 48, 60, 1);
        if (g.phase === 'clear') {
          text(ctx, 'BOUNTY COLLECTED', W / 2, 96, '#ffd040', 1, 'center');
          text(ctx, '$' + st().bounty * (g.loop + 1), W / 2, 112, '#ffffff', 2, 'center');
        }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 110, '#ff4040', 2, 'center');
      }
      if (api.debugHook) api.debugHook({ inv: () => { if (g && g.p) g.p.inv = Math.max(g.p.inv, 2); }, sum: () => g && { mode, ph: g.phase, st: g.stage, loop: g.loop, lives: g.lives, sc: g.score, dist: g.dist | 0, en: g.en.length, ob: g.obs.length, boss: g.boss && g.boss.hp, p: [g.p.boots, g.p.rifle, g.p.rate, g.p.horse] } });
      return { update, render, destroy() { } };
    }
  });
})();
