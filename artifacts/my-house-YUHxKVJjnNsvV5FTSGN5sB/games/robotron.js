// Robotron: 2084 (Williams, 1982) \u2014 written from scratch for the MAME32 Game Room.
// Twin-stick arena shooter: arrows move, WASD fire (Space fires the way you are moving).
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
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  // ---------- run-length pixel sprites ----------
  function makeSpr(rows, pal) {
    const runs = []; let w = 0;
    rows.forEach((r, y) => {
      w = Math.max(w, r.length);
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (!pal[ch]) { x++; continue; }
        let e = x + 1; while (e < r.length && r[e] === ch) e++;
        runs.push({ x, y, n: e - x, c: pal[ch], k: ch }); x = e;
      }
    });
    return { w, h: rows.length, runs };
  }
  function drawSpr(ctx, s, cx, cy, o) {
    o = o || {};
    const x0 = Math.round(cx - s.w / 2), y0 = Math.round(cy - s.h / 2);
    const sx = o.sx || 0, sy = o.sy || 0;
    for (const r of s.runs) {
      ctx.fillStyle = o.col || (o.pal && o.pal[r.k]) || r.c;
      const xx = o.flip ? s.w - r.x - r.n : r.x;
      const d = r.y - s.h / 2;
      ctx.fillRect(x0 + xx + Math.round(d * sx), y0 + r.y + Math.round(d * sy), r.n, 1);
    }
  }

  const W = 292, H = 240, AX0 = 4, AY0 = 14, AX1 = 288, AY1 = 229, CX = 146, CY = 122;
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0, sgn = v => (v > 0.5 ? 1 : v < -0.5 ? -1 : 0);

  // ---------- art ----------
  const PH = { Y: '#ffd200', W: '#ffffff', R: '#ff2020', B: '#3060ff', S: '#ffb090' };
  const HERO = [makeSpr([
    '..YYY..', '..SSS..', '..SWS..', '.RRRRR.', 'R.RRR.R', 'S.RRR.S', '..BBB..', '..B.B..', '..B.B..', '..B.B..', '.WW.WW.'], PH),
  makeSpr([
    '..YYY..', '..SSS..', '..SWS..', '.RRRRR.', 'R.RRR.R', 'S.RRR.S', '..BBB..', '.B...B.', '.B...B.', 'B.....B', 'W.....W'], PH)];
  const PG = { R: '#ff2020', Y: '#ffd200', B: '#2848ff' };
  const GRUNT = [makeSpr([
    '...YYY...', '..RRRRR..', '..RBRBR..', '.RRRRRRR.', 'R.RRRRR.R', 'R..YYY..R', '...RRR...', '..RR.RR..', '..R...R..', '.RR...RR.'], PG),
  makeSpr([
    '...YYY...', '..RRRRR..', '..RBRBR..', '.RRRRRRR.', 'R.RRRRR.R', '...YYY...', 'R..RRR..R', '...R.R...', '...R.R...', '..RR.RR..'], PG)];
  const PHU = { G: '#20e020', R: '#ff3030', W: '#ffffff' };
  const HULK = [makeSpr([
    '....GGG....', '...GGGGG...', '...GWGWG...', '.GGGGGGGGG.', 'GGGGGGGGGGG', 'GG.GGGGG.GG', 'GG.GGGGG.GG', 'RR.RRRRR.RR',
    '...GGGGG...', '...GG.GG...', '...GG.GG...', '...GG.GG...', '..GGG.GGG..', '..RRR.RRR..'], PHU),
  makeSpr([
    '....GGG....', '...GGGGG...', '...GWGWG...', '.GGGGGGGGG.', 'GGGGGGGGGGG', 'GG.GGGGG.GG', 'GG.GGGGG.GG', 'RR.RRRRR.RR',
    '...GGGGG...', '...GG.GG...', '..GG...GG..', '..GG...GG..', '.GGG...GGG.', '.RRR...RRR.'], PHU)];
  const PB = { P: '#d040ff', M: '#ff90ff', W: '#ffffff', R: '#ff2020', B: '#4060ff' };
  const BRAIN = [makeSpr([
    '..PPPPP..', '.PPMPMPP.', 'PMPPPPPMP', 'PPPMPMPPP', '.PPPPPPP.', '..WRWRW..', '...WWW...', '..BBBBB..', '.B.BBB.B.',
    '.W.BBB.W.', '...B.B...', '...B.B...', '..BB.BB..'], PB),
  makeSpr([
    '..PPPPP..', '.PPMPMPP.', 'PMPPPPPMP', 'PPPMPMPPP', '.PPPPPPP.', '..WRWRW..', '...WWW...', '..BBBBB..', '.B.BBB.B.',
    '.W.BBB.W.', '...B.B...', '..B...B..', '.BB...BB.'], PB)];
  const ENFORCER = makeSpr(['....W....', '...WCW...', '..WCCCW..', '.WCCWCCW.', 'WCCWWWCCW', '.WCCWCCW.', '..WCCCW..', '...WCW...', '....W....'],
    { W: '#ffffff', C: '#30a0ff' });
  const PHM = { Y: '#ffd200', S: '#ffb090', P: '#ff40a0', R: '#ff2020', N: '#a86030', C: '#30c0ff', B: '#3060ff' };
  const HUMANS = {
    mommy: makeSpr(['..YYY..', '.YYYYY.', '.YSSSY.', '..SSS..', '.PPPPP.', 'P.PPP.P', 'S.PPP.S', '.PPPPP.', 'PPPPPPP', '..S.S..', '..S.S..', '.RR.RR.'], PHM),
    daddy: makeSpr(['..NNN..', '..SSS..', '..SSS..', '.CCCCC.', 'C.CCC.C', 'S.CCC.S', '..CCC..', '..B.B..', '..B.B..', '..B.B..', '..B.B..', '.NN.NN.'], PHM),
    mikey: makeSpr(['.NNN.', '.SSS.', '.SSS.', 'RRRRR', 'SRRRS', '.RRR.', '.B.B.', '.B.B.', 'BB.BB'], PHM)
  };
  const SKULL = makeSpr(['.WWWWW.', 'WWWWWWW', 'W..W..W', 'WWW.WWW', '.WWWWW.', '.W.W.W.'], { W: '#e0e0e0' });
  const ELEC = [
    ['XXXXXXX', 'X.....X', 'X.XXX.X', 'X.X.X.X', 'X.XXX.X', 'X.....X', 'XXXXXXX'],
    ['...X...', '..X.X..', '.X.X.X.', 'X.XXX.X', '.X.X.X.', '..X.X..', '...X...'],
    ['X.....X', '.X...X.', '..X.X..', '...X...', '..X.X..', '.X...X.', 'X.....X'],
    ['...X...', '..XXX..', '..X.X..', '.X.X.X.', '.X...X.', 'X.XXX.X', 'XXXXXXX'],
    ['...X...', '..XXX..', '...X...', 'XX.X.XX', '...X...', '..XXX..', '...X...']
  ].map(r => makeSpr(r, { X: '#fff' }));
  const ECOL = ['#ff3030', '#30ff30', '#3090ff', '#ffff30', '#ff30ff', '#30ffff', '#ff9020'];
  const RING = [];
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const r = Math.round(Math.sqrt(x * x + y * y)); if (r <= 4) RING.push([x, y, r]); }
  const CYC = ['#ff2020', '#ff9000', '#ffff00', '#20ff20', '#20ffff', '#2060ff', '#d040ff', '#ffffff'];

  // grunts, electrodes, hulks, brains, spheroids, mommies, daddies, mikeys
  const WAVES = [
    [15, 5, 0, 0, 0, 1, 1, 1],
    [17, 15, 5, 0, 1, 1, 1, 1],
    [22, 25, 6, 0, 3, 2, 2, 2],
    [34, 25, 7, 0, 4, 2, 2, 2],
    [20, 20, 0, 15, 1, 15, 0, 1],
    [32, 25, 7, 0, 4, 3, 3, 3],
    [12, 0, 12, 0, 6, 4, 4, 4],
    [35, 25, 8, 0, 5, 3, 3, 3],
    [60, 0, 4, 0, 5, 3, 3, 3],
    [25, 20, 0, 20, 1, 0, 22, 0]
  ];
  const REQUIRED = { grunt: 1, brain: 1, prog: 1, sphere: 1, enforcer: 1 };
  const POINTS = { grunt: 100, brain: 500, prog: 100, sphere: 1000, enforcer: 150, missile: 25, spark: 25, electrode: 0 };

  ArcadeRegistry.register({
    id: 'robotron', title: 'Robotron: 2084', year: 1982, maker: 'Williams',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 WASD: fire direction \u00b7 Space: fire where moving \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#ff2a2a', accent: '#ffd200' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(25000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');

      const snd = {
        shot() { au.tone(1900, 0.04, { type: 'square', vol: 0.045, slideTo: 800 }); },
        boom() { au.noise(0.13, { vol: 0.11, freq: 3800, slideTo: 300 }); },
        big() { au.noise(0.35, { vol: 0.15, freq: 2000, slideTo: 150 }); au.tone(400, 0.3, { type: 'sawtooth', vol: 0.07, slideTo: 60 }); },
        zap() { au.tone(2600, 0.06, { type: 'square', vol: 0.05, slideTo: 3800 }); },
        rescue(n) { au.melody([[880, 0.04], [1175, 0.04], [1568, 0.04], [1760 + n * 120, 0.12]], { type: 'square', vol: 0.09 }); },
        humanDie() { au.tone(700, 0.4, { type: 'sawtooth', vol: 0.11, slideTo: 70 }); },
        prog() { au.tone(150, 0.45, { type: 'square', vol: 0.08, slideTo: 1800 }); },
        enf() { au.tone(500, 0.12, { type: 'triangle', vol: 0.1, slideTo: 1600 }); },
        spark() { au.tone(2400, 0.05, { type: 'square', vol: 0.035, slideTo: 1200 }); },
        missile() { au.tone(300, 0.15, { type: 'sawtooth', vol: 0.05, slideTo: 900 }); },
        hulk() { au.tone(110, 0.04, { type: 'square', vol: 0.06 }); },
        die() { au.noise(1.2, { vol: 0.2, freq: 5000, slideTo: 60 }); au.tone(1200, 1.2, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); },
        wave() { au.tone(70, 0.7, { type: 'sawtooth', vol: 0.09, slideTo: 1400 }); au.tone(105, 0.7, { type: 'square', vol: 0.05, slideTo: 2100, delay: 0.05 }); },
        clear() { au.melody([[523, 0.05], [659, 0.05], [784, 0.05], [1047, 0.05], [784, 0.05], [1047, 0.2]], { type: 'square', vol: 0.08 }); },
        life() { au.melody([[1047, 0.07], [1319, 0.07], [1568, 0.07], [2093, 0.18]], { type: 'square', vol: 0.1 }); }
      };

      // ---------- game setup ----------
      function newGame() {
        g = {
          wave: 1, score: 0, lives: 3, nextLife: 25000, en: [], hum: [], shots: [], fx: [], parts: [], pops: [], skulls: [],
          phase: 'enter', phaseT: 60, rescueN: 0, waveT: 0, flash: 0,
          p: { x: CX, y: CY, dx: 0, dy: -1, fireT: 0, walk: 0, hw: 3, hh: 5 }
        };
        setupWave();
      }
      const speedMul = () => Math.min(2.1, 1 + (g.wave - 1) * 0.045);
      function pickPos(minD) {
        let x = CX, y = CY;
        for (let i = 0; i < 60; i++) {
          x = AX0 + 10 + rnd(AX1 - AX0 - 20); y = AY0 + 10 + rnd(AY1 - AY0 - 20);
          if (Math.hypot(x - CX, y - CY) > minD) break;
        }
        return [x, y];
      }
      function mk(type, x, y) {
        const e = { type, x, y, t: 0, hw: 4, hh: 5, vx: 0, vy: 0, timer: irnd(30), dir: irnd(4), anim: irnd(2), grow: 0 };
        switch (type) {
          case 'hulk': e.hw = 5; e.hh = 7; break;
          case 'brain': e.hh = 6; e.fire = 120 + rnd(160); break;
          case 'prog': e.hw = 3; e.hh = 5; e.trail = []; e.kind = 'mommy'; break;
          case 'sphere': e.hw = 4; e.hh = 4; e.spawned = 0; e.max = 3 + (g.wave > 6 ? 1 : 0); e.spawnT = 50 + rnd(120); break;
          case 'enforcer': e.hw = 4; e.hh = 4; e.grow = 24; e.fire = 50 + rnd(90); e.tx = x; e.ty = y; break;
          case 'electrode': e.hw = 3; e.hh = 3; break;
          case 'missile': e.hw = 2; e.hh = 2; e.life = 360; break;
          case 'spark': e.hw = 2; e.hh = 2; e.life = 160; break;
        }
        return e;
      }
      function setupWave() {
        const row = WAVES[(g.wave - 1) % 10], cyc = Math.floor((g.wave - 1) / 10);
        const sc = n => Math.min(n + Math.round(n * 0.15 * cyc), 80);
        g.en = []; g.hum = []; g.shots = []; g.fx = []; g.parts = []; g.pops = []; g.skulls = [];
        g.p.x = CX; g.p.y = CY; g.p.dx = 0; g.p.dy = -1; g.waveT = 0; g.rescueN = 0;
        const add = (type, n, d) => { for (let i = 0; i < n; i++) { const [x, y] = pickPos(d); g.en.push(mk(type, x, y)); } };
        add('electrode', Math.min(row[1] + cyc * 2, 30), 34);
        add('grunt', sc(row[0]), 48);
        add('hulk', Math.min(row[2] + cyc, 14), 56);
        add('brain', sc(row[3]), 60);
        add('sphere', Math.min(row[4] + cyc, 8), 60);
        const fam = (kind, n) => { for (let i = 0; i < n; i++) { const [x, y] = pickPos(22); g.hum.push({ kind, x, y, dir: irnd(4), timer: irnd(80), conv: 0, hw: 3, hh: 5, anim: 0 }); } };
        fam('mommy', row[5]); fam('daddy', row[6]); fam('mikey', row[7]);
        g.phase = 'enter'; g.phaseT = 60; snd.wave();
      }
      function respawn() {
        const p = g.p; p.x = CX; p.y = CY; p.dx = 0; p.dy = -1; g.rescueN = 0;
        g.en = g.en.filter(e => e.type !== 'spark' && e.type !== 'missile');
        for (const e of g.en) if (e.type !== 'electrode') { const [x, y] = pickPos(70); e.x = x; e.y = y; e.vx = e.vy = 0; }
        g.shots = []; g.parts = []; g.phase = 'enter'; g.phaseT = 50; g.waveT = 0; snd.wave();
      }
      function addScore(n) {
        g.score += n;
        while (g.score >= g.nextLife) { g.lives++; g.nextLife += 25000; snd.life(); }
        if (g.score > hi) hi = g.score;
      }
      function overlap(a, b, m) { m = m || 0; return Math.abs(a.x - b.x) < a.hw + b.hw - m && Math.abs(a.y - b.y) < a.hh + b.hh - m; }
      function burst(x, y, col, n, sp) {
        for (let i = 0; i < n; i++) { const a = rnd(Math.PI * 2), v = rnd(sp || 2) + 0.3; g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 20 + irnd(15), col }); }
      }
      function sprOf(e) {
        switch (e.type) {
          case 'grunt': return GRUNT[e.anim & 1];
          case 'hulk': return HULK[e.anim & 1];
          case 'brain': return BRAIN[e.anim & 1];
          case 'enforcer': return ENFORCER;
          case 'prog': return HUMANS[e.kind];
        }
        return null;
      }
      function kill(e, s) {
        e.dead = true;
        addScore(POINTS[e.type] || 0);
        const spr = sprOf(e);
        if (spr) g.fx.push({ spr, x: e.x, y: e.y, t: 0, horiz: s ? Math.abs(s.vx) > Math.abs(s.vy) : true, col: e.type === 'prog' ? CYC[frame & 7] : null });
        if (e.type === 'sphere') { burst(e.x, e.y, '#ffffff', 18, 2.5); burst(e.x, e.y, '#ff40ff', 10, 1.5); }
        if (e.type === 'electrode') burst(e.x, e.y, ECOL[(g.wave - 1) % ECOL.length], 8, 1.2);
        if (e.type === 'missile' || e.type === 'spark') burst(e.x, e.y, '#ffffff', 5, 1);
        if (e.type === 'brain' || e.type === 'sphere') { snd.big(); g.pops.push({ x: e.x, y: e.y - 8, txt: String(POINTS[e.type]), t: 50 }); }
        else if (e.type === 'electrode' || e.type === 'spark' || e.type === 'missile') snd.zap();
        else snd.boom();
      }

      // ---------- per-frame game logic ----------
      function shotHit(s) {
        const pt = { x: s.x, y: s.y, hw: 1.5, hh: 1.5 };
        for (const e of g.en) {
          if (e.dead || !overlap(pt, e)) continue;
          if (e.type === 'hulk') {
            e.x += Math.sign(s.vx) * 3; e.y += Math.sign(s.vy) * 3;
            e.x = Math.max(AX0 + 6, Math.min(AX1 - 6, e.x)); e.y = Math.max(AY0 + 8, Math.min(AY1 - 8, e.y));
            snd.hulk(); return true;
          }
          kill(e, s); return true;
        }
        return false;
      }
      function nearestHuman(e, maxD) {
        let best = null, bd = maxD || 1e9;
        for (const h of g.hum) { if (h.dead || h.conv) continue; const d = Math.abs(h.x - e.x) + Math.abs(h.y - e.y); if (d < bd) { bd = d; best = h; } }
        return best;
      }
      const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      function clampE(e) {
        let hitw = false;
        if (e.x < AX0 + e.hw + 1) { e.x = AX0 + e.hw + 1; hitw = true; }
        if (e.x > AX1 - e.hw - 1) { e.x = AX1 - e.hw - 1; hitw = true; }
        if (e.y < AY0 + e.hh + 1) { e.y = AY0 + e.hh + 1; hitw = true; }
        if (e.y > AY1 - e.hh - 1) { e.y = AY1 - e.hh - 1; hitw = true; }
        return hitw;
      }
      function count(type) { let n = 0; for (const e of g.en) if (e.type === type && !e.dead) n++; return n; }
      function updEnemy(e, sm) {
        const p = g.p; e.t++;
        switch (e.type) {
          case 'grunt': {
            if (--e.timer <= 0) {
              const iv = Math.max(3, 17 - g.wave * 0.7 - g.waveT / 170);
              e.timer = Math.round(iv * (0.7 + rnd(0.6)));
              const dx = p.x - e.x, dy = p.y - e.y;
              if (Math.abs(dx) > 1) e.x += Math.sign(dx) * 2;
              if (Math.abs(dy) > 1) e.y += Math.sign(dy) * 2;
              e.anim ^= 1; clampE(e);
            }
            break;
          }
          case 'hulk': {
            if (--e.timer <= 0) {
              e.timer = 40 + irnd(80);
              const h = nearestHuman(e, 120);
              if (h && Math.random() < 0.7) {
                const dx = h.x - e.x, dy = h.y - e.y;
                e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
              } else if (Math.random() < 0.3) {
                const dx = p.x - e.x, dy = p.y - e.y;
                e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
              } else e.dir = irnd(4);
            }
            if (frame % 2 === 0) {
              const sp = Math.min(1.2, 0.8 * sm);
              e.x += DIRS[e.dir][0] * sp; e.y += DIRS[e.dir][1] * sp;
              if (clampE(e)) e.dir = (e.dir + 2) % 4;
            }
            if ((e.t & 7) === 0) e.anim ^= 1;
            break;
          }
          case 'brain': {
            const h = nearestHuman(e);
            const tx = h ? h.x : p.x, ty = h ? h.y : p.y, sp = 0.4 * sm;
            if (Math.abs(tx - e.x) > 1) e.x += Math.sign(tx - e.x) * sp;
            if (Math.abs(ty - e.y) > 1) e.y += Math.sign(ty - e.y) * sp;
            clampE(e);
            if ((e.t & 15) === 0) e.anim ^= 1;
            if (--e.fire <= 0) {
              e.fire = (160 + rnd(160)) / sm;
              if (count('missile') < 8) { const m = mk('missile', e.x, e.y); g.en.push(m); snd.missile(); }
            }
            break;
          }
          case 'prog': {
            if ((e.t % 3) === 0) { e.trail.unshift([e.x, e.y]); if (e.trail.length > 5) e.trail.pop(); }
            if (--e.timer <= 0) {
              e.timer = 8 + irnd(10);
              const dx = p.x - e.x, dy = p.y - e.y;
              const horiz = Math.random() < (Math.abs(dx) / (Math.abs(dx) + Math.abs(dy) + 0.01));
              const sp = Math.min(2.2, 1.3 * sm);
              e.vx = horiz ? Math.sign(dx) * sp : 0; e.vy = horiz ? 0 : Math.sign(dy) * sp;
            }
            e.x += e.vx; e.y += e.vy; clampE(e);
            break;
          }
          case 'sphere': {
            if (e.tx == null || --e.timer <= 0) {
              e.timer = 70 + irnd(90);
              e.tx = Math.random() < 0.5 ? AX0 + 20 + rnd(50) : AX1 - 20 - rnd(50);
              e.ty = Math.random() < 0.5 ? AY0 + 20 + rnd(40) : AY1 - 20 - rnd(40);
              if (Math.random() < 0.3) { e.tx = p.x + rnd(80) - 40; e.ty = p.y + rnd(80) - 40; }
            }
            const mx = Math.min(2.4, 1.6 * sm);
            e.vx = Math.max(-mx, Math.min(mx, e.vx + Math.sign(e.tx - e.x) * 0.09));
            e.vy = Math.max(-mx, Math.min(mx, e.vy + Math.sign(e.ty - e.y) * 0.09));
            e.x += e.vx; e.y += e.vy;
            if (clampE(e)) { e.vx *= -0.6; e.vy *= -0.6; }
            if (--e.spawnT <= 0) {
              if (e.spawned < e.max) {
                if (count('enforcer') < 14) { g.en.push(mk('enforcer', e.x, e.y)); e.spawned++; snd.enf(); }
                e.spawnT = (80 + rnd(100)) / sm;
              } else { e.dead = true; burst(e.x, e.y, '#ff40ff', 8, 1); }
            }
            break;
          }
          case 'enforcer': {
            if (e.grow > 0) { e.grow--; break; }
            if (--e.timer <= 0) { e.timer = 25 + irnd(40); e.tx = p.x + rnd(90) - 45; e.ty = p.y + rnd(90) - 45; }
            const mx = Math.min(2.2, 1.2 * sm);
            e.vx = Math.max(-mx, Math.min(mx, e.vx + Math.sign(e.tx - e.x) * 0.07));
            e.vy = Math.max(-mx, Math.min(mx, e.vy + Math.sign(e.ty - e.y) * 0.07));
            e.x += e.vx; e.y += e.vy;
            if (clampE(e)) { e.vx = -e.vx; e.vy = -e.vy; }
            if (--e.fire <= 0) {
              e.fire = (90 + rnd(90)) / sm;
              if (count('spark') < 20) {
                const lead = 18, tx = p.x + (p.mx || 0) * lead + rnd(16) - 8, ty = p.y + (p.my || 0) * lead + rnd(16) - 8;
                const d = Math.hypot(tx - e.x, ty - e.y) || 1, v = Math.min(3, 1.8 * sm);
                const s = mk('spark', e.x, e.y); s.vx = (tx - e.x) / d * v; s.vy = (ty - e.y) / d * v; s.curve = rnd(0.04) - 0.02;
                g.en.push(s); snd.spark();
              }
            }
            break;
          }
          case 'missile': {
            if (--e.life <= 0) { e.dead = true; break; }
            if (--e.timer <= 0) {
              e.timer = 6 + irnd(6);
              const dx = p.x - e.x, dy = p.y - e.y, sp = Math.min(2.2, 1.4 * sm);
              if (Math.random() < 0.15) { e.vx = (Math.random() < 0.5 ? -1 : 1) * sp; e.vy = 0; }
              else if (Math.random() < 0.5) { e.vx = Math.sign(dx) * sp; e.vy = 0; } else { e.vx = 0; e.vy = Math.sign(dy) * sp; }
            }
            e.x += e.vx; e.y += e.vy; clampE(e);
            break;
          }
          case 'spark': {
            if (--e.life <= 0) { e.dead = true; break; }
            const c = Math.cos(e.curve), s = Math.sin(e.curve);
            const vx = e.vx * c - e.vy * s; e.vy = e.vx * s + e.vy * c; e.vx = vx;
            e.x += e.vx; e.y += e.vy;
            if (clampE(e)) e.dead = true;
            break;
          }
        }
      }
      function updHumans() {
        const p = g.p;
        for (const h of g.hum) {
          if (h.dead) continue;
          if (h.conv > 0) {
            if (--h.conv === 0) {
              h.dead = true; const pr = mk('prog', h.x, h.y); pr.kind = h.kind; g.en.push(pr); snd.prog();
            }
            continue;
          }
          if (--h.timer <= 0) { h.dir = irnd(4); h.timer = 60 + irnd(90); }
          if (frame % 2 === 0) {
            const sp = h.kind === 'mikey' ? 0.6 : 0.75;
            h.x += DIRS[h.dir][0] * sp; h.y += DIRS[h.dir][1] * sp;
            if (clampE(h)) h.dir = (h.dir + 2) % 4;
          }
          if ((frame & 7) === 0) h.anim ^= 1;
          if (overlap(p, h)) {
            h.dead = true; g.rescueN++;
            const bonus = Math.min(5, g.rescueN) * 1000;
            addScore(bonus); g.pops.push({ x: h.x, y: h.y - 8, txt: String(bonus), t: 60 }); snd.rescue(Math.min(5, g.rescueN));
            continue;
          }
          for (const e of g.en) {
            if (e.dead) continue;
            if (e.type === 'hulk' && overlap(h, e)) { h.dead = true; g.skulls.push({ x: h.x, y: h.y, t: 100 }); snd.humanDie(); break; }
            if (e.type === 'brain' && overlap(h, e)) { h.conv = 45; snd.prog(); break; }
          }
        }
        g.hum = g.hum.filter(h => !h.dead);
      }
      function updPlay() {
        const p = g.p, sm = speedMul(); g.waveT++;
        let mx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        let my = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        p.mx = mx; p.my = my;
        if (mx || my) {
          const sp = mx && my ? 1.15 : 1.5;
          p.x += mx * sp; p.y += my * sp; p.dx = mx; p.dy = my; p.walk++;
          p.x = Math.max(AX0 + 4, Math.min(AX1 - 4, p.x)); p.y = Math.max(AY0 + 6, Math.min(AY1 - 6, p.y));
        }
        let fx = (api.key('KeyD') ? 1 : 0) - (api.key('KeyA') ? 1 : 0);
        let fy = (api.key('KeyS') ? 1 : 0) - (api.key('KeyW') ? 1 : 0);
        if (!fx && !fy && api.key('Space')) { fx = p.dx; fy = p.dy; }
        if (p.fireT > 0) p.fireT--;
        if ((fx || fy) && p.fireT <= 0 && g.shots.length < 7) {
          const v = fx && fy ? 5.5 : 7.5;
          g.shots.push({ x: p.x + fx * 3, y: p.y - 1 + fy * 3, vx: fx * v, vy: fy * v });
          p.fireT = 4; snd.shot();
        }
        for (let i = g.shots.length - 1; i >= 0; i--) {
          const s = g.shots[i]; let gone = false;
          for (let k = 0; k < 3 && !gone; k++) {
            s.x += s.vx / 3; s.y += s.vy / 3;
            if (s.x < AX0 || s.x > AX1 || s.y < AY0 || s.y > AY1) gone = true;
            else gone = shotHit(s);
          }
          if (gone) g.shots.splice(i, 1);
        }
        for (let i = 0; i < g.en.length; i++) if (!g.en[i].dead) updEnemy(g.en[i], sm);
        // grunts blunder into electrodes
        for (const e of g.en) {
          if (e.type !== 'grunt' || e.dead) continue;
          for (const el of g.en) if (el.type === 'electrode' && !el.dead && overlap(e, el, 1)) { e.dead = true; g.fx.push({ spr: GRUNT[0], x: e.x, y: e.y, t: 0, horiz: false }); break; }
        }
        g.en = g.en.filter(e => !e.dead);
        updHumans();
        for (const e of g.en) {
          if (e.grow > 0) continue;
          if (overlap(p, e, 1)) { playerDie(); return; }
        }
        if (!g.en.some(e => REQUIRED[e.type])) {
          g.phase = 'clear'; g.phaseT = 100; snd.clear();
          g.en = g.en.filter(e => e.type !== 'spark' && e.type !== 'missile'); g.shots = [];
        }
      }
      function playerDie() { g.phase = 'dead'; g.phaseT = 130; g.shots = []; snd.die(); }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 360;
        au.melody([[392, 0.18], [370, 0.18], [349, 0.18], [330, 0.5]], { type: 'square', vol: 0.09 });
      }
      function lastLife(onCont) {
        g.phase = 'wait';
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) onCont(); }, () => { if (g === cg) gameOver(); });
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 26);
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.15; }
        g.pops = g.pops.filter(q => q.t > 0);
        for (const q of g.skulls) q.t--;
        g.skulls = g.skulls.filter(q => q.t > 0);
        switch (g.phase) {
          case 'enter': if (--g.phaseT <= 0) g.phase = 'play'; break;
          case 'play': updPlay(); break;
          case 'dead':
            if (--g.phaseT <= 0) {
              g.lives--;
              if (g.lives > 0) respawn();
              else lastLife(() => { g.lives = 3; respawn(); });
            }
            break;
          case 'clear':
            if (--g.phaseT <= 0) { g.wave++; setupWave(); }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawElectrode(ctx, e, spread) {
        const shape = ELEC[(g.wave - 1) % ELEC.length];
        const col = e.t % 40 < 4 ? '#ffffff' : ECOL[(g.wave - 1) % ECOL.length];
        drawSpr(ctx, shape, e.x, e.y, { col, sy: spread });
      }
      function drawSphere(ctx, e, sc) {
        const ph = frame >> 2;
        for (const [x, y, r] of RING) {
          if ((r + ph) % 2) continue;
          ctx.fillStyle = CYC[(r + ph) & 7];
          ctx.fillRect(Math.round(e.x + x * sc), Math.round(e.y + y * sc), 1, 1);
        }
      }
      function drawEntity(ctx, e, spread) {
        const o = { sy: spread };
        switch (e.type) {
          case 'electrode': drawElectrode(ctx, e, spread); break;
          case 'sphere': drawSphere(ctx, e, 1 + spread * 0.3); break;
          case 'grunt': drawSpr(ctx, GRUNT[e.anim & 1], e.x, e.y, o); break;
          case 'hulk': drawSpr(ctx, HULK[e.anim & 1], e.x, e.y, o); break;
          case 'brain': drawSpr(ctx, BRAIN[e.anim & 1], e.x, e.y, o); break;
          case 'enforcer': {
            if (e.grow > 0) { const k = 1 - e.grow / 24; ctx.fillStyle = '#30a0ff'; const s = Math.max(1, Math.round(k * 8)); ctx.fillRect(Math.round(e.x - s / 2), Math.round(e.y - s / 2), s, s); }
            else drawSpr(ctx, ENFORCER, e.x, e.y, o);
            break;
          }
          case 'prog': {
            const spr = HUMANS[e.kind];
            for (let i = e.trail.length - 1; i >= 0; i--) drawSpr(ctx, spr, e.trail[i][0], e.trail[i][1], { col: CYC[(frame + i) & 7] });
            drawSpr(ctx, spr, e.x, e.y, { col: CYC[(frame >> 1) & 7], sy: spread });
            break;
          }
          case 'missile':
            ctx.fillStyle = (frame & 2) ? '#ffffff' : '#ff4040';
            ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, 3, 3);
            ctx.fillStyle = '#ff9000'; ctx.fillRect(Math.round(e.x - e.vx * 2), Math.round(e.y - e.vy * 2), 1, 1);
            break;
          case 'spark': {
            ctx.fillStyle = CYC[(frame + (e.t >> 1)) & 7];
            const x = Math.round(e.x), y = Math.round(e.y);
            if (frame & 2) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
            else { ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x, y, 1, 1); }
            break;
          }
        }
      }
      function drawBorder(ctx, col) {
        ctx.fillStyle = col;
        ctx.fillRect(AX0 - 2, AY0 - 2, AX1 - AX0 + 4, 2); ctx.fillRect(AX0 - 2, AY1, AX1 - AX0 + 4, 2);
        ctx.fillRect(AX0 - 2, AY0, 2, AY1 - AY0); ctx.fillRect(AX1, AY0, 2, AY1 - AY0);
      }
      function drawHUD(ctx) {
        text(ctx, String(g.score), 60, 3, '#30ff30', 1, 'right');
        for (let i = 0; i < Math.min(8, g.lives - 1); i++) drawSpr(ctx, HERO[0], 70 + i * 9, 7, {});
        text(ctx, 'HI ' + hi, W - 6, 3, '#ffd200', 1, 'right');
        text(ctx, g.wave + ' WAVE', W / 2, 232, '#3090ff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const p = g.p;
        if (g.phase === 'dead' && g.phaseT > 70) {
          ctx.fillStyle = CYC[(frame >> 1) & 7]; ctx.globalAlpha = 0.25; ctx.fillRect(AX0, AY0, AX1 - AX0, AY1 - AY0); ctx.globalAlpha = 1;
        }
        drawBorder(ctx, g.phase === 'enter' ? CYC[(frame >> 2) & 7] : '#d02020');
        drawHUD(ctx);
        if (g.phase === 'clear') {
          const k = 100 - g.phaseT;
          for (let i = 0; i < 6; i++) {
            const r = (k * 3 - i * 14); if (r <= 0) continue;
            ctx.strokeStyle = CYC[(i + (frame >> 2)) & 7]; ctx.lineWidth = 2;
            ctx.strokeRect(CX - r * 1.3, CY - r, r * 2.6, r * 2);
          }
          text(ctx, 'WAVE ' + g.wave + ' COMPLETED', CX, CY - 4, '#ffffff', 1, 'center');
          return;
        }
        const spread = g.phase === 'enter' ? g.phaseT * 0.12 : 0;
        for (const s of g.skulls) drawSpr(ctx, SKULL, s.x, s.y, {});
        for (const h of g.hum) {
          const spr = HUMANS[h.kind];
          if (h.conv > 0) drawSpr(ctx, spr, h.x, h.y, { col: (frame & 4) ? '#ff40ff' : '#ffffff' });
          else drawSpr(ctx, spr, h.x, h.y + (h.anim ? 0 : -1), { flip: h.dir === 3, sy: spread });
        }
        for (const e of g.en) drawEntity(ctx, e, spread);
        for (const f of g.fx) drawSpr(ctx, f.spr, f.x, f.y, f.horiz ? { sx: f.t * 0.5, col: f.col || null } : { sy: f.t * 0.45, col: f.col || null });
        for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
        // player
        if (g.phase === 'dead') {
          const k = 130 - g.phaseT;
          drawSpr(ctx, HERO[0], p.x, p.y, { col: CYC[(frame >> 1) & 7], sy: k > 40 ? (k - 40) * 0.3 : 0 });
        } else if (g.phase !== 'wait' && g.phase !== 'over') {
          drawSpr(ctx, HERO[(p.walk >> 3) & 1], p.x, p.y, { flip: p.dx < 0, sy: spread * 0.5 });
        }
        ctx.fillStyle = '#ffffff';
        for (const s of g.shots) {
          const len = 3.5, ux = Math.sign(s.vx), uy = Math.sign(s.vy);
          for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(s.x - ux * i * len / 3), Math.round(s.y - uy * i * len / 3), 1, 1);
        }
        for (const q of g.pops) text(ctx, q.txt, q.x, q.y, (frame & 4) ? '#ffffff' : '#ffd200', 1, 'center');
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(CX - 50, CY - 12, 100, 22);
          text(ctx, 'GAME OVER', CX, CY - 7, '#ff2020', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        const page = Math.floor(titleT / 480) % 3;
        drawBorder(ctx, CYC[(frame >> 3) & 7]);
        if (page === 0) {
          const t = 'ROBOTRON';
          for (let i = 0; i < t.length; i++) text(ctx, t[i], 52 + i * 24, 34, CYC[(i + (frame >> 2)) & 7], 4);
          text(ctx, '2084', CX, 72, '#ffffff', 3, 'center');
          text(ctx, 'INSPIRED BY THE NEVER-ENDING QUEST', CX, 108, '#30ff30', 1, 'center');
          text(ctx, 'FOR PROGRESS, IN 2084 MAN PERFECTS', CX, 118, '#30ff30', 1, 'center');
          text(ctx, 'THE ROBOTRONS. THEY REVOLT.', CX, 128, '#30ff30', 1, 'center');
          text(ctx, 'SAVE THE LAST HUMAN FAMILY', CX, 146, '#ffd200', 1, 'center');
          drawSpr(ctx, HUMANS.mommy, CX - 20, 166, {}); drawSpr(ctx, HUMANS.daddy, CX, 166, {}); drawSpr(ctx, HUMANS.mikey, CX + 18, 168, {});
        } else if (page === 1) {
          text(ctx, 'THE ROBOTRONS', CX, 22, '#ff2020', 2, 'center');
          const rows = [
            [GRUNT[(frame >> 4) & 1], 'GRUNT', '100'], [HULK[(frame >> 4) & 1], 'HULK', 'INDESTRUCTIBLE'], [BRAIN[(frame >> 4) & 1], 'BRAIN', '500'],
            [null, 'SPHEROID', '1000'], [ENFORCER, 'ENFORCER', '150'], [HUMANS.daddy, 'PROG', '100'], [HUMANS.mommy, 'RESCUE FAMILY', '1000-5000']
          ];
          rows.forEach((r, i) => {
            const y = 52 + i * 22;
            if (r[0]) drawSpr(ctx, r[0], 70, y, r[1] === 'PROG' ? { col: CYC[(frame >> 1) & 7] } : {});
            else drawSphere(ctx, { x: 70, y }, 1);
            text(ctx, r[1], 90, y - 3, '#ffffff', 1);
            text(ctx, r[2], 240, y - 3, '#ffd200', 1, 'right');
          });
        } else {
          text(ctx, 'HALL OF FAME', CX, 40, '#ffd200', 2, 'center');
          text(ctx, 'HIGH SCORE', CX, 80, '#ffffff', 1, 'center');
          text(ctx, String(hi), CX, 96, CYC[(frame >> 2) & 7], 3, 'center');
          text(ctx, 'ARROWS MOVE  WASD FIRE', CX, 140, '#30ff30', 1, 'center');
          text(ctx, 'SPACE FIRES THE WAY YOU MOVE', CX, 152, '#30ff30', 1, 'center');
          text(ctx, 'BONUS MAN EVERY 25000', CX, 170, '#3090ff', 1, 'center');
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', CX, 202, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', CX, 202, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', CX, 202, blink ? '#ffffff' : '#888888', 1, 'center');
        text(ctx, credStr(), 8, 232, '#888888', 1);
        text(ctx, '\u00a9 1982 WILLIAMS', W - 8, 232, '#888888', 1, 'right');
      }
      return { update, render, destroy() { } };
    }
  });
})();
