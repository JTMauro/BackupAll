// Pac-Land (Namco, 1984) -- from-scratch recreation for the MAME32 Game Room.
// Run Pac-Man through town, forest, lakes and mountains to take the lost fairy home to Fairyland,
// then use the magic boots to fly back home. Ghosts drive cars, fly planes and bounce on pogo sticks.
(function () {
  'use strict';
  const W = 288, H = 224;
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
    '=': '00001F001F0000', '*': '0004150E150400', '+': '0004041F040400'
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
  const GHOST_ROWS = [
    '....xxxxxx....',
    '..xxxxxxxxxx..',
    '.xxxxxxxxxxxx.',
    '.xxwwxxxxwwxx.',
    'xxwwbbxxwwbbxx',
    'xxwwbbxxwwbbxx',
    'xxxwwxxxxwwxxx',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxx',
    'xx.xxx..xxx.xx',
    'x...xx..xx...x'];
  const FRUIT_ART = [
    [['....g...', '...gg...', '..g..g..', '.rr..rr.', 'rrwr.rwr', 'rrrr.rrr', '.rr...rr', '........'], { g: '#40c040', r: '#ff2020', w: '#ffffff' }],
    [['...gg...', '..rggr..', '.rrrrrr.', 'rrwrrrrr', 'rryrryrr', '.rrrrrr.', '..rrrr..', '...rr...'], { g: '#40c040', r: '#ff2020', y: '#ffe060', w: '#ffffff' }],
    [['...gg...', '..oggo..', '.oooooo.', 'oowooooo', 'oooooooo', '.oooooo.', '..oooo..', '........'], { g: '#40c040', o: '#ff9020', w: '#ffffff' }],
    [['...g....', '..ggg...', '.rrrrrr.', 'rrwrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '........'], { g: '#40c040', r: '#e01030', w: '#ffffff' }],
    [['...gg...', '..gggg..', '.gGgGgg.', 'gGgGgGgg', 'gGgGgGgg', '.gGgGgg.', '..gggg..', '........'], { g: '#30a030', G: '#a0ff60' }]
  ];
  const GALAXIAN = [
    '...y....y...',
    '...yy..yy...',
    'b..yyyyyy..b',
    'bb.yrrrry.bb',
    'bbbyyyyyybbb',
    'bbb.yyyy.bbb',
    'bb...yy...bb',
    'b....yy....b'];
  const GCOLS = ['#ff2020', '#ffb0ff', '#20ffff', '#ffb050'];

  ArcadeRegistry.register({
    id: 'pacland', title: 'Pac-Land', year: 1984, maker: 'Namco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: run (hold to dash) \u00b7 Space/Up: jump (tap again in air with magic boots) \u00b7 Enter: start',
    marquee: { bg: '#2a6cff', fg: '#ffe000', accent: '#ff2020' },
    create(api) {
      const A = api.audio;
      const GROUND = 184, PW = 12, PH = 16;
      // ---- sprites ----
      function pacFrame(mouth, leg, boots, die) {
        const cv = mkCanvas(18, 20), c = cv.getContext('2d');
        const cx = 8, cy = 9, R = 7;
        for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
          if (x * x + y * y > R * R + 3) continue;
          if (mouth > 0 && x > 0 && Math.abs(y - 1) < x * mouth * 0.5) continue;
          c.fillStyle = '#ffe000'; c.fillRect(cx + x, cy + y, 1, 1);
        }
        if (die) return cv;
        // hat
        c.fillStyle = '#e02020'; c.fillRect(3, 1, 9, 3); c.fillRect(1, 3, 14, 1); c.fillStyle = '#ff8080'; c.fillRect(4, 1, 3, 1);
        // eye
        c.fillStyle = '#000'; c.fillRect(9, 5, 2, 3); c.fillStyle = '#fff'; c.fillRect(8, 5, 1, 3);
        // legs and shoes
        const sh = boots ? '#c060ff' : '#e02020';
        const L = [[5, 9], [7, 7], [4, 10]][leg];
        c.fillStyle = '#ffe000'; c.fillRect(L[0], 16, 1, 2); c.fillRect(L[1], 16, 1, 2);
        c.fillStyle = sh; c.fillRect(L[0] - 1, 18, 4, 2); c.fillRect(L[1] - 1, 18, 4, 2);
        // arm
        c.fillStyle = '#ffd000'; c.fillRect(3 + leg, 11, 2, 2);
        return cv;
      }
      const PAC = [0, 1].map(b => [pacFrame(0.0, 0, b), pacFrame(0.9, 1, b), pacFrame(1.4, 2, b), pacFrame(0.9, 1, b)]);
      const PACJ = [0, 1].map(b => pacFrame(1.2, 2, b));
      const PACDIE = [0, 0.6, 1.2, 1.8, 2.4, 3.2, 4.5].map(m => pacFrame(m, 0, 0, true));
      const GH = GCOLS.map(c => sprite(GHOST_ROWS, { x: c, w: '#ffffff', b: '#2030ff' }));
      const GHB = sprite(GHOST_ROWS, { x: '#2030ff', w: '#ffd0a0', b: '#ffd0a0' });
      const GHW = sprite(GHOST_ROWS, { x: '#f0f0f0', w: '#ff2020', b: '#ff2020' });
      const FRUITS = FRUIT_ART.map(f => sprite(f[0], f[1]));
      const GALX = sprite(GALAXIAN, { y: '#ffe030', b: '#2050ff', r: '#ff2020' });
      const FRUIT_PTS = [100, 300, 500, 700, 1000];

      // ---- rng ----
      let seed = 1;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      const ACTS = [
        { name: 'TOWN', sky: '#5aaaff', far: '#3f7fd0', mid: 'house', ground: 'road', spawn: ['car', 'car', 'car', 'walker'] },
        { name: 'TOWN', sky: '#78b8ff', far: '#4f8fe0', mid: 'house', ground: 'road', spawn: ['car', 'car', 'plane', 'pogo'] },
        { name: 'FOREST LAKE', sky: '#90d0ff', far: '#3a9a58', mid: 'tree', ground: 'grass', spawn: ['pogo', 'plane', 'walker', 'pogo'] },
        { name: 'MOUNTAIN', sky: '#ffb070', far: '#8a5a40', mid: 'rock', ground: 'dirt', spawn: ['walker', 'pogo', 'car', 'plane'] },
        { name: 'RETURN HOME', sky: '#203878', far: '#182858', mid: 'house', ground: 'road', spawn: ['car', 'plane', 'pogo', 'walker', 'car'] }
      ];

      // ---- state ----
      let state = 'title', tmr = 0, score = 0, hi = api.getHiScore(30000), lives = 2, trip = 1, act = 0, nextExtra = 10000;
      let coinFlash = 0, attractT = 0;
      let L = 3000, hyd = [], pits = [], springs = [], pellets = [], hidden = [], items = [], ents = [], popups = [], parts = [];
      let p = null, camX = 0, time = 0, timeTick = 0, blueT = 0, chain = 0, spawnCD = 0, signHit = false, jumpBonus = 0, timeBonus = 0;

      function buildAct() {
        seed = (trip * 131 + act * 17 + 5) >>> 0; rnd();
        const type = act;
        L = 2600 + act * 300 + Math.min(trip, 4) * 100;
        hyd = []; pits = []; springs = []; pellets = []; hidden = []; items = []; ents = []; parts = []; popups = [];
        let x = 280, k = 0;
        while (x < L - 260) {
          const r = rnd();
          if (type === 0 || type === 1) {
            if (r < 0.65) hyd.push({ x, w: 10, h: 14, hid: rnd() < 0.25 ? (rnd() < 0.5 ? 'pellet' : 'galaxian') : null, push: 0, kind: 'hyd' });
            else if (r < 0.85) hyd.push({ x, w: 22, h: 10, hid: null, push: 0, kind: 'box' });
            else if (type === 1) { const w = 36 + Math.floor(rnd() * 20); pits.push([x, x + w, 'hole']); x += w; }
            x += 150 + Math.floor(rnd() * 140);
          } else if (type === 2) {
            if (r < 0.45) { const w = 110 + Math.floor(rnd() * 20); springs.push({ x: x - 22, w: 16 }); pits.push([x, x + w, 'water']); x += w + 40; }
            else if (r < 0.75) { const w = 30 + Math.floor(rnd() * 20); pits.push([x, x + w, 'water']); x += w; }
            else hyd.push({ x, w: 24, h: 12, hid: rnd() < 0.3 ? 'pellet' : null, push: 0, kind: 'log' });
            x += 140 + Math.floor(rnd() * 120);
          } else if (type === 3) {
            if (r < 0.55) { const w = 40 + Math.floor(rnd() * 34); pits.push([x, x + w, 'cliff']); x += w; }
            else hyd.push({ x, w: 16, h: 18, hid: rnd() < 0.3 ? 'galaxian' : null, push: 0, kind: 'rock' });
            x += 130 + Math.floor(rnd() * 120);
          } else {
            if (r < 0.5) { const w = 90 + Math.floor(rnd() * 80); pits.push([x, x + w, 'cliff']); x += w; }
            else if (r < 0.8) hyd.push({ x, w: 10, h: 14, hid: rnd() < 0.3 ? 'pellet' : null, push: 0, kind: 'hyd' });
            else { const w = 40; pits.push([x, x + w, 'hole']); x += w; }
            x += 140 + Math.floor(rnd() * 130);
          }
          k++;
          if (k % 4 === 2) pellets.push({ x: x - 60, y: GROUND - 52 });
          if (k % 5 === 3) hidden.push({ x: x - 90, done: false, kind: rnd() < 0.6 ? 'fruit' : 'galaxian' });
        }
        // keep pellets / hidden spots out of pits for fairness
        pellets = pellets.filter(q => !inPit(q.x));
        hidden = hidden.filter(q => !inPit(q.x));
      }
      function inPit(x) { for (const pt of pits) if (x > pt[0] && x < pt[1]) return pt; return null; }
      const boots = () => act === 4;

      function startAct() {
        buildAct();
        p = { x: 40, y: GROUND, vx: 0, vy: 0, on: true, face: 1, runT: 0, anim: 0, dead: 0, cause: '', jumpHeld: false };
        camX = 0; time = 150; timeTick = 0; blueT = 0; chain = 0; spawnCD = 120; signHit = false; jumpBonus = 0; timeBonus = 0;
        state = 'ready'; tmr = 0;
        A.melody([[523, .12], [659, .12], [784, .12], [1047, .12], [988, .12], [784, .12], [880, .24]], { type: 'square', vol: .1 });
      }
      function startGame() { score = 0; lives = 2; trip = 1; act = 0; nextExtra = 10000; startAct(); }
      function addScore(n, x, y) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += nextExtra === 10000 ? 40000 : 50000; A.melody([[1047, .08], [1319, .08], [1568, .16]], { type: 'square', vol: .12 }); }
        if (score > hi) hi = score;
        if (x != null) popups.push({ x, y, s: String(n), t: 60 });
      }

      // ---- spawning ----
      function spawn() {
        const list = ACTS[act].spawn;
        const kind = list[Math.floor(Math.random() * list.length)];
        const col = Math.floor(Math.random() * 4);
        const sp = 1 + Math.min(0.8, (trip - 1) * 0.2);
        const ahead = camX + W + 30;
        if (kind === 'car') {
          if (Math.random() < 0.22 && p.x > 300) ents.push({ k: 'car', x: camX - 50, y: GROUND, vx: (2.4 + Math.random() * 0.4) * sp, vy: 0, col, t: 0, w: 28, h: 15 });
          else ents.push({ k: 'car', x: ahead, y: GROUND, vx: -(1.2 + Math.random() * 0.8) * sp, vy: 0, col, t: 0, w: 28, h: 15, hop: Math.random() < 0.35 });
        } else if (kind === 'plane') ents.push({ k: 'plane', x: ahead, y: 40 + Math.random() * 24, vx: -1.4 * sp, vy: 0, col, t: 0, w: 26, h: 12, drop: 60 + Math.random() * 80 });
        else if (kind === 'pogo') ents.push({ k: 'pogo', x: ahead, y: GROUND, vx: -0.6 * sp, vy: 0, col, t: 0, w: 12, h: 22 });
        else ents.push({ k: 'walker', x: ahead, y: GROUND, vx: -0.9 * sp, vy: 0, col, t: 0, w: 12, h: 13 });
      }
      function overGround(x) { return !inPit(x); }

      function die(cause) {
        if (state !== 'play') return;
        state = 'dying'; tmr = 0; p.cause = cause;
        if (cause === 'water') A.noise(0.5, { vol: 0.2, freq: 1200, slideTo: 200 });
        A.melody([[784, .1], [659, .1], [523, .1], [440, .1], [349, .12], [262, .3]], { type: 'triangle', vol: .14, delay: 0.1 });
      }

      // ---- player physics ----
      function solidsNear(x) { return hyd.filter(h => h.x > x - 40 && h.x < x + 40); }
      function updatePlayer() {
        // input (mirrored on the trip home)
        let l = api.key('ArrowLeft'), r = api.key('ArrowRight');
        if (boots()) { const t = l; l = r; r = t; }
        const jumpPressed = api.anyPressed('Space', 'ArrowUp', 'KeyX');
        const jumpHeld = api.key('Space') || api.key('ArrowUp') || api.key('KeyX');
        const dir = r ? 1 : l ? -1 : 0;
        if (dir) { if (dir === p.face) p.runT++; else p.runT = 0; p.face = dir; } else p.runT = 0;
        const maxV = p.runT > 30 ? 2.1 : 1.15;
        if (p.on) {
          if (dir) p.vx += dir * 0.12; else p.vx *= 0.8;
          if (Math.abs(p.vx) > maxV) p.vx = Math.sign(p.vx) * Math.max(maxV, Math.abs(p.vx) - 0.08);
          if (Math.abs(p.vx) < 0.05) p.vx = 0;
        } else if (dir && !p.spring) { const nv = p.vx + dir * 0.05; if (Math.abs(nv) <= 2.3 || Math.abs(nv) < Math.abs(p.vx)) p.vx = nv; }
        if (jumpPressed && (p.on || boots())) {
          A.tone(p.on ? 300 : 420, 0.15, { type: 'square', vol: 0.1, slideTo: 900 });
          p.vy = p.on ? -4.7 - Math.abs(p.vx) * 0.15 : -3.7; p.on = false; p.spring = false;
        }
        p.vy += p.spring ? 0.2 : (jumpHeld && p.vy < 0) ? 0.19 : 0.32;
        if (p.vy > 5) p.vy = 5;
        const ox = p.x, oy = p.y;
        p.x += p.vx; p.y += p.vy;
        if (p.x < camX + 6) { p.x = camX + 6; if (p.vx < 0) p.vx = 0; }
        // solids
        let pushing = null;
        p.on = false;
        for (const h of solidsNear(p.x)) {
          const top = GROUND - h.h, l0 = h.x - h.w / 2, r0 = h.x + h.w / 2;
          if (p.x + PW / 2 <= l0 || p.x - PW / 2 >= r0) continue;
          if (p.y > top) {
            if (oy <= top + 0.01 && p.vy >= 0) { p.y = top; p.vy = 0; p.on = true; }
            else if (p.y - PH < GROUND) { // side
              if (ox <= h.x) { p.x = l0 - PW / 2; } else { p.x = r0 + PW / 2; }
              if ((p.vx > 0 && ox <= h.x) || (p.vx < 0 && ox > h.x)) pushing = h;
              p.vx = 0;
            }
          }
        }
        if (pushing && dir) {
          pushing.push++;
          if (pushing.push === 40 && pushing.hid) {
            const k = pushing.hid; pushing.hid = null;
            if (k === 'pellet') pellets.push({ x: pushing.x, y: GROUND - pushing.h - 22 });
            else items.push({ x: pushing.x, y: GROUND - pushing.h - 20, k: 'galaxian', t: 400, vy: -2 });
            A.melody([[880, .05], [1175, .05], [1760, .1]], { type: 'square', vol: .12 });
          }
        }
        // springboards
        for (const s of springs) {
          if (p.vy >= 0 && p.y >= GROUND - 3 && p.y <= GROUND + 2 && Math.abs(p.x - s.x) < s.w / 2 + 2) {
            p.y = GROUND - 3; p.vy = -6.4; p.vx = 2.7; p.face = 1; p.on = false; p.spring = true; s.t = 12;
            A.tone(200, 0.35, { type: 'square', vol: 0.14, slideTo: 1200 });
          }
        }
        // ground
        if (!p.on && p.y >= GROUND && oy <= GROUND + 0.5 && overGround(p.x - 3) || (!p.on && p.y >= GROUND && oy <= GROUND + 0.5 && overGround(p.x + 3))) { p.y = GROUND; p.vy = 0; p.on = true; }
        if (p.on) p.spring = false;
        if (p.y > GROUND + 0.5 && !p.on) {
          // inside a pit: block by pit walls
          const pt = inPit(p.x);
          if (pt && p.y > GROUND + 4) { if (p.x - 4 < pt[0]) p.x = pt[0] + 4; if (p.x + 4 > pt[1]) p.x = pt[1] - 4; }
        }
        if (p.y > H + 20) { die(inPit(p.x) && inPit(p.x)[2] === 'water' ? 'water' : 'fall'); return; }
        if (p.on && Math.abs(p.vx) > 0.1) { p.anim += Math.abs(p.vx) * 0.25; if ((Math.floor(p.anim) & 1) && (api.frame % Math.max(4, Math.round(12 / Math.abs(p.vx)))) === 0) A.tone(140, 0.03, { vol: 0.05 }); }
        if (p.y >= GROUND && p.on) { /* standing */ }
      }

      function updatePlay() {
        tmr++;
        updatePlayer();
        if (state !== 'play') return;
        // camera (forward only)
        camX = Math.max(camX, Math.min(L - W, p.x - 120));
        // timer
        if (++timeTick >= 24) { timeTick = 0; time--; if (time <= 20 && time > 0) A.tone(880, 0.05, { vol: 0.08 }); if (time <= 0) { die('time'); return; } }
        if (blueT > 0) { blueT--; if ((blueT & 15) === 0) A.tone(blueT & 16 ? 500 : 380, 0.08, { type: 'triangle', vol: 0.06 }); }
        // spawn
        if (--spawnCD <= 0 && p.x < L - 300) { spawn(); spawnCD = Math.max(50, 150 - trip * 15 - act * 8 + Math.random() * 80); }
        // entities
        for (const e of ents) {
          e.t++;
          const blue = blueT > 0 && e.blueOK;
          const slow = blue ? 0.5 : 1;
          if (e.k === 'car') {
            e.x += e.vx * slow;
            if (e.hop && (e.t % 70) === 0 && e.y >= GROUND) e.vy = -3.2;
            if (e.vy || e.y < GROUND) { e.vy += 0.25; e.y += e.vy; if (e.y >= GROUND) { e.y = GROUND; e.vy = 0; } }
          } else if (e.k === 'plane') {
            e.x += e.vx * slow; e.y += Math.sin(e.t / 20) * 0.3;
            if (--e.drop <= 0 && e.x < camX + W - 20 && e.x > camX + 20) { e.drop = 140 + Math.random() * 120; ents.push({ k: 'mini', x: e.x, y: e.y + 8, vx: 0, vy: 0, col: e.col, t: 0, w: 10, h: 10, falling: true }); A.tone(900, 0.4, { vol: 0.07, slideTo: 300 }); }
          } else if (e.k === 'pogo' || e.k === 'mini' || e.k === 'walker') {
            const toward = Math.sign(p.x - e.x) || -1;
            if (e.k === 'mini' && e.falling) { e.vy += 0.15; e.y += e.vy; if (e.y >= GROUND && overGround(e.x)) { e.y = GROUND; e.falling = false; e.vy = 0; e.vx = toward * 0.8; } }
            else if (e.k === 'pogo') {
              e.vy += 0.22; e.y += e.vy; e.x += e.vx * slow;
              if (e.y >= GROUND && overGround(e.x)) { e.y = GROUND; e.vy = -4.2 - Math.random(); if (Math.random() < 0.4) e.vx = toward * 0.7; }
            } else {
              e.vy += 0.25; e.y += e.vy;
              if (e.y >= GROUND && overGround(e.x)) { e.y = GROUND; e.vy = 0; if (e.k === 'mini' && (e.t % 40) === 0) e.vy = -3; }
              if (e.k === 'walker' && (e.t % 90) === 0) e.vx = toward * 0.9;
              e.x += (e.vx || toward * 0.8) * slow;
              // hop over hydrants
              for (const h of hyd) if (Math.abs(h.x - e.x) < h.w / 2 + 8 && e.y >= GROUND && e.vy === 0) e.vy = -3.6;
            }
          }
          if (e.t === 1) e.blueOK = blueT === 0;
        }
        ents = ents.filter(e => !e.gone && e.x > camX - 120 && e.x < camX + W + 160 && e.y < H + 30);
        // collisions
        const pl = p.x - 5, pr = p.x + 5, pt = p.y - 15, pb = p.y - 1;
        for (const e of ents) {
          const el = e.x - e.w / 2 + 2, er = e.x + e.w / 2 - 2, et = e.y - e.h + 2, eb = e.y;
          if (pr < el || pl > er || pb < et || pt > eb) continue;
          if (blueT > 0 && e.blueOK) {
            e.gone = true;
            const pts = [200, 400, 800, 1600, 3200][Math.min(4, chain++)];
            addScore(pts, e.x, e.y - 20);
            parts.push({ k: 'eyes', x: e.x, y: e.y - 8, vx: 1.5, vy: -1.6, t: 90 });
            A.tone(220, 0.3, { vol: 0.14, slideTo: 1800 });
          } else { die('ghost'); return; }
        }
        // pellets, hidden spots, items
        for (const q of pellets) if (!q.got && Math.abs(q.x - p.x) < 9 && Math.abs(q.y - (p.y - 8)) < 12) {
          q.got = true; blueT = Math.max(240, 480 - trip * 40 - act * 10); chain = 0; addScore(50);
          for (const e of ents) e.blueOK = true;
          A.melody([[392, .06], [523, .06], [659, .06], [784, .12]], { type: 'square', vol: .12 });
        }
        for (const hs of hidden) if (!hs.done && !p.on && Math.abs(hs.x - p.x) < 10 && p.y < GROUND - 26) {
          hs.done = true;
          items.push({ x: hs.x, y: p.y - 26, k: hs.kind, t: 400, vy: -1.5 });
          A.melody([[1319, .05], [1568, .05], [1976, .1]], { type: 'square', vol: .12 });
        }
        for (const it of items) {
          it.t--; it.vy = Math.min(1, it.vy + 0.06); it.y = Math.min(GROUND - 24, it.y + it.vy);
          if (Math.abs(it.x - p.x) < 10 && Math.abs(it.y - (p.y - 8)) < 14) {
            it.t = 0;
            if (it.k === 'galaxian') addScore(3000, it.x, it.y - 8);
            else addScore(FRUIT_PTS[Math.min(4, trip - 1)], it.x, it.y - 8);
            A.melody([[1047, .05], [1568, .1]], { type: 'square', vol: .12 });
          }
        }
        items = items.filter(it => it.t > 0);
        // break sign
        if (p.x >= L - 70 && !signHit) {
          signHit = true;
          if (!p.on) { const ht = GROUND - p.y; jumpBonus = ht > 60 ? 5000 : ht > 40 ? 2000 : ht > 20 ? 1000 : 500; }
          timeBonus = time * 10;
          state = 'actclear'; tmr = 0;
          A.melody([[659, .1], [784, .1], [988, .1], [1319, .1], [988, .1], [1319, .3]], { type: 'square', vol: .12 });
        }
      }

      function nextAct() {
        if (act === 3) { state = 'fairy'; tmr = 0; A.melody([[784, .2], [988, .2], [1175, .2], [1568, .4], [1319, .2], [1568, .6]], { type: 'triangle', vol: .12 }); return; }
        if (act === 4) { state = 'home'; tmr = 0; addScore(5000 * Math.min(trip, 4)); A.melody([[523, .15], [659, .15], [784, .15], [1047, .3], [784, .15], [1047, .5]], { type: 'square', vol: .12 }); return; }
        act++; startAct();
      }

      function tryStart() { if (api.useCredit()) { startGame(); return; } coinFlash = 90; A.tone(80, 0.25, { vol: 0.2 }); }

      function update() {
        if (coinFlash > 0) coinFlash--;
        for (const q of popups) q.t--; popups = popups.filter(q => q.t > 0);
        for (const q of parts) { q.t--; q.x += q.vx; q.y += q.vy; } parts = parts.filter(q => q.t > 0);
        if (state === 'title') { tmr++; attractT++; if (api.anyPressed('Enter', 'Space')) tryStart(); return; }
        if (state === 'ready') { if (++tmr > 110) { state = 'play'; tmr = 0; } return; }
        if (state === 'play') { updatePlay(); return; }
        if (state === 'actclear') {
          tmr++;
          p.x += 1.2; p.anim += 0.3; p.y = Math.min(GROUND, p.y + 3); p.face = 1;
          if (tmr === 60) addScore(timeBonus);
          if (tmr === 90 && jumpBonus) addScore(jumpBonus);
          if (tmr > 170) nextAct();
          return;
        }
        if (state === 'fairy') { if (++tmr > 330) { act = 4; startAct(); } return; }
        if (state === 'home') { if (++tmr > 360) { trip++; act = 0; startAct(); } return; }
        if (state === 'dying') {
          tmr++;
          if (tmr === 130) {
            const respawn = () => { startAct(); };
            if (lives > 0) { lives--; respawn(); }
            else {
              state = 'wait';
              const over = () => { state = 'gameover'; tmr = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 2; respawn(); }, over); else over();
            }
          }
          return;
        }
        if (state === 'gameover') { if (++tmr > 220) { state = 'title'; tmr = 0; attractT = 0; } return; }
      }

      // ================= Rendering =================
      function hsh(n) { let h = (n * 374761393 + 1013904223) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) >>> 0; }
      function drawBack(ctx, ad) {
        ctx.fillStyle = ad.sky; ctx.fillRect(0, 0, W, GROUND);
        if (act === 4) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 30; i++) { const h = hsh(i + 7); ctx.fillRect((h % 400 - camX * 0.05 % 400 + 400) % 400 - 50, 20 + (h >> 9) % 90, 1, 1); } ctx.fillStyle = '#fff8c0'; ctx.fillRect(220, 30, 12, 12); ctx.fillStyle = ad.sky; ctx.fillRect(225, 28, 9, 10); }
        // clouds
        if (act !== 4) {
          ctx.fillStyle = '#ffffff';
          for (let i = -1; i < 4; i++) { const n = Math.floor(camX * 0.15 / 120) + i, x = n * 120 - camX * 0.15 + (hsh(n) % 50), y = 26 + hsh(n + 99) % 40; ctx.fillRect(x, y, 28, 6); ctx.fillRect(x + 6, y - 4, 14, 4); ctx.fillRect(x + 4, y + 6, 22, 2); }
        }
        // far hills
        ctx.fillStyle = ad.far;
        for (let sx = 0; sx < W; sx += 4) {
          const wx = sx + camX * 0.3;
          const h = act === 3 ? 60 + Math.abs(((wx / 70) % 2) - 1) * 50 + Math.sin(wx / 23) * 6 : 30 + Math.sin(wx / 60) * 14 + Math.sin(wx / 23) * 6;
          ctx.fillRect(sx, GROUND - 12 - h, 4, h + 12);
        }
        // mid layer
        const par = 0.6, base = Math.floor(camX * par / 64) - 1;
        for (let i = 0; i < 7; i++) {
          const n = base + i, x = Math.round(n * 64 - camX * par), h = hsh(n * 3 + act);
          if (ad.mid === 'house') {
            if (h % 5 === 0) continue;
            const hw = 36 + h % 16, hh = 26 + (h >> 4) % 28, cols = ['#d07040', '#e0c080', '#8090d0', '#d0a0a0', '#a0c090'];
            ctx.fillStyle = act === 4 ? '#303050' : cols[(h >> 8) % 5]; ctx.fillRect(x, GROUND - 8 - hh, hw, hh + 8);
            ctx.fillStyle = act === 4 ? '#202038' : '#a03020';
            for (let k = 0; k < 8; k++) ctx.fillRect(x - 2 + k * 2, GROUND - 8 - hh - 8 + k, hw + 4 - k * 4, 1);
            for (let wy = GROUND - hh; wy < GROUND - 14; wy += 12) for (let wx = x + 5; wx < x + hw - 8; wx += 12) {
              ctx.fillStyle = act === 4 ? ((hsh(wx * 7 + wy) & 3) ? '#ffe080' : '#202038') : '#4060a0'; ctx.fillRect(wx, wy, 6, 7);
            }
          } else if (ad.mid === 'tree') {
            ctx.fillStyle = '#7a4a20'; ctx.fillRect(x + 14, GROUND - 40, 6, 40);
            ctx.fillStyle = (h & 1) ? '#208830' : '#30a040';
            for (let dy = -14; dy <= 14; dy++) { const w = Math.round(Math.sqrt(196 - dy * dy) * 1.2); ctx.fillRect(x + 17 - w, GROUND - 56 + dy, w * 2, 1); }
          } else {
            ctx.fillStyle = '#6a4a30';
            const hh = 20 + h % 30;
            for (let k = 0; k < hh; k++) ctx.fillRect(x + 4 + Math.floor(k * 0.4), GROUND - 4 - k, 40 - Math.floor(k * 0.8), 1);
          }
        }
      }
      function drawGround(ctx, ad) {
        const g = ad.ground;
        const top = g === 'road' ? '#909090' : g === 'grass' ? '#40b030' : '#b07040';
        const body = g === 'road' ? '#505060' : g === 'grass' ? '#7a5020' : '#7a4a28';
        ctx.fillStyle = top; ctx.fillRect(0, GROUND, W, 5);
        ctx.fillStyle = body; ctx.fillRect(0, GROUND + 5, W, H - GROUND - 5);
        if (g === 'road') { ctx.fillStyle = '#f0f0f0'; for (let x = -((camX * 1) % 32); x < W; x += 32) ctx.fillRect(Math.round(x), GROUND + 20, 14, 2); ctx.fillStyle = '#c0c0c0'; for (let x = -((camX) % 16); x < W; x += 16) ctx.fillRect(Math.round(x), GROUND, 1, 5); }
        else { ctx.fillStyle = g === 'grass' ? '#5a3a10' : '#5a3418'; for (let x = -((camX) % 12); x < W; x += 12) ctx.fillRect(Math.round(x), GROUND + 10 + (Math.floor((x + camX) / 12) & 3) * 4, 3, 2); }
        // pits
        for (const pt of pits) {
          const x0 = Math.round(pt[0] - camX), x1 = Math.round(pt[1] - camX);
          if (x1 < 0 || x0 > W) continue;
          if (pt[2] === 'water') {
            ctx.fillStyle = ad.sky; ctx.fillRect(x0, GROUND, x1 - x0, 8);
            ctx.fillStyle = '#2050d0'; ctx.fillRect(x0, GROUND + 8, x1 - x0, H - GROUND);
            ctx.fillStyle = '#80b0ff'; for (let x = x0 + ((api.frame >> 2) % 8); x < x1 - 4; x += 8) ctx.fillRect(x, GROUND + 9, 4, 1);
          } else {
            ctx.fillStyle = pt[2] === 'hole' ? '#101018' : ad.sky; ctx.fillRect(x0, GROUND, x1 - x0, H - GROUND);
            if (pt[2] === 'cliff') { ctx.fillStyle = ad.far; ctx.fillRect(x0, GROUND + 20, x1 - x0, H); }
            ctx.fillStyle = body; ctx.fillRect(x0 - 2, GROUND, 2, H); ctx.fillRect(x1, GROUND, 2, H);
          }
        }
      }
      function drawSolid(ctx, h) {
        const x = Math.round(h.x - camX - h.w / 2), y = GROUND - h.h;
        if (x > W || x + h.w < 0) return;
        if (h.kind === 'hyd') {
          ctx.fillStyle = '#e02020'; ctx.fillRect(x + 1, y + 3, 8, 11); ctx.fillRect(x, y + 5, 10, 3);
          ctx.fillStyle = '#ff8080'; ctx.fillRect(x + 2, y, 6, 3); ctx.fillRect(x + 2, y + 4, 1, 9);
          ctx.fillStyle = '#ffe060'; ctx.fillRect(x + 4, y + 1, 2, 1);
        } else if (h.kind === 'box') {
          ctx.fillStyle = '#40a040'; ctx.fillRect(x, y, h.w, h.h); ctx.fillStyle = '#80e080'; ctx.fillRect(x, y, h.w, 2); ctx.fillStyle = '#206020'; ctx.fillRect(x + 2, y + 4, h.w - 4, 1);
        } else if (h.kind === 'log') {
          ctx.fillStyle = '#8a5020'; ctx.fillRect(x, y + 1, h.w, h.h - 1); ctx.fillStyle = '#c08040'; ctx.fillRect(x, y, h.w, 2);
          ctx.fillStyle = '#e0b070'; ctx.fillRect(x + h.w - 6, y + 3, 4, h.h - 5);
        } else {
          ctx.fillStyle = '#808080'; ctx.fillRect(x + 2, y, h.w - 4, h.h); ctx.fillRect(x, y + 4, h.w, h.h - 4);
          ctx.fillStyle = '#b0b0b0'; ctx.fillRect(x + 3, y + 1, 5, 3); ctx.fillStyle = '#505050'; ctx.fillRect(x + h.w - 4, y + 6, 2, h.h - 7);
        }
      }
      function drawGhostSpr(ctx, e, x, y) {
        const blue = blueT > 0 && e.blueOK;
        const img = blue ? (blueT < 100 && ((blueT >> 3) & 1) ? GHW : GHB) : GH[e.col];
        ctx.drawImage(img, Math.round(x), Math.round(y));
      }
      function drawEnt(ctx, e) {
        const x = e.x - camX, y = e.y;
        if (x < -40 || x > W + 40) return;
        const blue = blueT > 0 && e.blueOK;
        const dir = e.vx > 0 ? 1 : -1;
        if (e.k === 'car') {
          const bx = Math.round(x - 14), by = Math.round(y - 15);
          drawGhostSpr(ctx, e, bx + 7, by - 6);
          ctx.fillStyle = blue ? '#2030ff' : ['#d02020', '#e070d0', '#20b0d0', '#e08020'][e.col];
          ctx.fillRect(bx, by + 5, 28, 7); ctx.fillRect(bx + (dir > 0 ? 18 : 2), by + 1, 8, 5);
          ctx.fillStyle = '#c0e0ff'; ctx.fillRect(bx + (dir > 0 ? 19 : 3), by + 2, 6, 3);
          ctx.fillStyle = '#ffff80'; ctx.fillRect(dir > 0 ? bx + 27 : bx, by + 7, 1, 2);
          ctx.fillStyle = '#000'; ctx.fillRect(bx + 3, by + 11, 6, 4); ctx.fillRect(bx + 19, by + 11, 6, 4);
          ctx.fillStyle = '#909090'; ctx.fillRect(bx + 5, by + 12, 2, 2); ctx.fillRect(bx + 21, by + 12, 2, 2);
        } else if (e.k === 'plane') {
          const bx = Math.round(x - 13), by = Math.round(y - 12);
          ctx.fillStyle = blue ? '#2030ff' : '#e0e040'; ctx.fillRect(bx + 2, by + 6, 22, 4); ctx.fillRect(bx + 6, by, 12, 2); ctx.fillRect(bx + 6, by + 11, 12, 1);
          ctx.fillStyle = '#806020'; ctx.fillRect(bx + 8, by + 2, 1, 4); ctx.fillRect(bx + 16, by + 2, 1, 4);
          ctx.fillStyle = '#d0d0d0'; ctx.fillRect(bx, by + 3 + ((api.frame >> 1) & 1) * 4, 1, 6); ctx.fillRect(bx + 24, by + 3, 2, 3);
          ctx.drawImage(blue ? GHB : GH[e.col], 0, 0, 14, 8, bx + 6, by - 4, 14, 8);
        } else if (e.k === 'pogo') {
          const bx = Math.round(x - 7), by = Math.round(y - 24);
          drawGhostSpr(ctx, e, bx, by);
          ctx.fillStyle = '#c0c0c0'; ctx.fillRect(bx + 6, by + 12, 2, 8); ctx.fillRect(bx + 2, by + 14, 10, 1);
          ctx.fillStyle = '#404040'; for (let k = 0; k < 3; k++) ctx.fillRect(bx + 5, by + 20 + k, 4, 1);
        } else {
          const bx = Math.round(x - 7), by = Math.round(y - 13);
          if (e.k === 'mini') { ctx.drawImage(blue ? GHB : GH[e.col], bx + 2, by + 3, 10, 10); if (e.falling) { ctx.fillStyle = '#fff'; ctx.fillRect(bx, by - 4, 14, 4); ctx.fillRect(bx + 6, by, 1, 4); } }
          else drawGhostSpr(ctx, e, bx, by);
        }
      }
      function drawPac(ctx) {
        const x = Math.round(p.x - camX), y = Math.round(p.y);
        const b = boots() ? 1 : 0;
        let img;
        if (state === 'dying') {
          if (p.cause === 'fall' || p.cause === 'water') return;
          const i = Math.min(PACDIE.length - 1, Math.floor(tmr / 10));
          if (tmr > 90) return;
          img = PACDIE[i];
          ctx.save(); ctx.translate(x, y - 10); ctx.rotate(-Math.PI / 2); ctx.drawImage(img, -8, -9); ctx.restore();
          return;
        }
        img = !p.on ? PACJ[b] : Math.abs(p.vx) > 0.1 || state === 'actclear' ? PAC[b][Math.floor(p.anim) & 3] : PAC[b][0];
        if (p.face < 0) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(img, -9, y - 20); ctx.restore(); }
        else ctx.drawImage(img, x - 9, y - 20);
        if (act < 4) { // the lost fairy rides on Pac-Man's hat
          const fx = x - p.face * 3, fy = y - 25 + ((api.frame >> 4) & 1);
          ctx.fillStyle = '#ffc0e0'; ctx.fillRect(fx - 1, fy, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - 3, fy - 1 + ((api.frame >> 2) & 1), 2, 2); ctx.fillRect(fx + 2, fy - 1 + ((api.frame >> 2) & 1), 2, 2);
        }
      }
      function wtext(ctx, s, x, y, col) {
        if (!boots()) { txt(ctx, s, x, y, col, 1, 'c'); return; }
        ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); txt(ctx, s, 0, y, col, 1, 'c'); ctx.restore();
      }
      function drawWorld(ctx) {
        const ad = ACTS[act];
        drawBack(ctx, ad); drawGround(ctx, ad);
        for (const s of springs) { const x = Math.round(s.x - camX - s.w / 2); if (x < -20 || x > W) continue; const c = s.t > 0 ? (s.t--, 2) : 0; ctx.fillStyle = '#ffe000'; ctx.fillRect(x, GROUND - 3 + c, s.w, 2); ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x + 2, GROUND - 1, 2, 1); ctx.fillRect(x + s.w - 4, GROUND - 1, 2, 1); }
        for (const h of hyd) drawSolid(ctx, h);
        // break sign
        const sx = Math.round(L - 70 - camX);
        if (sx > -40 && sx < W + 20) { ctx.fillStyle = '#806040'; ctx.fillRect(sx, GROUND - 40, 3, 40); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 18, GROUND - 52, 40, 14); ctx.fillStyle = '#e02020'; ctx.fillRect(sx - 17, GROUND - 51, 38, 12); wtext(ctx, 'BREAK', sx + 2, GROUND - 48, '#ffffff'); }
        const pulse = (api.frame >> 3) & 1;
        for (const q of pellets) {
          if (q.got) continue; const x = Math.round(q.x - camX); if (x < -10 || x > W + 10) continue;
          ctx.fillStyle = '#806040'; ctx.fillRect(x - 1, q.y + 5, 2, GROUND - q.y - 5 > 30 ? 0 : 0);
          ctx.fillStyle = pulse ? '#ffb8ae' : '#ffe0d0'; const R = 4 + pulse;
          for (let dy = -R; dy <= R; dy++) { const w = Math.round(Math.sqrt(R * R - dy * dy)); ctx.fillRect(x - w, q.y + dy, w * 2, 1); }
        }
        for (const it of items) { const x = Math.round(it.x - camX); if (it.t < 90 && ((it.t >> 2) & 1)) continue; if (it.k === 'galaxian') ctx.drawImage(GALX, x - 6, Math.round(it.y) - 4); else ctx.drawImage(FRUITS[Math.min(4, trip - 1)], x - 4, Math.round(it.y) - 4); }
        for (const e of ents) drawEnt(ctx, e);
        if (state !== 'wait' && state !== 'gameover') drawPac(ctx);
        for (const q of parts) { const x = Math.round(q.x - camX), y = Math.round(q.y); ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y, 3, 4); ctx.fillRect(x + 1, y, 3, 4); ctx.fillStyle = '#2030ff'; ctx.fillRect(x - 3, y + 1, 2, 2); ctx.fillRect(x + 2, y + 1, 2, 2); }
        if (!boots()) for (const q of popups) txt(ctx, q.s, Math.round(q.x - camX), Math.round(q.y - (60 - q.t) / 4), '#ffffff', 1, 'c');
        if (state === 'dying' && (p.cause === 'water') && tmr < 50) { const x = Math.round(p.x - camX); ctx.fillStyle = '#c0e0ff'; for (let k = 0; k < 6; k++) ctx.fillRect(x - 10 + k * 4, GROUND + 6 - Math.round(Math.sin((tmr + k * 5) / 8) * 10), 2, 2); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 18);
        txt(ctx, '1UP', 8, 1, '#ff4040'); txt(ctx, String(score).padStart(7, ' '), 0, 10, '#ffffff');
        txt(ctx, 'HI-SCORE', W / 2, 1, '#ff4040', 1, 'c'); txt(ctx, String(hi).padStart(7, ' '), W / 2 - 28, 10, '#ffffff');
        if (state !== 'title') {
          txt(ctx, 'TIME', W - 40, 1, '#40ffff'); txt(ctx, String(Math.max(0, time)).padStart(3, ' '), W - 32, 10, time <= 20 && (api.frame & 16) ? '#ff4040' : '#ffffff');
          ctx.fillStyle = '#000'; ctx.fillRect(0, H - 12, W, 12);
          for (let i = 0; i < Math.min(6, lives); i++) ctx.drawImage(PAC[0][0], 4 + i * 16, H - 12, 12, 12);
          txt(ctx, 'TRIP ' + trip + ' ' + (act < 4 ? 'ROUND ' + (act + 1) : 'HOME'), W - 4, H - 9, '#ffe000', 1, 'r');
        }
      }
      function drawFairy(ctx, x, y, s) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6 * s, y - 2 * s + ((api.frame >> 2) & 1) * s, 4 * s, 4 * s); ctx.fillRect(x + 2 * s, y - 2 * s + ((api.frame >> 2) & 1) * s, 4 * s, 4 * s);
        ctx.fillStyle = '#ffc0e0'; ctx.fillRect(x - 2 * s, y - 3 * s, 4 * s, 3 * s); ctx.fillStyle = '#ff60a0'; ctx.fillRect(x - 2 * s, y, 4 * s, 4 * s);
        ctx.fillStyle = '#ffe060'; ctx.fillRect(x - 2 * s, y - 4 * s, 4 * s, 1 * s);
      }
      function drawFairyland(ctx) {
        ctx.fillStyle = '#ffd0f0'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#a0ffa0'; ctx.fillRect(0, GROUND, W, H - GROUND);
        // castle
        ctx.fillStyle = '#ffffff'; ctx.fillRect(170, 90, 90, 94); ctx.fillRect(160, 70, 20, 114); ctx.fillRect(250, 70, 20, 114);
        ctx.fillStyle = '#ff80c0'; for (let k = 0; k < 14; k++) { ctx.fillRect(170 - k / 2, 56 + k, k, 1); ctx.fillRect(260 - k / 2, 56 + k, k, 1); }
        ctx.fillStyle = '#c080ff'; ctx.fillRect(203, 140, 24, 44);
        for (let i = 0; i < 12; i++) { const h = hsh(i + 3); ctx.fillStyle = (api.frame + i * 5) & 16 ? '#ffffff' : '#ffe060'; ctx.fillRect(h % W, 20 + (h >> 8) % 140, 2, 2); }
        const qx = 120, qy = 120 + Math.sin(tmr / 20) * 4;
        drawFairy(ctx, qx, qy, 3);
        ctx.drawImage(PAC[tmr > 200 ? 1 : 0][0], 60, GROUND - 20);
        if (tmr > 60) txt(ctx, 'THANK YOU PAC-MAN!', W / 2, 30, '#c02080', 1, 'c');
        if (tmr > 140) txt(ctx, 'PLEASE TAKE THESE', W / 2, 46, '#c02080', 1, 'c');
        if (tmr > 170) txt(ctx, 'MAGIC BOOTS!', W / 2, 58, '#8020c0', 1, 'c');
        if (tmr > 140 && tmr < 200) { ctx.fillStyle = '#c060ff'; const t = (tmr - 140) / 60; ctx.fillRect(Math.round(qx - t * 50), Math.round(qy + t * 40), 6, 4); }
        if (tmr > 230) txt(ctx, 'NOW HEAD BACK HOME', W / 2, 200, '#000000', 1, 'c');
      }
      function drawHome(ctx) {
        ctx.fillStyle = '#ffa060'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#80c060'; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = '#f0e0b0'; ctx.fillRect(150, 110, 90, 74); ctx.fillStyle = '#c03020';
        for (let k = 0; k < 30; k++) ctx.fillRect(145 + k * 1.5, 80 + k, 100 - k * 3, 1);
        ctx.fillStyle = '#804020'; ctx.fillRect(186, 146, 18, 38); ctx.fillStyle = '#80b0ff'; ctx.fillRect(160, 124, 16, 14); ctx.fillRect(214, 124, 16, 14);
        const px = Math.min(150, 20 + tmr);
        ctx.drawImage(PAC[0][tmr < 130 ? (tmr >> 2) & 3 : 0], px - 9, GROUND - 20);
        // Ms. Pac-Man with bow, and baby
        ctx.save(); ctx.translate(176, 0); ctx.scale(-1, 1); ctx.drawImage(PAC[0][0], -9, GROUND - 20); ctx.restore();
        ctx.fillStyle = '#ff2080'; ctx.fillRect(170, GROUND - 22, 6, 3);
        ctx.drawImage(PAC[0][0], 0, 0, 18, 20, 200, GROUND - 10, 9, 10);
        txt(ctx, 'WELCOME HOME!', W / 2, 40, '#ffffff', 1, 'c');
        if (tmr > 90) txt(ctx, 'TRIP ' + trip + ' COMPLETE', W / 2, 56, '#ffe000', 1, 'c');
        if (tmr > 120) txt(ctx, 'BONUS ' + 5000 * Math.min(trip, 4), W / 2, 72, '#ffffff', 1, 'c');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#5aaaff'; ctx.fillRect(0, 0, W, H);
        camX = attractT * 1.2; act = 0;
        drawBack(ctx, ACTS[0]);
        ctx.fillStyle = '#909090'; ctx.fillRect(0, GROUND, W, 5); ctx.fillStyle = '#505060'; ctx.fillRect(0, GROUND + 5, W, H);
        // logo
        ctx.fillStyle = '#000'; ctx.fillRect(40, 30, 208, 50);
        txt(ctx, 'PAC-LAND', W / 2 + 2, 40, '#a04000', 3, 'c');
        txt(ctx, 'PAC-LAND', W / 2, 38, '#ffe000', 3, 'c');
        txt(ctx, 'TAKE THE FAIRY HOME', W / 2, 88, '#ffffff', 1, 'c');
        const t = attractT % 400;
        const pxp = 40 + t * 0.6;
        ctx.drawImage(PAC[0][(attractT >> 2) & 3], Math.round(pxp) - 9, GROUND - 20);
        const gx = Math.round(W + 40 - t * 1.0);
        ctx.drawImage(GH[0], gx - 7, GROUND - 21);
        ctx.fillStyle = '#d02020'; ctx.fillRect(gx - 14, GROUND - 10, 28, 7); ctx.fillStyle = '#000'; ctx.fillRect(gx - 11, GROUND - 4, 6, 4); ctx.fillRect(gx + 5, GROUND - 4, 6, 4);
        txt(ctx, 'ARROWS RUN - SPACE JUMP', W / 2, 110, '#000060', 1, 'c');
        txt(ctx, 'EAT POWER PELLETS - PUSH HYDRANTS', W / 2, 122, '#000060', 1, 'c');
        const blink = (attractT >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) txt(ctx, 'INSERT COIN', W / 2, 142, '#ff2020', 1, 'c'); }
        else if (blink) txt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 142, '#ffffff', 1, 'c');
        txt(ctx, '\u00a9 1984 NAMCO', W / 2, 160, '#ffffff', 1, 'c');
        txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, H - 12, '#ffffff');
        camX = 0;
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        if (state === 'fairy') { drawFairyland(ctx); drawHUD(ctx); return; }
        if (state === 'home') { drawHome(ctx); drawHUD(ctx); return; }
        if (boots()) { ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); drawWorld(ctx); ctx.restore(); }
        else drawWorld(ctx);
        if (boots()) { for (const q of popups) { /* redraw popups unmirrored */ txt(ctx, q.s, W - Math.round(q.x - camX), Math.round(q.y - (60 - q.t) / 4), '#ffffff', 1, 'c'); } }
        drawHUD(ctx);
        if (state === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 70, 70, 140, 40);
          txt(ctx, 'TRIP ' + trip + '  ROUND ' + (act + 1), W / 2, 76, '#ffffff', 1, 'c');
          txt(ctx, ACTS[act].name, W / 2, 92, '#ffe000', 1, 'c');
        }
        if (state === 'actclear' && tmr > 30) {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, 60, 160, 52);
          txt(ctx, 'TIME BONUS ' + timeBonus, W / 2, 68, '#ffffff', 1, 'c');
          if (jumpBonus && tmr > 70) txt(ctx, 'JUMP BONUS ' + jumpBonus, W / 2, 84, '#ffe000', 1, 'c');
          if (tmr > 100) txt(ctx, 'BREAK TIME!', W / 2, 98, '#40ffff', 1, 'c');
        }
        if (state === 'dying' && p.cause === 'time' && tmr < 100) txt(ctx, 'TIME OUT', W / 2, 90, '#ff4040', 1, 'c');
        if (state === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 46, 90, 92, 16); txt(ctx, 'GAME OVER', W / 2, 94, '#ff4040', 1, 'c'); }
      }
      buildAct();
      p = { x: 40, y: GROUND, vx: 0, vy: 0, on: true, face: 1, runT: 0, anim: 0 };
      return { update, render, destroy() { } };
    }
  });
})();
