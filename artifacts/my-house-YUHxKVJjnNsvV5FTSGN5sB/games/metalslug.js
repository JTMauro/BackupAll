// Metal Slug (Nazca / SNK, 1996) \u2014 from-scratch recreation for the MAME32 Game Room.
// Run-and-gun with Marco: pistol and knife, Heavy Machine Gun / Rocket / Flame / Shotgun pickups, grenades,
// the SV-001 Metal Slug tank (vulcan + cannon), bearded POWs who hand over items, rebel soldiers who panic,
// tanks and helicopters, and a big mechanical boss at the end of each of the three missions.
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
  function otext(ctx, s, x, y, col, sc, align, oc) {
    const o = sc > 1 ? 2 : 1; oc = oc || '#000';
    text(ctx, s, x - o, y, oc, sc, align); text(ctx, s, x + o, y, oc, sc, align); text(ctx, s, x, y - o, oc, sc, align); text(ctx, s, x, y + o, oc, sc, align);
    text(ctx, s, x, y, col, sc, align);
  }
  function mkRng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // pixel sprites: rows of palette letters, compiled to horizontal runs (and a mirrored copy)
  function compile(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), r = [], f = [];
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (c === '.' || !pal[c]) { x++; continue; }
        let l = 1; while (row[x + l] === c) l++;
        r.push([pal[c], x, y, l]); f.push([pal[c], w - x - l, y, l]);
        x += l;
      }
    });
    return { w, h: rows.length, r, f };
  }
  function spr(ctx, s, x, y, flip, col) {
    const rr = flip ? s.f : s.r; x = Math.round(x); y = Math.round(y);
    let last = null;
    for (const q of rr) { const c = col || q[0]; if (c !== last) { ctx.fillStyle = c; last = c; } ctx.fillRect(x + q[1], y + q[2], q[3], 1); }
  }
  function disc(ctx, cx, cy, r, col) {
    ctx.fillStyle = col; r = Math.max(1, Math.round(r));
    for (let dy = -r; dy <= r; dy += 1) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1); }
  }

  const W = 304, H = 224;
  const TORSO = [
    '...kkkkk....',
    '..khhhhhk...',
    '.khhhhhhhk..',
    '.khHhhsssk..',
    '.khHhsskks..',
    '..kHsssssk..',
    '...kSsssk...',
    '..kvvwwvvk..',
    '.kvvVwwvvvk.',
    '.kvVvvvvvvk.',
    '.kvVvvvvvvk.',
    '.kvvVvvvvk..',
    '..kbbbbbbk..'];
  const STORSO = [
    '..kkkkkk....',
    '.khhhhhhk...',
    'khhhhhhhhk..',
    'kHHHHHHHHHk.',
    '.kSssskssk..',
    '..kssssssk..',
    '...kSsssk...',
    '..kvvvvvvk..',
    '.kvvVvvvvvk.',
    '.kvVvvvvvvk.',
    '.kvVvvvvvvk.',
    '.kvvVvvvvk..',
    '..kbbbbbbk..'];
  const LEGS = {
    stand: ['..kpppppk...', '..kppPppk...', '..kpPkpPk...', '..kpPkpPk...', '..kpPkpPk...', '..kpPkpPk...', '..kpPkpPk...', '..kddkddk...', '.kdddkdddk..', '.kkkkkkkkk..'],
    run1: ['..kpppppk...', '..kpPPppk...', '.kpPk.kpPk..', '.kpPk..kpPk.', 'kpPk....kpk.', 'kpPk....kddk', 'kddk....kddk', 'kdddk...kkk.', 'kkkk........', '............'],
    run2: ['..kpppppk...', '..kppPppk...', '..kpPkpPk...', '..kpPkkpPk..', '..kpPk.kpk..', '..kpPk.kddk.', '..kddk.kdk..', '.kdddk......', '.kkkkk......', '............'],
    run3: ['..kpppppk...', '..kpPPppk...', '..kpPk.kpk..', '.kpPk..kpPk.', '.kpk....kpPk', 'kddk....kpPk', 'kddk....kddk', '.kk.....kdddk', '........kkkk', '............'],
    jump: ['..kpppppk...', '.kpPPpppPk..', 'kpPk..kpPk..', 'kpPkkkpPk...', '.kddddddk...', '.kdddkkk....', '..kkk.......'],
    crouch: ['..kpppppk...', '.kpPPpppppk.', 'kpPk...kpPk.', 'kddk...kddk.', 'kdddk..kdddk', 'kkkkk..kkkkk']
  };
  const PMARCO = { k: '#1a1410', h: '#e0b048', H: '#a87828', s: '#f4c098', S: '#c88860', v: '#8c8c5a', V: '#5e6038', w: '#e8e0c8', p: '#3c5aa0', P: '#283c70', b: '#6a4a28', d: '#5a3a20' };
  const PSOLD = { k: '#141a0c', h: '#6a7a3a', H: '#4a5826', s: '#f0b890', S: '#c08860', v: '#7a8a50', V: '#56643a', p: '#6a7a48', P: '#4a5632', b: '#3a2a18', d: '#3a2a18' };
  const PPOW = { k: '#1a1008', s: '#f0b890', S: '#c08060', w: '#f8f8f0', b: '#6a3a18', r: '#c8a060' };
  const SP = {
    mt: compile(TORSO, PMARCO), st: compile(STORSO, PSOLD)
  };
  for (const k in LEGS) { SP['ml_' + k] = compile(LEGS[k], PMARCO); SP['sl_' + k] = compile(LEGS[k], PSOLD); }
  const POWSPR = {
    tied: compile(['.kk..kk.', '.kssssk.', '..krrk..', '..kssk..', '.kbbbbk.', 'kbbbbbbk', 'kbsssbbk', '.kbbbbk.', '.kssssk.', 'kssssssk', 'kSsssSsk', '.kwwwwk.', 'kwwwwwwk', 'kssk.kssk', 'ksskkkssk', '.kkkkkkk.'], PPOW),
    stand: compile(['..kbbbbk..', '.kbbbbbbk.', '.kbsksksk.', '.kbssssbk.', '..kbbbbk..', '...kbbk...', '..kssssk..', '.ksSsssSk.', 'kssksskssk', 'ks.kSSk.sk', 'ks.kwwk.sk', '..kwwwwk..', '..kskksk..', '..kskksk..', '..kskksk..', '.kssk.kssk', '.kkkk.kkkk'], PPOW),
    walk: compile(['..kbbbbk..', '.kbbbbbbk.', '.kbsksksk.', '.kbssssbk.', '..kbbbbk..', '...kbbk...', '..kssssk..', '.ksSsssSk.', 'kssksskssk', 'ks.kSSk.sk', 'ks.kwwk.sk', '..kwwwwk..', '.ksk..ksk.', '.ksk..ksk.', 'ksk....ksk', 'kssk..kssk', 'kkkk..kkkk'], PPOW),
    salute: compile(['..kbbbbk.ks', '.kbbbbbbkss', '.kbsksksks.', '.kbssssbk..', '..kbbbbk...', '...kbbk....', '..kssssk...', '.ksSsssSkk.', 'kssksskssk.', 'ks.kSSk....', 'ks.kwwk....', '..kwwwwk...', '..kskksk...', '..kskksk...', '..kskksk...', '.kssk.kssk.', '.kkkk.kkkk.'], PPOW)
  };

  // ======= missions =======
  const MNAMES = ['MISSION 1', 'MISSION 2', 'MISSION 3'];
  const MSUB = ['JUNGLE RIVER BASE', 'RUINED TOWN', 'SNOW MOUNTAIN PASS'];
  const BOSSN = ['TANI-OH FORTRESS', 'HAIRBUSTER RIBERTS', 'IRON NOKANA'];
  const LEN = 3300;

  ArcadeRegistry.register({
    id: 'metalslug', title: 'Metal Slug', year: 1996, maker: 'Nazca / SNK',
    width: W, height: H, vector: false, pointer: false,
    controls: 'Arrows: run / aim (Up: aim up, Down: crouch) \u00b7 Space: fire / knife \u00b7 X: jump \u00b7 Z or Down+X: grenade (slug cannon) \u00b7 Enter: start',
    marquee: { bg: '#2a1a08', fg: '#ffd030', accent: '#e02818' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', mt = 0, coinFlash = 0, overT = 0, frame = 0;
      let g = null;
      const snd = {
        pistol() { au.tone(620, 0.05, { type: 'square', vol: 0.07, slideTo: 180 }); au.noise(0.04, { vol: 0.06, freq: 2500 }); },
        hmg() { au.noise(0.05, { vol: 0.09, freq: 1800, type: 'bandpass' }); au.tone(220, 0.03, { type: 'square', vol: 0.05 }); },
        rocket() { au.noise(0.25, { vol: 0.08, freq: 900, slideTo: 3000 }); },
        flame() { au.noise(0.3, { vol: 0.1, freq: 500, slideTo: 1400 }); },
        shotgun() { au.noise(0.25, { vol: 0.2, freq: 1400, slideTo: 200 }); au.tone(110, 0.15, { type: 'square', vol: 0.1, slideTo: 50 }); },
        knife() { au.noise(0.06, { vol: 0.1, freq: 6000, type: 'highpass' }); },
        jump() { au.tone(260, 0.06, { type: 'triangle', vol: 0.06, slideTo: 420 }); },
        toss() { au.tone(500, 0.12, { type: 'triangle', vol: 0.07, slideTo: 900 }); },
        boom() { au.noise(0.5, { vol: 0.22, freq: 1200, slideTo: 50 }); au.tone(80, 0.3, { type: 'sine', vol: 0.15, slideTo: 30 }); },
        bigboom() { au.noise(1.0, { vol: 0.25, freq: 900, slideTo: 40 }); au.tone(60, 0.7, { type: 'sine', vol: 0.18, slideTo: 25 }); },
        scream() { au.tone(880 + Math.random() * 200, 0.32, { type: 'sawtooth', vol: 0.06, slideTo: 420 }); },
        panic() { au.tone(1100, 0.12, { type: 'sawtooth', vol: 0.05, slideTo: 1500 }); au.tone(1300, 0.14, { type: 'sawtooth', vol: 0.05, slideTo: 900, delay: 0.12 }); },
        eshot() { au.tone(400, 0.05, { type: 'square', vol: 0.05, slideTo: 200 }); },
        hit() { au.tone(1500, 0.02, { type: 'square', vol: 0.04 }); },
        clank() { au.tone(2400, 0.03, { type: 'square', vol: 0.05, slideTo: 1800 }); },
        item() { au.melody([[880, 0.05], [1175, 0.05], [1760, 0.1]], { type: 'square', vol: 0.12 }); },
        weapon() { au.melody([[523, 0.06], [784, 0.06], [1047, 0.06], [784, 0.06], [1047, 0.16]], { type: 'square', vol: 0.12 }); },
        thanks() { au.melody([[660, 0.08], [880, 0.08], [990, 0.16]], { type: 'triangle', vol: 0.14 }); },
        die() { au.tone(700, 0.5, { type: 'sawtooth', vol: 0.09, slideTo: 150 }); },
        slugIn() { au.melody([[392, 0.08], [523, 0.08], [659, 0.08], [784, 0.2]], { type: 'square', vol: 0.12 }); },
        cannon() { au.noise(0.3, { vol: 0.16, freq: 700, slideTo: 80 }); au.tone(140, 0.2, { type: 'square', vol: 0.1, slideTo: 60 }); },
        start() { au.melody([[392, 0.1], [392, 0.1], [523, 0.15], [0, 0.05], [494, 0.1], [523, 0.1], [659, 0.3]], { type: 'square', vol: 0.12 }); },
        clear() { au.melody([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.2], [0, 0.06], [784, 0.12], [1047, 0.5]], { type: 'square', vol: 0.13 }); },
        alarm() { au.tone(660, 0.18, { type: 'square', vol: 0.09 }); au.tone(440, 0.18, { type: 'square', vol: 0.09, delay: 0.2 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.15 }); return false;
      }

      // ---------- level geometry ----------
      function buildMission(m, loop) {
        const r = mkRng(777 + m * 101 + loop * 13);
        const pts = [[-200, 188], [260, 188]];
        let x = 260, y = 188;
        while (x < LEN - 640) {
          const len = 80 + (r() * 90 | 0);
          let ny = y;
          if (r() < 0.55) ny = clamp(y + (r() < 0.5 ? -1 : 1) * (10 + (r() * 22 | 0)), 150, 194);
          x += len; pts.push([x, ny]);
          x += 50 + (r() * 140 | 0); pts.push([x, ny]); y = ny;
        }
        pts.push([LEN - 560, 188]); pts.push([LEN + 600, 188]);
        const lvl = { pts, plats: [], ev: [], m, loop };
        const gy = (xx) => groundOf(lvl, xx);
        // platforms (one-way ledges / sandbag walls / wooden decks)
        for (let px = 500; px < LEN - 700; px += 180 + (r() * 220 | 0)) {
          const w = 40 + (r() * 50 | 0);
          let top = 999; for (let k = 0; k <= w; k += 4) top = Math.min(top, gy(px + k));
          lvl.plats.push({ x: px, w, y: top - (r() < 0.5 ? 26 : 40) });
        }
        const ev = lvl.ev;
        const add = (x, t, o) => ev.push(Object.assign({ x, t }, o || {}));
        add(W + 20, 'squad', { n: 2, idle: 'chat' });
        add(W + 90, 'squad', { n: 1, idle: 'sleep' });
        for (let ex = 440; ex < LEN - 700; ex += 100 + (r() * 90 | 0)) {
          const k = r();
          if (k < 0.32) add(ex, 'squad', { n: 1 + (r() * 3 | 0), idle: ['chat', 'squat', 'sleep'][r() * 3 | 0] });
          else if (k < 0.58) add(ex, 'rush', { n: 2 + (r() * 2 | 0) + Math.min(2, loop) });
          else if (k < 0.66) add(ex, 'behind', { n: 2 });
          else if (k < 0.76 && ex > 700) add(ex, 'tank');
          else if (k < 0.86 && ex > 900) add(ex, 'heli');
          else add(ex, 'squad', { n: 2, idle: 'squat', kind: 'gren' });
        }
        for (const px of [560, 1180, 1720, 2280, 2620]) add(px + (r() * 60 | 0), 'pow');
        add(m === 0 ? 820 : m === 1 ? 600 : 700, 'slug');
        add(1450, 'lock', { waves: [['rush', 3], ['rush', 2, 'gren'], m >= 1 ? ['heli'] : ['tank']] });
        add(2450, 'lock', { waves: [['rush', 3, 'baz'], ['tank'], ['rush', 4]] });
        add(LEN, 'boss');
        ev.sort((a, b) => a.x - b.x);
        return lvl;
      }
      function groundOf(lvl, x) {
        const p = lvl.pts;
        let lo = 0, hiI = p.length - 1;
        if (x <= p[0][0]) return p[0][1];
        if (x >= p[hiI][0]) return p[hiI][1];
        while (hiI - lo > 1) { const mid = (lo + hiI) >> 1; if (p[mid][0] <= x) lo = mid; else hiI = mid; }
        const a = p[lo], b = p[hiI];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / Math.max(1, b[0] - a[0]);
      }
      const groundY = x => groundOf(g.lvl, x);
      function floorAt(x, y) {
        let best = groundY(x);
        for (const p of g.lvl.plats) if (x >= p.x && x <= p.x + p.w && p.y >= y - 2 && p.y < best) best = p.y;
        return best;
      }

      // ---------- game setup ----------
      function newGame() {
        g = { score: 0, lives: 3, loop: 0, mission: 0, rescued: 0, parts: [], over: false };
        startMission(); snd.start();
      }
      function startMission() {
        g.lvl = buildMission(g.mission, g.loop);
        g.cam = 0; g.lockCam = null; g.waves = null; g.waveT = 0; g.evi = 0;
        g.ens = []; g.pb = []; g.eb = []; g.items = []; g.pows = []; g.slugs = []; g.fx = []; g.boss = null;
        g.phase = 'play'; g.pt = 0; g.bossPending = 0; g.timer = 60; g.tick = 0; g.msgT = 150; g.goT = 0; g.shake = 0; g.missionRescued = 0;
        g.p = mkPlayer(60, -10);
        g.p.inv = 60;
      }
      function mkPlayer(x, y) {
        return { x, y, vx: 0, vy: 0, face: 1, ground: false, crouch: false, aim: 'f', wpn: 'P', ammo: 0, bombs: 10, fireCd: 0, anim: 0, dead: 0, inv: 120, slug: null, knife: 0, throwT: 0, shootT: 0 };
      }
      function addScore(n) { g.score += n; if (g.score > hi) hi = g.score; }
      function fxText(s, x, y, c) { g.fx.push({ k: 'txt', s, x, y, t: 50, c: c || '#fff' }); }
      function boomFx(x, y, r) {
        g.fx.push({ k: 'boom', x, y, t: 0, max: 22 + r * 0.4, r });
        for (let i = 0; i < 3 + (r / 6 | 0); i++) {
          const a = Math.random() * 6.28, s = 0.5 + Math.random() * 2;
          g.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, t: 20 + Math.random() * 20, c: Math.random() < 0.5 ? '#ffd040' : '#6a5a48', grav: 0.1 });
        }
        g.shake = Math.max(g.shake, Math.min(10, r / 4));
      }

      // ---------- spawning ----------
      function mkSoldier(x, st, kind, idle) {
        const e = { t: 'sold', x, y: groundY(x), vx: 0, vy: 0, face: -1, st, kind: kind || (Math.random() < 0.2 ? 'gren' : Math.random() < 0.12 ? 'baz' : 'rifle'), idle: idle || 'chat', tm: 0, hp: 1, pref: 50 + Math.random() * 80, cd: 50 + Math.random() * 80, anim: Math.random() * 40 | 0, ground: true };
        if (st === 'idle') e.face = Math.random() < 0.5 ? 1 : -1;
        g.ens.push(e); return e;
      }
      function spawnWave(w) {
        const right = g.cam + W + 16;
        if (w[0] === 'rush') for (let i = 0; i < w[1]; i++) mkSoldier(right + i * 22, 'run', w[2]);
        else if (w[0] === 'tank') mkTank(right + 20);
        else if (w[0] === 'heli') mkHeli();
      }
      function mkTank(x) { g.ens.push({ t: 'tank', x, y: groundY(x), vx: 0, vy: 0, face: -1, hp: 22 + g.loop * 6, cd: 100, anim: 0, flash: 0 }); }
      function mkHeli() { g.ens.push({ t: 'heli', x: g.cam + W + 40, y: 40, vx: -1, hp: 14 + g.loop * 4, cd: 120, anim: 0, flash: 0, st: 'fly', ph: Math.random() * 6 }); }
      function runEvents() {
        const ev = g.lvl.ev;
        while (g.evi < ev.length && g.cam + W + 30 >= ev[g.evi].x) {
          const e = ev[g.evi++];
          if (e.t === 'squad') {
            for (let i = 0; i < e.n; i++) {
              const s = mkSoldier(e.x + i * 18, 'idle', e.kind, e.idle);
              if (e.idle === 'chat') s.face = i % 2 ? -1 : 1;
            }
            if (e.idle === 'squat') g.fx.push({ k: 'fire', x: e.x + e.n * 9 - 9, y: groundY(e.x + e.n * 9), t: 1e9 });
          } else if (e.t === 'rush') for (let i = 0; i < e.n; i++) mkSoldier(e.x + 20 + i * 20, 'run');
          else if (e.t === 'behind') for (let i = 0; i < e.n; i++) { const s = mkSoldier(g.cam - 20 - i * 20, 'run'); s.face = 1; }
          else if (e.t === 'tank') mkTank(e.x + 30);
          else if (e.t === 'heli') mkHeli();
          else if (e.t === 'pow') g.pows.push({ x: e.x, y: groundY(e.x), st: 'tied', tm: 0, anim: 0 });
          else if (e.t === 'slug') g.slugs.push({ x: e.x, y: groundY(e.x) - 30, vx: 0, vy: 0, st: 'park', hp: 3, ang: 0, face: 1, can: 10, inv: 0, fcd: 0, ccd: 0, ground: false });
          else if (e.t === 'lock') { g.lockCam = e.x - W; g.waves = e.waves.slice(); g.waveT = 40; }
          else if (e.t === 'boss') { g.lockCam = LEN - W; g.waves = null; g.bossPending = 60; }
        }
      }

      // ---------- player ----------
      function nearMelee(p) {
        for (const e of g.ens) {
          if (e.t !== 'sold' || e.st === 'die') continue;
          const dx = (e.x - p.x) * p.face;
          if (dx > -6 && dx < 22 && Math.abs(e.y - p.y) < 20) return e;
        }
        return null;
      }
      function muzzle(p) {
        if (p.aim === 'u') return { x: p.x + p.face * 2, y: p.y - 34, vx: 0, vy: -1 };
        if (p.aim === 'd') return { x: p.x + p.face * 1, y: p.y + 2, vx: 0, vy: 1 };
        return { x: p.x + p.face * (p.wpn === 'P' ? 15 : 19), y: p.y - (p.crouch ? 10 : 16), vx: p.face, vy: 0 };
      }
      function fire(p) {
        const m = nearMelee(p);
        if (m && p.aim === 'f') { p.knife = 14; p.fireCd = 14; snd.knife(); killEnemy(m, 'knife'); addScore(100); return; }
        const mz = muzzle(p);
        p.shootT = 6;
        if (p.wpn === 'P') { g.pb.push({ k: 'p', x: mz.x, y: mz.y, vx: mz.vx * 6, vy: mz.vy * 6, dmg: 1, life: 60 }); p.fireCd = 9; snd.pistol(); }
        else if (p.wpn === 'H') {
          const s = (Math.random() - 0.5) * 0.7;
          g.pb.push({ k: 'h', x: mz.x, y: mz.y + (mz.vy ? 0 : s * 4), vx: mz.vx * 7 + (mz.vy ? s : 0), vy: mz.vy * 7 + (mz.vx ? s * 0.5 : 0), dmg: 1, life: 60 });
          p.fireCd = 4; snd.hmg(); useAmmo(p);
        } else if (p.wpn === 'R') {
          g.pb.push({ k: 'r', x: mz.x, y: mz.y, vx: mz.vx * 1.2, vy: mz.vy * 1.2, dx: mz.vx, dy: mz.vy, dmg: 5, life: 120 });
          p.fireCd = 22; snd.rocket(); useAmmo(p);
        } else if (p.wpn === 'F') {
          g.pb.push({ k: 'f', x: mz.x, y: mz.y, vx: mz.vx * 3.4, vy: mz.vy * 3.4, dmg: 3, life: 40, hit: [] });
          p.fireCd = 16; snd.flame(); useAmmo(p);
        } else if (p.wpn === 'S') {
          g.fx.push({ k: 'blast', x: mz.x, y: mz.y, dx: mz.vx, dy: mz.vy, t: 14 });
          const x0 = mz.vx ? Math.min(mz.x, mz.x + mz.vx * 70) : mz.x - 18, x1 = mz.vx ? Math.max(mz.x, mz.x + mz.vx * 70) : mz.x + 18;
          const y0 = mz.vy ? Math.min(mz.y, mz.y + mz.vy * 70) : mz.y - 16, y1 = mz.vy ? Math.max(mz.y, mz.y + mz.vy * 70) : mz.y + 16;
          for (const e of g.ens.slice()) { const b = boxOf(e); if (b && b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0) hurt(e, 8, 'shot'); }
          p.fireCd = 26; snd.shotgun(); useAmmo(p); g.shake = 3;
        }
      }
      function useAmmo(p) { if (--p.ammo <= 0) { p.wpn = 'P'; p.ammo = 0; } }
      function throwGrenade(p) {
        if (p.bombs <= 0 || g.pb.filter(b => b.k === 'g').length >= 2) return;
        p.bombs--; p.throwT = 12; snd.toss();
        g.pb.push({ k: 'g', x: p.x + p.face * 4, y: p.y - 22, vx: p.face * 2.3 + p.vx * 0.5, vy: -3.2, dmg: 6, life: 300, bounce: 0, spin: 0 });
      }
      function updPlayer() {
        const p = g.p;
        if (p.inv > 0) p.inv--;
        if (p.knife > 0) p.knife--;
        if (p.throwT > 0) p.throwT--;
        if (p.shootT > 0) p.shootT--;
        if (p.dead) {
          p.dead++; p.vy = Math.min(5, p.vy + 0.2); p.y += p.vy; p.x -= p.face * 0.6;
          const f = floorAt(p.x, p.y - 4); if (p.y > f) { p.y = f; p.vy = 0; }
          if (p.dead === 100) afterDeath();
          return;
        }
        if (p.slug) { updSlugDriven(p, p.slug); return; }
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        let mv = 0; if (L && !R) mv = -1; if (R && !L) mv = 1;
        p.crouch = D && p.ground;
        if (mv) p.face = mv;
        const sp = p.crouch ? 0.6 : (p.wpn === 'H' || p.wpn === 'R' ? 1.15 : 1.3);
        p.vx = mv * sp;
        p.aim = U ? 'u' : (D && !p.ground ? 'd' : 'f');
        const xP = api.pressed('KeyX');
        if (api.pressed('KeyZ') || (xP && D && p.ground)) throwGrenade(p);
        else if (xP && p.ground) { p.vy = -4.3; p.ground = false; snd.jump(); }
        p.x = clamp(p.x + p.vx, g.cam + 6, g.cam + W - 8);
        if (mv) p.anim++;
        p.vy = Math.min(p.vy + 0.2, 5);
        const f = floorAt(p.x, p.y), ny = p.y + p.vy;
        if (p.vy >= 0 && (ny >= f || (p.ground && f - p.y < 5))) { if (!p.ground && p.vy > 1) au.tone(120, 0.03, { type: 'square', vol: 0.04 }); p.y = f; p.vy = 0; p.ground = true; }
        else { p.y = ny; p.ground = false; }
        if (p.fireCd > 0) p.fireCd--;
        if ((api.pressed('Space') && p.fireCd <= (p.wpn === 'P' ? 4 : 0)) || (api.key('Space') && p.fireCd <= 0)) fire(p);
        // board a parked slug
        for (const s of g.slugs) {
          if (s.st !== 'park') continue;
          if (Math.abs(s.x - p.x) < 14 && p.y > s.y - 34 && p.y < s.y + 4 && (p.vy > 0 || !p.ground || Math.abs(s.x - p.x) < 10)) {
            p.slug = s; s.st = 'drive'; s.face = p.face; s.ang = p.face > 0 ? 0 : Math.PI; s.hp = 3; s.inv = 30;
            snd.slugIn(); fxText('METAL SLUG!', s.x, s.y - 44, '#ffd040');
          }
        }
      }
      function updSlugDriven(p, s) {
        const L = api.key('ArrowLeft'), R = api.key('ArrowRight'), U = api.key('ArrowUp'), D = api.key('ArrowDown');
        let mv = 0; if (L && !R) mv = -1; if (R && !L) mv = 1;
        if (mv) { s.face = mv; p.anim++; }
        s.vx = mv * 1.45;
        s.x = clamp(s.x + s.vx, g.cam + 18, g.cam + W - 18);
        const xP = api.pressed('KeyX');
        if (api.pressed('KeyZ') || (xP && D)) {
          if (s.can > 0 && s.ccd <= 0) {
            s.can--; s.ccd = 24; snd.cannon();
            g.pb.push({ k: 'c', x: s.x + s.face * 14, y: s.y - 24, vx: s.face * 3.4, vy: -1.6, dmg: 12, life: 200 });
          }
        } else if (xP && s.ground) { s.vy = -3.8; s.ground = false; snd.jump(); }
        if (s.ccd > 0) s.ccd--;
        let ta = null;
        if (U && R) ta = -Math.PI / 4; else if (U && L) ta = -Math.PI * 3 / 4; else if (U) ta = -Math.PI / 2;
        else if (R) ta = 0; else if (L) ta = Math.PI; else if (D && !s.ground) ta = Math.PI / 2;
        if (ta != null) {
          let d = ta - s.ang; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          s.ang += clamp(d, -0.14, 0.14);
        }
        physSlug(s);
        if (s.fcd > 0) s.fcd--;
        if (api.key('Space') && s.fcd <= 0) {
          s.fcd = 4; snd.hmg();
          const vx = Math.cos(s.ang), vy = Math.sin(s.ang), ox = s.x + vx * 14, oy = s.y - 20 + vy * 10;
          g.pb.push({ k: 'h', x: ox, y: oy, vx: vx * 7 + (Math.random() - 0.5) * 0.4, vy: vy * 7 + (Math.random() - 0.5) * 0.4, dmg: 1, life: 60 });
        }
        if (s.inv > 0) s.inv--;
        p.x = s.x; p.y = s.y; p.face = s.face;
        // crush soldiers on landing
        if (s.vy > 1) for (const e of g.ens) if (e.t === 'sold' && e.st !== 'die' && Math.abs(e.x - s.x) < 16 && Math.abs(e.y - s.y) < 10) { killEnemy(e, 'crush'); addScore(100); }
      }
      function physSlug(s) {
        s.vy = Math.min(s.vy + 0.2, 5);
        const f = floorAt(s.x, s.y), ny = s.y + s.vy;
        if (s.vy >= 0 && (ny >= f || (s.ground && f - s.y < 5))) { s.y = f; s.vy = 0; s.ground = true; } else { s.y = ny; s.ground = false; }
      }
      function hurtPlayer() {
        const p = g.p;
        if (p.dead || p.inv > 0 || g.phase !== 'play') return;
        if (p.slug) {
          const s = p.slug; if (s.inv > 0) return;
          s.hp--; s.inv = 70; snd.clank(); g.shake = 4;
          if (s.hp <= 0) {
            p.slug = null; s.st = 'dying'; s.tm = 50; p.vy = -4.5; p.ground = false; p.inv = 100;
            snd.alarm(); fxText('EJECT!', s.x, s.y - 40, '#ff6040');
          }
          return;
        }
        p.dead = 1; p.vy = -2.5; snd.die();
      }
      function afterDeath() {
        g.lives--;
        if (g.lives <= 0) {
          const cg = g;
          const end = () => { if (g !== cg) return; api.setHiScore(g.score); mode = 'over'; overT = 300; au.melody([[392, 0.25], [349, 0.25], [311, 0.25], [262, 0.6]], { type: 'square', vol: 0.12 }); };
          g.p.dead = 101;
          if (api.offerContinue) api.offerContinue(() => { if (g !== cg) return; g.lives = 3; respawn(); }, end);
          else end();
        } else respawn();
      }
      function respawn() {
        const np = mkPlayer(g.cam + 50, -20); np.inv = 150; g.p = np; g.timer = 60; g.tick = 0;
      }

      // ---------- enemies ----------
      function boxOf(e) {
        switch (e.t) {
          case 'sold': return e.st === 'die' ? null : e.st === 'idle' && e.idle === 'sleep' ? [e.x - 10, e.y - 8, e.x + 10, e.y] : [e.x - 6, e.y - 23, e.x + 6, e.y];
          case 'tank': return [e.x - 22, e.y - 26, e.x + 22, e.y];
          case 'heli': return e.st === 'fall' ? null : [e.x - 20, e.y - 8, e.x + 20, e.y + 10];
          case 'msl': return [e.x - 5, e.y - 3, e.x + 5, e.y + 3];
          case 'boss1': return e.rise > 0 ? null : [e.x - 40, e.y - 130, e.x + 40, e.y];
          case 'boss2': return [e.x - 40, e.y - 12, e.x + 40, e.y + 14];
          case 'boss3': return [e.x - 48, e.y - 56, e.x + 48, e.y - 8];
        }
        return null;
      }
      function hurt(e, dmg, how) {
        if (e.hp <= 0) return;
        if (e.t === 'sold') { killEnemy(e, how); addScore(100); return; }
        e.hp -= dmg; e.flash = 4;
        if (e.hp <= 0) killEnemy(e, how); else snd.hit();
      }
      function killEnemy(e, how) {
        if (e.t === 'sold') {
          e.st = 'die'; e.tm = 60; e.hp = 0; snd.scream();
          if (how === 'blast') { e.vy = -3.2; e.vx = (Math.random() < 0.5 ? -1 : 1) * 1.2; e.ground = false; }
          else if (how === 'knife') { e.vy = 0; e.vx = 0; e.slashed = 1; }
          else if (how === 'fire') { e.burn = 1; e.vx = 0; }
          else { e.vy = -1.2; e.vx = -e.face * 0.6; e.ground = false; }
          return;
        }
        e.hp = 0;
        if (e.t === 'tank') { boomFx(e.x, e.y - 14, 28); snd.boom(); addScore(1000); fxText('1000', e.x, e.y - 30); e.dead = true; }
        else if (e.t === 'heli') { e.st = 'fall'; e.vy = 0; snd.boom(); addScore(1000); fxText('1000', e.x, e.y - 14); }
        else if (e.t === 'msl') { boomFx(e.x, e.y, 10); addScore(100); e.dead = true; }
        else if (e.t.startsWith('boss')) {
          addScore(30000 + g.mission * 10000); g.phase = 'bossdie'; g.pt = 0; e.dying = 1; snd.bigboom();
        }
      }
      function nearestEnemy(x, y) {
        let best = null, bd = 1e9;
        for (const e of g.ens) { const b = boxOf(e); if (!b) continue; const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, d = (cx - x) ** 2 + (cy - y) ** 2; if (d < bd) { bd = d; best = { x: cx, y: cy }; } }
        return best;
      }
      function explode(x, y, r, dmg, byPlayer) {
        boomFx(x, y, r); snd.boom();
        if (byPlayer) {
          for (const e of g.ens.slice()) {
            const b = boxOf(e); if (!b) continue;
            const cx = clamp(x, b[0], b[2]), cy = clamp(y, b[1], b[3]);
            if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) hurt(e, dmg, 'blast');
          }
          for (const pw of g.pows) if (pw.st === 'tied' && Math.abs(pw.x - x) < r && Math.abs(pw.y - 10 - y) < r) freePow(pw);
          // panic nearby soldiers
          for (const e of g.ens) if (e.t === 'sold' && e.st !== 'die' && e.st !== 'idle' && Math.abs(e.x - x) < 70) { e.st = 'flee'; e.tm = 40; }
        } else {
          const p = g.p;
          if (!p.dead && Math.abs(p.x - x) < r * 0.8 + 6 && p.y - 12 - y < r && y - p.y < r * 0.6) hurtPlayer();
        }
      }
      function eFire(e, k, x, y, vx, vy) { g.eb.push({ k, x, y, vx, vy, life: 300 }); }
      function updEnemies() {
        const p = g.p, lp = g.loop, dif = 1 + lp * 0.25 + g.mission * 0.12;
        for (const e of g.ens) {
          if (e.flash > 0) e.flash--;
          e.anim++;
          const dx = p.x - e.x;
          if (e.t === 'sold') {
            if (e.st === 'die') {
              e.tm--; if (!e.ground) { e.vy += 0.2; e.x += e.vx; e.y += e.vy; const f = groundY(e.x); if (e.y >= f) { e.y = f; e.ground = true; e.vx = 0; } }
              if (e.tm <= 0) e.dead = true; continue;
            }
            if (e.st === 'idle') {
              const aware = Math.abs(dx) < 120 || e.x < g.cam + W - 30 && Math.abs(dx) < 160 && p.shootT > 0;
              if (aware && !p.dead) { e.st = 'panic'; e.tm = 34; e.vy = -2.2; e.ground = false; e.face = dx > 0 ? 1 : -1; snd.panic(); fxText('!', e.x, e.y - 34, '#ff4040'); }
            } else if (e.st === 'panic') {
              if (--e.tm <= 0) e.st = 'run';
            } else if (e.st === 'run') {
              e.face = dx > 0 ? 1 : -1;
              const tx = p.x - e.face * e.pref, d = tx - e.x;
              const spd = 0.9 * Math.min(1.6, dif);
              e.vx = Math.abs(d) > 4 ? Math.sign(d) * spd : 0;
              if (e.x > g.cam + W - 10 && e.vx >= 0) e.vx = -spd;
              e.x += e.vx;
              if (--e.cd <= 0 && e.x > g.cam + 4 && e.x < g.cam + W - 4 && !p.dead) { e.st = 'atk'; e.tm = 32; e.vx = 0; }
            } else if (e.st === 'atk') {
              e.face = dx > 0 ? 1 : -1;
              e.tm--;
              if (e.tm === 12) {
                if (e.kind === 'rifle') { eFire(e, 'b', e.x + e.face * 12, e.y - 15, e.face * 1.7 * Math.min(1.5, dif), 0); snd.eshot(); }
                else if (e.kind === 'gren') { const t = 55; eFire(e, 'gr', e.x, e.y - 22, clamp(dx / t, -2.4, 2.4), -3); snd.toss(); }
                else { eFire(e, 'rk', e.x + e.face * 12, e.y - 16, e.face * 2.2, 0); snd.rocket(); }
              }
              if (e.tm <= 0) { e.st = Math.random() < 0.15 ? 'flee' : 'run'; e.tm = 40; e.cd = (100 + Math.random() * 90) / dif; e.pref = 40 + Math.random() * 100; }
            } else if (e.st === 'flee') {
              e.face = dx > 0 ? -1 : 1; e.x += e.face * 1.5;
              if (--e.tm <= 0) { e.st = 'run'; e.cd = 30; }
            }
            if (!e.ground || e.vy) { e.vy += 0.2; e.y += e.vy; const f = groundY(e.x); if (e.y >= f) { e.y = f; e.vy = 0; e.ground = true; } }
            else e.y = groundY(e.x);
            if (e.x < g.cam - 50 || e.x > g.cam + W + 400) e.dead = true;
            // touching player in melee range doesn't kill; but slug-ramming does nothing (crush handled on landing)
          } else if (e.t === 'tank') {
            if (e.dead) continue;
            e.face = dx > 0 ? 1 : -1;
            const want = p.x - e.face * 120, d = want - e.x;
            e.vx = Math.abs(d) > 10 ? Math.sign(d) * 0.5 : 0;
            if (e.x > g.cam + W - 26 && e.vx > 0) e.vx = 0;
            if (e.x > g.cam + W - 20) e.vx = -0.6;
            e.x += e.vx; e.y = groundY(e.x);
            if (--e.cd <= 0) {
              e.cd = (150 + Math.random() * 60) / dif;
              const t = 60; eFire(e, 'sh', e.x + e.face * 26, e.y - 22, clamp(dx / t, -3.2, 3.2), -2.2); snd.cannon();
            }
            if (!p.dead && !p.slug && Math.abs(dx) < 22 && p.y > e.y - 26) hurtPlayer();
            if (e.x < g.cam - 60) e.dead = true;
          } else if (e.t === 'heli') {
            if (e.st === 'fall') {
              e.vy += 0.1; e.y += e.vy; e.x += -0.8; if (e.anim % 4 === 0) g.parts.push({ x: e.x, y: e.y, vx: 0, vy: -0.5, t: 30, c: '#555', grav: -0.01 });
              if (e.y >= groundY(e.x) - 6) { explode(e.x, e.y, 30, 0, false); e.dead = true; }
              continue;
            }
            const tx = p.x + Math.sin(e.anim * 0.02 + e.ph) * 50;
            e.x += clamp(tx - e.x, -1.1, 1.1); e.x = clamp(e.x, g.cam + 20, g.cam + W + 60);
            e.y = 40 + Math.sin(e.anim * 0.05) * 6;
            if (--e.cd <= 0 && Math.abs(dx) < 50) { e.cd = 90 / dif; eFire(e, 'bomb', e.x, e.y + 10, 0, 0.5); au.tone(900, 0.2, { type: 'triangle', vol: 0.05, slideTo: 300 }); }
          } else if (e.t === 'msl') {
            const a = Math.atan2(p.y - 14 - e.y, p.x - e.x); e.ang += clamp(((a - e.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -0.04, 0.04);
            e.x += Math.cos(e.ang) * 1.7; e.y += Math.sin(e.ang) * 1.7;
            if (e.anim % 3 === 0) g.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, t: 14, c: '#aaa' });
            if (Math.abs(p.x - e.x) < 8 && Math.abs(p.y - 14 - e.y) < 14) { explode(e.x, e.y, 14, 0, false); e.dead = true; }
            if (e.y >= groundY(e.x) || e.anim > 400) { explode(e.x, e.y, 14, 0, false); e.dead = true; }
          } else if (e.t === 'boss1') updBoss1(e, dif);
          else if (e.t === 'boss2') updBoss2(e, dif);
          else if (e.t === 'boss3') updBoss3(e, dif);
        }
        g.ens = g.ens.filter(e => !e.dead);
      }

      // ---------- bosses ----------
      function spawnBoss() {
        const m = g.mission, hp = (m === 0 ? 170 : m === 1 ? 210 : 260) + g.loop * 60;
        let b;
        if (m === 0) b = { t: 'boss1', x: LEN - 54, y: 188, hp, max: hp, tm: 0, ph: 0, cd: 80, ang: Math.PI, flash: 0, anim: 0, flame: 0, rise: 120 };
        else if (m === 1) b = { t: 'boss2', x: LEN - W / 2, y: -40, hp, max: hp, tm: 0, ph: 0, cd: 80, dir: -1, flash: 0, anim: 0 };
        else b = { t: 'boss3', x: LEN + 60, y: 188, hp, max: hp, tm: 0, ph: 0, cd: 90, flash: 0, anim: 0, home: LEN - 70 };
        g.ens.push(b); g.boss = b; snd.alarm();
      }
      function updBoss1(b, dif) {
        const p = g.p;
        if (b.rise > 0) { b.rise--; g.shake = 2; return; }
        if (b.dying) return;
        b.tm++;
        const cx = b.x - 4, cy = b.y - 92;
        const ta = Math.atan2(p.y - 16 - cy, p.x - cx);
        let d = ta - b.ang; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        b.ang += clamp(d, -0.02, 0.02); b.ang = clamp(b.ang, Math.PI * 0.55, Math.PI * 1.25);
        const cyc = b.tm % 600;
        if (cyc < 240) {
          if (cyc % Math.round(70 / dif) === 0) {
            for (const o of [-0.18, 0, 0.18]) eFire(b, 'big', cx + Math.cos(b.ang) * 30, cy + Math.sin(b.ang) * 30, Math.cos(b.ang + o) * 1.8, Math.sin(b.ang + o) * 1.8);
            snd.cannon();
          }
        } else if (cyc < 380) {
          if (cyc === 250) snd.alarm();
          if (cyc > 280 && cyc < 360) { b.flame = Math.min(150, b.flame + 4); if (cyc % 6 === 0) snd.flame(); }
        } else if (cyc < 600) {
          b.flame = Math.max(0, b.flame - 6);
          if (cyc % Math.round(14 / dif) === 0 && cyc < 520) {
            const a = Math.PI + Math.sin(cyc * 0.06) * 0.5; eFire(b, 'b', b.x - 36, b.y - 52, Math.cos(a) * 2, Math.sin(a) * 2); snd.eshot();
          }
          if (cyc === 540 && g.ens.length < 8) for (let i = 0; i < 2; i++) mkSoldier(b.x - 40 - i * 16, 'run');
        }
        if (cyc >= 380) b.flame = Math.max(0, b.flame - 6);
        if (b.flame > 0 && !p.dead) { const fx0 = b.x - 40 - b.flame; if (p.x > fx0 && p.x < b.x - 30 && p.y > b.y - 14) hurtPlayer(); }
        if (!p.dead && p.x > b.x - 34) { if (p.slug) p.slug.x = b.x - 52; else p.x = b.x - 40; }
      }
      function updBoss2(b, dif) {
        const p = g.p;
        if (b.dying) { b.y += 0.6; b.x += b.dir * 0.8; return; }
        b.tm++;
        if (b.y < 46) b.y += 0.5;
        b.x += b.dir * (0.7 + 0.2 * dif);
        if (b.x < g.cam + 60) b.dir = 1; if (b.x > g.cam + W - 60) b.dir = -1;
        const cyc = b.tm % 420;
        if (cyc < 160) { if (cyc % Math.round(22 / dif) === 0) { eFire(b, 'bomb', b.x + (Math.random() - 0.5) * 30, b.y + 14, b.dir * 0.4, 0.5); } }
        else if (cyc < 320) {
          if (cyc % Math.round(36 / dif) === 0) for (const ox of [-34, 34]) { const a = Math.atan2(p.y - 16 - b.y, p.x - b.x - ox); eFire(b, 'b', b.x + ox, b.y + 8, Math.cos(a) * 1.8, Math.sin(a) * 1.8); snd.eshot(); }
        } else if (cyc === 340 || cyc === 380) {
          const m = { t: 'msl', x: b.x, y: b.y + 14, ang: Math.PI / 2, hp: 2, anim: 0, flash: 0 }; g.ens.push(m);
        }
      }
      function updBoss3(b, dif) {
        const p = g.p;
        if (b.dying) return;
        b.tm++;
        const cyc = b.tm % 520;
        const want = cyc < 260 ? b.home : b.home - 70;
        b.x += clamp(want - b.x, -0.7, 0.7); b.y = groundY(b.x);
        if (cyc % Math.round(110 / dif) === 30) { const t = 70; eFire(b, 'sh', b.x - 52, b.y - 46, clamp((p.x - b.x + 52) / t, -4, -0.5), -2.4); snd.cannon(); g.shake = 3; }
        if (cyc > 140 && cyc < 240 && cyc % Math.round(12 / dif) === 0) { eFire(b, 'b', b.x - 40, b.y - 20, -2.2, 0); snd.eshot(); }
        if ((cyc === 300 || cyc === 330 || (dif > 1.2 && cyc === 360)) && g.ens.length < 10) g.ens.push({ t: 'msl', x: b.x + 10, y: b.y - 64, ang: -Math.PI / 2, hp: 2, anim: 0, flash: 0 });
        if (!p.dead && p.x > b.x - 54) { if (p.slug) p.slug.x = b.x - 66; else p.x = b.x - 54; }
      }

      // ---------- bullets, items, POWs ----------
      function updShots() {
        const p = g.p;
        for (const b of g.pb) {
          b.life--;
          if (b.k === 'r') {
            const t = nearestEnemy(b.x, b.y);
            const sp = Math.min(5, Math.hypot(b.vx, b.vy) + 0.15);
            let a = Math.atan2(b.vy, b.vx);
            if (t && b.life < 112) { const ta = Math.atan2(t.y - b.y, t.x - b.x); let d = ta - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; a += clamp(d, -0.06, 0.06); }
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
            if (frame % 2 === 0) g.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, t: 12, c: '#ccc' });
          }
          if (b.k === 'g' || b.k === 'c') {
            b.vy += b.k === 'g' ? 0.18 : 0.12; b.spin++;
            const f = floorAt(b.x, b.y - 2);
            if (b.y + b.vy >= f) {
              if (b.k === 'g' && b.bounce === 0) { b.bounce = 1; b.vy = -b.vy * 0.4; b.vx *= 0.6; b.y = f - 1; }
              else { explode(b.x, f - 6, b.k === 'c' ? 26 : 22, b.dmg, true); b.life = 0; }
            }
          }
          b.x += b.vx; b.y += b.vy;
          if (b.x < g.cam - 20 || b.x > g.cam + W + 20 || b.y < -60 || b.y > H + 10) b.life = 0;
          if (b.life <= 0) continue;
          if ((b.k === 'p' || b.k === 'h') && b.y > groundY(b.x)) { b.life = 0; g.fx.push({ k: 'spark', x: b.x, y: groundY(b.x), t: 6 }); continue; }
          // POWs
          if (b.k !== 'g' && b.k !== 'c') for (const pw of g.pows) if (pw.st === 'tied' && Math.abs(pw.x - b.x) < 7 && b.y > pw.y - 18 && b.y < pw.y) { freePow(pw); if (b.k !== 'f') b.life = 0; }
          if (b.life <= 0) continue;
          for (const e of g.ens) {
            const bx = boxOf(e); if (!bx) continue;
            if (b.x >= bx[0] && b.x <= bx[2] && b.y >= bx[1] && b.y <= bx[3]) {
              if (b.k === 'f') { if (b.hit.includes(e)) continue; b.hit.push(e); hurt(e, b.dmg, 'fire'); continue; }
              if (b.k === 'r' || b.k === 'g' || b.k === 'c') { explode(b.x, b.y, b.k === 'r' ? 18 : 24, b.dmg, true); b.life = 0; break; }
              hurt(e, b.dmg, 'shot'); g.fx.push({ k: 'spark', x: b.x, y: b.y, t: 6 }); b.life = 0; break;
            }
          }
          if (b.life > 0 && b.k === 'r' && b.y > groundY(b.x)) { explode(b.x, b.y, 18, b.dmg, true); b.life = 0; }
        }
        g.pb = g.pb.filter(b => b.life > 0);
        for (const b of g.eb) {
          b.life--;
          if (b.k === 'gr' || b.k === 'sh') b.vy += b.k === 'gr' ? 0.11 : 0.07;
          if (b.k === 'bomb') b.vy = Math.min(3.5, b.vy + 0.1);
          b.x += b.vx; b.y += b.vy;
          const gy = groundY(b.x);
          if (b.k === 'gr' || b.k === 'sh' || b.k === 'bomb' || b.k === 'rk') {
            if (b.y >= gy - 2) { explode(b.x, gy - 4, b.k === 'sh' ? 22 : 16, 0, false); b.life = 0; continue; }
          } else if (b.y > gy + 2) { b.life = 0; continue; }
          if (b.x < g.cam - 30 || b.x > g.cam + W + 30 || b.y > H + 10 || b.y < -40) { b.life = 0; continue; }
          if (p.dead) continue;
          let hit = false;
          if (p.slug) { const s = p.slug; hit = Math.abs(b.x - s.x) < 16 && b.y > s.y - 30 && b.y < s.y; }
          else { const top = p.crouch ? p.y - 14 : p.y - 24; hit = Math.abs(b.x - p.x) < 6 && b.y > top && b.y < p.y; }
          if (hit) {
            if (b.k === 'gr' || b.k === 'sh' || b.k === 'bomb' || b.k === 'rk') { explode(b.x, b.y, 16, 0, false); b.life = 0; }
            else { hurtPlayer(); b.life = 0; }
          }
        }
        g.eb = g.eb.filter(b => b.life > 0);
        // parked / dying slugs
        for (const s of g.slugs) {
          if (s.st === 'park') physSlug(s);
          else if (s.st === 'dying') {
            physSlug(s); s.tm--;
            if (s.tm % 8 === 0) boomFx(s.x + (Math.random() - 0.5) * 20, s.y - 14, 10);
            if (s.tm <= 0) { explode(s.x, s.y - 14, 44, 20, true); s.st = 'gone'; }
          }
        }
        g.slugs = g.slugs.filter(s => s.st !== 'gone' && s.x > g.cam - 60);
      }
      function freePow(pw) {
        pw.st = 'free'; pw.tm = 30; addScore(100); g.rescued++; g.missionRescued++;
        au.tone(500, 0.08, { type: 'square', vol: 0.08, slideTo: 900 });
      }
      function dropItem(x, y) {
        const r = Math.random();
        const k = r < 0.26 ? 'H' : r < 0.38 ? 'R' : r < 0.5 ? 'F' : r < 0.6 ? 'S' : r < 0.74 ? 'B' : ['fish', 'chick', 'fruit', 'bread'][Math.random() * 4 | 0];
        g.items.push({ k, x, y, vy: -2, t: 0 });
      }
      function updPows() {
        const p = g.p;
        for (const pw of g.pows) {
          pw.anim++;
          if (pw.st === 'tied') {
            if (!p.dead && !p.slug && Math.abs(p.x - pw.x) < 10 && Math.abs(p.y - pw.y) < 16) freePow(pw);
          } else if (pw.st === 'free') { if (--pw.tm <= 0) { pw.st = 'walk'; pw.tm = 150; } }
          else if (pw.st === 'walk') {
            const d = p.x - pw.x; pw.face = d > 0 ? 1 : -1;
            if (Math.abs(d) > 14 && pw.tm-- > 0 && !p.dead) pw.x += Math.sign(d) * 0.8; else { pw.st = 'give'; pw.tm = 50; }
          } else if (pw.st === 'give') {
            pw.tm--;
            if (pw.tm === 30) { dropItem(pw.x + (pw.face || 1) * 8, pw.y - 14); snd.thanks(); fxText('THANK YOU!', pw.x, pw.y - 34, '#ffffa0'); }
            if (pw.tm <= 0) { pw.st = 'run'; }
          } else if (pw.st === 'run') { pw.x -= 2.6; pw.face = -1; if (pw.x < g.cam - 30) pw.gone = true; }
          pw.y = groundY(pw.x);
          if (pw.x < g.cam - 60) pw.gone = true;
        }
        g.pows = g.pows.filter(pw => !pw.gone);
        for (const it of g.items) {
          it.t++; it.vy = Math.min(3, it.vy + 0.15);
          const f = floorAt(it.x, it.y); if (it.y + it.vy >= f) { it.y = f; it.vy = 0; } else it.y += it.vy;
          if (!p.dead && Math.abs(p.x - it.x) < 12 && Math.abs(p.y - it.y) < 22) { collect(it); it.gone = true; }
          if (it.x < g.cam - 20 || it.t > 900) it.gone = true;
        }
        g.items = g.items.filter(it => !it.gone);
      }
      function collect(it) {
        const p = g.p;
        const AM = { H: 200, R: 30, F: 30, S: 30 }, NM = { H: 'HEAVY MACHINE GUN!', R: 'ROCKET LAUNCHER!', F: 'FLAME SHOT!', S: 'SHOTGUN!' };
        if (AM[it.k]) {
          if (p.slug) { p.slug.can += 5; fxText('CANNON +5', it.x, it.y - 20, '#ffd040'); }
          else { if (p.wpn === it.k) p.ammo += AM[it.k]; else { p.wpn = it.k; p.ammo = AM[it.k]; } fxText(NM[it.k], p.x, p.y - 40, '#ffd040'); }
          snd.weapon(); addScore(500);
        } else if (it.k === 'B') { p.bombs += 10; if (p.slug) p.slug.can += 10; snd.item(); fxText('BOMB +10', it.x, it.y - 20, '#80ff80'); addScore(500); }
        else { const v = it.k === 'chick' ? 1000 : it.k === 'fish' ? 500 : it.k === 'fruit' ? 300 : 200; addScore(v); fxText(String(v), it.x, it.y - 20); snd.item(); }
      }

      // ---------- main update ----------
      function updCamera() {
        const p = g.p;
        if (p.dead) return;
        let target = p.x - 120;
        let c = Math.max(g.cam, target);
        if (g.lockCam != null) c = Math.min(c, g.lockCam);
        g.cam = clamp(c, 0, LEN - W);
      }
      function updPlay() {
        frame++;
        if (g.msgT > 0) g.msgT--;
        if (g.goT > 0) g.goT--;
        if (g.shake > 0) g.shake *= 0.85; if (g.shake < 0.3) g.shake = 0;
        updPlayer(); updCamera(); runEvents();
        // lock / waves
        if (g.lockCam != null && g.cam >= g.lockCam - 1) {
          if (g.bossPending > 0) { if (--g.bossPending === 0) spawnBoss(); }
          else if (g.waves) {
            const alive = g.ens.filter(e => e.t !== 'msl' && !(e.t === 'sold' && (e.st === 'die' || e.st === 'idle'))).length;
            if (alive === 0) {
              if (g.waveT > 0) g.waveT--;
              else if (g.waves.length) { spawnWave(g.waves.shift()); g.waveT = 70; }
              else { g.lockCam = null; g.waves = null; g.goT = 150; au.melody([[784, 0.08], [1047, 0.12]], { type: 'square', vol: 0.1 }); }
            }
          }
        }
        updEnemies(); updShots(); updPows();
        for (const q of g.parts) { q.t--; q.x += q.vx; q.y += q.vy; q.vy += q.grav || 0; }
        g.parts = g.parts.filter(q => q.t > 0);
        for (const f of g.fx) { f.t += f.k === 'boom' ? 1 : -1; if (f.k === 'txt') f.y -= 0.4; }
        g.fx = g.fx.filter(f => f.k === 'boom' ? f.t < f.max : f.t > 0 && (f.k !== 'fire' || f.x > g.cam - 40));
        // timer
        if (g.phase === 'play' && !g.p.dead && ++g.tick >= 150) { g.tick = 0; if (--g.timer <= 0) { g.timer = 0; const p = g.p; if (p.slug) { p.slug.st = 'dying'; p.slug.tm = 50; p.slug = null; } p.inv = 0; hurtPlayer(); } }
        if (g.phase === 'bossdie') {
          g.pt++;
          const b = g.boss;
          if (g.pt % 6 === 0 && g.pt < 150) { const bx = boxOf(b) || [b.x - 30, b.y - 60, b.x + 30, b.y]; boomFx(bx[0] + Math.random() * (bx[2] - bx[0]), bx[1] + Math.random() * (bx[3] - bx[1]), 14 + Math.random() * 14); if (g.pt % 18 === 0) snd.boom(); }
          if (g.pt === 150) { boomFx(b.x, b.y - 30, 60); snd.bigboom(); b.dead = true; g.ens = g.ens.filter(e => !e.dead); for (const e of g.ens) if (e.t === 'sold') killEnemy(e, 'blast'); else e.dead = true; g.eb = []; }
          if (g.pt === 230) { g.phase = 'clear'; g.pt = 0; snd.clear(); g.bonus = g.missionRescued * 1000 + g.timer * 100; }
        } else if (g.phase === 'clear') {
          g.pt++;
          if (g.pt === 200) addScore(g.bonus);
          if (g.pt > 360) {
            g.mission++;
            if (g.mission >= 3) { g.mission = 0; g.loop++; }
            const keep = g.p; startMission();
            g.p.wpn = keep.wpn; g.p.ammo = keep.ammo; g.p.bombs = keep.bombs;
          }
        }
      }
      function update() {
        mt++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (api.anyPressed('Enter', 'Space') && tryStart()) { mode = 'play'; newGame(); }
          return;
        }
        if (mode === 'over') {
          if (--overT <= 0 || (overT < 200 && api.anyPressed('Enter', 'Space'))) { mode = 'title'; mt = 0; }
          return;
        }
        if (g.p.dead > 100) return; // waiting on continue
        updPlay();
      }

      // ---------- drawing ----------
      const THEME = [
        { sky: ['#5aa0d8', '#7ab8e4', '#a0d0ec', '#c8e4f0'], far: '#5a8a9a', mid: '#2a6a3a', mid2: '#1e5a2e', top: '#5a9a2a', top2: '#3a7a1e', dirt: '#8a5a30', dirt2: '#6a4220', plat: '#7a5a38' },
        { sky: ['#c86a3a', '#e08a48', '#f0aa60', '#f8d088'], far: '#8a6058', mid: '#9a6048', mid2: '#704030', top: '#a09080', top2: '#7a7068', dirt: '#6a6058', dirt2: '#4a4440', plat: '#8a8a8a' },
        { sky: ['#6aa0e0', '#8ab8ec', '#b0d0f4', '#dceaff'], far: '#c8d8ec', mid: '#2a4a3a', mid2: '#e8f0f8', top: '#f4f8ff', top2: '#c8dcf0', dirt: '#a8c0d8', dirt2: '#7a98b8', plat: '#6a5a48' }
      ];
      function drawBG(ctx, th, cam, m) {
        for (let i = 0; i < 4; i++) { ctx.fillStyle = th.sky[i]; ctx.fillRect(0, i * 30, W, 30); }
        ctx.fillStyle = th.sky[3]; ctx.fillRect(0, 120, W, H - 120);
        // far layer
        const c1 = cam * 0.15;
        ctx.fillStyle = th.far;
        for (let x = 0; x < W; x += 4) {
          const wx = x + c1;
          let h = m === 1 ? (Math.floor(wx / 26) % 3 === 0 ? 50 : Math.floor(wx / 26) % 3 === 1 ? 34 : 64) - ((wx % 26) < 4 ? 0 : 0)
            : 40 + Math.sin(wx * 0.013) * 22 + Math.sin(wx * 0.037) * 10;
          if (m === 2) h += 20;
          ctx.fillRect(x, 150 - h, 4, h + 10);
          if (m === 2 && h > 62) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, 150 - h, 4, 6); ctx.fillStyle = th.far; }
        }
        // mid layer
        const c2 = cam * 0.45;
        if (m === 0) {
          ctx.fillStyle = th.mid;
          for (let x = 0; x < W; x += 4) { const wx = x + c2; const h = 30 + Math.sin(wx * 0.05) * 8 + Math.sin(wx * 0.11) * 5; ctx.fillRect(x, 170 - h, 4, h + 30); }
          for (let k = Math.floor(c2 / 70) - 1; k < (c2 + W) / 70 + 1; k++) {
            const x = k * 70 - c2 + 20, hgt = 50 + (k * 37 % 30);
            ctx.fillStyle = '#6a4a28'; ctx.fillRect(x, 170 - hgt, 3, hgt);
            ctx.fillStyle = th.mid2;
            for (let a = 0; a < 5; a++) { const dx = [-14, -8, 0, 8, 14][a]; ctx.fillRect(x + dx - 6, 170 - hgt + Math.abs(dx) * 0.4, 14, 4); ctx.fillRect(x + dx * 1.3 - 3, 170 - hgt + 4 + Math.abs(dx) * 0.5, 8, 3); }
          }
        } else if (m === 1) {
          for (let k = Math.floor(c2 / 60) - 1; k < (c2 + W) / 60 + 1; k++) {
            const x = k * 60 - c2, hgt = 50 + ((k * 53) % 40), w = 44;
            ctx.fillStyle = th.mid; ctx.fillRect(x, 175 - hgt, w, hgt);
            ctx.fillStyle = th.mid2; ctx.fillRect(x + w - 6, 175 - hgt, 6, hgt);
            // broken top
            ctx.fillStyle = th.sky[2]; ctx.fillRect(x + 8 + (k % 3) * 6, 175 - hgt, 10, 6 + (k % 4) * 3);
            ctx.fillStyle = '#3a2420';
            for (let wy = 175 - hgt + 12; wy < 165; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 12) ctx.fillRect(wx, wy, 6, 8);
          }
        } else {
          for (let k = Math.floor(c2 / 34) - 1; k < (c2 + W) / 34 + 1; k++) {
            const x = k * 34 - c2 + 10, hgt = 40 + ((k * 29) % 24);
            ctx.fillStyle = th.mid;
            for (let r = 0; r < hgt; r += 4) { const w = Math.max(2, Math.floor((r / hgt) * 16)); ctx.fillRect(x - w / 2, 172 - hgt + r, w, 4); }
            ctx.fillStyle = th.mid2;
            for (let r = 4; r < hgt; r += 12) { const w = Math.max(2, Math.floor((r / hgt) * 16)); ctx.fillRect(x - w / 2, 172 - hgt + r, w, 2); }
          }
        }
      }
      function drawGround(ctx, th) {
        const cam = g.cam;
        for (let x = 0; x < W; x += 2) {
          const wx = x + cam, gy = Math.round(groundY(wx));
          ctx.fillStyle = th.top; ctx.fillRect(x, gy, 2, 4);
          ctx.fillStyle = th.top2; ctx.fillRect(x, gy + 4, 2, 2);
          ctx.fillStyle = ((wx >> 3) + (gy >> 3)) & 1 ? th.dirt : th.dirt2; ctx.fillRect(x, gy + 6, 2, H - gy);
        }
        ctx.fillStyle = th.dirt2;
        for (let k = Math.floor(cam / 23); k < (cam + W) / 23; k++) { const wx = k * 23, gy = groundY(wx); ctx.fillRect(wx - cam, gy + 12 + (k * 7 % 14), 4, 3); }
        for (const p of g.lvl.plats) {
          const x = p.x - cam; if (x > W || x + p.w < 0) continue;
          if (g.mission === 0) {
            ctx.fillStyle = '#4a3418'; ctx.fillRect(x, p.y, p.w, 6); ctx.fillStyle = '#9a7040'; ctx.fillRect(x, p.y, p.w, 4);
            ctx.fillStyle = '#5a3a1a'; for (let k = 6; k < p.w; k += 8) ctx.fillRect(x + k, p.y, 1, 4);
            ctx.fillStyle = '#4a3418'; ctx.fillRect(x + 3, p.y + 6, 3, groundY(p.x + 4) - p.y - 6); ctx.fillRect(x + p.w - 6, p.y + 6, 3, groundY(p.x + p.w - 4) - p.y - 6);
          } else {
            // sandbag wall
            for (let row = 0; row < 3; row++) for (let k = (row & 1) * 5; k < p.w - 4; k += 10) {
              ctx.fillStyle = '#5a5038'; ctx.fillRect(x + k, p.y + row * 6, 10, 6);
              ctx.fillStyle = g.mission === 2 ? '#d8d8c8' : '#b8a878'; ctx.fillRect(x + k + 1, p.y + row * 6, 8, 4);
            }
            ctx.fillStyle = '#4a4030'; ctx.fillRect(x + 4, p.y + 18, 3, groundY(p.x + 5) - p.y - 18); ctx.fillRect(x + p.w - 8, p.y + 18, 3, groundY(p.x + p.w - 6) - p.y - 18);
          }
        }
      }
      function drawGun(ctx, x, y, face, aim, wpn) {
        // x,y = shoulder (screen); rect helper mirrored by face
        const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(face > 0 ? x + dx : x - dx - w, y + dy, w, h); };
        const big = wpn !== 'P';
        if (aim === 'f') {
          R(0, 0, 5, 3, '#1a1410'); R(1, 1, 4, 1, '#f4c098');
          if (!big) { R(4, -1, 8, 3, '#303438'); R(5, -1, 6, 1, '#7a8088'); R(6, 2, 2, 2, '#303438'); }
          else { R(2, -2, 16, 5, '#2a2e30'); R(3, -2, 13, 2, wpn === 'H' ? '#8a9098' : wpn === 'R' ? '#6a7a48' : wpn === 'F' ? '#a04020' : '#7a5a30'); R(14, -3, 4, 2, '#4a4e50'); R(6, 3, 3, 3, '#2a2e30'); }
        } else if (aim === 'u') {
          R(0, -6, 3, 7, '#1a1410'); R(1, -6, 1, 6, '#f4c098');
          R(-1, -14 - (big ? 6 : 0), 4, 10 + (big ? 6 : 0), '#2a2e30'); R(0, -14 - (big ? 6 : 0), 2, 8 + (big ? 6 : 0), big ? '#8a9098' : '#7a8088');
        } else {
          R(0, 0, 3, 8, '#1a1410'); R(1, 0, 1, 7, '#f4c098');
          R(-1, 6, 4, 10 + (big ? 6 : 0), '#2a2e30'); R(0, 7, 2, 8 + (big ? 6 : 0), big ? '#8a9098' : '#7a8088');
        }
      }
      function drawMarco(ctx, p, x, y) {
        const flip = p.face < 0;
        if (p.inv > 0 && !p.dead && (frame & 2)) return;
        if (p.dead) {
          const lying = p.dead > 30;
          if (lying) {
            ctx.fillStyle = '#1a1410'; ctx.fillRect(x - 12, y - 7, 24, 7);
            ctx.fillStyle = '#3c5aa0'; ctx.fillRect(x - 11 * p.face - (p.face > 0 ? 0 : 10), y - 6, 10, 5);
            ctx.fillStyle = '#8c8c5a'; ctx.fillRect(x - (p.face > 0 ? 1 : 9), y - 6, 10, 5);
            ctx.fillStyle = '#e0b048'; ctx.fillRect(x + (p.face > 0 ? 8 : -12), y - 7, 5, 6);
            return;
          }
          spr(ctx, SP.mt, x - 6, y - 23, flip); spr(ctx, SP.ml_jump, x - 6, y - 10, flip);
          ctx.fillStyle = '#f4c098'; ctx.fillRect(x - 9, y - 22, 3, 3); ctx.fillRect(x + 6, y - 22, 3, 3);
          return;
        }
        let legs = 'stand', tY = y - 23;
        if (!p.ground) legs = 'jump';
        else if (p.crouch) { legs = 'crouch'; tY = y - 19; }
        else if (p.vx) legs = ['run1', 'run2', 'run3', 'run2'][(p.anim >> 3) & 3];
        const ls = SP['ml_' + legs];
        spr(ctx, ls, x - 6, y - ls.h, flip);
        const bob = legs === 'run2' ? 1 : 0;
        spr(ctx, SP.mt, x - 6, tY + bob, flip);
        const sx = x + p.face * 2, sy = tY + bob + 8;
        if (p.knife > 0) {
          const ph = p.knife > 7 ? 0 : 1;
          ctx.fillStyle = '#f4c098'; ctx.fillRect(p.face > 0 ? sx : sx - 8, sy - 2 + ph * 3, 8, 2);
          ctx.fillStyle = '#e8e8f0'; ctx.fillRect(p.face > 0 ? sx + 7 : sx - 15, sy - 4 + ph * 6, 8, 2);
          ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) ctx.fillRect(p.face > 0 ? sx + 12 + i : sx - 13 - i, sy - 8 + i * 4, 2, 2);
        } else if (p.throwT > 0) {
          ctx.fillStyle = '#f4c098'; ctx.fillRect(p.face > 0 ? sx - 2 : sx - 1, sy - 10 + (12 - p.throwT), 3, 8);
          drawGun(ctx, sx, sy, p.face, 'f', p.wpn);
        } else drawGun(ctx, sx, sy, p.face, p.aim, p.wpn);
        if (p.shootT > 3 && p.knife <= 0) { const m = muzzle(p); disc(ctx, m.x - g.cam + (m.vx * 2), m.y + m.vy * 2, p.wpn === 'P' ? 2 : 3, '#fff8a0'); }
      }
      function drawSoldier(ctx, e, x, y) {
        const flip = e.face < 0;
        const fl = e.flash > 0 ? '#fff' : null;
        if (e.st === 'die') {
          if (e.tm < 24 && (e.tm & 2)) return;
          if (e.burn) {
            const k = 60 - e.tm;
            ctx.fillStyle = '#201008'; ctx.fillRect(x - 5, y - Math.max(4, 22 - k / 2), 10, Math.max(4, 22 - k / 2));
            for (let i = 0; i < 4; i++) disc(ctx, x + Math.sin(k * 0.6 + i) * 4, y - 6 - i * 5 - (k % 6), 3, i & 1 ? '#ff6020' : '#ffd040');
            return;
          }
          if (!e.ground && e.vy < 0) {
            spr(ctx, SP.st, x - 6, y - 23, flip, fl); spr(ctx, SP.sl_jump, x - 6, y - 8, flip, fl);
            ctx.fillStyle = '#f0b890'; ctx.fillRect(x - 10, y - 26, 3, 6); ctx.fillRect(x + 7, y - 26, 3, 6);
            return;
          }
          if (e.slashed && e.tm > 44) {
            spr(ctx, SP.st, x - 6 - e.face * 2, y - 21, flip); spr(ctx, SP.sl_crouch, x - 6, y - 6, flip);
            ctx.fillStyle = '#c01818'; ctx.fillRect(x - 2, y - 14, 4, 2);
            return;
          }
          ctx.fillStyle = '#141a0c'; ctx.fillRect(x - 12, y - 6, 24, 6);
          ctx.fillStyle = '#6a7a48'; ctx.fillRect(x - 11, y - 5, 10, 4);
          ctx.fillStyle = '#7a8a50'; ctx.fillRect(x - 1, y - 5, 8, 4);
          ctx.fillStyle = '#6a7a3a'; ctx.fillRect(e.face > 0 ? x - 13 : x + 7, y - 7, 6, 6);
          return;
        }
        if (e.st === 'idle' && e.idle === 'sleep') {
          ctx.fillStyle = '#a03030'; ctx.fillRect(x - 14, y - 2, 28, 2);
          ctx.fillStyle = '#141a0c'; ctx.fillRect(x - 12, y - 7, 24, 5);
          ctx.fillStyle = '#6a7a48'; ctx.fillRect(x - 11, y - 6, 9, 3); ctx.fillStyle = '#7a8a50'; ctx.fillRect(x - 2, y - 6, 8, 3);
          ctx.fillStyle = '#f0b890'; ctx.fillRect(x + 6, y - 7, 5, 5); ctx.fillStyle = '#6a7a3a'; ctx.fillRect(x + 4, y - 10, 6, 4);
          if ((e.anim >> 5) & 1) text(ctx, 'Z', x + 8, y - 20 - ((e.anim >> 2) & 7), '#fff');
          return;
        }
        let legs = 'stand', tY = y - 23;
        if (!e.ground) legs = 'jump';
        else if (e.st === 'idle' && e.idle === 'squat') { legs = 'crouch'; tY = y - 19; }
        else if ((e.st === 'run' && e.vx) || e.st === 'flee') legs = ['run1', 'run2', 'run3', 'run2'][(e.anim >> 3) & 3];
        const ls = SP['sl_' + legs];
        spr(ctx, ls, x - 6, y - ls.h, flip, fl);
        const shake = e.st === 'panic' ? ((e.anim >> 1) & 1) : 0;
        spr(ctx, SP.st, x - 6 + shake, tY, flip, fl);
        const R = (dx, dy, w, h, c) => { ctx.fillStyle = fl || c; ctx.fillRect(e.face > 0 ? x + dx : x - dx - w, tY + dy, w, h); };
        if (e.st === 'panic' || e.st === 'flee') {
          R(-6, -6 + shake, 3, 10, '#f0b890'); R(4, -6 - shake, 3, 10, '#f0b890');
          if (e.st === 'flee' && (e.anim & 8)) { R(-2, -10, 6, 2, '#8ad0ff'); }
        } else if (e.st === 'atk' || e.st === 'run') {
          if (e.kind === 'baz') { R(-6, 1, 22, 4, '#4a5a2a'); R(14, 0, 3, 6, '#2a3018'); R(-4, 2, 3, 3, '#f0b890'); }
          else if (e.kind === 'gren' && e.st === 'atk' && e.tm > 12) { R(-4, -6 + (32 - e.tm) / 4, 3, 8, '#f0b890'); R(-5, -8 + (32 - e.tm) / 4, 4, 4, '#3a4a20'); }
          else { R(2, 8, 6, 2, '#f0b890'); R(4, 6, 12, 2, '#5a3a20'); R(12, 6, 6, 1, '#303030'); }
        } else if (e.st === 'idle') {
          if (e.idle === 'chat') { const up = (e.anim >> 4) & 1; R(4, 7 - up * 4, 6, 2, '#f0b890'); }
          else { R(3, 9, 7, 2, '#f0b890'); }
        }
      }
      function drawPow(ctx, pw, x, y) {
        const flip = (pw.face || 1) < 0;
        if (pw.st === 'tied') {
          ctx.fillStyle = '#6a4a28'; ctx.fillRect(x - 1, y - 30, 3, 30);
          const sw = (pw.anim >> 4) & 1;
          spr(ctx, POWSPR.tied, x - 4 + sw, y - 16, false);
          ctx.fillStyle = '#c8a060'; ctx.fillRect(x - 2, y - 18, 5, 2);
          if ((pw.anim >> 5) & 1) text(ctx, 'HELP!', x, y - 42, '#ffffff', 1, 'center');
          return;
        }
        let s = POWSPR.stand;
        if (pw.st === 'walk' || pw.st === 'run') s = (pw.anim >> 3) & 1 ? POWSPR.walk : POWSPR.stand;
        if (pw.st === 'give') s = pw.tm > 30 ? POWSPR.salute : POWSPR.stand;
        if (pw.st === 'free') { spr(ctx, POWSPR.stand, x - 5, y - 17 + Math.max(0, pw.tm - 20) * 0.3, flip); return; }
        spr(ctx, s, x - 5, y - 17, flip);
      }
      function drawTank(ctx, e, x, y) {
        const fl = e.flash > 0 && (frame & 1);
        const R = (dx, dy, w, h, c) => { ctx.fillStyle = fl ? '#fff' : c; ctx.fillRect(e.face > 0 ? x + dx : x - dx - w, y + dy, w, h); };
        R(-22, -10, 44, 10, '#2a2a22'); R(-21, -9, 42, 3, '#4a4a3a');
        for (let i = 0; i < 5; i++) { const wx = -18 + i * 9; R(wx, -7, 6, 6, '#5a5a48'); R(wx + 2, -5, 2, 2, '#2a2a22'); }
        const tr = (e.anim >> 2) & 1; for (let i = 0; i < 11; i++) R(-22 + i * 4 + tr * 2, -1, 2, 1, '#6a6a5a');
        R(-20, -18, 40, 8, '#5a6a32'); R(-18, -18, 36, 2, '#7a8a48'); R(-20, -11, 40, 1, '#3a4420');
        R(-10, -26, 18, 8, '#5a6a32'); R(-8, -26, 14, 2, '#7a8a48');
        R(6, -24, 22, 3, '#3a4420'); R(26, -25, 4, 5, '#2a3018');
        R(-6, -30, 5, 4, '#3a4420');
        R(-16, -16, 3, 3, '#c8c040');
      }
      function drawHeli(ctx, e, x, y) {
        const fl = e.flash > 0 && (frame & 1);
        const C = c => fl ? '#fff' : c;
        ctx.fillStyle = C('#5a6a32'); ctx.fillRect(x - 16, y - 4, 26, 12); ctx.fillRect(x - 12, y - 7, 18, 3);
        ctx.fillStyle = C('#7a8a48'); ctx.fillRect(x - 14, y - 4, 22, 3);
        ctx.fillStyle = C('#8ad0ff'); ctx.fillRect(x - 15, y - 2, 6, 5);
        ctx.fillStyle = C('#4a5826'); ctx.fillRect(x + 10, y - 2, 18, 4); ctx.fillRect(x + 26, y - 7, 3, 9);
        ctx.fillStyle = '#222'; ctx.fillRect(x - 12, y + 10, 22, 1); ctx.fillRect(x - 8, y + 8, 1, 2); ctx.fillRect(x + 4, y + 8, 1, 2);
        const r = (e.anim >> 1) & 3;
        ctx.fillStyle = '#303030'; ctx.fillRect(x - 1, y - 10, 2, 3);
        ctx.fillStyle = '#404040'; const rw = [32, 18, 6, 18][r]; ctx.fillRect(x - rw, y - 11, rw * 2, 1);
        ctx.fillStyle = '#505050'; ctx.fillRect(x + 25, y - 10 + (r & 1) * 2, 6, 1);
        if (e.st === 'fall' && (frame & 2)) disc(ctx, x, y, 5, '#ff8020');
      }
      function drawSlug(ctx, s, x, y, occupied) {
        if (s.inv > 0 && (frame & 2) && occupied) return;
        const f = s.face;
        const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(f > 0 ? x + dx : x - dx - w, y + dy, w, h); };
        // treads
        R(-17, -10, 34, 10, '#2a2620'); R(-16, -9, 32, 2, '#504838');
        const tr = (Math.round(s.x) >> 1) & 1;
        for (let i = 0; i < 4; i++) { R(-14 + i * 8, -7, 6, 6, '#6a6250'); R(-12 + i * 8, -5, 2, 2, '#2a2620'); }
        for (let i = 0; i < 9; i++) R(-17 + i * 4 + tr * 2, -1, 2, 1, '#807868');
        // hull
        R(-18, -20, 34, 10, '#b8a870'); R(-18, -20, 34, 2, '#d8c890'); R(-18, -12, 34, 2, '#7a6a40');
        R(-14, -18, 4, 4, '#4a5a90'); R(-8, -18, 4, 4, '#4a5a90');
        // hatch / dome
        R(-8, -28, 14, 8, '#a89860'); R(-6, -28, 10, 2, '#d8c890');
        if (occupied) { R(-3, -33, 7, 6, '#e0b048'); R(-1, -30, 5, 3, '#f4c098'); }
        // cannon
        R(4, -26, 16, 4, '#6a6a60'); R(18, -27, 4, 6, '#4a4a40');
        // vulcan (rotating)
        const a = occupied ? s.ang : (f > 0 ? 0 : Math.PI);
        const cx = x, cy = y - 20;
        ctx.fillStyle = '#3a3a38';
        for (let k = 4; k < 15; k++) ctx.fillRect(Math.round(cx + Math.cos(a) * k) - 1, Math.round(cy + Math.sin(a) * k) - 1, 3, 3);
        ctx.fillStyle = '#9a9a98';
        for (let k = 6; k < 15; k += 2) ctx.fillRect(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), 1, 1);
        if (s.st === 'dying' && (frame & 4)) disc(ctx, x, y - 16, 10, '#ff6020');
      }
      function drawBoss(ctx, b, x, y) {
        const fl = b.flash > 0 && (frame & 1);
        const C = c => fl ? '#ffffff' : c;
        if (b.t === 'boss1') {
          const ry = b.rise > 0 ? b.rise : 0;
          const by = y + ry;
          ctx.fillStyle = C('#5a5048'); ctx.fillRect(x - 40, by - 130, 100, 130);
          ctx.fillStyle = C('#7a6a5a'); ctx.fillRect(x - 38, by - 128, 96, 6);
          ctx.fillStyle = C('#3a3430');
          for (let r = 0; r < 6; r++) ctx.fillRect(x - 40, by - 116 + r * 20, 100, 2);
          for (let r = 0; r < 6; r++) for (let k = 0; k < 4; k++) ctx.fillRect(x - 36 + k * 26 + (r & 1) * 13, by - 114 + r * 20, 2, 18);
          // central cannon turret
          const cx = x - 4, cy = by - 92;
          disc(ctx, cx, cy, 16, C('#6a6a60')); disc(ctx, cx, cy, 12, C('#8a8a7a'));
          ctx.fillStyle = C('#3a3a38');
          for (let k = 8; k < 32; k++) ctx.fillRect(Math.round(cx + Math.cos(b.ang) * k) - 3, Math.round(cy + Math.sin(b.ang) * k) - 3, 6, 6);
          disc(ctx, cx, cy, 5, (frame >> 3) & 1 ? '#ff3020' : '#ffd040');
          // machine gun ports
          ctx.fillStyle = C('#2a2a28'); ctx.fillRect(x - 46, by - 56, 12, 8); ctx.fillRect(x - 46, by - 30, 12, 10);
          ctx.fillStyle = '#ff8020'; if (b.flame > 0) ctx.fillRect(x - 46, by - 28, 4, 6);
          // flame
          if (b.flame > 0) for (let k = 0; k < b.flame; k += 6) disc(ctx, x - 44 - k, by - 8 - Math.sin(k * 0.3 + frame * 0.5) * 2, 5 + (k % 12 === 0 ? 2 : 0), ((k / 6 + frame) & 1) ? '#ff6020' : '#ffd040');
          // rebel flag
          ctx.fillStyle = '#c02020'; ctx.fillRect(x + 30, by - 150, 18, 10); ctx.fillStyle = '#fff'; ctx.fillRect(x + 36, by - 147, 6, 4);
          ctx.fillStyle = '#3a3430'; ctx.fillRect(x + 28, by - 150, 2, 22);
        } else if (b.t === 'boss2') {
          // big bomber seen from side-below
          ctx.fillStyle = C('#5a6a48'); ctx.fillRect(x - 60, y - 4, 120, 12);
          ctx.fillStyle = C('#7a8a60'); ctx.fillRect(x - 60, y - 4, 120, 3);
          ctx.fillStyle = C('#4a5838'); ctx.fillRect(x - 44, y - 12, 88, 26); ctx.fillStyle = C('#6a7a50'); ctx.fillRect(x - 44, y - 12, 88, 4);
          ctx.fillStyle = C('#3a4428'); ctx.fillRect(x - 40, y + 12, 80, 4);
          ctx.fillStyle = '#8ad0ff'; ctx.fillRect(x + (b.dir > 0 ? 36 : -44), y - 8, 8, 6);
          for (const ox of [-34, 34, -16, 16]) { ctx.fillStyle = C('#3a3a38'); ctx.fillRect(x + ox - 5, y + 2, 10, 8); const pr = (frame >> 1) & 1; ctx.fillStyle = '#aaa'; ctx.fillRect(x + ox - (pr ? 9 : 1), y - 1, pr ? 18 : 2, 1); }
          ctx.fillStyle = C('#2a2a28'); ctx.fillRect(x - 8, y + 14, 16, 4);
          ctx.fillStyle = '#c02020'; ctx.fillRect(x - 4, y - 8, 8, 6);
          ctx.fillStyle = C('#4a5838'); ctx.fillRect(x + (b.dir > 0 ? -60 : 52), y - 22, 8, 18);
        } else {
          const R = (dx, dy, w, h, c) => { ctx.fillStyle = C(c); ctx.fillRect(x + dx, y + dy, w, h); };
          R(-56, -16, 112, 16, '#2a2a22'); R(-55, -15, 110, 3, '#4a4a3a');
          for (let i = 0; i < 9; i++) { R(-52 + i * 12, -12, 9, 9, '#5a5a48'); R(-49 + i * 12, -9, 3, 3, '#222'); }
          R(-50, -40, 100, 24, '#6a6a5a'); R(-50, -40, 100, 4, '#8a8a78'); R(-50, -18, 100, 2, '#3a3a30');
          R(-30, -58, 52, 18, '#5a5a4a'); R(-28, -58, 48, 3, '#7a7a68');
          R(-74, -52, 44, 6, '#3a3a32'); R(-78, -54, 6, 10, '#2a2a22');
          R(4, -68, 20, 10, '#4a4a3a'); for (let k = 0; k < 3; k++) R(7 + k * 6, -70, 4, 3, '#c03020');
          R(-46, -26, 8, 4, '#2a2a22');
          R(30, -36, 14, 14, '#4a4a3a'); R(34, -32, 6, 6, (frame >> 3) & 1 ? '#ff3020' : '#ffd040');
        }
      }
      function drawItem(ctx, it, x, y) {
        if (it.t > 760 && (frame & 4)) return;
        if ('HRFSB'.includes(it.k)) {
          ctx.fillStyle = '#3a2a10'; ctx.fillRect(x - 7, y - 12, 14, 12);
          ctx.fillStyle = it.k === 'B' ? '#3a7a30' : '#d8a020'; ctx.fillRect(x - 6, y - 11, 12, 10);
          text(ctx, it.k, x - 2, y - 10, '#fff');
        } else if (it.k === 'fish') { ctx.fillStyle = '#6a8ac8'; ctx.fillRect(x - 7, y - 5, 11, 5); ctx.fillRect(x + 4, y - 6, 3, 7); ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 4, 1, 1); }
        else if (it.k === 'chick') { ctx.fillStyle = '#c87830'; disc(ctx, x, y - 4, 4, '#c87830'); ctx.fillStyle = '#f0e8d0'; ctx.fillRect(x + 3, y - 7, 4, 2); }
        else if (it.k === 'fruit') { disc(ctx, x, y - 4, 4, '#e03020'); ctx.fillStyle = '#30a020'; ctx.fillRect(x, y - 10, 2, 3); }
        else { ctx.fillStyle = '#d8a050'; ctx.fillRect(x - 7, y - 6, 14, 6); ctx.fillStyle = '#a06828'; ctx.fillRect(x - 7, y - 6, 14, 2); }
      }
      function drawPlay(ctx) {
        const th = THEME[g.mission];
        const sh = g.shake ? Math.round((Math.random() - 0.5) * g.shake) : 0;
        ctx.save(); ctx.translate(0, sh);
        drawBG(ctx, th, g.cam, g.mission);
        drawGround(ctx, th);
        const cam = g.cam;
        for (const f of g.fx) if (f.k === 'fire') {
          const x = f.x - cam; ctx.fillStyle = '#4a2a10'; ctx.fillRect(x - 6, f.y - 2, 12, 2);
          for (let i = 0; i < 3; i++) disc(ctx, x - 3 + i * 3, f.y - 4 - ((frame + i * 5) % 10) * 0.6, 2, i === 1 ? '#ffd040' : '#ff6020');
        }
        for (const pw of g.pows) drawPow(ctx, pw, Math.round(pw.x - cam), Math.round(pw.y));
        for (const it of g.items) drawItem(ctx, it, Math.round(it.x - cam), Math.round(it.y));
        for (const s of g.slugs) if (s.st !== 'drive') {
          drawSlug(ctx, s, Math.round(s.x - cam), Math.round(s.y), false);
          if (s.st === 'park' && (frame >> 4) & 1) { text(ctx, 'IN!', s.x - cam, s.y - 44, '#ffd040', 1, 'center'); ctx.fillStyle = '#ffd040'; ctx.fillRect(s.x - cam - 2, s.y - 36, 4, 3); }
        }
        for (const e of g.ens) {
          const x = Math.round(e.x - cam), y = Math.round(e.y);
          if (e.t === 'sold') drawSoldier(ctx, e, x, y);
          else if (e.t === 'tank') drawTank(ctx, e, x, y);
          else if (e.t === 'heli') drawHeli(ctx, e, x, y);
          else if (e.t === 'msl') { ctx.fillStyle = e.flash ? '#fff' : '#c8c8c0'; ctx.fillRect(x - 4, y - 2, 8, 4); ctx.fillStyle = '#c03020'; ctx.fillRect(x + Math.round(Math.cos(e.ang) * 4) - 1, y + Math.round(Math.sin(e.ang) * 3) - 1, 3, 3); }
          else drawBoss(ctx, e, x, y);
        }
        const p = g.p;
        if (p.slug) drawSlug(ctx, p.slug, Math.round(p.slug.x - cam), Math.round(p.slug.y), true);
        else drawMarco(ctx, p, Math.round(p.x - cam), Math.round(p.y));
        // shots
        for (const b of g.pb) {
          const x = Math.round(b.x - cam), y = Math.round(b.y);
          if (b.k === 'p') { ctx.fillStyle = '#fff8a0'; ctx.fillRect(x - (b.vx ? 3 : 1), y - (b.vy ? 3 : 1), b.vx ? 6 : 2, b.vy ? 6 : 2); }
          else if (b.k === 'h') { ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y, 3, 1); }
          else if (b.k === 'r') { ctx.fillStyle = '#6a7a48'; ctx.fillRect(x - 3, y - 2, 6, 4); ctx.fillStyle = '#ff8020'; ctx.fillRect(x - Math.sign(b.vx || 0) * 4 - 1, y - 1, 2, 2); }
          else if (b.k === 'f') { const r = 4 + (40 - b.life) * 0.25; disc(ctx, x, y, r, '#ff5010'); disc(ctx, x, y, r * 0.6, '#ffd040'); disc(ctx, x, y, r * 0.25, '#fff'); }
          else if (b.k === 'g') { ctx.fillStyle = '#2a3a18'; ctx.fillRect(x - 2, y - 3, 4, 5); ctx.fillStyle = '#5a6a32'; ctx.fillRect(x - 1, y - 2, 2, 2); }
          else if (b.k === 'c') { disc(ctx, x, y, 3, '#4a4a40'); ctx.fillStyle = '#ffd040'; ctx.fillRect(x - 1, y - 1, 2, 2); }
        }
        for (const b of g.eb) {
          const x = Math.round(b.x - cam), y = Math.round(b.y);
          if (b.k === 'b') { ctx.fillStyle = (frame & 2) ? '#ff6040' : '#ffffff'; ctx.fillRect(x - 2, y - 1, 4, 3); }
          else if (b.k === 'big') { disc(ctx, x, y, 4, '#ff3020'); disc(ctx, x, y, 2, '#ffe080'); }
          else if (b.k === 'gr') { ctx.fillStyle = '#2a3018'; ctx.fillRect(x - 2, y - 2, 4, 5); }
          else if (b.k === 'sh') { disc(ctx, x, y, 3, '#2a2a22'); ctx.fillStyle = '#ff8020'; ctx.fillRect(x - 1, y - 1, 2, 2); }
          else if (b.k === 'bomb') { ctx.fillStyle = '#303030'; ctx.fillRect(x - 3, y - 5, 6, 9); ctx.fillStyle = '#c03020'; ctx.fillRect(x - 3, y - 6, 6, 2); }
          else if (b.k === 'rk') { ctx.fillStyle = '#5a6a32'; ctx.fillRect(x - 5, y - 2, 10, 4); ctx.fillStyle = '#ffd040'; ctx.fillRect(x - Math.sign(b.vx) * 6 - 1, y - 1, 3, 2); }
        }
        for (const q of g.parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), 2, 2); }
        for (const f of g.fx) {
          const x = Math.round(f.x - cam), y = Math.round(f.y);
          if (f.k === 'boom') {
            const k = f.t / f.max, r = f.r * (0.4 + k * 0.8);
            if (k < 0.65) { disc(ctx, x, y, r, '#ff5010'); disc(ctx, x, y - r * 0.2, r * 0.7, '#ffa020'); disc(ctx, x, y - r * 0.3, r * 0.4, k < 0.3 ? '#ffffff' : '#ffe080'); }
            else { disc(ctx, x, y - k * 12, r * 0.8, '#5a5048'); disc(ctx, x - r * 0.3, y - k * 14, r * 0.5, '#7a7068'); }
          } else if (f.k === 'spark') { ctx.fillStyle = f.t & 2 ? '#fff' : '#ffd040'; ctx.fillRect(x - 2, y - 2, 4, 4); }
          else if (f.k === 'txt') otext(ctx, f.s, x, y, f.c, 1, 'center');
          else if (f.k === 'blast') {
            const len = (14 - f.t) * 5 + 10;
            for (let k = 6; k < len; k += 6) { const r = 3 + k * 0.18; disc(ctx, x + f.dx * k, y + f.dy * k, r, k + f.t * 3 & 4 ? '#ffffff' : '#ffd040'); }
          }
        }
        ctx.restore();
        drawHUD(ctx);
      }
      function drawHUD(ctx) {
        const p = g.p;
        otext(ctx, '1UP', 6, 4, '#ffd040');
        otext(ctx, String(g.score), 92, 4, '#fff', 1, 'right');
        ctx.fillStyle = '#000'; ctx.fillRect(6, 14, 86, 18); ctx.fillStyle = '#c8c8c8'; ctx.fillRect(7, 15, 84, 16); ctx.fillStyle = '#202838'; ctx.fillRect(8, 16, 82, 14);
        text(ctx, 'ARMS', 11, 17, '#ffd040'); text(ctx, 'BOMB', 53, 17, '#ffd040');
        const arms = p.slug ? '' : p.wpn === 'P' ? '\u221e' : String(p.ammo);
        if (p.slug) text(ctx, 'VULC', 11, 25, '#fff');
        else if (p.wpn === 'P') { ctx.fillStyle = '#fff'; ctx.fillRect(16, 27, 3, 2); ctx.fillRect(22, 27, 3, 2); ctx.fillRect(18, 26, 5, 1); ctx.fillRect(18, 29, 5, 1); ctx.fillRect(15, 26, 1, 4); ctx.fillRect(25, 26, 1, 4); }
        else text(ctx, arms, 11, 24, '#fff');
        text(ctx, String(p.slug ? p.slug.can : p.bombs), 53, 24, '#fff');
        otext(ctx, 'TIME', W / 2, 4, '#ffd040', 1, 'center');
        otext(ctx, String(g.timer).padStart(2, '0'), W / 2, 13, g.timer < 10 ? '#ff4040' : '#fff', 2, 'center');
        otext(ctx, '= ' + Math.max(0, g.lives - 1), 98, 17, '#fff');
        ctx.fillStyle = '#e0b048'; ctx.fillRect(98, 6, 5, 4);
        if (p.slug) {
          text(ctx, 'SLUG', 6, 36, '#ffd040');
          for (let i = 0; i < 3; i++) { ctx.fillStyle = '#000'; ctx.fillRect(32 + i * 12, 36, 11, 7); ctx.fillStyle = i < p.slug.hp ? '#40e040' : '#404040'; ctx.fillRect(33 + i * 12, 37, 9, 5); }
        }
        otext(ctx, '2UP', W - 6, 4, '#40a0ff', 1, 'right');
        otext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W - 6, 13, (frame >> 5) & 1 ? '#fff' : '#888', 1, 'right');
        otext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 6, H - 10, '#ccc', 1, 'right');
        if (g.boss && !g.boss.dead) {
          const b = g.boss; ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 61, 34, 122, 6); ctx.fillStyle = '#ff3020'; ctx.fillRect(W / 2 - 60, 35, Math.max(0, 120 * b.hp / b.max), 4);
        }
        if (g.msgT > 0) {
          otext(ctx, MNAMES[g.mission], W / 2, 70, '#ffd040', 3, 'center', '#801808');
          if (g.msgT < 110) otext(ctx, 'START!', W / 2, 98, '#ffffff', 3, 'center', '#801808');
          otext(ctx, MSUB[g.mission], W / 2, 126, '#fff', 1, 'center');
        }
        if (g.goT > 0 && (g.goT >> 4) & 1) { otext(ctx, 'GO!', W - 50, 90, '#ffd040', 2, 'center', '#801808'); otext(ctx, '>>', W - 50, 108, '#ffd040', 2, 'center', '#801808'); }
        if (g.bossPending > 0 || (g.boss && g.boss.tm < 90 && !g.boss.dying && g.phase === 'play')) otext(ctx, BOSSN[g.mission], W / 2, 60, '#ff4030', 1, 'center');
        if (g.phase === 'clear') {
          otext(ctx, MNAMES[g.mission], W / 2, 52, '#ffd040', 3, 'center', '#801808');
          otext(ctx, 'COMPLETE!', W / 2, 80, '#ffffff', 3, 'center', '#801808');
          if (g.pt > 60) otext(ctx, 'PRISONERS  ' + g.missionRescued + ' X 1000', W / 2, 120, '#fff', 1, 'center');
          if (g.pt > 100) otext(ctx, 'TIME       ' + g.timer + ' X 100', W / 2, 134, '#fff', 1, 'center');
          if (g.pt > 140) otext(ctx, 'BONUS ' + g.bonus, W / 2, 152, '#ffd040', 1, 'center');
          if (g.mission === 2 && g.pt > 220) otext(ctx, 'MISSION ALL COMPLETE!', W / 2, 176, '#40ff60', 1, 'center');
        }
        if (mode === 'over') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 90, W, 40); otext(ctx, 'GAME OVER', W / 2, 100, '#ff3020', 3, 'center'); }
      }
      function renderTitle(ctx) {
        const page = Math.floor(mt / 480) % 3;
        drawBG(ctx, THEME[page === 1 ? 1 : 0], mt * 0.5, page === 1 ? 1 : 0);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#8a5a30'; ctx.fillRect(0, 188, W, 36); ctx.fillStyle = '#5a9a2a'; ctx.fillRect(0, 186, W, 4);
        if (page !== 2) {
          // logo
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
          otext(ctx, 'METAL', W / 2, 26, '#c8c8d0', 5, 'center', '#202028');
          otext(ctx, 'SLUG', W / 2, 66, '#ffd030', 6, 'center', '#601000');
          ctx.restore();
          text(ctx, 'SUPER VEHICLE-001', W / 2, 114, '#ffffff', 1, 'center');
          const fs = { x: 0, y: 0, st: 'park', face: 1, ang: 0, inv: 0 };
          drawSlug(ctx, fs, W / 2 - 50 + ((mt >> 2) % 4 === 0 ? 0 : 0), 186, false);
          const pm = { face: -1, inv: 0, dead: 0, ground: true, crouch: false, vx: 1, anim: mt, aim: 'f', wpn: 'H', knife: 0, throwT: 0, shootT: (mt % 20 < 4) ? 5 : 0, x: W / 2 + 60 + (g ? 0 : 0), y: 186 };
          drawMarcoStatic(ctx, pm, W / 2 + 60, 186);
          text(ctx, 'HI SCORE ' + hi, W / 2, 132, '#ffd040', 1, 'center');
        } else {
          otext(ctx, 'HOW TO PLAY', W / 2, 18, '#ffd030', 2, 'center', '#601000');
          const lines = ['SPACE: SHOOT  (KNIFE UP CLOSE)', 'X: JUMP    Z / DOWN+X: GRENADE', 'UP: AIM UP   DOWN: CROUCH', 'FREE THE POWS FOR WEAPONS:', 'H HEAVY MACHINE GUN  R ROCKET', 'F FLAME SHOT   S SHOTGUN', 'B BOMBS +10', 'JUMP INTO THE METAL SLUG!'];
          lines.forEach((l, i) => otext(ctx, l, W / 2, 46 + i * 14, i === 7 ? '#40ff60' : '#fff', 1, 'center'));
          const pw = { st: 'give', tm: 40, anim: mt, face: 1 };
          drawPow(ctx, pw, 70, 186);
          drawItem(ctx, { k: 'H', t: 0 }, 92, 186);
        }
        const blink = (mt >> 4) & 1;
        if (coinFlash > 0 ? (coinFlash >> 2) & 1 : api.credits === 0 && blink) otext(ctx, 'INSERT COIN', W / 2, 150, '#fff', 1, 'center');
        else if (api.credits > 0 && blink) otext(ctx, 'PUSH START', W / 2, 150, '#fff', 1, 'center');
        otext(ctx, '\u00a9 1996 NAZCA / SNK', W / 2, 200, '#fff', 1, 'center');
        otext(ctx, 'CREDIT ' + String(Math.min(99, api.credits)).padStart(2, '0'), W - 6, H - 10, '#ccc', 1, 'right');
      }
      function drawMarcoStatic(ctx, p, x, y) {
        const flip = p.face < 0;
        const ls = SP['ml_' + ['run1', 'run2', 'run3', 'run2'][(p.anim >> 3) & 3]];
        spr(ctx, ls, x - 6, y - ls.h, flip);
        spr(ctx, SP.mt, x - 6, y - 23, flip);
        drawGun(ctx, x + p.face * 2, y - 15, p.face, 'f', 'H');
        if (p.shootT) disc(ctx, x + p.face * 22, y - 16, 3, '#fff8a0');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (mode === 'title') { renderTitle(ctx); return; }
        drawPlay(ctx);
      }
      return { update, render, destroy() { } };
    }
  });
})();
