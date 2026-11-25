// Star Wars (Atari, 1983) - from-scratch colour-vector recreation for the Game Room.
// First-person view from an X-wing: a TIE fighter dogfight in space, a low run over the Death Star surface
// (laser towers and bunkers, from wave 2) and the trench run to the exhaust port. Six deflector shields,
// wave select, Death Star explosion with bonus tally, radio chatter with subtitles and original music.
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

  // ---------- wireframe models (local +z = direction of flight) ----------
  function buildModel(fn) {
    const v = [], e = [];
    const ring = (n, f) => { const s = v.length; for (let i = 0; i < n; i++) v.push(f(i * TAU / n)); for (let i = 0; i < n; i++) e.push([s + i, s + (i + 1) % n]); return s; };
    fn(v, e, ring);
    return { v, e };
  }
  // TIE fighter: ball cockpit, two hexagonal wing panels with spokes, pylons
  const TIE = buildModel((v, e, ring) => {
    ring(8, a => [0, Math.cos(a) * 3.2, Math.sin(a) * 3.2]);
    ring(8, a => [Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0]);
    const w = v.length; v.push([0, 0, 3.2]); v.push([0, 0, 1.6]);
    e.push([w, w + 1]);
    for (const sx of [-1, 1]) {
      const s = ring(6, a => [sx * 8, Math.cos(a + Math.PI / 6) * 9, Math.sin(a + Math.PI / 6) * 9]);
      const c = v.length; v.push([sx * 8, 0, 0]);
      for (let i = 0; i < 6; i++) e.push([c, s + i]);
      const p = v.length; v.push([sx * 3.2, 0, 0]); e.push([p, c]);
      v.push([sx * 3.2, 1, 0], [sx * 8, 1.4, 0]); e.push([p + 1, p + 2]);
    }
  });
  // Dark lord's TIE advanced: bent wings, longer body
  const VADER = buildModel((v, e, ring) => {
    ring(8, a => [0, Math.cos(a) * 3.4, Math.sin(a) * 3.4]);
    ring(8, a => [Math.cos(a) * 3.4, Math.sin(a) * 3.4, 0]);
    const b = v.length; v.push([0, 0, -7], [0, 2, -3.4], [0, -2, -3.4]); e.push([b, b + 1], [b, b + 2]);
    for (const sx of [-1, 1]) {
      const s = v.length;
      v.push([sx * 6, 9, -4], [sx * 8.5, 3, 5], [sx * 8.5, -3, 5], [sx * 6, -9, -4], [sx * 9, 0, -1]);
      e.push([s, s + 1], [s + 1, s + 2], [s + 2, s + 3], [s, s + 4], [s + 3, s + 4], [s + 1, s + 4], [s + 2, s + 4]);
      const k = v.length; v.push([sx * 3.4, 0, 0]); e.push([k, s + 4]);
    }
  });

  // ---------- scoring (values in the spirit of the arcade) ----------
  const PTS = { tie: 1000, vader: 2000, fireball: 33, towerTop: 200, bunker: 100, turret: 100, allTowers: 50000, force: 50000, shield: 5000 };
  const CHOICES = [
    { wave: 1, name: 'EASY', bonus: 0, col: '#40ff60' },
    { wave: 3, name: 'MEDIUM', bonus: 400000, col: '#ffe040' },
    { wave: 5, name: 'HARD', bonus: 800000, col: '#ff4040' }
  ];
  const SPEAKERS = {
    base: { tag: 'BASE', col: '#ffe040', f: 98 },
    wing: { tag: 'WINGMATE', col: '#40e0ff', f: 132 },
    lead: { tag: 'LEADER', col: '#80ff80', f: 112 },
    dark: { tag: 'DARK LORD', col: '#ff4040', f: 68 }
  };
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.-_';

  ArcadeRegistry.register({
    id: 'starwars', title: 'Star Wars', year: 1983, maker: 'Atari',
    width: W, height: H, vector: true, pointer: true,
    controls: 'Mouse or Arrows: fly/aim \u00b7 Space/X/Click: fire lasers \u00b7 Enter: start',
    marquee: { bg: '#000008', fg: '#ffe81f', accent: '#ff3030' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const sgn = () => (Math.random() < 0.5 ? -1 : 1);
      const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
      const pick = arr => arr[(Math.random() * arr.length) | 0];

      // ---------- high score table ----------
      const table = [1000000, 800000, 600000, 500000, 400000, 300000, 200000, 100000]
        .map((s, i) => ({ n: ['ACE', 'RDL', 'WED', 'JMP', 'KTO', 'BRN', 'SKY', 'DSN'][i], s }));
      let hi = api.getHiScore(table[0].s);
      if (hi > table[0].s) { table.unshift({ n: 'TOP', s: hi }); table.pop(); }

      // ---------- state ----------
      let mode = 'attract', modeT = 0, stage = 'title', stageT = 0, coinFlash = 0;
      let demo = false, autopilot = false, god = false;
      let phase = 'space', phaseT = 0;
      let score = 0, shields = 6, wave = 1, kills = 0, killGoal = 8, spaceCap = 3600;
      let crossX = CX, crossY = CY, cvx = 0, cvy = 0, lastMX = -1, lastMY = -1, keyDrive = false, fireCool = 0;
      let bank = 0, cb = 1, sb = 0;
      let lasers = [], frags = [], debris = [], fireballs = [], ties = [], groups = [];
      let towers = [], bunkers = [], turrets = [], catwalks = [];
      let px = 0, py = 0, pz = 0, opx = 0, opy = 0, opz = 0, speed = 0;
      let surfLen = 0, portZ = 0, trenchBase = 0, trenchShots = 0, trenchRuns = 0, portDone = false, vaderOn = false;
      let hitFlash = 0, shake = 0, banner = '', bannerT = 0, bannerCol = '#ffe040', sub = null;
      let dsDir = [0, 0, 1], tally = [], towerTotal = 0, towerKills = 0, said = {};
      let selIdx = 0, selT = 0, initials = null, music = null, lastScoreRank = -1;
      const stars = [];
      for (let i = 0; i < 200; i++) { const a = rnd(0, TAU), b = Math.acos(rnd(-1, 1)); stars.push([Math.sin(b) * Math.cos(a), Math.sin(b) * Math.sin(a), Math.cos(b), rnd(0.6, 1.8)]); }

      // ---------- sound ----------
      const snd = {
        tone(f, d, o) { if (!demo) A.tone(f, d, o); },
        noise(d, o) { if (!demo) A.noise(d, o); },
        melody(n, o) { if (!demo) A.melody(n, o); }
      };
      // speech-like radio voice: a buzzy glottal tone shaped by band-passed noise "formants" per syllable
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
      function fanfare() {   // heroic opening fanfare in B-flat
        const mel = [[65, .12], [70, .12], [74, .36], [72, .12], [70, .12], [72, .24], [77, .6], [75, .12], [74, .12], [72, .12], [74, .24], [70, .24], [67, .24], [69, .24], [70, .8]];
        snd.melody(mel.map(([n, d]) => [N(n), d]), { type: 'square', vol: 0.1 });
        const bass = [[46, .6], [41, .6], [51, .6], [53, .6], [46, .9]];
        snd.melody(bass.map(([n, d]) => [N(n), d]), { type: 'triangle', vol: 0.14 });
        snd.melody(mel.map(([n, d]) => [N(n - 12), d]), { type: 'triangle', vol: 0.05 });
      }
      function victory() {   // triumphant cadence after the Death Star goes up
        const mel = [[72, .15], [76, .15], [79, .15], [84, .45], [83, .15], [81, .15], [79, .3], [77, .15], [79, .15], [84, .9]];
        snd.melody(mel.map(([n, d]) => [N(n), d]), { type: 'square', vol: 0.1, delay: 1.4 });
        const bass = [[48, .6], [53, .6], [55, .6], [48, 1]];
        snd.melody(bass.map(([n, d]) => [N(n), d]), { type: 'triangle', vol: 0.14, delay: 1.4 });
      }
      // looping step sequencers: space/surface battle pulse and the rising trench tension figure
      const PATTERNS = {
        space: { step: 9, notes: [50, 0, 50, 57, 0, 50, 55, 0, 53, 0, 53, 60, 0, 52, 48, 0] },
        surface: { step: 8, notes: [45, 0, 45, 52, 45, 0, 50, 0, 48, 0, 48, 55, 48, 0, 47, 0] },
        trench: { step: 8, notes: [40, 40, 52, 40, 41, 40, 52, 40, 40, 40, 52, 40, 43, 41, 52, 40] }
      };
      function musicStart(name) { music = { name, i: 0, t: 1 }; }
      function musicTick() {
        if (!music || demo || mode !== 'play') return;
        if (--music.t > 0) return;
        const p = PATTERNS[music.name];
        let step = p.step, lift = 0;
        if (music.name === 'trench' && phase === 'trench') {
          const prog = clamp(1 - (portZ - pz) / Math.max(1, portZ - trenchBase), 0, 1);
          lift = Math.floor(prog * 7); step = Math.max(5, Math.round(8 - prog * 3));
        }
        music.t = step;
        const n = p.notes[music.i % p.notes.length];
        if (n) snd.tone(N(n + lift - 12), step / 60 * 0.9, { type: 'triangle', vol: 0.13 });
        if (music.name === 'trench' && music.i % 8 === 0) snd.tone(N(76 + lift), 0.5, { type: 'sine', vol: 0.035, slideTo: N(75 + lift) });
        if (music.name !== 'trench' && music.i % 16 === 0) snd.tone(N(p.notes[0] + 24), 0.35, { type: 'square', vol: 0.025 });
        music.i++;
      }

      // ---------- 3D helpers ----------
      function setBank(target) { bank += (target - bank) * 0.08; cb = Math.cos(bank); sb = Math.sin(bank); }
      function proj(x, y, z) { const rx = x * cb - y * sb, ry = x * sb + y * cb; return [CX + FOCAL * rx / z, CY - FOCAL * ry / z]; }
      function seg(ctx, a, b) {
        if (a[2] < NEAR && b[2] < NEAR) return;
        if (a[2] < NEAR) { const t = (NEAR - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]; }
        else if (b[2] < NEAR) { const t = (NEAR - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, NEAR]; }
        const p = proj(a[0], a[1], a[2]), q = proj(b[0], b[1], b[2]);
        if (Math.abs(p[0]) > 9000 || Math.abs(q[0]) > 9000 || Math.abs(p[1]) > 9000 || Math.abs(q[1]) > 9000) return;
        ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
      }
      const S = (ctx, x1, y1, z1, x2, y2, z2) => seg(ctx, [x1, y1, z1], [x2, y2, z2]);
      function xform(m, x, y, z, yaw, pitch, roll, sc) {
        const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
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
      function turnView(ay, ax) {   // the X-wing turns: rotate everything in camera space the other way
        for (const t of ties) { rot(t, ay, ax, 'x', 'y', 'z'); rot(t, ay, ax, 'vx', 'vy', 'vz'); }
        for (const f of fireballs) { rot(f, ay, ax, 'x', 'y', 'z'); rot(f, ay, ax, 'vx', 'vy', 'vz'); }
        for (const d of debris) { rot(d, ay, ax, 'x', 'y', 'z'); rot(d, ay, ax, 'vx', 'vy', 'vz'); rot(d, ay, ax, 'hx', 'hy', 'hz'); }
        for (const s of stars) rot(s, ay, ax, 0, 1, 2);
        rot(dsDir, ay, ax, 0, 1, 2);
      }
      function shiftView(dx, dy, dz) {   // the X-wing translates (surface/trench): camera-space objects slide
        for (const f of fireballs) { f.x -= dx; f.y -= dy; f.z -= dz; }
        for (const d of debris) { d.x -= dx; d.y -= dy; d.z -= dz; }
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
      function debrisFromPoints(P, edges, cx, cy, cz, vx, vy, vz, col, pow) {
        for (const [i, j] of edges) {
          if (debris.length > 420) break;
          const a = P[i], b = P[j];
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2;
          let dx = mx - cx, dy = my - cy, dz = mz - cz; const d = Math.hypot(dx, dy, dz) || 1;
          const s = rnd(0.6, 1.6) * (pow || 1.5);
          debris.push({ x: mx, y: my, z: mz, hx: (b[0] - a[0]) / 2, hy: (b[1] - a[1]) / 2, hz: (b[2] - a[2]) / 2,
            vx: vx * 0.5 + dx / d * s + rnd(-0.4, 0.4), vy: vy * 0.5 + dy / d * s + rnd(-0.4, 0.4), vz: vz * 0.5 + dz / d * s, spin: rnd(-0.25, 0.25), t: rnd(35, 70), col });
        }
      }
      function boxDebris(x, y, z, sx, sy, sz, col, pow) {
        const P = [];
        for (let i = 0; i < 8; i++) P.push([x + (i & 1 ? sx : -sx), y + (i & 2 ? sy : -sy), z + (i & 4 ? sz : -sz)]);
        const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
        debrisFromPoints(P, E, x, y, z, 0, 0, 0, col, pow);
      }
      function setBanner(t, n, col) { banner = t; bannerT = n || 120; bannerCol = col || '#ffe040'; }
      function shieldHit() {
        hitFlash = 16; shake = 16;
        snd.noise(0.5, { freq: 600, slideTo: 80, vol: 0.4 });
        snd.tone(140, 0.4, { type: 'sawtooth', vol: 0.14, slideTo: 50 });
        if (demo || god || mode !== 'play') return;
        shields--;
        if (shields <= 0) {
          shields = 0; mode = 'dying'; modeT = 0; music = null;
          snd.noise(2.2, { freq: 900, slideTo: 30, vol: 0.5 });
          speak('base', 'Your shields are gone! Pull out!', true);
        } else if (shields === 1) speak('base', 'One shield left. Hang on!', true);
        else if (Math.random() < 0.6) speak(pick(['base', 'wing']), pick(['Shields weakening', 'You took a hit!', 'Deflectors losing power']));
      }

      // ---------- difficulty ----------
      const dw = () => Math.min(wave - 1, 12);
      const tieSpeed = () => 5 + dw() * 0.45;
      const fireDelay = () => Math.max(42, 250 - dw() * 20);
      const ballSpeed = () => 6 + Math.min(6, dw() * 0.55);
      const homing = () => Math.min(0.09, 0.02 + dw() * 0.007);

      // ---------- phases ----------
      function startWave() {
        phase = 'space'; phaseT = 0; ties = []; groups = []; fireballs = []; debris = []; kills = 0; vaderOn = false;
        killGoal = demo ? 4 : Math.min(22, 6 + wave * 2);
        spaceCap = demo ? 60 * 16 : 60 * Math.min(90, 50 + wave * 5);
        dsDir = [rnd(-0.35, 0.35), rnd(-0.15, 0.3), 1]; const l = Math.hypot(...dsDir); dsDir = dsDir.map(v => v / l);
        trenchRuns = 0; said = {};
        setBanner('WAVE ' + wave, 150, '#40e0ff');
        musicStart('space');
        if (!demo) speak('lead', wave === 1 ? 'All fighters, begin your attack' : 'Enemy fighters inbound. Stay sharp', true);
      }
      function startApproach() {
        phase = 'approach'; phaseT = 0; ties = []; groups = []; fireballs = []; debris = [];
        setBanner('APPROACHING THE DEATH STAR', 150);
        speak('base', 'Death Star in range. Begin your run', true);
      }
      function startSurface() {
        phase = 'surface'; phaseT = 0; px = 0; py = 80; pz = 0; opx = px; opy = py; opz = pz;
        fireballs = []; debris = []; towers = []; bunkers = [];
        surfLen = demo ? 3000 : 3800 + 400 * Math.min(dw(), 8);
        const nT = demo ? 5 : Math.min(16, 2 + wave * 2);
        for (let i = 0; i < nT; i++) towers.push({ x: rnd(-190, 190), z: 800 + (i + rnd(0.2, 0.8)) * (surfLen - 1100) / nT, h: rnd(55, 105), top: true, passed: false, cool: rnd(40, 120) });
        const nB = Math.min(22, 6 + wave * 2);
        for (let i = 0; i < nB; i++) bunkers.push({ x: rnd(-320, 320), z: rnd(500, surfLen - 200), alive: true, cool: rnd(60, 160) });
        towerTotal = nT; towerKills = 0;
        setBanner('SHOOT THE TOWER TOPS', 150, '#ff6040');
        musicStart('surface');
        speak('wing', 'Laser towers ahead. Knock off the tops', true);
      }
      function startEntry() {
        phase = 'entry'; phaseT = 0; fireballs = []; turrets = []; catwalks = []; portZ = 1e9; pz = 0; opz = 0;
        if (py < 60) py = 120;
        opx = px; opy = py;
        musicStart('trench');
        if (trenchRuns === 0) speak('wing', 'Diving into the trench now', true);
      }
      function startTrench() {
        phase = 'trench'; phaseT = 0; trenchBase = pz; portDone = false; trenchShots = 0;
        const len = (demo ? 3200 : 4600 + 500 * Math.min(dw(), 10)) * (trenchRuns > 0 ? 0.7 : 1);
        portZ = pz + len; turrets = []; catwalks = [];
        const gap = Math.max(120, 330 - dw() * 22);
        for (let z = pz + 450; z < portZ - 350; z += gap * rnd(0.6, 1.3)) {
          const side = sgn();
          if (Math.random() < 0.45) turrets.push({ kind: 'top', side, x: side * 50, y: 40, z, alive: true, cool: rnd(20, 90) });
          else turrets.push({ kind: 'wall', side, x: side * 40, y: rnd(-28, 28), z, alive: true, cool: rnd(20, 90) });
        }
        if (wave >= 3) {
          const n = Math.min(16, 2 + (wave - 3) * 2);
          const z0 = pz + 900, z1 = portZ - 700;
          for (let i = 0; i < n; i++) catwalks.push({ z: z0 + (z1 - z0) * (i + rnd(0.15, 0.85)) / n, y: pick([-20, -12, -4, 4, 12, 20]), hit: false });
        }
        setBanner(trenchRuns > 0 ? 'TRY AGAIN' : 'EXHAUST PORT AHEAD', 130);
        if (trenchRuns > 0) speak('base', 'Lined up again. Make this one count', true);
        else speak('base', 'Keep your eyes on the target', true);
      }
      function startMissed() {
        phase = 'missed'; phaseT = 0; fireballs = []; trenchRuns++;
        setBanner('YOU MISSED THE EXHAUST PORT', 150, '#ff4040');
        speak('base', 'Missed it! Come around for another run', true);
      }
      function portHit() {
        if (portDone) return; portDone = true;
        const force = trenchShots <= 1;
        phase = 'boom'; phaseT = 0; fireballs = []; music = null;
        boxDebris(0 - px, -40 - py, portZ - pz, 12, 4, 12, '#ffffff', 3);
        burstAt(0 - px, -40 - py, portZ - pz, '#ffffff', 40, 2);
        tally = [['DEATH STAR BONUS', 25000 + 5000 * Math.min(dw(), 10)], ['SHIELD BONUS ' + shields + ' X ' + PTS.shield, shields * PTS.shield]];
        if (force) tally.push(['USE THE FORCE BONUS', PTS.force]);
        tally.push(['EXTRA SHIELD', -1]);
        snd.noise(0.6, { freq: 3000, slideTo: 200, vol: 0.4 });
        snd.noise(4, { freq: 700, slideTo: 25, vol: 0.55, delay: 0.5 });
        victory();
        speak('wing', 'Direct hit! Pull out, she is going up!', true);
        if (force) said.forceLine = 1;
      }
      function nextWave() {
        wave++; shields = Math.min(9, shields + 1);
        startWave();
      }

      // ---------- TIE fighters ----------
      function spawnGroup(vader) {
        const n = vader ? 1 : Math.min(3, 1 + ((Math.random() * (1.2 + Math.min(2, wave * 0.5))) | 0));
        const g = { mode: 'attack', t: 0, side: sgn(), up: sgn(), ax: rnd(-110, 110), ay: rnd(-80, 80), vader: !!vader };
        groups.push(g);
        const sx = g.side * rnd(250, 700), sy = rnd(-300, 300), sz = rnd(1500, 1900);
        const sp = tieSpeed() * (vader ? 1.15 : rnd(0.95, 1.05));
        const offs = [[0, 0], [-36, -22], [36, -22]];
        for (let i = 0; i < n; i++) ties.push({ x: sx + offs[i][0], y: sy + offs[i][1], z: sz + i * 24, vx: 0, vy: 0, vz: -sp, sp, g, ofx: offs[i][0], ofy: offs[i][1], cool: rnd(60, 150), vader: !!vader, spin: 0, roll: 0, hits: 0 });
      }
      function updateGroups() {
        for (let i = groups.length - 1; i >= 0; i--) {
          const g = groups[i], mem = ties.filter(t => t.g === g && t.spin <= 0);
          if (!ties.some(t => t.g === g)) { groups.splice(i, 1); continue; }
          g.t++;
          if (g.mode === 'attack' && (mem.some(t => t.z < (g.vader ? 260 : 210)) || g.t > 420)) { g.mode = 'break'; g.t = 0; }
          else if (g.mode === 'break' && g.t > 100) {
            g.mode = 'attack'; g.t = 0; g.side = sgn(); g.up = sgn(); g.ax = rnd(-120, 120); g.ay = rnd(-90, 90);
          }
        }
      }
      function updateTies() {
        updateGroups();
        for (let i = ties.length - 1; i >= 0; i--) {
          const t = ties[i], g = t.g;
          if (t.spin > 0) {   // knocked into a spin: tumble away and recover
            t.spin--; t.roll += 0.45; t.x += t.vx; t.y += t.vy; t.z += t.vz;
            if (t.spin === 0) { t.vx *= 0.3; t.vy *= 0.3; t.vz = -t.sp * 0.5; g.mode = 'break'; g.t = 0; }
            continue;
          }
          let tx, ty, tz;
          if (g.mode === 'attack') { tx = g.ax + t.ofx; ty = g.ay + t.ofy; tz = 120; }
          else { tx = g.side * 900 + t.ofx; ty = g.up * 500 + t.ofy; tz = 1000; }
          const dx = tx - t.x, dy = ty - t.y, dz = tz - t.z, d = Math.hypot(dx, dy, dz) || 1;
          const turn = t.vader ? 0.07 : 0.05;
          t.vx += (dx / d * t.sp - t.vx) * turn; t.vy += (dy / d * t.sp - t.vy) * turn; t.vz += (dz / d * t.sp - t.vz) * turn;
          t.roll += ((-t.vx * 0.09) - t.roll) * 0.1;
          t.x += t.vx; t.y += t.vy; t.z += t.vz;
          if (g.mode === 'attack' && t.z > 260 && t.z < 1300 && --t.cool <= 0 && fireballs.length < Math.min(8, 2 + wave)) {
            t.cool = fireDelay() * (t.vader ? 0.6 : 1) * rnd(0.7, 1.3);
            fireBall(t.x, t.y, t.z, ballSpeed() * (t.vader ? 1.15 : 1));
          }
          if (Math.hypot(t.x, t.y, t.z) > 5000) { ties.splice(i, 1); }
        }
      }
      function explodeTie(t) {
        const m = t.vader ? VADER : TIE;
        const P = xform(m, t.x, t.y, t.z, yawOf(t), pitchOf(t), t.roll, 1);
        debrisFromPoints(P, m.e, t.x, t.y, t.z, t.vx, t.vy, t.vz, '#60ff80', 1.8);
        burstAt(t.x, t.y, t.z, '#ffe040', 16, 1.2);
        snd.noise(0.7, { freq: 1400, slideTo: 60, vol: 0.38 });
        snd.tone(90, 0.5, { type: 'sawtooth', vol: 0.1, slideTo: 30 });
      }

      // ---------- fireballs (always kept in camera space) ----------
      function fireBall(x, y, z, sp) {
        const d = Math.hypot(x, y, z) || 1, tArr = Math.max(25, d / sp);
        const close = phase === 'space' ? 0 : speed;
        fireballs.push({ x, y, z, vx: -x / tArr, vy: -y / tArr, vz: -z / tArr + close, r: rnd(0, TAU), pz: z, home: homing() });
        snd.tone(260, 0.25, { type: 'sawtooth', vol: 0.05, slideTo: 560 });
      }
      function worldShot(wx, wy, wz, k) { fireBall(wx - px, wy - py, wz - pz, ballSpeed() * (k || 0.9)); }
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

      // ---------- controls ----------
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
        // the yoke is spring-centred: with keys released the sight drifts home
        if (keyDrive && !L && !R) crossX += (CX - crossX) * 0.035;
        if (keyDrive && !U && !D) crossY += (CY - crossY) * 0.035;
        return api.key('Space') || api.key('KeyX') || m.down;
      }
      function aiControl() {
        let tgt = null, bz = 1e9, slack = 18;
        const want = (x, y, z) => { if (z > 30 && z < bz) { bz = z; tgt = [x, y, z]; } };
        for (const f of fireballs) if (f.z < 900) want(f.x, f.y, f.z);
        if (!tgt) {
          if (phase === 'space') { for (const t of ties) if (!t.vader && t.spin <= 0) want(t.x, t.y, t.z); }
          else if (phase === 'surface') {
            for (const tw of towers) if (tw.top && tw.z - pz > 160 && tw.z - pz < 1300) want(tw.x - px, tw.h + 8 - py, tw.z - pz);
            if (!tgt) for (const b of bunkers) if (b.alive && b.z - pz > 160 && b.z - pz < 900) want(b.x - px, 4 - py, b.z - pz);
          } else if (phase === 'trench') {
            const dz = portZ - pz;
            if (dz > 50 && dz < 900) { want(-px, -40 - py, dz); slack = 10; }
          }
        }
        let tx = CX, ty = CY;
        if (tgt && tgt[2] > NEAR) { const p = proj(tgt[0], tgt[1], tgt[2]); tx = clamp(p[0], 30, W - 30); ty = clamp(p[1], 40, H - 40); }
        if (phase === 'trench' || phase === 'entry') {
          // stay near the centre line and duck around catwalks
          let cw = null;
          for (const c of catwalks) if (c.z - pz > 0 && c.z - pz < 520 && (!cw || c.z < cw.z)) cw = c;
          if (cw) { const goal = cw.y >= 0 ? cw.y - 22 : cw.y + 22; ty = CY + clamp((py - goal) * 6, -170, 170); }
          else if (!tgt) ty = CY + clamp(py * 4, -120, 120);
          else if (!tgt) tx = CX + clamp(-px * 4, -120, 120);
        }
        if (phase === 'surface' && !tgt) ty = CY + (py - 60) * 2;
        crossX += (tx - crossX) * 0.14; crossY += (ty - crossY) * 0.14;
        return !!tgt && Math.hypot(tx - crossX, ty - crossY) < slack;
      }

      // ---------- lasers ----------
      function fireLasers() {
        const target = pickTarget(crossX, crossY);
        lasers.push({ t: 0, T: 6, tx: crossX, ty: crossY, target });
        if (phase === 'trench') trenchShots++;
        snd.tone(1900, 0.15, { type: 'sawtooth', vol: 0.07, slideTo: 280 });
        snd.tone(950, 0.12, { type: 'square', vol: 0.04, slideTo: 180 });
      }
      function pickTarget(sx, sy) {
        let best = null, bz = 1e9;
        const consider = (x, y, z, r, hit) => {
          if (z < NEAR + 2 || z > 2600) return;
          const p = proj(x, y, z), sr = Math.max(8, FOCAL * r / z);
          if (Math.hypot(p[0] - sx, p[1] - sy) < sr + 6 && z < bz) { bz = z; best = hit; }
        };
        for (const f of fireballs) consider(f.x, f.y, f.z, 5, () => {
          const i = fireballs.indexOf(f); if (i < 0) return;
          fireballs.splice(i, 1); addScore(PTS.fireball);
          burstAt(f.x, f.y, f.z, '#ffa040', 12); snd.noise(0.18, { freq: 2400, vol: 0.2 });
        });
        if (phase === 'space') for (const t of ties) consider(t.x, t.y, t.z, t.vader ? 11 : 10, () => {
          if (ties.indexOf(t) < 0) return;
          if (t.vader) {
            if (t.spin > 0) return;
            t.spin = 80; t.vz = 10; t.vx = (t.x > 0 ? 4 : -4); t.vy = rnd(-2, 2); addScore(PTS.vader);
            burstAt(t.x, t.y, t.z, '#ffffff', 10);
            snd.tone(180, 0.6, { type: 'square', vol: 0.12, slideTo: 1100 });
            sayOnce('vspin' + wave, 'wing', 'You knocked him into a spin!');
            return;
          }
          ties.splice(ties.indexOf(t), 1); kills++; addScore(PTS.tie); explodeTie(t);
          if (Math.random() < 0.3) speak('wing', pick(['Got him!', 'Nice shooting!', 'Another one down', 'Watch your back', 'Great flying!']));
        });
        if (phase === 'surface') {
          for (const tw of towers) if (tw.top) consider(tw.x - px, tw.h + 6 - py, tw.z - pz, 8, () => {
            if (!tw.top) return;
            tw.top = false; towerKills++; addScore(PTS.towerTop);
            boxDebris(tw.x - px, tw.h + 6 - py, tw.z - pz, 6, 6, 6, '#ff4040', 2);
            burstAt(tw.x - px, tw.h + 6 - py, tw.z - pz, '#ffe040', 14);
            snd.noise(0.5, { freq: 1600, slideTo: 90, vol: 0.35 });
            if (towerKills === towerTotal) {
              addScore(PTS.allTowers); setBanner('ALL TOWERS DESTROYED  ' + PTS.allTowers, 170, '#40ff60');
              snd.melody([[784, .1], [988, .1], [1175, .1], [1568, .3]], { type: 'square', vol: .12 });
              speak('base', 'All towers down. Outstanding!', true);
            }
          });
          for (const b of bunkers) if (b.alive) consider(b.x - px, 5 - py, b.z - pz, 9, () => {
            if (!b.alive) return;
            b.alive = false; addScore(PTS.bunker);
            boxDebris(b.x - px, 4 - py, b.z - pz, 9, 4, 9, '#ff9040', 1.6);
            snd.noise(0.4, { freq: 1100, slideTo: 90, vol: 0.3 });
          });
        }
        if (phase === 'trench') {
          for (const tu of turrets) if (tu.alive) consider(tu.x - px, tu.y - py, tu.z - pz, 7, () => {
            if (!tu.alive) return;
            tu.alive = false; addScore(PTS.turret);
            boxDebris(tu.x - px, tu.y - py, tu.z - pz, 5, 5, 5, '#ff4040', 1.6);
            snd.noise(0.35, { freq: 1400, slideTo: 100, vol: 0.3 });
          });
          const dz = portZ - pz;
          if (dz > 25 && dz < 1000) consider(-px, -40 - py, dz, 11, () => { if (phase === 'trench') portHit(); });
        }
        return best;
      }
      function updateLasers() {
        for (let i = lasers.length - 1; i >= 0; i--) {
          const l = lasers[i];
          if (++l.t >= l.T) { lasers.splice(i, 1); if (l.target) l.target(); }
        }
      }

      // ---------- per-phase updates ----------
      function steerOffsets() { return [clamp((crossX - CX) / (W / 2), -1, 1), clamp((crossY - CY) / (H / 2), -1, 1)]; }
      function updateSpace() {
        const [dx, dy] = steerOffsets();
        turnView(dx * 0.02, -dy * 0.017);
        setBank(dx * 0.3);
        const alive = ties.filter(t => !t.vader).length;
        const maxAlive = Math.min(7, 2 + wave);
        if (phaseT > 70 && kills + alive < killGoal && alive < maxAlive && (phaseT % 50 === 0 || alive === 0)) spawnGroup(false);
        if (wave >= 2 && !vaderOn && phaseT > (demo ? 200 : 420)) {
          vaderOn = true; spawnGroup(true);
          speak('dark', 'You will not escape me', true);
          setBanner('DARK LORD APPROACHING', 120, '#ff4040');
        }
        updateTies();
        const done = kills >= killGoal && !ties.some(t => !t.vader);
        if (done || phaseT > spaceCap) startApproach();
      }
      function updateApproach() {
        setBank(0);
        for (const s of stars) rot(s, 0, 0.0015, 0, 1, 2);
        if (phaseT > 170) { if (wave >= 2) startSurface(); else { px = 0; py = 160; startEntry(); } }
      }
      function moveShip(nx, ny, nz) {
        shiftView(nx - px, ny - py, nz - pz);
        px = nx; py = ny; pz = nz;
      }
      function updateSurface() {
        const [dx, dy] = steerOffsets();
        speed = 6 + Math.min(4, dw() * 0.4);
        moveShip(clamp(px + dx * 5, -330, 330), clamp(py - dy * 3.2, 14, 160), pz + speed);
        setBank(dx * 0.35);
        for (const tw of towers) {
          const dz = tw.z - pz;
          if (tw.top && dz > 220 && dz < 1100 && --tw.cool <= 0) { tw.cool = fireDelay() * rnd(0.8, 1.4); worldShot(tw.x, tw.h + 8, tw.z); }
          if (!tw.passed && dz <= 0) {
            tw.passed = true;
            if (Math.abs(tw.x - px) < 13 && py < tw.h + (tw.top ? 16 : 4)) { shieldHit(); burstAt(0, 0, 20, '#ffe040', 20, 2); }
          }
        }
        for (const b of bunkers) if (b.alive && b.z - pz > 200 && b.z - pz < 950 && --b.cool <= 0) { b.cool = fireDelay() * rnd(1, 1.7); worldShot(b.x, 8, b.z); }
        if (phaseT === 240) sayOnce('surf2', 'lead', 'Stay low and keep firing');
        if (pz > surfLen) {
          if (towerKills < towerTotal) setBanner('TOWERS ' + towerKills + ' OF ' + towerTotal, 100);
          startEntry();
        }
      }
      function updateEntry() {
        speed = 7;
        moveShip(px + (0 - px) * 0.05, py + (0 - py) * 0.035, pz + speed);
        setBank(-px * 0.004);
        if (phaseT > 150) startTrench();
      }
      function updateTrench() {
        const [dx, dy] = steerOffsets();
        speed = 8 + Math.min(6, dw() * 0.55);
        moveShip(clamp(px + dx * 3.4, -32, 32), clamp(py - dy * 2.8, -34, 34), pz + speed);
        setBank(dx * 0.22);
        for (const tu of turrets) if (tu.alive && tu.z - pz > 300 && tu.z - pz < 1200 && --tu.cool <= 0) {
          tu.cool = fireDelay() * rnd(1, 1.6); worldShot(tu.x - tu.side * 6, tu.y, tu.z, 0.75);
        }
        for (const c of catwalks) if (!c.hit && c.z <= pz) {
          c.hit = true;
          if (Math.abs(py - c.y) < 10) { shieldHit(); burstAt(0, 0, 15, '#ffe040', 24, 2); }
        }
        const dz = portZ - pz;
        if (catwalks.some(c => c.z - pz > 0 && c.z - pz < 1400)) sayOnce('cat' + trenchRuns, 'wing', 'Catwalks ahead! Over or under!');
        if (dz < (portZ - trenchBase) * 0.5 && trenchShots === 0) sayOnce('force' + trenchRuns, 'base', 'Let the Force guide your aim');
        if (dz < 1000) sayOnce('port' + trenchRuns, 'base', 'Exhaust port in range. Fire!', true);
        if (dz < 900 && dz > 860) snd.tone(1320, 0.08, { type: 'square', vol: 0.08 });
        if (dz < 5 && !portDone) startMissed();
      }
      function updateMissed() {
        speed = 7;
        moveShip(px * 0.95, py + (130 - py) * 0.04, pz + speed);
        setBank(0);
        if (phaseT > 150) startEntry();
      }
      function updateBoom() {
        setBank(0);
        for (const s of stars) rot(s, 0.001, 0, 0, 1, 2);
        if (phaseT === 1) hitFlash = 0;
        if (phaseT === 150 && !demo) {
          if (said.forceLine) speak('base', 'You trusted the Force. Well done', true);
          else speak('lead', 'Great shooting! That is one for the history books', true);
        }
        if (phaseT > 330) {
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
      function updateEngine() {
        phaseT++;
        const fire = (autopilot || demo) ? aiControl() : playerControl();
        crossX = clamp(crossX, 20, W - 20); crossY = clamp(crossY, 30, H - 30);
        if (fireCool > 0) fireCool--;
        const canFire = phase === 'space' || phase === 'surface' || phase === 'trench' || phase === 'entry';
        if (fire && fireCool <= 0 && canFire) { fireCool = demo || autopilot ? 12 : 9; fireLasers(); }
        updateLasers();
        if (phase === 'space') updateSpace();
        else if (phase === 'approach') updateApproach();
        else if (phase === 'surface') updateSurface();
        else if (phase === 'entry') updateEntry();
        else if (phase === 'trench') updateTrench();
        else if (phase === 'missed') updateMissed();
        else if (phase === 'boom') updateBoom();
        else if (phase === 'tally') updateTally();
        if (mode !== 'play' && mode !== 'attract') return;
        updateFireballs();
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i];
          d.x += d.vx; d.y += d.vy; d.z += d.vz;
          const c = Math.cos(d.spin), s = Math.sin(d.spin), hx = d.hx * c - d.hy * s; d.hy = d.hx * s + d.hy * c; d.hx = hx;
          if (--d.t <= 0) debris.splice(i, 1);
        }
        musicTick();
        if (api.frame % 28 === 0 && !demo && (phase === 'space' || phase === 'surface' || phase === 'trench')) A.tone(52, 0.5, { type: 'triangle', vol: 0.05 });
      }

      // ---------- game flow ----------
      function resetWorld() {
        lasers = []; frags = []; debris = []; fireballs = []; ties = []; groups = [];
        towers = []; bunkers = []; turrets = []; catwalks = [];
        crossX = CX; crossY = CY; cvx = cvy = 0; px = py = pz = 0; bank = 0; cb = 1; sb = 0;
        hitFlash = shake = 0; bannerT = 0;
      }
      function startSelect() {
        mode = 'select'; modeT = 0; selIdx = 0; selT = 0; resetWorld(); demo = false; sub = null;
        speak('base', 'Choose your mission, pilot', true);
      }
      function startGame(w) {
        demo = false; resetWorld();
        mode = 'play'; modeT = 0; wave = w; shields = 6;
        const c = CHOICES.find(c => c.wave === w);
        score = c ? c.bonus : 0;
        fanfare();
        startWave();
        if (c && c.bonus) setBanner('STARTING BONUS ' + c.bonus, 150, '#40ff60');
      }
      function startDemo() {
        resetWorld(); demo = true; wave = 3; score = 0; shields = 6;
        stage = 'demo'; stageT = 0; sub = null;
        startWave();
      }
      function endDemo() { demo = false; resetWorld(); stage = 'points'; stageT = 0; sub = null; music = null; phase = 'space'; }
      function attractInit(st) {
        mode = 'attract'; modeT = 0; stage = st || 'title'; stageT = 0; demo = false; music = null; resetWorld(); phase = 'space'; sub = null;
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

      function update() {
        modeT++;
        if (coinFlash > 0) coinFlash--;
        if (bannerT > 0) bannerT--;
        if (hitFlash > 0) hitFlash--;
        if (shake > 0) shake--;
        if (sub && --sub.t <= 0) sub = null;
        for (let i = frags.length - 1; i >= 0; i--) { const f = frags[i]; f.x += f.vx; f.y += f.vy; f.vx *= 0.97; f.vy *= 0.97; f.a += f.spin; if (--f.t <= 0) frags.splice(i, 1); }

        if (mode === 'attract') {
          stageT++;
          if (stage === 'demo') { updateEngine(); if (stageT > 60 * 80) endDemo(); }
          else {
            for (const s of stars) rot(s, 0.0015, 0.0004, 0, 1, 2);
            if (stage === 'title' && stageT > 480) { stage = 'scores'; stageT = 0; }
            else if (stage === 'scores' && stageT > 420) startDemo();
            else if (stage === 'points' && stageT > 420) { stage = 'title'; stageT = 0; }
          }
          const start = api.pressed('Enter') || ((api.pressed('Space') || api.mouse.clicked) && stage !== 'demo' && stageT > 20);
          if (start) {
            if (api.useCredit()) { A.tone(660, 0.1, { type: 'square', vol: 0.15 }); startSelect(); }
            else { coinFlash = 150; A.tone(70, 0.3, { type: 'square', vol: 0.3 }); }
          }
          return;
        }
        if (mode === 'select') {
          selT++;
          const m = api.mouse;
          if (lastMX >= 0 && (Math.abs(m.x - lastMX) > 0.5 || Math.abs(m.y - lastMY) > 0.5)) {
            crossX = m.x; crossY = m.y;
            for (let i = 0; i < 3; i++) if (Math.abs(crossX - (CX + (i - 1) * 200)) < 90) selIdx = i;
          }
          lastMX = m.x; lastMY = m.y;
          if (api.pressed('ArrowLeft') && selIdx > 0) { selIdx--; A.tone(440, 0.05, { vol: 0.1 }); }
          if (api.pressed('ArrowRight') && selIdx < 2) { selIdx++; A.tone(440, 0.05, { vol: 0.1 }); }
          if (api.pressed('ArrowLeft') || api.pressed('ArrowRight')) { crossX = CX + (selIdx - 1) * 200; crossY = 260; }
          for (const s of stars) rot(s, 0.002, 0, 0, 1, 2);
          const go = selT > 20 && (api.pressed('Space') || api.pressed('Enter') || api.pressed('KeyX') || m.clicked);
          if (go || selT > 60 * 12) {
            A.tone(1900, 0.15, { type: 'sawtooth', vol: 0.07, slideTo: 280 });
            startGame(CHOICES[selIdx].wave);
          }
          return;
        }
        if (mode === 'play') { updateEngine(); return; }
        if (mode === 'dying') {
          if (modeT % 5 === 0) burstAt(rnd(-200, 200), rnd(-150, 150), 200, pick(['#ff4040', '#ffe040', '#ffffff']), 8, 2);
          updateFireballs();
          if (modeT === 150) {
            if (api.offerContinue) api.offerContinue(() => {
              mode = 'play'; modeT = 0; shields = 6; fireballs = []; hitFlash = 0;
              musicStart(phase === 'space' ? 'space' : phase === 'surface' ? 'surface' : 'trench');
              speak('base', 'Shields restored. Back into the fight', true);
            }, finishGame);
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
      function deathStarPath(ctx, x, y, r, rot) {
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
        for (let k = -2; k <= 2; k++) {   // latitude lines (ellipses squashed by tilt)
          const yy = y + k * r * 0.33, rr = Math.sqrt(Math.max(0, 1 - (k * 0.33) * (k * 0.33))) * r;
          if (k === 0) { ctx.moveTo(x - r, y - 2); ctx.lineTo(x + r, y - 2); ctx.moveTo(x - r, y + 2); ctx.lineTo(x + r, y + 2); continue; }
          ctx.moveTo(x + rr, yy); ctx.ellipse(x, yy, rr, rr * 0.08, 0, 0, TAU);
        }
        const ph = rot || 0;
        for (let k = 0; k < 6; k++) {   // longitude lines
          const a = ph + k * Math.PI / 6, rx = Math.abs(Math.cos(a)) * r;
          if (rx < 2) continue;
          ctx.moveTo(x, y - r); ctx.ellipse(x, y, rx, r, 0, -Math.PI / 2, Math.PI / 2, Math.cos(a) < 0);
        }
        const dx = x - r * 0.4, dy = y - r * 0.42, dr = r * 0.22;
        ctx.moveTo(dx + dr, dy); ctx.arc(dx, dy, dr, 0, TAU);
        ctx.moveTo(dx + dr * 0.25, dy); ctx.arc(dx, dy, dr * 0.25, 0, TAU);
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
        stroke(ctx, (api.frame & 2) ? '#ff8030' : '#ffe040', 1.5);
      }
      function drawDebris(ctx) {
        const byCol = {};
        for (const d of debris) (byCol[d.col] = byCol[d.col] || []).push(d);
        for (const col in byCol) {
          ctx.beginPath();
          for (const d of byCol[col]) seg(ctx, [d.x - d.hx, d.y - d.hy, d.z - d.hz], [d.x + d.hx, d.y + d.hy, d.z + d.hz]);
          ctx.globalAlpha = 1; stroke(ctx, col, 1.3);
        }
      }
      function drawSpace(ctx) {
        drawStars(ctx, false);
        if (dsDir[2] > 0.1 && (mode === 'play' || stage === 'demo')) {
          const p = proj(dsDir[0], dsDir[1], dsDir[2]), r = 10 + Math.min(45, phaseT / 40);
          ctx.beginPath(); deathStarPath(ctx, p[0], p[1], r, phaseT * 0.002); stroke(ctx, '#5070ff', 1);
        }
        ctx.beginPath();
        for (const t of ties) if (!t.vader) {
          const P = xform(TIE, t.x, t.y, t.z, yawOf(t), pitchOf(t), t.roll, 1);
          for (const [i, j] of TIE.e) seg(ctx, P[i], P[j]);
        }
        stroke(ctx, '#40ff60', 1.4);
        ctx.beginPath();
        for (const t of ties) if (t.vader) {
          const P = xform(VADER, t.x, t.y, t.z, yawOf(t), pitchOf(t), t.roll, 1.1);
          for (const [i, j] of VADER.e) seg(ctx, P[i], P[j]);
        }
        stroke(ctx, (api.frame & 8) ? '#ff60ff' : '#c040ff', 1.6);
      }
      function drawSurface(ctx) {
        drawStars(ctx, true);
        const far = 1900, y0 = -py;
        ctx.beginPath();
        for (let gx = Math.floor((px - 900) / 80) * 80; gx <= px + 900; gx += 80) S(ctx, gx - px, y0, 6, gx - px, y0, far);
        for (let gz = Math.ceil(pz / 150) * 150; gz < pz + far; gz += 150) S(ctx, -900, y0, gz - pz, 900, y0, gz - pz);
        stroke(ctx, '#2040b0', 1);
        ctx.beginPath(); S(ctx, -40000, y0, 9000, 40000, y0, 9000); stroke(ctx, '#6080ff', 1.2);
        // bunkers
        ctx.beginPath();
        for (const b of bunkers) {
          const z = b.z - pz; if (!b.alive || z < NEAR || z > far) continue;
          const x = b.x - px;
          for (let k = 0; k < 4; k++) {
            const a0 = k * Math.PI / 4, a1 = (k + 1) * Math.PI / 4;
            S(ctx, x + Math.cos(a0) * 10, y0 + Math.sin(a0) * 7, z, x + Math.cos(a1) * 10, y0 + Math.sin(a1) * 7, z);
            S(ctx, x, y0 + Math.sin(a0) * 7, z + Math.cos(a0) * 10, x, y0 + Math.sin(a1) * 7, z + Math.cos(a1) * 10);
          }
          S(ctx, x, y0 + 6, z, x, y0 + 9, z - 7);
        }
        stroke(ctx, '#ff9040', 1.3);
        // towers
        ctx.beginPath();
        for (const tw of towers) {
          const z = tw.z - pz; if (z < NEAR || z > far) continue;
          const x = tw.x - px, s = 7, y1 = tw.h - py;
          for (const [ax, az] of [[-s, -s], [s, -s], [s, s], [-s, s]]) S(ctx, x + ax, y0, z + az, x + ax, y1, z + az);
          for (const yy of [y0, y1, (y0 + y1) / 2]) {
            S(ctx, x - s, yy, z - s, x + s, yy, z - s); S(ctx, x + s, yy, z - s, x + s, yy, z + s);
            S(ctx, x + s, yy, z + s, x - s, yy, z + s); S(ctx, x - s, yy, z + s, x - s, yy, z - s);
          }
          if (!tw.top) { S(ctx, x - s, y1, z - s, x - 2, y1 + 5, z - s); S(ctx, x - 2, y1 + 5, z - s, x + 3, y1 + 1, z - s); S(ctx, x + 3, y1 + 1, z - s, x + s, y1 + 6, z - s); }
        }
        stroke(ctx, '#ffe040', 1.2);
        ctx.beginPath();
        for (const tw of towers) {
          const z = tw.z - pz; if (!tw.top || z < NEAR || z > far) continue;
          const x = tw.x - px, y = tw.h - py, s = 5;
          for (const [ax, az] of [[-s, -s], [s, -s], [s, s], [-s, s]]) S(ctx, x + ax, y, z + az, x + ax, y + 12, z + az);
          S(ctx, x - s, y + 12, z - s, x + s, y + 12, z - s); S(ctx, x + s, y + 12, z - s, x + s, y + 12, z + s);
          S(ctx, x + s, y + 12, z + s, x - s, y + 12, z + s); S(ctx, x - s, y + 12, z + s, x - s, y + 12, z - s);
          S(ctx, x, y + 7, z - s, x, y + 7, z - 16);
        }
        stroke(ctx, (api.frame & 16) ? '#ff4040' : '#ff7070', 1.5);
      }
      function drawTrench(ctx) {
        const far = 1800, T = 40, endZ = portZ + 450;
        const zEnd = Math.min(pz + far, endZ);
        drawStars(ctx, true);
        ctx.beginPath();
        const r1 = Math.max(6, zEnd - pz);
        for (const sx of [-1, 1]) {
          S(ctx, sx * T - px, T - py, 6, sx * T - px, T - py, r1);
          S(ctx, sx * T - px, -T - py, 6, sx * T - px, -T - py, r1);
          for (const ox of [130, 260, 420]) S(ctx, sx * ox - px, T - py, 6, sx * ox - px, T - py, far);
        }
        for (let z = Math.ceil(pz / 100) * 100; z < zEnd; z += 100) {
          const r = z - pz; if (r < NEAR) continue;
          const ow = r < 1100 ? 420 : T;
          S(ctx, -ow - px, T - py, r, -T - px, T - py, r); S(ctx, -T - px, T - py, r, -T - px, -T - py, r);
          S(ctx, -T - px, -T - py, r, T - px, -T - py, r); S(ctx, T - px, -T - py, r, T - px, T - py, r);
          S(ctx, T - px, T - py, r, ow - px, T - py, r);
        }
        for (let z = Math.ceil(pz / 100) * 100 + 100; z < pz + 1100; z += 100) if (z > endZ) S(ctx, -420 - px, T - py, z - pz, 420 - px, T - py, z - pz);
        if (endZ - pz < far && endZ - pz > NEAR) {   // the trench ends in a wall
          const r = endZ - pz;
          S(ctx, -T - px, T - py, r, -T - px, -T - py, r); S(ctx, T - px, T - py, r, T - px, -T - py, r);
          S(ctx, -T - px, -T - py, r, T - px, -T - py, r);
        }
        stroke(ctx, '#3858ff', 1.1);
        // wall greebles
        ctx.beginPath();
        for (let k = Math.ceil(pz / 100); k * 100 < zEnd; k++) {
          const z = k * 100 - pz; if (z < NEAR) continue;
          const h = (Math.imul(k, 2654435761) >>> 0);
          const side = (h & 1) ? 1 : -1, y = -30 + ((h >>> 3) % 40), hh = 6 + ((h >>> 9) % 10), z0 = z + 15 + ((h >>> 13) % 30), z1 = z0 + 20 + ((h >>> 17) % 30);
          const x = side * T - px;
          S(ctx, x, y - py, z0, x, y - py, z1); S(ctx, x, y + hh - py, z0, x, y + hh - py, z1);
          S(ctx, x, y - py, z0, x, y + hh - py, z0); S(ctx, x, y - py, z1, x, y + hh - py, z1);
          if (h & 4) { const x2 = -side * T - px, y2 = -36 + ((h >>> 21) % 20); S(ctx, x2, y2 - py, z + 10, x2, y2 - py, z + 90); }
        }
        stroke(ctx, '#2848c0', 1);
        // catwalks
        ctx.beginPath();
        for (const c of catwalks) {
          const r = c.z - pz; if (r < NEAR || r > far) continue;
          const yt = c.y + 5 - py, yb = c.y - 5 - py;
          S(ctx, -T - px, yt, r, T - px, yt, r); S(ctx, -T - px, yb, r, T - px, yb, r);
          S(ctx, -T - px, yt, r + 12, T - px, yt, r + 12);
          S(ctx, -T - px, yt, r, -T - px, yb, r); S(ctx, T - px, yt, r, T - px, yb, r);
          for (let k = -2; k <= 2; k++) S(ctx, k * 15 - px, yt, r, k * 15 + 6 - px, yb, r);
        }
        stroke(ctx, '#ffe040', 1.5);
        // turrets
        ctx.beginPath();
        for (const tu of turrets) {
          const r = tu.z - pz; if (!tu.alive || r < NEAR || r > far) continue;
          const x = tu.x - px, y = tu.y - py, s = tu.side;
          if (tu.kind === 'top') {
            for (const [ax, az] of [[-5, -5], [5, -5], [5, 5], [-5, 5]]) S(ctx, x + ax, y, r + az, x + ax, y + 9, r + az);
            S(ctx, x - 5, y + 9, r - 5, x + 5, y + 9, r - 5); S(ctx, x - 5, y + 9, r + 5, x + 5, y + 9, r + 5);
            S(ctx, x - 5, y + 9, r - 5, x - 5, y + 9, r + 5); S(ctx, x + 5, y + 9, r - 5, x + 5, y + 9, r + 5);
            S(ctx, x - s * 5, y + 6, r, x - s * 15, y + 3, r - 6);
          } else {
            S(ctx, x, y - 5, r - 5, x, y + 5, r - 5); S(ctx, x, y + 5, r - 5, x, y + 5, r + 5);
            S(ctx, x, y + 5, r + 5, x, y - 5, r + 5); S(ctx, x, y - 5, r + 5, x, y - 5, r - 5);
            S(ctx, x, y, r, x - s * 7, y + 1, r); S(ctx, x - s * 7, y + 1, r, x - s * 12, y, r - 6);
          }
        }
        stroke(ctx, '#ff4040', 1.4);
        // exhaust port on the floor
        const r = portZ - pz;
        if (!portDone && r > NEAR && r < far) {
          ctx.beginPath();
          const x = -px, y = -T - py;
          for (const q of [12, 6]) { S(ctx, x - q, y, r - q, x + q, y, r - q); S(ctx, x + q, y, r - q, x + q, y, r + q); S(ctx, x + q, y, r + q, x - q, y, r + q); S(ctx, x - q, y, r + q, x - q, y, r - q); }
          S(ctx, x - 6, y, r - 6, x + 6, y, r + 6); S(ctx, x + 6, y, r - 6, x - 6, y, r + 6);
          stroke(ctx, (api.frame & 4) ? '#ffffff' : '#ff4040', 1.9);
          if (r < 1000) {   // targeting computer brackets
            const p = proj(x, y, r), q = Math.max(10, FOCAL * 16 / r);
            ctx.beginPath();
            for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(p[0] + sx * q, p[1] + sy * q * 0.6); ctx.lineTo(p[0] + sx * q * 0.6, p[1] + sy * q * 0.6); ctx.moveTo(p[0] + sx * q, p[1] + sy * q * 0.6); ctx.lineTo(p[0] + sx * q, p[1] + sy * q * 0.2); }
            stroke(ctx, '#40ff60', 1.2);
          }
        }
      }
      function drawApproach(ctx) {
        drawStars(ctx, false);
        const k = phaseT / 170, r = 50 * Math.exp(k * 3.2);
        ctx.beginPath(); deathStarPath(ctx, CX, CY + r * 0.25, r, phaseT * 0.004); stroke(ctx, '#5070ff', 1.3);
      }
      function drawBoom(ctx) {
        drawStars(ctx, false);
        const k = phaseT;
        if (k < 45) { ctx.beginPath(); deathStarPath(ctx, CX, CY, 90 - k * 0.6, k * 0.01); stroke(ctx, k > 30 && (k & 2) ? '#ffffff' : '#5070ff', 1.4); }
        if (k > 30) {
          ctx.beginPath();
          const e = k - 30;
          for (let i = 0; i < 4; i++) { const rr = e * (3 + i * 1.6); if (rr < 1000) { ctx.moveTo(CX + rr, CY); ctx.ellipse(CX, CY, rr, rr * (0.18 + i * 0.05), 0.12, 0, TAU); } }
          stroke(ctx, ['#ffffff', '#ffe040', '#ff8040', '#ff4040'][(k >> 2) & 3], 2);
          ctx.beginPath();
          for (let i = 0; i < 36; i++) {
            const a = i * TAU / 36 + i * 0.37, r0 = e * (1.5 + (i % 5) * 0.6), r1 = r0 + 8 + (i % 3) * 6;
            if (r0 < 800) { ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); ctx.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); }
          }
          stroke(ctx, '#ffe040', 1.4);
        }
        if (k > 30 && k < 70) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - (k - 30) / 40) * 0.7 + ')'; ctx.fillRect(0, 0, W, H); }
      }
      function drawLasers(ctx) {
        if (!lasers.length) return;
        ctx.beginPath();
        const guns = [[8, 8], [W - 8, 8], [8, H - 8], [W - 8, H - 8]];
        for (const l of lasers) {
          const k0 = l.t / l.T, k1 = Math.min(1, k0 + 0.3);
          for (const g of guns) {
            ctx.moveTo(g[0] + (l.tx - g[0]) * k0, g[1] + (l.ty - g[1]) * k0); ctx.lineTo(g[0] + (l.tx - g[0]) * k1, g[1] + (l.ty - g[1]) * k1);
          }
        }
        stroke(ctx, '#ff3030', 3);
        ctx.beginPath();
        for (const l of lasers) if (l.t >= l.T - 2) { ctx.moveTo(l.tx + 6, l.ty); ctx.arc(l.tx, l.ty, 6, 0, TAU); }
        stroke(ctx, '#ffffff', 1.4);
      }
      function drawCockpit(ctx) {
        // X-wing canopy struts and the four wing-tip cannons converging toward the sight
        ctx.beginPath();
        ctx.moveTo(0, 70); ctx.lineTo(46, 46); ctx.lineTo(70, 0);
        ctx.moveTo(W, 70); ctx.lineTo(W - 46, 46); ctx.lineTo(W - 70, 0);
        ctx.moveTo(0, H - 70); ctx.lineTo(46, H - 46); ctx.lineTo(70, H);
        ctx.moveTo(W, H - 70); ctx.lineTo(W - 46, H - 46); ctx.lineTo(W - 70, H);
        stroke(ctx, '#304070', 1.4);
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
        // shield gauge: one block per shield, centred top
        ctx.beginPath(); vtext(ctx, 'SHIELD', CX, 12, 1.6, 'center');
        const n = Math.max(6, shields), bw = 14, x0 = CX - n * bw / 2;
        for (let i = 0; i < n; i++) {
          ctx.rect(x0 + i * bw + 2, 26, bw - 4, 12);
          if (i < shields) { ctx.moveTo(x0 + i * bw + 5, 29); ctx.lineTo(x0 + i * bw + bw - 5, 35); ctx.moveTo(x0 + i * bw + bw - 5, 29); ctx.lineTo(x0 + i * bw + 5, 35); }
        }
        stroke(ctx, shields <= 1 ? ((api.frame & 8) ? '#ff3030' : '#ff9090') : shields <= 2 ? '#ffe040' : '#40ff60', 1.2);
        let info = '';
        if (phase === 'space') info = 'TIE FIGHTERS ' + Math.max(0, killGoal - kills);
        else if (phase === 'surface') info = 'TOWERS ' + (towerTotal - towerKills) + '   DIST ' + Math.max(0, Math.round((surfLen - pz) / 10));
        else if (phase === 'trench') info = 'EXHAUST PORT ' + Math.max(0, Math.round((portZ - pz) / 10));
        if (info) text(ctx, info, 18, 42, 1.5, phase === 'trench' ? '#ffffff' : '#80a0ff');
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
        text(ctx, 'DEATH STAR DESTROYED', CX, 110, 3.4, '#ffe040', 'center', 1.6);
        tally.forEach((t, i) => {
          if (phaseT < (i + 1) * 50) return;
          const y = 180 + i * 38;
          text(ctx, t[0], CX - 250, y, 2.2, '#ffffff', 'left');
          text(ctx, t[1] < 0 ? '+1' : String(t[1]), CX + 250, y, 2.2, t[1] < 0 ? '#40ff60' : '#ffffff', 'right');
        });
        if (phaseT > 50 * (tally.length + 1)) text(ctx, 'PREPARE FOR WAVE ' + (wave + 1), CX, 380, 2.4, '#40e0ff', 'center');
      }
      function drawWorld(ctx) {
        if (phase === 'space') drawSpace(ctx);
        else if (phase === 'approach') drawApproach(ctx);
        else if (phase === 'surface') drawSurface(ctx);
        else if (phase === 'entry' || phase === 'trench' || phase === 'missed') drawTrench(ctx);
        else drawBoom(ctx);
        drawDebris(ctx);
        drawFireballs(ctx);
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
        ctx.beginPath(); deathStarPath(ctx, CX + 235, 150, 58, stageT * 0.006); stroke(ctx, '#3a50b0', 1.1);
        // stacked logo
        text(ctx, 'STAR', CX, 70, 11, '#ffe81f', 'center', 3);
        text(ctx, 'WARS', CX, 150, 11, '#ffe81f', 'center', 3);
        ctx.beginPath(); ctx.rect(CX - 150, 60, 300, 166); stroke(ctx, '#ffe81f', 1.2);
        text(ctx, 'DESTROY THE DEATH STAR', CX, 250, 2.4, '#40e0ff', 'center');
      }
      function drawScores(ctx) {
        text(ctx, 'TOP PILOTS', CX, 60, 4, '#ffe81f', 'center', 1.8);
        table.forEach((e, i) => {
          const y = 120 + i * 30, col = i === lastScoreRank ? ((api.frame & 8) ? '#ffffff' : '#ffe040') : (i === 0 ? '#ff6060' : '#40e0ff');
          text(ctx, (i + 1) + '.', CX - 170, y, 2.4, col, 'right');
          text(ctx, e.n, CX - 140, y, 2.4, col, 'left');
          text(ctx, String(e.s), CX + 190, y, 2.4, col, 'right');
        });
      }
      function drawPoints(ctx) {
        text(ctx, 'SCORING', CX, 50, 4, '#ffe81f', 'center', 1.8);
        const rows = [['TIE FIGHTER', PTS.tie, '#40ff60'], ['DARK LORD HIT', PTS.vader, '#ff60ff'], ['FIREBALL', PTS.fireball, '#ffa040'],
          ['LASER TOWER TOP', PTS.towerTop, '#ff4040'], ['ALL TOWER TOPS', PTS.allTowers, '#ff4040'], ['BUNKER', PTS.bunker, '#ff9040'],
          ['TRENCH TURRET', PTS.turret, '#ff4040'], ['SHIELD BONUS EACH', PTS.shield, '#40ff60'], ['USE THE FORCE', PTS.force, '#ffe040']];
        rows.forEach((r, i) => { text(ctx, r[0], CX - 210, 100 + i * 28, 2.1, r[2], 'left'); text(ctx, String(r[1]), CX + 210, 100 + i * 28, 2.1, '#ffffff', 'right'); });
      }
      function drawSelect(ctx) {
        drawStars(ctx, false);
        text(ctx, 'SELECT YOUR MISSION', CX, 60, 3.6, '#ffe81f', 'center', 1.6);
        text(ctx, 'AIM AND FIRE TO CHOOSE', CX, 110, 2, '#40e0ff', 'center');
        CHOICES.forEach((c, i) => {
          const x = CX + (i - 1) * 200, on = i === selIdx;
          ctx.beginPath(); ctx.rect(x - 85, 170, 170, 170); stroke(ctx, on ? c.col : '#405080', on ? 2.2 : 1.1);
          text(ctx, c.name, x, 190, 2.6, c.col, 'center');
          text(ctx, 'WAVE ' + c.wave, x, 235, 2.4, '#ffffff', 'center');
          text(ctx, c.bonus ? 'BONUS' : 'NO BONUS', x, 280, 1.8, '#c0c8ff', 'center');
          if (c.bonus) text(ctx, String(c.bonus), x, 304, 2, '#40ff60', 'center');
        });
        text(ctx, 'TIME ' + Math.max(0, Math.ceil(12 - selT / 60)), CX, 380, 2.2, '#ffffff', 'center');
        drawCockpit(ctx);
      }
      function drawInitials(ctx) {
        text(ctx, 'YOU ARE A TOP PILOT', CX, 90, 3.4, '#ffe81f', 'center', 1.6);
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
        text(ctx, 'CREDIT ' + String(Math.min(api.credits, 99)).padStart(2, '0') + '      (C) 1983 ATARI', CX, y + 66, 1.8, '#a0a8c0', 'center');
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
          if (phase !== 'boom' && phase !== 'tally' && mode !== 'dying') drawCockpit(ctx);
        } else if (mode === 'select') { drawSelect(ctx); drawLasers(ctx); }
        else {
          cb = 1; sb = 0; drawStars(ctx, false);
          drawFrags(ctx);
        }
        ctx.restore();
        if (hitFlash > 0) { ctx.fillStyle = 'rgba(255,60,40,' + hitFlash / 32 + ')'; ctx.fillRect(0, 0, W, H); }
        ctx.shadowBlur = 6;
        if (inEngine) {
          drawHUD(ctx);
          if (phase === 'tally') drawTally(ctx);
          if (bannerT > 0 && phase !== 'tally') { ctx.globalAlpha = Math.min(1, bannerT / 20); text(ctx, banner, CX, 100, 2.8, bannerCol, 'center', 1.5); ctx.globalAlpha = 1; }
        }
        if (mode === 'dying') {
          ctx.beginPath();   // cracked canopy
          for (let i = 0; i < 9; i++) {
            let x = CX + Math.cos(i * 0.7) * 30, y = CY + Math.sin(i * 0.7) * 30; ctx.moveTo(x, y);
            for (let k = 0; k < 6; k++) { x += Math.cos(i * 0.7 + Math.sin(k * 3 + i) * 0.5) * 50; y += Math.sin(i * 0.7 + Math.sin(k * 3 + i) * 0.5) * 50; ctx.lineTo(x, y); }
          }
          stroke(ctx, '#c0d0ff', 1.2);
          if (modeT & 16) text(ctx, 'SHIELDS GONE', CX, 200, 4, '#ff3030', 'center', 1.8);
        }
        if (mode === 'play' || mode === 'dying' || mode === 'select') drawSubtitle(ctx);
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
          else {
            text(ctx, 'STAR WARS', CX, 70, 4, '#ffe81f', 'center', 1.8);
          }
          coinLines(ctx, stage === 'demo' ? 340 : 380);
        }
        ctx.shadowBlur = 0;
      }

      attractInit('title');
      return {
        update, render,
        destroy() { music = null; },
        // test hook for scripted bots: start a wave, fly on autopilot, read progress
        debug: {
          start(w, opts) { startGame(w || 1); autopilot = !!(opts && opts.auto); god = !!(opts && opts.god); },
          info() { return { mode, stage, demo, phase, wave, score, shields, kills, killGoal, towerKills, towerTotal, catwalks: catwalks.length, trenchRuns, phaseT }; }
        }
      };
    }
  });
})();
