// Chase H.Q. (Taito, 1988) \u2014 from-scratch recreation for the MAME32 Game Room.
// Pseudo-3D police pursuit: catch the criminal's car before the clock runs out, then ram it until its damage
// bar is full. Three turbo boosts per stage, civilian traffic, road forks and Nancy's radio briefings.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '"': [10, 10, 0, 0, 0, 0, 0], '#': [10, 31, 10, 10, 31, 10, 0]
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
  function stext(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const easeIn = (a, b, p) => a + (b - a) * Math.pow(p, 2);
  const easeInOut = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);

  const W = 320, H = 240;
  const SEGL = 200, ROADW = 1100, CAMH = 1000, DRAW = 150;
  const CAMD = 1 / Math.tan(50 * Math.PI / 180), PLZ = CAMH * CAMD;
  const MAXS = SEGL * 60, FORKOFF = 3.4, CARW = 0.42, LANES = 3;
  const FZA = 40, FZB = 190;

  const THEMES = [
    { sky: ['#2a66c8', '#a8dcff'], far: '#7b9cc8', near: '#4c8a58', grass: ['#3c9a2e', '#34892a'], rumble: ['#f0f0f0', '#d02020'], road: ['#6c6c6c', '#666666'], lane: '#f4f4f4', scen: ['palm', 'palm', 'billboard', 'palm', 'lamp'], night: false },
    { sky: ['#d8642a', '#ffd690'], far: '#a65a34', near: '#c27c42', grass: ['#d6ae62', '#cba254'], rumble: ['#ffffff', '#303030'], road: ['#7a726a', '#736b63'], lane: '#fff8e0', scen: ['cactus', 'rock', 'cactus', 'billboard'], night: false },
    { sky: ['#03031a', '#20124a'], far: '#14142c', near: '#1c1c34', grass: ['#262e38', '#212830'], rumble: ['#c8c8c8', '#c02828'], road: ['#3c3c46', '#383842'], lane: '#e8e8a0', scen: ['lamp', 'building', 'lamp', 'billboard', 'building'], night: true },
    { sky: ['#4a88d8', '#d6ecff'], far: '#6a80a0', near: '#2c5a32', grass: ['#2e7a2a', '#286c25'], rumble: ['#ffffff', '#2050c0'], road: ['#626262', '#5c5c5c'], lane: '#f0f0f0', scen: ['tree', 'tree', 'rock', 'tree'], night: false },
    { sky: ['#3a0c5a', '#ff7a4c'], far: '#5a2c58', near: '#3a2446', grass: ['#4c6a32', '#44602c'], rumble: ['#ffffff', '#e0a000'], road: ['#5a5262', '#544c5c'], lane: '#ffe0c0', scen: ['palm', 'lamp', 'billboard', 'palm'], night: false }
  ];
  const STAGES = [
    { who: 'RICK "RAZOR" DUNN', car: 'RED CONVERTIBLE', crime: 'ARMED ROBBERY', col: '#e02424', dark: '#801010', kind: 'car', area: 'COASTAL HIGHWAY' },
    { who: 'THE DALTON TWINS', car: 'YELLOW 4X4', crime: 'BANK HEIST', col: '#f0d020', dark: '#8a7408', kind: 'van', area: 'DESERT ROUTE 9' },
    { who: 'MAXINE KANE', car: 'WHITE COUPE', crime: 'JEWEL THEFT', col: '#f2f2f2', dark: '#8a8a96', kind: 'car', area: 'DOWNTOWN AT NIGHT' },
    { who: 'BIG SAL MORELLI', car: 'BLUE SEDAN', crime: 'SMUGGLING', col: '#2850d8', dark: '#102878', kind: 'van', area: 'MOUNTAIN PASS' },
    { who: '"THE GHOST"', car: 'PURPLE SUPERCAR', crime: 'KIDNAPPING', col: '#a030d0', dark: '#501070', kind: 'car', area: 'SUNSET BOULEVARD' }
  ];
  const TRAFFIC_COLS = [['#3070e0', '#183878'], ['#20a040', '#105020'], ['#e0e0e0', '#808080'], ['#e08020', '#804010'], ['#c03030', '#601818'], ['#40c0c0', '#206060']];

  ArcadeRegistry.register({
    id: 'chasehq', title: 'Chase H.Q.', year: 1988, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up: gas \u00b7 Down: brake \u00b7 Left/Right: steer \u00b7 Space: turbo \u00b7 X: gear LO/HI \u00b7 Enter: start',
    marquee: { bg: '#101018', fg: '#ffd200', accent: '#ff2a2a' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(300000);
      let mode = 'title', mt = 0, coinFlash = 0, overT = 0;
      let g = null;
      let segs = [], N = 1, theme = THEMES[0];
      let seed = 1;
      const srnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

      const snd = {
        crash() { au.noise(0.35, { vol: 0.25, freq: 1800, slideTo: 200 }); au.tone(90, 0.2, { type: 'sawtooth', vol: 0.12, slideTo: 50 }); },
        bump() { au.noise(0.12, { vol: 0.14, freq: 900 }); },
        turbo() { au.noise(0.8, { vol: 0.18, freq: 600, slideTo: 3000, type: 'bandpass' }); au.tone(200, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 800 }); },
        gear() { au.tone(300, 0.05, { type: 'square', vol: 0.08 }); },
        radio() { au.noise(0.12, { vol: 0.08, freq: 3000, type: 'bandpass' }); au.tone(1200, 0.05, { type: 'square', vol: 0.05, delay: 0.12 }); },
        blip() { au.tone(1000, 0.025, { type: 'square', vol: 0.04 }); },
        beep() { au.tone(880, 0.08, { type: 'square', vol: 0.1 }); },
        siren(f) { au.tone(f ? 960 : 720, 0.2, { type: 'triangle', vol: 0.05 }); },
        go() { au.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]], { type: 'square', vol: 0.12 }); },
        arrest() { au.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.12], [784, 0.12], [1047, 0.4]], { type: 'square', vol: 0.13 }); },
        fail() { au.melody([[330, 0.25], [311, 0.25], [294, 0.25], [262, 0.6]], { type: 'square', vol: 0.12 }); },
        skid() { au.noise(0.15, { vol: 0.06, freq: 2500, type: 'highpass' }); }
      };

      // ---------------- track ----------------
      function lastY() { return segs.length ? segs[segs.length - 1].y2 : 0; }
      function addSeg(curve, y, fork, fz, fzOff) {
        segs.push({ i: segs.length, curve, y1: lastY(), y2: y, fork: fork || 0, fz: fz || 0, fzOff: fzOff || 0, spr: [] });
      }
      function addRoad(enter, hold, leave, curve, dy) {
        const sy = lastY(), ey = sy + dy * SEGL, tot = enter + hold + leave;
        for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(sy, ey, n / tot));
        for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(sy, ey, (enter + n) / tot));
        for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(sy, ey, (enter + hold + n) / tot));
      }
      function addFork() {
        const y = lastY();
        for (let n = 0; n < FZA; n++) addSeg(0, y, easeInOut(0, 1, n / FZA), 1, n);
        for (let n = 0; n < FZB; n++) addSeg(0, y, 1, 2, FZA + n);
      }
      function buildTrack(st) {
        segs = []; seed = 1000 + st * 77;
        const sc = theme.scen;
        addRoad(10, 40, 10, 0, 0);
        let pieces = 0;
        while (segs.length < 2300) {
          pieces++;
          if (pieces === 6 || pieces === 15) { addRoad(10, 20, 10, 0, -lastY() / SEGL); addFork(); continue; }
          const r = srnd();
          const len = 25 + Math.floor(srnd() * 50);
          const curve = r < 0.25 ? 0 : (srnd() < 0.5 ? -1 : 1) * (1.5 + Math.floor(srnd() * 3) * 1.2);
          const hill = srnd() < 0.5 ? 0 : (srnd() - 0.5) * 60;
          addRoad(15, len, 15, curve, clamp(hill, -40 - lastY() / SEGL, 40 - lastY() / SEGL));
        }
        addRoad(20, 20, 20, 0, -lastY() / SEGL);
        N = segs.length;
        // scenery
        for (let i = 0; i < N; i++) {
          const s = segs[i];
          if (s.fz === 1 && s.fzOff === 26) s.spr.push({ k: 'arrows', off: 0, mid: true });
          if (s.fz === 2 && s.fzOff % 12 === 0) s.spr.push({ k: theme.night ? 'lamp' : 'tree', off: 0, mid: true });
          if (i % 7 === 0 && i > 20) {
            const k = sc[Math.floor(srnd() * sc.length)];
            const off = 1.5 + srnd() * 0.9 + (k === 'building' ? 1.0 : 0);
            s.spr.push({ k, off: srnd() < 0.5 ? -off : off });
            if (srnd() < 0.4) { const k2 = sc[Math.floor(srnd() * sc.length)]; s.spr.push({ k: k2, off: (s.spr[s.spr.length - 1].off < 0 ? 1 : -1) * (1.6 + srnd()) }); }
          }
          if (i > 20 && i % 50 === 25 && s.fz === 0 && Math.abs(s.curve) > 1) s.spr.push({ k: s.curve > 0 ? 'chevR' : 'chevL', off: s.curve > 0 ? 1.35 : -1.35 });
        }
      }
      const segAt = z => segs[((Math.floor(z / SEGL) % N) + N) % N];
      function forkKey(abs) { const s = segs[((abs % N) + N) % N]; return s.fz ? abs - s.fzOff : -1; }
      function getFork(key) {
        let f = g.forks[key];
        if (!f) f = g.forks[key] = { correct: Math.random() < 0.5 ? -1 : 1, committed: false, announced: false };
        return f;
      }
      function forkF(abs) {
        const s = segs[((abs % N) + N) % N]; if (!s.fz) return 0;
        const f = g.forks[abs - s.fzOff]; if (f && f.committed) return 0;
        return s.fork;
      }

      // ---------------- run state ----------------
      function newRun(demo) {
        g = { demo, stage: 0, loop: 0, score: 0, credits: 0 };
        startStage(demo ? 'chase' : 'brief');
      }
      function startStage(phase) {
        theme = THEMES[g.stage % THEMES.length];
        buildTrack(g.stage + g.loop * 5);
        const diff = g.stage + g.loop * 5;
        Object.assign(g, {
          pos: 0, x: 0, speed: 0, gear: 0, turbos: 3, turboT: 0, time: 60, phase, pt: 0, steer: 0, bounce: 0,
          forks: {}, lowGearT: 0, shake: 0, parts: [], skyX: 0, msgs: [], msg: null, offroad: false, engT: 0, lowSec: 99,
          crimSpeed: MAXS * Math.min(0.8, 0.63 + diff * 0.02), dmgBar: 0, hits: 0, bonus: null, sirenT: 0
        });
        const gap = 80000 + diff * 7000;
        g.crim = { z: PLZ + gap, x: 0, tx: 0, speed: g.crimSpeed, dmg: 0, cd: 0, retarget: 0, pull: false };
        g.traffic = [];
        for (let i = 0; i < 11; i++) { const c = newCar(); c.z = PLZ + 4000 + i * 5000 + Math.random() * 2000; fixCarZone(c); g.traffic.push(c); }
        if (phase === 'brief') {
          const s = STAGES[g.stage];
          g.brief = [
            'THIS IS NANCY AT CHASE H.Q.',
            'WE\'VE GOT AN EMERGENCY HERE.',
            'SUSPECT: ' + s.who,
            'WANTED FOR ' + s.crime + '.',
            'HE\'S IN A ' + s.car,
            'HEADING FOR THE ' + s.area + '.'
          ];
          snd.radio();
        }
      }
      function newCar() {
        const c = TRAFFIC_COLS[Math.floor(Math.random() * TRAFFIC_COLS.length)];
        return { z: 0, x: [-0.66, 0, 0.66][Math.floor(Math.random() * 3)], speed: MAXS * (0.28 + Math.random() * 0.22), col: c[0], dark: c[1], kind: Math.random() < 0.22 ? 'truck' : 'car', drift: 0 };
      }
      function fixCarZone(c) { let guard = 0; while (segAt(c.z).fz && guard++ < 400) c.z += SEGL; }
      function say(t, dur) { g.msgs.push({ text: t, dur: dur || 200, t: 0 }); }
      function addScore(n) { if (g.demo) return; g.score += n; if (g.score > hi) hi = g.score; }

      // ---------------- input ----------------
      function readInput() {
        if (g.demo) return demoInput();
        return { l: api.key('ArrowLeft'), r: api.key('ArrowRight'), gas: api.key('ArrowUp'), brake: api.key('ArrowDown'), turbo: api.pressed('Space') || api.pressed('KeyZ'), gear: api.pressed('KeyX') };
      }
      function demoInput() {
        const pw = g.pos + PLZ;
        let tx = 0;
        const abs = Math.floor(pw / SEGL);
        const f = forkF(abs + 8);
        if (f > 0) { const fk = getFork(forkKey(abs + 8)); tx = fk.correct * FORKOFF * f; }
        else {
          tx = g.demoLane === undefined ? 0 : g.demoLane;
          for (const c of g.traffic) {
            const dz = c.z - pw;
            if (dz > 0 && dz < 3500 && Math.abs(c.x - g.x) < 0.5) { g.demoLane = c.x > 0 ? -0.6 : 0.6; tx = g.demoLane; break; }
          }
          if (g.phase === 'ram') { const dz = g.crim.z - pw; if (dz > 0 && dz < 4000) tx = g.crim.x; }
        }
        tx -= segAt(pw).curve * 0.05;
        return { l: g.x > tx + 0.06, r: g.x < tx - 0.06, gas: true, brake: false, turbo: (api.frame % 600) === 200, gear: g.gear === 0 && g.speed > MAXS * 0.5 };
      }

      // ---------------- update ----------------
      function updatePlayer(dt, inp, ctrl) {
        const pw = g.pos + PLZ, pabs = Math.floor(pw / SEGL), pseg = segAt(pw);
        const sp = g.speed / MAXS;
        if (ctrl) {
          if (inp.gear) { g.gear ^= 1; snd.gear(); }
          if (inp.turbo && g.turbos > 0 && g.turboT <= 0 && g.speed > MAXS * 0.15) { g.turbos--; g.turboT = 4; snd.turbo(); if (!g.demo) say('TURBO!', 60); }
        }
        if (g.turboT > 0) g.turboT -= dt;
        const top = g.turboT > 0 ? MAXS * 1.25 : g.gear ? MAXS : MAXS * 0.62;
        if (ctrl && inp.gas) {
          let acc = g.turboT > 0 ? MAXS * 0.9 : g.gear ? (g.speed < MAXS * 0.4 ? MAXS * 0.1 : MAXS * 0.24) : MAXS * 0.42;
          if (g.speed < top) g.speed = Math.min(top, g.speed + acc * dt);
          else g.speed -= MAXS * 0.3 * dt;
        } else if (ctrl && inp.brake) g.speed -= MAXS * 1.3 * dt;
        else g.speed -= MAXS * (ctrl ? 0.18 : 0.6) * dt;
        if (g.speed > top && !(ctrl && inp.gas)) g.speed -= MAXS * 0.2 * dt;
        // steering
        const dx = dt * 2.3 * Math.min(1, sp * 1.6);
        g.steer = 0;
        if (ctrl && inp.l) { g.x -= dx; g.steer = -1; }
        if (ctrl && inp.r) { g.x += dx; g.steer = 1; }
        g.x -= dx * sp * pseg.curve * 0.28;
        // road / fork geometry
        const f = forkF(pabs);
        const centers = f > 0 ? [-FORKOFF * f, FORKOFF * f] : [0];
        let dist = 99; for (const c of centers) dist = Math.min(dist, Math.abs(g.x - c));
        g.offroad = dist > 1.0;
        if (g.offroad) {
          if (g.speed > MAXS * 0.25) g.speed -= MAXS * 0.8 * dt;
          g.bounce = (api.frame & 2) ? 2 : 0;
          if (g.speed > MAXS * 0.2 && api.frame % 8 === 0) { au.noise(0.08, { vol: 0.06, freq: 400 }); addSmoke(W / 2 + (Math.random() - 0.5) * 70, H - 16, '#9a8a6a'); }
        } else g.bounce = 0;
        if (f > 0.6 && Math.abs(g.x) < 0.35 && g.speed > MAXS * 0.1) {
          g.speed *= 0.3; g.x = (g.x < 0 ? -1 : 1) * 0.45; g.shake = 14; snd.crash(); sparks(W / 2, H - 30, 14);
        }
        g.x = clamp(g.x, -FORKOFF - 2.4, FORKOFF + 2.4);
        g.speed = clamp(g.speed, 0, MAXS * 1.3);
        g.pos += g.speed * dt;
        g.skyX += pseg.curve * sp * dt * 18;
        // fork commit + announce
        const k = forkKey(pabs);
        if (k >= 0 && pseg.fz === 2 && pseg.fzOff >= FZA + 2) {
          const fk = getFork(k);
          if (!fk.committed) {
            fk.committed = true;
            const chosen = g.x < 0 ? -1 : 1;
            g.x -= chosen * FORKOFF;
            if (chosen !== fk.correct && !g.demo) {
              if (g.phase === 'chase') { g.crim.z += 14000; say('THAT\'S THE LONG WAY! STEP ON IT!', 180); }
              else if (g.phase === 'ram') say('HE CUT ACROSS! STAY ON HIM!', 150);
              snd.radio();
            } else if (!g.demo && (g.phase === 'chase' || g.phase === 'ram')) { say('GOOD! YOU\'RE RIGHT BEHIND HIM!', 140); snd.radio(); }
          }
        }
        const ak = forkKey(pabs + 230);
        if (ak >= 0 && !g.demo) {
          const fk = getFork(ak);
          if (!fk.announced) { fk.announced = true; if (g.phase === 'chase' || g.phase === 'ram') { say('HE TOOK THE ' + (fk.correct < 0 ? 'LEFT' : 'RIGHT') + ' FORK!', 220); snd.radio(); } }
        }
        // engine
        if (--g.engT <= 0) { g.engT = 5; if (g.speed > 10) au.tone(50 + sp * 110 + (g.gear ? 0 : 40), 0.09, { type: 'sawtooth', vol: 0.025 + (g.turboT > 0 ? 0.02 : 0) }); }
        if (g.turboT > 0 && api.frame % 3 === 0) addFlame();
      }
      function updateTraffic(dt) {
        const pw = g.pos + PLZ;
        for (const c of g.traffic) {
          c.z += c.speed * dt;
          if (c.drift) { c.x += c.drift * dt; if (Math.abs(c.x) > 0.7) c.drift = -c.drift; if (Math.random() < 0.01) c.drift = 0; }
          else if (Math.random() < 0.0015) c.drift = (Math.random() < 0.5 ? -1 : 1) * 0.25;
          const dz = c.z - pw;
          if (dz < -1200 || dz > DRAW * SEGL * 1.4 || segAt(c.z).fz) {
            Object.assign(c, newCar());
            c.z = pw + SEGL * (DRAW * 0.6 + Math.random() * DRAW * 0.35);
            fixCarZone(c);
            continue;
          }
          if (dz > -60 && dz < 180 && Math.abs(c.x - g.x) < CARW && g.speed > c.speed - 600) {
            g.speed = Math.max(c.speed * 0.8, g.speed * 0.55);
            c.z = pw + 190; c.speed += 300;
            c.x += (c.x > g.x ? 1 : -1) * 0.12;
            g.shake = 10; snd.crash(); sparks(W / 2 + (c.x - g.x) * 120, H - 34, 10);
          }
        }
      }
      function crimX() {
        const c = g.crim, abs = Math.floor(c.z / SEGL), f = forkF(abs);
        if (f > 0) return c.x + getFork(forkKey(abs)).correct * FORKOFF * f;
        return c.x;
      }
      function updateCrim(dt) {
        const c = g.crim, pw = g.pos + PLZ;
        if (c.pull) {
          c.speed = Math.max(0, c.speed - MAXS * 0.5 * dt); c.x += (1.35 - c.x) * dt * 1.5;
          c.z += c.speed * dt; return;
        }
        let sp = g.crimSpeed;
        if (g.phase === 'ram') sp *= 1 - c.dmg / 100 * 0.12;
        c.speed += (sp - c.speed) * dt;
        c.z += c.speed * dt;
        // weave, dodge traffic, block the player
        if (--c.retarget <= 0) { c.retarget = 50 + Math.random() * 80; c.tx = (Math.random() - 0.5) * 1.4; }
        const dz = c.z - pw;
        if (g.phase === 'ram' && dz > 0 && dz < 1500 && Math.random() < 0.02) c.tx = clamp(g.x + (Math.random() < 0.5 ? -0.5 : 0.5), -0.7, 0.7);
        for (const t of g.traffic) { const d = t.z - c.z; if (d > 0 && d < 900 && Math.abs(t.x - c.x) < 0.5) { c.tx = t.x > 0 ? -0.6 : 0.6; break; } }
        c.x += clamp(c.tx - c.x, -1, 1) * dt * 1.6;
        c.x = clamp(c.x, -0.75, 0.75);
        if (c.cd > 0) c.cd--;
        if (g.phase === 'ram') {
          const cx = crimX();
          if (c.cd <= 0 && dz > -140 && dz < 220 && Math.abs(cx - g.x) < CARW + 0.02) {
            const impact = Math.max(0, g.speed - c.speed);
            let d = 5 + impact / MAXS * 40;
            if (g.turboT > 0) d *= 1.6;
            if (dz < 60) d *= 0.75;
            c.dmg = Math.min(100, c.dmg + d); g.hits++;
            addScore(5000);
            g.speed = Math.min(g.speed, c.speed * 0.85);
            c.z = Math.max(c.z, pw + 240);
            c.x = clamp(c.x + (cx >= g.x ? 1 : -1) * 0.2, -0.8, 0.8);
            c.cd = 24; g.shake = 16;
            snd.crash(); sparks(W / 2 + (cx - g.x) * 90, H - 60, 22);
            if (c.dmg >= 100) { arrest(); }
          }
          if (c.dmg > 45 && api.frame % 6 === 0 && dz > 0 && dz < DRAW * SEGL) c.smoke = true;
        }
      }
      function arrest() {
        g.phase = 'arrest'; g.pt = 0; g.crim.pull = true;
        say('GOT HIM! NICE WORK!', 240); snd.arrest();
      }
      function stepGame(dt) {
        g.pt++;
        if (g.msg) { g.msg.t++; if (!g.demo && g.msg.t * 1.5 < g.msg.text.length && (g.msg.t & 3) === 0) snd.blip(); if (g.msg.t > g.msg.dur) g.msg = null; }
        if (!g.msg && g.msgs.length) { g.msg = g.msgs.shift(); g.msg.t = 0; }
        if (g.shake > 0) g.shake--;
        updParts();
        const inp = readInput();
        if (g.phase === 'brief') {
          if (g.pt % 4 === 0 && g.pt < 330) snd.blip();
          if (g.pt > 420 || (g.pt > 60 && api.anyPressed('Enter', 'Space'))) { g.phase = 'go'; g.pt = 0; snd.go(); say('LET\'S GO, MR. DRIVER!', 150); }
          return;
        }
        const ctrl = g.phase === 'go' || g.phase === 'chase' || g.phase === 'ram';
        updatePlayer(dt, inp, ctrl);
        updateTraffic(dt);
        updateCrim(dt);
        const gap = g.crim.z - (g.pos + PLZ);
        if (!g.demo && g.gear === 0 && g.speed > MAXS * 0.6 && ++g.lowGearT === 150) say('SHIFT INTO HIGH GEAR! PRESS X!', 160);
        if (g.gear) g.lowGearT = 0;
        if (g.phase === 'go') { if (g.pt > 60) { g.phase = 'chase'; g.pt = 0; } return; }
        if (g.phase === 'chase' || g.phase === 'ram') {
          if (!g.demo) {
            g.time -= dt;
            const sec = Math.ceil(g.time);
            if (sec <= 10 && sec !== g.lowSec && sec > 0) { g.lowSec = sec; snd.beep(); if (sec === 10) say('HURRY UP! TIME IS RUNNING OUT!', 120); }
          }
          if (g.phase === 'chase' && gap < 1600) {
            g.phase = 'ram'; g.pt = 0; if (!g.demo) g.time = Math.max(g.time, 0) + 60; g.lowSec = 99;
            say('THERE HE IS! RAM HIM TILL HE GIVES UP!', 200); snd.radio();
            au.melody([[659, 0.08], [880, 0.08], [659, 0.08], [880, 0.16]], { type: 'square', vol: 0.1 });
          }
          if (g.phase === 'ram' && ++g.sirenT % 24 === 0) snd.siren((g.sirenT / 24) & 1);
          if (g.time <= 0 && !g.demo) {
            g.time = 0; g.resume = g.phase; g.phase = 'timeup'; g.pt = 0; snd.fail();
          }
          return;
        }
        if (g.phase === 'arrest') {
          if (g.pt > 260) {
            const tb = Math.floor(g.time) * 10000;
            g.bonus = { clear: 100000 * (1 + g.loop), time: tb, hits: g.hits };
            addScore(g.bonus.clear + tb); if (!g.demo) api.setHiScore(g.score);
            g.phase = 'tally'; g.pt = 0;
          }
          return;
        }
        if (g.phase === 'tally') {
          if (g.pt > 300 || (g.pt > 90 && api.anyPressed('Enter', 'Space'))) {
            if (g.demo) { newRun(true); return; }
            g.stage++;
            if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; }
            startStage('brief');
          }
          return;
        }
        if (g.phase === 'timeup') {
          if (g.pt === 120) {
            const cg = g;
            const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 320; };
            const cont = () => { if (g !== cg) return; g.time = 60; g.lowSec = 99; g.turbos = Math.max(g.turbos, 1); g.phase = g.resume; g.pt = 0; say('DON\'T GIVE UP! GO GET HIM!', 150); };
            if (api.offerContinue) api.offerContinue(cont, end); else end();
          }
        }
      }

      // ---------------- particles ----------------
      function sparks(x, y, n) { for (let i = 0; i < n; i++) g.parts.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4, life: 20 + Math.random() * 15, c: Math.random() < 0.5 ? '#ffe060' : '#ff8020', s: 2 }); }
      function addSmoke(x, y, c) { g.parts.push({ x, y, vx: (Math.random() - 0.5), vy: -0.6, life: 26, c, s: 4, smoke: true }); }
      function addFlame() { for (const sx of [-26, 26]) g.parts.push({ x: W / 2 + sx, y: H - 14, vx: (Math.random() - 0.5) * 0.6, vy: 1 + Math.random(), life: 8, c: Math.random() < 0.5 ? '#40a0ff' : '#ffffff', s: 3 }); }
      function updParts() {
        for (const p of g.parts) { p.x += p.vx; p.y += p.vy; if (!p.smoke) p.vy += 0.25; else p.s += 0.3; p.life--; }
        g.parts = g.parts.filter(p => p.life > 0);
      }

      function update() {
        mt++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (!g || !g.demo) newRun(true);
          stepGame(1 / 60);
          if (mt > 1500) { mt = 0; newRun(true); }
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newRun(false); }
            else { coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); }
          }
          return;
        }
        if (mode === 'over') {
          if (--overT <= 0 || (overT < 220 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; g = null; }
          return;
        }
        stepGame(1 / 60);
      }

      // ---------------- drawing ----------------
      function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
      function poly(ctx, c, pts) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath(); ctx.fill();
      }
      function drawBG(ctx, hz) {
        const th = theme;
        const gr = ctx.createLinearGradient(0, 0, 0, hz);
        gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 2);
        if (th.night) {
          for (let i = 0; i < 40; i++) { const sx = ((i * 97 - g.skyX * 2) % W + W) % W; R(ctx, sx, (i * 53) % (hz - 30), 1, 1, i % 3 ? '#fff' : '#99f'); }
          R(ctx, ((260 - g.skyX * 2) % W + W) % W, 20, 10, 10, '#f8f0c0');
        } else if (THEMES.indexOf(th) === 4) { R(ctx, ((200 - g.skyX * 2) % W + W) % W, hz - 46, 28, 28, '#ffd070'); }
        // far layer
        const off1 = g.skyX * 6;
        ctx.fillStyle = th.far; ctx.beginPath(); ctx.moveTo(0, hz + 1);
        for (let x = 0; x <= W; x += 8) {
          const wx = x + off1;
          const h = th.night ? (Math.floor(wx / 24) * 7919 % 37 + 12) : 18 + 12 * Math.sin(wx * 0.017) + 8 * Math.sin(wx * 0.043 + 1.3);
          ctx.lineTo(x, hz - h);
          if (th.night) ctx.lineTo(x + 8, hz - h);
        }
        ctx.lineTo(W, hz + 1); ctx.closePath(); ctx.fill();
        if (th.night) {
          for (let x = 0; x < W; x += 8) { const wx = x + off1, h = Math.floor(wx / 24) * 7919 % 37 + 12; for (let yy = hz - h + 4; yy < hz - 2; yy += 5) if (((Math.floor(wx / 4) * 31 + yy) % 7) < 2) R(ctx, x + 2, yy, 2, 2, '#ffd860'); }
        }
        const off2 = g.skyX * 12;
        ctx.fillStyle = th.near; ctx.beginPath(); ctx.moveTo(0, hz + 1);
        for (let x = 0; x <= W; x += 6) { const wx = x + off2; ctx.lineTo(x, hz - 6 - 6 * Math.sin(wx * 0.03) - 4 * Math.sin(wx * 0.071 + 2)); }
        ctx.lineTo(W, hz + 1); ctx.closePath(); ctx.fill();
      }
      function carRear(ctx, cx, by, w, body, dark, kind) {
        const x0 = cx - w / 2;
        if (kind === 'truck') {
          const h = w * 1.05;
          if (w < 5) { R(ctx, x0, by - h, w, h, body); return; }
          R(ctx, x0 - w * 0.03, by - w * 0.06, w * 1.06, w * 0.08, 'rgba(0,0,0,.35)');
          R(ctx, x0 + w * 0.05, by - w * 0.16, w * 0.22, w * 0.16, '#111'); R(ctx, x0 + w * 0.73, by - w * 0.16, w * 0.22, w * 0.16, '#111');
          R(ctx, x0, by - h, w, h * 0.86, '#d8d8d0'); R(ctx, x0, by - h, w, h * 0.06, body);
          R(ctx, cx - w * 0.01, by - h * 0.94, Math.max(1, w * 0.02), h * 0.78, '#909088');
          R(ctx, x0, by - h * 0.18, w, h * 0.06, dark);
          R(ctx, x0 + w * 0.04, by - h * 0.26, w * 0.1, h * 0.06, '#ff2020'); R(ctx, x0 + w * 0.86, by - h * 0.26, w * 0.1, h * 0.06, '#ff2020');
          return;
        }
        const h = w * (kind === 'van' ? 0.62 : 0.48);
        if (w < 5) { R(ctx, x0, by - h, w, h, body); return; }
        R(ctx, x0 - w * 0.03, by - h * 0.1, w * 1.06, h * 0.14, 'rgba(0,0,0,.35)');
        R(ctx, x0 + w * 0.05, by - h * 0.32, w * 0.17, h * 0.32, '#111'); R(ctx, x0 + w * 0.78, by - h * 0.32, w * 0.17, h * 0.32, '#111');
        R(ctx, x0, by - h * 0.72, w, h * 0.46, body);
        R(ctx, x0 + w * 0.15, by - h, w * 0.7, h * 0.3, kind === 'van' ? body : dark);
        R(ctx, x0 + w * 0.2, by - h * 0.95, w * 0.6, h * 0.22, '#1c2c40');
        if (w > 14) R(ctx, x0 + w * 0.24, by - h * 0.93, w * 0.12, h * 0.06, '#5c7c9c');
        R(ctx, x0 + w * 0.04, by - h * 0.62, w * 0.2, h * 0.13, '#ff2020'); R(ctx, x0 + w * 0.76, by - h * 0.62, w * 0.2, h * 0.13, '#ff2020');
        R(ctx, cx - w * 0.09, by - h * 0.5, w * 0.18, h * 0.12, '#f0f0e0');
        R(ctx, x0, by - h * 0.3, w, h * 0.08, dark);
      }
      function drawPlayer(ctx, cx, by) {
        const w = 82, h = 40, st = g.steer, x0 = cx - w / 2;
        const sk = st * 3;
        R(ctx, x0 - 4, by - 4, w + 8, 6, 'rgba(0,0,0,.4)');
        // tyres
        R(ctx, x0 + 3 - st, by - 14, 16, 14, '#0c0c0c'); R(ctx, x0 + w - 19 - st, by - 14, 16, 14, '#0c0c0c');
        // body
        R(ctx, x0, by - 30, w, 18, '#1c1c22');
        R(ctx, x0 + 2, by - 31, w - 4, 2, '#4a4a56');
        R(ctx, x0, by - 14, w, 4, '#0c0c10');
        // tail light strip
        R(ctx, x0 + 4, by - 26, w - 8, 6, '#a00000'); R(ctx, x0 + 6, by - 25, 18, 4, '#ff3030'); R(ctx, x0 + w - 24, by - 25, 18, 4, '#ff3030');
        R(ctx, cx - 9, by - 25, 18, 4, '#f0f0e0'); text(ctx, 'HQ', cx - 5, by - 25, '#000');
        // cabin (skewed when steering)
        R(ctx, x0 + 14 + sk, by - h, w - 28, 10, '#1c1c22');
        R(ctx, x0 + 18 + sk, by - h + 2, w - 36, 7, '#2c3c58');
        R(ctx, x0 + 22 + sk, by - h + 3, 10, 2, '#6c8cb8');
        // siren light
        const on = g.phase === 'ram' || g.phase === 'arrest';
        const fl = (api.frame >> 2) & 1;
        R(ctx, cx - 7 + sk, by - h - 4, 14, 4, on ? (fl ? '#ff2020' : '#ff9090') : '#701010');
        if (on && fl) { ctx.fillStyle = 'rgba(255,40,40,.25)'; ctx.beginPath(); ctx.arc(cx + sk, by - h - 2, 14, 0, Math.PI * 2); ctx.fill(); }
        // exhausts
        R(ctx, x0 + 22, by - 12, 5, 3, '#888'); R(ctx, x0 + w - 27, by - 12, 5, 3, '#888');
      }
      function drawSprite(ctx, k, x, y, u) {
        const fl = (api.frame >> 3) & 1;
        switch (k) {
          case 'palm': {
            const h = 1.9 * u, tw = Math.max(1, u * 0.08);
            for (let i = 0; i < 6; i++) R(ctx, x - tw / 2 + Math.sin(i * 0.5) * u * 0.06, y - h * (i + 1) / 6, tw, h / 6 + 1, i & 1 ? '#8a5a2a' : '#a0703a');
            const fx = x + Math.sin(2.5) * u * 0.06, fy = y - h;
            ctx.fillStyle = '#1e8a2a';
            for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; poly(ctx, a & 1 ? '#1e8a2a' : '#2aa838', [fx, fy, fx + Math.cos(ang) * u * 0.55, fy + Math.abs(Math.sin(ang)) * u * 0.3 + u * 0.1, fx + Math.cos(ang + 0.3) * u * 0.4, fy + u * 0.02]); }
            break;
          }
          case 'tree': {
            const h = 1.5 * u;
            R(ctx, x - u * 0.06, y - h * 0.25, u * 0.12, h * 0.25, '#5a3a1a');
            poly(ctx, '#1c5e22', [x, y - h, x - u * 0.45, y - h * 0.2, x + u * 0.45, y - h * 0.2]);
            poly(ctx, '#287a2c', [x, y - h, x - u * 0.25, y - h * 0.45, x + u * 0.15, y - h * 0.5]);
            break;
          }
          case 'cactus': {
            const h = 0.9 * u, tw = u * 0.12;
            R(ctx, x - tw / 2, y - h, tw, h, '#2e8a3a');
            R(ctx, x - tw * 2, y - h * 0.65, tw, h * 0.3, '#2e8a3a'); R(ctx, x - tw * 2, y - h * 0.4, tw * 1.5, tw * 0.7, '#2e8a3a');
            R(ctx, x + tw, y - h * 0.8, tw, h * 0.35, '#2e8a3a'); R(ctx, x + tw * 0.5, y - h * 0.5, tw * 1.5, tw * 0.7, '#2e8a3a');
            break;
          }
          case 'rock': poly(ctx, '#8a7a6a', [x - u * 0.4, y, x - u * 0.3, y - u * 0.3, x, y - u * 0.42, x + u * 0.35, y - u * 0.2, x + u * 0.42, y]); R(ctx, x - u * 0.1, y - u * 0.35, u * 0.15, u * 0.1, '#a89888'); break;
          case 'lamp': {
            const h = 1.7 * u;
            R(ctx, x - u * 0.03, y - h, Math.max(1, u * 0.06), h, '#707080');
            R(ctx, x - u * 0.25, y - h, u * 0.28, u * 0.06, '#707080');
            R(ctx, x - u * 0.3, y - h + u * 0.04, u * 0.12, u * 0.05, theme.night ? '#fff8b0' : '#d0d0c0');
            if (theme.night && u > 8) { ctx.fillStyle = 'rgba(255,240,150,.15)'; ctx.beginPath(); ctx.arc(x - u * 0.24, y - h + u * 0.1, u * 0.3, 0, Math.PI * 2); ctx.fill(); }
            break;
          }
          case 'billboard': {
            const bw = 1.4 * u, bh = 0.7 * u;
            R(ctx, x - bw * 0.35, y - u * 1.0, u * 0.06, u * 1.0, '#555'); R(ctx, x + bw * 0.3, y - u * 1.0, u * 0.06, u * 1.0, '#555');
            R(ctx, x - bw / 2, y - u * 1.0 - bh, bw, bh, '#f0f0f0');
            R(ctx, x - bw / 2 + 2, y - u * 1.0 - bh + 2, bw - 4, bh - 4, '#d03020');
            if (u > 20) text(ctx, 'TAITO', x, y - u * 1.0 - bh / 2 - 3, '#fff', 1, 'center');
            break;
          }
          case 'building': {
            const bw = 1.6 * u, bh = 2.6 * u;
            R(ctx, x - bw / 2, y - bh, bw, bh, '#2a2a40');
            if (u > 6) for (let yy = 0.1; yy < 0.95; yy += 0.12) for (let xx = 0.1; xx < 0.9; xx += 0.2) if ((Math.floor(yy * 50 + xx * 30) % 3) !== 0) R(ctx, x - bw / 2 + xx * bw, y - bh + yy * bh, bw * 0.1, bh * 0.05, '#ffd860');
            break;
          }
          case 'arrows': {
            const bw = 1.1 * u, bh = 0.45 * u;
            R(ctx, x - u * 0.04, y - u * 0.5, u * 0.08, u * 0.5, '#555');
            R(ctx, x - bw / 2, y - u * 0.5 - bh, bw, bh, fl ? '#ffd000' : '#ffe860');
            if (u > 10) { poly(ctx, '#000', [x - bw * 0.42, y - u * 0.5 - bh / 2, x - bw * 0.15, y - u * 0.5 - bh * 0.85, x - bw * 0.15, y - u * 0.5 - bh * 0.15]); poly(ctx, '#000', [x + bw * 0.42, y - u * 0.5 - bh / 2, x + bw * 0.15, y - u * 0.5 - bh * 0.85, x + bw * 0.15, y - u * 0.5 - bh * 0.15]); }
            break;
          }
          case 'chevL': case 'chevR': {
            const bw = 0.5 * u, bh = 0.35 * u, d = k === 'chevR' ? 1 : -1;
            R(ctx, x - u * 0.03, y - u * 0.35, u * 0.06, u * 0.35, '#555');
            R(ctx, x - bw / 2, y - u * 0.35 - bh, bw, bh, '#ffffff');
            if (u > 10) poly(ctx, '#e02020', [x + d * bw * 0.3, y - u * 0.35 - bh / 2, x - d * bw * 0.2, y - u * 0.35 - bh * 0.9, x - d * bw * 0.2, y - u * 0.35 - bh * 0.1]);
            break;
          }
        }
      }
      const rp = []; for (let i = 0; i < DRAW; i++) rp.push({});
      const buckets = []; for (let i = 0; i < DRAW; i++) buckets.push([]);
      function renderRoad(ctx) {
        const pos = g.pos, baseAbs = Math.floor(pos / SEGL), basePct = (pos % SEGL) / SEGL;
        const pw = pos + PLZ, pseg = segAt(pw), ppct = (pw % SEGL) / SEGL;
        const camY = CAMH + pseg.y1 + (pseg.y2 - pseg.y1) * ppct;
        const shx = g.shake ? (Math.random() - 0.5) * 4 : 0;
        let maxy = H, x = 0, dx = -(segs[baseAbs % N].curve * basePct);
        // horizon height for background
        drawBG(ctx, H / 2 + 8);
        for (let n = 0; n < DRAW; n++) {
          const abs = baseAbs + n, s = segs[abs % N], r = rp[n];
          r.ok = false; r.proj = false; r.abs = abs; r.seg = s; buckets[n].length = 0;
          const z1 = abs * SEGL - pos, z2 = z1 + SEGL;
          const camX = g.x * ROADW - x, camX2 = g.x * ROADW - x - dx;
          x += dx; dx += s.curve;
          if (z1 <= CAMD) continue;
          const sc1 = CAMD / z1, sc2 = CAMD / z2;
          r.x1 = W / 2 + sc1 * -camX * W / 2 + shx; r.y1 = H / 2 - sc1 * (s.y1 - camY) * H / 2; r.w1 = sc1 * ROADW * W / 2;
          r.x2 = W / 2 + sc2 * -camX2 * W / 2 + shx; r.y2 = H / 2 - sc2 * (s.y2 - camY) * H / 2; r.w2 = sc2 * ROADW * W / 2;
          r.clip = maxy; r.f = forkF(abs); r.proj = true;
          if (r.y2 >= r.y1 || r.y2 >= maxy) continue;
          r.ok = true;
          const alt = Math.floor(abs / 3) & 1, th = theme;
          const y1 = Math.min(r.y1, maxy);
          R(ctx, 0, r.y2, W, y1 - r.y2 + 1, th.grass[alt]);
          const cs = r.f > 0 ? [-FORKOFF * r.f, FORKOFF * r.f] : [0];
          for (const c of cs) {
            const ax = r.x1 + c * r.w1, bx = r.x2 + c * r.w2, rw1 = r.w1 * 0.14, rw2 = r.w2 * 0.14;
            poly(ctx, th.rumble[alt], [ax - r.w1 - rw1, r.y1, ax - r.w1, r.y1, bx - r.w2, r.y2, bx - r.w2 - rw2, r.y2]);
            poly(ctx, th.rumble[alt], [ax + r.w1 + rw1, r.y1, ax + r.w1, r.y1, bx + r.w2, r.y2, bx + r.w2 + rw2, r.y2]);
          }
          for (const c of cs) {
            const ax = r.x1 + c * r.w1, bx = r.x2 + c * r.w2;
            poly(ctx, th.road[alt], [ax - r.w1, r.y1, ax + r.w1, r.y1, bx + r.w2, r.y2, bx - r.w2, r.y2]);
            if (alt) {
              const l1 = r.w1 * 0.03, l2 = r.w2 * 0.03;
              for (let ln = 1; ln < LANES; ln++) {
                const lx1 = ax - r.w1 + 2 * r.w1 * ln / LANES, lx2 = bx - r.w2 + 2 * r.w2 * ln / LANES;
                poly(ctx, th.lane, [lx1 - l1, r.y1, lx1 + l1, r.y1, lx2 + l2, r.y2, lx2 - l2, r.y2]);
              }
            }
          }
          maxy = r.y2;
        }
        // bucket cars
        const add = (o, z) => { const n = Math.floor(z / SEGL) - baseAbs; if (n >= 0 && n < DRAW) buckets[n].push(o); };
        for (const c of g.traffic) add(c, c.z);
        if (g.crim) add(g.crim, g.crim.z);
        // sprites far to near
        for (let n = DRAW - 1; n > 0; n--) {
          const r = rp[n]; if (!r.ok && !buckets[n].length) continue;
          if (!r.proj || r.w1 <= 0) continue;
          const clipNeeded = r.clip < H;
          if (clipNeeded) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, r.clip); ctx.clip(); }
          const s = r.seg;
          for (const sp of s.spr) {
            if (sp.mid && r.f <= 0.5) continue;
            const off = sp.mid ? 0 : (r.f > 0 ? Math.sign(sp.off) * (FORKOFF * r.f + Math.abs(sp.off)) : sp.off);
            drawSprite(ctx, sp.k, r.x1 + off * r.w1, r.y1, r.w1);
          }
          for (const c of buckets[n]) {
            const t = (c.z % SEGL) / SEGL;
            const u = r.w1 + (r.w2 - r.w1) * t, cx = r.x1 + (r.x2 - r.x1) * t, cy = r.y1 + (r.y2 - r.y1) * t;
            if (c === g.crim) {
              const st = STAGES[g.stage];
              const sx = cx + crimX() * u;
              carRear(ctx, sx, cy, CARW * u, st.col, st.dark, st.kind);
              if (c.dmg > 45 && u > 20 && (api.frame & 4)) { ctx.fillStyle = 'rgba(80,80,80,.6)'; ctx.beginPath(); ctx.arc(sx + Math.sin(api.frame * 0.3) * 3, cy - CARW * u * 0.7, CARW * u * 0.18, 0, 7); ctx.fill(); }
              if (g.phase === 'chase' && u > 6 && ((api.frame >> 4) & 1)) text(ctx, 'V', sx - 2, cy - CARW * u * 0.6 - 12, '#ff3030');
            } else carRear(ctx, cx + c.x * u, cy, CARW * u, c.col, c.dark, c.kind);
          }
          if (clipNeeded) ctx.restore();
        }
      }
      function drawHUD(ctx) {
        const st = STAGES[g.stage];
        stext(ctx, 'SCORE', 6, 4, '#60c0ff'); stext(ctx, String(g.score).padStart(8, ' '), 6, 13, '#fff');
        stext(ctx, 'TIME', W / 2, 3, '#ffd000', 1, 'center');
        const tsec = Math.max(0, Math.ceil(g.time));
        stext(ctx, String(tsec).padStart(2, '0'), W / 2, 12, tsec <= 10 && (api.frame & 16) ? '#ff3030' : '#fff', 3, 'center');
        stext(ctx, 'STAGE ' + (g.stage + 1 + g.loop * 5), W - 6, 4, '#ffd000', 1, 'right');
        stext(ctx, 'HI ' + hi, W - 6, 13, '#aaa', 1, 'right');
        // speed + gear + turbo
        const kmh = Math.round(g.speed / MAXS * 300);
        stext(ctx, String(kmh).padStart(3, ' '), 6, H - 22, '#fff', 2);
        stext(ctx, 'KM/H', 44, H - 15, '#aaa');
        stext(ctx, g.gear ? 'HI' : 'LO', 6, H - 32, g.gear ? '#ff6060' : '#60ff60');
        stext(ctx, 'TURBO', W - 6, H - 32, g.turboT > 0 && (api.frame & 4) ? '#40c0ff' : '#ffd000', 1, 'right');
        for (let i = 0; i < 3; i++) { R(ctx, W - 16 - i * 12, H - 22, 10, 10, '#000'); R(ctx, W - 15 - i * 12, H - 21, 8, 8, i < g.turbos ? '#ff3020' : '#402020'); if (i < g.turbos) text(ctx, 'T', W - 13 - i * 12, H - 21, '#fff'); }
        // distance / damage
        if (g.phase === 'ram' || g.phase === 'arrest') {
          stext(ctx, 'DAMAGE', W / 2, 36, '#ffd000', 1, 'center');
          R(ctx, W / 2 - 51, 45, 102, 8, '#fff'); R(ctx, W / 2 - 50, 46, 100, 6, '#300');
          R(ctx, W / 2 - 50, 46, g.crim.dmg, 6, g.crim.dmg > 70 ? '#ff2020' : '#ff9020');
        } else if (g.phase === 'chase' || g.phase === 'go' || g.phase === 'timeup') {
          const m = Math.max(0, Math.round((g.crim.z - g.pos - PLZ) / 144));
          stext(ctx, 'CRIMINAL ' + m + 'M', W / 2, 36, '#ffd000', 1, 'center');
          const frac = clamp(1 - m / 900, 0, 1);
          R(ctx, W / 2 - 51, 45, 102, 5, '#666'); R(ctx, W / 2 - 50 + frac * 96, 44, 4, 7, '#ff2020'); R(ctx, W / 2 - 50, 44, 3, 7, '#40a0ff');
        }
        if (g.msg) drawRadio(ctx);
        void st;
      }
      function drawRadio(ctx) {
        const m = g.msg;
        const shown = m.text.slice(0, Math.floor(m.t * 1.5));
        R(ctx, 20, 58, W - 40, 22, 'rgba(0,0,40,.75)'); R(ctx, 20, 58, W - 40, 1, '#60c0ff'); R(ctx, 20, 79, W - 40, 1, '#60c0ff');
        drawNancy(ctx, 24, 60, 18);
        text(ctx, 'NANCY', 46, 61, '#ff80c0');
        text(ctx, shown, 46, 70, '#fff');
      }
      function drawNancy(ctx, x, y, s) {
        R(ctx, x, y, s, s, '#203040');
        R(ctx, x + 3, y + 2, s - 6, s - 4, '#8a4a20');
        R(ctx, x + 5, y + 4, s - 10, s - 7, '#f0c098');
        R(ctx, x + 6, y + 8, 2, 1, '#000'); R(ctx, x + s - 8, y + 8, 2, 1, '#000');
        R(ctx, x + s / 2 - 2, y + 12, 4, 1, '#c03040');
        R(ctx, x + 2, y + 6, 2, 6, '#333'); R(ctx, x + 1, y + 11, 4, 3, '#555');
      }
      function drawParts(ctx) { for (const p of g.parts) R(ctx, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s, p.c); }
      function renderBrief(ctx) {
        R(ctx, 0, 0, W, H, '#0a0a18');
        for (let y = 0; y < H; y += 4) R(ctx, 0, y, W, 1, '#10102a');
        stext(ctx, 'CHASE H.Q.', W / 2, 10, '#ffd000', 2, 'center');
        stext(ctx, 'STAGE ' + (g.stage + 1 + g.loop * 5), W / 2, 30, '#fff', 1, 'center');
        // Nancy portrait
        const px = 20, py = 50;
        R(ctx, px - 2, py - 2, 68, 76, '#60c0ff'); R(ctx, px, py, 64, 72, '#203048');
        R(ctx, px + 12, py + 6, 40, 52, '#7a3a14'); R(ctx, px + 18, py + 14, 28, 30, '#f2c49c');
        R(ctx, px + 23, py + 24, 5, 3, '#203060'); R(ctx, px + 36, py + 24, 5, 3, '#203060');
        R(ctx, px + 29, py + 30, 5, 4, '#e0a080'); R(ctx, px + 27, py + 37, 10, 2, (g.pt >> 3) & 1 && g.pt < 330 ? '#a02030' : '#d04050');
        R(ctx, px + 14, py + 50, 36, 22, '#3050a0'); R(ctx, px + 28, py + 50, 8, 8, '#f2c49c');
        R(ctx, px + 8, py + 18, 6, 18, '#222'); R(ctx, px + 8, py + 34, 10, 4, '#444');
        text(ctx, 'NANCY', px + 32, py + 76, '#ff80c0', 1, 'center');
        // suspect file
        const sx = 236, sy = 50;
        R(ctx, sx - 2, sy - 2, 68, 76, '#ff3030'); R(ctx, sx, sy, 64, 72, '#302020');
        R(ctx, sx + 18, sy + 12, 28, 32, '#c09070'); R(ctx, sx + 16, sy + 8, 32, 8, '#202020');
        R(ctx, sx + 22, sy + 24, 6, 2, '#000'); R(ctx, sx + 36, sy + 24, 6, 2, '#000'); R(ctx, sx + 26, sy + 36, 12, 2, '#602020');
        R(ctx, sx + 12, sy + 48, 40, 24, '#404040');
        for (let i = 0; i < 4; i++) R(ctx, sx, sy + 56 + i * 4, 64, 1, '#806060');
        text(ctx, 'WANTED', sx + 32, sy + 76, '#ff3030', 1, 'center');
        // typed text
        let budget = Math.floor(g.pt / 2);
        for (let i = 0; i < g.brief.length; i++) {
          const ln = g.brief[i]; const shown = ln.slice(0, Math.max(0, budget)); budget -= ln.length + 4;
          text(ctx, shown, W / 2, 140 + i * 11, i === 2 ? '#ffd000' : '#fff', 1, 'center');
        }
        const st = STAGES[g.stage];
        carRear(ctx, W / 2, 128, 56, st.col, st.dark, st.kind);
        if (g.pt > 60 && (g.pt >> 4) & 1) text(ctx, 'PUSH START TO GO', W / 2, H - 14, '#60c0ff', 1, 'center');
      }
      function renderTally(ctx) {
        R(ctx, 40, 60, W - 80, 110, 'rgba(0,0,0,.8)');
        stext(ctx, 'CRIMINAL ARRESTED!', W / 2, 68, '#ffd000', 1, 'center');
        const b = g.bonus; if (!b) return;
        text(ctx, 'CLEAR BONUS', 56, 90, '#fff'); text(ctx, String(b.clear), W - 56, 90, '#fff', 1, 'right');
        if (g.pt > 50) { text(ctx, 'TIME BONUS', 56, 104, '#fff'); text(ctx, Math.floor(g.time) + ' X 10000', W - 56, 104, '#60ff60', 1, 'right'); }
        if (g.pt > 100) { text(ctx, 'RAMS', 56, 118, '#fff'); text(ctx, String(b.hits), W - 56, 118, '#fff', 1, 'right'); }
        if (g.pt > 150) stext(ctx, 'SCORE ' + g.score, W / 2, 142, '#60c0ff', 1, 'center');
      }
      function renderGame(ctx) {
        if (g.phase === 'brief') { renderBrief(ctx); return; }
        renderRoad(ctx);
        const pw = g.pos + PLZ;
        if (g.crim.pull && g.phase === 'arrest' && g.speed < 40) {/* stopped */ }
        drawPlayer(ctx, W / 2, H - 6 + g.bounce);
        drawParts(ctx);
        void pw;
        if (!g.demo) drawHUD(ctx);
        if (g.phase === 'go') stext(ctx, 'GO!', W / 2, 96, (api.frame & 8) ? '#ffd000' : '#ff3030', 3, 'center');
        if (g.phase === 'arrest' && (api.frame & 16)) stext(ctx, 'ARREST!', W / 2, 100, '#ff3030', 3, 'center');
        if (g.phase === 'tally') renderTally(ctx);
        if (g.phase === 'timeup') stext(ctx, 'TIME UP', W / 2, 100, '#ff3030', 3, 'center');
      }
      function renderTitle(ctx) {
        renderGame(ctx);
        R(ctx, 0, 0, W, H, 'rgba(0,0,20,.35)');
        // logo
        const ly = 26;
        R(ctx, 30, ly - 6, W - 60, 56, 'rgba(0,0,0,.6)');
        text(ctx, 'CHASE H.Q.', W / 2 + 3, ly + 3, '#600000', 4, 'center');
        text(ctx, 'CHASE H.Q.', W / 2, ly, '#ffd000', 4, 'center');
        R(ctx, 40, ly + 32, W - 80, 2, '#ff3030');
        text(ctx, 'SPECIAL INVESTIGATION POLICE', W / 2, ly + 38, '#fff', 1, 'center');
        const page = Math.floor(mt / 420) % 2;
        R(ctx, 30, 108, W - 60, 74, 'rgba(0,0,0,.7)');
        if (page === 0) {
          text(ctx, 'CATCH THE CRIMINAL BEFORE TIME', W / 2, 114, '#fff', 1, 'center');
          text(ctx, 'RUNS OUT, THEN RAM HIS CAR', W / 2, 124, '#fff', 1, 'center');
          text(ctx, 'UNTIL THE DAMAGE BAR IS FULL', W / 2, 134, '#fff', 1, 'center');
          text(ctx, 'SPACE: TURBO  X: GEAR', W / 2, 150, '#60c0ff', 1, 'center');
          text(ctx, 'HI SCORE ' + hi, W / 2, 166, '#ffd000', 1, 'center');
        } else {
          text(ctx, 'MOST WANTED', W / 2, 114, '#ff3030', 1, 'center');
          STAGES.forEach((s, i) => text(ctx, (i + 1) + ' ' + s.who, 52, 126 + i * 10, '#fff'));
        }
        const blink = (mt >> 4) & 1;
        if (coinFlash > 0 ? (coinFlash >> 2) & 1 : api.credits === 0 && blink) stext(ctx, 'INSERT COIN', W / 2, 192, '#fff', 1, 'center');
        else if (api.credits > 0 && blink) stext(ctx, 'PUSH START', W / 2, 192, '#fff', 1, 'center');
        stext(ctx, '\u00a9 1988 TAITO', W / 2, H - 22, '#ff8080', 1, 'center');
        stext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#aaa');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { if (g) renderTitle(ctx); return; }
        renderGame(ctx);
        if (mode === 'over') {
          R(ctx, W / 2 - 70, 90, 140, 40, '#000');
          stext(ctx, 'GAME OVER', W / 2, 98, '#ff3030', 2, 'center');
          text(ctx, 'SCORE ' + g.score, W / 2, 118, '#fff', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
