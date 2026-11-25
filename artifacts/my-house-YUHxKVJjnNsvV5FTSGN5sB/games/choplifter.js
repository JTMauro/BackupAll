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
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '"': [10, 10, 0, 0, 0, 0, 0], '#': [10, 31, 10, 10, 31, 10, 0], '&': [12, 18, 20, 8, 21, 18, 13], '%': [24, 25, 2, 4, 8, 19, 3]
  };
  // text(ctx, s, x, y, col, scale, align: 'left'|'center'|'right')
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
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  // build a sprite canvas from string rows and a palette {char: colour}
  function spr(rows, pal) {
    const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0), cv = mk(w, h), c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const p = pal[rows[y][x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
    return cv;
  }
  function flipH(cv) { const c = mk(cv.width, cv.height), x = c.getContext('2d'); x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0); return c; }
  const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => (Math.random() * n) | 0;

  // =====================================================================
  // Choplifter (Sega, 1985) -- from-scratch recreation.
  // Fly the rescue chopper from the base (far right) into enemy land, shoot the barracks open,
  // land to let the hostages climb aboard (16 at a time), and ferry them home.
  // =====================================================================
  const W = 256, H = 224;
  const GROUND = 192;          // y of the ground surface
  const WL = 2560;             // world length
  const BASE_X = 2420;         // landing pad centre
  const BASE_DOOR = 2486;      // where unloaded hostages walk to
  const BORDER_X = 2200;       // enemy ground units never cross this line
  const CAP = 16;
  const THEMES = [
    { name: 'DESERT', sky: ['#1a2a78', '#3050b0', '#6e8ee0', '#b6c8f0'], mtn: '#8a5a30', mtn2: '#b07840', gnd: '#d8b060', gnd2: '#b88a40', ceil: false },
    { name: 'SEA COAST', sky: ['#0a1040', '#18306a', '#305a9a', '#6b9ac8'], mtn: '#2a5a3a', mtn2: '#3d7a4a', gnd: '#8aa858', gnd2: '#6a8a40', ceil: false },
    { name: 'CITY', sky: ['#200a30', '#401848', '#703060', '#c06060'], mtn: '#302838', mtn2: '#483c50', gnd: '#707070', gnd2: '#505050', ceil: false },
    { name: 'CAVERN', sky: ['#000000', '#100808', '#201010', '#301818'], mtn: '#503020', mtn2: '#704030', gnd: '#806040', gnd2: '#604028', ceil: true }
  ];

  ArcadeRegistry.register({
    id: 'choplifter', title: 'Choplifter', year: 1985, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly (land gently to load) \u00b7 Space: fire \u00b7 X: face front / side \u00b7 Enter: start',
    marquee: { bg: '#0a1a50', fg: '#ffd200', accent: '#ff3030' },
    create(api) {
      const A = api.audio;
      let hi = api.getHiScore(30000);
      let state = 'title', T = 0, score = 0, lives = 3, stage = 1, nextExtra = 20000;
      let heli, barracks, hostages, tanks, jets, mines, shots, eshots, parts, pops, camX = BASE_X - W / 2;
      let rescued, killed, jetT, tankT, mineT, firstPickup, unloadT, clearBonus = 0;
      let mtnFar = [], mtnNear = [];
      for (let i = 0; i < 64; i++) { mtnFar.push(30 + Math.sin(i * 0.7) * 14 + Math.sin(i * 1.9) * 8); mtnNear.push(16 + Math.abs(Math.sin(i * 1.3)) * 18 + Math.sin(i * 0.4) * 5); }

      // ---------- coin-op ----------
      let lastCred = api.credits, coinFlash = 0;
      function pollCoins() { const c = api.credits; if (c > lastCred) A.tone(1800, .06, { vol: .08, slideTo: 2400 }); lastCred = c; if (coinFlash > 0) coinFlash--; }
      function tryStart() { if (api.useCredit()) { lastCred = api.credits; return true; } coinFlash = 90; A.tone(98, .28, { vol: .14 }); return false; }
      function drawCoin(ctx, y) {
        if (api.credits <= 0) { if (coinFlash > 0 ? (api.frame >> 2) & 1 : (api.frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, y, coinFlash > 0 ? '#ff3030' : '#ffd040', 1, 'center'); }
        else if ((api.frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, y, '#ffd040', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 9, '#c8c8c8');
      }

      // ---------- sound ----------
      const sfx = {
        shot() { A.tone(1100, .06, { type: 'square', vol: .09, slideTo: 500 }); },
        bomb() { A.tone(700, .18, { type: 'triangle', vol: .12, slideTo: 200 }); },
        boom() { A.noise(.4, { vol: .22, freq: 1400, slideTo: 80 }); },
        small() { A.noise(.15, { vol: .14, freq: 2500, slideTo: 300 }); },
        hit() { A.tone(220, .05, { type: 'square', vol: .1 }); },
        board() { A.tone(1320, .04, { type: 'square', vol: .07 }); },
        safe() { A.tone(880, .05, { type: 'square', vol: .08 }); A.tone(1175, .06, { type: 'square', vol: .08, delay: .05 }); },
        scream() { A.tone(1500, .12, { type: 'sawtooth', vol: .06, slideTo: 600 }); },
        tankfire() { A.tone(160, .12, { type: 'sawtooth', vol: .1, slideTo: 90 }); },
        jet() { A.noise(1.0, { vol: .1, freq: 3000, slideTo: 600, type: 'bandpass' }); },
        land() { A.tone(110, .08, { type: 'triangle', vol: .12 }); },
        extra() { A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .1 }); }
      };

      function addScore(n, x, y) {
        score += n;
        if (x != null) pops.push({ x, y, n, t: 50 });
        if (score >= nextExtra) { lives++; nextExtra += nextExtra < 50000 ? 30000 : 50000; sfx.extra(); }
        if (score > hi) hi = score;
      }
      function burst(x, y, n, cols, sp) {
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = Math.random() * (sp || 2); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, t: 30 + irnd(30), col: cols[irnd(cols.length)] }); }
      }

      // ---------- setup ----------
      function newHeli() {
        return { x: BASE_X, y: GROUND, vx: 0, vy: 0, face: -1, lastSide: -1, lock: false, turnT: 0, ground: true, load: 0, dead: false, deadT: 0, fireT: 0, rot: 0, inv: 90 };
      }
      function initStage() {
        heli = newHeli();
        barracks = [1840, 1380, 900, 420].map((x, i) => ({ x, hp: 3, open: false, left: CAP, spawnT: 0, flash: 0 }));
        hostages = []; tanks = []; jets = []; mines = []; shots = []; eshots = []; parts = []; pops = [];
        rescued = 0; killed = 0; jetT = 900; tankT = 240; mineT = 600; firstPickup = false; unloadT = 0;
        camX = BASE_X - W / 2 - 40;
      }
      function startGame() {
        score = 0; lives = 3; stage = 1; nextExtra = 20000;
        initStage(); state = 'ready'; T = 0;
        A.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [784, .1], [1047, .3]], { type: 'square', vol: .1 });
      }
      const theme = () => THEMES[(stage - 1) % THEMES.length];
      const ceilY = () => theme().ceil ? 44 : 26;
      const onBoardTotal = () => heli ? heli.load : 0;

      // ---------- hostages ----------
      function killHostage(h, why) {
        h.dead = true; killed++;
        burst(h.x, GROUND - 3, 4, ['#ff4040', '#ffffff'], 1);
        if (why !== 'quiet') sfx.scream();
      }
      function updateHostages() {
        const hl = heli;
        const landedField = hl && !hl.dead && hl.ground && Math.abs(hl.x - BASE_X) > 60;
        let incoming = 0;
        for (const h of hostages) if (h.st === 'run') incoming++;
        for (const h of hostages) {
          if (h.dead) continue;
          h.anim++;
          if (h.st === 'toBase') {
            h.x += 0.7;
            if (h.x >= BASE_DOOR) { h.done = true; rescued++; addScore(500); sfx.safe(); }
            continue;
          }
          const dx = hl.x - h.x;
          if (landedField && Math.abs(dx) < 110 && (hl.load + incoming < CAP || h.st === 'run')) {
            if (h.st !== 'run') { h.st = 'run'; incoming++; }
            h.x += Math.sign(dx) * 0.75;
            if (Math.abs(dx) < 5) { h.done = true; hl.load++; firstPickup = true; sfx.board(); }
          } else {
            if (h.st === 'run') h.st = 'wander';
            // wander about the home barracks, wave at a chopper overhead
            h.wave = !hl.dead && Math.abs(dx) < 40 && !hl.ground;
            if (h.wave) { if (Math.abs(dx) > 18) h.x += Math.sign(dx) * 0.3; }
            else {
              if (--h.wt <= 0) { h.wt = 40 + irnd(100); h.vx = [-0.4, 0, 0.4][irnd(3)]; }
              h.x += h.vx;
              if (Math.abs(h.x - h.home) > 60) h.vx = Math.sign(h.home - h.x) * 0.4;
            }
            h.x = clamp(h.x, 20, BORDER_X);
          }
        }
        hostages = hostages.filter(h => !h.dead && !h.done);
      }

      // ---------- heli ----------
      function killHeli() {
        const h = heli; if (h.dead) return;
        h.dead = true; h.deadT = 0; h.vy = Math.max(h.vy, 0);
        if (h.load > 0) { killed += h.load; h.load = 0; }
        // a crash on the ground lands on whoever is underneath
        for (const g of hostages) if (g.st !== 'toBase' && Math.abs(g.x - h.x) < 14 && h.y > GROUND - 20) killHostage(g, 'quiet');
        burst(h.x, h.y - 6, 40, ['#ffd040', '#ff8020', '#ff3010', '#ffffff', '#808080'], 3);
        sfx.boom(); A.tone(400, .8, { type: 'sawtooth', vol: .12, slideTo: 60 });
        state = 'dying'; T = 0;
      }
      function land() {
        const h = heli;
        h.ground = true; h.vx = 0; h.vy = 0; h.y = GROUND; sfx.land();
        for (const g of hostages) if (g.st !== 'toBase' && Math.abs(g.x - h.x) < 10) killHostage(g);
      }
      function fire() {
        const h = heli;
        if (shots.length >= 4 || h.fireT > 0) return;
        h.fireT = 9;
        if (h.face !== 0) {
          shots.push({ x: h.x + h.face * 14, y: h.y - 6 + (h.ground ? 1 : 0), vx: h.face * 5 + h.vx, vy: h.ground ? 0 : h.vy * 0.2 + (Math.abs(h.vx) > 1.2 ? 0.35 : 0), bomb: false, life: 70 });
          sfx.shot();
        } else {
          shots.push({ x: h.x, y: h.y, vx: h.vx * 0.8, vy: 1.6, bomb: true, life: 200 });
          sfx.bomb();
        }
      }
      function updateHeli() {
        const h = heli;
        if (h.inv > 0) h.inv--;
        if (h.fireT > 0) h.fireT--;
        h.rot++;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const dir = (R ? 1 : 0) - (L ? 1 : 0);
        if (api.pressed('KeyX')) {
          if (h.face !== 0) { h.lastSide = h.face; h.face = 0; h.lock = true; } else { h.face = h.lastSide; h.lock = false; }
          A.tone(300, .04, { vol: .06 });
        }
        if (dir !== 0 && !h.lock && h.face !== dir) {
          if (++h.turnT >= 9) { h.turnT = 0; if (h.face === 0) { h.face = dir; h.lastSide = dir; } else h.face = 0; }
        } else h.turnT = 0;
        if (h.ground) {
          h.vx = 0; h.vy = 0;
          if (U) { h.ground = false; h.vy = -0.7; h.y = GROUND - 1; }
        } else {
          h.vx += dir * 0.07; if (!dir) h.vx *= 0.985;
          h.vx = clamp(h.vx, -2.6, 2.6);
          if (U) h.vy -= 0.09; else if (D) h.vy += 0.09; else h.vy *= 0.9;
          h.vy = clamp(h.vy, -1.5, h.y > GROUND - 22 ? 1.0 : 1.6);
          h.x += h.vx; h.y += h.vy;
          if (h.y < ceilY() + 12) { h.y = ceilY() + 12; h.vy = 0; }
          if (h.x < 16) { h.x = 16; h.vx = 0; }
          if (h.x > WL - 16) { h.x = WL - 16; h.vx = 0; }
          if (h.y >= GROUND) {
            if (Math.abs(h.vx) > 1.4 || h.vy > 1.45) { h.y = GROUND; killHeli(); return; }
            land();
          }
        }
        if (api.pressed('Space')) fire();
        // rotor chop
        if (h.rot % 7 === 0) A.noise(.05, { vol: h.ground ? .025 : .045, freq: 500 });
        // unload at the base
        if (h.ground && Math.abs(h.x - BASE_X) < 36 && h.load > 0) {
          if (++unloadT % 10 === 0) { h.load--; hostages.push({ x: h.x + 6, home: BASE_X, st: 'toBase', anim: 0, wt: 0, vx: 0 }); }
        } else unloadT = 0;
      }

      // ---------- enemies ----------
      function spawnTank() {
        let x = camX - 24; if (x < 40) x = camX + W + 24;
        if (x > BORDER_X - 20) x = camX - 24;
        if (x < 30) return;
        tanks.push({ x, dir: 1, fireT: 60 + irnd(60), hp: 1, anim: 0, aim: -1 });
      }
      function spawnJet() {
        const fromLeft = heli.x - camX > W / 2 ? true : Math.random() < 0.5;
        const y = clamp(heli.y - 10 + rnd(-20, 20), ceilY() + 16, GROUND - 40);
        jets.push({ x: fromLeft ? camX - 30 : camX + W + 30, y, dir: fromLeft ? 1 : -1, fired: 0, sp: 3 + stage * 0.2, t: 0 });
        sfx.jet();
      }
      function spawnMine() {
        mines.push({ x: camX + rnd(20, W - 20), y: ceilY() + 4, t: 0, sp: 0.35 + stage * 0.05 });
      }
      function enemyFireAt(x, y, sp, kind) {
        const dx = heli.x - x, dy = heli.y - 6 - y, d = Math.hypot(dx, dy) || 1;
        eshots.push({ x, y, vx: dx / d * sp, vy: dy / d * sp, g: kind === 'shell' ? 0.012 : 0, kind, life: 160 });
      }
      function updateEnemies() {
        const h = heli, anyOpen = barracks.some(b => b.open);
        const maxTanks = Math.min(1 + stage, 6);
        if (--tankT <= 0) { tankT = Math.max(150, 420 - stage * 40); if ((anyOpen || stage > 1) && tanks.length < maxTanks && h.x < BORDER_X + 100) spawnTank(); }
        if (firstPickup || stage > 2) { if (--jetT <= 0) { jetT = Math.max(260, 800 - stage * 90) + irnd(200); if (!h.dead && h.x < BORDER_X + 80) spawnJet(); } }
        if (stage >= 2) { if (--mineT <= 0) { mineT = Math.max(300, 700 - stage * 60) + irnd(200); if (mines.length < Math.min(stage - 1, 4) && !h.dead && h.x < BORDER_X) spawnMine(); } }
        for (const t of tanks) {
          t.anim++;
          const dx = h.x - t.x;
          const sp = 0.28 + stage * 0.05;
          if (Math.abs(dx) > 26) { t.dir = Math.sign(dx); t.x += t.dir * sp; } else t.x += t.dir * sp * 0.3;
          t.x = clamp(t.x, 20, BORDER_X);
          t.aim = dx < 0 ? -1 : 1;
          if (--t.fireT <= 0) {
            t.fireT = Math.max(45, 120 - stage * 10) + irnd(60);
            if (!h.dead && Math.abs(dx) < 150 && t.x > camX - 10 && t.x < camX + W + 10) { enemyFireAt(t.x + t.aim * 6, GROUND - 9, 2.3 + stage * 0.1, 'shell'); sfx.tankfire(); }
          }
        }
        for (const j of jets) {
          j.t++; j.x += j.dir * j.sp;
          const dx = h.x - j.x;
          if (!j.fired && Math.sign(dx) === j.dir && Math.abs(dx) < 110 && !h.dead) { j.fired = 1; enemyFireAt(j.x + j.dir * 8, j.y + 2, 2.8 + stage * 0.15, 'missile'); A.tone(900, .2, { type: 'sawtooth', vol: .07, slideTo: 300 }); }
          if (!h.dead && h.inv <= 0 && Math.abs(dx) < 14 && Math.abs(h.y - 6 - j.y) < 7) { burst(j.x, j.y, 20, ['#ffd040', '#ff6020', '#ffffff'], 2.5); j.gone = true; killHeli(); }
          if (j.x < camX - 80 || j.x > camX + W + 80) j.gone = true;
        }
        for (const m of mines) {
          m.t++;
          if (!h.dead) { const dx = h.x - m.x, dy = h.y - 6 - m.y, d = Math.hypot(dx, dy) || 1; m.x += dx / d * m.sp; m.y += dy / d * m.sp + Math.sin(m.t * 0.1) * 0.3; }
          else m.y -= 0.5;
          if (m.y < ceilY() - 20 || m.t > 1500) m.gone = true;
          if (!h.dead && h.inv <= 0 && Math.abs(h.x - m.x) < 10 && Math.abs(h.y - 6 - m.y) < 8) { m.gone = true; burst(m.x, m.y, 14, ['#ff40ff', '#ffffff'], 2); killHeli(); }
        }
        jets = jets.filter(j => !j.gone); mines = mines.filter(m => !m.gone);
        for (const s of eshots) {
          s.x += s.vx; s.y += s.vy; s.vy += s.g; s.life--;
          if (!h.dead && h.inv <= 0 && Math.abs(s.x - h.x) < 11 && s.y > h.y - 12 && s.y < h.y + 1) { s.gone = true; killHeli(); }
          if (s.y >= GROUND) {
            s.gone = true; burst(s.x, GROUND, 6, ['#ffd040', '#a08060'], 1.2); sfx.small();
            for (const g of hostages) if (g.st !== 'toBase' && Math.abs(g.x - s.x) < 6) killHostage(g);
          }
          if (s.life <= 0 || s.y < 0) s.gone = true;
        }
        eshots = eshots.filter(s => !s.gone);
      }

      function updateShots() {
        for (const s of shots) {
          s.x += s.vx; s.y += s.vy; s.life--;
          if (s.bomb) s.vy += 0.04;
          // air targets
          for (const j of jets) if (!s.gone && Math.abs(s.x - j.x) < 11 && Math.abs(s.y - j.y) < 6) { s.gone = true; j.gone = true; burst(j.x, j.y, 22, ['#ffd040', '#ff6020', '#ffffff'], 2.5); sfx.boom(); addScore(300, j.x, j.y); }
          for (const m of mines) if (!s.gone && Math.abs(s.x - m.x) < 7 && Math.abs(s.y - m.y) < 7) { s.gone = true; m.gone = true; burst(m.x, m.y, 14, ['#ff40ff', '#ffffff'], 2); sfx.small(); addScore(200, m.x, m.y); }
          // ground targets (shots skimming low)
          if (!s.gone && s.y > GROUND - 12) {
            for (const t of tanks) if (!s.gone && Math.abs(s.x - t.x) < 9) { s.gone = true; t.gone = true; burst(t.x, GROUND - 5, 26, ['#ffd040', '#ff6020', '#606060'], 2.2); sfx.boom(); addScore(150, t.x, GROUND - 14); }
          }
          if (!s.gone && s.y > GROUND - 24) {
            for (const b of barracks) if (!s.gone && !b.open && Math.abs(s.x - b.x) < 20) {
              s.gone = true; b.hp--; b.flash = 6; sfx.hit(); addScore(50);
              if (b.hp <= 0) { b.open = true; burst(b.x, GROUND - 22, 20, ['#c08040', '#806030', '#ffd040'], 2); sfx.boom(); }
            }
          }
          if (!s.gone && s.y > GROUND - 7) {
            for (const g of hostages) if (!s.gone && g.st !== 'toBase' && Math.abs(s.x - g.x) < 3) { s.gone = true; killHostage(g); }
          }
          if (!s.gone && s.y >= GROUND) {
            s.gone = true; burst(s.x, GROUND, 8, ['#ffd040', '#c0a070'], 1.3); sfx.small();
            if (s.bomb) {
              for (const t of tanks) if (Math.abs(s.x - t.x) < 12) { t.gone = true; burst(t.x, GROUND - 5, 26, ['#ffd040', '#ff6020', '#606060'], 2.2); sfx.boom(); addScore(150, t.x, GROUND - 14); }
              for (const g of hostages) if (g.st !== 'toBase' && Math.abs(s.x - g.x) < 6) killHostage(g);
            }
          }
          if (s.life <= 0 || s.x < camX - 20 || s.x > camX + W + 20) s.gone = true;
        }
        shots = shots.filter(s => !s.gone); tanks = tanks.filter(t => !t.gone);
      }

      function updateBarracks() {
        for (const b of barracks) {
          if (b.flash > 0) b.flash--;
          if (b.open && b.left > 0 && ++b.spawnT % 14 === 0) {
            b.left--;
            hostages.push({ x: b.x + rnd(-4, 4), home: b.x, st: 'wander', anim: irnd(20), wt: irnd(40), vx: rnd(-0.4, 0.4) });
          }
        }
      }
      function stageDone() {
        return barracks.every(b => b.open && b.left === 0) && hostages.length === 0 && heli.load === 0 && !heli.dead;
      }

      function updateCamera(snap) {
        const h = heli; const target = clamp(h.x - W / 2 + h.vx * 24, 0, WL - W);
        camX = snap ? target : camX + (target - camX) * 0.08;
      }

      function updatePlay() {
        updateHeli();
        if (state !== 'play') return;
        updateBarracks(); updateHostages(); updateEnemies(); updateShots();
        updateCamera();
        if (stageDone()) {
          state = 'clear'; T = 0; clearBonus = rescued * 100 + (rescued === CAP * 4 ? 10000 : 0);
          A.melody([[659, .12], [784, .12], [988, .12], [1319, .3], [988, .12], [1319, .4]], { type: 'square', vol: .1 });
        }
      }
      function commonTick() {
        for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.t--; if (p.y > GROUND) { p.y = GROUND; p.vy *= -0.3; p.vx *= 0.6; } }
        parts = parts.filter(p => p.t > 0);
        for (const p of pops) p.t--;
        pops = pops.filter(p => p.t > 0);
      }

      function gameOver() { state = 'gameover'; T = 0; api.setHiScore(score); }

      function update() {
        T++; pollCoins();
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            break;
          case 'ready':
            updateCamera(true);
            if (T > 120) { state = 'play'; T = 0; }
            break;
          case 'play': updatePlay(); commonTick(); break;
          case 'dying': {
            const h = heli;
            if (h.y < GROUND) { h.vy += 0.08; h.y = Math.min(GROUND, h.y + h.vy); h.x += h.vx; if (T % 3 === 0) burst(h.x, h.y - 6, 2, ['#808080', '#ff8020'], 0.6); }
            updateBarracks(); updateHostages(); updateEnemies(); updateShots(); commonTick();
            if (T > 170) {
              if (lives > 1) { lives--; heli = newHeli(); eshots = []; jets = []; mines = []; tanks = tanks.filter(t => t.x < BORDER_X - 200); state = 'ready'; T = 0; updateCamera(true); }
              else if (api.offerContinue) api.offerContinue(() => { lives = 3; heli = newHeli(); eshots = []; jets = []; mines = []; state = 'ready'; T = 0; updateCamera(true); }, () => { lives = 0; gameOver(); });
              else { lives = 0; gameOver(); }
            }
            break;
          }
          case 'clear':
            commonTick();
            if (T === 150) { addScore(clearBonus); A.tone(1047, .2, { vol: .1 }); }
            if (T > 330) { stage++; initStage(); state = 'ready'; T = 0; }
            break;
          case 'gameover':
            commonTick();
            if (T > 240 || (T > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- drawing ----------
      function drawBackdrop(ctx, cx) {
        const th = theme();
        const bands = th.sky;
        const top = 18, bh = (GROUND - top) / bands.length;
        for (let i = 0; i < bands.length; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(0, top + Math.floor(i * bh), W, Math.ceil(bh) + 1); }
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, top);
        // stars / city lights
        if (th.name === 'CITY' || th.name === 'SEA COAST') { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 24; i++) { const sx = ((i * 97 - cx * 0.1) % W + W) % W, sy = top + (i * 37) % 50; ctx.fillRect(sx | 0, sy, 1, 1); } }
        // far mountains (parallax 0.25)
        ctx.fillStyle = th.mtn;
        const off1 = cx * 0.25;
        for (let x = 0; x < W; x += 4) { const wx = x + off1, i = Math.floor(wx / 24), f = (wx / 24) - i; const a = mtnFar[((i % 64) + 64) % 64], b = mtnFar[(((i + 1) % 64) + 64) % 64]; const hh = a + (b - a) * f; ctx.fillRect(x, GROUND - 10 - hh, 4, hh + 10); }
        // near hills (parallax 0.5) or city blocks
        ctx.fillStyle = th.mtn2;
        const off2 = cx * 0.5;
        if (th.name === 'CITY') {
          for (let x = -40; x < W + 40; x += 20) { const wx = Math.floor((x + off2) / 20); const hh = 20 + ((wx * 37) & 31); const sx = wx * 20 - off2; ctx.fillRect(sx, GROUND - hh, 18, hh); ctx.fillStyle = '#e0d070'; for (let k = 4; k < hh - 4; k += 6) if (((wx + k) * 13) & 2) ctx.fillRect(sx + 4, GROUND - hh + k, 2, 2); ctx.fillStyle = th.mtn2; }
        } else {
          for (let x = 0; x < W; x += 2) { const wx = x + off2, i = Math.floor(wx / 16), f = (wx / 16) - i; const a = mtnNear[((i % 64) + 64) % 64], b = mtnNear[(((i + 1) % 64) + 64) % 64]; const hh = a + (b - a) * f; ctx.fillRect(x, GROUND - hh, 2, hh); }
        }
        if (th.ceil) {
          ctx.fillStyle = th.mtn2; ctx.fillRect(0, top, W, ceilY() - top);
          for (let x = -16; x < W + 16; x += 8) { const wx = Math.floor((x + cx) / 8); const sx = wx * 8 - cx; const hh = 4 + ((wx * 29) & 15); ctx.fillRect(sx + 2, ceilY(), 4, hh); ctx.fillRect(sx + 3, ceilY() + hh, 2, 3); }
        }
        // ground
        ctx.fillStyle = th.gnd; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = th.gnd2;
        for (let x = -16; x < W + 16; x += 16) { const wx = Math.floor((x + cx) / 16); const sx = wx * 16 - cx; ctx.fillRect(sx, GROUND + 3 + ((wx * 7) & 3), 6, 1); ctx.fillRect(sx + 8, GROUND + 9 + ((wx * 5) & 3), 4, 1); }
        ctx.fillRect(0, GROUND, W, 1);
      }
      function drawBase(ctx) {
        const sx = BASE_X - camX;
        if (sx < -120 || sx > W + 120) return;
        // landing pad
        ctx.fillStyle = '#505050'; ctx.fillRect(sx - 22, GROUND, 44, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 3, GROUND, 1, 3); ctx.fillRect(sx + 3, GROUND, 1, 3); ctx.fillRect(sx - 2, GROUND + 1, 5, 1);
        // post office / base building
        const bx = BASE_DOOR - camX;
        ctx.fillStyle = '#c8c8b0'; ctx.fillRect(bx - 6, GROUND - 26, 46, 26);
        ctx.fillStyle = '#8a8a78'; ctx.fillRect(bx - 8, GROUND - 28, 50, 3);
        ctx.fillStyle = '#303040'; ctx.fillRect(bx - 2, GROUND - 12, 8, 12);
        ctx.fillStyle = '#4080c0'; for (let i = 0; i < 3; i++) ctx.fillRect(bx + 10 + i * 9, GROUND - 20, 6, 5);
        // flag
        ctx.fillStyle = '#d0d0d0'; ctx.fillRect(bx + 36, GROUND - 48, 1, 20);
        const wv = (api.frame >> 3) & 1;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 37, GROUND - 48, 12, 8);
        ctx.fillStyle = '#e02020'; for (let i = 0; i < 4; i++) ctx.fillRect(bx + 37, GROUND - 48 + i * 2, 12 - (wv && i & 1 ? 1 : 0), 1);
        ctx.fillStyle = '#2040a0'; ctx.fillRect(bx + 37, GROUND - 48, 5, 4);
        // fence marking the border
        const fx = BORDER_X - camX;
        ctx.fillStyle = '#a0a0a0'; for (let i = 0; i < 6; i++) ctx.fillRect(fx + i * 4, GROUND - 8, 1, 8);
        ctx.fillRect(fx, GROUND - 7, 21, 1); ctx.fillRect(fx, GROUND - 4, 21, 1);
      }
      function drawBarracks(ctx, b) {
        const sx = Math.round(b.x - camX);
        if (sx < -40 || sx > W + 40) return;
        const wall = b.flash ? '#ffffff' : '#a07040', roof = b.flash ? '#ffffff' : '#704820';
        ctx.fillStyle = wall; ctx.fillRect(sx - 20, GROUND - 18, 40, 18);
        if (!b.open) {
          ctx.fillStyle = roof; ctx.fillRect(sx - 22, GROUND - 22, 44, 4); ctx.fillRect(sx - 18, GROUND - 25, 36, 3);
          ctx.fillStyle = '#402810'; ctx.fillRect(sx - 3, GROUND - 10, 6, 10);
          ctx.fillStyle = '#202020'; for (let i = -1; i <= 1; i += 2) { ctx.fillRect(sx + i * 12 - 3, GROUND - 14, 6, 4); }
          ctx.fillStyle = '#c0c0c0'; for (let i = -1; i <= 1; i += 2) for (let k = 0; k < 3; k++) ctx.fillRect(sx + i * 12 - 2 + k * 2, GROUND - 14, 1, 4);
        } else {
          // blown open: jagged roof, gaping hole
          ctx.fillStyle = roof; for (let i = 0; i < 10; i++) ctx.fillRect(sx - 20 + i * 4, GROUND - 22 + ((i * 7) % 5), 4, 3);
          ctx.fillStyle = '#100800'; ctx.fillRect(sx - 9, GROUND - 16, 18, 16);
          if (b.left > 0) { ctx.fillStyle = '#ffd0a0'; for (let i = 0; i < Math.min(4, b.left); i++) ctx.fillRect(sx - 7 + i * 4, GROUND - 9, 2, 2); }
        }
      }
      function drawHostage(ctx, g) {
        const sx = Math.round(g.x - camX), y = GROUND;
        if (sx < -4 || sx > W + 4) return;
        const step = (g.anim >> 3) & 1, moving = g.st === 'run' || g.st === 'toBase' || g.vx;
        ctx.fillStyle = '#ffc890'; ctx.fillRect(sx - 1, y - 8, 2, 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, y - 6, 3, 3);
        ctx.fillStyle = '#4060c0';
        if (moving && step) { ctx.fillRect(sx - 2, y - 3, 1, 3); ctx.fillRect(sx + 1, y - 3, 1, 3); }
        else { ctx.fillRect(sx - 1, y - 3, 1, 3); ctx.fillRect(sx + 1, y - 3, 1, 3); }
        ctx.fillStyle = '#ffc890';
        if (g.wave) { ctx.fillRect(step ? sx - 2 : sx + 2, y - 10, 1, 4); }
      }
      function drawTank(ctx, t) {
        const sx = Math.round(t.x - camX), y = GROUND;
        if (sx < -16 || sx > W + 16) return;
        ctx.fillStyle = '#303030'; ctx.fillRect(sx - 8, y - 4, 16, 4);
        ctx.fillStyle = '#707070'; for (let i = 0; i < 4; i++) ctx.fillRect(sx - 7 + i * 4 + ((t.anim >> 2) & 1), y - 3, 2, 2);
        ctx.fillStyle = '#4a6a2a'; ctx.fillRect(sx - 7, y - 7, 14, 3);
        ctx.fillStyle = '#5a8a32'; ctx.fillRect(sx - 4, y - 10, 8, 3);
        ctx.fillStyle = '#3a5a20';
        ctx.fillRect(t.aim > 0 ? sx + 3 : sx - 9, y - 11, 6, 1); ctx.fillRect(t.aim > 0 ? sx + 8 : sx - 10, y - 12, 2, 1);
      }
      function drawJet(ctx, j) {
        const sx = Math.round(j.x - camX), y = Math.round(j.y), d = j.dir;
        const r = (x, yy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(d > 0 ? sx + x : sx - x - w, y + yy, w, h); };
        r(-10, -1, 18, 3, '#909aa8'); r(8, 0, 3, 1, '#909aa8'); r(2, -1, 4, 1, '#60c0ff');
        r(-4, 2, 8, 2, '#707a88'); r(-10, -4, 3, 3, '#707a88'); r(-11, -1, 1, 3, (api.frame & 2) ? '#ffa020' : '#ff4010');
      }
      function drawMine(ctx, m) {
        const sx = Math.round(m.x - camX), y = Math.round(m.y), f = (m.t >> 3) & 1;
        ctx.fillStyle = '#c040c0'; ctx.fillRect(sx - 3, y - 3, 7, 7);
        ctx.fillStyle = f ? '#ffffff' : '#ff80ff'; ctx.fillRect(sx - 1, y - 1, 3, 3);
        ctx.fillStyle = '#e080e0'; ctx.fillRect(sx, y - 6, 1, 3); ctx.fillRect(sx, y + 4, 1, 3); ctx.fillRect(sx - 6, y, 3, 1); ctx.fillRect(sx + 4, y, 3, 1);
      }
      function drawHeli(ctx, h, sx, sy) {
        sx = Math.round(sx); sy = Math.round(sy);
        const face = h.face, d = face >= 0 ? 1 : -1;
        const body = '#e8e8e0', dark = '#909088', glass = '#60c8ff';
        const tiltDn = !h.ground && Math.abs(h.vx) > 1.2 ? 1 : 0;
        const r = (x, y, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(d > 0 ? sx + x : sx - x - w, sy + y, w, hh); };
        if (face !== 0) {
          r(-8, -1, 16, 1, dark); r(-5, -3, 1, 2, dark); r(4, -3, 1, 2, dark);
          r(-5, -9, 12, 6, body); r(7, -8 + tiltDn, 2, 4, body); r(4, -8 + tiltDn, 4, 3, glass);
          r(-14, -8, 10, 2, body); r(-15, -11, 2, 5, dark);
          const tr = (h.rot >> 1) & 1; r(-16, tr ? -12 : -9, 3, 1, '#c0c0c0');
          r(0, -11, 2, 2, dark);
          r(-3, -7, 2, 2, '#e02020');
        } else {
          r(-8, -1, 16, 1, dark); r(-6, -3, 1, 2, dark); r(5, -3, 1, 2, dark);
          r(-5, -9, 10, 6, body); r(-4, -8, 8, 3, glass); r(-1, -11, 2, 2, dark); r(-1, -4, 2, 1, '#e02020');
        }
        const rl = (h.rot & 2) ? 13 : 9;
        ctx.fillStyle = '#d0d0d0'; ctx.fillRect(sx - rl, sy - 12, rl * 2, 1);
        if (h.load > 0 && face !== 0) { ctx.fillStyle = '#ffc890'; for (let i = 0; i < Math.min(3, Math.ceil(h.load / 6)); i++) ctx.fillRect(d > 0 ? sx - 3 + i * 2 : sx + 2 - i * 2, sy - 6, 1, 1); }
      }
      function drawMiniHeli(ctx, x, y) {
        ctx.fillStyle = '#e8e8e0'; ctx.fillRect(x + 3, y + 2, 6, 3); ctx.fillRect(x, y + 3, 3, 1);
        ctx.fillStyle = '#909088'; ctx.fillRect(x + 1, y, 10, 1); ctx.fillRect(x + 3, y + 6, 7, 1);
      }
      function drawHUD(ctx) {
        text(ctx, '1UP', 6, 2, '#ff4040'); text(ctx, pad(score, 6), 28, 2, '#ffffff');
        text(ctx, 'HI', 100, 2, '#ff4040'); text(ctx, pad(hi, 6), 116, 2, '#ffffff');
        text(ctx, 'STAGE ' + stage, W - 4, 2, '#ffd040', 1, 'right');
        // hostage counters along the bottom
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H - 22, W, 22);
        const cnt = (x, label, n, col) => { text(ctx, label, x, H - 20, col); text(ctx, pad(n, 2), x + label.length * 6 + 2, H - 20, '#ffffff'); };
        cnt(4, 'SAFE', rescued, '#40ff60'); cnt(60, 'LOST', killed, '#ff4040'); cnt(116, 'ON', onBoardTotal(), '#ffd040');
        let left = 0; for (const b of barracks) left += b.left; for (const g of hostages) if (g.st !== 'toBase') left++;
        cnt(160, 'LEFT', left, '#60c0ff');
        for (let i = 0; i < Math.min(lives - 1, 4); i++) drawMiniHeli(ctx, W - 14 - i * 14, H - 10);
        // radar strip showing world position
        const rx = 4, rw = 180, ry = H - 10;
        ctx.fillStyle = '#203040'; ctx.fillRect(rx, ry, rw, 6);
        const toR = x => rx + Math.round(x / WL * (rw - 1));
        ctx.fillStyle = '#40ff60'; ctx.fillRect(toR(BASE_X), ry, 2, 6);
        for (const b of barracks) { ctx.fillStyle = b.open ? (b.left ? '#ffd040' : '#806040') : '#c08040'; ctx.fillRect(toR(b.x), ry + 2, 2, 4); }
        ctx.fillStyle = '#ff4040'; for (const t of tanks) ctx.fillRect(toR(t.x), ry + 5, 1, 1);
        if (!heli.dead) { ctx.fillStyle = '#ffffff'; ctx.fillRect(toR(heli.x), ry, 1, 3); }
      }
      function drawWorld(ctx) {
        const cx = Math.round(camX);
        drawBackdrop(ctx, cx);
        drawBase(ctx);
        for (const b of barracks) drawBarracks(ctx, b);
        for (const t of tanks) drawTank(ctx, t);
        for (const g of hostages) drawHostage(ctx, g);
        for (const m of mines) drawMine(ctx, m);
        for (const j of jets) drawJet(ctx, j);
        if (heli && !(heli.dead && T > 30) && !(heli.inv > 0 && (heli.inv >> 2) & 1 && state === 'play')) drawHeli(ctx, heli, heli.x - camX, heli.y);
        for (const s of shots) { ctx.fillStyle = s.bomb ? '#ffff60' : '#ffffff'; ctx.fillRect(Math.round(s.x - camX) - 1, Math.round(s.y), s.bomb ? 2 : 3, s.bomb ? 2 : 1); }
        for (const s of eshots) { ctx.fillStyle = s.kind === 'shell' ? ((api.frame & 2) ? '#ff8040' : '#ffff40') : '#ff4040'; ctx.fillRect(Math.round(s.x - camX) - 1, Math.round(s.y) - 1, 2, 2); }
        for (const p of parts) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), p.t > 20 ? 2 : 1, p.t > 20 ? 2 : 1); }
        for (const p of pops) text(ctx, String(p.n), Math.round(p.x - camX), Math.round(p.y - (50 - p.t) * 0.3), '#ffff80', 1, 'center');
      }

      function drawTitle(ctx) {
        // scenic backdrop with a chopper sweeping past
        const cx = (T * 0.5) % 2000;
        stage = 1; drawBackdrop(ctx, cx);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 18, W, GROUND - 18);
        text(ctx, 'CHOPLIFTER', W / 2 + 2, 34, '#a01010', 3, 'center');
        text(ctx, 'CHOPLIFTER', W / 2, 32, '#ffd200', 3, 'center');
        const page = Math.floor(T / 420) % 2;
        if (page === 0) {
          text(ctx, 'RESCUE THE HOSTAGES!', W / 2, 66, '#ffffff', 1, 'center');
          text(ctx, 'SHOOT THE BARRACKS OPEN,', W / 2, 82, '#c0e0ff', 1, 'center');
          text(ctx, 'LAND GENTLY TO LOAD 16 AT A TIME', W / 2, 92, '#c0e0ff', 1, 'center');
          text(ctx, 'AND FLY THEM HOME TO BASE.', W / 2, 102, '#c0e0ff', 1, 'center');
          text(ctx, "DON'T LAND ON THEM!", W / 2, 116, '#ff8080', 1, 'center');
          text(ctx, 'X: TURN FRONT TO HIT TANKS', W / 2, 130, '#ffd040', 1, 'center');
        } else {
          text(ctx, '- SCORE -', W / 2, 64, '#ffffff', 1, 'center');
          const rows = [['HOSTAGE SAVED', 500], ['TANK', 150], ['JET FIGHTER', 300], ['AIR MINE', 200], ['BARRACKS HIT', 50]];
          rows.forEach((r, i) => { text(ctx, r[0], 52, 80 + i * 11, '#c0e0ff'); text(ctx, String(r[1]), 204, 80 + i * 11, '#ffd040', 1, 'right'); });
          text(ctx, 'HI-SCORE ' + pad(hi, 6), W / 2, 140, '#ff6060', 1, 'center');
        }
        const hx = ((T * 1.6) % (W + 80)) - 40;
        drawHeli(ctx, { face: 1, rot: T, ground: false, vx: 2, load: 0 }, hx, 168 + Math.sin(T * 0.05) * 4);
        text(ctx, '\u00a9 1985 SEGA', W / 2, 152, '#ffffff', 1, 'center');
        ctx.fillStyle = '#000'; ctx.fillRect(0, H - 24, W, 24);
        drawCoin(ctx, H - 20);
      }

      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); return; }
        drawWorld(ctx);
        drawHUD(ctx);
        if (state === 'ready') {
          text(ctx, 'STAGE ' + stage + '  ' + theme().name, W / 2, 70, '#ffd040', 1, 'center');
          if ((T >> 4) & 1) text(ctx, 'READY', W / 2, 84, '#ffffff', 1, 'center');
        } else if (state === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(40, 50, W - 80, 80);
          text(ctx, 'MISSION COMPLETE', W / 2, 58, '#ffd040', 1, 'center');
          text(ctx, 'RESCUED ' + pad(rescued, 2), W / 2, 76, '#40ff60', 1, 'center');
          text(ctx, 'LOST    ' + pad(killed, 2), W / 2, 88, '#ff4040', 1, 'center');
          if (T > 90) text(ctx, 'BONUS ' + clearBonus, W / 2, 106, '#ffffff', 1, 'center');
          if (rescued === CAP * 4 && T > 120) text(ctx, 'PERFECT!', W / 2, 118, '#ff80ff', 1, 'center');
        } else if (state === 'gameover') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(60, 70, W - 120, 30);
          text(ctx, 'GAME OVER', W / 2, 74, '#ff4040', 2, 'center');
        }
      }

      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
