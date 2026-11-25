// Alpha Mission (SNK, 1985) - from-scratch recreation for the MAME32 Game Room.
// Vertical shooter: air shots for flying enemies, ground missiles for surface targets,
// power-up panels (S/L/M/E/K) dug out of the ground and armour assembled from parts.
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


  const W = 224, H = 288, TS = 16;
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(a, b, c) {
    let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const flipV = rows => rows.slice().reverse();

  // ---------------- pixel art ----------------
  const SHIP_ROWS = [
    '.......WW.......',
    '......WBBW......',
    '......WBBW......',
    '.....WWCCWW.....',
    '.....WCCCCW.....',
    '....WWCWWCWW....',
    '..R.WGGWWGGW.R..',
    '..RWWGGWWGGWWR..',
    '.RWWWWWWWWWWWWR.',
    'RRWWGWWWWWWGWWRR',
    'RWWGGWWRRWWGGWWR',
    'RWGG.WRRRRW.GGWR',
    '.GG..WR..RW..GG.',
    '.....GG..GG.....'];
  const SHIP_PAL = { W: '#e8e8f0', B: '#3060ff', C: '#60d0ff', R: '#e02020', G: '#7c8494' };
  const ARMOR_PAL = {
    W: { W: '#ffe060', B: '#ff4000', C: '#ffffff', R: '#ff8000', G: '#b07000' },
    F: { W: '#ff7060', B: '#ffff00', C: '#ffffff', R: '#ffd000', G: '#a02000' },
    H: { W: '#80ff90', B: '#0050ff', C: '#ffffff', R: '#00b0ff', G: '#20802c' }
  };
  const ART = {
    dart: flipV([
      '.....R.....',
      '....RRR....',
      'R..RWWWR..R',
      'RR.RWYWR.RR',
      'RRRRWWWRRRR',
      '.RRRRRRRRR.',
      '..RR.R.RR..',
      '..R.....R..']),
    saucer: [
      '....CCCC....',
      '..CCWWWWCC..',
      '.CBBBBBBBBC.',
      'CBYBBYBBYBBC',
      '.CBBBBBBBBC.',
      '..CCCCCCCC..'],
    diver: flipV([
      '......O......',
      '.....OYO.....',
      '.....OYO.....',
      '....OOWOO....',
      'O..OOOWOOO..O',
      'OOOOOOOOOOOOO',
      '.OO.OO.OO.OO.',
      '..O..O.O..O..']),
    ring: [
      '...PPPPP...',
      '..PMMMMMP..',
      '.PM.....MP.',
      'PM..WWW..MP',
      'PM..WYW..MP',
      'PM..WWW..MP',
      '.PM.....MP.',
      '..PMMMMMP..',
      '...PPPPP...'],
    big: flipV([
      '..........GG..........',
      '.........GWWG.........',
      '........GWBBWG........',
      '...G....GWBBWG....G...',
      '..GRG..GGWWWWGG..GRG..',
      '..GRGGGGGWWWWGGGGGRG..',
      '.GGGGWWWWGGGGWWWWGGGG.',
      'GGWWWWGGGGYYGGGGWWWWGG',
      'GWWGGGGGGYYYYGGGGGGWWG',
      'GGGG..GGGGYYGGGG..GGGG',
      '.G.....GG.GG.GG.....G.',
      '.......R..R..R........'])
  };
  const ENEMY_PAL = {
    dart: { R: '#ff3030', W: '#ffffff', Y: '#ffe000' },
    saucer: { C: '#30e0ff', W: '#ffffff', B: '#2050c0', Y: '#ffe000' },
    diver: { O: '#ff8c00', Y: '#ffe000', W: '#ffffff' },
    ring: { P: '#d040ff', M: '#7020c0', W: '#ffffff', Y: '#ff3030' },
    big: { G: '#58a048', W: '#c8e8c0', B: '#ff3030', R: '#ff6000', Y: '#ffe000' }
  };
  const ITEM_COL = { S: '#2060ff', L: '#e02020', M: '#20a040', E: '#e0b000', K: '#404040', W: '#ff8000', F: '#c02060', H: '#008080' };
  const ITEM_NAME = { S: 'SPEED UP', L: 'LASER UP', M: 'MISSILE UP', E: 'ENERGY', K: 'KILL (POWER DOWN)', W: 'WIDE ARMOR PART', F: 'FIRE ARMOR PART', H: 'HOMING ARMOR PART' };
  const ARMOR_NAME = { W: 'WIDE', F: 'FIRE', H: 'HOMING' };

  ArcadeRegistry.register({
    id: 'alphamission',
    title: 'Alpha Mission',
    year: 1985,
    maker: 'SNK',
    width: W, height: H,
    vector: false,
    pointer: false,
    controls: 'Arrows: move \u00b7 Space: air shot \u00b7 X: ground missile \u00b7 Z/Enter: armor \u00b7 Enter: start',
    marquee: { bg: '#000818', fg: '#ff4020', accent: '#40c0ff' },
    create(api) {
      const au = api.audio;
      // build sprites lazily (document is available in create)
      const SP = {
        ship: spr(SHIP_ROWS, SHIP_PAL),
        armor: { W: spr(SHIP_ROWS, ARMOR_PAL.W), F: spr(SHIP_ROWS, ARMOR_PAL.F), H: spr(SHIP_ROWS, ARMOR_PAL.H) }
      };
      for (const k in ART) SP[k] = spr(ART[k], ENEMY_PAL[k]);
      SP.bigHit = spr(ART.big, { G: '#ffffff', W: '#ffffff', B: '#ffffff', R: '#ffffff', Y: '#ffffff' });

      // ---------- background tiles per stage ----------
      const HUES = [110, 30, 200, 280, 0, 55, 165, 320, 15, 225, 130, 345];
      let tiles = null;
      function buildTiles(stage) {
        const hue = HUES[(stage - 1) % 12], ph = (hue + 180) % 360;
        const rnd = mulberry(stage * 31 + 7);
        const mk = (fn) => { const c = document.createElement('canvas'); c.width = TS; c.height = TS; const x = c.getContext('2d'); fn(x); return c; };
        const px = (x, a, b, col) => { x.fillStyle = col; x.fillRect(a, b, 1, 1); };
        const land = [], plate = [], space = [];
        const lc = ['hsl(' + hue + ',45%,24%)', 'hsl(' + hue + ',40%,32%)', 'hsl(' + hue + ',50%,16%)', 'hsl(' + ((hue + 20) % 360) + ',35%,40%)'];
        for (let v = 0; v < 4; v++) land.push(mk(x => {
          x.fillStyle = lc[0]; x.fillRect(0, 0, TS, TS);
          for (let i = 0; i < 40; i++) px(x, rnd() * TS | 0, rnd() * TS | 0, lc[1 + (rnd() * 3 | 0)]);
          if (v === 3) { // crater
            x.fillStyle = lc[2]; x.beginPath(); x.arc(8, 8, 5, 0, 7); x.fill();
            x.fillStyle = lc[3]; x.fillRect(4, 12, 8, 1); x.fillRect(12, 5, 1, 6);
          }
        }));
        const pc = ['hsl(' + ph + ',12%,46%)', 'hsl(' + ph + ',14%,62%)', 'hsl(' + ph + ',16%,28%)', 'hsl(' + ph + ',30%,38%)'];
        for (let v = 0; v < 4; v++) plate.push(mk(x => {
          x.fillStyle = pc[0]; x.fillRect(0, 0, TS, TS);
          x.fillStyle = pc[1]; x.fillRect(0, 0, TS, 1); x.fillRect(0, 0, 1, TS);
          x.fillStyle = pc[2]; x.fillRect(0, TS - 1, TS, 1); x.fillRect(TS - 1, 0, 1, TS);
          if (v === 0) { px(x, 3, 3, pc[2]); px(x, 12, 3, pc[2]); px(x, 3, 12, pc[2]); px(x, 12, 12, pc[2]); }
          if (v === 1) { x.fillStyle = pc[2]; for (let i = 0; i < 4; i++) x.fillRect(4, 4 + i * 2, 8, 1); }
          if (v === 2) { x.fillStyle = pc[3]; x.fillRect(2, 7, 12, 2); x.fillRect(7, 2, 2, 12); }
          if (v === 3) { x.fillStyle = pc[2]; x.fillRect(5, 5, 6, 6); x.fillStyle = pc[3]; x.fillRect(6, 6, 4, 4); }
        }));
        for (let v = 0; v < 4; v++) space.push(mk(x => {
          x.fillStyle = '#000008'; x.fillRect(0, 0, TS, TS);
          for (let i = 0; i < 2; i++) px(x, rnd() * TS | 0, rnd() * TS | 0, ['#ffffff', '#8080ff', '#ffff80', '#606060'][rnd() * 4 | 0]);
        }));
        tiles = { land, plate, space };
      }
      // region of a row: 'land' | 'plate' | 'space'
      function region(stage, row) {
        const seg = Math.floor(row / 20);
        if (seg === 0) return 'land';
        const h = hash(seg, stage, 3);
        return h < 0.45 ? 'land' : h < 0.85 ? 'plate' : 'space';
      }

      // ---------- coin-op ----------
      let hi = api.getHiScore(50000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0, lastCred = api.credits, titleScroll = 0;
      function pollCoins() {
        const c = api.credits;
        if (c > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }

      // ---------- sounds ----------
      const snd = {
        shot() { au.tone(1400, 0.05, { type: 'square', vol: 0.05, slideTo: 700 }); },
        laser() { au.tone(2200, 0.06, { type: 'sawtooth', vol: 0.05, slideTo: 1200 }); },
        missile() { au.tone(300, 0.18, { type: 'triangle', vol: 0.12, slideTo: 90 }); },
        boom() { au.noise(0.25, { vol: 0.18, freq: 1600, slideTo: 200 }); },
        groundBoom() { au.noise(0.3, { vol: 0.2, freq: 900, slideTo: 120 }); au.tone(110, 0.2, { type: 'square', vol: 0.08, slideTo: 50 }); },
        big() { au.noise(0.9, { vol: 0.25, freq: 2400, slideTo: 80 }); au.tone(80, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 30 }); },
        item() { au.melody([[880, .05], [1175, .05], [1568, .08]], { type: 'square', vol: 0.09 }); },
        kill() { au.melody([[440, .08], [330, .08], [220, .14]], { type: 'square', vol: 0.1 }); },
        reveal() { au.tone(660, 0.12, { type: 'triangle', vol: 0.12, slideTo: 1320 }); },
        armor() { au.melody([[523, .07], [659, .07], [784, .07], [1047, .07], [1319, .2]], { type: 'square', vol: 0.1 }); },
        hit() { au.tone(180, 0.05, { type: 'square', vol: 0.06 }); },
        die() { au.noise(1.2, { vol: 0.25, freq: 3000, slideTo: 60 }); au.tone(600, 1.0, { type: 'sawtooth', vol: 0.1, slideTo: 40 }); },
        oneup() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .4]], { type: 'square', vol: 0.1 }); },
        warn() { au.tone(440, 0.15, { type: 'square', vol: 0.1 }); au.tone(330, 0.15, { type: 'square', vol: 0.1, delay: 0.17 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .4]], { type: 'square', vol: 0.1 }); }
      };

      // ---------- game state ----------
      let g = null;
      function newGame() {
        g = {
          score: 0, reserve: 2, nextExtra: 50000, stage: 0, loop: 0,
          p: null, shots: [], missiles: [], ebul: [], enemies: [], ground: [], items: [], booms: [], pops: [],
          queue: [], boss: null, phase: 'intro', phaseT: 0, msg: '', msgT: 0
        };
        g.p = newPlayer();
        g.p.sl = 1; g.p.ll = 1; g.p.ml = 1;
        nextStage();
        snd.start();
      }
      function newPlayer() {
        return { x: W / 2, y: H - 40, state: 'alive', t: 0, inv: 150, cd: 0, sl: 1, ll: 1, ml: 1, energy: 16, parts: { W: 0, F: 0, H: 0 }, avail: [], armor: null, drain: 0 };
      }
      function nextStage() {
        g.stage++;
        if (g.stage > 12) { g.stage = 1; g.loop++; }
        buildTiles(g.stage);
        g.scroll = 0; g.rowsDone = 0; g.len = 3000 + g.stage * 60;
        g.rng = mulberry(g.stage * 977 + g.loop * 13 + 1);
        g.enemies = []; g.ebul = []; g.ground = []; g.items = []; g.queue = []; g.boss = null;
        g.waveT = 150; g.phase = 'intro'; g.phaseT = 150;
        const p = g.p; p.x = W / 2; p.y = H - 40; p.state = 'alive'; p.inv = 150;
      }
      const diff = () => g.stage + g.loop * 6;
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.reserve++; g.nextExtra += g.nextExtra === 50000 ? 50000 : 100000; snd.oneup(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, txt, col) { g.pops.push({ x, y, txt, col: col || '#ffffff', t: 50 }); }
      function boom(x, y, big, ground) { g.booms.push({ x, y, t: 0, big: !!big, ground: !!ground }); }

      // ---------- ground objects ----------
      function rowY(r) { return H - (r * TS - g.scroll) - TS / 2; }
      function spawnRows() {
        const endRow = Math.floor(g.len / TS) - 6;
        while (g.rowsDone * TS < g.scroll + H + TS) {
          const r = g.rowsDone++;
          if (r < 20 || r > endRow) continue;
          const reg = region(g.stage, r);
          if (reg === 'space') continue;
          const v = g.rng(), col = 1 + Math.floor(g.rng() * 12);
          const d = Math.min(0.06, diff() * 0.004);
          if (v < 0.04 + d) g.ground.push({ kind: 'turret', row: r, x: col * TS + 8, hp: 1, cd: 60 + g.rng() * 120 | 0, ang: Math.PI / 2 });
          else if (v < 0.115 + d) g.ground.push({ kind: 'panel', row: r, x: col * TS + 8, hp: 1 });
          else if (v < 0.13 + d) g.ground.push({ kind: 'silo', row: r, x: col * TS + 8, hp: 3, cd: 90 });
          else if (v < 0.15 + d && reg === 'plate') g.ground.push({ kind: 'dome', row: r, x: col * TS + 8, hp: 2 });
        }
      }
      function pickItem() {
        const r = g.rng() * 100;
        if (r < 20) return 'S'; if (r < 40) return 'L'; if (r < 54) return 'M'; if (r < 68) return 'E'; if (r < 78) return 'K';
        return ['W', 'F', 'H'][g.rng() * 3 | 0];
      }

      // ---------- air enemy waves ----------
      function later(t, fn) { g.queue.push({ t, fn }); }
      function mkEnemy(kind, x, y, o) {
        const e = Object.assign({ kind, x, y, vx: 0, vy: 0, t: 0, hp: 1, flash: 0, w: 10, h: 8, pts: 100 }, o || {});
        g.enemies.push(e); return e;
      }
      function spawnWave() {
        const d = diff();
        const kinds = ['column', 'sine', 'divers', 'spinners', 'rings'];
        if (d >= 2) kinds.push('big');
        if (d >= 3) kinds.push('column', 'divers');
        const k = kinds[g.rng() * kinds.length | 0];
        if (k === 'column') {
          const x = 24 + g.rng() * (W - 48), n = 5 + Math.min(3, d >> 2);
          for (let i = 0; i < n; i++) later(i * 12, () => mkEnemy('dart', x, -10, { vy: 1.5 + d * 0.05, pts: 100, w: 10, h: 8, home: 0.02 + d * 0.002 }));
        } else if (k === 'sine') {
          const left = g.rng() < 0.5, y0 = 30 + g.rng() * 50;
          for (let i = 0; i < 6; i++) later(i * 10, () => mkEnemy('saucer', left ? -10 : W + 10, y0, { vx: left ? 1.6 : -1.6, base: y0, amp: 22, pts: 150, w: 12, h: 6 }));
        } else if (k === 'divers') {
          const n = 3 + Math.min(3, d >> 2);
          for (let i = 0; i < n; i++) later(i * 18, () => mkEnemy('diver', 20 + g.rng() * (W - 40), -10, { vy: 1, pts: 200, w: 12, h: 8, st: 0 }));
        } else if (k === 'spinners') {
          for (let i = 0; i < 2; i++) later(i * 30, () => mkEnemy('spinner', 50 + i * 124 + (g.rng() - 0.5) * 30, -10, { vy: 1.2, pts: 300, hp: 2, w: 12, h: 12, st: 0, ty: 60 + g.rng() * 60, fire: 50 }));
        } else if (k === 'rings') {
          const left = g.rng() < 0.5;
          for (let i = 0; i < 4; i++) later(i * 16, () => mkEnemy('ring', left ? -10 : W + 10, 50 + i * 16, { vx: left ? 1.2 : -1.2, pts: 200, w: 10, h: 10, fire: 40 + g.rng() * 80 | 0 }));
        } else if (k === 'big') {
          mkEnemy('big', 30 + g.rng() * (W - 60), -14, { vy: 0.5, pts: 1000, hp: 8 + d, w: 22, h: 12, fire: 60 });
        }
      }
      function aimBullet(x, y, spd, spread) {
        const p = g.p; const a = Math.atan2(p.y - y, p.x - x) + (spread || 0);
        g.ebul.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd });
      }
      const bspd = () => Math.min(3.2, 1.5 + diff() * 0.08);

      // ---------- boss ----------
      function spawnBoss() {
        const d = diff();
        g.boss = { x: W / 2, y: -40, t: 0, hp: 40 + d * 8, max: 40 + d * 8, guns: [12 + d, 12 + d], flash: 0, timer: 45 * 60, state: 'enter', atk: 0 };
        g.msg = 'WARNING'; g.msgT = 120; snd.warn();
      }
      function updBoss() {
        const b = g.boss; b.t++; if (b.flash > 0) b.flash--;
        if (b.state === 'enter') { b.y += 0.6; if (b.y >= 70) b.state = 'fight'; return; }
        if (b.state === 'leave') { b.y -= 1.2; if (b.y < -60) { g.boss = null; stageClear(false); } return; }
        if (b.state === 'dying') {
          if (b.t % 6 === 0) { boom(b.x + (Math.random() - 0.5) * 100, b.y + (Math.random() - 0.5) * 40, Math.random() < 0.3); snd.boom(); }
          if (b.t > 120) { g.boss = null; stageClear(true); }
          return;
        }
        b.timer--;
        b.x = W / 2 + Math.sin(b.t / 90) * 50;
        b.y = 70 + Math.sin(b.t / 47) * 12;
        if (b.timer <= 0) { b.state = 'leave'; g.msg = 'ESCAPED'; g.msgT = 120; return; }
        const d = diff(), rate = Math.max(30, 70 - d * 3);
        if (b.t % rate === 0 && g.p.state === 'alive') {
          b.atk = (b.atk + 1) % 4;
          if (b.atk === 0) { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + b.t * 0.01; g.ebul.push({ x: b.x, y: b.y + 6, vx: Math.cos(a) * bspd() * 0.8, vy: Math.sin(a) * bspd() * 0.8 }); } }
          else if (b.atk === 2) { mkEnemy('dart', b.x - 20, b.y + 14, { vy: 1.8, pts: 100, w: 10, h: 8, home: 0.04 }); mkEnemy('dart', b.x + 20, b.y + 14, { vy: 1.8, pts: 100, w: 10, h: 8, home: 0.04 }); }
          for (let i = 0; i < 2; i++) if (b.guns[i] > 0 && b.atk !== 2) {
            const gx = b.x + (i ? 40 : -40), gy = b.y + 10;
            aimBullet(gx, gy, bspd(), -0.25); aimBullet(gx, gy, bspd(), 0); aimBullet(gx, gy, bspd(), 0.25);
          }
        }
      }
      function hitBoss(s, dmg) {
        const b = g.boss; if (!b || b.state !== 'fight') return false;
        for (let i = 0; i < 2; i++) {
          if (b.guns[i] > 0 && Math.abs(s.x - (b.x + (i ? 40 : -40))) < 9 && Math.abs(s.y - (b.y + 8)) < 10) {
            b.guns[i] -= dmg; b.flash = 3; snd.hit();
            if (b.guns[i] <= 0) { boom(b.x + (i ? 40 : -40), b.y + 8, true); snd.big(); addScore(2000); pop(b.x + (i ? 40 : -40), b.y, '2000'); }
            return true;
          }
        }
        if (Math.abs(s.x - b.x) < 12 && Math.abs(s.y - b.y) < 12) {
          b.hp -= dmg; b.flash = 3; snd.hit();
          if (b.hp <= 0) {
            b.state = 'dying'; b.t = 0; snd.big();
            const bonus = 10000 + g.stage * 1000;
            addScore(bonus); pop(b.x, b.y, String(bonus), '#ffff40');
            g.ebul = [];
          }
          return true;
        }
        return Math.abs(s.x - b.x) < 56 && Math.abs(s.y - b.y) < 14; // hull absorbs shots
      }
      function stageClear(killed) {
        g.phase = 'clear'; g.phaseT = 210; g.killedBoss = killed;
        for (const e of g.enemies) boom(e.x, e.y, false);
        g.enemies = []; g.ebul = []; g.queue = [];
        if (killed) snd.clear();
      }

      // ---------- player ----------
      function fire() {
        const p = g.p;
        const arm = p.armor;
        if (arm === 'F') {
          // flame thrower: short, wide, rapid; also scorches ground
          for (let i = -1; i <= 1; i++) g.shots.push({ x: p.x + i * 6, y: p.y - 8, vx: i * 0.6, vy: -4.5, dmg: 1, life: 18, flame: true });
          p.cd = 5; au.noise(0.05, { vol: 0.05, freq: 3000 }); return;
        }
        const ll = p.ll, max = arm === 'W' ? 30 : 14 + ll * 4;
        if (g.shots.length >= max) return;
        const laser = ll >= 4;
        const mk = (dx, vx, home) => g.shots.push({ x: p.x + dx, y: p.y - 8, vx, vy: laser ? -8 : -6.5, dmg: laser ? 2 : 1, laser, home, life: 60 });
        if (arm === 'W') { for (let i = -2; i <= 2; i++) mk(i * 3, i * 0.9, false); }
        else if (arm === 'H') { mk(-5, -0.6, true); mk(5, 0.6, true); mk(0, 0, false); }
        else if (ll === 1) { mk(-3, 0); mk(3, 0); }
        else if (ll === 2) { mk(-4, 0); mk(4, 0); mk(0, 0); }
        else { mk(-5, -0.5); mk(-2, 0); mk(2, 0); mk(5, 0.5); }
        p.cd = laser ? 6 : 8 - Math.min(2, ll - 1);
        if (laser) snd.laser(); else snd.shot();
      }
      function missileRange() { return 64 + g.p.ml * 10; }
      function launchMissile() {
        const p = g.p, maxM = 1 + (p.ml >= 3 ? 1 : 0);
        if (g.missiles.length >= maxM) return;
        g.missiles.push({ x0: p.x, y0: p.y - 6, x: p.x, y: p.y - 6, tx: p.x, ty: p.y - missileRange(), t: 0, dur: 22 });
        snd.missile();
      }
      function missileLand(m) {
        const rad = 9 + g.p.ml * 3;
        boom(m.tx, m.ty, false, true); snd.groundBoom();
        hitGround(m.tx, m.ty, rad, 1);
        if (g.boss) hitBoss({ x: m.tx, y: m.ty }, 3);
      }
      function hitGround(x, y, rad, dmg) {
        for (const o of g.ground) {
          if (o.dead) continue;
          const oy = rowY(o.row);
          if (Math.abs(o.x - x) < rad && Math.abs(oy - y) < rad) {
            if (o.kind === 'item') continue;
            o.hp -= dmg;
            if (o.hp <= 0) {
              if (o.kind === 'panel') { o.kind = 'item'; o.item = pickItem(); o.t = 0; snd.reveal(); addScore(100); }
              else {
                o.dead = true; boom(o.x, oy, o.kind === 'silo', true);
                const pts = o.kind === 'turret' ? 300 : o.kind === 'silo' ? 800 : 500;
                addScore(pts); pop(o.x, oy - 8, String(pts));
              }
            }
          }
        }
      }
      function collect(it) {
        const p = g.p;
        if (it === 'K') { p.sl = Math.max(1, p.sl - 1); p.ll = Math.max(1, p.ll - 1); p.ml = Math.max(1, p.ml - 1); snd.kill(); pop(p.x, p.y - 16, 'POWER DOWN', '#ff4040'); return; }
        addScore(500); snd.item();
        if (it === 'S') p.sl = Math.min(5, p.sl + 1);
        else if (it === 'L') p.ll = Math.min(4, p.ll + 1);
        else if (it === 'M') p.ml = Math.min(4, p.ml + 1);
        else if (it === 'E') p.energy = Math.min(32, p.energy + 8);
        else {
          p.parts[it]++;
          if (p.parts[it] >= 3) {
            p.parts[it] = 0;
            if (p.avail.indexOf(it) < 0) p.avail.push(it);
            g.msg = ARMOR_NAME[it] + ' ARMOR READY'; g.msgT = 120; snd.armor();
          }
        }
        pop(p.x, p.y - 16, it === 'E' ? 'ENERGY' : ITEM_NAME[it].split(' ')[0], ITEM_COL[it] === '#404040' ? '#ffffff' : '#ffff80');
      }
      function toggleArmor() {
        const p = g.p;
        if (p.armor) { // cycle to next available or remove
          const i = p.avail.indexOf(p.armor);
          if (p.avail.length > 1) { p.armor = p.avail[(i + 1) % p.avail.length]; snd.armor(); }
          return;
        }
        if (p.avail.length && p.energy >= 4) { p.armor = p.avail[0]; snd.armor(); g.msg = ARMOR_NAME[p.armor] + ' ARMOR'; g.msgT = 90; }
        else au.tone(120, 0.12, { type: 'square', vol: 0.08 });
      }
      function hurtPlayer() {
        const p = g.p;
        if (p.state !== 'alive' || p.inv > 0) return;
        if (p.armor) {
          p.energy -= 8; p.inv = 60; snd.hit(); au.noise(0.2, { vol: 0.15, freq: 4000 });
          if (p.energy <= 0) loseArmor();
          return;
        }
        p.state = 'dead'; p.t = 0; boom(p.x, p.y, true); snd.die();
      }
      function loseArmor() {
        const p = g.p;
        p.energy = 0; boom(p.x, p.y, false);
        const i = p.avail.indexOf(p.armor); if (i >= 0) p.avail.splice(i, 1);
        p.armor = null; g.msg = 'ARMOR LOST'; g.msgT = 90;
      }
      function respawn() {
        const p = g.p, keepE = Math.max(8, p.energy);
        g.p = newPlayer(); g.p.energy = keepE;
        g.ebul = [];
      }
      function playerDied() {
        if (g.reserve > 0) { g.reserve--; respawn(); return; }
        const cg = g;
        const end = () => { if (g === cg) gameOver(); };
        if (!api.offerContinue) { end(); return; }
        g.p.state = 'wait';
        api.offerContinue(() => { if (g === cg) { g.reserve = 2; respawn(); } }, end);
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300; g.p.state = 'gone';
        au.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.08 });
      }

      // ---------- update ----------
      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++; titleScroll += 0.5;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 40 : 24));
        for (const pp of g.pops) { pp.t--; pp.y -= 0.3; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.msgT > 0) g.msgT--;

        if (g.phase === 'over') {
          g.phaseT--; g.scroll += 0.3;
          if (g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; }
          return;
        }
        if (g.phase === 'clear') {
          g.phaseT--; g.scroll += 0.6;
          updPlayerMove();
          if (g.phaseT === 150 && g.killedBoss) { g.clearBonus = 5000; addScore(5000); }
          if (g.phaseT <= 0) nextStage();
          return;
        }
        if (g.phase === 'intro') { g.phaseT--; if (g.phaseT <= 0) g.phase = 'play'; }

        // scroll
        const speed = 0.7;
        g.scroll += speed;
        spawnRows();
        if (g.phase === 'play' && !g.boss && g.scroll >= g.len) { g.phase = 'boss'; spawnBoss(); }

        // waves
        if (g.phase === 'play') {
          if (--g.waveT <= 0) { spawnWave(); g.waveT = Math.max(45, 140 - diff() * 6) + (g.rng() * 60 | 0); }
        }
        for (const q of g.queue) q.t--;
        const due = g.queue.filter(q => q.t <= 0); g.queue = g.queue.filter(q => q.t > 0);
        for (const q of due) q.fn();

        updPlayer();
        updShots();
        updEnemies();
        updGround();
        if (g.boss) updBoss();
        updBullets();
      }
      function updPlayerMove() {
        const p = g.p;
        if (p.state !== 'alive') return;
        const sp = 1.1 + p.sl * 0.35;
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx--; if (api.key('ArrowRight')) dx++;
        if (api.key('ArrowUp')) dy--; if (api.key('ArrowDown')) dy++;
        if (dx && dy) { dx *= 0.75; dy *= 0.75; }
        p.x = clamp(p.x + dx * sp, 9, W - 9); p.y = clamp(p.y + dy * sp, 40, H - 22);
        p.bank = dx;
      }
      function updPlayer() {
        const p = g.p;
        if (p.state === 'dead') { p.t++; if (p.t === 120) playerDied(); return; }
        if (p.state !== 'alive') return;
        updPlayerMove();
        if (p.inv > 0) p.inv--;
        if (p.cd > 0) p.cd--;
        if (api.key('Space') && p.cd <= 0 && g.phase !== 'intro') fire();
        if (api.pressed('KeyX') && g.phase !== 'intro') launchMissile();
        if (api.anyPressed('KeyZ', 'Enter')) toggleArmor();
        if (p.armor) { if (++p.drain >= 100) { p.drain = 0; p.energy--; if (p.energy <= 0) loseArmor(); } }
        // collect items on ground and floating
        for (const o of g.ground) if (o.kind === 'item' && !o.dead) {
          if (Math.abs(o.x - p.x) < 11 && Math.abs(rowY(o.row) - p.y) < 11) { o.dead = true; collect(o.item); }
        }
        for (const it of g.items) if (!it.dead && Math.abs(it.x - p.x) < 11 && Math.abs(it.y - p.y) < 11) { it.dead = true; collect(it.item); }
        // missiles
        for (const m of g.missiles) {
          m.t++; const k = m.t / m.dur;
          m.x = m.x0 + (m.tx - m.x0) * k; m.y = m.y0 + (m.ty - m.y0) * k;
          m.ty += 0.7; // target is on the scrolling ground
          if (m.t >= m.dur) { m.done = true; missileLand(m); }
        }
        g.missiles = g.missiles.filter(m => !m.done);
      }
      function nearestEnemy(x, y) {
        let best = null, bd = 1e9;
        for (const e of g.enemies) { if (e.dead) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
        if (!best && g.boss && g.boss.state === 'fight') best = g.boss;
        return best;
      }
      function updShots() {
        for (const s of g.shots) {
          if (s.home) {
            const t = nearestEnemy(s.x, s.y);
            if (t) { const a = Math.atan2(t.y - s.y, t.x - s.x); s.vx += Math.cos(a) * 0.5; s.vy += Math.sin(a) * 0.5; const m = Math.hypot(s.vx, s.vy); s.vx = s.vx / m * 6; s.vy = s.vy / m * 6; }
          }
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.y < -10 || s.x < -10 || s.x > W + 10 || s.y > H + 10 || s.life <= 0) { s.dead = true; continue; }
          for (const e of g.enemies) {
            if (e.dead || Math.abs(e.x - s.x) > e.w / 2 + 2 || Math.abs(e.y - s.y) > e.h / 2 + 4) continue;
            e.hp -= s.dmg; e.flash = 4;
            if (!s.laser) s.dead = true;
            if (e.hp <= 0) killEnemy(e); else snd.hit();
            if (s.dead) break;
          }
          if (!s.dead && g.boss && hitBoss(s, s.dmg)) s.dead = true;
          if (!s.dead && s.flame && s.life < 3) hitGround(s.x, s.y, 8, 1);
        }
        g.shots = g.shots.filter(s => !s.dead);
      }
      function killEnemy(e) {
        e.dead = true; boom(e.x, e.y, e.kind === 'big'); snd.boom();
        addScore(e.pts); if (e.pts >= 300) pop(e.x, e.y - 6, String(e.pts));
        if (e.kind === 'big') g.items.push({ x: e.x, y: e.y, item: pickItem(), t: 0 });
      }
      function updEnemies() {
        const p = g.p, d = diff();
        for (const e of g.enemies) {
          if (e.dead) continue;
          e.t++; if (e.flash > 0) e.flash--;
          switch (e.kind) {
            case 'dart':
              if (e.y > 60 && p.state === 'alive') e.vx = clamp(e.vx + Math.sign(p.x - e.x) * e.home, -1.4, 1.4);
              if (e.t === 40 && g.rng() < 0.2 + d * 0.03) aimBullet(e.x, e.y, bspd());
              break;
            case 'saucer':
              e.y = e.base + Math.sin(e.t / 14) * e.amp;
              if (e.t % 90 === 45 && g.rng() < 0.3 + d * 0.03) aimBullet(e.x, e.y, bspd());
              break;
            case 'diver':
              if (e.st === 0 && e.y > 40 + (e.t % 30)) {
                e.st = 1; const a = Math.atan2(p.y - e.y, p.x - e.x);
                const s = 2.4 + d * 0.08; e.vx = Math.cos(a) * s; e.vy = Math.max(1.2, Math.sin(a) * s);
                au.tone(900, 0.2, { type: 'square', vol: 0.04, slideTo: 300 });
              }
              break;
            case 'spinner':
              if (e.st === 0 && e.y >= e.ty) { e.st = 1; e.vy = 0; e.cx = e.x; e.cy = e.y; e.t = 0; }
              if (e.st === 1) {
                e.x = e.cx + Math.sin(e.t / 20) * 24; e.y = e.cy + Math.cos(e.t / 20) * 10 - 10;
                if (--e.fire <= 0) { e.fire = Math.max(30, 80 - d * 4); aimBullet(e.x, e.y, bspd()); }
                if (e.t > 200) { e.st = 2; e.vy = 2; }
              }
              break;
            case 'ring':
              if (--e.fire <= 0) { e.fire = 120; if (p.state === 'alive') aimBullet(e.x, e.y, bspd()); }
              if (e.t > 60) e.vy = Math.sin(e.t / 30) * 0.4;
              break;
            case 'big':
              if (e.y > 50) e.vy = 0.25;
              if (--e.fire <= 0) { e.fire = Math.max(45, 90 - d * 4); aimBullet(e.x - 8, e.y + 6, bspd(), -0.15); aimBullet(e.x + 8, e.y + 6, bspd(), 0.15); }
              break;
          }
          e.x += e.vx; e.y += e.vy;
          if (e.y > H + 20 || e.y < -40 || e.x < -30 || e.x > W + 30) e.dead = true;
          if (p.state === 'alive' && Math.abs(e.x - p.x) < e.w / 2 + 5 && Math.abs(e.y - p.y) < e.h / 2 + 5) {
            if (p.inv <= 0) { if (e.kind !== 'big') killEnemy(e); hurtPlayer(); }
          }
        }
        g.enemies = g.enemies.filter(e => !e.dead);
        for (const it of g.items) { it.t++; it.y += 0.5; if (it.y > H + 10) it.dead = true; }
        g.items = g.items.filter(it => !it.dead);
      }
      function updGround() {
        const p = g.p, d = diff();
        for (const o of g.ground) {
          if (o.dead) continue;
          const y = rowY(o.row);
          if (y > H + 16) { o.dead = true; continue; }
          if (y < 24 || y > H - 40) continue;
          if (o.kind === 'turret') {
            o.ang = Math.atan2(p.y - y, p.x - o.x);
            if (--o.cd <= 0) { o.cd = Math.max(50, 140 - d * 6) + (g.rng() * 40 | 0); if (p.state === 'alive') aimBullet(o.x, y, bspd() * 0.9); }
          } else if (o.kind === 'silo') {
            if (--o.cd <= 0) { o.cd = Math.max(80, 180 - d * 6); mkEnemy('diver', o.x, y, { vy: -0.6, pts: 200, w: 12, h: 8, st: 0, t: 0 }); au.tone(200, 0.2, { type: 'square', vol: 0.05, slideTo: 600 }); }
          }
        }
        g.ground = g.ground.filter(o => !o.dead);
      }
      function updBullets() {
        const p = g.p;
        for (const b of g.ebul) {
          b.x += b.vx; b.y += b.vy;
          if (b.x < -6 || b.x > W + 6 || b.y < -6 || b.y > H + 6) { b.dead = true; continue; }
          if (p.state === 'alive' && Math.abs(b.x - p.x) < 4 && Math.abs(b.y - p.y) < 5) { b.dead = true; hurtPlayer(); }
        }
        g.ebul = g.ebul.filter(b => !b.dead);
      }

      // ---------- render ----------
      function drawBG(ctx, scroll, stage) {
        const r0 = Math.floor(scroll / TS), r1 = Math.floor((scroll + H) / TS) + 1;
        for (let r = r0; r <= r1; r++) {
          const y = Math.round(H - (r * TS - scroll) - TS);
          const reg = region(stage, r), set = tiles[reg];
          for (let c = 0; c < 14; c++) {
            let v = hash(r, c, stage) * (reg === 'land' ? 5 : 4) | 0;
            if (v > 3) v = reg === 'land' ? 3 : 0;
            if (reg === 'land' && v === 3 && hash(c, r, 99) > 0.3) v = 0;
            ctx.drawImage(set[v], c * TS, y);
          }
          // region border trim
          const nreg = region(stage, r + 1);
          if (nreg !== reg && reg !== 'space' && nreg !== 'space') { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y - 2, W, 2); }
          if (reg !== 'space' && nreg === 'space') { ctx.fillStyle = '#c8c8d0'; ctx.fillRect(0, y, W, 1); ctx.fillStyle = '#505060'; ctx.fillRect(0, y + 1, W, 2); }
          if (reg === 'space' && nreg !== 'space') { ctx.fillStyle = '#202028'; ctx.fillRect(0, y - 3, W, 3); }
        }
      }
      function drawGroundObj(ctx, o) {
        const y = Math.round(rowY(o.row)), x = o.x;
        if (y < -10 || y > H + 10) return;
        if (o.kind === 'turret') {
          ctx.fillStyle = '#303038'; ctx.fillRect(x - 7, y - 7, 14, 14);
          ctx.fillStyle = '#9098a8'; ctx.fillRect(x - 6, y - 6, 12, 12);
          ctx.fillStyle = '#c03020'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
          ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(o.ang) * 8, y + Math.sin(o.ang) * 8); ctx.stroke();
        } else if (o.kind === 'panel') {
          ctx.fillStyle = '#202020'; ctx.fillRect(x - 7, y - 7, 15, 15);
          ctx.fillStyle = '#d0c070'; ctx.fillRect(x - 7, y - 7, 14, 14);
          ctx.fillStyle = '#806820'; ctx.fillRect(x - 5, y - 5, 10, 10);
          ctx.fillStyle = '#f0e090'; ctx.fillRect(x - 3, y - 3, 6, 6);
        } else if (o.kind === 'item') {
          o.t = (o.t || 0) + 1;
          const blink = (o.t >> 3) & 1;
          ctx.fillStyle = '#000'; ctx.fillRect(x - 7, y - 7, 14, 14);
          ctx.fillStyle = ITEM_COL[o.item]; ctx.fillRect(x - 6, y - 6, 12, 12);
          text(ctx, o.item, x - 2, y - 3, blink ? '#ffffff' : '#ffff60', { bold: true });
        } else if (o.kind === 'silo') {
          ctx.fillStyle = '#202020'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
          ctx.fillStyle = '#a07040'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
          ctx.fillStyle = (o.cd < 20 && (frame & 4)) ? '#ff4020' : '#301810'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
        } else if (o.kind === 'dome') {
          ctx.fillStyle = '#204060'; ctx.fillRect(x - 7, y - 4, 14, 9);
          ctx.fillStyle = '#40a0e0'; ctx.beginPath(); ctx.arc(x, y, 6, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#c0f0ff'; ctx.fillRect(x - 2, y - 4, 2, 2);
        }
      }
      function drawShip(ctx, p) {
        const im = p.armor ? SP.armor[p.armor] : SP.ship;
        ctx.drawImage(im, Math.round(p.x - 8), Math.round(p.y - 7));
        if (p.armor) { // armour attachments
          ctx.fillStyle = p.armor === 'W' ? '#ffc000' : p.armor === 'F' ? '#ff4040' : '#40ffc0';
          ctx.fillRect(Math.round(p.x - 12), Math.round(p.y - 1), 3, 7); ctx.fillRect(Math.round(p.x + 9), Math.round(p.y - 1), 3, 7);
        }
        const fl = (frame >> 1) & 1;
        ctx.fillStyle = fl ? '#ffe040' : '#ff6000';
        ctx.fillRect(Math.round(p.x - 4), Math.round(p.y + 7), 2, 2 + fl * 2); ctx.fillRect(Math.round(p.x + 2), Math.round(p.y + 7), 2, 2 + fl * 2);
      }
      function drawBoom(ctx, b) {
        const n = b.big ? 40 : 24, k = b.t / n, R = (b.big ? 22 : 11) * Math.min(1, k * 1.6);
        const cols = b.ground ? ['#ffffff', '#ffd040', '#ff6020', '#603018'] : ['#ffffff', '#ffff60', '#ff8020', '#c02020'];
        const ci = Math.min(3, Math.floor(k * 4));
        if (k < 0.3) { ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(b.x, b.y, R * 0.8, 0, 7); ctx.fill(); }
        const rays = b.big ? 16 : 10;
        for (let i = 0; i < rays; i++) {
          const a = i / rays * Math.PI * 2 + (i & 1) * 0.3, rr = R * (i & 1 ? 0.7 : 1);
          ctx.fillStyle = cols[Math.min(3, ci + (i & 1))];
          ctx.fillRect(Math.round(b.x + Math.cos(a) * rr) - 1, Math.round(b.y + Math.sin(a) * rr) - 1, 2 + (b.big ? 1 : 0), 2 + (b.big ? 1 : 0));
          ctx.fillStyle = cols[Math.min(3, ci)];
          ctx.fillRect(Math.round(b.x + Math.cos(a) * rr * 0.5), Math.round(b.y + Math.sin(a) * rr * 0.5), 2, 2);
        }
        if (b.ground && k > 0.5) { ctx.fillStyle = 'rgba(20,10,0,0.5)'; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, 7); ctx.fill(); }
      }
      function drawEnemy(ctx, e) {
        if (e.kind === 'spinner') {
          const a = e.t * 0.2;
          ctx.fillStyle = e.flash ? '#ffffff' : '#30ff60'; ctx.beginPath(); ctx.arc(e.x, e.y, 6, 0, 7); ctx.fill();
          ctx.fillStyle = '#106020'; ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, 7); ctx.fill();
          ctx.fillStyle = '#ffff40';
          for (let i = 0; i < 4; i++) { const b = a + i * Math.PI / 2; ctx.fillRect(Math.round(e.x + Math.cos(b) * 7) - 1, Math.round(e.y + Math.sin(b) * 7) - 1, 3, 3); }
          return;
        }
        let im = SP[e.kind];
        if (e.kind === 'big' && e.flash) im = SP.bigHit;
        ctx.drawImage(im, Math.round(e.x - im.width / 2), Math.round(e.y - im.height / 2));
        if (e.flash && e.kind !== 'big') { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(Math.round(e.x - im.width / 2), Math.round(e.y - im.height / 2), im.width, im.height); }
      }
      function drawBoss(ctx, b) {
        const x = Math.round(b.x), y = Math.round(b.y), hue = HUES[(g.stage + 5) % 12];
        const hull = b.flash ? '#ffffff' : 'hsl(' + hue + ',35%,45%)', dark = 'hsl(' + hue + ',40%,22%)', light = 'hsl(' + hue + ',40%,70%)';
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.moveTo(x - 56, y + 4); ctx.lineTo(x - 30, y - 20); ctx.lineTo(x + 30, y - 20); ctx.lineTo(x + 56, y + 4); ctx.lineTo(x + 40, y + 18); ctx.lineTo(x - 40, y + 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = hull;
        ctx.beginPath(); ctx.moveTo(x - 52, y + 3); ctx.lineTo(x - 28, y - 18); ctx.lineTo(x + 28, y - 18); ctx.lineTo(x + 52, y + 3); ctx.lineTo(x + 38, y + 15); ctx.lineTo(x - 38, y + 15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = light; ctx.fillRect(x - 28, y - 18, 56, 2);
        ctx.fillStyle = dark; for (let i = -3; i <= 3; i++) ctx.fillRect(x + i * 12 - 1, y - 14, 2, 26);
        // wings
        ctx.fillStyle = dark; ctx.fillRect(x - 62, y - 2, 10, 14); ctx.fillRect(x + 52, y - 2, 10, 14);
        // guns
        for (let i = 0; i < 2; i++) {
          const gx = x + (i ? 40 : -40), gy = y + 8;
          if (b.guns[i] > 0) { ctx.fillStyle = '#303030'; ctx.fillRect(gx - 6, gy - 6, 12, 12); ctx.fillStyle = '#e04020'; ctx.fillRect(gx - 4, gy - 4, 8, 8); ctx.fillStyle = '#ffd040'; ctx.fillRect(gx - 1, gy + 2, 2, 6); }
          else { ctx.fillStyle = '#201008'; ctx.fillRect(gx - 5, gy - 5, 10, 10); }
        }
        // core
        const pulse = (frame >> 2) & 3;
        ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill();
        ctx.fillStyle = ['#ff2020', '#ff8020', '#ffff40', '#ff8020'][pulse]; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 4, 3, 3);
        // exhaust
        ctx.fillStyle = (frame & 2) ? '#40c0ff' : '#ffffff';
        ctx.fillRect(x - 30, y - 24, 4, 4); ctx.fillRect(x + 26, y - 24, 4, 4);
      }
      function drawHUD(ctx) {
        const sc = g ? g.score : 0;
        if (mode === 'title' || ((frame >> 4) & 1)) text(ctx, '1UP', 16, 2, '#ff4040', { bold: true });
        text(ctx, String(sc).padStart(6, ' '), 96, 2, '#ffffff', { right: true, bold: true });
        text(ctx, 'HI', 120, 2, '#ff4040', { bold: true });
        text(ctx, String(hi), 208, 2, '#ffffff', { right: true, bold: true });
      }
      function drawBottom(ctx) {
        const p = g.p;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, H - 14, W, 14);
        for (let i = 0; i < Math.min(4, g.reserve); i++) { ctx.drawImage(SP.ship, 2 + i * 13, H - 14, 11, 10); }
        text(ctx, 'S' + p.sl, 58, H - 11, '#60a0ff', { adv: 6 });
        text(ctx, 'L' + p.ll, 76, H - 11, '#ff6060', { adv: 6 });
        text(ctx, 'M' + p.ml, 94, H - 11, '#60ff80', { adv: 6 });
        text(ctx, 'E', 114, H - 11, '#ffd040', { adv: 6 });
        ctx.fillStyle = '#303030'; ctx.fillRect(122, H - 10, 34, 6);
        ctx.fillStyle = p.energy < 8 ? '#ff4040' : '#ffd040'; ctx.fillRect(123, H - 9, p.energy, 4);
        // armour parts / available
        let x = 162;
        for (const k of ['W', 'F', 'H']) {
          const have = p.avail.indexOf(k) >= 0;
          ctx.fillStyle = have ? ITEM_COL[k] : '#202020'; ctx.fillRect(x, H - 12, 18, 10);
          text(ctx, k, x + 2, H - 11, p.armor === k ? '#ffffff' : '#c0c0c0', { adv: 6 });
          for (let i = 0; i < 2; i++) { ctx.fillStyle = i < p.parts[k] ? '#ffffff' : '#505050'; ctx.fillRect(x + 10 + i * 4, H - 7, 3, 3); }
          x += 20;
        }
        text(ctx, 'STAGE ' + g.stage, W - 4, 12, '#a0a0ff', { right: true, adv: 6 });
      }
      function drawTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
        const page = Math.floor(titleT / 420) % 3;
        // logo
        const ly = 40;
        text(ctx, 'ALPHA', W / 2 + 2, ly + 2, '#400000', { center: true, scale: 4, bold: true });
        text(ctx, 'MISSION', W / 2 + 2, ly + 34, '#000040', { center: true, scale: 3, bold: true });
        const bands = [[0, 9, '#ffe080'], [9, 18, '#ff8020'], [18, 28, '#e02010']];
        for (const [a, b, c] of bands) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + a, W, b - a); ctx.clip(); text(ctx, 'ALPHA', W / 2, ly, c, { center: true, scale: 4, bold: true }); ctx.restore(); }
        const bands2 = [[0, 7, '#c0f0ff'], [7, 14, '#40a0ff'], [14, 22, '#2050e0']];
        for (const [a, b, c] of bands2) { ctx.save(); ctx.beginPath(); ctx.rect(0, ly + 32 + a, W, b - a); ctx.clip(); text(ctx, 'MISSION', W / 2, ly + 32, c, { center: true, scale: 3, bold: true }); ctx.restore(); }
        if (page === 0) {
          ctx.drawImage(SP.ship, W / 2 - 8, 120);
          text(ctx, 'DEFEND THE ALPHA SYSTEM', W / 2, 150, '#ffffff', { center: true });
          text(ctx, 'SPACE: AIR   X: GROUND', W / 2, 168, '#a0d0ff', { center: true, adv: 7 });
          text(ctx, 'Z/ENTER: ARMOR', W / 2, 180, '#a0d0ff', { center: true, adv: 7 });
          text(ctx, 'EXTEND 50000 / 100000', W / 2, 198, '#ffff60', { center: true, adv: 7 });
        } else if (page === 1) {
          text(ctx, '- POWER UP -', W / 2, 108, '#40ffff', { center: true, bold: true });
          const ks = ['S', 'L', 'M', 'E', 'K', 'W', 'F', 'H'];
          ks.forEach((k, i) => {
            const y = 124 + i * 13;
            ctx.fillStyle = ITEM_COL[k]; ctx.fillRect(28, y - 2, 11, 11);
            text(ctx, k, 31, y, '#ffffff', { bold: true });
            text(ctx, ITEM_NAME[k], 48, y, k === 'K' ? '#ff6060' : '#ffffff', { adv: 7 });
          });
          text(ctx, '3 PARTS = 1 ARMOR', W / 2, 232, '#ffff60', { center: true, adv: 7 });
        } else {
          text(ctx, '- SCORE -', W / 2, 108, '#40ffff', { center: true, bold: true });
          const rows = [['dart', '100'], ['saucer', '150'], ['diver', '200'], ['ring', '200'], ['big', '1000']];
          rows.forEach((r, i) => { const im = SP[r[0]]; ctx.drawImage(im, 70 - im.width / 2, 124 + i * 18); text(ctx, r[1] + ' PTS', 100, 126 + i * 18, '#ffffff'); });
          text(ctx, 'TURRET 300  SILO 800', W / 2, 220, '#ffd040', { center: true, adv: 7 });
          text(ctx, 'HI SCORE ' + hi, W / 2, 236, '#ff8080', { center: true });
        }
        if (api.credits === 0) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', W / 2, 252, coinFlash > 0 && ((frame >> 2) & 1) ? '#ffff00' : '#ff4040', { center: true, bold: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 252, '#ffffff', { center: true, bold: true });
        text(ctx, '\u00a9 1985 SNK', W / 2, 266, '#c0c0c0', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 8, H - 10, '#ffffff', { adv: 7 });
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') {
          if (!tiles) buildTiles(1);
          drawBG(ctx, titleScroll, 1);
          drawTitle(ctx); drawHUD(ctx);
          return;
        }
        drawBG(ctx, g.scroll, g.stage);
        for (const o of g.ground) drawGroundObj(ctx, o);
        for (const b of g.booms) if (b.ground) drawBoom(ctx, b);
        const p = g.p;
        // missile reticle
        if (p.state === 'alive' && g.phase !== 'clear') {
          const ty = Math.round(p.y - missileRange()), tx = Math.round(p.x);
          ctx.fillStyle = (frame & 8) ? '#ffffff' : '#ff4040';
          ctx.fillRect(tx - 6, ty, 4, 1); ctx.fillRect(tx + 3, ty, 4, 1); ctx.fillRect(tx, ty - 6, 1, 4); ctx.fillRect(tx, ty + 3, 1, 4);
        }
        for (const m of g.missiles) {
          const k = m.t / m.dur, s = Math.max(1, Math.round(4 - k * 3));
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(m.x - s / 2), Math.round(m.y - s), s, s * 2);
          ctx.fillStyle = '#ff8000'; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y + s), 2, 2);
        }
        for (const it of g.items) {
          const x = Math.round(it.x), y = Math.round(it.y);
          ctx.fillStyle = (it.t >> 2) & 1 ? '#ffffff' : ITEM_COL[it.item]; ctx.fillRect(x - 6, y - 6, 12, 12);
          ctx.fillStyle = ITEM_COL[it.item]; ctx.fillRect(x - 5, y - 5, 10, 10);
          text(ctx, it.item, x - 2, y - 3, '#ffffff', { bold: true });
        }
        if (g.boss) drawBoss(ctx, g.boss);
        for (const e of g.enemies) drawEnemy(ctx, e);
        for (const s of g.shots) {
          if (s.flame) { ctx.fillStyle = (s.life & 2) ? '#ffff60' : '#ff6020'; const r = 2 + (18 - s.life) * 0.25; ctx.fillRect(Math.round(s.x - r), Math.round(s.y - r), r * 2, r * 2); }
          else if (s.laser) { ctx.fillStyle = '#80ffff'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 6, 2, 12); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(s.x), Math.round(s.y) - 6, 1, 12); }
          else { ctx.fillStyle = s.home ? '#60ff60' : '#ffff80'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 3, 2, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 3, 2, 2); }
        }
        if (p.state === 'alive' && (p.inv <= 0 || (frame & 2))) drawShip(ctx, p);
        for (const b of g.booms) if (!b.ground) drawBoom(ctx, b);
        for (const b of g.ebul) {
          ctx.fillStyle = (frame & 4) ? '#ff60ff' : '#ffffff';
          ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 1, 4, 2); ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 2, 4);
        }
        for (const pp of g.pops) text(ctx, pp.txt, pp.x, pp.y, pp.col, { center: true, adv: 6 });
        // boss bar
        if (g.boss && g.boss.state === 'fight') {
          const b = g.boss;
          ctx.fillStyle = '#400000'; ctx.fillRect(40, 14, 144, 4);
          ctx.fillStyle = '#ff3030'; ctx.fillRect(40, 14, Math.max(0, 144 * b.hp / b.max), 4);
          text(ctx, 'TIME ' + Math.ceil(b.timer / 60), W / 2, 22, '#ffffff', { center: true, adv: 6 });
        }
        // messages
        if (g.phase === 'intro') {
          text(ctx, 'STAGE ' + g.stage + (g.loop ? '-' + (g.loop + 1) : ''), W / 2, 120, '#40ffff', { center: true, bold: true, scale: 1 });
          if (g.phaseT < 100) text(ctx, 'READY', W / 2, 136, '#ff4040', { center: true, bold: true });
        }
        if (g.msgT > 0 && ((g.msg !== 'WARNING') || ((frame >> 3) & 1))) text(ctx, g.msg, W / 2, 100, g.msg === 'WARNING' ? '#ff2020' : '#ffff40', { center: true, bold: true, scale: g.msg === 'WARNING' ? 2 : 1 });
        if (g.phase === 'clear') {
          text(ctx, 'STAGE ' + g.stage + ' CLEAR', W / 2, 110, '#40ffff', { center: true, bold: true });
          if (g.killedBoss && g.phaseT < 150) text(ctx, 'BONUS ' + (g.clearBonus || 5000), W / 2, 130, '#ffff40', { center: true, bold: true });
        }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 130, '#ff4040', { center: true, bold: true, scale: 2 });
        drawHUD(ctx);
        drawBottom(ctx);
      }
      if (api.debugHook) api.debugHook({ g: () => g });
      return { update, render, destroy() { } };
    }
  });
})();
