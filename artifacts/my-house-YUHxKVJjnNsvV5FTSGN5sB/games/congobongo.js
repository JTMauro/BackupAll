// Congo Bongo (Sega, 1983) \u2014 from-scratch isometric recreation for the MAME32 Game Room.
// Climb four jungle scenes to the ape Bongo: Primate Peak, Snake Lake, Rhino Ridge and Lazy Lagoon.
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
    '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '\u00a9': [14, 17, 23, 25, 23, 17, 14]
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
  function flipSpr(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c;
  }
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');
  const rnd = (a, b) => a + Math.random() * (b - a);

  const W = 224, H = 256, X0 = 112, Y0 = 120, N = 11, BASE = -26;
  const VOID = -999, WATERZ = -3, G = 0.18, JUMP = 2.3;
  function S(x, y, z) { return [X0 + (x - y) * 10, Y0 + (x + y) * 5 - z]; }

  // ---------- scenes ----------
  const SCENES = [
    { name: 'PRIMATE PEAK', map: ['7776543....', '77765432...', '777554321..', '6655333210.', '55443222100', '44432211100', '33332110000', '.2221100000', '..111000000', '...00000000', '....0000000'],
      start: [8.5, 9.5], bongo: [1.5, 1.5], top: ['#3cb030', '#33a02a'], face: ['#9a6428', '#6e4414'], stripe: '#5a3410' },
    { name: 'SNAKE LAKE', map: ['44433322...', '444332221..', '3333221111.', '22222111111', '11111100000', '~~~~00~0~~~', '~~000~~00~~', '~~0~~~~~0~~', '00000000000', '00000000000', '00000000000'],
      start: [5.5, 9.5], bongo: [1.5, 1.5], top: ['#58c040', '#4cb038'], face: ['#8a6a38', '#6a4a20'], stripe: '#4a3010' },
    { name: 'RHINO RIDGE', map: ['33333333333', '333d3333d33', '33333d33333', '22222222222', '2c22222c222', '222c22222c2', '11111111111', '1111b1111b1', '1b1111b1111', '00000000000', '00000000000'],
      start: [5.5, 10.2], bongo: [5.5, 0.5], top: ['#d0b058', '#c4a44c'], face: ['#a07838', '#7a5424'], stripe: '#5a3c18' },
    { name: 'LAZY LAGOON', map: ['22222222222', '22222222222', '11111111111', '00000000000', '~~~~~~~~~~~', '~~~~~~~~~~~', '~~~~~~~~~~~', '~~~~~~~~~~~', '00000000000', '00000000000', '00000000000'],
      start: [5.5, 9.5], bongo: [5.5, 0.5], top: ['#40b848', '#36a83e'], face: ['#8a6a38', '#6a4a20'], stripe: '#4a3010' }
  ];

  ArcadeRegistry.register({
    id: 'congobongo', title: 'Congo Bongo', year: 1983, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk (Up+Right / Up+Left etc. follow the paths) \u00b7 Space: jump \u00b7 Enter: start',
    marquee: { bg: '#082008', fg: '#ffb020', accent: '#40d040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'attract', at = 0, coinFlash = 0, frame = 0, lastCred = api.credits;
      let g = null;

      // ---------- sprites ----------
      const PAL_P = { H: '#f0e0a0', h: '#c0a860', S: '#ffb890', K: '#202020', C: '#e8d070', c: '#b89838', B: '#704010', P: '#806030', D: '#402008', R: '#ff3020' };
      const HUNTER = [
        ['...hHHh...', '..HHHHHH..', '.hHHHHHHh.', '...SSSS...', '...SKSK...', '....SS....', '..CCCCCC..', '.SCCRCCCS.', '.S.CCCC.S.', '...BBBB...', '...PPPP...', '..PP..PP..', '..PP..PP..', '..DD..DD..'],
        ['...hHHh...', '..HHHHHH..', '.hHHHHHHh.', '...SSSS...', '...SKSK...', '....SS....', '..CCCCCC..', 'SSCCRCCC..', '...CCCC.SS', '...BBBB...', '...PPPP...', '...PPPP...', '..PP..PP..', '.DD....DD.'],
        ['...hHHh...', '..HHHHHH..', '.hHHHHHHh.', '...SSSS...', '...SKSK...', '.S..SS..S.', '.SCCCCCCS.', '..CCRCCC..', '...CCCC...', '...BBBB...', '..PPPPPP..', '.PP....PP.', '.DD....DD.', '..........']];
      const SP_P = HUNTER.map(r => spr(r, PAL_P)), SP_PF = SP_P.map(flipSpr);
      const PAL_B = { B: '#6a3a14', b: '#4a2408', F: '#e0a070', W: '#ffffff', K: '#000000', N: '#3a1a08', M: '#e02020', T: '#c08050' };
      const BONGO = [[
        '.......bbbbbb.......', '......bBBBBBBb......', '.....bBFFFFFFBb.....', '.....BFWKFFKWFB.....', '.....BFFFFFFFFB.....', '.....bBFNNNNFBb.....',
        '...bbBBFFMMFFBBbb...', '..bBBBBBFFFFBBBBBb..', '.bBBb.BBBTTBBB.bBBb.', '.BBb..BBTTTTBB..bBB.', '.BB...BTTTTTTB...BB.', '.FF...BTTTTTTB...FF.',
        '.FF...BBTTTTBB...FF.', '......BBBBBBBB......', '.....bBBBBBBBBb.....', '.....BBBb..bBBB.....', '....bBBB....BBBb....', '....FFFF....FFFF....'], [
        'FF.....bbbbbb.....FF', 'BB....bBBBBBBb....BB', 'BBb..bBFFFFFFBb..bBB', '.BBb.BFWKFFKWFB.bBB.', '..BBbBFFFFFFFFBbBB..', '...BBbBFNNNNFBbBB...',
        '....BBBFFMMFFBBB....', '.....BBBFFFFBBB.....', '......BBBTTBBB......', '......BBTTTTBB......', '......BTTTTTTB......', '......BTTTTTTB......',
        '......BBTTTTBB......', '......BBBBBBBB......', '.....bBBBBBBBBb.....', '.....BBBb..bBBB.....', '....bBBB....BBBb....', '....FFFF....FFFF....']];
      const SP_B = BONGO.map(r => spr(r, PAL_B));
      const PAL_M = { B: '#a05a20', F: '#f0c090', K: '#000' };
      const MONKEY = [['..BBB...', '.BFFB...', '.BFKF..B', '..BBB..B', '.BBBBBB.', 'B.BBB...', '..B.B...', '.BB.BB..'],
        ['..BBB...', '.BFFB...', '.BFKF...', '..BBB.B.', 'BBBBBB.B', '..BBB...', '.B...B..', 'BB...BB.']];
      const SP_M = MONKEY.map(r => spr(r, PAL_M)), SP_MF = SP_M.map(flipSpr);
      const SP_COCO = spr(['.bBBb.', 'bBBhBb', 'BBBBhB', 'BBBBBB', 'bBBBBb', '.bBBb.'], { B: '#7a4a1a', b: '#5a3008', h: '#c09060' });
      const PAL_R = { G: '#909098', g: '#606068', W: '#f0f0f0', K: '#000' };
      const RHINO = [[
        '..................W...', '...............W.WW...', '.....gggggggg..gWWg...', '...gGGGGGGGGGgGGGGg...', '..gGGGGGGGGGGGGGKGGg..', '.gGGGGGGGGGGGGGGGGGGGg',
        '.gGGGGGGGGGGGGGGGGGGg.', '.gGGGGGGGGGGGGGGGGgg..', '..gGGGGGGGGGGGGGGg....', '..GG.GG.....GG.GG.....', '..GG.GG.....GG.GG.....', '.ggg.ggg...ggg.ggg....'], [
        '..................W...', '...............W.WW...', '.....gggggggg..gWWg...', '...gGGGGGGGGGgGGGGg...', '..gGGGGGGGGGGGGGKGGg..', '.gGGGGGGGGGGGGGGGGGGGg',
        '.gGGGGGGGGGGGGGGGGGGg.', '.gGGGGGGGGGGGGGGGGgg..', '..gGGGGGGGGGGGGGGg....', '...GG.GG...GG.GG......', '..GG...GG.GG...GG.....', '.gg.....ggg.....gg....']];
      const SP_R = RHINO.map(r => spr(r, PAL_R)), SP_RF = SP_R.map(flipSpr);
      const SP_HIPPO = spr([
        '..gg..........gg..', '.gPPg........gPPg.', '.gPPPPPPPPPPPPPPg..', 'gPPPPPPPPPPPPPWKPPg', 'gPPPPPPPPPPPPPPPPPPg', 'gPPPPPPPPPPPPPPPpPPg', '.gPPPPPPPPPPPPPPPPg.', '..gggggggggggggggg..'],
        { P: '#9070a0', p: '#402040', g: '#604878', W: '#ffffff', K: '#000' });
      const SP_FISH = spr(['..OO....', '.OOOO..O', 'OKOOOOOO', '.OOOO..O', '..OO....'], { O: '#ff8020', K: '#000' });

      const S_ = {
        jump() { au.tone(400, 0.12, { type: 'square', vol: 0.08, slideTo: 800 }); },
        land() { au.tone(150, 0.04, { type: 'triangle', vol: 0.08 }); },
        step() { au.tone(200 + Math.random() * 40, 0.025, { type: 'triangle', vol: 0.05 }); },
        bonus() { au.tone(1200, 0.06, { type: 'square', vol: 0.07, slideTo: 1800 }); },
        die() { au.melody([[440, .1], [415, .1], [392, .1], [370, .1], [349, .1], [330, .1], [311, .1], [294, .3]], { type: 'square', vol: 0.1 }); },
        splash() { au.noise(0.5, { vol: 0.2, freq: 3000, slideTo: 300 }); },
        thump() { au.tone(90, 0.12, { type: 'square', vol: 0.12, slideTo: 60 }); },
        throw_() { au.tone(300, 0.15, { type: 'sawtooth', vol: 0.06, slideTo: 150 }); },
        roar() { au.noise(0.4, { vol: 0.12, freq: 600, slideTo: 200 }); au.tone(110, 0.4, { type: 'sawtooth', vol: 0.08, slideTo: 80 }); },
        monkey() { au.tone(1800, 0.05, { type: 'square', vol: 0.05 }); au.tone(2200, 0.05, { type: 'square', vol: 0.05, delay: 0.06 }); },
        rhino() { au.noise(0.6, { vol: 0.1, freq: 300 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[262, .12], [330, .12], [392, .12], [330, .12], [392, .12], [523, .3]], { type: 'square', vol: 0.1 }); },
        extra() { au.melody([[1047, .06], [1319, .06], [1568, .12]], { type: 'square', vol: 0.08 }); }
      };

      // ---------- terrain ----------
      function cell(i, j) {
        if (!g || i < 0 || j < 0 || i >= N || j >= N) return { z: VOID, k: 'void' };
        const c = g.sc.map[j][i];
        if (c === '.') return { z: VOID, k: 'void' };
        if (c === '~') return { z: WATERZ, k: 'water' };
        if (c >= 'a' && c <= 'h') return { z: (c.charCodeAt(0) - 97) * 8 - 13, k: 'hole', rim: (c.charCodeAt(0) - 97) * 8 };
        return { z: (+c) * 8, k: 'land' };
      }
      function tileAt(x, y) { return cell(Math.floor(x), Math.floor(y)); }
      function groundAt(x, y) {
        const t = tileAt(x, y);
        let best = { z: t.z, k: t.k, p: null };
        if (g.plats) for (const p of g.plats) {
          if (!p.up) continue;
          if (Math.abs(x - p.x) < p.len / 2 + 0.05 && Math.abs(y - p.y) < 0.52 && p.top > best.z) best = { z: p.top, k: 'plat', p };
        }
        return best;
      }

      // ---------- game ----------
      function newGame() {
        g = { score: 0, lives: 3, loop: 0, scene: 0, extra: false };
        startScene(0);
        S_.start();
      }
      function startScene(n) {
        g.scene = n; g.sc = SCENES[n];
        resetActors();
        g.phase = 'intro'; g.phaseT = 150;
      }
      function resetActors() {
        const sc = g.sc;
        g.p = { x: sc.start[0], y: sc.start[1], z: 0, vz: 0, air: false, take: 0, face: -1, walk: 0, mon: 0, dead: false, deadT: 0, kind: '' };
        g.p.z = groundAt(g.p.x, g.p.y).z;
        g.cocos = []; g.monkeys = []; g.snakes = []; g.rhinos = []; g.plats = []; g.fish = []; g.pops = []; g.splashes = [];
        g.bongo = { x: sc.bongo[0], y: sc.bongo[1], z: cell(Math.floor(sc.bongo[0]), Math.floor(sc.bongo[1])).z, arms: 0, t: 0, jumpZ: 0, gone: false };
        g.throwT = 120; g.monT = 300; g.lanes = null;
        g.bonus = 4000 + Math.min(g.loop, 4) * 500; g.bonusT = 0;
        const L = g.loop;
        if (g.scene === 1) {
          g.snakes.push({ x: 0.5, y: 4.5, ax: 'x', a: 0.5, b: 9.5, d: 1, sp: 0.022 + L * 0.004 });
          g.snakes.push({ x: 9.0, y: 2.5, ax: 'x', a: 1.5, b: 9.0, d: -1, sp: 0.02 + L * 0.004 });
          g.snakes.push({ x: 5.5, y: 0.5, ax: 'y', a: 0.5, b: 3.5, d: 1, sp: 0.016 + L * 0.004 });
          g.snakes.push({ x: 1.0, y: 8.5, ax: 'x', a: 0.5, b: 10.5, d: 1, sp: 0.018 + L * 0.003 });
          // a lily pad drifting across the lake as a shortcut
          g.plats.push({ x: 2, y: 5.5, len: 1, vx: 0.012, kind: 'lily', top: 0, up: true, wrap: true });
          g.plats.push({ x: 7, y: 7.5, len: 1, vx: -0.012, kind: 'lily', top: 0, up: true, wrap: true });
        }
        if (g.scene === 2) {
          g.lanes = [1, 2, 4, 5, 7, 8].map((y, i) => ({ y: y + 0.5, d: i % 2 ? -1 : 1, t: 60 + i * 50 + rnd(0, 80), warn: 0 }));
        }
        if (g.scene === 3) {
          const rows = [{ y: 4.5, k: 'hippo', vx: 0.016 }, { y: 5.5, k: 'lily', vx: -0.022 }, { y: 6.5, k: 'hippo', vx: -0.014 }, { y: 7.5, k: 'lily', vx: 0.026 }];
          rows.forEach((r, ri) => {
            const n = r.k === 'hippo' ? 3 : 4, sp = 15 / n;
            for (let i = 0; i < n; i++) {
              const len = r.k === 'hippo' ? 1.7 : (i % 2 ? 1 : 2);
              g.plats.push({ x: -2 + i * sp + ri * 1.3, y: r.y, len, vx: r.vx * (1 + L * 0.15), kind: r.k, top: r.k === 'hippo' ? 2 : 0, up: true, wrap: true, cyc: rnd(0, 400), base: r.k === 'hippo' ? 2 : 0 });
            }
          });
          g.fishT = 200;
        }
      }
      function addScore(n, x, y, z) {
        g.score += n;
        if (!g.extra && g.score >= 10000) { g.extra = true; g.lives++; S_.extra(); }
        if (g.score > hi) hi = g.score;
        if (x != null) g.pops.push({ x, y, z, n, t: 50 });
      }
      function kill(kind) {
        const p = g.p; if (p.dead) return;
        p.dead = true; p.deadT = 150; p.kind = kind;
        if (kind === 'drown') S_.splash(); else S_.thump();
        S_.die();
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
      }
      function afterDeath() {
        g.lives--;
        if (g.lives > 0) { resetActors(); g.phase = 'intro'; g.phaseT = 90; return; }
        if (api.offerContinue) {
          g.phase = 'wait';
          const cg = g;
          api.offerContinue(() => { if (g === cg) { g.lives = 3; g.score = 0; resetActors(); g.phase = 'intro'; g.phaseT = 90; } }, () => { if (g === cg) gameOver(); });
        } else gameOver();
      }

      function inputDir() {
        const u = api.key('ArrowUp'), d = api.key('ArrowDown'), l = api.key('ArrowLeft'), r = api.key('ArrowRight');
        let dx = 0, dy = 0;
        if (u && r) dy = -1; else if (u && l) dx = -1; else if (d && r) dx = 1; else if (d && l) dy = 1;
        else if (u) { dx = -1; dy = -1; } else if (d) { dx = 1; dy = 1; } else if (l) { dx = -1; dy = 1; } else if (r) { dx = 1; dy = -1; }
        const m = Math.hypot(dx, dy);
        return m ? [dx / m, dy / m] : [0, 0];
      }
      function canStand(x, y, z) {
        const o = 0.17;
        for (const [ox, oy] of [[-o, -o], [o, -o], [-o, o], [o, o]]) if (groundAt(x + ox, y + oy).z > z + 2) return false;
        return true;
      }
      function updPlayer() {
        const p = g.p;
        if (p.dead) {
          if (p.kind === 'fall' && p.z > -200 && groundAt(p.x, p.y).z <= VOID) { p.vz -= G; p.z += p.vz; }
          if (--p.deadT <= 0) afterDeath();
          return;
        }
        // carried by platform
        const under = groundAt(p.x, p.y);
        if (!p.air && under.p) p.x += under.p.vx;
        const [dx, dy] = inputDir();
        const sp = 0.052 * (1 - 0.17 * p.mon);
        if (dx || dy) {
          const nx = p.x + dx * sp, ny = p.y + dy * sp;
          if (canStand(nx, p.y, p.z)) p.x = nx;
          if (canStand(p.x, ny, p.z)) p.y = ny;
          if (dx - dy !== 0) p.face = dx - dy > 0 ? 1 : -1;
          p.walk++;
          if (!p.air && p.walk % 12 === 0) S_.step();
        } else p.walk = 0;
        if (!p.air && api.pressed('Space')) {
          p.air = true; p.vz = JUMP - 0.28 * p.mon; p.take = p.z; S_.jump();
          if (p.mon > 0 && Math.random() < 0.55) { p.mon--; g.monkeys.push({ x: p.x, y: p.y, z: p.z + 10, vz: 2, fly: true, d: Math.random() < 0.5 ? 1 : -1, t: 0 }); S_.monkey(); }
        }
        const gr = groundAt(p.x, p.y);
        if (!p.air) {
          if (gr.z < p.z - 0.6) { p.air = true; p.vz = 0; p.take = p.z; }
          else p.z = gr.z;
        }
        if (p.air) {
          p.vz -= G; p.z += p.vz;
          if (p.z <= gr.z && p.vz <= 0) {
            p.z = gr.z; p.air = false;
            if (gr.k === 'water') { kill('drown'); g.splashes.push({ x: p.x, y: p.y, t: 40 }); return; }
            if (p.take - p.z > 20) { kill('fall'); return; }
            S_.land();
          }
          if (p.z < p.take - 40) { kill('fall'); return; }
        }
        if (!p.air && gr.k === 'water') { kill('drown'); g.splashes.push({ x: p.x, y: p.y, t: 40 }); return; }
        if (p.x < -0.3 || p.y < -0.3 || p.x > N + 0.3 || p.y > N + 0.3) { if (!p.air) { p.air = true; p.vz = 0; p.take = p.z; } }
        // reached Bongo?
        const b = g.bongo;
        if (Math.hypot(p.x - b.x, p.y - b.y) < 1.15 && Math.abs(p.z - b.z) < 6) {
          g.phase = 'clear'; g.phaseT = 260; S_.clear(); S_.roar();
        }
      }
      function hazardHit(x, y, z, r, hgt) {
        const p = g.p;
        if (p.dead) return false;
        return Math.hypot(p.x - x, p.y - y) < r && p.z < z + hgt && p.z + 11 > z;
      }
      function overScore(o, x, y, z, hgt, pts) {
        const p = g.p;
        if (!o.scored && p.air && Math.hypot(p.x - x, p.y - y) < 0.7 && p.z >= z + hgt - 1) { o.scored = true; addScore(pts, x, y, z + 12); S_.bonus(); }
      }
      function updCocos() {
        const L = g.loop, b = g.bongo;
        if (g.scene === 0) {
          if (--g.throwT <= 0) {
            g.throwT = Math.max(70, 170 - L * 20 - Math.floor(rnd(0, 60)));
            b.arms = 30; S_.throw_();
            const d = Math.random() < 0.5 ? [1, 0] : [0, 1];
            g.cocos.push({ x: b.x, y: b.y, z: b.z + 16, vz: 1.2, d, sp: 0.042 + L * 0.006 + rnd(0, 0.01), cell: '', scored: false });
          }
        }
        for (const c of g.cocos) {
          const nx = c.x + c.d[0] * c.sp, ny = c.y + c.d[1] * c.sp;
          const t = tileAt(nx, ny);
          if (t.z > c.z + 2) { c.d = c.d[0] ? [0, 1] : [1, 0]; continue; }
          c.x = nx; c.y = ny;
          const gz = tileAt(c.x, c.y).z;
          if (c.z > gz + 0.1 || c.vz > 0) { c.vz -= G; c.z += c.vz; if (c.z <= gz) { c.z = gz; c.vz = c.vz < -2.5 ? 1.2 : 0; if (c.vz) S_.land(); } }
          else c.z = gz;
          // choose a new downhill direction at each cell centre
          const ci = Math.floor(c.x), cj = Math.floor(c.y), key = ci + ',' + cj;
          if (key !== c.cell && Math.abs(c.x - ci - 0.5) < c.sp && Math.abs(c.y - cj - 0.5) < c.sp && c.vz === 0) {
            c.cell = key; c.x = ci + 0.5; c.y = cj + 0.5;
            const here = cell(ci, cj).z;
            const opts = [[1, 0], [0, 1]].filter(d => { const z2 = cell(ci + d[0], cj + d[1]).z; return z2 <= here && z2 > VOID; });
            if (opts.length) c.d = opts[Math.floor(Math.random() * opts.length)];
          }
          if (hazardHit(c.x, c.y, c.z, 0.42, 6)) kill('hit');
          overScore(c, c.x, c.y, c.z, 6, 100);
        }
        g.cocos = g.cocos.filter(c => c.z > -80 && c.x < N + 2 && c.y < N + 2);
      }
      function updMonkeys() {
        const p = g.p, L = g.loop;
        if (g.scene === 0) {
          if (--g.monT <= 0) {
            g.monT = Math.max(180, 420 - L * 60);
            if (g.monkeys.filter(m => !m.fly).length + p.mon < 3) { g.monkeys.push({ x: g.bongo.x + 0.8, y: g.bongo.y + 0.8, z: g.bongo.z, vz: 0, fly: false, d: 1, t: 0 }); S_.monkey(); }
          }
        }
        for (const m of g.monkeys) {
          m.t++;
          if (m.fly) { m.x += m.d * 0.05; m.y -= m.d * 0.05; m.vz -= G; m.z += m.vz; continue; }
          const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
          const sp = 0.03 + L * 0.004;
          const nx = m.x + dx / d * sp, ny = m.y + dy / d * sp;
          if (tileAt(nx, m.y).z > VOID) m.x = nx;
          if (tileAt(m.x, ny).z > VOID) m.y = ny;
          const gz = Math.max(0, tileAt(m.x, m.y).z);
          m.z = gz + Math.abs(Math.sin(m.t * 0.25)) * 4;
          if (!p.dead && d < 0.4 && Math.abs(p.z - gz) < 10 && p.mon < 3) { m.gone = true; p.mon++; S_.monkey(); }
        }
        g.monkeys = g.monkeys.filter(m => !m.gone && m.z > -60);
      }
      function updSnakes() {
        for (const s of g.snakes) {
          if (s.ax === 'x') { s.x += s.d * s.sp; if (s.x > s.b || s.x < s.a) s.d *= -1; }
          else { s.y += s.d * s.sp; if (s.y > s.b || s.y < s.a) s.d *= -1; }
          s.z = Math.max(0, tileAt(s.x, s.y).z);
          if (hazardHit(s.x, s.y, s.z, 0.45, 4)) kill('hit');
          overScore(s, s.x, s.y, s.z, 4, 100);
          if (s.scored && Math.hypot(g.p.x - s.x, g.p.y - s.y) > 1.5) s.scored = false;
        }
      }
      function updRhinos() {
        const L = g.loop;
        for (const ln of g.lanes) {
          if (ln.warn > 0) {
            if (--ln.warn === 0) {
              g.rhinos.push({ x: ln.d > 0 ? -1.2 : N + 1.2, y: ln.y, d: ln.d, sp: 0.085 + L * 0.012 + rnd(0, 0.03), z: 0, scored: false });
            }
          } else if (--ln.t <= 0) { ln.t = Math.max(140, 330 - L * 40) + rnd(0, 200); ln.warn = 50; S_.rhino(); }
        }
        for (const r of g.rhinos) {
          r.x += r.d * r.sp;
          const t = cell(Math.floor(Math.min(N - 1, Math.max(0, r.x))), Math.floor(r.y));
          r.z = t.k === 'hole' ? t.rim : t.z;
          const p = g.p;
          if (!p.dead && Math.abs(p.x - r.x) < 0.75 && Math.abs(p.y - r.y) < 0.45 && p.z < r.z + 9 && p.z + 11 > r.z) kill('hit');
          overScore(r, r.x, r.y, r.z, 9, 200);
        }
        g.rhinos = g.rhinos.filter(r => r.x > -2 && r.x < N + 2);
      }
      function updPlats() {
        for (const p of g.plats) {
          p.x += p.vx;
          if (p.wrap) { if (p.x > N + 2) p.x -= N + 4; if (p.x < -2) p.x += N + 4; }
          if (p.kind === 'hippo') {
            p.cyc = (p.cyc + 1) % 420;
            // 0-279 surfaced, 280-319 sinking (bubbles), 320-399 under, 400-419 rising
            p.up = p.cyc < 300 || p.cyc >= 400;
            p.top = p.cyc < 280 ? 2 : p.cyc < 320 ? 2 - (p.cyc - 280) / 8 : p.cyc < 400 ? -8 : -8 + (p.cyc - 400) / 2;
            if (p.cyc === 300 && !g.p.air && groundAt(g.p.x, g.p.y).p === p) { /* will drown below */ }
          }
        }
        if (g.scene === 3) {
          if (--g.fishT <= 0) {
            g.fishT = Math.max(60, 160 - g.loop * 25) + rnd(0, 120);
            const near = Math.random() < 0.6;
            g.fish.push({ x: near ? Math.max(0.5, Math.min(10.5, g.p.x + rnd(-1.5, 1.5))) : rnd(0.5, 10.5), y: 4.5 + Math.floor(rnd(0, 4)), t: -40, z: -3, d: Math.random() < 0.5 ? 1 : -1 });
          }
          for (const f of g.fish) {
            f.t++;
            if (f.t > 0) { f.z = -3 + Math.sin(f.t / 50 * Math.PI) * 22; f.x += f.d * 0.02; if (hazardHit(f.x, f.y, f.z, 0.4, 5)) kill('hit'); }
          }
          g.fish = g.fish.filter(f => f.t < 50);
        }
      }
      function updPlay() {
        const L = g.loop;
        if (++g.bonusT >= 120) { g.bonusT = 0; g.bonus = Math.max(0, g.bonus - 100); if (g.bonus === 0 && !g.p.dead) kill('time'); }
        g.bongo.t++;
        if (g.bongo.arms > 0) g.bongo.arms--;
        if (g.bongo.t % 140 === 0 && g.scene !== 0) { g.bongo.arms = 40; S_.thump(); }
        updPlayer();
        if (g.phase !== 'play') return;
        updCocos(); updMonkeys();
        if (g.snakes.length) updSnakes();
        if (g.scene === 2) updRhinos();
        updPlats();
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        for (const s of g.splashes) s.t--;
        g.splashes = g.splashes.filter(s => s.t > 0);
        void L;
      }
      function update() {
        frame++;
        if (api.credits > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          at++;
          if (at % 360 === 1) setupPreview(Math.floor(at / 360) % 6);
          if (g && g.preview) previewTick();
          if (at >= 360 * 6) at = 0;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(90, 0.3, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        if (g.phase === 'wait') return;
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'attract'; at = 0; g = null; } return; }
        if (g.phase === 'intro') {
          if (--g.phaseT <= 0) g.phase = 'play';
          g.bongo.t++;
          if (g.bongo.t % 40 === 0) { g.bongo.arms = 20; S_.thump(); }
          return;
        }
        if (g.phase === 'play') {
          updPlay();
          if (g.p.dead && g.phase === 'play') { /* keep dying animation running */ }
          return;
        }
        if (g.phase === 'clear') {
          g.phaseT--;
          const b = g.bongo;
          if (g.scene === 3) {
            // hot foot! a campfire under Bongo sends him leaping
            b.jumpZ = Math.abs(Math.sin(g.phaseT * 0.12)) * 14;
            if (g.phaseT % 20 === 0) au.tone(800 + Math.random() * 400, 0.08, { type: 'square', vol: 0.06 });
          } else if (g.phaseT < 200) { b.jumpZ += 1.2; if (b.jumpZ > 120) b.gone = true; }
          if (g.bonus > 0 && g.phaseT < 200 && g.phaseT % 2 === 0) { const d = Math.min(100, g.bonus); g.bonus -= d; addScore(d); if (g.phaseT % 8 === 0) S_.bonus(); }
          if (g.phaseT <= 0) {
            if (g.scene === 3) { g.loop++; startScene(0); }
            else startScene(g.scene + 1);
            S_.start();
          }
        }
      }

      // ---------- attract preview ----------
      function setupPreview(i) {
        if (i === 0 || i === 5) { g = null; return; }
        const sc = i - 1;
        g = { preview: true, score: 0, lives: 3, loop: 0, scene: sc, sc: SCENES[sc], bonus: 4000, bonusT: 0 };
        resetActors();
        g.p.dead = true; g.p.deadT = 1e9; g.p.hidden = true;
        g.phase = 'play';
      }
      function previewTick() {
        g.bongo.t++;
        if (g.bongo.arms > 0) g.bongo.arms--;
        if (g.bongo.t % 140 === 0 && g.scene !== 0) g.bongo.arms = 40;
        const mute = au.muted; au.setMuted(true);
        try {
          if (g.scene === 0) { g.p.x = 6; g.p.y = 9; updCocos(); }
          if (g.snakes.length) updSnakes();
          if (g.scene === 2) updRhinos();
          updPlats();
        } finally { au.setMuted(mute); }
      }

      // ---------- rendering ----------
      function poly(ctx, pts, col) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath(); ctx.fill();
      }
      function drawTile(ctx, i, j) {
        const t = cell(i, j);
        if (t.k === 'void') return;
        const sc = g.sc;
        const z = t.k === 'hole' ? t.rim : t.z;
        const isW = t.k === 'water';
        const fR = isW ? '#1838a0' : sc.face[0], fL = isW ? '#102878' : sc.face[1];
        poly(ctx, [S(i + 1, j, z), S(i + 1, j + 1, z), S(i + 1, j + 1, BASE), S(i + 1, j, BASE)], fR);
        poly(ctx, [S(i, j + 1, z), S(i + 1, j + 1, z), S(i + 1, j + 1, BASE), S(i, j + 1, BASE)], fL);
        if (!isW && z > 4) {
          ctx.fillStyle = sc.stripe;
          for (let zz = z - 8; zz > BASE + 2; zz -= 8) {
            const a = S(i + 1, j, zz), b = S(i + 1, j + 1, zz), c = S(i, j + 1, zz);
            ctx.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), 1, 1);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
            ctx.strokeStyle = sc.stripe; ctx.lineWidth = 1; ctx.stroke();
          }
        }
        let top = isW ? ((i + j + (frame >> 4)) % 3 === 0 ? '#3060e0' : '#2850d0') : sc.top[(i + j) & 1];
        poly(ctx, [S(i, j, z), S(i + 1, j, z), S(i + 1, j + 1, z), S(i, j + 1, z)], top);
        if (isW && ((i * 7 + j * 3 + (frame >> 3)) % 5 === 0)) { const c = S(i + 0.5, j + 0.5, z); ctx.fillStyle = '#a0c0ff'; ctx.fillRect(c[0] - 3, c[1], 6, 1); }
        if (t.k === 'hole') {
          poly(ctx, [S(i + 0.2, j + 0.2, z), S(i + 0.8, j + 0.2, z), S(i + 0.8, j + 0.8, z), S(i + 0.2, j + 0.8, z)], '#100804');
        }
        if (!isW && t.k === 'land' && ((i * 5 + j * 11) % 7 === 0)) {
          const c = S(i + 0.5, j + 0.5, z); ctx.fillStyle = '#207020'; ctx.fillRect(c[0] - 2, c[1] - 2, 1, 2); ctx.fillRect(c[0], c[1] - 3, 1, 3); ctx.fillRect(c[0] + 2, c[1] - 2, 1, 2);
        }
      }
      function drawSpriteAt(ctx, im, x, y, z, clipZ) {
        const s = S(x, y, z);
        const dx = Math.round(s[0] - im.width / 2), dy = Math.round(s[1] - im.height);
        if (clipZ != null) {
          const cy = S(x, y, clipZ)[1];
          if (cy <= dy) return;
          ctx.save(); ctx.beginPath(); ctx.rect(dx - 2, dy - 2, im.width + 4, cy - dy + 2); ctx.clip();
          ctx.drawImage(im, dx, dy); ctx.restore();
        } else ctx.drawImage(im, dx, dy);
      }
      function shadow(ctx, x, y, z, w) {
        const gz = groundAt(x, y).z; if (gz <= VOID) return;
        const s = S(x, y, gz);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(s[0], s[1], w, w / 2, 0, 0, 6.283); ctx.fill();
      }
      function drawPlayer(ctx) {
        const p = g.p;
        if (p.hidden) return;
        if (p.dead && p.deadT < 40 && (frame & 4)) return;
        let im;
        if (p.dead) im = p.face > 0 ? SP_PF[2] : SP_P[2];
        else { const f = p.air ? 2 : (p.walk >> 3) & 1; im = p.face > 0 ? SP_PF[f] : SP_P[f]; }
        if (p.air) shadow(ctx, p.x, p.y, p.z, 4);
        const t = tileAt(p.x, p.y);
        let clip = null;
        if (t.k === 'hole' && p.z < t.rim) clip = t.rim;
        if (p.dead && p.kind === 'drown') clip = WATERZ;
        let z = p.z;
        if (p.dead && p.kind === 'drown') z = WATERZ - Math.min(12, (150 - p.deadT) * 0.2);
        if (p.dead && p.kind !== 'drown' && p.kind !== 'fall') {
          const s = S(p.x, p.y, z);
          ctx.save(); ctx.translate(s[0], s[1] - 6); ctx.rotate(Math.min(1.57, (150 - p.deadT) * 0.05) * p.face);
          ctx.drawImage(im, -5, -8); ctx.restore();
        } else drawSpriteAt(ctx, im, p.x, p.y, z, clip);
        // monkeys hanging on
        for (let i = 0; i < p.mon; i++) {
          const s = S(p.x, p.y, z);
          const mi = SP_M[(frame >> 3) & 1];
          ctx.drawImage(i % 2 ? mi : SP_MF[(frame >> 3) & 1], Math.round(s[0] - 4 + (i === 0 ? -5 : i === 1 ? 5 : 0)), Math.round(s[1] - 14 - (i === 2 ? 8 : 0)));
        }
      }
      function drawBongo(ctx) {
        const b = g.bongo;
        if (b.gone) return;
        const im = SP_B[b.arms > 0 && ((b.arms >> 3) & 1) ? 1 : (b.arms > 0 ? 1 : 0)];
        const bob = b.arms > 0 ? 0 : ((frame >> 4) & 1);
        drawSpriteAt(ctx, im, b.x, b.y, b.z + b.jumpZ + bob);
        if (g.phase === 'clear' && g.scene === 3) {
          const s = S(b.x, b.y, b.z);
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = (frame + i) & 2 ? '#ffd020' : '#ff4010';
            ctx.fillRect(s[0] - 8 + i * 3, s[1] - 3 - Math.random() * 8, 2, 4);
          }
        }
      }
      function drawPlat(ctx, p) {
        const s = S(p.x, p.y, p.top);
        if (p.kind === 'lily') {
          for (let k = 0; k < p.len; k++) {
            const q = S(p.x - (p.len - 1) / 2 + k, p.y, 0);
            ctx.fillStyle = '#208020'; ctx.beginPath(); ctx.ellipse(q[0], q[1] + 1, 9, 4.5, 0, 0, 6.283); ctx.fill();
            ctx.fillStyle = '#40c040'; ctx.beginPath(); ctx.ellipse(q[0], q[1], 9, 4.5, 0, 0.4, 6.0); ctx.lineTo(q[0], q[1]); ctx.fill();
            if (k === 0) { ctx.fillStyle = '#ff80c0'; ctx.fillRect(q[0] - 1, q[1] - 2, 3, 2); }
          }
        } else {
          if (p.cyc >= 320 && p.cyc < 400) {
            if ((frame >> 3) & 1) { ctx.fillStyle = '#a0c0ff'; ctx.fillRect(s[0] - 2, s[1] + 6, 2, 2); ctx.fillRect(s[0] + 3, s[1] + 7, 2, 2); }
            return;
          }
          const sink = p.cyc >= 280 && p.cyc < 320 ? (p.cyc - 280) / 40 : p.cyc >= 400 ? 1 - (p.cyc - 400) / 20 : 0;
          const im = SP_HIPPO;
          const dx = Math.round(s[0] - im.width / 2), dy = Math.round(s[1] - im.height + 4);
          const vis = Math.max(1, Math.round(im.height * (1 - sink)));
          ctx.drawImage(im, 0, 0, im.width, vis, p.vx < 0 ? dx : dx, dy + (im.height - vis), im.width, vis);
          if (sink > 0 && (frame & 4)) { ctx.fillStyle = '#ffffff'; ctx.fillRect(dx + 3, dy + im.height - 1, im.width - 6, 1); }
        }
      }
      function drawSnake(ctx, s) {
        const base = S(s.x, s.y, s.z);
        const dirx = s.ax === 'x' ? s.d : 0, diry = s.ax === 'y' ? s.d : 0;
        const vx = (dirx - diry) * 10, vy = (dirx + diry) * 5;
        for (let k = 6; k >= 0; k--) {
          const t = k * 0.11;
          const wob = Math.sin(frame * 0.3 + k) * 1.5;
          ctx.fillStyle = k === 0 ? '#80ff40' : (k & 1 ? '#30a030' : '#ffd020');
          ctx.fillRect(Math.round(base[0] - vx * t - 1 + wob * 0.5), Math.round(base[1] - vy * t - 2 + wob), 3, 2);
        }
        ctx.fillStyle = '#ff2020'; ctx.fillRect(Math.round(base[0] + vx * 0.08), Math.round(base[1] + vy * 0.08 - 2), 2, 1);
      }
      function drawEntity(ctx, e) {
        switch (e.t) {
          case 'p': drawPlayer(ctx); break;
          case 'bongo': drawBongo(ctx); break;
          case 'coco': shadow(ctx, e.o.x, e.o.y, e.o.z, 3); drawSpriteAt(ctx, SP_COCO, e.o.x, e.o.y, e.o.z); break;
          case 'mon': { const m = e.o; const f = (m.t >> 3) & 1; drawSpriteAt(ctx, (g.p.x - m.x) - (g.p.y - m.y) > 0 ? SP_MF[f] : SP_M[f], m.x, m.y, m.z); break; }
          case 'snake': drawSnake(ctx, e.o); break;
          case 'rhino': {
            const r = e.o; const f = (frame >> 2) & 1;
            drawSpriteAt(ctx, r.d > 0 ? SP_R[f] : SP_RF[f], r.x, r.y, r.z);
            if (frame & 2) { const s = S(r.x - r.d * 0.9, r.y, r.z); ctx.fillStyle = '#d8c090'; ctx.fillRect(s[0] - 2, s[1] - 3, 3, 2); }
            break;
          }
          case 'plat': drawPlat(ctx, e.o); break;
          case 'fish': { const f = e.o; if (f.t < 0) { if (frame & 4) { const s = S(f.x, f.y, -3); ctx.fillStyle = '#c0e0ff'; ctx.fillRect(s[0] - 4, s[1], 8, 1); } } else drawSpriteAt(ctx, SP_FISH, f.x, f.y, f.z, WATERZ); break; }
          case 'warn': { const ln = e.o; const s = S(ln.d > 0 ? 0 : N, ln.y, 0); if (frame & 4) { ctx.fillStyle = '#e0c890'; ctx.fillRect(s[0] - 6, s[1] - 10, 12, 8); } break; }
        }
      }
      function drawScene(ctx) {
        // terrain
        for (let k = 0; k <= 2 * (N - 1); k++) for (let i = 0; i <= k; i++) { const j = k - i; if (i < N && j < N) drawTile(ctx, i, j); }
        // entities (each followed by the taller tiles that stand in front of it)
        const ents = [];
        ents.push({ t: 'bongo', x: g.bongo.x, y: g.bongo.y, z: g.bongo.z });
        if (!g.p.hidden) ents.push({ t: 'p', x: g.p.x, y: g.p.y, z: g.p.z });
        for (const o of g.cocos) ents.push({ t: 'coco', o, x: o.x, y: o.y, z: o.z });
        for (const o of g.monkeys) ents.push({ t: 'mon', o, x: o.x, y: o.y, z: o.z });
        for (const o of g.snakes) ents.push({ t: 'snake', o, x: o.x, y: o.y, z: o.z });
        for (const o of g.rhinos) ents.push({ t: 'rhino', o, x: o.x, y: o.y, z: o.z });
        for (const o of g.plats) ents.push({ t: 'plat', o, x: o.x, y: o.y - 0.2, z: o.top });
        for (const o of g.fish) ents.push({ t: 'fish', o, x: o.x, y: o.y, z: o.z });
        if (g.lanes) for (const ln of g.lanes) if (ln.warn > 0) ents.push({ t: 'warn', o: ln, x: ln.d > 0 ? 0 : N - 1, y: ln.y, z: 0 });
        ents.sort((a, b) => (a.x + a.y) - (b.x + b.y));
        for (const e of ents) {
          drawEntity(ctx, e);
          const key = e.x + e.y + 0.35, ex = e.x - e.y;
          const ci = Math.floor(e.x), cj = Math.floor(e.y);
          for (let i = ci - 1; i <= ci + 3; i++) for (let j = cj - 1; j <= cj + 3; j++) {
            if (i < 0 || j < 0 || i >= N || j >= N) continue;
            if (i + j + 1 <= key) continue;
            if (Math.abs((i + 0.5 - j - 0.5) - ex) > 1.6) continue;
            const t = cell(i, j);
            const tz = t.k === 'hole' ? t.rim : t.z;
            if (tz > e.z + 1.5 && t.k !== 'void') drawTile(ctx, i, j);
          }
        }
        for (const s of g.splashes) {
          const c = S(s.x, s.y, WATERZ);
          ctx.fillStyle = '#c0e0ff';
          for (let k = 0; k < 6; k++) { const a = k * 1.05; const r = (40 - s.t) * 0.4; ctx.fillRect(c[0] + Math.cos(a) * r, c[1] - Math.abs(Math.sin(a)) * r * 0.8 - (s.t > 20 ? (40 - s.t) * 0.4 : 0), 2, 2); }
        }
        for (const q of g.pops) { const s = S(q.x, q.y, q.z + (50 - q.t) * 0.3); text(ctx, String(q.n), s[0], s[1] - 8, '#ffffff', 1, 'center'); }
      }
      function drawHUD(ctx) {
        text(ctx, '1UP', 6, 2, '#ff4040'); text(ctx, pad(g.score, 6), 6, 11, '#ffffff');
        text(ctx, 'HI-SCORE', 86, 2, '#ff4040'); text(ctx, pad(hi, 6), 86, 11, '#ffffff');
        ctx.strokeStyle = '#40c0ff'; ctx.lineWidth = 1; ctx.strokeRect(166.5, 1.5, 54, 19);
        text(ctx, 'BONUS', 194, 3, '#40c0ff', 1, 'center'); text(ctx, pad(g.bonus, 4), 194, 12, g.bonus <= 1000 && (frame & 16) ? '#ff4040' : '#ffd040', 1, 'center');
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) ctx.drawImage(SP_P[0], 4 + i * 11, 241);
        text(ctx, 'L=' + (g.loop + 1), 220, 246, '#ffd040', 1, 'right');
        for (let i = 0; i < 4; i++) { ctx.fillStyle = i < g.scene ? '#40ff40' : i === g.scene ? '#ffd040' : '#305030'; ctx.fillRect(150 + i * 10, 247, 7, 5); }
      }
      function attractFooter(ctx) {
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', 112, 224, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', 112, 224, '#40ff40', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 6, 246, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') {
          const i = Math.floor(at / 360) % 6;
          if (g && g.preview) {
            ctx.fillStyle = g.scene === 3 ? '#001030' : '#000818'; ctx.fillRect(0, 0, W, H);
            drawScene(ctx);
            text(ctx, 'HI-SCORE ' + pad(hi, 6), 112, 4, '#ff4040', 1, 'center');
            text(ctx, 'SCENE ' + (g.scene + 1), 112, 18, '#ffffff', 1, 'center');
            text(ctx, g.sc.name, 112, 28, '#ffd040', 1, 'center');
            attractFooter(ctx);
            return;
          }
          if (i === 0) {
            for (let d = 4; d > 0; d--) { text(ctx, 'CONGO', 112 + d, 36 + d, '#603000', 4, 'center'); text(ctx, 'BONGO', 112 + d, 72 + d, '#603000', 4, 'center'); }
            text(ctx, 'CONGO', 112, 36, '#ffb020', 4, 'center'); text(ctx, 'BONGO', 112, 72, '#ffb020', 4, 'center');
            const im = SP_B[(frame >> 4) & 1];
            ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(im, 112 - im.width, 112, im.width * 2, im.height * 2); ctx.restore();
            text(ctx, 'CATCH THE APE BONGO!', 112, 158, '#40ff40', 1, 'center');
            text(ctx, 'JUMP COCONUT  100', 112, 174, '#ffffff', 1, 'center');
            text(ctx, 'JUMP SNAKE    100', 112, 184, '#ffffff', 1, 'center');
            text(ctx, 'JUMP RHINO    200', 112, 194, '#ffffff', 1, 'center');
            text(ctx, 'EXTRA LIFE AT 10000', 112, 208, '#ff80ff', 1, 'center');
          } else {
            text(ctx, 'HIGH SCORE', 112, 60, '#ff4040', 2, 'center');
            text(ctx, pad(hi, 6), 112, 90, '#ffffff', 2, 'center');
            const sc = ['PRIMATE PEAK', 'SNAKE LAKE', 'RHINO RIDGE', 'LAZY LAGOON'];
            sc.forEach((n, k) => text(ctx, 'SCENE ' + (k + 1) + '  ' + n, 112, 130 + k * 14, '#ffd040', 1, 'center'));
            text(ctx, 'HIDE IN HOLES FROM RHINOS', 112, 192, '#40c0ff', 1, 'center');
            text(ctx, 'SHAKE OFF MONKEYS: JUMP!', 112, 204, '#40c0ff', 1, 'center');
          }
          text(ctx, '\u00a9 1983 SEGA', 112, 236, '#808080', 1, 'center');
          attractFooter(ctx);
          return;
        }
        ctx.fillStyle = g.scene === 3 ? '#001030' : g.scene === 2 ? '#100800' : '#000818'; ctx.fillRect(0, 0, W, H);
        drawScene(ctx);
        drawHUD(ctx);
        if (g.phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 96, 144, 34);
          text(ctx, 'SCENE ' + (g.scene + 1), 112, 101, '#ffffff', 1, 'center');
          text(ctx, g.sc.name, 112, 115, '#ffd040', 1, 'center');
        }
        if (g.phase === 'clear') text(ctx, g.scene === 3 ? 'HOT FOOT!' : 'GOT YOU, BONGO!', 112, 34, '#ffd040', 1, 'center');
        if (g.p.dead && g.p.kind === 'time') text(ctx, 'TIME UP', 112, 100, '#ff4040', 2, 'center');
        if (g.phase === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(56, 98, 112, 24); text(ctx, 'GAME OVER', 112, 102, '#ff4040', 2, 'center'); }
      }
      return { update, render, destroy() { } };
    }
  });
})();
