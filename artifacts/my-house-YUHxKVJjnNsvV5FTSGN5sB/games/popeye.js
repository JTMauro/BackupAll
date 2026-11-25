// Popeye (Nintendo, 1982) \u2014 from-scratch recreation for the Game Room.
// Catch Olive's hearts, notes and letters before they sink, dodge Brutus and the Sea Hag, eat spinach and punch Brutus out.
(function () {
  'use strict';
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
    '.': [0, 0, 0, 0, 0, 12, 12], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4],
    '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0], '=': [0, 0, 31, 0, 31, 0, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], 'x': [0, 17, 10, 4, 10, 17, 0]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s);
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]] || FONT[s[i].toUpperCase()]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function mk(rows, pal) {
    const h = rows.length, w = rows.reduce((a, r) => Math.max(a, r.length), 0);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i]; if (ch === '.' || !pal[ch]) continue;
      x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1);
    }
    return c;
  }
  function blit(ctx, img, x, y, fx) {
    x = Math.round(x); y = Math.round(y);
    if (!fx) { ctx.drawImage(img, x, y); return; }
    ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
  }
  const POP = [
    '...WWWWW....',
    '..WWWWWWW...',
    '...SSSSS....',
    '...SKSSSS...',
    '..SSSSSSSPP.',
    '...SSSSS..P.',
    '....KKK.....',
    '..SKKKKKS...',
    '.SSSKKKSSS..',
    '.SSRKKKRSS..',
    '.SS.KKK.SS..',
    '....BBBB....',
    '....BBBB....',
    '...BB..BB...',
    '...BB..BB...',
    '..KKK..KKK..'
  ];
  const POP_W = POP.slice(0, 13).concat(['...BBBBB....', '....BBB.....', '...KKKKK....']);
  const POP_P = [
    '...WWWWW....',
    '..WWWWWWW...',
    '...SSSSS....',
    '...SKSSSS...',
    '..SSSSSSSPP.',
    '...SSSSS..P.',
    '....KKK.....',
    '..SKKKKSSSSS',
    '.SSSKKKSSSSS',
    '.SSRKKK.SSSS',
    '.SS.KKK.....',
    '....BBBB....',
    '....BBBB....',
    '...BB..BB...',
    '...BB..BB...',
    '..KKK..KKK..'
  ];
  const BRU = [
    '.....KKKKK......',
    '....KKKKKKK.....',
    '....SSSSSSS.....',
    '...SSKSSSKSS....',
    '...SSSSSSSSS....',
    '...KKKKKKKKK....',
    '...KKKKKKKKK....',
    '....KKKKKKK.....',
    '..BBBBBBBBBBB...',
    '.BBBBBBBBBBBBB..',
    'SSBBBBBBBBBBBSS.',
    'SS.BBBBBBBBB.SS.',
    'SS.BBBBBBBBB.SS.',
    '...WWWWWWWWW....',
    '...WWWW.WWWW....',
    '...WWW...WWW....',
    '...WWW...WWW....',
    '..KKKK...KKKK...'
  ];
  const BRU_W = BRU.slice(0, 14).concat(['...WWWWWWWW.....', '....WWWWWW......', '....WWW.WW......', '...KKKKKKK......']);
  const BRU_R = [
    '.SS.KKKKK.SS....',
    '.SSKKKKKKKSS....',
    '.SSSSSSSSSSS....',
    '..SSKSSSKSS.....',
    '..SSSSSSSSS.....',
    '..BKKKKKKKKB....',
    '..BKKKKKKKKB....',
    '..BBKKKKKKBB....',
    '..BBBBBBBBBB....',
    '..BBBBBBBBBB....',
    '...BBBBBBBB.....',
    '...BBBBBBBB.....',
    '...BBBBBBBB.....',
    '...WWWWWWWWW....',
    '...WWWW.WWWW....',
    '...WWW...WWW....',
    '...WWW...WWW....',
    '..KKKK...KKKK...'
  ];
  const OLIVE = [
    '...KKKK...',
    '..KKKKKK..',
    '...SSSS...',
    '...SKSK...',
    '...SSSS...',
    '....SS....',
    '...RRRR...',
    '..SRRRRS..',
    '.S.RRRR.S.',
    '...RRRR...',
    '...KKKK...',
    '...KKKK...',
    '...K..K...',
    '...S..S...',
    '...S..S...',
    '...S..S...',
    '..KK..KK..'
  ];
  const OLIVE_W = OLIVE.slice(0, 12).concat(['...K..K...', '..S....S..', '..S....S..', '.S......S.', 'KK......KK']);
  const HAG = [
    '...PPPP...',
    '..PPPPPP..',
    '.PPGGGGPP.',
    '.PPGKGKPP.',
    '.PPGGGGGG.',
    '..PPGGGP..',
    '.PPPPPPPP.',
    'PPPPPPPPPG',
    'PPPPPPPP.G',
    '.PPPPPPP..',
    '.PPPPPPP..',
    '..PPPPP...',
    '..KK.KK...'
  ];
  const BIRD = ['.....KK.....', '....KRRK....', 'KK..KKKK..KK', '.KKKKKKKKKK.', '..KKKKKKKK..', '....KKKK....', '....Y..Y....'];
  const BIRD2 = ['............', '.....KK.....', '....KRRK....', '...KKKKKK...', 'KKKKKKKKKKKK', 'KK..KKKK..KK', '....Y..Y....'];

  ArcadeRegistry.register({
    id: 'popeye', title: 'Popeye', year: 1982, maker: 'Nintendo',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Arrows: walk / climb stairs \u00b7 Space: punch \u00b7 Enter: start',
    marquee: { bg: '#00186a', fg: '#ffe000', accent: '#ff3030' },
    create(api) {
      const W = 256, H = 224, WATER = 200;
      const F = [72, 112, 152, 190];
      const au = api.audio;
      const PAL = { W: '#ffffff', S: '#ffb880', K: '#101010', P: '#a06030', R: '#3060ff', B: '#2050d0' };
      const SP = {
        pop: mk(POP, PAL), popW: mk(POP_W, PAL), popP: mk(POP_P, PAL),
        popS: mk(POP, Object.assign({}, PAL, { S: '#ffe070', K: '#e02020' })), popSP: mk(POP_P, Object.assign({}, PAL, { S: '#ffe070', K: '#e02020' })),
        bru: mk(BRU, { K: '#181818', S: '#ffb880', B: '#3050e0', W: '#202060' }), bruW: mk(BRU_W, { K: '#181818', S: '#ffb880', B: '#3050e0', W: '#202060' }),
        bruR: mk(BRU_R, { K: '#181818', S: '#ffb880', B: '#3050e0', W: '#202060' }),
        olive: mk(OLIVE, { K: '#101010', S: '#ffb880', R: '#e02020' }), oliveW: mk(OLIVE_W, { K: '#101010', S: '#ffb880', R: '#e02020' }),
        hag: mk(HAG, { P: '#7020a0', G: '#80c060', K: '#000' }),
        bird: mk(BIRD, { K: '#403830', R: '#ff6060', Y: '#ffd000' }), bird2: mk(BIRD2, { K: '#403830', R: '#ff6060', Y: '#ffd000' }),
        heart: mk(['.RR.RR.', 'RrRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], { R: '#ff2050', r: '#ffc0d0' }),
        note: mk(['..NNN.', '..N.NN', '..N..N', '..N...', '..N...', 'NNN...', 'NNN...', '.N....'], { N: '#40e0ff' }),
        spinach: mk(['.GGGG.', 'GgGGgG', 'GGGGGG', 'YYYYYY', 'YGGGGY', 'YGGGGY', 'YYYYYY', 'GGGGGG'], { G: '#20a020', g: '#a0ff80', Y: '#ffd000' })
      };
      const snd = {
        punch() { au.noise(0.06, { vol: 0.15, freq: 1200 }); au.tone(160, 0.05, { type: 'square', vol: 0.08 }); },
        catch() { au.tone(1046, 0.05, { type: 'square', vol: 0.1 }); au.tone(1568, 0.1, { type: 'square', vol: 0.1, delay: 0.05 }); },
        drop() { au.tone(1760, 0.04, { type: 'sine', vol: 0.06 }); },
        splash() { au.noise(0.25, { vol: 0.12, freq: 1500, slideTo: 300 }); },
        sink() { au.tone(600, 0.5, { type: 'triangle', vol: 0.12, slideTo: 100 }); },
        die() { au.melody([[659, 0.12], [622, 0.12], [587, 0.12], [554, 0.12], [523, 0.4]], { type: 'square', vol: 0.13 }); },
        spinach() { au.melody([[523, 0.09], [523, 0.09], [523, 0.09], [440, 0.09], [523, 0.09], [0, 0.05], [587, 0.09], [523, 0.09], [494, 0.09], [523, 0.25]], { type: 'square', vol: 0.12 }); },
        ko() { au.noise(0.3, { vol: 0.25, freq: 900 }); au.tone(900, 0.4, { type: 'square', vol: 0.12, slideTo: 120 }); },
        start() { au.melody([[392, 0.12], [523, 0.12], [523, 0.12], [523, 0.12], [494, 0.12], [440, 0.12], [494, 0.12], [523, 0.3]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.2], [784, 0.1], [1046, 0.35]], { type: 'square', vol: 0.13 }); },
        throw() { au.tone(500, 0.12, { type: 'triangle', vol: 0.08, slideTo: 250 }); },
        bag() { au.noise(0.12, { vol: 0.2, freq: 400 }); au.tone(800, 0.3, { type: 'square', vol: 0.08, slideTo: 1600 }); },
        clang() { au.tone(1200, 0.3, { type: 'square', vol: 0.12 }); au.tone(1800, 0.3, { type: 'square', vol: 0.06 }); },
        step() { au.tone(220, 0.02, { type: 'square', vol: 0.03 }); },
        extra() { au.melody([[1319, 0.08], [1568, 0.08], [2093, 0.16]], { type: 'square', vol: 0.1 }); }
      };

      // stairs: {top, bot, xt, xb}
      const SCREENS = [
        {
          name: 'HEARTS', item: 'heart', quota: 24, bag: true, hag: false, bird: false,
          stairs: [{ top: 0, bot: 1, xt: 44, xb: 24 }, { top: 0, bot: 1, xt: 212, xb: 232 }, { top: 1, bot: 2, xt: 104, xb: 84 },
          { top: 1, bot: 2, xt: 152, xb: 172 }, { top: 2, bot: 3, xt: 40, xb: 60 }, { top: 2, bot: 3, xt: 216, xb: 196 }],
          spin: [{ x: 10, f: 1 }, { x: 246, f: 2 }], floorX: [[24, 232], [0, W], [0, W], [0, W]]
        },
        {
          name: 'NOTES', item: 'note', quota: 16, bag: false, hag: true, bird: false,
          stairs: [{ top: 0, bot: 1, xt: 120, xb: 100 }, { top: 0, bot: 1, xt: 136, xb: 156 }, { top: 1, bot: 2, xt: 36, xb: 16 },
          { top: 1, bot: 2, xt: 220, xb: 240 }, { top: 2, bot: 3, xt: 100, xb: 80 }, { top: 2, bot: 3, xt: 156, xb: 176 }],
          spin: [{ x: 246, f: 1 }, { x: 10, f: 2 }], floorX: [[40, 216], [0, W], [0, W], [0, W]]
        },
        {
          name: 'LETTERS', item: 'letter', quota: 12, bag: false, hag: true, bird: true,
          stairs: [{ top: 0, bot: 1, xt: 60, xb: 80 }, { top: 0, bot: 1, xt: 196, xb: 176 }, { top: 1, bot: 2, xt: 24, xb: 44 },
          { top: 1, bot: 2, xt: 232, xb: 212 }, { top: 2, bot: 3, xt: 116, xb: 96 }, { top: 2, bot: 3, xt: 140, xb: 160 }],
          spin: [{ x: 10, f: 2 }, { x: 246, f: 1 }], floorX: [[32, 224], [0, W], [0, W], [0, W]]
        }
      ];
      const LETTERS = 'HELP';

      const S = { mode: 'title', t: 0, score: 0, hi: api.getHiScore(30000), lives: 3, screen: 0, loop: 0, extra: false, got: 0 };
      let P, B, olive, items, bottles, skulls, pops, hag, bird, spin, bucket, bagUsed, dropT, power, coinFlash = 0, deathCause = '', bagSwing = 0;
      const scr = () => SCREENS[S.screen];
      const wrapX = x => ((x % W) + W) % W;
      const wdx = (a, b) => { let d = a - b; while (d > W / 2) d -= W; while (d < -W / 2) d += W; return d; };
      function addScore(n, x, y) {
        S.score += n;
        if (!S.extra && S.score >= 40000) { S.extra = true; S.lives++; snd.extra(); }
        if (S.score > S.hi) S.hi = S.score;
        if (x != null) pops.push({ x, y, s: String(n), t: 50 });
      }
      function resetActors() {
        P = { x: 128, f: 3, y: F[3], stair: null, st: 0, dir: 1, punch: 0, anim: 0, dead: false, dt: 0, inv: 60 };
        B = { x: 40, f: 0, y: F[0], stair: null, st: 0, dir: 1, mode: 'walk', t: 0, anim: 0, vy: 0, vx: 0, throwT: 200, jumpCD: 120 };
        bottles = []; skulls = []; bucket = null; power = 0;
        hag = { on: false, t: 400, side: 0, throwT: 90 };
        bird = { x: -20, y: 30, vx: 0, vy: 0, mode: 'off', t: 300 };
        items = items ? items.filter(i => i.st === 'fall') : [];
      }
      function startScreen() {
        items = []; pops = []; S.got = 0; bagUsed = false;
        olive = { x: 128, dir: 1, t: 0, pause: 0 };
        spin = { idx: 0, on: true, t: 0 };
        dropT = 90;
        resetActors();
        S.mode = 'intro'; S.t = 0; snd.start();
      }
      function startGame() { S.score = 0; S.lives = 3; S.screen = 0; S.loop = 0; S.extra = false; startScreen(); }
      function gameOver() { api.setHiScore(S.score); S.hi = Math.max(S.hi, api.getHiScore(0)); S.mode = 'gameover'; S.t = 0; }
      function lv() { return S.loop * 3 + S.screen; }

      // ---------- movement on floors/stairs ----------
      function stairAt(a, up) {
        for (const s of scr().stairs) {
          if (up && s.bot === a.f && Math.abs(wdx(a.x, s.xb)) < 5) return s;
          if (!up && s.top === a.f && Math.abs(wdx(a.x, s.xt)) < 5) return s;
        }
        return null;
      }
      function onStairMove(a, dt) {
        a.st = Math.max(0, Math.min(1, a.st + dt));
        const s = a.stair;
        a.x = s.xb + (s.xt - s.xb) * a.st; a.y = F[s.bot] + (F[s.top] - F[s.bot]) * a.st;
        if (a.st >= 1) { a.f = s.top; a.stair = null; a.y = F[a.f]; }
        else if (a.st <= 0) { a.f = s.bot; a.stair = null; a.y = F[a.f]; }
      }
      function clampFloor(a) {
        const r = scr().floorX[a.f];
        if (r[0] === 0 && r[1] === W) a.x = wrapX(a.x);
        else a.x = Math.max(r[0], Math.min(r[1], a.x));
      }

      function updPopeye() {
        const p = P;
        p.anim++;
        if (p.inv > 0) p.inv--;
        if (p.punch > 0) p.punch--;
        const sp = 1.05;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        if (p.stair) {
          const s = p.stair, upDir = s.xt > s.xb ? 1 : -1;
          let d = 0;
          if (U) d = 1; else if (D) d = -1; else if (R) d = upDir; else if (L) d = -upDir;
          if (d) { onStairMove(p, d / 38); if ((p.anim % 10) === 0) snd.step(); if (L || R) p.dir = L ? -1 : 1; }
        } else {
          let s = null;
          if (U) s = stairAt(p, true); else if (D) s = stairAt(p, false);
          if (s) { p.stair = s; p.st = U ? 0 : 1; p.x = U ? s.xb : s.xt; }
          else {
            if (L) { p.x -= sp; p.dir = -1; } else if (R) { p.x += sp; p.dir = 1; }
            if ((L || R) && (p.anim % 12) === 0) snd.step();
            clampFloor(p);
          }
        }
        if (api.pressed('Space') && p.punch === 0) { p.punch = 16; snd.punch(); doPunch(); }
      }
      function doPunch() {
        const p = P;
        const hx = p.x + p.dir * 12, hy = p.y - 10;
        const hit = (x, y, r) => Math.abs(wdx(x, hx)) < 9 + (r || 0) && Math.abs(y - hy) < 10 + (r || 0);
        for (const b of bottles) if (hit(b.x, b.y)) { b.dead = true; addScore(100, b.x, b.y - 8); }
        for (const s of skulls) if (hit(s.x, s.y)) { s.dead = true; addScore(100, s.x, s.y - 8); }
        if (bird.mode !== 'off' && hit(bird.x, bird.y)) { bird.mode = 'off'; bird.t = 700; addScore(1000, bird.x, bird.y); snd.ko(); }
        if (power > 0 && B.mode !== 'fly' && B.mode !== 'swim' && hit(B.x, B.y - 8, 4)) knockBrutus();
        if (scr().bag && !bagUsed && p.f === 0 && !p.stair && Math.abs(hx - 30) < 10) {
          bagUsed = true; bagSwing = 40; snd.bag();
          bucket = { x: wrapX(B.x + (B.stair ? 0 : B.dir * 28)), y: 0, vy: 0.5, on: false };
        }
      }
      function knockBrutus() {
        B.mode = 'fly'; B.vx = P.dir * 2; B.vy = -3.5; B.stair = null; B.t = 0;
        addScore(3000, B.x, B.y - 24); snd.ko();
        if (bucket && bucket.on) bucket = null;
      }

      // ---------- Brutus AI ----------
      function updBrutus() {
        const b = B;
        b.anim++;
        const spd = Math.min(1.15, 0.62 + lv() * 0.05);
        if (b.mode === 'fly') {
          b.x = Math.max(8, Math.min(W - 8, b.x + b.vx)); b.vy += 0.15; b.y += b.vy;
          if (b.y > WATER + 6) { b.mode = 'swim'; b.t = 0; snd.splash(); }
          return;
        }
        if (b.mode === 'swim') {
          b.t++; b.y = WATER + 6 + Math.sin(b.t * 0.1) * 1.5;
          if (b.t > 260) { b.mode = 'walk'; b.f = 0; b.y = F[0]; const r = scr().floorX[0]; b.x = Math.random() < 0.5 ? r[0] : r[1]; b.stair = null; }
          return;
        }
        if (b.mode === 'stun') { if (++b.t > 300) { b.mode = 'walk'; bucket = null; } return; }
        if (b.mode === 'jump') {
          b.vy += 0.18; b.y += b.vy;
          if (b.vy > 0 && b.y >= F[b.f + 1]) { b.f++; b.y = F[b.f]; b.mode = 'walk'; b.jumpCD = 100; au.noise(0.1, { vol: 0.15, freq: 300 }); }
          return;
        }
        if (b.mode === 'reach') {
          b.t++;
          if (b.t > 40) b.mode = 'walk';
          return;
        }
        if (b.mode === 'throw') {
          b.t++;
          if (b.t === 14) {
            const d = Math.sign(wdx(P.x, b.x)) || 1;
            bottles.push({ x: b.x + d * 8, y: b.y - 14, vx: d * (1.4 + lv() * 0.06), vy: -1.2, f: b.f, spin: 0 });
            snd.throw();
          }
          if (b.t > 28) b.mode = 'walk';
          return;
        }
        if (b.jumpCD > 0) b.jumpCD--;
        // walking / climbing
        if (b.stair) { onStairMove(b, (b.climbDir) / 46); return; }
        const pf = P.stair ? (P.y < (F[P.stair.top] + F[P.stair.bot]) / 2 ? P.stair.top : P.stair.bot) : P.f;
        const dx = wdx(P.x, b.x);
        if (power > 0) {
          // run away
          if (pf === b.f) { b.dir = dx > 0 ? -1 : 1; b.x += b.dir * spd * 0.9; clampFloor(b); return; }
        }
        if (!P.dead && power === 0) {
          if (pf === b.f - 1 && !P.stair && Math.abs(dx) < 14) { b.mode = 'reach'; b.t = 0; return; }
          if (pf > b.f && Math.abs(dx) < 16 && b.jumpCD === 0 && b.f < 3 && Math.random() < 0.05) { b.mode = 'jump'; b.vy = -2.2; return; }
          if (pf === b.f && Math.abs(dx) > 50 && --b.throwT <= 0) { b.throwT = Math.max(110, 260 - lv() * 15); b.mode = 'throw'; b.t = 0; return; }
        }
        let tx = P.x;
        if (pf !== b.f) {
          const up = pf < b.f;
          let best = null, bd = 1e9;
          for (const s of scr().stairs) {
            if (up ? s.bot !== b.f : s.top !== b.f) continue;
            const d = Math.abs(wdx(up ? s.xb : s.xt, b.x));
            if (d < bd) { bd = d; best = s; }
          }
          if (best) {
            tx = up ? best.xb : best.xt;
            if (bd < 1.5) { b.stair = best; b.st = up ? 0 : 1; b.climbDir = up ? 1 : -1; b.x = tx; return; }
          } else if (!up && b.jumpCD === 0) { b.mode = 'jump'; b.vy = -2.2; return; }
          if (!up && b.jumpCD === 0 && Math.random() < 0.004) { b.mode = 'jump'; b.vy = -2.2; return; }
        }
        const d = wdx(tx, b.x);
        if (Math.abs(d) > 1) { b.dir = Math.sign(d); b.x += b.dir * Math.min(spd, Math.abs(d)); }
        clampFloor(b);
      }

      // ---------- items ----------
      function dropItem() {
        const k = scr().item;
        const it = { x: olive.x, y: 44, t: 0, st: 'fall', kind: k, sink: 0, ph: Math.random() * 6, ch: '' };
        if (k === 'letter') it.ch = LETTERS[S.got % 4];
        items.push(it); snd.drop();
      }
      function updItems() {
        const fs = 0.3 + S.loop * 0.06 + S.screen * 0.02;
        for (const it of items) {
          it.t++;
          if (it.st === 'fall') {
            it.y += fs; it.x = wrapX(it.x + Math.sin(it.t * 0.03 + it.ph) * 0.5);
            if (it.y >= WATER + 4) { it.st = 'water'; it.sink = 0; snd.splash(); }
          } else if (it.st === 'water') {
            it.sink++; it.y = WATER + 4 + Math.sin(it.sink * 0.1);
            if (it.sink > 420) { it.dead = true; if (!P.dead) { snd.sink(); killPopeye(true); } }
          }
          if (!it.dead && !P.dead) {
            const dx = Math.abs(wdx(it.x, P.x));
            const ok = it.st === 'water' ? (P.f === 3 && !P.stair && dx < 12) : (dx < 10 && Math.abs(it.y - (P.y - 9)) < 12);
            if (ok) {
              it.dead = true; S.got++;
              const pts = it.st === 'water' ? 50 : P.y <= F[0] + 2 ? 500 : P.y <= F[1] + 2 ? 300 : P.y <= F[2] + 2 ? 100 : 50;
              addScore(pts * (it.kind === 'letter' ? 2 : 1), it.x, it.y - 10); snd.catch();
            }
          }
        }
        items = items.filter(i => !i.dead);
      }
      function killPopeye(force) {
        if (P.dead || (!force && (P.inv > 0 || power > 0))) return;
        deathCause = force ? 'sink' : 'hit'; P.dead = true; P.dt = 0; S.mode = 'dying'; S.t = 0; snd.die();
      }

      function updatePlay() {
        updPopeye();
        if (power > 0) { power--; if (power === 1) au.tone(300, 0.2, { type: 'square', vol: 0.08, slideTo: 150 }); }
        updBrutus();
        // Olive
        if (olive.pause > 0) olive.pause--;
        else {
          olive.x += olive.dir * 0.5; olive.t++;
          if (olive.x < 60 || olive.x > 196) olive.dir = -olive.dir;
          if (Math.random() < 0.004) olive.pause = 60;
        }
        const active = items.length;
        if (--dropT <= 0 && S.got + active < scr().quota) {
          if (active < Math.min(4, 2 + S.loop + (S.screen > 1 ? 1 : 0))) { dropItem(); olive.pause = 20; }
          dropT = Math.max(80, 200 - lv() * 10 - Math.random() * 40);
        }
        updItems();
        // bottles
        for (const b of bottles) {
          b.x += b.vx; b.vy = Math.min(2, b.vy + 0.08); b.y += b.vy; b.spin++;
          if (b.y > F[b.f] - 4) { b.y = F[b.f] - 4; b.vy = -Math.abs(b.vy) * 0.5; }
          if (b.x < -10 || b.x > W + 10) b.dead = true;
          if (!P.dead && Math.abs(b.x - P.x) < 6 && Math.abs(b.y - (P.y - 8)) < 9) killPopeye();
        }
        bottles = bottles.filter(b => !b.dead);
        // Sea Hag
        if (scr().hag || S.loop > 0) {
          if (!hag.on) { if (--hag.t <= 0) { hag.on = true; hag.t = 600; hag.side = Math.random() < 0.5 ? 0 : 1; hag.throwT = 60; au.tone(150, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 300 }); } }
          else {
            if (--hag.throwT <= 0) {
              hag.throwT = Math.max(80, 180 - lv() * 10);
              const hx = hag.side ? W - 10 : 10, hy = F[0] - 10;
              const dx = P.x - hx, dy = (P.y - 8) - hy, d = Math.hypot(dx, dy) || 1, v = 1.0 + S.loop * 0.15;
              skulls.push({ x: hx, y: hy, vx: dx / d * v, vy: dy / d * v }); snd.throw();
            }
            if (--hag.t <= 0) { hag.on = false; hag.t = 500; }
          }
        }
        for (const s of skulls) {
          s.x += s.vx; s.y += s.vy;
          if (s.x < -10 || s.x > W + 10 || s.y > H || s.y < 0) s.dead = true;
          if (!P.dead && Math.abs(s.x - P.x) < 6 && Math.abs(s.y - (P.y - 8)) < 9) killPopeye();
        }
        skulls = skulls.filter(s => !s.dead);
        // vulture
        if (scr().bird) {
          if (bird.mode === 'off') { if (--bird.t <= 0) { bird.mode = 'fly'; bird.x = -10; bird.y = 30; bird.vx = 1; bird.vy = 0; bird.t = 200; } }
          else {
            bird.t--;
            if (bird.mode === 'fly') {
              bird.x += bird.vx; bird.y = 30 + Math.sin(bird.x * 0.05) * 6;
              if (bird.x > W - 10 || bird.x < 10) bird.vx = -bird.vx;
              if (bird.t <= 0) { bird.mode = 'dive'; bird.t = 160; }
            } else {
              const dx = P.x - bird.x, dy = (P.y - 10) - bird.y, d = Math.hypot(dx, dy) || 1;
              bird.vx += (dx / d * 1.3 - bird.vx) * 0.05; bird.vy += (dy / d * 1.3 - bird.vy) * 0.05;
              bird.x += bird.vx; bird.y += bird.vy;
              if (bird.t <= 0) { bird.mode = 'fly'; bird.t = 240; bird.vx = bird.vx > 0 ? 1 : -1; }
            }
            if (!P.dead && Math.abs(bird.x - P.x) < 8 && Math.abs(bird.y - (P.y - 8)) < 9) killPopeye();
          }
        }
        // bucket from the punching bag
        if (bucket) {
          if (bucket.on) { bucket.x = B.x; bucket.y = B.y - 20; }
          else {
            bucket.vy = Math.min(2.5, bucket.vy + 0.06); bucket.y += bucket.vy;
            if (B.mode !== 'fly' && B.mode !== 'swim' && Math.abs(bucket.x - B.x) < 10 && Math.abs(bucket.y - (B.y - 18)) < 6) {
              bucket.on = true; B.mode = 'stun'; B.t = 0; addScore(3000, B.x, B.y - 30); snd.clang();
            }
            if (bucket && bucket.y > WATER + 6) { bucket = null; snd.splash(); }
          }
        }
        if (bagSwing > 0) bagSwing--;
        // spinach
        if (spin.on) {
          const s = scr().spin[spin.idx];
          if (!P.stair && P.f === s.f && Math.abs(wdx(P.x, s.x)) < 10) {
            spin.on = false; spin.t = 1200; power = 540; snd.spinach(); addScore(200, s.x, F[s.f] - 20);
          }
        } else if (--spin.t <= 0) { spin.on = true; spin.idx ^= 1; }
        // Popeye vs Brutus
        if (!P.dead && B.mode !== 'fly' && B.mode !== 'swim') {
          const dx = Math.abs(wdx(B.x, P.x)), dy = Math.abs(B.y - P.y);
          if (dx < 11 && dy < 12) { if (power > 0) knockBrutus(); else if (B.mode !== 'stun') killPopeye(); }
          if (B.mode === 'reach' && B.t > 12 && B.t < 34 && dx < 13 && P.y < B.y - 20 && P.y > B.y - 50) killPopeye();
        }
        for (const p of pops) p.t--;
        pops = pops.filter(p => p.t > 0);
        if (S.got >= scr().quota) { S.mode = 'clear'; S.t = 0; snd.clear(); items = []; bottles = []; skulls = []; }
      }

      function update() {
        S.t++;
        if (coinFlash > 0) coinFlash--;
        if (S.mode === 'title') {
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; au.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          return;
        }
        if (S.mode === 'gameover') { if (S.t > 240 || (S.t > 60 && api.anyPressed('Enter'))) { S.mode = 'title'; S.t = 0; } return; }
        if (S.mode === 'intro') { if (S.t > 150) { S.mode = 'play'; S.t = 0; } return; }
        if (S.mode === 'clear') {
          if (S.t === 60) addScore(1000 * (S.loop + 1));
          if (S.t > 220) {
            S.screen++;
            if (S.screen >= SCREENS.length) { S.screen = 0; S.loop++; }
            startScreen();
          }
          return;
        }
        if (S.mode === 'dying') {
          P.dt++;
          if (S.t > 160) {
            S.lives--;
            if (S.lives <= 0) {
              S.mode = 'wait';
              const cont = () => { S.lives = 3; resetActors(); S.mode = 'intro'; S.t = 90; };
              if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver();
            } else { resetActors(); S.mode = 'intro'; S.t = 90; }
          }
          return;
        }
        if (S.mode === 'wait') return;
        updatePlay();
      }

      // ---------- render ----------
      function drawScenery(ctx) {
        const k = S.screen;
        ctx.fillStyle = ['#000830', '#100028', '#001830'][k]; ctx.fillRect(0, 16, W, WATER - 16);
        // stars / background buildings
        ctx.fillStyle = '#304080';
        for (let i = 0; i < 24; i++) ctx.fillRect((i * 53 + k * 17) % W, 20 + (i * 37) % 60, 1, 1);
        if (k === 0) {
          // Olive's house
          ctx.fillStyle = '#c04020'; ctx.fillRect(100, 18, 56, 4);
          ctx.fillStyle = '#e8d090'; ctx.fillRect(104, 22, 48, 14);
          ctx.fillStyle = '#3050c0'; ctx.fillRect(110, 25, 8, 7); ctx.fillRect(138, 25, 8, 7);
          ctx.fillStyle = '#804020'; ctx.fillRect(124, 26, 8, 10);
          // buildings
          ctx.fillStyle = '#203070'; ctx.fillRect(0, 30, 22, 170); ctx.fillRect(234, 30, 22, 170);
          ctx.fillStyle = '#ffe080'; for (let y = 40; y < 180; y += 18) { ctx.fillRect(6, y, 4, 5); ctx.fillRect(244, y, 4, 5); }
          // punching bag
          ctx.fillStyle = '#806040'; ctx.fillRect(22, F[0] - 40, 16, 2); ctx.fillRect(22, F[0] - 40, 2, 40);
          const sw = bagSwing > 0 ? Math.round(Math.sin(bagSwing * 0.4) * 4) : 0;
          ctx.fillStyle = '#c0c0c0'; ctx.fillRect(32 + sw / 2, F[0] - 38, 1, 6);
          ctx.fillStyle = bagUsed ? '#804020' : '#d06030'; ctx.fillRect(29 + sw, F[0] - 32, 7, 16);
          ctx.fillStyle = '#ffa060'; ctx.fillRect(30 + sw, F[0] - 31, 2, 14);
          if (!bagUsed) { ctx.fillStyle = '#909090'; ctx.fillRect(28, 20, 10, 7); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(28, 20, 10, 2); }
        } else if (k === 1) {
          ctx.fillStyle = '#301850';
          for (let i = 0; i < 6; i++) ctx.fillRect(i * 44, 40 + (i % 3) * 12, 36, 160);
          ctx.fillStyle = '#a080ff'; for (let i = 0; i < 6; i++) for (let y = 50 + (i % 3) * 12; y < 190; y += 16) ctx.fillRect(i * 44 + 8, y, 5, 6), ctx.fillRect(i * 44 + 22, y, 5, 6);
          ctx.fillStyle = '#e8d090'; ctx.fillRect(96, 22, 64, 14);
          ctx.fillStyle = '#c04020'; ctx.fillRect(92, 18, 72, 4);
        } else {
          // ship
          ctx.fillStyle = '#704020'; ctx.fillRect(126, 18, 4, 60);
          ctx.fillStyle = '#e0e0e0';
          ctx.beginPath(); ctx.moveTo(130, 22); ctx.lineTo(176, 60); ctx.lineTo(130, 60); ctx.fill();
          ctx.beginPath(); ctx.moveTo(126, 26); ctx.lineTo(84, 60); ctx.lineTo(126, 60); ctx.fill();
          ctx.fillStyle = '#5a2c10';
          ctx.beginPath(); ctx.moveTo(10, F[1]); ctx.lineTo(246, F[1]); ctx.lineTo(226, WATER); ctx.lineTo(30, WATER); ctx.fill();
          ctx.fillStyle = '#7a4420'; for (let y = F[1] + 6; y < WATER; y += 10) ctx.fillRect(20, y, 216, 1);
          ctx.fillStyle = '#ffd060'; for (let x = 50; x < 220; x += 30) { ctx.beginPath(); ctx.arc(x, F[2] + 18, 3, 0, Math.PI * 2); ctx.fill(); }
        }
        // Olive's balcony
        ctx.fillStyle = '#c08040'; ctx.fillRect(56, 44, 144, 3);
        ctx.fillStyle = '#805020'; for (let x = 58; x < 200; x += 8) ctx.fillRect(x, 40, 1, 4);
        ctx.fillRect(56, 39, 144, 1);
        // floors
        const fc = [['#c06020', '#ffa050'], ['#c040a0', '#ff90e0'], ['#a07040', '#e0b080']][k];
        for (let f = 0; f < 4; f++) {
          const r = scr().floorX[f], y = F[f];
          ctx.fillStyle = fc[0]; ctx.fillRect(r[0], y, r[1] - r[0], 4);
          ctx.fillStyle = fc[1]; ctx.fillRect(r[0], y, r[1] - r[0], 1);
          ctx.fillStyle = '#402010'; for (let x = r[0] + 4; x < r[1]; x += 16) ctx.fillRect(x, y + 4, 2, 3);
        }
        // stairs
        for (const s of scr().stairs) {
          const n = 8;
          for (let i = 0; i <= n; i++) {
            const t = i / n, x = s.xb + (s.xt - s.xb) * t, y = F[s.bot] + (F[s.top] - F[s.bot]) * t;
            ctx.fillStyle = fc[1]; ctx.fillRect(x - 5, y, 10, 2);
          }
          ctx.fillStyle = fc[0];
          for (let i = 0; i < 20; i++) {
            const t = i / 20;
            ctx.fillRect(s.xb + (s.xt - s.xb) * t - 6, F[s.bot] + (F[s.top] - F[s.bot]) * t + 2, 1, 2);
            ctx.fillRect(s.xb + (s.xt - s.xb) * t + 5, F[s.bot] + (F[s.top] - F[s.bot]) * t + 2, 1, 2);
          }
        }
        // water
        ctx.fillStyle = '#0040c0'; ctx.fillRect(0, WATER, W, H - WATER);
        ctx.fillStyle = '#60a0ff';
        for (let x = 0; x < W; x += 16) { const o = (x + (S.t >> 2)) % 16; ctx.fillRect(x + o, WATER + 2, 6, 1); ctx.fillRect((x + 8 - o + W) % W, WATER + 10, 5, 1); }
      }
      function drawItem(ctx, it) {
        if (it.st === 'water' && it.sink > 300 && (it.sink >> 2) & 1) return;
        const x = it.x, y = it.y;
        if (it.kind === 'heart') blit(ctx, SP.heart, x - 3, y - 3);
        else if (it.kind === 'note') blit(ctx, SP.note, x - 3, y - 4);
        else {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 5, 9, 10);
          text(ctx, it.ch, x - 2, y - 3, '#e02020');
        }
      }
      function drawPopeye(ctx) {
        const p = P;
        if (p.inv > 0 && (p.inv >> 2) & 1 && !p.dead) return;
        if (p.dead) {
          const fall = Math.min(1, p.dt / 30);
          ctx.save(); ctx.translate(p.x, p.y - 4); ctx.rotate(fall * Math.PI / 2 * (p.dir || 1));
          ctx.drawImage(SP.pop, -6, -12); ctx.restore();
          if (p.dt > 40 && (p.dt >> 3) & 1) for (let i = 0; i < 3; i++) { ctx.fillStyle = '#ffd000'; ctx.fillRect(p.x - 8 + i * 7, p.y - 22 - (i & 1) * 3, 2, 2); }
          return;
        }
        const pw = power > 0 && (power > 90 || (power >> 2) & 1);
        let img = p.punch > 6 ? (pw ? SP.popSP : SP.popP) : (pw ? SP.popS : ((api.key('ArrowLeft') || api.key('ArrowRight')) && (p.anim >> 3) & 1 ? SP.popW : SP.pop));
        blit(ctx, img, p.x - 6, p.y - 16, p.dir < 0);
        if (p.punch > 6) { ctx.fillStyle = pw ? '#ffe070' : '#ffb880'; ctx.fillRect(p.x + p.dir * 9 - (p.dir < 0 ? 4 : 0), p.y - 10, 4, 4); }
      }
      function drawBrutus(ctx) {
        const b = B;
        let img = b.mode === 'reach' ? SP.bruR : ((b.anim >> 3) & 1 && b.mode === 'walk' ? SP.bruW : SP.bru);
        if (b.mode === 'swim') {
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, WATER + 2); ctx.clip();
          blit(ctx, SP.bru, b.x - 8, b.y - 12, b.dir < 0); ctx.restore();
          return;
        }
        if (b.mode === 'fly') {
          ctx.save(); ctx.translate(b.x, b.y - 9); ctx.rotate(b.y * 0.2); ctx.drawImage(SP.bru, -8, -9); ctx.restore();
          return;
        }
        blit(ctx, img, b.x - 8, b.y - 18, b.dir < 0);
        if (b.x < 8) blit(ctx, img, b.x - 8 + W, b.y - 18, b.dir < 0);
        if (b.x > W - 8) blit(ctx, img, b.x - 8 - W, b.y - 18, b.dir < 0);
        if (b.mode === 'stun' && (b.t >> 3) & 1) { ctx.fillStyle = '#ffd000'; ctx.fillRect(b.x - 10, b.y - 26, 2, 2); ctx.fillRect(b.x + 8, b.y - 26, 2, 2); }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 16);
        text(ctx, '1UP', 8, 1, '#ff4040'); text(ctx, String(S.score).padStart(6, '0'), 8, 9, '#fff');
        text(ctx, 'HI-SCORE', W / 2, 1, '#ff4040', 1, 'center'); text(ctx, String(S.hi).padStart(6, '0'), W / 2, 9, '#fff', 1, 'center');
        if (S.mode !== 'title') {
          const sc = scr();
          text(ctx, sc.name, W - 8, 1, '#ffe000', 1, 'right');
          text(ctx, String(S.got).padStart(2, '0') + '/' + sc.quota, W - 8, 9, '#fff', 1, 'right');
          for (let i = 0; i < Math.min(5, S.lives - 1); i++) { ctx.fillStyle = '#fff'; ctx.fillRect(176 - i * 8, 3, 6, 3); ctx.fillStyle = '#ffb880'; ctx.fillRect(176 - i * 8, 6, 6, 4); }
          if (power > 0) { ctx.fillStyle = '#20a020'; ctx.fillRect(60, 12, Math.round(power / 540 * 40), 3); }
        }
      }
      function drawField(ctx) {
        drawScenery(ctx);
        // Olive
        blit(ctx, (olive.t >> 4) & 1 && olive.pause === 0 ? SP.oliveW : SP.olive, olive.x - 5, 44 - 17, olive.dir < 0);
        if (S.mode === 'clear' && (S.t >> 3) & 1) blit(ctx, SP.heart, olive.x - 3, 16);
        // spinach
        if (spin.on) { const s = scr().spin[spin.idx]; blit(ctx, SP.spinach, s.x - 3, F[s.f] - 8); }
        // Sea Hag
        if (hag.on) blit(ctx, SP.hag, hag.side ? W - 12 : 2, F[0] - 14, !hag.side);
        for (const it of items) drawItem(ctx, it);
        drawBrutus(ctx);
        drawPopeye(ctx);
        if (bucket) { ctx.fillStyle = '#a0a0a0'; ctx.fillRect(bucket.x - 5, bucket.y - 4, 10, 8); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(bucket.x - 6, bucket.y - 4, 12, 2); }
        for (const b of bottles) {
          ctx.fillStyle = '#40c040';
          if ((b.spin >> 2) & 1) ctx.fillRect(b.x - 4, b.y - 1, 8, 3); else ctx.fillRect(b.x - 1, b.y - 4, 3, 8);
          ctx.fillStyle = '#c0ffc0'; ctx.fillRect(b.x, b.y, 1, 1);
        }
        for (const s of skulls) {
          ctx.fillStyle = '#f0f0f0'; ctx.fillRect(s.x - 3, s.y - 3, 7, 5); ctx.fillRect(s.x - 2, s.y + 2, 5, 2);
          ctx.fillStyle = '#000'; ctx.fillRect(s.x - 2, s.y - 1, 2, 2); ctx.fillRect(s.x + 1, s.y - 1, 2, 2);
        }
        if (bird.mode !== 'off') blit(ctx, (S.t >> 3) & 1 ? SP.bird : SP.bird2, bird.x - 6, bird.y - 4);
        for (const p of pops) text(ctx, p.s, p.x, p.y - (50 - p.t) * 0.3, '#fff', 1, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#00186a'; ctx.fillRect(0, 16, W, H - 16);
        text(ctx, 'POPEYE', W / 2 + 3, 32 + 3, '#000', 4, 'center');
        text(ctx, 'POPEYE', W / 2, 32, '#ffe000', 4, 'center');
        blit(ctx, SP.pop, 60, 76); blit(ctx, SP.olive, 122, 75); blit(ctx, SP.bru, 180, 74, true);
        if ((S.t >> 4) & 1) blit(ctx, SP.heart, 100, 70);
        text(ctx, 'CATCH OLIVE\'S HEARTS, NOTES', W / 2, 104, '#fff', 1, 'center');
        text(ctx, 'AND LETTERS BEFORE THEY SINK', W / 2, 114, '#fff', 1, 'center');
        blit(ctx, SP.spinach, 50, 128); text(ctx, 'SPINACH - PUNCH BRUTUS 3000', 62, 129, '#80ff80');
        text(ctx, 'BOTTLE OR SKULL 100', 62, 141, '#ffc080');
        text(ctx, 'BAG + BUCKET ON BRUTUS 3000', 62, 153, '#ffc080');
        const blink = (S.t % 60) < 40;
        if (coinFlash > 0) { if ((coinFlash >> 3) & 1) text(ctx, 'INSERT COIN', W / 2, 172, '#ff4040', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 172, '#40e8ff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 172, '#40e8ff', 1, 'center');
        text(ctx, 'EXTRA POPEYE AT 40000', W / 2, 186, '#fff', 1, 'center');
        text(ctx, '\u00a9 1982 NINTENDO', W / 2, 198, '#fff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 212, '#aaa', 1, 'center');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (S.mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        drawField(ctx);
        drawHUD(ctx);
        if (S.mode === 'intro') {
          ctx.fillStyle = '#000'; ctx.fillRect(64, 92, 128, 26);
          text(ctx, 'ROUND ' + (lv() + 1), W / 2, 96, '#fff', 1, 'center');
          text(ctx, 'CATCH ' + scr().quota + ' ' + scr().name, W / 2, 107, '#ffe000', 1, 'center');
        }
        if (S.mode === 'dying' && deathCause === 'sink' && S.t > 30) text(ctx, 'IT SANK!', W / 2, 100, '#ff4040', 1, 'center');
        if (S.mode === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(56, 92, 144, 26);
          text(ctx, 'WELL BLOW ME DOWN!', W / 2, 96, '#ffe000', 1, 'center');
          if (S.t > 60) text(ctx, 'BONUS ' + 1000 * (S.loop + 1), W / 2, 107, '#fff', 1, 'center');
        }
        if (S.mode === 'gameover') { ctx.fillStyle = '#000'; ctx.fillRect(72, 92, 112, 26); text(ctx, 'GAME OVER', W / 2, 98, '#fff', 2, 'center'); }
      }
      olive = { x: 128, dir: 1, t: 0, pause: 0 }; spin = { idx: 0, on: false, t: 0 }; pops = []; resetActors();
      return { update, render, destroy() { } };
    }
  });
})();
