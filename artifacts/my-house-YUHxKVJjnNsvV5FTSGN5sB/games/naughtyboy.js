// Naughty Boy (Jaleco, 1982) - from-scratch recreation for the MAME32 Game Room.
// The naughty boy crosses the meadow, pelts the monsters with stones and knocks their castle down brick by brick.
(function () {
  'use strict';
  const W = 256, H = 224, FT = 26, FB = 212, FL = 4, FR = 252;

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

  // ================= sprites =================
  const BOY = [ // 3 frames walking (side view facing right); palette h hair, s skin, e eye, c shirt, p pants, b shoes
    ['...hhhh..', '..hhhhhh.', '..hsssse.', '..hssss..', '...ss....', '..cccc...', '.ccccccs.', '.sccccc..', '..pppp...', '..p..p...', '.bb..bb..'],
    ['...hhhh..', '..hhhhhh.', '..hsssse.', '..hssss..', '...ss....', '..cccc...', '..ccccs..', '..scccc..', '..pppp...', '...pp....', '...bb....'],
    ['...hhhh..', '..hhhhhh.', '..hsssse.', '..hssss..', '...ss....', '..cccc...', '.sccccc..', '..cccccs.', '..pppp...', '.p....p..', 'bb....bb.']];
  const BOY_UP = [
    ['..hhhhh..', '.hhhhhhh.', '.hhhhhhh.', '.hhhhhhh.', '...sss...', '.ccccccc.', 's.ccccc.s', '..ccccc..', '..pp.pp..', '..p...p..', '.bb...bb.'],
    ['..hhhhh..', '.hhhhhhh.', '.hhhhhhh.', '.hhhhhhh.', '...sss...', '.ccccccc.', 's.ccccc.s', '..ccccc..', '..ppppp..', '..p..p...', '..bb.bb..']];
  const BOY_DN = [
    ['..hhhhh..', '.hhhhhhh.', '.hsssssh.', '.hes.seh.', '..sssss..', '.ccccccc.', 's.ccccc.s', '..ccccc..', '..pp.pp..', '..p...p..', '.bb...bb.'],
    ['..hhhhh..', '.hhhhhhh.', '.hsssssh.', '.hes.seh.', '..sssss..', '.ccccccc.', 's.ccccc.s', '..ccccc..', '..ppppp..', '...p..p..', '..bb.bb..']];
  const BOY_PAL = { h: '#603010', s: '#ffc090', e: '#000000', c: '#ff3030', p: '#3050ff', b: '#a05020' };
  const ONI = [
    ['.a......a.', '.aa....aa.', '..bbbbbb..', '.bbbbbbbb.', '.bwkbbwkb.', '.bbbbbbbb.', '.bbwwwwbb.', '..bbbbbb..', 'bbbbbbbbbb', 'b.bbbbbb.b', '..bb..bb..', '.bbb..bbb.'],
    ['.a......a.', '.aa....aa.', '..bbbbbb..', '.bbbbbbbb.', '.bkwbbkwb.', '.bbbbbbbb.', '.bbwwwwbb.', '..bbbbbb..', '.bbbbbbbb.', 'b.bbbbbb.b', '...bbbb...', '..bb..bb..']];
  const TREE = [
    '....gggg....', '..gggGgggg..', '.ggGgggggGg.', 'gggggGgggggg', 'gGgggggggGgg', 'ggggGggggggg', '.gggggggGgg.', '..gggggggg..', '....tttt....', '....tttt....', '...tttttt...'];
  const BIRD = [['a......a', 'aa....aa', '.abbbba.', '..bbbb..', '...cc...'], ['........', '........', 'aabbbbaa', 'a.bbbb.a', '...cc...']];
  const CLUB = ['.aa.', 'aaaa', '.aa.', '.bb.', '.bb.'];

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

  ArcadeRegistry.register({
    id: 'naughtyboy', title: 'Naughty Boy', year: 1982, maker: 'Jaleco',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk (8 ways) \u00b7 Space or X: throw a stone the way you face \u00b7 Enter: start',
    marquee: { bg: '#0a3a10', fg: '#ffe040', accent: '#ff3030' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 3, stage = 1, nextExtra = 20000, coinFlash = 0, lastCred = api.credits;
      let boy, rocks, monsters, clubs, trees, castle, fx, timeLeft, timeT, spawnT, item, hurry, killCount, demo = false, titleT = 0;

      const snd = {
        throw() { A.tone(700, 0.08, { type: 'triangle', vol: 0.12, slideTo: 1100 }); },
        hit() { A.tone(180, 0.1, { type: 'square', vol: 0.16, slideTo: 60 }); A.noise(0.08, { vol: 0.1, freq: 3000 }); },
        brick() { A.noise(0.12, { vol: 0.16, freq: 1200, slideTo: 300 }); },
        thud() { A.tone(110, 0.05, { type: 'triangle', vol: 0.1 }); },
        stun() { A.tone(900, 0.12, { type: 'square', vol: 0.1, slideTo: 450 }); },
        die() { A.melody([[784, .1], [659, .1], [523, .1], [392, .1], [330, .1], [262, .3]], { type: 'square', vol: 0.14 }); },
        clear() { A.melody([[523, .1], [523, .1], [659, .1], [784, .2], [659, .1], [784, .1], [1047, .4]], { type: 'square', vol: 0.14 }); },
        start() { A.melody([[392, .12], [392, .12], [523, .12], [523, .12], [659, .12], [587, .12], [523, .3]], { type: 'square', vol: 0.13 }); },
        collapse() { A.noise(1.2, { vol: 0.25, freq: 800, slideTo: 60 }); },
        item() { A.melody([[1047, .05], [1319, .05], [1568, .1]], { type: 'square', vol: 0.12 }); },
        spawn() { A.tone(140, 0.2, { type: 'sawtooth', vol: 0.08, slideTo: 220 }); },
        hurry() { A.melody([[880, .08], [0, .04], [880, .08], [0, .04], [880, .08]], { type: 'square', vol: 0.12 }); },
        extra() { A.melody([[1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.12 }); },
        coin() { A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }); }
      };
      let stepT = 0;

      // ---------- castle ----------
      function buildCastle(st) {
        const cols = Math.min(11, 7 + ((st - 1) >> 1) * 2), rows = Math.min(7, 4 + ((st - 1) >> 1));
        const bw = 8, bh = 7;
        const x = FR - 10 - cols * bw, y = FT + 18;
        const bricks = [];
        const gateC = cols >> 1;
        for (let r = 0; r < rows; r++) {
          bricks.push([]);
          for (let c = 0; c < cols; c++) {
            const gate = (c === gateC) && r >= rows - 2;
            const hp = r === 0 && st >= 3 ? 2 : 1;
            bricks[r].push(gate ? -1 : hp);
          }
        }
        let total = 0; for (const row of bricks) for (const v of row) if (v > 0) total++;
        return { x, y, cols, rows, bw, bh, bricks, gateC, total, left: total, falling: 0, flagY: 0, repairT: 0 };
      }
      function brickAt(px, py) {
        const c = castle; if (c.falling) return null;
        const cc = Math.floor((px - c.x) / c.bw), rr = Math.floor((py - c.y) / c.bh);
        if (cc < 0 || rr < 0 || cc >= c.cols || rr >= c.rows) return null;
        return c.bricks[rr][cc] > 0 ? { r: rr, c: cc } : null;
      }
      const gatePos = () => ({ x: castle.x + castle.gateC * castle.bw + castle.bw / 2, y: castle.y + castle.rows * castle.bh + 6 });

      // ---------- field ----------
      function buildTrees(st) {
        const list = [];
        const n = 9 + Math.min(8, st * 2);
        let guard = 0;
        while (list.length < n && guard++ < 600) {
          const x = rnd(FL + 14, FR - 14), y = rnd(FT + 18, FB - 14);
          if (x < 50 && y > FB - 50) continue; // start area
          if (x > castle.x - 22 && y < castle.y + castle.rows * castle.bh + 30) continue;
          let ok = true; for (const t of list) if (Math.hypot(t.x - x, t.y - y) < 34) { ok = false; break; }
          if (ok) list.push({ x, y, bush: Math.random() < 0.3 });
        }
        return list;
      }
      function blocked(x, y, r, ignoreCastle) {
        if (x < FL + r || x > FR - r || y < FT + r || y > FB - 2) return true;
        for (const t of trees) { const dx = x - t.x, dy = y - t.y; if (dx * dx + dy * dy < (r + 5) * (r + 5)) return true; }
        if (!ignoreCastle) for (let k = -1; k <= 1; k++) if (brickAt(x + k * r, y) || brickAt(x + k * r, y - r)) return true;
        return false;
      }

      // ---------- game flow ----------
      function startGame() {
        score = 0; lives = 3; stage = 1; nextExtra = 20000; demo = false;
        snd.start(); setupStage(true);
      }
      function setupStage(fresh) {
        castle = buildCastle(stage); trees = buildTrees(stage);
        timeLeft = 99; timeT = 0; hurry = false; killCount = 0;
        resetActors(); state = 'ready'; T = 0; item = null;
      }
      function resetActors() {
        boy = { x: 22, y: FB - 16, dx: 1, dy: 0, face: 'r', anim: 0, cool: 0 };
        rocks = []; monsters = []; clubs = []; fx = []; spawnT = 90;
      }
      function addScore(n) {
        if (demo) return;
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += 30000; snd.extra(); }
        if (score > hi) hi = score;
      }
      function pop(x, y, n) { fx.push({ x, y, t: 0, pts: n }); }

      function spawnMonster() {
        const g = gatePos();
        const r = Math.random(); let kind = 'red';
        if (stage >= 2 && r < 0.25) kind = 'blue';
        if (stage >= 2 && r > 0.8) kind = 'green';
        if (stage >= 3 && r > 0.6 && r < 0.72) kind = 'bird';
        if (kind === 'bird') { monsters.push({ kind, x: FR + 8, y: rnd(FT + 20, FB - 30), vx: -(0.9 + stage * 0.1), vy: 0, hp: 1, stun: 0, ph: 0, anim: 0, pts: 500 }); return; }
        monsters.push({ kind, x: g.x, y: g.y - 6, dx: 0, dy: 1, hp: kind === 'blue' ? 2 : 1, stun: 0, think: 20, anim: 0, emerge: 24, throwT: rnd(90, 200), pts: kind === 'blue' ? 200 : kind === 'green' ? 300 : 100 });
        snd.spawn();
      }
      function monSpeed(m) {
        let s = (m.kind === 'blue' ? 0.45 : 0.6) + Math.min(0.5, (stage - 1) * 0.07);
        if (hurry) s *= 1.45;
        return s;
      }

      function throwRock() {
        if (boy.cool > 0 || rocks.length >= 2) return;
        let dx = boy.dx, dy = boy.dy; const d = Math.hypot(dx, dy) || 1;
        rocks.push({ x: boy.x, y: boy.y - 4, vx: dx / d * 2.6, vy: dy / d * 2.6, t: 0, dur: 30, h: 0 });
        boy.cool = 14; snd.throw();
      }

      function updateBoy() {
        let mx = 0, my = 0;
        if (demo) {
          // attract demo: wander toward the castle and throw
          const tx = castle.x - 20, ty = castle.y + 20;
          mx = Math.sign(tx - boy.x) * (Math.abs(tx - boy.x) > 4 ? 1 : 0); my = Math.sign(ty - boy.y) * (Math.abs(ty - boy.y) > 4 ? 1 : 0);
          if ((T >> 6) & 1) my = -my;
          for (const m of monsters) if (Math.hypot(m.x - boy.x, m.y - boy.y) < 60) { mx = Math.sign(m.x - boy.x); my = Math.sign(m.y - boy.y) * (Math.abs(m.y - boy.y) > 6 ? 1 : 0); if (T % 10 === 0) { boy.dx = mx; boy.dy = my; throwRock(); } mx = -mx; my = -my; }
          if (T % 25 === 0 && Math.abs(boy.x - tx) < 40) { boy.dx = 1; boy.dy = 0; throwRock(); }
        } else {
          if (api.key('ArrowLeft')) mx = -1; else if (api.key('ArrowRight')) mx = 1;
          if (api.key('ArrowUp')) my = -1; else if (api.key('ArrowDown')) my = 1;
        }
        if (boy.cool > 0) boy.cool--;
        if (mx || my) {
          boy.dx = mx; boy.dy = my;
          boy.face = mx > 0 ? 'r' : mx < 0 ? 'l' : my < 0 ? 'u' : 'd';
          const sp = mx && my ? 0.85 : 1.2;
          const nx = boy.x + mx * sp, ny = boy.y + my * sp;
          if (!blocked(nx, boy.y, 4)) boy.x = nx;
          if (!blocked(boy.x, ny, 4)) boy.y = ny;
          boy.anim++;
          if (++stepT >= 10) { stepT = 0; A.tone(boy.anim & 16 ? 220 : 260, 0.03, { type: 'triangle', vol: 0.05 }); }
        }
        if (!demo && api.anyPressed('Space', 'KeyX')) throwRock();
      }

      function updateRocks() {
        for (const k of rocks) {
          k.t++; k.x += k.vx; k.y += k.vy; k.h = Math.sin(Math.PI * k.t / k.dur) * 14;
          // trees stop low stones
          for (const t of trees) if (!t.bush && k.h < 12 && Math.hypot(k.x - t.x, k.y - t.y) < 7) { k.dead = true; snd.thud(); fx.push({ x: k.x, y: k.y - k.h, t: 0, dust: 1 }); break; }
          if (k.dead) continue;
          // castle
          const b = brickAt(k.x, k.y - k.h * 0.5) || brickAt(k.x, k.y);
          if (b) { hitBrick(b); k.dead = true; continue; }
          // monsters
          for (const m of monsters) {
            if (m.dead || m.emerge > 0) continue;
            if (Math.abs(m.x - k.x) < 7 && Math.abs((m.y - 6) - (k.y - k.h)) < 9) {
              k.dead = true;
              if (m.stun > 0 && m.kind !== 'bird') { killMonster(m); break; }
              if (--m.hp <= 0) killMonster(m); else { m.stun = 90; snd.stun(); }
              break;
            }
          }
          if (k.t >= k.dur || k.x < FL || k.x > FR || k.y < FT || k.y > FB + 4) { if (!k.dead) { k.dead = true; fx.push({ x: k.x, y: k.y, t: 0, dust: 1 }); snd.thud(); } }
        }
        rocks = rocks.filter(k => !k.dead);
      }
      function hitBrick(b) {
        const c = castle;
        c.bricks[b.r][b.c]--;
        snd.brick();
        const bx = c.x + b.c * c.bw + 4, by = c.y + b.r * c.bh + 3;
        fx.push({ x: bx, y: by, t: 0, chips: 1 });
        if (c.bricks[b.r][b.c] <= 0) {
          c.left--; addScore(50); pop(bx, by - 6, 50);
          if (c.left <= Math.floor(c.total * 0.25)) castleFalls();
        } else addScore(10);
      }
      function castleFalls() {
        castle.falling = 1; snd.collapse(); state = 'clear'; T = 0;
        for (const m of monsters) if (!m.dead) { m.dead = true; addScore(m.pts); pop(m.x, m.y - 12, m.pts); fx.push({ x: m.x, y: m.y - 6, t: 0, puff: 1 }); }
        monsters = monsters.filter(m => !m.dead); clubs = []; rocks = [];
      }
      function killMonster(m) {
        m.dead = true; killCount++;
        const pts = m.stun > 0 ? m.pts * 2 : m.pts;
        addScore(pts); pop(m.x, m.y - 14, pts); snd.hit();
        fx.push({ x: m.x, y: m.y - 6, t: 0, puff: 1 });
        if (killCount % 8 === 0 && !item) item = { x: rnd(40, castle.x - 30), y: rnd(FT + 40, FB - 20), t: 600, kind: (stage + killCount / 8) % 3 | 0 };
      }

      function updateMonsters() {
        const maxM = Math.min(9, 3 + stage);
        if (--spawnT <= 0) {
          spawnT = Math.max(50, (hurry ? 100 : 170) - stage * 12) + rnd(0, 60);
          if (monsters.length < maxM && !castle.falling) spawnMonster();
        }
        for (const m of monsters) {
          m.anim++;
          if (m.kind === 'bird') {
            m.ph += 0.05; m.x += m.vx; m.y += Math.sin(m.ph) * 0.8 + Math.sign(boy.y - m.y) * 0.25;
            if (m.x < FL - 10) m.dead = true;
            continue;
          }
          if (m.stun > 0) { m.stun--; if (m.stun === 0 && m.hp <= 0) m.hp = 1; continue; }
          if (m.emerge > 0) { m.emerge--; m.y += 0.5; continue; }
          const sp = monSpeed(m);
          if (--m.think <= 0) {
            m.think = 20 + (Math.random() * 40 | 0);
            const chase = Math.min(0.85, 0.35 + stage * 0.08 + (hurry ? 0.2 : 0));
            if (Math.random() < chase) { m.dx = Math.sign(boy.x - m.x) * (Math.abs(boy.x - m.x) > 4 ? 1 : 0); m.dy = Math.sign(boy.y - m.y) * (Math.abs(boy.y - m.y) > 4 ? 1 : 0); }
            else { m.dx = (Math.random() * 3 | 0) - 1; m.dy = (Math.random() * 3 | 0) - 1; }
            if (!m.dx && !m.dy) m.dy = 1;
          }
          const d = m.dx && m.dy ? 0.72 : 1;
          const nx = m.x + m.dx * sp * d, ny = m.y + m.dy * sp * d;
          let moved = false;
          if (!blocked(nx, m.y, 4)) { m.x = nx; moved = true; }
          if (!blocked(m.x, ny, 4)) { m.y = ny; moved = true; }
          if (!moved) { m.think = 0; m.dx = (Math.random() * 3 | 0) - 1; m.dy = (Math.random() * 3 | 0) - 1; }
          // green ogres hurl clubs when lined up
          if (m.kind === 'green' && --m.throwT <= 0) {
            m.throwT = Math.max(70, 200 - stage * 15) + rnd(0, 60);
            const ax = boy.x - m.x, ay = boy.y - m.y, dd = Math.hypot(ax, ay) || 1;
            if (dd < 140) { clubs.push({ x: m.x, y: m.y - 6, vx: ax / dd * 1.6, vy: ay / dd * 1.6, t: 0 }); A.tone(300, 0.08, { type: 'sawtooth', vol: 0.08 }); }
          }
          // monsters near the castle patch it up (stage 2+)
          if (stage >= 2 && Math.abs(m.x - (castle.x + castle.cols * 4)) < castle.cols * 4 + 10 && m.y < castle.y + castle.rows * castle.bh + 20) {
            if (++castle.repairT > Math.max(120, 300 - stage * 20)) {
              castle.repairT = 0;
              for (let r = castle.rows - 1; r >= 0; r--) { let done = false; for (let c = 0; c < castle.cols; c++) if (castle.bricks[r][c] === 0) { castle.bricks[r][c] = 1; castle.left++; done = true; A.tone(500, 0.06, { type: 'square', vol: 0.06 }); break; } if (done) break; }
            }
          }
        }
        for (const c of clubs) { c.t++; c.x += c.vx; c.y += c.vy; if (c.t > 120 || blocked(c.x, c.y, 1, false)) c.dead = true; }
        clubs = clubs.filter(c => !c.dead);
        monsters = monsters.filter(m => !m.dead);
      }

      function checkBoy() {
        if (demo && state === 'play') { /* demo boy can die too */ }
        for (const m of monsters) {
          if (m.stun > 0 || m.emerge > 6) continue;
          if (Math.abs(m.x - boy.x) < 7 && Math.abs(m.y - boy.y) < 8) return true;
        }
        for (const c of clubs) if (Math.abs(c.x - boy.x) < 5 && Math.abs(c.y - (boy.y - 6)) < 7) return true;
        return false;
      }

      function updatePlay() {
        T++;
        if (++timeT >= 60) {
          timeT = 0;
          if (timeLeft > 0) { timeLeft--; if (timeLeft === 0) { hurry = true; snd.hurry(); } else if (timeLeft <= 10) A.tone(1000, 0.04, { type: 'square', vol: 0.06 }); }
        }
        updateBoy(); updateRocks(); if (state !== 'play') return;
        updateMonsters();
        if (item) {
          item.t--; if (item.t <= 0) item = null;
          else if (Math.abs(item.x - boy.x) < 8 && Math.abs(item.y - boy.y) < 9) { const v = [500, 1000, 2000][item.kind]; addScore(v); pop(item.x, item.y - 12, v); snd.item(); item = null; }
        }
        if (checkBoy()) { state = 'dying'; T = 0; snd.die(); }
      }

      function update() {
        if (api.credits > lastCred) snd.coin(); lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (fx) { for (const f of fx) f.t++; fx = fx.filter(f => f.t < (f.pts ? 50 : 24)); }
        switch (state) {
          case 'title':
            titleT++;
            if (titleT === 600) { demo = true; stage = 1 + (Math.random() * 3 | 0); castle = buildCastle(stage); trees = buildTrees(stage); resetActors(); timeLeft = 99; hurry = false; killCount = 0; state = 'play'; T = 0; item = null; }
            if (api.anyPressed('Enter', 'Space')) tryStart();
            break;
          case 'ready':
            T++; if (T >= 120) { state = 'play'; T = 0; }
            break;
          case 'play':
            if (demo) { if (api.anyPressed('Enter', 'Space')) { tryStart(); break; } if (++titleT > 600 + 1500) { toTitle(); break; } }
            updatePlay();
            break;
          case 'dying':
            T++;
            if (T === 130) {
              if (demo) { toTitle(); break; }
              const respawn = () => { resetActors(); state = 'ready'; T = 0; };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'clear':
            T++;
            castle.falling = T;
            if (T === 60) snd.clear();
            if (T >= 60 && T < 160 && T % 4 === 0 && timeLeft > 0) { timeLeft--; addScore(10); A.tone(1200, 0.02, { type: 'square', vol: 0.05 }); }
            if (T >= 220 || (T >= 160 && timeLeft <= 0 && T >= 200)) {
              if (demo) { toTitle(); break; }
              addScore(timeLeft * 10); timeLeft = 0;
              stage++; setupStage(false);
            }
            break;
          case 'over':
            T++; if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) toTitle();
            break;
        }
      }
      function tryStart() {
        if (api.useCredit()) startGame(); else { coinFlash = 90; A.tone(90, 0.25, { type: 'square', vol: 0.15 }); }
      }
      function toTitle() {
        state = 'title'; titleT = 0; T = 0; demo = false; stage = 1;
        castle = buildCastle(1); trees = buildTrees(1); resetActors();
      }
      toTitle();

      // ---------- render ----------
      function drawField(ctx) {
        ctx.fillStyle = '#1c7a1c'; ctx.fillRect(0, FT - 2, W, FB - FT + 6);
        ctx.fillStyle = '#26902a';
        for (let i = 0; i < 70; i++) { const x = (i * 97) % 248 + 4, y = FT + (i * 53) % (FB - FT); ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + 1, y - 1, 1, 1); }
        ctx.fillStyle = '#e0d070'; ctx.fillRect(0, FT - 2, W, 2); ctx.fillRect(0, FB + 2, W, 2);
      }
      function drawCastle(ctx) {
        const c = castle;
        const fallOff = c.falling ? Math.min(60, c.falling) : 0;
        // flag
        const fx0 = c.x + (c.cols >> 1) * c.bw + 3, topY = c.y - 2;
        const poleH = 16, flagDrop = c.falling ? Math.min(poleH, c.falling / 2) : 0;
        ctx.fillStyle = '#e0e0e0'; ctx.fillRect(fx0, topY - poleH + fallOff, 1, poleH);
        const wave = (T >> 3) & 1;
        ctx.fillStyle = '#ff2020';
        ctx.fillRect(fx0 + 1, topY - poleH + flagDrop + fallOff, 7, 4); ctx.fillRect(fx0 + 1, topY - poleH + 4 + flagDrop + fallOff, wave ? 5 : 7, 1);
        for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++) {
          const v = c.bricks[r][col];
          let x = c.x + col * c.bw, y = c.y + r * c.bh;
          if (v === -1) { if (!c.falling) { ctx.fillStyle = '#100808'; ctx.fillRect(x, y, c.bw, c.bh); if (r === c.rows - 2) { ctx.fillStyle = '#6a5a4a'; ctx.fillRect(x, y, c.bw, 2); } } continue; }
          if (v <= 0) continue;
          if (c.falling) { y += Math.min(80, c.falling * c.falling * 0.004 * (1 + ((col * 7 + r * 3) % 5) * 0.4)); if (y > FB) continue; }
          ctx.fillStyle = v >= 2 ? '#8a8aa0' : '#b0a090'; ctx.fillRect(x, y, c.bw, c.bh);
          ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x, y + c.bh - 1, c.bw, 1); ctx.fillRect(x + ((r & 1) ? 0 : 4), y, 1, c.bh - 1);
          if (r === 0 && (col & 1) === 0) { ctx.fillStyle = v >= 2 ? '#8a8aa0' : '#b0a090'; ctx.fillRect(x + 1, y - 3, 6, 3); }
        }
        if (c.falling && c.falling < 40) { ctx.fillStyle = 'rgba(200,180,140,0.5)'; ctx.fillRect(c.x - 8, c.y + c.rows * c.bh - 10, c.cols * c.bw + 16, 14); }
      }
      function drawTree(ctx, t) {
        if (t.bush) {
          ctx.fillStyle = '#0e5a12'; ctx.fillRect(t.x - 6, t.y - 4, 12, 6); ctx.fillRect(t.x - 4, t.y - 6, 8, 2);
          ctx.fillStyle = '#ff60a0'; ctx.fillRect(t.x - 3, t.y - 4, 1, 1); ctx.fillRect(t.x + 2, t.y - 2, 1, 1);
          return;
        }
        sprite(ctx, TREE, t.x - 6, t.y - 10, { g: '#0e5a12', G: '#30a030', t: '#704020' });
      }
      function drawBoy(ctx) {
        const f = (boy.anim >> 3) % 2;
        let rows, flip = false;
        if (boy.face === 'u') rows = BOY_UP[f]; else if (boy.face === 'd') rows = BOY_DN[f];
        else { rows = BOY[boy.anim ? ((boy.anim >> 3) % 3) : 0]; flip = boy.face === 'l'; }
        if (state === 'dying') {
          const k = Math.min(40, T);
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(boy.x - 4, boy.y - 1, 9, 2);
          rows = [BOY_UP[0], BOY[0], BOY_DN[0], BOY[0]][(T >> 3) % 4]; flip = ((T >> 3) % 4) === 3;
          if (T > 60) { // lying down
            ctx.fillStyle = BOY_PAL.c; ctx.fillRect(boy.x - 5, boy.y - 4, 10, 4);
            ctx.fillStyle = BOY_PAL.h; ctx.fillRect(boy.x - 9, boy.y - 5, 4, 5);
            ctx.fillStyle = BOY_PAL.p; ctx.fillRect(boy.x + 5, boy.y - 4, 4, 3);
            if ((T >> 3) & 1) { ctx.fillStyle = '#ffff40'; ctx.fillRect(boy.x - 8, boy.y - 10, 1, 1); ctx.fillRect(boy.x - 4, boy.y - 11, 1, 1); ctx.fillRect(boy.x, boy.y - 10, 1, 1); }
            return;
          }
          sprite(ctx, rows, boy.x - 4, boy.y - 11 - Math.sin(k / 40 * Math.PI) * 6, BOY_PAL, flip);
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(boy.x - 4, boy.y - 1, 9, 2);
        sprite(ctx, rows, boy.x - 4, boy.y - 11, BOY_PAL, flip);
      }
      function drawMonster(ctx, m) {
        if (m.kind === 'bird') { sprite(ctx, BIRD[(m.anim >> 3) & 1], m.x - 4, m.y - 10, { a: '#202020', b: '#e040e0', c: '#ffd020' }); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(m.x - 3, m.y + 6, 6, 2); return; }
        const pal = m.kind === 'blue' ? { a: '#ffffff', b: '#3050ff', w: '#ffffff', k: '#000000' } : m.kind === 'green' ? { a: '#ffff40', b: '#30c040', w: '#ffffff', k: '#000000' } : { a: '#ffff40', b: '#ff3030', w: '#ffffff', k: '#000000' };
        if (m.stun > 0 && ((m.stun >> 2) & 1)) pal.b = '#ffffff';
        if (m.emerge > 0) { ctx.save(); ctx.beginPath(); ctx.rect(0, gatePos().y - 6, W, H); ctx.clip(); }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(m.x - 5, m.y - 1, 10, 2);
        sprite(ctx, ONI[(m.anim >> 3) & 1], m.x - 5, m.y - 12, pal, m.dx < 0);
        if (m.kind === 'green') { ctx.fillStyle = '#a06020'; ctx.fillRect(m.x + (m.dx < 0 ? -7 : 5), m.y - 12, 2, 7); }
        if (m.stun > 0) { ctx.fillStyle = '#ffff40'; const a = m.stun * 0.2; for (let i = 0; i < 3; i++) ctx.fillRect(m.x + Math.cos(a + i * 2.1) * 6, m.y - 15 + Math.sin(a + i * 2.1) * 2, 1, 1); }
        if (m.emerge > 0) ctx.restore();
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, FT - 2); ctx.fillRect(0, FB + 4, W, H - FB - 4);
        txt(ctx, '1UP', 8, 3, '#ff4040'); txt(ctx, String(score).padStart(6, '0'), 8, 13, '#ffffff');
        txt(ctx, 'HI-SCORE', 70, 3, '#ff4040'); txt(ctx, String(hi).padStart(6, '0'), 76, 13, '#ffffff');
        txt(ctx, 'STAGE', 140, 3, '#40c0ff'); txt(ctx, String(stage), 152, 13, '#ffffff');
        txt(ctx, 'TIME', 200, 3, '#ffd020');
        const tl = state === 'title' ? 99 : timeLeft;
        txt(ctx, String(tl).padStart(2, '0'), 206, 13, hurry && ((T >> 3) & 1) ? '#ff3030' : '#ffffff');
        if (state !== 'title' && !demo) for (let i = 0; i < Math.min(6, lives - 1); i++) { ctx.fillStyle = BOY_PAL.h; ctx.fillRect(6 + i * 10, FB + 7, 6, 3); ctx.fillStyle = BOY_PAL.s; ctx.fillRect(7 + i * 10, FB + 10, 4, 2); ctx.fillStyle = BOY_PAL.c; ctx.fillRect(6 + i * 10, FB + 12, 6, 2); }
        // castle strength meter
        if (castle && state !== 'title') {
          const need = castle.left - Math.floor(castle.total * 0.25), tot = castle.total - Math.floor(castle.total * 0.25);
          txt(ctx, 'CASTLE', 140, FB + 6, '#b0a090');
          ctx.fillStyle = '#302820'; ctx.fillRect(180, FB + 7, 70, 5);
          ctx.fillStyle = '#ff8040'; ctx.fillRect(180, FB + 7, Math.max(0, Math.round(70 * need / tot)), 5);
        }
        if (demo) txt(ctx, 'DEMO PLAY', 8, FB + 6, '#ffff40');
      }
      function drawFx(ctx) {
        for (const f of fx) {
          if (f.pts) { txt(ctx, String(f.pts), f.x, f.y - f.t * 0.3, '#ffffff', 1, 'center'); continue; }
          if (f.dust) { ctx.fillStyle = '#c0b080'; const r = f.t / 3; ctx.fillRect(f.x - r, f.y, 1, 1); ctx.fillRect(f.x + r, f.y, 1, 1); ctx.fillRect(f.x, f.y - r, 1, 1); continue; }
          if (f.chips) { ctx.fillStyle = '#b0a090'; for (let i = 0; i < 4; i++) ctx.fillRect(f.x + (i - 1.5) * f.t * 0.6, f.y + f.t * f.t * 0.05 - f.t * 0.6 + i, 2, 2); continue; }
          if (f.puff) { ctx.fillStyle = f.t < 8 ? '#ffffff' : '#c0c0c0'; const r = 2 + f.t / 2; for (let i = 0; i < 6; i++) { const a = i * 1.047; ctx.fillRect(f.x + Math.cos(a) * r - 1, f.y + Math.sin(a) * r - 1, 3, 3); } }
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        drawField(ctx);
        // depth-sort: trees, monsters, boy by y
        const list = [];
        for (const t of trees) list.push({ y: t.y, d: () => drawTree(ctx, t) });
        for (const m of monsters) list.push({ y: m.y, d: () => drawMonster(ctx, m) });
        if (state !== 'title') list.push({ y: boy.y, d: () => drawBoy(ctx) });
        drawCastle(ctx);
        if (item) {
          const c = ['#ff3030', '#ffd020', '#40c0ff'][item.kind];
          if (item.t > 120 || ((item.t >> 3) & 1)) { ctx.fillStyle = c; ctx.fillRect(item.x - 3, item.y - 7, 7, 6); ctx.fillStyle = '#30a030'; ctx.fillRect(item.x, item.y - 9, 2, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(item.x - 2, item.y - 6, 1, 1); }
        }
        list.sort((a, b) => a.y - b.y); for (const o of list) o.d();
        for (const k of rocks) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(k.x - 1, k.y, 3, 1);
          ctx.fillStyle = '#d0d0d0'; ctx.fillRect(k.x - 1, k.y - k.h - 1, 3, 3); ctx.fillStyle = '#808080'; ctx.fillRect(k.x, k.y - k.h, 2, 2);
        }
        for (const c of clubs) sprite(ctx, CLUB, c.x - 2, c.y - 2, { a: '#a06020', b: '#603010' }, (c.t >> 2) & 1);
        drawFx(ctx);
        drawHUD(ctx);
        if (state === 'ready') { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(68, 94, 120, 30); txt(ctx, 'STAGE ' + stage, W / 2, 100, '#ffd020', 1, 'center'); txt(ctx, 'READY!', W / 2, 112, '#ffffff', 1, 'center'); }
        if (state === 'play' && hurry && T % 120 < 60) txt(ctx, 'HURRY UP!', W / 2, FT + 4, '#ff3030', 1, 'center');
        if (state === 'clear' && T > 40) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(48, 94, 160, 30); txt(ctx, 'CASTLE DESTROYED!', W / 2, 100, '#ffd020', 1, 'center'); txt(ctx, 'TIME BONUS ' + timeLeft * 10, W / 2, 112, '#ffffff', 1, 'center'); }
        if (state === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(70, 98, 116, 24); txt(ctx, 'GAME OVER', W / 2, 103, '#ff3030', 2, 'center'); }
        if (state === 'title') renderTitle(ctx);
        else if (demo && ((api.frame >> 5) & 1)) txt(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 120, '#ffffff', 1, 'center');
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(16, 34, 224, 172);
        const word = 'NAUGHTY', w2 = 'BOY';
        for (let i = 0; i < word.length; i++) txt(ctx, word[i], 44 + i * 24, 42 + Math.round(Math.sin(titleT * 0.08 + i) * 2), ['#ff3030', '#ffd020', '#40ff60', '#40c0ff'][(i + (titleT >> 4)) % 4], 3);
        txt(ctx, w2, W / 2, 68, '#ffffff', 3, 'center');
        sprite(ctx, BOY[(titleT >> 3) % 3], 40, 72, BOY_PAL);
        sprite(ctx, ONI[(titleT >> 3) & 1], 204, 72, { a: '#ffff40', b: '#ff3030', w: '#ffffff', k: '#000' }, true);
        const rows = [['#ff3030', 'RED OGRE', '100'], ['#3050ff', 'BLUE OGRE', '200'], ['#30c040', 'CLUB OGRE', '300'], ['#e040e0', 'BIRD', '500']];
        rows.forEach((r, i) => { sprite(ctx, ONI[0], 52, 98 + i * 14, { a: '#ffff40', b: r[0], w: '#fff', k: '#000' }); txt(ctx, r[1], 70, 101 + i * 14, '#ffffff'); txt(ctx, r[2] + ' PTS', 200, 101 + i * 14, '#ffd020', 1, 'right'); });
        txt(ctx, 'STONE THE CASTLE DOWN!', W / 2, 158, '#40ff60', 1, 'center');
        const blink = (titleT >> 4) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (blink || coinFlash > 0) txt(ctx, 'INSERT COIN', W / 2, 172, '#ff3030', 1, 'center'); }
        else if (blink) txt(ctx, 'PUSH START', W / 2, 172, '#ffffff', 1, 'center');
        txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 184, '#a0a0ff', 1, 'center');
        txt(ctx, '\u00a9 1982 JALECO', W / 2, 196, '#808080', 1, 'center');
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, stage, score, lives, left: castle.left, total: castle.total, mons: monsters.length, time: timeLeft }), god: v => { } });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
