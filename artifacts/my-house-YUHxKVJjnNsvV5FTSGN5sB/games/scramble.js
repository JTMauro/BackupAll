// Scramble (Konami, 1981) \u2014 written from scratch for the MAME32 Game Room.
// Fly through six zones to the enemy base: lasers ahead, bombs below, and keep the fuel topped up.
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
    for (const r of s.runs) {
      ctx.fillStyle = o.col || (o.pal && o.pal[r.k]) || r.c;
      const xx = o.flip ? s.w - r.x - r.n : r.x;
      ctx.fillRect(x0 + xx, y0 + r.y, r.n, 1);
    }
  }


  const W = 256, H = 224, TOP = 22, BOT = 208, COLW = 4;
  const STAGE_LEN = [1500, 1300, 1300, 1500, 1500, 760];
  const STAGE_NAMES = ['1ST', '2ND', '3RD', '4TH', '5TH', 'BASE'];
  const STAGE_COL = [['#c06020', '#ffa040'], ['#2080c0', '#60c0ff'], ['#a02080', '#ff60c0'], ['#2040c0', '#8090ff'], ['#208040', '#60ff80'], ['#a08020', '#ffe040']];
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216; }

  const SHIP = makeSpr([
    '..WW............',
    '..WWWW..........',
    '.BWWWWWWCC......',
    'WWWWWWWWWWWWWW..',
    'BBBBWWWWWWWWWWWW',
    '.WWWWWWWWWWWW...',
    '..WWWW..........',
    '..WW............'], { W: '#ffffff', B: '#3070ff', C: '#40e0ff' });
  const ROCKET = makeSpr(['..R..', '.RRR.', '.RWR.', '.RRR.', '.RRR.', '.RRR.', '.YRY.', 'Y.R.Y', 'Y...Y'], { R: '#ff3030', W: '#ffffff', Y: '#ffd020' });
  const FUELT = makeSpr(['..MMMMMMMM..', '.MMMMMMMMMM.', 'MMWWWMMMMMMM', 'MMWMMMMMMMMM', 'MMWWMMMMMMMM', 'MMWMMMMMMMMM', 'MMWMMMMMMMMM', 'MMMMMMMMMMMM', '.MMMMMMMMMM.', '.M........M.'],
    { M: '#ff40a0', W: '#ffffff' });
  const MYST = makeSpr(['.OOOOOOOO.', 'OOWWWWWWOO', 'OWWOOOOWWO', 'OOOOOOWWOO', 'OOOOWWWOOO', 'OOOOWWOOOO', 'OOOOOOOOOO', 'OOOOWWOOOO', '.OOOOOOOO.'],
    { O: '#30c0ff', W: '#ffffff' });
  const UFO = makeSpr(['....GGGG....', '..GGYYYYGG..', 'GGGGGGGGGGGG', '.G.G.GG.G.G.', '..G......G..'], { G: '#30ff60', Y: '#ffff40' });
  const FIREBALL = [makeSpr(['....RRYY..', '..RRYYWWY.', 'RRRYYWWWWY', '..RRYYWWY.', '....RRYY..'], { R: '#ff3000', Y: '#ffc000', W: '#ffffff' }),
    makeSpr(['...R.RYY..', '.RR.YYWWY.', 'R.RYYWWWWY', '.RR.YYWWY.', '...R.RYY..'], { R: '#ff3000', Y: '#ffc000', W: '#ffffff' })];
  const BASE = makeSpr([
    '..........FF..........',
    '..........FFFF........',
    '..........F...........',
    '.......DDDDDDDD.......',
    '.....DDDDDDDDDDDD.....',
    '....DDDDWWWWWWDDDD....',
    '....DDDWWRRRRWWDDD....',
    'GGGGGGGGGGGGGGGGGGGGGG',
    'GWWGGWWGGWWGGWWGGWWGGG',
    'GGGGGGGGGGGGGGGGGGGGGG',
    'GGWWWWGGGGGGGGGGWWWWGG',
    'GGGGGGGGGGGGGGGGGGGGGG'], { F: '#ff3030', D: '#c0c0c0', W: '#ffffff', R: '#ff3030', G: '#40a0ff' });

  ArcadeRegistry.register({
    id: 'scramble', title: 'Scramble', year: 1981, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: laser \u00b7 X: bomb \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#ff40a0', accent: '#30c0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null, demo = null;
      const stars = [];
      for (let i = 0; i < 50; i++) stars.push({ x: rnd(W), y: TOP + rnd(BOT - TOP), c: ['#ffffff', '#ff6060', '#60ff60', '#6060ff', '#ffff60'][i % 5], p: irnd(64) });

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        laser() { au.tone(2200, 0.05, { type: 'square', vol: 0.04, slideTo: 1200 }); },
        bomb() { au.tone(1800, 0.6, { type: 'sine', vol: 0.05, slideTo: 400 }); },
        boom() { au.noise(0.22, { vol: 0.14, freq: 2400, slideTo: 150 }); },
        fuel() { au.melody([[1047, 0.05], [1319, 0.05], [1568, 0.08]], { type: 'square', vol: 0.07 }); au.noise(0.2, { vol: 0.1, freq: 1800 }); },
        launch() { au.noise(0.5, { vol: 0.06, freq: 600, slideTo: 3000, type: 'bandpass' }); },
        die() { au.noise(1.0, { vol: 0.2, freq: 3500, slideTo: 60 }); au.tone(500, 0.9, { type: 'sawtooth', vol: 0.1, slideTo: 40 }); },
        low() { au.tone(880, 0.08, { type: 'square', vol: 0.06 }); },
        stage() { au.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.16]], { type: 'square', vol: 0.08 }); },
        base() { au.melody([[523, 0.1], [523, 0.1], [784, 0.1], [1047, 0.1], [784, 0.1], [1047, 0.1], [1319, 0.4]], { type: 'square', vol: 0.1 }); },
        life() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.1 }); }
      };

      // ---------- course: six zones of terrain columns plus ground targets ----------
      function buildCourse(loop) {
        const cols = [], objs = [], starts = [];
        let gy = 190;
        const flatten = (i0, n) => { const h = cols[i0].g; for (let k = i0; k < Math.min(cols.length, i0 + n); k++) cols[k].g = h; return h; };
        for (let s = 0; s < 6; s++) {
          const r = rng(s * 1013 + loop * 7919 + 3);
          const n = STAGE_LEN[s] / COLW, i0 = cols.length;
          starts.push(i0 * COLW);
          let target = gy, hold = 0, bh = 0, bw = 0, cy = 110, cyT = 110;
          const gap = Math.max(52, 70 - loop * 6);
          for (let i = 0; i < n; i++) {
            let c = TOP;
            if (s === 0 || s === 1 || s === 2) {
              if (--hold <= 0) {
                hold = 8 + ((r() * 16) | 0);
                target = s === 1 ? 172 + r() * 28 : 128 + r() * 72;
              }
              gy += Math.max(-2.5, Math.min(2.5, target - gy));
            } else if (s === 3) {
              if (--bw <= 0) { bw = 5 + ((r() * 6) | 0); bh = r() < 0.25 ? 200 : 118 + r() * 70; }
              gy = i < 6 ? gy + (200 - gy) * 0.4 : bh;
            } else if (s === 4) {
              if (--hold <= 0) { hold = 10 + ((r() * 14) | 0); cyT = 75 + r() * 85; }
              cy += Math.max(-1.6, Math.min(1.6, cyT - cy));
              const ramp = Math.min(1, i / 40);
              const g0 = cy + gap / 2, c0 = cy - gap / 2;
              gy = 196 + (g0 - 196) * ramp;
              c = TOP + (c0 - TOP) * ramp;
              if (i > n - 30) { const k = (n - i) / 30; gy = 190 + (gy - 190) * k; c = TOP + (c - TOP) * k; }
            } else {
              gy = (i > n - 70 && i < n - 40) ? 182 : 190;
              if (i < 70) gy = 190;
            }
            cols.push({ g: Math.round(Math.min(BOT - 2, gy)), c: Math.round(c) });
          }
          // ground targets
          const span = n;
          let i = i0 + 30 + ((r() * 10) | 0);
          while (i < i0 + span - 12) {
            const roll = r();
            let type;
            if (s === 5) { if (i < i0 + 72) { i += 4; continue; } type = roll < 0.5 ? 'fuel' : 'rocket'; if (i > i0 + n - 76) break; }
            else if (s === 4) type = 'fuel';
            else if (s === 1 || s === 2) type = roll < 0.55 ? 'fuel' : roll < 0.85 ? 'rocket' : 'myst';
            else type = roll < 0.55 ? 'rocket' : roll < 0.85 ? 'fuel' : 'myst';
            if (s === 3) { // stand on a rooftop
              const y = cols[i].g;
              let k = i; while (k < i + 3 && cols[k].g === y) k++;
              if (k < i + 3) { i++; continue; }
            }
            const y = flatten(i, 4);
            objs.push({ type, wx: i * COLW + 8, y, state: 'ground', vy: 0, dead: false, stage: s });
            i += (s === 4 ? 18 : s === 0 || s === 3 ? 9 : 14) + ((r() * (s === 4 ? 14 : 12)) | 0);
          }
          if (s === 5) { const bi = i0 + n - 55; objs.push({ type: 'base', wx: bi * COLW, y: cols[bi].g, state: 'ground', dead: false, stage: 5 }); }
        }
        const end = cols.length * COLW;
        for (let i = 0; i < 80; i++) cols.push({ g: 190, c: TOP });
        return { cols, objs, starts, end };
      }

      function newGame() {
        g = { score: 0, lives: 3, nextLife: 10000, loop: 0, phase: 'play', phaseT: 0, banner: null, stage: 0, baseDone: false };
        g.course = buildCourse(0);
        startStage(0);
      }
      function startStage(s) {
        g.course = buildCourse(g.loop);
        g.stage = s; g.cam = g.course.starts[s];
        g.sx = 30; const col = colAt(g.cam + g.sx + 8);
        g.sy = Math.round((col.g + col.c) / 2) - 4;
        g.fuel = 100; g.lasers = []; g.bombs = []; g.ufos = []; g.fires = []; g.parts = []; g.pops = [];
        g.fireT = 0; g.spawnT = 60; g.wreck = null; g.lowT = 0;
        g.phase = 'ready'; g.phaseT = 100;
      }
      function colAt(wx) { const c = g.course.cols; const i = Math.max(0, Math.min(c.length - 1, Math.floor(wx / COLW))); return c[i]; }
      function solid(wx, y) { const c = colAt(wx); return y >= c.g || y <= c.c; }
      function stageOf(wx) { const st = g.course.starts; let s = 0; for (let i = 0; i < 6; i++) if (wx >= st[i]) s = i; return s; }
      function addScore(n, x, y) {
        g.score += n;
        while (g.score >= g.nextLife) { g.lives++; g.nextLife = 1e12; snd.life(); }
        if (g.score > hi) hi = g.score;
        if (x != null) g.pops.push({ x, y, txt: String(n), t: 45 });
      }
      function burst(wx, y, col, n, sp) {
        for (let i = 0; i < n; i++) { const a = rnd(Math.PI * 2), v = 0.3 + rnd(sp || 1.6); g.parts.push({ x: wx, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 16 + irnd(18), col }); }
      }
      function hitObj(o, byBomb) {
        if (o.dead) return;
        if (o.type === 'base') {
          o.dead = true; addScore(800, o.wx + 11 - g.cam, o.y - 20);
          for (let k = 0; k < 4; k++) burst(o.wx + 4 + k * 5, o.y - 6, ['#ffffff', '#ff3030', '#40a0ff', '#ffd020'][k], 16, 2.2);
          snd.boom(); snd.base(); g.baseDone = true;
          g.banner = { lines: ['MISSION COMPLETE!', 'BASE DESTROYED'], t: 220 };
          return;
        }
        o.dead = true;
        let pts = 50;
        if (o.type === 'rocket') pts = o.state === 'fly' ? 80 : 50;
        else if (o.type === 'fuel') { pts = 150; g.fuel = Math.min(100, g.fuel + 16); snd.fuel(); }
        else if (o.type === 'myst') pts = [100, 200, 300][irnd(3)];
        addScore(pts, o.wx - g.cam, o.y - 14);
        burst(o.wx, o.y - 5, o.type === 'fuel' ? '#ff40a0' : o.type === 'myst' ? '#30c0ff' : '#ffd020', 14);
        if (o.type !== 'fuel') snd.boom();
      }
      function objBox(o) {
        if (o.type === 'rocket') return [o.wx - 3, o.y - 9, o.wx + 3, o.y];
        if (o.type === 'fuel') return [o.wx - 6, o.y - 10, o.wx + 6, o.y];
        if (o.type === 'myst') return [o.wx - 5, o.y - 9, o.wx + 5, o.y];
        if (o.type === 'base') return [o.wx, o.y - 12, o.wx + 22, o.y];
        return [0, 0, 0, 0];
      }
      const inBox = (b, x, y, m) => x >= b[0] - m && x <= b[2] + m && y >= b[1] - m && y <= b[3] + m;

      function updPlay() {
        const c = g.course;
        g.cam += 1;
        const shipWX = g.cam + g.sx;
        const s = stageOf(shipWX + 8);
        if (s !== g.stage) { g.stage = s; snd.stage(); g.banner = { lines: [s === 5 ? 'BASE' : STAGE_NAMES[s] + ' ZONE'], t: 90 }; }
        // the base zone repeats until the base is destroyed
        if (g.cam >= c.end) {
          if (g.baseDone) { g.loop++; g.baseDone = false; startStage(0); g.banner = { lines: ['ROUND ' + (g.loop + 1)], t: 120 }; return; }
          const fresh = buildCourse(g.loop);
          g.course.objs = g.course.objs.filter(o => o.stage !== 5).concat(fresh.objs.filter(o => o.stage === 5));
          g.cam = c.starts[5]; g.lasers = []; g.bombs = []; g.parts = [];
          g.banner = { lines: ['BASE'], t: 90 };
        }
        // ship
        const fuelOut = g.fuel <= 0;
        if (!fuelOut) {
          if (api.key('ArrowUp')) g.sy -= 1.4;
          if (api.key('ArrowDown')) g.sy += 1.4;
          if (api.key('ArrowLeft')) g.sx -= 1.2;
          if (api.key('ArrowRight')) g.sx += 1.0;
        } else { g.sy += 1.0; }
        g.sx = Math.max(8, Math.min(150, g.sx)); g.sy = Math.max(TOP + 2, Math.min(BOT - 8, g.sy));
        g.fuel = Math.max(0, g.fuel - (0.036 + g.loop * 0.006));
        if (g.fuel < 20 && g.fuel > 0 && --g.lowT <= 0) { g.lowT = 30; snd.low(); }
        // weapons
        if (g.fireT > 0) g.fireT--;
        if (!fuelOut && api.key('Space') && g.fireT <= 0 && g.lasers.length < 4) { g.lasers.push({ x: g.cam + g.sx + 16, y: g.sy + 4 }); g.fireT = 7; snd.laser(); }
        if (!fuelOut && api.anyPressed('KeyX', 'KeyZ') && g.bombs.length < 2) { g.bombs.push({ x: g.cam + g.sx + 6, y: g.sy + 8, vx: 1.7, vy: 0.4 }); snd.bomb(); }
        const sw = g.cam + g.sx;
        // terrain collision
        const pts = [[sw + 15, g.sy + 4], [sw + 8, g.sy + 7], [sw + 3, g.sy], [sw + 1, g.sy + 4], [sw + 10, g.sy + 2]];
        for (const [x, y] of pts) if (solid(x, y)) { crash(); return; }
        // lasers
        for (const l of g.lasers) {
          for (let k = 0; k < 3 && !l.dead; k++) {
            l.x += 2.4;
            if (l.x > g.cam + W + 4 || solid(l.x, l.y)) { l.dead = true; break; }
            for (const o of c.objs) if (!o.dead && o.wx > g.cam - 20 && o.wx < g.cam + W + 20 && inBox(objBox(o), l.x, l.y, 1)) { hitObj(o, false); l.dead = true; break; }
            if (l.dead) break;
            for (const u of g.ufos) if (!u.dead && Math.abs(u.x - l.x) < 7 && Math.abs(u.y - l.y) < 4) { u.dead = true; l.dead = true; addScore(100, u.x - g.cam, u.y - 8); burst(u.x, u.y, '#30ff60', 14); snd.boom(); break; }
            if (l.dead) break;
            for (const f of g.fires) if (Math.abs(f.x - l.x) < 6 && Math.abs(f.y - l.y) < 3) { l.dead = true; break; }
          }
        }
        g.lasers = g.lasers.filter(l => !l.dead);
        // bombs
        for (const b of g.bombs) {
          b.vy = Math.min(3, b.vy + 0.07); b.vx = Math.max(1, b.vx - 0.006);
          b.x += b.vx; b.y += b.vy;
          for (const o of c.objs) if (!o.dead && o.wx > g.cam - 20 && o.wx < g.cam + W + 20 && inBox(objBox(o), b.x, b.y, 2)) { hitObj(o, true); b.dead = true; break; }
          if (!b.dead) for (const u of g.ufos) if (!u.dead && Math.abs(u.x - b.x) < 7 && Math.abs(u.y - b.y) < 5) { u.dead = true; b.dead = true; addScore(100, u.x - g.cam, u.y - 8); burst(u.x, u.y, '#30ff60', 14); snd.boom(); break; }
          if (!b.dead && (solid(b.x, b.y) || b.y > BOT)) {
            b.dead = true; burst(b.x, b.y - 2, '#ffa040', 10, 1.2); au.noise(0.15, { vol: 0.1, freq: 900 });
            for (const o of c.objs) if (!o.dead && Math.abs(o.wx - b.x) < 9 && Math.abs(o.y - b.y) < 12) hitObj(o, true);
          }
        }
        g.bombs = g.bombs.filter(b => !b.dead);
        // ground targets: rockets launch as you approach
        const launchStages = g.loop > 0 ? [1, 1, 1, 1, 0, 1] : [1, 0, 0, 1, 0, 1];
        for (const o of c.objs) {
          if (o.dead || o.type !== 'rocket') continue;
          if (o.wx < g.cam - 30 || o.wx > g.cam + W + 30) continue;
          if (o.state === 'ground') {
            const dx = o.wx - sw;
            if (launchStages[o.stage] && dx > 10 && dx < 120 && Math.random() < 0.012 * (1 + g.loop * 0.5)) { o.state = 'fly'; o.vy = -0.3; snd.launch(); }
          } else {
            o.vy = Math.max(-2.2 - g.loop * 0.3, o.vy - 0.05); o.y += o.vy;
            if (Math.random() < 0.5) g.parts.push({ x: o.wx + rnd(2) - 1, y: o.y + 1, vx: 0, vy: 0.5, t: 8, col: '#ffa020' });
            if (o.y < TOP - 10 || solid(o.wx, o.y - 9)) o.dead = true;
          }
          if (!o.dead && inBox(objBox(o), sw + 8, g.sy + 4, 6)) { hitObj(o, false); crash(); return; }
        }
        for (const o of c.objs) if (!o.dead && (o.type === 'fuel' || o.type === 'myst' || o.type === 'base') && o.wx > g.cam && o.wx < g.cam + 160 && inBox(objBox(o), sw + 8, g.sy + 4, 5)) { crash(); return; }
        // UFO zone and fireball zone
        if (--g.spawnT <= 0) {
          if (g.stage === 1 && g.ufos.length < 6) {
            g.ufos.push({ x: g.cam + W + 10, y: 50 + rnd(90), t: irnd(100), amp: 14 + rnd(20), dead: false });
            g.spawnT = Math.max(24, 46 - g.loop * 8);
          } else if (g.stage === 2) {
            const x = g.cam + W + 10, cc = colAt(x);
            const y = Math.max(TOP + 10, Math.min(cc.g - 10, 34 + rnd(cc.g - 50)));
            g.fires.push({ x, y, ph: rnd(6) });
            g.spawnT = Math.max(18, 40 - g.loop * 8) + irnd(25);
          } else g.spawnT = 30;
        }
        for (const u of g.ufos) {
          u.t++; u.x -= 0.6; u.base = u.base == null ? u.y : u.base;
          u.y = u.base + Math.sin(u.t * 0.06) * u.amp;
          if (u.x < g.cam - 20) u.dead = true;
          if (!u.dead && Math.abs(u.x - (sw + 8)) < 12 && Math.abs(u.y - (g.sy + 4)) < 6) { u.dead = true; crash(); return; }
        }
        g.ufos = g.ufos.filter(u => !u.dead);
        for (const f of g.fires) {
          f.x -= 1.6 + g.loop * 0.3; f.ph += 0.1; f.y += Math.sin(f.ph) * 0.3;
          if (f.x < g.cam - 20) f.dead = true;
          if (!f.dead && Math.abs(f.x - (sw + 8)) < 11 && Math.abs(f.y - (g.sy + 4)) < 5) { crash(); return; }
        }
        g.fires = g.fires.filter(f => !f.dead);
      }
      function crash() {
        g.phase = 'dead'; g.phaseT = 120; snd.die();
        const sw = g.cam + g.sx;
        burst(sw + 8, g.sy + 4, '#ffffff', 16, 2); burst(sw + 8, g.sy + 4, '#ffa020', 24, 1.6); burst(sw + 8, g.sy + 4, '#ff3030', 12, 1.2);
        g.wreck = { x: sw, y: g.sy };
      }
      function gameOver() { api.setHiScore(g.score); g.phase = 'over'; g.phaseT = 360; }
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
          if (!demo) demo = { course: buildCourse(0), cam: 0 };
          demo.cam = (demo.cam + 1) % (demo.course.end - W);
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); snd.stage(); }
          return;
        }
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.2; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.banner && --g.banner.t <= 0) g.banner = null;
        switch (g.phase) {
          case 'ready': if (--g.phaseT <= 0) g.phase = 'play'; break;
          case 'play': updPlay(); break;
          case 'dead':
            if (--g.phaseT <= 0) {
              g.lives--;
              const st = g.stage;
              if (g.lives > 0) startStage(st);
              else lastLife(() => { g.lives = 3; startStage(st); });
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawStars(ctx, cam) {
        for (const s of stars) {
          if (((frame + s.p) & 63) > 40) continue;
          const x = ((s.x - cam * 0.25) % W + W) % W;
          ctx.fillStyle = s.c; ctx.fillRect(x | 0, s.y | 0, 1, 1);
        }
      }
      function drawTerrain(ctx, course, cam) {
        const cols = course.cols, st = course.starts;
        const i0 = Math.floor(cam / COLW), off = cam - i0 * COLW;
        for (let k = 0; k <= W / COLW + 1; k++) {
          const i = i0 + k; if (i < 0 || i >= cols.length) continue;
          const c = cols[i], x = Math.round(k * COLW - off);
          let s = 0; for (let j = 0; j < 6; j++) if (i * COLW >= st[j]) s = j;
          const pal = STAGE_COL[s];
          ctx.fillStyle = pal[0];
          ctx.fillRect(x, c.g, COLW, BOT - c.g);
          if (c.c > TOP) ctx.fillRect(x, TOP, COLW, c.c - TOP);
          ctx.fillStyle = pal[1];
          const pg = cols[Math.max(0, i - 1)].g;
          ctx.fillRect(x, Math.min(c.g, pg), COLW, Math.abs(c.g - pg) + 1);
          if (c.c > TOP) { const pc = cols[Math.max(0, i - 1)].c; ctx.fillRect(x, Math.min(c.c, pc), COLW, Math.abs(c.c - pc) + 1); }
          if (s === 3 && c.g < 200 && ((i + (c.g >> 2)) & 1)) { ctx.fillStyle = '#ffff80'; for (let y = c.g + 4; y < BOT - 4; y += 6) ctx.fillRect(x + 1, y, 2, 2); }
        }
      }
      function drawObjs(ctx, course, cam) {
        for (const o of course.objs) {
          if (o.dead) continue;
          const x = o.wx - cam; if (x < -30 || x > W + 30) continue;
          if (o.type === 'rocket') {
            drawSpr(ctx, ROCKET, x, o.y - 4.5, {});
            if (o.state === 'fly' && (frame & 2)) { ctx.fillStyle = '#ffa020'; ctx.fillRect(Math.round(x) - 1, Math.round(o.y) + 1, 3, 3); }
          } else if (o.type === 'fuel') drawSpr(ctx, FUELT, x, o.y - 5, {});
          else if (o.type === 'myst') drawSpr(ctx, MYST, x, o.y - 4.5, {});
          else if (o.type === 'base') drawSpr(ctx, BASE, x + 11, o.y - 6, { pal: { R: (frame & 16) ? '#ff3030' : '#ffff40' } });
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP); ctx.fillRect(0, BOT, W, H - BOT);
        text(ctx, '1UP', 8, 1, '#ff4040', 1); text(ctx, String(g.score).padStart(6, '0'), 30, 1, '#ffffff', 1);
        text(ctx, 'HI', 150, 1, '#ff4040', 1); text(ctx, String(hi).padStart(6, '0'), 166, 1, '#ffffff', 1);
        for (let i = 0; i < 6; i++) {
          const x = 20 + i * 37;
          ctx.fillStyle = i < g.stage ? '#a03070' : i === g.stage ? ((frame & 16) ? '#ff40a0' : '#a03070') : '#303060';
          ctx.fillRect(x, 10, 34, 10);
          text(ctx, STAGE_NAMES[i], x + 17, 12, '#ffffff', 1, 'center');
        }
        text(ctx, 'FUEL', 8, 212, '#ffd020', 1);
        ctx.fillStyle = '#303030'; ctx.fillRect(36, 213, 102, 6);
        ctx.fillStyle = g.fuel > 50 ? '#30ff60' : g.fuel > 20 ? '#ffd020' : ((frame & 8) ? '#ff3030' : '#801010');
        ctx.fillRect(37, 214, Math.round(g.fuel), 4);
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) drawSpr(ctx, SHIP, 152 + i * 18, 216, {});
        for (let i = 0; i < Math.min(6, g.loop); i++) { ctx.fillStyle = '#ff3030'; ctx.fillRect(244 - i * 6, 212, 4, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(244 - i * 6, 212, 1, 8); }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const cam = g.cam;
        drawStars(ctx, cam);
        drawTerrain(ctx, g.course, cam);
        drawObjs(ctx, g.course, cam);
        for (const u of g.ufos) drawSpr(ctx, UFO, u.x - cam, u.y, {});
        for (const f of g.fires) drawSpr(ctx, FIREBALL[(frame >> 2) & 1], f.x - cam, f.y, {});
        ctx.fillStyle = '#ffff60';
        for (const l of g.lasers) ctx.fillRect(Math.round(l.x - cam) - 6, Math.round(l.y), 7, 1);
        for (const b of g.bombs) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(b.x - cam) - 1, Math.round(b.y) - 1, 3, 3); ctx.fillStyle = '#ff4040'; ctx.fillRect(Math.round(b.x - cam) - 2, Math.round(b.y) - 2, 1, 1); }
        if (g.phase === 'play' || g.phase === 'ready') {
          if (g.phase === 'play' || (frame & 8)) {
            drawSpr(ctx, SHIP, g.sx + 8, g.sy + 4, {});
            ctx.fillStyle = (frame & 2) ? '#ff4020' : '#ffd020'; ctx.fillRect(Math.round(g.sx) - 2 - (frame & 1), Math.round(g.sy) + 3, 3, 2);
          }
        }
        for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), 1, 1); }
        for (const q of g.pops) text(ctx, q.txt, q.x, q.y, '#ffffff', 1, 'center');
        drawHUD(ctx);
        if (g.banner) g.banner.lines.forEach((s, i) => text(ctx, s, W / 2, 70 + i * 12, i === 0 ? '#ffd020' : '#ffffff', 1, 'center'));
        if (g.phase === 'ready') text(ctx, 'PLAYER ONE', W / 2, 96, (frame & 16) ? '#ffffff' : '#30c0ff', 1, 'center');
        if (g.fuel <= 0 && g.phase === 'play') text(ctx, 'OUT OF FUEL', W / 2, 110, '#ff3030', 1, 'center');
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 54, 98, 108, 24);
          text(ctx, 'GAME OVER', W / 2, 104, '#ff4040', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        if (!demo) demo = { course: buildCourse(0), cam: 0 };
        drawStars(ctx, demo.cam);
        drawTerrain(ctx, demo.course, demo.cam);
        drawObjs(ctx, demo.course, demo.cam);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(16, 26, W - 32, 150);
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2, 4, '#ff4040', 1, 'center');
        const t = 'SCRAMBLE';
        for (let i = 0; i < t.length; i++) text(ctx, t[i], 32 + i * 25, 34, ['#ff40a0', '#ffd020', '#30c0ff', '#30ff60'][(i + (frame >> 3)) & 3], 4);
        const page = (titleT >> 8) & 1;
        if (page === 0) {
          text(ctx, 'HOW FAR CAN YOU INVADE', W / 2, 74, '#ffffff', 1, 'center');
          text(ctx, 'OUR SCRAMBLE SYSTEM ?', W / 2, 84, '#ffffff', 1, 'center');
          text(ctx, 'LASER AHEAD  BOMBS BELOW', W / 2, 104, '#30c0ff', 1, 'center');
          text(ctx, 'HIT FUEL TANKS FOR FUEL', W / 2, 116, '#ff40a0', 1, 'center');
        } else {
          text(ctx, '-SCORE TABLE-', W / 2, 72, '#ffd020', 1, 'center');
          drawSpr(ctx, ROCKET, 60, 92, {}); text(ctx, '50  80 FLYING', 76, 89, '#ffffff', 1);
          drawSpr(ctx, UFO, 60, 106, {}); text(ctx, '100', 76, 103, '#ffffff', 1);
          drawSpr(ctx, FUELT, 60, 120, {}); text(ctx, '150', 76, 117, '#ffffff', 1);
          drawSpr(ctx, MYST, 60, 134, {}); text(ctx, 'MYSTERY', 76, 131, '#ffffff', 1);
          drawSpr(ctx, BASE, 160, 128, { pal: { R: (frame & 16) ? '#ff3030' : '#ffff40' } }); text(ctx, '800', 176, 140, '#ffffff', 1);
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 158, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 158, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 158, blink ? '#ffffff' : '#888888', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, BOT, W, H - BOT);
        text(ctx, credStr(), 8, 213, '#888888', 1);
        text(ctx, '\u00a9 1981 KONAMI', 248, 213, '#888888', 1, 'right');
      }
      return { update, render, destroy() { } };
    }
  });
})();
