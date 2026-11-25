// Contra (Konami, 1987) \u2014 from-scratch recreation for the MAME32 Game Room.
// Run-and-gun: somersault jumps, 8-way aiming, weapon falcons (M, F, S, L, R), jungle stage with exploding
// bridges and the defense-wall boss, then the 3D base corridor (core sensors, electric barriers) and its giant eye boss.
(function () {
  'use strict';
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
  function mkRng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const W = 224, H = 256, TILE = 16, GROUND = 216, WATER = 232, TIERS = [176, 136, 96];
  const WEAPONS = ['M', 'F', 'S', 'L', 'R'];
  const WCOL = { M: '#40a0ff', F: '#ff6020', S: '#ff3060', L: '#60ffff', R: '#ffd040' };

  ArcadeRegistry.register({
    id: 'contra', title: 'Contra', year: 1987, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: run/aim (Down: prone) \u00b7 Space: fire \u00b7 X: jump (Down+X: drop) \u00b7 Enter: start',
    marquee: { bg: '#100800', fg: '#ff3a1a', accent: '#ffd040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', mt = 0, frame = 0, coinFlash = 0, overT = 0;
      let g = null;
      const bgStars = [];
      for (let i = 0; i < 40; i++) bgStars.push({ x: Math.random() * 600, y: Math.random() * 90 });

      const snd = {
        shot() { au.tone(900, 0.04, { type: 'square', vol: 0.06, slideTo: 300 }); },
        spread() { au.tone(1200, 0.06, { type: 'sawtooth', vol: 0.06, slideTo: 400 }); },
        laser() { au.tone(1800, 0.12, { type: 'sawtooth', vol: 0.06, slideTo: 2600 }); },
        fire() { au.noise(0.08, { vol: 0.08, freq: 900 }); },
        hit() { au.tone(180, 0.03, { type: 'square', vol: 0.07 }); },
        kill() { au.noise(0.12, { vol: 0.12, freq: 1800, slideTo: 300 }); },
        boom() { au.noise(0.45, { vol: 0.22, freq: 1500, slideTo: 60 }); },
        jump() { au.tone(300, 0.08, { type: 'square', vol: 0.05, slideTo: 600 }); },
        item() { au.melody([[784, 0.05], [988, 0.05], [1175, 0.05], [1568, 0.12]], { type: 'square', vol: 0.12 }); },
        die() { au.melody([[784, 0.08], [622, 0.08], [523, 0.08], [415, 0.08], [311, 0.3]], { type: 'square', vol: 0.12 }); },
        eshot() { au.tone(500, 0.04, { type: 'triangle', vol: 0.06, slideTo: 250 }); },
        splash() { au.noise(0.2, { vol: 0.08, freq: 3000, slideTo: 500 }); },
        extra() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.12 }); },
        start() { au.melody([[330, 0.1], [330, 0.1], [440, 0.1], [494, 0.1], [523, 0.2], [494, 0.1], [440, 0.1], [523, 0.4]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.24], [988, 0.12], [1047, 0.4]], { type: 'square', vol: 0.12 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); return false;
      }

      // =============== shared ===============
      function addScore(n) {
        g.score += n; if (g.score > hi) hi = g.score;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 70000; snd.extra(); }
      }
      function boomAt(x, y, n, big) {
        for (let i = 0; i < (n || 8); i++) {
          const a = Math.random() * 6.28, s = 0.4 + Math.random() * (big ? 2.5 : 1.5);
          g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 16 + Math.random() * 18, c: Math.random() < 0.5 ? '#fff060' : '#ff5010' });
        }
      }
      function newGame() {
        g = { score: 0, lives: 3, nextExtra: 20000, loop: 0, stage: 0, weapon: 'N', rapid: false, parts: [] };
        startJungle(); snd.start();
      }
      function loseLife(respawn) {
        g.lives--;
        g.weapon = 'N'; g.rapid = false;
        if (g.lives <= 0) {
          g.wait = true;
          const cg = g;
          const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 300; au.melody([[392, 0.25], [349, 0.25], [330, 0.25], [262, 0.6]], { type: 'square', vol: 0.12 }); };
          if (api.offerContinue) api.offerContinue(() => { if (g !== cg) return; g.wait = false; g.lives = 3; g.score = 0; g.nextExtra = 20000; respawn(); }, end);
          else end();
        } else respawn();
      }

      // =============== JUNGLE (side-scrolling) ===============
      function genLevel(loop) {
        const r = mkRng(4242 + loop * 31);
        const cols = [], place = [];
        const col = (gnd) => ({ g: gnd, t: [false, false, false], br: false });
        for (let i = 0; i < 14; i++) cols.push(col(1));
        let lastWater = false;
        while (cols.length < 176) {
          const k = r();
          let gnd = 1;
          if (!lastWater && cols.length > 24) gnd = k < 0.18 ? 0 : k < 0.36 ? 2 : 1;
          const len = gnd === 1 ? 6 + (r() * 8 | 0) : 4 + (r() * 3 | 0);
          const start = cols.length;
          for (let i = 0; i < len; i++) cols.push(col(gnd));
          lastWater = gnd !== 1;
          // tiers: each needs the one below it (reachability)
          let lo = start, hiC = start + len;
          for (let t = 0; t < 3; t++) {
            if (r() < [0.6, 0.45, 0.3][t]) {
              const a = lo + (r() * 2 | 0), b = Math.max(a + 3, hiC - (r() * 2 | 0));
              for (let i = a; i < b && i < cols.length; i++) cols[i].t[t] = true;
              lo = a + 1; hiC = b - 1;
              if (hiC - lo < 3) break;
            } else break;
          }
          // placements
          const mid = start + (len >> 1);
          if (gnd === 1) {
            const q = r();
            if (q < 0.3) place.push({ x: (mid + 1) * TILE, t: 'turret' });
            else if (q < 0.5) place.push({ x: (mid + 1) * TILE, t: 'pillbox' });
          }
          for (let t = 0; t < 3; t++) {
            if (cols[mid].t[t] && r() < 0.55) place.push({ x: mid * TILE + 8, t: 'sniper', y: TIERS[t] });
          }
          if (r() < 0.22) place.push({ x: start * TILE, t: 'capsule' });
        }
        for (let i = 0; i < 26; i++) cols.push(col(1));
        place.push({ x: 40 * TILE, t: 'capsule' });
        place.sort((a, b) => a.x - b.x);
        return { cols, place, end: cols.length * TILE };
      }
      function startJungle() {
        g.stage = 0; g.mode = 'jungle';
        g.lv = genLevel(g.loop);
        g.cam = 0; g.pi = 0;
        g.en = []; g.pb = []; g.eb = []; g.items = []; g.parts = []; g.corpses = [];
        g.bridges = {}; // col index -> explode timer (-1 = intact)
        g.spawnT = 120; g.boss = null; g.clearT = 0; g.banner = 160;
        spawnPlayer(30, GROUND);
      }
      function spawnPlayer(x, y) {
        g.p = { x, y, vx: 0, vy: 0, on: true, face: 1, ball: false, prone: false, swim: false, inv: 150, dead: false, deadT: 0, ign: -1, ignT: 0, aim: [1, 0], run: 0, fireT: 0 };
      }
      function colAt(wx) { const i = Math.floor(wx / TILE); return g.lv.cols[clamp(i, 0, g.lv.cols.length - 1)]; }
      function groundOK(wx) {
        const i = Math.floor(wx / TILE), c = g.lv.cols[clamp(i, 0, g.lv.cols.length - 1)];
        if (c.g === 1) return true;
        if (c.g === 2) { const b = g.bridges[i]; return !(b !== undefined && b <= 0); }
        return false;
      }
      function surfaces(wx) {
        const c = colAt(wx), s = [];
        for (let t = 0; t < 3; t++) if (c.t[t]) s.push(TIERS[t]);
        if (groundOK(wx)) s.push(GROUND);
        return s;
      }
      function landY(wx, y0, y1, ign) {
        let best = null;
        for (const s of surfaces(wx)) if (s !== ign && y0 <= s && y1 >= s && (best === null || s < best)) best = s;
        return best;
      }
      function hasSurf(wx, y) { return surfaces(wx).indexOf(y) >= 0; }

      function aimFromKeys(p) {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const f = p.face, h = L || R;
        if (U && h) return [f * 0.7071, -0.7071];
        if (U) return [0, -1];
        if (D && h && !p.swim) return [f * 0.7071, 0.7071];
        if (D && !p.on) return [0, 1];
        return [f, 0];
      }
      function muzzle(p) {
        const a = p.aim;
        if (p.ball) return [p.x, p.y - 14];
        if (p.prone) return [p.x + p.face * 14, p.y - 4];
        if (p.swim) return [p.x + a[0] * 8, p.y - 8 + a[1] * 6];
        if (a[0] === 0 && a[1] < 0) return [p.x + p.face * 2, p.y - 34];
        if (a[1] < 0) return [p.x + a[0] * 12, p.y - 28];
        if (a[1] > 0) return [p.x + a[0] * 12, p.y - 12];
        return [p.x + p.face * 12, p.y - 19];
      }
      function playerFire(p) {
        const [mx, my] = muzzle(p), a = p.aim, w = g.weapon, sp = g.rapid ? 1.4 : 1;
        const mine = g.pb.length;
        if (w === 'N') { if (mine >= 4) return; g.pb.push({ x: mx, y: my, vx: a[0] * 4 * sp, vy: a[1] * 4 * sp, d: 1, k: 'n', r: 1 }); snd.shot(); }
        else if (w === 'M') { if (mine >= 6) return; g.pb.push({ x: mx, y: my, vx: a[0] * 4.5 * sp, vy: a[1] * 4.5 * sp, d: 1, k: 'n', r: 1 }); snd.shot(); }
        else if (w === 'S') {
          if (mine >= 10) return;
          const base = Math.atan2(a[1], a[0]);
          for (const o of [-0.3, -0.15, 0, 0.15, 0.3]) g.pb.push({ x: mx, y: my, vx: Math.cos(base + o) * 3.6 * sp, vy: Math.sin(base + o) * 3.6 * sp, d: 1, k: 's', r: 1, age: 0 });
          snd.spread();
        } else if (w === 'F') {
          if (mine >= 2) return;
          g.pb.push({ x: mx, y: my, cx: mx, cy: my, vx: a[0] * 2.6 * sp, vy: a[1] * 2.6 * sp, d: 2, k: 'f', ang: 0, r: 3 }); snd.fire();
        } else if (w === 'L') {
          g.pb = g.pb.filter(b => b.k !== 'l');
          g.pb.push({ x: mx, y: my, vx: a[0] * 6 * sp, vy: a[1] * 6 * sp, d: 3, k: 'l', len: 0, hit: [], r: 1 }); snd.laser();
        }
      }
      function pHit(p) {
        if (p.ball) return [p.x - 6, p.y - 20, 12, 12];
        if (p.prone) return [p.x - 10, p.y - 7, 20, 7];
        if (p.swim) return [p.x - 4, p.y - 10, 8, 8];
        return [p.x - 4, p.y - 28, 8, 27];
      }
      function killP() {
        const p = g.p; if (p.dead || p.inv > 0) return;
        p.dead = true; p.deadT = 100; p.vy = -3.2; p.vx = -p.face * 1; p.on = false; p.ball = false; p.prone = false; p.swim = false;
        snd.die();
      }

      function updJunglePlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.dead) {
          p.deadT--;
          if (!p.on) {
            p.vy += 0.2; const y0 = p.y; p.y += p.vy; p.x += p.vx;
            const s = p.vy > 0 ? landY(p.x, y0, p.y, -1) : null;
            if (s !== null) { p.y = s; p.on = true; }
            if (p.y > WATER) { p.y = WATER; p.on = true; }
          }
          if (p.deadT <= 0) loseLife(() => { spawnPlayer(g.cam + 40, -10); g.p.on = false; g.p.ball = true; });
          return;
        }
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), D = api.key('ArrowDown');
        p.prone = p.on && !p.swim && D && !L && !R;
        let mv = 0;
        if (!p.prone) { if (L) { mv = -1; p.face = -1; } else if (R) { mv = 1; p.face = 1; } }
        else { if (L) p.face = -1; if (R) p.face = 1; }
        const upOnly = api.key('ArrowUp') && !L && !R;
        if (upOnly && p.on && !p.swim) mv = 0;
        p.x += mv * 1.35;
        p.run = mv ? p.run + 1 : 0;
        const maxX = g.boss ? g.boss.x - 8 : g.lv.end - 8;
        p.x = clamp(p.x, g.cam + 6, Math.min(g.cam + W - 6, maxX));
        // jump / drop
        if (api.pressed('KeyX') && p.on) {
          if (D && !p.swim && p.y < GROUND) { p.ign = p.y; p.ignT = 16; p.on = false; p.vy = 0.5; p.ball = false; }
          else { p.vy = p.swim ? -3.6 : -4.3; p.on = false; p.ball = true; p.swim = false; snd.jump(); }
        }
        if (p.ignT > 0 && --p.ignT === 0) p.ign = -1;
        // physics
        if (p.on) {
          if (p.swim) {
            if (groundOK(p.x)) { p.y = GROUND; p.swim = false; }
          } else if (!hasSurf(p.x, p.y)) { p.on = false; p.vy = 0; }
        }
        if (!p.on) {
          p.vy = Math.min(5, p.vy + 0.2);
          const y0 = p.y; p.y += p.vy;
          const s = p.vy > 0 ? landY(p.x, y0, p.y, p.ign) : null;
          if (s !== null) { p.y = s; p.on = true; p.vy = 0; p.ball = false; }
          else if (p.y >= WATER - 2 && !groundOK(p.x)) { p.y = WATER; p.on = true; p.swim = true; p.ball = false; p.vy = 0; snd.splash(); }
          else if (p.y > H + 20) { p.y = WATER; p.on = true; p.swim = true; }
        }
        p.aim = aimFromKeys(p);
        if (p.fireT > 0) p.fireT--;
        const auto = g.weapon === 'M' ? 6 : 14;
        if (api.pressed('Space') || (api.key('Space') && p.fireT <= 0)) { if (p.fireT <= 0 || api.pressed('Space')) { playerFire(p); p.fireT = auto; } }
        // bridge trigger
        const ci = Math.floor((p.x + 24) / TILE);
        const c = g.lv.cols[ci];
        if (c && c.g === 2 && g.bridges[ci] === undefined) {
          let i = ci; let d = 0;
          while (g.lv.cols[i] && g.lv.cols[i].g === 2) { if (g.bridges[i] === undefined) g.bridges[i] = 30 + d * 18; i++; d++; }
        }
        // camera
        const lock = g.lv.end - W;
        g.cam = clamp(Math.max(g.cam, p.x - 96), 0, lock);
      }

      function E(o) { const e = Object.assign({ hp: 1, t: 0, w: 10, h: 26, pts: 100, vx: 0, vy: 0, fireT: 60 + Math.random() * 60, face: -1 }, o); g.en.push(e); return e; }
      function eShot(x, y, tx, ty, sp, grav) {
        const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
        sp = sp || (1.5 + g.loop * 0.3);
        g.eb.push({ x, y, vx: dx / d * sp, vy: dy / d * sp, gr: grav || 0 });
        snd.eshot();
      }
      function aim8(x, y, tx, ty) {
        const a = Math.round(Math.atan2(ty - y, tx - x) / (Math.PI / 4)) * (Math.PI / 4);
        return [Math.cos(a), Math.sin(a)];
      }
      function spawnPlaced(pl) {
        switch (pl.t) {
          case 'sniper': E({ type: 'sniper', x: pl.x, y: pl.y, hp: 1, pts: 200, fireT: 50 }); break;
          case 'turret': E({ type: 'turret', x: pl.x, y: GROUND, w: 18, h: 18, hp: 8 + g.loop * 2, pts: 500, ang: Math.PI, fireT: 60 }); break;
          case 'pillbox': E({ type: 'pillbox', x: pl.x, y: GROUND, w: 18, h: 16, hp: 3, pts: 500, open: false }); break;
          case 'capsule': E({ type: 'capsule', x: g.cam - 10, y: 60 + Math.random() * 40, by: 60 + Math.random() * 40, w: 14, h: 10, hp: 1, pts: 500, vx: 1.3 }); break;
        }
      }
      function spawnRunner() {
        const fromLeft = Math.random() < 0.18 && g.cam > 0;
        const x = fromLeft ? g.cam - 8 : g.cam + W + 8;
        const s = surfaces(x);
        if (!s.length) return;
        const y = s[(Math.random() * s.length) | 0];
        E({ type: 'runner', x, y, vx: fromLeft ? 1.15 : -1.15, face: fromLeft ? 1 : -1, on: true, shoot: Math.random() < 0.25 + g.loop * 0.2, shot: false, pts: 100 });
      }
      function dropFalcon(x, y, w) {
        g.items.push({ x, y, vy: -2.5, vx: 0.6, w: w || WEAPONS[(Math.random() * WEAPONS.length) | 0], on: false });
      }
      function hurtEnemy(e, d) {
        if (e.dead) return;
        if (e.type === 'pillbox' && !e.open) { snd.hit(); return; }
        if (e.type === 'core' && g.boss && g.boss.cannons > 0 && false) return;
        e.hp -= d; e.flash = 4;
        if (e.hp > 0) { snd.hit(); return; }
        e.dead = true; addScore(e.pts);
        boomAt(e.x, e.y - e.h / 2, e.type === 'core' ? 30 : 10, e.type !== 'runner' && e.type !== 'sniper');
        if (e.type === 'runner' || e.type === 'sniper' || e.type === 'wsniper') { snd.kill(); g.corpses.push({ x: e.x, y: e.y, t: 30, face: e.face }); }
        else snd.boom();
        if (e.type === 'pillbox' || e.type === 'capsule') dropFalcon(e.x, e.y - 10);
        if (e.type === 'bcannon') g.boss.cannons--;
        if (e.type === 'core') bossDown();
      }
      function bossDown() {
        const b = g.boss; b.dead = true; b.t = 0;
        for (const e of g.en) if (e.boss && !e.dead) { e.dead = true; boomAt(e.x, e.y - 8, 10, true); }
        g.eb = [];
        snd.boom();
      }
      function updJungle() {
        if (g.banner > 0) g.banner--;
        updJunglePlayer();
        const p = g.p;
        // placements
        while (g.pi < g.lv.place.length && g.lv.place[g.pi].x < g.cam + W + 16) spawnPlaced(g.lv.place[g.pi++]);
        // runners
        if (!g.boss || !g.boss.dead) {
          if (--g.spawnT <= 0) { spawnRunner(); g.spawnT = Math.max(35, 90 - g.loop * 15) + Math.random() * 60; }
        }
        // boss activation
        if (!g.boss && g.cam >= g.lv.end - W - 1) startWallBoss();
        // bridges
        for (const k in g.bridges) {
          if (g.bridges[k] > 0) {
            g.bridges[k]--;
            if (g.bridges[k] === 0) { const bx = +k * TILE + 8; boomAt(bx, GROUND, 12, true); snd.boom(); }
          }
        }
        // player bullets
        for (const b of g.pb) {
          if (b.k === 'f') {
            b.cx += b.vx; b.cy += b.vy; b.ang += 0.35;
            const nx = -b.vy, ny = b.vx, nl = Math.hypot(nx, ny) || 1;
            const r = 8 * Math.sin(b.ang);
            b.x = b.cx + nx / nl * r; b.y = b.cy + ny / nl * r;
          } else { b.x += b.vx; b.y += b.vy; }
          if (b.k === 'l') b.len = Math.min(28, b.len + 6);
          if (b.k === 's') { b.age++; b.r = b.age > 10 ? 2 : 1; }
          if (b.x < g.cam - 30 || b.x > g.cam + W + 30 || b.y < -30 || b.y > H + 10) { b.dead = true; continue; }
          for (const e of g.en) {
            if (e.dead || e.type === 'corpse') continue;
            if (b.hit && b.hit.indexOf(e) >= 0) continue;
            const rr = b.r + 1;
            if (b.x > e.x - e.w / 2 - rr && b.x < e.x + e.w / 2 + rr && b.y > e.y - e.h - rr && b.y < e.y + rr) {
              if (e.type === 'pillbox' && !e.open) { b.dead = true; snd.hit(); break; }
              hurtEnemy(e, b.d);
              if (b.k === 'l') b.hit.push(e); else { b.dead = true; break; }
            }
          }
        }
        g.pb = g.pb.filter(b => !b.dead);
        // enemies
        for (const e of g.en) {
          if (e.dead) continue;
          e.t++; if (e.flash) e.flash--;
          const onScreen = e.x > g.cam - 8 && e.x < g.cam + W + 8;
          switch (e.type) {
            case 'runner': {
              e.x += e.vx;
              if (e.on) {
                if (!hasSurf(e.x, e.y)) {
                  if (Math.random() < 0.35) { e.vy = -3; } else e.vy = 0;
                  e.on = false;
                }
                if (e.shoot && !e.shot && Math.abs(e.x - p.x) < 90 && Math.abs(e.y - p.y) < 50 && onScreen) {
                  e.shot = true; e.pause = 24; eShot(e.x, e.y - 19, p.x, p.y - 16);
                }
              } else {
                e.vy = Math.min(5, e.vy + 0.2); const y0 = e.y; e.y += e.vy;
                const s = e.vy > 0 ? landY(e.x, y0, e.y, -1) : null;
                if (s !== null) { e.y = s; e.on = true; e.vy = 0; }
                if (e.y > WATER) { e.dead = true; snd.splash(); }
              }
              if (e.pause > 0) { e.pause--; e.x -= e.vx; }
              if (e.x < g.cam - 30 || e.x > g.cam + W + 30) e.dead = true;
              break;
            }
            case 'sniper': {
              e.face = p.x < e.x ? -1 : 1;
              e.aim = aim8(e.x, e.y - 19, p.x, p.y - 16);
              if (onScreen && !p.dead && --e.fireT <= 0) {
                e.fireT = Math.max(50, 100 - g.loop * 20) + Math.random() * 40;
                const sp = 1.5 + g.loop * 0.3;
                g.eb.push({ x: e.x + e.aim[0] * 10, y: e.y - 19 + e.aim[1] * 10, vx: e.aim[0] * sp, vy: e.aim[1] * sp, gr: 0 }); snd.eshot();
              }
              if (e.x < g.cam - 30) e.dead = true;
              break;
            }
            case 'wsniper': {
              e.face = -1; e.aim = aim8(e.x, e.y - 19, p.x, p.y - 16);
              if (!p.dead && --e.fireT <= 0) {
                e.fireT = 80 - g.loop * 10;
                const sp = 1.6 + g.loop * 0.3;
                g.eb.push({ x: e.x + e.aim[0] * 10, y: e.y - 19 + e.aim[1] * 10, vx: e.aim[0] * sp, vy: e.aim[1] * sp, gr: 0 }); snd.eshot();
              }
              break;
            }
            case 'turret': {
              if (!onScreen) { if (e.x < g.cam - 30) e.dead = true; break; }
              const ta = Math.atan2(p.y - 16 - (e.y - 9), p.x - e.x);
              const step = Math.PI / 6;
              const tq = Math.round(ta / step) * step;
              if (e.t % 16 === 0) {
                let d = tq - e.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
                if (Math.abs(d) > 0.01) e.ang += Math.sign(d) * step;
              }
              if (--e.fireT <= 0 && !p.dead) {
                e.fireT = Math.max(40, 80 - g.loop * 15);
                const sp = 1.6 + g.loop * 0.3;
                g.eb.push({ x: e.x + Math.cos(e.ang) * 11, y: e.y - 9 + Math.sin(e.ang) * 11, vx: Math.cos(e.ang) * sp, vy: Math.sin(e.ang) * sp, gr: 0 }); snd.eshot();
              }
              break;
            }
            case 'pillbox':
              e.open = (e.t % 180) > 90;
              if (e.x < g.cam - 30) e.dead = true;
              break;
            case 'capsule':
              e.x += e.vx; e.y = e.by + Math.sin(e.t * 0.05) * 22;
              if (e.x > g.cam + W + 20) e.dead = true;
              break;
            case 'bcannon':
              if (--e.fireT <= 0 && !p.dead && !g.boss.dead) {
                e.fireT = Math.max(60, 120 - g.loop * 20) + Math.random() * 40;
                g.eb.push({ x: e.x - 10, y: e.y - 8, vx: -1.2 - Math.random() * 1.6, vy: -1.5 - Math.random(), gr: 0.05 }); snd.eshot();
              }
              break;
            case 'core': break;
          }
        }
        g.en = g.en.filter(e => !e.dead);
        // corpses
        for (const c of g.corpses) c.t--;
        g.corpses = g.corpses.filter(c => c.t > 0);
        // boss
        if (g.boss) updWallBoss();
        // enemy bullets
        const hb = pHit(p);
        for (const b of g.eb) {
          b.vy += b.gr; b.x += b.vx; b.y += b.vy;
          if (b.x < g.cam - 10 || b.x > g.cam + W + 10 || b.y < -20 || b.y > H) b.dead = true;
          else if (!p.dead && b.x > hb[0] && b.x < hb[0] + hb[2] && b.y > hb[1] && b.y < hb[1] + hb[3]) { b.dead = true; killP(); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        // contact
        if (!p.dead) {
          for (const e of g.en) {
            if (e.type !== 'runner' && e.type !== 'capsule') continue;
            if (e.type === 'capsule') continue;
            if (Math.abs(e.x - p.x) < 4 + (p.prone ? 10 : 4) && e.y - 26 < hb[1] + hb[3] && e.y > hb[1]) { killP(); break; }
          }
        }
        // items
        for (const it of g.items) {
          if (!it.on) {
            it.vy = Math.min(4, it.vy + 0.15); const y0 = it.y; it.y += it.vy; it.x += it.vx;
            const s = it.vy > 0 ? landY(it.x, y0, it.y, -1) : null;
            if (s !== null) { it.y = s; it.on = true; }
            if (it.y > WATER) { it.y = WATER; it.on = true; }
          }
          if (!p.dead && Math.abs(it.x - p.x) < 12 && it.y > hb[1] - 6 && it.y - 10 < hb[1] + hb[3]) {
            it.dead = true; snd.item(); addScore(1000);
            if (it.w === 'R') g.rapid = true; else g.weapon = it.w;
          }
          if (it.x < g.cam - 20) it.dead = true;
        }
        g.items = g.items.filter(i => !i.dead);
      }
      function startWallBoss() {
        const x = g.lv.end - 60;
        g.boss = { x, t: 0, dead: false, cannons: 2, wsT: 0 };
        E({ type: 'bcannon', x: x + 14, y: 128, w: 14, h: 12, hp: 14 + g.loop * 4, pts: 1000, boss: true, fireT: 60 });
        E({ type: 'bcannon', x: x + 40, y: 128, w: 14, h: 12, hp: 14 + g.loop * 4, pts: 1000, boss: true, fireT: 110 });
        E({ type: 'core', x: x + 22, y: 206, w: 20, h: 26, hp: 36 + g.loop * 10, pts: 10000, boss: true });
        au.melody([[196, 0.2], [0, 0.05], [196, 0.2], [233, 0.4]], { type: 'sawtooth', vol: 0.1 });
      }
      function updWallBoss() {
        const b = g.boss;
        b.t++;
        if (!b.dead) {
          const ws = g.en.find(e => e.type === 'wsniper');
          if (!ws && ++b.wsT > 180) { b.wsT = 0; E({ type: 'wsniper', x: b.x + 30, y: 76, boss: true, pts: 200, fireT: 60 }); }
        } else {
          if (b.t % 5 === 0 && b.t < 120) { boomAt(b.x + Math.random() * 60, 70 + Math.random() * 146, 10, true); if (b.t % 15 === 0) snd.boom(); }
          if (b.t === 130) { snd.clear(); }
          if (b.t > 130) { const p = g.p; if (!p.dead) { p.x += 1.2; p.face = 1; p.run++; } }
          if (b.t > 300) { startBase(); }
        }
      }

      // =============== BASE (3D corridor) ===============
      const VX = 112;
      const X3 = (u, z) => VX + u * (48 + 56 * z);
      const Y3 = z => 150 + 90 * z;
      const S3 = z => 0.4 + 0.6 * z;
      function startBase() {
        g.mode = 'base'; g.stage = 1;
        g.room = 0; g.rooms = 3 + Math.min(2, g.loop);
        g.parts = []; g.banner = 160;
        setupRoom();
        g.bp = { u: 0, jump: 0, prone: false, dead: false, deadT: 0, inv: 120, fireT: 0 };
      }
      function setupRoom() {
        g.pb = []; g.eb = []; g.sold = []; g.bitems = [];
        g.adv = 0; g.spawnT = 90;
        g.boss = g.room >= g.rooms;
        const T = [];
        if (!g.boss) {
          T.push({ k: 'core', u: 0, r: 0.13, hp: 10 + g.loop * 4 + g.room * 2, pts: 3000, y: 104 });
          const us = g.room % 2 === 0 ? [-0.6, 0.6] : [-0.6, -0.3, 0.3, 0.6];
          for (const u of us) T.push({ k: 'gun', u, r: 0.09, hp: 4, pts: 300, y: 130, fireT: 60 + Math.random() * 90 });
        } else {
          T.push({ k: 'eye', u: 0, r: 0.16, hp: 40 + g.loop * 10, pts: 20000, y: 104, open: false });
          for (const u of [-0.62, -0.32, 0.32, 0.62]) T.push({ k: 'orb', u, r: 0.09, hp: 8 + g.loop * 2, pts: 1000, y: 132, fireT: 60 + Math.random() * 120, ph: Math.random() * 6 });
        }
        g.tg = T;
      }
      function baseKillP() {
        const bp = g.bp; if (bp.dead || bp.inv > 0) return;
        bp.dead = true; bp.deadT = 100; snd.die();
      }
      function updBase() {
        if (g.banner > 0) g.banner--;
        const bp = g.bp;
        if (g.adv > 0) {
          g.adv--;
          if (g.adv === 0) {
            g.room++;
            if (g.room > g.rooms) { // boss beaten
              g.loop++; startJungle(); return;
            }
            setupRoom();
          }
          return;
        }
        if (bp.inv > 0) bp.inv--;
        if (bp.dead) {
          if (--bp.deadT <= 0) loseLife(() => { g.bp = { u: 0, jump: 0, prone: false, dead: false, deadT: 0, inv: 150, fireT: 0 }; g.eb = []; });
          return;
        }
        // controls
        bp.prone = api.key('ArrowDown') && bp.jump <= 0;
        if (!bp.prone) {
          if (api.key('ArrowLeft')) bp.u -= 0.022;
          if (api.key('ArrowRight')) bp.u += 0.022;
        }
        bp.u = clamp(bp.u, -0.92, 0.92);
        if (api.pressed('KeyX') && bp.jump <= 0 && !bp.prone) { bp.jump = 40; snd.jump(); }
        if (bp.jump > 0) bp.jump--;
        if (bp.fireT > 0) bp.fireT--;
        const auto = g.weapon === 'M' ? 6 : 14;
        if ((api.pressed('Space') || (api.key('Space') && bp.fireT <= 0))) {
          bp.fireT = auto;
          const w = g.weapon, sp = (g.rapid ? 1.4 : 1) * 0.028;
          const n = g.pb.length;
          if (w === 'S') { if (n < 10) { for (const d of [-0.012, -0.006, 0, 0.006, 0.012]) g.pb.push({ u: bp.u, z: 0.95, du: d, dz: sp, d: 1, k: 's' }); snd.spread(); } }
          else if (w === 'L') { g.pb = []; g.pb.push({ u: bp.u, z: 0.95, du: 0, dz: sp * 1.5, d: 3, k: 'l', hit: [] }); snd.laser(); }
          else if (w === 'F') { if (n < 2) { g.pb.push({ u: bp.u, z: 0.95, du: 0, dz: sp * 0.8, d: 2, k: 'f', ang: 0 }); snd.fire(); } }
          else if (n < (w === 'M' ? 6 : 4)) { g.pb.push({ u: bp.u, z: 0.95, du: 0, dz: sp, d: 1, k: 'n' }); snd.shot(); }
        }
        // bullets
        for (const b of g.pb) {
          b.z -= b.dz; b.u += b.du;
          if (b.k === 'f') b.ang += 0.3;
          const bu = b.k === 'f' ? b.u + Math.sin(b.ang) * 0.05 : b.u;
          for (const s of g.sold) {
            if (s.dead || (b.hit && b.hit.indexOf(s) >= 0)) continue;
            if (Math.abs(bu - s.u) < 0.08 && Math.abs(b.z - s.z) < 0.035) {
              s.hp -= b.d;
              if (s.hp <= 0) { s.dead = true; addScore(100); snd.kill(); g.parts.push({ x: X3(s.u, s.z), y: Y3(s.z) - 10, vx: 0, vy: -0.5, t: 18, c: '#ff8040' }); if (s.red) g.bitems.push({ u: s.u, z: s.z, w: WEAPONS[(Math.random() * WEAPONS.length) | 0] }); }
              if (b.k === 'l') b.hit.push(s); else { b.dead = true; break; }
            }
          }
          if (b.dead) continue;
          if (b.z <= 0) {
            b.dead = true;
            let hitT = null;
            for (const t of g.tg) if (t.hp > 0 && Math.abs(bu - t.u) < t.r && (!hitT || Math.abs(bu - t.u) < Math.abs(bu - hitT.u))) hitT = t;
            if (hitT) {
              if (hitT.k === 'eye' && (!hitT.open || g.tg.some(t => t.k === 'orb' && t.hp > 0 && false))) { snd.hit(); continue; }
              hitT.hp -= b.d; hitT.flash = 4;
              if (hitT.hp <= 0) {
                addScore(hitT.pts); snd.boom();
                for (let i = 0; i < 12; i++) g.parts.push({ x: X3(hitT.u, 0) + (Math.random() - 0.5) * 20, y: hitT.y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, t: 25, c: Math.random() < 0.5 ? '#fff060' : '#ff5010' });
                if (hitT.k === 'core' || hitT.k === 'eye') roomCleared();
              } else snd.hit();
            } else g.parts.push({ x: X3(bu, 0), y: 146, vx: 0, vy: -0.3, t: 6, c: '#fff' });
          }
          if (b.u < -1.1 || b.u > 1.1) b.dead = true;
        }
        g.pb = g.pb.filter(b => !b.dead);
        // targets fire
        for (const t of g.tg) {
          if (t.hp <= 0) continue;
          if (t.flash) t.flash--;
          if (t.k === 'gun' || t.k === 'orb') {
            if (--t.fireT <= 0) {
              t.fireT = Math.max(50, 110 - g.loop * 20 - g.room * 6) + Math.random() * 60;
              const dz = 0.011 + g.loop * 0.002;
              g.eb.push({ u: t.u, z: 0.02, du: (bp.u - t.u) * dz, dz, low: t.k === 'orb' ? Math.random() < 0.5 : false, k: t.k === 'orb' ? 'orb' : 'b' });
              snd.eshot();
            }
          } else if (t.k === 'eye') {
            t.ph = (t.ph || 0) + 1;
            const was = t.open;
            t.open = (t.ph % 220) > 110;
            if (t.open && !was) {
              const dz = 0.012 + g.loop * 0.002;
              for (const o of [-0.4, 0, 0.4]) g.eb.push({ u: 0, z: 0.02, du: (bp.u + o) * dz, dz, low: false, k: 'fire' });
              au.tone(150, 0.3, { type: 'sawtooth', vol: 0.1, slideTo: 60 });
            }
          }
        }
        // soldiers
        if (!g.boss && --g.spawnT <= 0 && g.sold.length < 3 + g.loop) {
          g.spawnT = Math.max(40, 100 - g.loop * 15) + Math.random() * 50;
          const side = Math.random() < 0.5 ? -1 : 1;
          g.sold.push({ u: side * 0.95, z: 0.04, tu: (Math.random() * 1.4 - 0.7), st: 'walk', t: 0, hp: 1, red: Math.random() < 0.12, act: Math.random() < 0.5 ? 'shoot' : Math.random() < 0.5 ? 'grenade' : 'charge', side });
        }
        for (const s of g.sold) {
          if (s.dead) continue;
          s.t++;
          if (s.st === 'walk') { s.u += clamp(s.tu - s.u, -0.012, 0.012); if (Math.abs(s.tu - s.u) < 0.01) { s.st = s.act; s.t = 0; } }
          else if (s.st === 'shoot') {
            if (s.t === 30) { const dz = 0.012 + g.loop * 0.002; g.eb.push({ u: s.u, z: s.z, du: (bp.u - s.u) * dz / (1 - s.z), dz, low: false, k: 'b' }); snd.eshot(); }
            if (s.t > 60) { s.st = 'walk'; s.tu = s.side * 1.05; s.act = 'leave'; }
          } else if (s.st === 'grenade') {
            if (s.t === 30) { const dz = 0.01 + g.loop * 0.002; g.eb.push({ u: s.u, z: s.z, du: (bp.u - s.u) * dz / (1 - s.z), dz, low: true, k: 'g' }); }
            if (s.t > 60) { s.st = 'walk'; s.tu = s.side * 1.05; s.act = 'leave'; }
          } else if (s.st === 'charge') {
            s.z += 0.009 + g.loop * 0.002; s.u += clamp(bp.u - s.u, -0.004, 0.004);
            if (s.z >= 0.96 && Math.abs(s.u - bp.u) < 0.1 && bp.jump <= 0) baseKillP();
            if (s.z > 1.1) s.dead = true;
          } else if (s.st === 'leave') s.dead = true;
        }
        g.sold = g.sold.filter(s => !s.dead);
        // enemy bullets
        for (const b of g.eb) {
          b.z += b.dz; b.u += b.du;
          if (b.z >= 0.96 && !b.passed) {
            b.passed = true;
            if (Math.abs(b.u - bp.u) < 0.09) {
              const dodged = b.low ? bp.jump > 6 : bp.prone;
              if (!dodged) { baseKillP(); b.dead = true; }
            }
          }
          if (b.z > 1.15) b.dead = true;
        }
        g.eb = g.eb.filter(b => !b.dead);
        // items
        for (const it of g.bitems) {
          it.z += 0.008;
          if (it.z >= 0.95 && Math.abs(it.u - bp.u) < 0.15) { it.dead = true; snd.item(); addScore(1000); if (it.w === 'R') g.rapid = true; else g.weapon = it.w; }
          if (it.z > 1.1) it.dead = true;
        }
        g.bitems = g.bitems.filter(i => !i.dead);
      }
      function roomCleared() {
        g.eb = []; g.sold = []; g.pb = [];
        if (g.boss) { g.adv = 300; g.room = g.rooms; snd.clear(); }
        else { g.adv = 110; au.melody([[523, 0.08], [784, 0.08], [1047, 0.16]], { type: 'square', vol: 0.1 }); }
      }

      // =============== update ===============
      function update() {
        frame++; mt++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (mode === 'over') {
          if (--overT <= 0 || (overT < 200 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; }
          return;
        }
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        if (g.wait) return;
        if (g.mode === 'jungle') updJungle(); else updBase();
      }

      // =============== drawing ===============
      // side-view commando. y = feet. pal: {skin, pants, band, shirt}
      function drawMan(ctx, x, y, face, pose, aim, t, pal, flash) {
        x = Math.round(x); y = Math.round(y);
        const R = (ox, oy, w, h, c) => { ctx.fillStyle = flash ? '#fff' : c; ctx.fillRect(face > 0 ? x + ox : x - ox - w, y + oy, w, h); };
        if (pose === 'ball') {
          const a = t * 0.5;
          ctx.fillStyle = pal.pants; ctx.fillRect(x - 5, y - 19, 10, 10);
          for (let k = 0; k < 4; k++) {
            const ca = Math.cos(a + k * 1.57), sa = Math.sin(a + k * 1.57);
            ctx.fillStyle = k & 1 ? pal.skin : pal.pants; ctx.fillRect(Math.round(x + ca * 6 - 2), Math.round(y - 14 + sa * 6 - 2), 4, 4);
          }
          return;
        }
        if (pose === 'prone') {
          R(-12, -5, 10, 4, pal.pants); R(-2, -6, 10, 5, pal.skin); R(8, -8, 5, 5, pal.skin); R(8, -9, 5, 2, pal.band);
          R(10, -4, 10, 2, '#888'); return;
        }
        if (pose === 'swim') {
          ctx.fillStyle = '#2050c0'; ctx.fillRect(x - 7, y - 3, 14, 3);
          R(-2, -9, 5, 6, pal.skin); R(-2, -9, 5, 2, pal.band);
          if (aim[1] < 0) R(1, -16, 2, 8, '#888'); else R(3, -7, 8, 2, '#888');
          return;
        }
        if (pose === 'dead') {
          R(-10, -6, 20, 5, pal.pants); R(4, -8, 6, 6, pal.skin); return;
        }
        // legs
        const ph = pose === 'run' ? (t >> 3) & 3 : 0;
        const legs = [[0, 0], [3, -2], [0, 0], [-3, -2]][ph];
        R(-3 + legs[0], -12, 3, 12 + legs[1], pal.pants); R(1 - legs[0], -12, 3, 12, pal.pants);
        R(-3, -14, 7, 3, pal.pants);
        // torso + head
        R(-3, -24, 7, 10, pal.shirt); R(-2, -30, 5, 6, pal.skin); R(-2, -30, 5, 2, pal.band);
        if (pal.tail) R(-4, -29, 2, 2, pal.band);
        // arms + gun
        const ax = aim[0] * face, ay = aim[1];
        if (ay < -0.9) { R(0, -36, 2, 12, '#999'); R(-1, -26, 3, 3, pal.skin); }
        else if (ay < 0) { for (let i = 0; i < 6; i++) R(2 + i, -24 - i, 2, 2, '#999'); R(1, -23, 3, 3, pal.skin); }
        else if (ay > 0) { for (let i = 0; i < 6; i++) R(2 + i, -18 + i, 2, 2, '#999'); R(1, -20, 3, 3, pal.skin); }
        else { R(2, -20, 10, 2, '#999'); R(1, -21, 4, 3, pal.skin); }
        void ax;
      }
      const P1 = { skin: '#f0b080', pants: '#2050e0', band: '#ff2020', shirt: '#f0b080', tail: true };
      const ENEMY = { skin: '#d09060', pants: '#707070', band: '#505050', shirt: '#909090' };
      const SNIPER = { skin: '#d09060', pants: '#a03030', band: '#702020', shirt: '#c05050' };

      function drawFalcon(ctx, x, y, w) {
        x = Math.round(x); y = Math.round(y);
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(x - 9, y - 10, 4, 3); ctx.fillRect(x + 5, y - 10, 4, 3); ctx.fillRect(x - 7, y - 8, 14, 3);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 4, y - 9, 8, 9);
        text(ctx, w, x - 2, y - 8, '#c00000');
      }
      function drawJungle(ctx) {
        const cam = Math.round(g.cam);
        // sky
        ctx.fillStyle = '#081028'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        for (const s of bgStars) { const x = ((s.x - cam * 0.1) % 600 + 600) % 600; if (x < W) ctx.fillRect(x | 0, s.y | 0, 1, 1); }
        // far mountains
        ctx.fillStyle = '#18284a';
        for (let x = 0; x < W; x += 4) { const wx = x + cam * 0.25; const h = 30 + 18 * Math.sin(wx * 0.02) + 10 * Math.sin(wx * 0.053); ctx.fillRect(x, 150 - h, 4, h + 80); }
        // jungle backdrop (palm trees)
        for (let k = -1; k < 6; k++) {
          const base = Math.floor(cam * 0.5 / 48) * 48 + k * 48;
          const x = Math.round(base - cam * 0.5);
          ctx.fillStyle = '#4a3010'; ctx.fillRect(x + 20, 90, 4, 140);
          ctx.fillStyle = '#106020';
          ctx.fillRect(x + 6, 84, 32, 6); ctx.fillRect(x + 2, 88, 10, 4); ctx.fillRect(x + 32, 88, 10, 4); ctx.fillRect(x + 14, 80, 16, 4);
          ctx.fillStyle = '#0a4018'; ctx.fillRect(x - 4, 100, 52, 20);
        }
        ctx.fillStyle = '#0a3014'; ctx.fillRect(0, 118, W, 100);
        // water
        ctx.fillStyle = '#1040b0'; ctx.fillRect(0, WATER - 6, W, H - WATER + 6);
        ctx.fillStyle = '#80b0ff';
        for (let x = -(cam + frame) % 16; x < W; x += 16) ctx.fillRect(x, WATER - 6 + ((frame >> 4) & 1), 6, 1);
        // columns
        const c0 = Math.floor(cam / TILE), c1 = c0 + Math.ceil(W / TILE) + 1;
        for (let i = c0; i <= c1; i++) {
          const c = g.lv.cols[i]; if (!c) continue;
          const x = i * TILE - cam;
          if (c.g === 1) {
            ctx.fillStyle = '#806040'; ctx.fillRect(x, GROUND, TILE, H - GROUND);
            ctx.fillStyle = '#5a4028'; ctx.fillRect(x + ((i * 5) % 11), GROUND + 12, 4, 3); ctx.fillRect(x + ((i * 7) % 9), GROUND + 26, 5, 3);
            ctx.fillStyle = '#30c030'; ctx.fillRect(x, GROUND, TILE, 4);
            ctx.fillStyle = '#108010'; ctx.fillRect(x, GROUND + 4, TILE, 3);
          } else if (c.g === 2) {
            const b = g.bridges[i];
            if (!(b !== undefined && b <= 0)) {
              ctx.fillStyle = '#a0a0b0'; ctx.fillRect(x, GROUND, TILE, 3);
              ctx.fillStyle = '#606070'; ctx.fillRect(x, GROUND + 3, TILE, 5);
              ctx.fillStyle = '#d04020'; ctx.fillRect(x + 2, GROUND + 4, 3, 3); ctx.fillRect(x + 10, GROUND + 4, 3, 3);
              ctx.fillStyle = '#c0c0d0'; ctx.fillRect(x, GROUND - 6, 1, 6); ctx.fillRect(x, GROUND - 6, TILE, 1);
              if (b !== undefined && b < 20 && (frame & 2)) { ctx.fillStyle = '#ff4020'; ctx.fillRect(x + 6, GROUND - 3, 4, 3); }
            }
          }
          for (let t = 0; t < 3; t++) {
            if (!c.t[t]) continue;
            const y = TIERS[t];
            ctx.fillStyle = '#30c030'; ctx.fillRect(x, y, TILE, 3);
            ctx.fillStyle = '#108010'; ctx.fillRect(x, y + 3, TILE, 5);
            ctx.fillStyle = '#806040'; ctx.fillRect(x, y + 8, TILE, 6);
            ctx.fillStyle = '#5a4028'; ctx.fillRect(x + (i * 3) % 10, y + 10, 4, 2);
          }
        }
        // boss wall
        if (g.boss) {
          const b = g.boss, bx = Math.round(b.x - cam);
          if (!(b.dead && b.t > 120)) {
            ctx.fillStyle = '#505868'; ctx.fillRect(bx, 70, 80, GROUND - 70);
            ctx.fillStyle = '#707888'; for (let y = 74; y < GROUND; y += 12) ctx.fillRect(bx, y, 80, 2);
            ctx.fillStyle = '#383e4a'; for (let x = bx + 6; x < bx + 80; x += 16) ctx.fillRect(x, 70, 2, GROUND - 70);
            ctx.fillStyle = '#c0a040'; ctx.fillRect(bx, 70, 80, 4);
            ctx.fillStyle = '#202028'; ctx.fillRect(bx + 8, 176, 30, GROUND - 176);
          } else {
            ctx.fillStyle = '#303438'; ctx.fillRect(bx, 190, 80, GROUND - 190);
          }
        }
      }
      function drawJungleEnemies(ctx) {
        const cam = g.cam;
        for (const c of g.corpses) drawMan(ctx, c.x - cam, c.y, c.face, (c.t >> 2) & 1 ? 'dead' : 'stand', [c.face, 0], 0, ENEMY);
        for (const e of g.en) {
          const x = Math.round(e.x - cam), y = Math.round(e.y), fl = e.flash && (frame & 1);
          switch (e.type) {
            case 'runner': drawMan(ctx, x, y, e.face, e.on ? 'run' : 'stand', [e.face, 0], e.t, ENEMY, fl); break;
            case 'sniper': case 'wsniper': drawMan(ctx, x, y, e.face, 'stand', e.aim || [-1, 0], 0, SNIPER, fl); break;
            case 'turret': {
              ctx.fillStyle = '#504838'; ctx.fillRect(x - 10, y - 18, 20, 18);
              ctx.fillStyle = fl ? '#fff' : '#a09080'; ctx.fillRect(x - 8, y - 16, 16, 14);
              ctx.fillStyle = '#ff3020'; ctx.fillRect(x - 3, y - 12, 6, 6);
              ctx.fillStyle = '#d0d0d0';
              for (let i = 4; i < 13; i += 2) ctx.fillRect(Math.round(x + Math.cos(e.ang) * i) - 1, Math.round(y - 9 + Math.sin(e.ang) * i) - 1, 3, 3);
              break;
            }
            case 'pillbox': {
              ctx.fillStyle = '#606878'; ctx.fillRect(x - 10, y - 16, 20, 16);
              ctx.fillStyle = '#8890a0'; ctx.fillRect(x - 10, y - 16, 20, 2);
              if (e.open) { ctx.fillStyle = fl ? '#fff' : (frame & 4 ? '#ff2020' : '#ffd040'); ctx.fillRect(x - 6, y - 12, 12, 8); ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 10, 4, 4); }
              else { ctx.fillStyle = '#404858'; ctx.fillRect(x - 6, y - 12, 12, 8); ctx.fillStyle = '#707888'; ctx.fillRect(x - 6, y - 9, 12, 1); }
              break;
            }
            case 'capsule': {
              ctx.fillStyle = fl ? '#fff' : '#c0c0c8'; ctx.fillRect(x - 7, y - 8, 14, 7);
              ctx.fillStyle = '#ff3020'; ctx.fillRect(x - 3, y - 7, 6, 5);
              ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 10 + ((e.t >> 2) & 1) * 2, y - 6, 3, 2); ctx.fillRect(x + 7, y - 6, 3, 2);
              break;
            }
            case 'bcannon': {
              ctx.fillStyle = fl ? '#fff' : '#a07040'; ctx.fillRect(x - 7, y - 12, 14, 12);
              ctx.fillStyle = '#303030'; ctx.fillRect(x - 15, y - 9, 10, 4);
              ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, y - 9, 4, 4);
              break;
            }
            case 'core': {
              const c = fl ? '#fff' : (frame >> 3) & 1 ? '#ff2020' : '#ff8080';
              ctx.fillStyle = '#202028'; ctx.fillRect(x - 12, y - 28, 24, 28);
              ctx.fillStyle = c; ctx.fillRect(x - 9, y - 25, 18, 22);
              ctx.fillStyle = '#ffe0e0'; ctx.fillRect(x - 5, y - 21, 6, 6);
              break;
            }
          }
        }
      }
      function drawPlayerSide(ctx) {
        const p = g.p, x = p.x - g.cam;
        if (p.inv > 0 && !p.dead && (frame & 2)) return;
        let pose = 'stand';
        if (p.dead) pose = p.on ? 'dead' : 'ball';
        else if (p.ball) pose = 'ball';
        else if (p.prone) pose = 'prone';
        else if (p.swim) pose = 'swim';
        else if (!p.on) pose = 'stand';
        else if (p.run) pose = 'run';
        drawMan(ctx, x, p.y, p.face, pose, p.aim, p.dead ? frame : (pose === 'ball' ? frame : p.run), P1);
      }
      function drawBullets(ctx, ox) {
        for (const b of g.pb) {
          const x = Math.round(b.x - ox), y = Math.round(b.y);
          if (b.k === 'l') {
            ctx.strokeStyle = '#60ffff'; ctx.lineWidth = 2; ctx.beginPath();
            const l = Math.hypot(b.vx, b.vy) || 1;
            ctx.moveTo(x, y); ctx.lineTo(x - b.vx / l * b.len, y - b.vy / l * b.len); ctx.stroke();
          } else if (b.k === 'f') { ctx.fillStyle = frame & 2 ? '#ff6020' : '#ffd040'; ctx.fillRect(x - 3, y - 3, 6, 6); }
          else if (b.k === 's') { ctx.fillStyle = '#ff4060'; ctx.fillRect(x - b.r, y - b.r, b.r * 2 + 1, b.r * 2 + 1); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1, 1); }
          else { ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        }
        for (const b of g.eb) { ctx.fillStyle = (frame >> 1) & 1 ? '#ff8080' : '#ffffff'; ctx.fillRect(Math.round(b.x - ox) - 1, Math.round(b.y) - 1, 3, 3); }
      }
      function drawParts(ctx, ox) {
        for (const q of g.parts) { ctx.fillStyle = q.c; const s = q.t > 10 ? 3 : 2; ctx.fillRect(Math.round(q.x - ox), Math.round(q.y), s, s); }
      }
      function drawHUD(ctx) {
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) {
          const x = 6 + i * 9;
          ctx.fillStyle = '#3070ff'; ctx.fillRect(x, 4, 6, 4);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 1, 8, 4, 6); ctx.fillStyle = '#c08000'; ctx.fillRect(x + 2, 10, 2, 2);
        }
        text(ctx, '1P', 76, 4, '#ff4040');
        text(ctx, String(g.score).padStart(7, '0'), 92, 4, '#fff');
        text(ctx, 'HI ' + String(hi).padStart(7, '0'), W - 4, 4, '#ffd040', 1, 'right');
        if (g.weapon !== 'N' || g.rapid) { text(ctx, (g.weapon === 'N' ? '' : g.weapon) + (g.rapid ? 'R' : ''), 6, 18, WCOL[g.weapon] || '#ffd040'); }
      }
      function renderJungle(ctx) {
        drawJungle(ctx);
        drawJungleEnemies(ctx);
        for (const it of g.items) drawFalcon(ctx, it.x - g.cam, it.y, it.w);
        drawPlayerSide(ctx);
        drawBullets(ctx, g.cam);
        drawParts(ctx, g.cam);
        drawHUD(ctx);
        if (g.banner > 0) { text(ctx, 'STAGE ' + (1 + g.loop * 2), W / 2, 90, '#fff', 2, 'center'); text(ctx, 'JUNGLE', W / 2, 112, '#ffd040', 1, 'center'); }
        if (g.boss && g.boss.dead && g.boss.t > 130) text(ctx, 'STAGE CLEAR', W / 2, 96, '#fff', 2, 'center');
      }

      function quad(ctx, pts, c) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath(); ctx.fill();
      }
      function renderBase(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const zoom = g.adv > 0 && !(g.boss && g.room >= g.rooms) ? 1 - g.adv / 110 : 0;
        // corridor geometry
        const bx0 = X3(-1, zoom * 0.6), bx1 = X3(1, zoom * 0.6), by1 = Y3(zoom * 0.6), bTop = 72 - zoom * 50;
        quad(ctx, [0, 0, W, 0, bx1, bTop, bx0, bTop], '#101830');
        quad(ctx, [0, 0, bx0, bTop, bx0, by1, 0, H], '#18306a');
        quad(ctx, [W, 0, bx1, bTop, bx1, by1, W, H], '#18306a');
        quad(ctx, [bx0, by1, bx1, by1, W, H, 0, H], '#4a4a52');
        // floor lines
        ctx.strokeStyle = '#6a6a74'; ctx.lineWidth = 1;
        for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(X3(k / 4, 0), 150); ctx.lineTo(X3(k / 4, 1.2), Y3(1.2)); ctx.stroke(); }
        const off = (g.adv > 0 ? (frame * 0.03) % 0.2 : 0);
        for (let z = off; z < 1.1; z += 0.2) { const y = Y3(z); ctx.beginPath(); ctx.moveTo(X3(-1, z), y); ctx.lineTo(X3(1, z), y); ctx.stroke(); }
        // wall stripes
        ctx.strokeStyle = '#2a4a9a';
        for (let z = off; z < 1.1; z += 0.2) {
          const x0 = X3(-1, z), x1 = X3(1, z), y = Y3(z), top = 72 - z * 72;
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0, Math.max(0, top)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1, Math.max(0, top)); ctx.stroke();
        }
        // back wall
        if (zoom < 0.95) {
          ctx.fillStyle = '#283860'; ctx.fillRect(bx0, bTop, bx1 - bx0, by1 - bTop);
          ctx.fillStyle = '#3a4a78';
          for (let y = bTop + 6; y < by1; y += 10) ctx.fillRect(bx0, y, bx1 - bx0, 1);
          if (g.adv <= 0 || g.boss) {
            for (const t of g.tg) {
              const x = Math.round(X3(t.u, 0)), y = t.y;
              if (t.hp <= 0) { ctx.fillStyle = '#181818'; ctx.fillRect(x - 8, y - 8, 16, 16); continue; }
              const fl = t.flash && (frame & 1);
              if (t.k === 'core') {
                ctx.fillStyle = '#101010'; ctx.fillRect(x - 12, y - 14, 24, 28);
                ctx.fillStyle = fl ? '#fff' : (frame >> 3) & 1 ? '#20ff40' : '#ff3030'; ctx.fillRect(x - 9, y - 11, 18, 22);
                ctx.fillStyle = '#fff'; ctx.fillRect(x - 5, y - 7, 5, 5);
              } else if (t.k === 'gun') {
                ctx.fillStyle = '#606068'; ctx.fillRect(x - 7, y - 7, 14, 14);
                ctx.fillStyle = fl ? '#fff' : '#ff8020'; ctx.fillRect(x - 4, y - 4, 8, 8);
                ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, 4, 4);
              } else if (t.k === 'eye') {
                ctx.fillStyle = '#602020'; ctx.fillRect(x - 22, y - 18, 44, 36);
                ctx.fillStyle = '#a03030'; ctx.fillRect(x - 18, y - 14, 36, 28);
                if (t.open) {
                  ctx.fillStyle = fl ? '#ff0' : '#fff'; ctx.fillRect(x - 14, y - 9, 28, 18);
                  ctx.fillStyle = '#20a040'; ctx.fillRect(x - 6, y - 7, 12, 14); ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 4, 6, 8);
                } else { ctx.fillStyle = '#c04040'; ctx.fillRect(x - 14, y - 1, 28, 2); }
              } else if (t.k === 'orb') {
                const a = frame * 0.08 + t.ph;
                ctx.fillStyle = '#404048'; ctx.fillRect(x - 8, y - 8, 16, 16);
                ctx.fillStyle = fl ? '#fff' : '#c040ff'; ctx.fillRect(x - 5 + Math.round(Math.cos(a) * 2), y - 5 + Math.round(Math.sin(a) * 2), 10, 10);
              }
            }
            // electric barrier
            const core = g.tg.find(t => t.k === 'core' || t.k === 'eye');
            if (core && core.hp > 0 && !g.boss) {
              ctx.strokeStyle = (frame >> 1) & 1 ? '#80ffff' : '#ffffff'; ctx.lineWidth = 1;
              for (let k = 0; k < 3; k++) {
                const y = Y3(0.12) - 6 - k * 10;
                ctx.beginPath(); ctx.moveTo(X3(-1, 0.12), y);
                for (let xx = X3(-1, 0.12); xx < X3(1, 0.12); xx += 8) ctx.lineTo(xx, y + (Math.random() * 4 - 2));
                ctx.stroke();
              }
            }
          }
        }
        // soldiers
        const sorted = g.sold.slice().sort((a, b) => a.z - b.z);
        for (const s of sorted) {
          const x = X3(s.u, s.z), y = Y3(s.z), k = S3(s.z);
          ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(k, k);
          drawMan(ctx, 0, 0, s.u < 0 ? 1 : -1, s.st === 'walk' || s.st === 'charge' ? 'run' : 'stand', [s.u < 0 ? 1 : -1, 0], s.t, s.red ? SNIPER : ENEMY);
          ctx.restore();
        }
        for (const it of g.bitems) { const k = S3(it.z); ctx.save(); ctx.translate(X3(it.u, it.z), Y3(it.z)); ctx.scale(k, k); drawFalcon(ctx, 0, 0, it.w); ctx.restore(); }
        // bullets
        for (const b of g.pb) {
          const bu = b.k === 'f' ? b.u + Math.sin(b.ang) * 0.05 : b.u;
          const x = X3(bu, b.z), y = Y3(b.z) - 26 * S3(b.z), s = Math.max(1, Math.round(3 * S3(b.z)));
          ctx.fillStyle = b.k === 'l' ? '#60ffff' : b.k === 's' ? '#ff4060' : b.k === 'f' ? '#ff8020' : '#fff';
          ctx.fillRect(Math.round(x) - (s >> 1), Math.round(y) - (s >> 1), s, b.k === 'l' ? s * 3 : s);
        }
        for (const b of g.eb) {
          const x = X3(b.u, b.z), y = Y3(b.z) - (b.low ? 2 : 20) * S3(b.z), s = Math.max(2, Math.round(5 * S3(b.z)));
          ctx.fillStyle = b.k === 'g' ? '#80ff40' : b.k === 'orb' ? '#e060ff' : b.k === 'fire' ? (frame & 2 ? '#ff4020' : '#ffd040') : (frame & 2 ? '#ff8080' : '#fff');
          ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
        }
        // player from behind
        const bp = g.bp;
        if (!(bp.inv > 0 && (frame & 2)) || bp.dead) {
          const x = Math.round(X3(bp.u, 1)), jy = bp.jump > 0 ? Math.round(Math.sin((40 - bp.jump) / 40 * Math.PI) * 30) : 0, y = 244 - jy;
          if (bp.dead) { ctx.fillStyle = '#2050e0'; ctx.fillRect(x - 12, y - 6, 24, 6); ctx.fillStyle = '#f0b080'; ctx.fillRect(x - 4, y - 10, 8, 5); }
          else if (bp.prone) {
            ctx.fillStyle = '#2050e0'; ctx.fillRect(x - 8, y - 6, 16, 6); ctx.fillStyle = '#f0b080'; ctx.fillRect(x - 6, y - 12, 12, 6);
            ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 6, y - 13, 12, 2); ctx.fillStyle = '#999'; ctx.fillRect(x - 1, y - 18, 3, 6);
          } else if (bp.jump > 0) {
            ctx.fillStyle = '#2050e0'; ctx.fillRect(x - 7, y - 26, 14, 14); ctx.fillStyle = '#f0b080'; ctx.fillRect(x - 4 + ((frame >> 2) & 1) * 4, y - 26, 4, 4);
          } else {
            const ph = (api.key('ArrowLeft') || api.key('ArrowRight')) ? (frame >> 3) & 1 : 0;
            ctx.fillStyle = '#2050e0'; ctx.fillRect(x - 6, y - 16 + ph, 5, 16 - ph); ctx.fillRect(x + 1, y - 16 + (1 - ph), 5, 16 - (1 - ph));
            ctx.fillStyle = '#f0b080'; ctx.fillRect(x - 7, y - 30, 14, 14);
            ctx.fillStyle = '#202020'; ctx.fillRect(x - 3, y - 36, 7, 6);
            ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 3, y - 34, 7, 2); ctx.fillRect(x + 4, y - 33, 4, 2);
            ctx.fillStyle = '#999'; ctx.fillRect(x + 4, y - 42, 3, 14);
          }
        }
        drawParts(ctx, 0);
        drawHUD(ctx);
        if (g.banner > 0) { text(ctx, 'STAGE ' + (2 + g.loop * 2), W / 2, 30, '#fff', 2, 'center'); text(ctx, 'BASE', W / 2, 50, '#ffd040', 1, 'center'); }
        if (!g.boss && g.adv <= 0) text(ctx, 'ROOM ' + (g.room + 1) + '/' + g.rooms, W - 4, 18, '#80c0ff', 1, 'right');
        if (g.boss && g.adv <= 0 && g.room < g.rooms + 1 && g.tg[0].hp > 0 && g.banner <= 0 && mt % 60 < 40 && g.tg[0].hp === 40 + g.loop * 10) text(ctx, 'DESTROY THE EYE', W / 2, 30, '#ff6040', 1, 'center');
        if (g.adv > 0 && g.boss) text(ctx, 'BASE DESTROYED', W / 2, 100, '#fff', 1, 'center');
      }

      function renderTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const page = Math.floor(mt / 420) % 2;
        if (page === 0) {
          text(ctx, 'CONTRA', W / 2 + 2, 42, '#600000', 4, 'center');
          text(ctx, 'CONTRA', W / 2, 40, '#ff3a1a', 4, 'center');
          ctx.fillStyle = '#ffd040'; ctx.fillRect(24, 74, W - 48, 2);
          drawMan(ctx, 80, 150, 1, 'stand', [0.7071, -0.7071], 0, P1);
          drawMan(ctx, 144, 150, -1, 'stand', [-0.7071, -0.7071], 0, { skin: '#f0b080', pants: '#e03030', band: '#2050e0', shirt: '#f0b080' });
          ctx.fillStyle = '#806040'; ctx.fillRect(40, 150, 144, 6); ctx.fillStyle = '#30c030'; ctx.fillRect(40, 150, 144, 2);
          text(ctx, 'BILL       LANCE', W / 2, 160, '#aaa', 1, 'center');
          text(ctx, 'HI SCORE ' + hi, W / 2, 180, '#fff', 1, 'center');
        } else {
          text(ctx, 'WEAPONS', W / 2, 34, '#ffd040', 2, 'center');
          const info = [['M', 'MACHINE GUN'], ['F', 'FIRE BALL'], ['S', 'SPREAD GUN'], ['L', 'LASER'], ['R', 'RAPID BULLETS']];
          info.forEach((r, i) => { drawFalcon(ctx, 54, 74 + i * 20, r[0]); text(ctx, r[1], 72, 66 + i * 20, WCOL[r[0]]); });
          text(ctx, 'SHOOT THE FLYING CAPSULES', W / 2, 176, '#aaa', 1, 'center');
          text(ctx, 'AND PILLBOX SENSORS', W / 2, 188, '#aaa', 1, 'center');
        }
        const blink = (mt >> 4) & 1;
        if (coinFlash > 0 ? (coinFlash >> 2) & 1 : api.credits === 0 && blink) text(ctx, 'INSERT COIN', W / 2, 206, '#fff', 1, 'center');
        else if (api.credits > 0 && blink) text(ctx, 'PUSH START', W / 2, 206, '#fff', 1, 'center');
        text(ctx, '\u00a9 1987 KONAMI', W / 2, 226, '#ff5050', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#aaa');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        if (g.mode === 'jungle') renderJungle(ctx); else renderBase(ctx);
        if (mode === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 110, 100, 26);
          text(ctx, 'GAME OVER', W / 2, 119, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
