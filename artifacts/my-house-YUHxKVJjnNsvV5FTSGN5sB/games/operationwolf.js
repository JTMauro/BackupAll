// Operation Wolf (Taito, 1987) \u2014 from-scratch recreation: scrolling gun-sight shooter with ammo, grenades, damage meter and 6 missions.
(function () {
  'use strict';
  // ---------- compact 5x7 bitmap font ----------
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
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 31, 10, 10, 10, 31, 10], '$': [4, 15, 20, 14, 5, 30, 4]
  };
  // text(ctx, str, x, y, colour, scale, align: 'left'|'center'|'right')
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
  // text with a 1px dark drop shadow
  function stext(ctx, s, x, y, col, sc, align) { text(ctx, s, x + 1, y + 1, '#000', sc, align); text(ctx, s, x, y, col, sc, align); }
  // build a sprite canvas from rows of chars + palette {char: colour}
  function spr(rows, pal) {
    const w = Math.max.apply(null, rows.map(r => r.length));
    const c = document.createElement('canvas'); c.width = w; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return c;
  }
  function flipH(src) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pad = (n, l) => String(Math.floor(n)).padStart(l, '0');

  // ======================= OPERATION WOLF =======================
  const W = 320, H = 240, PH = 200;            // playfield height; status bar below
  const HORIZON = 112;
  const MISSIONS = [
    { name: 'COMMUNICATION SETUP', sky: ['#5080c0', '#c0d8f0'], hill: '#5a7848', mid: '#3c5a30', ground: '#8a7a50', deco: 'tent', q: [30, 1, 1], uni: '#4a6a30' },
    { name: 'JUNGLE', sky: ['#406850', '#a0c090'], hill: '#2c5a2c', mid: '#1c401c', ground: '#5a5030', deco: 'tree', q: [36, 2, 1], uni: '#3a5a28' },
    { name: 'VILLAGE', sky: ['#7090c8', '#e0d0b0'], hill: '#706040', mid: '#504028', ground: '#a08858', deco: 'hut', q: [40, 2, 2], uni: '#5a6a3a' },
    { name: 'POWDER MAGAZINE', sky: ['#606070', '#b0a8a0'], hill: '#585048', mid: '#403830', ground: '#7a7060', deco: 'crate', q: [44, 2, 2], uni: '#6a6a48' },
    { name: 'CONCENTRATION CAMP', sky: ['#404860', '#9090a0'], hill: '#404040', mid: '#2c2c2c', ground: '#686058', deco: 'fence', q: [48, 3, 2], uni: '#505a40' },
    { name: 'AIRPORT', sky: ['#c07040', '#f0d0a0'], hill: '#605048', mid: '#3c3430', ground: '#707070', deco: 'plane', q: [52, 3, 3], uni: '#7a6a48' }
  ];
  // ---------- sprites ----------
  const SOLDIER = {
    run1: [
      '....hhhh....',
      '...hhhhhh...',
      '....ssss....',
      '....sksk....',
      '....ssss....',
      '...uuuuuu...',
      '..uuuuuuuu..',
      '.su.uuuu.us.',
      '.s..uuuu..s.',
      '....bbbb....',
      '....uuuu....',
      '...uu..uu...',
      '...uu...uu..',
      '..uu.....uu.',
      '..kk.....kk.'
    ],
    run2: [
      '....hhhh....',
      '...hhhhhh...',
      '....ssss....',
      '....sksk....',
      '....ssss....',
      '...uuuuuu...',
      '..uuuuuuuu..',
      '..suuuuuus..',
      '..s.uuuu.s..',
      '....bbbb....',
      '....uuuu....',
      '....uuuu....',
      '....uuuu....',
      '....uu.uu...',
      '....kk.kk...'
    ],
    aim: [
      '....hhhh....',
      '...hhhhhh...',
      '....ssss....',
      '....sksk....',
      '....ssss.ggg',
      '...uuuuggggg',
      '..uuuuussgg.',
      '..uuuuuu....',
      '...uuuuu....',
      '....bbbb....',
      '....uuuu....',
      '...uu..uu...',
      '...uu..uu...',
      '...uu..uu...',
      '..kkk..kkk..'
    ],
    fire: [
      '....hhhh..yw',
      '...hhhhhhywy',
      '....ssss.ywy',
      '....sksk..y.',
      '....ssss.ggg',
      '...uuuuggggg',
      '..uuuuussgg.',
      '..uuuuuu....',
      '...uuuuu....',
      '....bbbb....',
      '....uuuu....',
      '...uu..uu...',
      '...uu..uu...',
      '...uu..uu...',
      '..kkk..kkk..'
    ],
    die: [
      '............',
      '............',
      '...hhhh.....',
      '..hhhhhh....',
      '...ssss..s..',
      '...sksk.s...',
      's..ssss.s...',
      '.suuuuuuu...',
      '..uuuuuuu...',
      '...uuuuu....',
      '...bbbb.....',
      '..uuuuuu....',
      '.uu....uu...',
      'kk......kk..',
      '............'
    ],
    hostage: [
      '....kkkk....',
      '...kkkkkk...',
      '....ssss....',
      '....sksk....',
      '....ssss....',
      '...wwwwww...',
      '..wwwwwwww..',
      '.sw.wwww.ws.',
      '.s..wwww..s.',
      '....wwww....',
      '....bbbb....',
      '...bb..bb...',
      '...bb...bb..',
      '..bb.....bb.',
      '..kk.....kk.'
    ]
  };
  const HELI = [
    '................................................',
    '......................gggggg....................',
    '..................ggggGGGGGGgggg................',
    '..........kk....ggGGGGGGGGGGGGGGgg..............',
    '.........kkkk..gGGccccGGGGGGGGGGGGg.............',
    'ggg.......kk..gGGcccccGGGGGGGGGGGGGgggggggggggg.',
    'gGGg.........gGGcccccGGGGGGGGGGGGGGGGGGGGGGGGGgg',
    'gGGGggggggggGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGg.',
    '.gGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGgggggggggg.',
    '..gggggggggGGGGGGGGGGGGGGGGGGGGGGGGGg...........',
    '...........ggGGGGGGGGGGGGGGGGGGGGGgg............',
    '.............gggGGGGGGGGGGGGGGGggg..............',
    '................gggggggggggggg..................',
    '..................k.......k.....................',
    '...............kkkkkkkkkkkkkkkk.................'
  ];
  const TANK = [
    '..............gggggggg..................',
    '............ggGGGGGGGGgg................',
    '...........gGGGGGGGGGGGGgkkkkkkkkkkkkkkk',
    '...........gGGGGkkGGGGGGgkkkkkkkkkkkkkkk',
    '......ggggggggggggggggggggggg...........',
    '....ggGGGGGGGGGGGGGGGGGGGGGGGGgg........',
    '...gGGGGGGGGGGGGGGGGGGGGGGGGGGGGg.......',
    '..gGGGGwGGGGGGGGGGGGGGGGGGGGGwGGGg......',
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
    'kkdkkdkkdkkdkkdkkdkkdkkdkkdkkdkkdkkk....',
    'kdddkdddkdddkdddkdddkdddkdddkdddkddk....',
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....'
  ];
  const VULTURE = [[
    'kk..........kk',
    '.kkk......kkk.',
    '..kkkk..kkkk..',
    '....kkwwkk....',
    '.....kwrk.....',
    '......kk......'
  ], [
    '..............',
    '..............',
    'kkkkkkwwkkkkkk',
    '.kkk..kwrk.kk.',
    '......kk......',
    '..............'
  ]];
  const ITEMS = {
    mag: { rows: ['.kkkk.', '.kyyk.', '.kyyk.', '.kyyk.', '.kyyk.', 'kkkkkk', '.kyyk.', '..kk..'], pal: { k: '#202020', y: '#e0c040' }, label: 'M' },
    gren: { rows: ['..kk..', '.kgg..', 'kgGGgk', 'gGgGgG', 'gGgGgG', 'kgGGgk', '.gggg.'], pal: { k: '#202020', g: '#507030', G: '#304818' }, label: 'G' },
    drink: { rows: ['..ww..', '.wrrw.', '.rwwr.', '.rrrr.', '.rwwr.', '.rrrr.', '.rrrr.'], pal: { w: '#fff', r: '#e02020' }, label: 'P' },
    free: { rows: ['wwwwww', 'wkwkkw', 'wkkwkw', 'wkwkkw', 'wwwwww'], pal: { w: '#ffe040', k: '#c02020' }, label: 'F' }
  };
  function soldierSet(uni) {
    const pal = { h: '#405020', s: '#e0a070', k: '#202020', u: uni, b: '#6a4a20', g: '#303030', y: '#ffe040', w: '#ffffff' };
    const o = {};
    for (const k in SOLDIER) { o[k] = spr(SOLDIER[k], pal); o[k + 'L'] = flipH(o[k]); }
    return o;
  }
  const HELI_IMG = spr(HELI, { g: '#404830', G: '#606a48', c: '#80c0e0', k: '#202020' });
  const HELI_L = flipH(HELI_IMG);
  const TANK_IMG = spr(TANK, { g: '#505838', G: '#707a50', k: '#202020', d: '#606060', w: '#ffffff' });
  const TANK_L = flipH(TANK_IMG);
  const VUL = VULTURE.map(r => spr(r, { k: '#302820', w: '#e0d0c0', r: '#c02020' }));
  const ITEM_IMG = {}; for (const k in ITEMS) ITEM_IMG[k] = spr(ITEMS[k].rows, ITEMS[k].pal);

  ArcadeRegistry.register({
    id: 'operationwolf', title: 'Operation Wolf', year: 1987, maker: 'Taito',
    width: W, height: H, vector: false, pointer: true,
    controls: 'Mouse or Arrows: aim \u00b7 Click / Space: fire \u00b7 X: grenade \u00b7 Enter: start',
    marquee: { bg: '#2c3a1c', fg: '#e8d070', accent: '#ff3020' },
    create(api) {
      const au = api.audio;
      let hi = api.getHiScore(50000);
      let mode = 'title', modeT = 0, frame = 0, coinFlash = 0;
      let G = null;
      const sets = MISSIONS.map(m => soldierSet(m.uni));
      let lastMX = api.mouse.x, lastMY = api.mouse.y, mouseMode = false;

      const snd = {
        shot() { au.noise(0.05, { vol: 0.16, freq: 5000, type: 'highpass' }); au.tone(140, 0.04, { type: 'square', vol: 0.06 }); },
        click() { au.tone(1800, 0.02, { type: 'square', vol: 0.06 }); },
        reload() { au.tone(900, 0.03, { type: 'square', vol: 0.08 }); au.tone(600, 0.04, { type: 'square', vol: 0.08, delay: 0.12 }); },
        hit() { au.tone(700, 0.12, { type: 'sawtooth', vol: 0.08, slideTo: 200 }); },
        efire() { au.noise(0.08, { vol: 0.1, freq: 1800 }); },
        boom() { au.noise(0.6, { vol: 0.28, freq: 1200, slideTo: 60 }); au.tone(90, 0.4, { type: 'sawtooth', vol: 0.12, slideTo: 30 }); },
        throwG() { au.tone(400, 0.2, { type: 'triangle', vol: 0.08, slideTo: 200 }); },
        ouch() { au.tone(220, 0.15, { type: 'square', vol: 0.14, slideTo: 110 }); au.noise(0.1, { vol: 0.08, freq: 800 }); },
        item() { au.melody([[880, .05], [1175, .05], [1568, .1]], { type: 'square', vol: 0.12 }); },
        rotor() { au.noise(0.06, { vol: 0.05, freq: 300 }); },
        clear() { au.melody([[392, .15], [392, .15], [392, .15], [523, .45], [392, .15], [523, .6]], { type: 'square', vol: 0.14 }); },
        empty() { au.tone(200, 0.05, { type: 'square', vol: 0.06 }); }
      };
      function tryStart() {
        if (api.useCredit()) return true;
        coinFlash = 90; au.tone(90, 0.25, { type: 'square', vol: 0.14 });
        return false;
      }

      // ---------- game ----------
      function newGame(demo) {
        G = { demo: !!demo, score: 0, mission: 0, loop: 0, damage: 0, bullets: 30, mags: 6, grenades: 5, free: 0,
          cx: W / 2, cy: PH / 2, fireCool: 0, reloadT: 0, flash: 0, extraAt: 0 };
        startMission();
      }
      function startMission() {
        const M = MISSIONS[G.mission];
        const k = 1 + G.loop * 0.3;
        G.need = { sold: Math.round(M.q[0] * k), heli: M.q[1], tank: M.q[2] };
        G.ents = []; G.fx = []; G.proj = []; G.items = []; G.nades = [];
        G.bgX = 0; G.spawnT = 90; G.phase = G.demo ? 'play' : 'intro'; G.phaseT = 180;
        G.outT = 0; G.msg = ''; G.msgT = 0;
        if (!G.demo) au.melody([[262, .12], [262, .12], [392, .3], [349, .12], [330, .12], [294, .12], [262, .4]], { type: 'square', vol: 0.12 });
      }
      function addScore(n) {
        if (G.demo) return;
        G.score += n; if (G.score > hi) hi = G.score;
      }
      const scaleOf = z => 1.1 + z * 2.0;              // sprite scale by depth
      const groundOf = z => HORIZON + 8 + z * 78;       // feet y by depth

      function spawn() {
        const M = G.mission, diff = 1 + G.loop * 0.4 + M * 0.08;
        const r = Math.random();
        const helis = G.ents.filter(e => e.kind === 'heli' && !e.dead).length;
        const tanks = G.ents.filter(e => e.kind === 'tank' && !e.dead).length;
        const side = Math.random() < 0.5 ? -1 : 1;
        if (r < 0.08 && G.need.heli > 0 && !helis) {
          G.ents.push({ kind: 'heli', x: side < 0 ? -40 : W + 40, y: rand(30, 70), vx: -side * 0.9, hp: 14, z: 0.5, t: 0, fireT: 120 });
        } else if (r < 0.15 && G.need.tank > 0 && !tanks) {
          const z = rand(0.15, 0.35);
          G.ents.push({ kind: 'tank', x: side < 0 ? -50 : W + 50, z, vx: -side * 0.45, hp: 22, t: 0, fireT: 160, stopX: rand(80, W - 80) });
        } else if (r < 0.2) {
          const z = rand(0.2, 0.6);
          G.ents.push({ kind: 'hostage', x: side < 0 ? -10 : W + 10, z, vx: -side * 0.7, t: 0 });
        } else if (r < 0.27) {
          G.ents.push({ kind: 'vulture', x: side < 0 ? -10 : W + 10, y: rand(20, 60), vx: -side * 1.2, z: 0.3, t: 0, hp: 1 });
        } else if (G.need.sold > 0 || Math.random() < 0.3) {
          const z = Math.pow(Math.random(), 1.3);
          const near = z > 0.75;
          const popup = !near && Math.random() < 0.25;
          const sp = (0.5 + Math.random() * 0.6) * (0.6 + z * 0.8) * Math.min(1.8, diff);
          G.ents.push({ kind: 'sold', x: popup ? rand(30, W - 30) : (side < 0 ? -10 : W + 10), z, vx: popup ? 0 : -side * sp, dir: -side, t: 0,
            st: popup ? 'aim' : 'run', stT: popup ? 70 : irand(40, 160), hp: 1, popup, throws: near && Math.random() < 0.5 });
        }
      }
      function hitTest(e, x, y) {
        // returns true if screen point is inside entity's hitbox
        if (e.kind === 'sold' || e.kind === 'hostage') {
          const s = scaleOf(e.z), fy = groundOf(e.z);
          return Math.abs(x - e.x) < 5 * s && y < fy && y > fy - 15 * s;
        }
        if (e.kind === 'heli') return Math.abs(x - e.x) < 24 && Math.abs(y - e.y) < 9;
        if (e.kind === 'tank') { const s = scaleOf(e.z) * 0.8, fy = groundOf(e.z); return Math.abs(x - e.x) < 20 * s && y < fy && y > fy - 12 * s; }
        if (e.kind === 'vulture') return Math.abs(x - e.x) < 9 && Math.abs(y - e.y) < 5;
        return false;
      }
      function fire() {
        const x = G.cx, y = G.cy;
        G.fx.push({ k: 'spark', x, y, t: 0 });
        snd.shot();
        // projectiles first (they are closest)
        for (const p of G.proj) if (!p.dead && Math.hypot(p.x - x, p.y - y) < 4 + p.z * 6) { p.dead = true; addScore(50); G.fx.push({ k: 'pop', x: p.x, y: p.y, t: 0 }); return; }
        for (const it of G.items) if (!it.got && Math.abs(it.x - x) < 8 && Math.abs(it.y - y) < 8) { collect(it); return; }
        const order = G.ents.filter(e => !e.dead).sort((a, b) => (b.z || 0) - (a.z || 0));
        for (const e of order) {
          if (!hitTest(e, x, y)) continue;
          damageEnt(e, 1, x, y);
          return;
        }
        G.fx.push({ k: 'dust', x, y, t: 0 });
      }
      function damageEnt(e, n, x, y) {
        if (e.kind === 'hostage') {
          e.dead = true; e.deadT = 0; hurt(5); snd.hit();
          G.msg = "DON'T SHOOT HOSTAGES!"; G.msgT = 90; return;
        }
        e.hp -= n; e.flash = 4;
        if (e.hp > 0) { G.fx.push({ k: 'spark', x, y, t: 0 }); return; }
        e.dead = true; e.deadT = 0;
        if (e.kind === 'sold') { addScore(e.z > 0.75 ? 200 : 100); G.need.sold = Math.max(0, G.need.sold - 1); snd.hit(); if (Math.random() < 0.12) dropItem(e.x, groundOf(e.z) - 8); }
        else if (e.kind === 'heli') { addScore(2000); G.need.heli = Math.max(0, G.need.heli - 1); boom(e.x, e.y, 2); }
        else if (e.kind === 'tank') { addScore(3000); G.need.tank = Math.max(0, G.need.tank - 1); boom(e.x, groundOf(e.z) - 10, 2); }
        else if (e.kind === 'vulture') { addScore(300); dropItem(e.x, e.y); snd.hit(); }
      }
      function dropItem(x, y, kind) {
        const r = Math.random();
        kind = kind || (r < 0.45 ? 'mag' : r < 0.75 ? 'gren' : r < 0.92 ? 'drink' : 'free');
        G.items.push({ kind, x, y, vy: -1.5, t: 0, floor: Math.min(PH - 12, y + 30 + Math.random() * 20) });
      }
      function collect(it) {
        it.got = true; snd.item();
        if (it.kind === 'mag') { G.mags = Math.min(9, G.mags + 1); G.msg = 'MAGAZINE'; }
        else if (it.kind === 'gren') { G.grenades = Math.min(9, G.grenades + 1); G.msg = 'GRENADE'; }
        else if (it.kind === 'drink') { G.damage = Math.max(0, G.damage - 15); G.msg = 'POWER DRINK'; }
        else { G.free = 600; G.msg = 'FREE FIRE!'; }
        G.msgT = 60; addScore(500);
      }
      function boom(x, y, big) {
        G.fx.push({ k: 'boom', x, y, t: 0, big }); snd.boom();
      }
      function hurt(n) {
        if (G.demo || G.phase !== 'play') return;
        G.damage = Math.min(100, G.damage + n); G.flash = 8; snd.ouch();
      }
      function throwGrenade() {
        if (G.grenades <= 0) { snd.empty(); return; }
        G.grenades--; snd.throwG();
        G.nades.push({ sx: W / 2, sy: PH + 10, tx: G.cx, ty: G.cy, t: 0 });
      }
      function nadeExplode(n) {
        boom(n.tx, n.ty, 1);
        for (const e of G.ents) {
          if (e.dead) continue;
          let ex = e.x, ey = e.kind === 'heli' || e.kind === 'vulture' ? e.y : groundOf(e.z) - 10;
          const d = Math.hypot(ex - n.tx, ey - n.ty);
          if (e.kind === 'heli' && d < 50) damageEnt(e, 10, ex, ey);
          else if (e.kind === 'tank' && d < 50) damageEnt(e, 12, ex, ey);
          else if (d < 40 && e.kind !== 'heli' && e.kind !== 'tank') damageEnt(e, 5, ex, ey);
        }
        for (const p of G.proj) if (Math.hypot(p.x - n.tx, p.y - n.ty) < 40) p.dead = true;
      }

      // ---------- per-frame ----------
      function updateAim() {
        if (G.demo) {
          // attract mode: drift onto the nearest soldier and fire
          const t = G.ents.filter(e => !e.dead && e.kind !== 'hostage').sort((a, b) => (b.z || 0) - (a.z || 0))[0];
          if (t) {
            const ty = t.kind === 'heli' || t.kind === 'vulture' ? t.y : groundOf(t.z) - 8 * scaleOf(t.z);
            G.cx += clamp(t.x - G.cx, -3, 3); G.cy += clamp(ty - G.cy, -3, 3);
            if (Math.hypot(t.x - G.cx, ty - G.cy) < 5 && frame % 6 === 0) fire();
          }
          return;
        }
        if (Math.abs(api.mouse.x - lastMX) > 0.5 || Math.abs(api.mouse.y - lastMY) > 0.5) mouseMode = true;
        lastMX = api.mouse.x; lastMY = api.mouse.y;
        let kx = 0, ky = 0;
        if (api.key('ArrowLeft')) kx--; if (api.key('ArrowRight')) kx++;
        if (api.key('ArrowUp')) ky--; if (api.key('ArrowDown')) ky++;
        if (kx || ky) { mouseMode = false; G.aimV = Math.min(4.2, (G.aimV || 1.5) + 0.12); G.cx += kx * G.aimV; G.cy += ky * G.aimV; }
        else G.aimV = 1.5;
        if (mouseMode) { G.cx = api.mouse.x; G.cy = api.mouse.y; }
        G.cx = clamp(G.cx, 2, W - 2); G.cy = clamp(G.cy, 2, PH - 2);
        // fire
        if (G.fireCool > 0) G.fireCool--;
        if (G.reloadT > 0) { if (--G.reloadT === 0) { G.bullets = 30; snd.reload(); } }
        const trig = api.key('Space') || (mouseMode && api.mouse.down);
        if (trig && G.fireCool <= 0 && G.reloadT <= 0) {
          if (G.free > 0 || G.bullets > 0) {
            fire(); if (G.free <= 0) G.bullets--; G.fireCool = 6;
            if (G.bullets <= 0 && G.free <= 0 && G.mags > 0) { G.mags--; G.reloadT = 40; }
          } else if (api.pressed('Space') || api.mouse.clicked) snd.empty();
        }
        if (G.free > 0) G.free--;
        if (api.pressed('KeyX') || api.pressed('KeyZ')) throwGrenade();
        // emergency resupply so the player can never be stranded without ammo
        if (G.bullets <= 0 && G.mags <= 0 && G.free <= 0) {
          if (++G.outT % 240 === 0) dropItem(rand(60, W - 60), rand(60, 120), 'mag');
          if (G.outT === 1) { G.msg = 'OUT OF AMMO!'; G.msgT = 120; }
        } else G.outT = 0;
      }
      function updateEnts() {
        const diff = 1 + G.loop * 0.4 + G.mission * 0.1;
        if (--G.spawnT <= 0) {
          spawn();
          const busy = G.ents.filter(e => !e.dead).length;
          G.spawnT = Math.max(12, Math.round((60 - G.mission * 5 - G.loop * 10) * (busy > 8 ? 2 : 1) * rand(0.6, 1.3)));
        }
        G.bgX += 0.35;
        for (const e of G.ents) {
          e.t++; if (e.flash > 0) e.flash--;
          if (e.dead) { e.deadT++; if (e.kind === 'heli') { e.y += 1.5; e.x += e.vx; if (e.deadT % 8 === 0) G.fx.push({ k: 'boom', x: e.x + rand(-15, 15), y: e.y, t: 0 }); } continue; }
          if (e.kind === 'sold') {
            if (e.st === 'run') {
              e.x += e.vx;
              if (--e.stT <= 0 && e.x > 10 && e.x < W - 10) {
                e.st = e.throws ? 'throw' : 'aim'; e.stT = Math.max(28, Math.round((e.throws ? 40 : 75) / diff + rand(0, 30)));
              }
            } else if (e.st === 'aim' || e.st === 'throw') {
              e.dir = e.x < W / 2 ? 1 : -1;
              if (--e.stT <= 0) {
                if (e.st === 'aim') { e.st = 'fire'; e.stT = 10; snd.efire(); if (Math.random() < 0.5 + e.z * 0.45) hurt(e.z > 0.75 ? 3 : e.z > 0.4 ? 2 : 1); }
                else {
                  e.st = 'run'; e.stT = irand(60, 140);
                  G.proj.push({ x: e.x, y: groundOf(e.z) - 14 * scaleOf(e.z), z: 0, kind: Math.random() < 0.5 ? 'knife' : 'grenade', t: 0 });
                  if (e.vx === 0) e.vx = e.dir * 0.8;
                }
              }
            } else if (e.st === 'fire') {
              if (--e.stT <= 0) {
                if (e.popup && Math.random() < 0.5) { e.st = 'aim'; e.stT = Math.round(70 / diff + rand(0, 40)); }
                else { e.st = 'run'; e.stT = irand(60, 200); if (e.vx === 0) e.vx = (Math.random() < 0.5 ? -1 : 1) * 0.8; }
              }
            }
            if (e.x < -30 || e.x > W + 30) e.gone = true;
          } else if (e.kind === 'hostage') {
            e.x += e.vx; if (e.x < -30 || e.x > W + 30) e.gone = true;
          } else if (e.kind === 'vulture') {
            e.x += e.vx; e.y += Math.sin(e.t * 0.08) * 0.6; if (e.x < -30 || e.x > W + 30) e.gone = true;
          } else if (e.kind === 'heli') {
            e.y += Math.sin(e.t * 0.05) * 0.4;
            if (e.x > 40 && e.x < W - 40 && e.t % 400 < 220) e.x += e.vx * 0.2; else e.x += e.vx;
            if ((e.x < -60 && e.vx < 0) || (e.x > W + 60 && e.vx > 0)) { e.vx = -e.vx; }
            if (e.t % 12 === 0) snd.rotor();
            if (--e.fireT <= 0) {
              e.fireT = Math.round(90 / diff + rand(0, 60));
              G.proj.push({ x: e.x, y: e.y + 8, z: 0, kind: 'rocket', t: 0 });
              snd.efire();
            }
          } else if (e.kind === 'tank') {
            if (Math.abs(e.x - e.stopX) > 2 || e.t > 900) e.x += e.vx;
            if (e.x < -80 || e.x > W + 80) { e.vx = -e.vx; e.stopX = rand(80, W - 80); e.t = 0; }
            if (--e.fireT <= 0) {
              e.fireT = Math.round(150 / diff + rand(0, 80));
              G.proj.push({ x: e.x + (e.vx < 0 ? -18 : 18), y: groundOf(e.z) - 14, z: 0, kind: 'shell', t: 0 });
              snd.boom();
            }
          }
        }
        G.ents = G.ents.filter(e => !e.gone && !(e.dead && e.deadT > (e.kind === 'heli' ? 90 : 40)));
        // incoming projectiles swell toward the screen; shoot them down
        for (const p of G.proj) {
          if (p.dead) continue;
          p.t++; p.z += p.kind === 'shell' ? 0.012 : p.kind === 'rocket' ? 0.014 : 0.01;
          p.y += p.kind === 'grenade' ? -1.2 + p.t * 0.04 : 0.3;
          if (p.z >= 1) {
            p.dead = true;
            hurt(p.kind === 'shell' ? 8 : p.kind === 'rocket' ? 6 : 4);
            G.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0 });
          }
        }
        G.proj = G.proj.filter(p => !p.dead);
        for (const n of G.nades) { n.t++; if (n.t === 30) nadeExplode(n); }
        G.nades = G.nades.filter(n => n.t < 30);
        for (const it of G.items) { it.t++; if (it.y < it.floor) { it.vy += 0.1; it.y = Math.min(it.floor, it.y + it.vy); } }
        G.items = G.items.filter(it => !it.got && it.t < 480);
        for (const f of G.fx) f.t++;
        G.fx = G.fx.filter(f => f.t < (f.k === 'boom' ? (f.big ? 50 : 30) : 10));
      }

      function update() {
        frame++; modeT++;
        if (coinFlash > 0) coinFlash--;
        if (mode === 'title') {
          if (!G || !G.demo) newGame(true);
          if (modeT % 1200 === 0) { G.mission = (G.mission + 1) % MISSIONS.length; startMission(); }
          updateAim(); updateEnts();
          if ((api.anyPressed('Enter', 'Space') || api.mouse.clicked) && tryStart()) { mode = 'game'; modeT = 0; newGame(false); }
          return;
        }
        if (G.msgT > 0) G.msgT--;
        if (G.flash > 0) G.flash--;
        if (G.phase === 'intro') {
          if (--G.phaseT <= 0 || (G.phaseT < 120 && (api.anyPressed('Space') || api.mouse.clicked))) G.phase = 'play';
          return;
        }
        if (G.phase === 'clear') {
          for (const f of G.fx) f.t++;
          if (--G.phaseT <= 0) {
            G.mission++; if (G.mission >= MISSIONS.length) { G.mission = 0; G.loop++; }
            startMission();
          }
          return;
        }
        if (G.phase === 'over') {
          if (--G.phaseT <= 0 || (G.phaseT < 240 && api.anyPressed('Enter'))) { mode = 'title'; modeT = 0; G = null; }
          return;
        }
        if (G.phase === 'dead') {
          if (--G.phaseT === 60) {
            if (api.offerContinue) api.offerContinue(() => { G.damage = 0; G.bullets = 30; G.mags = Math.max(G.mags, 5); G.grenades = Math.max(G.grenades, 3); G.phase = 'play'; G.proj = []; }, gameOver);
            else gameOver();
          }
          return;
        }
        updateAim(); updateEnts();
        if (G.need.sold <= 0 && G.need.heli <= 0 && G.need.tank <= 0) {
          G.phase = 'clear'; G.phaseT = 300;
          G.bonus = (100 - G.damage) * 100 + (G.mags * 30 + G.bullets) * 10 + G.grenades * 500;
          addScore(G.bonus);
          G.damage = Math.max(0, G.damage - 25);
          G.mags = Math.max(G.mags, 4); G.grenades = Math.max(G.grenades, 3);
          G.ents.forEach(e => { if (!e.dead && e.kind !== 'hostage') { e.dead = true; e.deadT = 0; } });
          G.proj = [];
          snd.clear();
        } else if (G.damage >= 100) {
          G.phase = 'dead'; G.phaseT = 120;
          au.melody([[392, .2], [370, .2], [349, .2], [330, .6]], { type: 'square', vol: 0.14 });
        }
      }
      function gameOver() {
        api.setHiScore(G.score);
        G.phase = 'over'; G.phaseT = 420;
      }

      // ---------- drawing ----------
      function drawBG(ctx) {
        const M = MISSIONS[G.mission];
        const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
        g.addColorStop(0, M.sky[0]); g.addColorStop(1, M.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORIZON);
        // far hills
        ctx.fillStyle = M.hill;
        const o1 = G.bgX * 0.3;
        for (let x = 0; x < W; x += 4) {
          const wx = x + o1;
          const h = 18 + Math.sin(wx * 0.02) * 10 + Math.sin(wx * 0.053) * 6;
          ctx.fillRect(x, HORIZON - h, 4, h);
        }
        // ground
        ctx.fillStyle = M.ground; ctx.fillRect(0, HORIZON, W, PH - HORIZON);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let i = 0; i < 8; i++) { const y = HORIZON + 4 + i * i * 1.4; ctx.fillRect(0, y | 0, W, 1 + (i >> 2)); }
        // mid-layer decorations scroll with the march
        const o2 = G.bgX;
        const sp = 110;
        for (let k = Math.floor(o2 / sp) - 1; k < Math.floor((o2 + W) / sp) + 2; k++) {
          const x = k * sp - o2 + ((k * 37) % 40);
          drawDeco(ctx, M, x, HORIZON + 4, k);
        }
      }
      function drawDeco(ctx, M, x, y, k) {
        ctx.fillStyle = M.mid;
        switch (M.deco) {
          case 'tree':
            ctx.fillStyle = '#4a3418'; ctx.fillRect(x + 8, y - 40, 5, 42);
            ctx.fillStyle = M.mid; ctx.fillRect(x - 6, y - 60, 34, 24); ctx.fillRect(x, y - 70, 22, 12);
            ctx.fillStyle = M.hill; ctx.fillRect(x - 2, y - 56, 10, 8); break;
          case 'hut':
            ctx.fillStyle = '#806040'; ctx.fillRect(x, y - 24, 36, 26);
            ctx.fillStyle = '#c0a060'; ctx.beginPath(); ctx.moveTo(x - 6, y - 24); ctx.lineTo(x + 18, y - 42); ctx.lineTo(x + 42, y - 24); ctx.fill();
            ctx.fillStyle = '#302010'; ctx.fillRect(x + 14, y - 14, 8, 16); break;
          case 'tent':
            ctx.fillStyle = '#6a7a48'; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 20, y - 22); ctx.lineTo(x + 40, y + 2); ctx.fill();
            ctx.fillStyle = '#303820'; ctx.fillRect(x + 17, y - 8, 6, 10);
            if (k % 3 === 0) { ctx.fillStyle = '#505050'; ctx.fillRect(x + 50, y - 60, 2, 62); ctx.fillRect(x + 44, y - 60, 14, 2); ctx.fillRect(x + 46, y - 50, 10, 2); }
            break;
          case 'crate':
            ctx.fillStyle = '#8a6a38'; ctx.fillRect(x, y - 18, 22, 20); ctx.fillRect(x + 22, y - 10, 16, 12); ctx.fillRect(x + 6, y - 32, 18, 14);
            ctx.fillStyle = '#5a4020'; ctx.fillRect(x, y - 9, 22, 2); ctx.fillRect(x + 10, y - 18, 2, 20); ctx.fillRect(x + 6, y - 26, 18, 2); break;
          case 'fence':
            ctx.fillStyle = '#504838'; for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 28, y - 34, 3, 36);
            ctx.fillStyle = '#808080'; for (let j = 0; j < 4; j++) ctx.fillRect(x, y - 30 + j * 8, 110, 1);
            if (k % 2 === 0) { ctx.fillStyle = '#504838'; ctx.fillRect(x + 40, y - 60, 4, 62); ctx.fillRect(x + 30, y - 66, 24, 10); } break;
          case 'plane':
            if (k % 2 === 0) {
              ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x, y - 16, 70, 10); ctx.fillRect(x + 25, y - 22, 14, 22); ctx.fillRect(x + 62, y - 28, 8, 14);
              ctx.fillStyle = '#404040'; ctx.fillRect(x + 6, y - 14, 50, 2);
            } else { ctx.fillStyle = '#505050'; ctx.fillRect(x, y - 50, 30, 52); ctx.fillStyle = '#80c0e0'; ctx.fillRect(x + 4, y - 46, 22, 8); }
            break;
        }
      }
      function drawEnt(ctx, e) {
        const S = sets[G.mission];
        if (e.kind === 'sold' || e.kind === 'hostage') {
          const s = scaleOf(e.z), fy = groundOf(e.z);
          let key;
          if (e.kind === 'hostage') key = 'hostage';
          else if (e.dead) key = 'die';
          else if (e.st === 'run') key = ((e.t >> 3) & 1) ? 'run1' : 'run2';
          else if (e.st === 'fire') key = 'fire';
          else key = 'aim';
          const facing = e.kind === 'hostage' ? (e.vx < 0 ? -1 : 1) : (e.st === 'run' ? (e.vx < 0 ? -1 : 1) : e.dir);
          const img = S[key + (facing < 0 ? 'L' : '')];
          const w = img.width * s, h = img.height * s;
          if (e.dead && e.kind === 'hostage') { ctx.globalAlpha = Math.max(0, 1 - e.deadT / 40); }
          if (e.popup && !e.dead && e.st !== 'run') {
            // popping up from behind cover: only the upper body shows
            ctx.drawImage(img, 0, 0, img.width, 9, Math.round(e.x - w / 2), Math.round(fy - h), Math.round(w), Math.round(9 * s));
            ctx.fillStyle = '#6a5a38'; ctx.fillRect(Math.round(e.x - w * 0.7), Math.round(fy - h + 9 * s), Math.round(w * 1.4), Math.round(h - 9 * s));
            ctx.fillStyle = '#4a3a20'; ctx.fillRect(Math.round(e.x - w * 0.7), Math.round(fy - h + 9 * s), Math.round(w * 1.4), Math.max(1, Math.round(s)));
          } else ctx.drawImage(img, Math.round(e.x - w / 2), Math.round(fy - h), Math.round(w), Math.round(h));
          ctx.globalAlpha = 1;
          if (e.kind === 'sold' && !e.dead && e.st === 'aim' && e.stT < 20 && (frame & 4)) { ctx.fillStyle = '#ff2020'; ctx.fillRect(Math.round(e.x + e.dir * w * 0.5), Math.round(fy - h * 0.7), 2, 2); }
        } else if (e.kind === 'heli') {
          const img = e.vx < 0 ? HELI_IMG : HELI_L;
          if (e.flash > 0 && (frame & 2)) ctx.globalAlpha = 0.5;
          ctx.drawImage(img, Math.round(e.x - 24), Math.round(e.y - 8));
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#202020';
          const rw = (frame & 2) ? 40 : 26;
          ctx.fillRect(Math.round(e.x - rw / 2), Math.round(e.y - 8), rw, 1);
        } else if (e.kind === 'tank') {
          const s = scaleOf(e.z) * 0.8, fy = groundOf(e.z);
          const img = e.vx < 0 ? TANK_IMG : TANK_L;
          if (e.flash > 0 && (frame & 2)) ctx.globalAlpha = 0.5;
          if (!e.dead) ctx.drawImage(img, Math.round(e.x - img.width * s / 2), Math.round(fy - img.height * s), Math.round(img.width * s), Math.round(img.height * s));
          else { ctx.fillStyle = '#202020'; ctx.fillRect(Math.round(e.x - 16 * s), Math.round(fy - 6 * s), Math.round(32 * s), Math.round(6 * s)); }
          ctx.globalAlpha = 1;
        } else if (e.kind === 'vulture') {
          if (!e.dead) ctx.drawImage(VUL[(e.t >> 3) & 1], Math.round(e.x - 7), Math.round(e.y - 3));
        }
      }
      function drawFX(ctx, f) {
        if (f.k === 'spark') { ctx.fillStyle = (f.t & 2) ? '#fff' : '#ffe040'; ctx.fillRect(f.x - 1, f.y - 1, 3, 3); }
        else if (f.k === 'dust') { ctx.fillStyle = 'rgba(200,180,140,' + (1 - f.t / 10) + ')'; ctx.fillRect(f.x - 2 - f.t / 2, f.y - f.t, 4 + f.t, 3); }
        else if (f.k === 'pop') { ctx.fillStyle = '#fff'; ctx.fillRect(f.x - f.t, f.y - f.t, f.t * 2, f.t * 2); }
        else if (f.k === 'boom') {
          const r = (f.big ? 30 : 18) * Math.sin(Math.min(1, f.t / (f.big ? 50 : 30)) * Math.PI) + 3;
          ctx.fillStyle = f.t < 6 ? '#fff' : f.t < 14 ? '#ffe040' : f.t < 24 ? '#ff8020' : '#604020';
          ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
          if (f.t < 20) { ctx.fillStyle = '#ff3020'; ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.5, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      function drawProj(ctx, p) {
        const s = 1 + p.z * 6;
        if (p.kind === 'knife') {
          ctx.fillStyle = '#e0e0e0'; ctx.fillRect(Math.round(p.x - s), Math.round(p.y - s * 0.3), Math.round(s * 2), Math.max(1, Math.round(s * 0.5)));
          ctx.fillStyle = '#6a4a20'; ctx.fillRect(Math.round(p.x + s * 0.6), Math.round(p.y - s * 0.4), Math.round(s * 0.6), Math.max(1, Math.round(s * 0.7)));
        } else if (p.kind === 'grenade') {
          ctx.fillStyle = '#405020'; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#202020'; ctx.fillRect(Math.round(p.x - s * 0.3), Math.round(p.y - s * 1.3), Math.max(1, Math.round(s * 0.6)), Math.max(1, Math.round(s * 0.5)));
        } else {
          ctx.fillStyle = (frame & 2) ? '#ff8020' : '#ffe040'; ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#404040'; ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      function drawCross(ctx) {
        const x = Math.round(G.cx), y = Math.round(G.cy);
        const c = G.reloadT > 0 ? '#ffe040' : '#ff2020';
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 9, y, 7, 1); ctx.fillRect(x + 3, y, 7, 1); ctx.fillRect(x, y - 9, 1, 7); ctx.fillRect(x, y + 3, 1, 7);
        ctx.fillStyle = c;
        ctx.fillRect(x - 10, y - 1, 7, 1); ctx.fillRect(x + 4, y - 1, 7, 1); ctx.fillRect(x - 1, y - 10, 1, 7); ctx.fillRect(x - 1, y + 4, 1, 7);
        ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(x - 0.5, y - 0.5, 6, 0, Math.PI * 2); ctx.stroke();
      }
      function drawStatus(ctx) {
        ctx.fillStyle = '#181810'; ctx.fillRect(0, PH, W, H - PH);
        ctx.fillStyle = '#5a5a40'; ctx.fillRect(0, PH, W, 1);
        // magazines
        text(ctx, 'MAG', 4, PH + 4, '#e8d070');
        for (let i = 0; i < G.mags; i++) { ctx.fillStyle = '#e0c040'; ctx.fillRect(4 + i * 6, PH + 13, 4, 9); ctx.fillStyle = '#806020'; ctx.fillRect(4 + i * 6, PH + 13, 4, 2); }
        // bullets in the magazine
        ctx.fillStyle = '#303020'; ctx.fillRect(4, PH + 25, 61, 10);
        if (G.free > 0) text(ctx, 'FREE', 20, PH + 27, (frame & 8) ? '#ffe040' : '#ff3020');
        else if (G.reloadT > 0) text(ctx, 'RELOAD', 16, PH + 27, (frame & 8) ? '#ffe040' : '#806020');
        else for (let i = 0; i < G.bullets; i++) { ctx.fillStyle = '#e0c040'; ctx.fillRect(5 + i * 2, PH + 26, 1, 8); }
        // grenades
        text(ctx, 'GRN', 72, PH + 4, '#e8d070');
        for (let i = 0; i < G.grenades; i++) { ctx.fillStyle = '#507030'; ctx.fillRect(72 + i * 7, PH + 14, 5, 6); ctx.fillStyle = '#202020'; ctx.fillRect(74 + i * 7, PH + 12, 1, 2); }
        // damage meter
        text(ctx, 'DAMAGE', 72, PH + 26, '#e8d070');
        ctx.fillStyle = '#000'; ctx.fillRect(110, PH + 25, 52, 10);
        ctx.fillStyle = G.damage > 75 ? ((frame & 8) ? '#ff2020' : '#801010') : '#ff6020';
        ctx.fillRect(111, PH + 26, Math.round(G.damage / 2), 8);
        // quotas
        text(ctx, 'ENEMY', 172, PH + 4, '#e8d070'); text(ctx, pad(G.need.sold, 2), 206, PH + 4, '#fff');
        text(ctx, 'HELI', 172, PH + 15, '#e8d070'); text(ctx, String(G.need.heli), 206, PH + 15, '#fff');
        text(ctx, 'ARMOR', 172, PH + 26, '#e8d070'); text(ctx, String(G.need.tank), 206, PH + 26, '#fff');
        text(ctx, 'SCORE', 226, PH + 4, '#e8d070'); text(ctx, pad(G.score, 7), 262, PH + 4, '#fff');
        text(ctx, 'HI', 226, PH + 15, '#e8d070'); text(ctx, pad(hi, 7), 262, PH + 15, '#fff');
        text(ctx, 'MISSION ' + (G.mission + 1), 226, PH + 26, '#ff8020');
      }
      function render(ctx) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        if (!G) newGame(true);
        drawBG(ctx);
        const list = G.ents.slice().sort((a, b) => (a.z || 0) - (b.z || 0));
        for (const e of list) if (e.kind === 'heli' || e.kind === 'vulture') drawEnt(ctx, e);
        for (const e of list) if (e.kind !== 'heli' && e.kind !== 'vulture') drawEnt(ctx, e);
        for (const it of G.items) {
          if (it.t > 380 && (frame & 4)) continue;
          ctx.drawImage(ITEM_IMG[it.kind], Math.round(it.x - 3), Math.round(it.y - 4), 12, 16);
          text(ctx, ITEMS[it.kind].label, Math.round(it.x + 10), Math.round(it.y - 2), '#fff');
        }
        for (const p of G.proj) drawProj(ctx, p);
        for (const f of G.fx) drawFX(ctx, f);
        for (const n of G.nades) {
          const u = n.t / 30, x = n.sx + (n.tx - n.sx) * u, y = n.sy + (n.ty - n.sy) * u - Math.sin(u * Math.PI) * 50;
          ctx.fillStyle = '#405020'; ctx.fillRect(Math.round(x - 2), Math.round(y - 2), Math.max(2, Math.round(6 - u * 4)), Math.max(2, Math.round(6 - u * 4)));
        }
        if (mode === 'title') { renderTitle(ctx); return; }
        drawCross(ctx);
        if (G.flash > 0) { ctx.fillStyle = 'rgba(255,0,0,' + (G.flash / 20) + ')'; ctx.fillRect(0, 0, W, PH); }
        drawStatus(ctx);
        if (G.msgT > 0 && (frame & 8)) stext(ctx, G.msg, W / 2, 20, '#ffe040', 1, 'center');
        if (G.phase === 'intro') {
          ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(20, 40, W - 40, 100);
          stext(ctx, 'MISSION ' + (G.mission + 1), W / 2, 50, '#ff8020', 2, 'center');
          stext(ctx, MISSIONS[G.mission].name, W / 2, 72, '#fff', 1, 'center');
          stext(ctx, 'DESTROY ' + G.need.sold + ' ENEMY  ' + G.need.heli + ' HELI  ' + G.need.tank + ' ARMOR', W / 2, 92, '#e8d070', 1, 'center');
          stext(ctx, 'SHOOT ITEMS TO PICK THEM UP', W / 2, 108, '#a0ffa0', 1, 'center');
          stext(ctx, 'SPARE THE HOSTAGES', W / 2, 120, '#a0ffa0', 1, 'center');
        }
        if (G.phase === 'clear') {
          ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(20, 50, W - 40, 80);
          stext(ctx, 'MISSION COMPLETE', W / 2, 62, '#ff8020', 2, 'center');
          stext(ctx, 'BONUS ' + G.bonus, W / 2, 90, '#fff', 1, 'center');
          stext(ctx, 'DAMAGE REPAIRED', W / 2, 106, '#a0ffa0', 1, 'center');
        }
        if (G.phase === 'dead') { ctx.fillStyle = 'rgba(120,0,0,0.5)'; ctx.fillRect(0, 0, W, PH); stext(ctx, 'CRITICAL DAMAGE', W / 2, 90, '#fff', 2, 'center'); }
        if (G.phase === 'over') {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 70, W, 50);
          stext(ctx, 'GAME OVER', W / 2, 82, '#ff2020', 3, 'center');
        }
      }
      function renderTitle(ctx) {
        drawCross(ctx);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 22, W, 92);
        // stencil-style logo
        stext(ctx, 'OPERATION', W / 2, 30, '#e8d070', 3, 'center');
        text(ctx, 'WOLF', W / 2 + 3, 57, '#401000', 6, 'center');
        text(ctx, 'WOLF', W / 2, 54, '#ff3020', 6, 'center');
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 56; y < 96; y += 6) ctx.fillRect(W / 2 - 70, y, 140, 1);
        const page = Math.floor(modeT / 360) % 2;
        if (page === 0) stext(ctx, 'RESCUE THE HOSTAGES', W / 2, 100, '#fff', 1, 'center');
        else stext(ctx, 'HIGH SCORE ' + pad(hi, 7), W / 2, 100, '#ffe040', 1, 'center');
        ctx.fillStyle = '#181810'; ctx.fillRect(0, PH, W, H - PH);
        const blink = (frame >> 5) & 1;
        if (coinFlash > 0) { if ((coinFlash >> 2) & 1) stext(ctx, 'INSERT COIN', W / 2, PH + 8, '#fff', 1, 'center'); }
        else if (blink) stext(ctx, api.credits > 0 ? 'PUSH START' : 'INSERT COIN', W / 2, PH + 8, '#ffe040', 1, 'center');
        text(ctx, '\u00a9 1987 TAITO', 6, PH + 26, '#e8d070');
        text(ctx, 'CREDIT ' + pad(Math.min(99, api.credits), 2), W - 6, PH + 26, '#fff', 1, 'right');
      }
      return { update, render, destroy() { } };
    }
  });
})();
