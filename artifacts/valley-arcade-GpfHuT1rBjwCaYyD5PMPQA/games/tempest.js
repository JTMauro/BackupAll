// Tempest (Atari, 1981) — colour vector recreation
(function () {
  'use strict';
  const W = 360, H = 480;
  const CX = 180, CY = 268, RX = 158, RY = 158, K = 5.2;

  // ---------- Vector font (4x6 grid) ----------
  const VF = {
    A: '0602204246 0343', B: '003041423303 334445360600', C: '40000646', D: '00304244360600',
    E: '40000646 0333', F: '400006 0333', G: '400006464323', H: '0006 4046 0343', I: '0040 2026 0646',
    J: '40460604', K: '0006 400346', L: '000646', M: '0600224046', N: '06004640', O: '0040460600',
    P: '0600404303', Q: '0040460600 2446', R: '0600404303 1346', S: '400003434606', T: '0040 2026',
    U: '00064640', V: '002640', W: '0006244640', X: '0046 4006', Y: '002240 2226', Z: '00400646',
    '0': '0040460600', '1': '2026', '2': '004043030646', '3': '00404606 0343', '4': '000343 4046',
    '5': '400003434606', '6': '0006464303', '7': '004046', '8': '0040460600 0343', '9': '4303004046',
    '-': '0343', '.': '2526', ':': '2122 2425', '!': '2024 2526', '/': '4006', '=': '0242 0444', "'": '2022', ',': '2516'
  };

  // ---------- Webs ----------
  function edgesToPts(verts, counts, closed) {
    const pts = [], n = verts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = verts[i], b = verts[(i + 1) % n], c = counts[i];
      for (let k = 0; k < c; k++) pts.push([a[0] + (b[0] - a[0]) * k / c, a[1] + (b[1] - a[1]) * k / c]);
    }
    if (!closed) pts.push(verts[n - 1].slice());
    return pts;
  }
  function resample(fn, closed, n) {
    const S = 800, dense = [], acc = [0];
    for (let i = 0; i <= S; i++) dense.push(fn(i / S));
    for (let i = 1; i <= S; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const total = acc[S], cnt = closed ? n : n - 1, out = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const target = total * k / cnt;
      while (j < S - 1 && acc[j + 1] < target) j++;
      const f = (target - acc[j]) / Math.max(1e-9, acc[j + 1] - acc[j]);
      out.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
    }
    return out;
  }
  function radial(rf, off) {
    const p = [];
    for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + off + i * Math.PI / 8; const r = rf(i); p.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return p;
  }
  const PL = 0.42;
  const SHAPES = [
    { name: 'CIRCLE', closed: true, pts: radial(() => 1, Math.PI / 16) },
    { name: 'SQUARE', closed: true, pts: edgesToPts([[-1, -1], [1, -1], [1, 1], [-1, 1]], [4, 4, 4, 4], true) },
    { name: 'PLUS', closed: true, pts: edgesToPts([[-PL, -1], [PL, -1], [PL, -PL], [1, -PL], [1, PL], [PL, PL], [PL, 1], [-PL, 1], [-PL, PL], [-1, PL], [-1, -PL], [-PL, -PL]], [2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1], true) },
    { name: 'BOWTIE', closed: true, pts: edgesToPts([[-1, -0.8], [0, -0.3], [1, -0.8], [1, 0.8], [0, 0.3], [-1, 0.8]], [3, 3, 2, 3, 3, 2], true) },
    { name: 'CROSS', closed: true, pts: radial(i => [1, 0.5, 0.5, 1][i % 4], Math.PI / 16) },
    { name: 'TRIANGLE', closed: true, pts: edgesToPts([[0, -1], [1, 0.85], [-1, 0.85]], [5, 6, 5], true) },
    { name: 'CLOVER', closed: true, pts: resample(t => { const a = -Math.PI / 2 + t * Math.PI * 2 + Math.PI / 4; const r = 0.35 + 0.65 * Math.pow(Math.abs(Math.cos(2 * a)), 0.6); return [Math.cos(a) * r, Math.sin(a) * r]; }, true, 16) },
    { name: 'V', closed: false, pts: edgesToPts([[-1, -1], [0, 0.9], [1, -1]], [8, 8], false), vp: -0.75 },
    { name: 'STEPS', closed: false, pts: (() => { const v = [[-1, -0.9]]; let x = -1, y = -0.9; const seq = 'DRDRDRDRRURURURU'; for (const c of seq) { if (c === 'D') y += 0.45; else if (c === 'U') y -= 0.45; else x += 0.25; v.push([x, y]); } return v; })(), vp: -0.75 },
    { name: 'U', closed: false, pts: (() => { const p = []; for (let i = 0; i < 4; i++) p.push([-1, -1 + i * 0.3]); for (let i = 0; i < 8; i++) { const a = Math.PI - i * Math.PI / 8; p.push([Math.cos(a), 0.2 + Math.sin(a) * 0.8]); } for (let i = 0; i <= 4; i++) p.push([1, 0.2 - i * 0.3]); return p; })(), vp: -0.75 },
    { name: 'FLAT', closed: false, pts: edgesToPts([[-1, 0.55], [1, 0.55]], [16], false), vp: -1.0 },
    { name: 'HEART', closed: true, pts: resample(t => { const a = t * Math.PI * 2; const s = Math.sin(a); return [16 * s * s * s / 16, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16 + 0.1]; }, true, 16) },
    { name: 'STAR', closed: true, pts: radial(i => (i % 2 ? 0.48 : 1), 0) },
    { name: 'W', closed: false, pts: edgesToPts([[-1, -1], [-0.5, 0.85], [0, -0.3], [0.5, 0.85], [1, -1]], [4, 4, 4, 4], false), vp: -0.8 },
    { name: 'BROKEN V', closed: false, pts: edgesToPts([[-1, -1], [-0.6, -0.15], [-0.32, -0.15], [0, 0.85], [0.32, -0.15], [0.6, -0.15], [1, -1]], [3, 1, 4, 4, 1, 3], false), vp: -0.8 },
    { name: 'INFINITY', closed: true, pts: resample(t => { const a = t * Math.PI * 2 + Math.PI / 2; const d = 1 + Math.sin(a) * Math.sin(a); return [Math.cos(a) / d, Math.sin(a) * Math.cos(a) / d * 1.6]; }, true, 16) }
  ];
  for (const s of SHAPES) {
    if (s.vp == null) s.vp = -0.12;
    let minx = 9, maxx = -9, miny = 9, maxy = -9;
    for (const p of s.pts) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
    const sc = 2 / Math.max(maxx - minx, maxy - miny, 0.001);
    const ox = (minx + maxx) / 2, oy = s.closed ? (miny + maxy) / 2 : (s.name === 'FLAT' ? 0 : (miny + maxy) / 2 - 0.12);
    s.pts = s.pts.map(p => [(p[0] - ox) * sc, (p[1] - oy) * (s.name === 'FLAT' ? 1 : sc)]);
    s.lanes = s.closed ? s.pts.length : s.pts.length - 1;
  }
  const PALS = [
    { web: '#2448ff', fl: '#ff2a2a', tk: '#c040ff', sp: '#22ff44', pl: '#ffff30', pu: '#40e8ff', fu: '#ffffff', txt: '#30ff60' },
    { web: '#ff2626', fl: '#33ff44', tk: '#3a6bff', sp: '#30e8ff', pl: '#ffff30', pu: '#ffff40', fu: '#ffffff', txt: '#ffff30' },
    { web: '#ffe020', fl: '#3a6bff', tk: '#30e8ff', sp: '#ff3030', pl: '#33ff44', pu: '#ff40ff', fu: '#ffffff', txt: '#30e8ff' },
    { web: '#30e8ff', fl: '#ff40ff', tk: '#ffe020', sp: '#ff3030', pl: '#ffff30', pu: '#33ff44', fu: '#ffffff', txt: '#ff40ff' }
  ];
  const SKILL = [[1, 0], [3, 6000], [5, 16000], [7, 32000], [9, 54000], [11, 74000], [13, 94000], [15, 114000], [17, 134000]];

  ArcadeRegistry.register({
    id: 'tempest', title: 'Tempest', year: 1981, maker: 'Atari',
    width: W, height: H, vector: true, pointer: true,
    controls: 'Left/Right or mouse: spin · Space/click: fire · X: Superzapper · Enter: start',
    marquee: { bg: '#07001a', fg: '#ff2a2a', accent: '#ffe020' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;
      let hi = api.getHiScore(10000);

      // ---------- line batching with glow ----------
      const buckets = new Map();
      function seg(c, x1, y1, x2, y2) { let b = buckets.get(c); if (!b) { b = []; buckets.set(c, b); } b.push(x1, y1, x2, y2); }
      function poly(c, pts, closed) { for (let i = 0; i < pts.length - 1; i++) seg(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (closed) seg(c, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]); }
      function flush(ctx, blur) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const [c, b] of buckets) {
          if (!b.length) continue;
          ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = blur;
          ctx.beginPath();
          for (let i = 0; i < b.length; i += 4) { ctx.moveTo(b[i], b[i + 1]); ctx.lineTo(b[i + 2], b[i + 3]); }
          ctx.stroke(); b.length = 0;
        }
        ctx.shadowBlur = 0;
      }
      function text(c, str, x, y, sc, align) {
        str = String(str).toUpperCase();
        const adv = 6 * sc, w = str.length * adv - 2 * sc;
        if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
        for (const ch of str) {
          const g = VF[ch];
          if (g) for (const st of g.split(' ')) {
            for (let i = 2; i < st.length; i += 2) seg(c, x + (+st[i - 2]) * sc, y + (+st[i - 1]) * sc, x + (+st[i]) * sc, y + (+st[i + 1]) * sc);
            if (st.length === 2) seg(c, x + (+st[0]) * sc, y + (+st[1]) * sc, x + (+st[0]) * sc + 0.6, y + (+st[1]) * sc);
          }
          x += adv;
        }
      }

      // ---------- projection ----------
      let shape = SHAPES[0], pal = PALS[0], cam = 0;
      function proj(p, d) {
        const z = d - cam;
        const s = 1 / (1 + z * K);
        const vy = shape.vp;
        return [CX + p[0] * RX * s, CY + (p[1] * s + vy * (1 - s)) * RY];
      }
      const visible = d => d - cam > -0.16;
      function edgePt(e, d) { return proj(shape.pts[((e % shape.pts.length) + shape.pts.length) % shape.pts.length], d); }
      function laneEnds(l, d) { return [edgePt(l, d), edgePt(l + 1, d)]; }
      function laneCenter(l, d) { const [a, b] = laneEnds(l, d); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
      function local(L, R, u, v) {
        const dx = R[0] - L[0], dy = R[1] - L[1];
        let nx = -dy, ny = dx;
        // outward = away from vanishing point
        const mx = L[0] + dx / 2, my = L[1] + dy / 2, vpX = CX, vpY = CY + shape.vp * RY;
        if ((mx - vpX) * nx + (my - vpY) * ny < 0) { nx = -nx; ny = -ny; }
        return [L[0] + dx * u + nx * v, L[1] + dy * u + ny * v];
      }
      function shapeIn(c, l, d, model, closed) {
        if (!visible(d)) return;
        const [L, R] = laneEnds(l, d);
        poly(c, model.map(([u, v]) => local(L, R, u, v)), closed);
      }
      const wrapLane = l => shape.closed ? ((l % 16) + 16) % 16 : l;
      const validLane = l => shape.closed || (l >= 0 && l < shape.lanes);

      // ---------- models (u along lane, v outward, both in lane-width units) ----------
      const CLAW = [[0, 0], [0.5, 0.42], [1, 0], [0.78, -0.06], [0.88, 0.1], [0.5, 0.22], [0.12, 0.1], [0.22, -0.06]];
      const FLIP1 = [[0.75, 0.2], [0, 0], [0.75, -0.2]], FLIP2 = [[0.25, 0.2], [1, 0], [0.25, -0.2]];
      const TANK1 = [[0.12, 0], [0.5, 0.34], [0.88, 0], [0.5, -0.34]], TANK2 = [[0.32, 0], [0.5, 0.16], [0.68, 0], [0.5, -0.16]];

      // ---------- game state ----------
      let state = 'attract', stT = 0, attractShape = 0;
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      let level = 1, score = 0, lives = 3, nextLife = 20000, startBonus = 0, selIdx = 0, selT = 0, maxStart = 0;
      let enemies = [], queue = [], shots = [], eshots = [], spikes = new Array(16).fill(0), sparks = [];
      let pl = 0, plD = 0, plAlive = true, phase = 'enter', phT = 0, spawnT = 0, zaps = 0, zapT = 0, fireCD = 0;
      let moveDir = 0, moveT = 0, mouseAcc = 0, lastMX = null, mouseIdle = 99, deathT = 0, caughtBy = null, msg = '', msgT = 0, warpSnd = 0;

      function setLevel(n) {
        level = n; shape = SHAPES[(n - 1) % 16]; pal = PALS[Math.floor((n - 1) / 16) % 4];
        spikes = new Array(17).fill(0); enemies = []; shots = []; eshots = []; queue = [];
        const nf = 6 + Math.min(n, 14), nt = n >= 3 ? 1 + Math.min(4, Math.floor(n / 3)) : 0;
        const ns = n >= 4 ? 2 + Math.min(3, Math.floor(n / 6)) : 0, nu = n >= 11 ? 1 + Math.min(4, Math.floor((n - 11) / 4)) : 0;
        const np = n >= 17 ? 1 + Math.min(4, Math.floor((n - 17) / 4)) : 0;
        for (let i = 0; i < nf; i++) queue.push('F');
        for (let i = 0; i < nt; i++) queue.push('T');
        for (let i = 0; i < ns; i++) queue.push('S');
        for (let i = 0; i < nu; i++) queue.push('U');
        for (let i = 0; i < np; i++) queue.push('P');
        for (let i = queue.length - 1; i > 0; i--) { const j = ri(i + 1); [queue[i], queue[j]] = [queue[j], queue[i]]; }
        // spikers early so spikes appear
        queue.sort((a, b) => (a === 'S' ? -1 : 0) - (b === 'S' ? -1 : 0));
        let best = 0, by = -1e9;
        for (let l = 0; l < shape.lanes; l++) { const c = laneCenterRaw(l), v = c[1] - Math.abs(c[0]) * 0.5; if (v > by + 0.01) { by = v; best = l; } }
        pl = best; zaps = 2; phase = 'enter'; phT = 0; cam = -1.6; plD = 0; plAlive = true; spawnT = 90;
        msg = 'SUPERZAPPER RECHARGE'; msgT = 120;
        A.melody([[392, 0.07], [523, 0.07], [659, 0.07], [784, 0.12]], { type: 'square', vol: 0.08 });
      }
      function laneCenterRaw(l) { const a = shape.pts[l], b = shape.pts[(l + 1) % shape.pts.length]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
      function flipSpeed() { return Math.min(0.0095, 0.0026 + level * 0.00028); }
      function spawnEnemy(t) {
        const lane = ri(shape.lanes);
        const sp = flipSpeed();
        if (t === 'F') enemies.push({ t, lane, d: 1, sp, flip: 0, from: lane, to: lane, nextFlip: rnd(40, 160), fireT: rnd(60, 200), wait: 0 });
        else if (t === 'T') enemies.push({ t, lane, d: 1, sp: sp * 0.8, fireT: rnd(60, 200), carry: level >= 17 && Math.random() < 0.4 ? 'P' : 'F' });
        else if (t === 'S') enemies.push({ t, lane, d: 1, sp: sp * 1.1, dir: -1, target: rnd(0.3, 0.6), rot: 0 });
        else if (t === 'U') enemies.push({ t, pos: lane, d: 1, mode: 'up', mt: rnd(30, 70), from: lane, to: lane, sp: sp * 1.4 });
        else if (t === 'P') enemies.push({ t, lane, d: 1, sp: sp * 0.7, flip: 0, from: lane, to: lane, nextFlip: rnd(80, 200), pulse: rnd(0, 120), wait: 0 });
      }

      function startGame(startLv) {
        score = 0; lives = 3; nextLife = 20000; startBonus = SKILL.find(s => s[0] === startLv)[1];
        state = 'play'; setLevel(startLv);
      }
      function addScore(n) {
        score += n;
        if (score >= nextLife) { nextLife += 20000; lives = Math.min(lives + 1, 6); A.melody([[1318, 0.06], [1568, 0.06], [2093, 0.12]], { type: 'square', vol: 0.08 }); }
      }
      function boom(x, y, c, n) {
        for (let i = 0; i < n && sparks.length < 200; i++) {
          const a = Math.random() * Math.PI * 2, s = rnd(0.5, 3);
          sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(14, 30), c: Math.random() < 0.3 ? '#ffffff' : c });
        }
      }
      function enemyPos(e) {
        if (e.t === 'U') return fusePt(e);
        return laneCenter(e.lane, e.d);
      }
      function fusePt(e) {
        const e0 = Math.floor(e.pos), f = e.pos - e0;
        const a = edgePt(e0, e.d), b = edgePt(e0 + 1, e.d);
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      function killEnemy(i, pts) {
        const e = enemies[i];
        const p = enemyPos(e);
        const col = { F: pal.fl, T: pal.tk, S: pal.sp, U: pal.fu, P: pal.pu }[e.t];
        boom(p[0], p[1], col, 18);
        enemies.splice(i, 1);
        if (pts) {
          if (e.t === 'F') addScore(150);
          else if (e.t === 'T') addScore(100);
          else if (e.t === 'S') addScore(50);
          else if (e.t === 'P') addScore(200);
          else addScore(e.d > 0.66 ? 250 : e.d > 0.33 ? 500 : 750);
        }
        if (e.t === 'T') {
          for (const dl of [-1, 1]) {
            let l = wrapLane(e.lane + dl);
            if (!validLane(l)) l = e.lane;
            if (e.carry === 'P') enemies.push({ t: 'P', lane: l, d: e.d, sp: flipSpeed() * 0.7, flip: 0, from: l, to: l, nextFlip: rnd(40, 120), pulse: rnd(0, 120), wait: 0 });
            else enemies.push({ t: 'F', lane: l, d: e.d, sp: flipSpeed(), flip: 0, from: l, to: l, nextFlip: rnd(20, 90), fireT: rnd(60, 200), wait: 0 });
          }
        }
        A.noise(0.28, { freq: 2600, slideTo: 200, vol: 0.28 });
        A.tone(180, 0.15, { type: 'sawtooth', vol: 0.05, slideTo: 60 });
      }
      function playerDie(how) {
        if (!plAlive) return;
        plAlive = false; phase = 'dying'; phT = 0;
        const p = laneCenter(pl, plD);
        boom(p[0], p[1], pal.pl, 50); boom(p[0], p[1], '#ffffff', 30);
        A.noise(1.4, { freq: 1600, slideTo: 50, vol: 0.45 });
        A.tone(700, 1.2, { type: 'sawtooth', vol: 0.12, slideTo: 40 });
        caughtBy = how === 'caught' ? caughtBy : null;
      }
      function startFlip(e, dir) {
        let to = wrapLane(e.lane + dir);
        if (!validLane(to)) { to = wrapLane(e.lane - dir); if (!validLane(to)) return; }
        e.from = e.lane; e.to = to; e.flip = 1;
      }
      function dirToPlayer(lane) {
        if (lane === pl) return 0;
        if (!shape.closed) return pl > lane ? 1 : -1;
        const fwd = ((pl - lane) % 16 + 16) % 16;
        return fwd <= 8 ? 1 : -1;
      }

      // ---------- enemy update ----------
      function updEnemies() {
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          if (e.t === 'F' || e.t === 'P') {
            if (e.t === 'P') { e.pulse = (e.pulse + 1) % 150; }
            if (e.flip > 0) {
              e.flip += e.t === 'P' ? 0.05 : 0.08;
              if (e.flip >= 1.5) { e.lane = e.to; e.flip = 0; e.wait = e.d <= 0 ? 6 : 0; A.tone(e.d <= 0 ? 900 : 500, 0.02, { type: 'square', vol: 0.02 }); }
              continue;
            }
            if (e.d > 0) {
              e.d = Math.max(0, e.d - e.sp);
              if (--e.nextFlip <= 0) { e.nextFlip = rnd(50, 170) - level * 2; startFlip(e, Math.random() < 0.5 ? -1 : 1); }
              if (e.t === 'F' && --e.fireT <= 0 && e.d > 0.25 && eshots.length < 4) { e.fireT = rnd(90, 220) - level * 3; eshots.push({ lane: e.lane, d: e.d }); A.tone(260, 0.08, { type: 'square', vol: 0.04, slideTo: 520 }); }
            } else {
              if (e.wait > 0) { e.wait--; continue; }
              if (plAlive && phase === 'fight') {
                if (e.lane === pl) { caughtBy = e; playerDie('caught'); return; }
                const dd = dirToPlayer(e.lane);
                if (dd) startFlip(e, dd);
              }
            }
            if (e.t === 'P' && plAlive && phase === 'fight' && e.lane === pl && e.pulse > 110 && e.d < 0.7 && !e.flip) { playerDie('pulse'); return; }
          } else if (e.t === 'T') {
            e.d -= e.sp;
            if (--e.fireT <= 0 && e.d > 0.25 && eshots.length < 4) { e.fireT = rnd(120, 240); eshots.push({ lane: e.lane, d: e.d }); }
            if (e.d <= 0) { e.d = 0; killEnemy(i, false); }
          } else if (e.t === 'S') {
            e.rot += 0.2;
            const onlySpikers = queue.length === 0 && enemies.every(o => o.t === 'S');
            const target = onlySpikers ? 0.15 : e.target;
            if (e.dir < 0) {
              e.d -= e.sp; spikes[e.lane] = Math.max(spikes[e.lane], 1 - e.d);
              if (e.d <= target) e.dir = 1;
            } else {
              e.d += e.sp * 1.3;
              if (e.d >= 1) { e.d = 1; e.dir = -1; e.lane = ri(shape.lanes); e.target = rnd(0.25, 0.6); }
            }
          } else if (e.t === 'U') {
            if (e.mode === 'up') {
              e.d = Math.max(0, e.d - e.sp);
              if (--e.mt <= 0 || e.d === 0) {
                let dir = e.d === 0 ? (dirToPlayer(Math.floor(e.pos)) || (Math.random() < 0.5 ? 1 : -1)) : (Math.random() < 0.5 ? 1 : -1);
                let to = e.pos + dir;
                if (!shape.closed && (to < 0 || to > shape.lanes)) to = e.pos - dir;
                e.from = e.pos; e.to = to; e.mode = 'side'; e.mt = 0;
              }
            } else {
              e.mt += 1 / 34;
              e.pos = e.from + (e.to - e.from) * Math.min(1, e.mt);
              if (e.mt >= 1) {
                e.pos = shape.closed ? ((e.to % 16) + 16) % 16 : e.to;
                e.mode = e.d === 0 ? 'side' : 'up'; e.mt = rnd(25, 80);
                if (e.d === 0) { e.mode = 'up'; e.mt = 1; }
              }
            }
            if (plAlive && phase === 'fight' && e.d < 0.04) {
              let dp = Math.abs(e.pos - (pl + 0.5)); if (shape.closed) dp = Math.min(dp, 16 - dp);
              if (dp < 0.55) { playerDie('fuse'); return; }
            }
          }
        }
      }
      function fuseVulnerable(e) { const f = e.pos - Math.floor(e.pos); return e.mode === 'side' && f > 0.25 && f < 0.75; }
      function enemyLane(e) {
        if (e.t === 'U') return Math.floor(e.pos) % 16;
        if (e.flip > 0) return e.flip < 0.75 ? e.from : e.to;
        return e.lane;
      }

      function updShots() {
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; const prev = s.d; s.d += 0.05;
          let hit = false;
          for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (enemyLane(e) !== s.lane) continue;
            if (e.d >= prev - 0.03 && e.d <= s.d + 0.01) {
              if (e.t === 'U' && !fuseVulnerable(e)) continue;
              killEnemy(j, true); hit = true; break;
            }
          }
          if (!hit) for (let j = eshots.length - 1; j >= 0; j--) {
            const e = eshots[j];
            if (e.lane === s.lane && e.d >= prev - 0.03 && e.d <= s.d + 0.02) { eshots.splice(j, 1); hit = true; addScore(0); break; }
          }
          if (!hit && spikes[s.lane] > 0 && s.d >= 1 - spikes[s.lane]) {
            spikes[s.lane] = Math.max(0, spikes[s.lane] - 0.08); if (spikes[s.lane] < 0.04) spikes[s.lane] = 0;
            addScore(1); hit = true;
            const p = laneCenter(s.lane, s.d); boom(p[0], p[1], pal.sp, 4);
            A.tone(1800, 0.03, { type: 'square', vol: 0.03 });
          }
          if (hit || s.d > 1) shots.splice(i, 1);
        }
        for (let i = eshots.length - 1; i >= 0; i--) {
          const e = eshots[i]; e.d -= 0.011;
          if (e.d <= 0) {
            eshots.splice(i, 1);
            if (plAlive && phase === 'fight' && e.lane === pl) playerDie('shot');
          }
        }
      }

      // ---------- player input ----------
      function stepLane(dir) {
        let to = wrapLane(pl + dir);
        if (!validLane(to)) return;
        pl = to; A.tone(2200, 0.012, { type: 'square', vol: 0.025 });
      }
      function rightStep() {
        // index direction that moves the claw rightward on screen at its current lane
        const a = validLane(wrapLane(pl + 1)) ? laneCenter(wrapLane(pl + 1), 0)[0] : -1e9;
        const b = validLane(wrapLane(pl - 1)) ? laneCenter(wrapLane(pl - 1), 0)[0] : -1e9;
        if (!shape.closed) return 1;
        return a >= b ? 1 : -1;
      }
      function playerInput() {
        const l = api.key('ArrowLeft'), r = api.key('ArrowRight');
        if (api.pressed('ArrowLeft')) { moveDir = -rightStep(); stepLane(moveDir); moveT = 9; }
        else if (api.pressed('ArrowRight')) { moveDir = rightStep(); stepLane(moveDir); moveT = 9; }
        else if ((l || r) && moveDir) { if (--moveT <= 0) { stepLane(moveDir); moveT = 4; } }
        if (!l && !r) moveDir = 0;
        // mouse as spinner
        const mx = api.mouse.x;
        if (lastMX !== null) {
          const dx = mx - lastMX;
          if (Math.abs(dx) > 0.01) {
            if (mouseIdle > 20) mouseAcc = 0;
            mouseIdle = 0; mouseAcc += dx;
            const step = 9;
            while (Math.abs(mouseAcc) >= step) {
              const s = Math.sign(mouseAcc); mouseAcc -= s * step;
              stepLane(s > 0 ? rightStep() : -rightStep());
            }
          } else mouseIdle++;
        }
        lastMX = mx;
        if (fireCD > 0) fireCD--;
        if ((api.pressed('Space') || api.mouse.clicked || ((api.key('Space') || api.mouse.down) && fireCD <= 0)) && shots.length < 8) {
          shots.push({ lane: pl, d: plD }); fireCD = 6;
          A.tone(1400, 0.07, { type: 'square', vol: 0.05, slideTo: 300 });
        }
        if ((api.pressed('KeyX') || api.pressed('KeyZ')) && zaps > 0 && phase === 'fight') {
          zaps--; zapT = 36;
          A.noise(0.9, { freq: 4000, slideTo: 300, vol: 0.4 });
          A.tone(100, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 1600 });
          if (zaps === 1) { for (let i = enemies.length - 1; i >= 0; i--) killEnemy(i, true); eshots = []; }
          else if (enemies.length) killEnemy(ri(enemies.length), true);
        }
      }

      function update() {
        stT++;
        for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vx *= 0.96; s.vy *= 0.96; if (--s.t <= 0) sparks.splice(i, 1); }
        if (zapT > 0) zapT--;
        if (msgT > 0) msgT--;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        if (state !== 'attract') lastCredits = api.credits;
        if (state === 'attract') {
          if (stT % 200 === 0) { attractShape = (attractShape + 1) % 16; }
          shape = SHAPES[attractShape]; pal = PALS[Math.floor(stT / 3200) % 4];
          cam = Math.max(0, 1.5 - (stT % 200) / 40) * -1;
          const cr = api.credits;
          if (lastCredits === 0 && cr > 0) { coinHold = 150; coinFlash = 0; }
          lastCredits = cr;
          // the credit is taken as the game starts: RATE YOURSELF always ends in play (it auto-starts on its timer)
          if ((api.anyPressed('Enter', 'Space') || api.mouse.clicked) && !api.useCredit()) {
            coinFlash = 150; A.tone(70, 0.28, { type: 'square', vol: 0.3 }); A.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 });
          } else if (api.anyPressed('Enter', 'Space') || api.mouse.clicked) { lastCredits = api.credits; state = 'select'; stT = 0; selIdx = 0; selT = 600; maxStart = Math.min(8, Math.max(0, Math.floor((Math.min(hi, 140000)) / 18000))); maxStart = Math.max(maxStart, 4); lastMX = api.mouse.x; A.tone(660, 0.1, { vol: 0.08 }); }
          return;
        }
        if (state === 'select') {
          if (api.pressed('ArrowLeft')) selIdx = Math.max(0, selIdx - 1);
          if (api.pressed('ArrowRight')) selIdx = Math.min(maxStart, selIdx + 1);
          const dx = api.mouse.x - (lastMX == null ? api.mouse.x : lastMX); lastMX = api.mouse.x;
          mouseAcc += dx; if (Math.abs(mouseAcc) > 24) { selIdx = Math.max(0, Math.min(maxStart, selIdx + Math.sign(mouseAcc))); mouseAcc = 0; }
          if (--selT <= 0 || (stT > 10 && (api.anyPressed('Space', 'Enter') || api.mouse.clicked))) startGame(SKILL[selIdx][0]);
          return;
        }
        if (state === 'gameover') {
          if (stT > 240 || (stT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; stT = 0; }
          return;
        }
        // play
        phT++;
        if (phase === 'enter') {
          cam = Math.min(0, -1.6 + phT / 40);
          if (cam >= 0) { cam = 0; phase = 'fight'; phT = 0; }
          playerInput();
          updShots();
          return;
        }
        if (phase === 'fight') {
          playerInput();
          if (--spawnT <= 0 && queue.length && enemies.length < 7) { spawnEnemy(queue.shift()); spawnT = Math.max(22, 75 - level * 3); }
          updEnemies();
          if (phase !== 'fight') return;
          updShots();
          if (queue.length === 0 && enemies.length === 0) {
            phase = 'warp'; phT = 0; eshots = [];
            if (startBonus) { addScore(startBonus); msg = 'BONUS ' + startBonus; msgT = 120; startBonus = 0; }
            else if (spikes.some(s => s > 0)) { msg = 'AVOID SPIKES'; msgT = 90; }
            warpSnd = 0;
          }
          return;
        }
        if (phase === 'warp') {
          playerInput();
          const v = Math.min(0.02, 0.003 + phT * 0.00018);
          cam += v; plD = Math.min(1, cam);
          if (--warpSnd <= 0) { warpSnd = 6; A.tone(200 + cam * 1200, 0.1, { type: 'triangle', vol: 0.07 }); }
          updShots();
          if (spikes[pl] > 0 && plD >= 1 - spikes[pl] && plD < 1) { playerDie('spike'); return; }
          if (cam > 1.25) { setLevel(level + 1); }
          return;
        }
        if (phase === 'dying') {
          if (caughtBy && phT < 70) { plD = Math.min(1, plD + 0.015); caughtBy.d = plD; }
          if (phT > 120) {
            lives--;
            const respawn = () => {
              const warping = cam > 0.02;
              if (warping) { setLevel(level + 1); return; }
              // return active enemies to the hole
              for (const e of enemies) if (e.t !== 'S') queue.unshift(e.t === 'T' ? 'T' : e.t);
              enemies = enemies.filter(e => e.t === 'S');
              eshots = []; shots = []; caughtBy = null; plD = 0; plAlive = true; phase = 'fight'; phT = 0; spawnT = 90;
            };
            if (lives <= 0) {
              const gameOver = () => {
                state = 'gameover'; stT = 0;
                if (score > hi) { hi = score; api.setHiScore(score); }
              };
              // continue: 3 fresh claws on the same web (or the next one if the death came mid-warp), score kept
              if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, gameOver);
              else gameOver();
              return;
            }
            respawn();
          }
        }
      }

      // ---------- rendering ----------
      function drawWeb(col, hiLane, hiCol) {
        const n = shape.pts.length;
        const dNear = Math.max(0, cam - 0.15);
        if (dNear >= 1) return;
        const near = [], far = [];
        for (let i = 0; i < n; i++) { near.push(edgePt(i, dNear)); far.push(edgePt(i, 1)); }
        poly(col, near, shape.closed); poly(col, far, shape.closed);
        for (let i = 0; i < n; i++) seg(col, near[i][0], near[i][1], far[i][0], far[i][1]);
        if (hiLane != null && dNear === 0 && plAlive) {
          const a = hiLane, b = (hiLane + 1) % n;
          seg(hiCol, near[a][0], near[a][1], far[a][0], far[a][1]);
          seg(hiCol, near[b][0], near[b][1], far[b][0], far[b][1]);
        }
      }
      function drawEnemies() {
        for (const e of enemies) {
          if (!visible(e.d)) continue;
          if (e.t === 'F' || e.t === 'P') {
            let L, R;
            if (e.flip > 0) {
              // pivot over the shared edge
              const f = Math.min(1, e.flip / 1.5);
              const shared = (e.to === wrapLane(e.from + 1)) ? e.from + 1 : e.from;
              const P = edgePt(shared, e.d);
              const fromOther = edgePt(shared === e.from + 1 ? e.from : e.from + 1, e.d);
              const toOther = edgePt(shared === e.from + 1 ? e.to + 1 : e.to, e.d);
              const a0 = Math.atan2(fromOther[1] - P[1], fromOther[0] - P[0]), l0 = Math.hypot(fromOther[0] - P[0], fromOther[1] - P[1]);
              let a1 = Math.atan2(toOther[1] - P[1], toOther[0] - P[0]); const l1 = Math.hypot(toOther[0] - P[0], toOther[1] - P[1]);
              // rotate the long way over the top (away from the tube)
              let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
              da = da > 0 ? da - Math.PI * 2 : da + Math.PI * 2;
              if (Math.abs(da) > Math.PI * 1.6) da = da > 0 ? da - Math.PI * 2 : da + Math.PI * 2;
              const ang = a0 + da * f, len = l0 + (l1 - l0) * f;
              L = P; R = [P[0] + Math.cos(ang) * len, P[1] + Math.sin(ang) * len];
            } else[L, R] = laneEnds(e.lane, e.d);
            if (e.t === 'F') {
              const c = pal.fl;
              poly(c, FLIP1.map(([u, v]) => local(L, R, u, v)), false);
              poly(c, FLIP2.map(([u, v]) => local(L, R, u, v)), false);
            } else {
              const amp = e.pulse > 110 ? 0.25 : 0.1 + 0.05 * Math.sin(e.pulse * 0.3);
              const z = [];
              for (let k = 0; k <= 6; k++) z.push(local(L, R, k / 6, k === 0 || k === 6 ? 0 : (k % 2 ? amp : -amp)));
              poly(e.pulse > 110 && (api.frame & 2) ? '#ffffff' : pal.pu, z, false);
              if (e.pulse > 110 && !e.flip) {
                const a = edgePt(e.lane, 0), b = edgePt(e.lane, 1), c2 = edgePt(e.lane + 1, 0), d2 = edgePt(e.lane + 1, 1);
                seg(pal.pu, a[0], a[1], b[0], b[1]); seg(pal.pu, c2[0], c2[1], d2[0], d2[1]);
              }
            }
          } else if (e.t === 'T') {
            const [L, R] = laneEnds(e.lane, e.d);
            poly(pal.tk, TANK1.map(([u, v]) => local(L, R, u, v)), true);
            poly(pal.tk, TANK2.map(([u, v]) => local(L, R, u, v)), true);
            const inner = e.carry === 'P' ? pal.pu : pal.fl;
            seg(inner, ...local(L, R, 0.36, 0), ...local(L, R, 0.64, 0));
          } else if (e.t === 'S') {
            const [L, R] = laneEnds(e.lane, e.d);
            const pts = [];
            for (let k = 0; k < 14; k++) { const a = e.rot + k * 0.75, r = 0.03 + k * 0.022; pts.push(local(L, R, 0.5 + Math.cos(a) * r, Math.sin(a) * r)); }
            poly(pal.sp, pts, false);
          } else if (e.t === 'U') {
            const c = fusePt(e);
            const s = 1 / (1 + (e.d - cam) * K);
            const cols = ['#ff3030', '#ffff30', '#30ff60', '#40a0ff', '#ff40ff'];
            for (let k = 0; k < 5; k++) {
              const a = k * 1.2566 + api.frame * 0.05; let x = c[0], y = c[1];
              for (let j = 1; j <= 3; j++) {
                const aa = a + (Math.random() - 0.5) * 1.2, r = 4.5 * s * 2;
                const nx = x + Math.cos(aa) * r, ny = y + Math.sin(aa) * r;
                seg(cols[k], x, y, nx, ny); x = nx; y = ny;
              }
            }
          }
        }
      }
      function drawSpikes() {
        for (let l = 0; l < shape.lanes; l++) {
          const h = spikes[l]; if (h <= 0) continue;
          const d0 = Math.max(1 - h, cam - 0.15); if (d0 >= 1) continue;
          const a = laneCenter(l, d0), b = laneCenter(l, 1);
          seg(pal.sp, a[0], a[1], b[0], b[1]);
          seg('#ffffff', a[0] - 0.6, a[1], a[0] + 0.6, a[1]);
        }
      }
      function drawPlayer() {
        if (!plAlive) return;
        const [L, R] = laneEnds(pl, plD);
        const len = Math.max(1, Math.hypot(R[0] - L[0], R[1] - L[1])), k = Math.min(len, 44) / len;
        poly(pal.pl, CLAW.map(([u, v]) => local(L, R, u, v * k)), true);
      }
      function drawShots() {
        for (const s of shots) {
          if (!visible(s.d)) continue;
          const p = laneCenter(s.lane, s.d), r = 4 / (1 + Math.max(-0.15, s.d - cam) * K) + 0.8;
          seg('#ffff80', p[0] - r, p[1], p[0], p[1] - r); seg('#ffff80', p[0], p[1] - r, p[0] + r, p[1]);
          seg('#ffff80', p[0] + r, p[1], p[0], p[1] + r); seg('#ffff80', p[0], p[1] + r, p[0] - r, p[1]);
        }
        for (const s of eshots) {
          const p = laneCenter(s.lane, s.d), r = 3 / (1 + (s.d - cam) * K) + 0.8;
          const c = (api.frame & 4) ? '#ffffff' : pal.fl;
          seg(c, p[0] - r, p[1] - r, p[0] + r, p[1] + r); seg(c, p[0] + r, p[1] - r, p[0] - r, p[1] + r);
          seg(c, p[0] - r, p[1], p[0] + r, p[1]); seg(c, p[0], p[1] - r, p[0], p[1] + r);
        }
      }
      function clawIcon(c, x, y, s) {
        poly(c, CLAW.map(([u, v]) => [x + (u - 0.5) * s, y - v * s]), true);
      }
      function drawHUD() {
        text(pal.txt, String(score).padStart(2, '0'), 92, 14, 3.2, 'right');
        for (let i = 0; i < Math.min(lives - 1 + (plAlive ? 0 : 0), 6); i++) clawIcon(pal.pl, 18 + i * 17, 46, 14);
        text(pal.txt, String(hi), W / 2, 14, 2, 'center');
        text(pal.web, String(level), W / 2, 34, 2.4, 'center');
        if (zaps === 0 && state === 'play') { /* used up */ }
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineWidth = 1.3;
        if (state === 'attract') {
          drawWeb(pal.web);
          flush(ctx, 8);
          ctx.lineWidth = 2;
          const t = stT;
          text('#ff2a2a', 'TEMPEST', W / 2, 52, 7.5, 'center');
          flush(ctx, 10);
          ctx.lineWidth = 1.3;
          text('#30ff60', 'HIGH SCORE ' + hi, W / 2, 20, 2, 'center');
          const cr = api.credits;
          const on = coinHold > 0 || (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : (t % 60) < 40);
          if (on) text('#ffffff', cr > 0 ? 'PRESS START' : 'INSERT COINS', W / 2, 407, 2.5, 'center');
          text('#30ff60', 'CREDITS ' + Math.min(cr, 99), W / 2, 429, 1.5, 'center');
          text('#ffe020', 'SPIN TO MOVE  FIRE TO SHOOT', W / 2, 448, 1.7, 'center');
          text('#30e8ff', 'X  SUPERZAPPER', W / 2, 462, 1.7, 'center');
          flush(ctx, 6);
          return;
        }
        if (state === 'select') {
          text('#ff2a2a', 'RATE YOURSELF', W / 2, 60, 4, 'center');
          text('#30ff60', 'SPIN KNOB TO CHANGE', W / 2, 110, 2, 'center');
          text('#30ff60', 'PRESS FIRE TO SELECT', W / 2, 128, 2, 'center');
          text('#ffffff', 'TIME ' + Math.ceil(selT / 60), W / 2, 150, 2, 'center');
          const n = maxStart + 1, bw = 36, x0 = W / 2 - (n * bw) / 2;
          for (let i = 0; i < n; i++) {
            const [lv, bonus] = SKILL[i], sh = SHAPES[(lv - 1) % 16];
            const cx = x0 + i * bw + bw / 2, cy = 230;
            const c = i === selIdx ? '#ffff30' : '#3a6bff';
            poly(c, sh.pts.map(p => [cx + p[0] * 13, cy + p[1] * 13]), sh.closed);
            text('#ffffff', String(lv), cx, 258, 1.8, 'center');
            if (i === selIdx) { poly('#ffff30', [[cx - 17, cy - 19], [cx + 17, cy - 19], [cx + 17, cy + 40], [cx - 17, cy + 40]], true); }
          }
          text('#30e8ff', 'LEVEL', W / 2, 290, 2, 'center');
          text('#ff40ff', 'BONUS ' + SKILL[selIdx][1], W / 2, 320, 2.4, 'center');
          flush(ctx, 7);
          return;
        }
        // play / gameover
        let webCol = pal.web;
        if (zapT > 0) webCol = ['#ffffff', '#ff3030', '#ffff30', '#30ff60', '#40a0ff', '#ff40ff'][(zapT >> 1) % 6];
        drawWeb(webCol, phase === 'fight' || phase === 'enter' ? pl : null, pal.pl);
        drawSpikes();
        drawEnemies();
        drawShots();
        drawPlayer();
        flush(ctx, 8);
        for (const s of sparks) seg(s.c, s.x, s.y, s.x - s.vx * 1.5, s.y - s.vy * 1.5);
        drawHUD();
        if (msgT > 0) text(msg === 'AVOID SPIKES' ? '#ff3030' : '#30e8ff', msg, W / 2, 80, 2.2, 'center');
        if (state === 'gameover') { text('#ff2a2a', 'GAME OVER', W / 2, 200, 4.5, 'center'); }
        if (phase === 'enter' && phT < 70 && state === 'play') text('#ffffff', 'LEVEL ' + level, W / 2, 104, 2.4, 'center');
        flush(ctx, 6);
      }
      return { update, render };
    }
  });
})();
