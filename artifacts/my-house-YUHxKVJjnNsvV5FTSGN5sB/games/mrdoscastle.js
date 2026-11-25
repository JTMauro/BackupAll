// Mr. Do's Castle (Universal, 1983) \u2014 from-scratch recreation for the MAME32 Game Room. Procedural art, synthesized sound.
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
  const W = 256, H = 240, NCOL = 15, X0 = 8, BW = 16, BH = 8;
  const FY = [48, 80, 112, 144, 176, 208]; // floor surfaces (feet), floor 5 is the solid ground
  const NF = 6, DOORS = [3, 11];
  const cxOf = c => X0 + c * BW + BW / 2;
  const colOf = x => clamp(Math.floor((x - X0) / BW), 0, NCOL - 1);
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const DO_ART = [[
    '....rrrr....', '...rrrrrr...', '..wwwwwwww..', '...ssssss...', '..sskssks...', '...ssrrss...', '....ssss....', '..wwwwwwww..',
    '.wwbwwwwbww.', '.s.wwwwww.s.', '...bbbbbb...', '...bbbbbb...', '...bb..bb...', '...bb..bb...', '..rrr..rrr..', '..rrr..rrr..'], [
    '....rrrr....', '...rrrrrr...', '..wwwwwwww..', '...ssssss...', '..sskssks...', '...ssrrss...', '....ssss....', '..wwwwwwww..',
    '.wwbwwwwbww.', '.s.wwwwww.s.', '...bbbbbb...', '...bbbbbb...', '..bb...bb...', '.bb.....bb..', 'rrr.....rrr.', '............']];
  const DO_CLIMB = ['....rrrr....', '...rrrrrr...', '..wwwwwwww..', '...ssssss...', '...ssssss...', '...ssssss...', '....ssss....', 's.wwwwwwww.s',
    'swwbwwwwbwws', '...wwwwww...', '...bbbbbb...', '...bbbbbb...', '...bb..bb...', '...bb..bb...', '..rrr..rrr..', '............'];
  const UNI_ART = [[
    '..........h.....', '.........hh.....', '........mwww....', '.......mwwwkw...', '......mmwwwwww..', '.....mm.wwww.ww.', 'w...mm..wwww....', 'ww.wwwwwwwww....',
    '.wwwwwwwwwww....', '..wwwwwwwwww....', '..ww.ww..ww.w...', '..w..w...w..w...', '..y..y...y..y...', '................'], [
    '..........h.....', '.........hh.....', '........mwww....', '.......mwwwkw...', '......mmwwwwww..', '.....mm.wwww.ww.', '.w..mm..wwww....', 'ww.wwwwwwwww....',
    'wwwwwwwwwwww....', '..wwwwwwwwww....', '...ww.ww..ww....', '..w...w..w..w...', '.y....y..y...y..', '................']];
  const CHERRY = ['....gg', '...g.g', '..g..g', '.rr.rr', 'rrwrrw', 'rrrrrr', '.rr.rr'];
  const KEY = ['.yyy..........', 'y...y.........', 'y...yyyyyyyyyy', 'y...y....y.y.y', '.yyy..........'];

  ArcadeRegistry.register({
    id: 'mrdoscastle', title: "Mr. Do's Castle", year: 1983, maker: 'Universal',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk / climb ladders \u00b7 Space: hammer (knock out the block ahead) \u00b7 X: shift the ladder you stand on top of \u00b7 Enter: start',
    marquee: { bg: '#100820', fg: '#ff4040', accent: '#40c0ff' },
    create(api) {
      const A = api.audio, coin = makeCoin(api);
      const DOPAL = { r: '#ff2020', w: '#ffffff', s: '#ffc090', k: '#000', b: '#2040ff' };
      const DOS = [DO_ART.map(f => sprite(f, DOPAL)), DO_ART.map(f => sprite(flipRows(f), DOPAL))], DOC = sprite(DO_CLIMB, DOPAL);
      const UCOL = ['#40c0ff', '#ff70ff', '#60ff60', '#ffa040'];
      const mkU = (b, mane) => [UNI_ART.map(f => sprite(f, { w: b, m: mane, h: '#ffff40', k: '#000', y: '#c08040' })), UNI_ART.map(f => sprite(flipRows(f), { w: b, m: mane, h: '#ffff40', k: '#000', y: '#c08040' }))];
      const USPR = UCOL.map(c => mkU(c, '#ffffff')), USTUN = mkU('#8080a0', '#c0c0c0'), UXTRA = mkU('#ffff40', '#ff2020');
      const CHS = sprite(CHERRY, { g: '#30d030', r: '#ff2020', w: '#fff' }), KEYS = sprite(KEY, { y: '#ffd020' });

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, titleT = 0, score = 0, lives = 3, level = 1, extraGiven = false;
      let blocks, ladders, mrdo, unis, falling, popups, parts, extra, keysGot, cherriesLeft, spawnLeft, spawnT, letters = [0, 0, 0, 0, 0], doorOpen = 0, palette, sndT = 0, killChain = 0, chainT = 0;
      const PALS = [['#c08040', '#804020', '#ffc080'], ['#40a0a0', '#206060', '#a0ffff'], ['#a050c0', '#603070', '#e0b0ff'], ['#a0a040', '#606020', '#ffff90']];

      // ---------------- level ----------------
      function buildLevel() {
        const R = rng(level * 7919 + 13);
        palette = PALS[(level - 1) % PALS.length];
        blocks = []; for (let f = 0; f < NF; f++) { blocks[f] = []; for (let c = 0; c < NCOL; c++) blocks[f][c] = f === NF - 1 ? 's' : 'n'; }
        ladders = [];
        for (let k = 0; k < NF - 1; k++) {
          const n = 2 + (R() < 0.5 ? 1 : 0), used = new Set();
          while (used.size < n) { let c = 1 + Math.floor(R() * (NCOL - 2)); if ([...used].some(u => Math.abs(u - c) < 3)) continue; used.add(c); }
          for (const c of used) ladders.push({ k, c, x: cxOf(c), shift: 0 });
        }
        const free = [];
        for (let f = 0; f < NF - 1; f++) for (let c = 0; c < NCOL; c++) if (!ladders.some(l => l.k === f && l.c === c)) free.push([f, c]);
        for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
        for (let i = 0; i < 8; i++) blocks[free[i][0]][free[i][1]] = 'c';
        for (let i = 8; i < 11; i++) blocks[free[i][0]][free[i][1]] = 'k';
        cherriesLeft = 8; keysGot = 0; doorOpen = 0; extra = null;
        spawnLeft = Math.min(10, 5 + level); falling = []; popups = []; parts = [];
      }
      const P = () => ({ maxOn: Math.min(5, 2 + Math.ceil(level / 2)), spd: Math.min(1.0, 0.5 + level * 0.06), trap: Math.max(120, 300 - level * 20) });
      function resetActors() {
        mrdo = { x: 128, y: FY[5], f: 5, mode: 'walk', face: 0, anim: 0, ham: 0, cool: 0, ladder: null };
        unis = []; spawnT = 90; falling = [];
        if (extra) extra = null;
        if (keysGot >= 3) doorOpen = 120;
      }
      function startGame() {
        score = 0; lives = 3; level = 1; extraGiven = false; letters = [0, 0, 0, 0, 0];
        buildLevel(); resetActors(); state = 'ready'; T = 0;
        A.melody([[523, .12], [523, .06], [659, .12], [784, .12], [659, .06], [784, .24], [1046, .3]], { type: 'square', vol: 0.1 });
      }
      function addScore(n, x, y) {
        score += n; if (x !== undefined) popups.push({ x, y, v: n, t: 60 });
        if (!extraGiven && score >= 10000) { extraGiven = true; gainLife(); }
        if (score > hi) hi = score;
      }
      function gainLife() { lives++; A.melody([[1046, .08], [1318, .08], [1568, .08], [2093, .2]], { vol: 0.1 }); }

      // ---------------- helpers ----------------
      const ladderTopAt = (f, x) => ladders.find(l => l.k === f && Math.abs(l.x - x) < 5);
      const ladderBotAt = (f, x) => ladders.find(l => l.k === f - 1 && Math.abs(l.x - x) < 5);
      const holeAt = (f, c) => f < NF - 1 && blocks[f][c] === 0;
      function trappedIn(f, c) { return unis.some(u => u.mode === 'trap' && u.f === f && colOf(u.x) === c) || (extra && extra.mode === 'trap' && extra.f === f && colOf(extra.x) === c); }
      function shatter(x, y, col) { for (let i = 0; i < 8; i++) parts.push({ x, y, vx: rand(-1.5, 1.5), vy: rand(-2.5, -0.5), t: 40, col }); }

      // ---------------- Mr. Do ----------------
      function updateDo() {
        const d = mrdo, L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        if (d.ham > 0) d.ham--; if (d.cool > 0) d.cool--;
        if (d.mode === 'fall') {
          d.y += 2;
          if (d.y >= FY[d.f + 1]) { d.f++; d.y = FY[d.f]; d.mode = 'walk'; A.tone(120, 0.08, { type: 'square', vol: 0.12 }); }
          return;
        }
        if (d.mode === 'climb') {
          const l = d.ladder;
          if (!ladders.includes(l) || Math.abs(l.x - d.x) > 1) { d.mode = 'fall'; d.f = l.k; return; }
          if (U) { d.y -= 0.8; d.anim++; } else if (D) { d.y += 0.8; d.anim++; }
          if (d.y <= FY[l.k]) { d.y = FY[l.k]; d.f = l.k; d.mode = 'walk'; }
          else if (d.y >= FY[l.k + 1]) { d.y = FY[l.k + 1]; d.f = l.k + 1; d.mode = 'walk'; }
          else if ((d.anim & 7) === 0 && (U || D)) A.tone(400 + (d.anim & 8) * 20, 0.03, { type: 'square', vol: 0.04 });
          return;
        }
        // walking
        if (U || D) {
          const l = U ? ladderBotAt(d.f, d.x) : ladderTopAt(d.f, d.x);
          if (l) { d.x = l.x; d.ladder = l; d.mode = 'climb'; return; }
        }
        if (d.ham <= 0) {
          if (L) { d.x -= 1; d.face = 1; d.anim++; } else if (R) { d.x += 1; d.face = 0; d.anim++; }
          d.x = clamp(d.x, X0 + 6, X0 + NCOL * BW - 6);
          if ((L || R) && (d.anim & 7) === 0) A.tone(d.anim & 8 ? 220 : 180, 0.03, { type: 'triangle', vol: 0.06 });
        }
        // holes under the feet
        const c = colOf(d.x);
        if (holeAt(d.f, c) && Math.abs(d.x - cxOf(c)) < 4 && !ladderTopAt(d.f, d.x) && !trappedIn(d.f, c)) { d.mode = 'fall'; d.x = cxOf(c); return; }
        if (api.pressed('Space') && d.cool <= 0) hammer();
        if (api.pressed('KeyX')) shiftLadder();
      }
      function hammer() {
        const d = mrdo, dir = d.face ? -1 : 1; d.ham = 12; d.cool = 16;
        A.noise(0.06, { vol: 0.12, freq: 2500 });
        // a unicorn within reach?
        const foes = unis.concat(extra ? [extra] : []);
        for (const u of foes) {
          if (u.mode === 'dead' || Math.abs(u.f - d.f) > 0 || u.mode === 'climb') continue;
          const dx = (u.x - d.x) * dir;
          if (dx > -2 && dx < 18) {
            if (u.mode === 'trap') { killUni(u, 500); return; }
            if (u.stun <= 0) { u.stun = 100; u.dir = dir; A.tone(1400, 0.15, { type: 'square', vol: 0.1, slideTo: 600 }); return; }
          }
        }
        // knock out the block ahead
        if (d.f >= NF - 1) return;
        const c = colOf(d.x + dir * 12);
        if (c === colOf(d.x) && Math.abs(d.x - cxOf(c)) < 6) return;
        const b = blocks[d.f][c]; if (!b) return;
        if (ladders.some(l => l.k === d.f && l.c === c)) return;
        blocks[d.f][c] = 0;
        falling.push({ x: cxOf(c), y: FY[d.f], f: d.f, type: b, vy: 0.5 });
        if (b === 'c') { cherriesLeft--; addScore(500, cxOf(c), FY[d.f] - 10); A.melody([[1046, .05], [1318, .05], [1568, .1]], { type: 'square', vol: 0.1 }); }
        else if (b === 'k') {
          keysGot++; addScore(1000, cxOf(c), FY[d.f] - 10); A.melody([[784, .06], [988, .06], [1175, .06], [1568, .15]], { type: 'triangle', vol: 0.15 });
          if (keysGot >= 3) { doorOpen = 180; A.melody([[392, .1], [523, .1], [659, .1], [784, .3]], { type: 'square', vol: 0.12, delay: 0.3 }); }
        } else addScore(10);
        A.tone(300, 0.1, { type: 'square', vol: 0.1, slideTo: 120 });
      }
      function shiftLadder() {
        const d = mrdo; if (d.mode !== 'walk') return;
        const l = ladderTopAt(d.f, d.x) || ladderBotAt(d.f, d.x); if (!l) return;
        const nc = l.c + (d.face ? -1 : 1);
        if (nc < 0 || nc >= NCOL || ladders.some(o => o !== l && o.k === l.k && Math.abs(o.c - nc) < 2)) { A.tone(110, 0.1, { type: 'square', vol: 0.08 }); return; }
        l.c = nc; l.x = cxOf(nc); l.shift = 10;
        if (blocks[l.k][nc] === 0) blocks[l.k][nc] = 'n'; // the ladder top rests on a fresh stone
        A.tone(500, 0.08, { type: 'square', vol: 0.1, slideTo: 800 });
        for (const u of unis.concat(extra ? [extra] : [])) if (u.mode === 'climb' && u.ladder === l) { u.mode = 'fall'; u.f = l.k; u.stun = 90; }
      }

      // ---------------- unicorns ----------------
      function spawnUni(isExtra) {
        const door = DOORS[irand(2)], u = { x: cxOf(door), y: FY[0], f: 0, mode: 'walk', dir: Math.random() < 0.5 ? -1 : 1, anim: 0, stun: 0, trapT: 0, col: irand(4), ladder: null, goal: null, think: 0, isExtra };
        if (isExtra) { u.letter = letters.indexOf(0); if (u.letter < 0) u.letter = irand(5); }
        A.tone(isExtra ? 900 : 600, 0.2, { type: 'sawtooth', vol: 0.07, slideTo: isExtra ? 1500 : 300 });
        return u;
      }
      function doFloor() { return mrdo.mode === 'climb' ? (mrdo.y - FY[mrdo.ladder.k] < (FY[mrdo.ladder.k + 1] - FY[mrdo.ladder.k]) / 2 ? mrdo.ladder.k : mrdo.ladder.k + 1) : mrdo.f; }
      function uniStep(u, spd) {
        if (u.stun > 0) { u.stun--; if (u.mode !== 'fall') return; }
        if (u.mode === 'fall') { u.y += 2; if (u.y >= FY[u.f + 1]) { u.f++; u.y = FY[u.f]; u.mode = 'walk'; } return; }
        if (u.mode === 'trap') {
          if (--u.trapT <= 0) { u.mode = 'walk'; u.y = FY[u.f]; u.x = clamp(cxOf(colOf(u.x)) + u.dir * 12, X0 + 6, X0 + NCOL * BW - 6); }
          return;
        }
        if (u.mode === 'climb') {
          const l = u.ladder, up = u.goalDir < 0;
          u.y += up ? -spd : spd; u.anim++;
          if (u.y <= FY[l.k]) { u.y = FY[l.k]; u.f = l.k; u.mode = 'walk'; u.goal = null; }
          else if (u.y >= FY[l.k + 1]) { u.y = FY[l.k + 1]; u.f = l.k + 1; u.mode = 'walk'; u.goal = null; }
          return;
        }
        const tf = u.isExtra && Math.random() < 0.002 ? irand(NF) : doFloor();
        if (tf !== u.f) {
          if (!u.goal || !ladders.includes(u.goal) || --u.think <= 0) {
            const cand = ladders.filter(l => tf > u.f ? l.k === u.f : l.k === u.f - 1);
            u.goal = cand.length ? cand.reduce((a, b) => (Math.abs(a.x - u.x) + Math.random() * 20 < Math.abs(b.x - u.x) + Math.random() * 20 ? a : b)) : null; u.think = 240;
          }
          if (u.goal) {
            if (Math.abs(u.goal.x - u.x) <= spd) { u.x = u.goal.x; u.ladder = u.goal; u.goalDir = tf > u.f ? 1 : -1; u.mode = 'climb'; return; }
            u.dir = u.goal.x < u.x ? -1 : 1;
          }
        } else if (Math.random() < 0.02 + level * 0.006) u.dir = mrdo.x < u.x ? -1 : 1;
        u.x += u.dir * spd; u.anim++;
        if (u.x < X0 + 6) { u.x = X0 + 6; u.dir = 1; } if (u.x > X0 + NCOL * BW - 6) { u.x = X0 + NCOL * BW - 6; u.dir = -1; }
        const c = colOf(u.x);
        if (holeAt(u.f, c) && Math.abs(u.x - cxOf(c)) < 2 && !ladderTopAt(u.f, u.x) && !trappedIn(u.f, c)) {
          u.mode = 'trap'; u.x = cxOf(c); u.y = FY[u.f] + 7; u.trapT = P().trap; A.tone(200, 0.2, { type: 'triangle', vol: 0.12, slideTo: 80 });
        }
      }
      function killUni(u, pts) {
        u.mode = 'dead';
        if (u.isExtra) {
          letters[u.letter] = 1; addScore(1000, u.x, u.y - 16); extra = null;
          A.melody([[1318, .08], [1568, .08], [2093, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.12 });
          if (letters.every(v => v)) { letters = [0, 0, 0, 0, 0]; gainLife(); popups.push({ x: W / 2, y: 120, v: 0, t: 120, label: 'EXTRA MR.DO!' }); }
          return;
        }
        if (chainT > 0) killChain++; else killChain = 0; chainT = 30;
        addScore(pts * (1 << Math.min(killChain, 3)), u.x, u.y - 16);
        A.tone(800, 0.3, { type: 'square', vol: 0.12, slideTo: 100 }); A.noise(0.2, { vol: 0.1, freq: 1200 });
        shatter(u.x, u.y - 6, UCOL[u.col]);
      }

      // ---------------- play ----------------
      function updatePlay() {
        const p = P(), ramp = Math.min(0.25, T / 60 * 0.004);
        updateDo(); if (state !== 'play') return;
        if (chainT > 0) chainT--;
        // falling blocks crush whatever is beneath
        for (const b of falling) {
          b.vy = Math.min(4, b.vy + 0.3); b.y += b.vy;
          for (const u of unis.concat(extra ? [extra] : [])) {
            if (u.mode === 'dead' || Math.abs(u.x - b.x) > 11) continue;
            const top = u.mode === 'trap' ? u.y - 9 : u.y - 14;
            if (u.f === b.f + 1 && b.y + BH >= top && b.y < u.y) killUni(u, 1000);
          }
          if (mrdo.f === b.f + 1 && mrdo.mode === 'walk' && Math.abs(mrdo.x - b.x) < 9 && b.y + BH >= mrdo.y - 14 && b.y < mrdo.y) { die(); return; }
          if (b.y >= FY[b.f + 1] - BH) { b.done = true; shatter(b.x, FY[b.f + 1] - 4, palette[0]); A.noise(0.12, { vol: 0.12, freq: 700 }); }
        }
        falling = falling.filter(b => !b.done);
        // spawns
        unis = unis.filter(u => u.mode !== 'dead');
        if (spawnLeft > 0 && unis.length < p.maxOn && --spawnT <= 0) { unis.push(spawnUni(false)); spawnLeft--; spawnT = 150; }
        if (doorOpen > 0 && --doorOpen === 0 && !extra) extra = spawnUni(true);
        for (const u of unis) { u.acc = (u.acc || 0) + p.spd + ramp; while (u.acc >= 1 && u.mode !== 'dead') { u.acc -= 1; uniStep(u, 1); } }
        if (extra) { extra.acc = (extra.acc || 0) + p.spd + 0.2; while (extra && extra.acc >= 1 && extra.mode !== 'dead') { extra.acc -= 1; uniStep(extra, 1); } }
        // contact
        const d = mrdo, dy = d.y;
        for (const u of unis.concat(extra ? [extra] : [])) {
          if (u.mode === 'dead' || u.mode === 'trap' || u.stun > 0 || u.mode === 'fall') continue;
          if (Math.abs(u.x - d.x) < 10 && Math.abs(u.y - dy) < 12) { die(); return; }
        }
        if (--sndT <= 0) { sndT = 30; A.tone(unis.length > 2 ? 147 : 131, 0.12, { type: 'triangle', vol: 0.06 }); A.tone(196, 0.1, { type: 'triangle', vol: 0.05, delay: 0.25 }); }
        if (cherriesLeft <= 0 || (spawnLeft <= 0 && unis.length === 0)) { state = 'clear'; T = 0; addScore(2000); A.melody([[523, .1], [659, .1], [784, .1], [1046, .2], [988, .1], [1046, .4]], { type: 'square', vol: 0.12 }); }
      }
      function die() { state = 'dying'; T = 0; A.melody([[659, .12], [622, .12], [587, .12], [554, .12], [523, .12], [494, .12], [466, .4]], { type: 'square', vol: 0.11 }); }

      function update() {
        T++; coin.tick();
        for (const pp of (popups || [])) pp.t--; if (popups) popups = popups.filter(pp => pp.t > 0);
        if (parts) { for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.15; q.t--; } parts = parts.filter(q => q.t > 0); }
        for (const l of (ladders || [])) if (l.shift > 0) l.shift--;
        switch (state) {
          case 'title': titleT++; if (api.anyPressed('Enter', 'Space') && coin.tryStart()) startGame(); break;
          case 'ready': if (T >= 120) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (T >= 150) {
              const respawn = () => { resetActors(); state = 'ready'; T = 0; };
              const over = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'clear': if (T >= 180) { level++; buildLevel(); resetActors(); state = 'ready'; T = 0; } break;
          case 'gameover': if (T >= 200 || (T > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; titleT = 0; } break;
        }
      }

      // ---------------- render ----------------
      function drawBlock(ctx, x, y, type, pal) {
        ctx.fillStyle = pal[1]; ctx.fillRect(x, y, BW, BH);
        ctx.fillStyle = pal[0]; ctx.fillRect(x + 1, y + 1, BW - 2, BH - 2);
        ctx.fillStyle = pal[2]; ctx.fillRect(x + 1, y + 1, BW - 2, 1); ctx.fillRect(x + 1, y + 1, 1, BH - 2);
        if (type === 'c') ctx.drawImage(CHS, x + 5, y + 1);
        else if (type === 'k') { ctx.fillStyle = '#402000'; ctx.fillRect(x + 1, y + 1, BW - 2, BH - 2); ctx.drawImage(KEYS, x + 1, y + 2); }
        else if (type === 's') { ctx.fillStyle = pal[1]; ctx.fillRect(x + 7, y + 1, 1, BH - 2); }
      }
      function drawCastle(ctx) {
        ctx.fillStyle = '#0c0c28'; ctx.fillRect(X0, 28, NCOL * BW, FY[5] - 28);
        ctx.fillStyle = '#16163a';
        for (let y = 30; y < FY[5]; y += 8) for (let x = X0 + ((y >> 3) & 1) * 8; x < X0 + NCOL * BW; x += 16) ctx.fillRect(x, y, 15, 7);
        // battlements
        ctx.fillStyle = palette[1]; for (let x = X0; x < X0 + NCOL * BW; x += 16) ctx.fillRect(x, 22, 9, 8);
        for (const dc of DOORS) {
          const x = cxOf(dc) - 8; ctx.fillStyle = '#000'; ctx.fillRect(x, FY[0] - 18, 16, 18);
          ctx.fillStyle = doorOpen > 0 || (keysGot >= 3 && extra) ? '#ffd020' : '#804020'; ctx.fillRect(x, FY[0] - 18, 16, 2); ctx.fillRect(x, FY[0] - 18, 2, 18); ctx.fillRect(x + 14, FY[0] - 18, 2, 18);
          if (keysGot < 3) { ctx.fillStyle = '#804020'; ctx.fillRect(x + 2, FY[0] - 16, 12, 16); ctx.fillStyle = '#ffd020'; ctx.fillRect(x + 7, FY[0] - 9, 2, 3); }
        }
        for (let f = 0; f < NF; f++) for (let c = 0; c < NCOL; c++) {
          const b = blocks[f][c]; if (!b) { ctx.fillStyle = '#000'; ctx.fillRect(X0 + c * BW, FY[f], BW, BH); continue; }
          drawBlock(ctx, X0 + c * BW, FY[f], b, palette);
        }
        ctx.fillStyle = palette[1]; ctx.fillRect(X0, FY[5] + BH, NCOL * BW, 4);
        for (const l of ladders) {
          const x = l.x - 6, y0 = FY[l.k] - 2, y1 = FY[l.k + 1];
          ctx.fillStyle = l.shift > 0 && (l.shift & 2) ? '#ffffff' : '#ffd040';
          ctx.fillRect(x, y0, 2, y1 - y0); ctx.fillRect(x + 10, y0, 2, y1 - y0);
          for (let y = y0 + 3; y < y1; y += 5) ctx.fillRect(x + 2, y, 8, 1);
        }
      }
      function drawUni(ctx, u) {
        const set = u.isExtra ? UXTRA : u.stun > 0 ? USTUN : USPR[u.col], face = u.dir < 0 ? 1 : 0, fr = (u.anim >> 3) & 1;
        if (u.mode === 'trap') {
          ctx.save(); ctx.beginPath(); ctx.rect(u.x - 8, u.y - 16, 16, FY[u.f] - (u.y - 16)); ctx.clip();
          ctx.drawImage(set[face][0], Math.round(u.x - 8), Math.round(u.y - 14)); ctx.restore();
          if ((api.frame >> 4) & 1) { ctx.fillStyle = '#fff'; ctx.fillRect(u.x - 1, FY[u.f] - 16, 2, 4); }
        } else ctx.drawImage(set[face][fr], Math.round(u.x - 8), Math.round(u.y - 14));
        if (u.isExtra) txt(ctx, 'EXTRA'[u.letter], Math.round(u.x - 6), Math.round(u.y - 24), '#ffffff');
        if (u.stun > 0 && u.mode !== 'trap') { const a = api.frame * 0.2; ctx.fillStyle = '#ffff40'; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(u.x + Math.cos(a + i * 2.1) * 6), Math.round(u.y - 17 + Math.sin(a + i * 2.1) * 2), 2, 2); }
      }
      function drawDo(ctx) {
        const d = mrdo, x = Math.round(d.x - 6), y = Math.round(d.y - 16);
        if (state === 'dying') {
          if (T < 60) { ctx.drawImage(DOS[(T >> 3) & 1][0], x, y); }
          else if (T < 130) { ctx.save(); ctx.translate(d.x, d.y - 8); ctx.rotate(Math.PI / 2); ctx.drawImage(DOS[0][0], -6, -8); ctx.restore(); if ((T >> 3) & 1) txt(ctx, '*', x + 2, y - 10, '#ffff40'); }
          return;
        }
        if (d.mode === 'climb') { ctx.drawImage(DOC, x, y); return; }
        ctx.drawImage(DOS[d.face][d.mode === 'walk' && (api.key('ArrowLeft') || api.key('ArrowRight')) ? (d.anim >> 3) & 1 : 0], x, y);
        // hammer
        const dir = d.face ? -1 : 1, hx = d.x + dir * 7;
        ctx.fillStyle = '#c08040';
        if (d.ham > 6) { ctx.fillRect(Math.min(hx, hx + dir * 2), y + 1, 2, 9); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(hx - 3, y - 2, 6, 4); }
        else if (d.ham > 0) { ctx.fillRect(Math.min(hx, hx + dir * 9), y + 9, 9, 2); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(hx + dir * 9 - 2, y + 7, 4, 7); }
        else { ctx.fillRect(hx - 1, y + 4, 2, 7); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(hx - 3, y + 2, 6, 3); }
      }
      function drawHUD(ctx) {
        txt(ctx, '1UP', 8, 2, '#ff4040'); txt(ctx, pad(score, 6), 8, 11, '#fff');
        ctxt(ctx, 'HI', 112, 2, '#ff4040'); ctxt(ctx, pad(hi, 6), 112, 11, '#fff');
        for (let i = 0; i < 5; i++) {
          const x = 168 + i * 17; ctx.fillStyle = letters[i] ? '#ff2020' : '#303050'; ctx.beginPath(); ctx.arc(x + 6, 9, 7, 0, Math.PI * 2); ctx.fill();
          txt(ctx, 'EXTRA'[i], x + 2, 6, letters[i] ? '#ffffff' : '#7070a0');
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawHUD(ctx);
        if (state === 'title') { renderTitle(ctx); return; }
        drawCastle(ctx);
        for (const b of falling) drawBlock(ctx, b.x - BW / 2, Math.round(b.y), b.type === 'k' || b.type === 'c' ? 'n' : b.type, palette);
        for (const u of unis) drawUni(ctx, u);
        if (extra) drawUni(ctx, extra);
        if (state !== 'gameover') drawDo(ctx);
        for (const q of parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }
        for (const pp of popups) { if (pp.label) ctxt(ctx, pp.label, pp.x, pp.y, '#ffff40'); else tinyNum(ctx, pp.v, pp.x, pp.y, '#ffffff'); }
        // bottom bar
        const yb = FY[5] + 16;
        for (let i = 0; i < Math.min(lives - 1, 6); i++) ctx.drawImage(DOS[0][0], 6 + i * 14, yb - 1);
        for (let i = 0; i < cherriesLeft; i++) ctx.drawImage(CHS, 100 + i * 8, yb + 4);
        if (keysGot) ctx.drawImage(KEYS, 166, yb + 5);
        if (keysGot) txt(ctx, 'X' + keysGot, 184, yb + 4, '#ffd020');
        rtxt(ctx, 'SC' + pad(level, 2), W - 4, yb + 4, '#a0a0ff');
        if (state === 'ready') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 122, 100, 26); ctxt(ctx, 'SCENE ' + level, W / 2, 124, '#40c0ff'); ctxt(ctx, 'READY!', W / 2, 137, '#ffff40'); }
        if (state === 'clear') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 70, 122, 140, 14); ctxt(ctx, 'SCENE CLEAR! 2000', W / 2, 125, '#ffff40'); }
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, 122, 100, 14); ctxt(ctx, 'GAME OVER', W / 2, 125, '#ff3030'); }
      }
      function renderTitle(ctx) {
        const t = titleT;
        txt(ctx, "MR. DO'S", Math.round(W / 2 - textW("MR. DO'S", 3) / 2), 30, '#ff3030', 3);
        txt(ctx, 'CASTLE', Math.round(W / 2 - textW('CASTLE', 3) / 2), 58, '#40c0ff', 3);
        // little castle row
        const pal = PALS[0];
        for (let c = 0; c < 10; c++) drawBlock(ctx, 48 + c * 16, 112, c === 3 ? 'c' : c === 6 ? 'k' : 'n', pal);
        const ux = 48 + ((t * 0.6) % 176);
        ctx.drawImage(USPR[0][0][(t >> 3) & 1], Math.round(ux - 8), 98);
        ctx.drawImage(DOS[1][(t >> 3) & 1], 32, 96);
        const rows = [[CHS, 'CHERRY BLOCK  500', '#ff6060'], [KEYS, 'KEY BLOCK  1000', '#ffd020'], [USPR[1][0][0], 'DROP A BLOCK  1000', '#ff70ff'], [UXTRA[0][0], 'EXTRA MONSTER  1000', '#ffff40']];
        rows.forEach((r, i) => { if (t > 20 + i * 20) { ctx.drawImage(r[0], 34, 132 + i * 16 + (r[0].height < 10 ? 2 : -4)); txt(ctx, r[1], 60, 132 + i * 16, r[2]); } });
        coin.prompt(ctx, W / 2, 202, T, '#ffff40');
        ctxt(ctx, '\u00a9 1983 UNIVERSAL', W / 2, 216, '#ff60c0');
        coin.credit(ctx, 4, 230, '#a0a0a0');
      }

      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
