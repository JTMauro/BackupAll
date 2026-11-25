// Astro Blaster (Sega, 1981) \u2014 from-scratch recreation: sector waves, laser temperature, fuel, warp and mothership docking.
(function () {
  'use strict';
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
  // text(ctx, str, x, y, colour, scale, align: 'left'|'center'|'right')
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
  // Pixel sprite from strings ('.' = transparent), centred at cx,cy, rotated rot*90 degrees clockwise.
  function spr(ctx, rows, cx, cy, pal, rot, sc) {
    rot = (rot || 0) & 3; sc = sc || 1;
    const h = rows.length, w = rows[0].length;
    const ow = (rot & 1) ? h : w, oh = (rot & 1) ? w : h;
    const x0 = Math.round(cx - ow * sc / 2), y0 = Math.round(cy - oh * sc / 2);
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      for (let c = 0; c < w; c++) {
        const ch = row[c]; if (ch === '.' || ch === ' ') continue;
        let px, py;
        if (rot === 0) { px = c; py = r; } else if (rot === 1) { px = h - 1 - r; py = c; }
        else if (rot === 2) { px = w - 1 - c; py = h - 1 - r; } else { px = r; py = w - 1 - c; }
        ctx.fillStyle = pal[ch] || '#f0f';
        ctx.fillRect(x0 + px * sc, y0 + py * sc, sc, sc);
      }
    }
  }
  function pad(n, l) { return String(n).padStart(l, '0'); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(n) { return Math.floor(Math.random() * n); }
  ArcadeRegistry.register({
    id: 'astroblaster', title: 'Astro Blaster', year: 1981, maker: 'Sega',
    width: 224, height: 256, vector: false, pointer: false,
    controls: 'Left/Right: move \u00b7 Space: fire (watch the laser temperature) \u00b7 X: warp (slow time) \u00b7 Up/Down: docking \u00b7 Enter: start',
    marquee: { bg: '#04001a', fg: '#40e0ff', accent: '#ff3060' },
    create(api) {
      const W = 224, H = 256, PY = 222, TOP = 20;
      const au = api.audio;
      const C = { white: '#ffffff', red: '#ff3040', yellow: '#ffe040', cyan: '#40e8ff', green: '#40ff60', orange: '#ff9020', purple: '#c060ff', blue: '#3070ff', grey: '#808080' };

      // ---------- sprites ----------
      const SHIP = [
        '......w......',
        '.....wcw.....',
        '.....wcw.....',
        '....wwcww....',
        'r...wbbbw...r',
        'r..wwbbbww..r',
        'rwwwwwwwwwwwr',
        'rwwr.www.rwwr',
        'r..r..o..r..r'
      ];
      const SHIP_PAL = { w: '#e8e8ff', c: '#40e8ff', b: '#3070ff', r: '#ff3040', o: '#ff9020' };
      const SAUCER = [
        ['....ccc....', '..ccwwwcc..', '.ccccccccc.', 'ryryryryryr', '.ccccccccc.', '...c...c...'],
        ['....ccc....', '..ccwwwcc..', '.ccccccccc.', 'yryryryryry', '.ccccccccc.', '..c.....c..']
      ];
      const SAUCER_PAL = { c: '#40ff60', w: '#ffffff', r: '#ff3040', y: '#ffe040' };
      const DIVER = [
        ['p.........p', 'pp..yyy..pp', '.pp.yry.pp.', '..ppyyypp..', '...ppppp...', '..p.p.p.p..', '.p..p.p..p.', '....p.p....'],
        ['...........', '.p..yyy..p.', 'pp.pyrypp.p', '.pppyyyppp.', 'p..ppppp..p', '...p.p.p...', '...p...p...', '...........']
      ];
      const DIVER_PAL = { p: '#c060ff', y: '#ffe040', r: '#ff3040' };
      const SPIN = [
        ['....o....', '...ooo...', '..oo.oo..', '.oo.w.oo.', 'ooowwwooo', '.oo.w.oo.', '..oo.oo..', '...ooo...', '....o....'],
        ['oo.....oo', 'ooo...ooo', '.ooo.ooo.', '..o.w.o..', '...www...', '..o.w.o..', '.ooo.ooo.', 'ooo...ooo', 'oo.....oo']
      ];
      const SPIN_PAL = { o: '#ff9020', w: '#ffffff' };
      const BUG = [
        ['..r.....r..', '...r...r...', '..rrrrrrr..', '.rrwrrrwrr.', 'rrrrrrrrrrr', 'r.rrrrrrr.r', 'r.r.....r.r', '...rr.rr...'],
        ['..r.....r..', 'r..r...r..r', 'r.rrrrrrr.r', 'rrrwrrrwrrr', '.rrrrrrrrr.', '..rrrrrrr..', '..r.....r..', '.r.......r.']
      ];
      const BUG_PAL = { r: '#ff3060', w: '#ffffff' };

      // ---------- stars ----------
      const stars = [];
      for (let i = 0; i < 60; i++) stars.push({ x: irnd(W), y: Math.random() * H, s: 0.3 + (i % 3) * 0.35, c: ['#6060ff', '#ffffff', '#ffe040', '#40e8ff'][i & 3] });

      // ---------- state ----------
      let hi = api.getHiScore(10000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      const WAVES = ['saucer', 'diver', 'meteor', 'spin', 'bug'];
      const WAVE_NAME = { saucer: 'SAUCERS', diver: 'DIVERS', meteor: 'METEOR STORM', spin: 'SPINNERS', bug: 'SPACE BUGS', dock: 'DOCKING' };

      function newGame() {
        g = {
          score: 0, lives: 4, sector: 1, wave: 0, extra: 0,
          px: W / 2, py: PY, pstate: 'alive', pt: 0,
          shots: [], ebul: [], enemies: [], booms: [], pops: [],
          temp: 0, overheat: false, fuel: 100, warp: 0, warps: 1,
          phase: 'intro', t: 150, inv: 0, killed: 0, spawned: 0, target: 0, spawnT: 0, formX: 0, formDir: 1,
          mother: null, lowFuelT: 0
        };
        startWave();
        au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.12 });
      }
      function waveType() { return g.wave < 4 ? WAVES[(g.wave + g.sector - 1) % 5] : 'dock'; }
      function startWave() {
        g.enemies = []; g.ebul = []; g.killed = 0; g.spawned = 0; g.spawnT = 60; g.warps = 1;
        g.phase = 'intro'; g.t = 120; g.formX = 0; g.formDir = 1;
        const wt = waveType(), s = g.sector;
        g.target = { saucer: 16 + s * 2, diver: 16, meteor: 22 + s * 3, spin: 9 + s, bug: 14 + s * 2, dock: 0 }[wt];
        if (wt === 'diver') {
          for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++)
            g.enemies.push({ type: 'diver', hp: 1, slotX: 28 + i * 24, slotY: 46 + r * 18, x: 28 + i * 24, y: -20 - r * 18 - i * 6, state: 'enter', t: 0, vx: 0, vy: 0 });
          g.spawned = 16;
        }
        if (wt === 'dock') {
          g.mother = { x: W / 2, y: -40, t: 0, docked: false, timer: 60 * 30, fill: 0 };
          g.t = 90;
        } else g.mother = null;
      }
      // sector 1 is gentle; the pace ramps up a little every sector
      function sectorSpeed() { return 0.75 + Math.min(1.3, (g.sector - 1) * 0.1); }
      function addScore(n) {
        g.score += n;
        if (g.score >= 10000 && g.extra === 0) { g.extra = 1; g.lives++; au.melody([[1319, .07], [1568, .07], [2093, .15]], { type: 'square', vol: 0.12 }); }
        if (g.score > hi) hi = g.score;
      }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(80, 0.3, { type: 'square', vol: 0.15 });
        return false;
      }
      function boom(x, y, col, big) { g.booms.push({ x, y, t: 0, col, big: !!big }); }
      function pop(x, y, n) { g.pops.push({ x, y, n, t: 50 }); }

      // ---------- spawning ----------
      function spawnLogic(ts) {
        const wt = waveType(), sp = sectorSpeed();
        if (wt === 'diver' || wt === 'dock') return;
        g.spawnT -= ts;
        if (g.spawnT > 0 || g.spawned >= g.target) return;
        if (wt === 'saucer') {
          if (g.enemies.length > 12) return;
          const side = Math.random() < 0.5 ? -1 : 1;
          const x0 = W / 2 + side * rnd(20, 70);
          for (let i = 0; i < 5 && g.spawned < g.target; i++) {
            g.enemies.push({ type: 'saucer', hp: 1, x: x0, y: -10 - i * 14, x0, ph: Math.random() * 6, amp: rnd(30, 60), vy: 0.7 * sp, t: -i * 14, state: 'snake' });
            g.spawned++;
          }
          g.spawnT = 150 / sp;
        } else if (wt === 'meteor') {
          const big = Math.random() < 0.35;
          g.enemies.push({ type: 'meteor', big, hp: big ? 3 : 1, r: big ? 7 : 4, x: rnd(10, W - 10), y: -10, vx: rnd(-0.6, 0.6), vy: rnd(0.8, 1.5) * sp, rot: irnd(4), seed: irnd(1000) });
          g.spawned++; g.spawnT = rnd(18, 40) / sp;
        } else if (wt === 'spin') {
          if (g.enemies.length >= 4 + g.sector) return;
          g.enemies.push({ type: 'spin', hp: 2, x: rnd(20, W - 20), y: -10, vx: (Math.random() < 0.5 ? -1 : 1) * 1.6 * sp, vy: 0.5 * sp, t: 0, fire: rnd(60, 120) });
          g.spawned++; g.spawnT = 70 / sp;
        } else if (wt === 'bug') {
          if (g.enemies.length >= 6 + g.sector) return;
          const fromLeft = Math.random() < 0.5;
          g.enemies.push({ type: 'bug', hp: 1, x: fromLeft ? -8 : W + 8, y: rnd(40, 110), vx: (fromLeft ? 1 : -1) * 1.1 * sp, vy: 0, t: 0, state: 'cross', fire: rnd(40, 100) });
          g.spawned++; g.spawnT = 45 / sp;
        }
      }
      function enemyFire(e, aimed, spd) {
        if (g.pstate !== 'alive') return;
        spd = spd || 2;
        let vx = 0, vy = spd;
        if (aimed) {
          const dx = g.px - e.x, dy = g.py - e.y, d = Math.max(1, Math.hypot(dx, dy));
          vx = dx / d * spd; vy = Math.max(0.8, dy / d * spd);
        }
        g.ebul.push({ x: e.x, y: e.y + 4, vx, vy });
        au.tone(330, 0.06, { type: 'square', vol: 0.05, slideTo: 200 });
      }

      // ---------- enemy movement ----------
      function moveEnemies(ts) {
        const sp = sectorSpeed();
        // diver formation sway
        g.formX += g.formDir * 0.3 * ts;
        if (Math.abs(g.formX) > 14) g.formDir *= -1;
        let diving = 0;
        for (const e of g.enemies) if (e.type === 'diver' && e.state === 'dive') diving++;
        for (const e of g.enemies) {
          e.t = (e.t || 0) + ts;
          if (e.type === 'saucer') {
            if (e.t < 0) continue;
            e.y += e.vy * ts;
            e.x = e.x0 + Math.sin(e.t * 0.035 + e.ph) * e.amp;
            e.x = clamp(e.x, 6, W - 6);
            if (e.y > H + 10) { e.y = -10; e.x0 = rnd(50, W - 50); }
            if (Math.random() < 0.0025 * sp * ts && e.y > 20 && e.y < 140) enemyFire(e, false, 1.6);
          } else if (e.type === 'diver') {
            const sx = e.slotX + g.formX, sy = e.slotY;
            if (e.state === 'enter' || e.state === 'return') {
              const dx = sx - e.x, dy = sy - e.y, d = Math.hypot(dx, dy);
              const v = 2 * ts;
              if (d <= v) { e.x = sx; e.y = sy; e.state = 'form'; }
              else { e.x += dx / d * v; e.y += dy / d * v; }
            } else if (e.state === 'form') {
              e.x = sx; e.y = sy;
              if (g.phase === 'play' && g.pstate === 'alive' && g.inv <= 0 && diving < Math.min(g.sector, 4) && Math.random() < 0.004 * sp * ts) {
                e.state = 'dive'; e.vx = 0; e.vy = 1.2 * sp; diving++; e.dropped = 0;
                au.tone(900, 0.4, { type: 'triangle', vol: 0.06, slideTo: 300 });
              }
            } else if (e.state === 'dive') {
              const ax = clamp((g.px - e.x) * 0.004, -0.06, 0.06);
              e.vx = clamp(e.vx + ax * ts, -2.2, 2.2);
              e.vy = Math.min(2.6 * sp, e.vy + 0.02 * ts);
              e.x += e.vx * ts; e.y += e.vy * ts;
              if (e.dropped < (g.sector > 1 ? 2 : 1) && e.y > 90 + e.dropped * 40 && e.y < 170) { e.dropped++; enemyFire(e, false, 2); }
              if (e.y > H + 10) { e.y = -14; e.x = sx; e.state = 'return'; }
            }
          } else if (e.type === 'meteor') {
            e.x += e.vx * ts; e.y += e.vy * ts;
            if (e.x < -10 || e.x > W + 10 || e.y > H + 12) e.dead = true;
          } else if (e.type === 'spin') {
            e.x += e.vx * ts; e.y += e.vy * ts;
            if (e.x < 8) { e.x = 8; e.vx = Math.abs(e.vx); }
            if (e.x > W - 8) { e.x = W - 8; e.vx = -Math.abs(e.vx); }
            if (e.y > Math.min(180, 120 + g.sector * 15)) e.vy = -Math.abs(e.vy);
            if (e.y < 34 && e.vy < 0) e.vy = Math.abs(e.vy);
            e.fire -= ts;
            if (e.fire <= 0) { e.fire = rnd(100, 180) / sp; if (e.y < 140) enemyFire(e, g.sector > 1 || Math.random() < 0.5, 1.4 + g.sector * 0.15); }
          } else if (e.type === 'bug') {
            if (e.state === 'cross') {
              e.x += e.vx * ts;
              e.y += Math.sin(e.t * 0.08) * 0.6 * ts;
              if (Math.random() < 0.004 * ts && e.x > 20 && e.x < W - 20) { e.state = 'drop'; e.vy = 1.5 * sp; }
              if (e.x < -12 || e.x > W + 12) { e.vx = -e.vx; e.y = rnd(40, 110); }
            } else {
              e.y += e.vy * ts; e.x += Math.sign(g.px - e.x) * 0.45 * ts;
              if (e.y > H + 10) { e.y = -10; e.state = 'cross'; e.x = Math.random() < 0.5 ? -8 : W + 8; e.vx = (e.x < 0 ? 1 : -1) * Math.abs(e.vx); e.y = rnd(40, 100); }
            }
            e.fire -= ts;
            if (e.fire <= 0) { e.fire = rnd(110, 200) / sp; if (e.y < 140 && e.state === 'cross') enemyFire(e, Math.random() < 0.4, 1.8); }
          }
        }
        g.enemies = g.enemies.filter(e => !e.dead);
      }

      // ---------- hit testing ----------
      function ehit(e) {
        if (e.type === 'meteor') return e.r + 1;
        return e.type === 'spin' ? 5 : 5;
      }
      function killEnemy(e) {
        e.dead = true; g.killed++;
        let pts = 0, col = C.white;
        if (e.type === 'saucer') { pts = e.y > 120 ? 100 : 50; col = '#40ff60'; }
        else if (e.type === 'diver') { pts = e.state === 'dive' ? 160 : 80; col = C.purple; }
        else if (e.type === 'meteor') { pts = e.big ? 100 : 30; col = '#b08060'; }
        else if (e.type === 'spin') { pts = 150; col = C.orange; }
        else if (e.type === 'bug') { pts = e.state === 'drop' ? 200 : 100; col = C.red; }
        addScore(pts);
        if (pts >= 150) pop(e.x, e.y, pts);
        boom(e.x, e.y, col, e.type === 'meteor' && e.big);
        au.noise(0.18, { vol: 0.16, freq: 3000, slideTo: 400 });
        if (e.type === 'meteor' && e.big) {
          for (const s of [-1, 1]) g.enemies.push({ type: 'meteor', big: false, hp: 1, r: 4, x: e.x, y: e.y, vx: s * rnd(0.6, 1.1), vy: e.vy * 0.8, rot: irnd(4), seed: irnd(1000), split: true });
        }
      }
      function playerDie() {
        if (g.pstate !== 'alive') return;
        g.pstate = 'dead'; g.pt = 120;
        boom(g.px, g.py, C.white, true); boom(g.px - 6, g.py + 2, C.orange, true);
        au.noise(1.2, { vol: 0.3, freq: 1800, slideTo: 60 });
        au.tone(400, 1.0, { type: 'sawtooth', vol: 0.1, slideTo: 40 });
      }
      function waveDone() {
        const wt = waveType();
        if (wt === 'dock') return false;
        const real = g.enemies.filter(e => !(e.type === 'meteor' && e.split));
        if (wt === 'meteor') return g.spawned >= g.target && g.enemies.length === 0;
        return g.spawned >= g.target && real.length === 0;
      }

      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.t = 360;
        au.melody([[440, .2], [415, .2], [392, .2], [370, .2], [349, .6]], { type: 'triangle', vol: 0.14 });
      }

      // ---------- main update ----------
      function updateGame() {
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 260 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase === 'wait') return;
        const wt = waveType();
        const ts = g.warp > 0 ? 0.35 : 1;
        if (g.warp > 0) { g.warp--; if ((g.warp & 15) === 0) au.tone(200 + (g.warp & 48) * 6, 0.08, { type: 'sine', vol: 0.06 }); }

        // stars
        for (const s of g ? stars : []) { s.y += s.s * (wt === 'dock' ? 0.3 : 1) * ts; if (s.y > H) { s.y = 0; s.x = irnd(W); } }
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 40 : 24));
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);

        // player
        if (g.pstate === 'alive') {
          const sp = 1.7;
          if (api.key('ArrowLeft')) g.px -= sp;
          if (api.key('ArrowRight')) g.px += sp;
          g.px = clamp(g.px, 8, W - 8);
          if (wt === 'dock' && g.phase === 'play' && !g.mother.docked) {
            if (api.key('ArrowUp')) g.py -= 1.2;
            if (api.key('ArrowDown')) g.py += 1.2;
            g.py = clamp(g.py, 70, PY);
          } else if (g.py < PY) g.py = Math.min(PY, g.py + 1.5);
          // laser
          g.temp = Math.max(0, g.temp - 0.4);
          if (g.overheat && g.temp < 45) g.overheat = false;
          if (wt !== 'dock' && api.pressed('Space') || (wt !== 'dock' && api.key('Space') && (frame % 9) === 0)) {
            if (!g.overheat && g.shots.length < 3 && g.phase !== 'clear') {
              g.shots.push({ x: g.px, y: g.py - 8 });
              g.temp += 5;
              au.tone(1400, 0.07, { type: 'square', vol: 0.06, slideTo: 500 });
              if (g.temp >= 100) { g.temp = 100; g.overheat = true; au.melody([[220, .1], [0, .05], [220, .1], [0, .05], [220, .1]], { type: 'square', vol: 0.12 }); }
            }
          }
          if (api.pressed('KeyX') && g.warps > 0 && g.warp === 0 && wt !== 'dock' && g.phase === 'play') {
            g.warps--; g.warp = 240;
            au.melody([[300, .1], [600, .1], [300, .1], [600, .1]], { type: 'sine', vol: 0.12 });
          }
          // fuel
          if (g.phase === 'play' && wt !== 'dock') {
            g.fuel -= 0.009;
            if (g.fuel < 25 && (frame % 50) === 0) au.tone(880, 0.1, { type: 'square', vol: 0.08 });
            if (g.fuel <= 0) { g.fuel = 0; playerDie(); }
          }
        } else if (g.pstate === 'dead') {
          if (--g.pt <= 0) {
            g.lives--;
            if (g.lives <= 0) {
              g.phase = 'wait';
              if (api.offerContinue) {
                const cg = g;
                api.offerContinue(() => { if (g === cg) { g.lives = 4; respawn(); g.phase = 'play'; } }, () => { if (g === cg) gameOver(); });
              } else gameOver();
              return;
            }
            respawn();
          }
        }
        // shots
        for (const s of g.shots) s.y -= 5;
        g.shots = g.shots.filter(s => s.y > TOP - 4 && !s.dead);

        if (g.phase === 'intro') {
          moveEnemies(ts);
          if (wt === 'dock') updateDock(ts);
          if (--g.t <= 0) g.phase = 'play';
          return;
        }
        if (g.phase === 'clear') {
          if (--g.t <= 0) {
            g.wave++;
            if (g.wave > 4) { g.wave = 0; g.sector++; }
            startWave();
          }
          return;
        }
        if (wt === 'dock') { updateDock(ts); return; }
        spawnLogic(ts);
        moveEnemies(ts);
        // enemy bullets
        for (const b of g.ebul) { b.x += b.vx * ts; b.y += b.vy * ts; }
        g.ebul = g.ebul.filter(b => b.y < H + 4 && b.x > -4 && b.x < W + 4 && !b.dead);
        // shots vs enemies
        for (const s of g.shots) {
          for (const e of g.enemies) {
            if (e.dead || (e.t !== undefined && e.t < 0 && e.type === 'saucer')) continue;
            const r = ehit(e);
            if (Math.abs(s.x - e.x) <= r + 1 && Math.abs(s.y - e.y) <= r + 3) {
              s.dead = true;
              if (--e.hp <= 0) killEnemy(e);
              else { au.tone(500, 0.04, { type: 'square', vol: 0.08 }); e.flash = 6; }
              break;
            }
          }
        }
        g.shots = g.shots.filter(s => !s.dead);
        g.enemies = g.enemies.filter(e => !e.dead);
        // player collisions
        if (g.inv > 0) g.inv--;
        if (g.pstate === 'alive' && g.inv <= 0) {
          for (const b of g.ebul) if (Math.abs(b.x - g.px) < 4 && Math.abs(b.y - g.py) < 4) { b.dead = true; playerDie(); break; }
          for (const e of g.enemies) {
            const r = ehit(e);
            if (g.pstate === 'alive' && Math.abs(e.x - g.px) < r + 2 && Math.abs(e.y - g.py) < r + 1) { e.dead = true; if (e.type !== 'meteor') g.killed++; boom(e.x, e.y, C.white); playerDie(); break; }
          }
          g.enemies = g.enemies.filter(e => !e.dead);
        }
        if (waveDone() && g.pstate === 'alive') {
          g.phase = 'clear'; g.t = 120;
          au.melody([[659, .08], [784, .08], [988, .08], [1319, .2]], { type: 'square', vol: 0.1 });
        }
      }
      function respawn() {
        g.pstate = 'alive'; g.px = W / 2; g.py = PY; g.ebul = []; g.temp = 0; g.overheat = false; g.inv = 150;
        if (g.fuel < 50) g.fuel = 50;
        for (const e of g.enemies) if (e.type === 'diver' && e.state === 'dive') { e.state = 'return'; e.y = -14; }
      }
      // ---------- docking ----------
      function updateDock(ts) {
        const m = g.mother;
        m.t += ts;
        if (m.y < 56) m.y += 0.6;
        if (!m.docked) m.x = W / 2 + Math.sin(m.t * 0.012) * Math.min(60, 24 + g.sector * 6);
        if (g.phase !== 'play') return;
        if (m.docked) {
          m.fill++;
          if (g.fuel < 100 && (m.fill & 1)) { g.fuel = Math.min(100, g.fuel + 1); if ((m.fill & 7) === 1) au.tone(400 + g.fuel * 8, 0.05, { type: 'square', vol: 0.07 }); }
          g.px = m.x; g.py = m.y + 20;
          if (m.fill === 180) { const b = 1000 * Math.min(5, g.sector); addScore(b); pop(m.x, m.y + 30, b); au.melody([[784, .1], [988, .1], [1175, .1], [1568, .3]], { type: 'square', vol: 0.12 }); }
          if (m.fill > 260) { g.phase = 'clear'; g.t = 40; }
          return;
        }
        if (g.pstate !== 'alive') return;
        m.timer--;
        if (m.timer % 60 === 0 && m.timer < 600) au.tone(660, 0.05, { type: 'square', vol: 0.07 });
        if (m.timer <= 0) { g.phase = 'clear'; g.t = 90; au.tone(150, 0.5, { type: 'sawtooth', vol: 0.1 }); return; }
        const bottom = m.y + 12;
        const top = g.py - 5;
        if (top <= bottom + 6) {
          const off = g.px - m.x;
          if (Math.abs(off) <= 7) {
            m.docked = true; m.fill = 0;
            au.melody([[523, .08], [659, .08], [784, .08], [1047, .08]], { type: 'square', vol: 0.12 });
          } else if (Math.abs(off) < 36 && top <= bottom) {
            g.py = bottom + 22; g.fuel = Math.max(0, g.fuel - 6);
            au.noise(0.2, { vol: 0.2, freq: 900 }); boom(g.px, top, C.yellow);
            if (g.fuel <= 0) playerDie();
          }
        }
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          for (const s of stars) { s.y += s.s; if (s.y > H) { s.y = 0; s.x = irnd(W); } }
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        updateGame();
        if (!g) mode = 'title';
      }

      // ---------- render ----------
      function drawMeteor(ctx, e) {
        const r = e.r;
        let s = e.seed;
        ctx.fillStyle = e.flash > 0 ? '#fff' : (e.big ? '#a07050' : '#c09060');
        for (let y = -r; y <= r; y++) {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y)) - (s % 3 === 0 ? 1 : 0));
          ctx.fillRect(Math.round(e.x) - w, Math.round(e.y) + y, w * 2 + 1, 1);
        }
        ctx.fillStyle = '#5a3a28';
        ctx.fillRect(Math.round(e.x) - (r >> 1), Math.round(e.y) - (r >> 2), 2, 2);
        if (e.big) ctx.fillRect(Math.round(e.x) + 2, Math.round(e.y) + 2, 2, 2);
      }
      function drawEnemy(ctx, e) {
        const f = (frame >> 3) & 1;
        if (e.flash > 0) e.flash--;
        if (e.type === 'saucer') { if (e.t >= 0) spr(ctx, SAUCER[f], e.x, e.y, SAUCER_PAL); }
        else if (e.type === 'diver') spr(ctx, DIVER[e.state === 'dive' ? 1 : f], e.x, e.y, DIVER_PAL, e.state === 'return' ? 2 : 0);
        else if (e.type === 'meteor') drawMeteor(ctx, e);
        else if (e.type === 'spin') spr(ctx, SPIN[(frame >> 2) & 1], e.x, e.y, e.flash > 0 ? { o: '#fff', w: '#fff' } : SPIN_PAL);
        else if (e.type === 'bug') spr(ctx, BUG[f], e.x, e.y, BUG_PAL, e.state === 'drop' ? 2 : 0);
      }
      function drawMother(ctx, m) {
        const x = Math.round(m.x), y = Math.round(m.y);
        ctx.fillStyle = '#3070ff'; ctx.fillRect(x - 48, y - 4, 96, 12);
        ctx.fillStyle = '#5090ff'; ctx.fillRect(x - 40, y - 12, 80, 8);
        ctx.fillStyle = '#90c0ff'; ctx.fillRect(x - 24, y - 20, 48, 8);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 10, y - 26, 20, 6);
        ctx.fillStyle = '#204090'; ctx.fillRect(x - 56, y + 2, 112, 6);
        // lights
        for (let i = -5; i <= 5; i++) { ctx.fillStyle = ((frame >> 3) + i) & 1 ? '#ffe040' : '#ff3040'; ctx.fillRect(x + i * 8 - 1, y, 2, 2); }
        // docking port
        ctx.fillStyle = '#000'; ctx.fillRect(x - 7, y + 2, 14, 10);
        ctx.fillStyle = m.docked ? C.green : ((frame >> 2) & 1 ? C.yellow : C.red);
        ctx.fillRect(x - 8, y + 10, 2, 4); ctx.fillRect(x + 6, y + 10, 2, 4);
        // guide beam
        if (!m.docked && g.phase === 'play') { ctx.fillStyle = 'rgba(64,232,255,0.18)'; ctx.fillRect(x - 4, y + 14, 8, PY - y - 14); }
      }
      function bar(ctx, x, y, w, v, col, label) {
        text(ctx, label, x, y, C.white);
        const bx = x + label.length * 6 + 2;
        ctx.fillStyle = '#303030'; ctx.fillRect(bx, y + 1, w, 5);
        ctx.fillStyle = col; ctx.fillRect(bx, y + 1, Math.round(w * clamp(v, 0, 100) / 100), 5);
      }
      function drawHUD(ctx) {
        text(ctx, '1UP', 6, 2, C.red);
        text(ctx, pad(g ? g.score : 0, 6), 30, 2, C.white);
        text(ctx, 'HI', 120, 2, C.red);
        text(ctx, pad(hi, 6), 136, 2, C.white);
        if (!g) return;
        // bottom panel
        ctx.fillStyle = '#101028'; ctx.fillRect(0, H - 22, W, 22);
        const fcol = g.fuel < 25 ? ((frame >> 3) & 1 ? C.red : C.yellow) : C.green;
        bar(ctx, 4, H - 20, 60, g.fuel, fcol, 'FUEL');
        const tcol = g.overheat ? ((frame >> 2) & 1 ? C.red : C.white) : (g.temp > 70 ? C.orange : C.cyan);
        bar(ctx, 4, H - 10, 60, g.temp, tcol, 'TEMP');
        text(ctx, 'WARP', 104, H - 20, g.warps > 0 ? C.cyan : '#505050');
        if (g.warp > 0) text(ctx, '*', 134, H - 20, (frame >> 2) & 1 ? C.yellow : C.cyan);
        text(ctx, 'SECTOR ' + g.sector, 104, H - 10, C.yellow);
        for (let i = 0; i < Math.min(4, g.lives - 1); i++) spr(ctx, SHIP, W - 10 - i * 15, H - 11, SHIP_PAL);
      }
      function render(ctx) {
        ctx.fillStyle = g && g.warp > 0 ? '#0a0430' : '#000008'; ctx.fillRect(0, 0, W, H);
        for (const s of stars) { if (((frame + s.x) & 31) < 26) { ctx.fillStyle = s.c; ctx.fillRect(s.x, Math.floor(s.y), 1, s.s > 0.9 ? 2 : 1); } }
        if (mode === 'title') { drawHUD(ctx); drawTitle(ctx); return; }
        const wt = waveType();
        if (g.mother) drawMother(ctx, g.mother);
        for (const e of g.enemies) drawEnemy(ctx, e);
        ctx.fillStyle = C.yellow;
        for (const s of g.shots) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 6);
        ctx.fillStyle = '#ffffff';
        for (const s of g.shots) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 2);
        for (const b of g.ebul) { ctx.fillStyle = (frame >> 1) & 1 ? C.red : C.white; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 2, 4); }
        if (g.pstate === 'alive' && !(g.mother && g.mother.docked && g.mother.fill > 10) && !(g.inv > 0 && (frame >> 2) & 1)) spr(ctx, SHIP, g.px, g.py, SHIP_PAL);
        for (const b of g.booms) {
          const n = b.big ? 12 : 8, d = b.t * (b.big ? 0.9 : 0.7);
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + b.t * 0.05;
            ctx.fillStyle = (i + b.t) & 2 ? b.col : C.yellow;
            ctx.fillRect(Math.round(b.x + Math.cos(a) * d), Math.round(b.y + Math.sin(a) * d), 2, 2);
          }
          if (b.t < 6) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x) - 3, Math.round(b.y) - 3, 6, 6); }
        }
        for (const p of g.pops) text(ctx, p.n, p.x, p.y - (50 - p.t) * 0.3, C.cyan, 1, 'center');
        drawHUD(ctx);
        if (g.phase === 'intro') {
          text(ctx, 'SECTOR ' + g.sector + (wt === 'dock' ? '' : ' - WAVE ' + (g.wave + 1)), W / 2, 100, C.yellow, 1, 'center');
          text(ctx, WAVE_NAME[wt], W / 2, 114, C.cyan, 1, 'center');
          if (wt === 'dock') { text(ctx, 'UP/DOWN TO FLY', W / 2, 130, C.white, 1, 'center'); text(ctx, 'LINE UP WITH THE PORT', W / 2, 140, C.white, 1, 'center'); }
        }
        if (wt === 'dock' && g.phase === 'play' && g.mother && !g.mother.docked) {
          if ((frame >> 4) & 1) text(ctx, 'DOCK!', W / 2, 140, C.yellow, 2, 'center');
          text(ctx, 'TIME ' + Math.ceil(g.mother.timer / 60), W / 2, 160, C.white, 1, 'center');
        }
        if (g.mother && g.mother.docked) text(ctx, 'REFUELLING', W / 2, 150, C.green, 1, 'center');
        if (g.phase === 'clear' && wt !== 'dock') text(ctx, 'WAVE CLEAR', W / 2, 120, C.green, 1, 'center');
        if (g.overheat && g.pstate === 'alive' && (frame >> 3) & 1) text(ctx, 'LASER OVERHEAT', W / 2, 200, C.red, 1, 'center');
        if (g.fuel < 25 && g.pstate === 'alive' && wt !== 'dock' && (frame >> 4) & 1) text(ctx, 'LOW FUEL', W / 2, 188, C.yellow, 1, 'center');
        if (g.warp > 0 && (frame >> 3) & 1) text(ctx, 'WARP', W / 2, 30, C.purple, 1, 'center');
        if (g.phase === 'over' || g.phase === 'wait') text(ctx, 'GAME OVER', W / 2, 120, C.red, 2, 'center');
      }
      function drawTitle(ctx) {
        const page = Math.floor(titleT / 360) & 1;
        text(ctx, 'ASTRO', W / 2 + 2, 34, '#601040', 3, 'center');
        text(ctx, 'ASTRO', W / 2, 32, C.red, 3, 'center');
        text(ctx, 'BLASTER', W / 2 + 2, 58, '#103060', 3, 'center');
        text(ctx, 'BLASTER', W / 2, 56, C.cyan, 3, 'center');
        if (page === 0) {
          text(ctx, '- SCORE ADVANCE TABLE -', W / 2, 90, C.yellow, 1, 'center');
          const rows = [[SAUCER[(frame >> 3) & 1], SAUCER_PAL, '50 / 100'], [DIVER[(frame >> 3) & 1], DIVER_PAL, '80 / 160'],
            [null, null, '30 / 100'], [SPIN[(frame >> 2) & 1], SPIN_PAL, '150'], [BUG[(frame >> 3) & 1], BUG_PAL, '100 / 200']];
          rows.forEach((r, i) => {
            const y = 110 + i * 18;
            if (r[0]) spr(ctx, r[0], 70, y + 3, r[1]); else drawMeteor(ctx, { x: 70, y: y + 3, r: 6, big: true, seed: 7 });
            text(ctx, r[2] + ' PTS', 90, y, C.white);
          });
          text(ctx, 'DOCKING BONUS 1000 X SECTOR', W / 2, 206, C.green, 1, 'center');
        } else {
          text(ctx, 'SPACE  FIRE LASER', 30, 96, C.white);
          text(ctx, 'DON\'T LET IT OVERHEAT!', 30, 106, C.orange);
          text(ctx, 'X      WARP - SLOW TIME', 30, 122, C.white);
          text(ctx, '       ONCE PER WAVE', 30, 132, C.cyan);
          text(ctx, 'WATCH YOUR FUEL. DOCK', 30, 148, C.white);
          text(ctx, 'WITH THE MOTHER SHIP', 30, 158, C.white);
          text(ctx, 'AFTER EVERY 4 WAVES.', 30, 168, C.white);
          spr(ctx, SHIP, W / 2, 190, SHIP_PAL, 0, 2);
          text(ctx, 'BONUS SHIP AT 10000', W / 2, 206, C.green, 1, 'center');
        }
        const blink = (titleT >> 4) & 1;
        if (api.credits === 0 || coinFlash > 0) { if (blink || (coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 222, C.red, 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 222, C.yellow, 1, 'center');
        text(ctx, '\u00a9 1981 SEGA', W / 2, 234, C.grey, 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 9, C.grey);
      }
      return { update, render, destroy() { } };
    }
  });
})();
