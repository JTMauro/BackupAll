// The Empire Strikes Back (Atari, 1985) - from-scratch colour-vector recreation for the Game Room.
// A companion to the house Star Wars cabinet: first-person vector 3D, six deflector shields and radio chatter.
// Each wave: Hoth (probe droids, then AT-AT and AT-ST walkers - trip the AT-ATs with the tow cable), the
// Millennium Falcon breaking out past a TIE fighter pack, and the asteroid field with a Star Destroyer overhead.
// Shoot the marked targets to spell J-E-D-I for a bonus and a wave of Force protection. Original music.
(function () {
  'use strict';
  const W = 640, H = 480, CX = W / 2, CY = H / 2, FOCAL = 380, NEAR = 3, TAU = Math.PI * 2;

  // ---------- vector font (strokes on a 4x6 grid) ----------
  const VF = {
    A: '0602204246 0343', B: '003041423303 334445360600', C: '40000646', D: '00304244360600',
    E: '40000646 0333', F: '400006 0333', G: '400006464323', H: '0006 4046 0343', I: '0040 2026 0646',
    J: '40460604', K: '0006 400346', L: '000646', M: '0600224046', N: '06004640', O: '0040460600',
    P: '0600404303', Q: '0040460600 2446', R: '0600404303 1346', S: '400003434606', T: '0040 2026',
    U: '00064640', V: '002640', W: '0006244640', X: '0046 4006', Y: '002240 2226', Z: '00400646',
    '0': '0040460600 4006', '1': '1120 2026', '2': '004043030646', '3': '00404606 1343', '4': '000343 4046',
    '5': '400003434606', '6': '4000064643 0343', '7': '004046', '8': '0040460600 0343', '9': '4303004046',
    '-': '0343', '.': '2526', ':': '2122 2425', '!': '2024 2526', '/': '4006', '=': '0242 0444', '+': '2125 0343',
    "'": '2022', ',': '2516', '?': '0040432324 2526', '(': '30121436', ')': '10323416', '>': '004306', '<': '400346',
    '_': '0646', '*': '0044 4004 2024'
  };
  function vtext(ctx, str, x, y, sc, align) {
    str = String(str).toUpperCase();
    const adv = 6 * sc, w = str.length * adv - 2 * sc;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    for (const ch of str) {
      const g = VF[ch];
      if (g) for (const st of g.split(' ')) {
        for (let i = 0; i < st.length; i += 2) {
          const px = x + (+st[i]) * sc, py = y + (+st[i + 1]) * sc;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (st.length === 2) ctx.lineTo(x + (+st[0]) * sc + 0.6, y + (+st[1]) * sc);
      }
      x += adv;
    }
  }
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  // ---------- wireframe models (local +z = forward) ----------
  function buildModel(fn) {
    const v = [], e = [];
    const ring = (n, f) => { const s = v.length; for (let i = 0; i < n; i++) v.push(f(i * TAU / n)); for (let i = 0; i < n; i++) e.push([s + i, s + (i + 1) % n]); return s; };
    const box = (x0, x1, y0, y1, z0, z1) => {
      const s = v.length;
      for (let i = 0; i < 8; i++) v.push([i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0]);
      for (const [a, b] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) e.push([s + a, s + b]);
    };
    fn(v, e, ring, box);
    return { v, e };
  }
  const TIE = buildModel((v, e, ring) => {
    ring(8, a => [0, Math.cos(a) * 3.2, Math.sin(a) * 3.2]);
    ring(8, a => [Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0]);
    for (const sx of [-1, 1]) {
      const s = ring(6, a => [sx * 8, Math.cos(a + Math.PI / 6) * 9, Math.sin(a + Math.PI / 6) * 9]);
      const c = v.length; v.push([sx * 8, 0, 0]);
      for (let i = 0; i < 6; i += 2) e.push([c, s + i]);
      const p = v.length; v.push([sx * 3.2, 0, 0]); e.push([p, c]);
    }
  });
  // Imperial Star Destroyer: dagger hull, stepped superstructure, bridge tower with two deflector domes
  const SDL = 800, SDW = 430, SDH = 70;
  const SD_DOMES = [[-95, SDH + 148, -SDL + 70], [95, SDH + 148, -SDL + 70]];
  const SDM = buildModel((v, e, ring, box) => {
    v.push([0, 0, SDL], [-SDW, 0, -SDL], [SDW, 0, -SDL], [0, SDH, -SDL], [0, -SDH * 0.8, -SDL]);
    e.push([0, 1], [0, 2], [0, 3], [0, 4], [1, 3], [2, 3], [1, 4], [2, 4]);
    v.push([-SDW * 0.5, SDH * 0.5, -SDL], [SDW * 0.5, SDH * 0.5, -SDL]); e.push([0, 5], [0, 6]);
    for (let k = 1; k < 6; k++) { const z = SDL - k * 2 * SDL / 6, f = k / 6; v.push([-SDW * f, 0, z], [SDW * f, 0, z]); e.push([v.length - 2, v.length - 1]); }
    box(-170, 170, SDH - 10, SDH + 30, -SDL, -SDL + 380);
    box(-100, 100, SDH + 30, SDH + 62, -SDL, -SDL + 220);
    box(-12, 12, SDH + 62, SDH + 120, -SDL + 50, -SDL + 90);
    box(-130, 130, SDH + 120, SDH + 136, -SDL + 40, -SDL + 100);
    for (const d of SD_DOMES) {
      ring(10, a => [d[0] + Math.cos(a) * 18, d[1], d[2] + Math.sin(a) * 18]);
      ring(10, a => [d[0] + Math.cos(a) * 18, d[1] + Math.abs(Math.sin(a)) * 14 - 2, d[2]]);
    }
  });
  // asteroid rocks: jittered icosahedra
  const ROCKS = (() => {
    const p = (1 + Math.sqrt(5)) / 2, base = [];
    for (const a of [-1, 1]) for (const b of [-p, p]) base.push([0, a, b], [a, b, 0], [b, 0, a]);
    const e = [];
    for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) {
      const d = Math.hypot(base[i][0] - base[j][0], base[i][1] - base[j][1], base[i][2] - base[j][2]);
      if (Math.abs(d - 2) < 0.01) e.push([i, j]);
    }
    const out = [];
    let seed = 12345; const r = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let k = 0; k < 6; k++) {
      out.push({ v: base.map(q => { const m = (0.7 + r() * 0.55) / 1.902; return [q[0] * m, q[1] * m * (0.8 + k * 0.05), q[2] * m]; }), e });
    }
    return out;
  })();

  // ---------- scoring ----------
  const PTS = { probe: 500, atst: 1000, atatHit: 50, atatTrip: 5000, tie: 1000, rock: 150, bigRock: 300, bolt: 33, dome: 5000, letter: 2000, jedi: 50000, shield: 5000 };
  const SPEAKERS = {
    base: { tag: 'ECHO BASE', col: '#ffe040', f: 100 },
    wing: { tag: 'WINGMATE', col: '#40e0ff', f: 132 },
    droid: { tag: 'PROTOCOL DROID', col: '#ffc060', f: 165 },
    dark: { tag: 'DARK LORD', col: '#ff4040', f: 66 }
  };
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.-_';
  const JEDI = 'JEDI';

  ArcadeRegistry.register({
    id: 'empirestrikesback', title: 'The Empire Strikes Back', year: 1985, maker: 'Atari',
    width: W, height: H, vector: true, pointer: true,
    controls: 'Mouse or Arrows: fly/aim \u00b7 Space/Click: fire \u00b7 X: tow cable (Hoth) \u00b7 Enter: start',
    marquee: { bg: '#00040c', fg: '#c8e4ff', accent: '#ff3030' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const sgn = () => (Math.random() < 0.5 ? -1 : 1);
      const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
      const pick = arr => arr[(Math.random() * arr.length) | 0];
      const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

      // ---------- high score table ----------
      const table = [800000, 600000, 450000, 350000, 250000, 180000, 120000, 60000]
        .map((s, i) => ({ n: ['ACE', 'MDS', 'KTO', 'RHB', 'JLW', 'ECH', 'TWN', 'SNW'][i], s }));
      let hi = api.getHiScore(table[0].s);
      if (hi > table[0].s) { table.unshift({ n: 'TOP', s: hi }); table.pop(); }

      // ---------- state ----------
      let mode = 'attract', modeT = 0, stage = 'title', stageT = 0, coinFlash = 0;
      let demo = false, autopilot = false, god = false;
      let phase = 'probes', phaseT = 0, hy = CY;
      let score = 0, shields = 6, wave = 1, kills = 0, killGoal = 8, cap = 3600;
      let letterPhase = false, letterWave = 0;
      let letters = [false, false, false, false], lettersDone = false, forceOn = false, forceNext = false, letterOut = false;
      let crossX = CX, crossY = CY, cvx = 0, cvy = 0, lastMX = -1, lastMY = -1, keyDrive = false, fireCool = 0;
      let bank = 0, cb = 1, sb = 0;
      let lasers = [], frags = [], debris = [], fireballs = [], bolts = [], ties = [], groups = [];
      let probes = [], walkers = [], atsts = [], asts = [], dust = [], sd = null, sdDone = false;
      let px = 0, py = 40, pz = 0, yaw = 0, hc = 1, hs = 0, speed = 0, tow = null, bumpT = 0;
      let fieldLen = 0, dist = 0, tripped = 0, walkersTotal = 0, atstSpawned = 0, atstGoal = 0, endT = 0, lostBase = false;
      let hitFlash = 0, shake = 0, banner = '', bannerT = 0, bannerCol = '#ffe040', sub = null, said = {};
      let tally = [], initials = null, music = null, lastScoreRank = -1, cockpit = 'speeder';
      const stars = [];
      for (let i = 0; i < 200; i++) { const a = rnd(0, TAU), b = Math.acos(rnd(-1, 1)); stars.push([Math.sin(b) * Math.cos(a), Math.sin(b) * Math.sin(a), Math.cos(b), rnd(0.6, 1.8)]); }
      const snow = [];
      for (let i = 0; i < 70; i++) snow.push({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.6, 1.8), v: rnd(0.6, 1.6) });
      const mountains = [];
      for (let i = 0; i < 90; i++) mountains.push(0.012 + Math.abs(Math.sin(i * 0.37) * 0.03 + Math.sin(i * 1.71) * 0.022) + (i % 7 === 0 ? 0.03 : 0) + rnd(0, 0.01));
      const drifts = [];
      for (let i = 0; i < 70; i++) {
        const x = rnd(-2600, 2600), z = rnd(-1200, 4200), a = rnd(0, TAU), l = rnd(60, 200);
        drifts.push([x, z, x + Math.cos(a) * l, z + Math.sin(a) * l, rnd(3, 9)]);
      }

      // ---------- sound ----------
      const snd = {
        tone(f, d, o) { if (!demo) A.tone(f, d, o); },
        noise(d, o) { if (!demo) A.noise(d, o); },
        melody(n, o) { if (!demo) A.melody(n, o); }
      };
      // speech-like radio voice: buzzy glottal tone shaped by band-passed noise formants per syllable
      const VOWEL = { a: [730, 1090], e: [530, 1840], i: [300, 2200], o: [570, 840], u: [440, 1020], y: [400, 1900] };
      function speak(who, text, force) {
        if (sub && sub.t > 30 && !force) return false;
        const sp = SPEAKERS[who] || SPEAKERS.base;
        sub = { who: sp.tag, col: sp.col, text, t: Math.max(110, text.length * 4 + 70) };
        if (demo) return true;
        let d = 0.05;
        A.noise(0.06, { type: 'highpass', freq: 2500, vol: 0.05 });
        const words = text.toLowerCase().split(/\s+/);
        for (let wi = 0; wi < words.length; wi++) {
          const word = words[wi].replace(/[^a-z]/g, '');
          const syl = word.match(/[aeiouy]+/g) || ['a'];
          for (let si = 0; si < syl.length; si++) {
            const fm = VOWEL[syl[si][0]] || VOWEL.a;
            const len = 0.07 + Math.min(0.08, syl[si].length * 0.03) + (si === syl.length - 1 ? 0.03 : 0);
            const f0 = sp.f * (1 + 0.12 * Math.sin(wi * 1.7 + si)) * (wi === words.length - 1 ? 0.9 : 1);
            if (/^[bcdfgjkpqstvxz]/.test(word) && si === 0) A.noise(0.03, { type: 'highpass', freq: 3500, vol: 0.06, delay: d });
            A.tone(f0, len, { type: 'sawtooth', vol: 0.055, slideTo: f0 * 0.88, delay: d + 0.02 });
            A.noise(len, { type: 'bandpass', freq: fm[0], vol: 0.11, delay: d + 0.02 });
            A.noise(len * 0.8, { type: 'bandpass', freq: fm[1], vol: 0.06, delay: d + 0.02 });
            d += len + 0.035;
          }
          d += 0.05;
        }
        A.noise(0.08, { type: 'highpass', freq: 2500, vol: 0.05, delay: d });
        return true;
      }
      function sayOnce(key, who, text, force) { if (said[key]) return; if (speak(who, text, force)) said[key] = true; }

      // ---------- music (original compositions) ----------
      const N = midi;
      function fanfare() {   // brassy opening call in D, rising in fourths
        const mel = [[62, .14], [67, .14], [69, .42], [67, .14], [69, .14], [74, .56], [72, .14], [71, .14], [69, .28], [64, .28], [66, .28], [67, .28], [69, .84]];
        snd.melody(mel.map(([n, d]) => [N(n), d]), { type: 'square', vol: 0.1 });
        const bass = [[38, .7], [43, .7], [36, .56], [40, .56], [38, 1.1]];
        snd.melody(bass.map(([n, d]) => [N(n), d]), { type: 'triangle', vol: 0.14 });
      }
      function cadence() {   // wave cleared
        const mel = [[69, .14], [74, .14], [78, .14], [81, .42], [79, .14], [78, .14], [76, .28], [74, .7]];
        snd.melody(mel.map(([n, d]) => [N(n), d]), { type: 'square', vol: 0.1 });
        snd.melody([[N(50), .56], [N(45), .56], [N(38), .9]], { type: 'triangle', vol: 0.14 });
      }
      const PATTERNS = {
        hoth: { step: 8, notes: [50, 0, 50, 53, 57, 0, 55, 53, 50, 0, 50, 53, 58, 57, 55, 0] },
        space: { step: 7, notes: [45, 45, 0, 52, 45, 0, 53, 52, 45, 45, 0, 57, 55, 0, 53, 0] },
        rocks: { step: 9, notes: [40, 0, 47, 0, 41, 0, 48, 0, 40, 0, 47, 0, 43, 0, 46, 45] }
      };
      function musicStart(name) { music = { name, i: 0, t: 1 }; }
      function musicTick() {
        if (!music || demo || mode !== 'play') return;
        if (--music.t > 0) return;
        const p = PATTERNS[music.name];
        music.t = p.step;
        const n = p.notes[music.i % p.notes.length];
        if (n) snd.tone(N(n - 12), p.step / 60 * 0.9, { type: 'triangle', vol: 0.13 });
        if (music.name === 'rocks' && music.i % 8 === 0) snd.tone(N(71 + ((music.i >> 3) & 1)), 0.6, { type: 'sine', vol: 0.035, slideTo: N(70) });
        if (music.name === 'hoth' && music.i % 16 === 8) snd.tone(N(74), 0.3, { type: 'square', vol: 0.025, slideTo: N(69) });
        if (music.name === 'space' && music.i % 16 === 0) snd.tone(N(69), 0.35, { type: 'square', vol: 0.025 });
        music.i++;
      }
      function phaseMusic() { musicStart(isHoth() ? 'hoth' : phase === 'asteroids' ? 'rocks' : 'space'); }

      // ---------- 3D helpers ----------
      const isHoth = () => phase === 'probes' || phase === 'walkers' || phase === 'launch';
      function setBank(target) { bank += (target - bank) * 0.08; cb = Math.cos(bank); sb = Math.sin(bank); }
      function proj(x, y, z) { const rx = x * cb - y * sb, ry = x * sb + y * cb; return [CX + FOCAL * rx / z, hy - FOCAL * ry / z]; }
      function seg(ctx, a, b) {
        if (a[2] < NEAR && b[2] < NEAR) return;
        if (a[2] < NEAR) { const t = (NEAR - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]; }
        else if (b[2] < NEAR) { const t = (NEAR - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, NEAR]; }
        const p = proj(a[0], a[1], a[2]), q = proj(b[0], b[1], b[2]);
        if (Math.abs(p[0]) > 9000 || Math.abs(q[0]) > 9000 || Math.abs(p[1]) > 9000 || Math.abs(q[1]) > 9000) return;
        ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
      }
      const S = (ctx, x1, y1, z1, x2, y2, z2) => seg(ctx, [x1, y1, z1], [x2, y2, z2]);
      // world (Hoth) -> camera
      function setCam() { hc = Math.cos(yaw); hs = Math.sin(yaw); }
      function toCam(X, Y, Z) { const dx = X - px, dz = Z - pz; return [dx * hc - dz * hs, Y - py, dx * hs + dz * hc]; }
      const segW = (ctx, a, b) => seg(ctx, toCam(a[0], a[1], a[2]), toCam(b[0], b[1], b[2]));
      const SW = (ctx, x1, y1, z1, x2, y2, z2) => seg(ctx, toCam(x1, y1, z1), toCam(x2, y2, z2));
      function xform(m, x, y, z, yw, pitch, roll, sc) {
        const cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
        return m.v.map(([a, b, c]) => {
          a *= sc; b *= sc; c *= sc;
          const a1 = a * cr - b * sr, b1 = a * sr + b * cr;
          const b2 = b1 * cp - c * sp, c2 = b1 * sp + c * cp;
          return [x + a1 * cy + c2 * sy, y + b2, z - a1 * sy + c2 * cy];
        });
      }
      const yawOf = t => Math.atan2(t.vx, t.vz);
      const pitchOf = t => -Math.atan2(t.vy, Math.hypot(t.vx, t.vz)) * 0.6;
      function rot(o, ay, ax, kx, ky, kz) {
        let c = Math.cos(ay), s = Math.sin(ay);
        let x = o[kx] * c - o[kz] * s, z = o[kx] * s + o[kz] * c; o[kx] = x; o[kz] = z;
        c = Math.cos(ax); s = Math.sin(ax);
        const y = o[ky] * c - o[kz] * s; z = o[ky] * s + o[kz] * c; o[ky] = y; o[kz] = z;
      }
      function turnView(ay, ax) {   // the Falcon turns: rotate the camera-space world the other way
        for (const t of ties) { rot(t, ay, ax, 'x', 'y', 'z'); rot(t, ay, ax, 'vx', 'vy', 'vz'); }
        for (const f of fireballs) { rot(f, ay, ax, 'x', 'y', 'z'); rot(f, ay, ax, 'vx', 'vy', 'vz'); }
        for (const d of debris) { rot(d, ay, ax, 'x', 'y', 'z'); rot(d, ay, ax, 'vx', 'vy', 'vz'); rot(d, ay, ax, 'hx', 'hy', 'hz'); }
        for (const s of stars) rot(s, ay, ax, 0, 1, 2);
      }
      function shiftCam(dx, dy, dz) {   // the Falcon translates (asteroid field)
        for (const a of asts) { a.x -= dx; a.y -= dy; a.z -= dz; }
        for (const f of fireballs) { f.x -= dx; f.y -= dy; f.z -= dz; }
        for (const d of debris) { d.x -= dx; d.y -= dy; d.z -= dz; }
        for (const d of dust) { d.x -= dx; d.y -= dy; d.z -= dz; }
        for (const t of ties) { t.x -= dx * 0.6; t.y -= dy * 0.6; }
        if (sd) { sd.x -= dx; sd.y -= dy; sd.z -= dz; }
      }

      // ---------- walker geometry ----------
      function walkerXf(w) {
        const ch = Math.cos(w.h), sh = Math.sin(w.h), cr = Math.cos(w.roll), sr = Math.sin(w.roll), cp = Math.cos(w.pitch), sp = Math.sin(w.pitch);
        return (x, y, z) => {
          const y1 = y * cp - z * sp, z1 = y * sp + z * cp;
          const x2 = x * cr - y1 * sr, y2 = x * sr + y1 * cr;
          return [w.x + x2 * ch + z1 * sh, y2, w.z - x2 * sh + z1 * ch];
        };
      }
      function boxSegs(out, T, x0, x1, y0, y1, z0, z1) {
        const P = [];
        for (let i = 0; i < 8; i++) P.push(T(i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0));
        for (const [a, b] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) out.push([P[a], P[b]]);
      }
      function atatSegs(w) {
        const out = [], T = walkerXf(w), L = (a, b) => out.push([T(a[0], a[1], a[2]), T(b[0], b[1], b[2])]);
        boxSegs(out, T, -11, 11, 46, 64, -22, 22);
        boxSegs(out, T, -7, 7, 64, 68, -18, 16);
        L([-4, 57, 22], [-3, 55, 30]); L([4, 57, 22], [3, 55, 30]); L([0, 61, 22], [0, 59, 30]);
        const b = [[-6, 47, 30], [6, 47, 30], [6, 59, 30], [-6, 59, 30]], f = [[-4, 48, 46], [4, 48, 46], [4, 55, 46], [-4, 55, 46]];
        for (let i = 0; i < 4; i++) { L(b[i], b[(i + 1) % 4]); L(f[i], f[(i + 1) % 4]); L(b[i], f[i]); }
        L([-3, 52, 46], [3, 52, 46]);
        L([-3, 48, 44], [-3, 46, 56]); L([3, 48, 44], [3, 46, 56]);
        const moving = w.state === 'walk';
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const ph = w.step + (sx * sz > 0 ? 0 : Math.PI) + (sz > 0 ? 0.6 : 0);
          const fo = Math.sin(ph) * 7, lift = moving ? Math.max(0, Math.cos(ph)) * 4 : 0;
          const hip = [sx * 9, 47, sz * 16], knee = [sx * 10.5, 25, sz * 16 + fo * 0.4 + 3], foot = [sx * 10, lift + 4, sz * 16 + fo];
          L(hip, knee); L(knee, foot); L([hip[0] - sx * 2.5, 47, hip[2]], [knee[0] - sx * 2.5, 25, knee[2]]);
          L([foot[0] - 3, lift, foot[2] - 3], [foot[0] + 3, lift, foot[2] - 3]); L([foot[0] + 3, lift, foot[2] - 3], [foot[0] + 3, lift, foot[2] + 3]);
          L([foot[0] + 3, lift, foot[2] + 3], [foot[0] - 3, lift, foot[2] + 3]); L([foot[0] - 3, lift, foot[2] + 3], [foot[0] - 3, lift, foot[2] - 3]);
          L(foot, [foot[0], lift, foot[2]]);
        }
        return out;
      }
      function atstSegs(s) {
        const out = [], T = walkerXf(s), L = (a, b) => out.push([T(a[0], a[1], a[2]), T(b[0], b[1], b[2])]);
        boxSegs(out, T, -6, 6, 26, 36, -6, 7);
        L([-6, 32, 7], [-3, 30, 11]); L([6, 32, 7], [3, 30, 11]); L([-3, 30, 11], [3, 30, 11]); L([-3, 30, 11], [-3, 27, 8]); L([3, 30, 11], [3, 27, 8]);
        L([-7, 29, 2], [-7, 29, 14]); L([7, 29, 2], [7, 29, 14]);
        for (const sx of [-1, 1]) {
          const ph = s.step + (sx > 0 ? 0 : Math.PI), fo = Math.sin(ph) * 5, lift = s.alive ? Math.max(0, Math.cos(ph)) * 3 : 0;
          const hip = [sx * 4, 26, 0], knee = [sx * 5, 14, -5 + fo * 0.3], foot = [sx * 5, lift + 2, fo];
          L(hip, knee); L(knee, foot); L(foot, [sx * 5, lift, fo + 6]); L(foot, [sx * 5, lift, fo - 3]);
        }
        return out;
      }

      // ---------- effects ----------
      function addScore(n) { score += n; }
      function burstAt(x, y, z, col, n, size) {
        if (z < NEAR) return;
        const p = proj(x, y, z), k = clamp(300 / z, 0.4, 2.5) * (size || 1);
        for (let i = 0; i < n && frags.length < 500; i++) {
          const a = rnd(0, TAU), s = rnd(0.5, 4) * k;
          frags.push({ x: p[0], y: p[1], vx: Math.cos(a) * s, vy: Math.sin(a) * s, a: rnd(0, TAU), len: rnd(3, 9) * k, spin: rnd(-0.3, 0.3), t: rnd(20, 45), col });
        }
      }
      const burstW = (x, y, z, col, n, size) => { const c = toCam(x, y, z); burstAt(c[0], c[1], c[2], col, n, size); };
      function debrisFromSegs(list, cx, cy, cz, col, pow) {
        for (const [a, b] of list) {
          if (debris.length > 420) break;
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
          const dx = mx - cx, dy = my - cy, dz = mz - cz, d = Math.hypot(dx, dy, dz) || 1, s = rnd(0.6, 1.6) * (pow || 1.5);
          debris.push({ x: mx, y: my, z: mz, hx: (b[0] - a[0]) / 2, hy: (b[1] - a[1]) / 2, hz: (b[2] - a[2]) / 2,
            vx: dx / d * s + rnd(-0.4, 0.4), vy: dy / d * s + rnd(-0.2, 0.6), vz: dz / d * s, spin: rnd(-0.25, 0.25), t: rnd(35, 70), col });
        }
      }
      function boxDebris(x, y, z, sx, sy, sz, col, pow) {
        const out = [];
        boxSegs(out, (a, b, c) => [x + a, y + b, z + c], -sx, sx, -sy, sy, -sz, sz);
        debrisFromSegs(out, x, y, z, col, pow);
      }
      function setBanner(t, n, col) { banner = t; bannerT = n || 120; bannerCol = col || '#ffe040'; }
      function shieldHit() {
        hitFlash = 16; shake = 16;
        snd.noise(0.5, { freq: 600, slideTo: 80, vol: 0.4 });
        snd.tone(140, 0.4, { type: 'sawtooth', vol: 0.14, slideTo: 50 });
        if (demo || god || mode !== 'play') return;
        if (forceOn) { hitFlash = 6; if (Math.random() < 0.3) speak('base', 'The Force shields you'); return; }
        shields--;
        if (shields <= 0) {
          shields = 0; mode = 'dying'; modeT = 0; music = null; tow = null;
          snd.noise(2.2, { freq: 900, slideTo: 30, vol: 0.5 });
          speak('base', 'Shields are down! Get out of there!', true);
        } else if (shields === 1) speak('base', 'One shield left. Careful now!', true);
        else if (Math.random() < 0.6) speak(isHoth() ? pick(['base', 'wing']) : 'droid', isHoth() ? pick(['You took a hit!', 'Shields weakening', 'Watch that fire!']) : pick(['We are hit! Oh dear', 'Shields are dropping, sir', 'That was far too close']));
      }

      // ---------- letters ----------
      const nextLetter = () => (lettersDone || letterPhase || letterWave >= 2 ? null : JEDI[letters.indexOf(false)]);
      function grantLetter(x, y, z) {
        const i = letters.indexOf(false); if (i < 0 || lettersDone) return;
        letters[i] = true; addScore(PTS.letter); letterOut = false; letterPhase = true; letterWave++;
        burstAt(x, y, z, '#ffffff', 24, 1.6);
        snd.melody([[1047, .07], [1319, .07], [1568, .14]], { type: 'square', vol: .12 });
        if (letters.every(b => b)) {
          lettersDone = true; forceNext = true; addScore(PTS.jedi);
          setBanner('J E D I   BONUS ' + PTS.jedi, 200, '#ffffff');
          snd.melody([[784, .1], [988, .1], [1175, .1], [1568, .4]], { type: 'square', vol: .13, delay: .3 });
          speak('base', 'The Force flows strong in you. It will guard you next wave', true);
        } else {
          setBanner('LETTER ' + JEDI[i], 100, '#ffe040');
          speak('wing', 'Letter ' + JEDI[i] + ' recovered');
        }
      }
      const letterCol = () => ((api.frame & 4) ? '#ffffff' : '#ffe040');

      // ---------- difficulty ----------
      const dw = () => Math.min(wave - 1, 12);
      const tieSpeed = () => 5 + dw() * 0.45;
      const fireDelay = () => Math.max(45, 220 - dw() * 18);
      const ballSpeed = () => 6 + Math.min(6, dw() * 0.55);
      const homing = () => Math.min(0.09, 0.02 + dw() * 0.007);
      const boltSpeed = () => 7 + Math.min(5, dw() * 0.5);

      // ---------- phases ----------
      function hothReset() {
        px = 0; py = 40; pz = 0; yaw = 0; setCam(); tow = null; hy = CY - 40; cockpit = 'speeder';
      }
      function startWave() {
        if (lettersDone) { letters = [false, false, false, false]; lettersDone = false; }
        forceOn = forceNext; forceNext = false; said = {}; letterWave = 0;
        hothReset(); probes = []; walkers = []; atsts = []; bolts = []; debris = []; fireballs = []; ties = []; groups = []; asts = []; sd = null;
        setBanner('WAVE ' + wave, 150, '#40e0ff');
        if (forceOn && !demo) speak('base', 'The Force is with you this wave. Fly boldly', true);
        startProbes();
      }
      function startProbes() {
        phase = 'probes'; phaseT = 0; kills = 0; letterOut = false; letterPhase = false;
        killGoal = demo ? 3 : Math.min(14, 4 + wave * 2);
        cap = demo ? 60 * 12 : 60 * 45;
        phaseMusic();
        if (!demo && !forceOn) speak('base', 'Scout droids over the ice field. Knock them down', true);
      }
      function startWalkers() {
        phase = 'walkers'; phaseT = 0; letterOut = false; letterPhase = false; tripped = 0; endT = 0; lostBase = false;
        walkersTotal = Math.min(5, 1 + wave); walkers = [];
        const sp = 0.42 + Math.min(0.35, dw() * 0.04);
        for (let i = 0; i < walkersTotal; i++) {
          walkers.push({ x: (i - (walkersTotal - 1) / 2) * 520 + rnd(-80, 80), z: 1700 + rnd(0, 500), h: Math.PI + rnd(-0.08, 0.08), sp,
            step: rnd(0, TAU), roll: 0, pitch: 0, state: 'walk', st: 0, fallT: 0, fallDir: 1, cool: rnd(80, 200), hits: 0 });
        }
        atstGoal = Math.min(8, wave + 1); atstSpawned = 0; atsts = [];
        cap = demo ? 60 * 26 : 60 * 80;
        setBanner('WALKERS!  FLY CLOSE AND PRESS X', 200, '#ff8040');
        speak('base', 'Imperial walkers on the north ridge! Use your tow cables', true);
      }
      function startLaunch() {
        phase = 'launch'; phaseT = 0; tow = null; bolts = []; music = null;
        cockpit = 'falcon';
        setBanner(lostBase ? 'THE GENERATOR HAS FALLEN' : 'ESCAPE FROM HOTH', 160, lostBase ? '#ff4040' : '#40e0ff');
        snd.noise(3, { freq: 300, slideTo: 1500, vol: 0.25 });
        if (!demo) speak('droid', lostBase ? 'The base is lost! We must leave at once!' : 'Hurry! The freighter is warming up', true);
      }
      function startTies() {
        phase = 'ties'; phaseT = 0; kills = 0; letterOut = false; letterPhase = false; hy = CY;
        probes = []; walkers = []; atsts = []; bolts = []; debris = []; ties = []; groups = []; fireballs = [];
        killGoal = demo ? 4 : Math.min(14, 4 + Math.floor(wave * 1.5));
        cap = demo ? 60 * 15 : 60 * Math.min(60, 35 + wave * 4);
        bank = 0; setBank(0);
        phaseMusic();
        setBanner('TIE FIGHTERS IN PURSUIT', 150, '#40ff60');
        if (!demo) speak('dark', 'Do not let that freighter slip away', true);
      }
      function startAsteroids() {
        phase = 'asteroids'; phaseT = 0; letterOut = false; letterPhase = false; asts = []; dust = []; sd = null; sdDone = false; dist = 0;
        fieldLen = demo ? 5000 : 10000 + 1200 * Math.min(dw(), 10);
        for (let i = 0; i < 14; i++) spawnRock(rnd(700, 3000));
        for (let i = 0; i < 40; i++) dust.push({ x: rnd(-400, 400), y: rnd(-300, 300), z: rnd(50, 1500) });
        phaseMusic();
        setBanner('ASTEROID FIELD', 150, '#ffa040');
        if (!demo) speak('droid', 'An asteroid field! Our odds in here are simply dreadful', true);
      }
      function startClear() {
        phase = 'clear'; phaseT = 0; fireballs = []; ties = []; groups = []; music = null;
        setBanner('ASTEROID FIELD CLEARED', 170, '#40ff60');
        tally = [['FIELD BONUS', 25000 + 5000 * Math.min(dw(), 10)], ['WALKERS TOPPLED ' + tripped + ' X 2000', tripped * 2000],
          ['SHIELD BONUS ' + shields + ' X ' + PTS.shield, shields * PTS.shield], ['EXTRA SHIELD', -1]];
        cadence();
        if (!demo) speak('droid', 'We are through! I can scarcely believe it', true);
      }
      function nextWave() { wave++; shields = Math.min(9, shields + 1); startWave(); }

      // ---------- Hoth: probes, walkers, bolts ----------
      function spawnProbe(letter) {
        const a = yaw + rnd(-0.7, 0.7), d = rnd(900, 1500);
        probes.push({ x: px + Math.sin(a) * d, y: rnd(25, 70), z: pz + Math.cos(a) * d, vx: 0, vz: 0, t: rnd(0, TAU), cool: rnd(90, 200), letter: letter || null });
      }
      function worldBolt(x, y, z, k) {
        const sp = boltSpeed() * (k || 1), d = Math.hypot(x - px, y - py, z - pz) || 1, lead = d / sp * 0.5;
        const tx = px + Math.sin(yaw) * speed * lead, tz = pz + Math.cos(yaw) * speed * lead;
        const dx = tx - x, dy = py - y, dz = tz - z, dd = Math.hypot(dx, dy, dz) || 1;
        bolts.push({ x, y, z, vx: dx / dd * sp, vy: dy / dd * sp, vz: dz / dd * sp, t: 0 });
        snd.tone(520, 0.18, { type: 'sawtooth', vol: 0.04, slideTo: 180 });
      }
      function updateBolts() {
        for (let i = bolts.length - 1; i >= 0; i--) {
          const b = bolts[i];
          b.x += b.vx; b.y += b.vy; b.z += b.vz; b.t++;
          if (Math.hypot(b.x - px, b.y - py, b.z - pz) < 13) { bolts.splice(i, 1); burstAt(0, -4, 14, '#ff8030', 18, 2); shieldHit(); continue; }
          if (b.y < 0) { bolts.splice(i, 1); burstW(b.x, 0, b.z, '#c0d8ff', 6, 0.8); continue; }
          if (b.t > 320) bolts.splice(i, 1);
        }
      }
      function updateProbes() {
        for (let i = probes.length - 1; i >= 0; i--) {
          const p = probes[i];
          p.t += 0.05;
          const dx = px - p.x, dz = pz - p.z, d = Math.hypot(dx, dz) || 1;
          const want = d > 350 ? 1.4 : -0.6;
          p.vx += (dx / d * want + Math.cos(p.t * 0.7) * 0.8 - p.vx) * 0.03; p.vz += (dz / d * want + Math.sin(p.t * 0.6) * 0.8 - p.vz) * 0.03;
          p.x += p.vx; p.z += p.vz; p.y += Math.sin(p.t * 2) * 0.3;
          if (d < 1200 && d > 120 && --p.cool <= 0 && bolts.length < 6 + wave) { p.cool = fireDelay() * rnd(1, 1.6); worldBolt(p.x, p.y, p.z, 0.8); }
          if (Math.hypot(p.x - px, p.y - py, p.z - pz) < 14) {
            probes.splice(i, 1); burstAt(0, 0, 15, '#ff60ff', 20, 2); shieldHit(); continue;
          }
          if (d > 3200) probes.splice(i, 1);
        }
      }
      function walkerUp(w) { return w.state === 'walk' || w.state === 'stagger'; }
      function updateWalkers() {
        for (const w of walkers) {
          if (walkerUp(w)) {
            if (w.state === 'stagger') { w.pitch = Math.sin(w.st * 0.45) * 0.07 * (w.st / 40); if (--w.st <= 0) { w.state = 'walk'; w.pitch = 0; } }
            else { w.step += 0.05 * w.sp / 0.45; w.x += Math.sin(w.h) * w.sp; w.z += Math.cos(w.h) * w.sp; }
            const d = Math.hypot(w.x - px, w.z - pz);
            if (d < 1500 && d > 70 && --w.cool <= 0 && w.state === 'walk') {
              w.cool = fireDelay() * rnd(0.9, 1.4);
              const T = walkerXf(w), g1 = T(-3, 46, 56), g2 = T(3, 46, 56);
              worldBolt(g1[0], g1[1], g1[2], 1); worldBolt(g2[0], g2[1], g2[2], 1);
            }
            if (bumpT <= 0 && !tow && d < 30 && py < 66) {
              bumpT = 40; shieldHit();
              const a = Math.atan2(px - w.x, pz - w.z); px = w.x + Math.sin(a) * 40; pz = w.z + Math.cos(a) * 40;
            }
            if (w.z < 120 && !lostBase && phase === 'walkers') {
              lostBase = true; endT = 1;
              speak('base', 'The walkers have reached the generator!', true);
            }
          } else if (w.state === 'fall') {
            w.fallT++;
            w.roll = w.fallDir * Math.min(1, Math.pow(w.fallT / 80, 2)) * Math.PI / 2;
            if (w.fallT === 80) {
              w.state = 'down';
              const segs = atatSegs(w);
              debrisFromSegs(segs.filter((s, i) => i % 3 === 0), w.x, 30, w.z, '#e0e8ff', 1.2);
              burstW(w.x, 20, w.z, '#ffe040', 30, 2);
              snd.noise(1.4, { freq: 900, slideTo: 40, vol: 0.5 });
              snd.tone(70, 0.9, { type: 'sawtooth', vol: 0.14, slideTo: 30 });
              shake = 12;
            }
          }
        }
      }
      function spawnAtst() {
        const a = yaw + rnd(-0.5, 0.5), d = rnd(900, 1300);
        const s = { x: px + Math.sin(a) * d, z: pz + Math.cos(a) * d, h: 0, sp: 0.9 + dw() * 0.05, step: 0, roll: 0, pitch: 0, cool: rnd(80, 160), alive: true, letter: null };
        s.h = Math.atan2(px - s.x, pz - s.z);
        if (!letterOut && nextLetter() && atstSpawned === 0) { s.letter = nextLetter(); letterOut = true; }
        atsts.push(s); atstSpawned++;
      }
      function updateAtsts() {
        for (let i = atsts.length - 1; i >= 0; i--) {
          const s = atsts[i];
          const dx = px - s.x, dz = pz - s.z, d = Math.hypot(dx, dz);
          s.h += angDiff(Math.atan2(dx, dz), s.h) * 0.02;
          if (d > 260) { s.x += Math.sin(s.h) * s.sp; s.z += Math.cos(s.h) * s.sp; s.step += 0.12; }
          if (d < 1100 && d > 60 && --s.cool <= 0) {
            s.cool = fireDelay() * rnd(0.7, 1.1);
            const T = walkerXf(s), g = T(sgn() * 7, 29, 14); worldBolt(g[0], g[1], g[2], 1.1);
          }
          if (bumpT <= 0 && d < 16 && py < 40) { bumpT = 40; shieldHit(); }
          if (d > 3500) { atsts.splice(i, 1); if (s.letter) letterOut = false; }
        }
      }
      function tryTow() {
        if (tow) return;
        let best = null, bd = 1e9;
        for (const w of walkers) if (walkerUp(w)) { const d = Math.hypot(w.x - px, w.z - pz); if (d < bd) { bd = d; best = w; } }
        if (!best || bd > 200 || py > 64) {
          snd.tone(220, 0.12, { type: 'square', vol: 0.08, slideTo: 110 });
          if (!demo && best && bd < 500) setBanner(py > 64 ? 'TOO HIGH - GET LOWER' : 'GET CLOSER', 50, '#ff8040');
          return;
        }
        const a = Math.atan2(px - best.x, pz - best.z);
        const spin = (Math.sin(yaw) * Math.cos(a) - Math.cos(yaw) * Math.sin(a)) >= 0 ? 1 : -1;
        tow = { w: best, ang: a, R: 85, spin, total: 0, slack: 0, goal: 3 };
        snd.noise(0.25, { type: 'highpass', freq: 3000, vol: 0.2 });
        snd.tone(1400, 0.3, { type: 'square', vol: 0.08, slideTo: 300 });
        speak('wing', 'Cable locked on! Keep circling ' + (spin > 0 ? 'right' : 'left'), true);
      }
      function updateTow(dx) {
        const w = tow.w;
        if (!walkerUp(w)) { tow = null; return; }
        let k = 0.85;
        if (dx * tow.spin > 0.12) { k = 1.35; tow.slack = Math.max(0, tow.slack - 2); }
        else if (dx * tow.spin < -0.25) { k = 0.55; tow.slack++; }
        if (tow.slack > 45) {
          tow = null; snd.tone(300, 0.3, { type: 'sawtooth', vol: 0.12, slideTo: 60 });
          setBanner('CABLE SNAPPED', 90, '#ff4040'); speak('wing', 'The cable broke loose! Go around again', true);
          return;
        }
        const da = tow.spin * 4.6 * k / tow.R;
        tow.ang += da; tow.total += Math.abs(da);
        px = w.x + Math.sin(tow.ang) * tow.R; pz = w.z + Math.cos(tow.ang) * tow.R;
        py += (30 - py) * 0.08;
        const yt = Math.atan2(Math.cos(tow.ang) * tow.spin, -Math.sin(tow.ang) * tow.spin);
        yaw = yt + tow.spin * 0.62;
        speed = 4.6 * k;
        setBank(tow.spin * 0.45);
        if (api.frame % 6 === 0) snd.tone(900 + tow.total * 40, 0.05, { type: 'square', vol: 0.03 });
        if (tow.total >= tow.goal * TAU) {
          w.state = 'fall'; w.fallT = 0; w.fallDir = -tow.spin; w.pitch = 0;
          tow = null; tripped++; addScore(PTS.atatTrip);
          setBanner('WALKER DOWN  ' + PTS.atatTrip, 140, '#40ff60');
          snd.melody([[523, .08], [659, .08], [784, .16]], { type: 'square', vol: .1 });
          speak('wing', pick(['It is going down! Great flying', 'Walker toppled! Nice work', 'Down it goes!']), true);
        }
      }
      function hothFly(dx, dy) {
        if (tow) { updateTow(dx); return; }
        speed = 4.6 + Math.min(2, dw() * 0.2);
        yaw += dx * 0.032;
        py = clamp(py - dy * 2.2, 12, 110);
        px += Math.sin(yaw) * speed; pz += Math.cos(yaw) * speed;
        const ox = px, oz = pz - 1500;
        if (Math.hypot(ox, oz) > 2700) {
          yaw += angDiff(Math.atan2(-ox, -oz), yaw) * 0.05;
          if (bannerT < 5) setBanner('RETURN TO THE BATTLE', 60, '#ff8040');
        }
        setBank(dx * 0.4);
      }
      function updateProbesPhase() {
        const [dx, dy] = steerOffsets();
        hothFly(dx, dy); setCam();
        const maxAlive = Math.min(5, 2 + wave);
        if (phaseT > 60 && kills + probes.length < killGoal + 1 && probes.length < maxAlive && (phaseT % 70 === 0 || probes.length === 0)) {
          const L = (!letterOut && kills >= 2 && nextLetter()) ? nextLetter() : null;
          if (L) letterOut = true;
          spawnProbe(L);
        }
        updateProbes();
        if (phaseT === 400) sayOnce('p2', 'wing', 'Stay low. They are hard to spot against the snow');
        if (kills >= killGoal || phaseT > cap) startWalkers();
      }
      function updateWalkersPhase() {
        const [dx, dy] = steerOffsets();
        hothFly(dx, dy); setCam();
        updateWalkers();
        if (atstSpawned < atstGoal && atsts.length < 3 && phaseT > 240 && phaseT % 300 === 0) spawnAtst();
        updateAtsts();
        if (probes.length < 2 && phaseT % 420 === 200) spawnProbe(null);
        updateProbes();
        if (phaseT === 600) sayOnce('w2', 'wing', 'Lasers only stagger them. Wrap their legs!');
        const allDown = walkers.every(w => !walkerUp(w));
        if ((allDown || lostBase) && endT === 0) endT = 1;
        if (endT > 0 && ++endT > (allDown ? 150 : 120)) startLaunch();
        else if (phaseT > cap && endT === 0) { lostBase = !allDown; startLaunch(); }
      }
      function updateLaunch() {
        speed = 6;
        py += 1 + phaseT * 0.06; pz += 6;
        hy = Math.min(H + 400, CY - 40 + phaseT * phaseT * 0.02);
        setBank(0); setCam();
        if (phaseT === 1 && walkers.some(walkerUp)) for (const w of walkers) if (walkerUp(w)) w.cool = 9999;
        updateWalkers();
        if (phaseT > 200) startTies();
      }

      // ---------- TIE fighters (camera space) ----------
      function spawnGroup() {
        const n = Math.min(3, 1 + ((Math.random() * (1.2 + Math.min(2, wave * 0.5))) | 0));
        const behind = Math.random() < 0.35;
        const g = { mode: behind ? 'pass' : 'attack', t: 0, side: sgn(), up: sgn(), ax: rnd(-110, 110), ay: rnd(-80, 80) };
        groups.push(g);
        const sx = g.side * rnd(150, 600), sy = behind ? rnd(60, 220) * sgn() : rnd(-300, 300), sz = behind ? rnd(-500, -300) : rnd(1500, 1900);
        const sp = tieSpeed() * rnd(0.95, 1.05) * (behind ? 1.6 : 1);
        const offs = [[0, 0], [-36, -22], [36, -22]];
        let letter = null;
        if (phaseT > 240 && !letterOut && nextLetter()) { letter = nextLetter(); letterOut = true; }
        for (let i = 0; i < n; i++) ties.push({ x: sx + offs[i][0], y: sy + offs[i][1], z: sz + i * 24, vx: 0, vy: 0, vz: behind ? sp : -sp, sp, g, ofx: offs[i][0], ofy: offs[i][1], cool: rnd(60, 150), roll: 0, letter: i === 0 ? letter : null });
        if (behind && !demo) sayOnce('behind' + (phaseT >> 9), 'droid', 'Fighters coming up behind us!');
      }
      function updateGroups() {
        for (let i = groups.length - 1; i >= 0; i--) {
          const g = groups[i];
          if (!ties.some(t => t.g === g)) { groups.splice(i, 1); continue; }
          g.t++;
          const mem = ties.filter(t => t.g === g);
          if (g.mode === 'pass' && (mem.every(t => t.z > 700) || g.t > 300)) { g.mode = 'break'; g.t = 0; }
          else if (g.mode === 'attack' && (mem.some(t => t.z < 210) || g.t > 420)) { g.mode = 'break'; g.t = 0; }
          else if (g.mode === 'break' && g.t > 100) { g.mode = 'attack'; g.t = 0; g.side = sgn(); g.up = sgn(); g.ax = rnd(-120, 120); g.ay = rnd(-90, 90); }
        }
      }
      function updateTies() {
        updateGroups();
        for (let i = ties.length - 1; i >= 0; i--) {
          const t = ties[i], g = t.g;
          let tx, ty, tz;
          if (g.mode === 'attack') { tx = g.ax + t.ofx; ty = g.ay + t.ofy; tz = 120; }
          else if (g.mode === 'pass') { tx = t.ofx + g.side * 60; ty = g.up * 40 + t.ofy; tz = 1500; }
          else { tx = g.side * 900 + t.ofx; ty = g.up * 500 + t.ofy; tz = 1000; }
          const dx = tx - t.x, dy = ty - t.y, dz = tz - t.z, d = Math.hypot(dx, dy, dz) || 1;
          const turn = g.mode === 'pass' ? 0.03 : 0.05;
          t.vx += (dx / d * t.sp - t.vx) * turn; t.vy += (dy / d * t.sp - t.vy) * turn; t.vz += (dz / d * t.sp - t.vz) * turn;
          t.roll += ((-t.vx * 0.09) - t.roll) * 0.1;
          t.x += t.vx; t.y += t.vy; t.z += t.vz;
          if (g.mode === 'attack' && t.z > 260 && t.z < 1300 && --t.cool <= 0 && fireballs.length < Math.min(8, 2 + wave)) {
            t.cool = fireDelay() * rnd(0.7, 1.3);
            fireBall(t.x, t.y, t.z, ballSpeed());
          }
          if (Math.hypot(t.x, t.y, t.z) > 5000) { if (t.letter) letterOut = false; ties.splice(i, 1); }
        }
      }
      function explodeTie(t) {
        const P = xform(TIE, t.x, t.y, t.z, yawOf(t), pitchOf(t), t.roll, 1);
        debrisFromSegs(TIE.e.map(([i, j]) => [P[i], P[j]]), t.x, t.y, t.z, '#60ff80', 1.8);
        burstAt(t.x, t.y, t.z, '#ffe040', 16, 1.2);
        snd.noise(0.7, { freq: 1400, slideTo: 60, vol: 0.38 });
        snd.tone(90, 0.5, { type: 'sawtooth', vol: 0.1, slideTo: 30 });
      }
      function fireBall(x, y, z, sp) {
        const d = Math.hypot(x, y, z) || 1, tArr = Math.max(25, d / sp);
        const close = phase === 'asteroids' ? speed : 0;
        fireballs.push({ x, y, z, vx: -x / tArr, vy: -y / tArr, vz: -z / tArr + close, r: rnd(0, TAU), pz: z, home: homing() });
        snd.tone(260, 0.25, { type: 'sawtooth', vol: 0.05, slideTo: 560 });
      }
      function updateFireballs() {
        for (let i = fireballs.length - 1; i >= 0; i--) {
          const f = fireballs[i];
          f.x += f.vx; f.y += f.vy; f.z += f.vz; f.r += 0.3;
          const close = Math.max(0.5, f.pz - f.z); f.pz = f.z;
          const tr = Math.max(1, f.z / close);
          f.vx += (-f.x / tr - f.vx) * f.home; f.vy += (-f.y / tr - f.vy) * f.home;
          if (f.z < 8) {
            fireballs.splice(i, 1);
            if (Math.abs(f.x) < 28 && Math.abs(f.y) < 24) { burstAt(f.x, f.y, 12, '#ff8030', 20, 2); shieldHit(); }
          } else if (f.z > 4000 || Math.abs(f.x) > 3000 || Math.abs(f.y) > 3000) fireballs.splice(i, 1);
        }
      }
      function updateTiesPhase() {
        const [dx, dy] = steerOffsets();
        turnView(dx * 0.02, -dy * 0.017);
        setBank(dx * 0.3);
        const alive = ties.length, maxAlive = Math.min(7, 2 + wave);
        if (phaseT > 70 && kills + alive < killGoal + 2 && alive < maxAlive && (phaseT % 50 === 0 || alive === 0)) spawnGroup();
        updateTies();
        if (phaseT === 500) sayOnce('t2', 'wing', 'Keep them off the freighter!');
        if ((kills >= killGoal && ties.length === 0) || phaseT > cap) startAsteroids();
        else if (kills >= killGoal && phaseT % 60 === 0) for (const g of groups) { g.mode = 'break'; g.t = -200; }
        if (kills >= killGoal) for (const t of ties) if (t.g.mode === 'break' && t.z > 1600) t.z += 40;
      }

      // ---------- asteroid field ----------
      function spawnRock(z, letter) {
        const ax = Math.pow(Math.random(), 1.4) * sgn(), ay = Math.pow(Math.random(), 1.4) * sgn();
        const r = pick([14, 20, 28, 36, 48, 60]);
        asts.push({ x: ax * 800, y: ay * 560, z, r, m: pick(ROCKS), a: rnd(0, TAU), b: rnd(0, TAU), sa: rnd(-0.03, 0.03), sb: rnd(-0.03, 0.03), letter: letter || null });
      }
      function updateAsteroids() {
        const [dx, dy] = steerOffsets();
        speed = (demo ? 11 : 9) + Math.min(5, dw() * 0.45);
        shiftCam(dx * 7, -dy * 6, speed);
        setBank(dx * 0.35);
        dist += speed;
        for (let i = asts.length - 1; i >= 0; i--) {
          const a = asts[i];
          a.a += a.sa; a.b += a.sb;
          if (a.z < a.r + 8 && a.z > -a.r && Math.abs(a.x) < a.r * 0.8 + 16 && Math.abs(a.y) < a.r * 0.8 + 14) {
            asts.splice(i, 1); burstAt(0, 0, 14, '#ffa040', 24, 2); shieldHit(); if (a.letter) letterOut = false; continue;
          }
          if (a.z < -a.r || Math.abs(a.x) > 2500 || Math.abs(a.y) > 2000) { asts.splice(i, 1); if (a.letter) letterOut = false; }
        }
        const maxA = Math.min(30, 12 + wave * 3);
        if (dist < fieldLen - 2500 && asts.length < maxA && phaseT % 6 === 0) {
          const L = (!letterOut && phaseT > 300 && nextLetter()) ? nextLetter() : null;
          if (L) letterOut = true;
          spawnRock(rnd(2400, 3000), L);
        }
        for (const d of dust) if (d.z < NEAR || Math.abs(d.x) > 600 || Math.abs(d.y) > 450) { d.x = rnd(-400, 400); d.y = rnd(-300, 300); d.z = rnd(1200, 1600); }
        // TIEs harry the Falcon in the field
        if (phaseT > 200 && ties.length < Math.min(4, 1 + (wave >> 1)) && phaseT % 240 === 0 && dist < fieldLen - 3000) spawnGroup();
        updateTies();
        // Star Destroyer overhead
        if (!sd && !sdDone && dist > fieldLen * 0.3) {
          sd = { x: rnd(-120, 120), y: 240, z: -1100, domes: [true, true], cool: 60 };
          setBanner('STAR DESTROYER OVERHEAD', 150, '#ff4040');
          snd.noise(4, { freq: 160, slideTo: 60, vol: 0.3 });
          speak('wing', 'Star Destroyer right on top of us! Hit the bridge domes', true);
        }
        if (sd) {
          sd.z += speed + 3.6;
          if (sd.z > 300 && sd.z < 2600 && --sd.cool <= 0) {
            sd.cool = fireDelay() * 0.45;
            fireBall(sd.x + rnd(-250, 250), sd.y - 40, sd.z + rnd(-500, 500), ballSpeed() * 0.9);
          }
          if (sd.z > 4200 || Math.abs(sd.x) > 4000) { sd = null; sdDone = true; }
        }
        if (dist > fieldLen * 0.5) sayOnce('half', 'wing', 'Halfway through. Keep weaving');
        if (dist >= fieldLen && !asts.some(a => a.z < 1200)) startClear();
      }
      function updateClear() {
        setBank(0);
        if (phaseT > 200) {
          if (demo) { endDemo(); return; }
          phase = 'tally'; phaseT = 0;
        }
      }
      function updateTally() {
        const step = 50;
        if (phaseT % step === 0) {
          const i = phaseT / step - 1;
          if (i >= 0 && i < tally.length) {
            if (tally[i][1] > 0) addScore(tally[i][1]);
            snd.tone(880, 0.12, { type: 'square', vol: 0.12 }); snd.tone(1320, 0.12, { type: 'square', vol: 0.08, delay: 0.1 });
          }
        }
        if (phaseT > step * (tally.length + 3)) nextWave();
      }

      // ---------- controls ----------
      function steerOffsets() { return [clamp((crossX - CX) / (W / 2), -1, 1), clamp((crossY - CY) / (H / 2), -1, 1)]; }
      function playerControl() {
        const m = api.mouse;
        if (lastMX >= 0 && (Math.abs(m.x - lastMX) > 0.5 || Math.abs(m.y - lastMY) > 0.5)) { crossX = m.x; crossY = m.y; keyDrive = false; cvx = cvy = 0; }
        lastMX = m.x; lastMY = m.y;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        if (L || R || U || D) keyDrive = true;
        cvx = (L ? Math.min(cvx, 0) - 0.7 : R ? Math.max(cvx, 0) + 0.7 : cvx * 0.6);
        cvy = (U ? Math.min(cvy, 0) - 0.6 : D ? Math.max(cvy, 0) + 0.6 : cvy * 0.6);
        cvx = clamp(cvx, -9, 9); cvy = clamp(cvy, -8, 8);
        crossX += cvx; crossY += cvy;
        if (keyDrive && !L && !R) crossX += (CX - crossX) * 0.035;
        if (keyDrive && !U && !D) crossY += (CY - crossY) * 0.035;
        const hoth = isHoth();
        return { fire: api.key('Space') || m.down || (!hoth && api.key('KeyX')), tow: hoth && (api.pressed('KeyX') || api.pressed('KeyZ')) };
      }
      function aiControl() {
        let tgt = null, bz = 1e9, slack = 18, towReq = false;
        const want = (c, pri) => { const z = c[2] - (pri || 0); if (c[2] > 30 && z < bz) { bz = z; tgt = c; } };
        let tx = CX, ty = CY;
        if (isHoth()) {
          if (tow) {
            tx = CX + tow.spin * 240; ty = CY;
            crossX += (tx - crossX) * 0.2; crossY += (ty - crossY) * 0.2;
            return { fire: false, tow: false };
          }
          for (const b of bolts) { const c = toCam(b.x, b.y, b.z); if (c[2] < 500) want(c); }
          if (!tgt) {
            for (const p of probes) want(toCam(p.x, p.y, p.z));
            for (const s of atsts) want(toCam(s.x, 31, s.z));
          }
          let goal = null;
          if (phase === 'walkers' && !(tgt && bz < 700)) {
            let bd = 1e9;
            for (const w of walkers) if (walkerUp(w)) { const d = Math.hypot(w.x - px, w.z - pz); if (d < bd) { bd = d; goal = w; } }
            if (goal) { tgt = null; if (bd < 190 && py < 60) towReq = true; }
          }
          if (!tgt && !goal) for (const p of probes) { goal = p; break; }
          if (!tgt && !goal) for (const s of atsts) { goal = s; break; }
          if (goal) {
            const rel = angDiff(Math.atan2(goal.x - px, goal.z - pz), yaw);
            tx = CX + clamp(rel * 500, -280, 280);
            const gy = goal.y != null ? goal.y : 22;
            ty = CY + clamp((py - gy) * 4, -180, 180);
          } else if (tgt) {
            const p = proj(tgt[0], tgt[1], tgt[2]); tx = clamp(p[0], 30, W - 30); ty = clamp(p[1], 40, H - 40);
          } else { tx = CX + 80; ty = CY + (py - 35) * 3; }
          if (tgt && goal) { const p = proj(tgt[0], tgt[1], tgt[2]); tx = clamp(p[0], 30, W - 30); ty = clamp(p[1], 40, H - 40); }
        } else {
          for (const f of fireballs) if (f.z < 900) want([f.x, f.y, f.z]);
          if (phase === 'asteroids') for (const a of asts) if (a.z < 1500 && Math.abs(a.x) < a.r + 60 && Math.abs(a.y) < a.r + 60) want([a.x, a.y, a.z]);
          if (!tgt) for (const t of ties) want([t.x, t.y, t.z]);
          if (!tgt && sd) for (let i = 0; i < 2; i++) if (sd.domes[i]) { const d = SD_DOMES[i]; want([sd.x + d[0], sd.y + d[1], sd.z + d[2]]); }
          if (tgt && tgt[2] > NEAR) { const p = proj(tgt[0], tgt[1], tgt[2]); tx = clamp(p[0], 30, W - 30); ty = clamp(p[1], 40, H - 40); }
        }
        crossX += (tx - crossX) * 0.14; crossY += (ty - crossY) * 0.14;
        return { fire: !!tgt && Math.hypot(tx - crossX, ty - crossY) < slack, tow: towReq };
      }

      // ---------- lasers ----------
      function fireLasers() {
        const target = pickTarget(crossX, crossY);
        lasers.push({ t: 0, T: 6, tx: crossX, ty: crossY, target });
        snd.tone(isHoth() ? 1500 : 1900, 0.15, { type: 'sawtooth', vol: 0.07, slideTo: 280 });
        snd.tone(950, 0.12, { type: 'square', vol: 0.04, slideTo: 180 });
      }
      function pickTarget(sx, sy) {
        let best = null, bz = 1e9;
        const consider = (c, r, hit) => {
          const z = c[2];
          if (z < NEAR + 2 || z > 2800) return;
          const p = proj(c[0], c[1], z), sr = Math.max(8, FOCAL * r / z);
          if (Math.hypot(p[0] - sx, p[1] - sy) < sr + 6 && z < bz) { bz = z; best = hit; }
        };
        if (isHoth()) {
          for (const b of bolts) consider(toCam(b.x, b.y, b.z), 4, () => {
            const i = bolts.indexOf(b); if (i < 0) return;
            bolts.splice(i, 1); addScore(PTS.bolt); burstW(b.x, b.y, b.z, '#ffa040', 10);
          });
          for (const p of probes) consider(toCam(p.x, p.y, p.z), 9, () => {
            const i = probes.indexOf(p); if (i < 0) return;
            probes.splice(i, 1); addScore(PTS.probe); kills++;
            const c = toCam(p.x, p.y, p.z);
            boxDebris(p.x, p.y, p.z, 5, 5, 5, '#ff60ff', 1.6); burstAt(c[0], c[1], c[2], '#ffe040', 14);
            snd.noise(0.5, { freq: 1600, slideTo: 90, vol: 0.32 });
            if (p.letter) grantLetter(c[0], c[1], c[2]);
            else if (Math.random() < 0.25) speak('wing', pick(['Got one!', 'Scratch one droid', 'Nice shot!']));
          });
          for (const s of atsts) consider(toCam(s.x, 31, s.z), 9, () => {
            const i = atsts.indexOf(s); if (i < 0) return;
            atsts.splice(i, 1); addScore(PTS.atst);
            s.alive = false;
            debrisFromSegs(atstSegs(s), s.x, 25, s.z, '#ffd060', 1.6);
            const c = toCam(s.x, 30, s.z); burstAt(c[0], c[1], c[2], '#ffe040', 20, 1.3);
            snd.noise(0.8, { freq: 1300, slideTo: 60, vol: 0.38 });
            if (s.letter) grantLetter(c[0], c[1], c[2]);
          });
          for (const w of walkers) if (walkerUp(w)) {
            const T = walkerXf(w);
            const onHit = q => () => {
              if (!walkerUp(w)) return;
              addScore(PTS.atatHit); w.state = 'stagger'; w.st = 40;
              burstW(q[0], q[1], q[2], '#ffffff', 10, 1);
              snd.tone(200, 0.2, { type: 'square', vol: 0.1, slideTo: 90 });
              sayOnce('armor' + wave, 'wing', 'Their armor is too strong for blasters!');
            };
            const body = T(0, 55, 0), head = T(0, 53, 38);
            consider(toCam(body[0], body[1], body[2]), 18, onHit(body));
            consider(toCam(head[0], head[1], head[2]), 8, onHit(head));
          }
        } else {
          for (const f of fireballs) consider([f.x, f.y, f.z], 5, () => {
            const i = fireballs.indexOf(f); if (i < 0) return;
            fireballs.splice(i, 1); addScore(PTS.bolt);
            burstAt(f.x, f.y, f.z, '#ffa040', 12); snd.noise(0.18, { freq: 2400, vol: 0.2 });
          });
          for (const t of ties) consider([t.x, t.y, t.z], 10, () => {
            const i = ties.indexOf(t); if (i < 0) return;
            ties.splice(i, 1); kills++; addScore(PTS.tie); explodeTie(t);
            if (t.letter) grantLetter(t.x, t.y, t.z);
            else if (Math.random() < 0.3) speak(pick(['wing', 'droid']), pick(['Got him!', 'Splendid shooting!', 'One less on our tail', 'Nice one!']));
          });
          for (const a of asts) consider([a.x, a.y, a.z], a.r * 0.85, () => {
            const i = asts.indexOf(a); if (i < 0) return;
            asts.splice(i, 1); addScore(a.r >= 36 ? PTS.bigRock : PTS.rock);
            const P = xform(a.m, a.x, a.y, a.z, a.a, a.b, 0, a.r);
            debrisFromSegs(a.m.e.map(([p, q]) => [P[p], P[q]]), a.x, a.y, a.z, '#ffa040', 1 + a.r / 30);
            burstAt(a.x, a.y, a.z, '#ffd080', 10, a.r / 25);
            snd.noise(0.5, { freq: 900, slideTo: 80, vol: 0.3 });
            if (a.letter) grantLetter(a.x, a.y, a.z);
          });
          if (sd) for (let k = 0; k < 2; k++) if (sd.domes[k]) {
            const d = SD_DOMES[k];
            consider([sd.x + d[0], sd.y + d[1], sd.z + d[2]], 20, () => {
              if (!sd || !sd.domes[k]) return;
              sd.domes[k] = false; addScore(PTS.dome);
              burstAt(sd.x + d[0], sd.y + d[1], sd.z + d[2], '#ffffff', 26, 1.8);
              snd.noise(1, { freq: 1800, slideTo: 60, vol: 0.4 });
              setBanner('DEFLECTOR DOME  ' + PTS.dome, 120, '#40ff60');
              speak('wing', sd.domes[0] || sd.domes[1] ? 'Dome hit! Get the other one' : 'Both domes gone! Outstanding', true);
            });
          }
        }
        return best;
      }
      function updateLasers() {
        for (let i = lasers.length - 1; i >= 0; i--) {
          const l = lasers[i];
          if (++l.t >= l.T) { lasers.splice(i, 1); if (l.target) l.target(); }
        }
      }

      function updateEngine() {
        phaseT++;
        if (bumpT > 0) bumpT--;
        const ctl = (autopilot || demo) ? aiControl() : playerControl();
        crossX = clamp(crossX, 20, W - 20); crossY = clamp(crossY, 30, H - 30);
        if (fireCool > 0) fireCool--;
        const canFire = phase === 'probes' || phase === 'walkers' || phase === 'ties' || phase === 'asteroids';
        if (ctl.fire && fireCool <= 0 && canFire) { fireCool = demo || autopilot ? 12 : 9; fireLasers(); }
        if (ctl.tow && phase === 'walkers') tryTow();
        updateLasers();
        if (phase === 'probes') updateProbesPhase();
        else if (phase === 'walkers') updateWalkersPhase();
        else if (phase === 'launch') updateLaunch();
        else if (phase === 'ties') updateTiesPhase();
        else if (phase === 'asteroids') updateAsteroids();
        else if (phase === 'clear') updateClear();
        else if (phase === 'tally') updateTally();
        if (mode !== 'play' && mode !== 'attract') return;
        if (isHoth()) updateBolts(); else updateFireballs();
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i];
          d.x += d.vx; d.y += d.vy; d.z += d.vz;
          if (isHoth()) { d.vy -= 0.06; if (d.y < 0) { d.y = 0; d.vy *= -0.3; d.vx *= 0.7; d.vz *= 0.7; } }
          const c = Math.cos(d.spin), s = Math.sin(d.spin), hx = d.hx * c - d.hy * s; d.hy = d.hx * s + d.hy * c; d.hx = hx;
          if (--d.t <= 0) debris.splice(i, 1);
        }
        musicTick();
        if (api.frame % 26 === 0 && !demo && canFire) A.tone(isHoth() ? 70 : 52, 0.45, { type: 'triangle', vol: 0.045 });
      }

      // ---------- game flow ----------
      function resetWorld() {
        lasers = []; frags = []; debris = []; fireballs = []; bolts = []; ties = []; groups = [];
        probes = []; walkers = []; atsts = []; asts = []; dust = []; sd = null; tow = null;
        crossX = CX; crossY = CY; cvx = cvy = 0; bank = 0; cb = 1; sb = 0;
        hitFlash = shake = 0; bannerT = 0; hothReset();
      }
      function startGame() {
        demo = false; resetWorld();
        mode = 'play'; modeT = 0; wave = 1; shields = 6; score = 0;
        letters = [false, false, false, false]; lettersDone = false; forceNext = false;
        fanfare();
        startWave();
      }
      function startDemo() {
        resetWorld(); demo = true; wave = 2; score = 0; shields = 6;
        letters = [false, false, false, false]; lettersDone = false; forceNext = false;
        stage = 'demo'; stageT = 0; sub = null;
        startWave();
      }
      function endDemo() { demo = false; resetWorld(); stage = 'points'; stageT = 0; sub = null; music = null; phase = 'probes'; }
      function attractInit(st) {
        mode = 'attract'; modeT = 0; stage = st || 'title'; stageT = 0; demo = false; music = null; resetWorld(); phase = 'probes'; sub = null;
      }
      function finishGame() {
        if (score > hi) hi = score;
        api.setHiScore(score);
        lastScoreRank = -1;
        if (score > table[table.length - 1].s) { mode = 'initials'; modeT = 0; initials = { l: [0, 0, 0], pos: 0 }; music = null; }
        else { mode = 'gameover'; modeT = 0; }
      }
      function commitInitials() {
        const n = initials.l.map(i => ALPHA[i]).join('');
        const e = { n, s: score };
        table.push(e); table.sort((a, b) => b.s - a.s); table.length = 8;
        lastScoreRank = table.indexOf(e);
        mode = 'gameover'; modeT = 120;
      }

      let titleStep = 0;
      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash--;
        if (bannerT > 0) bannerT--;
        if (hitFlash > 0) hitFlash--;
        if (shake > 0) shake--;
        if (sub && --sub.t <= 0) sub = null;
        for (let i = frags.length - 1; i >= 0; i--) { const f = frags[i]; f.x += f.vx; f.y += f.vy; f.vx *= 0.97; f.vy *= 0.97; f.a += f.spin; if (--f.t <= 0) frags.splice(i, 1); }
        for (const s of snow) { s.y += s.v; s.x += -bank * 3 - 0.3; if (s.y > H) { s.y = -2; s.x = rnd(0, W); } if (s.x < 0) s.x += W; if (s.x > W) s.x -= W; }

        if (mode === 'attract') {
          stageT++; titleStep += 0.05;
          if (stage === 'demo') { updateEngine(); if (stageT > 60 * 95) endDemo(); }
          else {
            for (const s of stars) rot(s, 0.0015, 0.0004, 0, 1, 2);
            if (stage === 'title' && stageT > 480) { stage = 'scores'; stageT = 0; }
            else if (stage === 'scores' && stageT > 420) startDemo();
            else if (stage === 'points' && stageT > 420) { stage = 'title'; stageT = 0; }
          }
          const start = api.pressed('Enter') || ((api.pressed('Space') || api.mouse.clicked) && stage !== 'demo' && stageT > 20);
          if (start) {
            if (api.useCredit()) { A.tone(660, 0.1, { type: 'square', vol: 0.15 }); startGame(); }
            else { coinFlash = 150; A.tone(70, 0.3, { type: 'square', vol: 0.3 }); }
          }
          return;
        }
        if (mode === 'play') { updateEngine(); return; }
        if (mode === 'dying') {
          if (modeT % 5 === 0) burstAt(rnd(-200, 200), rnd(-150, 150), 200, pick(['#ff4040', '#ffe040', '#ffffff']), 8, 2);
          if (modeT === 150) {
            const resume = () => {
              mode = 'play'; modeT = 0; shields = 6; fireballs = []; bolts = []; hitFlash = 0; bumpT = 60;
              if (phase !== 'clear' && phase !== 'tally') phaseMusic();
              speak('base', 'Shields restored. Back into it', true);
            };
            if (api.offerContinue) api.offerContinue(resume, finishGame);
            else finishGame();
          }
          return;
        }
        if (mode === 'initials') {
          const I = initials;
          if (api.pressed('ArrowUp')) { I.l[I.pos] = (I.l[I.pos] + 1) % ALPHA.length; A.tone(500, 0.04, { vol: 0.1 }); }
          if (api.pressed('ArrowDown')) { I.l[I.pos] = (I.l[I.pos] + ALPHA.length - 1) % ALPHA.length; A.tone(450, 0.04, { vol: 0.1 }); }
          if (api.pressed('ArrowLeft') && I.pos > 0) I.pos--;
          const ok = api.pressed('Space') || api.pressed('Enter') || api.pressed('KeyX') || api.pressed('ArrowRight') || api.mouse.clicked;
          if (ok && modeT > 10) { A.tone(880, 0.06, { vol: 0.12 }); if (++I.pos >= 3) commitInitials(); }
          else if (modeT > 60 * 30) commitInitials();
          return;
        }
        if (mode === 'gameover') {
          if (modeT > 300 || (modeT > 90 && api.anyPressed('Enter', 'Space'))) attractInit(lastScoreRank >= 0 ? 'scores' : 'title');
        }
      }

      // ---------- drawing ----------
      function stroke(ctx, col, w) { ctx.strokeStyle = col; ctx.shadowColor = col; ctx.lineWidth = w || 1.3; ctx.stroke(); }
      function text(ctx, s, x, y, sc, col, align, w) { ctx.beginPath(); vtext(ctx, s, x, y, sc, align); stroke(ctx, col, w || 1.2); }
      function drawStars(ctx, upperOnly) {
        ctx.fillStyle = '#ffffff';
        for (const s of stars) {
          if (s[2] < 0.05 || (upperOnly && s[1] < 0.03)) continue;
          const p = proj(s[0], s[1], s[2]);
          if (p[0] > 0 && p[0] < W && p[1] > 0 && p[1] < H) ctx.fillRect(p[0], p[1], s[3], s[3]);
        }
      }
      function letterTag(ctx, c, ch, lift) {
        if (c[2] < NEAR + 2) return;
        const p = proj(c[0], c[1], c[2]), sc = clamp(1200 / c[2], 1.2, 4), y = p[1] - (lift || 0) * FOCAL / c[2] - 8 * sc;
        text(ctx, ch, p[0], y, sc, letterCol(), 'center', 1.6);
      }
      function drawGround(ctx) {
        const G = 200, R = 2000;
        ctx.beginPath();
        const x0 = Math.floor((px - R) / G) * G, z0 = Math.floor((pz - R) / G) * G;
        for (let x = x0; x <= px + R; x += G) SW(ctx, x, 0, pz - R, x, 0, pz + R);
        for (let z = z0; z <= pz + R; z += G) SW(ctx, px - R, 0, z, px + R, 0, z);
        stroke(ctx, '#1c3468', 1);
        // horizon and mountains, drawn by azimuth at "infinity"
        ctx.beginPath();
        const D = 30000, n = mountains.length;
        let prev = null;
        for (let i = 0; i <= n; i++) {
          const az = i * TAU / n, h = mountains[i % n];
          const c = toCam(px + Math.sin(az) * D, h * D + py, pz + Math.cos(az) * D);
          if (prev && prev[2] > 100 && c[2] > 100) seg(ctx, prev, c);
          prev = c;
        }
        stroke(ctx, '#7090d0', 1.2);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const az = yaw - 1.2 + i * 0.35; const a = toCam(px + Math.sin(az) * D, py * 0, pz + Math.cos(az) * D); const b2 = toCam(px + Math.sin(az + 0.35) * D, 0, pz + Math.cos(az + 0.35) * D); seg(ctx, a, b2); }
        stroke(ctx, '#4060a0', 1);
        // snow drifts and the rebel trench line
        ctx.beginPath();
        for (const d of drifts) {
          if (Math.abs(d[0] - px) > 2200 || Math.abs(d[1] - pz) > 2200) continue;
          const mx = (d[0] + d[2]) / 2, mz = (d[1] + d[3]) / 2;
          SW(ctx, d[0], 0, d[1], mx, d[4], mz); SW(ctx, mx, d[4], mz, d[2], 0, d[3]);
        }
        for (let x = -1400; x < 1400; x += 70) {
          const z1 = 140 + ((x / 70) & 1 ? 25 : 0), z2 = 140 + (((x / 70) + 1) & 1 ? 25 : 0);
          SW(ctx, x, 0, z1, x + 70, 0, z2); SW(ctx, x, 0, z1 + 14, x + 70, 0, z2 + 14);
        }
        stroke(ctx, '#a8c8ff', 1.1);
        // shield generator behind the lines
        ctx.beginPath();
        SW(ctx, -8, 0, -300, -4, 60, -300); SW(ctx, 8, 0, -300, 4, 60, -300);
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10, b = (i + 1) * TAU / 10; SW(ctx, Math.cos(a) * 26, 70, -300 + Math.sin(a) * 26, Math.cos(b) * 26, 70, -300 + Math.sin(b) * 26); SW(ctx, Math.cos(a) * 26, 70, -300 + Math.sin(a) * 26, 0, 60, -300); }
        stroke(ctx, lostBase ? '#ff4040' : '#40e0ff', 1.2);
      }
      function drawProbe(ctx, p) {
        const c = [], t = p.t;
        for (let i = 0; i < 8; i++) { const a = t + i * TAU / 8; c.push([p.x + Math.cos(a) * 6, p.y, p.z + Math.sin(a) * 6]); }
        for (let i = 0; i < 8; i++) segW(ctx, c[i], c[(i + 1) % 8]);
        for (let i = 0; i < 8; i += 2) { segW(ctx, c[i], [p.x, p.y + 8, p.z]); }
        for (let i = 1; i < 8; i += 2) { const a = t + i * TAU / 8; segW(ctx, [p.x + Math.cos(a) * 4, p.y - 2, p.z + Math.sin(a) * 4], [p.x + Math.cos(a + 0.3) * 6, p.y - 13, p.z + Math.sin(a + 0.3) * 6]); }
        segW(ctx, [p.x, p.y + 8, p.z], [p.x, p.y + 14, p.z]);
      }
      function drawHoth(ctx) {
        drawStars(ctx, true);
        drawGround(ctx);
        // walkers
        for (const w of walkers) {
          if (Math.hypot(w.x - px, w.z - pz) > 3200) continue;
          ctx.beginPath();
          for (const s of atatSegs(w)) segW(ctx, s[0], s[1]);
          stroke(ctx, w.state === 'down' ? '#5060a0' : w.state === 'stagger' && (api.frame & 2) ? '#ffffff' : '#c8d8ff', 1.3);
        }
        ctx.beginPath();
        for (const s of atsts) for (const q of atstSegs(s)) segW(ctx, q[0], q[1]);
        stroke(ctx, '#ffd060', 1.3);
        ctx.beginPath();
        for (const p of probes) drawProbe(ctx, p);
        stroke(ctx, '#ff60ff', 1.3);
        for (const p of probes) if (p.letter) letterTag(ctx, toCam(p.x, p.y, p.z), p.letter, 16);
        for (const s of atsts) if (s.letter) letterTag(ctx, toCam(s.x, 36, s.z), s.letter, 10);
        // tow cable
        if (tow) {
          const T = walkerXf(tow.w), coils = Math.floor(tow.total / TAU * 3);
          ctx.beginPath();
          for (let k = 0; k <= coils; k++) {
            const y = 8 + k * 2.2, pts = [T(-11, y, -17), T(11, y, -17), T(11, y, 17), T(-11, y, 17)];
            for (let i = 0; i < 4; i++) segW(ctx, pts[i], pts[(i + 1) % 4]);
          }
          const yy = 8 + coils * 2.2, legs = [T(-11, yy, -17), T(11, yy, -17), T(11, yy, 17), T(-11, yy, 17)];
          let best = null;
          for (const l of legs) { const c = toCam(l[0], l[1], l[2]); if (c[2] > NEAR && (!best || c[2] < best[2])) best = c; }
          if (best) { const p = proj(best[0], best[1], best[2]); ctx.moveTo(CX - tow.spin * 30, H - 40); ctx.lineTo(p[0], p[1]); }
          stroke(ctx, '#ffffff', 1.4);
        }
        // blaster bolts
        ctx.beginPath();
        for (const b of bolts) {
          const k = 2.2; segW(ctx, [b.x, b.y, b.z], [b.x - b.vx * k, b.y - b.vy * k, b.z - b.vz * k]);
        }
        stroke(ctx, (api.frame & 2) ? '#ff3030' : '#ff8060', 2.2);
        // snowfall
        ctx.fillStyle = '#d0e0ff';
        if (phase !== 'launch') for (const s of snow) ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      function drawFireballs(ctx) {
        ctx.beginPath();
        for (const f of fireballs) {
          if (f.z < NEAR) continue;
          const p = proj(f.x, f.y, f.z), s = clamp(FOCAL * 5 / f.z, 2, 70);
          for (let k = 0; k < 4; k++) {
            const a = f.r + k * Math.PI / 4, s2 = k & 1 ? s * 0.7 : s;
            ctx.moveTo(p[0] - Math.cos(a) * s2, p[1] - Math.sin(a) * s2); ctx.lineTo(p[0] + Math.cos(a) * s2, p[1] + Math.sin(a) * s2);
          }
          ctx.moveTo(p[0] + s * 0.45, p[1]); ctx.arc(p[0], p[1], s * 0.45, 0, TAU);
        }
        stroke(ctx, (api.frame & 2) ? '#40ff60' : '#c0ff80', 1.5);
      }
      function drawDebris(ctx) {
        const byCol = {}, hoth = isHoth();
        for (const d of debris) (byCol[d.col] = byCol[d.col] || []).push(d);
        for (const col in byCol) {
          ctx.beginPath();
          for (const d of byCol[col]) {
            const a = [d.x - d.hx, d.y - d.hy, d.z - d.hz], b = [d.x + d.hx, d.y + d.hy, d.z + d.hz];
            if (hoth) segW(ctx, a, b); else seg(ctx, a, b);
          }
          stroke(ctx, col, 1.3);
        }
      }
      function drawTies(ctx) {
        ctx.beginPath();
        for (const t of ties) {
          const P = xform(TIE, t.x, t.y, t.z, yawOf(t), pitchOf(t), t.roll, 1);
          for (const [i, j] of TIE.e) seg(ctx, P[i], P[j]);
        }
        stroke(ctx, '#40ff60', 1.4);
        for (const t of ties) if (t.letter) letterTag(ctx, [t.x, t.y, t.z], t.letter, 14);
      }
      function drawPlanet(ctx) {
        // Hoth receding below-behind as the chase begins
        const k = Math.min(1, phaseT / 600), r = 220 * (1 - k) + 30, x = CX - 160, y = H + 60 - k * 40;
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
        ctx.moveTo(x + r * 0.8, y - r * 0.3); ctx.ellipse(x, y - r * 0.3, r * 0.8, r * 0.1, 0, 0, TAU);
        stroke(ctx, '#506090', 1.1);
      }
      function drawSpace(ctx) {
        drawStars(ctx, false);
        if (phase === 'ties' && phaseT < 600) drawPlanet(ctx);
        drawTies(ctx);
      }
      function drawAsteroids(ctx) {
        drawStars(ctx, false);
        ctx.beginPath();
        for (const d of dust) { if (d.z > NEAR + 4) seg(ctx, [d.x, d.y, d.z], [d.x, d.y, d.z + speed * 3]); }
        stroke(ctx, '#506080', 1);
        if (sd) {
          const P = SDM.v.map(v => [v[0] + sd.x, v[1] + sd.y, v[2] + sd.z]);
          ctx.beginPath();
          const domeStart = SDM.e.length - 40;
          for (let i = 0; i < domeStart; i++) seg(ctx, P[SDM.e[i][0]], P[SDM.e[i][1]]);
          stroke(ctx, '#8098d0', 1.3);
          ctx.beginPath();
          for (let k = 0; k < 2; k++) if (sd.domes[k]) for (let i = domeStart + k * 20; i < domeStart + k * 20 + 20; i++) seg(ctx, P[SDM.e[i][0]], P[SDM.e[i][1]]);
          stroke(ctx, (api.frame & 8) ? '#ff6060' : '#ffffff', 1.5);
        }
        const sorted = asts.slice().sort((a, b) => b.z - a.z);
        ctx.beginPath();
        for (const a of sorted) {
          if (a.z > 3200 || a.z < -a.r) continue;
          const P = xform(a.m, a.x, a.y, a.z, a.a, a.b, 0, a.r);
          for (const [i, j] of a.m.e) seg(ctx, P[i], P[j]);
        }
        stroke(ctx, '#ffa040', 1.3);
        for (const a of asts) if (a.letter) letterTag(ctx, [a.x, a.y, a.z], a.letter, a.r);
        drawTies(ctx);
      }
      function drawClear(ctx) {
        ctx.beginPath();
        const k = Math.min(1, phaseT / 120);
        for (const s of stars) {
          if (s[2] < 0.05) continue;
          const p = proj(s[0], s[1], s[2]), dx = p[0] - CX, dy = p[1] - hy;
          ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + dx * k * 0.6, p[1] + dy * k * 0.6);
        }
        stroke(ctx, '#c0d8ff', 1.2);
      }
      function drawLasers(ctx) {
        if (!lasers.length) return;
        ctx.beginPath();
        const guns = cockpit === 'speeder' ? [[40, H - 30], [W - 40, H - 30]] : [[CX - 150, H], [CX + 150, H]];
        for (const l of lasers) {
          const k0 = l.t / l.T, k1 = Math.min(1, k0 + 0.3);
          for (const g of guns) { ctx.moveTo(g[0] + (l.tx - g[0]) * k0, g[1] + (l.ty - g[1]) * k0); ctx.lineTo(g[0] + (l.tx - g[0]) * k1, g[1] + (l.ty - g[1]) * k1); }
        }
        stroke(ctx, '#ff3030', 3);
        ctx.beginPath();
        for (const l of lasers) if (l.t >= l.T - 2) { ctx.moveTo(l.tx + 6, l.ty); ctx.arc(l.tx, l.ty, 6, 0, TAU); }
        stroke(ctx, '#ffffff', 1.4);
      }
      function drawCockpit(ctx) {
        ctx.beginPath();
        if (cockpit === 'speeder') {
          // snowspeeder: wedge nose ahead, canopy frame
          ctx.moveTo(CX - 300, H); ctx.lineTo(CX - 46, H - 74); ctx.lineTo(CX + 46, H - 74); ctx.lineTo(CX + 300, H);
          ctx.moveTo(CX - 46, H - 74); ctx.lineTo(CX - 20, H); ctx.moveTo(CX + 46, H - 74); ctx.lineTo(CX + 20, H);
          ctx.moveTo(0, 90); ctx.lineTo(60, 30); ctx.lineTo(W - 60, 30); ctx.lineTo(W, 90);
          ctx.moveTo(60, 30); ctx.lineTo(60, 0); ctx.moveTo(W - 60, 30); ctx.lineTo(W - 60, 0);
        } else {
          // freighter canopy: radial struts and concentric frame
          for (const [x0, y0, x1, y1] of [[0, 0, 150, 110], [W, 0, W - 150, 110], [0, H, 150, H - 110], [W, H, W - 150, H - 110], [CX, 0, CX, 40]]) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
          ctx.moveTo(150, 110); ctx.quadraticCurveTo(CX, 30, W - 150, 110);
          ctx.moveTo(150, H - 110); ctx.quadraticCurveTo(CX, H - 50, W - 150, H - 110);
          ctx.moveTo(150, 110); ctx.lineTo(120, CY); ctx.lineTo(150, H - 110);
          ctx.moveTo(W - 150, 110); ctx.lineTo(W - 120, CY); ctx.lineTo(W - 150, H - 110);
        }
        stroke(ctx, '#304878', 1.4);
        const x = crossX, y = crossY;
        ctx.beginPath();
        ctx.moveTo(x - 22, y); ctx.lineTo(x - 7, y); ctx.moveTo(x + 7, y); ctx.lineTo(x + 22, y);
        ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 6); ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 16);
        ctx.moveTo(x - 22, y - 5); ctx.lineTo(x - 22, y + 5); ctx.moveTo(x + 22, y - 5); ctx.lineTo(x + 22, y + 5);
        ctx.moveTo(x - 12, y - 12); ctx.lineTo(x - 16, y - 12); ctx.moveTo(x + 12, y - 12); ctx.lineTo(x + 16, y - 12);
        ctx.moveTo(x - 12, y + 12); ctx.lineTo(x - 16, y + 12); ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + 16, y + 12);
        stroke(ctx, '#ffe040', 1.5);
      }
      function drawHUD(ctx) {
        text(ctx, String(score), 18, 14, 2.6, '#ffffff', 'left', 1.3);
        text(ctx, 'WAVE ' + wave, W - 18, 14, 2.2, '#40e0ff', 'right');
        // JEDI letters
        for (let i = 0; i < 4; i++) text(ctx, JEDI[i], W - 90 + i * 20, 36, 2, letters[i] ? '#ffe040' : '#283858', 'left', letters[i] ? 1.6 : 1);
        ctx.beginPath(); vtext(ctx, 'SHIELD', CX, 12, 1.6, 'center');
        const n = Math.max(6, shields), bw = 14, x0 = CX - n * bw / 2;
        for (let i = 0; i < n; i++) {
          ctx.rect(x0 + i * bw + 2, 26, bw - 4, 12);
          if (i < shields) { ctx.moveTo(x0 + i * bw + 5, 29); ctx.lineTo(x0 + i * bw + bw - 5, 35); ctx.moveTo(x0 + i * bw + bw - 5, 29); ctx.lineTo(x0 + i * bw + 5, 35); }
        }
        stroke(ctx, forceOn ? ['#ffffff', '#40e0ff', '#ffe040'][(api.frame >> 3) % 3] : shields <= 1 ? ((api.frame & 8) ? '#ff3030' : '#ff9090') : shields <= 2 ? '#ffe040' : '#40ff60', 1.2);
        if (forceOn) text(ctx, 'FORCE', CX, 44, 1.4, '#ffffff', 'center');
        let info = '';
        if (phase === 'probes') info = 'PROBE DROIDS ' + Math.max(0, killGoal - kills);
        else if (phase === 'walkers') info = 'AT-AT WALKERS ' + walkers.filter(walkerUp).length + (tow ? '   WRAPS ' + Math.floor(tow.total / TAU) + ' OF ' + tow.goal : '');
        else if (phase === 'ties') info = 'TIE FIGHTERS ' + Math.max(0, killGoal - kills);
        else if (phase === 'asteroids') info = 'FIELD ' + Math.min(100, Math.floor(dist / fieldLen * 100)) + ' PCT';
        if (info) text(ctx, info, 18, 42, 1.5, tow ? '#ffffff' : '#80a0ff');
        if (phase === 'walkers' && !tow && !demo) {
          let bd = 1e9;
          for (const w of walkers) if (walkerUp(w)) bd = Math.min(bd, Math.hypot(w.x - px, w.z - pz));
          if (bd < 200 && py <= 64 && (api.frame & 16)) text(ctx, 'PRESS X - TOW CABLE', CX, H - 120, 2.2, '#ffffff', 'center', 1.4);
        }
        if (tow) {   // wrap meter
          const k = tow.total / (tow.goal * TAU);
          ctx.beginPath(); ctx.rect(CX - 100, H - 108, 200, 10); ctx.moveTo(CX - 100, H - 103); ctx.lineTo(CX - 100 + 200 * Math.min(1, k), H - 103);
          stroke(ctx, '#ffffff', 2);
          text(ctx, 'HOLD ' + (tow.spin > 0 ? 'RIGHT' : 'LEFT'), CX, H - 132, 1.8, tow.slack > 15 ? '#ff4040' : '#40ff60', 'center');
        }
      }
      function drawSubtitle(ctx) {
        if (!sub) return;
        const sc = 1.8, lines = [];
        let cur = '';
        for (const w of sub.text.toUpperCase().split(' ')) { if ((cur + ' ' + w).trim().length > 40) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
        if (cur) lines.push(cur);
        const y0 = H - 40 - lines.length * 16;
        ctx.globalAlpha = Math.min(1, sub.t / 20);
        text(ctx, sub.who + ':', CX, y0 - 16, 1.4, sub.col, 'center');
        lines.forEach((l, i) => text(ctx, l, CX, y0 + i * 16, sc, '#e0e8ff', 'center', 1.1));
        ctx.globalAlpha = 1;
      }
      function drawTally(ctx) {
        text(ctx, 'WAVE ' + wave + ' COMPLETE', CX, 110, 3.4, '#ffe040', 'center', 1.6);
        tally.forEach((t, i) => {
          if (phaseT < (i + 1) * 50) return;
          const y = 180 + i * 38;
          text(ctx, t[0], CX - 260, y, 2.2, '#ffffff', 'left');
          text(ctx, t[1] < 0 ? '+1' : String(t[1]), CX + 260, y, 2.2, t[1] < 0 ? '#40ff60' : '#ffffff', 'right');
        });
        if (phaseT > 50 * (tally.length + 1)) text(ctx, 'PREPARE FOR WAVE ' + (wave + 1), CX, 380, 2.4, '#40e0ff', 'center');
      }
      function drawWorld(ctx) {
        if (isHoth()) drawHoth(ctx);
        else if (phase === 'ties') drawSpace(ctx);
        else if (phase === 'asteroids') drawAsteroids(ctx);
        else if (phase === 'clear') drawClear(ctx);
        else drawStars(ctx, false);
        drawDebris(ctx);
        if (!isHoth()) drawFireballs(ctx);
      }
      function drawFrags(ctx) {
        for (const f of frags) {
          ctx.beginPath();
          ctx.moveTo(f.x - Math.cos(f.a) * f.len / 2, f.y - Math.sin(f.a) * f.len / 2); ctx.lineTo(f.x + Math.cos(f.a) * f.len / 2, f.y + Math.sin(f.a) * f.len / 2);
          ctx.globalAlpha = Math.min(1, f.t / 20); stroke(ctx, f.col, 1.4);
        }
        ctx.globalAlpha = 1;
      }
      function drawTitle(ctx) {
        // an AT-AT plods across the snow beneath the logo
        const spx = px, spy = py, spz = pz, syaw = yaw, shy = hy;
        px = 0; py = 30; pz = 0; yaw = 0; setCam(); hy = 300;
        const w = { x: 260 - ((stageT * 0.5) % 520), z: 330, h: -Math.PI / 2, step: titleStep * 1.2, roll: 0, pitch: 0, state: 'walk' };
        ctx.beginPath();
        for (let x = -600; x <= 600; x += 100) SW(ctx, x, 0, 40, x, 0, 2000);
        for (let z = 100; z <= 1500; z += 140) SW(ctx, -800, 0, z, 800, 0, z);
        stroke(ctx, '#1c3468', 1);
        ctx.beginPath(); for (const s of atatSegs(w)) segW(ctx, s[0], s[1]); stroke(ctx, '#c8d8ff', 1.3);
        px = spx; py = spy; pz = spz; yaw = syaw; setCam(); hy = shy;
        text(ctx, 'THE', CX, 46, 4, '#c8e4ff', 'center', 1.6);
        text(ctx, 'EMPIRE', CX, 80, 9, '#c8e4ff', 'center', 2.6);
        text(ctx, 'STRIKES BACK', CX, 150, 5.2, '#ff4040', 'center', 2.2);
        ctx.beginPath(); ctx.moveTo(CX - 210, 192); ctx.lineTo(CX + 210, 192); ctx.moveTo(CX - 180, 198); ctx.lineTo(CX + 180, 198); stroke(ctx, '#ff4040', 1.2);
        text(ctx, 'HOTH  -  PURSUIT  -  ASTEROID FIELD', CX, 214, 1.8, '#40e0ff', 'center');
      }
      function drawScores(ctx) {
        text(ctx, 'TOP PILOTS', CX, 60, 4, '#c8e4ff', 'center', 1.8);
        table.forEach((e, i) => {
          const y = 120 + i * 30, col = i === lastScoreRank ? ((api.frame & 8) ? '#ffffff' : '#ffe040') : (i === 0 ? '#ff6060' : '#40e0ff');
          text(ctx, (i + 1) + '.', CX - 170, y, 2.4, col, 'right');
          text(ctx, e.n, CX - 140, y, 2.4, col, 'left');
          text(ctx, String(e.s), CX + 190, y, 2.4, col, 'right');
        });
      }
      function drawPoints(ctx) {
        text(ctx, 'SCORING', CX, 34, 4, '#c8e4ff', 'center', 1.8);
        const rows = [['PROBE DROID', PTS.probe, '#ff60ff'], ['AT-ST WALKER', PTS.atst, '#ffd060'], ['AT-AT LASER HIT', PTS.atatHit, '#c8d8ff'],
          ['AT-AT TOPPLED (TOW CABLE)', PTS.atatTrip, '#c8d8ff'], ['TIE FIGHTER', PTS.tie, '#40ff60'], ['ASTEROID', PTS.rock + ' - ' + PTS.bigRock, '#ffa040'],
          ['DEFLECTOR DOME', PTS.dome, '#8098d0'], ['ENEMY SHOT', PTS.bolt, '#ff4040'], ['LETTER TARGET', PTS.letter, '#ffe040'], ['J-E-D-I BONUS', PTS.jedi, '#ffffff']];
        rows.forEach((r, i) => { text(ctx, r[0], CX - 240, 80 + i * 26, 2, r[2], 'left'); text(ctx, String(r[1]), CX + 240, 80 + i * 26, 2, '#ffffff', 'right'); });
        text(ctx, 'SPELL JEDI FOR THE FORCE', CX, 352, 1.8, '#ffe040', 'center');
      }
      function drawInitials(ctx) {
        text(ctx, 'YOU ARE A TOP PILOT', CX, 90, 3.4, '#c8e4ff', 'center', 1.6);
        text(ctx, 'SCORE ' + score, CX, 150, 2.6, '#ffffff', 'center');
        text(ctx, 'ENTER YOUR INITIALS', CX, 200, 2.2, '#40e0ff', 'center');
        for (let i = 0; i < 3; i++) {
          const x = CX + (i - 1) * 60, on = i === initials.pos;
          text(ctx, ALPHA[initials.l[i]], x, 250, 6, on && (api.frame & 16) ? '#ffffff' : '#ffe040', 'center', 2);
          if (on) { ctx.beginPath(); ctx.moveTo(x - 14, 296); ctx.lineTo(x + 14, 296); stroke(ctx, '#ffffff', 2); }
        }
        text(ctx, 'UP/DOWN: LETTER   FIRE: NEXT', CX, 340, 1.8, '#c0c8ff', 'center');
      }
      function coinLines(ctx, y) {
        const blinkOn = coinFlash > 0 ? (coinFlash % 20) < 14 : (api.frame % 60) < 40;
        if (blinkOn) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', CX, y, 3.2, '#ffffff', 'center', 1.5);
        text(ctx, 'HIGH SCORE ' + Math.max(hi, table[0].s), CX, y + 40, 2, '#ff6060', 'center');
        text(ctx, 'CREDIT ' + String(Math.min(api.credits, 99)).padStart(2, '0') + '      (C) 1985 ATARI', CX, y + 66, 1.8, '#a0a8c0', 'center');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowBlur = 8; ctx.globalAlpha = 1;
        ctx.save();
        if (shake > 0) ctx.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5);
        const inEngine = mode === 'play' || mode === 'dying' || (mode === 'attract' && stage === 'demo');
        if (inEngine) {
          drawWorld(ctx);
          drawFrags(ctx);
          drawLasers(ctx);
          if (phase !== 'clear' && phase !== 'tally' && mode !== 'dying') drawCockpit(ctx);
        } else {
          const sb0 = sb, cb0 = cb, hy0 = hy; cb = 1; sb = 0; hy = CY; drawStars(ctx, false); cb = cb0; sb = sb0; hy = hy0;
          drawFrags(ctx);
        }
        ctx.restore();
        if (hitFlash > 0) { ctx.fillStyle = forceOn ? 'rgba(120,200,255,' + hitFlash / 32 + ')' : 'rgba(255,60,40,' + hitFlash / 32 + ')'; ctx.fillRect(0, 0, W, H); }
        ctx.shadowBlur = 6;
        if (inEngine) {
          drawHUD(ctx);
          if (phase === 'tally') drawTally(ctx);
          if (bannerT > 0 && phase !== 'tally') { ctx.globalAlpha = Math.min(1, bannerT / 20); text(ctx, banner, CX, 100, 2.8, bannerCol, 'center', 1.5); ctx.globalAlpha = 1; }
        }
        if (mode === 'dying') {
          ctx.beginPath();
          for (let i = 0; i < 9; i++) {
            let x = CX + Math.cos(i * 0.7) * 30, y = CY + Math.sin(i * 0.7) * 30; ctx.moveTo(x, y);
            for (let k = 0; k < 6; k++) { x += Math.cos(i * 0.7 + Math.sin(k * 3 + i) * 0.5) * 50; y += Math.sin(i * 0.7 + Math.sin(k * 3 + i) * 0.5) * 50; ctx.lineTo(x, y); }
          }
          stroke(ctx, '#c0d0ff', 1.2);
          if (modeT & 16) text(ctx, 'SHIELDS GONE', CX, 200, 4, '#ff3030', 'center', 1.8);
        }
        if (mode === 'play' || mode === 'dying') drawSubtitle(ctx);
        if (mode === 'initials') drawInitials(ctx);
        if (mode === 'gameover') {
          text(ctx, 'GAME OVER', CX, 170, 6, '#ff3030', 'center', 2);
          text(ctx, 'SCORE ' + score, CX, 250, 2.6, '#ffffff', 'center');
          text(ctx, 'REACHED WAVE ' + wave, CX, 285, 2.2, '#40e0ff', 'center');
        }
        if (mode === 'attract') {
          if (stage === 'title') drawTitle(ctx);
          else if (stage === 'scores') drawScores(ctx);
          else if (stage === 'points') drawPoints(ctx);
          else text(ctx, 'THE EMPIRE STRIKES BACK', CX, 70, 3, '#c8e4ff', 'center', 1.6);
          coinLines(ctx, stage === 'demo' ? 340 : stage === 'title' ? 370 : 384);
        }
        ctx.shadowBlur = 0;
      }

      attractInit('title');
      return {
        update, render,
        destroy() { music = null; },
        // test hook for scripted bots
        debug: {
          start(opts) { startGame(); if (opts && opts.wave) { wave = opts.wave; startWave(); } if (opts && opts.shields) shields = opts.shields; autopilot = !!(opts && opts.auto); god = !!(opts && opts.god); },
          info() { return { mode, stage, demo, phase, wave, score, shields, kills, killGoal, tripped, walkers: walkers.length, letters: letters.join(), lettersDone, forceOn, dist: Math.round(dist), fieldLen, phaseT, tow: !!tow }; }
        }
      };
    }
  });
})();
