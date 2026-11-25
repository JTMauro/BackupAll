// Smash TV (Williams, 1990) \u2014 written from scratch for the MAME32 Game Room.
// Twin-stick game-show arena shooter: rooms, waves, power-ups, prizes, a host and big bosses (original designs).
(function () {
  'use strict';
  // ---------- compact 5x7 bitmap font ----------
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  // ---------- run-length pixel sprites ----------
  function makeSpr(rows, pal) {
    const runs = []; let w = 0;
    rows.forEach((r, y) => {
      w = Math.max(w, r.length);
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (!pal[ch]) { x++; continue; }
        let e = x + 1; while (e < r.length && r[e] === ch) e++;
        runs.push({ x, y, n: e - x, c: pal[ch], k: ch }); x = e;
      }
    });
    return { w, h: rows.length, runs };
  }
  function drawSpr(ctx, s, cx, cy, o) {
    o = o || {};
    const x0 = Math.round(cx - s.w / 2), y0 = Math.round(cy - s.h / 2);
    const sx = o.sx || 0, sy = o.sy || 0;
    for (const r of s.runs) {
      ctx.fillStyle = o.col || (o.pal && o.pal[r.k]) || r.c;
      const xx = o.flip ? s.w - r.x - r.n : r.x;
      const d = r.y - s.h / 2;
      ctx.fillRect(x0 + xx + Math.round(d * sx), y0 + r.y + Math.round(d * sy), r.n, 1);
    }
  }
  FONT['$'] = [4, 15, 20, 14, 5, 30, 4]; FONT['%'] = [25, 25, 2, 4, 8, 19, 19]; FONT['#'] = [10, 31, 10, 10, 31, 10, 0];
  FONT['&'] = [12, 18, 20, 8, 21, 18, 13]; FONT['"'] = [10, 10, 0, 0, 0, 0, 0];
  const rnd = n => Math.random() * n, irnd = n => (Math.random() * n) | 0, clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = a => a[(Math.random() * a.length) | 0];
  const CYC = ['#ff2020', '#ff9000', '#ffff00', '#20ff20', '#20ffff', '#2060ff', '#d040ff', '#ffffff'];

  const W = 336, H = 240;
  const AX0 = 14, AY0 = 26, AX1 = 322, AY1 = 226, CX = 168, CY = 126;
  const DOORS = {
    top: { x: CX, y: AY0 - 6, ix: 0, iy: 1 }, bottom: { x: CX, y: AY1 + 6, ix: 0, iy: -1 },
    left: { x: AX0 - 6, y: CY, ix: 1, iy: 0 }, right: { x: AX1 + 6, y: CY, ix: -1, iy: 0 }
  };
  const DIRV = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
  const MAPW = 4, MAPH = 3;
  const STAGES = [
    { name: 'STAGE 1: THE COLLECTION', floor: ['#4a3a6a', '#3e3060'], wall: '#8a6ad0', boss: 'mower' },
    { name: 'STAGE 2: THE SPONSORS', floor: ['#2a5a4a', '#22503f'], wall: '#40d0a0', boss: 'telebot' },
    { name: 'STAGE 3: THE FINALE', floor: ['#6a3a2a', '#5e3022'], wall: '#ffa040', boss: 'orb' }
  ];
  const BOSSNAME = { mower: 'THE MUTOID MOWER', telebot: 'TWIN-HEAD TELEBOT', orb: 'THE GILDED ORB' };
  const PRIZES = [
    { k: 'cash', name: 'CASH', pts: 500 }, { k: 'gold', name: 'GOLD BAR', pts: 1000 }, { k: 'toaster', name: 'TOASTER', pts: 2000 },
    { k: 'vcr', name: 'VCR', pts: 3000 }, { k: 'keys', name: 'NEW CAR', pts: 5000 }
  ];
  const POWERS = [
    { k: 'spread', c: 'S', col: '#30ff30', name: 'SPREAD GUN' }, { k: 'rocket', c: 'R', col: '#ff9020', name: 'ROCKETS' },
    { k: 'shield', c: 'P', col: '#40c0ff', name: 'FORCE SHIELD' }, { k: 'blades', c: 'B', col: '#ff40ff', name: 'ORBIT BLADES' },
    { k: 'rapid', c: 'F', col: '#ffff40', name: 'FAST FIRE' }
  ];
  const HOST = {
    start: ['WELCOME TO THE SHOW, CONTESTANT!', 'TONIGHT: ONE CONTESTANT. ONE ARENA.', 'SMILE! YOU ARE ON LIVE TV!'],
    room: ['DON\'T TOUCH THAT DIAL!', 'LET THE MAYHEM BEGIN!', 'THE STUDIO AUDIENCE IS ON ITS FEET!', 'WHO WANTS PRIZES?', 'RATINGS ARE THROUGH THE ROOF!', 'HERE THEY COME, FOLKS!'],
    prize: ['WHAT A HAUL!', 'OOH, LOOK AT THAT!', 'YOU\'RE A WINNER!', 'AND IT\'S ALL YOURS!'],
    die: ['OUCH! THE SPONSORS LOVED THAT!', 'GET UP, THE CAMERAS ARE ROLLING!', 'THAT\'LL BE IN THE HIGHLIGHT REEL!'],
    clear: ['THE CROWD GOES WILD!', 'CLEAN SWEEP! PICK A DOOR!', 'NOW WE\'RE TALKING! KEEP MOVING!'],
    boss: ['MEET TONIGHT\'S SPECIAL GUEST!', 'GIVE IT UP FOR OUR STAR!'],
    bossdown: ['UNBELIEVABLE! WHAT A SHOW!', 'CUE THE CONFETTI!']
  };
  // sprites
  const PH = { R: '#e03030', B: '#3050e0', S: '#ffc090', Y: '#ffd200', W: '#ffffff', K: '#202020' };
  const HERO = [
    makeSpr(['..WWW..', '.WWWWW.', '.WSSSW.', '..SSS..', '.RRRRR.', 'RRRYRRR', 'S.RRR.S', '..BBB..', '..B.B..', '..B.B..', '.KK.KK.'], PH),
    makeSpr(['..WWW..', '.WWWWW.', '.WSSSW.', '..SSS..', '.RRRRR.', 'RRRYRRR', 'S.RRR.S', '..BBB..', '.B...B.', '.B...B.', 'KK...KK'], PH)
  ];
  const PG = { G: '#30c030', D: '#208020', W: '#ffffff', N: '#a06030', K: '#202020' };
  const GRUNT = [
    makeSpr(['..GGG..N', '.GWGWG.N', '.GGGGG.N', '..GGG..N', 'GGGGGGGN', 'G.GGG.G.', '..DDD...', '..D.D...', '.KK.KK..'], PG),
    makeSpr(['N.GGG...', 'N.GWGWG.', 'N.GGGGG.', 'N..GGG..', 'NGGGGGGG', '.G.GGG.G', '..DDD...', '.D...D..', 'KK...KK.'], PG)
  ];
  const PB = { P: '#c040ff', M: '#ff90ff', W: '#ffffff' };
  const BLOB = [makeSpr(['.PPP.', 'PMPMP', 'PPWPP', 'PMPMP', '.PPP.'], PB), makeSpr(['..P..', '.PMP.', 'PPWPP', '.PMP.', '..P..'], PB)];

  ArcadeRegistry.register({
    id: 'smashtv', title: 'Smash TV', year: 1990, maker: 'Williams',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 WASD: fire 8 ways \u00b7 Space: fire where moving \u00b7 Enter: start',
    marquee: { bg: '#100020', fg: '#ffd200', accent: '#ff2a8a' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(100000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); return false;
      }
      const credStr = () => 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0');
      const snd = {
        shot() { au.tone(900, 0.04, { type: 'square', vol: 0.035, slideTo: 500 }); },
        rocket() { au.noise(0.12, { vol: 0.06, freq: 1200, slideTo: 400 }); },
        pop() { au.noise(0.08, { vol: 0.07, freq: 3000, slideTo: 400 }); },
        boom() { au.noise(0.35, { vol: 0.14, freq: 1500, slideTo: 100 }); },
        big() { au.noise(1.2, { vol: 0.2, freq: 1200, slideTo: 60 }); au.tone(200, 1, { type: 'sawtooth', vol: 0.08, slideTo: 30 }); },
        power() { au.melody([[660, 0.05], [880, 0.05], [1320, 0.1]], { type: 'square', vol: 0.09 }); },
        prize() { au.melody([[1047, 0.05], [1319, 0.05], [1568, 0.05], [2093, 0.12]], { type: 'triangle', vol: 0.12 }); },
        die() { au.tone(600, 0.8, { type: 'sawtooth', vol: 0.12, slideTo: 60 }); au.noise(0.5, { vol: 0.1, freq: 3000, slideTo: 200 }); },
        cheer() { au.noise(1.4, { vol: 0.07, freq: 2500, type: 'bandpass' }); au.noise(1.0, { vol: 0.05, freq: 1200, type: 'bandpass', delay: 0.2 }); },
        door() { au.tone(120, 0.25, { type: 'square', vol: 0.07, slideTo: 60 }); },
        hit() { au.tone(180, 0.04, { type: 'square', vol: 0.05 }); },
        ebullet() { au.tone(400, 0.05, { type: 'triangle', vol: 0.04, slideTo: 200 }); },
        jingle() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [784, 0.08], [1047, 0.3]], { type: 'square', vol: 0.09 }); },
        life() { au.melody([[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.2]], { type: 'square', vol: 0.1 }); }
      };
      function host(k, force) {
        if (!g) return;
        if (g.host && g.host.t > 100 && !force) return;
        g.host = { txt: pick(HOST[k]), t: 180 };
        // a short "voice" warble for the host
        for (let i = 0; i < 5; i++) au.tone(220 + rnd(140), 0.07, { type: 'triangle', vol: 0.05, delay: i * 0.08 });
      }

      // ---------- game flow ----------
      function newGame() {
        g = { score: 0, lives: 3, nextLife: 50000, stage: 0, loop: 0, prizes: {}, roomsDone: 0, host: null,
          p: null, en: [], shots: [], eshots: [], items: [], fx: [], parts: [], pops: [], phase: 'map', phaseT: 150 };
        newStage();
        host('start', true);
      }
      function newStage() {
        g.visited = new Set(); g.mx = 0; g.my = MAPH - 1; g.visited.add(g.mx + ',' + g.my);
        g.phase = 'map'; g.phaseT = 170; g.lastDoor = null;
      }
      const diff = () => g.stage + g.loop * 3;
      function startRoom(fromDoor) {
        const S = STAGES[g.stage];
        g.isBoss = g.mx === MAPW - 1 && g.my === 0;
        g.en = []; g.shots = []; g.eshots = []; g.items = []; g.fx = []; g.parts = []; g.pops = [];
        const sp = fromDoor ? DOORS[fromDoor] : null;
        g.p = { x: sp ? sp.x + sp.ix * 18 : CX, y: sp ? sp.y + sp.iy * 18 : CY, dx: 0, dy: -1, fireT: 0, walk: 0, inv: 90, power: null, powerT: 0, shield: 0, blades: 0, bladeA: 0 };
        const d = diff();
        g.toSpawn = g.isBoss ? 0 : Math.min(110, 34 + d * 9 + g.roomsDone * 4);
        g.spawnT = 60; g.cleared = false; g.itemT = 240 + irnd(200);
        g.boss = null; g.roomT = 0; g.entryDoor = fromDoor;
        if (!g.isBoss && (g.roomsDone % 2 === 1 || d >= 2)) {
          const n = 5 + Math.min(10, d * 2 + irnd(4));
          for (let i = 0; i < n; i++) {
            let x, y, k = 0;
            do { x = AX0 + 20 + rnd(AX1 - AX0 - 40); y = AY0 + 20 + rnd(AY1 - AY0 - 40); k++; } while (k < 30 && (Math.hypot(x - g.p.x, y - g.p.y) < 50 || Math.abs(x - CX) < 20 || Math.abs(y - CY) < 16));
            g.en.push({ type: 'mine', x, y, r: 4, hp: 1, t: irnd(60) });
          }
        }
        if (g.isBoss) {
          const k = S.boss;
          const b = { type: k, x: CX, y: AY0 + 44, hp: 0, max: 0, t: 0, vx: 1, vy: 0, hitT: 0, r: 22, open: true };
          b.max = b.hp = { mower: 110, telebot: 150, orb: 190 }[k] * (1 + g.loop * 0.5);
          if (k === 'orb') { b.y = CY - 30; b.vx = 0.8; b.vy = 0.6; }
          g.boss = b;
          host('boss', true);
        } else host('room', true);
        g.phase = 'play'; g.phaseT = 0;
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 100000; snd.life(); }
        if (g.score > hi) hi = g.score;
      }
      function burst(x, y, col, n, sp) {
        for (let i = 0; i < n; i++) { const a = rnd(6.283), s = 0.4 + rnd(sp || 2); g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 14 + irnd(20), col }); }
      }
      function spawnGroup() {
        const d = diff();
        const doors = Object.keys(DOORS);
        const dk = pick(doors), dr = DOORS[dk];
        const roll = Math.random();
        let type = 'grunt', n = 4 + irnd(4);
        if (g.roomsDone >= 1 && roll < 0.28) { type = 'blob'; n = 3 + irnd(4); }
        else if ((g.roomsDone >= 2 || d > 0) && roll < 0.36) { type = 'tank'; n = 1; }
        n = Math.min(n, g.toSpawn);
        for (let i = 0; i < n; i++) {
          const off = (i - n / 2) * 7;
          const e = { type, x: dr.x + (dr.ix ? -dr.ix * i * 8 : off), y: dr.y + (dr.iy ? -dr.iy * i * 8 : off), ix: dr.ix, iy: dr.iy, enter: 24 + i * 6, t: irnd(40), hp: 1, r: 4, sp: 0.6 + rnd(0.35) + d * 0.07 };
          if (type === 'blob') { e.r = 3; e.sp = 1.3 + d * 0.1; e.vx = 0; e.vy = 0; }
          if (type === 'tank') { e.r = 9; e.hp = 8 + d * 2; e.sp = 0.35; e.fire = 80; e.ang = 0; }
          g.en.push(e);
        }
        g.toSpawn -= n;
        // the occasional power-up or prize carried in by the crowd of enemies
        if (Math.random() < 0.18) dropItem(dr.x + dr.ix * 30, dr.y + dr.iy * 30);
      }
      function dropItem(x, y) {
        x = clamp(x, AX0 + 10, AX1 - 10); y = clamp(y, AY0 + 10, AY1 - 10);
        if (Math.random() < 0.5) g.items.push({ kind: 'power', pw: pick(POWERS), x, y, t: 480 });
        else {
          const r = Math.random();
          const pz = r < 0.4 ? PRIZES[0] : r < 0.65 ? PRIZES[1] : r < 0.82 ? PRIZES[2] : r < 0.95 ? PRIZES[3] : PRIZES[4];
          g.items.push({ kind: 'prize', pz, x, y, t: 480 });
        }
      }
      function killEnemy(e, pts) {
        if (e.dead) return;
        e.dead = true; snd.pop();
        const col = e.type === 'grunt' ? '#30c030' : e.type === 'blob' ? '#c040ff' : e.type === 'tank' ? '#a0a0a0' : '#ff4040';
        burst(e.x, e.y, col, e.type === 'tank' ? 30 : 10);
        if (e.type === 'tank' || e.type === 'mine') { snd.boom(); g.fx.push({ x: e.x, y: e.y, t: 0, r: e.type === 'tank' ? 16 : 10 }); }
        if (pts) addScore(pts);
        if (e.type === 'tank') { g.pops.push({ x: e.x, y: e.y - 10, txt: String(pts), t: 40 }); if (Math.random() < 0.5) dropItem(e.x, e.y); }
      }
      function damageEnemy(e, dmg) {
        e.hp -= dmg; e.hitT = 4;
        if (e.hp <= 0) killEnemy(e, { grunt: 100, blob: 50, tank: 500, mine: 25 }[e.type]);
        else snd.hit();
      }
      function damageBoss(dmg, x, y) {
        const b = g.boss; if (!b || b.dead) return;
        if (b.type === 'orb' && !b.open) { burst(x, y, '#ffd200', 2); return; }
        b.hp -= dmg; b.hitT = 3; addScore(10 * dmg);
        if (b.hp <= 0) {
          b.dead = true; b.deadT = 150; snd.big(); host('bossdown', true);
          addScore(50000 + g.loop * 25000);
          g.pops.push({ x: b.x, y: b.y, txt: String(50000 + g.loop * 25000), t: 120 });
          for (const e of g.en) killEnemy(e, 0);
          g.eshots = [];
        }
      }
      function playerHit() {
        const p = g.p;
        if (p.inv > 0 || p.shield > 0 || g.phase !== 'play') return;
        g.phase = 'dead'; g.phaseT = 90; snd.die(); host('die', true);
      }
      function fire(fx, fy) {
        const p = g.p;
        const pw = p.power, a = Math.atan2(fy, fx);
        const add = (ang, o) => g.shots.push(Object.assign({ x: p.x + Math.cos(ang) * 5, y: p.y - 2 + Math.sin(ang) * 5, vx: Math.cos(ang) * 5.5, vy: Math.sin(ang) * 5.5, dmg: 1, t: 70 }, o || {}));
        if (pw === 'spread') { add(a); add(a - 0.22); add(a + 0.22); p.fireT = 7; snd.shot(); }
        else if (pw === 'rocket') { add(a, { vx: Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6, dmg: 4, rocket: true, t: 110 }); p.fireT = 14; snd.rocket(); }
        else if (pw === 'rapid') { add(a + (rnd(0.12) - 0.06)); p.fireT = 3; snd.shot(); }
        else { add(a); p.fireT = 6; snd.shot(); }
      }
      function updPlayer() {
        const p = g.p;
        const mx = (api.key('ArrowRight') ? 1 : 0) - (api.key('ArrowLeft') ? 1 : 0);
        const my = (api.key('ArrowDown') ? 1 : 0) - (api.key('ArrowUp') ? 1 : 0);
        if (mx || my) {
          const sp = mx && my ? 1.1 : 1.5;
          p.x += mx * sp; p.y += my * sp; p.walk++;
          p.dx = mx; p.dy = my;
        }
        // stay in the arena, except through an open exit door
        const inDoorX = Math.abs(p.x - CX) < 14, inDoorY = Math.abs(p.y - CY) < 14;
        const open = g.cleared;
        p.x = clamp(p.x, open && inDoorY ? AX0 - 16 : AX0 + 4, open && inDoorY ? AX1 + 16 : AX1 - 4);
        p.y = clamp(p.y, open && inDoorX ? AY0 - 16 : AY0 + 6, open && inDoorX ? AY1 + 16 : AY1 - 6);
        let fx = (api.key('KeyD') ? 1 : 0) - (api.key('KeyA') ? 1 : 0);
        let fy = (api.key('KeyS') ? 1 : 0) - (api.key('KeyW') ? 1 : 0);
        if (!fx && !fy && api.key('Space')) { fx = p.dx; fy = p.dy; }
        if (fx || fy) { p.dx = fx; p.dy = fy; }
        if (p.fireT > 0) p.fireT--;
        if ((fx || fy) && p.fireT <= 0) fire(fx, fy);
        if (p.inv > 0) p.inv--;
        if (p.shield > 0) p.shield--;
        if (p.blades > 0) p.blades--;
        if (p.powerT > 0 && --p.powerT <= 0) p.power = null;
        p.bladeA += 0.16;
        if (g.cleared) {
          let ex = null;
          if (p.x < AX0 - 10) ex = 'left'; else if (p.x > AX1 + 10) ex = 'right'; else if (p.y < AY0 - 10) ex = 'top'; else if (p.y > AY1 + 10) ex = 'bottom';
          if (ex && g.exits[ex]) {
            const [dx, dy] = DIRV[ex];
            g.mx += dx; g.my += dy; g.visited.add(g.mx + ',' + g.my); g.lastDoor = ex;
            g.roomsDone++; g.phase = 'map'; g.phaseT = 120; snd.door();
          }
        }
      }
      function computeExits() {
        const ex = {}; let any = false;
        for (const k in DIRV) {
          const nx = g.mx + DIRV[k][0], ny = g.my + DIRV[k][1];
          if (nx < 0 || ny < 0 || nx >= MAPW || ny >= MAPH) continue;
          if (!g.visited.has(nx + ',' + ny)) { ex[k] = true; any = true; }
        }
        if (!any) for (const k in DIRV) { const nx = g.mx + DIRV[k][0], ny = g.my + DIRV[k][1]; if (nx >= 0 && ny >= 0 && nx < MAPW && ny < MAPH) ex[k] = true; }
        g.exits = ex;
      }
      function updEnemies() {
        const p = g.p;
        for (const e of g.en) {
          if (e.dead) continue;
          e.t++; if (e.hitT > 0) e.hitT--;
          if (e.type === 'mine') {
            if (Math.hypot(e.x - p.x, e.y - p.y) < 8) { killEnemy(e, 0); playerHit(); }
            continue;
          }
          if (e.enter > 0) { e.enter--; e.x += e.ix * 1.2; e.y += e.iy * 1.2; continue; }
          const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
          if (e.type === 'grunt') {
            const wob = Math.sin(e.t * 0.1 + e.sp * 10) * 0.4;
            e.x += (dx / d) * e.sp + (-dy / d) * wob; e.y += (dy / d) * e.sp + (dx / d) * wob;
          } else if (e.type === 'blob') {
            if (e.t % 20 === 0) { const a = Math.atan2(dy, dx) + rnd(1.6) - 0.8; e.vx = Math.cos(a) * e.sp; e.vy = Math.sin(a) * e.sp; }
            e.x += e.vx; e.y += e.vy;
          } else if (e.type === 'tank') {
            e.x += (dx / d) * e.sp; e.y += (dy / d) * e.sp;
            e.ang = Math.atan2(dy, dx);
            if (--e.fire <= 0) {
              e.fire = Math.max(45, 100 - diff() * 10) + irnd(40);
              g.eshots.push({ x: e.x + Math.cos(e.ang) * 10, y: e.y + Math.sin(e.ang) * 10, vx: Math.cos(e.ang) * 2.2, vy: Math.sin(e.ang) * 2.2, t: 200 });
              snd.ebullet();
            }
          }
          e.x = clamp(e.x, AX0 + e.r, AX1 - e.r); e.y = clamp(e.y, AY0 + e.r, AY1 - e.r);
          if (Math.abs(e.x - p.x) < e.r + 3 && Math.abs(e.y - p.y) < e.r + 5) {
            if (p.shield > 0) damageEnemy(e, 99); else playerHit();
          }
          // orbiting blades
          if (p.blades > 0) for (let i = 0; i < 2; i++) {
            const a = p.bladeA + i * Math.PI, bx = p.x + Math.cos(a) * 18, by = p.y + Math.sin(a) * 18;
            if (!e.dead && Math.hypot(bx - e.x, by - e.y) < e.r + 4 && e.t % 6 === 0) damageEnemy(e, 2);
          }
        }
        // grunts push apart a little
        for (let i = 0; i < g.en.length; i++) {
          const a = g.en[i]; if (a.type !== 'grunt' || a.enter > 0) continue;
          for (let j = i + 1; j < Math.min(g.en.length, i + 12); j++) {
            const b = g.en[j]; if (b.type !== 'grunt' || b.enter > 0) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) { a.x -= Math.sign(dx || 1) * 0.4; b.x += Math.sign(dx || 1) * 0.4; a.y -= Math.sign(dy) * 0.4; b.y += Math.sign(dy) * 0.4; }
          }
        }
        g.en = g.en.filter(e => !e.dead);
      }
      function updBoss() {
        const b = g.boss; if (!b) return;
        const p = g.p;
        if (b.dead) {
          if (b.deadT % 8 === 0) { burst(b.x + rnd(40) - 20, b.y + rnd(30) - 15, pick(CYC), 12); snd.pop(); }
          if (--b.deadT <= 0) { g.boss = null; g.stageClear = true; }
          return;
        }
        b.t++; if (b.hitT > 0) b.hitT--;
        const rage = b.hp < b.max / 2 ? 1.5 : 1;
        const aimShot = (sp, spread, n) => {
          const a0 = Math.atan2(p.y - b.y, p.x - b.x);
          for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; g.eshots.push({ x: b.x, y: b.y + 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 240 }); }
          snd.ebullet();
        };
        if (b.type === 'mower') {
          b.r = 26;
          if (b.charge > 0) { b.charge--; b.y += b.charge > 40 ? 2.6 : -2.6; }
          else {
            b.x += b.vx * 1.1 * rage; if (b.x < AX0 + 34 || b.x > AX1 - 34) b.vx = -b.vx;
            if (b.t % Math.round(70 / rage) === 0) aimShot(2.3, 0.25, 5);
            if (b.t % 420 === 0) b.charge = 80;
            if (b.t % 150 === 0 && g.en.length < 20) for (let i = 0; i < 3; i++) g.en.push({ type: 'grunt', x: b.x - 16 + i * 16, y: b.y + 20, ix: 0, iy: 1, enter: 8, t: 0, hp: 1, r: 4, sp: 0.8 });
          }
          b.y = clamp(b.y, AY0 + 30, AY1 - 30);
        } else if (b.type === 'telebot') {
          b.r = 22;
          const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
          b.x += dx / d * 0.45 * rage; b.y += dy / d * 0.35 * rage;
          b.x = clamp(b.x, AX0 + 26, AX1 - 26); b.y = clamp(b.y, AY0 + 30, AY1 - 30);
          if (b.t % 50 === 0) aimShot(2.6, 0.12, 3);
          if (b.t % 260 === 130) { for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + b.t; g.eshots.push({ x: b.x, y: b.y, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8, t: 240 }); } snd.ebullet(); }
          if (b.t % 200 === 0 && g.en.length < 20) for (let i = 0; i < 4; i++) g.en.push({ type: 'blob', x: b.x, y: b.y, ix: 0, iy: 0, enter: 0, t: i * 5, hp: 1, r: 3, sp: 1.4, vx: 0, vy: 0 });
        } else {
          b.r = 20;
          b.x += b.vx * rage; b.y += b.vy * rage;
          if (b.x < AX0 + 24 || b.x > AX1 - 24) b.vx = -b.vx;
          if (b.y < AY0 + 24 || b.y > AY1 - 24) b.vy = -b.vy;
          b.x = clamp(b.x, AX0 + 24, AX1 - 24); b.y = clamp(b.y, AY0 + 24, AY1 - 24);
          const cyc = b.t % 240; b.open = cyc < 150;
          if (b.open && b.t % 40 === 0) aimShot(2.4, 0.3, 3);
          if (!b.open && cyc === 200) { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.eshots.push({ x: b.x, y: b.y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, t: 240 }); } }
          if (b.t % 180 === 0 && g.en.length < 24) for (let i = 0; i < 3; i++) g.en.push({ type: 'blob', x: b.x, y: b.y, ix: 0, iy: 0, enter: 0, t: i * 7, hp: 1, r: 3, sp: 1.5, vx: 0, vy: 0 });
        }
        if (Math.abs(p.x - b.x) < b.r + 2 && Math.abs(p.y - b.y) < b.r + 4) playerHit();
      }
      function updShots() {
        for (const s of g.shots) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (s.x < AX0 || s.x > AX1 || s.y < AY0 || s.y > AY1 || s.t <= 0) { s.dead = true; if (s.rocket) rocketBoom(s); continue; }
          for (const e of g.en) {
            if (e.dead || e.enter > 6) continue;
            if (Math.abs(s.x - e.x) <= e.r + 1 && Math.abs(s.y - e.y) <= e.r + 2) {
              if (s.rocket) { rocketBoom(s); } else damageEnemy(e, s.dmg);
              s.dead = true; break;
            }
          }
          const b = g.boss;
          if (!s.dead && b && !b.dead && Math.abs(s.x - b.x) < b.r && Math.abs(s.y - b.y) < b.r) {
            s.dead = true; damageBoss(s.dmg, s.x, s.y); burst(s.x, s.y, '#ffffff', 2);
          }
        }
        g.shots = g.shots.filter(s => !s.dead);
        const p = g.p;
        for (const s of g.eshots) {
          s.x += s.vx; s.y += s.vy; s.t--;
          if (s.x < AX0 || s.x > AX1 || s.y < AY0 || s.y > AY1 || s.t <= 0) { s.dead = true; continue; }
          if (Math.abs(s.x - p.x) < 3 && Math.abs(s.y - p.y) < 5) { s.dead = true; playerHit(); }
          if (p.shield > 0 && Math.hypot(s.x - p.x, s.y - p.y) < 12) s.dead = true;
        }
        g.eshots = g.eshots.filter(s => !s.dead);
      }
      function rocketBoom(s) {
        g.fx.push({ x: s.x, y: s.y, t: 0, r: 14 }); snd.boom();
        for (const e of g.en) if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) < 16 + e.r) damageEnemy(e, 4);
      }
      function updItems() {
        const p = g.p;
        if (!g.isBoss && !g.cleared && --g.itemT <= 0) { g.itemT = 300 + irnd(300); dropItem(AX0 + 30 + rnd(AX1 - AX0 - 60), AY0 + 30 + rnd(AY1 - AY0 - 60)); }
        for (const it of g.items) {
          it.t--;
          if (Math.abs(it.x - p.x) < 8 && Math.abs(it.y - p.y) < 9) {
            it.t = 0;
            if (it.kind === 'power') {
              const k = it.pw.k; snd.power();
              if (k === 'shield') p.shield = 600; else if (k === 'blades') p.blades = 720;
              else { p.power = k; p.powerT = 720; }
              g.pops.push({ x: it.x, y: it.y - 10, txt: it.pw.name, t: 60 });
            } else {
              snd.prize(); addScore(it.pz.pts); g.prizes[it.pz.k] = (g.prizes[it.pz.k] || 0) + 1;
              g.pops.push({ x: it.x, y: it.y - 10, txt: it.pz.name + ' ' + it.pz.pts, t: 60 });
              host('prize');
            }
          }
        }
        g.items = g.items.filter(i => i.t > 0);
      }
      function updPlay() {
        g.roomT++;
        updPlayer(); if (g.phase !== 'play') return;
        if (!g.isBoss && g.toSpawn > 0 && --g.spawnT <= 0) {
          g.spawnT = Math.max(28, 95 - diff() * 9 - g.roomsDone * 2) + irnd(40);
          if (g.en.filter(e => e.type !== 'mine').length < 45) spawnGroup();
        }
        updEnemies(); updBoss(); updShots(); updItems();
        if (g.phase !== 'play') return;
        if (g.stageClear) {
          g.stageClear = false; g.phase = 'stageclear'; g.phaseT = 300; snd.jingle(); snd.cheer();
          return;
        }
        if (!g.cleared && !g.isBoss && g.toSpawn <= 0 && !g.en.some(e => e.type !== 'mine')) {
          g.cleared = true; computeExits(); host('clear', true); snd.cheer();
          addScore(1000); g.pops.push({ x: CX, y: CY - 30, txt: 'ROOM BONUS 1000', t: 90 });
        }
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 360;
        au.melody([[392, 0.2], [330, 0.2], [262, 0.2], [196, 0.6]], { type: 'square', vol: 0.09 });
      }
      function lastLife(onCont) {
        g.phase = 'wait';
        if (!api.offerContinue) { gameOver(); return; }
        const cg = g;
        api.offerContinue(() => { if (g === cg) onCont(); }, () => { if (g === cg) gameOver(); });
      }
      function respawn() {
        const p = g.p;
        g.phase = 'play'; p.inv = 150; p.power = null; p.powerT = 0;
        for (const e of g.en) if (e.type !== 'mine' && Math.hypot(e.x - p.x, e.y - p.y) < 40) killEnemy(e, 0);
        g.eshots = [];
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (g.host && --g.host.t <= 0) g.host = null;
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < 18);
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.vx *= 0.95; q.vy *= 0.95; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const q of g.pops) { q.t--; q.y -= 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
        switch (g.phase) {
          case 'map':
            if (--g.phaseT <= 0 || (g.phaseT < 90 && api.anyPressed('Enter', 'Space'))) startRoom(g.lastDoor ? { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }[g.lastDoor] : null);
            break;
          case 'play': updPlay(); break;
          case 'dead':
            if (--g.phaseT <= 0) {
              g.lives--;
              if (g.lives > 0) respawn();
              else lastLife(() => { g.lives = 3; respawn(); });
            }
            break;
          case 'stageclear':
            if (--g.phaseT <= 0) {
              g.stage++;
              if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; }
              g.roomsDone = 0; newStage();
            }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 280 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawArena(ctx) {
        const S = STAGES[g.stage];
        for (let y = AY0; y < AY1; y += 16) for (let x = AX0; x < AX1; x += 16) {
          ctx.fillStyle = S.floor[((x - AX0) / 16 + (y - AY0) / 16) & 1];
          ctx.fillRect(x, y, Math.min(16, AX1 - x), Math.min(16, AY1 - y));
        }
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(CX - 40, CY - 1, 80, 2); ctx.fillRect(CX - 1, CY - 30, 2, 60);
        // walls with crowd rails
        ctx.fillStyle = '#181020';
        ctx.fillRect(0, 16, W, AY0 - 16); ctx.fillRect(0, AY1, W, H - AY1); ctx.fillRect(0, 16, AX0, H - 16); ctx.fillRect(AX1, 16, W - AX1, H - 16);
        ctx.fillStyle = S.wall;
        ctx.fillRect(AX0 - 3, AY0 - 3, AX1 - AX0 + 6, 3); ctx.fillRect(AX0 - 3, AY1, AX1 - AX0 + 6, 3);
        ctx.fillRect(AX0 - 3, AY0, 3, AY1 - AY0); ctx.fillRect(AX1, AY0, 3, AY1 - AY0);
        // studio lights
        for (let i = 0; i < 10; i++) { ctx.fillStyle = ((i + (frame >> 4)) & 1) ? '#ffd200' : '#ff2a8a'; ctx.fillRect(28 + i * 31, 18, 3, 3); }
        // doors
        for (const k in DOORS) {
          const d = DOORS[k], open = g.cleared && g.exits && g.exits[k];
          const horiz = k === 'top' || k === 'bottom';
          ctx.fillStyle = open ? ((frame & 8) ? '#30ff30' : '#108010') : '#606070';
          if (horiz) ctx.fillRect(CX - 14, k === 'top' ? AY0 - 6 : AY1, 28, 6); else ctx.fillRect(k === 'left' ? AX0 - 6 : AX1, CY - 14, 6, 28);
          if (!open) { ctx.fillStyle = '#ff3030'; if (horiz) ctx.fillRect(CX - 1, k === 'top' ? AY0 - 5 : AY1 + 1, 2, 4); else ctx.fillRect(k === 'left' ? AX0 - 5 : AX1 + 1, CY - 1, 4, 2); }
          else {
            const a = (frame >> 3) & 1 ? 2 : 0;
            const tx = horiz ? CX : (k === 'left' ? AX0 + 12 - a : AX1 - 12 + a), ty = horiz ? (k === 'top' ? AY0 + 10 - a : AY1 - 16 + a) : CY - 3;
            text(ctx, k === 'top' ? 'EXIT' : k === 'bottom' ? 'EXIT' : k === 'left' ? '<' : '>', tx, ty, '#30ff30', 1, 'center');
          }
        }
      }
      function drawEnemy(ctx, e) {
        const flash = e.hitT > 0 && (frame & 1);
        if (e.type === 'grunt') drawSpr(ctx, GRUNT[(e.t >> 3) & 1], e.x, e.y, { flip: g.p.x < e.x, col: flash ? '#fff' : null });
        else if (e.type === 'blob') drawSpr(ctx, BLOB[(e.t >> 3) & 1], e.x, e.y, {});
        else if (e.type === 'mine') {
          ctx.fillStyle = '#303030'; ctx.fillRect(e.x - 4, e.y - 3, 8, 6); ctx.fillRect(e.x - 3, e.y - 4, 6, 8);
          ctx.fillStyle = (e.t + frame) % 40 < 8 ? '#ff2020' : '#601010'; ctx.fillRect(e.x - 1, e.y - 1, 2, 2);
        } else if (e.type === 'tank') {
          const x = Math.round(e.x), y = Math.round(e.y);
          ctx.fillStyle = flash ? '#fff' : '#707880'; ctx.fillRect(x - 9, y - 8, 18, 16);
          ctx.fillStyle = '#303438'; ctx.fillRect(x - 10, y - 8, 3, 16); ctx.fillRect(x + 7, y - 8, 3, 16);
          ctx.fillStyle = '#505860'; for (let i = 0; i < 4; i++) { const yy = y - 8 + ((i * 4 + (e.t >> 2)) % 16); ctx.fillRect(x - 10, yy, 3, 1); ctx.fillRect(x + 7, yy, 3, 1); }
          ctx.fillStyle = '#a0a8b0'; ctx.fillRect(x - 4, y - 4, 8, 8);
          ctx.fillStyle = '#e0e0e0';
          for (let i = 3; i < 12; i++) ctx.fillRect(Math.round(x + Math.cos(e.ang) * i), Math.round(y + Math.sin(e.ang) * i), 2, 2);
        }
      }
      function drawBoss(ctx) {
        const b = g.boss; if (!b) return;
        const x = Math.round(b.x), y = Math.round(b.y), fl = b.hitT > 0 && (frame & 1);
        if (b.type === 'mower') {
          ctx.fillStyle = fl ? '#fff' : '#b03030'; ctx.fillRect(x - 26, y - 18, 52, 30);
          ctx.fillStyle = '#601818'; ctx.fillRect(x - 26, y - 18, 52, 4);
          ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 16, y - 10, 32, 8);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 12, y - 8, 8, 4); ctx.fillRect(x + 4, y - 8, 8, 4);
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 10 + ((frame >> 3) & 3), y - 7, 2, 2); ctx.fillRect(x + 6 + ((frame >> 3) & 3), y - 7, 2, 2);
          // spinning blade bar
          for (let i = 0; i < 9; i++) { ctx.fillStyle = ((i + (frame >> 1)) & 1) ? '#e0e0e0' : '#808080'; ctx.fillRect(x - 27 + i * 6, y + 12, 5, 6); }
          ctx.fillStyle = '#303030'; ctx.fillRect(x - 30, y - 14, 4, 22); ctx.fillRect(x + 26, y - 14, 4, 22);
        } else if (b.type === 'telebot') {
          ctx.fillStyle = fl ? '#fff' : '#4060a0'; ctx.fillRect(x - 10, y - 2, 20, 24);
          ctx.fillStyle = '#203060'; ctx.fillRect(x - 6, y + 22, 4, 6); ctx.fillRect(x + 2, y + 22, 4, 6);
          for (const sx of [-12, 12]) {
            ctx.fillStyle = fl ? '#fff' : '#909090'; ctx.fillRect(x + sx - 11, y - 22, 22, 18);
            ctx.fillStyle = '#103010'; ctx.fillRect(x + sx - 9, y - 20, 18, 14);
            ctx.fillStyle = CYC[((frame >> 2) + (sx > 0 ? 3 : 0)) & 7];
            for (let k = 0; k < 4; k++) ctx.fillRect(x + sx - 8, y - 19 + ((k * 4 + frame) % 13), 16, 1);
            ctx.fillStyle = '#fff'; ctx.fillRect(x + sx - 3, y - 15, 2, 3); ctx.fillRect(x + sx + 2, y - 15, 2, 3);
          }
          ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 20, y + 2, 10, 3); ctx.fillRect(x + 10, y + 2, 10, 3);
        } else {
          const r = 20;
          for (let yy = -r; yy <= r; yy += 2) {
            const w = Math.round(Math.sqrt(r * r - yy * yy));
            ctx.fillStyle = fl ? '#fff' : (yy < -8 ? '#fff080' : '#e0b020'); ctx.fillRect(x - w, y + yy, w * 2, 2);
          }
          if (b.open) {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 11, y - 6, 22, 12);
            const ax = clamp((g.p.x - x) / 30, -5, 5), ay = clamp((g.p.y - y) / 30, -2, 2);
            ctx.fillStyle = '#d02020'; ctx.fillRect(x - 4 + ax, y - 4 + ay, 8, 8); ctx.fillStyle = '#000'; ctx.fillRect(x - 2 + ax, y - 2 + ay, 4, 4);
          } else { ctx.fillStyle = '#806010'; ctx.fillRect(x - 12, y - 1, 24, 2); }
          ctx.fillStyle = '#ffd200';
          for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + frame * 0.03; ctx.fillRect(Math.round(x + Math.cos(a) * 24) - 1, Math.round(y + Math.sin(a) * 24) - 1, 3, 3); }
        }
        // boss health bar
        if (!b.dead) {
          ctx.fillStyle = '#400000'; ctx.fillRect(CX - 60, AY1 - 8, 120, 4);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(CX - 60, AY1 - 8, Math.round(120 * b.hp / b.max), 4);
        }
      }
      function drawItem(ctx, it) {
        if (it.t < 90 && (frame & 4)) return;
        const x = Math.round(it.x), y = Math.round(it.y);
        if (it.kind === 'power') {
          ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 5, 11, 11);
          ctx.fillStyle = it.pw.col; ctx.fillRect(x - 5, y - 5, 11, 1); ctx.fillRect(x - 5, y + 5, 11, 1); ctx.fillRect(x - 5, y - 5, 1, 11); ctx.fillRect(x + 5, y - 5, 1, 11);
          text(ctx, it.pw.c, x - 2, y - 3, it.pw.col, 1);
          return;
        }
        switch (it.pz.k) {
          case 'cash': ctx.fillStyle = '#30a030'; ctx.fillRect(x - 6, y - 3, 12, 7); ctx.fillStyle = '#a0ffa0'; ctx.fillRect(x - 1, y - 1, 3, 3); break;
          case 'gold': ctx.fillStyle = '#ffd200'; ctx.fillRect(x - 6, y - 1, 12, 5); ctx.fillStyle = '#fff080'; ctx.fillRect(x - 4, y - 3, 8, 2); break;
          case 'toaster': ctx.fillStyle = '#c0c0c8'; ctx.fillRect(x - 6, y - 3, 12, 8); ctx.fillStyle = '#202020'; ctx.fillRect(x - 4, y - 3, 3, 2); ctx.fillRect(x + 1, y - 3, 3, 2); ctx.fillStyle = '#c08040'; ctx.fillRect(x - 4, y - 6, 3, 3); break;
          case 'vcr': ctx.fillStyle = '#303030'; ctx.fillRect(x - 8, y - 3, 16, 7); ctx.fillStyle = '#30ff30'; ctx.fillRect(x + 3, y - 1, 4, 2); ctx.fillStyle = '#000'; ctx.fillRect(x - 6, y - 1, 7, 2); break;
          default: ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 2, y - 5, 5, 5); ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 4, 3, 3); ctx.fillStyle = '#ffd200'; ctx.fillRect(x, y, 2, 6); ctx.fillRect(x + 2, y + 3, 2, 1);
        }
      }
      function drawPlayer(ctx) {
        const p = g.p;
        if (g.phase === 'dead') {
          const k = 90 - g.phaseT;
          drawSpr(ctx, HERO[0], p.x, p.y + Math.min(4, k / 6), { col: (frame & 2) ? '#ffffff' : '#ff3030', sx: Math.sin(k * 0.4) * 0.6 });
          return;
        }
        if (g.phase === 'wait' || g.phase === 'over') return;
        if (p.inv > 0 && (frame & 2)) return;
        drawSpr(ctx, HERO[(p.walk >> 3) & 1], p.x, p.y, { flip: p.dx < 0 });
        // gun barrel
        ctx.fillStyle = '#c0c0c0';
        for (let i = 3; i < 7; i++) ctx.fillRect(Math.round(p.x + p.dx * i), Math.round(p.y - 1 + p.dy * i), 1, 1);
        if (p.shield > 0 && !(p.shield < 120 && (frame & 4))) {
          ctx.strokeStyle = CYC[(frame >> 2) & 7]; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 6.283); ctx.stroke();
        }
        if (p.blades > 0) for (let i = 0; i < 2; i++) {
          const a = p.bladeA + i * Math.PI, bx = Math.round(p.x + Math.cos(a) * 18), by = Math.round(p.y + Math.sin(a) * 18);
          ctx.fillStyle = '#ff40ff'; ctx.fillRect(bx - 3, by, 7, 1); ctx.fillRect(bx, by - 3, 1, 7); ctx.fillStyle = '#fff'; ctx.fillRect(bx - 1, by - 1, 3, 3);
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#100020'; ctx.fillRect(0, 0, W, 16);
        text(ctx, String(g.score), 8, 4, '#ffd200', 1);
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) drawSpr(ctx, HERO[0], 76 + i * 9, 8, {});
        const p = g.p;
        if (p) {
          let s = '';
          if (p.power) s = POWERS.find(q => q.k === p.power).name + ' ' + Math.ceil(p.powerT / 60);
          if (p.shield > 0) s += (s ? ' ' : '') + 'SHIELD';
          if (p.blades > 0) s += (s ? ' ' : '') + 'BLADES';
          text(ctx, s, CX + 20, 4, '#30ff30', 1, 'center');
        }
        text(ctx, 'HI ' + hi, W - 8, 4, '#ff2a8a', 1, 'right');
      }
      function drawHost(ctx) {
        if (!g.host) return;
        const n = Math.min(g.host.txt.length, (180 - g.host.t) >> 1);
        const w = g.host.txt.length * 6 + 26;
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(CX - w / 2, AY1 - 24, w, 13);
        // the host's tiny face
        ctx.fillStyle = '#ffc090'; ctx.fillRect(CX - w / 2 + 3, AY1 - 22, 8, 9); ctx.fillStyle = '#ffd200'; ctx.fillRect(CX - w / 2 + 3, AY1 - 23, 8, 2);
        ctx.fillStyle = '#000'; ctx.fillRect(CX - w / 2 + 5, AY1 - 19, 1, 1); ctx.fillRect(CX - w / 2 + 8, AY1 - 19, 1, 1);
        ctx.fillStyle = '#ff2020'; ctx.fillRect(CX - w / 2 + 5, AY1 - 16, 4, (frame >> 2) & 1 ? 2 : 1);
        text(ctx, g.host.txt.slice(0, n), CX + 7, AY1 - 21, '#ffffff', 1, 'center');
      }
      function drawMap(ctx) {
        const S = STAGES[g.stage];
        ctx.fillStyle = '#100020'; ctx.fillRect(0, 16, W, H - 16);
        text(ctx, S.name, CX, 26, '#ffd200', 1, 'center');
        const cw = 50, ch = 36, ox = CX - (MAPW * cw) / 2, oy = 46;
        for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
          const vis = g.visited.has(x + ',' + y), cur = x === g.mx && y === g.my, boss = x === MAPW - 1 && y === 0;
          ctx.fillStyle = cur ? ((frame & 8) ? '#ff2a8a' : '#a01050') : vis ? '#404080' : '#202040';
          ctx.fillRect(ox + x * cw + 3, oy + y * ch + 3, cw - 6, ch - 6);
          if (x < MAPW - 1) { ctx.fillStyle = '#505070'; ctx.fillRect(ox + x * cw + cw - 3, oy + y * ch + ch / 2 - 2, 6, 4); }
          if (y < MAPH - 1) { ctx.fillStyle = '#505070'; ctx.fillRect(ox + x * cw + cw / 2 - 2, oy + y * ch + ch - 3, 4, 6); }
          if (boss) text(ctx, 'BOSS', ox + x * cw + cw / 2, oy + y * ch + ch / 2 - 3, '#ff3030', 1, 'center');
          if (cur) drawSpr(ctx, HERO[(frame >> 3) & 1], ox + x * cw + cw / 2, oy + y * ch + ch / 2 + (boss ? 9 : 0), {});
        }
        const ty = oy + MAPH * ch + 10;
        text(ctx, 'PRIZES WON', CX, ty, '#30ff30', 1, 'center');
        PRIZES.forEach((pz, i) => {
          drawItem(ctx, { kind: 'prize', pz, x: 46 + i * 62, y: ty + 18, t: 999 });
          text(ctx, 'X' + (g.prizes[pz.k] || 0), 46 + i * 62, ty + 28, '#ffffff', 1, 'center');
        });
        const isBoss = g.mx === MAPW - 1 && g.my === 0;
        text(ctx, isBoss ? 'NEXT: ' + BOSSNAME[S.boss] : 'NEXT ROOM: GET READY', CX, ty + 46, (frame & 8) ? '#ffffff' : '#ff2a8a', 1, 'center');
        drawHost(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        drawHUD(ctx);
        if (g.phase === 'map') { drawMap(ctx); return; }
        drawArena(ctx);
        for (const it of g.items) drawItem(ctx, it);
        for (const e of g.en) if (e.type === 'mine') drawEnemy(ctx, e);
        for (const e of g.en) if (e.type !== 'mine') drawEnemy(ctx, e);
        drawBoss(ctx);
        drawPlayer(ctx);
        for (const s of g.shots) {
          if (s.rocket) { ctx.fillStyle = '#ff9020'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3); ctx.fillStyle = '#ffff80'; ctx.fillRect(Math.round(s.x - s.vx), Math.round(s.y - s.vy), 1, 1); }
          else { ctx.fillStyle = '#ffffa0'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2); ctx.fillStyle = '#ff9020'; ctx.fillRect(Math.round(s.x - s.vx * 0.5), Math.round(s.y - s.vy * 0.5), 1, 1); }
        }
        for (const s of g.eshots) { ctx.fillStyle = (frame & 2) ? '#ff4040' : '#ffffff'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3); }
        for (const f of g.fx) {
          const r = f.r * Math.min(1, f.t / 6);
          ctx.fillStyle = f.t < 6 ? '#ffffff' : f.t < 12 ? '#ffd200' : '#ff6020';
          ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.283); ctx.fill();
        }
        for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }
        for (const q of g.pops) text(ctx, q.txt, q.x, q.y, (frame & 4) ? '#ffffff' : '#ffd200', 1, 'center');
        if (g.roomT < 90 && g.phase === 'play') text(ctx, g.isBoss ? BOSSNAME[STAGES[g.stage].boss] : 'ROOM ' + (g.roomsDone + 1), CX, CY - 40, '#ffffff', 2, 'center');
        if (g.phase === 'stageclear') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 80, W - 80, 80);
          text(ctx, 'STAGE COMPLETE!', CX, 92, CYC[(frame >> 2) & 7], 2, 'center');
          text(ctx, 'BOSS BONUS ' + (50000 + g.loop * 25000), CX, 118, '#ffffff', 1, 'center');
          text(ctx, 'THE SHOW MUST GO ON...', CX, 136, '#30ff30', 1, 'center');
          for (let i = 0; i < 20; i++) { ctx.fillStyle = CYC[i & 7]; ctx.fillRect((i * 53 + frame * (1 + (i % 3))) % W, (i * 37 + frame * 2) % H, 2, 3); }
        }
        drawHost(ctx);
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(CX - 60, CY - 12, 120, 24);
          text(ctx, 'GAME OVER', CX, CY - 7, '#ff3030', 2, 'center');
        }
      }
      function renderTitle(ctx) {
        const page = Math.floor(titleT / 420) % 3;
        // stage lights frame
        for (let i = 0; i < 28; i++) {
          ctx.fillStyle = ((i + (frame >> 3)) % 3 === 0) ? '#ffd200' : '#602040';
          ctx.fillRect(4 + i * 12, 4, 6, 4); ctx.fillRect(4 + i * 12, H - 8, 6, 4);
        }
        if (page === 0) {
          const t = 'SMASH TV';
          for (let i = 0; i < t.length; i++) text(ctx, t[i], 60 + i * 28, 36 + Math.round(Math.sin(frame * 0.1 + i * 0.7) * 3), i < 5 ? '#ffd200' : '#ff2a8a', 4);
          ctx.fillStyle = '#ff2a8a'; ctx.fillRect(60, 70, 216, 2);
          text(ctx, 'THE DEADLIEST GAME SHOW', CX, 82, '#ffffff', 1, 'center');
          text(ctx, 'ON TELEVISION', CX, 92, '#ffffff', 1, 'center');
          text(ctx, 'ONE CONTESTANT. ENDLESS ENEMIES.', CX, 112, '#30ff30', 1, 'center');
          text(ctx, 'FABULOUS PRIZES!', CX, 122, '#30ff30', 1, 'center');
          drawSpr(ctx, HERO[(frame >> 3) & 1], CX, 150, {});
          for (let i = 0; i < 6; i++) drawSpr(ctx, GRUNT[(frame >> 3) & 1], CX - 70 + i * 28, 176, { flip: i >= 3 });
        } else if (page === 1) {
          text(ctx, 'TONIGHT\'S PRIZES', CX, 22, '#ffd200', 2, 'center');
          PRIZES.forEach((pz, i) => { const y = 50 + i * 16; drawItem(ctx, { kind: 'prize', pz, x: 90, y, t: 999 }); text(ctx, pz.name, 110, y - 3, '#ffffff', 1); text(ctx, String(pz.pts), 250, y - 3, '#ffd200', 1, 'right'); });
          POWERS.forEach((pw, i) => { const x = 40 + i * 60, y = 140; drawItem(ctx, { kind: 'power', pw, x, y, t: 999 }); });
          text(ctx, 'SPREAD  ROCKET  SHIELD  BLADES   FAST', CX, 152, '#30ff30', 1, 'center');
          text(ctx, 'GRUNT 100  ORB 50  TANK 500  MINE 25', CX, 172, '#aaaaaa', 1, 'center');
          text(ctx, 'ROOM BONUS 1000   BOSS 50000', CX, 184, '#aaaaaa', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', CX, 40, '#ffd200', 2, 'center');
          text(ctx, String(hi), CX, 66, CYC[(frame >> 2) & 7], 3, 'center');
          text(ctx, 'ARROWS MOVE', CX, 110, '#30ff30', 1, 'center');
          text(ctx, 'WASD FIRES IN 8 DIRECTIONS', CX, 122, '#30ff30', 1, 'center');
          text(ctx, 'SPACE FIRES WHERE YOU MOVE', CX, 134, '#30ff30', 1, 'center');
          text(ctx, 'CLEAR EACH ROOM, PICK AN EXIT,', CX, 154, '#ffffff', 1, 'center');
          text(ctx, 'REACH THE BOSS STUDIO', CX, 164, '#ffffff', 1, 'center');
        }
        const blink = (frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', CX, 206, '#ffffff', 1, 'center'); }
        else if (api.credits === 0) { if (blink) text(ctx, 'INSERT COIN', CX, 206, '#ffffff', 1, 'center'); }
        else text(ctx, 'PUSH START', CX, 206, blink ? '#ffffff' : '#888888', 1, 'center');
        text(ctx, credStr(), 10, 220, '#888888', 1);
        text(ctx, '\u00a9 1990 WILLIAMS', W - 10, 220, '#888888', 1, 'right');
      }
      return { update, render, destroy() { }, debug: () => ({ g, mode }) };
    }
  });
})();
