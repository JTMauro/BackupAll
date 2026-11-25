// Super Pac-Man (Namco, 1982) -- from-scratch recreation for the MAME32 Game Room.
// Eat keys to unlock doors, clear the food, and use super pellets to grow giant and invincible.
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
    '=': '00001F001F0000', '"': '0A0A0000000000', '*': '0004150E150400', '+': '0004041F040400'
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
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  // ================= Art =================
  const FOODS = [
    [['...g...', '..rgr..', '.rrrrr.', 'rrwrrrr', 'rrrrrrr', '.rrrrr.', '..r.r..'], { g: '#40d040', r: '#ff2020', w: '#ffffff' }, 'APPLE'],
    [['.....yy', '....yy.', '...yyy.', '..yyy..', '.yyyy..', 'yyyy...', '.yy....'], { y: '#ffe030' }, 'BANANA'],
    [['..ppp..', '.ppppp.', 'pp...pp', 'pp...pp', 'pp...pp', '.ppppp.', '..ppp..'], { p: '#e09050' }, 'DONUT'],
    [['..ooo..', '.ooooo.', 'ggggggg', 'bbbbbbb', 'yyyyyyy', '.ooooo.', '.......'], { o: '#e0a040', g: '#30c030', b: '#803010', y: '#ffe030' }, 'BURGER'],
    [['..www..', '.wwwww.', 'wwyyyww', 'wyyyyyw', 'wwyyyww', '.wwwww.', '.......'], { w: '#ffffff', y: '#ffc020' }, 'EGG'],
    [['...g...', '..gyg..', '..yyy..', '.gyyyg.', '.gyyyg.', '..gyg..', '...g...'], { g: '#30c030', y: '#ffe030' }, 'CORN'],
    [['...r...', '..www..', '.ppppp.', '.wwwww.', '.ppppp.', 'bbbbbbb', '.......'], { r: '#ff2020', w: '#ffffff', p: '#ff80c0', b: '#c08040' }, 'CAKE'],
    [['..ggg..', '.gGgGg.', 'gGgGgGg', 'gGgGgGg', 'gGgGgGg', '.gGgGg.', '..ggg..'], { g: '#30c030', G: '#a0ff60' }, 'MELON']
  ];
  const FOOD_VAL = [10, 20, 30, 40, 50, 60, 70, 80];
  const KEY_ART = ['..yyy..', '.y...y.', '.y...y.', '..yyy..', '...y...', '...yy..', '...yyy.'];
  const GHOST_BODY = [
    '.....xxxx.....',
    '...xxxxxxxx...',
    '..xxxxxxxxxx..',
    '.xxxxxxxxxxxx.',
    '.xxxxxxxxxxxx.',
    '.xxxxxxxxxxxx.',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx'];
  const SKIRT = [['xx.xxx..xxx.xx', 'x...xx..xx...x'], ['xxxx.xxxx.xxxx', '.xx...xx...xx.']];
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];

  ArcadeRegistry.register({
    id: 'superpacman', title: 'Super Pac-Man', year: 1982, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space/X (hold): super speed \u00b7 Enter: start',
    marquee: { bg: '#000000', fg: '#ffe030', accent: '#ff60a0' },
    create(api) {
      const A = api.audio;
      const MC = 28, MR = 31, FY = 24;
      // ---------- maze build ----------
      const cell = Array.from({ length: MR }, () => new Array(MC).fill(0)); // 0 wall, 1 corridor, 2 house, 3 gate
      const hl = (r, c0, c1) => { for (let c = c0; c <= c1; c++) cell[r][c] = 1; };
      const vl = (c, r0, r1) => { for (let r = r0; r <= r1; r++) cell[r][c] = 1; };
      for (const r of [1, 5, 9, 20, 24, 29]) hl(r, 1, 26);
      vl(1, 1, 9); vl(1, 20, 29); vl(26, 1, 9); vl(26, 20, 29);
      vl(6, 1, 29); vl(21, 1, 29);
      vl(12, 1, 11); vl(12, 17, 29); vl(15, 1, 11); vl(15, 17, 29);
      hl(11, 9, 18); hl(17, 9, 18); vl(9, 11, 17); vl(18, 11, 17);
      hl(14, 0, 9); hl(14, 18, 27);
      vl(3, 24, 29); vl(24, 24, 29);
      for (let r = 13; r <= 15; r++) for (let c = 11; c <= 16; c++) cell[r][c] = 2;
      cell[12][13] = 3; cell[12][14] = 3;
      const isCorr = (c, r) => { if (r === 14 && (c < 0 || c >= MC)) return true; return r >= 0 && r < MR && c >= 0 && c < MC && cell[r][c] === 1; };

      // segments between junction nodes
      function isNode(c, r) {
        let n = 0, h = 0, v = 0;
        if (isCorr(c - 1, r)) { n++; h++; } if (isCorr(c + 1, r)) { n++; h++; }
        if (isCorr(c, r - 1)) { n++; v++; } if (isCorr(c, r + 1)) { n++; v++; }
        return n !== 2 || (h === 1 && v === 1);
      }
      const segs = [];
      {
        const seen = new Set();
        for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
          if (!isCorr(c, r) || !isNode(c, r)) continue;
          for (let d = 0; d < 4; d++) {
            let x = c + DX[d], y = r + DY[d];
            if (!isCorr(x, y) || x < 0 || x >= MC) continue;
            const path = [];
            let pd = d;
            while (isCorr(x, y) && x >= 0 && x < MC && !isNode(x, y)) {
              path.push([x, y]);
              let nd = -1; for (let k = 0; k < 4; k++) { if (k === ((pd + 2) & 3)) continue; if (isCorr(x + DX[k], y + DY[k])) { nd = k; break; } }
              if (nd < 0) break; pd = nd; x += DX[nd]; y += DY[nd];
            }
            if (!path.length) continue;
            const key = path.map(p => p.join(',')).sort().join(';');
            if (seen.has(key)) continue; seen.add(key);
            segs.push(path);
          }
        }
      }
      const outerCell = (c, r) => r === 1 || r === 29 || c === 1 || c === 26 || r === 14 || ((r === 11 || r === 17) && c >= 9 && c <= 18) || ((c === 9 || c === 18) && r >= 11 && r <= 17) || (r === 24 && c >= 12 && c <= 15) || ((c === 12 || c === 15) && (r === 10 || r === 18 || r === 19));
      const SUPER_CELLS = [[1, 3], [26, 3]], POWER_CELLS = [[1, 27], [26, 27]];

      // ---------- level state ----------
      let food, keys, doors, comps, pellets, foodLeft;
      function setupLevel() {
        food = Array.from({ length: MR }, () => new Array(MC).fill(0));
        keys = Array.from({ length: MR }, () => new Array(MC).fill(0));
        doors = Array.from({ length: MR }, () => new Array(MC).fill(-1));
        comps = []; pellets = []; foodLeft = 0;
        for (const seg of segs) {
          const outer = seg.every(([c, r]) => outerCell(c, r));
          if (outer) {
            if (seg[0][1] === 1 || seg[0][1] === 29) { const m = seg[Math.floor(seg.length / 2)]; if (seg.length >= 3) keys[m[1]][m[0]] = 1; }
            continue;
          }
          if (seg.length >= 4 && !bonusStage) {
            const id = comps.length;
            const a = seg[0], b = seg[seg.length - 1];
            doors[a[1]][a[0]] = id; doors[b[1]][b[0]] = id;
            comps.push({ doors: [a, b], open: false });
            const inner = seg.slice(1, -1);
            inner.forEach(([c, r], i) => { if (i === Math.floor(inner.length / 2) && inner.length >= 3) keys[r][c] = 1; else { food[r][c] = 1; foodLeft++; } });
          } else for (const [c, r] of seg) { food[r][c] = 1; foodLeft++; }
        }
        for (const [c, r] of SUPER_CELLS) { pellets.push({ c, r, kind: 'super' }); food[r][c] = 0; keys[r][c] = 0; }
        for (const [c, r] of POWER_CELLS) { pellets.push({ c, r, kind: 'power' }); food[r][c] = 0; keys[r][c] = 0; }
        if (bonusStage) { keys = keys.map(r => r.map(() => 0)); pellets = []; }
        foodLeft = 0; for (const r of food) for (const v of r) foodLeft += v;
        foodTotal = foodLeft;
      }
      const doorClosed = (c, r) => { if (r < 0 || r >= MR || c < 0 || c >= MC) return false; const d = doors[r][c]; return d >= 0 && !comps[d].open; };

      // ---------- game state ----------
      let state = 'title', tmr = 0, score = 0, hi = api.getHiScore(30000), lives = 2, level = 1, nextExtra = 30000;
      let coinFlash = 0, attractT = 0, foodTotal = 0, bonusStage = false, bonusTime = 0;
      let pac, ghosts = [], superT = 0, frightT = 0, eatChain = 0, modeIdx = 0, modeT = 0, popups = [], star = null, starDone = false, flashT = 0, freezeT = 0;
      const MODES = [7, 20, 7, 20, 5, 20, 5, 1e9];
      const GCOL = ['#ff2020', '#ffb0ff', '#20ffff', '#ffb050'];
      const SCATTER = [[25, -3], [2, -3], [27, 33], [0, 33]];

      // sprites
      const SPR_FOOD = FOODS.map(f => sprite(f[0], f[1]));
      const SPR_KEY = sprite(KEY_ART, { y: '#ffd020' });
      function ghostSprite(col, f) {
        const rows = GHOST_BODY.concat(SKIRT[f]);
        return sprite(rows, { x: col });
      }
      const SPR_G = GCOL.map(c => [ghostSprite(c, 0), ghostSprite(c, 1)]);
      const SPR_FR = [ghostSprite('#2030ff', 0), ghostSprite('#2030ff', 1)];
      const SPR_FW = [ghostSprite('#f0f0f0', 0), ghostSprite('#f0f0f0', 1)];
      function pacSprite(R, dir, open) {
        const S = R * 2 + 1, cv = mkCanvas(S, S), c = cv.getContext('2d');
        const ang = [-Math.PI / 2, Math.PI, Math.PI / 2, 0][dir], half = open * 0.42;
        c.fillStyle = '#ffe000';
        for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
          if (x * x + y * y > R * R + R * 0.6) continue;
          if (half > 0) { let a = Math.atan2(y, x) - ang; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; if (Math.abs(a) < half * 1.6 && (x * x + y * y) > 1) continue; }
          c.fillRect(x + R, y + R, 1, 1);
        }
        return cv;
      }
      const SPR_PAC = [6, 12].map(R => [0, 1, 2, 3].map(d => [0, 1, 2].map(o => pacSprite(R, d, o))));
      const SPR_PACDIE = [];
      for (let i = 0; i < 11; i++) {
        const R = 6, S = 13, cv = mkCanvas(S, S), c = cv.getContext('2d'); const half = Math.PI * (0.1 + i * 0.09);
        c.fillStyle = '#ffe000';
        for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { if (x * x + y * y > R * R + 3) continue; const a = Math.abs(Math.atan2(x, -y)); if (a < half) continue; c.fillRect(x + R, y + R, 1, 1); }
        SPR_PACDIE.push(cv);
      }
      let mazeImg = null, mazeCol = '';
      const MAZE_COLS = [['#ffb8ae', '#de9751'], ['#47b8ff', '#2121de'], ['#ff6060', '#c02020'], ['#80ff80', '#20a020'], ['#ffff80', '#c0a000'], ['#ff80ff', '#a020a0']];
      function buildMaze(white) {
        const [edge, fill] = white ? ['#ffffff', '#ffffff'] : MAZE_COLS[(level - 1) % MAZE_COLS.length];
        const cv = mkCanvas(W, MR * 8), c = cv.getContext('2d');
        for (let r = 0; r < MR; r++) for (let x = 0; x < MC; x++) {
          const v = cell[r][x];
          if (v === 1 || v === 2) continue;
          if (v === 3) { c.fillStyle = '#ffb8ff'; c.fillRect(x * 8, r * 8 + 6, 8, 2); continue; }
          let nearOpen = false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const rr = r + dy, cc = x + dx; if (rr >= 0 && rr < MR && cc >= 0 && cc < MC && cell[rr][cc] !== 0) nearOpen = true; }
          c.fillStyle = fill; c.globalAlpha = 0.45; c.fillRect(x * 8, r * 8, 8, 8); c.globalAlpha = 1;
          if (!nearOpen) continue;
          c.fillStyle = edge;
          const o = (cc, rr) => rr >= 0 && rr < MR && cc >= 0 && cc < MC && (cell[rr][cc] === 1 || cell[rr][cc] === 2);
          if (o(x, r - 1)) c.fillRect(x * 8, r * 8, 8, 2);
          if (o(x, r + 1)) c.fillRect(x * 8, r * 8 + 6, 8, 2);
          if (o(x - 1, r)) c.fillRect(x * 8, r * 8, 2, 8);
          if (o(x + 1, r)) c.fillRect(x * 8 + 6, r * 8, 2, 8);
          if (o(x - 1, r - 1) && !o(x - 1, r) && !o(x, r - 1)) c.fillRect(x * 8, r * 8, 2, 2);
          if (o(x + 1, r - 1) && !o(x + 1, r) && !o(x, r - 1)) c.fillRect(x * 8 + 6, r * 8, 2, 2);
          if (o(x - 1, r + 1) && !o(x - 1, r) && !o(x, r + 1)) c.fillRect(x * 8, r * 8 + 6, 2, 2);
          if (o(x + 1, r + 1) && !o(x + 1, r) && !o(x, r + 1)) c.fillRect(x * 8 + 6, r * 8 + 6, 2, 2);
        }
        return cv;
      }

      // ---------- helpers ----------
      const tileX = x => Math.floor(x / 8), tileY = y => Math.floor((y - FY) / 8);
      const atCenter = o => ((o.x - 4) & 7) === 0 && ((o.y - FY - 4) & 7) === 0;
      const big = () => superT > 0;
      function pacPass(c, r) { if (!isCorr(c, r)) return false; if (doorClosed(c, r) && !big()) return false; return true; }
      function addScore(n, x, y) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += nextExtra === 30000 ? 70000 : 100000; A.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: .12 }); }
        if (score > hi) hi = score;
        if (x != null) popups.push({ x, y, s: String(n), t: 70 });
      }
      function speedScale() { return Math.min(1.25, 0.85 + level * 0.04); }

      function resetActors() {
        pac = { x: 112, y: FY + 24 * 8 + 4, dir: 1, want: 1, acc: 0, anim: 0, moving: true };
        // start between two tiles: snap to col 13 center
        pac.x = 13 * 8 + 4;
        ghosts = [0, 1, 2, 3].map(i => ({
          i, x: i === 0 ? 13 * 8 + 4 : [0, 13 * 8 + 4, 11 * 8 + 4, 15 * 8 + 4][i], y: i === 0 ? FY + 11 * 8 + 4 : FY + 14 * 8 + 4,
          dir: i === 0 ? 1 : 0, st: i === 0 ? 'out' : 'house', rel: [0, 60, 240, 420][i] * Math.max(0.3, 1 - level * 0.12), acc: 0, fr: false, flat: 0, bob: i * 7, rev: false
        }));
        superT = 0; frightT = 0; modeIdx = 0; modeT = 0;
        if (bonusStage) { ghosts = []; superT = 1e9; }
      }
      function startLevel() {
        bonusStage = level % 4 === 3;
        setupLevel(); resetActors();
        mazeImg = buildMaze(false); star = null; starDone = false; popups = [];
        bonusTime = bonusStage ? 30 * 60 : 0;
        state = 'ready'; tmr = 0;
        A.melody([[523, .12], [1047, .12], [784, .12], [659, .12], [1047, .06], [784, .18], [659, .24], [554, .12], [1109, .12], [831, .12], [698, .12], [1109, .06], [831, .18], [698, .24]], { type: 'square', vol: .1 });
      }
      function startGame() { score = 0; lives = 2; level = 1; nextExtra = 30000; startLevel(); }

      // ---------- frontier unlock ----------
      function reachable() {
        const seen = new Set(), st = [[tileX(pac.x), tileY(pac.y)]];
        const k = (c, r) => r * 64 + (c + 2);
        if (!isCorr(st[0][0], st[0][1])) return seen;
        seen.add(k(st[0][0], st[0][1]));
        while (st.length) {
          const [c, r] = st.pop();
          for (let d = 0; d < 4; d++) {
            let nc = c + DX[d]; const nr = r + DY[d];
            if (nr === 14) nc = ((nc % MC) + MC) % MC;
            if (!isCorr(nc, nr) || doorClosed(nc, nr) || seen.has(k(nc, nr))) continue;
            seen.add(k(nc, nr)); st.push([nc, nr]);
          }
        }
        return seen;
      }
      function frontier(seen) {
        const out = [];
        comps.forEach((cp, id) => {
          if (cp.open) return;
          for (const [c, r] of cp.doors) for (let d = 0; d < 4; d++) if (seen.has((r + DY[d]) * 64 + (c + DX[d] + 2))) { out.push(id); return; }
        });
        return out;
      }
      function openFrom(c, r, n) {
        const fr = frontier(reachable());
        fr.sort((a, b) => dist(comps[a], c, r) - dist(comps[b], c, r));
        for (let i = 0; i < Math.min(n, fr.length); i++) comps[fr[i]].open = true;
        return fr.length;
      }
      function dist(cp, c, r) { return Math.min(...cp.doors.map(([x, y]) => Math.abs(x - c) + Math.abs(y - r))); }
      function failsafe() {
        // if no key or super pellet is reachable but food remains locked away, open the frontier
        const seen = reachable();
        let any = false;
        for (let r = 0; r < MR && !any; r++) for (let c = 0; c < MC; c++) if (keys[r][c] && seen.has(r * 64 + c + 2)) { any = true; break; }
        if (!any) for (const p of pellets) if (p.kind === 'super' && !p.eaten && seen.has(p.r * 64 + p.c + 2)) any = true;
        if (!any) for (const id of frontier(seen)) comps[id].open = true;
      }

      // ---------- pac movement ----------
      function stepPac() {
        let want = -1;
        if (api.key('ArrowUp')) want = 0; else if (api.key('ArrowDown')) want = 2; else if (api.key('ArrowLeft')) want = 1; else if (api.key('ArrowRight')) want = 3;
        if (want >= 0) pac.want = want;
        const c = tileX(pac.x), r = tileY(pac.y);
        if (pac.want === ((pac.dir + 2) & 3)) pac.dir = pac.want;
        if (atCenter(pac)) {
          if (pacPass(c + DX[pac.want], r + DY[pac.want])) pac.dir = pac.want;
          if (!pacPass(c + DX[pac.dir], r + DY[pac.dir])) { pac.moving = false; return; }
        } else if (pac.want !== pac.dir && pac.want !== ((pac.dir + 2) & 3)) {
          // cornering: pre-turn when within 3px of the centre
          const offx = ((pac.x - 4) % 8 + 8) % 8, offy = ((pac.y - FY - 4) % 8 + 8) % 8;
          const horiz = pac.dir === 1 || pac.dir === 3;
          const off = horiz ? offx : offy;
          const toC = (pac.dir === 3 || pac.dir === 2) ? (8 - off) % 8 : off;
          const ct = horiz ? tileX(pac.x + (pac.dir === 3 ? toC : -toC)) : c;
          const rt = horiz ? r : tileY(pac.y + (pac.dir === 2 ? toC : -toC));
          if (toC <= 2 && pacPass(ct + DX[pac.want], rt + DY[pac.want])) { if (horiz) pac.x = ct * 8 + 4; else pac.y = FY + rt * 8 + 4; pac.dir = pac.want; }
        }
        pac.moving = true;
        pac.x += DX[pac.dir]; pac.y += DY[pac.dir];
        if (pac.x < -4) pac.x += 224; else if (pac.x >= 228) pac.x -= 224;
        pac.anim++;
        if (atCenter(pac)) eatAt(tileX(pac.x), tileY(pac.y));
      }
      function eatAt(c, r) {
        if (r < 0 || r >= MR || c < 0 || c >= MC) return;
        if (big()) { const d = doors[r][c]; if (d >= 0 && !comps[d].open) { comps[d].open = true; A.noise(0.15, { vol: 0.2, freq: 1500 }); addScore(0); } }
        if (food[r][c]) {
          food[r][c] = 0; foodLeft--;
          const lv = (level - 1) % FOODS.length;
          addScore(FOOD_VAL[lv] * (bonusStage ? 2 : 1));
          A.tone(foodLeft & 1 ? 520 : 390, 0.05, { type: 'triangle', vol: 0.12, slideTo: foodLeft & 1 ? 700 : 300 });
          if (!starDone && !bonusStage && foodLeft <= foodTotal / 2) { starDone = true; star = { t: 600, a: 0, b: 3 }; }
        }
        if (keys[r][c]) {
          keys[r][c] = 0; addScore(50);
          openFrom(c, r, 1);
          A.melody([[1568, .04], [2093, .06]], { type: 'square', vol: .12 });
          failsafe();
        }
        for (const p of pellets) if (!p.eaten && p.c === c && p.r === r) {
          p.eaten = true;
          if (p.kind === 'super') { superT = Math.max(300, 600 - level * 30); addScore(100); A.melody([[392, .06], [523, .06], [659, .06], [784, .06], [1047, .15]], { type: 'square', vol: .12 }); }
          else { frightT = Math.max(150, 480 - level * 30); eatChain = 0; for (const g of ghosts) if (g.st === 'out' || g.st === 'house') { g.fr = true; g.rev = true; } addScore(50); A.tone(200, 0.5, { type: 'sawtooth', vol: 0.1, slideTo: 600 }); }
        }
      }

      // ---------- ghosts ----------
      function ghostTarget(g) {
        const pc = tileX(pac.x), pr = tileY(pac.y);
        if (MODES[modeIdx] && (modeIdx & 1) === 0 && modeIdx < 7) return SCATTER[g.i];
        if (g.i === 0) return [pc, pr];
        if (g.i === 1) return [pc + DX[pac.dir] * 4, pr + DY[pac.dir] * 4];
        if (g.i === 2) { const b = ghosts[0] || g; const ax = pc + DX[pac.dir] * 2, ay = pr + DY[pac.dir] * 2; return [2 * ax - tileX(b.x), 2 * ay - tileY(b.y)]; }
        const d = Math.hypot(tileX(g.x) - pc, tileY(g.y) - pr);
        return d > 8 ? [pc, pr] : SCATTER[3];
      }
      function stepGhost(g) {
        if (g.st === 'house') {
          g.bob++; g.y = FY + 14 * 8 + 4 + (((g.bob >> 3) & 1) ? 1 : -1);
          if (tmr > g.rel) g.st = 'leave';
          return;
        }
        if (g.st === 'leave') {
          const tx = 13 * 8 + 4;
          if (g.x !== tx) g.x += g.x < tx ? 1 : -1;
          else if (g.y > FY + 11 * 8 + 4) g.y--;
          else { g.st = 'out'; g.dir = 1; }
          return;
        }
        if (g.st === 'enter') {
          if (g.y < FY + 14 * 8 + 4) g.y++; else { g.st = 'leave'; g.fr = false; }
          return;
        }
        // out or eyes: grid movement
        if (g.rev) { g.rev = false; g.dir = (g.dir + 2) & 3; }
        if (atCenter(g)) {
          const c = tileX(g.x), r = tileY(g.y);
          if (g.st === 'eyes' && c === 13 && r === 11) { g.st = 'enter'; return; }
          let target;
          if (g.st === 'eyes') target = [13, 11];
          else if (g.fr) target = null;
          else target = ghostTarget(g);
          const opts = [];
          for (let d = 0; d < 4; d++) { if (d === ((g.dir + 2) & 3)) continue; if (isCorr(c + DX[d], r + DY[d])) opts.push(d); }
          if (!opts.length) opts.push((g.dir + 2) & 3);
          if (!target) g.dir = opts[Math.floor(Math.random() * opts.length)];
          else {
            let bd = 1e9, best = opts[0];
            for (const d of opts) { const dd = (c + DX[d] - target[0]) ** 2 + (r + DY[d] - target[1]) ** 2; if (dd < bd) { bd = dd; best = d; } }
            g.dir = best;
          }
        }
        g.x += DX[g.dir]; g.y += DY[g.dir];
        if (g.x < -4) g.x += 224; else if (g.x >= 228) g.x -= 224;
      }
      function ghostSpeed(g) {
        if (g.st === 'eyes' || g.st === 'enter') return 2;
        if (g.st === 'house' || g.st === 'leave') return 0.6;
        if (g.flat > 0) return 0;
        const r = tileY(g.y), c = tileX(g.x);
        if (r === 14 && (c < 6 || c > 21)) return 0.5;
        if (g.fr) return 0.55;
        let s = 0.9 * speedScale();
        if (g.i === 0 && foodLeft < foodTotal * 0.2) s *= 1.08;
        return s;
      }

      function die() {
        state = 'dying'; tmr = 0;
        A.melody([[988, .1], [932, .1], [880, .1], [831, .1], [784, .1], [740, .1], [698, .1], [659, .2], [0, .1], [440, .08], [440, .08]], { type: 'square', vol: .12 });
      }

      function updatePlay() {
        tmr++;
        if (freezeT > 0) { freezeT--; return; }
        // mode timer
        if (frightT <= 0) { modeT++; if (modeT > MODES[modeIdx] * 60) { modeT = 0; modeIdx = Math.min(7, modeIdx + 1); for (const g of ghosts) if (g.st === 'out') g.rev = true; } }
        if (superT > 0 && !bonusStage) { superT--; if (superT === 90) A.tone(300, 0.4, { vol: 0.1, slideTo: 150 }); }
        if (frightT > 0) { frightT--; if (frightT === 0) for (const g of ghosts) g.fr = false; }
        // pac speed
        let sp = 1.0 * Math.min(1.15, 0.95 + level * 0.03);
        if (big() && (api.key('Space') || api.key('KeyX'))) sp = 2.2;
        else if (big()) sp *= 1.15;
        pac.acc += sp;
        while (pac.acc >= 1) { pac.acc--; stepPac(); }
        if (big() && (api.frame & 7) === 0) A.tone(api.frame & 8 ? 180 : 150, 0.06, { type: 'sawtooth', vol: 0.05 });
        // ghosts
        for (const g of ghosts) {
          if (g.flat > 0) { g.flat--; continue; }
          g.acc += ghostSpeed(g);
          while (g.acc >= 1) { g.acc--; stepGhost(g); }
        }
        if (frightT > 0 && (api.frame % 16) === 0) A.tone(api.frame & 16 ? 400 : 300, 0.08, { type: 'triangle', vol: 0.06 });
        // collisions
        const R = big() ? 11 : 6;
        for (const g of ghosts) {
          if (g.st === 'eyes' || g.st === 'enter' || g.st === 'house' || g.st === 'leave') continue;
          if (Math.abs(g.x - pac.x) < R + 1 && Math.abs(g.y - pac.y) < R + 1) {
            if (g.fr) {
              g.st = 'eyes'; g.fr = false; g.flat = 0;
              const pts = [200, 400, 800, 1600][Math.min(3, eatChain++)];
              addScore(pts, g.x, g.y - 6); freezeT = 30;
              A.tone(200, 0.3, { vol: 0.14, slideTo: 1600 });
            } else if (big()) {
              if (g.flat <= 0) { g.flat = 90; A.tone(120, 0.12, { type: 'square', vol: 0.14, slideTo: 60 }); }
            } else if (g.flat <= 0) { die(); return; }
          }
        }
        // star
        if (star) {
          star.t--; if ((star.t & 7) === 0) { star.a = (star.a + 1) % 8; if ((star.t & 15) === 0) star.b = (star.b + 3) % 8; }
          if (star.t <= 0) star = null;
          else if (Math.abs(pac.x - 112) < R + 3 && Math.abs(pac.y - (FY + 20 * 8 + 4)) < R + 3) {
            const lv = (level - 1) % 8;
            const pts = star.a === star.b ? (star.a === lv ? 5000 : 2000) : 500;
            addScore(pts, 112, FY + 20 * 8 - 4); star = null;
            A.melody([[1319, .06], [1568, .06], [2093, .06], [2637, .15]], { type: 'square', vol: .13 });
          }
        }
        if (bonusStage) { bonusTime--; if (bonusTime <= 0) { state = 'clear'; tmr = 0; return; } }
        if (foodLeft <= 0) {
          if (bonusStage) addScore(Math.floor(bonusTime / 60) * 100, 112, FY + 14 * 8);
          state = 'clear'; tmr = 0; A.melody([[784, .08], [988, .08], [1175, .08], [1568, .25]], { type: 'square', vol: .12 });
        }
        if ((tmr % 120) === 0) failsafe();
      }

      function tryStart() { if (api.useCredit()) { startGame(); return; } coinFlash = 90; A.tone(80, 0.25, { vol: 0.2 }); }

      function update() {
        if (coinFlash > 0) coinFlash--;
        if (popups.length) { for (const p of popups) p.t--; popups = popups.filter(p => p.t > 0); }
        if (state === 'title') {
          tmr++; attractT++;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (state === 'ready') { if (++tmr > 150) { state = 'play'; tmr = 0; } return; }
        if (state === 'play') { updatePlay(); return; }
        if (state === 'dying') {
          tmr++;
          if (tmr === 150) {
            const respawn = () => { resetActors(); state = 'ready'; tmr = 60; };
            if (lives > 0) { lives--; respawn(); }
            else {
              state = 'wait';
              const over = () => { state = 'gameover'; tmr = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 2; respawn(); }, over); else over();
            }
          }
          return;
        }
        if (state === 'clear') {
          tmr++;
          if (tmr < 120 && (tmr % 15) === 0) mazeImg = buildMaze(((tmr / 15) & 1) === 1);
          if (tmr === 130) { level++; startLevel(); }
          return;
        }
        if (state === 'gameover') { if (++tmr > 200) { state = 'title'; tmr = 0; attractT = 0; } return; }
      }

      // ---------- render ----------
      function drawGhost(ctx, g) {
        const f = (api.frame >> 3) & 1;
        const x = Math.round(g.x) - 7, y = Math.round(g.y) - 7;
        if (g.st === 'eyes' || g.st === 'enter') { drawEyes(ctx, g.x, g.y, g.dir); return; }
        let img = SPR_G[g.i][f];
        if (g.fr) img = frightT < 120 && ((frightT >> 3) & 1) ? SPR_FW[f] : SPR_FR[f];
        if (g.flat > 0) { ctx.drawImage(img, 0, 0, 14, 14, x, y + 9, 14, 5); return; }
        ctx.drawImage(img, x, y);
        if (g.fr) { ctx.fillStyle = '#ffd0a0'; ctx.fillRect(x + 4, y + 5, 2, 2); ctx.fillRect(x + 8, y + 5, 2, 2); ctx.fillRect(x + 3, y + 10, 8, 1); }
        else drawEyes(ctx, g.x, g.y, g.dir);
      }
      function drawEyes(ctx, gx, gy, d) {
        const x = Math.round(gx) - 7, y = Math.round(gy) - 7;
        ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y + 3, 4, 5); ctx.fillRect(x + 8, y + 3, 4, 5);
        ctx.fillStyle = '#2030ff';
        const ox = DX[d] * 1 + 1, oy = DY[d] * 2 + 2;
        ctx.fillRect(x + 2 + ox, y + 3 + oy, 2, 2); ctx.fillRect(x + 8 + ox, y + 3 + oy, 2, 2);
      }
      function drawPac(ctx) {
        if (state === 'dying') {
          if (tmr < 30) { ctx.drawImage(SPR_PAC[0][pac.dir][0], pac.x - 6, pac.y - 6); return; }
          const i = Math.floor((tmr - 30) / 9);
          if (i < SPR_PACDIE.length) ctx.drawImage(SPR_PACDIE[i], pac.x - 6, pac.y - 6);
          else if (i < SPR_PACDIE.length + 2) { ctx.fillStyle = '#ffe000'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(pac.x + Math.round(Math.cos(a) * 6), pac.y + Math.round(Math.sin(a) * 6), 1, 1); } }
          return;
        }
        const o = pac.moving ? [0, 1, 2, 1][(pac.anim >> 1) & 3] : 1;
        const g = big() ? 1 : 0, R = g ? 12 : 6;
        if (g && superT < 90 && !bonusStage && ((superT >> 2) & 1)) { ctx.drawImage(SPR_PAC[0][pac.dir][o], pac.x - 6, pac.y - 6); return; }
        ctx.drawImage(SPR_PAC[g][pac.dir][o], pac.x - R, pac.y - R);
        if (pac.x < 12) ctx.drawImage(SPR_PAC[g][pac.dir][o], pac.x + 224 - R, pac.y - R);
        if (pac.x > 212) ctx.drawImage(SPR_PAC[g][pac.dir][o], pac.x - 224 - R, pac.y - R);
      }
      function drawField(ctx) {
        ctx.drawImage(mazeImg, 0, FY);
        const lv = (level - 1) % FOODS.length;
        for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
          const x = c * 8, y = FY + r * 8;
          if (food[r][c]) ctx.drawImage(SPR_FOOD[lv], x, y);
          if (keys[r][c]) ctx.drawImage(SPR_KEY, x, y);
          const d = doors[r][c];
          if (d >= 0 && !comps[d].open) {
            const horiz = isCorr(c - 1, r) || isCorr(c + 1, r);
            ctx.fillStyle = '#ff80c0';
            if (horiz) { ctx.fillRect(x + 3, y - 2, 2, 12); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y + 3, 2, 2); }
            else { ctx.fillRect(x - 2, y + 3, 12, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y + 3, 2, 2); }
          }
        }
        const pulse = (api.frame >> 3) & 1;
        for (const p of pellets) {
          if (p.eaten) continue;
          const x = p.c * 8 + 4, y = FY + p.r * 8 + 4;
          if (p.kind === 'super') { const R = 4 + pulse; ctx.fillStyle = '#40ff40'; for (let dy = -R; dy <= R; dy++) { const w = Math.round(Math.sqrt(R * R - dy * dy)); ctx.fillRect(x - w, y + dy, 2 * w, 1); } ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 2, 2, 2); }
          else if (pulse) { const R = 4; ctx.fillStyle = '#ffb8ae'; for (let dy = -R; dy <= R; dy++) { const w = Math.round(Math.sqrt(R * R - dy * dy)); ctx.fillRect(x - w, y + dy, 2 * w, 1); } }
        }
        if (star) {
          const x = 112, y = FY + 20 * 8 + 4;
          ctx.fillStyle = (api.frame >> 2) & 1 ? '#ffff40' : '#ff8040';
          ctx.fillRect(x - 1, y - 6, 2, 12); ctx.fillRect(x - 6, y - 1, 12, 2); ctx.fillRect(x - 3, y - 3, 6, 6);
          ctx.fillRect(x - 5, y + 4, 2, 2); ctx.fillRect(x + 3, y + 4, 2, 2);
          ctx.drawImage(SPR_FOOD[star.a], 88, y - 4); ctx.drawImage(SPR_FOOD[star.b], 129, y - 4);
        }
      }
      function drawHUD(ctx) {
        txt(ctx, '1UP', 24, 0, '#ffffff'); txt(ctx, String(score).padStart(7, ' '), 0, 9, '#ffffff');
        txt(ctx, 'HIGH SCORE', W / 2 + 8, 0, '#ffffff', 1, 'c'); txt(ctx, String(hi).padStart(7, ' '), 76, 9, '#ffffff');
        if (state !== 'title') {
          for (let i = 0; i < Math.min(5, lives); i++) ctx.drawImage(SPR_PAC[0][1][1], 16 + i * 16, H - 15);
          const n = Math.min(7, level);
          for (let i = 0; i < n; i++) ctx.drawImage(SPR_FOOD[(level - 1 - i) % 8], W - 16 - i * 10, H - 13);
        } else txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, H - 10, '#ffffff');
      }
      function drawTitle(ctx) {
        const page = Math.floor(attractT / 480) % 2;
        txt(ctx, 'SUPER', W / 2, 40, '#ffe000', 3, 'c');
        txt(ctx, 'PAC-MAN', W / 2, 68, '#ffe000', 3, 'c');
        if (page === 0) {
          const names = [['AKABEI', '"BLINKY"'], ['PINKY', '"PINKY"'], ['AOSUKE', '"INKY"'], ['GUZUTA', '"CLYDE"']];
          txt(ctx, 'CHARACTER / NICKNAME', 32, 104, '#ffffff');
          for (let i = 0; i < 4; i++) {
            if (attractT % 480 < 40 + i * 40) break;
            ctx.drawImage(SPR_G[i][(api.frame >> 3) & 1], 16, 118 + i * 18);
            drawEyes(ctx, 23, 125 + i * 18, 3);
            txt(ctx, '-' + names[i][0], 40, 122 + i * 18, GCOL[i]); txt(ctx, names[i][1], 128, 122 + i * 18, GCOL[i]);
          }
        } else {
          ctx.drawImage(SPR_KEY, 48, 110); txt(ctx, 'KEY OPENS DOORS', 64, 110, '#ffd020');
          ctx.fillStyle = '#40ff40'; ctx.fillRect(48, 128, 8, 8); txt(ctx, 'SUPER = GIANT PAC', 64, 129, '#40ff40');
          ctx.fillStyle = '#ffb8ae'; ctx.fillRect(49, 148, 6, 6); txt(ctx, 'POWER = EAT GHOSTS', 64, 148, '#ffb8ae');
          txt(ctx, 'HOLD SPACE FOR SPEED', 32, 168, '#ffffff');
          for (let i = 0; i < 8; i++) ctx.drawImage(SPR_FOOD[i], 40 + i * 18, 186);
        }
        const blink = (attractT >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) txt(ctx, 'INSERT COIN', W / 2, 214, '#ff4040', 1, 'c'); }
        else if (blink) txt(ctx, api.credits > 0 ? 'PUSH START BUTTON' : 'INSERT COIN', W / 2, 214, '#ffb050', 1, 'c');
        txt(ctx, 'BONUS PAC-MAN FOR 30000 PTS', W / 2, 232, '#ffb8ae', 1, 'c');
        txt(ctx, '\u00a9 1982 NAMCO', W / 2, 250, '#ff80c0', 1, 'c');
        // little chase
        const t = attractT % 300, px = 240 - t * 1.1;
        ctx.drawImage(SPR_PAC[0][1][(attractT >> 2) % 3], Math.round(px), 192 + 64);
        for (let i = 0; i < 4; i++) ctx.drawImage(SPR_G[i][(api.frame >> 3) & 1], Math.round(px + 24 + i * 16), 191 + 64);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawField(ctx);
        if (!(state === 'dying' && tmr > 30) && state !== 'clear') for (const g of ghosts) drawGhost(ctx, g);
        drawPac(ctx);
        for (const p of popups) txt(ctx, p.s, p.x, p.y, '#40ffff', 1, 'c');
        drawHUD(ctx);
        if (bonusStage && state === 'play') txt(ctx, 'TIME ' + Math.ceil(bonusTime / 60), W / 2, FY + 14 * 8 + 1, '#ffffff', 1, 'c');
        if (state === 'ready') {
          if (bonusStage) txt(ctx, 'BONUS STAGE', W / 2, FY + 14 * 8 + 1, '#40ff40', 1, 'c');
          txt(ctx, 'READY!', W / 2, FY + 17 * 8 + 1, '#ffe000', 1, 'c');
        }
        if (state === 'gameover') txt(ctx, 'GAME  OVER', W / 2, FY + 17 * 8 + 1, '#ff2020', 1, 'c');
      }
      setupLevel(); resetActors(); mazeImg = buildMaze(false);
      return { update, render, destroy() { } };
    }
  });
})();
