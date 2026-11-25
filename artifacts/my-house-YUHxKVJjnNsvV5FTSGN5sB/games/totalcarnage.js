// Total Carnage (Midway, 1992) \u2014 written from scratch for the MAME32 Game Room.
// Twin-stick scrolling commando shooter in a fictional desert dictatorship: POWs, weapons, vehicles, bosses.
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
  FONT['$'] = [4, 15, 20, 14, 5, 30, 4]; FONT['%'] = [25, 25, 2, 4, 8, 19, 19]; FONT['#'] = [10, 31, 10, 10, 31, 10, 0];
  FONT['&'] = [12, 18, 20, 8, 21, 18, 13]; FONT['"'] = [10, 10, 0, 0, 0, 0, 0];
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0, clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = a => a[(Math.random() * a.length) | 0];
  const CYC = ['#ff2020', '#ff9000', '#ffff00', '#20ff20', '#20ffff', '#2060ff', '#d040ff', '#ffffff'];

  const W = 336, H = 240, TS = 16, COLS = 21, LH = 126, LPX = LH * TS;
  const SAND = 0, ROAD = 1, WALL = 2, BAGS = 3, CRATE = 4, PALM = 5, FENCE = 6, RUBBLE = 7;
  const SOLID = [false, false, true, true, true, true, true, false];
  const BLOCKSHOT = [false, false, true, true, true, false, true, false];
  const THP = [0, 0, 255, 6, 3, 0, 2, 0];
  const STAGES = [
    { name: 'OPERATION DUST DEVIL', sub: 'THE BORDER OUTPOSTS', sand: ['#c8a060', '#c09858'], boss: 'crawler' },
    { name: 'OPERATION SANDSTORM', sub: 'THE OIL FIELDS', sand: ['#b89068', '#b08860'], boss: 'gunship' },
    { name: 'OPERATION LAST STAND', sub: 'THE PALACE OF KRUXX', sand: ['#a88878', '#a08070'], boss: 'walker' }
  ];
  const BOSSNAME = { crawler: 'IRON CRAWLER', gunship: 'SANDSTORM GUNSHIP', walker: 'KRUXX WAR-WALKER' };
  const WEAPONS = {
    gun: { name: 'MACHINE GUN', col: '#ffffff' }, spread: { name: 'SPREAD GUN', col: '#30ff30', c: 'S' },
    flame: { name: 'FLAME GUN', col: '#ff9020', c: 'F' }, rocket: { name: 'ROCKETS', col: '#ff4040', c: 'R' }
  };
  // sprites
  const PC = { G: '#2f6f2f', D: '#1f4f1f', S: '#e0a070', K: '#202020', B: '#3070ff', Y: '#ffd200', W: '#ffffff' };
  const HERO = [
    makeSpr(['..BBB..', '.BBBBB.', '..SSS..', '.GGGGG.', 'GGYGYGG', 'S.GGG.S', '..DDD..', '..D.D..', '..D.D..', '.KK.KK.'], PC),
    makeSpr(['..BBB..', '.BBBBB.', '..SSS..', '.GGGGG.', 'GGYGYGG', 'S.GGG.S', '..DDD..', '.D...D.', '.D...D.', 'KK...KK'], PC)
  ];
  const PE = { T: '#8a6a3a', D: '#5a4020', S: '#d09060', K: '#202020', R: '#c02020', W: '#ffffff' };
  const SOLDIER = [
    makeSpr(['..RRR..', '.RRRRR.', '..SSS..', '.TTTTT.', 'TTTTTTT', 'S.TTT.S', '..DDD..', '..D.D..', '..D.D..', '.KK.KK.'], PE),
    makeSpr(['..RRR..', '.RRRRR.', '..SSS..', '.TTTTT.', 'TTTTTTT', 'S.TTT.S', '..DDD..', '.D...D.', '.D...D.', 'KK...KK'], PE)
  ];
  const PW = { S: '#e0b080', W: '#e8e8e8', K: '#606060', N: '#704020' };
  const POW = [
    makeSpr(['..NNN..', '..SSS..', '.WWWWW.', 'KWWWWWK', 'S.WWW.S', '..WWW..', '..K.K..', '..S.S..', '.SS.SS.'], PW),
    makeSpr(['S.NNN.S', 'S.SSS.S', '.WWWWW.', '..WWW..', '..WWW..', '..WWW..', '..W.W..', '..S.S..', '.SS.SS.'], PW)
  ];

  ArcadeRegistry.register({
    id: 'totalcarnage', title: 'Total Carnage', year: 1992, maker: 'Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 WASD: fire 8 ways \u00b7 Space: fire facing \u00b7 X: bomb / leave vehicle \u00b7 Enter: start',
    marquee: { bg: '#2a1a08', fg: '#ffb020', accent: '#ff3020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(150000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;
      const tiles = new Uint8Array(COLS * LH), thp = new Uint8Array(COLS * LH);
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        gun() { au.tone(300 + rnd(80), 0.04, { type: 'square', vol: 0.04, slideTo: 120 }); },
        flame() { au.noise(0.06, { vol: 0.04, freq: 1500, slideTo: 800 }); },
        rocket() { au.noise(0.15, { vol: 0.06, freq: 900, slideTo: 300 }); },
        cannon() { au.tone(160, 0.12, { type: 'sawtooth', vol: 0.08, slideTo: 50 }); },
        eshot() { au.tone(700, 0.04, { type: 'square', vol: 0.03, slideTo: 400 }); },
        boom() { au.noise(0.4, { vol: 0.14, freq: 1400, slideTo: 80 }); },
        small() { au.noise(0.1, { vol: 0.07, freq: 2500, slideTo: 500 }); },
        down() { au.tone(500, 0.12, { type: 'triangle', vol: 0.06, slideTo: 200 }); },
        big() { au.noise(1.4, { vol: 0.2, freq: 1100, slideTo: 50 }); au.tone(120, 1.2, { type: 'sawtooth', vol: 0.09, slideTo: 30 }); },
        bomb() { au.noise(1.0, { vol: 0.22, freq: 2500, slideTo: 60 }); au.tone(80, 0.8, { type: 'sine', vol: 0.15, slideTo: 30 }); },
        item() { au.melody([[660, 0.05], [990, 0.05], [1320, 0.1]], { type: 'square', vol: 0.09 }); },
        pow() { au.melody([[784, 0.06], [988, 0.06], [784, 0.06], [1319, 0.14]], { type: 'triangle', vol: 0.12 }); },
        die() { au.tone(400, 0.9, { type: 'sawtooth', vol: 0.12, slideTo: 50 }); },
        jingle() { au.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.24], [659, 0.1], [784, 0.4]], { type: 'square', vol: 0.09 }); },
        life() { au.melody([[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.2]], { type: 'square', vol: 0.1 }); },
        engine() { au.tone(70 + rnd(10), 0.06, { type: 'sawtooth', vol: 0.03 }); }
      };
      function radio(txt) { if (g) g.radio = { txt, t: 200 }; }

      // ---------- level building ----------
      const T = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= LH) ? WALL : tiles[r * COLS + c];
      function put(c, r, t) { if (c < 0 || c >= COLS || r < 0 || r >= LH) return; tiles[r * COLS + c] = t; thp[r * COLS + c] = THP[t]; }
      const wx = c => c * TS + 8, wy = r => r * TS + 8;
      function spawnAt(type, c, r, o) { g.spawns.push(Object.assign({ type, x: wx(c), y: wy(r) }, o || {})); }
      function rowWithGaps(r, t, gaps, gw) {
        for (let c = 0; c < COLS; c++) put(c, r, t);
        for (let i = 0; i < gaps; i++) { const c0 = 1 + irnd(COLS - gw - 2); for (let c = c0; c < c0 + gw; c++) put(c, r, SAND); }
      }
      const TEMPL = {
        sandbags(r0) {
          rowWithGaps(r0 + 5, BAGS, 3, 3);
          for (let i = 0; i < 3 + irnd(2); i++) spawnAt('soldier', 2 + irnd(17), r0 + 2 + irnd(2));
          spawnAt('grenadier', 3 + irnd(15), r0 + 1);
          if (Math.random() < 0.5) spawnAt('barrel', 2 + irnd(17), r0 + 7);
        },
        compound(r0) {
          for (let c = 3; c < 18; c++) { put(c, r0 + 1, WALL); put(c, r0 + 8, WALL); }
          for (let r = r0 + 1; r <= r0 + 8; r++) { put(3, r, WALL); put(17, r, WALL); }
          const g1 = 5 + irnd(8), g2 = 5 + irnd(8);
          for (let c = g1; c < g1 + 3; c++) put(c, r0 + 8, SAND);
          for (let c = g2; c < g2 + 3; c++) put(c, r0 + 1, SAND);
          put(5, r0 + 4, CRATE); put(15, r0 + 5, CRATE); put(6, r0 + 6, CRATE);
          spawnAt('turret', 10, r0 + 4); spawnAt('soldier', 7, r0 + 3); spawnAt('soldier', 13, r0 + 6);
        },
        road(r0) {
          for (let r = r0; r < r0 + 10; r++) for (let c = 8; c <= 12; c++) put(c, r, ROAD);
          for (let i = 0; i < 4; i++) put(irnd(2) ? 2 + irnd(4) : 15 + irnd(4), r0 + irnd(10), PALM);
          spawnAt('jeep', 10, r0, { trig: 1 });
          spawnAt('soldier', 4, r0 + 4); spawnAt('soldier', 16, r0 + 6);
        },
        camp(r0) {
          const c0 = irnd(2) ? 2 : 11;
          for (let c = c0; c <= c0 + 7; c++) { put(c, r0 + 2, FENCE); put(c, r0 + 7, FENCE); }
          for (let r = r0 + 2; r <= r0 + 7; r++) { put(c0, r, FENCE); put(c0 + 7, r, FENCE); }
          for (let i = 0; i < 3 + irnd(2); i++) g.pows.push({ x: wx(c0 + 2 + irnd(4)), y: wy(r0 + 3 + irnd(4)), state: 'tied', t: irnd(60) });
          spawnAt('soldier', c0 > 5 ? 4 : 16, r0 + 3); spawnAt('soldier', c0 > 5 ? 6 : 14, r0 + 6);
          if (Math.random() < 0.6) spawnAt('grenadier', 10, r0 + 1);
        },
        scatter(r0) {
          for (let i = 0; i < 5; i++) put(1 + irnd(19), r0 + irnd(10), pick([PALM, CRATE, CRATE, PALM]));
          for (let i = 0; i < 2; i++) spawnAt('barrel', 2 + irnd(17), r0 + irnd(10));
          for (let i = 0; i < 3 + irnd(2); i++) spawnAt('soldier', 2 + irnd(17), r0 + irnd(8));
          if (Math.random() < 0.5) spawnAt('item', 2 + irnd(17), r0 + 5);
        },
        tankpark(r0) {
          rowWithGaps(r0 + 7, BAGS, 2, 4);
          spawnAt('tank', 6 + irnd(9), r0 + 2);
          spawnAt('soldier', 3, r0 + 4); spawnAt('soldier', 17, r0 + 4);
        },
        heli(r0) {
          for (let i = 0; i < 3; i++) put(1 + irnd(19), r0 + irnd(10), PALM);
          spawnAt('heli', 10, r0 + 2); spawnAt('soldier', 5, r0 + 5); spawnAt('soldier', 15, r0 + 5);
        },
        buggy(r0) {
          for (let r = r0; r < r0 + 10; r++) for (let c = 9; c <= 11; c++) put(c, r, ROAD);
          spawnAt('buggy', 10, r0 + 7); spawnAt('soldier', 4, r0 + 2); spawnAt('soldier', 16, r0 + 3); spawnAt('item', 6, r0 + 6);
        }
      };
      function buildLevel() {
        tiles.fill(SAND); thp.fill(0);
        g.spawns = []; g.pows = [];
        // start area at the bottom, boss arena at the top
        for (let i = 0; i < 6; i++) put(irnd(COLS), LH - 2 - irnd(8), PALM);
        put(1, LH - 3, SAND); put(10, LH - 3, SAND);
        const s = g.stage, d = g.loop;
        const seq = ['scatter', 'sandbags', 'camp', 'buggy', 'compound', 'road', s >= 1 || d ? 'heli' : 'scatter', 'camp', 'tankpark', 'sandbags'];
        // light shuffle that keeps the opening gentle
        for (let i = 9; i > 3; i--) { const j = 3 + irnd(i - 2); const t = seq[i]; seq[i] = seq[j]; seq[j] = t; }
        for (let i = 0; i < seq.length; i++) {
          const r0 = LH - 12 - (i + 1) * 10;
          TEMPL[seq[i]](r0);
        }
        // boss arena border
        for (let r = 0; r < 14; r++) for (let c = 0; c < COLS; c++) put(c, r, (c === 0 || c === COLS - 1) ? WALL : r < 2 ? WALL : SAND);
        for (let c = 3; c < 18; c += 4) put(c, 12, BAGS);
        g.spawns.sort((a, b) => b.y - a.y);
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, nextLife: 50000, stage: 0, loop: 0, bombs: 3, rescuedTotal: 0, radio: null };
        startStage();
      }
      const diff = () => g.stage + g.loop * 3;
      function startStage() {
        g.en = []; g.shots = []; g.eshots = []; g.nades = []; g.items = []; g.fx = []; g.parts = []; g.pops = []; g.vehicles = [];
        buildLevel();
        g.camY = LPX - H; g.p = { x: W / 2, y: LPX - 40, dx: 0, dy: -1, fireT: 0, walk: 0, inv: 120, weapon: 'gun', ammo: 0, ride: null };
        g.rescued = 0; g.boss = null; g.bossOn = false; g.reinT = 300; g.t = 0;
        g.phase = 'intro'; g.phaseT = 180;
        radio(['COMMANDER: GET IN THERE, SOLDIER. FREE THE POWS!', 'HQ: THE DUNE EMPIRE IS DUG IN. BLAST THROUGH!', 'HQ: KRUXX IS IN THE PALACE. END THIS!'][g.stage]);
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 50000; snd.life(); }
        if (g.score > hi) hi = g.score;
      }
      function burst(x, y, col, n, sp) {
        for (let i = 0; i < n; i++) { const a = rnd(6.283), s = 0.3 + rnd(sp || 1.8); g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 14 + irnd(22), col }); }
      }
      function explode(x, y, r, hurtPlayer, dmg) {
        g.fx.push({ x, y, t: 0, r }); snd.boom(); burst(x, y, '#ffb020', 10, 2.2); burst(x, y, '#606060', 6, 1);
        for (const e of g.en) if (!e.dead && Math.hypot(e.x - x, e.y - y) < r + e.r) damageEnemy(e, dmg || 4);
        if (g.boss && !g.boss.dead && Math.hypot(g.boss.x - x, g.boss.y - y) < r + g.boss.r) damageBoss(dmg || 4);
        // blast opens crates, sandbags and fences
        const c0 = Math.floor((x - r) / TS), c1 = Math.floor((x + r) / TS), r0 = Math.floor((y - r) / TS), r1 = Math.floor((y + r) / TS);
        for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) { const t = T(cc, rr); if (t === BAGS || t === CRATE || t === FENCE) breakTile(cc, rr); }
        if (hurtPlayer && Math.hypot(g.p.x - x, g.p.y - y) < r + 3) hurtPlayerFn(6);
      }
      function breakTile(c, r) {
        const t = T(c, r);
        put(c, r, RUBBLE); burst(wx(c), wy(r), t === CRATE ? '#a07030' : t === FENCE ? '#909090' : '#c0a070', 8);
        if (t === CRATE) { addScore(50); if (Math.random() < 0.4) dropItem(wx(c), wy(r)); }
      }
      function dropItem(x, y) {
        const r = Math.random();
        const k = r < 0.22 ? 'spread' : r < 0.42 ? 'flame' : r < 0.6 ? 'rocket' : r < 0.78 ? 'bomb' : r < 0.9 ? 'cash' : 'medal';
        g.items.push({ k, x, y, t: 900 });
      }
      function solidAt(x, y) { return SOLID[T(Math.floor(x / TS), Math.floor(y / TS))]; }
      function boxSolid(x, y, hw, hh) { return solidAt(x - hw, y - hh) || solidAt(x + hw, y - hh) || solidAt(x - hw, y + hh) || solidAt(x + hw, y + hh) || solidAt(x, y - hh) || solidAt(x, y + hh); }
      function mkEnemy(s) {
        const e = { type: s.type, x: s.x, y: s.y, t: irnd(60), hp: 1, r: 4, fireT: 60 + irnd(80), vx: 0, vy: 0, hitT: 0 };
        const d = diff();
        switch (s.type) {
          case 'soldier': e.hp = 1; e.pref = 50 + rnd(60); break;
          case 'grenadier': e.hp = 2; e.fireT = 90 + irnd(60); break;
          case 'jeep': e.hp = 8 + d * 2; e.r = 8; e.vy = 1.1 + d * 0.1; e.fireT = 30; break;
          case 'tank': e.hp = 18 + d * 4; e.r = 11; e.ang = Math.PI / 2; e.fireT = 80; break;
          case 'turret': e.hp = 12 + d * 2; e.r = 8; e.ang = Math.PI / 2; e.fireT = 60; break;
          case 'heli': e.hp = 22 + d * 4; e.r = 12; e.fireT = 70; e.hy = 50 + rnd(30); break;
          case 'barrel': e.hp = 2; e.r = 5; break;
        }
        return e;
      }
      function activateSpawns() {
        while (g.spawns.length && g.spawns[0].y >= g.camY - 12) {
          const s = g.spawns.shift();
          if (s.type === 'item') { dropItem(s.x, s.y); continue; }
          if (s.type === 'buggy') { g.vehicles.push({ x: s.x, y: s.y, hp: 40, ang: -Math.PI / 2 }); continue; }
          g.en.push(mkEnemy(s));
        }
      }
      function damageEnemy(e, dmg) {
        if (e.dead) return;
        e.hp -= dmg; e.hitT = 4;
        if (e.hp > 0) return;
        e.dead = true;
        const pts = { soldier: 100, grenadier: 200, jeep: 500, tank: 1000, turret: 750, heli: 1500, barrel: 100 }[e.type] || 0;
        addScore(pts);
        if (e.type === 'soldier' || e.type === 'grenadier') {
          snd.down(); g.fx.push({ down: true, x: e.x, y: e.y, t: 0, type: e.type });
          if (Math.random() < 0.06) dropItem(e.x, e.y);
        } else {
          if (e.type === 'barrel') explode(e.x, e.y, 22, false, 6);
          else { explode(e.x, e.y, e.r + 10, false, 3); snd.big(); g.pops.push({ x: e.x, y: e.y - 12, txt: String(pts), t: 50 }); if (e.type !== 'turret' || Math.random() < 0.5) dropItem(e.x, e.y); }
        }
      }
      function damageBoss(dmg) {
        const b = g.boss; if (!b || b.dead || b.enter > 0) return;
        b.hp -= dmg; b.hitT = 3;
        if (b.hp <= 0) {
          b.dead = true; b.deadT = 180; snd.big();
          const pts = 25000 + g.loop * 10000; addScore(pts); g.pops.push({ x: b.x, y: b.y, txt: String(pts), t: 120 });
          for (const e of g.en) if (!e.dead) damageEnemy(e, 99);
          g.eshots = []; g.nades = [];
          if (b.type === 'walker') radio('KRUXX: THIS IS NOT OVER! *ESCAPE POD WHOOSH*');
          else radio('HQ: TARGET DESTROYED. OUTSTANDING!');
        }
      }
      function hurtPlayerFn(dmg) {
        const p = g.p;
        if (g.phase !== 'play' || p.inv > 0) return;
        if (p.ride) {
          p.ride.hp -= dmg; p.ride.hitT = 4;
          if (p.ride.hp <= 0) { explode(p.x, p.y, 20, false, 6); snd.big(); p.ride = null; p.inv = 120; radio('HQ: YOUR RIDE IS TOAST. KEEP MOVING!'); }
          return;
        }
        g.phase = 'dead'; g.phaseT = 100; snd.die();
      }
      function enemyShot(x, y, tx, ty, sp, big) {
        const a = Math.atan2(ty - y, tx - x);
        g.eshots.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 240, big: !!big });
      }
      function fire(fx, fy) {
        const p = g.p, a = Math.atan2(fy, fx);
        const add = (ang, o) => g.shots.push(Object.assign({ x: p.x + Math.cos(ang) * 6, y: p.y - 2 + Math.sin(ang) * 6, vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5, dmg: 1, t: 60 }, o || {}));
        if (p.ride) { add(a, { vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, dmg: 3, shell: true }); p.fireT = 9; snd.cannon(); return; }
        const w = p.weapon;
        if (w === 'spread') { for (let i = -2; i <= 2; i++) add(a + i * 0.16); p.fireT = 8; snd.gun(); }
        else if (w === 'flame') { add(a + rnd(0.3) - 0.15, { vx: Math.cos(a) * 3 + rnd(0.4), vy: Math.sin(a) * 3 + rnd(0.4), dmg: 1, flame: true, t: 22, pierce: true }); p.fireT = 2; if (frame % 6 === 0) snd.flame(); }
        else if (w === 'rocket') { add(a, { vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, dmg: 4, rocket: true, t: 90 }); p.fireT = 16; snd.rocket(); }
        else { add(a + rnd(0.08) - 0.04); p.fireT = 5; snd.gun(); }
        if (w !== 'gun' && --p.ammo <= 0) { p.weapon = 'gun'; }
      }
      function updPlayer() {
        const p = g.p;
        const mx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const my = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        const hw = p.ride ? 8 : 3, hh = p.ride ? 8 : 4;
        if (mx || my) {
          const sp = (p.ride ? 1.9 : 1.3) * (mx && my ? 0.75 : 1);
          const nx = p.x + mx * sp, ny = p.y + my * sp;
          if (!boxSolid(nx, p.y + 2, hw, hh)) p.x = nx;
          else if (p.ride) crush(nx, p.y, hw, hh);
          if (!boxSolid(p.x, ny + 2, hw, hh)) p.y = ny;
          else if (p.ride) crush(p.x, ny, hw, hh);
          p.dx = mx; p.dy = my; p.walk++;
          if (p.ride && frame % 8 === 0) snd.engine();
        }
        p.x = clamp(p.x, 10, W - 10);
        p.y = clamp(p.y, g.camY + 26, g.camY + H - 10);
        let fx = (api.key('KeyD') ? 1 : 0) - (api.key('KeyA') ? 1 : 0);
        let fy = (api.key('KeyS') ? 1 : 0) - (api.key('KeyW') ? 1 : 0);
        if (!fx && !fy && api.key('Space')) { fx = p.dx; fy = p.dy; }
        if (fx || fy) { p.dx = fx; p.dy = fy; }
        if (p.fireT > 0) p.fireT--;
        if ((fx || fy) && p.fireT <= 0) fire(fx, fy);
        if (p.inv > 0) p.inv--;
        if (p.ride && p.ride.hitT > 0) p.ride.hitT--;
        if (api.pressed('KeyX')) {
          if (p.ride) { const v = p.ride; v.x = p.x; v.y = p.y; g.vehicles.push(v); p.ride = null; p.inv = 30; for (const ox of [14, -14, 0]) if (!boxSolid(p.x + ox, p.y + 14, 3, 4)) { p.x += ox; p.y += ox ? 0 : 14; break; } }
          else if (g.bombs > 0) {
            g.bombs--; snd.bomb(); g.flash = 20;
            for (const e of g.en) if (!e.dead && e.y > g.camY - 10 && e.y < g.camY + H) damageEnemy(e, 10);
            if (g.boss) damageBoss(12);
            g.eshots = []; g.nades = [];
            for (let i = 0; i < 8; i++) g.fx.push({ x: rnd(W), y: g.camY + 20 + rnd(H - 30), t: -irnd(20), r: 20 });
          }
        }
        // board a vehicle
        if (!p.ride) for (let i = 0; i < g.vehicles.length; i++) {
          const v = g.vehicles[i];
          if (Math.abs(v.x - p.x) < 10 && Math.abs(v.y - p.y) < 10) { p.ride = v; g.vehicles.splice(i, 1); p.x = v.x; p.y = v.y; radio('HQ: NICE WHEELS! RUN THEM DOWN!'); snd.item(); break; }
        }
        // pick-ups
        for (const it of g.items) {
          if (Math.abs(it.x - p.x) < 9 && Math.abs(it.y - p.y) < 9) {
            it.t = 0; snd.item();
            if (it.k === 'bomb') { g.bombs = Math.min(9, g.bombs + 1); g.pops.push({ x: it.x, y: it.y - 8, txt: 'BOMB', t: 40 }); }
            else if (it.k === 'cash') { addScore(2000); g.pops.push({ x: it.x, y: it.y - 8, txt: '2000', t: 40 }); }
            else if (it.k === 'medal') { addScore(5000); g.pops.push({ x: it.x, y: it.y - 8, txt: '5000', t: 40 }); }
            else { p.weapon = it.k; p.ammo = it.k === 'flame' ? 400 : it.k === 'rocket' ? 40 : 90; g.pops.push({ x: it.x, y: it.y - 8, txt: WEAPONS[it.k].name, t: 50 }); }
          }
        }
        g.items = g.items.filter(it => it.t-- > 0 && it.y < g.camY + H + 20);
        // POWs
        for (const w of g.pows) {
          if (w.state === 'tied' && Math.abs(w.x - p.x) < 9 && Math.abs(w.y - p.y) < 10) {
            w.state = 'free'; w.t = 0; g.rescued++; g.rescuedTotal++; addScore(1000); snd.pow();
            g.pops.push({ x: w.x, y: w.y - 10, txt: 'POW SAVED 1000', t: 60 });
            if (g.rescued % 4 === 1) radio(pick(['POW: THANK YOU! THEY WENT THAT WAY!', 'POW: I KNEW YOU WOULD COME!', 'POW: GET KRUXX FOR US!']));
          }
        }
      }
      function crush(x, y, hw, hh) {
        for (const [ox, oy] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh], [0, -hh], [0, hh]]) {
          const c = Math.floor((x + ox) / TS), r = Math.floor((y + oy) / TS), t = T(c, r);
          if (t === BAGS || t === CRATE || t === FENCE || t === PALM) breakTile(c, r);
        }
      }
      function moveEnemy(e, vx, vy) {
        const nx = e.x + vx, ny = e.y + vy;
        if (!boxSolid(nx, e.y, 3, 4)) e.x = nx; else e.vx = -e.vx;
        if (!boxSolid(e.x, ny, 3, 4)) e.y = ny; else e.vy = -e.vy;
      }
      function updEnemies() {
        const p = g.p, d = diff();
        for (const e of g.en) {
          if (e.dead) continue;
          if (e.y > g.camY + H + 50 || e.y < g.camY - 120) { if (e.y > g.camY + H + 50) e.dead = true; continue; }
          e.t++; if (e.hitT > 0) e.hitT--;
          const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
          const onScreen = e.y > g.camY + 4 && e.y < g.camY + H - 4;
          switch (e.type) {
            case 'soldier': {
              if (e.t % 40 === 0) {
                const want = dist > e.pref ? 1 : -0.6;
                const side = rnd(1) < 0.5 ? -1 : 1;
                e.vx = (dx / dist) * 0.5 * want + (-dy / dist) * 0.35 * side; e.vy = (dy / dist) * 0.5 * want + (dx / dist) * 0.35 * side;
                if (Math.random() < 0.25) { e.vx = 0; e.vy = 0; }
              }
              moveEnemy(e, e.vx, e.vy);
              if (onScreen && --e.fireT <= 0) { e.fireT = Math.max(50, 130 - d * 12) + irnd(60); enemyShot(e.x, e.y - 2, p.x, p.y, 1.6 + d * 0.15); snd.eshot(); }
              break;
            }
            case 'grenadier':
              if (e.t % 60 === 0) { e.vx = rnd(0.6) - 0.3; e.vy = rnd(0.4) - 0.2; }
              moveEnemy(e, e.vx, e.vy);
              if (onScreen && --e.fireT <= 0 && dist < 170) {
                e.fireT = Math.max(90, 170 - d * 15) + irnd(60);
                g.nades.push({ x0: e.x, y0: e.y, x1: p.x + rnd(16) - 8, y1: p.y + rnd(16) - 8, t: 0, dur: 50 });
              }
              break;
            case 'jeep':
              e.y += e.vy;
              if (onScreen && --e.fireT <= 0) { e.fireT = Math.max(20, 40 - d * 4); enemyShot(e.x, e.y, p.x, p.y, 2.2); snd.eshot(); }
              if (Math.abs(dx) < 10 && Math.abs(dy) < 12) hurtPlayerFn(8);
              break;
            case 'tank':
              if (e.t % 90 === 0) { e.vx = Math.sign(dx) * 0.3; e.vy = dy > 60 ? 0.25 : 0; }
              if (!boxSolid(e.x + e.vx, e.y + e.vy, 10, 10)) { e.x += e.vx; e.y += e.vy; }
              e.ang += clamp(Math.atan2(dy, dx) - e.ang, -0.03, 0.03);
              if (onScreen && --e.fireT <= 0) { e.fireT = Math.max(60, 110 - d * 10); enemyShot(e.x + Math.cos(e.ang) * 12, e.y + Math.sin(e.ang) * 12, e.x + Math.cos(e.ang) * 100, e.y + Math.sin(e.ang) * 100, 2.2, true); snd.cannon(); }
              if (Math.abs(dx) < 13 && Math.abs(dy) < 13) hurtPlayerFn(10);
              break;
            case 'turret':
              e.ang = Math.atan2(dy, dx);
              if (onScreen && --e.fireT <= 0) { e.fireT = Math.max(70, 120 - d * 10); for (let i = 0; i < 3; i++) setTimeoutF(() => { if (!e.dead) enemyShot(e.x, e.y, g.p.x, g.p.y, 2.0); snd.eshot(); }, i * 8); }
              break;
            case 'heli': {
              const ty = g.camY + e.hy;
              e.y += clamp(ty - e.y, -1.2, 1.2);
              e.x += Math.sin(e.t * 0.02) * 1.2;
              e.x = clamp(e.x, 20, W - 20);
              if (onScreen && --e.fireT <= 0) { e.fireT = Math.max(50, 90 - d * 8); for (let i = -1; i <= 1; i++) enemyShot(e.x, e.y + 8, p.x + i * 20, p.y, 2.0); snd.eshot(); }
              break;
            }
          }
          // run them over
          if (p.ride && (e.type === 'soldier' || e.type === 'grenadier') && Math.abs(dx) < 11 && Math.abs(dy) < 11) damageEnemy(e, 9);
        }
        g.en = g.en.filter(e => !e.dead);
        // reinforcements from the top
        if (!g.bossOn && --g.reinT <= 0) {
          g.reinT = Math.max(90, 240 - d * 25) + irnd(120);
          const n = 1 + irnd(2 + Math.min(2, d));
          for (let i = 0; i < n; i++) {
            const x = 20 + rnd(W - 40), y = g.camY - 6;
            if (!solidAt(x, y)) g.en.push(mkEnemy({ type: Math.random() < 0.2 ? 'grenadier' : 'soldier', x, y }));
          }
        }
      }
      let timers = [];
      function setTimeoutF(fn, t) { timers.push({ fn, t }); }
      function updShots() {
        const p = g.p;
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (s.flame) { s.vx *= 0.96; s.vy *= 0.96; }
          if (s.t <= 0 || s.x < 0 || s.x > W || s.y < g.camY || s.y > g.camY + H) { s.dead = true; if (s.rocket && s.t <= 0) explode(s.x, s.y, 18, false, 4); continue; }
          const c = Math.floor(s.x / TS), r = Math.floor(s.y / TS), t = T(c, r);
          if (BLOCKSHOT[t]) {
            s.dead = true;
            if (s.rocket || s.shell) explode(s.x, s.y, s.rocket ? 18 : 12, false, s.dmg);
            else if (t !== WALL) { const i = r * COLS + c; thp[i] = Math.max(0, thp[i] - (s.flame ? 1 : 1)); if (thp[i] === 0) breakTile(c, r); else burst(s.x, s.y, '#e0c080', 2); }
            else burst(s.x, s.y, '#ffffff', 2);
            continue;
          }
          for (const e of g.en) {
            if (e.dead || (s.hitSet && s.hitSet.has(e))) continue;
            if (Math.abs(s.x - e.x) <= e.r + 2 && Math.abs(s.y - e.y) <= e.r + 3) {
              if (s.rocket || s.shell) { explode(s.x, s.y, s.rocket ? 18 : 12, false, s.dmg); s.dead = true; }
              else { damageEnemy(e, s.dmg); if (s.pierce) { (s.hitSet = s.hitSet || new Set()).add(e); } else s.dead = true; }
              if (s.dead) break;
            }
          }
          const b = g.boss;
          if (!s.dead && b && !b.dead && Math.abs(s.x - b.x) < b.r && Math.abs(s.y - b.y) < b.rh) {
            if (s.rocket || s.shell) explode(s.x, s.y, 14, false, s.dmg); else damageBoss(s.flame ? 0.5 : s.dmg);
            burst(s.x, s.y, '#ffffff', 2); s.dead = true;
          }
        }
        g.shots = g.shots.filter(s => !s.dead);
        for (const s of g.eshots) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (s.t <= 0 || s.x < -10 || s.x > W + 10 || s.y < g.camY - 20 || s.y > g.camY + H + 10) { s.dead = true; continue; }
          if (BLOCKSHOT[T(Math.floor(s.x / TS), Math.floor(s.y / TS))]) { s.dead = true; if (s.big) explode(s.x, s.y, 10, true, 2); continue; }
          const hr = p.ride ? 9 : 3;
          if (Math.abs(s.x - p.x) < hr && Math.abs(s.y - p.y) < hr + 2) { s.dead = true; hurtPlayerFn(s.big ? 6 : 2); }
        }
        g.eshots = g.eshots.filter(s => !s.dead);
        for (const n of g.nades) {
          n.t++;
          if (n.t >= n.dur) { n.dead = true; explode(n.x1, n.y1, 14, true, 2); }
        }
        g.nades = g.nades.filter(n => !n.dead);
      }
      // ---------- bosses ----------
      function startBoss() {
        g.bossOn = true;
        const k = STAGES[g.stage].boss, d = g.loop;
        const b = { type: k, x: W / 2, y: -30, hp: 0, max: 0, t: 0, enter: 90, r: 34, rh: 22, hitT: 0, vx: 0.6 };
        b.max = b.hp = { crawler: 170, gunship: 190, walker: 260 }[k] * (1 + d * 0.5);
        if (k === 'gunship') { b.r = 30; b.rh = 14; }
        if (k === 'walker') { b.r = 28; b.rh = 26; }
        g.boss = b;
        radio({ crawler: 'HQ: HEAVY ARMOR INBOUND! THE IRON CRAWLER!', gunship: 'HQ: GUNSHIP ON RADAR! TAKE IT DOWN!', walker: 'KRUXX: YOU DARE ENTER MY PALACE? FACE MY WAR-WALKER!' }[k]);
        au.melody([[110, 0.2], [104, 0.2], [98, 0.2], [92, 0.5]], { type: 'sawtooth', vol: 0.1 });
      }
      function updBoss() {
        const b = g.boss; if (!b) return;
        const p = g.p, d = g.loop;
        if (b.dead) {
          if (b.deadT % 7 === 0) { explode(b.x + rnd(60) - 30, b.y + rnd(40) - 20, 14, false, 0); }
          if (--b.deadT <= 0) { g.boss = null; g.phase = 'clear'; g.phaseT = 360; snd.jingle(); }
          return;
        }
        b.t++; if (b.hitT > 0) b.hitT--;
        const top = g.camY;
        if (b.enter > 0) { b.enter--; b.y += ((top + 60) - b.y) * 0.05; return; }
        const rage = b.hp < b.max / 2 ? 1.4 : 1;
        if (b.type === 'crawler') {
          b.x += b.vx * rage; if (b.x < 50 || b.x > W - 50) b.vx = -b.vx;
          b.y = top + 60 + Math.sin(b.t * 0.01) * 14;
          if (b.t % Math.round(45 / rage) === 0) { const sx = b.x + (b.t % 90 < 45 ? -20 : 20); enemyShot(sx, b.y + 14, p.x, p.y, 2.1 + d * 0.2, true); snd.cannon(); }
          if (b.t % 220 === 110) { for (let i = -3; i <= 3; i++) enemyShot(b.x, b.y + 20, b.x + i * 30, b.y + 100, 1.8); snd.eshot(); }
          if (b.t % 300 === 0 && g.en.length < 12) for (let i = 0; i < 2; i++) g.en.push(mkEnemy({ type: 'soldier', x: b.x - 10 + i * 20, y: b.y + 28 }));
        } else if (b.type === 'gunship') {
          b.x = W / 2 + Math.sin(b.t * 0.012 * rage) * 120;
          b.y = top + 64 + Math.sin(b.t * 0.024 * rage) * 30;
          if (b.t % 12 === 0 && (b.t % 160) < 60) { enemyShot(b.x, b.y + 10, b.x + (p.x - b.x) * 0.3, b.y + 100, 2.6); snd.eshot(); }
          if (b.t % Math.round(110 / rage) === 0) { for (let i = -1; i <= 1; i++) enemyShot(b.x + i * 16, b.y + 10, p.x + i * 18, p.y, 1.9, true); snd.rocket(); }
          if (b.t % 360 === 200 && g.en.length < 10) g.en.push(mkEnemy({ type: 'grenadier', x: b.x, y: b.y + 20 }));
        } else {
          b.x += b.vx * 0.7 * rage; if (b.x < 50 || b.x > W - 50) b.vx = -b.vx;
          b.y = top + 64 + Math.abs(Math.sin(b.t * 0.05)) * 3;
          if (b.t % Math.round(36 / rage) === 0) { enemyShot(b.x - 22, b.y + 6, p.x, p.y, 2.3 + d * 0.2); enemyShot(b.x + 22, b.y + 6, p.x, p.y, 2.3 + d * 0.2); snd.eshot(); }
          if (b.t % 200 === 100) { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; g.eshots.push({ x: b.x, y: b.y + 20, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, t: 240 }); } snd.big(); }
          if (b.t % 150 === 75) for (let i = 0; i < 2; i++) g.nades.push({ x0: b.x, y0: b.y - 10, x1: p.x + rnd(40) - 20, y1: p.y + rnd(30) - 15, t: 0, dur: 60 });
        }
        if (Math.abs(p.x - b.x) < b.r && Math.abs(p.y - b.y) < b.rh + 4) hurtPlayerFn(10);
      }
      function updPlay() {
        g.t++;
        for (const tm of timers) if (--tm.t <= 0) { tm.done = true; tm.fn(); }
        timers = timers.filter(t => !t.done);
        updPlayer(); if (g.phase !== 'play') return;
        // camera only scrolls forward
        if (!g.bossOn) {
          const target = g.p.y - 150;
          if (target < g.camY) g.camY = Math.max(0, target);
          if (g.camY <= 0) startBoss();
        }
        activateSpawns();
        updEnemies(); updBoss(); updShots();
        for (const w of g.pows) if (w.state === 'free') { w.t++; w.y += 0.9; }
        g.pows = g.pows.filter(w => !(w.state === 'free' && w.t > 90));
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 360;
        au.melody([[392, 0.2], [349, 0.2], [311, 0.2], [262, 0.6]], { type: 'square', vol: 0.09 });
      }
      function lastLife(onCont) {
        g.phase = 'wait';
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) onCont(); }, () => { if (g === cg) gameOver(); });
      }
      function respawn() {
        const p = g.p; g.phase = 'play'; p.inv = 150; p.weapon = 'gun'; p.ammo = 0; g.bombs = Math.max(g.bombs, 2);
        g.eshots = []; g.nades = [];
        if (boxSolid(p.x, p.y + 2, 3, 4)) { p.x = W / 2; for (let k = 0; k < 40 && boxSolid(p.x, p.y + 2, 3, 4); k++) p.x = 20 + rnd(W - 40); }
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
        if (g.radio && --g.radio.t <= 0) g.radio = null;
        if (g.flash > 0) g.flash--;
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.down ? 50 : 20));
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.vx *= 0.94; q.vy *= 0.94; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
        switch (g.phase) {
          case 'intro': if (--g.phaseT <= 0 || (g.phaseT < 120 && api.anyPressed('Enter'))) g.phase = 'play'; break;
          case 'play': updPlay(); break;
          case 'dead':
            if (--g.phaseT <= 0) {
              g.lives--;
              if (g.lives > 0) respawn();
              else lastLife(() => { g.lives = 3; respawn(); });
            }
            break;
          case 'clear':
            if (g.phaseT === 300) addScore(g.rescued * 2000);
            if (--g.phaseT <= 0) {
              g.stage++;
              if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; }
              startStage();
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 280 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawTiles(ctx) {
        const S = STAGES[g.stage], cy = Math.round(g.camY);
        const r0 = Math.max(0, Math.floor(cy / TS)), r1 = Math.min(LH - 1, Math.floor((cy + H) / TS));
        for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) {
          const t = tiles[r * COLS + c], x = c * TS, y = r * TS - cy;
          ctx.fillStyle = S.sand[(c + r) & 1]; ctx.fillRect(x, y, TS, TS);
          if (((c * 7 + r * 13) % 5) === 0) { ctx.fillStyle = '#a88048'; ctx.fillRect(x + ((c * 3) % 11), y + ((r * 5) % 13), 2, 1); }
          switch (t) {
            case ROAD: ctx.fillStyle = '#585048'; ctx.fillRect(x, y, TS, TS); if (c === 10 && (r & 1)) { ctx.fillStyle = '#e0d040'; ctx.fillRect(x + 7, y + 2, 2, 10); } break;
            case WALL: ctx.fillStyle = '#787068'; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#a09888'; ctx.fillRect(x, y, TS, 3); ctx.fillStyle = '#504840'; ctx.fillRect(x, y + 13, TS, 3); ctx.fillRect(x + ((r & 1) ? 4 : 11), y + 3, 1, 10); break;
            case BAGS:
              for (let k = 0; k < 3; k++) { ctx.fillStyle = '#9a8a58'; ctx.fillRect(x + 1 + (k & 1) * 3, y + 2 + k * 5, 12, 4); ctx.fillStyle = '#c0b078'; ctx.fillRect(x + 2 + (k & 1) * 3, y + 2 + k * 5, 10, 1); }
              break;
            case CRATE: ctx.fillStyle = '#8a5a28'; ctx.fillRect(x + 1, y + 1, 14, 14); ctx.fillStyle = '#b07a38'; ctx.fillRect(x + 2, y + 2, 12, 12); ctx.fillStyle = '#6a4018'; ctx.fillRect(x + 2, y + 7, 12, 2); ctx.fillRect(x + 7, y + 2, 2, 12); break;
            case PALM:
              ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 4, y + 10, 12, 4);
              ctx.fillStyle = '#7a5428'; ctx.fillRect(x + 7, y + 6, 3, 9);
              ctx.fillStyle = '#2a8a2a'; ctx.fillRect(x + 1, y + 2, 14, 3); ctx.fillRect(x + 5, y, 6, 8); ctx.fillRect(x, y + 5, 4, 3); ctx.fillRect(x + 12, y + 5, 4, 3);
              ctx.fillStyle = '#40b040'; ctx.fillRect(x + 6, y + 1, 4, 2);
              break;
            case FENCE: ctx.fillStyle = '#808890'; ctx.fillRect(x, y + 7, TS, 1); ctx.fillRect(x, y + 3, TS, 1); ctx.fillRect(x, y + 11, TS, 1); ctx.fillRect(x + 2, y + 1, 2, 14); ctx.fillRect(x + 10, y + 1, 2, 14); break;
            case RUBBLE: ctx.fillStyle = '#806848'; ctx.fillRect(x + 3, y + 8, 4, 3); ctx.fillRect(x + 9, y + 5, 3, 2); ctx.fillRect(x + 6, y + 11, 5, 2); break;
          }
        }
      }
      function drawEnemy(ctx, e, cy) {
        const x = Math.round(e.x), y = Math.round(e.y - cy), fl = e.hitT > 0 && (frame & 1);
        switch (e.type) {
          case 'soldier': drawSpr(ctx, SOLDIER[(e.t >> 3) & 1], x, y, { flip: g.p.x < e.x, col: fl ? '#fff' : null }); break;
          case 'grenadier': drawSpr(ctx, SOLDIER[(e.t >> 4) & 1], x, y, { flip: g.p.x < e.x, col: fl ? '#fff' : null, pal: { R: '#305030', T: '#6a6a3a' } }); break;
          case 'barrel': ctx.fillStyle = '#c03020'; ctx.fillRect(x - 4, y - 5, 9, 11); ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 4, y - 2, 9, 2); ctx.fillStyle = '#801810'; ctx.fillRect(x - 4, y + 3, 9, 1); break;
          case 'jeep':
            ctx.fillStyle = '#202020'; ctx.fillRect(x - 9, y - 9, 3, 6); ctx.fillRect(x + 6, y - 9, 3, 6); ctx.fillRect(x - 9, y + 4, 3, 6); ctx.fillRect(x + 6, y + 4, 3, 6);
            ctx.fillStyle = fl ? '#fff' : '#6a7040'; ctx.fillRect(x - 7, y - 11, 14, 22);
            ctx.fillStyle = '#404828'; ctx.fillRect(x - 6, y + 2, 12, 2);
            ctx.fillStyle = '#c02020'; ctx.fillRect(x - 2, y - 4, 5, 5); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x, y + 1, 1, 7);
            break;
          case 'tank': {
            ctx.fillStyle = '#303020'; ctx.fillRect(x - 12, y - 11, 5, 22); ctx.fillRect(x + 7, y - 11, 5, 22);
            ctx.fillStyle = '#505030'; for (let i = 0; i < 5; i++) { const yy = y - 11 + ((i * 5 + (e.t >> 2)) % 22); ctx.fillRect(x - 12, yy, 5, 1); ctx.fillRect(x + 7, yy, 5, 1); }
            ctx.fillStyle = fl ? '#fff' : '#7a7a48'; ctx.fillRect(x - 8, y - 10, 16, 20);
            ctx.fillStyle = '#9a9a60'; ctx.fillRect(x - 5, y - 5, 10, 10);
            ctx.fillStyle = '#404028'; for (let i = 4; i < 15; i++) ctx.fillRect(Math.round(x + Math.cos(e.ang) * i) - 1, Math.round(y + Math.sin(e.ang) * i) - 1, 3, 3);
            break;
          }
          case 'turret':
            ctx.fillStyle = '#585858'; ctx.fillRect(x - 9, y - 9, 18, 18); ctx.fillStyle = fl ? '#fff' : '#888878'; ctx.fillRect(x - 6, y - 6, 12, 12);
            ctx.fillStyle = '#303030'; for (let i = 3; i < 13; i++) ctx.fillRect(Math.round(x + Math.cos(e.ang) * i), Math.round(y + Math.sin(e.ang) * i), 2, 2);
            break;
          case 'heli': {
            ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 8, y + 20, 18, 6);
            ctx.fillStyle = fl ? '#fff' : '#506048'; ctx.fillRect(x - 7, y - 8, 14, 18); ctx.fillRect(x - 2, y - 22, 4, 16);
            ctx.fillStyle = '#80c0e0'; ctx.fillRect(x - 4, y + 4, 8, 5);
            ctx.fillStyle = '#202020'; const a = frame * 0.6; ctx.fillRect(Math.round(x - Math.cos(a) * 16), y - 1, Math.round(Math.cos(a) * 32) || 1, 2); ctx.fillRect(x - 1, Math.round(y - Math.sin(a) * 14), 2, Math.round(Math.sin(a) * 28) || 1);
            ctx.fillRect(x - 5, y - 22, 10, 1);
            break;
          }
        }
      }
      function drawBuggy(ctx, v, x, y, ang) {
        ctx.fillStyle = '#202020'; ctx.fillRect(x - 9, y - 8, 4, 6); ctx.fillRect(x + 5, y - 8, 4, 6); ctx.fillRect(x - 9, y + 3, 4, 6); ctx.fillRect(x + 5, y + 3, 4, 6);
        ctx.fillStyle = v.hitT > 0 && (frame & 1) ? '#fff' : '#3060c0'; ctx.fillRect(x - 6, y - 9, 12, 18);
        ctx.fillStyle = '#80b0ff'; ctx.fillRect(x - 4, y - 7, 8, 3);
        ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 6, y + 6, 12, 2);
        ctx.fillStyle = '#c0c0c0'; for (let i = 2; i < 12; i++) ctx.fillRect(Math.round(x + Math.cos(ang) * i), Math.round(y + Math.sin(ang) * i), 2, 2);
      }
      function drawBoss(ctx, cy) {
        const b = g.boss; if (!b) return;
        const x = Math.round(b.x), y = Math.round(b.y - cy), fl = b.hitT > 0 && (frame & 1);
        if (b.type === 'crawler') {
          ctx.fillStyle = '#282818'; ctx.fillRect(x - 40, y - 24, 12, 48); ctx.fillRect(x + 28, y - 24, 12, 48);
          ctx.fillStyle = '#484830'; for (let i = 0; i < 8; i++) { const yy = y - 24 + ((i * 6 + (b.t >> 1)) % 48); ctx.fillRect(x - 40, yy, 12, 2); ctx.fillRect(x + 28, yy, 12, 2); }
          ctx.fillStyle = fl ? '#fff' : '#6a6038'; ctx.fillRect(x - 30, y - 22, 60, 44);
          ctx.fillStyle = '#4a4428'; ctx.fillRect(x - 30, y - 22, 60, 4); ctx.fillRect(x - 8, y - 4, 16, 14);
          for (const sx of [-20, 20]) {
            ctx.fillStyle = '#8a8050'; ctx.fillRect(x + sx - 6, y - 6, 12, 12);
            const a = Math.atan2(g.p.y - b.y, g.p.x - (b.x + sx));
            ctx.fillStyle = '#303020'; for (let i = 5; i < 18; i++) ctx.fillRect(Math.round(x + sx + Math.cos(a) * i) - 1, Math.round(y + Math.sin(a) * i) - 1, 3, 3);
          }
          ctx.fillStyle = (frame & 8) ? '#ff2020' : '#802020'; ctx.fillRect(x - 2, y - 16, 4, 4);
        } else if (b.type === 'gunship') {
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 20, y + 40, 44, 10);
          ctx.fillStyle = fl ? '#fff' : '#5a6a50'; ctx.fillRect(x - 14, y - 12, 28, 28); ctx.fillRect(x - 4, y - 40, 8, 30);
          ctx.fillStyle = '#3a4a30'; ctx.fillRect(x - 30, y - 2, 60, 6);
          ctx.fillStyle = '#c03020'; for (const sx of [-26, -18, 18, 26]) ctx.fillRect(x + sx - 2, y + 4, 4, 6);
          ctx.fillStyle = '#90d0f0'; ctx.fillRect(x - 8, y + 8, 16, 6);
          ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 12, y - 40, 24, 2);
          ctx.fillStyle = '#202020'; const a = frame * 0.5; const L = 34;
          ctx.fillRect(Math.round(x - Math.abs(Math.cos(a)) * L), y - 1, Math.round(Math.abs(Math.cos(a)) * L * 2) || 1, 2);
          ctx.fillRect(x - 1, Math.round(y - Math.abs(Math.sin(a)) * L), 2, Math.round(Math.abs(Math.sin(a)) * L * 2) || 1);
        } else {
          const step = Math.sin(b.t * 0.1) * 4;
          ctx.fillStyle = '#404048'; ctx.fillRect(x - 24, y + 10 + step, 10, 26); ctx.fillRect(x + 14, y + 10 - step, 10, 26);
          ctx.fillStyle = '#202028'; ctx.fillRect(x - 28, y + 32 + step, 18, 6); ctx.fillRect(x + 10, y + 32 - step, 18, 6);
          ctx.fillStyle = fl ? '#fff' : '#8a3030'; ctx.fillRect(x - 28, y - 20, 56, 34);
          ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 28, y - 20, 56, 3); ctx.fillRect(x - 6, y - 26, 12, 6);
          ctx.fillStyle = '#90d0f0'; ctx.fillRect(x - 8, y - 12, 16, 8);
          ctx.fillStyle = '#e0b080'; ctx.fillRect(x - 3, y - 11, 6, 5); ctx.fillStyle = '#202020'; ctx.fillRect(x - 3, y - 12, 6, 2);
          ctx.fillStyle = '#505058'; ctx.fillRect(x - 36, y - 10, 10, 18); ctx.fillRect(x + 26, y - 10, 10, 18);
          ctx.fillStyle = '#202020'; ctx.fillRect(x - 33, y + 6, 4, 8); ctx.fillRect(x + 29, y + 6, 4, 8);
        }
        if (!b.dead) {
          ctx.fillStyle = '#400000'; ctx.fillRect(W / 2 - 70, 18, 140, 4);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(W / 2 - 70, 18, Math.round(140 * Math.max(0, b.hp) / b.max), 4);
        }
      }
      function drawPlayer(ctx, cy) {
        const p = g.p, x = Math.round(p.x), y = Math.round(p.y - cy);
        if (g.phase === 'dead') {
          const k = 100 - g.phaseT;
          if (k < 30) drawSpr(ctx, HERO[0], x, y, { col: (frame & 2) ? '#ffffff' : '#ff4040' });
          else { ctx.fillStyle = '#2f6f2f'; ctx.fillRect(x - 5, y + 2, 11, 4); ctx.fillStyle = '#3070ff'; ctx.fillRect(x - 7, y + 2, 3, 3); }
          return;
        }
        if (g.phase === 'wait' || g.phase === 'over') return;
        if (p.inv > 0 && (frame & 2)) return;
        if (p.ride) { drawBuggy(ctx, p.ride, x, y, Math.atan2(p.dy, p.dx)); return; }
        drawSpr(ctx, HERO[(p.walk >> 3) & 1], x, y, { flip: p.dx < 0 });
        ctx.fillStyle = '#303030';
        for (let i = 2; i < 8; i++) ctx.fillRect(Math.round(x + p.dx * i), Math.round(y - 1 + p.dy * i), 2, 1);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(20,12,4,0.85)'; ctx.fillRect(0, 0, W, 14);
        text(ctx, String(g.score), 6, 4, '#ffd200', 1);
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) drawSpr(ctx, HERO[0], 70 + i * 9, 7, {});
        const p = g.p;
        const wn = p.ride ? 'BUGGY ' + Math.max(0, p.ride.hp) : WEAPONS[p.weapon].name + (p.weapon !== 'gun' ? ' ' + p.ammo : '');
        text(ctx, wn, 126, 4, p.ride ? '#80b0ff' : WEAPONS[p.weapon].col, 1);
        text(ctx, 'B' + g.bombs, 238, 4, '#ff6040', 1);
        text(ctx, 'POW ' + g.rescued, 262, 4, '#ffffff', 1);
        text(ctx, String(hi), W - 4, 4, '#ff9020', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const cy = Math.round(g.camY);
        drawTiles(ctx);
        for (const f of g.fx) if (f.down) {
          const x = Math.round(f.x), y = Math.round(f.y - cy);
          if (f.t < 30 || (frame & 2)) { ctx.fillStyle = f.type === 'grenadier' ? '#6a6a3a' : '#8a6a3a'; ctx.fillRect(x - 5, y + 1, 10, 4); ctx.fillStyle = f.type === 'grenadier' ? '#305030' : '#c02020'; ctx.fillRect(x - 7, y + 1, 3, 3); }
        }
        for (const w of g.pows) {
          const x = Math.round(w.x), y = Math.round(w.y - cy);
          if (w.state === 'tied') { drawSpr(ctx, POW[0], x, y, {}); if ((frame + w.t) % 60 < 20) text(ctx, 'HELP', x, y - 14, '#ffffff', 1, 'center'); }
          else drawSpr(ctx, POW[(w.t >> 3) & 1], x, y, {});
        }
        for (const v of g.vehicles) { drawBuggy(ctx, v, Math.round(v.x), Math.round(v.y - cy), -Math.PI / 2); if (frame & 16) text(ctx, 'GET IN', v.x, v.y - cy - 18, '#80b0ff', 1, 'center'); }
        for (const it of g.items) {
          if (it.t < 120 && (frame & 4)) continue;
          const x = Math.round(it.x), y = Math.round(it.y - cy);
          if (it.k === 'cash') { ctx.fillStyle = '#30a030'; ctx.fillRect(x - 6, y - 3, 12, 7); ctx.fillStyle = '#a0ffa0'; ctx.fillRect(x - 1, y - 1, 3, 3); }
          else if (it.k === 'medal') { ctx.fillStyle = '#c02020'; ctx.fillRect(x - 2, y - 7, 5, 5); ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 3, y - 2, 7, 7); }
          else if (it.k === 'bomb') { ctx.fillStyle = '#303030'; ctx.fillRect(x - 4, y - 3, 9, 8); ctx.fillStyle = '#ff9020'; ctx.fillRect(x + 2, y - 6, 2, 3); text(ctx, 'B', x - 2, y - 2, '#ffffff', 1); }
          else { ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y - 6, 13, 13); ctx.fillStyle = WEAPONS[it.k].col; ctx.fillRect(x - 6, y - 6, 13, 1); ctx.fillRect(x - 6, y + 6, 13, 1); ctx.fillRect(x - 6, y - 6, 1, 13); ctx.fillRect(x + 6, y - 6, 1, 13); text(ctx, WEAPONS[it.k].c, x - 2, y - 3, WEAPONS[it.k].col, 1); }
        }
        for (const e of g.en) if (e.type !== 'heli') drawEnemy(ctx, e, cy);
        drawPlayer(ctx, cy);
        for (const e of g.en) if (e.type === 'heli') drawEnemy(ctx, e, cy);
        drawBoss(ctx, cy);
        for (const n of g.nades) {
          const k = n.t / n.dur, x = n.x0 + (n.x1 - n.x0) * k, y = n.y0 + (n.y1 - n.y0) * k - Math.sin(k * Math.PI) * 30;
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(n.x0 + (n.x1 - n.x0) * k) - 1, Math.round(n.y0 + (n.y1 - n.y0) * k - cy), 3, 2);
          ctx.fillStyle = '#304020'; ctx.fillRect(Math.round(x) - 1, Math.round(y - cy) - 1, 3, 3);
          if (k > 0.7) { ctx.strokeStyle = '#ff2020'; ctx.strokeRect(Math.round(n.x1) - 6, Math.round(n.y1 - cy) - 4, 12, 8); }
        }
        for (const s of g.shots) {
          const x = Math.round(s.x), y = Math.round(s.y - cy);
          if (s.flame) { ctx.fillStyle = s.t > 14 ? '#ffff80' : s.t > 7 ? '#ff9020' : '#c03010'; const r = 2 + ((22 - s.t) >> 3); ctx.fillRect(x - r, y - r, r * 2, r * 2); }
          else if (s.rocket || s.shell) { ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#ffd200'; ctx.fillRect(Math.round(x - s.vx), Math.round(y - s.vy), 2, 2); }
          else { ctx.fillStyle = '#ffffa0'; ctx.fillRect(x, y, 2, 2); }
        }
        for (const s of g.eshots) { ctx.fillStyle = s.big ? ((frame & 2) ? '#ffffff' : '#ff3030') : ((frame & 2) ? '#ff6040' : '#ffd200'); const r = s.big ? 2 : 1; ctx.fillRect(Math.round(s.x) - r, Math.round(s.y - cy) - r, r * 2 + 1, r * 2 + 1); }
        for (const f of g.fx) if (!f.down && f.t >= 0) {
          const r = f.r * Math.min(1, (f.t + 2) / 6);
          ctx.fillStyle = f.t < 5 ? '#ffffff' : f.t < 11 ? '#ffd040' : '#ff6020';
          ctx.beginPath(); ctx.arc(f.x, f.y - cy, r, 0, 6.283); ctx.fill();
          if (f.t > 10) { ctx.fillStyle = '#504030'; ctx.beginPath(); ctx.arc(f.x, f.y - cy - (f.t - 10), r * 0.5, 0, 6.283); ctx.fill(); }
        }
        for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y - cy), 2, 2); }
        for (const q of g.pops) text(ctx, q.txt, q.x, q.y - cy, (frame & 4) ? '#ffffff' : '#ffd200', 1, 'center');
        if (g.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (g.flash / 30).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
        // the forward arrow
        if (g.phase === 'play' && !g.bossOn && g.t % 600 < 120 && (frame & 16)) text(ctx, 'GO ^', W / 2, 30, '#ffffff', 2, 'center');
        drawHUD(ctx);
        if (g.radio) {
          const n = Math.min(g.radio.txt.length, (200 - g.radio.t) >> 1);
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, H - 14, W, 14);
          text(ctx, g.radio.txt.slice(0, n), W / 2, H - 11, '#30ff30', 1, 'center');
        }
        const S = STAGES[g.stage];
        if (g.phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(30, 70, W - 60, 80);
          text(ctx, 'MISSION ' + (g.stage + 1 + g.loop * 3), W / 2, 80, '#ffd200', 2, 'center');
          text(ctx, S.name, W / 2, 104, '#ffffff', 1, 'center');
          text(ctx, S.sub, W / 2, 116, '#ff9020', 1, 'center');
          text(ctx, 'RESCUE THE POWS. DESTROY THE ' + BOSSNAME[S.boss], W / 2, 134, '#30ff30', 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(30, 60, W - 60, 110);
          text(ctx, 'MISSION COMPLETE', W / 2, 72, CYC[(frame >> 2) & 7], 2, 'center');
          text(ctx, 'POWS RESCUED  ' + g.rescued, W / 2, 100, '#ffffff', 1, 'center');
          text(ctx, 'RESCUE BONUS  ' + g.rescued * 2000, W / 2, 114, '#ffd200', 1, 'center');
          if (g.stage === STAGES.length - 1) { text(ctx, 'KRUXX HAS FLED THE PALACE!', W / 2, 136, '#ff9020', 1, 'center'); text(ctx, 'THE HUNT CONTINUES...', W / 2, 148, '#30ff30', 1, 'center'); }
          else text(ctx, 'ON TO THE NEXT OBJECTIVE', W / 2, 140, '#30ff30', 1, 'center');
        }
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 108, 120, 24);
          text(ctx, 'GAME OVER', W / 2, 113, '#ff3030', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        const page = Math.floor(titleT / 420) % 3;
        // desert backdrop
        ctx.fillStyle = '#301808'; ctx.fillRect(0, 0, W, 120);
        ctx.fillStyle = '#ff7020'; ctx.beginPath(); ctx.arc(W / 2, 120, 50, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#c8a060'; ctx.fillRect(0, 120, W, H - 120);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = '#b08848'; ctx.fillRect((i * 47 + (frame >> 2)) % W, 130 + i * 12, 30, 2); }
        if (page === 0) {
          const t1 = 'TOTAL', t2 = 'CARNAGE';
          for (let i = 0; i < t1.length; i++) text(ctx, t1[i], 108 + i * 24, 26, '#ffd200', 4);
          for (let i = 0; i < t2.length; i++) text(ctx, t2[i], 62 + i * 30, 62 + Math.round(Math.sin(frame * 0.1 + i) * 2), (frame >> 3) & 1 && i % 2 ? '#ff6020' : '#ff3020', 5);
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(20, 128, W - 40, 50);
          text(ctx, 'THE DUNE EMPIRE OF GENERAL KRUXX', W / 2, 134, '#ffffff', 1, 'center');
          text(ctx, 'HOLDS OUR SOLDIERS PRISONER.', W / 2, 146, '#ffffff', 1, 'center');
          text(ctx, 'GO IN. GET THEM OUT. BRING HIM DOWN.', W / 2, 162, '#30ff30', 1, 'center');
          drawSpr(ctx, HERO[(frame >> 3) & 1], W / 2, 192, {});
          drawSpr(ctx, POW[(frame >> 4) & 1], W / 2 + 20, 193, {});
        } else if (page === 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 10, W - 40, 180);
          text(ctx, 'FIELD BRIEFING', W / 2, 18, '#ffd200', 2, 'center');
          const rows = [['SOLDIER', '100'], ['GRENADIER', '200'], ['JEEP', '500'], ['GUN TURRET', '750'], ['TANK', '1000'], ['HELICOPTER', '1500'], ['POW RESCUE', '1000 + 2000'], ['BOSS', '25000']];
          rows.forEach((r, i) => { text(ctx, r[0], 60, 44 + i * 12, '#ffffff', 1); text(ctx, r[1], W - 60, 44 + i * 12, '#ffd200', 1, 'right'); });
          text(ctx, 'S SPREAD  F FLAME  R ROCKETS  B BOMB', W / 2, 150, '#30ff30', 1, 'center');
          text(ctx, 'WALK INTO A BUGGY TO DRIVE IT', W / 2, 164, '#80b0ff', 1, 'center');
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 10, W - 40, 180);
          text(ctx, 'HIGH SCORE', W / 2, 30, '#ffd200', 2, 'center');
          text(ctx, String(hi), W / 2, 56, CYC[(frame >> 2) & 7], 3, 'center');
          text(ctx, 'ARROWS MOVE   WASD FIRE 8 WAYS', W / 2, 100, '#30ff30', 1, 'center');
          text(ctx, 'SPACE FIRES THE WAY YOU FACE', W / 2, 112, '#30ff30', 1, 'center');
          text(ctx, 'X: SMART BOMB / LEAVE VEHICLE', W / 2, 124, '#30ff30', 1, 'center');
          text(ctx, 'EXTRA LIFE EVERY 50000', W / 2, 146, '#ffffff', 1, 'center');
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 210, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 210, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 210, blink ? '#ffffff' : '#603010', 1, 'center');
        text(ctx, credStr(), 8, 228, '#403020', 1);
        text(ctx, '\u00a9 1992 MIDWAY', W - 8, 228, '#403020', 1, 'right');
      }
      return { update, render, destroy() { }, debug: () => ({ g, mode, tiles }) };
    }
  });
})();
