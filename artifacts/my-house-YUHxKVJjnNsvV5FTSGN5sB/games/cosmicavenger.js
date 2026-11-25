// Cosmic Avenger (Universal, 1981) \u2014 from-scratch recreation for the MAME32 Game Room. Procedural art, synthesized sound.
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
  const W = 256, H = 224, GROUND = 200, SEA_Y = 184, TOPY = 26;
  const CITY_LEN = 3600, SEA_LEN = 3000, STAGE_LEN = CITY_LEN + SEA_LEN + 300;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const SHIP = ['..cc............', '..ccc...........', '.wcccwwwwww.....', 'rwwwwwwwwwwwwbb.', 'rwwwwwwwwwwwwwww', '.wbbbbbbbbbbbb..', '..ccc...........', '..cc............'];
  const UFO_A = ['....yyyy....', '..yyyyyyyy..', '.rrwrrwrrwr.', 'rrrrrrrrrrrr', '.oooooooooo.', '...o.oo.o...'];
  const UFO_B = ['....yyyy....', '..yyyyyyyy..', '.rwrrwrrwrr.', 'rrrrrrrrrrrr', '.oooooooooo.', '..o..oo..o..'];
  const LAUNCHER = ['...ww...', '...rr...', '...ww...', '..gggg..', '.gggggg.', 'gggggggg'];
  const RADAR = ['.wwwwww.', 'w..ww..w', '...ww...', '..gggg..', '.gggggg.'];
  const TANK = ['....kkkkk', '..gggg...', '.gggggg..', 'kkkkkkkk.', '.k.k.k.k.'];
  const SUB = ['......tt........', '.....tttt.......', '.tttttttttttttt.', 'tttttttttttttttt', '.tttttttttttttt.'];
  const BOAT = ['.......mm.......', '......mmmm......', '..wwwwwwwwwwww..', 'kkkkkkkkkkkkkkkk', '.kkkkkkkkkkkkkk.'];
  const MISSILE = ['w', 'r', 'w', 'w', 'y'];

  ArcadeRegistry.register({
    id: 'cosmicavenger', title: 'Cosmic Avenger', year: 1981, maker: 'Universal',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: laser (forward) \u00b7 X: bomb \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#40e0ff', accent: '#ff4040' },
    create(api) {
      const A0 = api.audio, coin = makeCoin(api); let demo = false;
      const A = { tone: (...a) => { if (!demo) A0.tone(...a); }, noise: (...a) => { if (!demo) A0.noise(...a); }, melody: (...a) => demo ? 0 : A0.melody(...a) };
      const SSPR = sprite(SHIP, { c: '#40e0ff', w: '#ffffff', r: '#ff4040', b: '#4060ff' });
      const USPR = [['#ff3030', '#ffe040'], ['#40ff60', '#40e0ff'], ['#ff60ff', '#ffffff']].map(([r, y]) => [sprite(UFO_A, { y, r, w: '#fff', o: '#ff9020' }), sprite(UFO_B, { y, r, w: '#fff', o: '#ff9020' })]);
      const LSPR = sprite(LAUNCHER, { w: '#fff', r: '#ff3030', g: '#40c040' }), RSPR = sprite(RADAR, { w: '#e0e0e0', g: '#40c040' });
      const TSPR = sprite(TANK, { g: '#a0a040', k: '#606060' }), SUBS = sprite(SUB, { t: '#60a0a0' }), BOATS = sprite(BOAT, { m: '#c0c0c0', w: '#ffffff', k: '#806040' });
      const MSPR = sprite(MISSILE, { w: '#ffffff', r: '#ff3030', y: '#ffe040' });
      const STARS = []; for (let i = 0; i < 60; i++) STARS.push({ x: Math.random() * W, y: TOPY + Math.random() * 120, s: 0.2 + Math.random() * 0.6, c: pick(['#ffffff', '#8080ff', '#ffff80', '#80ffff']) });

      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, titleT = 0, score = 0, lives = 3, stage = 1, nextLife = 10000;
      let scroll, ship, lasers, bombs, ufos, shots, missiles, booms, popups, buildings, targets, subs, boats, ufoT, inv, prevSection;

      // ---------------- terrain ----------------
      function genStage() {
        const R = rng(stage * 1013 + 7);
        buildings = []; targets = []; subs = []; boats = [];
        let x = 260;
        while (x < CITY_LEN) {
          const w = 16 + Math.floor(R() * 4) * 8, h = 24 + Math.floor(R() * (40 + Math.min(stage, 4) * 6));
          const b = { x, w, h, col: pick(['#3050a0', '#5040a0', '#306080', '#604070']), seed: Math.floor(R() * 1000) };
          buildings.push(b);
          const roll = R();
          if (roll < 0.42) targets.push({ type: 'launcher', x: x + w / 2, y: GROUND - h, t: 60 + Math.floor(R() * 120) });
          else if (roll < 0.58) targets.push({ type: 'radar', x: x + w / 2, y: GROUND - h, t: 0 });
          else if (roll < 0.72) targets.push({ type: 'tank', x: x + w / 2, y: GROUND - h, t: 80 + Math.floor(R() * 80) });
          x += w + Math.floor(R() * 3) * 8;
        }
        // sea section
        for (let sx = CITY_LEN + 200; sx < CITY_LEN + SEA_LEN - 100; sx += 140 + Math.floor(R() * 120)) {
          if (R() < 0.62) subs.push({ x: sx, y: SEA_Y + 16, t: 60 + Math.floor(R() * 90), up: 0 });
          else boats.push({ x: sx, t: 50 + Math.floor(R() * 80) });
        }
      }
      const section = () => scroll < CITY_LEN ? 'CITY' : scroll < CITY_LEN + SEA_LEN ? 'SEA' : 'END';
      const sx = wx => wx - scroll;

      // ---------------- flow ----------------
      const P = () => ({ spd: Math.min(1.6, 0.9 + stage * 0.12), fire: Math.min(0.7, 0.25 + stage * 0.08), ufoEvery: Math.max(90, 210 - stage * 20) });
      function startStage() {
        scroll = 0; genStage(); prevSection = 'CITY';
        ship = { x: 40, y: 90 }; resetFlying(); state = 'ready'; T = 0;
      }
      function resetFlying() { lasers = []; bombs = []; ufos = []; shots = []; missiles = []; booms = booms || []; popups = popups || []; ufoT = 120; inv = 120; }
      function startGame(isDemo) {
        demo = !!isDemo; score = 0; lives = 3; stage = 1; nextLife = 10000; booms = []; popups = [];
        startStage();
        A.melody([[392, .1], [523, .1], [659, .1], [784, .1], [1046, .2], [784, .1], [1046, .3]], { type: 'square', vol: 0.1 });
      }
      function addScore(n, x, y) {
        if (demo) { if (x !== undefined) popups.push({ x, y, v: n, t: 50 }); return; }
        score += n; if (x !== undefined) popups.push({ x, y, v: n, t: 50 });
        if (score > hi) hi = score;
        if (score >= nextLife) { nextLife += 20000; lives++; A.melody([[1046, .08], [1318, .08], [1568, .08], [2093, .2]], { vol: 0.1 }); }
      }
      function boom(x, y, big, col) {
        booms.push({ x, y, t: 0, big, col: col || '#ffa020' });
        A.noise(big ? 0.8 : 0.25, { vol: big ? 0.25 : 0.14, freq: big ? 800 : 2400, slideTo: 120 });
      }
      function hitBuilding(x, y) {
        for (const b of buildings) { const bx = sx(b.x); if (bx > W || bx + b.w < 0) continue; if (x >= bx && x < bx + b.w && y >= GROUND - b.h) return b; }
        return null;
      }

      // ---------------- play ----------------
      function updatePlay() {
        const p = P(), sp = p.spd; scroll += sp;
        const sec = section();
        if (sec !== prevSection) { prevSection = sec; if (sec === 'SEA') A.melody([[523, .1], [659, .1], [784, .2]], { type: 'triangle', vol: 0.14 }); }
        if (scroll >= STAGE_LEN) { state = 'stageclear'; T = 0; addScore(5000); A.melody([[523, .1], [659, .1], [784, .1], [1046, .1], [1318, .1], [1046, .1], [1318, .4]], { type: 'square', vol: 0.12 }); return; }
        if (inv > 0) inv--;
        // ship
        const s = ship;
        let fireL, fireB;
        if (demo) { const c = demoFly(); fireL = c[0]; fireB = c[1]; }
        else {
          if (api.key('ArrowLeft')) s.x -= 1.6; if (api.key('ArrowRight')) s.x += 1.6;
          if (api.key('ArrowUp')) s.y -= 1.6; if (api.key('ArrowDown')) s.y += 1.6;
          fireL = api.pressed('Space'); fireB = api.pressed('KeyX');
        }
        s.x = clamp(s.x, 4, 170); s.y = clamp(s.y, TOPY + 4, sec === 'CITY' ? GROUND - 10 : SEA_Y - 8);
        if (fireL && lasers.length < 3) { lasers.push({ x: s.x + 16, y: s.y + 4 }); A.tone(2200, 0.07, { type: 'square', vol: 0.06, slideTo: 900 }); }
        if (fireB && bombs.length < 2) { bombs.push({ x: s.x + 8, y: s.y + 7, vx: 1.2, vy: 0.4, water: false }); A.tone(700, 0.25, { type: 'triangle', vol: 0.08, slideTo: 200 }); }
        // terrain crash
        if (inv <= 0 && (hitBuilding(s.x + 14, s.y + 4) || hitBuilding(s.x + 3, s.y + 7) || hitBuilding(s.x + 8, s.y + 6))) { die(); return; }
        // lasers
        for (const l of lasers) {
          l.x += 6;
          if (l.x > W || hitBuilding(l.x, l.y)) { l.dead = true; continue; }
          for (const u of ufos) if (!u.dead && Math.abs(u.x - l.x) < 8 && Math.abs(u.y - l.y) < 5) { u.dead = true; l.dead = true; addScore(u.pts, u.x, u.y); boom(u.x, u.y, false, '#ff60ff'); break; }
          for (const m of missiles) if (!m.dead && Math.abs(m.x - l.x) < 5 && Math.abs(m.y - l.y) < 5) { m.dead = true; l.dead = true; addScore(50, m.x, m.y); boom(m.x, m.y, false); }
          for (const t of targets) if (!t.dead && Math.abs(sx(t.x) - l.x) < 6 && l.y > t.y - 7 && l.y < t.y) { t.dead = true; l.dead = true; scoreTarget(t); }
          for (const b of boats) if (!b.dead && Math.abs(sx(b.x) - l.x) < 9 && l.y > SEA_Y - 7) { b.dead = true; l.dead = true; addScore(300, sx(b.x), SEA_Y - 8); boom(sx(b.x), SEA_Y - 4, false); }
        }
        lasers = lasers.filter(l => !l.dead);
        // bombs
        for (const b of bombs) {
          if (!b.water) { b.vy = Math.min(3, b.vy + 0.1); b.x += b.vx; b.y += b.vy; }
          else { b.x += 0.3 - sp * 0.5; b.y += 0.8; }
          if (b.x < -10 || b.y > H) { b.dead = true; continue; }
          for (const t of targets) if (!t.dead && Math.abs(sx(t.x) - b.x) < 7 && b.y > t.y - 8 && b.y < t.y + 2) { t.dead = true; b.dead = true; scoreTarget(t); }
          if (b.dead) continue;
          if (hitBuilding(b.x, b.y)) { b.dead = true; boom(b.x, b.y, false, '#c0c0c0'); continue; }
          if (sec !== 'CITY' && b.y >= SEA_Y && !b.water) { b.water = true; A.noise(0.15, { vol: 0.1, freq: 600 }); }
          if (sec === 'CITY' && b.y >= GROUND) { b.dead = true; boom(b.x, GROUND, false, '#c0c0c0'); continue; }
          for (const sb of subs) if (!sb.dead && Math.abs(sx(sb.x) + 8 - b.x) < 10 && Math.abs(sb.y + 2 - b.y) < 5) { sb.dead = true; b.dead = true; addScore(500, sx(sb.x) + 8, sb.y - 6); boom(sx(sb.x) + 8, sb.y, true, '#60c0ff'); }
          for (const bt of boats) if (!bt.dead && Math.abs(sx(bt.x) + 8 - b.x) < 10 && Math.abs(SEA_Y - 2 - b.y) < 6) { bt.dead = true; b.dead = true; addScore(300, sx(bt.x) + 8, SEA_Y - 8); boom(sx(bt.x) + 8, SEA_Y - 3, false); }
        }
        bombs = bombs.filter(b => !b.dead);
        // ground targets fire
        for (const t of targets) {
          if (t.dead) continue; const x = sx(t.x); if (x < 20 || x > W - 8) continue;
          if (t.type === 'launcher' && --t.t <= 0) { t.t = Math.round(160 / (0.6 + p.fire)); missiles.push({ x, y: t.y - 6, vy: -0.6, vx: 0 }); A.tone(300, 0.5, { type: 'sawtooth', vol: 0.06, slideTo: 900 }); }
          if (t.type === 'tank' && --t.t <= 0) { t.t = Math.round(140 / (0.6 + p.fire)); aimShot(x, t.y - 4, 1.6); }
        }
        for (const sb of subs) {
          if (sb.dead) continue; const x = sx(sb.x); if (x < 0 || x > W) continue;
          sb.x -= 0.25;
          if (--sb.t <= 0) { if (sb.up) { missiles.push({ x: x + 8, y: SEA_Y - 4, vy: -0.8, vx: 0 }); A.tone(200, 0.5, { type: 'sawtooth', vol: 0.06, slideTo: 700 }); sb.up = 0; sb.t = Math.round(150 / (0.6 + p.fire)); } else { sb.up = 1; sb.t = 40; } }
          sb.y += sb.up ? (sb.y > SEA_Y + 1 ? -0.5 : 0) : (sb.y < SEA_Y + 16 ? 0.5 : 0);
        }
        for (const bt of boats) { if (bt.dead) continue; const x = sx(bt.x); if (x < 10 || x > W - 10) continue; if (--bt.t <= 0) { bt.t = Math.round(120 / (0.6 + p.fire)); aimShot(x + 8, SEA_Y - 6, 1.5); } }
        // missiles: rise, then home in
        for (const m of missiles) {
          m.vy = Math.max(-2.6, m.vy - 0.04);
          if (m.y < ship.y + 30) m.vx += Math.sign(ship.x + 8 - m.x) * 0.03;
          m.vx = clamp(m.vx, -1.2, 1.2); m.x += m.vx - sp * 0.3; m.y += m.vy;
          if (m.y < TOPY) m.dead = true;
          if (!m.dead && inv <= 0 && m.x > ship.x && m.x < ship.x + 16 && m.y > ship.y - 2 && m.y < ship.y + 8) { die(); return; }
        }
        missiles = missiles.filter(m => !m.dead);
        // UFO squadrons
        if (--ufoT <= 0) {
          ufoT = p.ufoEvery + irand(60);
          const n = 3 + irand(3), baseY = 40 + irand(80), kind = irand(3), amp = 10 + irand(25), pts = [100, 150, 200][kind];
          for (let i = 0; i < n; i++) ufos.push({ x: W + 10 + i * 20, y: baseY, by: baseY, ph: i * 0.6, amp, kind, pts, vx: 1.3 + stage * 0.15 + kind * 0.2, t: 30 + irand(120) });
          A.tone(800, 0.3, { type: 'triangle', vol: 0.06, slideTo: 1200 });
        }
        for (const u of ufos) {
          u.x -= u.vx; u.ph += 0.06; u.y = u.by + Math.sin(u.ph) * u.amp;
          if (u.kind === 2 && u.x < ship.x + 60) u.by += Math.sign(ship.y - u.by) * 0.4;
          if (--u.t <= 0) { u.t = 90 + irand(90); if (Math.random() < p.fire && u.x > ship.x + 20) aimShot(u.x, u.y + 4, 1.8); }
          if (u.x < -16) u.dead = true;
          if (!u.dead && inv <= 0 && Math.abs(u.x - (ship.x + 8)) < 12 && Math.abs(u.y - (ship.y + 4)) < 6) { u.dead = true; die(); return; }
        }
        ufos = ufos.filter(u => !u.dead);
        for (const sh of shots) {
          sh.x += sh.vx; sh.y += sh.vy; if (sh.x < -4 || sh.x > W + 4 || sh.y < TOPY || sh.y > H) sh.dead = true;
          if (!sh.dead && inv <= 0 && sh.x > ship.x + 1 && sh.x < ship.x + 15 && sh.y > ship.y && sh.y < ship.y + 8) { die(); return; }
        }
        shots = shots.filter(sh => !sh.dead);
        if ((api.frame & 7) === 0) A.tone(sec === 'SEA' ? 82 : 98, 0.1, { type: 'square', vol: 0.03 });
      }
      // attract-mode autopilot: hug the UFO line, stay above the rooftops, fire and bomb steadily
      function demoFly() {
        const s = ship; let ty = 70;
        const u = ufos.filter(o => o.x > s.x + 10).sort((a, b) => a.x - b.x)[0]; if (u) ty = u.y - 4;
        let roof = GROUND;
        for (const b of buildings) { const x = sx(b.x); if (x < s.x + 70 && x + b.w > s.x - 4) roof = Math.min(roof, GROUND - b.h); }
        for (const m of missiles) if (Math.abs(m.x - s.x - 8) < 24 && m.y > s.y) ty = Math.min(ty, m.y - 30);
        ty = Math.min(ty, roof - 16);
        s.y += clamp(ty - s.y, -1.6, 1.6); s.x += clamp(50 - s.x, -1, 1);
        return [(api.frame % 12) === 0 && !!u && Math.abs(u.y - s.y - 4) < 12, (api.frame % 50) === 0];
      }
      function aimShot(x, y, spd) {
        const dx = ship.x + 8 - x, dy = ship.y + 4 - y, d = Math.hypot(dx, dy) || 1;
        shots.push({ x, y, vx: dx / d * spd, vy: dy / d * spd });
      }
      function scoreTarget(t) {
        const v = t.type === 'radar' ? 300 : t.type === 'tank' ? 150 : 200;
        addScore(v, sx(t.x), t.y - 10); boom(sx(t.x), t.y - 3, false, '#ff8020');
      }
      function die() {
        state = 'dying'; T = 0; boom(ship.x + 8, ship.y + 4, true, '#ffffff');
        A.melody([[600, .1], [500, .1], [400, .1], [300, .1], [200, .3]], { type: 'sawtooth', vol: 0.1 });
      }

      function update() {
        T++; coin.tick();
        if (booms) { for (const b of booms) b.t++; booms = booms.filter(b => b.t < (b.big ? 60 : 26)); }
        if (popups) { for (const pp of popups) pp.t--; popups = popups.filter(pp => pp.t > 0); }
        for (const s of STARS) { s.x -= s.s * (state === 'play' || state === 'title' ? 1 : 0.3); if (s.x < 0) s.x += W; }
        switch (state) {
          case 'title': titleT++; if (api.anyPressed('Enter', 'Space') && coin.tryStart()) startGame(false); else if (titleT > 720) startGame(true); break;
          case 'ready': if (demo && api.anyPressed('Enter', 'Space')) { toTitle(); break; } if (T >= (demo ? 50 : 110)) { state = 'play'; T = 0; } break;
          case 'play': if (demo && (api.anyPressed('Enter', 'Space') || T > 1800)) { toTitle(); break; } updatePlay(); break;
          case 'dying':
            if (demo && T >= 90) { toTitle(); break; }
            if (T >= 120) {
              const respawn = () => { ship = { x: 40, y: 80 }; scroll = Math.max(0, scroll - 120); resetFlying(); state = 'ready'; T = 0; };
              const over = () => { state = 'gameover'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'stageclear': if (T >= 180) { if (demo) { toTitle(); break; } stage++; startStage(); } break;
          case 'gameover': if (T >= 200 || (T > 60 && api.anyPressed('Enter'))) toTitle(); break;
        }
      }
      function toTitle() { state = 'title'; T = 0; titleT = 0; demo = false; }

      // ---------------- render ----------------
      function drawBuilding(ctx, b) {
        const x = Math.round(sx(b.x)), y = GROUND - b.h;
        ctx.fillStyle = b.col; ctx.fillRect(x, y, b.w, b.h);
        ctx.fillStyle = '#000'; ctx.fillRect(x + b.w - 1, y, 1, b.h);
        ctx.fillStyle = '#c0c0ff'; ctx.fillRect(x, y, b.w - 1, 1);
        for (let wy = y + 4; wy < GROUND - 4; wy += 6) for (let wx = x + 3; wx < x + b.w - 4; wx += 5) {
          const on = ((wx - x) * 7 + (wy - y) * 13 + b.seed) % 5 > 1;
          ctx.fillStyle = on ? '#ffe070' : '#202040'; ctx.fillRect(wx, wy, 2, 3);
        }
      }
      function drawBoom(ctx, b) {
        const r = b.t * (b.big ? 0.6 : 0.5), n = b.big ? 16 : 9;
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.283 + b.t * 0.07, rr = r * (0.5 + ((i * 5) % 7) / 12);
          ctx.fillStyle = ['#ffffff', '#ffe040', b.col, '#ff3030'][(i + (b.t >> 2)) & 3];
          ctx.fillRect(Math.round(b.x + Math.cos(a) * rr) - 1, Math.round(b.y + Math.sin(a) * rr) - 1, 2, 2);
        }
      }
      function drawWorld(ctx) {
        // sky + stars
        ctx.fillStyle = '#000014'; ctx.fillRect(0, TOPY - 4, W, H - TOPY + 4);
        for (const s of STARS) { ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
        // distant mountains (parallax)
        ctx.fillStyle = '#18183c';
        for (let x = 0; x < W + 32; x += 4) { const wx = x + scroll * 0.3, h = 18 + Math.sin(wx * 0.02) * 10 + Math.sin(wx * 0.053) * 6; ctx.fillRect(x - ((scroll * 0.3) % 4), GROUND - 50 - h + 30, 4, h + 20); }
        // sea
        const seaStart = sx(CITY_LEN), seaEnd = sx(CITY_LEN + SEA_LEN);
        if (seaEnd > 0 && seaStart < W) {
          const a = Math.max(0, Math.round(seaStart)), b = Math.min(W, Math.round(seaEnd));
          ctx.fillStyle = '#0830a0'; ctx.fillRect(a, SEA_Y, b - a, H - SEA_Y);
          ctx.fillStyle = '#40a0ff';
          for (let x = a; x < b; x += 8) ctx.fillRect(x + ((api.frame >> 3) & 3), SEA_Y + ((x >> 3) & 1), 4, 1);
          ctx.fillStyle = '#0a2070'; for (let y = SEA_Y + 8; y < H; y += 6) for (let x = a + ((y >> 1) & 7); x < b; x += 16) ctx.fillRect(x, y, 6, 1);
        }
        // ground (city / end coast)
        ctx.fillStyle = '#404040';
        if (seaStart > 0) { ctx.fillRect(0, GROUND, Math.min(W, Math.round(seaStart)), H - GROUND); }
        if (seaEnd < W) { ctx.fillRect(Math.max(0, Math.round(seaEnd)), GROUND, W, H - GROUND); }
        ctx.fillStyle = '#606060'; for (let x = -((scroll | 0) % 16); x < Math.min(W, seaStart); x += 16) ctx.fillRect(x, GROUND + 6, 8, 2);
        for (const b of buildings) { const x = sx(b.x); if (x > W || x + b.w < 0) continue; drawBuilding(ctx, b); }
        for (const t of targets) {
          if (t.dead) continue; const x = Math.round(sx(t.x)); if (x < -10 || x > W + 10) continue;
          const spr = t.type === 'launcher' ? LSPR : t.type === 'radar' ? RSPR : TSPR;
          ctx.drawImage(spr, x - (spr.width >> 1), t.y - spr.height);
        }
        for (const sb of subs) { if (sb.dead) continue; const x = Math.round(sx(sb.x)); if (x < -20 || x > W) continue; ctx.drawImage(SUBS, x, Math.round(sb.y) - 3); }
        for (const bt of boats) { if (bt.dead) continue; const x = Math.round(sx(bt.x)); if (x < -20 || x > W) continue; ctx.drawImage(BOATS, x, SEA_Y - 4); }
        // water over submerged subs
        if (seaEnd > 0 && seaStart < W) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#0830a0'; ctx.fillRect(Math.max(0, Math.round(seaStart)), SEA_Y + 1, Math.min(W, Math.round(seaEnd)) - Math.max(0, Math.round(seaStart)), H - SEA_Y); ctx.globalAlpha = 1; }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); drawTop(ctx); return; }
        drawWorld(ctx);
        for (const m of missiles) ctx.drawImage(MSPR, Math.round(m.x), Math.round(m.y));
        for (const u of ufos) ctx.drawImage(USPR[u.kind][(api.frame >> 3) & 1], Math.round(u.x - 6), Math.round(u.y - 3));
        ctx.fillStyle = '#ff80ff'; for (const sh of shots) ctx.fillRect(Math.round(sh.x) - 1, Math.round(sh.y) - 1, 2, 2);
        ctx.fillStyle = '#ffff60'; for (const l of lasers) ctx.fillRect(Math.round(l.x) - 8, Math.round(l.y), 10, 1);
        ctx.fillStyle = '#ffffff'; for (const b of bombs) { ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 3); ctx.fillStyle = '#ff4040'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1); ctx.fillStyle = '#ffffff'; }
        if (state !== 'dying' && state !== 'gameover' && !(inv > 0 && (inv >> 2) & 1)) {
          ctx.drawImage(SSPR, Math.round(ship.x), Math.round(ship.y));
          if ((api.frame >> 1) & 1) { ctx.fillStyle = '#ff8020'; ctx.fillRect(Math.round(ship.x) - 3, Math.round(ship.y) + 3, 3, 2); }
        }
        for (const b of booms) drawBoom(ctx, b);
        for (const pp of popups) tinyNum(ctx, pp.v, pp.x, pp.y, '#ffffff');
        drawTop(ctx);
        // progress bar
        const px = 96, pw = 120; ctx.fillStyle = '#404040'; ctx.fillRect(px, 18, pw, 3);
        ctx.fillStyle = '#5060c0'; ctx.fillRect(px, 18, pw * CITY_LEN / STAGE_LEN, 3); ctx.fillStyle = '#2080ff'; ctx.fillRect(px + pw * CITY_LEN / STAGE_LEN, 18, pw * SEA_LEN / STAGE_LEN, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(px + Math.min(pw, pw * scroll / STAGE_LEN) - 1, 16, 2, 7);
        for (let i = 0; i < Math.min(lives - 1, 5); i++) ctx.drawImage(SSPR, 4 + i * 18, H - 9);
        rtxt(ctx, 'STAGE ' + stage, W - 4, H - 9, '#40e0ff');
        if (demo && (api.frame >> 5) & 1) ctxt(ctx, 'DEMO PLAY', W / 2, 60, '#ffffff');
        if (state === 'ready') { ctxt(ctx, 'STAGE ' + stage, W / 2, 80, '#40e0ff'); ctxt(ctx, section() === 'SEA' ? 'SEA ZONE' : 'CITY ZONE', W / 2, 94, '#ffe040'); }
        if (state === 'stageclear') { ctxt(ctx, 'MISSION COMPLETE', W / 2, 80, '#ffe040'); ctxt(ctx, 'BONUS 5000', W / 2, 94, '#ffffff'); }
        if (state === 'gameover') ctxt(ctx, 'GAME OVER', W / 2, 90, '#ff3030');
      }
      function drawTop(ctx) {
        txt(ctx, '1UP', 4, 1, '#ff4040'); txt(ctx, pad(score, 6), 36, 1, '#ffffff');
        txt(ctx, 'HI', 148, 1, '#ff4040'); txt(ctx, pad(hi, 6), 168, 1, '#ffffff');
        if (state !== 'title' && state !== 'gameover') txt(ctx, section() === 'SEA' ? 'SEA' : section() === 'END' ? 'END' : 'CITY', 4, 12, '#a0a0a0');
      }
      function renderTitle(ctx) {
        const t = titleT;
        for (const s of STARS) { ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
        txt(ctx, 'COSMIC', Math.round(W / 2 - textW('COSMIC', 3) / 2), 24, '#40e0ff', 3);
        txt(ctx, 'AVENGER', Math.round(W / 2 - textW('AVENGER', 3) / 2), 52, '#ff4040', 3);
        const sxp = ((t * 1.5) % 320) - 32;
        ctx.drawImage(SSPR, Math.round(sxp), 84);
        if ((t >> 3) & 1) { ctx.fillStyle = '#ffff60'; ctx.fillRect(Math.round(sxp) + 20 + (t % 8) * 4, 88, 10, 1); }
        const rows = [[USPR[0][(t >> 3) & 1], 'UFO       100-200', '#ff6060'], [MSPR, 'MISSILE   50', '#ffffff'], [LSPR, 'LAUNCHER  200', '#40c040'], [TSPR, 'TANK      150', '#a0a040'], [RSPR, 'RADAR     300', '#e0e0e0'], [SUBS, 'SUBMARINE 500', '#60a0a0']];
        rows.forEach((r, i) => { if (t > 20 + i * 15) { ctx.drawImage(r[0], 48 - (r[0].width >> 1), 106 + i * 14 + ((7 - r[0].height) >> 1)); txt(ctx, r[1], 68, 106 + i * 14, r[2]); } });
        coin.prompt(ctx, W / 2, 194, T, '#ffe040');
        ctxt(ctx, '\u00a9 1981 UNIVERSAL', W / 2, 205, '#ff60c0');
        coin.credit(ctx, 4, 215, '#a0a0a0');
      }

      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
