// Super Sprint (Atari Games, 1986) - from-scratch recreation.
// Overhead single-screen racing against drone cars: 4 laps, wrenches buy upgrades, oil, puddles and tornadoes.
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
  FONT['$'] = [4, 15, 20, 14, 5, 30, 4];
  FONT['#'] = [10, 10, 31, 10, 31, 10, 10];

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

  // Tracks: closed polylines (centre line). pts[0] is the start/finish line; the start grid sits on the last segment.
  const TRACKS = [
    {
      name: 'SPEEDWAY', w: 34, grass: '#1d6e2a', grass2: '#185f24',
      pts: [[160, 50], [270, 50], [292, 80], [292, 190], [262, 216], [184, 216], [164, 172], [118, 172], [98, 216], [52, 216], [28, 190], [28, 80], [50, 50]],
      haz: [{ t: 'oil', s: 3, f: 0.55, l: 0.3 }, { t: 'puddle', s: 6, f: 0.5, l: 0 }]
    },
    {
      name: 'FIGURE EIGHT', w: 30, grass: '#5d4a2a', grass2: '#544126',
      pts: [[295, 130], [295, 80], [262, 44], [62, 216], [25, 182], [25, 80], [58, 44], [258, 216], [295, 182]],
      haz: [{ t: 'oil', s: 5, f: 0.4, l: -0.3 }, { t: 'tornado', s: 3, f: 0.25, l: 0 }]
    },
    {
      name: 'SERPENT RUN', w: 30, grass: '#2a5f6e', grass2: '#245563',
      pts: [[160, 40], [280, 40], [280, 95], [90, 95], [90, 137], [280, 137], [292, 200], [262, 220], [42, 220], [28, 130], [40, 40]],
      haz: [{ t: 'puddle', s: 3, f: 0.5, l: 0.2 }, { t: 'oil', s: 8, f: 0.4, l: -0.3 }, { t: 'tornado', s: 5, f: 0.6, l: 0 }]
    },
    {
      name: 'NOTCH ALLEY', w: 30, grass: '#6e2a4a', grass2: '#632542',
      pts: [[100, 50], [150, 50], [160, 112], [200, 112], [210, 50], [285, 50], [290, 215], [200, 215], [160, 165], [120, 215], [35, 215], [35, 50]],
      haz: [{ t: 'oil', s: 6, f: 0.5, l: 0.2 }, { t: 'puddle', s: 10, f: 0.5, l: 0 }, { t: 'tornado', s: 9, f: 0.5, l: 0 }]
    }
  ];
  for (const T of TRACKS) {
    const N = T.pts.length; T.segs = []; let cum = 0;
    for (let i = 0; i < N; i++) {
      const a = T.pts[i], b = T.pts[(i + 1) % N];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      T.segs.push({ ax: a[0], ay: a[1], dx, dy, len, ux: dx / len, uy: dy / len, cum, ang: Math.atan2(dy, dx) });
      cum += len;
    }
    T.L = cum; T.hw = T.w / 2;
  }
  function projSeg(s, x, y) {
    let t = ((x - s.ax) * s.dx + (y - s.ay) * s.dy) / (s.len * s.len);
    t = clamp(t, 0, 1);
    const px = s.ax + s.dx * t, py = s.ay + s.dy * t;
    return { t, px, py, d: Math.hypot(x - px, y - py) };
  }
  function nearest(T, x, y) {
    let best = null, bi = 0;
    for (let i = 0; i < T.segs.length; i++) { const p = projSeg(T.segs[i], x, y); if (!best || p.d < best.d) { best = p; bi = i; } }
    best.i = bi; return best;
  }
  function pointAt(T, s) {
    s = ((s % T.L) + T.L) % T.L;
    let i = 0; while (i < T.segs.length - 1 && T.segs[i + 1].cum <= s) i++;
    const g = T.segs[i], t = (s - g.cum) / g.len;
    return { x: g.ax + g.dx * t, y: g.ay + g.dy * t, ang: g.ang, nx: -g.uy, ny: g.ux };
  }

  ArcadeRegistry.register({
    id: 'supersprint', title: 'Super Sprint', year: 1986, maker: 'Atari Games',
    width: 320, height: 240, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Space/Up: gas \u00b7 Down: brake \u00b7 Up/Down+Space: buy upgrades \u00b7 Enter: start',
    marquee: { bg: '#101830', fg: '#ff3a2a', accent: '#ffd23a' },
    create(api) {
      const W = 320, H = 240, LAPS = 4, CAR_R = 5;
      const COLORS = [['#e8242a', '#ff8a7a'], ['#2a5cff', '#9ab4ff'], ['#ffd21e', '#fff2a0'], ['#22c046', '#a0ffb4']];
      const PLACE_BONUS = [5000, 3000, 1500, 0];
      const PLACE_NAME = ['1ST', '2ND', '3RD', '4TH'];
      let hi = api.getHiScore(25000);
      let state = 'attract', timer = 0, coinFlash = 0, attractT = 0;
      let track = TRACKS[0], cars = [], items = [], parts = [], hazards = [], skids = [];
      let score = 0, chances = 3, race = 0, wrenches = 0, lv = { trac: 0, speed: 0, acc: 0 };
      let shopSel = 0, finishOrder = [], playerPlace = 0, resultTimer = 0, itemTimer = 0, msg = '', msgT = 0, nextExtra = 50000;
      let grassTufts = [], dnfT = 0;

      const snd = {
        beep(f, d) { api.audio.tone(f, d || 0.12, { type: 'square', vol: 0.15 }); },
        crash() { api.audio.noise(0.6, { vol: 0.25, freq: 1200, slideTo: 80 }); api.audio.tone(120, 0.3, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); },
        bump() { api.audio.noise(0.08, { vol: 0.15, freq: 600 }); },
        pick() { api.audio.melody([[880, 0.05], [1175, 0.05], [1568, 0.08]], { type: 'square', vol: 0.12 }); },
        lap() { api.audio.melody([[659, 0.07], [784, 0.07], [988, 0.12]], { type: 'square', vol: 0.14 }); },
        skid() { api.audio.noise(0.08, { vol: 0.06, freq: 3000, type: 'bandpass' }); },
        win() { api.audio.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2], [784, 0.1], [1047, 0.35]], { type: 'square', vol: 0.15 }); },
        lose() { api.audio.melody([[392, 0.18], [330, 0.18], [262, 0.4]], { type: 'triangle', vol: 0.2 }); },
        spin() { api.audio.tone(900, 0.4, { type: 'sine', vol: 0.12, slideTo: 200 }); }
      };

      function makeTufts() {
        grassTufts = [];
        let s = 1234 + TRACKS.indexOf(track) * 77;
        const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
        for (let i = 0; i < 140; i++) grassTufts.push([r() * W | 0, 14 + r() * (H - 14) | 0, r() < 0.5]);
      }

      function newCar(i, drone) {
        return {
          i, drone, col: COLORS[i], x: 0, y: 0, a: 0, vx: 0, vy: 0, si: 0, lap: 0, prog: 0, finished: false, place: 0,
          crash: 0, spin: 0, oil: 0, lane: 0, top: 2.2, acc: 0.04, grip: 0.12, pts: 0, skidT: 0, heli: 0, lapShown: 0
        };
      }
      function droneStats(c, k) {
        const base = Math.min(3.15, 2.02 + race * 0.07) * [1, 0.965, 0.93][k];
        c.top = base; c.acc = 0.05; c.grip = 0.3; c.lane = [-0.45, 0.45, 0][k];
      }
      function playerStats(c) {
        c.top = 2.3 + lv.speed * 0.17; c.acc = 0.034 + lv.acc * 0.009; c.grip = 0.1 + lv.trac * 0.03;
      }
      function placeGrid() {
        const g = track.segs[track.segs.length - 1];
        const ang = g.ang;
        for (let k = 0; k < cars.length; k++) {
          const row = k >> 1, side = (k & 1) ? 1 : -1;
          const back = 14 + row * 18;
          const px = track.pts[0][0] - g.ux * back, py = track.pts[0][1] - g.uy * back;
          const c = cars[k];
          c.x = px + (-g.uy) * side * track.hw * 0.42; c.y = py + g.ux * side * track.hw * 0.42;
          c.a = ang; c.vx = c.vy = 0; c.si = track.segs.length - 1; c.lap = -1; c.finished = false; c.place = 0;
          c.crash = c.spin = c.oil = c.heli = 0; c.lapShown = -1;
          updateProg(c, true);
        }
      }
      function setupHazards() {
        hazards = [];
        const n = Math.min(track.haz.length, 1 + Math.floor(race / 2) + 1);
        for (let k = 0; k < n; k++) {
          const h = track.haz[k], g = track.segs[h.s % track.segs.length];
          const x = g.ax + g.dx * h.f - g.uy * h.l * track.hw, y = g.ay + g.dy * h.f + g.ux * h.l * track.hw;
          hazards.push({ t: h.t, x, y, bx: x, by: y, nx: -g.uy, ny: g.ux, ph: Math.random() * TAU });
        }
      }
      function setupRace(demo) {
        track = TRACKS[race % TRACKS.length];
        cars = [];
        if (demo) { for (let k = 0; k < 4; k++) { const c = newCar(k, true); droneStats(c, k % 3); c.lane = [-0.5, 0.5, 0, 0.2][k]; c.top *= [1, 0.98, 0.96, 0.99][k]; cars.push(c); } }
        else {
          const p = newCar(0, false); playerStats(p); cars.push(p);
          for (let k = 0; k < 3; k++) { const c = newCar(k + 1, true); droneStats(c, k); cars.push(c); }
          // the player starts on the inside of the back row like a qualifier
          cars.push(cars.shift());
        }
        placeGrid();
        items = []; parts = []; skids = []; finishOrder = []; itemTimer = 120;
        setupHazards(); makeTufts();
      }
      const player = () => cars.find(c => !c.drone);

      function updateProg(c, force) {
        const N = track.segs.length;
        let best = null, bi = c.si;
        const cand = force ? [...Array(N).keys()] : [(c.si + N - 1) % N, c.si, (c.si + 1) % N];
        for (const i of cand) { const p = projSeg(track.segs[i], c.x, c.y); if (!best || p.d < best.d - 0.01) { best = p; bi = i; } }
        if (!force) {
          if (c.si === N - 1 && bi === 0) c.lap++;
          else if (c.si === 0 && bi === N - 1) c.lap--;
        }
        c.si = bi; c.t = best.t;
        const g = track.segs[bi];
        c.prog = c.lap * track.L + g.cum + best.t * g.len - (force ? 0 : 0);
      }
      function along(c) { const g = track.segs[c.si]; return g.cum + c.t * g.len; }

      function boom(x, y, n, cols) {
        for (let k = 0; k < n; k++) {
          const a = Math.random() * TAU, s = 0.3 + Math.random() * 2;
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 25 + Math.random() * 30, col: cols[k % cols.length] });
        }
      }
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { nextExtra += 50000; chances = Math.min(9, chances + 1); msg = 'BONUS CHANCE!'; msgT = 120; snd.lap(); }
      }

      function wallCollide(c) {
        const n = nearest(track, c.x, c.y), lim = track.hw - CAR_R + 2;
        if (n.d > lim) {
          const nx = (c.x - n.px) / (n.d || 1), ny = (c.y - n.py) / (n.d || 1);
          c.x = n.px + nx * lim; c.y = n.py + ny * lim;
          const vn = c.vx * nx + c.vy * ny;
          if (vn > 0) { c.vx -= 1.5 * vn * nx; c.vy -= 1.5 * vn * ny; c.vx *= 0.8; c.vy *= 0.8; }
          return vn;
        }
        return 0;
      }

      function driveCar(c, gas, brake, steer) {
        const ca = Math.cos(c.a), sa = Math.sin(c.a);
        let f = c.vx * ca + c.vy * sa;
        const spd = Math.hypot(c.vx, c.vy);
        let turn = 0.058 * (0.35 + Math.min(1, spd / 1.3) * 0.65);
        if (f < 0) steer = -steer;
        if (c.spin > 0) { c.a += 0.32; c.spin--; }
        else c.a += steer * turn;
        if (gas && c.spin <= 0) f = Math.min(c.top, f + c.acc * (1.15 - f / (c.top * 1.4)));
        else if (brake) f = f > 0 ? Math.max(0, f - 0.08) : Math.max(-0.7, f - 0.03);
        else f *= 0.988;
        const g = (c.oil > 0 ? 0.025 : c.grip) * (c.spin > 0 ? 0.3 : 1);
        if (c.oil > 0) c.oil--;
        const dvx = Math.cos(c.a) * f, dvy = Math.sin(c.a) * f;
        c.vx += (dvx - c.vx) * g; c.vy += (dvy - c.vy) * g;
        c.x += c.vx; c.y += c.vy;
        // skid marks when sliding
        const side = Math.abs(-c.vx * Math.sin(c.a) + c.vy * Math.cos(c.a));
        if (side > 0.55 && spd > 1) {
          skids.push([c.x, c.y, 140]); if (skids.length > 260) skids.shift();
          if (!c.drone && --c.skidT <= 0) { snd.skid(); c.skidT = 6; }
        }
      }

      function droneAI(c) {
        const s = along(c);
        const spd = Math.hypot(c.vx, c.vy);
        const look = 20 + spd * 9;
        const tp = pointAt(track, s + look);
        const tx = tp.x + tp.nx * c.lane * track.hw, ty = tp.y + tp.ny * c.lane * track.hw;
        const want = Math.atan2(ty - c.y, tx - c.x);
        const d = angDiff(c.a, want);
        const far = pointAt(track, s + 55);
        const curve = Math.abs(angDiff(track.segs[c.si].ang, far.ang));
        let top = c.top * (1 - Math.min(0.42, curve * 0.3));
        // rubber band around the player
        const p = player();
        if (p && !c.finished && state === 'race') {
          const gap = c.prog - p.prog;
          if (gap > 160) top *= 0.9; else if (gap < -120) top *= 1.08;
        }
        const save = c.top; c.top = top;
        const ca = Math.cos(c.a), sa = Math.sin(c.a), f = c.vx * ca + c.vy * sa;
        driveCar(c, f < top, f > top + 0.3, clamp(d * 3, -1, 1));
        c.top = save;
      }

      function hazardEffects(c) {
        for (const h of hazards) {
          const d = Math.hypot(c.x - h.x, c.y - h.y);
          if (h.t === 'oil' && d < 9 && c.oil <= 0) { c.oil = 45; if (!c.drone) snd.skid(); }
          if (h.t === 'puddle' && d < 10) { c.vx *= 0.955; c.vy *= 0.955; if (!c.drone && (api.frame & 7) === 0) api.audio.noise(0.1, { vol: 0.08, freq: 500 }); }
          if (h.t === 'tornado' && d < 9 && c.spin <= 0 && c.oil <= 0) { c.spin = 20; c.vx *= 0.5; c.vy *= 0.5; c.oil = 30; if (!c.drone) snd.spin(); }
        }
      }

      function carsCollide() {
        for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
          const a = cars[i], b = cars[j];
          if (a.crash > 0 || b.crash > 0) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < CAR_R * 2 && d > 0.01) {
            const nx = dx / d, ny = dy / d, o = (CAR_R * 2 - d) / 2;
            a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) {
              a.vx += rv * nx * 0.8; a.vy += rv * ny * 0.8; b.vx -= rv * nx * 0.8; b.vy -= rv * ny * 0.8;
              if ((!a.drone || !b.drone) && rv < -0.6) snd.bump();
            }
          }
        }
      }

      function spawnItem() {
        if (items.length >= 2) return;
        const s = Math.random() * track.L, p = pointAt(track, s), l = (Math.random() - 0.5) * 1.1;
        const pl = player();
        if (pl && Math.hypot(p.x - pl.x, p.y - pl.y) < 40) return;
        items.push({ x: p.x + p.nx * l * track.hw, y: p.y + p.ny * l * track.hw, t: Math.random() < 0.78 ? 'wrench' : 'money', life: 900 });
      }

      function stepRaceWorld(demo) {
        for (const c of cars) {
          if (c.crash > 0) {
            c.crash--;
            if (c.crash === 0) {
              // the helicopter sets the car back down on the centre line
              const g = track.segs[c.si]; const p = projSeg(g, c.x, c.y);
              c.x = p.px; c.y = p.py; c.a = g.ang; c.vx = c.vy = 0; c.spin = 0; c.oil = 0;
            }
            continue;
          }
          if (c.finished && !c.drone) { c.vx *= 0.95; c.vy *= 0.95; c.x += c.vx; c.y += c.vy; wallCollide(c); updateProg(c); continue; }
          if (c.drone) droneAI(c);
          else {
            const steer = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
            driveCar(c, api.key('Space') || api.key('ArrowUp'), api.key('ArrowDown'), steer);
            if ((api.frame % 5) === 0 && (api.key('Space') || api.key('ArrowUp'))) {
              const f = Math.hypot(c.vx, c.vy);
              api.audio.tone(55 + f * 38, 0.08, { type: 'sawtooth', vol: 0.045 });
            }
          }
          const imp = wallCollide(c);
          if (imp > 0.5 && !c.drone) snd.bump();
          if (imp > 1.75 && !c.drone && !demo) {
            c.crash = 100; c.heli = 100; boom(c.x, c.y, 30, ['#ff0', '#f80', '#f20', '#fff']); snd.crash();
          }
          hazardEffects(c);
          const oldLap = c.lap;
          updateProg(c);
          if (c.lap > oldLap && c.lap > c.lapShown) {
            c.lapShown = c.lap;
            if (c.lap === 0) { /* crossed the line at the start */ }
            else if (c.lap >= LAPS && !c.finished && !demo) {
              c.finished = true; finishOrder.push(c); c.place = finishOrder.length;
              if (!c.drone) {
                playerPlace = c.place; addScore(PLACE_BONUS[c.place - 1]); resultTimer = 90;
                if (c.place <= 2) snd.win(); else snd.lose();
              }
            } else if (!c.drone && !demo) { addScore(500); snd.lap(); msg = c.lap === LAPS - 1 ? 'FINAL LAP' : 'LAP ' + (c.lap + 1); msgT = 70; }
          }
          if (demo && c.lap >= LAPS) { c.lap -= LAPS; c.lapShown = c.lap; }
        }
        carsCollide();
        for (const h of hazards) if (h.t === 'tornado') {
          h.ph += 0.03; const o = Math.sin(h.ph) * track.hw * 0.8;
          h.x = h.bx + h.nx * o; h.y = h.by + h.ny * o;
        }
        if (--itemTimer <= 0) { spawnItem(); itemTimer = 200 + Math.random() * 200; }
        for (let k = items.length - 1; k >= 0; k--) {
          const it = items[k];
          if (--it.life <= 0) { items.splice(k, 1); continue; }
          for (const c of cars) {
            if (c.crash > 0) continue;
            if (Math.hypot(c.x - it.x, c.y - it.y) < 9) {
              items.splice(k, 1);
              if (!c.drone && !demo) {
                if (it.t === 'wrench') { wrenches++; addScore(250); msg = 'WRENCH!'; } else { addScore(1000); msg = '1000 POINTS'; }
                msgT = 50; snd.pick();
              }
              break;
            }
          }
        }
        for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; if (--p.life <= 0) parts.splice(k, 1); }
        for (const s of skids) s[2]--;
        while (skids.length && skids[0][2] <= 0) skids.shift();
      }

      function startGame() {
        score = 0; chances = 3; race = 0; wrenches = 0; lv = { trac: 0, speed: 0, acc: 0 }; nextExtra = 50000;
        beginRace();
      }
      function beginRace() {
        setupRace(false); state = 'countdown'; timer = 200; dnfT = 0;
      }
      function finishRace() {
        // unfinished cars take the remaining places in order of progress
        const rest = cars.filter(c => !c.finished).sort((a, b) => b.prog - a.prog);
        for (const c of rest) { c.finished = true; finishOrder.push(c); c.place = finishOrder.length; }
        const p = player();
        playerPlace = p.place;
        state = 'results'; timer = 260;
      }
      function afterResults() {
        if (playerPlace > 2) {
          chances--;
          if (chances <= 0) {
            state = 'held';
            const end = () => { if (score > hi) { hi = score; } api.setHiScore(score); state = 'gameover'; timer = 300; };
            if (api.offerContinue) api.offerContinue(() => { chances = 1; nextStage(); }, end);
            else end();
            return;
          }
        }
        nextStage();
      }
      function nextStage() {
        race++;
        if (wrenches >= 3) { state = 'shop'; timer = 60 * 20; shopSel = 0; }
        else beginRace();
      }

      function tryStart() {
        if (api.useCredit()) { startGame(); return; }
        coinFlash = 90; api.audio.tone(70, 0.25, { type: 'square', vol: 0.2 });
      }

      // attract demo
      race = 0; setupRace(true);

      function update() {
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (msgT > 0) msgT--;
        switch (state) {
          case 'attract':
            attractT++;
            stepRaceWorld(true);
            if (attractT % 1500 === 0) { race = (race + 1) % TRACKS.length; setupRace(true); }
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'countdown':
            timer--;
            if (timer === 150 || timer === 100 || timer === 50) snd.beep(440, 0.15);
            if (timer <= 0) { snd.beep(880, 0.35); state = 'race'; msg = 'GO!'; msgT = 50; }
            break;
          case 'race': {
            stepRaceWorld(false);
            const p = player();
            if (p.finished) { if (--resultTimer <= 0) finishRace(); }
            else if (cars.every(c => c.finished || !c.drone)) { if (++dnfT > 240) finishRace(); }
            break;
          }
          case 'results':
            stepRaceWorld(true);
            timer--;
            if (timer <= 0 || (timer < 200 && api.anyPressed('Enter', 'Space'))) afterResults();
            break;
          case 'held': break;
          case 'shop': {
            timer--;
            if (api.pressed('ArrowUp')) { shopSel = (shopSel + 3) % 4; snd.beep(660, 0.04); }
            if (api.pressed('ArrowDown')) { shopSel = (shopSel + 1) % 4; snd.beep(660, 0.04); }
            if (api.anyPressed('Space', 'Enter', 'KeyX')) {
              const keys = ['trac', 'speed', 'acc'];
              if (shopSel === 3 || api.pressed('KeyX')) { beginRace(); break; }
              const k = keys[shopSel];
              if (lv[k] < 5 && wrenches >= 3) { lv[k]++; wrenches -= 3; snd.pick(); addScore(1000); }
              else snd.beep(110, 0.15);
              if (wrenches < 3) timer = Math.min(timer, 50);
            }
            if (timer <= 0) beginRace();
            break;
          }
          case 'gameover':
            timer--;
            stepRaceWorld(true);
            if (timer <= 0) { state = 'attract'; attractT = 0; race = 0; setupRace(true); }
            break;
        }
      }

      // ---------------- rendering ----------------
      function drawTrack(ctx) {
        ctx.fillStyle = track.grass; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = track.grass2;
        for (let y = 0; y < H; y += 16) for (let x = ((y >> 4) & 1) * 16; x < W; x += 32) ctx.fillRect(x, y, 16, 16);
        for (const t of grassTufts) { ctx.fillStyle = t[2] ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.15)'; ctx.fillRect(t[0], t[1], 2, 1); ctx.fillRect(t[0] + 1, t[1] - 1, 1, 1); }
        const path = () => {
          ctx.beginPath();
          track.pts.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
          ctx.closePath();
        };
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        path(); ctx.strokeStyle = '#111'; ctx.lineWidth = track.w + 10; ctx.stroke();
        path(); ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = track.w + 6; ctx.stroke();
        ctx.setLineDash && ctx.setLineDash([6, 6]);
        path(); ctx.strokeStyle = '#d02020'; ctx.lineWidth = track.w + 6; ctx.stroke();
        ctx.setLineDash && ctx.setLineDash([]);
        path(); ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = track.w; ctx.stroke();
        ctx.setLineDash && ctx.setLineDash([4, 8]);
        path(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.setLineDash && ctx.setLineDash([]);
        // start/finish checkers across pts[0]
        const g = track.segs[0], nx = -g.uy, ny = g.ux;
        for (let k = -track.hw; k < track.hw; k += 3) for (let r = 0; r < 2; r++) {
          ctx.fillStyle = ((((k + track.hw) / 3) | 0) + r) & 1 ? '#fff' : '#000';
          ctx.fillRect(Math.round(track.pts[0][0] + nx * k + g.ux * (r * 3 - 3)), Math.round(track.pts[0][1] + ny * k + g.uy * (r * 3 - 3)), 3, 3);
        }
        for (const s of skids) { ctx.fillStyle = 'rgba(10,10,10,' + (s[2] / 300).toFixed(2) + ')'; ctx.fillRect(s[0] - 1, s[1] - 1, 2, 2); }
        for (const h of hazards) {
          if (h.t === 'oil') {
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 9, 6, 0.4, 0, TAU); ctx.fill();
            ctx.fillStyle = '#3a2a5a'; ctx.beginPath(); ctx.ellipse(h.x - 2, h.y - 1, 4, 2, 0.4, 0, TAU); ctx.fill();
          } else if (h.t === 'puddle') {
            ctx.fillStyle = '#2a6ad8'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 11, 7, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = '#8ac0ff'; ctx.fillRect(h.x - 5 + ((api.frame >> 3) % 4), h.y - 2, 4, 1); ctx.fillRect(h.x + 1, h.y + 2, 3, 1);
          }
        }
      }
      function drawCar(ctx, c) {
        ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y)); ctx.rotate(c.a);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-5, -2, 12, 7);
        ctx.fillStyle = '#000'; ctx.fillRect(-5, -5, 3, 2); ctx.fillRect(-5, 3, 3, 2); ctx.fillRect(3, -5, 3, 2); ctx.fillRect(3, 3, 3, 2);
        ctx.fillStyle = c.col[0]; ctx.fillRect(-6, -3, 13, 6);
        ctx.fillStyle = c.col[1]; ctx.fillRect(-4, -1, 8, 2);
        ctx.fillStyle = '#123'; ctx.fillRect(1, -2, 3, 4);
        ctx.fillStyle = '#fff'; ctx.fillRect(6, -3, 1, 1); ctx.fillRect(6, 2, 1, 1);
        ctx.restore();
      }
      function drawHeli(ctx, x, y, carry, col) {
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 6, y + 10, 14, 4);
        if (carry) { ctx.fillStyle = '#888'; ctx.fillRect(x, y + 3, 1, 6); ctx.fillStyle = col; ctx.fillRect(x - 6, y + 8, 13, 6); }
        ctx.fillStyle = '#c8c8d0'; ctx.fillRect(x - 6, y - 4, 12, 7); ctx.fillRect(x + 6, y - 2, 10, 2); ctx.fillRect(x + 15, y - 5, 2, 6);
        ctx.fillStyle = '#3af'; ctx.fillRect(x - 6, y - 3, 4, 4);
        ctx.fillStyle = '#222';
        const r = (api.frame >> 1) & 1;
        if (r) ctx.fillRect(x - 14, y - 6, 28, 1); else ctx.fillRect(x - 1, y - 14, 1, 18);
      }
      function drawItems(ctx) {
        for (const it of items) {
          if (it.life < 120 && (it.life >> 2) & 1) continue;
          const x = Math.round(it.x), y = Math.round(it.y);
          if (it.t === 'wrench') {
            ctx.fillStyle = '#ffd21e'; ctx.fillRect(x - 4, y + 1, 7, 2); ctx.fillRect(x + 2, y - 1, 3, 2); ctx.fillRect(x + 2, y + 3, 3, 2); ctx.fillRect(x - 6, y, 3, 4);
            ctx.fillStyle = '#fff8a0'; ctx.fillRect(x - 4, y + 1, 5, 1);
          } else {
            ctx.fillStyle = '#e0d0a0'; ctx.fillRect(x - 4, y - 3, 8, 8); ctx.fillRect(x - 2, y - 5, 4, 2);
            text(ctx, '$', x - 2, y - 3, '#286028', 1);
          }
        }
      }
      function drawWorld(ctx) {
        drawTrack(ctx);
        drawItems(ctx);
        for (const c of cars) if (c.crash <= 0) drawCar(ctx, c);
        for (const c of cars) if (c.crash > 0) {
          if (c.crash > 60) {
            ctx.fillStyle = '#333'; ctx.fillRect(c.x - 6, c.y - 4, 12, 8);
            if ((api.frame >> 2) & 1) { ctx.fillStyle = '#f80'; ctx.fillRect(c.x - 3, c.y - 6, 6, 4); }
          }
          // helicopter: flies in from off-screen, then lowers the car
          const g = track.segs[c.si], p = projSeg(g, c.x, c.y);
          const t = c.crash;
          if (t < 70) {
            const k = Math.max(0, (t - 20) / 50);
            const hx = p.px + k * 160, hy = p.py - 10 - k * 60;
            drawHeli(ctx, Math.round(hx), Math.round(hy), true, c.col[0]);
          }
        }
        for (const h of hazards) if (h.t === 'tornado') {
          for (let k = 0; k < 6; k++) {
            const r = 2 + k * 1.6, a = api.frame * 0.4 + k;
            ctx.fillStyle = k & 1 ? '#bbb' : '#777';
            ctx.fillRect(Math.round(h.x + Math.cos(a) * r * 0.6 - r / 2), Math.round(h.y - k * 3 + 6), Math.round(r), 2);
          }
        }
        for (const p of parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
      }
      function hud(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 12);
        const p = player();
        text(ctx, 'SCORE ' + String(score).padStart(6, '0'), 3, 3, '#ff4a3a');
        text(ctx, 'HI ' + String(Math.max(hi, score)).padStart(6, '0'), W / 2 - 10, 3, '#fff', 1, 'center');
        if (p) text(ctx, 'LAP ' + Math.min(LAPS, Math.max(1, p.lap + 1)) + '/' + LAPS, W - 3, 3, '#ffd21e', 1, 'right');
        // wrench count + chances
        ctx.fillStyle = '#ffd21e'; ctx.fillRect(3, H - 6, 6, 2); ctx.fillRect(8, H - 8, 2, 2); ctx.fillRect(8, H - 4, 2, 2);
        text(ctx, 'X' + wrenches, 12, H - 8, '#ffd21e');
        for (let k = 0; k < Math.min(6, chances); k++) { ctx.fillStyle = '#e8242a'; ctx.fillRect(40 + k * 10, H - 7, 8, 4); ctx.fillStyle = '#000'; ctx.fillRect(41 + k * 10, H - 8, 2, 1); ctx.fillRect(45 + k * 10, H - 8, 2, 1); }
        // running order
        if (state === 'race' && p) {
          const ord = cars.filter(c => !c.finished).sort((a, b) => b.prog - a.prog);
          const all = finishOrder.concat(ord);
          all.forEach((c, k) => { ctx.fillStyle = c.col[0]; ctx.fillRect(W - 52 + k * 13, H - 8, 10, 6); if (!c.drone) { ctx.fillStyle = '#fff'; ctx.fillRect(W - 52 + k * 13, H - 2, 10, 1); } });
        }
      }
      function panel(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(0,0,20,.86)'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#ffd21e'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawWorld(ctx);
        const blink = (api.frame >> 4) & 1;
        if (state === 'attract' || state === 'gameover') {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 12);
          text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2, 3, '#fff', 1, 'center');
          if (state === 'gameover') {
            panel(ctx, 80, 90, 160, 50);
            text(ctx, 'GAME OVER', W / 2, 98, '#ff3a2a', 2, 'center');
            text(ctx, 'SCORE ' + score, W / 2, 120, '#fff', 1, 'center');
          } else {
            const ph = (attractT >> 8) % 2;
            panel(ctx, 56, 70, 208, 104);
            text(ctx, 'SUPER', W / 2 + 1, 79, '#600', 3, 'center'); text(ctx, 'SUPER', W / 2, 78, '#ff3a2a', 3, 'center');
            text(ctx, 'SPRINT', W / 2 + 1, 103, '#640', 3, 'center'); text(ctx, 'SPRINT', W / 2, 102, '#ffd21e', 3, 'center');
            if (ph === 0) {
              text(ctx, 'RACE 4 LAPS VS THE DRONES', W / 2, 130, '#fff', 1, 'center');
              text(ctx, 'FINISH 1ST OR 2ND TO QUALIFY', W / 2, 140, '#9ab4ff', 1, 'center');
            } else {
              text(ctx, '3 WRENCHES = 1 UPGRADE', W / 2, 130, '#ffd21e', 1, 'center');
              text(ctx, 'TRACTION  SPEED  ACCELERATION', W / 2, 140, '#a0ffb4', 1, 'center');
            }
            if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 156, '#fff', 1, 'center'); }
            else if (api.credits > 0) text(ctx, 'PUSH START', W / 2, 156, blink ? '#fff' : '#888', 1, 'center');
            else if (blink) text(ctx, 'INSERT COIN', W / 2, 156, '#fff', 1, 'center');
            text(ctx, '\u00a9 1986 ATARI GAMES', W / 2, 224, '#ddd', 1, 'center');
          }
          ctx.fillStyle = '#000'; ctx.fillRect(0, H - 10, 70, 10);
          text(ctx, credStr(), 3, H - 8, '#aaa');
          return;
        }
        if (state === 'shop') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
          panel(ctx, 50, 40, 220, 160);
          text(ctx, 'UPGRADE YOUR CAR', W / 2, 50, '#ffd21e', 1, 'center');
          text(ctx, 'WRENCHES ' + wrenches + '   COST 3', W / 2, 64, '#fff', 1, 'center');
          const names = ['SUPER TRACTION', 'HIGHER TOP SPEED', 'TURBO ACCELERATION', 'DONE - RACE!'];
          const vals = [lv.trac, lv.speed, lv.acc];
          for (let k = 0; k < 4; k++) {
            const y = 86 + k * 24, sel = k === shopSel;
            if (sel) { ctx.fillStyle = '#2a3a8a'; ctx.fillRect(58, y - 4, 204, 16); }
            text(ctx, (sel ? '>' : ' ') + names[k], 62, y, sel ? '#fff' : '#9ab4ff');
            if (k < 3) for (let j = 0; j < 5; j++) { ctx.fillStyle = j < vals[k] ? '#ffd21e' : '#333'; ctx.fillRect(62 + j * 8, y + 9, 6, 2); }
          }
          text(ctx, 'NEXT: ' + TRACKS[race % TRACKS.length].name, W / 2, 186, '#a0ffb4', 1, 'center');
          hud(ctx);
          return;
        }
        hud(ctx);
        if (state === 'countdown') {
          panel(ctx, 100, 70, 120, 74);
          text(ctx, 'RACE ' + (race + 1), W / 2, 78, '#fff', 1, 'center');
          text(ctx, track.name, W / 2, 90, '#ffd21e', 1, 'center');
          const n = Math.ceil(timer / 50) - 1;
          for (let k = 0; k < 3; k++) {
            ctx.fillStyle = k < 3 - n ? (n === 0 ? '#2f2' : '#f22') : '#400';
            ctx.beginPath(); ctx.arc(W / 2 - 20 + k * 20, 116, 6, 0, TAU); ctx.fill();
          }
          text(ctx, 'QUALIFY: TOP 2', W / 2, 130, '#9ab4ff', 1, 'center');
        }
        if (state === 'results') {
          panel(ctx, 80, 60, 160, 110);
          text(ctx, 'RACE RESULTS', W / 2, 68, '#ffd21e', 1, 'center');
          finishOrder.forEach((c, k) => {
            const y = 84 + k * 14;
            text(ctx, PLACE_NAME[k], 96, y, '#fff');
            ctx.fillStyle = c.col[0]; ctx.fillRect(126, y - 1, 16, 9);
            text(ctx, c.drone ? 'DRONE' : 'YOU', 150, y, c.drone ? '#aaa' : '#fff');
            if (!c.drone) text(ctx, '+' + PLACE_BONUS[k], 234, y, '#a0ffb4', 1, 'right');
          });
          const q = playerPlace <= 2;
          if (blink || !q) text(ctx, q ? 'QUALIFIED!' : 'DID NOT QUALIFY', W / 2, 146, q ? '#2f2' : '#f44', 1, 'center');
          if (!q) text(ctx, 'CHANCES LEFT ' + Math.max(0, chances - 1), W / 2, 157, '#fff', 1, 'center');
        }
        if (msgT > 0 && state === 'race') text(ctx, msg, W / 2, 112, (msgT >> 2) & 1 ? '#fff' : '#ffd21e', 2, 'center');
        const p = player();
        if (state === 'race' && p && p.finished) text(ctx, 'FINISHED ' + PLACE_NAME[p.place - 1], W / 2, 112, '#fff', 2, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
