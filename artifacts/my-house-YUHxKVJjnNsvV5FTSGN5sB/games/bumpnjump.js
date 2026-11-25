// Bump 'n' Jump (Data East, 1982) - vertical road through the seasons: bump cars off the road, jump water gaps and land on cars, perfect-run bonus.
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
    '"': [10, 10, 20, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2],
    '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // col: css colour or array of 7 per-row colours (gradient lettering)
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let r = 0; r < 7; r++) {
      ctx.fillStyle = typeof col === 'string' ? col : col[r];
      for (let i = 0; i < s.length; i++) {
        const g = FONT[s[i]]; if (!g) continue;
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
    return w;
  }
  function textS(ctx, s, x, y, col, sc, align) { // with 1px drop shadow / outline
    sc = sc || 1;
    text(ctx, s, x + 1, y + 1, '#000', sc, align);
    if (sc > 1) { text(ctx, s, x - 1, y, '#000', sc, align); text(ctx, s, x + 1, y, '#000', sc, align); text(ctx, s, x, y - 1, '#000', sc, align); text(ctx, s, x, y + sc, '#000', sc, align); }
    return text(ctx, s, x, y, col, sc, align);
  }

  // ---------- helpers ----------
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function paint(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const [c, x] = mkCanvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
      const col = pal[rows[j][i]];
      if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
    }
    return c;
  }
  // rotate char rows 90 degrees clockwise (an up-facing sprite becomes right-facing)
  function rot90(rows) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), out = [];
    for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x] || '.'; out.push(s); }
    return out;
  }
  function flipV(rows) { return rows.slice().reverse(); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const pad2 = n => String(Math.min(99, n)).padStart(2, '0');


  // ======================================================================
  // Bump 'n' Jump: constants
  // ======================================================================
  const W = 224, H = 256, PY = 196;     // PY: screen row of the buggy
  const TOP = 16, BOT = 248;
  const smooth = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SEASONS = [
    { name: 'SPRING', g: ['#58c048', '#4eb43e'], deco: 'flower', road: '#606068', tree: '#2a8a2a', tree2: '#ff90c0' },
    { name: 'SUMMER', g: ['#2a9a2a', '#248e24'], deco: 'tree', road: '#585858', tree: '#106a10', tree2: '#30b030' },
    { name: 'AUTUMN', g: ['#c88030', '#bc7428'], deco: 'tree', road: '#5a5048', tree: '#a03a10', tree2: '#f0a020' },
    { name: 'WINTER', g: ['#e8eef8', '#dce4f0'], deco: 'snow', road: '#78788a', tree: '#305a40', tree2: '#ffffff' }
  ];
  const PTS = { sedan: 500, bumper: 800, truck: 1500 };

  // ---------- procedural pixel art (facing up) ----------
  const R = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  function buggy(body, trim) {
    const [c, x] = mkCanvas(14, 18);
    R(x, '#101010', 0, 1, 3, 5); R(x, '#101010', 11, 1, 3, 5); R(x, '#101010', 0, 11, 4, 6); R(x, '#101010', 10, 11, 4, 6);
    R(x, '#505050', 1, 2, 1, 3); R(x, '#505050', 12, 2, 1, 3); R(x, '#505050', 1, 12, 1, 4); R(x, '#505050', 12, 12, 1, 4);
    R(x, body, 4, 0, 6, 4); R(x, body, 3, 3, 8, 13); R(x, trim, 4, 6, 6, 5);
    R(x, '#a0e0ff', 4, 5, 6, 2); R(x, '#ffe060', 6, 8, 2, 2);
    R(x, '#202020', 4, 15, 6, 2); R(x, '#ffffa0', 4, 0, 1, 1); R(x, '#ffffa0', 9, 0, 1, 1);
    return c;
  }
  function sedan(body, trim) {
    const [c, x] = mkCanvas(14, 20);
    R(x, '#101010', 0, 3, 2, 4); R(x, '#101010', 12, 3, 2, 4); R(x, '#101010', 0, 13, 2, 4); R(x, '#101010', 12, 13, 2, 4);
    R(x, body, 2, 1, 10, 18); R(x, body, 3, 0, 8, 20);
    R(x, '#a0d0ff', 3, 4, 8, 3); R(x, trim, 3, 7, 8, 7); R(x, '#a0d0ff', 3, 14, 8, 2);
    R(x, '#ffff90', 3, 0, 2, 1); R(x, '#ffff90', 9, 0, 2, 1); R(x, '#ff3030', 3, 19, 2, 1); R(x, '#ff3030', 9, 19, 2, 1);
    return c;
  }
  function pickup(body) {
    const [c, x] = mkCanvas(14, 20);
    R(x, '#101010', 0, 3, 2, 4); R(x, '#101010', 12, 3, 2, 4); R(x, '#101010', 0, 13, 2, 5); R(x, '#101010', 12, 13, 2, 5);
    R(x, body, 2, 0, 10, 20); R(x, '#a0d0ff', 3, 3, 8, 2); R(x, '#202020', 3, 5, 8, 3);
    R(x, '#00000040', 3, 9, 8, 10); R(x, '#ffffff', 2, 8, 10, 1); R(x, '#d0d0d0', 1, 0, 12, 1);
    return c;
  }
  function truck(cab, box) {
    const [c, x] = mkCanvas(18, 32);
    R(x, '#101010', 0, 3, 2, 5); R(x, '#101010', 16, 3, 2, 5); R(x, '#101010', 0, 22, 2, 7); R(x, '#101010', 16, 22, 2, 7);
    R(x, cab, 3, 0, 12, 9); R(x, '#a0d0ff', 4, 2, 10, 2); R(x, '#303030', 3, 9, 12, 1);
    R(x, box, 2, 10, 14, 22); for (let i = 0; i < 5; i++) R(x, '#00000030', 2, 12 + i * 4, 14, 1);
    return c;
  }

  // ---------- original jaunty loop ----------
  const MEL = [659, 0, 784, 659, 523, 0, 587, 659, 698, 0, 659, 587, 523, 0, 0, 0, 587, 0, 698, 587, 494, 0, 523, 587, 659, 0, 587, 523, 494, 0, 392, 0];
  const BAS = [131, 196, 165, 196, 147, 220, 175, 220, 147, 196, 175, 196, 98, 147, 123, 147];

  ArcadeRegistry.register({
    id: 'bumpnjump', title: "Bump 'n' Jump", year: 1982, maker: 'Data East',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Up/Down: speed \u00b7 Space: jump \u00b7 Enter: start',
    marquee: { bg: '#1040a0', fg: '#ffe020', accent: '#ff3060' },
    create(api) {
      const au = api.audio;
      const SP = {
        player: buggy('#f0f0f0', '#2060e0'),
        sedan: [sedan('#4060e0', '#2040a0'), sedan('#a040c0', '#702090'), sedan('#40b0b0', '#208080')],
        bumper: pickup('#e02828'),
        truck: truck('#208a30', '#d8c890')
      };

      // ---------- course ----------
      let segs = [], genD = 0, genCx = 112, genW = 100, stageLen = 8000;
      function addSeg(kind, len, cxB, wB, extra) {
        const s = Object.assign({ kind, d0: genD, len, cxA: genCx, cxB, wA: genW, wB, split: null, edge: 'grass' }, extra || {});
        segs.push(s); genD += len; genCx = cxB; genW = wB; return s;
      }
      function buildStage(stage) {
        segs = []; genD = -400; genCx = 112; genW = 100;
        stageLen = 6500 + Math.min(4000, stage * 500);
        addSeg('road', 1000, 112, 100);
        const lvl = Math.min(8, stage);
        while (genD < stageLen - 700) {
          const r = Math.random();
          if (r < 0.18) addSeg('road', 300 + Math.random() * 400, genCx, genW);
          else if (r < 0.38) { const w = 64 + Math.floor(Math.random() * 56); addSeg('road', 400 + Math.random() * 300, clamp(112 + (Math.random() - 0.5) * 100, w / 2 + 14, W - w / 2 - 14), w); }
          else if (r < 0.58) {
            // water gap across the road: you have to jump it
            addSeg('road', 250, genCx, Math.max(genW, 80));
            addSeg('road', 160, genCx, genW, { warn: true });
            addSeg('gap', 44 + Math.floor(Math.random() * (20 + lvl * 9)), genCx, genW, { edge: 'water' });
            addSeg('road', 200, genCx, genW);
            if (lvl >= 4 && Math.random() < 0.4) { addSeg('road', 90, genCx, genW, { warn: true }); addSeg('gap', 40 + Math.floor(Math.random() * 30), genCx, genW, { edge: 'water' }); addSeg('road', 200, genCx, genW); }
          } else if (r < 0.75) {
            // narrow bridge over the river
            addSeg('road', 250, 112, 60);
            addSeg('road', 500 + Math.random() * 300, 112, 44 + Math.floor(Math.random() * 12), { edge: 'water' });
            addSeg('road', 200, 112, 90);
          } else {
            // the road splits round an island (grass or water)
            addSeg('road', 250, 112, 64);
            addSeg('road', 900, 112, 64, { split: { sep: 84, w2: 40 }, island: Math.random() < 0.5 ? 'water' : 'grass' });
            addSeg('road', 200, 112, 90);
          }
        }
        addSeg('road', stageLen - genD + 1200, 112, 100, { finish: true });
      }
      function segAt(d) { for (let i = segs.length - 1; i >= 0; i--) if (d >= segs[i].d0) return segs[i]; return segs[0]; }
      function row(d) {
        const s = segAt(d);
        const t = clamp((d - s.d0) / s.len, 0, 1), e = smooth(t);
        const cx = lerp(s.cxA, s.cxB, e), w = lerp(s.wA, s.wB, e);
        if (s.kind === 'gap') return { gap: true, ivs: [], edge: 'water', cx, w, seg: s };
        let ivs = [[cx - w / 2, cx + w / 2]], island = null;
        if (s.split) {
          const env = t < 0.3 ? smooth(t / 0.3) : t > 0.7 ? smooth((1 - t) / 0.3) : 1;
          const off = env * s.split.sep / 2, h2 = s.split.w2 / 2;
          const a = [cx - off - h2, cx - off + h2], b = [cx + off - h2, cx + off + h2];
          if (a[1] + 10 >= b[0]) ivs = [[a[0], b[1]]]; else { ivs = [a, b]; island = [a[1], b[0]]; }
        }
        return { gap: false, ivs, edge: s.edge, island, islandKind: s.island, warn: s.warn, seg: s };
      }
      function onRoad(x, d, half) {
        for (const dd of [d - 5, d + 5]) {
          const rw = row(dd); let ok = false;
          for (const iv of rw.ivs) if (x - half >= iv[0] && x + half <= iv[1]) ok = true;
          if (!ok) return false;
        }
        return true;
      }
      const ivAt = (rw, x) => { for (const iv of rw.ivs) if (x >= iv[0] - 2 && x <= iv[1] + 2) return iv; let b = null, bd = 1e9; for (const iv of rw.ivs) { const dd = Math.abs((iv[0] + iv[1]) / 2 - x); if (dd < bd) { bd = dd; b = iv; } } return b; };

      // ---------- state ----------
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;
      function newGame() {
        g = { score: 0, lives: 2, stage: 0, extras: [30000, 80000, 150000], phase: 'ready', t: 0, pops: [], fx: [], ents: [] };
        nextStage();
      }
      function nextStage() {
        g.stage++;
        g.season = SEASONS[(g.stage - 1) % 4];
        buildStage(g.stage);
        g.dist = 0; g.spd = 2; g.quota = 14 + Math.min(16, g.stage * 2); g.spawned = 0; g.smashed = 0; g.escaped = 0; g.deathsThisStage = 0;
        g.spawnT = 90; g.ents = []; g.fx = []; g.pops = [];
        resetPlayer();
        g.phase = 'ready'; g.t = 150;
        au.melody([[523, .1], [659, .1], [784, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: .1 });
      }
      function resetPlayer() {
        let d = g.dist; for (let k = 0; k < 600 && row(d).gap; k += 4) d += 4;  // never respawn over water
        g.dist = d;
        const rw = row(d); let best = rw.ivs[0]; for (const iv of rw.ivs) if (iv[1] - iv[0] > best[1] - best[0]) best = iv;
        g.p = { x: (best[0] + best[1]) / 2, vx: 0, air: 0, airT: 0, inv: 100 };
        g.spd = 2;
      }
      function pollCoins() {
        if (api.credits > lastCred) au.tone(1568, .06, { type: 'square', vol: .08, slideTo: 2093 });
        lastCred = api.credits;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(110, .25, { type: 'square', vol: .14 });
        return false;
      }
      function addScore(n) {
        g.score += n;
        while (g.extras.length && g.score >= g.extras[0]) { g.extras.shift(); g.lives++; au.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .15]], { type: 'square', vol: .1 }); pop(g.p.x, g.dist + 30, '1UP', '#40ff40'); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, wy, txt, col) { g.pops.push({ x, wy, txt, col: col || '#fff', t: 70 }); }
      const sy = wy => PY - (wy - g.dist);
      const zOf = o => o.air > 0 ? Math.sin(Math.PI * (1 - o.air / o.airT)) * (10 + o.airT * 0.18) : 0;

      // ---------- enemies ----------
      const SZ = { sedan: [12, 20], bumper: [12, 20], truck: [16, 32] };
      function spawn() {
        const lvl = Math.min(10, g.stage);
        const r = Math.random();
        const type = r < 0.15 + lvl * 0.02 ? 'truck' : r < 0.45 + lvl * 0.03 ? 'bumper' : 'sedan';
        const behind = g.spd < 2.8 ? Math.random() < 0.6 : Math.random() < 0.2;
        const wy = behind ? g.dist - (BOT - PY) - 30 : g.dist + (PY - TOP) + 30;
        const rw = row(wy);
        if (rw.gap || !rw.ivs.length) return;
        const iv = rw.ivs[Math.floor(Math.random() * rw.ivs.length)];
        const [w, h] = SZ[type];
        if (iv[1] - iv[0] < w + 8) return;
        const x = iv[0] + w / 2 + 4 + Math.random() * (iv[1] - iv[0] - w - 8);
        for (const e of g.ents) if (Math.abs(e.wy - wy) < 44 && Math.abs(e.x - x) < 22) return;
        const base = type === 'truck' ? 2.0 + lvl * 0.06 : type === 'bumper' ? 2.6 + lvl * 0.1 : 2.3 + Math.random() * 0.8 + lvl * 0.08;
        g.ents.push({ type, x, wy, w, h, vx: 0, spd: behind ? Math.max(base, g.spd + 1.2) : base, base, air: 0, airT: 0, lastHit: -999, sheet: Math.floor(Math.random() * 3), behind, laneT: 0, tx: x });
        g.spawned++;
      }
      function crashEnt(e, how) {
        e.dead = true;
        const byPlayer = how === 'crush' || frame - e.lastHit < 100;
        g.fx.push({ x: e.x, wy: e.wy, t: 0, water: how === 'water' });
        if (how === 'water') au.noise(0.5, { vol: .18, freq: 900, slideTo: 200 }); else au.noise(0.45, { vol: .2, freq: 2000, slideTo: 150 });
        if (byPlayer) {
          g.smashed++;
          const v = how === 'crush' ? PTS[e.type] + 300 : PTS[e.type];
          addScore(v); pop(e.x, e.wy, String(v), '#ffe040');
          au.melody([[880, .04], [1175, .04], [1568, .08]], { type: 'square', vol: .1 });
        } else g.escaped++;
      }
      function startJump(o, spd) {
        o.airT = Math.round(26 + spd * 9); o.air = o.airT;
      }
      function updateEnts() {
        const p = g.p, lvl = Math.min(10, g.stage);
        for (const e of g.ents) {
          if (e.dead) continue;
          const dyP = e.wy - g.dist;
          if (e.air > 0) { e.air--; e.wy += e.spd; if (e.air === 0 && !onRoad(e.x, e.wy, 3)) crashEnt(e, 'water'); continue; }
          // look ahead: gaps make enemies hop too
          const ahead = row(e.wy + e.h / 2 + 10);
          if (ahead.gap) { startJump(e, Math.max(e.spd, 3.2)); e.spd = Math.max(e.spd, 3.2); continue; }
          // lane keeping + behaviour
          const rw = row(e.wy + 24), iv = ivAt(rw, e.x) || [0, W];
          if (--e.laneT <= 0) { e.laneT = 60 + Math.random() * 90; e.tx = iv[0] + e.w / 2 + 4 + Math.random() * Math.max(1, iv[1] - iv[0] - e.w - 8); }
          let tx = e.tx, maxS = 0.5;
          if (e.type === 'bumper' && g.phase === 'play' && p.air === 0 && Math.abs(dyP) < 40) { tx = p.x; maxS = 0.9 + lvl * 0.06; }
          if (e.type === 'truck' && g.phase === 'play' && Math.abs(dyP) < 30) { tx = p.x; maxS = 0.4; }
          if (e.type === 'bumper' && g.phase === 'play') {
            // pace the player so they can line up a bump
            e.spd += ((dyP > 30 ? g.spd - 0.5 : dyP < -30 ? g.spd + 0.8 : g.spd) - e.spd) * 0.03;
          } else e.spd += (e.base - e.spd) * 0.02;
          tx = clamp(tx, iv[0] + e.w / 2 + 3, iv[1] - e.w / 2 - 3);
          e.x += clamp(tx - e.x, -maxS, maxS) + e.vx; e.vx *= 0.88;
          e.wy += e.spd;
          if (!onRoad(e.x, e.wy, e.w / 2 - 2)) crashEnt(e, row(e.wy).edge === 'water' || row(e.wy).islandKind === 'water' ? 'water' : 'wall');
        }
        // enemy vs enemy shoves
        for (let i = 0; i < g.ents.length; i++) for (let j = i + 1; j < g.ents.length; j++) {
          const a = g.ents[i], b = g.ents[j];
          if (a.dead || b.dead || a.air || b.air) continue;
          const dx = b.x - a.x, dy = b.wy - a.wy;
          if (Math.abs(dx) < (a.w + b.w) / 2 && Math.abs(dy) < (a.h + b.h) / 2) {
            if (Math.abs(dx) > Math.abs(dy) * 0.5) { const s = Math.sign(dx) || 1; a.vx -= s * 1.2; b.vx += s * 1.2; const lh = Math.max(a.lastHit, b.lastHit); if (frame - lh < 100) { a.lastHit = b.lastHit = lh; } }
            else { const back = dy > 0 ? a : b, front = dy > 0 ? b : a; back.spd = Math.min(back.spd, front.spd - 0.2); back.wy = front.wy - (a.h + b.h) / 2 - 0.5; }
          }
        }
        // leaving the screen counts as escaped
        for (const e of g.ents) {
          if (e.dead) continue;
          const s = sy(e.wy);
          if (s < TOP - 90 || s > BOT + 70) { e.dead = true; g.escaped++; }
        }
        g.ents = g.ents.filter(e => !e.dead);
      }

      // ---------- player ----------
      function killPlayer(how) {
        if (g.phase !== 'play') return;
        g.phase = 'dying'; g.t = 120; g.how = how; g.deathsThisStage++;
        g.fx.push({ x: g.p.x, wy: g.dist, t: 0, water: how === 'water', big: true });
        if (how === 'water') { au.noise(0.8, { vol: .25, freq: 1200, slideTo: 150 }); au.tone(600, .6, { type: 'sine', vol: .12, slideTo: 80 }); }
        else { au.noise(0.8, { vol: .28, freq: 2500, slideTo: 100 }); au.tone(220, .7, { type: 'sawtooth', vol: .12, slideTo: 40 }); }
      }
      function updatePlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        const steer = (api.key('ArrowLeft') ? -1 : 0) + (api.key('ArrowRight') ? 1 : 0);
        if (p.air > 0) {
          // airborne: steer a little, speed is locked
          p.x = clamp(p.x + steer * 1.1, 4, W - 4);
          p.air--;
          // coming down onto a car squashes it
          if (p.air < p.airT * 0.35) {
            for (const e of g.ents) {
              if (e.dead || e.air) continue;
              if (Math.abs(e.x - p.x) < (e.w + 10) / 2 && Math.abs(e.wy - g.dist) < (e.h + 14) / 2) { crashEnt(e, 'crush'); p.air = 0; au.tone(160, .12, { type: 'square', vol: .14 }); break; }
            }
          }
          if (p.air === 0) {
            au.tone(110, .08, { type: 'square', vol: .12 });
            if (!onRoad(p.x, g.dist, 4)) { killPlayer(row(g.dist).gap || row(g.dist).edge === 'water' || row(g.dist).island && row(g.dist).islandKind === 'water' ? 'water' : 'wall'); }
          }
          return;
        }
        if (api.key('ArrowUp')) g.spd = Math.min(5.6, g.spd + 0.045);
        if (api.key('ArrowDown')) g.spd = Math.max(1, g.spd - 0.09);
        p.x += steer * (1.1 + g.spd * 0.22) + p.vx; p.vx *= 0.85;
        if (api.pressed('Space')) {
          if (g.spd >= 2.0) { startJump(p, g.spd); au.tone(300, .35, { type: 'square', vol: .12, slideTo: 900 }); }
          else { au.tone(120, .1, { type: 'square', vol: .1 }); pop(p.x, g.dist + 20, 'SPEED UP!', '#ff8080'); }
        }
        if (p.inv > 0) {
          const rw = row(g.dist), iv = ivAt(rw, p.x);
          if (iv) p.x = clamp(p.x, iv[0] + 7, iv[1] - 7);
          if (rw.gap || row(g.dist + 12).gap) { g.spd = Math.max(g.spd, 3.4); startJump(p, g.spd); }
          return;
        }
        if (!onRoad(p.x, g.dist, 5)) {
          const rw = row(g.dist);
          killPlayer(rw.gap || (rw.edge === 'water' && !rw.island) || rw.islandKind === 'water' ? 'water' : 'wall');
          return;
        }
        // bumping
        for (const e of g.ents) {
          if (e.dead || e.air) continue;
          const dx = e.x - p.x, dy = e.wy - g.dist;
          const ox = (e.w + 12) / 2 - Math.abs(dx), oy = (e.h + 16) / 2 - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          const s = Math.sign(dx) || 1;
          if (ox < oy) {
            const heavy = e.type === 'truck';
            e.vx += s * (heavy ? 0.9 : 3.4); p.vx -= s * (heavy ? 3.6 : e.type === 'bumper' ? 1.8 : 1.0);
            e.x += s * ox * 0.5; p.x -= s * ox * 0.5;
            e.lastHit = frame;
            au.tone(90, .07, { type: 'square', vol: .14 }); au.noise(.06, { vol: .1, freq: 1500 });
          } else if (dy > 0) {
            // ran into the back of it
            g.spd = Math.max(1, e.spd - 0.6); g.dist = e.wy - (e.h + 16) / 2 - 0.5; e.spd += 0.4; e.lastHit = frame;
            au.tone(70, .1, { type: 'square', vol: .14 });
          } else { e.spd = Math.max(0.5, g.spd - 0.6); e.wy = g.dist - (e.h + 16) / 2 - 0.5; }
        }
      }

      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        if (mode === 'title') { titleT++; if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); } return; }
        for (const pp of g.pops) { pp.t--; pp.wy += 0.6; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 50);
        if (g.phase === 'ready') { g.dist += 0; if (--g.t <= 0) g.phase = 'play'; updateEnts(); return; }
        if (g.phase === 'play') {
          updatePlayer();
          if (g.phase === 'play') {
            g.dist += g.spd;
            if (g.spawned < g.quota && --g.spawnT <= 0) { g.spawnT = Math.max(40, 120 - g.stage * 6) + Math.floor(Math.random() * 60); spawn(); }
            if (frame % 8 === 0) { const st = (frame >> 3) % 32; if (MEL[st]) au.tone(MEL[st], .12, { type: 'square', vol: .045 }); if (st % 2 === 0) au.tone(BAS[(st >> 1) % 16], .14, { type: 'triangle', vol: .08 }); }
            if (frame % 6 === 0 && g.p.air === 0) au.tone(45 + g.spd * 14, .09, { type: 'sawtooth', vol: .025 });
            if (g.dist >= stageLen) {
              g.phase = 'clear'; g.t = 0;
              // cars never met count as escaped
              g.escaped += g.quota - g.spawned + g.ents.length; g.spawned = g.quota; g.ents = [];
              g.perfect = g.smashed >= g.quota;
              au.melody([[784, .1], [659, .1], [784, .1], [1047, .1], [1319, .1], [1568, .3]], { type: 'square', vol: .12 });
            }
          }
          updateEnts();
          return;
        }
        if (g.phase === 'dying') {
          g.spd *= 0.95; updateEnts();
          if (--g.t > 0) return;
          const respawn = () => { g.ents = g.ents.filter(e => Math.abs(e.wy - g.dist) > 150); resetPlayer(); g.phase = 'ready'; g.t = 70; };
          if (g.lives <= 0) {
            g.phase = 'wait';
            const end = () => { api.setHiScore(g.score); g.phase = 'over'; g.t = 330; au.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: .1 }); };
            if (api.offerContinue) api.offerContinue(() => { g.lives = 2; respawn(); }, end); else end();
          } else { g.lives--; respawn(); }
          return;
        }
        if (g.phase === 'clear') {
          g.t++;
          g.dist += 1.5;
          if (g.t === 90) { addScore(g.smashed * 100); au.tone(1047, .1, { type: 'square', vol: .1 }); }
          if (g.t === 170 && g.perfect) { addScore(10000 * Math.min(3, Math.ceil(g.stage / 4))); au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .3]], { type: 'square', vol: .12 }); }
          if (g.t > 300) nextStage();
          return;
        }
        if (g.phase === 'over') { if (--g.t <= 0 || (g.t < 250 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } }
      }

      // ======================================================================
      // Rendering
      // ======================================================================
      function hash(n) { n = Math.sin(n * 78.233 + 12.9898) * 43758.5453; return n - Math.floor(n); }
      function drawCourse(ctx, dist, season) {
        for (let y = TOP; y < BOT; y += 2) {
          const d = dist + (PY - y), rw = row(d), band = Math.floor(d / 32) & 1;
          const waterRow = rw.gap || rw.edge === 'water';
          ctx.fillStyle = waterRow ? (band ? '#1a5ad0' : '#1850c0') : season.g[band];
          ctx.fillRect(0, y, W, 2);
          if (rw.gap) {
            // broken bridge: stumps either side, waves in the gap
            if (hash(Math.floor(d / 4)) < 0.25) { ctx.fillStyle = '#90c0ff'; ctx.fillRect(Math.floor(hash(Math.floor(d / 4) + 3) * (W - 10)), y, 8, 1); }
            ctx.fillStyle = '#6a4a2a'; ctx.fillRect(Math.round(rw.cx - rw.w / 2) - 4, y, 4, 2); ctx.fillRect(Math.round(rw.cx + rw.w / 2), y, 4, 2);
            continue;
          }
          if (waterRow && hash(Math.floor(d / 4) * 3) < 0.2) { ctx.fillStyle = '#90c0ff'; ctx.fillRect(Math.floor(hash(Math.floor(d / 4) + 7) * (W - 10)), y, 7, 1); }
          if (rw.island) {
            ctx.fillStyle = rw.islandKind === 'water' ? '#1850c0' : season.g[band ^ 1];
            ctx.fillRect(Math.round(rw.island[0]), y, Math.round(rw.island[1] - rw.island[0]), 2);
          }
          for (const iv of rw.ivs) {
            const l = Math.round(iv[0]), r = Math.round(iv[1]);
            ctx.fillStyle = season.road; ctx.fillRect(l, y, r - l, 2);
            // rails / kerbs
            ctx.fillStyle = waterRow ? '#c09060' : ((Math.floor(d / 8) & 1) ? '#ffffff' : '#ff3030');
            ctx.fillRect(l, y, 2, 2); ctx.fillRect(r - 2, y, 2, 2);
            if (r - l > 50 && (Math.floor(d / 16) & 1)) { ctx.fillStyle = '#f0f0d0'; ctx.fillRect(Math.round((l + r) / 2) - 1, y, 2, 2); }
          }
          if (rw.warn && (Math.floor(d / 10) & 1)) { ctx.fillStyle = '#ffe020'; for (const iv of rw.ivs) for (let x = iv[0] + 6; x < iv[1] - 8; x += 14) ctx.fillRect(Math.round(x), y, 6, 2); }
          if (rw.seg.finish && d >= stageLen && d < stageLen + 12) {
            for (const iv of rw.ivs) for (let x = Math.round(iv[0]); x < iv[1]; x += 4) { ctx.fillStyle = ((x >> 2) + (Math.floor(d / 4))) & 1 ? '#000' : '#fff'; ctx.fillRect(x, y, 4, 2); }
          }
          // scenery
          if (!waterRow && (Math.floor(d) % 26) < 2) {
            const k = Math.floor(d / 26);
            for (let i = 0; i < 3; i++) {
              const tx = Math.floor(hash(k * 7 + i) * (W - 10));
              if (rw.ivs.some(iv => tx > iv[0] - 14 && tx < iv[1] + 4)) continue;
              if (rw.island && tx > rw.island[0] - 10 && tx < rw.island[1]) continue;
              if (season.deco === 'flower') { ctx.fillStyle = season.tree2; ctx.fillRect(tx, y, 3, 3); ctx.fillRect(tx + 5, y + 2, 3, 3); ctx.fillStyle = '#fff'; ctx.fillRect(tx + 1, y + 1, 1, 1); }
              else if (season.deco === 'snow') { ctx.fillStyle = season.tree; ctx.fillRect(tx + 3, y - 8, 4, 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(tx + 1, y - 6, 8, 3); ctx.fillRect(tx + 2, y - 10, 6, 3); }
              else { ctx.fillStyle = season.tree; ctx.fillRect(tx, y - 7, 10, 9); ctx.fillStyle = season.tree2; ctx.fillRect(tx + 2, y - 8, 5, 4); ctx.fillStyle = '#5a3a18'; ctx.fillRect(tx + 4, y + 2, 2, 3); }
            }
          }
        }
      }
      function drawCar(ctx, img, x, y, z) {
        if (z > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(x - img.width / 2 + 2), Math.round(y - img.height / 2 + 3), img.width - 2, img.height - 2);
          const k = 1 + z / 40, w = Math.round(img.width * k), h = Math.round(img.height * k);
          ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - z - h / 2), w, h);
        } else ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
      }
      function imgOf(e) { return e.type === 'truck' ? SP.truck : e.type === 'bumper' ? SP.bumper : SP.sedan[e.sheet]; }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP); ctx.fillRect(0, BOT, W, H - BOT);
        text(ctx, '1UP', 4, 1, '#ff4040', 1); text(ctx, String(g ? g.score : 0).padStart(6, '0'), 4, 8, '#ffffff', 1);
        text(ctx, 'HI-SCORE', W / 2, 1, '#ff4040', 1, 'center'); text(ctx, String(hi).padStart(6, '0'), W / 2, 8, '#ffffff', 1, 'center');
        if (!g) return;
        text(ctx, 'STAGE ' + g.stage, W - 4, 1, '#40e0ff', 1, 'right');
        text(ctx, String(Math.round(g.spd * 40)).padStart(3, ' ') + 'KM', W - 4, 8, '#ffe040', 1, 'right');
        // course progress
        ctx.fillStyle = '#303030'; ctx.fillRect(4, BOT + 2, 100, 4);
        ctx.fillStyle = '#40ff40'; ctx.fillRect(4, BOT + 2, Math.round(100 * clamp(g.dist / stageLen, 0, 1)), 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(104, BOT + 1, 1, 6);
        for (let i = 0; i < Math.min(5, g.lives); i++) ctx.drawImage(SP.player, W - 12 - i * 11, BOT, 8, 8);
        text(ctx, pad2(g.smashed) + '/' + pad2(g.quota), 112, BOT + 1, '#ffffff', 1);
      }
      function drawTitle(ctx) {
        const season = SEASONS[Math.floor(titleT / 600) % 4];
        if (!segs.length || titleT === 1) buildStage(1);
        drawCourse(ctx, (titleT * 1.5) % 5000, season);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(8, 24, W - 16, 216);
        const cols = ['#fff8a0', '#ffe840', '#ffd820', '#ffb820', '#ff9020', '#ff6020', '#e03010'];
        const bounce = i => Math.round(Math.abs(Math.sin(titleT / 12 + i * 0.6)) * -5);
        'BUMP'.split('').forEach((c, i) => textS(ctx, c, 40 + i * 20, 40 + bounce(i), cols, 3));
        textS(ctx, "'N'", 128, 44, ['#fff', '#fff', '#ffc0e0', '#ff80c0', '#ff4090', '#ff2060', '#c01040'], 2);
        'JUMP'.split('').forEach((c, i) => textS(ctx, c, 72 + i * 20, 70 + bounce(i + 4), cols, 3));
        ctx.drawImage(SP.player, W / 2 - 7, 104);
        text(ctx, '- SCORE -', W / 2, 128, '#40e0ff', 1, 'center');
        ctx.drawImage(SP.sedan[0], 30, 138); text(ctx, 'BUMP OFF  500', 52, 144, '#ffffff', 1);
        ctx.drawImage(SP.bumper, 30, 162); text(ctx, 'BUMP OFF  800', 52, 168, '#ffffff', 1);
        ctx.drawImage(SP.truck, 28, 184); text(ctx, 'LAND ON  1800', 52, 196, '#ffffff', 1);
        text(ctx, 'JUMP THE WATER!', W / 2, 212, '#40e0ff', 1, 'center');
        text(ctx, 'SMASH EVERY CAR: PERFECT', W / 2, 222, '#ffe040', 1, 'center');
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 232, '#ff3030', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 232, '#ff3030', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP); ctx.fillRect(0, BOT, W, H - BOT);
        text(ctx, 'HI-SCORE ' + String(hi).padStart(6, '0'), W / 2, 4, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1982 DATA EAST', 4, BOT + 1, '#c0c0c0', 1);
        text(ctx, 'CREDIT ' + pad2(api.credits), W - 4, BOT + 1, '#ffffff', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawCourse(ctx, g.dist, g.season);
        for (const f of g.fx) {
          const x = Math.round(f.x), y = Math.round(sy(f.wy)), r = Math.round(Math.min(1, f.t / 8) * (f.big ? 16 : 11));
          if (f.water) {
            ctx.fillStyle = '#e0f0ff'; ctx.fillRect(x - r, y - 2, r * 2, 4); ctx.fillRect(x - 2, y - r, 4, r);
            ctx.fillStyle = '#80b8ff'; ctx.fillRect(x - r / 2, y - r / 2, r, r / 2);
          } else {
            ctx.fillStyle = f.t > 30 ? '#503020' : '#ff5010'; ctx.fillRect(x - r, y - r / 2, r * 2, r); ctx.fillRect(x - r / 2, y - r, r, r * 2);
            if (f.t <= 30) { ctx.fillStyle = '#ffe040'; ctx.fillRect(x - r / 2, y - r / 3, r, r / 1.5); }
          }
        }
        const items = g.ents.slice().sort((a, b) => zOf(a) - zOf(b));
        for (const e of items) drawCar(ctx, imgOf(e), e.x, sy(e.wy), zOf(e));
        if (g.phase !== 'dying' && g.phase !== 'over' && g.phase !== 'wait' && (g.p.inv <= 0 || (frame >> 2) & 1 || g.p.air > 0)) drawCar(ctx, SP.player, g.p.x, PY, zOf(g.p));
        for (const pp of g.pops) textS(ctx, pp.txt, Math.round(pp.x), Math.round(sy(pp.wy)) - 14, pp.col, 1, 'center');
        if (g.phase === 'ready') {
          textS(ctx, 'STAGE ' + g.stage, W / 2, 70, '#ffffff', 2, 'center');
          textS(ctx, g.season.name, W / 2, 92, '#ffe040', 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 60, W - 40, 100);
          textS(ctx, 'STAGE ' + g.stage + ' CLEAR', W / 2, 68, '#ffe040', 1, 'center');
          if (g.t > 40) textS(ctx, 'CARS SMASHED ' + g.smashed + '/' + g.quota, W / 2, 88, '#ffffff', 1, 'center');
          if (g.t > 90) textS(ctx, 'BONUS ' + g.smashed * 100, W / 2, 104, '#40e0ff', 1, 'center');
          if (g.t > 170) {
            if (g.perfect) { if ((frame >> 3) & 1) textS(ctx, 'PERFECT!', W / 2, 122, '#ff4090', 2, 'center'); textS(ctx, (10000 * Math.min(3, Math.ceil(g.stage / 4))) + ' PTS', W / 2, 142, '#ffffff', 1, 'center'); }
            else textS(ctx, 'NO PERFECT BONUS', W / 2, 126, '#a0a0a0', 1, 'center');
          }
        }
        if (g.phase === 'over' || g.phase === 'wait') textS(ctx, 'GAME OVER', W / 2, 110, '#ff3030', 2, 'center');
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode, row, stageLen: () => stageLen });
      return { update, render, destroy() { } };
    }
  });
})();
