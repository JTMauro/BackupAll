// Stargate (Defender II) (Williams, 1981) - from-scratch raster recreation for the Game Room.
// Defend the humanoids, fly through the Stargate to reach an abduction, cloak with Inviso, and survive
// the Yllabian Dogfight and the Firebomber Showdown.
(function () {
  'use strict';
  const W = 292, H = 240, WW = 2560, TOP = 36, GROUND = 236;

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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        ctx.fillStyle = typeof col === 'function' ? col(r, i) : col;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }

  // ---------- pixel art ----------
  const PAL = {
    W: '#ffffff', w: '#9090c0', R: '#ff2020', r: '#a00000', Y: '#ffff40', G: '#20ff20', g: '#00a000', M: '#ff30ff', P: '#a040ff',
    B: '#4060ff', b: '#2020a0', C: '#40ffff', O: '#ff9020', K: '#200018', k: '#000000'
  };
  const SPR = {
    ship: ['.W..............', '.WW.............', '.WWWW..CC.......', 'WWWWWWWWWWWWW...', 'RRWWWWWWWWWWWWWW', 'RRRRWWWWWwwww...', '..RRRRRR........'],
    lander0: ['...GGG...', '..GYGYG..', '.GGGGGGG.', 'GgGgGgGgG', '.YYYYYYY.', '.Y..Y..Y.', 'Y...Y...Y'],
    lander1: ['...GGG...', '..GYGYG..', '.GGGGGGG.', 'gGgGgGgGg', '.YYYYYYY.', '.Y..Y..Y.', '.Y..Y..Y.'],
    mutant0: ['...MGM...', '..GMMMG..', '.MGMGMGM.', 'GMMGMGMMG', '.GMMMMMG.', '.M..G..M.', 'G...M...G'],
    mutant1: ['...GMG...', '..MGGGM..', '.GMGMGMG.', 'MGGMGMGGM', '.MGGGGGM.', '.G..M..G.', '.M..G..M.'],
    bomber0: ['BBBBBBB', 'BOBOBOB', 'B.O.O.B', 'BOBOBOB', 'B.O.O.B', 'BOBOBOB', 'BBBBBBB'],
    bomber1: ['BBBBBBB', 'B.O.O.B', 'BOBOBOB', 'B.O.O.B', 'BOBOBOB', 'B.O.O.B', 'BBBBBBB'],
    pod0: ['P..P..P', '.P.R.P.', '..RRR..', 'PRRWRRP', '..RRR..', '.P.R.P.', 'P..P..P'],
    pod1: ['...P...', '.P.R.P.', '..RRR..', 'PRRYRRP', '..RRR..', '.P.R.P.', '...P...'],
    swarmer0: ['..R..', '.RRR.', 'RRYRR', '.R.R.'],
    swarmer1: ['..R..', '.RYR.', 'RRRRR', 'R...R'],
    baiter0: ['...GGGGGGG...', '.GGGGGGGGGGG.', 'GYGGYGGGYGGYG', '.GGGGGGGGGGG.', '...GGGGGGG...'],
    baiter1: ['...GGGGGGG...', '.GGGGGGGGGGG.', 'GGYGGGYGGGYGG', '.GGGGGGGGGGG.', '...GGGGGGG...'],
    guppy0: ['..BB...B', '.BBBB.BB', 'BWBBBBBB', 'BBBBBBB.', '.BBBB.BB', '..BB...B'],
    guppy1: ['..BB....', '.BBBB..B', 'BWBBBBBB', 'BBBBBBBB', '.BBBB..B', '..BB....'],
    dynamo0: ['..C..C..', '.CYCCYC.', 'CYWYYWYC', '.CYCCYC.', '..C..C..'],
    dynamo1: ['.C....C.', 'CYC..CYC', '.YWYYWY.', 'CYC..CYC', '.C....C.'],
    hum0: ['Y.Y', '.W.', 'Y.Y'],
    hum1: ['.Y.', 'YWY', '.Y.'],
    fire0: ['...R...', '..RYR..', '.RYOYR.', 'RYOWOYR', '.RYOYR.', '..RYR..', '...R...'],
    fire1: ['R..R..R', '.RYOYR.', '.YOWOY.', 'ROWWWOR', '.YOWOY.', '.RYOYR.', 'R..R..R'],
    phred0: ['..PPPPP..', '.PPPPPPP.', 'PPWkPPWkP', 'PPPPPPPPP', 'PkkkkkkkP', 'PkWkWkWkP', 'PkkkkkkkP', '.PPPPPPP.', '..PPPPP..'],
    phred1: ['..PPPPP..', '.PPPPPPP.', 'PPWkPPWkP', 'PPPPPPPPP', 'PPPPPPPPP', 'PkWkWkWkP', 'PPPPPPPPP', '.PPPPPPP.', '..PPPPP..'],
    bigred0: ['..RRRRR..', '.RRRRRRR.', 'RRWkRRWkR', 'RRRRRRRRR', 'RkkkkkkkR', 'RkWkWkWkR', 'RkkkkkkkR', '.RRRRRRR.', '..RRRRR..'],
    bigred1: ['..RRRRR..', '.RRRRRRR.', 'RRWkRRWkR', 'RRRRRRRRR', 'RRRRRRRRR', 'RkWkWkWkR', 'RRRRRRRRR', '.RRRRRRR.', '..RRRRR..'],
    munchie0: ['G.G.G', '.GGG.', 'GGWGG', '.GGG.'],
    munchie1: ['.G.G.', 'GGGGG', '.GWG.', 'G.G.G'],
    human0: ['.Y.', 'MYM', 'MMM', 'M.M', '.M.', 'G.G', 'G.G'],
    human1: ['.Y.', 'MYM', 'MMM', 'M.M', '.M.', '.G.', 'G.G'],
    shipIcon: ['WW......', 'WWWWWWW.', 'RRWWWWWW', '.RRR....'],
    bombIcon: ['.RR.', 'RRRR', '.RR.']
  };
  function makeSprite(rows, flip) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), px = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][flip ? w - 1 - i : i];
      if (ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); px.push([i - w / 2, j - h / 2, PAL[ch]]); }
    }
    return { c, w, h, px };
  }

  ArcadeRegistry.register({
    id: 'stargate', title: 'Stargate (Defender II)', year: 1981, maker: 'Williams',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up/Down: climb \u00b7 Left/Right: thrust/reverse \u00b7 Space: fire \u00b7 X: smart bomb \u00b7 Z (or Enter in play): inviso',
    marquee: { bg: '#000', fg: '#40ffff', accent: '#ff30ff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => (Math.random() * n) | 0;
      const S = {};
      for (const k in SPR) { S[k] = makeSprite(SPR[k], false); S[k + 'L'] = makeSprite(SPR[k], true); }
      const wrapX = x => ((x % WW) + WW) % WW;
      const dwx = (a, b) => { let d = (a - b) % WW; if (d > WW / 2) d -= WW; else if (d < -WW / 2) d += WW; return d; };

      // mountain range terrain
      const terr = new Int16Array(WW);
      (function () {
        let h = 224, x = 0;
        while (x < WW) {
          const peak = ri(3) === 0, len = peak ? 8 + ri(26) : 6 + ri(20), up = Math.random() < 0.5;
          for (let i = 0; i < len && x < WW; i++, x++) {
            if (peak) h += i < len / 2 ? -1 : 1; else h += up ? -0.5 : 0.5;
            h = Math.max(190, Math.min(234, h)); terr[x] = Math.round(h);
          }
        }
        const fix = 100, a = terr[WW - fix], b = terr[0];
        for (let i = 0; i < fix; i++) terr[WW - fix + i] = Math.round(a + (b - a) * i / fix);
      })();
      const stars = [];
      for (let i = 0; i < 46; i++) stars.push({ x: rnd(0, 640), y: rnd(TOP + 2, 186), c: ['#ff2020', '#ffff40', '#4060ff', '#ff30ff', '#ffffff', '#40ffff'][ri(6)] });
      const GATE = { x: 1280, y: 120 };

      let hi = api.getHiScore(25000);
      let state = 'attract', stT = 0, coinFlash = 0;
      let ship, camX = 0, score = 0, lives = 3, bombs = 3, inviso = 100, nextBonus = 10000, wave = 0, planet = true, special = '';
      let enemies = [], humans = [], lasers = [], bullets = [], mines = [], parts = [], popups = [];
      let toSpawn = 0, spawnT = 0, waveT = 0, baitT = 0, phredT = 0, flash = 0, deadT = 0, bonusT = 0, bonusShown = 0, gateCool = 0, warpT = 0, thrustSnd = 0;
      const PTS = { L: 150, M: 150, B: 250, P: 1000, S: 150, T: 200, Y: 200, D: 200, h: 100, F: 250, Q: 200, Z: 200, U: 50 };
      const NAME = { L: 'lander', M: 'mutant', B: 'bomber', P: 'pod', S: 'swarmer', T: 'baiter', Y: 'guppy', D: 'dynamo', h: 'hum', F: 'fire', Q: 'phred', Z: 'bigred', U: 'munchie' };
      const REQUIRED = { L: 1, M: 1, Y: 1, F: 1, D: 1 };

      function newShip() { ship = { x: wrapX(camX + 70), y: 110, vx: 0, face: 1, sx: 70, alive: true, carry: [], thrust: false, inv: false, safe: 60 }; }
      function startGame() {
        state = 'play'; stT = 0; score = 0; lives = 3; bombs = 3; inviso = 100; nextBonus = 10000; wave = 0; planet = true;
        camX = 0; newShip(); humans = []; parts = []; popups = []; resetHumans(); startWave();
      }
      function resetHumans() {
        humans = []; planet = true;
        for (let i = 0; i < 10; i++) humans.push({ x: rnd(0, WW), y: GROUND - 3, st: 'walk', vx: Math.random() < 0.5 ? -0.08 : 0.08, vy: 0, fy: 0 });
      }
      function farX() { return wrapX(ship.x + (Math.random() < 0.5 ? 1 : -1) * rnd(300, WW / 2)); }
      function startWave() {
        wave++;
        enemies = []; bullets = []; mines = []; lasers = [];
        waveT = 0; baitT = 0; phredT = 600; spawnT = 60;
        special = wave % 10 === 5 ? 'YLLABIAN DOGFIGHT' : wave % 10 === 0 ? 'FIREBOMBER SHOWDOWN' : '';
        if (special) {
          toSpawn = 0;
          if (wave % 10 === 5) { for (let g = 0; g < 4; g++) { const x = farX(), y = rnd(70, 170); for (let k = 0; k < 5; k++) spawn('Y', x + k * 12, y); } for (let k = 0; k < 3; k++) spawn('D', farX(), rnd(60, 180)); }
          else for (let k = 0; k < 14 + Math.min(10, wave / 2); k++) spawn('F', farX(), rnd(60, 180));
        } else {
          toSpawn = wave === 1 ? 15 : 20;
          const lv = Math.min(wave, 12);
          for (let i = 0; i < Math.min(5, 1 + lv); i++) spawn('B', farX(), rnd(70, 170));
          for (let i = 0; i < Math.min(4, Math.ceil(lv / 2)); i++) spawn('P', farX(), rnd(60, 180));
          if (wave >= 2) for (let i = 0; i < Math.min(6, wave); i++) spawn('F', farX(), rnd(60, 180));
          if (wave >= 3) { const x = farX(), y = rnd(70, 160); for (let k = 0; k < 4; k++) spawn('Y', x + k * 12, y); spawn('D', farX(), rnd(60, 180)); }
        }
        A.melody([[330, 0.08], [440, 0.08], [554, 0.08], [659, 0.08], [880, 0.22]], { type: 'square', vol: 0.08 });
      }
      function spawn(t, x, y) {
        const e = { t, x: wrapX(x), y, vx: 0, vy: 0, tt: ri(1000), appear: 0, fireT: rnd(60, 200) };
        if (t === 'L') { e.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(0.4, 0.9); e.st = 'seek'; e.target = null; e.baseY = y; e.appear = 40; }
        if (t === 'B') { e.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(0.5, 0.9); e.baseY = y; e.mineT = rnd(30, 90); }
        if (t === 'P') { e.vx = rnd(-0.4, 0.4); e.vy = rnd(-0.3, 0.3); }
        if (t === 'S' || t === 'h' || t === 'U') { e.vx = rnd(-2, 2); e.vy = rnd(-1, 1); }
        if (t === 'T') e.appear = 20;
        if (t === 'F') { e.vx = rnd(-2, 2); e.vy = rnd(-1.5, 1.5); e.turnT = rnd(20, 60); }
        if (t === 'Y') { e.vx = 0; e.baseY = y; e.ph = rnd(0, 6); }
        if (t === 'D') { e.vx = rnd(-0.6, 0.6); e.vy = rnd(-0.5, 0.5); e.humT = rnd(120, 240); }
        if (t === 'Q' || t === 'Z') { e.vx = 0; e.vy = 0; e.spitT = rnd(90, 180); e.appear = 30; }
        enemies.push(e);
        if (e.appear && Math.abs(dwx(e.x, camX + W / 2)) < 200) A.tone(300, 0.4, { type: 'triangle', vol: 0.05, slideTo: 1200 });
        return e;
      }
      function spr(e) {
        const f = (api.frame >> 3) & 1, n = NAME[e.t];
        let k = n + (e.t === 'M' || e.t === 'T' ? ((api.frame >> 2) & 1) : e.t === 'B' || e.t === 'P' ? ((api.frame >> 4) & 1) : (e.t === 'Q' || e.t === 'Z') ? ((e.tt >> 4) & 1) : f);
        if ((e.t === 'Y' || e.t === 'Q' || e.t === 'Z') && dwx(ship.x, e.x) > 0) k += 'L';
        return S[k];
      }
      function addScore(n) {
        score += n;
        while (score >= nextBonus) {
          nextBonus += 10000; lives = Math.min(lives + 1, 9); bombs = Math.min(bombs + 1, 9); inviso = Math.min(200, inviso + 50);
          A.melody([[880, 0.08], [1175, 0.08], [1760, 0.16]], { type: 'square', vol: 0.09 });
        }
        if (score > hi) hi = score;
      }
      function popup(x, y, s) { if (popups.length < 8) popups.push({ x, y, s: String(s), t: 60 }); }
      function explode(sp, x, y, mult) {
        for (const [px, py, c] of sp.px) {
          if (parts.length > 700) break;
          const a = Math.atan2(py + 0.01, px + 0.01), d = Math.hypot(px, py) * 0.25 + rnd(0.6, 1.6) * (mult || 1);
          parts.push({ x: x + px, y: y + py, vx: Math.cos(a) * d, vy: Math.sin(a) * d, c, t: rnd(26, 46) });
        }
      }
      function killEnemy(i, pts) {
        const e = enemies[i];
        if (e.target && e.target.claimed === e) e.target.claimed = null;
        explode(spr(e), e.x, e.y, 1.3);
        enemies.splice(i, 1);
        if (pts) addScore(PTS[e.t]);
        if (e.hold) { e.hold.st = 'fall'; e.hold.vy = 0; e.hold.fy = e.hold.y; e.hold = null; }
        if (e.t === 'P' && pts) { const n = 4 + ri(3); for (let k = 0; k < n; k++) spawn('S', e.x + rnd(-4, 4), e.y + rnd(-4, 4)); }
        A.noise(0.3, { freq: 2400, slideTo: 150, vol: 0.28 });
      }
      function killShip() {
        if (!ship.alive || ship.inv || ship.safe > 0) return;
        ship.alive = false; deadT = 170; flash = 6;
        for (let k = 0; k < 3; k++) explode(S.ship, ship.x, ship.y, 1.5 + k);
        for (let k = 0; k < 60; k++) { const a = Math.random() * 6.28, s = rnd(0.5, 3.5); parts.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: ['#ffffff', '#ff2020', '#ffff40', '#40ffff'][ri(4)], t: rnd(40, 80) }); }
        for (const h of ship.carry) { h.st = 'fall'; h.vy = 0; h.fy = h.y; }
        ship.carry = []; bullets = []; mines = [];
        A.noise(2.0, { freq: 3000, slideTo: 40, vol: 0.5 });
        A.tone(1200, 1.6, { type: 'sawtooth', vol: 0.1, slideTo: 50 });
      }
      function fireAt(e, sp, big) {
        if (bullets.length > 26 || !ship.alive) return;
        const dx = dwx(ship.x, e.x), dy = ship.y - e.y, t = Math.hypot(dx, dy) / sp, lx = dx + ship.vx * t * 0.6, d = Math.hypot(lx, dy) || 1;
        bullets.push({ x: e.x, y: e.y, vx: lx / d * sp, vy: dy / d * sp, t: big ? 160 : 200, big: !!big });
        A.tone(big ? 300 : 1400, 0.06, { type: big ? 'sawtooth' : 'square', vol: 0.03, slideTo: big ? 120 : 900 });
      }
      const screenX = x => dwx(x, camX + W / 2) + W / 2;
      const visibleX = (x, m) => { const s = screenX(x); return s > -m && s < W + m; };
      function planetDies() {
        planet = false; flash = 30;
        A.noise(2.5, { freq: 800, slideTo: 30, vol: 0.6 });
        for (let x = 0; x < WW; x += 6) if (visibleX(x, 0)) parts.push({ x, y: terr[x], vx: rnd(-1, 1), vy: rnd(-2.5, -0.2), c: '#ff9020', t: rnd(40, 90) });
        for (const e of enemies) if (e.t === 'L') { e.t = 'M'; e.hold = null; }
      }
      function smartBomb() {
        bombs--; flash = 5;
        A.noise(0.9, { freq: 5000, slideTo: 100, vol: 0.55 });
        for (let i = enemies.length - 1; i >= 0; i--) if (visibleX(enemies[i].x, 0) && enemies[i].appear <= 0) killEnemy(i, true);
        bullets = bullets.filter(b => !visibleX(b.x, 0));
      }
      function enterGate() {
        gateCool = 120; warpT = 30; flash = 4;
        A.tone(150, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 3000 }); A.noise(0.5, { freq: 3000, type: 'bandpass', vol: 0.15 });
        if (ship.carry.length >= 4 && !special) {
          // humanoid express: a carried load of four warps the ship past the rest of the wave
          for (const h of ship.carry) { h.st = 'walk'; h.y = GROUND - 3; }
          addScore(ship.carry.length * 1000); popup(ship.x, ship.y - 12, ship.carry.length * 1000);
          ship.carry = [];
          for (let i = enemies.length - 1; i >= 0; i--) if (REQUIRED[enemies[i].t]) enemies.splice(i, 1);
          toSpawn = 0; return;
        }
        const thief = enemies.find(e => e.t === 'L' && e.hold);
        if (thief) { ship.x = wrapX(thief.x - ship.face * 110); ship.y = Math.max(TOP + 10, thief.y); }
        else { ship.x = wrapX(ship.x + WW / 2); }
        ship.vx = 0; camX = wrapX(ship.x - ship.sx);
      }

      // ---------- update ----------
      function updShip() {
        if (!ship.alive) {
          if (--deadT <= 0) {
            const respawn = () => {
              const cx = camX; newShip(); ship.x = wrapX(cx + 70); camX = cx; inviso = Math.max(inviso, 30);
              enemies = enemies.filter(e => e.t !== 'S' && e.t !== 'T' && e.t !== 'U' && e.t !== 'h');
              for (const e of enemies) if (visibleX(e.x, 60)) e.x = farX();
            };
            if (lives <= 1) {
              lives = 0;
              const gameOver = () => { state = 'gameover'; stT = 0; api.setHiScore(score); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; bombs = Math.max(bombs, 3); inviso = Math.max(inviso, 100); respawn(); }, gameOver);
              else gameOver();
              return;
            }
            lives--; respawn();
          }
          return;
        }
        if (ship.safe > 0) ship.safe--;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight');
        if (api.pressed('ArrowLeft') && ship.face === 1) ship.face = -1;
        if (api.pressed('ArrowRight') && ship.face === -1) ship.face = 1;
        ship.thrust = (ship.face === 1 && R) || (ship.face === -1 && L);
        if (ship.thrust) { ship.vx += ship.face * 0.23; if (--thrustSnd <= 0) { thrustSnd = 6; A.noise(0.12, { freq: 500, vol: 0.1 }); } }
        else ship.vx *= 0.975;
        ship.vx = Math.max(-7, Math.min(7, ship.vx));
        if (api.key('ArrowUp')) ship.y -= 2.5;
        if (api.key('ArrowDown')) ship.y += 2.5;
        ship.y = Math.max(TOP + 5, Math.min(GROUND - 6, ship.y));
        ship.x = wrapX(ship.x + ship.vx);
        const target = ship.face === 1 ? 60 : W - 60;
        ship.sx += Math.max(-3.5, Math.min(3.5, target - ship.sx));
        camX = wrapX(ship.x - ship.sx);
        // inviso cloak
        const wantInv = api.key('KeyZ') || api.key('Enter') || api.key('ShiftLeft');
        ship.inv = wantInv && inviso > 0;
        if (ship.inv) { inviso = Math.max(0, inviso - 0.5); if (api.frame % 8 === 0) A.tone(2400, 0.06, { type: 'sine', vol: 0.03 }); }
        if (api.pressed('Space') && lasers.length < 4 && !ship.inv) {
          lasers.push({ x: wrapX(ship.x + ship.face * 9), y: Math.round(ship.y + 1), dir: ship.face, len: 6, t: 0, hue: ri(6) });
          A.tone(2600, 0.11, { type: 'sawtooth', vol: 0.06, slideTo: 450 });
        }
        if (api.pressed('KeyX') && bombs > 0) smartBomb();
        for (const h of ship.carry) { h.x = wrapX(ship.x - ship.face * 2); h.y = ship.y + 7; }
        if (ship.carry.length && ship.y >= GROUND - 14) {
          for (const h of ship.carry) { h.st = 'walk'; h.y = GROUND - 3; addScore(500); popup(h.x, h.y - 10, 500); }
          ship.carry = []; A.melody([[784, 0.07], [1047, 0.1]], { type: 'square', vol: 0.08 });
        }
        if (gateCool > 0) gateCool--;
        else if (Math.abs(dwx(ship.x, GATE.x)) < 9 && Math.abs(ship.y - GATE.y) < 12) enterGate();
      }
      function updLasers() {
        for (let i = lasers.length - 1; i >= 0; i--) {
          const l = lasers[i]; l.t++; l.len += 16;
          const hsx = screenX(l.x + l.dir * l.len);
          let hit = false;
          for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j]; if (e.appear > 0) continue;
            const sp = spr(e);
            if (Math.abs(e.y - l.y) > sp.h / 2 + 1) continue;
            const d = dwx(e.x, l.x) * l.dir;
            if (d > -sp.w / 2 && d < l.len + sp.w / 2) {
              if ((e.t === 'Q' || e.t === 'Z') && (e.hp = (e.hp || 0) + 1) < 2) { e.vx += l.dir * 2; hit = true; A.tone(200, 0.05, { type: 'square', vol: 0.1 }); break; }
              killEnemy(j, true); hit = true; break;
            }
          }
          if (hit || l.t > 22 || hsx < -40 || hsx > W + 40) lasers.splice(i, 1);
        }
      }
      function updEnemies() {
        const lv = Math.min(wave, 15);
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i]; e.tt++;
          if (e.appear > 0) { e.appear--; continue; }
          const dx = dwx(ship.x, e.x), vis = visibleX(e.x, 0);
          switch (e.t) {
            case 'L': {
              if (e.st === 'seek') {
                if (e.target && (e.target.st !== 'walk' || e.target.claimed !== e)) e.target = null;
                if (!e.target && planet && Math.random() < 0.008 + lv * 0.001) {
                  const free = humans.filter(h => h.st === 'walk' && !(h.claimed && enemies.includes(h.claimed)));
                  if (free.length) { e.target = free[ri(free.length)]; e.target.claimed = e; }
                }
                if (e.target) {
                  const tdx = dwx(e.target.x, e.x);
                  e.x = wrapX(e.x + Math.max(-1, Math.min(1, tdx)) * (0.9 + lv * 0.04));
                  if (Math.abs(tdx) < 2) e.st = 'down';
                  e.y += Math.sign(110 - e.y) * 0.3;
                } else { e.x = wrapX(e.x + e.vx); e.y = e.baseY + Math.sin(e.tt * 0.03) * 20; }
              } else if (e.st === 'down') {
                const h = e.target;
                if (!h || h.st !== 'walk') { e.st = 'seek'; e.target = null; break; }
                e.x = wrapX(e.x + Math.max(-0.5, Math.min(0.5, dwx(h.x, e.x))));
                e.y += 0.75;
                if (e.y >= h.y - 8) { h.st = 'held'; e.hold = h; e.st = 'up'; if (visibleX(e.x, 80)) A.tone(600, 0.5, { type: 'square', vol: 0.06, slideTo: 300 }); }
              } else {
                e.y -= 0.42 + lv * 0.02;
                if (e.hold) { e.hold.x = e.x; e.hold.y = e.y + 8; if (e.tt % 30 === 0) A.tone(e.tt % 60 ? 900 : 700, 0.1, { type: 'square', vol: visibleX(e.x, 120) ? 0.05 : 0.02 }); }
                if (e.y <= TOP + 8) {
                  if (e.hold) { const h = e.hold; h.st = 'dead'; explode(S.human0, h.x, h.y, 1); e.hold = null; }
                  e.t = 'M'; A.tone(200, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 1500 });
                }
              }
              if (vis && --e.fireT <= 0) { e.fireT = rnd(70, 160) - lv * 4; fireAt(e, 1.8 + lv * 0.1); }
              break;
            }
            case 'M':
              e.vx += Math.sign(dx) * 0.18; e.vx = Math.max(-3.3, Math.min(3.3, e.vx));
              e.x = wrapX(e.x + e.vx + rnd(-1, 1));
              e.y += Math.sign(ship.y - e.y + rnd(-30, 30)) * 1.2 + rnd(-1.2, 1.2);
              if (vis && --e.fireT <= 0) { e.fireT = rnd(50, 110); fireAt(e, 2.4); }
              break;
            case 'B':
              e.x = wrapX(e.x + e.vx); e.y = e.baseY + Math.sin(e.tt * 0.02) * 30;
              if (--e.mineT <= 0 && Math.abs(dx) < 500) { e.mineT = rnd(40, 80); if (mines.length < 30) mines.push({ x: e.x, y: e.y, t: 400 }); }
              break;
            case 'P':
              e.x = wrapX(e.x + e.vx); e.y += e.vy;
              if (e.y < TOP + 10 || e.y > 190) e.vy = -e.vy;
              break;
            case 'S': case 'h': case 'U': {
              const acc = e.t === 'U' ? 0.09 : 0.12, mx = e.t === 'U' ? 2.6 : 3.8;
              e.vx += Math.sign(dx) * acc; e.vx = Math.max(-mx, Math.min(mx, e.vx));
              e.x = wrapX(e.x + e.vx); e.y += Math.sin(e.tt * 0.08) * 1.5 + Math.sign(ship.y - e.y) * 0.5;
              if (e.t === 'S' && vis && --e.fireT <= 0 && Math.sign(e.vx) === Math.sign(dx)) { e.fireT = rnd(60, 140); fireAt(e, 2.6); }
              break;
            }
            case 'T': {
              const want = ship.vx + Math.sign(dx) * 1.8;
              e.vx += (want - e.vx) * 0.08; e.x = wrapX(e.x + e.vx);
              e.y += Math.sign(ship.y - 20 * Math.sin(e.tt * 0.05) - e.y) * 1.3;
              if (vis && --e.fireT <= 0) { e.fireT = rnd(30, 60); fireAt(e, 3); }
              break;
            }
            case 'Y': {
              // Yllabian space guppies: dart toward the ship in a sine-wave school
              const want = Math.sign(dx) * (Math.abs(dx) > 60 ? 2.6 + lv * 0.05 : 1.2);
              e.vx += (want - e.vx) * 0.05; e.x = wrapX(e.x + e.vx);
              e.baseY += Math.sign(ship.y - e.baseY) * 0.4;
              e.y = e.baseY + Math.sin(e.tt * 0.07 + e.ph) * 18;
              if (vis && --e.fireT <= 0) { e.fireT = rnd(60, 130); fireAt(e, 2.6); }
              break;
            }
            case 'D':
              e.x = wrapX(e.x + e.vx + Math.sign(dx) * 0.2); e.y += e.vy;
              if (e.y < TOP + 10 || e.y > 200) e.vy = -e.vy;
              if (vis && --e.humT <= 0) { e.humT = rnd(140, 260); if (enemies.length < 70) spawn('h', e.x, e.y); A.tone(500, 0.1, { type: 'triangle', vol: 0.05, slideTo: 900 }); }
              if (vis && --e.fireT <= 0) { e.fireT = rnd(80, 150); fireAt(e, 2.2); }
              break;
            case 'F': {
              // firebombers zig-zag in sharp straight lines and lob fireballs
              if (--e.turnT <= 0) {
                e.turnT = rnd(18, 50);
                const ang = [0.6, 2.5, 3.8, 5.7][ri(4)], sp = 2 + lv * 0.08;
                e.vx = Math.cos(ang) * sp + Math.sign(dx) * 0.6; e.vy = Math.sin(ang) * sp;
              }
              e.x = wrapX(e.x + e.vx); e.y += e.vy;
              if (e.y < TOP + 8 || e.y > 200) { e.vy = -e.vy; e.y = Math.max(TOP + 8, Math.min(200, e.y)); }
              if (vis && --e.fireT <= 0) { e.fireT = rnd(70, 150) - lv * 3; fireAt(e, 1.6 + lv * 0.05, true); }
              break;
            }
            case 'Q': case 'Z': {
              const sp = e.t === 'Z' ? 1.5 : 1.1;
              e.vx += Math.sign(dx) * 0.04; e.vx = Math.max(-sp - ship.vx * 0, Math.min(sp, e.vx)) * 0.995;
              if (Math.abs(dx) > 200) e.vx = Math.sign(dx) * (Math.abs(ship.vx) + 0.5);
              e.x = wrapX(e.x + e.vx); e.y += Math.sign(ship.y - e.y) * 0.5;
              if (vis && --e.spitT <= 0) { e.spitT = rnd(100, 200) - lv * 4; if (enemies.length < 70) { spawn('U', e.x, e.y); A.tone(160, 0.15, { type: 'square', vol: 0.06, slideTo: 80 }); } }
              break;
            }
          }
          e.y = Math.max(TOP + 4, Math.min(GROUND - 6, e.y));
          if (ship.alive && ship.safe <= 0 && e.appear <= 0) {
            const sp = spr(e);
            if (Math.abs(dwx(e.x, ship.x)) < sp.w / 2 + 7 && Math.abs(e.y - ship.y) < sp.h / 2 + 3) {
              if (ship.inv) killEnemy(i, true); else { killEnemy(i, true); killShip(); }
            }
          }
        }
      }
      function updHumans() {
        for (let i = humans.length - 1; i >= 0; i--) {
          const h = humans[i];
          if (h.st === 'walk') { h.x = wrapX(h.x + h.vx); h.y = GROUND - 3; if (Math.random() < 0.004) h.vx = -h.vx; }
          else if (h.st === 'fall') {
            h.vy = Math.min(2.2, h.vy + 0.035); h.y += h.vy;
            if (ship.alive && Math.abs(dwx(h.x, ship.x)) < 9 && Math.abs(h.y - ship.y) < 9) {
              h.st = 'carried'; ship.carry.push(h); addScore(500); popup(h.x, h.y - 10, 500);
              A.melody([[523, 0.06], [659, 0.06], [784, 0.1]], { type: 'square', vol: 0.08 });
            } else if (h.y >= GROUND - 3) {
              h.y = GROUND - 3;
              if (h.y - h.fy > 80) { h.st = 'dead'; explode(S.human0, h.x, h.y, 1); A.noise(0.4, { freq: 900, vol: 0.2 }); }
              else { h.st = 'walk'; addScore(250); popup(h.x, h.y - 10, 250); }
            }
          }
          if (h.st === 'dead') { humans.splice(i, 1); if (humans.length === 0 && planet) planetDies(); }
        }
      }
      function updMisc() {
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]; b.x = wrapX(b.x + b.vx); b.y += b.vy;
          if (ship.alive && !ship.inv && ship.safe <= 0 && Math.abs(dwx(b.x, ship.x)) < (b.big ? 8 : 7) && Math.abs(b.y - ship.y) < (b.big ? 5 : 3.5)) { bullets.splice(i, 1); killShip(); break; }
          if (--b.t <= 0 || b.y < TOP || b.y > GROUND || !visibleX(b.x, 40)) bullets.splice(i, 1);
        }
        for (let i = mines.length - 1; i >= 0; i--) {
          const m = mines[i];
          if (ship.alive && !ship.inv && ship.safe <= 0 && Math.abs(dwx(m.x, ship.x)) < 7 && Math.abs(m.y - ship.y) < 4) { mines.splice(i, 1); killShip(); break; }
          if (--m.t <= 0) mines.splice(i, 1);
        }
        for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x = wrapX(p.x + p.vx); p.y += p.vy; if (--p.t <= 0) parts.splice(i, 1); }
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }

      function update() {
        stT++; if (flash > 0) flash--; if (coinFlash > 0) coinFlash--; if (warpT > 0) warpT--;
        if (state === 'attract') {
          camX = wrapX(camX + 1.6);
          for (let i = parts.length - 1; i >= 0; i--) if (--parts[i].t <= 0) parts.splice(i, 1);
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; A.tone(70, 0.28, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (state === 'gameover') {
          updMisc();
          if (stT > 240 || (stT > 60 && api.anyPressed('Enter', 'Space'))) { state = 'attract'; stT = 0; enemies = []; parts = []; }
          return;
        }
        if (state === 'bonus') {
          updMisc();
          if (--bonusT <= 0) {
            if (special) resetHumans();
            startWave(); state = 'play';
          } else if (bonusT < 150 && bonusShown < humans.length && bonusT % 8 === 0) {
            bonusShown++; addScore(Math.min(5, wave) * 100); A.tone(1200 + bonusShown * 60, 0.05, { type: 'square', vol: 0.07 });
          }
          return;
        }
        waveT++;
        updShip();
        if (state !== 'play') return;
        updLasers(); updEnemies(); updHumans(); updMisc();
        if (toSpawn > 0 && (--spawnT <= 0 || enemies.filter(e => e.t === 'L' || e.t === 'M').length < 2)) {
          const n = Math.min(5, toSpawn); toSpawn -= n; spawnT = 840;
          for (let k = 0; k < n; k++) spawn(planet ? 'L' : 'M', farX(), rnd(50, 110));
        }
        if (!special && wave >= 4 && --phredT <= 0) {
          phredT = rnd(700, 1100) - Math.min(400, wave * 30);
          if (enemies.filter(e => e.t === 'Q' || e.t === 'Z').length < 3) spawn(Math.random() < 0.5 ? 'Q' : 'Z', farX(), rnd(70, 170));
        }
        if (waveT > 2400 && ++baitT > 480 && enemies.filter(e => e.t === 'T').length < 2) {
          baitT = 0; const b = spawn('T', wrapX(ship.x + (Math.random() < 0.5 ? 150 : -150)), rnd(60, 160)); b.vx = ship.vx;
        }
        if (toSpawn === 0 && !enemies.some(e => REQUIRED[e.t]) && ship.alive) {
          state = 'bonus'; bonusT = 240; bonusShown = 0; bullets = []; mines = [];
          A.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]], { type: 'square', vol: 0.09 });
        }
      }

      // ---------- render ----------
      function blit(ctx, s, x, y) { ctx.drawImage(s.c, Math.round(x - s.w / 2), Math.round(y - s.h / 2)); }
      function drawWorld(ctx) {
        for (const s of stars) {
          const sx = ((s.x - camX * 0.35) % 640 + 640) % 640;
          if (sx < W && ((api.frame + s.x) & 63) > 4) { ctx.fillStyle = s.c; ctx.fillRect(sx | 0, s.y | 0, 1, 1); }
        }
        if (planet) {
          ctx.fillStyle = '#a05a14';
          let prev = null;
          for (let sx = 0; sx < W; sx++) {
            const h = terr[wrapX(Math.floor(camX) + sx)];
            if (prev !== null && Math.abs(h - prev) > 1) ctx.fillRect(sx, Math.min(h, prev), 1, Math.abs(h - prev));
            else ctx.fillRect(sx, h, 1, 1);
            prev = h;
          }
        }
        // the stargate
        const gx = screenX(GATE.x);
        if (gx > -20 && gx < W + 20) {
          const cols = ['#ff30ff', '#40ffff', '#ffff40', '#ffffff', '#4060ff'];
          for (let k = 0; k < 4; k++) {
            ctx.fillStyle = cols[(k + (api.frame >> 2)) % 5];
            const w = 16 - k * 4, h = 26 - k * 6, x0 = Math.round(gx - w / 2), y0 = Math.round(GATE.y - h / 2);
            ctx.fillRect(x0, y0, w, 1); ctx.fillRect(x0, y0 + h - 1, w, 1); ctx.fillRect(x0, y0, 1, h); ctx.fillRect(x0 + w - 1, y0, 1, h);
          }
        }
        for (const h of humans) {
          const sx = screenX(h.x); if (sx < -6 || sx > W + 6) continue;
          blit(ctx, S['human' + ((h.st === 'walk' && (api.frame >> 4) & 1) ? 1 : 0)], sx, h.y - 1);
        }
        for (const m of mines) {
          const sx = screenX(m.x); if (sx < -4 || sx > W + 4) continue;
          ctx.fillStyle = (api.frame & 4) ? '#ffff40' : '#ff30ff';
          ctx.fillRect(Math.round(sx) - 1, Math.round(m.y), 3, 1); ctx.fillRect(Math.round(sx), Math.round(m.y) - 1, 1, 3);
        }
        for (const e of enemies) {
          const sx = screenX(e.x); if (sx < -16 || sx > W + 16) continue;
          const sp = spr(e);
          if (e.appear > 0) {
            const k = 1 + e.appear * 0.18;
            for (const [px, py, c] of sp.px) { ctx.fillStyle = c; ctx.fillRect(Math.round(sx + px * k), Math.round(e.y + py * k), 1, 1); }
          } else blit(ctx, sp, sx, e.y);
        }
        for (const b of bullets) {
          const sx = screenX(b.x);
          if (b.big) {
            ctx.fillStyle = (api.frame & 2) ? '#ff9020' : '#ff2020'; ctx.fillRect(Math.round(sx) - 2, Math.round(b.y) - 2, 4, 4);
            ctx.fillStyle = '#ffff40'; ctx.fillRect(Math.round(sx) - 1, Math.round(b.y) - 1, 2, 2);
          } else { ctx.fillStyle = ['#ffffff', '#ffff40', '#ff30ff', '#40ffff'][(api.frame >> 1) & 3]; ctx.fillRect(Math.round(sx), Math.round(b.y), 2, 2); }
        }
        const LC = ['#ffffff', '#ff30ff', '#40ffff', '#ffff40', '#ff2020', '#20ff20'];
        for (const l of lasers) {
          const sx = screenX(l.x);
          for (let k = 0; k < l.len; k += 2) {
            const frac = k / l.len;
            if (frac < 0.4 && (((k >> 2) + l.t) % 4) < (l.t > 12 ? 3 : 1)) continue;
            ctx.fillStyle = frac > 0.9 ? '#ffffff' : LC[(l.hue + ((k >> 4) % 6)) % 6];
            ctx.fillRect(Math.round(sx + l.dir * k), l.y, 2, 1);
          }
        }
        if ((state === 'play' || state === 'bonus') && ship.alive) {
          const sx = screenX(ship.x), sp = ship.face === 1 ? S.ship : S.shipL;
          if (ship.inv) {
            // inviso: a shimmering outline only
            ctx.fillStyle = (api.frame & 2) ? '#4060ff' : '#40ffff';
            for (const [px, py] of sp.px) if (((px + py + api.frame) & 3) === 0) ctx.fillRect(Math.round(sx + px), Math.round(ship.y + py), 1, 1);
          } else if (!(ship.safe > 0 && (ship.safe & 4))) {
            blit(ctx, sp, sx, ship.y);
            if (ship.thrust || Math.abs(ship.vx) > 0.5) {
              const fl = ship.thrust ? 3 + ri(4) : 1 + ri(2), bx = Math.round(sx - ship.face * 9), cols = ['#ffff40', '#ff9020', '#ff2020'];
              for (let k = 0; k < fl; k++) { ctx.fillStyle = cols[Math.min(2, k >> 1)]; ctx.fillRect(bx - ship.face * k, Math.round(ship.y) + (k & 1), 1, 1); }
            }
          }
        }
        for (const p of parts) {
          const sx = screenX(p.x); if (sx < 0 || sx > W) continue;
          ctx.fillStyle = p.c; ctx.fillRect(Math.round(sx), Math.round(p.y), p.t > 20 ? 2 : 1, 1);
        }
        for (const p of popups) text(ctx, p.s, screenX(p.x), p.y | 0, '#ffffff', 1, 'center');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        ctx.fillStyle = '#ff30ff';
        ctx.fillRect(0, TOP - 2, W, 1); ctx.fillRect(84, 0, 1, TOP - 2); ctx.fillRect(208, 0, 1, TOP - 2); ctx.fillRect(84, 0, 125, 1);
        const mapX = x => 146 + dwx(x, camX + W / 2) / 20.6, mapY = y => 2 + (y - TOP) / (GROUND - TOP) * 30;
        if (planet) {
          ctx.fillStyle = '#a05a14';
          for (let i = 0; i < 123; i++) { const wx = wrapX(Math.floor(camX + W / 2 + (i - 61) * 20.6)); ctx.fillRect(85 + i, Math.round(mapY(terr[wx])), 1, 1); }
        }
        const dot = (x, y, c, w) => { const sx = mapX(x); if (sx < 85 || sx > 206) return; ctx.fillStyle = c; ctx.fillRect(Math.round(sx), Math.round(mapY(y)), w || 2, 2); };
        dot(GATE.x, GATE.y, (api.frame & 8) ? '#ffffff' : '#40ffff', 2);
        for (const h of humans) dot(h.x, h.y, '#ff30ff', 1);
        const EC = { L: '#20ff20', M: '#ff30ff', B: '#4060ff', P: '#a040ff', S: '#ff2020', T: '#20ff20', Y: '#4060ff', D: '#40ffff', h: '#ffff40', F: '#ff9020', Q: '#a040ff', Z: '#ff2020', U: '#20ff20' };
        for (const e of enemies) dot(e.x, e.y, EC[e.t]);
        if (state !== 'attract' && ship.alive) dot(ship.x, ship.y, (api.frame & 8) ? '#ffffff' : '#ffff40', 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(136, 1, 21, 1); ctx.fillRect(136, 32, 21, 1);
        if (state !== 'attract') {
          for (let i = 0; i < Math.min(lives - (ship.alive ? 1 : 0), 5); i++) ctx.drawImage(S.shipIcon.c, 4 + i * 10, 3);
          for (let i = 0; i < Math.min(bombs, 5); i++) ctx.drawImage(S.bombIcon.c, 72, 3 + i * 4);
          text(ctx, String(score), 78, 14, '#40ffff', 1, 'right');
          // inviso energy
          ctx.fillStyle = '#202060'; ctx.fillRect(4, 26, 66, 3);
          ctx.fillStyle = ship.inv ? '#ffffff' : '#4060ff'; ctx.fillRect(4, 26, Math.round(66 * Math.min(1, inviso / 200)), 3);
        }
        text(ctx, 'HIGH', 284, 4, '#ff30ff', 1, 'right');
        text(ctx, String(hi), 284, 14, '#ffff40', 1, 'right');
        if (state !== 'attract') text(ctx, 'WAVE ' + wave, 284, 25, '#4060ff', 1, 'right');
      }
      function drawLogo(ctx, y) {
        const grad = r => ['#ffffff', '#c0ffff', '#40ffff', '#40c0ff', '#4060ff', '#a040ff', '#ff30ff'][r];
        text(ctx, 'STARGATE', W / 2 + 2, y + 2, '#401060', 4, 'center');
        text(ctx, 'STARGATE', W / 2, y, grad, 4, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = flash > 0 && (flash & 1) ? '#ffffff' : warpT > 0 ? ['#200040', '#002040', '#400020'][warpT % 3] : '#000';
        ctx.fillRect(0, 0, W, H);
        if (flash > 0 && (flash & 1)) return;
        if (state === 'attract') {
          drawWorld(ctx); drawHUD(ctx);
          const page = Math.floor(stT / 450) % 2;
          if (page === 0) {
            drawLogo(ctx, 54);
            text(ctx, 'DEFENDER II', W / 2, 92, '#ff30ff', 1, 'center');
            if (api.credits > 0) text(ctx, 'PUSH START', W / 2, 118, (api.frame & 32) ? '#ffffff' : '#40ffff', 1, 'center');
            else if (coinFlash > 0 ? (coinFlash & 8) : (stT % 60) < 40) text(ctx, 'INSERT COIN', W / 2, 118, coinFlash > 0 ? '#ff2020' : '#ffffff', 1, 'center');
            text(ctx, 'HIGH SCORE ' + hi, W / 2, 134, '#ffff40', 1, 'center');
            text(ctx, 'FLY INTO THE STARGATE TO', W / 2, 154, '#a040ff', 1, 'center');
            text(ctx, 'WARP TO A HUMANOID IN PERIL', W / 2, 164, '#a040ff', 1, 'center');
            text(ctx, 'SPACE FIRE  X SMART BOMB  Z INVISO', W / 2, 180, '#4060ff', 1, 'center');
            text(ctx, '\u00a9 1981 WILLIAMS', W / 2, 196, '#808080', 1, 'center');
          } else {
            text(ctx, 'SCORING', W / 2, 42, '#ff30ff', 1, 'center');
            const rows = [['lander0', 'LANDER', 150], ['mutant0', 'MUTANT', 150], ['bomber0', 'BOMBER', 250], ['pod0', 'POD', 1000], ['swarmer0', 'SWARMER', 150],
              ['guppy0', 'YLLABIAN', 200], ['fire0', 'FIREBOMBER', 250], ['phred0', 'PHRED', 200], ['bigred0', 'BIG RED', 200], ['munchie0', 'MUNCHIE', 50]];
            rows.forEach(([k, n, p], i) => {
              const col = i < 5 ? 0 : 1, x = col ? 200 : 60, y = 62 + (i % 5) * 26;
              blit(ctx, S[k], x - 30, y + 3);
              text(ctx, n, x - 16, y - 1, '#ffffff'); text(ctx, String(p), x - 16, y + 8, '#ffff40');
            });
          }
          text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 222, '#40ffff', 1, 'center');
          return;
        }
        drawWorld(ctx); drawHUD(ctx);
        if (state === 'bonus') {
          text(ctx, 'ATTACK WAVE ' + wave, W / 2, 66, '#ff30ff', 1, 'center');
          text(ctx, 'COMPLETED', W / 2, 78, '#ff30ff', 1, 'center');
          text(ctx, 'BONUS X ' + Math.min(5, wave) * 100, W / 2, 98, '#40ffff', 1, 'center');
          for (let i = 0; i < bonusShown; i++) ctx.drawImage(S.human0.c, W / 2 - humans.length * 3 + i * 6, 116);
        }
        if (state === 'play' && waveT < 150) {
          text(ctx, 'WAVE ' + wave, W / 2, 76, '#40ffff', 1, 'center');
          if (special) text(ctx, special, W / 2, 90, (api.frame & 8) ? '#ff30ff' : '#ffff40', 1, 'center');
        }
        if (state === 'gameover') text(ctx, 'GAME OVER', W / 2, 116, '#ff2020', 2, 'center');
      }
      return { update, render, destroy() { } };
    }
  });
})();
