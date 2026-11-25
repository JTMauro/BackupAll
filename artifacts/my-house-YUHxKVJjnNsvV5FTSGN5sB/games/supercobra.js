// Super Cobra (Konami, 1981) \u2014 written from scratch for the MAME32 Game Room. Fly the attack chopper through eleven sections and carry off the booty.
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

  const W = 256, H = 224, TOP = 24, BOT = 206, COLW = 4, PXMAX = 150;
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216; }
  const SECT = [
    { terr: 'hills', obj: [['rocket', 0.55], ['fuel', 0.3], ['myst', 0.15]], col: ['#c08020', '#ffd060'] },
    { terr: 'hills', obj: [['tank', 0.45], ['fuel', 0.35], ['rocket', 0.2]], col: ['#a03030', '#ff7060'] },
    { terr: 'hills', obj: [['fuel', 0.55], ['myst', 0.2], ['rocket', 0.25]], air: 'ufo', col: ['#2080c0', '#60c0ff'] },
    { terr: 'cave', obj: [['rocket', 0.5], ['fuel', 0.5]], col: ['#8030a0', '#e070ff'] },
    { terr: 'mountains', obj: [['fuel', 0.6], ['tank', 0.4]], air: 'meteor', col: ['#a06020', '#ffb050'] },
    { terr: 'mountains', obj: [['rocket', 0.7], ['fuel', 0.3]], volley: true, col: ['#208040', '#60ff80'] },
    { terr: 'city', obj: [['tank', 0.45], ['fuel', 0.4], ['myst', 0.15]], col: ['#4050c0', '#90a0ff'] },
    { terr: 'maze', obj: [['fuel', 0.6], ['rocket', 0.4]], col: ['#c04080', '#ff80c0'] },
    { terr: 'hills', obj: [['fuel', 0.6], ['myst', 0.4]], air: 'jet', col: ['#20a0a0', '#60ffff'] },
    { terr: 'cave', obj: [['rocket', 0.35], ['tank', 0.3], ['fuel', 0.35]], air: 'ufo', col: ['#a0a020', '#ffff60'] },
    { terr: 'flat', obj: [['fuel', 1]], booty: true, col: ['#c0c0c0', '#ffffff'] }];
  const SLEN = 1200, BLEN = 760;

  const PAL = { G: '#40e060', D: '#208030', W: '#ffffff', Y: '#ffe040', R: '#ff3030', B: '#3070ff', C: '#40e0ff', O: '#ff9020', M: '#ff40a0', L: '#c0c0c0', K: '#404040', P: '#c060ff' };
  const COPTER = [
    makeSpr(['WWWWWWWWWWWWWW..', '.......L........', 'G.....GGGGG.....', 'GG..GGGGGCCC....', '.GGGGGGGGGCCCC..', 'GG...GGGGGGGGGG.', 'G.....GGGGGGG...', '.....L.....L....', '...LLLLLLLLLLL..'], PAL),
    makeSpr(['...WWWWWWWWWWWWW', '.......L........', 'W.....GGGGG.....', 'GG..GGGGGCCC....', '.GGGGGGGGGCCCC..', 'GG...GGGGGGGGGG.', 'W.....GGGGGGG...', '.....L.....L....', '...LLLLLLLLLLL..'], PAL)];
  const ROCKET = makeSpr(['..W..', '.WRW.', '.RRR.', '.RRR.', '.RRR.', '.RRR.', 'RRRRR', 'R.Y.R', '..Y..'], PAL);
  const FUEL = makeSpr(['.MMMMMMMMMM.', 'MMMMMMMMMMMM', 'MWWWMWMWMWMM', 'MWMMMWMWMWMM', 'MWWMMWMWMWMM', 'MWMMMWMWMWMM', 'MWMMMWWWMWWW', 'MMMMMMMMMMMM', '.MMMMMMMMMM.'], PAL);
  const MYST = makeSpr(['.CCCCCCCC.', 'CCWWWWWWCC', 'CWWCCCCWWC', 'CCCCCCWWCC', 'CCCCWWWCCC', 'CCCCWWCCCC', 'CCCCCCCCCC', 'CCCCWWCCCC', '.CCCCCCCC.'], PAL);
  const TANK = makeSpr(['......LL....', '....LLLLL...', '...LLLLLLLL.', '.YYYYYYYYYY.', 'YKYKYKYKYKYY', '.YYYYYYYYYY.'], PAL);
  const UFO = [makeSpr(['....PPPP....', '..PPWWWWPP..', 'PPPPPPPPPPPP', '.P.P.PP.P.P.', '..P......P..'], PAL), makeSpr(['....PPPP....', '..PPWWWWPP..', 'PPPPPPPPPPPP', '..P.P..P.P..', '.P........P.'], PAL)];
  const JET = makeSpr(['.........OO.', '....OOOOOOO.', 'WWOOOOOOOOOO', '....OOOOOOO.', '.........OO.'], PAL);
  const METEOR = [makeSpr(['....RRYY..', '..RRYYWWY.', 'RRRYYWWWWY', '..RRYYWWY.', '....RRYY..'], PAL), makeSpr(['...R.RYY..', '.RR.YYWWY.', 'R.RYYWWWWY', '.RR.YYWWY.', '...R.RYY..'], PAL)];
  const BOOTY = makeSpr(['..YYYYYYYY..', '.YRYYYYYYRY.', 'YYYYWWWWYYYY', 'YYYWYYYYWYYY', 'YYYYYYYYYYYY', 'YYRYYYYYYRYY', '.YYYYYYYYYY.'], PAL);

  ArcadeRegistry.register({
    id: 'supercobra', title: 'Super Cobra', year: 1981, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: cannon \u00b7 X: bomb \u00b7 Enter: start',
    marquee: { bg: '#000818', fg: '#40e060', accent: '#ff9020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', T = 0, coinFlash = 0, g = null, page = 0;
      const stars = [];
      for (let i = 0; i < 46; i++) stars.push({ x: rnd(W), y: TOP + rnd(BOT - TOP), c: ['#ffffff', '#ff6060', '#60ff60', '#6060ff', '#ffff60'][i % 5], p: irnd(64) });
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        shot() { au.tone(1600, 0.05, { type: 'square', vol: 0.04, slideTo: 900 }); },
        bomb() { au.tone(1500, 0.7, { type: 'sine', vol: 0.05, slideTo: 300 }); },
        boom() { au.noise(0.25, { vol: 0.14, freq: 2200, slideTo: 150 }); },
        big() { au.noise(0.5, { vol: 0.18, freq: 1500, slideTo: 80 }); },
        fuel() { au.melody([[880, 0.05], [1175, 0.05], [1568, 0.08]], { type: 'square', vol: 0.07 }); },
        launch() { au.noise(0.45, { vol: 0.06, freq: 500, slideTo: 2800, type: 'bandpass' }); },
        tankShot() { au.tone(300, 0.1, { type: 'square', vol: 0.06, slideTo: 150 }); },
        chop() { au.noise(0.035, { vol: 0.035, freq: 300 }); },
        low() { au.tone(880, 0.08, { type: 'square', vol: 0.06 }); au.tone(660, 0.08, { type: 'square', vol: 0.06, delay: 0.1 }); },
        die() { au.noise(1.0, { vol: 0.2, freq: 3000, slideTo: 60 }); au.tone(600, 0.9, { type: 'sawtooth', vol: 0.09, slideTo: 40 }); },
        section() { au.melody([[659, 0.07], [784, 0.07], [988, 0.12]], { type: 'square', vol: 0.08 }); },
        booty() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [784, 0.1], [1047, 0.1], [1319, 0.1], [1568, 0.4]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[392, 0.1], [392, 0.1], [523, 0.1], [659, 0.1], [523, 0.1], [784, 0.3]], { type: 'square', vol: 0.1 }); },
        life() { au.melody([[1047, 0.07], [1319, 0.07], [1568, 0.07], [2093, 0.15]], { type: 'square', vol: 0.09 }); },
        over() { au.melody([[392, 0.22], [330, 0.22], [262, 0.22], [196, 0.6]], { type: 'square', vol: 0.11 }); }
      };

      // ---------- course ----------
      function buildCourse(loop) {
        const cols = [], objs = [], starts = [];
        for (let s = 0; s < SECT.length; s++) {
          const S = SECT[s], r = rng(s * 4099 + loop * 131 + 7);
          const n = (S.booty ? BLEN : SLEN) / COLW, i0 = cols.length;
          starts.push(i0 * COLW);
          let gy = 190, target = 190, hold = 0, cy = 115, cyT = 115, bw = 0, bh = 190;
          const gap = Math.max(58, 78 - loop * 5);
          for (let i = 0; i < n; i++) {
            let c = TOP, fl = 190;
            const ramp = Math.min(1, i / 30, (n - 1 - i) / 30);
            if (S.terr === 'hills' || S.terr === 'mountains') {
              if (--hold <= 0) { hold = 6 + ((r() * 14) | 0); target = S.terr === 'hills' ? 130 + r() * 66 : 80 + r() * 116; }
              gy += Math.max(-3, Math.min(3, target - gy));
              fl = 190 + (gy - 190) * ramp;
            } else if (S.terr === 'cave') {
              if (--hold <= 0) { hold = 10 + ((r() * 14) | 0); cyT = 70 + r() * 90; }
              cy += Math.max(-1.5, Math.min(1.5, cyT - cy));
              fl = 190 + (cy + gap / 2 - 190) * ramp; c = TOP + (cy - gap / 2 - TOP) * ramp;
            } else if (S.terr === 'city') {
              if (--bw <= 0) { bw = 5 + ((r() * 6) | 0); bh = r() < 0.3 ? 196 : 104 + r() * 80; }
              fl = i < 20 || i > n - 20 ? 190 : bh;
            } else if (S.terr === 'maze') {
              const k = (i - 24) % 34;
              if (i > 20 && i < n - 24 && k >= 0 && k < 6) {
                const odd = ((i - 24) / 34 | 0) % 2;
                if (odd) c = TOP + 70 + (r() < 0.5 ? 0 : 14); else fl = 112 + (r() < 0.5 ? 0 : 14);
              }
            }
            cols.push({ g: Math.round(Math.min(BOT - 4, fl)), c: Math.round(c), s });
          }
          // ground targets on little flats
          let i = i0 + 24 + ((r() * 10) | 0);
          const end = i0 + n - (S.booty ? 70 : 16);
          while (i < end) {
            let roll = r(), type = S.obj[S.obj.length - 1][0];
            for (const [t, p] of S.obj) { if (roll < p) { type = t; break; } roll -= p; }
            if (S.terr === 'maze') { const k = (i - i0 - 24) % 34; if (k >= -2 && k < 9) { i += 2; continue; } }
            if (S.terr === 'city') { const y0 = cols[i].g; let k = i; while (k < i + 3 && cols[k].g === y0) k++; if (k < i + 3) { i++; continue; } }
            const y = cols[i].g;
            for (let k = i; k < Math.min(i + 4, cols.length); k++) cols[k].g = y;
            const o = { type, wx: i * COLW + 8, y, state: 'ground', vy: 0, dead: false, s, fireT: 60 + ((r() * 90) | 0), pts: 0 };
            if (type === 'myst') o.pts = [100, 200, 300][(r() * 3) | 0];
            if (type === 'rocket') o.launch = r() < Math.min(0.9, 0.55 + loop * 0.15 + (S.volley ? 0.3 : 0));
            objs.push(o);
            i += (S.booty ? 26 : S.volley ? 7 : 11) + ((r() * 12) | 0);
          }
          if (S.booty) { const bi = i0 + n - 50; const y = cols[bi].g; for (let k = bi - 2; k < bi + 5; k++) cols[k].g = y; objs.push({ type: 'booty', wx: bi * COLW + 6, y, state: 'ground', dead: false, s }); }
        }
        const end = cols.length * COLW;
        for (let i = 0; i < 90; i++) cols.push({ g: 190, c: TOP, s: SECT.length - 1 });
        return { cols, objs, starts, end };
      }
      const colAt = wx => g.course.cols[Math.max(0, Math.min(g.course.cols.length - 1, Math.floor(wx / COLW)))];

      function newGame(demo) {
        g = { demo, score: 0, lives: 3, nextLife: 10000, loop: 0, phase: 'play', phaseT: 0, sect: 0, pops: [], fx: [], bootyGot: false };
        startSection(0);
      }
      function startSection(s) {
        g.course = buildCourse(g.loop);
        g.sect = s; g.cam = g.course.starts[s];
        g.course.objs = g.course.objs.filter(o => o.s >= s);
        g.px = 40; g.py = Math.min(colAt(g.cam + 40).g - 40, 110);
        g.fuel = 100; g.shots = []; g.bombs = []; g.foes = []; g.ebul = []; g.fx = []; g.pops = [];
        g.airT = 60; g.phase = 'ready'; g.phaseT = 0; g.speed = Math.min(1.5, 1 + g.loop * 0.15); g.lowT = 0;
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife = Infinity; snd.life(); }
        if (g.score > hi) hi = g.score;
      }
      function boom(x, y, big) { g.fx.push({ t: 'boom', x, y, life: big ? 30 : 18, big }); if (!g.demo || big) (big ? snd.big : snd.boom)(); }

      function killObj(o, how) {
        o.dead = true;
        let pts = 0;
        if (o.type === 'rocket') pts = o.state === 'fly' ? 80 : 50;
        else if (o.type === 'fuel') { pts = 150; g.fuel = Math.min(100, g.fuel + 20); if (!g.demo) snd.fuel(); }
        else if (o.type === 'myst') pts = o.pts;
        else if (o.type === 'tank') pts = 100;
        addScore(pts);
        if (o.type === 'myst' || o.type === 'tank') g.pops.push({ x: o.wx, y: o.y - 14, s: String(pts), t: 50 });
        boom(o.wx, o.y - 4, false);
      }
      function die() {
        if (g.phase !== 'play') return;
        g.phase = 'dying'; g.phaseT = 0; boom(g.cam + g.px, g.py, true); if (!g.demo) snd.die();
      }
      function hitTerrain(wx, y, r) {
        for (let x = wx - r; x <= wx + r; x += 3) { const c = colAt(x); if (y + 2 >= c.g || y - 2 <= c.c) return true; }
        return false;
      }

      function playerControl() {
        let dx = 0, dy = 0, fire = false, bomb = false;
        if (g.demo) {
          // fly the mid-line of the open air ahead; shoot and bomb freely
          let fl = 999, ce = 0;
          for (let x = g.cam + g.px - 4; x < g.cam + g.px + 44; x += 4) { const c = colAt(x); fl = Math.min(fl, c.g); ce = Math.max(ce, c.c); }
          let ty = Math.max(ce + 16, Math.min(fl - 22, (ce + fl) / 2 + 10));
          const bo = g.course.objs.find(o => o.type === 'booty' && !o.dead);
          if (bo && bo.wx - (g.cam + g.px) < 160 && bo.wx > g.cam + g.px - 8) ty = bo.y - 6;
          dy = ty > g.py + 2 ? 1 : ty < g.py - 2 ? -1 : 0;
          dx = g.px < 56 ? 1 : g.px > 64 ? -1 : 0;
          fire = T % 8 === 0; bomb = T % 30 === 0;
        } else {
          if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
          if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
          fire = api.pressed('Space'); bomb = api.anyPressed('KeyX', 'KeyZ');
        }
        if (g.fuel <= 0) { dx = 0; dy = 0; g.fallV = (g.fallV || 0) + 0.04; g.py += g.fallV; }
        else { g.fallV = 0; g.px = Math.max(10, Math.min(PXMAX, g.px + dx * 1.4)); g.py = Math.max(TOP + 6, Math.min(BOT - 4, g.py + dy * 1.4)); }
        if (fire && g.shots.length < 3) { g.shots.push({ x: g.cam + g.px + 8, y: g.py + 2 }); if (!g.demo) snd.shot(); }
        if (bomb && g.bombs.length < 2) { g.bombs.push({ x: g.cam + g.px, y: g.py + 5, vx: g.speed + 0.7, vy: 0.3 }); if (!g.demo) snd.bomb(); }
      }

      function spawnAir() {
        const S = SECT[g.sect];
        if (!S.air || g.cam + W > g.course.starts[g.sect] + SLEN - 40) return;
        if (--g.airT > 0) return;
        const wx = g.cam + W + 12;
        if (S.air === 'ufo') {
          const base = TOP + 30 + rnd(BOT - TOP - 90);
          for (let k = 0; k < 3; k++) g.foes.push({ t: 'ufo', x: wx + k * 20, base, y: base, ph: k * 0.7, vx: -(0.9 + g.loop * 0.15), hp: 1 });
          g.airT = 110 - g.loop * 10;
        } else if (S.air === 'meteor') {
          g.foes.push({ t: 'meteor', x: g.cam + 90 + rnd(W - 60), y: TOP - 6, vx: -1.3, vy: 1.6 + rnd(0.6), hp: 99 });
          g.airT = 40 - Math.min(20, g.loop * 6) + irnd(20);
        } else if (S.air === 'jet') {
          const y = TOP + 20 + rnd(BOT - TOP - 80);
          g.foes.push({ t: 'jet', x: wx, y, vx: -(1.6 + g.loop * 0.2), hp: 1, shot: false });
          g.airT = 70 - g.loop * 8 + irnd(30);
        }
      }

      function updateGame() {
        g.phaseT++;
        for (const q of g.pops) q.t--; g.pops = g.pops.filter(q => q.t > 0);
        for (const f of g.fx) f.life--; g.fx = g.fx.filter(f => f.life > 0);
        if (g.phase === 'over') { if (g.phaseT > 240 || (g.phaseT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; page = 0; T = 0; } return; }
        if (g.phase === 'wait') return;
        if (g.phase === 'ready') { if (g.phaseT > (g.demo ? 20 : 90)) g.phase = 'play'; return; }
        if (g.phase === 'dying') {
          if (g.phaseT > 110) {
            if (g.demo) { mode = 'title'; page = 0; T = 0; return; }
            g.lives--;
            if (g.lives <= 0) {
              g.phase = 'wait'; g.phaseT = 0;
              const gameOver = () => { g.phase = 'over'; g.phaseT = 0; api.setHiScore(g.score); snd.over(); };
              if (api.offerContinue) api.offerContinue(() => { g.lives = 3; startSection(g.sect); }, gameOver);
              else gameOver();
            } else startSection(g.sect);
          }
          return;
        }
        if (g.phase === 'booty') {
          // carry the booty away: fly up and out, then the next mission begins
          g.px += 1.5; g.py -= 0.6;
          if (g.phaseT === 1 && !g.demo) snd.booty();
          if (g.phaseT === 60) { const b = 1000 * (g.loop + 1) * 5; addScore(b); g.pops.push({ x: g.cam + 128, y: 100, s: 'BONUS ' + b, t: 120 }); }
          if (g.phaseT > 200) { g.loop++; startSection(0); }
          return;
        }
        // --- play ---
        g.cam += g.speed;
        playerControl();
        if (!g.demo && T % 6 === 0) snd.chop();
        g.fuel -= 0.042 + g.loop * 0.006;
        if (g.fuel < 20 && g.fuel > 0 && !g.demo && ++g.lowT % 50 === 0) snd.low();
        if (g.demo) g.fuel = Math.max(g.fuel, 30);
        const pwx = g.cam + g.px;
        // section progress
        let s = 0; while (s < SECT.length - 1 && g.course.starts[s + 1] <= pwx) s++;
        if (s !== g.sect) { g.sect = s; if (!g.demo) snd.section(); g.airT = 30; }
        // booty missed: replay the last section
        if (pwx > g.course.end + 40) { startSection(SECT.length - 1); g.pops.push({ x: g.cam + 128, y: 110, s: 'GET THE BOOTY!', t: 120 }); return; }
        if (hitTerrain(pwx, g.py, 6)) { die(); return; }
        spawnAir();
        // shots
        for (const b of g.shots) { b.x += 5 + g.speed; if (b.x > g.cam + W + 8 || hitTerrain(b.x, b.y, 0)) b.dead = true; }
        for (const b of g.bombs) {
          b.x += b.vx; b.y += b.vy; b.vy = Math.min(3, b.vy + 0.07); b.vx = Math.max(g.speed, b.vx - 0.01);
          if (hitTerrain(b.x, b.y, 0) || b.y > BOT) {
            b.dead = true; boom(b.x, b.y - 3, false);
            for (const o of g.course.objs) if (!o.dead && o.type !== 'booty' && Math.abs(o.wx - b.x) < 12 && Math.abs(o.y - 4 - b.y) < 14) killObj(o);
          }
        }
        // ground objects
        for (const o of g.course.objs) {
          if (o.dead) continue;
          const sx = o.wx - g.cam;
          if (sx < -30) { o.dead = true; continue; }
          if (sx > W + 20) continue;
          if (o.type === 'rocket') {
            if (o.state === 'ground' && o.launch && sx - g.px < 70 + (SECT[o.s].volley ? 40 : 0) && sx > g.px - 10) { o.state = 'fly'; o.vy = -0.4; if (!g.demo) snd.launch(); }
            if (o.state === 'fly') {
              o.vy = Math.max(-2.6, o.vy - 0.05); o.y += o.vy;
              if (SECT[o.s].volley) o.wx += Math.sign(pwx - o.wx) * 0.3;
              if (o.y < TOP - 10 || colAt(o.wx).c > o.y - 8) { o.dead = true; if (o.y > TOP) boom(o.wx, o.y, false); }
            }
          } else if (o.type === 'tank') {
            if (--o.fireT <= 0 && sx > g.px + 20 && sx < W - 8) {
              o.fireT = Math.max(50, 110 - g.loop * 15) + irnd(40);
              const dx = (pwx - o.wx), dy = (g.py - (o.y - 8)), d = Math.hypot(dx, dy) || 1;
              g.ebul.push({ x: o.wx - 4, y: o.y - 8, vx: dx / d * 1.6 + g.speed * 0.5, vy: dy / d * 1.6 });
              if (!g.demo) snd.tankShot();
            }
          } else if (o.type === 'booty') {
            if (Math.abs(o.wx - pwx) < 12 && Math.abs((o.y - 4) - g.py) < 10) {
              o.dead = true; g.phase = 'booty'; g.phaseT = 0; g.bootyGot = true; return;
            }
            continue;
          }
          // player contact with ground target or rocket
          const oy = o.y - 5;
          if (Math.abs(o.wx - pwx) < 9 && Math.abs(oy - g.py) < 8) { killObj(o); die(); return; }
          for (const b of g.shots) if (!b.dead && Math.abs(b.x - o.wx) < 7 && Math.abs(b.y - oy) < 7) { b.dead = true; killObj(o); break; }
          if (!o.dead) for (const b of g.bombs) if (!b.dead && Math.abs(b.x - o.wx) < 7 && Math.abs(b.y - oy) < 7) { b.dead = true; killObj(o); boom(b.x, b.y, false); break; }
        }
        // air enemies
        for (const f of g.foes) {
          if (f.t === 'ufo') { f.ph += 0.06; f.x += f.vx; f.y = f.base + Math.sin(f.ph) * 26; }
          else if (f.t === 'meteor') { f.x += f.vx; f.y += f.vy; if (hitTerrain(f.x, f.y, 0)) { f.dead = true; g.fx.push({ t: 'boom', x: f.x, y: f.y, life: 12 }); } }
          else if (f.t === 'jet') {
            f.x += f.vx;
            if (!f.shot && f.x - pwx < 110 && f.x > pwx) { f.shot = true; g.ebul.push({ x: f.x - 6, y: f.y, vx: -2.6, vy: 0 }); if (!g.demo) snd.tankShot(); }
          }
          if (f.x < g.cam - 20 || f.y > BOT + 10) { f.dead = true; continue; }
          if (Math.abs(f.x - pwx) < 10 && Math.abs(f.y - g.py) < 7) { die(); return; }
          if (f.t !== 'meteor') for (const b of g.shots) if (!b.dead && Math.abs(b.x - f.x) < 8 && Math.abs(b.y - f.y) < 6) {
            b.dead = true; f.dead = true; const pts = f.t === 'jet' ? 200 : 100; addScore(pts); boom(f.x, f.y, false); break;
          }
          if (f.t === 'meteor') for (const b of g.shots) if (!b.dead && Math.abs(b.x - f.x) < 6 && Math.abs(b.y - f.y) < 5) b.dead = true;
        }
        for (const e of g.ebul) {
          e.x += e.vx; e.y += e.vy;
          if (e.x < g.cam - 8 || e.x > g.cam + W + 8 || e.y < TOP || hitTerrain(e.x, e.y, 0)) e.dead = true;
          else if (Math.abs(e.x - pwx) < 6 && Math.abs(e.y - g.py) < 5) { e.dead = true; die(); return; }
        }
        g.shots = g.shots.filter(b => !b.dead); g.bombs = g.bombs.filter(b => !b.dead);
        g.foes = g.foes.filter(f => !f.dead); g.ebul = g.ebul.filter(e => !e.dead);
        if (g.course.objs.length > 400) g.course.objs = g.course.objs.filter(o => !o.dead);
        if (g.fuel <= 0) g.fuel = 0;
      }

      function tryStart() {
        if (api.useCredit()) { newGame(false); mode = 'game'; snd.start(); return; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
      }
      function update() {
        T++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.pressed('Enter') || api.pressed('Space')) { tryStart(); return; }
          if (page === 1) { updateGame(); if (mode === 'title' && page === 1 && T > 1800) { page = 0; T = 0; } }
          else if (T > 540) { page = 1; T = 0; newGame(true); }
          return;
        }
        updateGame();
      }

      // ---------- rendering ----------
      function drawWorld(ctx) {
        for (const s of stars) { if (((T + s.p) >> 5) & 1) { ctx.fillStyle = s.c; ctx.fillRect(((s.x - g.cam * 0.25) % W + W) % W | 0, s.y | 0, 1, 1); } }
        const cam = g.cam, i0 = Math.floor(cam / COLW), off = Math.round(cam - i0 * COLW);
        for (let k = 0; k <= W / COLW + 1; k++) {
          const c = g.course.cols[i0 + k]; if (!c) continue;
          const sx = k * COLW - off, col = SECT[c.s].col;
          ctx.fillStyle = col[0]; ctx.fillRect(sx, c.g, COLW, BOT - c.g);
          ctx.fillStyle = col[1]; ctx.fillRect(sx, c.g, COLW, 2);
          if (c.c > TOP) { ctx.fillStyle = col[0]; ctx.fillRect(sx, TOP, COLW, c.c - TOP); ctx.fillStyle = col[1]; ctx.fillRect(sx, c.c - 2, COLW, 2); }
          // windows on city blocks, rubble texture elsewhere
          if (SECT[c.s].terr === 'city' && c.g < 190) { ctx.fillStyle = (i0 + k) % 2 ? '#ffe040' : '#202060'; for (let y = c.g + 6; y < BOT - 4; y += 8) ctx.fillRect(sx + 1, y, 2, 3); }
          else if (((i0 + k) * 7) % 5 === 0) { ctx.fillStyle = '#00000060'; ctx.fillRect(sx + 1, c.g + 6 + ((i0 + k) % 9), 2, 2); }
        }
        ctx.fillStyle = '#000'; ctx.fillRect(0, BOT, W, H - BOT);
        for (const o of g.course.objs) {
          if (o.dead) continue;
          const sx = o.wx - cam; if (sx < -20 || sx > W + 20) continue;
          const spr = o.type === 'rocket' ? ROCKET : o.type === 'fuel' ? FUEL : o.type === 'myst' ? MYST : o.type === 'tank' ? TANK : BOOTY;
          drawSpr(ctx, spr, sx, o.y - spr.h / 2, {});
          if (o.type === 'rocket' && o.state === 'fly') { ctx.fillStyle = (T & 2) ? '#ffe040' : '#ff3030'; ctx.fillRect(sx - 1, o.y + 1, 3, 3 + (T & 3)); }
          if (o.type === 'booty' && (T >> 3) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 8, o.y - 14, 1, 1); ctx.fillRect(sx + 8, o.y - 10, 1, 1); }
        }
        for (const f of g.foes) {
          const sx = f.x - cam;
          if (f.t === 'ufo') drawSpr(ctx, UFO[(T >> 3) & 1], sx, f.y, {});
          else if (f.t === 'jet') drawSpr(ctx, JET, sx, f.y, {});
          else drawSpr(ctx, METEOR[(T >> 2) & 1], sx, f.y, {});
        }
        ctx.fillStyle = '#ffffff';
        for (const b of g.shots) ctx.fillRect(b.x - cam - 3, b.y, 6, 1);
        ctx.fillStyle = '#ffe040';
        for (const b of g.bombs) ctx.fillRect(b.x - cam - 1, b.y - 1, 3, 3);
        for (const e of g.ebul) { ctx.fillStyle = (T & 4) ? '#ff3030' : '#ffffff'; ctx.fillRect(e.x - cam - 1, e.y - 1, 3, 3); }
        // player
        if (g.phase !== 'dying') {
          drawSpr(ctx, COPTER[(T >> 1) & 1], g.px, g.py, {});
          if (g.phase === 'booty') drawSpr(ctx, BOOTY, g.px, g.py + 10, {});
        }
        for (const f of g.fx) {
          const sx = f.x - cam, life = f.life, r = (f.big ? 30 : 18) - life;
          ctx.fillStyle = life & 2 ? '#ffffff' : life & 4 ? '#ffe040' : '#ff3030';
          const n = f.big ? 12 : 8;
          for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + r * 0.05; ctx.fillRect(Math.round(sx + Math.cos(a) * r * 0.8), Math.round(f.y + Math.sin(a) * r * 0.6), 2, 2); }
          if (life > (f.big ? 20 : 12)) ctx.fillRect(sx - 3, f.y - 3, 6, 6);
        }
        for (const q of g.pops) text(ctx, q.s, q.x - cam, q.y, '#ffffff', 1, 'center');
      }
      function drawHud(ctx) {
        const sc = g && !g.demo ? g.score : 0;
        text(ctx, '1UP', 20, 1, '#ff3030'); text(ctx, String(sc).padStart(6, '0'), 8, 10, '#ffffff');
        text(ctx, 'HIGH SCORE', W / 2, 1, '#ff3030', 1, 'center'); text(ctx, String(Math.max(hi, sc)).padStart(6, '0'), W / 2, 10, '#ffffff', 1, 'center');
        if (!g) return;
        // section map: eleven blocks along the top right
        for (let i = 0; i < SECT.length; i++) {
          ctx.fillStyle = i < g.sect ? '#404040' : i === g.sect ? ((T >> 3) & 1 ? '#ffffff' : SECT[i].col[1]) : SECT[i].col[0];
          ctx.fillRect(176 + i * 7, 11, 6, 6);
        }
        text(ctx, g.loop ? 'MISSION ' + (g.loop + 1) : 'SECTION', 176, 1, '#40e060');
        // fuel
        const fy = BOT + 5;
        text(ctx, 'FUEL', 6, fy, '#ffe040');
        ctx.fillStyle = '#402020'; ctx.fillRect(36, fy, 100, 7);
        ctx.fillStyle = g.fuel < 20 ? ((T >> 3) & 1 ? '#ff3030' : '#ffe040') : '#40e060'; ctx.fillRect(36, fy, Math.round(g.fuel), 7);
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) { ctx.fillStyle = '#40e060'; ctx.fillRect(150 + i * 14, fy + 2, 10, 4); ctx.fillRect(150 + i * 14, fy, 10, 1); }
        if (g.demo) text(ctx, 'DEMO', W - 6, fy, '#ffffff', 1, 'right');
      }
      function drawCoin(ctx, y) {
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, y, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, y, '#ffffff', 1, 'center');
      }
      function drawGame(ctx) {
        drawWorld(ctx);
        drawHud(ctx);
        if (g.phase === 'ready' && !g.demo) { text(ctx, (g.loop ? 'MISSION ' + (g.loop + 1) + '  ' : '') + 'SECTION ' + (g.sect + 1), W / 2, 80, '#ffffff', 1, 'center'); text(ctx, 'READY', W / 2, 92, '#ffe040', 1, 'center'); }
        if (g.phase === 'booty') text(ctx, 'MISSION COMPLETE!', W / 2, 70, (T >> 3) & 1 ? '#ffe040' : '#ffffff', 1, 'center');
        if (g.phase === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 90, 120, 26); text(ctx, 'GAME OVER', W / 2, 96, '#ff3030', 2, 'center'); }
        if (g.demo) { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 46, 30, 92, 12); drawCoin(ctx, 32); }
      }
      function drawTitle(ctx) {
        const gg = g; g = null; drawHud(ctx); g = gg;
        for (const s of stars) if (((T + s.p) >> 5) & 1) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        text(ctx, 'SUPER', W / 2, 28, '#ff9020', 3, 'center');
        text(ctx, 'COBRA', W / 2, 54, '#40e060', 3, 'center');
        drawSpr(ctx, COPTER[(T >> 1) & 1], W / 2 + Math.sin(T * 0.03) * 60, 88, {});
        const rows = [[ROCKET, '50 / 80 PTS'], [FUEL, '150 PTS + FUEL'], [MYST, 'MYSTERY'], [TANK, '100 PTS'], [UFO[0], '100 PTS'], [JET, '200 PTS'], [BOOTY, 'THE BOOTY - BONUS']];
        rows.forEach((r, i) => { drawSpr(ctx, r[0], 76, 106 + i * 13, {}); text(ctx, r[1], 96, 103 + i * 13, '#ffffff'); });
        drawCoin(ctx, 198);
        text(ctx, credStr(), 4, H - 9, '#aaaaaa');
        text(ctx, '\u00a9 1981 KONAMI', W - 4, H - 9, '#aaaaaa', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' && page === 0) { drawTitle(ctx); return; }
        drawGame(ctx);
      }
      return { update, render, destroy() { if (g && !g.demo) api.setHiScore(g.score); } };
    }
  });
})();
