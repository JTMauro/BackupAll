// Caveman Ninja (Data East, 1991) - from-scratch recreation for the MAME32 Game Room.
// Prehistoric run-and-throw: hurl stone axes, wheels, bones and fire at neanderthals and dinosaurs; eat to keep your vitality up.
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
  function R(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const W = 256, H = 240, G = 0.22, HUD = 20, MAXHP = 20;

  const STG = [
    { name: 'THE JUNGLE', sky: ['#2058c0', '#a0d8ff'], far: '#5a9ab0', hill: '#2f7a3a', grd: '#8a5a2a', top: '#48b830', dk: '#5a3a18', pit: 'water', pool: ['neander', 'neander', 'raptor', 'ptero', 'plant'], boss: 'trex', bname: 'TYRANNOSAURUS' },
    { name: 'THE ICE AGE', sky: ['#5070b0', '#e0f0ff'], far: '#a0b8d8', hill: '#d8e8f8', grd: '#7890b0', top: '#f4fcff', dk: '#486080', pit: 'water', pool: ['neander', 'raptor', 'neander', 'ptero', 'boulder'], boss: 'mammoth', bname: 'MAMMOTH' },
    { name: 'THE SWAMP', sky: ['#304820', '#90a860'], far: '#506840', hill: '#384a28', grd: '#5a4828', top: '#6a8a30', dk: '#3a2a10', pit: 'swamp', pool: ['neander', 'plant', 'raptor', 'ptero', 'plant', 'neander'], boss: 'plesio', bname: 'PLESIOSAUR' },
    { name: 'THE VOLCANO', sky: ['#300808', '#d04818'], far: '#501010', hill: '#381010', grd: '#4a3030', top: '#906050', dk: '#200c0c', pit: 'lava', pool: ['neander', 'raptor', 'ptero', 'boulder', 'raptor', 'ptero'], boss: 'ptera', bname: 'PTERANODON' }
  ];
  const WEAP = {
    axe: { col: '#a0a0a0', dmg: 1 }, wheel: { col: '#c08040', dmg: 1 }, bone: { col: '#f0f0e0', dmg: 1 },
    fire: { col: '#ff8020', dmg: 2 }, stone: { col: '#808890', dmg: 1 }
  };
  const FOOD = { fruit: { hp: 2, pts: 100 }, meat: { hp: 5, pts: 300 }, bigmeat: { hp: 99, pts: 1000 } };

  ArcadeRegistry.register({
    id: 'cavemanninja', title: 'Caveman Ninja', year: 1991, maker: 'Data East',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: move \u00b7 X or Up: jump (Up+X: spin jump, Down+X: drop) \u00b7 Space: throw (hold & release: power throw) \u00b7 Enter: start',
    marquee: { bg: '#2a1808', fg: '#60e040', accent: '#ffb020' },
    create(api) {
      const A = api.audio;
      const sfx = {
        throw: () => A.noise(0.08, { vol: 0.08, freq: 2500, type: 'bandpass' }),
        big: () => { A.tone(150, 0.3, { type: 'sawtooth', vol: 0.12, slideTo: 500 }); A.noise(0.25, { vol: 0.1, freq: 1200 }); },
        jump: () => A.tone(240, 0.12, { type: 'square', vol: 0.07, slideTo: 480 }),
        spin: () => A.tone(300, 0.25, { type: 'square', vol: 0.07, slideTo: 900 }),
        hit: () => { A.noise(0.07, { vol: 0.16, freq: 1500 }); A.tone(200, 0.06, { type: 'square', vol: 0.08, slideTo: 100 }); },
        tink: () => A.tone(1800, 0.05, { type: 'square', vol: 0.06 }),
        kill: () => A.melody([[700, 0.05], [500, 0.05], [900, 0.08]], { type: 'square', vol: 0.1 }),
        hurt: () => { A.tone(400, 0.2, { type: 'sawtooth', vol: 0.12, slideTo: 120 }); },
        eat: () => A.melody([[660, 0.04], [880, 0.04], [660, 0.04], [990, 0.07]], { type: 'square', vol: 0.1 }),
        pow: () => A.melody([[523, 0.05], [659, 0.05], [784, 0.05], [1047, 0.12]], { type: 'square', vol: 0.12 }),
        roar: () => { A.noise(0.6, { vol: 0.2, freq: 500, slideTo: 150 }); A.tone(90, 0.6, { type: 'sawtooth', vol: 0.12, slideTo: 60 }); },
        boom: () => { A.noise(0.5, { vol: 0.25, freq: 1000, slideTo: 80 }); A.tone(80, 0.4, { type: 'sine', vol: 0.18, slideTo: 30 }); },
        die: () => A.melody([[523, 0.12], [494, 0.12], [466, 0.12], [440, 0.12], [262, 0.4]], { type: 'square', vol: 0.13 }),
        clear: () => A.melody([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.2], [659, 0.1], [784, 0.4]], { type: 'square', vol: 0.13 }),
        oneup: () => A.melody([[784, 0.06], [988, 0.06], [1175, 0.06], [1568, 0.16]], { type: 'square', vol: 0.12 }),
        over: () => A.melody([[330, 0.25], [294, 0.25], [262, 0.25], [196, 0.6]], { type: 'triangle', vol: 0.15 }),
        coin: () => A.tone(1800, 0.06, { type: 'square', vol: 0.08, slideTo: 2400 }),
        spit: () => A.noise(0.2, { vol: 0.12, freq: 700, slideTo: 2000 })
      };
      let hi = api.getHiScore(50000);
      let mode = 'attract', T = 0, atT = 0, coinFlash = 0, lastCred = api.credits;
      let score = 0, lives = 3, si = 0, loop = 0, nextExtend = 50000;
      let P = null, ens = [], shots = [], eshots = [], items = [], fx = [], segs = [], plats = [], spawns = [], boss = null;
      let camX = 0, LEN = 2400, lock = false, phase = 'intro', phaseT = 0, shake = 0, musT = 0, musI = 0, drainT = 0;
      const ST = () => STG[si];
      const lvl = () => si + loop * 4;
      function credStr() { return 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'); }
      function addScore(n, x, y) {
        score += n; if (score > hi) hi = score;
        if (x != null) fx.push({ k: 'txt', s: String(n), x, y, t: 45, c: '#fff' });
        if (score >= nextExtend) { nextExtend += nextExtend < 100000 ? 100000 : 150000; lives++; sfx.oneup(); fx.push({ k: 'txt', s: '1UP', x: P.x, y: P.y - 40, t: 80, c: '#40ff40' }); }
      }
      // ---------- terrain ----------
      function build() {
        const s = si * 97 + loop * 13;
        LEN = 2300 + si * 200;
        segs = []; plats = []; spawns = [];
        let x = 0, y = 200, i = 0;
        const arena = LEN - W;
        while (x < arena) {
          let w = 64 + Math.floor(hash(s + i * 3.1) * 110);
          if (x < 220) { w = 260 - x; y = 200; }
          if (x + w > arena - 30) w = arena - x;
          segs.push({ x0: x, x1: x + w, y });
          if (w > 70 && hash(s + i * 5.7) < 0.45 && x > 260) plats.push({ x0: x + 10, x1: x + 10 + 40 + Math.floor(hash(s + i) * 30), y: y - 46 });
          x += w; i++;
          if (x < arena - 60 && x > 300 && hash(s + i * 7.3) < 0.35) {
            x += 28 + Math.floor(hash(s + i * 2.9) * 14);
            y = clamp(y + (Math.floor(hash(s + i * 11.1) * 3) - 1) * 13, 150, 210);
          } else y = clamp(y + (Math.floor(hash(s + i * 11.1) * 5) - 2) * 13, 150, 210);
        }
        if (ST().boss === 'plesio') {
          segs.push({ x0: arena, x1: arena + 70, y: 200 }, { x0: arena + 110, x1: arena + 146, y: 200 }, { x0: arena + 186, x1: LEN + 40, y: 200 });
          plats.push({ x0: arena + 60, x1: arena + 120, y: 150 }, { x0: arena + 136, x1: arena + 196, y: 150 });
        } else segs.push({ x0: arena, x1: LEN + 40, y: 200 });
        // enemy spawn points
        const pool = ST().pool;
        let n = 0;
        for (let sx = 300; sx < arena - 40; sx += 90 + Math.floor(hash(s + n * 4.3) * 80) - Math.min(40, lvl() * 6)) {
          spawns.push({ x: sx, k: pool[Math.floor(hash(s + n * 9.7) * pool.length)], carry: hash(s + n * 3.3) < 0.22 });
          n++;
        }
      }
      function groundTop(x) { for (const sg of segs) if (x >= sg.x0 && x < sg.x1) return sg.y; return null; }
      function solidAt(x, y) { for (const sg of segs) if (x >= sg.x0 && x < sg.x1 && y > sg.y + 2) return true; return false; }
      function standing(b) {
        for (const sg of segs) if (b.x >= sg.x0 - 1 && b.x < sg.x1 + 1 && Math.abs(sg.y - b.y) < 0.5) return true;
        for (const p of plats) if (b.x >= p.x0 && b.x < p.x1 && Math.abs(p.y - b.y) < 0.5 && b.drop !== p.y) return true;
        return false;
      }
      function moveX(b, dx) {
        const nx = b.x + dx, edge = nx + Math.sign(dx) * (b.hw || 5);
        if (solidAt(edge, b.y)) return false;
        b.x = nx; return true;
      }
      function grav(b, g) {
        if (b.onG) { if (standing(b)) return false; b.onG = false; b.vy = 0; }
        const py = b.y; b.vy = Math.min(6, b.vy + (g || G)); b.y += b.vy;
        if (b.vy > 0) {
          for (const sg of segs) if (b.x >= sg.x0 - 1 && b.x < sg.x1 + 1 && py <= sg.y + 0.5 && b.y >= sg.y) { b.y = sg.y; b.vy = 0; b.onG = true; b.drop = 0; return true; }
          for (const p of plats) if (b.x >= p.x0 && b.x < p.x1 && py <= p.y + 0.5 && b.y >= p.y && b.drop !== p.y) { b.y = p.y; b.vy = 0; b.onG = true; b.drop = 0; return true; }
        }
        return false;
      }
      // ---------- setup ----------
      function newGame() { score = 0; lives = 3; si = 0; loop = 0; nextExtend = 50000; mode = 'game'; startStage(); }
      function mkPlayer(x) {
        return { x, y: 0, vx: 0, vy: 0, onG: false, drop: 0, hw: 5, face: 1, hp: MAXHP, inv: 120, wpn: P ? P.wpn : 'axe', charge: 0, held: false, spin: false, st: 'ok', stT: 0, anim: 0, crouch: false, throwT: 0, dead: false, dT: 0 };
      }
      function placePlayer(x) {
        P = mkPlayer(x);
        let gy = groundTop(x);
        while (gy == null) { x += 8; gy = groundTop(x); }
        P.x = x; P.y = gy; P.onG = true;
      }
      function startStage() {
        build();
        P = null; placePlayer(40);
        ens = []; shots = []; eshots = []; items = []; fx = []; boss = null; camX = 0; lock = false;
        phase = 'intro'; phaseT = 0; drainT = 0;
      }
      function respawn() {
        const wp = P.wpn;
        ens = ens.filter(e => Math.abs(e.x - (camX + 40)) > 60);
        eshots = [];
        placePlayer(Math.max(camX + 30, 20)); P.wpn = wp;
        if (lock) { P.x = camX + 30; P.y = groundTop(P.x) || 200; }
      }
      function hurtPlayer(n) {
        if (P.dead || P.inv > 0) return;
        P.hp -= n; P.inv = 80; sfx.hurt();
        if (P.hp <= 0) { killPlayer(); return; }
        P.st = 'hurt'; P.stT = 18; P.vx = -P.face * 1.6; P.vy = -2.6; P.onG = false;
      }
      function killPlayer() {
        if (P.dead) return;
        P.dead = true; P.dT = 0; P.hp = 0; P.vy = -4.5; sfx.die();
      }
      // ---------- enemies ----------
      function mkEnemy(k, x, carry) {
        const gy = groundTop(x);
        const e = { k, x, y: gy == null ? 200 : gy, vx: 0, vy: 0, onG: gy != null, hw: 6, hp: 2, face: -1, t: 0, st: 'walk', stT: 0, flash: 0, carry, drop: 0 };
        const L = lvl();
        if (k === 'neander') { e.hp = 2 + (L >= 3 ? 1 : 0); e.spd = 0.55 + L * 0.05; }
        if (k === 'raptor') { e.hp = 2; e.spd = 1.3 + L * 0.08; e.hw = 8; }
        if (k === 'ptero') { e.hp = 1; e.y = 50 + Math.random() * 40; e.onG = false; e.spd = 1 + L * 0.06; e.baseY = e.y; e.hw = 10; }
        if (k === 'plant') { e.hp = 3 + Math.floor(L / 3); e.hw = 8; }
        if (k === 'boulder') { e.hp = 2; e.spd = 1.6 + L * 0.1; e.hw = 9; e.y = gy == null ? 200 : gy; }
        ens.push(e); return e;
      }
      function enemyDie(e, by) {
        e.st = 'flee'; e.stT = 0; e.vy = -3; e.onG = false; e.face = by > e.x ? -1 : 1;
        const pts = { neander: 200, raptor: 300, ptero: 300, plant: 500, boulder: 200 }[e.k] || 100;
        addScore(pts, e.x, e.y - 30); sfx.kill();
        if (e.carry) dropItem(e.x, e.y - 20, Math.random() < 0.5 ? ['axe', 'wheel', 'bone', 'fire', 'stone'][Math.floor(Math.random() * 5)] : (Math.random() < 0.3 ? 'bigmeat' : 'meat'));
        else if (Math.random() < 0.3) dropItem(e.x, e.y - 20, Math.random() < 0.8 ? 'fruit' : 'meat');
        if (e.k === 'plant' || e.k === 'boulder') e.gone = true;
        for (let i = 0; i < 6; i++) fx.push({ k: 'chip', x: e.x, y: e.y - 12, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, t: 25, c: e.k === 'boulder' ? '#706050' : '#ffe040' });
      }
      function dropItem(x, y, k) { items.push({ k, x, y, vx: 0, vy: -2.5, onG: false, drop: 0, hw: 4, t: 600 }); }
      function updEnemy(e) {
        e.t++; if (e.flash > 0) e.flash--;
        const dx = P.x - e.x, adx = Math.abs(dx);
        if (e.st === 'flee') {
          e.stT++;
          if (e.k === 'ptero') { e.vy += 0.15; e.y += e.vy; e.x += e.face; }
          else { e.x += e.face * 2.4; e.vy += 0.2; e.y += e.vy; const gt = groundTop(e.x); if (gt != null && e.y > gt && e.y - e.vy <= gt + 1) { e.y = gt; e.vy = -2; } }
          if (e.stT > 200 || e.x < camX - 40 || e.x > camX + W + 40 || e.y > H + 20) e.gone = true;
          return;
        }
        if (e.k === 'neander') {
          if (e.st === 'walk') {
            e.face = dx > 0 ? 1 : -1;
            const ahead = e.x + e.face * 10;
            if (adx > 20) {
              if (groundTop(ahead) == null && e.onG) { if (Math.random() < 0.02) { e.vy = -4.4; e.onG = false; e.vx = e.face * 1.2; } }
              else if (!moveX(e, e.face * e.spd) && e.onG) { e.vy = -4.4; e.onG = false; e.vx = e.face * 0.8; }
            }
            if (!e.onG && e.vx) moveX(e, e.vx);
            if (adx < 26 && Math.abs(P.y - e.y) < 20 && e.onG && Math.random() < 0.08) { e.st = 'attack'; e.stT = 0; }
          } else if (e.st === 'attack') {
            e.stT++;
            if (e.stT >= 14 && e.stT <= 20 && !P.dead) {
              const cx = e.x + e.face * 18;
              if (Math.abs(P.x - cx) < 14 && P.y - e.y > -26 && P.y - e.y < 10) hurtPlayer(3);
            }
            if (e.stT === 14) A.noise(0.06, { vol: 0.08, freq: 3000, type: 'highpass' });
            if (e.stT > 40) { e.st = 'walk'; }
          } else if (e.st === 'hurt') { e.stT--; moveX(e, e.vx); if (e.stT <= 0) e.st = 'walk'; }
          if (grav(e)) e.vx = 0;
          if (e.y > H + 20) e.gone = true;
        } else if (e.k === 'raptor') {
          if (e.st === 'hurt') { e.stT--; moveX(e, e.vx); if (e.stT <= 0) e.st = 'walk'; }
          else {
            if (e.onG && (adx > 60 || e.t % 120 < 3)) e.face = dx > 0 ? 1 : -1;
            const ahead = e.x + e.face * 12;
            if (e.onG && groundTop(ahead) == null) { e.vy = -4.8; e.onG = false; }
            if (!moveX(e, e.face * e.spd) && e.onG) { e.vy = -4.8; e.onG = false; }
            if (e.onG && adx < 70 && adx > 30 && Math.random() < 0.01) { e.vy = -4; e.onG = false; }
          }
          grav(e);
          if (e.y > H + 20 || e.x < camX - 80) e.gone = true;
        } else if (e.k === 'ptero') {
          if (e.st === 'walk') {
            e.x -= e.spd * (e.dir || 1); e.y = e.baseY + Math.sin(e.t * 0.05) * 8;
            if (adx < 70 && dx <= 0 && !P.dead && Math.random() < 0.05) { e.st = 'dive'; e.stT = 0; e.tx = P.x; e.ty = P.y - 14; e.sx = e.x; e.sy = e.y; }
            if (e.x < camX - 40) e.gone = true;
          } else if (e.st === 'dive') {
            e.stT++;
            const k = e.stT / 60;
            e.x = e.sx + (e.tx - e.sx) * k * 1.6; e.y = e.sy + (e.ty - e.sy) * Math.sin(Math.min(1, k) * Math.PI);
            if (e.stT >= 60) { e.st = 'walk'; e.baseY = e.y; }
          }
          if (e.x < camX - 60 || e.x > camX + W + 120) e.gone = true;
        } else if (e.k === 'plant') {
          e.face = dx > 0 ? 1 : -1;
          if (e.st === 'walk' && adx < 44 && Math.abs(P.y - e.y) < 30 && Math.random() < 0.05) { e.st = 'attack'; e.stT = 0; }
          if (e.st === 'attack') {
            e.stT++;
            if (e.stT >= 12 && e.stT <= 24 && Math.abs(P.x - (e.x + e.face * 24)) < 14 && Math.abs(P.y - e.y) < 30) hurtPlayer(2);
            if (e.stT > 44) e.st = 'walk';
          }
        } else if (e.k === 'boulder') {
          e.rot = (e.rot || 0) - e.spd * 0.12;
          e.x -= e.spd;
          const gt = groundTop(e.x);
          if (gt == null) { e.vy += G; e.y += e.vy; }
          else if (e.y < gt - 1) { e.vy += G; e.y += e.vy; if (e.y >= gt) { e.y = gt; e.vy = -Math.abs(e.vy) * 0.4; shake = 4; } }
          else if (e.y > gt + 2) { e.vy = -3; e.y = gt; }
          else e.y = gt;
          if (e.y > H + 20 || e.x < camX - 40) e.gone = true;
        }
        // contact
        if (!P.dead && P.inv <= 0 && e.st !== 'flee') {
          const ey = e.k === 'ptero' ? e.y + 6 : e.y;
          const eh = e.k === 'ptero' ? 12 : e.k === 'raptor' ? 18 : e.k === 'boulder' ? 18 : 24;
          const ph = P.crouch ? 14 : 24;
          if (Math.abs(P.x - e.x) < e.hw + 5 && P.y - ph < ey && P.y > ey - eh) hurtPlayer(e.k === 'boulder' ? 3 : 2);
        }
      }
      function enemyRect(e) {
        if (e.k === 'ptero') return [e.x - 11, e.y - 6, e.x + 11, e.y + 8];
        if (e.k === 'raptor') return [e.x - 9, e.y - 18, e.x + 9, e.y];
        if (e.k === 'boulder') return [e.x - 10, e.y - 20, e.x + 10, e.y];
        if (e.k === 'plant') return [e.x - 8, e.y - 30, e.x + 8 + (e.st === 'attack' ? 20 : 0), e.y];
        return [e.x - 7, e.y - 26, e.x + 7, e.y];
      }
      // ---------- bosses ----------
      function mkBoss() {
        const k = ST().boss, ax = LEN - W, hpb = 26 + loop * 10;
        lock = true; camX = ax; sfx.roar();
        if (k === 'trex') boss = { k, x: ax + 200, y: 200, face: -1, hp: hpb, st: 'walk', t: 0, stT: 0 };
        else if (k === 'mammoth') boss = { k, x: ax + 210, y: 200, face: -1, hp: hpb + 6, st: 'idle', t: 0, stT: 0 };
        else if (k === 'plesio') boss = { k, x: ax + 90, y: 240, face: -1, hp: hpb + 4, st: 'under', t: 0, stT: 60, hy: 240, pit: 0 };
        else boss = { k, x: ax + 200, y: 70, face: -1, hp: hpb + 10, st: 'hover', t: 0, stT: 0, vx: -1 };
        boss.max = boss.hp; boss.flash = 0;
      }
      function bossRects(b) {
        // returns {weak:[...], body:[...]}
        if (b.k === 'trex') {
          const lunge = b.st === 'lunge' ? Math.sin(Math.min(1, b.stT / 20) * Math.PI) * 22 : 0;
          const hx = b.x + b.face * (40 + lunge), hy = b.y - 70 + (b.st === 'lunge' ? lunge * 0.8 : 0);
          return { weak: [[hx - 15, hy - 12, hx + 15, hy + 12]], body: [[b.x - 30, b.y - 64, b.x + 30, b.y]], head: [hx, hy] };
        }
        if (b.k === 'mammoth') {
          const hx = b.x + b.face * 36, hy = b.y - 46;
          return { weak: [[hx - 13, hy - 14, hx + 13, hy + 14]], body: [[b.x - 36, b.y - 60, b.x + 26, b.y]], head: [hx, hy] };
        }
        if (b.k === 'plesio') return { weak: [[b.x - 13, b.hy - 12, b.x + 13, b.hy + 10]], body: [[b.x - 7, b.hy + 10, b.x + 7, 240]], head: [b.x, b.hy] };
        return { weak: [[b.x - 24, b.y - 12, b.x + 24, b.y + 12]], body: [], head: [b.x, b.y] };
      }
      function updBoss() {
        const b = boss; b.t++; if (b.flash > 0) b.flash--;
        const ax = LEN - W;
        if (b.dying) {
          b.dying++;
          if (b.dying % 7 === 0) { const r = bossRects(b).head; fx.push({ k: 'boom', x: r[0] + (Math.random() - 0.5) * 50, y: r[1] + (Math.random() - 0.2) * 50, t: 18 }); sfx.boom(); }
          if (b.k === 'ptera') { b.y += 1.2; } if (b.k === 'plesio') b.hy += 0.6;
          if (b.dying > 150) { boss = null; phase = 'clear'; phaseT = 0; sfx.clear(); }
          return;
        }
        const anger = 1 + (1 - b.hp / b.max) * 0.7 + loop * 0.2;
        if (b.k === 'trex') {
          b.stT++;
          if (b.st === 'walk') {
            b.face = P.x < b.x ? -1 : 1;
            if (Math.abs(P.x - b.x) > 60) b.x += b.face * 0.5 * anger;
            b.x = clamp(b.x, ax + 40, ax + W - 40);
            if (b.stT > 100 / anger) { b.st = Math.random() < 0.5 ? 'roar' : 'lunge'; b.stT = 0; if (b.st === 'roar') sfx.roar(); }
          } else if (b.st === 'roar') {
            if (b.stT % 18 === 10 && b.stT < 60) { const r = bossRects(b).head; eshots.push({ x: r[0] + b.face * 10, y: r[1] + 4, vx: b.face * (1.4 + Math.random() * 1.4), vy: -2.5 - Math.random() * 1.5, g: 0.1, r: 4, t: 300, c: '#ff8020' }); sfx.spit(); }
            if (b.stT > 80) { b.st = 'walk'; b.stT = 0; }
          } else if (b.st === 'lunge') {
            b.x += b.face * (b.stT < 20 ? 1.2 : 0) * anger;
            b.x = clamp(b.x, ax + 40, ax + W - 40);
            if (b.stT > 46) { b.st = 'walk'; b.stT = 0; }
          }
        } else if (b.k === 'mammoth') {
          b.stT++;
          if (b.st === 'idle') { b.face = P.x < b.x ? -1 : 1; if (b.stT > 70 / anger) { b.st = Math.random() < 0.6 ? 'charge' : 'stomp'; b.stT = 0; if (b.st === 'charge') sfx.roar(); } }
          else if (b.st === 'charge') {
            b.x += b.face * 2.6 * anger;
            if (b.x < ax + 40 || b.x > ax + W - 40) { b.x = clamp(b.x, ax + 40, ax + W - 40); b.st = 'idle'; b.stT = 0; b.face = -b.face; shake = 10; sfx.boom(); }
          } else if (b.st === 'stomp') {
            if (b.stT === 30 || b.stT === 60) {
              shake = 12; sfx.boom();
              for (let i = 0; i < 3 + loop; i++) eshots.push({ x: ax + 20 + Math.random() * (W - 40), y: HUD + 2, vx: 0, vy: 0, g: 0.12, delay: 30 + i * 12, r: 4, t: 400, c: '#c0f0ff', ice: 1 });
            }
            if (b.stT > 90) { b.st = 'idle'; b.stT = 0; }
          }
        } else if (b.k === 'plesio') {
          b.stT--;
          const pits = [ax + 90, ax + 166];
          if (b.st === 'under') { b.hy = 240; if (b.stT <= 0) { b.pit = Math.random() < 0.5 ? 0 : 1; b.x = pits[b.pit]; b.st = 'rise'; b.stT = 40; } }
          else if (b.st === 'rise') { b.hy += (120 - b.hy) * 0.08; if (b.stT <= 0) { b.st = 'spit'; b.stT = Math.round(110 / anger); } }
          else if (b.st === 'spit') {
            b.face = P.x < b.x ? -1 : 1;
            b.hy = 120 + Math.sin(b.t * 0.08) * 8;
            if (b.stT % 30 === 15) { const a = Math.atan2(P.y - 12 - b.hy, P.x - b.x); eshots.push({ x: b.x + b.face * 8, y: b.hy, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, g: 0, r: 4, t: 200, c: '#60ff60' }); sfx.spit(); }
            if (b.stT <= 0) { b.st = 'sink'; b.stT = 40; }
          } else if (b.st === 'sink') { b.hy += 3; if (b.stT <= 0) { b.st = 'under'; b.stT = 40; } }
        } else {
          b.stT++;
          if (b.st === 'hover') {
            b.x += b.vx * anger; b.y = 70 + Math.sin(b.t * 0.05) * 14;
            if (b.x < ax + 30 || b.x > ax + W - 30) { b.vx = -b.vx; b.x = clamp(b.x, ax + 30, ax + W - 30); }
            b.face = b.vx < 0 ? -1 : 1;
            if (b.stT % 50 === 25) { eshots.push({ x: b.x, y: b.y + 10, vx: 0, vy: 0.5, g: 0.12, r: 5, t: 300, c: '#806050', rock: 1 }); }
            if (b.stT > 220 / anger) { b.st = 'swoop'; b.stT = 0; b.sx = b.x; b.sy = b.y; b.tx = clamp(P.x + (P.x - b.x) * 0.6, ax + 20, ax + W - 20); b.ty = P.y - 14; sfx.roar(); }
          } else if (b.st === 'swoop') {
            const k = b.stT / 70;
            b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * Math.sin(k * Math.PI);
            b.face = b.tx < b.sx ? -1 : 1;
            if (b.stT >= 70) { b.st = 'hover'; b.stT = 0; b.vx = b.face * 1; }
          }
        }
        // contact with weak/body
        if (!P.dead && P.inv <= 0) {
          const rr = bossRects(b);
          for (const r of rr.weak.concat(rr.body)) if (P.x + 5 > r[0] && P.x - 5 < r[2] && P.y > r[1] && P.y - 24 < r[3]) { hurtPlayer(3); break; }
        }
      }
      // ---------- player ----------
      function throwShot(big) {
        const w = P.wpn, f = P.face, x = P.x + f * 8, y = P.y - (P.crouch ? 10 : 18);
        const s = { w, x, y, vx: 0, vy: 0, f, big, t: 0, r: big ? 8 : 4, dmg: WEAP[w].dmg * (big ? 3 : 1), pierce: big || w === 'wheel' || w === 'bone', hitSet: [], bnc: 0 };
        if (w === 'axe') { s.vx = f * 3; s.vy = -2.6; s.g = 0.15; }
        else if (w === 'wheel') { s.vx = f * 2.6; s.vy = 0; s.g = 0.2; s.roll = 1; }
        else if (w === 'bone') { s.vx = f * 4; s.vy = 0; s.g = 0; s.boom = 1; }
        else if (w === 'fire') { s.vx = f * 4.4; s.vy = 0; s.g = 0; }
        else { s.vx = f * 2.8; s.vy = -3; s.g = 0.2; s.bounce = 1; }
        if (big) { s.vx *= 1.1; s.life = 120; }
        shots.push(s);
        big ? sfx.big() : sfx.throw();
        P.throwT = 12;
      }
      function updPlayer() {
        P.anim++;
        if (P.dead) {
          P.dT++; P.vy += 0.18; P.y += P.vy;
          if (P.dT === 120) {
            lives--;
            if (lives > 0) respawn();
            else {
              api.setHiScore(score);
              const over = () => { mode = 'over'; T = 0; sfx.over(); };
              if (api.offerContinue) api.offerContinue(() => { lives = 3; respawn(); }, over); else over();
            }
          }
          return;
        }
        if (P.inv > 0) P.inv--;
        if (P.throwT > 0) P.throwT--;
        const L = api.key('ArrowLeft'), Rr = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown'), sp = api.key('Space');
        if (P.st === 'hurt') {
          P.stT--; moveX(P, P.vx); if (P.stT <= 0) P.st = 'ok';
        } else {
          P.crouch = D && P.onG;
          const spd = P.crouch ? 0 : 1.4;
          if (L) { P.face = -1; moveX(P, -spd); } else if (Rr) { P.face = 1; moveX(P, spd); }
          P.moving = (L || Rr) && !P.crouch;
          const jx = api.pressed('KeyX'), ju = api.pressed('ArrowUp');
          if ((jx || ju) && P.onG) {
            if (jx && D && P.y < 200 && plats.some(p => P.x >= p.x0 && P.x < p.x1 && p.y === P.y)) { P.drop = P.y; P.onG = false; P.vy = 0.5; }
            else if (jx && U) { P.vy = -6.3; P.onG = false; P.spin = true; sfx.spin(); }
            else { P.vy = -5; P.onG = false; P.spin = false; sfx.jump(); }
          }
          if (api.pressed('Space')) { if (shots.filter(s => !s.big).length < 2) throwShot(false); P.charge = 0; }
          if (sp) P.charge++;
          else { if (P.charge >= 45) throwShot(true); P.charge = 0; }
        }
        if (grav(P)) P.spin = false;
        P.x = clamp(P.x, camX + 8, lock ? camX + W - 8 : LEN);
        if (P.y > H + 16) { P.dead = true; P.dT = 60; P.vy = 0; sfx.die(); }
        // vitality drain
        if (++drainT >= 300) { drainT = 0; P.hp--; if (P.hp <= 0) killPlayer(); }
        // items
        for (const it of items) if (!it.got && Math.abs(it.x - P.x) < 12 && Math.abs(it.y - P.y) < 20) {
          it.got = true;
          if (FOOD[it.k]) { const fd = FOOD[it.k]; P.hp = Math.min(MAXHP, P.hp + fd.hp); addScore(fd.pts, it.x, it.y - 16); sfx.eat(); }
          else { P.wpn = it.k; addScore(500, it.x, it.y - 16); sfx.pow(); }
        }
      }
      function shotHit(s, rect) {
        const r = s.r;
        return s.x + r > rect[0] && s.x - r < rect[2] && s.y + r > rect[1] && s.y - r < rect[3];
      }
      function updShots() {
        for (const s of shots) {
          s.t++;
          if (s.boom) {
            s.vx -= s.f * 0.12;
            if (s.t > 30 && Math.abs(P.x - s.x) < 10 && Math.abs(P.y - 16 - s.y) < 16) s.dead = true;
            if (s.t > 30) s.y += (P.y - 16 - s.y) * 0.08;
          }
          s.x += s.vx; s.vy += s.g || 0; s.y += s.vy;
          if (s.roll || s.bounce) {
            const gt = groundTop(s.x);
            if (gt != null && s.y >= gt - s.r && s.y - s.vy < gt - s.r + 2) {
              s.y = gt - s.r;
              if (s.roll) s.vy = 0;
              else { s.vy = -Math.abs(s.vy) * 0.7; if (++s.bnc > 3) s.dead = true; }
            }
            if (solidAt(s.x + Math.sign(s.vx) * s.r, s.y + s.r - 1)) s.dead = true;
          } else if (!s.boom) {
            const gt = groundTop(s.x);
            if (gt != null && s.y > gt) s.dead = true;
          }
          if (s.roll && s.t > 100) s.dead = true;
          if (s.life && s.t > s.life) s.dead = true;
          if (s.x < camX - 20 || s.x > camX + W + 20 || s.y > H || s.y < 0) s.dead = true;
          if (s.dead) continue;
          for (const e of ens) {
            if (e.st === 'flee' || e.gone || s.hitSet.indexOf(e) >= 0) continue;
            if (shotHit(s, enemyRect(e))) {
              e.hp -= s.dmg; e.flash = 8; s.hitSet.push(e); sfx.hit();
              if (e.hp <= 0) enemyDie(e, P.x);
              else if (e.k === 'neander' || e.k === 'raptor') { e.st = 'hurt'; e.stT = 12; e.vx = Math.sign(s.vx || 1) * 1.5; }
              if (!s.pierce) { s.dead = true; break; }
            }
          }
          if (boss && !boss.dying && !s.dead) {
            const rr = bossRects(boss);
            if (rr.weak.some(r => shotHit(s, r))) {
              if (s.hitSet.indexOf(boss) < 0) {
                boss.hp -= s.dmg; boss.flash = 8; sfx.hit(); addScore(50 * s.dmg);
                s.hitSet.push(boss);
                if (boss.hp <= 0) { boss.dying = 1; addScore(10000 * (si + 1), rr.head[0], rr.head[1] - 20); ens.forEach(e => { if (e.st !== 'flee') enemyDie(e, P.x); }); eshots = []; }
              }
              if (!s.big) s.dead = true;
            } else if (rr.body.some(r => shotHit(s, r))) { sfx.tink(); s.dead = true; fx.push({ k: 'chip', x: s.x, y: s.y, vx: -s.vx * 0.3, vy: -2, t: 15, c: '#fff' }); }
          }
        }
        shots = shots.filter(s => !s.dead);
        for (const s of eshots) {
          if (s.delay > 0) { s.delay--; continue; }
          s.x += s.vx; s.vy += s.g; s.y += s.vy; s.t--;
          const gt = groundTop(s.x);
          if (gt != null && s.y > gt) { s.t = 0; if (s.ice || s.rock) { for (let i = 0; i < 4; i++) fx.push({ k: 'chip', x: s.x, y: gt - 2, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5, t: 20, c: s.c }); } }
          if (s.y > H) s.t = 0;
          if (!P.dead && P.inv <= 0 && Math.abs(s.x - P.x) < s.r + 5 && s.y > P.y - (P.crouch ? 14 : 24) - s.r && s.y < P.y + s.r) { s.t = 0; hurtPlayer(2); }
        }
        eshots = eshots.filter(s => s.t > 0);
      }
      function updItems() {
        for (const it of items) {
          it.t--;
          grav(it);
          if (it.y > H + 10) it.t = 0;
        }
        items = items.filter(it => !it.got && it.t > 0);
      }
      function music() {
        if (--musT > 0) return;
        musT = boss ? 8 : 10;
        const mels = [
          [392, 0, 440, 392, 330, 0, 294, 330, 392, 0, 523, 0, 440, 392, 330, 0],
          [523, 494, 440, 0, 392, 440, 494, 0, 523, 0, 587, 523, 494, 0, 440, 0],
          [330, 0, 330, 392, 440, 0, 392, 330, 294, 0, 262, 294, 330, 0, 0, 0],
          [440, 0, 466, 440, 415, 0, 440, 0, 523, 494, 466, 0, 440, 0, 0, 0]
        ];
        const bassL = [98, 98, 131, 131, 110, 110, 147, 98];
        const m = (boss ? [220, 0, 233, 0, 220, 0, 208, 0, 220, 0, 262, 0, 247, 0, 233, 0] : mels[si])[musI % 16];
        if (m) A.tone(m, 0.1, { type: 'square', vol: 0.03 });
        if (musI % 2 === 0) A.tone(boss ? 55 : bassL[(musI >> 1) % 8], 0.15, { type: 'triangle', vol: 0.1 });
        if (musI % 4 === 0) A.noise(0.04, { vol: 0.05, freq: 600 });
        musI++;
      }
      // ---------- main update ----------
      function updGame() {
        T++;
        for (const f of fx) { f.t--; if (f.k === 'chip') { f.x += f.vx; f.y += f.vy; f.vy += 0.15; } if (f.k === 'txt') f.y -= 0.4; }
        fx = fx.filter(f => f.t > 0);
        if (shake > 0) shake--;
        if (phase === 'intro') { phaseT++; if (phaseT > 120) phase = 'play'; return; }
        if (phase === 'clear') {
          phaseT++;
          if (phaseT > 60 && phaseT % 4 === 0 && P.hp > 0 && phaseT < 200) { P.hp--; addScore(100); A.tone(1200, 0.03, { type: 'square', vol: 0.05 }); }
          if (phaseT > 260) { si++; if (si >= STG.length) { phase = 'ending'; phaseT = 0; return; } const wp = P.wpn; startStage(); P.wpn = wp; }
          return;
        }
        if (phase === 'ending') { phaseT++; if (phaseT > 700 || (phaseT > 240 && api.anyPressed('Enter'))) { loop++; si = 0; startStage(); } return; }
        music();
        updPlayer();
        if (!lock) {
          const target = P.x - 100;
          if (target > camX) camX = Math.min(target, LEN - W);
          if (camX >= LEN - W - 0.5 && !boss) mkBoss();
          while (spawns.length && spawns[0].x < camX + W + 10) {
            const sp = spawns.shift();
            const live = ens.filter(e => e.st !== 'flee').length;
            if (live >= 4 + Math.min(3, lvl())) continue;
            if (sp.k === 'ptero') { const e = mkEnemy('ptero', camX + W + 20, sp.carry); e.dir = 1; }
            else if (sp.k === 'boulder') mkEnemy('boulder', camX + W + 16, false);
            else if (sp.k === 'plant') { if (groundTop(sp.x) != null) mkEnemy('plant', sp.x, sp.carry); }
            else { const x = camX + W + 12; if (groundTop(x) != null) mkEnemy(sp.k, x, sp.carry); else if (groundTop(sp.x) != null) mkEnemy(sp.k, sp.x, sp.carry); }
            if (sp.k === 'neander' && lvl() >= 2 && Math.random() < 0.3 && groundTop(camX + 4) != null) { const e = mkEnemy('neander', camX + 4, false); e.face = 1; }
          }
        } else if (boss && !boss.dying && ens.length < 2 && Math.random() < 0.003) {
          const e = mkEnemy(boss.k === 'ptera' ? 'ptero' : 'neander', boss.k === 'ptera' ? camX + W + 20 : camX + (Math.random() < 0.5 ? 10 : W - 10), true);
          e.dir = 1;
        }
        for (const e of ens) { updEnemy(e); if (e.x < camX - 100) e.gone = true; }
        ens = ens.filter(e => !e.gone);
        if (boss) updBoss();
        updShots();
        updItems();
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
      function drawCaveman(ctx, x, y, f, o) {
        // o: {hair, skin, cloth, fr, crouch, spin, throwing, club, flash}
        x = Math.round(x); y = Math.round(y);
        const X = (dx, w) => f > 0 ? x + dx : x - dx - w;
        const fl = o.flash, sk = fl ? '#fff' : o.skin, cl = fl ? '#fff' : o.cloth, hr = fl ? '#fff' : o.hair;
        if (o.spin) {
          ctx.save(); ctx.translate(x, y - 12); ctx.rotate(o.fr * 0.4 * f);
          R(ctx, hr, -6, -8, 12, 5); R(ctx, sk, -5, -3, 10, 8); R(ctx, cl, -5, 3, 10, 5); R(ctx, sk, -6, 6, 4, 3); R(ctx, sk, 2, 6, 4, 3);
          ctx.restore(); return;
        }
        const cr = o.crouch ? 8 : 0, st = (o.fr >> 3) & 1;
        // legs
        if (!o.crouch) { R(ctx, sk, X(-4, 3), y - 8, 3, 7 - st); R(ctx, sk, X(1, 3), y - 8, 3, 6 + st); }
        R(ctx, '#704020', X(-5, 4), y - 2, 4, 2); R(ctx, '#704020', X(1, 5), y - 2, 5, 2);
        // torso + loincloth
        R(ctx, sk, X(-5, 10), y - 19 + cr, 10, 8);
        R(ctx, cl, X(-5, 10), y - 12 + cr, 10, 5); R(ctx, '#000', X(-3, 2), y - 11 + cr, 2, 1); R(ctx, '#000', X(1, 2), y - 10 + cr, 2, 1);
        R(ctx, cl, X(-6, 3), y - 18 + cr, 3, 4);
        // head
        R(ctx, sk, X(-4, 9), y - 27 + cr, 9, 8); R(ctx, '#000', X(3, 1), y - 25 + cr, 1, 2);
        R(ctx, '#d04040', X(2, 3), y - 21 + cr, 3, 1);
        // hair spikes
        R(ctx, hr, X(-6, 12), y - 31 + cr, 12, 5); R(ctx, hr, X(-7, 3), y - 34 + cr, 3, 4); R(ctx, hr, X(-2, 3), y - 36 + cr, 3, 5); R(ctx, hr, X(3, 3), y - 34 + cr, 3, 4);
        R(ctx, hr, X(-6, 3), y - 27 + cr, 3, 5);
        // arm
        if (o.throwing) { R(ctx, sk, X(3, 9), y - 22 + cr, 9, 3); }
        else if (o.club) {
          const up = o.club === 1;
          R(ctx, sk, X(3, 4), y - 18 + cr, 4, 3);
          if (up) { R(ctx, '#8a5a2a', X(4, 3), y - 34, 3, 16); R(ctx, '#6a3a10', X(3, 5), y - 38, 5, 6); }
          else { R(ctx, '#8a5a2a', X(6, 16), y - 17, 16, 3); R(ctx, '#6a3a10', X(18, 6), y - 19, 6, 6); }
        } else R(ctx, sk, X(4, 3), y - 18 + cr, 3, 7);
      }
      function drawEnemy(ctx, e, ox) {
        const x = Math.round(e.x - ox), y = Math.round(e.y), fl = e.flash > 0 && (e.flash & 2), f = e.face;
        const X = (dx, w) => f > 0 ? x + dx : x - dx - w;
        if (e.k === 'neander') {
          if (e.st === 'flee') {
            // the classic run-away with stars over the head
            drawCaveman(ctx, x, y, f, { hair: '#603010', skin: '#c08860', cloth: '#a06020', fr: e.stT * 2, flash: false });
            for (let i = 0; i < 3; i++) { const a = e.stT * 0.2 + i * 2.1; R(ctx, '#ffe040', x + Math.cos(a) * 8 - 1, y - 40 + Math.sin(a) * 3, 3, 3); }
            return;
          }
          const club = e.st === 'attack' ? (e.stT < 14 ? 1 : 2) : 1;
          drawCaveman(ctx, x, y, f, { hair: '#603010', skin: '#c08860', cloth: e.carry ? '#e0e0e0' : '#a06020', fr: e.t, flash: fl, club });
          if (e.carry) { R(ctx, '#d0c0a0', X(-12, 7), y - 24, 7, 9); R(ctx, '#a09070', X(-11, 5), y - 26, 5, 2); }
        } else if (e.k === 'raptor') {
          const c = fl ? '#fff' : (e.st === 'flee' ? '#a0a040' : '#60b048'), d = fl ? '#fff' : '#307020', st = (e.t >> 2) & 1;
          R(ctx, c, X(-8, 14), y - 16, 14, 8); R(ctx, c, X(-14, 8), y - 14, 8, 3); R(ctx, c, X(4, 5), y - 22, 5, 8);
          R(ctx, c, X(6, 9), y - 25, 9, 6); R(ctx, '#fff', X(11, 2), y - 24, 2, 2); R(ctx, '#000', X(12, 1), y - 24, 1, 1);
          R(ctx, '#fff', X(10, 4), y - 20, 4, 1);
          R(ctx, d, X(-4, 3), y - 8, 3, 8 - st * 2); R(ctx, d, X(1, 3), y - 8, 3, 6 + st * 2);
          R(ctx, d, X(-6, 14), y - 15, 14, 1);
          if (e.st === 'flee') for (let i = 0; i < 3; i++) R(ctx, '#ffe040', x - 6 + i * 5, y - 32 + ((e.stT + i * 3) >> 2) % 3, 2, 2);
        } else if (e.k === 'ptero') {
          const c = fl ? '#fff' : '#c06040', d = fl ? '#fff' : '#803020', fr = (e.t >> 3) & 1;
          const dir = e.st === 'flee' ? 1 : -1;
          const XX = (dx, w) => dir > 0 ? x + dx : x - dx - w;
          R(ctx, c, XX(-6, 14), y - 2, 14, 6); R(ctx, c, XX(6, 8), y - 4, 8, 4); R(ctx, d, XX(13, 6), y - 3, 6, 2); R(ctx, d, XX(-10, 6), y - 6, 6, 3);
          R(ctx, '#fff', XX(9, 2), y - 3, 2, 1);
          if (fr) { R(ctx, d, XX(-14, 12), y - 10, 12, 4); R(ctx, d, XX(2, 12), y - 10, 12, 4); }
          else { R(ctx, d, XX(-14, 12), y + 4, 12, 4); R(ctx, d, XX(2, 12), y + 4, 12, 4); }
          if (e.carry && e.st !== 'flee') { R(ctx, '#e0c060', x - 4, y + 6, 8, 6); R(ctx, '#a08030', x - 4, y + 6, 8, 1); }
        } else if (e.k === 'plant') {
          const att = e.st === 'attack' ? Math.sin(Math.min(1, e.stT / 24) * Math.PI) : 0;
          const hx = x + f * att * 22, hy = y - 26 + att * 6;
          ctx.strokeStyle = '#308020'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - f * 6, y - 16, hx, hy); ctx.stroke();
          R(ctx, '#40a030', x - 10, y - 6, 8, 6); R(ctx, '#40a030', x + 2, y - 6, 8, 6);
          const c = fl ? '#fff' : '#e03060';
          R(ctx, c, hx - 7, hy - 7, 14, 12);
          const open = att > 0.3 ? 4 : 1;
          R(ctx, '#300010', hx - 6 + (f > 0 ? 4 : 0), hy - 1, 8, open);
          R(ctx, '#fff', hx - 5 + (f > 0 ? 4 : 0), hy - 1, 2, 2); R(ctx, '#fff', hx - 1 + (f > 0 ? 4 : 0), hy - 1, 2, 2);
          R(ctx, '#ffe040', hx - 2, hy - 6, 4, 3);
        } else if (e.k === 'boulder') {
          ctx.save(); ctx.translate(x, y - 10); ctx.rotate(e.rot || 0);
          ctx.fillStyle = fl ? '#fff' : '#807060'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
          R(ctx, '#605040', -6, -4, 4, 4); R(ctx, '#a09080', 2, -7, 4, 3); R(ctx, '#605040', 1, 3, 5, 3);
          ctx.restore();
        }
      }
      function drawBoss(ctx, b, ox) {
        if (b.dying && (b.dying & 4)) return;
        const fl = b.flash > 0 && (b.flash & 2);
        const rr = bossRects(b);
        if (b.k === 'trex') {
          const x = Math.round(b.x - ox), y = b.y, f = b.face, c = fl ? '#fff' : '#3a9040', d = fl ? '#fff' : '#205828', belly = fl ? '#fff' : '#c0c060';
          const X = (dx, w) => f > 0 ? x + dx : x - dx - w;
          const st = (b.t >> 4) & 1;
          // tail
          R(ctx, c, X(-60, 34), y - 46, 34, 10); R(ctx, c, X(-76, 18), y - 40, 18, 6);
          // body
          R(ctx, c, X(-30, 56), y - 66, 56, 44); R(ctx, belly, X(-6, 28), y - 54, 28, 30);
          // legs
          R(ctx, d, X(-24, 14), y - 26 + st * 2, 14, 26 - st * 2); R(ctx, c, X(4, 14), y - 26, 14, 26);
          R(ctx, '#fff', X(14, 3), y - 3, 3, 3); R(ctx, '#fff', X(-12, 3), y - 3, 3, 3);
          // neck + head
          const hx = Math.round(rr.head[0] - ox), hy = Math.round(rr.head[1]);
          R(ctx, c, X(18, 16), y - 78, 16, 20);
          const H2 = (dx, w) => f > 0 ? hx + dx : hx - dx - w;
          R(ctx, c, H2(-16, 32), hy - 12, 32, 14); R(ctx, c, H2(-14, 26), hy, 26, b.st === 'roar' ? 4 : 8);
          if (b.st === 'roar') { R(ctx, '#a01010', H2(-8, 22), hy + 2, 22, 8); R(ctx, c, H2(-12, 24), hy + 10, 24, 5); for (let i = 0; i < 4; i++) R(ctx, '#fff', H2(-4 + i * 5, 2), hy + 2, 2, 3); }
          R(ctx, '#ffe040', H2(-4, 5), hy - 9, 5, 4); R(ctx, '#000', H2(-2, 2), hy - 8, 2, 3);
          for (let i = 0; i < 4; i++) R(ctx, '#fff', H2(0 + i * 4, 2), hy + 1, 2, 2);
          // tiny arms
          R(ctx, d, X(24, 8), y - 50, 8, 3); R(ctx, d, X(30, 2), y - 50, 2, 6);
          for (let i = 0; i < 5; i++) R(ctx, d, X(-26 + i * 10, 6), y - 70, 6, 5);
        } else if (b.k === 'mammoth') {
          const x = Math.round(b.x - ox), y = b.y, f = b.face, c = fl ? '#fff' : '#8a5030', d = fl ? '#fff' : '#5a3018';
          const X = (dx, w) => f > 0 ? x + dx : x - dx - w;
          const st = b.st === 'charge' ? (b.t >> 2) & 1 : 0, lift = b.st === 'stomp' && (b.stT % 30) < 20 ? 6 : 0;
          R(ctx, c, X(-38, 64), y - 62 - lift, 64, 40); R(ctx, d, X(-38, 64), y - 26 - lift, 64, 4);
          for (let i = 0; i < 8; i++) R(ctx, d, X(-34 + i * 8, 2), y - 60 - lift + (i % 2) * 4, 2, 10);
          R(ctx, d, X(-32, 12), y - 24 + st * 3, 12, 24 - st * 3); R(ctx, d, X(-12, 12), y - 24, 12, 24); R(ctx, d, X(4, 12), y - 24 + (1 - st) * 3, 12, 24 - (1 - st) * 3);
          // head
          R(ctx, c, X(22, 26), y - 66 - lift, 26, 30); R(ctx, d, X(24, 8), y - 64 - lift, 8, 18);
          R(ctx, '#000', X(38, 3), y - 56 - lift, 3, 3);
          // trunk
          R(ctx, c, X(40, 8), y - 38 - lift, 8, 26); R(ctx, c, X(44, 8), y - 16 - lift, 8, 6);
          // tusk
          ctx.strokeStyle = '#f8f0d0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + f * 36, y - 34 - lift); ctx.quadraticCurveTo(x + f * 54, y - 22 - lift, x + f * 60, y - 42 - lift); ctx.stroke();
        } else if (b.k === 'plesio') {
          const x = Math.round(b.x - ox), hy = Math.round(b.hy), c = fl ? '#fff' : '#3070a0', d = fl ? '#fff' : '#204870', f = b.face;
          for (let yy = 236; yy > hy + 8; yy -= 6) { const wob = Math.sin(yy * 0.08 + b.t * 0.05) * 4; R(ctx, c, x - 7 + wob, yy - 6, 14, 7); R(ctx, '#c0d8a0', x - 3 + wob + f * 3, yy - 6, 4, 7); }
          R(ctx, c, x - 12, hy - 10, 24, 18); R(ctx, d, x - 12 + (f > 0 ? 14 : -6), hy - 2, 10, 8);
          R(ctx, '#ff4040', x + f * 4 - 2, hy - 7, 4, 4);
          if (b.st === 'spit') R(ctx, '#300', x + f * 10 - 3, hy + 2, 6, 3);
          // water splash
          if (b.st !== 'under') for (let i = 0; i < 4; i++) R(ctx, '#c0e0ff', x - 14 + i * 8, 198 - ((b.t + i * 5) % 8), 3, 3);
        } else {
          const x = Math.round(b.x - ox), y = Math.round(b.y), f = b.face, c = fl ? '#fff' : '#b04848', d = fl ? '#fff' : '#702828', fr = (b.t >> 3) & 1;
          const X = (dx, w) => f > 0 ? x + dx : x - dx - w;
          const wy = b.st === 'swoop' ? -4 : (fr ? -18 : 6);
          ctx.fillStyle = d; ctx.beginPath(); ctx.moveTo(x - 8, y - 2); ctx.lineTo(x - 50, y + wy); ctx.lineTo(x - 30, y + 6); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + 8, y - 2); ctx.lineTo(x + 50, y + wy); ctx.lineTo(x + 30, y + 6); ctx.fill();
          R(ctx, c, x - 14, y - 8, 28, 14); R(ctx, c, X(12, 14), y - 12, 14, 10); R(ctx, '#e0c060', X(24, 14), y - 8, 14, 4);
          R(ctx, d, X(8, 12), y - 18, 12, 6); R(ctx, '#ffe040', X(18, 3), y - 10, 3, 3);
          R(ctx, d, X(-22, 10), y - 4, 10, 4);
          R(ctx, '#e0c060', x - 6, y + 6, 3, 5); R(ctx, '#e0c060', x + 3, y + 6, 3, 5);
        }
      }
      function drawItem(ctx, it, ox) {
        const x = Math.round(it.x - ox), y = Math.round(it.y);
        if (it.t < 120 && (it.t & 4)) return;
        if (it.k === 'fruit') { R(ctx, '#e03030', x - 4, y - 8, 8, 8); R(ctx, '#40c040', x - 1, y - 11, 3, 3); R(ctx, '#fff', x - 2, y - 7, 2, 2); }
        else if (it.k === 'meat' || it.k === 'bigmeat') {
          const s = it.k === 'bigmeat' ? 2 : 1;
          R(ctx, '#f0f0e0', x - 8 * s, y - 5 * s, 4 * s, 3 * s); R(ctx, '#a04020', x - 5 * s, y - 8 * s, 10 * s, 8 * s); R(ctx, '#d06040', x - 3 * s, y - 7 * s, 4 * s, 3 * s);
        } else {
          R(ctx, '#ffe040', x - 7, y - 14, 14, 14); R(ctx, '#805000', x - 6, y - 13, 12, 12);
          drawWeaponIcon(ctx, it.k, x, y - 7, (T >> 2));
        }
      }
      function drawWeaponIcon(ctx, w, x, y, rot) {
        if (w === 'axe') { R(ctx, '#a06030', x - 1, y - 5, 2, 10); R(ctx, '#c0c0c0', x - 4, y - 5, 4, 5); }
        else if (w === 'wheel') { ctx.fillStyle = '#c08040'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); R(ctx, '#603010', x - 1, y - 1, 3, 3); }
        else if (w === 'bone') { R(ctx, '#f0f0e0', x - 5, y - 1, 10, 2); R(ctx, '#f0f0e0', x - 6, y - 3, 3, 6); R(ctx, '#f0f0e0', x + 3, y - 3, 3, 6); }
        else if (w === 'fire') { R(ctx, '#ff4010', x - 4, y - 3, 8, 6); R(ctx, '#ffe040', x - 2, y - 2, 4, 4); }
        else { R(ctx, '#808890', x - 4, y - 4, 8, 8); R(ctx, '#b0b8c0', x - 3, y - 3, 3, 3); }
      }
      function drawShot(ctx, s, ox) {
        const x = Math.round(s.x - ox), y = Math.round(s.y), k = s.big ? 2 : 1;
        ctx.save(); ctx.translate(x, y); if (s.w !== 'fire') ctx.rotate(s.t * 0.4 * s.f); ctx.scale(k, k);
        if (s.w === 'axe') { R(ctx, '#a06030', -1, -6, 2, 12); R(ctx, '#d0d0d0', -5, -6, 5, 6); R(ctx, '#808080', -5, -6, 1, 6); }
        else if (s.w === 'wheel') { ctx.fillStyle = '#c08040'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); R(ctx, '#603010', -1, -5, 2, 10); R(ctx, '#603010', -5, -1, 10, 2); }
        else if (s.w === 'bone') { R(ctx, '#f0f0e0', -6, -1, 12, 2); R(ctx, '#f0f0e0', -7, -3, 3, 6); R(ctx, '#f0f0e0', 4, -3, 3, 6); }
        else if (s.w === 'fire') { const fl = (s.t >> 1) & 1; R(ctx, '#ff4010', -6, -4, 12, 8); R(ctx, fl ? '#ffe040' : '#ffa020', -3 + s.f * 2, -2, 6, 4); R(ctx, '#ff8020', -s.f * 10 - 2, -2, 4, 4); }
        else { R(ctx, '#808890', -4, -4, 8, 8); R(ctx, '#b0b8c0', -3, -3, 3, 3); }
        ctx.restore();
      }
      function drawBg(ctx) {
        const st = ST();
        const g = ctx.createLinearGradient(0, HUD, 0, H);
        g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, HUD, W, H - HUD);
        // far range
        ctx.fillStyle = st.far;
        const o1 = camX * 0.15;
        for (let i = Math.floor(o1 / 80) - 1; i < Math.floor(o1 / 80) + 5; i++) {
          const h = 50 + hash(i * 3 + si) * 50, x = i * 80 - o1;
          ctx.beginPath(); ctx.moveTo(x - 20, 170); ctx.lineTo(x + 40, 170 - h); ctx.lineTo(x + 100, 170); ctx.fill();
          if (si === 3 && i % 3 === 0) { R(ctx, (T >> 3) & 1 ? '#ff6020' : '#ffa020', x + 34, 170 - h, 12, 4); }
          if (si === 1) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 22, 170 - h * 0.7); ctx.lineTo(x + 40, 170 - h); ctx.lineTo(x + 58, 170 - h * 0.7); ctx.fill(); ctx.fillStyle = st.far; }
        }
        R(ctx, st.far, 0, 170, W, 70);
        // mid layer: trees / ice / swamp trunks / rocks
        const o2 = camX * 0.45;
        for (let i = Math.floor(o2 / 56) - 1; i < Math.floor(o2 / 56) + 7; i++) {
          const x = Math.round(i * 56 - o2), h = hash(i * 7 + si * 3);
          if (si === 0) { R(ctx, '#5a3a18', x + 20, 110, 6, 80); for (let k = 0; k < 5; k++) { ctx.fillStyle = st.hill; ctx.beginPath(); ctx.ellipse(x + 23 + Math.cos(k * 1.3) * 18, 108 + Math.sin(k * 2.1) * 4, 18, 5, Math.cos(k * 1.3) * 0.5, 0, 7); ctx.fill(); } }
          else if (si === 1) { ctx.fillStyle = st.hill; ctx.beginPath(); ctx.moveTo(x, 190); ctx.lineTo(x + 14, 140 - h * 30); ctx.lineTo(x + 30, 190); ctx.fill(); }
          else if (si === 2) { R(ctx, '#2a3018', x + 18, 90 + h * 20, 10, 110); R(ctx, '#384a28', x + 4, 90 + h * 20, 38, 12); for (let k = 0; k < 4; k++) R(ctx, '#506838', x + 6 + k * 9, 102 + h * 20, 2, 12 + k * 3); }
          else { ctx.fillStyle = st.hill; ctx.beginPath(); ctx.moveTo(x, 190); ctx.lineTo(x + 20, 150 - h * 20); ctx.lineTo(x + 46, 190); ctx.fill(); }
        }
      }
      function drawTerrain(ctx) {
        const st = ST(), ox = camX;
        // pits fill
        const pitC = st.pit === 'lava' ? ((T >> 3) & 1 ? '#ff4010' : '#ff7020') : st.pit === 'swamp' ? '#3a5020' : '#2050a0';
        R(ctx, pitC, 0, 214, W, H - 214);
        if (st.pit !== 'lava') for (let i = 0; i < 16; i++) R(ctx, '#ffffff', ((i * 37 + T * 0.5) % W), 216 + (i % 3) * 6, 6, 1);
        for (const sg of segs) {
          if (sg.x1 < ox || sg.x0 > ox + W) continue;
          const x0 = Math.round(sg.x0 - ox), w = sg.x1 - sg.x0;
          R(ctx, st.grd, x0, sg.y, w, H - sg.y);
          for (let yy = sg.y + 8; yy < H; yy += 10) for (let xx = 0; xx < w; xx += 14) if (hash(sg.x0 + xx * 3 + yy) < 0.4) R(ctx, st.dk, x0 + xx + ((yy / 10) & 1) * 6, yy, 6, 3);
          R(ctx, st.top, x0, sg.y, w, 4); R(ctx, st.dk, x0, sg.y + 4, w, 1);
          if (si === 0 || si === 2) for (let xx = 0; xx < w; xx += 5) R(ctx, st.top, x0 + xx, sg.y - 2 - (hash(sg.x0 + xx) * 3 | 0), 2, 3);
          R(ctx, st.dk, x0, sg.y, 1, H - sg.y); R(ctx, st.dk, x0 + w - 1, sg.y, 1, H - sg.y);
        }
        for (const p of plats) {
          if (p.x1 < ox || p.x0 > ox + W) continue;
          const x0 = Math.round(p.x0 - ox), w = p.x1 - p.x0;
          R(ctx, '#7a4a20', x0, p.y, w, 7); R(ctx, '#a06a30', x0, p.y, w, 2); R(ctx, '#5a3010', x0, p.y + 6, w, 1);
          for (let xx = 6; xx < w; xx += 12) R(ctx, '#5a3010', x0 + xx, p.y + 2, 1, 4);
          R(ctx, '#c08040', x0, p.y + 1, 3, 5); R(ctx, '#c08040', x0 + w - 3, p.y + 1, 3, 5);
        }
      }
      function drawHud(ctx) {
        R(ctx, '#000', 0, 0, W, HUD);
        text(ctx, 'JOE', 4, 2, '#60e040'); text(ctx, String(score).padStart(7, '0'), 4, 11, '#fff');
        text(ctx, 'HI', 102, 2, '#ff6040'); text(ctx, String(hi).padStart(7, '0'), 102, 11, '#fff');
        if (P) {
          // vitality bar (segmented)
          for (let i = 0; i < MAXHP; i++) R(ctx, i < P.hp ? (P.hp <= 5 ? ((T >> 3) & 1 ? '#ff2020' : '#ff8080') : i < 7 ? '#ff4040' : i < 14 ? '#ffd040' : '#40e040') : '#303030', 54 + i * 2, 4, 1, 7);
          text(ctx, 'x' + Math.max(0, lives - 1), 54, 12, '#fff');
          R(ctx, '#303030', 186, 2, 16, 16); drawWeaponIcon(ctx, P.wpn, 194, 10, 0);
          if (P.charge > 10) { R(ctx, '#202020', 206, 14, 30, 3); R(ctx, P.charge >= 45 ? ((T >> 1) & 1 ? '#fff' : '#ffe040') : '#ff8020', 206, 14, Math.min(30, P.charge * 30 / 45), 3); }
        }
        text(ctx, 'STAGE ' + (si + 1), W - 4, 3, '#ffb020', 1, 'right');
        if (boss) { R(ctx, '#000', W - 64, 12, 60, 5); R(ctx, '#ff3030', W - 63, 13, Math.max(0, 58 * boss.hp / boss.max), 3); }
      }
      function renderGame(ctx) {
        if (phase === 'ending') {
          R(ctx, '#000', 0, 0, W, H);
          textS(ctx, 'WELL DONE, JOE!', W / 2, 50, '#60e040', 2, 'center');
          text(ctx, 'THE CAVE WOMEN ARE SAFE', W / 2, 90, '#fff', 1, 'center');
          text(ctx, 'AND THE TRIBE FEASTS TONIGHT.', W / 2, 102, '#fff', 1, 'center');
          drawCaveman(ctx, W / 2 - 20, 170, 1, { hair: '#40d030', skin: '#f0b080', cloth: '#3070e0', fr: phaseT, throwing: (phaseT >> 4) & 1 });
          drawCaveman(ctx, W / 2 + 20, 170, -1, { hair: '#e04080', skin: '#f0c090', cloth: '#e0e040', fr: 0 });
          text(ctx, 'BUT THE DINOSAURS ARE BACK...', W / 2, 200, '#ff8080', 1, 'center');
          drawHud(ctx); return;
        }
        ctx.save();
        if (shake) ctx.translate(0, (shake & 2) ? 2 : -2);
        drawBg(ctx); drawTerrain(ctx);
        const ox = camX;
        for (const it of items) drawItem(ctx, it, ox);
        if (boss) drawBoss(ctx, boss, ox);
        for (const e of ens) drawEnemy(ctx, e, ox);
        if (P) {
          if (P.dead) drawCaveman(ctx, P.x - ox, P.y, P.face, { hair: '#40d030', skin: '#f0b080', cloth: '#3070e0', fr: 0, spin: true });
          else if (!(P.inv > 0 && (P.inv & 4))) drawCaveman(ctx, P.x - ox, P.y, P.face, { hair: '#40d030', skin: '#f0b080', cloth: '#3070e0', fr: P.moving ? P.anim : 0, crouch: P.crouch, spin: P.spin && !P.onG ? true : false, throwing: P.throwT > 0, flash: P.st === 'hurt' && (P.stT & 2) });
          if (P.spin && !P.onG && !P.dead) {} // spin drawn above
        }
        for (const s of shots) drawShot(ctx, s, ox);
        for (const s of eshots) {
          const x = Math.round(s.x - ox), y = Math.round(s.y);
          if (s.delay > 0) { R(ctx, 'rgba(0,0,0,0.35)', x - 4, (groundTop(s.x) || 200) - 2, 8, 2); continue; }
          if (s.ice) { R(ctx, '#c0f0ff', x - 2, y - 8, 4, 10); R(ctx, '#fff', x - 1, y - 8, 1, 6); }
          else { R(ctx, s.c, x - s.r, y - s.r, s.r * 2, s.r * 2); R(ctx, '#fff', x - 1, y - 1, 2, 2); }
        }
        for (const f of fx) {
          if (f.k === 'chip') R(ctx, f.c, f.x - ox - 1, f.y - 1, 3, 3);
          else if (f.k === 'boom') { ctx.fillStyle = (f.t & 2) ? '#ffe040' : '#ff6020'; ctx.beginPath(); ctx.arc(f.x - ox, f.y, 4 + (18 - f.t), 0, 7); ctx.fill(); }
          else if (f.k === 'txt') textS(ctx, f.s, f.x - ox, f.y, f.c, 1, 'center');
        }
        ctx.restore();
        if (phase === 'intro') {
          R(ctx, 'rgba(0,0,0,0.5)', 0, 84, W, 50);
          textS(ctx, 'STAGE ' + (si + 1), W / 2, 92, '#ffb020', 2, 'center');
          textS(ctx, ST().name, W / 2, 114, '#fff', 1, 'center');
        }
        if (lock && boss && boss.t < 120 && !boss.dying) textS(ctx, 'WARNING! ' + ST().bname, W / 2, 60, (T >> 3) & 1 ? '#ff4040' : '#ffe040', 1, 'center');
        if (phase === 'clear') { textS(ctx, 'STAGE CLEAR!', W / 2, 70, '#60e040', 2, 'center'); if (phaseT > 60) text(ctx, 'VITALITY BONUS', W / 2, 96, '#fff', 1, 'center'); }
        drawHud(ctx);
      }
      function renderAttract(ctx) {
        const page = Math.floor(atT / 540) % 3, t = atT % 540;
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d04818'); g.addColorStop(1, '#300808');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#200808'; ctx.beginPath(); ctx.moveTo(40, 170); ctx.lineTo(128, 90); ctx.lineTo(216, 170); ctx.fill();
        R(ctx, (T >> 3) & 1 ? '#ff6020' : '#ffa020', 118, 88, 20, 6);
        R(ctx, '#4a3030', 0, 170, W, 70); R(ctx, '#906050', 0, 170, W, 4);
        if (page === 0) {
          // stone-carved logo
          const L1 = 'CAVEMAN', L2 = 'NINJA';
          for (let i = 0; i < L1.length; i++) { R(ctx, '#a09080', 20 + i * 31, 22, 28, 30); R(ctx, '#605040', 20 + i * 31, 48, 28, 4); text(ctx, L1[i], 26 + i * 31, 26, '#302010', 3); }
          for (let i = 0; i < L2.length; i++) { R(ctx, '#60c040', 51 + i * 31, 58, 28, 30); R(ctx, '#307020', 51 + i * 31, 84, 28, 4); text(ctx, L2[i], 57 + i * 31, 62, '#103008', 3); }
          drawCaveman(ctx, 90, 170, 1, { hair: '#40d030', skin: '#f0b080', cloth: '#3070e0', fr: t, throwing: (t >> 5) & 1 });
          drawCaveman(ctx, 116, 170, 1, { hair: '#4080ff', skin: '#f0b080', cloth: '#e04040', fr: t + 8 });
          drawEnemy(ctx, { k: 'raptor', x: 190, y: 170, face: -1, t, st: 'walk', flash: 0 }, 0);
          const ax = 98 + ((t * 2) % 90);
          drawShot(ctx, { w: 'axe', x: ax, y: 150 - Math.sin(((t * 2) % 90) / 90 * Math.PI) * 20, t, f: 1 }, 0);
          text(ctx, 'JOE & MAC', W / 2, 98, '#fff', 1, 'center');
          text(ctx, '\u00a9 1991 DATA EAST', W / 2, 226, '#c0c0c0', 1, 'center');
        } else if (page === 1) {
          textS(ctx, 'HOW TO PLAY', W / 2, 24, '#ffb020', 2, 'center');
          const lines = ['NEANDERTHALS HAVE STOLEN', 'THE CAVE WOMEN!', '', 'SPACE  THROW WEAPON', 'HOLD & RELEASE  POWER THROW', 'X / UP  JUMP', 'UP+X  SPIN JUMP', '', 'YOUR VITALITY DRAINS -', 'EAT FOOD TO STAY ALIVE.'];
          lines.forEach((l, i) => { if (t > i * 10) text(ctx, l, W / 2, 52 + i * 11, i < 2 ? '#fff' : i < 7 ? '#80e0ff' : '#ffe080', 1, 'center'); });
          ['axe', 'wheel', 'bone', 'fire', 'stone'].forEach((w, i) => { R(ctx, '#ffe040', 70 + i * 24, 180, 14, 14); R(ctx, '#805000', 71 + i * 24, 181, 12, 12); drawWeaponIcon(ctx, w, 77 + i * 24, 187, 0); });
        } else {
          textS(ctx, 'TOP CAVEMEN', W / 2, 26, '#ffb020', 2, 'center');
          const rows = [['JOE', Math.max(hi, 50000)], ['MAC', 40000], ['GRG', 30000], ['UGH', 20000], ['DIN', 10000]].sort((a, b) => b[1] - a[1]);
          rows.forEach((r, i) => { text(ctx, (i + 1) + '.', 60, 60 + i * 16, '#ffe040'); text(ctx, r[0], 80, 60 + i * 16, '#fff'); text(ctx, String(r[1]), 196, 60 + i * 16, '#fff', 1, 'right'); });
        }
        const blink = (T >> 4) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) textS(ctx, 'INSERT COIN', W / 2, 200, '#fff', 1, 'center'); }
        else if (api.credits > 0) { if (blink) textS(ctx, 'PUSH START', W / 2, 200, '#ffe040', 1, 'center'); }
        else if (blink) textS(ctx, 'INSERT COIN', W / 2, 200, '#fff', 1, 'center');
        text(ctx, credStr(), W - 4, H - 9, '#ccc', 1, 'right');
        text(ctx, 'HI ' + hi, 4, H - 9, '#ccc');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'attract') { renderAttract(ctx); return; }
        renderGame(ctx);
        if (mode === 'over') { R(ctx, 'rgba(0,0,0,0.5)', 0, 96, W, 44); textS(ctx, 'GAME OVER', W / 2, 108, '#ff4040', 3, 'center'); }
      }
      return { update, render, destroy() { api.setHiScore(score); } };
    }
  });
})();
