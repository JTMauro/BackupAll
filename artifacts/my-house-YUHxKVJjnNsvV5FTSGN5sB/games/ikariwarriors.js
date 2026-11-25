// Ikari Warriors (SNK, 1986) \u2014 built-in recreation for the MAME32 Game Room. Fight north through the jungle with limited bullets and grenades, commandeer tanks (watch the fuel) and blast open the enemy gate.
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
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '=': '00001F001F0000', '+': '0004041F040400', 'x': '00110A040A1100', '>': '08040201020408',
    '<': '02040810080402', '#': '0A1F0A0A1F0A00', '*': '00150E1F0E1500', '%': '19190204081313'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  // text(ctx, str, x, y, colour, {scale, center, right, shadow})
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = (o.adv || 8) * sc; s = String(s);
    if (s.toUpperCase) s = s.replace(/[a-wyz]/g, c => c.toUpperCase());
    const w = s.length * adv - (adv - 5 * sc);
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    if (o.shadow) { const sh = o.shadow; o.shadow = null; text(ctx, s, x + sc, y + sc, sh, { scale: sc, adv: o.adv }); }
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, sc, sc); }
    }
  }
  function mkRng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const TAU = Math.PI * 2;
  // build a sprite canvas from rows of chars + palette {char: colour}; flip mirrors horizontally
  function spr(rows, pal, flip) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(flip ? w - 1 - i : i, y, 1, 1); } } });
    return c;
  }
  // rotate a char-grid (nearest neighbour) so the art (drawn facing UP) faces angle a (radians, 0 = right)
  function rotRows(rows, a) {
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const N = Math.ceil(Math.sqrt(w * w + h * h)) | 1;
    const r = a + Math.PI / 2, cs = Math.cos(r), sn = Math.sin(r);
    const out = [];
    for (let y = 0; y < N; y++) {
      let line = '';
      for (let x = 0; x < N; x++) {
        const dx = x - (N - 1) / 2, dy = y - (N - 1) / 2;
        const sx = Math.round(dx * cs + dy * sn + (w - 1) / 2), sy = Math.round(-dx * sn + dy * cs + (h - 1) / 2);
        line += (sy >= 0 && sy < h && sx >= 0 && sx < w) ? (rows[sy][sx] || '.') : '.';
      }
      out.push(line);
    }
    return out;
  }
  // n rotations of an UP-facing sprite: index 0 faces right, increasing clockwise
  function rotSet(rows, pal, n) { const a = []; for (let i = 0; i < n; i++) a.push(spr(rotRows(rows, i / n * TAU), pal)); return a; }
  function angIdx(a, n) { return ((Math.round(a / TAU * n) % n) + n) % n; }
  function drawC(ctx, im, x, y) { ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height / 2)); }
  const DIR8 = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
  function dir8Of(dx, dy) { return angIdx(Math.atan2(dy, dx), 8); }
  function boxHit(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }
  function coinOp(api) {
    // shared attract helper: returns true if a credit was used
    return api.useCredit();
  }
  function pad2(n) { return String(Math.min(99, n)).padStart(2, '0'); }
  const CFG = {
    id: 'ikariwarriors', title: 'Ikari Warriors', year: 1986, maker: 'SNK', seed: 101,
    controls: 'Arrows: run (aim follows) \u00b7 Space: fire (hold) \u00b7 X: grenade / bail out of tank \u00b7 Z (hold): lock aim \u00b7 Enter: start',
    marquee: { bg: '#200800', fg: '#ff3018', accent: '#ffd800' },
    hiDefault: 50000, ammo: true, hostages: false, heliFrom: 1,
    bosses: ['gate'], extra: [50000, 100000],
    themes: [
      { name: 'JUNGLE LANDING ZONE', g1: '#4a7a30', g2: '#3a6424', g3: '#7ab048', tree: '#2c7a2c', tree2: '#1a4a1a', tree3: '#5ab04a', water: '#2a5a9a', water2: '#6a9ad8', bank: '#7a6038', ruin: '#9a9080', ruin2: '#5a5448', treeDen: 0.32, feats: ['jungle', 'jungle', 'river', 'wall', 'rocks', 'sand'] },
      { name: 'RIVER VALLEY', g1: '#5a7a38', g2: '#4a6a2c', g3: '#8ab058', tree: '#3a8a3a', tree2: '#1e5a1e', tree3: '#6ac05a', water: '#20508a', water2: '#5a8ac8', bank: '#8a7040', ruin: '#9a9080', ruin2: '#5a5448', treeDen: 0.25, feats: ['river', 'jungle', 'river', 'sand', 'wall', 'rocks'] },
      { name: 'TEMPLE RUINS', g1: '#7a7048', g2: '#6a6038', g3: '#9a9058', tree: '#3a7a2a', tree2: '#204a18', tree3: '#5aa04a', water: '#2a5a8a', water2: '#6a9ad0', bank: '#6a5a38', ruin: '#b0a088', ruin2: '#6a6050', treeDen: 0.2, feats: ['ruins', 'ruins', 'jungle', 'wall', 'sand', 'river'] },
      { name: 'ENEMY STRONGHOLD', g1: '#8a7a50', g2: '#7a6a40', g3: '#a89a68', tree: '#4a7a2a', tree2: '#2a4a1a', tree3: '#6a9a3a', water: '#2a4a7a', water2: '#5a7ab0', bank: '#6a5a38', ruin: '#a0a0a0', ruin2: '#5a5a5a', treeDen: 0.15, feats: ['wall', 'sand', 'ruins', 'rocks', 'wall', 'jungle'] }
    ],
    playerPal: { skin: '#e8a070', body: '#e8a070', belt: '#6a4a20', legs: '#3a5a9a', hair: '#201810', band: '#e82020', gun: '#202020' },
    enemyPal: { skin: '#e0a070', body: '#4a5ab8', belt: '#2a3070', legs: '#3a4890', hair: '#201810', hat: '#3a4aa0', gun: '#202020' },
    grenPal: { skin: '#e0a070', body: '#6a8ad0', belt: '#2a3070', legs: '#4a5aa0', hair: '#201810', hat: '#5a7ac0', gun: '#202020' },
    officerPal: { skin: '#e0a070', body: '#c8c8d0', belt: '#202020', legs: '#3a3a48', hair: '#201810', hat: '#d02020', gun: '#202020' },
    hostagePal: { skin: '#e0a070', body: '#f0f0f0', legs: '#c0c0b0', hair: '#201810' },
    tankCol: ['#7a8a40', '#4a5a28'], etankCol: ['#5a6a9a', '#3a4a70'], heliCol: '#4a5a7a',
    itemCol: { B: '#ffe040', G: '#60e060', F: '#ff8040', S: '#60e0ff', L: '#ff60ff' },
    weaponNames: {},
    points: { soldier: 100, grenadier: 200, officer: 500, tank: 2000, heli: 3000, pillbox: 1000, boss: 10000, hostage: 0 },
    scoreTable: [['SOLDIER', 100], ['GRENADIER', 200], ['OFFICER', 500], ['PILLBOX', 1000], ['TANK', 2000], ['HELICOPTER', 3000], ['GATE', 10000]],
    startTune: [[294, .12], [294, .12], [392, .24], [294, .12], [392, .12], [440, .24], [466, .12], [440, .12], [392, .4]],
    titleBg: '#1a1008', tagline: 'RALF FIGHTS BEHIND ENEMY LINES',
    copyright: '\u00a9 1986 SNK (RECREATION)', gateSign: 'GATE', clearMsg: 'THE GATE IS DOWN! ADVANCE!',
    bossMsg: () => 'DESTROY THE GATE!',
    logo(ctx, t, frame) {
      const shake = t < 40 ? ((t & 2) - 1) : 0;
      ctx.fillStyle = '#601000'; ctx.fillRect(0, 38, W, 4); ctx.fillRect(0, 112, W, 4);
      text(ctx, 'IKARI', 112 + 3 + shake, 46 + 3, '#000', { center: true, scale: 4 });
      text(ctx, 'IKARI', 112 + shake, 46, '#ffd800', { center: true, scale: 4 });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 60, W, 14); ctx.clip(); text(ctx, 'IKARI', 112 + shake, 46, '#ff3018', { center: true, scale: 4 }); ctx.restore();
      text(ctx, 'WARRIORS', 112 + 2, 82 + 2, '#000', { center: true, scale: 2 });
      text(ctx, 'WARRIORS', 112, 82, '#ffffff', { center: true, scale: 2 });
    }
  };
  // ================= Top-down run-and-gun engine =================
  const W = 224, H = 256, CS = 16, COLS = 14;
  // cell types
  const C_GROUND = 0, C_TREE = 1, C_ROCK = 2, C_WATER = 3, C_BRIDGE = 5, C_SAND = 6, C_RUIN = 7, C_FORT = 8, C_GATE = 9;
  const SOLID_FOOT = { 1: 1, 2: 1, 6: 1, 7: 1, 8: 1, 9: 1 };
  const SOLID_TANK = { 2: 1, 3: 1, 6: 1, 7: 1, 8: 1, 9: 1 };
  const SOLID_EB = { 2: 1, 7: 1 };
  const SOLID_SHOT = { 2: 1, 7: 1, 8: 1 };

  const TANKART = ['..KK........KK..', '.KDDK......KDDK.', '.KDDKMMMMMMKDDK.', '.KDDMMMMMMMMDDK.', '.KDDMmmmmmmMDDK.', '.KDDMmMMMMmMDDK.',
    '.KDDMmMMMMmMDDK.', '.KDDMmMMMMmMDDK.', '.KDDMmMMMMmMDDK.', '.KDDMmmmmmmMDDK.', '.KDDMMMMMMMMDDK.', '.KDDMMMMMMMMDDK.', '.KDDKMMMMMMKDDK.', '.KDDK......KDDK.', '..KK........KK..'];
  const HELIART = ['.......MM.......', '......MMMM......', '.....MMWWMM.....', '.....MWWWWM.....', '.....MMMMMM.....', '....MMMMMMMM....', '....MMMMMMMM....',
    '.....MMMMMM.....', '......MMMM......', '.......MM.......', '.......MM.......', '.......MM.......', '.......MM.......', '.....MMMMMM.....', '.......MM.......'];

  ArcadeRegistry.register({
    id: CFG.id, title: CFG.title, year: CFG.year, maker: CFG.maker,
    width: W, height: H, vector: false, pointer: false,
    controls: CFG.controls, marquee: CFG.marquee,
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(CFG.hiDefault);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, g = null;
      const NR = 16;
      const tankSets = {};
      function tankSet(body, dark) {
        const k = body + dark;
        if (!tankSets[k]) tankSets[k] = rotSet(TANKART, { K: '#101010', D: '#383838', M: body, m: dark }, NR);
        return tankSets[k];
      }
      const HELI = rotSet(HELIART, { M: CFG.heliCol || '#4a5a3a', W: '#80d0ff' }, NR);

      const sfx = {
        shot() { au.noise(0.035, { vol: 0.1, freq: 3200, type: 'highpass' }); au.tone(800, 0.03, { type: 'square', vol: 0.04, slideTo: 400 }); },
        flame() { au.noise(0.06, { vol: 0.08, freq: 900, type: 'lowpass' }); },
        rocket() { au.tone(200, 0.15, { type: 'sawtooth', vol: 0.07, slideTo: 600 }); },
        eshot() { au.tone(520, 0.04, { type: 'square', vol: 0.04, slideTo: 260 }); },
        throw() { au.tone(260, 0.2, { type: 'triangle', vol: 0.08, slideTo: 600 }); },
        boom() { au.noise(0.4, { vol: 0.22, freq: 900, slideTo: 70 }); },
        big() { au.noise(0.9, { vol: 0.26, freq: 700, slideTo: 40 }); },
        cannon() { au.noise(0.2, { vol: 0.2, freq: 500, slideTo: 80 }); au.tone(110, 0.15, { type: 'square', vol: 0.1, slideTo: 50 }); },
        kill() { au.tone(260, 0.07, { type: 'square', vol: 0.07, slideTo: 90 }); },
        hit() { au.tone(180, 0.04, { type: 'square', vol: 0.06 }); },
        pick() { au.melody([[784, .05], [1047, .05], [1319, .1]], { type: 'square', vol: 0.1 }); },
        rescue() { au.melody([[659, .07], [784, .07], [1047, .07], [1319, .16]], { type: 'square', vol: 0.11 }); },
        tankin() { au.melody([[196, .08], [262, .08], [330, .08], [392, .2]], { type: 'square', vol: 0.11 }); },
        alarm() { au.tone(880, 0.1, { type: 'square', vol: 0.07 }); },
        die() { au.melody([[392, .12], [349, .12], [294, .12], [196, .35]], { type: 'square', vol: 0.12 }); },
        oneup() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .14]], { type: 'square', vol: 0.1 }); },
        start() { au.melody(CFG.startTune, { type: 'square', vol: 0.11 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .25], [784, .1], [1047, .45]], { type: 'square', vol: 0.12 }); },
        warn() { au.melody([[440, .15], [330, .15], [440, .15], [330, .15]], { type: 'sawtooth', vol: 0.08 }); }
      };

      // ================= Map =================
      function buildMap(stage) {
        const r = mkRng(stage * 9173 + CFG.seed);
        const th = CFG.themes[stage % CFG.themes.length];
        const ROWS = 150 + Math.min(5, stage) * 10, L = ROWS * CS;
        const grid = new Uint8Array(ROWS * COLS);
        const set = (row, col, v) => { if (row >= 0 && row < ROWS && col >= 0 && col < COLS) grid[row * COLS + col] = v; };
        const get = (row, col) => (row >= 0 && row < ROWS && col >= 0 && col < COLS) ? grid[row * COLS + col] : 0;
        const ents = [];
        const ARENA = 16;
        let row = ROWS - 12;
        const feats = th.feats;
        let lastRiver = 999;
        while (row > ARENA + 6) {
          let f = feats[(r() * feats.length) | 0];
          if (f === 'river' && lastRiver - row < 30) f = 'jungle';
          if (f === 'river') {
            lastRiver = row;
            for (let k = 0; k < 4; k++) for (let c = 0; c < COLS; c++) set(row - k, c, C_WATER);
            const bc = 1 + ((r() * (COLS - 3)) | 0);
            for (let k = 0; k < 4; k++) { set(row - k, bc, C_BRIDGE); set(row - k, bc + 1, C_BRIDGE); }
            row -= 4 + 4;
          } else if (f === 'wall') {
            for (let c = 0; c < COLS; c++) set(row, c, th.wall === 'sand' ? C_SAND : C_ROCK);
            const g1 = 1 + ((r() * 4) | 0), g2 = 8 + ((r() * 4) | 0);
            set(row, g1, 0); set(row, g1 + 1, 0); set(row, g2, 0); set(row, g2 + 1, 0);
            if (r() < 0.6) ents.push({ k: 'pillbox', x: (g1 + 3) * CS + 8, y: (row - ROWS) * CS + 8 });
            row -= 6;
          } else if (f === 'ruins') {
            const n = 2 + ((r() * 3) | 0);
            for (let i = 0; i < n; i++) {
              const c0 = (r() * (COLS - 3)) | 0, w = 2 + ((r() * 2) | 0), h = 2 + ((r() * 2) | 0);
              for (let a = 0; a < h; a++) for (let b = 0; b < w; b++) set(row - a, c0 + b, C_RUIN);
            }
            row -= 7;
          } else if (f === 'sand') {
            for (let i = 0; i < 3; i++) { const c0 = (r() * (COLS - 3)) | 0; for (let b = 0; b < 3; b++) set(row - i * 2, c0 + b, C_SAND); }
            row -= 7;
          } else if (f === 'rocks') {
            for (let a = 0; a < 6; a++) for (let c = 0; c < COLS; c++) if (r() < 0.12) set(row - a, c, C_ROCK);
            row -= 7;
          } else {
            for (let a = 0; a < 8; a++) for (let c = 0; c < COLS; c++) if (r() < th.treeDen) set(row - a, c, C_TREE);
            row -= 9;
          }
          // occasional crate, hostage, empty tank
          if (r() < 0.45) ents.push({ k: 'crate', x: 16 + r() * (W - 32), y: (row + 2 - ROWS) * CS });
          if (CFG.hostages && r() < 0.55) ents.push({ k: 'hostage', x: 16 + r() * (W - 32), y: (row + 3 - ROWS) * CS });
        }
        // two empty tanks per stage
        ents.push({ k: 'emptytank', x: 112, y: -(30 * CS) });
        ents.push({ k: 'emptytank', x: 60 + r() * 100, y: -((ROWS * 0.6) | 0) * CS });
        // trail guarantees a way through
        let tc = 6;
        for (let rr = ROWS - 1; rr >= 0; rr--) {
          if (rr % 3 === 0) tc = clamp(tc + ((r() * 3) | 0) - 1, 1, COLS - 3);
          for (let c = tc; c < tc + 2; c++) { const v = get(rr, c); if (v === C_WATER) set(rr, c, C_BRIDGE); else if (v !== C_BRIDGE) set(rr, c, 0); }
        }
        // clear start & arena
        for (let rr = ROWS - 10; rr < ROWS; rr++) for (let c = 0; c < COLS; c++) set(rr, c, 0);
        for (let rr = 0; rr < ARENA; rr++) for (let c = 0; c < COLS; c++) set(rr, c, 0);
        // spawn-able ents must be on free cells
        for (const e of ents) {
          const rr = Math.floor(e.y / CS) + ROWS, cc = clamp(Math.floor(e.x / CS), 0, COLS - 1);
          if (e.k === 'emptytank') { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) set(rr + a, cc + b, 0); }
          else set(rr, cc, 0);
        }
        // arena dressing
        const bossType = CFG.bosses[stage % CFG.bosses.length];
        if (bossType === 'gate') {
          for (let c = 0; c < COLS; c++) { set(3, c, C_FORT); set(4, c, C_FORT); }
          set(3, 6, C_GATE); set(3, 7, C_GATE); set(4, 6, C_GATE); set(4, 7, C_GATE);
          for (const c of [2, 11]) { set(10, c, C_SAND); set(10, c + 1, C_SAND); }
        } else {
          for (const c of [1, 2, 11, 12]) set(12, c, C_SAND);
        }
        return { ROWS, L, grid, ents, th, get, set, bossType, entI: 0 };
      }
      function cellAt(x, y) {
        const M = g.map;
        if (x < 0 || x >= W) return C_ROCK;
        const rr = Math.floor(y / CS) + M.ROWS, cc = Math.floor(x / CS);
        if (rr < 0) return C_FORT;
        if (rr >= M.ROWS) return 0;
        return M.grid[rr * COLS + cc];
      }
      function blockedBox(x, y, hw, hh, solid) {
        return !!(solid[cellAt(x - hw, y - hh)] || solid[cellAt(x + hw, y - hh)] || solid[cellAt(x - hw, y + hh)] || solid[cellAt(x + hw, y + hh)]);
      }

      // ================= Game =================
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, nextExtra: CFG.extra[0], rescued: 0 };
        g.bullets = 99; g.grenades = 50;
        startStage(); sfx.start();
      }
      function startStage() {
        g.map = buildMap(g.stage);
        g.camY = -H; g.en = []; g.ps = []; g.eb = []; g.gr = []; g.fx = []; g.pops = []; g.items = []; g.props = [];
        g.boss = null; g.spawnT = 90; g.tankT = 900; g.heliT = 1500;
        g.phase = 'ready'; g.phaseT = 150;
        g.p = newPlayer(112, -40);
        g.weapon = null; g.wammo = 0;
      }
      function newPlayer(x, y) { return { x, y, dir: 6, step: 0, stepT: 0, fireT: 0, inv: 120, dead: 0, tank: null, gT: 0, speedT: 0, longT: 0, wade: false }; }
      function diff() { return g.stage; }
      function addScore(n) {
        g.score = Math.max(0, g.score + n);
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += CFG.extra[1]; sfx.oneup(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, t, c) { g.pops.push({ x, y, t: 60, txt: t, col: c || '#fff' }); }
      function boom(x, y, big) { g.fx.push({ x, y, t: 0, big: !!big }); }

      // ---- map entities come alive as the camera reaches them ----
      function activateEnts() {
        const M = g.map;
        for (const e of M.ents) {
          if (e.on || e.y < g.camY - 24) continue;
          e.on = true;
          if (e.k === 'pillbox') spawnEnemy('pillbox', e.x, e.y);
          else if (e.k === 'crate') g.props.push({ k: 'crate', x: e.x, y: e.y, hp: 1 });
          else if (e.k === 'hostage') g.props.push({ k: 'hostage', x: e.x, y: e.y, t: 0 });
          else if (e.k === 'emptytank') g.props.push({ k: 'emptytank', x: e.x, y: e.y, ang: -Math.PI / 2 });
        }
      }

      // ---- enemies ----
      function spawnEnemy(k, x, y, o) {
        const d = diff();
        const base = { k, x, y, t: 0, hp: 1, dir: 2, step: 0, fireT: 60 + Math.random() * 80, think: 0, vx: 0, vy: 0, ang: Math.PI / 2, dying: 0 };
        if (k === 'tank') Object.assign(base, { hp: 14 + d * 2, ang: Math.PI / 2, tur: Math.PI / 2, fireT: 90 });
        if (k === 'heli') Object.assign(base, { hp: 10 + d * 2, ang: Math.PI / 2, fireT: 60 });
        if (k === 'pillbox') Object.assign(base, { hp: 8 + d, fireT: 60 });
        if (k === 'officer') base.hp = 2;
        const e = Object.assign(base, o || {});
        g.en.push(e); return e;
      }
      function spawnTick() {
        const d = diff();
        const soldiers = g.en.filter(e => e.k === 'soldier' || e.k === 'grenadier' || e.k === 'officer').length;
        const inBoss = g.phase === 'boss';
        if (--g.spawnT <= 0 && soldiers < (inBoss ? 3 + Math.min(3, d) : 6 + Math.min(6, d * 2))) {
          g.spawnT = (Math.max(25, 75 - d * 8) + Math.random() * 50) * (inBoss ? 3 : 1);
          const n = Math.random() < 0.3 ? 3 : 1;
          for (let i = 0; i < n; i++) {
            let x, y, tries = 0;
            do {
              const s = Math.random();
              if (s < 0.7) { x = 12 + Math.random() * (W - 24); y = g.camY - 6 - i * 14; }
              else { x = s < 0.85 ? 4 : W - 4; y = g.camY + 20 + Math.random() * 110; }
            } while (blockedBox(x, y, 4, 4, SOLID_FOOT) && ++tries < 10);
            if (tries >= 10) continue;
            const r = Math.random();
            const k = r < 0.08 ? 'officer' : r < 0.08 + Math.min(0.25, 0.08 + d * 0.05) ? 'grenadier' : 'soldier';
            spawnEnemy(k, x, y);
          }
        }
        if (inBoss) return;
        if (--g.tankT <= 0) {
          g.tankT = Math.max(600, 1300 - d * 150) + Math.random() * 400;
          const x = 30 + Math.random() * (W - 60);
          if (!blockedBox(x, g.camY - 10, 7, 7, SOLID_TANK)) spawnEnemy('tank', x, g.camY - 10);
        }
        if (d >= CFG.heliFrom && --g.heliT <= 0) { g.heliT = 1400 + Math.random() * 600; spawnEnemy('heli', Math.random() < 0.5 ? 40 : W - 40, g.camY - 20); }
      }

      const aim = (x, y) => Math.atan2(g.p.y - y, g.p.x - x);
      function eShot(x, y, a, spd) { if (g.eb.length < 14 + diff() * 2) g.eb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, t: 0 }); }
      function eShell(x, y, tx, ty) { const d = Math.hypot(tx - x, ty - y), T = Math.max(20, d / 2.4); g.gr.push({ x, y, z: 0, vx: (tx - x) / T, vy: (ty - y) / T, vz: 0, grav: 0, T, t: 0, shell: true, enemy: true, r: 14 }); }
      function eGrenade(x, y, tx, ty) { const T = 40; g.gr.push({ x, y, z: 0, vx: (tx - x) / T, vy: (ty - y) / T, vz: 2.4, grav: 0.12, T, t: 0, enemy: true, r: 14 }); sfx.throw(); }

      function killEnemy(e, how) {
        if (e.dying) return;
        const pts = CFG.points[e.k] || 100;
        addScore(pts);
        if (e.k === 'tank' || e.k === 'heli' || e.k === 'pillbox') { boom(e.x, e.y, true); sfx.big(); pop(e.x, e.y - 10, String(pts), '#ffe040'); e.dead = true; return; }
        e.dying = 1; sfx.kill();
        if (e.k === 'officer' || Math.random() < (CFG.ammo && g.bullets < 20 ? 0.25 : 0.04)) dropItem(e.x, e.y);
      }
      function dropItem(x, y) {
        let k;
        if (CFG.ammo) {
          const pool = [];
          if (g.bullets < 60) pool.push('B', 'B');
          if (g.grenades < 30) pool.push('G');
          if (g.p.tank) pool.push('F');
          pool.push('S', 'L', 'G', 'B');
          k = pick(pool);
        } else k = pick(['S', 'F', 'R', 'H', 'G', 'S']);
        g.items.push({ k, x, y, t: 900 });
      }
      function giveItem(it) {
        const p = g.p;
        sfx.pick();
        const k = it.k;
        if (CFG.ammo) {
          if (k === 'B') { g.bullets = 99; pop(it.x, it.y - 8, 'BULLETS', '#ffe040'); }
          else if (k === 'G') { g.grenades = Math.min(99, g.grenades + 30); pop(it.x, it.y - 8, 'GRENADES', '#ffe040'); }
          else if (k === 'F') { if (p.tank) p.tank.fuel = 100; else addScore(1000); pop(it.x, it.y - 8, 'FUEL', '#ffe040'); }
          else if (k === 'S') { p.speedT = 1800; pop(it.x, it.y - 8, 'SPEED UP', '#60e0ff'); }
          else if (k === 'L') { p.longT = 1800; pop(it.x, it.y - 8, 'LONG RANGE', '#60e0ff'); }
        } else {
          if (k === 'G') { g.bigGren = 1800; pop(it.x, it.y - 8, 'BIG GRENADE', '#ffe040'); }
          else { g.weapon = k; g.wammo = k === 'R' ? 40 : 160; pop(it.x, it.y - 8, CFG.weaponNames[k], '#60e0ff'); }
        }
      }

      // ---- player weapons ----
      function fireGun() {
        const p = g.p, a = p.dir / 8 * TAU;
        const mx = p.x + Math.cos(a) * 8, my = p.y - 2 + Math.sin(a) * 8;
        if (CFG.ammo) {
          if (g.bullets <= 0) { if (frame % 20 === 0) au.tone(90, 0.05, { type: 'square', vol: 0.05 }); return 0; }
          if (g.ps.filter(s => !s.flame).length >= 5) return 0;
          g.bullets--;
          const life = p.longT ? 60 : 38;
          g.ps.push({ x: mx, y: my, vx: Math.cos(a) * 4.2, vy: Math.sin(a) * 4.2, life, pierce: !!p.longT });
          sfx.shot(); return 7;
        }
        const w = g.weapon;
        if (w === 'F') {
          for (let i = 0; i < 2; i++) { const aa = a + rnd(-0.12, 0.12); g.ps.push({ x: mx, y: my, vx: Math.cos(aa) * 3, vy: Math.sin(aa) * 3, life: 20, flame: true, pierce: true, hit: new Set() }); }
          if (frame % 6 === 0) sfx.flame();
          if (--g.wammo <= 0) g.weapon = null;
          return 3;
        }
        if (w === 'R') {
          g.ps.push({ x: mx, y: my, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, life: 50, rocket: true });
          sfx.rocket(); if (--g.wammo <= 0) g.weapon = null; return 18;
        }
        if (g.ps.filter(s => !s.flame).length >= (w ? 12 : 5)) return 0;
        if (w === 'S') { for (const o of [-0.26, 0, 0.26]) g.ps.push({ x: mx, y: my, vx: Math.cos(a + o) * 4.2, vy: Math.sin(a + o) * 4.2, life: 40 }); if (--g.wammo <= 0) g.weapon = null; sfx.shot(); return 8; }
        if (w === 'H') { const aa = a + rnd(-0.05, 0.05); g.ps.push({ x: mx, y: my, vx: Math.cos(aa) * 5, vy: Math.sin(aa) * 5, life: 40, pierce: true }); if (--g.wammo <= 0) g.weapon = null; sfx.shot(); return 4; }
        g.ps.push({ x: mx, y: my, vx: Math.cos(a) * 4.2, vy: Math.sin(a) * 4.2, life: 38 });
        sfx.shot(); return 7;
      }
      function throwGrenade() {
        const p = g.p;
        if (g.gr.some(q => !q.enemy && !q.shell)) return;
        if (CFG.ammo) { if (g.grenades <= 0) return; g.grenades--; }
        const a = p.dir / 8 * TAU;
        g.gr.push({ x: p.x, y: p.y - 4, z: 4, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8, vz: 2.2, grav: 0.12, T: 38, t: 0, r: g.bigGren ? 26 : 18 });
        sfx.throw();
      }
      function fireCannon() {
        const t = g.p.tank;
        if (t.cd > 0) return;
        t.cd = 28;
        const a = t.tur;
        g.gr.push({ x: g.p.x + Math.cos(a) * 12, y: g.p.y + Math.sin(a) * 12, z: 0, vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, vz: 0, grav: 0, T: 30, t: 0, shell: true, r: 18 });
        sfx.cannon();
      }

      // ---- explosions ----
      function explode(x, y, r, enemy) {
        boom(x, y, r > 16); sfx.boom();
        const p = g.p;
        if (enemy) {
          if (!p.dead && !p.inv && Math.hypot(p.x - x, p.y - y) < r) {
            if (p.tank) { p.tank.armor -= 2; p.tank.flash = 8; sfx.hit(); } else killPlayer();
          }
          return;
        }
        for (const e of g.en) {
          if (e.dead || e.dying) continue;
          const rr = r + (e.k === 'tank' || e.k === 'pillbox' ? 8 : e.k === 'heli' ? 10 : 4);
          if (Math.hypot(e.x - x, e.y - y) < rr) { e.hp -= 6; e.flash = 6; if (e.hp <= 0) killEnemy(e, 'boom'); else sfx.hit(); }
        }
        for (const pr of g.props) {
          if (Math.hypot(pr.x - x, pr.y - y) > r + 6) continue;
          if (pr.k === 'crate') { pr.dead = true; dropItem(pr.x, pr.y); boom(pr.x, pr.y); }
          if (pr.k === 'hostage' && !pr.free) hurtHostage(pr);
        }
        if (g.boss) hitBossAt(x, y, r, 6);
        // grenades flatten trees
        const M = g.map;
        for (let dy = -r; dy <= r; dy += 8) for (let dx = -r; dx <= r; dx += 8) {
          if (dx * dx + dy * dy > r * r) continue;
          const rr = Math.floor((y + dy) / CS) + M.ROWS, cc = Math.floor((x + dx) / CS);
          if (M.get(rr, cc) === C_TREE || M.get(rr, cc) === C_SAND) M.set(rr, cc, 0);
        }
      }
      function hurtHostage(h) {
        h.dead = true; addScore(-500); pop(h.x, h.y - 10, '-500', '#ff4040'); sfx.hit();
        g.fx.push({ x: h.x, y: h.y, t: 0 });
      }

      // ---- boss ----
      function startBoss() {
        const type = g.map.bossType, d = diff();
        const top = g.camY;
        const B = { type, t: 0, flash: 0, parts: [], x: W / 2, y: top + 50, vx: 0.5 + d * 0.1, core: 30 + d * 10 };
        if (type === 'gate') {
          B.y = (3 - g.map.ROWS) * CS + 16; B.core = 40 + d * 10;
          B.parts = [[-80, -4], [-40, -4], [40, -4], [80, -4]].slice(0, 2 + Math.min(2, d)).map(([dx, dy]) => ({ dx, dy, hp: 8 + d * 2, fireT: 60 + Math.random() * 60 }));
          if (B.parts.length === 2) { B.parts[0].dx = -60; B.parts[1].dx = 60; }
          if (B.parts.length === 3) { B.parts[2].dx = 0; B.parts[2].dy = -20; }
        } else if (type === 'bigtank') {
          B.y = top + 60; B.core = 36 + d * 10; B.parts = [{ dx: -18, dy: 18, hp: 10, fireT: 50 }, { dx: 18, dy: 18, hp: 10, fireT: 80 }];
        } else if (type === 'train') {
          B.y = top + 44; B.x = -60; B.vx = 0.7 + d * 0.1; B.core = 40 + d * 10;
          B.parts = [-64, -32, 0, 32, 64].map((dx, i) => ({ dx, dy: 0, hp: 6 + d * 2, fireT: 30 + i * 25 }));
        } else if (type === 'gunship') {
          B.y = top + 50; B.core = 44 + d * 10; B.parts = [{ dx: -26, dy: 6, hp: 10, fireT: 40 }, { dx: 26, dy: 6, hp: 10, fireT: 70 }];
        } else { // bunker
          B.y = top + 40; B.core = 50 + d * 10; B.parts = [{ dx: -50, dy: 6, hp: 10, fireT: 40 }, { dx: 0, dy: 14, hp: 12, fireT: 70 }, { dx: 50, dy: 6, hp: 10, fireT: 100 }];
        }
        for (const p of B.parts) { p.max = p.hp; p.flash = 0; }
        B.coreMax = B.core;
        g.boss = B; g.phase = 'boss'; sfx.warn();
      }
      function bossCoreBox(B) {
        if (B.type === 'gate') return { x: B.x, y: B.y, w: 32, h: 26 };
        if (B.type === 'bigtank') return { x: B.x, y: B.y, w: 44, h: 40 };
        if (B.type === 'train') return { x: B.x, y: B.y, w: 150, h: 18 };
        if (B.type === 'gunship') return { x: B.x, y: B.y, w: 30, h: 26 };
        return { x: B.x, y: B.y, w: 40, h: 24 };
      }
      function updBoss() {
        const B = g.boss, d = diff(), p = g.p; B.t++;
        if (B.flash) B.flash--;
        const alive = B.parts.filter(q => q.hp > 0);
        if (B.type === 'bigtank') {
          B.x += B.vx; if (B.x < 40) B.vx = Math.abs(B.vx); if (B.x > W - 40) B.vx = -Math.abs(B.vx);
          B.y = g.camY + 60 + Math.sin(B.t * 0.01) * 20;
          if (B.t % Math.max(60, 120 - d * 10) === 0) { eShell(B.x, B.y + 24, p.x, p.y); sfx.cannon(); }
        } else if (B.type === 'train') {
          B.x += B.vx; if (B.x < 40) B.vx = Math.abs(B.vx); if (B.x > W - 40) B.vx = -Math.abs(B.vx);
        } else if (B.type === 'gunship') {
          B.x = W / 2 + Math.sin(B.t * 0.013) * 70; B.y = g.camY + 56 + Math.sin(B.t * 0.031) * 22;
          if (B.t % Math.max(80, 160 - d * 15) === 0) for (let i = 0; i < 10; i++) eShot(B.x, B.y, i / 10 * TAU + B.t, 1.3);
          if (B.t % 200 === 100) { eGrenade(B.x - 10, B.y, p.x - 20, p.y); eGrenade(B.x + 10, B.y, p.x + 20, p.y); }
        } else if (B.type === 'bunker') {
          if (B.t % Math.max(70, 140 - d * 12) === 0) { eGrenade(B.x, B.y + 10, p.x, p.y); }
        } else if (B.type === 'gate') {
          if (B.t % Math.max(90, 180 - d * 15) === 0 && alive.length < B.parts.length) {
            // reinforcements pour out of the gate
            const e = spawnEnemy('soldier', B.x + rnd(-8, 8), B.y + 18); e.think = 30;
          }
        }
        for (const q of alive) {
          if (q.flash) q.flash--;
          if (--q.fireT <= 0) {
            q.fireT = Math.max(45, 110 - d * 10) + Math.random() * 40;
            const x = B.x + q.dx, y = B.y + q.dy;
            if (x > -10 && x < W + 10) { const a = aim(x, y); eShot(x, y, a, 1.5 + d * 0.1); if (B.type !== 'gate' || d > 0) { eShot(x, y, a - 0.2, 1.5); eShot(x, y, a + 0.2, 1.5); } sfx.eshot(); }
          }
        }
        if (!alive.length && B.type !== 'gate' && B.t % Math.max(40, 80 - d * 8) === 0) { const a = aim(B.x, B.y); for (let i = -2; i <= 2; i++) eShot(B.x, B.y + 10, a + i * 0.18, 1.6 + d * 0.1); }
        // contact
        const cb = bossCoreBox(B);
        if (B.type !== 'gate' && !p.dead && !p.inv && Math.abs(p.x - cb.x) < cb.w / 2 + 3 && Math.abs(p.y - cb.y) < cb.h / 2 + 4) { if (p.tank) { p.tank.armor -= 1; p.tank.flash = 4; p.y += 4; } else killPlayer(); }
      }
      function hitBossAt(x, y, r, dmg) {
        const B = g.boss; if (!B) return false;
        for (const q of B.parts) {
          if (q.hp <= 0) continue;
          if (Math.abs(x - (B.x + q.dx)) < 8 + r && Math.abs(y - (B.y + q.dy)) < 8 + r) {
            q.hp -= dmg; q.flash = 4; sfx.hit();
            if (q.hp <= 0) { boom(B.x + q.dx, B.y + q.dy, true); addScore(1000); pop(B.x + q.dx, B.y + q.dy, '1000'); sfx.big(); }
            return true;
          }
        }
        const cb = bossCoreBox(B);
        if (Math.abs(x - cb.x) < cb.w / 2 + r && Math.abs(y - cb.y) < cb.h / 2 + r) {
          if (B.type !== 'gate' && B.parts.some(q => q.hp > 0)) return true;
          B.core -= dmg; B.flash = 4; sfx.hit();
          if (B.core <= 0) bossDown();
          return true;
        }
        return false;
      }
      function bossDown() {
        const B = g.boss;
        const pts = CFG.points.boss + g.stage * 5000;
        addScore(pts); pop(B.x, B.y, String(pts), '#ffe040');
        for (let i = 0; i < 12; i++) g.fx.push({ x: B.x + rnd(-40, 40), y: B.y + rnd(-14, 14), t: -i * 5, big: true });
        sfx.big();
        if (B.type === 'gate') { const M = g.map; for (const c of [6, 7]) { M.set(3, c, 0); M.set(4, c, 0); M.set(2, c, 0); M.set(1, c, 0); } }
        g.boss = null; g.eb = []; g.gr = g.gr.filter(q => !q.enemy);
        g.en.forEach(e => { if (e.k === 'tank' || e.k === 'heli' || e.k === 'pillbox') { e.dead = true; boom(e.x, e.y, true); } else if (!e.dying) e.dying = 1; });
        g.phase = 'clear'; g.phaseT = 300; g.clearSnd = 60;
      }

      function killPlayer() {
        const p = g.p; if (p.dead || p.inv) return;
        if (p.tank) return;
        p.dead = 1; g.phase = g.phase === 'boss' ? 'deadb' : 'dead'; g.phaseT = 110; sfx.die();
        g.weapon = null;
      }

      // ================= Update =================
      function updPlayer() {
        const p = g.p, d = diff();
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx -= 1; if (api.key('ArrowRight')) dx += 1;
        if (api.key('ArrowUp')) dy -= 1; if (api.key('ArrowDown')) dy += 1;
        if (p.inv) p.inv--;
        if (p.speedT) p.speedT--; if (p.longT) p.longT--; if (g.bigGren) g.bigGren--;
        if (p.tank) {
          const t = p.tank;
          if (t.cd) t.cd--; if (t.flash) t.flash--;
          if (dx || dy) {
            const want = Math.atan2(dy, dx);
            let da = want - t.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
            t.ang += clamp(da, -0.08, 0.08);
            t.tur = t.ang;
            if (Math.abs(da) < 0.6) {
              const sp = 0.95, vx = Math.cos(t.ang) * sp, vy = Math.sin(t.ang) * sp;
              if (!blockedBox(p.x + vx, p.y, 9, 9, SOLID_TANK) && p.x + vx > 10 && p.x + vx < W - 10) p.x += vx;
              if (!blockedBox(p.x, p.y + vy, 9, 9, SOLID_TANK) && p.y + vy < g.camY + H - 12 && p.y + vy > g.camY + 20) p.y += vy;
              // crush trees
              const M = g.map; const rr = Math.floor(p.y / CS) + M.ROWS, cc = Math.floor(p.x / CS);
              for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (M.get(rr + a, cc + b) === C_TREE && Math.hypot((cc + b) * CS + 8 - p.x, (rr + a - M.ROWS) * CS + 8 - p.y) < 14) M.set(rr + a, cc + b, 0);
              t.tread = (t.tread + 1) % 8;
            }
            t.fuel -= 0.02;
          }
          t.fuel -= 0.008;
          p.dir = angIdx(t.ang, 8);
          if (api.pressed('Space') || (api.key('Space') && !t.cd)) fireCannon();
          // run over soldiers
          for (const e of g.en) if (!e.dying && !e.dead && (e.k === 'soldier' || e.k === 'grenadier' || e.k === 'officer') && Math.abs(e.x - p.x) < 11 && Math.abs(e.y - p.y) < 11) killEnemy(e, 'crush');
          if (t.fuel <= 0 || t.armor <= 0) { t.fail = (t.fail || 0) + 1; if (t.fail % 12 === 1) sfx.alarm(); if (t.fail > 150) { // explodes
            boom(p.x, p.y, true); sfx.big(); p.tank = null; p.inv = 0; killPlayer(); return; } }
          else if (t.fuel < 20 && frame % 40 === 0) sfx.alarm();
          if (api.pressed('KeyX')) {
            // bail out
            const ex = { x: p.x, y: p.y + 14 };
            g.props.push({ k: 'emptytank', x: p.x, y: p.y, ang: t.ang, fuel: t.fuel, armor: t.armor, fail: t.fail });
            p.tank = null; p.x = ex.x; p.y = Math.min(ex.y, g.camY + H - 12); p.inv = 30; p.cool = 40;
            if (blockedBox(p.x, p.y + 3, 3, 3, SOLID_FOOT)) p.y -= 28;
          }
          return;
        }
        // on foot
        p.wade = cellAt(p.x, p.y + 4) === C_WATER;
        if (dx || dy) {
          const n = dx && dy ? 0.7071 : 1, sp = (p.speedT ? 1.45 : 1.1) * (p.wade ? 0.6 : 1);
          const nx = p.x + dx * n * sp, ny = p.y + dy * n * sp;
          if (!blockedBox(nx, p.y + 3, 3, 3, SOLID_FOOT) && nx > 5 && nx < W - 5) p.x = nx;
          if (!blockedBox(p.x, ny + 3, 3, 3, SOLID_FOOT) && ny < g.camY + H - 10 && ny > g.camY + 22) p.y = ny;
          if (!api.key('KeyZ')) p.dir = dir8Of(dx, dy);
          if (++p.stepT > 7) { p.stepT = 0; p.step ^= 1; }
        }
        if (p.cool) p.cool--;
        if (p.fireT) p.fireT--;
        if ((api.pressed('Space') || api.key('Space')) && !p.fireT) p.fireT = fireGun() || 4;
        if (api.pressed('KeyX') && !p.wade) throwGrenade();
        // board a tank
        for (const pr of g.props) {
          if (pr.k === 'emptytank' && !pr.dead && !p.cool && Math.abs(pr.x - p.x) < 9 && Math.abs(pr.y - p.y) < 10) {
            pr.dead = true;
            p.tank = { ang: pr.ang, tur: pr.ang, fuel: pr.fuel != null ? pr.fuel : 100, armor: pr.armor != null ? pr.armor : 8, cd: 10, tread: 0, flash: 0, fail: 0 };
            if (p.tank.fuel <= 0 || p.tank.armor <= 0) { p.tank.fail = Math.min(100, pr.fail || 0); }
            p.x = pr.x; p.y = pr.y; sfx.tankin(); pop(p.x, p.y - 16, 'TANK!', '#60e0ff');
            g.weaponHold = g.weapon;
            break;
          }
        }
      }

      function updSoldier(e) {
        const p = g.p, d = diff();
        if (e.dying) { e.dying++; if (e.dying > 30) e.dead = true; return; }
        if (--e.think <= 0) {
          const r = Math.random();
          e.think = 40 + Math.random() * 60;
          const a = aim(e.x, e.y);
          if (r < 0.35) { e.vx = 0; e.vy = 0; e.mode = 'aim'; }
          else if (r < 0.75) { const aa = a + rnd(-0.7, 0.7); e.vx = Math.cos(aa) * 0.7; e.vy = Math.sin(aa) * 0.7; e.mode = 'walk'; }
          else { const aa = Math.random() * TAU; e.vx = Math.cos(aa) * 0.6; e.vy = Math.sin(aa) * 0.6 + 0.3; e.mode = 'walk'; }
          if (e.y < g.camY + 10) e.vy = Math.abs(e.vy) + 0.4;
          if (e.x < 8) e.vx = Math.abs(e.vx) + 0.3; if (e.x > W - 8) e.vx = -Math.abs(e.vx) - 0.3;
        }
        const sp = 1 + d * 0.06;
        const nx = e.x + e.vx * sp, ny = e.y + e.vy * sp;
        const bl = (x, y) => blockedBox(x, y + 3, 3, 3, SOLID_FOOT) && !(e.y < g.camY);
        if (!bl(nx, e.y)) e.x = nx; else e.vx = -e.vx;
        if (!bl(e.x, ny)) e.y = ny; else e.vy = -e.vy;
        if (e.vx || e.vy) { e.dir = dir8Of(e.vx, e.vy); if (++e.st > 8) { e.st = 0; e.step ^= 1; } }
        else e.dir = dir8Of(Math.cos(aim(e.x, e.y)), Math.sin(aim(e.x, e.y)));
        e.st = e.st || 0;
        if (e.y > g.camY - 4 && e.y < g.camY + H - 30 && --e.fireT <= 0) {
          e.fireT = Math.max(50, 140 - d * 15) + Math.random() * 80;
          if (e.k === 'grenadier' && Math.hypot(p.x - e.x, p.y - e.y) < 120) eGrenade(e.x, e.y, p.x + rnd(-10, 10), p.y + rnd(-10, 10));
          else { eShot(e.x, e.y - 2, aim(e.x, e.y) + rnd(-0.12, 0.12), 1.4 + d * 0.1); sfx.eshot(); }
        }
        if (e.y > g.camY + H + 20) e.dead = true;
        if (!p.dead && !p.tank && !p.inv && Math.abs(e.x - p.x) < 6 && Math.abs(e.y - p.y) < 8) killPlayer();
      }
      function updVehicle(e) {
        const p = g.p, d = diff();
        if (e.flash) e.flash--;
        if (e.k === 'tank') {
          const want = e.t < 120 ? Math.PI / 2 : Math.atan2(p.y - e.y, p.x - e.x);
          if (e.t % 60 === 0) e.goal = e.t < 120 ? Math.PI / 2 : (Math.abs(p.y - e.y) > 50 ? (p.y > e.y ? Math.PI / 2 : -Math.PI / 2) : (p.x > e.x ? 0 : Math.PI));
          let da = (e.goal == null ? Math.PI / 2 : e.goal) - e.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          e.ang += clamp(da, -0.04, 0.04);
          const sp = 0.45 + d * 0.04;
          const vx = Math.cos(e.ang) * sp, vy = Math.sin(e.ang) * sp;
          if (!blockedBox(e.x + vx, e.y + vy, 8, 8, SOLID_TANK) || e.y < g.camY) { e.x += vx; e.y += vy; e.tread = ((e.tread || 0) + 1) % 8; }
          else e.goal = e.ang + Math.PI / 2;
          let dt = want - e.tur; while (dt > Math.PI) dt -= TAU; while (dt < -Math.PI) dt += TAU; e.tur += clamp(dt, -0.03, 0.03);
          if (e.y > g.camY + 4 && --e.fireT <= 0) { e.fireT = Math.max(70, 150 - d * 15); eShell(e.x + Math.cos(e.tur) * 12, e.y + Math.sin(e.tur) * 12, p.x, p.y); sfx.cannon(); }
          if (p.tank && Math.abs(e.x - p.x) < 16 && Math.abs(e.y - p.y) < 16) { p.tank.armor -= 0.05; }
          else if (!p.dead && !p.tank && Math.abs(e.x - p.x) < 10 && Math.abs(e.y - p.y) < 10) killPlayer();
        } else if (e.k === 'heli') {
          if (e.t < 90) e.y += 1;
          else { e.x += Math.sin(e.t * 0.02) * 1.1; e.y += (g.camY + 60 + Math.sin(e.t * 0.015) * 30 - e.y) * 0.02; }
          e.ang = Math.PI / 2 + Math.sin(e.t * 0.02) * 0.4;
          if (--e.fireT <= 0) { e.fireT = Math.max(50, 100 - d * 8); const a = aim(e.x, e.y); for (let i = -1; i <= 1; i++) eShot(e.x, e.y + 8, a + i * 0.2, 1.6); sfx.eshot(); }
          if (e.t > 1000) e.y += 2;
        } else if (e.k === 'pillbox') {
          if (e.y > g.camY + 4 && e.y < g.camY + H - 20 && --e.fireT <= 0) { e.fireT = Math.max(50, 110 - d * 10) + Math.random() * 40; const a = aim(e.x, e.y); for (let i = -1; i <= 1; i++) eShot(e.x, e.y, a + i * 0.3, 1.4 + d * 0.1); sfx.eshot(); }
        }
        if (e.y > g.camY + H + 40) e.dead = true;
      }

      function updWorld() {
        const p = g.p;
        activateEnts();
        if (g.phase === 'play' || g.phase === 'boss') spawnTick();
        for (const e of g.en) {
          e.t++;
          if (e.k === 'tank' || e.k === 'heli' || e.k === 'pillbox') updVehicle(e); else updSoldier(e);
        }
        // player shots
        for (const s of g.ps) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.life <= 0 || s.x < -4 || s.x > W + 4 || s.y < g.camY - 4 || s.y > g.camY + H + 4) { if (s.rocket && s.life <= 0) explode(s.x, s.y, 14); s.dead = true; continue; }
          if (g.boss && hitBossAt(s.x, s.y, 0, s.flame ? 0.5 : 1)) { if (s.rocket) explode(s.x, s.y, 16); s.dead = true; continue; }
          if (!s.flame && SOLID_SHOT[cellAt(s.x, s.y)]) { if (s.rocket) explode(s.x, s.y, 14); s.dead = true; continue; }
          for (const e of g.en) {
            if (e.dead || e.dying) continue;
            const rr = e.k === 'tank' || e.k === 'pillbox' ? 9 : e.k === 'heli' ? 10 : 5;
            if (Math.abs(e.x - s.x) < rr && Math.abs(e.y - s.y) < rr + 2) {
              if (s.flame) { if (s.hit.has(e)) continue; s.hit.add(e); }
              if (s.rocket) { explode(s.x, s.y, 16); s.dead = true; break; }
              e.hp -= (e.k === 'tank' || e.k === 'heli') && !s.flame ? 0.5 : 1; e.flash = 3;
              if (e.hp <= 0) killEnemy(e); else sfx.hit();
              if (!s.pierce) { s.dead = true; break; }
            }
          }
          if (s.dead) continue;
          for (const pr of g.props) {
            if (pr.dead || pr.k === 'emptytank') continue;
            if (Math.abs(pr.x - s.x) < 6 && Math.abs(pr.y - s.y) < 7) {
              if (pr.k === 'crate') { pr.dead = true; dropItem(pr.x, pr.y); boom(pr.x, pr.y); sfx.kill(); }
              else if (pr.k === 'hostage' && !pr.free) hurtHostage(pr);
              s.dead = true; break;
            }
          }
        }
        // grenades & shells
        for (const q of g.gr) {
          q.t++; q.x += q.vx; q.y += q.vy;
          if (q.grav) { q.z += q.vz; q.vz -= q.grav; }
          let land = q.t >= q.T || (q.grav && q.z <= 0 && q.t > 4);
          if (q.shell && !q.enemy) {
            if (SOLID_SHOT[cellAt(q.x, q.y)]) land = true;
            for (const e of g.en) if (!e.dead && !e.dying && Math.abs(e.x - q.x) < 9 && Math.abs(e.y - q.y) < 9) land = true;
            if (g.boss) { const cb = bossCoreBox(g.boss); if (Math.abs(q.x - cb.x) < cb.w / 2 && Math.abs(q.y - cb.y) < cb.h / 2) land = true; for (const pt of g.boss.parts) if (pt.hp > 0 && Math.abs(q.x - g.boss.x - pt.dx) < 10 && Math.abs(q.y - g.boss.y - pt.dy) < 10) land = true; }
          }
          if (land) { q.dead = true; explode(q.x, q.y, q.r, q.enemy); }
        }
        // enemy bullets
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy; b.t++;
          if (b.x < -4 || b.x > W + 4 || b.y < g.camY - 8 || b.y > g.camY + H + 4 || SOLID_EB[cellAt(b.x, b.y)]) { b.dead = true; continue; }
          if (!p.dead && Math.abs(b.x - p.x) < (p.tank ? 10 : 3) && Math.abs(b.y - p.y + 1) < (p.tank ? 10 : 5)) {
            b.dead = true;
            if (p.tank) { p.tank.armor -= 0.25; p.tank.flash = 3; } else killPlayer();
          }
        }
        // props
        for (const pr of g.props) {
          if (pr.k === 'hostage' && !pr.dead) {
            pr.t++;
            if (!pr.free && !p.dead && Math.abs(pr.x - p.x) < 9 && Math.abs(pr.y - p.y) < 11) {
              pr.free = true; g.rescued++; addScore(CFG.points.hostage); pop(pr.x, pr.y - 12, 'THANK YOU!', '#60ff60'); sfx.rescue();
              if (Math.random() < 0.35) dropItem(pr.x + 10, pr.y);
            }
            if (pr.free) { pr.y += 1.2; if (pr.y > g.camY + H + 10) pr.dead = true; }
          }
          if (pr.y > g.camY + H + 40) pr.dead = true;
        }
        // items
        for (const it of g.items) {
          it.t--;
          if (!p.dead && Math.abs(it.x - p.x) < 10 && Math.abs(it.y - p.y) < 11) { it.t = 0; giveItem(it); }
          if (it.y > g.camY + H + 10) it.t = 0;
        }
        if (g.boss) updBoss();
        g.en = g.en.filter(e => !e.dead);
        g.ps = g.ps.filter(s => !s.dead);
        g.gr = g.gr.filter(s => !s.dead);
        g.eb = g.eb.filter(s => !s.dead);
        g.props = g.props.filter(s => !s.dead);
        g.items = g.items.filter(s => s.t > 0);
      }

      function gameOver() {
        api.setHiScore(g.score); g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .25], [370, .25], [349, .25], [330, .6]], { type: 'square', vol: 0.1 });
      }
      function respawn() {
        const p = g.p;
        const np = newPlayer(p.x, p.y); np.inv = 150;
        for (let k = 0; k < 60 && blockedBox(np.x, np.y + 3, 4, 4, SOLID_FOOT); k++) { np.x = 20 + Math.random() * (W - 40); np.y = g.camY + H - 30 - (k % 6) * 12; }
        g.p = np;
        g.eb = []; g.gr = g.gr.filter(q => !q.enemy);
        g.en.forEach(e => { if ((e.k === 'soldier' || e.k === 'grenadier') && Math.hypot(e.x - np.x, e.y - np.y) < 50) e.dead = true; });
        if (CFG.ammo) { g.bullets = Math.max(g.bullets, 50); g.grenades = Math.max(g.grenades, 20); }
      }

      function update() {
        frame++; if (coinFlash) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.big ? 36 : 22));
        for (const q of g.pops) { q.t--; q.y -= 0.3; }
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.clearSnd && --g.clearSnd === 0) sfx.clear();
        const p = g.p;
        switch (g.phase) {
          case 'ready': updPlayer(); if (--g.phaseT <= 0) g.phase = 'play'; break;
          case 'play': case 'boss':
            updPlayer();
            if (g.phase === 'play') {
              const want = g.p.y - 150;
              if (want < g.camY) g.camY = Math.max(-g.map.L, want);
              if (g.camY <= -g.map.L) startBoss();
            }
            updWorld();
            break;
          case 'dead': case 'deadb':
            p.dead++;
            for (const e of g.en) if (e.dying) { e.dying++; if (e.dying > 30) e.dead = true; }
            g.en = g.en.filter(e => !e.dead);
            for (const b of g.eb) { b.x += b.vx; b.y += b.vy; }
            if (--g.phaseT <= 0) {
              const back = g.phase === 'deadb' ? 'boss' : 'play';
              const cont = () => { respawn(); g.phase = back; };
              if (g.lives > 1) { g.lives--; cont(); }
              else {
                g.phase = 'wait'; const cg = g;
                if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 3; cont(); } }, () => { if (g === cg) gameOver(); });
                else gameOver();
              }
            }
            break;
          case 'clear':
            for (const e of g.en) if (e.dying) { e.dying++; if (e.dying > 30) e.dead = true; }
            g.en = g.en.filter(e => !e.dead && e.dying);
            if (g.phaseT < 200) { // march forward
              if (g.p.tank) { g.props.push({ k: 'emptytank', x: g.p.x, y: g.p.y, ang: g.p.tank.ang }); g.p.tank = null; }
              g.p.dir = 6; g.p.x += clamp(112 - g.p.x, -1, 1); g.p.y -= 0.8; if (++g.p.stepT > 7) { g.p.stepT = 0; g.p.step ^= 1; }
            }
            if (--g.phaseT <= 0) { g.stage++; startStage(); }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
            break;
        }
      }

      // ================= Render =================
      function hash(a, b) { let n = (a * 374761393 + b * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
      function drawMap(ctx, camY) {
        const M = g.map, th = M.th;
        ctx.fillStyle = th.g1; ctx.fillRect(0, 0, W, H);
        const r0 = Math.floor(camY / CS), r1 = Math.floor((camY + H) / CS);
        for (let rw = r0; rw <= r1; rw++) {
          const ri = rw + M.ROWS, sy = rw * CS - camY;
          for (let c = 0; c < COLS; c++) {
            const v = ri >= 0 && ri < M.ROWS ? M.grid[ri * COLS + c] : (ri < 0 ? C_GROUND : 0);
            const x = c * CS, h = hash(c, ri);
            if (v === C_GROUND || v === C_TREE) {
              if (h < 0.4) { ctx.fillStyle = th.g2; ctx.fillRect(x + ((h * 97) | 0) % 12, sy + ((h * 53) | 0) % 12, 3, 2); }
              if (h > 0.85) { ctx.fillStyle = th.g3; ctx.fillRect(x + 4, sy + 9, 1, 3); ctx.fillRect(x + 6, sy + 8, 1, 4); ctx.fillRect(x + 8, sy + 10, 1, 2); }
            }
            if (v === C_GATE) { ctx.fillStyle = '#3a3a40'; ctx.fillRect(x, sy, CS, CS); }
            if (v === C_WATER) {
              ctx.fillStyle = th.water; ctx.fillRect(x, sy, CS, CS);
              ctx.fillStyle = th.water2; const o = (frame >> 3) % 8; ctx.fillRect(x + ((h * 8) | 0) + o % 4, sy + 4 + ((h * 5) | 0), 6, 1); ctx.fillRect(x + 8 - o % 4, sy + 11, 5, 1);
              // banks
              const up = ri - 1 >= 0 ? M.grid[(ri - 1) * COLS + c] : 0, dn = ri + 1 < M.ROWS ? M.grid[(ri + 1) * COLS + c] : 0;
              ctx.fillStyle = th.bank;
              if (up !== C_WATER && up !== C_BRIDGE) ctx.fillRect(x, sy, CS, 2);
              if (dn !== C_WATER && dn !== C_BRIDGE) ctx.fillRect(x, sy + CS - 2, CS, 2);
            } else if (v === C_BRIDGE) {
              ctx.fillStyle = th.water; ctx.fillRect(x, sy, CS, CS);
              ctx.fillStyle = '#8a6030'; ctx.fillRect(x + 1, sy, CS - 2, CS);
              ctx.fillStyle = '#5a3a18'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 1, sy + k * 4 + 3, CS - 2, 1);
              ctx.fillRect(x, sy, 1, CS); ctx.fillRect(x + CS - 1, sy, 1, CS);
            } else if (v === C_ROCK) {
              ctx.fillStyle = '#4a4440'; ctx.fillRect(x + 1, sy + 2, 14, 13);
              ctx.fillStyle = '#7a7268'; ctx.fillRect(x + 2, sy + 1, 11, 10);
              ctx.fillStyle = '#9a9288'; ctx.fillRect(x + 3, sy + 2, 5, 4);
            } else if (v === C_SAND) {
              ctx.fillStyle = '#6a5a38'; ctx.fillRect(x, sy + 4, CS, 11);
              ctx.fillStyle = '#c8b078'; for (let k = 0; k < 2; k++) { ctx.fillRect(x + 1, sy + 4 + k * 5, 6, 4); ctx.fillRect(x + 9, sy + 4 + k * 5, 6, 4); }
              ctx.fillStyle = '#a89058'; ctx.fillRect(x + 1, sy + 7, 14, 1);
            } else if (v === C_RUIN) {
              ctx.fillStyle = th.ruin2; ctx.fillRect(x, sy, CS, CS);
              ctx.fillStyle = th.ruin; ctx.fillRect(x + 1, sy + 1, 14, 9);
              ctx.fillStyle = th.ruin2; ctx.fillRect(x + ((h * 10) | 0), sy + 3, 2, 3); ctx.fillRect(x, sy + 5, CS, 1);
            } else if (v === C_FORT) {
              ctx.fillStyle = '#5a5a60'; ctx.fillRect(x, sy, CS, CS);
              ctx.fillStyle = '#8a8a94'; ctx.fillRect(x, sy, CS, 3); ctx.fillRect(x + 1, sy + 4, 6, 5); ctx.fillRect(x + 9, sy + 4, 6, 5); ctx.fillRect(x + 4, sy + 10, 8, 5);
            }
          }
        }
      }
      function drawTrees(ctx, camY) {
        const M = g.map, th = M.th;
        const r0 = Math.floor(camY / CS) - 1, r1 = Math.floor((camY + H) / CS);
        for (let rw = r0; rw <= r1; rw++) {
          const ri = rw + M.ROWS; if (ri < 0 || ri >= M.ROWS) continue;
          const sy = rw * CS - camY;
          for (let c = 0; c < COLS; c++) {
            if (M.grid[ri * COLS + c] !== C_TREE) continue;
            const x = c * CS, h = hash(c * 3, ri);
            if (th.palm) {
              ctx.fillStyle = '#7a5a30'; ctx.fillRect(x + 7, sy + 6, 3, 10);
              ctx.fillStyle = th.tree2; ctx.fillRect(x - 2, sy, 20, 4); ctx.fillRect(x + 4, sy - 4, 8, 12);
              ctx.fillStyle = th.tree; ctx.fillRect(x, sy + 1, 7, 2); ctx.fillRect(x + 10, sy + 1, 7, 2); ctx.fillRect(x + 6, sy - 3, 4, 8);
            } else {
              ctx.fillStyle = th.tree2; ctx.fillRect(x - 1, sy - 2, 18, 17); ctx.fillRect(x + 2, sy - 4, 12, 21);
              ctx.fillStyle = th.tree; ctx.fillRect(x + 1, sy - 2, 13, 12); ctx.fillRect(x + 3 + ((h * 3) | 0), sy - 3, 8, 15);
              ctx.fillStyle = th.tree3; ctx.fillRect(x + 3, sy - 1, 4, 3); ctx.fillRect(x + 9, sy + 4, 3, 2);
            }
          }
        }
      }
      // little soldier, 3/4 view; dir 0..7 (0 right, 2 down, 6 up)
      function drawMan(ctx, x, y, dir, step, pal, opts) {
        opts = opts || {};
        x = Math.round(x); y = Math.round(y);
        const dx = DIR8[dir][0], dy = DIR8[dir][1];
        if (opts.dying) {
          const k = opts.dying;
          ctx.fillStyle = pal.body; ctx.fillRect(x - 5, y, 10, 4);
          ctx.fillStyle = pal.skin; ctx.fillRect(x + (k & 4 ? 5 : -8), y, 3, 3);
          ctx.fillStyle = pal.legs; ctx.fillRect(x + (k & 4 ? -8 : 5), y + 1, 3, 3);
          if (k < 10) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 6, 2, 2); }
          return;
        }
        if (!opts.wade) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 4, y + 7, 9, 2); }
        const lp = step & 1;
        if (!opts.wade) {
          ctx.fillStyle = pal.legs;
          if (dx !== 0 && dy === 0) { ctx.fillRect(x - 2 + (lp ? -1 : 1), y + 2, 2, 5); ctx.fillRect(x + (lp ? 1 : -1), y + 2, 2, 5); }
          else { ctx.fillRect(x - 3, y + 2, 2, lp ? 5 : 3); ctx.fillRect(x + 1, y + 2, 2, lp ? 3 : 5); }
          ctx.fillStyle = '#201810'; ctx.fillRect(x - 3, y + (lp ? 6 : 4), 2, 1); ctx.fillRect(x + 1, y + (lp ? 4 : 6), 2, 1);
        }
        ctx.fillStyle = pal.body; ctx.fillRect(x - 4, y - 3, 8, 6);
        if (pal.belt) { ctx.fillStyle = pal.belt; ctx.fillRect(x - 4, y + 1, 8, 1); }
        ctx.fillStyle = pal.skin; ctx.fillRect(x - 5, y - 2 + lp, 1, 3); ctx.fillRect(x + 4, y - 1 - lp + 1, 1, 3);
        // head
        ctx.fillStyle = pal.skin; ctx.fillRect(x - 2, y - 8, 5, 5);
        ctx.fillStyle = pal.hair;
        if (dy < 0) ctx.fillRect(x - 2, y - 8, 5, 4); else ctx.fillRect(x - 2, y - 8, 5, 2);
        if (dx > 0) ctx.fillRect(x - 2, y - 8, 2, 4); if (dx < 0) ctx.fillRect(x + 1, y - 8, 2, 4);
        if (pal.hat) { ctx.fillStyle = pal.hat; ctx.fillRect(x - 3, y - 9, 7, 3); }
        if (pal.band) { ctx.fillStyle = pal.band; ctx.fillRect(x - 2, y - 6, 5, 1); if (dy <= 0) ctx.fillRect(x + (dx > 0 ? -3 : 3), y - 6, 1, 3); }
        if (dy >= 0 && dx === 0 && !pal.hat) { ctx.fillStyle = '#201010'; ctx.fillRect(x - 1, y - 5, 1, 1); ctx.fillRect(x + 1, y - 5, 1, 1); }
        if (opts.wade) { ctx.fillStyle = 'rgba(160,210,255,0.8)'; ctx.fillRect(x - 6, y + 2, 13, 2); }
        // gun
        if (pal.gun) {
          const L = 7, ox = x + (dx >= 0 ? 1 : -1), oy = y - 1;
          ctx.fillStyle = pal.gun;
          for (let i = 1; i <= L; i++) ctx.fillRect(Math.round(ox + dx * i), Math.round(oy + dy * i), 2, 1);
        }
      }
      function drawTank(ctx, x, y, ang, tur, body, dark, flash, tread) {
        const set = tankSet(flash ? '#ffffff' : body, flash ? '#ffffff' : dark);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(x - 8), Math.round(y + 8), 18, 4);
        drawC(ctx, set[angIdx(ang, NR)], x, y);
        if (tread & 4) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; const a = ang + Math.PI / 2; ctx.fillRect(Math.round(x + Math.cos(a) * 6) - 1, Math.round(y + Math.sin(a) * 6) - 1, 2, 2); ctx.fillRect(Math.round(x - Math.cos(a) * 6) - 1, Math.round(y - Math.sin(a) * 6) - 1, 2, 2); }
        ctx.fillStyle = dark; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 7, 7);
        ctx.fillStyle = '#202020';
        for (let i = 3; i < 13; i++) ctx.fillRect(Math.round(x + Math.cos(tur) * i), Math.round(y + Math.sin(tur) * i), 2, 2);
      }
      function drawHeli(ctx, e) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(Math.round(e.x + 6), Math.round(e.y + 18), 14, 4);
        drawC(ctx, HELI[angIdx(e.ang, NR)], e.x, e.y);
        if (e.flash) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(Math.round(e.x - 5), Math.round(e.y - 5), 10, 10); }
        ctx.fillStyle = 'rgba(220,220,220,0.8)'; const a = frame * 0.45;
        for (const s of [0, Math.PI / 2]) ctx.fillRect(Math.round(e.x + Math.cos(a + s) * 12 - 1), Math.round(e.y - 2 + Math.sin(a + s) * 12 - 1), 2, 2), ctx.fillRect(Math.round(e.x - Math.cos(a + s) * 12 - 1), Math.round(e.y - 2 - Math.sin(a + s) * 12 - 1), 2, 2);
      }
      function drawPillbox(ctx, e) {
        const x = Math.round(e.x), y = Math.round(e.y);
        ctx.fillStyle = e.flash ? '#fff' : '#606058'; ctx.fillRect(x - 8, y - 6, 16, 13); ctx.fillRect(x - 6, y - 8, 12, 17);
        ctx.fillStyle = '#8a8a7a'; ctx.fillRect(x - 5, y - 6, 10, 6);
        ctx.fillStyle = '#101010'; ctx.fillRect(x - 4, y + 1, 8, 2);
        if (e.fireT < 8) { ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 2, y + 3, 4, 2); }
      }
      function drawBoss(ctx, B, camY) {
        const x = Math.round(B.x), y = Math.round(B.y - camY);
        const fl = B.flash ? '#ffffff' : null;
        if (B.type === 'gate') {
          ctx.fillStyle = fl || '#6a4a28'; ctx.fillRect(x - 16, y - 16, 32, 30);
          ctx.fillStyle = '#3a2810'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 15 + i * 8, y - 16, 1, 30);
          ctx.fillStyle = '#909098'; ctx.fillRect(x - 16, y - 8, 32, 2); ctx.fillRect(x - 16, y + 6, 32, 2);
          const dmg = 1 - B.core / B.coreMax;
          ctx.fillStyle = '#201008'; if (dmg > 0.3) ctx.fillRect(x - 6, y - 4, 6, 6); if (dmg > 0.6) ctx.fillRect(x + 2, y + 2, 7, 8);
          ctx.fillStyle = '#c03020'; ctx.fillRect(x - 20, y - 22, 40, 5);
          text(ctx, CFG.gateSign || 'HQ', x, y - 21, '#ffe040', { center: true, adv: 6 });
        } else if (B.type === 'bigtank') {
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 22, y + 22, 48, 6);
          ctx.fillStyle = '#202020'; ctx.fillRect(x - 26, y - 22, 10, 46); ctx.fillRect(x + 16, y - 22, 10, 46);
          ctx.fillStyle = '#505050'; for (let i = 0; i < 6; i++) { const o = (i * 8 + (B.t >> 1)) % 46; ctx.fillRect(x - 26, y - 22 + o, 10, 2); ctx.fillRect(x + 16, y - 22 + o, 10, 2); }
          ctx.fillStyle = fl || '#6a6a3a'; ctx.fillRect(x - 17, y - 20, 34, 42);
          ctx.fillStyle = '#4a4a28'; ctx.fillRect(x - 11, y - 10, 22, 20);
          ctx.fillStyle = '#202020'; for (let i = 8; i < 26; i++) ctx.fillRect(x - 1, y + i, 3, 2);
        } else if (B.type === 'train') {
          for (let i = -2; i <= 2; i++) {
            const cx = x + i * 32;
            ctx.fillStyle = '#2a2a2a'; ctx.fillRect(cx - 15, y - 9, 30, 18);
            ctx.fillStyle = fl || (i === 0 ? '#6a2a20' : '#4a5a4a'); ctx.fillRect(cx - 14, y - 8, 28, 16);
            ctx.fillStyle = '#8a8a8a'; ctx.fillRect(cx - 14, y - 8, 28, 2);
            ctx.fillStyle = '#101010'; ctx.fillRect(cx + 14, y - 1, 4, 2);
          }
          ctx.fillStyle = '#5a4030'; ctx.fillRect(0, y + 10, W, 2); ctx.fillRect(0, y - 12, W, 2);
          ctx.fillStyle = '#3a2a1a'; for (let i = 0; i < W; i += 8) ctx.fillRect(i, y - 12, 3, 24);
        } else if (B.type === 'gunship') {
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 10, y + 40, 40, 8);
          ctx.fillStyle = fl || '#3a4a3a'; ctx.fillRect(x - 14, y - 22, 28, 40); ctx.fillRect(x - 32, y + 2, 64, 8); ctx.fillRect(x - 4, y + 18, 8, 22); ctx.fillRect(x - 12, y + 36, 24, 4);
          ctx.fillStyle = '#80d0ff'; ctx.fillRect(x - 8, y - 20, 16, 8);
          ctx.fillStyle = 'rgba(220,220,220,0.7)'; const a = frame * 0.4;
          for (let k = 0; k < 2; k++) { const aa = a + k * Math.PI / 2; for (let i = -30; i <= 30; i += 3) ctx.fillRect(Math.round(x + Math.cos(aa) * i), Math.round(y - 2 + Math.sin(aa) * i * 0.6), 2, 2); }
        } else {
          ctx.fillStyle = fl || '#707060'; ctx.fillRect(x - 70, y - 16, 140, 30);
          ctx.fillStyle = '#909080'; ctx.fillRect(x - 70, y - 16, 140, 4);
          ctx.fillStyle = '#404038'; for (let i = -64; i < 70; i += 16) ctx.fillRect(x + i, y - 8, 10, 3);
          ctx.fillStyle = '#c03020'; ctx.fillRect(x - 8, y - 6, 16, 12);
        }
        for (const q of B.parts) {
          const px = x + q.dx, py = y + q.dy;
          if (q.hp <= 0) { ctx.fillStyle = '#201810'; ctx.fillRect(px - 5, py - 5, 10, 10); continue; }
          ctx.fillStyle = q.flash ? '#fff' : '#505050'; ctx.fillRect(px - 6, py - 6, 12, 12);
          ctx.fillStyle = '#c03020'; ctx.fillRect(px - 3, py - 3, 6, 6);
          const a = aim(B.x + q.dx, B.y + q.dy); ctx.fillStyle = '#101010';
          for (let i = 4; i < 10; i++) ctx.fillRect(Math.round(px + Math.cos(a) * i), Math.round(py + Math.sin(a) * i), 2, 2);
        }
      }
      function drawBoom(ctx, f, camY) {
        if (f.t < 0) return;
        const x = Math.round(f.x), y = Math.round(f.y - camY), m = f.big ? 2 : 1, t = f.t;
        const r = (3 + t * 0.7) * m;
        const cols = ['#ffffff', '#ffe060', '#ff9020', '#d03010', '#503020'];
        ctx.fillStyle = cols[Math.min(4, (t / (f.big ? 7 : 5)) | 0)];
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * 0.07; ctx.fillRect(Math.round(x + Math.cos(a) * r) - m, Math.round(y + Math.sin(a) * r) - m, 2 * m + 1, 2 * m + 1); }
        if (t < 10) ctx.fillRect(x - 3 * m, y - 3 * m, 6 * m, 6 * m);
      }
      function drawItem(ctx, it, camY) {
        if (it.t < 150 && (frame >> 2) & 1) return;
        const x = Math.round(it.x), y = Math.round(it.y - camY);
        ctx.fillStyle = '#202020'; ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.fillStyle = CFG.itemCol[it.k] || '#ffe040'; ctx.fillRect(x - 5, y - 5, 10, 10);
        text(ctx, it.k, x - 2, y - 3, '#000');
      }
      function drawHUD(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 18);
        if ((frame >> 4) & 1 || mode === 'title') text(ctx, '1UP', 6, 1, '#ff4040');
        text(ctx, String(g ? g.score : 0), 70, 10, '#fff', { right: true });
        text(ctx, 'HI', 112, 1, '#ff4040', { center: true });
        text(ctx, String(Math.max(hi, g ? g.score : 0)), 140, 10, '#fff', { right: true });
        if (!g || mode !== 'game') return;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H - 12, W, 12);
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) drawMan(ctx, 6 + i * 10, H - 5, 2, 0, Object.assign({}, CFG.playerPal, { gun: null }), { wade: true });
        if (CFG.ammo) {
          ctx.fillStyle = '#ffe040'; ctx.fillRect(150, H - 9, 2, 5); ctx.fillRect(153, H - 9, 2, 5);
          text(ctx, pad2(g.bullets), 158, H - 9, g.bullets < 15 && (frame >> 3) & 1 ? '#ff4040' : '#fff');
          ctx.fillStyle = '#5a7a3a'; ctx.fillRect(184, H - 9, 6, 6); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(186, H - 10, 2, 2);
          text(ctx, pad2(g.grenades), 194, H - 9, '#fff');
        } else {
          text(ctx, g.weapon ? CFG.weaponNames[g.weapon] : 'RIFLE', 150, H - 9, g.weapon ? '#60e0ff' : '#c0c0c0', { center: true, adv: 7 });
          text(ctx, 'H ' + pad2(g.rescued), W - 4, H - 9, '#60ff60', { right: true });
        }
        if (g.p.tank) {
          const t = g.p.tank;
          text(ctx, 'FUEL', 60, H - 9, '#ffe040');
          ctx.fillStyle = '#400'; ctx.fillRect(94, H - 9, 40, 5);
          ctx.fillStyle = t.fuel < 20 && (frame >> 3) & 1 ? '#ff2020' : '#40ff40'; ctx.fillRect(94, H - 9, Math.max(0, Math.round(40 * t.fuel / 100)), 5);
          ctx.fillStyle = '#ff8040'; ctx.fillRect(94, H - 3, Math.max(0, Math.round(40 * t.armor / 8)), 1);
        }
        text(ctx, 'AREA ' + (g.stage + 1), W - 4, 1, '#ffe040', { right: true });
      }
      function drawTitle(ctx) {
        ctx.fillStyle = CFG.titleBg; ctx.fillRect(0, 0, W, H);
        // scrolling jungle strip at the bottom
        for (let i = 0; i < 16; i++) { const x = ((i * 37 - titleT * 0.5) % 260 + 260) % 260 - 20; ctx.fillStyle = '#1c4a1c'; ctx.fillRect(Math.round(x), 196, 22, 16); ctx.fillStyle = '#2c6a2c'; ctx.fillRect(Math.round(x) + 3, 194, 15, 12); }
        CFG.logo(ctx, titleT, frame);
        const ph = Math.floor(titleT / 360) % 2;
        if (ph === 0) {
          const pal = CFG.playerPal;
          drawMan(ctx, 70, 168, (titleT >> 5) % 8, (frame >> 3) & 1, pal, {});
          drawMan(ctx, 150, 168, 4, (frame >> 3) & 1, CFG.enemyPal, {});
          text(ctx, CFG.tagline, 112, 132, '#fff', { center: true, adv: 7, shadow: '#000' });
          text(ctx, 'FIRE SPACE  GRENADE X', 112, 146, '#ffe040', { center: true, adv: 7, shadow: '#000' });
          text(ctx, 'WALK INTO A TANK TO DRIVE', 112, 182, '#60e0ff', { center: true, adv: 7, shadow: '#000' });
        } else {
          let y = 128;
          for (const [lbl, pts] of CFG.scoreTable) { text(ctx, lbl, 40, y, '#fff', { adv: 7, shadow: '#000' }); text(ctx, String(pts), 190, y, '#ffe040', { right: true, shadow: '#000' }); y += 11; }
        }
        if (api.credits > 0) { if ((frame >> 5) & 1) text(ctx, 'PUSH START', 112, 222, '#40ffff', { center: true, shadow: '#000' }); }
        else if (coinFlash > 0 ? (frame >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', 112, 222, coinFlash ? '#ffe040' : '#ff4040', { center: true, shadow: '#000' });
        text(ctx, CFG.copyright, 112, 234, '#c0c0c0', { center: true, adv: 7 });
        text(ctx, 'CREDIT ' + pad2(api.credits), 8, 246, '#fff');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        const camY = Math.round(g.camY);
        drawMap(ctx, camY);
        for (const pr of g.props) {
          const x = pr.x, y = pr.y - camY;
          if (pr.k === 'crate') { ctx.fillStyle = '#7a5020'; ctx.fillRect(Math.round(x - 6), Math.round(y - 5), 12, 11); ctx.fillStyle = '#a87838'; ctx.fillRect(Math.round(x - 5), Math.round(y - 4), 10, 9); ctx.fillStyle = '#5a3810'; ctx.fillRect(Math.round(x - 5), Math.round(y), 10, 1); ctx.fillRect(Math.round(x), Math.round(y - 4), 1, 9); }
          else if (pr.k === 'emptytank') { drawTank(ctx, x, y, pr.ang, pr.ang, CFG.tankCol[0], CFG.tankCol[1], 0, 0); if ((frame >> 4) & 1) text(ctx, 'IN', x, y - 18, '#60e0ff', { center: true, adv: 6 }); }
          else if (pr.k === 'hostage') {
            if (!pr.free) { ctx.fillStyle = '#7a5a30'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 12, 2, 18); }
            drawMan(ctx, x, y, pr.free ? 2 : 2, pr.free ? (frame >> 3) & 1 : 0, CFG.hostagePal, {});
            if (!pr.free) { ctx.fillStyle = '#c0a060'; ctx.fillRect(Math.round(x) - 4, Math.round(y) - 1, 8, 1); if ((frame >> 5) & 1) text(ctx, 'HELP', x, y - 22, '#fff', { center: true, adv: 6 }); }
          }
        }
        for (const it of g.items) drawItem(ctx, it, camY);
        // ground vehicles & soldiers
        for (const e of g.en) if (e.k === 'pillbox') drawPillbox(ctx, Object.assign({}, e, { y: e.y - camY }));
        for (const e of g.en) if (e.k === 'tank') drawTank(ctx, e.x, e.y - camY, e.ang, e.tur, CFG.etankCol[0], CFG.etankCol[1], e.flash, e.tread || 0);
        const p = g.p;
        const showP = g.phase !== 'wait' && g.phase !== 'over';
        for (const e of g.en) {
          if (e.k === 'tank' || e.k === 'heli' || e.k === 'pillbox') continue;
          const pal = e.k === 'officer' ? CFG.officerPal : e.k === 'grenadier' ? CFG.grenPal : CFG.enemyPal;
          drawMan(ctx, e.x, e.y - camY, e.dir, e.step, pal, { dying: e.dying, wade: !e.dying && cellAt(e.x, e.y + 4) === C_WATER });
        }
        if (showP) {
          if (p.tank) {
            if (!(p.tank.fail && (frame >> 2) & 1)) drawTank(ctx, p.x, p.y - camY, p.tank.ang, p.tank.tur, CFG.tankCol[0], CFG.tankCol[1], p.tank.flash, p.tank.tread);
            if (p.tank.fail) text(ctx, 'GET OUT!', p.x, p.y - camY - 22, '#ff4040', { center: true, adv: 7 });
          } else if (p.dead) {
            drawMan(ctx, p.x, p.y - camY, p.dir, 0, CFG.playerPal, { dying: p.dead });
          } else if (!(p.inv && (frame >> 1) & 1)) drawMan(ctx, p.x, p.y - camY, p.dir, p.step, CFG.playerPal, { wade: p.wade });
        }
        drawTrees(ctx, camY);
        if (g.boss) drawBoss(ctx, g.boss, camY);
        for (const e of g.en) if (e.k === 'heli') drawHeli(ctx, Object.assign({}, e, { y: e.y - camY }));
        // projectiles
        for (const s of g.ps) {
          const x = Math.round(s.x), y = Math.round(s.y - camY);
          if (s.flame) { ctx.fillStyle = s.life > 14 ? '#ffffa0' : s.life > 8 ? '#ffa020' : '#d03010'; const sz = 2 + ((20 - s.life) >> 2); ctx.fillRect(x - (sz >> 1), y - (sz >> 1), sz, sz); }
          else if (s.rocket) { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#ff9020'; ctx.fillRect(Math.round(x - s.vx), Math.round(y - s.vy), 2, 2); }
          else { ctx.fillStyle = '#ffffa0'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        }
        for (const q of g.gr) {
          const x = Math.round(q.x), y = Math.round(q.y - camY);
          if (q.shell) { ctx.fillStyle = '#202020'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = '#ffe060'; ctx.fillRect(x - 1, y - 1, 2, 2); }
          else { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 1, y + 1, 3, 2); ctx.fillStyle = q.enemy ? '#404040' : '#3a5a2a'; ctx.fillRect(x - 2, Math.round(y - q.z) - 2, 4, 4); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 1, Math.round(y - q.z) - 3, 2, 1); }
        }
        for (const b of g.eb) { const x = Math.round(b.x), y = Math.round(b.y - camY); ctx.fillStyle = (frame >> 2) & 1 ? '#ffffff' : '#ff6040'; ctx.fillRect(x - 1, y - 1, 3, 3); }
        for (const f of g.fx) drawBoom(ctx, f, camY);
        for (const q of g.pops) text(ctx, q.txt, q.x, Math.round(q.y - camY), q.col, { center: true, adv: 6, shadow: '#000' });
        if (g.boss) {
          const B = g.boss;
          ctx.fillStyle = '#400'; ctx.fillRect(40, 20, 144, 3); ctx.fillStyle = '#ff3030'; ctx.fillRect(40, 20, Math.max(0, Math.round(144 * B.core / B.coreMax)), 3);
        }
        if (g.phase === 'ready') {
          text(ctx, 'AREA ' + (g.stage + 1), 112, 96, '#ffe040', { center: true, scale: 2, shadow: '#000' });
          text(ctx, g.map.th.name, 112, 118, '#fff', { center: true, shadow: '#000' });
        }
        if (g.phase === 'boss' && g.boss && g.boss.t < 120 && (frame >> 3) & 1) text(ctx, CFG.bossMsg(g.map.bossType), 112, 120, '#ff4040', { center: true, shadow: '#000' });
        if (g.phase === 'clear' && g.phaseT < 220) text(ctx, CFG.clearMsg, 112, 110, '#fff', { center: true, shadow: '#000' });
        if (g.phase === 'over') text(ctx, 'GAME OVER', 112, 120, '#ff4040', { center: true, scale: 2, shadow: '#000' });
        drawHUD(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
