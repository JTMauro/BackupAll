// Mouse Trap (Exidy, 1981) \u2014 from-scratch recreation for the MAME32 Game Room. Procedural art, synthesized sound.
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
  const W = 224, H = 272, MC = 27, MR = 27, OX = 4, OY = 24;
  const DX = [0, -1, 0, 1], DY = [-1, 0, 1, 0]; // up, left, down, right
  const KEYS = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
  // 9x9 node lattice; segments between nodes are two tiles long. Left/right symmetric.
  const HSEG = ['--------', '-- -- --', '-  --  -', '--------', '- -  - -', '--------', '-- -- --', '- -  - -', '--------'];
  const VSEG = ['|  | |  |', '| |   | |', '|  |||  |', '| | | | |', '|  |||  |', '| |   | |', '|  | |  |', '| | | | |'];
  const nt = i => 1 + 3 * i;
  const OPEN = new Uint8Array(MC * MR);
  for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) OPEN[nt(j) * MC + nt(i)] = 1;
  for (let j = 0; j < 9; j++) for (let i = 0; i < 8; i++) if (HSEG[j][i] === '-') { OPEN[nt(j) * MC + nt(i) + 1] = 1; OPEN[nt(j) * MC + nt(i) + 2] = 1; }
  for (let j = 0; j < 8; j++) for (let i = 0; i < 9; i++) if (VSEG[j][i] === '|') { OPEN[(nt(j) + 1) * MC + nt(i)] = 1; OPEN[(nt(j) + 2) * MC + nt(i)] = 1; }
  const isNode = (c, r) => (c - 1) % 3 === 0 && (r - 1) % 3 === 0;
  const CAT_HOME = [13, 1], MOUSE_HOME = [13, 25], IN_BOX = [13, 13];
  const BONES = [[1, 1], [25, 1], [1, 25], [25, 25]];
  const DOOR_COL = ['#ffe000', '#ff3030', '#3080ff'], DOOR_NAME = ['YELLOW', 'RED', 'BLUE'];
  const CAT_COLS = ['#ff9020', '#e0e0e0', '#ff60c0', '#60e060', '#c080ff', '#ffd040'];

  // ---------------- pixel art (facing right) ----------------
  const MOUSE_ART = [[
    '......pp..', '.....pggp.', '..gggggwk.', 'tgggggggwn', '.tgggggggg', '..gggggg..', '...g..g...', '..........'], [
    '......pp..', '.....pggp.', '..gggggwk.', 'tgggggggwn', 't.gggggggg', '..gggggg..', '..g....g..', '..........']];
  const CAT_ART = [[
    '......o..o', '......oooo', '......owow', 'o.....oooo', '.o.ooooooo', '..ooooooo.', '..oooooo..', '..o.o.o.o.'], [
    '......o..o', '......oooo', '......owow', '.o....oooo', 'o..ooooooo', '..ooooooo.', '..oooooo..', '.o..o..o..']];
  const DOG_ART = [[
    '........bb..', '.......bbbbb', '.......bkbbn', 'b......bbbb.', '.bbbbbbbbb..', '.bbbbbbbbb..', '.bb.....bb..', '.b......b...'], [
    '........bb..', '.......bbbbb', '.......bkbbn', '.b.....bbbb.', 'bbbbbbbbbb..', '.bbbbbbbbb..', '..bb...bb...', '...b...b....']];
  const HAWK_ART = [[
    'bb............bb', '.bbb........bbb.', '..bbbb.yy.bbbb..', '...bbbbbbbbbb...', '.....bbbbbb.....', '......bbbb......', '.......rr.......'], [
    '................', '......y..y......', '...bbbbyybbbb...', '.bbbbbbbbbbbbbb.', 'bbb..bbbbbb..bbb', 'b.....bbbb.....b', '.......rr.......']];
  const BONE_ART = ['w.....w', 'wwwwwww', 'w.....w'];
  const MOUSE_PAL = { g: '#c8c8d0', p: '#ff9ab0', w: '#ffffff', k: '#000', n: '#ff6080', t: '#ff9ab0' };

  ArcadeRegistry.register({
    id: 'mousetrap', title: 'Mouse Trap', year: 1981, maker: 'Exidy',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: yellow doors (tap again fast to cycle red/blue) \u00b7 X: red doors \u00b7 Z: blue doors \u00b7 Enter: dog (uses a bone) / start',
    marquee: { bg: '#000010', fg: '#ffe000', accent: '#ff3030' },
    create(api) {
      const A = api.audio, coin = makeCoin(api);
      const MSPR = [MOUSE_ART.map(f => sprite(f, MOUSE_PAL)), MOUSE_ART.map(f => sprite(flipRows(f), MOUSE_PAL))];
      const CSPR = CAT_COLS.map(col => [CAT_ART.map(f => sprite(f, { o: col, w: '#fff', k: '#000' })), CAT_ART.map(f => sprite(flipRows(f), { o: col, w: '#fff' }))]);
      const SCARED = [CAT_ART.map(f => sprite(f, { o: '#4060ff', w: '#fff' })), CAT_ART.map(f => sprite(flipRows(f), { o: '#4060ff', w: '#fff' }))];
      const DSPR = [DOG_ART.map(f => sprite(f, { b: '#c87830', k: '#000', n: '#000' })), DOG_ART.map(f => sprite(flipRows(f), { b: '#c87830', k: '#000', n: '#000' }))];
      const HSPR = HAWK_ART.map(f => sprite(f, { b: '#a05828', y: '#ffe000', r: '#ff3030' }));
      const BONE = sprite(BONE_ART, { w: '#ffffff' });
      const MAZE = buildMaze('#1030a0', '#40a0ff'), MAZE_W = buildMaze('#a0a0a0', '#ffffff');

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, demo = false, titleT = 0;
      let score = 0, lives = 3, level = 1, extraGiven = false;
      let cheese = new Uint8Array(MC * MR), cheeseLeft = 0, bonesOnMap, bonesHeld = 0;
      let doors = [], BLK = new Uint8Array(MC * MR);
      let mouse, cats, hawk, dogT = 0, catCombo = 0, hawkT = 0, inCool = 0, popups = [], spCol = 0, spT = 0, munch = 0, releaseT = 0, sirenT = 0;

      function buildMaze(fill, edge) {
        const cv = mkCanvas(MC * 8, MR * 8), c = cv.getContext('2d');
        const wall = (x, y) => x < 0 || y < 0 || x >= MC || y >= MR || !OPEN[y * MC + x];
        for (let y = 0; y < MR; y++) for (let x = 0; x < MC; x++) {
          if (!wall(x, y)) continue;
          c.fillStyle = fill; c.fillRect(x * 8, y * 8, 8, 8);
          c.fillStyle = edge;
          if (!wall(x, y - 1)) c.fillRect(x * 8, y * 8, 8, 1);
          if (!wall(x, y + 1)) c.fillRect(x * 8, y * 8 + 7, 8, 1);
          if (!wall(x - 1, y)) c.fillRect(x * 8, y * 8, 1, 8);
          if (!wall(x + 1, y)) c.fillRect(x * 8 + 7, y * 8, 1, 8);
        }
        c.fillStyle = edge; c.fillRect(0, 0, MC * 8, 1); c.fillRect(0, MR * 8 - 1, MC * 8, 1); c.fillRect(0, 0, 1, MR * 8); c.fillRect(MC * 8 - 1, 0, 1, MR * 8);
        return cv;
      }
      function buildDoors() {
        doors = []; let k = level % 2, n = 0;
        for (let j = 1; j <= 7; j++) for (let i = 1; i <= 3; i++) {
          const c = nt(i), r = nt(j);
          const hs = [1, 3].filter(d => OPEN[r * MC + c + DX[d]]), vs = [0, 2].filter(d => OPEN[(r + DY[d]) * MC + c]);
          if (!hs.length || !vs.length) continue;
          if ((k++) % 2) continue;
          const h = hs[(i + j) % hs.length], v = vs[(i + j + level) % vs.length], color = n % 3, st = (i + j) % 2; n++;
          doors.push({ c, r, h, v, color, state: st, swing: 0 });
          doors.push({ c: MC - 1 - c, r, h: h === 1 ? 3 : 1, v, color, state: st, swing: 0 });
        }
        rebuildBlk();
      }
      function doorTile(d) { const dir = d.state ? d.v : d.h; return [d.c + DX[dir], d.r + DY[dir]]; }
      function rebuildBlk() { BLK.fill(0); for (const d of doors) { const [x, y] = doorTile(d); BLK[y * MC + x] = 1; } }
      const pass = (c, r) => c >= 0 && r >= 0 && c < MC && r < MR && OPEN[r * MC + c] === 1 && BLK[r * MC + c] === 0;
      function toggle(color) {
        for (const d of doors) if (d.color === color) { d.state ^= 1; d.swing = 8; }
        rebuildBlk();
        if (!demo) { A.noise(0.05, { vol: 0.12, freq: 1500 }); A.tone(color === 0 ? 660 : color === 1 ? 520 : 400, 0.06, { type: 'square', vol: 0.08 }); }
      }

      // ---------------- setup ----------------
      function fillLevel() {
        cheese.fill(0); cheeseLeft = 0;
        for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) if (OPEN[r * MC + c]) { cheese[r * MC + c] = 1; cheeseLeft++; }
        for (const p of [CAT_HOME, MOUSE_HOME, IN_BOX].concat(BONES)) if (cheese[p[1] * MC + p[0]]) { cheese[p[1] * MC + p[0]] = 0; cheeseLeft--; }
        bonesOnMap = BONES.map(() => true);
        buildDoors();
      }
      const P = () => ({
        cats: Math.min(6, 3 + Math.floor((level - 1) / 2)),
        catSpd: Math.min(1.08, 0.72 + level * 0.05),
        chase: Math.min(0.88, 0.5 + level * 0.06),
        dog: Math.max(150, 390 - (level - 1) * 30),
        hawk: Math.max(1200, 2700 - (level - 1) * 250)
      });
      function resetActors() {
        mouse = { x: MOUSE_HOME[0] * 8 + 4, y: MOUSE_HOME[1] * 8 + 4, dir: 0, want: -1, face: 0, acc: 0, anim: 0, moving: false };
        cats = []; const p = P();
        for (let i = 0; i < p.cats; i++) cats.push({ x: CAT_HOME[0] * 8 + 4, y: CAT_HOME[1] * 8 + 4, dir: 2, acc: 0, mode: 'box', t: i * 70, col: i, face: 0, anim: 0 });
        hawk = null; hawkT = p.hawk; dogT = 0; inCool = 0; releaseT = 0;
      }
      function startGame(isDemo) {
        demo = isDemo; score = 0; lives = 3; level = 1; extraGiven = false; bonesHeld = 0; popups = [];
        fillLevel(); resetActors(); state = 'ready'; T = 0;
        if (!demo) A.melody([[523, .1], [659, .1], [784, .1], [659, .1], [523, .1], [392, .1], [523, .3]], { type: 'square', vol: 0.1 });
      }
      function addScore(n) {
        if (demo) return; score += n;
        if (!extraGiven && score >= 20000) { extraGiven = true; lives++; A.melody([[1046, .08], [1318, .08], [1568, .08], [2093, .2]], { vol: 0.1 }); }
        if (score > hi) hi = score;
      }

      // ---------------- movement ----------------
      const atCenter = e => (e.x & 7) === 4 && (e.y & 7) === 4;
      function mouseStep() {
        const m = mouse, c = m.x >> 3, r = m.y >> 3;
        if (m.want >= 0 && m.want === (m.dir + 2) % 4) m.dir = m.want;
        if (atCenter(m)) {
          if (m.want < 0) { m.moving = false; return; }
          if (pass(c + DX[m.want], r + DY[m.want])) m.dir = m.want;
          if (!pass(c + DX[m.dir], r + DY[m.dir])) { m.moving = false; return; }
        }
        m.x += DX[m.dir]; m.y += DY[m.dir]; m.moving = true; m.anim++;
        if (DX[m.dir]) m.face = DX[m.dir] < 0 ? 1 : 0;
        if (atCenter(m)) eatAt();
      }
      function eatAt() {
        const c = mouse.x >> 3, r = mouse.y >> 3, i = r * MC + c;
        if (cheese[i]) {
          cheese[i] = 0; cheeseLeft--; addScore(10);
          if (!demo) { munch ^= 1; A.tone(munch ? 900 : 700, 0.03, { type: 'square', vol: 0.05 }); }
        }
        BONES.forEach((b, k) => {
          if (bonesOnMap[k] && b[0] === c && b[1] === r) {
            bonesOnMap[k] = false; bonesHeld = Math.min(9, bonesHeld + 1); addScore(100);
            popups.push({ x: mouse.x, y: mouse.y, v: 100, t: 60 });
            if (!demo) A.melody([[784, .05], [1046, .05], [1318, .08]], { type: 'square', vol: 0.1 });
          }
        });
        if (c === IN_BOX[0] && r === IN_BOX[1] && inCool <= 0) warp();
      }
      function warp() {
        // hyperspace: drop the mouse at the node farthest from every cat
        let best = null, bd = -1;
        for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
          const x = nt(i) * 8 + 4, y = nt(j) * 8 + 4; if (BLK[nt(j) * MC + nt(i)]) continue;
          let d = 1e9; for (const ct of cats) if (ct.mode === 'run') d = Math.min(d, Math.hypot(ct.x - x, ct.y - y));
          d += Math.random() * 40; if (i === 4 && j === 4) d = -1;
          if (d > bd) { bd = d; best = [x, y]; }
        }
        mouse.x = best[0]; mouse.y = best[1]; inCool = 600;
        if (hawk) hawk.leaving = true;
        if (!demo) A.tone(200, 0.4, { type: 'sawtooth', vol: 0.1, slideTo: 2000 });
      }
      function catStep(ct) {
        const c = ct.x >> 3, r = ct.y >> 3;
        if (atCenter(ct)) {
          const fwd = pass(c + DX[ct.dir], r + DY[ct.dir]);
          if (isNode(c, r) || !fwd) {
            const back = (ct.dir + 2) % 4, opts = [];
            for (let d = 0; d < 4; d++) if (d !== back && pass(c + DX[d], r + DY[d])) opts.push(d);
            if (!opts.length) { if (pass(c + DX[back], r + DY[back])) ct.dir = back; else return; }
            else {
              const p = P(), mc = mouse.x >> 3, mr = mouse.y >> 3, flee = dogT > 0;
              if (Math.random() < (flee ? 0.8 : p.chase)) {
                let best = flee ? -1 : 1e9;
                for (const d of opts) {
                  const ex = c + DX[d] - mc, ey = r + DY[d] - mr, dd = ex * ex + ey * ey;
                  if (flee ? dd > best : dd < best) { best = dd; ct.dir = d; }
                }
              } else ct.dir = pick(opts);
            }
          }
        }
        ct.x += DX[ct.dir]; ct.y += DY[ct.dir]; ct.anim++;
        if (DX[ct.dir]) ct.face = DX[ct.dir] < 0 ? 1 : 0;
      }
      function demoSteer() {
        // autopilot for attract mode: breadth-first search to the nearest cheese, steering clear of cats
        if (!atCenter(mouse)) return;
        const start = (mouse.y >> 3) * MC + (mouse.x >> 3), prev = new Int16Array(MC * MR).fill(-1);
        const danger = new Uint8Array(MC * MR);
        for (const ct of cats) if (ct.mode === 'run') for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = (ct.x >> 3) + dx, y = (ct.y >> 3) + dy; if (x >= 0 && y >= 0 && x < MC && y < MR) danger[y * MC + x] = 1; }
        const q = [start]; prev[start] = start; let goal = -1;
        while (q.length) {
          const i = q.shift(), x = i % MC, y = (i / MC) | 0;
          if (cheese[i] && i !== start) { goal = i; break; }
          for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * MC + nx; if (pass(nx, ny) && prev[ni] < 0 && !danger[ni]) { prev[ni] = i; q.push(ni); } }
        }
        if (goal < 0) { if (Math.random() < 0.05) toggle(irand(3)); mouse.want = irand(4); return; }
        let i = goal; while (prev[i] !== start) i = prev[i];
        const dx = i % MC - (mouse.x >> 3), dy = ((i / MC) | 0) - (mouse.y >> 3);
        mouse.want = dy < 0 ? 0 : dx < 0 ? 1 : dy > 0 ? 2 : 3;
      }

      // ---------------- play ----------------
      function updatePlay() {
        const p = P();
        if (demo) { demoSteer(); if (Math.random() < 0.004) toggle(irand(3)); }
        else {
          let w = -1; for (let d = 0; d < 4; d++) if (api.key(KEYS[d])) w = d;
          for (let d = 0; d < 4; d++) if (api.pressed(KEYS[d])) w = d;
          if (w >= 0 && api.key(KEYS[mouse.want])) { if (!api.pressed(KEYS[w])) w = mouse.want; }
          mouse.want = w;
          if (api.pressed('Space')) {
            if (spT > 0) { toggle(spCol); spCol = (spCol + 1) % 3; toggle(spCol); } else { spCol = 0; toggle(0); }
            spT = 18;
          }
          if (api.pressed('KeyX')) toggle(1);
          if (api.pressed('KeyZ')) toggle(2);
          if ((api.pressed('Enter') || api.pressed('ShiftLeft') || api.pressed('KeyC')) && bonesHeld > 0 && dogT <= 0) {
            bonesHeld--; dogT = p.dog; catCombo = 0;
            A.tone(300, 0.09, { type: 'sawtooth', vol: 0.16, slideTo: 180 }); A.tone(320, 0.12, { type: 'sawtooth', vol: 0.16, slideTo: 160, delay: 0.14 });
            for (const ct of cats) if (ct.mode === 'run' && Math.random() < 0.7) ct.dir = (ct.dir + 2) % 4;
          }
        }
        if (spT > 0) spT--;
        if (inCool > 0) inCool--;
        for (const d of doors) if (d.swing > 0) d.swing--;
        // mouse
        mouse.acc += dogT > 0 ? 1.15 : 1.0;
        while (mouse.acc >= 1) { mouse.acc -= 1; mouseStep(); }
        if (dogT > 0) { dogT--; if (dogT === 0 && !demo) A.tone(500, 0.2, { type: 'triangle', vol: 0.1, slideTo: 250 }); }
        // cats
        if (releaseT > 0) releaseT--;
        for (const ct of cats) {
          if (ct.mode === 'box' || ct.mode === 'dead') {
            if (--ct.t <= 0 && releaseT <= 0 && pass(CAT_HOME[0], CAT_HOME[1])) {
              ct.mode = 'run'; ct.x = CAT_HOME[0] * 8 + 4; ct.y = CAT_HOME[1] * 8 + 4; ct.dir = 2; releaseT = 50;
              if (!demo) A.tone(1200, 0.08, { type: 'square', vol: 0.05, slideTo: 700 });
            }
            continue;
          }
          ct.acc += dogT > 0 ? p.catSpd * 0.75 : p.catSpd;
          while (ct.acc >= 1) { ct.acc -= 1; catStep(ct); }
        }
        // hawk
        if (!hawk) { if (--hawkT <= 0) { hawk = { x: rand(20, MC * 8 - 20), y: -12, t: 0, leaving: false }; if (!demo) for (let i = 0; i < 3; i++) A.tone(1800, 0.15, { type: 'sawtooth', vol: 0.07, slideTo: 1100, delay: i * 0.2 }); } }
        else {
          hawk.t++;
          if (hawk.t > 660) hawk.leaving = true;
          if (hawk.leaving) { hawk.y -= 1.6; if (hawk.y < -30) { hawk = null; hawkT = p.hawk; } }
          else {
            const dx = mouse.x - hawk.x, dy = mouse.y - hawk.y, d = Math.hypot(dx, dy) || 1, sp = 0.55 + level * 0.05;
            hawk.x += dx / d * sp; hawk.y += dy / d * sp;
          }
        }
        // collisions
        for (const ct of cats) {
          if (ct.mode !== 'run' || Math.abs(ct.x - mouse.x) > 6 || Math.abs(ct.y - mouse.y) > 6) continue;
          if (dogT > 0) {
            const v = Math.min(1600, 100 << catCombo); catCombo++; addScore(v);
            popups.push({ x: ct.x, y: ct.y, v, t: 70 }); ct.mode = 'dead'; ct.t = 240;
            if (!demo) { A.tone(150, 0.25, { type: 'sawtooth', vol: 0.15, slideTo: 60 }); A.noise(0.15, { vol: 0.12, freq: 800 }); }
          } else { die(); return; }
        }
        if (hawk && !hawk.leaving && Math.abs(hawk.x - mouse.x) < 7 && Math.abs(hawk.y - mouse.y) < 6) { die(); return; }
        for (const pp of popups) pp.t--; popups = popups.filter(pp => pp.t > 0);
        if (!demo && --sirenT <= 0) { sirenT = 20; if (hawk && !hawk.leaving) A.tone(1500, 0.12, { type: 'triangle', vol: 0.04, slideTo: 1200 }); else if (dogT > 0) A.tone(220, 0.1, { type: 'triangle', vol: 0.05, slideTo: 330 }); }
        if (cheeseLeft <= 0) { state = 'clear'; T = 0; if (!demo) A.melody([[523, .08], [659, .08], [784, .08], [1046, .08], [784, .08], [1046, .25]], { type: 'square', vol: 0.12 }); }
      }
      function die() {
        state = 'dying'; T = 0;
        if (!demo) { A.melody([[880, .1], [830, .1], [784, .1], [740, .1], [698, .1], [659, .1], [622, .1], [587, .3]], { type: 'square', vol: 0.1 }); A.noise(0.4, { vol: 0.1, freq: 600, delay: 0.9 }); }
      }

      // ---------------- update ----------------
      function update() {
        T++; coin.tick();
        switch (state) {
          case 'title':
            titleT++;
            if (api.anyPressed('Enter', 'Space') && coin.tryStart()) { startGame(false); break; }
            if (titleT > 600) { startGame(true); }
            break;
          case 'ready':
            if (demo && api.anyPressed('Enter', 'Space')) { toTitle(); break; }
            if (T >= (demo ? 60 : 150)) { state = 'play'; T = 0; }
            break;
          case 'play':
            if (demo && (api.anyPressed('Enter', 'Space') || T > 1500)) { toTitle(); break; }
            updatePlay(); break;
          case 'dying':
            if (T >= 130) {
              if (demo) { toTitle(); break; }
              const respawn = () => { resetActors(); state = 'ready'; T = 0; };
              const over = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'clear':
            if (T >= 150) { if (demo) { toTitle(); break; } level++; fillLevel(); resetActors(); state = 'ready'; T = 0; }
            break;
          case 'gameover':
            if (T >= 200 || (T > 60 && api.anyPressed('Enter'))) toTitle();
            break;
        }
      }
      function toTitle() { state = 'title'; T = 0; titleT = 0; demo = false; }

      // ---------------- render ----------------
      function drawMouse(ctx, x, y, face, frame, asDog) {
        if (asDog) ctx.drawImage(DSPR[face][frame], x - 6, y - 5);
        else ctx.drawImage(MSPR[face][frame], x - 5, y - 4);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawTop(ctx);
        if (state === 'title') { renderTitle(ctx); return; }
        const fl = state === 'clear' && ((T >> 3) & 1);
        ctx.drawImage(fl ? MAZE_W : MAZE, OX, OY);
        // cheese
        ctx.fillStyle = '#ffd000';
        for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) if (cheese[r * MC + c]) { const x = OX + c * 8, y = OY + r * 8; ctx.fillRect(x + 2, y + 4, 4, 2); ctx.fillRect(x + 3, y + 3, 3, 1); }
        BONES.forEach((b, k) => { if (bonesOnMap[k]) ctx.drawImage(BONE, OX + b[0] * 8, OY + b[1] * 8 + 2); });
        // IN box and cat gate
        const ix = OX + IN_BOX[0] * 8, iy = OY + IN_BOX[1] * 8;
        ctx.strokeStyle = inCool > 0 ? '#404040' : ((api.frame >> 3) & 1 ? '#ffffff' : '#00ffff'); ctx.lineWidth = 1; ctx.strokeRect(ix - 3.5, iy - 3.5, 15, 15);
        if (inCool <= 0) { ctx.fillStyle = '#00ffff'; ctx.fillRect(ix + 1, iy + 1, 1, 6); ctx.fillRect(ix + 3, iy + 1, 1, 6); ctx.fillRect(ix + 4, iy + 2, 1, 1); ctx.fillRect(ix + 5, iy + 3, 1, 1); ctx.fillRect(ix + 6, iy + 1, 1, 6); }
        ctx.fillStyle = '#ff60c0'; ctx.fillRect(OX + CAT_HOME[0] * 8 - 4, OY + CAT_HOME[1] * 8 - 7, 16, 2);
        // doors
        for (const d of doors) {
          const [bx, by] = doorTile(d), dir = d.state ? d.v : d.h, x = OX + bx * 8, y = OY + by * 8;
          ctx.fillStyle = (d.swing & 2) ? '#ffffff' : DOOR_COL[d.color];
          if (dir === 1 || dir === 3) ctx.fillRect(x + 3, y - 1, 3, 10); else ctx.fillRect(x - 1, y + 3, 10, 3);
          ctx.fillStyle = '#fff'; ctx.fillRect(OX + d.c * 8 + 3, OY + d.r * 8 + 3, 2, 2);
        }
        // actors
        const showA = state !== 'gameover';
        if (showA) {
          for (const ct of cats) {
            if (ct.mode !== 'run') continue;
            const fr = (ct.anim >> 3) & 1, sc = dogT > 0 && !(dogT < 90 && (dogT >> 3) & 1);
            ctx.drawImage(sc ? SCARED[ct.face][fr] : CSPR[ct.col % 6][ct.face][fr], OX + ct.x - 5, OY + ct.y - 4);
          }
          if (state === 'dying') {
            const fr = T < 80 ? (T >> 2) & 3 : 4, mx = OX + mouse.x, my = OY + mouse.y;
            if (fr < 4) { ctx.save(); ctx.translate(mx, my); ctx.rotate(fr * Math.PI / 2); ctx.drawImage(MSPR[0][0], -5, -4); ctx.restore(); }
            else if (T < 120) { ctx.fillStyle = '#c8c8d0'; ctx.fillRect(mx - 6, my + 2, 12, 2); ctx.fillStyle = '#ff9ab0'; ctx.fillRect(mx + 6, my + 2, 2, 1); }
          } else {
            const asDog = dogT > 0 && !(dogT < 90 && (dogT >> 2) & 1);
            drawMouse(ctx, OX + mouse.x, OY + mouse.y, mouse.face, (mouse.anim >> 2) & 1, asDog);
          }
          if (hawk) ctx.drawImage(HSPR[(api.frame >> 3) & 1], Math.round(OX + hawk.x - 8), Math.round(OY + hawk.y - 4));
        }
        for (const pp of popups) tinyNum(ctx, pp.v, OX + pp.x, OY + pp.y - 6, '#00ffff');
        if (state === 'ready') { ctxt(ctx, demo ? 'DEMO' : 'READY!', W / 2, OY + 14 * 8 + 18, '#ffe000'); if (!demo && T < 100) ctxt(ctx, 'LEVEL ' + level, W / 2, OY + 10 * 8 + 18, '#00ffff'); }
        if (state === 'gameover') ctxt(ctx, 'GAME OVER', W / 2, OY + 14 * 8 + 18, '#ff3030');
        if (demo && state === 'play' && (T >> 5) & 1) ctxt(ctx, 'DEMO', W / 2, OY + 106, '#ffffff');
        drawBottom(ctx);
      }
      function drawTop(ctx) {
        if (state === 'title' || ((api.frame >> 4) & 1) || state !== 'play') txt(ctx, '1UP', 16, 1, '#ff3030');
        ctxt(ctx, 'HIGH SCORE', W / 2 + 12, 1, '#ff3030');
        rtxt(ctx, pad(score, 6), 64, 11, '#ffffff'); rtxt(ctx, pad(hi, 6), W / 2 + 36, 11, '#ffffff');
        txt(ctx, 'L' + pad(level, 2), 186, 11, '#00ffff');
      }
      function drawBottom(ctx) {
        const y = OY + MR * 8 + 4;
        for (let i = 0; i < Math.min(lives - 1, 5); i++) ctx.drawImage(MSPR[0][0], 6 + i * 12, y);
        for (let i = 0; i < bonesHeld; i++) ctx.drawImage(BONE, 80 + i * 9, y + 3);
        if (dogT > 0) { ctx.fillStyle = '#c87830'; ctx.fillRect(160, y + 2, Math.ceil(dogT / P().dog * 56), 4); }
        const y2 = y + 14; const lab = [['SPC', 0], ['X', 1], ['Z', 2]]; let x = 8;
        for (const [l, c] of lab) {
          ctx.fillStyle = DOOR_COL[c]; ctx.fillRect(x, y2 + 1, 6, 6);
          if (spT > 0 && spCol === c) { ctx.strokeStyle = '#fff'; ctx.strokeRect(x - 1.5, y2 - 0.5, 9, 9); }
          txt(ctx, l, x + 9, y2, '#a0a0a0'); x += 18 + l.length * 8 + 8;
        }
        txt(ctx, 'DOG:ENTER', 140, y2, bonesHeld > 0 ? '#c87830' : '#404040');
      }
      function renderTitle(ctx) {
        const t = titleT;
        txt(ctx, 'MOUSE', Math.round(W / 2 - textW('MOUSE', 3) / 2), 30, '#ffe000', 3);
        txt(ctx, 'TRAP', Math.round(W / 2 - textW('TRAP', 3) / 2), 58, '#ff3030', 3);
        // doors decoration
        for (let i = 0; i < 3; i++) { ctx.fillStyle = DOOR_COL[i]; ctx.fillRect(40 + i * 56, 88, 32, 3); }
        const rows = [
          [() => ctx.drawImage(MSPR[0][(t >> 3) & 1], 40, 106), 'MOUSE - THAT\'S YOU', '#c8c8d0'],
          [() => ctx.drawImage(CSPR[0][0][(t >> 3) & 1], 40, 124), 'CATS  100-1600', '#ff9020'],
          [() => ctx.drawImage(DSPR[0][(t >> 3) & 1], 39, 141), 'DOG  EATS CATS', '#c87830'],
          [() => ctx.drawImage(HSPR[(t >> 3) & 1], 36, 160), 'HAWK  BEWARE!', '#a05828'],
          [() => { ctx.fillStyle = '#ffd000'; ctx.fillRect(42, 185, 4, 2); ctx.fillRect(43, 184, 3, 1); }, 'CHEESE  10 PTS', '#ffd000'],
          [() => ctx.drawImage(BONE, 40, 200), 'BONE  100 PTS', '#ffffff']
        ];
        rows.forEach((rw, i) => { if (t > 20 + i * 25) { rw[0](); txt(ctx, rw[1], 64, 106 + i * 18 + (i === 4 ? 0 : 0), rw[2]); } });
        ctxt(ctx, 'BONUS MOUSE AT 20000', W / 2, 222, '#00ffff');
        coin.prompt(ctx, W / 2, 238, T, '#ffe000');
        ctxt(ctx, '\u00a9 1981 EXIDY', W / 2, 252, '#ff60c0');
        coin.credit(ctx, 4, 264, '#a0a0a0');
      }

      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
