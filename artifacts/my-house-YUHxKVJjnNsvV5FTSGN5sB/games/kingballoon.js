// King & Balloon (Namco, 1980) - from-scratch recreation.
// Guard the King with your cannon: shoot down the balloon fleet before it carries His Majesty away.
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
  FONT['&'] = [12, 18, 20, 8, 21, 18, 13];

  ArcadeRegistry.register({
    id: 'kingballoon', title: 'King & Balloon', year: 1980, maker: 'Namco',
    width: 224, height: 256, vector: false, pointer: false,
    controls: 'Left/Right: move cannon \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#000028', fg: '#ffd040', accent: '#ff4060' },
    create(api) {
      const W = 224, H = 256;
      const CANNON_Y = 214, KING_Y = 232, GROUND_Y = 244;
      const COLS = 10, SPX = 18, FX0 = (W - (COLS - 1) * SPX) / 2;
      const ROWS = [
        { y: 40, n: [3, 4, 5, 6], kind: 0 },
        { y: 56, n: [1, 2, 3, 4, 5, 6, 7, 8], kind: 1 },
        { y: 72, n: [1, 2, 3, 4, 5, 6, 7, 8], kind: 1 },
        { y: 88, n: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], kind: 2 },
        { y: 104, n: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], kind: 2 }
      ];
      const KINDS = [
        { col: '#c040ff', hi: '#ff90ff', pts: 60, dive: 300 },
        { col: '#ff3040', hi: '#ff9090', pts: 50, dive: 150 },
        { col: '#30d060', hi: '#a0ffb0', pts: 30, dive: 80 }
      ];
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      function newGame() {
        g = { score: 0, lives: 3, stage: 1, extra: false, phase: 'ready', t: 150, pops: [], booms: [], bubbles: [] };
        setupWave();
        g.king = newKing();
        resetCannon();
      }
      function setupWave() {
        g.balloons = [];
        ROWS.forEach((r, ri) => r.n.forEach(c => g.balloons.push({ slot: [c, ri], kind: r.kind, x: 0, y: 0, st: 'form', t: 0, vx: 0, vy: 0, phase: Math.random() * 6 })));
        g.sway = 0; g.swayDir = 1; g.attackT = 180; g.shots = []; g.bombs = [];
        g.entry = 60; // formation drifts in from above
      }
      function newKing() { return { x: 40, y: KING_Y, dir: 1, st: 'walk', vy: 0, carrier: null, walk: 0 }; }
      function resetCannon() { g.c = { x: W / 2, alive: true, t: 0, inv: 60 }; }
      function slotPos(b) {
        return [FX0 + b.slot[0] * SPX + g.sway, ROWS[b.slot[1]].y - g.entry];
      }
      function addScore(n) {
        g.score += n;
        if (!g.extra && g.score >= 10000) {
          g.extra = true; g.lives++;
          au.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .16]], { type: 'square', vol: .1 });
        }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, txt, col) { g.pops.push({ x, y, txt, col, t: 60 }); }
      function say(txt, col) { g.bubbles = [{ txt, col, t: 100 }]; }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(110, .25, { type: 'square', vol: .14 });
        return false;
      }
      const snd = {
        shot() { au.tone(1200, .07, { type: 'square', vol: .08, slideTo: 2400 }); },
        pop() { au.noise(.12, { vol: .2, freq: 4000, slideTo: 800, type: 'highpass' }); au.tone(600, .08, { type: 'square', vol: .08, slideTo: 200 }); },
        dive() { au.tone(900, .5, { type: 'triangle', vol: .07, slideTo: 300 }); },
        cannon() { au.noise(.6, { vol: .25, freq: 1500, slideTo: 80 }); },
        // little voice-like warbles for the King's lines
        help() { au.melody([[880, .09], [660, .09], [880, .09], [660, .15]], { type: 'sawtooth', vol: .1 }); },
        bye() { au.melody([[523, .15], [392, .2], [523, .15], [392, .3]], { type: 'sawtooth', vol: .1 }); },
        thanks() { au.melody([[659, .08], [784, .08], [1047, .2]], { type: 'sawtooth', vol: .1 }); },
        start() { au.melody([[392, .15], [523, .15], [659, .15], [784, .3], [659, .15], [784, .45]], { type: 'square', vol: .13 }); },
        clear() { au.melody([[784, .1], [880, .1], [988, .1], [1047, .3]], { type: 'square', vol: .13 }); }
      };

      // ---------- balloons ----------
      function launch() {
        const form = g.balloons.filter(b => b.st === 'form');
        if (!form.length) return;
        const active = g.balloons.filter(b => b.st !== 'form').length;
        if (active >= Math.min(8, 2 + g.stage)) return;
        // prefer edge balloons, like a formation peeling off
        form.sort((a, b) => Math.abs(b.slot[0] - 4.5) - Math.abs(a.slot[0] - 4.5) + (Math.random() - 0.5) * 6);
        const n = Math.random() < Math.min(0.6, 0.15 + g.stage * 0.08) ? 2 : 1;
        for (let i = 0; i < Math.min(n, form.length); i++) {
          const b = form[i];
          const [x, y] = slotPos(b);
          b.x = x; b.y = y; b.st = 'dive'; b.t = 0;
          b.vy = 0.35 + Math.min(0.45, g.stage * 0.05) + Math.random() * 0.15;
          b.hover = 0;
        }
        snd.dive();
      }
      function dropBomb(b) {
        g.bombs.push({ x: b.x, y: b.y + 8, vy: 1.3 + Math.min(1, g.stage * 0.1), vx: (g.c.x - b.x) * 0.004 });
      }
      function updateBalloon(b) {
        const k = g.king;
        b.t++;
        if (b.st === 'form') {
          const [x, y] = slotPos(b); b.x = x; b.y = y;
          return;
        }
        if (b.st === 'dive') {
          // float downward, drifting toward the King with a lazy sway
          const tx = k.st === 'walk' ? k.x : g.c.x;
          b.vx += Math.sign(tx - b.x) * 0.01; b.vx = Math.max(-0.8, Math.min(0.8, b.vx));
          b.x += b.vx + Math.sin(b.t * 0.05 + b.phase) * 0.6;
          b.y += b.vy;
          if (Math.random() < 0.006 + g.stage * 0.0015 && b.y < CANNON_Y - 30) dropBomb(b);
          if (b.y >= KING_Y - 14) {
            b.y = KING_Y - 14; b.st = 'hover'; b.hover = 0;
          }
        } else if (b.st === 'hover') {
          b.hover++;
          if (k.st === 'walk') {
            b.x += Math.sign(k.x - b.x) * Math.min(0.6, Math.abs(k.x - b.x));
            if (Math.abs(k.x - b.x) < 4) {
              // grab the King!
              k.st = 'carried'; k.carrier = b; b.st = 'carry';
              say('HELP!', '#ffffff'); snd.help();
              return;
            }
          }
          b.y = KING_Y - 14 + Math.sin(b.t * 0.1) * 1.5;
          if (b.hover > 150 || k.st !== 'walk') b.st = 'rise';
        } else if (b.st === 'carry') {
          b.y -= 0.32 + Math.min(0.25, g.stage * 0.03);
          b.x += Math.sin(b.t * 0.04 + b.phase) * 0.5;
          b.x = Math.max(8, Math.min(W - 8, b.x));
          if (b.y < 12) {
            // gone: the King is carried off
            b.st = 'gone'; kingLost();
          }
        } else if (b.st === 'rise') {
          b.y -= 0.8; b.x += Math.sin(b.t * 0.05 + b.phase) * 0.5;
          const [sx, sy] = slotPos(b);
          if (b.y <= sy + 2) {
            b.x += (sx - b.x) * 0.1;
            if (Math.abs(sx - b.x) < 1) b.st = 'form';
          }
          if (b.y < sy) b.y = sy;
        }
        // balloon vs cannon
        const c = g.c;
        if (c.alive && c.inv <= 0 && b.st !== 'carry' && Math.abs(b.x - c.x) < 10 && Math.abs(b.y + 4 - CANNON_Y) < 10) {
          b.st = 'gone'; g.booms.push({ x: b.x, y: b.y, t: 0, col: KINDS[b.kind].col });
          killCannon();
        }
      }
      function popBalloon(b) {
        const K = KINDS[b.kind];
        let v = b.st === 'form' ? K.pts : K.dive;
        if (b.st === 'carry') {
          v = 500;
          const k = g.king; k.st = 'falling'; k.vy = 0; k.carrier = null;
        }
        b.st = 'gone';
        addScore(v); pop(b.x, b.y - 6, String(v), '#ffffff');
        g.booms.push({ x: b.x, y: b.y, t: 0, col: K.col });
        snd.pop();
      }
      function killCannon() {
        const c = g.c;
        c.alive = false; c.t = 130;
        g.booms.push({ x: c.x, y: CANNON_Y, t: 0, col: '#ffd040', big: true });
        snd.cannon();
      }
      function kingLost() {
        const k = g.king; k.st = 'lost'; k.carrier = null;
        say('BYE BYE!', '#ff8080'); snd.bye();
        g.phase = 'lost'; g.t = 150;
      }

      function updateKing() {
        const k = g.king;
        if (k.st === 'walk') {
          k.walk++;
          k.x += k.dir * (0.35 + Math.min(0.3, g.stage * 0.03));
          if (k.x > 180) k.dir = -1; if (k.x < 20) k.dir = 1;
        } else if (k.st === 'carried') {
          const b = k.carrier; k.x = b.x; k.y = b.y + 16;
          if ((api.frame % 90) === 0) { say('HELP!', '#ffffff'); snd.help(); }
        } else if (k.st === 'falling') {
          // His Majesty floats down on his cape
          k.vy = Math.min(0.7, k.vy + 0.02); k.y += k.vy;
          if (k.y >= KING_Y) { k.y = KING_Y; k.st = 'walk'; addScore(1000); pop(k.x, k.y - 20, '1000', '#ffd040'); say('THANK YOU!', '#ffd040'); snd.thanks(); }
        }
      }

      function updatePlay() {
        const c = g.c;
        if (g.entry > 0) g.entry -= 0.5;
        // formation sway
        g.sway += g.swayDir * 0.25;
        if (g.sway > 12) g.swayDir = -1; if (g.sway < -12) g.swayDir = 1;
        if (c.alive) {
          if (c.inv > 0) c.inv--;
          if (api.key('ArrowLeft')) c.x -= 1.6;
          if (api.key('ArrowRight')) c.x += 1.6;
          c.x = Math.max(10, Math.min(W - 10, c.x));
          if (api.pressed('Space') && g.shots.length < 2) { g.shots.push({ x: c.x, y: CANNON_Y - 8 }); snd.shot(); }
        } else if (--c.t <= 0) { c.alive = true; c.inv = 90; c.x = W / 2; }
        if (g.entry <= 0 && --g.attackT <= 0) {
          g.attackT = Math.max(50, 160 - g.stage * 12) + Math.random() * 60;
          if (g.king.st === 'walk') launch();
        }
        for (const b of g.balloons) updateBalloon(b);
        updateKing();
        if (g.phase !== 'play') return;
        // shots
        for (const s of g.shots) {
          s.y -= 4.2;
          if (s.y < 16) { s.dead = true; continue; }
          for (const b of g.balloons) {
            if (b.st === 'gone') continue;
            if (Math.abs(b.x - s.x) < 6 && s.y > b.y - 8 && s.y < b.y + 6) { s.dead = true; popBalloon(b); break; }
          }
          // careful: a shot can hit a falling King? no - shells pass him
        }
        g.shots = g.shots.filter(s => !s.dead);
        // bombs
        for (const bm of g.bombs) {
          bm.y += bm.vy; bm.x += bm.vx;
          if (bm.y > GROUND_Y) { bm.dead = true; continue; }
          if (c.alive && c.inv <= 0 && Math.abs(bm.x - c.x) < 7 && bm.y > CANNON_Y - 6 && bm.y < CANNON_Y + 6) { bm.dead = true; killCannon(); }
        }
        g.bombs = g.bombs.filter(bm => !bm.dead);
        g.balloons = g.balloons.filter(b => b.st !== 'gone');
        if (g.balloons.length === 0 && g.king.st === 'walk') { g.phase = 'clear'; g.t = 0; snd.clear(); }
      }

      function gameOver() {
        g.phase = 'over'; g.t = 240; api.setHiScore(g.score);
        au.melody([[392, .2], [330, .2], [294, .2], [262, .5]], { type: 'square', vol: .13 });
      }

      function update() {
        if (api.credits > lastCred) au.tone(1568, .06, { type: 'square', vol: .08, slideTo: 2093 });
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); snd.start(); }
          return;
        }
        for (const pp of g.pops) { pp.t--; pp.y -= 0.2; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        for (const b of g.booms) b.t++;
        g.booms = g.booms.filter(b => b.t < (b.big ? 40 : 20));
        for (const b of g.bubbles) b.t--;
        g.bubbles = g.bubbles.filter(b => b.t > 0);
        if (g.phase === 'ready') {
          if (g.entry > 0) g.entry -= 0.5;
          for (const b of g.balloons) if (b.st === 'form') { const [x, y] = slotPos(b); b.x = x; b.y = y; }
          if (--g.t <= 0) g.phase = 'play';
          return;
        }
        if (g.phase === 'play') { updatePlay(); return; }
        if (g.phase === 'lost') {
          if (--g.t > 0) return;
          const next = () => {
            g.king = newKing(); g.bombs = []; g.shots = [];
            g.balloons = g.balloons.filter(b => b.st !== 'gone');
            // attackers regroup
            for (const b of g.balloons) if (b.st !== 'form') b.st = 'rise';
            if (!g.c.alive) { g.c.alive = true; g.c.inv = 90; }
            g.phase = 'ready'; g.t = 90;
            if (g.balloons.length === 0) setupWave();
          };
          if (g.lives <= 1) {
            g.phase = 'wait';
            if (api.offerContinue) api.offerContinue(() => { g.lives = 3; next(); }, gameOver);
            else gameOver();
          } else { g.lives--; next(); }
          return;
        }
        if (g.phase === 'clear') {
          if (++g.t === 40) { const b = 500 * Math.min(10, g.stage); addScore(b); pop(W / 2, 130, 'BONUS ' + b, '#ffd040'); }
          if (g.t > 180) { g.stage++; setupWave(); g.phase = 'ready'; g.t = 120; }
          return;
        }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 150 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
        }
      }

      // ---------- drawing ----------
      function drawBalloon(ctx, x, y, kind, t) {
        x = Math.round(x); y = Math.round(y);
        const K = KINDS[kind];
        ctx.fillStyle = K.col;
        ctx.fillRect(x - 3, y - 8, 6, 1); ctx.fillRect(x - 5, y - 7, 10, 2); ctx.fillRect(x - 6, y - 5, 12, 5);
        ctx.fillRect(x - 5, y, 10, 2); ctx.fillRect(x - 3, y + 2, 6, 1); ctx.fillRect(x - 1, y + 3, 2, 1);
        ctx.fillStyle = K.hi; ctx.fillRect(x - 4, y - 6, 2, 3); ctx.fillRect(x - 3, y - 7, 2, 1);
        // face
        ctx.fillStyle = '#000'; ctx.fillRect(x - 3, y - 3, 2, 2); ctx.fillRect(x + 1, y - 3, 2, 2);
        ctx.fillRect(x - 2, y + 1, 4, 1);
        // basket and ropes
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 3, y + 4, 1, 3); ctx.fillRect(x + 2, y + 4, 1, 3);
        ctx.fillStyle = '#c08040'; ctx.fillRect(x - 3, y + 7, 6, 3);
        ctx.fillStyle = '#804010'; ctx.fillRect(x - 3, y + 8, 6, 1);
        if (t & 32) { ctx.fillStyle = K.hi; ctx.fillRect(x + 3, y - 6, 1, 1); }
      }
      function drawKing(ctx, k) {
        const x = Math.round(k.x), y = Math.round(k.y);
        const step = (k.walk >> 4) & 1;
        // crown
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 3, y - 13, 7, 2); ctx.fillRect(x - 3, y - 15, 1, 2); ctx.fillRect(x, y - 15, 1, 2); ctx.fillRect(x + 3, y - 15, 1, 2);
        // face + beard
        ctx.fillStyle = '#ffc090'; ctx.fillRect(x - 3, y - 11, 7, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 8, 7, 2);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 2 + (k.dir > 0 ? 1 : 0), y - 10, 1, 1); ctx.fillRect(x + 1 + (k.dir > 0 ? 1 : 0), y - 10, 1, 1);
        // robe with ermine
        ctx.fillStyle = '#e02020'; ctx.fillRect(x - 4, y - 6, 9, 6);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y - 6, 1, 6); ctx.fillRect(x - 4, y - 1, 9, 1);
        // legs
        ctx.fillStyle = '#4040c0';
        if (k.st === 'walk') { ctx.fillRect(x - 3 + step, y, 2, 3); ctx.fillRect(x + 1 - step, y, 2, 3); }
        else { ctx.fillRect(x - 3, y, 2, 2); ctx.fillRect(x + 2, y, 2, 2); ctx.fillStyle = '#ffc090'; ctx.fillRect(x - 6, y - 7, 2, 2); ctx.fillRect(x + 5, y - 7, 2, 2); }
        if (k.st === 'falling') {
          // cape as parachute
          ctx.fillStyle = '#e02020'; ctx.fillRect(x - 8, y - 24, 17, 3); ctx.fillRect(x - 6, y - 25, 13, 1);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 7, y - 21, 1, 7); ctx.fillRect(x + 7, y - 21, 1, 7);
        }
      }
      function drawCannon(ctx, x, inv) {
        if (inv > 0 && (api.frame >> 2) & 1) return;
        x = Math.round(x); const y = CANNON_Y;
        ctx.fillStyle = '#a0a0b0'; ctx.fillRect(x - 1, y - 9, 3, 6);
        ctx.fillStyle = '#4060ff'; ctx.fillRect(x - 4, y - 4, 9, 4); ctx.fillRect(x - 6, y, 13, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 3, 2, 1);
        ctx.fillStyle = '#303030'; ctx.fillRect(x - 6, y + 3, 4, 3); ctx.fillRect(x + 3, y + 3, 4, 3);
        ctx.fillStyle = '#808080'; ctx.fillRect(x - 5, y + 4, 2, 1); ctx.fillRect(x + 4, y + 4, 2, 1);
      }
      function drawScenery(ctx) {
        // night sky stars
        for (let i = 0; i < 40; i++) {
          const sx = (i * 97 + 13) % W, sy = 20 + (i * 53) % 150;
          if (((api.frame >> 5) + i) % 5 === 0) continue;
          ctx.fillStyle = i % 3 ? '#6060a0' : '#c0c0ff'; ctx.fillRect(sx, sy, 1, 1);
        }
        // distant hills
        ctx.fillStyle = '#103018';
        for (let x = 0; x < W; x += 2) { const h = 10 + Math.sin(x * 0.04) * 6 + Math.sin(x * 0.11) * 3; ctx.fillRect(x, 200 - h, 2, h); }
        // castle on the right
        const cx = 192;
        ctx.fillStyle = '#707080'; ctx.fillRect(cx, 196, 30, 48); ctx.fillRect(cx - 4, 186, 10, 58); ctx.fillRect(cx + 22, 186, 10, 58);
        ctx.fillStyle = '#505060';
        for (let i = 0; i < 3; i++) { ctx.fillRect(cx - 4 + i * 4, 183, 2, 3); ctx.fillRect(cx + 22 + i * 4, 183, 2, 3); }
        for (let i = 0; i < 4; i++) ctx.fillRect(cx + 4 + i * 6, 193, 3, 3);
        ctx.fillStyle = '#201008'; ctx.fillRect(cx + 9, 228, 10, 16); ctx.fillRect(cx + 10, 226, 8, 2);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(cx + 0, 200, 2, 3); ctx.fillRect(cx + 26, 200, 2, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 14, 170, 1, 16);
        ctx.fillStyle = '#ff3030'; ctx.fillRect(cx + 15, 170 + ((api.frame >> 4) & 1), 7, 4);
        // ground
        ctx.fillStyle = '#306020'; ctx.fillRect(0, GROUND_Y - 22, W, 2);
        ctx.fillStyle = '#204010'; ctx.fillRect(0, GROUND_Y - 20, W, 20);
        ctx.fillStyle = '#806040'; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
        ctx.fillStyle = '#604020';
        for (let x = 0; x < W; x += 8) ctx.fillRect(x + ((x >> 3) & 1) * 4, GROUND_Y + 4, 4, 2);
      }
      function drawHud(ctx) {
        text(ctx, '1UP', 8, 1, '#ff4040');
        text(ctx, String(g ? g.score : 0).padStart(6, ' '), 30, 1, '#ffffff');
        text(ctx, 'HI', 120, 1, '#ff4040');
        text(ctx, String(hi).padStart(6, ' '), 136, 1, '#ffffff');
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function drawTitle(ctx) {
        drawHud(ctx);
        const t = titleT;
        text(ctx, 'KING', W / 2 + 1, 27, '#604000', 4, 'center');
        text(ctx, 'KING', W / 2, 26, '#ffd040', 4, 'center');
        text(ctx, '&', W / 2, 58, '#ffffff', 2, 'center');
        text(ctx, 'BALLOON', W / 2 + 1, 77, '#600010', 3, 'center');
        text(ctx, 'BALLOON', W / 2, 76, '#ff4060', 3, 'center');
        text(ctx, '- SCORE -', W / 2, 108, '#ffffff', 1, 'center');
        text(ctx, 'FORM  DIVE', 140, 120, '#a0a0a0', 1, 'center');
        for (let i = 0; i < 3; i++) {
          drawBalloon(ctx, 60, 136 + i * 20, i, t);
          text(ctx, String(KINDS[i].pts).padStart(3, ' ') + '   ' + String(KINDS[i].dive).padStart(3, ' '), 140, 133 + i * 20, KINDS[i].col, 1, 'center');
        }
        drawKing(ctx, { x: 60, y: 206, st: 'walk', walk: t, dir: 1 });
        text(ctx, 'RESCUE  1000', 140, 196, '#ffd040', 1, 'center');
        text(ctx, 'SAVE THE KING!', W / 2, 214, '#ffffff', 1, 'center');
        const blink = (t >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 228, '#ff3030', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 228, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 228, '#ff3030', 1, 'center');
        text(ctx, '\u00a9 1980 NAMCO', W / 2, 240, '#a0a0a0', 1, 'center');
        text(ctx, credStr(), 4, H - 8, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000014'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawScenery(ctx);
        drawHud(ctx);
        for (const b of g.balloons) drawBalloon(ctx, b.x, b.y, b.kind, api.frame);
        const k = g.king;
        if (k.st !== 'lost') {
          if (k.st === 'carried' && k.carrier) {
            ctx.fillStyle = '#c0c0c0'; ctx.fillRect(Math.round(k.x), Math.round(k.carrier.y + 10), 1, Math.max(0, Math.round(k.y - 15 - k.carrier.y - 10)));
          }
          drawKing(ctx, k);
        }
        for (const bb of g.bubbles) {
          const bx = Math.max(30, Math.min(W - 30, Math.round(k.x))), by = Math.round(k.y) - 30;
          const w = bb.txt.length * 6 + 6;
          ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - w / 2, by - 2, w, 11); ctx.fillRect(bx - 1, by + 9, 3, 3);
          text(ctx, bb.txt, bx, by, '#000000', 1, 'center');
        }
        const c = g.c;
        if (c.alive) drawCannon(ctx, c.x, c.inv);
        for (const s of g.shots) { ctx.fillStyle = '#ffffa0'; ctx.fillRect(Math.round(s.x), Math.round(s.y) - 3, 1, 5); }
        for (const bm of g.bombs) { ctx.fillStyle = (api.frame >> 2) & 1 ? '#ff4040' : '#ffffff'; ctx.fillRect(Math.round(bm.x) - 1, Math.round(bm.y) - 2, 2, 4); }
        for (const b of g.booms) {
          const r = b.big ? b.t * 0.5 : b.t * 0.6;
          ctx.fillStyle = b.t & 2 ? '#ffffff' : b.col;
          for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4 + b.t * 0.05;
            ctx.fillRect(Math.round(b.x + Math.cos(a) * r) - 1, Math.round(b.y + Math.sin(a) * r) - 1, 2, 2);
          }
        }
        for (const pp of g.pops) text(ctx, pp.txt, pp.x, pp.y, pp.col, 1, 'center');
        // lives (kings) and round flags
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) {
          const x = 8 + i * 10;
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x, H - 9, 7, 2); ctx.fillRect(x, H - 11, 1, 2); ctx.fillRect(x + 3, H - 11, 1, 2); ctx.fillRect(x + 6, H - 11, 1, 2);
          ctx.fillStyle = '#e02020'; ctx.fillRect(x, H - 7, 7, 5);
        }
        text(ctx, 'ROUND ' + g.stage, W - 4, H - 9, '#ffffff', 1, 'right');
        if (g.phase === 'ready') {
          text(ctx, 'ROUND ' + g.stage, W / 2, 140, '#ffd040', 1, 'center');
          text(ctx, 'READY!', W / 2, 152, '#ffffff', 1, 'center');
        }
        if (g.phase === 'clear') text(ctx, 'ROUND ' + g.stage + ' CLEAR!', W / 2, 140, '#40ff80', 1, 'center');
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, 136, 80, 14);
          text(ctx, 'GAME OVER', W / 2, 139, '#ff3030', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
