// Carrier Air Wing (Capcom, 1990) \u2014 from-scratch recreation for the MAME32 Game Room.
// Side-scrolling jet shooter: pick one of three carrier jets, catapult off the deck, fight jets, helicopters,
// ships and ground defences with the cannon and a stock of special weapons, beat the mission boss, then land
// back on the carrier and spend your budget re-arming. All art and sound procedural.
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
    '$': [4, 15, 20, 14, 5, 30, 4], '#': [10, 31, 10, 10, 31, 10, 0]
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

  const W = 384, H = 224, GY = H - 34, TOP = 22;

  const PLANES = [
    { n: 'F-14', full: 'F-14 SWING WING', spd: 2.4, hp: 4, rate: 6, dmg: 1, col: '#b8c0cc', dark: '#5a6474', acc: '#2a4a8a', desc: ['BALANCED FIGHTER', 'LONG RANGE MISSILES'], st: [3, 3, 3],
      ammo: { SIDEWINDER: 20, PHOENIX: 4, ROCKET: 0, BOMB: 8, NAPALM: 0 }, kind: 0 },
    { n: 'F/A-18', full: 'F/A-18 STRIKE', spd: 2.9, hp: 3, rate: 4, dmg: 1, col: '#c8ccd2', dark: '#6a707c', acc: '#c02828', desc: ['FAST AND AGILE', 'RAPID FIRE CANNON'], st: [5, 2, 4],
      ammo: { SIDEWINDER: 24, PHOENIX: 0, ROCKET: 16, BOMB: 6, NAPALM: 0 }, kind: 1 },
    { n: 'A-6', full: 'A-6 HEAVY ATTACK', spd: 1.9, hp: 6, rate: 7, dmg: 1.5, col: '#98a68a', dark: '#4a5a3c', acc: '#d0a020', desc: ['HEAVY ARMOR', 'GROUND ATTACK'], st: [2, 5, 2],
      ammo: { SIDEWINDER: 6, PHOENIX: 0, ROCKET: 10, BOMB: 20, NAPALM: 8 }, kind: 2 }
  ];
  const WEAP = ['SIDEWINDER', 'PHOENIX', 'ROCKET', 'BOMB', 'NAPALM'];
  const SHOP = [
    { n: 'SIDEWINDER X10', w: 'SIDEWINDER', q: 10, c: 3000 }, { n: 'PHOENIX X3', w: 'PHOENIX', q: 3, c: 5000 },
    { n: 'ROCKET POD X10', w: 'ROCKET', q: 10, c: 4000 }, { n: 'BOMB X10', w: 'BOMB', q: 10, c: 3000 },
    { n: 'NAPALM X5', w: 'NAPALM', q: 5, c: 5000 }, { n: 'ARMOR REPAIR', w: 'REPAIR', c: 4000 },
    { n: 'CANNON UPGRADE', w: 'GUN', c: 8000 }, { n: 'LAUNCH!', w: 'GO', c: 0 }
  ];
  const MISSIONS = [
    { n: 'OPERATION SEA LANCE', sky: ['#2a6ad8', '#a8d8ff'], far: '#6a8ab8', terr: [[0, 'sea']], boss: 'bomber' },
    { n: 'DESERT THUNDER', sky: ['#3a78d0', '#ffe0a0'], far: '#b08050', terr: [[0, 'sea'], [1400, 'beach'], [1600, 'desert']], boss: 'fortress' },
    { n: 'IRON FLEET', sky: ['#3050a0', '#d0c8e0'], far: '#5a6880', terr: [[0, 'sea']], boss: 'battleship' },
    { n: 'MOUNTAIN STORM', sky: ['#4060a8', '#e8d0b0'], far: '#6a5a6a', terr: [[0, 'sea'], [900, 'beach'], [1100, 'grass'], [3000, 'rock']], boss: 'gunship' },
    { n: 'NIGHT STRIKE', sky: ['#05061c', '#2a2c60'], far: '#1a1a34', terr: [[0, 'sea'], [1200, 'city']], boss: 'fortress', night: true },
    { n: 'ARCTIC SHIELD', sky: ['#6a8ac8', '#f0f6ff'], far: '#a8b8d0', terr: [[0, 'ice'], [1800, 'snow']], boss: 'gunship' },
    { n: 'TYPHOON', sky: ['#303848', '#8890a0'], far: '#404858', terr: [[0, 'sea']], boss: 'battleship', storm: true },
    { n: 'FINAL STRIKE', sky: ['#401818', '#ff9050'], far: '#5a2828', terr: [[0, 'sea'], [800, 'beach'], [1000, 'desert'], [2400, 'base']], boss: 'final' }
  ];
  const TERR = {
    sea: { a: '#1a4aa0', b: '#2458b0', top: '#80b8ff', water: true },
    ice: { a: '#2a5aa8', b: '#e8f0f8', top: '#ffffff', water: true, ice: true },
    beach: { a: '#e0c888', b: '#d0b878', top: '#f8e8b0' },
    desert: { a: '#d0a058', b: '#c09048', top: '#e8c078' },
    grass: { a: '#3a8a30', b: '#347c2a', top: '#5aaa48' },
    rock: { a: '#7a6a5a', b: '#6a5a4c', top: '#9a8a78' },
    city: { a: '#3a3a44', b: '#33333c', top: '#5a5a66' },
    snow: { a: '#e8eef6', b: '#d8e0ec', top: '#ffffff' },
    base: { a: '#5a5a4a', b: '#505042', top: '#7a7a68' }
  };

  ArcadeRegistry.register({
    id: 'carrierairwing', title: 'Carrier Air Wing', year: 1990, maker: 'Capcom',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: fly \u00b7 Space: cannon \u00b7 X: special weapon \u00b7 Z (or Enter in flight): change special \u00b7 Enter: start',
    marquee: { bg: '#0a1a3a', fg: '#f0f0f0', accent: '#ff3020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(200000);
      let mode = 'title', mt = 0, coinFlash = 0, overT = 0;
      let g = null;

      const snd = {
        gun() { au.tone(1600, 0.03, { type: 'square', vol: 0.04, slideTo: 900 }); },
        missile() { au.noise(0.35, { vol: 0.12, freq: 600, slideTo: 3000, type: 'bandpass' }); },
        bomb() { au.tone(1200, 0.5, { type: 'triangle', vol: 0.06, slideTo: 300 }); },
        hit() { au.tone(220, 0.04, { type: 'square', vol: 0.05 }); },
        boom() { au.noise(0.35, { vol: 0.2, freq: 1500, slideTo: 150 }); },
        big() { au.noise(1.0, { vol: 0.3, freq: 1200, slideTo: 50 }); au.tone(90, 0.8, { type: 'sawtooth', vol: 0.1, slideTo: 30 }); },
        item() { au.melody([[880, 0.05], [1175, 0.05], [1568, 0.1]], { type: 'square', vol: 0.1 }); },
        hurt() { au.noise(0.2, { vol: 0.2, freq: 3000, slideTo: 300 }); au.tone(200, 0.2, { type: 'sawtooth', vol: 0.1, slideTo: 80 }); },
        warn() { au.tone(988, 0.15, { type: 'square', vol: 0.08 }); au.tone(740, 0.15, { type: 'square', vol: 0.08, delay: 0.17 }); },
        sel() { au.tone(660, 0.04, { type: 'square', vol: 0.07 }); },
        buy() { au.melody([[523, 0.05], [784, 0.08]], { type: 'square', vol: 0.09 }); },
        no() { au.tone(110, 0.15, { type: 'square', vol: 0.1 }); },
        launch() { au.noise(1.2, { vol: 0.16, freq: 300, slideTo: 3000, type: 'bandpass' }); },
        mission() { au.melody([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.24], [659, 0.12], [784, 0.4]], { type: 'square', vol: 0.11 }); au.melody([[196, 0.36], [262, 0.36], [196, 0.4]], { type: 'triangle', vol: 0.1 }); },
        clear() { au.melody([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3], [988, 0.1], [1047, 0.5]], { type: 'square', vol: 0.12 }); },
        boss() { au.melody([[147, 0.2], [139, 0.2], [147, 0.2], [175, 0.4]], { type: 'sawtooth', vol: 0.08 }); }
      };
      for (const k of Object.keys(snd)) { const f = snd[k]; snd[k] = function () { if (!(g && g.demo)) f.apply(null, arguments); }; }

      // ---------------- state ----------------
      function newRun(demo, planeIdx) {
        const P = PLANES[planeIdx || 0];
        g = {
          demo, P, score: 0, lives: 3, hp: P.hp, gun: 1, ammo: Object.assign({}, P.ammo), sel: 0,
          mission: 0, loop: 0, phase: 'launch', pt: 0, scroll: 0, speed: 1.6, px: 70, py: GY - 26, vx: 0, vy: 0,
          inv: 0, dead: 0, en: [], eb: [], pb: [], ps: [], fx: [], items: [], fires: [], boss: null,
          nextWave: 300, budget: 0, kills: 0, f: 0, gunT: 0, spT: 0, msg: null, warnT: 0, shopSel: 0, shopT: 0,
          carrierX: 0, nextExtra: 100000, tally: null, bot: { t: 0 }
        };
        selectFirstWeapon();
        startMission();
      }
      function selectFirstWeapon() { for (let i = 0; i < WEAP.length; i++) if (g.ammo[WEAP[i]] > 0) { g.sel = i; return; } }
      function curMission() { return MISSIONS[g.mission]; }
      const lvl = () => g.mission + g.loop * 6;
      function startMission() {
        g.phase = 'launch'; g.pt = 0; g.scroll = 0; g.speed = 0; g.en = []; g.eb = []; g.pb = []; g.ps = []; g.items = []; g.fires = [];
        g.boss = null; g.nextWave = 260; g.kills = 0; g.carrierX = 30; g.px = 70; g.py = GY - 22; g.vx = 0; g.vy = 0; g.inv = 0; g.dead = 0;
        g.misLen = 4200 + g.mission * 300 + g.loop * 600; g.earned = 0;
        snd.mission();
      }
      function addScore(n) {
        if (g.demo) return;
        g.score += n; g.budget += n; g.earned += n;
        if (g.score >= g.nextExtra) { g.lives++; g.nextExtra += g.nextExtra < 300000 ? 200000 : 300000; g.msg = { t: '1UP!', c: 90 }; snd.item(); }
        if (g.score > hi) hi = g.score;
      }
      function terrainAt(wx) {
        const tr = curMission().terr; let t = tr[0][1];
        for (const s of tr) if (wx >= s[0]) t = s[1];
        return TERR[t];
      }

      // ---------------- enemies ----------------
      const AIR = { jet: { hp: 1, r: 8, sc: 300 }, ace: { hp: 3, r: 9, sc: 800 }, heli: { hp: 5, r: 10, sc: 600 }, cargo: { hp: 4, r: 12, sc: 1000 }, back: { hp: 1, r: 8, sc: 500 } };
      const GND = { ship: { hp: 9, r: 18, sc: 2000 }, pt: { hp: 3, r: 10, sc: 600 }, aa: { hp: 3, r: 8, sc: 600 }, tank: { hp: 3, r: 9, sc: 500 }, sam: { hp: 4, r: 9, sc: 800 }, bldg: { hp: 6, r: 14, sc: 1000 } };
      function mkAir(t, x, y, o) {
        const d = AIR[t];
        const e = Object.assign({ t, x, y, vx: -2.2 - lvl() * 0.08, vy: 0, hp: d.hp + Math.floor(lvl() / 4) * (t === 'jet' ? 0 : 1), r: d.r, sc: d.sc, ph: 0, by: y, pat: 'line', fireT: rr(40, 120), air: true, age: 0 }, o);
        g.en.push(e); return e;
      }
      function mkGnd(t, wx, o) {
        const d = GND[t];
        const e = Object.assign({ t, wx, x: wx - g.scroll, y: GY + 2, hp: d.hp + Math.floor(lvl() / 3), r: d.r, sc: d.sc, fireT: rr(60, 140), air: false, age: 0, vx: 0 }, o);
        g.en.push(e); return e;
      }
      function spawnWave() {
        const lv = lvl(), r = Math.random(), tr = terrainAt(g.scroll + W + 20);
        const by = rr(TOP + 20, GY - 60);
        if (r < 0.25) {
          const n = 4 + Math.min(3, lv >> 1);
          for (let i = 0; i < n; i++) mkAir('jet', W + 20 + i * 26, by, { pat: 'sine', ph: i * 0.6, amp: 24 });
        } else if (r < 0.4) {
          const n = 3 + Math.min(2, lv >> 2);
          for (let i = 0; i < n; i++) mkAir('jet', W + 20 + i * 30, i % 2 ? TOP + 30 : GY - 40, { pat: 'swoop' });
        } else if (r < 0.5 && lv >= 1) {
          g.warnT = 90; snd.warn();
          for (let i = 0; i < 3; i++) mkAir('back', -30 - i * 34, rr(TOP + 20, GY - 30), { vx: 3.2 + lv * 0.1, pat: 'line' });
        } else if (r < 0.62) {
          mkAir('heli', W + 20, by, { pat: 'hover', hx: rr(W - 150, W - 70) });
          if (lv > 2) mkAir('heli', W + 60, clamp(by + 50, TOP + 20, GY - 40), { pat: 'hover', hx: rr(W - 150, W - 70) });
        } else if (r < 0.7) {
          mkAir('cargo', W + 20, rr(TOP + 20, GY - 70), { vx: -1.1, pat: 'line' });
        } else if (r < 0.8) {
          for (let i = 0; i < 2 + (lv > 3 ? 1 : 0); i++) mkAir('ace', W + 30 + i * 50, rr(TOP + 20, GY - 40), { pat: 'chase', vx: -2.6 });
        } else {
          // ground group
          const wx = g.scroll + W + 30;
          if (tr.water) {
            if (tr.ice || Math.random() < 0.5) { mkGnd('pt', wx, { vx: -0.6 }); mkGnd('pt', wx + 60, { vx: -0.6 }); }
            else mkGnd('ship', wx);
          } else {
            const ks = curMission().terr.some(t => t[1] === 'city') ? ['aa', 'bldg', 'sam', 'tank'] : ['aa', 'tank', 'sam', 'tank'];
            for (let i = 0; i < 3; i++) mkGnd(ks[(Math.random() * ks.length) | 0], wx + i * 50, {});
          }
        }
      }
      function aimShot(x, y, spd, spread) {
        const a = Math.atan2(g.py - y, g.px - x) + (spread || 0);
        g.eb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 2 });
      }
      const shotSpd = () => 1.8 + Math.min(1.6, lvl() * 0.12);

      // ---------------- bosses ----------------
      function makeBoss() {
        const k = curMission().boss, lv = lvl(), hpm = 1 + lv * 0.18;
        const b = { k, t: 0, x: W + 100, y: 80, vx: 0, vy: 0, parts: [], hp: 0, maxhp: 0, dead: false, die: 0 };
        if (k === 'bomber') {
          Object.assign(b, { w: 130, h: 34, tx: W - 100, hp: 70 * hpm });
          b.parts = [{ dx: -30, dy: -16, hp: 14 * hpm, r: 7, ty: 'turret' }, { dx: 20, dy: -16, hp: 14 * hpm, r: 7, ty: 'turret' }, { dx: -10, dy: 14, hp: 14 * hpm, r: 7, ty: 'spread' }];
        } else if (k === 'battleship') {
          Object.assign(b, { w: 230, h: 40, x: W + 140, y: GY - 2, tx: W - 130, hp: 95 * hpm, ground: true });
          b.parts = [{ dx: -80, dy: -22, hp: 16 * hpm, r: 8, ty: 'turret' }, { dx: -40, dy: -30, hp: 16 * hpm, r: 8, ty: 'flak' }, { dx: 40, dy: -30, hp: 16 * hpm, r: 8, ty: 'flak' }, { dx: 80, dy: -22, hp: 16 * hpm, r: 8, ty: 'missile' }];
        } else if (k === 'fortress') {
          Object.assign(b, { w: 200, h: 46, x: W + 120, y: GY - 2, tx: W - 120, hp: 85 * hpm, ground: true });
          b.parts = [{ dx: -70, dy: -40, hp: 14 * hpm, r: 8, ty: 'flak' }, { dx: 0, dy: -58, hp: 20 * hpm, r: 9, ty: 'missile' }, { dx: 70, dy: -40, hp: 14 * hpm, r: 8, ty: 'turret' }];
        } else if (k === 'gunship') {
          Object.assign(b, { w: 120, h: 40, tx: W - 90, hp: 80 * hpm });
          b.parts = [{ dx: -50, dy: 10, hp: 16 * hpm, r: 7, ty: 'spread' }, { dx: 0, dy: 18, hp: 16 * hpm, r: 7, ty: 'missile' }];
        } else {
          Object.assign(b, { w: 180, h: 54, tx: W - 120, hp: 160 * hpm, final: true });
          b.parts = [{ dx: -60, dy: -26, hp: 18 * hpm, r: 8, ty: 'turret' }, { dx: 0, dy: -30, hp: 18 * hpm, r: 8, ty: 'missile' }, { dx: 60, dy: -26, hp: 18 * hpm, r: 8, ty: 'turret' }, { dx: -30, dy: 26, hp: 18 * hpm, r: 8, ty: 'spread' }, { dx: 30, dy: 26, hp: 18 * hpm, r: 8, ty: 'flak' }];
        }
        for (const p of b.parts) { p.max = p.hp; p.cd = rr(40, 100); }
        b.maxhp = b.hp;
        g.boss = b;
      }
      function stepBoss() {
        const b = g.boss; if (!b) return;
        b.t++;
        if (b.dead) {
          b.die++;
          if (b.die % 5 === 0) { g.fx.push({ x: b.x + rr(-b.w / 2, b.w / 2), y: b.y + rr(-b.h / 2, b.h / 2) - (b.ground ? b.h / 2 : 0), t: 0, big: true }); snd.boom(); }
          if (!b.ground) b.y += 0.6;
          if (b.die > 150) { g.boss = null; g.phase = 'rtb'; g.pt = 0; g.eb = []; snd.clear(); }
          return;
        }
        if (b.x > b.tx) b.x -= 1.2;
        else if (!b.ground) {
          const amp = b.k === 'gunship' ? 50 : 40;
          b.y = (GY + TOP) / 2 - 10 + Math.sin(b.t * 0.015) * amp;
          if (b.k === 'gunship' || b.final) b.x = b.tx + Math.sin(b.t * 0.009) * 50;
        }
        if (!b.ground && b.x > b.tx + 1) b.y += ((GY + TOP) / 2 - 10 - b.y) * 0.02;
        const rate = Math.max(0.5, 1 - lvl() * 0.05);
        for (const p of b.parts) {
          if (p.hp <= 0) continue;
          const px = b.x + p.dx, py = b.y + p.dy - (b.ground ? b.h / 2 : 0);
          if (--p.cd > 0 || b.x > W - 10) continue;
          if (p.ty === 'turret') { aimShot(px, py, shotSpd()); p.cd = 60 * rate; }
          else if (p.ty === 'spread') { for (let i = -2; i <= 2; i++) aimShot(px, py, shotSpd() * 0.8, i * 0.22); p.cd = 110 * rate; }
          else if (p.ty === 'flak') { for (let i = 0; i < 3; i++) g.eb.push({ x: px, y: py, vx: -1.2 - i * 0.5, vy: -1.6 - i * 0.3, r: 2, g: 0.02 }); p.cd = 80 * rate; }
          else if (p.ty === 'missile') { g.eb.push({ x: px, y: py, vx: -1.4, vy: -1, r: 3, homing: 90, mis: true, hp: 1 }); p.cd = 150 * rate; }
        }
        if (b.final && b.t % 200 === 0) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.eb.push({ x: b.x, y: b.y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, r: 2 }); } }
      }
      function bossHitTest(x, y, rad) {
        const b = g.boss; if (!b || b.dead || b.x > W + 20) return null;
        const by = b.y - (b.ground ? b.h / 2 : 0);
        for (const p of b.parts) {
          if (p.hp <= 0) continue;
          if (Math.abs(x - (b.x + p.dx)) < p.r + rad && Math.abs(y - (by + p.dy)) < p.r + rad) return p;
        }
        if (Math.abs(x - b.x) < b.w / 2 + rad && Math.abs(y - by) < b.h / 2 + rad) return b;
        return null;
      }
      function damageBoss(target, d) {
        const b = g.boss;
        if (target === b) {
          b.hp -= d * (b.parts.some(p => p.hp > 0) ? 0.5 : 1);
        } else {
          target.hp -= d;
          if (target.hp <= 0) { addScore(5000); g.fx.push({ x: b.x + target.dx, y: b.y + target.dy - (b.ground ? b.h / 2 : 0), t: 0, big: true }); snd.boom(); }
        }
        b.flash = 3;
        if (b.hp <= 0 && !b.dead) { b.dead = true; b.die = 0; addScore(30000 * (1 + g.loop)); snd.big(); g.kills++; }
      }

      // ---------------- input ----------------
      function readInput() {
        if (g.demo) return botInput();
        return {
          l: api.key('ArrowLeft'), r: api.key('ArrowRight'), u: api.key('ArrowUp'), d: api.key('ArrowDown'),
          fire: api.key('Space'), sp: api.pressed('KeyX'), sw: api.pressed('KeyZ') || api.pressed('Enter')
        };
      }
      function botInput() {
        const o = { l: false, r: false, u: false, d: false, fire: true, sp: false, sw: false };
        let ty = (GY + TOP) / 2, tx = 90;
        let tgt = null;
        for (const e of g.en) if (e.air && e.x > g.px && (!tgt || e.x < tgt.x)) tgt = e;
        if (g.boss && !g.boss.dead) ty = g.boss.y - (g.boss.ground ? 30 : 0);
        else if (tgt) ty = tgt.y;
        for (const b of g.eb) if (Math.abs(b.x - g.px) < 40 && Math.abs(b.y - g.py) < 16) { ty = g.py + (b.y > g.py ? -40 : 40); break; }
        ty = clamp(ty, TOP + 10, GY - 14);
        if (g.px < tx - 4) o.r = true; else if (g.px > tx + 4) o.l = true;
        if (g.py < ty - 3) o.d = true; else if (g.py > ty + 3) o.u = true;
        if (g.f % 40 === 0) o.sp = true;
        if (g.f % 300 === 0) o.sw = true;
        return o;
      }

      // ---------------- player weapons ----------------
      function fireGun() {
        const P = g.P, x = g.px + 14, y = g.py + 1, sp = 7;
        const add = (vy, dy) => g.pb.push({ x, y: y + (dy || 0), vx: sp, vy: vy || 0, d: P.dmg });
        if (g.gun === 1) add(0);
        else if (g.gun === 2) { add(0, -3); add(0, 3); }
        else if (g.gun === 3) { add(0, -3); add(0, 3); add(-0.8); add(0.8); }
        else { add(0, -3); add(0, 3); add(-0.8); add(0.8); add(-1.6); add(1.6); }
        snd.gun();
      }
      function fireSpecial() {
        const w = WEAP[g.sel];
        if (g.ammo[w] <= 0) { cycleWeapon(); snd.no(); return; }
        if (g.spT > 0) return;
        g.ammo[w]--;
        const x = g.px, y = g.py + 4;
        if (w === 'SIDEWINDER') { g.ps.push({ k: 'sw', x, y: y - 6, vx: 2, vy: -1, t: 0, d: 4 }); g.ps.push({ k: 'sw', x, y: y + 4, vx: 2, vy: 1, t: 0, d: 4 }); g.spT = 18; snd.missile(); }
        else if (w === 'PHOENIX') { g.ps.push({ k: 'ph', x, y, vx: 1, vy: 0.6, t: 0, d: 16 }); g.spT = 30; snd.missile(); }
        else if (w === 'ROCKET') { for (let i = -1; i <= 1; i++) g.ps.push({ k: 'rk', x: x + 6, y: y + i * 3, vx: 6, vy: i * 0.35, t: 0, d: 3 }); g.spT = 14; snd.missile(); }
        else if (w === 'BOMB') { g.ps.push({ k: 'bm', x, y: y + 4, vx: 1.8, vy: 0.5, t: 0, d: 8 }); g.spT = 14; snd.bomb(); }
        else if (w === 'NAPALM') { g.ps.push({ k: 'np', x, y: y + 4, vx: 1.6, vy: 0.5, t: 0, d: 2 }); g.spT = 24; snd.bomb(); }
        if (g.ammo[w] <= 0) cycleWeapon();
      }
      function cycleWeapon() {
        for (let i = 1; i <= WEAP.length; i++) { const j = (g.sel + i) % WEAP.length; if (g.ammo[WEAP[j]] > 0) { g.sel = j; return; } }
      }
      function nearestAir(x, y) {
        let best = null, bd = 1e9;
        for (const e of g.en) if (e.air && e.hp > 0 && e.x > x - 20 && e.x < W + 10) { const d = Math.abs(e.x - x) + Math.abs(e.y - y); if (d < bd) { bd = d; best = e; } }
        if (!best && g.boss && !g.boss.dead && g.boss.x < W) best = { x: g.boss.x, y: g.boss.y - (g.boss.ground ? g.boss.h / 2 : 0), boss: true };
        return best;
      }
      function hurtEnemy(e, d) {
        e.hp -= d; e.flash = 3;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true; g.kills++; addScore(e.sc);
          g.fx.push({ x: e.x, y: e.y - (e.air ? 0 : 6), t: 0, big: e.t === 'ship' || e.t === 'bldg' || e.t === 'cargo' }); snd.boom();
          if (e.t === 'cargo') dropItem(e.x, e.y);
          else if (Math.random() < 0.05) dropItem(e.x, e.y - 10);
        } else snd.hit();
      }
      function dropItem(x, y) {
        const r = Math.random();
        const k = r < 0.4 ? 'P' : r < 0.8 ? 'W' : 'H';
        g.items.push({ k, x, y, vy: -1, t: 0 });
      }

      // ---------------- update ----------------
      function stepPlayer(inp) {
        const P = g.P;
        if (g.dead > 0) {
          g.dead++;
          g.py += 1.5; g.px -= 0.5;
          if (g.dead % 6 === 0 && g.dead < 50) g.fx.push({ x: g.px + rr(-8, 8), y: g.py + rr(-5, 5), t: 0 });
          if (g.dead === 100) {
            if (g.demo) { mode = 'title'; mt = 0; newRun(true); return; }
            if (g.lives > 1) { g.lives--; respawn(); }
            else {
              const cg = g;
              const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 320; };
              const cont = () => { if (g !== cg) return; g.lives = 3; respawn(); g.msg = { t: 'CONTINUE!', c: 90 }; };
              if (api.offerContinue) api.offerContinue(cont, end); else end();
            }
          }
          return;
        }
        const s = P.spd;
        let ax = 0, ay = 0;
        if (inp.l) ax -= 1; if (inp.r) ax += 1; if (inp.u) ay -= 1; if (inp.d) ay += 1;
        g.vx += (ax * s - g.vx) * 0.3; g.vy += (ay * s - g.vy) * 0.3;
        g.px = clamp(g.px + g.vx, 14, W - 20); g.py = clamp(g.py + g.vy, TOP + 6, GY - 10);
        g.tilt = g.vy;
        if (g.inv > 0) g.inv--;
        if (inp.fire && g.gunT <= 0) { fireGun(); g.gunT = P.rate; }
        if (g.gunT > 0) g.gunT--;
        if (g.spT > 0) g.spT--;
        if (inp.sp) fireSpecial();
        if (inp.sw) { cycleWeapon(); snd.sel(); }
      }
      function respawn() {
        g.dead = 0; g.hp = g.P.hp; g.inv = 150; g.px = 40; g.py = (GY + TOP) / 2; g.vx = 0; g.vy = 0; g.eb = [];
        g.gun = Math.max(1, g.gun - 1);
        for (const w of WEAP) if (g.ammo[w] < (g.P.ammo[w] >> 1)) g.ammo[w] = g.P.ammo[w] >> 1;
        selectFirstWeapon();
      }
      function hurtPlayer() {
        if (g.inv > 0 || g.dead || g.phase === 'rtb') return;
        g.hp--; g.inv = 70; snd.hurt();
        g.fx.push({ x: g.px, y: g.py, t: 8 });
        if (g.hp <= 0) { g.dead = 1; snd.big(); g.fx.push({ x: g.px, y: g.py, t: 0, big: true }); }
      }

      function stepEntities() {
        const lv = lvl();
        // ground scroll positions
        for (const e of g.en) {
          e.age++;
          if (!e.air) { e.wx += e.vx; e.x = e.wx - g.scroll; }
          else {
            if (e.pat === 'sine') { e.x += e.vx; e.ph += 0.06; e.y = e.by + Math.sin(e.ph) * e.amp; }
            else if (e.pat === 'swoop') {
              e.x += e.vx;
              if (e.x < W - 60 && !e.turned) e.y += clamp(g.py - e.y, -1.4, 1.4);
              if (e.x < g.px + 60 && !e.turned) { e.turned = true; e.vy = e.y < (GY + TOP) / 2 ? 1.6 : -1.6; }
              if (e.turned) e.y += e.vy;
            } else if (e.pat === 'hover') {
              if (e.x > e.hx) e.x -= 1.5; else { e.y += Math.sin(e.age * 0.04) * 0.6; if (e.age > 420) e.x -= 2; }
            } else if (e.pat === 'chase') {
              e.x += e.vx; e.y += clamp(g.py - e.y, -0.7, 0.7);
              if (e.x < g.px + 40 && !e.turned) { e.turned = true; e.vx = -4; }
            } else { e.x += e.vx; e.y += e.vy; }
          }
          // fire
          if (e.x < W - 8 && e.x > 10 && !g.dead) {
            if (--e.fireT <= 0) {
              const sp = shotSpd();
              if (e.t === 'jet' || e.t === 'back') { if (Math.random() < 0.5 + lv * 0.05) aimShot(e.x, e.y, sp); e.fireT = rr(120, 220) - lv * 6; }
              else if (e.t === 'ace') { aimShot(e.x, e.y, sp * 1.1); e.fireT = 70; }
              else if (e.t === 'heli') { for (let i = -1; i <= 1; i++) aimShot(e.x - 8, e.y + 4, sp * 0.9, i * 0.2); e.fireT = 100 - lv * 3; }
              else if (e.t === 'cargo') e.fireT = 999;
              else if (e.t === 'sam') { g.eb.push({ x: e.x, y: e.y - 10, vx: -0.6, vy: -1.6, r: 3, homing: 80, mis: true, hp: 1 }); e.fireT = 180; }
              else if (e.t === 'ship') { for (let i = 0; i < 2; i++) aimShot(e.x - 10 + i * 20, e.y - 16, sp, (i - 0.5) * 0.15); e.fireT = 80; }
              else if (e.t === 'bldg') e.fireT = 999;
              else { if (g.py < e.y) aimShot(e.x, e.y - 10, sp); e.fireT = rr(90, 150) - lv * 3; }
              e.fireT = Math.max(30, e.fireT);
            }
          }
          if ((e.x < -60 && e.vx <= 0) || e.x < -260 || e.x > W + 260 || e.y > H + 20 || e.y < -40) e.gone = true;
          // collide with player
          if (e.air && !g.dead && Math.abs(e.x - g.px) < e.r + 8 && Math.abs(e.y - g.py) < e.r + 3) { hurtPlayer(); hurtEnemy(e, 3); }
        }
        g.en = g.en.filter(e => !e.dead && !e.gone);
        // player bullets
        for (const b of g.pb) {
          b.x += b.vx; b.y += b.vy;
          for (const e of g.en) {
            if (e.dead) continue;
            const ey = e.air ? e.y : e.y - 6;
            if (Math.abs(b.x - e.x) < e.r + 3 && Math.abs(b.y - ey) < e.r) { b.dead = true; hurtEnemy(e, b.d); break; }
          }
          if (!b.dead) { const t = bossHitTest(b.x, b.y, 2); if (t) { b.dead = true; damageBoss(t, b.d); } }
          if (!b.dead) for (const m of g.eb) if (m.mis && Math.abs(m.x - b.x) < 6 && Math.abs(m.y - b.y) < 5) { m.dead = true; b.dead = true; addScore(100); g.fx.push({ x: m.x, y: m.y, t: 10 }); break; }
          if (b.x > W + 10 || b.y < 0 || b.y > GY) b.dead = true;
        }
        g.pb = g.pb.filter(b => !b.dead);
        // specials
        for (const s of g.ps) {
          s.t++;
          if (s.k === 'sw' || s.k === 'ph') {
            const tg = nearestAir(s.x, s.y);
            const top = s.k === 'sw' ? 6 : 4.5;
            s.vx = Math.min(top, s.vx + 0.3);
            if (tg && s.t > 6) s.vy += clamp((tg.y - s.y) * 0.04, -0.6, 0.6) - s.vy * 0.08; else s.vy *= 0.9;
            s.x += s.vx; s.y += s.vy;
            if (s.t % 2 === 0) g.fx.push({ x: s.x - 4, y: s.y, t: 0, smoke: true });
            let hit = false;
            for (const e of g.en) if (!e.dead && Math.abs(s.x - e.x) < e.r + 4 && Math.abs(s.y - (e.air ? e.y : e.y - 6)) < e.r + 3) { hurtEnemy(e, s.d); hit = true; break; }
            if (!hit) { const t = bossHitTest(s.x, s.y, 3); if (t) { damageBoss(t, s.d); hit = true; } }
            if (hit) { s.dead = true; g.fx.push({ x: s.x, y: s.y, t: 0, big: s.k === 'ph' }); if (s.k === 'ph') splash(s.x, s.y, 30, 6); }
          } else if (s.k === 'rk') {
            s.x += s.vx; s.y += s.vy;
            for (const e of g.en) if (!e.dead && Math.abs(s.x - e.x) < e.r + 4 && Math.abs(s.y - (e.air ? e.y : e.y - 6)) < e.r + 2) { hurtEnemy(e, s.d); s.dead = true; break; }
            if (!s.dead) { const t = bossHitTest(s.x, s.y, 2); if (t) { damageBoss(t, s.d); s.dead = true; } }
            if (s.dead) g.fx.push({ x: s.x, y: s.y, t: 6 });
          } else {
            s.vy += 0.12; s.x += s.vx; s.y += s.vy;
            const t = bossHitTest(s.x, s.y, 3);
            if (t) { damageBoss(t, s.d * 1.5); s.dead = true; g.fx.push({ x: s.x, y: s.y, t: 0, big: true }); snd.boom(); }
            else if (s.y >= GY + 2) {
              s.dead = true;
              if (s.k === 'bm') { splash(s.x, GY, 26, s.d); g.fx.push({ x: s.x, y: GY - 4, t: 0, big: true }); snd.boom(); }
              else { g.fires.push({ x: s.x, w: 6, t: 0 }); snd.boom(); }
            }
          }
          if (s.x > W + 20 || s.x < -20 || s.y < -20 || s.t > 260) s.dead = true;
        }
        g.ps = g.ps.filter(s => !s.dead);
        // napalm fires
        for (const f of g.fires) {
          f.t++; f.x -= g.speed; if (f.w < 70) f.w += 2;
          if (f.t % 8 === 0) {
            for (const e of g.en) if (!e.air && !e.dead && e.x > f.x - 4 && e.x < f.x + f.w) hurtEnemy(e, 2);
            const b = g.boss; if (b && !b.dead && b.ground && Math.abs(b.x - (f.x + f.w / 2)) < b.w / 2 + f.w / 2) damageBoss(b, 1.5);
          }
        }
        g.fires = g.fires.filter(f => f.t < 120);
        // enemy bullets
        for (const b of g.eb) {
          if (b.homing) { b.homing--; const a = Math.atan2(g.py - b.y, g.px - b.x); b.vx += Math.cos(a) * 0.06; b.vy += Math.sin(a) * 0.06; const sp = Math.hypot(b.vx, b.vy), mx = 2.2 + lvl() * 0.05; if (sp > mx) { b.vx *= mx / sp; b.vy *= mx / sp; } if (b.t === undefined) b.t = 0; if (++b.t % 3 === 0) g.fx.push({ x: b.x, y: b.y, t: 0, smoke: true }); }
          if (b.g) b.vy += b.g;
          b.x += b.vx; b.y += b.vy;
          if (!g.dead && Math.abs(b.x - g.px) < 7 + b.r && Math.abs(b.y - g.py) < 3 + b.r) { b.dead = true; hurtPlayer(); }
          if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > GY + 4) b.dead = true;
        }
        g.eb = g.eb.filter(b => !b.dead);
        // items
        for (const it of g.items) {
          it.t++; it.x -= 0.6; it.vy = Math.min(0.6, it.vy + 0.03); it.y = Math.min(GY - 8, it.y + it.vy);
          if (Math.abs(it.x - g.px) < 14 && Math.abs(it.y - g.py) < 12 && !g.dead) {
            it.dead = true; snd.item(); addScore(500);
            if (it.k === 'P') { if (g.gun < 4) g.gun++; g.msg = { t: 'CANNON POWER UP', c: 70 }; }
            else if (it.k === 'H') { g.hp = g.P.hp; g.msg = { t: 'ARMOR REPAIRED', c: 70 }; }
            else { const w = WEAP[(Math.random() * WEAP.length) | 0], q = w === 'PHOENIX' ? 2 : w === 'NAPALM' ? 4 : 8; g.ammo[w] += q; g.msg = { t: w + ' +' + q, c: 70 }; }
          }
          if (it.x < -10 || it.t > 900) it.dead = true;
        }
        g.items = g.items.filter(i => !i.dead);
      }
      function splash(x, y, rad, d) {
        for (const e of g.en) if (!e.dead && Math.abs(e.x - x) < rad + e.r && Math.abs((e.air ? e.y : e.y - 6) - y) < rad + e.r) hurtEnemy(e, d);
        const b = g.boss; if (b && !b.dead) { const t = bossHitTest(x, y, rad); if (t) damageBoss(t, d); }
      }
      function stepFx() {
        for (const f of g.fx) { f.t++; f.x -= f.smoke ? 1 : g.speed * 0.5; }
        g.fx = g.fx.filter(f => f.t < (f.smoke ? 18 : f.big ? 36 : 24));
      }

      function stepGame() {
        g.f++; g.pt++;
        if (g.msg && --g.msg.c <= 0) g.msg = null;
        if (g.warnT > 0) g.warnT--;
        const ph = g.phase;
        if (ph === 'launch') {
          // catapult launch from the carrier
          if (g.pt < 50) { g.px = 70; g.py = GY - 22; }
          else if (g.pt < 120) { g.px += (g.pt - 50) * 0.09; if (g.pt > 85) g.py -= (g.pt - 85) * 0.06; }
          else { g.px += (90 - g.px) * 0.05; g.py += ((GY + TOP) / 2 - g.py) * 0.05; }
          if (g.pt === 50) snd.launch();
          if (g.pt > 100) g.speed = Math.min(1.6, g.speed + 0.02);
          g.scroll += g.speed; g.carrierX -= g.speed;
          if (g.pt > 50 && g.pt < 120 && g.pt % 3 === 0) g.fx.push({ x: g.px - 16, y: g.py + 2, t: 0, smoke: true });
          stepFx();
          if (g.pt > 200) { g.phase = 'mission'; g.pt = 0; g.speed = 1.6; }
          return;
        }
        if (ph === 'mission' || ph === 'boss') {
          const inp = readInput();
          const cg = g;
          stepPlayer(inp); if (g !== cg) return;
          g.scroll += g.speed;
          if (ph === 'mission') {
            if (g.scroll < g.misLen) {
              if (g.scroll > g.nextWave) { spawnWave(); g.nextWave = g.scroll + Math.max(110, 230 - lvl() * 12) + rr(0, 60); }
            } else if (g.en.filter(e => e.air).length === 0 || g.scroll > g.misLen + 800) {
              g.phase = 'boss'; g.pt = 0; makeBoss(); g.warnT = 160; snd.boss();
            }
          } else {
            if (g.boss && g.boss.ground && g.boss.x <= g.boss.tx + 2) g.speed = Math.max(0, g.speed - 0.02);
            stepBoss();
          }
          stepEntities(); stepFx();
          return;
        }
        if (ph === 'rtb') {
          // carrier approach and landing
          g.speed = 1.6;
          stepEntities(); stepFx();
          if (g.pt === 1) { g.carrierX = W + 60; g.en = []; g.eb = []; }
          if (g.dead) { const cg = g; stepPlayer({}); if (g !== cg) return; }
          if (g.pt < 60) { const inp = readInput(); stepPlayer(Object.assign({}, inp, { sp: false })); }
          g.scroll += g.speed;
          const deckY = GY - 22;
          if (g.pt > 60) {
            const tx = g.carrierX + 20;
            if (g.pt < 240) g.carrierX -= 1.2; else g.carrierX -= g.pt < 300 ? 0.6 : 0;
            if (g.pt < 230) { g.px += (tx - 60 - g.px) * 0.03; g.py += ((g.pt < 160 ? deckY - 40 : deckY) - g.py) * 0.04; }
            else if (g.pt < 290) { g.py = deckY; g.px += Math.max(0, (tx + 30 - g.px) * 0.08); if (g.pt === 231) au.noise(0.4, { vol: 0.14, freq: 2500, type: 'highpass' }); }
            else g.py = deckY;
          }
          g.tilt = 0;
          if (g.pt === 300) {
            const hb = g.hp * 5000, kb = g.kills * 200;
            g.tally = { hb, kb, tot: hb + kb + 20000 * (1 + g.loop) };
            addScore(g.tally.tot); if (!g.demo) api.setHiScore(g.score);
          }
          if (g.pt > 300 && (g.pt > 520 || (g.pt > 380 && !g.demo && api.anyPressed('Enter', 'Space')))) {
            g.phase = 'shop'; g.pt = 0; g.shopSel = SHOP.length - 1; g.mission++;
            if (g.mission >= MISSIONS.length) { g.mission = 0; g.loop++; g.msg = { t: 'ALL MISSIONS COMPLETE!', c: 240 }; }
            if (g.demo) { mode = 'title'; mt = 0; newRun(true); }
          }
          return;
        }
        if (ph === 'shop') { stepShop(); return; }
      }
      function stepShop() {
        if (g.demo) { startMission(); return; }
        if (api.pressed('ArrowUp')) { g.shopSel = (g.shopSel + SHOP.length - 1) % SHOP.length; snd.sel(); }
        if (api.pressed('ArrowDown')) { g.shopSel = (g.shopSel + 1) % SHOP.length; snd.sel(); }
        const it = SHOP[g.shopSel];
        const go = (api.pressed('Space') || api.pressed('KeyX') || api.pressed('Enter')) && g.pt > 20;
        if (g.pt > 60 * 40 || (go && it.w === 'GO') || (api.pressed('Enter') && g.pt > 20)) { startMission(); return; }
        if (go) {
          if (g.budget < it.c || (it.w === 'GUN' && g.gun >= 4) || (it.w === 'REPAIR' && g.hp >= g.P.hp)) { snd.no(); return; }
          g.budget -= it.c; snd.buy();
          if (it.w === 'GUN') g.gun++;
          else if (it.w === 'REPAIR') g.hp = g.P.hp;
          else g.ammo[it.w] += it.q;
        }
      }

      // ---------------- drawing ----------------
      function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
      function poly(ctx, c, pts) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.closePath(); ctx.fill();
      }
      function circ(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill(); }

      function drawBG(ctx) {
        const m = curMission(), sc = g.scroll;
        const gr = ctx.createLinearGradient(0, 0, 0, GY);
        gr.addColorStop(0, m.sky[0]); gr.addColorStop(1, m.sky[1]);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, GY);
        if (m.night) { for (let i = 0; i < 60; i++) R(ctx, ((i * 131 - sc * 0.05) % W + W) % W, (i * 37) % (GY - 50), 1, 1, i % 5 ? '#ffffff' : '#8890ff'); circ(ctx, 300, 40, 10, '#f0ecd0'); }
        else if (m.sky[1] === '#ff9050') circ(ctx, 280, GY - 50, 26, '#ffd070');
        // far mountains / clouds
        ctx.fillStyle = m.far; ctx.beginPath(); ctx.moveTo(0, GY);
        for (let x = 0; x <= W; x += 8) { const wx = x + sc * 0.15; ctx.lineTo(x, GY - 18 - 14 * Math.sin(wx * 0.011) - 8 * Math.sin(wx * 0.037 + 2)); }
        ctx.lineTo(W, GY); ctx.closePath(); ctx.fill();
        // clouds layers
        for (let i = 0; i < 6; i++) {
          const cx = ((i * 97 + 30 - sc * 0.35) % (W + 120) + W + 120) % (W + 120) - 60, cy = 30 + (i * 53) % 90;
          ctx.globalAlpha = m.night ? 0.25 : 0.75;
          const c = m.storm ? '#606878' : '#ffffff';
          circ(ctx, cx, cy, 10, c); circ(ctx, cx + 12, cy - 4, 13, c); circ(ctx, cx + 26, cy, 9, c); R(ctx, cx - 6, cy, 40, 8, c);
          ctx.globalAlpha = 1;
        }
        if (m.storm && g.f % 240 < 4) { ctx.globalAlpha = 0.35; R(ctx, 0, 0, W, GY, '#ffffff'); ctx.globalAlpha = 1; }
      }
      function drawGround(ctx) {
        const sc = g.scroll;
        for (let x = 0; x < W + 8; x += 8) {
          const wx = Math.floor((x + sc) / 8) * 8, t = terrainAt(wx), off = (wx - sc) - x;
          const xx = x + off;
          R(ctx, xx, GY, 8, H - GY, t.a);
          R(ctx, xx, GY, 8, 2, t.top);
          if (t.water) {
            if (((wx / 8) + ((g.f >> 3))) % 5 === 0) R(ctx, xx, GY + 6 + (wx % 3) * 7, 6, 1, t.top);
            if (t.ice && (wx % 96) < 40) R(ctx, xx, GY + 3, 8, 4 + (wx % 5), t.b);
          } else {
            if ((wx / 8) % 3 === 0) R(ctx, xx, GY + 8 + (wx % 4) * 5, 5, 2, t.b);
            if (t === TERR.city && (wx % 64) < 40) { const h = 20 + (wx * 7 % 30); R(ctx, xx, GY - h, 8, h, '#2a2a36'); if ((wx % 16) === 0) R(ctx, xx + 2, GY - h + 4, 2, 2, '#ffd860'); }
            if (t === TERR.grass && (wx % 40) === 0) { R(ctx, xx + 3, GY - 6, 2, 6, '#5a3a20'); circ(ctx, xx + 4, GY - 8, 5, '#2a6a20'); }
            if (t === TERR.desert && (wx % 120) === 0) { R(ctx, xx + 3, GY - 10, 3, 10, '#3a8a30'); R(ctx, xx, GY - 7, 3, 2, '#3a8a30'); R(ctx, xx + 6, GY - 8, 3, 2, '#3a8a30'); }
            if (t === TERR.rock && (wx % 56) < 16) poly(ctx, '#5a4a3c', [xx, GY, xx + 8, GY - 14 - (wx % 9), xx + 16, GY]);
            if (t === TERR.snow && (wx % 48) === 0) { poly(ctx, '#1a4a30', [xx, GY, xx + 5, GY - 14, xx + 10, GY]); R(ctx, xx + 4, GY - 14, 2, 3, '#ffffff'); }
          }
        }
      }
      function drawCarrier(ctx, x) {
        const y = GY - 14;
        poly(ctx, '#5a606a', [x - 20, y, x + 300, y, x + 280, GY + 14, x, GY + 14]);
        R(ctx, x - 24, y - 4, 330, 5, '#7a808a');
        R(ctx, x - 24, y - 5, 330, 1, '#a0a6b0');
        for (let i = 0; i < 300; i += 24) R(ctx, x + i, y - 3, 12, 1, '#f0f0f0');
        R(ctx, x + 190, y - 34, 34, 30, '#8a909a'); R(ctx, x + 196, y - 46, 14, 12, '#7a808a'); R(ctx, x + 200, y - 58, 2, 12, '#606670');
        for (let i = 0; i < 4; i++) R(ctx, x + 194 + i * 8, y - 28, 5, 3, '#2a3a50');
        text(ctx, '72', x + 240, y + 4, '#f0f0f0', 2);
        R(ctx, x - 30, GY + 10, 340, 2, '#d0e8ff');
      }
      function playerPlane(ctx, x, y, P, tilt, flame) {
        const k = P.kind, c = P.col, d = P.dark, a = P.acc;
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(clamp(tilt || 0, -3, 3) * 0.06);
        if (flame) { const fl = 5 + (g.f & 3); poly(ctx, '#ff9020', [-15, -2, -15 - fl, 0, -15, 2]); poly(ctx, '#ffffa0', [-15, -1, -15 - fl * 0.5, 0, -15, 1]); }
        if (k === 0) {
          poly(ctx, d, [-14, -2, 8, -3, 15, 0, 8, 2, -14, 2]);
          poly(ctx, c, [-14, -3, 6, -3, 13, -1, 6, 0, -14, 0]);
          poly(ctx, c, [-12, -3, -15, -10, -11, -10, -7, -3]);
          poly(ctx, a, [-14, -9, -11, -9, -11, -8, -14, -8]);
          poly(ctx, d, [-6, 1, 3, 1, -8, 6, -12, 6]);
          poly(ctx, '#203050', [3, -3, 7, -5, 10, -3]);
          R(ctx, -12, 0, 4, 2, a);
        } else if (k === 1) {
          poly(ctx, d, [-13, -1, 9, -2, 16, 0, 9, 2, -13, 2]);
          poly(ctx, c, [-13, -2, 8, -2, 14, -0.5, 8, 0, -13, 0]);
          poly(ctx, c, [-11, -2, -14, -9, -10, -9, -7, -2]);
          poly(ctx, a, [-13, -9, -10, -9, -10, -7, -13, -7]);
          poly(ctx, d, [-4, 1, 4, 1, -5, 5, -8, 5]);
          poly(ctx, '#203050', [4, -2, 7, -4, 10, -2]);
        } else {
          poly(ctx, d, [-13, -2, 10, -3, 15, 1, 10, 3, -13, 2]);
          poly(ctx, c, [-13, -3, 10, -4, 15, 0, 10, 0, -13, 0]);
          poly(ctx, c, [-12, -3, -14, -10, -10, -10, -7, -3]);
          poly(ctx, d, [-6, 1, 4, 1, -4, 6, -9, 6]);
          poly(ctx, '#203050', [6, -4, 9, -6, 12, -4]);
          R(ctx, -2, 2, 6, 2, a); R(ctx, 2, 4, 3, 2, '#e0e0e0');
        }
        ctx.restore();
      }
      function enemyPlane(ctx, e) {
        const flip = e.vx > 0 ? -1 : 1;
        const col = e.flash ? '#ffffff' : e.t === 'ace' ? '#b02828' : e.t === 'back' ? '#6a7a4a' : '#7a8a6a';
        const dk = e.t === 'ace' ? '#601010' : '#3a4a2a';
        ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.scale(flip, 1);
        poly(ctx, '#ff9020', [12, -1, 16 + (g.f & 2), 0, 12, 1]);
        poly(ctx, dk, [-14, 0, -6, -2, 12, -2, 12, 2, -6, 2]);
        poly(ctx, col, [-14, 0, -6, -3, 12, -3, 12, 0]);
        poly(ctx, col, [8, -2, 12, -9, 14, -9, 13, -2]);
        poly(ctx, dk, [-2, 1, 8, 1, 10, 6, 6, 6]);
        poly(ctx, '#70c0ff', [-8, -2, -5, -5, -2, -3]);
        ctx.restore();
      }
      function drawEnemy(ctx, e) {
        if (e.flash) e.flash--;
        const fl = e.flash ? '#ffffff' : null;
        switch (e.t) {
          case 'jet': case 'ace': case 'back': enemyPlane(ctx, e); break;
          case 'heli': {
            const x = Math.round(e.x), y = Math.round(e.y);
            poly(ctx, fl || '#5a6a3a', [x - 10, y - 4, x + 4, y - 5, x + 8, y, x + 4, y + 4, x - 10, y + 4]);
            R(ctx, x + 4, y - 8 + 2, 16, 3, fl || '#4a5a2a'); R(ctx, x + 18, y - 9, 2, 7, fl || '#4a5a2a');
            poly(ctx, '#70c0ff', [x - 10, y - 3, x - 5, y - 3, x - 5, y + 1, x - 10, y + 1]);
            R(ctx, x - 2, y - 7, 2, 3, '#303030');
            const rw = (g.f & 2) ? 24 : 14; R(ctx, x - 1 - rw / 2, y - 8, rw, 1, '#202020');
            R(ctx, x - 8, y + 5, 14, 1, '#303030');
            break;
          }
          case 'cargo': {
            const x = Math.round(e.x), y = Math.round(e.y);
            poly(ctx, fl || '#e08020', [x - 18, y, x - 12, y - 5, x + 16, y - 5, x + 20, y, x + 16, y + 4, x - 12, y + 4]);
            R(ctx, x + 12, y - 12, 4, 8, fl || '#c06010'); R(ctx, x - 6, y - 1, 14, 3, '#804010');
            R(ctx, x - 14, y - 3, 3, 2, '#70c0ff');
            break;
          }
          case 'ship': {
            const x = Math.round(e.x), y = Math.round(e.y);
            poly(ctx, fl || '#6a7078', [x - 30, y - 10, x + 30, y - 10, x + 24, y + 4, x - 26, y + 4]);
            R(ctx, x - 8, y - 20, 18, 10, fl || '#8a9098'); R(ctx, x, y - 28, 3, 8, '#5a6068');
            R(ctx, x - 22, y - 13, 8, 3, '#4a5058'); R(ctx, x + 16, y - 13, 8, 3, '#4a5058');
            R(ctx, x - 32, y + 2, 64, 1, '#d0e8ff');
            break;
          }
          case 'pt': {
            const x = Math.round(e.x), y = Math.round(e.y);
            poly(ctx, fl || '#7a7a70', [x - 12, y - 5, x + 12, y - 5, x + 9, y + 2, x - 10, y + 2]);
            R(ctx, x - 3, y - 9, 7, 4, fl || '#9a9a90'); R(ctx, x + 11, y + 1, 6, 1, '#ffffff');
            break;
          }
          case 'aa': {
            const x = Math.round(e.x), y = Math.round(e.y);
            R(ctx, x - 8, y - 6, 16, 6, fl || '#5a5a48'); circ(ctx, x, y - 7, 5, fl || '#6a6a54');
            const a = Math.atan2(g.py - (y - 8), g.px - x);
            ctx.strokeStyle = '#303028'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + Math.cos(a) * 9, y - 8 + Math.sin(a) * 9); ctx.stroke();
            break;
          }
          case 'tank': {
            const x = Math.round(e.x), y = Math.round(e.y);
            R(ctx, x - 10, y - 4, 20, 4, '#2a2a20'); R(ctx, x - 9, y - 8, 18, 4, fl || '#6a7040'); R(ctx, x - 4, y - 11, 8, 3, fl || '#5a6034'); R(ctx, x - 12, y - 10, 8, 1, '#3a3e22');
            break;
          }
          case 'sam': {
            const x = Math.round(e.x), y = Math.round(e.y);
            R(ctx, x - 9, y - 5, 18, 5, fl || '#5a6048'); poly(ctx, fl || '#e0e0d0', [x - 6, y - 5, x + 2, y - 16, x + 4, y - 14, x - 3, y - 5]);
            R(ctx, x + 1, y - 17, 2, 2, '#d03030');
            break;
          }
          case 'bldg': {
            const x = Math.round(e.x), y = Math.round(e.y);
            R(ctx, x - 12, y - 30, 24, 30, fl || '#4a4a5a'); R(ctx, x - 12, y - 32, 24, 2, '#6a6a7a');
            for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) R(ctx, x - 9 + j * 7, y - 27 + i * 7, 3, 3, (i + j) & 1 ? '#ffd860' : '#303040');
            break;
          }
        }
      }
      function drawBoss(ctx) {
        const b = g.boss; if (!b) return;
        if (b.flash) b.flash--;
        const fl = b.flash && (g.f & 1);
        const x = Math.round(b.x), y = Math.round(b.y), w = b.w, h = b.h;
        if (b.k === 'bomber' || b.final) {
          const body = fl ? '#ffffff' : b.final ? '#4a3a50' : '#5a6070', dk = b.final ? '#2a1a30' : '#3a4050';
          poly(ctx, dk, [x - w / 2, y, x - w / 2 + 20, y - h / 2, x + w / 2 - 10, y - h / 2, x + w / 2, y - 4, x + w / 2, y + h / 2, x - w / 2 + 20, y + h / 2]);
          poly(ctx, body, [x - w / 2 + 4, y, x - w / 2 + 22, y - h / 2 + 3, x + w / 2 - 12, y - h / 2 + 3, x + w / 2 - 4, y - 4, x + w / 2 - 4, y + 4, x - w / 2 + 22, y + 4]);
          poly(ctx, dk, [x + w / 2 - 30, y - h / 2, x + w / 2 - 10, y - h / 2 - 22, x + w / 2, y - h / 2 - 22, x + w / 2 - 6, y - h / 2]);
          poly(ctx, body, [x - 30, y + 2, x + 30, y + 2, x + 10, y + h / 2 + 14, x - 14, y + h / 2 + 14]);
          poly(ctx, '#70c0ff', [x - w / 2 + 6, y - 2, x - w / 2 + 18, y - 9, x - w / 2 + 20, y - 2]);
          for (let i = 0; i < 4; i++) { R(ctx, x - 40 + i * 24, y + 10, 10, 5, '#2a2a30'); R(ctx, x - 40 + i * 24 + 10, y + 11, 3 + (g.f & 2), 3, '#ff9020'); }
          if (b.final) { circ(ctx, x, y, 10, fl ? '#fff' : ((g.f >> 2) & 1 ? '#ff3030' : '#a01010')); }
        } else if (b.k === 'gunship') {
          const body = fl ? '#ffffff' : '#4a5a3a';
          poly(ctx, body, [x - w / 2, y - 8, x - w / 2 + 20, y - h / 2, x + 30, y - h / 2, x + 40, y - 6, x + w / 2, y - 10, x + w / 2, y - 2, x + 30, y + h / 2, x - w / 2 + 14, y + h / 2]);
          poly(ctx, '#70c0ff', [x - w / 2 + 2, y - 8, x - w / 2 + 18, y - 16, x - w / 2 + 18, y - 4]);
          R(ctx, x - 30, y - h / 2 - 6, 60, 6, '#2a3a20');
          const rw = (g.f & 2) ? 150 : 90; R(ctx, x - rw / 2, y - h / 2 - 8, rw, 2, '#202020');
          R(ctx, x + w / 2 - 6, y - 22, 3, 18, '#202020');
        } else {
          // ground bosses: battleship / fortress, y is the waterline/ground line
          if (b.k === 'battleship') {
            const body = fl ? '#ffffff' : '#5a6068';
            poly(ctx, body, [x - w / 2, y - h * 0.55, x + w / 2, y - h * 0.55, x + w / 2 - 20, y + 6, x - w / 2 + 10, y + 6]);
            R(ctx, x - 20, y - h - 6, 50, h * 0.5, fl ? '#fff' : '#7a8088'); R(ctx, x - 6, y - h - 30, 10, 24, '#6a7078'); R(ctx, x + 8, y - h - 22, 6, 16, '#4a5058');
            for (let i = 0; i < 6; i++) R(ctx, x - 14 + i * 7, y - h - 2, 4, 3, '#2a3a50');
            R(ctx, x - w / 2 - 4, y + 4, w + 8, 2, '#d0e8ff');
          } else {
            const body = fl ? '#ffffff' : '#6a6450';
            R(ctx, x - w / 2, y - h, w, h, body); R(ctx, x - w / 2, y - h, w, 3, '#8a846c');
            for (let i = 0; i < 5; i++) R(ctx, x - w / 2 + 8 + i * 40, y - h + 10, 18, 8, '#2a2a20');
            R(ctx, x - 22, y - h - 18, 44, 18, fl ? '#fff' : '#5a5440'); R(ctx, x - 6, y - 14, 12, 14, '#20201a');
          }
        }
        for (const p of b.parts) {
          const px = x + p.dx, py = y + p.dy - (b.ground ? h / 2 : 0);
          if (p.hp <= 0) { R(ctx, px - 4, py - 3, 8, 6, '#2a2020'); continue; }
          circ(ctx, px, py, p.r, fl ? '#fff' : '#3a3a40'); circ(ctx, px, py, p.r - 2, p.ty === 'missile' ? '#c04030' : p.ty === 'flak' ? '#b0a040' : '#707880');
          const a = Math.atan2(g.py - py, g.px - px);
          ctx.strokeStyle = '#202024'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * (p.r + 4), py + Math.sin(a) * (p.r + 4)); ctx.stroke();
        }
      }
      function drawFx(ctx) {
        for (const f of g.fx) {
          if (f.smoke) { ctx.globalAlpha = 0.5 * (1 - f.t / 18); circ(ctx, f.x, f.y, 2 + f.t * 0.25, '#d0d0d0'); ctx.globalAlpha = 1; continue; }
          const life = f.big ? 36 : 24, k = f.t / life, r = (f.big ? 22 : 10) * (0.3 + k);
          ctx.globalAlpha = 1 - k * 0.7;
          circ(ctx, f.x, f.y, r, k < 0.25 ? '#ffffff' : k < 0.55 ? '#ffc040' : '#c04018');
          circ(ctx, f.x + r * 0.4, f.y - r * 0.3, r * 0.5, k < 0.5 ? '#ffe080' : '#802010');
          if (k > 0.5) circ(ctx, f.x - r * 0.3, f.y - r * 0.5, r * 0.45, '#404040');
          ctx.globalAlpha = 1;
        }
      }
      function drawPlay(ctx) {
        drawBG(ctx);
        drawGround(ctx);
        if (g.phase === 'launch' || g.phase === 'rtb') drawCarrier(ctx, g.carrierX);
        for (const f of g.fires) for (let i = 0; i < f.w; i += 6) { const h = 6 + ((i * 7 + g.f) % 9); poly(ctx, (g.f + i) & 4 ? '#ff6010' : '#ffb020', [f.x + i, GY + 2, f.x + i + 3, GY + 2 - h, f.x + i + 7, GY + 2]); }
        if (g.boss) drawBoss(ctx);
        for (const e of g.en) if (!e.air) drawEnemy(ctx, e);
        for (const e of g.en) if (e.air) drawEnemy(ctx, e);
        for (const it of g.items) {
          const c = it.k === 'P' ? '#ff3030' : it.k === 'W' ? '#30a0ff' : '#30d040';
          R(ctx, it.x - 6, it.y - 6, 12, 12, (g.f & 8) ? '#ffffff' : c); R(ctx, it.x - 5, it.y - 5, 10, 10, c); text(ctx, it.k, it.x - 2, it.y - 3, '#ffffff');
        }
        for (const b of g.pb) R(ctx, b.x - 3, b.y - 1, 6, 2, '#ffffa0');
        for (const s of g.ps) {
          if (s.k === 'sw' || s.k === 'ph') { const L = s.k === 'ph' ? 10 : 7; R(ctx, s.x - L, s.y - 1, L, s.k === 'ph' ? 3 : 2, '#f0f0f0'); R(ctx, s.x - 1, s.y - 1, 2, 2, '#ff4040'); }
          else if (s.k === 'rk') { R(ctx, s.x - 5, s.y - 1, 6, 2, '#e0e0e0'); R(ctx, s.x - 8, s.y - 1, 3, 2, (g.f & 2) ? '#ffa020' : '#ff6010'); }
          else { R(ctx, s.x - 3, s.y - 2, 6, 4, s.k === 'np' ? '#a06020' : '#3a3a30'); R(ctx, s.x - 4, s.y - 2, 1, 4, '#5a5a50'); }
        }
        if (g.phase !== 'shop' && !(g.dead > 40) && !(g.inv > 0 && (g.f & 4) && g.phase !== 'rtb')) playerPlane(ctx, g.px, g.py, g.P, g.tilt, g.phase !== 'rtb' || g.pt < 230);
        for (const b of g.eb) {
          if (b.mis) { R(ctx, b.x - 3, b.y - 1, 6, 3, '#e0e0e0'); R(ctx, b.x - 1, b.y - 1, 2, 3, '#ff3030'); }
          else { circ(ctx, b.x, b.y, b.r + 1, '#ff3060'); circ(ctx, b.x, b.y, b.r - 0.5, (g.f & 2) ? '#ffffff' : '#ffd0e0'); }
        }
        drawFx(ctx);
      }
      function drawHUD(ctx) {
        R(ctx, 0, 0, W, TOP - 4, 'rgba(0,0,0,.55)');
        stext(ctx, '1P', 4, 2, '#40c0ff'); stext(ctx, pad(g.score, 8), 20, 2, '#ffffff');
        stext(ctx, 'HI', W / 2 - 30, 2, '#ff5040'); stext(ctx, pad(Math.max(hi, g.score), 8), W / 2 - 16, 2, '#ffffff');
        for (let i = 0; i < Math.min(5, g.lives - 1); i++) { const x = W - 10 - i * 14; poly(ctx, '#d0d4dc', [x - 6, 6, x + 5, 5, x + 7, 7, x - 6, 9]); R(ctx, x - 6, 3, 2, 3, '#d0d4dc'); }
        // armor
        stext(ctx, 'ARMOR', 4, 11, '#ffd040');
        for (let i = 0; i < g.P.hp; i++) R(ctx, 36 + i * 7, 11, 5, 6, i < g.hp ? (g.hp <= 1 ? ((g.f & 8) ? '#ff3030' : '#802020') : '#40e060') : '#303830');
        // cannon
        stext(ctx, 'GUN', 90, 11, '#ffd040'); for (let i = 0; i < 4; i++) R(ctx, 110 + i * 5, 11, 3, 6, i < g.gun ? '#ff8030' : '#383030');
        // special
        const w = WEAP[g.sel];
        stext(ctx, w, W - 40, 11, g.ammo[w] > 0 ? '#40c0ff' : '#606060', 1, 'right'); stext(ctx, pad(g.ammo[w], 3), W - 6, 11, '#ffffff', 1, 'right');
        if (g.boss && !g.boss.dead && g.boss.x < W) {
          R(ctx, W / 2 - 60, H - 8, 120, 4, '#301010'); R(ctx, W / 2 - 60, H - 8, 120 * clamp(g.boss.hp / g.boss.maxhp, 0, 1), 4, '#ff3030');
          stext(ctx, 'BOSS', W / 2 - 88, H - 10, '#ff5040');
        }
        if (g.phase === 'mission') { R(ctx, W / 2 - 40, H - 5, 80, 2, '#203048'); R(ctx, W / 2 - 40, H - 5, 80 * clamp(g.scroll / g.misLen, 0, 1), 2, '#40c0ff'); }
        if (g.warnT > 0 && (g.f & 8)) {
          R(ctx, W / 2 - 60, 60, 120, 22, 'rgba(160,0,0,.75)');
          stext(ctx, 'WARNING!', W / 2, 63, '#ffffff', 1, 'center');
          stext(ctx, g.phase === 'boss' ? 'HEAVY TARGET APPROACHING' : 'ENEMY AT SIX O\'CLOCK', W / 2, 73, '#ffd040', 1, 'center');
        }
        if (g.phase === 'launch') {
          stext(ctx, 'MISSION ' + (g.mission + 1 + g.loop * MISSIONS.length), W / 2, 56, '#ffd040', 2, 'center');
          stext(ctx, curMission().n, W / 2, 76, '#ffffff', 1, 'center');
          if (g.pt < 50 && (g.f & 8)) stext(ctx, 'CATAPULT READY', W / 2, 92, '#40ff60', 1, 'center');
        }
        if (g.phase === 'rtb') {
          if (g.pt < 290) { if (g.f & 16) stext(ctx, 'RETURN TO CARRIER', W / 2, 56, '#40ff60', 1, 'center'); }
          else if (g.tally) {
            R(ctx, W / 2 - 110, 44, 220, 74, 'rgba(0,0,30,.7)');
            stext(ctx, 'MISSION COMPLETE', W / 2, 50, '#ffd040', 2, 'center');
            stext(ctx, 'ARMOR BONUS     ' + pad(g.tally.hb, 6), W / 2, 72, '#ffffff', 1, 'center');
            stext(ctx, 'TARGETS ' + pad(g.kills, 3) + '     ' + pad(g.tally.kb, 6), W / 2, 84, '#ffffff', 1, 'center');
            stext(ctx, 'LANDING BONUS   ' + pad(g.tally.tot - g.tally.hb - g.tally.kb, 6), W / 2, 96, '#ffffff', 1, 'center');
            stext(ctx, 'TOTAL           ' + pad(g.tally.tot, 6), W / 2, 108, '#40ff60', 1, 'center');
          }
        }
        if (g.msg) stext(ctx, g.msg.t, W / 2, 130, '#ffd040', 1, 'center');
      }
      function drawShop(ctx) {
        R(ctx, 0, 0, W, H, '#0a1426');
        for (let y = 0; y < H; y += 4) R(ctx, 0, y, W, 1, '#0c182c');
        stext(ctx, 'HANGAR DECK - RE-ARM', W / 2, 10, '#ffd040', 2, 'center');
        stext(ctx, 'NEXT: MISSION ' + (g.mission + 1 + g.loop * MISSIONS.length) + '  ' + curMission().n, W / 2, 30, '#ffffff', 1, 'center');
        stext(ctx, 'BUDGET $' + g.budget, W / 2, 42, '#40ff60', 1, 'center');
        for (let i = 0; i < SHOP.length; i++) {
          const it = SHOP[i], y = 58 + i * 14, sel = i === g.shopSel;
          if (sel) R(ctx, 40, y - 3, W - 80, 13, '#20406a');
          stext(ctx, (sel ? '> ' : '  ') + it.n, 48, y, it.c > g.budget ? '#707070' : '#ffffff');
          if (it.c) stext(ctx, '$' + it.c, W - 48, y, '#ffd040', 1, 'right');
        }
        let y = 174;
        stext(ctx, 'STOCK', 48, y, '#40c0ff');
        WEAP.forEach((w, i) => stext(ctx, w.slice(0, 4) + ' ' + g.ammo[w], 48 + (i % 3) * 100, y + 12 + Math.floor(i / 3) * 10, '#ffffff'));
        stext(ctx, 'ARMOR ' + g.hp + '/' + g.P.hp + '  GUN ' + g.gun, 248, y + 22, '#ffffff');
        stext(ctx, 'UP/DOWN SELECT  SPACE BUY  ENTER LAUNCH', W / 2, 212, '#8090b0', 1, 'center');
        playerPlane(ctx, W - 40, 16, g.P, 0, false);
        if (g.msg) stext(ctx, g.msg.t, W / 2, 162, '#ffd040', 1, 'center');
      }
      function drawSelect(ctx) {
        R(ctx, 0, 0, W, H, '#0a1a3a');
        stext(ctx, 'SELECT YOUR AIRCRAFT', W / 2, 14, '#ffd040', 2, 'center');
        for (let i = 0; i < 3; i++) {
          const P = PLANES[i], x = 20 + i * 120, sel = i === selIdx;
          R(ctx, x, 40, 104, 150, sel ? '#20406a' : '#122440');
          if (sel && (mt & 16)) { ctx.strokeStyle = '#ffd040'; ctx.strokeRect(x + 0.5, 40.5, 103, 149); }
          ctx.save(); ctx.translate(x + 52, 74); ctx.scale(2, 2); playerPlane(ctx, 0, 0, P, 0, sel); ctx.restore();
          stext(ctx, P.n, x + 52, 100, '#ffffff', 1, 'center');
          ['SPEED', 'ARMOR', 'FIRE'].forEach((s, j) => { stext(ctx, s, x + 6, 118 + j * 12, '#40c0ff'); for (let k = 0; k < 5; k++) R(ctx, x + 50 + k * 9, 118 + j * 12, 7, 7, k < P.st[j] ? '#40e060' : '#203020'); });
          stext(ctx, P.desc[0], x + 52, 160, '#ffd040', 1, 'center'); stext(ctx, P.desc[1], x + 52, 172, '#ffd040', 1, 'center');
        }
        stext(ctx, 'LEFT/RIGHT CHOOSE   SPACE OR ENTER CONFIRM', W / 2, 200, '#ffffff', 1, 'center');
        stext(ctx, 'TIME ' + Math.max(0, Math.ceil((900 - selT) / 60)), W / 2, 212, '#ff6040', 1, 'center');
      }
      function drawTitle(ctx) {
        ctx.fillStyle = 'rgba(0,0,30,.5)'; ctx.fillRect(0, 0, W, H);
        stext(ctx, 'CARRIER', W / 2, 26, '#f0f0f0', 4, 'center');
        stext(ctx, 'AIR WING', W / 2, 60, '#ff3020', 4, 'center');
        R(ctx, 70, 92, W - 140, 2, '#ffd040');
        const t = mt % 600;
        if (t < 300) {
          stext(ctx, 'CANNON          SPACE', W / 2, 104, '#c0e0ff', 1, 'center');
          stext(ctx, 'SPECIAL WEAPON  X', W / 2, 115, '#c0e0ff', 1, 'center');
          stext(ctx, 'CHANGE WEAPON   Z', W / 2, 126, '#c0e0ff', 1, 'center');
        } else {
          stext(ctx, 'P CANNON UP   W WEAPONS   H REPAIR', W / 2, 104, '#ffffff', 1, 'center');
          stext(ctx, 'DESTROY THE BOSS AND RETURN', W / 2, 115, '#ffffff', 1, 'center');
          stext(ctx, 'TO THE CARRIER TO RE-ARM', W / 2, 126, '#ffffff', 1, 'center');
        }
        stext(ctx, 'HI SCORE ' + pad(hi, 8), W / 2, 144, '#ffd040', 1, 'center');
        if (coinFlash > 0) { if (coinFlash & 8) stext(ctx, 'INSERT COIN', W / 2, 166, '#ff4040', 1, 'center'); }
        else if ((mt >> 5) & 1) stext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, 166, '#ffffff', 1, 'center');
        stext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W / 2, 180, '#aaaaaa', 1, 'center');
        stext(ctx, '\u00a9 1990 CAPCOM', W / 2, 206, '#8090b0', 1, 'center');
      }

      // ---------------- host hooks ----------------
      let selIdx = 0, selT = 0;
      function update() {
        mt++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (!g || !g.demo) newRun(true, (Math.random() * 3) | 0);
          stepGame();
          if (mt > 2400) { mt = 0; newRun(true, (Math.random() * 3) | 0); }
          if (api.anyPressed('Enter', 'Space')) {
            if (api.useCredit()) { mode = 'select'; selT = 0; selIdx = 0; snd.sel(); }
            else { coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); }
          }
          return;
        }
        if (mode === 'select') {
          selT++;
          if (api.pressed('ArrowLeft')) { selIdx = (selIdx + 2) % 3; snd.sel(); }
          if (api.pressed('ArrowRight')) { selIdx = (selIdx + 1) % 3; snd.sel(); }
          if ((selT > 10 && api.anyPressed('Space', 'Enter', 'KeyX')) || selT > 900) { mode = 'game'; newRun(false, selIdx); }
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
        if (mode === 'select') { drawSelect(ctx); return; }
        if (!g) { R(ctx, 0, 0, W, H, '#0a1a3a'); drawTitle(ctx); return; }
        if (g.phase === 'shop') { drawShop(ctx); return; }
        drawPlay(ctx);
        if (mode === 'title') { drawTitle(ctx); return; }
        drawHUD(ctx);
        if (mode === 'over') { R(ctx, 0, 90, W, 40, 'rgba(0,0,0,.6)'); stext(ctx, 'GAME OVER', W / 2, 100, '#ff4040', 2, 'center'); }
      }

      if (api.debugHook) api.debugHook({ g: () => g, mode: () => mode });
      return { update, render, destroy() { } };
    }
  });
})();
