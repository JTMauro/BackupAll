// Tapper (Bally Midway, 1983) - from-scratch recreation for the MAME32 Game Room.
// Pour and slide drinks down four bars, catch the empties, grab the tips - and pick the right can in the soda shake.
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
  const BT = [
    '...hhhhh....', '..hhhhhhh...', '..hsssssh...', '..sksssks...', '..sssssss...', '..smmmmms...', '...sssss....', '....sss.....',
    '..wwwkwww...', '.wwwkkkwww..', 'swwwwwwwwws.', 's.wwwwwww.s.', '..aaaaaaa...', '..aaaaaaa...', '..aaaaaaa...', '...pp.pp....',
    '...pp.pp....', '..kkk.kkk...'];
  const BT2 = BT.slice(0, 15).concat(['...pp..pp...', '..pp....pp..', '.kkk....kkk.']);
  const BT_POUR = BT.slice(0, 8).concat(['..wwwkwww.ss', '.wwwkkkwwws.', 'swwwwwwwww..', 's.wwwwwww...']).concat(BT.slice(12));
  const BTP = { h: '#603010', s: '#f0b080', k: '#000', m: '#402010', w: '#f8f8f8', a: '#e8e8e8', p: '#303060' };
  const BARTENDER = { stand: pair(BT, BTP), walk: pair(BT2, BTP), pour: pair(BT_POUR, BTP) };
  // customer body (head art replaced per scene)
  const CUST_BODY = ['..ccccccc...', '.ccccccccc..', 'sccccccccc..', 's.cccccccs..', '..ccccccc...', '..lllllll...', '..ll...ll...', '..ll...ll...', '.ooo...ooo..'];
  const CUST_BODY2 = ['..ccccccc...', '.ccccccccc..', 'sccccccccc..', 's.cccccccs..', '..ccccccc...', '..lllllll...', '...ll.ll....', '..ll...ll...', '.oo.....oo.'];
  const HEADS = [
    ['.....hh.....', 'hhhhhhhhhhh.', '.hhhhhhhhh..', '..sssssss...', '..skssskss..', '..sssssss...', '..sbbbbbs...', '...sssss....', '....sss.....'],
    ['...hhhhhh...', '..hhhhhhhh..', '.hhhwhhhhh..', '..ssssssh...', '..skssskh...', '..sssssss...', '..sssssss...', '...sssss....', '....sss.....'],
    ['.....h......', '....hhh.....', '....hhh.....', '..sssssss...', '..skssskss..', '..sssssss...', '..ssbbbss...', '...sssss....', '....sss.....'],
    ['..h.....h...', '...h...h....', '..sssssss...', '.sssssssss..', '.sskkskkss..', '.sssssssss..', '..sssssss...', '...sbbbs....', '....sss.....']
  ];
  const SCENES = [
    { name: 'SALOON', wall: '#5a3018', wall2: '#4a2410', floor: '#3a1c0c', bar: '#a05820', barTop: '#d08840', door: '#2a1408',
      cust: [{ h: '#d8b070', s: '#f0b080', c: '#c04040', l: '#405080', b: '#802020' }, { h: '#503018', s: '#d89060', c: '#40a040', l: '#604030', b: '#602010' }] },
    { name: 'SPORTS', wall: '#204a20', wall2: '#183a18', floor: '#103010', bar: '#806040', barTop: '#c0a070', door: '#081808',
      cust: [{ h: '#e02020', s: '#f0b080', c: '#e02020', l: '#f0f0f0', b: '#802020' }, { h: '#2040e0', s: '#c08050', c: '#2040e0', l: '#f0f0f0', b: '#602010' }] },
    { name: 'PUNK BAR', wall: '#301040', wall2: '#280830', floor: '#180818', bar: '#505060', barTop: '#9090a8', door: '#100010',
      cust: [{ h: '#f020c0', s: '#f0c0a0', c: '#202020', l: '#404040', b: '#c02020' }, { h: '#20f040', s: '#e0b090', c: '#603060', l: '#202020', b: '#802020' }] },
    { name: 'SPACE BAR', wall: '#101848', wall2: '#0c1238', floor: '#080c20', bar: '#5070a0', barTop: '#a0c0f0', door: '#000010',
      cust: [{ h: '#80ff80', s: '#60d060', c: '#c0c0c0', l: '#606080', b: '#204020' }, { h: '#ff8040', s: '#e060e0', c: '#40c0c0', l: '#404060', b: '#401040' }] }
  ];
  const CUSTS = SCENES.map((sc, si) => sc.cust.map(p => {
    const pal = { h: p.h, s: p.s, k: '#000', b: p.b, c: p.c, l: p.l, o: '#201008', w: '#fff' };
    return [pair(HEADS[si].concat(CUST_BODY), pal), pair(HEADS[si].concat(CUST_BODY2), pal)];
  }));
  const MUG_FULL = sprite(['wwwww..', 'wwwww..', 'ayyyaaa', 'ayyya.a', 'ayyya.a', 'ayyyaaa', 'aaaaa..'], { w: '#fffff0', y: '#e8a020', a: '#c0e0f0' });
  const MUG_EMPTY = sprite(['.......', '.......', 'a...aaa', 'a...a.a', 'a...a.a', 'a...aaa', 'aaaaa..'], { a: '#c0e0f0' });
  const TIP = sprite(['.yyyy.', 'yywwyy', 'ywyyyy', 'yyyyyy', '.yyyy.'], { y: '#f8d020', w: '#fff8c0' });
  const DANCER = [
    ['...hhh....', '..hhhhh...', '..hsssh...', '...sss....', '.s.ppp.s..', '..sppps...', '...ppp....', '..ppppp...', '...s.s....', '...s..s...', '...s...s..', '..rr...rr.'],
    ['...hhh....', '..hhhhh...', '..hsssh...', '...sss....', 's..ppp..s.', '.sspppss..', '...ppp....', '..ppppp...', '...s.s....', '..s..ssss.', '..s.......', '.rr.......']
  ].map(r => sprite(r, { h: '#f8d020', s: '#f0c0a0', p: '#ff40a0', r: '#ff2060' }));
  const BANDIT = sprite(['..kkkkkk..', '.kkkkkkkk.', '..ssssss..', '.kkkkkkkk.', '.kwkkkkwk.', '..ssssss..', '...ssss...', '.rrrrrrrr.', 'rrrrrrrrrr', 'r.rrrrrr.r', 's.rrrrrr.s', '..bbbbbb..', '..bb..bb..', '..bb..bb..', '.kkk..kkk.'],
    { k: '#202020', s: '#f0b080', w: '#fff', r: '#c02020', b: '#304080' });
  const CAN = sprite(['.gggggg.', 'rrrrrrrr', 'rrwwrrrr', 'rrwwrrrr', 'rrrrrrrr', 'rwwwwwwr', 'rrrrrrrr', 'rrrwrrrr', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.gggggg.'], { g: '#c0c0c0', r: '#d02030', w: '#fff' });

  // ---------- bars ----------
  const BY = [74, 112, 150, 188];            // counter top for each bar
  const XL = [52, 40, 28, 16];               // door end
  const XR = [204, 212, 220, 228];           // tap end (bartender stands here)

  ArcadeRegistry.register({
    id: 'tapper', title: 'Tapper', year: 1983, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up/Down: change bar \u00b7 Left/Right: run along bar \u00b7 Space (hold, release): pour & slide \u00b7 Enter: start',
    marquee: { bg: '#2a1408', fg: '#f8d020', accent: '#e02020' },
    create(api) {
      // ---------- attract-mode demo: an autopilot plays through the same input layer ----------
      let demo = false, demoT = 0, dKeys = new Set(), dPrev = new Set();
      const A = { tone: (...a) => { if (!demo) api.audio.tone(...a); }, noise: (...a) => { if (!demo) api.audio.noise(...a); }, melody: (...a) => (demo ? 0 : api.audio.melody(...a)) };
      const key = c => (demo ? dKeys.has(c) : api.key(c));
      const pressed = c => (demo ? dKeys.has(c) && !dPrev.has(c) : api.pressed(c));
      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, level = 1, coinFlash = 0, extraAt = 20000;
      let bt, custs, mugs, tips, toSpawn, spawnT, dance, popups, crash, bonus, swapCD;
      const SC = () => SCENES[(level - 1) % SCENES.length];
      const lvl = () => Math.min(level - 1, 12);
      function addScore(n, x, y) {
        score += n;
        if (score >= extraAt) { extraAt += 40000; lives++; A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .14 }); }
        if (!demo && score > hi) hi = score;
        if (x != null) popups.push({ x, y, s: String(n), t: 50 });
      }
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; A.tone(98, .28, { type: 'square', vol: .14 }); return false;
      }
      // ---------- sounds ----------
      const sPour = () => A.noise(.05, { vol: .05, freq: 3000 });
      const sSlide = () => A.tone(500, .25, { type: 'triangle', vol: .1, slideTo: 250 });
      const sCatch = () => A.tone(1200, .06, { type: 'square', vol: .1 });
      const sOut = () => A.melody([[392, .06], [523, .06], [659, .1]], { type: 'square', vol: .1 });
      const sEmpty = () => A.melody([[880, .04], [1175, .06]], { type: 'square', vol: .1 });
      const sCrash = () => { A.noise(.4, { vol: .22, freq: 4000, slideTo: 500 }); A.tone(200, .3, { type: 'sawtooth', vol: .1, slideTo: 60 }); };
      const sTip = () => A.melody([[1568, .05], [2093, .05], [1568, .05], [2093, .1]], { type: 'square', vol: .11 });
      const sTune = () => A.melody([[392, .12], [392, .12], [494, .12], [587, .24], [494, .12], [587, .12], [784, .36]], { type: 'square', vol: .12 });
      const DANCE_TUNE = [[523, .1], [659, .1], [784, .1], [659, .1], [880, .2], [784, .2], [659, .1], [523, .1], [587, .2], [523, .3]];

      // ---------- setup ----------
      function resetBartender() { bt = { bar: 3, x: XR[3], dir: -1, fill: 0, pouring: false, anim: 0 }; }
      function startLevel() {
        custs = []; mugs = []; tips = []; popups = []; dance = 0; crash = null; swapCD = 0;
        toSpawn = Math.min(6 + level * 3, 34); spawnT = 60;
        resetBartender(); state = 'ready'; T = 0;
      }
      function startGame() { score = 0; lives = 3; level = 1; extraAt = 20000; startLevel(); sTune(); }
      function spawnCustomer() {
        const counts = [0, 1, 2, 3].map(b => custs.filter(c => c.bar === b).length);
        const open = [0, 1, 2, 3].filter(b => counts[b] < 2 + Math.min(2, Math.floor(level / 3)) && !custs.some(c => c.bar === b && c.x < XL[b] + 14));
        if (!open.length) return false;
        const bar = open[(Math.random() * open.length) | 0];
        custs.push({ bar, x: XL[bar] - 12, st: 'walk', t: (Math.random() * 30) | 0, type: (Math.random() * 2) | 0, vx: 0, anim: 0, beers: 0 });
        return true;
      }

      // ---------- play ----------
      function custSpeed() { return 0.38 + lvl() * 0.035; }
      function loseLife(kind, bar, x) {
        if (state !== 'play') return;
        crash = { kind, bar, x, t: 0 }; state = 'crash'; T = 0; sCrash();
      }
      function updateBartender() {
        const b = bt;
        if (swapCD > 0) swapCD--;
        if (swapCD === 0 && (pressed('ArrowUp') || pressed('ArrowDown'))) {
          b.bar = (b.bar + (pressed('ArrowUp') ? 3 : 1)) % 4; b.x = XR[b.bar]; b.fill = 0; b.pouring = false; swapCD = 6;
          A.tone(300, .04, { type: 'square', vol: .06, slideTo: 500 });
          return;
        }
        const atTap = b.x >= XR[b.bar] - 1;
        const pour = key('Space') || key('KeyX');
        if (atTap && pour) {
          b.pouring = true;
          if (b.fill < 1) { b.fill = Math.min(1, b.fill + 1 / 26); if ((T & 3) === 0) sPour(); }
          return;
        }
        if (b.pouring && !pour) {
          b.pouring = false;
          if (b.fill >= 1 && atTap) {
            mugs.push({ bar: b.bar, x: XR[b.bar] - 10, full: true, vx: -(1.35 + lvl() * 0.07) });
            b.fill = 0; sSlide();
          }
        }
        const L = key('ArrowLeft'), R = key('ArrowRight');
        if (L || R) {
          b.dir = L ? -1 : 1;
          b.x = Math.max(XL[b.bar] + 12, Math.min(XR[b.bar], b.x + b.dir * 1.7)); b.anim++;
          if (b.x < XR[b.bar] - 1) b.fill = 0;
        }
        // collect tips
        for (let i = tips.length - 1; i >= 0; i--) {
          const tp = tips[i];
          if (tp.bar === b.bar && Math.abs(tp.x - b.x) < 9) {
            tips.splice(i, 1); addScore(1500, tp.x, BY[tp.bar] - 30); sTip();
            dance = 300; A.melody(DANCE_TUNE, { type: 'square', vol: .1 });
          }
        }
      }
      function updateCustomers() {
        const sp = custSpeed();
        for (let i = custs.length - 1; i >= 0; i--) {
          const c = custs[i]; c.anim++;
          if (c.st === 'walk') {
            if (dance > 0) continue;             // everybody stops to watch the dancers
            c.t++;
            const cyc = 90 - Math.min(40, lvl() * 4), walkPart = 34;
            if (c.t % cyc < walkPart) c.x += sp * 1.6;
            if (c.x >= XR[c.bar] - 14) { loseLife('cust', c.bar, c.x); return; }
          } else if (c.st === 'pushed') {
            c.x += c.vx; c.vx *= 0.96;
            if (c.x < XL[c.bar] - 8) {
              custs.splice(i, 1); addScore(50, XL[c.bar] + 4, BY[c.bar] - 30); sOut();
              continue;
            }
            if (c.vx > -0.35) { c.st = 'drink'; c.t = 50 + ((Math.random() * 40) | 0); }
          } else if (c.st === 'drink') {
            if (--c.t <= 0) {
              mugs.push({ bar: c.bar, x: c.x + 8, full: false, vx: 0.75 + lvl() * 0.05 });
              c.st = 'walk'; c.t = 40; c.beers++;
            }
          }
        }
      }
      function updateMugs() {
        for (let i = mugs.length - 1; i >= 0; i--) {
          const m = mugs[i]; m.x += m.vx;
          if (m.full) {
            // the first walking customer on the bar that the mug reaches catches it
            let catcher = null;
            for (const c of custs) if (c.bar === m.bar && c.st === 'walk' && m.x <= c.x + 8 && m.x >= c.x - 6 && (!catcher || c.x > catcher.x)) catcher = c;
            if (catcher) {
              mugs.splice(i, 1); catcher.st = 'pushed'; catcher.vx = -(1.9 + Math.random() * 0.4); sCatch();
              if (!tips.some(t => t.bar === m.bar) && Math.random() < 0.14) tips.push({ bar: m.bar, x: catcher.x + 4 });
              continue;
            }
            if (m.x < XL[m.bar] - 4) { loseLife('full', m.bar, XL[m.bar] - 4); return; }
          } else {
            if (bt.bar === m.bar && m.x >= bt.x - 10 && m.x <= bt.x + 2) { mugs.splice(i, 1); addScore(100, bt.x - 8, BY[m.bar] - 30); sEmpty(); continue; }
            if (m.x > XR[m.bar] + 8) { loseLife('empty', m.bar, XR[m.bar] + 8); return; }
          }
        }
      }
      function updatePlay() {
        if (dance > 0) dance--;
        if (toSpawn > 0 && --spawnT <= 0) {
          if (spawnCustomer()) toSpawn--;
          spawnT = Math.max(45, 150 - lvl() * 9) + Math.random() * 70;
        }
        updateBartender();
        updateCustomers(); if (state !== 'play') return;
        updateMugs(); if (state !== 'play') return;
        for (let i = popups.length - 1; i >= 0; i--) if (--popups[i].t <= 0) popups.splice(i, 1);
        if (toSpawn === 0 && custs.length === 0 && mugs.length === 0) {
          state = 'clear'; T = 0;
          A.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .3]], { type: 'square', vol: .13 });
        }
      }
      function afterCrash() {
        // the bar is cleared: customers retreat to the doors, mugs are swept away
        mugs = []; tips = []; dance = 0;
        for (const c of custs) { c.x = XL[c.bar] - 4 - Math.random() * 6; c.st = 'walk'; c.t = 0; }
        resetBartender();
      }

      // ---------- soda shake bonus round ----------
      function startBonus() {
        const n = 6, order = [0, 1, 2, 3, 4, 5];
        bonus = { phase: 'show', t: 0, cans: order.map(i => ({ id: i, x: 40 + i * 32, shake: 0 })), good: (Math.random() * n) | 0, shakeIdx: 0, swaps: 4 + Math.min(8, level), swap: null, sel: 0, result: null };
        state = 'bonus'; T = 0;
        A.melody([[659, .1], [523, .1], [659, .1], [784, .2]], { type: 'square', vol: .12 });
      }
      function updateBonus() {
        const b = bonus; b.t++;
        const xs = i => 40 + i * 32;
        if (b.phase === 'show') { if (b.t > 90) { b.phase = 'shake'; b.t = 0; b.shakeIdx = 0; } }
        else if (b.phase === 'shake') {
          // the bandit shakes every can but one
          const order = b.cans.map((c, i) => i).filter(i => b.cans[i].id !== b.good);
          if (b.shakeIdx < order.length) {
            const can = b.cans[order[b.shakeIdx]];
            can.shake = 1;
            if (b.t % 6 === 0) A.noise(.04, { vol: .08, freq: 2500 });
            if (b.t >= 34) { can.shake = 0; b.shakeIdx++; b.t = 0; }
          } else if (b.t > 30) { b.phase = 'swap'; b.t = 0; }
        } else if (b.phase === 'swap') {
          const dur = Math.max(10, 26 - level * 2);
          if (!b.swap) {
            if (b.swaps <= 0) { b.phase = 'pick'; b.t = 0; b.cans.forEach((c, i) => { c.x = xs(i); }); return; }
            const i = (Math.random() * 6) | 0; let j = (Math.random() * 5) | 0; if (j >= i) j++;
            b.swap = { i, j, t: 0 }; b.swaps--;
            A.tone(700, .06, { type: 'square', vol: .06 });
          }
          const s = b.swap; s.t++;
          const k = Math.min(1, s.t / dur);
          b.cans[s.i].x = xs(s.i) + (xs(s.j) - xs(s.i)) * k; b.cans[s.j].x = xs(s.j) + (xs(s.i) - xs(s.j)) * k;
          b.cans[s.i].lift = Math.sin(k * Math.PI) * 10; b.cans[s.j].lift = -Math.sin(k * Math.PI) * 6;
          if (k >= 1) {
            const tmp = b.cans[s.i]; b.cans[s.i] = b.cans[s.j]; b.cans[s.j] = tmp;
            b.cans[s.i].x = xs(s.i); b.cans[s.j].x = xs(s.j); b.cans[s.i].lift = b.cans[s.j].lift = 0; b.swap = null;
          }
        } else if (b.phase === 'pick') {
          if (pressed('ArrowLeft')) { b.sel = (b.sel + 5) % 6; A.tone(500, .03, { type: 'square', vol: .06 }); }
          if (pressed('ArrowRight')) { b.sel = (b.sel + 1) % 6; A.tone(500, .03, { type: 'square', vol: .06 }); }
          if (pressed('Space') || pressed('KeyX') || b.t > 600) {
            const ok = b.cans[b.sel].id === b.good;
            b.result = ok; b.phase = 'result'; b.t = 0;
            if (ok) { addScore(3000); A.melody([[784, .08], [988, .08], [1175, .08], [1568, .08], [1175, .08], [1568, .3]], { type: 'square', vol: .13 }); }
            else { A.noise(.6, { vol: .2, freq: 3000, slideTo: 300 }); }
          }
        } else if (b.phase === 'result') {
          if (b.t > 160) { level++; startLevel(); sTune(); }
        }
      }

      // ---------- demo autopilot ----------
      function startDemo() {
        demo = true; demoT = 0; dKeys = new Set(); dPrev = new Set();
        startGame(); level = 1 + ((Math.random() * 4) | 0); startLevel(); T = 60;
      }
      function endDemo() { demo = false; dKeys = new Set(); score = 0; state = 'title'; T = 0; }
      function demoAI() {
        const k = new Set(), b = bt;
        const tap = c => { if (!dPrev.has(c)) k.add(c); };
        if (state === 'bonus') { if (bonus.phase === 'pick' && bonus.t > 40) tap('Space'); return k; }
        if (state !== 'play') return k;
        // an empty mug about to fall off has priority
        let target = -1, urg = 60;
        for (const m of mugs) if (!m.full) { const d = XR[m.bar] - m.x; if (d < urg) { urg = d; target = m.bar; } }
        if (target < 0) {
          let best = -1e9;
          for (const c of custs) {
            if (c.st !== 'walk' || mugs.some(m => m.full && m.bar === c.bar)) continue;
            const v = c.x - XR[c.bar];
            if (v > best) { best = v; target = c.bar; }
          }
        }
        if (target < 0) target = b.bar;
        if (b.bar !== target) {
          if (swapCD === 0) tap(((target - b.bar + 4) % 4) <= 2 ? 'ArrowDown' : 'ArrowUp');
          return k;
        }
        if (b.x < XR[b.bar] - 1) { k.add('ArrowRight'); return k; }
        const waiting = custs.some(c => c.bar === b.bar && c.st === 'walk') && !mugs.some(m => m.full && m.bar === b.bar);
        if (waiting && b.fill < 1) k.add('Space');
        return k;
      }

      function update() {
        T++; if (coinFlash > 0) coinFlash--;
        if (demo) {
          if (api.anyPressed('Enter', 'Space')) { endDemo(); return; }
          dPrev = dKeys; dKeys = demoAI();
          if (++demoT > 2400 || state === 'bonus' && bonus.phase === 'result' && bonus.t > 100) { endDemo(); return; }
        }
        switch (state) {
          case 'title': if (api.anyPressed('Enter', 'Space') && tryStart()) startGame(); else if (T > 720) startDemo(); break;
          case 'ready': if (T >= 130) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'crash':
            crash.t++;
            if (T >= 150 && demo) { endDemo(); break; }
            if (T >= 150) {
              const respawn = () => { afterCrash(); state = 'ready'; T = 70; };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              lives--;
              if (lives <= 0) { if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else respawn();
            }
            break;
          case 'clear': if (T >= 120) startBonus(); break;
          case 'bonus': updateBonus(); break;
          case 'over': if (T >= 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) { state = 'title'; T = 0; } break;
        }
      }

      // ---------- rendering ----------
      function drawRoom(ctx) {
        const sc = SC();
        ctx.fillStyle = sc.wall; ctx.fillRect(0, 22, W, H - 22);
        ctx.fillStyle = sc.wall2; for (let x = 0; x < W; x += 16) ctx.fillRect(x, 22, 8, H - 22);
        // stage strip at the top where the dancers perform
        ctx.fillStyle = '#000'; ctx.fillRect(0, 22, W, 20);
        ctx.fillStyle = '#f8d020'; for (let x = 4; x < W; x += 12) ctx.fillRect(x, 40, 4, 2);
        text(ctx, SC().name, W / 2, 28, '#f8a040', 1, 'center');
        for (let i = 0; i < 4; i++) {
          const y = BY[i], xl = XL[i], xr = XR[i];
          // door on the left
          ctx.fillStyle = sc.door; ctx.fillRect(xl - 18, y - 30, 14, 42);
          ctx.fillStyle = '#c0a060'; ctx.fillRect(xl - 18, y - 31, 14, 1); ctx.fillRect(xl - 7, y - 10, 2, 2);
          // counter
          ctx.fillStyle = sc.barTop; ctx.fillRect(xl - 4, y, xr - xl + 12, 3);
          ctx.fillStyle = sc.bar; ctx.fillRect(xl - 4, y + 3, xr - xl + 12, 10);
          ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let x = xl; x < xr + 8; x += 10) ctx.fillRect(x, y + 5, 1, 7);
          // tap and keg on the right wall
          ctx.fillStyle = '#8a8a9a'; ctx.fillRect(xr + 10, y - 24, 10, 22);
          ctx.fillStyle = '#c0c0d0'; ctx.fillRect(xr + 10, y - 24, 10, 2); ctx.fillRect(xr + 10, y - 6, 10, 2);
          ctx.fillStyle = '#d0d0e0'; ctx.fillRect(xr + 6, y - 18, 5, 2); ctx.fillStyle = '#202020'; ctx.fillRect(xr + 7, y - 26, 2, 8);
          ctx.fillStyle = '#e02020'; ctx.fillRect(xr + 6, y - 28, 4, 3);
        }
      }
      function drawHud(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 22);
        text(ctx, '1UP', 4, 2, '#e02020'); text(ctx, String(score).padStart(6, '0'), 4, 12, '#fff');
        text(ctx, 'HIGH', 96, 2, '#e02020'); text(ctx, String(hi).padStart(6, '0'), 96, 12, '#fff');
        if (state !== 'title') {
          text(ctx, 'LEVEL ' + level, W - 4, 2, '#f8d020', 1, 'right');
          for (let i = 0; i < Math.min(6, lives - 1); i++) ctx.drawImage(MUG_FULL, W - 12 - i * 9, 12);
        }
      }
      function drawBartender(ctx) {
        const b = bt, y = BY[b.bar] - 15;
        let img;
        if (b.pouring) img = BARTENDER.pour[1];
        else if (b.x < XR[b.bar] - 1 && (b.anim >> 3) & 1) img = BARTENDER.walk[b.dir > 0 ? 0 : 1];
        else img = BARTENDER.stand[b.dir > 0 ? 0 : 1];
        ctx.drawImage(img, Math.round(b.x - 6), y);
        if (b.pouring || b.fill > 0) {
          // the mug under the tap fills up
          const mx = XR[b.bar] + 4, my = BY[b.bar] - 7;
          ctx.drawImage(MUG_EMPTY, mx, my);
          const h = Math.round(b.fill * 5);
          ctx.fillStyle = '#e8a020'; ctx.fillRect(mx + 1, my + 6 - h, 3, h);
          if (b.fill >= 1) { ctx.fillStyle = '#fffff0'; ctx.fillRect(mx, my, 5, 2); }
          if (b.pouring && b.fill < 1) { ctx.fillStyle = '#e8a020'; ctx.fillRect(mx + 2, my - 6, 1, 6); }
        }
      }
      function drawCustomer(ctx, c) {
        const set = CUSTS[(level - 1) % SCENES.length][c.type];
        const walking = c.st === 'walk' && dance === 0 && (c.t % (90 - Math.min(40, lvl() * 4))) < 34;
        const img = set[walking && (c.anim >> 3) & 1 ? 1 : 0][c.st === 'pushed' ? 0 : 0];
        const y = BY[c.bar] - 15;
        ctx.drawImage(img, Math.round(c.x - 6), y);
        if (c.st === 'drink') {
          // tilting the mug up
          ctx.drawImage(MUG_FULL, Math.round(c.x) + 2, y + 4 - ((c.t >> 3) & 1));
        } else if (c.st === 'pushed') ctx.drawImage(MUG_FULL, Math.round(c.x) + 4, y + 10);
        if (dance > 0 && c.st === 'walk') { ctx.fillStyle = '#ff60c0'; ctx.fillRect(Math.round(c.x) - 1, y - 4, 2, 2); }
      }
      function drawBarFront(ctx) {
        // counter fronts drawn over the characters' legs
        const sc = SC();
        for (let i = 0; i < 4; i++) { ctx.fillStyle = sc.bar; ctx.fillRect(XL[i] - 4, BY[i] + 3, XR[i] - XL[i] + 12, 10); ctx.fillStyle = sc.barTop; ctx.fillRect(XL[i] - 4, BY[i], XR[i] - XL[i] + 12, 3); }
      }
      function drawDancers(ctx) {
        if (dance <= 0) return;
        for (let i = 0; i < 4; i++) ctx.drawImage(DANCER[((T >> 3) + i) & 1], 44 + i * 48, 26);
      }
      function coinLine(ctx, y) {
        const blink = (T >> 5) & 1;
        if (api.credits === 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, y, '#e02020', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START BUTTON', W / 2, y, '#f8d020', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 4, H - 9, '#aaa', 1, 'right');
      }
      function renderTitle(ctx) {
        ctx.fillStyle = '#3a1c0c'; ctx.fillRect(0, 22, W, H - 22);
        drawHud(ctx);
        text(ctx, 'TAPPER', W / 2 + 3, 37, '#600000', 5, 'center'); text(ctx, 'TAPPER', W / 2, 34, '#f8d020', 5, 'center');
        ctx.fillStyle = '#e02020'; ctx.fillRect(40, 74, W - 80, 2);
        // a mug sliding across a counter
        ctx.fillStyle = '#d08840'; ctx.fillRect(16, 104, W - 32, 3); ctx.fillStyle = '#a05820'; ctx.fillRect(16, 107, W - 32, 8);
        const mx = W - 30 - ((T * 1.5) % (W - 40));
        ctx.drawImage(MUG_FULL, Math.round(mx), 97);
        ctx.drawImage(BARTENDER.pour[1], W - 26, 86);
        ctx.drawImage(CUSTS[0][0][(T >> 4) & 1][0], 24, 86);
        text(ctx, 'SERVE THE CUSTOMERS', W / 2, 124, '#fff', 1, 'center');
        text(ctx, 'PUSH OUT CUSTOMER   50', 52, 138, '#f0d0a0');
        text(ctx, 'CATCH EMPTY MUG    100', 52, 148, '#f0d0a0');
        text(ctx, 'COLLECT TIP       1500', 52, 158, '#f0d0a0'); ctx.drawImage(TIP, 40, 158);
        text(ctx, 'SODA SHAKE BONUS  3000', 52, 168, '#f0d0a0'); ctx.drawImage(CAN, 38, 166);
        coinLine(ctx, 186);
        text(ctx, '\u00a9 1983 BALLY MIDWAY', 4, H - 9, '#888');
      }
      function renderBonus(ctx) {
        const b = bonus;
        ctx.fillStyle = '#103040'; ctx.fillRect(0, 22, W, H - 22);
        ctx.fillStyle = '#806040'; ctx.fillRect(20, 150, W - 40, 6); ctx.fillStyle = '#604020'; ctx.fillRect(20, 156, W - 40, 30);
        text(ctx, 'SODA SHAKE BONUS', W / 2, 32, '#f8d020', 1, 'center');
        if (b.phase === 'show' || b.phase === 'shake') text(ctx, 'WATCH THE CANS!', W / 2, 46, '#fff', 1, 'center');
        if (b.phase === 'pick') text(ctx, 'PICK THE UNSHAKEN CAN', W / 2, 46, (T >> 3) & 1 ? '#fff' : '#80c0ff', 1, 'center');
        if (b.phase === 'shake' || b.phase === 'show') {
          const order = b.cans.map((c, i) => i).filter(i => b.cans[i].id !== b.good);
          const tx = b.phase === 'shake' && b.shakeIdx < order.length ? b.cans[order[b.shakeIdx]].x : W / 2 - 4;
          ctx.drawImage(BANDIT, Math.round(tx - 1), 100);
        }
        b.cans.forEach((c, i) => {
          const sx = c.shake ? Math.round(Math.sin(b.t * 2) * 2) : 0;
          ctx.drawImage(CAN, Math.round(c.x) + sx, 138 - Math.round(c.lift || 0));
          if (b.phase === 'pick' && i === b.sel) { ctx.fillStyle = '#f8d020'; ctx.fillRect(Math.round(c.x) + 2, 128, 4, 4); ctx.fillRect(Math.round(c.x) + 3, 132, 2, 2); }
        });
        if (b.phase === 'result') {
          const can = b.cans[b.sel];
          if (b.result) { text(ctx, 'YOU PICKED IT!', W / 2, 70, '#40ff40', 1, 'center'); text(ctx, '3000 POINTS', W / 2, 82, '#fff', 1, 'center'); }
          else {
            text(ctx, 'FIZZ! WRONG CAN', W / 2, 70, '#ff4040', 1, 'center');
            ctx.fillStyle = '#e8f0ff'; for (let i = 0; i < 18; i++) ctx.fillRect(Math.round(can.x + 4 + Math.sin(i * 1.7) * (b.t * 0.4)), Math.round(138 - (i * 7 + b.t * 2) % 90), 2, 2);
          }
          ctx.drawImage(BARTENDER.stand[0], Math.round(can.x - 2), 170);
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { renderTitle(ctx); return; }
        if (state === 'bonus') { renderBonus(ctx); drawHud(ctx); return; }
        drawRoom(ctx);
        drawDancers(ctx);
        for (const c of custs) drawCustomer(ctx, c);
        if (state !== 'crash' || crash.kind !== 'cust') drawBartender(ctx);
        drawBarFront(ctx);
        for (const m of mugs) ctx.drawImage(m.full ? MUG_FULL : MUG_EMPTY, Math.round(m.x - 3), BY[m.bar] - 7);
        for (const tp of tips) ctx.drawImage(TIP, Math.round(tp.x - 3), BY[tp.bar] - 5);
        if (state === 'crash') {
          const c = crash, y = BY[c.bar];
          if (c.kind === 'cust') {
            // the customer sends the bartender sliding down the bar
            const x = Math.min(W + 20, XR[c.bar] - 10 + c.t * 1.5);
            ctx.save(); ctx.translate(Math.round(x), y - 6); ctx.rotate(-Math.PI / 2); ctx.drawImage(BARTENDER.stand[0], -9, -6); ctx.restore();
          } else {
            const fy = Math.min(y + 30, y - 7 + c.t * 0.8);
            ctx.fillStyle = '#c0e0f0';
            if (c.t < 30) ctx.drawImage(c.kind === 'full' ? MUG_FULL : MUG_EMPTY, Math.round(c.x - 3), Math.round(fy));
            else for (let i = 0; i < 7; i++) ctx.fillRect(Math.round(c.x - 6 + i * 2 + Math.sin(i) * 3), Math.round(y + 26 - (i & 1) * 2), 2, 1);
          }
          if ((T >> 3) & 1) text(ctx, c.kind === 'cust' ? 'TOO SLOW!' : c.kind === 'full' ? 'NOBODY THERE!' : 'MISSED A MUG!', W / 2, 52, '#ff4040', 1, 'center');
        }
        for (const p of popups) text(ctx, p.s, Math.round(p.x), Math.round(p.y - (50 - p.t) * 0.2), '#fff', 1, 'center');
        drawHud(ctx);
        if (state === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(72, 84, 112, 26);
          text(ctx, 'LEVEL ' + level, W / 2, 88, '#f8d020', 1, 'center'); text(ctx, 'GET READY TO SERVE', W / 2, 100, '#fff', 1, 'center');
        }
        if (state === 'clear') { ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(72, 84, 112, 16); text(ctx, 'ALL SERVED!', W / 2, 88, '#40ff40', 1, 'center'); }
        if (state === 'over') { ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(68, 96, 120, 24); text(ctx, 'GAME OVER', W / 2, 101, '#ff4040', 2, 'center'); }
        if (demo) {
          ctx.fillStyle = '#000'; ctx.fillRect(0, 210, W, 14);
          text(ctx, 'DEMO PLAY', 6, 214, '#f8d020');
          if ((T >> 5) & 1) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W - 6, 214, api.credits > 0 ? '#fff' : '#ff4040', 1, 'right');
        }
      }

      return { update, render, destroy() { if (!demo) api.setHiScore(score); } };
    }
  });
})();
