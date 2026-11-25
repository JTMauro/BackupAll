// Gradius (Konami, 1985) \u2014 from-scratch recreation for the MAME32 Game Room.
// Horizontal shooter: power capsules advance the power meter (SPEED UP, MISSILE, DOUBLE, LASER, OPTION, ?),
// volcano stage, Stonehenge stage, Moai stage, each ending with the Big Core and its barrier walls. Loops harder.
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
  function mkRng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const W = 256, H = 224, PB = 200, SCROLL = 0.6;
  const STAGES = [
    { name: 'VOLCANO', L: 3600, g1: '#8a4a12', g2: '#c8782a', top: '#3cc040' },
    { name: 'STONEHENGE', L: 3400, g1: '#3a5a2a', g2: '#6a9a40', top: '#a0e060' },
    { name: 'MOAI', L: 3600, g1: '#3a3a6a', g2: '#6a6aa8', top: '#a8a8e0' }
  ];
  const MENU = ['SPEED', 'MISSILE', 'DOUBLE', 'LASER', 'OPTION', '?'];
  const SPD = [1.15, 1.6, 2.05, 2.5, 2.9, 3.3];

  const VIC_ROWS = [
    '..WWW...........',
    '.BBWWWW.........',
    '..WWWWWWW.......',
    'RRWWWWWWWWWWW...',
    'RRWWWBBBWWWWWWWW',
    'RRWWWWWWWWWWW...',
    '..WWWWWWW.......',
    '.BBWWWW.........',
    '..WWW...........'];
  const VIC_PAL = { W: '#e8e8f8', B: '#3a6cff', R: '#ff5020' };

  ArcadeRegistry.register({
    id: 'gradius', title: 'Gradius', year: 1985, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: shot/missile \u00b7 X: power up \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#ff8a1a', accent: '#3a6cff' },
    create(api) {
      const au = api.audio;
      const VIC = spr(VIC_ROWS, VIC_PAL);
      let hi = api.getHiScore(57300);
      let mode = 'title', mt = 0, frame = 0, coinFlash = 0, overT = 0;
      let g = null;
      const stars = [];
      for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: Math.random() * PB, s: 0.2 + (i % 3) * 0.3, c: ['#fff', '#88f', '#f88', '#ff8'][i % 4] });

      const snd = {
        shot() { au.tone(1500, 0.05, { type: 'square', vol: 0.06, slideTo: 700 }); },
        laser() { au.tone(2600, 0.14, { type: 'sawtooth', vol: 0.06, slideTo: 900 }); },
        boom() { au.noise(0.25, { vol: 0.16, freq: 1600, slideTo: 120 }); },
        big() { au.noise(0.9, { vol: 0.25, freq: 2200, slideTo: 60 }); },
        capsule() { au.melody([[880, 0.04], [1175, 0.04], [1568, 0.07]], { type: 'square', vol: 0.1 }); },
        power() { au.melody([[523, 0.05], [784, 0.05], [1047, 0.05], [1568, 0.1]], { type: 'triangle', vol: 0.16 }); },
        die() { au.noise(1.0, { vol: 0.25, freq: 2500, slideTo: 60 }); au.tone(500, 0.9, { type: 'square', vol: 0.08, slideTo: 40 }); },
        clink() { au.tone(260, 0.04, { type: 'square', vol: 0.08 }); },
        extra() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.12 }); },
        start() { au.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.24], [659, 0.12], [784, 0.36]], { type: 'square', vol: 0.12 }); },
        bossAlarm() { au.melody([[220, 0.15], [0, 0.05], [220, 0.15], [0, 0.05], [220, 0.15]], { type: 'sawtooth', vol: 0.1 }); }
      };

      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); return false;
      }

      // ---------------- terrain ----------------
      function env(wx, L) { return clamp((wx - 260) / 120, 0, 1) * clamp((L - 220 - wx) / 120, 0, 1); }
      function terr(stage, wx, out) {
        const L = STAGES[stage].L, e = env(wx, L);
        let c = 0, f = 0;
        if (stage === 0) {
          f = e * (14 + 12 * (0.5 + 0.5 * Math.sin(wx * 0.011)) + 10 * Math.max(0, Math.sin(wx * 0.027 + 1)));
          c = e * (8 + 10 * (0.5 + 0.5 * Math.sin(wx * 0.009 + 2)) + 9 * Math.max(0, Math.sin(wx * 0.033)));
          const vf = L - 780, vc = L - 540;
          f = Math.max(f, Math.min(82, 92 - Math.abs(wx - vf) * 0.8));
          c = Math.max(c, Math.min(82, 92 - Math.abs(wx - vc) * 0.8));
        } else if (stage === 1) {
          f = e * (10 + 3 * Math.sin(wx * 0.05)); c = e * (8 + 3 * Math.sin(wx * 0.04 + 1));
        } else {
          f = e * (18 + 4 * Math.sin(wx * 0.045) + 3 * Math.sin(wx * 0.13)); c = e * (16 + 4 * Math.sin(wx * 0.05 + 2));
        }
        out.c = c; out.f = f; return out;
      }
      const tmp = { c: 0, f: 0 };
      function genBlocks(stage) {
        const b = [];
        if (stage !== 1) return b;
        const r = mkRng(991), L = STAGES[1].L;
        for (let x = 480; x < L - 500; x += 120 + r() * 90) {
          const k = r(), w = 16 + ((r() * 3) | 0) * 8;
          if (k < 0.35) { const h = 30 + r() * 40; b.push({ x, y: PB - 10 - h, w, h }); }
          else if (k < 0.65) { const h = 30 + r() * 40; b.push({ x, y: 8, w, h }); }
          else { const h = 16 + r() * 24; b.push({ x, y: 50 + r() * (PB - 120), w, h }); }
        }
        return b;
      }
      function genEvents(stage, loop) {
        const r = mkRng(1234 + stage * 77 + loop * 5), L = STAGES[stage].L, ev = [];
        let x = 300;
        while (x < L - 380) {
          const k = r();
          if (stage === 2 && x > 560 && x < L - 600 && r() < 0.5) { ev.push({ x, t: 'moai', top: r() < 0.45 }); x += 80 + r() * 40; continue; }
          if (k < 0.26) ev.push({ x, t: 'fan', y: 30 + r() * 110 });
          else if (k < 0.42) ev.push({ x, t: 'rugal', y: 40 + r() * 110 });
          else if (k < 0.56) ev.push({ x, t: 'garun', y: 60 + r() * 70 });
          else if (k < 0.68) ev.push({ x, t: 'ducker', top: r() < 0.4 });
          else if (k < 0.78) ev.push({ x, t: 'hatch', top: r() < 0.5 });
          else if (k < 0.9) ev.push({ x, t: 'turret', top: r() < 0.5 });
          else ev.push({ x, t: 'redone', y: 40 + r() * 110 });
          x += Math.max(70, 120 + r() * 70 - loop * 12);
        }
        return ev;
      }

      // ---------------- game setup ----------------
      function newGame() {
        g = { stage: 0, loop: 0, score: 0, lives: 3, nextExtra: 20000, ceil: new Float32Array(W), floor: new Float32Array(W) };
        resetPower();
        startStage(0);
        snd.start();
      }
      function resetPower() { g.pw = { speed: 0, missile: false, dbl: false, laser: false, opt: 0, shield: 0 }; g.cursor = -1; }
      function startStage(cp) {
        g.wx = cp; g.events = genEvents(g.stage, g.loop); g.evi = 0;
        while (g.evi < g.events.length && g.events[g.evi].x < cp + W - 30) g.evi++;
        g.blocks = genBlocks(g.stage);
        g.enemies = []; g.eb = []; g.shots = []; g.items = []; g.parts = []; g.groups = {}; g.gid = 0;
        g.boss = null; g.bossDone = false; g.scr = 0;
        g.p = { x: 40, y: 100, inv: 150, dead: false, deadT: 0 };
        g.trail = []; g.opts = [];
        g.phase = 'play'; g.banner = 150; g.phaseT = 0;
        computeTerrain();
      }
      function computeTerrain() {
        for (let i = 0; i < W; i++) { terr(g.stage, g.wx + i, tmp); g.ceil[i] = tmp.c; g.floor[i] = tmp.f; }
      }
      function solidAt(sx, sy) {
        if (sy >= PB) return true;
        if (sx < 0 || sx >= W) return false;
        const i = sx | 0;
        if (sy < g.ceil[i] || sy > PB - g.floor[i]) return true;
        for (const b of g.blocks) { const bx = b.x - g.wx; if (sx >= bx && sx < bx + b.w && sy >= b.y && sy < b.y + b.h) return true; }
        for (const e of g.enemies) if (e.solid && Math.abs(sx - e.x) < e.w / 2 && Math.abs(sy - e.y) < e.h / 2) return true;
        return false;
      }
      function floorAt(sx) { const i = clamp(sx | 0, 0, W - 1); return PB - g.floor[i]; }
      function ceilAt(sx) { const i = clamp(sx | 0, 0, W - 1); return g.ceil[i]; }

      function addScore(n) {
        g.score += n;
        if (g.score > hi) hi = g.score;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 20000 ? 50000 : 70000; snd.extra(); }
      }
      function boom(x, y, n, col) {
        for (let i = 0; i < (n || 10); i++) {
          const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 2;
          g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + Math.random() * 20, c: col || (Math.random() < 0.5 ? '#ffd040' : '#ff6020') });
        }
      }
      function aimShot(x, y, sp) {
        const p = g.p; if (p.dead) return;
        const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        sp = sp || (1.3 + g.loop * 0.3 + g.stage * 0.1);
        g.eb.push({ x, y, vx: dx / d * sp, vy: dy / d * sp, len: 0 });
      }

      // ---------------- spawning ----------------
      function E(o) {
        const e = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, hp: 1, t: 0, w: 10, h: 10, pts: 100, red: false, group: 0, ground: false, solid: false, fireT: 60 + Math.random() * 90 }, o);
        g.enemies.push(e); return e;
      }
      function spawn(ev) {
        const sx = ev.x - g.wx;
        switch (ev.t) {
          case 'fan': {
            const id = ++g.gid; g.groups[id] = { n: 5, k: 0, fail: false };
            for (let i = 0; i < 5; i++) E({ type: 'fan', x: W + 10 + i * 16, y: ev.y, vx: -2.3, group: id, w: 10, h: 10 });
            break;
          }
          case 'rugal':
            for (let i = 0; i < 3; i++) E({ type: 'rugal', x: W + 10 + i * 30, y: clamp(ev.y + (i - 1) * 20, 20, PB - 30), vx: -1.3, w: 12, h: 8 });
            break;
          case 'garun': {
            const id = ++g.gid; g.groups[id] = { n: 4, k: 0, fail: false };
            for (let i = 0; i < 4; i++) E({ type: 'garun', x: W + 10 + i * 24, y: ev.y, by: ev.y, vx: -1.7, w: 12, h: 10, pts: 200, group: id, ph: i * 0.6 });
            break;
          }
          case 'redone':
            E({ type: 'garun', x: W + 10, y: ev.y, by: ev.y, vx: -1.5, red: true, w: 12, h: 10, ph: 0 });
            break;
          case 'ducker':
            for (let i = 0; i < 2; i++) E({ type: 'ducker', x: sx + i * 20, y: 0, top: ev.top, ground: true, w: 10, h: 10 });
            break;
          case 'turret': E({ type: 'turret', x: sx, y: 0, top: ev.top, ground: true, w: 12, h: 8 }); break;
          case 'hatch': E({ type: 'hatch', x: sx, y: 0, top: ev.top, ground: true, w: 22, h: 10, hp: 8 + g.loop * 2, pts: 500, open: 0, rel: 0 }); break;
          case 'moai': {
            terr(g.stage, ev.x, tmp);
            const y = ev.top ? tmp.c + 15 : PB - tmp.f - 15;
            E({ type: 'moai', x: sx, y, top: ev.top, ground: true, solid: true, w: 22, h: 30, hp: 8 + g.loop * 2, pts: 500, ph: Math.random() * 120 });
            break;
          }
        }
      }
      function spawnBoss() {
        const w = 4 + g.loop * 2 + g.stage;
        g.boss = { x: W + 60, y: PB / 2, walls: [w, w, w, w], core: 3, t: 0, state: 'enter', fireT: 90, flash: 0 };
        snd.bossAlarm();
      }

      // ---------------- player ----------------
      function owners() { const o = [g.p]; for (const q of g.opts) o.push(q); return o; }
      function fire() {
        const os = owners(); let any = false;
        os.forEach((o, k) => {
          if (g.pw.laser) {
            if (!g.shots.some(s => s.t === 'laser' && s.own === k)) { g.shots.push({ t: 'laser', x: o.x + 8, y: o.y, vx: 7, vy: 0, len: 2, own: k, hit: [] }); any = 'l'; }
          } else {
            if (g.shots.filter(s => s.t === 'shot' && s.own === k).length < 2) { g.shots.push({ t: 'shot', x: o.x + 8, y: o.y, vx: 6, vy: 0, own: k }); any = any || 's'; }
            if (g.pw.dbl && !g.shots.some(s => s.t === 'dbl' && s.own === k)) g.shots.push({ t: 'dbl', x: o.x + 6, y: o.y - 2, vx: 4.6, vy: -4.6, own: k });
          }
          if (g.pw.missile && !g.shots.some(s => s.t === 'mis' && s.own === k)) g.shots.push({ t: 'mis', x: o.x, y: o.y + 4, vx: 1.4, vy: 2.2, own: k, gr: false });
        });
        if (any === 'l') snd.laser(); else if (any) snd.shot();
      }
      function activate() {
        const c = g.cursor, pw = g.pw; if (c < 0) return;
        switch (c) {
          case 0: if (pw.speed >= 5) return; pw.speed++; break;
          case 1: if (pw.missile) return; pw.missile = true; break;
          case 2: if (pw.dbl) return; pw.dbl = true; pw.laser = false; break;
          case 3: if (pw.laser) return; pw.laser = true; pw.dbl = false; break;
          case 4: if (pw.opt >= 4) return; pw.opt++; break;
          case 5: if (pw.shield > 0) return; pw.shield = 15; break;
        }
        g.cursor = -1; snd.power();
      }
      function avail(i) {
        const pw = g.pw;
        return [pw.speed < 5, !pw.missile, !pw.dbl, !pw.laser, pw.opt < 4, pw.shield <= 0][i];
      }
      function killPlayer() {
        const p = g.p; if (p.dead) return;
        if (g.pw.shield > 0) { g.pw.shield = Math.max(0, g.pw.shield - 5); snd.clink(); p.inv = 30; return; }
        p.dead = true; p.deadT = 140; boom(p.x, p.y, 30); snd.die();
      }
      function hitPlayer() {
        const p = g.p; if (p.dead || p.inv > 0) return;
        if (g.pw.shield > 0) { g.pw.shield--; snd.clink(); p.inv = 6; return; }
        p.dead = true; p.deadT = 140; boom(p.x, p.y, 30); snd.die();
      }
      function afterDeath() {
        const L = STAGES[g.stage].L;
        g.lives--;
        resetPower();
        const respawn = () => {
          const cp = g.wx >= L - 260 ? L - 260 : g.wx >= L * 0.5 ? Math.floor(L * 0.5) : 0;
          startStage(cp);
        };
        if (g.lives <= 0) {
          g.phase = 'wait';
          const cg = g;
          const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 300; au.melody([[392, 0.2], [330, 0.2], [262, 0.2], [196, 0.5]], { type: 'square', vol: 0.12 }); };
          if (api.offerContinue) api.offerContinue(() => { if (g !== cg) return; g.lives = 3; g.score = 0; g.nextExtra = 20000; respawn(); }, end);
          else end();
        } else respawn();
      }

      function updPlayer() {
        const p = g.p;
        if (p.dead) { p.deadT--; if (p.deadT <= 0) afterDeath(); return; }
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx--; if (api.key('ArrowRight')) dx++;
        if (api.key('ArrowUp')) dy--; if (api.key('ArrowDown')) dy++;
        const sp = SPD[g.pw.speed];
        const nx = clamp(p.x + dx * sp, 8, W - 12), ny = clamp(p.y + dy * sp, 6, PB - 6);
        if (nx !== p.x || ny !== p.y) { p.x = nx; p.y = ny; g.trail.push({ x: p.x, y: p.y }); if (g.trail.length > 70) g.trail.shift(); }
        g.opts = [];
        for (let i = 0; i < g.pw.opt; i++) {
          const idx = g.trail.length - 1 - (i + 1) * 13;
          const q = idx >= 0 ? g.trail[idx] : (g.trail[0] || p);
          g.opts.push({ x: q.x, y: q.y });
        }
        if (api.pressed('Space') || (api.key('Space') && frame % 7 === 0)) fire();
        if (api.anyPressed('KeyX', 'KeyZ')) activate();
        if (p.inv > 0) p.inv--;
        if (p.inv <= 0 && (solidAt(p.x - 6, p.y) || solidAt(p.x + 7, p.y) || solidAt(p.x, p.y - 3) || solidAt(p.x, p.y + 3))) killPlayer();
      }

      // ---------------- shots ----------------
      function enemyAt(x, y, x0) {
        for (const e of g.enemies) {
          if (e.dead || e.type === 'moai') continue;
          const lx = x0 == null ? x : x0;
          if (y > e.y - e.h / 2 - 1 && y < e.y + e.h / 2 + 1 && x > e.x - e.w / 2 && lx < e.x + e.w / 2) return e;
        }
        return null;
      }
      function moaiMouth(x, y) {
        for (const e of g.enemies) {
          if (e.type !== 'moai' || e.dead) continue;
          const my = e.top ? e.y - 6 : e.y + 6;
          if (e.open && Math.abs(x - (e.x - 10)) < 5 && Math.abs(y - my) < 4) return e;
        }
        return null;
      }
      function updShots() {
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy;
          if (s.t === 'laser') { s.len = Math.min(56, s.len + 7); }
          if (s.t === 'mis') {
            if (!s.gr) {
              if (solidAt(s.x, s.y + 3)) { if (floorAt(s.x) - 3 - s.y > 4) s.dead = true; else { s.gr = true; s.vx = 2.2; s.vy = 0; } }
            } else {
              const fy = floorAt(s.x) - 3; s.y = Math.min(fy, PB - 3);
              if (solidAt(s.x + 3, s.y - 1)) s.dead = true;
            }
          }
          if (s.x > W + 4 || s.x - (s.len || 0) > W || s.y < -4 || s.y > PB + 4) { s.dead = true; continue; }
          if (s.t !== 'mis' && solidAt(s.x, s.y)) {
            const m = moaiMouth(s.x, s.y);
            if (m) { damage(m, 1); }
            else if (g.blocks.length || g.enemies.some(e => e.solid)) snd.clink();
            s.dead = true; continue;
          }
          if (g.boss && bossHit(s.x, s.y, s.t === 'mis')) { s.dead = true; continue; }
          if (s.t === 'laser') {
            for (const e of g.enemies) {
              if (e.dead || e.type === 'moai' || s.hit.indexOf(e) >= 0) continue;
              if (Math.abs(s.y - e.y) < e.h / 2 + 1 && s.x > e.x - e.w / 2 && s.x - s.len < e.x + e.w / 2) { s.hit.push(e); damage(e, 2); }
            }
          } else {
            const e = enemyAt(s.x, s.y);
            if (e) { damage(e, 1); s.dead = true; }
          }
        }
        g.shots = g.shots.filter(s => !s.dead);
      }
      function damage(e, n) {
        e.hp -= n; e.flash = 4;
        if (e.hp <= 0) kill(e, true); else snd.clink();
      }
      function kill(e, byPlayer) {
        if (e.dead) return;
        e.dead = true;
        if (byPlayer) {
          addScore(e.pts);
          boom(e.x, e.y, e.type === 'moai' || e.type === 'hatch' ? 24 : 10);
          snd.boom();
          if (e.red) dropCap(e.x, e.y);
          if (e.group) {
            const gr = g.groups[e.group]; gr.k++;
            if (gr.k >= gr.n && !gr.fail) dropCap(e.x, e.y);
          }
          if (g.loop > 0 && !e.ground && Math.random() < 0.3 + g.loop * 0.2) aimShot(e.x, e.y);
        } else if (e.group) g.groups[e.group].fail = true;
      }
      function dropCap(x, y) { g.items.push({ x, y, blue: Math.random() < 0.08, t: 0 }); }

      // ---------------- enemies ----------------
      function updEnemies() {
        const p = g.p, loopF = 1 + g.loop * 0.4;
        for (const e of g.enemies) {
          if (e.dead) continue;
          e.t++; if (e.flash) e.flash--;
          if (e.ground) e.x -= g.scr;
          switch (e.type) {
            case 'fan':
              if (e.ph !== 1 && e.x < 130) { e.ph = 1; e.vy = (p.y > e.y ? 1 : -1) * 1.6; }
              if (e.ph === 1) { e.vx = Math.min(2.4, e.vx + 0.09); e.vy *= 0.97; }
              e.x += e.vx; e.y = clamp(e.y + e.vy, 8, PB - 10);
              if (e.ph === 1 && e.x > W + 20) kill(e, false);
              break;
            case 'rugal':
              e.x += e.vx; e.y += clamp(p.y - e.y, -0.5, 0.5);
              if (--e.fireT <= 0) { e.fireT = 120 / loopF; if (e.x > p.x + 20) aimShot(e.x, e.y); }
              break;
            case 'garun':
              e.x += e.vx; e.y = e.by + 34 * Math.sin(e.t * 0.06 + e.ph);
              break;
            case 'ducker': {
              const dir = e.x > p.x + 24 ? -1 : 1;
              e.x += dir * 0.6; e.dir = dir;
              e.y = e.top ? ceilAt(e.x) + 5 : floorAt(e.x) - 5;
              if (--e.fireT <= 0) { e.fireT = 90 / loopF; aimShot(e.x, e.y); }
              break;
            }
            case 'turret':
              e.y = e.top ? ceilAt(e.x) + 4 : floorAt(e.x) - 4;
              if (--e.fireT <= 0) { e.fireT = 100 / loopF; if (e.x > 0 && e.x < W) aimShot(e.x, e.y); }
              break;
            case 'hatch':
              e.y = e.top ? ceilAt(e.x) + 5 : floorAt(e.x) - 5;
              if (e.x < W - 10 && e.x > 20) {
                if (e.t % 160 === 40) { e.open = 1; e.rel = 4; }
                if (e.open && e.t % 12 === 0 && e.rel > 0) {
                  e.rel--;
                  E({ type: 'mini', x: e.x, y: e.y + (e.top ? 6 : -6), vy: e.top ? 1.6 : -1.6, vx: 0, w: 8, h: 8, pts: 100 });
                  if (e.rel === 0) e.open = 0;
                }
              }
              break;
            case 'mini':
              if (e.t < 30) { e.y += e.vy; e.x -= g.scr; }
              else {
                if (e.t % 30 === 0) { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; e.vx = dx / d * 1.6 * loopF; e.vy = dy / d * 1.6 * loopF; }
                e.x += e.vx; e.y += e.vy;
              }
              break;
            case 'moai': {
              const c = (e.t + e.ph) % 200;
              e.open = c > 60 && c < 140 && e.x < W - 10 && e.x > 30;
              if (e.open && c % 16 === 0) {
                const my = e.top ? e.y - 6 : e.y + 6;
                const dx = p.x - e.x, dy = p.y - my, d = Math.hypot(dx, dy) || 1, sp = 1.3 * loopF;
                E({ type: 'ring', x: e.x - 12, y: my, vx: dx / d * sp, vy: dy / d * sp, w: 8, h: 8, pts: 10 });
              }
              break;
            }
            case 'ring':
              e.x += e.vx; e.y += e.vy;
              break;
            case 'rock':
              e.x += e.vx; e.y += e.vy; e.vy += e.gv;
              break;
          }
          if (e.x < -30 || e.x > W + 120 || e.y < -40 || e.y > PB + 40) {
            if (!(e.type === 'fan' && e.ph !== 1)) kill(e, false);
          }
        }
        g.enemies = g.enemies.filter(e => !e.dead);
      }
      function updVolcano() {
        if (g.stage !== 0) return;
        const L = STAGES[0].L;
        if (g.wx < L - 1100 || g.wx > L - 300) return;
        const vol = [{ x: L - 780, top: false }, { x: L - 540, top: true }];
        for (const v of vol) {
          const sx = v.x - g.wx;
          if (sx < -20 || sx > W + 20) continue;
          if (frame % Math.max(8, 16 - g.loop * 3) === 0) {
            const big = Math.random() < 0.4;
            E({
              type: 'rock', x: sx, y: v.top ? 84 : PB - 84, vx: -1.6 + Math.random() * 2.2, vy: (v.top ? 1 : -1) * (2 + Math.random() * 2.2),
              gv: v.top ? -0.045 : 0.045, w: big ? 12 : 7, h: big ? 12 : 7, hp: big ? 2 : 1, pts: big ? 100 : 50, rot: Math.random() * 6
            });
          }
        }
      }

      // ---------------- boss ----------------
      function hullRects(b) {
        return [[b.x - 16, b.y - 14, 48, 28], [b.x - 38, b.y - 32, 72, 12], [b.x - 38, b.y + 20, 72, 12], [b.x + 2, b.y - 22, 30, 44]];
      }
      function bossHit(sx, sy, isMis) {
        const b = g.boss; if (!b || b.state === 'dying') return false;
        const dx = sx - b.x, dy = sy - b.y;
        if (!isMis && Math.abs(dy) <= 3 && dx >= -18 && dx <= 12) {
          for (let i = 0; i < 4; i++) {
            if (b.walls[i] > 0) {
              if (dx >= -14 + i * 4) { b.walls[i]--; b.flash = 3; snd.clink(); if (b.walls[i] === 0) { addScore(100); boom(b.x - 14 + i * 4, b.y, 6, '#60a0ff'); } return true; }
              return false;
            }
          }
          if (dx >= 1) {
            b.core--; b.flash = 6; snd.clink();
            if (b.core <= 0) { b.state = 'dying'; b.t = 0; addScore(10000); snd.big(); }
            return true;
          }
          return false;
        }
        for (const r of hullRects(b)) if (sx >= r[0] && sx < r[0] + r[2] && sy >= r[1] && sy < r[1] + r[3]) return true;
        return false;
      }
      function updBoss() {
        const b = g.boss; if (!b) return;
        const p = g.p; b.t++; if (b.flash) b.flash--;
        if (b.state === 'enter') { b.x -= 1; if (b.x <= 196) { b.state = 'fight'; b.t = 0; } }
        else if (b.state === 'fight') {
          if (!p.dead) b.y += clamp(p.y - b.y, -0.8, 0.8);
          b.y = clamp(b.y, 40, PB - 40);
          if (--b.fireT <= 0) {
            b.fireT = Math.max(36, 76 - g.loop * 12 - g.stage * 6);
            for (const [ox, oy] of [[-40, -26], [-40, 26], [-20, -10], [-20, 10]]) g.eb.push({ x: b.x + ox, y: b.y + oy, vx: -4.5 - g.loop * 0.5, vy: 0, len: 18 });
            au.tone(900, 0.12, { type: 'sawtooth', vol: 0.06, slideTo: 300 });
          }
          if (b.t > 60 * 40) b.state = 'leave';
        } else if (b.state === 'leave') {
          b.x += 1.5; if (b.x > W + 70) { g.boss = null; stageClear(); return; }
        } else if (b.state === 'dying') {
          if (b.t % 6 === 0) { boom(b.x - 30 + Math.random() * 60, b.y - 30 + Math.random() * 60, 12); au.noise(0.2, { vol: 0.12, freq: 1200, slideTo: 100 }); }
          if (b.t > 120) { g.boss = null; stageClear(); return; }
        }
        if (b.state !== 'dying' && !p.dead && p.inv <= 0) {
          for (const r of hullRects(b)) if (p.x + 6 >= r[0] && p.x - 6 < r[0] + r[2] && p.y + 3 >= r[1] && p.y - 3 < r[1] + r[3]) { killPlayer(); break; }
        }
      }
      function stageClear() {
        g.bossDone = true; g.phase = 'clear'; g.phaseT = 200;
        g.eb = []; g.enemies = [];
        au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [784, 0.1], [1047, 0.3]], { type: 'square', vol: 0.12 });
      }

      // ---------------- main update ----------------
      function updPlay() {
        const st = STAGES[g.stage];
        if (g.banner > 0) g.banner--;
        if (!g.boss && !g.bossDone && g.wx < st.L) { g.wx = Math.min(st.L, g.wx + SCROLL); g.scr = SCROLL; } else g.scr = 0;
        computeTerrain();
        while (g.evi < g.events.length && g.events[g.evi].x <= g.wx + W + 8) spawn(g.events[g.evi++]);
        updVolcano();
        if (!g.boss && !g.bossDone && g.wx >= st.L) spawnBoss();
        updPlayer();
        if (g.phase !== 'play') return;
        updShots(); updEnemies(); updBoss();
        if (g.phase !== 'play') return;
        const p = g.p;
        // enemy bullets
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy;
          if (b.x < -30 || b.x > W + 10 || b.y < -10 || b.y > PB + 10) b.dead = true;
          else if (!p.dead && p.inv <= 0) {
            if (b.len) { if (Math.abs(b.y - p.y) < 3 && p.x + 6 > b.x && p.x - 6 < b.x + b.len) { hitPlayer(); b.dead = true; } }
            else if (Math.abs(b.x - p.x) < 6 && Math.abs(b.y - p.y) < 4) { hitPlayer(); b.dead = true; }
          }
        }
        g.eb = g.eb.filter(b => !b.dead);
        // enemy contact
        if (!p.dead && p.inv <= 0) {
          for (const e of g.enemies) {
            if (Math.abs(e.x - p.x) < e.w / 2 + 5 && Math.abs(e.y - p.y) < e.h / 2 + 2) {
              if (e.solid) { killPlayer(); break; }
              if (g.pw.shield > 0) { g.pw.shield--; snd.clink(); kill(e, true); continue; }
              hitPlayer(); break;
            }
          }
        }
        // capsules
        for (const it of g.items) {
          it.t++; it.x -= 0.6; it.y += Math.sin(it.t * 0.1) * 0.3;
          if (!p.dead && Math.abs(it.x - p.x) < 11 && Math.abs(it.y - p.y) < 9) {
            it.dead = true; addScore(500); snd.capsule();
            if (it.blue) { for (const e of g.enemies) if (!e.solid && e.type !== 'hatch') kill(e, true); g.eb = []; }
            else g.cursor = (g.cursor + 1) % 6;
          }
          if (it.x < -10) it.dead = true;
        }
        g.items = g.items.filter(i => !i.dead);
      }
      function updParts() {
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
      }

      function update() {
        frame++; mt++;
        if (coinFlash > 0) coinFlash--;
        for (const s of stars) { s.x -= s.s * (mode === 'game' && g && g.scr === 0 && g.phase === 'play' ? 0.6 : 1); if (s.x < 0) { s.x += W; s.y = Math.random() * PB; } }
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (mode === 'over') {
          if (--overT <= 0 || (overT < 200 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; }
          return;
        }
        updParts();
        if (g.phase === 'play') updPlay();
        else if (g.phase === 'clear') {
          g.phaseT--;
          const p = g.p;
          p.x += 2.5;
          if (g.phaseT <= 0) {
            g.stage++;
            if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; }
            startStage(0);
          }
        }
      }

      // ---------------- rendering ----------------
      function drawTerrain(ctx) {
        const st = STAGES[g.stage];
        for (let i = 0; i < W; i += 2) {
          const c = g.ceil[i], f = g.floor[i];
          if (c > 0.5) {
            ctx.fillStyle = st.g1; ctx.fillRect(i, 0, 2, c);
            ctx.fillStyle = st.g2; ctx.fillRect(i, Math.max(0, c - 5), 2, 3);
            ctx.fillStyle = st.top; ctx.fillRect(i, c - 2, 2, 2);
          }
          if (f > 0.5) {
            const y = PB - f;
            ctx.fillStyle = st.g1; ctx.fillRect(i, y, 2, f);
            ctx.fillStyle = st.g2; ctx.fillRect(i, y + 2, 2, 3);
            ctx.fillStyle = st.top; ctx.fillRect(i, y, 2, 2);
          }
        }
        // texture specks
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = 0; i < W; i += 6) {
          const wx = Math.floor(g.wx + i), k = (wx * 7919) % 23;
          if (g.floor[i] > 12) ctx.fillRect(i, PB - g.floor[i] + 8 + k % 9, 2, 1);
          if (g.ceil[i] > 12) ctx.fillRect(i, g.ceil[i] - 10 - k % 7, 2, 1);
        }
        if (g.stage === 0) {
          const L = STAGES[0].L;
          for (const v of [{ x: L - 780, top: false }, { x: L - 540, top: true }]) {
            const sx = v.x - g.wx; if (sx < -20 || sx > W + 20) continue;
            ctx.fillStyle = frame & 4 ? '#ff4010' : '#ffb020';
            if (v.top) ctx.fillRect(sx - 6, 82, 12, 3); else ctx.fillRect(sx - 6, PB - 85, 12, 3);
          }
        }
        for (const b of g.blocks) {
          const bx = Math.round(b.x - g.wx); if (bx > W || bx + b.w < 0) continue;
          ctx.fillStyle = '#707888'; ctx.fillRect(bx, b.y, b.w, b.h);
          ctx.fillStyle = '#a0a8b8'; ctx.fillRect(bx, b.y, b.w, 2); ctx.fillRect(bx, b.y, 2, b.h);
          ctx.fillStyle = '#404858'; ctx.fillRect(bx + b.w - 2, b.y, 2, b.h); ctx.fillRect(bx, b.y + b.h - 2, b.w, 2);
          ctx.fillStyle = '#585f70';
          for (let yy = b.y + 8; yy < b.y + b.h - 4; yy += 8) ctx.fillRect(bx + 2, yy, b.w - 4, 1);
        }
      }
      function drawVic(ctx, x, y) {
        ctx.drawImage(VIC, Math.round(x - 8), Math.round(y - 4));
        ctx.fillStyle = frame & 2 ? '#ffd040' : '#ff6020';
        ctx.fillRect(Math.round(x - 11), Math.round(y - 1), 3 + (frame & 1), 3);
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash && (frame & 1);
        switch (e.type) {
          case 'fan': {
            const a = e.t * 0.3;
            ctx.fillStyle = fl ? '#fff' : '#30c0ff';
            for (let k = 0; k < 4; k++) { const ca = Math.cos(a + k * 1.57) * 4, sa = Math.sin(a + k * 1.57) * 4; ctx.fillRect(x + ca - 1, y + sa - 1, 3, 3); }
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 3, 3);
            break;
          }
          case 'rugal':
            ctx.fillStyle = fl ? '#fff' : '#40d060'; ctx.fillRect(x - 6, y - 2, 12, 4);
            ctx.fillStyle = '#208030'; ctx.fillRect(x - 2, y - 4, 6, 8);
            ctx.fillStyle = '#ffff60'; ctx.fillRect(x - 6, y - 1, 2, 2);
            break;
          case 'garun': {
            const c = e.red ? '#ff3030' : '#d070ff', w = (e.t >> 3) & 1;
            ctx.fillStyle = fl ? '#fff' : c; ctx.fillRect(x - 5, y - 2, 11, 5);
            ctx.fillStyle = e.red ? '#ffa0a0' : '#f0c0ff';
            ctx.fillRect(x - 1, y - 5 + w * 2, 6, 2); ctx.fillRect(x - 1, y + 3 - w * 2, 6, 2);
            ctx.fillStyle = '#ff0'; ctx.fillRect(x - 5, y, 2, 1);
            break;
          }
          case 'ducker': {
            const s = e.top ? -1 : 1, leg = (e.t >> 3) & 1;
            ctx.fillStyle = fl ? '#fff' : '#e0a040'; ctx.fillRect(x - 4, y - 3 * s - 2, 8, 5);
            ctx.fillStyle = '#ffe080'; ctx.fillRect(x + (e.dir < 0 ? -5 : 3), y - 3 * s - 1, 3, 2);
            ctx.fillStyle = '#a06020';
            ctx.fillRect(x - 3 - leg, y + (s > 0 ? 1 : -4), 2, 4); ctx.fillRect(x + 1 + leg, y + (s > 0 ? 1 : -4), 2, 4);
            break;
          }
          case 'turret': {
            ctx.fillStyle = fl ? '#fff' : '#8090a0'; ctx.fillRect(x - 6, y - 3, 12, 6);
            ctx.fillStyle = '#c0d0e0'; const dy = e.top ? 3 : -5;
            ctx.fillRect(x - 6, y + dy, 4, 2); ctx.fillRect(x - 2, y + dy, 2, 2);
            ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 1, y - 1, 2, 2);
            break;
          }
          case 'hatch': {
            ctx.fillStyle = fl ? '#fff' : '#9a8a70'; ctx.fillRect(x - 11, y - 5, 22, 10);
            ctx.fillStyle = '#5a4a30'; ctx.fillRect(x - 11, y + (e.top ? 3 : -5), 22, 2);
            ctx.fillStyle = e.open ? '#ff3020' : '#3a3020';
            const o = e.open ? 4 : 0;
            ctx.fillRect(x - 6 - o, y + (e.top ? 4 : -7), 5, 3); ctx.fillRect(x + 1 + o, y + (e.top ? 4 : -7), 5, 3);
            break;
          }
          case 'mini':
            ctx.fillStyle = fl ? '#fff' : '#ff8040'; ctx.fillRect(x - 3, y - 3, 6, 6);
            ctx.fillStyle = '#ffe080'; ctx.fillRect(x - 1, y - 1, 2, 2);
            break;
          case 'ring':
            ctx.strokeStyle = (frame >> 2) & 1 ? '#ff60ff' : '#60c0ff'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(x, y, 3, 4, 0, 0, Math.PI * 2); ctx.stroke();
            break;
          case 'rock':
            ctx.fillStyle = fl ? '#fff' : '#a05020';
            ctx.fillRect(x - e.w / 2, y - e.h / 2 + 1, e.w, e.h - 2); ctx.fillRect(x - e.w / 2 + 1, y - e.h / 2, e.w - 2, e.h);
            ctx.fillStyle = '#ff8030'; ctx.fillRect(x - e.w / 2 + 1, y - e.h / 2 + 1, 2, 2);
            break;
          case 'moai': drawMoai(ctx, e); break;
        }
      }
      function drawMoai(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y), s = e.top ? -1 : 1, fl = e.flash && (frame & 1);
        const Y = (dy, h) => s > 0 ? y + dy : y - dy - h;
        ctx.fillStyle = fl ? '#fff' : '#8a7a6a';
        ctx.fillRect(x - 9, Y(-15, 30), 20, 30);
        ctx.fillStyle = '#6a5a4a'; ctx.fillRect(x - 11, Y(-15, 7), 22, 7);           // brow
        ctx.fillStyle = '#b0a090'; ctx.fillRect(x - 13, Y(-6, 10), 5, 10);            // nose
        ctx.fillStyle = '#2a1a10'; ctx.fillRect(x - 7, Y(-6, 3), 6, 3);              // eye
        ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x + 6, Y(-8, 14), 3, 14);            // ear
        ctx.fillStyle = e.open ? '#ff3020' : '#3a2a1a'; ctx.fillRect(x - 12, Y(4, e.open ? 5 : 2), 7, e.open ? 5 : 2); // mouth
        ctx.fillStyle = '#6a5a4a'; ctx.fillRect(x - 9, Y(11, 4), 18, 4);
      }
      function drawBoss(ctx, b) {
        const x = Math.round(b.x), y = Math.round(b.y);
        if (b.state === 'dying' && (b.t >> 2) & 1) return;
        // wings
        ctx.fillStyle = '#5a6a8a';
        ctx.fillRect(x - 38, y - 32, 72, 12); ctx.fillRect(x - 38, y + 20, 72, 12);
        ctx.fillStyle = '#8a9aba'; ctx.fillRect(x - 38, y - 32, 72, 2); ctx.fillRect(x - 38, y + 20, 72, 2);
        ctx.fillStyle = '#3a4a6a'; ctx.fillRect(x - 38, y - 22, 72, 2); ctx.fillRect(x - 38, y + 30, 72, 2);
        ctx.fillStyle = '#5a6a8a'; ctx.fillRect(x + 2, y - 22, 30, 44);
        // body
        ctx.fillStyle = '#7a8aaa'; ctx.fillRect(x - 16, y - 14, 48, 28);
        ctx.fillStyle = '#aab8d8'; ctx.fillRect(x - 16, y - 14, 48, 2); ctx.fillRect(x - 16, y + 12, 48, 2);
        ctx.fillStyle = '#20283a'; ctx.fillRect(x - 18, y - 3, 22, 7);   // tube
        for (let i = 0; i < 4; i++) if (b.walls[i] > 0) { ctx.fillStyle = b.flash ? '#fff' : '#40a0ff'; ctx.fillRect(x - 14 + i * 4, y - 4, 2, 9); }
        // core
        const glow = b.core <= 1 ? (frame & 2 ? '#ff4040' : '#ffa0a0') : (frame & 8 ? '#40c0ff' : '#a0e8ff');
        ctx.fillStyle = '#183060'; ctx.fillRect(x + 1, y - 7, 14, 15);
        ctx.fillStyle = glow; ctx.fillRect(x + 3, y - 5, 10, 11); ctx.fillStyle = '#fff'; ctx.fillRect(x + 5, y - 3, 3, 3);
        // emitters
        ctx.fillStyle = '#ff6040';
        for (const [ox, oy] of [[-40, -26], [-40, 26], [-20, -10], [-20, 10]]) ctx.fillRect(x + ox, y + oy - 1, 3, 3);
        ctx.fillStyle = '#ffb040'; ctx.fillRect(x + 34, y - 30 + (frame & 3), 3, 8); ctx.fillRect(x + 34, y + 22 + (frame & 3), 3, 8);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, PB, W, H - PB);
        for (let i = 0; i < 6; i++) {
          const bx = 2 + i * 42, sel = g.cursor === i;
          ctx.fillStyle = sel ? ((frame >> 3) & 1 ? '#ff9020' : '#ffc060') : '#1a3a9a';
          ctx.fillRect(bx, PB + 3, 41, 10);
          ctx.fillStyle = '#000'; ctx.fillRect(bx, PB + 3, 1, 10);
          if (avail(i)) text(ctx, MENU[i], bx + 21, PB + 5, sel ? '#000' : '#fff', 1, 'center');
        }
        text(ctx, '1P', 4, PB + 16, '#ff5050');
        text(ctx, String(g.score).padStart(7, ' '), 20, PB + 16, '#fff');
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) { ctx.fillStyle = '#e8e8f8'; ctx.fillRect(72 + i * 8, PB + 18, 6, 3); ctx.fillStyle = '#ff5020'; ctx.fillRect(71 + i * 8, PB + 18, 1, 3); }
        text(ctx, 'HI', 130, PB + 16, '#ff5050');
        text(ctx, String(hi).padStart(7, ' '), 146, PB + 16, '#fff');
        text(ctx, 'ST' + (g.stage + 1 + g.loop * 3), W - 4, PB + 16, '#80c0ff', 1, 'right');
      }
      function drawStars(ctx) {
        for (const s of stars) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
      }

      function renderGame(ctx) {
        drawStars(ctx);
        drawTerrain(ctx);
        for (const e of g.enemies) drawEnemy(ctx, e);
        if (g.boss) drawBoss(ctx, g.boss);
        for (const it of g.items) {
          const x = Math.round(it.x), y = Math.round(it.y);
          ctx.fillStyle = it.blue ? '#4080ff' : ((frame >> 3) & 1 ? '#ff3020' : '#ff8040');
          ctx.fillRect(x - 5, y - 3, 10, 6); ctx.fillRect(x - 4, y - 4, 8, 8);
          ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x - 3, y - 2, 2, 2);
        }
        for (const s of g.shots) {
          const x = Math.round(s.x), y = Math.round(s.y);
          if (s.t === 'laser') { ctx.fillStyle = '#60e0ff'; ctx.fillRect(x - s.len, y - 1, s.len, 2); ctx.fillStyle = '#fff'; ctx.fillRect(x - s.len, y, s.len, 1); }
          else if (s.t === 'mis') { ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y, 1, 1); }
          else if (s.t === 'dbl') { ctx.fillStyle = '#ffffa0'; ctx.fillRect(x, y, 2, 2); ctx.fillRect(x - 2, y + 2, 2, 2); }
          else { ctx.fillStyle = '#ffffa0'; ctx.fillRect(x - 3, y, 6, 2); }
        }
        for (const b of g.eb) {
          if (b.len) { ctx.fillStyle = '#ff60ff'; ctx.fillRect(Math.round(b.x), Math.round(b.y) - 1, b.len, 2); }
          else { ctx.fillStyle = (frame >> 1) & 1 ? '#ff8040' : '#ffff80'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 3); }
        }
        const p = g.p;
        if (!p.dead) {
          for (const o of g.opts) {
            const r = 3 + ((frame >> 2) & 1);
            ctx.fillStyle = '#ff4010'; ctx.fillRect(Math.round(o.x) - r, Math.round(o.y) - 2, r * 2, 5);
            ctx.fillStyle = '#ffb040'; ctx.fillRect(Math.round(o.x) - 2, Math.round(o.y) - r + 1, 4, r * 2 - 1);
          }
          if (!(p.inv > 0 && (frame & 2))) drawVic(ctx, p.x, p.y);
          if (g.pw.shield > 0) {
            ctx.strokeStyle = (frame >> 1) & 1 ? '#60c0ff' : '#ffffff'; ctx.lineWidth = 1;
            const rr = 4 + g.pw.shield * 0.4;
            ctx.beginPath(); ctx.arc(p.x + 8, p.y, rr, -1.2, 1.2); ctx.stroke();
          }
        }
        for (const q of g.parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }
        if (g.banner > 0 && g.phase === 'play') {
          text(ctx, 'STAGE ' + (g.stage + 1 + g.loop * 3), W / 2, 80, '#fff', 1, 'center');
          text(ctx, STAGES[g.stage].name, W / 2, 94, '#ff9020', 1, 'center');
          if (g.wx < 10) text(ctx, 'START', W / 2, 110, (frame >> 3) & 1 ? '#fff' : '#ff5050', 1, 'center');
        }
        if (g.boss && g.boss.state === 'enter') text(ctx, 'WARNING', W / 2, 90, (frame >> 3) & 1 ? '#ff4040' : '#ffff40', 2, 'center');
        if (g.phase === 'clear') text(ctx, 'STAGE CLEAR', W / 2, 90, '#fff', 2, 'center');
        drawHUD(ctx);
      }

      function renderTitle(ctx) {
        drawStars(ctx);
        const page = Math.floor(mt / 420) % 2;
        if (page === 0) {
          // big logo
          const t = 'GRADIUS';
          for (let k = 0; k < 2; k++) text(ctx, t, W / 2 + (k ? 0 : 2), 40 + (k ? 0 : 2), k ? '#ff9020' : '#802000', 4, 'center');
          ctx.fillStyle = '#3a6cff'; ctx.fillRect(28, 74, 200, 2);
          const vx = (mt * 1.4) % (W + 60) - 30;
          drawVic(ctx, vx, 96 + Math.sin(mt * 0.05) * 6);
          text(ctx, 'HI SCORE ' + hi, W / 2, 116, '#fff', 1, 'center');
          text(ctx, 'NEMESIS STRIKES BACK', W / 2, 130, '#80c0ff', 1, 'center');
        } else {
          text(ctx, 'POWER UP SYSTEM', W / 2, 24, '#ff9020', 1, 'center');
          const info = [['SPEED', 'MOVE FASTER (5 LEVELS)'], ['MISSILE', 'GROUND ATTACK'], ['DOUBLE', 'TWIN SHOT FORWARD/UP'], ['LASER', 'PIERCING BEAM'], ['OPTION', 'UP TO 4 MULTIPLES'], ['?', 'FORCE FIELD']];
          info.forEach((r, i) => {
            const y = 44 + i * 14, hl = ((mt >> 5) % 6) === i;
            ctx.fillStyle = hl ? '#ff9020' : '#1a3a9a'; ctx.fillRect(16, y - 2, 46, 11);
            text(ctx, r[0], 39, y, hl ? '#000' : '#fff', 1, 'center');
            text(ctx, r[1], 70, y, '#fff');
          });
          ctx.fillStyle = '#ff3020'; ctx.fillRect(40, 134, 10, 6); ctx.fillRect(41, 133, 8, 8);
          text(ctx, 'GET CAPSULE: MOVE CURSOR', 58, 134, '#ffd040');
          text(ctx, 'PRESS X TO POWER UP', 58, 146, '#ffd040');
        }
        const blink = (mt >> 4) & 1;
        if (coinFlash > 0 ? (coinFlash >> 2) & 1 : api.credits === 0 && blink) text(ctx, 'INSERT COIN', W / 2, 162, '#fff', 1, 'center');
        else if (api.credits > 0 && blink) text(ctx, 'PUSH START', W / 2, 162, '#fff', 1, 'center');
        text(ctx, '\u00a9 1985 KONAMI', W / 2, 182, '#ff5050', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#aaa');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        renderGame(ctx);
        if (mode === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 84, 100, 24);
          text(ctx, 'GAME OVER', W / 2, 92, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
