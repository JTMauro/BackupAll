(function () {
  'use strict';
  // ---------- 5x7 bitmap font ----------
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '"': [10, 10, 0, 0, 0, 0, 0], '#': [10, 31, 10, 10, 31, 10, 0], '&': [12, 18, 20, 8, 21, 18, 13], '%': [24, 25, 2, 4, 8, 19, 3]
  };
  // text(ctx, s, x, y, col, scale, align: 'left'|'center'|'right')
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  // build a sprite canvas from string rows and a palette {char: colour}
  function spr(rows, pal) {
    const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0), cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  function flipH(cv) { const c = mk(cv.width, cv.height), x = c.getContext('2d'); x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0); return c; }
  const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => (Math.random() * n) | 0;

  // =====================================================================
  // Venture (Exidy, 1981) -- from-scratch recreation.
  // Winky explores a dungeon floor plan. Enter each of the four rooms, grab its treasure while shooting
  // or dodging the room's monsters, and get out before a Hallmonster comes in after you.
  // =====================================================================
  const W = 256, H = 224;
  const TOP = 18;
  const R = { x0: 14, y0: 30, x1: 242, y1: 212 };         // room interior in room view
  R.w = R.x1 - R.x0; R.h = R.y1 - R.y0;
  const DOOR_ROOM = 24, DOOR_HALL = 8;

  // Floor plans: rooms with doors {s: side N/S/E/W, f: position along side 0..1}
  const PLANS = [
    {
      color: '#2040ff', rooms: [
        { x: 22, y: 34, w: 72, h: 52, type: 'wall', doors: [{ s: 'E', f: 0.5 }, { s: 'S', f: 0.6 }] },
        { x: 158, y: 32, w: 76, h: 56, type: 'skeleton', doors: [{ s: 'W', f: 0.5 }, { s: 'S', f: 0.3 }] },
        { x: 26, y: 136, w: 66, h: 66, type: 'serpent', doors: [{ s: 'N', f: 0.5 }, { s: 'E', f: 0.6 }] },
        { x: 150, y: 140, w: 84, h: 58, type: 'goblin', doors: [{ s: 'N', f: 0.4 }, { s: 'W', f: 0.5 }] }
      ], blocks: [{ x: 116, y: 104, w: 24, h: 18 }]
    },
    {
      color: '#e02020', rooms: [
        { x: 20, y: 30, w: 92, h: 50, type: 'dragon', doors: [{ s: 'S', f: 0.3 }, { s: 'E', f: 0.5 }] },
        { x: 170, y: 36, w: 64, h: 70, type: 'spider', doors: [{ s: 'W', f: 0.3 }, { s: 'S', f: 0.5 }] },
        { x: 30, y: 120, w: 60, h: 80, type: 'troll', doors: [{ s: 'E', f: 0.3 }, { s: 'N', f: 0.6 }] },
        { x: 134, y: 150, w: 100, h: 50, type: 'twohead', doors: [{ s: 'N', f: 0.2 }, { s: 'W', f: 0.5 }] }
      ], blocks: [{ x: 120, y: 60, w: 16, h: 30 }, { x: 104, y: 120, w: 18, h: 14 }]
    }
  ];
  const ROOMS = {
    wall: { name: 'WALL ROOM', mon: null, n: 0, col: '#4080ff', tr: [128, 120], obs: [], walls: true },
    skeleton: { name: 'SKELETON ROOM', mon: 'skeleton', n: 3, col: '#c0c0c0', tr: [128, 120], obs: [[60, 70, 18, 18], [178, 70, 18, 18], [60, 150, 18, 18], [178, 150, 18, 18]] },
    serpent: { name: 'SERPENT ROOM', mon: 'serpent', n: 3, col: '#20c020', tr: [128, 112], obs: [[90, 84, 8, 54], [158, 84, 8, 54], [90, 138, 76, 8]] },
    goblin: { name: 'GOBLIN ROOM', mon: 'goblin', n: 3, col: '#e0a020', tr: [200, 120], obs: [[50, 80, 120, 8], [86, 160, 120, 8]] },
    dragon: { name: 'DRAGON ROOM', mon: 'dragon', n: 1, col: '#ff6020', tr: [128, 60], obs: [[104, 110, 48, 20]] },
    spider: { name: 'SPIDER ROOM', mon: 'spider', n: 4, col: '#ff40ff', tr: [128, 120], obs: [[60, 60, 10, 10], [186, 60, 10, 10], [60, 172, 10, 10], [186, 172, 10, 10], [123, 90, 10, 10], [123, 150, 10, 10]] },
    troll: { name: 'TROLL ROOM', mon: 'troll', n: 3, col: '#a060ff', tr: [128, 186], obs: [[40, 70, 70, 8], [146, 70, 70, 8], [124, 70, 8, 70], [60, 150, 136, 8]] },
    twohead: { name: 'TWO-HEADED ROOM', mon: 'twohead', n: 3, col: '#40e0e0', tr: [60, 120], obs: [[120, 60, 16, 110], [80, 110, 96, 12]] }
  };
  const ART = {
    skeleton: [['  WWWWW  ', ' WWWWWWW ', ' Wk.Wk.W ', ' WWWWWWW ', '  W.W.W  ', '   WWW   ', ' WWWWWWW ', 'W  WWW  W', '   W W   ', '  WW WW  '], { W: '#f0f0f0', k: '#000', '.': '#000' }],
    serpent: [['     YYY ', '    YRYYY', '    YYYYr', 'Y   YY   ', 'YY YYY   ', ' YYYYY   ', '  YYY    '], { Y: '#60e040', R: '#ff2020', r: '#ff2020' }],
    goblin: [['G       G', 'GG GGG GG', ' GGGGGGG ', ' GRGGGRG ', ' GGGGGGG ', '  GkkkG  ', 'GGGGGGGGG', 'G GGGGG G', '  GG GG  ', ' GG   GG '], { G: '#e0a020', R: '#ff2020', k: '#000' }],
    dragon: [['        OO      ', '       OOOO  O  ', '      OOROOOOO  ', 'O    OOOOOO     ', 'OO  OOOOOkk     ', ' OOOOOOOO       ', '  OOOOOOOOO     ', ' OYOOOOOOOOO    ', 'OYYOOOOOOOO     ', ' OYOOO  OOO     ', '  OO     OO     ', ' OOO    OOO     '], { O: '#ff6020', R: '#ffff00', k: '#ff2000', Y: '#ffd040' }],
    spider: [['P  P P  P', ' P PPP P ', '  PPPPP  ', 'PPPRPRPPP', '  PPPPP  ', ' P PPP P ', 'P  P P  P'], { P: '#ff40ff', R: '#ffff40' }],
    troll: [['  TTTTT  ', ' TTTTTTT ', ' TwTTTwT ', ' TTTTTTT ', '  TkkkT  ', 'TTTTTTTTT', 'T TTTTT T', 'T TTTTT T', '  TT TT  ', '  TT TT  ', ' TTT TTT '], { T: '#a060ff', w: '#fff', k: '#000' }],
    twohead: [[' CCC CCC ', ' CwC CwC ', ' CCC CCC ', '  C   C  ', ' CCCCCCC ', 'C CCCCC C', 'C CCCCC C', '  CC CC  ', ' CC   CC '], { C: '#40e0e0', w: '#000' }],
    hallmon: [[' GGGGG ', 'GGwGwGG', 'GGGGGGG', 'GGGGGGG', 'G G G G', 'G G G G', ' G G G '], { G: '#30e030', w: '#000' }],
    bighall: [['   GGGGGG   ', '  GGGGGGGG  ', ' GGwwGGwwGG ', ' GGwkGGwkGG ', 'GGGGGGGGGGGG', 'GGGGkkkkGGGG', 'GGGGGGGGGGGG', 'G GG GG GG G', 'G GG GG GG G', 'G  G  G  G G', ' G  G G  G  ', 'G   G  G   G'], { G: '#30e030', w: '#fff', k: '#000' }]
  };
  const SC = { monster: 100, monsterAfter: 200, treasure: [200, 250, 300, 350], levelBonus: 1000 };

  ArcadeRegistry.register({
    id: 'venture', title: 'Venture', year: 1981, maker: 'Exidy',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move (8-way) \u00b7 Space: shoot arrow (inside rooms) \u00b7 Enter: start',
    marquee: { bg: '#100020', fg: '#ff40ff', accent: '#40e040' },
    create(api) {
      const A = api.audio;
      const SPR = {};
      for (const k in ART) { const a = spr(ART[k][0], ART[k][1]); SPR[k] = [a, flipH(a)]; }
      let hi = api.getHiScore(25000);
      let state = 'title', T = 0, score = 0, lives = 3, level = 1, nextExtra = 20000;
      let plan, rooms, hallMons, wk, view = 'hall', cur = null, mons, arrow, fire, corpseList, treasure, gotTreasure, lingerT, intruder, mwalls, pops, parts, entryDoor;

      // ---------- coin-op ----------
      let lastCred = api.credits, coinFlash = 0;
      function pollCoins() { const c = api.credits; if (c > lastCred) A.tone(1800, .06, { vol: .08, slideTo: 2400 }); lastCred = c; if (coinFlash > 0) coinFlash--; }
      function tryStart() { if (api.useCredit()) { lastCred = api.credits; return true; } coinFlash = 90; A.tone(98, .28, { vol: .14 }); return false; }
      function drawCoin(ctx, y) {
        if (api.credits <= 0) { if (coinFlash > 0 ? (api.frame >> 2) & 1 : (api.frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, y, coinFlash > 0 ? '#ff3030' : '#ffd040', 1, 'center'); }
        else if ((api.frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, y, '#ffd040', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 9, '#c8c8c8');
      }
      const sfx = {
        arrow() { A.tone(1400, .08, { type: 'triangle', vol: .1, slideTo: 2200 }); },
        kill() { A.tone(600, .2, { type: 'square', vol: .1, slideTo: 80 }); A.noise(.1, { vol: .08, freq: 2000 }); },
        treasure() { A.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .14]], { type: 'square', vol: .09 }); },
        enter() { A.melody([[392, .06], [523, .06], [659, .1]], { type: 'triangle', vol: .12 }); },
        leave() { A.melody([[659, .06], [523, .06], [392, .1]], { type: 'triangle', vol: .12 }); },
        alarm() { for (let i = 0; i < 4; i++) A.tone(i & 1 ? 440 : 660, .12, { type: 'square', vol: .1, delay: i * .12 }); },
        die() { A.melody([[392, .1], [370, .1], [349, .1], [330, .1], [311, .1], [294, .3]], { type: 'square', vol: .11 }); },
        step() { A.tone(120, .03, { type: 'triangle', vol: .05 }); },
        fireball() { A.noise(.25, { vol: .08, freq: 900, slideTo: 300 }); },
        extra() { A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .1 }); }
      };
      function addScore(n, x, y) {
        score += n; if (x != null) pops.push({ x, y, n, t: 50 });
        if (score >= nextExtra) { lives++; nextExtra += 40000; sfx.extra(); }
        if (score > hi) hi = score;
      }

      // ---------- geometry ----------
      const hit = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
      function doorCenterHall(rm, d) {
        if (d.s === 'N') return [rm.x + d.f * rm.w, rm.y]; if (d.s === 'S') return [rm.x + d.f * rm.w, rm.y + rm.h];
        if (d.s === 'W') return [rm.x, rm.y + d.f * rm.h]; return [rm.x + rm.w, rm.y + d.f * rm.h];
      }
      function doorCenterRoom(d) {
        if (d.s === 'N') return [R.x0 + d.f * R.w, R.y0]; if (d.s === 'S') return [R.x0 + d.f * R.w, R.y1];
        if (d.s === 'W') return [R.x0, R.y0 + d.f * R.h]; return [R.x1, R.y0 + d.f * R.h];
      }
      // walls (2px in hall) for one rectangle with optional door gaps
      function outline(x, y, w, h, doors, t, gap, centerFn) {
        const out = [];
        const side = (s, x0, y0, len, horiz) => {
          const gaps = (doors || []).filter(d => d.s === s).map(d => { const c = centerFn(d); return horiz ? c[0] : c[1]; }).sort((a, b) => a - b);
          let p = horiz ? x0 : y0; const end = p + len;
          for (const g of gaps) { const g0 = g - gap / 2; if (g0 > p) out.push(horiz ? [p, y0, g0 - p, t] : [x0, p, t, g0 - p]); p = g + gap / 2; }
          if (end > p) out.push(horiz ? [p, y0, end - p, t] : [x0, p, t, end - p]);
        };
        side('N', x - t, y - t, w + 2 * t, true); side('S', x - t, y + h, w + 2 * t, true);
        side('W', x - t, y, h, false); side('E', x + w, y, h, false);
        return out;
      }
      let hallWalls = [];
      function buildHall() {
        hallWalls = [[2, TOP + 2, W - 4, 2], [2, H - 4, W - 4, 2], [2, TOP + 2, 2, H - TOP - 4], [W - 4, TOP + 2, 2, H - TOP - 4]];
        for (const rm of rooms) hallWalls.push(...outline(rm.x, rm.y, rm.w, rm.h, rm.done ? [] : rm.doors, 2, DOOR_HALL, d => doorCenterHall(rm, d)));
        for (const b of plan.blocks) hallWalls.push([b.x, b.y, b.w, b.h]);
      }
      function hallBlocked(x, y, s, solidRooms) {
        for (const w of hallWalls) if (hit(x - s, y - s, 2 * s, 2 * s, w[0], w[1], w[2], w[3])) return true;
        if (solidRooms) for (const rm of rooms) if (hit(x - s, y - s, 2 * s, 2 * s, rm.x - 3, rm.y - 3, rm.w + 6, rm.h + 6)) return true;
        return false;
      }
      let roomWalls = [];
      function buildRoomWalls() {
        roomWalls = outline(R.x0, R.y0, R.w, R.h, cur.doors, 4, DOOR_ROOM, doorCenterRoom);
        for (const o of ROOMS[cur.type].obs) roomWalls.push(o);
      }
      function roomBlocked(x, y, s, solidDoors) {
        for (const w of roomWalls) if (hit(x - s, y - s, 2 * s, 2 * s, w[0], w[1], w[2], w[3])) return true;
        if (solidDoors && (x - s < R.x0 || x + s > R.x1 || y - s < R.y0 || y + s > R.y1)) return true;
        return false;
      }

      // ---------- level / lives ----------
      function startLevel() {
        plan = PLANS[(level - 1) % PLANS.length];
        rooms = plan.rooms.map(r => ({ ...r, done: false }));
        buildHall();
        resetHall();
      }
      function resetHall() {
        view = 'hall'; cur = null; arrow = null; intruder = null;
        wk = { x: 128, y: 212, face: [0, -1], anim: 0, inv: 60 };
        if (plan === PLANS[1]) wk.y = 212;
        const sp = 0.42 + level * 0.06;
        hallMons = [[12, TOP + 12], [W - 12, TOP + 12], [12, H - 30], [W - 12, H - 30]].slice(0, Math.min(2 + level, 4)).map(([x, y]) => ({ x, y, vx: 0, vy: 0, t: 0, sp }));
      }
      function startGame() {
        score = 0; lives = 3; level = 1; nextExtra = 20000; pops = []; parts = [];
        startLevel(); state = 'ready'; T = 0;
        A.melody([[330, .1], [392, .1], [494, .1], [659, .2], [587, .1], [494, .1], [659, .3]], { type: 'square', vol: .1 });
      }

      // ---------- entering / leaving rooms ----------
      function enterRoom(rm) {
        // nearest door
        let best = rm.doors[0], bd = 1e9;
        for (const d of rm.doors) { const c = doorCenterHall(rm, d); const dd = Math.hypot(c[0] - wk.x, c[1] - wk.y); if (dd < bd) { bd = dd; best = d; } }
        cur = rm; entryDoor = best; view = 'room'; buildRoomWalls();
        const c = doorCenterRoom(best), inset = 10;
        wk.x = c[0] + (best.s === 'W' ? inset : best.s === 'E' ? -inset : 0);
        wk.y = c[1] + (best.s === 'N' ? inset : best.s === 'S' ? -inset : 0);
        wk.inv = 30;
        const def = ROOMS[rm.type];
        treasure = { x: def.tr[0], y: def.tr[1] }; gotTreasure = false; arrow = null; fire = []; corpseList = []; intruder = null;
        lingerT = Math.max(600, 1500 - level * 150);
        mons = [];
        const sp = 0.55 + level * 0.08;
        for (let i = 0; i < def.n; i++) {
          let x, y, tries = 0;
          do { x = rnd(R.x0 + 16, R.x1 - 16); y = rnd(R.y0 + 16, R.y1 - 16); tries++; } while (tries < 50 && (Math.hypot(x - wk.x, y - wk.y) < 90 || roomBlocked(x, y, 7, true)));
          mons.push({ x, y, vx: 0, vy: 0, t: irnd(30), type: def.mon, hp: def.mon === 'dragon' ? 3 + Math.min(level, 3) : 1, sp: def.mon === 'dragon' ? sp * 0.7 : sp, dead: 0, fireT: 120, burst: 0, flash: 0 });
        }
        mwalls = [];
        if (def.walls) {
          for (let i = 0; i < 4; i++) {
            const horiz = i < 2;
            mwalls.push(horiz ? { x: R.x0 + 20, y: R.y0 + 46 + i * 92, w: 70, h: 6, vx: (0.6 + level * 0.1) * (i ? -1 : 1), vy: 0 } : { x: R.x0 + 60 + (i - 2) * 100, y: R.y0 + 20, w: 6, h: 50, vx: 0, vy: (0.5 + level * 0.1) * (i === 2 ? 1 : -1) });
          }
        }
        sfx.enter();
      }
      function leaveRoom() {
        // exit through nearest door of the room
        let best = cur.doors[0], bd = 1e9;
        for (const d of cur.doors) { const c = doorCenterRoom(d); const dd = Math.hypot(c[0] - wk.x, c[1] - wk.y); if (dd < bd) { bd = dd; best = d; } }
        const rm = cur;
        if (gotTreasure) { rm.done = true; buildHall(); }
        const c = doorCenterHall(rm, best), out = 6;
        wk.x = c[0] + (best.s === 'W' ? -out : best.s === 'E' ? out : 0);
        wk.y = c[1] + (best.s === 'N' ? -out : best.s === 'S' ? out : 0);
        view = 'hall'; cur = null; arrow = null; intruder = null; sfx.leave();
        // keep the hallmonsters from camping the door
        for (const m of hallMons) if (Math.hypot(m.x - wk.x, m.y - wk.y) < 30) { m.x += Math.sign(m.x - wk.x || 1) * 30; m.x = clamp(m.x, 10, W - 10); }
        if (rooms.every(r => r.done)) { state = 'levelclear'; T = 0; A.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: .1 }); }
      }

      function killWinky() {
        if (state !== 'play' || wk.inv > 0) return;
        state = 'dying'; T = 0; sfx.die();
      }

      // ---------- hall update ----------
      function moveInput() {
        const dx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const dy = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        return [dx, dy];
      }
      function updateHall() {
        const [dx, dy] = moveInput();
        if (dx || dy) { wk.face = [dx, dy]; wk.anim++; }
        const sp = 1.0;
        if (dx && !hallBlocked(wk.x + dx * sp, wk.y, 1.5, false)) wk.x += dx * sp;
        if (dy && !hallBlocked(wk.x, wk.y + dy * sp, 1.5, false)) wk.y += dy * sp;
        for (const rm of rooms) if (!rm.done && wk.x > rm.x + 2 && wk.x < rm.x + rm.w - 2 && wk.y > rm.y + 2 && wk.y < rm.y + rm.h - 2) { enterRoom(rm); return; }
        for (const m of hallMons) {
          if (--m.t <= 0) {
            m.t = 30 + irnd(50);
            const d = Math.hypot(wk.x - m.x, wk.y - m.y);
            if (d < 80 + level * 10 || Math.random() < 0.3) { m.vx = Math.sign(wk.x - m.x); m.vy = Math.sign(wk.y - m.y); if (Math.random() < 0.3) { if (Math.random() < 0.5) m.vx = 0; else m.vy = 0; } }
            else { const a = irnd(8) * Math.PI / 4; m.vx = Math.round(Math.cos(a)); m.vy = Math.round(Math.sin(a)); }
          }
          const nx = m.x + m.vx * m.sp, ny = m.y + m.vy * m.sp;
          if (!hallBlocked(nx, m.y, 3, true)) m.x = nx; else { m.vx = -m.vx; m.t = Math.min(m.t, 10); }
          if (!hallBlocked(m.x, ny, 3, true)) m.y = ny; else { m.vy = -m.vy; m.t = Math.min(m.t, 10); }
          if (Math.abs(m.x - wk.x) < 4.5 && Math.abs(m.y - wk.y) < 4.5) killWinky();
        }
      }

      // ---------- room update ----------
      function updateRoom() {
        const [dx, dy] = moveInput();
        if (dx || dy) { wk.face = [dx, dy]; wk.anim++; if (wk.anim % 16 === 0) sfx.step(); }
        const sp = 1.15, s = 3.5;
        const k = dx && dy ? 0.75 : 1;
        if (dx && !roomBlocked(wk.x + dx * sp * k, wk.y, s, false)) wk.x += dx * sp * k;
        if (dy && !roomBlocked(wk.x, wk.y + dy * sp * k, s, false)) wk.y += dy * sp * k;
        if (wk.x < R.x0 - 4 || wk.x > R.x1 + 4 || wk.y < R.y0 - 4 || wk.y > R.y1 + 4) { leaveRoom(); return; }
        // arrow
        if (api.pressed('Space') && !arrow) { arrow = { x: wk.x + wk.face[0] * 5, y: wk.y + wk.face[1] * 5, vx: wk.face[0] * 3.2, vy: wk.face[1] * 3.2, t: 0 }; if (!wk.face[0] && !wk.face[1]) arrow.vy = -3.2; sfx.arrow(); }
        if (arrow) {
          arrow.x += arrow.vx; arrow.y += arrow.vy; arrow.t++;
          if (roomBlocked(arrow.x, arrow.y, 1, true) || arrow.t > 120) arrow = null;
        }
        // treasure
        if (!gotTreasure && Math.abs(wk.x - treasure.x) < 8 && Math.abs(wk.y - treasure.y) < 8) {
          gotTreasure = true; sfx.treasure();
          const idx = rooms.indexOf(cur); addScore(SC.treasure[idx] + (level - 1) * 100, treasure.x, treasure.y - 10);
        }
        // moving walls
        for (const w of mwalls) {
          w.x += w.vx; w.y += w.vy;
          if (w.x < R.x0 + 8 || w.x + w.w > R.x1 - 8) w.vx = -w.vx;
          if (w.y < R.y0 + 8 || w.y + w.h > R.y1 - 8) w.vy = -w.vy;
          if (hit(wk.x - 3, wk.y - 3, 6, 6, w.x, w.y, w.w, w.h)) killWinky();
          if (arrow && hit(arrow.x - 1, arrow.y - 1, 2, 2, w.x, w.y, w.w, w.h)) arrow = null;
        }
        // monsters
        for (const m of mons) {
          if (m.dead) { m.dead--; if (hit(wk.x - 3, wk.y - 3, 6, 6, m.x - 4, m.y - 4, 8, 8)) killWinky(); continue; }
          if (m.flash > 0) m.flash--;
          m.anim = (m.anim || 0) + 1;
          if (--m.t <= 0) {
            m.t = 20 + irnd(40);
            const chase = Math.random() < 0.35 + level * 0.08;
            if (chase) { const ddx = wk.x - m.x, ddy = wk.y - m.y, d = Math.hypot(ddx, ddy) || 1; m.vx = ddx / d; m.vy = ddy / d; }
            else { const a = Math.random() * Math.PI * 2; m.vx = Math.cos(a); m.vy = Math.sin(a); }
          }
          let msp = m.sp;
          if (m.type === 'spider') { m.burst = (m.burst + 1) % 80; msp = m.burst < 30 ? m.sp * 2.2 : m.sp * 0.2; }
          let wob = 0;
          if (m.type === 'serpent') wob = Math.sin(m.anim * 0.15) * 0.8;
          const nx = m.x + (m.vx + (m.vy ? wob : 0)) * msp, ny = m.y + (m.vy + (m.vx ? wob : 0)) * msp;
          const ms = m.type === 'dragon' ? 7 : 4.5;
          if (!roomBlocked(nx, m.y, ms, true)) m.x = nx; else { m.vx = -m.vx; }
          if (!roomBlocked(m.x, ny, ms, true)) m.y = ny; else { m.vy = -m.vy; }
          if (m.type === 'dragon' && --m.fireT <= 0) {
            m.fireT = Math.max(60, 150 - level * 15) + irnd(60);
            const ddx = wk.x - m.x, ddy = wk.y - m.y, d = Math.hypot(ddx, ddy) || 1;
            fire.push({ x: m.x, y: m.y, vx: ddx / d * 1.8, vy: ddy / d * 1.8, t: 0 }); sfx.fireball();
          }
          if (hit(wk.x - 3, wk.y - 3, 6, 6, m.x - ms, m.y - ms, ms * 2, ms * 2)) killWinky();
          if (arrow && hit(arrow.x - 1, arrow.y - 1, 2, 2, m.x - ms, m.y - ms, ms * 2, ms * 2)) {
            arrow = null; m.hp--; m.flash = 8;
            if (m.hp <= 0) { m.dead = 420; sfx.kill(); addScore(gotTreasure ? SC.monsterAfter : SC.monster, m.x, m.y - 10); }
            else A.tone(300, .06, { vol: .1 });
          }
        }
        mons = mons.filter(m => m.dead !== 1);
        for (const f of fire) { f.x += f.vx; f.y += f.vy; f.t++; if (roomBlocked(f.x, f.y, 1, true) || f.t > 200) f.gone = true; if (hit(wk.x - 3, wk.y - 3, 6, 6, f.x - 2, f.y - 2, 4, 4)) killWinky(); }
        fire = fire.filter(f => !f.gone);
        // lingering too long brings a hallmonster in
        if (!intruder) {
          if (--lingerT <= 0) {
            const c = doorCenterRoom(entryDoor);
            intruder = { x: c[0], y: c[1], sp: 0.85 + level * 0.1 }; sfx.alarm();
          }
        } else {
          const ddx = wk.x - intruder.x, ddy = wk.y - intruder.y, d = Math.hypot(ddx, ddy) || 1;
          intruder.x += ddx / d * intruder.sp; intruder.y += ddy / d * intruder.sp;
          if (d < 9) killWinky();
        }
      }

      function gameOver() { state = 'gameover'; T = 0; api.setHiScore(score); }
      function update() {
        T++; pollCoins();
        if (pops) { for (const q of pops) q.t--; pops = pops.filter(q => q.t > 0); }
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            break;
          case 'ready':
            if (T > 100) { state = 'play'; T = 0; }
            break;
          case 'play':
            if (wk.inv > 0) wk.inv--;
            if (view === 'hall') updateHall(); else updateRoom();
            break;
          case 'dying':
            if (T > 120) {
              const after = () => { resetHall(); state = 'ready'; T = 0; };
              if (lives > 1) { lives--; after(); }
              else if (api.offerContinue) api.offerContinue(() => { lives = 3; after(); }, () => { lives = 0; gameOver(); });
              else { lives = 0; gameOver(); }
            }
            break;
          case 'levelclear':
            if (T === 60) addScore(SC.levelBonus * Math.min(level, 5));
            if (T > 200) { level++; startLevel(); state = 'ready'; T = 0; }
            break;
          case 'gameover':
            if (T > 240 || (T > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- drawing ----------
      function drawWalls(ctx, list, col) { ctx.fillStyle = col; for (const w of list) ctx.fillRect(Math.round(w[0]), Math.round(w[1]), Math.round(w[2]), Math.round(w[3])); }
      function drawWinkyBig(ctx, x, y, face) {
        x = Math.round(x); y = Math.round(y);
        ctx.fillStyle = '#ffe020'; ctx.fillRect(x - 2, y - 4, 5, 9); ctx.fillRect(x - 4, y - 2, 9, 5); ctx.fillRect(x - 3, y - 3, 7, 7);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, 1, 2); ctx.fillRect(x + 2, y - 2, 1, 2);
        ctx.fillRect(x - 2, y + 2, 5, 1); ctx.fillRect(x - 3, y + 1, 1, 1); ctx.fillRect(x + 3, y + 1, 1, 1);
        // bow
        const fx = face[0], fy = face[1] || (fx ? 0 : -1);
        ctx.fillStyle = '#c08040';
        for (let i = -4; i <= 4; i++) { const px = x + fx * 7 + (-fy) * i - fx * Math.abs(i) * 0.4, py = y + fy * 7 + fx * i - fy * Math.abs(i) * 0.4; ctx.fillRect(Math.round(px), Math.round(py), 1, 1); }
      }
      function drawHallView(ctx) {
        drawWalls(ctx, hallWalls, plan.color);
        for (const rm of rooms) if (rm.done) { ctx.fillStyle = ROOMS[rm.type].col; ctx.fillRect(rm.x, rm.y, rm.w, rm.h); }
        // treasure hints inside undone rooms
        for (const rm of rooms) if (!rm.done && (api.frame >> 4) & 1) { ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(rm.x + rm.w / 2) - 1, Math.round(rm.y + rm.h / 2) - 1, 3, 3); }
        for (const m of hallMons) ctx.drawImage(SPR.hallmon[(api.frame >> 4) & 1], Math.round(m.x) - 3, Math.round(m.y) - 3);
        if (state !== 'dying' || (T >> 2) & 1) { ctx.fillStyle = '#ff60ff'; ctx.fillRect(Math.round(wk.x) - 1, Math.round(wk.y) - 1, 3, 3); }
      }
      function drawTreasure(ctx, x, y, kind) {
        x = Math.round(x); y = Math.round(y);
        const g = (api.frame >> 3) & 1 ? '#ffff80' : '#ffd020';
        switch (kind % 4) {
          case 0: ctx.fillStyle = g; ctx.fillRect(x - 5, y - 3, 10, 7); ctx.fillStyle = '#a06010'; ctx.fillRect(x - 5, y - 1, 10, 1); ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 1, y - 2, 2, 2); break; // chest
          case 1: ctx.fillStyle = g; ctx.fillRect(x - 4, y - 4, 8, 2); ctx.fillRect(x - 4, y - 6, 1, 2); ctx.fillRect(x, y - 7, 1, 3); ctx.fillRect(x + 3, y - 6, 1, 2); ctx.fillStyle = '#40ff40'; ctx.fillRect(x - 1, y - 3, 2, 1); break; // crown
          case 2: ctx.fillStyle = '#40e0ff'; ctx.fillRect(x - 3, y - 4, 7, 2); ctx.fillRect(x - 2, y - 2, 5, 2); ctx.fillRect(x - 1, y, 3, 2); ctx.fillRect(x, y + 2, 1, 1); ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 4, 1, 1); break; // diamond
          default: ctx.fillStyle = g; ctx.fillRect(x - 3, y - 5, 6, 2); ctx.fillRect(x - 1, y - 3, 2, 5); ctx.fillRect(x - 3, y + 2, 6, 2); // goblet
        }
      }
      function drawRoomView(ctx) {
        const def = ROOMS[cur.type];
        drawWalls(ctx, roomWalls, def.col);
        for (const w of mwalls) { ctx.fillStyle = (api.frame >> 2) & 1 ? '#80c0ff' : '#4080ff'; ctx.fillRect(Math.round(w.x), Math.round(w.y), w.w, w.h); }
        if (!gotTreasure) drawTreasure(ctx, treasure.x, treasure.y, rooms.indexOf(cur) + level);
        for (const m of mons) {
          const art = SPR[m.type][((m.anim || 0) >> 4) & 1];
          if (m.dead) {
            ctx.globalAlpha = 0.9; ctx.fillStyle = m.dead < 90 && (m.dead >> 2) & 1 ? '#404040' : '#808080';
            ctx.fillRect(Math.round(m.x) - 4, Math.round(m.y) - 2, 8, 5); ctx.fillStyle = '#000'; ctx.fillRect(Math.round(m.x) - 2, Math.round(m.y) - 1, 1, 1); ctx.fillRect(Math.round(m.x) + 1, Math.round(m.y) - 1, 1, 1);
            ctx.globalAlpha = 1; continue;
          }
          if (m.flash && (m.flash & 2)) continue;
          ctx.drawImage(art, Math.round(m.x - art.width / 2), Math.round(m.y - art.height / 2));
        }
        for (const f of fire) { ctx.fillStyle = (api.frame & 2) ? '#ffff40' : '#ff4000'; ctx.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 2, 4, 4); }
        if (arrow) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(arrow.x - arrow.vx / 3.2 * i), Math.round(arrow.y - arrow.vy / 3.2 * i), 1, 1); }
        if (intruder) { const a = SPR.bighall[(api.frame >> 3) & 1]; ctx.drawImage(a, Math.round(intruder.x) - 6, Math.round(intruder.y) - 6); }
        if ((state !== 'dying' || (T >> 2) & 1) && !(wk.inv > 0 && (wk.inv >> 2) & 1)) drawWinkyBig(ctx, wk.x, wk.y, wk.face);
        text(ctx, def.name, W / 2, R.y0 - 10, def.col, 1, 'center');
        if (!intruder && lingerT < 180 && (api.frame >> 3) & 1) text(ctx, 'HURRY!', W / 2, R.y1 - 10, '#ff4040', 1, 'center');
      }
      function drawHUD(ctx) {
        text(ctx, 'SCORE', 4, 2, '#ff60ff'); text(ctx, pad(score, 6), 36, 2, '#ffffff');
        text(ctx, 'HIGH', 104, 2, '#ff60ff'); text(ctx, pad(hi, 6), 130, 2, '#ffffff');
        text(ctx, 'LV' + level, 196, 2, '#40e040');
        for (let i = 0; i < Math.min(lives - 1, 4); i++) { ctx.fillStyle = '#ffe020'; ctx.fillRect(222 + i * 8, 3, 5, 5); ctx.fillStyle = '#000'; ctx.fillRect(223 + i * 8, 4, 1, 1); ctx.fillRect(225 + i * 8, 4, 1, 1); }
        for (const q of pops) text(ctx, String(q.n), Math.round(q.x), Math.round(q.y - (50 - q.t) * 0.3), '#ffff80', 1, 'center');
      }
      function drawTitle(ctx) {
        text(ctx, 'VENTURE', W / 2 + 2, 30, '#602060', 4, 'center');
        text(ctx, 'VENTURE', W / 2, 28, '#ff40ff', 4, 'center');
        const page = Math.floor(T / 480) % 2;
        if (page === 0) {
          text(ctx, 'WINKY THE ADVENTURER', W / 2, 70, '#ffe020', 1, 'center');
          drawWinkyBig(ctx, W / 2, 92, [1, 0]);
          text(ctx, 'ENTER THE ROOMS, GRAB THE', W / 2, 110, '#c0c0ff', 1, 'center');
          text(ctx, 'TREASURE AND ESCAPE BEFORE', W / 2, 120, '#c0c0ff', 1, 'center');
          text(ctx, 'THE HALLMONSTERS GET YOU', W / 2, 130, '#c0c0ff', 1, 'center');
          ctx.drawImage(SPR.bighall[(T >> 4) & 1], W / 2 - 6, 142);
          const parade = ['skeleton', 'serpent', 'goblin', 'spider', 'troll', 'twohead'];
          parade.forEach((k, i) => ctx.drawImage(SPR[k][(T >> 4) & 1], 40 + i * 30, 166));
        } else {
          text(ctx, '- SCORING -', W / 2, 70, '#ffffff', 1, 'center');
          const rows = [['MONSTER', SC.monster], ['MONSTER AFTER TREASURE', SC.monsterAfter], ['TREASURE', '200-350'], ['ALL FOUR ROOMS', SC.levelBonus]];
          rows.forEach((r, i) => { text(ctx, r[0], 24, 90 + i * 14, '#c0c0ff'); text(ctx, String(r[1]), W - 24, 90 + i * 14, '#ffd040', 1, 'right'); });
          text(ctx, 'DEAD MONSTERS STAY DEADLY!', W / 2, 152, '#ff6060', 1, 'center');
          text(ctx, 'HIGH SCORE ' + pad(hi, 6), W / 2, 170, '#40e040', 1, 'center');
        }
        text(ctx, '\u00a9 1981 EXIDY', W / 2, 190, '#ffffff', 1, 'center');
        drawCoin(ctx, 204);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); return; }
        if (view === 'room' && cur) drawRoomView(ctx); else drawHallView(ctx);
        drawHUD(ctx);
        if (state === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(70, 100, W - 140, 24);
          text(ctx, 'LEVEL ' + level, W / 2, 104, '#ffe020', 1, 'center');
          if ((T >> 4) & 1) text(ctx, 'READY', W / 2, 114, '#ffffff', 1, 'center');
        } else if (state === 'levelclear') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(40, 96, W - 80, 34);
          text(ctx, 'LEVEL COMPLETE!', W / 2, 100, '#40e040', 1, 'center');
          if (T > 60) text(ctx, 'BONUS ' + SC.levelBonus * Math.min(level, 5), W / 2, 114, '#ffffff', 1, 'center');
        } else if (state === 'gameover') {
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(60, 96, W - 120, 30);
          text(ctx, 'GAME OVER', W / 2, 104, '#ff4040', 2, 'center');
        }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
