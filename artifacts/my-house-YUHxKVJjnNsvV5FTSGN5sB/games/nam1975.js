// NAM-1975 (SNK, 1990) - from-scratch recreation for the MAME32 Game Room.
// Into-the-screen gallery shooter: steer the soldier and his gunsight together, stop to fire, roll to dodge incoming rounds.
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
  function textS(ctx, s, x, y, col, sc, align) { text(ctx, s, x + (sc || 1), y + (sc || 1), '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  function R(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const W = 320, H = 224, WW = 640, HZ = 72, PY = 214;
  const zy = z => HZ + z * 112;
  const zs = z => 0.35 + z * 0.9;

  const STAGES = [
    { name: 'MISSION 1  THE JUNGLE', sky: ['#4070c0', '#c0d8e8'], grd: ['#3a5a20', '#5a7a30'], tree: '#1a3a10', boss: 'tank', bname: 'HEAVY TANK', pool: ['soldier', 'soldier', 'soldier', 'grenadier', 'officer'], veh: ['jeep'] },
    { name: 'MISSION 2  THE VILLAGE', sky: ['#d08040', '#f0d090'], grd: ['#7a6030', '#a08848'], tree: '#3a4018', boss: 'heli', bname: 'GUNSHIP', pool: ['soldier', 'soldier', 'grenadier', 'officer', 'soldier'], veh: ['jeep', 'heli'] },
    { name: 'MISSION 3  THE RIVER', sky: ['#5080b0', '#b0d0e0'], grd: ['#305878', '#4a7898'], tree: '#183018', boss: 'boat', bname: 'RIVER GUNBOAT', pool: ['soldier', 'grenadier', 'soldier', 'officer'], veh: ['boat', 'heli'], river: 1 },
    { name: 'MISSION 4  ENEMY BASE', sky: ['#303848', '#8090a0'], grd: ['#585858', '#787070'], tree: '#202828', boss: 'fort', bname: 'FORTRESS GUN', pool: ['soldier', 'soldier', 'grenadier', 'officer', 'grenadier'], veh: ['jeep', 'tank'] },
    { name: 'MISSION 5  FINAL ASSAULT', sky: ['#200818', '#a03828'], grd: ['#40281c', '#604030'], tree: '#180808', boss: 'walker', bname: 'GIANT WALKER', pool: ['soldier', 'grenadier', 'officer', 'soldier', 'grenadier'], veh: ['jeep', 'tank', 'heli'] }
  ];

  ArcadeRegistry.register({
    id: 'nam1975', title: 'NAM-1975', year: 1990, maker: 'SNK',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move sight & soldier \u00b7 hold Space: fire (soldier stands still) \u00b7 X: grenade \u00b7 X + Left/Right: dodge roll \u00b7 Enter: start',
    marquee: { bg: '#18200c', fg: '#e0d040', accent: '#e03020' },
    create(api) {
      const A = api.audio;
      const sfx = {
        mg: () => { A.noise(0.05, { vol: 0.1, freq: 2200 }); A.tone(110, 0.03, { type: 'square', vol: 0.05 }); },
        hmg: () => { A.noise(0.06, { vol: 0.13, freq: 1500 }); A.tone(80, 0.04, { type: 'square', vol: 0.07 }); },
        rocket: () => A.noise(0.25, { vol: 0.12, freq: 3000, slideTo: 600 }),
        boom: () => { A.noise(0.5, { vol: 0.26, freq: 900, slideTo: 60 }); A.tone(70, 0.4, { type: 'sine', vol: 0.18, slideTo: 30 }); },
        small: () => A.noise(0.2, { vol: 0.18, freq: 1400, slideTo: 200 }),
        scream: () => A.tone(700, 0.25, { type: 'sawtooth', vol: 0.06, slideTo: 300 }),
        eshot: () => A.tone(1300, 0.04, { type: 'square', vol: 0.03, slideTo: 900 }),
        whizz: () => A.noise(0.08, { vol: 0.08, freq: 5000, type: 'highpass' }),
        toss: () => A.tone(500, 0.15, { type: 'triangle', vol: 0.08, slideTo: 250 }),
        roll: () => A.noise(0.18, { vol: 0.08, freq: 800 }),
        item: () => A.melody([[880, 0.05], [1175, 0.05], [1760, 0.1]], { type: 'square', vol: 0.11 }),
        die: () => A.melody([[392, 0.12], [330, 0.12], [262, 0.12], [196, 0.4]], { type: 'square', vol: 0.13 }),
        clear: () => A.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.3], [659, 0.12], [784, 0.5]], { type: 'square', vol: 0.13 }),
        alarm: () => A.melody([[880, 0.15], [660, 0.15], [880, 0.15], [660, 0.15], [880, 0.15], [660, 0.15]], { type: 'square', vol: 0.1 }),
        oneup: () => A.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.16]], { type: 'square', vol: 0.12 }),
        over: () => A.melody([[294, 0.3], [262, 0.3], [247, 0.3], [196, 0.7]], { type: 'triangle', vol: 0.15 }),
        coin: () => A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 })
      };
      let hi = api.getHiScore(100000);
      let mode = 'attract', T = 0, atT = 0, coinFlash = 0, lastCred = api.credits;
      let score = 0, lives = 3, si = 0, loop = 0, nextExtend = 100000;
      let P = null, ens = [], props = [], eshots = [], pshots = [], items = [], fx = [], boss = null;
      let camX = 160, cx = W / 2, cy = 120, kills = 0, quota = 30, spawnT = 0, phase = 'intro', phaseT = 0, shake = 0, musT = 0, musI = 0, flashT = 0;
      const ST = () => STAGES[si];
      const lvl = () => si + loop * 5;
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function addScore(n, x, y) {
        score += n; if (score > hi) hi = score;
        if (x != null) fx.push({ k: 'txt', s: String(n), x, y, t: 40 });
        if (score >= nextExtend) { nextExtend += 200000; lives++; sfx.oneup(); fx.push({ k: 'txt', s: '1UP', x: P.x + camX, y: 170, t: 80, c: '#40ff40' }); }
      }
      // ---------- setup ----------
      function newGame() { score = 0; lives = 3; si = 0; loop = 0; nextExtend = 100000; mode = 'game'; startStage(); }
      function mkPlayer() { return { x: W / 2, roll: 0, rdir: 0, dead: false, dT: 0, inv: 120, fireT: 0, wpn: 'mg', ammo: 0, gren: P ? Math.max(P.gren, 10) : 10, anim: 0 }; }
      function startStage() {
        P = mkPlayer(); ens = []; eshots = []; pshots = []; items = []; fx = []; boss = null;
        camX = (WW - W) / 2; cx = W / 2; cy = 110; kills = 0; quota = 28 + si * 6 + loop * 10; spawnT = 60;
        phase = 'intro'; phaseT = 0;
        props = [];
        const s = si * 41 + loop;
        const kinds = si === 3 ? ['bunker', 'barrel', 'crate', 'tower', 'sandbag'] : si === 2 ? ['hut', 'crate', 'barrel', 'sandbag', 'tree'] : ['hut', 'tree', 'crate', 'barrel', 'sandbag', 'tower'];
        for (let i = 0; i < 16; i++) {
          const k = kinds[Math.floor(hash(s + i * 3.7) * kinds.length)];
          let z = 0.08 + hash(s + i * 5.1) * 0.62;
          if (ST().river && z > 0.18 && z < 0.42) z = 0.5 + hash(i) * 0.2;
          const hp = { hut: 30, crate: 8, barrel: 5, sandbag: 14, tower: 24, bunker: 40, tree: 9999 }[k];
          props.push({ k, x: 30 + i * (WW - 60) / 16 + hash(s + i * 9.3) * 30, z, hp, max: hp, dead: false, flash: 0 });
        }
        props.sort((a, b) => a.z - b.z);
      }
      function killPlayer() {
        if (P.dead || P.inv > 0 || P.roll > 0) return;
        P.dead = true; P.dT = 0; sfx.die(); shake = 12;
        fx.push({ k: 'boom', x: P.x + camX, y: PY - 10, r: 22, t: 24 });
      }
      // ---------- enemies ----------
      function spawnEnemy(k) {
        const L = lvl();
        const side = Math.random() < 0.5 ? -1 : 1;
        const vis0 = camX, vis1 = camX + W;
        let z = 0.1 + Math.random() * 0.62;
        if (ST().river && z > 0.18 && z < 0.42 && k !== 'boat') z = 0.45 + Math.random() * 0.25;
        const e = { k, x: side < 0 ? vis0 - 20 : vis1 + 20, z, vx: 0, hp: 1, st: 'run', t: 0, stT: 0, face: -side, flash: 0, tx: vis0 + 30 + Math.random() * (W - 60), fireN: 0 };
        if (k === 'officer') e.hp = 3;
        if (k === 'soldier' || k === 'grenadier' || k === 'officer') {
          if (Math.random() < 0.35) {
            // pop out from behind a prop
            const cover = props.filter(p => !p.dead && p.x > vis0 + 10 && p.x < vis1 - 10 && p.k !== 'barrel');
            if (cover.length) { const c = cover[Math.floor(Math.random() * cover.length)]; e.x = c.x; e.z = Math.max(0.05, c.z - 0.02); e.st = 'aim'; e.stT = 40; e.pop = 12; }
          }
          e.spd = 0.9 + Math.random() * 0.6 + L * 0.05;
        }
        if (k === 'jeep') { e.hp = 10 + L; e.z = 0.25 + Math.random() * 0.4; e.spd = 1.6 + L * 0.08; e.vx = -side * e.spd; e.st = 'drive'; }
        if (k === 'tank') { e.hp = 26 + L * 2; e.z = 0.15 + Math.random() * 0.3; e.spd = 0.5; e.vx = -side * e.spd; e.st = 'drive'; }
        if (k === 'heli') { e.hp = 18 + L * 2; e.z = 0.3; e.y = 40 + Math.random() * 30; e.spd = 1.3; e.vx = -side * e.spd; e.st = 'drive'; }
        if (k === 'boat') { e.hp = 14 + L; e.z = 0.28; e.spd = 1.1; e.vx = -side * e.spd; e.st = 'drive'; }
        e.max = e.hp;
        ens.push(e); return e;
      }
      function eFire(sx, sy, kind, spread) {
        const tx = camX + P.x + (spread || 0);
        const dur = kind === 'g' ? 60 : kind === 's' ? 56 : kind === 'm' ? 50 : Math.max(26, 46 - lvl() * 2);
        eshots.push({ kind, sx, sy, tx, t: 0, dur, r: kind === 'b' ? 10 : 22 });
        if (kind === 'b') sfx.eshot(); else sfx.toss();
      }
      function entRect(e) {
        const sx = e.x - camX, sy = e.k === 'heli' ? e.y : zy(e.z), s = zs(e.z);
        if (e.k === 'jeep') return [sx - 22 * s, sy - 22 * s, sx + 22 * s, sy];
        if (e.k === 'tank') return [sx - 30 * s, sy - 30 * s, sx + 30 * s, sy];
        if (e.k === 'boat') return [sx - 28 * s, sy - 20 * s, sx + 28 * s, sy];
        if (e.k === 'heli') return [sx - 26, sy - 12, sx + 26, sy + 12];
        const crouch = e.st === 'aim' || e.st === 'fire' ? 0.7 : 1;
        return [sx - 6 * s, sy - 30 * s * crouch, sx + 6 * s, sy];
      }
      function eKill(e) {
        e.st = 'die'; e.stT = 0; e.hp = 0;
        const r = entRect(e), mx = (r[0] + r[2]) / 2 + camX, my = (r[1] + r[3]) / 2;
        const veh = e.k === 'jeep' || e.k === 'tank' || e.k === 'heli' || e.k === 'boat';
        const pts = { soldier: 100, grenadier: 200, officer: 500, jeep: 1000, tank: 3000, heli: 2000, boat: 1500 }[e.k];
        addScore(pts, mx, my - 10);
        kills += veh ? 3 : 1;
        if (veh) { sfx.boom(); shake = 8; for (let i = 0; i < 4; i++) fx.push({ k: 'boom', x: mx + (Math.random() - 0.5) * 30, y: my + (Math.random() - 0.5) * 16, r: 16 + Math.random() * 10, t: 20 + i * 4 }); }
        else { sfx.scream(); }
        if (e.k === 'officer' || (veh && Math.random() < 0.6) || Math.random() < 0.04) dropItem(mx, my);
      }
      function dropItem(x, y) {
        const r = Math.random();
        const k = r < 0.3 ? 'H' : r < 0.55 ? 'R' : r < 0.85 ? 'G' : 'P';
        items.push({ k, x, y: Math.min(y, 170), vy: -1.5, t: 420 });
      }
      function updEnemy(e) {
        e.t++; if (e.flash > 0) e.flash--;
        const L = lvl();
        if (e.st === 'die') { e.stT++; if (e.stT > 40) e.gone = true; return; }
        if (e.pop > 0) e.pop--;
        const sx = e.x - camX;
        if (e.k === 'soldier' || e.k === 'grenadier' || e.k === 'officer') {
          if (e.st === 'run') {
            const d = e.tx - e.x;
            e.face = Math.sign(d) || 1;
            e.x += e.face * Math.min(Math.abs(d), e.spd);
            if (Math.abs(d) < 2) { e.st = 'aim'; e.stT = Math.max(18, 50 - L * 3) + Math.random() * 30; }
          } else if (e.st === 'aim') {
            if (--e.stT <= 0) {
              e.st = 'fire'; e.stT = 16;
              const s = zs(e.z), gx = e.x + e.face * 6 * s, gy = zy(e.z) - 20 * s;
              if (e.k === 'grenadier') eFire(gx, gy, 'g', (Math.random() - 0.5) * 20);
              else { eFire(gx, gy, 'b', 0); if (L >= 3 && Math.random() < 0.3) eFire(gx, gy, 'b', P.x < W / 2 ? 24 : -24); }
              e.fireN++;
            }
          } else if (e.st === 'fire') {
            if (--e.stT <= 0) {
              if (e.fireN >= 2 + Math.floor(Math.random() * 3)) { e.st = 'leave'; e.face = e.x - camX < W / 2 ? -1 : 1; }
              else { e.st = Math.random() < 0.5 ? 'aim' : 'run'; e.stT = 40 + Math.random() * 40; e.tx = clamp(e.x + (Math.random() - 0.5) * 120, camX + 20, camX + W - 20); }
            }
          } else if (e.st === 'leave') {
            e.x += e.face * e.spd * 1.3;
            if (sx < -30 || sx > W + 30) e.gone = true;
          }
        } else {
          e.x += e.vx;
          if (e.k === 'heli') e.y += Math.sin(e.t * 0.05) * 0.4;
          e.face = Math.sign(e.vx);
          if (e.t % Math.max(40, (e.k === 'tank' ? 120 : 70) - L * 4) === 30 && sx > 10 && sx < W - 10) {
            const r = entRect(e), mx = (r[0] + r[2]) / 2 + camX, my = (r[1] + r[3]) / 2;
            if (e.k === 'tank') eFire(mx, my - 6, 's', 0);
            else if (e.k === 'heli') { eFire(mx - 8, my + 6, 'm', -12); eFire(mx + 8, my + 6, 'm', 12); }
            else { eFire(mx, my, 'b', 0); eFire(mx, my, 'b', 16); }
          }
          if ((e.vx > 0 && sx > W + 60) || (e.vx < 0 && sx < -60)) e.gone = true;
        }
      }
      // ---------- boss ----------
      function mkBoss() {
        const k = ST().boss, hb = 100 + si * 25 + loop * 60;
        boss = { k, x: camX + W / 2, y: 60, z: 0.35, hp: hb, max: hb, t: 0, st: 'enter', stT: 0, flash: 0, vx: 1, parts: null };
        if (k === 'tank') { boss.x = camX + W + 80; boss.z = 0.45; }
        if (k === 'heli') { boss.x = camX - 80; boss.y = 50; }
        if (k === 'boat') { boss.x = camX + W + 90; boss.z = 0.28; }
        if (k === 'fort') { boss.x = WW / 2; boss.z = 0.08; boss.parts = [{ dx: -70, hp: Math.round(hb * 0.4) }, { dx: 0, hp: Math.round(hb * 0.5) }, { dx: 70, hp: Math.round(hb * 0.4) }]; boss.hp = boss.max = boss.parts.reduce((a, p) => a + p.hp, 0); boss.st = 'fight'; }
        if (k === 'walker') { boss.x = camX + W + 100; boss.z = 0.32; }
        sfx.alarm();
      }
      function bossRects(b) {
        const sx = b.x - camX;
        if (b.k === 'tank') { const s = zs(b.z), y = zy(b.z); return [[sx - 52 * s, y - 44 * s, sx + 52 * s, y]]; }
        if (b.k === 'heli') return [[sx - 48, b.y - 18, sx + 48, b.y + 18]];
        if (b.k === 'boat') { const s = zs(b.z), y = zy(b.z); return [[sx - 60 * s, y - 40 * s, sx + 60 * s, y]]; }
        if (b.k === 'fort') { const y = zy(b.z); return b.parts.map(p => p.hp > 0 ? [sx + p.dx - 16, y - 70, sx + p.dx + 16, y - 40] : null).filter(Boolean); }
        const s = zs(b.z), y = zy(b.z);
        return [[sx - 34 * s, y - 120 * s, sx + 34 * s, y - 64 * s]];
      }
      function hitBoss(dmg, px, py, splash) {
        const b = boss; if (!b || b.dying || b.st === 'enter') return false;
        const rs = bossRects(b);
        for (let i = 0; i < rs.length; i++) {
          const r = rs[i];
          if (px + splash > r[0] && px - splash < r[2] && py + splash > r[1] && py - splash < r[3]) {
            b.flash = 4;
            if (b.k === 'fort') { const alive = b.parts.filter(p => p.hp > 0); const p = alive[i]; p.hp -= dmg; if (p.hp <= 0) { sfx.boom(); shake = 10; for (let k = 0; k < 5; k++) fx.push({ k: 'boom', x: b.x + p.dx + (Math.random() - 0.5) * 30, y: zy(b.z) - 56 + (Math.random() - 0.5) * 20, r: 18, t: 20 + k * 5 }); addScore(5000); } b.hp = b.parts.reduce((a, q) => a + Math.max(0, q.hp), 0); }
            else b.hp -= dmg;
            addScore(10);
            if (b.hp <= 0) { b.hp = 0; b.dying = 1; addScore(30000 + si * 10000); eshots = []; ens.forEach(e => { if (e.st !== 'die') eKill(e); }); }
            return true;
          }
        }
        return false;
      }
      function updBoss() {
        const b = boss; b.t++; if (b.flash > 0) b.flash--;
        const L = lvl(), anger = 1 + (1 - b.hp / b.max) * 0.6 + loop * 0.2;
        const sx = b.x - camX;
        if (b.dying) {
          b.dying++;
          if (b.dying % 6 === 0) { const r = bossRects(b)[0] || [sx - 30, 60, sx + 30, 120]; fx.push({ k: 'boom', x: camX + r[0] + Math.random() * (r[2] - r[0]), y: r[1] + Math.random() * (r[3] - r[1]), r: 14 + Math.random() * 14, t: 22 }); sfx.boom(); shake = 6; }
          if (b.k === 'heli') b.y += 0.6;
          if (b.dying > 160) { boss = null; phase = 'clear'; phaseT = 0; sfx.clear(); }
          return;
        }
        if (b.st === 'enter') {
          const target = camX + W / 2;
          b.x += Math.sign(target - b.x) * 1.5;
          if (Math.abs(target - b.x) < 2) { b.st = 'fight'; b.stT = 0; }
          return;
        }
        b.stT++;
        const fire = (n, kind, spread) => { const r = bossRects(b)[0]; const mx = (r[0] + r[2]) / 2 + camX, my = (r[1] + r[3]) / 2; for (let i = 0; i < n; i++) eFire(mx + (i - (n - 1) / 2) * 14, my, kind, (i - (n - 1) / 2) * (spread || 20)); };
        const rate = v => Math.max(20, Math.round(v / anger));
        if (b.k === 'tank') {
          b.x += b.vx * 0.5 * anger; if (sx < 70 || sx > W - 70) { b.vx = -b.vx; b.x = camX + clamp(sx, 70, W - 70); }
          if (b.stT % rate(90) === 0) fire(1, 's', 0);
          if (b.stT % rate(140) === 70) { fire(3, 'b', 18); }
        } else if (b.k === 'heli') {
          b.x += b.vx * 1.2 * anger; b.y = 56 + Math.sin(b.t * 0.03) * 20;
          if (sx < 60 || sx > W - 60) { b.vx = -b.vx; b.x = camX + clamp(sx, 60, W - 60); }
          if (b.stT % rate(80) === 0) fire(2, 'm', 26);
          if (b.stT % rate(50) === 25) fire(1, 'b', 0);
          if (b.stT % 400 === 200 && ens.length < 4) { for (let i = 0; i < 2; i++) { const e = spawnEnemy('soldier'); e.x = b.x + (i ? 20 : -20); e.z = 0.4; e.st = 'aim'; e.stT = 40; } }
        } else if (b.k === 'boat') {
          b.x += b.vx * 0.7 * anger; if (sx < 80 || sx > W - 80) { b.vx = -b.vx; b.x = camX + clamp(sx, 80, W - 80); }
          if (b.stT % rate(100) === 0) fire(1, 's', 0);
          if (b.stT % rate(70) === 35) fire(2, 'b', 30);
          if (b.stT % 360 === 180 && ens.length < 4) spawnEnemy('grenadier');
        } else if (b.k === 'fort') {
          const y = zy(b.z);
          b.parts.forEach((p, i) => { if (p.hp > 0 && (b.stT + i * 37) % rate(110) === 0) eFire(b.x + p.dx, y - 56, i === 1 ? 's' : 'b', 0); });
          if (b.stT % 300 === 150 && ens.length < 5) spawnEnemy('soldier');
        } else {
          b.x += b.vx * 0.6 * anger; if (sx < 90 || sx > W - 90) { b.vx = -b.vx; b.x = camX + clamp(sx, 90, W - 90); }
          if (b.stT % rate(120) === 0) fire(5, 'm', 22);
          if (b.stT % rate(90) === 45) fire(1, 's', 0);
          if (b.stT % rate(60) === 15) fire(2, 'b', 10);
          if (b.stT % 160 === 80) shake = 6;
        }
      }
      // ---------- player ----------
      function fireShot() {
        const w = P.wpn;
        const wx = cx + camX, wy = cy;
        if (w === 'R') {
          pshots.push({ sx: P.x + camX, sy: PY - 30, tx: wx, ty: wy, t: 0, dur: 12, k: 'rocket' });
          sfx.rocket(); P.fireT = 16;
        } else {
          const spread = w === 'H' ? 5 : 3;
          const ix = cx + (Math.random() - 0.5) * spread * 2, iy = cy + (Math.random() - 0.5) * spread * 2;
          impact(ix, iy, w === 'H' ? 2 : 1, w === 'H' ? 4 : 1);
          fx.push({ k: 'tracer', x0: P.x + camX + 4, y0: PY - 32, x1: ix + camX, y1: iy, t: 3 });
          w === 'H' ? sfx.hmg() : sfx.mg();
          P.fireT = w === 'H' ? 4 : 6;
        }
        if (w !== 'mg') { P.ammo--; if (P.ammo <= 0) { P.wpn = 'mg'; } }
      }
      function impact(ix, iy, dmg, splash) {
        // ix,iy screen coords. Items first, then nearest enemy (highest z).
        fx.push({ k: 'spark', x: ix + camX, y: iy, t: 6 });
        for (const it of items) if (!it.got && Math.abs(it.x - camX - ix) < 10 + splash && Math.abs(it.y - iy) < 10 + splash) { collect(it); return; }
        const order = ens.filter(e => e.st !== 'die').sort((a, b) => b.z - a.z);
        let hitAny = false;
        for (const e of order) {
          const r = entRect(e);
          if (ix + splash > r[0] && ix - splash < r[2] && iy + splash > r[1] && iy - splash < r[3]) {
            e.hp -= dmg; e.flash = 4; hitAny = true;
            if (e.hp <= 0) eKill(e);
            if (splash < 8) return;
          }
        }
        if (hitAny && splash < 8) return;
        if (hitBoss(dmg, ix, iy, splash) && splash < 8) return;
        for (let i = props.length - 1; i >= 0; i--) {
          const p = props[i]; if (p.dead || p.k === 'tree') continue;
          const r = propRect(p);
          if (ix + splash > r[0] && ix - splash < r[2] && iy + splash > r[1] && iy - splash < r[3]) {
            p.hp -= dmg; p.flash = 3;
            if (p.hp <= 0) {
              p.dead = true; const mx = (r[0] + r[2]) / 2 + camX, my = (r[1] + r[3]) / 2;
              addScore(p.k === 'barrel' ? 300 : 200, mx, my - 10);
              if (p.k === 'barrel') { sfx.boom(); fx.push({ k: 'boom', x: mx, y: my, r: 28, t: 24 }); blast(mx - camX, my, 30, 10); }
              else { sfx.small(); fx.push({ k: 'boom', x: mx, y: my, r: 16, t: 18 }); }
              if (Math.random() < (p.k === 'crate' ? 0.7 : 0.3)) dropItem(mx, my);
            }
            if (splash < 8) return;
          }
        }
      }
      function blast(sx, sy, rad, dmg) {
        for (const e of ens) {
          if (e.st === 'die') continue;
          const r = entRect(e), mx = (r[0] + r[2]) / 2, my = (r[1] + r[3]) / 2;
          if (Math.abs(mx - sx) < rad + (r[2] - r[0]) / 2 && Math.abs(my - sy) < rad + (r[3] - r[1]) / 2) { e.hp -= dmg; e.flash = 4; if (e.hp <= 0) eKill(e); }
        }
      }
      function collect(it) {
        it.got = true; sfx.item();
        if (it.k === 'H') { P.wpn = 'H'; P.ammo = 260; }
        else if (it.k === 'R') { P.wpn = 'R'; P.ammo = 30; }
        else if (it.k === 'G') P.gren = Math.min(30, P.gren + 5);
        else addScore(2000, it.x, it.y - 10);
        fx.push({ k: 'txt', s: { H: 'HEAVY M.G.', R: 'ROCKETS', G: 'GRENADES', P: 'BONUS' }[it.k], x: it.x, y: it.y - 16, t: 50, c: '#ffe040' });
      }
      function propRect(p) {
        const sx = p.x - camX, y = zy(p.z), s = zs(p.z);
        const d = { hut: [34, 30], crate: [12, 12], barrel: [7, 14], sandbag: [26, 10], tower: [16, 54], bunker: [36, 22], tree: [10, 70] }[p.k];
        return [sx - d[0] * s, y - d[1] * s, sx + d[0] * s, y];
      }
      function updPlayer() {
        P.anim++;
        if (P.dead) {
          P.dT++;
          if (P.dT === 100) {
            lives--;
            if (lives > 0) { const g = P.gren; P = mkPlayer(); P.gren = Math.max(g, 5); eshots = []; }
            else {
              api.setHiScore(score);
              const over = () => { mode = 'over'; T = 0; sfx.over(); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; P = mkPlayer(); eshots = []; }, over); else over();
            }
          }
          return;
        }
        if (P.inv > 0) P.inv--;
        const L = api.key('ArrowLeft'), Rr = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown'), fire = api.key('Space');
        if (P.roll > 0) {
          P.roll--; P.x = clamp(P.x + P.rdir * 3.6, 10, W - 10); cx = clamp(cx + P.rdir * 3.6, 6, W - 6);
        } else {
          const cs = 3;
          if (L) cx -= cs; if (Rr) cx += cs; if (U) cy -= cs * 0.8; if (D) cy += cs * 0.8;
          cx = clamp(cx, 4, W - 4); cy = clamp(cy, 26, 196);
          if (!fire) { const d = cx - P.x; P.x += clamp(d, -2.4, 2.4); P.walk = Math.abs(d) > 1; } else P.walk = false;
          if (api.pressed('KeyX')) {
            if (L || Rr) { P.roll = 24; P.rdir = L ? -1 : 1; sfx.roll(); }
            else if (P.gren > 0) {
              P.gren--; sfx.toss();
              pshots.push({ sx: P.x + camX, sy: PY - 30, tx: cx + camX, ty: cy, t: 0, dur: 40, k: 'gren' });
            }
          }
          if (P.fireT > 0) P.fireT--;
          if (fire && P.fireT <= 0) fireShot();
        }
        P.firing = fire && P.roll <= 0;
        // camera scroll with sight
        if (cx < 30 && camX > 0) { const d = Math.min(2.5, camX); camX -= d; P.x = Math.min(W - 10, P.x + d * 0.5); }
        if (cx > W - 30 && camX < WW - W) { const d = Math.min(2.5, WW - W - camX); camX += d; P.x = Math.max(10, P.x - d * 0.5); }
      }
      function updShots() {
        for (const s of pshots) {
          s.t++;
          if (s.t >= s.dur) {
            s.dead = true;
            const ix = s.tx - camX, iy = s.ty;
            if (s.k === 'gren') { sfx.boom(); shake = 8; fx.push({ k: 'boom', x: s.tx, y: s.ty, r: 34, t: 26 }); impact(ix, iy, 25, 34); blast(ix, iy, 34, 0); }
            else { sfx.small(); fx.push({ k: 'boom', x: s.tx, y: s.ty, r: 18, t: 18 }); impact(ix, iy, 6, 14); }
          }
        }
        pshots = pshots.filter(s => !s.dead);
        for (const s of eshots) {
          s.t++;
          if (s.t === s.dur - 8 && s.kind === 'b') sfx.whizz();
          if (s.t >= s.dur) {
            s.dead = true;
            const px = P.x + camX;
            if (s.kind !== 'b') { fx.push({ k: 'boom', x: s.tx, y: PY - 8, r: s.r, t: 20 }); sfx.small(); }
            else fx.push({ k: 'dust', x: s.tx, y: PY - 2, t: 12 });
            if (!P.dead && Math.abs(px - s.tx) < s.r) killPlayer();
          }
        }
        eshots = eshots.filter(s => !s.dead);
        for (const it of items) { it.t--; it.vy += 0.05; it.y += it.vy; if (it.y > 180) { it.y = 180; it.vy = -it.vy * 0.4; } }
        items = items.filter(it => !it.got && it.t > 0);
      }
      function music() {
        if (--musT > 0) return;
        musT = 9;
        const mel = boss ? [220, 0, 220, 262, 0, 247, 220, 0, 196, 0, 220, 0, 165, 0, 196, 0] : [330, 0, 330, 392, 0, 330, 294, 0, 262, 0, 294, 330, 0, 220, 0, 0];
        const m = mel[musI % 16];
        if (m && (musI >> 4) % 2 === 1) A.tone(m, 0.1, { type: 'square', vol: 0.03 });
        if (musI % 2 === 0) A.tone([110, 110, 98, 82][(musI >> 3) % 4], 0.12, { type: 'triangle', vol: 0.09 });
        if (musI % 4 === 2) A.noise(0.04, { vol: 0.06, freq: 4000, type: 'highpass' });
        if (musI % 8 === 0) A.noise(0.08, { vol: 0.08, freq: 300 });
        musI++;
      }
      // ---------- main update ----------
      function updGame() {
        T++;
        for (const f of fx) { f.t--; if (f.k === 'txt') f.y -= 0.5; }
        fx = fx.filter(f => f.t > 0);
        if (shake > 0) shake--;
        if (phase === 'intro') { phaseT++; updPlayer(); if (phaseT > 120) phase = 'play'; return; }
        if (phase === 'clear') {
          phaseT++;
          if (phaseT === 60) addScore(P.gren * 500);
          if (phaseT > 260) { si++; if (si >= STAGES.length) { phase = 'ending'; phaseT = 0; return; } const g = P.gren; startStage(); P.gren = g; }
          return;
        }
        if (phase === 'ending') { phaseT++; if (phaseT > 700 || (phaseT > 240 && api.anyPressed('Enter'))) { loop++; si = 0; startStage(); } return; }
        music();
        updPlayer();
        if (!boss && kills >= quota) mkBoss();
        if (--spawnT <= 0) {
          const L = lvl(), live = ens.filter(e => e.st !== 'die').length;
          const cap = boss ? 2 + Math.min(2, L >> 1) : Math.min(8, 3 + L);
          if (live < cap) {
            const vehs = ST().veh, pool = ST().pool;
            const k = !boss && Math.random() < 0.12 + L * 0.01 ? vehs[Math.floor(Math.random() * vehs.length)] : pool[Math.floor(Math.random() * pool.length)];
            spawnEnemy(k);
            if (!boss && k === 'soldier' && Math.random() < 0.3 + L * 0.05) spawnEnemy('soldier');
          }
          spawnT = Math.max(16, 60 - L * 5) + Math.random() * 40;
        }
        for (const e of ens) updEnemy(e);
        ens = ens.filter(e => !e.gone);
        if (boss) updBoss();
        updShots();
        for (const p of props) if (p.flash > 0) p.flash--;
      }
      function update() {
        if (api.credits > lastCred) sfx.coin();
        lastCred = api.credits;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'attract') {
          T++; atT++;
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { lastCred = api.credits; newGame(); }
            else { coinFlash = 90; A.tone(110, 0.25, { type: 'square', vol: 0.12 }); }
          }
          return;
        }
        if (mode === 'over') { T++; if (T > 300 || (T > 90 && api.anyPressed('Enter'))) { mode = 'attract'; atT = 0; } return; }
        updGame();
      }
      // ---------- drawing ----------
      function drawBg(ctx) {
        const st = ST();
        let g = ctx.createLinearGradient(0, 0, 0, HZ);
        g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, HZ + 2);
        // mountains
        ctx.fillStyle = 'rgba(40,50,60,0.45)';
        ctx.beginPath(); ctx.moveTo(0, HZ);
        for (let x = 0; x <= W; x += 16) ctx.lineTo(x, HZ - 14 - Math.abs(Math.sin((x + camX * 0.2) * 0.02)) * 18 - hash(Math.floor((x + camX * 0.2) / 16)) * 6);
        ctx.lineTo(W, HZ); ctx.fill();
        // tree line at horizon
        ctx.fillStyle = st.tree;
        for (let i = Math.floor(camX * 0.6 / 12) - 1; i < Math.floor(camX * 0.6 / 12) + 30; i++) {
          const x = i * 12 - camX * 0.6, h = 6 + hash(i + si * 7) * 12;
          ctx.beginPath(); ctx.arc(x, HZ - h * 0.4, h * 0.6, 0, 7); ctx.fill();
        }
        g = ctx.createLinearGradient(0, HZ, 0, H);
        g.addColorStop(0, st.grd[0]); g.addColorStop(1, st.grd[1]);
        ctx.fillStyle = g; ctx.fillRect(0, HZ, W, H - HZ);
        if (st.river) {
          const y0 = zy(0.18), y1 = zy(0.42);
          R(ctx, '#3070a0', 0, y0, W, y1 - y0);
          for (let i = 0; i < 24; i++) { const z = 0.2 + hash(i) * 0.2; R(ctx, '#80b0d0', ((hash(i + 3) * WW - camX + T * 0.3 * (1 + z)) % W + W) % W, zy(z), 8 * zs(z), 1); }
          R(ctx, '#6a5030', 0, y1, W, 3);
        }
        // ground texture rows (perspective)
        for (let i = 0; i < 18; i++) {
          const z = i / 18, y = zy(z), s = zs(z);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          const step = 40 * s;
          for (let x = -((camX * (0.5 + z * 0.5)) % step); x < W; x += step) ctx.fillRect(Math.round(x + hash(i) * 10), Math.round(y), Math.round(6 * s), 1);
        }
      }
      function drawProp(ctx, p) {
        const r = propRect(p); if (r[2] < -10 || r[0] > W + 10) return;
        const s = zs(p.z), x = (r[0] + r[2]) / 2, y = r[3], fl = p.flash > 0;
        if (p.dead) {
          if (p.k === 'tree') return;
          R(ctx, '#2a2018', r[0], y - 4 * s, r[2] - r[0], 4 * s);
          R(ctx, '#3a3028', x - 6 * s, y - 7 * s, 10 * s, 4 * s);
          return;
        }
        if (p.k === 'hut') {
          R(ctx, fl ? '#fff' : '#8a6a3a', x - 30 * s, y - 18 * s, 60 * s, 18 * s);
          R(ctx, '#3a2a10', x - 6 * s, y - 14 * s, 12 * s, 14 * s);
          ctx.fillStyle = fl ? '#fff' : '#c0a050'; ctx.beginPath(); ctx.moveTo(x - 38 * s, y - 16 * s); ctx.lineTo(x, y - 32 * s); ctx.lineTo(x + 38 * s, y - 16 * s); ctx.fill();
          for (let i = -3; i <= 3; i++) R(ctx, '#907030', x + i * 10 * s, y - 28 * s + Math.abs(i) * 3.6 * s, 1, 10 * s);
        } else if (p.k === 'crate') {
          R(ctx, fl ? '#fff' : '#a07838', r[0], r[1], r[2] - r[0], r[3] - r[1]);
          R(ctx, '#604818', r[0], r[1], r[2] - r[0], 2 * s); R(ctx, '#604818', x - 1 * s, r[1], 2 * s, r[3] - r[1]);
          text(ctx, s > 0.8 ? 'X' : '', x - 2, r[1] + 3 * s, '#604818');
        } else if (p.k === 'barrel') {
          R(ctx, fl ? '#fff' : '#c03020', r[0], r[1], r[2] - r[0], r[3] - r[1]);
          R(ctx, '#701810', r[0], r[1] + 4 * s, r[2] - r[0], 1.5 * s); R(ctx, '#701810', r[0], r[1] + 10 * s, r[2] - r[0], 1.5 * s);
          R(ctx, '#ffe040', x - 2 * s, r[1] + 6 * s, 4 * s, 3 * s);
        } else if (p.k === 'sandbag') {
          for (let row = 0; row < 3; row++) for (let i = 0; i < 5 - row; i++) {
            const bx = r[0] + (i * 10 + row * 5) * s, by = y - (row + 1) * 3.4 * s;
            R(ctx, fl ? '#fff' : '#b0a070', bx, by, 9.4 * s, 3.2 * s); R(ctx, '#706040', bx, by + 2.6 * s, 9.4 * s, 0.8 * s);
          }
        } else if (p.k === 'tower') {
          R(ctx, '#5a4020', x - 14 * s, y - 40 * s, 3 * s, 40 * s); R(ctx, '#5a4020', x + 11 * s, y - 40 * s, 3 * s, 40 * s);
          for (let i = 0; i < 3; i++) R(ctx, '#5a4020', x - 14 * s, y - (12 + i * 12) * s, 28 * s, 1.5 * s);
          R(ctx, fl ? '#fff' : '#8a6a3a', x - 16 * s, y - 54 * s, 32 * s, 14 * s); R(ctx, '#3a2a10', x - 12 * s, y - 50 * s, 24 * s, 5 * s);
        } else if (p.k === 'bunker') {
          R(ctx, fl ? '#fff' : '#707878', x - 36 * s, y - 22 * s, 72 * s, 22 * s); R(ctx, '#505858', x - 36 * s, y - 22 * s, 72 * s, 3 * s);
          R(ctx, '#101010', x - 18 * s, y - 15 * s, 36 * s, 5 * s);
        } else if (p.k === 'tree') {
          R(ctx, '#3a2a10', x - 3 * s, y - 50 * s, 6 * s, 50 * s);
          ctx.fillStyle = ST().tree;
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(i * 1.05) * 16 * s, y - 52 * s + Math.sin(i * 1.05) * 5 * s, 16 * s, 4 * s, Math.cos(i * 1.05) * 0.6, 0, 7); ctx.fill(); }
        }
      }
      function drawSoldier(ctx, e) {
        const s = zs(e.z), x = e.x - camX, y = zy(e.z), fl = e.flash > 0;
        const st = e.st, f = e.face;
        const uni = e.k === 'officer' ? '#304060' : e.k === 'grenadier' ? '#506030' : '#4a5a2a';
        const c = fl ? '#fff' : uni, skin = fl ? '#fff' : '#e0b080';
        if (st === 'die') {
          const k = Math.min(1, e.stT / 14);
          ctx.save(); ctx.translate(x, y); ctx.rotate(-f * k * 1.4);
          R(ctx, c, -4 * s, -26 * s, 8 * s, 14 * s); R(ctx, skin, -3 * s, -32 * s, 6 * s, 6 * s); R(ctx, c, -4 * s, -12 * s, 8 * s, 12 * s);
          ctx.restore();
          if (e.stT < 10) R(ctx, '#c02010', x - 2 * s, y - 24 * s, 4 * s, 4 * s);
          return;
        }
        const crouch = st === 'aim' || st === 'fire';
        const run = (st === 'run' || st === 'leave') ? (e.t >> 3) & 1 : 0;
        const by = crouch ? 8 * s : 0;
        if (e.pop > 0) ctx.globalAlpha = 1 - e.pop / 12;
        // legs
        if (crouch) { R(ctx, c, x - 5 * s, y - 8 * s, 10 * s, 8 * s); }
        else { R(ctx, c, x - 4 * s, y - 12 * s, 3 * s, 12 * s - run * 2 * s); R(ctx, c, x + 1 * s, y - 12 * s, 3 * s, 12 * s - (1 - run) * 2 * s); }
        // torso
        R(ctx, c, x - 5 * s, y - 24 * s + by, 10 * s, 12 * s);
        R(ctx, '#2a2a18', x - 5 * s, y - 14 * s + by, 10 * s, 1.5 * s);
        // head + hat
        R(ctx, skin, x - 3 * s, y - 30 * s + by, 6 * s, 6 * s);
        if (e.k === 'officer') { R(ctx, fl ? '#fff' : '#203048', x - 4 * s, y - 33 * s + by, 8 * s, 3 * s); R(ctx, '#e0c040', x - 1 * s, y - 32 * s + by, 2 * s, 1.5 * s); }
        else { ctx.fillStyle = fl ? '#fff' : '#c8b878'; ctx.beginPath(); ctx.moveTo(x - 7 * s, y - 29 * s + by); ctx.lineTo(x, y - 35 * s + by); ctx.lineTo(x + 7 * s, y - 29 * s + by); ctx.fill(); }
        // weapon
        if (e.k === 'grenadier' && st === 'fire') R(ctx, '#304020', x + f * 6 * s - 1.5 * s, y - 36 * s + by, 3 * s, 3 * s);
        else R(ctx, '#202020', x + (f > 0 ? 2 : -14) * s, y - 20 * s + by, 12 * s, 2 * s);
        if (st === 'fire' && e.stT > 10 && e.k !== 'grenadier') R(ctx, '#ffe040', x + f * 14 * s - 2 * s, y - 21 * s + by, 4 * s, 4 * s);
        ctx.globalAlpha = 1;
      }
      function drawVehicle(ctx, e) {
        const s = zs(e.z), x = e.x - camX, y = e.k === 'heli' ? e.y : zy(e.z), fl = e.flash > 0, f = e.face || 1;
        if (e.st === 'die') { if (e.stT & 2) return; R(ctx, '#202018', x - 20 * s, y - 8 * s, 40 * s, 8 * s); return; }
        if (e.k === 'jeep') {
          R(ctx, fl ? '#fff' : '#5a6a30', x - 22 * s, y - 14 * s, 44 * s, 10 * s); R(ctx, '#3a4a20', x - 22 * s, y - 6 * s, 44 * s, 2 * s);
          R(ctx, '#80a0b0', x + f * 8 * s - 4 * s, y - 20 * s, 8 * s, 6 * s);
          R(ctx, '#101010', x - 18 * s, y - 6 * s, 9 * s, 6 * s); R(ctx, '#101010', x + 9 * s, y - 6 * s, 9 * s, 6 * s);
          R(ctx, '#4a5a2a', x - f * 8 * s - 3 * s, y - 24 * s, 6 * s, 10 * s); R(ctx, '#e0b080', x - f * 8 * s - 2 * s, y - 28 * s, 4 * s, 4 * s);
          R(ctx, '#202020', x - f * 8 * s, y - 24 * s, f * 14 * s || 1, 2 * s);
        } else if (e.k === 'tank') {
          R(ctx, '#202018', x - 30 * s, y - 10 * s, 60 * s, 10 * s);
          for (let i = 0; i < 6; i++) R(ctx, '#505040', x - 27 * s + i * 10 * s + ((e.t >> 2) & 1) * 2 * s, y - 8 * s, 4 * s, 6 * s);
          R(ctx, fl ? '#fff' : '#4a5a30', x - 26 * s, y - 20 * s, 52 * s, 10 * s);
          R(ctx, fl ? '#fff' : '#5a6a38', x - 12 * s, y - 30 * s, 24 * s, 10 * s);
          R(ctx, '#303820', x + (f > 0 ? 10 : -34) * s, y - 27 * s, 24 * s, 3 * s);
        } else if (e.k === 'heli') {
          R(ctx, fl ? '#fff' : '#3a4a30', x - 18, y - 8, 30, 16); R(ctx, '#80b0c0', x + f * 6 - 5, y - 6, 10, 7);
          R(ctx, fl ? '#fff' : '#3a4a30', x - f * 30 - (f > 0 ? 0 : 0) - 6, y - 4, 24, 5);
          R(ctx, '#202020', x - 28, y - 12, 56, 1); R(ctx, '#202020', x - 3, y - 12, 6, 4);
          if ((e.t >> 1) & 1) R(ctx, '#808080', x - 28, y - 13, 56, 1);
          R(ctx, '#202020', x - 14, y + 9, 26, 1);
        } else if (e.k === 'boat') {
          ctx.fillStyle = fl ? '#fff' : '#506070'; ctx.beginPath(); ctx.moveTo(x - 26 * s, y - 10 * s); ctx.lineTo(x + 28 * s * f, y - 10 * s); ctx.lineTo(x + 20 * s * f, y); ctx.lineTo(x - 22 * s * f, y); ctx.fill();
          R(ctx, '#405060', x - 10 * s, y - 20 * s, 18 * s, 10 * s); R(ctx, '#202020', x + f * 8 * s - 2 * s, y - 18 * s, 14 * s * f || 1, 2 * s);
          for (let i = 0; i < 3; i++) R(ctx, '#c0e0ff', x - f * (28 + i * 6) * s, y - 2 * s - ((e.t + i * 3) % 5), 3 * s, 2 * s);
        }
      }
      function drawBoss(ctx, b) {
        if (b.dying && (b.dying & 4)) return;
        const fl = b.flash > 0, sx = b.x - camX;
        if (b.k === 'tank') {
          const s = zs(b.z), y = zy(b.z);
          R(ctx, '#181810', sx - 54 * s, y - 16 * s, 108 * s, 16 * s);
          for (let i = 0; i < 9; i++) R(ctx, '#505040', sx - 50 * s + i * 12 * s + ((b.t >> 2) & 1) * 3 * s, y - 13 * s, 6 * s, 10 * s);
          R(ctx, fl ? '#fff' : '#3a4a28', sx - 48 * s, y - 32 * s, 96 * s, 16 * s);
          R(ctx, fl ? '#fff' : '#4a5a30', sx - 24 * s, y - 46 * s, 48 * s, 14 * s);
          const a = Math.atan2(PY - (y - 40 * s), P.x - sx);
          ctx.strokeStyle = '#2a3018'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(sx, y - 40 * s); ctx.lineTo(sx + Math.cos(a) * 46 * s, y - 40 * s + Math.sin(a) * 20 * s); ctx.stroke();
          R(ctx, '#c02020', sx - 6 * s, y - 42 * s, 12 * s, 6 * s);
        } else if (b.k === 'heli') {
          const y = b.y, f = b.vx > 0 ? 1 : -1;
          R(ctx, fl ? '#fff' : '#2a3828', sx - 40, y - 14, 70, 28); R(ctx, fl ? '#fff' : '#2a3828', sx - f * 60 - 20, y - 8, 40, 9);
          R(ctx, '#80b0c0', sx + f * 18 - 10, y - 10, 20, 12);
          R(ctx, '#101010', sx - 60, y - 20, 120, 2); if ((b.t >> 1) & 1) R(ctx, '#909090', sx - 60, y - 21, 120, 1);
          R(ctx, '#404040', sx - 30, y + 14, 4, 6); R(ctx, '#404040', sx + 18, y + 14, 4, 6); R(ctx, '#202020', sx - 34, y + 20, 60, 2);
          R(ctx, '#505050', sx - 44, y + 4, 10, 6); R(ctx, '#505050', sx + 30, y + 4, 10, 6);
          R(ctx, '#c02020', sx - 4, y - 4, 8, 8);
        } else if (b.k === 'boat') {
          const s = zs(b.z), y = zy(b.z), f = b.vx > 0 ? 1 : -1;
          ctx.fillStyle = fl ? '#fff' : '#405060'; ctx.beginPath(); ctx.moveTo(sx - 60 * s * f, y - 18 * s); ctx.lineTo(sx + 66 * s * f, y - 18 * s); ctx.lineTo(sx + 50 * s * f, y); ctx.lineTo(sx - 56 * s * f, y); ctx.fill();
          R(ctx, fl ? '#fff' : '#506878', sx - 30 * s, y - 36 * s, 50 * s, 18 * s); R(ctx, '#304050', sx - 10 * s, y - 46 * s, 16 * s, 10 * s);
          R(ctx, '#202020', sx + f * 10 * s, y - 30 * s, f * 30 * s || 1, 4 * s);
          for (let i = 0; i < 5; i++) R(ctx, '#c0e0ff', sx - f * (60 + i * 8) * s, y - 4 * s - ((b.t + i * 2) % 6), 4 * s, 2 * s);
        } else if (b.k === 'fort') {
          const y = zy(b.z);
          R(ctx, '#606868', sx - 110, y - 46, 220, 46); R(ctx, '#505858', sx - 110, y - 46, 220, 4);
          for (let i = 0; i < 11; i++) R(ctx, '#404848', sx - 108 + i * 20, y - 30, 12, 6);
          b.parts.forEach(p => {
            const px = sx + p.dx;
            if (p.hp <= 0) { R(ctx, '#202020', px - 14, y - 52, 28, 8); return; }
            R(ctx, fl ? '#fff' : '#707878', px - 16, y - 70, 32, 26); R(ctx, '#303838', px - 3, y - 50, 6, 14);
            R(ctx, '#c02020', px - 4, y - 64, 8, 6);
          });
        } else {
          const s = zs(b.z), y = zy(b.z), step = Math.sin(b.t * 0.08);
          const leg = (dx, ph) => { const lift = Math.max(0, Math.sin(b.t * 0.08 + ph)) * 8 * s; R(ctx, '#404048', sx + dx * s - 5 * s, y - 64 * s - lift, 10 * s, 34 * s); R(ctx, '#505058', sx + dx * s - 7 * s, y - 30 * s - lift, 14 * s, 30 * s); R(ctx, '#303038', sx + dx * s - 12 * s, y - 4 * s - lift, 24 * s, 4 * s); };
          leg(-24, 0); leg(24, Math.PI);
          R(ctx, fl ? '#fff' : '#606070', sx - 36 * s, y - 120 * s + step * 2, 72 * s, 56 * s);
          R(ctx, '#404050', sx - 36 * s, y - 120 * s + step * 2, 72 * s, 6 * s);
          R(ctx, '#ff3020', sx - 16 * s, y - 104 * s + step * 2, 32 * s, 8 * s); R(ctx, (b.t >> 3) & 1 ? '#ffe040' : '#ff8020', sx - 4 * s, y - 102 * s + step * 2, 8 * s, 4 * s);
          R(ctx, '#505060', sx - 52 * s, y - 108 * s, 16 * s, 26 * s); R(ctx, '#505060', sx + 36 * s, y - 108 * s, 16 * s, 26 * s);
          for (let i = 0; i < 3; i++) { R(ctx, '#202020', sx - 50 * s, y - 104 * s + i * 8 * s, 12 * s, 3 * s); R(ctx, '#202020', sx + 38 * s, y - 104 * s + i * 8 * s, 12 * s, 3 * s); }
        }
      }
      function drawPlayer(ctx) {
        if (P.dead) {
          if (P.dT < 60) { const x = Math.round(P.x); R(ctx, '#3a4a20', x - 10, PY - 8, 20, 8); R(ctx, '#e0b080', x + 6, PY - 10, 6, 6); }
          return;
        }
        if (P.inv > 0 && (P.inv & 4)) return;
        const x = Math.round(P.x), y = PY;
        if (P.roll > 0) {
          ctx.save(); ctx.translate(x, y - 12); ctx.rotate((24 - P.roll) * 0.5 * P.rdir);
          R(ctx, '#4a6a28', -10, -10, 20, 20); R(ctx, '#e0b080', -4, -12, 8, 6); R(ctx, '#c02020', -5, -13, 10, 2);
          ctx.restore(); return;
        }
        const aim = clamp((cx - P.x) / 80, -1, 1), wk = P.walk ? (P.anim >> 3) & 1 : 0;
        // legs (seen from behind)
        R(ctx, '#3a5020', x - 9, y - 18, 7, 18 - wk * 2); R(ctx, '#3a5020', x + 2, y - 18, 7, 18 - (1 - wk) * 2);
        R(ctx, '#2a2010', x - 10, y - 3 + wk * -2, 8, 3); R(ctx, '#2a2010', x + 2, y - 3 - (1 - wk) * 2, 8, 3);
        // torso
        R(ctx, '#4a6a28', x - 11, y - 40, 22, 22); R(ctx, '#3a5020', x - 11, y - 22, 22, 4);
        R(ctx, '#806030', x - 9, y - 38, 4, 16); R(ctx, '#806030', x + 5, y - 38, 4, 16);
        // head
        R(ctx, '#e0b080', x - 6, y - 50, 12, 10); R(ctx, '#302010', x - 6, y - 52, 12, 6); R(ctx, '#c02020', x - 7, y - 48, 14, 2);
        R(ctx, '#c02020', x + 5, y - 47, 4, 6);
        // arms + rifle aimed up toward the sight
        const gx = x + aim * 10, gy = y - 46;
        R(ctx, '#e0b080', x - 13, y - 38, 4, 10); R(ctx, '#e0b080', x + 9, y - 38, 4, 10);
        ctx.strokeStyle = '#202020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 2, y - 30); ctx.lineTo(gx + aim * 6, gy - 6); ctx.stroke();
        if (P.firing && P.fireT > 2) { R(ctx, '#ffe040', gx + aim * 6 - 3, gy - 10, 6, 6); R(ctx, '#fff', gx + aim * 6 - 1, gy - 8, 2, 2); }
      }
      function drawEshot(ctx, s) {
        const k = s.t / s.dur;
        const x = s.sx + (s.tx - s.sx) * k - camX;
        let y = s.sy + (PY - 16 - s.sy) * k;
        if (s.kind === 'g' || s.kind === 's') y -= Math.sin(k * Math.PI) * 40;
        const r = 1 + k * (s.kind === 'b' ? 3 : 5);
        if (s.kind === 'b') { R(ctx, '#ffffff', x - r, y - r, r * 2, r * 2); R(ctx, '#ff4020', x - r / 2, y - r / 2, r, r); }
        else if (s.kind === 'm') { R(ctx, '#e0e0e0', x - r, y - r, r * 2, r * 2); R(ctx, '#ff8020', x - r / 2, y - r * 2, r, r); }
        else { R(ctx, '#202020', x - r, y - r, r * 2, r * 2); R(ctx, (T >> 2) & 1 ? '#ff4020' : '#ffe040', x - 1, y - 1, 2, 2); }
        // landing marker so the player can read where it falls
        if (k > 0.5) { const mx = s.tx - camX; R(ctx, 'rgba(255,40,20,0.5)', mx - s.r * 0.5, PY - 1, s.r, 2); }
      }
      function drawSight(ctx) {
        const x = Math.round(cx), y = Math.round(cy), c = (T >> 2) & 1 ? '#ffffff' : '#ff3020';
        R(ctx, c, x - 8, y, 5, 1); R(ctx, c, x + 4, y, 5, 1); R(ctx, c, x, y - 8, 1, 5); R(ctx, c, x, y + 4, 1, 5);
        ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, 6, 0, 7); ctx.stroke();
      }
      function drawHud(ctx) {
        R(ctx, 'rgba(0,0,0,0.6)', 0, 0, W, 18);
        text(ctx, '1P', 4, 2, '#40c0ff'); text(ctx, String(score).padStart(7, '0'), 18, 2, '#fff');
        text(ctx, 'HI', 112, 2, '#ff4040'); text(ctx, String(hi).padStart(7, '0'), 126, 2, '#fff');
        for (let i = 0; i < Math.min(6, lives - 1); i++) { R(ctx, '#4a6a28', 4 + i * 8, 11, 5, 5); R(ctx, '#c02020', 4 + i * 8, 11, 5, 1); }
        text(ctx, 'G' + String(P ? P.gren : 0).padStart(2, '0'), 64, 10, '#e0d040');
        if (P && P.wpn !== 'mg') text(ctx, (P.wpn === 'H' ? 'HMG ' : 'RKT ') + P.ammo, 96, 10, '#ffe040');
        // enemy gauge
        text(ctx, 'ENEMY', 206, 2, '#e0d040');
        R(ctx, '#202020', 240, 3, 76, 6);
        if (boss) { R(ctx, (T >> 3) & 1 ? '#ff2020' : '#ff8020', 241, 4, 74 * boss.hp / boss.max, 4); }
        else R(ctx, '#40e040', 241, 4, 74 * Math.max(0, 1 - kills / quota), 4);
        text(ctx, 'M' + (si + 1), W - 4, 10, '#c0c0c0', 1, 'right');
      }
      function renderGame(ctx) {
        if (phase === 'ending') {
          R(ctx, '#100804', 0, 0, W, H);
          textS(ctx, 'MISSION COMPLETE', W / 2, 50, '#e0d040', 2, 'center');
          text(ctx, 'THE GIANT WALKER IS DESTROYED', W / 2, 90, '#fff', 1, 'center');
          text(ctx, 'AND THE PRISONERS ARE FREE.', W / 2, 102, '#fff', 1, 'center');
          text(ctx, 'BUT THE WAR GOES ON...', W / 2, 140, '#ff8080', 1, 'center');
          drawHud(ctx); return;
        }
        ctx.save();
        if (shake) ctx.translate(((shake >> 1) & 1) ? 2 : -2, (shake & 1) ? 1 : -1);
        drawBg(ctx);
        // depth-sorted draw
        const list = [];
        for (const p of props) list.push({ z: p.z, d: () => drawProp(ctx, p) });
        for (const e of ens) list.push({ z: e.k === 'heli' ? 2 : e.z, d: () => (e.k === 'soldier' || e.k === 'grenadier' || e.k === 'officer') ? drawSoldier(ctx, e) : drawVehicle(ctx, e) });
        if (boss) list.push({ z: boss.k === 'heli' ? 2.5 : boss.z + 0.001, d: () => drawBoss(ctx, boss) });
        list.sort((a, b) => a.z - b.z);
        for (const o of list) o.d();
        for (const it of items) {
          if (it.t < 90 && (it.t & 4)) continue;
          const x = Math.round(it.x - camX), y = Math.round(it.y);
          R(ctx, '#000', x - 7, y - 7, 14, 14); R(ctx, it.k === 'P' ? '#ffd700' : '#e0d040', x - 6, y - 6, 12, 12);
          text(ctx, it.k, x - 2, y - 3, '#000');
        }
        for (const s of pshots) {
          const k = s.t / s.dur, x = s.sx + (s.tx - s.sx) * k - camX;
          let y = s.sy + (s.ty - s.sy) * k;
          if (s.k === 'gren') { y -= Math.sin(k * Math.PI) * 50; R(ctx, '#304020', x - 3 + k * 1.5, y - 3 + k * 1.5, 6 - k * 3, 6 - k * 3); }
          else { R(ctx, '#e0e0e0', x - 2, y - 2, 4, 4); R(ctx, '#ff8020', x - 1 - (s.tx - s.sx) * 0.02, y + 2, 3, 3); }
        }
        for (const f of fx) {
          if (f.k === 'boom') { const k = 1 - f.t / 26; ctx.fillStyle = (f.t & 2) ? '#ffe040' : '#ff6020'; ctx.beginPath(); ctx.arc(f.x - camX, f.y, Math.max(1, f.r * (0.4 + k * 0.6)), 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(60,60,60,0.5)'; ctx.beginPath(); ctx.arc(f.x - camX, f.y - k * 10, f.r * k * 0.7, 0, 7); ctx.fill(); }
          else if (f.k === 'spark') { R(ctx, '#ffe040', f.x - camX - 2, f.y - 2, 4, 4); R(ctx, '#fff', f.x - camX - 1, f.y - 1, 2, 2); }
          else if (f.k === 'dust') R(ctx, '#c0b090', f.x - camX - (12 - f.t), f.y - 4, (12 - f.t) * 2, 3);
          else if (f.k === 'tracer') { ctx.strokeStyle = 'rgba(255,240,120,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(f.x0 - camX, f.y0); ctx.lineTo(f.x1 - camX, f.y1); ctx.stroke(); }
          else if (f.k === 'txt') textS(ctx, f.s, f.x - camX, f.y, f.c || '#fff', 1, 'center');
        }
        for (const s of eshots) drawEshot(ctx, s);
        drawPlayer(ctx);
        ctx.restore();
        if (!P.dead) drawSight(ctx);
        if (phase === 'intro') {
          R(ctx, 'rgba(0,0,0,0.5)', 0, 90, W, 40);
          textS(ctx, ST().name, W / 2, 98, '#e0d040', 1, 'center');
          if ((T >> 3) & 1) textS(ctx, 'GO!', W / 2, 112, '#fff', 1, 'center');
        }
        if (boss && boss.t < 150 && !boss.dying && (T >> 3) & 1) textS(ctx, 'WARNING!  ' + ST().bname, W / 2, 40, '#ff3020', 1, 'center');
        if (phase === 'clear') { textS(ctx, 'MISSION CLEAR', W / 2, 80, '#40ff40', 2, 'center'); if (phaseT > 60) text(ctx, 'GRENADE BONUS', W / 2, 106, '#fff', 1, 'center'); }
        drawHud(ctx);
      }
      function renderAttract(ctx) {
        const page = Math.floor(atT / 540) % 3, t = atT % 540;
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#200808'); g.addColorStop(0.6, '#a03828'); g.addColorStop(1, '#201008');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#100404';
        for (let i = 0; i < 20; i++) { const x = i * 18, h = 10 + hash(i) * 26; ctx.beginPath(); ctx.arc(x, 150 - h * 0.3, h * 0.6, 0, 7); ctx.fill(); }
        R(ctx, '#100404', 0, 150, W, 74);
        if (page === 0) {
          textS(ctx, 'NAM-1975', W / 2, 30, '#e0d040', 5, 'center');
          R(ctx, '#e03020', 40, 72, 240, 2);
          // helicopter silhouette crossing
          const hx = (t * 1.2) % (W + 120) - 60;
          R(ctx, '#000', hx - 20, 100, 34, 12); R(ctx, '#000', hx + 14, 104, 26, 4); R(ctx, '#000', hx - 30, 96, 60, 1);
          if ((t >> 1) & 1) R(ctx, '#000', hx - 30, 95, 60, 1);
          text(ctx, 'THE WAR IS NOT OVER YET.', W / 2, 130, '#fff', 1, 'center');
          text(ctx, '\u00a9 1990 SNK', W / 2, 208, '#c0c0c0', 1, 'center');
        } else if (page === 1) {
          textS(ctx, 'HOW TO FIGHT', W / 2, 22, '#e0d040', 2, 'center');
          const lines = ['ARROWS MOVE YOUR SIGHT -', 'YOUR SOLDIER FOLLOWS IT.', '', 'HOLD SPACE TO FIRE. WHILE FIRING', 'THE SOLDIER CANNOT MOVE!', '', 'X: THROW A GRENADE AT THE SIGHT', 'X + LEFT/RIGHT: DODGE ROLL', '', 'SHOOT ITEMS TO PICK THEM UP.', 'FILL THE ENEMY GAUGE TO FACE', 'THE MISSION BOSS.'];
          lines.forEach((l, i) => { if (t > i * 10) text(ctx, l, W / 2, 50 + i * 11, i < 5 ? '#fff' : '#ffd080', 1, 'center'); });
        } else {
          textS(ctx, 'HALL OF HEROES', W / 2, 26, '#e0d040', 2, 'center');
          const rows = [['SNK', Math.max(hi, 100000)], ['SIL', 80000], ['NAT', 60000], ['GIA', 40000], ['MAX', 20000]].sort((a, b) => b[1] - a[1]);
          rows.forEach((r, i) => { text(ctx, (i + 1) + '.', 100, 60 + i * 16, '#e0d040'); text(ctx, r[0], 120, 60 + i * 16, '#fff'); text(ctx, String(r[1]), 226, 60 + i * 16, '#fff', 1, 'right'); });
        }
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 186, '#fff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) textS(ctx, 'PUSH START', W / 2, 186, '#ffe040', 1, 'center'); }
        else if (blink) textS(ctx, 'INSERT COIN', W / 2, 186, '#fff', 1, 'center');
        text(ctx, credStr(), W - 4, H - 9, '#ccc', 1, 'right');
        text(ctx, 'HI ' + hi, 4, H - 9, '#ccc');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { renderAttract(ctx); return; }
        renderGame(ctx);
        if (mode === 'over') { R(ctx, 'rgba(0,0,0,0.5)', 0, 90, W, 44); textS(ctx, 'GAME OVER', W / 2, 102, '#ff4040', 3, 'center'); }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
