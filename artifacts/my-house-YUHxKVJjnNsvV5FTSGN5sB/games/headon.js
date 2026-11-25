// Head On (Sega, 1979) \u2014 from-scratch recreation: eat the dots in the lane maze, dodge the head-on cars.
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
    id: 'headon', title: 'Head On', year: 1979, maker: 'Sega',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Arrows: change lane at the gaps \u00b7 Space: accelerate \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#ffe040', accent: '#ff3030' },
    create(api) {
      const W = 256, H = 224, CX = 128, CY = 124;
      const NR = 5, LANE = 16;
      const au = api.audio;
      const HW = [], HH = [];
      for (let r = 0; r < NR; r++) { HW.push(112 - r * LANE); HH.push(88 - r * LANE); }
      const COL = {
        wall: '#2f8cff', wallHi: '#9fd0ff', dot: '#ffe25a', bg: '#000', hud: '#ffffff', red: '#ff3a3a',
        p1: '#ffe040', cpu: '#ff3030', cpu2: '#ff40ff', green: '#40ff60'
      };
      // ---------- sprites (facing up) ----------
      const CAR = [
        '.kk.kk.',
        'kkaaakk',
        '.abbba.',
        '.awwwa.',
        '.abbba.',
        '.abbba.',
        'kkbbbkk',
        'kkaaakk',
        '.k...k.'
      ];
      function carPal(c) { return { a: c, b: shade(c), k: '#c0c0c0', w: '#80e0ff' }; }
      function shade(hex) {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return '#' + [r, g, b].map(v => pad(Math.floor(v * 0.6).toString(16), 2)).join('');
      }
      const PAL = { p1: carPal(COL.p1), cpu: carPal(COL.cpu), cpu2: carPal(COL.cpu2) };

      // ---------- geometry ----------
      function sideLen(r, k) { return (k & 1) ? 2 * HH[r] : 2 * HW[r]; }
      function corner(r, i) {
        i &= 3;
        const x0 = CX - HW[r], x1 = CX + HW[r], y0 = CY - HH[r], y1 = CY + HH[r];
        return i === 0 ? [x1, y0] : i === 1 ? [x0, y0] : i === 2 ? [x0, y1] : [x1, y1];
      }
      function ringPos(r, u) {
        const k = Math.floor(u) & 3, f = u - Math.floor(u);
        const a = corner(r, k), b = corner(r, k + 1);
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      function wrapU(u) { return ((u % 4) + 4) % 4; }
      // direction (rot index: 0 up,1 right,2 down,3 left) when travelling along side k with u increasing
      const ROT_INC = [3, 2, 1, 0];
      // outward direction on side k
      const OUT_ROT = [0, 3, 2, 1];
      const OUT_KEY = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
      const IN_KEY = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'];

      // walls: separators between rings with gaps in the middle of each side; outer border and centre box solid
      const walls = [];
      (function buildWalls() {
        const GAP = 8;
        function rectWall(hw, hh, gaps) {
          const x0 = CX - hw, x1 = CX + hw, y0 = CY - hh, y1 = CY + hh;
          if (!gaps) {
            walls.push([x0, y0, x1 - x0, 2], [x0, y1 - 1, x1 - x0, 2], [x0, y0, 2, y1 - y0], [x1 - 1, y0, 2, y1 - y0 + 1]);
            return;
          }
          walls.push([x0, y0, CX - GAP - x0, 2], [CX + GAP, y0, x1 - CX - GAP, 2]);
          walls.push([x0, y1 - 1, CX - GAP - x0, 2], [CX + GAP, y1 - 1, x1 - CX - GAP + 1, 2]);
          walls.push([x0, y0, 2, CY - GAP - y0], [x0, CY + GAP, 2, y1 - CY - GAP]);
          walls.push([x1 - 1, y0, 2, CY - GAP - y0], [x1 - 1, CY + GAP, 2, y1 - CY - GAP + 1]);
        }
        rectWall(HW[0] + 8, HH[0] + 8, false);
        for (let r = 1; r < NR; r++) rectWall(HW[r] + 8, HH[r] + 8, true);
        rectWall(HW[NR - 1] - 8, HH[NR - 1] - 8, false);
      })();

      // ---------- state ----------
      let hi = api.getHiScore(5000);
      let mode = 'title', frame = 0, coinFlash = 0, titleT = 0;
      let g = null;
      let dots = [];
      function makeDots() {
        dots = [];
        for (let r = 0; r < NR; r++) {
          const list = [];
          for (let k = 0; k < 4; k++) {
            const L = sideLen(r, k), n = L / 8;
            for (let i = 0; i < n; i++) {
              const p = ringPos(r, k + i / n);
              list.push({ x: p[0], y: p[1], on: true });
            }
          }
          dots.push(list);
        }
      }
      function dotsLeft() { let n = 0; for (const l of dots) for (const d of l) if (d.on) n++; return n; }
      function ringDots(r) { let n = 0; for (const d of dots[r]) if (d.on) n++; return n; }

      function newCar(r, u, dir, kind) {
        return { r, u, dir, kind, speed: 1, lc: null, x: 0, y: 0, rot: 0, boost: false, buf: null, bufT: 0, cool: 0 };
      }
      function carPos(c) {
        let p;
        if (c.lc) {
          const a = ringPos(c.r, c.u), b = ringPos(c.lc.to, c.u), t = c.lc.p / LANE;
          p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          const k = Math.floor(c.u) & 3;
          c.rot = c.lc.to < c.r ? OUT_ROT[k] : (OUT_ROT[k] + 2) & 3;
        } else {
          p = ringPos(c.r, c.u);
          const k = Math.floor(c.u) & 3;
          c.rot = c.dir > 0 ? ROT_INC[k] : (ROT_INC[k] + 2) & 3;
        }
        c.x = p[0]; c.y = p[1];
      }
      // Gentle ramp: the CPU starts slower than the player and only gets faster than him from round 4 on.
      function cpuBase(round) { return Math.min(1.75, 0.68 + round * 0.09); }
      // Frames a CPU car must drive straight before it may change lanes again (early rounds give plenty of warning).
      function cpuCool(round) { return Math.max(20, 200 - round * 45); }

      function resetCars() {
        g.player = newCar(0, 2.5, 1, 'p1');
        // the CPU starts on the far side so the player always reaches a gap before they meet
        g.cpus = [newCar(0, 1.5, -1, 'cpu')];
        if (g.round >= 4) g.cpus.push(newCar(NR - 1, 2.5, -1, 'cpu2'));
        for (const c of g.cpus) { c.speed = cpuBase(g.round); c.cool = 150; }
        g.safe = 120;
        carPos(g.player); for (const c of g.cpus) carPos(c);
      }
      function newGame(demo) {
        g = { score: 0, lives: 4, round: 1, demo: !!demo, phase: 'ready', t: 150, crash: null, extra: false, bonusMsg: 0, dotTone: 0 };
        makeDots(); resetCars();
        if (!demo) au.melody([[392, .1], [523, .1], [659, .1], [784, .1], [659, .1], [784, .25]], { type: 'square', vol: 0.12 });
      }
      function nextRound() {
        g.round++; makeDots(); resetCars(); g.phase = 'ready'; g.t = 120;
        au.melody([[523, .08], [659, .08], [784, .08], [1047, .2]], { type: 'square', vol: 0.12 });
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (!g.extra && g.score >= 10000) { g.extra = true; g.lives++; au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .16]], { type: 'square', vol: 0.1 }); }
        if (g.score > hi) hi = g.score;
      }

      // ---------- coin-op ----------
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.15 });
        return false;
      }

      // ---------- driving ----------
      function wantLane(c, k) {
        // returns -1 (outward), +1 (inward) or 0
        if (c.kind === 'p1' && !g.demo) {
          if (api.key(OUT_KEY[k])) return -1;
          if (api.key(IN_KEY[k])) return 1;
          if (c.buf && c.bufT > 0) {
            if (c.buf === OUT_KEY[k]) return -1;
            if (c.buf === IN_KEY[k]) return 1;
          }
          return 0;
        }
        if (c.kind === 'p1') return demoBrain(c);
        return cpuBrain(c);
      }
      function demoBrain(c) {
        // stay away from any CPU car on the same ring; head for rings with dots
        let danger = false;
        for (const e of g.cpus) { const er = e.lc ? e.lc.to : e.r; if (er === c.r) danger = true; }
        const opts = [];
        if (c.r > 0) opts.push(-1);
        if (c.r < NR - 1) opts.push(1);
        if (danger) {
          const safe = opts.filter(o => !g.cpus.some(e => (e.lc ? e.lc.to : e.r) === c.r + o));
          const pick = safe.length ? safe : opts;
          return pick[irnd(pick.length)];
        }
        if (ringDots(c.r) === 0) {
          let best = 0, bd = 1e9;
          for (const o of opts) { for (let r = c.r + o; r >= 0 && r < NR; r += o) if (ringDots(r) > 0) { const d = Math.abs(r - c.r); if (d < bd) { bd = d; best = o; } break; } }
          return best;
        }
        return Math.random() < 0.15 ? opts[irnd(opts.length)] : 0;
      }
      function arcOf(r, u) {
        const k = Math.floor(u) & 3, f = u - Math.floor(u);
        let a = 0;
        for (let i = 0; i < k; i++) a += sideLen(r, i);
        return a + f * sideLen(r, k);
      }
      function perim(r) { return 4 * (HW[r] + HH[r]); }
      // Fairness: the CPU only swerves into the player's lane if the player can still reach a gap before they meet.
      function fairEntry(c, to) {
        const p = g.player;
        if (p.lc || p.r !== to) return true;
        const P = perim(to), pa = arcOf(to, p.u), ca = arcOf(to, c.u);
        const D = c.dir < 0 ? ((ca - pa) % P + P) % P : ((pa - ca) % P + P) % P;
        let gp = 1e9;
        for (let k = 0; k < 4; k++) {
          const ga = arcOf(to, k + 0.5);
          const d = p.dir > 0 ? ((ga - pa) % P + P) % P : ((pa - ga) % P + P) % P;
          if (d > 2 && d < gp) gp = d;
        }
        // early rounds: the player gets a lot more road (and time) to react to a swerve
        const ratio = Math.min(0.42, 0.2 + g.round * 0.05);
        return D > 80 && gp < D * ratio;
      }
      function cpuBrain(c) {
        const p = g.player;
        const pr = p.lc ? p.lc.to : p.r;
        if (c.cool > 0 || g.safe > 0) return 0;
        const chase = Math.min(0.92, (c.kind === 'cpu2' ? 0.06 : 0.08) + g.round * 0.1);
        if (pr !== c.r && Math.random() < chase) { const w = pr < c.r ? -1 : 1; return fairEntry(c, c.r + w) ? w : 0; }
        if (pr === c.r) return Math.random() < 0.06 ? (c.r > 0 && Math.random() < 0.5 ? -1 : (c.r < NR - 1 ? 1 : -1)) : 0;
        if (Math.random() < 0.12) { const w = c.r > 0 && Math.random() < 0.5 ? -1 : (c.r < NR - 1 ? 1 : 0); return w && fairEntry(c, c.r + w) ? w : 0; }
        return 0;
      }
      function drive(c, sp) {
        if (c.bufT > 0) c.bufT--;
        if (c.cool > 0) c.cool -= sp;
        if (c.lc) {
          c.lc.p += sp;
          if (c.lc.p >= LANE) { c.r = c.lc.to; c.lc = null; }
          return;
        }
        const k = Math.floor(c.u) & 3;
        const f0 = c.u - Math.floor(c.u);
        const nu = c.u + c.dir * sp / sideLen(c.r, k);
        const sameSide = Math.floor(nu) === Math.floor(c.u);
        const f1 = nu - Math.floor(nu);
        let crossed = false;
        if (sameSide) crossed = c.dir > 0 ? (f0 < 0.5 && f1 >= 0.5) : (f0 > 0.5 && f1 <= 0.5);
        if (crossed) {
          let w = wantLane(c, k);
          const to = c.r + w;
          if (w !== 0 && to >= 0 && to < NR) {
            c.u = wrapU(Math.floor(c.u) + 0.5);
            c.lc = { to, p: 0 };
            if (c.kind !== 'p1') c.cool = cpuCool(g.round);
            c.buf = null; c.bufT = 0;
            if (c.kind === 'p1' && !g.demo) au.tone(660, 0.05, { type: 'square', vol: 0.08, slideTo: 990 });
            return;
          }
        }
        c.u = wrapU(nu);
      }
      function eatDots(c) {
        if (c.lc) return;
        const list = dots[c.r];
        for (const d of list) {
          if (d.on && Math.abs(d.x - c.x) < 4 && Math.abs(d.y - c.y) < 4) {
            d.on = false;
            addScore(Math.min(50, 10 * g.round));
            if (!g.demo) { g.dotTone ^= 1; au.tone(g.dotTone ? 1100 : 880, 0.025, { type: 'square', vol: 0.06 }); }
          }
        }
      }

      function crash(e) {
        g.phase = 'crash'; g.t = 120;
        g.crash = { x: (g.player.x + e.x) / 2, y: (g.player.y + e.y) / 2 };
        if (!g.demo) { au.noise(1.0, { vol: 0.3, freq: 2400, slideTo: 120 }); au.tone(220, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 40 }); }
      }

      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.t = 300;
        au.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: 0.12 });
      }

      function updateGame() {
        const p = g.player;
        if (!g.demo) {
          for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) if (api.pressed(k)) { p.buf = k; p.bufT = 30; }
        }
        if (g.phase === 'ready') {
          if (--g.t <= 0) g.phase = 'play';
          return;
        }
        if (g.phase === 'crash') {
          if (--g.t <= 0) {
            if (g.demo) { mode = 'title'; titleT = 0; g = null; return; }
            g.lives--;
            if (g.lives <= 0) {
              g.phase = 'wait';
              if (api.offerContinue) {
                const cg = g;
                api.offerContinue(() => { if (g === cg) { g.lives = 4; resetCars(); g.phase = 'ready'; g.t = 90; } },
                  () => { if (g === cg) gameOver(); });
              } else gameOver();
              return;
            }
            resetCars(); g.phase = 'ready'; g.t = 90;
          }
          return;
        }
        if (g.phase === 'clear') {
          if (--g.t <= 0) nextRound();
          return;
        }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 200 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase !== 'play') return;
        if (g.safe > 0) g.safe--;
        // speeds
        let ps = 1;
        if (g.demo) p.boost = Math.random() < 0.3 ? !p.boost : p.boost;
        else p.boost = api.key('Space') || api.key('KeyX');
        if (p.boost) ps = 2;
        const subs = 2;
        for (let s = 0; s < subs; s++) {
          drive(p, ps / subs); carPos(p); eatDots(p);
          for (const c of g.cpus) {
            let cs = c.speed;
            const pr = p.lc ? p.lc.to : p.r;
            if (g.round >= 3 && pr === c.r && !c.lc) cs *= 1 + Math.min(0.4, (g.round - 2) * 0.06);
            drive(c, cs / subs); carPos(c);
          }
          for (const c of g.cpus) {
            if (Math.abs(c.x - p.x) < 6 && Math.abs(c.y - p.y) < 6) { crash(c); return; }
          }
          // CPU cars bounce off each other (reverse the second one)
          if (g.cpus.length > 1) {
            const a = g.cpus[0], b = g.cpus[1];
            if (Math.abs(a.x - b.x) < 8 && Math.abs(a.y - b.y) < 8 && !a.lc && !b.lc && a.r === b.r && a.dir === b.dir) b.u = wrapU(b.u + 0.5);
          }
        }
        if (!g.demo && (frame % 16) === 0) au.tone(p.boost ? 150 : 95, 0.05, { type: 'sawtooth', vol: 0.04 });
        if (dotsLeft() === 0) {
          g.phase = 'clear'; g.t = 150;
          const bonus = 1000 * Math.min(5, g.round);
          addScore(bonus); g.bonusMsg = bonus;
          if (!g.demo) au.melody([[784, .08], [988, .08], [1175, .08], [1568, .08], [1175, .08], [1568, .3]], { type: 'square', vol: 0.12 });
          else { mode = 'title'; titleT = 0; g = null; }
        }
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          for (const c of ghostCars) { c.u = wrapU(c.u + c.dir * 0.6 / sideLen(c.r, Math.floor(c.u) & 3)); carPos(c); }
          if (api.anyPressed('Enter', 'Space')) { if (tryStart()) { mode = 'game'; newGame(false); } return; }
          if (titleT > 420) { mode = 'demo'; newGame(true); }
          return;
        }
        if (mode === 'demo') {
          if (api.anyPressed('Enter', 'Space')) { if (tryStart()) { mode = 'game'; newGame(false); return; } }
          if (g) updateGame();
          if (g && ++titleT > 2200) { mode = 'title'; titleT = 0; g = null; }
          if (!g) { mode = 'title'; titleT = 0; }
          return;
        }
        if (g) updateGame();
        if (!g) { mode = 'title'; titleT = 0; }
      }

      // ---------- rendering ----------
      function drawMaze(ctx, flash) {
        ctx.fillStyle = flash ? COL.wallHi : COL.wall;
        for (const w of walls) ctx.fillRect(w[0], w[1], w[2], w[3]);
      }
      function drawDots(ctx) {
        ctx.fillStyle = COL.dot;
        for (const l of dots) for (const d of l) if (d.on) ctx.fillRect(Math.round(d.x) - 1, Math.round(d.y) - 1, 2, 2);
      }
      function drawCar(ctx, c) { spr(ctx, CAR, c.x, c.y, PAL[c.kind], c.rot, 1); }
      function drawExplosion(ctx, x, y, t) {
        const k = 120 - t;
        const cols = ['#ffffff', '#ffe040', '#ff8020', '#ff3030'];
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2 + k * 0.03;
          const d = Math.min(18, k * 0.5) * (0.6 + 0.4 * ((i * 7) % 5) / 5);
          ctx.fillStyle = cols[(i + (k >> 2)) & 3];
          ctx.fillRect(Math.round(x + Math.cos(a) * d) - 1, Math.round(y + Math.sin(a) * d) - 1, 3, 3);
        }
        if (k < 30) { ctx.fillStyle = (k >> 2) & 1 ? '#fff' : '#ff0'; ctx.fillRect(x - 6, y - 6, 12, 12); }
      }
      function drawHUD(ctx) {
        text(ctx, '1UP', 8, 2, COL.red);
        text(ctx, pad(g && !g.demo ? g.score : 0, 6), 8, 11, COL.hud);
        text(ctx, 'HI-SCORE', CX, 2, COL.red, 1, 'center');
        text(ctx, pad(hi, 6), CX, 11, COL.hud, 1, 'center');
        if (g && !g.demo) {
          text(ctx, 'ROUND ' + g.round, W - 8, 2, COL.green, 1, 'right');
          for (let i = 0; i < Math.min(5, g.lives - 1); i++) spr(ctx, CAR, W - 12 - i * 10, 16, PAL.p1, 0, 1);
        }
      }
      function drawCenter(ctx, lines) {
        // inside the centre box (80x32)
        lines.forEach((l, i) => text(ctx, l[0], CX, CY - 3 - (lines.length - 1) * 5 + i * 10, l[1], 1, 'center'));
      }
      function drawField(ctx) {
        const flash = g.phase === 'clear' && ((g.t >> 3) & 1);
        drawMaze(ctx, flash);
        drawDots(ctx);
        if (g.phase === 'crash') {
          drawExplosion(ctx, g.crash.x, g.crash.y, g.t);
          if (g.t > 60) { drawCar(ctx, g.player); for (const c of g.cpus) drawCar(ctx, c); }
          else for (const c of g.cpus) if (Math.abs(c.x - g.crash.x) > 10 || Math.abs(c.y - g.crash.y) > 10) drawCar(ctx, c);
        } else {
          drawCar(ctx, g.player);
          for (const c of g.cpus) drawCar(ctx, c);
        }
      }
      function render(ctx) {
        ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
        drawHUD(ctx);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawField(ctx);
        if (mode === 'demo') {
          drawCenter(ctx, [['HEAD ON', COL.p1], [(frame >> 4) & 1 ? (api.credits > 0 ? 'PUSH START' : 'INSERT COIN') : 'DEMO PLAY', COL.hud]]);
          text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 8, H - 8, '#888');
          return;
        }
        if (g.phase === 'ready') drawCenter(ctx, [['ROUND ' + g.round, COL.green], ['READY', (frame >> 3) & 1 ? COL.p1 : COL.hud]]);
        else if (g.phase === 'clear') drawCenter(ctx, [['ROUND CLEAR', COL.p1], ['BONUS ' + g.bonusMsg, COL.hud]]);
        else if (g.phase === 'over' || g.phase === 'wait') drawCenter(ctx, [['GAME OVER', COL.red]]);
        else if (g.phase === 'play') {
          const n = dotsLeft();
          drawCenter(ctx, [[pad(n, 3), '#606060']]);
        }
      }
      // attract: title card
      const ghostCars = [newCar(0, 0.5, -1, 'cpu'), newCar(0, 2.5, 1, 'p1'), newCar(2, 1.5, -1, 'cpu2'), newCar(4, 3.5, 1, 'p1')];
      function drawTitle(ctx) {
        // slowly circulating cars behind the title
        ctx.globalAlpha = 0.35; drawMaze(ctx, false); for (const c of ghostCars) drawCar(ctx, c); ctx.globalAlpha = 1;
        ctx.fillStyle = '#000'; ctx.fillRect(28, 46, 200, 150);
        ctx.fillStyle = COL.wall; ctx.fillRect(28, 46, 200, 2); ctx.fillRect(28, 194, 200, 2); ctx.fillRect(28, 46, 2, 150); ctx.fillRect(226, 46, 2, 150);
        text(ctx, 'HEAD ON', CX + 2, 58, '#802020', 3, 'center');
        text(ctx, 'HEAD ON', CX, 56, COL.p1, 3, 'center');
        spr(ctx, CAR, CX - 60, 92, PAL.p1, 1, 2);
        spr(ctx, CAR, CX + 60, 92, PAL.cpu, 3, 2);
        if ((titleT >> 3) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(CX - 2, 90, 4, 4); }
        text(ctx, 'EAT EVERY DOT', CX, 108, COL.hud, 1, 'center');
        text(ctx, 'CHANGE LANES AT THE GAPS', CX, 118, COL.hud, 1, 'center');
        text(ctx, 'SPACE = ACCELERATE', CX, 128, COL.dot, 1, 'center');
        text(ctx, 'DOT 10-50  CLEAR 1000+', CX, 140, COL.green, 1, 'center');
        text(ctx, 'EXTRA CAR AT 10000', CX, 150, COL.green, 1, 'center');
        const blink = (titleT >> 4) & 1;
        if (api.credits === 0 || coinFlash > 0) { if (blink || coinFlash > 0 && (coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', CX, 168, COL.red, 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', CX, 168, COL.p1, 1, 'center');
        text(ctx, '\u00a9 1979 SEGA', CX, 182, '#9a9a9a', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 8, H - 8, '#888');
      }
      return { update, render, destroy() { } };
    }
  });
})();
