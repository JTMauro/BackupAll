// Q*bert (Gottlieb, 1982) — faithful browser recreation for Arcade Games Galore.
(function () {
  'use strict';
  const W = 256, H = 240;
  // ================= Bitmap font (5x7, drawn bold into 8px cells) =================
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
    '?': '0E110102040004', '@': '0E11171517100E', '#': '0A0A1F0A1F0A0A', '©': '0E11171417110E',
    '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408', '=': '00001F001F0000',
    '>': '08040201020408', '<': '02040810080402', '&': '0C12140815120D', '*': '0004150E150400',
    '+': '0004041F040400', '%': '18190204081303'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function txt(ctx, s, x, y, col) {
    ctx.fillStyle = col; s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * 8 + c, y + r, 2, 1); }
    }
  }
  const tile = (ctx, s, col, row, color) => txt(ctx, s, col * 8, row * 8, color);
  // tiny 3x5 digits for score pop-ups
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, cy - 2 + r, 1, 1); } x += 4; }
  }

  // ================= Sprite helpers =================
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  // rotate string-array art: dir 0 up,1 left,2 down,3 right (art is drawn facing right)
  function orient(rows, dir) {
    const n = rows.length; const g = rows.map(r => r.split(''));
    const out = [];
    for (let y = 0; y < n; y++) { let s = ''; for (let x = 0; x < n; x++) {
      let ch;
      if (dir === 3) ch = g[y][x];
      else if (dir === 1) ch = g[y][n - 1 - x];
      else if (dir === 2) ch = g[x][y];          // transpose: right -> down
      else ch = g[n - 1 - x][y];                 // up
      s += ch; } out.push(s); }
    return out;
  }

  // ================= Sprites (hand drawn) =================
  const Q_PAL = { o: '#FF7A00', d: '#A83800', h: '#FFB060', w: '#FFFFFF', k: '#000000' };
  // facing down-right (towards viewer) and up-right (back view); left versions are mirrored
  const Q_DR = [
    '...oooooo.......',
    '.ohhoooooooo....',
    '.hoowwwoowwwo...',
    'ohoowwwwowwwwo..',
    'ooooowwkkowwkko.',
    'ooooowwkkowwkko.',
    'ooooooowwoowwoo.',
    'oooooooooooooooo',
    '.ooooooooooooooo',
    '.oooooooooooodkd',
    '..oooooooo..dkkd',
    '...ooooood...dd.',
    '....o...o.......',
    '....o...o.......',
    '...ddo.ddo......',
    '..kkk..kkk......'];
  const Q_UR = [
    '...........ddd..',
    '..........dkkkd.',
    '....oooooodkkdo.',
    '..ohhoooooodooo.',
    '.ohoooooooooooo.',
    '.hooooooooooooo.',
    'ohooooooooooooo.',
    'oooooooooooooo..',
    'oooooooooooooo..',
    'ooooooooooooodd.',
    '.oooooooooooodd.',
    '..ooooooooodd...',
    '....o...o.......',
    '....o...o.......',
    '...ddo.ddo......',
    '..kkk..kkk......'];
  const Q_JUMP_LEGS = ['....oo.oo.......', '...kk...kk......', '................', '................'];
  const COILY_PAL = { p: '#B040E0', P: '#701890', h: '#E0A0FF', w: '#FFFFFF', k: '#000000', r: '#FF2020' };
  const COILY = [
    '.....pppppp.....',
    '....phwwpwwpp...',
    '....pwwkpwwkp...',
    '....pwwkpwwkp...',
    '....ppppppppp...',
    '.....prrrrrp....',
    '.....pwrrrwp....',
    '......ppppp.....',
    '.......ppp......',
    '.....hpppppp....',
    '....pPPPPPPPp...',
    '.....ppppppp....',
    '......ppppp.....',
    '.....hpppppp....',
    '....pPPPPPPPp...',
    '.....ppppppp....',
    '......ppppp.....',
    '.....hpppppp....',
    '....pPPPPPPPp...',
    '...hppppppppp...',
    '..pppPPPPPPPpp..',
    '...ppppppppppp..',
    '....PPP...PPP...',
    '................'];
  const COILY_UP = COILY.map((r, i) => i === 2 || i === 3 ? '....pwkwpwkwp...' : r);
  const BALL = ['....xxxx....', '..xxxxxxxx..', '.xxhhxxxxxx.', '.xhhxxxxxxx.', 'xxhxxxxxxxxx', 'xxxxxxxxxxxx', 'xxxxxxxxxxxd', 'xxxxxxxxxxxd', '.xxxxxxxxxd.', '.xxxxxxxxdd.', '..xxxxxddd..', '....dddd....'];
  const BALL_SQ = ['............', '............', '............', '....xxxx....', '.xxxhhxxxxx.', 'xxhhxxxxxxxx', 'xhxxxxxxxxxd', 'xxxxxxxxxxxd', 'xxxxxxxxxxdd', '.xxxxxxxxdd.', '..xxxxdddd..', '....dddd....'];
  const SAM_PAL = { g: '#30D030', G: '#108010', w: '#FFFFFF', k: '#000000', y: '#FFE000', r: '#FF4040' };
  const SAM = [
    '.....GGGG.......',
    '....GGGGGG......',
    '...GGggggGG.....',
    '...gwwggwwg.....',
    '...gwkggwkg.....',
    '...gggrrggg.....',
    '....gggggg......',
    '..g.gggggg.g....',
    '..gggggggggg....',
    '....gggggg......',
    '....gggggg......',
    '....gg..gg......',
    '....gg..gg......',
    '...yyy..yyy.....',
    '................',
    '................'];
  const SLICK = SAM.map((r, i) => i === 3 ? '...gkkkkkkg.....' : i === 4 ? '...gkkggkkg.....' : r);
  const UGG_PAL = { p: '#C050C0', P: '#802080', w: '#FFFFFF', k: '#000000', y: '#FFE000' };
  // Ugg / Wrongway drawn standing upright; rotated onto the cube sides at draw time
  const UGG = [
    '....PPPPPP......',
    '...PppppppP.....',
    '..PpwwppwwpP....',
    '..PpwkppwkpP....',
    '..Pppppppppp....',
    '..PpppPPpppP....',
    '...ppPkkPpp.....',
    '...pppppppp.....',
    '..pppppppppp....',
    '.ppPppppppPpp...',
    '.pp.pppppp.pp...',
    '....pppppp......',
    '....pp..pp......',
    '....pp..pp......',
    '...yyy..yyy.....',
    '................'];
  const DISC_PAL = ['#FF2020', '#FFE000', '#20E020', '#2080FF', '#FF40FF'];
  const DISC = ['....aaaaaaaa....', '..aabbbbbbbbaa..', '.abbccccccccbba.', 'abccddddddddccba', 'abccddddddddccba', '.abbccccccccbba.', '..aabbbbbbbbaa..', '....aaaaaaaa....'];

  function flipH(rows) { return rows.map(r => r.split('').reverse().join('')); }
  function rotCW(rows) { const h = rows.length, w = rows[0].length, out = []; for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x]; out.push(s); } return out; }
  function rotCCW(rows) { const h = rows.length, w = rows[0].length, out = []; for (let x = w - 1; x >= 0; x--) { let s = ''; for (let y = 0; y < h; y++) s += rows[y][x]; out.push(s); } return out; }

  // ================= Pyramid geometry =================
  const PX = 128, PY = 44, ROWS = 7;
  const cellPos = (r, c) => ({ x: PX + (c - r / 2) * 32, y: PY + r * 24 });
  const valid = (r, c) => r >= 0 && r < ROWS && c >= 0 && c <= r;
  const DIRS = [[-1, -1], [-1, 0], [1, 0], [1, 1]]; // UL, UR, DL, DR
  // colour schemes: [start, mid, target, left side, right side]
  const SCHEMES = [
    ['#2828D8', '#C048C0', '#E8E800', '#A87048', '#384858'],
    ['#E8E800', '#20B8B8', '#2828D8', '#787878', '#383838'],
    ['#D82828', '#E8E800', '#38C038', '#B8B8B8', '#585858'],
    ['#38A8D8', '#F8F8F8', '#D86830', '#2858A8', '#183060'],
    ['#808080', '#E8A0A0', '#F8F8F8', '#A85030', '#582810'],
    ['#38C038', '#2828D8', '#D82828', '#C8A060', '#705030'],
    ['#C848C8', '#E8E800', '#38A8D8', '#585858', '#282828'],
    ['#F8F8F8', '#D86830', '#2828D8', '#38C038', '#106010']
  ];
  const N = { C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5 };

  ArcadeRegistry.register({
    id: 'qbert', title: 'Q*bert', year: 1982, maker: 'Gottlieb',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows = diagonals: ↑ up-right · → down-right · ↓ down-left · ← up-left · Enter: start',
    marquee: { bg: '#000', fg: '#FF7A00', accent: '#2828D8' },
    create(api) {
      const A = api.audio;
      const Qspr = {}; // [face] stand / jump ; faces 0 UL,1 UR,2 DL,3 DR
      const legsJump = rows => rows.slice(0, 12).concat(Q_JUMP_LEGS);
      Qspr.stand = [sprite(flipH(Q_UR), Q_PAL), sprite(Q_UR, Q_PAL), sprite(flipH(Q_DR), Q_PAL), sprite(Q_DR, Q_PAL)];
      Qspr.jump = [sprite(flipH(legsJump(Q_UR)), Q_PAL), sprite(legsJump(Q_UR), Q_PAL), sprite(flipH(legsJump(Q_DR)), Q_PAL), sprite(legsJump(Q_DR), Q_PAL)];
      const COIL = [sprite(flipH(COILY), COILY_PAL), sprite(COILY, COILY_PAL), sprite(flipH(COILY_UP), COILY_PAL), sprite(COILY_UP, COILY_PAL)];
      const BALLS = {}, BALLS_SQ = {};
      for (const [k, c, d, h] of [['red', '#FF2020', '#900000', '#FFA0A0'], ['green', '#30E030', '#107010', '#B0FFB0'], ['purple', '#B040E0', '#601880', '#E0A0FF']]) {
        BALLS[k] = sprite(BALL, { x: c, d, h }); BALLS_SQ[k] = sprite(BALL_SQ, { x: c, d, h });
      }
      const SAMS = { sam: [sprite(flipH(SAM), SAM_PAL), sprite(SAM, SAM_PAL)], slick: [sprite(flipH(SLICK), SAM_PAL), sprite(SLICK, SAM_PAL)] };
      const UGGS = { wrongway: sprite(rotCW(UGG), UGG_PAL), ugg: sprite(rotCCW(UGG), UGG_PAL) };
      const ARROW_R = sprite(['w....', 'ww...', 'www..', 'wwww.', 'www..', 'ww...', 'w....'], { w: '#FFFFFF' });
      const ARROW_L = sprite(['....w', '...ww', '..www', '.wwww', '..www', '...ww', '....w'], { w: '#FFFFFF' });
      const DISCS = [0, 1, 2, 3].map(i => sprite(DISC, { a: DISC_PAL[i % 5], b: DISC_PAL[(i + 1) % 5], c: DISC_PAL[(i + 2) % 5], d: DISC_PAL[(i + 3) % 5] }));

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, level = 1, round = 1, nextExtra = 8000, roundsDone = 0;
      let cubes = new Uint8Array(28), steps = 2, revert = 'none', scheme = SCHEMES[0];
      let q, enemies = [], discs = [], popups = [], freezeT = 0, spawnT = 0, spawnCount = 0, balloon = 0;

      const cubeIdx = (r, c) => r * (r + 1) / 2 + c;
      function setupRound() {
        const L = Math.min(level, 5);
        steps = (L === 2 || L === 4) ? 3 : 2;
        revert = L === 3 || L === 5 ? 'toggle' : L === 4 ? 'back' : 'none';
        scheme = SCHEMES[((level - 1) * 4 + round - 1) % SCHEMES.length];
        cubes.fill(0);
        const nd = level === 1 ? 2 : Math.min(2 + Math.floor(round / 2), 4);
        const rowsAvail = [1, 2, 3, 4, 5]; discs = [];
        for (let i = 0; i < nd; i++) {
          const side = i % 2 === 0 ? 'L' : 'R';
          const r = rowsAvail.splice(Math.floor(((level * 7 + round * 3 + i * 5) % rowsAvail.length)), 1)[0];
          discs.push({ side, r, used: false });
        }
        resetLife(); spawnCount = 0;
      }
      function resetLife() {
        q = { r: 0, c: 0, face: 3, state: 'stand', t: 0, x: 0, y: 0, rest: 0 };
        placeQ(); enemies = []; freezeT = 0; spawnT = 100; balloon = 0;
      }
      function placeQ() { const p = cellPos(q.r, q.c); q.x = p.x; q.y = p.y; }
      function startGame() { score = 0; lives = 3; level = 1; round = 1; nextExtra = 8000; roundsDone = 0; setupRound(); state = 'intro'; T = 0; }
      function addScore(n) { score += n; if (score > hi) hi = score; if (score >= nextExtra) { lives++; nextExtra += 14000; A.melody([[N.C6, .08], [N.G5, .08], [N.C6, .08], [N.G5, .08], [N.C6, .2]], { type: 'square', vol: 0.08 }); } }
      function discAt(r, c) { for (const d of discs) if (!d.used && d.r === r && ((d.side === 'L' && c === -1) || (d.side === 'R' && c === r + 1))) return d; return null; }

      // ---------- sounds ----------
      const sHop = () => A.tone(320, 0.07, { type: 'square', vol: 0.07, slideTo: 640 });
      const sLand = () => A.tone(180, 0.05, { type: 'triangle', vol: 0.12, slideTo: 120 });
      const sBall = () => A.tone(140, 0.06, { type: 'square', vol: 0.07, slideTo: 90 });
      const sCoily = () => A.tone(500, 0.06, { type: 'square', vol: 0.06, slideTo: 300 });
      function sCurse() { // Q*bert's synthesised gibberish
        for (let i = 0; i < 14; i++) { const f = 180 + Math.random() * 700; A.tone(f, 0.06, { type: i % 2 ? 'square' : 'sawtooth', vol: 0.09, slideTo: f * (0.6 + Math.random() * 0.9), delay: i * 0.055 }); }
        A.noise(0.12, { vol: 0.08, freq: 2500, type: 'bandpass', delay: 0.3 });
      }

      // ---------- jumping ----------
      function startJump(ent, r, c, dur) {
        const a = { x: ent.x, y: ent.y }, b = cellPos(r, c);
        ent.state = 'jump'; ent.t = 0; ent.dur = dur; ent.ax = a.x; ent.ay = a.y; ent.bx = b.x; ent.by = b.y; ent.tr = r; ent.tc = c;
      }
      function stepJump(ent) {
        ent.t++; const k = Math.min(1, ent.t / ent.dur);
        const up = ent.by < ent.ay;
        ent.x = ent.ax + (ent.bx - ent.ax) * k;
        // down hops rise first, up hops arc higher
        ent.y = ent.ay + (ent.by - ent.ay) * (up ? Math.sqrt(k) : k * k) - Math.sin(Math.PI * k) * (up ? 10 : 12);
        return k >= 1;
      }

      // ---------- Q*bert ----------
      function updateQ() {
        if (q.state === 'stand') {
          if (q.rest > 0) { q.rest--; return; }
          const keys = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight']; // UL, UR, DL, DR
          for (let d = 0; d < 4; d++) if (api.key(keys[d])) {
            q.face = d; const nr = q.r + DIRS[d][0], nc = q.c + DIRS[d][1];
            sHop(); startJump(q, nr, nc, 16); q.off = !valid(nr, nc); q.behind = q.off && d < 2;
            return;
          }
        } else if (q.state === 'jump') {
          if (stepJump(q)) {
            const r = q.tr, c = q.tc;
            if (valid(r, c)) { q.r = r; q.c = c; q.state = 'stand'; q.rest = 3; sLand(); landCube(r, c); checkUggs(); }
            else {
              const d = discAt(r, c);
              if (d) { d.used = true; q.state = 'disc'; q.t = 0; q.disc = d; q.dx0 = q.x; q.dy0 = q.y; A.melody([[N.C5, .06], [N.E5, .06], [N.G5, .06], [N.C6, .06], [N.E5, .06], [N.G5, .06], [N.C6, .06], [N.E5 * 2, .3]], { type: 'square', vol: 0.06 });
                for (const e of enemies) if (e.type !== 'coily') e.gone = true; }
              else { q.state = 'fall'; q.vy = 1; A.tone(1200, 1.0, { type: 'square', vol: 0.07, slideTo: 150 }); }
            }
          }
        } else if (q.state === 'disc') {
          q.t++; const k = Math.min(1, q.t / 100), top = cellPos(0, 0);
          q.x = q.dx0 + (top.x - q.dx0) * k; q.y = q.dy0 + (top.y - 34 - q.dy0) * k;
          if (k >= 1) { q.state = 'drop'; q.t = 0; }
        } else if (q.state === 'drop') {
          q.y += 2; const top = cellPos(0, 0);
          if (q.y >= top.y) { q.y = top.y; q.r = 0; q.c = 0; q.state = 'stand'; q.face = 3; q.rest = 6; sLand(); landCube(0, 0); }
        } else if (q.state === 'fall') {
          q.vy = Math.min(q.vy + 0.25, 5); q.y += q.vy;
          if (q.y > H + 30) { state = 'fell'; T = 0; }
        }
      }
      function landCube(r, c) {
        const i = cubeIdx(r, c), v = cubes[i];
        if (v < steps - 1) { cubes[i] = v + 1; addScore(25); }
        else if (revert === 'toggle') cubes[i] = 0;
        else if (revert === 'back') cubes[i] = steps - 2;
        if (cubes.every(x => x === steps - 1)) { state = 'complete'; T = 0; A.melody([[N.C5, .08], [N.E5, .08], [N.G5, .08], [N.C6, .08], [N.G5, .08], [N.C6, .08], [N.E5 * 2, .08], [N.G5 * 2, .3]], { type: 'square', vol: 0.08 }); }
      }

      // ---------- enemies ----------
      function enemyRest() { return Math.max(10, 34 - (level - 1) * 4 - (round - 1) * 2); }
      function spawn() {
        if (enemies.length >= 4) return;
        const has = t => enemies.some(e => e.type === t || (t === 'coily' && e.type === 'purple'));
        let type = 'red';
        const roll = Math.random();
        if (spawnCount >= 1 && !has('coily') && roll < 0.45) type = 'purple';
        else if ((level >= 2 || round >= 2) && roll < 0.55 && !has('green')) type = 'green';
        else if ((level >= 2 || round >= 3) && roll < 0.68 && !has('sam') && !has('slick')) type = Math.random() < 0.5 ? 'sam' : 'slick';
        else if (level >= 2 && roll < 0.8 && !has('ugg')) type = 'ugg';
        else if (level >= 2 && roll < 0.92 && !has('wrongway')) type = 'wrongway';
        else if (enemies.filter(e => e.type === 'red').length >= 2) return;
        spawnCount++;
        if (type === 'ugg' || type === 'wrongway') {
          const e = { type, r: 6, c: type === 'ugg' ? 6 : 0, state: 'enter', t: 0, rest: 30 };
          const p = uggPos(e.r, e.c, type); e.x = p.x + (type === 'ugg' ? 40 : -40); e.y = p.y; e.tx = p.x; enemies.push(e); return;
        }
        const c = Math.random() < 0.5 ? 0 : 1, p = cellPos(1, c);
        enemies.push({ type, r: 1, c, x: p.x, y: -20, ty: p.y, state: 'drop', t: 0, rest: 0, face: 3 });
      }
      function uggPos(r, c, type) { const p = cellPos(r, c); return type === 'wrongway' ? { x: p.x - 8, y: p.y + 12 } : { x: p.x + 8, y: p.y + 12 }; }
      function dangerCell(e) { return e.type === 'wrongway' ? [e.r + 1, e.c] : [e.r + 1, e.c + 1]; }
      function checkUggs() {
        for (const e of enemies) if ((e.type === 'ugg' || e.type === 'wrongway') && e.state === 'stand') { const [dr, dc] = dangerCell(e); if (dr === q.r && dc === q.c) die(); }
      }
      function updateEnemy(e) {
        if (e.state === 'drop') { e.y += 4; if (e.y >= e.ty) { e.y = e.ty; e.state = 'stand'; e.rest = enemyRest(); e.squash = 6; sBall(); } return; }
        if (e.state === 'fall') { e.vy = Math.min((e.vy || 1) + 0.25, 5); e.y += e.vy; if (e.y > H + 30) e.gone = true; return; }
        if (e.squash > 0) e.squash--;
        if (e.type === 'ugg' || e.type === 'wrongway') {
          if (e.state === 'enter') { e.x += e.x < e.tx ? 1.5 : -1.5; if (Math.abs(e.x - e.tx) < 2) { e.state = 'stand'; e.rest = enemyRest(); } return; }
          if (e.state === 'jump') {
            e.t++; const k = Math.min(1, e.t / 16); e.x = e.ax + (e.bx - e.ax) * k; e.y = e.ay + (e.by - e.ay) * k;
            if (e.type === 'wrongway') e.x -= Math.sin(Math.PI * k) * 8; else e.x += Math.sin(Math.PI * k) * 8;
            if (k >= 1) { e.r = e.tr; e.c = e.tc; if (!valid(e.r, e.c)) { e.gone = true; return; } e.state = 'stand'; e.rest = enemyRest() + 6; sBall(); const [dr, dc] = dangerCell(e); if (dr === q.r && dc === q.c && q.state === 'stand') die(); }
            return;
          }
          if (--e.rest > 0) return;
          const opts = e.type === 'wrongway' ? [[0, 1], [-1, 0]] : [[0, -1], [-1, -1]];
          const [dr, dc] = opts[Math.random() < 0.5 ? 0 : 1];
          const a = uggPos(e.r, e.c, e.type), b = uggPos(e.r + dr, e.c + dc, e.type);
          e.state = 'jump'; e.t = 0; e.ax = a.x; e.ay = a.y; e.bx = b.x; e.by = b.y; e.tr = e.r + dr; e.tc = e.c + dc;
          return;
        }
        if (e.state === 'hatch') { if (++e.t > 50) { e.type = 'coily'; e.state = 'stand'; e.rest = 10; A.tone(300, 0.3, { type: 'sawtooth', vol: 0.06, slideTo: 900 }); } return; }
        if (e.state === 'jump') {
          if (stepJump(e)) {
            if (valid(e.tr, e.tc)) {
              e.r = e.tr; e.c = e.tc; e.state = 'stand'; e.rest = enemyRest() + (e.type === 'coily' ? 4 : 0); e.squash = 6;
              if (e.type === 'coily') sCoily(); else sBall();
              if ((e.type === 'sam' || e.type === 'slick') && cubes[cubeIdx(e.r, e.c)] > 0) cubes[cubeIdx(e.r, e.c)] = 0;
              if (e.type === 'purple' && e.r === 6) { e.state = 'hatch'; e.t = 0; }
            } else {
              e.state = 'fall'; e.vy = 1;
              if (e.type === 'coily') { addScore(500); popups.push({ x: e.x, y: e.y - 20, txt: '500', t: 90 }); A.tone(1400, 1.2, { type: 'square', vol: 0.07, slideTo: 100 }); }
            }
          }
          return;
        }
        if (--e.rest > 0) return;
        if (e.type === 'coily') {
          // chase: pick the hop that brings Coily closest to Q*bert (or follow him off a disc!)
          let tr = q.r, tc = q.c;
          if (q.state === 'disc' || q.state === 'drop') { const d = q.disc; tr = d.r; tc = d.side === 'L' ? -1 : d.r + 1; }
          let best = 1e9, bd = 3; const tp = cellPos(tr, tc);
          for (let d = 0; d < 4; d++) {
            const nr = e.r + DIRS[d][0], nc = e.c + DIRS[d][1];
            const isTarget = nr === tr && nc === tc;
            if (!valid(nr, nc) && !isTarget) continue;
            const p = cellPos(nr, nc), dd = Math.hypot(p.x - tp.x, p.y - tp.y);
            if (dd < best) { best = dd; bd = d; }
          }
          e.face = bd; startJump(e, e.r + DIRS[bd][0], e.c + DIRS[bd][1], 18);
          return;
        }
        // balls and Sam/Slick only bounce downward
        const d = Math.random() < 0.5 ? 2 : 3; e.face = d;
        startJump(e, e.r + 1, e.c + (d === 3 ? 1 : 0), 16);
      }
      function hitTest() {
        if (q.state !== 'stand' && q.state !== 'jump') return;
        for (const e of enemies) {
          if (e.gone || e.state === 'drop' || e.state === 'fall' || e.state === 'enter') continue;
          let ex = e.x, ey = e.y;
          if (e.type === 'ugg' || e.type === 'wrongway') continue; // handled on the lattice
          if (Math.abs(ex - q.x) < 10 && Math.abs(ey - q.y) < 10) {
            if (e.type === 'green') { e.gone = true; freezeT = 200; addScore(100); popups.push({ x: e.x, y: e.y - 20, txt: '100', t: 60 }); A.melody([[N.C6, .05], [N.A5, .05], [N.F5, .05], [N.D5, .05], [N.C5, .1]], { type: 'square', vol: 0.07 }); }
            else if (e.type === 'sam' || e.type === 'slick') { e.gone = true; addScore(300); popups.push({ x: e.x, y: e.y - 20, txt: '300', t: 60 }); A.tone(800, 0.2, { type: 'square', vol: 0.08, slideTo: 1600 }); }
            else { die(); return; }
          }
        }
      }
      function gameOver() { state = 'gameover'; T = 0; api.setHiScore(score); }
      function die() {
        if (state !== 'play') return;
        state = 'dying'; T = 0; balloon = 1; sCurse();
      }

      function updatePlay() {
        updateQ(); if (state !== 'play') return;
        if (freezeT > 0) freezeT--;
        else {
          for (const e of enemies) updateEnemy(e);
          if (--spawnT <= 0 && q.state !== 'disc' && q.state !== 'drop') { spawn(); spawnT = Math.max(60, 170 - level * 12 - round * 6) + Math.floor(Math.random() * 60); }
        }
        enemies = enemies.filter(e => !e.gone);
        if (state === 'play') hitTest();
        for (const p of popups) p.t--; popups = popups.filter(p => p.t > 0);
      }

      // ---------- coin-op ----------
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) A.tone(1568, 0.07, { type: 'square', vol: 0.08, slideTo: 2093 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; A.tone(98, 0.28, { type: 'square', vol: 0.14 }); A.tone(73, 0.28, { type: 'sawtooth', vol: 0.08 });
        return false;
      }
      const pushScreen = () => coinOp && api.credits > 0;

      // ---------- title demo ----------
      const demo = { cubes: new Uint8Array(6), r: 0, c: 0, x: 0, y: 0, state: 'stand', t: 0, face: 3, rest: 20 };
      const demoPos = (r, c) => ({ x: 128 + (c - r / 2) * 32, y: 150 + r * 24 });
      function updateDemo() {
        if (demo.state === 'stand') {
          if (--demo.rest > 0) return;
          const opts = []; for (let d = 0; d < 4; d++) { const nr = demo.r + DIRS[d][0], nc = demo.c + DIRS[d][1]; if (nr >= 0 && nr < 3 && nc >= 0 && nc <= nr) opts.push(d); }
          const d = opts[Math.floor(Math.random() * opts.length)]; demo.face = d;
          const a = demoPos(demo.r, demo.c); demo.r += DIRS[d][0]; demo.c += DIRS[d][1]; const b = demoPos(demo.r, demo.c);
          demo.state = 'jump'; demo.t = 0; demo.ax = a.x; demo.ay = a.y; demo.bx = b.x; demo.by = b.y;
        } else {
          demo.t++; const k = Math.min(1, demo.t / 16), up = demo.by < demo.ay;
          demo.x = demo.ax + (demo.bx - demo.ax) * k; demo.y = demo.ay + (demo.by - demo.ay) * (up ? Math.sqrt(k) : k * k) - Math.sin(Math.PI * k) * (up ? 10 : 12);
          if (k >= 1) { demo.state = 'stand'; demo.rest = 24; const i = cubeIdx(demo.r, demo.c); demo.cubes[i] = 1; if (demo.cubes.every(v => v)) demo.cubes.fill(0), demo.cubes[i] = 1; }
        }
      }

      // ---------- update ----------
      function update() {
        T++; pollCoins(); if (coinFlash > 0) coinFlash--;
        switch (state) {
          case 'title': if (!pushScreen()) updateDemo(); if (api.anyPressed('Enter', 'Space') && tryStart()) startGame(); break;
          case 'intro': if (T > 200 || (T > 30 && api.anyPressed('Enter', 'Space'))) { state = 'ready'; T = 0; A.melody([[N.G4, .1], [N.C5, .1], [N.E5, .1], [N.G5, .2]], { type: 'square', vol: 0.07 }); } break;
          case 'ready': if (T > 50) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (T > 130) {
              const respawn = () => { balloon = 0; enemies = []; spawnT = 90; state = 'play'; T = 0; };
              lives--;
              if (lives <= 0) { if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, () => { balloon = 0; gameOver(); }); else { balloon = 0; gameOver(); } }
              else respawn();
            }
            break;
          case 'fell':
            if (T > 30) {
              const respawn = () => { resetLife(); state = 'ready'; T = 0; };
              lives--;
              if (lives <= 0) { if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, gameOver); else gameOver(); }
              else respawn();
            }
            break;
          case 'complete':
            if (T === 100) { const bonus = 1000 + 250 * roundsDone; addScore(bonus); popups.push({ x: 128, y: 20, txt: 'BONUS ' + bonus, t: 80 }); const ud = discs.filter(d => !d.used).length; if (ud) addScore(ud * 50); }
            if (T > 180) { roundsDone++; round++; if (round > 4) { round = 1; level++; setupRound(); state = 'intro'; } else { setupRound(); state = 'ready'; } T = 0; }
            for (const p of popups) p.t--; popups = popups.filter(p => p.t > 0);
            break;
          case 'gameover': if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; } break;
        }
      }

      // ---------- render ----------
      function drawCube(ctx, cx, cy, top, left, right) {
        cx = Math.round(cx); cy = Math.round(cy);
        ctx.fillStyle = left; for (let i = 0; i < 16; i++) ctx.fillRect(cx - 16 + i, cy + (i >> 1), 1, 16);
        ctx.fillStyle = right; for (let i = 0; i < 16; i++) ctx.fillRect(cx + i, cy + 8 - ((i + 1) >> 1), 1, 16);
        ctx.fillStyle = top; for (let j = 0; j < 16; j++) { const w = j < 8 ? (j + 1) * 2 : (16 - j) * 2; ctx.fillRect(cx - w, cy - 8 + j, w * 2, 1); }
      }
      function cubeColor(v) { if (steps === 3) return [scheme[0], scheme[1], scheme[2]][v]; return v ? scheme[2] : scheme[0]; }
      function drawPyramid(ctx) {
        const flash = state === 'complete' && T < 100;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c <= r; c++) {
          const p = cellPos(r, c);
          let top = cubeColor(cubes[cubeIdx(r, c)]);
          if (flash) top = SCHEMES[((T >> 2) + r + c) % SCHEMES.length][(T >> 3) % 3];
          drawCube(ctx, p.x, p.y, top, scheme[3], scheme[4]);
        }
      }
      function drawQ(ctx) {
        const spr = (q.state === 'jump' || q.state === 'fall') ? Qspr.jump[q.face] : Qspr.stand[q.face];
        ctx.drawImage(spr, Math.round(q.x) - 8, Math.round(q.y) - 14);
        if (q.state === 'disc') ctx.drawImage(DISCS[(api.frame >> 2) & 3], Math.round(q.x) - 8, Math.round(q.y) - 2);
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        if (e.type === 'red' || e.type === 'green' || e.type === 'purple') {
          const flick = freezeT > 0 && freezeT < 60 && (freezeT >> 2) & 1;
          if (!flick) ctx.drawImage((e.squash > 0 || e.state === 'hatch' ? BALLS_SQ : BALLS)[e.type], x - 6, y - 12 + (e.state === 'hatch' ? ((e.t >> 2) & 1) : 0));
        } else if (e.type === 'coily') ctx.drawImage(COIL[(e.face === 0 || e.face === 2 ? 0 : 1) + (e.face < 2 ? 2 : 0)], x - 8, y - 22);
        else if (e.type === 'sam' || e.type === 'slick') ctx.drawImage(SAMS[e.type][e.face === 2 ? 0 : 1], x - 8, y - 14);
        else if (e.type === 'wrongway') ctx.drawImage(UGGS.wrongway, x - 14, y - 8);
        else if (e.type === 'ugg') ctx.drawImage(UGGS.ugg, x - 2, y - 8);
      }
      function drawBalloon(ctx) {
        const bx = Math.round(q.x) - 30, by = Math.round(q.y) - 40;
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(bx + 1, by, 58, 16); ctx.fillRect(bx, by + 1, 60, 14);
        ctx.fillRect(bx + 24, by + 16, 6, 2); ctx.fillRect(bx + 26, by + 18, 3, 2); ctx.fillRect(bx + 28, by + 20, 1, 2);
        txt(ctx, '@!#?@!', bx + 6, by + 4, '#000000');
      }
      function drawHUD(ctx) {
        txt(ctx, 'PLAYER', 4, 4, '#FF40FF'); txt(ctx, '1', 56, 4, '#40FFFF');
        const s = String(score); txt(ctx, s, 4, 14, '#FF7A00');
        txt(ctx, 'HI', 4, 26, '#40FFFF'); txt(ctx, String(hi), 22, 26, '#FFFFFF');
        if (state !== 'title') {
          txt(ctx, 'CHANGE TO:', 4, 40, '#FFFFFF');
          // target colour cube with arrows
          const ax = 20, ay = 58;
          const blink = (api.frame >> 4) & 1;
          if (blink) { ctx.drawImage(ARROW_R, ax - 12, ay - 3); ctx.drawImage(ARROW_L, ax + 23, ay - 3); }
          ctx.fillStyle = scheme[2];
          for (let j = 0; j < 8; j++) { const w = j < 4 ? (j + 1) * 2 : (8 - j) * 2; ctx.fillRect(ax - w + 8, ay - 4 + j, w * 2, 1); }
          ctx.fillStyle = scheme[3]; ctx.fillRect(ax, ay, 8, 6); ctx.fillStyle = scheme[4]; ctx.fillRect(ax + 8, ay, 8, 6);
          for (let i = 0; i < Math.min(lives - 1, 5); i++) ctx.drawImage(Qspr.stand[3], 4, 72 + i * 18);
          txt(ctx, 'LEVEL:', 186, 4, '#40FF40'); txt(ctx, String(level), 238, 4, '#FF7A00');
          txt(ctx, 'ROUND:', 186, 14, '#40FF40'); txt(ctx, String(round), 238, 14, '#FF7A00');
        }
      }
      function renderTitle(ctx) {
        // chunky logo
        const word = 'Q*BERT', sx = 128 - (word.length * 28) / 2;
        for (let i = 0; i < word.length; i++) {
          const g = FONT[word[i]]; if (!g) continue;
          for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) {
            const x = sx + i * 28 + c * 5, y = 44 + r * 5;
            ctx.fillStyle = '#7A2000'; ctx.fillRect(x + 2, y + 2, 5, 5);
            ctx.fillStyle = r < 3 ? '#FFB060' : '#FF7A00'; ctx.fillRect(x, y, 5, 5);
          }
        }
        txt(ctx, '© 1982 GOTTLIEB', 68, 88, '#FFFFFF');
        const cs = 'CREDITS ' + Math.min(99, api.credits); txt(ctx, cs, 128 - cs.length * 4, 230, '#FFFFFF');
        if (pushScreen()) {
          txt(ctx, 'PUSH 1 PLAYER START', 52, 118, ((T >> 5) & 1) ? '#FFFF00' : '#FF7A00');
          txt(ctx, 'BONUS Q*BERT AT 8000', 48, 150, '#40FF40');
          txt(ctx, 'AND EVERY 14000 PTS', 52, 162, '#40FF40');
          ctx.drawImage(Qspr.stand[(T >> 6) & 3], 120, 186 - Math.round(Math.abs(Math.sin(T * 0.08)) * 6));
          return;
        }
        // demo pyramid
        const sc = SCHEMES[0];
        for (let r = 0; r < 3; r++) for (let c = 0; c <= r; c++) { const p = demoPos(r, c); drawCube(ctx, p.x, p.y, demo.cubes[cubeIdx(r, c)] ? sc[2] : sc[0], sc[3], sc[4]); }
        const dp = demo.state === 'stand' ? demoPos(demo.r, demo.c) : demo;
        ctx.drawImage((demo.state === 'jump' ? Qspr.jump : Qspr.stand)[demo.face], Math.round(dp.x) - 8, Math.round(dp.y) - 14);
        // cast
        ctx.drawImage(COIL[1], 18, 104); txt(ctx, 'COILY', 4, 132, '#C060FF');
        ctx.drawImage(BALLS.red, 210, 108); txt(ctx, 'BALL', 200, 124, '#FF4040');
        ctx.drawImage(BALLS.green, 210, 136); txt(ctx, 'FREEZE', 192, 152, '#40FF40');
        ctx.drawImage(SAMS.slick[1], 20, 150); txt(ctx, 'SLICK', 4, 168, '#40FF40');
        const prompt = api.credits === 0 ? ((coinFlash > 0 || ((T >> 5) & 1)) ? 'INSERT COIN' : '') : (((T >> 5) & 1) ? 'PUSH 1 PLAYER START' : '');
        if (prompt) {
          const px = 128 - prompt.length * 4; ctx.fillStyle = '#000'; ctx.fillRect(px - 3, 217, prompt.length * 8 + 4, 11);
          txt(ctx, prompt, px, 219, api.credits === 0 && coinFlash > 0 && ((api.frame >> 2) & 1) ? '#FF4040' : '#FFFF00');
        }
      }
      function renderIntro(ctx) {
        txt(ctx, 'LEVEL ' + level, 100, 50, '#FF7A00');
        const L = Math.min(level, 5);
        const lines = L === 1 ? ['JUMP ON SQUARES TO', 'CHANGE THEM TO', 'THE TARGET COLOR'] : L === 2 ? ['JUMP ON SQUARES TWICE', 'TO REACH THE', 'TARGET COLOR'] : L === 3 ? ['JUMP ON SQUARES TO CHANGE', 'BUT BEWARE: JUMP AGAIN', 'AND THEY CHANGE BACK!'] : ['TWO JUMPS TO THE TARGET', 'ANOTHER JUMP AND', 'THEY SLIP BACK'];
        lines.forEach((l, i) => txt(ctx, l, 128 - l.length * 4, 80 + i * 12, '#FFFFFF'));
        const sc = scheme;
        for (let i = 0; i < steps; i++) { drawCube(ctx, 128 + (i - (steps - 1) / 2) * 48, 150, [sc[0], sc[1], sc[2]][steps === 3 ? i : i * 2], sc[3], sc[4]); }
        for (let i = 0; i < steps - 1; i++) txt(ctx, '>', 128 + (i - (steps - 1) / 2) * 48 + 20, 150, '#FFFFFF');
        ctx.drawImage(Qspr.stand[3], 128 - 8 + Math.sin(T * 0.05) * 30, 132);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawHUD(ctx); renderTitle(ctx); return; }
        if (state === 'intro') { drawHUD(ctx); renderIntro(ctx); return; }
        // things behind the pyramid
        if (q.state === 'fall' && q.behind) drawQ(ctx);
        for (const e of enemies) if (e.state === 'fall' && e.behind) drawEnemy(ctx, e);
        drawPyramid(ctx);
        for (const d of discs) if (!d.used) {
          const p = cellPos(d.r, d.side === 'L' ? -1 : d.r + 1);
          ctx.drawImage(DISCS[(api.frame >> 3) & 3], Math.round(p.x) - 8, Math.round(p.y) - 4);
        }
        const ents = enemies.filter(e => !(e.state === 'fall' && e.behind)).slice();
        ents.sort((a, b) => a.y - b.y);
        let qDrawn = q.state === 'fall' && q.behind;
        for (const e of ents) { if (!qDrawn && q.y < e.y) { drawQ(ctx); qDrawn = true; } drawEnemy(ctx, e); }
        if (!qDrawn && state !== 'fell') drawQ(ctx);
        if (balloon) drawBalloon(ctx);
        for (const p of popups) txt(ctx, p.txt, Math.round(p.x - p.txt.length * 4), Math.round(p.y), '#FFFFFF');
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(84, 214, 88, 14); txt(ctx, 'GAME OVER', 92, 218, '#FF4040'); }
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, lives, level, round, lit: cubes.reduce((a, v) => a + (v ? 1 : 0), 0) }), set: o => { if ('lives' in o) lives = o.lives; if ('score' in o) score = o.score; }, kill: () => die() });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
