// After Burner II (Sega, 1987) \u2014 from-scratch recreation for the MAME32 Game Room.
// Behind-the-jet sprite-scaled pseudo-3D dogfighting: a rolling horizon over sea, desert, canyon and cloud
// stages, throttle control, vulcan cannon, lock-on homing missiles, enemies from front and behind,
// barrel-roll dodges, in-flight refuelling and base landings between stages. All art and sound procedural.
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
    '\u00a9': [14, 17, 23, 25, 23, 17, 14], '*': [0, 4, 21, 14, 21, 4, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '%': [24, 25, 2, 4, 8, 19, 3]
  };
  function text(ctx, s, x, y, col, sc, align) {
    sc = sc || 1; s = String(s).toUpperCase();
    const w = s.length * 6 * sc - sc;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const gl = FONT[s[i]]; if (!gl) continue;
      for (let r = 0; r < 7; r++) {
        const bits = gl[r]; if (!bits) continue;
        for (let c = 0; c < 5; c++) if (bits & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
      }
    }
  }
  function stext(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rr = (a, b) => a + Math.random() * (b - a);
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');

  const W = 320, H = 224, CX = 160, CY = 100, F = 170, PZ = 110, BL = 90, FAR = 2600;

  const THEMES = {
    sea: { sky: ['#1850c0', '#a8dcff'], g1: '#1a56b4', g2: '#2264c4', haze: '#bfe0ff', objs: ['rock', 'island', 'ship', 'rock'], speck: '#d8f0ff' },
    desert: { sky: ['#3070d0', '#ffe4a8'], g1: '#d8a858', g2: '#c99848', haze: '#fff0c8', objs: ['cactus', 'mesa', 'rock', 'cactus'], speck: '#a87838', ground: true },
    canyon: { sky: ['#3c5cb0', '#f8c890'], g1: '#a85c38', g2: '#9a5030', haze: '#f0b080', objs: ['rock'], speck: '#7a3c20', walls: '#8a4428', ground: true },
    clouds: { sky: ['#1440b0', '#c0e0ff'], g1: '#e4ecfa', g2: '#d0dcf2', haze: '#ffffff', objs: ['cloud', 'cloud'], speck: '#ffffff', high: true },
    night: { sky: ['#03041a', '#26306a'], g1: '#0a1636', g2: '#0e1c42', haze: '#3a4a88', objs: ['rock', 'ship'], speck: '#5a78c0', stars: true },
    snow: { sky: ['#6a88c8', '#eaf2ff'], g1: '#eef2f8', g2: '#d6dee8', haze: '#ffffff', objs: ['pine', 'pine', 'rock'], speck: '#a0b0c8', ground: true },
    city: { sky: ['#b84a28', '#ffd080'], g1: '#4a4a54', g2: '#55555f', haze: '#e8a070', objs: ['bldg', 'bldg', 'bldg'], speck: '#88888f', ground: true },
    sunset: { sky: ['#3a1258', '#ff8848'], g1: '#7a2848', g2: '#8a3052', haze: '#ffa060', objs: ['cloud', 'rock'], speck: '#ffb080' },
    base: { sky: ['#2a68d0', '#c8e8ff'], g1: '#4a8a3a', g2: '#428032', haze: '#d0f0d0', objs: ['hangar', 'tower'], speck: '#305a28', runway: true }
  };
  const STAGES = [
    { t: 'sea', n: 'OCEAN' }, { t: 'sea', n: 'COASTLINE' }, { t: 'desert', n: 'DESERT' }, { t: 'canyon', n: 'CANYON' },
    { t: 'clouds', n: 'ABOVE THE CLOUDS' }, { t: 'night', n: 'NIGHT SEA' }, { t: 'snow', n: 'SNOWFIELD' }, { t: 'city', n: 'CITY' },
    { t: 'canyon', n: 'RED CANYON' }, { t: 'sunset', n: 'SUNSET' }, { t: 'desert', n: 'SAND SEA' }, { t: 'night', n: 'MIDNIGHT' },
    { t: 'snow', n: 'ICE CAP' }, { t: 'clouds', n: 'STRATOSPHERE' }, { t: 'city', n: 'ENEMY CAPITAL' }, { t: 'sunset', n: 'FINAL SORTIE' }
  ];
  const INTER = { 2: 'refuel', 4: 'land', 7: 'refuel', 9: 'land', 12: 'refuel', 15: 'land' };
  const MAXMIS = 50;

  ArcadeRegistry.register({
    id: 'afterburner2', title: 'After Burner II', year: 1987, maker: 'Sega',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly (double-tap Left/Right: barrel roll) \u00b7 Space: vulcan \u00b7 X: missile \u00b7 Z/A: throttle up/down \u00b7 Enter: start',
    marquee: { bg: '#081028', fg: '#ff3a1a', accent: '#ffd040' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(1000000);
      let mode = 'title', mt = 0, coinFlash = 0, overT = 0;
      let g = null;

      const snd = {
        gun() { au.noise(0.05, { vol: 0.07, freq: 4000, type: 'highpass' }); },
        missile() { au.noise(0.5, { vol: 0.14, freq: 500, slideTo: 3500, type: 'bandpass' }); },
        lock() { au.tone(1400, 0.04, { type: 'square', vol: 0.07 }); au.tone(1800, 0.04, { type: 'square', vol: 0.07, delay: 0.05 }); },
        boom() { au.noise(0.45, { vol: 0.22, freq: 1600, slideTo: 120 }); au.tone(110, 0.3, { type: 'sawtooth', vol: 0.08, slideTo: 40 }); },
        big() { au.noise(1.0, { vol: 0.3, freq: 1200, slideTo: 60 }); au.tone(80, 0.8, { type: 'sawtooth', vol: 0.12, slideTo: 30 }); },
        warn() { au.tone(880, 0.12, { type: 'square', vol: 0.09 }); au.tone(660, 0.12, { type: 'square', vol: 0.09, delay: 0.14 }); },
        incoming() { au.tone(1200, 0.06, { type: 'square', vol: 0.07 }); },
        roll() { au.noise(0.6, { vol: 0.12, freq: 800, slideTo: 2400, type: 'bandpass' }); },
        engine(sp) { au.noise(0.3, { vol: 0.035, freq: 300 + sp * 40 }); },
        blip() { au.tone(1000, 0.03, { type: 'square', vol: 0.05 }); },
        stage() { au.melody([[330, 0.1], [392, 0.1], [494, 0.1], [659, 0.15], [587, 0.1], [659, 0.35]], { type: 'square', vol: 0.11 }); au.melody([[165, 0.2], [196, 0.2], [247, 0.45]], { type: 'triangle', vol: 0.1 }); },
        clear() { au.melody([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2], [988, 0.08], [1047, 0.4]], { type: 'square', vol: 0.12 }); },
        extra() { au.melody([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.25]], { type: 'square', vol: 0.12 }); },
        screech() { au.noise(0.4, { vol: 0.14, freq: 3000, type: 'highpass' }); }
      };

      for (const k of Object.keys(snd)) { const f = snd[k]; snd[k] = function () { if (!(g && g.demo)) f.apply(null, arguments); }; }

      // ---------------- game state ----------------
      function newRun(demo) {
        g = {
          demo, score: 0, lives: 3, stage: 0, loop: 0, nextExtra: 1000000,
          missiles: MAXMIS, px: 0, py: 150, vx: 0, vy: 0, bank: 0, roll: null, speed: 10, inv: 0,
          camx: 0, camy: 150, hy: 0, wrot: 0, dist: 0, phase: 'intro', pt: 0,
          en: [], em: [], pm: [], bul: [], fx: [], scen: [], nextScen: 0, nextWave: 0,
          lastL: -99, lastR: -99, gunT: 0, warnT: 0, warnTxt: '', banner: null, kills: 0, spawned: 0,
          pendingBehind: null, stageLen: 12000, bonus: 0, msg: null, theme: THEMES.sea, f: 0, bot: { rollCd: 0 }
        };
        startStage();
      }
      function startStage() {
        const st = STAGES[g.stage];
        g.theme = THEMES[st.t];
        g.phase = 'intro'; g.pt = 0; g.dist = 0; g.nextWave = 700; g.nextScen = 0;
        g.stageLen = 11000 + g.stage * 400 + g.loop * 2000;
        g.en = []; g.em = []; g.pm = []; g.bul = []; g.scen = []; g.fx = [];
        g.kills = 0; g.spawned = 0; g.pendingBehind = null; g.warnT = 0;
        g.px = 0; g.py = 150; g.vx = 0; g.vy = 0; g.roll = null; g.speed = 10;
        for (let z = 100; z < FAR; z += 60) spawnScen(z);
        if (!g.demo) snd.stage();
      }
      const level = () => g.stage + g.loop * 10;
      function addScore(n) {
        if (g.demo) return;
        g.score += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += 2000000; snd.extra(); g.msg = { t: 'EXTRA JET!', c: 90 }; }
        if (g.score > hi) hi = g.score;
      }

      // ---------------- scenery ----------------
      function spawnScen(z) {
        const th = g.theme;
        for (let i = 0; i < 3; i++) g.scen.push({ k: 'speck', x: g.px + rr(-900, 900), y: 0, z: z + rr(0, 60) });
        if (th.walls) {
          for (const sd of [-1, 1]) g.scen.push({ k: 'wall', x: sd * rr(300, 330), y: 0, z, sd, h: rr(380, 520) });
          if (Math.random() < 0.3) g.scen.push({ k: 'rock', x: rr(-150, 150), y: 0, z, s: rr(0.6, 1.2) });
          return;
        }
        if (th.runway) {
          if (Math.random() < 0.35) g.scen.push({ k: th.objs[Math.random() * th.objs.length | 0], x: (Math.random() < 0.5 ? -1 : 1) * rr(140, 500), y: 0, z, s: rr(0.8, 1.2) });
          return;
        }
        if (Math.random() < 0.5) {
          const k = th.objs[Math.random() * th.objs.length | 0];
          const o = { k, x: g.px + rr(-1300, 1300), y: 0, z, s: rr(0.7, 1.4), h: rr(120, 240) };
          if (k === 'cloud') o.y = th.high ? rr(-40, 40) : rr(260, 420);
          if (k === 'cloud' && th.high && Math.random() < 0.4) o.y = rr(180, 380);
          g.scen.push(o);
        }
      }

      // ---------------- enemies ----------------
      const ECOLS = [['#a8b0b8', '#5c646c'], ['#8a9a6a', '#4a5a34'], ['#b8a890', '#6a5a44'], ['#9098c0', '#484e78']];
      function mkJet(x, y, z, o) {
        const c = ECOLS[(g.stage + (o.ci || 0)) % ECOLS.length];
        const e = Object.assign({ k: 'jet', x, y, z, vz: 5 + Math.min(4, level() * 0.25), vx: 0, vy: 0, offx: 0, offy: 0, ph: Math.random() * 6, amp: 0, behind: false, fireZ: rr(700, 1100), fired: false, locked: false, dead: false, col: c[0], dark: c[1], hp: 1, shots: 1 + (level() > 6 ? 1 : 0) }, o);
        g.en.push(e); g.spawned++;
        return e;
      }
      function spawnWave() {
        const lv = level(), r = Math.random(), th = g.theme;
        const fireP = Math.min(0.85, 0.35 + lv * 0.05);
        const fireOk = () => Math.random() < fireP;
        if (th.ground && r < 0.22) {
          const bx = g.px + rr(-200, 200);
          for (let i = 0; i < 3; i++) { const e = mkJet(bx + (i - 1) * 90, 0, FAR + i * 120, { k: 'tank', vz: 0, fireZ: rr(500, 900), fired: !fireOk() }); e.ground = true; }
          return;
        }
        if (lv >= 1 && r < 0.42) {
          g.pendingBehind = { t: 100, n: 2 + Math.min(3, lv >> 2) };
          g.warnT = 110; g.warnTxt = 'ENEMY BEHIND'; snd.warn();
          return;
        }
        if (r < 0.68) {
          const n = 3 + Math.min(2, lv >> 2), bx = g.px + rr(-150, 150), by = clamp(g.py + rr(-60, 60), 60, 280);
          for (let i = 0; i < n; i++) {
            const k = i - (n - 1) / 2;
            mkJet(bx + k * 60, by + Math.abs(k) * 12, FAR - Math.abs(k) * 80, { offx: k * 60, offy: Math.abs(k) * 12, fired: !fireOk(), fireZ: rr(650, 1000) + Math.abs(k) * 40 });
          }
          return;
        }
        if (r < 0.84) {
          const sd = Math.random() < 0.5 ? -1 : 1, n = 4 + Math.min(2, lv >> 2), by = clamp(g.py + rr(-40, 60), 60, 280);
          for (let i = 0; i < n; i++) mkJet(g.px - sd * (500 + i * 110), by, 1500 + i * 70, { vx: sd * (7 + lv * 0.2), vz: 2, sweep: true, fired: !fireOk(), fireZ: 1400 });
          return;
        }
        const n = 1 + (lv > 3 ? 1 : 0);
        for (let i = 0; i < n; i++) mkJet(g.px + rr(-200, 200), clamp(g.py + rr(-50, 50), 60, 280), FAR + i * 300, { amp: 80, offx: rr(-80, 80), shots: 2 + (lv >> 3), fireZ: 1200, ci: 2, hp: 3, ace: true });
      }
      function fireEnemyMissile(e) {
        const lv = level();
        g.em.push({ x: e.x, y: e.y + (e.ground ? 10 : 0), z: e.z, vz: e.behind ? -2 : 5 + Math.min(6, lv * 0.35), turn: 1.2 + Math.min(2.2, lv * 0.12), dead: false, t: 0 });
        snd.incoming();
      }

      // ---------------- input / bot ----------------
      function readInput() {
        if (g.demo) return botInput();
        return {
          l: api.key('ArrowLeft'), r: api.key('ArrowRight'), u: api.key('ArrowUp'), d: api.key('ArrowDown'),
          lp: api.pressed('ArrowLeft'), rp: api.pressed('ArrowRight'),
          fire: api.key('Space'), mis: api.pressed('KeyX'), thrUp: api.key('KeyZ'), thrDn: api.key('KeyA'), rollDir: 0
        };
      }
      function botInput() {
        const b = g.bot, o = { l: false, r: false, u: false, d: false, lp: false, rp: false, fire: true, mis: false, thrUp: false, thrDn: false, rollDir: 0 };
        if (b.rollCd > 0) b.rollCd--;
        let tx = 0, ty = 150, threat = null;
        for (const m of g.em) if (!m.dead && m.z > PZ - 10 && m.z < PZ + 380 && Math.abs(m.x - g.px) < 50 && Math.abs(m.y - g.py) < 40) { threat = m; break; }
        let best = null;
        for (const e of g.en) if (!e.dead && !e.behind && !e.ground && e.z > PZ + 150 && e.z < 1800 && (!best || e.z < best.z)) best = e;
        if (best) { tx = best.x; ty = best.y; }
        if (threat) {
          if (b.rollCd === 0 && threat.z < PZ + 200) { o.rollDir = threat.x > g.px ? -1 : 1; b.rollCd = 90; }
          tx = g.px + (threat.x > g.px ? -200 : 200); ty = g.py + (threat.y > g.py ? -100 : 100);
        }
        if (tx < g.px - 12) o.l = true; else if (tx > g.px + 12) o.r = true;
        if (ty < g.py - 10) o.d = true; else if (ty > g.py + 10) o.u = true;
        if (g.en.some(e => e.locked && !e.dead) && (g.f % 20 === 0)) o.mis = true;
        return o;
      }

      // ---------------- update ----------------
      function killEnemy(e, byMissile) {
        e.dead = true; g.kills++;
        g.fx.push({ x: e.x, y: e.y, z: e.z, t: 0, big: e.ace || e.ground });
        addScore(e.ground ? 5000 : (e.ace ? 30000 : 10000));
        snd.boom();
        if (byMissile && Math.random() < 0.3) g.fx.push({ x: e.x + rr(-20, 20), y: e.y + rr(-10, 10), z: e.z + 20, t: -6 });
      }
      function playerHit() {
        if (g.inv > 0 || g.phase === 'dead') return;
        g.phase = 'dead'; g.pt = 0; g.roll = null;
        snd.big();
        g.fx.push({ x: g.px, y: g.py, z: PZ + 5, t: 0, big: true, pl: true });
      }
      function respawn() {
        g.phase = 'play'; g.pt = 0; g.inv = 150; g.px = 0; g.py = 150; g.vx = 0; g.vy = 0; g.speed = 10;
        g.em = []; g.en = g.en.filter(e => e.z > 900); g.pendingBehind = null; g.warnT = 0;
        if (g.missiles < 20) g.missiles = 20;
      }

      function stepFlight(inp, auto) {
        g.f++;
        // throttle
        if (!auto) {
          if (inp.thrUp) g.speed = Math.min(16, g.speed + 0.12);
          else if (inp.thrDn) g.speed = Math.max(6, g.speed - 0.12);
          else g.speed += (10 - g.speed) * 0.004;
        }
        // stick
        if (!auto) {
          const acc = 0.85;
          if (inp.l) g.vx -= acc; if (inp.r) g.vx += acc;
          if (inp.u) g.vy += acc * 0.75; if (inp.d) g.vy -= acc * 0.75;
          // barrel roll: double-tap
          let rd = inp.rollDir || 0;
          if (inp.lp) { if (g.f - g.lastL < 14) rd = -1; g.lastL = g.f; }
          if (inp.rp) { if (g.f - g.lastR < 14) rd = 1; g.lastR = g.f; }
          if (rd && !g.roll) { g.roll = { t: 0, dir: rd }; snd.roll(); g.lastL = g.lastR = -99; }
        }
        if (g.roll) { g.roll.t++; g.vx += g.roll.dir * 0.9; if (g.roll.t >= 42) g.roll = null; }
        g.vx *= 0.87; g.vy *= 0.87;
        g.px += g.vx; g.py += g.vy;
        const lim = g.theme.walls ? 160 : 300;
        if (g.px < -lim) { g.px = -lim; g.vx = 0; } if (g.px > lim) { g.px = lim; g.vx = 0; }
        const minY = g.theme.runway ? 6 : 35;
        if (g.py < minY) { g.py = minY; g.vy = 0; } if (g.py > 300) { g.py = 300; g.vy = 0; }
        g.bank += (clamp(g.vx * 0.09, -0.95, 0.95) - g.bank) * 0.18;
        const rollA = g.roll ? g.roll.dir * Math.PI * 2 * (g.roll.t / 42) : 0;
        g.wrot = -(g.bank * 0.45 + rollA * 0.5);
        g.dist += g.speed;
        g.camx = g.px * 0.65; g.camy = g.py * 0.65 + 0.35 * 150 + 28;
        g.hy += (g.vy * 3.2 - g.hy) * 0.15;
        if (g.inv > 0) g.inv--;
        if (g.f % 18 === 0 && !g.demo) snd.engine(g.speed);
        // scenery
        for (const s of g.scen) s.z -= g.speed;
        g.scen = g.scen.filter(s => s.z > 12);
        while (g.dist + FAR > g.nextScen + FAR) { g.nextScen += 60; spawnScen(FAR); }
      }

      function stepCombat(inp, allowFire) {
        // weapons
        if (allowFire && inp.fire) {
          if (g.gunT <= 0) {
            g.gunT = 4;
            const sd = (g.f >> 2) & 1 ? 1 : -1;
            g.bul.push({ x: g.px + sd * 9, y: g.py - 3, z: PZ + 12, vx: g.vx * 0.3, vy: g.vy * 0.3 });
            if ((g.f & 7) < 4) snd.gun();
          }
        }
        if (g.gunT > 0) g.gunT--;
        if (allowFire && inp.mis && g.missiles > 0) {
          const tg = g.en.filter(e => e.locked && !e.dead && !e.targeted);
          if (tg.length) {
            for (const e of tg) { if (g.missiles <= 0) break; e.targeted = true; launchMissile(e); }
          } else launchMissile(null);
        }
        // bullets
        for (const b of g.bul) {
          b.z += 38; b.x += b.vx; b.y += b.vy;
          for (const e of g.en) {
            if (e.dead || e.ground || e.behind) continue;
            if (Math.abs(e.z - b.z) < 44 && Math.abs(e.x - b.x) < 24 && Math.abs(e.y - b.y) < 15) {
              b.dead = true; e.hp--;
              g.fx.push({ x: b.x, y: b.y, z: e.z, t: 10, spark: true });
              if (e.hp <= 0) killEnemy(e, false);
              break;
            }
          }
          if (!b.dead) for (const m of g.em) if (!m.dead && Math.abs(m.z - b.z) < 44 && Math.abs(m.x - b.x) < 12 && Math.abs(m.y - b.y) < 10) {
            m.dead = true; b.dead = true; addScore(1000); g.fx.push({ x: m.x, y: m.y, z: m.z, t: 4 }); break;
          }
          if (b.z > PZ + 1500) b.dead = true;
        }
        g.bul = g.bul.filter(b => !b.dead);
        // player missiles
        for (const m of g.pm) {
          m.t++; m.vz = Math.min(36, m.vz + 2);
          const e = m.tgt;
          if (e && !e.dead) {
            const dz = Math.max(20, e.z - m.z), steps = dz / m.vz;
            m.vx = clamp((e.x - m.x) / Math.max(1, steps), -24, 24);
            m.vy = clamp((e.y - m.y) / Math.max(1, steps), -24, 24);
          } else m.vy = m.t < 8 ? -1 : m.vy * 0.9;
          m.x += m.vx; m.y += m.vy; m.z += m.vz;
          for (const en of g.en) {
            if (en.dead || en.behind) continue;
            if (Math.abs(en.z - m.z) < 40 && Math.abs(en.x - m.x) < 30 && Math.abs(en.y - m.y) < 26) { m.dead = true; killEnemy(en, true); break; }
          }
          if (m.t > 140 || m.z > FAR + 200) m.dead = true;
        }
        g.pm = g.pm.filter(m => !m.dead);
        // pending attackers from behind
        if (g.pendingBehind && --g.pendingBehind.t <= 0) {
          const n = g.pendingBehind.n; g.pendingBehind = null;
          for (let i = 0; i < n; i++) mkJet(g.px + (i - (n - 1) / 2) * 70 + rr(-30, 30), clamp(g.py + rr(-30, 50), 50, 290), -40 - i * 30, { behind: true, ci: 1, fireZ: rr(500, 900) });
        }
        // enemies
        const lv = level();
        for (const e of g.en) {
          if (e.dead) continue;
          if (e.behind) {
            e.z += 6 + (10 - g.speed) * 0.5;
            e.x += (g.px + (e.offx || 0) - e.x) * 0.01;
            if (e.z > 1300) { e.behind = false; e.turnT = 30; }
            if (e.z > PZ - 20 && e.z < PZ + 20 && Math.abs(e.x - g.px) < 24 && Math.abs(e.y - g.py) < 13 && !g.roll) { killEnemy(e, false); playerHit(); }
            continue;
          }
          if (e.turnT) e.turnT--;
          e.z -= g.speed + e.vz;
          if (e.ground) { /* fixed */ } else if (e.sweep) {
            e.x += e.vx; e.y += Math.sin(g.f * 0.05 + e.ph) * 0.6;
          } else {
            e.ph += 0.04;
            const tx = g.px + e.offx + Math.sin(e.ph) * e.amp, ty = g.py + e.offy + Math.cos(e.ph * 0.7) * e.amp * 0.4;
            const k = e.z > 700 ? 0.012 + lv * 0.001 : 0.004;
            e.x += (tx - e.x) * k; e.y += (clamp(ty, 50, 300) - e.y) * k;
          }
          if (!e.fired && e.z < e.fireZ && e.z > PZ + 250) {
            fireEnemyMissile(e); e.shots--;
            if (e.shots <= 0) e.fired = true; else e.fireZ = e.z - 300;
          }
          // collision with player
          if (!e.ground && Math.abs(e.z - PZ) < (g.speed + e.vz) * 0.6 + 4 && Math.abs(e.x - g.px) < 26 && Math.abs(e.y - g.py) < 14 && !g.roll && g.inv <= 0 && g.phase !== 'dead') {
            killEnemy(e, false); playerHit();
          }
          if (e.z < 15 || Math.abs(e.x - g.px) > 2000) e.dead = true;
        }
        g.en = g.en.filter(e => !e.dead);
        // locking
        const rt = proj(g.px, g.py, PZ + 480);
        g.reticle = rt;
        let nl = 0;
        for (const e of g.en) {
          if (e.locked && (e.z < PZ + 60)) e.locked = false;
          if (e.locked) nl++;
        }
        if (allowFire && g.missiles > 0) for (const e of g.en) {
          if (e.locked || e.behind || nl >= 4) continue;
          if (e.z < PZ + 160 || e.z > 1900) continue;
          const p = proj(e.x, e.y, e.z);
          if (Math.abs(p[0] - rt[0]) < 30 && Math.abs(p[1] - rt[1]) < 26) { e.locked = true; nl++; snd.lock(); }
        }
        g.nLock = nl;
        // enemy missiles
        for (const m of g.em) {
          m.t++;
          m.z -= g.speed + m.vz;
          if (m.z > PZ + 120) {
            m.x += clamp((g.px - m.x) * 0.05, -m.turn, m.turn);
            m.y += clamp((g.py - m.y) * 0.05, -m.turn, m.turn);
          }
          if (m.vz < 0 && m.z > FAR) m.dead = true;
          const reach = (g.speed + m.vz) * 0.6 + 4;
          if (Math.abs(m.z - PZ) < reach && Math.abs(m.x - g.px) < 15 && Math.abs(m.y - g.py) < 11) {
            if (!g.roll && g.inv <= 0 && g.phase !== 'dead') { m.dead = true; playerHit(); }
          }
          if (m.z < 10) m.dead = true;
          if (m.t % 3 === 0 && !m.dead) g.fx.push({ x: m.x, y: m.y, z: m.z + 10, t: 0, smoke: true });
        }
        g.em = g.em.filter(m => !m.dead);
        if (g.em.some(m => m.z < PZ + 500 && m.z > PZ && m.vz >= 0) && g.f % 10 === 0 && !g.demo) snd.incoming();
      }
      function launchMissile(tgt) {
        g.missiles--;
        const sd = (g.missiles & 1) ? 1 : -1;
        g.pm.push({ x: g.px + sd * 13, y: g.py - 6, z: PZ, vx: 0, vy: -1, vz: 8, tgt, t: 0 });
        snd.missile();
      }
      function stepFx() {
        for (const f of g.fx) { f.t++; f.z -= g.speed * (f.smoke ? 1 : 0.5); }
        g.fx = g.fx.filter(f => f.t < (f.smoke ? 24 : f.spark ? 16 : (f.big ? 50 : 34)) && f.z > 15);
      }

      function stepGame() {
        g.pt++;
        if (g.warnT > 0) g.warnT--;
        if (g.msg && --g.msg.c <= 0) g.msg = null;
        const inp = readInput();
        const ph = g.phase;
        if (ph === 'intro') {
          stepFlight(inp, false); stepCombat(inp, true); stepFx();
          if (g.pt > 130) { g.phase = 'play'; g.pt = 0; }
          return;
        }
        if (ph === 'play') {
          stepFlight(inp, false); stepCombat(inp, true); stepFx();
          if (g.dist < g.stageLen) {
            if (g.dist > g.nextWave) { spawnWave(); g.nextWave = g.dist + Math.max(420, 950 - level() * 35); }
          } else if (!g.en.some(e => !e.ground && e.z > PZ) && !g.pendingBehind || g.dist > g.stageLen + 3500) {
            g.phase = 'clear'; g.pt = 0;
            const ratio = g.spawned ? g.kills / g.spawned : 0;
            g.ratio = Math.round(ratio * 100);
            g.bonus = g.ratio * 2000;
            addScore(g.bonus); snd.clear();
          }
          return;
        }
        if (ph === 'clear') {
          stepFlight(inp, false); stepCombat(inp, false); stepFx();
          if (g.pt > 170) nextAfterClear();
          return;
        }
        if (ph === 'refuel') { stepRefuel(); return; }
        if (ph === 'land') { stepLand(); return; }
        if (ph === 'dead') {
          g.f++;
          g.py -= 2 + g.pt * 0.05; g.px += g.vx * 0.5; g.bank += 0.12;
          g.dist += g.speed * 0.6; g.camy = Math.max(40, g.py * 0.65 + 0.35 * 150 + 28);
          for (const s of g.scen) s.z -= g.speed * 0.6;
          g.scen = g.scen.filter(s => s.z > 12);
          while (g.dist > g.nextScen) { g.nextScen += 60; spawnScen(FAR); }
          if (g.pt % 6 === 0 && g.pt < 60) g.fx.push({ x: g.px + rr(-15, 15), y: g.py + rr(-8, 8), z: PZ + rr(0, 20), t: 0, big: g.pt % 18 === 0 });
          for (const m of g.em) m.z -= g.speed + m.vz;
          for (const e of g.en) e.z -= g.speed + (e.behind ? -6 : e.vz);
          g.en = g.en.filter(e => e.z > 15); g.em = g.em.filter(m => m.z > 10);
          stepFx();
          if (g.pt === 130) {
            if (g.demo) { mode = 'title'; mt = 0; newRun(true); return; }
            if (g.lives > 1) { g.lives--; respawn(); }
            else {
              const cg = g;
              const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 320; };
              const cont = () => { if (g !== cg) return; g.lives = 3; respawn(); g.msg = { t: 'CONTINUE!', c: 90 }; };
              if (api.offerContinue) api.offerContinue(cont, end); else end();
            }
          }
        }
      }
      function nextAfterClear() {
        const it = INTER[g.stage];
        g.bul = []; g.pm = []; g.reticle = null;
        if (it === 'refuel') { g.phase = 'refuel'; g.pt = 0; g.tankY = -170; return; }
        if (it === 'land') { g.phase = 'land'; g.pt = 0; g.theme = THEMES.base; g.scen = g.scen.filter(s => s.k === 'speck'); g.en = []; g.em = []; return; }
        advanceStage();
      }
      function advanceStage() {
        g.stage++;
        if (g.stage >= STAGES.length) { g.stage = 0; g.loop++; g.msg = { t: 'MISSION COMPLETE!', c: 200 }; addScore(1000000); }
        if (!g.demo) api.setHiScore(g.score);
        startStage();
      }
      function autopilot(tx, ty) {
        g.vx += clamp((tx - g.px) * 0.02, -0.6, 0.6); g.vy += clamp((ty - g.py) * 0.02, -0.5, 0.5);
      }
      function stepRefuel() {
        autopilot(0, 170); stepFlight({}, true); stepFx();
        g.speed += (9 - g.speed) * 0.05;
        const p = g.pt;
        if (p < 90) g.tankY = -170 + (p / 90) * 110;
        else if (p > 250) g.tankY -= 2.5;
        if (p > 110 && p < 240 && p % 2 === 0 && g.missiles < MAXMIS) { g.missiles++; if (p % 6 === 0) snd.blip(); }
        if (p === 110) au.tone(300, 0.4, { type: 'triangle', vol: 0.1, slideTo: 600 });
        if (p > 300) { g.missiles = MAXMIS; advanceStage(); }
      }
      function stepLand() {
        const p = g.pt;
        if (p < 170) { autopilot(0, p < 60 ? 120 : 6); g.speed += (p < 100 ? 8 : 4 - g.speed) * 0.03; }
        else g.speed = Math.max(0, g.speed - 0.08);
        g.speed = clamp(g.speed, 0, 12);
        stepFlight({}, true); stepFx();
        if (p === 175) snd.screech();
        if (p === 230) { g.bonus = 100000 * (1 + g.loop); addScore(g.bonus); g.missiles = MAXMIS; snd.clear(); }
        if (p > 360) advanceStage();
      }

      // ---------------- projection & drawing ----------------
      function proj(x, y, z) { const s = F / z; return [(x - g.camx) * s, -(y - g.camy) * s + g.hy, s]; }
      function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
      function poly(ctx, c, pts) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath(); ctx.fill();
      }
      function circ(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2); ctx.fill(); }

      function drawGround(ctx) {
        const th = g.theme, hy = g.hy;
        const gr = ctx.createLinearGradient(0, hy - 230, 0, hy);
        gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]);
        ctx.fillStyle = gr; ctx.fillRect(-420, -420, 840, hy + 420);
        if (th.stars) for (let i = 0; i < 50; i++) R(ctx, ((i * 137) % 700) - 350, hy - 20 - ((i * 71) % 260), 1, 1, i % 4 ? '#ffffff' : '#aab4ff');
        if (th === THEMES.sunset) circ(ctx, 60 - g.camx * 0.05, hy - 24, 22, '#ffd070');
        // distant ridge/haze line
        if (th.ground || th.runway) {
          ctx.fillStyle = th.g2; ctx.beginPath(); ctx.moveTo(-420, hy + 1);
          for (let x = -420; x <= 420; x += 10) { const wx = x + g.camx * 0.15; ctx.lineTo(x, hy - 5 - 4 * Math.sin(wx * 0.021) - 3 * Math.sin(wx * 0.057 + 1)); }
          ctx.lineTo(420, hy + 1); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = th.g1; ctx.fillRect(-420, hy, 840, 440);
        const m0 = Math.floor(g.dist / BL) + 1, m1 = Math.floor((g.dist + FAR) / BL);
        let prev = 440;
        ctx.fillStyle = th.g2;
        for (let m = m0; m <= m1; m++) {
          const z = m * BL - g.dist; if (z < 6) continue;
          const y = Math.min(440, g.camy * F / z + hy);
          if (m % 2 === 0 && prev > y) ctx.fillRect(-420, y, 840, prev - y);
          prev = y;
        }
        if (th.runway) drawRunway(ctx);
        const hz = ctx.createLinearGradient(0, hy, 0, hy + 14);
        hz.addColorStop(0, th.haze); hz.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.7; ctx.fillStyle = hz; ctx.fillRect(-420, hy, 840, 14); ctx.globalAlpha = 1;
      }
      function drawRunway(ctx) {
        const zn = 30, zf = FAR;
        const a = proj(-45, 0, zn), b = proj(45, 0, zn), c = proj(45, 0, zf), d = proj(-45, 0, zf);
        poly(ctx, '#55555c', [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]]);
        const m0 = Math.floor(g.dist / BL) + 1;
        for (let m = m0; m < m0 + 28; m++) {
          if (m % 2) continue;
          const z1 = m * BL - g.dist, z2 = z1 + BL * 0.6; if (z1 < 20) continue;
          const p1 = proj(-3, 0, z1), p2 = proj(3, 0, z1), p3 = proj(3, 0, z2), p4 = proj(-3, 0, z2);
          poly(ctx, '#f0f0f0', [p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]]);
        }
        for (const sx of [-42, 40]) {
          const p1 = proj(sx, 0, zn), p2 = proj(sx + 2, 0, zn), p3 = proj(sx + 2, 0, zf), p4 = proj(sx, 0, zf);
          poly(ctx, '#e8e8e8', [p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]]);
        }
      }

      function jetFront(ctx, x, y, s, body, dark, ang, rear, ace) {
        if (s * 40 < 3) { R(ctx, x - 1, y - 1, 2, 2, dark); return; }
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
        poly(ctx, dark, [-21, 3, -3, -1, 3, -1, 21, 3, 21, 4.5, -21, 4.5]);
        poly(ctx, body, [-20, 2.4, -3, -1.6, 3, -1.6, 20, 2.4, 20, 3.4, -20, 3.4]);
        poly(ctx, body, [-10, -0.5, 10, -0.5, 10, 0.8, -10, 0.8]);
        poly(ctx, body, [-4.5, -2, -7, -12, -5.2, -12, -2.6, -2]);
        poly(ctx, body, [4.5, -2, 7, -12, 5.2, -12, 2.6, -2]);
        ctx.fillStyle = dark; ctx.fillRect(-3.5, -4, 7, 8);
        ctx.fillStyle = body; ctx.fillRect(-2.5, -5, 5, 8);
        if (!rear) {
          ctx.fillStyle = '#202830'; ctx.fillRect(-5.5, -0.5, 2.5, 3); ctx.fillRect(3, -0.5, 2.5, 3);
          ctx.fillStyle = '#6ad0ff'; ctx.fillRect(-1.5, -6.5, 3, 2.5);
          ctx.fillStyle = ace ? '#ff3030' : '#e0e040'; ctx.fillRect(-0.8, 1, 1.6, 1.6);
        } else {
          ctx.fillStyle = '#303030'; ctx.fillRect(-3.4, -1, 3, 3); ctx.fillRect(0.4, -1, 3, 3);
          ctx.fillStyle = (g.f & 2) ? '#ffb040' : '#ff6020'; ctx.fillRect(-2.9, -0.5, 2, 2); ctx.fillRect(0.9, -0.5, 2, 2);
        }
        ctx.restore();
      }
      function playerJet(ctx, x, y, ang, sc) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
        // afterburner flames
        const fl = 4 + g.speed * 0.6 + ((g.f & 1) ? 2 : 0);
        for (const sx of [-4.2, 4.2]) {
          circ(ctx, sx, 2, 3.4 + fl * 0.08, 'rgba(255,140,40,.55)');
          circ(ctx, sx, 2, 2.6, '#ffe8a0'); circ(ctx, sx, 2, 1.5, '#ffffff');
        }
        // wings (swept, seen from behind)
        poly(ctx, '#5a6070', [-24, 5, -6, -2, 6, -2, 24, 5, 24, 7, -24, 7]);
        poly(ctx, '#c8ccd4', [-23, 4.6, -6, -2.6, 6, -2.6, 23, 4.6, 23, 5.8, -23, 5.8]);
        // stabilisers
        poly(ctx, '#9aa0ac', [-15, 3, -6, 1, -6, 3.5, -15, 4.4]);
        poly(ctx, '#9aa0ac', [15, 3, 6, 1, 6, 3.5, 15, 4.4]);
        // fuselage + nozzles
        poly(ctx, '#8a909c', [-8, -3, 8, -3, 8.6, 3, 5, 6, -5, 6, -8.6, 3]);
        poly(ctx, '#d8dce4', [-7, -4.5, 7, -4.5, 7.5, 1, -7.5, 1]);
        circ(ctx, -4.2, 2, 3, '#2a2a30'); circ(ctx, 4.2, 2, 3, '#2a2a30');
        circ(ctx, -4.2, 2, 2, (g.f & 2) ? '#ffa040' : '#ff7020'); circ(ctx, 4.2, 2, 2, (g.f & 2) ? '#ffa040' : '#ff7020');
        // canopy
        poly(ctx, '#1c2c48', [-3, -4.5, -1.8, -9, 1.8, -9, 3, -4.5]);
        poly(ctx, '#6aa8e8', [-1.4, -8.4, 0.4, -8.4, -0.4, -5.5, -2, -5.5]);
        // twin tails
        poly(ctx, '#b8bcc6', [-6.5, -3, -10, -17, -8, -17, -4.5, -3]);
        poly(ctx, '#b8bcc6', [6.5, -3, 10, -17, 8, -17, 4.5, -3]);
        poly(ctx, '#d02828', [-9.6, -16, -8.2, -16, -7.6, -13, -9.1, -13]);
        poly(ctx, '#d02828', [9.6, -16, 8.2, -16, 7.6, -13, 9.1, -13]);
        // wing stripes / missiles under wings
        ctx.fillStyle = '#d02828'; ctx.fillRect(-21, 4.6, 3, 1.2); ctx.fillRect(18, 4.6, 3, 1.2);
        if (g.missiles > 0) { ctx.fillStyle = '#f0f0f0'; ctx.fillRect(-14, 6.8, 2, 2); ctx.fillRect(12, 6.8, 2, 2); }
        ctx.restore();
      }
      function drawTanker(ctx, x, y) {
        ctx.save(); ctx.translate(x, y);
        poly(ctx, '#6a7080', [-110, 6, -14, -6, 14, -6, 110, 6, 110, 12, -110, 12]);
        poly(ctx, '#aab0bc', [-108, 5, -14, -8, 14, -8, 108, 5, 108, 9, -108, 9]);
        for (const ex of [-70, -40, 40, 70]) { R(ctx, ex - 6, 6, 12, 10, '#7a808c'); circ(ctx, ex, 11, 4, '#30333a'); }
        R(ctx, -16, -14, 32, 30, '#b8bec8'); R(ctx, -14, 12, 28, 6, '#8a909a');
        poly(ctx, '#aab0bc', [-3, -14, -2, -46, 2, -46, 3, -14]);
        poly(ctx, '#aab0bc', [-40, -4, 40, -4, 34, 0, -34, 0]);
        const ext = clamp((g.pt - 70) / 40, 0, 1) * 34;
        ctx.strokeStyle = '#d0d0d0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(0, 22 + ext); ctx.stroke();
        R(ctx, -4, 20 + ext, 8, 4, '#ffd040');
        if ((g.f >> 3) & 1) { R(ctx, -108, 7, 3, 3, '#ff3030'); R(ctx, 105, 7, 3, 3, '#30ff30'); }
        ctx.restore();
      }
      function drawScen(ctx, o, p) {
        const s = p[2], x = p[0], y = p[1];
        switch (o.k) {
          case 'speck': { const w = Math.max(1, 14 * s); R(ctx, x - w / 2, y, w, Math.max(1, 2 * s), g.theme.speck); break; }
          case 'rock': { const w = 70 * s * (o.s || 1), h = 40 * s * (o.s || 1); poly(ctx, '#5a5048', [x - w / 2, y, x - w * 0.3, y - h * 0.7, x, y - h, x + w * 0.35, y - h * 0.6, x + w / 2, y]); poly(ctx, '#7a6e62', [x - w * 0.3, y - h * 0.7, x, y - h, x + w * 0.05, y - h * 0.3]); if (!g.theme.ground) R(ctx, x - w * 0.55, y - 1, w * 1.1, Math.max(1, 3 * s), '#e8f4ff'); break; }
          case 'island': { const w = 320 * o.s * s, h = 30 * o.s * s; poly(ctx, '#e8d090', [x - w / 2, y, x - w * 0.3, y - h * 0.5, x + w * 0.3, y - h * 0.5, x + w / 2, y]); poly(ctx, '#3a8a30', [x - w * 0.3, y - h * 0.45, x - w * 0.1, y - h, x + w * 0.2, y - h * 0.9, x + w * 0.28, y - h * 0.45]); if (s > 0.15) { R(ctx, x - 1, y - h * 2.2, Math.max(1, 3 * s), h * 1.4, '#7a5a30'); circ(ctx, x, y - h * 2.2, 14 * s, '#2a7a20'); } break; }
          case 'ship': { const w = 150 * o.s * s, h = 16 * o.s * s; poly(ctx, '#6a7078', [x - w / 2, y - h, x + w / 2, y - h, x + w * 0.42, y, x - w * 0.45, y]); R(ctx, x - w * 0.15, y - h * 2.2, w * 0.28, h * 1.3, '#8a9098'); R(ctx, x - w * 0.02, y - h * 3.4, w * 0.05, h * 1.3, '#5a6068'); R(ctx, x - w * 0.6, y - 1, w * 1.2, Math.max(1, 2 * s), '#e8f4ff'); break; }
          case 'cactus': { const h = 60 * o.s * s, w = 10 * o.s * s; R(ctx, x - w / 2, y - h, w, h, '#2a7a30'); R(ctx, x - w * 2, y - h * 0.65, w, h * 0.35, '#2a7a30'); R(ctx, x - w * 2, y - h * 0.4, w * 1.5, w * 0.8, '#2a7a30'); R(ctx, x + w, y - h * 0.8, w, h * 0.4, '#2a7a30'); R(ctx, x + w * 0.5, y - h * 0.5, w * 1.5, w * 0.8, '#2a7a30'); break; }
          case 'mesa': { const w = 260 * o.s * s, h = 80 * o.s * s; poly(ctx, '#a86838', [x - w / 2, y, x - w * 0.35, y - h, x + w * 0.35, y - h, x + w / 2, y]); R(ctx, x - w * 0.35, y - h, w * 0.7, Math.max(1, h * 0.12), '#c88850'); R(ctx, x - w * 0.42, y - h * 0.5, w * 0.84, Math.max(1, h * 0.06), '#985830'); break; }
          case 'pine': { const h = 70 * o.s * s, w = 34 * o.s * s; R(ctx, x - w * 0.08, y - h * 0.2, w * 0.16, h * 0.2, '#4a3020'); poly(ctx, '#1a4a30', [x - w / 2, y - h * 0.18, x, y - h, x + w / 2, y - h * 0.18]); poly(ctx, '#f4f8ff', [x - w * 0.18, y - h * 0.7, x, y - h, x + w * 0.18, y - h * 0.7]); break; }
          case 'bldg': { const w = 80 * o.s * s, h = o.h * s; R(ctx, x - w / 2, y - h, w, h, '#3a3a48'); R(ctx, x - w / 2, y - h, w * 0.15, h, '#2c2c38'); if (s > 0.12) for (let yy = 8 * s; yy < h - 6 * s; yy += 14 * s) for (let xx = -w / 2 + 6 * s; xx < w / 2 - 6 * s; xx += 12 * s) R(ctx, x + xx, y - h + yy, 5 * s, 6 * s, ((xx * 7 + yy * 3) | 0) % 3 ? '#ffd870' : '#6a6a50'); break; }
          case 'cloud': { const r = 60 * o.s * s; ctx.globalAlpha = 0.85; circ(ctx, x, y, r, '#ffffff'); circ(ctx, x - r * 0.9, y + r * 0.2, r * 0.7, '#f0f4ff'); circ(ctx, x + r * 0.9, y + r * 0.25, r * 0.65, '#e8eefa'); ctx.globalAlpha = 1; break; }
          case 'wall': {
            const w = 220 * s, h = o.h * s, x0 = o.sd < 0 ? x - w : x;
            R(ctx, x0, y - h, w, h, '#8a4428');
            const ex = o.sd < 0 ? x - Math.max(1, 14 * s) : x;
            R(ctx, ex, y - h, Math.max(1, 14 * s), h, '#b86a3a');
            for (let k = 1; k < 5; k++) R(ctx, x0, y - h * k / 5, w, Math.max(1, 5 * s), '#743820');
            break;
          }
          case 'hangar': { const w = 120 * o.s * s, h = 40 * o.s * s; R(ctx, x - w / 2, y - h, w, h, '#7a7e70'); poly(ctx, '#9aa090', [x - w / 2, y - h, x, y - h * 1.5, x + w / 2, y - h]); R(ctx, x - w * 0.3, y - h * 0.8, w * 0.6, h * 0.8, '#30322c'); break; }
          case 'tower': { const w = 20 * o.s * s, h = 90 * o.s * s; R(ctx, x - w / 2, y - h, w, h, '#c8c8c0'); R(ctx, x - w, y - h - w, w * 2, w, '#3a5a7a'); break; }
        }
      }
      function drawTank(ctx, x, y, s) {
        const w = 36 * s, h = 12 * s;
        R(ctx, x - w / 2, y - h * 0.5, w, h * 0.5, '#2a2a20');
        R(ctx, x - w * 0.45, y - h, w * 0.9, h * 0.55, '#6a7040');
        R(ctx, x - w * 0.2, y - h * 1.5, w * 0.4, h * 0.5, '#5a6034');
        R(ctx, x - w * 0.04, y - h * 2.6, w * 0.08, h * 1.2, '#3a3e22');
      }

      function drawWorld(ctx) {
        ctx.save();
        ctx.translate(CX, CY); ctx.rotate(g.wrot);
        drawGround(ctx);
        const items = [];
        for (const o of g.scen) if (o.z < FAR + 100) items.push([o.z, 0, o]);
        for (const e of g.en) if (e.z > 20) items.push([e.z, 1, e]);
        for (const m of g.em) if (m.z > 20) items.push([m.z, 2, m]);
        for (const m of g.pm) items.push([m.z, 3, m]);
        for (const b of g.bul) items.push([b.z, 4, b]);
        for (const f of g.fx) items.push([f.z, 5, f]);
        items.push([PZ - 0.5, 6, null]);
        items.sort((a, b) => b[0] - a[0]);
        for (const it of items) {
          const o = it[2], t = it[1];
          if (t === 6) { drawPlayerInWorld(ctx); continue; }
          const p = proj(o.x, o.y, o.z);
          if (p[0] < -460 || p[0] > 460 || p[1] < -460 || p[1] > 460) continue;
          if (t === 0) drawScen(ctx, o, p);
          else if (t === 1) {
            if (o.k === 'tank') drawTank(ctx, p[0], p[1], p[2]);
            else jetFront(ctx, p[0], p[1], p[2], o.col, o.dark, (o.sweep ? -Math.sign(o.vx) * 0.5 : Math.sin(o.ph) * 0.3) + (o.turnT ? o.turnT * 0.2 : 0), o.behind, o.ace);
            if (o.locked && !o.behind) {
              const r = Math.max(7, 26 * p[2]);
              ctx.strokeStyle = (g.f & 4) ? '#ff2020' : '#ffd020'; ctx.lineWidth = 1;
              ctx.strokeRect(Math.round(p[0] - r) + 0.5, Math.round(p[1] - r) + 0.5, Math.round(r * 2), Math.round(r * 2));
            }
          } else if (t === 2) {
            const r = Math.max(1.5, 5 * p[2]);
            circ(ctx, p[0], p[1], r * 1.6, 'rgba(255,90,20,.45)'); circ(ctx, p[0], p[1], r, (g.f & 2) ? '#ffd040' : '#ff6020'); circ(ctx, p[0], p[1], r * 0.45, '#ffffff');
          } else if (t === 3) {
            const q = proj(o.x - o.vx * 2, o.y - o.vy * 2, Math.max(15, o.z - 50));
            ctx.strokeStyle = 'rgba(230,230,230,.7)'; ctx.lineWidth = Math.max(1, 3 * p[2]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
            circ(ctx, p[0], p[1], Math.max(1, 2.2 * p[2]), '#ffffff');
          } else if (t === 4) {
            const q = proj(o.x, o.y, Math.max(15, o.z - 30));
            ctx.strokeStyle = '#ffe860'; ctx.lineWidth = Math.max(1, 2 * p[2]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
          } else if (t === 5) {
            if (o.t < 0) continue;
            if (o.smoke) { ctx.globalAlpha = 0.5 * (1 - o.t / 24); circ(ctx, p[0], p[1], (3 + o.t * 0.4) * p[2], '#d0d0d0'); ctx.globalAlpha = 1; continue; }
            if (o.spark) { circ(ctx, p[0], p[1], Math.max(1, 4 * p[2]), '#ffffa0'); continue; }
            const life = o.big ? 50 : 34, k = o.t / life, rad = (o.big ? 50 : 30) * p[2] * (0.3 + k);
            ctx.globalAlpha = 1 - k * 0.8;
            circ(ctx, p[0], p[1], rad, k < 0.3 ? '#ffffff' : k < 0.6 ? '#ffc040' : '#c04018');
            circ(ctx, p[0] + rad * 0.4, p[1] - rad * 0.3, rad * 0.55, k < 0.5 ? '#ffe080' : '#802010');
            if (k > 0.4) circ(ctx, p[0] - rad * 0.3, p[1] - rad * 0.5, rad * 0.5, '#404040');
            ctx.globalAlpha = 1;
          }
        }
        if (g.phase === 'refuel') drawTanker(ctx, proj(0, 0, PZ)[0], g.tankY + (g.f & 16 ? 1 : 0));
        // reticle
        if ((g.phase === 'play' || g.phase === 'intro') && g.reticle) {
          const rt = g.reticle, c = g.nLock ? '#ff3030' : '#40ff60';
          ctx.strokeStyle = c; ctx.lineWidth = 1;
          const x = Math.round(rt[0]) + 0.5, y = Math.round(rt[1]) + 0.5;
          ctx.beginPath();
          ctx.moveTo(x - 12, y - 8); ctx.lineTo(x - 12, y - 12); ctx.lineTo(x - 8, y - 12);
          ctx.moveTo(x + 12, y - 8); ctx.lineTo(x + 12, y - 12); ctx.lineTo(x + 8, y - 12);
          ctx.moveTo(x - 12, y + 8); ctx.lineTo(x - 12, y + 12); ctx.lineTo(x - 8, y + 12);
          ctx.moveTo(x + 12, y + 8); ctx.lineTo(x + 12, y + 12); ctx.lineTo(x + 8, y + 12);
          ctx.stroke();
          R(ctx, x - 1, y - 1, 2, 2, c);
        }
        ctx.restore();
      }
      function drawPlayerInWorld(ctx) {
        if (g.phase === 'dead' && g.pt > 34) return;
        if (g.inv > 0 && (g.f & 4) && g.phase === 'play') return;
        const p = proj(g.px, g.py, PZ);
        const rollA = g.roll ? g.roll.dir * Math.PI * 2 * (g.roll.t / 42) : 0;
        const ang = g.bank + rollA - g.wrot;
        // shadow on the ground
        if (g.theme.ground || g.theme.runway || g.theme === THEMES.sea) {
          const sp = proj(g.px, 0, PZ);
          if (sp[1] < 400) { ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sp[0], sp[1], 24 * sp[2] * 0.9, 3 * sp[2], 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        }
        playerJet(ctx, p[0], p[1], ang, p[2] * 0.95);
        if (g.phase === 'dead' && g.pt % 4 < 2) circ(ctx, p[0], p[1], 10, '#ff8020');
      }

      function drawHUD(ctx) {
        stext(ctx, 'SCORE', 6, 4, '#40c0ff'); stext(ctx, pad(g.score, 8), 6, 13, '#ffffff');
        stext(ctx, 'TOP', W / 2, 4, '#ff6040', 1, 'center'); stext(ctx, pad(Math.max(hi, g.score), 8), W / 2, 13, '#ffffff', 1, 'center');
        stext(ctx, 'STAGE', W - 6, 4, '#ffd040', 1, 'right'); stext(ctx, String(g.stage + 1 + g.loop * STAGES.length).padStart(2, '0'), W - 6, 13, '#ffffff', 1, 'right');
        // missiles
        R(ctx, 4, H - 28, 72, 24, 'rgba(0,0,0,.45)');
        stext(ctx, 'MISSILE', 8, H - 25, '#ffd040');
        stext(ctx, pad(g.missiles, 2), 8, H - 15, g.missiles < 10 ? ((g.f & 8) ? '#ff3030' : '#ffffff') : '#ffffff', 1);
        for (let i = 0; i < Math.min(8, Math.ceil(g.missiles / 6)); i++) R(ctx, 26 + i * 6, H - 15, 3, 7, '#e8e8e8');
        // speed
        R(ctx, W - 76, H - 28, 72, 24, 'rgba(0,0,0,.45)');
        stext(ctx, 'SPEED', W - 72, H - 25, '#40c0ff');
        stext(ctx, String(Math.round(g.speed * 60)), W - 8, H - 25, '#ffffff', 1, 'right');
        R(ctx, W - 72, H - 14, 64, 5, '#202838'); R(ctx, W - 72, H - 14, 64 * clamp((g.speed - 4) / 12, 0, 1), 5, g.speed > 13 ? '#ff6020' : '#40e060');
        // lives
        for (let i = 0; i < Math.min(6, g.lives - 1); i++) { const x = 84 + i * 12; poly(ctx, '#d0d4dc', [x, H - 6, x + 5, H - 14, x + 10, H - 6, x + 5, H - 8]); }
        // stage progress
        if (g.phase === 'play' || g.phase === 'intro') { R(ctx, W / 2 - 40, H - 6, 80, 3, '#203048'); R(ctx, W / 2 - 40, H - 6, 80 * clamp(g.dist / g.stageLen, 0, 1), 3, '#40c0ff'); }
        if (g.nLock && (g.phase === 'play' || g.phase === 'intro') && (g.f & 8)) stext(ctx, 'LOCK ON', W / 2, H - 20, '#ff3030', 1, 'center');
        if (g.warnT > 0 && (g.f & 8)) {
          R(ctx, W / 2 - 52, 30, 104, 22, 'rgba(160,0,0,.75)');
          ctx.strokeStyle = '#ffd040'; ctx.strokeRect(W / 2 - 51.5, 30.5, 103, 21);
          stext(ctx, 'WARNING', W / 2, 33, '#ffffff', 1, 'center'); stext(ctx, g.warnTxt, W / 2, 43, '#ffd040', 1, 'center');
        }
        const inc = g.em.some(m => m.z < PZ + 520 && m.z > PZ && m.vz >= 0);
        if (inc && (g.f & 4) && g.phase === 'play') stext(ctx, 'MISSILE ALERT', W / 2, 58, '#ff8040', 1, 'center');
        if (g.phase === 'intro') {
          const st = STAGES[g.stage];
          stext(ctx, 'STAGE ' + (g.stage + 1 + g.loop * STAGES.length), W / 2, 72, '#ffd040', 2, 'center');
          stext(ctx, st.n, W / 2, 92, '#ffffff', 1, 'center');
          if (g.f & 16) stext(ctx, 'GET READY!', W / 2, 106, '#40ff60', 1, 'center');
        }
        if (g.phase === 'clear') {
          stext(ctx, 'STAGE ' + (g.stage + 1 + g.loop * STAGES.length) + ' CLEAR', W / 2, 62, '#ffd040', 2, 'center');
          stext(ctx, 'SHOT DOWN  ' + g.kills, W / 2, 86, '#ffffff', 1, 'center');
          stext(ctx, 'HIT RATIO  ' + g.ratio + '%', W / 2, 98, '#ffffff', 1, 'center');
          stext(ctx, 'BONUS  ' + g.bonus, W / 2, 112, '#40ff60', 1, 'center');
        }
        if (g.phase === 'refuel') {
          if (g.f & 16) stext(ctx, 'REFUELING', W / 2, 150, '#ffd040', 2, 'center');
          stext(ctx, 'MISSILES RESUPPLIED', W / 2, 170, '#ffffff', 1, 'center');
        }
        if (g.phase === 'land') {
          if (g.pt < 200) { if (g.f & 16) stext(ctx, 'APPROACHING BASE', W / 2, 60, '#ffd040', 1, 'center'); }
          else { stext(ctx, 'LANDING SUCCESSFUL', W / 2, 56, '#40ff60', 2, 'center'); stext(ctx, 'BONUS ' + g.bonus, W / 2, 78, '#ffffff', 1, 'center'); stext(ctx, 'REARMED AND REFUELED', W / 2, 90, '#ffd040', 1, 'center'); }
        }
        if (g.msg) stext(ctx, g.msg.t, W / 2, 124, '#ffd040', 1, 'center');
      }

      function drawTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,20,.45)'; ctx.fillRect(0, 0, W, H);
        const y0 = 30;
        stext(ctx, 'AFTER', W / 2 - 4, y0, '#ffffff', 4, 'center');
        stext(ctx, 'BURNER', W / 2 - 18, y0 + 32, '#ff4020', 4, 'center');
        stext(ctx, 'II', W / 2 + 92, y0 + 26, '#ffd040', 5, 'center');
        R(ctx, 40, y0 + 64, 240, 2, '#ff4020'); R(ctx, 60, y0 + 68, 200, 1, '#ffd040');
        const t = mt % 600;
        if (t < 300) {
          stext(ctx, 'VULCAN CANNON  - SPACE', W / 2, 114, '#c0e0ff', 1, 'center');
          stext(ctx, 'LOCK-ON MISSILE - X', W / 2, 125, '#c0e0ff', 1, 'center');
          stext(ctx, 'THROTTLE - Z / A', W / 2, 136, '#c0e0ff', 1, 'center');
          stext(ctx, 'BARREL ROLL - DOUBLE TAP', W / 2, 147, '#c0e0ff', 1, 'center');
        } else {
          stext(ctx, 'ENEMY JET     10000', W / 2, 114, '#ffffff', 1, 'center');
          stext(ctx, 'ACE FIGHTER   30000', W / 2, 125, '#ffffff', 1, 'center');
          stext(ctx, 'GROUND TARGET  5000', W / 2, 136, '#ffffff', 1, 'center');
          stext(ctx, 'EXTRA JET AT 1000000', W / 2, 147, '#40ff60', 1, 'center');
        }
        stext(ctx, 'HI SCORE ' + pad(hi, 8), W / 2, 162, '#ffd040', 1, 'center');
        if (coinFlash > 0) { if (coinFlash & 8) stext(ctx, 'INSERT COIN', W / 2, 180, '#ff4040', 1, 'center'); }
        else if ((mt >> 5) & 1) stext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 180, '#ffffff', 1, 'center');
        stext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 194, '#aaaaaa', 1, 'center');
        stext(ctx, '\u00a9 1987 SEGA', W / 2, 210, '#8090b0', 1, 'center');
      }

      // ---------------- host hooks ----------------
      function update() {
        mt++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (!g || !g.demo) newRun(true);
          stepGame();
          if (mt > 2400) { mt = 0; newRun(true); }
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'game'; newRun(false); }
            else { coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); }
          }
          return;
        }
        if (mode === 'over') {
          if (--overT <= 0 || (overT < 220 && api.anyPressed('Enter'))) { mode = 'title'; mt = 0; g = null; }
          return;
        }
        stepGame();
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (!g) { drawTitleOnly(ctx); return; }
        drawWorld(ctx);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawHUD(ctx);
        if (mode === 'over') {
          R(ctx, 0, 90, W, 40, 'rgba(0,0,0,.6)');
          stext(ctx, 'GAME OVER', W / 2, 100, '#ff4040', 2, 'center');
        }
      }
      function drawTitleOnly(ctx) { R(ctx, 0, 0, W, H, '#081028'); drawTitle(ctx); }

      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
