// Eyes (Rock-Ola, 1982) \u2014 from-scratch recreation: an eyeball in a maze shooting it out with enemy eyes, eye-box corners.
(function () {
  'use strict';
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
    '?': '0E110102040004', '@': '0E11171517100E', '#': '0A0A1F0A1F0A0A', '\u00a9': '0E11171417110E',
    '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408', '=': '00001F001F0000',
    '>': '08040201020408', '<': '02040810080402', '&': '0C12140815120D', '*': '0004150E150400',
    '+': '0004041F040400', '%': '18190204081303'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // text(ctx, str, x, y, colour, {scale, adv, center, right, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold === false ? 1 : 2;
    s = String(s).toUpperCase();
    const w = s.length * adv - (adv - (4 + bw) * sc);
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, bw * sc - (bw - 1) * (sc - 1), sc); }
    }
  }
  const D3 = ['75557', '26227', '71747', '71717', '55711', '74717', '74757', '71111', '75757', '75717'];
  function tinyNum(ctx, n, cx, cy, col) {
    const s = String(n); const w = s.length * 4 - 1; let x = Math.round(cx - w / 2); ctx.fillStyle = col;
    for (const ch of s) { const g = D3[+ch]; if (g) for (let r = 0; r < 5; r++) { const b = parseInt(g[r], 16); for (let c = 0; c < 3; c++) if (b & (4 >> c)) ctx.fillRect(x + c, cy - 2 + r, 1, 1); } x += 4; }
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // sprite from rows of chars; pal maps char -> colour ('.' or unmapped = transparent)
  function sprite(rows, pal) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length)), cv = mkCanvas(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flipRows = rows => rows.map(r => r.split('').reverse().join(''));
  const vflipRows = rows => rows.slice().reverse();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => Math.floor(Math.random() * n);
  const pick = a => a[irnd(a.length)];
  const pad = (n, l) => String(n).padStart(l, '0');
  // coin-op helper: start with a credit or flash INSERT COIN
  function makeCoin(api) {
    let flash = 0, last = api.credits;
    return {
      tick() {
        if (flash > 0) flash = api.credits > 0 ? 0 : flash - 1;
        if (api.credits > last) api.audio.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 });
        last = api.credits;
      },
      tryStart() {
        if (api.useCredit()) { last = api.credits; return true; }
        flash = 90; api.audio.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      },
      // draws PUSH START / INSERT COIN centred at cx,y and CREDIT nn at cx2,y2
      draw(ctx, cx, y, col, frame) {
        const blink = (frame >> 4) & 1;
        if (flash > 0) { if ((flash >> 2) & 1) text(ctx, 'INSERT COIN', cx, y, '#ff4040', { center: true }); }
        else if (api.credits <= 0) { if (blink) text(ctx, 'INSERT COIN', cx, y, col, { center: true }); }
        else if (blink) text(ctx, 'PUSH START', cx, y, col, { center: true });
      },
      credit(ctx, x, y, col) { text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), x, y, col); }
    };
  }
  // looping background tune (frame-driven)
  function makeMusic(api) {
    let notes = null, opts = null, len = 0, t = 0, on = false;
    return {
      play(n, o) { notes = n; opts = o || {}; len = n.reduce((s, x) => s + x[1], 0); t = 0; on = true; api.audio.melody(notes, opts); },
      stop() { on = false; },
      tick() { if (!on) return; t += 1 / 60; if (t >= len) { t -= len; api.audio.melody(notes, opts); } },
      get on() { return on; }
    };
  }
  // particle bursts
  function burst(list, x, y, cols, n, sp) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (sp || 1.5) * (0.3 + Math.random()); list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 20 + irnd(20), c: pick(cols) }); }
  }
  function stepParts(list) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; if (--p.t <= 0) list.splice(i, 1); } }
  function drawParts(ctx, list, ox) { ox = ox || 0; for (const p of list) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - ox), Math.round(p.y), p.t > 10 ? 2 : 1, p.t > 10 ? 2 : 1); } }
  // ---- maze renderer: walls are tiles '#'; corridors shrink walls by a margin, giving rounded, outlined blocks ----
  function buildMazeCanvas(rows, fill, line, margin) {
    margin = margin == null ? 3 : margin;
    const R = rows.length, C = rows[0].length, w = C * 8, h = R * 8;
    const cv = mkCanvas(w, h), c2 = cv.getContext('2d');
    const wall = (c, r) => r < 0 || r >= R || c < 0 || c >= C ? true : rows[r][c] === '#';
    const img = c2.createImageData(w, h);
    const hex = s => [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
    const F = fill ? hex(fill) : null, L = hex(line);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const tc = px >> 3, tr = py >> 3; if (!wall(tc, tr)) continue;
      let d = 9; const cx = px + 0.5, cy = py + 0.5;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (wall(tc + dc, tr + dr)) continue;
        const x0 = (tc + dc) * 8, y0 = (tr + dr) * 8;
        const dx = Math.max(x0 - cx, 0, cx - x0 - 8), dy = Math.max(y0 - cy, 0, cy - y0 - 8);
        d = Math.min(d, Math.hypot(dx, dy));
      }
      let col = null;
      if (d < margin) col = null; else if (d < margin + 1.2) col = L; else if (F) col = F;
      if (col) { const i = (py * w + px) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; }
    }
    c2.putImageData(img, 0, 0);
    return cv;
  }
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0];
  const mod8 = v => ((v % 8) + 8) % 8;
  const MAZE = ['############################',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#..........................#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##..........##......#',
    '######.##############.######',
    '######.##############.######',
    '######..            ..######',
    '######.######--######.######',
    '######.####______####.######',
    '#......####______####......#',
    '#.####.####______####.####.#',
    '#.####.##############.####.#',
    '#.####..            ..####.#',
    '#.####.##############.####.#',
    '#.####.##############.####.#',
    '#............  ............#',
    '#.####.##.########.##.####.#',
    '#.####.##.########.##.####.#',
    '#......##..........##......#',
    '#.##.#.##.########.##.#.##.#',
    '#.##.#.##.########.##.#.##.#',
    '#..........................#',
    '#.##.######.####.######.##.#',
    '#.##.######.####.######.##.#',
    '#..........................#',
    '############################'];
  // ===================== Eyes =====================
  const W = 224, H = 288, OFFR = 3, COLS = 28, MROWS = 31, CX = 112;
  const ENEMY = [
    { name: 'RED', lid: '#e01818', iris: '#ff8000', scatter: [25, 0], homeX: CX, ai: 'chase' },
    { name: 'PURPLE', lid: '#b030e0', iris: '#ff2020', scatter: [2, 0], homeX: CX, ai: 'ambush' },
    { name: 'GREEN', lid: '#10b040', iris: '#ffff00', scatter: [27, 35], homeX: CX - 16, ai: 'flank' },
    { name: 'ORANGE', lid: '#f08010', iris: '#20a0ff', scatter: [0, 35], homeX: CX + 16, ai: 'shy' }
  ];
  const BOXES = [[1, 1 + OFFR], [26, 1 + OFFR], [1, 29 + OFFR], [26, 29 + OFFR]];
  const BASE = 1.2;

  ArcadeRegistry.register({
    id: 'eyes', title: 'Eyes', year: 1982, maker: 'Rock-Ola',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#ffffff', accent: '#2060ff' },
    create(api) {
      const A = api.audio, coin = makeCoin(api);
      const MZ = [buildMazeCanvas(MAZE, '#081850', '#4080ff'), buildMazeCanvas(MAZE, '#401008', '#ff6040'), buildMazeCanvas(MAZE, '#083818', '#40e070'), buildMazeCanvas(MAZE, '#302008', '#e0c040')];
      const MZW = buildMazeCanvas(MAZE, '#000000', '#ffffff');
      // eyeball sprite: lid covers top fraction lidK (0 open .. 1 closed)
      function makeEye(o) {
        const cv = mkCanvas(15, 15), c = cv.getContext('2d');
        const dx = [0, -2.6, 0, 2.6][o.dir], dy = [-2.6, 0, 2.6, 0][o.dir];
        for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
          const ex = x - 7, ey = y - 7, r2 = ex * ex + ey * ey;
          if (r2 > 49) continue;
          let col = o.white || '#f0f0f0';
          if (r2 > 36) col = o.rim || '#c0c0c0';
          const ix = ex - dx, iy = ey - dy, i2 = ix * ix + iy * iy;
          if (i2 <= 9.5) col = o.iris; if (i2 <= 2.5) col = '#000000';
          if (i2 > 9.5 && r2 <= 36 && o.veins && ((x * 7 + y * 13) % 17 === 0)) col = '#ff4040';
          if (o.lid && y < 1 + o.lidK * 13 + (o.angry ? Math.abs(ex) * 0.35 * (o.angry) : 0)) col = o.lid;
          c.fillStyle = col; c.fillRect(x, y, 1, 1);
        }
        if (o.lid && o.lidK > 0) { c.fillStyle = '#000000'; const ly = Math.floor(1 + o.lidK * 13); for (let x = 2; x < 13; x++) if (ly + Math.floor(Math.abs(x - 7) * 0.35 * (o.angry || 0)) < 15) c.fillRect(x, ly + Math.floor(Math.abs(x - 7) * 0.35 * (o.angry || 0)), 1, 1); }
        return cv;
      }
      const PEYE = [0, 1, 2, 3].map(d => makeEye({ dir: d, iris: '#2060ff', veins: true }));
      const PBLINK = [0.3, 0.6, 0.9].map(k => makeEye({ dir: 2, iris: '#2060ff', lid: '#c09070', lidK: k, veins: true }));
      const EEYE = ENEMY.map(e => [0, 1, 2, 3].map(d => makeEye({ dir: d, iris: e.iris, lid: e.lid, lidK: 0.25, angry: 1, white: '#ffe8e8' })));
      const BLIND = [makeEye({ dir: 2, iris: '#2020ff', lid: '#2020ff', lidK: 1 }), makeEye({ dir: 2, iris: '#ffffff', lid: '#e0e0ff', lidK: 1, white: '#e0e0ff', rim: '#ffffff' })];

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, level = 1, nextExtra = 10000;
      let dots = new Uint8Array(COLS * 36), dotsLeft = 0, pl, enemies = [], pShot = null, eShots = [], boxes = [0, 0, 0, 0], blindT = 0, combo = 0, chain = 0;
      let parts = [], popups = [], freeze = 0, modeT = 0, houseT = 0, sndT = 0, tick = false, demo = false;

      const tX = x => Math.floor(x / 8), tY = y => Math.floor(y / 8);
      function mch(c, r) { const mr = r - OFFR; if (mr < 0 || mr >= MROWS || c < 0 || c >= COLS) return '#'; return MAZE[mr][c]; }
      const open = (c, r) => { const ch = mch(c, r); return ch !== '#' && ch !== '_' && ch !== '-'; };
      const P = () => ({
        pl: Math.min(1, 0.85 + level * 0.03), en: Math.min(0.98, 0.72 + level * 0.04), blind: Math.max(120, 420 - level * 40),
        fire: Math.min(0.06, 0.012 + level * 0.006), bspd: Math.min(3.2, 2 + level * 0.15), n: level === 1 ? 3 : 4
      });

      function setupDots() {
        dotsLeft = 0; dots.fill(0);
        for (let r = 0; r < 36; r++) for (let c = 0; c < COLS; c++) {
          const ch = mch(c, r); let v = ch === '.' || ch === 'o' ? 1 : 0;
          if (BOXES.some(b => b[0] === c && b[1] === r)) v = 0;
          dots[r * COLS + c] = v; if (v) dotsLeft++;
        }
        boxes = [0, 0, 0, 0];
      }
      function resetActors() {
        pl = { x: CX, y: (20 + OFFR) * 8 + 4, dir: 1, want: 1, acc: 0, anim: 0 };
        const p = P();
        enemies = ENEMY.slice(0, p.n).map((d, i) => ({
          ...d, idx: i, x: i === 0 ? CX : d.homeX, y: i === 0 ? 116 : 140, dir: i === 0 ? 1 : (i === 1 ? 2 : 0),
          mode: i === 0 ? 'active' : 'house', wait: 60 + i * 150, acc: 0, cd: 60, blind: false
        }));
        pShot = null; eShots = []; blindT = 0; freeze = 0; modeT = 0; houseT = 0; popups = [];
      }
      function startGame() {
        score = 0; lives = 3; level = 1; nextExtra = 10000; setupDots(); resetActors(); state = 'ready'; T = 0;
        A.melody([[392, .1], [494, .1], [587, .1], [784, .2], [740, .1], [659, .1], [587, .2], [494, .1], [587, .1], [784, .3]], { type: 'square', vol: 0.09 });
        A.melody([[98, .4], [147, .4], [123, .4], [196, .4]], { type: 'triangle', vol: 0.15 });
      }
      function addScore(n) {
        if (demo) return;
        score += n; if (score > hi) hi = score;
        if (score >= nextExtra) { lives++; nextExtra += nextExtra === 10000 ? 20000 : 30000; A.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.12 }); }
      }

      // ---------- movement ----------
      function plStep() {
        const c = tX(pl.x), r = tY(pl.y), ox = mod8(pl.x) - 4, oy = mod8(pl.y) - 4, d = pl.want;
        if (d !== pl.dir) {
          if (d === (pl.dir + 2) % 4) pl.dir = d;
          else if (open(c + DX[d], r + DY[d]) && Math.abs(DX[d] ? oy : ox) <= 3) pl.dir = d;
        }
        const along = DX[pl.dir] * ox + DY[pl.dir] * oy;
        if (!open(c + DX[pl.dir], r + DY[pl.dir]) && along >= 0) return false;
        pl.x += DX[pl.dir]; pl.y += DY[pl.dir];
        if (DX[pl.dir] !== 0 && oy !== 0) pl.y -= Math.sign(oy);
        if (DY[pl.dir] !== 0 && ox !== 0) pl.x -= Math.sign(ox);
        pl.anim++; return true;
      }
      function eatAt() {
        const c = tX(pl.x), r = tY(pl.y), i = r * COLS + c;
        if (dots[i]) {
          dots[i] = 0; dotsLeft--; addScore(10);
          tick = !tick; A.tone(tick ? 880 : 660, 0.04, { type: 'square', vol: 0.06 });
        }
        for (let b = 0; b < 4; b++) {
          if (boxes[b] || BOXES[b][0] !== c || BOXES[b][1] !== r) continue;
          boxes[b] = 1; addScore(100); popups.push({ x: c * 8 + 4, y: r * 8 + 4, v: 100, t: 60 });
          A.melody([[523, .05], [784, .05], [1047, .1]], { type: 'square', vol: 0.1 });
          if (boxes.every(x => x)) {
            // all four eye-boxes lit: the enemy eyes go blind
            const p = P(); blindT = p.blind; combo = 0;
            for (const e of enemies) if (e.mode === 'active') { e.blind = true; e.dir = (e.dir + 2) % 4; }
            setTimeout0(() => { boxes = [0, 0, 0, 0]; });
            A.tone(200, 0.6, { type: 'sawtooth', vol: 0.1, slideTo: 1600 });
          }
        }
      }
      const later = [];
      function setTimeout0(f) { later.push({ t: 90, f }); }
      function target(e) {
        if (e.mode === 'return') return [13, 14];
        if (modeT % 1500 < 360) return e.scatter;
        const pc = tX(pl.x), pr = tY(pl.y);
        if (e.ai === 'chase') return [pc, pr];
        if (e.ai === 'ambush') return [pc + 4 * DX[pl.dir], pr + 4 * DY[pl.dir]];
        if (e.ai === 'flank') { const b = enemies[0]; return [2 * pc - tX(b.x), 2 * pr - tY(b.y)]; }
        const dx = tX(e.x) - pc, dy = tY(e.y) - pr; return dx * dx + dy * dy > 64 ? [pc, pr] : e.scatter;
      }
      function enStep(e) {
        if (e.mode === 'house') { e.y += e.dir === 0 ? -1 : 1; if (e.y <= 136) e.dir = 2; if (e.y >= 144) e.dir = 0; return; }
        if (e.mode === 'leaving') {
          if (e.x !== CX) { if (e.y !== 140) { e.y += e.y < 140 ? 1 : -1; return; } e.dir = e.x < CX ? 3 : 1; e.x += e.x < CX ? 1 : -1; }
          else if (e.y > 116) { e.y--; e.dir = 0; }
          else { e.mode = 'active'; e.dir = Math.random() < 0.5 ? 1 : 3; e.blind = false; }
          return;
        }
        if (mod8(e.x) === 4 && mod8(e.y) === 4) {
          const c = tX(e.x), r = tY(e.y), opts = [];
          for (let d = 0; d < 4; d++) { if (d === (e.dir + 2) % 4) continue; if (open(c + DX[d], r + DY[d])) opts.push(d); }
          if (!opts.length) e.dir = (e.dir + 2) % 4;
          else if (e.blind || Math.random() < 0.12) e.dir = pick(opts);
          else { const [tx, ty] = target(e); let best = 1e9; for (const d of opts) { const ex = c + DX[d] - tx, ey = r + DY[d] - ty, dd = ex * ex + ey * ey; if (dd < best) { best = dd; e.dir = d; } } }
        }
        e.x += DX[e.dir]; e.y += DY[e.dir];
      }
      // clear corridor between two tiles in a straight line?
      function lineClear(c0, r0, c1, r1) {
        if (c0 !== c1 && r0 !== r1) return false;
        const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
        let c = c0, r = r0;
        while (c !== c1 || r !== r1) { c += dc; r += dr; if (!open(c, r)) return false; }
        return true;
      }
      function enemyFire(e) {
        if (e.mode !== 'active' || e.blind || --e.cd > 0) return;
        const c = tX(e.x), r = tY(e.y), pc = tX(pl.x), pr = tY(pl.y);
        const d = c === pc ? (pr < r ? 0 : 2) : r === pr ? (pc < c ? 1 : 3) : -1;
        if (d < 0 || d !== e.dir) return;
        if (Math.abs(c - pc) + Math.abs(r - pr) > 14 || !lineClear(c, r, pc, pr)) return;
        if (Math.random() > P().fire * 6) { e.cd = 20; return; }
        eShots.push({ x: e.x, y: e.y, dir: d, sp: P().bspd });
        e.cd = 120 - Math.min(60, level * 8);
        A.tone(300, 0.15, { type: 'sawtooth', vol: 0.08, slideTo: 120 });
      }
      function fire() {
        if (pShot) return;
        pShot = { x: pl.x, y: pl.y, dir: pl.dir };
        A.tone(1800, 0.08, { type: 'square', vol: 0.08, slideTo: 900 });
      }
      function moveShot(s, sp) {
        for (let i = 0; i < sp; i++) {
          s.x += DX[s.dir]; s.y += DY[s.dir];
          const c = tX(s.x + DX[s.dir] * 2), r = tY(s.y + DY[s.dir] * 2);
          if (!open(c, r)) return false;
        }
        return true;
      }
      function killEnemy(e, v) {
        e.mode = 'dead'; e.wait = 240; addScore(v); popups.push({ x: e.x, y: e.y, v, t: 60 });
        burst(parts, e.x, e.y, ['#ffffff', e.lid, e.iris], 16, 1.8);
        A.noise(0.35, { vol: 0.18, freq: 3000, slideTo: 200 });
      }
      function die() {
        state = 'dying'; T = 0; eShots = []; pShot = null;
        A.melody([[784, .1], [740, .1], [698, .1], [659, .1], [622, .1], [587, .1], [554, .1], [523, .3]], { type: 'square', vol: 0.1 });
      }
      function demoInput() {
        // wander toward dots, fire when an enemy is lined up
        if (mod8(pl.x) === 4 && mod8(pl.y) === 4 && Math.random() < 0.3) {
          const c = tX(pl.x), r = tY(pl.y), opts = [];
          for (let d = 0; d < 4; d++) if (open(c + DX[d], r + DY[d]) && d !== (pl.dir + 2) % 4) opts.push(d);
          const withDot = opts.filter(d => dots[(r + DY[d]) * COLS + c + DX[d]]);
          pl.want = pick(withDot.length ? withDot : opts.length ? opts : [(pl.dir + 2) % 4]);
        }
        for (const e of enemies) if (e.mode === 'active' && (tX(e.x) === tX(pl.x) || tY(e.y) === tY(pl.y))) { const d = tX(e.x) === tX(pl.x) ? (e.y < pl.y ? 0 : 2) : (e.x < pl.x ? 1 : 3); if (d === pl.dir) fire(); }
      }

      function updatePlay() {
        for (let i = later.length - 1; i >= 0; i--) if (--later[i].t <= 0) { later[i].f(); later.splice(i, 1); }
        if (freeze > 0) { freeze--; return; }
        const p = P();
        if (demo) demoInput();
        else {
          if (api.key('ArrowLeft')) pl.want = 1; else if (api.key('ArrowRight')) pl.want = 3;
          else if (api.key('ArrowUp')) pl.want = 0; else if (api.key('ArrowDown')) pl.want = 2;
          if (api.pressed('Space') || api.pressed('KeyX')) fire();
        }
        modeT++;
        if (blindT > 0) { blindT--; if (blindT === 0) enemies.forEach(e => e.blind = false); }
        pl.acc += BASE * p.pl;
        while (pl.acc >= 1) { pl.acc--; if (plStep()) eatAt(); }
        // enemies
        houseT++;
        for (const e of enemies) {
          if (e.mode === 'dead') { if (--e.wait <= 0) { e.mode = 'house'; e.x = e.homeX; e.y = 140; e.wait = 60; } continue; }
          if (e.mode === 'house' && --e.wait <= 0) e.mode = 'leaving';
          const sp = e.mode === 'house' || e.mode === 'leaving' ? 0.5 : e.blind ? 0.5 : p.en + (e.idx === 0 && dotsLeft < 40 ? 0.08 : 0);
          e.acc += BASE * sp;
          while (e.acc >= 1) { e.acc--; enStep(e); }
          enemyFire(e);
        }
        // shots
        if (pShot) {
          if (!moveShot(pShot, 4)) { burst(parts, pShot.x, pShot.y, ['#80c0ff'], 4, 0.8); pShot = null; }
          else for (const e of enemies) {
            if ((e.mode !== 'active' && e.mode !== 'leaving') || Math.abs(e.x - pShot.x) > 6 || Math.abs(e.y - pShot.y) > 6) continue;
            chain = Math.min(chain + 1, 4); killEnemy(e, 100 * (1 << (chain - 1))); pShot = null; break;
          }
        }
        for (let i = eShots.length - 1; i >= 0; i--) {
          const s = eShots[i];
          if (!moveShot(s, Math.round(s.sp))) { eShots.splice(i, 1); continue; }
          if (pShot && Math.abs(pShot.x - s.x) < 5 && Math.abs(pShot.y - s.y) < 5) { eShots.splice(i, 1); pShot = null; addScore(50); popups.push({ x: s.x, y: s.y, v: 50, t: 40 }); A.tone(2400, 0.05, { type: 'square', vol: 0.1 }); continue; }
          if (Math.abs(pl.x - s.x) < 5 && Math.abs(pl.y - s.y) < 5) { if (!demo) { die(); return; } eShots.splice(i, 1); }
        }
        // touching
        for (const e of enemies) {
          if (e.mode !== 'active' || Math.abs(e.x - pl.x) > 6 || Math.abs(e.y - pl.y) > 6) continue;
          if (e.blind) { const v = 200 << combo; combo = Math.min(combo + 1, 3); killEnemy(e, v); freeze = 30; }
          else if (!demo) { die(); return; }
        }
        // sound
        if (--sndT <= 0) { sndT = blindT > 0 ? 10 : 24; A.tone(blindT > 0 ? 500 : 110, blindT > 0 ? 0.12 : 0.2, { type: 'triangle', vol: 0.05, slideTo: blindT > 0 ? 900 : 70 }); }
        if (dotsLeft <= 0) { state = 'clear'; T = 0; A.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [1319, .25]], { type: 'square', vol: 0.1 }); }
      }

      function update() {
        coin.tick(); T++;
        stepParts(parts);
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        if (state === 'title') {
          if (api.anyPressed('Enter', 'Space')) { if (coin.tryStart()) { demo = false; startGame(); } }
          else if (T > 840) { demo = true; startGame(); state = 'play'; }
          return;
        }
        if (demo) { if (api.anyPressed('Enter', 'Space') || T > 1500 || state !== 'play') { demo = false; state = 'title'; T = 0; return; } updatePlay(); return; }
        if (state === 'ready') { if (T > 140) { state = 'play'; T = 0; chain = 0; } return; }
        if (state === 'play') { if (!pShot) chain = 0; updatePlay(); return; }
        if (state === 'dying') {
          if (T === 150) {
            lives--;
            if (lives > 0) { resetActors(); state = 'ready'; T = 40; }
            else {
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              state = 'hold';
              if (api.offerContinue) api.offerContinue(() => { lives = 3; resetActors(); state = 'ready'; T = 40; }, over); else over();
            }
          }
          return;
        }
        if (state === 'clear') { if (T > 180) { level++; setupDots(); resetActors(); state = 'ready'; T = 40; } return; }
        if (state === 'over') { if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; } }
      }

      // ---------- drawing ----------
      function drawHUD(ctx) {
        text(ctx, '1UP', 24, 0, '#ff4040'); text(ctx, String(score || '00'), 64, 9, '#ffffff', { right: true });
        text(ctx, 'HIGH SCORE', 112, 0, '#ff4040', { center: true }); text(ctx, String(hi), 152, 9, '#ffffff', { right: true });
        if (state !== 'title') {
          for (let i = 0; i < Math.min(lives - 1, 5); i++) ctx.drawImage(PEYE[3], 6 + i * 17, 272);
          text(ctx, 'L' + level, W - 8, 276, '#80c0ff', { right: true });
        }
      }
      function drawBoxes(ctx) {
        for (let b = 0; b < 4; b++) {
          const x = BOXES[b][0] * 8 - 2, y = BOXES[b][1] * 8 - 2;
          const lit = boxes[b], fl = (api.frame >> 3) & 1;
          ctx.fillStyle = lit ? '#ffff40' : (fl ? '#ff40ff' : '#a020a0'); ctx.fillRect(x, y, 12, 12);
          ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y + 2, 8, 8);
          ctx.fillStyle = lit ? '#ffffff' : '#ff40ff'; ctx.fillRect(x + 4, y + 4, 4, 4);
        }
      }
      function renderTitle(ctx) {
        drawHUD(ctx);
        // giant eyeball
        const bx = 112, by = 88, R = 34;
        ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * R, by + Math.sin(a) * R); ctx.lineTo(bx + Math.cos(a + 0.2) * R * 0.6, by + Math.sin(a + 0.2) * R * 0.6); ctx.stroke(); }
        const lx = Math.sin(T / 40) * 12, ly = Math.cos(T / 53) * 6;
        ctx.fillStyle = '#2060ff'; ctx.beginPath(); ctx.arc(bx + lx, by + ly, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(bx + lx, by + ly, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(bx + lx - 4, by + ly - 5, 3, 3);
        text(ctx, 'EYES', 112, 26, '#ffffff', { center: true, scale: 3 });
        ENEMY.forEach((e, i) => { ctx.drawImage(EEYE[i][3], 40, 138 + i * 16); text(ctx, e.name + ' EYE', 62, 142 + i * 16, e.lid); });
        text(ctx, 'SHOOT EYE  100-800', 112, 210, '#ffffff', { center: true, adv: 7 });
        text(ctx, 'LIGHT 4 BOXES = BLIND', 112, 222, '#ff40ff', { center: true, adv: 7 });
        coin.draw(ctx, 112, 240, '#ffff40', api.frame);
        text(ctx, '\u00a9 1982 ROCK-OLA', 112, 256, '#80c0ff', { center: true, adv: 7 });
        coin.credit(ctx, 8, 276, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        const flash = state === 'clear' && T > 40 && (((T - 40) / 12 | 0) % 2 === 0);
        ctx.drawImage(flash ? MZW : MZ[(level - 1) % 4], 0, OFFR * 8);
        ctx.fillStyle = '#ff40ff'; ctx.fillRect(CX - 8, (12 + OFFR) * 8 + 3, 16, 2);
        ctx.fillStyle = '#ffd0a0';
        for (let r = OFFR; r < OFFR + MROWS; r++) for (let c = 0; c < COLS; c++) if (dots[r * COLS + c]) ctx.fillRect(c * 8 + 3, r * 8 + 3, 2, 2);
        drawBoxes(ctx);
        if (state !== 'over' && state !== 'hold') {
          if (state !== 'clear') for (const e of enemies) {
            if (e.mode === 'dead') continue;
            let s;
            if (e.blind) s = BLIND[blindT < 100 && ((blindT >> 3) & 1) ? 1 : 0];
            else s = EEYE[e.idx][e.dir];
            ctx.drawImage(s, Math.round(e.x - 7), Math.round(e.y - 7));
          }
          if (state === 'dying') {
            const k = Math.min(2, Math.floor(T / 25));
            if (T < 90) ctx.drawImage(PBLINK[k], pl.x - 7, pl.y - 7);
            else if (T < 130) { ctx.fillStyle = '#c09070'; ctx.fillRect(pl.x - 6, pl.y - 1, 13, 2); }
          } else {
            const blink = state === 'ready' || (pl.anim % 400 > 392);
            ctx.drawImage(blink ? PBLINK[0] : PEYE[pl.dir], Math.round(pl.x - 7), Math.round(pl.y - 7));
          }
        }
        if (pShot) { ctx.fillStyle = '#80e0ff'; const v = DX[pShot.dir] !== 0; ctx.fillRect(Math.round(pShot.x - (v ? 3 : 1)), Math.round(pShot.y - (v ? 1 : 3)), v ? 6 : 2, v ? 2 : 6); }
        for (const s of eShots) { ctx.fillStyle = (api.frame & 2) ? '#ff4040' : '#ffff40'; ctx.fillRect(Math.round(s.x - 2), Math.round(s.y - 2), 4, 4); }
        drawParts(ctx, parts);
        for (const p of popups) tinyNum(ctx, p.v, p.x, p.y, '#ffff40');
        drawHUD(ctx);
        if (state === 'ready') text(ctx, 'READY!', 112, (14 + OFFR) * 8 + 32, '#ffff40', { center: true });
        if (state === 'over' || state === 'hold') text(ctx, 'GAME  OVER', 112, (14 + OFFR) * 8 + 32, '#ff4040', { center: true });
        if (demo) { text(ctx, 'DEMO', 112, (14 + OFFR) * 8 + 32, '#ffffff', { center: true }); }
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, score, lives, level, dotsLeft, boxes: boxes.join('') }), pac: () => pl, ghosts: () => enemies.map(e => ({ x: e.x, y: e.y, mode: e.mode, fright: e.blind })), open: (c, r) => open(c, r), dots: () => dots, press: io => { for (const e of enemies) if (e.mode === 'active' && (tX(e.x) === tX(pl.x) || tY(e.y) === tY(pl.y))) io.press('Space'); } });
      return { update, render };
    }
  });
})();
