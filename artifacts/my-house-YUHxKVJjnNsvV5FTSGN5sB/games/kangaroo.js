// Kangaroo (Sun Electronics, 1982) - from-scratch recreation for the MAME32 Game Room.
// Mother kangaroo climbs four floors to rescue her joey; monkeys throw apples, the big ape steals her gloves.
(function () {
  'use strict';
  const W = 224, H = 256;

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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
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
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sprite(rows, pal) {
    const h = rows.length, w = rows[0].length, cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  const flip = rows => rows.map(r => r.split('').reverse().join(''));
  const pair = (rows, pal) => [sprite(rows, pal), sprite(flip(rows), pal)]; // [right, left]

  // ---------- sprites ----------
  const RPAL = { b: '#d88838', l: '#f8d090', k: '#000', n: '#401800', d: '#a05818' };
  const ROO_STAND = [
    '..........bb....', '.........bdb....', '.........bbb....', '........bbbbb...', '........bbkbbb..', '........bbbbbbbn',
    '.........bbbbbb.', '.........bbbb...', '........bbbbb...', '.......bblllbb..', '......bbllllbb..', '......bblllll...',
    '.....bbblllll...', '.....bbbllllb...', '....bbbbbllbb...', '...bbbbbbbbbb...', '..bb.bbbbbbb....', '.bb..bbbbbb.....',
    'bb....bbbbb.....', 'b.....bb.bb.....', '......bb..bb....', '......bb...bb...', '.....bbbbb.bbbbb', '.....bbbbbb.....'];
  const ROO_HOP = ROO_STAND.slice(0, 17).concat([
    '.bb..bbbbbbb....', 'bb...bbbbbbb....', 'b.....bbbbbb....', '......bbbbbbb...', '.....bbbbbbbbbb.', '....bbbbbbbbbbbb', '................']);
  const ROO_DUCK = [
    '...........bb...', '..........bdb...', '.........bbbbb..', '.........bbkbbb.', '......bbbbbbbbbn', '....bbbllllbbbb.',
    '...bbblllllll...', '..bbbbllllllb...', '.bbbbbbbllbbb...', 'bb..bbbbbbbbb...', 'b...bbbbbbbb....', '.....bb..bb.....',
    '....bbbbbbbbbb..', '....bbbbbbbbbbb.'];
  const ROO_CLIMB = [
    '....bb....bb....', '....bdb..bdb....', '.....bbbbbb.....', '....bbbbbbbb....', '....bbbbbbbb....', '.....bbbbbb.....',
    '.rr...bbbb......', '.rrb.bbbbbbb....', '..bbbbbbbbbbb...', '....bbbbbbbbbb..', '....bbbbbbbb.rr.', '....bbbbbbbb.rr.',
    '....bbbbbbbb....', '....bbbbbbbb....', '....bbbbbbbb....', '.....bbbbbb.....', '.....bbbbbb.....', '.....bb..bb.....',
    '.....bb..bb.....', '....bbb..bbb....', '....bb....bb....', '....bb....bb....', '...bbb....bbb...', '...bbb....bbb...'];
  const SPR = {};
  const CPAL = Object.assign({ r: '#e02020' }, RPAL);
  SPR.stand = pair(ROO_STAND, RPAL); SPR.hop = pair(ROO_HOP, RPAL); SPR.duck = pair(ROO_DUCK, RPAL); SPR.climb = pair(ROO_CLIMB, CPAL);
  const MONKEY = [
    '....oooo....', '...oooooo...', '..oofkfkoo..', '..oofffffo..', '...offmfo...', '....oooo....',
    '.oooooooooo.', 'o..oooooo..o', '...oooooo...', '...oo..oo...', '..oo....oo..', '.oo......oo.'];
  SPR.monkey = pair(MONKEY, { o: '#b85818', f: '#f0b880', k: '#000', m: '#701800' });
  const MONKEY2 = [
    'o...oooo...o', '.o.oooooo.o.', '..oofkfkoo..', '..oofffffo..', '...offmfo...', '....oooo....',
    '...oooooo...', '...oooooo...', '...oooooo...', '...oo..oo...', '..oo....oo..', '.oo......oo.'];
  SPR.monkeyT = pair(MONKEY2, { o: '#b85818', f: '#f0b880', k: '#000', m: '#701800' });
  const APE = [
    '.....gggggg.....', '....gggggggg....', '...ggffffffgg...', '...gfkkffkkfg...', '...gffffffffg...', '...ggfmmmmfgg...',
    '..gggffffffggg..', '.gggggggggggggg.', 'gggggggggggggggg', 'ggg.gggggggg.ggg', 'gg..gggggggg..gg', 'gg..gggggggg..gg',
    'ff..gggggggg..ff', '....gggggggg....', '....ggg..ggg....', '...ggg....ggg...', '...gg......gg...', '..ggg......ggg..',
    '..fff......fff..', '................'];
  SPR.ape = pair(APE, { g: '#6a5a8a', f: '#c8a888', k: '#000', m: '#602020' });
  SPR.topape = pair(APE, { g: '#8a4a20', f: '#e8b888', k: '#000', m: '#602020' });
  const JOEY = ['.....b..', '....bdb.', '....bkbb', '....bbbn', '...bll..', '..bbll..', '.b.bbb..', 'b..b.b..', '...bbbb.', '........'];
  SPR.joey = pair(JOEY, RPAL);
  const FRUITS = [
    [['......g.', '.....g..', '....g.g.', '...g...g', '.rr...rr', 'rwrr.rwr', 'rrrr.rrr', '.rr...rr'], { r: '#e01818', w: '#fff', g: '#20a020' }],
    [['..gggg..', '.rrggrr.', 'rrwrrrwr', 'rrrrrrrr', 'rwrrrwrr', '.rrrrrr.', '..rwrr..', '...rr...'], { r: '#f02040', w: '#ffe060', g: '#20c020' }],
    [['...gg...', '..pppp..', '.pppppp.', '.ppwppp.', '..pppp..', '..pppp..', '...pp...', '........'], { p: '#9030d0', w: '#e0c0ff', g: '#20a020' }],
    [['....gg..', '..ooggo.', '.oooooo.', 'oowooooo', 'oooooooo', 'oooooooo', '.oooooo.', '..oooo..'], { o: '#f89818', w: '#fff0a0', g: '#20a020' }],
    [['.......y', '......yy', '.....yy.', '....yyy.', '..yyyy..', 'yyyyy...', '.yyy....', '........'], { y: '#f8e020' }]
  ].map(([r, p]) => sprite(r, p));
  const FRUIT_PTS = [100, 200, 300, 400, 500];
  const BELL = sprite(['....kk....', '...yyyy...', '..yyyyyy..', '..ywyyyy..', '..ywyyyy..', '.yyyyyyyy.', '.ywyyyyyy.', 'yyyyyyyyyy', 'dddddddddd', '....yy....'],
    { y: '#f8d820', w: '#fffff0', d: '#b08010', k: '#888' });
  const APPLE = sprite(['.gr.', 'rrrr', 'rrwr', '.rr.'], { r: '#e82020', w: '#ffa0a0', g: '#30a030' });
  const CORE = sprite(['.n.', 'rwr', '.w.', 'rwr', '.r.'], { r: '#e02020', w: '#f8f0c0', n: '#603010' });
  const HEART = sprite(['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff3060' });

  // ---------- playfield ----------
  const FY = [244, 188, 132, 76];              // floor surfaces (feet y), 0 = bottom
  const POLE_X = [10, 214];
  const LAYOUTS = [
    { lad: [[184], [40], [184]], floor: '#e04878', edge: '#ff88b0', lad_c: '#40c8f0', pole: '#58a030' },
    { lad: [[96, 196], [28, 150], [96, 188]], floor: '#3878f8', edge: '#90c0ff', lad_c: '#f8c838', pole: '#a06030' },
    { lad: [[200], [112], [32]], floor: '#e88820', edge: '#ffd080', lad_c: '#e04040', pole: '#40a040' },
    { lad: [[60, 170], [118], [30, 192]], floor: '#20b070', edge: '#90f0c0', lad_c: '#f080f0', pole: '#c07020' }
  ];
  const JOEY_X = 22, BELL_X = 140;

  ArcadeRegistry.register({
    id: 'kangaroo', title: 'Kangaroo', year: 1982, maker: 'Sun Electronics',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: hop / climb / duck \u00b7 Space: punch \u00b7 X or Up: jump \u00b7 Enter: start',
    marquee: { bg: '#100818', fg: '#f8a040', accent: '#ff4878' },
    create(api) {
      // ---------- attract-mode demo: an autopilot plays through the same input layer ----------
      let demo = false, demoT = 0, dKeys = new Set(), dPrev = new Set();
      const A = { tone: (...a) => { if (!demo) api.audio.tone(...a); }, noise: (...a) => { if (!demo) api.audio.noise(...a); }, melody: (...a) => (demo ? 0 : api.audio.melody(...a)) };
      const key = c => (demo ? dKeys.has(c) : api.key(c));
      const pressed = c => (demo ? dKeys.has(c) && !dPrev.has(c) : api.pressed(c));
      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, stage = 1, extraGiven = false, coinFlash = 0;
      let roo, monkeys, apples, cores, ape, topApe, fruits, fruitKind, bonus, bonusT, popups, gloves, glovesT, spawnT, apeT, bellCool, clearAcc;
      let titleRoo = { x: -20, f: 0 };

      const lay = () => LAYOUTS[(stage - 1) % LAYOUTS.length];
      const diff = () => Math.min(stage - 1, 8);
      function addScore(n, x, y) {
        score += n;
        if (!extraGiven && score >= 10000) { extraGiven = true; lives++; A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .14 }); }
        if (!demo && score > hi) hi = score;
        if (x != null) popups.push({ x, y, n, t: 50 });
      }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; A.tone(98, .28, { type: 'square', vol: .14 }); return false;
      }

      // ---------- sounds ----------
      const sHop = () => A.tone(330, .04, { type: 'square', vol: .06, slideTo: 440 });
      const sPunch = () => A.noise(.06, { vol: .14, freq: 1400 });
      const sHit = () => { A.tone(880, .08, { type: 'square', vol: .14, slideTo: 220 }); A.noise(.08, { vol: .12, freq: 800 }); };
      const sThrow = () => A.tone(600, .1, { type: 'triangle', vol: .1, slideTo: 300 });
      const sFruit = () => A.melody([[1047, .05], [1319, .05], [1568, .08]], { type: 'square', vol: .12 });
      const sBell = () => { A.tone(1568, .5, { type: 'triangle', vol: .2 }); A.tone(2093, .4, { type: 'sine', vol: .1, delay: .02 }); };
      const sDie = () => A.melody([[784, .1], [740, .1], [659, .1], [587, .1], [523, .1], [440, .1], [392, .3]], { type: 'square', vol: .14 });
      const sClear = () => A.melody([[523, .1], [659, .1], [784, .1], [1047, .15], [0, .05], [880, .1], [1047, .3]], { type: 'square', vol: .14 });
      const sStart = () => A.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .36]], { type: 'square', vol: .13 });

      // ---------- stage setup ----------
      function spawnFruits() {
        fruits = [];
        for (let f = 0; f < 3; f++) {
          const ladX = [].concat(lay().lad[f] || [], f > 0 ? lay().lad[f - 1] : []);
          const xs = [56, 104, 152, 196].filter(x => ladX.every(l => Math.abs(l - x) > 16));
          for (let i = 0; i < 2 && xs.length; i++) {
            const x = xs.splice((Math.random() * xs.length) | 0, 1)[0];
            fruits.push({ x, y: FY[f] - 34, kind: (fruitKind + f) % FRUITS.length, alive: true });
          }
        }
      }
      function resetStage() {
        roo = { x: 26, y: FY[0], floor: 0, dir: 1, mode: 'walk', vx: 0, vy: 0, punch: 0, duck: false, anim: 0, lad: null };
        monkeys = []; apples = []; cores = []; ape = null; popups = [];
        topApe = { x: 112, dir: 1, t: 120, throwT: 0 };
        bonus = 2000; bonusT = 0; gloves = true; glovesT = 0; spawnT = 150; apeT = 0; bellCool = 0;
        fruitKind = (stage - 1) % FRUITS.length; spawnFruits();
      }
      function startGame() { score = 0; lives = 3; stage = 1; extraGiven = false; resetStage(); state = 'ready'; T = 0; sStart(); }

      // ---------- helpers ----------
      const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
      function rooBox() { const h = roo.mode === 'walk' && roo.duck ? 13 : 22; return { x0: roo.x - 5, x1: roo.x + 5, y0: roo.y - h, y1: roo.y - 1 }; }
      function fistBox() {
        if (!gloves || roo.punch < 4 || roo.punch > 12 || roo.mode === 'climb') return null;
        const d = roo.dir, low = roo.mode === 'walk' && roo.duck;
        const top = roo.y - (low ? 12 : 22) - 6, bot = roo.y - (low ? 3 : 11);
        return d > 0 ? { x0: roo.x + 3, x1: roo.x + 17, y0: top, y1: bot } : { x0: roo.x - 17, x1: roo.x - 3, y0: top, y1: bot };
      }
      function ladderAt(x, floor, dir) {
        const i = dir > 0 ? floor : floor - 1;
        if (i < 0 || i >= 3) return null;
        for (const lx of lay().lad[i]) if (Math.abs(lx - x) <= 6) return { x: lx, top: i + 1 };
        return null;
      }
      function die() { if (state !== 'play') return; state = 'dying'; T = 0; sDie(); }

      // ---------- player ----------
      function punch() {
        if (!gloves || roo.punch > 0) return;
        roo.punch = 16; sPunch();
      }
      function updateRoo() {
        const r = roo;
        if (r.punch > 0) r.punch--;
        if (r.mode === 'climb') {
          const lad = r.lad;
          if (key('ArrowUp')) {
            r.y -= 0.8; r.anim++;
            if (r.y <= FY[lad.top]) { r.y = FY[lad.top]; r.floor = lad.top; r.mode = 'walk'; }
          } else if (key('ArrowDown')) {
            r.y += 0.8; r.anim++;
            if (r.y >= FY[lad.top - 1]) { r.y = FY[lad.top - 1]; r.floor = lad.top - 1; r.mode = 'walk'; }
          }
          if ((r.anim & 15) === 1 && (key('ArrowUp') || key('ArrowDown'))) A.tone(220 + r.floor * 40, .03, { type: 'square', vol: .05 });
          return;
        }
        if (r.mode === 'jump') {
          r.x = Math.max(8, Math.min(216, r.x + r.vx));
          r.vy += 0.12; r.y += r.vy;
          if (pressed('Space')) punch();
          if (r.y >= FY[r.floor]) { r.y = FY[r.floor]; r.mode = 'walk'; r.anim = 0; }
          return;
        }
        const L = key('ArrowLeft'), R = key('ArrowRight'), U = key('ArrowUp'), D = key('ArrowDown');
        if (pressed('Space')) punch();
        if (U) { const ld = ladderAt(r.x, r.floor, 1); if (ld) { r.mode = 'climb'; r.lad = ld; r.x = ld.x; r.duck = false; return; } }
        if (D) { const ld = ladderAt(r.x, r.floor, -1); if (ld) { r.mode = 'climb'; r.lad = ld; r.x = ld.x; r.duck = false; return; } }
        r.duck = D;
        if (pressed('KeyX') || (pressed('ArrowUp') && !ladderAt(r.x, r.floor, 1))) {
          r.mode = 'jump'; r.vy = -2.75; r.vx = L ? -1 : R ? 1 : 0; r.duck = false;
          A.tone(392, .18, { type: 'square', vol: .08, slideTo: 784 });
          return;
        }
        if (!r.duck && r.punch === 0 && (L || R)) {
          r.dir = L ? -1 : 1;
          r.x = Math.max(8, Math.min(216, r.x + r.dir * 0.95));
          r.anim++;
          if (r.anim % 16 === 1) sHop();
        } else if (L) r.dir = -1; else if (R) r.dir = 1;
      }

      // ---------- enemies ----------
      function spawnMonkey() {
        const side = Math.random() < 0.6 ? 1 : 0;
        let tf = Math.random() < 0.7 && roo.mode !== 'climb' ? roo.floor : (Math.random() * 4) | 0;
        // never ambush the mother at point-blank range from the pole
        if (Math.abs(roo.x - POLE_X[side]) < 34 && tf === roo.floor) tf = Math.max(0, Math.min(3, tf + (tf > 0 ? -1 : 1)));
        monkeys.push({ x: POLE_X[side], y: 34, side, st: 'down', tf, t: 0, throws: 1 + (stage > 2 && Math.random() < 0.4 ? 1 : 0), anim: 0 });
      }
      function updateMonkeys() {
        const spd = 0.5 + diff() * 0.07;
        if (--spawnT <= 0) {
          const maxM = Math.min(4, 1 + Math.ceil(stage / 2));
          if (monkeys.length < maxM) spawnMonkey();
          spawnT = Math.max(80, 240 - diff() * 20) + Math.random() * 80;
        }
        const fist = fistBox(), rb = rooBox();
        for (let i = monkeys.length - 1; i >= 0; i--) {
          const m = monkeys[i]; m.anim++;
          if (m.st === 'down') {
            m.y += spd;
            if (m.y >= FY[m.tf]) { m.y = FY[m.tf]; m.st = 'aim'; m.t = 0; }
          } else if (m.st === 'aim') {
            m.t++;
            if (m.t === 50) {
              const low = Math.random() < 0.5;
              apples.push({ x: m.x + (m.side ? -6 : 6), y: m.y - (low ? 4 : 17), vx: (m.side ? -1 : 1) * (1.15 + diff() * 0.1), low });
              sThrow(); m.throws--;
            }
            if (m.t > 70) {
              if (m.throws > 0) m.t = 10;
              else if (m.tf > 0 && Math.random() < 0.4) { m.tf--; m.st = 'down'; m.throws = 1; }
              else m.st = 'up';
            }
          } else if (m.st === 'up') {
            m.y -= spd * 1.3;
            if (m.y < 20) { monkeys.splice(i, 1); continue; }
          }
          const mb = { x0: m.x - 5, x1: m.x + 5, y0: m.y - 11, y1: m.y };
          if (fist && ov(fist, mb)) { monkeys.splice(i, 1); addScore(200, m.x, m.y - 14); sHit(); continue; }
          if (ov(rb, mb)) { die(); return; }
        }
      }
      function updateApples() {
        const fist = fistBox(), rb = rooBox();
        for (let i = apples.length - 1; i >= 0; i--) {
          const a = apples[i]; a.x += a.vx;
          if (a.x < -6 || a.x > W + 6) { apples.splice(i, 1); continue; }
          const ab = { x0: a.x - 2, x1: a.x + 2, y0: a.y - 2, y1: a.y + 2 };
          if (fist && ov(fist, ab)) { apples.splice(i, 1); addScore(100, a.x, a.y - 6); sHit(); continue; }
          if (ov(rb, ab)) { die(); return; }
        }
        for (let i = cores.length - 1; i >= 0; i--) {
          const c = cores[i]; c.y += c.vy; c.vy = Math.min(1.8, c.vy + 0.01);
          if (c.y > H + 6) { cores.splice(i, 1); continue; }
          const cb = { x0: c.x - 1, x1: c.x + 2, y0: c.y - 2, y1: c.y + 3 };
          if (fist && ov(fist, cb)) { cores.splice(i, 1); addScore(100, c.x, c.y); sHit(); continue; }
          if (ov(rb, cb)) { die(); return; }
        }
      }
      function updateTopApe() {
        const t = topApe;
        if (t.throwT > 0) { t.throwT--; return; }
        const goal = Math.max(40, Math.min(196, roo.x));
        if (Math.abs(goal - t.x) > 2) { t.dir = goal > t.x ? 1 : -1; t.x += t.dir * (0.45 + diff() * 0.04); }
        if (--t.t <= 0) {
          cores.push({ x: t.x + (Math.random() - 0.5) * 10, y: 50, vy: 0.7 + diff() * 0.05 });
          t.t = Math.max(140, 320 - diff() * 25) + Math.random() * 120; t.throwT = 24;
          A.tone(300, .12, { type: 'triangle', vol: .08, slideTo: 150 });
        }
      }
      function updateApe() {
        if (!ape) {
          if (++apeT > Math.max(700, 1300 - diff() * 80) && roo.mode === 'walk' && gloves) {
            apeT = 0;
            const side = roo.dir > 0 ? -1 : 1; // sneaks up from behind
            ape = { x: side < 0 ? -10 : W + 10, floor: roo.floor, dir: -side, st: 'walk', vx: 0, anim: 0 };
            A.melody([[110, .12], [98, .12], [110, .12], [98, .2]], { type: 'sawtooth', vol: .1 });
          }
          return;
        }
        const a = ape; a.anim++;
        if (a.st === 'walk') {
          a.x += a.dir * (0.55 + diff() * 0.04);
          if (roo.floor !== a.floor || roo.mode === 'climb') a.st = 'flee';
          const ab = { x0: a.x - 6, x1: a.x + 6, y0: FY[a.floor] - 19, y1: FY[a.floor] };
          const fist = fistBox();
          if (fist && ov(fist, ab)) { a.st = 'knock'; a.vx = roo.dir * 3; addScore(200, a.x, FY[a.floor] - 24); sHit(); }
          else if (ov(rooBox(), ab) && gloves) {
            gloves = false; glovesT = 420; a.st = 'flee'; a.carry = true;
            A.melody([[440, .08], [330, .08], [220, .2]], { type: 'square', vol: .14 });
          }
        } else if (a.st === 'knock') {
          a.x += a.vx; a.vx *= 0.97;
          if (Math.abs(a.vx) < 0.6) { a.st = 'flee'; a.dir = a.vx > 0 ? 1 : -1; }
        } else {
          a.dir = a.x < W / 2 ? -1 : 1; a.x += a.dir * 1.4;
        }
        if (a.st !== 'walk' && (a.x < -20 || a.x > W + 20)) ape = null;
      }
      function updatePickups() {
        const rb = rooBox();
        for (const f of fruits) {
          if (!f.alive) continue;
          if (ov(rb, { x0: f.x - 4, x1: f.x + 4, y0: f.y, y1: f.y + 8 })) { f.alive = false; addScore(FRUIT_PTS[f.kind], f.x, f.y - 6); sFruit(); }
        }
        if (bellCool > 0) bellCool--;
        if (roo.floor === 3 && bellCool === 0 && ov(rb, { x0: BELL_X - 5, x1: BELL_X + 5, y0: FY[3] - 42, y1: FY[3] - 32 })) {
          bellCool = 300; sBell(); fruitKind = (fruitKind + 1) % FRUITS.length; spawnFruits();
        }
        if (roo.floor === 3 && roo.mode !== 'climb' && roo.x < JOEY_X + 14) {
          state = 'clear'; T = 0; clearAcc = 0; sClear();
        }
      }

      function updatePlay() {
        if (++bonusT >= 150) {
          bonusT = 0; bonus = Math.max(0, bonus - 100);
          if (bonus <= 500 && bonus > 0) A.tone(1200, .05, { type: 'square', vol: .1 });
          if (bonus === 0) { die(); return; }
        }
        if (!gloves && --glovesT <= 0) { gloves = true; A.melody([[523, .06], [784, .1]], { type: 'square', vol: .12 }); }
        updateRoo();
        updateTopApe();
        updateMonkeys(); if (state !== 'play') return;
        updateApples(); if (state !== 'play') return;
        updateApe();
        updatePickups();
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }

      // ---------- demo autopilot ----------
      function startDemo() {
        demo = true; demoT = 0; dKeys = new Set(); dPrev = new Set();
        startGame(); stage = 1 + ((Math.random() * 4) | 0); resetStage(); state = 'ready'; T = 90;
      }
      function endDemo() { demo = false; dKeys = new Set(); score = 0; state = 'title'; T = 0; }
      function demoAI() {
        const k = new Set(), r = roo;
        if (state !== 'play') return k;
        if (r.mode === 'climb') { k.add('ArrowUp'); return k; }
        if (r.mode === 'jump') return k;
        const fy = FY[r.floor];
        const toward = x => k.add(x < r.x ? 'ArrowLeft' : 'ArrowRight');
        // incoming apples: jump the low ones, punch or duck the high ones
        for (const a of apples) {
          if (Math.abs(a.y - fy) > 20 || (a.x - r.x) * a.vx > 0) continue;
          const d = Math.abs(a.x - r.x);
          if (d > 30) continue;
          if (a.low) { if (d < 22) k.add('KeyX'); return k; }
          if (gloves && (a.x - r.x) * r.dir > 0) { if (d < 20 && (demoT & 7) === 0) k.add('Space'); return k; }
          if (!ladderAt(r.x, r.floor, -1)) { k.add('ArrowDown'); return k; }
          k.add('KeyX'); return k;
        }
        // monkeys and the big ape within reach: turn and punch
        for (const m of monkeys) {
          if (m.st === 'down' || Math.abs(m.y - fy) > 2 || Math.abs(m.x - r.x) > 22) continue;
          if ((m.x - r.x) * r.dir < 0) toward(m.x); else if (gloves && (demoT & 7) === 0) k.add('Space');
          return k;
        }
        if (ape && ape.st === 'walk' && ape.floor === r.floor && Math.abs(ape.x - r.x) < 28 && gloves) {
          if ((ape.x - r.x) * r.dir < 0) toward(ape.x); else if ((demoT & 7) === 0) k.add('Space');
          return k;
        }
        // falling cores: step aside
        for (const c of cores) if (Math.abs(c.x - r.x) < 8 && c.y < r.y - 20 && c.y > r.y - 70) { k.add(c.x < r.x ? 'ArrowRight' : 'ArrowLeft'); return k; }
        if (r.floor === 3) { k.add('ArrowLeft'); return k; }
        let best = null;
        for (const lx of lay().lad[r.floor]) if (best === null || Math.abs(lx - r.x) < Math.abs(best - r.x)) best = lx;
        if (Math.abs(best - r.x) <= 3) k.add('ArrowUp'); else toward(best);
        return k;
      }

      function update() {
        T++; if (coinFlash > 0) coinFlash--;
        if (demo) {
          if (api.anyPressed('Enter', 'Space')) { endDemo(); return; }
          dPrev = dKeys; dKeys = demoAI();
          if (++demoT > 2400 || state === 'clear' && T > 100) { endDemo(); return; }
        }
        switch (state) {
          case 'title':
            titleRoo.x += 0.9; titleRoo.f++; if (titleRoo.x > W + 30) titleRoo.x = -30;
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            else if (T > 720) startDemo();
            break;
          case 'ready': if (T >= 150) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (T >= 150 && demo) { endDemo(); break; }
            if (T >= 150) {
              api.setHiScore(score);
              const respawn = () => { resetStage(); state = 'ready'; T = 60; };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              lives--;
              if (lives <= 0) {
                if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over();
              } else respawn();
            }
            break;
          case 'clear':
            if (T > 60 && bonus > 0) { const d = Math.min(100, bonus); bonus -= d; addScore(d); if ((T & 3) === 0) A.tone(1400, .03, { type: 'square', vol: .06 }); }
            else if (T > 60 && bonus === 0) { clearAcc++; if (clearAcc > 90) { stage++; resetStage(); state = 'ready'; T = 0; sStart(); } }
            break;
          case 'over':
            if (T >= 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawField(ctx) {
        const L = lay();
        // vines the monkeys climb
        for (const px of POLE_X) {
          ctx.fillStyle = L.pole; ctx.fillRect(px - 2, 28, 4, FY[0] - 28);
          ctx.fillStyle = '#204010';
          for (let y = 32; y < FY[0]; y += 9) ctx.fillRect(px + ((y >> 3) & 1 ? -4 : 2), y, 2, 3);
        }
        // top branch with the core-throwing ape
        ctx.fillStyle = '#8a5a28'; ctx.fillRect(30, 50, 176, 3); ctx.fillStyle = '#5a3a18'; ctx.fillRect(30, 53, 176, 1);
        for (let i = 0; i < 4; i++) {
          const y = FY[i];
          ctx.fillStyle = L.floor; ctx.fillRect(0, y, W, 6);
          ctx.fillStyle = L.edge; ctx.fillRect(0, y, W, 1);
          ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let x = (i * 5) % 12; x < W; x += 12) ctx.fillRect(x, y + 2, 6, 2);
        }
        ctx.fillStyle = '#301820'; ctx.fillRect(0, FY[0] + 6, W, H - FY[0] - 6);
        for (let i = 0; i < 3; i++) for (const lx of L.lad[i]) {
          const top = FY[i + 1], bot = FY[i];
          ctx.fillStyle = L.lad_c; ctx.fillRect(lx - 6, top, 2, bot - top); ctx.fillRect(lx + 4, top, 2, bot - top);
          for (let y = top + 4; y < bot; y += 6) ctx.fillRect(lx - 6, y, 12, 1);
        }
        // joey's cage
        const cy = FY[3];
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(JOEY_X - 10, cy - 20, 20, 1);
        for (let x = JOEY_X - 10; x <= JOEY_X + 10; x += 4) ctx.fillRect(x, cy - 20, 1, 20);
        ctx.drawImage(SPR.joey[(T >> 5) & 1 ? 0 : 1], JOEY_X - 4, cy - 11);
        if (state !== 'clear' && (T >> 4) % 4 === 0) text(ctx, 'HELP', JOEY_X - 2, cy - 30, '#ff88b0');
        // bell
        const sw = bellCool > 260 ? Math.round(Math.sin(T * 0.8) * 2) : 0;
        ctx.fillStyle = '#888'; ctx.fillRect(BELL_X, 54, 1, FY[3] - 42 - 54);
        ctx.drawImage(BELL, BELL_X - 5 + sw, FY[3] - 42);
      }
      function drawRoo(ctx, x, y, dir, mode, duck, anim, punchT, hasGloves) {
        const d = dir > 0 ? 0 : 1;
        let img, h;
        if (mode === 'climb') { img = SPR.climb[(anim >> 3) & 1]; h = 24; ctx.drawImage(img, Math.round(x - 8), Math.round(y - h)); return; }
        if (duck) { img = SPR.duck[d]; h = 14; }
        else { img = (mode === 'jump' || (anim % 16) > 8) ? SPR.hop[d] : SPR.stand[d]; h = 24; }
        const sx = Math.round(x - 8), sy = Math.round(y - h);
        ctx.drawImage(img, sx, sy);
        if (!hasGloves) return;
        const ext = punchT >= 4 && punchT <= 12;
        const gy = sy + (duck ? 5 : 9);
        const reach = ext ? 9 : 3;
        const gx = dir > 0 ? Math.round(x + reach) : Math.round(x - reach - 4);
        if (ext) { ctx.fillStyle = '#d88838'; ctx.fillRect(dir > 0 ? Math.round(x + 3) : gx + 4, gy + 1, reach - 1, 2); }
        ctx.fillStyle = '#e02020'; ctx.fillRect(gx, gy, 4, 4); ctx.fillStyle = '#ff9090'; ctx.fillRect(gx + 1, gy, 2, 1);
        ctx.fillStyle = '#fff'; ctx.fillRect(dir > 0 ? gx - 1 : gx + 4, gy + 1, 1, 2);
      }
      function drawHud(ctx) {
        text(ctx, '1UP', 8, 2, '#ff4040'); text(ctx, String(score).padStart(6, '0'), 8, 11, '#fff');
        text(ctx, 'HIGH SCORE', 80, 2, '#ff4040'); text(ctx, String(hi).padStart(6, '0'), 92, 11, '#fff');
        if (state !== 'title' && state !== 'over') {
          ctx.fillStyle = '#2040c0'; ctx.fillRect(170, 1, 50, 20); ctx.fillStyle = '#000'; ctx.fillRect(172, 3, 46, 16);
          text(ctx, 'BONUS', 180, 4, '#40d0ff'); text(ctx, String(bonus).padStart(4, '0'), 183, 12, bonus <= 500 && (T >> 3) & 1 ? '#ff4040' : '#fff');
          for (let i = 0; i < Math.min(6, lives - 1); i++) ctx.drawImage(SPR.joey[0], 4 + i * 9, H - 11);
          text(ctx, 'STAGE ' + stage, W - 4, H - 9, '#ffd080', 1, 'right');
        }
      }
      function drawCoinLine(ctx, y) {
        const blink = (T >> 5) & 1;
        if (api.credits === 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, y, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START BUTTON', W / 2, y, '#40d0ff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 6, H - 10, '#aaa', 1, 'right');
      }
      function renderTitle(ctx) {
        drawHud(ctx);
        const cols = ['#ff4878', '#f8a040', '#f8e020', '#40d0ff', '#40e080', '#c070ff', '#ff4878', '#f8a040'];
        'KANGAROO'.split('').forEach((ch, i) => text(ctx, ch, 28 + i * 21, 36 + Math.round(Math.sin(T / 12 + i) * 2), cols[i], 3));
        text(ctx, 'SAVE THE BABY!', W / 2, 70, '#fff', 1, 'center');
        ctx.drawImage(SPR.monkey[0], 40, 88); text(ctx, 'MONKEY    200 PTS', 60, 91, '#f8d090');
        ctx.drawImage(APPLE, 44, 108); ctx.drawImage(CORE, 50, 107); text(ctx, 'APPLE     100 PTS', 60, 106, '#f8d090');
        ctx.drawImage(FRUITS[0], 38, 120); ctx.drawImage(FRUITS[1], 47, 120); text(ctx, 'FRUIT 100-500 PTS', 60, 121, '#f8d090');
        ctx.drawImage(SPR.ape[0], 36, 132); text(ctx, 'BIG APE STEALS', 60, 136, '#c0b0e0'); text(ctx, 'YOUR GLOVES!', 60, 145, '#c0b0e0');
        ctx.drawImage(SPR.joey[1], 40, 160); text(ctx, 'REACH THE JOEY FOR', 60, 160, '#ff88b0'); text(ctx, 'THE TIME BONUS', 60, 169, '#ff88b0');
        text(ctx, 'EXTRA KANGAROO AT 10000', W / 2, 186, '#ffd080', 1, 'center');
        ctx.fillStyle = '#e04878'; ctx.fillRect(0, 222, W, 4);
        drawRoo(ctx, titleRoo.x, 222, 1, 'walk', false, titleRoo.f, ((titleRoo.f >> 5) % 4 === 0) ? 8 : 0, true);
        drawCoinLine(ctx, 202);
        text(ctx, '\u00a9 1982 SUN ELECTRONICS', W / 2, 234, '#888', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        drawField(ctx);
        for (const f of fruits) if (f.alive) { ctx.fillStyle = '#4a8a30'; ctx.fillRect(f.x, f.y - 3, 1, 3); ctx.drawImage(FRUITS[f.kind], f.x - 4, f.y); }
        const ta = topApe;
        ctx.drawImage(SPR.topape[ta.dir > 0 ? 0 : 1], Math.round(ta.x - 8), 31 - (ta.throwT > 12 ? 2 : 0));
        if (ta.throwT > 12) ctx.drawImage(CORE, Math.round(ta.x) - 1, 26);
        for (const m of monkeys) {
          const img = m.st === 'aim' && m.t > 35 && m.t < 55 ? SPR.monkeyT : SPR.monkey;
          ctx.drawImage(img[m.st === 'aim' ? m.side : (m.anim >> 4) & 1], Math.round(m.x - 6), Math.round(m.y - 12));
        }
        for (const a of apples) ctx.drawImage(APPLE, Math.round(a.x - 2), Math.round(a.y - 2));
        for (const c of cores) ctx.drawImage(CORE, Math.round(c.x - 1), Math.round(c.y - 2));
        if (ape) {
          const ay = FY[ape.floor];
          ctx.drawImage(SPR.ape[ape.dir > 0 ? 0 : 1], Math.round(ape.x - 8), ay - 20 - ((ape.anim >> 3) & 1));
          if (ape.carry) { ctx.fillStyle = '#e02020'; ctx.fillRect(Math.round(ape.x) - 2, ay - 24, 4, 4); ctx.fillRect(Math.round(ape.x) + 3, ay - 23, 4, 4); }
        }
        if (state === 'dying') {
          const fall = Math.min(T, 40);
          ctx.save(); ctx.translate(Math.round(roo.x), Math.round(roo.y - 12));
          ctx.rotate(Math.min(Math.PI / 2, T * 0.06) * roo.dir * -1);
          ctx.drawImage(SPR.stand[roo.dir > 0 ? 0 : 1], -8, -12 + fall * 0.2);
          ctx.restore();
          if (T > 30) for (let i = 0; i < 3; i++) {
            const ang = T * 0.1 + i * 2.1; ctx.fillStyle = '#ffff40';
            ctx.fillRect(Math.round(roo.x + Math.cos(ang) * 9), Math.round(roo.y - 24 + Math.sin(ang) * 3), 2, 2);
          }
        } else {
          drawRoo(ctx, roo.x, roo.y, roo.dir, roo.mode, roo.mode === 'walk' && roo.duck, roo.anim, roo.punch, gloves);
        }
        if (state === 'clear') {
          ctx.drawImage(HEART, JOEY_X + 4, FY[3] - 34 - ((T >> 3) & 1) * 2);
          text(ctx, 'STAGE CLEAR!', W / 2, 100, '#ffd080', 1, 'center');
        }
        for (const p of popups) text(ctx, String(p.n), Math.round(p.x), Math.round(p.y - (50 - p.t) * 0.2), '#fff', 1, 'center');
        drawHud(ctx);
        if (state === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(56, 98, 112, 30);
          text(ctx, 'PLAYER 1', W / 2, 102, '#40d0ff', 1, 'center'); text(ctx, 'STAGE ' + stage, W / 2, 116, '#fff', 1, 'center');
        }
        if (!gloves && state === 'play' && (T >> 3) & 1) text(ctx, 'NO GLOVES!', W / 2, 24, '#ff4040', 1, 'center');
        if (state === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(52, 110, 120, 24);
          text(ctx, 'GAME OVER', W / 2, 115, '#ff4040', 2, 'center');
        }
        if (demo) {
          ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(60, 102, 104, 30);
          text(ctx, 'DEMO PLAY', W / 2, 105, '#ffd080', 1, 'center');
          if ((T >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 118, api.credits > 0 ? '#40d0ff' : '#ff4040', 1, 'center');
        }
      }

      return { update, render, destroy() { if (!demo) api.setHiScore(score); } };
    }
  });
})();
