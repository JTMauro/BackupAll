// Heiankyo Alien (Denki Onkyo, 1979) - from-scratch recreation for the MAME32 Game Room.
// A kebiishi guard patrols the grid streets of old Kyoto, digs pits, lets the aliens tumble in and buries them.
(function () {
  'use strict';
  const W = 256, H = 224;
  const P = 28, NX = 9, NY = 7, ORX = 16, ORY = 34;      // street lattice: nodes every 28px
  const SW = 12;                                        // street width
  const HALF = P / 2;                                   // holes sit on a 14px grid along the streets

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

  function sprite(ctx, rows, x, y, pal, flip) {
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r], n = row.length; let c = 0;
      while (c < n) {
        const ch = row[c]; if (ch === '.') { c++; continue; }
        let e = c + 1; while (e < n && row[e] === ch) e++;
        ctx.fillStyle = pal[ch]; ctx.fillRect(flip ? x + n - e : x + c, y + r, e - c, 1); c = e;
      }
    }
  }
  // guard: k black cap, s skin, r robe, w trousers, b sash
  const GUARD = [
    ['....kk......', '...kkkk.....', '..kkkkkk....', '...ssss.....', '...sksk.....', '...ssss.....', '..rrrrrr....', '.rrbbbbrr...', '.srrrrrrs...', '..rrrrrr....', '..ww..ww....', '..kk..kk....'],
    ['....kk......', '...kkkk.....', '..kkkkkk....', '...ssss.....', '...sksk.....', '...ssss.....', '..rrrrrr....', '.rrbbbbrr...', '.srrrrrrs...', '..rrrrrr....', '...wwww.....', '...kk.kk....']];
  const GUARD_SIDE = [
    ['...kk.......', '..kkkk......', '.kkkkkkk....', '..sssss.....', '..sssks.....', '..sssss.....', '..rrrr......', '.rrbbrr.....', '.rrrrrrs....', '..rrrr......', '..w..w......', '.kk..kk.....'],
    ['...kk.......', '..kkkk......', '.kkkkkkk....', '..sssss.....', '..sssks.....', '..sssss.....', '..rrrr......', '.rrbbrr.....', '.rrrrrrs....', '..rrrr......', '...ww.......', '...kk.......']];
  const ALIEN = [
    ['.a......a...', '..a....a....', '...gggg.....', '..gggggg....', '.gwwggwwg...', '.gwkggwkg...', '.gggggggg...', '..gmmmmg....', '.g.gggg.g...', 'g..g..g..g..', '...g..g.....', '..gg..gg....'],
    ['..a....a....', '..a....a....', '...gggg.....', '..gggggg....', '.gwwggwwg...', '.gkwggkwg...', '.gggggggg...', '..gmmmmg....', 'g..gggg..g..', '.g.g..g.g...', '..g....g....', '.gg....gg...']];

  ArcadeRegistry.register({
    id: 'heiankyo', title: 'Heiankyo Alien', year: 1979, maker: 'Denki Onkyo',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk the streets \u00b7 Space: dig a hole ahead \u00b7 X: fill in / bury \u00b7 Enter: start',
    marquee: { bg: '#1a0c00', fg: '#ffd040', accent: '#40ff60' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(5000);
      let state = 'title', T = 0, score = 0, lives = 3, round = 1, nextExtra = 10000, coinFlash = 0, lastCred = api.credits;
      let guard, aliens, holes, fx, timeLeft, timeT, titleT = 0, demo = false, digT = 0;

      const snd = {
        dig() { A.noise(0.06, { vol: 0.14, freq: 900, type: 'bandpass' }); A.tone(160, 0.05, { type: 'triangle', vol: 0.08 }); },
        fill() { A.noise(0.06, { vol: 0.12, freq: 1600, type: 'bandpass' }); A.tone(240, 0.05, { type: 'triangle', vol: 0.08 }); },
        fall() { A.tone(900, 0.35, { type: 'square', vol: 0.12, slideTo: 120 }); },
        struggle() { A.tone(rnd(500, 700), 0.04, { type: 'square', vol: 0.05 }); },
        bury() { A.melody([[523, .06], [659, .06], [784, .06], [1047, .15]], { type: 'square', vol: 0.13 }); },
        escape() { A.tone(200, 0.3, { type: 'sawtooth', vol: 0.12, slideTo: 800 }); },
        die() { A.melody([[440, .12], [415, .12], [392, .12], [370, .12], [349, .3], [262, .4]], { type: 'square', vol: 0.14 }); },
        start() { A.melody([[392, .15], [440, .15], [392, .15], [330, .15], [294, .15], [330, .15], [392, .4]], { type: 'triangle', vol: 0.18 }); },
        clear() { A.melody([[659, .1], [784, .1], [880, .1], [1047, .1], [880, .1], [1047, .3]], { type: 'square', vol: 0.13 }); },
        step() { A.tone(110, 0.02, { type: 'triangle', vol: 0.05 }); },
        extra() { A.melody([[1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.12 }); },
        coin() { A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }); }
      };

      // ---------- lattice helpers ----------
      const nodeX = i => ORX + i * P, nodeY = j => ORY + j * P;
      const MAXX = nodeX(NX - 1), MAXY = nodeY(NY - 1);
      const isNode = a => ((a.x - ORX) % P === 0) && ((a.y - ORY) % P === 0);
      function validDir(x, y, dx, dy) {
        const nx = x + dx * P, ny = y + dy * P;
        return nx >= ORX && nx <= MAXX && ny >= ORY && ny <= MAXY;
      }
      const holeKey = (x, y) => Math.round(x) + ',' + Math.round(y);
      function holeAt(x, y) { return holes.get(holeKey(x, y)); }
      function onStreet(x, y) {
        if (x < ORX || x > MAXX || y < ORY || y > MAXY) return false;
        return ((x - ORX) % P === 0) || ((y - ORY) % P === 0);
      }
      // advance an actor along the lattice; decide(a) is called whenever it stands exactly on a node
      function step(a, sp, decide) {
        let rem = sp, guardN = 0;
        while (rem > 1e-6 && guardN++ < 4) {
          if (!a.dx && !a.dy) { if (isNode(a)) decide(a); if (!a.dx && !a.dy) return; }
          const along = a.dx ? a.x - ORX : a.y - ORY, d = a.dx || a.dy;
          let off = ((along % P) + P) % P; if (Math.abs(off - P) < 1e-6) off = 0;
          const toNode = d > 0 ? (off < 1e-6 ? P : P - off) : (off < 1e-6 ? P : off);
          if (rem < toNode - 1e-6) { a.x += a.dx * rem; a.y += a.dy * rem; return; }
          a.x = Math.round(a.x + a.dx * toNode); a.y = Math.round(a.y + a.dy * toNode); rem -= toNode;
          decide(a);
        }
      }

      // ---------- game flow ----------
      function startGame() {
        score = 0; lives = 3; round = 1; nextExtra = 10000; demo = false;
        snd.start(); setupRound();
      }
      function setupRound() {
        holes = new Map(); fx = [];
        timeLeft = 99; timeT = 0;
        resetActors(true);
        state = 'ready'; T = 0;
      }
      function alienCount() { return Math.min(8, 2 + round); }
      function resetActors(fresh) {
        guard = { x: nodeX(4), y: nodeY(NY - 1), dx: 0, dy: 0, fx: 0, fy: -1, anim: 0 };
        const spots = [[0, 0], [8, 0], [4, 0], [0, 3], [8, 3], [2, 1], [6, 1], [4, 2]];
        if (fresh) aliens = [];
        const live = fresh ? alienCount() : aliens.length;
        for (let i = 0; i < live; i++) {
          const s = spots[i % spots.length];
          const al = fresh ? {} : aliens[i];
          if (!fresh && al.trap) continue; // trapped aliens stay in their holes
          Object.assign(al, { x: nodeX(s[0]), y: nodeY(s[1]), dx: 0, dy: 0, angry: al.angry || false, trap: null, wait: 40 + i * 30, anim: Math.random() * 16 | 0 });
          if (fresh) aliens.push(al);
        }
      }
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += 20000; snd.extra(); }
        if (score > hi) hi = score;
      }

      // ---------- guard ----------
      function heldDir() {
        if (demo) return demoDir();
        if (api.key('ArrowLeft')) return [-1, 0]; if (api.key('ArrowRight')) return [1, 0];
        if (api.key('ArrowUp')) return [0, -1]; if (api.key('ArrowDown')) return [0, 1];
        return null;
      }
      let demoTarget = null;
      function demoDir() {
        // demo: walk to a random node, dig when an alien is lined up and close
        if (!demoTarget || (guard.x === demoTarget[0] && guard.y === demoTarget[1])) demoTarget = [nodeX(Math.random() * NX | 0), nodeY(Math.random() * NY | 0)];
        if (guard.x !== demoTarget[0] && (guard.y - ORY) % P === 0) return [Math.sign(demoTarget[0] - guard.x), 0];
        if (guard.y !== demoTarget[1] && (guard.x - ORX) % P === 0) return [0, Math.sign(demoTarget[1] - guard.y)];
        return [guard.dx || guard.fx, guard.dy || guard.fy];
      }
      function holeBlocks(nx, ny, x, y) {
        for (const h of holes.values()) {
          if (h.depth < 4) continue;
          const dn = Math.abs(h.x - nx) + Math.abs(h.y - ny);
          if (dn < 12 && dn < Math.abs(h.x - x) + Math.abs(h.y - y)) return true;
        }
        return false;
      }
      function updateGuard() {
        const want = heldDir();
        if (!want) { guard.dx = guard.dy = 0; return; }
        const onRow = (guard.y - ORY) % P === 0, onCol = (guard.x - ORX) % P === 0;
        let [wx, wy] = want;
        // decide direction for this frame
        if (onRow && onCol) {
          if (validDir(guard.x, guard.y, wx, wy)) { guard.dx = wx; guard.dy = wy; }
          else if ((guard.dx || guard.dy) && validDir(guard.x, guard.y, guard.dx, guard.dy)) { /* keep going */ }
          else { guard.dx = guard.dy = 0; guard.fx = wx; guard.fy = wy; return; }
        } else if (onRow) { // mid horizontal street
          if (wx) { guard.dx = wx; guard.dy = 0; }
          else { // perpendicular: head for the nearest crossing
            const off = (guard.x - ORX) % P; guard.dx = guard.dx || (off < HALF ? -1 : 1); guard.dy = 0;
          }
        } else if (onCol) {
          if (wy) { guard.dy = wy; guard.dx = 0; }
          else { const off = (guard.y - ORY) % P; guard.dy = guard.dy || (off < HALF ? -1 : 1); guard.dx = 0; }
        }
        guard.fx = guard.dx; guard.fy = guard.dy;
        const sp = 1;
        const nx = guard.x + guard.dx * sp, ny = guard.y + guard.dy * sp;
        if (holeBlocks(nx, ny, guard.x, guard.y)) return;
        const pend = { wx, wy };
        step(guard, sp, g => {
          if (validDir(g.x, g.y, pend.wx, pend.wy)) { g.dx = pend.wx; g.dy = pend.wy; }
          else if (!validDir(g.x, g.y, g.dx, g.dy)) { g.dx = g.dy = 0; }
        });
        guard.anim++;
        if (guard.anim % 12 === 0) snd.step();
      }
      // the spot in front of the guard (14px grid along the current street)
      function frontSpot() {
        let fx = guard.fx, fy = guard.fy;
        if (!fx && !fy) fy = -1;
        const onRow = (guard.y - ORY) % P === 0, onCol = (guard.x - ORX) % P === 0;
        if (fx && !onRow) return null; if (fy && !onCol) return null;
        if (fx) {
          let t = Math.round((guard.x - ORX + fx * HALF) / HALF) * HALF + ORX;
          if (Math.abs(t - guard.x) < 9) t += fx * HALF;
          return onStreet(t, guard.y) ? { x: t, y: guard.y } : null;
        }
        let t = Math.round((guard.y - ORY + fy * HALF) / HALF) * HALF + ORY;
        if (Math.abs(t - guard.y) < 9) t += fy * HALF;
        return onStreet(guard.x, t) ? { x: guard.x, y: t } : null;
      }
      function dig() {
        const s = frontSpot(); if (!s) return;
        for (const al of aliens) if (!al.trap && Math.abs(al.x - s.x) + Math.abs(al.y - s.y) < 10) return;
        let h = holeAt(s.x, s.y);
        if (!h) { h = { x: s.x, y: s.y, depth: 0, alien: null, fill: 0 }; holes.set(holeKey(s.x, s.y), h); }
        if (h.alien || h.depth >= 4) return;
        h.depth++; digT = 10; snd.dig();
      }
      function fill() {
        const s = frontSpot(); if (!s) return;
        const h = holeAt(s.x, s.y); if (!h) return;
        digT = 10; snd.fill();
        if (h.alien) {
          h.fill++;
          if (h.fill >= 4) { // buried!
            const al = h.alien, quick = al.trap.t < 150;
            const pts = (quick ? 1000 : 500) * (al.angry ? 2 : 1);
            addScore(pts); fx.push({ x: h.x, y: h.y - 10, t: 0, pts }); snd.bury();
            aliens.splice(aliens.indexOf(al), 1); holes.delete(holeKey(h.x, h.y));
            if (!aliens.length) { state = 'clear'; T = 0; snd.clear(); }
          }
        } else { h.depth--; if (h.depth <= 0) holes.delete(holeKey(h.x, h.y)); }
      }

      // ---------- aliens ----------
      function alienSpeed(al) { return Math.min(1.1, 0.45 + round * 0.06 + (al.angry ? 0.25 : 0) + (timeLeft < 20 ? 0.15 : 0)); }
      function alienDecide(al) {
        const opts = [];
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!validDir(al.x, al.y, d[0], d[1])) continue;
          if (d[0] === -al.dx && d[1] === -al.dy && (al.dx || al.dy)) continue;
          opts.push(d);
        }
        if (!opts.length) { al.dx = -al.dx; al.dy = -al.dy; return; }
        const chase = Math.min(0.8, 0.3 + round * 0.06 + (al.angry ? 0.25 : 0));
        let pick;
        if (Math.random() < chase) {
          let best = 1e9;
          for (const d of opts) { const dd = Math.abs(al.x + d[0] * P - guard.x) + Math.abs(al.y + d[1] * P - guard.y); if (dd < best) { best = dd; pick = d; } }
        } else pick = opts[Math.random() * opts.length | 0];
        al.dx = pick[0]; al.dy = pick[1];
      }
      function updateAliens() {
        for (const al of aliens) {
          al.anim++;
          if (al.trap) {
            const tr = al.trap; tr.t++;
            if (tr.t % 9 === 0) snd.struggle();
            const limit = Math.max(150, 330 - round * 20);
            if (tr.t >= limit) { // climbs out, wrecking the hole
              holes.delete(holeKey(tr.h.x, tr.h.y)); al.trap = null; al.angry = true; al.dx = al.dy = 0; snd.escape();
              if (!isNode(al)) { const dir = Math.random() < 0.5 ? -1 : 1; if ((al.y - ORY) % P === 0) al.dx = dir; else al.dy = dir; }
              fx.push({ x: al.x, y: al.y, t: 0, dirt: 1 });
            }
            continue;
          }
          if (al.wait > 0) { al.wait--; continue; }
          step(al, alienSpeed(al), alienDecide);
          // fall into finished holes
          for (const h of holes.values()) {
            if (h.depth >= 4 && !h.alien && Math.abs(h.x - al.x) + Math.abs(h.y - al.y) < 2.5) {
              h.alien = al; h.fill = 0; al.trap = { h, t: 0 }; al.x = h.x; al.y = h.y; snd.fall(); break;
            }
          }
        }
      }
      function caught() {
        for (const al of aliens) if (!al.trap && Math.abs(al.x - guard.x) < 9 && Math.abs(al.y - guard.y) < 9) return true;
        return false;
      }

      function updatePlay() {
        T++;
        if (++timeT >= 60) { timeT = 0; timeLeft--; if (timeLeft <= 10 && timeLeft > 0) A.tone(1200, 0.04, { type: 'square', vol: 0.07 }); }
        if (digT > 0) digT--;
        if (demo) {
          if (T % 12 === 0) { const s = frontSpot(); if (s) { const h = holeAt(s.x, s.y); if (h && h.alien) fill(); else if (aliens.some(a => !a.trap && Math.abs(a.x - s.x) + Math.abs(a.y - s.y) < 70)) dig(); } }
        } else {
          if (api.pressed('Space')) dig();
          if (api.pressed('KeyX') || api.pressed('KeyZ')) fill();
        }
        if (digT <= 0 || demo) updateGuard(); else guard.dx = guard.dy = 0;
        updateAliens();
        if (state !== 'play') return;
        if (caught() || timeLeft <= 0) { state = 'dying'; T = 0; snd.die(); }
      }

      function update() {
        if (api.credits > lastCred) snd.coin(); lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (fx) { for (const f of fx) f.t++; fx = fx.filter(f => f.t < 60); }
        switch (state) {
          case 'title':
            titleT++;
            if (titleT === 540) { demo = true; round = 2; setupRound(); state = 'play'; }
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'ready': T++; if (T >= 120) { state = 'play'; T = 0; } break;
          case 'play':
            if (demo) { if (api.anyPressed('Enter', 'Space')) { tryStart(); break; } if (++titleT > 540 + 1500) { toTitle(); break; } }
            updatePlay(); break;
          case 'dying':
            T++;
            if (T === 150) {
              if (demo) { toTitle(); break; }
              const respawn = () => { for (const h of [...holes.values()]) if (!h.alien) holes.delete(holeKey(h.x, h.y)); resetActors(false); timeLeft = Math.max(timeLeft, 60); state = 'ready'; T = 0; };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'clear':
            T++;
            if (T > 40 && T % 3 === 0 && timeLeft > 0) { timeLeft--; addScore(10); A.tone(1500, 0.02, { type: 'square', vol: 0.05 }); }
            if (T > 60 && timeLeft <= 0 && T > 200) { if (demo) { toTitle(); break; } round++; setupRound(); }
            break;
          case 'over': T++; if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) toTitle(); break;
        }
      }
      function tryStart() { if (api.useCredit()) startGame(); else { coinFlash = 90; A.tone(90, 0.25, { type: 'square', vol: 0.15 }); } }
      function toTitle() { state = 'title'; titleT = 0; T = 0; demo = false; round = 1; holes = new Map(); aliens = []; fx = []; resetActors(true); aliens = []; timeLeft = 99; }
      toTitle();

      // ---------- render ----------
      function drawCity(ctx) {
        ctx.fillStyle = '#3a2410'; ctx.fillRect(0, 0, W, H);
        // outer wall
        ctx.fillStyle = '#8a6a40'; ctx.fillRect(ORX - SW / 2 - 4, ORY - SW / 2 - 4, MAXX - ORX + SW + 8, MAXY - ORY + SW + 8);
        // streets
        ctx.fillStyle = '#d8c090'; ctx.fillRect(ORX - SW / 2, ORY - SW / 2, MAXX - ORX + SW, MAXY - ORY + SW);
        // blocks (walled compounds with tiled roofs)
        for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NY - 1; j++) {
          const x = nodeX(i) + SW / 2, y = nodeY(j) + SW / 2, s = P - SW;
          ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x, y, s, s);
          ctx.fillStyle = (i + j) & 1 ? '#3a5a8a' : '#2a6a3a'; ctx.fillRect(x + 2, y + 2, s - 4, s - 5);
          ctx.fillStyle = (i + j) & 1 ? '#5a7aaa' : '#3a8a4a'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 2, y + 3 + k * 4, s - 4, 1);
          ctx.fillStyle = '#802010'; ctx.fillRect(x + s / 2 - 1, y + s - 3, 2, 3);
        }
        // the grand avenue (Suzaku-oji) tint
        ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(nodeX(4) - SW / 2, ORY - SW / 2, SW, MAXY - ORY + SW);
      }
      function drawHole(ctx, h) {
        const r = 1 + h.depth * 1.3;
        ctx.fillStyle = '#7a5a30'; ctx.fillRect(h.x - r - 1, h.y - r * 0.8 - 1, r * 2 + 2, r * 1.6 + 2);
        ctx.fillStyle = h.depth >= 4 ? '#000000' : '#2a1a08';
        ctx.fillRect(h.x - r, h.y - r * 0.8, r * 2, r * 1.6);
        if (h.alien) {
          const al = h.alien, f = al.trap.t;
          const lim = Math.max(150, 330 - round * 20);
          const rise = Math.max(0, (f - lim + 60) / 60) * 4;
          const sink = h.fill;
          // head poking out
          ctx.save(); ctx.beginPath(); ctx.rect(h.x - 8, h.y - 14, 16, 14 + 1); ctx.clip();
          sprite(ctx, ALIEN[(al.anim >> 2) & 1], h.x - 5, h.y - 4 + sink * 2 - rise, { a: '#ffff40', g: al.angry ? '#ff4040' : '#40e040', w: '#ffffff', k: '#000000', m: '#202020' });
          ctx.restore();
          // dirt piling up
          if (sink) { ctx.fillStyle = '#7a5a30'; ctx.fillRect(h.x - 6, h.y - sink, 12, sink + 2); }
          if ((f >> 3) & 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(h.x - 7 + (f & 3), h.y - 8, 1, 1); ctx.fillRect(h.x + 6 - (f & 3), h.y - 9, 1, 1); }
        }
      }
      function drawGuard(ctx) {
        const pal = { k: '#101010', s: '#ffc090', r: '#e02020', w: '#ffffff', b: '#ffd020' };
        const f = (guard.anim >> 3) & 1;
        let x = guard.x - 4, y = guard.y - 9;
        if (state === 'dying') {
          const k = T;
          if (k < 60) sprite(ctx, [GUARD[0], GUARD_SIDE[0], GUARD[1], GUARD_SIDE[0]][(k >> 3) % 4], x, y, pal, ((k >> 3) % 4) === 3);
          else { ctx.fillStyle = pal.r; ctx.fillRect(guard.x - 6, guard.y - 2, 12, 4); ctx.fillStyle = pal.k; ctx.fillRect(guard.x - 9, guard.y - 3, 4, 5); ctx.fillStyle = '#ffff40'; if ((k >> 3) & 1) { ctx.fillRect(guard.x - 4, guard.y - 8, 1, 1); ctx.fillRect(guard.x + 3, guard.y - 9, 1, 1); } }
          return;
        }
        if (guard.fx) sprite(ctx, GUARD_SIDE[f], x - 1, y, pal, guard.fx < 0);
        else sprite(ctx, GUARD[f], x - 1, y, pal);
        // shovel
        if (digT > 0) {
          const s = frontSpot(); ctx.fillStyle = '#c0c0c0';
          if (s) { ctx.fillRect((guard.x + s.x) / 2 - 1, (guard.y + s.y) / 2 - 3 + (digT > 5 ? -2 : 0), 3, 3); ctx.fillStyle = '#a06020'; ctx.fillRect((guard.x * 2 + s.x) / 3, (guard.y * 2 + s.y) / 3 - 5, 2, 2); }
        }
      }
      function drawAlien(ctx, al) {
        const pal = { a: '#ffff40', g: al.angry ? '#ff4040' : '#40e040', w: '#ffffff', k: '#000000', m: '#202020' };
        if (al.wait > 0 && ((al.wait >> 2) & 1)) return;
        sprite(ctx, ALIEN[(al.anim >> 3) & 1], al.x - 5, al.y - 8, pal, al.dx < 0);
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 20); ctx.fillRect(0, H - 12, W, 12);
        txt(ctx, 'SCORE', 8, 2, '#ff6040'); txt(ctx, String(score).padStart(6, '0'), 8, 11, '#ffffff');
        txt(ctx, 'HI-SCORE', 80, 2, '#ff6040'); txt(ctx, String(hi).padStart(6, '0'), 86, 11, '#ffffff');
        txt(ctx, 'ROUND', 154, 2, '#40c0ff'); txt(ctx, String(round), 166, 11, '#ffffff');
        txt(ctx, 'TIME', 210, 2, '#ffd020'); txt(ctx, String(Math.max(0, timeLeft)).padStart(2, '0'), 216, 11, timeLeft < 20 && ((T >> 3) & 1) ? '#ff3030' : '#ffffff');
        if (state !== 'title' && !demo) {
          for (let i = 0; i < Math.min(8, lives - 1); i++) { ctx.fillStyle = '#e02020'; ctx.fillRect(8 + i * 9, H - 8, 6, 5); ctx.fillStyle = '#101010'; ctx.fillRect(9 + i * 9, H - 11, 4, 3); }
          const n = aliens.length; txt(ctx, 'ALIENS ' + n, W - 8, H - 10, '#40e040', 1, 'right');
        }
        if (demo) txt(ctx, 'DEMO', W / 2, H - 10, '#ffff40', 1, 'center');
      }
      function render(ctx) {
        drawCity(ctx);
        for (const h of holes.values()) drawHole(ctx, h);
        if (state !== 'title') {
          for (const al of aliens) if (!al.trap) drawAlien(ctx, al);
          drawGuard(ctx);
        }
        for (const f of fx) {
          if (f.pts) txt(ctx, String(f.pts), f.x, f.y - f.t * 0.3, '#ffff40', 1, 'center');
          else if (f.dirt) { ctx.fillStyle = '#7a5a30'; for (let i = 0; i < 6; i++) ctx.fillRect(f.x + Math.cos(i) * f.t * 0.5, f.y + Math.sin(i) * f.t * 0.5 - 4, 2, 2); }
        }
        drawHUD(ctx);
        if (state === 'ready') { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(72, 96, 112, 30); txt(ctx, 'ROUND ' + round, W / 2, 102, '#ffd020', 1, 'center'); txt(ctx, 'READY', W / 2, 114, '#ffffff', 1, 'center'); }
        if (state === 'clear') { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(56, 96, 144, 30); txt(ctx, 'ALL ALIENS BURIED!', W / 2, 102, '#40ff60', 1, 'center'); txt(ctx, 'TIME BONUS', W / 2, 114, '#ffffff', 1, 'center'); }
        if (state === 'dying' && timeLeft <= 0) txt(ctx, 'TIME UP', W / 2, 100, '#ff3030', 2, 'center');
        if (state === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(70, 98, 116, 24); txt(ctx, 'GAME OVER', W / 2, 103, '#ff3030', 2, 'center'); }
        if (state === 'title') renderTitle(ctx);
        else if (demo && ((api.frame >> 5) & 1)) txt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 140, '#ffffff', 1, 'center');
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(14, 28, 228, 176);
        txt(ctx, 'HEIANKYO', W / 2, 36, ['#ffd020', '#ff8020'][(titleT >> 4) & 1], 3, 'center');
        txt(ctx, 'ALIEN', W / 2, 62, '#40ff60', 3, 'center');
        sprite(ctx, GUARD_SIDE[(titleT >> 3) & 1], 40, 66, { k: '#101010', s: '#ffc090', r: '#e02020', w: '#ffffff', b: '#ffd020' });
        sprite(ctx, ALIEN[(titleT >> 3) & 1], 204, 66, { a: '#ffff40', g: '#40e040', w: '#ffffff', k: '#000000', m: '#202020' }, true);
        txt(ctx, 'THE YEAR IS 794. ALIENS HAVE', W / 2, 92, '#ffffff', 1, 'center');
        txt(ctx, 'LANDED IN THE CAPITAL!', W / 2, 102, '#ffffff', 1, 'center');
        txt(ctx, 'SPACE: DIG A HOLE', W / 2, 118, '#d8c090', 1, 'center');
        txt(ctx, 'LET AN ALIEN FALL IN, THEN', W / 2, 128, '#d8c090', 1, 'center');
        txt(ctx, 'X: FILL IT IN TO BURY IT', W / 2, 138, '#d8c090', 1, 'center');
        txt(ctx, 'BURY 500  QUICK BURY 1000', W / 2, 152, '#ffff40', 1, 'center');
        const blink = (titleT >> 4) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (blink || coinFlash > 0) txt(ctx, 'INSERT COIN', W / 2, 168, '#ff3030', 1, 'center'); }
        else if (blink) txt(ctx, 'PUSH START', W / 2, 168, '#ffffff', 1, 'center');
        txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 180, '#a0a0ff', 1, 'center');
        txt(ctx, '\u00a9 1979 DENKI ONKYO', W / 2, 192, '#808080', 1, 'center');
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, round, score, lives, aliens: aliens.length, trapped: aliens.filter(a => a.trap).length, holes: holes.size, time: timeLeft, g: [guard.x, guard.y] }), god: () => { } });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
