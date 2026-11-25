// R-Type (Irem, 1987) -- from-scratch recreation for the MAME32 Game Room.
// R-9 fighter with the detachable Force pod, charged Wave Cannon and colour lasers.
(function () {
  'use strict';
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
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }

  const R9 = [
    '..........WWW.................',
    '.......WWWBBBWW...............',
    '..RR..WBBBBBBBBWWWW...........',
    '.RRR.WBBBCCCCBBBBBBWWWWW......',
    'RRRRWBBBBCCCCBBBBBBBBBBBWWWW..',
    'OORRWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'RRRRWBBBBBBBBBBBBBBBBBBBWWWW..',
    '.RRR.WBBBBBBBBBBBBBBWWWWW.....',
    '..RR..WBBBBBBBBWWWW...........',
    '.......WWWBBBWW...............',
    '..........WWW.................'];
  const R9PAL = { W: '#e8e8f0', B: '#5070d0', C: '#40e0ff', R: '#a0a8c0', O: '#ff8020' };
  const PATA = ['...GGGG...', '.GGYYYYGG.', 'GGYRRRRYGG', 'GYRRKKRRYG', 'GYRRKKRRYG', 'GGYRRRRYGG', '.GGYYYYGG.', '...GGGG...'];

  const W = 384, H = 256, HUD = 16, PH = H - HUD;

  ArcadeRegistry.register({
    id: 'rtype', title: 'R-Type', year: 1987, maker: 'Irem',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: fire (hold to charge the Wave Cannon, release to fire) \u00b7 X: launch / recall the Force \u00b7 Enter: start',
    marquee: { bg: '#000010', fg: '#4080ff', accent: '#ff8020' },
    create(api) {
      const au = api.audio;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const ri = n => Math.random() * n | 0;
      const snd = {
        shot() { au.tone(1500, 0.04, { type: 'square', vol: 0.04, slideTo: 900 }); },
        charge(k) { au.tone(200 + k * 12, 0.05, { type: 'triangle', vol: 0.04 }); },
        beam(l) { au.noise(0.3 + l * 0.05, { vol: 0.14, freq: 2500, slideTo: 300 }); au.tone(900, 0.3, { type: 'sawtooth', vol: 0.07, slideTo: 200 }); },
        laser() { au.tone(2400, 0.06, { type: 'sawtooth', vol: 0.035, slideTo: 1200 }); },
        force() { au.tone(300, 0.15, { type: 'square', vol: 0.08, slideTo: 900 }); },
        dock() { au.tone(1200, 0.08, { type: 'square', vol: 0.08 }); },
        hit() { au.noise(0.04, { vol: 0.06, freq: 3000 }); },
        kill() { au.noise(0.25, { vol: 0.15, freq: 1500, slideTo: 150 }); },
        big() { au.noise(0.7, { vol: 0.25, freq: 900, slideTo: 40 }); au.tone(90, 0.6, { type: 'sawtooth', vol: 0.1, slideTo: 30 }); },
        item() { au.melody([[880, .05], [1175, .05], [1568, .05], [2093, .1]], { type: 'square', vol: 0.1 }); },
        die() { au.noise(1.0, { vol: 0.3, freq: 1500, slideTo: 40 }); au.melody([[523, .15], [392, .15], [330, .15], [262, .5]], { type: 'triangle', vol: 0.15, delay: 0.3 }); },
        clear() { au.melody([[392, .12], [523, .12], [659, .12], [784, .3], [740, .12], [784, .5]], { type: 'square', vol: 0.12 }); },
        eshot() { au.tone(600, 0.04, { type: 'square', vol: 0.03, slideTo: 400 }); }
      };
      const SHIP = spr(R9, R9PAL);
      const PATAS = [spr(PATA, { G: '#e06020', Y: '#ffd040', R: '#c03020', K: '#202020' }), spr(PATA, { G: '#20a060', Y: '#80ff80', R: '#108040', K: '#ffffff' })];

      const STAGES = [
        { name: 'ENCOUNTER', boss: 'dobk', bname: 'DOBKERATOPS', len: 4200, wall: '#28304a', wall2: '#48587a', hi: '#90a8d0', star: '#ffffff' },
        { name: 'LIFE FORMS', boss: 'goman', bname: 'GOMANDER', len: 4400, wall: '#3a1838', wall2: '#6a3060', hi: '#d080c0', star: '#ffd0f0' },
        { name: 'WARSHIP', boss: 'ship', bname: 'BATTLESHIP', len: 4000, wall: '#202830', wall2: '#405060', hi: '#a0b8c8', star: '#c0e0ff' }
      ];
      const LASERCOL = { red: '#ff4040', blue: '#40a0ff', yellow: '#ffe040' };

      let hi = api.getHiScore(50000), mode = 'title', titleT = 0, frame = 0, coinFlash = 0;
      let g = null;
      const stars = []; for (let i = 0; i < 70; i++) stars.push({ x: Math.random() * W, y: HUD + Math.random() * PH, s: 0.3 + (i % 3) * 0.4 });
      function tryStart() {
        if (api.useCredit()) { newGame(); return; }
        coinFlash = 90; au.tone(110, 0.25, { type: 'square', vol: 0.15 });
      }
      function newGame() {
        g = { score: 0, lives: 3, stage: 0, loop: 0, nextExtra: 50000 };
        mode = 'game'; g.check = 0; startStage(0, true);
      }
      function stg() { return STAGES[g.stage]; }
      function diff() { return g.stage + g.loop * 3; }
      function addScore(n) {
        g.score += n; if (g.score > hi) hi = g.score;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 100000; snd.item(); }
      }

      // ---------- terrain (8px columns) ----------
      function genTerrain() {
        const len = stg().len + W * 2;
        const n = Math.ceil(len / 8) + 2;
        const ce = new Int16Array(n), fl = new Int16Array(n);
        let c = HUD + 6, f = H - 6, tc = c, tf = f;
        for (let i = 0; i < n; i++) {
          if (i % 24 === 0) {
            const k = Math.random();
            if (i < 60) { tc = HUD + 6; tf = H - 8; }
            else if (k < 0.3) { tc = HUD + 10 + ri(30); tf = H - 10 - ri(30); }
            else if (k < 0.55) { tc = HUD + 40 + ri(50); tf = tc + 110 + ri(40); }
            else if (k < 0.8) { tf = H - 40 - ri(50); tc = tf - 110 - ri(40); }
            else { tc = HUD + 50 + ri(20); tf = H - 50 - ri(20); }
            tc = Math.max(HUD + 4, tc); tf = Math.min(H - 4, tf);
            if (tf - tc < 100) tf = tc + 100;
          }
          c += Math.sign(tc - c) * Math.min(3, Math.abs(tc - c));
          f += Math.sign(tf - f) * Math.min(3, Math.abs(tf - f));
          ce[i] = c; fl[i] = f;
        }
        for (let i = 0; i < n; i++) if (fl[i] - ce[i] < 96) { const m = (fl[i] + ce[i]) / 2; ce[i] = m - 48; fl[i] = m + 48; }
        const b0 = Math.floor(stg().len / 8);
        for (let i = b0; i < n; i++) { ce[i] = Math.min(ce[i], HUD + 6); fl[i] = Math.max(fl[i], H - 6); }
        for (let i = b0 - 40; i < b0; i++) { if (i < 0) continue; const k = (i - (b0 - 40)) / 40; ce[i] = Math.round(ce[i] * (1 - k) + (HUD + 6) * k); fl[i] = Math.round(fl[i] * (1 - k) + (H - 6) * k); }
        g.ce = ce; g.fl = fl;
      }
      function tAt(arr, wx) { const i = Math.max(0, Math.min(arr.length - 2, Math.floor(wx / 8))), k = Math.max(0, Math.min(1, wx / 8 - Math.floor(wx / 8))); return arr[i] + (arr[i + 1] - arr[i]) * k; }
      const ceilAt = wx => tAt(g.ce, wx), floorAt = wx => tAt(g.fl, wx);
      function inWall(x, y) { const wx = g.sx + x; return y < ceilAt(wx) || y > floorAt(wx); }

      function startStage(fromSx, regen) {
        if (regen) genTerrain();
        g.sx = fromSx;
        g.p = { x: 60, y: Math.round((ceilAt(fromSx + 60) + floorAt(fromSx + 60)) / 2), inv: 120, cd: 0, charge: 0, held: 0, speed: 0, missile: false, mcd: 0, dead: 0 };
        g.force = null; g.bits = [];
        g.en = []; g.pb = []; g.eb = []; g.items = []; g.fx = [];
        g.boss = null; g.phase = 'intro'; g.phaseT = 150; g.waveD = 160; g.powD = 300;
        au.melody([[294, .15], [440, .15], [392, .15], [440, .3], [523, .15], [587, .45]], { type: 'square', vol: 0.1 });
      }

      // ---------- force ----------
      function getCrystal(col) {
        const p = g.p;
        if (!g.force) { g.force = { x: Math.min(W - 20, p.x + 70), y: p.y, st: 'come', side: 1, lvl: 1, col, cd: 0, hitT: 0 }; snd.force(); return; }
        if (g.force.col === col && g.force.lvl < 3) g.force.lvl++;
        else if (g.force.col !== col) { g.force.col = col; if (g.force.lvl < 2) g.force.lvl++; }
        else addScore(1000);
        snd.item();
      }
      function updForce() {
        const f = g.force, p = g.p;
        if (!f) return;
        if (api.pressed('KeyX')) {
          if (f.st === 'front' || f.st === 'back') { f.st = 'out'; f.vx = f.side > 0 ? 4 : -4; snd.force(); }
          else { f.st = 'come'; snd.force(); }
        }
        if (f.st === 'front') { f.x = p.x + 22; f.y = p.y; f.side = 1; }
        else if (f.st === 'back') { f.x = p.x - 20; f.y = p.y; f.side = -1; }
        else if (f.st === 'out') {
          f.x += f.vx;
          const stopX = f.vx > 0 ? W - 40 : 40;
          if ((f.vx > 0 && f.x >= stopX) || (f.vx < 0 && f.x <= stopX)) { f.x = stopX; f.st = 'hover'; }
          f.y += Math.sign(p.y - f.y) * Math.min(0.8, Math.abs(p.y - f.y));
        } else if (f.st === 'hover') {
          f.y += Math.sign(p.y - f.y) * Math.min(0.8, Math.abs(p.y - f.y));
        } else if (f.st === 'come') {
          if (!isFinite(f.x) || !isFinite(f.y)) { f.x = p.x + 30; f.y = p.y; }
          f.ct = (f.ct || 0) + 1;
          const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
          if (d < 18 || f.ct > 150) { f.st = f.x >= p.x ? 'front' : 'back'; f.ct = 0; snd.dock(); }
          else { f.x += dx / d * 4; f.y += dy / d * 4; }
        }
        // a free-floating Force also docks if the ship touches it
        if ((f.st === 'hover' || f.st === 'out') && Math.abs(f.x - p.x) < 22 && Math.abs(f.y - p.y) < 10 && f.st === 'hover') { f.st = f.x >= p.x ? 'front' : 'back'; snd.dock(); }
        f.y = Math.max(HUD + 6, Math.min(H - 6, f.y));
        if (f.hitT > 0) f.hitT--;
        // Force contact damage and bullet blocking
        const r = 6 + f.lvl * 2;
        for (const b of g.eb) if (!b.big && Math.abs(b.x - f.x) < r && Math.abs(b.y - f.y) < r) b.dead = true;
        if (f.hitT <= 0) {
          for (const e of g.en) if (!e.dead && Math.abs(e.x - f.x) < e.w / 2 + r && Math.abs(e.y - f.y) < e.h / 2 + r) { damageEnemy(e, 1 + f.lvl * 0.5); f.hitT = 4; }
          if (g.boss) { const pt = bossWeakHit(f.x, f.y, r); if (pt) { damageBoss(1, pt); f.hitT = 6; } }
        }
      }
      function fireForce() {
        const f = g.force, p = g.p;
        if (!f) return;
        const dir = f.st === 'back' ? -1 : 1;
        if (f.st === 'front' || f.st === 'back') {
          if (f.col === 'red') {
            for (const s of [-1, 1]) g.pb.push({ k: 'helix', x: f.x, y: f.y, y0: f.y, s, vx: dir * 6, t: 0, dmg: 1 + f.lvl * 0.5, w: 3 + f.lvl });
            if (f.lvl >= 2) g.pb.push({ k: 'n', x: f.x, y: f.y, vx: dir * 7, vy: 0, dmg: 2, w: 6 });
          } else if (f.col === 'blue') {
            for (const s of [-1, 1]) g.pb.push({ k: 'refl', x: f.x, y: f.y, vx: dir * 4.2, vy: s * 4.2, bounces: 2 + f.lvl, dmg: 1 + f.lvl * 0.3 });
            if (f.lvl >= 2) g.pb.push({ k: 'refl', x: f.x, y: f.y, vx: dir * 6, vy: 0, bounces: 0, dmg: 1.5 });
          } else {
            for (const s of [-1, 1]) g.pb.push({ k: 'ground', x: f.x, y: f.y, vx: dir * 1, vy: s * 4, s, dir, dmg: 1 + f.lvl * 0.5, run: false, t: 0 });
            if (f.lvl >= 2) g.pb.push({ k: 'n', x: f.x, y: f.y, vx: dir * 7, vy: 0, dmg: 1.5, w: 4 });
          }
          snd.laser();
        } else {
          // detached Force fires in four directions
          for (const [vx, vy] of [[5, 0], [-5, 0], [3.5, -3.5], [3.5, 3.5]]) g.pb.push({ k: 'n', x: f.x, y: f.y, vx, vy, dmg: 0.7, w: 3 });
        }
      }

      // ---------- player ----------
      function updPlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        let dx = 0, dy = 0;
        if (api.key('ArrowLeft')) dx--; if (api.key('ArrowRight')) dx++;
        if (api.key('ArrowUp')) dy--; if (api.key('ArrowDown')) dy++;
        const s = 1.5 + p.speed * 0.45;
        p.x = Math.max(16, Math.min(W - 18, p.x + dx * s * (dy ? 0.75 : 1)));
        p.y = Math.max(HUD + 6, Math.min(H - 6, p.y + dy * s * (dx ? 0.75 : 1)));
        if (p.cd > 0) p.cd--;
        if (api.pressed('Space') && p.cd <= 0) {
          g.pb.push({ k: 'n', x: p.x + 16, y: p.y, vx: 7, vy: 0, dmg: 1, w: 4 });
          fireForce(); for (const b of g.bits) g.pb.push({ k: 'n', x: b.x + 4, y: b.y, vx: 7, vy: 0, dmg: 0.5, w: 3 });
          if (p.missile && p.mcd <= 0) { for (const s2 of [-1, 1]) g.pb.push({ k: 'missile', x: p.x, y: p.y + s2 * 4, vx: 2, vy: s2, ang: s2 * 0.4, dmg: 2, t: 0 }); p.mcd = 30; }
          p.cd = 5; snd.shot();
        }
        if (p.mcd > 0) p.mcd--;
        if (api.key('Space')) {
          p.held++;
          if (p.held > 10) { const before = Math.floor(p.charge / 18); p.charge = Math.min(90, p.charge + 1); if (Math.floor(p.charge / 18) !== before) snd.charge(before * 5); }
        } else {
          if (p.charge >= 18) fireBeam(Math.floor(p.charge / 18));
          p.charge = 0; p.held = 0;
        }
        // bits follow above and below
        g.bits.forEach((b, i) => { const ty = p.y + (i === 0 ? -20 : 20); b.x += (p.x + 2 - b.x) * 0.3; b.y += (ty - b.y) * 0.3; });
        // terrain collision
        for (const [ox, oy] of [[-12, -3], [-12, 3], [0, -5], [0, 5], [12, -2], [12, 2], [15, 0]]) if (inWall(p.x + ox, p.y + oy)) { die(); return; }
      }
      function fireBeam(lvl) {
        const p = g.p;
        g.pb.push({ k: 'beam', x: p.x + 18, y: p.y, vx: 9, vy: 0, lvl, len: 24 + lvl * 20, h: 4 + lvl * 3, dmg: lvl * 2.5, hit: new Set() });
        snd.beam(lvl);
      }
      function die() {
        const p = g.p;
        if (p.inv > 0 || g.phase !== 'play') return;
        g.phase = 'dying'; g.phaseT = 150;
        g.fx.push({ k: 'big', x: p.x, y: p.y, t: 0 }); g.fx.push({ k: 'big', x: p.x + 10, y: p.y - 6, t: -8 });
        snd.die();
      }
      function respawn() {
        const bossFight = !!g.boss;
        const lvl = g.check;
        if (!bossFight) {
          startStage(lvl, false);
          g.phase = 'play'; g.phaseT = 0;
        } else {
          g.p = { x: 60, y: HUD + PH / 2, inv: 150, cd: 0, charge: 0, held: 0, speed: 0, missile: false, mcd: 0 };
          g.force = null; g.bits = []; g.eb = [];
          g.phase = 'play';
        }
        g.powD = 60; // a fresh POW armor comes along quickly
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 300;
        au.melody([[392, .2], [370, .2], [349, .2], [330, .6]], { type: 'square', vol: 0.12 });
      }

      // ---------- enemies ----------
      function bsp() { return Math.min(2.8, 1.5 + diff() * 0.15); }
      function aimShot(x, y, sp, off) { const p = g.p; const a = Math.atan2(p.y - y, p.x - x) + (off || 0); g.eb.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0 }); snd.eshot(); }
      function spawnWave() {
        const d = diff(), r = Math.random(), wx = g.sx + W + 20;
        const c = ceilAt(wx), f = floorAt(wx);
        if (r < 0.32) {
          const y0 = rnd(c + 30, f - 30), n = 5 + Math.min(3, d);
          for (let i = 0; i < n; i++) g.en.push({ k: 'pata', x: W + 10 + i * 18, y: y0, y0, t: -i * 5, hp: 1, w: 10, h: 8, pts: 100, ph: i * 0.5 });
        } else if (r < 0.5) {
          const onCeil = Math.random() < 0.5;
          g.en.push({ k: 'turret', wx, ceil: onCeil, x: W + 20, y: 0, t: 0, hp: 3, w: 14, h: 10, pts: 300, cd: 50 + ri(40) });
        } else if (r < 0.66) {
          for (let i = 0; i < 2; i++) g.en.push({ k: 'cancer', wx: wx + i * 30, x: W + 20, y: floorAt(wx + i * 30) - 8, vy: 0, t: ri(30), hp: 2, w: 16, h: 14, pts: 200, cd: 70 + ri(40), air: false });
        } else if (r < 0.8) {
          g.en.push({ k: 'scant', x: W + 24, y: rnd(c + 40, f - 40), t: 0, hp: 10 + d * 2, w: 26, h: 26, pts: 1000 });
        } else if (r < 0.92) {
          const n = 3 + Math.min(3, d);
          for (let i = 0; i < n; i++) g.en.push({ k: 'bink', x: -12 - i * 16, y: rnd(c + 30, f - 30), t: -i * 6, hp: 1, w: 10, h: 8, pts: 150 });
        } else {
          // a chain of 'bug' segments weaving through
          const y0 = rnd(c + 40, f - 40);
          for (let i = 0; i < 8; i++) g.en.push({ k: 'bug', x: W + 10 + i * 10, y: y0, y0, t: -i * 4, hp: 1, w: 8, h: 8, pts: 100 });
        }
      }
      function spawnPow() {
        const wx = g.sx + W + 20, c = ceilAt(wx), f = floorAt(wx);
        g.en.push({ k: 'pow', x: W + 16, y: rnd(c + 30, f - 30), t: 0, hp: 2, w: 16, h: 14, pts: 300 });
      }
      function updEnemy(e) {
        e.t++;
        if (e.t < 0) return;
        const p = g.p;
        if (e.wx != null) e.x = e.wx - g.sx;
        switch (e.k) {
          case 'pata':
            e.x -= 1.4 + diff() * 0.1; e.y = e.y0 + Math.sin(e.t * 0.08 + e.ph) * 26;
            if (e.t % 150 === 70 && Math.random() < 0.3) aimShot(e.x, e.y, bsp());
            break;
          case 'bug':
            e.x -= 1.8; e.y = e.y0 + Math.sin(e.t * 0.05) * 40;
            break;
          case 'bink':
            e.x += 2.2; e.y += Math.sign(p.y - e.y) * 0.5;
            if (e.t === 60) aimShot(e.x, e.y, bsp());
            if (e.x > W + 30) e.dead = true;
            break;
          case 'turret':
            e.y = e.ceil ? ceilAt(e.wx) + 5 : floorAt(e.wx) - 5;
            if (--e.cd <= 0 && e.x < W - 8 && e.x > 8) { e.cd = Math.max(50, 110 - diff() * 10); aimShot(e.x, e.y, bsp()); }
            break;
          case 'cancer': {
            e.wx -= 0.4;
            const fy = floorAt(e.wx) - 7;
            if (e.air) { e.vy += 0.2; e.y += e.vy; e.wx -= 1; if (e.y >= fy) { e.y = fy; e.air = false; } }
            else { e.y = fy; if (e.t % 100 === 50) { e.air = true; e.vy = -3.5; } }
            if (--e.cd <= 0 && e.x < W) { e.cd = 90 + ri(50); aimShot(e.x, e.y - 4, bsp()); }
            break;
          }
          case 'scant':
            if (e.t < 80) e.x -= 1.2; else if (e.t > 300) e.x -= 1.5;
            e.y += Math.sign(p.y - e.y) * 0.4;
            if (e.t > 80 && e.t < 300 && e.t % 60 === 0) for (let i = -2; i <= 2; i++) aimShot(e.x - 10, e.y, bsp(), i * 0.18);
            break;
          case 'pow':
            e.x -= 0.9; e.y += Math.sin(e.t * 0.05) * 0.5;
            break;
        }
        if (e.x < -40 && e.k !== 'bink') e.dead = true;
        if (p.inv <= 0 && Math.abs(e.x - p.x) < e.w / 2 + 10 && Math.abs(e.y - p.y) < e.h / 2 + 3) die();
      }
      function damageEnemy(e, n) {
        if (e.dead || e.t < 0) return;
        e.hp -= n; e.flash = 4;
        if (e.hp > 0) { snd.hit(); return; }
        e.dead = true; addScore(e.pts);
        g.fx.push({ k: e.w > 20 ? 'big' : 'boom', x: e.x, y: e.y, t: 0 });
        snd.kill();
        if (e.k === 'pow') {
          const r = Math.random();
          const it = r < 0.5 ? ['red', 'blue', 'yellow'][ri(3)] : r < 0.7 ? 'S' : r < 0.85 ? 'M' : 'B';
          g.items.push({ k: it, x: e.x, y: e.y, t: 0 });
        }
      }
      function takeItem(it) {
        const p = g.p;
        if (it.k === 'red' || it.k === 'blue' || it.k === 'yellow') getCrystal(it.k);
        else if (it.k === 'S') { if (p.speed < 3) p.speed++; else addScore(500); snd.item(); }
        else if (it.k === 'M') { p.missile = true; snd.item(); }
        else if (it.k === 'B') { if (g.bits.length < 2) g.bits.push({ x: p.x, y: p.y }); else addScore(1000); snd.item(); }
      }

      // ---------- bosses ----------
      function spawnBoss() {
        const k = stg().boss, hp = { dobk: 60, goman: 70, ship: 50 }[k] + g.loop * 20;
        const b = { k, hp, max: hp, t: 0, st: 'enter', flash: 0, x: W + 100, y: HUD + PH / 2, open: 0, tail: [] };
        if (k === 'ship') { b.turrets = [10, 10, 10, 10].map(v => v + g.loop * 4); b.x = W + 160; }
        if (k === 'goman') { b.snake = []; b.sa = 0; }
        g.boss = b;
        au.melody([[110, .25], [104, .25], [110, .25], [131, .5], [110, .6]], { type: 'sawtooth', vol: 0.1 });
      }
      function bossParts(b) {
        // {x,y,r,weak,kill,id}; weak points first so they take hits before the armour around them
        const out = [];
        if (b.k === 'dobk') {
          out.push({ x: b.x - 6, y: b.y + 18, r: 10, weak: true, id: 'core' });
          out.push({ x: b.x + 20, y: b.y - 10, r: 42, weak: false, kill: true });
          out.push({ x: b.x - 24, y: b.y - 56, r: 14, weak: false, kill: true });
          for (const s of b.tail) out.push({ x: s.x, y: s.y, r: 7, weak: false, kill: true });
        } else if (b.k === 'goman') {
          out.push({ x: b.x + 30, y: b.y, r: 48, weak: false, kill: true });
          if (b.open > 0.6) out.push({ x: b.x - 14, y: b.y, r: 13, weak: true, id: 'eye' });
          for (const s of b.snake) out.push({ x: s.x, y: s.y, r: 7, weak: false, kill: true });
        } else {
          out.push({ x: b.x + 40, y: H - 30, r: 70, weak: false, kill: true, box: true });
          b.turrets.forEach((hp, i) => { if (hp > 0) out.push({ x: b.x - 40 + i * 40, y: H - 68, r: 9, weak: true, id: 't' + i }); });
          out.push({ x: b.x - 84, y: H - 82, r: 13, weak: b.turrets.every(h => h <= 0), kill: true, id: 'core' });
        }
        return out.sort((a, c) => (c.weak ? 1 : 0) - (a.weak ? 1 : 0));
      }
      function bossWeakHit(x, y, r) {
        if (!g.boss || g.boss.st !== 'fight') return null;
        for (const pt of bossParts(g.boss)) if (Math.hypot(pt.x - x, pt.y - y) < pt.r + r) return pt;
        return null;
      }
      function updBoss() {
        const b = g.boss, p = g.p, s = bsp();
        b.t++; if (b.flash) b.flash--;
        if (b.st === 'dead') {
          if (b.t % 5 === 0) g.fx.push({ k: 'big', x: b.x + rnd(-60, 60), y: b.y + rnd(-60, 60), t: 0 });
          if (b.t % 20 === 0) snd.big();
          if (b.t === 160) { g.phase = 'clear'; g.phaseT = 280; g.bonus = 10000 * (g.stage + 1); addScore(g.bonus); snd.clear(); }
          return;
        }
        if (b.k === 'dobk') {
          if (b.st === 'enter') { b.x -= 0.8; if (b.x <= W - 90) { b.x = W - 90; b.st = 'fight'; b.t = 0; } }
          // tail swings from the lower body in a wide arc
          b.tail = [];
          for (let i = 1; i <= 14; i++) { const a = Math.PI * 0.55 + Math.sin(b.t * 0.025 - i * 0.18) * 0.9; const r = 30 + i * 9; b.tail.push({ x: b.x + 10 + Math.cos(a) * r * 1.0, y: b.y + 50 + Math.sin(a) * r * 0.55 - i * 2 }); }
          if (b.st === 'fight') {
            if (b.t % 80 === 0) for (let i = -1; i <= 1; i++) aimShot(b.x - 30, b.y - 56, s, i * 0.2);
            if (b.t % 140 === 70) { const n = 10; for (let i = 0; i < n; i++) { const a = Math.PI * 0.5 + i / (n - 1) * Math.PI; g.eb.push({ x: b.x - 6, y: b.y + 18, vx: Math.cos(a) * s * 0.8, vy: Math.sin(a) * s * 0.8, t: 0 }); } }
          }
        } else if (b.k === 'goman') {
          if (b.st === 'enter') { b.x -= 0.8; if (b.x <= W - 70) { b.x = W - 70; b.st = 'fight'; b.t = 0; } }
          const cyc = b.t % 260;
          b.open = cyc > 140 && cyc < 230 ? Math.min(1, (cyc - 140) / 15) : Math.max(0, b.open - 0.06);
          if (b.st === 'fight' && cyc > 150 && cyc < 225 && cyc % 12 === 0) aimShot(b.x - 14, b.y, s, rnd(-0.2, 0.2));
          // the snake circles the arena
          b.sa += 0.012 + g.loop * 0.003;
          b.snake = [];
          for (let i = 0; i < 18; i++) { const a = b.sa - i * 0.1; b.snake.push({ x: W / 2 - 40 + Math.cos(a) * 150, y: HUD + PH / 2 + Math.sin(a * 2) * 70 }); }
        } else {
          if (b.st === 'enter') { b.x -= 0.6; if (b.x <= W - 140) { b.x = W - 140; b.st = 'fight'; b.t = 0; } }
          if (b.st === 'fight') {
            b.turrets.forEach((hp, i) => { if (hp > 0 && (b.t + i * 30) % 90 === 0) { aimShot(b.x - 40 + i * 40, H - 74, s); if (diff() > 1) aimShot(b.x - 40 + i * 40, H - 74, s, 0.2); } });
            if (b.turrets.every(h => h <= 0) && b.t % 50 === 0) for (let i = 0; i < 8; i++) { const a = Math.PI + (i - 3.5) * 0.18; g.eb.push({ x: b.x - 84, y: H - 82, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 }); }
            if (b.t % 200 === 100) g.en.push({ k: 'bink', x: -10, y: rnd(HUD + 30, H - 120), t: 0, hp: 1, w: 10, h: 8, pts: 150 });
          }
        }
        // collision with the boss body
        if (p.inv <= 0) for (const pt of bossParts(b)) {
          if (!pt.kill) continue;
          if (pt.box ? (p.x + 14 > pt.x - 170 && p.y + 5 > H - 60) : Math.hypot(pt.x - p.x, pt.y - p.y) < pt.r + 6) { die(); break; }
        }
      }
      function damageBoss(n, pt) {
        const b = g.boss;
        if (b.st !== 'fight' || !pt || !pt.weak) return;
        b.flash = 4; snd.hit();
        if (pt.id && pt.id[0] === 't') {
          const i = +pt.id[1]; b.turrets[i] -= n;
          if (b.turrets[i] <= 0) { g.fx.push({ k: 'big', x: pt.x, y: pt.y, t: 0 }); snd.big(); addScore(3000); }
          return;
        }
        b.hp -= n;
        if (b.hp <= 0) { b.hp = 0; b.st = 'dead'; b.t = 0; g.eb = []; for (const e of g.en) e.dead = true; }
      }

      // ---------- update ----------
      function updGame() {
        for (const s of stars) { s.x -= s.s * (g && g.phase !== 'dying' ? 1 : 0.3); if (s.x < 0) { s.x += W; s.y = HUD + Math.random() * PH; } }
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } return; }
        if (g.phase === 'cont') return;
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.k === 'big' ? 40 : 22));
        if (g.phase === 'intro') { if (--g.phaseT <= 0) g.phase = 'play'; return; }
        if (g.phase === 'clear') { if (--g.phaseT <= 0) { g.stage++; if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; } g.check = 0; startStage(0, true); } return; }
        if (g.phase === 'dying') {
          for (const e of g.en) if (!e.dead) { e.t++; }
          if (--g.phaseT <= 0) {
            g.lives--;
            if (g.lives <= 0) {
              if (api.offerContinue) { g.phase = 'cont'; const cg = g; api.offerContinue(() => { if (g === cg) { g.lives = 3; respawn(); } }, () => { if (g === cg) gameOver(); }); }
              else gameOver();
            } else respawn();
          }
          return;
        }
        const p = g.p;
        if (!g.boss) {
          g.sx += 0.6;
          if (g.sx > stg().len / 2 && !g.check) g.check = Math.floor(stg().len / 2);
          if (g.sx >= stg().len) { g.sx = stg().len; spawnBoss(); }
          else {
            g.waveD -= 0.6;
            if (g.waveD <= 0) { spawnWave(); g.waveD = Math.max(60, 140 - diff() * 14) + ri(70); }
            g.powD -= 0.6;
            if (g.powD <= 0) { spawnPow(); g.powD = 700 + ri(500); }
          }
        }
        updPlayer();
        if (g.phase !== 'play') return;
        updForce();
        for (const e of g.en) if (!e.dead) updEnemy(e);
        if (g.boss) updBoss();
        if (g.phase !== 'play') return;
        // player shots
        for (const b of g.pb) {
          if (b.k === 'helix') { b.t++; b.x += b.vx; b.y = b.y0 + Math.sin(b.t * 0.35) * 9 * b.s; }
          else if (b.k === 'refl') {
            b.x += b.vx; b.y += b.vy;
            const wx = g.sx + b.x;
            if (b.y < ceilAt(wx) + 2 || b.y < HUD + 2) { if (b.bounces-- <= 0) b.dead = true; b.vy = Math.abs(b.vy); }
            else if (b.y > floorAt(wx) - 2 || b.y > H - 2) { if (b.bounces-- <= 0) b.dead = true; b.vy = -Math.abs(b.vy); }
          } else if (b.k === 'ground') {
            b.t++;
            const wx = g.sx + b.x;
            if (!b.run) { b.x += b.vx; b.y += b.vy; if ((b.s < 0 && b.y <= ceilAt(wx) + 4) || (b.s > 0 && b.y >= floorAt(wx) - 4) || b.y < HUD + 4 || b.y > H - 4) { b.run = true; } }
            else { b.x += b.dir * 6; b.y = b.s < 0 ? Math.max(HUD + 4, ceilAt(g.sx + b.x) + 4) : Math.min(H - 4, floorAt(g.sx + b.x) - 4); }
            if (b.t > 120) b.dead = true;
          } else if (b.k === 'missile') {
            b.t++;
            let best = null, bd = 1e9;
            for (const e of g.en) { if (e.dead || e.t < 0) continue; const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < bd) { bd = d; best = e; } }
            if (!best && g.boss && g.boss.st === 'fight') best = bossParts(g.boss).find(pt => pt.weak);
            const want = best ? Math.atan2(best.y - b.y, best.x - b.x) : 0;
            let da = want - b.ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
            b.ang += Math.max(-0.1, Math.min(0.1, da));
            b.x += Math.cos(b.ang) * 4.5; b.y += Math.sin(b.ang) * 4.5;
            if (b.t > 120) b.dead = true;
          } else { b.x += b.vx; b.y += b.vy; }
          if (b.x > W + 30 || b.x < -30 || b.y < HUD - 10 || b.y > H + 10) { b.dead = true; continue; }
          if (b.k !== 'refl' && b.k !== 'ground' && b.k !== 'beam' && inWall(b.x, b.y)) { b.dead = true; g.fx.push({ k: 'spark', x: b.x, y: b.y, t: 12 }); continue; }
          // hits
          const hw = b.k === 'beam' ? b.len / 2 : 3, hh = b.k === 'beam' ? b.h / 2 : 3;
          const cx = b.k === 'beam' ? b.x - b.len / 2 : b.x;
          for (const e of g.en) {
            if (e.dead || e.t < 0) continue;
            if (Math.abs(e.x - cx) < e.w / 2 + hw && Math.abs(e.y - b.y) < e.h / 2 + hh) {
              if (b.k === 'beam') { if (!b.hit.has(e)) { b.hit.add(e); damageEnemy(e, b.dmg); } }
              else { damageEnemy(e, b.dmg); b.dead = true; break; }
            }
          }
          if (!b.dead && g.boss && g.boss.st === 'fight') {
            for (const pt of bossParts(g.boss)) {
              const hit = pt.box ? (cx + hw > pt.x - 170 && b.y + hh > H - 60) : Math.hypot(pt.x - cx, pt.y - b.y) < pt.r + Math.max(hw * (b.k === 'beam' ? 0.5 : 1), hh);
              if (!hit) continue;
              if (pt.weak) {
                if (b.k === 'beam') { if (!b.hit.has(pt.id)) { b.hit.add(pt.id); damageBoss(b.dmg, pt); } }
                else { damageBoss(b.dmg, pt); b.dead = true; }
              } else if (b.k !== 'beam') { b.dead = true; g.fx.push({ k: 'spark', x: b.x, y: b.y, t: 12 }); }
              if (b.dead) break;
            }
          }
        }
        g.pb = g.pb.filter(b => !b.dead);
        g.en = g.en.filter(e => !e.dead);
        // enemy shots
        for (const b of g.eb) {
          b.x += b.vx; b.y += b.vy; b.t++;
          if (b.x < -10 || b.x > W + 10 || b.y < HUD - 6 || b.y > H + 6 || b.t > 500) { b.dead = true; continue; }
          for (const bt of g.bits) if (Math.abs(bt.x - b.x) < 6 && Math.abs(bt.y - b.y) < 6) b.dead = true;
          if (!b.dead && p.inv <= 0 && Math.abs(b.x - p.x) < 9 && Math.abs(b.y - p.y) < 4) { b.dead = true; die(); }
        }
        g.eb = g.eb.filter(b => !b.dead);
        for (const bt of g.bits) for (const e of g.en) if (!e.dead && Math.abs(e.x - bt.x) < e.w / 2 + 4 && Math.abs(e.y - bt.y) < e.h / 2 + 4 && frame % 6 === 0) damageEnemy(e, 1);
        // items
        for (const it of g.items) {
          it.t++; it.x -= 0.6;
          if (Math.abs(it.x - p.x) < 16 && Math.abs(it.y - p.y) < 10) { it.dead = true; takeItem(it); }
          if (it.x < -10) it.dead = true;
        }
        g.items = g.items.filter(it => !it.dead);
      }
      function update() {
        frame++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          titleT++;
          for (const s of stars) { s.x -= s.s; if (s.x < 0) { s.x += W; s.y = HUD + Math.random() * PH; } }
          if (api.anyPressed('Enter', 'Space')) tryStart();
          return;
        }
        updGame();
      }

      // ---------- render ----------
      function drawStars(ctx, col) {
        for (const s of stars) { ctx.fillStyle = s.s > 0.9 ? col : s.s > 0.5 ? '#8090a0' : '#404858'; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s > 0.9 ? 2 : 1, 1); }
      }
      function drawTerrain(ctx) {
        const s = stg();
        const x0 = Math.floor(g.sx / 4) * 4;
        for (let wx = x0; wx < g.sx + W + 4; wx += 4) {
          const x = Math.round(wx - g.sx);
          const c = Math.round(ceilAt(wx)), f = Math.round(floorAt(wx));
          const rib = ((wx >> 3) % 6) === 0;
          if (c > HUD) {
            ctx.fillStyle = s.wall; ctx.fillRect(x, HUD, 4, c - HUD);
            ctx.fillStyle = rib ? s.hi : s.wall2; ctx.fillRect(x, Math.max(HUD, c - 6), 4, 6);
            if (rib) { ctx.fillStyle = s.wall2; ctx.fillRect(x, HUD, 2, c - HUD); }
          }
          if (f < H) {
            ctx.fillStyle = s.wall; ctx.fillRect(x, f, 4, H - f);
            ctx.fillStyle = rib ? s.hi : s.wall2; ctx.fillRect(x, f, 4, 6);
            if (rib) { ctx.fillStyle = s.wall2; ctx.fillRect(x, f, 2, H - f); }
          }
          if (s.boss === 'goman' && ((wx >> 2) % 9) === 0) { ctx.fillStyle = '#a04080'; if (c > HUD) ctx.fillRect(x, c, 3, 3 + ((wx >> 5) & 3)); if (f < H) ctx.fillRect(x, f - 3 - ((wx >> 5) & 3), 3, 3 + ((wx >> 5) & 3)); }
        }
      }
      function drawShip(ctx) {
        const p = g.p;
        if (g.phase === 'dying') return;
        if (p.inv > 0 && (p.inv & 4) && g.phase === 'play') return;
        const x = Math.round(p.x), y = Math.round(p.y);
        ctx.drawImage(SHIP, x - 15, y - 5);
        ctx.fillStyle = (frame & 2) ? '#ff8020' : '#ffd040'; ctx.fillRect(x - 18, y - 1, 3, 2);
        // charge glow at the nose
        if (p.charge > 0) {
          const k = p.charge / 90, r = 2 + Math.round(k * 5);
          ctx.fillStyle = (frame & 2) ? '#80c0ff' : '#ffffff'; ctx.fillRect(x + 15, y - r, 3, r * 2);
          for (let i = 0; i < 4; i++) { const a = frame * 0.5 + i * 1.57; ctx.fillRect(Math.round(x + 17 + Math.cos(a) * (r + 3)), Math.round(y + Math.sin(a) * (r + 3)), 1, 1); }
        }
        for (const b of g.bits) {
          const bx = Math.round(b.x), by = Math.round(b.y);
          ctx.fillStyle = '#ff8020'; ctx.fillRect(bx - 4, by - 4, 8, 8);
          ctx.fillStyle = '#ffd040'; ctx.fillRect(bx - 2, by - 2, 4, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 1 + ((frame >> 2) & 1), by - 1, 1, 1);
        }
      }
      function drawForce(ctx) {
        const f = g.force; if (!f || g.phase === 'dying') return;
        const x = Math.round(f.x), y = Math.round(f.y), r = 4 + f.lvl;
        ctx.fillStyle = '#c04010'; ctx.fillRect(x - r - 1, y - r + 1, (r + 1) * 2, (r - 1) * 2); ctx.fillRect(x - r + 1, y - r - 1, (r - 1) * 2, (r + 1) * 2);
        ctx.fillStyle = (frame >> 2) & 1 ? '#ff8020' : '#ffa040'; ctx.fillRect(x - r + 1, y - r + 1, (r - 1) * 2, (r - 1) * 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 3, 3);
        // claws (point away from the ship when docked)
        ctx.fillStyle = LASERCOL[f.col];
        const side = f.st === 'back' ? -1 : 1;
        for (const sy of [-1, 1]) { ctx.fillRect(x + side * (r - 1) - (side < 0 ? 4 : 0), y + sy * (r + 1) - 1, 5, 2); ctx.fillRect(x + side * (r + 3) - (side < 0 ? 1 : 0), y + sy * (r - 1) - 1, 2, 3); }
      }
      function drawEnemies(ctx) {
        for (const e of g.en) {
          if (e.t < 0) continue;
          const x = Math.round(e.x), y = Math.round(e.y);
          switch (e.k) {
            case 'pata': ctx.drawImage(PATAS[0], x - 5, y - 4); break;
            case 'bug': ctx.drawImage(PATAS[1], x - 5, y - 4); break;
            case 'bink': ctx.fillStyle = '#a0a8b0'; ctx.fillRect(x - 5, y - 3, 10, 6); ctx.fillStyle = '#ff4040'; ctx.fillRect(x + 2, y - 1, 3, 2); ctx.fillStyle = '#606870'; ctx.fillRect(x - 7, y - 5, 4, 2); ctx.fillRect(x - 7, y + 3, 4, 2); break;
            case 'turret':
              ctx.fillStyle = '#707880'; ctx.fillRect(x - 7, y - 5, 14, 10);
              ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 2, y - 2, 4, 4);
              { const a = Math.atan2(g.p.y - y, g.p.x - x); ctx.fillStyle = '#c0c8d0'; for (let i = 4; i < 10; i++) ctx.fillRect(Math.round(x + Math.cos(a) * i), Math.round(y + Math.sin(a) * i), 2, 2); }
              break;
            case 'cancer':
              ctx.fillStyle = '#a07040'; ctx.fillRect(x - 8, y - 6, 16, 8);
              ctx.fillStyle = '#e0b060'; ctx.fillRect(x - 6, y - 8, 12, 4);
              ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 6, y - 4, 2, 2);
              ctx.fillStyle = '#604020'; const lg = (e.t >> 3) & 1; ctx.fillRect(x - 8, y + 2, 2, 5 - lg); ctx.fillRect(x - 2, y + 2, 2, 4 + lg); ctx.fillRect(x + 4, y + 2, 2, 5 - lg);
              break;
            case 'scant':
              ctx.fillStyle = '#506080'; ctx.fillRect(x - 13, y - 13, 26, 26);
              ctx.fillStyle = '#8090b0'; ctx.fillRect(x - 10, y - 10, 20, 12);
              ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 12, y - 2, 6, 4);
              ctx.fillStyle = '#303848'; ctx.fillRect(x - 8, y + 6, 6, 8); ctx.fillRect(x + 4, y + 6, 6, 8);
              break;
            case 'pow':
              ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x - 8, y - 6, 16, 12);
              ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 6, y - 4, 12, 8);
              text(ctx, 'P', x - 2, y - 3, '#ffffff');
              ctx.fillStyle = '#808080'; const lg2 = (e.t >> 3) & 1; ctx.fillRect(x - 6, y + 6, 2, 3 + lg2); ctx.fillRect(x + 4, y + 6, 2, 4 - lg2);
              break;
          }
          if (e.flash) { e.flash--; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x - e.w / 2, y - e.h / 2, e.w, e.h); }
        }
      }
      function drawBoss(ctx) {
        const b = g.boss; if (!b) return;
        const fl = b.flash & 2;
        if (b.k === 'dobk') {
          const x = Math.round(b.x), y = Math.round(b.y);
          for (const s of b.tail) { ctx.fillStyle = '#806030'; ctx.fillRect(Math.round(s.x) - 6, Math.round(s.y) - 6, 12, 12); ctx.fillStyle = '#c09050'; ctx.fillRect(Math.round(s.x) - 4, Math.round(s.y) - 4, 8, 8); }
          ctx.fillStyle = '#504060'; ctx.fillRect(x - 20, y - 70, 90, 150);
          ctx.fillStyle = '#706080'; ctx.fillRect(x - 10, y - 60, 70, 130);
          ctx.fillStyle = '#8a70a0'; for (let i = 0; i < 8; i++) ctx.fillRect(x - 10, y - 56 + i * 16, 70, 4);
          // head and jaws
          ctx.fillStyle = '#605070'; ctx.fillRect(x - 44, y - 70, 40, 28);
          ctx.fillStyle = '#ff3020'; ctx.fillRect(x - 36, y - 64, 6, 4);
          ctx.fillStyle = '#f0e0d0'; for (let i = 0; i < 5; i++) ctx.fillRect(x - 44 + i * 6, y - 44, 3, 4);
          // the exposed embryo core
          ctx.fillStyle = '#301020'; ctx.fillRect(x - 18, y + 6, 26, 26);
          ctx.fillStyle = fl ? '#ffffff' : ((frame >> 3) & 1 ? '#40e060' : '#20b040'); ctx.fillRect(x - 14, y + 10, 18, 18);
          ctx.fillStyle = '#ff2020'; ctx.fillRect(x - 10, y + 15, 3, 3);
        } else if (b.k === 'goman') {
          for (const s of b.snake) { ctx.fillStyle = '#40a040'; ctx.fillRect(Math.round(s.x) - 6, Math.round(s.y) - 6, 12, 12); ctx.fillStyle = '#80e080'; ctx.fillRect(Math.round(s.x) - 3, Math.round(s.y) - 4, 6, 3); }
          if (b.snake[0]) { const s0 = b.snake[0]; ctx.fillStyle = '#ff4040'; ctx.fillRect(Math.round(s0.x) - 2, Math.round(s0.y) - 2, 4, 4); }
          const x = Math.round(b.x), y = Math.round(b.y);
          ctx.fillStyle = '#5a2050'; ctx.fillRect(x - 20, y - 80, 110, 160);
          ctx.fillStyle = '#8a3070'; for (let i = 0; i < 10; i++) ctx.fillRect(x - 20 + ((i * 37) % 90), y - 76 + i * 15, 18, 8);
          const o = Math.round(b.open * 12);
          ctx.fillStyle = '#300820'; ctx.fillRect(x - 30, y - 14, 30, 28);
          ctx.fillStyle = fl ? '#ffffff' : '#f0f0e0'; ctx.fillRect(x - 26, y - o, 22, o * 2);
          if (o > 4) { ctx.fillStyle = '#ff2040'; ctx.fillRect(x - 18, y - Math.min(o, 5), 7, Math.min(o, 5) * 2); }
          ctx.fillStyle = '#8a3070'; ctx.fillRect(x - 30, y - 14, 30, 14 - o); ctx.fillRect(x - 30, y + o, 30, 14 - o);
        } else {
          const x = Math.round(b.x);
          ctx.fillStyle = '#404a58'; ctx.fillRect(x - 110, H - 60, 300, 60);
          ctx.beginPath(); ctx.moveTo(x - 110, H - 60); ctx.lineTo(x - 150, H - 60); ctx.lineTo(x - 110, H); ctx.fill();
          ctx.fillStyle = '#5a6878'; ctx.fillRect(x - 150, H - 60, 340, 4);
          ctx.fillStyle = '#303840'; for (let i = 0; i < 14; i++) ctx.fillRect(x - 100 + i * 20, H - 46, 12, 6);
          ctx.fillStyle = '#ffd040'; for (let i = 0; i < 14; i++) if ((i + (frame >> 4)) % 3 === 0) ctx.fillRect(x - 96 + i * 20, H - 44, 4, 2);
          ctx.fillStyle = '#505a68'; ctx.fillRect(x - 100, H - 98, 32, 38); ctx.fillStyle = '#303840'; ctx.fillRect(x - 96, H - 104, 8, 6);
          b.turrets.forEach((hp, i) => {
            const tx = x - 40 + i * 40, ty = H - 68;
            ctx.fillStyle = hp > 0 ? '#808890' : '#302020'; ctx.fillRect(tx - 9, ty - 6, 18, 12);
            if (hp > 0) { ctx.fillStyle = fl ? '#ffffff' : '#ff4040'; ctx.fillRect(tx - 3, ty - 3, 6, 6); const a = Math.atan2(g.p.y - ty, g.p.x - tx); ctx.fillStyle = '#c0c8d0'; for (let k = 6; k < 13; k++) ctx.fillRect(Math.round(tx + Math.cos(a) * k), Math.round(ty + Math.sin(a) * k), 2, 2); }
          });
          const open = b.turrets.every(h => h <= 0);
          ctx.fillStyle = '#202830'; ctx.fillRect(x - 96, H - 94, 24, 24);
          ctx.fillStyle = open ? (fl ? '#ffffff' : ((frame >> 2) & 1 ? '#40c0ff' : '#ffffff')) : '#304050'; ctx.fillRect(x - 92, H - 90, 16, 16);
        }
      }
      function drawShots(ctx) {
        const f = g.force, col = f ? LASERCOL[f.col] : '#ffffff';
        for (const b of g.pb) {
          const x = Math.round(b.x), y = Math.round(b.y);
          if (b.k === 'beam') {
            const l = Math.round(b.len), h = Math.round(b.h);
            ctx.fillStyle = '#2060ff'; ctx.fillRect(x - l, y - h / 2 - 1, l, h + 2);
            ctx.fillStyle = (frame & 2) ? '#80d0ff' : '#c0f0ff'; ctx.fillRect(x - l + 4, y - h / 2, l - 4, h);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x - l + 8, y - 1, l - 8, 2);
          } else if (b.k === 'helix') { ctx.fillStyle = LASERCOL.red; ctx.fillRect(x - 4, y - 1, 8, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y, 4, 1); }
          else if (b.k === 'refl') { ctx.fillStyle = LASERCOL.blue; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x - b.vx * i * 0.8), Math.round(y - b.vy * i * 0.8), 3, 3); }
          else if (b.k === 'ground') { ctx.fillStyle = LASERCOL.yellow; ctx.fillRect(x - 6, y - 1, 12, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 3, y, 6, 1); }
          else if (b.k === 'missile') { ctx.fillStyle = '#e0e0e0'; ctx.fillRect(x - 3, y - 1, 6, 3); ctx.fillStyle = '#ff6020'; ctx.fillRect(Math.round(x - Math.cos(b.ang) * 4) - 1, Math.round(y - Math.sin(b.ang) * 4), 2, 1); }
          else { ctx.fillStyle = '#ffff80'; ctx.fillRect(x - (b.w || 4), y - 1, (b.w || 4) * 2, 2); }
        }
        void col;
        for (const b of g.eb) { const x = Math.round(b.x), y = Math.round(b.y); ctx.fillStyle = (frame & 2) ? '#ff6040' : '#ffb080'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        const IC = { red: ['', LASERCOL.red], blue: ['', LASERCOL.blue], yellow: ['', LASERCOL.yellow], S: ['S', '#40ff80'], M: ['M', '#ff60ff'], B: ['B', '#ffa040'] };
        for (const it of g.items) {
          const x = Math.round(it.x), y = Math.round(it.y), [ch, c] = IC[it.k];
          if (ch) { ctx.fillStyle = '#101010'; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.fillStyle = c; ctx.fillRect(x - 6, y - 6, 12, 1); ctx.fillRect(x - 6, y + 5, 12, 1); text(ctx, ch, x - 2, y - 3, c); }
          else { ctx.fillStyle = c; const r = 3 + ((frame >> 3) & 1); ctx.fillRect(x - r, y - 2, r * 2, 4); ctx.fillRect(x - 2, y - r, 4, r * 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        }
        for (const fx of g.fx) {
          if (fx.t < 0) continue;
          const x = Math.round(fx.x), y = Math.round(fx.y);
          if (fx.k === 'boom' || fx.k === 'big') {
            const r = (fx.k === 'big' ? 6 : 3) + fx.t * (fx.k === 'big' ? 0.9 : 0.6);
            ctx.fillStyle = fx.t < 6 ? '#ffffff' : fx.t < 14 ? '#ffd040' : '#e04010';
            ctx.fillRect(x - r, y - r / 2, r * 2, r); ctx.fillRect(x - r / 2, y - r, r, r * 2);
          } else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2); fx.t++; }
        }
      }
      function drawHUD(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, HUD);
        text(ctx, '1P', 4, 5, '#4080ff'); text(ctx, String(g ? g.score : 0), 80, 5, '#ffffff', 1, 'right');
        text(ctx, 'HI', 96, 5, '#ff4040'); text(ctx, String(hi), 162, 5, '#ffffff', 1, 'right');
        if (mode !== 'game' || !g) return;
        text(ctx, 'BEAM', 176, 5, '#80c0ff');
        ctx.fillStyle = '#203050'; ctx.fillRect(204, 5, 92, 7);
        ctx.fillStyle = g.p.charge >= 90 ? ((frame & 4) ? '#ffffff' : '#40c0ff') : '#2080ff'; ctx.fillRect(205, 6, Math.round(90 * g.p.charge / 90), 5);
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) ctx.drawImage(SHIP, 304 + i * 13, 4, 12, 6);
      }
      function drawTitle(ctx) {
        ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, H);
        drawStars(ctx, '#ffffff');
        const page = Math.floor(titleT / 420) % 2;
        if (page === 0) {
          text(ctx, 'R-TYPE', W / 2 + 3, 49, '#102040', 7, 'center');
          text(ctx, 'R-TYPE', W / 2, 46, '#4080ff', 7, 'center');
          text(ctx, 'R-TYPE', W / 2, 46, 'rgba(160,200,255,' + (0.3 + 0.3 * Math.sin(titleT * 0.08)) + ')', 7, 'center');
          text(ctx, 'BLAST OFF AND STRIKE THE EVIL BYDO EMPIRE!', W / 2, 112, '#ffd040', 1, 'center');
          const sx = ((titleT * 1.5) % (W + 80)) - 40;
          ctx.drawImage(SHIP, Math.round(sx) - 15, 140);
          ctx.fillStyle = '#ff8020'; ctx.fillRect(Math.round(sx) + 22, 141, 10, 10); ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(sx) + 24, 143, 6, 6);
          text(ctx, 'HI-SCORE ' + hi, W / 2, 170, '#ffffff', 1, 'center');
        } else {
          text(ctx, '- HOW TO PLAY -', W / 2, 36, '#ffd040', 1, 'center');
          ['SPACE: FIRE. HOLD TO CHARGE THE WAVE CANNON', 'X: LAUNCH OR RECALL THE FORCE', 'THE FORCE BLOCKS BULLETS AND CANNOT BE DESTROYED', 'SHOOT POW ARMOR FOR POWER-UPS:', 'RED: ANTI-AIR  BLUE: REFLECT  YELLOW: GROUND', 'S: SPEED  M: HOMING MISSILE  B: BIT', 'DO NOT TOUCH THE WALLS!']
            .forEach((l, i) => text(ctx, l, W / 2, 58 + i * 15, i === 6 ? '#ff6040' : '#ffffff', 1, 'center'));
          text(ctx, 'EXTEND 50000 AND EVERY 100000 PTS', W / 2, 170, '#ffd040', 1, 'center');
        }
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0 || api.credits === 0) { if (coinFlash > 0 ? (frame >> 2) & 1 : blink) text(ctx, 'INSERT COIN', W / 2, 200, '#ff4040', 1, 'center'); }
        else if (blink) text(ctx, 'PUSH START', W / 2, 200, '#40ffff', 1, 'center');
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), 4, H - 10, '#ffffff');
        text(ctx, '\u00a9 1987 IREM CORP.', W - 4, H - 10, '#c0c0c0', 1, 'right');
      }
      function render(ctx) {
        if (mode === 'title') { drawTitle(ctx); drawHUD(ctx); return; }
        ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, H);
        drawStars(ctx, stg().star);
        drawTerrain(ctx);
        drawBoss(ctx);
        drawEnemies(ctx);
        drawShip(ctx);
        drawForce(ctx);
        drawShots(ctx);
        if (g.boss && g.boss.st !== 'dead') {
          text(ctx, stg().bname, W / 2, HUD + 4, '#ffd040', 1, 'center');
          ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 80, HUD + 13, 160, 5);
          ctx.fillStyle = '#e03020'; ctx.fillRect(W / 2 - 79, HUD + 14, Math.round(158 * g.boss.hp / g.boss.max), 3);
        }
        drawHUD(ctx);
        if (g.phase === 'intro') { text(ctx, 'STAGE ' + (g.stage + 1), W / 2, 100, '#ffffff', 2, 'center'); text(ctx, stg().name, W / 2, 122, '#ffd040', 1, 'center'); if (g.loop) text(ctx, 'LOOP ' + (g.loop + 1), W / 2, 136, '#ff8080', 1, 'center'); }
        if (g.phase === 'clear') { text(ctx, 'STAGE CLEAR', W / 2, 100, '#ffffff', 2, 'center'); text(ctx, 'BONUS ' + g.bonus, W / 2, 124, '#ffd040', 1, 'center'); }
        if (g.phase === 'over') text(ctx, 'GAME OVER', W / 2, 120, '#ff4040', 2, 'center');
      }
      if (api.debugHook) api.debugHook({ g: () => g, inv: () => { if (g && g.p) g.p.inv = Math.max(g.p.inv, 3); }, sum: () => g && { mode, ph: g.phase, st: g.stage, loop: g.loop, lives: g.lives, sc: g.score, sx: g.sx | 0, force: g.force && g.force.col + g.force.lvl + g.force.st, en: g.en.length, boss: g.boss && g.boss.hp, tur: g.boss && g.boss.turrets && g.boss.turrets.join(',') } });
      return { update, render, destroy() { } };
    }
  });
})();
