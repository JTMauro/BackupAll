// Bubbles (Williams, 1982) - from-scratch raster recreation for the Game Room.
// A soap bubble in a kitchen sink: eat ants, crumbs and grease to grow, dodge roaches, razor blades,
// sponges and brushes, and go down the drain once you are big enough.
(function () {
  'use strict';
  const W = 292, H = 240;
  const SX0 = 14, SY0 = 24, SX1 = 278, SY1 = 234, CR = 42;   // sink basin
  const DX = 146, DY = 129, DR = 9;                         // drain

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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        ctx.fillStyle = typeof col === 'function' ? col(r, i) : col;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }

  // ---------- pixel art ----------
  const PAL = {
    k: '#101010', n: '#6a3010', N: '#a05020', o: '#c07030', Y: '#ffe040', y: '#c0a020', s: '#a08010', W: '#ffffff',
    g: '#9098a8', G: '#d0d8e0', d: '#505868', b: '#8a5a2a', B: '#c08848', t: '#f0d090', R: '#ff3030'
  };
  const ART = {
    roach0: ['.k.....k.', '..kNNNk..', 'k.NoNNNnk', '.kNNoNNn.', 'k.NNNNNnk', '..kNNNk..', '.k.....k.'],
    roach1: ['k.......k', '..kNNNk..', '.kNoNNNn.', 'k.NNoNNnk', '.kNNNNNn.', '..kNNNk..', 'k.......k'],
    razor: ['GGGGGGGGGGGGG', 'GgggggGgggggG', 'Ggg.ggggg.ggG', 'GgggggGgggggG', 'GGGGGGGGGGGGG'],
    sponge: ['YYYYYYYYYYYY', 'YyYYYsYYYyYY', 'YYYsYYYyYYsY', 'YyYYYYsYYYYY', 'yYYyYYYYsYYy', 'ssssssssssss', 'gggggggggggg'],
    brush0: ['..bbbbbbbbb.', '.bBBBBBBBBBb', '.bBtBBBBtBBb', '..bbbbbbbbb.', '..k.k.k.k.k.', '.k.k.k.k.k..'],
    brush1: ['..bbbbbbbbb.', '.bBBBBBBBBBb', '.bBtBBBBtBBb', '..bbbbbbbbb.', '.k.k.k.k.k..', '..k.k.k.k.k.']
  };
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows) {
    const h = rows.length, w = rows[0].length, c = canvas(w, h), x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][i]; if (ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } }
    return { c, w, h };
  }
  function rotSet(rows, n) {
    const h = rows.length, w = rows[0].length, S = Math.ceil(Math.hypot(w, h)) | 1, out = [];
    const cx = (w - 1) / 2, cy = (h - 1) / 2, sc = (S - 1) / 2;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const c = canvas(S, S), x = c.getContext('2d');
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const dx = i - sc, dy = j - sc;
        const sx = Math.round(cx + ca * dx + sa * dy), sy = Math.round(cy - sa * dx + ca * dy);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const ch = rows[sy][sx]; if (ch === '.') continue;
        x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1);
      }
      out.push({ c, w: S, h: S });
    }
    return out;
  }
  // pixel discs / rings (crisp, no anti-aliasing)
  function disc(ctx, cx, cy, r, col) {
    ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy);
    for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
  }
  function ring(ctx, cx, cy, r, col) {
    ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy);
    const hw = (rr, y) => Math.floor(Math.sqrt(rr * rr - y * y + rr * 0.8));
    for (let y = -r; y <= r; y++) {
      const w = hw(r, y), wi = Math.abs(y) <= r - 1 ? hw(r - 1, y) : -1;
      if (wi < 0) ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
      else { const ww = Math.max(1, w - wi); ctx.fillRect(cx - w, cy + y, ww, 1); ctx.fillRect(cx + w - ww + 1, cy + y, ww, 1); }
    }
  }

  // inside test for the rounded-rectangle basin: returns {nx, ny, pen} if circle (x,y,r) pokes out
  function basinPush(x, y, r) {
    const ix = Math.max(SX0 + CR, Math.min(SX1 - CR, x)), iy = Math.max(SY0 + CR, Math.min(SY1 - CR, y));
    const dx = x - ix, dy = y - iy, d = Math.hypot(dx, dy), lim = CR - r;
    if (d > lim && d > 0) return { nx: dx / d, ny: dy / d, pen: d - lim };
    return null;
  }

  ArcadeRegistry.register({
    id: 'bubbles', title: 'Bubbles', year: 1982, maker: 'Williams',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: float the bubble \u00b7 Enter / Space: start',
    marquee: { bg: '#103050', fg: '#c0f0ff', accent: '#ffe040' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;
      const ROACH = [rotSet(ART.roach0, 16), rotSet(ART.roach1, 16)], RAZOR = rotSet(ART.razor, 16);
      const SPONGE = sprite(ART.sponge), BRUSH = [sprite(ART.brush0), sprite(ART.brush1)];

      // prerendered kitchen sink
      const SINK = canvas(W, H);
      (function () {
        const x = SINK.getContext('2d');
        // tiled counter
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i += 1) {
          const grout = (i % 24 === 0) || (j % 24 === 0);
          x.fillStyle = grout ? '#283848' : ((((i / 24) | 0) + ((j / 24) | 0)) & 1 ? '#3c5468' : '#365064');
          x.fillRect(i, j, 1, 1);
        }
        for (let j = 0; j < H; j++) {
          let run = null, rs = 0;
          const flush = (end) => { if (run) { x.fillStyle = run; x.fillRect(rs, j, end - rs, 1); } };
          for (let i = 0; i <= W; i++) {
            let col = null;
            if (i < W) {
              const p = basinPush(i + 0.5, j + 0.5, 0);
              const rimP = basinPush(i + 0.5, j + 0.5, -5);
              if (!p) {
                const dc = Math.hypot((i - DX) / 1.4, j - DY);
                col = dc < 40 ? '#8c9cb0' : dc < 80 ? '#98a8bc' : '#a4b4c6';
                // shading near the walls of the basin
                const ix = Math.max(SX0 + CR, Math.min(SX1 - CR, i)), iy = Math.max(SY0 + CR, Math.min(SY1 - CR, j));
                const dd = CR - Math.hypot(i - ix, j - iy);
                if (dd < 3) col = '#6c7c90'; else if (dd < 7) col = '#b8c8d8';
              } else if (!rimP) col = (j < DY) ? '#f0f4f8' : '#d0d8e4';
            }
            if (col !== run) { flush(i); run = col; rs = i; }
          }
        }
        // drain
        for (let j = -DR - 2; j <= DR + 2; j++) for (let i = -DR - 2; i <= DR + 2; i++) {
          const d = Math.hypot(i, j); if (d > DR + 1.5) continue;
          x.fillStyle = d > DR ? '#d8e0e8' : d > DR - 2 ? '#707880' : ((i & 3) === 0 || (j & 3) === 0) ? '#a0a8b0' : '#202830';
          x.fillRect(DX + i, DY + j, 1, 1);
        }
        // faucet
        x.fillStyle = '#c0c8d0'; x.fillRect(DX - 6, 6, 12, 12); x.fillRect(DX - 3, 18, 6, 10);
        x.fillStyle = '#ffffff'; x.fillRect(DX - 5, 7, 3, 10); x.fillRect(DX - 2, 18, 1, 9);
        x.fillStyle = '#808890'; x.fillRect(DX - 3, 27, 6, 2);
        x.fillStyle = '#c0c8d0'; x.fillRect(DX - 26, 8, 10, 6); x.fillRect(DX + 16, 8, 10, 6);
        x.fillStyle = '#ff4040'; x.fillRect(DX - 23, 9, 4, 4); x.fillStyle = '#4080ff'; x.fillRect(DX + 19, 9, 4, 4);
      })();

      let hi = api.getHiScore(20000);
      let state = 'attract', stT = 0, coinFlash = 0;
      let score = 0, lives = 3, level = 1, nextExtra = 20000;
      let bub, foods = [], enemies = [], parts = [], popups = [], antT = 0, crumbT = 0, deadT = 0, drainT = 0, levelT = 0, bonusShown = 0, roachT = 0;
      let demo = { x: 80, y: 120, vx: 1.2, vy: 0.8 };

      const radius = s => 3 + Math.floor(s / 9);       // 3..14 px
      const stage = s => s >= 80 ? 4 : s >= 55 ? 3 : s >= 30 ? 2 : s >= 12 ? 1 : 0;
      const drainOpen = () => bub && bub.s >= 80;

      function randInBasin(margin) {
        for (let k = 0; k < 50; k++) {
          const x = rnd(SX0 + margin, SX1 - margin), y = rnd(SY0 + margin, SY1 - margin);
          if (!basinPush(x, y, margin) && Math.hypot(x - DX, y - DY) > DR + 8) return [x, y];
        }
        return [DX + 40, DY];
      }
      function newBubble() { bub = { x: DX, y: SY0 + 20, vx: 0, vy: 0.6, s: 0, alive: true, safe: 90, wob: 0 }; }
      function addFood(t) {
        const [x, y] = randInBasin(8);
        if (bub && Math.hypot(x - bub.x, y - bub.y) < 20) return;
        foods.push({ t, x, y, vx: 0, vy: 0, ph: rnd(0, 6), shape: ri(4) });
      }
      function antTrail() {
        // a little column of ants marches across the basin
        const side = ri(4);
        let x, y, tx, ty;
        if (side === 0) { x = SX0 + 20; y = rnd(SY0 + 50, SY1 - 50); tx = SX1 - 10; ty = rnd(SY0 + 40, SY1 - 40); }
        else if (side === 1) { x = SX1 - 20; y = rnd(SY0 + 50, SY1 - 50); tx = SX0 + 10; ty = rnd(SY0 + 40, SY1 - 40); }
        else if (side === 2) { x = rnd(SX0 + 60, SX1 - 60); y = SY0 + 12; tx = rnd(SX0 + 60, SX1 - 60); ty = SY1 - 6; }
        else { x = rnd(SX0 + 60, SX1 - 60); y = SY1 - 12; tx = rnd(SX0 + 60, SX1 - 60); ty = SY0 + 6; }
        const d = Math.hypot(tx - x, ty - y), ux = (tx - x) / d, uy = (ty - y) / d, n = 4 + ri(4), sp = 0.35 + level * 0.03;
        for (let k = 0; k < n; k++) foods.push({ t: 'ant', x: x - ux * k * 7, y: y - uy * k * 7, vx: ux * sp, vy: uy * sp, ph: k, life: d / sp + k * 20 + 30 });
      }
      function spawnEnemy(t) {
        let x, y, tries = 0;
        do { [x, y] = randInBasin(12); tries++; } while (tries < 20 && bub && Math.hypot(x - bub.x, y - bub.y) < 80);
        const a = rnd(0, 6.28), e = { t, x, y, vx: 0, vy: 0, ang: a, tt: ri(100), knock: 0, hp: 1, grow: 30 };
        if (t === 'razor') { const sp = 0.6 + level * 0.07; e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.spin = rnd(-0.08, 0.08); }
        if (t === 'sponge' || t === 'brush') { e.dir = rnd(0, 6.28); e.turnT = rnd(60, 160); }
        enemies.push(e);
      }
      function startLevel() {
        foods = []; enemies = []; parts = [];
        newBubble();
        for (let i = 0; i < 18; i++) addFood('crumb');
        for (let i = 0; i < 7; i++) addFood('grease');
        const nR = Math.min(7, 1 + level), nZ = Math.min(4, Math.floor((level + 1) / 2)), nS = Math.min(3, Math.floor((level + 2) / 3)), nB = Math.min(3, Math.floor(level / 3));
        for (let i = 0; i < nR; i++) spawnEnemy('roach');
        for (let i = 0; i < nZ; i++) spawnEnemy('razor');
        for (let i = 0; i < nS; i++) spawnEnemy('sponge');
        for (let i = 0; i < nB; i++) spawnEnemy('brush');
        antT = 120; crumbT = 300; roachT = 1500; levelT = 0;
        A.melody([[523, .08], [659, .08], [784, .08], [659, .08], [784, .08], [1047, .2]], { type: 'triangle', vol: 0.14 });
      }
      function startGame() { state = 'play'; stT = 0; score = 0; lives = 3; level = 1; nextExtra = 20000; popups = []; startLevel(); }
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { nextExtra += 20000; lives = Math.min(9, lives + 1); A.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .15]], { type: 'sine', vol: 0.15 }); }
        if (score > hi) hi = score;
      }
      function popup(x, y, s) { if (popups.length < 10) popups.push({ x, y, s: String(s), t: 45 }); }
      function splash(x, y, n, cols, sp) {
        for (let k = 0; k < n && parts.length < 500; k++) {
          const a = rnd(0, 6.28), s = rnd(0.3, sp || 2);
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: cols[ri(cols.length)], t: rnd(15, 40) });
        }
      }
      function popBubble(cause) {
        if (!bub.alive || bub.safe > 0) return;
        bub.alive = false; deadT = 130; bub.cause = cause;
        const r = radius(bub.s);
        splash(bub.x, bub.y, 30 + r * 4, ['#e0ffff', '#a0e0ff', '#ffffff', '#c0a0ff'], 2.5 + r * 0.1);
        A.noise(0.18, { freq: 6000, vol: 0.35, type: 'highpass' });
        A.tone(1800, 0.12, { type: 'sine', vol: 0.15, slideTo: 300 });
        A.melody([[392, .15], [370, .15], [349, .15], [330, .4]], { type: 'triangle', vol: 0.12, delay: 0.3 });
      }
      function eat(f) {
        const pts = f.t === 'crumb' ? 10 : f.t === 'ant' ? 20 : 50, grow = f.t === 'crumb' ? 2 : f.t === 'ant' ? 3 : 5;
        const before = stage(bub.s);
        bub.s = Math.min(100, bub.s + grow); bub.wob = 10;
        addScore(pts); popup(f.x, f.y - 8, pts);
        A.tone(500 + bub.s * 12, 0.06, { type: 'sine', vol: 0.14, slideTo: 900 + bub.s * 14 });
        if (stage(bub.s) > before) {
          A.melody([[784, .06], [988, .06], [1175, .1]], { type: 'triangle', vol: 0.12 });
          if (stage(bub.s) === 4) { popup(DX, DY - 18, 'DRAIN OPEN'); A.melody([[262, .1], [330, .1], [392, .1], [523, .2]], { type: 'square', vol: 0.08, delay: 0.25 }); }
        }
      }

      // ---------- update ----------
      function confine(o, r, bounce) {
        const p = basinPush(o.x, o.y, r);
        if (!p) return false;
        o.x -= p.nx * p.pen; o.y -= p.ny * p.pen;
        const dot = o.vx * p.nx + o.vy * p.ny;
        if (dot > 0) { o.vx -= (1 + bounce) * dot * p.nx; o.vy -= (1 + bounce) * dot * p.ny; }
        return true;
      }
      function updBubble() {
        if (!bub.alive) {
          if (--deadT <= 0) {
            if (lives <= 1) {
              lives = 0;
              const over = () => { state = 'gameover'; stT = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; newBubble(); }, over); else over();
              return;
            }
            lives--; newBubble();
          }
          return;
        }
        if (bub.safe > 0) bub.safe--;
        if (bub.wob > 0) bub.wob--;
        let ix = 0, iy = 0;
        if (api.key('ArrowLeft')) ix--; if (api.key('ArrowRight')) ix++;
        if (api.key('ArrowUp')) iy--; if (api.key('ArrowDown')) iy++;
        const r = radius(bub.s), acc = 0.11 - bub.s * 0.0004, max = 2.4 - bub.s * 0.009;
        if (ix || iy) { const d = Math.hypot(ix, iy); bub.vx += ix / d * acc; bub.vy += iy / d * acc; }
        bub.vx *= 0.986; bub.vy *= 0.986;
        const sp = Math.hypot(bub.vx, bub.vy); if (sp > max) { bub.vx *= max / sp; bub.vy *= max / sp; }
        // drain: whirlpool pulls a full-size bubble in
        const dd = Math.hypot(bub.x - DX, bub.y - DY);
        if (drainOpen() && dd < 34) {
          const pull = (34 - dd) / 34 * 0.12;
          bub.vx += (DX - bub.x) / (dd || 1) * pull; bub.vy += (DY - bub.y) / (dd || 1) * pull;
          if (dd < DR) { state = 'drain'; stT = 0; drainT = 0; bonusShown = 0; glug(); return; }
        }
        bub.x += bub.vx; bub.y += bub.vy;
        if (confine(bub, r, 0.6) && sp > 1) A.tone(220, 0.04, { type: 'sine', vol: 0.05 });
        // food
        for (let i = foods.length - 1; i >= 0; i--) {
          const f = foods[i];
          if (Math.hypot(f.x - bub.x, f.y - bub.y) < r + (f.t === 'grease' ? 3 : 1.5)) { foods.splice(i, 1); eat(f); }
        }
        // enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          const er = e.t === 'razor' ? 5 : e.t === 'roach' ? 4 : 6;
          const dx = e.x - bub.x, dy = e.y - bub.y, d = Math.hypot(dx, dy);
          if (d >= r + er || e.grow > 0) continue;
          const st = stage(bub.s);
          if (e.t === 'razor') { popBubble('razor'); return; }
          if (e.t === 'roach') {
            if (st >= 3) {
              // a big bubble shoves roaches around (toward the drain, ideally)
              const nx = dx / (d || 1), ny = dy / (d || 1);
              e.knock = 40; e.vx = nx * 2.6 + bub.vx; e.vy = ny * 2.6 + bub.vy;
              bub.vx -= nx * 0.6; bub.vy -= ny * 0.6;
              A.tone(160, 0.06, { type: 'square', vol: 0.08 });
            } else { popBubble('roach'); return; }
          }
          if (e.t === 'sponge' || e.t === 'brush') {
            if (st >= 4) {
              enemies.splice(i, 1); addScore(1000); popup(e.x, e.y - 10, 1000);
              splash(e.x, e.y, 30, e.t === 'sponge' ? ['#ffe040', '#c0a020'] : ['#c08848', '#101010'], 2);
              A.melody([[1568, .05], [1175, .05], [784, .05], [523, .1]], { type: 'square', vol: 0.1 });
            } else if (e.t === 'brush' && st < 3) { popBubble('brush'); return; }
            else {
              const nx = dx / (d || 1), ny = dy / (d || 1);
              bub.vx = -nx * 2.2; bub.vy = -ny * 2.2; bub.x -= nx * 3; bub.y -= ny * 3;
              if (bub.safe <= 0) { bub.s = Math.max(0, bub.s - 10); bub.safe = 30; popup(bub.x, bub.y - r - 8, 'SCRUB!'); A.noise(0.2, { freq: 1200, vol: 0.2 }); }
            }
          }
        }
      }
      function glug() {
        for (let k = 0; k < 5; k++) A.tone(300 - k * 30, 0.12, { type: 'sine', vol: 0.18, slideTo: 120, delay: k * 0.16 });
        A.noise(0.9, { freq: 600, slideTo: 100, vol: 0.12 });
      }
      function updEnemies() {
        const lv = level;
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]; e.tt++;
          if (e.grow > 0) { e.grow--; continue; }
          if (e.t === 'roach') {
            if (e.knock > 0) {
              e.knock--; e.vx *= 0.96; e.vy *= 0.96;
              if (Math.hypot(e.x - DX, e.y - DY) < DR + 1) {
                enemies.splice(i, 1); addScore(500); popup(DX, DY - 14, 500);
                A.tone(600, 0.4, { type: 'sine', vol: 0.15, slideTo: 80 }); roachT = Math.min(roachT, 400); continue;
              }
            } else {
              // scuttle toward the bubble with a nervous wander; give big bubbles a wide berth
              const flee = bub.alive && stage(bub.s) >= 3;
              const tx = bub.alive ? bub.x : DX, ty = bub.alive ? bub.y : DY;
              const near = Math.hypot(tx - e.x, ty - e.y) < 90 + level * 8;
              let want = near ? Math.atan2(ty - e.y, tx - e.x) + (flee ? Math.PI : 0) + Math.sin(e.tt * 0.05 + i) * 0.9
                : e.ang + Math.sin(e.tt * 0.03 + i * 2) * 0.6;
              let da = want - e.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
              e.ang += Math.max(-0.08, Math.min(0.08, da));
              const sp = Math.min(1.5, 0.55 + lv * 0.07) * ((e.tt % 90) < 70 ? 1 : 0.2);
              e.vx = Math.cos(e.ang) * sp; e.vy = Math.sin(e.ang) * sp;
            }
            e.x += e.vx; e.y += e.vy;
            if (confine(e, 4, 0.5) && e.knock <= 0) e.ang += Math.PI * 0.6;
          } else if (e.t === 'razor') {
            e.x += e.vx; e.y += e.vy; e.ang += e.spin;
            if (confine(e, 5, 1)) A.tone(1400, 0.03, { type: 'square', vol: 0.03 });
            if (Math.hypot(e.x - DX, e.y - DY) < DR + 4) { const a = Math.atan2(e.y - DY, e.x - DX); e.vx = Math.cos(a) * Math.hypot(e.vx, e.vy); e.vy = Math.sin(a) * Math.hypot(e.vx, e.vy); }
          } else {
            // sponge / brush: scrub around the basin, wiping up food as they go
            if (--e.turnT <= 0) {
              e.turnT = rnd(50, 150);
              e.dir = Math.random() < 0.4 && bub.alive ? Math.atan2(bub.y - e.y, bub.x - e.x) : rnd(0, 6.28);
            }
            const sp = (e.t === 'brush' ? 0.75 : 0.45) + lv * 0.04;
            const scrub = e.t === 'brush' ? Math.sin(e.tt * 0.4) * 0.8 : 0;
            e.vx = Math.cos(e.dir) * sp - Math.sin(e.dir) * scrub; e.vy = Math.sin(e.dir) * sp + Math.cos(e.dir) * scrub;
            e.x += e.vx; e.y += e.vy;
            if (confine(e, 7, 1)) e.dir = Math.atan2(e.vy, e.vx);
            for (let k = foods.length - 1; k >= 0; k--) { const f = foods[k]; if (f.t !== 'ant' && Math.abs(f.x - e.x) < 7 && Math.abs(f.y - e.y) < 5) foods.splice(k, 1); }
          }
        }
        // ants march, and leave when they reach the far side
        for (let i = foods.length - 1; i >= 0; i--) {
          const f = foods[i]; if (f.t !== 'ant') continue;
          f.ph++; f.x += f.vx + Math.sin(f.ph * 0.3) * 0.2 * -f.vy; f.y += f.vy + Math.sin(f.ph * 0.3) * 0.2 * f.vx;
          if (--f.life <= 0) foods.splice(i, 1);
        }
        if (--antT <= 0) { antT = rnd(360, 600) - Math.min(200, lv * 20); if (foods.filter(f => f.t === 'ant').length < 16) antTrail(); }
        if (--crumbT <= 0) {
          crumbT = rnd(180, 300);
          if (foods.filter(f => f.t !== 'ant').length < 10) { addFood(Math.random() < 0.3 ? 'grease' : 'crumb'); A.tone(1800, 0.04, { type: 'sine', vol: 0.05 }); }
        }
        // more roaches come out of hiding as time passes
        if (--roachT <= 0) { roachT = Math.max(500, 1400 - lv * 80); if (enemies.filter(e => e.t === 'roach').length < 10) spawnEnemy('roach'); }
      }
      function updMisc() {
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; if (--p.t <= 0) parts.splice(i, 1); }
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }

      function update() {
        stT++; if (coinFlash > 0) coinFlash--;
        if (state === 'attract') {
          demo.x += demo.vx; demo.y += demo.vy;
          confine(demo, 10, 1);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.2 }); }
          }
          return;
        }
        if (state === 'gameover') {
          updMisc();
          if (stT > 240 || (stT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; stT = 0; }
          return;
        }
        if (state === 'drain') {
          updMisc();
          drainT++;
          const bonus = level * 1000;
          if (drainT === 100) { addScore(bonus); A.melody([[523, .1], [659, .1], [784, .1], [1047, .25]], { type: 'triangle', vol: 0.15 }); }
          if (drainT > 220) { level++; state = 'play'; startLevel(); }
          return;
        }
        levelT++;
        updBubble();
        if (state !== 'play') return;
        updEnemies(); updMisc();
      }

      // ---------- render ----------
      function blit(ctx, s, x, y) { ctx.drawImage(s.c, Math.round(x - s.w / 2), Math.round(y - s.h / 2)); }
      function drawBubble(ctx, x, y, s, t) {
        const r = radius(s), st = stage(s);
        const wob = bub && bub.wob > 0 ? Math.round(Math.sin(bub.wob) * 1) : 0;
        const hue = ['#c8f4ff', '#d0e8ff', '#e0d8ff', '#f0d0ff', '#d0fff0'][((t >> 3) + 0) % 5];
        disc(ctx, x, y, r + wob, 'rgba(200,240,255,0.28)');
        ring(ctx, x, y, r + wob, hue);
        if (r >= 5) ring(ctx, x, y, r - 1 + wob, 'rgba(255,255,255,0.25)');
        // sheen highlight
        ctx.fillStyle = '#ffffff';
        const hx = Math.round(x - r * 0.45), hy = Math.round(y - r * 0.5);
        ctx.fillRect(hx, hy, Math.max(1, r >> 2), 1); ctx.fillRect(hx - 1, hy + 1, 1, Math.max(1, r >> 2));
        if (st >= 1) { ctx.fillStyle = '#203050'; ctx.fillRect(Math.round(x - r * 0.35), Math.round(y - r * 0.15), 1 + (st >> 1), 1 + (st >> 1)); ctx.fillRect(Math.round(x + r * 0.25), Math.round(y - r * 0.15), 1 + (st >> 1), 1 + (st >> 1)); }
        if (st >= 2) {
          ctx.fillStyle = '#203050';
          const mw = Math.round(r * 0.6), my = Math.round(y + r * 0.35);
          for (let i = 0; i < mw; i++) { const k = (i / (mw - 1 || 1)) * 2 - 1; const dy = st >= 3 ? Math.round((1 - k * k) * (st - 1)) : 0; ctx.fillRect(Math.round(x - mw / 2) + i, my + dy, 1, 1); }
        }
        if (st >= 4) { ctx.fillStyle = '#ff8090'; ctx.fillRect(Math.round(x - r * 0.65), Math.round(y + r * 0.1), 2, 1); ctx.fillRect(Math.round(x + r * 0.5), Math.round(y + r * 0.1), 2, 1); }
      }
      function drawFood(ctx, f) {
        const x = Math.round(f.x), y = Math.round(f.y);
        if (f.t === 'crumb') {
          ctx.fillStyle = '#d0a060'; ctx.fillRect(x - 1, y - 1, 3, 2);
          ctx.fillStyle = '#f0d090'; ctx.fillRect(x - 1, y - 1, 1 + (f.shape & 1), 1);
          ctx.fillStyle = '#906020'; ctx.fillRect(x, y + 1, 2, 1);
        } else if (f.t === 'grease') {
          ctx.fillStyle = '#8a7020'; ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 2, y - 2, 5, 5);
          ctx.fillStyle = '#c0a030'; ctx.fillRect(x - 2, y - 1, 4, 2);
          ctx.fillStyle = '#fff0a0'; ctx.fillRect(x - 1, y - 1, 1, 1);
        } else {
          ctx.fillStyle = '#101010';
          ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x - 1, y - 1, 1, 1);
          const leg = (f.ph >> 2) & 1;
          ctx.fillRect(x - 1 + leg, y + 1, 1, 1); ctx.fillRect(x + 1 - leg, y - 1, 1, 1);
        }
      }
      function drawEnemy(ctx, e) {
        if (e.grow > 0 && (e.grow & 2)) return;
        const k16 = ((Math.round(e.ang / 6.2832 * 16) % 16) + 16) % 16;
        if (e.t === 'roach') blit(ctx, ROACH[(e.tt >> 2) & 1][k16], e.x, e.y);
        else if (e.t === 'razor') blit(ctx, RAZOR[k16], e.x, e.y);
        else if (e.t === 'sponge') {
          blit(ctx, SPONGE, e.x, e.y);
          if ((e.tt & 15) < 3) { ctx.fillStyle = '#e0ffff'; ctx.fillRect(Math.round(e.x - e.vx * 6), Math.round(e.y - e.vy * 6), 2, 2); }
        } else blit(ctx, BRUSH[(e.tt >> 2) & 1], e.x, e.y);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(16,24,40,0.85)'; ctx.fillRect(0, 0, W, 20);
        text(ctx, String(score).padStart(6, '0'), 6, 3, '#ffffff');
        text(ctx, 'HI ' + hi, 6, 12, '#c0f0ff');
        for (let i = 0; i < Math.min(6, lives - (bub && bub.alive ? 1 : 0)); i++) { ring(ctx, 232 + i * 9, 6, 3, '#c8f4ff'); ctx.fillStyle = '#fff'; ctx.fillRect(231 + i * 9, 4, 1, 1); }
        text(ctx, 'SINK ' + level, 286, 12, '#ffe040', 1, 'right');
        // size gauge
        if (bub) {
          ctx.fillStyle = '#203040'; ctx.fillRect(170, 4, 50, 4);
          ctx.fillStyle = bub.s >= 80 ? ((api.frame & 8) ? '#ffffff' : '#40ffa0') : '#60c0ff'; ctx.fillRect(170, 4, Math.round(bub.s / 2), 4);
          ctx.fillStyle = '#ffe040'; ctx.fillRect(210, 3, 1, 6);
          text(ctx, 'SIZE', 136, 3, '#80a0c0');
        }
      }
      function drawTitle(ctx, y) {
        const cols = ['#e0ffff', '#c0f0ff', '#a0e0ff', '#80c0ff', '#a0a0ff', '#c080ff', '#ff80ff'];
        const s = 'BUBBLES';
        for (let i = 0; i < s.length; i++) {
          const bob = Math.round(Math.sin(stT * 0.06 + i * 0.8) * 3);
          text(ctx, s[i], W / 2 - 84 + i * 24 + 2, y + bob + 2, '#203050', 4);
          text(ctx, s[i], W / 2 - 84 + i * 24, y + bob, r => cols[r], 4);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.drawImage(SINK, 0, 0);
        if (state === 'attract') {
          drawBubble(ctx, demo.x, demo.y, 60 + Math.sin(stT * 0.02) * 30, stT);
          ctx.fillStyle = 'rgba(10,20,40,0.6)'; ctx.fillRect(30, 40, W - 60, 170);
          drawTitle(ctx, 52);
          const page = Math.floor(stT / 420) % 2;
          if (page === 0) {
            text(ctx, 'EAT ANTS, CRUMBS AND GREASE', W / 2, 98, '#ffffff', 1, 'center');
            text(ctx, 'GROW BIG, THEN GO DOWN THE DRAIN', W / 2, 110, '#ffffff', 1, 'center');
            if (api.credits > 0) text(ctx, 'PUSH START', W / 2, 140, (api.frame & 32) ? '#ffffff' : '#40ffff', 1, 'center');
            else if (coinFlash > 0 ? (coinFlash & 8) : (stT % 60) < 40) text(ctx, 'INSERT COIN', W / 2, 140, coinFlash > 0 ? '#ff4040' : '#ffffff', 1, 'center');
            text(ctx, 'HIGH SCORE ' + hi, W / 2, 160, '#ffe040', 1, 'center');
            text(ctx, '\u00a9 1982 WILLIAMS', W / 2, 190, '#a0b0c0', 1, 'center');
          } else {
            const rows = [['crumb', 'CRUMB', '10'], ['ant', 'ANT', '20'], ['grease', 'GREASE', '50'], ['roach', 'ROACH DOWN DRAIN', '500'], ['sponge', 'SPONGE / BRUSH', '1000'], ['razor', 'RAZOR BLADE', 'AVOID!']];
            rows.forEach(([k, n, p], i) => {
              const y = 98 + i * 17, x = 70;
              if (k === 'crumb' || k === 'ant' || k === 'grease') drawFood(ctx, { t: k, x, y: y + 3, ph: stT, shape: 1 });
              else if (k === 'roach') blit(ctx, ROACH[(stT >> 2) & 1][12], x, y + 3);
              else if (k === 'sponge') blit(ctx, SPONGE, x, y + 3);
              else blit(ctx, RAZOR[(stT >> 3) & 15], x, y + 3);
              text(ctx, n, 90, y, '#ffffff'); text(ctx, p, 250, y, '#ffe040', 1, 'right');
            });
          }
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 222, '#c0f0ff', 1, 'center');
          return;
        }
        // drain swirl when open
        if (drainOpen() || state === 'drain') {
          for (let k = 0; k < 12; k++) {
            const a = k / 12 * 6.283 + stT * 0.15, rr = 12 + (k % 3) * 5;
            ctx.fillStyle = k & 1 ? '#e0f0ff' : '#80a0c0';
            ctx.fillRect(Math.round(DX + Math.cos(a) * rr), Math.round(DY + Math.sin(a) * rr * 0.9), 2, 1);
          }
        }
        for (const f of foods) drawFood(ctx, f);
        for (const e of enemies) drawEnemy(ctx, e);
        if (state === 'drain') {
          const k = Math.max(0, 1 - drainT / 80), a = drainT * 0.3;
          if (k > 0) drawBubble(ctx, DX + Math.cos(a) * 8 * k, DY + Math.sin(a) * 8 * k, Math.max(0, Math.round(bub.s * k)), stT);
        } else if (bub && bub.alive && !(bub.safe > 0 && (bub.safe & 4) && levelT > 90)) drawBubble(ctx, bub.x, bub.y, bub.s, stT);
        for (const p of parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
        if (bub && !bub.alive && deadT > 90) {
          const rr = Math.round(radius(bub.s) + (130 - deadT) * 0.6);
          ring(ctx, bub.x, bub.y, rr, '#ffffff');
          text(ctx, 'POP!', bub.x, bub.y - 4, '#ffffff', 1, 'center');
        }
        for (const p of popups) text(ctx, p.s, p.x, p.y - (45 - p.t) / 3, '#ffffff', 1, 'center');
        drawHUD(ctx);
        if (state === 'play' && levelT < 120) { text(ctx, 'SINK ' + level, W / 2, 70, '#ffffff', 2, 'center'); }
        if (state === 'drain') {
          text(ctx, 'DOWN THE DRAIN!', W / 2, 70, '#ffffff', 2, 'center');
          if (drainT > 100) text(ctx, 'BONUS ' + level * 1000, W / 2, 168, '#ffe040', 1, 'center');
        }
        if (state === 'gameover') text(ctx, 'GAME OVER', W / 2, 90, '#ff4040', 2, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
