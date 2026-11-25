// Hang-On (Sega, 1985) \u2014 from-scratch recreation. Pseudo-3D motorcycle racing: lean into the curves, fight the
// centrifugal pull, pass rival riders and beat the clock to each checkpoint for extended time. One lap runs five
// stages from the sunny coast through afternoon and sunset into the city at night; laps loop faster.
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

  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5);
  function spr(w, h, draw) { const [c, x] = mkCanvas(w, h); draw((px, py, pw, ph, col) => { x.fillStyle = col; x.fillRect(px, py, pw, ph); }); return c; }

  // ---------- roadside sprites ----------
  const SPR = {
    palm: spr(28, 56, r => { r(13, 16, 3, 40, '#8a5a2a'); r(14, 16, 1, 40, '#b07a40'); r(2, 10, 12, 3, '#2a9a30'); r(15, 10, 12, 3, '#2a9a30'); r(0, 13, 4, 4, '#1a7a20'); r(24, 13, 4, 4, '#1a7a20'); r(6, 6, 16, 4, '#38b838'); r(10, 3, 8, 3, '#38b838'); r(12, 14, 4, 3, '#704010'); }),
    tree: spr(28, 34, r => { r(12, 22, 4, 12, '#6a4020'); r(4, 6, 20, 16, '#2a8a2a'); r(1, 10, 26, 10, '#2a8a2a'); r(7, 2, 14, 6, '#38a838'); r(6, 8, 6, 4, '#48c048'); }),
    poplar: spr(14, 44, r => { r(6, 34, 2, 10, '#6a4020'); r(3, 4, 8, 32, '#2a7a3a'); r(2, 12, 10, 18, '#2a7a3a'); r(5, 0, 4, 6, '#3a9a4a'); }),
    cactus: spr(16, 30, r => { r(6, 2, 4, 28, '#2a8a3a'); r(7, 2, 1, 28, '#48b858'); r(1, 10, 3, 10, '#2a8a3a'); r(1, 18, 5, 3, '#2a8a3a'); r(12, 6, 3, 10, '#2a8a3a'); r(10, 14, 5, 3, '#2a8a3a'); }),
    rock: spr(36, 22, r => { r(4, 6, 28, 16, '#8a6a50'); r(0, 12, 36, 10, '#8a6a50'); r(8, 2, 16, 6, '#a08060'); r(20, 14, 12, 8, '#604838'); }),
    sign: spr(30, 30, r => { r(13, 14, 4, 16, '#707070'); r(0, 0, 30, 16, '#f0f0f0'); r(2, 2, 26, 12, '#e02020'); r(5, 6, 20, 4, '#ffffff'); }),
    chevron: spr(20, 24, r => { r(9, 12, 2, 12, '#606060'); r(0, 0, 20, 12, '#ffd020'); r(4, 2, 4, 2, '#000'); r(6, 4, 4, 2, '#000'); r(8, 6, 4, 2, '#000'); r(6, 8, 4, 2, '#000'); r(4, 10, 2, 1, '#000'); }),
    lamp: spr(10, 44, r => { r(4, 4, 2, 40, '#808080'); r(0, 2, 10, 3, '#a0a0a0'); r(1, 5, 4, 2, '#ffffa0'); }),
    lampOn: spr(14, 48, r => { r(6, 8, 2, 40, '#606060'); r(2, 6, 10, 3, '#808080'); r(0, 9, 14, 4, '#ffffa0'); r(3, 13, 8, 2, '#c0c060'); }),
    tower: spr(40, 64, r => { r(2, 4, 36, 60, '#202838'); for (let y = 8; y < 60; y += 6) for (let x = 6; x < 36; x += 6) if ((x * 7 + y * 3) % 5 < 3) r(x, y, 3, 3, '#ffe060'); }),
    building: spr(48, 40, r => { r(0, 4, 48, 36, '#283040'); for (let y = 8; y < 36; y += 6) for (let x = 4; x < 46; x += 6) if ((x * 5 + y) % 7 < 4) r(x, y, 3, 3, '#ffd040'); r(0, 0, 48, 4, '#404858'); })
  };
  // motorbike, rear view: rider leathers colour, helmet colour; tuck = crouched
  function bike(leather, helmet, tuck) {
    return spr(26, 44, r => {
      const t = tuck ? 5 : 0;
      r(9, 30, 8, 14, '#181818'); r(10, 31, 2, 12, '#404040');                 // rear tyre
      r(5, 26, 16, 8, '#d0d0d0'); r(6, 27, 14, 2, '#ffffff'); r(9, 29, 8, 3, '#e02020');   // tail + light
      r(4, 20, 18, 7, leather); r(3, 22, 3, 5, '#202020'); r(20, 22, 3, 5, '#202020');   // seat / legs
      r(2, 26, 4, 10, leather); r(20, 26, 4, 10, leather); r(1, 34, 5, 3, '#202020'); r(20, 34, 5, 3, '#202020');  // legs + boots
      r(6, 8 + t, 14, 13 - t, leather); r(8, 10 + t, 10, 2, '#ffffff');                  // back
      r(3, 12 + t, 4, 6, leather); r(19, 12 + t, 4, 6, leather); r(1, 16 + t, 4, 3, '#202020'); r(21, 16 + t, 4, 3, '#202020'); // arms, gloves
      r(8, 1 + t, 10, 9, helmet); r(9, 0 + t, 8, 2, helmet); r(9, 3 + t, 8, 2, '#303030');                       // helmet
      r(0, 17 + t, 4, 2, '#909090'); r(22, 17 + t, 4, 2, '#909090');                     // mirrors / bars
    });
  }
  const PBIKE = [bike('#e02020', '#ffffff', false), bike('#e02020', '#ffffff', true)];
  const CRASHBIKE = spr(26, 44, r => { r(9, 30, 8, 14, '#181818'); r(5, 26, 16, 8, '#d0d0d0'); r(4, 20, 18, 7, '#e02020'); r(6, 16, 14, 4, '#909090'); });
  const RIVALS = [['#2050e0', '#ffe020'], ['#20a040', '#ffffff'], ['#f0d020', '#2050e0'], ['#a020c0', '#ffffff'], ['#f08020', '#202020'], ['#40c0e0', '#e02020']].map(c => bike(c[0], c[1], false));

  const STAGES = [
    { n: 'COASTLINE', sky: ['#2080ff', '#a8dcff'], bg: '#1060c0', bg2: '#e8d8a0', g1: '#40a840', g2: '#389838', r1: '#ff3030', r2: '#f0f0f0', road: '#707078', road2: '#68686f', sc: ['palm', 'palm', 'sign', 'chevron'], sea: true },
    { n: 'COUNTRYSIDE', sky: ['#3088f0', '#c8e8ff'], bg: '#507850', bg2: '#80a0b0', g1: '#50b048', g2: '#48a040', r1: '#f0f0f0', r2: '#e02020', road: '#686870', road2: '#606068', sc: ['tree', 'poplar', 'sign', 'chevron'] },
    { n: 'DESERT ROAD', sky: ['#50a0ff', '#fff0c0'], bg: '#d0a060', bg2: '#e8c080', g1: '#e0c080', g2: '#d8b878', r1: '#f0f0f0', r2: '#e02020', road: '#787070', road2: '#706868', sc: ['cactus', 'rock', 'chevron', 'cactus'] },
    { n: 'SUNSET HILLS', sky: ['#603080', '#ff9040'], bg: '#502838', bg2: '#804050', g1: '#706030', g2: '#685828', r1: '#ffd020', r2: '#202020', road: '#585058', road2: '#504850', sc: ['poplar', 'rock', 'chevron', 'lamp'] },
    { n: 'CITY AT NIGHT', sky: ['#000010', '#101838'], bg: '#101828', bg2: '#182030', g1: '#183018', g2: '#142a14', r1: '#e0e0e0', r2: '#303030', road: '#383840', road2: '#343438', sc: ['lampOn', 'building', 'tower', 'lampOn'], night: true }
  ];

  ArcadeRegistry.register({
    id: 'hangon', title: 'Hang-On', year: 1985, maker: 'Sega',
    width: 320, height: 224, vector: false, pointer: false,
    controls: 'Left/Right: lean \u00b7 Up/Space: throttle \u00b7 Down/X: brake \u00b7 Enter: start',
    marquee: { bg: '#e02020', fg: '#ffffff', accent: '#ffd020' },
    create(api) {
      const W = 320, H = 224, SEG = 200, ROADW = 1500, CAMH = 900, DRAW = 140, FOV = 100;
      const DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
      const PZ = CAMH * DEPTH;
      const MAXV = SEG * 0.6, STAGE_SEGS = 900;
      const audio = api.audio;
      let hi = api.getHiScore(1000000);
      let mode = 'title', modeT = 0, coinFlash = 0, demo = true;
      let segs = [], bikes = [], pos = 0, px = 0, speed = 0, lean = 0, score = 0, timeLeft = 0, lapT = 0, stage = 0, lap = 0;
      let crash = null, shake = 0, msg = null, bgmT = 0, engT = 0, tuck = 0, goalSeg = 0, cpSeen = new Set(), bonusTally = 0, bgScroll = 0, passed = 0;

      // ---------- original rock theme ----------
      const LEAD = [[330, .15], [392, .15], [440, .3], [392, .15], [440, .15], [494, .15], [587, .15], [494, .3], [440, .3],
        [392, .15], [440, .15], [494, .3], [440, .15], [392, .15], [330, .15], [294, .15], [330, .6]];
      const BASS = [[82, .15], [82, .15], [165, .15], [82, .15], [98, .15], [98, .15], [196, .15], [98, .15], [110, .15], [110, .15], [220, .15], [110, .15], [98, .15], [98, .15], [196, .15], [98, .15],
        [82, .15], [82, .15], [165, .15], [82, .15], [73, .15], [73, .15], [147, .15], [73, .15], [82, .15], [82, .15], [165, .15], [82, .15], [82, .6]];
      function playBGM() {
        const l = audio.melody(LEAD, { type: 'square', vol: 0.04 });
        audio.melody(BASS, { type: 'sawtooth', vol: 0.05 });
        for (let i = 0; i < 16; i++) audio.noise(0.04, { vol: 0.05, freq: 8000, type: 'highpass', delay: i * 0.3 });
        return l;
      }

      // ---------- course ----------
      function lastY() { return segs.length ? segs[segs.length - 1].p2y : 0; }
      function addSeg(curve, y, st) { const s = { i: segs.length, curve, p1y: lastY(), p2y: y, sprites: [], st, gate: null }; segs.push(s); }
      function addRoad(enter, hold, leave, curve, hill, st) {
        const sy = lastY(), ey = sy + hill * SEG, total = enter + hold + leave;
        for (let n = 0; n < enter; n++) addSeg(easeIO(0, curve, n / enter), easeIO(sy, ey, n / total), st);
        for (let n = 0; n < hold; n++) addSeg(curve, easeIO(sy, ey, (enter + n) / total), st);
        for (let n = 0; n < leave; n++) addSeg(easeIO(curve, 0, n / leave), easeIO(sy, ey, (enter + hold + n) / total), st);
      }
      function buildCourse() {
        segs = []; bikes = [];
        const sharp = 1 + lap * 0.25;
        for (let st = 0; st < 5; st++) {
          let s = (st * 7703 + lap * 131 + 17) % 233280; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
          const start = segs.length;
          addRoad(8, 24, 8, 0, 0, st);
          segs[start + 4].gate = st === 0 ? 'START' : 'CHECKPOINT';
          while (segs.length - start < STAGE_SEGS) {
            const len = [12, 20, 30, 45][Math.floor(R() * 4)];
            const curve = R() < 0.2 ? 0 : (R() < 0.5 ? -1 : 1) * [2, 3, 5, 7][Math.floor(R() * (2 + Math.min(2, st)))] * sharp;
            const hill = R() < 0.4 ? 0 : (R() - 0.5) * (30 + st * 10);
            addRoad(len, len, len, curve, Math.round(hill), st);
            // warning chevrons before sharp bends
            if (Math.abs(curve) >= 5) for (let k = 0; k < 4; k++) { const sg = segs[segs.length - len * 3 - 1 + k * 3]; if (sg) sg.sprites.push({ img: SPR.chevron, off: curve > 0 ? 1.3 : -1.3, ww: 450 }); }
          }
          addRoad(15, 15, 15, 0, -lastY() / SEG * 0.6, st);
          const th = STAGES[st];
          for (let n = start + 8; n < segs.length; n += 2 + Math.floor(R() * 3)) {
            const type = th.sc[Math.floor(R() * th.sc.length)];
            if (type === 'chevron') continue;
            const side = R() < 0.5 ? -1 : 1;
            const big = type === 'tower' || type === 'building';
            segs[n].sprites.push({ img: SPR[type], off: side * (big ? 2.2 + R() * 1.5 : 1.3 + R() * 1.4), ww: big ? 1400 : 600 });
          }
          // rival riders
          const nb = 14 + st * 3 + lap * 6;
          for (let k = 0; k < nb; k++) {
            const z = (start + 60 + R() * (segs.length - start - 80)) * SEG;
            const lane = (R() - 0.5) * 1.3;
            bikes.push({ z, x: lane, lane, v: MAXV * (0.5 + R() * 0.25 + lap * 0.04), img: RIVALS[Math.floor(R() * RIVALS.length)], wob: R() * 6, pass: false });
          }
        }
        addRoad(10, 40, 10, 0, 0, 4);
        goalSeg = segs.length - 50;
        segs[goalSeg].gate = 'GOAL';
        addRoad(0, 200, 0, 0, 0, 4);
      }
      function segAt(z) { return segs[clamp(Math.floor(z / SEG), 0, segs.length - 1)]; }
      function say(t, f, col) { msg = { t, f: f || 120, col: col || '#ffe040' }; }

      // ---------- flow ----------
      function startTitle() { mode = 'title'; modeT = 0; demo = true; lap = 0; buildCourse(); pos = 0; px = 0; speed = MAXV * 0.5; crash = null; }
      function startRace() {
        demo = false; lap = 0; buildCourse(); pos = 0; px = 0; speed = 0; lean = 0; crash = null; cpSeen = new Set(); passed = 0;
        score = 0; timeLeft = 60; lapT = 0; stage = 0; mode = 'count'; modeT = 0; bgmT = 0;
      }
      function gameOver() { if (score > hi) hi = score; api.setHiScore(hi); mode = 'over'; modeT = 0; }
      function doCrash() {
        if (crash) return;
        crash = { t: 0, dur: 150, spd: speed, side: px > 0 ? 1 : -1 };
        shake = 20;
        audio.noise(1.2, { vol: 0.4, freq: 1800, slideTo: 80 }); audio.tone(140, 0.7, { type: 'sawtooth', vol: 0.14, slideTo: 40 });
      }

      // ---------- riding ----------
      function aiInput() {
        const ahead = segAt(pos + PZ + SEG * 10);
        let target = -ahead.curve * 0.06;
        for (const b of bikes) { const dz = b.z - (pos + PZ); if (dz > 0 && dz < SEG * 12 && Math.abs(b.x - target) < 0.3) target += b.x > px ? -0.35 : 0.35; }
        const sharp = Math.abs(ahead.curve) > 5 && speed > MAXV * 0.8;
        return { left: px > target + 0.05, right: px < target - 0.05, gas: !sharp, brake: false };
      }
      function updateRide(inp) {
        const sp = speed / MAXV;
        const sg = segAt(pos + PZ);
        if (crash) {
          crash.t++;
          speed = Math.max(0, crash.spd * Math.max(0, 1 - crash.t / 50));
          pos += speed;
          if (crash.t >= crash.dur) { crash = null; px = 0; speed = 0; lean = 0; }
        } else {
          let acc;
          if (inp.brake) acc = -MAXV * 0.014;
          else if (inp.gas) acc = MAXV * (sp < 0.5 ? 0.006 : 0.0045 * (1.02 - sp)) ;
          else acc = -MAXV * 0.003;
          speed = clamp(speed + acc, 0, MAXV * (tuck > 60 ? 1.0 : 0.94));
          if (inp.gas && sp > 0.9 && !inp.left && !inp.right) tuck++; else tuck = 0;
          const tl = inp.left ? -1 : inp.right ? 1 : 0;
          lean += clamp(tl - lean, -0.07, 0.07);
          px += lean * 0.034 * (0.25 + sp);
          px -= sp * sp * sg.curve * 0.0105;                    // centrifugal pull
          const off = Math.abs(px) > 1.0;
          if (off) { if (speed > MAXV * 0.3) speed -= MAXV * 0.014; if (api.frame % 5 === 0) shake = 2; }
          px = clamp(px, -3.2, 3.2);
          pos += speed;
          if (off) {
            const cs = segAt(pos + PZ);
            for (const s of cs.sprites) if (Math.abs(px - s.off) < s.ww / ROADW * 0.5 + 0.1) { doCrash(); break; }
          }
          for (const b of bikes) {
            const dz = b.z - (pos + PZ);
            if (dz > -SEG * 0.25 && dz < SEG * 0.5 && Math.abs(b.x - px) < 0.2 && speed > b.v) { doCrash(); b.z += SEG * 2; break; }
          }
          if (!demo) score += Math.round(sp * 280) * 2;
        }
        // rivals
        for (const b of bikes) {
          b.z += b.v; b.wob += 0.012;
          const cs = segAt(b.z);
          const tgt = b.lane - cs.curve * 0.04 + Math.sin(b.wob) * 0.12;
          b.x += clamp(tgt - b.x, -0.012, 0.012);
          if (!demo && !b.pass && b.z < pos + PZ - SEG) { b.pass = true; passed++; score += 1000; }
        }
        if (demo) {
          for (const b of bikes) if (b.z < pos - SEG * 20) b.z += SEG * 400;
          if (pos > (goalSeg - 300) * SEG) { pos = 0; }
        }
        // checkpoints / stage changes
        const ci = Math.floor((pos + PZ) / SEG);
        const gs = segs[clamp(ci, 0, segs.length - 1)];
        if (!demo && gs.gate === 'CHECKPOINT' && !cpSeen.has(gs.i)) {
          cpSeen.add(gs.i); stage = gs.st;
          const ext = Math.max(30, 44 - stage * 2 - lap * 4);
          timeLeft += ext; say('EXTENDED PLAY  +' + ext, 150);
          audio.melody([[659, .1], [880, .1], [1047, .1], [1319, .3]], { type: 'square', vol: 0.12 });
        }
        if (!demo && ++engT % 4 === 0) {
          const f = 40 + sp * 190 + (inp.gas ? 10 : 0);
          audio.tone(f, 0.09, { type: 'sawtooth', vol: 0.035 });
          audio.tone(f * 1.5, 0.07, { type: 'square', vol: 0.01 });
        }
      }

      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (msg && --msg.f <= 0) msg = null;
        if (shake > 0) shake--;
        const human = { left: api.key('ArrowLeft'), right: api.key('ArrowRight'), gas: api.key('ArrowUp') || api.key('Space'), brake: api.key('ArrowDown') || api.key('KeyX') };
        if (mode === 'title') {
          updateRide(aiInput());
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { coinFlash = 0; startRace(); }
            else { coinFlash = 90; audio.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (mode === 'count') {
          if (modeT === 30 || modeT === 90 || modeT === 150) audio.tone(440, 0.25, { type: 'square', vol: 0.15 });
          if (modeT === 210) { audio.tone(880, 0.6, { type: 'square', vol: 0.18 }); mode = 'ride'; modeT = 0; }
          if (modeT % 8 === 0 && human.gas) audio.tone(60 + Math.random() * 60, 0.1, { type: 'sawtooth', vol: 0.04 });
          return;
        }
        if (mode === 'ride') {
          if (--bgmT <= 0) bgmT = Math.round(playBGM() * 60);
          timeLeft -= 1 / 60; lapT += 1 / 60;
          updateRide(human);
          if (pos + PZ >= goalSeg * SEG) {
            mode = 'goal'; modeT = 0; bonusTally = Math.floor(timeLeft);
            audio.melody([[523, .12], [659, .12], [784, .12], [1047, .3], [784, .12], [1047, .5]], { type: 'square', vol: 0.14 });
            return;
          }
          if (timeLeft <= 0) { timeLeft = 0; mode = 'timeup'; modeT = 0; say('GAME OVER', 200, '#ff4040'); audio.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'square', vol: 0.14 }); }
          return;
        }
        if (mode === 'timeup') {
          updateRide({ gas: false, brake: false, left: false, right: false });
          if (modeT > 200) {
            if (api.offerContinue) api.offerContinue(() => { mode = 'ride'; modeT = 0; timeLeft = 45; say('CONTINUE', 90); }, gameOver);
            else gameOver();
          }
          return;
        }
        if (mode === 'goal') {
          updateRide({ gas: false, brake: modeT > 30, left: px > 0.05, right: px < -0.05 });
          if (modeT > 80 && bonusTally > 0 && modeT % 3 === 0) { bonusTally--; score += 50000; audio.tone(1500, 0.03, { vol: 0.07 }); }
          if (modeT > 300 && bonusTally <= 0) {
            // next lap: faster rivals, sharper bends, less time
            const keep = score; lap++; buildCourse(); pos = 0; px = 0; speed = 0; lean = 0; cpSeen = new Set(); stage = 0;
            score = keep; timeLeft = Math.max(45, 60 - lap * 5); mode = 'count'; modeT = 0;
            say('LAP ' + (lap + 1), 180);
          }
          return;
        }
        if (mode === 'over') {
          updateRide({ gas: false, brake: true, left: false, right: false });
          if (modeT > 300 || (modeT > 90 && api.anyPressed('Enter', 'Space'))) startTitle();
        }
      }

      // ---------- rendering ----------
      function project(x, y, z, camX, camY) {
        const cz = z - pos, sc = DEPTH / cz;
        return { x: W / 2 + sc * (x - camX) * W / 2, y: H / 2 - sc * (y - camY) * H / 2, w: sc * ROADW * W / 2, sc, cz };
      }
      function quad(ctx, x1, y1, w1, x2, y2, w2, col) {
        ctx.fillStyle = col; ctx.beginPath();
        const yb = Math.round(y1) + 1, yt = Math.round(y2);
        ctx.moveTo(Math.round(x1 - w1), yb); ctx.lineTo(Math.round(x2 - w2), yt);
        ctx.lineTo(Math.round(x2 + w2), yt); ctx.lineTo(Math.round(x1 + w1), yb);
        ctx.closePath(); ctx.fill();
      }
      function drawBackground(ctx, th) {
        const g = ctx.createLinearGradient(0, 0, 0, H / 2 + 10);
        g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const hz = H / 2 + 6;
        if (th.night) {
          ctx.fillStyle = '#fff'; for (let i = 0; i < 50; i++) ctx.fillRect(((i * 61 - bgScroll * 0.2) % W + W) % W, (i * 37) % 90, 1, 1);
          ctx.fillStyle = '#f0f0d0'; ctx.fillRect(250, 22, 12, 12); ctx.fillRect(248, 24, 16, 8);
          for (let i = 0; i < 24; i++) {
            const bx = ((i * 26 - bgScroll * 0.7) % 624 + 624) % 624 - 40, bh = 20 + (i * 37 % 5) * 9;
            ctx.fillStyle = i & 1 ? th.bg : th.bg2; ctx.fillRect(Math.round(bx), hz - bh, 24, bh + 2);
            ctx.fillStyle = '#ffd040'; for (let y = hz - bh + 3; y < hz - 3; y += 5) for (let x = 3; x < 22; x += 5) if (((x + y + i) * 7) % 5 < 2) ctx.fillRect(Math.round(bx) + x, y, 2, 2);
          }
          return;
        }
        if (th.sky[1] === '#ff9040') { ctx.fillStyle = '#ffe080'; ctx.fillRect(W / 2 - 14 - Math.round(bgScroll * 0.1) % 40, hz - 26, 28, 20); ctx.fillStyle = '#ffd060'; ctx.fillRect(W / 2 - 18 - Math.round(bgScroll * 0.1) % 40, hz - 20, 36, 12); }
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 5; i++) { const cx = ((i * 97 - bgScroll * 0.4) % 400 + 400) % 400 - 40; ctx.fillRect(Math.round(cx), 22 + (i % 3) * 14, 34, 6); ctx.fillRect(Math.round(cx) + 8, 18 + (i % 3) * 14, 16, 4); }
        ctx.fillStyle = th.bg2;
        for (let x = 0; x < W; x += 4) { const wx = x + bgScroll * 0.6; const h = 16 + Math.sin(wx * 0.019) * 10 + Math.sin(wx * 0.053) * 5; ctx.fillRect(x, hz - h, 4, h + 2); }
        ctx.fillStyle = th.bg;
        if (th.sea) ctx.fillRect(0, hz - 5, W, 7);
        else for (let x = 0; x < W; x += 4) { const wx = x + bgScroll; const h = 8 + Math.sin(wx * 0.031 + 1) * 6; ctx.fillRect(x, hz - h, 4, h + 2); }
      }
      function drawScaled(ctx, img, cx, by, w, clip) {
        if (w < 1) return;
        const h = w * img.height / img.width, x = cx - w / 2, y = by - h;
        if (y >= clip || x > W || x + w < 0) return;
        const visH = Math.min(h, clip - y), srcH = img.height * visH / h;
        if (srcH < 0.5) return;
        ctx.drawImage(img, 0, 0, img.width, srcH, Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(visH)));
      }
      function renderRoad(ctx) {
        const baseI = Math.floor(pos / SEG);
        const base = segs[clamp(baseI, 0, segs.length - 1)];
        const bp = (pos % SEG) / SEG;
        const ps = segAt(pos + PZ), pp = ((pos + PZ) % SEG) / SEG;
        const camY = lerp(ps.p1y, ps.p2y, pp) + CAMH, camXw = px * ROADW;
        drawBackground(ctx, STAGES[ps.st]);
        let x = 0, dx = -(base.curve * bp), maxy = H;
        const list = [];
        for (let n = 0; n < DRAW; n++) {
          const i = baseI + n; if (i >= segs.length) break;
          if (i < 0) continue;
          const s = segs[i], z1 = i * SEG, z2 = (i + 1) * SEG;
          if (z1 - pos < 1) { x += dx; dx += s.curve; continue; }
          const p1 = project(x, s.p1y, z1, camXw, camY), p2 = project(x + dx, s.p2y, z2, camXw, camY);
          x += dx; dx += s.curve;
          s.clip = maxy; s.scr = p1; list.push(s);
          if (p2.y >= maxy || p2.y >= p1.y) continue;
          const th = STAGES[s.st], alt = (i >> 2) & 1;
          const top = Math.max(0, Math.round(p2.y)), bot = Math.min(H, Math.round(p1.y) + 1);
          ctx.fillStyle = alt ? th.g1 : th.g2; ctx.fillRect(0, top, W, bot - top);
          quad(ctx, p1.x, p1.y, p1.w * 1.14, p2.x, p2.y, p2.w * 1.14, alt ? th.r1 : th.r2);
          quad(ctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, alt ? th.road : th.road2);
          if (alt) quad(ctx, p1.x, p1.y, p1.w * 0.025, p2.x, p2.y, p2.w * 0.025, th.night ? '#c0c0a0' : '#f0f0f0');
          if (th.night) { quad(ctx, p1.x - p1.w * 0.92, p1.y, p1.w * 0.02, p2.x - p2.w * 0.92, p2.y, p2.w * 0.02, '#a0a080'); quad(ctx, p1.x + p1.w * 0.92, p1.y, p1.w * 0.02, p2.x + p2.w * 0.92, p2.y, p2.w * 0.02, '#a0a080'); }
          maxy = p2.y;
        }
        for (let k = list.length - 1; k >= 0; k--) {
          const s = list[k], p = s.scr;
          for (const sp of s.sprites) drawScaled(ctx, sp.img, p.x + sp.off * p.w, p.y, sp.ww * p.sc * W / 2, s.clip);
          if (s.gate) drawGate(ctx, s, p);
          for (const b of bikes) if (Math.floor(b.z / SEG) === s.i) drawScaled(ctx, b.img, p.x + b.x * p.w, p.y, 260 * p.sc * W / 2, s.clip);
        }
      }
      function drawGate(ctx, s, p) {
        const g = s.gate;
        const left = p.x - p.w * 1.25, right = p.x + p.w * 1.25, pw = Math.max(1, p.w * 0.06);
        const top = p.y - p.w * 1.0, bh = p.w * 0.24;
        if (top > s.clip) return;
        ctx.fillStyle = '#909090';
        ctx.fillRect(Math.round(left), Math.round(top), Math.round(pw), Math.round(Math.min(s.clip, p.y) - top));
        ctx.fillRect(Math.round(right - pw), Math.round(top), Math.round(pw), Math.round(Math.min(s.clip, p.y) - top));
        ctx.fillStyle = g === 'GOAL' ? '#e02020' : g === 'START' ? '#202020' : '#f0f0f0';
        ctx.fillRect(Math.round(left), Math.round(top), Math.round(right - left), Math.round(bh));
        if (g === 'START' || g === 'GOAL') { ctx.fillStyle = g === 'START' ? '#f0f0f0' : '#ffffff'; const n = 16; for (let i = 0; i < n; i += 2) ctx.fillRect(Math.round(left + (right - left) * i / n), Math.round(top + bh), Math.max(1, Math.round((right - left) / n)), Math.max(1, Math.round(bh * 0.25))); }
        const sc = Math.max(1, Math.floor(bh / 9));
        if (bh > 6) text(ctx, g, p.x, Math.round(top + (bh - 7 * sc) / 2), g === 'CHECKPOINT' ? '#e02020' : '#fff', sc, 'center');
      }
      function drawPlayer(ctx) {
        const sp = speed / MAXV;
        const cx = W / 2, by = H - 8;
        let ang = lean * 0.55, img = PBIKE[tuck > 30 ? 1 : 0], dx = 0, dy = 0;
        if (crash) {
          const t = crash.t;
          ang = crash.side * Math.min(1.5, t * 0.06);
          dx = crash.side * Math.min(60, t * 0.8); dy = 0;
          // the rider tumbles away from the bike
          ctx.save(); ctx.translate(cx + dx * 0.4 - crash.side * t * 0.6, by - 30 - Math.max(0, Math.sin(Math.min(1, t / 60) * Math.PI) * 30)); ctx.rotate(t * 0.2);
          ctx.fillStyle = '#e02020'; ctx.fillRect(-5, -6, 10, 12); ctx.fillStyle = '#ffffff'; ctx.fillRect(-4, -12, 8, 7);
          ctx.restore();
          img = CRASHBIKE;
          if (t & 4) { ctx.fillStyle = '#ffa020'; ctx.fillRect(cx + dx - 6, by - 6, 12, 4); }
        }
        const bob = speed > 1 && !crash ? ((api.frame >> 1) & 1) * (sp > 0.5 ? 1 : 0) : 0;
        ctx.save();
        ctx.translate(cx + dx, by - bob + dy);
        ctx.rotate(ang);
        ctx.drawImage(img, -26, -88, 52, 88);
        ctx.restore();
        if (Math.abs(px) > 1.0 && speed > 2 && (api.frame & 2)) { ctx.fillStyle = 'rgba(160,140,100,0.7)'; ctx.fillRect(cx - 18, by - 6, 8, 4); ctx.fillRect(cx + 10, by - 8, 8, 4); }
      }
      function drawHUD(ctx) {
        const kmh = Math.round(speed / MAXV * 280);
        textS(ctx, 'TOP', 6, 4, '#ff4040'); textS(ctx, String(Math.max(hi, score)), 30, 4, '#fff');
        textS(ctx, 'SCORE', 6, 14, '#ff4040'); textS(ctx, String(score), 42, 14, '#fff');
        textS(ctx, 'TIME', W / 2, 2, '#ffe040', 1, 'center');
        const tl = Math.ceil(timeLeft);
        textS(ctx, String(Math.max(0, tl)), W / 2, 11, tl <= 10 && (api.frame & 16) ? '#ff3030' : '#ffe040', 3, 'center');
        textS(ctx, 'SPEED', 220, 4, '#7ff'); textS(ctx, kmh + ' KM', 256, 4, '#fff');
        textS(ctx, 'STAGE ' + (stage + 1) + '  LAP ' + (lap + 1), 220, 14, '#fff');
        // rev bar
        const bars = Math.round(kmh / 280 * 24);
        for (let i = 0; i < 24; i++) { ctx.fillStyle = i < bars ? (i < 14 ? '#40ff40' : i < 20 ? '#ffe040' : '#ff3030') : '#202820'; ctx.fillRect(6 + i * 4, H - 14, 3, 8); }
        if (tuck > 60) textS(ctx, 'TUCK', 108, H - 14, '#ff8040');
        // course progress bar
        ctx.fillStyle = '#202020'; ctx.fillRect(W - 92, H - 12, 86, 5);
        const prog = clamp((pos + PZ) / (goalSeg * SEG), 0, 1);
        for (let s = 1; s < 5; s++) { ctx.fillStyle = '#808080'; ctx.fillRect(W - 92 + Math.round(86 * s / 5), H - 14, 1, 9); }
        ctx.fillStyle = '#ff4040'; ctx.fillRect(W - 92, H - 12, Math.round(86 * prog), 5);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const ps = segAt(pos + PZ);
        bgScroll += ps.curve * speed / MAXV * 0.9;
        stage = mode === 'title' ? ps.st : stage;
        ctx.save();
        if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * shake * 0.5), Math.round((Math.random() - 0.5) * shake * 0.3));
        renderRoad(ctx);
        drawPlayer(ctx);
        ctx.restore();
        if (mode === 'title') { renderTitle(ctx); return; }
        drawHUD(ctx);
        if (mode === 'count') {
          const n = 3 - Math.floor((modeT - 30) / 60);
          if (modeT >= 30) textS(ctx, n > 0 ? String(n) : 'GO!', W / 2, 70, n > 0 ? '#fff' : '#40ff40', 4, 'center');
          textS(ctx, STAGES[0].n, W / 2, 110, '#7ff', 1, 'center');
        }
        if (msg && (msg.f > 30 || (msg.f & 4))) textS(ctx, msg.t, W / 2, 56, msg.col, msg.t.length > 12 ? 1 : 2, 'center');
        if (mode === 'ride' && modeT < 150 && stage === 0) textS(ctx, 'LEAN INTO THE CURVES!', W / 2, 70, '#fff', 1, 'center');
        if (mode === 'goal') {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(50, 60, 220, 70);
          textS(ctx, 'GOAL!', W / 2, 68, '#ffe040', 3, 'center');
          textS(ctx, 'RIVALS PASSED ' + passed, W / 2, 98, '#fff', 1, 'center');
          textS(ctx, 'TIME BONUS ' + bonusTally, W / 2, 112, '#7ff', 1, 'center');
        }
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(60, 80, 200, 50);
          textS(ctx, 'GAME OVER', W / 2, 88, '#ff4040', 2, 'center');
          textS(ctx, 'SCORE ' + score, W / 2, 110, '#fff', 1, 'center');
        }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(160,0,0,0.55)'; ctx.fillRect(0, 34, W, 90);
        textS(ctx, 'HANG-ON', W / 2, 44, ['#ffffff', '#ffffff', '#fff0f0', '#ffd0d0', '#ffb0b0', '#ff9090', '#ff7070'], 5, 'center');
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 94, '#ffe040', 1, 'center'); }
        else if (api.credits === 0) { if ((api.frame >> 4) & 1) textS(ctx, 'INSERT COIN', W / 2, 94, '#fff', 1, 'center'); }
        else textS(ctx, 'PUSH START BUTTON', W / 2, 94, (api.frame >> 5) & 1 ? '#fff' : '#ffe040', 1, 'center');
        textS(ctx, 'TOP SCORE ' + hi, W / 2, 108, '#7ff', 1, 'center');
        textS(ctx, '\u00a9 1985 SEGA', W / 2, H - 22, '#fff', 1, 'center');
        textS(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#fff');
      }
      startTitle();
      return { update, render, destroy() { api.setHiScore(hi); } };
    }
  });
})();
