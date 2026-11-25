// Qix (Taito, 1981) - from-scratch recreation. Claim 75% of the field with Stix lines while the Qix roams.
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
    '%': [24, 25, 2, 4, 8, 19, 3], '=': [0, 0, 31, 0, 31, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], 'x': [0, 0, 17, 10, 4, 10, 17],
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s);
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      let ch = s[i]; let g = FONT[ch]; if (!g) g = FONT[ch.toUpperCase()]; if (!g) continue;
      for (let r = 0; r < 7; r++) {
        const bits = g[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  const W = 256, H = 240;
  const GW = 121, GH = 101;           // grid of nodes (2px apart)
  const X0 = 8, Y0 = 32;              // pixel origin of node (0,0)
  const T_OPEN = 0, T_IN = 1, T_EDGE = 2, T_STIX = 3;

  ArcadeRegistry.register({
    id: 'qix', title: 'Qix', year: 1981, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move along edges \u00b7 Hold Space + arrow: Fast Draw \u00b7 Hold X + arrow: Slow Draw (double points) \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#ff40ff', accent: '#40c0ff' },
    create(api) {
      const au = api.audio;
      const grid = new Uint8Array(GW * GH);   // node type
      const fill = new Uint8Array(GW * GH);   // 0 none, 1 fast (blue), 2 slow (orange)
      const mark = new Int8Array(GW * GH);
      const layer = mkCanvas(W, H), lctx = layer.getContext('2d');
      const idx = (x, y) => y * GW + x;
      const inb = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH;
      const at = (x, y) => inb(x, y) ? grid[idx(x, y)] : T_IN;
      const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

      let hi = api.getHiScore(30000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;
      let totalOpen = 1;

      // ---------- field ----------
      function resetField() {
        grid.fill(T_OPEN); fill.fill(0);
        for (let x = 0; x < GW; x++) { grid[idx(x, 0)] = T_EDGE; grid[idx(x, GH - 1)] = T_EDGE; }
        for (let y = 0; y < GH; y++) { grid[idx(0, y)] = T_EDGE; grid[idx(GW - 1, y)] = T_EDGE; }
        totalOpen = (GW - 2) * (GH - 2);
        redrawLayer();
      }
      function openCount() { let n = 0; for (let i = 0; i < grid.length; i++) if (grid[i] === T_OPEN || grid[i] === T_STIX) n++; return n; }
      function recomputeEdges() {
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const i = idx(x, y), t = grid[i];
          if (t !== T_IN && t !== T_EDGE) continue;
          let open = false;
          for (let dy = -1; dy <= 1 && !open; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (inb(nx, ny)) { const nt = grid[idx(nx, ny)]; if (nt === T_OPEN || nt === T_STIX) { open = true; break; } }
          }
          grid[i] = open ? T_EDGE : T_IN;
        }
      }
      function redrawLayer() {
        lctx.clearRect(0, 0, W, H);
        const lvl = g ? g.level : 1;
        const fastCol = ['#1830b0', '#2850d8', '#10808a', '#7020a0'][(lvl - 1) % 4];
        const fastCol2 = ['#3050e0', '#4878ff', '#20b0b0', '#9848d0'][(lvl - 1) % 4];
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          const i = idx(x, y), f = fill[i];
          if (!f) continue;
          const px = X0 + x * 2 - 1, py = Y0 + y * 2 - 1;
          if (f === 1) { lctx.fillStyle = ((x + y) & 3) === 0 ? fastCol2 : fastCol; }
          else { lctx.fillStyle = ((x ^ y) & 1) ? '#c04008' : '#902808'; }
          lctx.fillRect(px, py, 2, 2);
        }
        lctx.fillStyle = '#ffffff';
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
          if (grid[idx(x, y)] === T_EDGE) lctx.fillRect(X0 + x * 2 - 1, Y0 + y * 2 - 1, 2, 2);
        }
      }

      // ---------- Qix ----------
      function newQix(cx, cy) {
        const q = { a: { x: cx - 6, y: cy }, b: { x: cx + 6, y: cy }, va: { x: 0.6, y: 0.4 }, vb: { x: -0.5, y: 0.5 }, hist: [], hue: Math.random() * 360, t: 0, alive: true };
        return q;
      }
      function qixSpeed() { return Math.min(1.5, 0.7 + g.level * 0.08); }
      function moveEnd(p, v, q) {
        const sp = qixSpeed();
        // erratic steering
        if (Math.random() < 0.06) { v.x += (Math.random() - 0.5) * 0.9; v.y += (Math.random() - 0.5) * 0.9; }
        // bias toward the player's stix when drawing
        if (g.p.drawing && Math.random() < 0.02 + g.level * 0.004) { v.x += Math.sign(g.p.x - p.x) * 0.4; v.y += Math.sign(g.p.y - p.y) * 0.4; }
        const m = Math.hypot(v.x, v.y) || 1; v.x = v.x / m * sp; v.y = v.y / m * sp;
        const ok = (x, y) => { const t = at(Math.round(x), Math.round(y)); return t === T_OPEN || t === T_STIX; };
        if (ok(p.x + v.x, p.y + v.y)) { p.x += v.x; p.y += v.y; return; }
        if (ok(p.x - v.x, p.y + v.y)) { v.x = -v.x; p.x += v.x; p.y += v.y; return; }
        if (ok(p.x + v.x, p.y - v.y)) { v.y = -v.y; p.x += v.x; p.y += v.y; return; }
        v.x = -v.x; v.y = -v.y;
        if (ok(p.x + v.x, p.y + v.y)) { p.x += v.x; p.y += v.y; }
      }
      function updateQix(q) {
        q.t++;
        moveEnd(q.a, q.va, q); moveEnd(q.b, q.vb, q);
        // keep the line short-ish: pull ends together
        const dx = q.b.x - q.a.x, dy = q.b.y - q.a.y, d = Math.hypot(dx, dy);
        const maxL = 12 + Math.min(10, g.level * 1.5);
        if (d > maxL) { q.vb.x -= dx / d * 0.5; q.vb.y -= dy / d * 0.5; q.va.x += dx / d * 0.5; q.va.y += dy / d * 0.5; }
        if (d < 3) { q.vb.x += (Math.random() - 0.5) * 2; q.vb.y += (Math.random() - 0.5) * 2; }
        q.hue = (q.hue + 3) % 360;
        if ((q.t & 1) === 0) { q.hist.unshift({ ax: q.a.x, ay: q.a.y, bx: q.b.x, by: q.b.y, h: q.hue }); if (q.hist.length > 9) q.hist.pop(); }
      }
      function qixHits(q) {
        const n = Math.max(2, Math.ceil(Math.hypot(q.b.x - q.a.x, q.b.y - q.a.y) * 1.5));
        const p = g.p;
        for (let i = 0; i <= n; i++) {
          const x = q.a.x + (q.b.x - q.a.x) * i / n, y = q.a.y + (q.b.y - q.a.y) * i / n;
          const rx = Math.round(x), ry = Math.round(y);
          if (at(rx, ry) === T_STIX) return true;
          if (p.drawing && Math.abs(x - p.x) < 1.2 && Math.abs(y - p.y) < 1.2) return true;
        }
        return false;
      }

      // ---------- Sparx ----------
      function spawnSparx(dir) {
        const x = 60, y = 0;
        return { x, y, px: x - dir, py: 0, dir, acc: 0, super: false, t: 0 };
      }
      function sparxStep(s) {
        const hx = s.x - s.px, hy = s.y - s.py;
        const R = [-hy, hx], L = [hy, -hx], S = [hx, hy];
        const cand = [];
        for (const d of DIRS) {
          const nx = s.x + d[0], ny = s.y + d[1];
          if (at(nx, ny) !== T_EDGE) continue;
          if (nx === s.px && ny === s.py) continue;
          cand.push(d);
        }
        let ch = null;
        if (!cand.length) { ch = [s.px - s.x, s.py - s.y]; }
        else if (s.super) {
          let best = 1e9;
          for (const d of cand) { const dd = Math.abs(s.x + d[0] - g.p.x) + Math.abs(s.y + d[1] - g.p.y) + Math.random() * 0.5; if (dd < best) { best = dd; ch = d; } }
        } else {
          const pref = s.dir > 0 ? [R, S, L] : [L, S, R];
          for (const pd of pref) { const f = cand.find(d => d[0] === pd[0] && d[1] === pd[1]); if (f) { ch = f; break; } }
          if (!ch) ch = cand[0];
        }
        s.px = s.x; s.py = s.y; s.x += ch[0]; s.y += ch[1];
      }
      function snapToEdge(o) {
        if (at(o.x, o.y) === T_EDGE) return;
        let best = null, bd = 1e9;
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (grid[idx(x, y)] === T_EDGE) {
          const d = Math.abs(x - o.x) + Math.abs(y - o.y); if (d < bd) { bd = d; best = [x, y]; }
        }
        if (best) { o.x = best[0]; o.y = best[1]; if ('px' in o) { o.px = o.x; o.py = o.y; } }
      }

      // ---------- game flow ----------
      function newGame() {
        g = { score: 0, lives: 3, level: 1, mult: 1, nextLife: 50000, booms: [], pops: [] };
        startLevel();
      }
      function startLevel() {
        resetField();
        g.qix = [];
        const split = g.level >= 3 && (g.level % 2 === 1);
        if (split) { g.qix.push(newQix(35, 50)); g.qix.push(newQix(85, 50)); }
        else g.qix.push(newQix(60, 50));
        g.p = { x: 60, y: GH - 1, drawing: false, slow: false, stix: [], acc: 0, idle: 0, fuse: -1, dead: 0 };
        g.sparx = [spawnSparx(1), spawnSparx(-1)];
        g.timer = 0; g.phase = 'ready'; g.phaseT = 120; g.pct = 0; g.split = split;
        g.releaseEvery = Math.max(900, 1800 - g.level * 120);
        redrawLayer();
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += 50000; au.melody([[880, .06], [1175, .06], [1568, .12]], { type: 'square', vol: .14 }); }
        if (g.score > hi) hi = g.score;
      }
      function clearStix() {
        for (const n of g.p.stix) if (grid[n] === T_STIX) grid[n] = T_OPEN;
      }
      function killPlayer(why) {
        const p = g.p; if (p.dead) return;
        p.dead = 1; g.phase = 'dying'; g.phaseT = 110; g.why = why;
        au.noise(0.7, { vol: .25, freq: 3000, slideTo: 100 });
        au.tone(600, 0.6, { type: 'sawtooth', vol: .12, slideTo: 60 });
        for (let i = 0; i < 24; i++) g.booms.push({ x: X0 + p.x * 2, y: Y0 + p.y * 2, vx: Math.cos(i / 24 * 6.283) * (1 + Math.random() * 1.5), vy: Math.sin(i / 24 * 6.283) * (1 + Math.random() * 1.5), t: 50 });
      }
      function afterDeath() {
        const p = g.p;
        // back to where the line was started
        if (p.drawing && p.stix.length) { const s = p.stix[0]; p.x = p.sx; p.y = p.sy; void s; }
        clearStix();
        p.drawing = false; p.stix = []; p.fuse = -1; p.idle = 0; p.dead = 0;
        snapToEdge(p);
        // sparx restart from the top, away from the player
        const n = g.sparx.length;
        g.sparx = [];
        for (let i = 0; i < n; i++) { const s = spawnSparx(i & 1 ? -1 : 1); s.super = false; g.sparx.push(s); }
        for (const s of g.sparx) { snapToEdge(s); if (Math.abs(s.x - p.x) + Math.abs(s.y - p.y) < 20) { s.x = GW - 1 - s.x; s.px = s.x - s.dir; snapToEdge(s); } }
        g.timer = Math.max(0, g.timer - 600);
        g.lives--;
        if (g.lives <= 0) { lastLife(); return; }
        g.phase = 'ready'; g.phaseT = 80;
      }
      function lastLife() {
        g.phase = 'wait';
        const cg = g;
        if (!api.offerContinue) { gameOver(); return; }
        api.offerContinue(() => { if (g === cg) { g.lives = 3; g.score = 0; g.phase = 'ready'; g.phaseT = 80; } }, () => { if (g === cg) gameOver(); });
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [330, .2], [262, .2], [196, .5]], { type: 'triangle', vol: .18 });
      }

      function closeStix() {
        const p = g.p;
        for (const n of p.stix) grid[n] = T_EDGE;
        // flood from each Qix
        mark.fill(0);
        let label = 0; const labels = [];
        for (const q of g.qix) {
          let sx = Math.round(q.a.x), sy = Math.round(q.a.y);
          if (at(sx, sy) !== T_OPEN) { sx = Math.round(q.b.x); sy = Math.round(q.b.y); }
          if (at(sx, sy) !== T_OPEN) { // search nearby
            let found = false;
            for (let r = 1; r < 6 && !found; r++) for (let dy = -r; dy <= r && !found; dy++) for (let dx = -r; dx <= r; dx++) if (at(sx + dx, sy + dy) === T_OPEN) { sx += dx; sy += dy; found = true; break; }
            if (!found) { labels.push(-1); continue; }
          }
          const i0 = idx(sx, sy);
          if (mark[i0]) { labels.push(mark[i0]); continue; }
          label++; labels.push(label);
          const st = [i0]; mark[i0] = label;
          while (st.length) {
            const i = st.pop(), x = i % GW, y = (i / GW) | 0;
            for (const d of DIRS) {
              const nx = x + d[0], ny = y + d[1];
              if (!inb(nx, ny)) continue;
              const j = idx(nx, ny);
              if (!mark[j] && grid[j] === T_OPEN) { mark[j] = label; st.push(j); }
            }
          }
        }
        const f = p.slow ? 2 : 1;
        let claimed = 0;
        for (let i = 0; i < grid.length; i++) if (grid[i] === T_OPEN && !mark[i]) { grid[i] = T_IN; fill[i] = f; claimed++; }
        for (const n of p.stix) { fill[n] = f; claimed++; }
        recomputeEdges();
        const split = g.qix.length > 1 && labels[0] > 0 && labels[1] > 0 && labels[0] !== labels[1];
        p.drawing = false; p.stix = []; p.fuse = -1; p.idle = 0;
        const pts = Math.round(claimed * (p.slow ? 0.5 : 0.25)) * g.mult;
        addScore(pts);
        g.pops.push({ x: X0 + p.x * 2, y: Y0 + p.y * 2, s: String(pts), t: 60 });
        // move qix ends out of claimed land
        for (const q of g.qix) {
          if (at(Math.round(q.b.x), Math.round(q.b.y)) !== T_OPEN) { q.b.x = q.a.x; q.b.y = q.a.y; }
          if (at(Math.round(q.a.x), Math.round(q.a.y)) !== T_OPEN) { q.a.x = q.b.x; q.a.y = q.b.y; }
        }
        for (const s of g.sparx) snapToEdge(s);
        snapToEdge(p);
        g.pct = Math.floor((1 - openCount() / totalOpen) * 100);
        redrawLayer();
        if (p.slow) au.melody([[523, .05], [659, .05], [784, .05], [1047, .1]], { type: 'triangle', vol: .16 });
        else au.melody([[392, .05], [523, .05], [659, .1]], { type: 'triangle', vol: .14 });
        if (split) { levelClear(true); return; }
        if (g.pct >= 75) levelClear(false);
      }
      function levelClear(split) {
        g.phase = 'clear'; g.phaseT = 240; g.wasSplit = split;
        const over = Math.max(0, g.pct - 75);
        g.bonus = over * 1000 * g.mult;
        if (split) g.bonus += 10000 * g.mult;
        addScore(g.bonus);
        if (split) g.mult++;
        au.melody([[523, .1], [659, .1], [784, .1], [1047, .1], [784, .1], [1047, .3]], { type: 'square', vol: .14 });
      }

      function readDir() {
        if (api.key('ArrowLeft')) return DIRS[2];
        if (api.key('ArrowRight')) return DIRS[0];
        if (api.key('ArrowUp')) return DIRS[3];
        if (api.key('ArrowDown')) return DIRS[1];
        return null;
      }
      function stepPlayer() {
        const p = g.p;
        const d = readDir();
        const fast = api.key('Space'), slow = api.key('KeyX') || api.key('KeyZ');
        const btn = fast || slow;
        let moved = false;
        if (!p.drawing) {
          p.acc += 0.85;
          while (p.acc >= 1) {
            p.acc -= 1;
            if (!d) break;
            const nx = p.x + d[0], ny = p.y + d[1], t = at(nx, ny);
            if (t === T_EDGE) { p.x = nx; p.y = ny; moved = true; }
            else if (t === T_OPEN && btn && inb(nx, ny)) {
              p.drawing = true; p.slow = slow && !fast; p.sx = p.x; p.sy = p.y;
              p.stix = []; p.x = nx; p.y = ny; grid[idx(nx, ny)] = T_STIX; p.stix.push(idx(nx, ny));
              p.idle = 0; p.fuse = -1; moved = true; break;
            } else {
              // slide around corners: try perpendicular edges
              break;
            }
          }
        } else {
          if (fast) p.slow = false;
          const sp = fast ? 0.8 : 0.4;
          if (btn && d) p.acc += sp;
          let tries = 0;
          while (p.acc >= 1 && tries++ < 3) {
            p.acc -= 1;
            const nx = p.x + d[0], ny = p.y + d[1], t = at(nx, ny);
            if (!inb(nx, ny)) break;
            if (t === T_OPEN) {
              // do not touch own line except where we came from
              let touch = false;
              for (const dd of DIRS) {
                const ax = nx + dd[0], ay = ny + dd[1];
                if (ax === p.x && ay === p.y) continue;
                if (at(ax, ay) === T_STIX) { touch = true; break; }
              }
              if (touch) { p.acc = 0; break; }
              p.x = nx; p.y = ny; grid[idx(nx, ny)] = T_STIX; p.stix.push(idx(nx, ny)); moved = true;
              if ((p.stix.length & 3) === 0) au.tone(p.slow ? 300 : 500 + (p.stix.length % 20) * 10, .03, { type: 'square', vol: .05 });
            } else if (t === T_EDGE) {
              if (p.stix.length < 2 && nx === p.sx && ny === p.sy) { p.acc = 0; break; }
              p.x = nx; p.y = ny; moved = true; closeStix(); return;
            } else { p.acc = 0; break; }
          }
          if (moved) { p.idle = 0; }
          else {
            p.idle++;
            if (p.idle > 24) {
              if (p.fuse < 0) { p.fuse = 0; au.tone(1200, .05, { type: 'square', vol: .06 }); }
              p.fuse += 0.35 + g.level * 0.02;
              if ((frame & 3) === 0) au.noise(.04, { vol: .06, freq: 5000 });
              if (p.fuse >= p.stix.length - 0.5) { killPlayer('fuse'); }
            }
          }
        }
      }

      function updatePlay() {
        const p = g.p;
        g.timer++;
        if (g.timer % g.releaseEvery === 0) {
          const cap = Math.min(8, 2 + g.level);
          if (g.sparx.length < cap) { g.sparx.push(spawnSparx(1), spawnSparx(-1)); au.melody([[1400, .04], [1000, .04]], { type: 'square', vol: .08 }); }
          else for (const s of g.sparx) s.super = true;
        }
        if (g.timer === g.releaseEvery * 3) { for (const s of g.sparx) s.super = true; au.tone(200, .4, { type: 'sawtooth', vol: .1, slideTo: 800 }); }
        stepPlayer();
        if (g.phase !== 'play') return;
        for (const q of g.qix) {
          updateQix(q);
          if (qixHits(q)) { killPlayer('qix'); return; }
        }
        const sp = Math.min(0.95, 0.5 + g.level * 0.05);
        for (const s of g.sparx) {
          s.acc += s.super ? sp * 1.1 : sp; s.t++;
          while (s.acc >= 1) { s.acc -= 1; sparxStep(s); }
          if (!p.drawing && Math.abs(s.x - p.x) + Math.abs(s.y - p.y) <= 1) { killPlayer('sparx'); return; }
          if (p.drawing && Math.abs(s.x - p.sx) + Math.abs(s.y - p.sy) <= 0 && s.super) { /* super sparx may chase up the stix */ s.onStix = 0; }
        }
        // Super Sparx follow the Stix too
        for (const s of g.sparx) {
          if (!s.super || !p.drawing) { s.onStix = -1; continue; }
          if (s.onStix == null || s.onStix < 0) { if (s.x === p.sx && s.y === p.sy) s.onStix = 0; else continue; }
          s.onStix += sp * 0.8;
          const k = Math.floor(s.onStix);
          if (k >= p.stix.length - 1) { killPlayer('sparx'); return; }
        }
        // qix drone
        if ((frame % 10) === 0) au.tone(90 + Math.random() * 140, .12, { type: 'sawtooth', vol: .035 });
      }

      function update() {
        frame++; if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); au.melody([[262, .1], [330, .1], [392, .1], [523, .25]], { type: 'square', vol: .14 }); }
            else { coinFlash = 90; au.tone(90, .3, { type: 'square', vol: .15 }); }
          }
          return;
        }
        for (const b of g.booms) { b.x += b.vx; b.y += b.vy; b.vx *= .96; b.vy *= .96; b.t--; }
        g.booms = g.booms.filter(b => b.t > 0);
        for (const pp of g.pops) { pp.t--; pp.y -= .3; }
        g.pops = g.pops.filter(pp => pp.t > 0);
        if (g.phase === 'ready') { if (--g.phaseT <= 0) g.phase = 'play'; for (const q of g.qix) updateQix(q); return; }
        if (g.phase === 'play') { updatePlay(); return; }
        if (g.phase === 'dying') { for (const q of g.qix) updateQix(q); if (--g.phaseT <= 0) afterDeath(); return; }
        if (g.phase === 'clear') { if (--g.phaseT <= 0) { g.level++; startLevel(); } return; }
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } return; }
      }

      // ---------- render ----------
      function hsl(h, l) { return 'hsl(' + (h | 0) + ',100%,' + (l || 60) + '%)'; }
      function drawQix(ctx, q) {
        for (let i = q.hist.length - 1; i >= 0; i--) {
          const s = q.hist[i];
          ctx.strokeStyle = hsl(s.h + i * 25, 65 - i * 3);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(X0 + s.ax * 2, Y0 + s.ay * 2); ctx.lineTo(X0 + s.bx * 2, Y0 + s.by * 2);
          ctx.stroke();
        }
      }
      function drawSparx(ctx, s) {
        const x = X0 + s.x * 2, y = Y0 + s.y * 2;
        const ph = (frame >> 2) & 1;
        ctx.fillStyle = s.super ? '#ff3030' : '#ff80ff';
        if (ph) { ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7); ctx.fillRect(x - 2, y - 2, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x + 2, y - 2, 1, 1); ctx.fillRect(x - 2, y + 2, 1, 1); }
        else { ctx.fillRect(x - 2, y - 2, 5, 1); ctx.fillRect(x - 2, y + 2, 5, 1); ctx.fillRect(x - 2, y - 2, 1, 5); ctx.fillRect(x + 2, y - 2, 1, 5); }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
      }
      function drawMarker(ctx, x, y, col) {
        ctx.fillStyle = col;
        ctx.fillRect(x - 1, y - 3, 3, 1); ctx.fillRect(x - 2, y - 2, 5, 1); ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 2, y + 2, 5, 1); ctx.fillRect(x - 1, y + 3, 3, 1);
        ctx.fillStyle = '#000'; ctx.fillRect(x, y, 1, 1);
      }
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function drawHUD(ctx) {
        text(ctx, String(g.score).padStart(7, ' '), 8, 4, '#ffffff', 1);
        text(ctx, 'HI ' + String(hi), W / 2, 4, '#ffd040', 1, 'center');
        text(ctx, 'LEVEL ' + g.level, W - 8, 4, '#40c0ff', 1, 'right');
        text(ctx, 'CLAIMED ' + String(g.pct).padStart(2, '0') + '%', 8, 14, '#ff60ff', 1);
        text(ctx, 'THRESHOLD 75%', W - 8, 14, '#80ff80', 1, 'right');
        if (g.mult > 1) text(ctx, 'x' + g.mult, 112, 14, '#ffff00', 1);
        for (let i = 0; i < Math.min(8, g.lives - (g.phase === 'dying' ? 0 : 1)); i++) drawMarker(ctx, 150 + i * 9, 18, '#ff4040');
        // timer bar: Sparx release clock
        const t = (g.timer % g.releaseEvery) / g.releaseEvery;
        ctx.fillStyle = '#303030'; ctx.fillRect(8, 25, W - 16, 2);
        ctx.fillStyle = g.sparx.some(s => s.super) ? '#ff3030' : '#30c0ff'; ctx.fillRect(8, 25, Math.floor((W - 16) * t), 2);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        ctx.drawImage(layer, 0, 0);
        const p = g.p;
        // stix
        if (p.stix.length) {
          ctx.fillStyle = p.slow ? '#ff6020' : '#30a0ff';
          for (const n of p.stix) { const x = n % GW, y = (n / GW) | 0; ctx.fillRect(X0 + x * 2 - 1, Y0 + y * 2 - 1, 2, 2); }
          if (p.fuse >= 0) {
            const k = Math.min(p.stix.length - 1, Math.floor(p.fuse)), n = p.stix[k];
            const x = X0 + (n % GW) * 2, y = Y0 + ((n / GW) | 0) * 2;
            ctx.fillStyle = (frame & 2) ? '#ffff00' : '#ff2000';
            ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1 + (frame & 1), y - 1, 2, 2);
          }
          for (const s of g.sparx) if (s.onStix >= 0 && s.super && p.drawing) {
            const k = Math.min(p.stix.length - 1, Math.floor(s.onStix)), n = p.stix[k];
            drawSparx(ctx, { x: n % GW, y: (n / GW) | 0, super: true });
          }
        }
        for (const q of g.qix) drawQix(ctx, q);
        for (const s of g.sparx) drawSparx(ctx, s);
        if (g.phase !== 'dying' && g.phase !== 'over' && g.phase !== 'wait') drawMarker(ctx, X0 + p.x * 2, Y0 + p.y * 2, p.drawing ? (p.slow ? '#ff8040' : '#80d0ff') : '#ff3030');
        for (const b of g.booms) { ctx.fillStyle = (b.t & 4) ? '#ffff40' : '#ff4020'; ctx.fillRect(b.x | 0, b.y | 0, 2, 2); }
        for (const pp of g.pops) text(ctx, pp.s, pp.x, pp.y - 10, '#ffffff', 1, 'center');
        drawHUD(ctx);
        if (g.phase === 'ready') { text(ctx, 'LEVEL ' + g.level, W / 2, 110, '#ffff40', 2, 'center'); if (g.split) text(ctx, 'SPLIT THE QIX FOR A BONUS', W / 2, 130, '#ff80ff', 1, 'center'); }
        if (g.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(30, 90, W - 60, 60);
          text(ctx, g.wasSplit ? 'QIX SPLIT!' : 'LEVEL CLEARED', W / 2, 98, '#ffff40', 2, 'center');
          text(ctx, 'CLAIMED ' + g.pct + '%', W / 2, 118, '#ffffff', 1, 'center');
          text(ctx, 'BONUS ' + g.bonus, W / 2, 130, '#80ff80', 1, 'center');
          if (g.wasSplit) text(ctx, 'MULTIPLIER x' + g.mult, W / 2, 140, '#ff80ff', 1, 'center');
        }
        if (g.phase === 'over') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(60, 104, W - 120, 26); text(ctx, 'GAME OVER', W / 2, 110, '#ff4040', 2, 'center'); }
      }
      // attract
      const demoQ = { a: { x: 40, y: 30 }, b: { x: 60, y: 40 }, va: { x: 1.1, y: .7 }, vb: { x: -.8, y: 1 }, hist: [], hue: 0 };
      function renderTitle(ctx) {
        // bouncing demo qix behind the title
        for (const [p, v] of [[demoQ.a, demoQ.va], [demoQ.b, demoQ.vb]]) {
          p.x += v.x; p.y += v.y;
          if (p.x < 0 || p.x > GW - 1) v.x = -v.x; if (p.y < 0 || p.y > GH - 1) v.y = -v.y;
          if (Math.random() < .03) { v.x += (Math.random() - .5) * .6; v.y += (Math.random() - .5) * .6; }
        }
        demoQ.hue = (demoQ.hue + 3) % 360;
        if ((titleT & 1) === 0) { demoQ.hist.unshift({ ax: demoQ.a.x, ay: demoQ.a.y, bx: demoQ.b.x, by: demoQ.b.y, h: demoQ.hue }); if (demoQ.hist.length > 12) demoQ.hist.pop(); }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(X0 - .5, Y0 - .5, (GW - 1) * 2 + 1, (GH - 1) * 2 + 1);
        drawQix(ctx, demoQ);
        // logo
        const lx = W / 2;
        text(ctx, 'QIX', lx + 2, 52, '#400040', 6, 'center');
        text(ctx, 'QIX', lx, 50, hsl(titleT * 2 % 360, 60), 6, 'center');
        const page = Math.floor(titleT / 360) % 2;
        if (page === 0) {
          text(ctx, 'CLAIM 75% OF THE FIELD', lx, 110, '#ffffff', 1, 'center');
          text(ctx, 'SPACE: FAST DRAW', lx, 126, '#40a0ff', 1, 'center');
          text(ctx, 'X: SLOW DRAW - DOUBLE POINTS', lx, 138, '#ff8040', 1, 'center');
          text(ctx, 'AVOID THE QIX, SPARX AND FUSE', lx, 150, '#ff80ff', 1, 'center');
          text(ctx, 'DON\'T STOP WHILE DRAWING!', lx, 162, '#ffff40', 1, 'center');
        } else {
          text(ctx, 'HIGH SCORE', lx, 116, '#ffd040', 1, 'center');
          text(ctx, String(hi), lx, 130, '#ffffff', 2, 'center');
          text(ctx, 'BONUS 1000 PER % OVER 75', lx, 156, '#80ff80', 1, 'center');
          text(ctx, 'EXTRA LIFE EVERY 50000', lx, 168, '#80ff80', 1, 'center');
        }
        const blink = (titleT >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) text(ctx, 'INSERT COIN', lx, 190, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', lx, 190, '#40ffff', 1, 'center');
        text(ctx, credStr(), lx, 206, '#aaaaaa', 1, 'center');
        text(ctx, '\u00a9 1981 TAITO', lx, 220, '#888888', 1, 'center');
      }

      return { update, render, destroy() { } };
    }
  });
})();
