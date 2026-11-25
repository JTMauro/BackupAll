// Marble Madness (Atari Games, 1984) - from-scratch recreation: six isometric races against the clock.
(function () {
  'use strict';
  // ---------- 5x7 bitmap font ----------
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

  const W = 256, H = 240;
  // ---------- courses ----------
  // ops: ['r', x0,y0,x1,y1, h] flat block, ['y', x0,y0,x1,y1, hNorth,hSouth] ramp along +y, ['x', x0,y0,x1,y1, hWest,hEast] ramp along +x
  // ['g', x0,y0,x1,y1] goal area, ['b', x0,y0,x1,y1] bumpy (wave) floor
  const COURSES = [
    {
      name: 'PRACTICE', time: 45, w: 20, l: 33, start: [5.5, 2], pal: ['#3060d0', '#5888f0', '#1c3c90', '#102460'],
      ops: [['r', 3, 0, 8, 5, 44], ['y', 3, 5, 8, 11, 44, 32], ['r', 3, 11, 12, 14, 32], ['x', 12, 11, 16, 14, 32, 24], ['r', 16, 11, 19, 15, 24],
        ['y', 16, 15, 19, 21, 24, 14], ['r', 10, 21, 19, 24, 14], ['r', 10, 24, 16, 29, 6], ['y', 10, 29, 16, 31, 6, 4], ['r', 10, 31, 16, 33, 4], ['g', 10, 31, 16, 33]],
      foes: []
    },
    {
      name: 'BEGINNER', time: 40, w: 24, l: 57, start: [5, 2], pal: ['#30a050', '#58c878', '#1c6430', '#0c3418'],
      ops: [['r', 2, 0, 8, 4, 60], ['y', 2, 4, 8, 12, 60, 44], ['r', 2, 12, 14, 15, 44], ['x', 14, 12, 20, 15, 44, 34], ['r', 18, 15, 22, 20, 34], ['r', 20, 12, 22, 15, 34],
        ['y', 18, 20, 22, 26, 34, 26], ['r', 10, 26, 22, 29, 26], ['r', 6, 26, 10, 28, 26], ['y', 6, 28, 8, 36, 26, 14], ['r', 4, 36, 14, 40, 14],
        ['y', 4, 40, 14, 44, 14, 8], ['r', 7, 44, 11, 48, 8], ['y', 7, 48, 11, 52, 8, 2], ['r', 6, 52, 12, 57, 2], ['g', 6, 54, 12, 57]],
      foes: [{ t: 'steelie', x: 16, y: 27.5 }, { t: 'steelie', x: 12, y: 38 }, { t: 'acid', x: 9, y: 46 }]
    },
    {
      name: 'INTERMEDIATE', time: 35, w: 24, l: 64, start: [11.5, 2], pal: ['#c08030', '#e8a858', '#7a4a14', '#40240a'],
      ops: [['r', 9, 0, 14, 4, 70], ['y', 9, 4, 14, 10, 70, 58], ['r', 4, 10, 20, 13, 58], ['y', 4, 13, 6, 22, 58, 44], ['y', 16, 13, 20, 22, 58, 48],
        ['r', 4, 22, 20, 25, 44], ['r', 16, 22, 20, 23, 48], ['y', 8, 25, 16, 33, 44, 34], ['r', 8, 33, 16, 36, 34], ['r', 11, 36, 13, 44, 34], ['b', 11, 37, 13, 43],
        ['r', 8, 44, 16, 47, 34], ['y', 8, 47, 16, 53, 34, 24], ['r', 6, 53, 18, 56, 24], ['y', 10, 56, 14, 60, 24, 18], ['r', 10, 60, 14, 64, 18], ['g', 10, 61, 14, 64]],
      foes: [{ t: 'muncher', x: 6, y: 23.5, x2: 18, y2: 23.5 }, { t: 'acid', x: 12, y: 34.5 }, { t: 'muncher', x: 7, y: 54.5, x2: 17, y2: 54.5 }, { t: 'steelie', x: 14, y: 45.5 }]
    },
    {
      name: 'AERIAL', time: 30, w: 24, l: 60, start: [4, 2], pal: ['#a040c0', '#c870e0', '#602078', '#300c40'],
      ops: [['r', 2, 0, 6, 4, 70], ['r', 6, 1, 18, 3, 70], ['y', 16, 3, 18, 12, 70, 58], ['r', 14, 12, 20, 15, 58], ['x', 6, 12, 14, 14, 50, 58], ['r', 3, 12, 6, 16, 50],
        ['y', 3, 16, 5, 26, 50, 38], ['r', 3, 26, 12, 28, 38], ['r', 11, 26, 15, 31, 38], ['r', 11, 31, 15, 36, 30], ['y', 11, 36, 15, 44, 30, 20],
        ['r', 6, 44, 20, 46, 20], ['y', 16, 46, 18, 54, 20, 10], ['r', 14, 54, 20, 60, 10], ['g', 14, 56, 20, 60]],
      foes: [{ t: 'steelie', x: 8, y: 27 }, { t: 'muncher', x: 7, y: 45, x2: 15, y2: 45 }, { t: 'steelie', x: 17, y: 13.5 }]
    },
    {
      name: 'SILLY', time: 30, w: 24, l: 50, start: [7, 2], silly: true, pal: ['#d04070', '#f078a0', '#80203c', '#400c1c'],
      ops: [['r', 4, 0, 10, 4, 10], ['y', 4, 4, 10, 12, 10, 22], ['r', 4, 12, 16, 15, 22], ['x', 16, 12, 20, 15, 22, 30], ['r', 16, 15, 20, 20, 30],
        ['y', 14, 20, 20, 28, 30, 40], ['r', 6, 28, 20, 31, 40], ['y', 6, 31, 12, 40, 40, 52], ['r', 6, 40, 14, 43, 52], ['y', 8, 43, 12, 47, 52, 58],
        ['r', 8, 47, 12, 50, 58], ['g', 8, 47, 12, 50]],
      foes: [{ t: 'steelie', x: 10, y: 13.5 }, { t: 'steelie', x: 12, y: 29.5 }, { t: 'acid', x: 9, y: 41.5 }]
    },
    {
      name: 'ULTIMATE', time: 30, w: 24, l: 64, start: [12, 1.5], pal: ['#909090', '#c0c0c0', '#505050', '#282828'],
      ops: [['r', 10, 0, 14, 3, 80], ['y', 11, 3, 13, 12, 80, 66], ['r', 6, 12, 18, 14, 66], ['x', 2, 12, 6, 14, 60, 66], ['y', 2, 14, 4, 24, 60, 48],
        ['r', 2, 24, 14, 26, 48], ['y', 12, 26, 14, 34, 48, 40], ['r', 8, 34, 20, 37, 40], ['y', 18, 37, 20, 46, 40, 30], ['r', 6, 46, 20, 48, 30],
        ['y', 6, 48, 8, 56, 30, 18], ['r', 6, 56, 12, 59, 18], ['y', 8, 59, 12, 62, 18, 12], ['r', 8, 62, 12, 64, 12], ['g', 8, 62, 12, 64], ['b', 12, 34, 16, 37]],
      foes: [{ t: 'muncher', x: 4, y: 25, x2: 12, y2: 25 }, { t: 'steelie', x: 10, y: 35.5 }, { t: 'steelie', x: 16, y: 47 }, { t: 'steelie', x: 9, y: 47 }, { t: 'acid', x: 18, y: 35.5 }, { t: 'acid', x: 9, y: 57.5 }]
    }
  ];
  const BREAK = 15, K = 0.0022, MAXV = 0.22;

  ArcadeRegistry.register({
    id: 'marblemadness', title: 'Marble Madness', year: 1984, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: roll the marble (diagonal on screen) \u00b7 Space: hold for extra push \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#40a0ff', accent: '#ffffff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null, camX = 0, camY = 0;
      let course = null;

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        bump() { au.tone(180, 0.06, { type: 'triangle', vol: 0.12, slideTo: 120 }); },
        land() { au.tone(120, 0.08, { type: 'triangle', vol: 0.14, slideTo: 70 }); },
        clack() { au.tone(1400, 0.04, { type: 'square', vol: 0.1 }); au.tone(900, 0.05, { type: 'square', vol: 0.08, delay: 0.02 }); },
        shatter() { au.noise(0.5, { vol: 0.2, freq: 6000, slideTo: 1500, type: 'highpass' }); au.tone(1800, 0.3, { type: 'triangle', vol: 0.06, slideTo: 3000 }); },
        fall() { au.tone(900, 1.0, { type: 'sine', vol: 0.12, slideTo: 80 }); },
        chomp() { au.melody([[150, .06], [0, .04], [150, .06], [0, .04], [110, .12]], { type: 'square', vol: 0.12 }); },
        acid() { au.noise(0.6, { vol: 0.12, freq: 900, slideTo: 200, type: 'bandpass' }); },
        tick() { au.tone(1000, 0.03, { type: 'square', vol: 0.06 }); },
        go() { au.melody([[523, .1], [0, .2], [523, .1], [0, .2], [1047, .3]], { type: 'square', vol: 0.1 }); },
        goal() {
          au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .1], [1319, .35]], { type: 'square', vol: 0.1 });
          au.melody([[262, .3], [330, .3], [392, .45]], { type: 'triangle', vol: 0.12 });
        },
        theme() {
          // a rolling, waltz-like original tune
          const n = [[392, .15], [523, .15], [659, .15], [784, .3], [740, .15], [659, .15], [587, .3], [523, .15], [587, .15], [659, .45]];
          au.melody(n, { type: 'triangle', vol: 0.12 }); au.melody([[131, .45], [196, .45], [147, .45], [196, .45]], { type: 'sine', vol: 0.12 });
        }
      };

      // ---------- course building ----------
      function build(ci) {
        const C = COURSES[ci];
        const t = [];
        for (let y = 0; y < C.l; y++) { const row = []; for (let x = 0; x < C.w; x++) row.push(null); t.push(row); }
        let lo = 1e9;
        for (const op of C.ops) {
          const [k, x0, y0, x1, y1, a, b] = op;
          for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            if (y < 0 || y >= C.l || x < 0 || x >= C.w) continue;
            if (k === 'r') t[y][x] = { c: [a, a, a, a], f: t[y][x] ? t[y][x].f : '' };
            else if (k === 'y') { const n = a + (b - a) * (y - y0) / (y1 - y0), s = a + (b - a) * (y - y0 + 1) / (y1 - y0); t[y][x] = { c: [n, n, s, s], f: '' }; }
            else if (k === 'x') { const w = a + (b - a) * (x - x0) / (x1 - x0), e = a + (b - a) * (x - x0 + 1) / (x1 - x0); t[y][x] = { c: [w, e, e, w], f: '' }; }
            else if ((k === 'g' || k === 'b') && t[y][x]) t[y][x].f = k;
          }
        }
        for (const row of t) for (const c of row) if (c) lo = Math.min(lo, ...c.c);
        return { C, t, lo };
      }
      const tileAt = (x, y) => { if (y < 0 || x < 0 || y >= course.C.l || x >= course.C.w) return null; return course.t[y][x]; };
      function wave(x, y, tl) { return tl.f === 'b' ? Math.max(0, Math.sin(frame * 0.08 + y * 1.3)) * 3 : 0; }
      function ground(x, y) {
        const tx = Math.floor(x), ty = Math.floor(y), tl = tileAt(tx, ty);
        if (!tl) return -999;
        const fx = x - tx, fy = y - ty, [nw, ne, se, sw] = tl.c;
        return (nw * (1 - fx) + ne * fx) * (1 - fy) + (sw * (1 - fx) + se * fx) * fy + wave(x, y, tl);
      }
      function grad(x, y) {
        const tx = Math.floor(x), ty = Math.floor(y), tl = tileAt(tx, ty);
        if (!tl) return [0, 0];
        const fx = x - tx, fy = y - ty, [nw, ne, se, sw] = tl.c;
        let gx = (ne - nw) * (1 - fy) + (se - sw) * fy, gy = (sw - nw) * (1 - fx) + (se - ne) * fx;
        if (tl.f === 'b') gy += Math.cos(frame * 0.08 + y * 1.3) * 3.9 * (Math.sin(frame * 0.08 + y * 1.3) > 0 ? 1 : 0);
        return [gx, gy];
      }

      // ---------- projection ----------
      const proj = (x, y, z) => [(x - y) * 8 - camX + W / 2, (x + y) * 4 - z * 4 - camY + H / 2];
      function camTo(b, snap) {
        const [sx, sy] = [(b.x - b.y) * 8, (b.x + b.y) * 4 - b.z * 4];
        const ty = sy + 20;
        if (snap) { camX = sx; camY = ty; } else { camX += (sx - camX) * 0.12; camY += (ty - camY) * 0.12; }
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, race: 0, carry: 0, mult: 1 };
        startRace();
      }
      function newBall(x, y, steel) {
        return { x, y, z: ground(x, y), vx: 0, vy: 0, vz: 0, air: false, fallFrom: 0, steel: !!steel, spin: 0, gone: 0 };
      }
      function startRace() {
        course = build(g.race);
        const C = course.C;
        g.time = C.time + g.carry; g.carry = 0; g.tick = 0;
        g.ball = newBall(C.start[0], C.start[1]); g.ball.z += 30; g.ball.air = true; g.ball.fallFrom = g.ball.z - 30;
        g.safe = [C.start[0], C.start[1]]; g.maxRow = Math.floor(C.start[1]);
        g.foes = C.foes.map(f => {
          if (f.t === 'steelie') { const b = newBall(f.x, f.y, true); b.home = [f.x, f.y]; b.t = 'steelie'; return b; }
          if (f.t === 'muncher') return { t: 'muncher', x: f.x, y: f.y, a: [f.x, f.y], b: [f.x2, f.y2], k: 0, dir: 1 };
          return { t: 'acid', x: f.x, y: f.y, home: [f.x, f.y], ph: Math.random() * 6 };
        });
        g.phase = 'ready'; g.phaseT = 150; g.death = null; g.shards = []; g.pops = []; g.inv = 0;
        g.mult = C.silly ? 2 : 1;
        camTo(g.ball, true);
        snd.theme();
      }
      function addScore(n, x, y) {
        n *= g.mult; g.score += n;
        if (x != null) g.pops.push({ x, y, z: ground(x, y) + 4, s: String(n), t: 40 });
      }
      function stepBall(b, ax, ay, silly) {
        if (!b.air) {
          const [gx, gy] = grad(b.x, b.y), s = silly ? -1 : 1;
          ax += -K * gx * s; ay += -K * gy * s;
        }
        const fr = b.air ? 0.998 : 0.985;
        b.vx = (b.vx + ax) * fr; b.vy = (b.vy + ay) * fr;
        const sp = Math.hypot(b.vx, b.vy); if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
        b.spin += sp;
        let res = null;
        const nx = b.x + b.vx;
        if (ground(nx, b.y) > b.z + 1.3) { b.vx = -b.vx * 0.5; res = 'bump'; } else b.x = nx;
        const ny = b.y + b.vy;
        if (ground(b.x, ny) > b.z + 1.3) { b.vy = -b.vy * 0.5; res = 'bump'; } else b.y = ny;
        const gh = ground(b.x, b.y);
        if (!b.air) {
          if (gh < b.z - 1.3) { b.air = true; b.vz = 0; b.fallFrom = b.z; }
          else b.z = gh;
        }
        if (b.air) {
          b.vz -= 0.11; b.z += b.vz;
          if (b.z <= gh) {
            const drop = b.fallFrom - gh;
            b.z = gh; b.air = false; b.vz = 0;
            if (drop > BREAK) return 'break';
            if (drop > 2) res = 'land';
          }
          if (gh < -500 && b.z < course.lo - 30) return 'lost';
        }
        return res;
      }
      function kill(how) {
        if (g.death) return;
        const b = g.ball;
        g.death = { how, t: 0 };
        if (how === 'break') { snd.shatter(); for (let k = 0; k < 14; k++) g.shards.push({ x: b.x, y: b.y, z: b.z + 1, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, vz: Math.random() * 1.2, t: 60 }); }
        else if (how === 'lost') { }
        else if (how === 'eaten') snd.chomp();
        else if (how === 'acid') snd.acid();
      }
      function respawn() {
        const [x, y] = g.safe;
        g.ball = newBall(x, y); g.ball.z += 10; g.ball.air = true; g.ball.fallFrom = g.ball.z - 10;
        g.death = null; g.inv = 90;
        // move enemies that are camping the respawn point
        for (const f of g.foes) if (Math.hypot(f.x - x, f.y - y) < 2.5) { if (f.home) { f.x = f.home[0]; f.y = f.home[1]; if (f.steel) { f.z = ground(f.x, f.y); f.vx = f.vy = 0; } } }
      }
      function updFoes() {
        const b = g.ball, alive = !g.death;
        for (const f of g.foes) {
          if (f.t === 'steelie') {
            if (f.gone > 0) { if (--f.gone === 0) { Object.assign(f, newBall(f.home[0], f.home[1], true), { home: f.home, t: 'steelie' }); f.z += 12; f.air = true; f.fallFrom = f.z - 12; } continue; }
            let ax = 0, ay = 0;
            const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy);
            if (alive && d < 9 && d > 0.01) { ax = dx / d * 0.0042; ay = dy / d * 0.0042; }
            const r = stepBall(f, ax, ay, course.C.silly);
            if (r === 'lost' || r === 'break') f.gone = 150;
            // collision with player
            if (alive && !f.gone && d < 0.62 && Math.abs(f.z - b.z) < 3) {
              const nx = dx / (d || 1), ny = dy / (d || 1);
              const rel = (f.vx - b.vx) * nx + (f.vy - b.vy) * ny;
              if (rel > -0.05) {
                const imp = Math.max(0.06, rel) * 1.25;
                b.vx += nx * imp; b.vy += ny * imp; f.vx -= nx * imp * 0.45; f.vy -= ny * imp * 0.45;
                b.x += nx * (0.63 - d); b.y += ny * (0.63 - d);
                snd.clack();
              }
            }
          } else if (f.t === 'muncher') {
            f.k += 0.012 * f.dir;
            if (f.k > 1) { f.k = 1; f.dir = -1; } if (f.k < 0) { f.k = 0; f.dir = 1; }
            f.x = f.a[0] + (f.b[0] - f.a[0]) * f.k; f.y = f.a[1] + (f.b[1] - f.a[1]) * f.k;
            if (alive && g.inv <= 0 && !b.air && Math.hypot(b.x - f.x, b.y - f.y) < 0.6) kill('eaten');
          } else {
            f.ph += 0.05;
            const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy), hd = Math.hypot(f.x - f.home[0], f.y - f.home[1]);
            let tx = f.home[0], ty = f.home[1];
            if (alive && d < 6 && Math.hypot(b.x - f.home[0], b.y - f.home[1]) < 5) { tx = b.x; ty = b.y; }
            const ex = tx - f.x, ey = ty - f.y, el = Math.hypot(ex, ey);
            if (el > 0.05) { const nx = f.x + ex / el * 0.016, ny = f.y + ey / el * 0.016; if (tileAt(Math.floor(nx), Math.floor(ny))) { f.x = nx; f.y = ny; } }
            if (alive && g.inv <= 0 && !b.air && d < 0.65) kill('acid');
          }
        }
      }
      function updPlay() {
        const b = g.ball, C = course.C;
        for (const q of g.pops) { q.t--; q.z += 0.2; } g.pops = g.pops.filter(q => q.t > 0);
        for (const s of g.shards) { s.x += s.vx; s.y += s.vy; s.z += s.vz; s.vz -= 0.08; s.t--; } g.shards = g.shards.filter(s => s.t > 0);
        if (g.phase === 'ready') {
          if (g.phaseT === 150) { }
          if (--g.phaseT <= 0) { g.phase = 'race'; snd.go(); }
          // the marble drops into place
          stepBall(b, 0, 0, false); camTo(b);
          return;
        }
        if (g.phase === 'goal') {
          b.vx *= 0.95; b.vy *= 0.95; stepBall(b, 0, 0, false); camTo(b);
          if (g.phaseT > 60 && g.bonusLeft > 0) { const k = Math.min(g.bonusLeft, 1); g.bonusLeft -= k; addScore(k * 20 * (g.race + 1)); g.carry++; if (frame % 3 === 0) snd.tick(); return; }
          if (--g.phaseT <= 0) {
            g.race++;
            if (g.race >= COURSES.length) { g.won = true; gameOver(); return; }
            startRace();
          }
          return;
        }
        if (g.phase === 'timeup') { if (--g.phaseT <= 0) lastLife(); return; }
        if (g.phase === 'wait') return;
        // clock
        g.tick++;
        if (g.tick % 60 === 0) { g.time--; if (g.time <= 5 && g.time > 0) snd.tick(); }
        if (g.time <= 0) { g.time = 0; g.phase = 'timeup'; g.phaseT = 120; au.melody([[392, .2], [330, .2], [262, .5]], { type: 'square', vol: 0.1 }); return; }
        if (g.inv > 0) g.inv--;
        updFoes();
        if (g.death) {
          g.death.t++;
          if (g.death.how === 'lost') { b.vz -= 0.11; b.z += b.vz; b.x += b.vx; b.y += b.vy; }
          if (g.death.t > 100) respawn();
          return;
        }
        // input: screen directions map onto the isometric axes
        let ix = 0, iy = 0;
        if (api.key('ArrowUp')) { ix -= 1; iy -= 1; }
        if (api.key('ArrowDown')) { ix += 1; iy += 1; }
        if (api.key('ArrowLeft')) { ix -= 1; iy += 1; }
        if (api.key('ArrowRight')) { ix += 1; iy -= 1; }
        const il = Math.hypot(ix, iy);
        const acc = (api.key('Space') ? 0.0068 : 0.0048) * (b.air ? 0.3 : 1);
        const r = stepBall(b, il ? ix / il * acc : 0, il ? iy / il * acc : 0, C.silly);
        if (r === 'bump') snd.bump(); else if (r === 'land') snd.land();
        else if (r === 'break') { kill('break'); return; }
        else if (r === 'lost') { kill('lost'); snd.fall(); return; }
        if (b.air && b.z < course.lo - 10 && !g.death) { kill('lost'); snd.fall(); }
        camTo(b);
        // safe point for respawning: grounded, slow, with the whole marble over solid tiles
        if (!b.air && g.tick % 10 === 0 && Math.hypot(b.vx, b.vy) < 0.15) {
          let ok = true;
          for (const [i, j] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4], [0, 0]]) { const gh = ground(b.x + i, b.y + j); if (gh < -500 || Math.abs(gh - b.z) > 2.5) ok = false; }
          if (ok && !g.foes.some(f => Math.hypot(f.x - b.x, f.y - b.y) < 2)) g.safe = [b.x, b.y];
        }
        // progress points
        const row = Math.floor(b.y);
        if (!b.air && row > g.maxRow) { addScore(10 * (row - g.maxRow) * (g.race + 1)); g.maxRow = row; }
        // goal
        const tl = tileAt(Math.floor(b.x), Math.floor(b.y));
        if (tl && tl.f === 'g' && !b.air) { g.phase = 'goal'; g.phaseT = 200; g.bonusLeft = g.time; snd.goal(); addScore(1000 * (g.race + 1), b.x, b.y); }
      }
      function lastLife() {
        g.phase = 'wait';
        const cg = g;
        const end = () => { if (g === cg) gameOver(); };
        if (!api.offerContinue) { end(); return; }
        api.offerContinue(() => { if (g === cg) { g.carry = 0; startRace(); } }, end);
      }
      function gameOver() {
        api.setHiScore(g.score); hi = Math.max(hi, g.score);
        mode = 'over'; g.overT = 0;
        if (!g.won) au.melody([[330, .25], [311, .25], [294, .25], [277, .6]], { type: 'triangle', vol: 0.12 });
        else snd.goal();
      }

      // ---------- title demo: a marble rolls down the practice course ----------
      let demo = null;
      function demoStart() { course = build(0); demo = { b: newBall(5.5, 2), path: 0 }; camTo(demo.b, true); }
      function demoStep() {
        const b = demo.b;
        const wp = [[5.5, 9], [10, 12.5], [17.5, 13], [17.5, 22], [13, 23], [13, 32]];
        const [tx, ty] = wp[Math.min(wp.length - 1, demo.path)];
        if (Math.hypot(tx - b.x, ty - b.y) < 1.0) demo.path++;
        const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
        const r = stepBall(b, dx / d * 0.004 - b.vx * 0.02, dy / d * 0.004 - b.vy * 0.02, false);
        if (r === 'lost' || r === 'break' || demo.path >= wp.length) demoStart();
        camTo(b);
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title') {
          titleT++;
          if (!demo) demoStart();
          demoStep();
          if (api.anyPressed('Enter', 'Space') && tryStart()) { demo = null; newGame(); mode = 'play'; }
          return;
        }
        if (mode === 'play') { updPlay(); return; }
        if (mode === 'over') { if (++g.overT > 360 || (g.overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; demo = null; } }
      }

      // ---------- drawing ----------
      const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const shadeCache = new Map();
      function shade(hex, f) {
        const k = hex + f.toFixed(2); let s = shadeCache.get(k);
        if (!s) { const c = hexRgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v * f)))); s = 'rgb(' + c.join(',') + ')'; shadeCache.set(k, s); }
        return s;
      }
      function quad(ctx, a, b, c, d, col) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
      }
      function drawTile(ctx, x, y, tl, pal) {
        const [nw, ne, se, sw] = tl.c;
        const wv = tl.f === 'b' ? (yy => Math.max(0, Math.sin(frame * 0.08 + yy * 1.3)) * 3) : (() => 0);
        const pNW = proj(x, y, nw + wv(y)), pNE = proj(x + 1, y, ne + wv(y)), pSE = proj(x + 1, y + 1, se + wv(y + 1)), pSW = proj(x, y + 1, sw + wv(y + 1));
        // cull
        const minY = Math.min(pNW[1], pNE[1]), maxY = Math.max(pSE[1], pSW[1]);
        if (pNE[0] < -10 || pSW[0] > W + 10 || minY > H + 4 || maxY < -150) return;
        // south wall
        const S = tileAt(x, y + 1);
        const sDepthL = S ? S.c[0] : course.lo - 14, sDepthR = S ? S.c[1] : course.lo - 14;
        if (sw > sDepthL + 0.01 || se > sDepthR + 0.01) {
          const a = pSW, b = pSE, c = proj(x + 1, y + 1, Math.min(se, sDepthR)), d = proj(x, y + 1, Math.min(sw, sDepthL));
          quad(ctx, a, b, c, d, pal[2]);
          ctx.fillStyle = pal[3];
          for (let k = 1; k < 4; k++) { const t = k / 4; ctx.fillRect(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), 1, Math.max(0, Math.round((d[1] - a[1]) * 0.9))); }
        }
        // east wall
        const E = tileAt(x + 1, y);
        const eDepthT = E ? E.c[0] : course.lo - 14, eDepthB = E ? E.c[3] : course.lo - 14;
        if (ne > eDepthT + 0.01 || se > eDepthB + 0.01) {
          const a = pNE, b = pSE, c = proj(x + 1, y + 1, Math.min(se, eDepthB)), d = proj(x + 1, y, Math.min(ne, eDepthT));
          quad(ctx, a, b, c, d, pal[3]);
        }
        // top
        const gx = ((ne - nw) + (se - sw)) / 2, gy = ((sw - nw) + (se - ne)) / 2;
        let f = 1 + gy * 0.07 - gx * 0.05;
        if (tl.f === 'b') f += Math.sin(frame * 0.08 + y * 1.3) * 0.15;
        f = Math.max(0.55, Math.min(1.35, f));
        let base = ((x + y) & 1) ? pal[0] : pal[1];
        if (tl.f === 'g') base = ((x + y) & 1) ? '#101010' : '#f0f0f0';
        quad(ctx, pNW, pNE, pSE, pSW, shade(base, f));
        // grid line along the north and west edges
        ctx.strokeStyle = shade(pal[3], 1); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pSW[0], pSW[1]); ctx.lineTo(pNW[0], pNW[1]); ctx.lineTo(pNE[0], pNE[1]); ctx.stroke();
      }
      function drawBall(ctx, b, steel, scale) {
        const gh = ground(b.x, b.y);
        if (b.air && gh > -500) { const s = proj(b.x, b.y, gh); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(s[0], s[1], 4, 2, 0, 0, Math.PI * 2); ctx.fill(); }
        const p = proj(b.x, b.y, b.z);
        const r = 4.5 * (scale || 1);
        const cx = p[0], cy = p[1] - r;
        ctx.fillStyle = steel ? '#181820' : '#2050e0';
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        // swirl that turns as it rolls
        if (!steel) {
          const a = b.spin * 3;
          ctx.fillStyle = '#80c0ff'; ctx.fillRect(Math.round(cx + Math.cos(a) * r * 0.5) - 1, Math.round(cy + Math.sin(a) * r * 0.4) - 1, 2, 2);
          ctx.fillStyle = '#1030a0'; ctx.fillRect(Math.round(cx - Math.cos(a) * r * 0.5) - 1, Math.round(cy - Math.sin(a) * r * 0.4), 2, 2);
        }
        ctx.fillStyle = steel ? '#8080a0' : '#e0f0ff'; ctx.fillRect(Math.round(cx - r * 0.45), Math.round(cy - r * 0.55), 2, 2);
      }
      function drawMuncher(ctx, f) {
        const p = proj(f.x, f.y, ground(f.x, f.y));
        const open = (frame >> 3) & 1;
        // a green spring-like creature with a snapping mouth
        for (let k = 0; k < 4; k++) { ctx.fillStyle = k & 1 ? '#40c040' : '#208020'; ctx.fillRect(Math.round(p[0]) - 4, Math.round(p[1]) - 3 - k * 3, 8, 3); }
        ctx.fillStyle = '#50e050'; ctx.fillRect(Math.round(p[0]) - 5, Math.round(p[1]) - 18 - open * 2, 10, 4);
        ctx.fillStyle = '#50e050'; ctx.fillRect(Math.round(p[0]) - 5, Math.round(p[1]) - 14, 10, 2);
        ctx.fillStyle = '#000'; if (open) ctx.fillRect(Math.round(p[0]) - 4, Math.round(p[1]) - 15, 8, 2);
        ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(p[0]) - 3, Math.round(p[1]) - 18 - open * 2, 2, 2); ctx.fillRect(Math.round(p[0]) + 1, Math.round(p[1]) - 18 - open * 2, 2, 2);
      }
      function drawAcid(ctx, f) {
        const p = proj(f.x, f.y, ground(f.x, f.y));
        const w = 9 + Math.sin(f.ph) * 2;
        ctx.fillStyle = '#60f020'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - 1, w, 4 + Math.cos(f.ph) * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b0ff60'; ctx.fillRect(Math.round(p[0] - 3 + Math.sin(f.ph * 2) * 3), Math.round(p[1]) - 3, 2, 1);
        if ((frame >> 3) & 1) { ctx.fillStyle = '#a0ff40'; ctx.fillRect(Math.round(p[0] + 2), Math.round(p[1] - 6 - (frame % 8)), 2, 2); }
      }
      function drawCourse(ctx, ball, foes, extra, isDemo) {
        const C = course.C, pal = C.pal;
        ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, H);
        // starfield-ish backdrop
        ctx.fillStyle = '#18183a';
        for (let i = 0; i < 40; i++) { const sx = ((i * 97) % W), sy = ((i * 57 + Math.floor(camY * 0.3)) % H + H) % H; ctx.fillRect(sx, sy, 1, 1); }
        // objects grouped by diagonal so cliffs can hide them
        const objs = [];
        if (ball) objs.push({ d: Math.floor(ball.x) + Math.floor(ball.y), f: () => { if (isDemo) drawBall(ctx, ball, false); else if (!g.death || g.death.how === 'lost') { if (!(g.inv > 0 && (frame & 4))) drawBall(ctx, ball, false); } else drawDeath(ctx); } });
        for (const f of foes || []) {
          if (f.t === 'steelie' && !f.gone) objs.push({ d: Math.floor(f.x) + Math.floor(f.y), f: () => drawBall(ctx, f, true) });
          else if (f.t === 'muncher') objs.push({ d: Math.floor(f.x) + Math.floor(f.y), f: () => drawMuncher(ctx, f) });
          else if (f.t === 'acid') objs.push({ d: Math.floor(f.x) + Math.floor(f.y), f: () => drawAcid(ctx, f) });
        }
        const maxD = C.w + C.l;
        objs.sort((a, b) => a.d - b.d);
        let oi = 0;
        while (oi < objs.length && objs[oi].d < 0) objs[oi++].f();
        for (let d = 0; d <= maxD; d++) {
          for (let x = 0; x <= d; x++) {
            const y = d - x;
            if (x >= C.w || y >= C.l || y < 0) continue;
            const tl = course.t[y][x];
            if (tl) drawTile(ctx, x, y, tl, pal);
          }
          while (oi < objs.length && objs[oi].d <= d) objs[oi++].f();
        }
        while (oi < objs.length) objs[oi++].f();
        // goal sign
        for (let y = 0; y < C.l; y++) for (let x = 0; x < C.w; x++) {
          const tl = course.t[y][x];
          if (tl && tl.f === 'g' && (!tileAt(x - 1, y) || tileAt(x - 1, y).f !== 'g') && (!tileAt(x, y - 1) || tileAt(x, y - 1).f !== 'g')) {
            const p = proj(x + 1, y + 1, tl.c[0]);
            text(ctx, 'GOAL', p[0], p[1] - 26, (frame >> 3) & 1 ? '#ffffff' : '#ffd040', 1, 'center');
          }
        }
        if (extra) extra();
      }
      function drawDeath(ctx) {
        const b = g.ball, d = g.death, p = proj(b.x, b.y, b.z);
        if (d.how === 'eaten') {
          if (d.t < 20) drawBall(ctx, b, false, 1 - d.t / 20);
        } else if (d.how === 'acid') {
          const k = Math.max(0, 1 - d.t / 50);
          if (k > 0) { ctx.fillStyle = '#60c040'; ctx.beginPath(); ctx.arc(p[0], p[1] - 4 * k, 4.5 * k, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      function drawHud(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, W, 22);
        text(ctx, String(g.score), 4, 3, '#ffffff', 1);
        text(ctx, 'HI ' + Math.max(hi, g.score), 4, 12, '#8080a0', 1);
        const tcol = g.time <= 10 ? ((frame >> 3) & 1 ? '#ff4040' : '#ffffff') : '#ffd040';
        text(ctx, String(Math.max(0, g.time)), W / 2, 3, tcol, 2, 'center');
        text(ctx, course.C.name, W - 4, 3, '#40a0ff', 1, 'right');
        text(ctx, 'RACE ' + (g.race + 1) + '/6', W - 4, 12, '#8080a0', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') {
          if (!demo) demoStart();
          drawCourse(ctx, demo.b, [], null, true);
          ctx.fillStyle = 'rgba(0,0,8,.55)'; ctx.fillRect(0, 20, W, 76);
          const t1 = 'MARBLE', t2 = 'MADNESS';
          for (let i = 0; i < t1.length; i++) text(ctx, t1[i], 56 + i * 24, 26 + Math.round(Math.sin(frame * 0.07 + i * 0.6) * 2), i % 2 ? '#80c0ff' : '#ffffff', 3);
          for (let i = 0; i < t2.length; i++) text(ctx, t2[i], 44 + i * 24, 56 + Math.round(Math.sin(frame * 0.07 + i * 0.6 + 2) * 2), i % 2 ? '#ffffff' : '#80c0ff', 3);
          ctx.fillStyle = 'rgba(0,0,8,.7)'; ctx.fillRect(0, 168, W, 72);
          const page = (titleT / 360 | 0) % 2;
          if (page === 0) {
            text(ctx, 'GUIDE YOUR MARBLE TO THE GOAL', W / 2, 172, '#ffffff', 1, 'center');
            text(ctx, 'BEFORE TIME RUNS OUT', W / 2, 182, '#ffffff', 1, 'center');
          } else {
            text(ctx, 'HIGH SCORE ' + hi, W / 2, 172, '#ffd040', 1, 'center');
            text(ctx, 'LEFTOVER TIME CARRIES OVER', W / 2, 182, '#c0c0c0', 1, 'center');
          }
          const blink = (frame >> 4) & 1;
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 200, '#ffffff', 1, 'center'); }
          else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 200, '#ffffff', 1, 'center'); }
          else text(ctx, 'PUSH START', W / 2, 200, blink ? '#ffffff' : '#888888', 1, 'center');
          text(ctx, credStr(), 4, 230, '#888888', 1);
          text(ctx, '\u00a9 1984 ATARI GAMES', W - 4, 230, '#888888', 1, 'right');
          return;
        }
        drawCourse(ctx, g.ball, g.foes, () => {
          for (const s of g.shards) { const p = proj(s.x, s.y, s.z); ctx.fillStyle = (s.t & 4) ? '#80c0ff' : '#2050e0'; ctx.fillRect(Math.round(p[0]), Math.round(p[1]), 2, 2); }
          for (const q of g.pops) { const p = proj(q.x, q.y, q.z); text(ctx, q.s, p[0], p[1] - 14, '#ffffff', 1, 'center'); }
        });
        drawHud(ctx);
        if (g.phase === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(20, 70, W - 40, 44);
          text(ctx, course.C.name + ' RACE', W / 2, 76, '#40a0ff', 2, 'center');
          text(ctx, g.phaseT > 50 ? 'TIME ' + g.time + ' SECONDS' : 'GO!', W / 2, 100, '#ffffff', 1, 'center');
        }
        if (g.phase === 'goal') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(20, 70, W - 40, 50);
          text(ctx, 'GOAL!', W / 2, 76, (frame >> 3) & 1 ? '#ffffff' : '#ffd040', 2, 'center');
          text(ctx, 'TIME BONUS ' + (g.carry + g.bonusLeft) + ' SECONDS', W / 2, 98, '#ffffff', 1, 'center');
          text(ctx, 'CARRIED TO NEXT RACE', W / 2, 108, '#a0a0c0', 1, 'center');
        }
        if (g.death && g.death.how === 'break' && g.death.t > 10) text(ctx, 'OOPS!', W / 2, 110, '#ffffff', 2, 'center');
        if (g.phase === 'timeup') text(ctx, "TIME'S UP", W / 2, 100, '#ff4040', 2, 'center');
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(28, 80, W - 56, 60);
          if (g.won) { text(ctx, 'CONGRATULATIONS!', W / 2, 88, '#ffd040', 1, 'center'); text(ctx, 'ALL SIX RACES', W / 2, 100, '#ffffff', 1, 'center'); }
          else text(ctx, 'GAME OVER', W / 2, 92, '#ff4040', 2, 'center');
          text(ctx, 'SCORE ' + g.score, W / 2, 120, '#ffffff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
