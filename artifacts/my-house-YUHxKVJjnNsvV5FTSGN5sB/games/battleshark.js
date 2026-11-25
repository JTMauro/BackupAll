// Battle Shark (Taito, 1989) \u2014 from-scratch recreation of the first-person periscope submarine shooter.
// Procedural graphics, synthesized sound. Mouse or arrows aim, Space/click fires, X toggles torpedo depth.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '%': [24, 25, 2, 4, 8, 19, 3]
  };
  function text(ctx, s, x, y, col, o) {
    o = o || {}; const sc = o.scale || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (o.center) x = Math.round(x - w / 2); else if (o.right) x = x - w;
    if (o.shadow) text(ctx, s, x + sc, y + sc, o.shadow, { scale: sc });
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }

  const W = 320, H = 240, VIEWH = 192, F = 260, CAMH = 10, HY0 = 78;
  const CX = 160, CY = 96, RX = 156, RY = 92;       // periscope ellipse
  const DEEP = -14;

  const MISSIONS = [
    { text: 'SINK 8 TRANSPORTS', what: 'transport', n: 8, boss: 'battleship', label: 'TRANSPORTS' },
    { text: 'SINK 7 DESTROYERS', what: 'destroyer', n: 7, boss: 'carrier', label: 'DESTROYERS' },
    { text: 'SHOOT DOWN 10 HELICOPTERS', what: 'heli', n: 10, boss: 'battleship', label: 'HELICOPTERS' },
    { text: 'SINK 6 SUBMARINES', what: 'sub', n: 6, boss: 'carrier', label: 'SUBMARINES' },
    { text: 'SINK 15 ENEMY SHIPS', what: 'ship', n: 15, boss: 'dreadnought', label: 'SHIPS' }
  ];
  const UPGRADES = [
    ['TORPEDO SPEED UP', u => { u.tspd = 6; }],
    ['TWIN TORPEDOES', u => { u.spread = 2; }],
    ['RAPID RELOAD', u => { u.reload = 60; u.mreload = 40; }],
    ['5 TORPEDO TUBES', u => { u.tubes = 5; }],
    ['TRIPLE TORPEDOES', u => { u.spread = 3; u.tspd = 7; }]
  ];
  const PTS = { transport: 500, destroyer: 1000, patrol: 300, sub: 1500, heli: 800, fighter: 600, dc: 100, etorp: 200, crate: 0 };

  ArcadeRegistry.register({
    id: 'battleshark', title: 'Battle Shark', year: 1989, maker: 'Taito',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Mouse/Arrows: aim \u00b7 Click/Space: fire (torpedo below horizon, missile above) \u00b7 X: depth \u00b7 Enter: start',
    marquee: { bg: '#04121e', fg: '#40c8ff', accent: '#ff3020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(100000);
      let mode = 'title', titleT = 0, frame = 0;
      let coinOp = false, lastCred = api.credits, coinFlash = 0;
      function pollCoins() {
        const c = api.credits; if (c === 0) coinOp = true;
        if (c > lastCred) au.tone(1760, 0.06, { type: 'square', vol: 0.07, slideTo: 2640 });
        lastCred = c;
      }
      function tryStart() {
        if (api.useCredit()) { lastCred = api.credits; return true; }
        coinFlash = 90; au.tone(98, 0.28, { type: 'square', vol: 0.14 });
        return false;
      }
      const sfx = {
        ping() { au.tone(1180, 0.9, { type: 'sine', vol: 0.06 }); au.tone(1180, 0.6, { type: 'sine', vol: 0.025, delay: 0.35 }); },
        torp() { au.noise(0.45, { freq: 1400, slideTo: 300, vol: 0.12 }); au.tone(220, 0.3, { type: 'triangle', slideTo: 110, vol: 0.08 }); },
        missile() { au.noise(0.35, { freq: 5000, slideTo: 1500, vol: 0.1, type: 'bandpass' }); au.tone(600, 0.3, { type: 'sawtooth', slideTo: 1500, vol: 0.04 }); },
        empty() { au.tone(140, 0.06, { type: 'square', vol: 0.06 }); },
        boom() { au.noise(0.8, { freq: 1200, slideTo: 80, vol: 0.22 }); au.tone(90, 0.5, { type: 'sine', slideTo: 40, vol: 0.12 }); },
        bigBoom() { au.noise(1.6, { freq: 900, slideTo: 40, vol: 0.3 }); au.tone(70, 1.2, { type: 'sine', slideTo: 25, vol: 0.2 }); },
        pop() { au.noise(0.25, { freq: 3000, slideTo: 400, vol: 0.12 }); },
        hurt() { au.noise(0.6, { freq: 500, slideTo: 60, vol: 0.32 }); au.tone(60, 0.5, { type: 'square', slideTo: 30, vol: 0.12 }); },
        splash() { au.noise(0.3, { freq: 2500, slideTo: 600, vol: 0.07, type: 'bandpass' }); },
        alarm() { au.tone(880, 0.12, { type: 'square', vol: 0.06 }); au.tone(660, 0.12, { type: 'square', vol: 0.06, delay: 0.14 }); },
        depth() { au.tone(500, 0.06, { type: 'square', vol: 0.06 }); au.tone(750, 0.06, { type: 'square', vol: 0.06, delay: 0.06 }); },
        item() { au.melody([[784, .06], [988, .06], [1175, .06], [1568, .15]], { type: 'square', vol: 0.08 }); },
        whistle() { au.tone(1800, 0.9, { type: 'sine', slideTo: 500, vol: 0.04 }); },
        extra() { au.melody([[1047, .08], [1319, .08], [1568, .08], [2093, .2]], { type: 'square', vol: 0.08 }); }
      };

      // ---------- view ----------
      let hy = HY0, bob = 0;
      function proj(x, alt, z) { const s = F / z; return { x: CX + x * s, y: hy + (CAMH - alt) * s, s }; }
      const cross = { x: 160, y: 120, lmx: -1, lmy: -1 };

      // ---------- game state ----------
      let g = null;
      function newGame() {
        g = {
          score: 0, lives: 2, nextExtra: 100000, stage: 0, loop: 0,
          hull: 100, objs: [], torps: [], miss: [], fx: [], pops: [],
          up: { tspd: 4.5, spread: 1, reload: 90, mreload: 60, tubes: 4 },
          tubes: [], mtubes: [], deep: false, shake: 0, flash: 0, redFlash: 0, msg: null, msgT: 0
        };
        resetTubes();
        startStage(0);
      }
      function resetTubes() { g.tubes = []; for (let i = 0; i < g.up.tubes; i++) g.tubes.push(0); g.mtubes = [0, 0]; }
      function lvl() { return g.stage + g.loop * 5; }
      function startStage(n) {
        g.stage = n; g.mi = MISSIONS[n % MISSIONS.length];
        g.count = 0; g.phase = 'brief'; g.phaseT = 210; g.objs = []; g.torps = []; g.miss = []; g.boss = null;
        g.spawnT = 60; g.crateT = 900; g.pingT = 30; g.tilt = 0;
        resetTubes();
        au.melody([[392, .12], [523, .12], [659, .12], [784, .3], [659, .12], [784, .4]], { type: 'square', vol: 0.07 });
      }

      // ---------- objects ----------
      // k: transport | destroyer | patrol | sub | heli | fighter | dc | etorp | crate | boss
      const SHIP = {
        transport: { L: 46, B: 9, hp: 2, col: '#7a6a58' },
        destroyer: { L: 36, B: 6, hp: 3, col: '#68727e' },
        patrol: { L: 16, B: 4, hp: 1, col: '#6e7a70' },
        sub: { L: 34, B: 5, hp: 2, col: '#203040' }
      };
      function spawnShip(k, o) {
        const d = SHIP[k], side = Math.random() < 0.5 ? -1 : 1;
        const z = o && o.z || 260 + Math.random() * 300;
        const e = Object.assign({ k, L: d.L, B: d.B, hp: d.hp + (k === 'transport' && g.loop ? 1 : 0), col: d.col, z, x: -side * (z * 0.75 + 30), vx: side * (0.25 + Math.random() * 0.25), vz: 0, alt: 0, t: 0, cool: 120 + Math.random() * 120, flash: 0, sink: 0 }, o || {});
        if (k === 'patrol') { e.vx = side * (0.9 + Math.random() * 0.5 + lvl() * 0.04); e.z = 140 + Math.random() * 160; e.x = -side * (e.z * 0.75 + 20); }
        if (k === 'destroyer') { e.z = 420 + Math.random() * 160; e.x = (Math.random() - 0.5) * 260; e.vz = -(0.55 + Math.random() * 0.3 + lvl() * 0.03); e.vx = -e.x / 900; e.drops = 0; }
        if (k === 'sub') { e.alt = DEEP; e.z = 180 + Math.random() * 220; e.x = -side * (e.z * 0.7 + 20); e.vx = side * (0.3 + Math.random() * 0.2); }
        g.objs.push(e); return e;
      }
      function spawnHeli() {
        const side = Math.random() < 0.5 ? -1 : 1;
        g.objs.push({ k: 'heli', x: side * 260, z: 320, alt: 34 + Math.random() * 20, tx: (Math.random() - 0.5) * 60, tz: 70 + Math.random() * 60, hp: 1, t: 0, cool: 90, state: 'in', drops: 0, flash: 0, hw: 9, hh: 6 });
      }
      function spawnFighter(x, z) {
        g.objs.push({ k: 'fighter', x: x != null ? x : (Math.random() - 0.5) * 300, z: z || 650, alt: 60, hp: 1, t: 0, fired: false, flash: 0, hw: 10, hh: 5 });
      }
      function spawnBoss() {
        const k = g.mi.boss;
        const b = { k: 'boss', type: k, x: -260, z: 340, alt: 0, vx: 0.32, vz: 0, t: 0, flash: 0, sink: 0, salvoT: 200, launchT: 160, bracket: 0 };
        if (k === 'battleship') { b.L = 120; b.B = 16; b.hp = 12; b.col = '#5c646c'; }
        else if (k === 'carrier') { b.L = 150; b.B = 22; b.hp = 16; b.col = '#606a62'; b.z = 380; }
        else { b.L = 160; b.B = 20; b.hp = 22; b.col = '#4e545c'; b.z = 360; }
        b.hp += g.loop * 6; b.max = b.hp;
        g.boss = b; g.objs.push(b);
        g.msg = 'WARNING! ' + (k === 'carrier' ? 'AIRCRAFT CARRIER' : k === 'battleship' ? 'BATTLESHIP' : 'DREADNOUGHT') + ' APPROACHING'; g.msgT = 200;
        for (let i = 0; i < 6; i++) au.tone(i & 1 ? 660 : 880, 0.14, { type: 'square', vol: 0.06, delay: i * 0.16 });
      }
      // extents of a ship against a torpedo given heading
      function extents(o) {
        const sp = Math.hypot(o.vx || 0, o.vz || 0) || 1;
        const ux = Math.abs((o.vx || 0) / sp), uz = Math.abs((o.vz || 0) / sp);
        return { hw: o.L / 2 * ux + o.B / 2 * uz + 1, dz: o.L / 2 * uz + o.B / 2 * ux + 3, ux, uz };
      }
      function dropDC(x, z) { g.objs.push({ k: 'dc', x: x + (Math.random() - 0.5) * 16, z: Math.max(14, z + (Math.random() - 0.5) * 16), alt: 2, t: 0, hp: 1 }); sfx.splash(); }
      function fireEtorp(o) {
        const d = Math.hypot(o.x, o.z), spd = 1.6 + lvl() * 0.08;
        g.objs.push({ k: 'etorp', x: o.x, z: o.z, alt: -4, vx: -o.x / d * spd, vz: -o.z / d * spd, hp: 1, t: 0 });
      }

      // ---------- player weapons ----------
      function fire() {
        if (g.phase === 'dead' || g.phase === 'over' || g.phase === 'clear') return;
        if (cross.y > hy + 1) {
          const i = g.tubes.findIndex(t => t <= 0);
          if (i < 0) { sfx.empty(); return; }
          g.tubes[i] = g.up.reload;
          const dir = (cross.x - CX) / F, n = g.up.spread;
          for (let k = 0; k < n; k++) {
            const off = n === 1 ? 0 : (k - (n - 1) / 2) * 0.035;
            g.torps.push({ dir: dir + off, z: 6, pz: 6, deep: g.deep, t: 0, side: i % 2 ? 1 : -1 });
          }
          sfx.torp();
        } else {
          const i = g.mtubes.findIndex(t => t <= 0);
          if (i < 0) { sfx.empty(); return; }
          g.mtubes[i] = g.up.mreload;
          g.miss.push({ dx: (cross.x - CX) / F, da: (hy - cross.y) / F, z: 4, pz: 4, t: 0 });
          sfx.missile();
        }
      }
      function plume(x, z, big, fire) { g.fx.push({ k: 'plume', x, z, t: 0, big: big || 1, fire: !!fire }); }
      function airBurst(x, alt, z) { g.fx.push({ k: 'burst', x, z, alt, t: 0 }); }
      function addScore(n) {
        g.score += n;
        while (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 300000; sfx.extra(); }
        if (g.score > hi) hi = g.score;
      }
      function pop(x, alt, z, txt) { const p = proj(x, alt, z); g.pops.push({ x: p.x, y: p.y - 10, txt, t: 60 }); }
      function counts(k) { const w = g.mi.what; return w === k || (w === 'ship' && (k === 'transport' || k === 'destroyer' || k === 'patrol')); }
      function kill(o) {
        o.dead = true;
        const pts = PTS[o.k] || 0;
        if (pts) { addScore(pts * (1 + g.loop)); if (pts >= 300) pop(o.x, o.alt, o.z, String(pts * (1 + g.loop))); }
        if (o.k === 'heli' || o.k === 'fighter') { airBurst(o.x, o.alt, o.z); sfx.boom(); o.falling = 1; o.dead = false; o.hp = 0; }
        else if (o.k === 'dc' || o.k === 'etorp') { plume(o.x, o.z, 1); sfx.pop(); }
        else if (o.k === 'crate') { plume(o.x, o.z, 1); collectCrate(o); }
        else { plume(o.x, o.z, 2, true); sfx.boom(); o.sink = 1; o.dead = false; o.hp = 0; }
        if (g.phase === 'play' && counts(o.k)) {
          g.count++;
          if (g.count >= g.mi.n) { g.phase = 'boss'; g.phaseT = 150; }
        }
      }
      function collectCrate(o) {
        sfx.item();
        if (g.hull < 70 || o.kind === 'repair') { g.hull = Math.min(100, g.hull + 35); g.msg = 'HULL REPAIRED'; }
        else { addScore(3000); g.msg = 'SUPPLY BONUS 3000'; }
        g.msgT = 120;
      }
      function damage(n) {
        if (g.phase === 'dead' || g.phase === 'over' || g.phase === 'clear' || g.phase === 'brief') return;
        n = Math.round(n * (1 + g.loop * 0.25));
        g.hull -= n; g.shake = Math.max(g.shake, 12 + n); g.redFlash = 10; sfx.hurt();
        if (g.hull <= 0) { g.hull = 0; g.phase = 'dead'; g.phaseT = 200; sfx.bigBoom(); }
        else if (g.hull < 30) sfx.alarm();
      }

      function stepWeapons() {
        for (let i = 0; i < g.tubes.length; i++) if (g.tubes[i] > 0) g.tubes[i]--;
        for (let i = 0; i < g.mtubes.length; i++) if (g.mtubes[i] > 0) g.mtubes[i]--;
        for (const t of g.torps) {
          t.t++; t.pz = t.z; t.z += g.up.tspd * (t.z < 30 ? 0.7 : 1);
          for (const o of g.objs) {
            if (o.dead || o.sink || o.falling || o.k === 'heli' || o.k === 'fighter') continue;
            let hw, dz;
            if (o.k === 'dc' || o.k === 'etorp') { hw = 6; dz = 6; }
            else if (o.k === 'crate') { hw = 5; dz = 5; }
            else { if ((o.k === 'sub') !== t.deep) continue; const e = extents(o); hw = e.hw; dz = e.dz; }
            if (t.z >= o.z - dz && t.pz <= o.z + dz) {
              const tx = t.dir * Math.min(Math.max(o.z, t.pz), t.z);
              if (Math.abs(tx - o.x) < hw) {
                t.dead = true;
                if (o.k === 'boss') hitBoss(o, tx);
                else { o.hp--; o.flash = 6; if (o.hp <= 0) kill(o); else { plume(tx, o.z, 1, true); sfx.boom(); } }
                break;
              }
            }
          }
          if (t.z > 720) t.dead = true;
        }
        g.torps = g.torps.filter(t => !t.dead);
        for (const m of g.miss) {
          m.t++; m.pz = m.z; m.z += 9;
          for (const o of g.objs) {
            if (o.dead || o.falling || (o.k !== 'heli' && o.k !== 'fighter')) continue;
            if (m.z >= o.z - 8 && m.pz <= o.z + 8) {
              const mx = m.dx * o.z, ma = CAMH + m.da * o.z;
              if (Math.abs(mx - o.x) < o.hw && Math.abs(ma - o.alt) < o.hh) { m.dead = true; o.hp--; if (o.hp <= 0) kill(o); break; }
            }
          }
          if (m.z > 700 || CAMH + m.da * m.z > 200) m.dead = true;
        }
        g.miss = g.miss.filter(m => !m.dead);
      }
      function hitBoss(b, tx) {
        b.hp--; b.flash = 8; plume(tx, b.z, 2, true); sfx.boom(); g.shake = Math.max(g.shake, 4);
        b.bracket = Math.max(0, b.bracket - 1);
        if (b.hp <= 0) {
          b.sink = 1; b.hp = 0; sfx.bigBoom();
          const pts = 20000 + g.stage * 10000;
          addScore(pts); pop(b.x, 20, b.z, String(pts));
          for (let i = 0; i < 6; i++) g.fx.push({ k: 'plume', x: b.x + (Math.random() - 0.5) * b.L, z: b.z, t: -i * 12, big: 3, fire: true });
          g.phase = 'clear'; g.phaseT = 330;
          for (const o of g.objs) if (o !== b && (o.k === 'dc' || o.k === 'etorp' || o.k === 'shell')) o.dead = true;
        }
      }

      // ---------- enemies ----------
      function updObjs() {
        const L = lvl();
        for (const o of g.objs) {
          if (o.dead) continue;
          o.t++; if (o.flash) o.flash--;
          if (o.sink) { o.sink++; o.x += (o.vx || 0) * 0.3; if (o.sink > (o.k === 'boss' ? 240 : 110)) o.dead = true; continue; }
          if (o.falling) { o.falling++; o.alt -= 0.6 + o.falling * 0.02; o.z += o.k === 'fighter' ? -2 : 0; if (o.alt <= 0 || o.z < 8) { if (o.z > 8) plume(o.x, o.z, 1); o.dead = true; } continue; }
          switch (o.k) {
            case 'transport': case 'patrol': case 'sub':
              o.x += o.vx; o.z += o.vz || 0;
              if (Math.abs(o.x) > o.z * 0.85 + 80 && o.t > 60) o.dead = 'gone';
              if (o.k === 'patrol' && --o.cool <= 0 && Math.abs(o.x) < o.z * 0.6) {
                o.cool = Math.max(60, 150 - L * 8) + Math.random() * 60;
                for (let i = 0; i < 3; i++) g.fx.push({ k: 'plume', x: (Math.random() - 0.5) * 40, z: 18 + Math.random() * 25, t: -i * 8, big: 0.5 });
                if (Math.random() < 0.45) g.hitQ = { t: 22, n: 3 };
                au.tone(300, 0.05, { type: 'square', vol: 0.05 }); au.tone(300, 0.05, { type: 'square', vol: 0.05, delay: 0.1 });
              }
              if (o.k === 'sub' && --o.cool <= 0 && Math.abs(o.x) < o.z * 0.6) { o.cool = Math.max(150, 320 - L * 12) + Math.random() * 120; fireEtorp(o); }
              break;
            case 'destroyer':
              o.x += o.vx; o.z += o.vz;
              if (o.z < 75 && Math.abs(o.x) < 50 && o.drops < 3 + Math.min(3, L >> 1) && o.t % 18 === 0) { o.drops++; dropDC(o.x, o.z); }
              if (o.z < 6) o.dead = 'gone';
              break;
            case 'heli': {
              if (o.state === 'in') {
                o.x += (o.tx - o.x) * 0.012; o.z += (o.tz - o.z) * 0.012;
                if (Math.abs(o.z - o.tz) < 6) { o.state = 'hover'; o.t = 0; }
              } else if (o.state === 'hover') {
                o.x += Math.sin(o.t / 40) * 0.3;
                if (o.t % Math.max(40, 80 - L * 4) === 30 && o.drops < 4) { o.drops++; dropDC(o.x, o.z); }
                if (o.t > 300) o.state = 'out';
              } else { o.z += 1.4; o.alt += 0.2; if (o.z > 700) o.dead = 'gone'; }
              break;
            }
            case 'fighter':
              o.z -= 3.2 + L * 0.1; if (o.z < 200) o.alt = Math.max(14, o.alt - 0.5);
              o.x += -o.x * 0.006;
              if (!o.fired && o.z < 70) { o.fired = true; for (let i = 0; i < 4; i++) g.fx.push({ k: 'plume', x: o.x * 0.5 + (Math.random() - 0.5) * 20, z: 14 + i * 12, t: -i * 4, big: 0.4 }); g.hitQ = { t: 18, n: 5 }; au.noise(0.4, { freq: 3000, vol: 0.12 }); }
              if (o.z < 8) o.dead = 'gone';
              break;
            case 'dc':
              o.t++; o.alt = Math.max(-18, o.alt - 0.16);
              if (o.t > 130) {
                o.dead = true; const d = Math.hypot(o.x, o.z);
                plume(o.x, o.z, 2.5); sfx.bigBoom(); g.flash = 4;
                damage(d < 35 ? 14 : d < 60 ? 8 : d < 90 ? 4 : 0);
                if (d >= 90) g.shake = Math.max(g.shake, 6);
              }
              break;
            case 'etorp':
              o.x += o.vx; o.z += o.vz;
              if (o.t % 30 === 0) au.tone(900, 0.05, { type: 'sine', vol: 0.03 });
              if (o.z < 6) { o.dead = true; plume(o.x, 8, 3); sfx.bigBoom(); damage(15); }
              break;
            case 'crate':
              o.x += o.vx; if (Math.abs(o.x) > o.z + 40) o.dead = 'gone';
              break;
            case 'shell':
              if (--o.t2 <= 0) {
                o.dead = true; plume(o.x, o.z, o.z < 30 ? 3 : 2); sfx.splash(); au.noise(0.5, { freq: 700, slideTo: 80, vol: 0.18 });
                if (o.z < 30 && Math.abs(o.x) < 30) damage(10);
                else g.shake = Math.max(g.shake, 3);
              }
              break;
            case 'boss': updBoss(o, L); break;
          }
        }
        g.objs = g.objs.filter(o => !o.dead);
        if (g.hitQ && --g.hitQ.t <= 0) { damage(g.hitQ.n); g.hitQ = null; }
      }
      function updBoss(b, L) {
        if (b.x < -120 && b.t < 900) { b.x += 0.7; return; }
        b.x += b.vx; if (b.x > 120 || b.x < -120) b.vx = -b.vx;
        if (b.type !== 'carrier' && --b.salvoT <= 0) {
          // walking salvo: each salvo lands closer until it straddles you
          b.salvoT = Math.max(110, 230 - L * 10);
          const ranges = [150, 90, 45, 18];
          const z = ranges[Math.min(3, b.bracket)];
          b.bracket++;
          sfx.whistle(); g.fx.push({ k: 'flash', x: b.x, z: b.z, t: 0 });
          const n = b.type === 'dreadnought' ? 4 : 3;
          for (let i = 0; i < n; i++) g.objs.push({ k: 'shell', x: (Math.random() - 0.5) * (z < 30 ? 30 : 70), z: z + (Math.random() - 0.5) * 10, alt: 0, t: 0, t2: 70 + i * 6 });
        }
        if ((b.type === 'carrier' || b.type === 'dreadnought') && --b.launchT <= 0) {
          b.launchT = Math.max(120, (b.type === 'carrier' ? 200 : 300) - L * 10);
          if (b.type === 'carrier' && b.t % 3 === 0) { spawnHeli(); const h = g.objs[g.objs.length - 1]; h.x = b.x; h.z = b.z; h.alt = 6; }
          else spawnFighter(b.x, b.z);
        }
        if (b.t % 400 === 200 && g.objs.filter(o => o.k === 'destroyer').length < 1 + (L >> 2)) spawnShip('destroyer', { z: b.z + 30 });
      }

      function spawner() {
        if (g.phase !== 'play' && g.phase !== 'boss') return;
        const L = lvl();
        if (--g.crateT <= 0) {
          g.crateT = 1300 + Math.random() * 600;
          const side = Math.random() < 0.5 ? -1 : 1;
          g.objs.push({ k: 'crate', x: -side * 140, z: 110 + Math.random() * 100, alt: 0, vx: side * 0.35, hp: 1, t: 0, kind: g.hull < 70 ? 'repair' : 'bonus' });
        }
        if (--g.spawnT > 0) return;
        const live = g.objs.filter(o => o.k !== 'dc' && o.k !== 'shell' && o.k !== 'etorp' && o.k !== 'crate' && !o.sink && !o.falling).length;
        const cap = (g.phase === 'boss' ? 3 : 5) + Math.min(4, L >> 1);
        g.spawnT = Math.max(40, 120 - L * 8) + Math.random() * 50;
        if (live >= cap) return;
        const r = Math.random();
        const w = g.mi.what;
        let k;
        if (g.phase === 'play' && r < 0.45) k = w === 'ship' ? ['transport', 'destroyer', 'patrol'][Math.floor(Math.random() * 3)] : w;
        else {
          const pool = ['transport', 'patrol', 'destroyer', 'heli', 'transport'];
          if (L >= 1) pool.push('sub', 'fighter');
          if (L >= 3) pool.push('heli', 'sub', 'fighter', 'destroyer');
          k = pool[Math.floor(Math.random() * pool.length)];
        }
        if (k === 'heli') spawnHeli();
        else if (k === 'fighter') { spawnFighter(); if (L >= 4) spawnFighter(); }
        else spawnShip(k);
      }

      function update() {
        frame++; pollCoins(); if (coinFlash > 0) coinFlash--;
        bob += 0.03; hy = HY0 + Math.sin(bob) * 1.5;
        if (mode === 'title') {
          titleT++;
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'game'; newGame(); }
          return;
        }
        // aim
        const m = api.mouse;
        if (m.x !== cross.lmx || m.y !== cross.lmy) { if (cross.lmx >= 0) { cross.x = m.x; cross.y = m.y; } cross.lmx = m.x; cross.lmy = m.y; }
        const sp = 2.6;
        if (api.key('ArrowLeft')) cross.x -= sp; if (api.key('ArrowRight')) cross.x += sp;
        if (api.key('ArrowUp')) cross.y -= sp * 0.8; if (api.key('ArrowDown')) cross.y += sp * 0.8;
        cross.x = Math.max(14, Math.min(W - 14, cross.x)); cross.y = Math.max(10, Math.min(VIEWH - 8, cross.y));
        if (Math.abs(cross.y - hy) < 2) cross.y = cross.y < hy ? hy - 2 : hy + 2;
        if (api.pressed('KeyX') || api.pressed('KeyZ')) { g.deep = !g.deep; sfx.depth(); }
        if (api.pressed('Space') || (m.clicked && m.y < VIEWH)) fire();
        if (g.shake > 0) g.shake--; if (g.flash > 0) g.flash--; if (g.redFlash > 0) g.redFlash--;
        if (g.msgT > 0) g.msgT--;
        for (const f of g.fx) f.t++;
        g.fx = g.fx.filter(f => f.t < (f.k === 'flash' ? 10 : f.k === 'burst' ? 40 : 70));
        for (const p of g.pops) { p.t--; p.y -= 0.3; }
        g.pops = g.pops.filter(p => p.t > 0);
        if (--g.pingT <= 0) { g.pingT = 200; if (g.phase !== 'over') sfx.ping(); }
        if (g.phase === 'over') { if (--g.phaseT <= 0 || (g.phaseT < 200 && api.anyPressed('Enter'))) { mode = 'title'; titleT = 0; } return; }
        if (g.phase === 'brief') { if (--g.phaseT <= 0) g.phase = 'play'; stepWeapons(); return; }
        if (g.phase === 'boss' && !g.boss) { if (--g.phaseT <= 0) spawnBoss(); }
        if (g.phase === 'dead') {
          g.phaseT--; g.tilt += 0.002;
          updObjs();
          if (g.phaseT <= 0) {
            if (g.lives <= 0) {
              const cg = g; g.phaseT = 99999;
              if (api.offerContinue) api.offerContinue(() => { if (g === cg) { g.lives = 2; revive(); } }, () => { if (g === cg) gameOver(); });
              else gameOver();
            } else { g.lives--; revive(); }
          }
          return;
        }
        if (g.phase === 'clear') {
          g.phaseT--; updObjs(); stepWeapons();
          if (g.phaseT === 200) { const bonus = g.hull * 100; g.bonus = bonus; addScore(bonus); const u = UPGRADES[g.stage % UPGRADES.length]; if (g.loop === 0) { u[1](g.up); g.upMsg = u[0]; } else { g.hull = Math.min(100, g.hull + 30); g.upMsg = 'HULL REPAIRED'; } sfx.item(); }
          if (g.phaseT <= 0) {
            const n = g.stage + 1; if (n % MISSIONS.length === 0) g.loop++;
            g.hull = Math.min(100, g.hull + 25); g.upMsg = null;
            startStage(n);
          }
          return;
        }
        spawner(); updObjs(); stepWeapons();
      }
      function revive() {
        g.hull = 100; g.tilt = 0; g.phase = g.boss && !g.boss.sink ? 'boss' : g.count >= g.mi.n ? 'boss' : 'play'; g.phaseT = 120;
        g.objs = g.objs.filter(o => o.k !== 'dc' && o.k !== 'etorp' && o.k !== 'shell' && o.k !== 'fighter');
        if (g.boss) g.boss.bracket = 0;
        resetTubes();
        g.msg = 'SUBMARINE READY'; g.msgT = 120;
      }
      function gameOver() {
        api.setHiScore(g.score);
        g.phase = 'over'; g.phaseT = 360;
        au.melody([[440, .25], [415, .25], [392, .25], [370, .25], [349, .6]], { type: 'triangle', vol: 0.14 });
      }

      // ---------- rendering ----------
      function drawSky(ctx) {
        const top = Math.floor(hy);
        const sky = ['#1a3c74', '#24508a', '#3466a0', '#4a7eb4', '#6696c4', '#86b0d4', '#a8c8e0'];
        for (let i = 0; i < sky.length; i++) { const y0 = Math.floor(top * i / sky.length); ctx.fillStyle = sky[i]; ctx.fillRect(0, y0, W, Math.ceil(top / sky.length) + 1); }
        // clouds
        for (let i = 0; i < 6; i++) {
          const cx = ((i * 83 + frame * 0.04 * (1 + i % 2)) % 420) - 50, cy = 14 + (i * 23) % 40;
          ctx.fillStyle = 'rgba(235,240,250,.75)'; ctx.fillRect(cx, cy, 40 + i * 6, 4); ctx.fillRect(cx + 8, cy - 3, 24, 3); ctx.fillRect(cx + 4, cy + 4, 30, 2);
        }
        // distant islands
        ctx.fillStyle = '#3a5a6a';
        ctx.fillRect(20, top - 4, 40, 4); ctx.fillRect(30, top - 7, 18, 3); ctx.fillRect(230, top - 3, 60, 3); ctx.fillRect(250, top - 6, 14, 3);
        // sea
        for (let y = top; y < VIEWH; y++) {
          const z = CAMH * F / Math.max(0.5, y - hy);
          const t = Math.min(1, 60 / z);
          const r = Math.round(40 - 26 * t), gg = Math.round(100 - 58 * t), b = Math.round(150 - 52 * t);
          ctx.fillStyle = 'rgb(' + r + ',' + gg + ',' + b + ')'; ctx.fillRect(0, y, W, 1);
        }
        // wave crests moving toward viewer
        const off = (frame * 0.6) % 24;
        for (let n = 1; n < 40; n++) {
          const z = n * 24 - off; if (z < 12) continue;
          const p = proj(0, 0, z); if (p.y >= VIEWH) continue;
          const s = p.s;
          ctx.fillStyle = z < 80 ? 'rgba(200,230,255,.45)' : 'rgba(170,210,240,.35)';
          for (let k = -6; k <= 6; k++) {
            const wx = k * 30 + ((n * 17) % 30) + Math.sin(frame / 50 + n) * 4;
            const sx = CX + wx * s; if (sx < -10 || sx > W + 10) continue;
            ctx.fillRect(Math.round(sx), Math.round(p.y), Math.max(1, Math.round(5 * s)), 1);
          }
        }
      }
      function rect(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
      function drawShip(ctx, o) {
        const p = proj(o.x, 0, o.z), s = p.s;
        const e = extents(o);
        const len = (o.L * e.ux + o.B * e.uz) * s, hh = Math.max(1, 3.5 * s);
        let sinkOff = 0, tiltY = 0;
        if (o.sink) { sinkOff = o.sink * 0.12 * s * (o.k === 'boss' ? 0.5 : 1); tiltY = Math.min(0.5, o.sink / 200); }
        const x0 = p.x - len / 2, base = p.y + sinkOff;
        const dirR = (o.vx || 0) >= 0;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, p.y + 0.5); ctx.clip();
        const col = o.flash && (o.flash & 2) ? '#ffffff' : o.col;
        // hull
        ctx.fillStyle = col;
        ctx.beginPath();
        const bow = len * 0.08 * e.ux;
        if (dirR) { ctx.moveTo(x0, base - hh); ctx.lineTo(x0 + len + bow, base - hh - s * 0.6); ctx.lineTo(x0 + len - bow, base); ctx.lineTo(x0 + 2, base); }
        else { ctx.moveTo(x0 - bow, base - hh - s * 0.6); ctx.lineTo(x0 + len, base - hh); ctx.lineTo(x0 + len - 2, base); ctx.lineTo(x0 + bow, base); }
        ctx.closePath(); ctx.fill();
        rect(ctx, x0, base - hh, len, Math.max(1, s * 0.6), 'rgba(255,255,255,.18)');
        const sup = o.k === 'boss' ? 0.3 : 0.25;
        // superstructure
        if (o.k === 'transport') {
          rect(ctx, x0 + len * (dirR ? 0.62 : 0.18), base - hh - 5 * s - tiltY * 10 * s, len * 0.2, 5 * s, '#c8bca8');
          rect(ctx, x0 + len * (dirR ? 0.68 : 0.26), base - hh - 9 * s, len * 0.06, 4 * s, '#2a2a2a');
          rect(ctx, x0 + len * 0.15, base - hh - 2.5 * s, len * 0.4, 2.5 * s, '#8a5a3a');
          rect(ctx, x0 + len * 0.3, base - hh - 10 * s, Math.max(1, s * 0.6), 8 * s, '#3a3a3a');
        } else if (o.k === 'destroyer' || o.k === 'patrol') {
          rect(ctx, x0 + len * 0.4, base - hh - 4 * s, len * 0.22, 4 * s, '#9aa2aa');
          rect(ctx, x0 + len * 0.47, base - hh - 9 * s, Math.max(1, s * 0.7), 6 * s, '#3a3a40');
          if (o.k === 'destroyer') { rect(ctx, x0 + len * 0.15, base - hh - 2 * s, len * 0.08, 2 * s, '#4a4e54'); rect(ctx, x0 + len * 0.77, base - hh - 2 * s, len * 0.08, 2 * s, '#4a4e54'); rect(ctx, x0 + len * 0.6, base - hh - 6 * s, len * 0.06, 3 * s, '#2a2a2a'); }
        } else if (o.k === 'boss') {
          if (o.type === 'carrier') {
            rect(ctx, x0 - len * 0.03, base - hh - 2 * s, len * 1.06, 2 * s, '#4a5048');
            rect(ctx, x0 + len * 0.65, base - hh - 10 * s, len * 0.08, 8 * s, '#8a9088');
            rect(ctx, x0 + len * 0.67, base - hh - 14 * s, Math.max(1, s), 4 * s, '#333');
            for (let i = 0; i < 6; i++) rect(ctx, x0 + len * (0.08 + i * 0.09), base - hh - 1.4 * s, len * 0.012, Math.max(1, 0.5 * s), '#e0e0d0');
          } else {
            rect(ctx, x0 + len * 0.36, base - hh - 8 * s, len * sup, 8 * s, '#7c848c');
            rect(ctx, x0 + len * 0.44, base - hh - 15 * s, len * 0.1, 7 * s, '#8c949c');
            rect(ctx, x0 + len * 0.47, base - hh - 20 * s, Math.max(1, s), 5 * s, '#333');
            rect(ctx, x0 + len * 0.6, base - hh - 11 * s, len * 0.05, 4 * s, '#2a2a2a');
            const tur = o.type === 'dreadnought' ? [0.12, 0.24, 0.72, 0.84] : [0.15, 0.27, 0.78];
            for (const t of tur) { rect(ctx, x0 + len * t, base - hh - 3 * s, len * 0.06, 3 * s, '#4a5058'); rect(ctx, x0 + len * t + (dirR ? len * 0.06 : -len * 0.05), base - hh - 2.4 * s, len * 0.05, Math.max(1, 0.6 * s), '#222'); }
          }
          // damage smoke
          const dmg = 1 - o.hp / o.max;
          for (let i = 0; i < Math.floor(dmg * 5); i++) {
            const fx = x0 + len * (0.2 + i * 0.15), fy = base - hh - 4 * s - ((frame + i * 13) % 40) * 0.4 * s;
            ctx.fillStyle = 'rgba(40,40,40,.5)'; ctx.fillRect(Math.round(fx), Math.round(fy), Math.round(4 * s), Math.round(3 * s));
            if ((frame >> 2) % 2 === i % 2) rect(ctx, fx, base - hh - 2 * s, 2 * s, 2 * s, '#ff8020');
          }
        }
        if (o.sink && o.sink < 80) { const fl = ((frame >> 2) & 1) ? '#ffd040' : '#ff5010'; rect(ctx, x0 + len * 0.3, base - hh - 4 * s, len * 0.4, 3 * s, fl); }
        ctx.restore();
        // wake / foam
        if (!o.sink) {
          ctx.fillStyle = 'rgba(230,245,255,.7)';
          const wl = Math.min(30, 10 * s);
          if (e.ux > 0.3) ctx.fillRect(Math.round(dirR ? x0 - wl : x0 + len), Math.round(p.y), Math.round(wl), 1);
          ctx.fillRect(Math.round(x0), Math.round(p.y), Math.round(len), 1);
        }
      }
      function drawSub(ctx, o) {
        const p = proj(o.x, o.alt, o.z), s = p.s;
        const len = o.L * s, h = Math.max(1, 2.5 * s);
        ctx.fillStyle = o.flash && (o.flash & 2) ? 'rgba(255,255,255,.7)' : (g && g.deep ? 'rgba(10,30,45,.75)' : 'rgba(10,30,45,.45)');
        const y = p.y + (o.sink ? o.sink * 0.1 * s : 0);
        ctx.fillRect(Math.round(p.x - len / 2), Math.round(y - h), Math.round(len), Math.round(h));
        ctx.fillRect(Math.round(p.x - len / 2 + len * 0.1), Math.round(y - h * 0.7), Math.round(len * 0.8), Math.round(h * 1.4));
        ctx.fillRect(Math.round(p.x - len * 0.08), Math.round(y - h * 2), Math.round(len * 0.14), Math.round(h));
        // bubbles to give away position
        if ((frame + o.t) % 40 < 20) { const sp = proj(o.x, 0, o.z); ctx.fillStyle = 'rgba(220,240,255,.6)'; ctx.fillRect(Math.round(sp.x + ((frame >> 3) % 3) - 1), Math.round(sp.y), 2, 1); }
      }
      function drawHeli(ctx, o) {
        const p = proj(o.x, o.alt, o.z), s = p.s;
        const fl = o.flash ? '#fff' : '#4a5a3a';
        rect(ctx, p.x - 5 * s, p.y - 2 * s, 8 * s, 4 * s, fl);
        rect(ctx, p.x + 3 * s, p.y - 1 * s, 6 * s, Math.max(1, s), fl);
        rect(ctx, p.x - 4 * s, p.y - 1.5 * s, 3 * s, 2 * s, '#90d0f0');
        const rw = ((frame >> 1) & 1) ? 18 : 12;
        rect(ctx, p.x - rw / 2 * s, p.y - 3.2 * s, rw * s, Math.max(1, 0.5 * s), '#202020');
        rect(ctx, p.x - 3 * s, p.y + 2 * s, 6 * s, Math.max(1, 0.4 * s), '#303030');
        if (o.falling) { ctx.fillStyle = 'rgba(40,40,40,.6)'; ctx.fillRect(Math.round(p.x), Math.round(p.y - 6 * s - (frame % 10)), Math.round(3 * s), Math.round(3 * s)); }
        // shadow on the water
        const sh = proj(o.x, 0, o.z); if (sh.y < VIEWH) rect(ctx, sh.x - 4 * s, sh.y, 8 * s, Math.max(1, 0.5 * s), 'rgba(0,20,40,.5)');
      }
      function drawFighter(ctx, o) {
        const p = proj(o.x, o.alt, o.z), s = p.s;
        const fl = o.flash ? '#fff' : '#6a6a5a';
        rect(ctx, p.x - 9 * s, p.y - 0.5 * s, 18 * s, Math.max(1, 1.2 * s), fl);
        rect(ctx, p.x - 1.5 * s, p.y - 2 * s, 3 * s, 4 * s, fl);
        rect(ctx, p.x - 3 * s, p.y - 4 * s, 6 * s, Math.max(1, 0.8 * s), fl);
        rect(ctx, p.x - 0.8 * s, p.y - 1.6 * s, 1.6 * s, 1.2 * s, '#80d0ff');
        if (o.fired && (frame & 2)) { rect(ctx, p.x - 7 * s, p.y, 2 * s, 2 * s, '#ffe060'); rect(ctx, p.x + 5 * s, p.y, 2 * s, 2 * s, '#ffe060'); }
      }
      function drawSmall(ctx, o) {
        if (o.k === 'dc') {
          const p = proj(o.x, o.alt, o.z), s = p.s;
          rect(ctx, p.x - 2 * s, p.y - 3 * s, 4 * s, 5 * s, o.alt > 0 ? '#2a2a2a' : 'rgba(20,20,20,.65)');
          rect(ctx, p.x - 2 * s, p.y - 3 * s, 4 * s, Math.max(1, 0.6 * s), '#808080');
          if (o.t > 100 && (frame & 4)) rect(ctx, p.x - 1, p.y - 1, 2, 2, '#ff3020');
        } else if (o.k === 'etorp') {
          const p = proj(o.x, 0, o.z), s = p.s;
          ctx.fillStyle = 'rgba(235,250,255,.85)';
          for (let i = 0; i < 6; i++) { const q = proj(o.x - o.vx * i * 8, 0, o.z - o.vz * i * 8); if (q.y < VIEWH) ctx.fillRect(Math.round(q.x - s), Math.round(q.y), Math.max(1, Math.round(2 * s)), 1); }
          rect(ctx, p.x - 1.5 * s, p.y - 0.5, 3 * s, Math.max(1, s * 0.8), (frame & 4) ? '#ff4020' : '#ffffff');
        } else if (o.k === 'crate') {
          const p = proj(o.x, 0, o.z), s = p.s, by = Math.sin(o.t / 15) * s;
          rect(ctx, p.x - 3 * s, p.y - 4 * s + by, 6 * s, 4 * s, o.kind === 'repair' ? '#e0e0e0' : '#e0a020');
          rect(ctx, p.x - 0.5 * s, p.y - 4 * s + by, Math.max(1, s), 4 * s, '#e02020');
          rect(ctx, p.x - 3 * s, p.y - 2.5 * s + by, 6 * s, Math.max(1, s), '#e02020');
          rect(ctx, p.x - 0.3 * s, p.y - 9 * s + by, Math.max(1, 0.6 * s), 5 * s, '#333');
          if (frame & 8) rect(ctx, p.x - s, p.y - 10 * s + by, 2 * s, 2 * s, '#ffff60');
        }
      }
      function drawFx(ctx, f) {
        if (f.t < 0) return;
        if (f.k === 'plume') {
          const p = proj(f.x, 0, f.z), s = p.s * f.big, t = f.t / 70;
          const hgt = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 18 * s;
          if (p.y > VIEWH + 40) return;
          ctx.fillStyle = 'rgba(235,245,255,' + (0.9 - t * 0.6).toFixed(2) + ')';
          ctx.fillRect(Math.round(p.x - 3 * s), Math.round(p.y - hgt), Math.round(6 * s), Math.round(hgt));
          ctx.fillRect(Math.round(p.x - 5 * s), Math.round(p.y - hgt * 0.6), Math.round(10 * s), Math.round(hgt * 0.6));
          if (f.fire && t < 0.4) { ctx.fillStyle = t < 0.15 ? '#ffffff' : '#ffb030'; ctx.fillRect(Math.round(p.x - 4 * s), Math.round(p.y - 6 * s), Math.round(8 * s), Math.round(6 * s)); }
        } else if (f.k === 'burst') {
          const p = proj(f.x, f.alt, f.z), s = p.s, r = Math.round((2 + f.t * 0.3) * s);
          ctx.fillStyle = f.t < 10 ? '#ffffff' : f.t < 20 ? '#ffc040' : 'rgba(60,60,60,.6)';
          ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
        } else if (f.k === 'flash') {
          const p = proj(f.x, 6, f.z);
          ctx.fillStyle = '#ffe080'; ctx.fillRect(Math.round(p.x - 8), Math.round(p.y - 2), 16, 4);
        }
      }
      function drawTorps(ctx) {
        for (const t of g.torps) {
          const alt = t.deep ? DEEP : -1;
          for (let i = 0; i < 8; i++) {
            const z = t.z - i * 6; if (z < 6) break;
            const p = proj(t.dir * z, t.deep ? alt * 0.4 : 0, z);
            if (p.y >= VIEWH + 4) continue;
            ctx.fillStyle = t.deep ? 'rgba(150,200,255,' + (0.6 - i * 0.07).toFixed(2) + ')' : 'rgba(255,255,255,' + (0.95 - i * 0.1).toFixed(2) + ')';
            const w = Math.max(1, Math.round(2.4 * p.s));
            ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y), w, Math.max(1, Math.round(p.s * 0.8)));
          }
        }
        for (const m of g.miss) {
          const p = proj(m.dx * m.z, CAMH + m.da * m.z, m.z);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 2, 2);
          ctx.fillStyle = (frame & 2) ? '#ffa020' : '#ffe060'; ctx.fillRect(Math.round(p.x - 1), Math.round(p.y + 1), 2, 2);
          const q = proj(m.dx * (m.z - 20), CAMH + m.da * (m.z - 20), Math.max(4, m.z - 20));
          ctx.fillStyle = 'rgba(220,220,220,.4)'; ctx.fillRect(Math.round(Math.min(p.x, q.x)), Math.round(Math.min(p.y, q.y)), Math.max(1, Math.round(Math.abs(q.x - p.x))), Math.max(1, Math.round(Math.abs(q.y - p.y))));
        }
      }
      function drawWorld(ctx) {
        drawSky(ctx);
        const list = g.objs.slice().sort((a, b) => b.z - a.z);
        for (const f of g.fx) if (f.z > 300) drawFx(ctx, f);
        for (const o of list) {
          if (o.k === 'sub') drawSub(ctx, o);
          else if (o.k === 'heli') drawHeli(ctx, o);
          else if (o.k === 'fighter') drawFighter(ctx, o);
          else if (o.k === 'dc' || o.k === 'etorp' || o.k === 'crate') drawSmall(ctx, o);
          else if (o.k === 'shell') continue;
          else drawShip(ctx, o);
        }
        drawTorps(ctx);
        for (const f of g.fx) if (f.z <= 300) drawFx(ctx, f);
      }
      function drawMask(ctx) {
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.rect(0, 0, W, VIEWH);
        ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2, true);
        ctx.fill('evenodd');
        // reticle
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(4, Math.round(hy), W - 8, 1);
        ctx.fillRect(CX, 6, 1, VIEWH - 12);
        for (let i = -6; i <= 6; i++) { if (!i) continue; ctx.fillRect(CX + i * 22, Math.round(hy) - (i % 2 ? 2 : 4), 1, i % 2 ? 4 : 8); }
        for (let i = 1; i <= 4; i++) ctx.fillRect(CX - 3, Math.round(hy) + i * 24, 7, 1);
        // bearing tape
        text(ctx, '000', CX, 8, '#40c8ff', { center: true });
      }
      function drawCross(ctx) {
        const x = Math.round(cross.x), y = Math.round(cross.y);
        const aa = cross.y < hy;
        const col = aa ? '#ffd040' : (g && g.deep ? '#60b0ff' : '#40ff80');
        ctx.fillStyle = col;
        ctx.fillRect(x - 10, y, 6, 1); ctx.fillRect(x + 5, y, 6, 1); ctx.fillRect(x, y - 10, 1, 6); ctx.fillRect(x, y + 5, 1, 6);
        ctx.fillRect(x - 8, y - 8, 3, 1); ctx.fillRect(x - 8, y - 8, 1, 3); ctx.fillRect(x + 6, y - 8, 3, 1); ctx.fillRect(x + 8, y - 8, 1, 3);
        ctx.fillRect(x - 8, y + 8, 3, 1); ctx.fillRect(x - 8, y + 6, 1, 3); ctx.fillRect(x + 6, y + 8, 3, 1); ctx.fillRect(x + 8, y + 6, 1, 3);
        if (frame & 8) ctx.fillRect(x, y, 1, 1);
        if (aa) text(ctx, 'AA', x + 12, y - 12, col);
        else { const z = Math.round(CAMH * F / Math.max(1, cross.y - hy) * 10); text(ctx, String(Math.min(9999, z)), x + 12, y + 6, col); }
      }
      function bar(ctx, x, y, w, h, frac, col) { ctx.fillStyle = '#0a0e12'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, Math.round((w - 2) * Math.max(0, Math.min(1, frac))), h - 2); }
      function drawPanel(ctx) {
        ctx.fillStyle = '#1c242c'; ctx.fillRect(0, VIEWH, W, H - VIEWH);
        ctx.fillStyle = '#2e3a46'; ctx.fillRect(0, VIEWH, W, 2);
        ctx.fillStyle = '#10161c'; for (let x = 4; x < W; x += 52) ctx.fillRect(x, H - 4, 2, 2);
        // hull
        text(ctx, 'HULL', 6, VIEWH + 6, '#a0b4c8');
        const hc = g.hull > 50 ? '#40e070' : g.hull > 25 ? '#f0d040' : ((frame >> 3) & 1 ? '#ff3020' : '#801000');
        bar(ctx, 34, VIEWH + 5, 82, 9, g.hull / 100, hc);
        // tubes
        text(ctx, 'TORP', 6, VIEWH + 20, '#a0b4c8');
        for (let i = 0; i < g.tubes.length; i++) {
          const x = 34 + i * 16, y = VIEWH + 19, r = g.tubes[i] / g.up.reload;
          ctx.fillStyle = '#0a0e12'; ctx.fillRect(x, y, 14, 8);
          ctx.fillStyle = r <= 0 ? '#e8e8e8' : '#405060'; ctx.fillRect(x + 1, y + 2, Math.round(12 * (1 - r)), 4);
          if (r <= 0) { ctx.fillStyle = '#ff4020'; ctx.fillRect(x + 11, y + 2, 2, 4); }
        }
        text(ctx, 'AA', 6, VIEWH + 34, '#a0b4c8');
        for (let i = 0; i < g.mtubes.length; i++) { const r = g.mtubes[i] / g.up.mreload; bar(ctx, 34 + i * 16, VIEWH + 33, 14, 8, 1 - r, r <= 0 ? '#ffd040' : '#605020'); }
        text(ctx, g.deep ? 'DEEP' : 'SHALLOW', 72, VIEWH + 34, g.deep ? '#60b0ff' : '#40ff80');
        // sonar
        const sx = 160, sy = VIEWH + 24, sr = 21;
        ctx.fillStyle = '#04200c'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0c4a1c'; ctx.fillRect(sx - sr, sy, sr * 2, 1); ctx.fillRect(sx, sy - sr, 1, sr * 2);
        const sweep = (frame / 60) % (Math.PI * 2);
        for (let i = 0; i < sr; i += 2) { ctx.fillStyle = '#20c040'; ctx.fillRect(Math.round(sx + Math.cos(sweep) * i), Math.round(sy + Math.sin(sweep) * i), 1, 1); }
        for (const o of g.objs) {
          if (o.k === 'shell' || o.falling || o.sink) continue;
          const bx = sx + o.x / 700 * sr * 1.6, by = sy + sr - 2 - o.z / 700 * sr * 2;
          if (Math.hypot(bx - sx, by - sy) > sr - 1) continue;
          ctx.fillStyle = o.k === 'boss' ? '#ff4040' : o.k === 'sub' || o.k === 'etorp' ? '#40c0ff' : o.k === 'dc' ? '#ffff40' : (o.k === 'heli' || o.k === 'fighter') ? '#ffa040' : '#80ff80';
          ctx.fillRect(Math.round(bx), Math.round(by), o.k === 'boss' ? 3 : 2, 2);
        }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, sy + sr - 3, 3, 2);
        // mission
        text(ctx, 'MISSION ' + (g.stage + 1), 196, VIEWH + 6, '#ffd040');
        if (g.phase === 'boss' || (g.boss && !g.boss.sink)) {
          text(ctx, 'TARGET', 196, VIEWH + 18, '#ff6040');
          if (g.boss) bar(ctx, 196, VIEWH + 28, 116, 8, g.boss.hp / g.boss.max, '#ff4030');
        } else {
          text(ctx, g.mi.label, 196, VIEWH + 18, '#a0b4c8');
          for (let i = 0; i < g.mi.n; i++) { ctx.fillStyle = i < g.count ? '#40e070' : '#405060'; ctx.fillRect(196 + i * 9, VIEWH + 29, 7, 6); }
        }
        for (let i = 0; i < Math.min(5, g.lives); i++) { ctx.fillStyle = '#40c8ff'; ctx.fillRect(282 + i * 7, VIEWH + 6, 5, 3); ctx.fillRect(284 + i * 7, VIEWH + 4, 1, 2); }
      }
      function drawTop(ctx) {
        text(ctx, 'SCORE', 6, 4, '#ff5040'); text(ctx, String(g ? g.score : 0), 6, 13, '#ffffff');
        text(ctx, 'HI', W - 6, 4, '#40c8ff', { right: true }); text(ctx, String(hi), W - 6, 13, '#ffffff', { right: true });
      }
      function drawTitle(ctx) {
        drawSky(ctx);
        // a demo convoy crossing
        const t = titleT;
        const demo = { k: 'transport', L: 46, B: 9, col: '#7a6a58', x: -240 + (t * 0.35) % 480, z: 320, vx: 1, vz: 0, flash: 0, sink: 0 };
        const demo2 = { k: 'destroyer', L: 36, B: 6, col: '#68727e', x: 200 - (t * 0.5) % 420, z: 200, vx: -1, vz: 0, flash: 0, sink: 0 };
        drawShip(ctx, demo); drawShip(ctx, demo2);
        drawMask(ctx);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 26, W, 52);
        text(ctx, 'BATTLE', CX, 30, '#40c8ff', { scale: 3, center: true, shadow: '#002040' });
        text(ctx, 'SHARK', CX, 54, '#ff4030', { scale: 3, center: true, shadow: '#300' });
        const page = (titleT / 400 | 0) % 2;
        if (page === 0) {
          text(ctx, 'COMMAND THE SUBMARINE SHARK', CX, 96, '#ffffff', { center: true, shadow: '#000' });
          text(ctx, 'COMPLETE EACH MISSION', CX, 108, '#ffffff', { center: true, shadow: '#000' });
          text(ctx, 'AND SINK THE FLAGSHIP', CX, 120, '#ffffff', { center: true, shadow: '#000' });
          text(ctx, 'X: SHALLOW / DEEP TORPEDO', CX, 140, '#40ff80', { center: true, shadow: '#000' });
          text(ctx, 'AIM ABOVE HORIZON: MISSILE', CX, 152, '#ffd040', { center: true, shadow: '#000' });
        } else {
          text(ctx, '- TARGETS -', CX, 96, '#40c8ff', { center: true, shadow: '#000' });
          const rows = [['TRANSPORT', 500], ['DESTROYER', 1000], ['SUBMARINE', 1500], ['HELICOPTER', 800], ['FLAGSHIP', 20000]];
          rows.forEach((r, i) => { text(ctx, r[0], 104, 110 + i * 11, '#c0d0e0', { shadow: '#000' }); text(ctx, String(r[1]), 232, 110 + i * 11, '#ffffff', { right: true, shadow: '#000' }); });
        }
        if (api.credits === 0 && coinOp) { if (coinFlash > 0 || ((frame >> 5) & 1)) text(ctx, 'INSERT COIN', CX, 170, '#ff4040', { center: true, shadow: '#000' }); }
        else if ((frame >> 5) & 1) text(ctx, 'PUSH START BUTTON', CX, 170, '#ffffff', { center: true, shadow: '#000' });
        ctx.fillStyle = '#1c242c'; ctx.fillRect(0, VIEWH, W, H - VIEWH);
        text(ctx, '\u00a9 1989 TAITO', CX, VIEWH + 12, '#ffffff', { center: true });
        text(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), CX, VIEWH + 28, '#a0b4c8', { center: true });
        drawTop(ctx);
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { drawTitle(ctx); return; }
        ctx.save();
        if (g.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * Math.min(8, g.shake)), Math.round((Math.random() - 0.5) * Math.min(6, g.shake)));
        if (g.phase === 'dead') { ctx.translate(CX, CY); ctx.rotate(g.tilt * Math.min(1, (200 - g.phaseT) / 60)); ctx.translate(-CX, -CY); }
        drawWorld(ctx);
        ctx.restore();
        if (g.phase === 'dead') {
          const t = (200 - g.phaseT) / 200;
          ctx.fillStyle = 'rgba(10,40,70,' + Math.min(0.9, t * 1.2).toFixed(2) + ')';
          const wy = Math.round(VIEWH * (1 - Math.min(1, t * 1.4)));
          ctx.fillRect(0, wy, W, VIEWH - wy);
          ctx.fillStyle = 'rgba(220,240,255,.7)';
          for (let i = 0; i < 12; i++) ctx.fillRect((i * 53 + frame * 2) % W, (VIEWH - ((frame * (2 + i % 3) + i * 40) % VIEWH)), 2, 2);
          // cracks
          ctx.fillStyle = 'rgba(255,255,255,.8)';
          let x = 90, y = 40; for (let i = 0; i < 30; i++) { ctx.fillRect(x, y, 1, 1); x += (i % 3) - 0.5; y += 1.4; }
          x = 230; y = 60; for (let i = 0; i < 26; i++) { ctx.fillRect(x, y, 1, 1); x -= (i % 4) * 0.6; y += 1.5; }
        }
        if (g.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (g.flash / 6).toFixed(2) + ')'; ctx.fillRect(0, 0, W, VIEWH); }
        if (g.redFlash > 0) { ctx.fillStyle = 'rgba(255,0,0,' + (g.redFlash / 30).toFixed(2) + ')'; ctx.fillRect(0, 0, W, VIEWH); }
        drawMask(ctx);
        if (g.phase !== 'dead' && g.phase !== 'over') drawCross(ctx);
        for (const p of g.pops) text(ctx, p.txt, p.x, Math.round(p.y), '#ffffff', { center: true, shadow: '#000' });
        // messages
        if (g.phase === 'brief') {
          ctx.fillStyle = 'rgba(0,10,20,.7)'; ctx.fillRect(40, 58, 240, 66);
          text(ctx, 'MISSION ' + (g.stage + 1), CX, 66, '#ffd040', { center: true, scale: 2 });
          text(ctx, g.mi.text, CX, 88, '#ffffff', { center: true });
          text(ctx, 'THEN SINK THE ' + (g.mi.boss === 'carrier' ? 'CARRIER' : g.mi.boss === 'battleship' ? 'BATTLESHIP' : 'DREADNOUGHT'), CX, 100, '#ff8060', { center: true });
          if (g.loop) text(ctx, 'ROUND ' + (g.loop + 1), CX, 112, '#40c8ff', { center: true });
        }
        if (g.msg && g.msgT > 0 && ((g.msgT >> 3) & 1 || g.msgT > 60)) text(ctx, g.msg, CX, 150, g.msg.indexOf('WARNING') === 0 ? '#ff4030' : '#40ff80', { center: true, shadow: '#000' });
        if (g.phase === 'boss' && !g.boss) text(ctx, 'MISSION TARGET ACHIEVED', CX, 70, '#40ff80', { center: true, shadow: '#000' });
        if (g.phase === 'clear' && g.phaseT < 270) {
          ctx.fillStyle = 'rgba(0,10,20,.7)'; ctx.fillRect(50, 52, 220, 76);
          text(ctx, 'MISSION COMPLETE', CX, 60, '#ffd040', { center: true, scale: 2 });
          if (g.phaseT <= 200) {
            text(ctx, 'HULL BONUS ' + (g.bonus || 0), CX, 86, '#ffffff', { center: true });
            if (g.upMsg) text(ctx, g.upMsg, CX, 104, '#40ff80', { center: true });
          }
        }
        if (g.phase === 'dead' && g.phaseT < 140) text(ctx, 'SHARK DAMAGED!', CX, 80, '#ff4030', { center: true, scale: 2, shadow: '#000' });
        if (g.phase === 'over') text(ctx, 'GAME OVER', CX, 80, '#ffffff', { center: true, scale: 2, shadow: '#000' });
        drawPanel(ctx);
        drawTop(ctx);
      }

      if (api.debugHook) api.debugHook({
        g: () => g, cross, hy: () => hy, F, CAMH,
        sum: () => g && { phase: g.phase, stage: g.stage, loop: g.loop, hull: g.hull, lives: g.lives, score: g.score, count: g.count, need: g.mi.n, objs: g.objs.length, boss: g.boss && g.boss.hp }
      });
      return { update, render };
    }
  });
})();
