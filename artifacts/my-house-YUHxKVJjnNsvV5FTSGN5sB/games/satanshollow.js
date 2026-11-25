// Satan's Hollow (Bally Midway, 1982) -- from-scratch recreation: shoot down waves of swooping gargoyles, carry
// the bridge pieces they leave behind across the lava, then cross into the Hollow and face Satan himself.
(function () {
  'use strict';
  // ---------- compact 5x7 bitmap font ----------
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
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const W = 240, H = 256, TOP = 18, GROUND = 232, PY = 224, LAVA = 166, SEG = 12, NSEG = 6;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const CANNON = spr([
    '......WW......',
    '......WW......',
    '.....WRRW.....',
    '.....WRRW.....',
    '...GGGRRGGG...',
    '..GGGGGGGGGG..',
    '.GGYGGGGGGYGG.',
    'GGGGGGGGGGGGGG',
    'KKKKKKKKKKKKKK',
    '.KK.KK..KK.KK.'], { W: '#ffffff', R: '#ff3030', G: '#a0a0b8', Y: '#ffe040', K: '#505060' });
  function garg(body, wing, eye) {
    const pal = { B: body, w: wing, E: eye, K: '#200808' };
    return [spr([
      'w.............w',
      'ww....B.B....ww',
      'www..BBBBB..www',
      'wwwwBBEBEBBwwww',
      '.wwwBBBBBBBwww.',
      '..wwBBKKKBBww..',
      '...wwBBBBBww...',
      '.....BBBBB.....',
      '....BB...BB....',
      '...BB.....BB...'], pal), spr([
      '......B.B......',
      '.....BBBBB.....',
      '....BBEBEBB....',
      '..wwBBBBBBBww..',
      '.wwwBBKKKBBwww.',
      'wwwwwBBBBBwwwww',
      'www..BBBBB..www',
      'ww...B...B...ww',
      'w...BB...BB...w',
      '...............'], pal)];
  }
  const GARGS = [garg('#30c040', '#108020', '#ffff00'), garg('#ff4030', '#a01010', '#ffff00'), garg('#c060ff', '#6020a0', '#ffffff')];
  const BAT = [spr(['B.......B', 'BB.....BB', 'BBB.E.BBB', '.BBBBBBB.', '...BBB...'], { B: '#a0a0ff', E: '#ff2020' }),
    spr(['.........', '...BEB...', 'BBBBBBBBB', 'BB.BBB.BB', 'B.......B'], { B: '#a0a0ff', E: '#ff2020' })];
  const PIECE = spr([
    'SSSSSSSSSSSS',
    'SsSSSsSSSSsS',
    'SSSsSSSSsSSS',
    'DDDDDDDDDDDD'], { S: '#c09060', s: '#806040', D: '#503020' });
  const FIRE = [spr(['.Y.', 'YRY', 'RRR', '.R.'], { Y: '#ffff80', R: '#ff6020' }), spr(['.R.', 'RYR', 'YRY', '.Y.'], { Y: '#ffff80', R: '#ff3010' })];

  ArcadeRegistry.register({
    id: 'satanshollow', title: "Satan's Hollow", year: 1982, maker: 'Bally Midway',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Left/Right: move \u00b7 Space: fire \u00b7 X: shield \u00b7 carry bridge pieces to the lava \u00b7 Enter: start',
    marquee: { bg: '#200000', fg: '#ff4020', accent: '#ffe040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(20000);
      let mode = 'title', frame = 0, coinFlash = 0, titleT = 0;
      let g = null;
      const stars = []; for (let i = 0; i < 50; i++) stars.push({ x: Math.random() * W, y: TOP + Math.random() * 130, c: (Math.random() * 3) | 0 });
      const mtn = []; for (let x = 0; x < W; x += 4) mtn.push(30 + 14 * Math.sin(x * 0.03) + 8 * Math.sin(x * 0.11 + 1) + 5 * Math.sin(x * 0.27));

      const sfx = {
        shot() { au.tone(1400, 0.08, { type: 'square', slideTo: 500, vol: 0.06 }); },
        kill() { au.noise(0.25, { freq: 2500, slideTo: 200, vol: 0.18 }); au.tone(600, 0.15, { type: 'square', slideTo: 120, vol: 0.06 }); },
        swoop() { au.tone(1800, 0.6, { type: 'sine', slideTo: 300, vol: 0.05 }); },
        fire() { au.tone(220, 0.15, { type: 'sawtooth', slideTo: 90, vol: 0.06 }); },
        die() { au.noise(1.2, { freq: 3000, slideTo: 60, vol: 0.32 }); au.tone(300, 1, { type: 'sawtooth', slideTo: 30, vol: 0.1 }); },
        pick() { au.melody([[523, .06], [659, .06], [784, .1]], { type: 'square', vol: 0.1 }); },
        place() { au.melody([[392, .08], [523, .08], [659, .08], [784, .16]], { type: 'square', vol: 0.11 }); au.noise(0.15, { freq: 400, vol: 0.12 }); },
        piece() { au.tone(880, 0.3, { type: 'triangle', slideTo: 440, vol: 0.1 }); },
        shield() { au.tone(120, 0.12, { type: 'triangle', vol: 0.06 }); },
        block() { au.tone(1600, 0.06, { type: 'square', vol: 0.06 }); },
        bossHit() { au.tone(180, 0.12, { type: 'square', vol: 0.12 }); au.noise(0.1, { freq: 1200, vol: 0.1 }); },
        roar() { au.tone(80, 0.8, { type: 'sawtooth', slideTo: 40, vol: 0.15 }); au.noise(0.8, { freq: 500, vol: 0.12 }); },
        bossDie() { for (let i = 0; i < 8; i++) au.noise(0.4, { freq: 3000 - i * 300, vol: 0.2, delay: i * 0.15 }); },
        hollow() { au.melody([[147, .3], [156, .3], [147, .3], [131, .6]], { type: 'sawtooth', vol: 0.12 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.1 }); },
        start() { au.melody([[220, .15], [262, .15], [330, .15], [294, .15], [262, .15], [247, .15], [220, .4]], { type: 'square', vol: 0.1 }); }
      };

      function newGame() {
        g = { score: 0, lives: 3, round: 1, nextExtra: 20000, bridge: 0, pad: 0, carry: false, wave: 0,
          p: { x: 40, dead: 0, inv: 0 }, shield: 100, shieldOn: false, bullets: [], fires: [], enemies: [], booms: [], pops: [],
          stage: 'field', waveT: 120, spawnQ: [], diveT: 120, boss: null, msg: 'ROUND 1', msgT: 150, over: 0, startT: 120 };
        sfx.start();
      }
      const lv = () => g.round - 1 + g.wave * 0.12;
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 30000; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, t) { g.pops.push({ x, y, t: 50, txt: t }); }
      function boom(x, y, big, cols) { g.booms.push({ x, y, t: 0, big: !!big, cols: cols || ['#ffffff', '#ffe040', '#ff8020', '#ff2010'] }); }
      function maxX() { return g.stage === 'boss' ? W - 8 : (g.bridge >= NSEG ? W - 8 : LAVA + g.bridge * SEG - 7); }

      // ---------------- waves ----------------
      function startWave() {
        g.wave++;
        const n = 6 + Math.min(4, g.round - 1);
        const type = g.round >= 2 && g.wave % 3 === 0 ? 1 : g.round >= 3 && g.wave % 4 === 0 ? 2 : 0;
        const bats = g.wave % 2 === 0;
        g.spawnQ = [];
        for (let i = 0; i < n; i++) g.spawnQ.push({ t: i * 22, type: bats && i >= n - 3 ? 'bat' : 'garg', kind: type });
        g.spawnT = 0;
      }
      function spawn(q) {
        const x = rnd(20, W - 20);
        const e = { type: q.type, kind: q.kind, x, y: TOP - 10, st: 'enter', t: 0, ph: Math.random() * 6, hx: rnd(24, W - 24), hy: rnd(40, 120), fired: 0 };
        if (q.type === 'bat') { e.hy = rnd(60, 130); }
        g.enemies.push(e);
      }
      function startDive(e) {
        e.st = 'dive'; e.t = 0; e.fired = 0; e.vy = 1.6 + Math.min(1.6, lv() * 0.25); if (e.type === 'bat') e.vy += 0.6;
        sfx.swoop();
      }
      function enemyFire(x, y, spread) {
        const p = g.p, dy = PY - y; if (dy < 30) return;
        const sp = 1.7 + Math.min(1.3, lv() * 0.15);
        const vx = clamp((p.x - x) / (dy / sp), -1.2, 1.2);
        g.fires.push({ x, y, vx, vy: sp });
        if (spread) { g.fires.push({ x, y, vx: vx - 0.6, vy: sp }); g.fires.push({ x, y, vx: vx + 0.6, vy: sp }); }
        sfx.fire();
      }
      function updEnemies() {
        const p = g.p;
        for (const e of g.enemies) {
          e.t++;
          if (e.st === 'enter') {
            const tx = e.hx + Math.sin(e.t * 0.05 + e.ph) * 30, ty = e.hy;
            e.x += clamp(tx - e.x, -1.6, 1.6); e.y += clamp(ty - e.y, -1.8, 1.8);
            if (Math.abs(e.y - ty) < 2) { e.st = 'hover'; e.t = 0; }
          } else if (e.st === 'hover') {
            e.hx = clamp(e.hx + Math.sin(e.t * 0.011 + e.ph) * 0.6, 20, W - 20);
            e.x += (e.hx + Math.sin(e.t * 0.04 + e.ph) * 22 - e.x) * 0.08;
            e.y += (e.hy + Math.sin(e.t * 0.06 + e.ph) * 7 - e.y) * 0.08;
            if (Math.random() < 0.002 + lv() * 0.0008 && !p.dead) enemyFire(e.x, e.y + 6, e.kind === 1);
          } else if (e.st === 'dive') {
            const tx = p.dead ? e.x : p.x;
            e.x += clamp((tx - e.x) * 0.03, -1.6, 1.6) + Math.sin(e.t * 0.12) * (e.type === 'bat' ? 2 : 0.8);
            e.y += e.vy;
            if (!e.fired && e.y > 70 && e.y < 160 && Math.random() < 0.04) { e.fired = 1; enemyFire(e.x, e.y + 6, e.kind === 1); }
            if (e.y > H + 10) { e.y = TOP - 12; e.st = 'enter'; e.hx = rnd(24, W - 24); e.hy = rnd(40, 120); e.t = 0; }
          }
        }
        // swoops
        if (--g.diveT <= 0 && !p.dead) {
          g.diveT = Math.max(30, 110 - lv() * 10) + rnd(0, 50);
          const hov = g.enemies.filter(e => e.st === 'hover');
          const diving = g.enemies.filter(e => e.st === 'dive').length;
          if (hov.length && diving < Math.min(4, 1 + Math.floor(lv() / 1.5))) startDive(hov[(Math.random() * hov.length) | 0]);
        }
      }

      // ---------------- boss ----------------
      function startBoss() {
        g.stage = 'boss'; g.enemies = []; g.fires = []; g.bullets = []; g.spawnQ = [];
        g.boss = { x: W / 2, y: 70, vx: 0.6 + g.round * 0.15, hp: 14 + g.round * 4, max: 14 + g.round * 4, mouth: 0, mt: 120, hurt: 0, dead: 0, batT: 300 };
        g.p.x = 30;
        g.msg = "SATAN'S HOLLOW"; g.msgT = 160; sfx.hollow(); sfx.roar();
      }
      function updBoss() {
        const b = g.boss, p = g.p;
        if (b.dead) {
          b.dead++;
          if (b.dead % 6 === 0) boom(b.x + rnd(-30, 30), b.y + rnd(-20, 24), true);
          if (b.dead > 170) nextRound();
          return;
        }
        b.x += b.vx; if (b.x < 44 || b.x > W - 44) b.vx = -b.vx;
        b.y = 70 + Math.sin(frame * 0.02) * 14;
        if (b.hurt > 0) b.hurt--;
        if (--b.mt <= 0) {
          if (b.mouth) { b.mouth = 0; b.mt = Math.max(40, 120 - g.round * 12) + rnd(0, 60); }
          else { b.mouth = 1; b.mt = 70; sfx.roar(); }
        }
        if (b.mouth && b.mt % Math.max(8, 16 - g.round * 2) === 0 && !p.dead) {
          const dy = PY - (b.y + 22), sp = 2 + g.round * 0.2;
          const a = Math.atan2(dy, p.x - b.x) + rnd(-0.25, 0.25);
          g.fires.push({ x: b.x, y: b.y + 22, vx: Math.cos(a) * sp, vy: Math.max(1, Math.sin(a) * sp), big: true });
          sfx.fire();
        }
        if (--b.batT <= 0) {
          b.batT = Math.max(120, 300 - g.round * 30);
          for (let i = 0; i < 2; i++) { const e = { type: 'bat', kind: 0, x: b.x + (i ? 20 : -20), y: b.y, st: 'hover', t: 0, ph: Math.random() * 6, hx: rnd(30, W - 30), hy: rnd(110, 150), fired: 0 }; g.enemies.push(e); startDive(e); }
        }
      }
      function nextRound() {
        addScore(5000 * g.round); pop(W / 2, 100, String(5000 * g.round));
        g.round++; g.stage = 'field'; g.boss = null; g.bridge = 0; g.pad = 0; g.carry = false; g.wave = 0;
        g.enemies = []; g.fires = []; g.waveT = 150; g.p.x = 40; g.shield = 100;
        g.msg = 'ROUND ' + g.round; g.msgT = 150; sfx.start();
      }

      // ---------------- player ----------------
      function killPlayer() {
        const p = g.p;
        if (p.dead || p.inv > 0) return;
        if (g.shieldOn) { sfx.block(); return; }
        p.dead = 150; boom(p.x, PY, true, ['#ffffff', '#a0a0ff', '#ff3030', '#ffe040']); sfx.die();
        if (g.carry) { g.carry = false; g.pad++; }
      }
      function afterDeath() {
        g.fires = [];
        for (const e of g.enemies) if (e.st === 'dive') { e.y = TOP - 12; e.st = 'enter'; e.t = 0; }
        if (g.lives <= 0) { lastLife(() => { g.lives = 3; respawn(); }); return; }
        g.lives--; respawn();
      }
      function respawn() { const p = g.p; p.x = g.stage === 'boss' ? 30 : 40; p.inv = 120; g.shield = Math.max(g.shield, 50); }
      function lastLife(onC) {
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) onC(); }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() { api.setHiScore(g.score); g.over = 300; g.msg = 'GAME OVER'; g.msgT = 300; au.melody([[294, .25], [277, .25], [262, .25], [247, .6]], { type: 'sawtooth', vol: 0.1 }); }

      function updPlayer() {
        const p = g.p;
        if (p.dead) { if (--p.dead === 0) afterDeath(); return; }
        if (p.inv > 0) p.inv--;
        g.shieldOn = api.key('KeyX') && g.shield > 0;
        if (g.shieldOn) { g.shield = Math.max(0, g.shield - 0.5); if (frame % 10 === 0) sfx.shield(); }
        const sp = g.shieldOn ? 0.8 : (g.carry ? 1.4 : 1.9);
        if (api.key('ArrowLeft')) p.x -= sp;
        if (api.key('ArrowRight')) p.x += sp;
        p.x = clamp(p.x, 8, maxX());
        if (api.anyPressed('Space', 'KeyZ', 'ArrowUp') && !g.carry && !g.shieldOn && g.bullets.length < 2) {
          g.bullets.push({ x: p.x, y: PY - 8 }); sfx.shot();
        }
        if (g.stage === 'field') {
          if (!g.carry && g.pad > 0 && p.x < 22) { g.pad--; g.carry = true; sfx.pick(); }
          if (g.carry && p.x >= maxX() - 0.5 && g.bridge < NSEG) {
            g.carry = false; g.bridge++; addScore(500 * g.round); pop(LAVA + g.bridge * SEG - 6, PY - 14, String(500 * g.round)); sfx.place();
            if (g.bridge === NSEG) { g.msg = 'BRIDGE COMPLETE - CROSS IT!'; g.msgT = 160; addScore(1000); }
          }
          if (g.bridge >= NSEG && p.x >= W - 9) startBoss();
        }
      }

      function updBullets() {
        for (const b of g.bullets) {
          b.y -= 5;
          if (b.y < TOP) { b.dead = true; continue; }
          for (const e of g.enemies) {
            if (e.dead) continue;
            const hw = e.type === 'bat' ? 6 : 8;
            if (Math.abs(e.x - b.x) < hw && Math.abs(e.y - b.y) < 7) {
              e.dead = true; b.dead = true;
              let pts = e.type === 'bat' ? 150 : [100, 200, 300][e.kind];
              if (e.st === 'dive') pts *= 2;
              addScore(pts); if (e.st === 'dive') pop(e.x, e.y, String(pts));
              boom(e.x, e.y, false); sfx.kill(); break;
            }
          }
          const bs = g.boss;
          if (!b.dead && bs && !bs.dead && Math.abs(b.x - bs.x) < 30 && b.y < bs.y + 30 && b.y > bs.y - 30) {
            b.dead = true;
            const mouthHit = bs.mouth && Math.abs(b.x - bs.x) < 12 && b.y < bs.y + 30;
            bs.hp -= mouthHit ? 2 : 1; bs.hurt = 8; addScore(mouthHit ? 200 : 100); sfx.bossHit();
            boom(b.x, b.y, false);
            if (bs.hp <= 0) { bs.dead = 1; g.fires = []; g.enemies = []; sfx.bossDie(); }
          }
        }
        g.bullets = g.bullets.filter(b => !b.dead);
      }
      function updFires() {
        const p = g.p;
        for (const f of g.fires) {
          f.x += f.vx; f.y += f.vy;
          if (f.y > GROUND || f.x < -5 || f.x > W + 5) { f.dead = true; continue; }
          if (!p.dead && Math.abs(f.x - p.x) < (g.shieldOn ? 11 : 6) && Math.abs(f.y - (PY - 2)) < (g.shieldOn ? 12 : 6)) {
            f.dead = true; if (g.shieldOn) sfx.block(); else killPlayer();
          }
        }
        g.fires = g.fires.filter(f => !f.dead);
        if (!p.dead) for (const e of g.enemies) {
          if (!e.dead && Math.abs(e.x - p.x) < (g.shieldOn ? 13 : 10) && Math.abs(e.y - PY) < (g.shieldOn ? 13 : 9)) {
            if (g.shieldOn) { e.dead = true; boom(e.x, e.y, false); addScore(100); sfx.kill(); }
            else { e.dead = true; boom(e.x, e.y, false); killPlayer(); }
          }
        }
      }

      function updGame() {
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 50 : 24));
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
        if (g.msgT > 0) g.msgT--;
        if (g.over > 0) { if (--g.over <= 0 || (g.over < 220 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; g = null; } return; }
        if (g.startT > 0) { g.startT--; return; }
        updPlayer();
        if (g.stage === 'field') {
          if (!g.enemies.length && !g.spawnQ.length) {
            if (--g.waveT <= 0) { startWave(); g.waveT = 90; }
          }
          if (g.spawnQ.length) { g.spawnT++; while (g.spawnQ.length && g.spawnQ[0].t <= g.spawnT) spawn(g.spawnQ.shift()); }
        } else updBoss();
        updEnemies();
        updBullets();
        updFires();
        const before = g.enemies.length;
        g.enemies = g.enemies.filter(e => !e.dead);
        if (g.stage === 'field' && before && !g.enemies.length && !g.spawnQ.length && g.bridge + g.pad + (g.carry ? 1 : 0) < NSEG) {
          g.pad++; sfx.piece(); g.msg = 'BRIDGE PIECE!'; g.msgT = 90; g.shield = Math.min(100, g.shield + 20);
        }
      }

      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(98, 0.25, { type: 'square', vol: 0.12 }); return false;
      }
      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        updGame();
      }

      // ---------------- rendering ----------------
      function drawBackdrop(ctx, hell) {
        const grd = ctx.createLinearGradient(0, TOP, 0, GROUND);
        grd.addColorStop(0, hell ? '#300000' : '#000008'); grd.addColorStop(1, hell ? '#a01800' : '#30081a');
        ctx.fillStyle = grd; ctx.fillRect(0, TOP, W, GROUND - TOP);
        for (const s of stars) if (!hell && ((frame >> 3) + s.c) % 7) { ctx.fillStyle = ['#ffffff', '#ffd0a0', '#a0a0ff'][s.c]; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
        ctx.fillStyle = hell ? '#400800' : '#1a0418';
        for (let i = 0; i < mtn.length; i++) { const h = mtn[i] + (hell ? 20 : 0); ctx.fillRect(i * 4, GROUND - h, 4, h); }
        if (!hell) {
          // Satan's castle on the far side of the lava
          ctx.fillStyle = '#100010';
          ctx.fillRect(196, GROUND - 70, 34, 70); ctx.fillRect(190, GROUND - 86, 10, 86); ctx.fillRect(226, GROUND - 86, 10, 86);
          for (let x = 190; x < 236; x += 6) ctx.fillRect(x, GROUND - 90, 3, 4);
          ctx.fillStyle = (frame >> 4) & 1 ? '#ff4020' : '#c02000';
          ctx.fillRect(210, GROUND - 56, 6, 8); ctx.fillRect(193, GROUND - 76, 3, 4); ctx.fillRect(229, GROUND - 76, 3, 4);
        }
      }
      function drawGround(ctx, hell) {
        ctx.fillStyle = '#4a2a18'; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = '#6a4228'; for (let x = 0; x < W; x += 8) ctx.fillRect(x + ((x >> 3) & 1) * 3, GROUND + 3 + ((x >> 3) % 3) * 6, 4, 2);
        ctx.fillStyle = '#8a5a30'; ctx.fillRect(0, GROUND, W, 1);
        if (!hell) {
          // lava river
          for (let x = LAVA; x < W; x++) {
            const h = 3 + Math.sin(x * 0.4 + frame * 0.1) * 2;
            ctx.fillStyle = ((x + (frame >> 2)) % 9) < 3 ? '#ffd040' : '#ff5010';
            ctx.fillRect(x, GROUND - h + 4, 1, H - GROUND + h);
          }
          ctx.fillStyle = '#c02000'; ctx.fillRect(LAVA, GROUND + 10, W - LAVA, H - GROUND - 10);
          if ((frame & 15) === 0) g && g.booms.length < 30 && g.booms.push({ x: rnd(LAVA + 4, W - 4), y: GROUND + 2, t: 10, big: false, cols: ['#ffe040', '#ff8020', '#ff4010', '#a01000'], bub: true });
          for (let i = 0; i < (g ? g.bridge : 0); i++) {
            ctx.drawImage(PIECE, LAVA + i * SEG, GROUND);
            ctx.fillStyle = '#503020'; ctx.fillRect(LAVA + i * SEG + 2, GROUND + 4, 2, 12); ctx.fillRect(LAVA + i * SEG + 8, GROUND + 4, 2, 12);
          }
          // pickup pad
          ctx.fillStyle = '#806040'; ctx.fillRect(2, GROUND, 24, 2);
          for (let i = 0; i < (g ? g.pad : 0); i++) ctx.drawImage(PIECE, 8, GROUND - 4 - i * 4);
        }
      }
      function drawBoss(ctx, b) {
        const x = Math.round(b.x), y = Math.round(b.y);
        const skin = b.hurt & 2 ? '#ffffff' : '#c01010', dark = '#700808';
        ctx.fillStyle = dark;
        // horns
        ctx.beginPath(); ctx.moveTo(x - 26, y - 14); ctx.lineTo(x - 40, y - 44); ctx.lineTo(x - 16, y - 22); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 26, y - 14); ctx.lineTo(x + 40, y - 44); ctx.lineTo(x + 16, y - 22); ctx.fill();
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.ellipse(x, y, 30, 32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 12, y + 24, 24, 12);
        ctx.beginPath(); ctx.moveTo(x - 12, y + 36); ctx.lineTo(x, y + 46); ctx.lineTo(x + 12, y + 36); ctx.fill();
        // brows and eyes
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(x - 24, y - 12); ctx.lineTo(x - 4, y - 4); ctx.lineTo(x - 24, y - 6); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 24, y - 12); ctx.lineTo(x + 4, y - 4); ctx.lineTo(x + 24, y - 6); ctx.fill();
        ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 18, y - 4, 9, 5); ctx.fillRect(x + 9, y - 4, 9, 5);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 14 + Math.sign(g.p.x - x), y - 4, 2, 5); ctx.fillRect(x + 13 + Math.sign(g.p.x - x), y - 4, 2, 5);
        // mouth
        const mh = b.mouth ? 14 : 3;
        ctx.fillStyle = '#100000'; ctx.fillRect(x - 13, y + 12, 26, mh);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) { ctx.fillRect(x - 11 + i * 7, y + 12, 3, 3); if (b.mouth) ctx.fillRect(x - 8 + i * 6, y + 12 + mh - 3, 2, 3); }
        if (b.mouth) { ctx.fillStyle = (frame & 4) ? '#ff8020' : '#ffe040'; ctx.fillRect(x - 5, y + 18, 10, 6); }
        // hp bar
        ctx.fillStyle = '#300'; ctx.fillRect(60, TOP + 2, 120, 4); ctx.fillStyle = '#ff3020'; ctx.fillRect(60, TOP + 2, 120 * Math.max(0, b.hp) / b.max, 4);
      }
      function drawEnemy(ctx, e) {
        const fl = ((frame >> (e.st === 'dive' ? 2 : 3)) + (e.ph * 3 | 0)) & 1;
        const im = e.type === 'bat' ? BAT[fl] : GARGS[e.kind][fl];
        ctx.drawImage(im, Math.round(e.x - im.width / 2), Math.round(e.y - im.height / 2));
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        text(ctx, '1UP', 4, 1, '#ff4020'); text(ctx, String(g ? g.score : 0).padStart(6, '0'), 4, 10, '#ffffff');
        text(ctx, 'HIGH SCORE', W / 2, 1, '#ff4020', 1, 'center'); text(ctx, String(hi).padStart(6, '0'), W / 2, 10, '#ffffff', 1, 'center');
        if (!g) return;
        text(ctx, 'RND ' + g.round, W - 4, 1, '#ffe040', 1, 'right');
        for (let i = 0; i < Math.min(5, g.lives); i++) ctx.drawImage(CANNON, W - 18 - i * 16, 9, 14, 8);
        // ground panel
        text(ctx, 'SHIELD', 30, GROUND + 14, '#80c0ff');
        ctx.fillStyle = '#102040'; ctx.fillRect(68, GROUND + 15, 50, 5);
        ctx.fillStyle = g.shield > 25 ? '#40a0ff' : '#ff4040'; ctx.fillRect(68, GROUND + 15, g.shield / 2, 5);
        if (g.stage === 'field') text(ctx, 'BRIDGE ' + g.bridge + '/' + NSEG, 124, GROUND + 14, '#ffe040');
      }
      function drawGame(ctx) {
        const hell = g.stage === 'boss';
        drawBackdrop(ctx, hell);
        drawGround(ctx, hell);
        if (g.boss) { if (!(g.boss.dead && (frame & 4))) drawBoss(ctx, g.boss); }
        for (const e of g.enemies) drawEnemy(ctx, e);
        for (const f of g.fires) { const im = FIRE[(frame >> 2) & 1]; if (f.big) ctx.drawImage(im, Math.round(f.x - 3), Math.round(f.y - 4), 6, 8); else ctx.drawImage(im, Math.round(f.x - 1), Math.round(f.y - 2)); }
        ctx.fillStyle = '#ffffff';
        for (const b of g.bullets) { ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 6); ctx.fillStyle = '#80ffff'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) + 2, 3, 1); ctx.fillStyle = '#ffffff'; }
        const p = g.p;
        if (!p.dead && !(p.inv > 0 && (frame >> 2) & 1)) {
          ctx.drawImage(CANNON, Math.round(p.x - 7), PY - 2);
          if (g.carry) ctx.drawImage(PIECE, Math.round(p.x - 6), PY - 7);
          if (g.shieldOn) {
            ctx.strokeStyle = (frame & 2) ? '#80c0ff' : '#ffffff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, PY + 6, 14, Math.PI, 0); ctx.stroke();
            ctx.beginPath(); ctx.arc(p.x, PY + 6, 11, Math.PI, 0); ctx.stroke();
          }
        }
        for (const b of g.booms) {
          const n = b.big ? 16 : 10, r = b.t * (b.big ? 0.9 : 0.6), c = b.cols[Math.min(3, b.t >> (b.big ? 4 : 3))];
          ctx.fillStyle = c;
          for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; ctx.fillRect(Math.round(b.x + Math.cos(a) * r), Math.round(b.y + Math.sin(a) * r * (b.bub ? 0.3 : 1)), 2, 2); }
        }
        for (const q of g.pops) text(ctx, q.txt, q.x, q.y - (50 - q.t) * 0.3, '#ffe040', 1, 'center');
        if (g.msgT > 0 && ((frame >> 3) & 1 || g.msg === 'GAME OVER')) text(ctx, g.msg, W / 2, 140, g.msg === 'GAME OVER' ? '#ff4040' : '#ffe040', g.msg === 'GAME OVER' ? 2 : 1, 'center');
        if (g.stage === 'field' && g.pad > 0 && !g.carry && (frame >> 4) & 1) text(ctx, '<PICK UP', 28, GROUND - 14, '#c09060');
        if (g.carry && (frame >> 4) & 1) text(ctx, 'TO THE LAVA >', maxX() - 4, GROUND - 26, '#c09060', 1, 'right');
      }
      function drawTitle(ctx) {
        drawBackdrop(ctx, false);
        ctx.fillStyle = '#4a2a18'; ctx.fillRect(0, GROUND, W, H - GROUND);
        text(ctx, "SATAN'S", W / 2 + 2, 34, '#400000', 3, 'center'); text(ctx, "SATAN'S", W / 2, 32, '#ff3020', 3, 'center');
        text(ctx, 'HOLLOW', W / 2 + 2, 62, '#400000', 4, 'center'); text(ctx, 'HOLLOW', W / 2, 60, ((frame >> 3) & 1) ? '#ff6020' : '#ffa020', 4, 'center');
        const rows = [[GARGS[0], '100   DIVING 200'], [GARGS[1], '200   DIVING 400'], [GARGS[2], '300   DIVING 600'], [BAT, '150   DIVING 300']];
        rows.forEach((r, i) => { const y = 104 + i * 18; ctx.drawImage(r[0][(frame >> 4) & 1], 44, y); text(ctx, r[1], 70, y + 2, '#ffffff'); });
        ctx.drawImage(PIECE, 46, 178); text(ctx, 'BUILD THE BRIDGE', 70, 176, '#c09060'); text(ctx, 'FACE SATAN', 70, 186, '#ff4020');
        if (api.credits === 0) { if (coinFlash > 0 || (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 204, coinFlash && (frame >> 2) & 1 ? '#ffe040' : '#ff4040', 1, 'center'); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, 204, '#40ff60', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 18, '#ffffff');
        text(ctx, '\u00a9 1982 BALLY MIDWAY', W - 4, H - 9, '#ffffff', 1, 'right');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title' || !g) drawTitle(ctx); else drawGame(ctx);
        drawHUD(ctx);
      }
      return { update, render, destroy() { } };
    }
  });
})();
