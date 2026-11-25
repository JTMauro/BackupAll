// Athena (SNK, 1986) - from-scratch recreation for the MAME32 Game Room.
// Princess Athena fights through the eight worlds of the Fantasy World: smash blocks for weapons
// and armour, beat the clock, and defeat the guardian at the end of each world.
(function () {
  'use strict';
  // ---- compact 5x7 bitmap arcade font ----
  const FK = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.,:!?=*/'\"<>()+%#@^_~";
  const FD = "ehjlphe4c4444eeh168gvv2421he26aiv22vgu11he68guhhev124888ehhehheehhf12c4ahhvhhuhhuhhuehgggheuhhhhhuvgguggvvggugggfggjhhfhhhvhhhe44444e11111hehikokihggggggvhrllhhhhhpljhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gv000v00000000cc0000c480cc0cc04444404eh1240400v0v000level001248g04480000aa00000248g842842124824888428422248044v440pq48mj0avaaavaehnlnge4el4444000000vehlplhe";
  const FONT = {};
  for (let i = 0; i < FK.length; i++) { const g = []; for (let r = 0; r < 7; r++) g.push(parseInt(FD[i * 7 + r], 32)); FONT[FK[i]] = g; }
  FONT['\u00a9'] = [0x0E, 0x11, 0x17, 0x14, 0x17, 0x11, 0x0E];
  // text(ctx, str, x, y, colour, {scale, adv, center, bold})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc, bw = o.bold ? 2 : 1;
    s = String(s).toUpperCase();
    if (o.center) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)) / 2);
    if (o.right) x = Math.round(x - (s.length * adv - (adv - (4 + bw) * sc)));
    ctx.fillStyle = col;
    for (const ch of s) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 7; r++) { const b = g[r]; if (b) for (let c = 0; c < 5; c++) if ((b >> (4 - c)) & 1) ctx.fillRect(x + c * sc, y + r * sc, sc * bw, sc); }
      x += adv;
    }
  }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }


  const W = 256, H = 224, TS = 16, TOP = 16, ROWS = 13;
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const mirror = rows => rows.map(r => r.split('').reverse().join(''));

  // ---------------- Athena pixel art (faces right) ----------------
  const HEAD = [
    '....HHHH....',
    '...HHHHHH...',
    '..HHHSSSHH..',
    '..HHSSESS...',
    '..HHSSSSS...',
    '..HH.SSS....',
    '.HH.RRRR....',
    '.HH.SRRSS...'];
  const ARMS = {
    norm: ['....SSSSSS..', '....SSSS.SS.', '....SSSS..S.'],
    atk: ['....SSSSSSSS', '....SSSS....', '....SSSS....']
  };
  const HIPS = ['....RRRR....', '....RRRR....'];
  const LEGS = {
    stand: ['....SS.SS...', '....SS.SS...', '....SS.SS...', '....SS.SS...', '....SS.SS...', '....BB.BB...', '...BBB.BBB..'],
    walk1: ['....SS.SS...', '...SS..SS...', '...SS...SS..', '..SS....SS..', '..SS.....SS.', '..BB.....BB.', '.BBB.....BBB'],
    walk2: ['....SSSS....', '....SSSS....', '.....SS.....', '.....SS.....', '.....SS.....', '.....BB.....', '....BBBB....'],
    jump: ['....SSSSS...', '....SS..SS..', '...SS...SS..', '...SS..SS...', '..BB...BB...', '..BBB..BBB..', '............'],
    kick: ['....SS......', '....SSSSSSSS', '....SS..SSBB', '....SS......', '....SS......', '....BB......', '...BBB......'],
    crouch: ['...SSSSSS...', '..BBB..BBB..']
  };
  const APAL = { H: '#ff5020', S: '#ffc8a0', E: '#202060', R: '#e01830', B: '#a05020' };

  const ENEMY_ART = {
    pig: ['....PPPP....', '...PPPPPP...', '..PPWKPWKP..', '..PPPPPPPP..', '..PPNNNNPP..', '...PPPPPP...', '..BBBBBBBB..', '.PBBBBBBBBP.',
      '.P.BBBBBB.P.', '...BBBBBB...', '...PP..PP...', '...PP..PP...', '..KKK..KKK..'],
    pig2: ['....PPPP....', '...PPPPPP...', '..PPWKPWKP..', '..PPPPPPPP..', '..PPNNNNPP..', '...PPPPPP...', '..BBBBBBBB..', '.PBBBBBBBBP.',
      '.P.BBBBBB.P.', '...BBBBBB...', '....PPPP....', '...PP..PP...', '...KK..KK..'],
    slime: ['............', '....GGGG....', '..GGGGGGGG..', '.GGWKGGWKGG.', 'GGGGGGGGGGGG', 'GGGLGGGGLGGG', '.GGGGGGGGGG.'],
    slime2: ['....GGGG....', '...GGGGGG...', '..GGWKGWKG..', '..GGGGGGGG..', '.GGGGGGGGGG.', '.GGGLGGLGGG.', '..GGGGGGGG..'],
    bat: ['K..........K', 'KK..KKKK..KK', 'KKKKRKKRKKKK', '.KKKKKKKKKK.', '..K..KK..K..'],
    bat2: ['............', '....KKKK....', '.KKKRKKRKKK.', 'KKKKKKKKKKKK', 'K....KK....K'],
    skel: ['....WWWW....', '...WKWWKW...', '...WWWWWW...', '....WKKW....', '.....WW.....', '...WWWWWW...', '..W.WWWW.W..', '..W.WWWW.W..',
      '....WWWW....', '....W..W....', '....W..W....', '....W..W....', '...WW..WW...'],
    knight: ['....GGGG....', '...GGGGGG...', '...GKKKKG...', '...GGGGGG...', '..GGGGGGGG..', '.GGGRRRRGGG.', '.GGGGGGGGGG.', '..GGGGGGGG..',
      '...GGGGGG...', '...GG..GG...', '...GG..GG...', '...GG..GG...', '..GGG..GGG..']
  };
  const ENEMY_PAL = {
    pig: { P: '#f0a0a0', W: '#ffffff', K: '#000000', N: '#c05060', B: '#806020' },
    slime: { G: '#40d040', W: '#ffffff', K: '#000000', L: '#a0ffa0' },
    bat: { K: '#6030a0', R: '#ff2020' },
    skel: { W: '#f0f0e0', K: '#202020' },
    knight: { G: '#8090b0', K: '#101020', R: '#e02020' }
  };

  const WORLDS = [
    { name: 'FOREST', sky: '#68a8f8', far: '#3c7c3c', far2: '#2c5c2c', top: '#40c040', dirt: '#a06030', brick: '#c87040', hard: '#909090', pool: ['pig', 'pig', 'slime', 'bat'] },
    { name: 'CAVERN', sky: '#181020', far: '#302838', far2: '#201828', top: '#807060', dirt: '#504030', brick: '#8c6c50', hard: '#6c6c7c', pool: ['pig', 'bat', 'bat', 'slime', 'skel'] },
    { name: 'SEA', sky: '#3080e0', far: '#2050a0', far2: '#1840a0', top: '#e0c080', dirt: '#b08040', brick: '#d09060', hard: '#80a0a0', pool: ['slime', 'slime', 'pig', 'bat', 'skel'] },
    { name: 'SKY', sky: '#a0d8ff', far: '#ffffff', far2: '#e0f0ff', top: '#ffffff', dirt: '#c0d0e0', brick: '#e0a0c0', hard: '#a0a0c0', pool: ['bat', 'bat', 'skel', 'pig', 'knight'] },
    { name: 'ICE', sky: '#203860', far: '#80a0d0', far2: '#6080b0', top: '#e0f0ff', dirt: '#90b0d0', brick: '#a0d0f0', hard: '#7090b0', pool: ['slime', 'skel', 'knight', 'bat', 'pig'], ice: true },
    { name: 'DESERT', sky: '#f0b060', far: '#c08040', far2: '#a06030', top: '#f0d080', dirt: '#c09050', brick: '#d0a060', hard: '#a08870', pool: ['skel', 'skel', 'knight', 'slime', 'pig'] },
    { name: 'UNDERWORLD', sky: '#300808', far: '#601010', far2: '#400808', top: '#a03020', dirt: '#502010', brick: '#803020', hard: '#604040', pool: ['knight', 'bat', 'skel', 'slime', 'knight'] },
    { name: 'VICTORY', sky: '#402060', far: '#806090', far2: '#604070', top: '#c0a0ff', dirt: '#6040a0', brick: '#a080e0', hard: '#8070a0', pool: ['knight', 'knight', 'skel', 'bat', 'slime', 'pig'] }
  ];
  const WEAPONS = {
    kick: { range: 12, dur: 12, dmg: 1, name: 'KICK' },
    club: { range: 18, dur: 14, dmg: 2, name: 'CLUB' },
    sword: { range: 24, dur: 12, dmg: 2, name: 'SWORD' },
    chain: { range: 34, dur: 20, dmg: 3, name: 'BALL+CHAIN' },
    hammer: { range: 18, dur: 16, dmg: 3, name: 'HAMMER', hard: true },
    bow: { range: 0, dur: 14, dmg: 2, name: 'BOW', shoot: true }
  };
  const ITEM_INFO = {
    club: 'CLUB', sword: 'SWORD', chain: 'BALL AND CHAIN', hammer: 'HAMMER - BREAKS STONE', bow: 'BOW',
    helmet: 'HELMET - BREAK BLOCKS', armor: 'ARMOR', shield: 'SHIELD', boots: 'BOOTS - HIGH JUMP',
    heart: 'HEART +STRENGTH', clock: 'HOURGLASS +30 SEC', gem: 'GEM 500', harp: 'HARP 1000', oneup: '1UP'
  };

  ArcadeRegistry.register({
    id: 'athena',
    title: 'Athena',
    year: 1986,
    maker: 'SNK',
    width: W, height: H,
    vector: false,
    pointer: false,
    controls: 'Arrows: move/crouch \u00b7 Space: attack \u00b7 X or Up: jump \u00b7 Enter: start',
    marquee: { bg: '#200818', fg: '#ff5020', accent: '#ffd040' },
    create(api) {
      const au = api.audio;
      // ---------- build sprites ----------
      function athenaRows(arms, legs) { return HEAD.concat(ARMS[arms], HIPS, LEGS[legs]); }
      const ATH = {};
      for (const [k, a, l] of [['stand', 'norm', 'stand'], ['walk1', 'norm', 'walk1'], ['walk2', 'norm', 'walk2'], ['jump', 'norm', 'jump'],
        ['atk', 'atk', 'stand'], ['jatk', 'atk', 'jump'], ['kick', 'norm', 'kick'], ['crouch', 'norm', 'crouch'], ['catk', 'atk', 'crouch']]) {
        const rows = athenaRows(a, l);
        ATH[k] = [spr(rows, APAL), spr(mirror(rows), APAL)];
      }
      const BIG_ATHENA = (() => {
        const rows = athenaRows('norm', 'stand'); const c = document.createElement('canvas'); c.width = 36; c.height = rows.length * 3;
        const x = c.getContext('2d'); rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = APAL[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i * 3, y * 3, 3, 3); } } }); return c;
      })();
      const ESP = {};
      for (const k in ENEMY_ART) {
        const base = k.replace(/2$/, '');
        ESP[k] = [spr(ENEMY_ART[k], ENEMY_PAL[base]), spr(mirror(ENEMY_ART[k]), ENEMY_PAL[base])];
      }

      // ---------- tiles ----------
      let TILES = null;
      function buildTiles(wd) {
        const mk = fn => { const c = document.createElement('canvas'); c.width = TS; c.height = TS; const x = c.getContext('2d'); fn(x); return c; };
        const rnd = mulberry(55);
        const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const r = clamp(((n >> 16) & 255) * f | 0, 0, 255), g2 = clamp(((n >> 8) & 255) * f | 0, 0, 255), b = clamp((n & 255) * f | 0, 0, 255); return 'rgb(' + r + ',' + g2 + ',' + b + ')'; };
        TILES = {
          dirt: mk(x => { x.fillStyle = wd.dirt; x.fillRect(0, 0, TS, TS); for (let i = 0; i < 18; i++) { x.fillStyle = shade(wd.dirt, rnd() < 0.5 ? 0.75 : 1.2); x.fillRect(rnd() * 15 | 0, rnd() * 15 | 0, 2, 1); } }),
          top: mk(x => {
            x.fillStyle = wd.dirt; x.fillRect(0, 0, TS, TS); for (let i = 0; i < 14; i++) { x.fillStyle = shade(wd.dirt, 0.75); x.fillRect(rnd() * 15 | 0, 6 + rnd() * 9 | 0, 2, 1); }
            x.fillStyle = wd.top; x.fillRect(0, 0, TS, 5); x.fillStyle = shade(wd.top, 0.7);
            for (let i = 0; i < TS; i += 2) x.fillRect(i, 5, 1, 1 + ((i * 7) % 3));
            x.fillStyle = shade(wd.top, 1.3); x.fillRect(0, 0, TS, 1);
          }),
          brick: mk(x => {
            x.fillStyle = shade(wd.brick, 0.5); x.fillRect(0, 0, TS, TS);
            x.fillStyle = wd.brick;
            x.fillRect(0, 1, 7, 6); x.fillRect(8, 1, 8, 6); x.fillRect(0, 9, 3, 6); x.fillRect(4, 9, 8, 6); x.fillRect(13, 9, 3, 6);
            x.fillStyle = shade(wd.brick, 1.3); x.fillRect(0, 1, 7, 1); x.fillRect(8, 1, 8, 1); x.fillRect(4, 9, 8, 1);
          }),
          hard: mk(x => {
            x.fillStyle = shade(wd.hard, 0.5); x.fillRect(0, 0, TS, TS);
            x.fillStyle = wd.hard; x.fillRect(1, 1, 14, 14);
            x.fillStyle = shade(wd.hard, 1.35); x.fillRect(1, 1, 14, 2); x.fillRect(1, 1, 2, 14);
            x.fillStyle = shade(wd.hard, 0.7); x.fillRect(4, 4, 8, 8); x.fillStyle = wd.hard; x.fillRect(5, 5, 6, 6);
          }),
          spike: mk(x => {
            x.fillStyle = '#c0c0d0';
            for (let i = 0; i < 4; i++) { for (let k = 0; k < 8; k++) x.fillRect(i * 4 + (k >> 2), 15 - k * 1.5, 4 - (k >> 1), 2); }
            x.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) x.fillRect(i * 4 + 1, 4, 1, 3);
          })
        };
      }

      // ---------- world generation ----------
      function genWorld(wn, loop) {
        const wd = WORLDS[wn];
        const rnd = mulberry(1000 + wn * 77 + loop * 5);
        const cols = 150 + wn * 12;
        const map = []; for (let r = 0; r < ROWS; r++) map.push(new Array(cols).fill('.'));
        const items = {}, spawns = [], checkpoints = [], heights = new Array(cols).fill(0);
        const setCol = (c, h) => { for (let r = ROWS - h; r < ROWS; r++) map[r][c] = '#'; heights[c] = h; };
        const surf = h => ROWS - h; // first solid row
        const itemPool = ['club', 'sword', 'chain', 'hammer', 'bow', 'helmet', 'armor', 'shield', 'boots', 'heart', 'heart', 'clock', 'gem', 'gem', 'harp'];
        const randItem = () => rnd() < 0.03 ? 'oneup' : itemPool[rnd() * itemPool.length | 0];
        const enemyAt = (c, h) => { spawns.push({ c, r: surf(h), kind: wd.pool[rnd() * wd.pool.length | 0] }); };
        const arenaStart = cols - 22;
        let c = 0, h = 3;
        while (c < 12) { setCol(c, h); c++; }
        checkpoints.push(2);
        // first gift: a block with a weapon near the start
        map[surf(h) - 3][8] = 'B'; items[(surf(h) - 3) * cols + 8] = wn === 0 ? 'club' : randItem();
        const dens = 0.35 + wn * 0.06 + loop * 0.1;
        while (c < arenaStart - 6) {
          const r = rnd();
          if (r < 0.22) { // flat run with enemies
            const n = 5 + (rnd() * 5 | 0); checkpoints.push(c);
            for (let i = 0; i < n; i++) setCol(c + i, h);
            if (rnd() < dens + 0.3) enemyAt(c + n - 2, h);
            if (rnd() < dens - 0.2) enemyAt(c + 2, h);
            c += n;
          } else if (r < 0.38) { // pit
            setCol(c, h); setCol(c + 1, h); c += 2;
            const pw = 2 + (rnd() < 0.4 ? 1 : 0); c += pw;
            if (rnd() < 0.4) h = clamp(h + (rnd() < 0.5 ? -1 : 1), 2, 6);
            setCol(c, h); setCol(c + 1, h); setCol(c + 2, h); c += 3;
          } else if (r < 0.52) { // step
            h = clamp(h + (rnd() < 0.5 ? -1 : 1) * (rnd() < 0.3 ? 2 : 1), 2, 6);
            for (let i = 0; i < 4; i++) setCol(c + i, h);
            c += 4;
          } else if (r < 0.70) { // floating bricks
            const n = 7; for (let i = 0; i < n; i++) setCol(c + i, h);
            const len = 2 + (rnd() * 2 | 0), row = surf(h) - 3; // leave the last columns clear so the next step can be jumped
            if (row >= 1) for (let i = 0; i < len; i++) { map[row][c + 2 + i] = 'B'; if (rnd() < 0.35) items[row * cols + c + 2 + i] = randItem(); }
            if (rnd() < dens) enemyAt(c + 5, h);
            c += n;
          } else if (r < 0.80) { // brick wall
            for (let i = 0; i < 5; i++) setCol(c + i, h);
            const tall = 1 + (rnd() < 0.6 ? 1 : 0), row = surf(h);
            for (let k = 1; k <= tall; k++) { map[row - k][c + 3] = 'B'; if (rnd() < 0.3) items[(row - k) * cols + c + 3] = randItem(); }
            c += 5;
          } else if (r < 0.88) { // stone cache (hammer)
            for (let i = 0; i < 5; i++) setCol(c + i, h);
            const row = surf(h) - 1; map[row][c + 2] = 'H'; items[row * cols + c + 2] = rnd() < 0.5 ? 'harp' : randItem();
            c += 5;
          } else if (r < 0.94 && wn >= 1) { // spikes
            for (let i = 0; i < 6; i++) setCol(c + i, h);
            map[surf(h) - 1][c + 2] = '^'; if (rnd() < 0.5) map[surf(h) - 1][c + 3] = '^';
            c += 6;
          } else { // brick staircase
            for (let i = 0; i < 6; i++) setCol(c + i, h);
            const row = surf(h);
            map[row - 1][c + 2] = 'B'; map[row - 1][c + 3] = 'B'; map[row - 2][c + 3] = 'B';
            items[(row - 2) * cols + c + 3] = randItem();
            c += 6;
          }
        }
        h = 2; checkpoints.push(c);
        while (c < cols) { setCol(c, h); c++; }
        for (let r = 0; r < ROWS; r++) map[r][cols - 1] = 'H';
        return { map, items, spawns, checkpoints, heights, cols, arenaStart, wd };
      }

      // ---------- coin-op / state ----------
      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits;
      function pollCoins() { const c = api.credits; if (c > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 }); lastCred = c; }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); return false;
      }
      const snd = {
        jump() { au.tone(300, 0.15, { type: 'square', vol: 0.07, slideTo: 700 }); },
        swing() { au.noise(0.07, { vol: 0.08, freq: 3000, type: 'highpass' }); },
        hit() { au.tone(220, 0.08, { type: 'square', vol: 0.12, slideTo: 90 }); },
        brick() { au.noise(0.15, { vol: 0.15, freq: 1200, slideTo: 200 }); },
        clank() { au.tone(1200, 0.05, { type: 'square', vol: 0.06 }); },
        kill() { au.tone(600, 0.15, { type: 'square', vol: 0.1, slideTo: 100 }); au.noise(0.12, { vol: 0.08, freq: 1500 }); },
        item() { au.melody([[784, .05], [988, .05], [1319, .1]], { type: 'square', vol: 0.09 }); },
        equip() { au.melody([[523, .06], [659, .06], [784, .06], [1047, .14]], { type: 'triangle', vol: 0.15 }); },
        hurt() { au.tone(400, 0.25, { type: 'sawtooth', vol: 0.1, slideTo: 80 }); },
        lose() { au.tone(900, 0.2, { type: 'square', vol: 0.08, slideTo: 200 }); },
        die() { au.melody([[523, .12], [494, .12], [466, .12], [440, .12], [392, .4]], { type: 'square', vol: 0.1 }); },
        oneup() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[523, .12], [659, .12], [784, .12], [1047, .24], [880, .12], [1047, .36]], { type: 'square', vol: 0.1 }); },
        boss() { au.melody([[196, .2], [185, .2], [196, .2], [233, .4]], { type: 'sawtooth', vol: 0.08 }); },
        clear() { au.melody([[784, .1], [880, .1], [988, .1], [1047, .2], [988, .1], [1047, .1], [1319, .4]], { type: 'square', vol: 0.1 }); },
        tick() { au.tone(1600, 0.02, { type: 'square', vol: 0.05 }); },
        warn() { au.tone(880, 0.06, { type: 'square', vol: 0.06 }); },
        fire() { au.noise(0.2, { vol: 0.1, freq: 800, slideTo: 300 }); }
      };
      // background music: a simple looping bass/melody pattern per world
      const TUNE = [[392, 523, 659, 523], [349, 440, 587, 440], [330, 392, 523, 392], [294, 392, 494, 392]];
      let musT = 0;
      function music() {
        if (!g || g.phase !== 'play' || g.p.state !== 'alive') return;
        musT++;
        if (musT % 15 === 0) {
          const bar = (musT / 60 | 0) % 4, step = (musT / 15 | 0) % 4;
          const base = g.time < 30 ? 1.06 : 1;
          au.tone(TUNE[bar][step] * base * (g.world % 2 ? 0.89 : 1), 0.12, { type: 'triangle', vol: 0.05 });
          if (step === 0) au.tone(TUNE[bar][0] / 4, 0.4, { type: 'square', vol: 0.03 });
        }
      }

      let g = null, lv = null;
      function newGame() {
        g = { score: 0, reserve: 2, nextExtra: 30000, world: -1, loop: 0, p: null, phase: 'intro', phaseT: 0, msg: '', msgT: 0 };
        g.p = newPlayer();
        nextWorld();
        snd.start();
      }
      function newPlayer() {
        return { x: 40, y: 0, w: 10, h: 20, vx: 0, vy: 0, face: 1, onGround: false, state: 'alive', t: 0, inv: 0, hp: 6, maxhp: 6,
          weapon: 'kick', helmet: false, armor: false, shield: false, boots: false, atk: 0, atkId: 0, crouch: false, anim: 0, knock: 0, lastBreak: -1 };
      }
      function nextWorld() {
        g.world++;
        if (g.world >= WORLDS.length) { g.world = 0; g.loop++; }
        lv = genWorld(g.world, g.loop);
        buildTiles(lv.wd);
        g.enemies = []; g.shots = []; g.eshots = []; g.items = []; g.parts = []; g.pops = [];
        g.spawnIdx = 0; g.boss = null; g.camLock = false; g.cam = 0;
        g.time = 200; g.phase = 'intro'; g.phaseT = 150; g.cp = 0;
        placePlayer(lv.checkpoints[0]);
      }
      function placePlayer(col) {
        const p = g.p;
        const h = lv.heights[col] || 3;
        p.x = col * TS + 3; p.y = TOP + (ROWS - h) * TS - p.h; p.vx = 0; p.vy = 0; p.state = 'alive'; p.inv = 120; p.atk = 0;
        g.cam = clamp(p.x - 96, 0, lv.cols * TS - W);
        // spawn pointer: skip enemies behind the camera
        g.spawnIdx = 0; while (g.spawnIdx < lv.spawns.length && lv.spawns[g.spawnIdx].c * TS < g.cam + W - 32) g.spawnIdx++;
      }
      function addScore(n) {
        g.score += n;
        while (g.score >= g.nextExtra) { g.reserve++; g.nextExtra += 70000; snd.oneup(); pop(g.p.x, g.p.y - 10, '1UP', '#40ff40'); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, txt, col) { g.pops.push({ x, y, txt, col: col || '#ffffff', t: 50 }); }
      function debris(x, y, col, n) { for (let i = 0; i < (n || 4); i++) g.parts.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, t: 40, col }); }

      // ---------- tile helpers ----------
      function tileAt(c, r) { if (c < 0) return 'H'; if (r < 0 || r >= ROWS || c >= lv.cols) return '.'; return lv.map[r][c]; }
      function solidT(t) { return t === '#' || t === 'B' || t === 'H'; }
      function solidAt(x, y) { return solidT(tileAt(Math.floor(x / TS), Math.floor((y - TOP) / TS))); }
      function moveX(e, dx) {
        e.x += dx; e.hitWall = false;
        if (g.camLock && e === g.p) { if (e.x < lv.arenaStart * TS) { e.x = lv.arenaStart * TS; e.hitWall = true; } }
        const ys = [e.y + 1, e.y + e.h / 2, e.y + e.h - 1];
        if (dx > 0) { for (const y of ys) if (solidAt(e.x + e.w - 0.01, y)) { e.x = Math.floor((e.x + e.w) / TS) * TS - e.w; e.hitWall = true; break; } }
        else if (dx < 0) { for (const y of ys) if (solidAt(e.x, y)) { e.x = (Math.floor(e.x / TS) + 1) * TS; e.hitWall = true; break; } }
      }
      function moveY(e, dy) {
        e.y += dy; e.onGround = false; e.bonk = null;
        if (dy > 0) {
          if (solidAt(e.x + 1, e.y + e.h) || solidAt(e.x + e.w - 1, e.y + e.h)) {
            const r = Math.floor((e.y + e.h - TOP) / TS); e.y = TOP + r * TS - e.h; e.vy = 0; e.onGround = true;
          }
        } else if (dy < 0) {
          for (const x of [e.x + 1, e.x + e.w - 1]) if (solidAt(x, e.y)) {
            const r = Math.floor((e.y - TOP) / TS); e.y = TOP + (r + 1) * TS; e.vy = 0; e.bonk = { c: Math.floor(x / TS), r }; break;
          }
        }
      }
      function breakTile(c, r, hard) {
        const t = tileAt(c, r);
        if (t === 'H' && c === lv.cols - 1) return false;
        if (t === 'B' || (t === 'H' && hard)) {
          lv.map[r][c] = '.';
          const cx = c * TS + 8, cy = TOP + r * TS + 8;
          debris(cx, cy, t === 'B' ? lv.wd.brick : lv.wd.hard, 6); snd.brick(); addScore(t === 'B' ? 10 : 50);
          const k = r * lv.cols + c;
          if (lv.items[k]) { g.items.push({ kind: lv.items[k], x: cx - 5, y: cy - 5, w: 10, h: 10, vx: 0, vy: -3, t: 0 }); delete lv.items[k]; }
          return true;
        }
        if (t === 'H') snd.clank();
        return false;
      }

      // ---------- enemies ----------
      function spawnEnemies() {
        while (g.spawnIdx < lv.spawns.length && lv.spawns[g.spawnIdx].c * TS < g.cam + W + 16) {
          const s = lv.spawns[g.spawnIdx++];
          if (s.c >= lv.arenaStart) continue;
          const x = s.c * TS + 2, base = TOP + s.r * TS;
          const L = g.loop;
          const e = { kind: s.kind, x, y: base - 13, w: 12, h: 13, vx: 0, vy: 0, face: -1, t: 0, hp: 1, flash: 0, hitBy: -1, onGround: false };
          if (s.kind === 'pig') { e.hp = 1 + L; e.pts = 100; e.speed = 0.45 + g.world * 0.04; }
          else if (s.kind === 'slime') { e.h = 7; e.y = base - 7; e.hp = 2 + L; e.pts = 200; e.jt = 40; }
          else if (s.kind === 'bat') { e.h = 5; e.y = TOP + 24 + Math.random() * 50; e.hp = 1 + L; e.pts = 200; e.by = e.y; }
          else if (s.kind === 'skel') { e.hp = 2 + L; e.pts = 300; e.ft = 90; }
          else if (s.kind === 'knight') { e.hp = 4 + L * 2; e.pts = 500; e.speed = 0.6 + g.world * 0.03; }
          g.enemies.push(e);
        }
      }
      function updEnemies() {
        const p = g.p;
        for (const e of g.enemies) {
          if (e.dead) continue;
          e.t++; if (e.flash > 0) e.flash--;
          const dxp = (p.x + p.w / 2) - (e.x + e.w / 2);
          switch (e.kind) {
            case 'pig': case 'knight': {
              if (e.kind === 'knight' && e.t % 60 === 0 && Math.abs(dxp) < 120) e.face = Math.sign(dxp) || 1;
              e.vx = e.face * e.speed;
              const ahead = e.face > 0 ? e.x + e.w + 1 : e.x - 1;
              if (e.onGround && !solidAt(ahead, e.y + e.h + 2)) e.face = -e.face;
              break;
            }
            case 'slime':
              if (e.onGround) { e.vx = 0; if (--e.jt <= 0) { e.jt = 50 + (Math.random() * 40 | 0); e.vy = -4; e.face = Math.sign(dxp) || 1; e.vx = e.face * 1.2; } }
              break;
            case 'bat':
              e.face = Math.sign(dxp) || 1;
              e.vx = e.face * (0.7 + g.world * 0.05);
              e.y = e.by + Math.sin(e.t / 18) * 16;
              if (Math.abs(dxp) < 60 && e.by < p.y - 10) e.by += 0.4;
              break;
            case 'skel':
              e.face = Math.sign(dxp) || 1; e.vx = 0;
              if (--e.ft <= 0) {
                e.ft = Math.max(70, 140 - g.world * 8);
                if (Math.abs(dxp) < 200) g.eshots.push({ kind: 'arrow', x: e.x + 6, y: e.y + 5, vx: e.face * 2.2, vy: 0, w: 8, h: 2 });
              }
              break;
          }
          if (e.kind === 'bat') { e.x += e.vx; }
          else {
            e.vy = Math.min(6, e.vy + 0.25);
            moveX(e, e.vx); if (e.hitWall && (e.kind === 'pig' || e.kind === 'knight')) e.face = -e.face;
            moveY(e, e.vy);
          }
          if (e.y > H + 20 || e.x < g.cam - 80 || e.x > g.cam + W + 160) e.dead = true;
          if (p.state === 'alive' && overlap(e, p)) hurtPlayer(e.x + e.w / 2);
        }
        g.enemies = g.enemies.filter(e => !e.dead);
      }
      function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
      function damageEnemy(e, dmg, id) {
        if (e.hitBy === id) return;
        e.hitBy = id; e.hp -= dmg; e.flash = 8; e.x += (g.p.face) * 3;
        if (e.hp <= 0) {
          e.dead = true; snd.kill(); addScore(e.pts); pop(e.x + 6, e.y, String(e.pts));
          debris(e.x + 6, e.y + 6, '#ffffff', 5);
          if (Math.random() < 0.15) g.items.push({ kind: Math.random() < 0.5 ? 'gem' : 'heart', x: e.x, y: e.y, w: 10, h: 10, vx: 0, vy: -2, t: 0 });
        } else snd.hit();
      }

      // ---------- boss ----------
      function spawnBoss() {
        const ax = lv.arenaStart * TS;
        const hp = 16 + g.world * 4 + g.loop * 10;
        g.boss = { x: ax + W - 60, y: TOP, w: 28, h: 38, vx: 0, vy: 0, hp, max: hp, t: 0, face: -1, flash: 0, hitBy: -1, state: 'drop', act: 90, onGround: false };
        g.msg = 'GUARDIAN OF ' + lv.wd.name; g.msgT = 150; snd.boss();
      }
      function updBoss() {
        const b = g.boss, p = g.p; b.t++; if (b.flash > 0) b.flash--;
        if (b.state === 'dying') {
          if (b.t % 6 === 0) { debris(b.x + Math.random() * b.w, b.y + Math.random() * b.h, ['#ffffff', '#ffd040', '#ff4020'][b.t % 3], 4); au.noise(0.15, { vol: 0.12, freq: 1200 }); }
          if (b.t > 120) { g.boss = null; worldClear(); }
          return;
        }
        const dxp = (p.x + p.w / 2) - (b.x + b.w / 2);
        if (b.onGround) {
          b.face = Math.sign(dxp) || b.face;
          b.vx = b.face * (0.5 + g.world * 0.07);
          if (--b.act <= 0) {
            const r = Math.random();
            b.act = Math.max(50, 110 - g.world * 7);
            if (r < 0.4) { b.vy = -6; b.vx = b.face * 1.6; snd.jump(); }
            else {
              snd.fire();
              const n = 1 + Math.min(3, (g.world >> 1) + 1);
              for (let i = 0; i < n; i++) g.eshots.push({ kind: 'fire', x: b.x + b.w / 2, y: b.y + 10, vx: b.face * (1.6 + i * 0.4), vy: -2.5 + i * 0.8, w: 7, h: 7, grav: 0.08 });
            }
          }
        }
        b.vy = Math.min(6, b.vy + 0.25);
        moveX(b, b.onGround ? b.vx : b.vx);
        const ax = lv.arenaStart * TS;
        b.x = clamp(b.x, ax + 2, ax + W - b.w - 18);
        moveY(b, b.vy);
        if (b.onGround && b.state === 'drop') { b.state = 'fight'; au.noise(0.3, { vol: 0.2, freq: 300 }); }
        if (p.state === 'alive' && overlap(b, p)) hurtPlayer(b.x + b.w / 2);
      }
      function damageBoss(dmg, id) {
        const b = g.boss; if (!b || b.state === 'dying' || b.hitBy === id) return;
        b.hitBy = id; b.hp -= dmg; b.flash = 10; snd.hit();
        if (b.hp <= 0) {
          b.state = 'dying'; b.t = 0; g.eshots = [];
          const pts = 10000 + g.world * 5000; addScore(pts); pop(b.x + 14, b.y - 6, String(pts), '#ffff40');
          au.noise(1, { vol: 0.25, freq: 2000, slideTo: 60 });
        }
      }
      function worldClear() {
        g.phase = 'clear'; g.phaseT = 0; g.tally = Math.ceil(g.time); snd.clear();
      }

      // ---------- player ----------
      function hurtPlayer(srcX) {
        const p = g.p;
        if (p.state !== 'alive' || p.inv > 0) return;
        p.inv = 90; p.vy = -2.5; p.vx = (p.x + p.w / 2 < srcX ? -1 : 1) * 1.8; p.knock = 14;
        if (p.armor) { p.armor = false; snd.lose(); debris(p.x + 5, p.y + 8, '#c0c0d0', 6); pop(p.x + 5, p.y - 8, 'ARMOR LOST', '#ff8080'); return; }
        if (p.helmet) { p.helmet = false; snd.lose(); debris(p.x + 5, p.y, '#c0c0d0', 4); return; }
        p.hp -= 2; snd.hurt();
        if (p.hp <= 0) killPlayer();
      }
      function killPlayer() {
        const p = g.p;
        if (p.state !== 'alive') return;
        p.state = 'dead'; p.t = 0; p.vy = -4; p.vx = 0; snd.die();
      }
      function playerDied() {
        if (g.reserve > 0) { g.reserve--; respawn(); return; }
        const cg = g;
        const end = () => { if (g === cg) gameOver(); };
        if (!api.offerContinue) { end(); return; }
        g.p.state = 'wait';
        api.offerContinue(() => { if (g === cg) { g.reserve = 2; respawn(); } }, end);
      }
      function respawn() {
        g.p = newPlayer();
        g.time = Math.max(g.time, 120);
        g.eshots = []; g.shots = [];
        if (g.camLock) { g.boss = null; g.camLock = false; }
        let cpc = lv.checkpoints[0];
        for (const c of lv.checkpoints) if (c * TS <= g.deathX) cpc = c;
        g.enemies = [];
        placePlayer(cpc);
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300; g.p.state = 'gone';
        au.melody([[392, .25], [349, .25], [330, .25], [262, .6]], { type: 'square', vol: 0.08 });
      }
      function attack() {
        const p = g.p, wp = WEAPONS[p.weapon];
        if (p.atk > 0) return;
        p.atk = wp.dur; p.atkId++; snd.swing();
        if (wp.shoot) {
          if (g.shots.length < 3) g.shots.push({ x: p.x + (p.face > 0 ? p.w : -8), y: p.y + (p.crouch ? 12 : 8), vx: p.face * 4.5, w: 8, h: 2, id: p.atkId * 1000 + g.shots.length, life: 60 });
        }
      }
      function attackBox() {
        const p = g.p, wp = WEAPONS[p.weapon];
        if (p.atk <= 0 || wp.shoot) return null;
        const k = 1 - p.atk / wp.dur;
        if (k < 0.15 || k > 0.8) return null;
        const y = p.crouch ? p.y + 10 : p.y + 6, hgt = p.weapon === 'chain' || p.weapon === 'hammer' ? 12 : 8;
        const x = p.face > 0 ? p.x + p.w : p.x - wp.range;
        return { x, y: p.weapon === 'kick' ? p.y + 12 : y, w: wp.range, h: hgt };
      }
      function updPlayer() {
        const p = g.p;
        if (p.state === 'dead') {
          p.t++; p.vy = Math.min(6, p.vy + 0.25); p.y += p.vy;
          if (p.t === 120) { g.deathX = p.x; playerDied(); }
          return;
        }
        if (p.state !== 'alive') return;
        if (p.inv > 0) p.inv--;
        const ice = lv.wd.ice;
        const left = api.key('ArrowLeft'), right = api.key('ArrowRight');
        p.crouch = api.key('ArrowDown') && p.onGround;
        const spd = 1.5;
        let target = 0;
        if (!p.crouch && p.knock <= 0) { if (left) target = -spd; if (right) target = spd; }
        if (left && !right) p.face = -1; else if (right && !left) p.face = 1;
        if (p.knock > 0) p.knock--;
        else { const acc = ice && p.onGround ? 0.04 : p.onGround ? 0.3 : 0.15; p.vx += clamp(target - p.vx, -acc, acc); }
        if (p.onGround && api.anyPressed('KeyX', 'ArrowUp') && !p.crouch) { p.vy = p.boots ? -6.6 : -5.6; p.onGround = false; snd.jump(); }
        if (!p.onGround && p.vy < -2 && !api.key('KeyX') && !api.key('ArrowUp')) p.vy = -2;
        if (api.pressed('Space')) attack();
        if (p.atk > 0) p.atk--;
        p.vy = Math.min(6, p.vy + 0.27);
        moveX(p, p.vx);
        // camera bounds
        if (p.x < g.cam) { p.x = g.cam; p.vx = 0; }
        moveY(p, p.vy);
        if (p.bonk && p.helmet) breakTile(p.bonk.c, p.bonk.r, false);
        else if (p.bonk) snd.clank();
        if (p.onGround || Math.abs(p.vx) > 0.2) p.anim += Math.abs(p.vx);
        // spikes
        const fc = Math.floor((p.x + p.w / 2) / TS), fr = Math.floor((p.y + p.h - 2 - TOP) / TS);
        if (tileAt(fc, fr) === '^' && p.inv <= 0) hurtPlayer(p.x + p.w / 2 - p.face);
        if (p.y > H + 8) { p.y = H + 8; killPlayer(); p.vy = 0; }
        // attack hits
        const box = attackBox();
        if (box) {
          for (const e of g.enemies) if (!e.dead && overlap(box, e)) damageEnemy(e, WEAPONS[p.weapon].dmg, p.atkId);
          if (g.boss && overlap(box, g.boss)) damageBoss(WEAPONS[p.weapon].dmg, p.atkId);
          const c0 = Math.floor(box.x / TS), c1 = Math.floor((box.x + box.w - 1) / TS);
          const r0 = Math.floor((box.y - TOP) / TS), r1 = Math.floor((box.y + box.h - 1 - TOP) / TS);
          if (p.lastBreak !== p.atkId) for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) if (breakTile(c, r, !!WEAPONS[p.weapon].hard)) p.lastBreak = p.atkId;
        }
        // items
        for (const it of g.items) if (!it.dead && it.t > 10 && overlap(it, p)) { it.dead = true; collect(it.kind, it); }
        // camera
        if (!g.camLock) {
          const want = p.x - 96;
          if (want > g.cam) g.cam = Math.min(want, lv.cols * TS - W);
          if (p.x >= lv.arenaStart * TS + 24 && !g.boss) {
            g.camLock = true; spawnBoss();
          }
        } else if (g.cam < lv.arenaStart * TS) g.cam = Math.min(lv.arenaStart * TS, g.cam + 2);
        if (g.camLock && p.x > g.cam + W - p.w - 2) { p.x = g.cam + W - p.w - 2; p.vx = 0; }
      }
      function collect(kind, it) {
        const p = g.p;
        if (WEAPONS[kind]) { p.weapon = kind; snd.equip(); addScore(200); pop(it.x, it.y - 8, WEAPONS[kind].name, '#ffff60'); return; }
        switch (kind) {
          case 'helmet': p.helmet = true; snd.equip(); break;
          case 'armor': p.armor = true; snd.equip(); break;
          case 'shield': p.shield = true; snd.equip(); break;
          case 'boots': p.boots = true; snd.equip(); break;
          case 'heart': p.hp = Math.min(p.maxhp, p.hp + 2); snd.item(); break;
          case 'clock': g.time = Math.min(999, g.time + 30); snd.item(); pop(it.x, it.y - 8, '+30', '#40ffff'); return;
          case 'gem': addScore(500); snd.item(); pop(it.x, it.y - 8, '500'); return;
          case 'harp': addScore(1000); snd.item(); pop(it.x, it.y - 8, '1000'); return;
          case 'oneup': g.reserve++; snd.oneup(); pop(it.x, it.y - 8, '1UP', '#40ff40'); return;
        }
        addScore(100); pop(it.x, it.y - 8, kind.toUpperCase(), '#ffff60');
      }
      function updShots() {
        for (const s of g.shots) {
          s.x += s.vx; s.life--;
          if (s.life <= 0 || s.x < g.cam - 10 || s.x > g.cam + W + 10) { s.dead = true; continue; }
          const tx = s.vx > 0 ? s.x + s.w : s.x;
          if (solidAt(tx, s.y)) { breakTile(Math.floor(tx / TS), Math.floor((s.y - TOP) / TS), false); s.dead = true; continue; }
          for (const e of g.enemies) if (!e.dead && overlap(s, e)) { damageEnemy(e, 2, s.id); s.dead = true; break; }
          if (!s.dead && g.boss && overlap(s, g.boss)) { damageBoss(2, s.id); s.dead = true; }
        }
        g.shots = g.shots.filter(s => !s.dead);
        const p = g.p;
        for (const s of g.eshots) {
          if (s.grav) s.vy += s.grav;
          s.x += s.vx; s.y += s.vy;
          if (s.x < g.cam - 20 || s.x > g.cam + W + 20 || s.y > H) { s.dead = true; continue; }
          if (s.kind === 'arrow' && solidAt(s.x + 4, s.y)) { s.dead = true; continue; }
          if (s.kind === 'fire' && solidAt(s.x + 3, s.y + 6)) { s.vy = -Math.abs(s.vy) * 0.6; if (Math.abs(s.vy) < 0.8) s.dead = true; }
          if (p.state === 'alive' && overlap(s, p)) {
            const fromFront = (s.vx < 0 && p.face > 0) || (s.vx > 0 && p.face < 0);
            if (p.shield && fromFront && p.atk <= 0) { s.dead = true; snd.clank(); debris(s.x, s.y, '#ffffff', 2); continue; }
            s.dead = true; hurtPlayer(s.x);
          }
        }
        g.eshots = g.eshots.filter(s => !s.dead);
      }
      function updItems() {
        for (const it of g.items) {
          it.t++;
          it.vy = Math.min(4, it.vy + 0.2);
          moveY(it, it.vy);
          if (it.t > 600 || it.y > H) it.dead = true;
        }
        g.items = g.items.filter(it => !it.dead);
        for (const q of g.parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.2; q.t--; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const pp of g.pops) { pp.t--; pp.y -= 0.4; }
        g.pops = g.pops.filter(pp => pp.t > 0);
      }

      // ---------- main update ----------
      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        if (g.msgT > 0) g.msgT--;
        if (g.phase === 'over') {
          g.phaseT--; updItems();
          if (g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'clear') {
          g.phaseT++; updItems();
          if (g.phaseT > 60 && g.tally > 0 && g.phaseT % 2 === 0) { g.tally--; g.time = g.tally; addScore(10); snd.tick(); }
          if (g.tally <= 0 && g.phaseT > 60) { g.phaseT2 = (g.phaseT2 || 0) + 1; if (g.phaseT2 > 150) { g.phaseT2 = 0; nextWorld(); } }
          return;
        }
        // play
        music();
        if (g.p.state === 'alive') {
          const prev = Math.ceil(g.time);
          g.time -= 1 / 60;
          if (Math.ceil(g.time) !== prev && g.time < 30) snd.warn();
          if (g.time <= 0) { g.time = 0; g.msg = 'TIME OVER'; g.msgT = 120; killPlayer(); }
        }
        spawnEnemies();
        updPlayer();
        updEnemies();
        if (g.boss) updBoss();
        updShots();
        updItems();
      }

      // ---------- render ----------
      function drawBackground(ctx, wd, cam) {
        ctx.fillStyle = wd.sky; ctx.fillRect(0, TOP, W, H - TOP);
        // far layer: hills / clouds / waves (parallax)
        const off = cam * 0.3;
        ctx.fillStyle = wd.far;
        for (let i = -1; i < 10; i++) {
          const bx = Math.floor(i * 48 - (off % 48));
          const hgt = 30 + ((i + Math.floor(off / 48)) * 37 % 5) * 8;
          ctx.beginPath(); ctx.arc(bx + 24, 150 - hgt + 40, 36, Math.PI, 0); ctx.fill();
        }
        ctx.fillRect(0, 150, W, H - 150);
        const off2 = cam * 0.6;
        ctx.fillStyle = wd.far2;
        for (let i = -1; i < 12; i++) {
          const bx = Math.floor(i * 32 - (off2 % 32));
          const k = (i + Math.floor(off2 / 32)) & 3;
          ctx.fillRect(bx + 10, 140 - k * 6, 12, 90);
          ctx.beginPath(); ctx.arc(bx + 16, 140 - k * 6, 14, 0, 7); ctx.fill();
        }
      }
      function drawTiles(ctx) {
        const c0 = Math.floor(g.cam / TS), c1 = Math.min(lv.cols - 1, c0 + 17);
        for (let c = c0; c <= c1; c++) {
          const x = Math.round(c * TS - g.cam);
          for (let r = 0; r < ROWS; r++) {
            const t = lv.map[r][c]; if (t === '.') continue;
            const y = TOP + r * TS;
            let im;
            if (t === '#') im = (r === 0 || lv.map[r - 1][c] !== '#') ? TILES.top : TILES.dirt;
            else if (t === 'B') im = TILES.brick; else if (t === 'H') im = TILES.hard; else if (t === '^') im = TILES.spike;
            if (im) ctx.drawImage(im, x, y);
          }
        }
      }
      function drawItem(ctx, kind, x, y, t) {
        x = Math.round(x); y = Math.round(y);
        if (t > 480 && (t & 4)) return;
        const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
        switch (kind) {
          case 'club': R(2, 7, 2, 3, '#804000'); R(3, 1, 4, 7, '#c07030'); R(4, 0, 2, 1, '#c07030'); break;
          case 'sword': R(4, 0, 2, 7, '#e0e0ff'); R(2, 7, 6, 1, '#ffd040'); R(4, 8, 2, 2, '#804000'); break;
          case 'chain': R(1, 1, 1, 1, '#a0a0a0'); R(2, 2, 1, 1, '#a0a0a0'); R(3, 3, 1, 1, '#a0a0a0'); R(4, 4, 5, 5, '#606070'); R(5, 5, 2, 2, '#c0c0d0'); R(0, 0, 2, 2, '#804000'); break;
          case 'hammer': R(4, 3, 2, 7, '#804000'); R(1, 0, 8, 4, '#909090'); R(1, 0, 8, 1, '#d0d0d0'); break;
          case 'bow': R(2, 0, 2, 10, '#c08040'); R(4, 0, 1, 1, '#c08040'); R(4, 9, 1, 1, '#c08040'); R(6, 1, 1, 8, '#ffffff'); break;
          case 'helmet': R(1, 2, 8, 6, '#c0c0d0'); R(2, 1, 6, 1, '#c0c0d0'); R(4, 0, 2, 2, '#ff4040'); R(2, 5, 6, 1, '#606070'); break;
          case 'armor': R(1, 1, 8, 8, '#c0c0d0'); R(3, 1, 4, 2, '#404050'); R(2, 4, 6, 1, '#808090'); break;
          case 'shield': R(1, 0, 8, 7, '#4060ff'); R(2, 7, 6, 2, '#4060ff'); R(4, 9, 2, 1, '#4060ff'); R(4, 2, 2, 5, '#ffd040'); R(2, 3, 6, 2, '#ffd040'); break;
          case 'boots': R(2, 0, 4, 7, '#c06020'); R(2, 7, 7, 3, '#c06020'); R(2, 0, 4, 1, '#ffd040'); break;
          case 'heart': R(1, 1, 3, 3, '#ff2040'); R(6, 1, 3, 3, '#ff2040'); R(0, 2, 10, 3, '#ff2040'); R(1, 5, 8, 2, '#ff2040'); R(3, 7, 4, 2, '#ff2040'); R(2, 2, 1, 1, '#ffffff'); break;
          case 'clock': R(1, 0, 8, 1, '#ffd040'); R(1, 9, 8, 1, '#ffd040'); R(2, 1, 6, 3, '#80e0ff'); R(4, 4, 2, 2, '#80e0ff'); R(2, 6, 6, 3, '#ffe080'); break;
          case 'gem': R(3, 0, 4, 1, '#80ffff'); R(1, 1, 8, 3, '#40c0ff'); R(2, 4, 6, 2, '#2080ff'); R(3, 6, 4, 2, '#2060e0'); R(4, 8, 2, 1, '#2060e0'); R(3, 1, 2, 1, '#ffffff'); break;
          case 'harp': R(1, 0, 2, 10, '#ffd040'); R(1, 0, 8, 2, '#ffd040'); R(7, 2, 2, 8, '#ffd040'); R(3, 2, 1, 8, '#ffffff'); R(5, 2, 1, 8, '#ffffff'); R(1, 8, 8, 2, '#ffd040'); break;
          case 'oneup': R(0, 0, 10, 10, '#40c040'); text(ctx, '1', x + 3, y + 1, '#ffffff'); break;
        }
      }
      function drawAthena(ctx, p, sx, sy) {
        const f = p.face > 0 ? 0 : 1;
        let key = 'stand';
        const wp = p.weapon, attacking = p.atk > 0;
        if (p.state === 'dead') key = 'jump';
        else if (p.crouch) key = attacking ? 'catk' : 'crouch';
        else if (attacking) key = wp === 'kick' ? 'kick' : (p.onGround ? 'atk' : 'jatk');
        else if (!p.onGround) key = 'jump';
        else if (Math.abs(p.vx) > 0.3) key = ((p.anim / 10 | 0) % 2) ? 'walk1' : 'walk2';
        const im = ATH[key][f];
        const dy = p.crouch ? p.h - im.height : 0;
        const x = Math.round(sx - 1), y = Math.round(sy + dy);
        ctx.drawImage(im, x, y);
        const fx = (a, w) => f ? x + 12 - a - w : x + a; // mirror helper
        if (p.helmet) { ctx.fillStyle = '#c0c0d0'; ctx.fillRect(fx(2, 8), y, 8, 3); ctx.fillStyle = '#ff4040'; ctx.fillRect(fx(5, 2), y - 2, 2, 2); }
        if (p.armor) { ctx.fillStyle = '#c0c0d0'; ctx.fillRect(fx(4, 4), y + 6, 4, 3); ctx.fillRect(fx(4, 4), y + 13, 4, 2); ctx.fillStyle = '#808098'; ctx.fillRect(fx(4, 4), y + 8, 4, 1); }
        if (p.boots && key !== 'crouch' && key !== 'catk') { ctx.fillStyle = '#ffd040'; ctx.fillRect(x, y + im.height - 2, 12, 1); }
        if (p.shield && !attacking) { ctx.fillStyle = '#4060ff'; ctx.fillRect(fx(10, 3), y + 7, 3, 8); ctx.fillStyle = '#ffd040'; ctx.fillRect(fx(11, 1), y + 9, 1, 4); }
        // weapon
        if (attacking && wp !== 'kick') {
          const W8 = WEAPONS[wp], k = 1 - p.atk / W8.dur;
          const hx = f ? x : x + 12, hy = y + 9;
          const dir = f ? -1 : 1;
          const ext = Math.min(1, k * 2.2);
          const len = (W8.range || 8) * ext;
          if (wp === 'club') { ctx.fillStyle = '#c07030'; ctx.fillRect(dir > 0 ? hx : hx - len, hy - 2, len, 4); ctx.fillStyle = '#804000'; ctx.fillRect(dir > 0 ? hx : hx - 3, hy - 1, 3, 2); }
          else if (wp === 'sword') { ctx.fillStyle = '#e8e8ff'; ctx.fillRect(dir > 0 ? hx + 2 : hx - len, hy - 1, len - 2, 2); ctx.fillStyle = '#ffd040'; ctx.fillRect(hx - 1, hy - 3, 2, 6); }
          else if (wp === 'chain') {
            const a = (k - 0.5) * 1.6;
            for (let i = 1; i < 6; i++) { ctx.fillStyle = '#a0a0a0'; ctx.fillRect(Math.round(hx + dir * Math.cos(a) * len * i / 6), Math.round(hy + Math.sin(a) * len * i / 6), 1, 1); }
            const bx = hx + dir * Math.cos(a) * len, by = hy + Math.sin(a) * len;
            ctx.fillStyle = '#505060'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, 7); ctx.fill();
            ctx.fillStyle = '#c0c0d0'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 2, 2);
          } else if (wp === 'hammer') {
            ctx.fillStyle = '#804000'; ctx.fillRect(dir > 0 ? hx : hx - len, hy - 1, len, 2);
            ctx.fillStyle = '#a0a0a8'; ctx.fillRect(dir > 0 ? hx + len - 5 : hx - len, hy - 6, 5, 12);
          } else if (wp === 'bow') {
            ctx.fillStyle = '#c08040'; ctx.fillRect(hx + (dir > 0 ? 0 : -2), hy - 6, 2, 12);
          }
        }
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x - g.cam), y = Math.round(e.y);
        let k = e.kind;
        if ((k === 'pig' || k === 'slime' || k === 'bat') && ((e.t >> 3) & 1)) k = k + '2';
        if (k === 'slime' && !e.onGround) k = 'slime2';
        const im = ESP[k][e.face > 0 ? 1 : 0];
        const yy = y + e.h - im.height;
        ctx.drawImage(im, x, yy);
        if (e.kind === 'knight') { ctx.fillStyle = '#e0e0f0'; const sx = e.face > 0 ? x + 12 : x - 6; ctx.fillRect(sx, yy + 6, 6, 1); ctx.fillStyle = '#ffd040'; ctx.fillRect(e.face > 0 ? x + 11 : x, yy + 5, 1, 3); }
        if (e.kind === 'skel') { ctx.fillStyle = '#c08040'; ctx.fillRect(e.face > 0 ? x + 11 : x, yy + 3, 1, 8); }
        if (e.flash & 2) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x, yy, im.width, im.height); }
      }
      function drawBoss(ctx, b) {
        const x = Math.round(b.x - g.cam), y = Math.round(b.y), f = b.face;
        if (b.state === 'dying' && (b.t & 4)) return;
        const hue = [20, 270, 190, 50, 210, 30, 0, 300][g.world];
        const body = b.flash & 2 ? '#ffffff' : 'hsl(' + hue + ',55%,45%)', dark = 'hsl(' + hue + ',55%,25%)', lite = 'hsl(' + hue + ',60%,70%)';
        // legs
        const step = b.onGround && Math.abs(b.vx) > 0.1 ? ((b.t >> 3) & 1) * 3 : 0;
        ctx.fillStyle = dark; ctx.fillRect(x + 4, y + 28 - step, 7, 10 + step); ctx.fillRect(x + 17, y + 28 + step - 3, 7, 13 - step);
        // body
        ctx.fillStyle = body; ctx.fillRect(x + 2, y + 10, 24, 20); ctx.fillRect(x + 6, y + 6, 16, 4);
        ctx.fillStyle = lite; ctx.fillRect(x + 4, y + 12, 20, 2);
        ctx.fillStyle = dark; ctx.fillRect(x + 2, y + 24, 24, 3);
        // head with horns and single eye
        ctx.fillStyle = body; ctx.fillRect(x + 8, y, 12, 8);
        ctx.fillStyle = '#f0f0d0'; ctx.fillRect(x + 5, y - 4, 3, 5); ctx.fillRect(x + 20, y - 4, 3, 5);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 11 + f, y + 2, 6, 4);
        ctx.fillStyle = (b.t & 16) ? '#ff2020' : '#ffd000'; ctx.fillRect(x + 13 + f * 2, y + 3, 2, 2);
        ctx.fillStyle = dark; ctx.fillRect(x + 11, y + 7, 6, 1);
        // arms + club
        const ax = f > 0 ? x + 24 : x - 4;
        ctx.fillStyle = body; ctx.fillRect(ax, y + 12, 8, 5);
        ctx.fillStyle = '#805020'; ctx.fillRect(f > 0 ? ax + 6 : ax - 2, y + 2, 4, 16);
        ctx.fillStyle = '#a07040'; ctx.fillRect(f > 0 ? ax + 5 : ax - 3, y, 6, 6);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        text(ctx, '1P', 4, 1, '#ff4040', { adv: 6 });
        text(ctx, String(g ? g.score : 0).padStart(7, ' '), 64, 1, '#ffffff', { right: true, adv: 6 });
        text(ctx, 'HI', 72, 1, '#ff4040', { adv: 6 });
        text(ctx, String(hi), 130, 1, '#ffffff', { right: true, adv: 6 });
        if (!g || mode === 'title') return;
        const p = g.p;
        text(ctx, 'STR', 4, 9, '#ffd040', { adv: 5, scale: 1 });
        for (let i = 0; i < p.maxhp; i++) { ctx.fillStyle = i < p.hp ? '#ff3040' : '#402020'; ctx.fillRect(24 + i * 5, 9, 4, 5); }
        const tcol = g.time < 30 && (frame & 16) ? '#ff2020' : '#ffffff';
        text(ctx, 'TIME', 140, 1, '#40ffff', { adv: 6 });
        text(ctx, String(Math.max(0, Math.ceil(g.time))).padStart(3, '0'), 186, 1, tcol, { adv: 6 });
        text(ctx, 'W' + (g.world + 1), 210, 1, '#ffd040', { adv: 6 });
        for (let i = 0; i < Math.min(5, g.reserve); i++) { ctx.fillStyle = '#ff5020'; ctx.fillRect(232 + i * 5, 2, 3, 3); ctx.fillStyle = '#ffc8a0'; ctx.fillRect(232 + i * 5, 5, 3, 2); }
        text(ctx, WEAPONS[p.weapon].name, 60, 9, '#c0c0ff', { adv: 5 });
        let ex = 140;
        for (const k of ['helmet', 'armor', 'shield', 'boots']) { if (p[k]) { ctx.save(); ctx.translate(ex, 9); ctx.scale(0.6, 0.6); drawItem(ctx, k, 0, 0, 0); ctx.restore(); ex += 8; } }
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#100418'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { const sx = (i * 73 + frame * (1 + (i & 1)) * 0.2) % W, sy = (i * 41) % H; ctx.fillStyle = (i + (frame >> 4)) % 3 ? '#504070' : '#ffffff'; ctx.fillRect(sx | 0, sy, 1, 1); }
        const page = Math.floor(titleT / 420) % 3;
        const ly = 24;
        text(ctx, 'ATHENA', W / 2 + 3, ly + 3, '#400010', { center: true, scale: 5, bold: true });
        const bands = [[0, 10, '#fff080'], [10, 22, '#ffa020'], [22, 35, '#e03010']];
        for (const [a, b, c] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'ATHENA', W / 2, ly, c, { center: true, scale: 5, bold: true }); ctx.restore(); }
        if (page === 0) {
          ctx.drawImage(BIG_ATHENA, 30, 76);
          text(ctx, 'PRINCESS ATHENA', 80, 84, '#ff8080');
          text(ctx, 'LEAVES HER CASTLE', 80, 96, '#ffffff', { adv: 7 });
          text(ctx, 'FOR THE FANTASY', 80, 106, '#ffffff', { adv: 7 });
          text(ctx, 'WORLD. FIND ARMS', 80, 116, '#ffffff', { adv: 7 });
          text(ctx, 'IN THE BLOCKS AND', 80, 126, '#ffffff', { adv: 7 });
          text(ctx, 'BEAT THE CLOCK!', 80, 136, '#ffffff', { adv: 7 });
        } else if (page === 1) {
          text(ctx, '- ITEMS -', W / 2, 70, '#40ffff', { center: true, bold: true });
          const ks = ['club', 'sword', 'chain', 'hammer', 'bow', 'helmet', 'armor', 'shield', 'boots', 'heart', 'clock', 'harp'];
          ks.forEach((k, i) => {
            const cx = i < 6 ? 8 : 132, cy = 84 + (i % 6) * 13;
            drawItem(ctx, k, cx, cy, 0);
            text(ctx, ITEM_INFO[k].split(' - ')[0], cx + 14, cy + 2, '#ffffff', { adv: 6 });
          });
        } else {
          text(ctx, '- WORLDS -', W / 2, 70, '#40ffff', { center: true, bold: true });
          WORLDS.forEach((w, i) => text(ctx, (i + 1) + ' ' + w.name, i < 4 ? 30 : 140, 86 + (i % 4) * 12, w.top === '#ffffff' ? '#c0e0ff' : w.top, { adv: 7 }));
          text(ctx, 'HI SCORE ' + hi, W / 2, 140, '#ff8080', { center: true });
        }
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', W / 2, 168, coinFlash > 0 && ((frame >> 2) & 1) ? '#ffff00' : '#ff4040', { center: true, bold: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 168, '#ffffff', { center: true, bold: true });
        text(ctx, '\u00a9 1986 SNK', W / 2, 190, '#c0c0c0', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, H - 10, '#ffffff', { adv: 7 });
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        const p = g.p;
        drawBackground(ctx, lv.wd, g.cam);
        drawTiles(ctx);
        for (const it of g.items) drawItem(ctx, it.kind, it.x - g.cam, it.y, it.t);
        for (const e of g.enemies) drawEnemy(ctx, e);
        if (g.boss) drawBoss(ctx, g.boss);
        if ((p.state === 'alive' && (p.inv <= 0 || (frame & 2))) || p.state === 'dead') drawAthena(ctx, p, p.x - g.cam, p.y);
        for (const s of g.shots) { const x = Math.round(s.x - g.cam); ctx.fillStyle = '#c08040'; ctx.fillRect(x, Math.round(s.y), 8, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(s.vx > 0 ? x + 6 : x, Math.round(s.y) - 1, 2, 3); }
        for (const s of g.eshots) {
          const x = Math.round(s.x - g.cam), y = Math.round(s.y);
          if (s.kind === 'arrow') { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x, y, 8, 1); ctx.fillStyle = '#ff4040'; ctx.fillRect(s.vx > 0 ? x + 6 : x, y - 1, 2, 3); }
          else { ctx.fillStyle = (frame & 4) ? '#ffd040' : '#ff4020'; ctx.beginPath(); ctx.arc(x + 3, y + 3, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 2, 2, 2); }
        }
        for (const q of g.parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x - g.cam), Math.round(q.y), 3, 3); }
        for (const pp of g.pops) text(ctx, pp.txt, pp.x - g.cam, pp.y, pp.col, { center: true, adv: 6 });
        if (g.boss && g.boss.state !== 'dying') {
          const b = g.boss;
          ctx.fillStyle = '#000'; ctx.fillRect(W - 70, 20, 64, 6);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(W - 69, 21, Math.max(0, 62 * b.hp / b.max), 4);
        }
        if (g.phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 80, W, 50);
          text(ctx, 'WORLD ' + (g.world + 1) + (g.loop ? '-' + (g.loop + 1) : ''), W / 2, 90, '#ffd040', { center: true, bold: true });
          text(ctx, 'WORLD OF ' + lv.wd.name, W / 2, 108, '#ffffff', { center: true });
        }
        if (g.msgT > 0) text(ctx, g.msg, W / 2, 60, '#ffff40', { center: true, bold: true });
        if (g.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 70, W, 60);
          text(ctx, 'WORLD ' + (g.world + 1) + ' CLEAR', W / 2, 80, '#40ffff', { center: true, bold: true });
          text(ctx, 'TIME BONUS ' + g.tally + ' X 10', W / 2, 100, '#ffffff', { center: true });
        }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 100, '#ff4040', { center: true, bold: true, scale: 2 });
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g, lv: () => lv });
      return { update, render, destroy() { } };
    }
  });
})();
