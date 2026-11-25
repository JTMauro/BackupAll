// Sinistar (Williams, 1982) \u2014 from-scratch raster recreation for the Game Room.
// Mine planetoids for crystals, turn them into sinibombs, and blast the Sinistar before the workers finish it.
(function () {
  'use strict';
  const W = 240, H = 292, HUD = 42, VCX = 120, VCY = HUD + (H - HUD) / 2, WS = 2560;

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
  const PAL = { W: '#ffffff', w: '#a0a0b8', R: '#ff2020', r: '#a00000', Y: '#ffff40', B: '#3060ff', b: '#1830a0', C: '#40ffff', G: '#30e030', g: '#108010', O: '#ff9020', K: '#404040', M: '#ff40ff' };
  const ART = {
    ship: [
      '...W.......',
      '..WWW......',
      '..WRWW.....',
      '.wWWWWWW...',
      'BBwWWCCWWW.',
      'BBwWWCCWWWW',
      'BBwWWCCWWW.',
      '.wWWWWWW...',
      '..WRWW.....',
      '..WWW......',
      '...W.......'
    ],
    warrior: [
      '..GG.....',
      '.GgGG....',
      'GGWWGGG..',
      '.gWRRWGGG',
      '.gWRRWGGG',
      'GGWWGGG..',
      '.GgGG....',
      '..GG.....',
      '.........'
    ],
    worker0: ['..R.R..', '.RRRRR.', 'RRYRYRR', '.RRRRR.', 'R.R.R.R', '.......'],
    worker1: ['R.R.R.R', '.RRRRR.', 'RRYRYRR', '.RRRRR.', '..R.R..', '.......'],
    shipIcon: ['.W...', 'WWWW.', 'BWCWW', 'WWWW.', '.W...'],
    bombIcon: ['.Y.', 'YRY', '.Y.']
  };
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows) {
    const h = rows.length, w = rows[0].length, c = canvas(w, h), x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][i]; if (ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } }
    return { c, w, h };
  }
  // pre-rotated crisp sprites (nearest-neighbour sampling)
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

  // ---------- speech-like synthesis ----------
  const VOW = { ee: [270, 2290], ih: [390, 1990], eh: [530, 1840], ah: [730, 1090], aw: [570, 840], oo: [300, 870], er: [490, 1350], uh: [640, 1190] };
  const PHRASES = {
    'BEWARE, I LIVE!': [['b', 'ee', .13], ['w', 'eh', .26, 'er'], [0, 0, .08], ['', 'ah', .2, 'ee'], [0, 0, .05], ['l', 'ih', .14], ['v', 'ih', .26, 'v']],
    'I HUNGER!': [['', 'ah', .24, 'ee'], [0, 0, .06], ['h', 'uh', .16], ['n', 'er', .32]],
    'RUN, COWARD!': [['r', 'uh', .28, 'n'], [0, 0, .12], ['k', 'aw', .18], ['w', 'er', .28, 'd']],
    'RUN! RUN! RUN!': [['r', 'uh', .2, 'n'], [0, 0, .12], ['r', 'uh', .2, 'n'], [0, 0, .12], ['r', 'uh', .26, 'n']],
    'BEWARE, COWARD!': [['b', 'ee', .12], ['w', 'eh', .24, 'er'], [0, 0, .1], ['k', 'aw', .18], ['w', 'er', .28, 'd']],
    'I AM SINISTAR!': [['', 'ah', .2, 'ee'], ['', 'ah', .16, 'm'], [0, 0, .06], ['s', 'ih', .1], ['n', 'ih', .1], ['s', 'ah', .3, 'r']],
    'AAARRRGH!': [['', 'ah', .5, 'er'], ['', 'er', .4]]
  };

  ArcadeRegistry.register({
    id: 'sinistar', title: 'Sinistar', year: 1982, maker: 'Williams',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly (8-way) \u00b7 Space: fire \u00b7 X: sinibomb \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#ff2020', accent: '#c0c0c0' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;
      const wrap = v => ((v % WS) + WS) % WS;
      const dw = (a, b) => { let d = (a - b) % WS; if (d > WS / 2) d -= WS; else if (d < -WS / 2) d += WS; return d; };
      const dist = (a, b) => Math.hypot(dw(a.x, b.x), dw(a.y, b.y));

      const SHIP = rotSet(ART.ship, 32), WAR = rotSet(ART.warrior, 16);
      const WK = [sprite(ART.worker0), sprite(ART.worker1)], ICON = sprite(ART.shipIcon), BICON = sprite(ART.bombIcon);

      // planetoid sprites
      const ROCKS = [];
      for (let v = 0; v < 6; v++) {
        const r = 9 + v * 2, S = r * 2 + 5, c = canvas(S, S), x = c.getContext('2d'), m = S / 2;
        const bumps = []; for (let k = 0; k < 7; k++) bumps.push([rnd(0, 6.28), rnd(0.6, 2.2), ri(5) + 2]);
        const craters = []; for (let k = 0; k < 2 + v; k++) { const a = rnd(0, 6.28), d = rnd(0, r * 0.6); craters.push([m + Math.cos(a) * d, m + Math.sin(a) * d, rnd(1.5, 3)]); }
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
          const dx = i + 0.5 - m, dy = j + 0.5 - m, a = Math.atan2(dy, dx);
          let rr = r; for (const [p, amp, f] of bumps) rr += Math.sin(a * f + p) * amp * 0.5;
          const d = Math.hypot(dx, dy); if (d > rr) continue;
          const shade = (dx * -0.6 + dy * -0.8) / rr; // light from top-left
          let col = shade > 0.35 ? '#b8a070' : shade > -0.2 ? '#8c7448' : shade > -0.6 ? '#5c4828' : '#3a2c18';
          for (const [cx2, cy2, cr] of craters) { const cd = Math.hypot(i + 0.5 - cx2, j + 0.5 - cy2); if (cd < cr) col = cd < cr - 1 ? '#3a2c18' : '#c8b080'; }
          if (d > rr - 1) col = '#2c2010';
          x.fillStyle = col; x.fillRect(i, j, 1, 1);
        }
        ROCKS.push({ c, w: S, h: S, r });
      }

      // Sinistar face, built from 20 pieces: SIN[k] shows the first k pieces
      const SR = 20, SS = SR * 2 + 2;
      const SIN = [];
      (function buildSin() {
        const m = SS / 2, px = [];
        for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
          const dx = i + 0.5 - m, dy = j + 0.5 - m, d = Math.hypot(dx, dy);
          if (d > SR) continue;
          let col = d > SR - 1.5 ? '#585858' : (dx + dy < 0 ? '#a8a8a8' : '#808080');
          if (((i * 7 + j * 13) % 11) === 0 && d < SR - 2) col = '#686868';
          // eye sockets
          const el = Math.hypot(dx + 7, (dy + 5) * 1.3), er = Math.hypot(dx - 7, (dy + 5) * 1.3);
          if (el < 4.2 || er < 4.2) col = '#200000';
          if (el < 2.2 || er < 2.2) col = '#ff2020';
          if (el < 1 || er < 1) col = '#ffff60';
          // brow ridge
          if (dy > -11 && dy < -9.5 && Math.abs(dx) < 12) col = '#505050';
          // nose
          if (Math.abs(dx) < 1.5 && dy > -2 && dy < 3) col = '#303030';
          // mouth with teeth
          if (dy > 5 && dy < 13 && Math.abs(dx) < 11 - (dy - 5) * 0.4) {
            col = '#200000';
            if ((dy < 7.5 || dy > 10.5) && ((Math.floor(dx + 20) & 3) !== 0)) col = '#f0f0e0';
          }
          const a = Math.atan2(dy, dx), piece = Math.min(19, (Math.floor((a + Math.PI) / (Math.PI * 2) * 10) % 10) + (d < SR * 0.55 ? 10 : 0));
          px.push([i, j, col, piece]);
        }
        const order = [0, 5, 2, 7, 4, 9, 1, 6, 3, 8, 10, 15, 12, 17, 14, 19, 11, 16, 13, 18];
        const rank = []; order.forEach((p, k) => rank[p] = k);
        for (let k = 0; k <= 20; k++) {
          const c = canvas(SS, SS), x = c.getContext('2d');
          for (const [i, j, col, p] of px) if (rank[p] < k) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
          // build-site scaffold outline
          SIN.push({ c, w: SS, h: SS });
        }
      })();

      const stars = [];
      for (let i = 0; i < 90; i++) stars.push({ x: rnd(0, 512), y: rnd(0, 512), c: ['#ffffff', '#8080ff', '#ffff80', '#ff8080', '#808080'][ri(5)], p: Math.random() < 0.5 ? 0.3 : 0.6 });

      // ---------- speech ----------
      let subtitle = '', subT = 0, speechBusy = 0;
      function speak(ph, force) {
        if (speechBusy > 0 && !force) return;
        const seq = PHRASES[ph]; if (!seq) return;
        let t = 0; const f0 = 88;
        for (const [cons, v, d, tail] of seq) {
          if (!v) { t += d; continue; }
          if (cons === 's' || cons === 'v' || cons === 'h') { A.noise(0.07, { freq: cons === 'h' ? 1500 : 5200, type: 'bandpass', vol: 0.14, delay: t }); t += 0.05; }
          else if (cons === 'b' || cons === 'k') { A.noise(0.03, { freq: cons === 'b' ? 400 : 2500, type: 'bandpass', vol: 0.2, delay: t }); t += 0.02; }
          const [F1, F2] = VOW[v]; const T = VOW[tail] || null;
          A.tone(f0 * (1 + Math.random() * 0.05), d, { type: 'sawtooth', vol: 0.16, delay: t, slideTo: f0 * 0.82, attack: 0.02 });
          A.tone(F1, d, { type: 'square', vol: 0.05, delay: t, slideTo: T ? T[0] : F1 * 0.95, attack: 0.02 });
          A.tone(F2, d, { type: 'sine', vol: 0.06, delay: t, slideTo: T ? T[1] : F2 * 0.97, attack: 0.02 });
          if (tail === 'v' || tail === 'd') A.noise(0.06, { freq: tail === 'v' ? 3500 : 600, type: 'bandpass', vol: 0.12, delay: t + d * 0.8 });
          t += d;
        }
        A.noise(t, { freq: 160, vol: 0.06 });
        subtitle = ph; subT = Math.round(t * 60) + 50; speechBusy = Math.round(t * 60) + 20;
      }

      // ---------- game state ----------
      let hi = api.getHiScore(30000);
      let state = 'attract', stT = 0, coinFlash = 0;
      let score = 0, lives = 3, bombs = 0, zone = 1, nextExtra = 20000;
      let ship, rocks = [], crystals = [], enemies = [], shots = [], ebullets = [], sbombs = [], parts = [], popups = [];
      let sin = null, camX = 0, camY = 0, deadT = 0, eaten = null, tauntT = 0, spawnT = 0, flash = 0, zoneT = 0, fireHold = 0;
      const ZONES = ['WORKER ZONE', 'WARRIOR ZONE', 'PLANETOID ZONE', 'VOID ZONE'];
      const zoneKind = () => (zone - 1) % 4;
      const wantWorkers = () => Math.min(12, 3 + Math.floor(zone / 2) + (zoneKind() === 0 ? 2 : 0));
      const wantWarriors = () => Math.min(11, 1 + zone + (zoneKind() === 1 ? 3 : 0));

      function makeRocks() {
        rocks = [];
        const n = zoneKind() === 2 ? 34 : zoneKind() === 3 ? 12 : 24;
        for (let i = 0; i < n; i++) {
          let x, y, tries = 0;
          do { x = rnd(0, WS); y = rnd(0, WS); tries++; } while (tries < 20 && (Math.hypot(dw(x, ship.x), dw(y, ship.y)) < 90 || rocks.some(r => Math.hypot(dw(r.x, x), dw(r.y, y)) < 70)));
          const s = ROCKS[ri(ROCKS.length)];
          rocks.push({ x, y, vx: rnd(-0.12, 0.12), vy: rnd(-0.12, 0.12), s, r: s.r, hits: 0, flash: 0 });
        }
      }
      function farPoint(min) {
        for (let k = 0; k < 30; k++) { const x = rnd(0, WS), y = rnd(0, WS); if (Math.hypot(dw(x, ship.x), dw(y, ship.y)) > min) return [x, y]; }
        return [wrap(ship.x + WS / 2), wrap(ship.y + WS / 2)];
      }
      function spawnEnemy(t) {
        const [x, y] = farPoint(320);
        const e = { t, x, y, vx: 0, vy: 0, tt: ri(500), carry: false, target: null, mineT: rnd(300, 650), fireT: rnd(60, 160), ang: 0, orbit: Math.random() < 0.5 ? 1 : -1 };
        enemies.push(e); return e;
      }
      function newShip() { ship = { x: ship ? ship.x : WS / 2, y: ship ? ship.y : WS / 2, vx: 0, vy: 0, ang: 0, inv: 120, alive: true }; }
      function startZone() {
        enemies = []; crystals = []; shots = []; ebullets = []; sbombs = [];
        makeRocks();
        const [sx, sy] = farPoint(700);
        sin = { x: sx, y: sy, vx: 0, vy: 0, pieces: Math.min(8, (zone - 1) * 2), active: false, hitT: 0, tt: 0 };
        for (let i = 0; i < wantWorkers(); i++) spawnEnemy('wk');
        for (let i = 0; i < wantWarriors(); i++) spawnEnemy('wr');
        zoneT = 150; tauntT = 600; spawnT = 0;
        A.melody([[196, .1], [262, .1], [330, .1], [392, .25]], { type: 'square', vol: 0.1 });
      }
      function startGame() {
        state = 'play'; stT = 0; score = 0; lives = 3; bombs = 0; zone = 1; nextExtra = 20000; parts = []; popups = [];
        ship = null; newShip(); startZone(); fireHold = 0;
      }
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { nextExtra += 20000; lives = Math.min(9, lives + 1); A.melody([[784, .08], [988, .08], [1319, .18]], { type: 'square', vol: 0.12 }); }
        if (score > hi) hi = score;
      }
      function popup(x, y, s) { if (popups.length < 10) popups.push({ x, y, s: String(s), t: 50 }); }
      function burst(x, y, n, cols, sp) {
        for (let k = 0; k < n && parts.length < 700; k++) {
          const a = rnd(0, 6.28), s = rnd(0.3, sp || 2.5);
          parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: cols[ri(cols.length)], t: rnd(20, 50) });
        }
      }
      function spawnCrystal(x, y, vx, vy) {
        if (crystals.length > 30) return;
        crystals.push({ x: wrap(x), y: wrap(y), vx, vy, t: 900, claimed: null });
      }

      function killEnemy(i, pts) {
        const e = enemies[i];
        if (e.t === 'wk' && e.carry) spawnCrystal(e.x, e.y, rnd(-0.5, 0.5), rnd(-0.5, 0.5));
        if (e.target && e.target.claimed === e) e.target.claimed = null;
        burst(e.x, e.y, e.t === 'wk' ? 18 : 28, e.t === 'wk' ? ['#ff2020', '#ffff40', '#a00000'] : ['#30e030', '#ffffff', '#ff2020'], 2.2);
        enemies.splice(i, 1);
        if (pts) { const p = e.t === 'wk' ? 150 : 500; addScore(p); popup(e.x, e.y - 8, p); }
        A.noise(0.25, { freq: 2200, slideTo: 200, vol: 0.18 });
        A.tone(e.t === 'wk' ? 600 : 300, 0.18, { type: 'square', vol: 0.06, slideTo: 80 });
      }
      function killShip(byMouth) {
        if (!ship.alive || ship.inv > 0) return;
        ship.alive = false; deadT = 150; flash = 6;
        if (byMouth) { eaten = { t: 40, x: ship.x, y: ship.y }; speak('I HUNGER!', true); }
        else eaten = null;
        burst(ship.x, ship.y, 90, ['#ffffff', '#40ffff', '#3060ff', '#ffff40', '#ff2020'], 3.5);
        A.noise(1.6, { freq: 3000, slideTo: 40, vol: 0.4 });
        A.tone(900, 1.2, { type: 'sawtooth', vol: 0.08, slideTo: 40 });
        fireHold = 0;
      }
      function sinistarDies() {
        burst(sin.x, sin.y, 260, ['#ffffff', '#a8a8a8', '#808080', '#ff2020', '#ffff40', '#ff9020'], 5);
        flash = 20; speak('AAARRRGH!', true);
        A.noise(2.5, { freq: 1200, slideTo: 30, vol: 0.5 });
        const pts = zone === 1 ? 15000 : 20000; addScore(pts); popup(sin.x, sin.y, pts);
        sin.pieces = 0; sin.active = false; sin.dead = true;
        state = 'zoneclear'; stT = 0; ebullets = [];
      }

      // ---------- update ----------
      function steer(o, tx, ty, acc, max) {
        const dx = dw(tx, o.x), dy = dw(ty, o.y), d = Math.hypot(dx, dy) || 1;
        o.vx += dx / d * acc; o.vy += dy / d * acc;
        const s = Math.hypot(o.vx, o.vy); if (s > max) { o.vx *= max / s; o.vy *= max / s; }
        return d;
      }
      function updShip() {
        if (!ship.alive) {
          if (eaten && eaten.t > 0) eaten.t--;
          if (--deadT <= 0) {
            const respawn = () => {
              newShip();
              ebullets = [];
              if (sin && sin.active) { const a = rnd(0, 6.28); sin.x = wrap(ship.x + Math.cos(a) * 700); sin.y = wrap(ship.y + Math.sin(a) * 700); sin.vx = sin.vy = 0; }
              for (const e of enemies) if (dist(e, ship) < 160) { const [x, y] = farPoint(320); e.x = x; e.y = y; }
            };
            if (lives <= 1) {
              lives = 0;
              const over = () => { state = 'gameover'; stT = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over();
              return;
            }
            lives--; respawn();
          }
          return;
        }
        if (ship.inv > 0) ship.inv--;
        let ix = 0, iy = 0;
        if (api.key('ArrowLeft')) ix--; if (api.key('ArrowRight')) ix++;
        if (api.key('ArrowUp')) iy--; if (api.key('ArrowDown')) iy++;
        if (ix || iy) {
          const ta = Math.atan2(iy, ix);
          let da = ta - ship.ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          ship.ang += Math.max(-0.35, Math.min(0.35, da));
          const d = Math.hypot(ix, iy);
          ship.vx += ix / d * 0.13; ship.vy += iy / d * 0.13;
          if (api.frame % 5 === 0) A.noise(0.08, { freq: 400, vol: 0.06 });
        } else { ship.vx *= 0.985; ship.vy *= 0.985; }
        const sp = Math.hypot(ship.vx, ship.vy), MAX = 3.3;
        if (sp > MAX) { ship.vx *= MAX / sp; ship.vy *= MAX / sp; }
        ship.x = wrap(ship.x + ship.vx); ship.y = wrap(ship.y + ship.vy);
        // fire (auto-repeat while held)
        if (api.key('Space')) {
          if (fireHold % 7 === 0 && shots.length < 6) {
            const ca = Math.cos(ship.ang), sa = Math.sin(ship.ang);
            shots.push({ x: wrap(ship.x + ca * 7), y: wrap(ship.y + sa * 7), vx: ca * 6 + ship.vx, vy: sa * 6 + ship.vy, t: 38 });
            A.tone(1600, 0.06, { type: 'square', vol: 0.05, slideTo: 700 });
          }
          fireHold++;
        } else fireHold = 0;
        if (api.pressed('KeyX')) {
          if (bombs > 0) {
            bombs--;
            const ca = Math.cos(ship.ang), sa = Math.sin(ship.ang);
            sbombs.push({ x: ship.x, y: ship.y, vx: ca * 3 + ship.vx, vy: sa * 3 + ship.vy, t: 420, sp: 0 });
            A.tone(200, 0.4, { type: 'sawtooth', vol: 0.1, slideTo: 900 });
          } else A.tone(90, 0.1, { type: 'square', vol: 0.08 });
        }
        // planetoid bumps
        for (const r of rocks) {
          const dx = dw(ship.x, r.x), dy = dw(ship.y, r.y), d = Math.hypot(dx, dy);
          if (d < r.r + 5 && d > 0) {
            const nx = dx / d, ny = dy / d, dot = ship.vx * nx + ship.vy * ny;
            ship.x = wrap(r.x + nx * (r.r + 5)); ship.y = wrap(r.y + ny * (r.r + 5));
            if (dot < 0) { ship.vx -= 1.6 * dot * nx; ship.vy -= 1.6 * dot * ny; ship.vx *= 0.6; ship.vy *= 0.6; A.tone(110, 0.08, { type: 'triangle', vol: 0.15 }); }
          }
        }
        // crystals
        for (let i = crystals.length - 1; i >= 0; i--) {
          const c = crystals[i];
          if (dist(c, ship) < 8) {
            crystals.splice(i, 1);
            if (bombs < 20) bombs++;
            addScore(200); popup(c.x, c.y - 6, 200);
            A.melody([[1047, .04], [1319, .04], [1568, .06]], { type: 'square', vol: 0.09 });
          }
        }
      }

      function updShots() {
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i]; s.x = wrap(s.x + s.vx); s.y = wrap(s.y + s.vy);
          let gone = --s.t <= 0;
          if (!gone) for (const r of rocks) {
            if (Math.hypot(dw(s.x, r.x), dw(s.y, r.y)) < r.r) {
              gone = true; r.hits++; r.flash = 4; addScore(5);
              A.tone(240, 0.04, { type: 'square', vol: 0.05 });
              if (Math.random() < Math.min(0.45, 0.05 + r.hits * 0.012)) {
                const d = Math.hypot(s.vx, s.vy) || 1;
                spawnCrystal(r.x - s.vx / d * (r.r + 3), r.y - s.vy / d * (r.r + 3), -s.vx / d * 0.9 + rnd(-0.3, 0.3), -s.vy / d * 0.9 + rnd(-0.3, 0.3));
                A.tone(2000, 0.08, { type: 'sine', vol: 0.08, slideTo: 3000 });
              }
              break;
            }
          }
          if (!gone) for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (Math.hypot(dw(s.x, e.x), dw(s.y, e.y)) < (e.t === 'wk' ? 5 : 6)) { killEnemy(j, true); gone = true; break; }
          }
          if (!gone && sin && sin.pieces > 0 && Math.hypot(dw(s.x, sin.x), dw(s.y, sin.y)) < SR) { gone = true; A.tone(120, 0.05, { type: 'square', vol: 0.06 }); }
          if (gone) shots.splice(i, 1);
        }
        for (let i = ebullets.length - 1; i >= 0; i--) {
          const b = ebullets[i]; b.x = wrap(b.x + b.vx); b.y = wrap(b.y + b.vy);
          let gone = --b.t <= 0;
          if (!gone && ship.alive && Math.hypot(dw(b.x, ship.x), dw(b.y, ship.y)) < 5) { gone = true; killShip(false); }
          if (!gone) for (const r of rocks) if (Math.hypot(dw(b.x, r.x), dw(b.y, r.y)) < r.r) { gone = true; break; }
          if (gone) ebullets.splice(i, 1);
        }
        for (let i = sbombs.length - 1; i >= 0; i--) {
          const b = sbombs[i];
          if (sin && sin.pieces > 0) {
            const dx = dw(sin.x, b.x), dy = dw(sin.y, b.y), d = Math.hypot(dx, dy) || 1;
            b.vx += dx / d * 0.28; b.vy += dy / d * 0.28;
            const s = Math.hypot(b.vx, b.vy), mx = 4.6; if (s > mx) { b.vx *= mx / s; b.vy *= mx / s; }
          }
          b.x = wrap(b.x + b.vx); b.y = wrap(b.y + b.vy); b.sp += 0.3;
          let gone = --b.t <= 0;
          if (gone) burst(b.x, b.y, 10, ['#ffff40', '#ff2020'], 1.5);
          // workers and warriors throw themselves in front of sinibombs
          if (!gone) for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (Math.hypot(dw(b.x, e.x), dw(b.y, e.y)) < 7) { killEnemy(j, true); gone = true; burst(b.x, b.y, 20, ['#ffff40', '#ff2020'], 2); break; }
          }
          if (!gone && sin && sin.pieces > 0 && Math.hypot(dw(b.x, sin.x), dw(b.y, sin.y)) < SR - 2) {
            gone = true; sin.pieces = Math.max(0, sin.pieces - 2); sin.hitT = 12;
            addScore(500); popup(sin.x, sin.y - 26, 500);
            burst(b.x, b.y, 40, ['#a8a8a8', '#808080', '#ffff40', '#ff2020'], 3);
            A.noise(0.6, { freq: 1500, slideTo: 80, vol: 0.35 });
            if (sin.active) { if (sin.pieces <= 0) sinistarDies(); else A.tone(70, 0.5, { type: 'sawtooth', vol: 0.15, slideTo: 40 }); }
          }
          if (gone) sbombs.splice(i, 1);
        }
      }

      function updEnemies() {
        const lvl = zone;
        const wkMax = Math.min(2.4, 1.4 + lvl * 0.1), wrMax = Math.min(2.8, 1.7 + lvl * 0.12);
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]; e.tt++;
          const dShip = ship.alive ? dist(e, ship) : 9999;
          // intercept nearby sinibombs
          let blocking = null;
          for (const b of sbombs) if (Math.hypot(dw(b.x, e.x), dw(b.y, e.y)) < 80) { blocking = b; break; }
          if (blocking && Math.random() < 0.6) { steer(e, blocking.x, blocking.y, 0.2, (e.t === 'wk' ? wkMax : wrMax) + 0.6); }
          else if (e.t === 'wk') {
            if (e.carry) {
              const d = steer(e, sin.x, sin.y, 0.09, wkMax);
              if (d < SR + 2) {
                e.carry = false;
                if (sin.pieces < 20) {
                  sin.pieces++;
                  if (Math.abs(dw(sin.x, ship.x)) < 200 && Math.abs(dw(sin.y, ship.y)) < 200) A.tone(300 + sin.pieces * 30, 0.1, { type: 'square', vol: 0.07 });
                  if (sin.pieces >= 20 && !sin.active) { sin.active = true; speak('BEWARE, I LIVE!', true); tauntT = 420; A.noise(0.8, { freq: 300, vol: 0.3 }); }
                }
              }
            } else {
              if (e.target && (!crystals.includes(e.target) || e.target.claimed !== e)) e.target = null;
              if (!e.target) {
                let best = null, bd = 700;
                for (const c of crystals) { if (c.claimed && c.claimed !== e && enemies.includes(c.claimed)) continue; const d = dist(c, e); if (d < bd) { bd = d; best = c; } }
                if (best) { e.target = best; best.claimed = e; }
              }
              if (e.target) {
                const d = steer(e, e.target.x, e.target.y, 0.1, wkMax);
                if (d < 5) { crystals.splice(crystals.indexOf(e.target), 1); e.target = null; e.carry = true; }
              } else {
                // mine the nearest planetoid
                let best = null, bd = 1e9;
                for (const r of rocks) { const d = dist(r, e); if (d < bd) { bd = d; best = r; } }
                if (best) {
                  const a = e.tt * 0.03 * e.orbit, ox = best.x + Math.cos(a) * (best.r + 8), oy = best.y + Math.sin(a) * (best.r + 8);
                  steer(e, ox, oy, 0.08, wkMax * 0.8);
                  if (bd < best.r + 20 && --e.mineT <= 0) {
                    e.mineT = Math.max(360, 1000 - lvl * 50) + rnd(0, 200);
                    const ang = Math.atan2(dw(e.y, best.y), dw(e.x, best.x));
                    spawnCrystal(best.x + Math.cos(ang) * (best.r + 3), best.y + Math.sin(ang) * (best.r + 3), Math.cos(ang) * 0.4, Math.sin(ang) * 0.4);
                    best.flash = 4;
                  }
                }
              }
            }
          } else {
            // warrior
            const hunting = ship.alive && (dShip < 340 || (sin.active && dShip < 600));
            if (hunting) {
              const a = Math.atan2(dw(e.y, ship.y), dw(e.x, ship.x)) + 0.02 * e.orbit;
              const R = 70 + (i % 3) * 15;
              steer(e, ship.x + Math.cos(a + 0.4 * e.orbit) * R, ship.y + Math.sin(a + 0.4 * e.orbit) * R, 0.14, wrMax);
              e.ang = Math.atan2(dw(ship.y, e.y), dw(ship.x, e.x));
              if (--e.fireT <= 0 && dShip < 210) {
                e.fireT = Math.max(32, 100 - lvl * 7) + rnd(0, 60);
                const sp = Math.min(4.2, 2.6 + lvl * 0.15), dx = dw(ship.x, e.x), dy = dw(ship.y, e.y), d = Math.hypot(dx, dy) || 1;
                const lead = d / sp * 0.5, tx = dx + ship.vx * lead, ty = dy + ship.vy * lead, td = Math.hypot(tx, ty) || 1;
                ebullets.push({ x: e.x, y: e.y, vx: tx / td * sp, vy: ty / td * sp, t: 90 });
                A.tone(900, 0.06, { type: 'square', vol: 0.04, slideTo: 500 });
              }
            } else {
              // shoot planetoids to free crystals for the workers
              let best = null, bd = 1e9;
              for (const r of rocks) { const d = dist(r, e); if (d < bd) { bd = d; best = r; } }
              if (best) {
                const a = e.tt * 0.02 * e.orbit;
                steer(e, best.x + Math.cos(a) * (best.r + 40), best.y + Math.sin(a) * (best.r + 40), 0.08, wrMax * 0.7);
                e.ang = Math.atan2(dw(best.y, e.y), dw(best.x, e.x));
                if (bd < best.r + 60 && --e.mineT <= 0) {
                  e.mineT = Math.max(450, 1100 - lvl * 50) + rnd(0, 250);
                  best.flash = 6;
                  const ang = Math.atan2(dw(e.y, best.y), dw(e.x, best.x));
                  spawnCrystal(best.x + Math.cos(ang) * (best.r + 3), best.y + Math.sin(ang) * (best.r + 3), Math.cos(ang) * 0.5, Math.sin(ang) * 0.5);
                }
              }
            }
          }
          e.vx *= 0.995; e.vy *= 0.995;
          e.x = wrap(e.x + e.vx); e.y = wrap(e.y + e.vy);
        }
        // replenish
        if (--spawnT <= 0) {
          spawnT = Math.max(120, 400 - zone * 30);
          const nw = enemies.filter(e => e.t === 'wk').length, nr = enemies.length - nw;
          if (nw < wantWorkers()) spawnEnemy('wk'); else if (nr < wantWarriors()) spawnEnemy('wr');
        }
      }

      function updSinistar() {
        if (!sin) return;
        sin.tt++; if (sin.hitT > 0) sin.hitT--;
        if (sin.active && ship.alive) {
          const max = Math.min(3.05, 2.0 + zone * 0.12);
          const d = steer(sin, ship.x, ship.y, 0.055, max);
          sin.x = wrap(sin.x + sin.vx); sin.y = wrap(sin.y + sin.vy);
          if (d < SR - 4 && ship.inv <= 0) killShip(true);
          if (--tauntT <= 0) {
            tauntT = rnd(300, 560);
            const opts = d < 200 ? ['RUN! RUN! RUN!', 'I HUNGER!', 'RUN, COWARD!'] : ['I AM SINISTAR!', 'BEWARE, COWARD!', 'I HUNGER!', 'RUN, COWARD!'];
            speak(opts[ri(opts.length)]);
          }
          if (sin.tt % 30 === 0) A.tone(55, 0.3, { type: 'sawtooth', vol: d < 250 ? 0.08 : 0.03 });
        } else if (sin.active) {
          sin.vx *= 0.97; sin.vy *= 0.97; sin.x = wrap(sin.x + sin.vx); sin.y = wrap(sin.y + sin.vy);
        } else if (!sin.active && sin.pieces > 0 && sin.pieces < 20) {
          // the builders' cue
          if (sin.tt % 240 === 0 && Math.random() < 0.25) A.tone(70, 0.25, { type: 'sawtooth', vol: 0.04, slideTo: 60 });
        }
      }

      function updMisc() {
        for (const r of rocks) { r.x = wrap(r.x + r.vx); r.y = wrap(r.y + r.vy); if (r.flash > 0) r.flash--; }
        for (let i = crystals.length - 1; i >= 0; i--) {
          const c = crystals[i]; c.x = wrap(c.x + c.vx); c.y = wrap(c.y + c.vy); c.vx *= 0.985; c.vy *= 0.985;
          if (--c.t <= 0) crystals.splice(i, 1);
        }
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x = wrap(p.x + p.vx); p.y = wrap(p.y + p.vy); p.vx *= 0.98; p.vy *= 0.98; if (--p.t <= 0) parts.splice(i, 1); }
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        if (subT > 0) subT--; if (speechBusy > 0) speechBusy--;
      }

      function update() {
        stT++; if (flash > 0) flash--; if (coinFlash > 0) coinFlash--;
        if (state === 'attract') {
          camX = wrap(camX + 0.6); camY = wrap(camY - 0.35);
          if (!rocks.length) { ship = { x: 0, y: 0, vx: 0, vy: 0, ang: 0, inv: 0, alive: false }; makeRocks(); }
          for (const r of rocks) { r.x = wrap(r.x + r.vx); r.y = wrap(r.y + r.vy); }
          if (stT % 900 === 300) speak(['BEWARE, I LIVE!', 'I AM SINISTAR!', 'RUN, COWARD!'][ri(3)]);
          updMisc();
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; A.tone(70, 0.25, { type: 'square', vol: 0.2 }); }
          }
          return;
        }
        if (state === 'gameover') {
          updMisc();
          if (stT > 300 || (stT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; stT = 0; rocks = []; enemies = []; sin = null; }
          return;
        }
        if (state === 'zoneclear') {
          updMisc();
          if (ship.alive) { ship.x = wrap(ship.x + ship.vx); ship.y = wrap(ship.y + ship.vy); ship.vx *= 0.98; ship.vy *= 0.98; }
          if (stT === 60) A.melody([[392, .12], [523, .12], [659, .12], [784, .12], [1047, .3]], { type: 'square', vol: 0.12 });
          if (stT > 240) { zone++; state = 'play'; stT = 0; startZone(); if (!ship.alive) newShip(); }
          return;
        }
        if (zoneT > 0) zoneT--;
        updShip();
        if (state !== 'play') return;
        updShots(); if (state !== 'play') return;
        updEnemies(); updSinistar(); updMisc();
        if (ship.alive) { camX = ship.x; camY = ship.y; }
      }

      // ---------- render ----------
      const sx = x => Math.round(dw(x, camX) + VCX), sy = y => Math.round(dw(y, camY) + VCY);
      const onScr = (x, y, m) => { const a = sx(x), b = sy(y); return a > -m && a < W + m && b > HUD - m && b < H + m; };
      function blit(ctx, s, x, y) { ctx.drawImage(s.c, Math.round(x - s.w / 2), Math.round(y - s.h / 2)); }
      function drawWorld(ctx) {
        for (const s of stars) {
          const x = (((s.x - camX * s.p) % 512) + 512) % 512, y = (((s.y - camY * s.p) % 512) + 512) % 512;
          for (let ox = 0; ox < W; ox += 512) for (let oy = 0; oy < H; oy += 512) {
            const X = x + ox, Y = y + oy; if (X < W && Y < H && Y > HUD) { ctx.fillStyle = s.c; ctx.fillRect(X | 0, Y | 0, 1, 1); }
          }
        }
        for (const r of rocks) {
          if (!onScr(r.x, r.y, 30)) continue;
          blit(ctx, r.s, sx(r.x), sy(r.y));
          if (r.flash > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx(r.x) - 1, sy(r.y) - 1, 2, 2); }
        }
        for (const c of crystals) {
          if (!onScr(c.x, c.y, 4)) continue;
          if (c.t < 120 && (c.t & 4)) continue;
          const X = sx(c.x), Y = sy(c.y), f = (api.frame >> 2) & 3;
          ctx.fillStyle = ['#ffffff', '#40ffff', '#ff40ff', '#ffff40'][f];
          ctx.fillRect(X - 1, Y - 1, 3, 3);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y - 2, 1, 5); ctx.fillRect(X - 2, Y, 5, 1);
        }
        if (sin && (sin.pieces > 0 || !sin.dead) && onScr(sin.x, sin.y, 30)) {
          const X = sx(sin.x), Y = sy(sin.y);
          if (!sin.active) {
            // build-site scaffold
            ctx.fillStyle = (api.frame & 16) ? '#303050' : '#202040';
            for (let k = 0; k < 24; k++) { const a = k / 24 * 6.28; ctx.fillRect(Math.round(X + Math.cos(a) * SR), Math.round(Y + Math.sin(a) * SR), 1, 1); }
          }
          const shake = sin.hitT > 0 ? ri(3) - 1 : 0;
          blit(ctx, SIN[sin.pieces], X + shake, Y);
          if (sin.active && (api.frame & 8)) {
            // glowing eyes and a working jaw
            ctx.fillStyle = '#ffff60'; ctx.fillRect(X - 8, Y - 6, 2, 2); ctx.fillRect(X + 6, Y - 6, 2, 2);
            ctx.fillStyle = '#200000'; ctx.fillRect(X - 8, Y + 8, 16, 2);
          }
        }
        for (const e of enemies) {
          if (!onScr(e.x, e.y, 10)) continue;
          if (e.t === 'wk') {
            blit(ctx, WK[(e.tt >> 3) & 1], sx(e.x), sy(e.y));
            if (e.carry) { ctx.fillStyle = (api.frame & 4) ? '#ffffff' : '#40ffff'; ctx.fillRect(sx(e.x) - 1, sy(e.y) + 3, 2, 2); }
          } else {
            const k = ((Math.round(e.ang / (Math.PI * 2) * 16) % 16) + 16) % 16;
            blit(ctx, WAR[k], sx(e.x), sy(e.y));
          }
        }
        for (const b of sbombs) {
          const X = sx(b.x), Y = sy(b.y); if (!onScr(b.x, b.y, 6)) continue;
          ctx.fillStyle = '#ff2020'; ctx.fillRect(X - 2, Y - 2, 5, 5);
          ctx.fillStyle = '#ffff40';
          for (let k = 0; k < 4; k++) { const a = b.sp + k * 1.57; ctx.fillRect(Math.round(X + Math.cos(a) * 4), Math.round(Y + Math.sin(a) * 4), 1, 1); }
          ctx.fillStyle = '#ffffff'; ctx.fillRect(X, Y, 1, 1);
        }
        ctx.fillStyle = '#ffffff';
        for (const s of shots) { ctx.fillStyle = (s.t & 2) ? '#ffffff' : '#40ffff'; ctx.fillRect(sx(s.x), sy(s.y), 2, 2); }
        for (const b of ebullets) { ctx.fillStyle = (api.frame & 2) ? '#ff2020' : '#ffff40'; ctx.fillRect(sx(b.x) - 1, sy(b.y) - 1, 2, 2); }
        if (ship && ship.alive && state !== 'attract') {
          if (!(ship.inv > 0 && (ship.inv & 4))) {
            const k = ((Math.round(ship.ang / (Math.PI * 2) * 32) % 32) + 32) % 32;
            blit(ctx, SHIP[k], VCX, VCY);
            if (api.key('ArrowLeft') || api.key('ArrowRight') || api.key('ArrowUp') || api.key('ArrowDown')) {
              ctx.fillStyle = ['#ffff40', '#ff9020', '#ff2020'][ri(3)];
              ctx.fillRect(Math.round(VCX - Math.cos(ship.ang) * 7), Math.round(VCY - Math.sin(ship.ang) * 7), 2, 2);
            }
          }
        } else if (eaten && eaten.t > 0 && sin) {
          // the ship is dragged into the mouth
          const k = eaten.t / 40, X = sx(sin.x) + (VCX - sx(sin.x)) * k, Y = sy(sin.y) + 8 + (VCY - sy(sin.y) - 8) * k;
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X) - 2, Math.round(Y) - 2, Math.max(1, Math.round(5 * k)), Math.max(1, Math.round(5 * k)));
        }
        for (const p of parts) { if (!onScr(p.x, p.y, 2)) continue; ctx.fillStyle = p.c; ctx.fillRect(sx(p.x), sy(p.y), p.t > 25 ? 2 : 1, 1); }
        for (const p of popups) text(ctx, p.s, sx(p.x), sy(p.y) - (50 - p.t) / 4, '#ffffff', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUD);
        ctx.fillStyle = '#3060ff'; ctx.fillRect(0, HUD - 2, W, 1);
        // long-range scanner
        const SX = 72, SY = 3, SW = 96, SH = 34;
        ctx.fillStyle = '#000010'; ctx.fillRect(SX, SY, SW, SH);
        ctx.fillStyle = '#3060ff'; ctx.fillRect(SX - 1, SY - 1, SW + 2, 1); ctx.fillRect(SX - 1, SY + SH, SW + 2, 1); ctx.fillRect(SX - 1, SY, 1, SH); ctx.fillRect(SX + SW, SY, 1, SH);
        const scale = 1 / 14;
        const dot = (x, y, c, s, clampIt) => {
          let X = SX + SW / 2 + dw(x, camX) * scale, Y = SY + SH / 2 + dw(y, camY) * scale;
          if (clampIt) { X = Math.max(SX, Math.min(SX + SW - s, X)); Y = Math.max(SY, Math.min(SY + SH - s, Y)); }
          else if (X < SX || X > SX + SW - s || Y < SY || Y > SY + SH - s) return;
          ctx.fillStyle = c; ctx.fillRect(Math.round(X), Math.round(Y), s, s);
        };
        for (const r of rocks) dot(r.x, r.y, '#8c7448', 2);
        for (const c of crystals) dot(c.x, c.y, '#ffffff', 1);
        for (const e of enemies) dot(e.x, e.y, e.t === 'wk' ? '#ff2020' : '#30e030', 1);
        if (sin && sin.pieces > 0 && state !== 'attract') { if (!sin.active || (api.frame & 8)) dot(sin.x, sin.y, sin.active ? '#ffff40' : '#a8a8a8', 3, true); }
        if (state !== 'attract') { ctx.fillStyle = '#ffffff'; ctx.fillRect(SX + SW / 2 - 1, SY + SH / 2 - 1, 2, 2); }
        // score, ships, bombs
        text(ctx, String(score).padStart(7, ' '), 2, 4, '#ffff40');
        for (let i = 0; i < Math.min(lives - (ship && ship.alive ? 1 : 0), 6); i++) ctx.drawImage(ICON.c, 2 + i * 7, 15);
        text(ctx, 'HI', 2, 26, '#3060ff'); text(ctx, String(hi), 16, 26, '#40ffff');
        text(ctx, 'BOMBS', 236, 4, '#ff2020', 1, 'right');
        for (let i = 0; i < Math.min(bombs, 20); i++) ctx.drawImage(BICON.c, 175 + (i % 10) * 6, 14 + Math.floor(i / 10) * 5);
        text(ctx, 'ZONE ' + zone, 236, 28, '#a8a8a8', 1, 'right');
        if (sin && state !== 'attract') {
          // build meter
          ctx.fillStyle = '#303030'; ctx.fillRect(SX, SY + SH + 1, SW, 1);
          ctx.fillStyle = sin.active ? '#ff2020' : '#a8a8a8'; ctx.fillRect(SX, SY + SH + 1, Math.round(SW * sin.pieces / 20), 1);
        }
      }
      function drawLogo(ctx, y) {
        const grad = r => ['#ffffff', '#e0e0e0', '#c0c0c0', '#a0a0a0', '#ff4040', '#ff2020', '#c00000'][r];
        text(ctx, 'SINISTAR', W / 2 + 2, y + 2, '#400000', 4, 'center');
        text(ctx, 'SINISTAR', W / 2, y, grad, 4, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = flash > 0 && (flash & 2) ? '#401010' : '#000';
        ctx.fillRect(0, 0, W, H);
        if (state === 'attract') {
          drawWorld(ctx); drawHUD(ctx);
          const page = Math.floor(stT / 480) % 2;
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(10, 52, W - 20, 226);
          if (page === 0) {
            drawLogo(ctx, 62);
            const s = SIN[20]; ctx.drawImage(s.c, W / 2 - s.w, 104, s.w * 2, s.h * 2);
            if ((stT >> 4) & 1) { ctx.fillStyle = '#ffff60'; ctx.fillRect(W / 2 - 16, 112 + 16, 4, 4); ctx.fillRect(W / 2 + 12, 112 + 16, 4, 4); }
            if (subT > 0) text(ctx, subtitle, W / 2, 194, (api.frame & 8) ? '#ff2020' : '#ffff40', 1, 'center');
            if (api.credits > 0) text(ctx, 'PUSH START', W / 2, 212, (api.frame & 32) ? '#ffffff' : '#40ffff', 1, 'center');
            else if (coinFlash > 0 ? (coinFlash & 8) : (stT % 60) < 40) text(ctx, 'INSERT COIN', W / 2, 212, coinFlash > 0 ? '#ff2020' : '#ffffff', 1, 'center');
            text(ctx, 'HIGH SCORE ' + hi, W / 2, 228, '#ffff40', 1, 'center');
            text(ctx, '\u00a9 1982 WILLIAMS', W / 2, 262, '#808080', 1, 'center');
          } else {
            text(ctx, 'THE SINISTAR WILL', W / 2, 62, '#ff2020', 1, 'center');
            text(ctx, 'BE BUILT FROM CRYSTALS', W / 2, 72, '#ff2020', 1, 'center');
            const rows = [[WK[0], 'WORKER', '150'], [WAR[12], 'WARRIOR', '500'], [null, 'CRYSTAL', '200'], [BICON, 'SINIBOMB HIT', '500'], [SIN[20], 'SINISTAR', '15000']];
            rows.forEach(([s, n, p], i) => {
              const y = 98 + i * 30;
              if (s) blit(ctx, s, 50, y); else { ctx.fillStyle = '#ffffff'; ctx.fillRect(49, y - 2, 3, 5); ctx.fillRect(47, y, 7, 1); }
              text(ctx, n, 80, y - 7, '#ffffff'); text(ctx, p, 80, y + 3, '#ffff40');
            });
            text(ctx, 'SHOOT PLANETOIDS FOR', W / 2, 246, '#40ffff', 1, 'center');
            text(ctx, 'CRYSTALS. X: SINIBOMB', W / 2, 256, '#40ffff', 1, 'center');
          }
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 14, 280, '#808080');
          return;
        }
        drawWorld(ctx); drawHUD(ctx);
        if (zoneT > 0 && state === 'play') {
          text(ctx, 'ZONE ' + zone, W / 2, 110, '#ffffff', 2, 'center');
          text(ctx, ZONES[zoneKind()], W / 2, 130, '#40ffff', 1, 'center');
          if (zone === 1) text(ctx, 'MINE CRYSTALS, BOMB SINISTAR', W / 2, 220, '#a8a8a8', 1, 'center');
        }
        if (subT > 0) text(ctx, subtitle, W / 2, H - 14, (api.frame & 8) ? '#ff2020' : '#ffff40', 1, 'center');
        if (state === 'zoneclear') {
          text(ctx, 'SINISTAR', W / 2, 100, '#ff2020', 2, 'center');
          text(ctx, 'DESTROYED', W / 2, 120, '#ffffff', 2, 'center');
          if (stT > 90) text(ctx, 'ENTERING ZONE ' + (zone + 1), W / 2, 150, '#40ffff', 1, 'center');
        }
        if (state === 'gameover') text(ctx, 'GAME OVER', W / 2, 150, '#ff2020', 2, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
