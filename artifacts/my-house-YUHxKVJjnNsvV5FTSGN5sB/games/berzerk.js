// Berzerk (Stern, 1980) \u2014 written from scratch for the MAME32 Game Room.
// Maze rooms of killer robots, electrified walls, Evil Otto and synthesized robot voices.
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

  const W = 256, H = 224;
  const L = 8, T = 8, CW = 48, CH = 64, R = L + 5 * CW, B = T + 3 * CH; // maze 8..248 x 8..200
  const WT = 2; // wall half-thickness
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0;
  const WALL = '#2840ff';

  const PL = { G: '#20ff20' };
  const MAN = {
    stand: makeSpr(['..GG..', '..GG..', '......', '.GGGG.', 'G.GG.G', 'G.GG.G', '..GG..', '..GG..', '.G..G.', '.G..G.', '.G..G.'], PL),
    run1: makeSpr(['..GG..', '..GG..', '......', '.GGGG.', 'G.GG.G', '..GG.G', '..GG..', '..GGG.', '.G...G', 'G....G', '......'], PL),
    run2: makeSpr(['..GG..', '..GG..', '......', '.GGGG.', 'G.GG.G', 'G.GG..', '..GG..', '..GG..', '..GG..', '..G.G.', '..G.G.'], PL),
    shootH: makeSpr(['..GG...', '..GG...', '.......', '.GGGGGG', 'G.GG...', 'G.GG...', '..GG...', '..GG...', '.G..G..', '.G..G..', '.G..G..'], PL),
    shootU: makeSpr(['..GG.G', '..GG.G', '.....G', '.GGGG.', 'G.GG..', 'G.GG..', '..GG..', '..GG..', '.G..G.', '.G..G.', '.G..G.'], PL),
    shootD: makeSpr(['..GG..', '..GG..', '......', '.GGGG.', 'G.GG..', 'G.GG..', '..GGG.', '..GG.G', '.G..GG', '.G..G.', '.G..G.'], PL)
  };
  const ROBOT = [
    makeSpr(['..XXXX..', '.XX..XX.', '.XXXXXX.', '..XXXX..', 'XXXXXXXX', 'X.XXXX.X', 'X.XXXX.X', '..XXXX..', '..X..X..', '..X..X..', '.XX..XX.'], { X: '#fff' }),
    makeSpr(['..XXXX..', '.XX..XX.', '.XXXXXX.', '..XXXX..', 'XXXXXXXX', 'X.XXXX.X', 'X.XXXX.X', '..XXXX..', '..X..X..', '.X....X.', 'XX....XX'], { X: '#fff' })
  ];
  const OTTO = makeSpr(['..YYYY..', '.YYYYYY.', 'YY.YY.YY', 'YYYYYYYY', 'Y.YYYY.Y', 'YY....YY', '.YYYYYY.', '..YYYY..'], { Y: '#ffff20' });
  // robot colours / skills by level
  const LEVELS = [
    { col: '#c8b000', shots: 0, sp: 0.28, bs: 1.4, care: 0.80 },
    { col: '#ff2020', shots: 1, sp: 0.32, bs: 1.6, care: 0.84 },
    { col: '#00c8c8', shots: 2, sp: 0.36, bs: 1.8, care: 0.86 },
    { col: '#30ff30', shots: 3, sp: 0.40, bs: 2.0, care: 0.88 },
    { col: '#ff40ff', shots: 4, sp: 0.44, bs: 2.2, care: 0.90 },
    { col: '#ffff30', shots: 5, sp: 0.48, bs: 2.4, care: 0.92 },
    { col: '#ffffff', shots: 5, sp: 0.52, bs: 2.7, care: 0.93 },
    { col: '#4070ff', shots: 6, sp: 0.56, bs: 3.0, care: 0.94 },
    { col: '#ff8020', shots: 7, sp: 0.62, bs: 3.2, care: 0.95 }
  ];
  const DIR8 = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  const OPP = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

  // phrases: syllables (vowel picks the formant), display text
  const PHRASES = {
    alert: ['IN TRU DER A LERT! IN TRU DER A LERT!', 'INTRUDER ALERT! INTRUDER ALERT!'],
    chicken: ['CHICK EN, FIGHT LIKE A RO BOT!', 'CHICKEN, FIGHT LIKE A ROBOT!'],
    got: ['GOT THE HU MAN OID! GOT THE IN TRU DER!', 'GOT THE HUMANOID! GOT THE INTRUDER!'],
    escape: ['THE HU MAN OID MUST NOT ES CAPE!', 'THE HUMANOID MUST NOT ESCAPE!'],
    kill: ['KILL THE IN TRU DER!', 'KILL THE INTRUDER!'],
    stop: ['STOP THE HU MAN OID!', 'STOP THE HUMANOID!'],
    coins: ['COINS DE TECT ED IN POCK ET!', 'COINS DETECTED IN POCKET!']
  };

  ArcadeRegistry.register({
    id: 'berzerk', title: 'Berzerk', year: 1980, maker: 'Stern',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Hold Space + arrow: shoot that way \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#20ff20', accent: '#2840ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(5000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null, sub = '', subT = 0, voiceBusy = 0;

      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');

      // ---------- robot voice: buzzy glottal tone + formant + consonant hiss per syllable ----------
      const VF = { A: 760, E: 560, I: 330, O: 480, U: 380, Y: 400 };
      function speak(key, force) {
        if (voiceBusy > 0 && !force) return;
        const [syl, shown] = PHRASES[key];
        let t = 0, n = 0;
        const base = 92 + rnd(10);
        for (const word of syl.split(' ')) {
          const w = word.replace(/[^A-Z]/g, '');
          if (!w) continue;
          const v = (w.match(/[AEIOUY]/) || ['E'])[0];
          const first = w[0];
          if ('SCFKTHP'.includes(first)) au.noise(0.05, { vol: 0.07, freq: first === 'S' || first === 'C' ? 5200 : 2600, type: 'highpass', delay: t });
          const f0 = base * (1 + 0.08 * Math.sin(n * 1.7)) * (n % 5 === 0 ? 1.12 : 1);
          au.tone(f0, 0.15, { type: 'sawtooth', vol: 0.12, delay: t + 0.03, slideTo: f0 * 0.9 });
          au.tone(VF[v], 0.13, { type: 'square', vol: 0.025, delay: t + 0.03, slideTo: VF[v] * 1.15 });
          au.tone(VF[v] * 2.6, 0.1, { type: 'triangle', vol: 0.02, delay: t + 0.04 });
          if (/[!,]$/.test(word)) t += 0.12;
          t += 0.18; n++;
        }
        sub = shown; subT = Math.round(t * 60) + 50; voiceBusy = Math.round(t * 60) + 20;
      }

      const snd = {
        shot() { au.tone(1300, 0.08, { type: 'square', vol: 0.07, slideTo: 300 }); },
        rshot() { au.tone(500, 0.08, { type: 'square', vol: 0.05, slideTo: 1400 }); },
        boom() { au.noise(0.25, { vol: 0.14, freq: 2500, slideTo: 150 }); au.tone(160, 0.2, { type: 'square', vol: 0.06, slideTo: 50 }); },
        zap() { for (let i = 0; i < 10; i++) au.tone(60 + (i & 1) * 40, 0.09, { type: 'sawtooth', vol: 0.13, delay: i * 0.09 }); au.noise(0.9, { vol: 0.09, freq: 6000, type: 'highpass' }); },
        otto() { au.tone(220, 0.06, { type: 'square', vol: 0.05, slideTo: 440 }); },
        bonus() { au.melody([[660, 0.06], [880, 0.06], [1100, 0.06], [1320, 0.14]], { type: 'square', vol: 0.08 }); },
        life() { au.melody([[880, 0.08], [1175, 0.08], [1760, 0.2]], { type: 'square', vol: 0.1 }); }
      };

      // ---------- maze ----------
      function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216; }
      function hline(x1, x2, y) { return { x: Math.min(x1, x2) - WT, y: y - WT, w: Math.abs(x2 - x1) + WT * 2, h: WT * 2 }; }
      function vline(x, y1, y2) { return { x: x - WT, y: Math.min(y1, y2) - WT, w: WT * 2, h: Math.abs(y2 - y1) + WT * 2 }; }
      // pick pillar directions; reject layouts that seal a cell off from the exits
      function pillarDirs(rx, ry) {
        for (let k = 0; k < 40; k++) {
          const r = rng(((rx * 7919 + ry * 104729 + 1) ^ 0x5a5a) + k * 31337);
          const dirs = []; for (let i = 0; i < 8; i++) dirs.push((r() * 4) | 0);
          if (connected(dirs)) return dirs;
        }
        return [3, 2, 3, 2, 2, 3, 2, 3];
      }
      function connected(dirs) {
        const block = new Set(); // "a|b" cell pairs separated by a wall
        const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a), id = (i, j) => j * 5 + i;
        for (let j = 1; j <= 2; j++) for (let i = 1; i <= 4; i++) {
          const d = dirs[(j - 1) * 4 + (i - 1)];
          if (d === 0) block.add(key(id(i - 1, j - 1), id(i, j - 1)));
          else if (d === 1) block.add(key(id(i - 1, j), id(i, j)));
          else if (d === 2) block.add(key(id(i - 1, j - 1), id(i - 1, j)));
          else block.add(key(id(i, j - 1), id(i, j)));
        }
        const seen = new Set([0]), q = [0];
        while (q.length) {
          const c = q.pop(), i = c % 5, j = (c / 5) | 0;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ni = i + di, nj = j + dj; if (ni < 0 || ni > 4 || nj < 0 || nj > 2) continue;
            const n = id(ni, nj); if (seen.has(n) || block.has(key(c, n))) continue;
            seen.add(n); q.push(n);
          }
        }
        return seen.size === 15;
      }
      function buildRoom(rx, ry, entry) {
        const dirs = pillarDirs(rx, ry);
        const walls = [];
        const dl = L + 2 * CW, dr = L + 3 * CW, du = T + CH, dd = T + 2 * CH;
        walls.push(hline(L, dl, T), hline(dr, R, T), hline(L, dl, B), hline(dr, R, B));
        walls.push(vline(L, T, du), vline(L, dd, B), vline(R, T, du), vline(R, dd, B));
        for (let j = 1; j <= 2; j++) for (let i = 1; i <= 4; i++) {
          const x = L + i * CW, y = T + j * CH, d = dirs[(j - 1) * 4 + (i - 1)];
          if (d === 0) walls.push(vline(x, y, y - CH));
          else if (d === 1) walls.push(vline(x, y, y + CH));
          else if (d === 2) walls.push(hline(x, x - CW, y));
          else walls.push(hline(x, x + CW, y));
        }
        let door = null;
        if (entry === 'left') door = vline(L, du, dd);
        else if (entry === 'right') door = vline(R, du, dd);
        else if (entry === 'top') door = hline(dl, dr, T);
        else if (entry === 'bottom') door = hline(dl, dr, B);
        if (door) { door.door = true; walls.push(door); }
        return walls;
      }
      function rectHits(walls, x0, y0, x1, y1) {
        for (const w of walls) if (x1 > w.x && x0 < w.x + w.w && y1 > w.y && y0 < w.y + w.h) return true;
        return false;
      }
      function pointHits(walls, x, y) { return rectHits(walls, x - 0.5, y - 0.5, x + 0.5, y + 0.5); }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, nextLife: 5000, rooms: 0, rx: 0, ry: 0, phase: 'enter', phaseT: 40, msg: '', msgT: 0, flash: 0 };
        enterRoom('left');
      }
      const lvl = () => LEVELS[Math.min(LEVELS.length - 1, Math.max(0, g.rooms - 1) >> 1)];
      function enterRoom(entry) {
        g.rooms++; g.entry = entry;
        g.walls = buildRoom(g.rx, g.ry, entry);
        const ent = {
          left: [L + 10, T + 1.5 * CH], right: [R - 10, T + 1.5 * CH], top: [L + 2.5 * CW, T + 12], bottom: [L + 2.5 * CW, B - 12]
        }[entry];
        g.p = { x: ent[0], y: ent[1], face: entry === 'right' ? 'L' : entry === 'top' ? 'D' : entry === 'bottom' ? 'U' : 'R', anim: 0, shootT: 0, pose: 'stand' };
        g.pshots = []; g.rshots = []; g.robots = []; g.parts = [];
        const L0 = lvl();
        const n = Math.min(12, 3 + irnd(3) + Math.min(6, g.rooms >> 1));
        const entryCell = { left: [0, 1], right: [4, 1], top: [2, 0], bottom: [2, 2] }[entry];
        let tries = 0;
        while (g.robots.length < n && tries++ < 400) {
          const cx = irnd(5), cy = irnd(3);
          if (cx === entryCell[0] && cy === entryCell[1]) continue;
          const x = L + cx * CW + 10 + rnd(CW - 20), y = T + cy * CH + 12 + rnd(CH - 24);
          if (rectHits(g.walls, x - 8, y - 10, x + 8, y + 10)) continue;
          if (g.robots.some(o => Math.abs(o.x - x) < 14 && Math.abs(o.y - y) < 18)) continue;
          g.robots.push({ x, y, vx: 0, vy: 0, walk: irnd(60), pause: 30 + irnd(60), fireT: 60 + irnd(120), eye: irnd(8), anim: 0 });
        }
        g.startRobots = g.robots.length;
        g.otto = null; g.ottoT = Math.max(360, 1000 - g.rooms * 40); g.roomT = 0; g.bonusGiven = false;
        g.phase = 'enter'; g.phaseT = 30; g.col = L0.col;
        speak('alert', true);
      }
      function addScore(n) {
        g.score += n;
        while (g.score >= g.nextLife) { g.lives++; g.nextLife += 10000; snd.life(); }
        if (g.score > hi) hi = g.score;
      }
      function burst(x, y, col, n) {
        for (let i = 0; i < n; i++) { const a = rnd(Math.PI * 2), v = 0.3 + rnd(1.6); g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 18 + irnd(16), col }); }
      }
      function killRobot(r, score) {
        if (r.dead) return;
        r.dead = true; if (score) addScore(50);
        burst(r.x, r.y, g.col, 22); burst(r.x, r.y, '#ffffff', 6); snd.boom();
      }
      function playerDie() {
        if (g.phase !== 'play') return;
        g.phase = 'dying'; g.phaseT = 120; g.pshots = []; snd.zap();
        setTimeoutish(() => speak('got', true), 70);
      }
      let pendingCalls = [];
      function setTimeoutish(fn, frames) { pendingCalls.push({ fn, t: frames }); }

      function updPlayer() {
        const p = g.p;
        const dx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const dy = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        if (p.shootT > 0) p.shootT--;
        if (api.key('Space')) {
          // fire: hold the button and push a direction (or tap to fire the way you face)
          let fx = dx, fy = dy;
          if (!fx && !fy && api.pressed('Space')) { const f = DIR8[p.face]; fx = f[0]; fy = f[1]; }
          if ((fx || fy) && p.shootT <= 0 && g.pshots.length < 2) {
            const sp = 4;
            const n = fx && fy ? 0.72 : 1;
            g.pshots.push({ x: p.x + fx * 4, y: p.y - 2 + fy * 6, vx: fx * sp * n, vy: fy * sp * n, life: 90 });
            p.shootT = 14; snd.shot();
            p.pose = fy < 0 && !fx ? 'shootU' : fy > 0 && !fx ? 'shootD' : 'shootH';
            if (fx) p.face = fx > 0 ? 'R' : 'L';
          }
          return;
        }
        if (p.shootT < 6) p.pose = 'stand';
        if (dx || dy) {
          const sp = 0.9;
          p.x += dx * sp; p.y += dy * sp; p.anim++;
          if (dx) p.face = dx > 0 ? 'R' : 'L'; else p.face = dy > 0 ? 'D' : 'U';
          p.pose = ((p.anim >> 3) & 1) ? 'run1' : 'run2';
        } else p.pose = p.shootT > 6 ? p.pose : 'stand';
        if (rectHits(g.walls, p.x - 3, p.y - 5, p.x + 3, p.y + 5)) { g.flash = 40; playerDie(); return; }
        // exits
        let exit = null;
        if (p.x < L - 6) exit = 'left'; else if (p.x > R + 6) exit = 'right';
        else if (p.y < T - 8) exit = 'top'; else if (p.y > B + 8) exit = 'bottom';
        if (exit) leaveRoom(exit);
      }
      function leaveRoom(exit) {
        const alive = g.robots.filter(r => !r.dead).length;
        if (alive > 0 && g.startRobots > 0) speak('chicken', true);
        g.phase = 'exit'; g.phaseT = 48; g.exitDir = exit; g.rshots = []; g.pshots = []; g.otto = null;
        if (exit === 'left') g.rx--; else if (exit === 'right') g.rx++; else if (exit === 'top') g.ry--; else g.ry++;
      }
      function updRobots() {
        const p = g.p, L0 = lvl();
        const allDead = !g.robots.some(r => !r.dead);
        let rsCount = g.rshots.length;
        for (const r of g.robots) {
          if (r.dead) continue;
          r.eye = (r.eye + 0.15) % 8;
          // movement in bursts
          if (r.pause > 0) { r.pause--; if (r.pause === 0) r.walk = 40 + irnd(70); }
          else if (r.walk > 0) {
            r.walk--; if (r.walk === 0) r.pause = 20 + irnd(50);
            const dx = p.x - r.x, dy = p.y - r.y;
            const vx = Math.abs(dx) > 2 ? Math.sign(dx) : 0, vy = Math.abs(dy) > 2 ? Math.sign(dy) : 0;
            const sp = L0.sp * (g.otto ? 1.15 : 1);
            const nx = r.x + vx * sp, ny = r.y + vy * sp;
            const blocked = rectHits(g.walls, nx - 4, ny - 5, nx + 4, ny + 5);
            if (!blocked) { r.x = nx; r.y = ny; }
            else if (Math.random() > L0.care) { r.x = nx; r.y = ny; } // blunders into the electrified wall
            else {
              if (!rectHits(g.walls, nx - 4, r.y - 5, nx + 4, r.y + 5)) r.x = nx;
              else if (!rectHits(g.walls, r.x - 4, ny - 5, r.x + 4, ny + 5)) r.y = ny;
            }
            if ((frame & 7) === 0) r.anim ^= 1;
            if (rectHits(g.walls, r.x - 4, r.y - 5, r.x + 4, r.y + 5)) { killRobot(r, true); continue; }
          }
          // shooting along rows, columns and diagonals
          if (r.fireT > 0) r.fireT--;
          if (L0.shots > 0 && r.fireT <= 0 && rsCount < L0.shots && g.phase === 'play') {
            const dx = p.x - r.x, dy = p.y - r.y;
            let fx = 0, fy = 0;
            if (Math.abs(dy) < 5) fx = Math.sign(dx);
            else if (Math.abs(dx) < 4) fy = Math.sign(dy);
            else if (Math.abs(Math.abs(dx) - Math.abs(dy)) < 6) { fx = Math.sign(dx); fy = Math.sign(dy); }
            if ((fx || fy) && Math.random() < 0.08) {
              const n = fx && fy ? 0.72 : 1;
              g.rshots.push({ x: r.x + fx * 5, y: r.y - 1 + fy * 7, vx: fx * L0.bs * n, vy: fy * L0.bs * n, life: 220 });
              rsCount++; r.fireT = 50 + irnd(60); snd.rshot();
            }
          }
        }
        // robot vs robot collisions
        for (let i = 0; i < g.robots.length; i++) {
          const a = g.robots[i]; if (a.dead) continue;
          for (let j = i + 1; j < g.robots.length; j++) {
            const b = g.robots[j]; if (b.dead) continue;
            if (Math.abs(a.x - b.x) < 7 && Math.abs(a.y - b.y) < 10) { killRobot(a, true); killRobot(b, true); break; }
          }
          if (!a.dead && g.phase === 'play' && Math.abs(a.x - p.x) < 6 && Math.abs(a.y - p.y) < 10) { killRobot(a, true); playerDie(); }
        }
        if (!allDead && !g.robots.some(r => !r.dead) && !g.bonusGiven && g.startRobots > 0) {
          g.bonusGiven = true; const b = g.startRobots * 10; addScore(b); g.msg = 'BONUS ' + b; g.msgT = 150; snd.bonus();
        }
      }
      function updShots() {
        const p = g.p;
        for (const s of g.pshots) {
          for (let k = 0; k < 4 && !s.dead; k++) {
            s.x += s.vx / 4; s.y += s.vy / 4;
            if (pointHits(g.walls, s.x, s.y) || s.x < 0 || s.x > W || s.y < 0 || s.y > B + 12) { s.dead = true; break; }
            for (const r of g.robots) if (!r.dead && Math.abs(r.x - s.x) < 5 && Math.abs(r.y - s.y) < 6) { killRobot(r, true); s.dead = true; break; }
            if (s.dead) break;
            for (const q of g.rshots) if (!q.dead && Math.abs(q.x - s.x) < 3 && Math.abs(q.y - s.y) < 3) { q.dead = true; s.dead = true; burst(s.x, s.y, '#fff', 4); break; }
            if (g.otto && Math.abs(g.otto.x - s.x) < 5 && Math.abs(g.otto.y - g.otto.b - s.y) < 5) { s.dead = true; snd.otto(); }
          }
          if (--s.life <= 0) s.dead = true;
        }
        for (const s of g.rshots) {
          for (let k = 0; k < 3 && !s.dead; k++) {
            s.x += s.vx / 3; s.y += s.vy / 3;
            if (pointHits(g.walls, s.x, s.y)) { s.dead = true; break; }
            if ((s.age || 0) > 8) for (const r of g.robots) if (!r.dead && Math.abs(r.x - s.x) < 4 && Math.abs(r.y - s.y) < 5) { killRobot(r, true); s.dead = true; break; }
            if (!s.dead && g.phase === 'play' && Math.abs(p.x - s.x) < 3.5 && Math.abs(p.y - s.y) < 6) { s.dead = true; playerDie(); }
          }
          s.age = (s.age || 0) + 1;
          if (--s.life <= 0) s.dead = true;
        }
        g.pshots = g.pshots.filter(s => !s.dead);
        g.rshots = g.rshots.filter(s => !s.dead);
      }
      function updOtto() {
        const p = g.p;
        if (!g.otto) {
          if (g.roomT === g.ottoT - 90) speak(Math.random() < 0.5 ? 'escape' : 'kill');
          if (g.roomT >= g.ottoT) {
            const ent = { left: [L - 4, T + 1.5 * CH], right: [R + 4, T + 1.5 * CH], top: [L + 2.5 * CW, T + 6], bottom: [L + 2.5 * CW, B - 6] }[g.entry];
            g.otto = { x: ent[0], y: ent[1], b: 0, t: 0 };
            au.melody([[196, 0.1], [262, 0.1], [196, 0.1], [262, 0.2]], { type: 'square', vol: 0.08 });
          }
          return;
        }
        const o = g.otto; o.t++;
        const fast = !g.robots.some(r => !r.dead);
        const sp = Math.min(1.1, 0.55 + g.rooms * 0.02) * (fast ? 1.6 : 1);
        o.x += Math.max(-sp, Math.min(sp, p.x - o.x));
        o.y += Math.max(-sp * 0.6, Math.min(sp * 0.6, p.y - o.y));
        o.b = Math.abs(Math.sin(o.t * 0.12)) * 10;
        if (o.b < 0.6 && (o.t % 26) < 2) snd.otto();
        for (const r of g.robots) if (!r.dead && Math.abs(r.x - o.x) < 7 && Math.abs(r.y - (o.y - o.b)) < 9) killRobot(r, false);
        if (g.phase === 'play' && Math.abs(p.x - o.x) < 6 && Math.abs(p.y - (o.y - o.b)) < 9) playerDie();
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 360;
      }
      function lastLife(onCont) {
        g.phase = 'wait';
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) onCont(); }, () => { if (g === cg) gameOver(); });
      }
      function nextRoomAfterDeath() { g.rx++; enterRoom('left'); }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (subT > 0) subT--;
        if (voiceBusy > 0) voiceBusy--;
        for (const c of pendingCalls) c.t--;
        const due = pendingCalls.filter(c => c.t <= 0); pendingCalls = pendingCalls.filter(c => c.t > 0);
        for (const c of due) c.fn();
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        if (g.msgT > 0) g.msgT--;
        if (g.flash > 0) g.flash--;
        switch (g.phase) {
          case 'enter':
            if (--g.phaseT <= 0) g.phase = 'play';
            break;
          case 'play':
            g.roomT++;
            updPlayer();
            if (g.phase !== 'play') break;
            updRobots(); updShots(); updOtto();
            if (g.roomT % 900 === 450 && g.robots.some(r => !r.dead)) speak(Math.random() < 0.5 ? 'stop' : 'kill');
            break;
          case 'dying':
            for (const r of g.robots) if (!r.dead) r.eye = (r.eye + 0.15) % 8;
            if (--g.phaseT <= 0) {
              g.lives--;
              if (g.lives > 0) nextRoomAfterDeath();
              else lastLife(() => { g.lives = 3; nextRoomAfterDeath(); });
            }
            break;
          case 'exit':
            if (--g.phaseT <= 0) enterRoom(OPP[g.exitDir]);
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; if (api.credits > 0) speak('coins', true); }
            break;
        }
      }

      // ---------- rendering ----------
      function drawWalls(ctx, walls, ox, oy, col) {
        for (const w of walls) {
          ctx.fillStyle = w.door ? (g && g.phase === 'enter' && (frame & 4) ? '#ffffff' : col) : col;
          ctx.fillRect(Math.round(w.x + ox), Math.round(w.y + oy), w.w, w.h);
        }
      }
      function drawRobot(ctx, r, col, ox, oy) {
        drawSpr(ctx, ROBOT[r.anim & 1], r.x + ox, r.y + oy, { col });
        // scanning eye
        const e = Math.floor(r.eye) % 8, ex = e < 4 ? e : 7 - e;
        ctx.fillStyle = '#ff0000'; ctx.fillRect(Math.round(r.x + ox) - 2 + ex, Math.round(r.y + oy) - 5, 1, 1);
      }
      function drawRoom(ctx, ox, oy) {
        const wallCol = g.flash > 0 && (frame & 2) ? '#ffffff' : WALL;
        drawWalls(ctx, g.walls, ox, oy, wallCol);
        for (const r of g.robots) if (!r.dead) drawRobot(ctx, r, g.col, ox, oy);
        for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x + ox), Math.round(q.y + oy), 1, 1); }
        ctx.fillStyle = g.col;
        for (const s of g.rshots) {
          const ux = Math.sign(s.vx), uy = Math.sign(s.vy);
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(s.x - ux * i + ox), Math.round(s.y - uy * i + oy), 1, 1);
        }
        ctx.fillStyle = '#20ff20';
        for (const s of g.pshots) {
          const ux = Math.sign(s.vx), uy = Math.sign(s.vy);
          for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(s.x - ux * i + ox), Math.round(s.y - uy * i + oy), 1, 1);
        }
        if (g.otto) drawSpr(ctx, OTTO, g.otto.x + ox, g.otto.y - g.otto.b + oy, {});
      }
      function drawPlayer(ctx, ox, oy) {
        const p = g.p;
        if (g.phase === 'dying') {
          const k = 120 - g.phaseT;
          const cols = ['#ff2020', '#ffff20', '#20ffff', '#ff20ff', '#ffffff', '#20ff20'];
          if (k < 80) {
            drawSpr(ctx, MAN.stand, p.x + ox, p.y + oy, { col: cols[(frame >> 1) % cols.length] });
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 4; i++) { const a = rnd(6.28), d = 4 + rnd(5); ctx.fillRect(Math.round(p.x + Math.cos(a) * d + ox), Math.round(p.y + Math.sin(a) * d + oy), 1, 1); }
          } else drawSpr(ctx, MAN.stand, p.x + ox, p.y + oy + (k - 80) * 0.15, { col: '#206020' });
          return;
        }
        if (g.phase === 'wait' || g.phase === 'over') return;
        const spr = MAN[p.pose] || MAN.stand;
        drawSpr(ctx, spr, p.x + ox, p.y + oy, { flip: p.face === 'L' });
      }
      function drawHUD(ctx) {
        text(ctx, String(g.score).padStart(5, ' '), 8, 208, '#20ff20', 1);
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) drawSpr(ctx, MAN.stand, 48 + i * 8, 211, {});
        text(ctx, 'HI ' + hi, 248, 208, '#20ff20', 1, 'right');
        if (subT > 0) text(ctx, sub, W / 2, 216, g.col || '#ff2020', 1, 'center');
        else if (g.msgT > 0) text(ctx, g.msg, W / 2, 216, '#ffffff', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        let ox = 0, oy = 0;
        if (g.phase === 'exit') {
          const k = (48 - g.phaseT) * 6;
          if (g.exitDir === 'left') ox = k; else if (g.exitDir === 'right') ox = -k; else if (g.exitDir === 'top') oy = k; else oy = -k;
        }
        drawRoom(ctx, ox, oy);
        if (g.phase !== 'exit') drawPlayer(ctx, 0, 0);
        drawHUD(ctx);
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 52, 92, 104, 24);
          text(ctx, 'GAME OVER', W / 2, 98, '#20ff20', 2, 'center');
        }
      }
      // title: a demo room with wandering robots
      let demo = null;
      function renderTitle(ctx) {
        if (!demo) demo = { walls: buildRoom(3, 1, null), t: 0 };
        const col = LEVELS[(titleT >> 8) % LEVELS.length].col;
        ctx.globalAlpha = 0.35; drawWalls(ctx, demo.walls, 0, 0, WALL); ctx.globalAlpha = 1;
        ctx.fillStyle = '#000'; ctx.fillRect(24, 30, 208, 150);
        text(ctx, 'BERZERK', W / 2, 40, '#20ff20', 4, 'center');
        for (let i = 0; i < 7; i++) {
          const r = { x: 50 + i * 26, y: 92, anim: (frame >> 4) & 1, eye: ((frame >> 2) + i) % 8 };
          drawRobot(ctx, r, LEVELS[(i + (titleT >> 7)) % LEVELS.length].col, 0, 0);
        }
        const page = (titleT >> 8) & 1;
        if (page === 0) {
          text(ctx, 'ROBOT         50 POINTS', W / 2, 112, '#ffffff', 1, 'center');
          text(ctx, 'ALL ROBOTS    10 X ROBOTS', W / 2, 124, '#ffffff', 1, 'center');
          text(ctx, 'BEWARE THE ELECTRIFIED WALLS', W / 2, 140, '#2840ff', 1, 'center');
          drawSpr(ctx, OTTO, W / 2 - 50, 157 - Math.abs(Math.sin(frame * 0.12)) * 6, {});
          text(ctx, 'EVIL OTTO', W / 2 + 10, 154, '#ffff20', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', W / 2, 114, '#ffffff', 1, 'center');
          text(ctx, String(hi), W / 2, 126, col, 2, 'center');
          text(ctx, 'HOLD SPACE + ARROW TO SHOOT', W / 2, 148, '#20ff20', 1, 'center');
          text(ctx, 'BONUS LIFE AT 5000', W / 2, 160, '#2840ff', 1, 'center');
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 170, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', W / 2, 170, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', W / 2, 170, blink ? '#ffffff' : '#888888', 1, 'center');
        text(ctx, credStr(), 8, 208, '#888888', 1);
        text(ctx, '\u00a9 1980 STERN', 248, 208, '#888888', 1, 'right');
        if (subT > 0) text(ctx, sub, W / 2, 216, '#ff2020', 1, 'center');
      }
      return { update, render, destroy() { pendingCalls = []; } };
    }
  });
})();
