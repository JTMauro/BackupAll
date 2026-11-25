// Mario Bros. (Nintendo, 1983) \u2014 from-scratch recreation for the Game Room.
// Bump the platforms from below to flip Shellcreepers, Sidesteppers and Fighter Flies, then kick them off.
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
    '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 31, 0, 0, 0],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '/': [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0],
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14], 'x': [0, 17, 10, 4, 10, 17, 0]
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
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][i]; if (ch === '.' || !pal[ch]) continue;
      x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1);
    }
    return c;
  }
  function blit(ctx, img, x, y, fx, fy) {
    x = Math.round(x); y = Math.round(y);
    if (!fx && !fy) { ctx.drawImage(img, x, y); return; }
    ctx.save(); ctx.translate(x + (fx ? img.width : 0), y + (fy ? img.height : 0)); ctx.scale(fx ? -1 : 1, fy ? -1 : 1);
    ctx.drawImage(img, 0, 0); ctx.restore();
  }

  // ---------------- sprites ----------------
  const MARIO_TOP = [
    '...RRRRR....',
    '..RRRRRRRRR.',
    '..KKKSSKS...',
    '.KSKSSSKSSS.',
    '.KSKKSSSKSSS',
    '.KKSSSSKKKK.',
    '...SSSSSSS..',
    '..RRBRRR....',
    '.RRRBRRBRRR.',
    'RRRRBBBBRRRR',
    'SSRBYBBYBRSS',
    'SSSBBBBBBSSS'
  ];
  const MARIO_LEGS = {
    stand: ['SSBBBBBBBBSS', '..BBB..BBB..', '.KKK....KKK.', 'KKKK....KKKK'],
    walkA: ['..BBBBBBBB..', '...BBB.BBB..', '..KKK..KKKK.', '..KKKK......'],
    walkB: ['..BBBBBBB...', '..BBBBBBB...', '...KKKKK....', '...KKKK.....'],
    jump: ['SSBBBBBBBBS.', '.BBBB..BBBB.', 'KKKK.....KK.', 'KKK.........']
  };
  const MARIO_PAL = { R: '#f03818', S: '#ffb070', K: '#783800', B: '#2848f0', Y: '#ffd800' };
  const CREEPER = [
    '.....GGGGG......',
    '....GgGgGgG.....',
    '...GGGGGGGGG.SS.',
    '..GgGgGgGgGgSSSS',
    '..GGGGGGGGGGSEKS',
    '.GgGgGgGgGgGSSSS',
    '.WWWWWWWWWWWWSS.',
    '..SSS....SSS....',
    '.SSS....SSS.....',
    '.SS......SS.....'
  ];
  const CREEPER_B = [
    '.....GGGGG......',
    '....GgGgGgG.....',
    '...GGGGGGGGG.SS.',
    '..GgGgGgGgGgSSSS',
    '..GGGGGGGGGGSEKS',
    '.GgGgGgGgGgGSSSS',
    '.WWWWWWWWWWWWSS.',
    '...SSS...SSS....',
    '...SSS...SSS....',
    '....SS....SS....'
  ];
  const CRAB = [
    '..CC........CC..',
    '.CccC......CccC.',
    '.CC.C......C.CC.',
    '..CCC.W..W.CCC..',
    '....CCKCCKCC....',
    '...CCCCCCCCCC...',
    '..CcCCCCCCCCcC..',
    '..CC.CcCCcC.CC..',
    '.C..C......C..C.',
    'C...C......C...C'
  ];
  const CRAB_B = [
    '.CC..........CC.',
    'CccC........CccC',
    'CC.C........C.CC',
    '..CCC.W..W.CCC..',
    '....CCKCCKCC....',
    '...CCCCCCCCCC...',
    '..CcCCCCCCCCcC..',
    '..CC.CcCCcC.CC..',
    '..C.C......C.C..',
    '..C..C....C..C..'
  ];
  const FLY = [
    '.WW........WW...',
    'WWWW......WWWW..',
    'WWWWW....WWWWW..',
    '.WWWWW..WWWWW...',
    '....FFKKFF......',
    '...FFEFFEFF.....',
    '...FFFFFFFF.....',
    '....FfFFfF......',
    '...F..FF..F.....',
    '..F...F....F....'
  ];
  const FLY_B = [
    '................',
    '................',
    'WWWWWW..WWWWWW..',
    'WWWWWWWWWWWWWW..',
    '.WWWFFKKFFWWW...',
    '...FFEFFEFF.....',
    '...FFFFFFFF.....',
    '....FfFFfF......',
    '....F.FF.F......',
    '....F.F..F......'
  ];
  const ICE = [
    '....IIII....',
    '..IIiiiiII..',
    '.IiiiiiiiiI.',
    'IiiKiiiiKiiI',
    'IiiKiiiiKiiI',
    'IiiiiiiiiiiI',
    'IiiKKKKKKiiI',
    '.IiiiiiiiiI.',
    'I.I.I..I.I.I',
    '.I.I.II.I.I.'
  ];
  const COIN = [
    '..YYYY..',
    '.YyyyyY.',
    'YyYYYYyY',
    'YyYyyYyY',
    'YyYyyYyY',
    'YyYyyYyY',
    'YyYyyYyY',
    'YyYYYYyY',
    '.YyyyyY.',
    '..YYYY..'
  ];
  const ENEMY_PALS = {
    creeper: [{ G: '#20b818', g: '#a8f080', S: '#ffb070', E: '#ffffff', K: '#000', W: '#f8f8f8' },
    { G: '#2050f0', g: '#90b8ff', S: '#ffb070', E: '#ffffff', K: '#000', W: '#f8f8f8' },
    { G: '#e82010', g: '#ffa080', S: '#ffb070', E: '#ffffff', K: '#000', W: '#f8f8f8' }],
    crab: [{ C: '#f03018', c: '#ffa070', W: '#fff', K: '#000' }, { C: '#20b818', c: '#b0ff90', W: '#fff', K: '#000' },
    { C: '#2050f0', c: '#a0c0ff', W: '#fff', K: '#000' }, { C: '#f8a000', c: '#ffe080', W: '#fff', K: '#000' }],
    fly: [{ W: '#e8e8ff', F: '#20a8f0', f: '#106090', E: '#fff', K: '#000' }, { W: '#e8e8ff', F: '#20c040', f: '#106020', E: '#fff', K: '#000' },
    { W: '#e8e8ff', F: '#f04020', f: '#902010', E: '#fff', K: '#000' }]
  };

  ArcadeRegistry.register({
    id: 'mariobros', title: 'Mario Bros.', year: 1983, maker: 'Nintendo',
    width: 256, height: 224, vector: false, pointer: false,
    controls: 'Arrows: run \u00b7 Space: jump (bump platforms from below, then touch flipped foes to kick) \u00b7 Enter: start',
    marquee: { bg: '#000', fg: '#f03818', accent: '#2848f0' },
    create(api) {
      const W = 256, H = 224, FLOOR = 200;
      const au = api.audio;
      // sprite cache
      const SPR = {};
      function mario(f) { return SPR['m' + f] || (SPR['m' + f] = mk(MARIO_TOP.concat(MARIO_LEGS[f]), MARIO_PAL)); }
      function esprite(type, lvl, frame) {
        const k = type + lvl + frame;
        if (SPR[k]) return SPR[k];
        const rows = type === 'creeper' ? (frame ? CREEPER_B : CREEPER) : type === 'crab' ? (frame ? CRAB_B : CRAB) : (frame ? FLY_B : FLY);
        const pals = ENEMY_PALS[type];
        return (SPR[k] = mk(rows, pals[Math.min(pals.length - 1, lvl)]));
      }
      const iceSpr = mk(ICE, { I: '#4080ff', i: '#c8f0ff', K: '#102060' });
      const coinSpr = mk(COIN, { Y: '#b07000', y: '#ffd800' });
      const coinSpr2 = mk(['.YY.', 'YyyY', 'YyyY', 'YyyY', 'YyyY', 'YyyY', 'YyyY', 'YyyY', 'YyyY', '.YY.'], { Y: '#b07000', y: '#ffd800' });

      const snd = {
        jump() { au.tone(392, 0.16, { type: 'square', vol: 0.09, slideTo: 880 }); },
        bump() { au.tone(110, 0.07, { type: 'square', vol: 0.16 }); au.noise(0.06, { vol: 0.12, freq: 700 }); },
        flip() { au.tone(1046, 0.05, { type: 'square', vol: 0.1 }); au.tone(784, 0.07, { type: 'square', vol: 0.1, delay: 0.05 }); },
        kick() { au.tone(1400, 0.22, { type: 'square', vol: 0.12, slideTo: 200 }); },
        coin() { au.tone(988, 0.06, { type: 'square', vol: 0.12 }); au.tone(1319, 0.25, { type: 'square', vol: 0.12, delay: 0.06 }); },
        pow() { au.noise(0.5, { vol: 0.3, freq: 500, slideTo: 60 }); au.tone(70, 0.45, { type: 'triangle', vol: 0.25, slideTo: 35 }); },
        step() { au.tone(150, 0.02, { type: 'square', vol: 0.04 }); },
        die() { au.melody([[784, 0.1], [698, 0.1], [659, 0.1], [587, 0.1], [523, 0.12], [392, 0.12], [262, 0.3]], { type: 'square', vol: 0.13 }); },
        start() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.1], [0, 0.05], [784, 0.08], [1046, 0.25]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[659, 0.08], [784, 0.08], [988, 0.08], [1319, 0.08], [1175, 0.08], [1319, 0.3]], { type: 'square', vol: 0.12 }); },
        pipe() { au.tone(200, 0.15, { type: 'triangle', vol: 0.1, slideTo: 80 }); },
        extra() { au.melody([[1319, 0.08], [1568, 0.08], [2637, 0.08], [2093, 0.08], [2349, 0.08], [3136, 0.15]], { type: 'square', vol: 0.1 }); },
        fire() { au.noise(0.2, { vol: 0.12, freq: 3000, type: 'bandpass' }); },
        freeze() { au.tone(2400, 0.3, { type: 'sine', vol: 0.1, slideTo: 1200 }); }
      };

      // ---------------- level geometry ----------------
      function mkPlats() {
        return [
          { x0: 0, x1: W, y: FLOOR, h: 24, floor: true },
          { x0: 0, x1: 104, y: 152, h: 8 }, { x0: 152, x1: W, y: 152, h: 8 },
          { x0: 0, x1: 40, y: 104, h: 8 }, { x0: 72, x1: 184, y: 104, h: 8 }, { x0: 216, x1: W, y: 104, h: 8 },
          { x0: 0, x1: 104, y: 56, h: 8 }, { x0: 152, x1: W, y: 56, h: 8 }
        ];
      }
      const POWB = { x0: 116, x1: 140, y: 160, h: 16, pow: true };
      const RESP = { x0: 116, x1: 140, y: 40, h: 4, resp: true };
      const wrapX = x => ((x % W) + W) % W;
      const wdx = (a, b) => { let d = a - b; while (d > W / 2) d -= W; while (d < -W / 2) d += W; return d; };
      function on(p, x) { if (p.floor) return true; const m = wrapX(x); return m >= p.x0 && m < p.x1; }
      function landOn(x, y0, y1, list) {
        let best = null;
        for (const p of list) if (y0 <= p.y + 0.01 && y1 >= p.y && on(p, x) && (!best || p.y < best.y)) best = p;
        return best;
      }

      // ---------------- state ----------------
      const S = { mode: 'title', t: 0, score: 0, hi: api.getHiScore(20000), lives: 3, phase: 1, extra: false, bonusCount: 0, attract: 0 };
      let plats = mkPlats(), M = null, enemies = [], coins = [], fires = [], bumps = [], pops = [];
      let queue = [], spawnT = 0, pipeSide = 0, coinSide = 1, phaseT = 0, shake = 0, powHits = 3, bonusTime = 0, bonusMsg = '', isBonus = false;
      let iceT = 0, redT = 0, greenT = 0, lastCreditCount = api.credits, coinFlash = 0;

      function speedMul() { return Math.min(1.75, 1 + (S.phase - 1) * 0.055); }
      function flipTime() { return Math.max(210, 470 - S.phase * 16); }
      function phaseDef(n) {
        if (n % 5 === 3) return null; // bonus
        const fixed = { 1: 'CCC', 2: 'CCCCC', 4: 'SSSS', 5: 'CSCSC', 6: 'FFFF', 7: 'FSCFSC' };
        if (fixed[n]) return fixed[n].split('');
        const k = Math.min(9, 5 + (n >> 2)), out = [];
        for (let i = 0; i < k; i++) out.push('CSF'[(i + n) % 3]);
        return out;
      }
      function addScore(n, x, y) {
        S.score += n;
        if (!S.extra && S.score >= 20000) { S.extra = true; S.lives++; snd.extra(); }
        if (S.score > S.hi) S.hi = S.score;
        if (x != null) pops.push({ x, y, s: String(n), t: 50 });
      }

      function newMario() {
        M = { x: 100, y: FLOOR, vx: 0, vy: 0, dir: 1, ground: plats[0], anim: 0, dead: false, dt: 0, resp: 0 };
      }
      function startPhase() {
        plats = mkPlats();
        enemies = []; coins = []; fires = []; bumps = []; pops = [];
        newMario();
        const def = phaseDef(S.phase);
        isBonus = !def;
        queue = def ? def.slice() : [];
        spawnT = 60; phaseT = 0; iceT = 900; redT = 1700; greenT = 1300;
        if (isBonus) {
          bonusTime = 20 * 60;
          const pos = [[20, 152], [84, 152], [172, 152], [236, 152], [20, 104], [128, 104], [236, 104], [40, 56], [216, 56], [180, FLOOR]];
          for (const [x, y] of pos) coins.push({ x, y, bonus: true, ground: null, dir: 0 });
          powHits = 3;
        }
        if (S.phase === 1) powHits = 3;
        S.mode = 'intro'; S.t = 0;
        snd.start();
      }
      function startGame() {
        S.score = 0; S.lives = 3; S.phase = 1; S.extra = false; S.bonusCount = 0; powHits = 3;
        startPhase();
      }
      function gameOver() {
        api.setHiScore(S.score); S.hi = Math.max(S.hi, api.getHiScore(0));
        S.mode = 'gameover'; S.t = 0;
      }

      // ---------------- enemies ----------------
      function spawnEnemy(type) {
        const side = pipeSide; pipeSide ^= 1;
        const base = type === 'C' ? 0.5 : type === 'S' ? 0.55 : 0.55;
        const e = {
          type: type === 'C' ? 'creeper' : type === 'S' ? 'crab' : type === 'F' ? 'fly' : 'ice',
          x: side ? W - 10 : 10, y: 56, dir: side ? -1 : 1, base, lvl: 0, angry: false,
          state: 'walk', ground: plats[side ? 7 : 6], vy: 0, vx: 0, ft: 0, hopT: 20, anim: 0, pipeT: 0, melt: 0,
          freezeAt: 160 + Math.random() * 220
        };
        enemies.push(e); snd.pipe();
        return e;
      }
      function spd(e) {
        let s = e.base * (1 + e.lvl * 0.45) * speedMul();
        if (e.angry) s *= 1.6;
        if (e.type === 'ice') s = 0.45;
        return s;
      }
      function lastOneCheck() {
        if (queue.length) return;
        const live = enemies.filter(e => e.type !== 'ice' && e.state !== 'kicked');
        if (live.length === 1 && live[0].lvl < 2) { live[0].lvl = 2; }
      }
      function flip(e) {
        if (e.state === 'flipped') { e.state = 'walk'; e.vy = -1.6; e.ground = null; snd.flip(); return; }
        if (e.type === 'fly' && !e.ground) return;
        if (e.type === 'crab' && !e.angry) { e.angry = true; e.vy = -1.4; e.ground = null; snd.flip(); return; }
        e.state = 'flipped'; e.ft = flipTime(); e.vy = -2.4; e.ground = null; e.angry = false;
        addScore(10); snd.flip();
      }
      function kick(e) {
        e.state = 'kicked'; e.vx = (M.x < e.x ? 1.6 : -1.6); e.vy = -3; e.ground = null;
        addScore(800, e.x, e.y - 18); snd.kick();
        // a coin pops out of a top pipe
        const side = coinSide; coinSide ^= 1;
        coins.push({ x: side ? W - 10 : 10, y: 56, dir: side ? -1 : 1, ground: plats[side ? 7 : 6], vy: 0, bonus: false });
        lastOneCheck();
      }
      function physics(e, sp, list) {
        if (e.ground) {
          e.x = wrapX(e.x + e.dir * sp);
          if (!on(e.ground, e.x)) { e.ground = null; e.vy = 0; }
        } else {
          e.vy = Math.min(3, e.vy + (e.type === 'fly' && e.state === 'walk' ? 0.12 : 0.18));
          const ny = e.y + e.vy;
          if (e.vy > 0) {
            const p = landOn(e.x, e.y, ny, list);
            if (p) { e.y = p.y; e.ground = p; e.vy = 0; return; }
          }
          e.y = ny; e.x = wrapX(e.x + e.dir * sp * (e.type === 'fly' ? 1.2 : 0.35));
        }
      }
      function updEnemy(e) {
        e.anim++;
        if (e.state === 'pipe') {
          if (--e.pipeT <= 0) {
            const side = e.side;
            e.x = side ? W - 10 : 10; e.y = 56; e.dir = side ? -1 : 1; e.ground = plats[side ? 7 : 6]; e.vy = 0; e.state = 'walk';
            snd.pipe();
          }
          return;
        }
        if (e.state === 'kicked') { e.x += e.vx; e.vy += 0.2; e.y += e.vy; return; }
        if (e.state === 'flipped') {
          physics(e, 0, plats);
          if (--e.ft <= 0) {
            e.state = 'walk'; e.lvl = Math.min(2, e.lvl + 1); e.vy = -1.8; e.ground = null;
            au.tone(330, 0.08, { type: 'square', vol: 0.08, slideTo: 660 });
          }
          return;
        }
        if (e.state === 'melt') {
          if (++e.melt > 50) { if (e.ground && !e.ground.floor) { e.ground.ice = true; snd.freeze(); } e.dead = true; }
          return;
        }
        // walking
        if (e.type === 'fly') {
          if (e.ground) {
            if (--e.hopT <= 0) { e.ground = null; e.vy = -2.7; e.hopT = Math.max(10, 26 - S.phase); }
          } else physics(e, spd(e), plats);
          if (e.ground) { /* sitting */ } else { /* moved above */ }
        } else physics(e, spd(e), plats);
        if (e.type === 'ice' && e.ground && !e.ground.floor && !e.ground.ice) {
          e.freezeAt -= 1;
          const p = e.ground, mid = (p.x0 + p.x1) / 2;
          if (e.freezeAt <= 0 && Math.abs(e.x - mid) < 24) { e.state = 'melt'; e.melt = 0; }
        }
        // bottom pipes
        if (e.y >= FLOOR - 2 && ((e.dir < 0 && e.x < 14) || (e.dir > 0 && e.x > W - 14))) {
          if (e.type === 'ice') { e.dead = true; return; }
          e.state = 'pipe'; e.side = e.dir < 0 ? 0 : 1; e.pipeT = 50; snd.pipe();
        }
      }

      // ---------------- bumping ----------------
      function doPow() {
        if (powHits <= 0) return;
        powHits--; shake = 24; snd.pow();
        bumps.push({ p: POWB, x: 128, t: 0 });
        for (const e of enemies) {
          if (!e.ground || e.state === 'kicked' || e.state === 'pipe') continue;
          if (e.type === 'ice') { e.dead = true; addScore(500, e.x, e.y - 16); continue; }
          if (e.state === 'flipped') { e.state = 'walk'; e.vy = -1.6; e.ground = null; continue; }
          e.angry = true; flip(e);
        }
        for (const c of coins) if (c.ground && !c.bonus) { c.dead = true; addScore(800, c.x, c.y - 14); snd.coin(); }
      }
      function bump(p, x) {
        if (p.pow) { doPow(); return; }
        bumps.push({ p, x, t: 0 }); snd.bump();
        for (const e of enemies) {
          if (e.ground !== p || e.state === 'kicked' || e.state === 'pipe') continue;
          if (Math.abs(wdx(e.x, x)) > 17) continue;
          if (e.type === 'ice') { e.dead = true; addScore(500, e.x, e.y - 16); au.tone(1800, 0.15, { type: 'square', vol: 0.1, slideTo: 300 }); continue; }
          flip(e);
        }
        for (const c of coins) {
          if (Math.abs(wdx(c.x, x)) < 14 && Math.abs(c.y - p.y) < 4) { c.dead = true; addScore(800, c.x, c.y - 14); snd.coin(); }
        }
        for (const f of fires) {
          if (Math.abs(wdx(f.x, x)) < 18 && f.y > p.y - 18 && f.y < p.y + 2) {
            f.dead = true; addScore(f.kind === 'red' ? 1000 : 200, f.x, f.y - 10); snd.fire();
          }
        }
      }

      // ---------------- Mario ----------------
      function updMario() {
        const m = M;
        m.anim++;
        if (m.dead) {
          m.dt++;
          if (m.dt === 40) { m.vy = -4; }
          if (m.dt > 40) { m.vy += 0.2; m.y += m.vy; }
          return;
        }
        const left = api.key('ArrowLeft'), right = api.key('ArrowRight');
        const list = plats.concat(m.resp > 0 ? [RESP] : [], powHits > 0 ? [POWB] : []);
        if (m.resp > 0) {
          m.resp--;
          if (left || right || api.pressed('Space') || m.resp <= 0) m.resp = 0;
        }
        if (m.ground && m.ground.resp && m.resp <= 0) { m.ground = null; m.vy = 0; }
        if (m.ground) {
          const ice = !!m.ground.ice;
          const acc = ice ? 0.03 : 0.14, fr = ice ? 0.006 : 0.16, maxv = 1.45;
          if (left && !right) { m.vx -= acc; m.dir = -1; } else if (right && !left) { m.vx += acc; m.dir = 1; }
          else { if (m.vx > 0) m.vx = Math.max(0, m.vx - fr); else m.vx = Math.min(0, m.vx + fr); }
          m.vx = Math.max(-maxv, Math.min(maxv, m.vx));
          if (api.pressed('Space')) { m.vy = -5.05; m.ground = null; snd.jump(); }
          else if (Math.abs(m.vx) > 0.5 && (m.anim % 9) === 0) snd.step();
        } else {
          if (left) m.vx = Math.max(-1.45, m.vx - 0.03);
          if (right) m.vx = Math.min(1.45, m.vx + 0.03);
          m.vy = Math.min(4.5, m.vy + 0.22);
        }
        // vertical
        if (!m.ground) {
          const ny = m.y + m.vy;
          if (m.vy < 0) {
            for (const p of list) {
              if (p.floor || p.resp) continue;
              const bot = p.y + p.h;
              if (m.y - 16 >= bot - 0.01 && ny - 16 < bot && (on(p, m.x - 4) && on(p, m.x + 4) || on(p, m.x))) {
                bump(p, m.x); m.vy = 0.5; m.y = bot + 16; break;
              }
            }
            if (m.vy < 0) m.y = ny;
          } else {
            let land = null;
            for (const q of list) if (m.y <= q.y + 0.01 && ny >= q.y && (on(q, m.x - 3) || on(q, m.x + 3)) && (!land || q.y < land.y)) land = q;
            if (land) { m.y = land.y; m.vy = 0; m.ground = land; }
            else m.y = ny;
          }
        }
        // horizontal
        m.x = wrapX(m.x + m.vx);
        if (!m.ground) {
          for (const p of list) {
            if (p.floor || p.resp) continue;
            if (m.y - 16 < p.y + p.h && m.y > p.y) {
              if (p.x0 > 0 && m.x + 5 > p.x0 && m.x < p.x0 + 3) { m.x = p.x0 - 5; if (m.vx > 0) m.vx = 0; }
              if (p.x1 < W && m.x - 5 < p.x1 && m.x > p.x1 - 3) { m.x = p.x1 + 5; if (m.vx < 0) m.vx = 0; }
            }
          }
        } else if (!(on(m.ground, m.x - 3) || on(m.ground, m.x + 3))) { m.ground = null; m.vy = 0; }
        if (m.y > H + 10) { m.y = FLOOR; m.ground = plats[0]; }
      }
      function killMario() {
        if (M.dead || M.resp > 0) return;
        M.dead = true; M.dt = 0; M.vy = 0; S.mode = 'dying'; S.t = 0; snd.die();
      }
      function respawn() {
        newMario(); M.x = 128; M.y = RESP.y; M.ground = RESP; M.resp = 300;
      }

      // ---------------- fireballs ----------------
      function updFires() {
        for (const f of fires) {
          f.t++;
          if (f.kind === 'red') {
            f.x += f.vx; f.y += f.vy;
            if (f.x < 6 || f.x > W - 6) f.vx = -f.vx;
            if (f.y < 26 || f.y > FLOOR - 5) f.vy = -f.vy;
            for (const p of plats) {
              if (p.floor) continue;
              if (on(p, f.x) && f.y + 5 > p.y && f.y - 5 < p.y + p.h) {
                if (f.vy > 0 && f.y - f.vy + 5 <= p.y + 1) { f.vy = -Math.abs(f.vy); f.y = p.y - 5; }
                else if (f.vy < 0 && f.y - f.vy - 5 >= p.y + p.h - 1) { f.vy = Math.abs(f.vy); f.y = p.y + p.h + 5; }
              }
            }
            if (f.t > 1500) f.dead = true;
          } else {
            f.x += f.vx; f.y = f.by + Math.sin(f.t * 0.12) * 3; f.dist += Math.abs(f.vx);
            if (f.dist > W * 2 + 40) f.dead = true;
            f.x = wrapX(f.x);
          }
          if (!M.dead && Math.abs(wdx(f.x, M.x)) < 9 && Math.abs(f.y - (M.y - 8)) < 11) killMario();
        }
      }

      // ---------------- update ----------------
      function updatePlay() {
        phaseT++;
        updMario();
        // spawning
        if (!isBonus) {
          if (queue.length && --spawnT <= 0) {
            spawnEnemy(queue.shift());
            spawnT = Math.max(110, 230 - S.phase * 8);
          }
          if (S.phase >= 5 && --iceT <= 0) {
            iceT = Math.max(700, 1300 - S.phase * 25);
            if (!enemies.some(e => e.type === 'ice')) spawnEnemy('I');
          }
          if (S.phase >= 2 && --redT <= 0) {
            redT = 1400;
            if (!fires.some(f => f.kind === 'red')) {
              const s = Math.random() < 0.5;
              fires.push({ kind: 'red', x: s ? 12 : W - 12, y: 80 + Math.random() * 60, vx: (s ? 1 : -1) * (0.7 + S.phase * 0.02), vy: 0.6, t: 0 });
              snd.fire();
            }
          }
          if (--greenT <= 0) {
            greenT = Math.max(700, 1300 - S.phase * 30);
            if (!M.dead && M.ground && !fires.some(f => f.kind === 'green')) {
              const s = M.x > W / 2;
              fires.push({ kind: 'green', x: s ? 4 : W - 4, by: M.ground.y - 9, y: M.ground.y - 9, vx: (s ? 1 : -1) * 1.1, t: 0, dist: 0 });
              snd.fire();
            }
          }
        } else {
          if (--bonusTime <= 0 || coins.every(c => c.dead)) endBonus();
        }
        for (const e of enemies) updEnemy(e);
        // enemies turn around when they meet
        for (let i = 0; i < enemies.length; i++) {
          const a = enemies[i];
          if (a.state !== 'walk' || !a.ground || a.type === 'fly') continue;
          for (let j = i + 1; j < enemies.length; j++) {
            const b = enemies[j];
            if (b.state !== 'walk' || b.ground !== a.ground || b.type === 'fly') continue;
            const d = wdx(b.x, a.x);
            if (Math.abs(d) < 14 && ((d > 0 && a.dir > 0 && b.dir < 0) || (d < 0 && a.dir < 0 && b.dir > 0))) { a.dir = -a.dir; b.dir = -b.dir; }
          }
        }
        for (const c of coins) {
          if (!c.bonus) {
            physics(c, 0.8, plats);
            if (c.y >= FLOOR - 2 && ((c.dir < 0 && c.x < 14) || (c.dir > 0 && c.x > W - 14))) c.dead = true;
          }
          if (!c.dead && !M.dead && Math.abs(wdx(c.x, M.x)) < 10 && Math.abs((c.y - 6) - (M.y - 8)) < 13) {
            c.dead = true; addScore(800, c.x, c.y - 14); snd.coin();
          }
        }
        updFires();
        // Mario vs enemies
        if (!M.dead) {
          for (const e of enemies) {
            if (e.state === 'kicked' || e.state === 'pipe' || e.dead) continue;
            const dx = wdx(e.x, M.x), dy = (e.y - 6) - (M.y - 8);
            if (Math.abs(dx) < 11 && Math.abs(dy) < 12) {
              if (e.state === 'flipped') kick(e);
              else if (e.state !== 'melt' || e.melt < 20) killMario();
            }
          }
        }
        enemies = enemies.filter(e => !e.dead && !(e.state === 'kicked' && e.y > H + 20));
        coins = coins.filter(c => !c.dead);
        fires = fires.filter(f => !f.dead);
        for (const b of bumps) b.t++;
        bumps = bumps.filter(b => b.t < 14);
        if (!isBonus && !queue.length && !enemies.some(e => e.type !== 'ice')) {
          S.mode = 'clear'; S.t = 0; snd.clear();
          enemies = []; fires = [];
        }
      }
      function endBonus() {
        const got = coins.every(c => c.dead) || coins.length === 0;
        if (got) {
          const b = [3000, 5000, 8000][Math.min(2, S.bonusCount)];
          addScore(b); bonusMsg = 'PERFECT!! ' + b + ' PTS'; snd.clear();
        } else { bonusMsg = 'NO BONUS'; au.tone(200, 0.3, { type: 'square', vol: 0.1, slideTo: 100 }); }
        S.bonusCount++;
        coins = [];
        S.mode = 'clear'; S.t = 0;
      }

      function update() {
        S.t++;
        if (coinFlash > 0) coinFlash--;
        if (shake > 0) shake--;
        for (const p of pops) p.t--;
        pops = pops.filter(p => p.t > 0);
        if (S.mode === 'title') {
          S.attract++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) startGame();
            else { coinFlash = 120; au.tone(70, 0.25, { type: 'square', vol: 0.25 }); }
          }
          lastCreditCount = api.credits;
          return;
        }
        if (S.mode === 'gameover') {
          if (S.t > 240 || (S.t > 60 && api.anyPressed('Enter'))) { S.mode = 'title'; S.t = 0; S.attract = 0; }
          return;
        }
        if (S.mode === 'intro') { if (S.t > 130) { S.mode = 'play'; S.t = 0; } return; }
        if (S.mode === 'clear') {
          if (S.t > (isBonus ? 200 : 150)) { S.phase++; bonusMsg = ''; startPhase(); }
          return;
        }
        if (S.mode === 'dying') {
          updMario();
          for (const b of bumps) b.t++;
          bumps = bumps.filter(b => b.t < 14);
          if (S.t > 40 && M.y > H + 20 && S.t > 150) {
            S.lives--;
            if (S.lives <= 0) {
              S.mode = 'wait';
              const cont = () => { S.lives = 3; respawn(); S.mode = 'play'; S.t = 0; };
              if (api.offerContinue) api.offerContinue(cont, gameOver); else gameOver();
            } else { respawn(); S.mode = 'play'; S.t = 0; }
          }
          return;
        }
        if (S.mode === 'wait') return;
        updatePlay();
      }

      // ---------------- render ----------------
      const PLAT_COLS = [['#1038c0', '#5880ff', '#081860'], ['#b04000', '#ff9050', '#501800'], ['#108020', '#60e070', '#044010'], ['#9020b0', '#e070ff', '#400050']];
      function drawPlatform(ctx, p, pal) {
        if (p.floor) {
          for (let x = 0; x < W; x += 16) {
            ctx.fillStyle = '#a83800'; ctx.fillRect(x, FLOOR, 16, 24);
            ctx.fillStyle = '#f8a058'; ctx.fillRect(x, FLOOR, 16, 2);
            ctx.fillStyle = '#501000';
            ctx.fillRect(x + 15, FLOOR, 1, 8); ctx.fillRect(x, FLOOR + 8, 16, 1); ctx.fillRect(x + 7, FLOOR + 8, 1, 8);
            ctx.fillRect(x, FLOOR + 16, 16, 1); ctx.fillRect(x + 15, FLOOR + 16, 1, 8);
          }
          return;
        }
        for (let x = p.x0; x < p.x1; x += 8) {
          let off = 0;
          for (const b of bumps) if (b.p === p) {
            const d = Math.abs(wdx(x + 4, b.x));
            if (d < 20) off = Math.min(off, -Math.round(Math.sin(b.t / 14 * Math.PI) * (6 - d * 0.25)));
          }
          const y = p.y + off;
          if (p.ice) {
            ctx.fillStyle = '#80d8ff'; ctx.fillRect(x, y, 8, 8);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 8, 2); ctx.fillRect(x + 2, y + 3, 2, 1);
            ctx.fillStyle = '#3070c0'; ctx.fillRect(x + 7, y + 2, 1, 6);
            ctx.fillStyle = '#c0f0ff'; ctx.fillRect(x + 3, y + 8, 1, 3); ctx.fillRect(x + 6, y + 8, 1, 2);
          } else {
            ctx.fillStyle = pal[0]; ctx.fillRect(x, y, 8, 8);
            ctx.fillStyle = pal[1]; ctx.fillRect(x, y, 8, 2); ctx.fillRect(x, y, 1, 8);
            ctx.fillStyle = pal[2]; ctx.fillRect(x + 7, y + 1, 1, 7); ctx.fillRect(x + 1, y + 7, 7, 1); ctx.fillRect(x + 3, y + 4, 2, 1);
          }
        }
      }
      function drawPipe(ctx, x, y, w, h, faceRight) {
        ctx.fillStyle = '#108018'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#70e060'; ctx.fillRect(x, y + 2, w, 3);
        ctx.fillStyle = '#044008'; ctx.fillRect(x, y + h - 3, w, 3);
        const lx = faceRight ? x + w - 6 : x;
        ctx.fillStyle = '#20a028'; ctx.fillRect(lx, y - 3, 6, h + 6);
        ctx.fillStyle = '#90f080'; ctx.fillRect(lx + 1, y - 3, 2, h + 6);
        ctx.fillStyle = '#044008'; ctx.fillRect(lx + 5, y - 3, 1, h + 6);
      }
      function drawPow(ctx) {
        if (powHits <= 0) return;
        let off = 0;
        for (const b of bumps) if (b.p === POWB) off = -Math.round(Math.sin(b.t / 14 * Math.PI) * 4);
        const h = [0, 8, 12, 16][powHits];
        const y = POWB.y + 16 - h + off;
        ctx.fillStyle = '#2050f0'; ctx.fillRect(116, y, 24, h);
        ctx.fillStyle = '#90b0ff'; ctx.fillRect(116, y, 24, 1); ctx.fillRect(116, y, 1, h);
        ctx.fillStyle = '#081870'; ctx.fillRect(139, y, 1, h); ctx.fillRect(116, y + h - 1, 24, 1);
        if (h >= 8) text(ctx, 'POW', 119, y + ((h - 7) >> 1), '#fff');
      }
      function drawEnemy(ctx, e) {
        if (e.state === 'pipe') return;
        if (e.type === 'ice') {
          if (e.state === 'melt') {
            const k = e.melt / 50;
            ctx.fillStyle = '#c8f0ff'; ctx.fillRect(e.x - 6 - k * 10, e.y - 3, 12 + k * 20, 3);
            if (k < 0.6) blit(ctx, iceSpr, e.x - 6, e.y - 10 + k * 8);
          } else blit(ctx, iceSpr, e.x - 6, e.y - 10 + ((e.anim >> 3) & 1));
          return;
        }
        const fr = e.state === 'walk' ? ((e.anim >> 3) & 1) : 0;
        let lvl = e.lvl;
        if (e.type === 'crab' && e.angry && e.state === 'walk') lvl = 3;
        const img = esprite(e.type, lvl, e.type === 'fly' ? (e.ground ? 0 : (e.anim >> 2) & 1) : fr);
        let x = e.x - 8, y = e.y - 10;
        if (e.state === 'flipped' || e.state === 'kicked') {
          if (e.state === 'flipped' && e.ft < 70) x += ((e.anim >> 1) & 1) ? 1 : -1;
          const legs = (e.anim >> 3) & 1;
          blit(ctx, esprite(e.type, lvl, legs), x, y, e.dir < 0, true);
        } else blit(ctx, img, x, y, e.dir < 0, false);
        // wrap ghost
        if (e.x < 10) blit(ctx, img, x + W, y, e.dir < 0, e.state === 'flipped');
        if (e.x > W - 10) blit(ctx, img, x - W, y, e.dir < 0, e.state === 'flipped');
      }
      function drawMario(ctx) {
        const m = M;
        let f = 'stand';
        if (m.dead) f = 'jump';
        else if (!m.ground) f = 'jump';
        else if (Math.abs(m.vx) > 0.2) f = ((m.anim >> 3) & 1) ? 'walkA' : 'walkB';
        if (m.resp > 0 && (m.anim >> 2) & 1) return;
        const img = mario(f);
        blit(ctx, img, m.x - 6, m.y - 16, m.dir < 0, m.dead && m.dt > 40);
        if (m.x < 6) blit(ctx, img, m.x - 6 + W, m.y - 16, m.dir < 0);
        if (m.x > W - 6) blit(ctx, img, m.x - 6 - W, m.y - 16, m.dir < 0);
      }
      function drawHUD(ctx) {
        text(ctx, 'I', 16, 4, '#ff5030');
        text(ctx, String(S.score).padStart(6, '0'), 26, 4, '#fff');
        text(ctx, 'TOP', 104, 4, '#ff5030');
        text(ctx, String(S.hi).padStart(6, '0'), 126, 4, '#fff');
        if (S.mode !== 'title') {
          text(ctx, 'P=' + S.phase, 208, 4, '#80c0ff');
          for (let i = 0; i < Math.min(5, S.lives - 1); i++) {
            ctx.fillStyle = '#f03818'; ctx.fillRect(18 + i * 9, 14, 6, 3);
            ctx.fillStyle = '#ffb070'; ctx.fillRect(18 + i * 9, 17, 6, 3);
          }
        }
      }
      function drawStage(ctx) {
        const pal = PLAT_COLS[Math.floor((S.phase - 1) / 3) % PLAT_COLS.length];
        for (const p of plats) drawPlatform(ctx, p, pal);
        drawPow(ctx);
        if (M && M.resp > 0 && M.ground === RESP) {
          ctx.fillStyle = '#f8f8f8'; ctx.fillRect(RESP.x0, RESP.y, 24, 3);
          ctx.fillStyle = '#909090'; ctx.fillRect(RESP.x0, RESP.y + 3, 24, 1);
        }
        for (const c of coins) {
          const spin = ((S.t + (c.x | 0)) >> 3) & 3;
          const img = spin === 2 ? coinSpr2 : coinSpr;
          blit(ctx, img, c.x - (img.width >> 1), c.y - 11);
        }
        for (const e of enemies) drawEnemy(ctx, e);
        for (const f of fires) {
          const fl = (S.t >> 2) & 1;
          ctx.fillStyle = f.kind === 'red' ? (fl ? '#ff2000' : '#ffa000') : (fl ? '#20e020' : '#c0ff40');
          ctx.beginPath(); ctx.arc(f.x, f.y, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffa0'; ctx.fillRect(f.x - 2, f.y - 2, 3, 3);
          ctx.fillStyle = f.kind === 'red' ? '#ff6000' : '#40c040';
          ctx.fillRect(f.x - (f.vx > 0 ? 9 : -6), f.y - 1, 3, 2);
        }
        if (M) drawMario(ctx);
        // pipes in front
        drawPipe(ctx, 0, 34, 26, 20, true);
        drawPipe(ctx, W - 26, 34, 26, 20, false);
        drawPipe(ctx, 0, FLOOR - 20, 22, 18, true);
        drawPipe(ctx, W - 22, FLOOR - 20, 22, 18, false);
        for (const p of pops) text(ctx, p.s, p.x, p.y - (50 - p.t) * 0.3, '#fff', 1, 'center');
      }
      function drawTitle(ctx) {
        const big = (s, y, c1, c2) => { text(ctx, s, W / 2 + 2, y + 2, c2, 3, 'center'); text(ctx, s, W / 2, y, c1, 3, 'center'); };
        big('MARIO', 28, '#f03818', '#601000');
        big('BROS.', 54, '#2878ff', '#081860');
        blit(ctx, mario(((S.t >> 3) & 1) ? 'walkA' : 'walkB'), 48 + ((S.t * 0.6) % 160), 84);
        const page = (S.attract >> 8) & 1;
        if (!page) {
          text(ctx, 'BUMP FROM BELOW TO FLIP', W / 2, 108, '#fff', 1, 'center');
          text(ctx, 'THEN KICK THEM OFF!', W / 2, 118, '#fff', 1, 'center');
          blit(ctx, esprite('creeper', 0, (S.t >> 3) & 1), 40, 132); text(ctx, 'SHELLCREEPER', 60, 134, '#80ff80');
          blit(ctx, esprite('crab', 0, (S.t >> 3) & 1), 40, 146); text(ctx, 'SIDESTEPPER', 60, 148, '#ff8070');
          blit(ctx, esprite('fly', 0, (S.t >> 3) & 1), 40, 160); text(ctx, 'FIGHTER FLY', 60, 162, '#80c0ff');
          text(ctx, '800', 210, 148, '#fff', 1, 'right'); text(ctx, 'PTS', 216, 148, '#fff');
        } else {
          text(ctx, 'SCORING', W / 2, 108, '#ffd800', 1, 'center');
          text(ctx, 'KICK ENEMY ........ 800', 36, 122, '#fff');
          text(ctx, 'COIN .............. 800', 36, 133, '#fff');
          text(ctx, 'RED FIREBALL ..... 1000', 36, 144, '#fff');
          text(ctx, 'GREEN FIREBALL ..... 200', 36, 155, '#fff');
          text(ctx, 'SLIPICE ............ 500', 36, 166, '#fff');
        }
        const blink = (S.t % 60) < 40;
        if (coinFlash > 0) { if ((coinFlash >> 3) & 1) text(ctx, 'INSERT COIN', W / 2, 180, '#ff4040', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 180, '#40e8ff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 180, '#40e8ff', 1, 'center');
        text(ctx, 'EXTRA MARIO AT 20000', W / 2, 192, '#ffb070', 1, 'center');
        text(ctx, '\u00a9 1983 NINTENDO', W / 2, 204, '#fff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 8, 214, '#aaa', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (S.mode === 'title') { drawHUD(ctx); drawTitle(ctx); return; }
        ctx.save();
        if (shake > 0) ctx.translate(0, (shake & 2) ? 2 : -2);
        drawStage(ctx);
        ctx.restore();
        drawHUD(ctx);
        if (isBonus && (S.mode === 'play' || S.mode === 'intro')) {
          ctx.fillStyle = '#2050f0'; ctx.fillRect(108, 18, 40, 11);
          text(ctx, (bonusTime / 60).toFixed(1), 128, 20, '#fff', 1, 'center');
        }
        if (S.mode === 'intro') {
          ctx.fillStyle = '#000'; ctx.fillRect(68, 76, 120, 24);
          text(ctx, isBonus ? 'TEST YOUR SKILL' : 'PHASE ' + S.phase, W / 2, 84, '#fff', 1, 'center');
        }
        if (S.mode === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(48, 76, 160, 24);
          text(ctx, isBonus ? bonusMsg : 'PHASE ' + S.phase + ' CLEAR', W / 2, 84, '#ffd800', 1, 'center');
        }
        if (S.mode === 'gameover') {
          ctx.fillStyle = '#000'; ctx.fillRect(72, 76, 112, 26);
          text(ctx, 'GAME OVER', W / 2, 82, '#fff', 2, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
