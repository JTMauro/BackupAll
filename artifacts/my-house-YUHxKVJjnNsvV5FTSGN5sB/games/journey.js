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
  function mkSpr(rows, pal) { return { rows: rows, pal: pal, w: rows[0].length, h: rows.length, cv: null, cvf: null }; }
  function bakeSpr(s, flip) {
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    for (let y = 0; y < s.h; y++) {
      const row = s.rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = s.pal[row[x]]; if (!col) continue;
        g.fillStyle = col; g.fillRect(flip ? s.w - 1 - x : x, y, 1, 1);
      }
    }
    return c;
  }
  function drawSpr(ctx, s, x, y, flip) {
    let c = flip ? s.cvf : s.cv;
    if (!c) { c = bakeSpr(s, flip); if (flip) s.cvf = c; else s.cv = c; }
    ctx.drawImage(c, Math.round(x), Math.round(y));
  }
  function hit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function pad2(n, k) { return String(n).padStart(k || 2, '0'); }

  // ======================================================================
  // Journey (Bally Midway, 1983) -- from-scratch recreation.
  // Five band members, five planets, five instruments; then the concert,
  // where the roadie keeps the love-crazed groupies off the stage.
  // ======================================================================
  const W = 256, H = 240, TOP = 14;
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);

  const MEMBERS = [
    { name: 'STEVE PERRY', inst: 'MICROPHONE', role: 'VOCALS', kind: 'jump', hair: '#3a2010', shirt: '#f4f4f4', pants: '#28307a', planet: '#d0408a', planet2: '#7a1850', ring: '#ff9ad0', hint: 'JUMP THE FLOATING LEDGES' },
    { name: 'NEAL SCHON', inst: 'GUITAR', role: 'LEAD GUITAR', kind: 'jet', hair: '#111111', shirt: '#e02020', pants: '#222222', planet: '#e08020', planet2: '#803000', ring: null, hint: 'JETPACK DOWN THE CAVERN' },
    { name: 'ROSS VALORY', inst: 'BASS GUITAR', role: 'BASS', kind: 'gates', hair: '#6a3a1a', shirt: '#2060e0', pants: '#333333', planet: '#3070ff', planet2: '#102880', ring: '#a0d0ff', hint: 'DROP THROUGH THE SLIDING GATES' },
    { name: 'JONATHAN CAIN', inst: 'KEYBOARD', role: 'KEYBOARDS', kind: 'glide', hair: '#e0c060', shirt: '#20b040', pants: '#202060', planet: '#30c070', planet2: '#0a5a30', ring: null, hint: 'GLIDE THROUGH THE CANYON' },
    { name: 'STEVE SMITH', inst: 'DRUM KIT', role: 'DRUMS', kind: 'bounce', hair: '#7a4a20', shirt: '#f0d020', pants: '#402010', planet: '#a050ff', planet2: '#40108a', ring: '#ffe060', hint: 'BOUNCE UP THE DRUM HEADS' }
  ];

  const PERSON = [
    '..hhhh..',
    '.hhhhhh.',
    '.hsssshh',
    '.hsososh',
    '..ssssh.',
    '...ss...',
    '.cccccc.',
    'c.cccc.c',
    's.cccc.s',
    '..cccc..',
    '..pppp..',
    '..p..p..',
    '..p..p..',
    '.bb..bb.'
  ];
  const PERSON2 = [
    '..hhhh..',
    '.hhhhhh.',
    '.hsssshh',
    '.hsososh',
    '..ssssh.',
    '...ss...',
    '.cccccc.',
    'c.cccc.c',
    's.cccc.s',
    '..cccc..',
    '..pppp..',
    '.pp..pp.',
    'pp....p.',
    'b.....bb'
  ];
  const MSPR = MEMBERS.map(m => {
    const pal = { h: m.hair, s: '#f0b080', o: '#000000', c: m.shirt, p: m.pants, b: '#5a3010' };
    return [mkSpr(PERSON, pal), mkSpr(PERSON2, pal)];
  });
  const ROADIE = [mkSpr(PERSON, { h: '#202020', s: '#e0a070', o: '#000', c: '#505050', p: '#202020', b: '#000' }),
    mkSpr(PERSON2, { h: '#202020', s: '#e0a070', o: '#000', c: '#505050', p: '#202020', b: '#000' })];
  const GROUPIE = [mkSpr(PERSON, { h: '#ffe040', s: '#ffc0a0', o: '#000', c: '#ff40c0', p: '#ff40c0', b: '#fff' }),
    mkSpr(PERSON2, { h: '#ffe040', s: '#ffc0a0', o: '#000', c: '#ff40c0', p: '#ff40c0', b: '#fff' })];

  const IPAL = { g: '#c8c8c8', k: '#303030', r: '#e02828', R: '#901010', b: '#2858e8', B: '#103090', w: '#ffffff', y: '#ffd020', Y: '#a07000', e: '#808080' };
  const INST = [
    mkSpr(['..gggg..', '.gegegg.', '.gggggg.', '.gegegg.', '..gggg..', '...kk...', '...kk...', '...kk...', '...kk...', '...kk...', '..kkkk..', '.kkkkkk.'], IPAL),
    mkSpr(['...ww...', '...kk...', '...kk...', '...kk...', '...kk...', '...kk...', '..rkkr..', '.rrkkrr.', 'rrrkkrrr', '.rrkkrr.', '..rrrr..', '.rrrrrr.', 'rrwwwwrr', 'rrrkkrrr', '.rrrrrr.', '..RRRR..'], IPAL),
    mkSpr(['...ww...', '...kk...', '...kk...', '...kk...', '...kk...', '...kk...', '...kk...', '...kk...', '..bkkb..', '.bbkkbb.', 'bbbkkbbb', '.bbkkbb.', 'bbbbbbbb', 'bbwwwwbb', '.bbbbbb.', '..BBBB..'], IPAL),
    mkSpr(['gggggggggggggggg', 'gwkwkwwkwkwkwwkg', 'gwkwkwwkwkwkwwkg', 'gwwwwwwwwwwwwwwg', 'gwwwwwwwwwwwwwwg', 'gggggggggggggggg', '.e............e.', '.e............e.'], IPAL),
    mkSpr(['yyyy.......yyyy', '.YY.........YY.', '..e.........e..', '..e..rrrrr..e..', '..e.rwwwwwr.e..', '....rwwwwwr....', '.rr.rwwwwwr.rr.', 'rwwrrwwwwwrrwwr', 'rwwr.rrrrr.rwwr', '.rr..e...e..rr.'], IPAL)
  ];

  // ---------------- synthesized original tunes ----------------
  // each song: tempo in frames per 8th, bass roots per bar, chord per bar, lead (one entry per 8th, 0 = rest)
  const SONGS = {
    hub: { step: 12, bass: [45, 41, 48, 43], chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]],
      lead: [76, 0, 74, 72, 0, 72, 74, 76, 77, 0, 76, 74, 72, 0, 69, 0, 72, 0, 74, 76, 79, 0, 77, 76, 74, 0, 71, 72, 74, 0, 0, 0] },
    planet: { step: 9, bass: [40, 40, 43, 45], chords: [[52, 55, 59], [52, 55, 59], [55, 59, 62], [57, 60, 64]],
      lead: [64, 67, 71, 67, 64, 0, 62, 64, 64, 67, 71, 74, 72, 71, 67, 0, 67, 71, 74, 71, 67, 0, 69, 71, 72, 71, 69, 67, 69, 0, 0, 0] },
    concert: { step: 11, bass: [40, 47, 49, 45], chords: [[64, 68, 71], [63, 66, 71], [61, 64, 68], [61, 64, 69]],
      lead: [76, 0, 76, 78, 80, 0, 78, 76, 75, 0, 75, 76, 78, 0, 0, 0, 73, 0, 73, 75, 76, 0, 80, 78, 76, 0, 75, 73, 71, 0, 0, 0] }
  };

  ArcadeRegistry.register({
    id: 'journey', title: 'Journey', year: 1983, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move/choose \u00b7 Space: jump/fire/thrust/push \u00b7 X: fire \u00b7 Enter: start',
    marquee: { bg: '#080418', fg: '#ffd040', accent: '#ff40a0' },
    create(api) {
      const au = api.audio;
      let mode = 'attract', attractT = 0, coinFlash = 0, overT = 0;
      let hi = api.getHiScore(30000);
      let score = 0, lives = 3, round = 1, nextExtra = 25000;
      let got = [false, false, false, false, false];
      let scene = 'hub', sceneT = 0, sel = 0;
      let P = null;            // current planet
      let C = null;            // concert
      let parts = [];
      let song = null, songPos = 0, songT = 0, transpose = 0;
      const stars = [];
      for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * W, y: Math.random() * 600, s: Math.random() < 0.2 ? 2 : 1, c: ['#fff', '#8af', '#fa8', '#ff8'][i & 3] });

      // ---------------- sound ----------------
      const sfx = {
        jump() { au.tone(300, 0.12, { type: 'square', vol: 0.1, slideTo: 700 }); },
        shot() { au.tone(1200, 0.07, { type: 'square', vol: 0.07, slideTo: 300 }); },
        boom() { au.noise(0.35, { vol: 0.2, freq: 1600, slideTo: 100 }); },
        die() { au.melody([[523, .08], [466, .08], [415, .08], [370, .08], [330, .08], [262, .3]], { type: 'square', vol: 0.12 }); au.noise(0.5, { vol: 0.14, freq: 900, slideTo: 80 }); },
        got() { au.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .3]], { type: 'square', vol: 0.13 }); },
        select() { au.tone(880, 0.05, { type: 'square', vol: 0.08 }); },
        launch() { au.tone(120, 0.9, { type: 'sawtooth', vol: 0.1, slideTo: 900 }); au.noise(0.9, { vol: 0.08, freq: 600, slideTo: 3000 }); },
        bounce() { au.tone(110, 0.12, { type: 'triangle', vol: 0.22, slideTo: 60 }); au.noise(0.06, { vol: 0.1, freq: 3000 }); },
        push() { au.noise(0.08, { vol: 0.15, freq: 1200 }); au.tone(200, 0.06, { type: 'square', vol: 0.08 }); },
        extra() { au.melody([[880, .06], [1175, .06], [880, .06], [1175, .06], [1760, .2]], { type: 'square', vol: 0.12 }); },
        tick() { au.tone(1500, 0.03, { type: 'square', vol: 0.05 }); }
      };
      function playSong(name, tr) { song = SONGS[name]; songPos = 0; songT = 0; transpose = tr || 0; }
      function stopSong() { song = null; }
      function stepSong() {
        if (!song) return;
        if (songT-- > 0) return;
        songT = song.step;
        const n = song.lead.length, i = songPos % n, bar = Math.floor(i / 8) % 4;
        const dur = song.step / 60;
        if ((i & 1) === 0) au.tone(mf(song.bass[bar] - 12 + transpose), dur * 1.8, { type: 'triangle', vol: 0.11 });
        const ch = song.chords[bar];
        au.tone(mf(ch[i % 3] + transpose), dur * 0.9, { type: 'square', vol: 0.025 });
        if (song.lead[i]) au.tone(mf(song.lead[i] + transpose), dur * 1.6, { type: 'square', vol: 0.06 });
        if ((i & 3) === 2) au.noise(0.05, { vol: 0.05, freq: 6000, type: 'highpass' });
        songPos++;
      }

      function addScore(n) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += 50000; sfx.extra(); }
        if (score > hi) hi = score;
      }
      function burst(x, y, col, n) {
        for (let i = 0; i < (n || 14); i++) {
          const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 2.2;
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 25 + Math.random() * 20, c: col });
        }
      }

      // ---------------- planets ----------------
      function timeFor() { return Math.max(50, 95 - (round - 1) * 8) * 60; }
      function newPlanet(idx) {
        const m = MEMBERS[idx];
        P = { idx: idx, kind: m.kind, t: timeFor(), cam: 0, plats: [], foes: [], shots: [], done: false, doneT: 0, dead: false, deadT: 0, intro: 90,
          p: { x: 124, y: 0, vx: 0, vy: 0, face: 1, ground: null, anim: 0 }, ckpt: null, goal: null, spawnT: 0, wl: null, wr: null, ceil: null, floor: null, worldH: 0, worldW: W };
        const d = Math.min(6, round - 1);
        if (P.kind === 'jump') {
          P.worldH = 1300 + d * 80;
          P.plats.push({ x: 0, y: P.worldH - 8, w: W, vx: 0, fixed: true });
          let row = 0;
          for (let y = P.worldH - 50; y > 70; y -= 42) {
            row++;
            if (row % 7 === 0) { P.plats.push({ x: 88, y: y, w: 80, vx: 0, fixed: true, ck: true }); continue; }
            const n = Math.random() < 0.55 ? 2 : 1;
            for (let k = 0; k < n; k++) {
              const w = 30 + Math.random() * 14 - d * 1.5;
              P.plats.push({ x: Math.random() * (W - w), y: y, w: w, vx: (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.6 + d * 0.08), fixed: false });
            }
          }
          P.plats.push({ x: 78, y: 40, w: 100, vx: 0, fixed: true });
          P.goal = { x: 124, y: 26 };
          for (let i = 0; i < 6 + d * 2; i++) P.foes.push({ type: 'orb', x: Math.random() * W, y: 120 + Math.random() * (P.worldH - 260), vx: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6 + d * 0.1), ph: Math.random() * 6 });
          P.p.y = P.worldH - 8 - 14; P.ckpt = { x: 124, y: P.p.y };
        } else if (P.kind === 'jet' || P.kind === 'gates') {
          P.worldH = 1500 + d * 100;
          if (P.kind === 'jet') {
            const rows = Math.ceil(P.worldH / 8) + 2;
            P.wl = new Float32Array(rows); P.wr = new Float32Array(rows);
            let cx = 128, vx = 0;
            for (let i = 0; i < rows; i++) {
              const prog = i / rows;
              const half = Math.max(36, 78 - prog * 26 - d * 3);
              vx += (Math.random() - 0.5) * 0.9; vx *= 0.92; cx += vx;
              if (i < 10 || i > rows - 12) cx += (128 - cx) * 0.3;
              cx = Math.max(half + 6, Math.min(W - half - 6, cx));
              P.wl[i] = cx - half; P.wr[i] = cx + half;
            }
            for (let y = 200; y < P.worldH - 80; y += 70 - d * 4) {
              const r = (y / 8) | 0;
              P.foes.push({ type: 'eye', x: (P.wl[r] + P.wr[r]) / 2, y: y, vx: (Math.random() < 0.5 ? -1 : 1) * (0.6 + d * 0.12), ph: Math.random() * 6, hp: 1 });
            }
            P.p.y = 30; P.p.x = 124;
          } else {
            const gw = Math.max(26, 42 - d * 3);
            let n = 0;
            for (let y = 110; y < P.worldH - 60; y += 72) {
              n++;
              P.plats.push({ y: y, gx: Math.random() * (W - gw), gw: gw, vx: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5 + d * 0.1), elec: n % 3 === 0 });
            }
            P.p.y = 30; P.p.x = 124;
          }
          P.goal = { x: 124, y: P.worldH - 30 };
          P.ckpt = { x: P.p.x, y: P.p.y };
        } else if (P.kind === 'glide') {
          P.worldW = 2400 + d * 200;
          const cols = Math.ceil(P.worldW / 8) + 2;
          P.ceil = new Float32Array(cols); P.floor = new Float32Array(cols);
          let c = 40, f = 200;
          for (let i = 0; i < cols; i++) {
            c += (Math.random() - 0.5) * 6; f += (Math.random() - 0.5) * 6;
            c = Math.max(TOP + 4, Math.min(100, c)); f = Math.max(140, Math.min(H - 6, f));
            if (f - c < 84 - d * 3) { c -= 1; f += 1; }
            if (i > cols - 40 || i < 30) { c += (30 - c) * 0.2; f += (215 - f) * 0.2; }
            P.ceil[i] = c; P.floor[i] = f;
          }
          // crystal stalks
          for (let x = 300; x < P.worldW - 300; x += 110 + Math.random() * 80) {
            const i = (x / 8) | 0, up = Math.random() < 0.5, len = 26 + Math.random() * 24;
            P.plats.push({ x: x, w: 10, up: up, len: len });
          }
          P.p.x = 30; P.p.y = 120; P.cam = 0;
          P.goal = { x: P.worldW - 40, y: 124 };
          P.ckpt = { x: 0 };
        } else if (P.kind === 'bounce') {
          P.worldH = 1400 + d * 80;
          P.plats.push({ x: 0, y: P.worldH - 10, w: W, vx: 0, kind: 'fixed' });
          let row = 0;
          for (let y = P.worldH - 60; y > 70; y -= 52) {
            row++;
            if (row % 6 === 0) { P.plats.push({ x: 96, y: y, w: 64, vx: 0, kind: 'fixed', ck: true }); continue; }
            const r = Math.random();
            const kind = r < 0.25 + d * 0.04 ? 'vanish' : 'move';
            P.plats.push({ x: Math.random() * (W - 34), y: y, w: 34 - d, vx: (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.7 + d * 0.1), kind: kind, gone: 0 });
          }
          P.plats.push({ x: 80, y: 44, w: 96, vx: 0, kind: 'fixed' });
          P.goal = { x: 121, y: 30 };
          for (let i = 0; i < 4 + d; i++) P.foes.push({ type: 'cymbal', x: Math.random() * W, y: 150 + Math.random() * (P.worldH - 320), vx: (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.6 + d * 0.12), ph: 0 });
          P.p.y = P.worldH - 10 - 14; P.p.vy = -5;
          P.ckpt = { x: 124, y: P.p.y };
          P.cam = P.worldH - H;
        }
        if (P.kind !== 'glide') P.cam = Math.max(0, Math.min(P.worldH - H + TOP, P.p.y - 120));
        parts = [];
        playSong('planet', [0, 2, -3, 5, -2][idx]);
      }
      function respawn() {
        const p = P.p;
        p.vx = 0; p.vy = 0; p.ground = null;
        P.dead = false; P.deadT = 0; P.shots = []; P.t = timeFor(); P.intro = 50;
        if (P.kind === 'glide') {
          P.cam = Math.max(0, P.cam - 160);
          const i = Math.min(P.ceil.length - 1, ((P.cam + 40) / 8) | 0);
          p.x = P.cam + 36; p.y = (P.ceil[i] + P.floor[i]) / 2 - 6;
          P.foes = P.foes.filter(f => f.x > P.cam + W + 20);
          return;
        }
        p.x = P.ckpt.x; p.y = P.ckpt.y;
        for (const s of P.plats) s.gone = 0;
        if (P.kind === 'bounce') { p.vy = -5; P.cam = Math.max(0, Math.min(P.worldH - H, p.y - 150)); }
        P.foes = P.foes.filter(f => Math.abs(f.y - p.y) > 50 || f.type === 'cymbal' || f.type === 'orb');
        for (const f of P.foes) if ((f.type === 'cymbal' || f.type === 'orb') && Math.abs(f.y - p.y) < 40) f.y += 60;
      }
      function killPlayer() {
        if (P.dead || P.done) return;
        P.dead = true; P.deadT = 0;
        burst(P.p.x + 4, P.p.y + 7, MEMBERS[P.idx].shirt, 24);
        sfx.die(); stopSong();
      }
      function loseLife(after) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          const end = () => { gameOver(); };
          const cont = () => { lives = 3; after(); };
          if (api.offerContinue) api.offerContinue(cont, end); else end();
        } else after();
      }

      function solidJet(x, y, w, h) {
        for (let yy = y; yy <= y + h; yy += 4) {
          const r = Math.max(0, Math.min(P.wl.length - 1, (yy / 8) | 0));
          if (x < P.wl[r] || x + w > P.wr[r]) return true;
        }
        return false;
      }
      function solidGlide(x, y, w, h) {
        for (let xx = x; xx <= x + w; xx += 4) {
          const i = Math.max(0, Math.min(P.ceil.length - 1, (xx / 8) | 0));
          if (y < P.ceil[i] || y + h > P.floor[i]) return true;
        }
        for (const s of P.plats) {
          if (x + w < s.x || x > s.x + s.w) continue;
          const i = Math.max(0, Math.min(P.ceil.length - 1, (s.x / 8) | 0));
          if (s.up) { if (y + h > P.floor[i] - s.len) return true; }
          else if (y < P.ceil[i] + s.len) return true;
        }
        return false;
      }
      function fire(dx, dy) {
        if (P.shots.length >= 3) return;
        const p = P.p;
        P.shots.push({ x: p.x + 4 + dx * 4, y: p.y + 6 + dy * 4, vx: dx * 4.5, vy: dy * 4.5, t: 40 });
        sfx.shot();
      }

      function updatePlanet() {
        const p = P.p, m = MEMBERS[P.idx];
        if (P.intro > 0) { P.intro--; return; }
        if (P.done) {
          P.doneT++;
          if (P.doneT % 3 === 0 && P.t > 0) { const s = Math.min(P.t, 60); P.t -= s; addScore(Math.round(s / 60 * 20)); if (P.doneT % 6 === 0) sfx.tick(); }
          if (P.doneT > 200 && P.t <= 0) { got[P.idx] = true; enterHub(); }
          return;
        }
        if (P.dead) {
          P.deadT++;
          if (P.deadT === 110) loseLife(() => { respawn(); playSong('planet', [0, 2, -3, 5, -2][P.idx]); });
          return;
        }
        P.t--;
        if (P.t <= 0) { killPlayer(); return; }
        if (P.t < 600 && P.t % 60 === 0) sfx.tick();
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const fireP = api.pressed('KeyX') || api.pressed('KeyZ');
        p.anim++;
        if (L) p.face = -1; else if (R) p.face = 1;

        if (P.kind === 'jump') {
          const ax = (L ? -1 : 0) + (R ? 1 : 0);
          p.vx = ax * 1.4;
          if (p.ground) { p.x += p.ground.vx; }
          if (p.ground && (api.pressed('Space') || api.pressed('ArrowUp'))) { p.vy = -4.7; p.ground = null; sfx.jump(); }
          p.vy = Math.min(4.5, p.vy + 0.19);
          p.x = Math.max(0, Math.min(W - 8, p.x + p.vx));
          const ob = p.y + 14;
          p.y += p.vy;
          p.ground = null;
          if (p.vy >= 0) {
            for (const s of P.plats) {
              if (ob <= s.y + 0.5 && p.y + 14 >= s.y && p.x + 6 > s.x && p.x + 2 < s.x + s.w) {
                p.y = s.y - 14; p.vy = 0; p.ground = s;
                if (s.ck && P.ckpt.y > p.y) { P.ckpt = { x: p.x, y: p.y }; sfx.tick(); }
                break;
              }
            }
          }
          for (const s of P.plats) if (!s.fixed) { s.x += s.vx; if (s.x < 0 || s.x + s.w > W) { s.vx = -s.vx; s.x = Math.max(0, Math.min(W - s.w, s.x)); } }
          for (const f of P.foes) {
            f.x += f.vx; f.ph += 0.06; if (f.x < 0 || f.x > W - 10) f.vx = -f.vx;
            if (hit(p.x + 1, p.y + 1, 6, 12, f.x + 1, f.y + Math.sin(f.ph) * 6 + 1, 8, 8)) killPlayer();
          }
          P.cam += ((p.y - 120) - P.cam) * 0.12;
        } else if (P.kind === 'jet') {
          if (L) p.vx -= 0.11; if (R) p.vx += 0.11;
          if (U || api.key('Space')) p.vy -= 0.12;
          if (D) p.vy += 0.06;
          p.vy += 0.045; p.vx *= 0.97; p.vy *= 0.985;
          p.vx = Math.max(-1.8, Math.min(1.8, p.vx)); p.vy = Math.max(-1.6, Math.min(1.9, p.vy));
          p.x += p.vx; p.y += p.vy;
          if (p.y < 4) { p.y = 4; p.vy = 0; }
          if (p.y > P.worldH - 26) { p.y = P.worldH - 26; p.vy = 0; }
          if ((U || api.key('Space')) && p.anim % 3 === 0) parts.push({ x: p.x + 4 - p.face * 4, y: p.y + 12, vx: (Math.random() - 0.5) * 0.4, vy: 1.4, t: 12, c: Math.random() < 0.5 ? '#ff8020' : '#ffe040' });
          if (fireP) fire(p.face, 0);
          if (solidJet(p.x, p.y + 1, 8, 12)) killPlayer();
          for (const f of P.foes) {
            const r = Math.max(0, Math.min(P.wl.length - 1, (f.y / 8) | 0));
            f.ph += 0.05; f.x += f.vx;
            if (f.x < P.wl[r] + 2 || f.x + 10 > P.wr[r] - 2) f.vx = -f.vx;
            if (Math.abs(f.y - p.y) < 90) f.y += Math.sign(p.y - f.y) * 0.25;
            if (hit(p.x + 1, p.y + 1, 6, 12, f.x, f.y, 10, 10)) killPlayer();
          }
          if (p.y > P.ckpt.y + 380) P.ckpt = { x: p.x, y: p.y, vy: 0 };
          P.cam += ((p.y - 100) - P.cam) * 0.15;
        } else if (P.kind === 'gates') {
          p.vx = ((L ? -1 : 0) + (R ? 1 : 0)) * 1.5;
          const vy = D ? 1.6 : U ? 0.2 : 0.65;
          if (api.pressed('Space') || fireP) fire(0, 1);
          p.x = Math.max(0, Math.min(W - 8, p.x + p.vx));
          const ob = p.y + 14;
          p.y = Math.min(P.worldH - 26, p.y + vy);
          for (const g of P.plats) {
            g.gx += g.vx; if (g.gx < 0 || g.gx + g.gw > W) { g.vx = -g.vx; g.gx = Math.max(0, Math.min(W - g.gw, g.gx)); }
          }
          for (const g of P.plats) {
            const inGap = p.x >= g.gx && p.x + 8 <= g.gx + g.gw;
            if (ob <= g.y + 0.6 && p.y + 14 > g.y && !inGap) {
              if (g.elec && api.frame % 40 < 28) { killPlayer(); break; }
              p.y = g.y - 14;
            } else if (p.y + 14 > g.y && p.y < g.y + 4 && !inGap) {
              // gate slid into us while passing: shove us into the gap
              if (p.x < g.gx) p.x = g.gx; else if (p.x + 8 > g.gx + g.gw) p.x = g.gx + g.gw - 8;
            }
          }
          if (P.spawnT-- <= 0) {
            P.spawnT = Math.max(30, 90 - round * 8);
            P.foes.push({ type: 'bubble', x: 10 + Math.random() * (W - 30), y: P.cam + H + 10, vy: -(0.5 + Math.random() * 0.5 + round * 0.06), ph: Math.random() * 6 });
          }
          for (const f of P.foes) {
            f.y += f.vy; f.ph += 0.07; f.x += Math.sin(f.ph) * 0.7;
            if (hit(p.x + 1, p.y + 1, 6, 12, f.x, f.y, 10, 10)) killPlayer();
          }
          P.foes = P.foes.filter(f => f.y > P.cam - 20 && !f.dead);
          if (p.y > P.ckpt.y + 360) P.ckpt = { x: p.x, y: p.y };
          P.cam += ((p.y - 70) - P.cam) * 0.15;
        } else if (P.kind === 'glide') {
          const sp = P.cam < P.worldW - W ? 0.75 + Math.min(0.5, (round - 1) * 0.1) : 0;
          P.cam += sp;
          p.vx = ((L ? -1 : 0) + (R ? 1 : 0)) * 1.5 + sp;
          p.vy = ((U ? -1 : 0) + (D ? 1 : 0)) * 1.5;
          p.x = Math.max(P.cam + 2, Math.min(P.cam + W - 14, p.x + p.vx));
          p.y = Math.max(TOP, Math.min(H - 12, p.y + p.vy));
          p.face = 1;
          if (api.pressed('Space') || fireP) fire(1, 0);
          if (solidGlide(p.x + 1, p.y + 2, 12, 7)) killPlayer();
          if (P.cam < P.worldW - W - 40 && P.spawnT-- <= 0) {
            P.spawnT = Math.max(40, 110 - round * 10);
            const i = Math.min(P.ceil.length - 1, ((P.cam + W) / 8) | 0);
            const cy = (P.ceil[i] + P.floor[i]) / 2;
            const n = 3 + (round > 2 ? 1 : 0);
            for (let k = 0; k < n; k++) P.foes.push({ type: 'bird', x: P.cam + W + 8 + k * 18, y: cy, base: cy, ph: k * 0.7, vx: -(0.6 + round * 0.08) });
          }
          for (const f of P.foes) {
            f.x += f.vx; f.ph += 0.06; f.y = f.base + Math.sin(f.ph) * 26;
            if (hit(p.x + 1, p.y + 2, 12, 7, f.x, f.y, 10, 8)) killPlayer();
          }
          P.foes = P.foes.filter(f => f.x > P.cam - 30 && !f.dead);
        } else if (P.kind === 'bounce') {
          p.vx = ((L ? -1 : 0) + (R ? 1 : 0)) * 1.6;
          p.x += p.vx;
          if (p.x < -6) p.x += W; if (p.x > W - 2) p.x -= W;
          const ob = p.y + 14;
          p.vy = Math.min(5, p.vy + 0.16);
          p.y += p.vy;
          if (p.vy > 0) {
            for (const s of P.plats) {
              if (s.gone) continue;
              if (ob <= s.y + 0.5 && p.y + 14 >= s.y && p.x + 6 > s.x && p.x + 2 < s.x + s.w) {
                p.y = s.y - 14;
                p.vy = api.key('Space') || U ? -6.5 : -5.1;
                s.hitT = 10;
                sfx.bounce();
                if (s.kind === 'vanish') { s.gone = 1; burst(s.x + s.w / 2, s.y, '#ffffff', 8); }
                if (s.ck && P.ckpt.y > p.y) P.ckpt = { x: p.x, y: p.y };
                break;
              }
            }
          }
          for (const s of P.plats) { if (s.hitT) s.hitT--; if (s.kind === 'move' || s.kind === 'vanish') { s.x += s.vx; if (s.x < 0 || s.x + s.w > W) { s.vx = -s.vx; s.x = Math.max(0, Math.min(W - s.w, s.x)); } } }
          for (const f of P.foes) {
            f.x += f.vx; f.ph += 0.2; if (f.x < 0 || f.x > W - 14) f.vx = -f.vx;
            if (hit(p.x + 1, p.y + 1, 6, 12, f.x, f.y + 2, 14, 4)) killPlayer();
          }
          const target = p.y - 110;
          if (target < P.cam) P.cam += (target - P.cam) * 0.2;
          if (p.y > P.cam + H + 10) killPlayer();
        }
        if (P.kind !== 'glide') P.cam = Math.max(0, Math.min(P.worldH - H + TOP, P.cam));
        else P.cam = Math.min(P.cam, P.worldW - W);

        // shots
        for (const s of P.shots) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (P.kind === 'jet' && solidJet(s.x, s.y, 2, 1)) s.t = 0;
          if (P.kind === 'glide' && solidGlide(s.x, s.y, 2, 1)) s.t = 0;
          for (const f of P.foes) {
            if (f.dead || f.type === 'orb' || f.type === 'cymbal') continue;
            if (hit(s.x - 1, s.y - 1, 4, 4, f.x, f.y, 10, 10)) {
              f.dead = true; s.t = 0; sfx.boom(); burst(f.x + 5, f.y + 5, f.type === 'eye' ? '#40ff60' : f.type === 'bird' ? '#ff60ff' : '#60c0ff', 12);
              addScore(f.type === 'eye' ? 200 : 150);
            }
          }
        }
        P.shots = P.shots.filter(s => s.t > 0);
        P.foes = P.foes.filter(f => !f.dead);
        // goal
        const g = P.goal;
        if (!P.dead && hit(p.x, p.y, 8, 14, g.x - 2, g.y - 2, 18, 20)) {
          P.done = true; P.doneT = 0; stopSong(); sfx.got(); addScore(2000 * round);
          burst(g.x + 6, g.y + 6, '#ffff60', 30);
        }
      }

      // ---------------- concert ----------------
      function newConcert() {
        C = { t: 0, len: 45 * 60, gr: [], spawnT: 60, onStage: 0, rx: 124, face: 1, push: 0, pushed: 0, over: false, overT: 0, lights: 0 };
        playSong('concert', 0);
      }
      function updateConcert() {
        if (C.over) {
          C.overT++;
          if (C.overT === 30) { const bonus = C.onStage < 3 ? 10000 * round : 2000 * round; addScore(bonus); C.bonus = bonus; sfx.got(); }
          if (C.overT > 260) { round++; got = [false, false, false, false, false]; enterHub(); }
          return;
        }
        C.t++; C.lights++;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight');
        if (L) { C.rx -= 2.0; C.face = -1; } if (R) { C.rx += 2.0; C.face = 1; }
        C.rx = Math.max(4, Math.min(W - 12, C.rx));
        if (C.push > 0) C.push--;
        if ((api.pressed('Space') || api.pressed('KeyX')) && C.push === 0) {
          C.push = 14; sfx.push();
          for (const g of C.gr) {
            if (g.state !== 'run') continue;
            if (Math.abs(g.x - C.rx) < 18 && g.y < 150 && g.y > 96) {
              g.state = 'fly'; g.vy = 3.2; g.vx = (g.x - C.rx) * 0.1; addScore(100); C.pushed++;
            }
          }
        }
        if (C.t < C.len && C.spawnT-- <= 0) {
          C.spawnT = Math.max(22, 70 - round * 8 - (C.t / 60 | 0));
          C.gr.push({ x: 10 + Math.random() * (W - 28), y: H + 4, vx: (Math.random() - 0.5) * 0.8, vy: -(0.45 + Math.random() * 0.35 + round * 0.07), state: 'run', a: 0 });
        }
        for (const g of C.gr) {
          g.a++;
          if (g.state === 'run') {
            g.y += g.vy; g.x += g.vx + Math.sin(g.a * 0.05) * 0.4;
            if (g.x < 4 || g.x > W - 12) g.vx = -g.vx;
            // the roadie physically blocks
            if (Math.abs(g.x - C.rx) < 9 && g.y < 132 && g.y > 110) { g.y = 132; }
            if (g.y < 80) { g.state = 'stage'; C.onStage++; au.tone(1300, 0.15, { type: 'square', vol: 0.1, slideTo: 1600 }); burst(g.x + 4, g.y + 4, '#ff40c0', 10); }
          } else if (g.state === 'fly') {
            g.y += g.vy; g.x += g.vx; g.vy *= 0.99;
          }
        }
        C.gr = C.gr.filter(g => g.state !== 'stage' && g.y < H + 30);
        if (C.onStage >= 3 || (C.t >= C.len && C.gr.length === 0) || C.t > C.len + 600) { C.over = true; C.overT = 0; stopSong(); }
      }

      // ---------------- flow ----------------
      function enterHub() {
        scene = 'hub'; sceneT = 0; P = null; C = null;
        const left = got.indexOf(false);
        if (left < 0) { scene = 'toConcert'; sceneT = 0; stopSong(); return; }
        if (got[sel]) sel = left;
        playSong('hub', 0);
      }
      function startGame() {
        mode = 'play'; score = 0; lives = 3; round = 1; nextExtra = 25000; got = [false, false, false, false, false]; sel = 0;
        enterHub();
      }
      function gameOver() {
        api.setHiScore(score); mode = 'over'; overT = 0; stopSong();
        au.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.12 });
      }
      function tryStart() {
        if (api.useCredit()) startGame();
        else { coinFlash = 90; au.tone(80, 0.25, { type: 'square', vol: 0.2 }); }
      }

      function update() {
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.03; q.t--; }
        parts = parts.filter(q => q.t > 0);
        if (mode === 'attract') {
          attractT++;
          if (attractT % 900 === 1) playSong('hub', 0);
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (mode === 'over') {
          overT++;
          if (overT > 300 || (overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; attractT = 0; stopSong(); }
          return;
        }
        stepSong();
        sceneT++;
        if (scene === 'hub') {
          if (api.anyPressed('ArrowRight', 'ArrowDown')) { do { sel = (sel + 1) % 5; } while (got[sel]); sfx.select(); }
          if (api.anyPressed('ArrowLeft', 'ArrowUp')) { do { sel = (sel + 4) % 5; } while (got[sel]); sfx.select(); }
          if (sceneT > 20 && api.anyPressed('Space', 'Enter', 'KeyX')) { scene = 'launch'; sceneT = 0; stopSong(); sfx.launch(); }
        } else if (scene === 'launch') {
          if (sceneT > 70) { scene = 'planet'; sceneT = 0; newPlanet(sel); }
        } else if (scene === 'planet') {
          updatePlanet();
        } else if (scene === 'toConcert') {
          if (sceneT > 150) { scene = 'concert'; sceneT = 0; newConcert(); }
        } else if (scene === 'concert') {
          updateConcert();
        }
      }

      // ---------------- drawing ----------------
      function drawStars(ctx, off, scale) {
        for (const s of stars) {
          const y = ((s.y - off * scale) % 600 + 600) % 600;
          if (y > H) continue;
          ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, y | 0, s.s, s.s);
        }
      }
      function drawScarab(ctx, cx, cy, sc, t) {
        // the band's scarab-beetle starship
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        ctx.fillStyle = '#5a3a10';
        for (let i = -1; i <= 1; i++) { ctx.fillRect(-26, i * 8 - 1, 52, 2); }
        ctx.fillStyle = '#c08a20'; ctx.beginPath(); ctx.ellipse(0, 4, 18, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd050'; ctx.beginPath(); ctx.ellipse(-6, 6, 9, 18, -0.05, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(6, 6, 9, 18, 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7a4a10'; ctx.fillRect(-1, -12, 2, 36);
        ctx.fillStyle = '#e0a030'; ctx.beginPath(); ctx.ellipse(0, -18, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#40e0ff'; ctx.fillRect(-5, -21, 3, 3); ctx.fillRect(2, -21, 3, 3);
        ctx.fillStyle = '#c08a20'; ctx.fillRect(-10, -28, 2, 6); ctx.fillRect(8, -28, 2, 6);
        const fl = (t >> 2) & 1;
        ctx.fillStyle = fl ? '#ff8020' : '#ffe040'; ctx.fillRect(-8, 26, 5, 4 + fl * 3); ctx.fillRect(3, 26, 5, 4 + fl * 3);
        ctx.restore();
      }
      function drawPlanet(ctx, x, y, r, m) {
        ctx.fillStyle = m.planet2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = m.planet; ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.18, r * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.4, r * 0.25, 0, Math.PI * 2); ctx.fill();
        if (m.ring) { ctx.strokeStyle = m.ring; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r * 0.4, -0.3, 0, Math.PI * 2); ctx.stroke(); }
      }
      const PLANET_POS = [[128, 44], [214, 92], [190, 186], [66, 186], [42, 92]];
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP - 2);
        text(ctx, 'SCORE ' + score, 2, 2, '#fff');
        text(ctx, 'HI ' + hi, W / 2 + 10, 2, '#ffd040', 1, 'center');
        for (let i = 0; i < Math.min(5, lives - 1); i++) drawSpr(ctx, MSPR[i][0], W - 10 - i * 10, 0, false);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(0, TOP - 2, W, 1);
      }
      function drawHub(ctx) {
        drawStars(ctx, api.frame * 0.3, 1);
        drawScarab(ctx, 128, 116, 1.4, api.frame);
        for (let i = 0; i < 5; i++) {
          const m = MEMBERS[i], [x, y] = PLANET_POS[i];
          drawPlanet(ctx, x, y, 16, m);
          if (got[i]) {
            drawSpr(ctx, INST[i], x - INST[i].w / 2, y - INST[i].h / 2, false);
            text(ctx, 'OK', x, y + 20, '#40ff40', 1, 'center');
          } else {
            drawSpr(ctx, MSPR[i][(api.frame >> 4) & 1], x - 4, y - 7, false);
            text(ctx, m.name.split(' ')[1], x, y + 20, m.planet, 1, 'center');
          }
          if (i === sel && !got[i] && ((api.frame >> 3) & 1)) {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(x - 22, y - 22, 44, 50);
          }
        }
        const m = MEMBERS[sel];
        text(ctx, 'CHOOSE A PLANET', W / 2, H - 22, '#ffd040', 1, 'center');
        text(ctx, m.name + ' - ' + m.inst, W / 2, H - 12, '#fff', 1, 'center');
      }
      function drawFoe(ctx, f, ox, oy) {
        const x = Math.round(f.x - ox), y = Math.round(f.y - oy);
        if (f.type === 'orb') {
          const yy = y + Math.round(Math.sin(f.ph) * 6);
          ctx.fillStyle = '#ff2050'; ctx.fillRect(x + 2, yy, 6, 10); ctx.fillRect(x, yy + 2, 10, 6);
          ctx.fillStyle = '#ffd0e0'; ctx.fillRect(x + 3, yy + 3, 2, 2);
          ctx.fillStyle = '#ff9030'; if ((api.frame >> 2) & 1) { ctx.fillRect(x - 2, yy + 4, 2, 2); ctx.fillRect(x + 10, yy + 4, 2, 2); }
        } else if (f.type === 'eye') {
          ctx.fillStyle = '#20a040'; ctx.fillRect(x, y + 2, 10, 6); ctx.fillRect(x + 2, y, 6, 10);
          ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 3, 4, 4);
          ctx.fillStyle = '#000'; ctx.fillRect(x + 4 + Math.round(Math.sin(f.ph)), y + 4, 2, 2);
          ctx.fillStyle = '#80ff80'; const k = (api.frame >> 3) & 1; ctx.fillRect(x + (k ? 0 : 8), y + 10, 2, 2);
        } else if (f.type === 'bubble') {
          ctx.strokeStyle = '#80d0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 5, y + 5, 5, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y + 2, 2, 2);
          ctx.fillStyle = '#ff60ff'; ctx.fillRect(x + 4, y + 5, 3, 3);
        } else if (f.type === 'bird') {
          const k = (api.frame >> 3) & 1;
          ctx.fillStyle = '#ff40ff'; ctx.fillRect(x + 2, y + 3, 8, 3);
          ctx.fillStyle = '#ffa0ff'; if (k) { ctx.fillRect(x, y, 4, 3); ctx.fillRect(x + 8, y, 3, 3); } else { ctx.fillRect(x, y + 6, 4, 2); ctx.fillRect(x + 8, y + 6, 3, 2); }
          ctx.fillStyle = '#ffff00'; ctx.fillRect(x, y + 4, 2, 1);
        } else if (f.type === 'cymbal') {
          const wv = Math.abs(Math.sin(f.ph)) * 7 + 1;
          ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(x + 7 - wv), y + 3, Math.round(wv * 2), 2);
          ctx.fillStyle = '#a07010'; ctx.fillRect(x + 6, y + 1, 2, 6);
        }
      }
      function drawPlayer(ctx, ox, oy) {
        const p = P.p, m = MEMBERS[P.idx];
        if (P.dead) return;
        if (P.intro > 0 && ((P.intro >> 2) & 1)) return;
        const x = p.x - ox, y = p.y - oy;
        if (P.kind === 'glide') {
          // hang-glider
          ctx.fillStyle = '#40ff80'; ctx.fillRect(x - 2, y, 18, 2); ctx.fillRect(x + 2, y - 2, 10, 2);
          ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x + 6, y + 2, 1, 3);
          ctx.fillStyle = m.shirt; ctx.fillRect(x + 4, y + 5, 7, 3);
          ctx.fillStyle = m.hair; ctx.fillRect(x + 11, y + 4, 3, 3);
          ctx.fillStyle = m.pants; ctx.fillRect(x, y + 6, 4, 2);
          return;
        }
        const fr = (P.kind === 'jump' && p.ground && p.vx !== 0) || P.kind === 'gates' ? (p.anim >> 3) & 1 : (p.ground ? 0 : 1);
        drawSpr(ctx, MSPR[P.idx][fr], x, y, p.face < 0);
        if (P.kind === 'jet') { ctx.fillStyle = '#909090'; ctx.fillRect(x + (p.face > 0 ? -2 : 8), y + 6, 3, 6); }
        if (P.kind === 'gates') { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 4, 14, 2); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 3, y - 2, 1, 4); ctx.fillRect(x + 10, y - 2, 1, 4); }
      }
      function drawPlanetScene(ctx) {
        const m = MEMBERS[P.idx];
        if (P.kind === 'glide') {
          const ox = P.cam;
          ctx.fillStyle = '#04120a'; ctx.fillRect(0, 0, W, H);
          drawStars(ctx, ox * 0.2, 0);
          const i0 = (ox / 8) | 0;
          for (let i = i0; i < i0 + 34 && i < P.ceil.length; i++) {
            const x = i * 8 - ox;
            ctx.fillStyle = m.planet2; ctx.fillRect(x, 0, 8, P.ceil[i]); ctx.fillRect(x, P.floor[i], 8, H - P.floor[i]);
            ctx.fillStyle = m.planet; ctx.fillRect(x, P.ceil[i] - 2, 8, 2); ctx.fillRect(x, P.floor[i], 8, 2);
          }
          for (const s of P.plats) {
            const x = s.x - ox; if (x < -12 || x > W) continue;
            const i = Math.max(0, Math.min(P.ceil.length - 1, (s.x / 8) | 0));
            ctx.fillStyle = '#80ffd0';
            if (s.up) ctx.fillRect(x, P.floor[i] - s.len, s.w, s.len); else ctx.fillRect(x, P.ceil[i], s.w, s.len);
            ctx.fillStyle = '#ffffff';
            if (s.up) ctx.fillRect(x + 4, P.floor[i] - s.len, 2, s.len); else ctx.fillRect(x + 4, P.ceil[i], 2, s.len);
          }
          drawSpr(ctx, INST[P.idx], P.goal.x - ox, P.goal.y - oyGoalBob(), false);
          for (const f of P.foes) drawFoe(ctx, f, ox, 0);
          for (const s of P.shots) { ctx.fillStyle = '#ffff80'; ctx.fillRect(s.x - ox, s.y, 5, 2); }
          drawPlayer(ctx, ox, 0);
          for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(q.x - ox, q.y, 2, 2); }
        } else {
          const oy = Math.round(P.cam);
          ctx.fillStyle = '#060418'; ctx.fillRect(0, 0, W, H);
          drawStars(ctx, oy, 0.4);
          if (P.kind === 'jet') {
            const r0 = Math.max(0, (oy / 8) | 0);
            ctx.fillStyle = m.planet2; ctx.fillRect(0, P.worldH - 12 - oy, W, 20);
            for (let r = r0; r < r0 + 32 && r < P.wl.length; r++) {
              const y = r * 8 - oy;
              ctx.fillStyle = m.planet2; ctx.fillRect(0, y, P.wl[r], 8); ctx.fillRect(P.wr[r], y, W - P.wr[r], 8);
              ctx.fillStyle = m.planet; ctx.fillRect(P.wl[r] - 2, y, 2, 8); ctx.fillRect(P.wr[r], y, 2, 8);
            }
          } else if (P.kind === 'gates') {
            ctx.fillStyle = m.planet2; ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H);
            for (const g of P.plats) {
              const y = g.y - oy; if (y < -6 || y > H) continue;
              const on = g.elec && api.frame % 40 < 28;
              ctx.fillStyle = g.elec ? (on ? ((api.frame >> 1) & 1 ? '#ff4040' : '#ffff40') : '#603030') : m.planet;
              ctx.fillRect(0, y, g.gx, 4); ctx.fillRect(g.gx + g.gw, y, W - g.gx - g.gw, 4);
              ctx.fillStyle = '#ffffff'; ctx.fillRect(g.gx - 2, y - 1, 2, 6); ctx.fillRect(g.gx + g.gw, y - 1, 2, 6);
            }
            ctx.fillStyle = m.planet2; ctx.fillRect(0, P.worldH - 12 - oy, W, 20);
          } else {
            for (const s of P.plats) {
              if (s.gone) continue;
              const y = s.y - oy; if (y < -8 || y > H) continue;
              if (P.kind === 'bounce') {
                const sq = s.hitT ? 2 : 0;
                ctx.fillStyle = s.kind === 'vanish' ? '#ff80c0' : s.kind === 'fixed' ? '#ffd040' : '#e0e0ff';
                ctx.fillRect(s.x, y + sq, s.w, 3 - sq);
                ctx.fillStyle = s.kind === 'vanish' ? '#a02060' : '#a02020'; ctx.fillRect(s.x + 1, y + 3, s.w - 2, 4);
                ctx.fillStyle = '#c0c0c0'; ctx.fillRect(s.x + 2, y + 3, 1, 4); ctx.fillRect(s.x + s.w - 3, y + 3, 1, 4);
              } else {
                ctx.fillStyle = s.fixed ? m.planet2 : m.planet; ctx.fillRect(s.x, y, s.w, 5);
                ctx.fillStyle = s.ck ? '#ffff80' : '#ffffff'; ctx.fillRect(s.x, y, s.w, 1);
                if (!s.fixed && (api.frame >> 2) & 1) { ctx.fillStyle = '#ff9030'; ctx.fillRect(s.x + s.w / 2 - 2, y + 5, 4, 2); }
              }
            }
          }
          drawSpr(ctx, INST[P.idx], P.goal.x, P.goal.y - oy - oyGoalBob(), false);
          for (const f of P.foes) drawFoe(ctx, f, 0, oy);
          for (const s of P.shots) { ctx.fillStyle = '#ffff80'; ctx.fillRect(s.x, s.y - oy, s.vx ? 5 : 2, s.vx ? 2 : 5); }
          drawPlayer(ctx, 0, oy);
          for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y - oy, 2, 2); }
        }
        drawHUD(ctx);
        const secs = Math.ceil(P.t / 60);
        text(ctx, 'TIME ' + secs, W - 50, TOP + 2, secs <= 10 && ((api.frame >> 3) & 1) ? '#ff4040' : '#ffffff');
        // progress bar
        let prog;
        if (P.kind === 'glide') prog = P.p.x / P.goal.x;
        else if (P.kind === 'jump' || P.kind === 'bounce') prog = 1 - (P.p.y - P.goal.y) / (P.worldH - P.goal.y);
        else prog = P.p.y / P.goal.y;
        prog = Math.max(0, Math.min(1, prog));
        ctx.fillStyle = '#303030'; ctx.fillRect(4, TOP + 3, 60, 4);
        ctx.fillStyle = m.shirt; ctx.fillRect(4, TOP + 3, Math.round(60 * prog), 4);
        if (P.intro > 0 && !P.done) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(16, 84, W - 32, 52);
          text(ctx, m.name, W / 2, 90, m.shirt, 1, 'center');
          text(ctx, 'FIND THE ' + m.inst, W / 2, 104, '#ffffff', 1, 'center');
          text(ctx, m.hint, W / 2, 120, '#ffd040', 1, 'center');
        }
        if (P.done) {
          text(ctx, 'GOT THE ' + m.inst + '!', W / 2, 96, '#ffff40', 1, 'center');
          text(ctx, 'TIME BONUS', W / 2, 112, '#ffffff', 1, 'center');
        }
      }
      function oyGoalBob() { return Math.round(Math.sin(api.frame * 0.08) * 2); }

      function drawStage(ctx, t) {
        // stage and lights
        ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 6; i++) {
          const a = Math.sin(t * 0.03 + i) * 0.5;
          ctx.fillStyle = ['rgba(255,60,60,0.18)', 'rgba(60,120,255,0.18)', 'rgba(255,220,60,0.18)'][i % 3];
          ctx.beginPath(); ctx.moveTo(20 + i * 43, TOP); ctx.lineTo(20 + i * 43 + a * 80 - 18, 86); ctx.lineTo(20 + i * 43 + a * 80 + 18, 86); ctx.fill();
        }
        ctx.fillStyle = '#402818'; ctx.fillRect(0, 76, W, 10);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(0, 76, W, 1);
        ctx.fillStyle = '#202020'; for (let x = 8; x < W; x += 56) ctx.fillRect(x, 30, 14, 46);
        ctx.fillStyle = '#505050'; for (let x = 8; x < W; x += 56) { ctx.fillRect(x + 3, 36, 8, 8); ctx.fillRect(x + 3, 54, 8, 8); }
        for (let i = 0; i < 5; i++) {
          const x = 30 + i * 46, bob = ((t >> 3) + i) & 1;
          drawSpr(ctx, MSPR[i][bob], x, 60 - bob, i > 2);
          const s = INST[i];
          drawSpr(ctx, s, x + (i === 3 ? -4 : 6), 76 - s.h + (i === 3 ? 2 : 0), false);
        }
      }
      function drawConcert(ctx) {
        drawStage(ctx, C.lights);
        // crowd floor
        ctx.fillStyle = '#140a20'; ctx.fillRect(0, 86, W, H - 86);
        ctx.fillStyle = '#ffffff'; for (let x = 0; x < W; x += 8) ctx.fillRect(x, 140, 4, 1);
        for (const g of C.gr) drawSpr(ctx, GROUPIE[(g.a >> 3) & 1], g.x, g.y, g.vx < 0);
        drawSpr(ctx, ROADIE[C.push > 0 ? 1 : 0], C.rx, 118, C.face < 0);
        if (C.push > 6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(C.rx + (C.face > 0 ? 9 : -5), 125, 4, 2); }
        for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 2, 2); }
        drawHUD(ctx);
        text(ctx, 'ROADIE HERBIE', 4, TOP + 2, '#a0a0a0');
        const left = Math.max(0, Math.ceil((C.len - C.t) / 60));
        text(ctx, 'SHOW ' + left, W - 4, TOP + 2, '#ffffff', 1, 'right');
        for (let i = 0; i < 3; i++) { ctx.fillStyle = i < C.onStage ? '#ff40c0' : '#402040'; ctx.fillRect(W / 2 - 16 + i * 12, TOP + 2, 8, 6); }
        if (C.over) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 150, W - 40, 50);
          text(ctx, C.onStage >= 3 ? 'THE FANS STORMED THE STAGE' : 'GREAT SHOW!', W / 2, 158, '#ffd040', 1, 'center');
          if (C.bonus) text(ctx, 'CONCERT BONUS ' + C.bonus, W / 2, 172, '#ffffff', 1, 'center');
          text(ctx, 'NEXT TOUR ' + (round + 1), W / 2, 186, '#40ffff', 1, 'center');
        } else if (C.t < 150) text(ctx, 'KEEP THE FANS OFF THE STAGE!', W / 2, 200, '#ffffff', 1, 'center');
      }

      function drawAttract(ctx) {
        ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, W, H);
        drawStars(ctx, api.frame * 0.5, 1);
        const ph = Math.floor(attractT / 420) % 2;
        if (ph === 0) {
          for (let i = 0; i < 7; i++) text(ctx, 'JOURNEY', W / 2 + 1, 26 + i, i === 6 ? '#ffd040' : '#7a3a00', 4, 'center');
          text(ctx, 'JOURNEY', W / 2, 26, '#ffd040', 4, 'center');
          drawScarab(ctx, 128, 102, 1, api.frame);
          text(ctx, 'THE BAND HAS LOST THEIR INSTRUMENTS', W / 2, 136, '#ffffff', 1, 'center');
          text(ctx, 'ON FIVE ALIEN PLANETS.', W / 2, 146, '#ffffff', 1, 'center');
          text(ctx, 'FIND THEM, THEN PLAY THE CONCERT!', W / 2, 158, '#ff80c0', 1, 'center');
          for (let i = 0; i < 5; i++) drawSpr(ctx, MSPR[i][(api.frame >> 4) + i & 1], 50 + i * 36, 172, false);
        } else {
          text(ctx, 'THE BAND', W / 2, 24, '#ffd040', 2, 'center');
          for (let i = 0; i < 5; i++) {
            const m = MEMBERS[i], y = 50 + i * 24;
            drawSpr(ctx, MSPR[i][0], 30, y, false);
            text(ctx, m.name, 46, y, m.shirt === '#f4f4f4' ? '#ffffff' : m.shirt);
            text(ctx, m.role, 46, y + 8, '#a0a0a0');
            drawSpr(ctx, INST[i], 200, y - 2, false);
          }
          text(ctx, 'BONUS LIFE AT 25000', W / 2, 172, '#40ffff', 1, 'center');
        }
        text(ctx, 'HI ' + hi, W / 2, 4, '#ffd040', 1, 'center');
        const blink = (api.frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 196, '#ffffff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 196, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 196, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1983 BALLY MIDWAY', W / 2, 214, '#808080', 1, 'center');
        text(ctx, 'CREDIT ' + pad2(Math.min(99, api.credits)), 4, H - 9, '#a0a0a0');
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { drawAttract(ctx); return; }
        if (scene === 'hub') { drawHub(ctx); drawHUD(ctx); }
        else if (scene === 'launch') {
          drawStars(ctx, api.frame * 3, 1);
          const k = sceneT / 70;
          drawPlanet(ctx, 128, 120, 16 + k * k * 160, MEMBERS[sel]);
          drawScarab(ctx, 128, 120 + k * 40, 1.4 - k * 1.2, api.frame);
          drawHUD(ctx);
        } else if (scene === 'planet' && P) drawPlanetScene(ctx);
        else if (scene === 'toConcert') {
          drawStage(ctx, sceneT);
          drawHUD(ctx);
          text(ctx, 'ALL INSTRUMENTS FOUND!', W / 2, 120, '#ffd040', 1, 'center');
          text(ctx, 'TONIGHT: THE CONCERT', W / 2, 136, '#ffffff', 1, 'center');
        } else if (scene === 'concert' && C) drawConcert(ctx);
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(40, 96, W - 80, 40);
          text(ctx, 'GAME OVER', W / 2, 106, '#ff4040', 2, 'center');
        }
      }
      return { update, render, destroy() { stopSong(); } };
    }
  });
})();
