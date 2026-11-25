// Dig Dug II (Namco, 1985) -- from-scratch recreation for the MAME32 Game Room.
// Taizo Hori jackhammers fault lines on an island seen from above; sink chunks of land under Pookas and Fygars.
(function () {
  'use strict';
  const W = 224, H = 288;
  // ================= Bitmap font (5x7 in 8px cells) =================
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
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '=': '00001F001F0000', '>': '08040201020408', '<': '02040810080402', '*': '0004150E150400', '+': '0004041F040400'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function txt(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    if (align === 'c') x = Math.round(x - s.length * 4 * sc); else if (align === 'r') x = x - s.length * 8 * sc;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 8 + c) * sc, y + r * sc, sc, sc); }
    }
  }
  // ================= Sprite helpers =================
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flipH = rows => rows.map(r => r.split('').reverse().join(''));
  function rotUp(rows) { const n = rows.length, out = []; for (let y = 0; y < n; y++) { let s = ''; for (let x = 0; x < n; x++) s += rows[n - 1 - x][y]; out.push(s); } return out; }
  function rotDown(rows) { const n = rows.length, out = []; for (let y = 0; y < n; y++) { let s = ''; for (let x = 0; x < n; x++) s += rows[x][n - 1 - y]; out.push(s); } return out; }

  const TAIZO = [[
    '...bbbbb....',
    '..bwwwwwb...',
    '..bwsssbb...',
    '..bwsskks...',
    '...bsssss...',
    '..wwbbww....',
    '.wwwbbwwwrr.',
    '.sswbbwwss..',
    '..wwbbww....',
    '..bbwwbb....',
    '..bb..bb....',
    '.bbb..bbb...'], [
    '...bbbbb....',
    '..bwwwwwb...',
    '..bwsssbb...',
    '..bwsskks...',
    '...bsssss...',
    '..wwbbww....',
    '.wwwbbwwwrr.',
    '.sswbbwwss..',
    '..wwbbww....',
    '...bwwb.....',
    '...bbbb.....',
    '..bbbbbb....']];
  const TAIZO_PAL = { b: '#2050ff', w: '#ffffff', s: '#ffc090', k: '#000000', r: '#ff3030' };
  const POOKA = [[
    '...rrrrrr...',
    '..rrrrrrrr..',
    '.rrrrrrrrrr.',
    '.ryyyyyyyyr.',
    'rywwkyywwkyr',
    'rywwkyywwkyr',
    '.ryyyyyyyyr.',
    '.rrrrrrrrrr.',
    '.rrrrrrrrrr.',
    '..rrrrrrrr..',
    '..yy....yy..',
    '.yyy....yyy.'], [
    '............',
    '...rrrrrr...',
    '..rrrrrrrr..',
    '.rrrrrrrrrr.',
    '.ryyyyyyyyr.',
    'rywwkyywwkyr',
    'rywwkyywwkyr',
    '.ryyyyyyyyr.',
    '.rrrrrrrrrr.',
    '..rrrrrrrr..',
    '...yy..yy...',
    '..yyy..yyy..']];
  const POOKA_PAL = { r: '#ff2020', y: '#ffe040', w: '#ffffff', k: '#000000' };
  const FYGAR = [[
    '......gggg..',
    '.....ggwkgg.',
    '....gggggggg',
    '..gggggggrr.',
    '.gwggggggg..',
    'gwwgggggg...',
    '.gwgggggg...',
    '..gggggggg..',
    '..ggggggggg.',
    '...gg...gg..',
    '..ggg..ggg..',
    '............'], [
    '......gggg..',
    '.....ggwkgg.',
    '....gggggggg',
    '..gggggggrr.',
    '.gwggggggg..',
    'gwwgggggg...',
    '.gwgggggg...',
    '..gggggggg..',
    '..ggggggggg.',
    '....gg.gg...',
    '...ggg.ggg..',
    '............']];
  const FYGAR_PAL = { g: '#20d020', w: '#ffffff', k: '#000000', r: '#ff4020' };
  const VEG_ART = [
    [['....gg....', '...gggg...', '....gg....', '..oooooo..', '.oooooooo.', '.oooooooo.', '..oooooo..', '...oooo...', '....oo....', '..........'], { g: '#20c020', o: '#ff8020' }],
    [['....g.....', '...ggg....', '..rrrrrr..', '.rrrrrrrr.', '.rrwrrrrr.', '.rrrrrrrr.', '.rrrrrrrr.', '..rrrrrr..', '...rrrr...', '..........'], { g: '#20c020', r: '#ff2020', w: '#ffffff' }],
    [['...gggg...', '..gggggg..', '...gggg...', '...wwww...', '..wwwwww..', '..wwwwww..', '...wwww...', '....ww....', '..........', '..........'], { g: '#20c020', w: '#f0f0e0' }],
    [['....gg....', '...g..g...', '..pppppp..', '.pppppppp.', '.pppwpppp.', '.pppppppp.', '..pppppp..', '...pppp...', '..........', '..........'], { g: '#20c020', p: '#c040ff', w: '#ffffff' }]
  ];
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];

  ArcadeRegistry.register({
    id: 'digdug2', title: 'Dig Dug II', year: 1985, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: pump \u00b7 X: jackhammer at a stake \u00b7 Enter: start',
    marquee: { bg: '#0838b0', fg: '#ffffff', accent: '#ff3030' },
    create(api) {
      const A = api.audio;
      const COLS = 28, ROWS = 30, FY = 24;
      // ---- sprites ----
      function dirSet(art, pal) { return art.map(r => [sprite(rotUp(r), pal), sprite(flipH(r), pal), sprite(rotDown(r), pal), sprite(r, pal)]); }
      const SP_T = dirSet(TAIZO, TAIZO_PAL);
      const SP_P = POOKA.map(r => [sprite(flipH(r), POOKA_PAL), sprite(r, POOKA_PAL)]);
      const SP_F = FYGAR.map(r => [sprite(flipH(r), FYGAR_PAL), sprite(r, FYGAR_PAL)]);
      const SP_FW = FYGAR.map(r => [sprite(flipH(r), { ...FYGAR_PAL, g: '#ffffff' }), sprite(r, { ...FYGAR_PAL, g: '#ffffff' })]);
      const SP_V = VEG_ART.map(v => sprite(v[0], v[1]));
      const VEG_PTS = [400, 600, 800, 1000, 2000, 3000, 4000, 5000];

      // ---- rng ----
      let seed = 1;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      const grid = (r, c, v) => Array.from({ length: r }, () => new Array(c).fill(v));

      // ---- state ----
      let state = 'title', tmr = 0, score = 0, hi = api.getHiScore(20000), lives = 2, round = 1, nextExtra = 20000;
      let coinFlash = 0, attractPage = 0, attractT = 0;
      let land, faultH, faultV, crackH, crackV, stake, stakeUsed;
      let sinking = [], crackQ = [], crackPending = false, enemies = [], player = null, harp = null, veg = null, popups = [];
      let killed = 0, vegSpawned = false, sinkChain = 0, deathCause = '', totalEnemies = 0;

      const isLand = (c, r) => r >= 0 && r < ROWS && c >= 0 && c < COLS && land[r][c] === 1;
      const tileOf = (x, y) => [Math.floor(x / 8), Math.floor((y - FY) / 8)];
      const hInner = (c, py) => isLand(c, py - 1) && isLand(c, py);
      const vInner = (px, r) => isLand(px - 1, r) && isLand(px, r);
      const stakeAt = (px, py) => py >= 0 && py <= ROWS && px >= 0 && px <= COLS && stake[py][px];

      function genIsland(n) {
        seed = (n * 7919 + 13) >>> 0; rnd(); rnd();
        land = grid(ROWS, COLS, 0);
        const cx = 14 + (rnd() - 0.5) * 2, cy = 15 + (rnd() - 0.5) * 2;
        const rx = 10.6 + rnd() * 1.6, ry = 11.4 + rnd() * 1.8;
        const a1 = rnd() * 6.28, a2 = rnd() * 6.28, a3 = rnd() * 6.28;
        const k1 = 0.08 + rnd() * 0.08, k2 = 0.04 + rnd() * 0.06, k3 = rnd() * 0.05;
        for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
          const dx = (c + 0.5 - cx) / rx, dy = (r + 0.5 - cy) / ry;
          const d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
          const lim = 1 + k1 * Math.sin(3 * th + a1) + k2 * Math.sin(5 * th + a2) + k3 * Math.sin(7 * th + a3);
          if (d < lim) land[r][c] = 1;
        }
        // small inland lakes on later rounds
        if (n >= 3) {
          const lakes = Math.min(3, (n - 1) >> 1);
          for (let i = 0; i < lakes; i++) {
            const lc = 6 + Math.floor(rnd() * 16), lr = 6 + Math.floor(rnd() * 18);
            if (Math.abs(lc - 14) < 3 && Math.abs(lr - 15) < 3) continue;
            for (let r = lr; r < lr + 2; r++) for (let c = lc; c < lc + 2; c++) if (land[r] && land[r][c]) land[r][c] = 0;
          }
        }
        keepMainland();
        stake = grid(ROWS + 1, COLS + 1, false); stakeUsed = grid(ROWS + 1, COLS + 1, false);
        faultH = grid(ROWS + 1, COLS, false); faultV = grid(ROWS, COLS + 1, false);
        crackH = grid(ROWS + 1, COLS, false); crackV = grid(ROWS, COLS + 1, false);
        for (let py = 3; py < ROWS; py += 4) for (let px = 2; px < COLS; px += 4) {
          if (isLand(px - 1, py - 1) && isLand(px, py - 1) && isLand(px - 1, py) && isLand(px, py) && rnd() < 0.9) stake[py][px] = true;
        }
        for (let py = 0; py <= ROWS; py++) for (let px = 0; px <= COLS; px++) {
          if (!stake[py][px]) continue;
          let any = false;
          if (stakeAt(px + 4, py)) { if (rnd() < 0.78) { for (let c = px; c < px + 4; c++) if (hInner(c, py)) faultH[py][c] = true; any = true; } }
          else if (rnd() < 0.8) { for (let c = px; hInner(c, py); c++) faultH[py][c] = true; any = true; }
          if (!stakeAt(px - 4, py) && rnd() < 0.8) { for (let c = px - 1; hInner(c, py); c--) faultH[py][c] = true; any = true; }
          if (stakeAt(px, py + 4)) { if (rnd() < 0.78) { for (let r = py; r < py + 4; r++) if (vInner(px, r)) faultV[r][px] = true; any = true; } }
          else if (rnd() < 0.8) { for (let r = py; vInner(px, r); r++) faultV[r][px] = true; any = true; }
          if (!stakeAt(px, py - 4) && rnd() < 0.8) { for (let r = py - 1; vInner(px, r); r--) faultV[r][px] = true; any = true; }
          if (!any) { for (let c = px; hInner(c, py); c++) faultH[py][c] = true; }
        }
      }
      function keepMainland() {
        // keep only the biggest connected land mass
        const lab = grid(ROWS, COLS, -1); let best = -1, bestN = 0, id = 0;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (land[r][c] !== 1 || lab[r][c] >= 0) continue;
          const st = [[c, r]]; lab[r][c] = id; let n = 0;
          while (st.length) { const [x, y] = st.pop(); n++; for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (isLand(nx, ny) && lab[ny][nx] < 0) { lab[ny][nx] = id; st.push([nx, ny]); } } }
          if (n > bestN) { bestN = n; best = id; } id++;
        }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (land[r][c] === 1 && lab[r][c] !== best) land[r][c] = 0;
      }
      function landTiles() { const out = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (land[r][c] === 1) out.push([c, r]); return out; }
      function centreTile() {
        let best = null, bd = 1e9;
        for (const [c, r] of landTiles()) { const d = Math.abs(c - 13.5) + Math.abs(r - 14.5); if (d < bd) { bd = d; best = [c, r]; } }
        return best || [14, 15];
      }

      // ---- entities ----
      function placePlayer() {
        const [c, r] = centreTile();
        player = { x: c * 8 + 4, y: FY + r * 8 + 4, dir: 3, anim: 0, drill: 0, dead: 0, moving: false };
        harp = null;
      }
      function placeEnemies(list) {
        const tiles = landTiles().filter(([c, r]) => Math.abs(c * 8 + 4 - player.x) + Math.abs(FY + r * 8 + 4 - player.y) > 72);
        for (const e of list) {
          const t = tiles.length ? tiles[Math.floor(Math.random() * tiles.length)] : centreTile();
          e.x = t[0] * 8 + 4; e.y = FY + t[1] * 8 + 4; e.dir = Math.floor(Math.random() * 4);
          e.state = 'walk'; e.inflate = 0; e.t = 0; e.acc = 0; e.fireCool = 120 + Math.random() * 120;
        }
      }
      function spawnEnemies() {
        enemies = [];
        const n = Math.min(8, 4 + ((round - 1) >> 1));
        for (let i = 0; i < n; i++) enemies.push({ type: (i % 3 === 2 || (round > 4 && i % 4 === 1)) ? 'fygar' : 'pooka', flee: false });
        totalEnemies = n;
        placeEnemies(enemies);
      }
      function enemySpeed(e) { let s = Math.min(0.95, 0.5 + round * 0.04); if (e.flee) s = 1.2; return s; }

      function startRound(fresh) {
        if (fresh) genIsland(round);
        sinking = []; crackQ = []; crackPending = false; popups = []; veg = null; vegSpawned = false; killed = 0;
        placePlayer(); spawnEnemies();
        state = 'ready'; tmr = 0;
        A.melody([[523, .1], [659, .1], [784, .1], [659, .1], [784, .1], [1047, .25]], { type: 'square', vol: .12 });
      }
      function startGame() {
        score = 0; lives = 2; round = 1; nextExtra = 20000;
        startRound(true);
      }
      function addScore(n, x, y) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += nextExtra === 20000 ? 40000 : 60000; A.melody([[880, .08], [1175, .08], [1568, .16]], { type: 'square', vol: .14 }); }
        if (score > hi) hi = score;
        if (x != null) popups.push({ x, y, s: String(n), t: 60 });
      }

      // ---- cracks and sinking ----
      function nearStake() {
        let best = null, bd = 99;
        for (let py = 0; py <= ROWS; py++) for (let px = 0; px <= COLS; px++) {
          if (!stake[py][px] || stakeUsed[py][px]) continue;
          const dx = Math.abs(px * 8 - player.x), dy = Math.abs(FY + py * 8 - player.y);
          if (dx <= 6 && dy <= 6 && dx + dy < bd) { bd = dx + dy; best = [px, py]; }
        }
        return best;
      }
      function drillStake(px, py) {
        const runs = [[], [], [], []];
        for (let c = px; c < COLS && faultH[py][c] && hInner(c, py); c++) { runs[0].push(['h', py, c]); if (stakeAt(c + 1, py)) break; }
        for (let c = px - 1; c >= 0 && faultH[py][c] && hInner(c, py); c--) { runs[1].push(['h', py, c]); if (stakeAt(c, py)) break; }
        for (let r = py; r < ROWS && faultV[r][px] && vInner(px, r); r++) { runs[2].push(['v', r, px]); if (stakeAt(px, r + 1)) break; }
        for (let r = py - 1; r >= 0 && faultV[r][px] && vInner(px, r); r--) { runs[3].push(['v', r, px]); if (stakeAt(px, r)) break; }
        stakeUsed[py][px] = true;
        let n = 0;
        for (const run of runs) run.forEach((e, i) => { crackQ.push({ k: e[0], r: e[1], c: e[2], at: 12 + i * 3 }); n++; });
        crackPending = true;
        return n;
      }
      function applyCracks() {
        if (!crackPending) return;
        let left = 0;
        for (const q of crackQ) {
          if (q.done) continue;
          if (--q.at <= 0) {
            q.done = true;
            if (q.k === 'h') crackH[q.r][q.c] = true; else crackV[q.r][q.c] = true;
            if ((api.frame & 3) === 0) A.noise(0.05, { vol: 0.08, freq: 1600, type: 'bandpass' });
          } else left++;
        }
        if (!left) { crackQ = []; crackPending = false; checkSplit(); }
      }
      function checkSplit() {
        const lab = grid(ROWS, COLS, -1), comps = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (land[r][c] !== 1 || lab[r][c] >= 0) continue;
          const id = comps.length, list = [], st = [[c, r]]; lab[r][c] = id;
          while (st.length) {
            const [x, y] = st.pop(); list.push([x, y]);
            const nb = [];
            if (isLand(x + 1, y) && !crackV[y][x + 1]) nb.push([x + 1, y]);
            if (isLand(x - 1, y) && !crackV[y][x]) nb.push([x - 1, y]);
            if (isLand(x, y + 1) && !crackH[y + 1][x]) nb.push([x, y + 1]);
            if (isLand(x, y - 1) && !crackH[y][x]) nb.push([x, y - 1]);
            for (const [nx, ny] of nb) if (lab[ny][nx] < 0) { lab[ny][nx] = id; st.push([nx, ny]); }
          }
          comps.push(list);
        }
        if (comps.length <= 1) return;
        let big = 0; comps.forEach((l, i) => { if (l.length > comps[big].length) big = i; });
        sinkChain = 0;
        comps.forEach((l, i) => { if (i !== big) sinkPiece(l, lab, i); });
        A.noise(1.4, { vol: 0.25, freq: 300, slideTo: 60 });
        A.tone(220, 0.8, { type: 'triangle', vol: 0.15, slideTo: 55 });
      }
      const SINK_PTS = [1000, 2000, 4000, 6000, 8000, 10000, 12000, 16000];
      function sinkPiece(tiles, lab, id) {
        for (const [c, r] of tiles) land[r][c] = 2;
        sinking.push({ tiles, t: 0 });
        const on = (x, y) => { const [c, r] = tileOf(x, y); return r >= 0 && r < ROWS && c >= 0 && c < COLS && lab[r][c] === id; };
        for (const e of enemies) {
          if (e.state === 'pop' || e.state === 'sink' || e.state === 'escape') continue;
          if (on(e.x, e.y)) {
            if (harp && harp.target === e) harp = null;
            e.state = 'sink'; e.t = 0;
            addScore(SINK_PTS[Math.min(SINK_PTS.length - 1, sinkChain++)], e.x, e.y - 8);
            killed++;
          }
        }
        if (veg && on(veg.x, veg.y)) veg = null;
        if (state === 'play' && on(player.x, player.y)) killPlayer('sink');
      }
      function updateSinking() {
        for (const s of sinking) {
          s.t++;
          if (s.t === 70) {
            for (const [c, r] of s.tiles) land[r][c] = 0;
            for (let py = 0; py <= ROWS; py++) for (let px = 0; px <= COLS; px++)
              if (stake[py][px] && !(isLand(px - 1, py - 1) && isLand(px, py - 1) && isLand(px - 1, py) && isLand(px, py))) stake[py][px] = false;
            A.noise(0.5, { vol: 0.15, freq: 2500, slideTo: 400, type: 'highpass' });
          }
        }
        sinking = sinking.filter(s => s.t < 70);
      }

      // ---- movement ----
      const canEnter = (x, y) => { const [c, r] = tileOf(x, y); return isLand(c, r); };
      const aligned = o => ((o.x - 4) & 7) === 0 && ((o.y - FY - 4) & 7) === 0;
      function stepPlayer() {
        let want = -1;
        if (api.key('ArrowUp')) want = 0; else if (api.key('ArrowDown')) want = 2;
        else if (api.key('ArrowLeft')) want = 1; else if (api.key('ArrowRight')) want = 3;
        player.moving = false;
        if (want < 0) return;
        const horiz = want === 1 || want === 3;
        const offX = (player.x - 4) & 7, offY = (player.y - FY - 4) & 7;
        if (horiz && offY) { const d = (player.dir === 0 || player.dir === 2) ? player.dir : (offY < 4 ? 0 : 2); player.y += DY[d]; player.dir = d; player.moving = true; return; }
        if (!horiz && offX) { const d = (player.dir === 1 || player.dir === 3) ? player.dir : (offX < 4 ? 1 : 3); player.x += DX[d]; player.dir = d; player.moving = true; return; }
        player.dir = want;
        if (canEnter(player.x + DX[want] * 5, player.y + DY[want] * 5)) { player.x += DX[want]; player.y += DY[want]; player.moving = true; }
      }
      function stepEnemy(e) {
        if (aligned(e)) {
          const opts = [];
          for (let d = 0; d < 4; d++) if (canEnter(e.x + DX[d] * 8, e.y + DY[d] * 8)) opts.push(d);
          if (!opts.length) return;
          let tx = player.x, ty = player.y;
          if (e.flee) { const t = e.goal || [0, 0]; tx = t[0]; ty = t[1]; }
          const rev = (e.dir + 2) & 3;
          let cand = opts.length > 1 ? opts.filter(d => d !== rev) : opts;
          const chase = e.flee ? 0.95 : Math.min(0.85, 0.45 + round * 0.04);
          let d;
          if (Math.random() < chase) {
            let bd = 1e9; d = cand[0];
            for (const o of cand) { const dd = Math.abs(e.x + DX[o] * 8 - tx) + Math.abs(e.y + DY[o] * 8 - ty); if (dd < bd) { bd = dd; d = o; } }
          } else d = cand.includes(e.dir) && Math.random() < 0.6 ? e.dir : cand[Math.floor(Math.random() * cand.length)];
          e.dir = d;
        }
        e.x += DX[e.dir]; e.y += DY[e.dir];
      }
      function coastGoal(e) {
        let best = null, bd = 1e9;
        for (const [c, r] of landTiles()) {
          let coast = false; for (let d = 0; d < 4; d++) if (!isLand(c + DX[d], r + DY[d])) coast = true;
          if (!coast) continue;
          const x = c * 8 + 4, y = FY + r * 8 + 4, dd = Math.abs(x - e.x) + Math.abs(y - e.y) - Math.min(60, Math.abs(x - player.x) + Math.abs(y - player.y));
          if (dd < bd) { bd = dd; best = [x, y]; }
        }
        return best;
      }

      function killPlayer(cause) {
        if (state !== 'play') return;
        state = 'dying'; tmr = 0; deathCause = cause; harp = null;
        A.melody([[784, .12], [740, .12], [698, .12], [659, .12], [622, .12], [587, .3]], { type: 'square', vol: .14 });
      }

      function updatePlay() {
        applyCracks();
        updateSinking();
        // player
        if (player.drill > 0) {
          player.drill--;
          if ((player.drill & 3) === 0) A.noise(0.04, { vol: 0.12, freq: 900 });
        } else if (harp && harp.target) {
          // pumping
          if (api.pressed('Space') || (api.key('Space') && (api.frame % 14) === 0)) pump();
          if (api.anyPressed('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight')) { harp = null; }
        } else if (harp) {
          harp.len += 3;
          const tx = player.x + DX[harp.dir] * harp.len, ty = player.y + DY[harp.dir] * harp.len;
          for (const e of enemies) {
            if ((e.state === 'walk' || e.state === 'prep' || e.state === 'fire' || e.state === 'inflate') && Math.abs(e.x - tx) < 7 && Math.abs(e.y - ty) < 7) {
              harp.target = e; e.state = 'inflate'; e.inflate = Math.max(1, e.inflate); e.t = 0; harp.len = Math.max(4, Math.abs(e.x - player.x) + Math.abs(e.y - player.y) - 5);
              A.tone(1200, 0.05, { vol: 0.12 }); break;
            }
          }
          if (!harp.target && harp.len >= 30) harp = null;
        } else {
          stepPlayer();
          if (player.moving) { player.anim++; if ((player.anim & 7) === 0) A.tone(player.anim & 8 ? 300 : 260, 0.03, { vol: 0.06 }); }
          if (api.pressed('Space')) { harp = { len: 2, dir: player.dir, target: null }; A.tone(900, 0.06, { vol: 0.1, slideTo: 1400 }); }
          else if (api.pressed('KeyX')) {
            const s = nearStake();
            if (s && !crackPending) { const n = drillStake(s[0], s[1]); player.drill = 30; if (!n) A.tone(150, 0.1, { vol: 0.12 }); }
            else A.tone(120, 0.06, { vol: 0.1 });
          }
        }
        if (!canEnter(player.x, player.y)) { killPlayer('sink'); return; }
        // enemies
        const alive = enemies.filter(e => e.state !== 'pop' && e.state !== 'sink' && e.state !== 'escape' && !e.gone);
        if (alive.length === 1 && totalEnemies > 1 && !alive[0].flee && alive[0].state === 'walk') { alive[0].flee = true; alive[0].goal = coastGoal(alive[0]); }
        for (const e of enemies) {
          if (e.gone) continue;
          e.t++;
          if (e.state === 'pop') { if (e.t > 24) e.gone = true; continue; }
          if (e.state === 'sink') { if (e.t > 60) e.gone = true; continue; }
          if (e.state === 'escape') { if (e.t > 40) e.gone = true; continue; }
          if (e.state === 'inflate') {
            if (!harp || harp.target !== e) { if (e.t > 45) { e.t = 0; e.inflate--; if (e.inflate <= 0) { e.state = 'walk'; e.inflate = 0; } } }
            continue;
          }
          if (e.state === 'prep') { if (e.t > 30) { e.state = 'fire'; e.t = 0; A.noise(0.7, { vol: 0.18, freq: 1200, type: 'bandpass', slideTo: 300 }); } continue; }
          if (e.state === 'fire') { if (e.t > 45) { e.state = 'walk'; e.fireCool = 140 + Math.random() * 160; } continue; }
          // walk
          if (!canEnter(e.x, e.y)) { e.state = 'sink'; e.t = 0; continue; }
          e.acc += enemySpeed(e);
          while (e.acc >= 1) { e.acc--; stepEnemy(e); }
          if (e.flee && e.goal && Math.abs(e.x - e.goal[0]) < 2 && Math.abs(e.y - e.goal[1]) < 2) { e.state = 'escape'; e.t = 0; A.tone(600, 0.4, { vol: 0.12, slideTo: 150 }); continue; }
          if (e.flee && (!e.goal || (api.frame % 60) === 0)) e.goal = coastGoal(e);
          if (e.type === 'fygar' && !e.flee) {
            e.fireCool--;
            const ahead = e.dir === 3 ? player.x - e.x : e.dir === 1 ? e.x - player.x : -1;
            if (e.fireCool <= 0 && (e.dir === 1 || e.dir === 3) && Math.abs(player.y - e.y) < 6 && ahead > 0 && ahead < 60 && Math.random() < 0.05) { e.state = 'prep'; e.t = 0; }
          }
        }
        // collisions
        for (const e of enemies) {
          if (e.gone) continue;
          if ((e.state === 'walk' || e.state === 'prep' || e.state === 'fire') && Math.abs(e.x - player.x) < 8 && Math.abs(e.y - player.y) < 8) { killPlayer('enemy'); return; }
          if (e.state === 'fire') {
            const len = Math.min(26, e.t * 1.5), s = e.dir === 3 ? 1 : -1;
            const x0 = s > 0 ? e.x + 5 : e.x - 5 - len, x1 = x0 + len;
            if (player.x + 4 > x0 && player.x - 4 < x1 && Math.abs(player.y - e.y) < 6) { killPlayer('fire'); return; }
          }
        }
        enemies = enemies.filter(e => !e.gone);
        // vegetable
        if (!vegSpawned && killed >= 2) {
          vegSpawned = true; const [c, r] = centreTile();
          veg = { x: c * 8 + 4, y: FY + r * 8 + 4, t: 600, k: (round - 1) % VEG_ART.length };
        }
        if (veg) {
          if (--veg.t <= 0 || !canEnter(veg.x, veg.y)) veg = null;
          else if (Math.abs(veg.x - player.x) < 8 && Math.abs(veg.y - player.y) < 8) {
            addScore(VEG_PTS[Math.min(7, round - 1)], veg.x, veg.y - 8); veg = null;
            A.melody([[1047, .06], [1319, .06], [1568, .1]], { type: 'square', vol: .14 });
          }
        }
        if (!enemies.length && !crackPending && !sinking.length) { state = 'clear'; tmr = 0; A.melody([[784, .1], [988, .1], [1175, .1], [1568, .3]], { type: 'square', vol: .14 }); }
      }
      function pump() {
        const e = harp.target;
        e.inflate++; e.t = 0; player.anim += 4;
        A.tone(300 + e.inflate * 120, 0.08, { type: 'square', vol: 0.12, slideTo: 500 + e.inflate * 120 });
        if (e.inflate >= 4) {
          e.state = 'pop'; e.t = 0; harp = null; killed++;
          addScore(e.type === 'fygar' ? ((e.dir === 1 || e.dir === 3) ? 800 : 400) : 200 + 100 * Math.min(3, round >> 2), e.x, e.y - 8);
          A.noise(0.15, { vol: 0.2, freq: 3000 });
        }
      }

      function tryStart() {
        if (api.useCredit()) { startGame(); return; }
        coinFlash = 90; A.tone(80, 0.25, { vol: 0.2 });
      }

      function update() {
        tmr++;
        if (coinFlash > 0) coinFlash--;
        if (popups.length) { for (const p of popups) p.t--; popups = popups.filter(p => p.t > 0); }
        if (state === 'title') {
          attractT++;
          if (attractT > 480) { attractT = 0; attractPage = (attractPage + 1) % 3; if (attractPage === 1) { genIsland(1 + Math.floor(Math.random() * 6)); } }
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (state === 'ready') { if (tmr > 120) { state = 'play'; tmr = 0; } return; }
        if (state === 'play') { updatePlay(); return; }
        if (state === 'dying') {
          updateSinking();
          if (tmr > 140) {
            const respawn = () => { placePlayer(); placeEnemies(enemies.filter(e => e.state === 'walk' || e.state === 'inflate' || e.state === 'prep' || e.state === 'fire')); enemies = enemies.filter(e => e.state === 'walk'); for (const e of enemies) e.flee = false; crackQ = []; crackPending = false; state = 'ready'; tmr = 0; };
            if (lives > 0) { lives--; respawn(); }
            else {
              state = 'wait';
              const over = () => { state = 'gameover'; tmr = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 2; respawn(); }, over); else over();
            }
          }
          return;
        }
        if (state === 'clear') { updateSinking(); if (tmr > 150) { round++; startRound(true); } return; }
        if (state === 'gameover') { if (tmr > 200) { state = 'title'; attractT = 0; attractPage = 0; } return; }
      }

      // ================= Rendering =================
      function drawSea(ctx) {
        ctx.fillStyle = '#0a2c9c'; ctx.fillRect(0, FY, W, ROWS * 8);
        ctx.fillStyle = '#2b5fe0';
        const ph = api.frame >> 3;
        for (let r = 0; r < ROWS; r += 2) for (let c = (r >> 1) & 1; c < COLS; c += 3) {
          const o = (c * 7 + r * 3 + ph) % 8;
          ctx.fillRect(c * 8 + o, FY + r * 8 + 3, 3, 1);
        }
      }
      function hash(c, r) { let h = (c * 374761393 + r * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return h; }
      function drawLand(ctx) {
        // cliffs (south-facing edges) and foam
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (land[r][c] !== 1) continue;
          if (!isLand(c, r + 1)) { ctx.fillStyle = '#9a5a1c'; ctx.fillRect(c * 8, FY + r * 8 + 8, 8, 4); ctx.fillStyle = '#6a3a10'; ctx.fillRect(c * 8, FY + r * 8 + 11, 8, 1); }
        }
        const foam = (api.frame >> 4) & 1;
        ctx.fillStyle = '#c8e8ff';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (land[r][c] !== 1) continue;
          if (!isLand(c - 1, r)) ctx.fillRect(c * 8 - 2, FY + r * 8 + 1 + foam * 3, 1, 3);
          if (!isLand(c + 1, r)) ctx.fillRect(c * 8 + 9, FY + r * 8 + 4 - foam * 3, 1, 3);
          if (!isLand(c, r - 1)) ctx.fillRect(c * 8 + 2 + foam * 3, FY + r * 8 - 2, 3, 1);
        }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (land[r][c] !== 1) continue;
          const x = c * 8, y = FY + r * 8;
          ctx.fillStyle = '#48b830'; ctx.fillRect(x, y, 8, 8);
          const h = hash(c, r);
          ctx.fillStyle = '#2f8a20'; ctx.fillRect(x + (h & 7), y + ((h >> 3) & 7), 1, 1); ctx.fillRect(x + ((h >> 6) & 7), y + ((h >> 9) & 7), 2, 1);
          if ((h >> 12 & 15) === 0) { ctx.fillStyle = '#ffe060'; ctx.fillRect(x + 3, y + 3, 1, 1); }
          if (!isLand(c, r - 1)) { ctx.fillStyle = '#78d850'; ctx.fillRect(x, y, 8, 1); }
        }
        // sinking pieces
        for (const s of sinking) {
          const k = s.t / 70, dy = Math.floor(k * 6);
          ctx.globalAlpha = Math.max(0, 1 - k);
          for (const [c, r] of s.tiles) {
            ctx.fillStyle = (s.t >> 2) & 1 ? '#3a9a28' : '#2c7a1e'; ctx.fillRect(c * 8, FY + r * 8 + dy, 8, 8 - dy);
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ffffff';
          for (const [c, r] of s.tiles) if (((c + r + (s.t >> 2)) & 3) === 0) ctx.fillRect(c * 8 + 2, FY + r * 8 + 6, 4, 1);
        }
        // fault lines and cracks
        for (let py = 0; py <= ROWS; py++) for (let c = 0; c < COLS; c++) {
          if (!hInner(c, py)) continue;
          const y = FY + py * 8;
          if (crackH[py][c]) { ctx.fillStyle = '#000'; ctx.fillRect(c * 8, y - 1, 8, 2); ctx.fillRect(c * 8 + 3, y - 2 + (c & 1) * 3, 2, 1); }
          else if (faultH[py][c]) { ctx.fillStyle = '#1e5c14'; ctx.fillRect(c * 8, y, 2, 1); ctx.fillRect(c * 8 + 4, y, 2, 1); }
        }
        for (let r = 0; r < ROWS; r++) for (let px = 0; px <= COLS; px++) {
          if (!vInner(px, r)) continue;
          const x = px * 8;
          if (crackV[r][px]) { ctx.fillStyle = '#000'; ctx.fillRect(x - 1, FY + r * 8, 2, 8); ctx.fillRect(x - 2 + (r & 1) * 3, FY + r * 8 + 3, 1, 2); }
          else if (faultV[r][px]) { ctx.fillStyle = '#1e5c14'; ctx.fillRect(x, FY + r * 8, 1, 2); ctx.fillRect(x, FY + r * 8 + 4, 1, 2); }
        }
        // stakes
        for (let py = 0; py <= ROWS; py++) for (let px = 0; px <= COLS; px++) {
          if (!stake[py][px]) continue;
          const x = px * 8, y = FY + py * 8;
          if (stakeUsed[py][px]) { ctx.fillStyle = '#5a3008'; ctx.fillRect(x - 2, y - 1, 4, 2); }
          else {
            ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y + 1, 4, 2);
            ctx.fillStyle = '#c07828'; ctx.fillRect(x - 2, y - 4, 4, 6);
            ctx.fillStyle = '#ffd890'; ctx.fillRect(x - 2, y - 4, 4, 1);
            ctx.fillStyle = '#7a4810'; ctx.fillRect(x + 1, y - 3, 1, 5);
          }
        }
      }
      function drawBall(ctx, e) {
        const R = 5 + e.inflate * 2, x = e.x, y = e.y;
        const col = e.type === 'pooka' ? '#ff2020' : '#20d020';
        ctx.fillStyle = col;
        for (let dy = -R; dy <= R; dy++) { const w = Math.round(Math.sqrt(R * R - dy * dy)); ctx.fillRect(x - w, y + dy, w * 2, 1); }
        ctx.fillStyle = '#fff'; ctx.fillRect(x - R + 3, y - 3, 3, 3); ctx.fillRect(x + R - 6, y - 3, 3, 3);
        ctx.fillStyle = '#000'; ctx.fillRect(x - R + 4, y - 2, 1, 1); ctx.fillRect(x + R - 5, y - 2, 1, 1);
        if (e.type === 'pooka') { ctx.fillStyle = '#ffe040'; ctx.fillRect(x - R + 2, y - 4, 2 * R - 4, 1); }
      }
      function drawEnemy(ctx, e) {
        const fr = (api.frame >> 3) & 1, face = e.dir === 1 ? 0 : e.dir === 3 ? 1 : (e.lastFace || 0);
        if (e.dir === 1 || e.dir === 3) e.lastFace = face;
        const sx = e.x - 6, sy = e.y - 6;
        if (e.state === 'pop') {
          ctx.fillStyle = (e.t >> 2) & 1 ? '#fff' : '#ff4040';
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, d = 4 + e.t * 0.6; ctx.fillRect(Math.round(e.x + Math.cos(a) * d) - 1, Math.round(e.y + Math.sin(a) * d) - 1, 2, 2); }
          return;
        }
        if (e.state === 'sink' || e.state === 'escape') {
          const k = Math.min(1, e.t / 50);
          ctx.globalAlpha = 1 - k;
          ctx.drawImage((e.type === 'pooka' ? SP_P : SP_F)[0][face], sx, sy + Math.round(k * 6));
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#c8e8ff'; const rr = Math.round(2 + e.t / 6); ctx.fillRect(e.x - rr, e.y + 6, rr * 2, 1);
          return;
        }
        if (e.state === 'inflate') { drawBall(ctx, e); return; }
        if (e.type === 'pooka') { ctx.drawImage(SP_P[fr][face], sx, sy); return; }
        const img = e.state === 'prep' && ((e.t >> 2) & 1) ? SP_FW : SP_F;
        ctx.drawImage(img[e.state === 'walk' ? fr : 0][face], sx, sy);
        if (e.state === 'fire') {
          const len = Math.min(26, Math.floor(e.t * 1.5)), s = e.dir === 3 ? 1 : -1;
          const x0 = s > 0 ? e.x + 5 : e.x - 5 - len;
          ctx.fillStyle = '#ff6010'; ctx.fillRect(x0, e.y - 3, len, 6);
          ctx.fillStyle = (e.t >> 1) & 1 ? '#ffe040' : '#ffffff'; ctx.fillRect(x0 + (s > 0 ? 0 : 2), e.y - 1, len - 2, 2);
        }
      }
      function drawPlayer(ctx) {
        const p = player;
        if (state === 'dying') {
          const t = tmr;
          if (deathCause === 'sink') {
            const k = Math.min(1, t / 70);
            ctx.globalAlpha = 1 - k; ctx.drawImage(SP_T[0][p.dir], p.x - 6, p.y - 6 + Math.round(k * 5)); ctx.globalAlpha = 1;
            if (t < 90) { ctx.fillStyle = '#fff'; ctx.fillRect(p.x - (t >> 3), p.y + 6, (t >> 3) * 2, 1); }
            return;
          }
          if (t < 60) { ctx.drawImage(SP_T[0][(t >> 3) & 3], p.x - 6, p.y - 6); return; }
          if (t < 110) { const k = (t - 60) / 50; const h = Math.max(1, Math.round(12 * (1 - k))); ctx.drawImage(SP_T[0][2], 0, 0, 12, 12, p.x - 6, p.y + 6 - h, 12, h); }
          return;
        }
        const fr = p.moving || p.drill ? (p.anim >> 3) & 1 : 0;
        let jx = 0;
        if (p.drill) { jx = (p.drill & 2) ? 1 : -1; }
        ctx.drawImage(SP_T[fr][p.dir], p.x - 6 + jx, p.y - 6);
        if (p.drill) {
          ctx.fillStyle = '#909090'; ctx.fillRect(p.x - 1 + jx, p.y + 2, 3, 6);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - 4, p.y + 7 + ((p.drill >> 1) & 1), 1, 1); ctx.fillRect(p.x + 4, p.y + 8 - ((p.drill >> 1) & 1), 1, 1);
        }
        if (harp) {
          const d = harp.dir, len = harp.len;
          ctx.fillStyle = '#ffffff';
          const x0 = p.x + DX[d] * 6, y0 = p.y + DY[d] * 6 + (d === 1 || d === 3 ? 1 : 0);
          for (let i = 0; i < len; i += 2) ctx.fillRect(x0 + DX[d] * i, y0 + DY[d] * i, 1, 1);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x0 + DX[d] * len - 1, y0 + DY[d] * len - 1, 3, 3);
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, FY); ctx.fillRect(0, FY + ROWS * 8, W, H - FY - ROWS * 8);
        txt(ctx, '1UP', 24, 1, (api.frame >> 4) & 1 || state === 'title' ? '#ff4040' : '#ff4040');
        txt(ctx, String(score).padStart(6, ' '), 8, 11, '#ffffff');
        txt(ctx, 'HI-SCORE', 120, 1, '#ff4040');
        txt(ctx, String(hi).padStart(6, ' '), 128, 11, '#ffffff');
        if (state !== 'title') {
          for (let i = 0; i < Math.min(6, lives); i++) ctx.drawImage(SP_T[0][3], 4 + i * 14, H - 18);
          txt(ctx, 'ROUND ' + round, W - 4, H - 16, '#ffffff', 1, 'r');
        } else txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, H - 12, '#ffffff');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const blink = (tmr >> 5) & 1;
        if (attractPage === 1 && land) {
          drawSea(ctx); drawLand(ctx);
          ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(16, 112, 192, 52);
          txt(ctx, 'JACKHAMMER THE STAKES', W / 2, 120, '#ffffff', 1, 'c');
          txt(ctx, 'CRACK THE FAULT LINES', W / 2, 134, '#ffe040', 1, 'c');
          txt(ctx, 'AND SINK THE ISLAND!', W / 2, 148, '#ff6060', 1, 'c');
        } else if (attractPage === 2) {
          txt(ctx, 'SCORE TABLE', W / 2, 52, '#ffe040', 1, 'c');
          ctx.drawImage(SP_P[(tmr >> 4) & 1][1], 40, 76); txt(ctx, 'POOKA  PUMP   200', 60, 78, '#ffffff');
          ctx.drawImage(SP_F[(tmr >> 4) & 1][1], 40, 100); txt(ctx, 'FYGAR  PUMP   400', 60, 102, '#ffffff');
          txt(ctx, '       SIDE   800', 60, 116, '#9090ff');
          txt(ctx, 'SINK 1ST     1000', 60, 140, '#40ff40');
          txt(ctx, 'SINK 2ND     2000', 60, 154, '#40ff40');
          txt(ctx, 'SINK 3RD     4000', 60, 168, '#40ff40');
          ctx.drawImage(SP_V[0], 40, 192); txt(ctx, 'BONUS VEGETABLES', 60, 194, '#ff9040');
          txt(ctx, 'BONUS DIG DUG 20000 60000', W / 2, 226, '#ffffff', 1, 'c');
        } else {
          // logo
          const ox = 18, oy = 50;
          txt(ctx, 'DIG DUG', ox + 2, oy + 2, '#801010', 3);
          txt(ctx, 'DIG DUG', ox, oy, '#ff2020', 3);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(ox + 172, oy, 4, 21); ctx.fillRect(ox + 180, oy, 4, 21);
          ctx.fillStyle = '#ffe040'; ctx.fillRect(ox, oy + 26, 188, 2);
          ctx.drawImage(SP_T[(tmr >> 3) & 1][3], 60, 106);
          ctx.drawImage(SP_P[(tmr >> 3) & 1][0], 100, 106);
          ctx.drawImage(SP_F[(tmr >> 3) & 1][0], 140, 106);
          txt(ctx, 'TAIZO HORI IS BACK!', W / 2, 136, '#ffffff', 1, 'c');
          txt(ctx, 'ARROWS MOVE  SPACE PUMP', W / 2, 160, '#9090ff', 1, 'c');
          txt(ctx, 'X JACKHAMMER AT STAKES', W / 2, 172, '#9090ff', 1, 'c');
          txt(ctx, '\u00a9 1985 NAMCO', W / 2, 236, '#ffffff', 1, 'c');
        }
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) txt(ctx, 'INSERT COIN', W / 2, 206, '#ff4040', 1, 'c'); }
        else if (blink) txt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 206, '#ffe040', 1, 'c');
        drawHUD(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); return; }
        drawSea(ctx); drawLand(ctx);
        if (veg) ctx.drawImage(SP_V[veg.k], veg.x - 5, veg.y - 5);
        for (const e of enemies) drawEnemy(ctx, e);
        drawPlayer(ctx);
        for (const p of popups) txt(ctx, p.s, p.x, p.y - (60 - p.t) / 6, '#ffffff', 1, 'c');
        drawHUD(ctx);
        if (state === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(60, 124, 104, 30);
          txt(ctx, 'PLAYER 1', W / 2, 128, '#ffffff', 1, 'c'); txt(ctx, 'ROUND ' + round, W / 2, 142, '#ffe040', 1, 'c');
        }
        if (state === 'clear' && tmr > 40) { ctx.fillStyle = '#000'; ctx.fillRect(56, 130, 112, 14); txt(ctx, 'ROUND CLEAR!', W / 2, 134, '#ffe040', 1, 'c'); }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(68, 130, 88, 14); txt(ctx, 'GAME OVER', W / 2, 134, '#ff4040', 1, 'c'); }
      }
      genIsland(1);
      return { update, render, destroy() { } };
    }
  });
})();
