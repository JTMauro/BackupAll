// Turbo (Sega, 1981) \u2014 from-scratch behind-the-car racing recreation for the MAME32 Game Room.
// City, country, coast, tunnel and snow sections; pass 30 cars per section to earn extended play.
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
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
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
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const easeIn = (a, b, p) => a + (b - a) * p * p;
  const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);

  const W = 224, H = 256;
  const SEGL = 200, RW = 720, CAMH = 900, DEPTH = 0.84, DRAW = 140, HZ = 94, VH = 176, VBOT = 210;
  const PZ = CAMH * DEPTH;              // distance from camera to the player's car
  const MAXSP = 200, LOMAX = 92, KMH = 1.3;
  const SECLEN = 2000;                  // segments per scenery section
  const THEMES = ['city', 'country', 'coast', 'tunnel', 'snow'];
  const TNAME = { city: 'CITY', country: 'COUNTRY', coast: 'COAST', tunnel: 'TUNNEL', snow: 'SNOW' };

  ArcadeRegistry.register({
    id: 'turbo', title: 'Turbo', year: 1981, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up/Space: gas \u00b7 Down: brake \u00b7 Left/Right: steer \u00b7 X: gear shift LO/HI \u00b7 Enter: start',
    marquee: { bg: '#100010', fg: '#ff3030', accent: '#ffd000' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'attract', at = 0, coinFlash = 0, frame = 0, lastCred = api.credits;
      let g = null;

      // ---------- sprites ----------
      const PCAR = spr([
        '...KKKKKKKKKKKKKKKKKKKKKKKKKK...',
        '...RRRRRRRRRRRRRRRRRRRRRRRRRR...',
        '...KK.......RRRRRRRR.......KK...',
        '...KK.....RRRRWWWWRRRR.....KK...',
        '.........RRRRWWYYWWRRRR.........',
        '.KKKK..RRRRRRRRRRRRRRRRRR..KKKK.',
        'KKKKKKRRRRRRRRRRRRRRRRRRRRKKKKKK',
        'KKKKKKRRRRRRRRRRRRRRRRRRRRKKKKKK',
        'KKKKKKRLLLRRRRRRRRRRRRLLLRKKKKKK',
        'KKKKKKRLLLRRRRKKKKRRRRLLLRKKKKKK',
        'KKKKKKRRRRRRRRKGGKRRRRRRRRKKKKKK',
        'KKKKKKRRRRRRRRRRRRRRRRRRRRKKKKKK',
        '.KKKK.DDDDDDDDDDDDDDDDDDDD.KKKK.',
        '.......DD..............DD.......'],
        { K: '#101010', R: '#e01818', W: '#80c0ff', Y: '#ffd000', L: '#ff6060', G: '#808080', D: '#901010' });
      function carSpr(body, dark) {
        return spr([
          '.....BBBBBBBBBBBBBB.....',
          '....BWWWWWWWWWWWWWWB....',
          '...BWWWWWWWWWWWWWWWWB...',
          '..BBBBBBBBBBBBBBBBBBBB..',
          '.BBBBBBBBBBBBBBBBBBBBBB.',
          'BBLLBBBBBBBBBBBBBBBBLLBB',
          'BBLLBBBBBSSSSSSBBBBBLLBB',
          'BBBBBBBBBSSSSSSBBBBBBBBB',
          'DDDDDDDDDDDDDDDDDDDDDDDD',
          'KKKK................KKKK',
          'KKKK................KKKK'],
          { B: body, W: '#203040', L: '#ff3030', S: '#e0e0e0', D: dark, K: '#101010' });
      }
      const CARS = [carSpr('#2050e0', '#103090'), carSpr('#f0d020', '#a08010'), carSpr('#20b040', '#107020'), carSpr('#f0f0f0', '#909090'), carSpr('#e070e0', '#904090'), carSpr('#ff8020', '#a04010')];
      const TRUCK = spr([
        'GGGGGGGGGGGGGGGGGGGGGGGG', 'GHHHHHHHHHHHHHHHHHHHHHHG', 'GHGGGGGGGGGGGGGGGGGGGGHG', 'GHG..................GHG', 'GHG..................GHG', 'GHG..................GHG',
        'GHGGGGGGGGGGGGGGGGGGGGHG', 'GHHHHHHHHHHHHHHHHHHHHHHG', 'GLLHHHHHHHHHHHHHHHHHHLLG', 'GGGGGGGGGGGGGGGGGGGGGGGG', 'KKKK................KKKK', 'KKKK................KKKK'],
        { G: '#806040', H: '#c09060', L: '#ff3030', K: '#101010' });
      const AMBU = [0, 1].map(f => spr([
        '......' + (f ? 'RRRR' : 'BBBB') + '..' + (f ? 'BBBB' : 'RRRR') + '......',
        'WWWWWWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWWWWWW', 'WWWWWWWWWRRRRWWWWWWWWW', 'WWWWWWWWWRRRRWWWWWWWWW', 'WWWWWWRRRRRRRRRRWWWWWW',
        'WWWWWWRRRRRRRRRRWWWWWW', 'WWWWWWWWWRRRRWWWWWWWWW', 'WWWWWWWWWRRRRWWWWWWWWW', 'RRRRRRRRRRRRRRRRRRRRRR', 'WLLWWWWWWWWWWWWWWWWLLW', 'GGGGGGGGGGGGGGGGGGGGGG',
        'KKKK..............KKKK', 'KKKK..............KKKK'], { W: '#f8f8f8', R: '#e02020', B: '#3060ff', L: '#ff8040', G: '#909090', K: '#101010' }));
      const TREE = spr([
        '....GGGG....', '..GGgGGGGG..', '.GGGGGGgGGG.', 'GGgGGGGGGGGG', 'GGGGGGGgGGGG', '.GGGGGGGGGG.', '..GGgGGGGG..', '....GTTG....', '.....TT.....', '.....TT.....', '.....TT.....'],
        { G: '#20a030', g: '#60e060', T: '#805020' });
      const PINE = spr([
        '.....W.....', '....WWG....', '...GWWGG...', '....GGW....', '..WWGGGWW..', '.GGGWWGGGG.', '...GGGGW...', '.WWGGGGGWW.', 'GGGGWWGGGGG', '.....T.....', '.....T.....'],
        { G: '#106030', W: '#ffffff', T: '#604020' });
      const PALM = spr([
        '.GG....GG..', 'GGGG..GGGG.', '...GGGG..GG', '.GG.TGG.G..', 'G...T..G...', '.....T.....', '.....T.....', '....T......', '....T......', '....T......', '...TT......'],
        { G: '#20c040', T: '#a07040' });
      const LAMP = spr(['YYY.', '.KK.', '..K.', '..K.', '..K.', '..K.', '..K.', '..K.', '..K.', '..K.', '..K.', '..K.', '.KKK'], { Y: '#ffffa0', K: '#808080' });
      const SIGN = spr(['WWWWWWWWWW', 'WRRRRRRRRW', 'WRWWRWWRRW', 'WRRRRRRRRW', 'WWWWWWWWWW', '....KK....', '....KK....', '....KK....'], { W: '#ffffff', R: '#2060e0', K: '#808080' });
      const BARN = spr([
        '....RRRRRRRR....', '...RRRRRRRRRR...', '..RRRWWWWWWRRR..', '.RRRRRRRRRRRRRR.', 'RRRRRRRRRRRRRRRR', 'RRWWWWRRRRWWWWRR', 'RRWRRWRRRRWRRWRR', 'RRWWWWRRRRWWWWRR', 'RRRRRRWWWWRRRRRR', 'RRRRRRWKKWRRRRRR', 'RRRRRRWKKWRRRRRR'],
        { R: '#b02020', W: '#f0f0f0', K: '#401010' });
      function building(seed, night) {
        const rows = [], w = 14, h = 26 + (seed % 3) * 6;
        for (let y = 0; y < h; y++) {
          let r = '';
          for (let x = 0; x < w; x++) {
            if (x === 0 || x === w - 1 || y === 0) r += 'E';
            else if (y % 3 === 1 && x % 3 === 1) r += ((x * 7 + y * 3 + seed) % 4 === 0) ? 'D' : 'L';
            else r += 'B';
          }
          rows.push(r);
        }
        const cols = [['#506080', '#304060'], ['#806050', '#604030'], ['#608060', '#405040']][seed % 3];
        return spr(rows, { B: cols[0], E: cols[1], L: night ? '#ffe070' : '#a0d0ff', D: '#202030' });
      }
      const BLD = [0, 1, 2, 3, 4, 5].map(i => building(i, true));
      const SPRITES = { tree: [TREE, 260], pine: [PINE, 280], palm: [PALM, 300], lamp: [LAMP, 70], sign: [SIGN, 220], barn: [BARN, 600], bld: [null, 700] };

      const S = {
        gear() { au.tone(180, 0.06, { type: 'square', vol: 0.1 }); au.tone(120, 0.06, { type: 'square', vol: 0.1, delay: 0.06 }); },
        crash() { au.noise(0.9, { vol: 0.3, freq: 2000, slideTo: 60 }); au.tone(200, 0.5, { type: 'sawtooth', vol: 0.1, slideTo: 40 }); },
        pass() { au.tone(1320, 0.04, { type: 'square', vol: 0.05 }); },
        passed() { au.tone(330, 0.08, { type: 'square', vol: 0.05, slideTo: 220 }); },
        siren(t) { au.tone(t ? 700 : 950, 0.22, { type: 'square', vol: 0.06 }); },
        skid() { au.noise(0.15, { vol: 0.06, freq: 3000, type: 'bandpass' }); },
        beep() { au.tone(880, 0.1, { type: 'square', vol: 0.09 }); },
        go() { au.tone(1760, 0.4, { type: 'square', vol: 0.1 }); },
        ext() { au.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .25]], { type: 'square', vol: 0.1 }); },
        over() { au.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.1 }); }
      };

      // ---------- track ----------
      const segs = [];
      function lastY() { return segs.length ? segs[segs.length - 1].y2 : 0; }
      function addSeg(curve, y, theme) {
        const n = segs.length;
        segs.push({ i: n, curve, y1: lastY(), y2: y, theme, sprites: [], dark: Math.floor(n / 3) % 2 });
      }
      function addRoad(enter, hold, leave, curve, dy, theme) {
        const y0 = lastY(), y1 = y0 + dy, tot = enter + hold + leave;
        for (let i = 0; i < enter; i++) addSeg(easeIn(0, curve, i / enter), easeInOut(y0, y1, i / tot), theme);
        for (let i = 0; i < hold; i++) addSeg(curve, easeInOut(y0, y1, (enter + i) / tot), theme);
        for (let i = 0; i < leave; i++) addSeg(easeInOut(curve, 0, i / leave), easeInOut(y0, y1, (enter + hold + i) / tot), theme);
      }
      function buildTrack() {
        segs.length = 0;
        THEMES.forEach((th, ti) => {
          const start = segs.length;
          addRoad(10, 40, 10, 0, -lastY(), th);
          while (segs.length - start < SECLEN - 280) {
            const r = Math.random();
            const len = Math.floor(rnd(20, 50));
            const hill = th === 'tunnel' ? 0 : (Math.random() < 0.4 ? rnd(-1400, 1400) : 0);
            const cmax = th === 'tunnel' ? 2 : th === 'coast' ? 5 : 4;
            if (r < 0.35) addRoad(len, len, len, 0, hill, th);
            else addRoad(len, Math.floor(len * rnd(1, 2)), len, (Math.random() < 0.5 ? -1 : 1) * rnd(1.5, cmax), hill, th);
          }
          addRoad(30, SECLEN - (segs.length - start) - 60, 30, 0, -lastY(), th);
          void ti;
        });
        // roadside scenery
        for (const s of segs) {
          const i = s.i, th = s.theme;
          if (th === 'city') {
            if (i % 6 === 0) { s.sprites.push({ k: 'bld', v: (i / 6) % 6, x: -1.9 - (i % 4) * 0.15 }); s.sprites.push({ k: 'bld', v: (i / 6 + 3) % 6, x: 1.9 + (i % 5) * 0.12 }); }
            if (i % 10 === 3) { s.sprites.push({ k: 'lamp', x: -1.25 }); s.sprites.push({ k: 'lamp', x: 1.25, flip: true }); }
          } else if (th === 'country') {
            if (i % 5 === 0) s.sprites.push({ k: 'tree', x: (i % 10 === 0 ? -1 : 1) * rnd(1.4, 2.6) });
            if (i % 37 === 0) s.sprites.push({ k: 'barn', x: (i % 74 === 0 ? -1 : 1) * rnd(2.4, 3.4) });
            if (i % 61 === 7) s.sprites.push({ k: 'sign', x: -1.4 });
          } else if (th === 'coast') {
            if (i % 7 === 0) s.sprites.push({ k: 'palm', x: -rnd(1.4, 2.4) });
            if (i % 23 === 0) s.sprites.push({ k: 'sign', x: -1.35 });
          } else if (th === 'snow') {
            if (i % 4 === 0) s.sprites.push({ k: 'pine', x: (i % 8 === 0 ? -1 : 1) * rnd(1.4, 2.8) });
          } else if (th === 'tunnel') {
            if (i % 8 === 0) s.sprites.push({ k: 'tlight', x: 0 });
          }
        }
        // section start banners
        for (let k = 0; k < THEMES.length; k++) segs[k * SECLEN + 2].sprites.push({ k: 'banner', x: 0 });
      }
      buildTrack();
      const TRACKLEN = segs.length * SEGL;
      const segAt = z => segs[((Math.floor(z / SEGL) % segs.length) + segs.length) % segs.length];

      // ---------- game ----------
      function newGame(demo) {
        g = {
          demo, score: 0, pos: 0, speed: 0, px: 0, pvx: 0, gear: 0, section: 0, passed: 0, time: 75, timeF: 0,
          cars: [], spawnZ: 0, crashT: 0, phase: demo ? 'race' : 'count', phaseT: demo ? 0 : 200, msg: '', msgT: 0,
          ambT: 900, ambWarn: 0, extended: 0, aiLane: 0, engineT: 0, smoke: []
        };
        for (let i = 0; i < 6; i++) spawnCar(g.pos + 1500 + i * 2400);
      }
      function spawnCar(z) {
        const truck = Math.random() < 0.15;
        g.cars.push({
          z, x: [-0.6, 0, 0.6][Math.floor(Math.random() * 3)], tx: 0, sp: rnd(55, 100) + Math.min(25, g.section * 5),
          im: truck ? TRUCK : CARS[Math.floor(Math.random() * CARS.length)], w: truck ? 0.48 : 0.4, side: 1, amb: false, laneT: rnd(100, 300)
        });
        const c = g.cars[g.cars.length - 1]; c.tx = c.x;
      }
      function spawnAmbulance() {
        const lane = [-0.6, 0, 0.6][Math.floor(Math.random() * 3)];
        g.cars.push({ z: g.pos + PZ - 4200, x: lane, tx: lane, sp: Math.max(g.speed + 30, 150), im: AMBU[0], w: 0.42, side: -1, amb: true, laneT: 1e9 });
        g.ambWarn = 160;
      }
      function sectionOf(pos) { return Math.floor(pos / (SECLEN * SEGL)); }
      function addScore(n) { if (g.demo) return; g.score += n; if (g.score > hi) hi = g.score; }
      function crash() {
        if (g.crashT > 0) return;
        g.crashT = 110; g.speed = Math.min(g.speed, 60); if (!g.demo) S.crash();
        if (!g.demo) g.msg = '';
      }
      function endGame() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300; S.over();
      }
      function failed() {
        if (g.demo) { g.time = 70; g.passed = 30; return; }
        g.phase = 'wait';
        if (api.offerContinue) {
          const cg = g;
          api.offerContinue(() => { if (g === cg) { g.time = 70; g.passed = 0; g.phase = 'race'; g.msg = 'CONTINUE'; g.msgT = 120; } }, () => { if (g === cg) endGame(); });
        } else endGame();
      }

      function aiControl() {
        // demo: hold the gas, run in HI gear, pick the lane with the most room ahead
        const pz = g.pos + PZ;
        const ahead = lane => { let d = 1e9; for (const c of g.cars) { const dz = c.z - pz; if (dz > -150 && dz < d && (Math.abs(c.x - lane) < 0.5 || Math.abs(c.tx - lane) < 0.5)) d = dz; } return d; };
        if (frame % 6 === 0) {
          let best = g.aiLane, bd = -1;
          for (const l of [-0.6, 0, 0.6]) { const d = Math.min(ahead(l), 4000) - Math.abs(l - g.px) * 500 + (l === g.aiLane ? 200 : 0); if (d > bd) { bd = d; best = l; } }
          g.aiLane = best;
        }
        const seg = segAt(pz);
        const target = g.aiLane + seg.curve * 0.03;
        const brake = ahead(g.px) < 400 + g.speed * 6 && g.speed > 90;
        return { gas: !brake, brake, left: g.px > target + 0.04, right: g.px < target - 0.04, shift: (g.gear === 0 && g.speed > 85) || (g.gear === 1 && g.speed < 40) };
      }
      function updRace() {
        const seg = segAt(g.pos + PZ);
        const theme = seg.theme;
        let inp;
        if (g.demo) inp = aiControl();
        else inp = { gas: api.key('ArrowUp') || api.key('Space'), brake: api.key('ArrowDown'), left: api.key('ArrowLeft'), right: api.key('ArrowRight'), shift: api.anyPressed('KeyX', 'KeyZ', 'ShiftLeft') };
        if (g.crashT > 0) {
          g.crashT--;
          g.speed = Math.max(0, g.speed - 3);
          if (g.crashT === 1) { g.px = clamp(g.px, -0.7, 0.7); g.pvx = 0; }
          inp = { gas: false, brake: false, left: false, right: false, shift: false };
          if (frame % 4 === 0) g.smoke.push({ x: W / 2 + rnd(-14, 14), y: 176, t: 30 });
        }
        if (inp.shift) { g.gear ^= 1; if (!g.demo) S.gear(); }
        // engine & speed
        const sp = g.speed;
        if (inp.gas) {
          if (g.gear === 0) g.speed = sp < LOMAX ? sp + 1.2 : sp - 0.3;
          else g.speed = sp < 70 ? sp + 0.35 : Math.min(MAXSP, sp + 0.75 * (1 - sp / (MAXSP + 40)));
        } else g.speed = Math.max(0, sp - 0.6);
        if (inp.brake) g.speed = Math.max(0, g.speed - 3.2);
        const off = Math.abs(g.px) > 1.05;
        if (off && g.speed > 70) { g.speed -= 2.5; if (frame % 6 === 0) S.skid(); }
        const pct = g.speed / MAXSP;
        // steering (snow: slippery)
        const grip = theme === 'snow' ? 0.12 : 1;
        const want = (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
        const steer = want * 0.03 * Math.min(1, 0.25 + pct);
        g.pvx += (steer - g.pvx) * grip;
        g.px += g.pvx;
        g.px -= seg.curve * pct * pct * 0.0085;
        g.px = clamp(g.px, -2.2, 2.2);
        if (theme === 'tunnel' && Math.abs(g.px) > 1.15) { g.px = Math.sign(g.px) * 1.15; if (g.speed > 60) { crash(); } }
        // move
        const prevSec = sectionOf(g.pos + PZ);
        g.pos += g.speed;
        addScore(g.speed * 0.02);
        const sec = sectionOf(g.pos + PZ);
        if (sec !== prevSec) {
          // section checkpoint
          if (g.passed >= 30 || g.demo) {
            g.section = sec; g.passed = 0; g.time += 65; g.extended++;
            g.msg = 'EXTENDED PLAY'; g.msgT = 180; addScore(1000 * Math.min(10, sec)); if (!g.demo) S.ext();
          } else { g.msg = 'PASS 30 CARS!'; g.msgT = 200; failed(); return; }
        }
        // roadside collisions
        if (Math.abs(g.px) > 1.1 && g.crashT === 0) {
          for (let k = 0; k < 2; k++) {
            const s2 = segAt(g.pos + PZ + k * SEGL);
            for (const sp2 of s2.sprites) {
              if (sp2.k === 'banner' || sp2.k === 'tlight') continue;
              const ww = (sp2.k === 'bld' ? 700 : SPRITES[sp2.k][1]) / RW;
              if (Math.abs(g.px - sp2.x) < ww * 0.5 + 0.18) { crash(); break; }
            }
          }
        }
        // traffic
        const pz = g.pos + PZ;
        for (const c of g.cars) {
          if (!c.amb && --c.laneT <= 0) { c.laneT = rnd(120, 360); c.tx = [-0.6, 0, 0.6][Math.floor(Math.random() * 3)]; }
          c.x += clamp(c.tx - c.x, -0.006, 0.006);
          if (c.amb && c.z < pz) c.sp = Math.max(g.speed + 30, 150);
          c.z += c.sp;
          const dz = c.z - pz;
          if (c.amb && frame % 8 === 0) c.im = AMBU[(frame >> 3) & 1];
          if (g.crashT === 0 && dz > -60 && dz < 160 && Math.abs(c.x - g.px) < (c.w + 0.36) / 2) {
            crash();
            if (!c.amb) { c.z = pz + 260; c.sp = Math.max(c.sp, 90); }
          }
          const side = dz > 0 ? 1 : -1;
          if (!c.amb && side !== c.side) {
            if (side < 0) { g.passed++; addScore(50); if (!g.demo) S.pass(); }
            else if (!g.demo) S.passed();
          }
          c.side = side;
        }
        g.cars = g.cars.filter(c => c.z > pz - (c.amb ? 6000 : 3500) && c.z < pz + 60000);
        // keep traffic coming from ahead
        const ahead = g.cars.filter(c => !c.amb && c.z > pz).length;
        if (ahead < 9 + Math.min(4, g.section)) {
          let far = pz + DRAW * SEGL * 0.85;
          for (const c of g.cars) if (c.z > far - 900 && c.z < far + 900) far = c.z + 1000;
          spawnCar(far);
        }
        // ambulance
        if (--g.ambT <= 0 && g.speed > 60) { g.ambT = rnd(1100, 1900) - Math.min(500, g.section * 80); spawnAmbulance(); }
        if (g.ambWarn > 0) { g.ambWarn--; if (g.ambWarn % 15 === 0 && !g.demo) S.siren((g.ambWarn / 15) & 1); }
        // timer
        if (!g.demo) {
          if (++g.timeF >= 60) { g.timeF = 0; g.time--; if (g.time <= 10 && g.time > 0) S.beep(); }
          if (g.time <= 0) { g.time = 0; g.msg = 'TIME UP'; g.msgT = 200; failed(); return; }
        }
        // engine sound
        if (++g.engineT >= 5 && (!g.demo)) {
          g.engineT = 0;
          const rpm = g.gear === 0 ? g.speed / LOMAX : 0.25 + g.speed / MAXSP * 0.75;
          au.tone(55 + rpm * 160, 0.1, { type: 'sawtooth', vol: 0.03 + (inp.gas ? 0.02 : 0) });
        }
        for (const s of g.smoke) { s.t--; s.y -= 0.6; }
        g.smoke = g.smoke.filter(s => s.t > 0);
        if (g.msgT > 0) g.msgT--;
      }
      function update() {
        frame++;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          at++;
          if (!g) newGame(true);
          updRace();
          if (at > 2400) { at = 0; g = null; }
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(false); }
            else { coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        if (g.phase === 'wait') return;
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'attract'; at = 0; g = null; } return; }
        if (g.phase === 'count') {
          g.phaseT--;
          if (g.phaseT % 50 === 0 && g.phaseT > 0) S.beep();
          if (api.anyPressed('KeyX', 'KeyZ', 'ShiftLeft')) { g.gear ^= 1; S.gear(); }
          if (g.phaseT <= 0) { g.phase = 'race'; S.go(); }
          return;
        }
        updRace();
      }

      // ---------- rendering ----------
      const SKY = { city: ['#000820', '#102050'], country: ['#2878f0', '#90c8ff'], coast: ['#3080ff', '#a0d8ff'], tunnel: ['#101010', '#202020'], snow: ['#8090b0', '#d0d8f0'] };
      const GROUND = { city: ['#303038', '#383840'], country: ['#20a020', '#30b030'], coast: ['#e0c880', '#d0b870'], tunnel: ['#282828', '#303030'], snow: ['#f0f0ff', '#e0e4f0'] };
      const ROAD = { city: ['#585860', '#606068'], country: ['#686868', '#707070'], coast: ['#707070', '#787878'], tunnel: ['#484848', '#505050'], snow: ['#9098a8', '#98a0b0'] };
      function quad(ctx, x1, y1, w1, x2, y2, w2, col) {
        ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x1 + w1, y1); ctx.closePath(); ctx.fill();
      }
      function drawBackground(ctx, theme, curveOff) {
        const sk = SKY[theme];
        ctx.fillStyle = sk[0]; ctx.fillRect(0, 22, W, 40);
        ctx.fillStyle = sk[1]; ctx.fillRect(0, 62, W, HZ - 62 + 30);
        const off = ((curveOff % 256) + 256) % 256;
        if (theme === 'city') {
          for (let i = -1; i < 10; i++) {
            const x = Math.round(i * 32 - off * 0.5 % 32), hgt = 14 + ((i * 37 + Math.floor(off / 32)) % 5) * 6;
            ctx.fillStyle = '#081030'; ctx.fillRect(x, HZ - hgt, 26, hgt + 2);
            ctx.fillStyle = '#ffe070'; for (let k = 0; k < 6; k++) if ((i * 3 + k) % 3) ctx.fillRect(x + 3 + (k % 3) * 8, HZ - hgt + 4 + Math.floor(k / 3) * 6, 2, 2);
          }
          ctx.fillStyle = '#fff'; for (let i = 0; i < 20; i++) ctx.fillRect((i * 53 + 7) % W, 26 + (i * 17) % 30, 1, 1);
        } else if (theme === 'country' || theme === 'snow') {
          ctx.fillStyle = theme === 'snow' ? '#a0a8c0' : '#3a8a50';
          ctx.beginPath(); ctx.moveTo(0, HZ + 2);
          for (let x = 0; x <= W; x += 8) ctx.lineTo(x, HZ - 12 - Math.abs(Math.sin((x + off) * 0.025)) * 22 - Math.sin((x + off * 0.5) * 0.06) * 5);
          ctx.lineTo(W, HZ + 2); ctx.fill();
          if (theme === 'snow') { ctx.fillStyle = '#ffffff'; for (let x = 0; x < W; x += 8) { const y = HZ - 12 - Math.abs(Math.sin((x + off) * 0.025)) * 22 - Math.sin((x + off * 0.5) * 0.06) * 5; ctx.fillRect(x, y, 6, 3); } }
          ctx.fillStyle = '#ffffff'; ctx.fillRect(30 + (off * 0.2 % 40), 36, 18, 4); ctx.fillRect(34 + (off * 0.2 % 40), 33, 10, 3); ctx.fillRect(140 - (off * 0.1 % 30), 44, 22, 4);
        } else if (theme === 'coast') {
          ctx.fillStyle = '#1050c0'; ctx.fillRect(0, HZ - 6, W, 10);
          ctx.fillStyle = '#80b0ff'; for (let i = 0; i < 12; i++) ctx.fillRect((i * 29 + off * 0.3 + frame * 0.2) % W, HZ - 4 + (i % 3) * 2, 6, 1);
          ctx.fillStyle = '#ffe040'; ctx.beginPath(); ctx.arc(170 - (off * 0.1 % 40), 46, 9, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = '#101010'; ctx.fillRect(0, 22, W, HZ + 10);
        }
      }
      function drawSprite(ctx, s, sx, sy, scale, clip) {
        let im, ww;
        if (s.k === 'bld') { im = BLD[s.v | 0]; ww = 700; }
        else if (s.k === 'banner' || s.k === 'tlight') return;
        else { im = SPRITES[s.k][0]; ww = SPRITES[s.k][1]; }
        const w = ww * scale * W / 2, h = w * im.height / im.width;
        if (w < 1 || sy - h > clip) return;
        const x = s.k === 'bld' ? (s.x < 0 ? sx - w : sx) : sx - w / 2;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, clip); ctx.clip();
        ctx.drawImage(im, Math.round(x), Math.round(sy - h), Math.round(w), Math.round(h));
        ctx.restore();
      }
      function renderRoad(ctx) {
        const pos = g.pos;
        const baseIdx = Math.floor(pos / SEGL);
        const base = segs[baseIdx % segs.length];
        const basePct = (pos % SEGL) / SEGL;
        const pseg = segAt(pos + PZ), ppct = ((pos + PZ) % SEGL) / SEGL;
        const py = pseg.y1 + (pseg.y2 - pseg.y1) * ppct;
        const camY = py + CAMH, camX = g.px * RW;
        g.curveOff = (g.curveOff || 0) + base.curve * g.speed * 0.004;
        drawBackground(ctx, pseg.theme, g.curveOff);
        let maxy = VBOT, x = 0, dx = -(base.curve * basePct);
        const list = [];
        for (let n = 0; n < DRAW; n++) {
          const s = segs[(baseIdx + n) % segs.length];
          const z1 = (baseIdx + n) * SEGL - pos, z2 = z1 + SEGL;
          if (z1 <= 1) { x += dx; dx += s.curve; list.push(null); continue; }
          const sc1 = DEPTH / z1, sc2 = DEPTH / z2;
          const X1 = W / 2 + sc1 * (x - camX) * W / 2, Y1 = HZ - sc1 * (s.y1 - camY) * VH / 2, W1 = sc1 * RW * W / 2;
          const X2 = W / 2 + sc2 * (x + dx - camX) * W / 2, Y2 = HZ - sc2 * (s.y2 - camY) * VH / 2, W2 = sc2 * RW * W / 2;
          x += dx; dx += s.curve;
          const item = { s, X1, Y1, W1, sc1, clip: maxy, n };
          list.push(item);
          if (z1 <= DEPTH || Y2 >= Y1 || Y2 >= maxy) continue;
          const th = s.theme, d = s.dark;
          const gr = GROUND[th][d];
          // ground band
          ctx.fillStyle = gr; ctx.fillRect(0, Y2, W, Y1 - Y2 + 1);
          if (th === 'coast') { ctx.fillStyle = d ? '#1858d8' : '#2060e0'; const ex = X1 + W1 * 1.35, ex2 = X2 + W2 * 1.35; ctx.beginPath(); ctx.moveTo(ex, Y1); ctx.lineTo(ex2, Y2); ctx.lineTo(W, Y2); ctx.lineTo(W, Y1 + 1); ctx.fill(); }
          if (th === 'country' && (s.i % 40) < 20) { ctx.fillStyle = d ? '#c8b040' : '#d0b848'; const ex = X1 - W1 * 3, ex2 = X2 - W2 * 3; ctx.beginPath(); ctx.moveTo(ex, Y1); ctx.lineTo(ex2, Y2); ctx.lineTo(0, Y2); ctx.lineTo(0, Y1 + 1); ctx.fill(); }
          // rumble + road
          quad(ctx, X1, Y1, W1 * 1.12, X2, Y2, W2 * 1.12, d ? '#f0f0f0' : (th === 'snow' ? '#2040c0' : '#d02020'));
          quad(ctx, X1, Y1, W1, X2, Y2, W2, ROAD[th][d]);
          if (d) { const lw1 = W1 * 0.025, lw2 = W2 * 0.025; for (const l of [-1 / 3, 1 / 3]) quad(ctx, X1 + W1 * l * 2 * 0.75, Y1, lw1, X2 + W2 * l * 2 * 0.75, Y2, lw2, th === 'tunnel' ? '#ffd040' : '#ffffff'); }
          if (th === 'tunnel') {
            const wh1 = W1 * 1.6, wh2 = W2 * 1.6;
            ctx.fillStyle = d ? '#3a3020' : '#443828';
            ctx.beginPath(); ctx.moveTo(X1 - W1 * 1.15, Y1); ctx.lineTo(X2 - W2 * 1.15, Y2); ctx.lineTo(X2 - W2 * 1.15, Y2 - wh2); ctx.lineTo(X1 - W1 * 1.15, Y1 - wh1); ctx.fill();
            ctx.beginPath(); ctx.moveTo(X1 + W1 * 1.15, Y1); ctx.lineTo(X2 + W2 * 1.15, Y2); ctx.lineTo(X2 + W2 * 1.15, Y2 - wh2); ctx.lineTo(X1 + W1 * 1.15, Y1 - wh1); ctx.fill();
            ctx.fillStyle = d ? '#2a2418' : '#302a1c';
            ctx.beginPath(); ctx.moveTo(X1 - W1 * 1.15, Y1 - wh1); ctx.lineTo(X2 - W2 * 1.15, Y2 - wh2); ctx.lineTo(X2 + W2 * 1.15, Y2 - wh2); ctx.lineTo(X1 + W1 * 1.15, Y1 - wh1); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(0, Y1 - wh1, Math.max(0, X1 - W1 * 1.15), wh1 + 1); ctx.fillRect(X1 + W1 * 1.15, Y1 - wh1, W, wh1 + 1);
            if (s.i % 8 === 0) { ctx.fillStyle = '#ffffa0'; ctx.fillRect(X1 - W1 * 0.3, Y1 - wh1 + 1, W1 * 0.6, Math.max(1, W1 * 0.05)); }
          }
          maxy = Y2;
        }
        // sprites & cars, far to near
        const carsBySeg = new Map();
        for (const c of g.cars) {
          const k = Math.floor(c.z / SEGL) - baseIdx;
          if (k < 0 || k >= DRAW) continue;
          if (!carsBySeg.has(k)) carsBySeg.set(k, []);
          carsBySeg.get(k).push(c);
        }
        for (let n = DRAW - 1; n >= 0; n--) {
          const it = list[n]; if (!it) continue;
          for (const sp of it.s.sprites) {
            if (sp.k === 'banner') {
              const w = it.W1 * 1.3, hgt = it.W1 * 1.1;
              if (it.Y1 - hgt < it.clip) {
                ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, it.clip); ctx.clip();
                ctx.fillStyle = '#c0c0c0'; ctx.fillRect(it.X1 - w, it.Y1 - hgt, Math.max(1, w * 0.06), hgt); ctx.fillRect(it.X1 + w - w * 0.06, it.Y1 - hgt, Math.max(1, w * 0.06), hgt);
                ctx.fillStyle = '#e02020'; ctx.fillRect(it.X1 - w, it.Y1 - hgt, w * 2, hgt * 0.22);
                if (w > 30) text(ctx, 'CHECK POINT', it.X1, it.Y1 - hgt + hgt * 0.11 - 3, '#ffffff', 1, 'center');
                ctx.restore();
              }
              continue;
            }
            drawSprite(ctx, sp, it.X1 + it.sc1 * sp.x * RW * W / 2, it.Y1, it.sc1, it.clip);
          }
          const cs = carsBySeg.get(n);
          if (cs) {
            cs.sort((a, b) => b.z - a.z);
            for (const c of cs) {
              const pct = (c.z % SEGL) / SEGL;
              const nx = list[n + 1] || it;
              const sx = it.X1 + (nx.X1 - it.X1) * pct, sy = it.Y1 + (nx.Y1 - it.Y1) * pct, sc = it.sc1 + (nx.sc1 - it.sc1) * pct;
              const w = c.w * RW * sc * W / 2 * 0.95, h = w * c.im.height / c.im.width;
              const cx = sx + sc * c.x * RW * W / 2;
              if (sy - h > it.clip || w < 1) continue;
              ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, it.clip); ctx.clip();
              ctx.drawImage(c.im, Math.round(cx - w / 2), Math.round(sy - h), Math.round(w), Math.round(h));
              ctx.restore();
            }
          }
        }
      }
      function drawPlayer(ctx) {
        const bounce = g.speed > 10 && (frame & 2) ? 1 : 0;
        const x = W / 2 - 16, y = HZ + VH / 2 - 14 - bounce;
        if (g.crashT > 0) {
          const t = 110 - g.crashT;
          ctx.save(); ctx.translate(W / 2, y + 7); ctx.rotate(Math.sin(t * 0.4) * 0.6 * Math.max(0, 1 - t / 80)); ctx.drawImage(PCAR, -16, -7); ctx.restore();
          if (t < 16) { ctx.fillStyle = t & 2 ? '#ffffff' : '#ffd040'; ctx.beginPath(); ctx.arc(W / 2, y + 4, 6 + t, 0, 6.283); ctx.fill(); }
        } else ctx.drawImage(PCAR, x, y);
        for (const s of g.smoke) { ctx.fillStyle = s.t > 15 ? '#a0a0a0' : '#606060'; ctx.fillRect(s.x - 3, s.y - 3, 6, 6); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 22);
        text(ctx, 'SCORE', 4, 2, '#ff4040'); text(ctx, pad(g.score, 6), 4, 12, '#ffffff');
        text(ctx, 'TIME', 112, 2, '#ffd040', 1, 'center'); text(ctx, pad(g.time, 2), 112, 10, g.time <= 10 && (frame & 16) ? '#ff2020' : '#ffffff', 1.5, 'center');
        text(ctx, 'HI', 220, 2, '#ff4040', 1, 'right'); text(ctx, pad(hi, 6), 220, 12, '#ffffff', 1, 'right');
        // dashboard
        ctx.fillStyle = '#101018'; ctx.fillRect(0, VBOT, W, H - VBOT);
        ctx.fillStyle = '#303048'; ctx.fillRect(0, VBOT, W, 2);
        // gear
        text(ctx, 'GEAR', 6, VBOT + 6, '#a0a0c0');
        text(ctx, 'LO', 6, VBOT + 18, g.gear === 0 ? '#40ff40' : '#304030', 1);
        text(ctx, 'HI', 22, VBOT + 18, g.gear === 1 ? '#ff4040' : '#403030', 1);
        // speedo
        const kmh = Math.round(g.speed * KMH);
        text(ctx, pad(kmh, 3), 80, VBOT + 8, '#ffffff', 2, 'center'); text(ctx, 'KM/H', 80, VBOT + 26, '#a0a0c0', 1, 'center');
        ctx.fillStyle = '#202030'; ctx.fillRect(50, VBOT + 36, 60, 4);
        ctx.fillStyle = kmh > 220 ? '#ff4040' : '#40c0ff'; ctx.fillRect(50, VBOT + 36, 60 * Math.min(1, g.speed / MAXSP), 4);
        // passed counter
        text(ctx, 'CARS', 172, VBOT + 6, '#a0a0c0', 1, 'center');
        text(ctx, pad(g.passed, 2) + '/30', 172, VBOT + 16, g.passed >= 30 ? '#40ff40' : '#ffd040', 1.5, 'center');
        // section progress
        const secPos = ((g.pos + PZ) % (SECLEN * SEGL)) / (SECLEN * SEGL);
        const th = segAt(g.pos + PZ).theme;
        text(ctx, TNAME[th], 172, VBOT + 30, '#ffffff', 1, 'center');
        ctx.fillStyle = '#202030'; ctx.fillRect(130, VBOT + 40, 84, 3);
        ctx.fillStyle = '#ff3030'; ctx.fillRect(130 + secPos * 82, VBOT + 38, 3, 7);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (!g) return;
        renderRoad(ctx);
        drawPlayer(ctx);
        // ambulance warning
        if (g.ambWarn > 0 && (frame & 8)) {
          const a = g.cars.find(c => c.amb);
          text(ctx, 'AMBULANCE!', W / 2, 30, '#ff4040', 1, 'center');
          if (a) { const ax = W / 2 + (a.x - g.px) * 80; ctx.fillStyle = '#ff4040'; ctx.fillRect(clamp(ax, 6, W - 10) - 3, VBOT - 8, 7, 5); }
        }
        drawHUD(ctx);
        if (mode === 'attract') {
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(20, 40, 184, 96);
          for (let d = 3; d > 0; d--) text(ctx, 'TURBO', 112 + d, 50 + d, '#600000', 5, 'center');
          text(ctx, 'TURBO', 112, 50, (frame >> 3) & 1 ? '#ff3030' : '#ffd000', 5, 'center');
          text(ctx, 'PASS 30 CARS PER SECTION', 112, 96, '#ffffff', 1, 'center');
          text(ctx, 'FOR EXTENDED PLAY', 112, 106, '#ffffff', 1, 'center');
          const blink = (frame >> 5) & 1;
          if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', 112, 122, '#ffffff', 1, 'center'); }
          else if (blink) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 112, 122, '#40ff40', 1, 'center');
          text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 112, 140, '#c0c0c0', 1, 'center');
          text(ctx, '\u00a9 1981 SEGA', 112, 198, '#ffffff', 1, 'center');
          return;
        }
        if (g.phase === 'count') {
          const n = Math.ceil(g.phaseT / 50);
          text(ctx, n > 3 ? 'READY' : String(n), 112, 60, '#ffd040', 3, 'center');
          text(ctx, 'SHIFT TO HI FOR SPEED', 112, 90, '#ffffff', 1, 'center');
        }
        if (g.msgT > 0 && (g.msgT >> 3) & 1) text(ctx, g.msg, 112, 60, g.msg === 'EXTENDED PLAY' ? '#40ff40' : '#ff4040', 1.5, 'center');
        if (g.phase === 'over' || g.phase === 'wait') { ctx.fillStyle = '#000'; ctx.fillRect(48, 100, 128, 30); text(ctx, 'GAME OVER', 112, 104, '#ff4040', 2, 'center'); if (g.passed < 30) text(ctx, 'PASSED ' + g.passed + ' OF 30', 112, 120, '#ffffff', 1, 'center'); }
      }
      return { update, render, destroy() { } };
    }
  });
})();
