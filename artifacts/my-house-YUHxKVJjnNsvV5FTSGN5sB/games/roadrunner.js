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
  function mkSpr(rows, pal) { return { rows: rows, pal: pal, w: rows[0].length, h: rows.length, cv: null, cvf: null }; }
  function bakeSpr(s, flip) {
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    for (let y = 0; y < s.h; y++) {
      const row = s.rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = s.pal[row[x]]; if (!col) continue;
        g.fillStyle = col; g.fillRect(flip ? s.w - 1 - x : x, y, 1, 1);
      }
    }
    return c;
  }
  function drawSpr(ctx, s, x, y, flip) {
    let c = flip ? s.cvf : s.cv;
    if (!c) { c = bakeSpr(s, flip); if (flip) s.cvf = c; else s.cv = c; }
    ctx.drawImage(c, Math.round(x), Math.round(y));
  }
  function hit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function pad2(n, k) { return String(n).padStart(k || 2, '0'); }

  // ======================================================================
  // Road Runner (Atari Games, 1985) -- from-scratch recreation.
  // Run left down the desert highway, eat the birdseed, and lure Wile E.
  // Coyote into trucks, boulders and his own landmines.
  // ======================================================================
  const W = 256, H = 224, R0 = 112, R1 = 206, TOP = 18;
  const STAGES = [
    { name: 'THE HIGHWAY', trucks: 1, seeds: 1 },
    { name: 'ROCKET SKATES', trucks: 1, skates: 1 },
    { name: 'BOULDER CANYON', boulders: 1 },
    { name: 'LANDMINE ALLEY', mines: 1, trucks: 1 },
    { name: 'JET PACK', jet: 1, trucks: 1, boulders: 1 }
  ];
  const RRP = { b: '#3048d8', B: '#1c2c90', p: '#8060e0', o: '#ff9020', w: '#ffffff', k: '#000000', y: '#ffd000', l: '#ff9020', t: '#30c0ff' };
  const RR_RUN = [
    ['.....bb.........', '....bbbb........', '...bbbbbb.......', '..bbbbwkb.......', '..bbbbwwbooooo..', '...bbbbb........', '...bbbb.........', '..bbbbb.........', '.bbbpbbb........',
      'bbbppbbbtt......', 'bb.ppbbbbtt.....', 'b...pbbbb.......', '.....bbb........', '.....l.l........', '....l...l.......', '...ll....ll.....'],
    ['.....bb.........', '....bbbb........', '...bbbbbb.......', '..bbbbwkb.......', '..bbbbwwbooooo..', '...bbbbb........', '...bbbb.........', '..bbbbb.........', '.bbbpbbb........',
      'bbbppbbbtt......', 'bb.ppbbbbtt.....', 'b...pbbbb.......', '.....bbb........', '.....ll.........', '....l..l........', '....ll.ll.......'],
    ['.....bb.........', '....bbbb........', '...bbbbbb.......', '..bbbbwkb.......', '..bbbbwwbooooo..', '...bbbbb........', '...bbbb.........', '..bbbbb.........', '.bbbpbbb........',
      'bbbppbbbtt......', 'bb.ppbbbbtt.....', 'b...pbbbb.......', '.....bbb........', '......l.........', '.....lll........', '...lll.lll......']
  ].map(r => mkSpr(r, RRP));
  const RR_STAND = mkSpr(['.....bb.........', '....bbbb........', '...bbbbbb.......', '..bbbbwkb.......', '..bbbbwwbooooo..', '...bbbbb........', '...bbbb.........', '..bbbbb.........', '.bbbpbbb........',
    'bbbppbbb........', 'bb.ppbbb........', 'b...pbbb........', '.....bb.........', '.....l.l........', '.....l.l........', '....ll.ll.......'], RRP);
  const RR_TONGUE = mkSpr(['.....bb.........', '....bbbb........', '...bbbbbb.......', '..bbbbwkb.......', '..bbbbwwbooooo..', '...bbbbbbbrr....', '...bbbb...rr....', '..bbbbb.........', '.bbbpbbb........',
    'bbbppbbb........', 'bb.ppbbb........', 'b...pbbb........', '.....bb.........', '.....l.l........', '.....l.l........', '....ll.ll.......'], Object.assign({ r: '#ff4060' }, RRP));
  const CYP = { c: '#a06030', C: '#683818', t: '#e0c090', k: '#000', w: '#fff', y: '#ffe040', n: '#202020', r: '#e02020', g: '#808080' };
  const COY = [
    ['...CC...........', '..CccC..........', '..CcccC.........', '...cccccc.......', '...ccwkcccc.....', '...cccccccccn...', '....ctttcc......', '.....cccc.......', '....cccccc......', '...cctttcc......',
      '..cc.tttcc......', '.c...cccc.......', '.....cccc.......', '....cc..cc......', '...cc....cc.....', '..cc......cc....', '.CC........CC...', 'CCC........CCC..'],
    ['...CC...........', '..CccC..........', '..CcccC.........', '...cccccc.......', '...ccwkcccc.....', '...cccccccccn...', '....ctttcc......', '.....cccc.......', '....cccccc......', '...cctttcc......',
      '...cctttcc......', '..cc.cccc.......', '.....cccc.......', '.....cccc.......', '.....c..c.......', '....cc..cc......', '....CC..CC......', '...CCC..CCC.....']
  ].map(r => mkSpr(r, CYP));
  const COY_FLAT = mkSpr(['................', '................', 'CccccccccccccccC', 'CctttccwkccctttC', 'CccccccccccccccC'], CYP);
  const COY_GRAB = mkSpr(['...CC.....cc....', '..CccC...cc.....', '..CcccC.cc......', '...cccccc.......', '...ccwkcccc.....', '...cccccccccn...', '....ctttcc......', '.....cccc.......', '....cccccc......', '...cctttcc......',
    '....ctttc.......', '.....cccc.......', '.....cccc.......', '....cc..cc......', '...cc....cc.....', '..cc......cc....', '.CC........CC...', 'CCC........CCC..'], CYP);

  ArcadeRegistry.register({
    id: 'roadrunner', title: 'Road Runner', year: 1985, maker: 'Atari Games',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: run \u00b7 Space: hop \u00b7 X: beep-beep \u00b7 Enter: start',
    marquee: { bg: '#f0a040', fg: '#2040c0', accent: '#a05020' },
    create(api) {
      const au = api.audio;
      let mode = 'attract', attractT = 0, coinFlash = 0, overT = 0;
      let hi = api.getHiScore(40000);
      let score = 0, lives = 3, level = 1, nextExtra = 30000;
      let rr, coy, items, trucks, boulders, parts, pops, camX, startX, nextItemX, missed, phase, phaseT, truckT, boulderT, beepCD, stage, LEN, lap;
      const mesas = [];
      for (let i = 0; i < 64; i++) mesas.push(30 + Math.random() * 30 + (i % 7 === 0 ? 10 : 0));
      const cacti = [];
      for (let i = 0; i < 20; i++) cacti.push({ x: i * 61 + Math.random() * 30, y: 98 + Math.random() * 10, h: 8 + Math.random() * 8 });

      const sfx = {
        beep() { au.tone(1180, 0.09, { type: 'square', vol: 0.14 }); au.tone(1180, 0.12, { type: 'square', vol: 0.14, delay: 0.15 }); },
        eat() { au.tone(1500, 0.03, { type: 'square', vol: 0.07 }); au.tone(1900, 0.03, { type: 'square', vol: 0.07, delay: 0.035 }); },
        bad() { au.tone(300, 0.25, { type: 'square', vol: 0.1, slideTo: 120 }); },
        horn() { au.tone(220, 0.25, { type: 'sawtooth', vol: 0.12 }); au.tone(277, 0.25, { type: 'sawtooth', vol: 0.08 }); },
        splat() { au.noise(0.3, { vol: 0.2, freq: 900, slideTo: 100 }); au.tone(400, 0.4, { type: 'square', vol: 0.1, slideTo: 60 }); },
        whistle() { au.tone(2000, 1.0, { type: 'sine', vol: 0.08, slideTo: 300 }); },
        boom() { au.noise(0.6, { vol: 0.25, freq: 700, slideTo: 60 }); },
        hop() { au.tone(600, 0.1, { type: 'square', vol: 0.07, slideTo: 1200 }); },
        caught() { au.melody([[392, .12], [349, .12], [330, .12], [294, .12], [262, .35]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, .08], [659, .08], [784, .08], [1047, .16], [784, .08], [1047, .3]], { type: 'square', vol: 0.12 }); },
        extra() { au.melody([[1047, .06], [1319, .06], [1568, .06], [2093, .15]], { type: 'square', vol: 0.12 }); },
        skates() { au.noise(0.5, { vol: 0.12, freq: 3000, slideTo: 800, type: 'bandpass' }); }
      };
      function addScore(n, x, y) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += 50000; sfx.extra(); }
        if (score > hi) hi = score;
        if (x != null) pops.push({ x: x, y: y, s: String(n), t: 45 });
      }
      function burst(x, y, col, n) {
        for (let i = 0; i < (n || 12); i++) {
          const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 2;
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, t: 20 + Math.random() * 20, c: col });
        }
      }
      function diff() { return (lap - 1) * 0.25 + (level - 1) * 0.05; }

      function startLevel() {
        stage = STAGES[(level - 1) % STAGES.length]; lap = 1 + Math.floor((level - 1) / STAGES.length);
        LEN = 2600 + Math.min(6, level) * 150;
        camX = 0; startX = 160;
        rr = { x: 160, y: 160, hop: 0, slow: 0, anim: 0, face: -1, faint: 0, tongue: 0 };
        coy = { x: 300, y: 160, state: 'chase', t: 0, vx: 0, vy: 0, boost: 0, boostCD: 180, anim: 0, alt: 0 };
        items = []; trucks = []; boulders = []; parts = []; pops = [];
        nextItemX = 110; missed = 0; truckT = 240; boulderT = 200; beepCD = 0;
        phase = 'intro'; phaseT = 0;
      }
      function startGame() {
        mode = 'play'; score = 0; lives = 3; level = 1; nextExtra = 30000; lap = 1;
        startLevel();
        au.melody([[523, .1], [659, .1], [784, .1], [659, .1], [880, .1], [784, .25]], { type: 'square', vol: 0.12 });
      }
      function gameOver() {
        api.setHiScore(score); mode = 'over'; overT = 0;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .5]], { type: 'square', vol: 0.12 });
      }
      function tryStart() {
        if (api.useCredit()) startGame();
        else { coinFlash = 90; au.tone(80, 0.25, { type: 'square', vol: 0.2 }); }
      }
      function rrDie(how) {
        if (phase !== 'play') return;
        phase = how; phaseT = 0;
        if (how === 'caught') sfx.caught(); else { sfx.splat(); burst(rr.x - camX + 8, rr.y - 8, '#3048d8', 20); }
      }
      function afterDeath() {
        lives--;
        const resume = () => {
          // respawn where we were, Coyote set back off-screen
          phase = 'intro'; phaseT = 40;
          rr.hop = 0; rr.slow = 0; rr.faint = 0; missed = 0; rr.y = 160;
          rr.x = Math.min(rr.x, camX + 150);
          coy.x = camX + W + 50; coy.y = 160; coy.state = 'chase'; coy.boost = 0; coy.boostCD = 180;
          trucks = []; boulders = [];
          items = items.filter(it => it.kind !== 'mine' || Math.abs(it.x - rr.x) > 50);
        };
        if (lives <= 0) {
          lives = 0;
          if (api.offerContinue) api.offerContinue(() => { lives = 3; resume(); }, gameOver); else gameOver();
        } else resume();
      }
      function coyHit(kind) {
        if (coy.state !== 'chase') return;
        coy.state = kind; coy.t = 0;
        addScore(1000, coy.x - camX + 8, coy.y - 24);
        if (kind === 'flat') sfx.splat(); else { sfx.boom(); burst(coy.x - camX + 8, coy.y - 10, '#a06030', 18); burst(coy.x - camX + 8, coy.y - 10, '#202020', 10); }
      }

      function spawnItems() {
        while (nextItemX > camX - 40) {
          const y = R0 + 8 + Math.random() * (R1 - R0 - 12);
          let kind = 'seed';
          const r = Math.random();
          if (stage.mines && r < 0.35) kind = 'mine';
          else if (r < 0.12) kind = 'shot';
          items.push({ x: nextItemX, y: y, kind: kind, t: 0 });
          nextItemX -= 46 + Math.random() * 38;
          if (startX - nextItemX > LEN + 200) { nextItemX = -1e9; break; }
        }
      }

      function update() {
        if (coinFlash > 0) coinFlash = api.credits > 0 ? 0 : coinFlash - 1;
        if (mode === 'attract') {
          attractT++;
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        if (mode === 'over') {
          overT++;
          if (overT > 300 || (overT > 60 && api.anyPressed('Enter', 'Space'))) { mode = 'attract'; attractT = 0; }
          return;
        }
        phaseT++;
        for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.08; q.t--; }
        parts = parts.filter(q => q.t > 0);
        for (const q of pops) { q.y -= 0.4; q.t--; }
        pops = pops.filter(q => q.t > 0);
        if (phase === 'intro') { if (phaseT > 120) { phase = 'play'; phaseT = 0; } return; }
        if (phase === 'caught' || phase === 'splat') { if (phaseT === 150) afterDeath(); return; }
        if (phase === 'clear') {
          rr.x -= 3; rr.anim++;
          if (phaseT === 30) { addScore(2000 * level); sfx.clear(); }
          if (phaseT > 170) { level++; startLevel(); }
          return;
        }
        // ---------------- play ----------------
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        if (beepCD > 0) beepCD--;
        if (rr.tongue > 0) rr.tongue--;
        if (rr.slow > 0) rr.slow--;
        if (rr.faint > 0) {
          rr.faint++;
        } else {
          let sp = rr.slow ? 1.2 : 2.3;
          let dx = (R ? 1 : 0) - (L ? 1 : 0), dy = (D ? 1 : 0) - (U ? 1 : 0);
          if (dx && dy) { dx *= 0.75; dy *= 0.75; }
          rr.x += dx * sp; rr.y += dy * sp * 0.75;
          if (dx || dy) rr.anim++;
          if (dx) rr.face = dx < 0 ? -1 : 1;
          rr.y = Math.max(R0 + 4, Math.min(R1, rr.y));
          rr.x = Math.min(rr.x, camX + W - 18);
          if (rr.x < camX + 70) camX = rr.x - 70;
          if (api.pressed('Space') && rr.hop <= 0) { rr.hop = 26; sfx.hop(); }
          if (api.pressed('KeyX') && beepCD <= 0) {
            beepCD = 150; rr.tongue = 40; sfx.beep();
            if (coy.state === 'chase' && Math.abs(coy.x - rr.x) < 70 && Math.abs(coy.y - rr.y) < 40) { coy.state = 'startle'; coy.t = 0; addScore(100); }
          }
        }
        if (rr.hop > 0) rr.hop--;
        spawnItems();

        // items
        for (const it of items) {
          it.t++;
          if (it.kind === 'gone') continue;
          if (rr.hop <= 0 && Math.abs(it.x - (rr.x + 6)) < 9 && Math.abs(it.y - rr.y) < 6) {
            if (it.kind === 'seed') { it.kind = 'gone'; missed = 0; sfx.eat(); addScore(100, it.x - camX, it.y - 18); }
            else if (it.kind === 'shot') { it.kind = 'gone'; rr.slow = 180; sfx.bad(); pops.push({ x: it.x - camX, y: it.y - 18, s: 'STEEL SHOT!', t: 60 }); }
            else if (it.kind === 'mine') { it.kind = 'gone'; burst(it.x - camX, it.y, '#ffa020', 20); sfx.boom(); rrDie('splat'); return; }
          }
          if (it.kind === 'mine' && coy.state === 'chase' && !stage.jet && Math.abs(it.x - (coy.x + 8)) < 8 && Math.abs(it.y - coy.y) < 5) {
            it.kind = 'gone'; coyHit('boom');
          }
          if (it.kind === 'seed' && it.x > camX + W + 6 && !it.counted) { it.counted = true; missed++; if (missed === 3) sfx.bad(); }
        }
        items = items.filter(it => it.x < camX + W + 30);
        if (missed >= 5 && !rr.faint) { rr.faint = 1; pops.push({ x: rr.x - camX + 8, y: rr.y - 26, s: 'TOO HUNGRY!', t: 80 }); }

        // trucks
        if (stage.trucks && --truckT <= 0) {
          truckT = Math.max(110, 280 - level * 15 - diff() * 60) + Math.random() * 120;
          const y = R0 + 14 + Math.random() * (R1 - R0 - 16);
          trucks.push({ x: camX - 60, y: y, warn: 70, v: 4 + diff() });
          sfx.horn();
        }
        for (const t of trucks) {
          if (t.warn > 0) { t.warn--; t.x = camX - 60; continue; }
          t.x += t.v;
          if (Math.abs(t.y - rr.y) < 8 && rr.x + 12 > t.x && rr.x + 4 < t.x + 44 && rr.hop < 14) { rrDie('splat'); return; }
          if (coy.state === 'chase' && !stage.jet && Math.abs(t.y - coy.y) < 8 && coy.x + 12 > t.x && coy.x + 4 < t.x + 44) coyHit('flat');
        }
        trucks = trucks.filter(t => t.x < camX + W + 80);

        // boulders
        if (stage.boulders && --boulderT <= 0) {
          boulderT = Math.max(70, 170 - level * 8) + Math.random() * 90;
          const tgt = Math.random() < 0.5 ? rr : coy;
          boulders.push({ x: Math.max(camX + 10, Math.min(camX + W - 30, tgt.x + (Math.random() - 0.5) * 60 - 20)), y: Math.max(R0 + 8, Math.min(R1, tgt.y + (Math.random() - 0.5) * 30)), t: 0 });
          sfx.whistle();
        }
        for (const b of boulders) {
          b.t++;
          if (b.t === 60) {
            sfx.boom(); burst(b.x - camX + 8, b.y - 4, '#906040', 14);
            if (Math.abs(rr.x + 8 - (b.x + 8)) < 13 && Math.abs(rr.y - b.y) < 9 && rr.hop <= 0) { rrDie('splat'); return; }
            if (coy.state === 'chase' && Math.abs(coy.x + 8 - (b.x + 8)) < 13 && Math.abs(coy.y - b.y) < 9) coyHit('flat');
          }
        }
        boulders = boulders.filter(b => b.t < 100);

        // coyote
        coy.anim++;
        coy.t++;
        if (coy.state === 'chase') {
          let tx = rr.x + 2, ty = rr.y;
          let sp = 1.75 + diff() * 0.6 + Math.min(0.4, level * 0.04);
          if (rr.faint) sp = 2.4;
          if (coy.x - camX > W + 20) { coy.x = camX + W + 20; sp = 3; }
          if (stage.skates) {
            if (coy.boost > 0) { coy.boost--; coy.x += coy.vx; coy.y += coy.vy; if (coy.boost === 0) coy.boostCD = 160 + Math.random() * 120; }
            else if (--coy.boostCD <= 0 && coy.x - camX < W) {
              const dx = tx - coy.x, dy = ty - coy.y, d = Math.hypot(dx, dy) || 1;
              coy.vx = dx / d * 4.2; coy.vy = dy / d * 4.2 * 0.6; coy.boost = 45; sfx.skates();
            }
          }
          if (!coy.boost) {
            const dx = tx - coy.x, dy = ty - coy.y, d = Math.hypot(dx, dy) || 1;
            coy.x += dx / d * sp; coy.y += dy / d * sp * 0.7;
          }
          coy.y = Math.max(R0 + 4, Math.min(R1, coy.y));
          if (coy.x < camX - 10) { coy.x = camX - 10; coy.boost = 0; }
          coy.alt = stage.jet ? 14 + Math.sin(coy.anim * 0.1) * 4 : 0;
          if (!rr.faint && Math.abs(coy.x - rr.x) < 10 && Math.abs(coy.y - rr.y) < 7 && rr.hop < 16 && coy.alt < 20) { rrDie('caught'); return; }
          if (rr.faint && Math.abs(coy.x - rr.x) < 12 && Math.abs(coy.y - rr.y) < 9) { rrDie('caught'); return; }
        } else if (coy.state === 'startle') {
          if (coy.t > 50) coy.state = 'chase';
          coy.x += 0.6;
        } else {
          // flattened or blown up: sit out, then come back from behind
          if (coy.t > 160) { coy.state = 'chase'; coy.x = camX + W + 40; coy.y = R0 + 20 + Math.random() * 60; }
        }
        if (rr.faint > 200) { rrDie('caught'); return; }

        if (startX - rr.x > LEN) { phase = 'clear'; phaseT = 0; trucks = []; boulders = []; }
      }

      // ---------------- drawing ----------------
      function drawScenery(ctx) {
        // sky
        const sky = ['#58a8ff', '#68b4ff', '#80c4ff', '#a0d4ff', '#c0e0ff'];
        for (let i = 0; i < 5; i++) { ctx.fillStyle = sky[i]; ctx.fillRect(0, TOP + i * 14, W, 14); }
        // distant mesas (slow parallax)
        const off = camX * 0.25;
        for (let i = -1; i < 18; i++) {
          const wx = Math.floor(off / 16) + i, h = mesas[((wx % 64) + 64) % 64];
          const x = Math.round(i * 16 - (off % 16));
          ctx.fillStyle = '#c0583a'; ctx.fillRect(x, 92 - h, 16, h);
          ctx.fillStyle = '#e07a50'; ctx.fillRect(x, 92 - h, 16, 3);
          ctx.fillStyle = '#904030'; ctx.fillRect(x + 12, 92 - h + 3, 4, h - 3);
        }
        // desert floor
        ctx.fillStyle = '#e8b868'; ctx.fillRect(0, 92, W, R0 - 92 - 2);
        ctx.fillStyle = '#d8a050'; ctx.fillRect(0, R1 + 8, W, H - R1 - 8);
        // cacti
        const coff = camX * 0.7;
        for (const c of cacti) {
          const x = Math.round(((c.x - coff) % 1220 + 1220) % 1220) - 20;
          if (x < -10 || x > W) continue;
          ctx.fillStyle = '#2a8a3a'; ctx.fillRect(x, c.y - c.h, 3, c.h); ctx.fillRect(x - 3, c.y - c.h + 3, 2, 4); ctx.fillRect(x - 3, c.y - c.h + 6, 4, 1); ctx.fillRect(x + 4, c.y - c.h + 2, 2, 4); ctx.fillRect(x + 2, c.y - c.h + 5, 4, 1);
        }
        // road
        ctx.fillStyle = '#707070'; ctx.fillRect(0, R0 - 2, W, R1 - R0 + 10);
        ctx.fillStyle = '#909090'; ctx.fillRect(0, R0 - 2, W, 2); ctx.fillRect(0, R1 + 6, W, 2);
        ctx.fillStyle = '#ffffff';
        const doff = Math.round(camX) % 24;
        for (let x = -doff - 24; x < W; x += 24) { ctx.fillRect(x, (R0 + R1) / 2 | 0, 12, 2); }
        ctx.fillStyle = '#ffd040';
        for (let x = -doff - 24; x < W; x += 24) { ctx.fillRect(x + 6, R0 + 30, 6, 1); ctx.fillRect(x + 6, R1 - 28, 6, 1); }
      }
      function drawItem(ctx, it) {
        const x = Math.round(it.x - camX), y = Math.round(it.y);
        if (it.kind === 'seed') {
          ctx.fillStyle = '#c08020'; ctx.fillRect(x - 5, y - 2, 10, 3); ctx.fillRect(x - 3, y - 4, 6, 2);
          ctx.fillStyle = '#ffe080'; ctx.fillRect(x - 3, y - 3, 1, 1); ctx.fillRect(x + 1, y - 4, 1, 1); ctx.fillRect(x + 3, y - 2, 1, 1); ctx.fillRect(x - 1, y - 1, 1, 1);
        } else if (it.kind === 'shot') {
          ctx.fillStyle = '#404048'; ctx.fillRect(x - 5, y - 2, 10, 3); ctx.fillRect(x - 3, y - 4, 6, 2);
          ctx.fillStyle = '#c0c0d0'; ctx.fillRect(x - 3, y - 3, 1, 1); ctx.fillRect(x + 1, y - 4, 1, 1); ctx.fillRect(x + 3, y - 2, 1, 1);
          text(ctx, 'ACME', x, y - 12, '#ffffff', 1, 'center');
        } else if (it.kind === 'mine') {
          ctx.fillStyle = '#303030'; ctx.fillRect(x - 4, y - 3, 8, 3);
          ctx.fillStyle = (it.t >> 4) & 1 ? '#ff2020' : '#600000'; ctx.fillRect(x - 1, y - 4, 2, 1);
        }
      }
      function drawTruck(ctx, t) {
        const x = Math.round(t.x - camX), y = Math.round(t.y);
        if (t.warn > 0) {
          if ((t.warn >> 3) & 1) { ctx.fillStyle = '#ff2020'; ctx.fillRect(2, y - 14, 8, 12); text(ctx, '!', 4, y - 12, '#ffffff'); }
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y - 2, 46, 4);
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x, y - 24, 30, 20);
        ctx.fillStyle = '#c02020'; ctx.fillRect(x + 30, y - 18, 14, 14); ctx.fillRect(x + 1, y - 20, 28, 3);
        ctx.fillStyle = '#80d0ff'; ctx.fillRect(x + 36, y - 16, 6, 5);
        text(ctx, 'ACME', x + 4, y - 14, '#c02020');
        ctx.fillStyle = '#202020';
        for (const wx of [4, 20, 34]) ctx.fillRect(x + wx, y - 5, 7, 5);
        ctx.fillStyle = '#909090';
        for (const wx of [6, 22, 36]) ctx.fillRect(x + wx, y - 3, 3, 2);
      }
      function drawBoulder(ctx, b) {
        const x = Math.round(b.x - camX), y = Math.round(b.y);
        if (b.t < 60) {
          const k = b.t / 60, r = 3 + k * 9;
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + 8, y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
          const by = y - 10 - (1 - k) * 120;
          if (by > TOP) { ctx.fillStyle = '#8a6040'; ctx.beginPath(); ctx.arc(x + 8, by, 7 + k * 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#b08060'; ctx.fillRect(x + 4, by - 5, 4, 3); }
        } else {
          ctx.fillStyle = '#8a6040'; ctx.beginPath(); ctx.ellipse(x + 8, y - 4, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b08060'; ctx.fillRect(x + 3, y - 8, 5, 2);
        }
      }
      function drawRR(ctx) {
        const x = rr.x - camX, hopY = rr.hop > 0 ? Math.round(Math.sin(rr.hop / 26 * Math.PI) * 14) : 0;
        const y = rr.y - 16 - hopY;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(x + 3), Math.round(rr.y - 1), 10, 2);
        if (phase === 'splat') { ctx.fillStyle = '#3048d8'; ctx.fillRect(Math.round(x), Math.round(rr.y - 3), 16, 3); ctx.fillStyle = '#ff9020'; ctx.fillRect(Math.round(x - 4), Math.round(rr.y - 3), 4, 1); return; }
        if (phase === 'intro' && phaseT < 60 && (phaseT >> 2) & 1) return;
        let s;
        if (rr.faint) s = RR_STAND;
        else if (rr.tongue > 0) s = RR_TONGUE;
        else if (rr.anim && (api.key('ArrowLeft') || api.key('ArrowRight') || api.key('ArrowUp') || api.key('ArrowDown') || phase === 'clear')) s = RR_RUN[(rr.anim >> 2) % 3];
        else s = RR_STAND;
        if (rr.faint && (api.frame >> 4) & 1) { drawSpr(ctx, RR_STAND, x, y + 3, rr.face < 0); text(ctx, 'ZZ', x + 6, y - 8, '#ffffff'); return; }
        drawSpr(ctx, s, x, y, rr.face < 0);
        if (rr.slow && (api.frame >> 3) & 1) { ctx.fillStyle = '#c0c0d0'; ctx.fillRect(Math.round(x + 4), Math.round(y + 8), 6, 4); }
        // dust trail
        if (s !== RR_STAND && (api.frame & 3) === 0) parts.push({ x: x + 14, y: rr.y - 2, vx: 0.6, vy: -0.2, t: 12, c: '#c8c0b0' });
      }
      function drawCoy(ctx) {
        const x = coy.x - camX;
        if (x < -30 || x > W + 20) return;
        const y = coy.y - 18 - (coy.alt || 0);
        if (coy.state === 'flat') { drawSpr(ctx, COY_FLAT, x, coy.y - 5, false); return; }
        if (coy.state === 'boom') {
          if (coy.t < 60) { ctx.fillStyle = '#202020'; ctx.fillRect(Math.round(x + 3), Math.round(coy.y - 18), 10, 18); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + 6), Math.round(coy.y - 14), 2, 2); }
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(x + 3), Math.round(coy.y - 1), 10, 2);
        if (phase === 'caught') { drawSpr(ctx, COY_GRAB, x, y, coy.x > rr.x); return; }
        drawSpr(ctx, COY[(coy.anim >> 3) & 1], x, y, coy.x > rr.x);
        if (coy.state === 'startle') text(ctx, '!', x + 6, y - 10, '#ffffff');
        if (stage.skates) {
          ctx.fillStyle = '#c02020'; ctx.fillRect(Math.round(x + 1), Math.round(y + 17), 14, 2);
          if (coy.boost > 0) { ctx.fillStyle = (api.frame >> 1) & 1 ? '#ffd040' : '#ff6020'; ctx.fillRect(Math.round(x + (coy.vx < 0 ? 15 : -5)), Math.round(y + 16), 5, 3); }
        }
        if (stage.jet) {
          ctx.fillStyle = '#808080'; ctx.fillRect(Math.round(x + 9), Math.round(y + 7), 4, 7);
          ctx.fillStyle = (api.frame >> 1) & 1 ? '#ffd040' : '#ff6020'; ctx.fillRect(Math.round(x + 10), Math.round(y + 14), 2, 4);
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, TOP);
        text(ctx, '1UP', 4, 1, '#ff4040'); text(ctx, String(score), 4, 9, '#ffffff');
        text(ctx, 'HIGH', W / 2, 1, '#ff4040', 1, 'center'); text(ctx, String(hi), W / 2, 9, '#ffffff', 1, 'center');
        for (let i = 0; i < Math.min(5, lives - 1); i++) { ctx.fillStyle = '#3048d8'; ctx.fillRect(W - 12 - i * 9, 4, 6, 6); ctx.fillStyle = '#ff9020'; ctx.fillRect(W - 15 - i * 9, 6, 3, 1); }
        // distance + seed meter
        const prog = Math.max(0, Math.min(1, (startX - rr.x) / LEN));
        ctx.fillStyle = '#202020'; ctx.fillRect(0, H - 8, W, 8);
        ctx.fillStyle = '#606060'; ctx.fillRect(60, H - 5, 120, 2);
        ctx.fillStyle = '#3048d8'; ctx.fillRect(180 - Math.round(prog * 120) - 2, H - 7, 4, 6);
        text(ctx, 'LV' + level, 4, H - 8, '#ffd040');
        for (let i = 0; i < 5; i++) { ctx.fillStyle = i < 5 - missed ? '#ffd040' : '#503010'; ctx.fillRect(196 + i * 11, H - 7, 8, 6); }
      }
      function drawWorld(ctx) {
        drawScenery(ctx);
        const ents = [];
        for (const it of items) if (it.kind !== 'gone') ents.push({ y: it.y - 0.5, f: () => drawItem(ctx, it) });
        for (const b of boulders) ents.push({ y: b.y, f: () => drawBoulder(ctx, b) });
        for (const t of trucks) ents.push({ y: t.y, f: () => drawTruck(ctx, t) });
        ents.push({ y: rr.y, f: () => drawRR(ctx) });
        ents.push({ y: coy.y + 0.1, f: () => drawCoy(ctx) });
        ents.sort((a, b) => a.y - b.y);
        for (const e of ents) e.f();
        for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(q.x | 0, q.y | 0, 2, 2); }
        for (const q of pops) text(ctx, q.s, q.x | 0, q.y | 0, '#ffffff', 1, 'center');
      }
      function drawAttract(ctx) {
        ctx.fillStyle = '#58a8ff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#e8b868'; ctx.fillRect(0, 140, W, H - 140);
        ctx.fillStyle = '#c0583a'; ctx.fillRect(10, 100, 50, 40); ctx.fillRect(190, 90, 60, 50);
        ctx.fillStyle = '#e07a50'; ctx.fillRect(10, 100, 50, 3); ctx.fillRect(190, 90, 60, 3);
        text(ctx, 'ROAD', W / 2 + 2, 22, '#203080', 4, 'center'); text(ctx, 'ROAD', W / 2, 20, '#ffd040', 4, 'center');
        text(ctx, 'RUNNER', W / 2 + 2, 54, '#203080', 4, 'center'); text(ctx, 'RUNNER', W / 2, 52, '#ffd040', 4, 'center');
        const t = attractT % 360, rx = W + 20 - t * 1.4, cx = rx + 50 + Math.sin(t * 0.05) * 6;
        ctx.fillStyle = '#707070'; ctx.fillRect(0, 140, W, 30);
        drawSpr(ctx, RR_RUN[(attractT >> 2) % 3], rx, 136, true);
        drawSpr(ctx, COY[(attractT >> 3) & 1], cx, 134, true);
        if (t < 100) text(ctx, 'BEEP! BEEP!', rx + 10, 124, '#ffffff', 1, 'center');
        text(ctx, 'HI ' + hi, W / 2, 4, '#ffffff', 1, 'center');
        text(ctx, 'EAT THE BIRDSEED  100', W / 2, 92, '#203080', 1, 'center');
        text(ctx, 'COYOTE ZAPPED    1000', W / 2, 102, '#203080', 1, 'center');
        text(ctx, 'MISS 5 SEEDS AND YOU FAINT', W / 2, 180, '#803010', 1, 'center');
        const blink = (api.frame >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 192, '#ffffff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 192, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 192, '#ffffff', 1, 'center');
        text(ctx, '\u00a9 1985 ATARI GAMES', W / 2, 204, '#603010', 1, 'center');
        text(ctx, 'CREDIT ' + pad2(Math.min(99, api.credits)), 4, H - 9, '#603010');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { drawAttract(ctx); return; }
        drawWorld(ctx);
        drawHUD(ctx);
        if (phase === 'intro' && phaseT < 100) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(40, 40, W - 80, 36);
          text(ctx, 'LEVEL ' + level, W / 2, 46, '#ffd040', 1, 'center');
          text(ctx, stage.name, W / 2, 60, '#ffffff', 1, 'center');
        }
        if (phase === 'clear' && phaseT > 30) { text(ctx, 'BEEP! BEEP!', W / 2, 50, '#ffffff', 2, 'center'); text(ctx, 'LEVEL BONUS ' + 2000 * level, W / 2, 70, '#ffd040', 1, 'center'); }
        if (phase === 'caught' && phaseT > 30) text(ctx, 'GOTCHA!', W / 2, 60, '#ffffff', 2, 'center');
        if (mode === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(48, 50, W - 96, 36);
          text(ctx, 'GAME OVER', W / 2, 60, '#ff4040', 2, 'center');
        }
      }
      return { update, render };
    }
  });
})();
