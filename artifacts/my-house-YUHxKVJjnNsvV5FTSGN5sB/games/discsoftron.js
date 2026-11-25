// Discs of Tron (Bally Midway, 1983) -- from-scratch recreation: Tron and Sark duel across a 3D arena from
// floating ring platforms, banking glowing discs off the walls, deflecting, jumping, and shooting rings away.
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
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const W = 256, H = 240, CX = 128, CY = 112, CAMZ = -90, CAMY = 52, FOC = 150;
  const XW = 62, YC = 88, ZB = 168, TZ = 10, SZ = 150, TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function proj(x, y, z) { const s = FOC / (z - CAMZ); return { x: CX + x * s, y: CY - (y - CAMY) * s, s }; }

  // Tron seen from behind, Sark facing us (10 x 18)
  const TRON = spr([
    '...CCCC...',
    '...CBBC...',
    '...CBBC...',
    '....CC....',
    '.CCCCCCCC.',
    'CBBBCCBBBC',
    'CB.BBBB.BC',
    'CB.BCCB.BC',
    'CC.BBBB.CC',
    'W..BCCB..W',
    '...CBBC...',
    '...CCCC...',
    '...CB.BC..',
    '...CB.BC..',
    '...CB.BC..',
    '...CB.BC..',
    '..CCB.BCC.',
    '..CC...CC.'], { C: '#40f0ff', B: '#1050c0', W: '#ffffff' });
  const TRON_D = spr([
    '...CCCC...',
    '...CBBC...',
    '...CBBC...',
    '....CC....',
    'WCCCCCCCCW',
    'WBBBCCBBBW',
    'WB.BBBB.BW',
    'WB.BCCB.BW',
    'WC.BBBB.CW',
    'W..BCCB..W',
    '...CBBC...',
    '...CCCC...',
    '...CB.BC..',
    '...CB.BC..',
    '...CB.BC..',
    '...CB.BC..',
    '..CCB.BCC.',
    '..CC...CC.'], { C: '#40f0ff', B: '#1050c0', W: '#ffffff' });
  function sarkArt(main, dark, eye) {
    return spr([
      '..YYYYYY..',
      '.YRRRRRRY.',
      '.YRWRRWRY.',
      '.YRRRRRRY.',
      '..YRRRRY..',
      'YYYYYYYYYY',
      'YRRRYYRRRY',
      'YR.RRRR.RY',
      'YR.RYYR.RY',
      'YY.RRRR.YY',
      '...RYYR...',
      '...YYYY...',
      '...YR.RY..',
      '...YR.RY..',
      '...YR.RY..',
      '...YR.RY..',
      '..YYR.RYY.',
      '..YY...YY.'], { Y: main, R: dark, W: eye });
  }
  const FOES = [
    { name: 'SARK', a: sarkArt('#ffb020', '#c02010', '#ffffff') },
    { name: 'WARRIOR', a: sarkArt('#ff4040', '#701010', '#ffff00') },
    { name: 'GUARDIAN', a: sarkArt('#e040ff', '#501070', '#ffffff') },
    { name: 'MASTER SARK', a: sarkArt('#ffffff', '#c02010', '#ff2020') }
  ];

  // ring layouts per stage: [x, y] for each of the three rings on each side
  const LAYOUTS = [
    { name: 'RINGS', t: [[-36, 20], [0, 20], [36, 20]], s: [[-36, 20], [0, 20], [36, 20]], move: 0 },
    { name: 'STEPS', t: [[-36, 12], [0, 24], [36, 36]], s: [[-36, 36], [0, 24], [36, 12]], move: 0 },
    { name: 'DRIFT', t: [[-36, 20], [0, 20], [36, 20]], s: [[-36, 28], [0, 18], [36, 28]], move: 1 }
  ];

  ArcadeRegistry.register({
    id: 'discsoftron', title: 'Discs of Tron', year: 1983, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: aim \u00b7 Space: throw disc \u00b7 X: deflect (X + Left/Right: jump rings) \u00b7 Enter: start',
    marquee: { bg: '#000818', fg: '#40f0ff', accent: '#ffb020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, coinFlash = 0, titleT = 0;
      let g = null;

      const sfx = {
        throw() { au.tone(900, 0.25, { type: 'sawtooth', slideTo: 300, vol: 0.06 }); au.tone(1800, 0.2, { type: 'sine', slideTo: 600, vol: 0.05 }); },
        ethrow() { au.tone(500, 0.3, { type: 'sawtooth', slideTo: 1100, vol: 0.06 }); },
        bounce() { au.tone(1400, 0.05, { type: 'square', vol: 0.05 }); },
        deflect() { au.tone(2400, 0.1, { type: 'square', slideTo: 1200, vol: 0.08 }); au.noise(0.08, { freq: 6000, vol: 0.05, type: 'highpass' }); },
        ring() { au.tone(300, 0.2, { type: 'square', slideTo: 120, vol: 0.09 }); au.noise(0.15, { freq: 1500, vol: 0.1 }); },
        ringGone() { au.noise(0.5, { freq: 2000, slideTo: 100, vol: 0.2 }); au.tone(600, 0.5, { type: 'sawtooth', slideTo: 60, vol: 0.08 }); },
        derez() { for (let i = 0; i < 6; i++) au.tone(1600 - i * 200, 0.08, { type: 'square', vol: 0.07, delay: i * 0.06 }); au.noise(0.6, { freq: 4000, slideTo: 300, vol: 0.15 }); },
        hit() { au.melody([[880, .06], [660, .06], [440, .06], [330, .06], [220, .2]], { type: 'square', vol: 0.12 }); au.noise(0.8, { freq: 3000, slideTo: 100, vol: 0.2 }); },
        jump() { au.tone(300, 0.25, { type: 'triangle', slideTo: 900, vol: 0.1 }); },
        fall() { au.tone(800, 1.2, { type: 'sine', slideTo: 60, vol: 0.12 }); },
        clash() { au.noise(0.2, { freq: 5000, vol: 0.15, type: 'highpass' }); au.tone(2000, 0.1, { type: 'square', vol: 0.06 }); },
        win() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .4]], { type: 'square', vol: 0.11 }); },
        intro() { au.melody([[262, .15], [392, .15], [523, .15], [466, .15], [392, .3], [523, .5]], { type: 'sawtooth', vol: 0.07 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.1 }); }
      };

      // ---------------- state ----------------
      function makeRings(list, z) { return list.map((p, i) => ({ x: p[0], bx: p[0], y: p[1], z, r: 12, hp: 3, i, flash: 0 })); }
      function newGame() {
        g = { score: 0, lives: 3, level: 0, nextExtra: 15000, ax: 0, ay: 34, discs: [], parts: [], pops: [],
          phase: 'intro', phaseT: 160, msg: '', msgT: 0, over: 0, defE: 60 };
        g.tron = { ring: 1, x: 0, y: 20, z: TZ, jump: 0, from: 0, to: 0, fall: 0, dead: 0, def: false, stock: 3 };
        startLevel(true);
        sfx.intro();
      }
      function startLevel(first) {
        const L = LAYOUTS[g.level % LAYOUTS.length];
        g.layout = L;
        g.trings = makeRings(L.t, TZ); g.srings = makeRings(L.s, SZ);
        g.discs = [];
        const f = FOES[Math.min(FOES.length - 1, (g.level / 2) | 0)];
        g.sark = { ring: 1, x: g.srings[1].x, y: g.srings[1].y, z: SZ, jump: 0, from: 1, to: 1, fall: 0, dead: 0, def: 0,
          throwT: 120, foe: f, hits: 0, need: 1 + Math.min(2, g.level >> 2), moveT: 200 };
        placeTron(1);
        g.phase = 'intro'; g.phaseT = first ? 160 : 110;
      }
      function placeTron(i) {
        const T = g.tron, r = g.trings[i];
        T.ring = i; T.x = r.x; T.y = r.y; T.jump = 0; T.fall = 0; T.dead = 0; T.stock = 3;
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 25000; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, z, t, c) { g.pops.push({ x, y, z, t: 60, txt: t, c: c || '#ffe040' }); }
      function derez(x, y, z, col) {
        for (let i = 0; i < 40; i++) g.parts.push({ x: x + rnd(-4, 4), y: y + rnd(0, 18), z: z + rnd(-3, 3), vx: rnd(-0.6, 0.6), vy: rnd(-0.2, 0.9), vz: rnd(-0.6, 0.6), t: rnd(40, 80), c: col[i % col.length] });
      }

      function throwDisc(owner, sx, sy, sz, tx, ty, tz, sp) {
        const dx = tx - sx, dy = ty - sy, dz = tz - sz, d = Math.hypot(dx, dy, dz) || 1;
        g.discs.push({ owner, x: sx, y: sy, z: sz, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, life: 300, bounces: 0, trail: [] });
      }
      function ringUnder(rings, idx) { const r = rings[idx]; return r && r.hp > 0 ? r : null; }

      // ---------------- Sark AI ----------------
      function updSark() {
        const S = g.sark, T = g.tron, lv = g.level;
        if (S.dead) return;
        if (S.fall) { S.y -= S.fall * 0.06; S.fall++; if (S.fall > 70) { S.dead = 1; foeDefeated(true); } return; }
        if (g.layout.move) for (const r of g.srings) r.x = r.bx + Math.sin(frame * 0.012 + r.i * 2) * 10;
        if (S.jump > 0) {
          S.jump--;
          const a = g.srings[S.from], b = g.srings[S.to], k = 1 - S.jump / 26;
          S.x = a.x + (b.x - a.x) * k; S.y = a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 14;
          if (S.jump === 0) { S.ring = S.to; if (!ringUnder(g.srings, S.ring)) { S.fall = 1; sfx.fall(); } }
          return;
        }
        const ring = ringUnder(g.srings, S.ring);
        if (!ring) { S.fall = 1; sfx.fall(); return; }
        S.x = ring.x; S.y = ring.y;
        if (S.def > 0) S.def--;
        // dodge an incoming disc
        for (const d of g.discs) {
          if (d.owner !== 'tron' || d.vz <= 0) continue;
          const t = (SZ - d.z) / d.vz; if (t < 0 || t > 30) continue;
          const px = d.x + d.vx * t;
          if (Math.abs(px - S.x) < 8 && Math.random() < 0.02 + lv * 0.006) { jumpSark(); return; }
        }
        if (--S.moveT <= 0) { S.moveT = rnd(150, 320) - lv * 12; if (Math.random() < 0.6) { jumpSark(); return; } }
        if (--S.throwT <= 0) {
          const live = g.discs.filter(d => d.owner === 'sark').length;
          S.throwT = Math.max(40, 120 - lv * 9) + rnd(0, 60);
          if (live >= 1 + Math.min(2, (lv / 2) | 0) || T.dead || T.fall) return;
          const sp = Math.min(4.2, 2.3 + lv * 0.18);
          let tx = T.x + rnd(-6, 6) * Math.max(0.3, 1 - lv * 0.1), ty = T.y + rnd(6, 14), tz = TZ;
          const r = Math.random();
          if (lv >= 1 && r < 0.25) { // shoot Tron's ring out from under him
            const rr = g.trings[T.ring]; if (rr && rr.hp > 0) { tx = rr.x + rnd(-6, 6); ty = rr.y - 1; tz = TZ + rnd(-4, 4); }
          } else if (r < 0.5) { // bank shot off a side wall
            const side = T.x >= 0 ? 1 : -1; tx = side * 2 * XW - tx;
          } else if (r < 0.62 && lv >= 2) { ty = 2 * YC - ty; } // off the ceiling
          throwDisc('sark', S.x, S.y + 12, SZ - 4, tx, ty, tz, sp);
          sfx.ethrow();
        }
      }
      function jumpSark() {
        const S = g.sark, opts = [];
        for (let i = 0; i < 3; i++) if (i !== S.ring && g.srings[i].hp > 0 && Math.abs(i - S.ring) === 1) opts.push(i);
        if (!opts.length) return;
        S.from = S.ring; S.to = opts[(Math.random() * opts.length) | 0]; S.jump = 26;
      }
      function foeDefeated(fell) {
        const S = g.sark;
        const pts = fell ? 3000 + g.level * 500 : 1000 + g.level * 250;
        addScore(pts); pop(S.x, S.y + 20, S.z, String(pts), '#40f0ff');
        g.phase = 'win'; g.phaseT = 170; g.msg = S.foe.name + (fell ? ' FELL!' : ' DEREZZED'); g.msgT = 170;
        g.discs = [];
        sfx.win();
      }

      // ---------------- Tron ----------------
      function updTron() {
        const T = g.tron;
        if (T.dead) { if (--T.dead === 0) afterDeath(); return; }
        if (T.fall) { T.y -= T.fall * 0.06; if (++T.fall > 70) killTron(false); return; }
        const xh = api.key('KeyX');
        T.def = false;
        if (T.jump > 0) {
          T.jump--;
          const a = g.trings[T.from], b = g.trings[T.to], k = 1 - T.jump / 22;
          T.x = a.x + (b.x - a.x) * k; T.y = a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 14;
          if (T.jump === 0) { T.ring = T.to; if (!ringUnder(g.trings, T.ring)) { T.fall = 1; sfx.fall(); } }
        } else {
          const ring = ringUnder(g.trings, T.ring);
          if (!ring) { T.fall = 1; sfx.fall(); return; }
          T.x = ring.x; T.y = ring.y;
          if (xh) {
            const dir = api.pressed('ArrowLeft') ? -1 : api.pressed('ArrowRight') ? 1 : 0;
            if (dir) {
              let to = T.ring + dir;
              while (to >= 0 && to < 3 && g.trings[to].hp <= 0) to += dir;
              if (to >= 0 && to < 3) { T.from = T.ring; T.to = to; T.jump = 22; sfx.jump(); }
            } else if (!api.key('ArrowLeft') && !api.key('ArrowRight') && g.defE > 0) { T.def = true; }
          }
        }
        if (T.def) g.defE = Math.max(0, g.defE - 1); else g.defE = Math.min(60, g.defE + 0.5);
        if (!xh) {
          const as = 1.3;
          if (api.key('ArrowLeft')) g.ax = Math.max(-XW + 2, g.ax - as);
          if (api.key('ArrowRight')) g.ax = Math.min(XW - 2, g.ax + as);
          if (api.key('ArrowUp')) g.ay = Math.min(YC - 2, g.ay + as);
          if (api.key('ArrowDown')) g.ay = Math.max(2, g.ay - as);
        }
        if (api.anyPressed('Space', 'KeyZ') && T.stock > 0 && !T.jump && !T.def) {
          T.stock--;
          throwDisc('tron', T.x + 3, T.y + 12, TZ + 3, g.ax, g.ay, SZ, 3.6); g.discs[g.discs.length - 1].mine = true;
          sfx.throw();
        }
      }
      function killTron(hit) {
        const T = g.tron;
        if (T.dead) return;
        T.dead = 120; T.fall = 0;
        derez(T.x, T.y, T.z, ['#40f0ff', '#ffffff', '#1050c0']);
        sfx.derez();
        if (hit) sfx.hit();
        g.discs = g.discs.filter(d => d.owner === 'tron');
      }
      function afterDeath() {
        if (g.lives <= 0) { lastLife(() => { g.lives = 3; respawn(); }); return; }
        g.lives--; respawn();
      }
      function respawn() {
        g.trings = makeRings(g.layout.t, TZ);
        g.discs = [];
        placeTron(1);
        g.msg = 'READY'; g.msgT = 80;
        g.sark.throwT = 100;
      }
      function lastLife(onC) {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) onC(); }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() { api.setHiScore(g.score); g.over = 320; g.tron.dead = 0; g.tron.gone = true; au.melody([[392, .2], [330, .2], [262, .2], [196, .6]], { type: 'sawtooth', vol: 0.09 }); }

      // ---------------- discs ----------------
      function crossing(d, px, py, pz, plane) {
        // returns interpolated point when the disc crossed z = plane this frame
        if ((pz - plane) * (d.z - plane) > 0 || pz === d.z) return null;
        const k = (plane - pz) / (d.z - pz);
        return { x: px + (d.x - px) * k, y: py + (d.y - py) * k };
      }
      function updDiscs() {
        const T = g.tron, S = g.sark;
        for (const d of g.discs) {
          const px = d.x, py = d.y, pz = d.z;
          d.x += d.vx; d.y += d.vy; d.z += d.vz; d.life--;
          d.trail.push([px, py, pz]); if (d.trail.length > 6) d.trail.shift();
          if (d.x > XW) { d.x = 2 * XW - d.x; d.vx = -d.vx; sfx.bounce(); d.bounces++; }
          if (d.x < -XW) { d.x = -2 * XW - d.x; d.vx = -d.vx; sfx.bounce(); d.bounces++; }
          if (d.y > YC) { d.y = 2 * YC - d.y; d.vy = -d.vy; sfx.bounce(); d.bounces++; }
          if (d.y < 0) { d.y = -d.y; d.vy = -d.vy; sfx.bounce(); d.bounces++; }
          if (d.z > ZB) { d.z = 2 * ZB - d.z; d.vz = -d.vz; sfx.bounce(); d.bounces++; }
          if (d.z < -12 || d.life <= 0 || d.bounces > 5) { d.dead = true; continue; }
          // rings: disc passing down/up through a ring's surface
          for (const rings of [g.trings, g.srings]) for (const r of rings) {
            if (r.hp <= 0) continue;
            if ((py - r.y) * (d.y - r.y) > 0) continue;
            if (Math.hypot(d.x - r.x, (d.z - r.z) * 1.2) < r.r) {
              r.hp--; r.flash = 12; d.dead = true;
              if (r.hp <= 0) { sfx.ringGone(); derez(r.x, r.y - 6, r.z, rings === g.trings ? ['#40f0ff', '#1050c0'] : ['#ffb020', '#ff4020']); }
              else sfx.ring();
              if (d.owner === 'tron' && rings === g.srings) { addScore(r.hp <= 0 ? 300 : 50); }
              break;
            }
          }
          if (d.dead) continue;
          // characters
          if (d.owner === 'sark' && !T.dead && !T.fall && !g.tron.gone) {
            const c = crossing(d, px, py, pz, TZ);
            if (c && Math.abs(c.x - T.x) < (T.def ? 10 : 5) && c.y > T.y - (T.def ? 3 : 0) && c.y < T.y + (T.def ? 21 : 18)) {
              if (T.def) {
                d.vz = Math.abs(d.vz) * 1.1; d.owner = 'tron'; d.vx += (g.ax - T.x) * 0.01; d.z = TZ + 1; d.bounces = 0;
                addScore(100); pop(T.x, T.y + 22, TZ, '100'); sfx.deflect();
              } else { d.dead = true; killTron(true); continue; }
            }
          }
          if (d.owner === 'tron' && !S.dead && !S.fall && g.phase === 'play') {
            const c = crossing(d, px, py, pz, SZ);
            if (c && Math.abs(c.x - S.x) < 5.5 && c.y > S.y && c.y < S.y + 18) {
              if (!S.jump && Math.random() < Math.min(0.45, 0.06 + g.level * 0.05)) {
                d.vz = -Math.abs(d.vz); d.owner = 'sark'; d.z = SZ - 1; d.bounces = 0; S.def = 15; sfx.deflect();
              } else {
                d.dead = true; S.hits++;
                derez(S.x, S.y, S.z, ['#ffb020', '#ffffff', '#ff4020']);
                if (S.hits >= S.need) { S.dead = 1; sfx.derez(); foeDefeated(false); }
                else { addScore(500); pop(S.x, S.y + 20, S.z, '500'); sfx.hit(); S.throwT += 40; }
              }
            }
          }
        }
        // disc versus disc
        for (let i = 0; i < g.discs.length; i++) for (let j = i + 1; j < g.discs.length; j++) {
          const a = g.discs[i], b = g.discs[j];
          if (a.dead || b.dead || a.owner === b.owner) continue;
          if (Math.abs(a.x - b.x) < 4 && Math.abs(a.y - b.y) < 4 && Math.abs(a.z - b.z) < 5) {
            a.dead = b.dead = true; addScore(150); pop(a.x, a.y, a.z, '150'); sfx.clash();
            derez(a.x, a.y - 8, a.z, ['#ffffff', '#ffe040']);
          }
        }
        g.discs = g.discs.filter(d => !d.dead);
        T.stock = 3 - g.discs.filter(d => d.mine).length;
      }

      function updGame() {
        for (const p of g.parts) { p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vy -= 0.02; p.t--; }
        g.parts = g.parts.filter(p => p.t > 0);
        for (const p of g.pops) p.t--;
        g.pops = g.pops.filter(p => p.t > 0);
        for (const r of g.trings.concat(g.srings)) if (r.flash) r.flash--;
        if (g.msgT > 0) g.msgT--;
        if (g.over > 0) { if (--g.over <= 0 || (g.over < 240 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; } return; }
        if (g.phase === 'intro') { if (--g.phaseT <= 0) { g.phase = 'play'; } return; }
        if (g.phase === 'win') {
          updDiscs();
          if (--g.phaseT <= 0) { g.level++; addScore(0); startLevel(false); }
          return;
        }
        updTron();
        updSark();
        updDiscs();
      }

      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(98, 0.25, { type: 'square', vol: 0.12 }); return false;
      }
      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        updGame();
      }

      // ---------------- rendering ----------------
      function line(ctx, a, b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      function drawArena(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#1438a0'; ctx.lineWidth = 1; ctx.beginPath();
        // side walls / ceiling: lines along depth
        for (const y of [0, 22, 44, 66, YC]) { line(ctx, proj(-XW, y, -40), proj(-XW, y, ZB)); line(ctx, proj(XW, y, -40), proj(XW, y, ZB)); }
        for (const x of [-XW, -31, 0, 31, XW]) line(ctx, proj(x, YC, -40), proj(x, YC, ZB));
        for (let z = -20; z <= ZB; z += 20) {
          const a = proj(-XW, 0, z), b = proj(-XW, YC, z), c = proj(XW, YC, z), d = proj(XW, 0, z);
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
        }
        ctx.stroke();
        // back wall glow grid
        ctx.strokeStyle = '#2050ff'; ctx.beginPath();
        const a = proj(-XW, 0, ZB), c = proj(XW, YC, ZB);
        ctx.rect(a.x, c.y, c.x - a.x, a.y - c.y);
        for (let x = -XW + 15.5; x < XW; x += 15.5) line(ctx, proj(x, 0, ZB), proj(x, YC, ZB));
        for (let y = 11; y < YC; y += 11) line(ctx, proj(-XW, y, ZB), proj(XW, y, ZB));
        ctx.stroke();
        // the void: floor grid glows faintly and scrolls
        ctx.strokeStyle = '#0a1a50'; ctx.beginPath();
        for (let x = -XW; x <= XW; x += 15.5) line(ctx, proj(x, 0, -40), proj(x, 0, ZB));
        for (let z = -40 + (frame % 40) / 2; z <= ZB; z += 20) line(ctx, proj(-XW, 0, z), proj(XW, 0, z));
        ctx.stroke();
      }
      function drawRing(ctx, r, tron) {
        if (r.hp <= 0) return;
        const p = proj(r.x, r.y, r.z), rx = r.r * p.s, ry = rx * 0.32;
        const cols = tron ? ['#40f0ff', '#2090e0', '#1050c0'] : ['#ffb020', '#ff7020', '#c02010'];
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < r.hp; i++) {
          ctx.strokeStyle = r.flash && (frame & 2) ? '#ffffff' : cols[i];
          ctx.lineWidth = i === 0 ? 2 : 1;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * (1 - i * 0.28), ry * (1 - i * 0.28), 0, 0, TAU); ctx.stroke();
        }
        // supporting energy column
        ctx.fillStyle = tron ? 'rgba(64,240,255,0.15)' : 'rgba(255,160,32,0.15)';
        const f = proj(r.x, 0, r.z);
        ctx.fillRect(p.x - 1, p.y + ry, 3, Math.max(0, f.y - p.y - ry));
      }
      function drawFigure(ctx, im, x, y, z, flash) {
        const p = proj(x, y, z), s = p.s * 0.95;
        const w = im.width * s, h = im.height * s;
        if (flash) ctx.globalAlpha = 0.5;
        ctx.drawImage(im, Math.round(p.x - w / 2), Math.round(p.y - h), Math.round(w), Math.round(h));
        ctx.globalAlpha = 1;
      }
      function drawDisc(ctx, d) {
        const col = d.owner === 'tron' ? '#40f0ff' : '#ffb020';
        // shadow on the floor helps depth reading
        const sh = proj(d.x, 0, d.z);
        ctx.fillStyle = d.owner === 'tron' ? '#103060' : '#503010';
        ctx.fillRect(Math.round(sh.x - 3 * sh.s), Math.round(sh.y), Math.max(1, Math.round(6 * sh.s)), 1);
        for (let i = 0; i < d.trail.length; i++) {
          const t = d.trail[i], q = proj(t[0], t[1], t[2]);
          ctx.fillStyle = col; ctx.globalAlpha = (i + 1) / (d.trail.length + 2) * 0.5;
          ctx.fillRect(Math.round(q.x - q.s), Math.round(q.y - q.s * 0.4), Math.max(1, Math.round(2 * q.s)), Math.max(1, Math.round(q.s)));
        }
        ctx.globalAlpha = 1;
        const p = proj(d.x, d.y, d.z), rx = Math.max(1.5, 3.2 * p.s), ry = Math.max(1, rx * 0.45);
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.x - rx * 0.4), Math.round(p.y - 0.5), Math.max(1, Math.round(rx * 0.8)), 1);
      }
      function drawReticle(ctx) {
        const p = proj(g.ax, g.ay, SZ);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(p.x - 6, p.y); ctx.lineTo(p.x - 2, p.y); ctx.moveTo(p.x + 2, p.y); ctx.lineTo(p.x + 6, p.y);
        ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x, p.y - 2); ctx.moveTo(p.x, p.y + 2); ctx.lineTo(p.x, p.y + 6);
        ctx.stroke();
        // short predicted path (with wall bounces) as a dotted guide
        const T = g.tron;
        let x = T.x + 3, y = T.y + 12, z = TZ + 3;
        const dx = g.ax - x, dy = g.ay - y, dz = SZ - z, dd = Math.hypot(dx, dy, dz);
        let vx = dx / dd * 3.6, vy = dy / dd * 3.6, vz = dz / dd * 3.6;
        ctx.fillStyle = 'rgba(160,240,255,0.55)';
        for (let i = 0; i < 60; i++) {
          x += vx; y += vy; z += vz;
          if (x > XW || x < -XW) vx = -vx; if (y > YC || y < 0) vy = -vy; if (z > ZB) vz = -vz;
          if (i % 4 === 3) { const q = proj(x, y, z); ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 12); ctx.fillRect(0, H - 14, W, 14);
        text(ctx, 'SCORE', 4, 3, '#40f0ff'); text(ctx, String(g ? g.score : 0).padStart(7, '0'), 38, 3, '#ffffff');
        text(ctx, 'HIGH', 154, 3, '#ffb020'); text(ctx, String(hi).padStart(7, '0'), 182, 3, '#ffffff');
        if (!g) return;
        for (let i = 0; i < Math.min(6, g.lives); i++) ctx.drawImage(TRON, 4 + i * 10, H - 13, 6, 11);
        text(ctx, 'DISCS', 70, H - 10, '#40f0ff');
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i < g.tron.stock ? '#40f0ff' : '#103050'; ctx.beginPath(); ctx.ellipse(108 + i * 10, H - 7, 4, 2, 0, 0, TAU); ctx.fill(); }
        text(ctx, 'DEF', 144, H - 10, '#ffffff');
        ctx.fillStyle = '#203040'; ctx.fillRect(164, H - 10, 30, 6); ctx.fillStyle = g.defE > 15 ? '#40ff80' : '#ff4040'; ctx.fillRect(164, H - 10, g.defE / 2, 6);
        text(ctx, 'LV ' + (g.level + 1), 222, H - 10, '#ffb020');
      }
      function drawGame(ctx) {
        drawArena(ctx);
        const S = g.sark, T = g.tron;
        // far side first
        for (const r of g.srings) drawRing(ctx, r, false);
        if (!S.dead) drawFigure(ctx, S.foe.a, S.x, S.y, S.z, S.def > 0 && (frame & 2));
        if (S.def > 0 && !S.dead) { const p = proj(S.x, S.y + 9, SZ - 3); ctx.strokeStyle = '#ffe040'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 8 * p.s, 11 * p.s, 0, 0, TAU); ctx.stroke(); }
        const ds = g.discs.slice().sort((a, b) => b.z - a.z);
        for (const d of ds) if (d.z > TZ + 4) drawDisc(ctx, d);
        for (const p of g.parts) { const q = proj(p.x, p.y, p.z); ctx.fillStyle = p.c; ctx.fillRect(Math.round(q.x), Math.round(q.y), Math.max(1, Math.round(q.s)), Math.max(1, Math.round(q.s))); }
        for (const r of g.trings) drawRing(ctx, r, true);
        if (!T.dead && !T.gone) {
          drawFigure(ctx, T.def ? TRON_D : TRON, T.x, T.y, T.z, false);
          if (T.def) { const p = proj(T.x, T.y + 9, TZ + 2); ctx.strokeStyle = (frame & 2) ? '#ffffff' : '#40f0ff'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 * p.s, 13 * p.s, 0, 0, TAU); ctx.stroke(); }
        }
        for (const d of ds) if (d.z <= TZ + 4) drawDisc(ctx, d);
        if (g.phase === 'play' && !T.dead && !T.gone) drawReticle(ctx);
        for (const p of g.pops) { const q = proj(p.x, p.y, p.z); text(ctx, p.txt, q.x, q.y - (60 - p.t) * 0.3, p.c, 1, 'center'); }
        if (g.phase === 'intro') {
          text(ctx, 'LEVEL ' + (g.level + 1), CX, 40, '#40f0ff', 2, 'center');
          text(ctx, g.layout.name + '  VS  ' + S.foe.name, CX, 60, '#ffb020', 1, 'center');
        }
        if (g.msgT > 0 && (frame >> 3) & 1) text(ctx, g.msg, CX, 40, g.msg === 'READY' ? '#ffffff' : '#ffe040', g.msg === 'READY' ? 2 : 1, 'center');
        if (g.over > 0) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 96, W, 34); text(ctx, 'END OF LINE', CX, 106, '#ff4040', 2, 'center'); }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#102a80'; ctx.beginPath();
        for (let x = -XW; x <= XW; x += 15.5) line(ctx, proj(x, 0, -40), proj(x, 0, ZB));
        for (let z = -40 + (titleT % 40) / 2; z <= ZB; z += 20) line(ctx, proj(-XW, 0, z), proj(XW, 0, z));
        ctx.stroke();
        const col = ['#40f0ff', '#80f8ff', '#ffffff'][(frame >> 4) % 3];
        text(ctx, 'DISCS', CX + 2, 26, '#103060', 4, 'center'); text(ctx, 'DISCS', CX, 24, col, 4, 'center');
        text(ctx, 'OF', CX, 58, '#ffffff', 2, 'center');
        text(ctx, 'TRON', CX + 2, 78, '#603000', 5, 'center'); text(ctx, 'TRON', CX, 76, '#ffb020', 5, 'center');
        ctx.drawImage(TRON, 60, 124, 20, 36); ctx.drawImage(FOES[0].a, 176, 124, 20, 36);
        const k = (titleT % 90) / 90, dx = 82 + k * 90, dy = 140 - Math.sin(k * Math.PI) * 26;
        ctx.fillStyle = '#40f0ff'; ctx.beginPath(); ctx.ellipse(dx, dy, 5, 2, 0, 0, TAU); ctx.fill();
        text(ctx, 'HIT SARK  500 - 1000+', CX, 168, '#ffffff', 1, 'center');
        text(ctx, 'SARK FALLS  3000+', CX, 178, '#ffffff', 1, 'center');
        if (api.credits === 0) { if (coinFlash > 0 || (frame >> 5) & 1) text(ctx, 'INSERT COIN', CX, 196, coinFlash && (frame >> 2) & 1 ? '#ffe040' : '#ff4040', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', CX, 196, '#40ff80', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#ffffff');
        text(ctx, '\u00a9 1983 BALLY MIDWAY', W - 4, H - 10, '#ffffff', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) { drawTitle(ctx); text(ctx, 'HIGH ' + String(hi).padStart(7, '0'), CX, 3, '#ffb020', 1, 'center'); return; }
        drawGame(ctx);
        drawHUD(ctx);
      }
      return { update, render, destroy() { } };
    }
  });
})();
