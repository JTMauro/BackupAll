// Moon Patrol (Irem, 1982) \u2014 written from scratch for the MAME32 Game Room.
// Drive the moon buggy across the lunar surface: jump craters and rocks, shoot ahead and overhead.
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
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function makeSpr(rows, pal) {
    const runs = []; let w = 0;
    rows.forEach((r, y) => {
      w = Math.max(w, r.length);
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (!pal[ch]) { x++; continue; }
        let e = x + 1; while (e < r.length && r[e] === ch) e++;
        runs.push({ x, y, n: e - x, c: pal[ch], k: ch }); x = e;
      }
    });
    return { w, h: rows.length, runs };
  }
  function drawSpr(ctx, s, cx, cy, o) {
    o = o || {};
    const x0 = Math.round(cx - s.w / 2), y0 = Math.round(cy - s.h / 2);
    for (const r of s.runs) {
      ctx.fillStyle = o.col || (o.pal && o.pal[r.k]) || r.c;
      const xx = o.flip ? s.w - r.x - r.n : r.x;
      ctx.fillRect(x0 + xx, y0 + r.y, r.n, 1);
    }
  }


  const W = 256, H = 224, GY = 198, SEG = 560;
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const MAJOR = { 4: 1, 9: 1, 14: 1, 19: 1, 25: 1 };
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0;
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216; }

  const BODY = makeSpr([
    '............CC..........',
    '...........CCCC....W....',
    '..PPPPPPPPPPPPPPPPPP....',
    '.PPPPPPPPPPPPPPPPPPPPPP.',
    'PPPPWWPPPPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPPPPPPPPP.',
    '.MMMMMMMMMMMMMMMMMMMMM..'], { C: '#40e0ff', W: '#ffffff', P: '#e050ff', M: '#9020c0' });
  const WHEEL = [makeSpr(['.GGGG.', 'GG..GG', 'G.GG.G', 'G.GG.G', 'GG..GG', '.GGGG.'], { G: '#ffd040' }),
    makeSpr(['.GGGG.', 'G.GG.G', 'GG..GG', 'GG..GG', 'G.GG.G', '.GGGG.'], { G: '#ffd040' })];
  const UFO = [
    makeSpr(['....WWWW....', '..WCCCCCCW..', 'WWWWWWWWWWWW', '.W.W.WW.W.W.', '...W....W...'], { W: '#ffffff', C: '#40c0ff' }),
    makeSpr(['..G......G..', '...GGGGGG...', '.GGYGGGGYGG.', 'GGGGGGGGGGGG', 'G.G.GGGG.G.G', '...G....G...'], { G: '#30ff60', Y: '#ffff40' }),
    makeSpr(['.....RR.....', '...RRRRRR...', 'RRRRWWWWRRRR', '...RRRRRR...', '.....RR.....'], { R: '#ff3040', W: '#ffffff' })
  ];
  const ROCKS = [
    makeSpr(['...BBBB...', '..BBBBBB..', '.BBLBBBBB.', 'BBLLBBBBBB', 'BBBBBBBDBB', 'BBBBBBDDBB', 'BBBBBBBBBB', 'BBBBBBBBBB'],
      { B: '#a07050', L: '#d0a080', D: '#604030' }),
    makeSpr(['.....BBBBB......', '...BBBBBBBBB....', '..BBLLBBBBBBB...', '.BBLLBBBBBBBBB..', '.BBBBBBBBBBBBBB.', 'BBBBBBBBBBBDBBBB',
      'BBBBBBBBBBDDBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBDBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB', 'BBBBBBBBBBBBBBBB'],
      { B: '#a07050', L: '#d0a080', D: '#604030' })
  ];
  const TANK = makeSpr(['.....TT.......', '....TTTTTTTTT.', '..TTTTTTT.....', 'TTTTTTTTTTTTTT', 'T.OO.OO.OO.OOT', '.OOOOOOOOOOOO.'], { T: '#40d040', O: '#808080' });
  const MINE = makeSpr(['..RRRR..', '.RYRRYR.', 'RRRRRRRR'], { R: '#ff3030', Y: '#ffff40' });

  ArcadeRegistry.register({
    id: 'moonpatrol', title: 'Moon Patrol', year: 1982, maker: 'Irem',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: speed \u00b7 Up or X: jump \u00b7 Space: fire (ahead + up) \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#e050ff', accent: '#ffd040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;
      const stars = [];
      for (let i = 0; i < 60; i++) stars.push({ x: rnd(W), y: 36 + rnd(110), c: ['#ffffff', '#8080ff', '#ffff80', '#ff8080'][i & 3] });

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');

      const snd = {
        fire() { au.tone(1500, 0.07, { type: 'square', vol: 0.05, slideTo: 600 }); au.tone(900, 0.08, { type: 'square', vol: 0.04, slideTo: 2000 }); },
        jump() { au.tone(200, 0.25, { type: 'triangle', vol: 0.1, slideTo: 600 }); },
        land() { au.noise(0.08, { vol: 0.08, freq: 400 }); },
        boom() { au.noise(0.25, { vol: 0.14, freq: 2200, slideTo: 150 }); },
        rock() { au.noise(0.18, { vol: 0.12, freq: 1200, slideTo: 200 }); au.tone(180, 0.1, { type: 'square', vol: 0.05, slideTo: 80 }); },
        bomb() { au.tone(1600, 0.7, { type: 'sine', vol: 0.05, slideTo: 300 }); },
        ufo() { au.tone(700, 0.1, { type: 'square', vol: 0.04, slideTo: 1100 }); },
        die() { au.noise(1.0, { vol: 0.2, freq: 3000, slideTo: 60 }); au.tone(400, 0.9, { type: 'sawtooth', vol: 0.1, slideTo: 40 }); },
        point() { au.melody([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.25]], { type: 'square', vol: 0.09 }); },
        life() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.2]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.12], [659, 0.12], [784, 0.36]], { type: 'square', vol: 0.09 }); }
      };
      // driving bass line (8th notes); root A1
      const BASS = [0, 0, 12, 0, 10, 0, 7, 0, 0, 0, 12, 0, 15, 12, 10, 7, 5, 5, 17, 5, 15, 5, 12, 5, 7, 7, 19, 7, 10, 12, 14, 12];
      function music() {
        if ((frame % 9) !== 0) return;
        const step = (frame / 9) % BASS.length;
        const f = 55 * Math.pow(2, BASS[step] / 12);
        au.tone(f, 0.13, { type: 'triangle', vol: 0.09 });
        if ((step & 1) === 0) au.noise(0.03, { vol: 0.02, freq: 7000, type: 'highpass' });
      }

      // ---------- course ----------
      function newGame() {
        g = { score: 0, lives: 3, lifeIdx: 0, loop: 0, phase: 'start', phaseT: 120, banner: null };
        startAt(0);
      }
      const LIFE_AT = [10000, 30000, 50000];
      function startAt(seg) {
        g.seg = seg; g.reached = seg; g.genSeg = seg; g.obs = []; g.ufos = []; g.bombs = []; g.shells = []; g.fshots = []; g.ushots = []; g.parts = []; g.pops = [];
        g.bx = 48; g.v = 1.7; g.d = seg * SEG - g.bx + 14; g.jy = 0; g.vy = 0; g.air = false; g.fireT = 0;
        g.ufoCool = 200; g.secStart = majorStart(seg); g.secT = 0; g.wreck = null;
        genAhead();
      }
      function majorStart(seg) { let s = seg; while (s > 0 && !MAJOR[s]) s--; return s; }
      function genAhead() {
        while (g.genSeg < 25 && g.genSeg * SEG < g.d + W + 200) { genSeg(g.genSeg); g.genSeg++; }
      }
      function genSeg(k) {
        const r = rng(k * 977 + g.loop * 7717 + 13);
        const diff = k + g.loop * 10;
        const start = k * SEG, end = start + SEG;
        let x = start + 120 + r() * 40;
        while (x < end - 70) {
          const roll = r();
          let o;
          if (diff >= 14 && roll < 0.12) o = { type: 'mine', x, w: 8, h: 3 };
          else if (diff >= 15 && roll < 0.2) o = { type: 'tank', x, w: 14, h: 8, fireT: 30 + ((r() * 60) | 0), hp: 1 };
          else if (diff >= 1 && roll < 0.5) {
            const big = diff >= 4 && r() < 0.45;
            o = { type: 'rock', big, x, w: big ? 16 : 10, h: big ? 12 : 8, hp: big ? 2 : 1 };
          } else {
            const big = diff >= 2 && r() < 0.4;
            o = { type: 'crater', x, w: big ? 26 : 15, h: 0 };
          }
          g.obs.push(o);
          x += o.w + 95 + r() * Math.max(40, 170 - diff * 5);
        }
      }
      function ufoKind(seg) {
        const s = seg + (g.loop ? 1 : 0);
        if (s >= 2 && s <= 8) return 0;
        if (s >= 10 && s <= 16) return 1;
        if (s >= 18 && s <= 24) return 2;
        if (g.loop && s >= 9) return s % 3;
        return -1;
      }
      function addScore(n, x, y) {
        g.score += n;
        while (g.lifeIdx < LIFE_AT.length && g.score >= LIFE_AT[g.lifeIdx]) { g.lifeIdx++; g.lives++; snd.life(); }
        if (g.score > hi) hi = g.score;
        if (x != null) g.pops.push({ x, y, txt: String(n), t: 45 });
      }
      function burst(x, y, col, n, sp) {
        for (let i = 0; i < n; i++) { const a = -rnd(Math.PI), v = 0.4 + rnd(sp || 1.8); g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 20 + irnd(20), col, world: true }); }
      }

      // ---------- play ----------
      function updPlay() {
        g.secT++;
        // speed control
        const tgt = api.key('ArrowRight') ? 2.7 : api.key('ArrowLeft') ? 1.0 : 1.7;
        g.v += Math.max(-0.03, Math.min(0.03, tgt - g.v));
        g.bx += Math.max(-0.6, Math.min(0.6, (40 + (g.v - 1) * 34) - g.bx));
        g.d += g.v;
        genAhead();
        // jump
        if (!g.air && api.anyPressed('ArrowUp', 'KeyX', 'KeyZ')) { g.air = true; g.vy = -3.3; snd.jump(); }
        if (g.air) {
          g.vy += 0.12; g.jy += g.vy;
          if (g.jy >= 0) { g.jy = 0; g.vy = 0; g.air = false; snd.land(); }
        }
        // fire: one shot ahead + one straight up
        if (g.fireT > 0) g.fireT--;
        if (api.pressed('Space') && g.fireT <= 0) {
          if (g.fshots.length < 1) g.fshots.push({ x: g.d + g.bx + 24, y: GY - 9 + g.jy, life: 32 });
          if (g.ushots.length < 3) g.ushots.push({ x: g.bx + 14, y: GY - 16 + g.jy });
          g.fireT = 8; snd.fire();
        }
        const bl = g.d + g.bx + 1, br = bl + 22, bc = bl + 11, bottom = GY + g.jy;
        // forward shots
        for (const s of g.fshots) {
          s.x += 4.2; if (--s.life <= 0) s.dead = true;
          for (const o of g.obs) {
            if (o.dead || (o.type !== 'rock' && o.type !== 'tank')) continue;
            if (s.x + 3 >= o.x && s.x <= o.x + o.w && s.y >= GY - o.h - 1) {
              s.dead = true; o.hp--;
              if (o.hp <= 0) {
                o.dead = true; burst(o.x + o.w / 2, GY - o.h / 2, o.type === 'tank' ? '#40d040' : '#d0a080', 14);
                addScore(o.type === 'tank' ? 200 : o.big ? 200 : 100, o.x + o.w / 2 - g.d, GY - 20); snd.rock();
              } else { o.big = false; o.w = 10; o.h = 8; o.x += 3; burst(o.x + 5, GY - 10, '#d0a080', 8); snd.rock(); }
              break;
            }
          }
          if (!s.dead) for (const sh of g.shells) if (!sh.dead && Math.abs(sh.x - s.x) < 5 && Math.abs(sh.y - s.y) < 5) { sh.dead = true; s.dead = true; addScore(50, sh.x - g.d, sh.y - 10); }
        }
        g.fshots = g.fshots.filter(s => !s.dead);
        // up shots
        for (const s of g.ushots) {
          s.y -= 4; if (s.y < 34) s.dead = true;
          for (const u of g.ufos) if (!u.dead && Math.abs(u.x - s.x) < 7 && Math.abs(u.y - s.y) < 5) {
            u.dead = true; s.dead = true; burst(u.x + g.d, u.y, ['#ffffff', '#30ff60', '#ff3040'][u.kind], 16, 1.5);
            addScore([100, 200, 300][u.kind], u.x, u.y - 8); snd.boom(); break;
          }
          if (!s.dead) for (const b of g.bombs) if (!b.dead && Math.abs(b.x - s.x) < 4 && Math.abs(b.y - s.y) < 5) { b.dead = true; s.dead = true; addScore(50, b.x, b.y - 8); break; }
        }
        g.ushots = g.ushots.filter(s => !s.dead);
        // obstacles vs buggy
        for (const o of g.obs) {
          if (o.dead) continue;
          if (o.type === 'crater') {
            if (!g.air && bc > o.x + 3 && bc < o.x + o.w - 3) { crash('crater', o); return; }
          } else if (br > o.x + 1 && bl < o.x + o.w - 1 && bottom > GY - o.h + 1) { crash('hit', o); return; }
          if (!o.passed && o.x + o.w < bl) { o.passed = true; if (o.type !== 'tank') addScore(50, o.x + o.w / 2 - g.d, GY - 24); }
          if (o.type === 'tank' && o.x > br + 30 && o.x < br + 180 && --o.fireT <= 0) {
            o.fireT = 90 + irnd(60);
            g.shells.push({ x: o.x - 2, y: GY - 6 }); au.tone(300, 0.1, { type: 'square', vol: 0.06, slideTo: 120 });
          }
        }
        g.obs = g.obs.filter(o => !(o.dead && o.x < g.d - 40) && o.x + o.w > g.d - 60);
        for (const sh of g.shells) {
          sh.x -= 1.5; if (sh.x < g.d - 10) sh.dead = true;
          if (!sh.dead && sh.x > bl && sh.x < br && sh.y > bottom - 12 && sh.y < bottom) { crash('hit'); return; }
        }
        g.shells = g.shells.filter(s => !s.dead);
        // UFO waves
        const kind = ufoKind(g.seg);
        if (g.ufos.length === 0) {
          if (kind >= 0 && --g.ufoCool <= 0) {
            const n = 2 + Math.min(2, (g.seg + g.loop * 8) >> 3);
            for (let i = 0; i < n; i++) g.ufos.push({ x: -20 - i * 22, y: 50 + i * 10, kind, t: 0, ph: i * 2.1, fireT: 60 + irnd(60) + i * 20, life: 1100 });
            g.ufoCool = 150; snd.ufo();
          }
        }
        for (const u of g.ufos) {
          u.t++; u.life--;
          const cx = g.bx + 12;
          let tx = cx + Math.sin(u.t * 0.025 + u.ph) * (u.kind === 2 ? 40 : 70), ty = (u.kind === 2 ? 90 : 62) + Math.sin(u.t * 0.05 + u.ph) * 22;
          if (u.life < 0) { tx = W + 60; ty = 20; }
          const k = u.kind === 2 ? 0.05 : 0.03;
          u.x += Math.max(-3, Math.min(3, (tx - u.x) * k)); u.y += (ty - u.y) * 0.04;
          if (u.life < 0 && u.x > W + 30) u.dead = true;
          if (--u.fireT <= 0 && u.life > 0) {
            u.fireT = Math.max(28, 90 - g.seg * 2 - g.loop * 15) + irnd(50);
            if (Math.abs(u.x - cx) < 60 && g.bombs.length < 6) { g.bombs.push({ x: u.x, y: u.y + 4, vy: 0.5, crater: u.kind === 1 }); snd.bomb(); }
          }
        }
        g.ufos = g.ufos.filter(u => !u.dead);
        for (const b of g.bombs) {
          b.vy = Math.min(2.6, b.vy + 0.04); b.y += b.vy; b.x -= 0.15;
          if (b.x > g.bx && b.x < g.bx + 24 && b.y > bottom - 13 && b.y < bottom) { b.dead = true; crash('hit'); return; }
          if (b.y >= GY - 1) {
            b.dead = true; burst(b.x + g.d, GY - 2, '#ffa040', 10, 1.4); au.noise(0.15, { vol: 0.1, freq: 900 });
            const wx = b.x + g.d - 7;
            if (b.crater && wx > g.d + g.bx + 30 && !g.obs.some(o => Math.abs(o.x - wx) < 30)) g.obs.push({ type: 'crater', x: wx, w: 14, h: 0, made: true });
          }
        }
        g.bombs = g.bombs.filter(b => !b.dead);
        // checkpoints
        const seg = Math.floor((g.d + g.bx + 12) / SEG);
        if (seg > g.reached) {
          g.reached = seg; g.seg = seg;
          if (MAJOR[seg]) {
            const secs = Math.round(g.secT / 60), avg = Math.round((seg - g.secStart) * SEG / 1.8 / 60);
            const bonus = Math.max(500, 1000 + (avg - secs) * 200);
            addScore(bonus); snd.point();
            g.banner = { lines: ['TIME TO REACH POINT ' + LETTERS[seg], 'YOUR TIME ' + secs + '  AVERAGE ' + avg, 'BONUS POINTS ' + bonus], t: 240 };
            g.secStart = seg; g.secT = 0;
            if (seg === 25) {
              g.banner = { lines: ['CONGRATULATIONS!', g.loop ? 'CHAMPION COURSE COMPLETE' : 'BEGINNER COURSE COMPLETE', 'BONUS POINTS ' + bonus], t: 260 };
              g.loop++; startAt(0);
            }
          } else { g.banner = { lines: ['POINT ' + LETTERS[seg]], t: 70 }; au.tone(1200, 0.1, { type: 'square', vol: 0.06 }); }
        }
      }
      function crash(how) {
        g.phase = 'dead'; g.phaseT = 130; snd.die();
        const x = g.bx;
        g.wreck = { how, pieces: [{ s: BODY, x: x + 12, y: GY - 10 + g.jy, vx: 0.6, vy: -2.2 }, { s: WHEEL[0], x: x + 4, y: GY - 3 + g.jy, vx: -1, vy: -2.6 },
          { s: WHEEL[0], x: x + 12, y: GY - 3 + g.jy, vx: 0.3, vy: -3.2 }, { s: WHEEL[0], x: x + 20, y: GY - 3 + g.jy, vx: 1.4, vy: -2.4 }] };
        burst(g.d + x + 12, GY - 6 + g.jy, '#ffa040', 26, 2.2); burst(g.d + x + 12, GY - 6 + g.jy, '#ffffff', 10, 1.5);
      }
      function gameOver() { api.setHiScore(g.score); g.phase = 'over'; g.phaseT = 360; }
      function lastLife(onCont) {
        g.phase = 'wait';
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) onCont(); }, () => { if (g === cg) gameOver(); });
      }
      function respawn() { startAt(g.reached); g.phase = 'start'; g.phaseT = 90; }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); snd.start(); }
          return;
        }
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.06; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0 && q.y < GY + 2);
        for (const q of g.pops) { q.t--; q.y -= 0.2; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.banner && --g.banner.t <= 0) g.banner = null;
        switch (g.phase) {
          case 'start': if (--g.phaseT <= 0) g.phase = 'play'; break;
          case 'play': updPlay(); if (g.phase === 'play') music(); break;
          case 'dead':
            for (const p of g.wreck.pieces) { p.x += p.vx; p.y += p.vy; p.vy += 0.1; if (p.y > GY - 3) { p.y = GY - 3; p.vx *= 0.8; p.vy = -p.vy * 0.3; } }
            if (--g.phaseT <= 0) {
              g.lives--;
              if (g.lives > 0) respawn();
              else lastLife(() => { g.lives = 3; respawn(); });
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function farH(x) { return 34 + Math.sin(x * 0.011) * 16 + Math.sin(x * 0.027 + 1.3) * 9 + Math.sin(x * 0.061) * 4; }
      function nearH(x) { return 14 + Math.sin(x * 0.019 + 2) * 8 + Math.sin(x * 0.043) * 5 + (Math.sin(x * 0.11) > 0.7 ? 3 : 0); }
      function drawScenery(ctx, d) {
        ctx.fillStyle = '#000018'; ctx.fillRect(0, 34, W, GY - 34);
        for (const s of stars) { const x = ((s.x - d * 0.03) % W + W) % W; ctx.fillStyle = s.c; ctx.fillRect(x | 0, s.y | 0, 1, 1); }
        // far mountains
        const fo = d * 0.18;
        for (let x = 0; x < W; x += 2) {
          const h = Math.round(farH(x + fo)); ctx.fillStyle = '#2048b0'; ctx.fillRect(x, 168 - h, 2, h + 6);
          if (h > 44) { ctx.fillStyle = '#a0c0ff'; ctx.fillRect(x, 168 - h, 2, 2); }
        }
        // near hills with moon-base domes
        const no = d * 0.45;
        for (let x = 0; x < W; x += 2) { const h = Math.round(nearH(x + no)); ctx.fillStyle = '#10a048'; ctx.fillRect(x, GY - 4 - h, 2, h + 4); }
        const dome0 = Math.floor(no / 220);
        for (let k = dome0; k < dome0 + 3; k++) {
          const x = Math.round(k * 220 + 90 - no), h = Math.round(nearH(k * 220 + 90));
          ctx.fillStyle = '#c0f0ff';
          for (let r = 0; r < 6; r++) { const w = Math.round(Math.sqrt(36 - r * r) * 2); ctx.fillRect(x - w / 2, GY - 4 - h - r, w, 1); }
          ctx.fillStyle = '#ffff60'; ctx.fillRect(x - 1, GY - 4 - h - 3, 2, 2);
        }
        // ground
        ctx.fillStyle = '#c07830'; ctx.fillRect(0, GY, W, H - GY);
        ctx.fillStyle = '#e0a050'; ctx.fillRect(0, GY, W, 1);
        ctx.fillStyle = '#804818';
        for (let i = 0; i < 40; i++) {
          const wx = i * 37.3, x = Math.round(((wx - d) % (40 * 37.3) + 40 * 37.3) % (40 * 37.3));
          if (x < W) ctx.fillRect(x, GY + 4 + (i * 7) % 20, 2 + (i % 3), 1);
        }
      }
      function drawObs(ctx, d) {
        for (const o of g.obs) {
          if (o.dead) continue;
          const x = Math.round(o.x - d);
          if (x > W + 20 || x + o.w < -20) continue;
          if (o.type === 'crater') {
            for (let i = 0; i < o.w; i++) {
              const dep = Math.round(Math.sin(Math.PI * (i + 0.5) / o.w) * o.w * 0.35) + 1;
              ctx.fillStyle = '#000000'; ctx.fillRect(x + i, GY, 1, dep);
              ctx.fillStyle = '#804818'; ctx.fillRect(x + i, GY + dep, 1, 1);
            }
            ctx.fillStyle = '#e0a050'; ctx.fillRect(x - 2, GY - 1, 2, 1); ctx.fillRect(x + o.w, GY - 1, 2, 1);
          } else if (o.type === 'rock') drawSpr(ctx, ROCKS[o.big ? 1 : 0], x + o.w / 2, GY - o.h / 2, {});
          else if (o.type === 'tank') drawSpr(ctx, TANK, x + 7, GY - 3, {});
          else if (o.type === 'mine') drawSpr(ctx, MINE, x + 4, GY - 1, { col: (frame & 8) ? null : '#ff8080' });
        }
      }
      function drawBuggy(ctx, x, jy, t) {
        const ground = GY + jy;
        for (let i = 0; i < 3; i++) {
          const bob = jy === 0 ? (Math.sin((t + i * 13) * 0.4) > 0.6 ? -1 : 0) : (i === 1 ? 1 : 0);
          drawSpr(ctx, WHEEL[(t >> 2) & 1], x + 4 + i * 8, ground - 3 + bob, {});
        }
        drawSpr(ctx, BODY, x + 12, ground - 10 + (jy === 0 && (t & 8) ? 0 : -1) * (jy === 0 ? 1 : 0), {});
      }
      function drawPanel(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, 34);
        text(ctx, '1UP', 6, 2, '#ff4040', 1); text(ctx, String(g.score).padStart(6, '0'), 30, 2, '#ffffff', 1);
        text(ctx, 'HI', 160, 2, '#ff4040', 1); text(ctx, String(hi).padStart(6, '0'), 176, 2, '#ffffff', 1);
        text(ctx, 'POINT', 6, 12, '#40e0ff', 1); text(ctx, LETTERS[Math.min(25, g.reached)], 40, 12, '#ffff40', 1);
        text(ctx, 'TIME', 58, 12, '#40e0ff', 1); text(ctx, String(Math.floor(g.secT / 60)).padStart(3, '0'), 86, 12, '#ffffff', 1);
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) { ctx.fillStyle = '#e050ff'; ctx.fillRect(112 + i * 10, 14, 8, 3); ctx.fillStyle = '#ffd040'; ctx.fillRect(113 + i * 10, 17, 2, 2); ctx.fillRect(117 + i * 10, 17, 2, 2); }
        // warning lamps: air attack / ground hazard / ground fire
        const near = g.obs.some(o => !o.dead && o.x - (g.d + g.bx) > 20 && o.x - (g.d + g.bx) < 140);
        const lamps = [g.ufos.length > 0 || g.bombs.length > 0, near, g.shells.length > 0];
        const lc = ['#ff3030', '#ffff30', '#30ff30'];
        lamps.forEach((on, i) => { ctx.fillStyle = on && (frame & 8) ? lc[i] : '#303030'; ctx.fillRect(176 + i * 14, 13, 10, 6); });
        // progress bar
        const x0 = 14, x1 = 242, prog = Math.max(0, Math.min(1, (g.d + g.bx + 12) / (25 * SEG)));
        ctx.fillStyle = '#404040'; ctx.fillRect(x0, 29, x1 - x0, 2);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x0, 29, Math.round((x1 - x0) * prog), 2);
        for (let i = 0; i <= 25; i++) {
          const x = Math.round(x0 + (x1 - x0) * i / 25);
          ctx.fillStyle = MAJOR[i] || i === 0 ? '#ffffff' : '#808080'; ctx.fillRect(x, 27, 1, MAJOR[i] || i === 0 ? 6 : 3);
          if (MAJOR[i] || i === 0) text(ctx, LETTERS[i], x - 2, 20, i <= g.reached ? '#ffff40' : '#808080', 1);
        }
        ctx.fillStyle = '#e050ff'; ctx.fillRect(Math.round(x0 + (x1 - x0) * prog) - 2, 31, 5, 3);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        const d = g.d;
        drawScenery(ctx, d);
        drawObs(ctx, d);
        ctx.fillStyle = '#ff6040';
        for (const sh of g.shells) ctx.fillRect(Math.round(sh.x - d) - 2, Math.round(sh.y) - 1, 4, 2);
        for (const u of g.ufos) drawSpr(ctx, UFO[u.kind], u.x, u.y, {});
        for (const b of g.bombs) { ctx.fillStyle = (frame & 4) ? '#ffffff' : '#ff4040'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 2, 4); }
        ctx.fillStyle = '#ffff60';
        for (const s of g.fshots) ctx.fillRect(Math.round(s.x - d), Math.round(s.y), 4, 1);
        for (const s of g.ushots) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 4);
        if (g.phase === 'dead') for (const p of g.wreck.pieces) drawSpr(ctx, p.s, p.x, p.y, {});
        else if (g.phase !== 'wait' && g.phase !== 'over') drawBuggy(ctx, Math.round(g.bx), Math.round(g.jy), frame);
        for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x - d), Math.round(q.y), 1, 1); }
        for (const q of g.pops) text(ctx, q.txt, q.x, q.y, '#ffffff', 1, 'center');
        drawPanel(ctx);
        if (g.banner) {
          const n = g.banner.lines.length;
          ctx.fillStyle = 'rgba(0,0,40,0.8)'; ctx.fillRect(20, 60, W - 40, 12 * n + 10);
          g.banner.lines.forEach((s, i) => text(ctx, s, W / 2, 66 + i * 12, i === 0 ? '#ffff40' : '#ffffff', 1, 'center'));
        }
        if (g.phase === 'start') text(ctx, 'POINT ' + LETTERS[g.reached] + '  READY', W / 2, 110, (frame & 16) ? '#ffffff' : '#40e0ff', 1, 'center');
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 54, 98, 108, 24);
          text(ctx, 'GAME OVER', W / 2, 104, '#ff4040', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        const d = titleT * 1.5;
        drawScenery(ctx, d);
        // a demo buggy hopping along
        const jy = -Math.max(0, Math.sin(titleT * 0.05) * 22);
        drawBuggy(ctx, 70, Math.round(jy), frame);
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, 34);
        text(ctx, 'HI ' + String(hi).padStart(6, '0'), W / 2, 6, '#ff4040', 1, 'center');
        text(ctx, 'MOON', W / 2, 44, '#e050ff', 4, 'center');
        text(ctx, 'PATROL', W / 2, 76, '#ffd040', 4, 'center');
        const page = (titleT >> 8) & 1;
        if (page === 0) {
          text(ctx, 'JUMP CRATERS AND ROCKS', W / 2, 112, '#ffffff', 1, 'center');
          text(ctx, 'SHOOT AHEAD AND OVERHEAD', W / 2, 122, '#ffffff', 1, 'center');
        } else {
          drawSpr(ctx, UFO[0], 70, 115, {}); text(ctx, '100', 84, 112, '#ffffff', 1);
          drawSpr(ctx, UFO[1], 140, 115, {}); text(ctx, '200', 154, 112, '#ffffff', 1);
          drawSpr(ctx, UFO[2], 70, 128, {}); text(ctx, '300', 84, 125, '#ffffff', 1);
          drawSpr(ctx, ROCKS[0], 140, 128, {}); text(ctx, '100', 154, 125, '#ffffff', 1);
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 140, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 140, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 140, blink ? '#ffffff' : '#888888', 1, 'center');
        text(ctx, credStr(), 8, 22, '#888888', 1);
        text(ctx, '\u00a9 1982 IREM', 248, 22, '#888888', 1, 'right');
      }
      return { update, render, destroy() { } };
    }
  });
})();
