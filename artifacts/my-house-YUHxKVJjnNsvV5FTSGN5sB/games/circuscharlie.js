// Circus Charlie (Konami, 1984) \u2014 from-scratch recreation for the MAME32 Game Room.
// Charlie the clown: lion through fire rings, tightrope with monkeys, rolling balls, trampolines,
// horse riding over springboards, and the flying trapeze. 10 m markers count down, bonus timer, loops harder.
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

  const W = 256, H = 224, GY = 192, ROPE = 140, G = 0.19, JV = 4.2;
  const STAGES = [
    { k: 'lion', name: 'LION', len: 2400 },
    { k: 'rope', name: 'TIGHTROPE', len: 2000 },
    { k: 'ball', name: 'BALLS', len: 2000 },
    { k: 'tramp', name: 'TRAMPOLINE', len: 1800 },
    { k: 'horse', name: 'HORSE', len: 2600 },
    { k: 'trapeze', name: 'TRAPEZE', len: 0 }
  ];
  // a jaunty original circus tune: [semitone from A4 (or null), frames]
  const TUNE = [[3, 8], [null, 4], [7, 4], [10, 8], [7, 8], [8, 8], [5, 4], [8, 4], [12, 16],
    [10, 8], [null, 4], [8, 4], [7, 8], [3, 8], [5, 8], [2, 4], [5, 4], [10, 16],
    [3, 8], [null, 4], [7, 4], [10, 8], [15, 8], [14, 8], [12, 4], [10, 4], [8, 8], [7, 8],
    [5, 8], [8, 8], [7, 8], [2, 8], [3, 24], [null, 8]];
  const BASS = [-21, -14, -16, -14, -21, -14, -19, -14];

  ArcadeRegistry.register({
    id: 'circuscharlie', title: 'Circus Charlie', year: 1984, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: speed \u00b7 Space or X: jump (trapeze: release) \u00b7 Enter: start',
    marquee: { bg: '#200008', fg: '#ffd040', accent: '#ff3030' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', mt = 0, frame = 0, coinFlash = 0, overT = 0;
      let g = null, musicI = 0, musicT = 0, beat = 0;
      const crowd = [];
      { const r = mkRng(77); for (let i = 0; i < 160; i++) crowd.push({ x: i * 6 + (r() * 3 | 0), row: (r() * 6) | 0, c: ['#ff6060', '#60a0ff', '#ffe060', '#60e060', '#ff90ff', '#ffffff', '#ffa040'][(r() * 7) | 0], ph: r() * 6 }); }

      const snd = {
        jump() { au.tone(520, 0.12, { type: 'square', vol: 0.07, slideTo: 1040 }); },
        boing() { au.tone(200, 0.18, { type: 'triangle', vol: 0.14, slideTo: 700 }); },
        point() { au.melody([[1319, 0.05], [1760, 0.08]], { type: 'square', vol: 0.08 }); },
        bag() { au.melody([[1047, 0.05], [1319, 0.05], [1568, 0.05], [2093, 0.1]], { type: 'square', vol: 0.1 }); },
        miss() { au.melody([[784, 0.12], [740, 0.12], [698, 0.12], [659, 0.4]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2], [784, 0.1], [1047, 0.4]], { type: 'square', vol: 0.12 }); },
        tick() { au.tone(1800, 0.02, { type: 'square', vol: 0.05 }); },
        extra() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'triangle', vol: 0.14 }); },
        grab() { au.tone(880, 0.05, { type: 'square', vol: 0.07 }); }
      };
      function music() {
        if (--musicT > 0) return;
        const n = TUNE[musicI % TUNE.length]; musicI++;
        const sp = g ? Math.max(0.7, 1 - g.loop * 0.1) : 1;
        musicT = Math.round(n[1] * sp);
        if (n[0] !== null) au.tone(440 * Math.pow(2, n[0] / 12), musicT / 60 * 0.9, { type: 'square', vol: 0.035 });
        if (musicI % 2 === 0) { au.tone(440 * Math.pow(2, BASS[beat % BASS.length] / 12), 0.1, { type: 'triangle', vol: 0.06 }); beat++; }
      }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); return false;
      }
      function addScore(n) {
        g.score += n; if (g.score > hi) hi = g.score;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra === 20000 ? 30000 : 50000; snd.extra(); }
      }
      function pop(x, y, s) { g.pops.push({ x, y, s: String(s), t: 50 }); }

      // ================= stage construction =================
      function newGame() {
        g = { stage: 0, loop: 0, score: 0, lives: 3, nextExtra: 20000, pops: [] };
        beginStage();
      }
      function beginStage() {
        g.bonus = 5000; g.bonusT = 0;
        buildStage(0);
        g.phase = 'intro'; g.t = 150;
      }
      function rnd() { return g.r(); }
      function buildStage(cp) {
        const def = STAGES[g.stage], lp = g.loop;
        g.r = mkRng(500 + g.stage * 91 + lp * 13);
        const s = { k: def.k, len: def.len, objs: [], spawnT: 60, t: 0, cam: 0, cp };
        const p = { x: cp + 40, h: 0, vy: 0, air: false, vx: 0, vxAir: 0, anim: 0, lastJump: -99 };
        s.p = p;
        if (s.k === 'lion') {
          for (let x = 300; x < s.len - 120; x += 180 + rnd() * 160 - lp * 15) s.objs.push({ t: 'pot', x });
        } else if (s.k === 'horse') {
          for (let x = 320; x < s.len - 200;) {
            const k = rnd();
            if (k < 0.35 + lp * 0.05) { s.objs.push({ t: 'spring', x }); s.objs.push({ t: 'wall', x: x + 46 + rnd() * 14, hh: 54, w: 8 }); x += 200 + rnd() * 80; }
            else { s.objs.push({ t: 'fence', x, hh: 18, w: 6 }); x += 120 + rnd() * 110 - lp * 10; }
          }
        } else if (s.k === 'tramp') {
          s.tramps = []; s.jets = [];
          let x = 70;
          while (x < s.len - 60) {
            s.tramps.push(x);
            const gap = 44 + rnd() * (36 + lp * 6);
            if (gap > 62 && rnd() < 0.6) s.jets.push({ x: x + gap / 2, ph: rnd() * 6 });
            x += gap;
          }
          s.len = x + 20;
        } else if (s.k === 'trapeze') {
          s.traps = [];
          const n = 7 + Math.min(4, lp);
          let ax = 80;
          for (let i = 0; i < n; i++) {
            s.traps.push({ ax, ay: 20, L: 66 + (i % 3) * 4, ph: i * Math.PI + (rnd() - 0.5) * 0.6, w: 0.04 + lp * 0.004 + rnd() * 0.006, caught: false });
            ax += Math.min(124, 98 + i * 3 + lp * 5);
          }
          s.endX = s.traps[n - 1].ax + 62;
          s.len = s.endX;
        }
        // clear static obstacles right at the checkpoint
        if (cp > 0) s.objs = s.objs.filter(o => o.x < cp || o.x > cp + 150);
        if (s.k === 'ball') { const b = { x: p.x, vx: 0, rot: 0, own: true }; s.objs.push({ t: 'ball', b }); p.ball = b; p.h = 20; }
        if (s.k === 'tramp') {
          if (cp > 0) { let best = s.tramps[0]; for (const tx of s.tramps) if (tx <= cp + 40) best = tx; p.x = best; p.h = 40; p.air = true; p.vy = 0; }
          else { p.x = 24; }
        }
        if (s.k === 'trapeze') {
          p.mode = 'stand'; p.x = 20; p.y = 84; p.vx = 0; p.vy = 0; p.hang = -1;
          if (cp > 0) { const i = cp - 1; p.mode = 'hang'; p.hang = i; const b = barPos(s, s.traps[i]); p.x = b.x; p.y = b.y; }
        }
        s.cam = Math.max(-40, p.x - 80);
        g.s = s;
      }
      function barPos(s, tr) {
        const th = 0.66 * Math.sin(s.t * tr.w + tr.ph);
        return { x: tr.ax + tr.L * Math.sin(th), y: tr.ay + tr.L * Math.cos(th) };
      }

      // ================= update =================
      function miss() {
        if (g.phase !== 'play') return;
        g.phase = 'miss'; g.t = 130; snd.miss();
        const p = g.s.p; p.dead = true; p.vy = 3; p.dieH = p.h;
      }
      function afterMiss() {
        const s = g.s;
        g.lives--;
        let cp;
        if (s.k === 'trapeze') { cp = 0; s.traps.forEach((tr, i) => { if (tr.caught) cp = i + 1; }); }
        else { const seg = s.len / 10; cp = Math.max(0, Math.floor((s.p.x - 40) / seg) * seg); }
        const respawn = () => { buildStage(cp); g.phase = 'intro'; g.t = 60; };
        if (g.lives <= 0) {
          g.phase = 'wait';
          const cg = g;
          const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 300; };
          if (api.offerContinue) api.offerContinue(() => { if (g !== cg) return; g.lives = 3; g.score = 0; g.nextExtra = 20000; respawn(); }, end);
          else end();
        } else respawn();
      }
      function stageClear() {
        g.phase = 'clear'; g.t = 0; snd.clear();
      }
      const jumpPressed = () => api.anyPressed('Space', 'KeyX');
      const jumpHeld = () => api.key('Space') || api.key('KeyX');

      function run(fwd, back, idle, jv) {
        const p = g.s.p;
        let vx;
        if (!p.air) {
          vx = api.key('ArrowRight') ? fwd : api.key('ArrowLeft') ? back : idle;
          if (jumpPressed()) { p.air = true; p.vy = jv || JV; p.vxAir = vx; snd.jump(); }
        } else vx = p.vxAir;
        p.vx = vx;
        p.x += vx;
        if (p.x < g.s.cam + 16) p.x = g.s.cam + 16;
        if (p.x < 30) p.x = 30;
        if (p.air) { p.h += p.vy; p.vy -= G; if (p.h <= 0) { p.h = 0; p.air = false; p.vy = 0; } }
        if (vx) p.anim += Math.abs(vx);
      }
      function crossed(o, px) {
        const rel = o.x - px, prev = o.prev; o.prev = rel;
        return prev !== undefined && ((prev > 0 && rel <= 0) || (prev < 0 && rel >= 0));
      }

      function updLion(s, p) {
        run(1.7, -0.9, 0);
        if (--s.spawnT <= 0 && p.x < s.len - 300) {
          s.spawnT = Math.max(80, 160 + rnd() * 100 - g.loop * 20);
          s.objs.push({ t: 'ring', x: s.cam + W + 30, small: rnd() < 0.25 + g.loop * 0.05 });
        }
        for (const o of s.objs) {
          if (o.t === 'ring') {
            o.x -= 0.7 + g.loop * 0.12;
            if (crossed(o, p.x) && !o.done) {
              o.done = true;
              const lo = o.small ? 18 : 12, top = o.small ? 72 : 82;
              if (p.h > lo && p.h + 40 < top) { addScore(100); pop(o.x - s.cam, GY - 90, 100); snd.point(); if (o.small && !o.bag) { o.bag = true; addScore(500); pop(o.x - s.cam, GY - 100, 500); snd.bag(); } }
              else { o.burn = true; miss(); return; }
            }
            if (o.x < s.cam - 40) o.gone = true;
          } else if (o.t === 'pot') {
            if (Math.abs(o.x - p.x) < 15 && p.h < 14) { miss(); return; }
            if (!o.done && o.x < p.x - 15) { o.done = true; addScore(200); pop(o.x - s.cam, GY - 30, 200); snd.point(); }
          }
        }
        s.objs = s.objs.filter(o => !o.gone);
        if (p.x >= s.len && !p.air) stageClear();
      }
      function updRope(s, p) {
        run(1.3, -0.8, 0);
        const prog = p.x / s.len;
        if (--s.spawnT <= 0 && p.x < s.len - 260) {
          s.spawnT = Math.max(70, 130 + rnd() * 90 - g.loop * 15);
          s.objs.push({ t: 'monkey', x: s.cam + W + 12, blue: prog > 0.3 && rnd() < 0.35 + g.loop * 0.1, h: 0, vy: 0 });
        }
        for (const o of s.objs) {
          if (o.t !== 'monkey') continue;
          o.x -= o.blue ? 1.5 + g.loop * 0.15 : 0.6 + g.loop * 0.1;
          if (o.blue) {
            if (o.h <= 0 && s.objs.some(m => m !== o && m.t === 'monkey' && !m.blue && o.x - m.x > 0 && o.x - m.x < 26)) o.vy = 3.4;
            o.h += o.vy; o.vy -= G; if (o.h <= 0) { o.h = 0; o.vy = 0; }
          }
          if (Math.abs(o.x - p.x) < 9 && p.h < o.h + 14) { miss(); return; }
          if (crossed(o, p.x) && !o.done && p.air) { o.done = true; const v = o.blue ? 200 : 100; addScore(v); pop(p.x - s.cam, ROPE - 50, v); snd.point(); }
          if (o.x < s.cam - 30) o.gone = true;
        }
        s.objs = s.objs.filter(o => !o.gone);
        if (p.x >= s.len && !p.air) stageClear();
      }
      function updBall(s, p) {
        if (p.ball) {
          const vx = api.key('ArrowRight') ? 1.2 : api.key('ArrowLeft') ? -0.7 : 0;
          p.x = Math.max(Math.max(30, s.cam + 16), p.x + vx); p.ball.x = p.x; p.ball.rot += vx * 0.15; p.h = 20; p.vx = vx;
          if (vx) p.anim += 1;
          if (jumpPressed()) {
            p.air = true; p.vy = 4.0; p.vxAir = vx + 0.3; p.ball.vx = -0.5; p.ball.own = false; p.last = p.ball; p.ball = null; snd.jump();
          }
        } else {
          p.x += p.vxAir; p.h += p.vy; p.vy -= G;
          if (p.vy < 0 && p.h <= 20) {
            let land = null;
            for (const o of s.objs) if (o.t === 'ball' && Math.abs(o.b.x - p.x) < 11 && p.h > 12) land = o.b;
            if (land) {
              p.ball = land; land.vx = 0; land.own = true; p.h = 20; p.air = false; p.x = land.x;
              if (land !== p.last) { addScore(100); pop(p.x - s.cam, GY - 60, 100); snd.point(); }
            } else if (p.h <= 0) { p.h = 0; miss(); return; }
          }
        }
        if (--s.spawnT <= 0 && p.x < s.len - 260) {
          s.spawnT = Math.max(70, 110 + rnd() * 80 - g.loop * 12);
          s.objs.push({ t: 'ball', b: { x: s.cam + W + 20, vx: -(0.6 + rnd() * 0.6 + g.loop * 0.12), rot: 0, own: false, c: (rnd() * 4) | 0 } });
        }
        for (const o of s.objs) {
          const b = o.b;
          if (!b.own) { b.x += b.vx; b.rot += b.vx * 0.15; }
          if (p.ball && b !== p.ball && Math.abs(b.x - p.ball.x) < 19) { miss(); return; }
          if (b.x < s.cam - 40) o.gone = true;
        }
        s.objs = s.objs.filter(o => !o.gone);
        if (p.ball && p.x >= s.len) stageClear();
      }
      function updTramp(s, p) {
        const onStart = x => x < 44, onGoal = x => x >= s.len - 16;
        if (!p.air) {
          // on solid floor (start or goal)
          const vx = api.key('ArrowRight') ? 1.2 : api.key('ArrowLeft') ? -0.8 : 0;
          p.x = Math.max(16, p.x + vx); if (onStart(p.x - vx) && p.x > 43) p.x = 43; p.vx = vx; if (vx) p.anim++;
          if (!onStart(p.x) && !onGoal(p.x)) { p.air = true; p.vy = 0; }
          if (jumpPressed()) { p.air = true; p.vy = 3.6; snd.jump(); }
          if (onGoal(p.x)) { stageClear(); return; }
        } else {
          const vx = api.key('ArrowRight') ? 1.35 : api.key('ArrowLeft') ? -0.9 : 0;
          p.x = Math.max(Math.max(16, s.cam + 16), p.x + vx); p.vx = vx;
          if (jumpPressed()) p.lastJump = s.t;
          const ph = p.h; p.h += p.vy; p.vy -= G;
          if (p.vy < 0 && ph > 10 && p.h <= 10) {
            const tr = s.tramps.find(tx => Math.abs(tx - p.x) < 14);
            if (tr !== undefined) {
              const big = jumpHeld() || s.t - p.lastJump < 14;
              p.h = 10; p.vy = big ? 5.3 : 3.0; snd.boing(); p.boing = 10; p.tr = tr;
              if (big && p.lastTr !== tr) { p.lastTr = tr; addScore(50); }
            }
          }
          if (p.h <= 0) {
            if (onStart(p.x) || onGoal(p.x)) { p.h = 0; p.air = false; p.vy = 0; if (onGoal(p.x)) { stageClear(); return; } }
            else { p.h = 0; miss(); return; }
          }
        }
        if (p.boing) p.boing--;
        for (const j of s.jets) {
          j.h = Math.max(0, 50 * Math.sin(s.t * (0.035 + g.loop * 0.005) + j.ph));
          if (Math.abs(j.x - p.x) < 7 && p.h < j.h + 2) { miss(); return; }
          if (!j.done && j.x < p.x - 8) { j.done = true; addScore(200); pop(j.x - s.cam, GY - 70, 200); snd.point(); }
        }
      }
      function updHorse(s, p) {
        run(2.0, 0.8, 1.3, 4.0);
        for (const o of s.objs) {
          if (o.t === 'spring') {
            if (!p.air && Math.abs(o.x - p.x) < 9) { p.air = true; p.vy = 6.2; p.vxAir = Math.max(p.vx, 1.6); snd.boing(); o.hit = 8; }
            if (o.hit) o.hit--;
          } else {
            if (Math.abs(o.x - p.x) < 12 + o.w / 2 && p.h < o.hh) { miss(); return; }
            if (!o.done && o.x < p.x - 14) { o.done = true; const v = o.t === 'wall' ? 300 : 100; addScore(v); pop(o.x - s.cam, GY - o.hh - 20, v); snd.point(); }
          }
        }
        if (p.x >= s.len && !p.air) stageClear();
      }
      function updTrapeze(s, p) {
        if (p.mode === 'stand') {
          p.y = 84;
          if (jumpPressed()) { p.mode = 'fly'; p.vx = 1.7; p.vy = -1.4; snd.jump(); }
        } else if (p.mode === 'hang') {
          const tr = s.traps[p.hang];
          const b = barPos(s, tr), b0 = { x: p.x, y: p.y };
          p.x = b.x; p.y = b.y; p.bvx = b.x - b0.x; p.bvy = b.y - b0.y;
          if (jumpPressed()) { p.mode = 'fly'; p.vx = p.bvx + 1.6; p.vy = p.bvy - 1.2; snd.jump(); p.from = p.hang; }
        } else {
          p.vx += api.key('ArrowRight') ? 0.015 : api.key('ArrowLeft') ? -0.015 : 0;
          p.x += p.vx; p.y += p.vy; p.vy += 0.12;
          for (let i = 0; i < s.traps.length; i++) {
            if (i === p.from && p.vy < 1) continue;
            const b = barPos(s, s.traps[i]);
            if (Math.hypot(b.x - p.x, b.y - p.y) < 15) {
              p.mode = 'hang'; p.hang = i; p.x = b.x; p.y = b.y; snd.grab();
              if (!s.traps[i].caught) { s.traps[i].caught = true; addScore(200); pop(b.x - s.cam, b.y - 30, 200); }
              break;
            }
          }
          if (p.mode === 'fly' && p.x > s.endX - 8 && p.vy > 0 && p.y + 26 >= 110 && p.y + 26 <= 132) { p.y = 84; p.mode = 'stand'; p.x = Math.max(p.x, s.endX); stageClear(); return; }
          if (p.y > H + 30) { miss(); return; }
        }
      }

      function updPlay() {
        const s = g.s, p = s.p;
        s.t++;
        if (++g.bonusT >= 30) { g.bonusT = 0; g.bonus = Math.max(0, g.bonus - 10); }
        switch (s.k) {
          case 'lion': updLion(s, p); break;
          case 'rope': updRope(s, p); break;
          case 'ball': updBall(s, p); break;
          case 'tramp': updTramp(s, p); break;
          case 'horse': updHorse(s, p); break;
          case 'trapeze': updTrapeze(s, p); break;
        }
        const tx = p.x - 90;
        s.cam = Math.max(s.cam, Math.min(tx, s.cam + 3));
        if (tx < s.cam - 40) s.cam = tx + 40;
        s.cam = Math.max(-40, s.cam);
      }
      function update() {
        frame++; mt++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); musicI = 0; musicT = 0; }
          return;
        }
        if (mode === 'over') {
          if (--overT <= 0 || (overT < 200 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; }
          return;
        }
        for (const q of g.pops) { q.t--; q.y -= 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.phase === 'intro') {
          if (--g.t <= 0) g.phase = 'play';
          if (g.s.k === 'trapeze') g.s.t++;
          return;
        }
        if (g.phase === 'play') { music(); updPlay(); return; }
        if (g.phase === 'miss') {
          const p = g.s.p; g.t--;
          if (g.s.k === 'trapeze') { p.y += 2; } else { p.h = Math.max(-30, p.h + p.vy); p.vy -= 0.25; }
          if (g.t <= 0) afterMiss();
          return;
        }
        if (g.phase === 'clear') {
          g.t++;
          if (g.t > 90 && g.bonus > 0) { const d = Math.min(100, g.bonus); g.bonus -= d; addScore(d); if (g.t % 3 === 0) snd.tick(); g.t = 91; return; }
          if (g.t > 200) {
            g.stage++;
            if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; }
            beginStage();
          }
        }
      }

      // ================= drawing =================
      function drawCharlie(ctx, x, y, pose, t) {
        // feet at (x, y)
        x = Math.round(x); y = Math.round(y);
        const step = pose === 'walk' ? ((t >> 3) & 1) : 0;
        if (pose === 'sit') {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 4, 9, 4);
        } else if (pose === 'hang') {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 8, 3, 8); ctx.fillRect(x + 1, y - 8, 3, 8);
        } else if (pose === 'fall') {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 6, 4, 4); ctx.fillRect(x + 3, y - 6, 4, 4);
        } else {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3 - step, y - 8, 3, 8); ctx.fillRect(x + 1 + step, y - 8, 3, 8);
          ctx.fillStyle = '#c02020'; ctx.fillRect(x - 4 - step, y - 2, 4, 2); ctx.fillRect(x + 1 + step, y - 2, 4, 2);
        }
        const by = pose === 'sit' ? y - 4 : y - 8;
        // body
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, by - 9, 9, 9);
        ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 2, by - 8, 2, 2); ctx.fillRect(x + 1, by - 4, 2, 2);
        ctx.fillStyle = '#2060ff'; ctx.fillRect(x - 4, by - 10, 9, 2);
        // arms
        ctx.fillStyle = '#ffffff';
        if (pose === 'hang' || pose === 'up') { ctx.fillRect(x - 5, by - 18, 2, 9); ctx.fillRect(x + 4, by - 18, 2, 9); }
        else if (pose === 'fall') { ctx.fillRect(x - 8, by - 10, 4, 2); ctx.fillRect(x + 5, by - 10, 4, 2); }
        else { ctx.fillRect(x - 6, by - 8, 2, 5); ctx.fillRect(x + 5, by - 8, 2, 5); }
        // head
        ctx.fillStyle = '#ffe0c0'; ctx.fillRect(x - 3, by - 16, 7, 6);
        ctx.fillStyle = '#ff2020'; ctx.fillRect(x + 3, by - 13, 2, 2);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 1, by - 14, 1, 1);
        ctx.fillStyle = '#30c030'; ctx.fillRect(x - 4, by - 15, 2, 3);
        ctx.fillStyle = '#2060ff'; ctx.fillRect(x - 2, by - 19, 5, 3); ctx.fillRect(x - 1, by - 21, 3, 2);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x, by - 22, 1, 1);
      }
      function drawLion(ctx, x, y, t, air) {
        x = Math.round(x); y = Math.round(y);
        const ph = air ? 2 : (t >> 2) & 3;
        ctx.fillStyle = '#e09030'; ctx.fillRect(x - 13, y - 13, 24, 8);
        ctx.fillStyle = '#c07020';
        const L = [[0, 0], [2, -1], [0, 0], [-2, -1], [3, -2]][ph];
        ctx.fillRect(x - 12 + L[0], y - 6, 3, 6 + L[1]); ctx.fillRect(x - 7 - L[0], y - 6, 3, 6);
        ctx.fillRect(x + 4 + L[0], y - 6, 3, 6 + L[1]); ctx.fillRect(x + 8 - L[0], y - 6, 3, 6);
        ctx.fillStyle = '#904010'; ctx.fillRect(x + 7, y - 20, 9, 12);
        ctx.fillStyle = '#e09030'; ctx.fillRect(x + 11, y - 16, 6, 6);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 14, y - 15, 1, 1);
        ctx.fillStyle = '#c07020'; ctx.fillRect(x - 17, y - 14 + ((t >> 3) & 1), 5, 2);
      }
      function drawHorse(ctx, x, y, t, air) {
        x = Math.round(x); y = Math.round(y);
        const ph = air ? 1 : (t >> 2) & 3;
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 14, y - 18, 26, 9);
        ctx.fillStyle = '#d0d0d0';
        const L = [[0, 0], [3, -2], [0, 0], [-3, -2]][ph];
        ctx.fillRect(x - 13 + L[0], y - 10, 3, 10 + L[1]); ctx.fillRect(x - 8 - L[0], y - 10, 3, 10);
        ctx.fillRect(x + 5 + L[0], y - 10, 3, 10 + L[1]); ctx.fillRect(x + 9 - L[0], y - 10, 3, 10);
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x + 9, y - 26, 5, 10); ctx.fillRect(x + 11, y - 28, 8, 5);
        ctx.fillStyle = '#ff3030'; ctx.fillRect(x + 8, y - 30, 3, 4);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 15, y - 27, 1, 1);
        ctx.fillStyle = '#c0a060'; ctx.fillRect(x - 17, y - 18 + ((t >> 3) & 1), 4, 6); ctx.fillRect(x + 8, y - 24, 2, 8);
        ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 6, y - 19, 10, 3);
      }
      function drawMonkey(ctx, x, y, blue, t) {
        x = Math.round(x); y = Math.round(y);
        ctx.fillStyle = blue ? '#4080ff' : '#a06030';
        ctx.fillRect(x - 4, y - 11, 8, 7); ctx.fillRect(x - 3, y - 16, 7, 6);
        const s = (t >> 3) & 1;
        ctx.fillRect(x - 4 + s, y - 4, 2, 4); ctx.fillRect(x + 2 - s, y - 4, 2, 4);
        ctx.fillRect(x + 4, y - 12 + s, 4, 2);
        ctx.fillStyle = '#ffd0a0'; ctx.fillRect(x - 3, y - 14, 4, 3);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 14, 1, 1);
      }
      function drawRing(ctx, x, small, half) {
        const lo = small ? 18 : 12, top = small ? 72 : 82;
        const cy = GY - (lo + top) / 2, ry = (top - lo) / 2 + 2, rx = small ? 7 : 9;
        ctx.lineWidth = 3;
        ctx.strokeStyle = (frame >> 2) & 1 ? '#ff6010' : '#ffd040';
        ctx.beginPath();
        if (half === 0) ctx.ellipse(x, cy, rx, ry, 0, Math.PI / 2, Math.PI * 1.5);
        else ctx.ellipse(x, cy, rx, ry, 0, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.fillStyle = '#fff060';
        for (let k = 0; k < 6; k++) {
          const a = (half === 0 ? Math.PI / 2 : -Math.PI / 2) + (k + 0.5) / 6 * Math.PI + frame * 0.02;
          ctx.fillRect(Math.round(x + Math.cos(a) * rx) - 1, Math.round(cy + Math.sin(a) * ry) - 1, 2, 2);
        }
      }
      function drawPot(ctx, x) {
        x = Math.round(x);
        ctx.fillStyle = '#a05020'; ctx.fillRect(x - 6, GY - 10, 12, 10); ctx.fillRect(x - 7, GY - 12, 14, 3);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 3, GY - 9, 6, 2);
        const f = (frame >> 2) & 1;
        ctx.fillStyle = '#ff4010'; ctx.fillRect(x - 5, GY - 18, 10, 6);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 3 + f, GY - 22, 4, 6);
      }
      function drawBall(ctx, x, rot, c) {
        x = Math.round(x);
        const cols = [['#ff3030', '#ffffff'], ['#3060ff', '#ffd040'], ['#30c030', '#ffffff'], ['#ff60ff', '#ffff60']][c || 0];
        ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x, GY - 10, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cols[1];
        for (let k = 0; k < 3; k++) { const a = rot + k * 2.09; ctx.fillRect(Math.round(x + Math.cos(a) * 6) - 2, Math.round(GY - 10 + Math.sin(a) * 6) - 2, 4, 4); }
      }
      function drawCrowd(ctx, cam) {
        ctx.fillStyle = '#400818'; ctx.fillRect(0, 22, W, 92);
        for (let r = 0; r < 6; r++) { ctx.fillStyle = r & 1 ? '#5a1024' : '#4a0c1e'; ctx.fillRect(0, 30 + r * 13, W, 6); }
        for (const c of crowd) {
          const x = ((c.x - cam * 0.5) % 960 + 960) % 960;
          if (x > W) continue;
          const bob = ((frame >> 4) + c.ph) % 2 < 1 ? 0 : 1;
          ctx.fillStyle = c.c; ctx.fillRect(x | 0, 26 + c.row * 13 - bob, 4, 4);
          ctx.fillStyle = '#ffd0a0'; ctx.fillRect((x | 0) + 1, 23 + c.row * 13 - bob, 2, 3);
        }
        ctx.fillStyle = '#ffd040'; ctx.fillRect(0, 112, W, 2);
      }
      function drawFloor(ctx, s) {
        const cam = s.cam;
        const cols = { lion: ['#208040', '#30a050'], rope: ['#203060', '#304080'], ball: ['#605020', '#806830'], tramp: ['#301010', '#502020'], horse: ['#806030', '#a07840'], trapeze: ['#203060', '#304080'] }[s.k];
        ctx.fillStyle = cols[0]; ctx.fillRect(0, 114, W, GY - 114);
        ctx.fillStyle = cols[1]; ctx.fillRect(0, GY, W, H - GY);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let x = -((cam | 0) % 32); x < W; x += 32) ctx.fillRect(x, GY + 2, 16, H - GY - 2);
        // distance markers
        if (s.k !== 'trapeze') {
          const seg = s.len / 10;
          for (let k = 0; k <= 10; k++) {
            const x = Math.round(k * seg - cam);
            if (x < -20 || x > W + 20) continue;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 10, GY + 8, 20, 10);
            text(ctx, String(100 - k * 10), x, GY + 10, '#c00000', 1, 'center');
          }
          // goal podium
          const gx = Math.round(s.len - cam);
          if (gx > -40 && gx < W + 40) {
            ctx.fillStyle = '#ff3030'; ctx.fillRect(gx - 4, GY - 14, 36, 14);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(gx - 4, GY - 16, 36, 3); ctx.fillRect(gx + 6, GY - 10, 16, 6);
          }
        }
      }
      function charliePose(p) { return p.air ? 'up' : (p.vx ? 'walk' : 'stand'); }
      function renderStage(ctx) {
        const s = g.s, p = s.p, cam = s.cam;
        drawCrowd(ctx, cam);
        drawFloor(ctx, s);
        const dead = g.phase === 'miss';
        const px = p.x - cam;
        if (s.k === 'lion') {
          for (const o of s.objs) if (o.t === 'ring') drawRing(ctx, o.x - cam, o.small, 0);
          for (const o of s.objs) if (o.t === 'pot') drawPot(ctx, o.x - cam);
          const y = GY - p.h;
          drawLion(ctx, px, y, p.anim | 0, p.air);
          drawCharlie(ctx, px - 1, y - 12, dead ? 'fall' : 'sit', 0);
          for (const o of s.objs) if (o.t === 'ring') {
            drawRing(ctx, o.x - cam, o.small, 1);
            if (o.small && !o.bag) { const bx = Math.round(o.x - cam), by = GY - 50; ctx.fillStyle = '#c08030'; ctx.fillRect(bx - 3, by, 7, 7); ctx.fillStyle = '#ffd040'; ctx.fillRect(bx - 1, by - 2, 3, 2); text(ctx, '$', bx - 2, by, '#fff'); }
          }
        } else if (s.k === 'rope') {
          ctx.fillStyle = '#806040'; for (let x = -((cam | 0) % 160); x < W; x += 160) ctx.fillRect(x, ROPE, 3, GY - ROPE);
          ctx.fillStyle = '#e0d0a0'; ctx.fillRect(0, ROPE, W, 2);
          for (const o of s.objs) drawMonkey(ctx, o.x - cam, ROPE - o.h, o.blue, frame);
          drawCharlie(ctx, px, ROPE - p.h + (dead ? 0 : 0), dead ? 'fall' : charliePose(p), p.anim | 0);
        } else if (s.k === 'ball') {
          for (const o of s.objs) drawBall(ctx, o.b.x - cam, o.b.rot, o.b.c);
          drawCharlie(ctx, px, GY - p.h, dead ? 'fall' : (p.air ? 'up' : 'stand'), p.anim | 0);
        } else if (s.k === 'tramp') {
          // pits with fire glow
          ctx.fillStyle = '#100000'; ctx.fillRect(0, GY, W, 10);
          ctx.fillStyle = frame & 8 ? '#ff4010' : '#c02000';
          for (let x = -((cam | 0) % 12); x < W; x += 12) ctx.fillRect(x, GY + 2 + ((x + frame) & 2), 6, 3);
          ctx.fillStyle = '#808890'; ctx.fillRect(-40 - cam, GY - 4, 84, 4); ctx.fillRect(s.len - 16 - cam, GY - 4, 60, 4);
          for (const tx of s.tramps) {
            const x = Math.round(tx - cam); if (x < -20 || x > W + 20) continue;
            const sag = p.boing && p.tr === tx ? 3 : 0;
            ctx.fillStyle = '#3060ff'; ctx.fillRect(x - 13, GY - 10, 2, 10); ctx.fillRect(x + 11, GY - 10, 2, 10);
            ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 12, GY - 10 + sag, 24, 2);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 13, GY - 11, 2, 2); ctx.fillRect(x + 11, GY - 11, 2, 2);
          }
          for (const j of s.jets) {
            const x = Math.round(j.x - cam); if (x < -10 || x > W + 10 || !j.h) continue;
            ctx.fillStyle = '#ff5010'; ctx.fillRect(x - 4, GY - j.h, 8, j.h);
            ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, GY - j.h + 2, 4, Math.max(0, j.h - 4));
          }
          const gx = Math.round(s.len - cam);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(gx, GY - 14, 30, 14); ctx.fillStyle = '#ffd040'; ctx.fillRect(gx, GY - 16, 30, 3);
          drawCharlie(ctx, px, GY - p.h, dead ? 'fall' : (p.air ? 'up' : charliePose(p)), p.anim | 0);
        } else if (s.k === 'horse') {
          for (const o of s.objs) {
            const x = Math.round(o.x - cam); if (x < -20 || x > W + 20) continue;
            if (o.t === 'spring') { ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 8, GY - 4 - (o.hit ? 2 : 0), 16, 3); ctx.fillStyle = '#808080'; ctx.fillRect(x - 6, GY - 2, 2, 2); ctx.fillRect(x + 4, GY - 2, 2, 2); }
            else if (o.t === 'fence') { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, GY - o.hh, 2, o.hh); ctx.fillRect(x + 1, GY - o.hh, 2, o.hh); ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 6, GY - o.hh + 2, 12, 3); ctx.fillRect(x - 6, GY - o.hh + 10, 12, 3); }
            else { ctx.fillStyle = '#a05030'; ctx.fillRect(x - 4, GY - o.hh, 8, o.hh); ctx.fillStyle = '#703010'; for (let y = GY - o.hh + 4; y < GY; y += 6) ctx.fillRect(x - 4, y, 8, 1); }
          }
          const y = GY - p.h;
          drawHorse(ctx, px, y, p.anim | 0, p.air);
          drawCharlie(ctx, px - 2, y - 18, dead ? 'fall' : 'stand', 0);
        } else if (s.k === 'trapeze') {
          ctx.fillStyle = '#806040'; ctx.fillRect(0, 14, W, 4);
          ctx.fillStyle = '#c0c0c0'; for (let x = -((cam | 0) % 8); x < W; x += 8) ctx.fillRect(x, GY - 6, 4, 1);
          ctx.fillStyle = '#a0a0a0'; ctx.fillRect(-60 - cam, 110, 92, 4); ctx.fillRect(-30 - cam, 114, 4, GY - 114);
          ctx.fillRect(s.endX - cam, 110, 90, 4); ctx.fillRect(s.endX + 30 - cam, 114, 4, GY - 114);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(s.endX - cam, 106, 90, 4);
          for (const tr of s.traps) {
            const b = barPos(s, tr), ax = tr.ax - cam;
            if (ax < -100 || ax > W + 100) continue;
            ctx.strokeStyle = '#e0d0a0'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ax - 5, tr.ay); ctx.lineTo(b.x - cam - 6, b.y); ctx.moveTo(ax + 5, tr.ay); ctx.lineTo(b.x - cam + 6, b.y); ctx.stroke();
            ctx.fillStyle = tr.caught ? '#ffd040' : '#ff3030'; ctx.fillRect(Math.round(b.x - cam) - 7, Math.round(b.y), 14, 2);
          }
          const pose = dead ? 'fall' : p.mode === 'stand' ? 'stand' : 'hang';
          drawCharlie(ctx, px, p.y + 26, pose, 0);
        }
        for (const q of g.pops) text(ctx, q.s, Math.round(q.x), Math.round(q.y), '#ffffff', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 22);
        text(ctx, '1P-' + String(g.score).padStart(6, '0'), 4, 2, '#fff');
        text(ctx, 'HI-' + String(hi).padStart(6, '0'), 96, 2, '#ff4040');
        text(ctx, 'STAGE-' + (g.stage + 1 + g.loop * 6), W - 4, 2, '#fff', 1, 'right');
        text(ctx, 'BONUS-' + String(g.bonus).padStart(4, '0'), 96, 12, '#ffd040');
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) {
          const x = 6 + i * 9;
          ctx.fillStyle = '#ffe0c0'; ctx.fillRect(x, 13, 5, 5); ctx.fillStyle = '#2060ff'; ctx.fillRect(x, 11, 5, 2); ctx.fillStyle = '#ff2020'; ctx.fillRect(x + 4, 15, 2, 2);
        }
        if (g.s.k !== 'trapeze') {
          const m = Math.max(0, Math.ceil(100 - g.s.p.x / g.s.len * 100));
          text(ctx, m + 'M', W - 4, 12, '#80ff80', 1, 'right');
        }
      }
      function renderTitle(ctx) {
        // tent stripes
        for (let i = 0; i < 16; i++) { ctx.fillStyle = i & 1 ? '#c01020' : '#f0e0c0'; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(i * 32 - 128, 120); ctx.lineTo(i * 32 - 96, 120); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#200008'; ctx.fillRect(0, 120, W, H - 120);
        const cols = ['#ff4040', '#ffd040', '#40c0ff', '#60ff60', '#ff80ff'];
        const t1 = 'CIRCUS', t2 = 'CHARLIE';
        for (let i = 0; i < t1.length; i++) { ctx.fillStyle = '#000'; ctx.fillRect(40 + i * 30 - 2, 30 - 2 + Math.round(Math.sin(mt * 0.08 + i) * 3), 26, 28); text(ctx, t1[i], 40 + i * 30, 30 + Math.round(Math.sin(mt * 0.08 + i) * 3), cols[i % 5], 4); }
        for (let i = 0; i < t2.length; i++) { ctx.fillStyle = '#000'; ctx.fillRect(26 + i * 30 - 2, 66 - 2 + Math.round(Math.sin(mt * 0.08 + i + 3) * 3), 26, 28); text(ctx, t2[i], 26 + i * 30, 66 + Math.round(Math.sin(mt * 0.08 + i + 3) * 3), cols[(i + 2) % 5], 4); }
        const page = Math.floor(mt / 360) % 2;
        if (page === 0) {
          const lx = (mt * 1.2) % (W + 80) - 40, jh = Math.max(0, Math.sin(mt * 0.07) * 30);
          drawLion(ctx, lx, 170 - jh, mt, jh > 0);
          drawCharlie(ctx, lx - 1, 158 - jh, 'sit', 0);
          text(ctx, 'HI SCORE ' + hi, W / 2, 128, '#fff', 1, 'center');
        } else {
          const lines = ['1 LION AND FIRE RINGS', '2 TIGHTROPE MONKEYS', '3 ROLLING BALLS', '4 TRAMPOLINES', '5 HORSE RIDING', '6 FLYING TRAPEZE'];
          lines.forEach((l, i) => text(ctx, l, 50, 126 + i * 10, i === ((mt >> 5) % 6) ? '#ffd040' : '#ffffff'));
        }
        const blink = (mt >> 4) & 1;
        if (coinFlash > 0 ? (coinFlash >> 2) & 1 : api.credits === 0 && blink) text(ctx, 'INSERT COIN', W / 2, 190, '#fff', 1, 'center');
        else if (api.credits > 0 && blink) text(ctx, 'PUSH START', W / 2, 190, '#fff', 1, 'center');
        text(ctx, '\u00a9 1984 KONAMI', W / 2, 202, '#ff5050', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#aaa');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        renderStage(ctx);
        drawHUD(ctx);
        if (g.phase === 'intro') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 60, 60, 120, 30);
          text(ctx, 'STAGE ' + (g.stage + 1 + g.loop * 6), W / 2, 64, '#fff', 1, 'center');
          text(ctx, STAGES[g.stage].name, W / 2, 76, '#ffd040', 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 64, 56, 128, 34);
          text(ctx, 'STAGE CLEAR', W / 2, 60, '#ffd040', 1, 'center');
          text(ctx, 'BONUS ' + g.bonus, W / 2, 74, '#fff', 1, 'center');
        }
        if (mode === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 84, 100, 24);
          text(ctx, 'GAME OVER', W / 2, 92, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
