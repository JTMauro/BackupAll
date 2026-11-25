// Sprint 2 (Kee Games/Atari, 1976) - top-down whole-track racing: 4-speed shifter, 3 drone cars, oil slicks, lap counter, timed race, rotating tracks.
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
  // Sprint 2: tracks (closed loops of control points, smoothed with Catmull-Rom)
  // ======================================================================
  const W = 320, H = 240, HW = 13;   // HW: half the track width
  const TRACKS = [
    { name: 'TRACK 1', pts: [[160,44],[262,44],[298,80],[298,176],[262,214],[160,214],[58,214],[22,176],[22,80],[58,44]] },
    { name: 'TRACK 2', pts: [[100,42],[138,46],[154,80],[160,93],[173,99],[186,93],[192,80],[208,46],[262,40],[298,80],[296,190],[256,216],[214,202],[187,172],[181,159],[168,153],[155,159],[149,172],[122,202],[72,216],[26,190],[22,90],[50,46]] },
    { name: 'TRACK 3', pts: [[150,40],[262,40],[298,64],[292,104],[240,118],[198,120],[183,126],[177,141],[183,156],[198,162],[240,164],[292,178],[298,204],[262,220],[150,220],[58,218],[24,192],[36,156],[78,152],[93,146],[99,131],[93,116],[78,110],[36,106],[24,70],[58,40]] },
    { name: 'TRACK 4', pts: [[120,40],[190,40],[230,60],[226,90],[236,112],[270,120],[298,130],[298,180],[270,214],[206,214],[176,194],[170,180],[156,174],[142,180],[136,194],[104,214],[48,214],[20,182],[44,148],[58,142],[64,128],[58,114],[44,108],[22,76],[44,44]] }
  ];
  function resample(pts, step) {
    const out = [pts[0]], n = pts.length; let carry = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let t = step - carry;
      while (t <= L) { out.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]); t += step; }
      carry = L - (t - step);
    }
    const last = out[out.length - 1]; if (Math.hypot(last[0] - out[0][0], last[1] - out[0][1]) < step * 0.5) out.pop();
    return out;
  }
  function buildTrack(def) {
    const P = def.pts.map(p => [p[0], 36 + (p[1] - 36) * 0.94]), n = P.length, out = [];
    const SUB = 10;
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < SUB; k++) {
        const t = k / SUB, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    const rs = resample(out, 4); out.length = 0; for (const q of rs) out.push(q);
    // direction and curvature at each sample (samples are 4px apart)
    const N = out.length, dir = [], curv = [];
    for (let i = 0; i < N; i++) { const a = out[i], b = out[(i + 1) % N]; dir.push(Math.atan2(b[1] - a[1], b[0] - a[0])); }
    for (let i = 0; i < N; i++) { let d = dir[(i + 1) % N] - dir[i]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; curv.push(d); }
    // safe speed at each sample from the local turn radius, then eased backwards so drones brake in time
    const vmax = [];
    for (let i = 0; i < N; i++) { let k = 0; for (let j = -4; j < 4; j++) k += curv[(i + j + N) % N]; const r = 32 / Math.max(0.01, Math.abs(k)); vmax.push(Math.min(4, r * 0.042)); }
    for (let pass = 0; pass < 2; pass++) for (let i = N - 1; i >= 0; i--) vmax[i] = Math.min(vmax[i], vmax[(i + 1) % N] + 0.05);
    return { name: def.name, pts: out, N, dir, curv, vmax };
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  // ---------- car sprites: 16 rotations of a tiny top-down racer ----------
  const NROT = 32;
  const CAR = [
    '.kk.kk.',
    '.kXXXk.',
    '..XwX..',
    '.XXXXX.',
    'kXwwwXk',
    'kXXXXXk',
    '..XXX..',
    '.XXXXX.',
    'kkXXXkk',
    'kk...kk'];
  function carSet(body, trim) {
    const base = paint(CAR, { k: '#202020', X: body, w: trim });
    const set = [];
    for (let i = 0; i < NROT; i++) {
      const [c, x] = mkCanvas(13, 13);
      x.translate(6.5, 6.5); x.rotate(i / NROT * Math.PI * 2 + Math.PI / 2); x.drawImage(base, -3.5, -5);
      set.push(c);
    }
    return set;
  }
  const rotIdx = a => ((Math.round(a / (Math.PI * 2) * NROT) % NROT) + NROT) % NROT;

  ArcadeRegistry.register({
    id: 'sprint2', title: 'Sprint 2', year: 1976, maker: 'Kee Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: steer \u00b7 Space/Up: gas \u00b7 X: shift up \u00b7 Down/Z: shift down \u00b7 Enter: start',
    marquee: { bg: '#202020', fg: '#ffffff', accent: '#c0c0c0' },
    create(api) {
      const au = api.audio;
      const tracks = TRACKS.map(buildTrack);
      const SETS = [carSet('#ffffff', '#202020'), carSet('#b8b8b8', '#ffffff'), carSet('#808080', '#ffffff'), carSet('#d8d8d8', '#606060')];
      const GEAR_MAX = [0, 1.05, 1.7, 2.35, 2.95];
      const GEAR_ACC = [0, 0.055, 0.038, 0.026, 0.017];

      // ---------- pre-rendered tracks ----------
      const trackImg = tracks.map(t => {
        const [c, x] = mkCanvas(W, H);
        x.fillStyle = '#5c5c5c'; x.fillRect(0, 0, W, H);
        // speckled grass / dirt
        let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        x.fillStyle = '#686868'; for (let i = 0; i < 700; i++) x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1);
        const path = () => { x.beginPath(); t.pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); };
        x.lineJoin = 'round'; x.lineCap = 'round';
        path(); x.strokeStyle = '#ffffff'; x.lineWidth = HW * 2 + 4; x.stroke();
        path(); x.strokeStyle = '#0c0c0c'; x.lineWidth = HW * 2; x.stroke();
        // start / finish line, chequered across the track at sample 0
        const p = t.pts[0], d = t.dir[0], nx = -Math.sin(d), ny = Math.cos(d);
        for (let k = -HW; k < HW; k += 2) for (let j = 0; j < 2; j++) {
          x.fillStyle = ((k / 2 + j) & 1) ? '#ffffff' : '#0c0c0c';
          x.fillRect(Math.round(p[0] + nx * k + Math.cos(d) * j * 2), Math.round(p[1] + ny * k + Math.sin(d) * j * 2), 2, 2);
        }
        return c;
      });

      // ---------- state ----------
      let hi = api.getHiScore(10);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null, demo = null;
      const LAPS_PER_TRACK = 4;

      function makeCars(tr, round) {
        const cars = [];
        const lanes = [-6, 6, -6, 6];
        for (let i = 0; i < 4; i++) {
          const idx = (tr.N - 3 - Math.floor(i / 2) * 3 - (i % 2) * 1) % tr.N;
          const p = tr.pts[idx], d = tr.dir[idx];
          const nx = -Math.sin(d), ny = Math.cos(d);
          cars.push({
            id: i, drone: i > 0, x: p[0] + nx * lanes[i], y: p[1] + ny * lanes[i], a: d, m: d, v: 0, gear: 1, idx, lap: -1, best: -1,
            crash: 0, oil: 0, lane: lanes[i] * 0.6, skill: [0, 0.93, 1.0, 1.04][i] * (2.15 + Math.min(0.75, round * 0.11)), lookT: 0, done: false
          });
        }
        return cars;
      }
      function makeOil(tr, n) {
        const out = [];
        for (let i = 0; i < n; i++) {
          const idx = Math.floor(tr.N * (0.18 + i * 0.75 / n + Math.random() * 0.12)) % tr.N;
          const p = tr.pts[idx], d = tr.dir[idx], off = (Math.random() - 0.5) * HW;
          out.push({ x: p[0] - Math.sin(d) * off, y: p[1] + Math.cos(d) * off, r: 6 + Math.random() * 2 });
        }
        return out;
      }
      function newGame() {
        g = { time: 90 * 60, laps: 0, round: 0, trackNo: 0, phase: 'count', t: 0, msg: '', msgT: 0, extended: false };
        loadTrack(0);
      }
      function loadTrack(k) {
        g.trackNo = k % tracks.length; g.tr = tracks[g.trackNo];
        g.cars = makeCars(g.tr, g.round);
        g.oil = makeOil(g.tr, 2 + Math.min(3, g.round));
        g.phase = 'count'; g.t = 200; g.trackLaps = 0; g.places = [];
      }
      function startDemo() {
        const tr = tracks[Math.floor(titleT / 1800) % tracks.length];
        demo = { tr, cars: makeCars(tr, 2), oil: makeOil(tr, 2) };
        demo.cars[0].drone = true; demo.cars[0].skill = 2.3;
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

      // ---------- track geometry ----------
      function nearest(tr, x, y, hint) {
        let best = 0, bd = 1e9, bt = 0;
        const N = tr.N, P = tr.pts;
        const scan = (i) => {
          const a = P[i], b = P[(i + 1) % N];
          const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
          const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L, 0, 1);
          const px = a[0] + dx * t - x, py = a[1] + dy * t - y, d = px * px + py * py;
          if (d < bd) { bd = d; best = i; bt = t; }
        };
        for (let i = 0; i < N; i++) scan(i);
        return { idx: best, t: bt, dist: Math.sqrt(bd) };
      }
      function progress(c, N) { return c.lap * N + c.idx; }

      // ---------- car physics ----------
      function stepCar(c, ctl, ctx) {
        const tr = ctx.tr;
        if (c.crash > 0) {
          c.crash--; c.a += 0.25; c.v = 0;
          if (c.crash === 0) {
            // back on the track, pointing the right way
            const nr = nearest(tr, c.x, c.y), p = tr.pts[nr.idx], d = tr.dir[nr.idx];
            const off = clamp((c.x - p[0]) * -Math.sin(d) + (c.y - p[1]) * Math.cos(d), -HW + 6, HW - 6);
            c.x = p[0] - Math.sin(d) * off; c.y = p[1] + Math.cos(d) * off; c.a = c.m = d; c.gear = 1;
          }
          return;
        }
        // gearbox and throttle
        const top = GEAR_MAX[c.gear];
        let acc = GEAR_ACC[c.gear];
        if (c.gear >= 3 && c.v < GEAR_MAX[c.gear - 2]) acc *= 0.3;     // lugging in a tall gear
        if (ctl.gas) { if (c.v < top) c.v = Math.min(top, c.v + acc); else c.v -= 0.03; }
        else c.v = Math.max(0, c.v - 0.022);
        // steering
        const turn = 0.072 * clamp(c.v / 0.8, 0.2, 1) * (c.oil > 0 ? 0.4 : 1);
        c.a += ctl.steer * turn;
        if (c.oil > 0) { c.oil--; c.a += Math.sin(frame * 0.4 + c.id) * 0.06; }
        const grip = c.oil > 0 ? 0.04 : 0.3 - Math.min(0.12, c.v * 0.035);
        c.m += angDiff(c.a, c.m) * grip;
        c.x += Math.cos(c.m) * c.v; c.y += Math.sin(c.m) * c.v;
        // walls
        const nr = nearest(tr, c.x, c.y);
        if (nr.dist > HW - 3) {
          if (c.v > (c.drone ? 1.9 : 0.7)) { c.crash = 40; if (!c.drone) au.noise(0.5, { vol: .22, freq: 2200, slideTo: 150 }); else if (ctx === g) au.noise(0.3, { vol: .08, freq: 1500 }); }
          // push back inside
          const p = tr.pts[nr.idx], q = tr.pts[(nr.idx + 1) % tr.N];
          const px = p[0] + (q[0] - p[0]) * nr.t, py = p[1] + (q[1] - p[1]) * nr.t;
          const k = (HW - 3.2) / nr.dist;
          c.x = px + (c.x - px) * k; c.y = py + (c.y - py) * k;
          if (c.crash > 0) c.v *= 0.5;
          else {
            // scrape along the wall: velocity follows the wall, the nose is nudged round
            let td = tr.dir[nr.idx]; if (Math.abs(angDiff(c.m, td)) > Math.PI / 2) td += Math.PI;
            c.m = td; c.a += clamp(angDiff(td, c.a), -0.1, 0.1); c.v *= 0.85;
          }
        }
        // oil
        for (const o of ctx.oil) if (Math.hypot(o.x - c.x, o.y - c.y) < o.r && c.oil <= 0 && c.v > 0.5) { c.oil = 45; if (!c.drone) au.noise(0.5, { vol: .1, freq: 5000, type: 'highpass' }); }
        // lap counting
        const old = c.idx; c.idx = nr.idx;
        const N = tr.N;
        if (old > N * 0.75 && c.idx < N * 0.25) { c.lap++; return 'lap'; }
        if (old < N * 0.25 && c.idx > N * 0.75) c.lap--;
        return null;
      }
      function droneControl(c, tr, cars) {
        const N = tr.N, i = c.idx, p = tr.pts[i], d = tr.dir[i];
        const lat = (c.x - p[0]) * -Math.sin(d) + (c.y - p[1]) * Math.cos(d);
        const la = 2 + Math.round(c.v * 2.5);
        let lane = c.lane, vt = Math.min(c.skill, tr.vmax[(i + 2) % N] * (0.9 + c.skill * 0.04));
        // look for a car just ahead: pull out to pass it, or tuck in behind
        if (cars) for (const o of cars) {
          if (o === c) continue;
          const dx = o.x - c.x, dy = o.y - c.y, fwd = dx * Math.cos(c.a) + dy * Math.sin(c.a), side = -dx * Math.sin(c.a) + dy * Math.cos(c.a);
          if (fwd > 0 && fwd < 24 && Math.abs(side) < 9) { lane = side > 0 ? -7 : 7; if (fwd < 12) vt = Math.min(vt, o.v); }
        }
        const want = tr.dir[(i + la) % N] + clamp((lane - lat) * 0.12, -0.6, 0.6);
        // drones run on an automatic box
        c.gear = c.v < GEAR_MAX[1] * 0.92 ? 1 : c.v < GEAR_MAX[2] * 0.92 ? 2 : c.v < GEAR_MAX[3] * 0.94 ? 3 : 4;
        if (c.v > vt + 0.15) c.v -= 0.03;   // drones brake for corners
        return { steer: clamp(angDiff(want, c.a) * 5, -1, 1), gas: c.v < vt };
      }
      function collideCars(cars) {
        for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
          const a = cars[i], b = cars[j];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 8 && d > 0.01) {
            const push = (8 - d) / 2, nx = dx / d, ny = dy / d;
            a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
            // the faster car loses some speed; a hard hit spins both a little
            const rel = Math.abs(a.v - b.v);
            a.v *= 0.85; b.v *= 0.85;
            if (rel > 0.9) { a.a += 0.15 * Math.sign(Math.random() - 0.5); b.a += 0.15 * Math.sign(Math.random() - 0.5); }
            if ((!a.drone || !b.drone) && frame % 6 === 0 && g) au.tone(90, .06, { type: 'square', vol: .12 });
          }
        }
      }
      function placeOf(cars, c, N) {
        let p = 1; for (const o of cars) if (o !== c && progress(o, N) > progress(c, N)) p++;
        return p;
      }
      const ORD = ['', '1ST', '2ND', '3RD', '4TH'];

      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (!demo || titleT % 1800 === 1) startDemo();
          for (const c of demo.cars) stepCar(c, droneControl(c, demo.tr, demo.cars), demo);
          collideCars(demo.cars);
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (g.msgT > 0) g.msgT--;
        const me = g.cars[0];
        if (g.phase === 'count') {
          g.t--;
          if (g.t % 50 === 0 && g.t > 0) au.tone(g.t === 50 ? 880 : 440, .15, { type: 'square', vol: .12 });
          if (g.t <= 0) { g.phase = 'race'; au.tone(1320, .3, { type: 'square', vol: .14 }); }
          // gear can be chosen on the grid
          if (api.pressed('KeyX')) me.gear = Math.min(4, me.gear + 1);
          if (api.pressed('ArrowDown') || api.pressed('KeyZ')) me.gear = Math.max(1, me.gear - 1);
          return;
        }
        if (g.phase === 'race') {
          g.time--;
          if (g.time <= 0) {
            g.time = 0; g.phase = 'wait';
            const end = () => { api.setHiScore(g.laps); if (g.laps > hi) hi = g.laps; g.phase = 'over'; g.t = 360; au.melody([[440, .2], [392, .2], [349, .2], [330, .5]], { type: 'square', vol: .1 }); };
            if (api.offerContinue) api.offerContinue(() => { g.time = 60 * 60; g.phase = 'race'; }, end); else end();
            return;
          }
          if (g.time === 10 * 60) au.tone(660, .3, { type: 'square', vol: .12 });
          // player controls
          if (api.pressed('KeyX')) { me.gear = Math.min(4, me.gear + 1); au.tone(200, .04, { type: 'square', vol: .1 }); }
          if (api.pressed('ArrowDown') || api.pressed('KeyZ')) { me.gear = Math.max(1, me.gear - 1); au.tone(160, .04, { type: 'square', vol: .1 }); }
          const ctl = { steer: (api.key('ArrowLeft') ? -1 : 0) + (api.key('ArrowRight') ? 1 : 0), gas: api.key('Space') || api.key('ArrowUp') };
          const r = stepCar(me, ctl, g);
          if (r === 'lap' && me.lap > 0) {
            if (me.lap > me.best) {
              me.best = me.lap; g.laps++; g.trackLaps++;
              au.melody([[880, .06], [1175, .1]], { type: 'square', vol: .12 });
              if (g.laps > hi) hi = g.laps;
              if (!g.extended && g.laps >= 8) { g.extended = true; g.time += 45 * 60; g.msg = 'EXTENDED PLAY +45'; g.msgT = 180; au.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .12 }); }
            }
          }
          for (let i = 1; i < 4; i++) {
            const c = g.cars[i];
            const rr = stepCar(c, droneControl(c, g.tr, g.cars), g);
            if (rr === 'lap' && c.lap > c.best) c.best = c.lap;
          }
          collideCars(g.cars);
          // engine note follows revs within the gear
          if (frame % 4 === 0) {
            const rev = me.v / GEAR_MAX[me.gear];
            au.tone(55 + rev * 110 + me.gear * 12, .08, { type: 'sawtooth', vol: me.crash ? .01 : .035 });
          }
          if (g.trackLaps >= LAPS_PER_TRACK) {
            const pl = placeOf(g.cars, me, g.tr.N);
            g.place = pl; g.bonus = [0, 30, 20, 10, 0][pl];
            g.time += g.bonus * 60;
            g.phase = 'finish'; g.t = 240;
            au.melody(pl === 1 ? [[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]] : [[523, .12], [659, .12], [784, .25]], { type: 'square', vol: .12 });
          }
          return;
        }
        if (g.phase === 'finish') {
          // everybody coasts
          for (const c of g.cars) stepCar(c, c.drone ? droneControl(c, g.tr, g.cars) : { steer: 0, gas: false }, g);
          collideCars(g.cars);
          if (--g.t <= 0) { g.round++; loadTrack(g.trackNo + 1); }
          return;
        }
        if (g.phase === 'over') { if (--g.t <= 0 || (g.t < 280 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; demo = null; } }
      }

      // ======================================================================
      // Rendering
      // ======================================================================
      function drawCars(ctx, cars) {
        for (let i = cars.length - 1; i >= 0; i--) {
          const c = cars[i];
          const img = SETS[i][rotIdx(c.a)];
          if (c.crash > 0 && (c.crash >> 2) & 1) {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(c.x) - 4, Math.round(c.y) - 1, 8, 2); ctx.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 4, 2, 8);
          }
          ctx.drawImage(img, Math.round(c.x) - 6, Math.round(c.y) - 6);
        }
      }
      function drawOil(ctx, oil) {
        for (const o of oil) {
          const x = Math.round(o.x), y = Math.round(o.y), r = Math.round(o.r);
          ctx.fillStyle = '#3c3c3c'; ctx.fillRect(x - r, y - r + 2, r * 2, r * 2 - 4); ctx.fillRect(x - r + 2, y - r, r * 2 - 4, r * 2);
          ctx.fillStyle = '#5a5a5a'; ctx.fillRect(x - 2, y - 2, 3, 2); ctx.fillRect(x + 2, y + 1, 2, 1);
        }
      }
      function bigNum(ctx, n, x, y, col) { text(ctx, String(n), x, y, col, 2, 'center'); }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') {
          ctx.drawImage(trackImg[tracks.indexOf(demo ? demo.tr : tracks[0])], 0, 0);
          if (demo) { drawOil(ctx, demo.oil); drawCars(ctx, demo.cars); }
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(64, 64, 192, 112);
          textS(ctx, 'SPRINT 2', W / 2, 72, ['#ffffff', '#f0f0f0', '#e0e0e0', '#d0d0d0', '#c0c0c0', '#b0b0b0', '#a0a0a0'], 3, 'center');
          text(ctx, '1 PLAYER VS 3 DRONES', W / 2, 102, '#ffffff', 1, 'center');
          text(ctx, 'SHIFT THROUGH 4 GEARS', W / 2, 114, '#c0c0c0', 1, 'center');
          text(ctx, 'BEAT THE CLOCK - COUNT LAPS', W / 2, 124, '#c0c0c0', 1, 'center');
          text(ctx, 'BEST ' + hi + ' LAPS', W / 2, 138, '#ffffff', 1, 'center');
          if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 156, '#ffffff', 1, 'center'); }
          else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 156, '#ffffff', 1, 'center');
          text(ctx, '\u00a9 1976 KEE GAMES', W / 2, 166, '#909090', 1, 'center');
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 12);
          text(ctx, 'CREDIT ' + pad2(api.credits), 4, 3, '#ffffff', 1);
          return;
        }
        ctx.drawImage(trackImg[g.trackNo], 0, 0);
        drawOil(ctx, g.oil);
        drawCars(ctx, g.cars);
        // HUD across the top (Sprint 2 style: lap scores per car, time in the middle)
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 14);
        const me = g.cars[0];
        text(ctx, 'LAPS', 4, 4, '#ffffff', 1); text(ctx, pad2(g.laps), 34, 4, '#ffffff', 1);
        text(ctx, 'TIME', 128, 4, '#ffffff', 1);
        const secs = Math.ceil(g.time / 60);
        text(ctx, String(secs).padStart(3, ' '), 156, 4, secs <= 10 && (frame >> 3) & 1 ? '#808080' : '#ffffff', 1);
        text(ctx, 'GEAR ' + me.gear, 196, 4, '#ffffff', 1);
        text(ctx, ORD[placeOf(g.cars, me, g.tr.N)], 256, 4, '#ffffff', 1);
        text(ctx, 'HI ' + hi, W - 4, 4, '#a0a0a0', 1, 'right');
        // drone lap tallies in the corners
        text(ctx, g.tr.name + '  LAP ' + Math.min(LAPS_PER_TRACK, g.trackLaps + 1) + '/' + LAPS_PER_TRACK, W / 2, H - 9, '#d0d0d0', 1, 'center');
        // speed bar
        ctx.fillStyle = '#202020'; ctx.fillRect(4, H - 9, 50, 5);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(4, H - 9, Math.round(50 * me.v / GEAR_MAX[4]), 5);
        for (let k = 1; k < 4; k++) { ctx.fillStyle = '#000'; ctx.fillRect(4 + Math.round(50 * GEAR_MAX[k] / GEAR_MAX[4]), H - 9, 1, 5); }
        if (g.msgT > 0) textS(ctx, g.msg, W / 2, 120, '#ffffff', 1, 'center');
        if (g.phase === 'count') {
          const n = Math.ceil(g.t / 50) - 1;
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(110, 100, 100, 40);
          textS(ctx, g.tr.name, W / 2, 104, '#ffffff', 1, 'center');
          if (n > 0) bigNum(ctx, n, W / 2, 118, '#ffffff'); else text(ctx, 'GO!', W / 2, 118, '#ffffff', 2, 'center');
          text(ctx, 'GEAR ' + me.gear, W / 2, 150, '#c0c0c0', 1, 'center');
        }
        if (g.phase === 'finish') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(90, 96, 140, 48);
          textS(ctx, 'FINISHED ' + ORD[g.place], W / 2, 102, '#ffffff', 1, 'center');
          textS(ctx, g.bonus ? 'BONUS TIME +' + g.bonus : 'NO BONUS TIME', W / 2, 116, '#d0d0d0', 1, 'center');
          textS(ctx, 'NEXT: ' + tracks[(g.trackNo + 1) % tracks.length].name, W / 2, 130, '#a0a0a0', 1, 'center');
        }
        if (g.phase === 'over' || g.phase === 'wait') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(90, 100, 140, 40);
          textS(ctx, 'GAME OVER', W / 2, 106, '#ffffff', 2, 'center');
          text(ctx, g.laps + ' LAPS', W / 2, 126, '#c0c0c0', 1, 'center');
        }
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode, tracks, nearest, droneControl, stepCar, makeCars, makeOil, collideCars });
      return { update, render, destroy() { } };
    }
  });
})();
