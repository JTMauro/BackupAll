// Space Chaser (Taito, 1979) - from-scratch recreation for the MAME32 Game Room.
// Steer your rocket through the block maze sweeping up every dot while the chaser ships hunt you down.
// Hold the booster to outrun them, but its energy runs out.
(function () {
  'use strict';
  const W = 224, H = 256;
  const P = 32, NN = 7, OX = 16, OY = 38;   // lattice: 7x7 crossings, 32px apart

  // ================= 5x7 bitmap font =================
  const FONT_HEX = {
    '0': '0E11131519110E', '1': '040C040404040E', '2': '0E11010204081F', '3': '1F02040201110E',
    '4': '02060A121F0202', '5': '1F101E0101110E', '6': '0608101E11110E', '7': '1F010204080808',
    '8': '0E11110E11110E', '9': '0E11110F01020C', 'A': '0E11111F111111', 'B': '1E11111E11111E',
    'C': '0E11101010110E', 'D': '1C12111111121C', 'E': '1F10101E10101F', 'F': '1F10101E101010',
    'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E04040404040E', 'J': '0702020202120C',
    'K': '11121418141211', 'L': '1010101010101F', 'M': '111B1515111111', 'N': '11111915131111',
    'O': '0E11111111110E', 'P': '1E11111E101010', 'Q': '0E11111115120D', 'R': '1E11111E141211',
    'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E', 'V': '11111111110A04',
    'W': '1111111515150A', 'X': '11110A040A1111', 'Y': '1111110A040404', 'Z': '1F01020408101F',
    ' ': '00000000000000', '!': '04040404040004', '-': '0000001F000000', '.': '00000000000C0C',
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040000000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '=': '00001F001F0000', '+': '0004041F040400', '*': '0004150E150400'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function txt(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc); }
    }
  }
  // run-length sprite painter: rows of chars, '.' transparent, other chars index the palette
  function spr(ctx, rows, x, y, pal, flip) {
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r], n = row.length; let c = 0;
      while (c < n) {
        const ch = row[c]; if (ch === '.') { c++; continue; }
        let e = c + 1; while (e < n && row[e] === ch) e++;
        ctx.fillStyle = pal[ch];
        ctx.fillRect(flip ? x + n - e : x + c, y + r, e - c, 1);
        c = e;
      }
    }
  }

  function sprite(ctx, rows, x, y, col) {
    x = Math.round(x); y = Math.round(y); ctx.fillStyle = col;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r], n = row.length; let c = 0;
      while (c < n) { if (row[c] === '.') { c++; continue; } let e = c + 1; while (e < n && row[e] !== '.') e++; ctx.fillRect(x + c, y + r, e - c, 1); c = e; }
    }
  }
  function rot(rows) { const n = rows.length, out = []; for (let r = 0; r < n; r++) { let s = ''; for (let c = 0; c < n; c++) s += rows[n - 1 - c][r]; out.push(s); } return out; }
  function rots(rows) { const a = [rows]; for (let i = 1; i < 4; i++) a.push(rot(a[i - 1])); return a; } // up, right, down, left
  const SHIP = rots([
    '...##...',
    '...##...',
    '..####..',
    '..#..#..',
    '.######.',
    '########',
    '##.##.##',
    '#......#']);
  const CHASER = [rots([
    '#......#',
    '##.##.##',
    '.######.',
    '##.##.##',
    '.######.',
    '..####..',
    '...##...',
    '...##...']), rots([
    '.#....#.',
    '.##..##.',
    '.######.',
    '##.##.##',
    '.######.',
    '#.####.#',
    '...##...',
    '...##...'])];
  const BAND = y => y < 28 ? '#ff4040' : y < 100 ? '#ff40ff' : y < 180 ? '#40ffff' : y < 236 ? '#40ff40' : '#ffd040';

  // maze variants: segments removed per stage (h: [i,j] joins node i..i+1 on row j; v: [i,j] joins row j..j+1 on col i)
  const MAZES = [
    { h: [], v: [] },
    { h: [[1, 1], [4, 1], [1, 5], [4, 5]], v: [[3, 0], [3, 5], [0, 3], [6, 2]] },
    { h: [[2, 2], [3, 2], [2, 4], [3, 4], [0, 3], [5, 3]], v: [[1, 1], [5, 1], [1, 4], [5, 4]] },
    { h: [[1, 0], [4, 0], [1, 6], [4, 6], [2, 3], [3, 3]], v: [[2, 1], [4, 1], [2, 4], [4, 4], [3, 2]] }
  ];

  ArcadeRegistry.register({
    id: 'spacechaser', title: 'Space Chaser', year: 1979, maker: 'Taito',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: steer \u00b7 Hold Space or X: booster \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#40ffff', accent: '#ff40ff' },
    create(api) {
      const A = api.audio;
      let hi = api.getHiScore(5000);
      let state = 'title', T = 0, score = 0, lives = 3, stage = 1, nextExtra = 10000, coinFlash = 0, lastCred = api.credits;
      let ship, chasers, dots, dotCount, dotTotal, hseg, vseg, energy, boosting, item, fx, modeT, scatter, titleT = 0, demo = false, wantDir = null, siren = 0;

      const snd = {
        dot() { A.tone(dotToggle ? 880 : 660, 0.03, { type: 'square', vol: 0.05 }); dotToggle = !dotToggle; },
        boost() { A.noise(0.06, { vol: 0.06, freq: 3000, type: 'highpass' }); },
        die() { A.noise(1.0, { vol: 0.25, freq: 2000, slideTo: 60 }); A.tone(800, 0.9, { type: 'sawtooth', vol: 0.1, slideTo: 50 }); },
        clear() { A.melody([[523, .08], [659, .08], [784, .08], [1047, .08], [784, .08], [1047, .08], [1319, .3]], { type: 'square', vol: 0.12 }); },
        start() { A.melody([[330, .1], [392, .1], [494, .1], [659, .2], [494, .1], [659, .3]], { type: 'square', vol: 0.12 }); },
        item() { A.melody([[1568, .05], [2093, .05], [1568, .05], [2093, .1]], { type: 'square', vol: 0.1 }); },
        extra() { A.melody([[1047, .08], [1319, .08], [1568, .2]], { type: 'square', vol: 0.12 }); },
        coin() { A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }); }
      };
      let dotToggle = false, god = false;

      // ---------- lattice ----------
      const nodeX = i => OX + i * P, nodeY = j => OY + j * P;
      const MAXX = nodeX(NN - 1), MAXY = nodeY(NN - 1);
      const isNode = a => ((a.x - OX) % P === 0) && ((a.y - OY) % P === 0);
      function validDir(x, y, dx, dy) {
        const i = (x - OX) / P, j = (y - OY) / P;
        if (dx > 0) return i < NN - 1 && hseg[j][i];
        if (dx < 0) return i > 0 && hseg[j][i - 1];
        if (dy > 0) return j < NN - 1 && vseg[j][i];
        if (dy < 0) return j > 0 && vseg[j - 1][i];
        return false;
      }
      function step(a, sp, decide) {
        let rem = sp, n = 0;
        while (rem > 1e-6 && n++ < 4) {
          if (!a.dx && !a.dy) { if (isNode(a)) decide(a); if (!a.dx && !a.dy) return; }
          // a reversal made while sitting on a crossing can point at a missing lane: re-decide instead of leaving the maze
          else if (isNode(a) && !validDir(a.x, a.y, a.dx, a.dy)) { decide(a); if (!a.dx && !a.dy) return; if (!validDir(a.x, a.y, a.dx, a.dy)) { a.dx = 0; a.dy = 0; return; } }
          const along = a.dx ? a.x - OX : a.y - OY, d = a.dx || a.dy;
          let off = ((along % P) + P) % P; if (Math.abs(off - P) < 1e-6) off = 0;
          const toNode = d > 0 ? (off < 1e-6 ? P : P - off) : (off < 1e-6 ? P : off);
          if (rem < toNode - 1e-6) { a.x += a.dx * rem; a.y += a.dy * rem; return; }
          a.x = Math.round(a.x + a.dx * toNode); a.y = Math.round(a.y + a.dy * toNode); rem -= toNode;
          decide(a);
        }
      }
      function buildMaze() {
        hseg = []; vseg = [];
        for (let j = 0; j < NN; j++) { hseg.push(new Array(NN - 1).fill(true)); vseg.push(new Array(NN).fill(true)); }
        const m = MAZES[(stage - 1) % MAZES.length];
        const deg = (i, j) => (i > 0 && hseg[j][i - 1] ? 1 : 0) + (i < NN - 1 && hseg[j][i] ? 1 : 0) + (j > 0 && vseg[j - 1][i] ? 1 : 0) + (j < NN - 1 && vseg[j][i] ? 1 : 0);
        for (const [i, j] of m.h) { hseg[j][i] = false; if (deg(i, j) < 2 || deg(i + 1, j) < 2) hseg[j][i] = true; }
        for (const [i, j] of m.v) { if (j >= NN - 1) continue; vseg[j][i] = false; if (deg(i, j) < 2 || deg(i, j + 1) < 2) vseg[j][i] = true; }
        dots = new Map(); dotCount = 0;
        const add = (x, y) => { const k = x + ',' + y; if (!dots.has(k)) { dots.set(k, 1); dotCount++; } };
        for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) {
          add(nodeX(i), nodeY(j));
          if (i < NN - 1 && hseg[j][i]) for (let k = 1; k < 4; k++) add(nodeX(i) + k * 8, nodeY(j));
          if (j < NN - 1 && vseg[j][i]) for (let k = 1; k < 4; k++) add(nodeX(i), nodeY(j) + k * 8);
        }
        // the launch pad in the middle of the bottom row stays clear
        dots.delete(nodeX(3) + ',' + nodeY(6)); dotCount--;
        dotTotal = dotCount;
      }

      // ---------- flow ----------
      function startGame() { score = 0; lives = 3; stage = 1; nextExtra = 10000; demo = false; snd.start(); setupStage(); }
      function setupStage() { buildMaze(); resetActors(); item = null; fx = []; state = 'ready'; T = 0; }
      function resetActors() {
        ship = { x: nodeX(3), y: nodeY(6), dx: 0, dy: 0, face: 0, anim: 0 };
        wantDir = null; energy = 100; boosting = false; modeT = 0; scatter = false;
        chasers = [];
        const n = Math.min(5, 1 + stage);
        const starts = [[0, 0], [6, 0], [3, 0], [0, 3], [6, 3]];
        for (let k = 0; k < n; k++) chasers.push({ x: nodeX(starts[k][0]), y: nodeY(starts[k][1]), dx: 0, dy: 0, face: 2, kind: k, wait: k < 2 ? 60 + k * 40 : 99999, anim: 0 });
      }
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += 20000; snd.extra(); }
        if (score > hi) hi = score;
      }
      const dirFace = (dx, dy) => dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : 3;

      // ---------- ship ----------
      function readInput() {
        if (demo) return demoInput();
        if (api.key('ArrowLeft')) return [-1, 0]; if (api.key('ArrowRight')) return [1, 0];
        if (api.key('ArrowUp')) return [0, -1]; if (api.key('ArrowDown')) return [0, 1];
        return null;
      }
      function demoInput() {
        if (!isNode(ship)) return null;
        // greedy: head toward the nearest dot, away from close chasers
        let best = null, bs = -1e9;
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!validDir(ship.x, ship.y, d[0], d[1])) continue;
          let s = Math.random() * 6;
          for (let k = 1; k <= 4; k++) if (dots.has((ship.x + d[0] * k * 8) + ',' + (ship.y + d[1] * k * 8))) s += 10;
          for (const c of chasers) { const dd = Math.hypot(c.x - (ship.x + d[0] * 32), c.y - (ship.y + d[1] * 32)); if (dd < 60) s -= (60 - dd) * 2; }
          if (d[0] === -ship.dx && d[1] === -ship.dy) s -= 4;
          if (s > bs) { bs = s; best = d; }
        }
        return best;
      }
      function updateShip() {
        const inp = readInput();
        if (inp) wantDir = inp;
        // boost
        const wantBoost = demo ? chasers.some(c => Math.hypot(c.x - ship.x, c.y - ship.y) < 40) : api.key('Space') || api.key('KeyX');
        boosting = wantBoost && energy > 0;
        if (boosting) { energy = Math.max(0, energy - 0.9); if (T % 6 === 0) snd.boost(); } else energy = Math.min(100, energy + 0.18);
        const sp = boosting ? 1.8 : 1.0;
        if (wantDir) {
          if (wantDir[0] === -ship.dx && wantDir[1] === -ship.dy && (ship.dx || ship.dy)) { ship.dx = wantDir[0]; ship.dy = wantDir[1]; }
          // already sitting on a crossing (e.g. after reversing onto it): turn now, step() only decides on arrival
          else if ((ship.dx || ship.dy) && isNode(ship) && validDir(ship.x, ship.y, wantDir[0], wantDir[1])) { ship.dx = wantDir[0]; ship.dy = wantDir[1]; }
        }
        step(ship, sp, s => {
          if (wantDir && validDir(s.x, s.y, wantDir[0], wantDir[1])) { s.dx = wantDir[0]; s.dy = wantDir[1]; }
          else if (!validDir(s.x, s.y, s.dx, s.dy)) { s.dx = 0; s.dy = 0; }
        });
        if (ship.dx || ship.dy) { ship.face = dirFace(ship.dx, ship.dy); ship.anim++; }
        // eat
        const kx = OX + Math.round((ship.x - OX) / 8) * 8, ky = OY + Math.round((ship.y - OY) / 8) * 8;
        if (Math.abs(kx - ship.x) < 2.5 && Math.abs(ky - ship.y) < 2.5) {
          const k = kx + ',' + ky;
          if (dots.has(k)) {
            dots.delete(k); dotCount--; addScore(10); snd.dot();
            const eaten = dotTotal - dotCount;
            if (eaten === Math.floor(dotTotal / 3) || eaten === Math.floor(dotTotal * 2 / 3)) for (const c of chasers) if (c.wait > 9000) { c.wait = 30; break; }
            if ((eaten === 80 || eaten === 180) && !item) item = { x: nodeX(3), y: nodeY(3), t: 600, kind: (stage - 1) % 4 };
            if (dotCount <= 0) { state = 'clear'; T = 0; snd.clear(); }
          }
        }
        if (item) {
          if (--item.t <= 0) item = null;
          else if (Math.abs(item.x - ship.x) < 7 && Math.abs(item.y - ship.y) < 7) { const v = [300, 500, 700, 1000][item.kind]; addScore(v); fx.push({ x: item.x, y: item.y, t: 0, pts: v }); snd.item(); energy = 100; item = null; }
        }
      }

      // ---------- chasers ----------
      function chaserTarget(c) {
        if (scatter) { const cs = [[0, 0], [MAXX, 0], [0, MAXY], [MAXX, MAXY], [MAXX / 2, 0]]; const t = cs[c.kind % 5]; return [t[0] + OX, t[1] + OY]; }
        switch (c.kind % 4) {
          case 0: return [ship.x, ship.y];
          case 1: return [ship.x + ship.dx * 64, ship.y + ship.dy * 64];
          case 2: { const a = chasers[0]; return [ship.x * 2 - a.x, ship.y * 2 - a.y]; }
          default: return Math.hypot(c.x - ship.x, c.y - ship.y) > 80 ? [ship.x, ship.y] : [OX, MAXY];
        }
      }
      function chaserDecide(c) {
        const opts = [];
        for (const d of [[0, -1], [-1, 0], [0, 1], [1, 0]]) {
          if (!validDir(c.x, c.y, d[0], d[1])) continue;
          if ((c.dx || c.dy) && d[0] === -c.dx && d[1] === -c.dy) continue;
          opts.push(d);
        }
        if (!opts.length) { c.dx = -c.dx; c.dy = -c.dy; return; }
        const t = chaserTarget(c);
        let best = opts[0], bd = 1e9;
        const rand = Math.random() < Math.max(0.05, 0.3 - stage * 0.04);
        if (rand) best = opts[Math.random() * opts.length | 0];
        else for (const d of opts) { const dd = Math.hypot(c.x + d[0] * P - t[0], c.y + d[1] * P - t[1]); if (dd < bd) { bd = dd; best = d; } }
        c.dx = best[0]; c.dy = best[1];
      }
      function chaserSpeed(c) { return Math.min(1.45, 0.82 + stage * 0.06 + (c.kind === 0 ? 0.05 : 0) + (dotCount < 30 ? 0.12 : 0)); }
      function updateChasers() {
        modeT++;
        const sc = (modeT % 1500) < 300; // a breather every 25s
        if (sc !== scatter) { scatter = sc; for (const c of chasers) if (c.dx || c.dy) { c.dx = -c.dx; c.dy = -c.dy; } }
        for (const c of chasers) {
          if (c.wait > 0) { c.wait--; continue; }
          c.anim++;
          step(c, chaserSpeed(c), chaserDecide);
          if (c.dx || c.dy) c.face = dirFace(c.dx, c.dy);
          if (!god && Math.abs(c.x - ship.x) < 6 && Math.abs(c.y - ship.y) < 6) { state = 'dying'; T = 0; snd.die(); return; }
        }
      }

      function updatePlay() {
        T++;
        updateShip(); if (state !== 'play') return;
        updateChasers();
        if (state === 'play' && T % 24 === 0) { siren = (siren + 1) % 2; A.tone(siren ? 180 + stage * 10 : 150 + stage * 10, 0.12, { type: 'triangle', vol: 0.05 }); }
      }

      function update() {
        if (api.credits > lastCred) snd.coin(); lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (fx) { for (const f of fx) f.t++; fx = fx.filter(f => f.t < 60); }
        switch (state) {
          case 'title':
            titleT++;
            if (titleT === 540) { demo = true; stage = 1 + (Math.random() * 3 | 0); setupStage(); state = 'play'; T = 0; }
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'ready': T++; if (T >= 120) { state = 'play'; T = 0; } break;
          case 'play':
            if (demo) { if (api.anyPressed('Enter', 'Space')) { tryStart(); break; } if (++titleT > 540 + 1800) { toTitle(); break; } }
            updatePlay(); break;
          case 'dying':
            T++;
            if (T === 120) {
              if (demo) { toTitle(); break; }
              const respawn = () => { resetActors(); state = 'ready'; T = 0; };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'clear':
            T++;
            if (T === 90) addScore(500 * stage);
            if (T >= 180) { if (demo) { toTitle(); break; } stage++; setupStage(); }
            break;
          case 'over': T++; if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) toTitle(); break;
        }
      }
      function tryStart() { if (api.useCredit()) startGame(); else { coinFlash = 90; A.tone(90, 0.25, { type: 'square', vol: 0.15 }); } }
      function toTitle() { state = 'title'; titleT = 0; T = 0; demo = false; stage = 1; buildMaze(); resetActors(); fx = []; item = null; }
      toTitle();

      // ---------- render ----------
      function drawMaze(ctx, flash) {
        // blocks fill the space between lanes; lanes are 10px wide
        for (let j = -1; j < NN; j++) for (let i = -1; i < NN; i++) {
          const x0 = i < 0 ? 0 : nodeX(i) + 5, x1 = i >= NN - 1 ? W : nodeX(i + 1) - 5;
          const y0 = j < 0 ? 26 : nodeY(j) + 5, y1 = j >= NN - 1 ? 238 : nodeY(j + 1) - 5;
          if (x1 <= x0 || y1 <= y0) continue;
          drawBlock(ctx, x0, y0, x1 - x0, y1 - y0, flash);
        }
        // removed segments become wall too
        for (let j = 0; j < NN; j++) for (let i = 0; i < NN - 1; i++) if (!hseg[j][i]) drawBlock(ctx, nodeX(i) + 5, nodeY(j) - 5, P - 10, 10, flash);
        for (let j = 0; j < NN - 1; j++) for (let i = 0; i < NN; i++) if (!vseg[j][i]) drawBlock(ctx, nodeX(i) - 5, nodeY(j) + 5, 10, P - 10, flash);
      }
      function drawBlock(ctx, x, y, w, h, flash) {
        const c = flash ? '#ffffff' : BAND(y + h / 2);
        ctx.fillStyle = c; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
        ctx.fillStyle = flash ? '#606060' : 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const flash = state === 'clear' && T < 90 && ((T >> 3) & 1);
        drawMaze(ctx, flash);
        // dots
        for (const k of dots.keys()) { const i = k.indexOf(','); const x = +k.slice(0, i), y = +k.slice(i + 1); ctx.fillStyle = BAND(y); ctx.fillRect(x - 1, y - 1, 2, 2); }
        if (item) { const c = ['#ff4040', '#ffff40', '#40ffff', '#ff40ff'][item.kind]; if (item.t > 120 || ((item.t >> 3) & 1)) { ctx.fillStyle = c; ctx.fillRect(item.x - 3, item.y - 4, 7, 8); ctx.fillStyle = '#000'; ctx.fillRect(item.x - 1, item.y - 2, 3, 4); ctx.fillStyle = c; ctx.fillRect(item.x, item.y - 1, 1, 2); } }
        if (state !== 'title') {
          for (const c of chasers) {
            if (c.wait > 9000) continue;
            if (c.wait > 0 && ((c.wait >> 2) & 1)) continue;
            const col = scatter ? (((modeT >> 3) & 1) ? '#4040ff' : '#ffffff') : ['#ff4040', '#ff40ff', '#ffa040', '#40ff40', '#ffffff'][c.kind];
            sprite(ctx, CHASER[(c.anim >> 3) & 1][c.face], c.x - 4, c.y - 4, col);
          }
          if (state === 'dying') {
            const r = Math.min(T, 40) / 3;
            ctx.fillStyle = ((T >> 2) & 1) ? '#ffffff' : '#ffff40';
            if (T < 70) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.fillRect(ship.x + Math.cos(a) * r - 1, ship.y + Math.sin(a) * r - 1, 2, 2); }
          } else {
            sprite(ctx, SHIP[ship.face], ship.x - 4, ship.y - 4, '#ffffff');
            if (boosting && ((T >> 1) & 1)) { ctx.fillStyle = '#ffd040'; ctx.fillRect(ship.x - ship.dx * 6 - 1, ship.y - ship.dy * 6 - 1, 2, 2); }
          }
        }
        for (const f of fx) txt(ctx, String(f.pts), f.x, f.y - 10 - f.t * 0.3, '#ffffff', 1, 'center');
        // HUD
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 25); ctx.fillRect(0, 239, W, 17);
        txt(ctx, 'SCORE<1>', 8, 2, '#ff4040'); txt(ctx, String(score).padStart(5, '0'), 14, 12, '#ffffff');
        txt(ctx, 'HI-SCORE', 82, 2, '#ff4040'); txt(ctx, String(hi).padStart(5, '0'), 88, 12, '#ffffff');
        txt(ctx, 'STAGE', 160, 2, '#ff4040'); txt(ctx, String(stage), 172, 12, '#ffffff');
        if (state !== 'title' && !demo) {
          for (let i = 0; i < Math.min(5, lives - 1); i++) sprite(ctx, SHIP[0], 6 + i * 11, 244, '#ffd040');
          txt(ctx, 'BOOST', 96, 244, '#40ffff');
          ctx.fillStyle = '#202040'; ctx.fillRect(130, 244, 62, 7);
          ctx.fillStyle = energy < 25 ? '#ff4040' : '#40ffff'; ctx.fillRect(131, 245, Math.round(60 * energy / 100), 5);
        } else txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 8, 244, '#ffd040', 1, 'right');
        if (state === 'ready') { ctx.fillStyle = '#000'; ctx.fillRect(nodeX(2) + 6, nodeY(3) - 5, P * 2 - 12, 10); txt(ctx, 'READY', W / 2, nodeY(3) - 3, '#ffff40', 1, 'center'); }
        if (state === 'clear' && T >= 90) { ctx.fillStyle = '#000'; ctx.fillRect(nodeX(1) + 6, nodeY(3) - 5, P * 4 - 12, 10); txt(ctx, 'BONUS ' + 500 * stage, W / 2, nodeY(3) - 3, '#40ff40', 1, 'center'); }
        if (state === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(50, nodeY(3) - 12, 124, 24); txt(ctx, 'GAME OVER', W / 2, nodeY(3) - 7, '#ff4040', 2, 'center'); }
        if (state === 'title') renderTitle(ctx);
        else if (demo) { ctx.fillStyle = '#000'; ctx.fillRect(nodeX(1) + 6, nodeY(4) - 5, P * 4 - 12, 10); if ((api.frame >> 5) & 1) txt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, nodeY(4) - 3, '#ffffff', 1, 'center'); else txt(ctx, 'GAME OVER', W / 2, nodeY(4) - 3, '#ff4040', 1, 'center'); }
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(12, 40, 200, 186);
        txt(ctx, 'SPACE', W / 2, 50, '#40ffff', 3, 'center');
        txt(ctx, 'CHASER', W / 2, 76, '#ff40ff', 3, 'center');
        sprite(ctx, SHIP[1], 50, 110, '#ffffff'); txt(ctx, 'YOUR ROCKET', 66, 110, '#ffffff');
        sprite(ctx, CHASER[(titleT >> 3) & 1][3], 50, 126, '#ff4040'); txt(ctx, 'CHASER SHIPS', 66, 126, '#ff4040');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(53, 145, 2, 2); txt(ctx, 'DOT     10 PTS', 66, 142, '#40ff40');
        txt(ctx, 'CLEAR BONUS 500XSTAGE', W / 2, 160, '#ffff40', 1, 'center');
        txt(ctx, 'HOLD SPACE TO BOOST', W / 2, 172, '#40ffff', 1, 'center');
        const blink = (titleT >> 4) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (blink || coinFlash > 0) txt(ctx, 'INSERT COIN', W / 2, 192, '#ff4040', 1, 'center'); }
        else if (blink) txt(ctx, 'PUSH START', W / 2, 192, '#ffffff', 1, 'center');
        txt(ctx, '\u00a9 1979 TAITO', W / 2, 210, '#808080', 1, 'center');
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, stage, score, lives, dots: dotCount, ch: chasers.length, ship: [ship.x, ship.y] }), st: () => ({ state, stage, T, ship, chasers, dots, dotCount, hseg, vseg, energy, scatter, lives }), god: v => { god = v !== false; } });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
