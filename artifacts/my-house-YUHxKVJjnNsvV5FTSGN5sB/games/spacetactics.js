// Space Tactics (Sega, 1980) -- from-scratch recreation: a first-person gun-turret view that swivels around a
// full circle of space. Invader formations close in from any direction, attackers break off and dive at the
// cockpit, a mothership cruises overhead, and a limited barrier shield saves you in a pinch.
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
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const W = 256, H = 224, CX = 128, CY = 86, DASH = 180, F = 200, TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const wrap = a => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // enemy art: 4 rows of the formation, 2 frames each (12x8)
  const ART = [
    [['....XXXX....', '..XXXXXXXX..', '.XXOXXXXOXX.', 'XXXXXXXXXXXX', '..XX.XX.XX..', '.XX......XX.', 'XX........XX', '............'],
     ['....XXXX....', '..XXXXXXXX..', '.XXOXXXXOXX.', 'XXXXXXXXXXXX', '..XX.XX.XX..', '...XX..XX...', '..XX....XX..', '............']],
    [['..X......X..', '...X....X...', '..XXXXXXXX..', '.XXOXXXXOXX.', 'XXXXXXXXXXXX', 'X.XXXXXXXX.X', 'X.X......X.X', '...XX..XX...'],
     ['..X......X..', 'X..X....X..X', 'X.XXXXXXXX.X', 'XXXOXXXXOXXX', 'XXXXXXXXXXXX', '.XXXXXXXXXX.', '..X......X..', '.X........X.']],
    [['.....XX.....', '...XXXXXX...', '.XXXXXXXXXX.', 'XXOOXXXXOOXX', 'XXXXXXXXXXXX', '...XX..XX...', '..XX.XX.XX..', 'XX........XX'],
     ['.....XX.....', '...XXXXXX...', '.XXXXXXXXXX.', 'XXOOXXXXOOXX', 'XXXXXXXXXXXX', '..XXX..XXX..', '.XX..XX..XX.', '..XX....XX..']],
    [['.....XX.....', '....XXXX....', '...XXXXXX...', '..XXOXXOXX..', '.XXXXXXXXXX.', 'XX.XXXXXX.XX', 'X..X....X..X', '...XX..XX...'],
     ['.....XX.....', '....XXXX....', '...XXXXXX...', '..XXOXXOXX..', '.XXXXXXXXXX.', '..XXXXXXXX..', '.X.X....X.X.', 'X..........X']]
  ];
  const ROWCOL = ['#ff3a3a', '#ff60ff', '#40e0ff', '#40ff60'];
  const ROWPTS = [40, 30, 20, 10];
  const ESPR = ART.map((fr, i) => fr.map(rows => spr(rows, { X: ROWCOL[i], O: '#ffffff' })));
  const UFO = spr([
    '.....RRRRRR.....',
    '...RRRRRRRRRR...',
    '..RRWRRWWRRWRR..',
    '.RRRRRRRRRRRRRR.',
    'YY.YY.YY.YY.YY.Y',
    '..RRR......RRR..'], { R: '#ff4020', W: '#ffffff', Y: '#ffe000' });
  const BOOMC = ['#ffffff', '#ffe060', '#ff8020', '#ff3020'];

  ArcadeRegistry.register({
    id: 'spacetactics', title: 'Space Tactics', year: 1980, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: swivel/aim turret \u00b7 Space: fire \u00b7 X: barrier shield \u00b7 Enter: start',
    marquee: { bg: '#05001a', fg: '#40e0ff', accent: '#ff3a3a' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', frame = 0, coinFlash = 0, titleT = 0;
      let g = null;

      const stars = [];
      for (let i = 0; i < 160; i++) stars.push({ y: Math.random() * TAU, p: rnd(-0.05, 1.0), c: ['#ffffff', '#a0c0ff', '#ffe0a0', '#ff8080'][i & 3], tw: (Math.random() * 64) | 0 });
      const mountain = y => 6 + 4 * Math.sin(y * 3) + 3 * Math.sin(y * 7 + 1) + 2 * Math.sin(y * 13 + 2) + 1.5 * Math.sin(y * 23);

      const sfx = {
        fire() { au.tone(1200, 0.18, { type: 'square', slideTo: 200, vol: 0.07 }); },
        boom() { au.noise(0.35, { freq: 2200, slideTo: 150, vol: 0.22 }); },
        big() { au.noise(0.7, { freq: 1800, slideTo: 80, vol: 0.28 }); au.tone(300, 0.5, { type: 'sawtooth', slideTo: 50, vol: 0.08 }); },
        march(i) { au.tone([98, 87, 78, 73][i & 3], 0.09, { type: 'square', vol: 0.12 }); },
        dive() { au.tone(1600, 0.9, { type: 'sine', slideTo: 300, vol: 0.05 }); },
        efire() { au.tone(300, 0.2, { type: 'sawtooth', slideTo: 900, vol: 0.05 }); },
        shield() { au.tone(150, 0.6, { type: 'triangle', slideTo: 600, vol: 0.12 }); au.noise(0.5, { freq: 800, vol: 0.05, type: 'bandpass' }); },
        block() { au.tone(1800, 0.12, { type: 'square', slideTo: 900, vol: 0.08 }); },
        hit() { au.noise(1.3, { freq: 3500, slideTo: 60, vol: 0.35 }); au.tone(200, 1.2, { type: 'sawtooth', slideTo: 30, vol: 0.12 }); },
        warn() { au.tone(1400, 0.06, { type: 'square', vol: 0.06 }); },
        ufo() { au.tone(660, 0.1, { type: 'triangle', slideTo: 880, vol: 0.05 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [880, .1], [1047, .3]], { type: 'square', vol: 0.1 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .4]], { type: 'square', vol: 0.1 }); }
      };

      function newGame() {
        g = { score: 0, lives: 3, wave: 0, nextExtra: 10000, vy: 0, vp: 0.12, shells: [], shots: [], enemies: [], booms: [], pops: [],
          shields: 3, shieldT: 0, dead: 0, phase: 'intro', phaseT: 150, ufoT: 900, marchT: 0, marchI: 0, diveT: 200, flash: 0, warnT: 0, over: 0 };
        nextWave();
        sfx.start();
      }
      function nextWave() {
        g.wave++;
        g.shells = []; g.shots = []; g.enemies = [];
        g.shields = Math.max(g.shields, 3);
        g.f = { y: g.wave === 1 ? 0 : g.vy + rnd(-2.2, 2.2), base: 0, p: 0.22, d: 100, dir: 1, sp: 0.0035 + g.wave * 0.0005, orbit: (Math.random() < 0.5 ? -1 : 1) * (0.0008 + g.wave * 0.0002) };
        g.f.base = g.f.y;
        for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) g.enemies.push({ row: r, col: c, st: 'form', yaw: 0, p: 0, d: 100, t: 0 });
        g.phase = 'intro'; g.phaseT = g.wave === 1 ? 150 : 110; g.diveT = 240;
        placeFormation();
      }
      function slot(e) { const f = g.f; return { yaw: f.y + (e.col - 2.5) * 9 / f.d, p: f.p + (1.5 - e.row) * 7 / f.d, d: f.d }; }
      function placeFormation() { for (const e of g.enemies) if (e.st === 'form') { const s = slot(e); e.yaw = s.yaw; e.p = s.p; e.d = s.d; } }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 20000; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(yaw, p, d, txt) { g.pops.push({ yaw, p, d, txt, t: 60 }); }
      function boom(yaw, p, d, big) { g.booms.push({ yaw, p, d, t: 0, big: !!big }); }

      function killEnemy(e) {
        const pts = e.ufo ? [100, 150, 200, 300][(Math.random() * 4) | 0] : ROWPTS[e.row] * (e.st === 'dive' ? 2 : 1);
        addScore(pts);
        if (e.ufo || e.st === 'dive') pop(e.yaw, e.p, e.d, String(pts));
        boom(e.yaw, e.p, e.d, e.ufo);
        e.dead = true;
        if (e.ufo) sfx.big(); else sfx.boom();
      }
      function playerHit() {
        if (g.dead) return;
        g.dead = 130; g.flash = 20; sfx.hit();
        g.shots = [];
      }
      function afterDeath() {
        for (const e of g.enemies) if (e.st === 'dive') { e.st = 'form'; }
        g.enemies = g.enemies.filter(e => !e.ufo);
        if (g.f.d < 45) g.f.d = 70;
        placeFormation();
        if (g.lives <= 0) { lastLife(() => { g.lives = 3; g.shields = 3; }); return; }
        g.lives--; g.shields = Math.max(g.shields, 3);
      }
      function lastLife(onC) {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) onC(); }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() { api.setHiScore(g.score); g.over = 300; au.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: 0.1 }); }

      function launchDiver() {
        const form = g.enemies.filter(e => e.st === 'form');
        if (!form.length) return;
        // prefer bottom-row attackers, like the invaders breaking ranks
        form.sort((a, b) => b.row - a.row + Math.random() * 2 - 1);
        const e = form[0];
        e.st = 'dive'; e.t = 0; e.dy = (Math.random() < 0.5 ? -1 : 1) * rnd(0.006, 0.012); e.ph = Math.random() * 6;
        e.vd = 0.32 + g.wave * 0.03; e.fired = 0;
        sfx.dive();
      }

      function updGame() {
        const f = g.f;
        if (g.flash > 0) g.flash--;
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 40 : 24));
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);
        if (g.over > 0) { if (--g.over <= 0 || (g.over < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; } return; }

        // turret control (also during intro)
        if (!g.dead) {
          const ts = 0.026;
          if (api.key('ArrowLeft')) g.vy = wrap(g.vy - ts);
          if (api.key('ArrowRight')) g.vy = wrap(g.vy + ts);
          if (api.key('ArrowUp')) g.vp = Math.min(0.5, g.vp + 0.012);
          if (api.key('ArrowDown')) g.vp = Math.max(-0.04, g.vp - 0.012);
        }
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'clear') { if (--g.phaseT <= 0) nextWave(); updShells(); return; }

        if (g.dead > 0) {
          if (--g.dead === 0) afterDeath();
          return;
        }
        if (api.anyPressed('Space', 'KeyZ') && g.shells.length < 2) {
          g.shells.push({ yaw: g.vy, p: g.vp, d: 2 }); sfx.fire();
        }
        if (api.pressed('KeyX') && g.shieldT <= 0 && g.shields > 0) { g.shields--; g.shieldT = 110; sfx.shield(); }
        if (g.shieldT > 0) g.shieldT--;

        // formation march
        const form = g.enemies.filter(e => e.st === 'form' && !e.ufo);
        const total = g.enemies.filter(e => !e.ufo).length;
        const speed = f.sp * (1 + (24 - total) * 0.06);
        f.y = wrap(f.y + speed * f.dir);
        f.base = wrap(f.base + f.orbit);
        if (wrap(f.y - f.base) * f.dir > 0.45) { f.dir = -f.dir; f.d -= 4; }
        f.d -= 0.004 + g.wave * 0.001;
        f.p = 0.22 + Math.sin(frame * 0.01) * 0.04;
        placeFormation();
        const interval = Math.max(8, (total * 1.4) | 0);
        if (++g.marchT >= interval) { g.marchT = 0; sfx.march(g.marchI++); }
        if (f.d < 34 && total) {
          // the formation has reached the station
          g.msg = 'INVASION'; g.msgT = 120;
          f.d = 100; playerHit();
          return;
        }

        // divers
        if (--g.diveT <= 0) {
          g.diveT = Math.max(50, 220 - g.wave * 18) + Math.random() * 80;
          const diving = g.enemies.filter(e => e.st === 'dive').length;
          if (diving < Math.min(4, 1 + (g.wave >> 1)) || total <= 4) launchDiver();
        }
        let warn = false;
        for (const e of g.enemies) {
          if (e.st !== 'dive' || e.dead) continue;
          e.t++;
          e.yaw = wrap(e.yaw + e.dy + Math.sin(e.t * 0.05 + e.ph) * 0.006);
          e.p += (0.12 + Math.sin(e.t * 0.03) * 0.1 - e.p) * 0.02;
          e.d -= e.vd;
          if (!e.fired && e.d < 60 && Math.random() < 0.03) { e.fired = 1; fireShot(e); }
          if (e.d < 20 && e.fired < 2 && g.wave > 2 && Math.random() < 0.02) { e.fired = 2; fireShot(e); }
          if (e.d < 30) warn = true;
          if (e.d < 5) {
            if (g.shieldT > 0) { killEnemy(e); sfx.block(); }
            else { e.dead = true; boom(e.yaw, e.p, 6, true); playerHit(); }
          }
        }
        // formation fire
        if (form.length && Math.random() < 0.006 + g.wave * 0.0015) fireShot(form[(Math.random() * form.length) | 0]);
        // enemy shots
        for (const s of g.shots) {
          s.d -= s.sp; s.p += (0.08 - s.p) * 0.01; s.yaw = wrap(s.yaw + s.dy);
          if (s.d < 30) warn = true;
          if (s.d < 3) {
            s.dead = true;
            if (g.shieldT > 0) sfx.block(); else playerHit();
          }
        }
        g.shots = g.shots.filter(s => !s.dead);
        if (warn && ++g.warnT % 12 === 0) sfx.warn();
        // mothership
        if (--g.ufoT <= 0) {
          g.ufoT = 1100 + Math.random() * 900;
          const side = Math.random() < 0.5 ? -1 : 1;
          g.enemies.push({ ufo: true, st: 'ufo', yaw: wrap(g.vy + side * 1.5), p: 0.42, d: 85, vy: -side * 0.009, t: 0, row: 0 });
        }
        for (const e of g.enemies) if (e.ufo) {
          e.t++; e.yaw = wrap(e.yaw + e.vy);
          if (e.t % 10 === 0) sfx.ufo();
          if (e.t > 340) e.gone = true;
        }
        updShells();
        g.enemies = g.enemies.filter(e => !e.dead && !e.gone);
        if (!g.enemies.some(e => !e.ufo)) {
          g.enemies = [];
          const bonus = 500 * g.wave + g.shields * 200;
          addScore(bonus); g.bonus = bonus;
          g.phase = 'clear'; g.phaseT = 200; sfx.clear();
        }
      }
      function fireShot(e) {
        g.shots.push({ yaw: e.yaw, p: e.p, d: e.d, sp: 0.55 + g.wave * 0.05, dy: wrap(g.vy - e.yaw) * 0.002 });
        sfx.efire();
      }
      function updShells() {
        for (const s of g.shells) {
          const d0 = s.d;
          s.d += 3.6;
          for (const e of g.enemies) {
            if (e.dead || e.gone) continue;
            if (e.d < d0 - 3 || e.d > s.d + 3) continue;
            const hw = e.ufo ? 6 : 4.2, hh = e.ufo ? 3 : 3.2;
            if (Math.abs(wrap(e.yaw - s.yaw)) * e.d < hw && Math.abs(e.p - s.p) * e.d < hh) { killEnemy(e); s.dead = true; break; }
          }
          if (!s.dead) for (const o of g.shots) {
            if (o.dead || o.d < d0 - 3 || o.d > s.d + 3) continue;
            if (Math.abs(wrap(o.yaw - s.yaw)) * o.d < 3 && Math.abs(o.p - s.p) * o.d < 3) { o.dead = true; s.dead = true; addScore(10); boom(o.yaw, o.p, o.d); sfx.boom(); break; }
          }
          if (s.d > 115) s.dead = true;
        }
        g.shells = g.shells.filter(s => !s.dead);
      }

      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(98, 0.25, { type: 'square', vol: 0.12 }); return false;
      }
      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        updGame();
      }

      // ---------------- rendering ----------------
      let vy = 0, vp = 0;
      const px = yaw => CX + wrap(yaw - vy) * F;
      const py = p => CY - (p - vp) * F;
      function drawWorld(ctx) {
        ctx.fillStyle = '#02000c'; ctx.fillRect(0, 0, W, DASH);
        for (const s of stars) {
          const x = px(s.y), y = py(s.p);
          if (x < 0 || x >= W || y < 0 || y >= DASH) continue;
          if (((frame + s.tw) & 63) < 50) { ctx.fillStyle = s.c; ctx.fillRect(x | 0, y | 0, 1, 1); }
        }
        // planet surface
        const hy = Math.round(py(0));
        if (hy < DASH) {
          ctx.fillStyle = '#1a0830'; ctx.fillRect(0, hy, W, DASH - hy);
          ctx.fillStyle = '#401860';
          for (let x = 0; x < W; x += 2) { const h = mountain(vy + (x - CX) / F); ctx.fillRect(x, hy - h, 2, h); }
          ctx.strokeStyle = '#a030c0'; ctx.lineWidth = 1; ctx.beginPath();
          for (let k = 0; k < 32; k++) {
            const x0 = px(k * TAU / 32); if (x0 < -300 || x0 > W + 300) continue;
            ctx.moveTo(x0, hy); ctx.lineTo(CX + (x0 - CX) * 5, hy + (DASH - hy) * 5 + 40);
          }
          ctx.stroke();
          ctx.fillStyle = '#a030c0';
          for (let i = 1; i < 7; i++) { const t = ((i + (frame % 40) / 40) / 7); const y = hy + (DASH - hy) * t * t; ctx.fillRect(0, y | 0, W, 1); }
          ctx.fillStyle = '#ff60ff'; ctx.fillRect(0, hy, W, 1);
        }
      }
      function drawEnemy(ctx, e) {
        const x = px(e.yaw), y = py(e.p);
        if (x < -40 || x > W + 40 || y < -40 || y > DASH + 20) return;
        const s = Math.max(1, Math.min(6, Math.round(110 / e.d)));
        const im = e.ufo ? UFO : ESPR[e.row][((frame >> (e.st === 'dive' ? 3 : 5)) + e.col) & 1];
        ctx.drawImage(im, Math.round(x - im.width * s / 2), Math.round(y - im.height * s / 2), im.width * s, im.height * s);
      }
      function drawScene(ctx) {
        // farthest first
        const list = g.enemies.slice().sort((a, b) => b.d - a.d);
        for (const e of list) drawEnemy(ctx, e);
        for (const s of g.shots) {
          const x = px(s.yaw), y = py(s.p); if (x < -20 || x > W + 20) continue;
          const r = Math.max(1, Math.min(14, 60 / s.d));
          ctx.fillStyle = (frame >> 2) & 1 ? '#ffe040' : '#ff4020';
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r / 3, y - r / 3, Math.max(1, r / 1.5), Math.max(1, r / 1.5));
        }
        for (const b of g.booms) {
          const x = px(b.yaw), y = py(b.p); if (x < -40 || x > W + 40) continue;
          const sc = Math.max(1, 100 / b.d) * (b.big ? 1.6 : 1);
          for (let k = 0; k < 12; k++) {
            const a = k * TAU / 12 + b.t * 0.05, r = b.t * 0.35 * sc * (k & 1 ? 0.7 : 1);
            ctx.fillStyle = BOOMC[Math.min(3, b.t >> 3)];
            const s = Math.max(1, Math.round(sc * 0.8));
            ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), s, s);
          }
        }
        for (const p of g.pops) { const x = px(p.yaw); if (x > 0 && x < W) text(ctx, p.txt, x, py(p.p) - 10, '#ffe040', 1, 'center'); }
        // player shells: fly from the gun port toward the aim point
        for (const s of g.shells) {
          const tx = px(s.yaw), ty = py(s.p), k = 1 - 10 / (s.d + 10);
          const x = CX + (tx - CX) * k, y = DASH + (ty - DASH) * k, r = Math.max(1, 4 * (1 - k) + 1);
          ctx.fillStyle = '#80ffff'; ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), Math.ceil(r), Math.ceil(r));
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      }
      function drawCrosshair(ctx) {
        let on = false;
        for (const e of g.enemies) if (Math.abs(wrap(e.yaw - vy)) * e.d < 5 && Math.abs(e.p - vp) * e.d < 4) on = true;
        const c = on ? '#ff4040' : '#40ff60';
        ctx.fillStyle = c;
        ctx.fillRect(CX - 14, CY, 9, 1); ctx.fillRect(CX + 6, CY, 9, 1); ctx.fillRect(CX, CY - 12, 1, 8); ctx.fillRect(CX, CY + 5, 1, 8);
        ctx.fillRect(CX - 8, CY - 8, 3, 1); ctx.fillRect(CX - 8, CY - 8, 1, 3); ctx.fillRect(CX + 6, CY - 8, 3, 1); ctx.fillRect(CX + 8, CY - 8, 1, 3);
        ctx.fillRect(CX - 8, CY + 8, 3, 1); ctx.fillRect(CX - 8, CY + 6, 1, 3); ctx.fillRect(CX + 6, CY + 8, 3, 1); ctx.fillRect(CX + 8, CY + 6, 1, 3);
      }
      function drawCockpit(ctx) {
        // window struts
        ctx.fillStyle = '#303848';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 0); ctx.lineTo(0, 30); ctx.fill();
        ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - 22, 0); ctx.lineTo(W, 30); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, DASH); ctx.lineTo(0, DASH - 26); ctx.lineTo(30, DASH); ctx.fill();
        ctx.beginPath(); ctx.moveTo(W, DASH); ctx.lineTo(W, DASH - 26); ctx.lineTo(W - 30, DASH); ctx.fill();
        // gun barrel
        ctx.fillStyle = '#505868'; ctx.fillRect(CX - 5, DASH - 8, 11, 8); ctx.fillStyle = '#202630'; ctx.fillRect(CX - 2, DASH - 10, 5, 3);
        // dashboard
        ctx.fillStyle = '#181c28'; ctx.fillRect(0, DASH, W, H - DASH);
        ctx.fillStyle = '#5060a0'; ctx.fillRect(0, DASH, W, 1);
        // radar
        const rx = CX, ry = 202, R = 19;
        ctx.fillStyle = '#002010'; ctx.beginPath(); ctx.arc(rx, ry, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#20a040'; ctx.beginPath(); ctx.arc(rx, ry, R, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx, ry, R / 2, 0, TAU); ctx.stroke();
        // view wedge
        ctx.strokeStyle = '#40ff60'; ctx.beginPath(); ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.sin(-0.64) * R, ry - Math.cos(-0.64) * R); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(0.64) * R, ry - Math.cos(0.64) * R); ctx.stroke();
        for (const e of g.enemies) {
          const a = wrap(e.yaw - vy), r = clamp(e.d / 105, 0.1, 1) * (R - 2);
          ctx.fillStyle = e.ufo ? '#ffe040' : e.st === 'dive' ? ((frame >> 2) & 1 ? '#ff4040' : '#ffffff') : ROWCOL[e.row];
          ctx.fillRect(Math.round(rx + Math.sin(a) * r), Math.round(ry - Math.cos(a) * r), 2, 2);
        }
        for (const s of g.shots) {
          const a = wrap(s.yaw - vy), r = clamp(s.d / 105, 0.05, 1) * (R - 2);
          ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.round(rx + Math.sin(a) * r), Math.round(ry - Math.cos(a) * r), 1, 1);
        }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(rx, ry, 1, 1);
        // left panel
        text(ctx, '1UP', 6, DASH + 5, '#ff4040'); text(ctx, String(g.score).padStart(6, '0'), 30, DASH + 5, '#ffffff');
        text(ctx, 'HI', 6, DASH + 16, '#ff4040'); text(ctx, String(hi).padStart(6, '0'), 30, DASH + 16, '#ffffff');
        text(ctx, 'WAVE ' + g.wave, 6, DASH + 30, '#40e0ff');
        // right panel
        text(ctx, 'SHIELD', 160, DASH + 5, '#40e0ff');
        for (let i = 0; i < 5; i++) { ctx.fillStyle = i < g.shields ? '#40e0ff' : '#203040'; ctx.fillRect(200 + i * 10, DASH + 5, 8, 7); }
        text(ctx, 'SHIPS', 160, DASH + 17, '#40ff60');
        for (let i = 0; i < Math.min(5, g.lives); i++) { ctx.fillStyle = '#40ff60'; ctx.fillRect(203 + i * 10, DASH + 18, 3, 6); ctx.fillRect(200 + i * 10, DASH + 22, 9, 2); }
        const dist = Math.max(0, Math.round(g.f.d - 34));
        text(ctx, 'RANGE', 160, DASH + 30, dist < 20 && (frame >> 3) & 1 ? '#ff4040' : '#ffe040');
        ctx.fillStyle = '#302010'; ctx.fillRect(200, DASH + 31, 50, 5);
        ctx.fillStyle = dist < 20 ? '#ff4040' : '#ffe040'; ctx.fillRect(200, DASH + 31, Math.min(50, dist * 50 / 66), 5);
      }
      function drawShield(ctx) {
        const a = g.shieldT > 25 || (frame >> 2) & 1;
        if (!a) return;
        ctx.strokeStyle = 'rgba(80,220,255,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let y = 6; y < DASH; y += 16) for (let x = (y >> 4) & 1 ? 8 : 0; x < W; x += 16) {
          ctx.moveTo(x, y); ctx.lineTo(x + 6, y - 4); ctx.lineTo(x + 12, y);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(80,220,255,0.08)'; ctx.fillRect(0, 0, W, DASH);
      }
      function drawCracks(ctx) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath();
        for (let k = 0; k < 9; k++) {
          const a = k * 0.7 + 0.3; let x = CX + 10, y = CY + 10; ctx.moveTo(x, y);
          for (let j = 0; j < 5; j++) { x += Math.cos(a + (j & 1 ? 0.3 : -0.3)) * 18; y += Math.sin(a + (j & 1 ? 0.3 : -0.3)) * 18; ctx.lineTo(x, y); }
        }
        ctx.stroke();
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#02000c'; ctx.fillRect(0, 0, W, H);
        vy = titleT * 0.004; vp = 0.3;
        for (const s of stars) { const x = px(s.y), y = py(s.p); if (x >= 0 && x < W && y >= 0 && y < H) { ctx.fillStyle = s.c; ctx.fillRect(x | 0, y | 0, 1, 1); } }
        text(ctx, 'SPACE', CX + 2, 18, '#204080', 4, 'center'); text(ctx, 'SPACE', CX, 16, '#40e0ff', 4, 'center');
        text(ctx, 'TACTICS', CX + 2, 50, '#802020', 3, 'center'); text(ctx, 'TACTICS', CX, 48, '#ff3a3a', 3, 'center');
        text(ctx, '- SCORE ADVANCE TABLE -', CX, 82, '#ffffff', 1, 'center');
        for (let r = 0; r < 4; r++) {
          const y = 96 + r * 16;
          ctx.drawImage(ESPR[r][(frame >> 5) & 1], 70, y, 24, 16);
          text(ctx, '= ' + ROWPTS[r] + '  DIVING ' + ROWPTS[r] * 2, 104, y + 5, ROWCOL[r]);
        }
        ctx.drawImage(UFO, 70, 162, 32, 12); text(ctx, '= ???  MOTHERSHIP', 108, 165, '#ffe040');
        if (api.credits === 0) { if (coinFlash > 0 || (frame >> 5) & 1) text(ctx, 'INSERT COIN', CX, 186, coinFlash && (frame >> 2) & 1 ? '#ffe040' : '#ff4040', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', CX, 186, '#40ff60', 1, 'center');
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), CX, 198, '#ffffff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 6, 212, '#ffffff');
        text(ctx, '\u00a9 1980 SEGA', 250, 212, '#ffffff', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) { drawTitle(ctx); return; }
        vy = g.vy; vp = g.vp;
        let shake = 0;
        if (g.flash > 0) shake = (frame & 1 ? 2 : -2);
        ctx.save(); ctx.translate(shake, 0);
        drawWorld(ctx);
        drawScene(ctx);
        if (g.shieldT > 0) drawShield(ctx);
        if (!g.dead) drawCrosshair(ctx); else if (g.dead > 30) drawCracks(ctx);
        ctx.restore();
        if (g.flash > 0) { ctx.fillStyle = g.flash & 2 ? 'rgba(255,255,255,.7)' : 'rgba(255,40,40,.6)'; ctx.fillRect(0, 0, W, DASH); }
        drawCockpit(ctx);
        // off-screen direction arrows toward nearest threat
        let near = null;
        for (const e of g.enemies) if (!near || (e.st === 'dive' ? e.d - 50 : e.d) < (near.st === 'dive' ? near.d - 50 : near.d)) near = e;
        if (near && !g.dead) {
          const a = wrap(near.yaw - vy);
          if (Math.abs(a) > 0.66 && (frame >> 3) & 1) {
            if (a < 0) { ctx.fillStyle = '#ffe040'; ctx.beginPath(); ctx.moveTo(4, CY); ctx.lineTo(12, CY - 6); ctx.lineTo(12, CY + 6); ctx.fill(); }
            else { ctx.fillStyle = '#ffe040'; ctx.beginPath(); ctx.moveTo(W - 4, CY); ctx.lineTo(W - 12, CY - 6); ctx.lineTo(W - 12, CY + 6); ctx.fill(); }
          }
        }
        if (g.phase === 'intro') { text(ctx, 'WAVE ' + g.wave, CX, 60, '#40e0ff', 2, 'center'); if (g.wave === 1) text(ctx, 'DEFEND THE STATION', CX, 120, '#ffffff', 1, 'center'); }
        if (g.phase === 'clear') { text(ctx, 'WAVE CLEARED', CX, 60, '#40ff60', 2, 'center'); text(ctx, 'BONUS ' + g.bonus, CX, 82, '#ffe040', 1, 'center'); }
        if (g.msgT > 0) { g.msgT--; if ((frame >> 3) & 1) text(ctx, g.msg, CX, 40, '#ff4040', 2, 'center'); }
        if (g.over > 0) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 70, W, 40); text(ctx, 'GAME OVER', CX, 82, '#ff4040', 2, 'center'); }
      }
      return { update, render, destroy() { } };
    }
  });
})();
