// Ghosts 'n Goblins (Capcom, 1985) \u2014 built-in recreation for the MAME32 Game Room.
// Sir Arthur runs through the graveyard, forest, ghost town and caves to rescue the princess. One hit knocks his
// armour off, the second leaves a pile of bones. Lance, dagger, torch and axe pickups, ladders, bosses and a timer.
(function () {
  'use strict';
  const W = 256, H = 224, T = 16, HUD = 16, ROWS = 13;

  // ================= Bitmap font (5x7) =================
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
    ':': '000C0C000C0C00', '/': '00010204081000', "'": '04040800000000', '?': '0E110102040004',
    '\u00a9': '0E11171417110E', '(': '02040808080402', ')': '08040202020408', ',': '000000000C0408',
    '=': '00001F001F0000', '+': '0004041F040400'
  };
  const FONT = {};
  for (const k in FONT_HEX) { const s = FONT_HEX[k]; const a = []; for (let i = 0; i < 7; i++) a.push(parseInt(s.substr(i * 2, 2), 16) || 0); FONT[k] = a; }
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1, adv = 8 * sc; s = String(s).toUpperCase();
    const w = s.length * adv - 3 * sc;
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = Math.round(x - w);
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]]; if (!g) continue;
      for (let r = 0; r < 7; r++) { const b = g[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) ctx.fillRect(x + i * adv + c * sc, y + r * sc, sc, sc); }
    }
  }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  function mkRng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

  const STAGES = [
    { name: 'GRAVEYARD', sky: '#101848', far: '#1c2a5a', ground: '#5a3a1a', top: '#2a7a2a', boss: 'unicorn' },
    { name: 'FOREST', sky: '#0a2030', far: '#14402a', ground: '#4a3418', top: '#3a8a2a', boss: 'unicorn' },
    { name: 'GHOST TOWN', sky: '#281838', far: '#3a2a4a', ground: '#4a4a52', top: '#6a6a72', boss: 'dragon' },
    { name: 'CAVES', sky: '#140a08', far: '#2a1410', ground: '#5a2a18', top: '#8a4a28', boss: 'astaroth' }
  ];
  const WEAPONS = ['lance', 'dagger', 'torch', 'axe'];

  ArcadeRegistry.register({
    id: 'ghostsngoblins', title: "Ghosts 'n Goblins", year: 1985, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: run / climb / crouch \u00b7 Space: throw \u00b7 X (or Z): jump \u00b7 Enter: start',
    marquee: { bg: '#1a0a2a', fg: '#ff4020', accent: '#40c0ff' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(10000);
      let mode = 'title', frame = 0, titleT = 0, coinFlash = 0;
      let g = null;

      // ================= Sound =================
      const sfx = {
        throw() { au.tone(1200, 0.06, { type: 'square', vol: 0.06, slideTo: 600 }); },
        hit() { au.noise(0.06, { vol: 0.12, freq: 3000 }); },
        kill() { au.tone(400, 0.12, { type: 'square', vol: 0.1, slideTo: 80 }); au.noise(0.12, { vol: 0.1, freq: 1500 }); },
        jump() { au.tone(300, 0.08, { type: 'triangle', vol: 0.08, slideTo: 500 }); },
        armor() { au.noise(0.3, { vol: 0.2, freq: 4000, slideTo: 500 }); au.tone(900, 0.2, { type: 'square', vol: 0.08, slideTo: 200 }); },
        die() { au.melody([[523, .1], [494, .1], [466, .1], [440, .1], [415, .1], [392, .4]], { type: 'square', vol: 0.12 }); },
        pick() { au.melody([[659, .06], [880, .06], [1319, .1]], { type: 'square', vol: 0.1 }); },
        boss() { au.noise(0.2, { vol: 0.15, freq: 600 }); },
        bossdie() { au.noise(1.2, { vol: 0.25, freq: 1000, slideTo: 60 }); },
        clear() { au.melody([[392, .12], [523, .12], [659, .12], [784, .24], [659, .12], [784, .5]], { type: 'square', vol: 0.12 }); },
        rise() { au.tone(80, 0.3, { type: 'sawtooth', vol: 0.06, slideTo: 160 }); },
        oneup() { au.melody([[784, .06], [988, .06], [1175, .06], [1568, .14]], { type: 'square', vol: 0.1 }); },
        tune() {
          // the famous creeping graveyard opening
          au.melody([[294, .14], [349, .14], [440, .14], [415, .28], [349, .14], [294, .14], [349, .14], [262, .28], [294, .5]], { type: 'square', vol: 0.09 });
          au.melody([[147, .28], [0, .28], [131, .28], [0, .28], [147, .5]], { type: 'triangle', vol: 0.1 });
        }
      };

      // ================= Level building =================
      function build(st) {
        const r = mkRng(st * 911 + 7);
        const N = 176;
        const grid = []; for (let y = 0; y < ROWS; y++) grid.push(new Uint8Array(N));
        const set = (c, y, v) => { if (c >= 0 && c < N && y >= 0 && y < ROWS) grid[y][c] = v; };
        const floor = (c0, c1, top) => { for (let c = c0; c <= c1; c++) for (let y = top; y < ROWS; y++) set(c, y, 1); };
        const plat = (c0, c1, y) => { for (let c = c0; c <= c1; c++) set(c, y, 2); };
        const ladder = (c, y0, y1) => { for (let y = y0; y <= y1; y++) set(c, y, 3); };
        const pit = (c0, c1) => { for (let c = c0; c <= c1; c++) for (let y = 0; y < ROWS; y++) set(c, y, 0); };
        const spawns = [], items = [], rafts = [], deco = [];
        const A0 = N - 18;
        floor(0, N - 1, 11);
        if (st === 0) {
          plat(38, 66, 6); ladder(40, 6, 10); ladder(64, 6, 10);
          plat(84, 98, 7); ladder(86, 7, 10);
          pit(118, 119); pit(140, 141);
          for (let c = 10; c < A0 - 2; c += 5 + Math.floor(r() * 5)) {
            if ([39, 40, 41, 63, 64, 65, 85, 86, 87, 117, 118, 119, 120, 139, 140, 141, 142].includes(c)) continue;
            set(c, 10, 5);
            if (r() < 0.35) spawns.push({ c, t: 'crow', y: 10 });
          }
          set(45, 5, 5); set(61, 5, 5);
          spawns.push({ c: 52, t: 'plant', y: 6 }, { c: 92, t: 'plant', y: 7 }, { c: 104, t: 'arremer' }, { c: 150, t: 'plant', y: 11 });
          items.push({ c: 58, y: 6, k: 'dagger' }, { c: 128, y: 11, k: 'money' });
        } else if (st === 1) {
          pit(20, 21); pit(34, 41); rafts.push({ c0: 33, c1: 42, y: 10 });
          plat(48, 56, 7); ladder(50, 7, 10);
          pit(64, 65); pit(76, 83); rafts.push({ c0: 75, c1: 84, y: 9 });
          plat(90, 100, 6); ladder(92, 6, 10); ladder(99, 6, 10);
          pit(110, 111); pit(120, 127); rafts.push({ c0: 119, c1: 128, y: 10 });
          pit(138, 139); pit(146, 147);
          for (let c = 6; c < A0; c += 4 + Math.floor(r() * 6)) deco.push({ c, k: 'tree' });
          spawns.push({ c: 26, t: 'plant', y: 11 }, { c: 54, t: 'plant', y: 7 }, { c: 70, t: 'crow', y: 11 }, { c: 96, t: 'plant', y: 6 },
            { c: 105, t: 'arremer' }, { c: 132, t: 'plant', y: 11 }, { c: 142, t: 'crow', y: 11 }, { c: 150, t: 'ogre' });
          items.push({ c: 45, y: 11, k: 'torch' }, { c: 95, y: 6, k: 'money' }, { c: 115, y: 11, k: 'axe' });
        } else if (st === 2) {
          const houses = [[14, 26], [40, 54], [72, 84], [100, 114], [130, 142]];
          for (const [a, b] of houses) { plat(a, b, 7); plat(a + 2, b - 2, 3); ladder(a + 1, 7, 10); ladder(b - 3, 3, 6); deco.push({ c: a, k: 'house', w: b - a + 1 }); }
          pit(32, 33); pit(62, 63); pit(90, 91); pit(122, 123);
          spawns.push({ c: 20, t: 'ogre' }, { c: 48, t: 'plant', y: 7 }, { c: 58, t: 'arremer' }, { c: 78, t: 'ogre' }, { c: 108, t: 'plant', y: 3 },
            { c: 118, t: 'arremer' }, { c: 136, t: 'ogre' }, { c: 150, t: 'ogre' });
          items.push({ c: 22, y: 3, k: 'lance' }, { c: 80, y: 7, k: 'dagger' }, { c: 112, y: 7, k: 'money' }, { c: 138, y: 3, k: 'axe' });
        } else {
          // caves: steps, lava, ceiling
          for (let c = 0; c < N; c++) set(c, 0, 1);
          floor(14, 24, 9); floor(46, 52, 9); floor(88, 100, 9); floor(96, 100, 7);
          pit(28, 29); pit(36, 43); rafts.push({ c0: 35, c1: 44, y: 9 });
          pit(58, 59); pit(66, 73); rafts.push({ c0: 65, c1: 74, y: 9 });
          plat(78, 84, 7); ladder(80, 7, 10);
          pit(108, 109); pit(114, 121); rafts.push({ c0: 113, c1: 122, y: 9 });
          pit(130, 131); pit(140, 141);
          for (let c = 4; c < N; c += 3 + Math.floor(r() * 4)) deco.push({ c, k: 'stal', h: 1 + Math.floor(r() * 3) });
          spawns.push({ c: 18, t: 'bat' }, { c: 30, t: 'bat' }, { c: 50, t: 'arremer' }, { c: 62, t: 'bat' }, { c: 84, t: 'bat' }, { c: 99, t: 'plant', y: 7 },
            { c: 104, t: 'arremer' }, { c: 126, t: 'bat' }, { c: 134, t: 'ogre' }, { c: 146, t: 'arremer' });
          items.push({ c: 20, y: 9, k: 'torch' }, { c: 97, y: 7, k: 'money' }, { c: 126, y: 11, k: 'lance' });
        }
        // arena: flat ground, no tombs
        for (let c = A0; c < N; c++) { for (let y = 1; y < 11; y++) set(c, y, 0); for (let y = 11; y < ROWS; y++) set(c, y, 1); }
        return { st, N, grid, spawns, items, rafts, deco, A0, mid: 88, lava: st === 3 };
      }

      // ================= Tile helpers =================
      const rowOf = y => Math.floor((y - HUD) / T);
      const colOf = x => Math.floor(x / T);
      function tile(c, r) {
        const L = g.L;
        if (c < 0 || c >= L.N) return 1;
        if (r < 0 || r >= ROWS) return 0;
        return L.grid[r][c];
      }
      const isSolid = v => v === 1 || v === 5;
      function standable(c, r) { const v = tile(c, r); return v === 1 || v === 5 || v === 2 || (v === 3 && tile(c, r - 1) !== 3); }
      function solidAtPx(x, y) { return isSolid(tile(colOf(x), rowOf(y))); }
      function groundBelow(x, y) { return standable(colOf(x), rowOf(y + 1)); }

      // ================= Game state =================
      function newGame() {
        g = { score: 0, lives: 3, st: 0, loop: 0, nextLife: 20000, weapon: 'lance', checkpoint: false };
        g.phase = 'intro'; g.phaseT = 300; g.camX = 0;
        sfx.tune();
      }
      function diff() { return g.st * 0.4 + g.loop * 1.5; }
      function startStage() {
        g.L = build(g.st);
        g.en = []; g.eb = []; g.shots = []; g.fires = []; g.items = []; g.fx = []; g.pops = [];
        g.L.spawns.forEach(s => s.done = false);
        g.rafts = g.L.rafts.map(rf => ({ x: rf.c0 * T + 4, y: HUD + rf.y * T, w: 32, x0: rf.c0 * T + 4, x1: (rf.c1 + 1) * T - 36, vx: 0.6 }));
        for (const it of g.L.items) g.items.push({ x: it.c * T + 8, y: HUD + it.y * T, k: it.k, vy: 0, fixed: true });
        g.time = 180; g.timeT = 60; g.zombT = 120; g.waveT = 240; g.kills = 0;
        g.boss = null; g.bossLock = false; g.key = null;
        const sx = g.checkpoint ? g.L.mid * T : 40;
        g.p = { x: sx, y: HUD + 11 * T, vx: 0, vy: 0, dir: 1, ground: true, climb: false, crouch: false, armor: true, inv: 0, throwT: 0, step: 0, stepT: 0, knock: 0, raft: null, alive: true };
        g.camX = Math.max(0, Math.min(g.L.N * T - W, sx - 80));
        g.phase = 'ready'; g.phaseT = 120;
      }
      function addScore(n) {
        g.score += n;
        if (g.score >= g.nextLife) { g.lives++; g.nextLife += g.nextLife === 20000 ? 50000 : 70000; sfx.oneup(); }
        if (g.score > hi) { hi = g.score; api.setHiScore(hi); }
      }
      function pop(x, y, n) { g.pops.push({ x, y, n, t: 50 }); }
      function fx(x, y, k) { g.fx.push({ x, y, k: k || 'puff', t: 0 }); }

      // ================= Player =================
      const PW = 10;
      function pHeight(p) { return p.crouch ? 14 : 22; }
      function hurtPlayer(fromX) {
        const p = g.p;
        if (!p.alive || p.inv > 0 || g.phase !== 'play') return;
        if (p.armor) {
          p.armor = false; p.inv = 120; p.climb = false; p.ground = false; p.raft = null;
          p.vx = (p.x < fromX ? -1 : 1) * 1.4; p.vy = -2.6; p.knock = 1;
          for (let i = 0; i < 6; i++) g.fx.push({ x: p.x, y: p.y - 12, k: 'armor', t: 0, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2 });
          sfx.armor();
        } else killPlayer();
      }
      function killPlayer() {
        const p = g.p;
        if (!p.alive) return;
        p.alive = false; p.vx = 0; p.vy = 0; g.phase = 'dead'; g.phaseT = 150; sfx.die();
      }
      function moveX(p, dx) {
        if (!dx) return;
        const nx = p.x + dx, h = pHeight(p);
        const edge = dx > 0 ? nx + PW / 2 : nx - PW / 2;
        for (let yy = p.y - h + 1; yy < p.y; yy += 7) if (solidAtPx(edge, yy)) return true;
        if (solidAtPx(edge, p.y - 1)) return true;
        p.x = nx; return false;
      }
      function physicsY(p) {
        const y0 = p.y;
        p.vy = Math.min(4.5, p.vy + 0.22);
        let y1 = y0 + p.vy;
        p.ground = false;
        if (p.vy > 0) {
          // rafts
          for (const rf of g.rafts) {
            if (p.x > rf.x - 3 && p.x < rf.x + rf.w + 3 && y0 <= rf.y + 0.5 && y1 >= rf.y) { y1 = rf.y; p.vy = 0; p.ground = true; p.raft = rf; }
          }
          const r = rowOf(y1), top = HUD + r * T;
          if (!p.ground && y0 <= top + 0.5 && y1 >= top) {
            for (const fx2 of [p.x - PW / 2 + 1, p.x + PW / 2 - 1]) if (standable(colOf(fx2), r)) { y1 = top; p.vy = 0; p.ground = true; }
          }
        } else if (p.vy < 0) {
          const hy = y1 - pHeight(p);
          if (solidAtPx(p.x - 3, hy) || solidAtPx(p.x + 3, hy)) { p.vy = 0; y1 = y0; }
        }
        if (!p.ground) p.raft = null;
        p.y = y1;
      }
      function updPlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.throwT > 0) p.throwT--;
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        const jumpP = api.anyPressed('KeyX', 'KeyZ');
        if (p.climb) {
          const c = colOf(p.x);
          p.x = c * T + 8;
          let dy = (U ? -0.9 : 0) + (D ? 0.9 : 0);
          if (dy) { if (++p.stepT > 8) { p.stepT = 0; p.step++; } }
          p.y += dy;
          if (dy < 0 && tile(c, rowOf(p.y - 1)) !== 3) { p.y = HUD + (rowOf(p.y - 1) + 1) * T; p.climb = false; p.ground = true; }
          else if (dy > 0 && tile(c, rowOf(p.y)) !== 3) {
            if (standable(c, rowOf(p.y))) { p.y = HUD + rowOf(p.y) * T; p.climb = false; p.ground = true; }
            else p.climb = false;
          }
          if (jumpP && !U && !D) { p.climb = false; p.vy = 0; }
          if (api.pressed('Space') && p.throwT <= 0) throwWeapon();
          return;
        }
        if (p.knock) {
          moveX(p, p.vx); physicsY(p);
          if (p.ground) { p.knock = 0; p.vx = 0; }
          return;
        }
        if (p.ground) {
          p.crouch = D && !U;
          // ladders
          const c = colOf(p.x);
          if (U && tile(c, rowOf(p.y - 4)) === 3 && Math.abs(p.x - (c * T + 8)) < 7) { p.climb = true; p.crouch = false; p.raft = null; return; }
          if (D && tile(c, rowOf(p.y + 2)) === 3 && Math.abs(p.x - (c * T + 8)) < 7) { p.climb = true; p.crouch = false; p.y += 3; p.raft = null; return; }
          p.vx = 0;
          if (!p.crouch && p.throwT < 6) {
            if (L) { p.vx = -1.05; p.dir = -1; } else if (R) { p.vx = 1.05; p.dir = 1; }
          } else if (p.crouch) { if (L) p.dir = -1; else if (R) p.dir = 1; }
          if (jumpP) {
            p.vy = -4.3; p.ground = false; p.crouch = false; p.raft = null; sfx.jump();
            p.vx = L ? -1.35 : R ? 1.35 : 0; if (p.vx) p.dir = Math.sign(p.vx);
          }
          if (p.vx) { if (++p.stepT > 6) { p.stepT = 0; p.step++; } }
        }
        if (p.raft && p.ground) moveX(p, p.raft.vx);
        moveX(p, p.vx);
        physicsY(p);
        if (p.x < g.camX + 6) p.x = g.camX + 6;
        if (p.x > g.camX + W - 6) p.x = g.camX + W - 6;
        if (api.pressed('Space') && p.throwT <= 0) throwWeapon();
        if (p.y > HUD + 12 * T + 8) killPlayer();
      }
      function throwWeapon() {
        const p = g.p, wpn = g.weapon;
        const maxN = { lance: 2, dagger: 3, torch: 2, axe: 2 }[wpn];
        if (g.shots.length >= maxN) return;
        p.throwT = 12;
        const y = p.y - (p.crouch ? 8 : 15), x = p.x + p.dir * 6;
        if (wpn === 'lance') g.shots.push({ k: wpn, x, y, vx: p.dir * 4.6, vy: 0, g: 0, dmg: 1 });
        else if (wpn === 'dagger') g.shots.push({ k: wpn, x, y, vx: p.dir * 6.2, vy: 0, g: 0, dmg: 1 });
        else if (wpn === 'torch') g.shots.push({ k: wpn, x, y, vx: p.dir * 2.6, vy: -2.4, g: 0.17, dmg: 1 });
        else g.shots.push({ k: wpn, x, y, vx: p.dir * 2.9, vy: -3.0, g: 0.13, dmg: 2, pierce: true, hitSet: [] });
        sfx.throw();
      }

      // ================= Enemies =================
      function addEnemy(e) { e.hp = e.hp || 1; e.age = 0; e.flash = 0; g.en.push(e); return e; }
      function spawnFromList() {
        for (const s of g.L.spawns) {
          if (s.done) continue;
          if (s.c * T < g.camX + W + 8) {
            s.done = true;
            const x = s.c * T + 8;
            if (s.t === 'crow') addEnemy({ t: 'crow', x, y: HUD + s.y * T - 4, st: 'perch', vx: 0, vy: 0, pts: 100 });
            else if (s.t === 'plant') addEnemy({ t: 'plant', x, y: HUD + s.y * T, st: 0, shootT: 90, hp: 2, pts: 100 });
            else if (s.t === 'arremer') addEnemy({ t: 'arremer', x: g.camX + W + 10, y: HUD + 60, vx: 0, vy: 0, st: 'hover', stT: 80, hp: 3 + Math.floor(g.loop), pts: 1000 });
            else if (s.t === 'ogre') addEnemy({ t: 'ogre', x: Math.max(x, g.camX + W - 10), y: HUD + 11 * T, dir: -1, vy: 0, hp: 6 + g.loop * 2, pts: 1000, jumpT: 120, ground: true });
            else if (s.t === 'bat') addEnemy({ t: 'bat', x, y: HUD + 20, st: 'hang', vx: 0, vy: 0, pts: 100 });
          }
        }
      }
      function dynamicSpawns() {
        const st = g.st, p = g.p;
        if (g.bossLock) return;
        if (st <= 1) {
          if (--g.zombT <= 0) {
            g.zombT = Math.max(50, 160 - diff() * 20) + Math.random() * 90;
            if (g.en.filter(e => e.t === 'zombie').length < 3 + Math.floor(diff())) {
              for (let k = 0; k < 6; k++) {
                const x = p.x + (Math.random() < 0.6 ? 1 : -1) * (30 + Math.random() * 80);
                if (x < g.camX + 8 || x > g.camX + W - 8) continue;
                // find a ground surface in that column
                const c = colOf(x);
                for (let r = 1; r < ROWS; r++) {
                  if (standable(c, r) && tile(c, r - 1) === 0) {
                    addEnemy({ t: 'zombie', x, y: HUD + r * T, dir: x < p.x ? 1 : -1, st: 'rise', stT: 40, pts: 100, wl: 200 + Math.random() * 200 });
                    sfx.rise(); k = 99; break;
                  }
                }
              }
            }
          }
        } else if (st === 2) {
          if (--g.waveT <= 0) {
            g.waveT = Math.max(150, 320 - diff() * 30) + Math.random() * 100;
            const n = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < n; i++) addEnemy({ t: 'knight', x: g.camX + W + 10 + i * 26, y0: HUD + 50 + Math.random() * 90, ph: i * 1.3, pts: 200, hp: 1 });
          }
        } else if (st === 3) {
          if (--g.waveT <= 0) {
            g.waveT = Math.max(120, 260 - diff() * 25) + Math.random() * 100;
            addEnemy({ t: 'bat', x: g.camX + 40 + Math.random() * (W - 80), y: HUD + 20, st: 'hang', vx: 0, vy: 0, pts: 100 });
          }
        }
      }
      function aimShot(x, y, sp, k) {
        const p = g.p; const a = Math.atan2(p.y - 12 - y, p.x - x);
        g.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, k: k || 'ball' });
      }
      function enemyGroundWalk(e, sp) {
        const nx = e.x + e.dir * sp;
        const ahead = colOf(nx + e.dir * 6);
        const r = rowOf(e.y - 1);
        if (isSolid(tile(ahead, r)) || !standable(ahead, r + 1)) { e.dir *= -1; return; }
        e.x = nx;
      }
      function updEnemies() {
        const p = g.p;
        for (const e of g.en) {
          e.age++; if (e.flash > 0) e.flash--;
          const dx = p.x - e.x;
          switch (e.t) {
            case 'zombie':
              if (e.st === 'rise') { if (--e.stT <= 0) e.st = 'walk'; }
              else if (e.st === 'walk') { enemyGroundWalk(e, 0.42 + diff() * 0.05); if (--e.wl <= 0) { e.st = 'sink'; e.stT = 40; } }
              else if (--e.stT <= 0) e.gone = true;
              break;
            case 'crow':
              if (e.st === 'perch') { if (Math.abs(dx) < 90) { e.st = 'fly'; e.vx = Math.sign(dx) * (1.1 + diff() * 0.1); e.by = e.y; } }
              else { e.x += e.vx; e.y = e.by + Math.sin(e.age * 0.12) * 14 + (p.y - 14 - e.by) * Math.min(1, (e.age % 200) / 200) * 0.5; if (e.x < g.camX - 20 || e.x > g.camX + W + 20) e.gone = true; }
              break;
            case 'plant':
              if (--e.shootT <= 0 && Math.abs(dx) < 200) { e.shootT = Math.max(70, 140 - diff() * 15); aimShot(e.x, e.y - 14, 1.3 + diff() * 0.1, 'eye'); e.st = 20; }
              if (e.st > 0) e.st--;
              break;
            case 'arremer': {
              e.stT--;
              // dodge shots
              if (e.st !== 'swoop') for (const s of g.shots) if (Math.abs(s.y - e.y) < 14 && Math.sign(e.x - s.x) === Math.sign(s.vx) && Math.abs(e.x - s.x) < 50 && Math.random() < 0.1) { e.vy = -3; e.st = 'dodge'; e.stT = 30; }
              if (e.st === 'hover') {
                const tx = p.x + (e.x > p.x ? 60 : -60), ty = HUD + 50 + Math.sin(e.age * 0.05) * 20;
                e.x += Math.max(-1.4, Math.min(1.4, (tx - e.x) * 0.05)); e.y += Math.max(-1.2, Math.min(1.2, (ty - e.y) * 0.05));
                if (e.stT <= 0) {
                  if (Math.random() < 0.4) { aimShot(e.x, e.y, 1.6 + diff() * 0.1, 'fire'); e.stT = 50; }
                  else { e.st = 'swoop'; const a = Math.atan2(p.y - 12 - e.y, p.x - e.x); e.vx = Math.cos(a) * 2.8; e.vy = Math.sin(a) * 2.8; e.stT = 70; }
                }
              } else if (e.st === 'swoop') {
                e.x += e.vx; e.y += e.vy;
                if (e.y > HUD + 11 * T - 10) { e.y = HUD + 11 * T - 10; e.vy = 0; e.vx *= 1.0; }
                if (e.stT <= 0) { e.st = 'hover'; e.stT = 60 + Math.random() * 60; }
              } else {
                e.y += e.vy; e.vy *= 0.9;
                if (e.stT <= 0) { e.st = 'hover'; e.stT = 40; }
              }
              e.y = Math.max(HUD + 14, e.y);
              break;
            }
            case 'ogre':
              if (e.ground) {
                e.dir = dx > 0 ? 1 : -1;
                const sp = 0.4 + diff() * 0.05;
                const nx = e.x + e.dir * sp;
                if (!isSolid(tile(colOf(nx + e.dir * 10), rowOf(e.y - 1)))) e.x = nx;
                if (--e.jumpT <= 0) { e.jumpT = 120 + Math.random() * 100; e.vy = -3.4; e.ground = false; }
                if (!groundBelow(e.x, e.y)) e.ground = false;
              } else {
                e.vy += 0.2; e.y += e.vy; e.x += e.dir * 0.8;
                const r = rowOf(e.y);
                if (e.vy > 0 && standable(colOf(e.x), r) && e.y - e.vy <= HUD + r * T + 0.5) { e.y = HUD + r * T; e.ground = true; e.vy = 0; }
                if (e.y > H + 30) e.gone = true;
              }
              break;
            case 'bat':
              if (e.st === 'hang') { if (Math.abs(dx) < 70) { e.st = 'fly'; e.vx = Math.sign(dx) * 1.5; e.vy = 2.2; } }
              else { e.x += e.vx; e.y += e.vy; e.vy -= 0.045; if (e.y < HUD - 20 || e.x < g.camX - 30 || e.x > g.camX + W + 30) e.gone = true; }
              break;
            case 'knight':
              e.x -= 1.0 + diff() * 0.1; e.y = e.y0 + Math.sin(e.age * 0.06 + e.ph) * 26;
              if (e.x < g.camX - 30) e.gone = true;
              break;
          }
          if (e.t !== 'arremer' && e.t !== 'knight' && e.x < g.camX - 60) e.gone = true;
          // contact
          const live = !(e.t === 'zombie' && e.st === 'rise' && e.stT > 25) && !(e.t === 'bat' && e.st === 'hang');
          if (live && p.alive) {
            const ew = e.t === 'ogre' ? 12 : 7, eh = e.t === 'ogre' ? 28 : e.t === 'zombie' || e.t === 'plant' ? 20 : 10;
            const ey = e.t === 'zombie' || e.t === 'plant' || e.t === 'ogre' ? e.y - eh / 2 : e.y;
            if (Math.abs(p.x - e.x) < ew + 4 && Math.abs((p.y - pHeight(p) / 2) - ey) < eh / 2 + pHeight(p) / 2 - 2) hurtPlayer(e.x);
          }
        }
        g.en = g.en.filter(e => !e.gone);
      }
      function enemyBox(e) {
        if (e.t === 'zombie') { const hgt = e.st === 'walk' ? 20 : 20 * (e.st === 'rise' ? 1 - e.stT / 40 : e.stT / 40); return [e.x - 6, e.y - hgt, 12, hgt]; }
        if (e.t === 'plant') return [e.x - 7, e.y - 20, 14, 20];
        if (e.t === 'ogre') return [e.x - 12, e.y - 30, 24, 30];
        return [e.x - 8, e.y - 7, 16, 14];
      }
      function damageEnemy(e, dmg) {
        if (e.t === 'zombie' && e.st === 'rise' && e.stT > 30) return false;
        e.hp -= dmg; e.flash = 6; sfx.hit();
        if (e.hp <= 0) {
          e.gone = true; addScore(e.pts); pop(e.x, e.y - 20, e.pts); fx(e.x, e.y - 8, 'puff'); sfx.kill();
          g.kills++;
          if (e.t === 'arremer' || e.t === 'ogre' || g.kills % 9 === 0) dropItem(e.x, e.y - 12);
        }
        return true;
      }
      function dropItem(x, y) {
        let k;
        if (!g.p.armor && Math.random() < 0.45) k = 'armor';
        else if (Math.random() < 0.5) k = WEAPONS[Math.floor(Math.random() * 4)];
        else k = Math.random() < 0.7 ? 'money' : 'statue';
        g.items.push({ x, y: Math.min(y, HUD + 10 * T), k, vy: -2, life: 600 });
      }

      // ================= Bosses =================
      function spawnBoss() {
        const L = g.L, kind = STAGES[g.st].boss, ax = L.A0 * T;
        const hpBase = { unicorn: 10, dragon: 14, astaroth: 24 }[kind] + g.loop * 6 + (g.st === 1 ? 4 : 0);
        g.boss = { k: kind, x: ax + W - 50, y: HUD + 11 * T, vx: 0, vy: 0, hp: hpBase, max: hpBase, t: 0, st: 'enter', stT: 60, flash: 0, ground: true, segs: [], dead: 0 };
        if (kind === 'dragon') { g.boss.y = HUD + 60; for (let i = 0; i < 9; i++) g.boss.segs.push({ x: g.boss.x + i * 6, y: g.boss.y }); g.boss.trail = []; }
        if (kind === 'astaroth') g.boss.x = ax + W - 40;
        sfx.boss();
      }
      function updBoss() {
        const b = g.boss, p = g.p, ax = g.L.A0 * T;
        if (!b) return;
        b.t++; if (b.flash > 0) b.flash--;
        if (b.dead) {
          b.dead++;
          if (b.dead % 8 === 0) fx(b.x + (Math.random() - 0.5) * 30, b.y - 10 - Math.random() * 30, 'boom');
          if (b.dead === 100) { g.key = { x: b.x, y: HUD + 40, vy: 0 }; g.boss = null; }
          return;
        }
        const df = diff();
        if (b.k === 'unicorn') {
          b.stT--;
          if (b.ground) {
            b.dir = p.x < b.x ? -1 : 1;
            if (b.st === 'walk' || b.st === 'enter') {
              b.x += b.dir * 0.5;
              if (b.stT <= 0) {
                const r = Math.random();
                if (r < 0.45) { b.st = 'jump'; b.vy = -4.6; b.vx = b.dir * (1.4 + Math.random()); b.ground = false; }
                else { b.st = 'fire'; b.stT = 40; }
              }
            } else if (b.st === 'fire') {
              if (b.stT === 20 || (df > 1 && b.stT === 10)) { aimShot(b.x + b.dir * 10, b.y - 30, 2 + df * 0.15, 'fire'); }
              if (b.stT <= 0) { b.st = 'walk'; b.stT = 50 + Math.random() * 60; }
            }
          } else {
            b.vy += 0.2; b.x += b.vx; b.y += b.vy;
            if (b.y >= HUD + 11 * T) { b.y = HUD + 11 * T; b.ground = true; b.st = 'walk'; b.stT = 40 + Math.random() * 50; au.noise(0.15, { vol: 0.15, freq: 300 }); }
          }
          b.x = Math.max(ax + 20, Math.min(ax + W - 20, b.x));
          if (p.alive && Math.abs(p.x - b.x) < 18 && Math.abs((p.y - 11) - (b.y - 20)) < 26) hurtPlayer(b.x);
        } else if (b.k === 'dragon') {
          const cx = ax + W / 2, cy = HUD + 95;
          b.x = cx + Math.sin(b.t * 0.017) * 90; b.y = cy + Math.sin(b.t * 0.034) * 50 + Math.sin(b.t * 0.011) * 20;
          b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 90) b.trail.pop();
          for (let i = 0; i < b.segs.length; i++) { const tp = b.trail[Math.min(b.trail.length - 1, (i + 1) * 9)]; b.segs[i].x = tp.x; b.segs[i].y = tp.y; }
          if (b.t % Math.max(50, 100 - df * 10 | 0) === 0) aimShot(b.x, b.y, 1.8 + df * 0.15, 'fire');
          if (p.alive) {
            if (Math.abs(p.x - b.x) < 12 && Math.abs(p.y - 11 - b.y) < 16) hurtPlayer(b.x);
            for (const s of b.segs) if (Math.abs(p.x - s.x) < 9 && Math.abs(p.y - 11 - s.y) < 14) hurtPlayer(s.x);
          }
        } else {
          // Astaroth: stands its ground, fires from mouth and belly, lumbers forward occasionally
          b.stT--;
          if (b.stT <= 0) {
            const r = Math.random();
            if (r < 0.4) { aimShot(b.x - 10, b.y - 44, 2 + df * 0.15, 'fire'); b.stT = 50; }
            else if (r < 0.75) { for (let i = -1; i <= 1; i++) g.eb.push({ x: b.x - 14, y: b.y - 22, vx: -2.2, vy: i * 0.7, k: 'fire' }); b.stT = 70; }
            else { b.st = 'step'; b.stT = 60; }
          }
          if (b.st === 'step') { b.x += (p.x < b.x ? -0.5 : 0.5); if (b.stT <= 1) b.st = 'idle'; }
          b.x = Math.max(ax + 80, Math.min(ax + W - 30, b.x));
          if (p.alive && Math.abs(p.x - b.x) < 22 && p.y > b.y - 56) hurtPlayer(b.x);
        }
      }
      function bossHitBox(b) {
        if (b.k === 'unicorn') return [b.x - 14, b.y - 40, 28, 40];
        if (b.k === 'dragon') return [b.x - 10, b.y - 10, 20, 20];
        return [b.x - 22, b.y - 60, 44, 60];
      }

      // ================= Shots, items =================
      function updShots() {
        const p = g.p;
        for (const s of g.shots) {
          s.vy += s.g; s.x += s.vx; s.y += s.vy;
          if (s.x < g.camX - 10 || s.x > g.camX + W + 10 || s.y > H + 10) { s.dead = true; continue; }
          if (solidAtPx(s.x, s.y)) {
            s.dead = true;
            if (s.k === 'torch') { const r = rowOf(s.y); g.fires.push({ x: s.x, y: HUD + r * T, t: 50 }); au.noise(0.2, { vol: 0.1, freq: 800 }); }
            else fx(s.x, s.y, 'spark');
            continue;
          }
          for (const e of g.en) {
            if (e.gone || s.dead) continue;
            if (e.t === 'bat' && e.st === 'hang' && Math.abs(e.x - s.x) > 10) continue;
            const [x, y, w, h] = enemyBox(e);
            if (s.x > x && s.x < x + w && s.y > y && s.y < y + h) {
              if (s.pierce) { if (s.hitSet.includes(e)) continue; s.hitSet.push(e); damageEnemy(e, s.dmg); }
              else if (damageEnemy(e, s.dmg)) { s.dead = true; if (s.k === 'torch') g.fires.push({ x: s.x, y: e.y, t: 40 }); }
            }
          }
          const b = g.boss;
          if (b && !b.dead && !s.dead && !(s.pierce && s.hitSet.includes(b))) {
            const [x, y, w, h] = bossHitBox(b);
            if (s.x > x && s.x < x + w && s.y > y && s.y < y + h) {
              if (s.pierce) s.hitSet.push(b); else s.dead = true;
              b.hp -= s.dmg; b.flash = 6; sfx.hit();
              if (b.hp <= 0) { b.dead = 1; const pts = { unicorn: 2000, dragon: 3000, astaroth: 10000 }[b.k]; addScore(pts); pop(b.x, b.y - 50, pts); sfx.bossdie(); g.eb = []; }
            }
          }
        }
        g.shots = g.shots.filter(s => !s.dead);
        for (const f of g.fires) {
          f.t--;
          for (const e of g.en) { if (e.gone) continue; const [x, y, w, h] = enemyBox(e); if (f.x > x - 6 && f.x < x + w + 6 && f.y > y && f.y - 10 < y + h && f.t % 10 === 0) damageEnemy(e, 1); }
        }
        g.fires = g.fires.filter(f => f.t > 0);
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy;
          if (b.x < g.camX - 10 || b.x > g.camX + W + 10 || b.y < 0 || b.y > H + 10) { b.dead = true; continue; }
          if (p.alive && Math.abs(b.x - p.x) < 6 && b.y > p.y - pHeight(p) && b.y < p.y) { b.dead = true; hurtPlayer(b.x); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        for (const it of g.items) {
          if (!it.fixed) {
            it.vy = Math.min(3, it.vy + 0.15); const ny = it.y + it.vy;
            const r = rowOf(ny);
            if (it.vy > 0 && standable(colOf(it.x), r) && it.y <= HUD + r * T + 0.5) { it.y = HUD + r * T; it.vy = 0; } else it.y = ny;
            if (--it.life <= 0 || it.y > H + 10) it.gone = true;
          }
          if (p.alive && Math.abs(it.x - p.x) < 10 && it.y > p.y - 24 && it.y - 12 < p.y) {
            it.gone = true; sfx.pick();
            if (WEAPONS.includes(it.k)) { g.weapon = it.k; addScore(200); pop(it.x, it.y - 16, 200); }
            else if (it.k === 'armor') { g.p.armor = true; addScore(200); }
            else if (it.k === 'money') { addScore(500); pop(it.x, it.y - 16, 500); }
            else { addScore(1000); pop(it.x, it.y - 16, 1000); }
          }
        }
        g.items = g.items.filter(it => !it.gone);
        for (const f of g.fx) { f.t++; if (f.k === 'armor') { f.x += f.vx; f.y += f.vy; f.vy += 0.2; } }
        g.fx = g.fx.filter(f => f.t < (f.k === 'armor' ? 50 : f.k === 'boom' ? 24 : 16));
        for (const q of g.pops) q.t--;
        g.pops = g.pops.filter(q => q.t > 0);
      }

      function updPlay() {
        const p = g.p, L = g.L;
        if (--g.timeT <= 0) { g.timeT = 60; g.time--; if (g.time <= 20 && g.time > 0) au.tone(880, 0.05, { type: 'square', vol: 0.06 }); if (g.time <= 0) { g.time = 0; killPlayer(); return; } }
        for (const rf of g.rafts) { rf.x += rf.vx; if (rf.x < rf.x0 || rf.x > rf.x1) rf.vx = -rf.vx; }
        updPlayer();
        if (!g.checkpoint && p.x > L.mid * T) g.checkpoint = true;
        // camera
        const arena = L.A0 * T;
        if (!g.bossLock) {
          const target = p.x - 100;
          g.camX = Math.max(0, Math.min(L.N * T - W, Math.max(g.camX - 2, Math.min(g.camX + 2.5, target))));
          if (g.camX >= arena - 1 || p.x > arena + 60) { g.camX = arena; g.bossLock = true; spawnBoss(); g.en = g.en.filter(e => e.x > arena - 10); }
        }
        spawnFromList();
        dynamicSpawns();
        updEnemies();
        updBoss();
        updShots();
        if (g.key) {
          g.key.vy = Math.min(2, g.key.vy + 0.1); g.key.y = Math.min(HUD + 11 * T - 4, g.key.y + g.key.vy);
          if (p.alive && Math.abs(g.key.x - p.x) < 14 && g.key.y > p.y - 30) {
            g.key = null; g.phase = 'clear'; g.phaseT = 300; sfx.clear();
            g.bonus = g.time * 10 * (g.st + 1); addScore(g.bonus);
          }
        }
      }

      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newGame(); }
            else { coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 }); }
          }
          return;
        }
        switch (g.phase) {
          case 'intro':
            g.phaseT--;
            if (g.phaseT <= 0 || (g.phaseT < 260 && api.anyPressed('Enter', 'Space'))) { g.phase = 'map'; g.phaseT = 160; }
            break;
          case 'map':
            if (--g.phaseT <= 0) startStage();
            break;
          case 'ready':
            if (--g.phaseT <= 0) g.phase = 'play';
            break;
          case 'play': updPlay(); break;
          case 'dead':
            for (const f of g.fx) f.t++;
            updShots();
            if (--g.phaseT <= 0) {
              if (g.lives > 1) { g.lives--; startStage(); }
              else {
                g.phase = 'wait';
                const cg = g;
                if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 3; startStage(); } }, () => { if (g === cg) gameOver(); });
                else gameOver();
              }
            }
            break;
          case 'clear':
            if (--g.phaseT <= 0) {
              g.st++; g.checkpoint = false;
              if (g.st >= STAGES.length) { g.st = 0; g.loop++; g.phase = 'illusion'; g.phaseT = 360; }
              else { g.phase = 'map'; g.phaseT = 160; }
            }
            break;
          case 'illusion':
            if (--g.phaseT <= 0) { g.phase = 'map'; g.phaseT = 160; }
            break;
          case 'over':
            if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; }
            break;
        }
      }
      function gameOver() { g.phase = 'over'; g.phaseT = 300; au.melody([[294, .3], [277, .3], [262, .3], [247, .8]], { type: 'triangle', vol: 0.14 }); }

      // ================= Drawing: characters =================
      function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
      function drawArthur(ctx, x, y, dir, pose, armor, step) {
        x = Math.round(x); y = Math.round(y);
        const steel = '#c8d0e0', dk = '#7880a0', skin = '#f0b080';
        const f = dir;
        const crouch = pose === 'crouch';
        const top = crouch ? y - 14 : y - 22;
        // legs
        if (pose === 'climb') {
          const s = step & 1;
          R(ctx, x - 4, y - 8 + (s ? -2 : 0), 3, 8, armor ? dk : skin); R(ctx, x + 1, y - 8 + (s ? 0 : -2), 3, 8, armor ? dk : skin);
          R(ctx, x - 5, top + 6, 10, 9, armor ? steel : skin);
          if (!armor) R(ctx, x - 5, top + 12, 10, 4, '#ffffff');
          R(ctx, x - 4, top, 8, 7, armor ? steel : '#8a5a2a');
          R(ctx, x - 7, top + 4 + (s ? 0 : 3), 2, 5, armor ? steel : skin); R(ctx, x + 5, top + 4 + (s ? 3 : 0), 2, 5, armor ? steel : skin);
          return;
        }
        if (crouch) {
          R(ctx, x - 5, y - 4, 11, 4, armor ? dk : skin);
        } else if (pose === 'jump') {
          R(ctx, x - 5, y - 8, 4, 5, armor ? dk : skin); R(ctx, x + 2, y - 6, 4, 4, armor ? dk : skin);
        } else {
          const s = pose === 'run' ? step % 2 : -1;
          if (s === 0) { R(ctx, x - 5, y - 8, 3, 8, armor ? dk : skin); R(ctx, x + 2, y - 8, 3, 6, armor ? dk : skin); R(ctx, x + 2, y - 2, 4, 2, '#503018'); R(ctx, x - 6, y - 1, 4, 1, '#503018'); }
          else if (s === 1) { R(ctx, x - 2, y - 8, 4, 8, armor ? dk : skin); R(ctx, x - 2, y - 1, 5, 1, '#503018'); }
          else { R(ctx, x - 4, y - 8, 3, 8, armor ? dk : skin); R(ctx, x + 1, y - 8, 3, 8, armor ? dk : skin); R(ctx, x - 4, y - 1, 3, 1, '#503018'); R(ctx, x + 1, y - 1, 3, 1, '#503018'); }
        }
        // body
        const by = crouch ? y - 11 : y - 15;
        if (armor) {
          R(ctx, x - 5, by, 10, 8, steel); R(ctx, x - 5, by + 6, 10, 2, dk); R(ctx, x - 1, by + 1, 2, 4, '#ffffff');
        } else {
          R(ctx, x - 4, by, 8, 5, skin); R(ctx, x - 5, by + 5, 10, 4, '#ffffff'); R(ctx, x - 3, by + 6, 2, 2, '#e02020'); R(ctx, x + 1, by + 6, 2, 2, '#e02020');
        }
        // arm (throwing forward)
        const thr = pose === 'throw';
        R(ctx, x + f * (thr ? 5 : 3) - (f < 0 ? 3 : 0), by + 1 + (thr ? 0 : 2), thr ? 5 : 3, 3, armor ? steel : skin);
        // head
        const hy = by - 7;
        if (armor) {
          R(ctx, x - 4, hy, 8, 7, steel); R(ctx, x + (f > 0 ? 1 : -4), hy + 3, 3, 2, '#202030');
          R(ctx, x - 2 - f * 2, hy - 3, 3, 3, '#e02020'); R(ctx, x - 4 - f * 3, hy - 2, 3, 2, '#e02020');
        } else {
          R(ctx, x - 3, hy + 1, 7, 6, skin); R(ctx, x - 4, hy, 8, 3, '#7a4a1a'); R(ctx, x + (f > 0 ? 2 : -3), hy + 3, 1, 1, '#000');
          R(ctx, x - 3, hy + 5, 6, 1, '#7a4a1a');
        }
      }
      function drawBones(ctx, x, y, t) {
        x = Math.round(x); y = Math.round(y);
        const f = Math.min(1, t / 40);
        if (f < 1) {
          R(ctx, x - 3, y - 22 + f * 14, 6, 6, '#f0f0e0'); R(ctx, x - 2, y - 20 + f * 14, 1, 1, '#000'); R(ctx, x + 1, y - 20 + f * 14, 1, 1, '#000');
          R(ctx, x - 4, y - 15 + f * 10, 8, 2, '#f0f0e0'); R(ctx, x - 4, y - 12 + f * 7, 8, 2, '#f0f0e0'); R(ctx, x - 1, y - 16 + f * 10, 2, 10, '#f0f0e0');
          R(ctx, x - 3, y - 6, 2, 6, '#f0f0e0'); R(ctx, x + 1, y - 6, 2, 6, '#f0f0e0');
        } else {
          R(ctx, x - 8, y - 3, 16, 3, '#f0f0e0'); R(ctx, x - 3, y - 7, 6, 5, '#f0f0e0'); R(ctx, x - 2, y - 6, 1, 1, '#000'); R(ctx, x + 1, y - 6, 1, 1, '#000');
          R(ctx, x - 10, y - 2, 4, 2, '#d8d8c8'); R(ctx, x + 6, y - 2, 4, 2, '#d8d8c8');
        }
      }
      function drawWeaponIcon(ctx, k, x, y, dir) {
        x = Math.round(x); y = Math.round(y); dir = dir || 1;
        if (k === 'lance') { R(ctx, x - 7, y - 1, 12, 2, '#d0d0e0'); R(ctx, dir > 0 ? x + 5 : x - 10, y - 2, 4, 4, '#ffffff'); R(ctx, dir > 0 ? x - 8 : x + 5, y - 1, 3, 2, '#a07040'); }
        else if (k === 'dagger') { R(ctx, x - 5, y - 1, 8, 2, '#ffffff'); R(ctx, dir > 0 ? x - 7 : x + 3, y - 2, 2, 4, '#e0c040'); }
        else if (k === 'torch') { R(ctx, x - 1, y - 1, 3, 6, '#a07040'); R(ctx, x - 2, y - 5, 5, 4, (frame >> 2) & 1 ? '#ff8020' : '#ffd040'); R(ctx, x - 1, y - 7, 3, 2, '#ff4010'); }
        else if (k === 'axe') {
          const a = frame * 0.4; ctx.save(); ctx.translate(x, y); ctx.rotate(a * dir);
          R(ctx, -1, -5, 2, 10, '#a07040'); R(ctx, -4, -5, 8, 4, '#d0d0e0'); R(ctx, -4, -6, 2, 6, '#ffffff'); ctx.restore();
        }
      }
      function drawItem(ctx, it) {
        const x = Math.round(it.x - g.camX), y = Math.round(it.y);
        if (it.life && it.life < 120 && (frame & 4)) return;
        if (WEAPONS.includes(it.k)) { R(ctx, x - 8, y - 12, 16, 12, 'rgba(0,0,0,0.4)'); drawWeaponIcon(ctx, it.k, x, y - 6, 1); }
        else if (it.k === 'armor') { R(ctx, x - 6, y - 12, 12, 10, '#c8d0e0'); R(ctx, x - 6, y - 4, 12, 2, '#7880a0'); R(ctx, x - 1, y - 11, 2, 6, '#ffffff'); if (frame & 8) R(ctx, x - 8, y - 14, 2, 2, '#ffffff'); }
        else if (it.k === 'money') { R(ctx, x - 5, y - 9, 10, 9, '#c09040'); R(ctx, x - 3, y - 11, 6, 2, '#a07020'); text(ctx, '$', x - 2, y - 8, '#603000'); R(ctx, x - 2, y - 8, 4, 6, '#ffe060'); }
        else { R(ctx, x - 4, y - 14, 8, 14, '#e0c040'); R(ctx, x - 2, y - 17, 4, 4, '#e0c040'); R(ctx, x - 1, y - 11, 2, 6, '#fff080'); }
      }
      function drawEnemy(ctx, e) {
        const x = Math.round(e.x - g.camX), y = Math.round(e.y);
        if (x < -40 || x > W + 40) return;
        const fl = e.flash > 0 && (e.flash & 2);
        switch (e.t) {
          case 'zombie': {
            const hgt = e.st === 'walk' ? 20 : Math.round(20 * (e.st === 'rise' ? 1 - e.stT / 40 : e.stT / 40));
            ctx.save(); ctx.beginPath(); ctx.rect(x - 12, y - 24, 24, 24); ctx.clip();
            const oy = 20 - hgt, col = fl ? '#ffffff' : '#4a6ac0', skin = fl ? '#ffffff' : '#7ab0a0';
            const s = (e.age >> 4) & 1, d = e.dir;
            R(ctx, x - 4, y - 8 + oy, 3, 8, col); R(ctx, x + 1, y - 8 + oy + (s ? 1 : 0), 3, 7, col);
            R(ctx, x - 5, y - 15 + oy, 10, 8, col);
            R(ctx, x - 3, y - 21 + oy, 7, 6, skin); R(ctx, x + (d > 0 ? 1 : -2), y - 19 + oy, 2, 1, '#ff2020');
            R(ctx, x + (d > 0 ? 4 : -10), y - 13 + oy, 6, 2, skin);
            ctx.restore();
            if (e.st !== 'walk') { R(ctx, x - 8, y - 2, 16, 2, '#3a2a1a'); R(ctx, x - 6, y - 4, 3, 2, '#5a3a1a'); R(ctx, x + 3, y - 3, 3, 1, '#5a3a1a'); }
            break;
          }
          case 'crow': {
            const col = fl ? '#fff' : '#3050c0';
            if (e.st === 'perch') { R(ctx, x - 4, y - 6, 8, 6, col); R(ctx, x - 3, y - 9, 5, 4, col); R(ctx, x - 5, y - 8, 2, 1, '#ff2020'); R(ctx, x - 6, y - 7, 2, 1, '#ffd040'); }
            else { const wf = (e.age >> 3) & 1; R(ctx, x - 4, y - 2, 9, 4, col); R(ctx, x - 9, y - (wf ? 6 : -1), 6, 3, col); R(ctx, x + 4, y - (wf ? 6 : -1), 6, 3, col); R(ctx, x + (e.vx > 0 ? 5 : -7), y - 2, 3, 2, '#ffd040'); R(ctx, x + (e.vx > 0 ? 3 : -4), y - 2, 1, 1, '#ff2020'); }
            break;
          }
          case 'plant': {
            const open = e.st > 0;
            R(ctx, x - 1, y - 10, 3, 10, '#2a8a2a'); R(ctx, x - 7, y - 5, 6, 3, '#3aa03a'); R(ctx, x + 2, y - 7, 6, 3, '#3aa03a');
            R(ctx, x - 7, y - 21, 14, 12, fl ? '#fff' : '#e04040');
            R(ctx, x - 5, y - (open ? 17 : 15), 10, open ? 5 : 2, '#400000');
            R(ctx, x - 4, y - 19, 2, 2, '#ffffff'); R(ctx, x + 2, y - 19, 2, 2, '#ffffff');
            break;
          }
          case 'arremer': {
            const col = fl ? '#fff' : '#d02020', wf = (e.age >> 2) & 1;
            R(ctx, x - 5, y - 6, 10, 12, col); R(ctx, x - 4, y - 12, 8, 7, col);
            R(ctx, x - 5, y - 15, 2, 4, '#f0e0c0'); R(ctx, x + 3, y - 15, 2, 4, '#f0e0c0');
            R(ctx, x - 3, y - 10, 2, 2, '#ffff40'); R(ctx, x + 1, y - 10, 2, 2, '#ffff40');
            R(ctx, x - 2, y - 7, 4, 1, '#fff');
            R(ctx, x - 15, y - (wf ? 12 : 4), 10, 8, '#8a1010'); R(ctx, x + 5, y - (wf ? 12 : 4), 10, 8, '#8a1010');
            R(ctx, x - 15, y - (wf ? 12 : 4), 10, 2, '#d04040'); R(ctx, x + 5, y - (wf ? 12 : 4), 10, 2, '#d04040');
            R(ctx, x - 4, y + 6, 3, 4, col); R(ctx, x + 1, y + 6, 3, 4, col);
            break;
          }
          case 'ogre': {
            const col = fl ? '#fff' : '#a07850', s = (e.age >> 4) & 1;
            R(ctx, x - 9, y - 10, 7, 10 - s * 2, '#6a4a2a'); R(ctx, x + 2, y - 10, 7, 8 + s * 2, '#6a4a2a');
            R(ctx, x - 12, y - 26, 24, 17, col); R(ctx, x - 8, y - 33, 16, 8, col);
            R(ctx, x - 5, y - 30, 3, 2, '#ff2020'); R(ctx, x + 2, y - 30, 3, 2, '#ff2020');
            R(ctx, x - 12, y - 14, 24, 3, '#5a3a20');
            R(ctx, x + e.dir * 12 - 3, y - 24, 6, 12, col);
            break;
          }
          case 'bat': {
            const col = fl ? '#fff' : '#9040c0';
            if (e.st === 'hang') { R(ctx, x - 3, y - 4, 6, 8, col); R(ctx, x - 1, y - 6, 2, 2, '#5a5a5a'); }
            else { const wf = (e.age >> 2) & 1; R(ctx, x - 3, y - 3, 6, 6, col); R(ctx, x - 10, y - (wf ? 5 : 0), 7, 3, col); R(ctx, x + 3, y - (wf ? 5 : 0), 7, 3, col); R(ctx, x - 2, y - 1, 1, 1, '#ff4040'); R(ctx, x + 1, y - 1, 1, 1, '#ff4040'); }
            break;
          }
          case 'knight': {
            const col = fl ? '#fff' : '#3a8a5a';
            R(ctx, x - 5, y - 8, 10, 14, col); R(ctx, x - 4, y - 13, 8, 6, '#a0a0b0'); R(ctx, x - 3, y - 11, 2, 2, '#000');
            R(ctx, x - 10, y - 9, 5, 16, '#c0a040'); R(ctx, x - 9, y - 7, 3, 12, '#e8d070');
            R(ctx, x + 5, y - 2, 6, 2, '#a0a0b0');
            break;
          }
        }
      }
      function drawBoss(ctx, b) {
        const x = Math.round(b.x - g.camX), y = Math.round(b.y), fl = b.flash > 0 && (b.flash & 2);
        if (b.dead && b.dead & 4) return;
        if (b.k === 'unicorn') {
          const col = fl ? '#fff' : (g.st === 1 ? '#3a9a5a' : '#c04848'), dk = g.st === 1 ? '#1a5a3a' : '#7a2020';
          const d = b.dir || -1;
          R(ctx, x - 12, y - 14, 9, 14, dk); R(ctx, x + 3, y - 14, 9, 14, dk);
          R(ctx, x - 14, y - 34, 28, 22, col); R(ctx, x - 10, y - 44, 20, 12, col);
          R(ctx, x - 3, y - 41, 6, 6, '#ffffff'); R(ctx, x - 1 + d, y - 39, 2, 2, '#000');
          R(ctx, x - 1, y - 50, 2, 6, '#f0e0a0'); R(ctx, x - 6, y - 34, 12, 2, '#000');
          R(ctx, x + d * 14 - 3, y - 32, 6, 16, col); R(ctx, x - d * 14 - 3, y - 30, 6, 14, col);
          R(ctx, x - 14, y - 20, 28, 3, dk);
        } else if (b.k === 'dragon') {
          for (let i = b.segs.length - 1; i >= 0; i--) {
            const s = b.segs[i], sx = Math.round(s.x - g.camX), sy = Math.round(s.y), r = 7 - i * 0.4;
            ctx.fillStyle = fl ? '#fff' : (i & 1 ? '#3a8a3a' : '#5aaa4a'); ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
            R(ctx, sx - 1, sy - r - 2, 2, 3, '#e0c040');
          }
          const d = b.trail.length > 2 && b.trail[0].x < b.trail[2].x ? -1 : 1;
          R(ctx, x - 9, y - 7, 18, 14, fl ? '#fff' : '#6aca5a'); R(ctx, x + d * 6 - 4, y - 3, 10, 8, fl ? '#fff' : '#6aca5a');
          R(ctx, x + d * 2 - 1, y - 5, 3, 3, '#ff2020'); R(ctx, x + d * 10 - 2, y + 2, 5, 2, '#400000');
          R(ctx, x - 6, y - 11, 2, 5, '#e0e0c0'); R(ctx, x + 3, y - 11, 2, 5, '#e0e0c0');
        } else {
          const col = fl ? '#fff' : '#3a7ad0', dk = '#1a3a80';
          R(ctx, x - 18, y - 16, 12, 16, dk); R(ctx, x + 6, y - 16, 12, 16, dk);
          R(ctx, x - 22, y - 48, 44, 34, col);
          R(ctx, x - 14, y - 36, 22, 16, '#e8d080'); R(ctx, x - 8, y - 30, 10, 6, '#400000'); R(ctx, x - 6, y - 30, 2, 2, '#fff'); R(ctx, x, y - 30, 2, 2, '#fff');
          R(ctx, x - 14, y - 62, 24, 16, col); R(ctx, x - 10, y - 57, 4, 3, '#ffff40'); R(ctx, x + 2, y - 57, 4, 3, '#ffff40');
          R(ctx, x - 12, y - 50, 18, 3, '#400000');
          R(ctx, x - 18, y - 68, 4, 8, '#f0e0c0'); R(ctx, x + 10, y - 68, 4, 8, '#f0e0c0');
          R(ctx, x - 30, y - 44, 8, 22, col); R(ctx, x + 22, y - 44, 8, 22, col);
        }
      }

      // ================= Drawing: world =================
      function drawBackground(ctx, L) {
        const S = STAGES[L.st];
        ctx.fillStyle = S.sky; ctx.fillRect(0, HUD, W, H - HUD);
        const px = g.camX * 0.3;
        if (L.st === 0 || L.st === 2) {
          ctx.fillStyle = '#e8e8c0'; ctx.beginPath(); ctx.arc(200 - (px * 0.2) % 300, 44, 12, 0, 7); ctx.fill();
          ctx.fillStyle = S.sky; ctx.beginPath(); ctx.arc(196 - (px * 0.2) % 300, 41, 11, 0, 7); ctx.fill();
        }
        ctx.fillStyle = S.far;
        for (let i = -1; i < 10; i++) {
          const bx = i * 40 - (px % 40), hgt = 30 + hash(i + Math.floor(px / 40)) * 40;
          if (L.st === 1) { ctx.beginPath(); ctx.moveTo(bx, HUD + 176); ctx.lineTo(bx + 20, HUD + 176 - hgt - 30); ctx.lineTo(bx + 40, HUD + 176); ctx.fill(); }
          else if (L.st === 2) { ctx.fillRect(bx + 4, HUD + 176 - hgt, 30, hgt); ctx.beginPath(); ctx.moveTo(bx + 2, HUD + 176 - hgt); ctx.lineTo(bx + 19, HUD + 160 - hgt); ctx.lineTo(bx + 36, HUD + 176 - hgt); ctx.fill(); }
          else if (L.st === 3) { ctx.fillRect(bx, HUD, 40, 10 + hgt * 0.3); ctx.fillRect(bx + 10, HUD + 150 - hgt * 0.5, 20, 60); }
          else { ctx.beginPath(); ctx.ellipse(bx + 20, HUD + 176, 30, hgt, 0, Math.PI, 0); ctx.fill(); }
        }
        // deco
        for (const d of L.deco) {
          const x = d.c * T - g.camX;
          if (x < -120 || x > W + 20) continue;
          if (d.k === 'tree') {
            R(ctx, x + 4, HUD + 120, 8, 56, '#3a2a14'); ctx.fillStyle = '#1a4a1a'; ctx.beginPath(); ctx.arc(x + 8, HUD + 110, 22, 0, 7); ctx.fill();
            ctx.fillStyle = '#2a5a22'; ctx.beginPath(); ctx.arc(x + 2, HUD + 104, 12, 0, 7); ctx.fill();
          } else if (d.k === 'house') {
            const w = d.w * T;
            R(ctx, x, HUD + 7 * T, w, 4 * T, '#3a3040'); R(ctx, x + 2 * T, HUD + 3 * T, w - 4 * T, 4 * T, '#463a4e');
            ctx.fillStyle = '#5a2a2a'; ctx.beginPath(); ctx.moveTo(x + 2 * T - 6, HUD + 3 * T); ctx.lineTo(x + w / 2, HUD + 3 * T - 30); ctx.lineTo(x + w - 2 * T + 6, HUD + 3 * T); ctx.fill();
            for (let k = 0; k < d.w - 2; k += 3) { R(ctx, x + 12 + k * T, HUD + 8 * T + 4, 10, 14, '#ffd860'); R(ctx, x + 16 + k * T, HUD + 8 * T + 4, 2, 14, '#3a3040'); }
            for (let k = 2; k < d.w - 4; k += 3) R(ctx, x + 12 + k * T, HUD + 4 * T + 4, 10, 12, '#ffd860');
          } else if (d.k === 'stal') {
            ctx.fillStyle = '#4a2010';
            ctx.beginPath(); ctx.moveTo(x, HUD + T); ctx.lineTo(x + 8, HUD + T + d.h * 12); ctx.lineTo(x + 16, HUD + T); ctx.fill();
          }
        }
      }
      function drawTiles(ctx, L) {
        const S = STAGES[L.st];
        const c0 = Math.floor(g.camX / T), c1 = c0 + W / T + 1;
        for (let c = c0; c <= c1; c++) {
          if (c < 0 || c >= L.N) continue;
          const x = Math.round(c * T - g.camX);
          for (let r = 0; r < ROWS; r++) {
            const v = L.grid[r][c], y = HUD + r * T;
            if (v === 1) {
              const exposed = r > 0 && L.grid[r - 1][c] !== 1;
              R(ctx, x, y, T, T, S.ground);
              ctx.fillStyle = 'rgba(0,0,0,0.25)'; if (hash(c * 31 + r) > 0.5) ctx.fillRect(x + 3, y + 5, 4, 3); if (hash(c * 17 + r * 5) > 0.6) ctx.fillRect(x + 10, y + 10, 3, 3);
              if (exposed) { R(ctx, x, y, T, 4, S.top); R(ctx, x + (c * 5) % 12, y + 4, 3, 2, S.top); }
            } else if (v === 2) {
              R(ctx, x, y, T, 6, S.top); R(ctx, x, y + 5, T, 2, 'rgba(0,0,0,0.4)');
              if (L.st === 2) { R(ctx, x, y, T, 2, '#8a8a92'); }
            } else if (v === 3) {
              R(ctx, x + 3, y, 2, T, '#a07040'); R(ctx, x + 11, y, 2, T, '#a07040');
              R(ctx, x + 3, y + 3, 10, 2, '#c09060'); R(ctx, x + 3, y + 11, 10, 2, '#c09060');
              if (L.grid[r - 1] && L.grid[r - 1][c] !== 3) R(ctx, x, y, T, 3, S.top);
            } else if (v === 5) {
              R(ctx, x + 2, y + 2, 12, 14, '#8a8a90'); R(ctx, x + 4, y, 8, 3, '#8a8a90'); R(ctx, x + 3, y + 3, 2, 12, '#a8a8b0');
              R(ctx, x + 7, y + 4, 2, 7, '#5a5a60'); R(ctx, x + 5, y + 6, 6, 2, '#5a5a60');
            }
          }
          // pits: water / lava at the bottom
          if (L.grid[ROWS - 1][c] === 0) {
            const col = L.lava ? ((frame >> 3) & 1 ? '#ff5010' : '#ff8020') : '#2050a0';
            R(ctx, x, HUD + 12 * T + 4, T, 12, col);
            R(ctx, x + ((frame >> 3) + c * 3) % 12, HUD + 12 * T + 4, 4, 1, L.lava ? '#ffd040' : '#60a0e0');
          }
        }
        for (const rf of g.rafts) {
          const x = Math.round(rf.x - g.camX);
          R(ctx, x, rf.y, rf.w, 6, L.lava ? '#6a5a50' : '#8a6030'); R(ctx, x, rf.y, rf.w, 2, L.lava ? '#9a8a80' : '#b08040');
          for (let i = 4; i < rf.w; i += 8) R(ctx, x + i, rf.y + 2, 1, 4, '#4a3018');
        }
        if (L.st !== 3) {
          // finish gate in the arena
          const gx = Math.round((L.N - 2) * T - g.camX);
          if (gx < W + 10) { R(ctx, gx, HUD + 5 * T, 6, 6 * T, '#606070'); R(ctx, gx + 20, HUD + 5 * T, 6, 6 * T, '#606070'); R(ctx, gx - 2, HUD + 5 * T - 4, 30, 6, '#808090'); }
        }
      }
      function drawShot(ctx, s) {
        const x = s.x - g.camX;
        if (s.k === 'lance' || s.k === 'dagger') drawWeaponIcon(ctx, s.k, x, s.y, Math.sign(s.vx));
        else drawWeaponIcon(ctx, s.k, x, s.y, Math.sign(s.vx));
      }
      function hud(ctx) {
        R(ctx, 0, 0, W, HUD, '#000');
        text(ctx, 'PLAYER', 8, 0, '#ff4040'); text(ctx, String(g ? g.score : 0).padStart(7, ' '), 8, 8, '#ffffff');
        text(ctx, 'TOP SCORE', W / 2 - 4, 0, '#ff4040', { center: true }); text(ctx, String(hi).padStart(7, ' '), W / 2 - 30, 8, '#ffffff');
        if (g && g.L && (g.phase === 'play' || g.phase === 'ready' || g.phase === 'dead' || g.phase === 'clear')) {
          const m = Math.floor(g.time / 60), s = g.time % 60;
          text(ctx, 'TIME', W - 40, 0, '#ffe040'); text(ctx, m + ':' + String(s).padStart(2, '0'), W - 40, 8, g.time <= 20 && (frame & 16) ? '#ff4040' : '#ffffff');
        }
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        if (g.phase === 'intro') { renderIntro(ctx); hud(ctx); return; }
        if (g.phase === 'map' || g.phase === 'illusion' || ((g.phase === 'wait' || g.phase === 'over') && !g.L)) { renderMap(ctx); hud(ctx); return; }
        const L = g.L;
        drawBackground(ctx, L);
        drawTiles(ctx, L);
        for (const it of g.items) drawItem(ctx, it);
        for (const f of g.fires) { const x = Math.round(f.x - g.camX); R(ctx, x - 6, f.y - 10 + ((frame >> 2) & 1) * 2, 12, 10 - ((frame >> 2) & 1) * 2, '#ff6010'); R(ctx, x - 3, f.y - 7, 6, 7, '#ffd040'); }
        for (const e of g.en) drawEnemy(ctx, e);
        if (g.boss) drawBoss(ctx, g.boss);
        if (g.key) { const x = Math.round(g.key.x - g.camX), y = Math.round(g.key.y); R(ctx, x - 2, y - 14, 4, 12, '#ffe040'); R(ctx, x - 5, y - 20, 10, 7, '#ffe040'); R(ctx, x - 2, y - 18, 4, 3, '#000'); R(ctx, x + 2, y - 6, 4, 2, '#ffe040'); }
        const p = g.p;
        if (p.alive) {
          if (!(p.inv > 0 && (p.inv & 2))) {
            const pose = p.climb ? 'climb' : p.crouch ? 'crouch' : !p.ground ? 'jump' : p.throwT > 4 ? 'throw' : p.vx ? 'run' : 'stand';
            drawArthur(ctx, p.x - g.camX, p.y, p.dir, pose, p.armor, p.step);
          }
        } else if (g.phase === 'dead' || g.phase === 'wait' || g.phase === 'over') {
          if (p.y < H) drawBones(ctx, p.x - g.camX, p.y, 150 - g.phaseT);
        }
        for (const s of g.shots) drawShot(ctx, s);
        for (const b of g.eb) {
          const x = Math.round(b.x - g.camX), y = Math.round(b.y);
          if (b.k === 'eye') { R(ctx, x - 2, y - 2, 5, 5, '#ffffff'); R(ctx, x, y, 2, 2, '#2040ff'); }
          else { R(ctx, x - 3, y - 3, 6, 6, (frame >> 1) & 1 ? '#ff6010' : '#ffd040'); R(ctx, x - 1, y - 1, 2, 2, '#ffffff'); }
        }
        for (const f of g.fx) {
          const x = Math.round(f.x - g.camX), y = Math.round(f.y);
          if (f.k === 'armor') R(ctx, x - 2, y - 2, 5, 4, '#c8d0e0');
          else if (f.k === 'spark') R(ctx, x - 1, y - 1, 3, 3, '#ffffff');
          else { const r = f.k === 'boom' ? 4 + f.t * 0.8 : 2 + f.t * 0.6; ctx.fillStyle = f.t < 6 ? '#ffffff' : f.t < 12 ? '#ffd040' : '#ff6010'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
        }
        for (const q of g.pops) text(ctx, q.n, q.x - g.camX, Math.round(q.y - (50 - q.t) * 0.3), '#ffffff', { center: true });
        if (g.boss && !g.boss.dead) { R(ctx, W / 2 - 51, H - 10, 102, 6, '#000'); R(ctx, W / 2 - 50, H - 9, Math.max(0, 100 * g.boss.hp / g.boss.max), 4, '#ff3030'); }
        hud(ctx);
        // lives and weapon
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) { R(ctx, 4 + i * 10, H - 12, 7, 8, '#c8d0e0'); R(ctx, 5 + i * 10, H - 15, 5, 4, '#c8d0e0'); R(ctx, 4 + i * 10, H - 16, 3, 2, '#e02020'); }
        R(ctx, W - 28, H - 16, 24, 14, 'rgba(0,0,0,0.6)'); drawWeaponIcon(ctx, g.weapon, W - 16, H - 9, 1);
        if (g.phase === 'ready') {
          R(ctx, 50, 80, W - 100, 40, 'rgba(0,0,0,0.6)');
          text(ctx, 'STAGE ' + (g.st + 1), W / 2, 88, '#ffffff', { center: true });
          text(ctx, STAGES[g.st].name, W / 2, 104, '#ffe040', { center: true });
        }
        if (g.phase === 'clear') {
          R(ctx, 40, 70, W - 80, 56, 'rgba(0,0,0,0.65)');
          text(ctx, 'STAGE CLEAR', W / 2, 78, '#ffe040', { center: true, scale: 2 });
          text(ctx, 'TIME BONUS ' + g.bonus, W / 2, 104, '#ffffff', { center: true });
        }
        if (g.phase === 'over') { R(ctx, 60, 96, W - 120, 28, 'rgba(0,0,0,0.7)'); text(ctx, 'GAME OVER', W / 2, 106, '#ff3030', { center: true }); }
      }
      function renderMap(ctx) {
        R(ctx, 0, HUD, W, H - HUD, '#2a1a10');
        R(ctx, 12, HUD + 12, W - 24, H - HUD - 40, '#d8c090'); R(ctx, 16, HUD + 16, W - 32, H - HUD - 48, '#e8d0a0');
        const nodes = [[40, 150], [90, 120], [150, 140], [200, 96], [224, 50]];
        ctx.fillStyle = '#8a6a40';
        for (let i = 0; i < nodes.length - 1; i++) { const [a, b] = nodes[i], [c, d] = nodes[i + 1]; for (let k = 0; k < 12; k++) { const f = k / 12; R(ctx, a + (c - a) * f, b + (d - b) * f, 3, 3, '#8a6a40'); } }
        const icons = ['#5a5a60', '#2a6a2a', '#5a4a6a', '#8a3a20', '#c02020'];
        nodes.forEach(([x, y], i) => { R(ctx, x - 8, y - 8, 16, 16, icons[i]); if (i === 4) { R(ctx, x - 6, y - 18, 4, 10, '#c02020'); R(ctx, x + 2, y - 18, 4, 10, '#c02020'); } });
        const ill = g.phase === 'illusion';
        const st = g.st;
        const prog = g.phase === 'map' ? Math.min(1, (160 - g.phaseT) / 100) : 1;
        const from = nodes[Math.max(0, st - 1)], to = nodes[st];
        const ax = st === 0 ? to[0] : from[0] + (to[0] - from[0]) * prog, ay = st === 0 ? to[1] : from[1] + (to[1] - from[1]) * prog;
        drawArthur(ctx, ax, ay + 2, 1, (frame >> 3) & 1 ? 'run' : 'stand', true, frame >> 3);
        if (ill) {
          R(ctx, 20, HUD + 100, W - 40, 46, 'rgba(0,0,0,0.75)');
          text(ctx, 'THIS ROOM IS AN ILLUSION', W / 2, HUD + 106, '#ffffff', { center: true });
          text(ctx, 'AND IS A TRAP DEVISED BY SATAN.', W / 2, HUD + 118, '#ffffff', { center: true });
          text(ctx, 'GO AHEAD DAUNTLESSLY!', W / 2, HUD + 132, '#ffe040', { center: true });
        } else {
          text(ctx, 'STAGE ' + (st + 1) + '  ' + STAGES[st].name, W / 2, H - 22, '#ffe040', { center: true });
          if (g.loop) text(ctx, 'ROUND ' + (g.loop + 1), W / 2, HUD + 20, '#a03020', { center: true });
        }
      }
      function renderIntro(ctx) {
        // Arthur and the princess in the graveyard; Red Arremer swoops down and carries her off
        R(ctx, 0, HUD, W, H - HUD, '#101848');
        ctx.fillStyle = '#e8e8c0'; ctx.beginPath(); ctx.arc(200, 50, 12, 0, 7); ctx.fill();
        R(ctx, 0, HUD + 11 * T, W, 2 * T, '#5a3a1a'); R(ctx, 0, HUD + 11 * T, W, 4, '#2a7a2a');
        for (let i = 0; i < 5; i++) { const x = 20 + i * 50; R(ctx, x, HUD + 10 * T + 2, 12, 14, '#8a8a90'); R(ctx, x + 5, HUD + 10 * T + 4, 2, 7, '#5a5a60'); R(ctx, x + 3, HUD + 10 * T + 6, 6, 2, '#5a5a60'); }
        const t = 300 - g.phaseT, gy = HUD + 11 * T;
        const princessCarried = t > 150;
        const dx = t < 100 ? 0 : Math.min(30, (t - 100) * 0.6);
        let ax = 110, ay = 60;
        if (t > 90 && t < 150) { ax = 230 - (t - 90) * 1.4; ay = 40 + (t - 90) * 1.6; }
        else if (t >= 150) { ax = 146 + (t - 150) * 1.2; ay = 136 - (t - 150) * 1.2; }
        else { ax = 260; ay = 40; }
        drawArthur(ctx, 110 - dx, gy, 1, t > 160 ? 'run' : 'stand', t < 150, frame >> 3);
        const px = princessCarried ? ax : 140, py = princessCarried ? ay + 26 : gy;
        R(ctx, px - 5, py - 14, 10, 14, '#ff80c0'); R(ctx, px - 3, py - 20, 6, 6, '#f0c090'); R(ctx, px - 4, py - 22, 8, 3, '#ffe040');
        drawEnemy(ctx, { t: 'arremer', x: ax + g.camX, y: ay, age: frame, flash: 0 });
        if (t > 170) text(ctx, 'PRINCESS!', W / 2, 60, '#ffffff', { center: true });
        if (t < 100) { text(ctx, 'SIR ARTHUR AND', W / 2, 50, '#ffffff', { center: true }); text(ctx, 'PRINCESS PRIN PRIN', W / 2, 62, '#ff80c0', { center: true }); }
      }
      function renderTitle(ctx) {
        R(ctx, 0, 0, W, H, '#080818');
        ctx.fillStyle = '#e8e8c0'; ctx.beginPath(); ctx.arc(210, 40, 14, 0, 7); ctx.fill();
        ctx.fillStyle = '#080818'; ctx.beginPath(); ctx.arc(205, 36, 13, 0, 7); ctx.fill();
        hud(ctx);
        const ly = 34;
        text(ctx, 'GHOSTS', W / 2 + 2, ly + 2, '#400000', { center: true, scale: 3 });
        text(ctx, 'GHOSTS', W / 2, ly, '#ff4020', { center: true, scale: 3 });
        text(ctx, "'N", W / 2, ly + 26, '#ffffff', { center: true, scale: 2 });
        text(ctx, 'GOBLINS', W / 2 + 2, ly + 46, '#002040', { center: true, scale: 3 });
        text(ctx, 'GOBLINS', W / 2, ly + 44, '#40c0ff', { center: true, scale: 3 });
        const page = (titleT / 420 | 0) % 2;
        if (page === 0) {
          drawArthur(ctx, 40, 150, 1, 'stand', true, 0);
          drawArthur(ctx, 66, 150, 1, (frame >> 3) & 1 ? 'run' : 'stand', false, frame >> 3);
          text(ctx, 'ONE HIT AND YOUR', 150, 120, '#ffffff', { center: true });
          text(ctx, 'ARMOR IS GONE.', 150, 130, '#ffffff', { center: true });
          text(ctx, 'TWO HITS AND...', 150, 140, '#ff6060', { center: true });
          text(ctx, 'SPACE: THROW  X: JUMP', W / 2, 162, '#a0e0ff', { center: true });
          text(ctx, '1ST BONUS 20000  2ND 70000', W / 2, 176, '#ffff60', { center: true });
        } else {
          const rows = [['zombie', 'ZOMBIE', 100], ['crow', 'CROW', 100], ['knight', 'FLYING KNIGHT', 200], ['ogre', 'BIG MAN', 1000], ['arremer', 'RED ARREMER', 1000]];
          rows.forEach((rw, i) => {
            const y = 116 + i * 14;
            const e = { t: rw[0], x: 40, y: y + (rw[0] === 'ogre' ? 4 : rw[0] === 'zombie' ? 6 : 2), st: rw[0] === 'zombie' ? 'walk' : 'fly', age: frame, flash: 0, dir: 1, vx: 1, stT: 0 };
            ctx.save(); if (rw[0] === 'ogre') { ctx.translate(40, y); ctx.scale(0.5, 0.5); ctx.translate(-40, -y); }
            const sv = g; g = { camX: 0 }; drawEnemy(ctx, e); g = sv; ctx.restore();
            text(ctx, rw[1], 64, y - 3, '#ffffff'); text(ctx, rw[2] + ' PTS', W - 16, y - 3, '#ffe040', { right: true });
          });
        }
        if (api.credits === 0 || coinFlash > 0) { if (coinFlash > 0 ? (coinFlash >> 2) & 1 : (frame >> 5) & 1) text(ctx, 'INSERT COIN', W / 2, 192, '#ff3030', { center: true }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', W / 2, 192, '#ffffff', { center: true });
        text(ctx, '\u00a9 CAPCOM 1985', W / 2, 204, '#ffffff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 9, '#ffffff');
      }
      return { update, render, destroy() { } };
    }
  });
})();
