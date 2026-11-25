// Bagman (Valadon Automation, 1982) - from-scratch recreation for the MAME32 Game Room.
// Sneak through three screens of mine tunnels, haul the money bags up to the wheelbarrow on the surface,
// ride the elevators, dodge the mine cart and knock the guards flat with a pickaxe.
(function () {
  'use strict';
  const W = 224, H = 256, SCR = 3, WW = W * SCR;
  const F = [52, 96, 140, 184, 228];                 // floor (feet) lines: surface + four tunnels
  const SHAFTS = [96, 560];                          // elevator shafts (world x of the left edge), 16px wide
  const SHW = 16;
  const LADDERS = [ // world x, from floor a (top) to floor a+1
    [40, 0], [200, 0], [250, 0], [400, 0], [470, 0], [640, 0],
    [180, 1], [330, 1], [420, 1], [610, 1],
    [60, 2], [270, 2], [500, 2], [650, 2],
    [150, 3], [380, 3], [520, 3]];
  const BAGS0 = [[30, 1], [150, 2], [200, 4], [260, 3], [350, 1], [400, 4], [480, 2], [600, 3], [655, 1], [300, 4], [130, 1], [540, 2]];
  const AXES0 = [[130, 3], [530, 1]];
  const GUARDS0 = [[20, 4], [650, 4], [330, 2], [450, 3]];

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
  // bagman: c cap, s skin, k black, w white stripe, r red stripe, p trousers
  const MAN = [
    ['..cccc..', '.cccccc.', '..ssss..', '..sksk..', '..ssss..', '.wwwwww.', 'srrrrrrs', 's.wwww.s', '..rrrr..', '..pppp..', '..p..p..', '.kk..kk.'],
    ['..cccc..', '.cccccc.', '..ssss..', '..sksk..', '..ssss..', '.wwwwww.', '.rrrrrrs', '.swwww..', '..rrrr..', '..pppp..', '...pp...', '...kk...']];
  const MAN_CLIMB = [
    ['..cccc..', '.cccccc.', '..cccc..', 's.cccc.s', 's.ssss.s', '.wwwwww.', '.rrrrrr.', '..wwww..', '..rrrr..', '..pppp..', '..p..p..', '..k..k..'],
    ['s.cccc.s', 's.cccc.s', '..cccc..', '..cccc..', '..ssss..', '.wwwwww.', '.rrrrrr.', '..wwww..', '..rrrr..', '..pppp..', '.p....p.', '.k....k.']];
  const COP = [
    ['.bbbbb..', 'bbbbbbb.', '..ssss..', '..sksk..', '..ssss..', '.bbbbbb.', 'sbbybbbs', 's.bbbb.s', '..bbbb..', '..bbbb..', '..b..b..', '.kk..kk.'],
    ['.bbbbb..', 'bbbbbbb.', '..ssss..', '..sksk..', '..ssss..', '.bbbbbb.', '.bbybbbs', '.sbbbb..', '..bbbb..', '..bbbb..', '...bb...', '...kk...']];
  const COP_CLIMB = [
    ['.bbbbb..', 'bbbbbbb.', '..bbbb..', 's.bbbb.s', 's.ssss.s', '.bbbbbb.', '.bbbbbb.', '..bbbb..', '..bbbb..', '..bbbb..', '..b..b..', '..k..k..'],
    ['sbbbbb.s', 'sbbbbbbs', '..bbbb..', '..bbbb..', '..ssss..', '.bbbbbb.', '.bbbbbb.', '..bbbb..', '..bbbb..', '..bbbb..', '.b....b.', '.k....k.']];
  const BAG = ['..kk..', '.bbbb.', 'bbyybb', 'bybbbb', 'bbyybb', 'bbbbyb', 'bbyybb', '.bbbb.'];
  const AXE = ['aaaaaa', 'a.hh.a', '..hh..', '..hh..', '..hh..', '..hh..'];

  ArcadeRegistry.register({
    id: 'bagman', title: 'Bagman', year: 1982, maker: 'Valadon Automation',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: walk / climb \u00b7 Space: swing pickaxe \u00b7 X: drop bag or pickaxe \u00b7 Enter: start',
    marquee: { bg: '#2a1408', fg: '#ffd040', accent: '#40a0ff' },
    create(api) {
      const A = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      let hi = api.getHiScore(10000);
      let state = 'title', T = 0, score = 0, lives = 4, stage = 1, nextExtra = 20000, coinFlash = 0, lastCred = api.credits;
      let man, guards, bags, axes, plats, cart, barrow, fx, bagsLeft, titleT = 0, page = 0, walkSnd = 0;

      const snd = {
        pick() { A.tone(600, 0.05, { type: 'square', vol: 0.1, slideTo: 900 }); },
        drop() { A.tone(200, 0.06, { type: 'triangle', vol: 0.12 }); },
        deposit() { A.melody([[784, .06], [988, .06], [1175, .06], [1568, .14]], { type: 'square', vol: 0.12 }); },
        swing() { A.noise(0.08, { vol: 0.12, freq: 4000, type: 'highpass' }); },
        bonk() { A.tone(140, 0.2, { type: 'square', vol: 0.16, slideTo: 60 }); A.noise(0.1, { vol: 0.12, freq: 1500 }); },
        die() { A.melody([[523, .12], [494, .12], [466, .12], [440, .12], [415, .3], [0, .1], [262, .4]], { type: 'square', vol: 0.14 }); },
        fall() { A.tone(1200, 0.4, { type: 'square', vol: 0.08, slideTo: 200 }); },
        clear() { A.melody([[523, .1], [659, .1], [784, .1], [1047, .15], [0, .05], [784, .1], [1047, .35]], { type: 'square', vol: 0.13 }); },
        start() { A.melody([[392, .1], [523, .1], [659, .1], [523, .1], [392, .1], [523, .1], [659, .1], [784, .3]], { type: 'square', vol: 0.12 }); },
        step() { A.tone(walkSnd ? 180 : 150, 0.02, { type: 'triangle', vol: 0.05 }); walkSnd ^= 1; },
        cart() { A.noise(0.05, { vol: 0.04, freq: 600 }); },
        extra() { A.melody([[1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.12 }); },
        coin() { A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }); }
      };

      // ---------- world helpers ----------
      const inShaft = wx => { for (const s of SHAFTS) if (wx > s && wx < s + SHW) return s; return -1; };
      function floorSolid(k, wx) {
        if (wx < 2 || wx > WW - 2) return false;
        if (k < 4 && inShaft(wx) >= 0) return false;
        return true;
      }
      const floorIndex = y => { for (let k = 0; k < F.length; k++) if (Math.abs(y - F[k]) < 0.5) return k; return -1; };
      function pathClear(k, a, b) { // can walk along floor k from a to b without crossing a shaft
        if (k >= 4) return true;
        const lo = Math.min(a, b), hi2 = Math.max(a, b);
        for (const s of SHAFTS) if (s + SHW > lo && s < hi2) return false;
        return true;
      }
      function ladderAt(wx, k, goingUp) {
        for (const l of LADDERS) {
          if (Math.abs(l[0] - wx) > 5) continue;
          if (goingUp && l[1] + 1 === k) return l;
          if (!goingUp && l[1] === k) return l;
        }
        return null;
      }

      // ---------- flow ----------
      function startGame() { score = 0; lives = 4; stage = 1; nextExtra = 20000; snd.start(); setupStage(); }
      function setupStage() {
        bags = BAGS0.slice(0, Math.min(BAGS0.length, 8 + stage)).map(b => ({ wx: b[0], y: F[b[1]], home: b, vy: 0, falling: false }));
        bagsLeft = bags.length;
        axes = AXES0.map(a => ({ wx: a[0], y: F[a[1]], home: a }));
        barrow = { wx: 300, dir: 1 };
        cart = { wx: 240, y: F[2], dir: 1 };
        plats = SHAFTS.map((s, i) => ({ sx: s, y: i ? F[4] : F[0], dir: i ? -1 : 1, pause: 0 }));
        fx = [];
        resetActors(); state = 'ready'; T = 0;
      }
      function resetActors() {
        if (man && man.carry === 'bag' && man.bag) { const b = man.bag; b.wx = b.home[0]; b.y = F[b.home[1]]; b.carried = false; }
        if (man && man.carry === 'axe' && man.axe) { const a = man.axe; a.wx = a.home[0]; a.y = F[a.home[1]]; a.carried = false; }
        man = { wx: 320, y: F[0], vy: 0, climb: null, face: 1, carry: null, bag: null, axe: null, swing: 0, falling: false, fallFrom: 0, onPlat: null, anim: 0 };
        const n = Math.min(GUARDS0.length, 1 + stage);
        guards = [];
        for (let i = 0; i < n; i++) guards.push({ wx: GUARDS0[i][0], y: F[GUARDS0[i][1]], climb: null, cdir: 0, stun: 0, face: 1, anim: 0, wait: 60 + i * 60, home: GUARDS0[i], wander: 0 });
        cart.wx = 240; cart.dir = 1;
      }
      function addScore(n) {
        score += n;
        if (score >= nextExtra) { lives++; nextExtra += 30000; snd.extra(); }
        if (score > hi) hi = score;
      }
      function pop(wx, y, n) { fx.push({ wx, y, t: 0, pts: n }); }
      let god = false;
      function killMan() { if (state === 'play' && !god) { state = 'dying'; T = 0; snd.die(); } }

      // ---------- player ----------
      function updateMan() {
        const m = man;
        if (m.swing > 0) m.swing--;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const slow = m.carry === 'bag';
        // items
        if (api.pressed('Space') && m.carry === 'axe' && !m.climb && m.swing === 0) { m.swing = 18; snd.swing(); }
        if (api.pressed('KeyX') && m.carry && !m.climb && !m.falling) dropItem();
        if (m.falling) {
          m.vy = Math.min(3, m.vy + 0.15);
          const ny = m.y + m.vy;
          // land on platform
          const s = inShaft(m.wx);
          if (s >= 0) { const p = plats.find(q => q.sx === s); if (p && m.y <= p.y && ny >= p.y) { landAt(p.y); m.onPlat = p; return; } }
          for (let k = 0; k < F.length; k++) if (m.y <= F[k] && ny >= F[k] && floorSolid(k, m.wx)) { landAt(F[k]); return; }
          m.y = ny;
          if (m.y > H) killMan();
          return;
        }
        if (m.climb) {
          const top = F[m.climb[1]], bot = F[m.climb[1] + 1];
          const sp = slow ? 0.55 : 0.85;
          if (U) { m.y = Math.max(top, m.y - sp); m.anim++; }
          else if (D) { m.y = Math.min(bot, m.y + sp); m.anim++; }
          if ((L || R) && (m.y === top || m.y === bot)) { m.climb = null; m.face = L ? -1 : 1; }
          else if ((U && m.y === top) || (D && m.y === bot)) { /* at the end; arrows left/right step off */ }
          if (m.anim % 14 === 1 && (U || D)) snd.step();
          return;
        }
        // on ground / platform
        if (m.onPlat) m.y = m.onPlat.y;
        const k = floorIndex(m.y);
        if ((U || D) && !L && !R && m.carry !== 'axe' && k >= 0 && !m.onPlat) {
          const l = ladderAt(m.wx, k, U);
          if (l) { m.climb = l; m.wx = l[0]; return; }
        }
        if ((U || D) && !L && !R && m.carry !== 'axe' && k >= 0 && m.onPlat) {
          const l = ladderAt(m.wx, k, U); if (l) { m.climb = l; m.wx = l[0]; m.onPlat = null; return; }
        }
        if (L || R) {
          const dir = L ? -1 : 1; m.face = dir;
          const sp = slow ? 0.7 : 1.0;
          const nx = Math.max(4, Math.min(WW - 4, m.wx + dir * sp));
          m.wx = nx; m.anim++;
          if (m.anim % 12 === 0) snd.step();
        }
        // support check
        if (m.onPlat) {
          const p = m.onPlat;
          if (!(m.wx > p.sx && m.wx < p.sx + SHW)) { // stepped off the platform
            m.onPlat = null;
            const kk = floorIndex(m.y);
            if (kk < 0 || !floorSolid(kk, m.wx)) startFall();
          }
        } else {
          const kk = floorIndex(m.y);
          if (kk < 0 || !floorSolid(kk, m.wx)) {
            const s = inShaft(m.wx); const p = s >= 0 ? plats.find(q => q.sx === s) : null;
            if (p && Math.abs(p.y - m.y) < 2) { m.onPlat = p; m.y = p.y; }
            else startFall();
          }
        }
      }
      function startFall() { man.falling = true; man.vy = 0; man.fallFrom = man.y; man.onPlat = null; snd.fall(); }
      function landAt(y) {
        const m = man; const dist = y - m.fallFrom;
        m.y = y; m.falling = false; m.vy = 0;
        if (dist > 30) killMan(); else snd.drop();
      }
      function dropItem() {
        const m = man;
        if (m.carry === 'bag') { const b = m.bag; b.carried = false; b.wx = m.wx + m.face * 2; b.y = m.y; m.carry = null; m.bag = null; snd.drop(); if (inShaft(b.wx) >= 0 && floorIndex(b.y) < 4) { b.falling = true; b.vy = 0; } else if (m.onPlat) { b.falling = true; b.vy = 0; } }
        else if (m.carry === 'axe') { const a = m.axe; a.carried = false; a.wx = m.wx + m.face * 2; a.y = m.onPlat ? F[4] : m.y; m.carry = null; m.axe = null; snd.drop(); }
        m.pickCool = 30;
      }
      function pickups() {
        const m = man;
        if (m.pickCool > 0) { m.pickCool--; return; }
        if (m.carry || m.climb || m.falling) return;
        for (const b of bags) if (!b.carried && !b.done && !b.falling && Math.abs(b.wx - m.wx) < 6 && Math.abs(b.y - m.y) < 3) { b.carried = true; m.carry = 'bag'; m.bag = b; if (!b.scored) { b.scored = true; addScore(25); } snd.pick(); return; }
        for (const a of axes) if (!a.carried && Math.abs(a.wx - m.wx) < 6 && Math.abs(a.y - m.y) < 3) { a.carried = true; m.carry = 'axe'; m.axe = a; snd.pick(); return; }
      }

      // ---------- guards ----------
      function guardSpeed() { return Math.min(0.9, 0.42 + stage * 0.06); }
      function guardTarget() {
        // the floor the player is on (or the nearest one when climbing / falling / riding)
        let best = 0, bd = 1e9; for (let k = 0; k < F.length; k++) { const d = Math.abs(F[k] - man.y); if (d < bd) { bd = d; best = k; } }
        return { wx: man.wx, k: best };
      }
      function updateGuard(g) {
        g.anim++;
        if (g.stun > 0) { g.stun--; return; }
        if (g.wait > 0) { g.wait--; return; }
        const sp = guardSpeed();
        if (g.climb) {
          const top = F[g.climb[1]], bot = F[g.climb[1] + 1];
          g.y += g.cdir * sp * 0.8;
          if (g.y <= top) { g.y = top; g.climb = null; }
          else if (g.y >= bot) { g.y = bot; g.climb = null; }
          return;
        }
        const k = floorIndex(g.y); if (k < 0) { g.y = F[0]; return; }
        const t = guardTarget();
        let goalX = null;
        if (g.wander > 0) { g.wander--; goalX = g.wanderX; }
        else if (t.k === k && pathClear(k, g.wx, t.wx)) goalX = t.wx;
        else {
          const up = t.k < k || (t.k === k); // same floor but blocked: go up and around
          let best = null, bd = 1e9;
          for (const l of LADDERS) {
            const ok = up ? l[1] + 1 === k : l[1] === k;
            if (!ok || !pathClear(k, g.wx, l[0])) continue;
            const d = Math.abs(l[0] - g.wx) + Math.abs(l[0] - t.wx) * 0.5;
            if (d < bd) { bd = d; best = l; }
          }
          if (!best) { // try the other way
            for (const l of LADDERS) { const ok = up ? l[1] === k : l[1] + 1 === k; if (!ok || !pathClear(k, g.wx, l[0])) continue; const d = Math.abs(l[0] - g.wx); if (d < bd) { bd = d; best = l; } }
          }
          if (best) {
            if (Math.abs(best[0] - g.wx) <= sp) { g.wx = best[0]; g.climb = best; g.cdir = best[1] === k ? 1 : -1; return; }
            goalX = best[0];
          } else { g.wander = 120; g.wanderX = rnd(20, WW - 20); }
        }
        if (goalX != null) {
          const dir = Math.sign(goalX - g.wx);
          if (dir) {
            const nx = g.wx + dir * Math.min(sp, Math.abs(goalX - g.wx));
            if (floorSolid(k, nx) && floorSolid(k, nx + dir * 6)) { g.wx = nx; g.face = dir; }
            else { g.wander = 90; g.wanderX = g.wx - dir * 60; }
          }
        }
      }
      function guardHits() {
        const m = man;
        // pickaxe swing
        if (m.carry === 'axe' && m.swing > 4 && m.swing < 15) {
          for (const g of guards) if (!g.stun && g.wait <= 0 && Math.abs(g.y - m.y) < 6) {
            const dx = (g.wx - m.wx) * m.face;
            if (dx > -2 && dx < 18) { g.stun = 360; g.climb = null; g.y = nearestFloor(g.y); addScore(100 * stage); pop(g.wx, g.y - 16, 100 * stage); snd.bonk(); }
          }
        }
        for (const g of guards) {
          if (g.stun || g.wait > 0) continue;
          if (Math.abs(g.wx - m.wx) < 7 && Math.abs(g.y - m.y) < 8) { killMan(); return; }
        }
      }
      const nearestFloor = y => { let b = F[0], bd = 1e9; for (const f of F) if (Math.abs(f - y) < bd) { bd = Math.abs(f - y); b = f; } return b; };

      // ---------- world objects ----------
      function updateWorld() {
        // elevators: slow continuous ride with a short stop at every level
        for (const p of plats) {
          if (p.pause > 0) { p.pause--; continue; }
          const sp = 0.5 + Math.min(0.3, stage * 0.05);
          const ny = p.y + p.dir * sp;
          for (const f of F) if ((p.y < f && ny >= f) || (p.y > f && ny <= f)) { p.y = f; p.pause = 50; break; }
          if (p.pause === 0) p.y = ny;
          if (p.y <= F[0]) { p.y = F[0]; p.dir = 1; }
          if (p.y >= F[4]) { p.y = F[4]; p.dir = -1; }
        }
        // wheelbarrow trundles along the middle screen's surface
        barrow.wx += barrow.dir * 0.3; if (barrow.wx < 236 || barrow.wx > 436) barrow.dir = -barrow.dir;
        // mine cart
        cart.wx += cart.dir * (0.9 + stage * 0.12); if (cart.wx < 232 || cart.wx > 440) cart.dir = -cart.dir;
        if (T % 10 === 0 && Math.floor(cart.wx / W) === Math.floor(man.wx / W)) snd.cart();
        if (Math.abs(cart.wx - man.wx) < 10 && Math.abs(cart.y - man.y) < 10) killMan();
        for (const g of guards) if (!g.stun && Math.abs(cart.wx - g.wx) < 10 && Math.abs(cart.y - g.y) < 8) { g.stun = 240; g.climb = null; g.y = nearestFloor(g.y); snd.bonk(); }
        // falling bags
        for (const b of bags) {
          if (!b.falling) continue;
          b.vy = Math.min(3, b.vy + 0.15); const ny = b.y + b.vy;
          for (const g of guards) if (!g.stun && Math.abs(g.wx - b.wx) < 8 && b.y < g.y - 8 && ny >= g.y - 14) { g.stun = 400; addScore(300); pop(g.wx, g.y - 16, 300); snd.bonk(); }
          let landed = false;
          for (let k = 0; k < F.length; k++) if (b.y < F[k] && ny >= F[k] && floorSolid(k, b.wx)) { b.y = F[k]; b.falling = false; landed = true; snd.drop(); break; }
          if (!landed) b.y = ny;
          if (b.y > F[4]) { b.y = F[4]; b.falling = false; }
        }
        // carried items follow the man
        if (man.bag) { man.bag.wx = man.wx; man.bag.y = man.y; }
        if (man.axe) { man.axe.wx = man.wx; man.axe.y = man.y; }
        // deposit
        if (man.carry === 'bag' && floorIndex(man.y) === 0 && !man.climb && Math.abs(man.wx - barrow.wx) < 14) {
          const b = man.bag; b.done = true; b.carried = false; man.carry = null; man.bag = null; bagsLeft--;
          addScore(200 * stage); pop(barrow.wx, F[0] - 22, 200 * stage); snd.deposit();
          if (bagsLeft <= 0) { state = 'clear'; T = 0; snd.clear(); }
        }
      }

      function updatePlay() {
        T++;
        updateMan(); pickups();
        updateWorld(); if (state !== 'play') return;
        for (const g of guards) updateGuard(g);
        guardHits();
      }

      function update() {
        if (api.credits > lastCred) snd.coin(); lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (fx) { for (const f of fx) f.t++; fx = fx.filter(f => f.t < 60); }
        switch (state) {
          case 'title':
            titleT++; if (titleT % 480 === 0) page ^= 1;
            updateTitleWorld();
            if (api.anyPressed('Enter', 'Space')) { if (api.useCredit()) startGame(); else { coinFlash = 90; A.tone(90, 0.25, { type: 'square', vol: 0.15 }); } }
            break;
          case 'ready': T++; if (T >= 120) { state = 'play'; T = 0; } break;
          case 'play': updatePlay(); break;
          case 'dying':
            T++;
            if (T === 150) {
              const respawn = () => { resetActors(); state = 'ready'; T = 0; };
              const over = () => { state = 'over'; T = 0; api.setHiScore(score); };
              if (lives <= 1) { lives = 0; if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over(); }
              else { lives--; respawn(); }
            }
            break;
          case 'clear':
            T++;
            if (T === 100) addScore(1000 * stage);
            if (T >= 240) { stage++; man = null; setupStage(); }
            break;
          case 'over': T++; if (T > 240 || (T > 60 && api.anyPressed('Enter', 'Space'))) toTitle(); break;
        }
      }
      function updateTitleWorld() { T++; barrow.wx += barrow.dir * 0.3; if (barrow.wx < 236 || barrow.wx > 436) barrow.dir = -barrow.dir; for (const p of plats) { p.y += p.dir * 0.5; if (p.y <= F[0]) p.dir = 1; if (p.y >= F[4]) p.dir = -1; } }
      function toTitle() { state = 'title'; titleT = 0; T = 0; man = null; stage = 1; setupStage(); state = 'title'; }
      toTitle();

      // ---------- render ----------
      function drawWorld(ctx, cam) {
        // sky + surface
        ctx.fillStyle = '#000020'; ctx.fillRect(0, 24, W, F[0] - 24);
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 12; i++) ctx.fillRect((i * 71 + cam * 0.5) % W, 28 + (i * 13) % 16, 1, 1);
        // dirt
        ctx.fillStyle = '#7a4a1a'; ctx.fillRect(0, F[0], W, 240 - F[0]);
        ctx.fillStyle = '#8a5a2a'; for (let i = 0; i < 60; i++) ctx.fillRect((i * 37 + cam) % W, F[0] + 4 + (i * 23) % (240 - F[0] - 6), 2, 1);
        ctx.fillStyle = '#30a030'; ctx.fillRect(0, F[0], W, 2);
        // tunnels
        for (let k = 1; k < F.length; k++) {
          ctx.fillStyle = '#100804'; ctx.fillRect(0, F[k] - 22, W, 22);
          ctx.fillStyle = '#5a3a1a'; ctx.fillRect(0, F[k] - 22, W, 1);
          // timber props
          ctx.fillStyle = '#a06030';
          for (let x = 8 - (cam % 48); x < W; x += 48) { ctx.fillRect(x, F[k] - 22, 2, 22); ctx.fillRect(x - 3, F[k] - 22, 8, 2); }
          // rails
          ctx.fillStyle = '#909090'; ctx.fillRect(0, F[k], W, 2);
        }
        // shafts
        for (const s of SHAFTS) {
          const x = s - cam; if (x < -SHW || x > W) continue;
          ctx.fillStyle = '#080808'; ctx.fillRect(x, F[0] - 4, SHW, F[4] - F[0] + 4);
          ctx.fillStyle = '#404040'; ctx.fillRect(x + 1, F[0] - 4, 1, F[4] - F[0] + 4); ctx.fillRect(x + SHW - 2, F[0] - 4, 1, F[4] - F[0] + 4);
          // headframe on the surface
          ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 2, F[0] - 22, 2, 22); ctx.fillRect(x + SHW, F[0] - 22, 2, 22); ctx.fillRect(x - 2, F[0] - 24, SHW + 4, 2);
          ctx.fillStyle = '#ff4040'; ctx.fillRect(x + SHW / 2 - 2, F[0] - 28, 4, 4);
        }
        // platforms
        for (const p of plats) {
          const x = p.sx - cam; if (x < -SHW || x > W) continue;
          ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x + SHW / 2, F[0] - 24, 1, p.y - F[0] + 24 - 14);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 1, p.y, SHW - 2, 3);
          ctx.fillStyle = '#c08020'; ctx.fillRect(x + 1, p.y - 14, SHW - 2, 1); ctx.fillRect(x + 1, p.y - 14, 1, 14); ctx.fillRect(x + SHW - 2, p.y - 14, 1, 14);
        }
        // ladders
        for (const l of LADDERS) {
          const x = l[0] - cam; if (x < -8 || x > W + 8) continue;
          const top = F[l[1]] - (l[1] === 0 ? 0 : 0), bot = F[l[1] + 1];
          ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 4, top - 2, 1, bot - top + 2); ctx.fillRect(x + 3, top - 2, 1, bot - top + 2);
          for (let y = top; y < bot; y += 5) ctx.fillRect(x - 4, y, 8, 1);
        }
        // wheelbarrow
        const bx = barrow.wx - cam;
        if (bx > -20 && bx < W + 20) {
          ctx.fillStyle = '#40a0ff'; ctx.fillRect(bx - 10, F[0] - 10, 18, 6); ctx.fillRect(bx - 8, F[0] - 4, 14, 1);
          ctx.fillStyle = '#c0c0c0'; ctx.fillRect(bx + 8, F[0] - 9, 6, 1); ctx.fillRect(bx - 12, F[0] - 6, 3, 1);
          ctx.fillStyle = '#202020'; ctx.fillRect(bx - 9, F[0] - 3, 3, 3); ctx.fillRect(bx + 3, F[0] - 3, 3, 3);
          const done = bags ? bags.filter(b => b.done).length : 0;
          ctx.fillStyle = '#c08040'; for (let i = 0; i < Math.min(5, done); i++) ctx.fillRect(bx - 8 + i * 3, F[0] - 13, 3, 3);
        }
        // cart
        const cx = cart.wx - cam;
        if (cx > -20 && cx < W + 20) {
          ctx.fillStyle = '#c04020'; ctx.fillRect(cx - 9, cart.y - 11, 18, 8);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(cx - 7, cart.y - 13, 14, 2);
          ctx.fillStyle = '#e0e0e0'; ctx.fillRect(cx - 7, cart.y - 3, 4, 3); ctx.fillRect(cx + 3, cart.y - 3, 4, 3);
        }
      }
      function drawMan(ctx, cam) {
        const m = man, x = m.wx - cam - 4, y = m.y - 12;
        const pal = { c: '#e0e0e0', s: '#ffc090', k: '#101010', w: '#ffffff', r: '#ff3030', p: '#4040c0' };
        if (state === 'dying') {
          if (T < 60) sprite(ctx, MAN[(T >> 3) & 1], x, y, pal, (T >> 2) & 1);
          else { ctx.fillStyle = pal.r; ctx.fillRect(x - 2, m.y - 4, 12, 4); ctx.fillStyle = pal.c; ctx.fillRect(x - 6, m.y - 5, 4, 5); if ((T >> 3) & 1) { ctx.fillStyle = '#ffff40'; ctx.fillRect(x - 4, m.y - 10, 1, 1); ctx.fillRect(x + 2, m.y - 11, 1, 1); ctx.fillRect(x + 6, m.y - 9, 1, 1); } }
          return;
        }
        if (m.climb) sprite(ctx, MAN_CLIMB[(m.anim >> 3) & 1], x, y, pal);
        else sprite(ctx, MAN[(m.anim >> 3) & 1], x, y, pal, m.face < 0);
        if (m.carry === 'bag') sprite(ctx, BAG, m.climb ? x + 1 : x + (m.face > 0 ? -5 : 7), y - 2 + (m.climb ? -6 : 3), { k: '#603010', b: '#c08040', y: '#ffd040' });
        if (m.carry === 'axe') {
          const sw = m.swing;
          ctx.fillStyle = '#a06030';
          if (sw > 0 && sw < 15) { ctx.fillRect(x + (m.face > 0 ? 7 : -7), y + 6, 8, 2); ctx.fillStyle = '#d0d0d0'; ctx.fillRect(x + (m.face > 0 ? 14 : -8), y + 2, 2, 9); }
          else { ctx.fillRect(x + (m.face > 0 ? 7 : 0), y - 2, 2, 9); ctx.fillStyle = '#d0d0d0'; ctx.fillRect(x + (m.face > 0 ? 5 : -2), y - 3, 6, 2); }
        }
      }
      function drawGuard(ctx, g, cam) {
        const x = g.wx - cam - 4, y = g.y - 12;
        if (x < -10 || x > W + 10) return;
        const pal = { b: '#2050ff', s: '#ffc090', k: '#101010', y: '#ffd040' };
        if (g.wait > 0 && ((g.wait >> 2) & 1)) return;
        if (g.stun) {
          ctx.fillStyle = pal.b; ctx.fillRect(x - 2, g.y - 4, 12, 4); ctx.fillStyle = pal.s; ctx.fillRect(x + (g.face > 0 ? 10 : -4), g.y - 4, 3, 3);
          if (g.stun > 60 || ((g.stun >> 2) & 1)) { ctx.fillStyle = '#ffff40'; const a = g.anim * 0.2; for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + Math.cos(a + i * 2.1) * 6, g.y - 8 + Math.sin(a + i * 2.1) * 2, 1, 1); }
          return;
        }
        if (g.climb) sprite(ctx, COP_CLIMB[(g.anim >> 3) & 1], x, y, pal);
        else sprite(ctx, COP[(g.anim >> 3) & 1], x, y, pal, g.face < 0);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const scr = man ? Math.max(0, Math.min(SCR - 1, Math.floor(man.wx / W))) : 1 + 0;
        const cam = (state === 'title' ? (page ? 2 : 1) : scr) * W;
        drawWorld(ctx, cam);
        for (const b of bags) if (!b.done && !b.carried) { const x = b.wx - cam; if (x > -8 && x < W + 8) sprite(ctx, BAG, x - 3, b.y - 8, { k: '#603010', b: '#c08040', y: '#ffd040' }); }
        for (const a of axes) if (!a.carried) { const x = a.wx - cam; if (x > -8 && x < W + 8) sprite(ctx, AXE, x - 3, a.y - 6, { a: '#d0d0d0', h: '#a06030' }); }
        if (state !== 'title') {
          for (const g of guards) drawGuard(ctx, g, cam);
          drawMan(ctx, cam);
          // arrows hinting at guards on other screens
          for (const g of guards) { const gs = Math.floor(g.wx / W); if (gs !== scr && !g.stun) { ctx.fillStyle = '#2050ff'; const ax = gs < scr ? 2 : W - 5; ctx.fillRect(ax, g.y - 8, 3, 3); } }
        }
        for (const f of fx) { const x = f.wx - cam; txt(ctx, String(f.pts), x, f.y - f.t * 0.3, '#ffffff', 1, 'center'); }
        // HUD
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 24); ctx.fillRect(0, 240, W, 16);
        txt(ctx, '1UP', 8, 2, '#ff4040'); txt(ctx, String(score).padStart(6, '0'), 8, 12, '#ffffff');
        txt(ctx, 'HIGH', 84, 2, '#ff4040'); txt(ctx, String(hi).padStart(6, '0'), 78, 12, '#ffffff');
        txt(ctx, 'STAGE ' + stage, 150, 2, '#40c0ff');
        if (state !== 'title') {
          txt(ctx, 'BAGS ' + bagsLeft, 150, 12, '#ffd040');
          for (let i = 0; i < Math.min(6, lives - 1); i++) { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(6 + i * 10, 244, 6, 3); ctx.fillStyle = '#ff3030'; ctx.fillRect(6 + i * 10, 247, 6, 5); }
          // screen map
          for (let s = 0; s < SCR; s++) { ctx.fillStyle = s === scr ? '#ffd040' : '#404040'; ctx.fillRect(150 + s * 22, 245, 18, 6); }
        } else txt(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 245, '#a0a0ff', 1, 'center');
        if (state === 'ready') { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(56, 104, 112, 30); txt(ctx, 'STAGE ' + stage, W / 2, 110, '#ffd040', 1, 'center'); txt(ctx, 'READY', W / 2, 122, '#ffffff', 1, 'center'); }
        if (state === 'clear') { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(36, 104, 152, 30); txt(ctx, 'ALL BAGS LOADED!', W / 2, 110, '#40ff60', 1, 'center'); if (T >= 100) txt(ctx, 'BONUS ' + 1000 * stage, W / 2, 122, '#ffffff', 1, 'center'); }
        if (state === 'over') { ctx.fillStyle = '#000'; ctx.fillRect(50, 108, 124, 24); txt(ctx, 'GAME OVER', W / 2, 113, '#ff3030', 2, 'center'); }
        if (state === 'title') renderTitle(ctx);
      }
      function renderTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(10, 60, 204, 170);
        txt(ctx, 'BAGMAN', W / 2, 68, ['#ffd040', '#ff8020'][(titleT >> 4) & 1], 3, 'center');
        sprite(ctx, MAN[(titleT >> 3) & 1], 30, 76, { c: '#e0e0e0', s: '#ffc090', k: '#101010', w: '#ffffff', r: '#ff3030', p: '#4040c0' });
        sprite(ctx, COP[(titleT >> 3) & 1], 186, 76, { b: '#2050ff', s: '#ffc090', k: '#101010', y: '#ffd040' }, true);
        if (page === 0) {
          sprite(ctx, BAG, 30, 100, { k: '#603010', b: '#c08040', y: '#ffd040' }); txt(ctx, 'PICK UP BAG    25', 44, 101, '#ffffff');
          txt(ctx, 'LOAD THE BARROW 200', 44, 115, '#ffffff'); ctx.fillStyle = '#40a0ff'; ctx.fillRect(28, 116, 10, 5);
          sprite(ctx, AXE, 30, 127, { a: '#d0d0d0', h: '#a06030' }); txt(ctx, 'BONK A GUARD  100', 44, 129, '#ffffff');
          txt(ctx, 'DROP BAG ON GUARD 300', 44, 143, '#ffffff');
          txt(ctx, 'BONUS MAN AT 20000', W / 2, 162, '#ff8080', 1, 'center');
        } else {
          txt(ctx, 'CARRY THE MONEY BAGS UP', W / 2, 100, '#ffffff', 1, 'center');
          txt(ctx, 'TO THE WHEELBARROW', W / 2, 110, '#ffffff', 1, 'center');
          txt(ctx, 'RIDE THE ELEVATORS', W / 2, 124, '#ffd040', 1, 'center');
          txt(ctx, "DON'T FALL TOO FAR", W / 2, 134, '#ffd040', 1, 'center');
          txt(ctx, 'NO CLIMBING WITH A PICKAXE', W / 2, 148, '#40c0ff', 1, 'center');
          txt(ctx, 'X: DROP  SPACE: SWING', W / 2, 162, '#40c0ff', 1, 'center');
        }
        const blink = (titleT >> 4) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (blink || coinFlash > 0) txt(ctx, 'INSERT COIN', W / 2, 186, '#ff3030', 1, 'center'); }
        else if (blink) txt(ctx, 'PUSH START', W / 2, 186, '#ffffff', 1, 'center');
        txt(ctx, '\u00a9 1982 VALADON AUTOMATION', W / 2, 210, '#808080', 1, 'center');
      }
      if (api.debugHook) api.debugHook({ sum: () => ({ state, stage, score, lives, bagsLeft, man: man && [Math.round(man.wx), Math.round(man.y), man.carry, !!man.climb] }), objs: () => ({ man, bags, barrow, LADDERS, F, SHAFTS, plat0: plats[0].y, plats, axes, guards, cart, state, T, stage }), god: v => { god = v; } });
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
