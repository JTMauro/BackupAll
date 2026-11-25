// Crush Roller (Alpha Denshi / Kural, 1981) - from-scratch recreation.
// Paint every corridor of the maze with your brush while two fish chase you. Push the big rollers to flatten them.
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

  // vertical corridor sets (each symmetric about the centre of the 28-column board)
  const S1 = [1, 6, 11, 16, 21, 26], S2 = [1, 9, 18, 26], S3 = [1, 5, 10, 17, 22, 26],
    S4 = [1, 7, 20, 26], S5 = [1, 12, 15, 26], S6 = [1, 4, 9, 18, 23, 26];
  const MAZES = [
    { name: 'LIVING ROOM', bands: [S2, S1, S4, S3, S4, S1, S2], floor: '#3a1c10', block: '#a05a28', trim: '#e0a060', paint: '#ff3c8c', rollers: [[9, 3, 13], [21, 24, 14]] },
    { name: 'MAIN STREET', bands: [S1, S5, S3, S2, S3, S5, S1], floor: '#181818', block: '#4a6a7a', trim: '#a0c8e0', paint: '#ffe040', rollers: [[5, 3, 12], [25, 24, 15]] },
    { name: 'AQUARIUM', bands: [S3, S2, S6, S5, S6, S2, S3], floor: '#04183a', block: '#1a6aa0', trim: '#60d0ff', paint: '#40ff80', rollers: [[13, 24, 14], [17, 3, 13]] },
    { name: 'GARDEN', bands: [S4, S6, S1, S2, S1, S6, S4], floor: '#0a2a0a', block: '#2a7a2a', trim: '#90e070', paint: '#ff8020', rollers: [[9, 24, 15], [21, 3, 12]] }
  ];

  ArcadeRegistry.register({
    id: 'crushroller', title: 'Crush Roller', year: 1981, maker: 'Alpha Denshi / Kural',
    width: 224, height: 288, vector: false, pointer: false,
    controls: 'Arrows: move brush \u00b7 Enter/Space: start',
    marquee: { bg: '#1a0030', fg: '#ff60c0', accent: '#40e0ff' },
    create(api) {
      const W = 224, H = 288, T = 8, GW = 28, GH = 31, OX = 0, OY = 24;
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', titleT = 0, coinFlash = 0, lastCred = api.credits;
      let g = null;

      function maze() { return MAZES[(g.stage - 1) % MAZES.length]; }
      function isRow(y) { return y >= 1 && y <= 29 && (y - 1) % 4 === 0; }
      function isPath(x, y) {
        if (x < 1 || x > 26 || y < 1 || y > 29) return false;
        if (isRow(y)) return true;
        const b = Math.floor((y - 1) / 4);
        return maze().bands[b].indexOf(x) >= 0;
      }

      function newGame() {
        g = { score: 0, lives: 3, stage: 1, extra: false, phase: 'ready', t: 150, pops: [], step: 0 };
        setupStage();
      }
      function setupStage() {
        g.paint = new Uint8Array(GW * GH); g.prints = new Uint8Array(GW * GH);
        g.total = 0; g.painted = 0;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (isPath(x, y)) g.total++;
        g.rollers = maze().rollers.map(([row, a, b]) => ({ row, a, b, x: a * T + T / 2, y: row * T + T / 2, dir: b > a ? 0 : 2, rolling: false, chain: 0, spin: 0 }));
        g.cat = null; g.catT = 1200; g.stageT = 0;
        resetActors();
      }
      function fishSpeed() { return Math.min(1.2, 0.82 + 0.045 * (g.stage - 1)); }
      function resetActors() {
        g.p = { x: 13 * T + T / 2, y: 29 * T + T / 2, dir: 2, want: 2, spd: 1.1 };
        const n = g.stage >= 4 ? 3 : 2;
        const homes = [[1, 1], [26, 1], [13, 1]];
        g.fish = [];
        for (let i = 0; i < n; i++) g.fish.push({ idx: i, x: homes[i][0] * T + 4, y: homes[i][1] * T + 4, dir: 1, spd: fishSpeed(), wait: 40 + i * 100, dead: 0, home: homes[i], scatter: 0 });
        paintAt(g.p.x, g.p.y);
      }
      function addScore(n) {
        g.score += n;
        if (!g.extra && g.score >= 10000) {
          g.extra = true; g.lives++;
          au.melody([[1047, .07], [1319, .07], [1568, .07], [2093, .16]], { type: 'square', vol: .1 });
        }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, y, txt, col) { g.pops.push({ x, y, txt, col, t: 70 }); }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(110, .25, { type: 'square', vol: .14 });
        return false;
      }
      const snd = {
        paint() { au.tone(1400 + (g.painted % 8) * 60, .025, { type: 'triangle', vol: .06 }); },
        roll() { au.noise(.5, { vol: .18, freq: 500, slideTo: 200 }); au.tone(110, .5, { type: 'sawtooth', vol: .08, slideTo: 70 }); },
        crush() { au.tone(900, .25, { type: 'square', vol: .14, slideTo: 80 }); au.noise(.2, { vol: .2, freq: 3000 }); },
        die() { au.melody([[880, .08], [784, .08], [659, .08], [523, .08], [440, .08], [330, .1], [220, .25]], { type: 'square', vol: .14 }); },
        cat() { au.tone(700, .15, { type: 'sine', vol: .12, slideTo: 1100 }); au.tone(1100, .2, { type: 'sine', vol: .1, slideTo: 600, delay: .15 }); },
        start() { au.melody([[523, .1], [659, .1], [784, .1], [659, .1], [698, .1], [880, .1], [1047, .3]], { type: 'square', vol: .13 }); },
        clear() { au.melody([[784, .08], [988, .08], [1175, .08], [1568, .08], [1175, .08], [1568, .3]], { type: 'square', vol: .13 }); }
      };

      function paintAt(px, py) {
        const tx = Math.floor(px / T), ty = Math.floor(py / T);
        if (!isPath(tx, ty)) return;
        const k = ty * GW + tx;
        if (g.paint[k]) return;
        g.paint[k] = 1; g.prints[k] = 0; g.painted++;
        addScore(10);
        if ((++g.step & 1) === 0) snd.paint();
        if (g.painted >= g.total) { g.phase = 'clear'; g.t = 0; snd.clear(); }
      }

      // ---------- player ----------
      function playerDecide(e, tx, ty) {
        for (const d of [e.want, e.dir]) if (isPath(tx + DX[d], ty + DY[d])) return d;
        return -1;
      }
      function updatePlayer() {
        const p = g.p;
        if (api.key('ArrowLeft')) p.want = 2;
        else if (api.key('ArrowRight')) p.want = 0;
        else if (api.key('ArrowUp')) p.want = 3;
        else if (api.key('ArrowDown')) p.want = 1;
        if (p.want === (p.dir + 2) % 4) p.dir = p.want;
        advance(p, T, playerDecide);
        paintAt(p.x, p.y);
      }

      // ---------- rollers ----------
      function updateRollers() {
        const p = g.p;
        for (const r of g.rollers) {
          if (!r.rolling) {
            const sameRow = Math.abs(p.y - r.y) < 2;
            const behind = (r.x - p.x) * DX[r.dir] > 0;
            if (sameRow && behind && Math.abs(p.x - r.x) <= 9 && p.dir === r.dir && p.moving) {
              r.rolling = true; r.chain = 0; snd.roll();
            }
            continue;
          }
          r.x += DX[r.dir] * 2.6; r.spin++;
          for (const f of g.fish) {
            if (f.dead || f.wait > 0) continue;
            if (Math.abs(f.y - r.y) < 5 && Math.abs(f.x - r.x) < 7) {
              const v = 1000 * (1 << Math.min(2, r.chain++));
              f.dead = 240; addScore(v); pop(f.x, f.y, String(v), '#ffffff'); snd.crush();
            }
          }
          const end = r.b * T + T / 2;
          if ((end - r.x) * DX[r.dir] <= 0) {
            r.x = end; r.rolling = false;
            const t = r.a; r.a = r.b; r.b = t; r.dir = (r.dir + 2) % 4;
          }
        }
      }

      // ---------- fish ----------
      function fishDecide(f, tx, ty) {
        const p = g.p;
        const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
        let gx, gy;
        if (f.scatter > 0) { gx = f.home[0]; gy = f.home[1]; }
        else if (f.idx === 0) { gx = ptx; gy = pty; }
        else if (f.idx === 1) { gx = ptx + 4 * DX[p.dir]; gy = pty + 4 * DY[p.dir]; }
        else { gx = 2 * ptx - tx; gy = 2 * pty - ty; }
        const back = (f.dir + 2) % 4;
        const opts = []; let best = -1, bd = 1e9;
        for (let d = 0; d < 4; d++) {
          if (d === back || !isPath(tx + DX[d], ty + DY[d])) continue;
          opts.push(d);
          const nx = tx + DX[d], ny = ty + DY[d], dd = (nx - gx) * (nx - gx) + (ny - gy) * (ny - gy);
          if (dd < bd) { bd = dd; best = d; }
        }
        if (best < 0) return isPath(tx + DX[back], ty + DY[back]) ? back : -1;
        const rnd = Math.max(0.06, 0.22 - g.stage * 0.02);
        if (opts.length > 1 && Math.random() < rnd) return opts[Math.floor(Math.random() * opts.length)];
        return best;
      }
      function updateFish() {
        g.stageT++;
        // periodic scatter phases give the player breathing room
        const cyc = g.stageT % 1500;
        const scatter = cyc < 300 ? 1 : 0;
        for (const f of g.fish) {
          if (f.dead > 0) {
            if (--f.dead === 0) { f.x = 13 * T + 4; f.y = 1 * T + 4; f.dir = 0; f.wait = 30; }
            continue;
          }
          if (f.wait > 0) { f.wait--; continue; }
          f.scatter = scatter;
          f.spd = fishSpeed() * (g.painted / g.total > 0.85 ? 1.08 : 1);
          advance(f, T, fishDecide);
          const p = g.p;
          if (Math.abs(f.x - p.x) < 6 && Math.abs(f.y - p.y) < 6) { g.phase = 'dying'; g.t = 120; snd.die(); return; }
        }
      }

      // ---------- intruder (leaves footprints that must be repainted) ----------
      function updateCat() {
        if (!g.cat) {
          if (--g.catT <= 0) {
            g.catT = Math.max(700, 1500 - g.stage * 100);
            const row = 1 + 4 * (1 + Math.floor(Math.random() * 6));
            const fromLeft = Math.random() < 0.5;
            g.cat = { x: fromLeft ? -8 : W + 8, y: row * T + T / 2, dir: fromLeft ? 0 : 2, t: 0 };
            snd.cat();
          }
          return;
        }
        const c = g.cat; c.t++;
        c.x += DX[c.dir] * 0.7;
        const tx = Math.floor(c.x / T), ty = Math.floor(c.y / T), k = ty * GW + tx;
        if (isPath(tx, ty) && g.paint[k] && (c.t % 2 === 0)) { g.paint[k] = 0; g.prints[k] = 1; g.painted--; }
        const p = g.p;
        if (Math.abs(c.x - p.x) < 7 && Math.abs(c.y - p.y) < 6) {
          addScore(1000); pop(c.x, c.y, '1000', '#ffff80'); snd.cat(); g.cat = null; return;
        }
        if (c.x < -12 || c.x > W + 12) g.cat = null;
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
        if (g.phase === 'ready') { if (--g.t <= 0) g.phase = 'play'; return; }
        if (g.phase === 'play') {
          updatePlayer();
          if (g.phase !== 'play') return;
          updateRollers(); updateCat(); updateFish();
          return;
        }
        if (g.phase === 'dying') {
          if (--g.t > 0) return;
          const respawn = () => { g.rollers.forEach(r => { r.rolling = false; }); resetActors(); g.phase = 'ready'; g.t = 100; };
          if (g.lives <= 1) {
            g.phase = 'wait';
            if (api.offerContinue) api.offerContinue(() => { g.lives = 3; respawn(); }, gameOver);
            else gameOver();
          } else { g.lives--; respawn(); }
          return;
        }
        if (g.phase === 'clear') {
          if (++g.t === 60) { const b = 1000 * Math.min(5, g.stage); addScore(b); pop(W / 2, 150, 'BONUS ' + b, '#ffffff'); }
          if (g.t > 200) { g.stage++; setupStage(); g.phase = 'ready'; g.t = 120; }
          return;
        }
        if (g.phase === 'over') {
          if (--g.t <= 0 || (g.t < 150 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; titleT = 0; g = null; }
        }
      }

      // ---------- drawing ----------
      function drawBrush(ctx, x, y, dir, t) {
        // a paint brush: handle trails behind, bristles lead
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][dir]);
        ctx.fillStyle = '#c08040'; ctx.fillRect(-7, -1, 6, 3);
        ctx.fillStyle = '#d0d0e0'; ctx.fillRect(-2, -3, 3, 7);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(1, -4, 4, 9);
        ctx.fillStyle = (t >> 2) & 1 ? '#ffd0e0' : '#f0f0f0'; ctx.fillRect(5, -3, 1, 7);
        ctx.fillStyle = '#202020'; ctx.fillRect(2, -1, 1, 1); ctx.fillRect(2, 1, 1, 1);
        ctx.restore();
      }
      function drawFish(ctx, x, y, dir, col, t) {
        const flip = dir === 2 ? -1 : 1;
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(flip, 1);
        if (dir === 3) ctx.rotate(-0.4 * flip); if (dir === 1) ctx.rotate(0.4 * flip);
        const wig = (t >> 3) & 1;
        ctx.fillStyle = col;
        ctx.fillRect(-3, -3, 7, 7); ctx.fillRect(-4, -2, 9, 5); ctx.fillRect(-1, -4, 3, 1);
        ctx.fillRect(-7, -3 + wig, 2, 3); ctx.fillRect(-6, -1, 2, 3 - wig); ctx.fillRect(-5, 0 - wig, 1, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(1, -2, 3, 3);
        ctx.fillStyle = '#000'; ctx.fillRect(3, -1, 1, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-2, 1, 4, 1);
        ctx.fillStyle = '#ffe0a0'; ctx.fillRect(4, 2, 1, 1);
        ctx.restore();
      }
      function drawRoller(ctx, r) {
        const x = Math.round(OX + r.x), y = Math.round(OY + r.y);
        ctx.fillStyle = '#606060'; ctx.fillRect(x - 1, y - 9, 2, 18);
        ctx.fillStyle = '#d8d8f0'; ctx.fillRect(x - 4, y - 7, 8, 14);
        ctx.fillStyle = '#9090b8';
        for (let k = 0; k < 4; k++) ctx.fillRect(x - 4, y - 7 + ((k * 4 + (r.spin >> 1)) % 14), 8, 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y - 7, 1, 14);
        ctx.fillStyle = '#404040'; ctx.fillRect(x - 5, y - 9, 10, 2); ctx.fillRect(x - 5, y + 7, 10, 2);
      }
      function drawCat(ctx, c) {
        const x = Math.round(OX + c.x), y = Math.round(OY + c.y), f = c.dir === 2 ? -1 : 1, leg = (c.t >> 3) & 1;
        ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(-5, -2, 9, 4); ctx.fillRect(3, -5, 4, 4); ctx.fillRect(3, -6, 1, 1); ctx.fillRect(6, -6, 1, 1);
        ctx.fillRect(-7, -5 + leg, 2, 4);
        ctx.fillRect(-4, 2, 1, 2 - leg); ctx.fillRect(2, 2, 1, 1 + leg);
        ctx.fillStyle = '#000'; ctx.fillRect(5, -4, 1, 1);
        ctx.restore();
      }
      function drawMaze(ctx) {
        const m = maze();
        ctx.fillStyle = m.block; ctx.fillRect(OX, OY, GW * T, GH * T);
        // block decoration: trim lines
        ctx.fillStyle = m.floor;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          if (isPath(x, y)) continue;
          const px = OX + x * T, py = OY + y * T;
          if (((x + y) & 3) === 0) { ctx.fillStyle = m.trim; ctx.fillRect(px + 3, py + 3, 2, 2); }
        }
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          if (!isPath(x, y)) continue;
          const px = OX + x * T, py = OY + y * T, k = y * GW + x;
          ctx.fillStyle = m.floor; ctx.fillRect(px, py, T, T);
          if (g.paint[k]) {
            ctx.fillStyle = m.paint;
            const l = isPath(x - 1, y) ? 0 : 1, r = isPath(x + 1, y) ? 0 : 1, u = isPath(x, y - 1) ? 0 : 1, d = isPath(x, y + 1) ? 0 : 1;
            ctx.fillRect(px + 1 * l + (l ? 0 : 0), py + 1 * u, T - l - r, T - u - d);
          } else if (g.prints[k]) {
            ctx.fillStyle = '#e0e0e0'; ctx.fillRect(px + 1 + (x & 1) * 3, py + 2 + (x & 1), 2, 2);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(px + 3, py + 3, 2, 2);
          }
        }
        // block edges
        ctx.fillStyle = m.trim;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          if (isPath(x, y)) continue;
          const px = OX + x * T, py = OY + y * T;
          if (isPath(x, y - 1)) ctx.fillRect(px, py, T, 1);
          if (isPath(x, y + 1)) ctx.fillRect(px, py + T - 1, T, 1);
          if (isPath(x - 1, y)) ctx.fillRect(px, py, 1, T);
          if (isPath(x + 1, y)) ctx.fillRect(px + T - 1, py, 1, T);
        }
      }
      function fishCol(i) { return ['#ff3030', '#ff9020', '#30e0e0'][i]; }
      function drawHud(ctx) {
        text(ctx, '1UP', 16, 2, '#ff4040');
        text(ctx, String(g ? g.score : 0).padStart(6, ' '), 4, 11, '#ffffff');
        text(ctx, 'HIGH SCORE', W / 2, 2, '#ff4040', 1, 'center');
        text(ctx, String(hi).padStart(6, ' '), W / 2, 11, '#ffffff', 1, 'center');
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function drawTitle(ctx) {
        drawHud(ctx);
        const t = titleT;
        text(ctx, 'CRUSH', W / 2 + 1, 37, '#600040', 3, 'center');
        text(ctx, 'CRUSH', W / 2, 36, '#ff60c0', 3, 'center');
        text(ctx, 'ROLLER', W / 2 + 1, 63, '#004060', 3, 'center');
        text(ctx, 'ROLLER', W / 2, 62, '#40e0ff', 3, 'center');
        // paint stripe being laid by a brush
        const sx = 20 + ((t * 1.2) % 200);
        ctx.fillStyle = '#ff3c8c'; ctx.fillRect(16, 92, Math.max(0, sx - 16), 4);
        drawBrush(ctx, sx + 2, 94, 0, t);
        text(ctx, '- CAST -', W / 2, 110, '#ffd040', 1, 'center');
        drawBrush(ctx, 52, 128, 0, t); text(ctx, 'BRUSH    10 PTS / TILE', 66, 125, '#ffffff');
        drawFish(ctx, 52, 146, 0, '#ff3030', t); drawFish(ctx, 38, 146, 0, '#ff9020', t);
        text(ctx, 'FISH     AVOID!', 66, 143, '#ff9020');
        drawRoller(ctx, { x: 52 - OX, y: 166 - OY, spin: t });
        text(ctx, 'ROLLER   1000 2000 4000', 66, 163, '#c0c0ff');
        drawCat(ctx, { x: 52 - OX, y: 184 - OY, dir: 0, t });
        text(ctx, 'INTRUDER 1000', 66, 181, '#e0e0e0');
        text(ctx, 'PAINT EVERY PATH!', W / 2, 202, '#40ff80', 1, 'center');
        text(ctx, 'BONUS BRUSH AT 10000', W / 2, 214, '#ffffff', 1, 'center');
        const blink = (t >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', W / 2, 234, '#ff3030', 1, 'center'); }
        else if (api.credits > 0) { if (blink) text(ctx, 'PUSH START', W / 2, 234, '#ffffff', 1, 'center'); }
        else if (blink) text(ctx, 'INSERT COIN', W / 2, 234, '#ff3030', 1, 'center');
        text(ctx, '\u00a9 1981 ALPHA DENSHI / KURAL', W / 2, 256, '#a0a0a0', 1, 'center');
        text(ctx, credStr(), 4, H - 10, '#a0a0a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawHud(ctx);
        drawMaze(ctx);
        for (const r of g.rollers) drawRoller(ctx, r);
        if (g.cat) drawCat(ctx, g.cat);
        for (const f of g.fish) {
          if (f.dead) continue;
          if (f.wait > 0 && (api.frame >> 2) & 1) continue;
          drawFish(ctx, OX + f.x, OY + f.y, f.dir, fishCol(f.idx), api.frame + f.idx * 5);
        }
        const p = g.p;
        if (g.phase === 'dying') {
          const k = 120 - g.t;
          if (k < 60) drawBrush(ctx, OX + p.x, OY + p.y, (k >> 3) & 3, k);
          else { ctx.fillStyle = (k >> 2) & 1 ? '#ffffff' : maze().paint; const s = Math.max(1, 12 - ((k - 60) >> 2)); ctx.fillRect(Math.round(OX + p.x - s / 2), Math.round(OY + p.y - 1), s, 3); }
        } else if (g.phase !== 'over') drawBrush(ctx, OX + p.x, OY + p.y, p.dir, api.frame);
        for (const pp of g.pops) text(ctx, pp.txt, OX + pp.x, OY + pp.y - 4, pp.col, 1, 'center');
        // bottom bar
        const by = OY + GH * T + 4;
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) drawBrush(ctx, 10 + i * 14, by + 4, 0, 0);
        text(ctx, maze().name, W - 4, by, '#a0a0a0', 1, 'right');
        const pct = Math.floor(100 * g.painted / g.total);
        text(ctx, 'ROUND ' + g.stage + '  ' + pct + '%', W - 4, 2, '#ffd040', 1, 'right');
        if (g.phase === 'ready') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 44, OY + 15 * T - 2, 88, 22);
          text(ctx, 'ROUND ' + g.stage, W / 2, OY + 15 * T, '#40e0ff', 1, 'center');
          text(ctx, 'READY!', W / 2, OY + 15 * T + 10, '#ffd040', 1, 'center');
        }
        if (g.phase === 'clear') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 54, OY + 15 * T - 2, 108, 14);
          text(ctx, (g.t >> 3) & 1 ? 'WELL DONE!' : 'ALL PAINTED!', W / 2, OY + 15 * T + 1, '#ffffff', 1, 'center');
        }
        if (g.phase === 'over') {
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 40, OY + 15 * T - 2, 80, 14);
          text(ctx, 'GAME OVER', W / 2, OY + 15 * T + 1, '#ff3030', 1, 'center');
        }
      }
      return { update, render, destroy() { } };
    }
  });
})();
