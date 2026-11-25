// Pepper II (Exidy, 1982) \u2014 from-scratch recreation for the MAME32 Game Room. Procedural art, synthesized sound.
(function () {
  'use strict';
  // ================= Bitmap font (5x7) =================
  const FONT_HEX = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E',
    '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
    '8': '0E11110E11110E', '9': '0E11110F01020C', 'A': '0E11111F111111', 'B': '1E11111E11111E',
    'C': '0E11101010110E', 'D': '1C12111111121C', 'E': '1F10101E10101F', 'F': '1F10101E101010',
    'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E04040404040E', 'J': '0702020202120C',
    'K': '11121418141211', 'L': '1010101010101F', 'M': '111B1515111111', 'N': '11111915131111',
    'O': '0E11111111110E', 'P': '1E11111E101010', 'Q': '0E11111115120D', 'R': '1E11111E141211',
    'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E', 'V': '11111111110A04',
    'W': '1111111515150A', 'X': '11110A040A1111', 'Y': '1111110A040404', 'Z': '1F01020408101F',
    ' ': '00000000000000', '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C',
    ':': '000C0C000C0C00', '/': '00010204081000', '"': '0A0A0000000000', "'": '04040000000000',
    '?': '0E110102040004', '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408',
    ',': '000000000C0408', '=': '00001F001F0000', '>': '08040201020408', '<': '02040810080402',
    '+': '0004041F040400', '*': '0004150E150400', '#': '0A0A1F0A1F0A0A'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // txt(ctx, str, x, y, colour, scale): 8px cells (times scale), bold strokes
  function txt(ctx, s, x, y, col, sc) {
    sc = sc || 1; ctx.fillStyle = col; s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * 8 * sc + c * sc, y + r * sc, sc + 1, sc); }
    }
  }
  const textW = (s, sc) => String(s).length * 8 * (sc || 1) - 2 * (sc || 1);
  function ctxt(ctx, s, cx, y, col, sc) { txt(ctx, s, Math.round(cx - textW(s, sc) / 2), y, col, sc); }
  function rtxt(ctx, s, rx, y, col, sc) { txt(ctx, s, Math.round(rx - textW(s, sc)), y, col, sc); }
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; if (g) for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, Math.round(cy) - 2 + r, 1, 1); } x += 4; }
  }

  // ================= Sprite helpers =================
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flipRows = rows => rows.map(r => r.split('').reverse().join(''));
  const vflipRows = rows => rows.slice().reverse();
  const rotRows = rows => { const h = rows.length, w = rows[0].length, out = []; for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x] || '.'; out.push(s); } return out; }; // clockwise
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = n => Math.floor(Math.random() * n);
  const pick = a => a[irand(a.length)];
  const pad = (n, l) => String(n).padStart(l, '0');

  // ================= Coin-op helper =================
  function makeCoin(api) {
    const A = api.audio; let last = api.credits, flash = 0;
    return {
      tick() { const c = api.credits; if (c > last) A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }); last = c; if (flash > 0) flash--; },
      tryStart() {
        if (api.useCredit()) { last = api.credits; return true; }
        flash = 90; A.tone(98, 0.28, { type: 'square', vol: 0.14 }); A.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 }); return false;
      },
      prompt(ctx, cx, y, T, c1, c2) {
        if (api.credits > 0 && !flash) { if ((T >> 5) & 1) ctxt(ctx, 'PUSH START', cx, y, c1 || '#fff'); }
        else if (flash ? (api.frame >> 2) & 1 : (T >> 5) & 1) ctxt(ctx, 'INSERT COIN', cx, y, flash ? '#ff3030' : (c2 || c1 || '#fff'));
      },
      credit(ctx, x, y, col) { txt(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), x, y, col || '#fff'); }
    };
  }
  const W = 256, H = 256, NX = 6, NY = 5, EXITROW = 2;
  const YS = [36, 84, 132, 180, 228];
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  const MAZES = [
    { xs: [16, 60, 104, 152, 196, 240], rem: ['h,2,2', 'v,1,0', 'v,4,3'], pitch: [[0, 0], [4, 3]], prize: [2, 2], col: '#2050ff', pat: '#60a0ff' },
    { xs: [16, 72, 112, 144, 184, 240], rem: ['v,2,1', 'h,0,2', 'h,4,2'], pitch: [[4, 0], [0, 3]], prize: [1, 1], col: '#c02020', pat: '#ff7050' },
    { xs: [16, 52, 100, 156, 204, 240], rem: ['h,1,1', 'h,3,3', 'v,3,2'], pitch: [[0, 1], [4, 2]], prize: [2, 3], col: '#108040', pat: '#40e080' },
    { xs: [16, 56, 96, 160, 200, 240], rem: ['v,1,1', 'v,4,1', 'h,2,3', 'h,2,1'], pitch: [[1, 0], [3, 3]], prize: [2, 2], col: '#8020c0', pat: '#d080ff' }
  ];
  const ANGEL_A = ['...yyyyy...', '...........', '....sss....', 'ww..sss..ww', 'www.www.www', '.wwwwwwwww.', '..wwwwwww..', '...wwwww...', '...wwwww...', '...ww.ww...', '...s...s...'];
  const ANGEL_B = ['...yyyyy...', '...........', 'w...sss...w', 'ww..sss..ww', '.wwwwwwwww.', '..wwwwwww..', '...wwwww...', '...wwwww...', '...wwwww...', '...ww.ww...', '...s...s...'];
  const DEVIL_A = ['.r.......r.', '.rr.....rr.', '..rrrrrrr..', '..ryrrryr..', '..rrrrrrr..', '...rkkkr...', '.rrrrrrrrr.', 'r.rrrrrrr.r', '..rrrrrrr..', '..rr...rr..', '.rr.....rr.'];
  const DEVIL_B = ['.r.......r.', '.rr.....rr.', '..rrrrrrr..', '..ryrrryr..', '..rrrrrrr..', '...rkkkr...', 'rrrrrrrrrrr', '..rrrrrrr..', '..rrrrrrr..', '...rr.rr...', '..rr...rr..'];
  const FORK = ['p.p.p', 'p.p.p', 'ppppp', '..p..', '..p..', '..p..', '..p..', '..p..'];
  const PEPPER = ['....g..', '...gg..', '..rrr..', '.rrwrr.', '.rrrrr.', 'rrrrr..', 'rrrr...', '.rr....'];
  const EYES = ['.www..www.', 'wwwwwwwwww', 'wwkkwwwkkw', 'wwkkwwwkkw', 'wwwwwwwwww', '.www..www.'];

  ArcadeRegistry.register({
    id: 'pepper2', title: 'Pepper II', year: 1982, maker: 'Exidy',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move along the lines (zip every edge of a box to fill it) \u00b7 side exits lead to the next maze \u00b7 Enter/Space: start',
    marquee: { bg: '#100010', fg: '#ff4040', accent: '#ffffff' },
    create(api) {
      const A0 = api.audio, coin = makeCoin(api); let demo = false;
      const A = { tone: (...a) => { if (!demo) A0.tone(...a); }, noise: (...a) => { if (!demo) A0.noise(...a); }, melody: (...a) => demo ? 0 : A0.melody(...a) };
      const ANG = [sprite(ANGEL_A, { y: '#ffe040', s: '#ffc090', w: '#ffffff' }), sprite(ANGEL_B, { y: '#ffe040', s: '#ffc090', w: '#ffffff' })];
      const ANGP = [sprite(ANGEL_A, { y: '#ffe040', s: '#ffc090', w: '#ff5050' }), sprite(ANGEL_B, { y: '#ffe040', s: '#ffc090', w: '#ff5050' })];
      const DEV = [sprite(DEVIL_A, { r: '#ff2020', y: '#ffff00', k: '#000' }), sprite(DEVIL_B, { r: '#ff2020', y: '#ffff00', k: '#000' })];
      const DEVS = [sprite(DEVIL_A, { r: '#3050ff', y: '#ffffff', k: '#fff' }), sprite(DEVIL_B, { r: '#3050ff', y: '#ffffff', k: '#fff' })];
      const DEVW = [sprite(DEVIL_A, { r: '#ffffff', y: '#ff0000', k: '#f00' }), sprite(DEVIL_B, { r: '#ffffff', y: '#ff0000', k: '#f00' })];
      const FORKS = sprite(FORK, { p: '#ffe040' }), PEP = sprite(PEPPER, { g: '#30d030', r: '#ff2020', w: '#ffa0a0' });
      const EYE = sprite(EYES, { w: '#ffffff', k: '#2020ff' });

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, titleT = 0, score = 0, lives = 3, level = 1, extraGiven = false;
      let mazes, cur = 0, ang, devils, eyes, powerT = 0, combo = 0, eyesT = 0, popups = [], sndT = 0, clearedNow = 0, zipSnd = 0;

      // ---------------- maze graph ----------------
      function buildMaze(k) {
        const def = MAZES[k], Hs = [], Vs = [], Hz = [], Vz = [];
        for (let j = 0; j < NY; j++) { Hs[j] = []; Hz[j] = []; for (let i = 0; i < NX - 1; i++) { Hs[j][i] = 1; Hz[j][i] = 0; } }
        for (let j = 0; j < NY - 1; j++) { Vs[j] = []; Vz[j] = []; for (let i = 0; i < NX; i++) { Vs[j][i] = 1; Vz[j][i] = 0; } }
        for (const r of def.rem) { const p = r.split(','); if (p[0] === 'h') Hs[+p[2]][+p[1]] = 0; else Vs[+p[2]][+p[1]] = 0; }
        // faces: union cells across removed segments
        const CW = NX - 1, CH = NY - 1, par = []; for (let i = 0; i < CW * CH; i++) par[i] = i;
        const find = a => par[a] === a ? a : (par[a] = find(par[a]));
        for (let j = 1; j < NY - 1; j++) for (let i = 0; i < CW; i++) if (!Hs[j][i]) par[find((j - 1) * CW + i)] = find(j * CW + i);
        for (let j = 0; j < CH; j++) for (let i = 1; i < NX - 1; i++) if (!Vs[j][i]) par[find(j * CW + i - 1)] = find(j * CW + i);
        const fmap = {}, faces = [];
        for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) {
          const r = find(j * CW + i); if (!(r in fmap)) { fmap[r] = faces.length; faces.push({ cells: [], segs: [], filled: false, kind: null, flash: 0 }); }
          faces[fmap[r]].cells.push([i, j]);
        }
        const faceOf = (i, j) => fmap[find(j * CW + i)];
        for (const f of faces) {
          const set = {};
          for (const [i, j] of f.cells) {
            const cand = [['h', i, j], ['h', i, j + 1], ['v', i, j], ['v', i + 1, j]];
            for (const s of cand) { const pres = s[0] === 'h' ? Hs[s[2]][s[1]] : Vs[s[2]][s[1]]; if (pres) set[s.join(',')] = s; }
          }
          f.segs = Object.values(set);
        }
        def.pitch.forEach(([i, j]) => { faces[faceOf(i, j)].kind = 'pitch'; });
        faces[faceOf(def.prize[0], def.prize[1])].kind = faces[faceOf(def.prize[0], def.prize[1])].kind || 'prize';
        return { def, xs: def.xs, Hs, Vs, Hz, Vz, faces, done: false };
      }
      const M = () => mazes[cur];
      function segPresent(m, i, j, d) {
        if (d === 1) return i > 0 && m.Hs[j][i - 1]; if (d === 3) return i < NX - 1 && m.Hs[j][i];
        if (d === 0) return j > 0 && m.Vs[j - 1][i]; return j < NY - 1 && m.Vs[j][i];
      }
      function segKey(i, j, d) { // normalised [type, i, j]
        if (d === 1) return ['h', i - 1, j]; if (d === 3) return ['h', i, j];
        if (d === 0) return ['v', i, j - 1]; return ['v', i, j];
      }
      const zipped = (m, s) => s[0] === 'h' ? m.Hz[s[2]][s[1]] : m.Vz[s[2]][s[1]];
      function setZip(m, s, v) { if (s[0] === 'h') m.Hz[s[2]][s[1]] = v; else m.Vz[s[2]][s[1]] = v; }
      const facesOfSeg = (m, s) => m.faces.filter(f => f.segs.some(t => t[0] === s[0] && t[1] === s[1] && t[2] === s[2]));
      function nodeAt(e) { const i = M().xs.indexOf(e.x), j = YS.indexOf(e.y); return i >= 0 && j >= 0 ? [i, j] : null; }
      const canExit = (i, j, d) => j === EXITROW && ((i === 0 && d === 1) || (i === NX - 1 && d === 3));

      // ---------------- game flow ----------------
      const P = () => ({ dev: Math.min(5, 2 + Math.floor(level / 2)), spd: Math.min(1.1, 0.68 + level * 0.06), chase: Math.min(0.9, 0.55 + level * 0.06), power: Math.max(150, 420 - level * 40), eyes: Math.max(600, 1500 - level * 150) });
      function newRound() { mazes = [0, 1, 2, 3].map(buildMaze); cur = 0; }
      function placeActors(fromExit) {
        const m = M();
        if (!fromExit) ang = { x: m.xs[2], y: YS[4], dir: 3, want: -1, from: [2, 4], face: 0, anim: 0, acc: 0, moving: false };
        devils = []; const p = P();
        for (let i = 0; i < p.dev; i++) devils.push({ x: m.xs[3], y: YS[0], dir: 2, acc: 0, mode: 'wait', t: 40 + i * 80, anim: 0 });
        eyes = null; eyesT = p.eyes; powerT = 0;
      }
      function startGame(isDemo) {
        demo = !!isDemo; score = 0; lives = 3; level = 1; extraGiven = false; popups = [];
        newRound(); placeActors(false); state = 'ready'; T = 0;
        A.melody([[392, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .3]], { type: 'square', vol: 0.1 });
      }
      function addScore(n) {
        if (demo) return; score += n;
        if (!extraGiven && score >= 30000) { extraGiven = true; lives++; A.melody([[1046, .08], [1318, .08], [1568, .08], [2093, .2]], { vol: 0.1 }); }
        if (score > hi) hi = score;
      }

      // ---------------- movement ----------------
      function angelStep() {
        const a = ang, m = M();
        if (a.want >= 0 && a.want === (a.dir + 2) % 4) a.dir = a.want;
        const n = nodeAt(a);
        if (n) {
          const [i, j] = n;
          if (a.from && (a.from[0] !== i || a.from[1] !== j)) arriveZip(a.from, n);
          a.from = n;
          if (a.want < 0) { a.moving = false; return; }
          if (segPresent(m, i, j, a.want) || canExit(i, j, a.want)) a.dir = a.want;
          if (!segPresent(m, i, j, a.dir) && !canExit(i, j, a.dir)) { a.moving = false; return; }
        } else if (a.want < 0) { a.moving = false; return; }
        a.x += DX[a.dir]; a.y += DY[a.dir]; a.moving = true; a.anim++;
        if (DX[a.dir]) a.face = DX[a.dir] < 0 ? 1 : 0;
        // side exits into the neighbouring maze
        if (a.x < 2 || a.x > W - 2) {
          const left = a.x < 2; cur = (cur + (left ? 3 : 1)) % 4;
          a.x = left ? W - 3 : 3; a.from = null; placeActors(true); state = 'switch'; T = 0;
          A.tone(300, 0.3, { type: 'triangle', vol: 0.12, slideTo: 900 });
        }
        if (a.y === YS[EXITROW] && (a.x < M().xs[0] || a.x > M().xs[NX - 1])) a.from = null;
      }
      function arriveZip(fromN, toN) {
        const m = M(), [i0, j0] = fromN, [i1, j1] = toN;
        if (Math.abs(i0 - i1) + Math.abs(j0 - j1) !== 1) return;
        const d = i1 < i0 ? 1 : i1 > i0 ? 3 : j1 < j0 ? 0 : 2, s = segKey(i0, j0, d);
        if (zipped(m, s)) return;
        setZip(m, s, 1); addScore(10);
        A.noise(0.08, { vol: 0.1, freq: 4000, type: 'highpass' }); A.tone(1200 + (zipSnd++ % 4) * 150, 0.05, { type: 'square', vol: 0.05 });
        for (const f of facesOfSeg(m, s)) if (!f.filled && f.segs.every(t => zipped(m, t))) fillFace(f);
      }
      function fillFace(f) {
        f.filled = true; f.flash = 30; const m = M();
        const cx = f.cells.reduce((s, c) => s + (m.xs[c[0]] + m.xs[c[0] + 1]) / 2, 0) / f.cells.length;
        const cy = f.cells.reduce((s, c) => s + (YS[c[1]] + YS[c[1] + 1]) / 2, 0) / f.cells.length;
        let v = 50 * f.cells.length;
        if (f.kind === 'pitch') { powerT = P().power; combo = 0; A.melody([[523, .06], [784, .06], [1046, .06], [1568, .15]], { type: 'sawtooth', vol: 0.1 }); for (const d of devils) if (d.mode === 'run') d.dir = (d.dir + 2) % 4; }
        else if (f.kind === 'prize') { v += 500 * Math.min(level, 6); A.melody([[1318, .06], [1568, .06], [2093, .12]], { type: 'square', vol: 0.1 }); }
        else A.melody([[659, .05], [880, .05], [1046, .1]], { type: 'square', vol: 0.09 });
        addScore(v); popups.push({ x: cx, y: cy, v, t: 70 });
        if (m.faces.every(ff => ff.filled)) { m.done = true; addScore(1000 * Math.min(level, 5)); popups.push({ x: W / 2, y: YS[2] - 14, v: 1000 * Math.min(level, 5), t: 120 }); state = 'mazeclear'; T = 0; A.melody([[523, .08], [659, .08], [784, .08], [1046, .08], [1318, .08], [1046, .08], [1318, .3]], { type: 'square', vol: 0.12 }); }
      }
      function enemyStep(e, mode) { // mode: 'chase' | 'flee' | 'wander'
        const m = M(), n = nodeAt(e);
        if (n) {
          const [i, j] = n, back = (e.dir + 2) % 4, opts = [];
          if (e.from && (e.from[0] !== i || e.from[1] !== j) && e.isEyes) eyesArrive(e.from, n);
          e.from = n;
          for (let d = 0; d < 4; d++) if (d !== back && segPresent(m, i, j, d)) opts.push(d);
          if (!opts.length) e.dir = back;
          else if (mode !== 'wander' && Math.random() < (mode === 'flee' ? 0.85 : P().chase)) {
            let best = mode === 'flee' ? -1 : 1e9;
            for (const d of opts) {
              const tx = m.xs[i + DX[d]], ty = YS[j + DY[d]], dd = Math.hypot(tx - ang.x, ty - ang.y);
              if (mode === 'flee' ? dd > best : dd < best) { best = dd; e.dir = d; }
            }
          } else e.dir = pick(opts);
        }
        e.x += DX[e.dir]; e.y += DY[e.dir]; e.anim++;
      }
      function eyesArrive(fromN, toN) {
        const m = M(), [i0, j0] = fromN, [i1, j1] = toN;
        const d = i1 < i0 ? 1 : i1 > i0 ? 3 : j1 < j0 ? 0 : 2, s = segKey(i0, j0, d);
        if (zipped(m, s) && facesOfSeg(m, s).some(f => !f.filled)) { setZip(m, s, 0); A.tone(900, 0.15, { type: 'sawtooth', vol: 0.06, slideTo: 200 }); }
      }

      // ---------------- play ----------------
      function updatePlay() {
        const p = P();
        if (demo) demoSteer();
        else {
          let w = -1; for (let d = 0; d < 4; d++) if (api.key(KEYS[d])) w = d;
          for (let d = 0; d < 4; d++) if (api.pressed(KEYS[d])) w = d;
          if (w >= 0 && ang.want >= 0 && api.key(KEYS[ang.want]) && !api.pressed(KEYS[w])) w = ang.want;
          ang.want = w;
        }
        ang.acc += powerT > 0 ? 1.1 : 1.0;
        while (ang.acc >= 1 && state === 'play') { ang.acc -= 1; angelStep(); }
        if (state !== 'play') return;
        if (powerT > 0) powerT--;
        const ramp = Math.min(0.12, T / 60 * 0.002);
        for (const d of devils) {
          if (d.mode !== 'run') { if (--d.t <= 0) { d.mode = 'run'; d.x = M().xs[3]; d.y = YS[0]; d.dir = 2; d.from = null; A.tone(200, 0.15, { type: 'sawtooth', vol: 0.06, slideTo: 400 }); } continue; }
          d.acc += powerT > 0 ? p.spd * 0.7 : p.spd + ramp;
          while (d.acc >= 1) { d.acc -= 1; enemyStep(d, powerT > 0 ? 'flee' : 'chase'); }
        }
        if (!eyes) { if (--eyesT <= 0) { eyes = { x: M().xs[0], y: YS[0], dir: 3, acc: 0, anim: 0, isEyes: true, from: null }; A.melody([[300, .1], [250, .1], [300, .1]], { type: 'triangle', vol: 0.12 }); } }
        else { eyes.acc += 0.6; while (eyes.acc >= 1) { eyes.acc -= 1; enemyStep(eyes, 'wander'); } }
        // collisions
        for (const d of devils) {
          if (d.mode !== 'run' || Math.abs(d.x - ang.x) > 7 || Math.abs(d.y - ang.y) > 7) continue;
          if (powerT > 0) {
            const v = 200 << Math.min(combo, 3); combo++; addScore(v); popups.push({ x: d.x, y: d.y, v, t: 60 });
            d.mode = 'wait'; d.t = 200; A.tone(1000, 0.25, { type: 'square', vol: 0.12, slideTo: 150 });
          } else { die(); return; }
        }
        if (eyes && powerT > 0 && Math.abs(eyes.x - ang.x) < 8 && Math.abs(eyes.y - ang.y) < 7) {
          addScore(500); popups.push({ x: eyes.x, y: eyes.y, v: 500, t: 60 }); eyes = null; eyesT = p.eyes; A.tone(1500, 0.3, { type: 'square', vol: 0.1, slideTo: 300 });
        }
        if (--sndT <= 0) {
          sndT = powerT > 0 ? 10 : 16;
          if (powerT > 0) A.tone(300, 0.12, { type: 'sawtooth', vol: 0.04, slideTo: 600 });
          else A.tone((T >> 4) & 1 ? 196 : 247, 0.12, { type: 'triangle', vol: 0.06 });
        }
      }
      // attract-mode autopilot: prefer unzipped edges, shy away from devils
      function demoSteer() {
        const n = nodeAt(ang); if (!n) { if (ang.want < 0) ang.want = ang.dir; return; }
        const m = M(), [i, j] = n; let best = -1e9, bd = ang.dir;
        for (let d = 0; d < 4; d++) {
          if (!segPresent(m, i, j, d)) continue;
          const tx = m.xs[i + DX[d]], ty = YS[j + DY[d]];
          let sc = (zipped(m, segKey(i, j, d)) ? 0 : 12) + Math.random() * 8 - (d === (ang.dir + 2) % 4 ? 6 : 0);
          for (const dv of devils) if (dv.mode === 'run') { const dd = Math.hypot(dv.x - tx, dv.y - ty); if (dd < 60) sc -= (60 - dd) * (powerT > 0 ? -0.3 : 1); }
          if (sc > best) { best = sc; bd = d; }
        }
        ang.want = bd;
      }
      function die() {
        state = 'dying'; T = 0;
        A.melody([[784, .12], [740, .12], [698, .12], [659, .12], [622, .12], [587, .12], [554, .12], [523, .35]], { type: 'square', vol: 0.1 });
      }
      function nextIncomplete() { for (let k = 1; k <= 4; k++) { const n = (cur + k) % 4; if (!mazes[n].done) return n; } return -1; }

      // ---------------- update ----------------
      function update() {
        T++; coin.tick();
        for (const pp of popups) pp.t--; popups = popups.filter(pp => pp.t > 0);
        if (mazes) for (const f of M().faces) if (f.flash > 0) f.flash--;
        switch (state) {
          case 'title':
            titleT++;
            if (api.anyPressed('Enter', 'Space') && coin.tryStart()) startGame(false);
            else if (titleT > 720) startGame(true);
            break;
          case 'ready': if (demo && api.anyPressed('Enter', 'Space')) { toTitle(); break; } if (T >= (demo ? 50 : 120)) { state = 'play'; T = 0; } break;
          case 'switch': if (T >= 30) { state = 'play'; } break;
          case 'play': if (demo && (api.anyPressed('Enter', 'Space') || T > 1800)) { toTitle(); break; } updatePlay(); break;
          case 'dying':
            if (demo && T >= 110) { toTitle(); break; }
            if (T >= 140) {
              const respawn = () => { placeActors(false); state = 'ready'; T = 0; };
              const over = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'mazeclear':
            if (demo && T >= 100) { toTitle(); break; }
            if (T >= 150) {
              const n = nextIncomplete();
              if (n < 0) { state = 'roundclear'; T = 0; A.melody([[523, .1], [659, .1], [784, .1], [1046, .1], [784, .1], [1046, .1], [1318, .4]], { type: 'square', vol: 0.12 }); }
              else { cur = n; placeActors(false); state = 'ready'; T = 0; }
            }
            break;
          case 'roundclear':
            if (T >= 200) { level++; newRound(); placeActors(false); state = 'ready'; T = 0; }
            break;
          case 'gameover':
            if (T >= 200 || (T > 60 && api.anyPressed('Enter'))) toTitle();
            break;
        }
      }
      function toTitle() { state = 'title'; T = 0; titleT = 0; demo = false; }

      // ---------------- render ----------------
      function drawZip(ctx, x0, y0, x1, y1, horiz) {
        ctx.fillStyle = '#e8e8e8';
        if (horiz) { const a = Math.min(x0, x1), b = Math.max(x0, x1); ctx.fillRect(a, y0 - 1, b - a + 1, 2); ctx.fillStyle = '#ffd040'; for (let x = a; x <= b; x += 3) ctx.fillRect(x, (x / 3 & 1) ? y0 - 3 : y0 + 1, 2, 2); }
        else { const a = Math.min(y0, y1), b = Math.max(y0, y1); ctx.fillRect(x0 - 1, a, 2, b - a + 1); ctx.fillStyle = '#ffd040'; for (let y = a; y <= b; y += 3) ctx.fillRect((y / 3 & 1) ? x0 - 3 : x0 + 1, y, 2, 2); }
      }
      function drawMaze(ctx, m, flashAll) {
        const xs = m.xs;
        for (const f of m.faces) {
          if (!f.filled && !(flashAll)) {
            // contents
            if (f.kind) {
              const [i, j] = f.cells[0], cx = (xs[i] + xs[i + 1]) / 2, cy = (YS[j] + YS[j + 1]) / 2;
              if (f.kind === 'pitch') ctx.drawImage(FORKS, Math.round(cx - 2), Math.round(cy - 4)); else ctx.drawImage(PEP, Math.round(cx - 3), Math.round(cy - 4));
            }
            continue;
          }
          const col = f.flash > 0 && (f.flash >> 2) & 1 ? '#ffffff' : m.def.col;
          for (const [i, j] of f.cells) {
            const x = xs[i], y = YS[j], w = xs[i + 1] - x, h = YS[j + 1] - y;
            ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, w - 3, h - 3);
            ctx.fillStyle = m.def.pat;
            for (let yy = y + 5; yy < y + h - 3; yy += 6) for (let xx = x + 5 + ((yy / 6) & 1) * 3; xx < x + w - 3; xx += 6) ctx.fillRect(xx, yy, 2, 2);
          }
        }
        // segments
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX - 1; i++) {
          if (!m.Hs[j][i]) continue;
          if (m.Hz[j][i]) drawZip(ctx, xs[i], YS[j], xs[i + 1], YS[j], true);
          else { ctx.fillStyle = '#7070a0'; for (let x = xs[i]; x <= xs[i + 1]; x += 2) ctx.fillRect(x, YS[j], 1, 1); }
        }
        for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX; i++) {
          if (!m.Vs[j][i]) continue;
          if (m.Vz[j][i]) drawZip(ctx, xs[i], YS[j], xs[i], YS[j + 1], false);
          else { ctx.fillStyle = '#7070a0'; for (let y = YS[j]; y <= YS[j + 1]; y += 2) ctx.fillRect(xs[i], y, 1, 1); }
        }
        // exits
        ctx.fillStyle = '#00ffff';
        for (let x = 0; x < xs[0]; x += 2) ctx.fillRect(x, YS[EXITROW], 1, 1);
        for (let x = xs[NX - 1] + 2; x < W; x += 2) ctx.fillRect(x, YS[EXITROW], 1, 1);
        txt(ctx, (((cur + 3) % 4) + 1) + '', 2, YS[EXITROW] - 12, '#00ffff'); txt(ctx, (((cur + 1) % 4) + 1) + '', W - 9, YS[EXITROW] - 12, '#00ffff');
        // nodes
        ctx.fillStyle = '#b0b0d0';
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) ctx.fillRect(xs[i] - 1, YS[j] - 1, 2, 2);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawHUD(ctx);
        if (state === 'title') { renderTitle(ctx); return; }
        const m = M();
        drawMaze(ctx, m, false);
        // partial zip behind the angel
        if (ang.from && (state === 'play' || state === 'switch')) {
          const fx = m.xs[ang.from[0]], fy = YS[ang.from[1]];
          if (fx !== undefined && (fx !== ang.x || fy !== ang.y) && (fx === ang.x || fy === ang.y)) {
            const s = segKey(ang.from[0], ang.from[1], ang.y === fy ? (ang.x < fx ? 1 : 3) : (ang.y < fy ? 0 : 2));
            if (!zipped(m, s)) drawZip(ctx, fx, fy, ang.x, ang.y, ang.y === fy);
          }
        }
        if (eyes) ctx.drawImage(EYE, eyes.x - 5, eyes.y - 3 + (((eyes.anim >> 4) & 1) ? 1 : 0));
        for (const d of devils) {
          if (d.mode !== 'run') continue; const fr = (d.anim >> 3) & 1;
          const spr = powerT > 0 ? (powerT < 90 && (powerT >> 3) & 1 ? DEVW[fr] : DEVS[fr]) : DEV[fr];
          ctx.drawImage(spr, d.x - 5, d.y - 5);
        }
        if (state === 'dying') {
          const fr = (T >> 2) & 1;
          if (T < 90) { ctx.save(); ctx.translate(ang.x, ang.y); ctx.rotate(T * 0.3); ctx.drawImage(ANG[fr], -5, -5); ctx.restore(); }
          else if (T < 130) { ctx.globalAlpha = 1 - (T - 90) / 40; ctx.drawImage(ANG[0], ang.x - 5, ang.y - 5 - (T - 90)); ctx.globalAlpha = 1; }
        } else if (state !== 'gameover') {
          const fr = ang.moving ? (ang.anim >> 3) & 1 : 0;
          ctx.drawImage((powerT > 0 ? ANGP : ANG)[fr], ang.x - 5, ang.y - 5);
          if (powerT > 0) ctx.drawImage(FORKS, ang.x + (ang.face ? -9 : 5), ang.y - 4);
        }
        for (const pp of popups) tinyNum(ctx, pp.v, pp.x, pp.y, '#ffff60');
        if (demo && (api.frame >> 5) & 1) ctxt(ctx, 'DEMO', W / 2, YS[3] - 4, '#ffffff');
        if (state === 'ready') ctxt(ctx, 'MAZE ' + (cur + 1) + '  READY', W / 2, YS[2] - 4 - 12, '#ffff40');
        if (state === 'mazeclear' && (T >> 3) & 1) ctxt(ctx, 'MAZE CLEARED!', W / 2, YS[2] + 18, '#ffffff');
        if (state === 'roundclear') { ctxt(ctx, 'ALL 4 MAZES CLEARED', W / 2, YS[2] - 16, '#ffff40'); ctxt(ctx, 'ROUND ' + (level + 1), W / 2, YS[2] + 8, '#00ffff'); }
        if (state === 'gameover') ctxt(ctx, 'GAME OVER', W / 2, YS[2] - 4, '#ff3030');
        // bottom
        for (let i = 0; i < Math.min(lives - 1, 6); i++) ctx.drawImage(ANG[0], 4 + i * 13, H - 13);
        rtxt(ctx, 'ROUND ' + level, W - 4, H - 10, '#c0c0c0');
      }
      function drawHUD(ctx) {
        txt(ctx, 'SCORE', 8, 2, '#ff4040'); txt(ctx, pad(score, 6), 8, 12, '#ffffff');
        ctxt(ctx, 'HIGH', W / 2, 2, '#ff4040'); ctxt(ctx, pad(hi, 6), W / 2, 12, '#ffffff');
        if (mazes && state !== 'title') for (let k = 0; k < 4; k++) {
          const x = 196 + k * 14, y = 4;
          ctx.fillStyle = mazes[k].done ? MAZES[k].col : '#202030'; ctx.fillRect(x, y, 11, 11);
          ctx.strokeStyle = k === cur ? '#ffff40' : '#606080'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, 12, 12);
          txt(ctx, String(k + 1), x + 3, y + 2, '#ffffff');
        }
      }
      function renderTitle(ctx) {
        const t = titleT;
        txt(ctx, 'PEPPER', Math.round(W / 2 - textW('PEPPER II', 3) / 2), 36, '#ff3030', 3);
        txt(ctx, 'II', Math.round(W / 2 - textW('PEPPER II', 3) / 2 + 7 * 24), 36, '#ffffff', 3);
        // animated zipper box
        const bx = 88, by = 72, bw = 80, bh = 36, per = 2 * (bw + bh), prog = (t * 1.2) % (per + 60);
        ctx.fillStyle = '#7070a0'; ctx.strokeStyle = '#7070a0'; ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
        if (prog >= per) { ctx.fillStyle = '#2050ff'; ctx.fillRect(bx + 2, by + 2, bw - 3, bh - 3); }
        const L = Math.min(prog, per); let px = bx, py = by;
        const pts = [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx, by]]; let rem = L;
        for (let k = 0; k < 4 && rem > 0; k++) {
          const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], len = Math.abs(x1 - x0) + Math.abs(y1 - y0), u = Math.min(rem, len);
          const ex = x0 + Math.sign(x1 - x0) * u, ey = y0 + Math.sign(y1 - y0) * u; drawZip(ctx, x0, y0, ex, ey, y0 === y1); px = ex; py = ey; rem -= u;
        }
        if (prog < per) ctx.drawImage(ANG[(t >> 3) & 1], px - 5, py - 5);
        const rows = [
          [ANG[(t >> 3) & 1], 'ANGEL - ZIP THE BOXES', '#ffffff'], [DEV[(t >> 3) & 1], 'DEVILS', '#ff3030'],
          [FORKS, 'PITCHFORK - CHASE DEVILS', '#ffe040'], [EYE, 'ROAMING EYES UNZIP', '#8080ff'], [PEP, 'PRIZE BOX', '#ff8080']
        ];
        rows.forEach((r, i) => { if (t > 20 + i * 20) { ctx.drawImage(r[0], 40, 124 + i * 16); txt(ctx, r[1], 60, 126 + i * 16, r[2]); } });
        txt(ctx, 'ZIP 10  BOX 50  DEVIL 200-1600', 12, 210 - 4, '#00ffff');
        coin.prompt(ctx, W / 2, 220, T, '#ffff40');
        ctxt(ctx, '\u00a9 1982 EXIDY', W / 2, 233, '#ff60c0');
        coin.credit(ctx, 4, 246, '#a0a0a0');
      }

      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
