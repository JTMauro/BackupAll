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
  // Pooyan (Konami, 1982) -- from-scratch recreation.
  // Mama pig rides the rope basket up and down the right side, shooting arrows at the wolves' balloons.
  // Round A: wolves float down from the ledge and climb the ladders to get her.
  // Round B: wolves float up to the cliff top; if enough of them make it, they roll the boulder down.
  // =====================================================================
  const W = 224, H = 256;
  const GROUND = 240, LEDGE_Y = 46, LEDGE_X = 54;
  const MAMA_X = 194, MAMA_MIN = 62, MAMA_MAX = 222;
  const LADDER_X = 166, SPOTS = [214, 180, 146, 112];
  const CLIFF_Y = 70, CLIFF_X = 112;
  const BAL = ['#ff3030', '#30a0ff', '#ffe030', '#40e040', '#ff60e0', '#ff9020'];

  ArcadeRegistry.register({
    id: 'pooyan', title: 'Pooyan', year: 1982, maker: 'Konami',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Up/Down: move the basket \u00b7 Space: shoot arrow (throws meat when you have it) \u00b7 X: throw meat \u00b7 Enter: start',
    marquee: { bg: '#082050', fg: '#ff80b0', accent: '#ffe030' },
    create(api) {
      const A = api.audio;
      let hi = api.getHiScore(20000);
      let state = 'title', T = 0, score = 0, lives = 3, round = 1, stageB = false, nextExtra = 30000;
      let mama, wolves, arrows, meat, rocks, parts, pops, toSpawn, spawnT, popCount, meatReady, wolvesTop, boulder, ladder, combo;

      // ---------- coin-op ----------
      let lastCred = api.credits, coinFlash = 0;
      function pollCoins() { const c = api.credits; if (c > lastCred) A.tone(1800, .06, { vol: .08, slideTo: 2400 }); lastCred = c; if (coinFlash > 0) coinFlash--; }
      function tryStart() { if (api.useCredit()) { lastCred = api.credits; return true; } coinFlash = 90; A.tone(98, .28, { vol: .14 }); return false; }
      function drawCoin(ctx, y) {
        if (api.credits <= 0) { if (coinFlash > 0 ? (api.frame >> 2) & 1 : (api.frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, y, coinFlash > 0 ? '#ff3030' : '#ffd040', 1, 'center'); }
        else if ((api.frame >> 5) & 1) text(ctx, 'PUSH START', W / 2, y, '#ffd040', 1, 'center');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), 4, H - 9, '#c8c8c8');
      }
      const sfx = {
        shoot() { A.tone(900, .07, { type: 'triangle', vol: .1, slideTo: 1500 }); },
        pop() { A.noise(.08, { vol: .18, freq: 5000, type: 'highpass' }); A.tone(1400, .05, { vol: .06 }); },
        fall() { A.tone(900, .6, { type: 'square', vol: .06, slideTo: 120 }); },
        tink() { A.tone(2400, .03, { type: 'square', vol: .06 }); },
        meat() { A.melody([[660, .05], [880, .05], [1100, .08]], { type: 'square', vol: .09 }); },
        throwMeat() { A.tone(300, .15, { type: 'triangle', vol: .12, slideTo: 150 }); },
        bite() { A.noise(.15, { vol: .15, freq: 1200 }); },
        rock() { A.tone(200, .08, { type: 'square', vol: .06 }); },
        die() { A.melody([[784, .12], [740, .12], [698, .12], [659, .12], [622, .12], [587, .4]], { type: 'square', vol: .1 }); },
        land() { A.tone(140, .06, { type: 'triangle', vol: .1 }); },
        boulder() { A.noise(1.2, { vol: .2, freq: 400, slideTo: 60 }); },
        extra() { A.melody([[784, .08], [988, .08], [1175, .08], [1568, .2]], { type: 'square', vol: .1 }); },
        clear() { A.melody([[523, .1], [587, .1], [659, .1], [784, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: .1 }); }
      };
      function addScore(n, x, y) {
        score += n; if (x != null) pops.push({ x, y, n, t: 45 });
        if (score >= nextExtra) { lives++; nextExtra += 50000; sfx.extra(); }
        if (score > hi) hi = score;
      }
      // background tune (bars of a perky march, played while the round runs)
      const TUNE = [523, 659, 784, 659, 523, 659, 784, 1047, 880, 784, 698, 659, 587, 659, 523, 0];
      let tuneI = 0;

      // ---------- setup ----------
      function waveSize() { return Math.min(40, (stageB ? 20 : 24) + (round - 1) * 4); }
      function startStage() {
        mama = { y: 140, dead: false, anim: 0, fireT: 0 };
        wolves = []; arrows = []; meat = null; rocks = []; parts = []; pops = [];
        toSpawn = waveSize(); spawnT = 60; popCount = 0; meatReady = false; wolvesTop = 0; boulder = null; ladder = [null, null, null, null]; combo = 0;
      }
      function startGame() {
        score = 0; lives = 3; round = 1; stageB = false; nextExtra = 30000;
        startStage(); state = 'ready'; T = 0;
        A.melody([[784, .1], [659, .1], [523, .1], [659, .1], [784, .2], [1047, .3]], { type: 'square', vol: .1 });
      }
      const speedK = () => 1 + (round - 1) * 0.15;

      // ---------- wolves ----------
      function spawnWolf() {
        const col = BAL[irnd(BAL.length)];
        if (!stageB) wolves.push({ st: 'walk', x: -8, y: LEDGE_Y, vx: 0.6, vy: 0, tx: rnd(40, 150), col, anim: 0, rockT: 80 + irnd(160), ph: Math.random() * 6 });
        else wolves.push({ st: 'walk', x: -8, y: GROUND, vx: 0.6, vy: 0, tx: rnd(30, 140), col, anim: 0, rockT: 120 + irnd(200), ph: Math.random() * 6, inflate: 0 });
      }
      const balR = w => w.st === 'inflate' ? 2 + (w.inflate / (w.boss ? 90 : 50)) * (w.boss ? 9 : 4) : (w.boss ? 11 : 6);
      const balloonPos = w => [w.x, w.y - 22 - balR(w)];
      function popWolf(w, byMeat) {
        w.st = 'fall'; w.vy = -0.5; w.vx = 0; sfx.pop(); sfx.fall();
        for (let i = 0; i < 8; i++) parts.push({ x: w.x, y: w.y - 26, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1), t: 20, col: w.col });
        if (w.boss) { addScore(2000, w.x, w.y - 40); }
        else if (byMeat) { combo++; addScore(200 * Math.pow(2, Math.min(combo - 1, 4)), w.x, w.y - 30); }
        else {
          // higher pops are worth more in round A, lower ones in round B
          const base = stageB ? 100 : 50, bonus = stageB ? (w.y > 160 ? 100 : 0) : (w.y < 120 ? 50 : 0);
          addScore(base + bonus, w.x, w.y - 30);
        }
        popCount++;
        if (!meatReady && !meat && popCount % 10 === 0) { meatReady = true; sfx.meat(); }
      }
      function freeSpot() { for (let i = ladder.length - 1; i >= 0; i--) if (!ladder[i]) return i; return -1; }
      function updateWolves() {
        const k = speedK();
        if (toSpawn > 0 && --spawnT <= 0) { spawnWolf(); toSpawn--; if (stageB && toSpawn === 0) { const b = wolves[wolves.length - 1]; b.boss = true; b.hp = 3 + Math.min(round, 4); b.col = '#ffffff'; } spawnT = Math.max(28, Math.round((stageB ? 100 : 80) / k)) + irnd(40); }
        for (const w of wolves) {
          w.anim++;
          switch (w.st) {
            case 'walk':
              w.x += w.vx;
              if (!stageB && w.x >= LEDGE_X) { w.st = 'float'; w.vy = (0.32 + Math.random() * 0.2) * k; }
              if (stageB && w.x >= w.tx) { w.st = 'inflate'; w.inflate = 0; }
              break;
            case 'inflate':
              if (++w.inflate >= (w.boss ? 90 : 50)) { w.st = 'rise'; w.vy = -(w.boss ? 0.22 : 0.3 + Math.random() * 0.2) * k; w.tx = rnd(24, CLIFF_X - 16); }
              break;
            case 'float':
              w.y += w.vy; w.x += clamp((w.tx - w.x) * 0.01, -0.4, 0.4) + Math.sin(w.anim * 0.03 + w.ph) * 0.15;
              if (--w.rockT <= 0 && w.y > 80 && w.y < 200) { w.rockT = Math.max(90, 260 - round * 30) + irnd(200); throwRock(w); }
              if (w.y >= GROUND) { w.y = GROUND; w.st = 'ground'; w.vx = 0.7; sfx.land(); parts.push({ x: w.x, y: w.y - 26, vx: 0, vy: -1, t: 80, col: w.col, bal: true }); }
              break;
            case 'rise':
              w.y += w.vy; w.x += clamp((w.tx - w.x) * 0.01, -0.4, 0.4) + Math.sin(w.anim * 0.03 + w.ph) * 0.15;
              if (--w.rockT <= 0 && w.y < 200) { w.rockT = Math.max(120, 300 - round * 30) + irnd(200); throwRock(w); }
              if (w.y <= CLIFF_Y) {
                w.y = CLIFF_Y; w.st = 'top'; wolvesTop++; sfx.land();
                parts.push({ x: w.x, y: w.y - 26, vx: 0, vy: -1, t: 60, col: w.col, bal: true });
                w.x = Math.min(w.x, CLIFF_X - 10);
              }
              break;
            case 'top':
              if (--w.rockT <= 0) { w.rockT = 200 + irnd(200); throwRock(w); }
              break;
            case 'ground': {
              w.x += w.vx;
              if (w.x >= LADDER_X) {
                const s = freeSpot();
                if (s >= 0) { ladder[s] = w; w.spot = s; w.st = 'climb'; w.x = LADDER_X; }
                else { w.st = 'gone'; }
              }
              break;
            }
            case 'climb':
              w.y -= 0.5 * k;
              if (w.y <= SPOTS[w.spot]) { w.y = SPOTS[w.spot]; w.st = 'perch'; }
              break;
            case 'perch':
              if (!mama.dead && Math.abs(mama.y - w.y) < 13) { w.biting = 20; killMama('bite'); }
              if (w.biting > 0) w.biting--;
              break;
            case 'fall':
              w.vy += 0.12; w.y += w.vy;
              if (w.y > H + 20) w.st = 'gone';
              break;
          }
        }
        wolves = wolves.filter(w => w.st !== 'gone');
        // stage B: enough wolves on the cliff push the boulder
        if (stageB && !boulder && wolvesTop >= 5 && !mama.dead) {
          boulder = { x: CLIFF_X - 16, y: CLIFF_Y - 8, vx: 0.6, vy: 0, t: 0 }; sfx.boulder();
        }
      }
      function throwRock(w) {
        if (mama.dead) return;
        const sx = w.x + 6, sy = w.y - 8, dx = MAMA_X - sx, t = dx / 1.6;
        const g = 0.03, vy = (mama.y - sy - 0.5 * g * t * t) / t;
        rocks.push({ x: sx, y: sy, vx: 1.6, vy, g }); sfx.rock();
      }
      function killMama(why) {
        if (mama.dead || state !== 'play') return;
        mama.dead = true; mama.why = why; state = 'dying'; T = 0; sfx.die(); if (why === 'bite') sfx.bite();
      }

      // ---------- mama / arrows / meat ----------
      function updateMama() {
        if (api.key('ArrowUp')) mama.y -= 1.3; if (api.key('ArrowDown')) mama.y += 1.3;
        mama.y = clamp(mama.y, MAMA_MIN, MAMA_MAX);
        mama.anim++;
        if (mama.fireT > 0) mama.fireT--;
        const throwKey = api.pressed('KeyX');
        if ((api.pressed('Space') || throwKey) && mama.fireT === 0) {
          if (meatReady && !meat) { meatReady = false; meat = { x: MAMA_X - 12, y: mama.y - 4, vx: -2.2, vy: -0.6 }; combo = 0; sfx.throwMeat(); mama.fireT = 12; }
          else if (!throwKey && arrows.length < 2) { arrows.push({ x: MAMA_X - 12, y: mama.y - 3, vx: -3.6, vy: 0 }); sfx.shoot(); mama.fireT = 10; }
        }
      }
      function updateArrows() {
        for (const a of arrows) {
          a.x += a.vx; a.y += a.vy; a.vy += 0.008;
          for (const w of wolves) {
            if (a.gone) break;
            if (w.st !== 'float' && w.st !== 'rise' && w.st !== 'inflate') continue;
            const [bx, by] = balloonPos(w);
            const br = balR(w);
            if (Math.abs(a.x - bx) < br + 1 && Math.abs(a.y - by) < br + 2) {
              a.gone = true;
              if (w.boss && --w.hp > 0) { sfx.tink(); A.tone(500, .06, { vol: .1 }); w.flash = 8; }
              else popWolf(w, false);
            }
            else if (Math.abs(a.x - w.x) < 6 && a.y > w.y - 16 && a.y < w.y) { a.gone = true; sfx.tink(); parts.push({ x: a.x, y: a.y, vx: 1, vy: -1, t: 12, col: '#ffffff' }); }
          }
          if (a.x < -10) a.gone = true;
        }
        arrows = arrows.filter(a => !a.gone);
        if (meat) {
          meat.x += meat.vx; meat.y += meat.vy; meat.vy += 0.02;
          for (const w of wolves) {
            if (w.st !== 'float' && w.st !== 'rise' && w.st !== 'walk' && w.st !== 'ground' && w.st !== 'inflate') continue;
            if (Math.abs(meat.x - w.x) < 10 && meat.y > w.y - 34 && meat.y < w.y + 2) { if (w.boss) { w.hp = Math.max(1, w.hp - 2); w.flash = 8; } else popWolf(w, true); }
          }
          if (meat.x < -16 || meat.y > H) meat = null;
        }
        for (const r of rocks) {
          r.x += r.vx; r.y += r.vy; r.vy += r.g;
          if (!mama.dead && Math.abs(r.x - (MAMA_X - 4)) < 7 && Math.abs(r.y - (mama.y - 6)) < 9) { r.gone = true; killMama('rock'); }
          if (r.x > W + 8 || r.y > H) r.gone = true;
        }
        rocks = rocks.filter(r => !r.gone);
        if (boulder) {
          boulder.t++;
          if (boulder.x < CLIFF_X + 4) boulder.x += boulder.vx;
          else { boulder.vx = 2.2; boulder.vy += 0.15; boulder.x += boulder.vx; boulder.y += boulder.vy; }
          if (boulder.x > MAMA_X - 14 || boulder.y > H) { killMama('boulder'); boulder = null; wolvesTop = 0; for (const w of wolves) if (w.st === 'top') w.st = 'gone'; }
        }
      }

      function stageDone() {
        if (toSpawn > 0) return false;
        return !wolves.some(w => w.st === 'walk' || w.st === 'float' || w.st === 'rise' || w.st === 'inflate' || w.st === 'ground' || w.st === 'climb' || w.st === 'fall') && !boulder;
      }

      // ---------- main ----------
      function gameOver() { state = 'gameover'; T = 0; api.setHiScore(score); }
      function tickParts() {
        for (const p of parts) { p.x += p.vx; p.y += p.vy; if (!p.bal) p.vy += 0.08; p.t--; }
        parts = parts.filter(p => p.t > 0);
        for (const q of pops) q.t--; pops = pops.filter(q => q.t > 0);
      }
      function update() {
        T++; pollCoins();
        switch (state) {
          case 'title':
            if (api.anyPressed('Enter', 'Space') && tryStart()) startGame();
            break;
          case 'ready':
            if (T > 110) { state = 'play'; T = 0; }
            break;
          case 'play':
            updateMama(); updateWolves(); updateArrows(); tickParts();
            if (api.frame % 14 === 0) { const f = TUNE[tuneI++ % TUNE.length]; if (f) A.tone(f, .1, { type: 'square', vol: .035 }); }
            if (state === 'play' && stageDone()) {
              state = 'clear'; T = 0; sfx.clear();
            }
            break;
          case 'dying':
            tickParts();
            if (T > 150) {
              const respawn = () => {
                mama.dead = false; mama.y = 140; rocks = []; arrows = []; boulder = null;
                for (let i = 0; i < ladder.length; i++) if (ladder[i]) { ladder[i].st = 'gone'; ladder[i] = null; }
                wolves = wolves.filter(w => w.st !== 'gone');
                state = 'ready'; T = 50;
              };
              if (lives > 1) { lives--; respawn(); }
              else if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, () => { lives = 0; gameOver(); });
              else { lives = 0; gameOver(); }
            }
            break;
          case 'clear':
            tickParts();
            if (T === 90) addScore(stageB ? (5 - Math.min(5, wolvesTop)) * 500 : ladder.filter(x => !x).length * 500);
            if (T > 240) { if (stageB) round++; stageB = !stageB; startStage(); state = 'ready'; T = 0; }
            break;
          case 'gameover':
            tickParts();
            if (T > 240 || (T > 60 && api.anyPressed('Enter'))) { state = 'title'; T = 0; }
            break;
        }
      }

      // ---------- drawing ----------
      function drawBalloon(ctx, x, y, r, col) {
        x = Math.round(x); y = Math.round(y); r = Math.max(1, Math.round(r));
        ctx.fillStyle = col;
        for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy) * (dy < 0 ? 0.95 : 0.85)); ctx.fillRect(x - hw, y + dy, hw * 2 + 1, 1); }
        ctx.fillRect(x, y + r, 1, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x - Math.floor(r / 2), y - Math.floor(r / 2), 2, 2);
      }
      function drawWolf(ctx, x, y, pose, anim, face) {
        // y = feet. face 1 = right
        x = Math.round(x); y = Math.round(y);
        const r = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(face > 0 ? x + dx : x - dx - w, y + dy, w, h); };
        const fur = '#8a8a9a', dark = '#5a5a6a', belly = '#d0c0b0';
        r(-3, -16, 7, 6, fur); r(3, -14, 3, 3, fur); r(5, -13, 1, 1, '#000'); r(-2, -18, 2, 2, fur); r(2, -18, 2, 2, fur);
        r(1, -15, 1, 1, '#ffff40');
        r(-3, -10, 7, 6, fur); r(-1, -9, 3, 4, belly);
        r(-6, -9, 3, 2, dark);
        if (pose === 'hang') { r(-4, -22, 1, 7, fur); r(4, -22, 1, 7, fur); r(-3, -4, 2, 4, dark); r(2, -4, 2, 4, dark); }
        else if (pose === 'climb') { const k = (anim >> 3) & 1; r(-4, -16 + k * 2, 2, 5, fur); r(3, -18 + k * 2, 2, 5, fur); r(-3, -4, 2, 4 - k, dark); r(2, -4, 2, 3 + k, dark); }
        else if (pose === 'fall') { r(-5, -14, 2, 4, fur); r(4, -14, 2, 4, fur); r(-3, -4, 2, 4, dark); r(2, -4, 2, 4, dark); }
        else { const k = (anim >> 3) & 1; r(-3 - k, -4, 2, 4, dark); r(2 + k, -4, 2, 4, dark); r(3, -9, 2, 4, fur); }
      }
      function drawMama(ctx) {
        const x = MAMA_X, y = Math.round(mama.y);
        // rope
        ctx.fillStyle = '#e0d0a0'; ctx.fillRect(x - 1, 26, 1, y - 26 - 12);
        // basket
        ctx.fillStyle = '#a06020'; ctx.fillRect(x - 12, y, 24, 12);
        ctx.fillStyle = '#704010'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 12 + i * 4, y + 1, 1, 10); ctx.fillRect(x - 12, y + 5, 24, 1);
        ctx.fillStyle = '#c08040'; ctx.fillRect(x - 13, y - 1, 26, 2);
        ctx.fillStyle = '#e0d0a0'; ctx.fillRect(x - 12, y - 12, 1, 11); ctx.fillRect(x + 11, y - 12, 1, 11); ctx.fillRect(x - 12, y - 12, 24, 1);
        // mama pig
        const dead = mama.dead, shake = dead && (T >> 2) & 1 ? 1 : 0;
        const px = x - 3 + shake, py = y - 14;
        ctx.fillStyle = '#ffa0c0'; ctx.fillRect(px - 5, py, 11, 10); ctx.fillRect(px - 4, py - 1, 9, 1); ctx.fillRect(px - 6, py + 6, 13, 8);
        ctx.fillStyle = '#ff80a8'; ctx.fillRect(px - 5, py - 3, 2, 3); ctx.fillRect(px + 4, py - 3, 2, 3);
        ctx.fillStyle = '#ff6090'; ctx.fillRect(px - 9, py + 3, 4, 3);
        ctx.fillStyle = '#000'; ctx.fillRect(px - 8, py + 4, 1, 1); ctx.fillRect(px - 6, py + 4, 1, 1);
        ctx.fillStyle = dead ? '#000' : '#fff'; ctx.fillRect(px - 3, py + 2, 2, 2); ctx.fillStyle = '#000'; if (!dead) ctx.fillRect(px - 3, py + 2, 1, 1);
        ctx.fillStyle = '#ff2040'; ctx.fillRect(px + 2, py - 4, 3, 2); ctx.fillRect(px + 6, py - 4, 3, 2); ctx.fillRect(px + 5, py - 3, 1, 1);
        // bow / meat in hand
        if (meatReady && !dead) { ctx.fillStyle = '#c04020'; ctx.fillRect(px - 14, py + 5, 7, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 16, py + 7, 3, 1); }
        else if (!dead) { ctx.fillStyle = '#c08040'; ctx.fillRect(px - 10, py + 6, 1, 9); ctx.fillRect(px - 9, py + 5, 1, 1); ctx.fillRect(px - 9, py + 15, 1, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 8, py + 6, 1, 9); }
      }
      function drawScenery(ctx) {
        // sky
        const sky = stageB ? ['#102060', '#203a80', '#3a5aa0', '#6080c0'] : ['#2050b0', '#3a70c8', '#60a0e0', '#a0d0f0'];
        for (let i = 0; i < 4; i++) { ctx.fillStyle = sky[i]; ctx.fillRect(0, 16 + i * 40, W, 40); }
        ctx.fillStyle = sky[3]; ctx.fillRect(0, 176, W, 80);
        // distant hills and trees
        ctx.fillStyle = '#3a8a4a'; for (let x = 0; x < W; x += 4) { const h = 26 + Math.sin(x * 0.05) * 10 + Math.sin(x * 0.13) * 5; ctx.fillRect(x, GROUND - h, 4, h); }
        ctx.fillStyle = '#2a6a34'; for (let x = 6; x < 150; x += 22) { ctx.fillRect(x + 3, GROUND - 46, 3, 20); ctx.fillRect(x - 2, GROUND - 60, 13, 16); ctx.fillRect(x, GROUND - 66, 9, 6); }
        // ground
        ctx.fillStyle = '#5a8a20'; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = '#7aaa30'; for (let x = 0; x < W; x += 6) ctx.fillRect(x, GROUND, 3, 2);
        // right side: the piglets' tower with pulley and ladders
        ctx.fillStyle = '#7a5a3a'; ctx.fillRect(MAMA_X + 14, 16, W - MAMA_X - 14, H - 16);
        ctx.fillStyle = '#5a3a1a'; for (let y = 24; y < H; y += 10) ctx.fillRect(MAMA_X + 14, y, W - MAMA_X - 14, 1);
        ctx.fillStyle = '#a07040'; ctx.fillRect(MAMA_X - 18, 18, 40, 6);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(MAMA_X - 4, 22, 7, 7); ctx.fillStyle = '#606060'; ctx.fillRect(MAMA_X - 1, 25, 1, 1);
        // piglets turning the pulley
        for (let i = 0; i < 2; i++) {
          const px = MAMA_X + 10 + i * 10, k = ((api.frame >> 4) + i) & 1;
          ctx.fillStyle = '#ffb0c8'; ctx.fillRect(px, 8 + k, 7, 7); ctx.fillStyle = '#ff7090'; ctx.fillRect(px - 2, 11 + k, 3, 2); ctx.fillStyle = '#000'; ctx.fillRect(px + 1, 10 + k, 1, 1);
        }
        if (!stageB) {
          // ledge the wolves set off from
          ctx.fillStyle = '#806040'; ctx.fillRect(0, LEDGE_Y, LEDGE_X + 6, 10); ctx.fillStyle = '#5a8a20'; ctx.fillRect(0, LEDGE_Y, LEDGE_X + 6, 2);
          ctx.fillStyle = '#604020'; ctx.fillRect(4, LEDGE_Y + 10, 6, 40);
          // ladders
          ctx.fillStyle = '#c09050';
          ctx.fillRect(LADDER_X - 6, SPOTS[3] - 20, 1, GROUND - SPOTS[3] + 20); ctx.fillRect(LADDER_X + 6, SPOTS[3] - 20, 1, GROUND - SPOTS[3] + 20);
          for (let y = SPOTS[3] - 18; y < GROUND; y += 6) ctx.fillRect(LADDER_X - 6, y, 13, 1);
          for (const y of SPOTS) { ctx.fillStyle = '#a07040'; ctx.fillRect(LADDER_X - 8, y, 17, 2); }
        } else {
          // the cliff and its boulder
          ctx.fillStyle = '#8a6a50'; ctx.fillRect(0, CLIFF_Y, CLIFF_X, GROUND - CLIFF_Y - 70);
          ctx.fillStyle = '#6a4a30'; for (let y = CLIFF_Y + 8; y < GROUND - 70; y += 12) ctx.fillRect(((y * 7) % 40), y, 30, 2);
          ctx.fillStyle = '#5a8a20'; ctx.fillRect(0, CLIFF_Y, CLIFF_X, 3);
          if (!boulder) { ctx.fillStyle = '#909090'; ctx.fillRect(CLIFF_X - 24, CLIFF_Y - 15, 15, 15); ctx.fillRect(CLIFF_X - 26, CLIFF_Y - 13, 19, 11); ctx.fillStyle = '#b0b0b0'; ctx.fillRect(CLIFF_X - 22, CLIFF_Y - 13, 5, 3); }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 16);
        text(ctx, '1UP', 4, 0, '#ff4040'); text(ctx, pad(score, 6), 4, 8, '#ffffff');
        text(ctx, 'HI-SCORE', W / 2, 0, '#ff4040', 1, 'center'); text(ctx, pad(hi, 6), W / 2, 8, '#ffffff', 1, 'center');
        text(ctx, 'R' + round + (stageB ? 'B' : 'A'), W - 4, 0, '#ffe030', 1, 'right');
        // wolves left
        const left = toSpawn + wolves.filter(w => w.st === 'walk' || w.st === 'float' || w.st === 'rise' || w.st === 'inflate').length;
        text(ctx, 'W' + pad(left, 2), W - 4, 8, '#c0c0d0', 1, 'right');
        for (let i = 0; i < Math.min(lives - 1, 5); i++) { ctx.fillStyle = '#ffa0c0'; ctx.fillRect(4 + i * 9, H - 7, 6, 5); ctx.fillStyle = '#ff6090'; ctx.fillRect(3 + i * 9, H - 5, 2, 2); }
        if (stageB) { text(ctx, 'TOP ' + wolvesTop + '/5', 4, 20, wolvesTop >= 4 ? '#ff4040' : '#ffffff'); }
      }
      function drawWorld(ctx) {
        drawScenery(ctx);
        for (const w of wolves) {
          if (w.st === 'walk') { drawWolf(ctx, w.x, w.y, 'walk', w.anim, 1); if (stageB) { } }
          else if (w.st === 'inflate') { drawWolf(ctx, w.x, w.y, 'hang', w.anim, 1); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(Math.round(w.x), Math.round(w.y) - 24, 1, 4); const [ibx, iby] = balloonPos(w); drawBalloon(ctx, ibx, iby, balR(w), w.col); }
          else if (w.st === 'float' || w.st === 'rise') { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(Math.round(w.x), Math.round(w.y) - 20, 1, 6); const [bx, by] = balloonPos(w); if (w.flash > 0) w.flash--; drawBalloon(ctx, bx, by, balR(w), w.flash & 2 ? '#ff4040' : w.col); if (w.boss) { text(ctx, 'BOSS', Math.round(bx), Math.round(by) - 3, '#000', 1, 'center'); } drawWolf(ctx, w.x, w.y, 'hang', w.anim, 1); }
          else if (w.st === 'fall') drawWolf(ctx, w.x, w.y, 'fall', w.anim, (w.anim >> 3) & 1 ? 1 : -1);
          else if (w.st === 'ground') drawWolf(ctx, w.x, w.y, 'walk', w.anim, 1);
          else if (w.st === 'climb') drawWolf(ctx, w.x, w.y, 'climb', w.anim, 1);
          else if (w.st === 'perch') { drawWolf(ctx, w.x + (w.biting ? 4 : 0), w.y, 'walk', 0, 1); if ((api.frame >> 5) & 1) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(w.x) + 5, Math.round(w.y) - 12, 2, 1); } }
          else if (w.st === 'top') drawWolf(ctx, w.x, w.y, 'walk', (w.rockT < 20 ? 8 : 0), 1);
        }
        if (boulder) { const bx = Math.round(boulder.x), by = Math.round(boulder.y); ctx.fillStyle = '#909090'; ctx.fillRect(bx - 7, by - 8, 15, 15); ctx.fillRect(bx - 9, by - 6, 19, 11); ctx.fillStyle = '#606060'; ctx.fillRect(bx + Math.round(Math.cos(boulder.t * 0.2) * 4), by + Math.round(Math.sin(boulder.t * 0.2) * 4), 3, 3); }
        for (const r of rocks) { ctx.fillStyle = '#a09080'; ctx.fillRect(Math.round(r.x) - 2, Math.round(r.y) - 2, 4, 4); }
        for (const a of arrows) { const x = Math.round(a.x), y = Math.round(a.y); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 9, 1); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 1, y - 1, 2, 3); ctx.fillStyle = '#ff4040'; ctx.fillRect(x + 8, y - 1, 2, 1); ctx.fillRect(x + 8, y + 1, 2, 1); }
        if (meat) { const x = Math.round(meat.x), y = Math.round(meat.y); ctx.fillStyle = '#c04020'; ctx.fillRect(x - 4, y - 3, 8, 6); ctx.fillStyle = '#ff8060'; ctx.fillRect(x - 3, y - 2, 3, 2); ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y - 1, 3, 2); }
        drawMama(ctx);
        for (const p of parts) { if (p.bal) drawBalloon(ctx, p.x, p.y, 5, p.col); else { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); } }
        for (const q of pops) text(ctx, String(q.n), Math.round(q.x), Math.round(q.y - (45 - q.t) * 0.3), '#ffffff', 1, 'center');
        drawHUD(ctx);
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#081840'; ctx.fillRect(0, 0, W, H);
        text(ctx, 'POOYAN', W / 2 + 2, 34, '#802040', 4, 'center');
        text(ctx, 'POOYAN', W / 2, 32, '#ff80b0', 4, 'center');
        // a wolf drifting down past the logo
        const wy = 70 + ((T * 0.4) % 120);
        drawBalloon(ctx, 30, wy - 26, 6, BAL[(T >> 7) % BAL.length]); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(30, wy - 20, 1, 6); drawWolf(ctx, 30, wy, 'hang', T, 1);
        if (Math.floor(T / 420) % 2 === 0) {
          text(ctx, 'HELP MAMA SAVE HER PIGLETS', W / 2, 74, '#ffffff', 1, 'center');
          text(ctx, 'FROM THE WOLVES!', W / 2, 84, '#ffffff', 1, 'center');
          text(ctx, 'POP THEIR BALLOONS', W / 2, 104, '#c0e0ff', 1, 'center');
          text(ctx, 'WITH YOUR ARROWS.', W / 2, 114, '#c0e0ff', 1, 'center');
          text(ctx, 'THROW MEAT TO KNOCK', W / 2, 130, '#ffe030', 1, 'center');
          text(ctx, 'DOWN A WHOLE ROW!', W / 2, 140, '#ffe030', 1, 'center');
        } else {
          text(ctx, '- SCORE -', W / 2, 74, '#ffffff', 1, 'center');
          const rows = [['BALLOON (ROUND A)', '50-100'], ['BALLOON (ROUND B)', '100-200'], ['MEAT COMBO', '200-3200'], ['LADDER SPOT FREE', '500']];
          rows.forEach((r, i) => { text(ctx, r[0], 16, 92 + i * 12, '#c0e0ff'); text(ctx, r[1], W - 12, 92 + i * 12, '#ffe030', 1, 'right'); });
        }
        text(ctx, 'HI-SCORE ' + pad(hi, 6), W / 2, 176, '#ff6060', 1, 'center');
        text(ctx, '\u00a9 1982 KONAMI', W / 2, 196, '#ffffff', 1, 'center');
        drawCoin(ctx, 220);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (state === 'title') { drawTitle(ctx); return; }
        drawWorld(ctx);
        if (state === 'ready') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(30, 110, 140, 30);
          text(ctx, 'ROUND ' + round + (stageB ? '  STAGE 2' : '  STAGE 1'), 100, 114, '#ffe030', 1, 'center');
          if ((T >> 4) & 1) text(ctx, 'READY!', 100, 126, '#ffffff', 1, 'center');
        } else if (state === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(20, 100, 150, 40);
          text(ctx, 'STAGE CLEAR!', 95, 106, '#40ff40', 1, 'center');
          if (T > 90) text(ctx, 'BONUS ' + (stageB ? (5 - Math.min(5, wolvesTop)) * 500 : ladder.filter(x => !x).length * 500), 95, 122, '#ffffff', 1, 'center');
        } else if (state === 'gameover') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(30, 110, 150, 30);
          text(ctx, 'GAME OVER', 105, 116, '#ff4040', 2, 'center');
        }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
