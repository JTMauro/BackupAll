// Tank Battalion (Namco, 1980) - from-scratch recreation.
// Defend your headquarters at the bottom of a brick maze against 20 enemy tanks per battle.
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

  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0 right, 1 down, 2 left, 3 up

  ArcadeRegistry.register({
    id: 'tankbattalion', title: 'Tank Battalion', year: 1980, maker: 'Namco',
    width: 224, height: 256, vector: false, pointer: false,
    controls: 'Arrows: drive \u00b7 Space: fire \u00b7 Enter: start',
    marquee: { bg: '#100800', fg: '#ffd040', accent: '#40c040' },
    create(api) {
      const W = 224, H = 256, C = 8, CW = 24, CH = 28, PX = 0, PY = 16, FW = CW * C, FH = CH * C;
      const au = api.audio;
      const BASE = { x: 11, y: 26 };
      const SPAWNS = [[0, 0], [11, 0], [22, 0]];
      const KINDS = [
        { col: '#e83030', dark: '#801010', spd: 0.55, pts: 100, hp: 1, fire: 0.012 },
        { col: '#f0d020', dark: '#806800', spd: 0.95, pts: 200, hp: 1, fire: 0.016 },
        { col: '#40a0ff', dark: '#104880', spd: 0.6, pts: 300, hp: 2, fire: 0.022 }
      ];
      let hi = api.getHiScore(10000);
      let mode = 'title', titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      // ---------- map ----------
      function buildMap(stage) {
        const b = new Uint8Array(CW * CH);
        const setChunk = (cx, cy) => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) b[(cy * 2 + j) * CW + cx * 2 + i] = 1; };
        const pAdd = 0.35 + Math.min(0.25, stage * 0.03);
        for (let cy = 1; cy <= 11; cy++) for (let cx = 0; cx < 12; cx++) {
          const ox = cx & 1, oy = cy & 1;
          if (ox && oy) setChunk(cx, cy);
          else if (ox !== oy && Math.random() < pAdd) setChunk(cx, cy);
        }
        // thin decorative walls at the bottom approach
        for (let x = 2; x < 8; x++) b[23 * CW + x] = Math.random() < 0.6 ? 1 : 0;
        for (let x = 16; x < 22; x++) b[23 * CW + x] = Math.random() < 0.6 ? 1 : 0;
        // keep spawns clear
        for (const [sx, sy] of SPAWNS) for (let j = 0; j < 4; j++) for (let i = -1; i < 3; i++) { const x = sx + i, y = sy + j; if (x >= 0 && x < CW) b[y * CW + x] = 0; }
        // HQ fortress
        for (let y = 23; y < CH; y++) for (let x = 9; x < 15; x++) b[y * CW + x] = 0;
        fortify(b);
        return b;
      }
      function fortify(b) {
        for (let y = 25; y < CH; y++) { b[y * CW + 10] = 1; b[y * CW + 13] = 1; }
        b[25 * CW + 11] = 1; b[25 * CW + 12] = 1;
        for (let y = 26; y < 28; y++) for (let x = 11; x < 13; x++) b[y * CW + x] = 0;
      }
      function brick(cx, cy) {
        if (cx < 0 || cy < 0 || cx >= CW || cy >= CH) return 1;
        return g.map[cy * CW + cx];
      }

      // ---------- state ----------
      function newGame() {
        g = { score: 0, lives: 3, stage: 1, extra: false, phase: 'ready', t: 150, pops: [], booms: [] };
        setupStage();
      }
      function setupStage() {
        g.map = buildMap(g.stage);
        g.baseAlive = true; g.left = 20; g.spawned = 0; g.spawnT = 60; g.spawnIdx = 0;
        g.enemies = []; g.bullets = [];
        resetPlayer();
      }
      function resetPlayer() {
        g.p = { x: 7 * C, y: 26 * C, dir: 3, spd: 0.9, tread: 0, inv: 120, alive: true };
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
      function boom(x, y, big) { g.booms.push({ x, y, t: 0, big: !!big }); }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(110, .25, { type: 'square', vol: .14 });
        return false;
      }
      const snd = {
        fire() { au.tone(900, .07, { type: 'square', vol: .1, slideTo: 300 }); },
        efire() { au.tone(500, .06, { type: 'square', vol: .06, slideTo: 200 }); },
        brick() { au.noise(.06, { vol: .12, freq: 2500 }); },
        clang() { au.tone(1800, .05, { type: 'square', vol: .08 }); },
        boom() { au.noise(.45, { vol: .24, freq: 1500, slideTo: 100 }); },
        die() { au.noise(1.0, { vol: .28, freq: 2000, slideTo: 60 }); au.tone(220, .8, { type: 'sawtooth', vol: .12, slideTo: 30 }); },
        start() { au.melody([[392, .12], [392, .06], [523, .12], [659, .12], [784, .24], [659, .12], [784, .36]], { type: 'square', vol: .13 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .2], [988, .1], [1047, .3]], { type: 'square', vol: .13 }); }
      };

      // ---------- collision helpers ----------
      function rectBlocked(x, y, self) {
        if (x < 0 || y < 0 || x + 16 > FW || y + 16 > FH) return true;
        const x0 = Math.floor(x / C), y0 = Math.floor(y / C), x1 = Math.floor((x + 15.99) / C), y1 = Math.floor((y + 15.99) / C);
        for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
          if (brick(cx, cy)) return true;
          if (g.baseAlive && cx >= BASE.x && cx < BASE.x + 2 && cy >= BASE.y && cy < BASE.y + 2) return true;
        }
        const tanks = g.p.alive ? [g.p, ...g.enemies] : g.enemies;
        for (const t of tanks) {
          if (t === self || t.dead) continue;
          if (Math.abs(t.x - x) < 15 && Math.abs(t.y - y) < 15) {
            // allow separating if already overlapping
            if (self && Math.abs(t.x - self.x) < 15 && Math.abs(t.y - self.y) < 15) {
              const before = Math.abs(t.x - self.x) + Math.abs(t.y - self.y);
              const after = Math.abs(t.x - x) + Math.abs(t.y - y);
              if (after > before) continue;
            }
            return true;
          }
        }
        return false;
      }
      // move a tank one step; returns false if blocked
      function moveTank(t, dir, spd) {
        if (dir !== t.dir) {
          // turning: snap to the 8px grid on the new axis' perpendicular
          if ((dir & 1) !== (t.dir & 1)) {
            const sx = (dir & 1) ? Math.round(t.x / C) * C : t.x;
            const sy = (dir & 1) ? t.y : Math.round(t.y / C) * C;
            if (!rectBlocked(sx, sy, t)) { t.x = sx; t.y = sy; }
          }
          t.dir = dir;
        }
        const nx = t.x + DX[dir] * spd, ny = t.y + DY[dir] * spd;
        if (rectBlocked(nx, ny, t)) {
          // creep up to the obstacle
          const fx = t.x + DX[dir] * Math.min(spd, 0.25), fy = t.y + DY[dir] * Math.min(spd, 0.25);
          if (!rectBlocked(fx, fy, t)) { t.x = fx; t.y = fy; }
          return false;
        }
        t.x = nx; t.y = ny; t.tread++;
        return true;
      }
      function fire(t, owner) {
        const bx = t.x + 8 + DX[t.dir] * 8, by = t.y + 8 + DY[t.dir] * 8;
        g.bullets.push({ x: bx, y: by, dir: t.dir, owner, src: t, spd: owner === 'p' ? 3.2 : 2.0 + Math.min(1, g.stage * 0.1) });
      }

      // ---------- enemies ----------
      function spawnEnemy() {
        const maxOn = Math.min(5, 3 + Math.floor((g.stage - 1) / 2));
        if (g.spawned >= 20 || g.enemies.length >= maxOn) return;
        for (let k = 0; k < 3; k++) {
          const [sx, sy] = SPAWNS[(g.spawnIdx + k) % 3];
          if (rectBlocked(sx * C, sy * C, null)) continue;
          g.spawnIdx = (g.spawnIdx + k + 1) % 3;
          let kind = 0; const r = Math.random();
          const fastP = Math.min(0.35, 0.08 + g.stage * 0.05), armP = Math.min(0.3, (g.stage - 1) * 0.06);
          if (r < armP) kind = 2; else if (r < armP + fastP) kind = 1;
          const K = KINDS[kind];
          g.enemies.push({ x: sx * C, y: sy * C, dir: 1, kind, hp: K.hp, spd: K.spd * (1 + Math.min(0.4, (g.stage - 1) * 0.05)), tread: 0, think: 30, warp: 40, shotCD: 60, flash: 0 });
          g.spawned++;
          return;
        }
      }
      function enemyBullet(e) { return g.bullets.some(b => b.src === e); }
      function chooseDir(e) {
        const r = Math.random();
        const cx = e.x + 8, cy = e.y + 8;
        const bx = BASE.x * C + 8, by = BASE.y * C + 8;
        if (r < 0.4) {
          // head for the HQ
          return Math.random() < 0.5 ? (by > cy ? 1 : 3) : (bx > cx ? 0 : 2);
        }
        if (r < 0.65 && g.p.alive) {
          const px = g.p.x + 8, py = g.p.y + 8;
          return Math.abs(px - cx) > Math.abs(py - cy) ? (px > cx ? 0 : 2) : (py > cy ? 1 : 3);
        }
        return Math.floor(Math.random() * 4);
      }
      function updateEnemy(e) {
        if (e.warp > 0) { e.warp--; return; }
        if (e.flash > 0) e.flash--;
        const K = KINDS[e.kind];
        if (--e.think <= 0) { e.think = 40 + Math.random() * 90; e.dir = chooseDir(e); }
        if (!moveTank(e, e.dir, e.spd)) {
          if (Math.random() < 0.5) {
            // shoot the obstacle (bricks) or pick a new way
            if (!enemyBullet(e) && Math.random() < 0.08) { fire(e, 'e'); snd.efire(); }
          }
          if (Math.random() < 0.06) { e.dir = chooseDir(e); e.think = 30 + Math.random() * 60; }
        }
        if (e.shotCD > 0) e.shotCD--;
        if (!enemyBullet(e) && e.shotCD <= 0) {
          let want = Math.random() < K.fire * (1 + g.stage * 0.08);
          // aligned with the player or the HQ: much more likely to fire
          const cx = e.x + 8, cy = e.y + 8;
          const aim = (tx, ty) => (e.dir === 1 && Math.abs(tx - cx) < 6 && ty > cy) || (e.dir === 3 && Math.abs(tx - cx) < 6 && ty < cy) ||
            (e.dir === 0 && Math.abs(ty - cy) < 6 && tx > cx) || (e.dir === 2 && Math.abs(ty - cy) < 6 && tx < cx);
          if (g.p.alive && aim(g.p.x + 8, g.p.y + 8) && Math.random() < 0.08) want = true;
          if (aim(BASE.x * C + 8, BASE.y * C + 8) && Math.random() < 0.05) want = true;
          if (want) { fire(e, 'e'); e.shotCD = 40; snd.efire(); }
        }
      }

      // ---------- bullets ----------
      function hitBricks(b) {
        const px = b.x, py = b.y;
        const cx = Math.floor(px / C), cy = Math.floor(py / C);
        if (!brick(cx, cy)) return false;
        if (cx < 0 || cy < 0 || cx >= CW || cy >= CH) return true;
        // destroy the cell hit plus its neighbour across the shell's path (shells are as wide as two cells)
        const k = [];
        if (b.dir & 1) { k.push([Math.floor((px - 3) / C), cy], [Math.floor((px + 3) / C), cy]); }
        else { k.push([cx, Math.floor((py - 3) / C)], [cx, Math.floor((py + 3) / C)]); }
        k.push([cx, cy]);
        for (const [x, y] of k) if (x >= 0 && y >= 0 && x < CW && y < CH) g.map[y * CW + x] = 0;
        return true;
      }
      function updateBullets() {
        for (const b of g.bullets) {
          if (b.dead) continue;
          for (let s = 0; s < 2 && !b.dead; s++) {
            b.x += DX[b.dir] * b.spd / 2; b.y += DY[b.dir] * b.spd / 2;
            if (b.x < 0 || b.y < 0 || b.x >= FW || b.y >= FH) { b.dead = true; if (b.owner === 'p') snd.clang(); break; }
            // HQ
            if (g.baseAlive && b.x >= BASE.x * C && b.x < (BASE.x + 2) * C && b.y >= BASE.y * C && b.y < (BASE.y + 2) * C) {
              b.dead = true; destroyBase(); break;
            }
            if (hitBricks(b)) { b.dead = true; if (b.owner === 'p') snd.brick(); boom(b.x, b.y, false); break; }
            if (b.owner === 'p') {
              for (const e of g.enemies) {
                if (e.dead || e.warp > 0) continue;
                if (b.x >= e.x && b.x < e.x + 16 && b.y >= e.y && b.y < e.y + 16) {
                  b.dead = true;
                  if (--e.hp > 0) { e.flash = 20; snd.clang(); break; }
                  e.dead = true; g.left--;
                  const K = KINDS[e.kind];
                  addScore(K.pts); pop(e.x + 8, e.y + 4, String(K.pts), '#ffffff');
                  boom(e.x + 8, e.y + 8, true); snd.boom();
                  break;
                }
              }
            } else if (g.p.alive && g.p.inv <= 0) {
              const p = g.p;
              if (b.x >= p.x && b.x < p.x + 16 && b.y >= p.y && b.y < p.y + 16) { b.dead = true; killPlayer(); break; }
            } else if (g.p.alive && g.p.inv > 0) {
              const p = g.p;
              if (b.x >= p.x && b.x < p.x + 16 && b.y >= p.y && b.y < p.y + 16) { b.dead = true; snd.clang(); break; }
            }
            // shell vs shell
            for (const o of g.bullets) {
              if (o === b || o.dead || o.owner === b.owner) continue;
              if (Math.abs(o.x - b.x) < 4 && Math.abs(o.y - b.y) < 4) { o.dead = b.dead = true; boom(b.x, b.y, false); break; }
            }
          }
        }
        g.bullets = g.bullets.filter(b => !b.dead);
        g.enemies = g.enemies.filter(e => !e.dead);
      }
      function destroyBase() {
        if (!g.baseAlive) return;
        g.baseAlive = false;
        boom(BASE.x * C + 8, BASE.y * C + 8, true); snd.die();
        if (g.phase === 'play') { g.phase = 'hqlost'; g.t = 150; }
      }
      function killPlayer() {
        const p = g.p; p.alive = false;
        boom(p.x + 8, p.y + 8, true); snd.die();
        g.phase = 'dying'; g.t = 120;
      }

      function updatePlay() {
        const p = g.p;
        if (p.alive) {
          if (p.inv > 0) p.inv--;
          let dir = -1;
          if (api.key('ArrowLeft')) dir = 2; else if (api.key('ArrowRight')) dir = 0;
          else if (api.key('ArrowUp')) dir = 3; else if (api.key('ArrowDown')) dir = 1;
          if (dir >= 0) {
            moveTank(p, dir, p.spd);
            if ((p.tread & 7) === 0) au.tone(60, .04, { type: 'square', vol: .04 });
          }
          if (api.pressed('Space') && !g.bullets.some(b => b.owner === 'p')) { fire(p, 'p'); snd.fire(); }
        }
        if (--g.spawnT <= 0) { g.spawnT = Math.max(50, 150 - g.stage * 10); spawnEnemy(); }
        for (const e of g.enemies) updateEnemy(e);
        updateBullets();
        if (g.phase === 'play' && g.left <= 0 && g.enemies.length === 0) { g.phase = 'clear'; g.t = 0; snd.clear(); }
      }

      function gameOver() {
        g.phase = 'over'; g.t = 240; api.setHiScore(g.score);
        au.melody([[392, .2], [330, .2], [294, .2], [262, .5]], { type: 'square', vol: .13 });
      }
      function loseLife(after) {
        if (g.lives <= 1) {
          g.phase = 'wait';
          if (api.offerContinue) api.offerContinue(() => { g.lives = 3; after(); }, gameOver);
          else gameOver();
        } else { g.lives--; after(); }
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
        g.booms = g.booms.filter(b => b.t < (b.big ? 36 : 12));
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') { updatePlay(); return; }
        if (g.phase === 'dying') {
          // the battle carries on around the wreck for a moment
          for (const e of g.enemies) updateEnemy(e);
          updateBullets();
          if (g.phase !== 'dying') return;
          if (--g.t > 0) return;
          loseLife(() => {
            if (!g.baseAlive) { g.baseAlive = true; fortify(g.map); }
            resetPlayer(); g.bullets = []; g.phase = 'play';
          });
          return;
        }
        if (g.phase === 'hqlost') {
          if (--g.t > 0) return;
          loseLife(() => {
            // HQ is rebuilt; the enemies regroup at the top
            g.baseAlive = true; fortify(g.map);
            g.spawned -= g.enemies.length; g.enemies = []; g.bullets = [];
            resetPlayer(); g.phase = 'ready'; g.t = 120;
          });
          return;
        }
        if (g.phase === 'clear') {
          g.t++;
          if (g.t === 90) { const bonus = 1000 * Math.min(5, g.stage); addScore(bonus); pop(FW / 2, 110, 'BONUS ' + bonus, '#ffd040'); }
          if (g.t > 220) { g.stage++; setupStage(); g.phase = 'ready'; g.t = 120; }
          return;
        }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 150 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
        }
      }

      // ---------- drawing ----------
      function drawTank(ctx, x, y, dir, col, dark, tread, flash) {
        ctx.save();
        ctx.translate(Math.round(x) + 8, Math.round(y) + 8);
        ctx.rotate([Math.PI / 2, Math.PI, -Math.PI / 2, 0][dir]);
        const body = flash ? '#ffffff' : col;
        // treads
        ctx.fillStyle = '#303030'; ctx.fillRect(-8, -7, 4, 15); ctx.fillRect(4, -7, 4, 15);
        ctx.fillStyle = dark;
        for (let k = 0; k < 4; k++) { const o = ((k * 4 + (tread >> 1)) % 15); ctx.fillRect(-8, -7 + o, 4, 1); ctx.fillRect(4, -7 + o, 4, 1); }
        // hull
        ctx.fillStyle = body; ctx.fillRect(-4, -5, 8, 12);
        ctx.fillStyle = dark; ctx.fillRect(-3, -1, 6, 6);
        ctx.fillStyle = body; ctx.fillRect(-2, 0, 4, 4);
        // barrel
        ctx.fillStyle = flash ? '#ffffff' : '#e0e0e0'; ctx.fillRect(-1, -9, 2, 9);
        ctx.restore();
      }
      function drawBase(ctx) {
        const x = PX + BASE.x * C, y = PY + BASE.y * C;
        if (g.baseAlive) {
          ctx.fillStyle = '#202060'; ctx.fillRect(x, y, 16, 16);
          // HQ flag emblem
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, y + 2, 1, 12);
          ctx.fillStyle = (api.frame >> 4) & 1 ? '#ff3030' : '#ff5050'; ctx.fillRect(x + 5, y + 2, 7, 5);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 7, y + 3, 2, 2);
          ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x + 2, y + 13, 12, 2);
        } else {
          ctx.fillStyle = '#301010'; ctx.fillRect(x, y, 16, 16);
          ctx.fillStyle = '#602020'; ctx.fillRect(x + 2, y + 9, 12, 5); ctx.fillRect(x + 5, y + 6, 3, 3);
          ctx.fillStyle = '#808080'; ctx.fillRect(x + 4, y + 10, 1, 4);
        }
      }
      function drawMap(ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(PX, PY, FW, FH);
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
          if (!g.map[y * CW + x]) continue;
          const px = PX + x * C, py = PY + y * C;
          ctx.fillStyle = '#b04818'; ctx.fillRect(px, py, C, C);
          ctx.fillStyle = '#e07838'; ctx.fillRect(px, py, C, 1); ctx.fillRect(px, py + 4, C, 1);
          ctx.fillStyle = '#601808';
          ctx.fillRect(px, py + 3, C, 1); ctx.fillRect(px, py + 7, C, 1);
          ctx.fillRect(px + ((y & 1) ? 2 : 6), py, 1, 3); ctx.fillRect(px + ((y & 1) ? 6 : 2), py + 4, 1, 3);
        }
      }
      function drawBoom(ctx, b) {
        const r = b.big ? Math.min(12, b.t * 0.8) : 3 + b.t * 0.3;
        const cols = ['#ffffff', '#ffe040', '#ff8020', '#c02020'];
        const c = cols[Math.min(3, Math.floor(b.t / (b.big ? 9 : 3)))];
        ctx.fillStyle = c;
        const x = Math.round(PX + b.x), y = Math.round(PY + b.y);
        ctx.fillRect(x - r, y - r / 3, 2 * r, 2 * r / 3); ctx.fillRect(x - r / 3, y - r, 2 * r / 3, 2 * r);
        if (b.big) for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + b.t * 0.1;
          ctx.fillRect(Math.round(x + Math.cos(a) * r * 1.2) - 1, Math.round(y + Math.sin(a) * r * 1.2) - 1, 2, 2);
        }
      }
      function drawPanel(ctx) {
        const x0 = FW + 2;
        ctx.fillStyle = '#181818'; ctx.fillRect(FW, PY, W - FW, FH);
        // enemy reserve: small tank icons, 2 columns of 10
        const remainingIcons = Math.max(0, 20 - g.spawned);
        for (let i = 0; i < 20; i++) {
          const ix = x0 + 4 + (i & 1) * 12, iy = PY + 4 + (i >> 1) * 9;
          if (i < remainingIcons) {
            ctx.fillStyle = '#d04030'; ctx.fillRect(ix, iy, 8, 6);
            ctx.fillStyle = '#ff8060'; ctx.fillRect(ix + 3, iy - 2, 2, 3);
          }
        }
        text(ctx, 'IP', x0 + 4, PY + 100, '#ffffff');
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) {
          ctx.fillStyle = '#40d040'; ctx.fillRect(x0 + 4 + (i % 3) * 9, PY + 110 + Math.floor(i / 3) * 9, 7, 6);
          ctx.fillStyle = '#a0ffa0'; ctx.fillRect(x0 + 7 + (i % 3) * 9, PY + 108 + Math.floor(i / 3) * 9, 1, 3);
        }
        // stage flag
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + 6, PY + 140, 1, 14);
        ctx.fillStyle = '#ff3030'; ctx.fillRect(x0 + 7, PY + 140, 9, 6);
        text(ctx, String(g.stage), x0 + 12, PY + 158, '#ffd040', 1, 'center');
        text(ctx, 'LEFT', x0 + 12, PY + 178, '#a0a0a0', 1, 'center');
        text(ctx, String(g.left), x0 + 12, PY + 188, '#ffffff', 1, 'center');
      }
      function drawHud(ctx) {
        text(ctx, '1UP', 8, 0, '#ff4040');
        text(ctx, String(g ? g.score : 0).padStart(6, ' '), 30, 0, '#ffffff');
        text(ctx, 'HI', 112, 0, '#ff4040');
        text(ctx, String(hi).padStart(6, ' '), 128, 0, '#ffffff');
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function drawTitle(ctx) {
        drawHud(ctx);
        const t = titleT;
        text(ctx, 'TANK', W / 2 + 1, 31, '#604000', 4, 'center');
        text(ctx, 'TANK', W / 2, 30, '#ffd040', 4, 'center');
        text(ctx, 'BATTALION', W / 2 + 1, 65, '#103010', 2, 'center');
        text(ctx, 'BATTALION', W / 2, 64, '#40d040', 2, 'center');
        // a little parade
        const px = (t * 0.6) % (W + 40) - 20;
        drawTank(ctx, px, 88, 0, '#40d040', '#106010', t, false);
        drawTank(ctx, px - 40, 88, 0, '#e83030', '#801010', t, false);
        drawTank(ctx, px - 60, 88, 0, '#f0d020', '#806800', t, false);
        text(ctx, '- SCORE -', W / 2, 116, '#ffffff', 1, 'center');
        for (let i = 0; i < 3; i++) {
          const K = KINDS[i];
          drawTank(ctx, 60, 128 + i * 20, 3, K.col, K.dark, 0, false);
          text(ctx, K.pts + ' PTS' + (K.hp > 1 ? '  ARMOR' : i === 1 ? '  FAST' : ''), 84, 133 + i * 20, K.col);
        }
        text(ctx, 'DEFEND YOUR HQ!', W / 2, 192, '#ff8060', 1, 'center');
        text(ctx, 'BONUS TANK AT 10000', W / 2, 204, '#a0a0a0', 1, 'center');
        const blink = (t >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 222, '#ff3030', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 222, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 222, '#ff3030', 1, 'center');
        text(ctx, '\u00a9 1980 NAMCO', W / 2, 238, '#a0a0a0', 1, 'center');
        text(ctx, credStr(), 4, H - 8, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawHud(ctx);
        drawMap(ctx);
        drawBase(ctx);
        for (const e of g.enemies) {
          const K = KINDS[e.kind];
          if (e.warp > 0) {
            // spawn sparkle
            ctx.fillStyle = (e.warp >> 2) & 1 ? '#ffffff' : K.col;
            const s = 2 + ((40 - e.warp) >> 2);
            ctx.fillRect(PX + e.x + 8 - s / 2, PY + e.y + 8 - 1, s, 2); ctx.fillRect(PX + e.x + 8 - 1, PY + e.y + 8 - s / 2, 2, s);
            continue;
          }
          drawTank(ctx, PX + e.x, PY + e.y, e.dir, K.col, K.dark, e.tread, e.flash > 0 && (e.flash >> 1) & 1);
        }
        const p = g.p;
        if (p.alive && !(p.inv > 0 && (api.frame >> 2) & 1 && g.phase === 'play')) drawTank(ctx, PX + p.x, PY + p.y, p.dir, '#40d040', '#106010', p.tread, false);
        for (const b of g.bullets) {
          ctx.fillStyle = b.owner === 'p' ? '#ffffff' : '#ffd040';
          ctx.fillRect(Math.round(PX + b.x) - 1, Math.round(PY + b.y) - 1, 2, 2);
        }
        for (const b of g.booms) drawBoom(ctx, b);
        for (const pp of g.pops) text(ctx, pp.txt, PX + pp.x, PY + pp.y, pp.col, 1, 'center');
        drawPanel(ctx);
        text(ctx, credStr(), 4, H - 8, '#606060');
        const cy = PY + 13 * C;
        if (g.phase === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(FW / 2 - 44, cy - 4, 88, 22);
          text(ctx, 'BATTLE ' + g.stage, FW / 2, cy - 1, '#ffd040', 1, 'center');
          text(ctx, 'READY!', FW / 2, cy + 9, '#ffffff', 1, 'center');
        }
        if (g.phase === 'hqlost') {
          ctx.fillStyle = '#000'; ctx.fillRect(FW / 2 - 48, cy - 4, 96, 14);
          text(ctx, 'HQ DESTROYED!', FW / 2, cy - 1, '#ff3030', 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(FW / 2 - 56, cy - 4, 112, 14);
          text(ctx, 'BATTLE ' + g.stage + ' WON!', FW / 2, cy - 1, '#40d040', 1, 'center');
        }
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(FW / 2 - 40, cy - 4, 80, 14);
          text(ctx, 'GAME OVER', FW / 2, cy - 1, '#ff3030', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
