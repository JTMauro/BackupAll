// Joust (Williams Electronics, 1982) \u2014 browser recreation for Arcade Games Galore.
// Hand-made pixel art from string arrays + palettes; no external assets.
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pixel helpers
  // ---------------------------------------------------------------------------
  const FONTSRC = "01c26636363321c10c1c0c0c0c0c3f23e63071e3c707f33f060c1e03633e40e1e36667f060657e607e0303633e61e30607e63633e77f63060c18181883c62723c4f433e93e63633f03063cA1c3663637f6363B7e63637e63637eC1e33606060331eD7c66636363667cE7f60607e60607fF7f60607e606060G1f30606763331fH6363637f636363I3f0c0c0c0c0c3fJ0703030363633eK63666c787c6e67L3030303030303fM63777f7f6b6363N63737b7f6f6763O3e63636363633eP7e6363637e6060Q3e6363636f663dR7e6363677c6e67S3c66603e03633eT7e181818181818U6363636363633eV636363773e1c08W63636b7f7f7763X63773e1c3e7763Y6666663c181818Z7f070e1c38707f 00000000000000.00000000001818,00000000181830-0000003e000000!18181818180018?3e63060c0c000c=00007e007e0000:00181800181800'18183000000000\"6c6c4800000000/03060c18306000(0c18303030180c)180c0606060c18@1e214d514d211e*002a1c3e1c2a00+0008083e080800%62640810264600<060c1830180c06>30180c060c1830#14147f147f1414";
  const FONT = {};
  for (let i = 0; i + 15 <= FONTSRC.length; i += 15) {
    const rows = [];
    for (let r = 0; r < 7; r++) rows.push(parseInt(FONTSRC.substr(i + 1 + r * 2, 2), 16));
    FONT[FONTSRC[i]] = rows;
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').imageSmoothingEnabled = false; return c; }
  const glyphCache = new Map();
  function glyph(ch, col) {
    const k = ch + col; let g = glyphCache.get(k);
    if (g) return g;
    const rows = FONT[ch]; if (!rows) return null;
    g = mk(7, 7); const x = g.getContext('2d'); x.fillStyle = col;
    for (let r = 0; r < 7; r++) for (let b = 0; b < 7; b++) if (rows[r] & (64 >> b)) x.fillRect(b, r, 1, 1);
    glyphCache.set(k, g); return g;
  }
  function txt(ctx, s, x, y, col) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) { const g = glyph(s[i], col || '#fff'); if (g) ctx.drawImage(g, x + i * 8, y); }
  }
  function txtC(ctx, s, y, col) { s = String(s); txt(ctx, s, Math.round((292 - s.length * 8) / 2), y, col); }
  function spr(rows, pal) {
    let w = 0; for (const r of rows) w = Math.max(w, r.length);
    const c = mk(w, rows.length), x = c.getContext('2d');
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
    }
    return c;
  }
  function flip(c) { const o = mk(c.width, c.height), x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const chance = p => Math.random() < p;

  // ---------------------------------------------------------------------------
  // Pixel art. Mounts are 22x22, facing right; feet at the bottom row.
  //   K rider armour, D visor, L lance, B bird body, W wing, H head, E eye, b beak/legs
  // ---------------------------------------------------------------------------
  const RIDER_TOP = [
    '.........kK...........',
    '........KKKK..........',
    '........KDDD..........',
    '........KKKk..........',
    '.........Kk...........',
    '.......kKKKK..........',
    '......SkKKKKk.........',
    '......SSKKKKLLLLLLLLLL',
    '......SSkKKk..........',
    '.......SkKK...........',
    '........kK............',
    '.........k............'];
  const OST_HEAD = [
    '......................',
    '................BBB...',
    '...............BBEBbbb',
    '...............BBBB...',
    '................BBB...',
    '................BB....',
    '...............BB.....',
    '...............BB.....',
    '..............BB......',
    '.............BBB......'];
  const BUZ_HEAD = [
    '......................',
    '................HH....',
    '...............HHEHb..',
    '...............HHHHbb.',
    '................HH.b..',
    '................BB....',
    '...............BBB....',
    '...............BB.....',
    '..............BBB.....',
    '.............BBBB.....'];
  const BODY_STAND = [
    '.WW.....BBBBBBBBB.....',
    'WWWW.BBBBBBBBBBBB.....',
    '.WWBBBBBWWWWWBBBB.....',
    '..BBBBBWWWWWWBBBU.....',
    '...UBBBBBBBBBBUU......',
    '......UUUUUUU.........'];
  const BODY_UP = [
    '...WWWWWBBBBBBBBB.....',
    '.WWWWBBBBBBBBBBBB.....',
    'WWBBBBBBBBBBBBBBB.....',
    '..BBBBBBBBBBBBBU......',
    '...UBBBBBBBBBUU.......',
    '......UUUUUUU.........'];
  const BODY_DOWN = [
    '.WW.....BBBBBBBBB.....',
    'WWWW.BBBBBBBBBBBB.....',
    '.WWBBBBBBBBBBBBBB.....',
    '..BBWWWWWWWBBBBU......',
    '...WWWWWWWWBBUU.......',
    '..WWWWWWWW.UU.........'];
  const WING_UP_OVER = { 3: 'W', 4: 'WW', 5: '.WW', 6: '.WWW', 7: '..WWW', 8: '..WWWW', 9: '...WWWW' };
  const LEGS = {
    stand: ['........b...b.........', '........b...b.........', '........b...b.........', '........b...b.........', '.......bb..bb.........', '......b.b.b.b.........'],
    run1: ['.......b.....b........', '......b.......b.......', '.....b.........b......', '....b...........b.....', '...bb...........bb....', '..b.b...........b.b...'],
    run2: ['........b...b.........', '.......b.....b........', '.......b......b.......', '......b.......b.......', '.....bb......bb.......', '....b.b.....b.b.......'],
    run3: ['.........b.b..........', '.........bb...........', '........b.b...........', '.......b...b..........', '......bb...bb.........', '.....b.b..b.b.........'],
    skid: ['..........b..b........', '...........b..b.......', '............b..b......', '.............b..b.....', '............bb.bb.....', '...........b.bb.b.....'],
    tuck: ['.........bbbb.........', '..........b..b........', '......................', '......................', '......................', '......................'],
    down: ['.WWWWWW...bb..........', '.WWWW......bb.........', '.WW........b..........', '......................', '......................', '......................']
  };
  function mount(head, body, legs, wingUp, rider) {
    const rows = [];
    for (let r = 0; r < 10; r++) rows.push(head[r]);
    for (const r of body) rows.push(r);
    for (const r of legs) rows.push(r);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r].split('');
      if (rider && r < RIDER_TOP.length) { const rr = RIDER_TOP[r]; for (let i = 0; i < rr.length; i++) if (rr[i] !== '.') row[i] = rr[i]; }
      if (wingUp && WING_UP_OVER[r]) { const w = WING_UP_OVER[r]; for (let i = 0; i < w.length; i++) if (w[i] !== '.') row[i] = w[i]; }
      rows[r] = row.join('');
    }
    return rows;
  }
  // pterodactyl 32x14 facing left
  const PTERO_A = [
    '....................WW..........',
    '...................WWW..........',
    '..................WVWW..........',
    '.................WVWWW..........',
    '................WVWWW...........',
    '...............WVWWW............',
    '....BBB.......WVWWW.............',
    '...BBEBBCC....WVWW..............',
    'bbbbBBBBBCCC.WVWW...............',
    '.....BBBBBBBBBBBBBBBBBBB........',
    '........BBBBBBBBBBBBBBBBBBBB....',
    '..........BBBBBBBBBBBBBBBBBBBBB.',
    '.............BBBBBB.......BBBBBB',
    '..............Bb..Bb............',
    '.............bb...bb............',
    '................................'];
  const PTERO_B = [
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '....BBB.........................',
    '...BBEBBCC......................',
    'bbbbBBBBBCCC....................',
    '.....BBBBBBBBBBBBBBBBBBB........',
    '........BBBBBWVVVVVBBBBBBBBB....',
    '..........BBBWWWWWWVVVBBBBBBBBB.',
    '.............WWWWWWWWV....BBBBBB',
    '..............WWWWWWWV..........',
    '...............WWWWWV...........',
    '................WWWV............'];
  const PAL_PTERO = { B: '#30a0ff', W: '#90d8ff', V: '#1050c0', E: '#ff2020', C: '#30a0ff', b: '#ffd000', M: '#ff2020' };
  function pteroMouth(rows) {
    const r = rows.slice();
    r[7] = 'bbbb' + r[7].slice(4);
    r[8] = 'MMM.' + r[8].slice(4);
    r[9] = 'bbbbB' + r[9].slice(5);
    return r;
  }
  const EGG = [
    '..EEE..',
    '.EEEEE.',
    'EESEEEE',
    'EEEEESE',
    'ESEEEEE',
    'EEEESEE',
    '.EEEEE.',
    '..EEE..'];
  const EGG_CRACK = [
    '.......',
    '.E...E.',
    'EE.E.EE',
    'EESEEEE',
    'ESEEEEE',
    'EEEESEE',
    '.EEEEE.',
    '..EEE..'];
  const HATCH = [
    '..KK....',
    '.KKKK...',
    '.KDDK...',
    '..KK....',
    '.KKKK...',
    'KKKKKK..',
    '.KKKK...',
    '.K..K...',
    '.K..K...',
    'KK..KK..'];
  const HATCH2 = [
    '..KK....',
    '.KKKK...',
    '.KDDK...',
    '..KK....',
    '.KKKK...',
    'KKKKKK..',
    '.KKKK...',
    '..KK....',
    '.K..K...',
    '.KK.KK..'];
  const HAND = [
    'H......H.....H..',
    'HH.....HH...HH..',
    '.HH....HH..HH...',
    '.HHH...HH..HH...',
    '..HHHHHHHHHH....',
    '..HHHHHHHHHH....',
    '...HHHHHHHHD....',
    '...HHHHHHHHD....',
    '....HHHHHHD.....',
    '....HHHHHHD.....',
    '....HHHHHHD.....',
    '....HHHHHHD.....',
    '....HHHHHHD.....',
    '....HHHHHHD.....',
    '....HDHHHHD.....',
    '....HHHHHHD.....',
    '....HHHHDHD.....',
    '....HHHHHHD.....',
    '....HHHHHHD.....',
    '....HDHHHHD.....',
    '....HHHHHHD.....',
    '....HHHHHHD.....',
    '....HHHHHHD.....',
    '....HHHHHHD.....'];

  const PAL_P1 = { K: '#f0f0f8', k: '#9090b0', D: '#202040', S: '#3868f0', L: '#ffffff', B: '#f0c800', W: '#fff090', U: '#a87800', H: '#f0c800', E: '#000000', b: '#c06000' };
  const RIDER_COLS = [
    { K: '#ff3030', k: '#a00000', D: '#300000', S: '#c0c0c0', name: 'BOUNDER', pts: 500 },
    { K: '#e0e0e8', k: '#8080a0', D: '#202030', S: '#ff4040', name: 'HUNTER', pts: 750 },
    { K: '#4070ff', k: '#1030a0', D: '#000830', S: '#ffd000', name: 'SHADOW LORD', pts: 1500 }
  ];
  const PAL_BUZ = { L: '#ffffff', B: '#20a040', W: '#70e070', U: '#0c6020', H: '#ff7070', E: '#000000', b: '#ffd000' };

  let SP = null;
  function buildSprites() {
    if (SP) return SP;
    const frames = (head, pal, rider) => {
      const f = {
        stand: mount(head, BODY_STAND, LEGS.stand, false, rider),
        run1: mount(head, BODY_STAND, LEGS.run1, false, rider),
        run2: mount(head, BODY_STAND, LEGS.run2, false, rider),
        run3: mount(head, BODY_STAND, LEGS.run3, false, rider),
        skid: mount(head, BODY_STAND, LEGS.skid, false, rider),
        flyUp: mount(head, BODY_UP, LEGS.tuck, true, rider),
        flyDown: mount(head, BODY_DOWN, LEGS.down, false, rider)
      };
      const out = {};
      for (const k in f) { const s = spr(f[k], pal); out[k] = [s, flip(s)]; }
      return out;
    };
    SP = {
      p1: frames(OST_HEAD, PAL_P1, true),
      p1Empty: frames(OST_HEAD, PAL_P1, false),
      buz: RIDER_COLS.map(rc => frames(BUZ_HEAD, Object.assign({}, PAL_BUZ, { K: rc.K, k: rc.k, D: rc.D, S: rc.S }), true)),
      buzEmpty: frames(BUZ_HEAD, PAL_BUZ, false),
      ptero: [spr(PTERO_A, PAL_PTERO), spr(PTERO_B, PAL_PTERO)],
      pteroOpen: [spr(pteroMouth(PTERO_A), PAL_PTERO), spr(pteroMouth(PTERO_B), PAL_PTERO)],
      egg: spr(EGG, { E: '#d8f0ff', S: '#5080c0' }),
      eggCrack: spr(EGG_CRACK, { E: '#d8f0ff', S: '#5080c0' }),
      hatch: RIDER_COLS.map(rc => [spr(HATCH, { K: rc.K, D: rc.D }), spr(HATCH2, { K: rc.K, D: rc.D })]),
      hand: spr(HAND, { H: '#ff8020', D: '#a03800' }),
      life: spr(['..BB', '.BBE', 'BBB.', '.BB.', 'B..B'], { B: '#f0c800', E: '#000' })
    };
    SP.pteroL = SP.ptero; SP.pteroR = SP.ptero.map(flip); SP.pteroOL = SP.pteroOpen; SP.pteroOR = SP.pteroOpen.map(flip);
    return SP;
  }

  // ---------------------------------------------------------------------------
  // Playfield
  // ---------------------------------------------------------------------------
  const W = 292, H = 240;
  const LAVA_Y = 226;
  function plat(x0, x1, y, o) { return Object.assign({ x0, x1, y, h: 7 }, o || {}); }
  function buildPlats() {
    return [
      plat(100, 180, 54, { pad: 140 }),
      plat(0, 48, 82), plat(244, 292, 82),
      plat(100, 168, 122),
      plat(0, 62, 146, { pad: 30 }),
      plat(206, 292, 132, { pad: 250 }),
      plat(0, 36, 196), plat(256, 292, 196),
      plat(72, 220, 210, { pad: 146, base: true, h: 30 }),
      plat(40, 72, 210, { bridge: true }), plat(220, 252, 210, { bridge: true })
    ];
  }
  // procedural rock texture (deterministic)
  let ROCK = null;
  function rockTile() {
    if (ROCK) return ROCK;
    const c = mk(32, 16), x = c.getContext('2d');
    let seed = 7;
    const r = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let j = 0; j < 16; j++) for (let i = 0; i < 32; i++) {
      const v = r();
      x.fillStyle = j === 0 ? '#ffd890' : j === 1 ? '#e0a050' : v < 0.15 ? '#5a2c10' : v < 0.45 ? '#8a4a1c' : '#a85e28';
      x.fillRect(i, j, 1, 1);
    }
    ROCK = c; return c;
  }

  // ---------------------------------------------------------------------------
  ArcadeRegistry.register({
    id: 'joust',
    title: 'Joust',
    year: 1982,
    maker: 'Williams',
    width: W, height: H,
    controls: 'Left/Right: run & steer \u00b7 Space: flap \u00b7 Enter: start',
    marquee: { bg: '#000000', fg: '#ffc800', accent: '#ff3000' },
    create(api) {
      const sp = buildSprites(); const rock = rockTile();
      const au = api.audio;
      const GRAV = 0.055, FLAP = 1.05, MAXVY = 2.6, MAXVX = 2.3;

      const S = { mode: 'title', t: 0, score: 0, hi: api.getHiScore(20000), lives: 5, wave: 1, nextExtra: 20000, deaths: 0, msgT: 0, msg: [], eggVal: 0 };
      let plats = buildPlats();
      let P = null;            // player
      let enemies = [], eggs = [], hatchlings = [], loose = [], pteros = [], popups = [], sparks = [], queue = [];
      let troll = null;
      let waveT = 0, spawnT = 0, pteroT = 0, flapSndT = 0, attractT = 0;

      const snd = {
        flap() { au.noise(0.09, { vol: 0.12, freq: 900, slideTo: 300, type: 'bandpass' }); },
        step(a) { au.tone(a ? 180 : 140, 0.03, { type: 'square', vol: 0.05 }); },
        skid() { au.noise(0.15, { vol: 0.12, freq: 3500, type: 'highpass' }); },
        clank() { au.noise(0.12, { vol: 0.2, freq: 6000, type: 'highpass' }); au.tone(1800, 0.1, { type: 'square', vol: 0.05, slideTo: 1200 }); },
        win() { au.tone(300, 0.25, { type: 'square', vol: 0.08, slideTo: 1200 }); au.noise(0.2, { vol: 0.15, freq: 2000, slideTo: 400 }); },
        egg() { au.melody([[1319, 0.04], [1760, 0.04], [2637, 0.08]], { type: 'square', vol: 0.06 }); },
        hatch() { au.melody([[2000, 0.05], [2400, 0.05], [2000, 0.05]], { type: 'triangle', vol: 0.06 }); },
        die() { au.tone(800, 0.6, { type: 'sawtooth', vol: 0.08, slideTo: 60 }); au.noise(0.4, { vol: 0.15, freq: 1500, slideTo: 100 }); },
        lava() { au.noise(0.6, { vol: 0.2, freq: 600, slideTo: 80 }); au.tone(120, 0.5, { type: 'sawtooth', vol: 0.06, slideTo: 40 }); },
        ptero() { au.tone(1600, 0.35, { type: 'sawtooth', vol: 0.06, slideTo: 2600 }); au.tone(1400, 0.35, { type: 'square', vol: 0.03, slideTo: 2200, delay: 0.1 }); },
        materialize() { au.tone(200, 0.6, { type: 'triangle', vol: 0.08, slideTo: 1600 }); },
        wave() { au.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]], { type: 'square', vol: 0.06 }); },
        troll() { au.tone(70, 0.6, { type: 'sawtooth', vol: 0.1, slideTo: 50 }); },
        extra() { au.melody([[1047, 0.08], [1319, 0.08], [1568, 0.08], [2093, 0.25]], { type: 'square', vol: 0.07 }); },
        bonus() { au.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.08], [1319, 0.3]], { type: 'square', vol: 0.07 }); }
      };

      function addScore(n, x, y) {
        S.score += n;
        while (S.score >= S.nextExtra) { S.lives++; S.nextExtra += 20000; snd.extra(); }
        if (S.score > S.hi) S.hi = S.score;
        if (x != null && popups.length < 12) popups.push({ x, y, s: String(n), t: 70 });
      }
      const wrapX = x => (x % W + W) % W;
      const dxw = (a, b) => { let d = a - b; if (d > W / 2) d -= W; if (d < -W / 2) d += W; return d; };
      function activePlats() { return plats.filter(p => !p.gone); }

      // ---------------- bird physics ----------------
      function newBird(x, y, o) { return Object.assign({ x, y, vx: 0, vy: 0, dir: 1, grounded: false, plat: null, flap: 0, anim: 0, skid: 0 }, o || {}); }
      function stepBird(b) {
        if (b.grounded) {
          const p = b.plat;
          if (!p || p.gone || b.x < p.x0 - 3 || b.x > p.x1 + 3) { b.grounded = false; b.plat = null; }
          else { b.vy = 0; b.y = p.y; }
        }
        if (!b.grounded) b.vy = Math.min(b.vy + GRAV, MAXVY);
        const px = b.x, py = b.y;
        b.x = wrapX(b.x + b.vx); b.y += b.vy;
        if (b.y - 21 < 8) { b.y = 29; b.vy = Math.abs(b.vy) * 0.4 + 0.2; }
        for (const p of activePlats()) {
          const inX = b.x > p.x0 - 5 && b.x < p.x1 + 5;
          const wasInX = px > p.x0 - 5 && px < p.x1 + 5;
          if (!b.grounded && inX && b.vy >= 0 && py <= p.y + 0.5 && b.y >= p.y) {
            b.y = p.y; b.vy = 0; b.grounded = true; b.plat = p; b.landed = 1;
            continue;
          }
          const bottom = p.y + p.h;
          if (inX && b.vy < 0 && py - 21 >= bottom - 1 && b.y - 21 < bottom) { b.y = bottom + 21; b.vy = 0.4; continue; }
          if (!wasInX && inX && b.y > p.y + 1 && b.y - 21 < bottom && Math.abs(dxw(px, b.x)) < 6) {
            b.x = px; b.vx = -b.vx * 0.7; if (Math.abs(b.vx) < 0.3) b.vx = (b.x < (p.x0 + p.x1) / 2 ? -0.4 : 0.4);
          }
        }
      }
      function birdFrame(b, set) {
        if (b.grounded) {
          if (b.skid > 0) return set.skid;
          if (Math.abs(b.vx) < 0.05) return set.stand;
          const f = ((b.anim / 5) | 0) % 4;
          return [set.run1, set.run2, set.run3, set.run2][f];
        }
        return b.flap > 0 ? set.flyDown : set.flyUp;
      }

      // ---------------- game setup ----------------
      function newGame() {
        S.score = 0; S.lives = 5; S.wave = 1; S.nextExtra = 20000; S.eggVal = 0;
        plats = buildPlats();
        enemies = []; eggs = []; hatchlings = []; loose = []; pteros = []; popups = []; sparks = []; queue = [];
        troll = null;
        spawnPlayer();
        startWave();
        S.mode = 'play';
      }
      function spawnPlayer() {
        const pad = plats.find(p => p.base);
        P = newBird(pad.pad, pad.y, { grounded: true, plat: pad, mat: 120, dead: 0, grip: 0, dir: 1, isPlayer: true });
        snd.materialize();
      }
      function waveKind(w) {
        if (w % 5 === 2 && w > 1) return 'survival';
        if (w % 5 === 0) return 'egg';
        if (w % 8 === 0 || (w > 8 && w % 5 === 3)) return 'ptero';
        return 'normal';
      }
      function startWave() {
        const w = S.wave, kind = waveKind(w);
        S.waveKind = kind; S.deaths = 0; S.eggVal = 0; waveT = 0; spawnT = 60; pteroT = Math.max(1800, 3600 - w * 120);
        const n = Math.min(8, 3 + Math.floor((w - 1) / 2));
        queue = [];
        for (let i = 0; i < n; i++) {
          let type = 0;
          const r = Math.random();
          if (w >= 3 && r < Math.min(0.6, 0.12 * (w - 2))) type = 1;
          if (w >= 6 && r < Math.min(0.35, 0.05 * (w - 5))) type = 2;
          if (w === 1) type = 0;
          queue.push(type);
        }
        S.msg = [];
        if (w === 1) S.msg.push('PREPARE TO JOUST', 'BUZZARD BAIT !');
        S.msg.unshift('WAVE ' + w);
        if (kind === 'survival') S.msg.push('SURVIVAL WAVE', '3000 POINTS IF YOU', 'DO NOT DIE');
        if (kind === 'egg') {
          S.msg.push('EGG WAVE');
          queue = [];
          const spots = [[120, 54], [160, 54], [20, 82], [270, 82], [130, 122], [30, 146], [240, 132], [110, 210], [180, 210]];
          for (let i = 0; i < Math.min(spots.length, 5 + (w >> 2)); i++) eggs.push(newEgg(spots[i][0], spots[i][1], 0, 0, Math.min(2, w >> 3)));
        }
        if (kind === 'ptero') { S.msg.push('PTERODACTYL WAVE'); pteroT = 240; }
        if (w === 3) { S.msg.push('BEWARE OF THE', 'LAVA TROLL'); burnBridges(); }
        if (w === 4) S.msg.push('WATCH THE BRIDGES');
        S.msgT = 200;
        snd.wave();
      }
      function burnBridges() {
        for (const p of plats) if (p.bridge && !p.gone) { p.gone = true; for (let i = 0; i < 30; i++) sparks.push({ x: rnd(p.x0, p.x1), y: p.y + rnd(0, 6), vx: rnd(-0.4, 0.4), vy: rnd(-1.5, -0.3), t: rnd(30, 70) | 0, c: chance(0.5) ? '#ffd000' : '#ff4000' }); }
      }
      function newEgg(x, y, vx, vy, type) { return { x, y, vx, vy, type, t: 0, hatch: 520 + (Math.random() * 200 | 0), grounded: false, plat: null }; }

      function spawnEnemy(type) {
        const pads = activePlats().filter(p => p.pad != null);
        const free = pads.filter(p => Math.abs(dxw(p.pad, P.x)) > 40 || Math.abs(p.y - P.y) > 30);
        const pad = (free.length ? free : pads)[(Math.random() * (free.length || pads.length)) | 0];
        const e = newBird(pad.pad + rnd(-10, 10), pad.y, { type, grounded: true, plat: pad, mat: 70, ai: 0, targetY: rnd(40, 180), dir: chance(0.5) ? 1 : -1, flapCool: 0 });
        enemies.push(e);
        snd.materialize();
      }

      // ---------------- player ----------------
      function updatePlayer() {
        if (P.dead > 0) {
          P.dead--;
          if (P.dead === 0) {
            if (S.lives > 0) spawnPlayer();
            else {
              const over = () => { api.setHiScore(S.score); S.hi = Math.max(S.hi, api.getHiScore(0)); S.mode = 'gameover'; S.t = 0; };
              // last knight lost: offer a continue \u2014 a fresh set of knights rematerializes in the same wave
              if (api.offerContinue) api.offerContinue(() => { S.lives = 5; spawnPlayer(); }, over);
              else over();
            }
          }
          return;
        }
        const left = api.key('ArrowLeft'), right = api.key('ArrowRight');
        const flap = api.pressed('Space') || api.pressed('KeyX') || api.pressed('KeyZ') || api.pressed('ArrowUp');
        const dir = left ? -1 : right ? 1 : 0;
        if (P.mat > 0) {
          P.mat--;
          if (dir || flap) P.mat = 0; else return;
        }
        if (P.grip > 0) { // held by the lava troll
          if (flap) { P.grip--; P.vy = -1.2; snd.flap(); if (P.grip <= 0) { troll.state = 'sink'; troll.held = null; } }
          return;
        }
        if (P.flap > 0) P.flap--;
        if (P.grounded) {
          if (dir) {
            if (Math.sign(P.vx) === -dir && Math.abs(P.vx) > 0.2) { P.vx += dir * 0.09; P.skid = 6; if (api.frame % 10 === 0) snd.skid(); }
            else { P.vx += dir * 0.05; P.dir = dir; }
          }
          if (P.skid > 0) P.skid--;
          P.anim += Math.abs(P.vx);
          if (Math.abs(P.vx) > 0.1 && ((P.anim / 5) | 0) !== P.lastStep) { P.lastStep = (P.anim / 5) | 0; if (P.lastStep % 2 === 0) snd.step(P.lastStep & 2); }
          if (flap) { P.grounded = false; P.plat = null; P.vy = -FLAP; P.flap = 8; snd.flap(); }
        } else {
          if (dir) { P.dir = dir; P.vx += dir * 0.012; }
          if (flap) { P.vy = Math.max(-MAXVY, P.vy - FLAP); P.flap = 8; if (dir) P.vx += dir * 0.28; snd.flap(); }
        }
        P.vx = Math.max(-MAXVX, Math.min(MAXVX, P.vx));
        if (P.grounded && Math.abs(P.vx) > 0.05) P.dir = P.skid > 0 ? P.dir : Math.sign(P.vx);
        stepBird(P);
        if (P.y > LAVA_Y + 2) killPlayer('lava');
      }
      function killPlayer(how) {
        if (P.dead > 0 || P.mat > 0) return;
        S.lives--; S.deaths++;
        if (how === 'lava') { snd.lava(); for (let i = 0; i < 20; i++) sparks.push({ x: P.x + rnd(-6, 6), y: LAVA_Y, vx: rnd(-0.6, 0.6), vy: rnd(-2, -0.5), t: rnd(20, 50) | 0, c: chance(0.5) ? '#ffd000' : '#ff4000' }); }
        else {
          snd.die();
          loose.push({ x: P.x, y: P.y, vx: P.dir * 1.5, vy: -0.5, set: sp.p1Empty, dir: P.dir, flap: 0, t: 0 });
          // the knight tumbles down
          sparks.push({ x: P.x, y: P.y - 12, vx: -P.dir * 0.5, vy: -1, t: 90, c: '#fff080', big: true });
        }
        P.dead = 150; P.grip = 0;
        if (troll && troll.held === P) { troll.held = null; troll.state = 'sink'; }
      }

      // ---------------- enemies ----------------
      function updateEnemies() {
        const speeds = [1.1, 1.5, 1.9];
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          if (e.mat > 0) { e.mat--; continue; }
          if (e.grip > 0) continue; // held by the troll
          if (e.flap > 0) e.flap--;
          e.ai--;
          if (e.ai <= 0) {
            e.ai = 40 + (Math.random() * 60 | 0);
            if (e.type === 0) { e.targetY = rnd(30, 190); if (chance(0.3)) e.dir = -e.dir; }
            else {
              const above = e.type === 2 ? 26 : 14;
              e.targetY = Math.max(30, Math.min(190, (P.dead ? rnd(40, 180) : P.y - above) + rnd(-10, 10)));
              if (!P.dead && chance(e.type === 2 ? 0.85 : 0.6)) e.dir = Math.sign(dxw(P.x, e.x)) || 1;
              else if (chance(0.25)) e.dir = -e.dir;
            }
          }
          if (e.y > 186) e.targetY = Math.min(e.targetY, 150);
          const maxV = speeds[e.type] + Math.min(0.5, S.wave * 0.03);
          if (e.grounded) {
            e.vx += e.dir * 0.05; e.anim += Math.abs(e.vx);
            if (chance(0.02 + e.type * 0.01) || e.y > e.targetY + 20) { e.grounded = false; e.plat = null; e.vy = -FLAP; e.flap = 8; }
          } else {
            e.vx += e.dir * 0.03;
            e.flapCool--;
            if (e.flapCool <= 0 && (e.y > e.targetY || e.vy > 1.4)) { e.vy = Math.max(-MAXVY, e.vy - FLAP); e.flap = 8; e.flapCool = [14, 10, 7][e.type]; }
          }
          e.vx = Math.max(-maxV, Math.min(maxV, e.vx));
          stepBird(e);
          if (Math.abs(e.vx) > 0.1) e.dir = Math.sign(e.vx) || e.dir;
          if (e.y > LAVA_Y + 2) { enemies.splice(i, 1); snd.lava(); continue; }
          // joust with player
          if (!P.dead && !P.mat && P.grip <= 0 && Math.abs(dxw(e.x, P.x)) < 13 && Math.abs(e.y - P.y) < 16) {
            if (P.y < e.y - 3) { // player higher: unseat enemy
              unseat(e, i);
            } else if (e.y < P.y - 3) {
              killPlayer('joust');
            } else {
              const d = Math.sign(dxw(P.x, e.x)) || 1;
              P.vx = d * Math.max(1, Math.abs(P.vx)); e.vx = -d * Math.max(1, Math.abs(e.vx)); e.dir = -d;
              P.x = wrapX(P.x + d * 3); e.x = wrapX(e.x - d * 3);
              snd.clank();
            }
          }
        }
        // enemy vs enemy: simple bounce
        for (let i = 0; i < enemies.length; i++) for (let j = i + 1; j < enemies.length; j++) {
          const a = enemies[i], b = enemies[j];
          if (a.mat || b.mat) continue;
          if (Math.abs(dxw(a.x, b.x)) < 12 && Math.abs(a.y - b.y) < 12) {
            const d = Math.sign(dxw(a.x, b.x)) || 1; a.vx = d * Math.abs(a.vx); b.vx = -d * Math.abs(b.vx); a.dir = d; b.dir = -d;
          }
        }
      }
      function unseat(e, idx) {
        addScore(RIDER_COLS[e.type].pts, e.x, e.y - 24);
        snd.win();
        eggs.push(newEgg(e.x, e.y - 10, e.vx * 0.8, Math.min(0, e.vy) - 0.5, Math.min(2, e.type + 1 > 2 ? 2 : e.type + 1)));
        eggs[eggs.length - 1].type = e.type; // hatches into the next rank
        loose.push({ x: e.x, y: e.y, vx: e.dir * 1.6, vy: -0.8, set: sp.buzEmpty, dir: e.dir, flap: 0, t: 0 });
        enemies.splice(idx, 1);
        P.vy = Math.min(P.vy, -0.6);
      }

      // ---------------- eggs & hatchlings ----------------
      function updateEggs() {
        for (let i = eggs.length - 1; i >= 0; i--) {
          const g = eggs[i]; g.t++;
          if (!g.grounded) {
            g.vy = Math.min(g.vy + GRAV * 1.2, 2.5);
            const py = g.y; g.x = wrapX(g.x + g.vx); g.y += g.vy;
            for (const p of activePlats()) {
              if (g.x > p.x0 - 2 && g.x < p.x1 + 2 && g.vy >= 0 && py <= p.y && g.y >= p.y) {
                g.y = p.y;
                if (g.vy > 0.8) { g.vy = -g.vy * 0.35; } else { g.vy = 0; g.grounded = true; g.plat = p; }
                g.vx *= 0.7;
              }
            }
            if (g.y > LAVA_Y) { eggs.splice(i, 1); continue; }
          } else {
            g.x = wrapX(g.x + g.vx); g.vx *= 0.94;
            if (g.x < g.plat.x0 - 2 || g.x > g.plat.x1 + 2 || g.plat.gone) { g.grounded = false; g.plat = null; }
          }
          // collect
          if (g.t > 12 && !P.dead && !P.mat && Math.abs(dxw(g.x, P.x)) < 9 && g.y > P.y - 20 && g.y < P.y + 4) {
            S.eggVal = Math.min(1000, S.eggVal + 250);
            let v = S.eggVal; if (!g.grounded) { v += 500; }
            addScore(v, g.x, g.y - 14); snd.egg();
            eggs.splice(i, 1); continue;
          }
          if (g.grounded && g.t > g.hatch) {
            hatchlings.push({ x: g.x, y: g.y, plat: g.plat, type: g.type, t: 0, dir: chance(0.5) ? 1 : -1 });
            eggs.splice(i, 1); snd.hatch();
          }
        }
        for (let i = hatchlings.length - 1; i >= 0; i--) {
          const h = hatchlings[i]; h.t++;
          if (h.t > 60 && !h.picker) {
            // a riderless buzzard swoops in to pick him up
            const fromLeft = chance(0.5);
            h.picker = { x: fromLeft ? h.x - 140 : h.x + 140, y: Math.max(20, h.y - 70), set: sp.buzEmpty };
          }
          if (h.t > 40 && h.t < 120 && h.t % 3 === 0) { h.x = wrapX(h.x + h.dir * 0.5); if (h.plat && (h.x < h.plat.x0 + 2 || h.x > h.plat.x1 - 2)) h.dir = -h.dir; }
          if (h.picker) {
            const pk = h.picker, dx = dxw(h.x, pk.x), dy = h.y - pk.y;
            const d = Math.hypot(dx, dy);
            const s = 1.6;
            if (d < 3) {
              const type = Math.min(2, h.type + 1);
              const e = newBird(h.x, h.y, { type, grounded: false, mat: 0, ai: 0, targetY: 60, dir: dx < 0 ? 1 : -1, flapCool: 0, vy: -1.5 });
              enemies.push(e); hatchlings.splice(i, 1); continue;
            }
            pk.x = wrapX(pk.x + dx / d * s); pk.y += dy / d * s; pk.dir = dx > 0 ? 1 : -1;
          }
          if (!P.dead && !P.mat && Math.abs(dxw(h.x, P.x)) < 9 && Math.abs(h.y - P.y) < 12) {
            S.eggVal = Math.min(1000, S.eggVal + 250);
            addScore(S.eggVal, h.x, h.y - 16); snd.egg(); hatchlings.splice(i, 1);
          }
        }
      }

      // ---------------- pterodactyl ----------------
      function spawnPtero() {
        const fromLeft = chance(0.5);
        pteros.push({ x: fromLeft ? -20 : W + 20, y: rnd(40, 170), dir: fromLeft ? 1 : -1, t: 0, vy: 0 });
        snd.ptero();
      }
      function updatePteros() {
        for (let i = pteros.length - 1; i >= 0; i--) {
          const p = pteros[i]; p.t++;
          const sp2 = 2.2 + Math.min(1, S.wave * 0.05);
          p.x += p.dir * sp2;
          if (p.x > W + 24) p.x = -20; if (p.x < -24) p.x = W + 20;
          const ty = P.dead ? 100 : P.y - 10;
          p.y += Math.max(-1.2, Math.min(1.2, (ty - p.y) * 0.03)) + Math.sin(p.t * 0.08) * 0.6;
          p.y = Math.max(24, Math.min(200, p.y));
          if (p.t % 120 === 0) snd.ptero();
          p.mouth = (p.t % 40) < 14;
          if (!P.dead && !P.mat) {
            const hx = p.x + p.dir * 14, hy = p.y - 2; // head position
            if (Math.abs(dxw(hx, P.x)) < 14 && Math.abs(hy - (P.y - 10)) < 12) {
              const facing = P.dir === -p.dir;
              const front = Math.sign(dxw(P.x, p.x)) === p.dir;
              if (p.mouth && facing && front && Math.abs(hy - (P.y - 12)) < 6) {
                addScore(1000, p.x, p.y - 16); snd.win();
                for (let k = 0; k < 24; k++) sparks.push({ x: p.x, y: p.y, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), t: rnd(20, 40) | 0, c: chance(0.5) ? '#40b8ff' : '#ffffff' });
                pteros.splice(i, 1); continue;
              } else killPlayer('ptero');
            } else if (Math.abs(dxw(p.x, P.x)) < 14 && Math.abs(p.y - (P.y - 8)) < 8) killPlayer('ptero');
          }
        }
      }

      // ---------------- lava troll ----------------
      function updateTroll() {
        if (S.wave < 3) return;
        if (!troll) troll = { state: 'idle', x: 0, y: H + 4, cool: 120, held: null };
        const T = troll;
        if (T.state === 'idle') {
          if (--T.cool > 0) return;
          const cands = [];
          if (!P.dead && !P.mat) cands.push(P);
          for (const e of enemies) if (!e.mat) cands.push(e);
          const low = cands.filter(b => b.y > 196 && !b.grounded && (b.x < 70 || b.x > 222));
          if (low.length) { T.target = low[0]; T.x = low[0].x; T.state = 'rise'; T.y = LAVA_Y + 8; snd.troll(); }
        } else if (T.state === 'rise') {
          const b = T.target;
          T.x += Math.max(-1.5, Math.min(1.5, dxw(b.x, T.x)));
          T.y -= 2.5;
          if (Math.abs(dxw(b.x, T.x)) < 8 && T.y <= b.y + 2) {
            T.state = 'hold'; T.held = b;
            if (b === P) { P.grip = 6; } else b.grip = 999;
          } else if (T.y < 170 || b.y < 170 || (b === P && P.dead)) T.state = 'sink';
        } else if (T.state === 'hold') {
          const b = T.held;
          if (!b) { T.state = 'sink'; return; }
          b.vx = 0; b.vy = 0; b.y += 0.45; b.x = T.x; T.y = b.y - 2;
          if (b.y > LAVA_Y + 4) {
            if (b === P) { P.grip = 0; killPlayer('lava'); }
            else { const i = enemies.indexOf(b); if (i >= 0) enemies.splice(i, 1); snd.lava(); }
            T.state = 'sink'; T.held = null;
          }
        } else if (T.state === 'sink') {
          T.y += 2;
          if (T.y > H + 4) { T.state = 'idle'; T.cool = 90; }
        }
      }

      // ---------------- update ----------------
      let coinFlash = 0, coinHold = 0, lastCredits = api.credits;
      function update() {
        S.t++;
        if (coinFlash > 0) coinFlash--;
        if (coinHold > 0) coinHold--;
        const cr = api.credits;
        if (S.mode === 'title') {
          attractT++;
          if (lastCredits === 0 && cr > 0) { coinHold = 150; coinFlash = 0; }
          lastCredits = cr;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCredits = api.credits; newGame(); }
            else { coinFlash = 150; api.audio.tone(70, 0.28, { type: 'square', vol: 0.3 }); api.audio.tone(58, 0.28, { type: 'sawtooth', vol: 0.15 }); }
          }
          return;
        }
        lastCredits = cr;
        if (S.mode === 'gameover') {
          updateMisc();
          if (S.t > 260 || (S.t > 60 && api.anyPressed('Enter'))) { S.mode = 'title'; S.t = 0; }
          return;
        }
        waveT++;
        if (S.msgT > 0) S.msgT--;
        updatePlayer();
        if (S.mode !== 'play') return;
        // spawn queue
        if (queue.length && S.msgT < 150) {
          if (--spawnT <= 0) { spawnEnemy(queue.shift()); spawnT = 70; }
        }
        // pterodactyl appears when the player dawdles (or on ptero waves)
        if (--pteroT <= 0) { if (pteros.length < 1 + (S.waveKind === 'ptero' ? 1 : 0)) spawnPtero(); pteroT = 1200; }
        updateEnemies();
        updateEggs();
        updatePteros();
        updateTroll();
        updateMisc();
        // wave cleared?
        if (!queue.length && !enemies.length && !eggs.length && !hatchlings.length && S.msgT === 0) {
          if (S.waveKind === 'survival' && S.deaths === 0) { addScore(3000, P.x, P.y - 30); snd.bonus(); }
          pteros = [];
          S.wave++; startWave();
        }
      }
      function updateMisc() {
        for (let i = loose.length - 1; i >= 0; i--) {
          const l = loose[i]; l.t++;
          if (l.t % 10 === 0) { l.vy = -1; l.flap = 6; }
          if (l.flap > 0) l.flap--;
          l.vy += GRAV; l.y += l.vy; l.x += l.vx * 1.2;
          if (l.x < -30 || l.x > W + 30 || l.y < -30 || l.t > 300) loose.splice(i, 1);
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i]; s.t--; s.x += s.vx; s.y += s.vy; s.vy += 0.05;
          if (s.t <= 0) sparks.splice(i, 1);
        }
        if (sparks.length > 200) sparks.splice(0, sparks.length - 200);
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }

      // ---------------- rendering ----------------
      function drawPlats(ctx) {
        for (const p of plats) {
          if (p.gone) continue;
          const w = p.x1 - p.x0;
          if (p.base) {
            // the great base platform with its stone body reaching down into the lava
            ctx.drawImage(rock, 0, 0, 32, 8, p.x0, p.y, 32, 8);
            for (let x = p.x0; x < p.x1; x += 32) ctx.drawImage(rock, 0, 0, Math.min(32, p.x1 - x), 16, x, p.y, Math.min(32, p.x1 - x), 16);
            for (let x = p.x0 + 4; x < p.x1 - 4; x += 32) ctx.drawImage(rock, 0, 2, Math.min(32, p.x1 - 4 - x), 14, x, p.y + 16, Math.min(32, p.x1 - 4 - x), 14);
            continue;
          }
          for (let x = p.x0; x < p.x1; x += 32) {
            const ww = Math.min(32, p.x1 - x);
            ctx.drawImage(rock, 0, 0, ww, p.h, x, p.y, ww, p.h);
          }
          // jagged underside
          ctx.fillStyle = '#8a4a1c';
          for (let x = p.x0 + 2; x < p.x1 - 2; x += 3) {
            const d = ((x * 13 + p.y * 7) % 5);
            ctx.fillRect(x, p.y + p.h, 2, d);
          }
          void w;
          if (p.pad != null) {
            const glow = ((api.frame >> 3) & 1) ? '#ffffff' : '#c0c0ff';
            ctx.fillStyle = glow; ctx.fillRect(p.pad - 10, p.y, 20, 1);
            ctx.fillStyle = '#6060ff'; ctx.fillRect(p.pad - 10, p.y + 1, 20, 1);
          }
        }
      }
      function drawLava(ctx) {
        ctx.fillStyle = '#9c0c00'; ctx.fillRect(0, LAVA_Y, W, H - LAVA_Y);
        const f = api.frame;
        for (let x = 0; x < W; x += 2) {
          const h = 2 + Math.round(Math.sin(x * 0.21 + f * 0.11) * 1.5 + Math.sin(x * 0.07 - f * 0.05) * 1.2);
          ctx.fillStyle = '#ff3000'; ctx.fillRect(x, LAVA_Y - h + 2, 2, h);
          if (((x * 7 + f) % 37) === 0) { ctx.fillStyle = '#ffd000'; ctx.fillRect(x, LAVA_Y - h - 1, 2, 2); }
        }
        ctx.fillStyle = '#ff6000';
        for (let i = 0; i < 12; i++) { const x = (i * 61 + f * (i % 3 + 1) * 0.3) % W; ctx.fillRect(x | 0, LAVA_Y + 4 + (i % 4) * 3, 3, 1); }
      }
      function drawBird(ctx, b, set) {
        const fr = birdFrame(b, set);
        const s = fr[b.dir >= 0 ? 0 : 1];
        const x = Math.round(b.x) - 11, y = Math.round(b.y) - 22;
        ctx.drawImage(s, x, y);
        if (x < 0) ctx.drawImage(s, x + W, y);
        if (x + 22 > W) ctx.drawImage(s, x - W, y);
      }
      function drawMaterialize(ctx, b, set, t) {
        // scan-line materialisation effect
        const s = set.stand[b.dir >= 0 ? 0 : 1];
        const x = Math.round(b.x) - 11, y = Math.round(b.y) - 22;
        for (let r = 0; r < 22; r++) if ((r + (t >> 1)) % 3 === 0 || t < 20) ctx.drawImage(s, 0, r, 22, 1, x, y + r, 22, 1);
        if ((t >> 2) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 22 - (t % 22), 18, 1); }
      }
      function drawHUD(ctx) {
        // score panel set in the base
        ctx.fillStyle = '#000'; ctx.fillRect(98, 224, 96, 14);
        ctx.fillStyle = '#ffd000'; ctx.fillRect(98, 224, 96, 1); ctx.fillRect(98, 237, 96, 1);
        txt(ctx, String(S.score).padStart(7, ' '), 100, 227, '#ffe000');
        for (let i = 0; i < Math.min(S.lives, 6); i++) ctx.drawImage(sp.life, 162 + i * 5, 228);
        if (S.lives > 6) txt(ctx, '+', 186, 227, '#ffe000');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (S.mode === 'title') { drawTitle(ctx); return; }
        drawLava(ctx);
        drawPlats(ctx);
        // troll hand
        if (troll && troll.state !== 'idle') {
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, LAVA_Y + 2); ctx.clip();
          ctx.drawImage(sp.hand, Math.round(troll.x) - 8, Math.round(troll.y) - 2);
          ctx.restore();
        }
        for (const g of eggs) {
          const s = g.grounded && g.t > g.hatch - 90 && ((g.t >> 3) & 1) ? sp.eggCrack : sp.egg;
          ctx.drawImage(s, Math.round(g.x) - 3, Math.round(g.y) - 8);
        }
        for (const h of hatchlings) {
          ctx.drawImage(sp.hatch[h.type][(h.t >> 4) & 1], Math.round(h.x) - 4, Math.round(h.y) - 10);
          if (h.picker) drawBird(ctx, { x: h.picker.x, y: h.picker.y, dir: h.picker.dir || 1, grounded: false, flap: (api.frame >> 3) & 1 ? 1 : 0 }, sp.buzEmpty);
        }
        for (const e of enemies) {
          if (e.mat > 0) drawMaterialize(ctx, e, sp.buz[e.type], e.mat);
          else drawBird(ctx, e, sp.buz[e.type]);
        }
        for (const l of loose) drawBird(ctx, { x: l.x, y: l.y, dir: l.dir, grounded: false, flap: l.flap }, l.set);
        if (P && !P.dead) {
          if (P.mat > 0) drawMaterialize(ctx, P, sp.p1, P.mat); else drawBird(ctx, P, sp.p1);
        }
        for (const p of pteros) {
          const fr = (p.t >> 3) & 1;
          const s = p.mouth ? (p.dir < 0 ? sp.pteroOL[fr] : sp.pteroOR[fr]) : (p.dir < 0 ? sp.pteroL[fr] : sp.pteroR[fr]);
          ctx.drawImage(s, Math.round(p.x) - 16, Math.round(p.y) - 10);
        }
        for (const s of sparks) {
          if (s.big) { ctx.drawImage(sp.hatch[0][0], 0, 0, 8, 10, Math.round(s.x) - 4, Math.round(s.y) - 5, 8, 10); continue; }
          ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
        }
        for (const p of popups) txt(ctx, p.s, Math.round(Math.max(0, Math.min(W - p.s.length * 8, p.x - p.s.length * 4))), Math.round(p.y), '#ffffff');
        drawHUD(ctx);
        if (S.msgT > 0 && S.mode === 'play') {
          S.msg.forEach((m, i) => txtC(ctx, m, 90 + i * 12 - (S.msg.length > 3 ? 12 : 0), i === 0 ? '#ffffff' : '#ffd000'));
        }
        if (P && P.mat > 0 && S.msgT === 0 && S.mode === 'play' && S.lives >= 0) { /* waiting to move */ }
        if (S.mode === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(100, 92, 92, 16); txtC(ctx, 'GAME OVER', 96, '#ff3030'); }
      }
      function drawTitle(ctx) {
        // big gold "JOUST" logo
        const s = 'JOUST', k = 5;
        let x0 = (W - (s.length * 8 * k - k)) >> 1;
        for (const ch of s) {
          const rows = FONT[ch];
          for (let r = 0; r < 7; r++) for (let b = 0; b < 7; b++) if (rows[r] & (64 >> b)) {
            const y = 26 + r * k, x = x0 + b * k;
            ctx.fillStyle = r < 3 ? '#fff0a0' : r < 5 ? '#ffc800' : '#d08000'; ctx.fillRect(x, y, k, k);
            ctx.fillStyle = '#804000'; ctx.fillRect(x, y + k - 1, k, 1);
          }
          x0 += 8 * k;
        }
        txtC(ctx, 'WILLIAMS ELECTRONICS', 70, '#ffffff');
        // demo knights
        const t = attractT;
        const fy = 112 + Math.sin(t * 0.05) * 8;
        drawBird(ctx, { x: 70, y: fy, dir: 1, grounded: false, flap: (t >> 3) & 1 ? 8 : 0 }, sp.p1);
        drawBird(ctx, { x: 222, y: 112 - Math.sin(t * 0.05) * 8, dir: -1, grounded: false, flap: (t >> 3) & 1 ? 0 : 8 }, sp.buz[(t >> 7) % 3]);
        txtC(ctx, 'BOUNDER    500', 140, '#ff4040');
        txtC(ctx, 'HUNTER     750', 152, '#d0d0d8');
        txtC(ctx, 'SHADOW LORD 1500', 164, '#5080ff');
        txtC(ctx, 'EGG  250-1000', 176, '#d8f0ff');
        txtC(ctx, 'PTERODACTYL 1000', 188, '#40b8ff');
        if (api.credits > 0) { if (coinHold > 0 || (S.t % 60) < 40) txtC(ctx, 'PRESS ONE PLAYER START', 206, '#ffd000'); }
        else if (coinFlash > 0 ? (coinFlash > 90 || (coinFlash % 20) < 14) : (S.t % 60) < 40) txtC(ctx, 'INSERT COIN', 206, coinFlash > 0 ? '#ff4040' : '#ffd000');
        txt(ctx, 'HIGH SCORE ' + S.hi, 8, 222, '#ffffff');
        const cs = 'CREDITS ' + Math.min(api.credits, 99);
        txt(ctx, cs, W - 8 - cs.length * 8, 222, '#40b8ff');
        // lava strip
        for (let x = 0; x < W; x += 2) { ctx.fillStyle = '#ff3000'; ctx.fillRect(x, 236 + Math.round(Math.sin(x * 0.2 + S.t * 0.1)), 2, 4); }
      }

      if (/[?&]dbg=1/.test(location.search)) {
        window.__G = { S, get P() { return P; }, get enemies() { return enemies; }, get eggs() { return eggs; }, get pteros() { return pteros; }, spawnPtero, setWave(w) { S.wave = w; enemies = []; queue = []; startWave(); }, get troll() { return troll; } };
      }
      return { update, render };
    }
  });
})();
