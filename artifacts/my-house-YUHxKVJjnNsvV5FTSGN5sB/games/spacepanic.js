// Space Panic (Universal, 1980) - from-scratch recreation for the MAME32 Game Room.
// Dig holes in the brick floors, trap the space monsters and bury them before they climb out - and watch your oxygen.
(function () {
  'use strict';
  const W = 256, H = 224;

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
  const MAN_A = [
    '....wwww....', '...wwwwww...', '..wwwbbbbw..', '.owwbbcbbw..', '.owwbbbbbw..', '.oowwwwww...', '.oo..yy.....', '.oossssss...',
    '.oosssssssh.', '.oossssss.hh', '..ssssss....', '...rrrr.....', '...ss.ss....', '..ss...ss...', '..ss....ss..', '.kkk....kkk.'];
  const MAN_B = MAN_A.slice(0, 12).concat(['...ssss.....', '...ss.s.....', '...sssk.....', '...kkkk.....']);
  const MAN_CLIMB = [
    '....wwww....', '...wwwwww...', '..wwwwwwww..', '..wwwwwwww..', '..wwwwwwww..', '...wwwwww...', 'ss..oooo..ss', '.sssoooosss.',
    '...soooos...', '...soooos...', '...ssssss...', '...rrrrrr...', '...ss..ss...', '...ss..ss...', '...ss..ss...', '..kkk..kkk..'];
  const MPAL = { w: '#f0f0f0', b: '#2050ff', c: '#a0e0ff', o: '#f08020', y: '#c0c0c0', s: '#d8d8f0', h: '#808080', r: '#e04040', k: '#606080' };
  const MAN = { a: pair(MAN_A, MPAL), b: pair(MAN_B, MPAL), climb: pair(MAN_CLIMB, MPAL) };
  const MON = [
    '..x......x..', '...x....x...', '...xxxxxx...', '..xxxxxxxx..', '.xxwwxxwwxx.', '.xxwkxxwkxx.', 'xxxxxxxxxxxx', 'xx.xmmmmx.xx',
    'x..xxxxxx..x', '...xx..xx...', '..xx....xx..', '.xx......xx.'];
  const MON_B = MON.slice(0, 9).concat(['...xx..xx...', '...xx..xx...', '..xxx..xxx..']);
  const RANK_COL = [null, '#ff3838', '#30e040', '#f8f8f8'];
  const RANK_NAME = [null, 'ALIEN', 'BOSS', 'DON'];
  const MONS = [null, 1, 2, 3].map(r => r && [sprite(MON, { x: RANK_COL[r], w: '#fff', k: '#000', m: '#300' }), sprite(MON_B, { x: RANK_COL[r], w: '#fff', k: '#000', m: '#300' })]);
  const PTS = [null, [100, 300, 800, 800], [0, 500, 1000, 1500], [0, 0, 2000, 3000]];

  // ---------- playfield ----------
  const FY = [56, 96, 136, 176, 216];           // floor surfaces, 0 = top, 4 = ground
  const NS = 16;                                 // 16 slots of 16px
  const sc = s => s * 16 + 8, slotOf = x => Math.max(0, Math.min(NS - 1, Math.floor(x / 16)));
  const LADDERS = [
    [[2, 9, 13], [5, 11], [1, 8, 14], [4, 10]],
    [[1, 7, 14], [3, 10, 12], [6, 13], [2, 9]],
    [[4, 11], [1, 7, 14], [3, 9, 12], [6, 13]],
    [[3, 8, 13], [0, 6, 15], [4, 11], [2, 7, 13]]
  ];
  const THEMES = [
    { brick: '#c83820', mortar: '#601808', lad: '#f0e020' },
    { brick: '#2868d8', mortar: '#102860', lad: '#f08020' },
    { brick: '#20a050', mortar: '#0a4020', lad: '#f0f0f0' },
    { brick: '#b030c0', mortar: '#401048', lad: '#30e0f0' }
  ];

  ArcadeRegistry.register({
    id: 'spacepanic', title: 'Space Panic', year: 1980, maker: 'Universal',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk / climb \u00b7 Space: dig \u00b7 X: fill (bury) \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#ff3838', accent: '#30e040' },
    create(api) {
      // ---------- attract-mode demo: an autopilot plays through the same input layer ----------
      let demo = false, demoT = 0, dKeys = new Set(), dPrev = new Set();
      const A = { tone: (...a) => { if (!demo) api.audio.tone(...a); }, noise: (...a) => { if (!demo) api.audio.noise(...a); }, melody: (...a) => (demo ? 0 : api.audio.melody(...a)) };
      const key = c => (demo ? dKeys.has(c) : api.key(c));
      const pressed = c => (demo ? dKeys.has(c) && !dPrev.has(c) : api.pressed(c));
      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, round = 1, extraGiven = false, coinFlash = 0;
      let man, aliens, queue, holes, oxy, spawnT, popups, clearT, stars = [];
      for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: 18 + Math.random() * 200, c: Math.random() < .5 ? '#446' : '#88a' });

      const L = () => LADDERS[(round - 1) % LADDERS.length];
      const TH = () => THEMES[(round - 1) % THEMES.length];
      const lvl = () => Math.min(round - 1, 10);
      const ladUp = (f, s) => f > 0 && L()[f - 1].includes(s);
      const ladDown = (f, s) => f < 4 && L()[f].includes(s);
      const hole = (f, s) => (f >= 0 && f < 4 && s >= 0 && s < NS) ? holes[f][s] : 0;
      const trappedAt = (f, s) => aliens.find(a => a.mode === 'trapped' && a.floor === f && slotOf(a.x) === s);

      function addScore(n, x, y) {
        score += n;
        if (!extraGiven && score >= 10000) { extraGiven = true; lives++; A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .14 }); }
        if (!demo && score > hi) hi = score;
        if (x != null) popups.push({ x, y, n, t: 60 });
      }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; A.tone(98, .28, { type: 'square', vol: .14 }); return false;
      }

      // ---------- sounds ----------
      const sDig = () => { A.noise(.07, { vol: .14, freq: 900 }); A.tone(160, .05, { type: 'square', vol: .06 }); };
      const sFill = () => { A.noise(.05, { vol: .1, freq: 2500 }); A.tone(260, .05, { type: 'square', vol: .06 }); };
      const sTrap = () => A.melody([[880, .05], [660, .05], [880, .05], [660, .05]], { type: 'square', vol: .1 });
      const sFall = () => A.tone(1200, .5, { type: 'square', vol: .12, slideTo: 120 });
      const sKill = () => A.melody([[523, .05], [784, .05], [1047, .05], [1568, .12]], { type: 'square', vol: .13 });
      const sEscape = () => A.tone(200, .3, { type: 'sawtooth', vol: .12, slideTo: 600 });
      const sDie = () => A.melody([[659, .12], [622, .12], [587, .12], [554, .12], [523, .12], [494, .12], [466, .12], [440, .4]], { type: 'square', vol: .13 });
      const sStart = () => A.melody([[262, .1], [330, .1], [392, .1], [523, .2], [392, .1], [523, .3]], { type: 'square', vol: .13 });
      const sClear = () => A.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .08], [1319, .3]], { type: 'square', vol: .13 });

      // ---------- setup ----------
      function roundAliens() {
        const n = Math.min(3 + Math.floor((round + 1) / 2), 8);
        const ranks = [];
        const greens = round >= 2 ? Math.min(3, Math.floor(round / 2)) : 0;
        const whites = round >= 4 ? Math.min(2, Math.floor((round - 2) / 2)) : 0;
        for (let i = 0; i < n; i++) ranks.push(i < whites ? 3 : i < whites + greens ? 2 : 1);
        return ranks.reverse();
      }
      function resetMap() {
        holes = []; for (let f = 0; f < 4; f++) holes.push(new Array(NS).fill(0));
      }
      function placeMan() {
        man = { x: sc(7), y: FY[4], floor: 4, mode: 'walk', dir: 1, anim: 0, dig: 0, gap: 0 };
      }
      function startRound() {
        resetMap(); placeMan(); aliens = []; queue = roundAliens(); popups = [];
        oxy = 1000; spawnT = 60; state = 'ready'; T = 0;
      }
      function startGame() { score = 0; lives = 3; round = 1; extraGiven = false; startRound(); sStart(); }
      function spawnAlien(rank) {
        let s, tries = 0;
        do { s = 1 + ((Math.random() * (NS - 2)) | 0); tries++; } while (tries < 20 && (ladUp(0, s) || ladDown(0, s) || hole(0, s) || (man.floor === 0 && Math.abs(sc(s) - man.x) < 50)));
        aliens.push({ x: sc(s), y: FY[0], floor: 0, mode: 'spawn', t: 50, dir: Math.random() < .5 ? -1 : 1, rank, anim: 0, fallen: 0, stun: 0, gap: 0 });
        A.tone(100, .4, { type: 'sawtooth', vol: .08, slideTo: 800 });
      }

      // ---------- player ----------
      function digTarget() {
        const s = slotOf(man.x) + man.dir;
        if (s < 0 || s >= NS || man.floor >= 4 || ladUp(man.floor, s) || ladDown(man.floor, s)) return -1;
        return s;
      }
      function dig(sign) {
        const s = digTarget(); man.dig = 14;
        man.x = sc(slotOf(man.x));
        if (s < 0) { A.tone(90, .05, { type: 'square', vol: .06 }); return; }
        const f = man.floor;
        if (sign > 0) {
          if (holes[f][s] >= 3) return;
          // can't dig out a slot an alien is walking over
          holes[f][s]++; sDig();
        } else {
          if (holes[f][s] <= 0) return;
          holes[f][s]--; sFill();
          if (holes[f][s] === 0) {
            const a = trappedAt(f, s);
            if (a) { a.mode = 'fall'; a.vy = 0.5; a.fallen = 0; holes[f][s] = 0; sFall(); }
          }
        }
      }
      function updateMan() {
        const p = man;
        const Lk = key('ArrowLeft'), Rk = key('ArrowRight'), U = key('ArrowUp'), D = key('ArrowDown');
        if (p.dig > 0) p.dig--;
        if (p.mode === 'climb') {
          const g = p.gap;
          if (U) { p.y -= 0.8; p.anim++; if (p.y <= FY[g]) { p.y = FY[g]; p.floor = g; p.mode = 'walk'; } }
          else if (D) { p.y += 0.8; p.anim++; if (p.y >= FY[g + 1]) { p.y = FY[g + 1]; p.floor = g + 1; p.mode = 'walk'; } }
          if ((U || D) && (p.anim & 15) === 0) A.tone(400, .02, { type: 'square', vol: .04 });
          return;
        }
        const s = slotOf(p.x);
        if (U && ladUp(p.floor, s) && Math.abs(p.x - sc(s)) <= 6) { p.mode = 'climb'; p.gap = p.floor - 1; p.x = sc(s); return; }
        if (D && ladDown(p.floor, s) && Math.abs(p.x - sc(s)) <= 6) { p.mode = 'climb'; p.gap = p.floor; p.x = sc(s); return; }
        if (p.dig === 0) {
          if (key('Space') || key('KeyZ')) { dig(1); return; }
          if (key('KeyX')) { dig(-1); return; }
        }
        if (p.dig === 0 && (Lk || Rk)) {
          p.dir = Lk ? -1 : 1;
          const nx = Math.max(6, Math.min(W - 6, p.x + p.dir));
          const s2 = slotOf(nx + p.dir * 7);
          if (!(s2 !== slotOf(p.x) && hole(p.floor, s2) > 0) && hole(p.floor, slotOf(nx)) === 0) { p.x = nx; p.anim++; if ((p.anim & 15) === 0) A.tone(140, .02, { type: 'square', vol: .04 }); }
        }
      }

      // ---------- aliens ----------
      function updateAliens() {
        const spd = 0.42 + lvl() * 0.045;
        for (let i = aliens.length - 1; i >= 0; i--) {
          const a = aliens[i]; a.anim++;
          if (a.dead) continue;
          const sp = spd * (a.rank === 3 ? 1.25 : a.rank === 2 ? 1.12 : 1);
          if (a.mode === 'spawn') { if (--a.t <= 0) a.mode = 'walk'; continue; }
          if (a.stun > 0) { a.stun--; continue; }
          if (a.mode === 'walk') {
            const px = a.x; a.x += a.dir * sp;
            if (a.x < 6) { a.x = 6; a.dir = 1; } else if (a.x > W - 6) { a.x = W - 6; a.dir = -1; }
            const s = slotOf(a.x), c = sc(s);
            const crossed = (px - c) * (a.x - c) <= 0;
            const occ = trappedAt(a.floor, s);
            if (hole(a.floor, s) >= 1 && occ && occ !== a && (c - a.x) * a.dir > 0) { a.dir = -a.dir; continue; }
            if (crossed) {
              if (hole(a.floor, s) >= 2 && !occ) {
                a.mode = 'trapped'; a.x = c; a.t = Math.max(140, 460 - lvl() * 28) - a.rank * 40; sTrap(); continue;
              }
              const up = ladUp(a.floor, s), dn = ladDown(a.floor, s);
              if (up || dn) {
                const target = man.floor;
                let choice = 0;
                if (target < a.floor && up && Math.random() < 0.75) choice = -1;
                else if (target > a.floor && dn && Math.random() < 0.75) choice = 1;
                else if (Math.random() < 0.25) choice = up && dn ? (Math.random() < .5 ? -1 : 1) : up ? -1 : 1;
                if (choice) { a.mode = 'climb'; a.cdir = choice; a.gap = choice < 0 ? a.floor - 1 : a.floor; a.x = c; continue; }
              }
              if (a.floor === man.floor && Math.random() < 0.35 + lvl() * 0.04) a.dir = man.x > a.x ? 1 : -1;
            }
          } else if (a.mode === 'climb') {
            a.y += a.cdir * sp * 0.85;
            const tf = a.cdir < 0 ? a.gap : a.gap + 1;
            if ((a.cdir < 0 && a.y <= FY[tf]) || (a.cdir > 0 && a.y >= FY[tf])) {
              a.y = FY[tf]; a.floor = tf; a.mode = 'walk';
              a.dir = tf === man.floor ? (man.x > a.x ? 1 : -1) : (Math.random() < .5 ? -1 : 1);
            }
          } else if (a.mode === 'trapped') {
            if (--a.t <= 0) {
              holes[a.floor][slotOf(a.x)] = 0; a.mode = 'walk'; a.stun = 20;
              if (a.rank < 3) a.rank++;
              sEscape();
            }
          } else if (a.mode === 'fall') {
            a.vy = Math.min(3, a.vy + 0.15); a.y += a.vy;
            const tf = a.floor + 1;
            if (tf <= 4 && a.y >= FY[tf]) {
              a.floor = tf; a.fallen++;
              const s = slotOf(a.x);
              if (tf < 4 && holes[tf][s] >= 1) {
                holes[tf][s] = 0;
                const victim = trappedAt(tf, s);
                if (victim) { aliens.splice(aliens.indexOf(victim), 1); addScore(PTS[victim.rank][Math.max(0, victim.rank - 1)], victim.x, FY[tf] - 18); if (aliens.indexOf(a) < 0) continue; }
                continue;
              }
              a.y = FY[tf];
              // a falling alien flattens anything walking where it lands
              for (const o of aliens) {
                if (o === a || o.dead || o.floor !== tf || (o.mode !== 'walk' && o.mode !== 'climb') || Math.abs(o.x - a.x) > 10) continue;
                o.dead = true; addScore(500, o.x, FY[tf] - 26); A.noise(.15, { vol: .14, freq: 600 });
              }
              if (a.fallen >= a.rank) {
                const pts = PTS[a.rank][Math.min(3, a.fallen - 1)];
                aliens.splice(aliens.indexOf(a), 1); addScore(pts, a.x, a.y - 18); sKill();
                continue;
              }
              a.mode = 'walk'; a.stun = 50; A.noise(.12, { vol: .12, freq: 400 });
            }
          }
          // contact with the spaceman
          if ((a.mode === 'walk' || a.mode === 'climb') && Math.abs(a.x - man.x) < 9 && Math.abs((a.y - 6) - (man.y - 8)) < 11) { die(); return; }
        }
        if (queue.length && --spawnT <= 0) { spawnAlien(queue.shift()); spawnT = Math.max(50, 110 - lvl() * 6); }
        if (aliens.some(o => o.dead)) aliens = aliens.filter(o => !o.dead);
        if (!queue.length && !aliens.length) { state = 'clear'; T = 0; clearT = 0; sClear(); }
      }
      function die() {
        if (state !== 'play') return;
        state = 'dying'; T = 0; sDie();
      }
      function updatePlay() {
        oxy -= 0.32 + lvl() * 0.02;
        if (oxy < 250 && T % 40 === 0) A.tone(1800, .05, { type: 'square', vol: .1 });
        if (oxy <= 0) { oxy = 0; die(); return; }
        updateMan();
        updateAliens();
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
      }

      // ---------- demo autopilot ----------
      let dAI = {};
      function startDemo() {
        demo = true; demoT = 0; dKeys = new Set(); dPrev = new Set(); dAI = { f: -1, tx: 0, climb: 1, lastX: 0, stuck: 0 };
        startGame(); round = 1 + ((Math.random() * 4) | 0); startRound(); T = 60;
      }
      function endDemo() { demo = false; dKeys = new Set(); score = 0; state = 'title'; T = 0; }
      function demoAI() {
        const k = new Set(), p = man;
        if (state !== 'play') return k;
        if (p.mode === 'climb') { k.add(dAI.climb < 0 ? 'ArrowUp' : 'ArrowDown'); return k; }
        const s = slotOf(p.x);
        // bury a trapped alien beside us
        for (const a of aliens) {
          if (a.mode !== 'trapped' || a.floor !== p.floor) continue;
          const as = slotOf(a.x);
          if (as === s + p.dir) { if (p.dig === 0) k.add('KeyX'); return k; }
          if (as === s - p.dir) { k.add(p.dir > 0 ? 'ArrowLeft' : 'ArrowRight'); return k; }
        }
        // dig a trap in front of an alien heading our way
        for (const a of aliens) {
          if (a.floor !== p.floor || a.mode !== 'walk') continue;
          const dx = a.x - p.x, d = dx > 0 ? 1 : -1;
          if (Math.abs(dx) > 80 || Math.abs(dx) < 20 || a.dir !== -d) continue;
          if (p.dir !== d) { k.add(d > 0 ? 'ArrowRight' : 'ArrowLeft'); return k; }
          const t = digTarget();
          if (t >= 0) { if (holes[p.floor][t] < 3 && p.dig === 0) k.add('Space'); return k; }
        }
        // otherwise wander from ladder to ladder
        if (Math.abs(p.x - dAI.lastX) < 0.5) dAI.stuck++; else dAI.stuck = 0;
        dAI.lastX = p.x;
        if (dAI.f !== p.floor || dAI.stuck > 50) {
          dAI.f = p.floor; dAI.stuck = 0;
          const opts = [];
          for (let q = 0; q < NS; q++) { if (ladUp(p.floor, q)) opts.push([q, -1]); if (ladDown(p.floor, q)) opts.push([q, 1]); }
          const o = opts[(Math.random() * opts.length) | 0]; dAI.tx = sc(o[0]); dAI.climb = o[1];
        }
        if (Math.abs(p.x - dAI.tx) <= 2) k.add(dAI.climb < 0 ? 'ArrowUp' : 'ArrowDown');
        else k.add(dAI.tx < p.x ? 'ArrowLeft' : 'ArrowRight');
        return k;
      }

      function update() {
        T++; if (coinFlash > 0) coinFlash--;
        if (demo) {
          if (api.anyPressed('Enter', 'Space')) { endDemo(); return; }
          dPrev = dKeys; dKeys = demoAI();
          if (++demoT > 2400 || state === 'clear') { endDemo(); return; }
        }
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            else if (T > 720) startDemo();
            break;
          case 'ready': if (T >= 140) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'dying':
            if (T >= 160 && demo) { endDemo(); break; }
            if (T >= 160) {
              const respawn = () => {
                // survivors go back to the top, holes are repaired, oxygen refilled
                for (const a of aliens) queue.unshift(a.rank);
                aliens = []; resetMap(); placeMan(); oxy = 1000; spawnT = 60; popups = []; state = 'ready'; T = 40;
              };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              lives--;
              if (lives <= 0) { if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else respawn();
            }
            break;
          case 'clear':
            if (T > 60 && oxy > 0) { const d = Math.min(10, oxy); oxy -= d; addScore(Math.round(d)); if ((T & 3) === 0) A.tone(1000 + oxy, .03, { type: 'square', vol: .06 }); }
            else if (T > 60) { if (++clearT > 90) { round++; startRound(); sStart(); } }
            break;
          case 'over':
            if (T >= 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- rendering ----------
      function drawFloors(ctx) {
        const th = TH();
        for (let f = 0; f < 5; f++) {
          const y = FY[f];
          ctx.fillStyle = th.mortar; ctx.fillRect(0, y, W, 6);
          ctx.fillStyle = th.brick;
          for (let row = 0; row < 2; row++) for (let x = (row ? -4 : 0); x < W; x += 8) ctx.fillRect(x, y + row * 3, 7, 2);
          if (f < 4) for (let s = 0; s < NS; s++) {
            const d = holes[f][s]; if (!d) continue;
            const x = s * 16 + 1;
            ctx.fillStyle = '#000';
            if (d === 1) ctx.fillRect(x + 3, y, 8, 2);
            else if (d === 2) { ctx.fillRect(x + 1, y, 12, 4); }
            else { ctx.fillRect(x, y, 14, 6); }
            ctx.fillStyle = th.brick;
            if (d >= 2) { ctx.fillRect(x - 1, y + 5 + (d === 3 ? 1 : 0), 2, 1); ctx.fillRect(x + 13, y + 6, 2, 1); }
          }
        }
        const lad = L();
        ctx.fillStyle = th.lad;
        for (let g = 0; g < 4; g++) for (const s of lad[g]) {
          const x = s * 16 + 3, top = FY[g] - 1, bot = FY[g + 1] + 6;
          ctx.fillRect(x, top, 2, bot - top); ctx.fillRect(x + 8, top, 2, bot - top);
          for (let y = top + 3; y < bot; y += 5) ctx.fillRect(x, y, 10, 1);
        }
      }
      function drawMan(ctx) {
        const p = man, d = p.dir > 0 ? 0 : 1;
        const x = Math.round(p.x - 6), y = Math.round(p.y - 16);
        if (p.mode === 'climb') { ctx.drawImage(MAN.climb[(p.anim >> 3) & 1], x, y); return; }
        const img = ((p.anim >> 3) & 1) ? MAN.b[d] : MAN.a[d];
        ctx.drawImage(img, x, y);
        // shovel
        ctx.fillStyle = '#c0c0c0';
        const sx = Math.round(p.x + p.dir * 7);
        if (p.dig > 7) { ctx.fillRect(sx + (p.dir > 0 ? 0 : -1), y + 9, 2, 6); ctx.fillStyle = '#fff'; ctx.fillRect(sx + (p.dir > 0 ? 1 : -3), y + 14, 4, 3); }
        else if (p.dig > 0) { ctx.fillRect(Math.min(sx, sx + p.dir * 6), y + 9, 7, 1); ctx.fillStyle = '#fff'; ctx.fillRect(sx + p.dir * 7 - 1, y + 8, 3, 3); }
      }
      function drawAlien(ctx, a) {
        if (a.mode === 'spawn' && (a.t >> 2) & 1) return;
        const fr = a.mode === 'climb' || a.mode === 'walk' ? (a.anim >> 3) & 1 : a.mode === 'trapped' ? (a.anim >> 2) & 1 : 0;
        let y = Math.round(a.y - 12);
        if (a.mode === 'trapped') y += 7 + ((a.anim >> 3) & 1);
        ctx.drawImage(MONS[a.rank][fr], Math.round(a.x - 6), y);
        if (a.mode === 'trapped') {
          if (a.t < 90 && (a.t >> 3) & 1) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(a.x - 7), y - 2, 14, 1); }
        }
      }
      function drawHud(ctx) {
        text(ctx, '1UP', 4, 2, '#ff3838'); text(ctx, String(score).padStart(6, '0'), 26, 2, '#fff');
        text(ctx, 'HI', 92, 2, '#ff3838'); text(ctx, String(hi).padStart(6, '0'), 106, 2, '#fff');
        text(ctx, 'ROUND ' + round, W - 4, 2, '#30e040', 1, 'right');
        text(ctx, 'OXYGEN', 4, 12, '#40c0ff');
        ctx.fillStyle = '#203040'; ctx.fillRect(44, 12, 130, 7);
        const low = oxy < 250;
        ctx.fillStyle = low ? ((T >> 3) & 1 ? '#ff3030' : '#802020') : oxy < 500 ? '#f0e020' : '#40c0ff';
        ctx.fillRect(45, 13, Math.max(0, Math.round(oxy / 1000 * 128)), 5);
        for (let i = 0; i < Math.min(6, lives - 1); i++) { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(W - 10 - i * 9, 12, 6, 4); ctx.fillStyle = '#2050ff'; ctx.fillRect(W - 9 - i * 9, 13, 4, 2); ctx.fillStyle = '#d8d8f0'; ctx.fillRect(W - 10 - i * 9, 16, 6, 3); }
      }
      function coinLine(ctx, y) {
        const blink = (T >> 5) & 1;
        if (api.credits === 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, y, '#ff3838', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START BUTTON', W / 2, y, '#40c0ff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, H - 9, '#aaa', 1, 'right');
      }
      function renderTitle(ctx) {
        for (const s of stars) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        text(ctx, '1UP', 4, 2, '#ff3838'); text(ctx, String(score).padStart(6, '0'), 26, 2, '#fff');
        text(ctx, 'HI', 92, 2, '#ff3838'); text(ctx, String(hi).padStart(6, '0'), 106, 2, '#fff');
        const sh = Math.round(Math.sin(T / 10) * 1.5);
        text(ctx, 'SPACE', W / 2 + sh, 22, '#ff3838', 4, 'center');
        text(ctx, 'PANIC', W / 2 - sh, 54, '#f0e020', 4, 'center');
        text(ctx, '- SCORE TABLE -', W / 2, 92, '#40c0ff', 1, 'center');
        text(ctx, 'FLOORS     1     2     3', 70, 104, '#888');
        for (let r = 1; r <= 3; r++) {
          const y = 116 + (r - 1) * 18;
          ctx.drawImage(MONS[r][(T >> 4) & 1], 30, y - 2);
          text(ctx, RANK_NAME[r], 46, y, RANK_COL[r]);
          for (let k = 0; k < 3; k++) text(ctx, PTS[r][k] ? String(PTS[r][k]) : '--', 136 + k * 36, y, '#fff', 1, 'right');
        }
        text(ctx, 'DIG A HOLE, TRAP THE ALIEN', W / 2, 172, '#d8d8f0', 1, 'center');
        text(ctx, 'AND BURY IT BEFORE IT ESCAPES', W / 2, 181, '#d8d8f0', 1, 'center');
        coinLine(ctx, 196);
        text(ctx, '\u00a9 1980 UNIVERSAL', 4, H - 9, '#888');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        for (const s of stars) { if (s.y > 22) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); } }
        drawFloors(ctx);
        for (const a of aliens) drawAlien(ctx, a);
        if (state === 'dying') {
          const x = Math.round(man.x - 6), y = Math.round(man.y - 16);
          if (T < 60) { ctx.drawImage(((T >> 2) & 1 ? MAN.a : MAN.b)[man.dir > 0 ? 0 : 1], x + ((T >> 1) & 1), y); }
          else {
            ctx.fillStyle = '#d8d8f0'; ctx.fillRect(x, man.y - 4, 12, 4); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x + (man.dir > 0 ? 9 : -3), man.y - 6, 6, 6);
            if (T < 120) { ctx.fillStyle = '#a0e0ff'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + i * 3, man.y - 10 - ((T + i * 9) % 20), 1, 1); }
          }
        } else drawMan(ctx);
        for (const p of popups) text(ctx, String(p.n), Math.round(p.x), Math.round(p.y - (60 - p.t) * 0.15), '#fff', 1, 'center');
        drawHud(ctx);
        if (state === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(84, 66, 88, 24);
          text(ctx, 'ROUND ' + round, W / 2, 68, '#f0e020', 1, 'center'); text(ctx, 'READY', W / 2, 80, '#fff', 1, 'center');
        }
        if (state === 'clear') { ctx.fillStyle = '#000'; ctx.fillRect(64, 66, 128, 24); text(ctx, 'ROUND CLEAR', W / 2, 68, '#30e040', 1, 'center'); text(ctx, 'OXYGEN BONUS', W / 2, 80, '#40c0ff', 1, 'center'); }
        if (state === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(68, 100, 120, 24); text(ctx, 'GAME OVER', W / 2, 105, '#ff3838', 2, 'center'); }
        if (demo) {
          ctx.fillStyle = '#000'; ctx.fillRect(76, 24, 104, 26);
          text(ctx, 'DEMO PLAY', W / 2, 26, '#f0e020', 1, 'center');
          if ((T >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 38, api.credits > 0 ? '#40c0ff' : '#ff3838', 1, 'center');
        }
      }

      return { update, render, destroy() { if (!demo) api.setHiScore(score); } };
    }
  });
})();
