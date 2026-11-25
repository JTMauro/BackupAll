// Warp & Warp (Namco, 1981) - from-scratch recreation.
// Blast the Berobero in Space World, bomb them in Maze World, and jump between the two through the central WARP gate.
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

  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0 right, 1 down, 2 left, 3 up

  function advance(e, T, decide) {
    let rem = e.spd;
    e.moving = false;
    for (let guard = 0; rem > 1e-6 && guard < 6; guard++) {
      const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T);
      const cx = tx * T + T / 2, cy = ty * T + T / 2;
      if (Math.abs(e.x - cx) < 1e-4 && Math.abs(e.y - cy) < 1e-4) {
        e.x = cx; e.y = cy;
        const nd = decide(e, tx, ty);
        if (nd < 0) return;
        e.dir = nd;
        const d = Math.min(rem, T);
        e.x += DX[nd] * d; e.y += DY[nd] * d; rem -= d; e.moving = true;
        if (d === T) { e.x = cx + DX[nd] * T; e.y = cy + DY[nd] * T; }
        continue;
      }
      const off = (e.x - cx) * DX[e.dir] + (e.y - cy) * DY[e.dir];
      e.moving = true;
      if (off < 0) {
        const d = Math.min(rem, -off);
        e.x += DX[e.dir] * d; e.y += DY[e.dir] * d; rem -= d;
        if (d >= -off - 1e-6) { e.x = cx; e.y = cy; }
      } else {
        const d = Math.min(rem, T - off);
        e.x += DX[e.dir] * d; e.y += DY[e.dir] * d; rem -= d;
        if (d >= T - off - 1e-6) { e.x = cx + DX[e.dir] * T; e.y = cy + DY[e.dir] * T; }
      }
    }
  }

  ArcadeRegistry.register({
    id: 'warpwarp', title: 'Warp & Warp', year: 1981, maker: 'Namco',
    width: 224, height: 272, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 Space: fire (Space World) / time bomb (Maze World) \u00b7 Enter: start',
    marquee: { bg: '#000018', fg: '#ff40ff', accent: '#40ffff' },
    create(api) {
      const W = 224, H = 272, T = 16, GW = 13, GH = 15, FX = 8, FY = 18, FW = GW * T, FH = GH * T;
      const CX = 6, CY = 7; // warp gate tile
      const au = api.audio;
      const BCOL = [
        { body: '#ff3040', dark: '#901020', name: 'RED' },
        { body: '#ffd020', dark: '#906000', name: 'YELLOW' },
        { body: '#c050ff', dark: '#602090', name: 'PURPLE' }
      ];
      let hi = api.getHiScore(10000);
      let mode = 'title', titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      // ---------- maze ----------
      function buildMaze(stage) {
        const b = new Uint8Array(GW * GH);
        for (let y = 1; y < GH; y += 2) for (let x = 1; x < GW; x += 2) b[y * GW + x] = 1;
        const connected = () => {
          const seen = new Uint8Array(GW * GH), q = [[CX, CY]]; seen[CY * GW + CX] = 1; let n = 1;
          while (q.length) {
            const [x, y] = q.pop();
            for (let d = 0; d < 4; d++) {
              const nx = x + DX[d], ny = y + DY[d];
              if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
              const k = ny * GW + nx; if (b[k] || seen[k]) continue;
              seen[k] = 1; n++; q.push([nx, ny]);
            }
          }
          let free = 0; for (let k = 0; k < GW * GH; k++) if (!b[k]) free++;
          return n === free;
        };
        const merges = 10 + Math.min(10, stage * 2);
        for (let m = 0, tries = 0; m < merges && tries < 120; tries++) {
          const px = 1 + 2 * Math.floor(Math.random() * 6), py = 1 + 2 * Math.floor(Math.random() * 7);
          const d = Math.floor(Math.random() * 4);
          const bx = px + DX[d], by = py + DY[d];
          if (bx < 1 || by < 1 || bx > GW - 2 || by > GH - 2) continue;
          if (Math.abs(bx - CX) + Math.abs(by - CY) < 2) continue;
          const k = by * GW + bx; if (b[k]) continue;
          b[k] = 1;
          if (!connected()) { b[k] = 0; continue; }
          m++;
        }
        return b;
      }
      function free(x, y) {
        if (x < 0 || y < 0 || x >= GW || y >= GH) return false;
        return !g.maze[y * GW + x];
      }

      // ---------- state ----------
      function newGame() {
        g = { score: 0, lives: 3, stage: 1, extra: false, pops: [], booms: [], phase: 'ready', t: 150 };
        setupStage();
      }
      function setupStage() {
        const q = Math.min(18, 8 + g.stage * 2);
        g.quota = { space: q, maze: q };
        g.maze = buildMaze(g.stage);
        g.world = 'space';
        g.lucky = Math.floor(Math.random() * 3);
        g.chainCol = -1; g.chainN = 0;
        enterWorld('space');
      }
      function enterWorld(w) {
        g.world = w; g.worldT = 0; g.hurry = false;
        g.enemies = []; g.shots = []; g.bomb = null; g.blasts = [];
        g.spawnT = 40; g.warpOpen = 0; g.warpCycle = 600;
        resetPlayer();
      }
      function resetPlayer() {
        g.p = { x: CX * T + T / 2, y: CY * T + T / 2, dir: 3, spd: g.world === 'maze' ? 1.25 : 1.3, inv: 100, walk: 0 };
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
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(110, .25, { type: 'square', vol: .14 });
        return false;
      }
      const snd = {
        shot() { au.tone(1500, .08, { type: 'square', vol: .09, slideTo: 600 }); },
        kill() { au.tone(300, .15, { type: 'square', vol: .13, slideTo: 1200 }); au.noise(.1, { vol: .1, freq: 3000 }); },
        bombSet() { au.tone(400, .05, { type: 'square', vol: .1 }); },
        tick(n) { au.tone(n ? 1200 : 900, .03, { type: 'square', vol: .06 }); },
        blast() { au.noise(.5, { vol: .25, freq: 1200, slideTo: 80 }); },
        die() { au.melody([[1200, .06], [900, .06], [1100, .06], [700, .06], [900, .06], [500, .06], [300, .2]], { type: 'sawtooth', vol: .12 }); },
        warp() { au.tone(200, .9, { type: 'sine', vol: .16, slideTo: 2400 }); au.tone(210, .9, { type: 'square', vol: .05, slideTo: 2500 }); },
        open() { au.melody([[880, .05], [1175, .05], [880, .05], [1175, .05]], { type: 'triangle', vol: .1 }); },
        start() { au.melody([[659, .1], [784, .1], [659, .1], [523, .1], [587, .1], [659, .1], [784, .1], [1047, .3]], { type: 'square', vol: .13 }); },
        hurry() { au.melody([[1400, .06], [0, .04], [1400, .06], [0, .04], [1400, .06]], { type: 'square', vol: .1 }); },
        clear() { au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [1319, .1], [1568, .3]], { type: 'square', vol: .13 }); }
      };

      // ---------- enemies ----------
      function maxOn() { return Math.min(7, 3 + Math.floor(g.stage / 2) + (g.world === 'space' ? 1 : 0)); }
      function enemySpeed() {
        let s = (g.world === 'space' ? 0.55 : 0.75) + 0.07 * (g.stage - 1);
        if (g.hurry) s *= 1.35;
        return Math.min(g.world === 'space' ? 1.25 : 1.3, s);
      }
      function spawnEnemy() {
        if (g.enemies.length >= maxOn() || g.enemies.length >= g.quota[g.world]) return;
        const p = g.p;
        let x, y;
        if (g.world === 'space') {
          for (let tries = 0; tries < 10; tries++) {
            const side = Math.floor(Math.random() * 4);
            x = side === 0 ? 8 : side === 1 ? FW - 8 : 8 + Math.random() * (FW - 16);
            y = side === 2 ? 8 : side === 3 ? FH - 8 : 8 + Math.random() * (FH - 16);
            if (Math.abs(x - p.x) + Math.abs(y - p.y) > 90) break;
          }
        } else {
          const corners = [[0, 0], [GW - 1, 0], [0, GH - 1], [GW - 1, GH - 1]];
          corners.sort((a, b) => (Math.abs(b[0] * T - p.x) + Math.abs(b[1] * T - p.y)) - (Math.abs(a[0] * T - p.x) + Math.abs(a[1] * T - p.y)));
          const c = corners[Math.floor(Math.random() * 2)];
          x = c[0] * T + T / 2; y = c[1] * T + T / 2;
        }
        const col = Math.floor(Math.random() * 3);
        g.enemies.push({ x, y, dir: Math.floor(Math.random() * 4), col, spd: enemySpeed(), hatch: 50, think: 0, anim: Math.random() * 60 | 0 });
      }
      function spaceEnemy(e) {
        const p = g.p;
        if (--e.think <= 0) {
          e.think = 18 + Math.random() * 40;
          const dx = p.x - e.x, dy = p.y - e.y;
          if (Math.random() < 0.7) e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
          else e.dir = Math.floor(Math.random() * 4);
        }
        e.x += DX[e.dir] * e.spd; e.y += DY[e.dir] * e.spd;
        if (e.x < 7) { e.x = 7; e.dir = 0; } if (e.x > FW - 7) { e.x = FW - 7; e.dir = 2; }
        if (e.y < 7) { e.y = 7; e.dir = 1; } if (e.y > FH - 7) { e.y = FH - 7; e.dir = 3; }
      }
      function mazeDecide(e, tx, ty) {
        const p = g.p;
        const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
        const back = (e.dir + 2) % 4;
        let best = -1, bd = 1e9; const opts = [];
        for (let d = 0; d < 4; d++) {
          const nx = tx + DX[d], ny = ty + DY[d];
          if (d === back || !free(nx, ny)) continue;
          if (g.bomb && g.bomb.tx === nx && g.bomb.ty === ny) continue;
          opts.push(d);
          const dd = (nx - ptx) * (nx - ptx) + (ny - pty) * (ny - pty);
          if (dd < bd) { bd = dd; best = d; }
        }
        if (best < 0) return free(tx + DX[back], ty + DY[back]) ? back : -1;
        if (opts.length > 1 && Math.random() < 0.3) return opts[Math.floor(Math.random() * opts.length)];
        return best;
      }
      function killEnemy(e) {
        e.dead = true;
        let v = 100 * Math.min(5, g.stage);
        if (e.col === g.chainCol) g.chainN++; else { g.chainCol = e.col; g.chainN = 1; }
        if (e.col === g.lucky) v *= 2;
        addScore(v); pop(e.x, e.y - 4, String(v), BCOL[e.col].body);
        if (g.chainN === 3) {
          const b = 1000 * Math.min(5, g.stage);
          addScore(b); pop(e.x, e.y + 6, 'TRIPLE ' + b, '#ffffff');
          au.melody([[1047, .05], [1319, .05], [1568, .05], [2093, .1]], { type: 'square', vol: .1 });
          g.chainN = 0; g.chainCol = -1;
          g.lucky = Math.floor(Math.random() * 3);
        }
        g.booms.push({ x: e.x, y: e.y, t: 0, col: BCOL[e.col].body });
        g.quota[g.world] = Math.max(0, g.quota[g.world] - 1);
        snd.kill();
      }

      // ---------- player ----------
      function heldDir() {
        if (api.key('ArrowLeft')) return 2; if (api.key('ArrowRight')) return 0;
        if (api.key('ArrowUp')) return 3; if (api.key('ArrowDown')) return 1;
        return -1;
      }
      function playerMazeDecide(e, tx, ty) {
        const want = heldDir();
        if (want < 0) return -1;
        const blocked = (x, y) => !free(x, y) || (g.bomb && g.bomb.tx === x && g.bomb.ty === y && !(x === tx && y === ty));
        if (!blocked(tx + DX[want], ty + DY[want])) return want;
        e.dir = want; // face it even if blocked
        return -1;
      }
      function updatePlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        const want = heldDir();
        if (g.world === 'space') {
          if (want >= 0) {
            p.dir = want;
            p.x = Math.max(7, Math.min(FW - 7, p.x + DX[want] * p.spd));
            p.y = Math.max(7, Math.min(FH - 7, p.y + DY[want] * p.spd));
            p.walk++;
          }
          if (api.pressed('Space') && g.shots.length < 1) {
            g.shots.push({ x: p.x + DX[p.dir] * 6, y: p.y + DY[p.dir] * 6, dir: p.dir });
            snd.shot();
          }
        } else {
          if (want >= 0 && want === (p.dir + 2) % 4) p.dir = want;
          const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
          const atC = Math.abs(p.x - (tx * T + 8)) < 1e-3 && Math.abs(p.y - (ty * T + 8)) < 1e-3;
          if (want >= 0 || !atC) { advance(p, T, playerMazeDecide); if (p.moving) p.walk++; }
          if (api.pressed('Space') && !g.bomb) {
            const bx = Math.floor(p.x / T), by = Math.floor(p.y / T);
            g.bomb = { tx: bx, ty: by, t: 100 }; snd.bombSet();
          }
        }
      }
      function updateShots() {
        for (const s of g.shots) {
          s.x += DX[s.dir] * 4.5; s.y += DY[s.dir] * 4.5;
          if (s.x < 0 || s.y < 0 || s.x > FW || s.y > FH) { s.dead = true; continue; }
          for (const e of g.enemies) {
            if (e.dead) continue;
            if (Math.abs(e.x - s.x) < 8 && Math.abs(e.y - s.y) < 8) { s.dead = true; killEnemy(e); break; }
          }
        }
        g.shots = g.shots.filter(s => !s.dead);
      }
      function updateBomb() {
        const b = g.bomb;
        if (b) {
          b.t--;
          if (b.t % (b.t < 40 ? 6 : 12) === 0) snd.tick(b.t & 8);
          if (b.t <= 0) {
            g.bomb = null; snd.blast();
            const cells = [[b.tx, b.ty]];
            const range = 3;
            for (let d = 0; d < 4; d++) for (let r = 1; r <= range; r++) {
              const x = b.tx + DX[d] * r, y = b.ty + DY[d] * r;
              if (!free(x, y)) break;
              cells.push([x, y]);
            }
            g.blasts.push({ cells, t: 26 });
          }
        }
        for (const bl of g.blasts) {
          bl.t--;
          for (const [x, y] of bl.cells) {
            for (const e of g.enemies) if (!e.dead && Math.floor(e.x / T) === x && Math.floor(e.y / T) === y) killEnemy(e);
            const p = g.p;
            if (g.phase === 'play' && Math.floor(p.x / T) === x && Math.floor(p.y / T) === y && p.inv <= 0) killPlayer();
          }
        }
        g.blasts = g.blasts.filter(bl => bl.t > 0);
      }
      function killPlayer() {
        if (g.phase !== 'play') return;
        g.phase = 'dying'; g.t = 110; snd.die();
      }
      function updateWarp() {
        // the gate opens periodically; step in to cross worlds
        if (g.warpOpen > 0) {
          g.warpOpen--;
          const p = g.p;
          if (Math.abs(p.x - (CX * T + 8)) < 7 && Math.abs(p.y - (CY * T + 8)) < 7 && p.inv <= 0) {
            g.phase = 'warp'; g.t = 70; g.warpTo = g.world === 'space' ? 'maze' : 'space'; snd.warp();
            addScore(500); pop(p.x, p.y - 10, 'WARP 500', '#40ffff');
          }
        } else if (--g.warpCycle <= 0) {
          g.warpCycle = 900; g.warpOpen = 300; snd.open();
        }
      }

      function updatePlay() {
        g.worldT++;
        if (!g.hurry && g.worldT > 60 * 40) { g.hurry = true; snd.hurry(); for (const e of g.enemies) e.spd = enemySpeed(); }
        updatePlayer();
        if (--g.spawnT <= 0) { g.spawnT = Math.max(30, 90 - g.stage * 6); spawnEnemy(); }
        const p = g.p;
        for (const e of g.enemies) {
          e.anim++;
          if (e.hatch > 0) { e.hatch--; continue; }
          if (g.world === 'space') spaceEnemy(e); else advance(e, T, mazeDecide);
          if (p.inv <= 0 && Math.abs(e.x - p.x) < 10 && Math.abs(e.y - p.y) < 10) killPlayer();
        }
        updateShots();
        updateBomb();
        g.enemies = g.enemies.filter(e => !e.dead);
        if (g.phase !== 'play') return;
        if (g.quota[g.world] <= 0 && g.enemies.length === 0) {
          const other = g.world === 'space' ? 'maze' : 'space';
          if (g.quota[other] <= 0) { g.phase = 'clear'; g.t = 0; snd.clear(); }
          else { g.phase = 'warp'; g.t = 70; g.warpTo = other; snd.warp(); }
          return;
        }
        updateWarp();
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
        g.booms = g.booms.filter(b => b.t < 24);
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') { updatePlay(); return; }
        if (g.phase === 'warp') {
          if (--g.t <= 0) { enterWorld(g.warpTo); g.phase = 'ready'; g.t = 60; }
          return;
        }
        if (g.phase === 'dying') {
          for (const bl of g.blasts) bl.t--;
          g.blasts = g.blasts.filter(bl => bl.t > 0);
          if (--g.t > 0) return;
          const respawn = () => {
            resetPlayer(); g.bomb = null; g.blasts = []; g.shots = [];
            // clear the area around the gate
            for (const e of g.enemies) if (Math.abs(e.x - g.p.x) + Math.abs(e.y - g.p.y) < 80) e.dead = true;
            g.enemies = g.enemies.filter(e => !e.dead);
            g.phase = 'ready'; g.t = 80;
          };
          if (g.lives <= 1) {
            g.phase = 'wait';
            if (api.offerContinue) api.offerContinue(() => { g.lives = 3; respawn(); }, gameOver);
            else gameOver();
          } else { g.lives--; respawn(); }
          return;
        }
        if (g.phase === 'clear') {
          if (++g.t === 60) { const b = 2000 * Math.min(5, g.stage); addScore(b); pop(CX * T + 8, CY * T - 20, 'BONUS ' + b, '#ffffff'); }
          if (g.t > 200) { g.stage++; setupStage(); g.phase = 'ready'; g.t = 120; }
          return;
        }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 150 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
        }
      }

      // ---------- drawing ----------
      function drawFighter(ctx, x, y, dir, walk) {
        x = Math.round(x); y = Math.round(y);
        const step = (walk >> 3) & 1;
        // helmet
        ctx.fillStyle = '#e0e0ff'; ctx.fillRect(x - 4, y - 7, 8, 7); ctx.fillRect(x - 5, y - 6, 10, 5);
        ctx.fillStyle = '#2040c0';
        if (dir === 0) ctx.fillRect(x, y - 5, 4, 3);
        else if (dir === 2) ctx.fillRect(x - 4, y - 5, 4, 3);
        else if (dir === 1) ctx.fillRect(x - 3, y - 5, 6, 3);
        else { ctx.fillStyle = '#a0a0c0'; ctx.fillRect(x - 3, y - 5, 6, 3); }
        // body
        ctx.fillStyle = '#40c040'; ctx.fillRect(x - 4, y, 8, 4);
        ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 1, y, 2, 2);
        // legs
        ctx.fillStyle = '#e0e0ff';
        ctx.fillRect(x - 4, y + 4, 3, 3 + step); ctx.fillRect(x + 1, y + 4, 3, 4 - step);
        // gun arm
        ctx.fillStyle = '#ffffff';
        if (dir === 0) ctx.fillRect(x + 4, y + 1, 4, 2);
        else if (dir === 2) ctx.fillRect(x - 8, y + 1, 4, 2);
        else if (dir === 1) ctx.fillRect(x + 4, y + 1, 2, 5);
        else ctx.fillRect(x + 4, y - 4, 2, 5);
      }
      function drawBerobero(ctx, x, y, col, anim, dir) {
        x = Math.round(x); y = Math.round(y);
        const C = BCOL[col];
        const wob = (anim >> 3) & 1;
        ctx.fillStyle = C.body;
        ctx.fillRect(x - 5, y - 6, 10, 9); ctx.fillRect(x - 6, y - 5, 12, 7); ctx.fillRect(x - 3, y - 7, 6, 1);
        // tentacles
        for (let i = 0; i < 4; i++) ctx.fillRect(x - 6 + i * 3 + (wob && i & 1 ? 1 : 0), y + 3, 2, 3 + ((i + wob) & 1));
        ctx.fillStyle = C.dark; ctx.fillRect(x - 5, y + 2, 10, 1);
        // the famous big eyes look where it is going
        const ex = dir === 0 ? 1 : dir === 2 ? -1 : 0, ey = dir === 1 ? 1 : dir === 3 ? -1 : 0;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y - 5, 4, 5); ctx.fillRect(x + 1, y - 5, 4, 5);
        ctx.fillStyle = '#000000'; ctx.fillRect(x - 4 + ex, y - 4 + ey + 1, 2, 2); ctx.fillRect(x + 2 + ex, y - 4 + ey + 1, 2, 2);
      }
      function drawEgg(ctx, x, y, e) {
        x = Math.round(x); y = Math.round(y);
        const s = e.hatch > 25 ? 3 : 5;
        ctx.fillStyle = (e.hatch >> 2) & 1 ? '#ffffff' : BCOL[e.col].body;
        ctx.fillRect(x - s, y - s, 2 * s, 2 * s);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      let stars = null;
      function drawSpace(ctx) {
        if (!stars) { stars = []; for (let i = 0; i < 60; i++) stars.push([Math.random() * FW, Math.random() * FH, Math.floor(Math.random() * 3)]); }
        ctx.fillStyle = '#000010'; ctx.fillRect(FX, FY, FW, FH);
        for (const [x, y, c] of stars) {
          if (((api.frame >> 4) + c) % 4 === 0) continue;
          ctx.fillStyle = ['#6060a0', '#a0a0ff', '#ffffff'][c];
          ctx.fillRect(FX + (x | 0), FY + (y | 0), 1, 1);
        }
        ctx.fillStyle = '#4040ff';
        ctx.fillRect(FX - 2, FY - 2, FW + 4, 2); ctx.fillRect(FX - 2, FY + FH, FW + 4, 2);
        ctx.fillRect(FX - 2, FY, 2, FH); ctx.fillRect(FX + FW, FY, 2, FH);
      }
      function drawMaze(ctx) {
        ctx.fillStyle = '#100010'; ctx.fillRect(FX, FY, FW, FH);
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          if (!g.maze[y * GW + x]) continue;
          const px = FX + x * T, py = FY + y * T;
          ctx.fillStyle = '#20a0a0'; ctx.fillRect(px + 1, py + 1, T - 2, T - 2);
          ctx.fillStyle = '#60ffff'; ctx.fillRect(px + 1, py + 1, T - 2, 1); ctx.fillRect(px + 1, py + 1, 1, T - 2);
          ctx.fillStyle = '#106060'; ctx.fillRect(px + 2, py + T - 2, T - 3, 1); ctx.fillRect(px + T - 2, py + 2, 1, T - 3);
          ctx.fillStyle = '#108080'; ctx.fillRect(px + 5, py + 5, 6, 6);
        }
        ctx.fillStyle = '#ff40ff';
        ctx.fillRect(FX - 2, FY - 2, FW + 4, 2); ctx.fillRect(FX - 2, FY + FH, FW + 4, 2);
        ctx.fillRect(FX - 2, FY, 2, FH); ctx.fillRect(FX + FW, FY, 2, FH);
      }
      function drawGate(ctx) {
        const x = FX + CX * T, y = FY + CY * T;
        const open = g.warpOpen > 0;
        const c = open ? ['#ff40ff', '#40ffff', '#ffff40', '#ffffff'][(api.frame >> 2) & 3] : '#404080';
        ctx.fillStyle = c;
        ctx.fillRect(x - 2, y - 2, T + 4, 1); ctx.fillRect(x - 2, y + T + 1, T + 4, 1);
        ctx.fillRect(x - 2, y - 2, 1, T + 4); ctx.fillRect(x + T + 1, y - 2, 1, T + 4);
        if (open) {
          const k = (api.frame >> 1) % 8;
          ctx.fillRect(x + 8 - k, y + 8 - k, 2 * k, 1); ctx.fillRect(x + 8 - k, y + 7 + k, 2 * k, 1);
        }
        text(ctx, 'WARP', x + 8, y - 11, open && (api.frame >> 3) & 1 ? '#ffffff' : c, 1, 'center');
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
        const hue = ['#ff40ff', '#40ffff', '#ffff40'];
        text(ctx, 'WARP', W / 2 + 1, 35, '#400040', 4, 'center');
        text(ctx, 'WARP', W / 2, 34, hue[(t >> 4) % 3], 4, 'center');
        text(ctx, '&', W / 2, 66, '#ffffff', 2, 'center');
        text(ctx, 'WARP', W / 2 + 1, 85, '#004040', 4, 'center');
        text(ctx, 'WARP', W / 2, 84, hue[((t >> 4) + 1) % 3], 4, 'center');
        drawFighter(ctx, 50, 132, 0, t);
        text(ctx, 'MONSTER FIGHTER', 66, 128, '#40c040');
        for (let i = 0; i < 3; i++) {
          drawBerobero(ctx, 50, 154 + i * 18, i, t + i * 7, (t >> 6) & 3);
          text(ctx, 'BEROBERO  ' + (100) + ' PTS', 66, 150 + i * 18, BCOL[i].body);
        }
        text(ctx, '3 OF A COLOUR IN A ROW: BONUS', W / 2, 210, '#ffffff', 1, 'center');
        text(ctx, 'ENTER THE WARP WHEN IT FLASHES', W / 2, 220, '#40ffff', 1, 'center');
        const blink = (t >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 238, '#ff3030', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 238, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 238, '#ff3030', 1, 'center');
        text(ctx, '\u00a9 1981 NAMCO', W / 2, 252, '#a0a0a0', 1, 'center');
        text(ctx, credStr(), 4, H - 9, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawHud(ctx);
        if (g.world === 'space') drawSpace(ctx); else drawMaze(ctx);
        drawGate(ctx);
        // bomb and blasts
        if (g.bomb) {
          const b = g.bomb, x = FX + b.tx * T + 8, y = FY + b.ty * T + 8;
          ctx.fillStyle = '#303030'; ctx.fillRect(x - 5, y - 4, 10, 9); ctx.fillRect(x - 4, y - 5, 8, 11);
          ctx.fillStyle = b.t < 40 && (b.t >> 2) & 1 ? '#ff2020' : '#ffd040'; ctx.fillRect(x - 1, y - 8, 2, 3);
          text(ctx, String(Math.ceil(b.t / 30)), x, y - 3, '#ffffff', 1, 'center');
        }
        for (const bl of g.blasts) {
          const c = ['#ffffff', '#ffff60', '#ff8020'][Math.floor((26 - bl.t) / 9)] || '#ff8020';
          ctx.fillStyle = c;
          for (const [x, y] of bl.cells) { const s = 4 + (bl.t & 3); ctx.fillRect(FX + x * T + 8 - s, FY + y * T + 8 - s, 2 * s, 2 * s); }
        }
        for (const e of g.enemies) {
          if (e.hatch > 0) drawEgg(ctx, FX + e.x, FY + e.y, e);
          else drawBerobero(ctx, FX + e.x, FY + e.y, e.col, e.anim, e.dir);
        }
        for (const b of g.booms) {
          ctx.fillStyle = b.t & 2 ? '#ffffff' : b.col;
          for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4, r = b.t * 0.8;
            ctx.fillRect(Math.round(FX + b.x + Math.cos(a) * r) - 1, Math.round(FY + b.y + Math.sin(a) * r) - 1, 2, 2);
          }
        }
        const p = g.p;
        if (g.phase === 'dying') {
          const k = 110 - g.t;
          if (k < 50) { if ((k >> 2) & 1) drawFighter(ctx, FX + p.x, FY + p.y, (k >> 3) & 3, 0); }
          else {
            ctx.fillStyle = ['#ffffff', '#ffff40', '#ff4040'][(k >> 2) % 3];
            for (let i = 0; i < 10; i++) { const a = i * 0.628, r = (k - 50) * 0.6; ctx.fillRect(Math.round(FX + p.x + Math.cos(a) * r), Math.round(FY + p.y + Math.sin(a) * r), 2, 2); }
          }
        } else if (g.phase === 'warp') {
          const k = 70 - g.t;
          ctx.strokeStyle = ['#ff40ff', '#40ffff', '#ffff40'][(k >> 2) % 3];
          ctx.fillStyle = ctx.strokeStyle;
          for (let i = 0; i < 16; i++) {
            const a = i * Math.PI / 8 + k * 0.15, r = k * 2.4;
            ctx.fillRect(Math.round(FX + p.x + Math.cos(a) * r) - 2, Math.round(FY + p.y + Math.sin(a) * r) - 2, 4, 4);
          }
          if (k < 30) drawFighter(ctx, FX + p.x, FY + p.y, (k >> 2) & 3, 0);
        } else if (g.phase !== 'over' && !(p.inv > 0 && (api.frame >> 2) & 1)) drawFighter(ctx, FX + p.x, FY + p.y, p.dir, p.walk);
        for (const s of g.shots) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(FX + s.x) - (s.dir & 1 ? 1 : 3), Math.round(FY + s.y) - (s.dir & 1 ? 3 : 1), s.dir & 1 ? 2 : 6, s.dir & 1 ? 6 : 2); }
        for (const pp of g.pops) text(ctx, pp.txt, FX + pp.x, FY + pp.y, pp.col, 1, 'center');
        // bottom bar
        const by = FY + FH + 4;
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) drawFighter(ctx, 12 + i * 13, by + 8, 1, 0);
        text(ctx, (g.world === 'space' ? 'SPACE' : 'MAZE') + ' ' + g.quota[g.world], 84, by + 1, g.world === 'space' ? '#4080ff' : '#ff40ff');
        text(ctx, 'R' + g.stage, W - 8, by + 1, '#ffd040', 1, 'right');
        // lucky colour indicator
        ctx.fillStyle = BCOL[g.lucky].body; ctx.fillRect(150, by + 1, 7, 7);
        text(ctx, 'X2', 160, by + 1, BCOL[g.lucky].body);
        if (g.hurry && (api.frame >> 4) & 1 && g.phase === 'play') text(ctx, 'HURRY!', FX + FW / 2, FY + 4, '#ff4040', 1, 'center');
        const cy = FY + CY * T + 26;
        if (g.phase === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 50, cy - 3, 100, 22);
          text(ctx, (g.world === 'space' ? 'SPACE' : 'MAZE') + ' WORLD', W / 2, cy, g.world === 'space' ? '#4080ff' : '#ff40ff', 1, 'center');
          text(ctx, 'ROUND ' + g.stage, W / 2, cy + 10, '#ffd040', 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 56, cy - 3, 112, 12);
          text(ctx, 'ROUND ' + g.stage + ' CLEAR!', W / 2, cy, '#ffffff', 1, 'center');
        }
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, cy - 3, 80, 12);
          text(ctx, 'GAME OVER', W / 2, cy, '#ff3030', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
