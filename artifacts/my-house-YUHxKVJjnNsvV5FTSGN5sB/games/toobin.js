// Toobin' (Atari Games, 1988) - from-scratch recreation: inner-tube down six rivers, gates, cans and gators.
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
  const RIVERS = [
    { name: 'COLORADO', water: '#2a70c8', deep: '#1c50a0', bank: '#c89050', bank2: '#a87038', grass: '#6a9a3a', snow: false },
    { name: 'RIO GRANDE', water: '#3a80b8', deep: '#285e90', bank: '#d8b070', bank2: '#b08848', grass: '#8a9a40', snow: false },
    { name: 'AMAZON', water: '#3a7a60', deep: '#285a44', bank: '#3a7a28', bank2: '#28561a', grass: '#50a030', snow: false },
    { name: 'NILE', water: '#3a88b0', deep: '#2a6488', bank: '#e0c880', bank2: '#c0a058', grass: '#a0a040', snow: false },
    { name: 'YUKON', water: '#4a88c8', deep: '#3060a0', bank: '#e8f0f8', bank2: '#b8c8d8', grass: '#d0e0f0', snow: true },
    { name: 'STYX', water: '#503070', deep: '#382050', bank: '#404040', bank2: '#282828', grass: '#604050', snow: false }
  ];
  const LETTERS = 'TOOBIN';

  ArcadeRegistry.register({
    id: 'toobin', title: "Toobin'", year: 1988, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up: paddle both arms \u00b7 Left/Right: paddle one arm to turn \u00b7 Down: back-paddle \u00b7 Space: throw a can \u00b7 Enter: start',
    marquee: { bg: '#1c50a0', fg: '#ffe040', accent: '#e83020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(40000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;
      let seed = 1;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        paddle() { au.noise(0.06, { vol: 0.05, freq: 1500, slideTo: 500, type: 'bandpass' }); },
        gate(n) { au.melody([[659 + n * 60, .05], [784 + n * 60, .05], [988 + n * 60, .1]], { type: 'square', vol: 0.1 }); },
        can() { au.tone(700, 0.08, { type: 'triangle', vol: 0.1, slideTo: 300 }); },
        clink() { au.tone(1800, 0.05, { type: 'square', vol: 0.08 }); au.tone(2400, 0.06, { type: 'square', vol: 0.06, delay: 0.04 }); },
        pick() { au.melody([[880, .04], [1175, .06]], { type: 'square', vol: 0.09 }); },
        pop() { au.noise(0.25, { vol: 0.22, freq: 3000, slideTo: 200 }); au.tone(500, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 60 }); },
        bump() { au.tone(110, 0.07, { type: 'triangle', vol: 0.12 }); },
        splash() { au.noise(0.3, { vol: 0.12, freq: 1200, slideTo: 300 }); },
        chomp() { au.tone(160, 0.08, { type: 'square', vol: 0.1 }); au.tone(120, 0.1, { type: 'square', vol: 0.1, delay: 0.1 }); },
        letter() { au.melody([[1047, .05], [1319, .05], [1568, .05], [2093, .12]], { type: 'square', vol: 0.09 }); },
        theme() {
          // a bouncy, calypso-ish original tune
          const m = [[392, .12], [523, .12], [659, .12], [523, .12], [587, .24], [494, .12], [392, .12], [440, .12], [523, .12], [659, .24], [587, .36]];
          au.melody(m, { type: 'square', vol: 0.08 });
          au.melody([[131, .24], [196, .24], [147, .24], [196, .24], [131, .24], [196, .24], [147, .48]], { type: 'triangle', vol: 0.12 });
        },
        end() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [880, .1], [1047, .3]], { type: 'square', vol: 0.1 }); }
      };

      // ---------- river ----------
      function banks(y) {
        const r = g.river, ph = g.ph;
        const narrow = Math.min(40, r * 6);
        const c = W / 2 + Math.sin(y / 260 + ph) * 34 + Math.sin(y / 91 + ph * 2) * 10;
        const hw = 82 - narrow / 2 + Math.sin(y / 170 + ph * 3) * 14;
        return [c - hw, c + hw];
      }
      function buildRiver() {
        seed = 1234 + g.river * 977 + g.loop * 31;
        g.ph = rnd() * 6;
        g.L = 4200 + g.river * 300;
        const ents = [];
        const lvl = g.river + g.loop * 3;
        let y = g.L - 320, gateN = 0, letterI = 0;
        while (y > 260) {
          const [l, r] = banks(y);
          const k = rnd();
          if (gateN === 0 || rnd() < 0.4) {
            // gate: two buoys
            const gap = Math.max(36, 56 - lvl * 3), cx = l + gap / 2 + 14 + rnd() * (r - l - gap - 28);
            ents.push({ t: 'gate', x: cx, y, gap, n: gateN++ });
            if (letterI < 6 && rnd() < 0.5) ents.push({ t: 'letter', x: cx, y: y - 4, ch: LETTERS[letterI++], i: letterI - 1 });
            y -= 70 + rnd() * 50;
            continue;
          }
          if (k < 0.16) ents.push({ t: 'branch', x: rnd() < 0.5 ? l : r, side: 0, y, len: 30 + rnd() * 26 });
          else if (k < 0.28) ents.push({ t: 'log', x: l + 20 + rnd() * (r - l - 40), y, vx: (rnd() - 0.5) * 0.4 });
          else if (k < 0.38 + lvl * 0.02) ents.push({ t: 'gator', x: l + 20 + rnd() * (r - l - 40), y, vx: 0, vy: 0, st: 0, t0: 0 });
          else if (k < 0.48 + lvl * 0.02) ents.push({ t: 'fisher', side: rnd() < 0.5 ? -1 : 1, y, cd: 60, hook: null, hp: 1 });
          else if (k < 0.56) ents.push({ t: 'rock', x: l + 20 + rnd() * (r - l - 40), y });
          else if (k < 0.66) ents.push({ t: 'cans', x: l + 16 + rnd() * (r - l - 32), y });
          else if (k < 0.72) ents.push({ t: 'whirl', x: l + 30 + rnd() * (r - l - 60), y });
          else if (k < 0.78 + lvl * 0.02) ents.push({ t: 'punk', side: rnd() < 0.5 ? -1 : 1, y, cd: 80, hp: 1 });
          else if (k < 0.83) ents.push({ t: 'chest', x: l + 16 + rnd() * (r - l - 32), y });
          y -= 40 + rnd() * (70 - Math.min(30, lvl * 5));
        }
        for (const e of ents) if (e.side !== undefined && (e.t === 'fisher' || e.t === 'punk')) { const [l, r] = banks(e.y); e.x = e.side < 0 ? l - 12 : r + 12; }
        for (const e of ents) if (e.t === 'branch') { const [l, r] = banks(e.y); e.side = Math.abs(e.x - l) < 1 ? -1 : 1; }
        g.ents = ents;
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, river: 0, loop: 0, nextLife: 50000 };
        startRiver();
      }
      function startRiver() {
        buildRiver();
        const [l, r] = banks(g.L - 60);
        g.p = { x: (l + r) / 2, y: g.L - 60, vx: 0, vy: 0, a: 0, va: 0, armL: 0, armR: 0, spin: 0, inv: 60, popT: 0 };
        g.cans = 6; g.combo = 0; g.letters = [false, false, false, false, false, false]; g.throws = []; g.shots = []; g.fx = []; g.pops = [];
        g.gates = 0; g.phase = 'intro'; g.phaseT = 120; g.camY = g.p.y - 170; g.current = 0.55 + g.river * 0.05 + g.loop * 0.1;
        snd.theme();
      }
      function addScore(n, x, y) {
        g.score += n;
        if (x != null) g.pops.push({ x, y, s: String(n), t: 45 });
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 50000; au.melody([[1047, .08], [1319, .08], [1568, .2]], { type: 'square', vol: 0.1 }); }
      }
      function pop(why) {
        const p = g.p;
        if (p.popT || p.inv > 0 || g.phase !== 'river') return;
        p.popT = 1; p.why = why; snd.pop();
        g.combo = 0;
      }
      function updPlayer() {
        const p = g.p;
        if (p.popT) {
          p.popT++;
          p.y -= g.current * 0.5;
          if (p.popT > 110) {
            g.lives--;
            if (g.lives <= 0) { lastLife(); return; }
            respawn();
          }
          return;
        }
        if (p.inv > 0) p.inv--;
        const U = api.key('ArrowUp'), D = api.key('ArrowDown'), Lk = api.key('ArrowLeft'), Rk = api.key('ArrowRight');
        // arms: Up strokes both, Left strokes the right arm (turn left), Right strokes the left arm (turn right)
        const strokeL = U || Rk, strokeR = U || Lk;
        if (strokeL) p.armL += 0.25; if (strokeR) p.armR += 0.25;
        if (D) { p.armL -= 0.25; p.armR -= 0.25; }
        let thrust = 0;
        if (U) thrust += 0.07;
        if (D) thrust -= 0.05;
        if (Lk && !U) { p.va -= 0.006; thrust += 0.02; }
        if (Rk && !U) { p.va += 0.006; thrust += 0.02; }
        if (U && Lk) p.va -= 0.004; if (U && Rk) p.va += 0.004;
        if ((U || Lk || Rk || D) && frame % 16 === 0) snd.paddle();
        p.va *= 0.9; p.a += p.va + p.spin; p.spin *= 0.92;
        p.vx += Math.sin(p.a) * thrust; p.vy -= Math.cos(p.a) * thrust;
        p.vx *= 0.96; p.vy *= 0.96;
        const sp = Math.hypot(p.vx, p.vy); if (sp > 2.2) { p.vx *= 2.2 / sp; p.vy *= 2.2 / sp; }
        p.x += p.vx; p.y += p.vy - g.current;
        // banks
        const [l, r] = banks(p.y);
        if (p.x < l + 9) { p.x = l + 9; if (p.vx < -0.4) { snd.bump(); p.spin += 0.006; } p.vx = Math.abs(p.vx) * 0.4; }
        if (p.x > r - 9) { p.x = r - 9; if (p.vx > 0.4) { snd.bump(); p.spin -= 0.006; } p.vx = -Math.abs(p.vx) * 0.4; }
        // keep on screen vertically: the camera follows, but you cannot float back off the bottom
        if (p.y > g.camY + H - 14) { p.y = g.camY + H - 14; p.vy = Math.min(p.vy, 0); }
        // throw
        if (api.pressed('Space') && g.cans > 0 && g.throws.length < 2) {
          g.cans--; snd.can();
          g.throws.push({ x: p.x + Math.sin(p.a) * 8, y: p.y - Math.cos(p.a) * 8, vx: Math.sin(p.a) * 3.2 + p.vx, vy: -Math.cos(p.a) * 3.2 + p.vy - g.current, t: 0 });
        }
      }
      function respawn() {
        const p = g.p;
        const [l, r] = banks(p.y);
        Object.assign(p, { x: (l + r) / 2, vx: 0, vy: 0, a: 0, va: 0, spin: 0, popT: 0, inv: 150 });
        g.cans = Math.max(g.cans, 3);
        for (const e of g.ents) if (Math.abs(e.y - p.y) < 90 && (e.t === 'gator' || e.t === 'log')) e.dead = true;
        g.shots = [];
      }
      function updEnts() {
        const p = g.p, alive = !p.popT && g.phase === 'river';
        for (const e of g.ents) {
          if (e.dead) continue;
          const dy = e.y - p.y;
          if (dy < -260 || dy > 200) { if (dy > 260 && e.t !== 'gate') e.dead = true; continue; }
          e.t0 = (e.t0 || 0) + 1;
          switch (e.t) {
            case 'gate': {
              if (!e.passed && !e.missed && p.y < e.y && alive) {
                if (Math.abs(p.x - e.x) < e.gap / 2) { e.passed = true; g.combo = Math.min(10, g.combo + 1); g.gates++; addScore(500 * g.combo, e.x, e.y - 10); snd.gate(g.combo); }
                else { e.missed = true; g.combo = 0; }
              }
              // buoys bump
              for (const bx of [e.x - e.gap / 2, e.x + e.gap / 2]) {
                const ddx = p.x - bx, ddy = p.y - e.y, d = Math.hypot(ddx, ddy);
                if (d < 11 && d > 0.01) { p.x = bx + ddx / d * 11; p.y = e.y + ddy / d * 11; p.vx += ddx / d * 0.6; p.vy += ddy / d * 0.6; if (frame % 10 === 0) snd.bump(); }
              }
              break;
            }
            case 'letter': if (alive && Math.hypot(p.x - e.x, p.y - e.y) < 12) { e.dead = true; g.letters[e.i] = true; addScore(1000, e.x, e.y); snd.letter(); if (g.letters.every(Boolean)) { addScore(10000, p.x, p.y - 20); g.letters = g.letters.map(() => false); g.lives++; } } break;
            case 'cans': e.y -= g.current * 0.3; if (alive && Math.hypot(p.x - e.x, p.y - e.y) < 12) { e.dead = true; g.cans = Math.min(12, g.cans + 6); addScore(100, e.x, e.y); snd.pick(); } break;
            case 'chest': if (alive && Math.hypot(p.x - e.x, p.y - e.y) < 12) { e.dead = true; addScore(2000, e.x, e.y); snd.letter(); } break;
            case 'branch': {
              const x0 = e.side < 0 ? banks(e.y)[0] - 4 : banks(e.y)[1] - e.len, x1 = x0 + e.len + 4;
              if (alive && p.x > x0 - 6 && p.x < x1 + 6 && Math.abs(p.y - e.y) < 7) pop('branch');
              break;
            }
            case 'log': {
              e.y -= g.current * 0.4; e.x += e.vx;
              const [l, r] = banks(e.y); if (e.x < l + 22 || e.x > r - 22) e.vx = -e.vx;
              if (alive && Math.abs(p.x - e.x) < 24 && Math.abs(p.y - e.y) < 7) pop('log');
              break;
            }
            case 'rock': {
              const ddx = p.x - e.x, ddy = p.y - e.y, d = Math.hypot(ddx, ddy);
              if (d < 15 && d > 0.01) { p.x = e.x + ddx / d * 15; p.y = e.y + ddy / d * 15; p.vx = ddx / d * 0.8; p.vy = ddy / d * 0.8; p.spin += (ddx > 0 ? 0.01 : -0.01); if (frame % 8 === 0) snd.bump(); }
              break;
            }
            case 'whirl': {
              const ddx = p.x - e.x, ddy = p.y - e.y, d = Math.hypot(ddx, ddy);
              if (d < 30) { p.spin += 0.0025; p.vx += (-ddy / (d || 1)) * 0.08 - ddx * 0.002; p.vy += (ddx / (d || 1)) * 0.08 - ddy * 0.002; }
              break;
            }
            case 'gator': {
              if (e.st === 2) { e.stun--; if (e.stun <= 0) e.st = 0; break; }
              const d = Math.hypot(p.x - e.x, p.y - e.y);
              if (alive && d < 120) { e.st = 1; const sp = 0.7 + g.river * 0.08; e.vx += (p.x - e.x) / d * 0.05; e.vy += (p.y - e.y) / d * 0.05; const s = Math.hypot(e.vx, e.vy); if (s > sp) { e.vx *= sp / s; e.vy *= sp / s; } }
              else { e.vx *= 0.95; e.vy *= 0.95; }
              e.x += e.vx; e.y += e.vy - g.current * 0.3;
              const [l, r] = banks(e.y); e.x = Math.max(l + 8, Math.min(r - 8, e.x));
              if (alive && d < 12) { pop('gator'); snd.chomp(); }
              break;
            }
            case 'fisher': case 'punk': {
              if (e.hp <= 0) break;
              if (alive && Math.abs(dy) < 110 && --e.cd <= 0) {
                e.cd = e.t === 'fisher' ? 150 : 110;
                if (e.t === 'fisher') e.hook = { x: e.x, y: e.y, tx: p.x, ty: p.y - 30, t: 0 };
                else { const ddx = p.x - e.x, ddy = (p.y - 20) - e.y, d = Math.hypot(ddx, ddy) || 1; g.shots.push({ x: e.x, y: e.y, vx: ddx / d * 2, vy: ddy / d * 2, t: 0 }); snd.splash(); }
              }
              if (e.hook) {
                const h = e.hook; h.t++;
                const k = Math.min(1, h.t / 50);
                h.x = e.x + (h.tx - e.x) * k; h.y = e.y + (h.ty - e.y) * k - Math.sin(k * Math.PI) * 20;
                if (k >= 1) { h.ty -= g.current; if (alive && Math.hypot(p.x - h.x, p.y - h.y) < 10) { pop('hook'); } if (h.t > 140) e.hook = null; }
              }
              break;
            }
          }
        }
        // cans in flight
        for (const c of g.throws) {
          c.x += c.vx; c.y += c.vy; c.t++;
          if (c.t > 45) { c.dead = true; g.fx.push({ x: c.x, y: c.y, t: 0, splash: true }); continue; }
          for (const e of g.ents) {
            if (e.dead) continue;
            if ((e.t === 'gator' && e.st !== 2 && Math.hypot(c.x - e.x, c.y - e.y) < 12) ) { c.dead = true; e.st = 2; e.stun = 240; e.vx = 0; e.vy = 0; addScore(500, e.x, e.y); snd.clink(); break; }
            if ((e.t === 'fisher' || e.t === 'punk') && e.hp > 0 && Math.hypot(c.x - e.x, c.y - e.y) < 14) { c.dead = true; e.hp = 0; e.hook = null; addScore(e.t === 'fisher' ? 750 : 500, e.x, e.y); snd.clink(); break; }
            if (e.t === 'log' && Math.abs(c.x - e.x) < 24 && Math.abs(c.y - e.y) < 6) { c.dead = true; snd.clink(); break; }
          }
        }
        g.throws = g.throws.filter(c => !c.dead);
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy; s.t++;
          if (s.t > 120) s.dead = true;
          if (alive && Math.hypot(p.x - s.x, p.y - s.y) < 9) { s.dead = true; pop('rock'); }
        }
        g.shots = g.shots.filter(s => !s.dead);
        g.ents = g.ents.filter(e => !e.dead);
        for (const f of g.fx) f.t++; g.fx = g.fx.filter(f => f.t < 20);
        for (const q of g.pops) { q.t--; q.y -= 0.5; } g.pops = g.pops.filter(q => q.t > 0);
      }
      function updPlay() {
        const p = g.p;
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'river'; g.camY += (p.y - 170 - g.camY) * 0.1; return; }
        if (g.phase === 'end') {
          p.y -= 0.8; g.phaseT--;
          if (g.phaseT === 150) { g.bonus = g.gates * 250 + g.cans * 100; addScore(g.bonus); }
          if (g.phaseT <= 0) { g.river++; if (g.river >= RIVERS.length) { g.river = 0; g.loop++; } startRiver(); }
          return;
        }
        if (g.phase === 'wait') return;
        updPlayer();
        if (mode !== 'play' || g.phase !== 'river') return;
        updEnts();
        g.camY = Math.min(g.camY, g.camY + (p.y - 170 - g.camY) * 0.15); // the river only scrolls forward
        if (p.y < 140 && !p.popT) { g.phase = 'end'; g.phaseT = 200; snd.end(); }
      }
      function lastLife() {
        g.phase = 'wait';
        const cg = g;
        const end = () => { if (g === cg) gameOver(); };
        if (!api.offerContinue) { end(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 3; g.phase = 'river'; respawn(); } }, end);
      }
      function gameOver() {
        api.setHiScore(g.score); hi = Math.max(hi, g.score);
        mode = 'over'; g.overT = 0;
        au.melody([[392, .2], [349, .2], [330, .2], [262, .6]], { type: 'square', vol: 0.09 });
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { newGame(); mode = 'play'; }
          return;
        }
        if (mode === 'play') { updPlay(); return; }
        if (mode === 'over') { if (++g.overT > 300 || (g.overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; } }
      }

      // ---------- drawing ----------
      function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
      function drawRiver(ctx, camY, riv) {
        R(ctx, 0, 0, W, H, riv.water);
        // banks row by row (4px strips)
        for (let sy = 0; sy < H; sy += 4) {
          const wy = sy + camY, [l, r] = banks(wy);
          R(ctx, 0, sy, l, 4, riv.bank);
          R(ctx, r, sy, W - r, 4, riv.bank);
          R(ctx, l - 3, sy, 3, 4, riv.bank2); R(ctx, r, sy, 3, 4, riv.bank2);
          // grass beyond the sand
          R(ctx, 0, sy, Math.max(0, l - 28), 4, riv.grass); R(ctx, r + 28, sy, W, 4, riv.grass);
          // deep channel in the middle
          const c = (l + r) / 2;
          R(ctx, c - (r - l) * 0.22, sy, (r - l) * 0.44, 4, riv.deep);
          // ripples flowing up with the current
          const ry = Math.floor(wy + frame * g.current * 0.6);
          if ((ry & 31) === 0) { const rx = l + 10 + ((ry * 37) % Math.max(10, (r - l - 30))); R(ctx, rx, sy, 8, 1, '#ffffff60'); }
          // foam along the banks
          if (((wy >> 2) + (frame >> 3)) % 3 === 0) { R(ctx, l, sy, 3, 2, '#ffffff80'); R(ctx, r - 3, sy + 2, 3, 2, '#ffffff80'); }
          // trees / snow mounds on the banks
          const ti = Math.floor(wy / 36);
          if (Math.floor((sy + camY) % 36) < 4) {
            const tx = ((ti * 53) % 24) + 2, tr = W - 4 - ((ti * 29) % 24);
            drawTree(ctx, Math.min(tx, l - 30), sy, riv); drawTree(ctx, Math.max(tr, r + 30), sy, riv);
          }
        }
      }
      function drawTree(ctx, x, y, riv) {
        if (x < -6 || x > W) return;
        if (riv.snow) { R(ctx, x - 6, y - 4, 12, 6, '#ffffff'); R(ctx, x - 3, y - 7, 6, 3, '#ffffff'); return; }
        if (riv.name === 'STYX') { R(ctx, x, y - 10, 2, 12, '#202020'); R(ctx, x - 4, y - 8, 4, 1, '#202020'); R(ctx, x + 2, y - 6, 4, 1, '#202020'); return; }
        R(ctx, x - 1, y - 2, 3, 6, '#5a3a18'); R(ctx, x - 6, y - 12, 13, 10, '#2a6a1a'); R(ctx, x - 4, y - 15, 9, 4, '#3a8a2a'); R(ctx, x - 3, y - 11, 3, 3, '#4aa03a');
      }
      function drawTube(ctx, p, sx, sy) {
        const a = p.a;
        // ring
        ctx.fillStyle = '#202020'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#505050'; ctx.beginPath(); ctx.arc(sx - 1, sy - 1, 7.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a6ac0'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
        // body sitting in the tube, facing angle a
        const fx = Math.sin(a), fy = -Math.cos(a), rx = Math.cos(a), ry = Math.sin(a);
        const pt = (f, r) => [sx + fx * f + rx * r, sy + fy * f + ry * r];
        // legs dangle forward
        for (const s of [-2, 2]) { const q = pt(9 + (frame >> 3 & 1), s); R(ctx, q[0] - 1, q[1] - 1, 2, 2, '#f0b080'); }
        // arms paddling
        for (const [s, ph] of [[-1, p.armL], [1, p.armR]]) {
          const sw = Math.sin(ph) * 4;
          const q = pt(sw, s * 9);
          R(ctx, q[0] - 1.5, q[1] - 1.5, 3, 3, '#f0b080');
          const q2 = pt(sw * 0.5, s * 5); R(ctx, q2[0] - 1, q2[1] - 1, 2, 2, '#f0b080');
        }
        // torso + head
        const b = pt(-1, 0); R(ctx, b[0] - 3, b[1] - 3, 6, 6, '#e83020');
        const h = pt(1.5, 0); R(ctx, h[0] - 2, h[1] - 2, 4, 4, '#f0b080');
        const hair = pt(0, 0); R(ctx, hair[0] - 2, hair[1] - 2, 4, 2, '#f0d040');
        const sh = pt(3, 0); R(ctx, sh[0] - 1, sh[1] - 1, 2, 2, '#202020');
      }
      function drawEnt(ctx, e, cy) {
        const x = e.x, y = e.y - cy;
        if (y < -40 || y > H + 40) return;
        switch (e.t) {
          case 'gate':
            for (const bx of [x - e.gap / 2, x + e.gap / 2]) {
              const bob = Math.sin(frame * 0.1 + bx) * 1;
              R(ctx, bx - 5, y - 5 + bob, 10, 10, '#e83020'); R(ctx, bx - 4, y - 7 + bob, 8, 3, '#ff6040'); R(ctx, bx - 5, y - 1 + bob, 10, 2, '#ffffff');
            }
            if (!e.passed && !e.missed) { for (let k = x - e.gap / 2 + 6; k < x + e.gap / 2 - 6; k += 6) R(ctx, k, y, 3, 1, '#ffffff80'); }
            if (e.passed) text(ctx, 'OK', x, y - 3, '#ffff60', 1, 'center');
            break;
          case 'letter': {
            const bob = Math.sin(frame * 0.12 + e.i) * 2;
            ctx.fillStyle = '#ffffffc0'; ctx.beginPath(); ctx.arc(x, y + bob, 7, 0, Math.PI * 2); ctx.fill();
            text(ctx, e.ch, x - 2, y - 3 + bob, '#e83020', 1); break;
          }
          case 'cans': for (let k = 0; k < 3; k++) { R(ctx, x - 6 + k * 4, y - 4, 3, 6, '#d0d0d0'); R(ctx, x - 6 + k * 4, y - 2, 3, 2, '#e02020'); } R(ctx, x - 6, y - 5, 11, 1, '#f0f0a0'); break;
          case 'chest': R(ctx, x - 6, y - 4, 12, 8, '#8a5020'); R(ctx, x - 6, y - 4, 12, 2, '#a86830'); R(ctx, x - 1, y - 2, 2, 3, '#f0d040'); if ((frame >> 3) & 1) R(ctx, x + 4, y - 6, 1, 1, '#fff'); break;
          case 'branch': {
            const [l, r] = banks(e.y), x0 = e.side < 0 ? l - 6 : r - e.len, len = e.len + 6;
            R(ctx, x0, y - 2, len, 4, '#6a4420'); R(ctx, x0, y - 2, len, 1, '#8a6038');
            for (let k = 4; k < len - 2; k += 7) { R(ctx, x0 + k, y - 5, 1, 3, '#6a4420'); R(ctx, x0 + k + 2, y + 2, 1, 3, '#6a4420'); R(ctx, x0 + k - 1, y - 6, 3, 2, '#3a8a2a'); }
            break;
          }
          case 'log': R(ctx, x - 24, y - 4, 48, 8, RIVERS[g.river].snow ? '#e8f0ff' : '#7a4a20'); R(ctx, x - 24, y - 4, 48, 2, RIVERS[g.river].snow ? '#ffffff' : '#9a6a38'); if (!RIVERS[g.river].snow) { R(ctx, x - 24, y - 3, 3, 6, '#c09060'); R(ctx, x + 21, y - 3, 3, 6, '#c09060'); } break;
          case 'rock': R(ctx, x - 9, y - 6, 18, 12, '#707078'); R(ctx, x - 7, y - 8, 12, 4, '#9090a0'); R(ctx, x - 10, y + 4, 20, 2, '#ffffff80'); break;
          case 'whirl': for (let k = 0; k < 10; k++) { const a = frame * 0.12 + k * 0.63, r = 6 + k * 2.2; R(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 3, 1, '#ffffffa0'); } break;
          case 'gator': {
            if (e.st === 2) { R(ctx, x - 8, y - 2, 16, 4, '#3a6a2a'); text(ctx, '*', x - 2, y - 10, '#ffff60'); break; }
            const dx = e.vx, dy = e.vy, l = Math.hypot(dx, dy) || 1, ux = dx / l || 0, uy = dy / l || 1;
            for (let k = -3; k <= 3; k++) R(ctx, x + ux * k * 3 - 2, y + uy * k * 3 - 2, 5, 5, k === 3 ? '#4a8a3a' : '#3a7a2a');
            const hx = x + ux * 12, hy = y + uy * 12, open = (frame >> 3) & 1;
            R(ctx, hx - 3, hy - 3, 6, 6, '#4a8a3a'); if (open && e.st === 1) R(ctx, hx - 2, hy - 2, 4, 4, '#c02020');
            R(ctx, x - uy * 4 + ux * 8 - 1, y + ux * 4 + uy * 8 - 1, 2, 2, '#ffff60'); R(ctx, x + uy * 4 + ux * 8 - 1, y - ux * 4 + uy * 8 - 1, 2, 2, '#ffff60');
            R(ctx, x - ux * 13 - 1, y - uy * 13 - 1, 3, 3, '#3a7a2a');
            break;
          }
          case 'fisher': case 'punk': {
            if (e.hp <= 0) { R(ctx, x - 6, y - 2, 12, 4, e.t === 'fisher' ? '#3060a0' : '#a03080'); text(ctx, '*', x - 2, y - 10, '#ffff60'); break; }
            const col = e.t === 'fisher' ? '#3060a0' : '#a03080';
            R(ctx, x - 3, y - 6, 6, 8, col); R(ctx, x - 2, y - 10, 4, 4, '#f0b080'); R(ctx, x - 3, y - 11, 6, 2, e.t === 'fisher' ? '#a08040' : '#20d020');
            R(ctx, x - 3, y + 2, 2, 3, '#303030'); R(ctx, x + 1, y + 2, 2, 3, '#303030');
            if (e.t === 'fisher') { R(ctx, x + e.side * -1 * 3, y - 14, 1, 10, '#a08040'); }
            if (e.hook) { ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - e.side * 3, y - 14); ctx.lineTo(e.hook.x, e.hook.y - cy); ctx.stroke(); R(ctx, e.hook.x - 1, e.hook.y - cy - 1, 3, 3, '#c0c0c0'); }
            break;
          }
        }
      }
      function drawHud(ctx) {
        R(ctx, 0, 0, W, 20, 'rgba(0,0,0,.6)');
        text(ctx, String(g.score), 4, 2, '#ffffff', 1);
        text(ctx, 'HI ' + Math.max(hi, g.score), 4, 11, '#a0a0c0', 1);
        text(ctx, RIVERS[g.river].name, W / 2, 2, '#ffe040', 1, 'center');
        for (let i = 0; i < 6; i++) text(ctx, LETTERS[i], W / 2 - 17 + i * 6, 11, g.letters[i] ? '#ffe040' : '#405070', 1);
        // cans and tubes
        for (let i = 0; i < Math.min(12, g.cans); i++) { R(ctx, W - 6 - i * 4, 3, 3, 6, '#d0d0d0'); R(ctx, W - 6 - i * 4, 5, 3, 2, '#e02020'); }
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) { ctx.fillStyle = '#202020'; ctx.beginPath(); ctx.arc(W - 8 - i * 11, 15, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3a6ac0'; ctx.fillRect(W - 9 - i * 11, 14, 2, 2); }
        if (g.combo > 1) text(ctx, 'GATE X' + g.combo, 4, 24, '#ffff60', 1);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') {
          if (!g) { g = { river: 0, loop: 0, current: 0.4 }; buildRiver(); g.p = null; }
          g.current = 0.4;
          const cy = 3000 - titleT * 0.6;
          drawRiver(ctx, cy, RIVERS[(titleT / 600 | 0) % RIVERS.length]);
          drawTube(ctx, { a: Math.sin(frame * 0.03) * 0.5, armL: frame * 0.2, armR: frame * 0.2 + 1 }, W / 2 + Math.sin(frame * 0.02) * 20, 170);
          R(ctx, 20, 26, W - 40, 60, 'rgba(0,0,0,.45)');
          const t = "TOOBIN'";
          for (let i = 0; i < t.length; i++) { const yy = 34 + Math.round(Math.sin(frame * 0.1 + i) * 3); text(ctx, t[i], 46 + i * 24 + 2, yy + 2, '#102850', 4); text(ctx, t[i], 46 + i * 24, yy, i % 2 ? '#ffe040' : '#ff8030', 4); }
          text(ctx, 'BIF AND JET GO TUBING', W / 2, 72, '#ffffff', 1, 'center');
          R(ctx, 0, 190, W, 50, 'rgba(0,0,0,.55)');
          const page = (titleT / 360 | 0) % 2;
          if (page === 0) { text(ctx, 'GATES 500 X COMBO   CANS STUN', W / 2, 96, '#ffffff', 1, 'center'); text(ctx, 'SPELL T-O-O-B-I-N FOR A BONUS', W / 2, 106, '#ffe040', 1, 'center'); }
          else { text(ctx, 'HIGH SCORE ' + hi, W / 2, 96, '#ffe040', 1, 'center'); }
          const blink = (frame >> 4) & 1;
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 198, '#ffffff', 1, 'center'); }
          else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 198, '#ffffff', 1, 'center'); }
          else text(ctx, 'PUSH START', W / 2, 198, blink ? '#ffffff' : '#888888', 1, 'center');
          text(ctx, credStr(), 4, 230, '#888888', 1);
          text(ctx, '\u00a9 1988 ATARI GAMES', W - 4, 230, '#888888', 1, 'right');
          return;
        }
        const cy = g.camY, riv = RIVERS[g.river];
        drawRiver(ctx, cy, riv);
        // finish line
        if (140 - cy > -10 && 140 - cy < H) { for (let x = 0; x < W; x += 8) R(ctx, x, 120 - cy, 8, 4, (x >> 3) & 1 ? '#fff' : '#000'); text(ctx, 'END OF RIVER', W / 2, 108 - cy, '#ffffff', 1, 'center'); }
        for (const e of g.ents) if (e.t === 'whirl' || e.t === 'gate') drawEnt(ctx, e, cy);
        for (const e of g.ents) if (e.t !== 'whirl' && e.t !== 'gate') drawEnt(ctx, e, cy);
        const p = g.p;
        if (p.popT) {
          const k = p.popT;
          if (k < 20) { for (let i = 0; i < 8; i++) { const a = i * 0.785; R(ctx, p.x + Math.cos(a) * k, p.y - cy + Math.sin(a) * k, 3, 2, '#303030'); } }
          // swimming
          const sx = p.x, sy = p.y - cy;
          R(ctx, sx - 3, sy - 3, 6, 6, '#f0b080'); R(ctx, sx - 2, sy - 4, 4, 2, '#f0d040');
          const s = (k >> 3) & 1; R(ctx, sx - 7, sy - 1 + s * 2, 4, 2, '#f0b080'); R(ctx, sx + 3, sy + 1 - s * 2, 4, 2, '#f0b080');
          if ((k >> 2) & 1) R(ctx, sx - 8, sy + 4, 16, 1, '#ffffffa0');
          if (k > 20) text(ctx, p.why === 'gator' ? 'CHOMP!' : 'POP!', sx, sy - 18, '#ffffff', 1, 'center');
        } else if (!(p.inv > 0 && (frame & 4))) drawTube(ctx, p, p.x, p.y - cy);
        for (const c of g.throws) { R(ctx, c.x - 1, c.y - cy - 2, 3, 5, '#d0d0d0'); R(ctx, c.x - 1, c.y - cy - 1, 3, 2, (frame & 2) ? '#e02020' : '#ffffff'); }
        for (const s of g.shots) R(ctx, s.x - 2, s.y - cy - 2, 4, 4, '#909090');
        for (const f of g.fx) { const r = f.t * 0.5; R(ctx, f.x - r, f.y - cy - 1, r * 2 + 1, 1, '#ffffffa0'); }
        for (const q of g.pops) text(ctx, q.s, q.x, q.y - cy, '#ffffff', 1, 'center');
        drawHud(ctx);
        if (g.phase === 'intro') {
          R(ctx, 30, 70, W - 60, 40, 'rgba(0,0,0,.6)');
          text(ctx, RIVERS[g.river].name, W / 2, 76, '#ffe040', 2, 'center');
          text(ctx, g.loop ? 'ROUND ' + (g.loop + 1) : 'RIDE THE RIVER TO THE END', W / 2, 98, '#ffffff', 1, 'center');
        }
        if (g.phase === 'end') {
          R(ctx, 30, 70, W - 60, 50, 'rgba(0,0,0,.6)');
          text(ctx, 'RIVER COMPLETE', W / 2, 76, '#ffe040', 2, 'center');
          text(ctx, 'GATES ' + g.gates + '  BONUS ' + (g.bonus || 0), W / 2, 100, '#ffffff', 1, 'center');
        }
        if (mode === 'over') {
          R(ctx, 40, 80, 176, 50, 'rgba(0,0,0,.75)');
          text(ctx, 'GAME OVER', W / 2, 90, '#ff4040', 2, 'center');
          text(ctx, 'SCORE ' + g.score, W / 2, 112, '#ffffff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
